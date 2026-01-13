/**
 * ETH USD Mint Routes V2
 * Express router for mint operations
 * VERSION 2 - BridgeMinterV2 with PriceSnapshot
 * + USDT Real Transfer Endpoint
 */

import express from "express";
import { ethers } from "ethers";
import { executeMint, getHold, getAllHolds, getStats, addTransfer, getAllTransfers } from "./mint.service.js";
import { checkConnection, getDaesSigner, getOperator, getHttpProvider } from "../ethusd.provider.js";
import { ETH_USD_CONFIG, validateEthUsdConfig } from "../ethusd.config.js";

const router = express.Router();

// ERC-20 Token ABI (minimal for transfers)
const ERC20_ABI = [
  "function transfer(address to, uint256 amount) returns (bool)",
  "function balanceOf(address account) view returns (uint256)",
  "function decimals() view returns (uint8)",
  "function symbol() view returns (string)",
  "function name() view returns (string)",
  "event Transfer(address indexed from, address indexed to, uint256 value)"
];

// USDT Contract Address (Official Tether on Ethereum Mainnet)
const USDT_CONTRACT_ADDRESS = "0xdAC17F958D2ee523a2206206994597C13D831ec7";

/**
 * POST /mint-request
 * Execute a mint operation (V2 with PriceSnapshot)
 */
