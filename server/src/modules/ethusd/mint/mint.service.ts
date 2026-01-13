/**
 * ETH USD Mint Service V2
 * Handles the full mint flow: hold -> sign -> mint on-chain
 * VERSION 2 - BridgeMinterV2 with PriceSnapshot event
 */

import { ethers } from "ethers";
import { ETH_USD_CONFIG } from "../ethusd.config.js";
import { getHttpProvider, getDaesSigner, getOperator } from "../ethusd.provider.js";
import { 
  signMintAuthorization, 
  MintAuthorizationStruct, 
  scalePriceToInt256, 
  getCurrentPriceTimestamp 
} from "./mint.eip712.js";
import { buildReceipt, signReceipt, getIso20022Hash } from "../iso/isoReceipt.service.js";
import { getPriceSnapshot } from "../price/price.service.js";
import { getChainlinkEthUsdWithFallback } from "../price/chainlinkEthUsd.js";
import { createHoldId } from "../utils/hash.js";
import { getUsdBytes3 } from "../utils/iso4217.js";

/**
 * BridgeMinterV2 ABI - UPDATED for PriceSnapshot
 * New struct includes: ethUsdPrice, priceDecimals, priceTs
 */
const BRIDGE_MINTER_V2_ABI = [
  // mintWithAuthorization with V2 struct (includes price fields)
  `function mintWithAuthorization(
    (
      bytes32 holdId,
      uint256 amount,
      address beneficiary,
      bytes32 iso20022Hash,
      bytes3 iso4217,
      uint256 deadline,
      uint256 nonce,
      int256 ethUsdPrice,
      uint8 priceDecimals,
      uint64 priceTs
    ) auth,
    bytes signature
  ) external returns (bool)`,
  
  // View functions
  "function isHoldUsed(bytes32 holdId) view returns (bool)",
  "function getNonce(address account) view returns (uint256)",
  
  // Role constants
  "function OPERATOR_ROLE() view returns (bytes32)",
  "function DAES_SIGNER_ROLE() view returns (bytes32)",
  
  // Events
  "event Minted(bytes32 indexed holdId, uint256 amount, address indexed beneficiary, bytes32 iso20022Hash, bytes3 iso4217, address indexed signer, uint256 timestamp)",
  "event PriceSnapshot(bytes32 indexed pairId, int256 price, uint8 decimals, uint64 ts, bytes32 indexed holdId)"
];

// In-memory hold store (for MVP)
const holdStore = new Map<string, {
  holdId: string;
  daesRef: string;
  amount: number;
  beneficiary: string;
  status: "PENDING" | "MINTED" | "FAILED";
  createdAt: number;
  txHash?: string;
  ethUsdPrice?: number;
  priceTs?: number;
}>();

// Idempotency store
const idempotencyStore = new Map<string, {
  status: "processing" | "completed" | "failed";
  result?: any;
  createdAt: number;
}>();

// Transfer store (for send operations)
export interface Transfer {
  id: string;
  type: 'send';
  amount: number;
  toAddress: string;
  fromWallet?: string;
  memo?: string | null;
  txHash: string;
  explorerUrl: string;
  status: 'PENDING' | 'COMPLETED' | 'FAILED';
  timestamp: number;
}

const transferStore = new Map<string, Transfer>();

export interface MintRequest {
  amountUsd: number;
  beneficiary: string;
  debtorName?: string;
  debtorId?: string;
  idempotencyKey?: string;
}

export interface MintResult {
  success: boolean;
  holdId?: string;
  txHash?: string;
  explorerUrl?: string;
  isoReceipt?: any;
  priceSnapshot?: any;
  error?: string;
  idempotent?: boolean;
  // V2 fields
  ethUsdPrice?: number;
  priceDecimals?: number;
  priceTs?: number;
}

/**
 * Get current ETH/USD price from Chainlink oracle
 * Falls back to default price if Chainlink is unavailable
 */
async function getEthUsdPriceFromChainlink(provider: ethers.Provider): Promise<{
  price: bigint;
  decimals: number;
  updatedAt: number;
  humanPrice: number;
  source: string;
}> {
  const result = await getChainlinkEthUsdWithFallback(
    provider, 
    ETH_USD_CONFIG.price.defaultEthUsdPrice
  );
  return {
    price: result.price,
    decimals: result.decimals,
    updatedAt: result.updatedAt,
    humanPrice: result.humanPrice,
    source: result.source
  };
}

/**
 * Execute mint request V2
 * Now includes price fields for PriceSnapshot event
 */
