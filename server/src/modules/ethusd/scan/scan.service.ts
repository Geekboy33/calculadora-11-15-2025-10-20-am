/**
 * ETH USD Scanner Service
 * Indexes Transfer and Minted events from contracts
 */

import { ethers } from "ethers";
import { ETH_USD_CONFIG } from "../ethusd.config.js";
import { getHttpProvider, getWsProvider } from "../ethusd.provider.js";
import {
  initStore,
  getLastProcessedBlock,
  setLastProcessedBlock,
  indexTransaction,
  indexWalletActivity,
  getTransaction,
  getWallet,
  getAllTransactions
} from "./scan.store.js";

// Contract ABIs (events only)
const USD_TOKEN_ABI = [
  "event Transfer(address indexed from, address indexed to, uint256 value)",
  "event Mint(address indexed to, uint256 amount, address indexed minter)"
];

const BRIDGE_MINTER_ABI = [
  "event Minted(bytes32 indexed holdId, uint256 amount, address indexed beneficiary, bytes32 iso20022Hash, bytes3 iso4217, address indexed signer, uint256 timestamp)"
];

let isScanning = false;
let scanInterval: NodeJS.Timeout | null = null;

/**
 * Start the scanner
 */
export async function startScanner(options?: {
  startBlock?: number;
  batchSize?: number;
  intervalMs?: number;
}) {
  const {
    startBlock,
    batchSize = 1000,
    intervalMs = 30000 // 30 seconds
  } = options || {};

  // Initialize store
  initStore();

  // Set start block if provided
  if (startBlock && startBlock > getLastProcessedBlock()) {
    setLastProcessedBlock(startBlock);
  }

  console.log(`[Scanner] Starting from block ${getLastProcessedBlock()}`);

  // Initial scan
  await scanBlocks(batchSize);

  // Set up interval for continuous scanning
  scanInterval = setInterval(async () => {
    if (!isScanning) {
      await scanBlocks(batchSize);
    }
  }, intervalMs);

  console.log(`[Scanner] Running. Interval: ${intervalMs}ms`);
}

/**
 * Stop the scanner
 */
export function stopScanner() {
  if (scanInterval) {
    clearInterval(scanInterval);
    scanInterval = null;
  }
  console.log("[Scanner] Stopped");
}

/**
 * Scan a batch of blocks
 */
async function scanBlocks(batchSize: number = 1000) {
  if (isScanning) return;
  isScanning = true;

  try {
    const provider = getHttpProvider();
    const currentBlock = await provider.getBlockNumber();
    const fromBlock = getLastProcessedBlock() + 1;
    
    if (fromBlock > currentBlock) {
      isScanning = false;
      return; // Already caught up
    }

    const toBlock = Math.min(fromBlock + batchSize - 1, currentBlock);
    
    console.log(`[Scanner] Scanning blocks ${fromBlock} - ${toBlock}`);

    // Scan USD Token events
    if (ETH_USD_CONFIG.usdToken) {
      await scanTokenEvents(fromBlock, toBlock);
    }

    // Scan BridgeMinter events
    if (ETH_USD_CONFIG.bridgeMinter) {
      await scanMintedEvents(fromBlock, toBlock);
    }

    // Update last processed block
    setLastProcessedBlock(toBlock);
    console.log(`[Scanner] Processed up to block ${toBlock}`);

  } catch (error) {
    console.error("[Scanner] Error:", error);
  } finally {
    isScanning = false;
  }
}

/**
 * Scan USD Token Transfer events
 */
async function scanTokenEvents(fromBlock: number, toBlock: number) {
  const provider = getHttpProvider();
  const token = new ethers.Contract(
    ETH_USD_CONFIG.usdToken,
    USD_TOKEN_ABI,
    provider
  );

  try {
    const filter = token.filters.Transfer();
    const events = await token.queryFilter(filter, fromBlock, toBlock);

    for (const event of events) {
      const log = event as ethers.EventLog;
      const [from, to, value] = log.args;

      // Index transaction
      indexTransaction({
        txHash: log.transactionHash.toLowerCase(),
        blockNumber: log.blockNumber,
        timestamp: Date.now(), // Would need block timestamp for accuracy
        event: "Transfer",
        from,
        to,
        amount: ethers.formatUnits(value, 6)
      });

      // Index wallet activity for recipient
      if (to && to !== ethers.ZeroAddress) {
        indexWalletActivity(
          to,
          log.transactionHash.toLowerCase(),
          Number(ethers.formatUnits(value, 6))
        );
      }
    }

    if (events.length > 0) {
      console.log(`[Scanner] Indexed ${events.length} Transfer events`);
    }
  } catch (error) {
    console.error("[Scanner] Error scanning token events:", error);
  }
}

/**
 * Scan BridgeMinter Minted events
 */
async function scanMintedEvents(fromBlock: number, toBlock: number) {
  const provider = getHttpProvider();
  const minter = new ethers.Contract(
    ETH_USD_CONFIG.bridgeMinter,
    BRIDGE_MINTER_ABI,
    provider
  );

  try {
    const filter = minter.filters.Minted();
    const events = await minter.queryFilter(filter, fromBlock, toBlock);

    for (const event of events) {
      const log = event as ethers.EventLog;
      const [holdId, amount, beneficiary, iso20022Hash, iso4217, signer, timestamp] = log.args;

      // Index transaction
      indexTransaction({
        txHash: log.transactionHash.toLowerCase(),
        blockNumber: log.blockNumber,
        timestamp: Number(timestamp) * 1000,
        event: "Minted",
        holdId,
        amount: ethers.formatUnits(amount, 6),
        beneficiary
      });

      // Index wallet activity
      indexWalletActivity(
        beneficiary,
        log.transactionHash.toLowerCase(),
        Number(ethers.formatUnits(amount, 6))
      );
    }

    if (events.length > 0) {
      console.log(`[Scanner] Indexed ${events.length} Minted events`);
    }
  } catch (error) {
    console.error("[Scanner] Error scanning minted events:", error);
  }
}

/**
 * Get indexed transaction by hash
 */
export function getIndexedTransaction(txHash: string) {
  return getTransaction(txHash);
}

/**
 * Get wallet activity
 */
export function getWalletActivity(address: string) {
  const wallet = getWallet(address);
  if (!wallet) return null;

  // Get full transaction details
  const transactions = wallet.transactions
    .map(hash => getTransaction(hash))
    .filter(Boolean);

  return {
    ...wallet,
    transactionDetails: transactions
  };
}

/**
 * Get scanner stats
 */
export async function getScannerStats() {
  const provider = getHttpProvider();
  const currentBlock = await provider.getBlockNumber();
  const lastProcessed = getLastProcessedBlock();
  const allTx = getAllTransactions();

  return {
    lastProcessedBlock: lastProcessed,
    currentBlock,
    blocksBehind: currentBlock - lastProcessed,
    totalIndexedTransactions: allTx.length,
    mintedEvents: allTx.filter(tx => tx.event === "Minted").length,
    transferEvents: allTx.filter(tx => tx.event === "Transfer").length,
    isScanning
  };
}

export default {
  startScanner,
  stopScanner,
  getIndexedTransaction,
  getWalletActivity,
  getScannerStats
};

