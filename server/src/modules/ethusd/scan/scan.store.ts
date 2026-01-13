/**
 * Scan Store
 * Persistent storage for scanner state (MVP: JSON file)
 */

import * as fs from "fs";
import * as path from "path";

interface ScanState {
  lastProcessedBlock: number;
  lastUpdated: number;
}

interface IndexedTransaction {
  txHash: string;
  blockNumber: number;
  timestamp: number;
  event: string;
  holdId?: string;
  amount?: string;
  beneficiary?: string;
  from?: string;
  to?: string;
}

interface IndexedWallet {
  address: string;
  transactions: string[]; // txHashes
  totalMinted: number;
  lastActivity: number;
}

const DATA_DIR = process.env.ETHUSD_DATA_DIR || "./data/ethusd";
const STATE_FILE = path.join(DATA_DIR, "scan-state.json");
const TX_INDEX_FILE = path.join(DATA_DIR, "tx-index.json");
const WALLET_INDEX_FILE = path.join(DATA_DIR, "wallet-index.json");

// In-memory cache
let scanState: ScanState = {
  lastProcessedBlock: 0,
  lastUpdated: 0
};

let txIndex: Map<string, IndexedTransaction> = new Map();
let walletIndex: Map<string, IndexedWallet> = new Map();

/**
 * Initialize data directory
 */
function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

/**
 * Load state from disk
 */
export function loadState(): ScanState {
  try {
    ensureDataDir();
    if (fs.existsSync(STATE_FILE)) {
      const data = fs.readFileSync(STATE_FILE, "utf-8");
      scanState = JSON.parse(data);
    }
  } catch (error) {
    console.warn("[Scan Store] Failed to load state, using default");
  }
  return scanState;
}

/**
 * Save state to disk
 */
export function saveState(state: Partial<ScanState>) {
  scanState = { ...scanState, ...state, lastUpdated: Date.now() };
  try {
    ensureDataDir();
    fs.writeFileSync(STATE_FILE, JSON.stringify(scanState, null, 2));
  } catch (error) {
    console.warn("[Scan Store] Failed to save state");
  }
}

/**
 * Get last processed block
 */
export function getLastProcessedBlock(): number {
  return scanState.lastProcessedBlock;
}

/**
 * Set last processed block
 */
export function setLastProcessedBlock(blockNumber: number) {
  saveState({ lastProcessedBlock: blockNumber });
}

/**
 * Load transaction index
 */
export function loadTxIndex(): Map<string, IndexedTransaction> {
  try {
    ensureDataDir();
    if (fs.existsSync(TX_INDEX_FILE)) {
      const data = fs.readFileSync(TX_INDEX_FILE, "utf-8");
      const arr = JSON.parse(data) as IndexedTransaction[];
      txIndex = new Map(arr.map(tx => [tx.txHash, tx]));
    }
  } catch (error) {
    console.warn("[Scan Store] Failed to load tx index");
  }
  return txIndex;
}

/**
 * Save transaction index
 */
export function saveTxIndex() {
  try {
    ensureDataDir();
    const arr = Array.from(txIndex.values());
    fs.writeFileSync(TX_INDEX_FILE, JSON.stringify(arr, null, 2));
  } catch (error) {
    console.warn("[Scan Store] Failed to save tx index");
  }
}

/**
 * Index a transaction
 */
export function indexTransaction(tx: IndexedTransaction) {
  txIndex.set(tx.txHash, tx);
  saveTxIndex();
}

/**
 * Get transaction by hash
 */
export function getTransaction(txHash: string): IndexedTransaction | undefined {
  return txIndex.get(txHash.toLowerCase());
}

/**
 * Load wallet index
 */
export function loadWalletIndex(): Map<string, IndexedWallet> {
  try {
    ensureDataDir();
    if (fs.existsSync(WALLET_INDEX_FILE)) {
      const data = fs.readFileSync(WALLET_INDEX_FILE, "utf-8");
      const arr = JSON.parse(data) as IndexedWallet[];
      walletIndex = new Map(arr.map(w => [w.address.toLowerCase(), w]));
    }
  } catch (error) {
    console.warn("[Scan Store] Failed to load wallet index");
  }
  return walletIndex;
}

/**
 * Save wallet index
 */
export function saveWalletIndex() {
  try {
    ensureDataDir();
    const arr = Array.from(walletIndex.values());
    fs.writeFileSync(WALLET_INDEX_FILE, JSON.stringify(arr, null, 2));
  } catch (error) {
    console.warn("[Scan Store] Failed to save wallet index");
  }
}

/**
 * Index wallet activity
 */
export function indexWalletActivity(
  address: string,
  txHash: string,
  amount: number
) {
  const key = address.toLowerCase();
  let wallet = walletIndex.get(key);
  
  if (!wallet) {
    wallet = {
      address: key,
      transactions: [],
      totalMinted: 0,
      lastActivity: Date.now()
    };
  }

  if (!wallet.transactions.includes(txHash)) {
    wallet.transactions.push(txHash);
    wallet.totalMinted += amount;
    wallet.lastActivity = Date.now();
  }

  walletIndex.set(key, wallet);
  saveWalletIndex();
}

/**
 * Get wallet by address
 */
export function getWallet(address: string): IndexedWallet | undefined {
  return walletIndex.get(address.toLowerCase());
}

/**
 * Get all indexed transactions
 */
export function getAllTransactions(): IndexedTransaction[] {
  return Array.from(txIndex.values());
}

/**
 * Initialize store
 */
export function initStore() {
  loadState();
  loadTxIndex();
  loadWalletIndex();
  console.log(`[Scan Store] Initialized. Last block: ${scanState.lastProcessedBlock}`);
}

export default {
  loadState,
  saveState,
  getLastProcessedBlock,
  setLastProcessedBlock,
  indexTransaction,
  getTransaction,
  indexWalletActivity,
  getWallet,
  getAllTransactions,
  initStore
};