export async function executeMint(request: MintRequest): Promise<MintResult> {
  const { amountUsd, beneficiary, debtorName, debtorId, idempotencyKey } = request;

  // Validate
  if (!ethers.isAddress(beneficiary)) {
    return { success: false, error: "INVALID_BENEFICIARY" };
  }
  if (amountUsd <= 0) {
    return { success: false, error: "INVALID_AMOUNT" };
  }

  // Check idempotency
  if (idempotencyKey) {
    const existing = idempotencyStore.get(idempotencyKey);
    if (existing) {
      if (existing.status === "processing") {
        return { success: false, error: "REQUEST_IN_PROGRESS" };
      }
      if (existing.status === "completed") {
        return { ...existing.result, idempotent: true };
      }
    }
    idempotencyStore.set(idempotencyKey, { status: "processing", createdAt: Date.now() });
  }

  try {
    const daesSigner = getDaesSigner();
    const operator = getOperator();

    // Create holdId
    const daesRef = `DAES-ETH-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const holdId = createHoldId(daesRef);

    console.log(`\n[ETH USD Mint V2] ========================================`);
    console.log(`[ETH USD Mint V2] New request: ${daesRef}`);
    console.log(`[ETH USD Mint V2]   holdId: ${holdId}`);
    console.log(`[ETH USD Mint V2]   amount: $${amountUsd} USD`);
    console.log(`[ETH USD Mint V2]   beneficiary: ${beneficiary}`);
    console.log(`[ETH USD Mint V2]   BridgeMinter V2: ${ETH_USD_CONFIG.bridgeMinter}`);

    // Connect to BridgeMinterV2
    const bridgeMinter = new ethers.Contract(
      ETH_USD_CONFIG.bridgeMinter,
      BRIDGE_MINTER_V2_ABI,
      operator
    );

    // Check if holdId already used on-chain
    try {
      const isUsed = await bridgeMinter.isHoldUsed(holdId);
      if (isUsed) {
        throw new Error("HOLD_ALREADY_USED");
      }
      console.log(`[ETH USD Mint V2]   holdId available: ✓`);
    } catch (checkError: any) {
      if (checkError.message === "HOLD_ALREADY_USED") {
        throw checkError;
      }
      // If isHoldUsed doesn't exist or fails, continue (contract might not have this function)
      console.log(`[ETH USD Mint V2]   holdId check skipped (function may not exist)`);
    }

    // Build ISO receipt
    const isoReceipt = buildReceipt({
      daesRef,
      holdId,
      amount: amountUsd,
      currency: "USD",
      debtorName: debtorName || "DAES Treasury",
      debtorId: debtorId || operator.address,
      creditorName: "Beneficiary",
      creditorId: beneficiary
    });

    // Get ISO20022 hash for on-chain
    const iso20022Hash = getIso20022Hash(isoReceipt);

    // Get price snapshot for internal tracking
    const internalPriceSnapshot = await getPriceSnapshot("USD", "USD");

    // ========================================
    // V2: Get ETH/USD price from Chainlink oracle
    // ========================================
    const provider = getHttpProvider();
    const chainlinkPrice = await getEthUsdPriceFromChainlink(provider);
    
    // Use Chainlink price directly (already scaled to int256 with 8 decimals)
    const ethUsdPrice = chainlinkPrice.price; // bigint from Chainlink
    const priceDecimals = chainlinkPrice.decimals; // 8
    const priceTs = BigInt(chainlinkPrice.updatedAt); // Chainlink's updatedAt timestamp

    console.log(`[ETH USD Mint V2] Chainlink Price Snapshot:`);
    console.log(`[ETH USD Mint V2]   Source: ${chainlinkPrice.source}`);
    console.log(`[ETH USD Mint V2]   ETH/USD Price: $${chainlinkPrice.humanPrice.toFixed(2)}`);
    console.log(`[ETH USD Mint V2]   Scaled (int256): ${ethUsdPrice.toString()}`);
    console.log(`[ETH USD Mint V2]   Decimals: ${priceDecimals}`);
    console.log(`[ETH USD Mint V2]   Price Timestamp: ${priceTs.toString()} (${new Date(Number(priceTs) * 1000).toISOString()})`);

    // Build EIP-712 authorization V2
    const amountUnits = BigInt(Math.round(amountUsd * 1e6)); // 6 decimals
    const deadline = BigInt(Math.floor(Date.now() / 1000) + 600); // 10 minutes
    const nonce = BigInt(Date.now()); // Simple nonce

    // Sign with V2 struct (includes price fields)
    const signature = await signMintAuthorization(daesSigner, {
      holdId,
      amount: amountUnits,
      beneficiary,
      iso20022Hash,
      iso4217Bytes: getUsdBytes3(),
      deadline,
      nonce,
      // V2 PRICE FIELDS
      ethUsdPrice,
      priceDecimals,
      priceTs
    });

    console.log(`[ETH USD Mint V2] Authorization signed by: ${daesSigner.address}`);

    // Build V2 auth struct for contract call
    const authStruct: MintAuthorizationStruct = {
      holdId,
      amount: amountUnits,
      beneficiary,
      iso20022Hash,
      iso4217: getUsdBytes3(),
      deadline,
      nonce,
      // V2 PRICE FIELDS
      ethUsdPrice,
      priceDecimals,
      priceTs
    };

    // Send transaction to BridgeMinterV2
    console.log(`[ETH USD Mint V2] Sending TX to BridgeMinterV2...`);
    const tx = await bridgeMinter.mintWithAuthorization(authStruct, signature);
    console.log(`[ETH USD Mint V2] TX sent: ${tx.hash}`);

    // Wait for confirmation
    const receipt = await tx.wait(ETH_USD_CONFIG.confirmations);
    console.log(`[ETH USD Mint V2] TX confirmed: ${receipt.hash}`);
    console.log(`[ETH USD Mint V2] Block: ${receipt.blockNumber}`);
    console.log(`[ETH USD Mint V2] Gas used: ${receipt.gasUsed?.toString()}`);

    // Check for PriceSnapshot event in logs
    let priceSnapshotEmitted = false;
    for (const log of receipt.logs) {
      try {
        const parsed = bridgeMinter.interface.parseLog({ topics: [...log.topics], data: log.data });
        if (parsed?.name === "PriceSnapshot") {
          priceSnapshotEmitted = true;
          console.log(`[ETH USD Mint V2] ✓ PriceSnapshot event emitted!`);
          console.log(`[ETH USD Mint V2]   pairId: ${parsed.args.pairId}`);
          console.log(`[ETH USD Mint V2]   price: ${parsed.args.price.toString()}`);
          console.log(`[ETH USD Mint V2]   decimals: ${parsed.args.decimals}`);
          console.log(`[ETH USD Mint V2]   ts: ${parsed.args.ts}`);
          console.log(`[ETH USD Mint V2]   holdId: ${parsed.args.holdId}`);
        }
        if (parsed?.name === "Minted") {
          console.log(`[ETH USD Mint V2] ✓ Minted event emitted!`);
        }
      } catch {
        // Not a recognized event, skip
      }
    }

    // Update ISO receipt with tx info
    const signedReceipt = await signReceipt({
      ...isoReceipt,
      txHash: receipt.hash,
      blockNumber: receipt.blockNumber,
      status: "SETTLED"
    });

    // Store in memory
    holdStore.set(holdId, {
      holdId,
      daesRef,
      amount: amountUsd,
      beneficiary,
      status: "MINTED",
      createdAt: Date.now(),
      txHash: receipt.hash,
      ethUsdPrice: chainlinkPrice.humanPrice,
      priceTs: Number(priceTs)
    });

    const result: MintResult = {
      success: true,
      holdId,
      txHash: receipt.hash,
      explorerUrl: `https://etherscan.io/tx/${receipt.hash}`,
      isoReceipt: signedReceipt,
      priceSnapshot: {
        ...internalPriceSnapshot,
        ethUsdPrice: chainlinkPrice.humanPrice,
        priceDecimals,
        priceTs: Number(priceTs),
        emittedOnChain: priceSnapshotEmitted,
        source: chainlinkPrice.source
      },
      // V2 fields in result
      ethUsdPrice: chainlinkPrice.humanPrice,
      priceDecimals,
      priceTs: Number(priceTs)
    };

    console.log(`[ETH USD Mint V2] ========================================`);
    console.log(`[ETH USD Mint V2] SUCCESS!`);
    console.log(`[ETH USD Mint V2] Explorer: ${result.explorerUrl}`);
    console.log(`[ETH USD Mint V2] ========================================\n`);

    // Update idempotency
    if (idempotencyKey) {
      idempotencyStore.set(idempotencyKey, {
        status: "completed",
        result,
        createdAt: Date.now()
      });
    }

    return result;

  } catch (error: any) {
    console.error(`[ETH USD Mint V2] ERROR:`, error);

    if (idempotencyKey) {
      idempotencyStore.set(idempotencyKey, {
        status: "failed",
        result: { success: false, error: error.message },
        createdAt: Date.now()
      });
    }

    return {
      success: false,
      error: error.reason || error.message || "MINT_FAILED"
    };
  }
}