router.post("/mint-request", async (req, res) => {
  try {
    const { amountUsd, beneficiary, debtorName, debtorId, idempotencyKey } = req.body;

    // Validate required fields
    if (!beneficiary) {
      return res.status(400).json({ success: false, error: "MISSING_BENEFICIARY" });
    }
    if (!amountUsd || amountUsd <= 0) {
      return res.status(400).json({ success: false, error: "INVALID_AMOUNT" });
    }
    if (!ethers.isAddress(beneficiary)) {
      return res.status(400).json({ success: false, error: "INVALID_BENEFICIARY_ADDRESS" });
    }

    const result = await executeMint({
      amountUsd: Number(amountUsd),
      beneficiary,
      debtorName,
      debtorId,
      idempotencyKey
    });

    if (result.success) {
      res.json(result);
    } else {
      res.status(400).json(result);
    }
  } catch (error: any) {
    console.error("[ETH USD Routes V2] Error in mint-request:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /hold/:holdId
 * Get hold details
 */
router.get("/hold/:holdId", (req, res) => {
  const hold = getHold(req.params.holdId);
  if (!hold) {
    return res.status(404).json({ success: false, error: "HOLD_NOT_FOUND" });
  }
  res.json({ success: true, hold });
});

/**
 * GET /holds
 * Get all holds
 */
router.get("/holds", (req, res) => {
  const holds = getAllHolds();
  res.json({ success: true, holds, count: holds.length });
});

/**
 * GET /stats
 * Get mint statistics
 */
router.get("/stats", (req, res) => {
  const stats = getStats();
  res.json({ success: true, ...stats });
});

/**
 * POST /send
 * Send USD tokens to another wallet - REAL ERC-20 TRANSFER
 */
router.post("/send", async (req, res) => {
  try {
    const { amount, toAddress, fromWallet, memo } = req.body;

    // Validate required fields
    if (!toAddress) {
      return res.status(400).json({ success: false, error: "MISSING_TO_ADDRESS" });
    }
    if (!amount || amount <= 0) {
      return res.status(400).json({ success: false, error: "INVALID_AMOUNT" });
    }
    if (!ethers.isAddress(toAddress)) {
      return res.status(400).json({ success: false, error: "INVALID_TO_ADDRESS" });
    }

    console.log(`[ETH USD Send] Starting REAL transfer...`);
    console.log(`[ETH USD Send]   Amount: $${amount} USD`);
    console.log(`[ETH USD Send]   To: ${toAddress}`);
    console.log(`[ETH USD Send]   Memo: ${memo || 'none'}`);

    // Get the operator wallet (has the tokens and ETH for gas)
    const operator = getOperator();
    console.log(`[ETH USD Send]   Operator: ${operator.address}`);

    // Get the USD Token contract
    const usdToken = new ethers.Contract(
      ETH_USD_CONFIG.usdToken,
      ERC20_ABI,
      operator
    );

    // Get token decimals (usually 6 for USD stablecoins)
    let decimals = 6;
    try {
      decimals = await usdToken.decimals();
      console.log(`[ETH USD Send]   Token decimals: ${decimals}`);
    } catch (e) {
      console.log(`[ETH USD Send]   Using default decimals: 6`);
    }

    // Calculate amount in token units
    const amountInUnits = ethers.parseUnits(amount.toString(), decimals);
    console.log(`[ETH USD Send]   Amount in units: ${amountInUnits.toString()}`);

    // Check operator balance first
    const operatorBalance = await usdToken.balanceOf(operator.address);
    console.log(`[ETH USD Send]   Operator balance: ${ethers.formatUnits(operatorBalance, decimals)} USD`);

    if (operatorBalance < amountInUnits) {
      return res.status(400).json({
        success: false,
        error: "INSUFFICIENT_TOKEN_BALANCE",
        details: {
          required: amount,
          available: parseFloat(ethers.formatUnits(operatorBalance, decimals))
        }
      });
    }

    // Execute REAL transfer on blockchain
    console.log(`[ETH USD Send]   Sending transaction to blockchain...`);
    const tx = await usdToken.transfer(toAddress, amountInUnits);
    console.log(`[ETH USD Send]   TX Hash: ${tx.hash}`);

    // Wait for confirmation
    console.log(`[ETH USD Send]   Waiting for ${ETH_USD_CONFIG.confirmations} confirmations...`);
    const receipt = await tx.wait(ETH_USD_CONFIG.confirmations);
    console.log(`[ETH USD Send]   TX Confirmed in block: ${receipt.blockNumber}`);

    // Generate transfer ID
    const transferId = `send_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;

    // Store the transfer with REAL tx hash
    const transfer = {
      id: transferId,
      type: 'send' as const,
      amount: Number(amount),
      toAddress,
      fromWallet: operator.address,
      memo: memo || null,
      txHash: receipt.hash,
      explorerUrl: `https://etherscan.io/tx/${receipt.hash}`,
      status: 'COMPLETED' as const,
      timestamp: Date.now(),
      blockNumber: receipt.blockNumber,
      gasUsed: receipt.gasUsed?.toString()
    };

    addTransfer(transfer);

    console.log(`[ETH USD Send]   SUCCESS!`);

    res.json({
      success: true,
      txHash: receipt.hash,
      explorerUrl: transfer.explorerUrl,
      blockNumber: receipt.blockNumber,
      transfer
    });

  } catch (error: any) {
    console.error("[ETH USD Send] ERROR:", error);
    
    // Parse common errors
    let errorMessage = error.message || "TRANSFER_FAILED";
    let errorCode = "TRANSFER_FAILED";

    if (error.code === "INSUFFICIENT_FUNDS") {
      errorCode = "INSUFFICIENT_ETH_FOR_GAS";
      errorMessage = "Operator wallet doesn't have enough ETH for gas";
    } else if (error.code === "CALL_EXCEPTION") {
      errorCode = "CONTRACT_CALL_FAILED";
      errorMessage = "Token transfer failed - check balance and allowances";
    } else if (error.reason) {
      errorMessage = error.reason;
    }

    res.status(500).json({
      success: false,
      error: errorCode,
      message: errorMessage,
      details: error.shortMessage || error.message
    });
  }
});

/**
 * GET /transfers
 * Get all transfers
 */
router.get("/transfers", (req, res) => {
  const transfers = getAllTransfers();
  res.json({ success: true, transfers, count: transfers.length });
});

/**
 * POST /mint-and-send
 * MINT tokens first, then the minted tokens go directly to the recipient
 * This is the CORRECT flow: Mint directly to destination address
 * Uses BridgeMinterV2 with PriceSnapshot
 */
router.post("/mint-and-send", async (req, res) => {
  try {
    const { amount, toAddress, fromWallet, memo, custodyAccountId, custodyAccountName } = req.body;

    // Validate required fields
    if (!toAddress) {
      return res.status(400).json({ success: false, error: "MISSING_TO_ADDRESS" });
    }
    if (!amount || amount <= 0) {
      return res.status(400).json({ success: false, error: "INVALID_AMOUNT" });
    }
    if (!ethers.isAddress(toAddress)) {
      return res.status(400).json({ success: false, error: "INVALID_TO_ADDRESS" });
    }

    console.log(`[ETH USD MINT-AND-SEND V2] ========================================`);
    console.log(`[ETH USD MINT-AND-SEND V2] Starting MINT-AND-SEND operation`);
    console.log(`[ETH USD MINT-AND-SEND V2]   Amount: $${amount} USD`);
    console.log(`[ETH USD MINT-AND-SEND V2]   Destination: ${toAddress}`);
    console.log(`[ETH USD MINT-AND-SEND V2]   Memo: ${memo || 'none'}`);
    console.log(`[ETH USD MINT-AND-SEND V2]   Custody Account: ${custodyAccountName || custodyAccountId || 'default'}`);
    console.log(`[ETH USD MINT-AND-SEND V2] ========================================`);

    // STEP 1: MINT tokens directly to the destination address
    // This is the key - we mint DIRECTLY to the recipient, no intermediate transfer needed
    console.log(`[ETH USD MINT-AND-SEND V2] STEP 1: Minting ${amount} USD directly to ${toAddress}`);
    
    const mintResult = await executeMint({
      amountUsd: Number(amount),
      beneficiary: toAddress, // <-- MINT DIRECTLY TO DESTINATION
      debtorName: custodyAccountName || "DAES Treasury",
      debtorId: custodyAccountId || fromWallet || "DAES-CUSTODY",
      idempotencyKey: `mint-send-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
    });

    if (!mintResult.success) {
      console.error(`[ETH USD MINT-AND-SEND V2] MINT FAILED:`, mintResult.error);
      return res.status(400).json({
        success: false,
        error: "MINT_FAILED",
        details: mintResult.error,
        step: "mint"
      });
    }

    console.log(`[ETH USD MINT-AND-SEND V2] STEP 1 COMPLETE: Tokens minted!`);
    console.log(`[ETH USD MINT-AND-SEND V2]   Mint TX: ${mintResult.txHash}`);
    console.log(`[ETH USD MINT-AND-SEND V2]   ETH/USD Price: $${mintResult.ethUsdPrice}`);
    console.log(`[ETH USD MINT-AND-SEND V2]   PriceSnapshot emitted: ${mintResult.priceSnapshot?.emittedOnChain ? 'YES' : 'NO'}`);

    // Generate transfer ID for tracking
    const transferId = `mint-send_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;

    // Store the combined operation as a transfer record
    const transfer = {
      id: transferId,
      type: 'send' as const,
      amount: Number(amount),
      toAddress,
      fromWallet: fromWallet || custodyAccountId || "DAES-CUSTODY",
      memo: memo || `Mint-and-Send to ${toAddress.slice(0, 10)}...`,
      txHash: mintResult.txHash!,
      explorerUrl: mintResult.explorerUrl!,
      status: 'COMPLETED' as const,
      timestamp: Date.now(),
      mintHoldId: mintResult.holdId,
      operationType: 'MINT_AND_SEND',
      custodyAccount: {
        id: custodyAccountId,
        name: custodyAccountName
      },
      // V2 price info
      priceSnapshot: {
        ethUsdPrice: mintResult.ethUsdPrice,
        priceDecimals: mintResult.priceDecimals,
        priceTs: mintResult.priceTs
      }
    };

    addTransfer(transfer);

    console.log(`[ETH USD MINT-AND-SEND V2] ========================================`);
    console.log(`[ETH USD MINT-AND-SEND V2] OPERATION COMPLETED SUCCESSFULLY!`);
    console.log(`[ETH USD MINT-AND-SEND V2]   Transfer ID: ${transferId}`);
    console.log(`[ETH USD MINT-AND-SEND V2]   TX Hash: ${mintResult.txHash}`);
    console.log(`[ETH USD MINT-AND-SEND V2]   Explorer: ${mintResult.explorerUrl}`);
    console.log(`[ETH USD MINT-AND-SEND V2] ========================================`);

    res.json({
      success: true,
      operationType: "MINT_AND_SEND",
      minterVersion: 2,
      transferId,
      txHash: mintResult.txHash,
      explorerUrl: mintResult.explorerUrl,
      holdId: mintResult.holdId,
      amount: Number(amount),
      toAddress,
      fromCustody: custodyAccountName || custodyAccountId || "DAES Treasury",
      isoReceipt: mintResult.isoReceipt,
      priceSnapshot: mintResult.priceSnapshot,
      transfer,
      message: `Successfully minted and sent ${amount} USD to ${toAddress} (BridgeMinterV2 with PriceSnapshot)`
    });

  } catch (error: any) {
    console.error("[ETH USD MINT-AND-SEND V2] ERROR:", error);
    
    res.status(500).json({
      success: false,
      error: "MINT_AND_SEND_FAILED",
      message: error.message || "Operation failed",
      details: error.reason || error.shortMessage || error.message
    });
  }
});

/**
 * POST /send-usdt
 * Send REAL USDT (Tether) to another wallet
 * Uses the official USDT contract: 0xdAC17F958D2ee523a2206206994597C13D831ec7
 * This endpoint transfers ACTUAL USDT from the operator wallet
 */
router.post("/send-usdt", async (req, res) => {
  try {
    const { amount, toAddress, memo, custodyAccountId, custodyAccountName } = req.body;

    // Validate required fields
    if (!toAddress) {
      return res.status(400).json({ success: false, error: "MISSING_TO_ADDRESS" });
    }
    if (!amount || amount <= 0) {
      return res.status(400).json({ success: false, error: "INVALID_AMOUNT" });
    }
    if (!ethers.isAddress(toAddress)) {
      return res.status(400).json({ success: false, error: "INVALID_TO_ADDRESS" });
    }

    console.log(`[USDT REAL TRANSFER] ========================================`);
    console.log(`[USDT REAL TRANSFER] Starting REAL USDT transfer`);
    console.log(`[USDT REAL TRANSFER]   Contract: ${USDT_CONTRACT_ADDRESS}`);
    console.log(`[USDT REAL TRANSFER]   Amount: $${amount} USDT`);
    console.log(`[USDT REAL TRANSFER]   Destination: ${toAddress}`);
    console.log(`[USDT REAL TRANSFER]   Memo: ${memo || 'none'}`);
    console.log(`[USDT REAL TRANSFER] ========================================`);

    // Get the operator wallet (must have USDT and ETH for gas)
    const operator = getOperator();
    console.log(`[USDT REAL TRANSFER]   Operator: ${operator.address}`);

    // Get USDT contract (Official Tether)
    const usdtContract = new ethers.Contract(
      USDT_CONTRACT_ADDRESS,
      ERC20_ABI,
      operator
    );

    // USDT has 6 decimals
    const decimals = 6;
    console.log(`[USDT REAL TRANSFER]   USDT decimals: ${decimals}`);

    // Calculate amount in smallest units (6 decimals)
    const amountInUnits = ethers.parseUnits(amount.toString(), decimals);
    console.log(`[USDT REAL TRANSFER]   Amount in units: ${amountInUnits.toString()}`);

    // Check operator USDT balance
    const operatorBalance = await usdtContract.balanceOf(operator.address);
    const balanceFormatted = parseFloat(ethers.formatUnits(operatorBalance, decimals));
    console.log(`[USDT REAL TRANSFER]   Operator USDT balance: ${balanceFormatted} USDT`);

    if (operatorBalance < amountInUnits) {
      return res.status(400).json({
        success: false,
        error: "INSUFFICIENT_USDT_BALANCE",
        details: {
          required: amount,
          available: balanceFormatted,
          contract: USDT_CONTRACT_ADDRESS
        }
      });
    }

    // Check ETH balance for gas
    const provider = getHttpProvider();
    const ethBalance = await provider.getBalance(operator.address);
    const ethFormatted = parseFloat(ethers.formatEther(ethBalance));
    console.log(`[USDT REAL TRANSFER]   Operator ETH balance: ${ethFormatted} ETH`);

    if (ethBalance < ethers.parseEther("0.005")) {
      return res.status(400).json({
        success: false,
        error: "INSUFFICIENT_ETH_FOR_GAS",
        details: {
          available: ethFormatted,
          recommended: 0.01
        }
      });
    }

    // Execute REAL USDT transfer on Ethereum Mainnet
    console.log(`[USDT REAL TRANSFER]   Sending USDT transaction to blockchain...`);
    const tx = await usdtContract.transfer(toAddress, amountInUnits);
    console.log(`[USDT REAL TRANSFER]   TX Hash: ${tx.hash}`);

    // Wait for confirmation
    console.log(`[USDT REAL TRANSFER]   Waiting for confirmations...`);
    const receipt = await tx.wait(2);
    console.log(`[USDT REAL TRANSFER]   TX Confirmed in block: ${receipt.blockNumber}`);

    // Generate transfer ID
    const transferId = `usdt_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;

    // Store the transfer record
    const transfer = {
      id: transferId,
      type: 'send' as const,
      amount: Number(amount),
      toAddress,
      fromWallet: operator.address,
      memo: memo || `USDT Transfer to ${toAddress.slice(0, 10)}...`,
      txHash: receipt.hash,
      explorerUrl: `https://etherscan.io/tx/${receipt.hash}`,
      status: 'COMPLETED' as const,
      timestamp: Date.now(),
      blockNumber: receipt.blockNumber,
      gasUsed: receipt.gasUsed?.toString(),
      token: {
        symbol: 'USDT',
        name: 'Tether USD',
        contract: USDT_CONTRACT_ADDRESS,
        decimals: 6
      },
      custodyAccount: {
        id: custodyAccountId,
        name: custodyAccountName
      }
    };

    addTransfer(transfer);

    console.log(`[USDT REAL TRANSFER] ========================================`);
    console.log(`[USDT REAL TRANSFER] SUCCESS! USDT TRANSFERRED!`);
    console.log(`[USDT REAL TRANSFER]   Transfer ID: ${transferId}`);
    console.log(`[USDT REAL TRANSFER]   TX Hash: ${receipt.hash}`);
    console.log(`[USDT REAL TRANSFER]   View: https://etherscan.io/tx/${receipt.hash}`);
    console.log(`[USDT REAL TRANSFER] ========================================`);

    res.json({
      success: true,
      operationType: "USDT_TRANSFER",
      transferId,
      txHash: receipt.hash,
      explorerUrl: `https://etherscan.io/tx/${receipt.hash}`,
      blockNumber: receipt.blockNumber,
      amount: Number(amount),
      toAddress,
      fromAddress: operator.address,
      token: {
        symbol: 'USDT',
        name: 'Tether USD',
        contract: USDT_CONTRACT_ADDRESS,
        decimals: 6
      },
      transfer,
      message: `Successfully transferred ${amount} USDT to ${toAddress}`
    });

  } catch (error: any) {
    console.error("[USDT REAL TRANSFER] ERROR:", error);
    
    let errorMessage = error.message || "TRANSFER_FAILED";
    let errorCode = "USDT_TRANSFER_FAILED";

    if (error.code === "INSUFFICIENT_FUNDS") {
      errorCode = "INSUFFICIENT_ETH_FOR_GAS";
      errorMessage = "Operator wallet doesn't have enough ETH for gas";
    } else if (error.code === "CALL_EXCEPTION") {
      errorCode = "CONTRACT_CALL_FAILED";
      errorMessage = "USDT transfer failed - check balance and allowances";
    } else if (error.reason) {
      errorMessage = error.reason;
    }

    res.status(500).json({
      success: false,
      error: errorCode,
      message: errorMessage,
      details: error.shortMessage || error.message,
      contract: USDT_CONTRACT_ADDRESS
    });
  }
});

/**
 * GET /usdt-balance
 * Get operator's USDT balance (Official Tether contract)
 */
router.get("/usdt-balance", async (req, res) => {
  try {
    const operator = getOperator();
    const provider = getHttpProvider();

    // Get USDT contract
    const usdtContract = new ethers.Contract(
      USDT_CONTRACT_ADDRESS,
      ERC20_ABI,
      provider
    );

    // Get balances
    const usdtBalance = await usdtContract.balanceOf(operator.address);
    const ethBalance = await provider.getBalance(operator.address);

    res.json({
      success: true,
      address: operator.address,
      usdt: {
        contract: USDT_CONTRACT_ADDRESS,
        symbol: 'USDT',
        name: 'Tether USD',
        balance: parseFloat(ethers.formatUnits(usdtBalance, 6)),
        balanceRaw: usdtBalance.toString(),
        decimals: 6
      },
      eth: {
        balance: parseFloat(ethers.formatEther(ethBalance)),
        balanceRaw: ethBalance.toString()
      }
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /balance
 * Get operator's USD token balance
 */
router.get("/balance", async (req, res) => {
  try {
    const operator = getOperator();
    const provider = getHttpProvider();

    // Get USD Token contract
    const usdToken = new ethers.Contract(
      ETH_USD_CONFIG.usdToken,
      ERC20_ABI,
      provider
    );

    // Get decimals
    let decimals = 6;
    try {
      decimals = await usdToken.decimals();
    } catch (e) {
      // Use default
    }

    // Get balances
    const tokenBalance = await usdToken.balanceOf(operator.address);
    const ethBalance = await provider.getBalance(operator.address);

    res.json({
      success: true,
      address: operator.address,
      usdToken: {
        address: ETH_USD_CONFIG.usdToken,
        balance: parseFloat(ethers.formatUnits(tokenBalance, decimals)),
        balanceRaw: tokenBalance.toString(),
        decimals: Number(decimals)
      },
      eth: {
        balance: parseFloat(ethers.formatEther(ethBalance)),
        balanceRaw: ethBalance.toString()
      }
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /health
 * Check module health - VERSION 2
 */
router.get("/health", async (req, res) => {
  try {
    // Validate config
    const configValidation = validateEthUsdConfig();
    if (!configValidation.valid) {
      return res.status(500).json({
        success: false,
        error: "INVALID_CONFIG",
        details: configValidation.errors
      });
    }

    // Check connection
    const connection = await checkConnection();
    if (!connection.connected) {
      return res.status(500).json({
        success: false,
        error: "CONNECTION_FAILED",
        details: connection.error
      });
    }

    // Get signer info
    const daesSigner = getDaesSigner();
    const operator = getOperator();

    res.json({
      success: true,
      status: "healthy",
      // VERSION INFO
      version: "2",
      minterVersion: ETH_USD_CONFIG.minterVersion,
      eip712Version: ETH_USD_CONFIG.eip712Domain.version,
      // Network info
      network: {
        chainId: connection.chainId,
        blockNumber: connection.blockNumber,
        name: connection.chainId === 1 ? "Ethereum Mainnet" : `Chain ${connection.chainId}`
      },
      // Contracts
      contracts: {
        usdToken: ETH_USD_CONFIG.usdToken,
        usdtOfficial: USDT_CONTRACT_ADDRESS,
        bridgeMinter: ETH_USD_CONFIG.bridgeMinter,
        bridgeMinterVersion: "BridgeMinterV2",
        registry: ETH_USD_CONFIG.registry
      },
      // Signers
      signers: {
        daesSigner: daesSigner.address,
        operator: operator.address
      },
      // Price config
      priceConfig: {
        decimals: ETH_USD_CONFIG.price.decimals,
        defaultPrice: ETH_USD_CONFIG.price.defaultEthUsdPrice
      },
      storage: "in-memory",
      features: [
        "EIP-712 v2 signatures",
        "PriceSnapshot events",
        "ISO 20022 receipts",
        "Mint-and-Send operations",
        "USDT Real Transfers"
      ]
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