/**
 * Get hold by holdId
 */
export function getHold(holdId: string) {
  return holdStore.get(holdId);
}

/**
 * Get all holds
 */
export function getAllHolds() {
  return Array.from(holdStore.values());
}

/**
 * Get stats
 */
export function getStats() {
  const holds = Array.from(holdStore.values());
  const transfers = Array.from(transferStore.values());
  return {
    total: holds.length + transfers.length,
    minted: holds.filter(h => h.status === "MINTED").length,
    pending: holds.filter(h => h.status === "PENDING").length,
    failed: holds.filter(h => h.status === "FAILED").length,
    totalAmount: holds.filter(h => h.status === "MINTED").reduce((sum, h) => sum + h.amount, 0),
    totalTransfers: transfers.length,
    totalTransferAmount: transfers.filter(t => t.status === "COMPLETED").reduce((sum, t) => sum + t.amount, 0),
    minterVersion: ETH_USD_CONFIG.minterVersion
  };
}

/**
 * Add a transfer to the store
 */
export function addTransfer(transfer: Transfer) {
  transferStore.set(transfer.id, transfer);
  return transfer;
}

/**
 * Get all transfers
 */
export function getAllTransfers() {
  return Array.from(transferStore.values()).sort((a, b) => b.timestamp - a.timestamp);
}

/**
 * Get transfer by id
 */
export function getTransfer(id: string) {
  return transferStore.get(id);
}

export default {
  executeMint,
  getHold,
  getAllHolds,
  getStats,
  addTransfer,
  getAllTransfers,
  getTransfer
};
