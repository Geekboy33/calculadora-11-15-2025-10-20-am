/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * AUTO-CONNECT SERVICE - LemonChain Full Protocol Sync
 * Servicio de conexión y sincronización COMPLETA desde blockchain
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * Este servicio:
 * - Conecta automáticamente a LemonChain RPC (SIEMPRE, sandbox y producción)
 * - Lee TODAS las transacciones de los contratos del protocolo
 * - Escanea eventos históricos para obtener locks, mints, injections
 * - Alimenta MintLemonExplorer y toda la plataforma con datos REALES
 * - Sincroniza cada 5 segundos con redundancia
 * - Funciona en sandbox y producción (lectura RPC siempre activa)
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import { ethers } from 'ethers';

// ═══════════════════════════════════════════════════════════════════════════════
// CONFIGURATION - RPC URLs con redundancia
// ═══════════════════════════════════════════════════════════════════════════════

const RPC_ENDPOINTS = [
  'https://rpc.lemonchain.io',
  'https://rpc-backup.lemonchain.io', // Backup (si existe)
];

export const LEMONCHAIN_CONFIG = {
  chainId: 1006,
  chainName: 'LemonChain',
  rpcUrl: RPC_ENDPOINTS[0],
  rpcEndpoints: RPC_ENDPOINTS,
  explorerUrl: 'https://explorer.lemonchain.io',
  nativeCurrency: {
    name: 'LEMX',
    symbol: 'LEMX',
    decimals: 18
  },
  // Blocks to scan for historical events (adjust based on deployment)
  genesisBlock: 0,
  blocksPerBatch: 10000 // Scan 10k blocks at a time
};

// Contract addresses V5 - DEPLOYED & VERIFIED ON LEMONCHAIN (Chain ID: 1006) - Jan 2026
// IMPORTANT: These must match SmartContractService.ts CONTRACT_ADDRESSES
export const CONTRACT_ADDRESSES_V5 = {
  // VUSD Token (Official) - El token stablecoin minteado
  VUSD: '0x0bF07709c94D32c9F000c51D4Ee0BCFfEeb1011b',
  // USDTokenized (First Signature) - Tokeniza USD del DAES
  USDTokenized: '0x602FbeBDe6034d34BB2497AB5fa261383f87d04f',
  // LockReserve (Second Signature) - Bloquea USD para backing
  LockReserve: '0x26dcc266aD3B5e14d51a079ce1Ed8Da891868021',
  // VUSDMinter (Third Signature) - Mintea VUSD respaldado
  VUSDMinter: '0x50EB3031dA15d238C34a1cA84B29D17D7F9a66AC',
  // PriceOracle - Precios de stablecoins
  PriceOracle: '0xbc3335ef43f2D95e26F4848AC86480294cB756bC',
  // MultichainBridge - Bridge cross-chain
  MultichainBridge: '0x7Ed3905aCF555E1BBadc87a7E7A5C8D854a8d531'
};

// ═══════════════════════════════════════════════════════════════════════════════
// ABIs COMPLETOS - Para leer TODOS los datos y eventos del protocolo
// ═══════════════════════════════════════════════════════════════════════════════

const USD_TOKENIZED_ABI = [
  // ERC20 Standard
  'function totalSupply() view returns (uint256)',
  'function balanceOf(address account) view returns (uint256)',
  'function name() view returns (string)',
  'function symbol() view returns (string)',
  'function decimals() view returns (uint8)',
  // Protocol specific
  'function getAllInjectionIds() view returns (bytes32[])',
  'function getInjection(bytes32 injectionId) view returns (uint256 id, address depositor, uint256 amount, uint256 timestamp, uint8 status, string iso20022Hash, string daesTransactionId, address beneficiary)',
  'function getStatistics() view returns (uint256 totalSupply, uint256 totalInjected, uint256 totalInLockReserve, uint256 totalConsumedForVUSD, uint256 totalInjections)',
  'function injectionCount() view returns (uint256)',
  // Events - Para escanear historial completo
  'event Transfer(address indexed from, address indexed to, uint256 value)',
  'event USDInjected(bytes32 indexed injectionId, address indexed depositor, uint256 amount, string iso20022Hash)',
  'event InjectionAccepted(bytes32 indexed injectionId, address indexed acceptedBy)',
  'event MovedToLockReserve(bytes32 indexed injectionId, uint256 lockReserveId)',
  'event ConsumedForVUSD(bytes32 indexed injectionId, address indexed beneficiary, uint256 vusdAmount)'
];

const LOCK_RESERVE_ABI = [
  // View functions
  'function totalReserve() view returns (uint256)',
  'function totalConsumed() view returns (uint256)',
  'function getLockCount() view returns (uint256)',
  'function lockCount() view returns (uint256)',
  'function getLockDetails(uint256 lockId) view returns (uint256 id, bytes32 injectionId, uint256 usdAmount, uint256 vusdAmount, address beneficiary, uint256 createdAt, uint8 status)',
  'function getAllLockIds() view returns (uint256[])',
  'function getStatistics() view returns (uint256 totalReserve, uint256 totalConsumed, uint256 totalLocks, uint256 totalConsumptions, uint256 reserveRatio)',
  // Events - Para escanear historial completo
  'event LockCreated(uint256 indexed lockId, bytes32 indexed injectionId, uint256 usdAmount, uint256 vusdAmount, address indexed beneficiary)',
  'event LockReleased(uint256 indexed lockId, address indexed releasedBy)',
  'event LockConsumed(uint256 indexed lockId, address indexed consumer, uint256 amount)',
  'event Transfer(address indexed from, address indexed to, uint256 value)'
];

const VUSD_MINTER_ABI = [
  // View functions
  'function totalMinted() view returns (uint256)',
  'function mintCount() view returns (uint256)',
  'function getBackingProof(bytes32 txHash) view returns (uint256 amount, address beneficiary, uint256 timestamp, bytes32 lockReserveId, bool verified)',
  'function verifyBackedSignature(bytes32 signature) view returns (bool valid, uint256 amount, address beneficiary)',
  'function getStatistics() view returns (uint256 totalBacked, uint256 totalBackingOperations, uint256 totalCertificates, uint256 vusdTotalSupply, uint256 globalBackingRatio)',
  // Events - Para escanear historial de mints
  'event BackedSignatureGenerated(bytes32 indexed backedSignature, uint256 amount, address indexed beneficiary)',
  'event VUSDMinted(address indexed to, uint256 amount, bytes32 indexed backedSignature)',
  'event MintExecuted(address indexed beneficiary, uint256 amount, bytes32 indexed lockId)'
];

const VUSD_ABI = [
  // ERC20 Standard
  'function balanceOf(address account) view returns (uint256)',
  'function totalSupply() view returns (uint256)',
  'function decimals() view returns (uint8)',
  'function name() view returns (string)',
  'function symbol() view returns (string)',
  // Events - Escanear todas las transferencias y mints
  'event Transfer(address indexed from, address indexed to, uint256 value)',
  'event Mint(address indexed to, uint256 amount)',
  'event Burn(address indexed from, uint256 amount)'
];

const PRICE_ORACLE_ABI = [
  'function getPrice(string symbol) view returns (uint256 price, uint256 decimals, uint256 timestamp)',
  'function getAllStablecoinPrices() view returns (tuple(string symbol, uint256 price, uint256 decimals, uint256 lastUpdate)[])',
  'function lastUpdate() view returns (uint256)'
];

const MULTICHAIN_BRIDGE_ABI = [
  'function getStatistics() view returns (uint256 totalLocked, uint256 totalReleased, uint256 pendingTransfers, uint256 completedTransfers)',
  'function getPendingTransfers() view returns (tuple(bytes32 id, address sender, uint256 amount, uint256 targetChainId, uint256 timestamp, uint8 status)[])',
  'event BridgeTransfer(bytes32 indexed transferId, address indexed sender, uint256 amount, uint256 targetChainId)',
  'event BridgeComplete(bytes32 indexed transferId, address indexed recipient, uint256 amount)'
];

// ═══════════════════════════════════════════════════════════════════════════════
// STORAGE KEYS - Para persistencia y redundancia
// ═══════════════════════════════════════════════════════════════════════════════

const STORAGE_KEYS = {
  CONNECTION_STATE: 'lemonchain_connection_state',
  BLOCKCHAIN_EVENTS: 'lemonchain_blockchain_events',
  INJECTIONS_CACHE: 'lemonchain_injections_cache',
  LOCKS_CACHE: 'lemonchain_locks_cache',
  LAST_SYNC: 'lemonchain_last_sync',
  VUSD_STATS: 'lemonchain_vusd_stats',
  USD_STATS: 'lemonchain_usd_stats',
  LOCK_RESERVE_STATS: 'lemonchain_lock_reserve_stats',
  MINTER_STATS: 'lemonchain_minter_stats',
  NETWORK_STATS: 'lemonchain_network_stats',
  EXPLORER_DATA: 'lemonchain_explorer_data',
  MINT_HISTORY: 'lemonchain_mint_history',
  VUSD_TRANSFERS: 'lemonchain_vusd_transfers',
  ALL_TRANSACTIONS: 'lemonchain_all_transactions',
  LAST_SCANNED_BLOCK: 'lemonchain_last_scanned_block'
};

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

export interface BlockchainEvent {
  id: string;
  type: 'USD_INJECTED' | 'INJECTION_ACCEPTED' | 'MOVED_TO_LOCK_RESERVE' | 'CONSUMED_FOR_VUSD' | 'LOCK_CREATED' | 'LOCK_RELEASED' | 'VUSD_MINTED' | 'TRANSFER' | 'BACKING_GENERATED';
  timestamp: string;
  txHash: string;
  blockNumber: number;
  data: Record<string, any>;
}

export interface InjectionData {
  injectionId: string;
  depositor: string;
  amount: string;
  timestamp: number;
  status: number;
  statusLabel: string;
  iso20022Hash: string;
  daesTransactionId: string;
  beneficiary: string;
}

export interface LockData {
  lockId: number;
  injectionId: string;
  usdAmount: string;
  vusdAmount: string;
  beneficiary: string;
  createdAt: number;
  status: number;
  statusLabel: string;
}

export interface ConnectionState {
  isConnected: boolean;
  walletAddress: string | null;
  chainId: number | null;
  lastConnected: string | null;
  autoConnect: boolean;
}

export interface SyncState {
  lastSyncTime: string | null;
  totalInjections: number;
  totalLocks: number;
  totalVUSDMinted: string;
  lastBlockScanned: number;
}

// Statistics interfaces
export interface USDStatistics {
  totalSupply: string;
  totalInjected: string;
  totalInLockReserve: string;
  totalConsumedForVUSD: string;
  totalInjections: number;
}

export interface LockReserveStatistics {
  totalReserve: string;
  totalConsumed: string;
  totalLocks: number;
  totalConsumptions: number;
  reserveRatio: number;
}

export interface VUSDMinterStatistics {
  totalBacked: string;
  totalBackingOperations: number;
  totalCertificates: number;
  vusdTotalSupply: string;
  globalBackingRatio: number;
}

export interface NetworkStatistics {
  blockNumber: number;
  gasPrice: string;
  timestamp: number;
  chainId: number;
}

// VUSD Transfer data
export interface VUSDTransfer {
  txHash: string;
  blockNumber: number;
  timestamp: number;
  from: string;
  to: string;
  amount: string;
  type: 'mint' | 'transfer' | 'burn';
}

// Complete protocol transaction
export interface ProtocolTransaction {
  id: string;
  type: 'INJECTION' | 'LOCK' | 'MINT' | 'TRANSFER' | 'BRIDGE';
  status: 'pending' | 'completed' | 'failed';
  txHash: string;
  blockNumber: number;
  timestamp: number;
  amount: string;
  from: string;
  to: string;
  contractAddress: string;
  details: Record<string, any>;
}

// Explorer data for MintLemonExplorer - COMPLETE
export interface MintExplorerData {
  totalMints: number;
  totalVUSDMinted: string;
  totalLocks: number;
  totalInjections: number;
  totalTransactions: number;
  totalVUSDTransfers: number;
  recentEvents: BlockchainEvent[];
  injections: InjectionData[];
  locks: LockData[];
  vusdTransfers: VUSDTransfer[];
  allTransactions: ProtocolTransaction[];
  usdStats: USDStatistics | null;
  lockReserveStats: LockReserveStatistics | null;
  minterStats: VUSDMinterStatistics | null;
  networkStats: NetworkStatistics | null;
  lastUpdated: string;
  lastScannedBlock: number;
  isFullySynced: boolean;
}

// ═══════════════════════════════════════════════════════════════════════════════
// AUTO-CONNECT SERVICE CLASS
// ═══════════════════════════════════════════════════════════════════════════════

class AutoConnectService {
  private provider: ethers.JsonRpcProvider | null = null;
  private signer: ethers.Wallet | null = null;
  private contracts: {
    usdTokenized: ethers.Contract | null;
    lockReserve: ethers.Contract | null;
    vusd: ethers.Contract | null;
    vusdMinter: ethers.Contract | null;
    priceOracle: ethers.Contract | null;
    multichainBridge: ethers.Contract | null;
  } = { usdTokenized: null, lockReserve: null, vusd: null, vusdMinter: null, priceOracle: null, multichainBridge: null };
  
  private connectionState: ConnectionState = {
    isConnected: false,
    walletAddress: null,
    chainId: null,
    lastConnected: null,
    autoConnect: true
  };
  
  private syncState: SyncState = {
    lastSyncTime: null,
    totalInjections: 0,
    totalLocks: 0,
    totalVUSDMinted: '0',
    lastBlockScanned: 0
  };

  // Explorer data - accessible for MintLemonExplorer and the platform
  private explorerData: MintExplorerData = {
    totalMints: 0,
    totalVUSDMinted: '0',
    totalLocks: 0,
    totalInjections: 0,
    totalTransactions: 0,
    totalVUSDTransfers: 0,
    recentEvents: [],
    injections: [],
    locks: [],
    vusdTransfers: [],
    allTransactions: [],
    usdStats: null,
    lockReserveStats: null,
    minterStats: null,
    networkStats: null,
    lastUpdated: '',
    lastScannedBlock: 0,
    isFullySynced: false
  };
  
  // Track if initial full scan is done
  private hasCompletedInitialScan: boolean = false;
  private isScanning: boolean = false;
  private currentRpcIndex: number = 0;
  
  private listeners: Set<(state: ConnectionState) => void> = new Set();
  private syncListeners: Set<(events: BlockchainEvent[]) => void> = new Set();
  private explorerListeners: Set<(data: MintExplorerData) => void> = new Set();
  private syncInterval: NodeJS.Timeout | null = null;

  constructor() {
    this.loadState();
    // Load cached explorer data immediately on construction
    this.loadCachedExplorerData();
    
    // Auto-connect on construction (for faster initial load)
    console.log('%c🚀 [AutoConnectService] Inicializando servicio...', 'color: #9b59b6; font-weight: bold;');
    setTimeout(() => {
      if (!this.connectionState.isConnected) {
        console.log('%c🔄 [AutoConnectService] Auto-conectando al iniciar...', 'color: #f39c12;');
        this.autoConnect();
      }
    }, 100);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // STATE PERSISTENCE
  // ═══════════════════════════════════════════════════════════════════════════

  private loadState(): void {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.CONNECTION_STATE);
      if (saved) {
        this.connectionState = { ...this.connectionState, ...JSON.parse(saved) };
      }
      
      const syncSaved = localStorage.getItem(STORAGE_KEYS.LAST_SYNC);
      if (syncSaved) {
        this.syncState = { ...this.syncState, ...JSON.parse(syncSaved) };
      }
    } catch (e) {
      console.error('[AutoConnectService] Error loading state:', e);
    }
  }

  private saveState(): void {
    try {
      localStorage.setItem(STORAGE_KEYS.CONNECTION_STATE, JSON.stringify(this.connectionState));
      localStorage.setItem(STORAGE_KEYS.LAST_SYNC, JSON.stringify(this.syncState));
    } catch (e) {
      console.error('[AutoConnectService] Error saving state:', e);
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // CONNECTION MANAGEMENT
  // ═══════════════════════════════════════════════════════════════════════════

  async autoConnect(privateKey?: string): Promise<boolean> {
    console.log('%c🔗 [AutoConnectService] Iniciando conexión a LemonChain (lectura RPC SIEMPRE activa)...', 'color: #00ff00; font-weight: bold; font-size: 14px;');
    console.log('%c   📡 Modo: LECTURA COMPLETA de blockchain (sandbox y producción)', 'color: #00ffff;');
    
    // Try to connect with redundancy
    for (let i = 0; i < LEMONCHAIN_CONFIG.rpcEndpoints.length; i++) {
      const rpcUrl = LEMONCHAIN_CONFIG.rpcEndpoints[i];
      try {
        console.log(`   🔄 Intentando RPC ${i + 1}/${LEMONCHAIN_CONFIG.rpcEndpoints.length}: ${rpcUrl}`);
        
        // Create provider
        this.provider = new ethers.JsonRpcProvider(rpcUrl);
        this.currentRpcIndex = i;
        
        // Verify connection with timeout
        const network = await Promise.race([
          this.provider.getNetwork(),
          new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 5000))
        ]) as ethers.Network;
        
        console.log(`   ✅ Conectado a red: ${network.name} (Chain ID: ${network.chainId})`);
        
        // Get private key from env or parameter (optional for read-only mode)
        const key = privateKey || 
          (typeof import.meta !== 'undefined' && import.meta.env?.VITE_ADMIN_PRIVATE_KEY) ||
          null;
        
        if (key) {
          try {
            this.signer = new ethers.Wallet(key, this.provider);
            this.connectionState.walletAddress = this.signer.address;
            console.log(`   🔑 Wallet conectada: ${this.signer.address.slice(0, 8)}...${this.signer.address.slice(-6)}`);
          } catch (walletError) {
            console.warn('   ⚠️ Wallet key inválida, continuando en modo lectura');
          }
        } else {
          console.log('   📖 Modo LECTURA (sin wallet) - Leyendo datos de blockchain');
        }
        
        // Initialize contracts (read-only is fine)
        this.initializeContracts();
        
        // Update state
        this.connectionState.isConnected = true;
        this.connectionState.chainId = Number(network.chainId);
        this.connectionState.lastConnected = new Date().toISOString();
        this.saveState();
        
        // Load cached data first
        this.loadCachedExplorerData();
        
        // Notify listeners
        this.notifyConnectionListeners();
        
        // Start sync (every 5 seconds for faster updates)
        this.startAutoSync();
        
        // Start initial full scan in background
        this.startFullBlockchainScan();
        
        console.log('%c✅ [AutoConnectService] Conexión exitosa! Escaneando blockchain...', 'color: #00ff00; font-weight: bold;');
        return true;
        
      } catch (error: any) {
        console.warn(`   ⚠️ RPC ${rpcUrl} falló:`, error.message);
        if (i === LEMONCHAIN_CONFIG.rpcEndpoints.length - 1) {
          // All RPCs failed, try with cached data
          console.log('%c⚠️ Todos los RPC fallaron, usando datos en caché', 'color: #ffaa00;');
          this.loadCachedExplorerData();
          if (this.explorerData.lastUpdated) {
            this.notifyExplorerListeners(this.explorerData);
          }
        }
      }
    }
    
    this.connectionState.isConnected = false;
    this.saveState();
    return false;
  }
  
  // Load cached explorer data on startup
  private loadCachedExplorerData(): void {
    try {
      const cached = localStorage.getItem(STORAGE_KEYS.EXPLORER_DATA);
      if (cached) {
        const data = JSON.parse(cached);
        this.explorerData = { ...this.explorerData, ...data };
        console.log(`   📦 Datos en caché cargados: ${this.explorerData.totalTransactions} transacciones, ${this.explorerData.totalVUSDMinted} VUSD`);
      }
    } catch (e) {
      console.warn('[AutoConnectService] Error loading cached data:', e);
    }
  }
  
  // Start full blockchain scan in background
  private async startFullBlockchainScan(): Promise<void> {
    if (this.hasCompletedInitialScan || this.isScanning) return;
    
    this.isScanning = true;
    console.log('%c🔍 [AutoConnectService] Iniciando escaneo COMPLETO de blockchain...', 'color: #9b59b6; font-weight: bold;');
    
    try {
      await this.scanAllVUSDTransfers();
      await this.scanAllProtocolEvents();
      this.hasCompletedInitialScan = true;
      this.explorerData.isFullySynced = true;
      this.explorerData.lastUpdated = new Date().toISOString();
      
      // Save to cache
      this.cacheExplorerData();
      
      // CRITICAL: Notify all listeners that scan is complete
      console.log('%c✅ Escaneo completo! Notificando listeners...', 'color: #00ff00; font-weight: bold;');
      console.log(`   📊 Total Transactions: ${this.explorerData.totalTransactions}`);
      console.log(`   📊 VUSD Transfers: ${this.explorerData.totalVUSDTransfers}`);
      this.notifyExplorerListeners(this.explorerData);
      
    } catch (error) {
      console.error('[AutoConnectService] Error en escaneo completo:', error);
    } finally {
      this.isScanning = false;
    }
  }
  
  // Cache explorer data
  private cacheExplorerData(): void {
    try {
      localStorage.setItem(STORAGE_KEYS.EXPLORER_DATA, JSON.stringify(this.explorerData));
    } catch (e) {
      console.warn('[AutoConnectService] Error caching explorer data:', e);
    }
  }

  private initializeContracts(): void {
    if (!this.provider) return;
    
    const signerOrProvider = this.signer || this.provider;
    
    this.contracts.usdTokenized = new ethers.Contract(
      CONTRACT_ADDRESSES_V5.USDTokenized,
      USD_TOKENIZED_ABI,
      signerOrProvider
    );
    
    this.contracts.lockReserve = new ethers.Contract(
      CONTRACT_ADDRESSES_V5.LockReserve,
      LOCK_RESERVE_ABI,
      signerOrProvider
    );
    
    this.contracts.vusd = new ethers.Contract(
      CONTRACT_ADDRESSES_V5.VUSD,
      VUSD_ABI,
      signerOrProvider
    );

    this.contracts.vusdMinter = new ethers.Contract(
      CONTRACT_ADDRESSES_V5.VUSDMinter,
      VUSD_MINTER_ABI,
      signerOrProvider
    );

    this.contracts.priceOracle = new ethers.Contract(
      CONTRACT_ADDRESSES_V5.PriceOracle,
      PRICE_ORACLE_ABI,
      signerOrProvider
    );

    this.contracts.multichainBridge = new ethers.Contract(
      CONTRACT_ADDRESSES_V5.MultichainBridge,
      MULTICHAIN_BRIDGE_ABI,
      signerOrProvider
    );
    
    console.log('   📋 Contratos inicializados (V5):');
    console.log(`      - USDTokenized: ${CONTRACT_ADDRESSES_V5.USDTokenized}`);
    console.log(`      - LockReserve: ${CONTRACT_ADDRESSES_V5.LockReserve}`);
    console.log(`      - VUSD: ${CONTRACT_ADDRESSES_V5.VUSD}`);
    console.log(`      - VUSDMinter: ${CONTRACT_ADDRESSES_V5.VUSDMinter}`);
    console.log(`      - PriceOracle: ${CONTRACT_ADDRESSES_V5.PriceOracle}`);
    console.log(`      - MultichainBridge: ${CONTRACT_ADDRESSES_V5.MultichainBridge}`);
  }

  disconnect(): void {
    this.stopAutoSync();
    this.provider = null;
    this.signer = null;
    this.contracts = { usdTokenized: null, lockReserve: null, vusd: null, vusdMinter: null, priceOracle: null, multichainBridge: null };
    
    this.connectionState.isConnected = false;
    this.saveState();
    this.notifyConnectionListeners();
    
    console.log('[AutoConnectService] Desconectado');
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // DATA SYNC FROM BLOCKCHAIN
  // ═══════════════════════════════════════════════════════════════════════════

  private startAutoSync(): void {
    if (this.syncInterval) return;
    
    // Initial sync
    this.syncFromBlockchain();
    
    // Sync every 5 seconds for faster updates
    this.syncInterval = setInterval(() => {
      this.syncFromBlockchain();
    }, 5000);
    
    console.log('[AutoConnectService] Auto-sync iniciado (cada 5s)');
  }

  private stopAutoSync(): void {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
    }
  }
  
  // ═══════════════════════════════════════════════════════════════════════════
  // FULL BLOCKCHAIN SCANNING - Lee TODAS las transacciones del protocolo
  // ═══════════════════════════════════════════════════════════════════════════
  
  private async scanAllVUSDTransfers(): Promise<void> {
    console.log('%c📜 [SCAN] Escaneando TODAS las transferencias VUSD via RPC directo...', 'color: #f39c12; font-weight: bold;');
    
    const transfers: VUSDTransfer[] = [];
    const TRANSFER_TOPIC = '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef';
    const ZERO_ADDRESS_PADDED = '0x0000000000000000000000000000000000000000000000000000000000000000';
    
    try {
      // Direct RPC call to get ALL events from VUSD contract (filter in code, not in request)
      const response = await fetch(LEMONCHAIN_CONFIG.rpcUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          method: 'eth_getLogs',
          params: [{
            fromBlock: '0x0',
            toBlock: 'latest',
            address: CONTRACT_ADDRESSES_V5.VUSD
            // NO topic filter - filter in code for compatibility
          }],
          id: 1
        })
      });
      
      const data = await response.json();
      
      if (data.result && Array.isArray(data.result)) {
        console.log(`   📊 VUSD: ${data.result.length} eventos totales encontrados`);
        
        // Filter only Transfer events in code
        const transferEvents = data.result.filter((log: any) => 
          log.topics && log.topics[0] === TRANSFER_TOPIC
        );
        
        console.log(`   📊 VUSD: ${transferEvents.length} Transfer events`);
        
        for (const log of transferEvents) {
          const txHash = log.transactionHash;
          const blockNumber = parseInt(log.blockNumber, 16);
          
          // Decode Transfer event
          let from = '';
          let to = '';
          let amount = '0';
          
          if (log.topics && log.topics.length >= 3) {
            from = '0x' + log.topics[1].slice(26);
            to = '0x' + log.topics[2].slice(26);
          }
          
          if (log.data && log.data !== '0x') {
            try {
              const amountBigInt = BigInt(log.data);
              amount = (Number(amountBigInt) / 1e18).toFixed(2);
            } catch (e) {
              amount = '0';
            }
          }
          
          // Determine transfer type
          const isMint = log.topics[1] === ZERO_ADDRESS_PADDED;
          const isBurn = log.topics[2] === ZERO_ADDRESS_PADDED;
          
          transfers.push({
            txHash,
            blockNumber,
            timestamp: 0,
            from,
            to,
            amount,
            type: isMint ? 'mint' : isBurn ? 'burn' : 'transfer'
          });
        }
      }
      
      // Sort by block number descending (most recent first)
      transfers.sort((a, b) => b.blockNumber - a.blockNumber);
      
      // Update explorer data
      this.explorerData.vusdTransfers = transfers;
      this.explorerData.totalVUSDTransfers = transfers.length;
      
      // Count mints and calculate total
      const mints = transfers.filter(t => t.type === 'mint');
      this.explorerData.totalMints = mints.length;
      
      const totalMinted = mints.reduce((sum, t) => sum + parseFloat(t.amount), 0);
      this.explorerData.totalVUSDMinted = totalMinted.toFixed(2);
      
      console.log(`%c   ✅ ${transfers.length} VUSD transfers (${mints.length} mints = ${totalMinted.toFixed(2)} VUSD)`, 'color: #2ecc71; font-weight: bold;');
      
      // Log recent mints for verification
      const recentMints = mints.slice(0, 5);
      recentMints.forEach(m => {
        console.log(`      🪙 Mint: ${m.amount} VUSD to ${m.to.slice(0, 10)}... | Tx: ${m.txHash.slice(0, 14)}...`);
      });
      
      // Save to cache
      localStorage.setItem(STORAGE_KEYS.VUSD_TRANSFERS, JSON.stringify(transfers));
      
      // Notify listeners immediately after VUSD scan
      this.explorerData.lastUpdated = new Date().toISOString();
      this.notifyExplorerListeners(this.explorerData);
      
    } catch (error) {
      console.error('[AutoConnectService] Error scanning VUSD transfers:', error);
    }
  }
  
  private async scanAllProtocolEvents(): Promise<void> {
    console.log('%c📜 [SCAN] Escaneando TODOS los eventos de contratos V5 via RPC directo...', 'color: #e74c3c; font-weight: bold;');
    
    const allTransactions: ProtocolTransaction[] = [];
    
    // Event signatures (keccak256 hashes) - Pre-calculated for performance
    const EVENT_SIGNATURES: Record<string, string> = {
      // ERC20 Transfer - Standard event
      TRANSFER: '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef',
      // USDTokenized events
      USD_INJECTED: ethers.id('USDInjected(bytes32,address,uint256,string)'),
      INJECTION_ACCEPTED: ethers.id('InjectionAccepted(bytes32,address)'),
      MOVED_TO_LOCK: ethers.id('MovedToLockReserve(bytes32,uint256)'),
      CONSUMED_FOR_VUSD: ethers.id('ConsumedForVUSD(bytes32,address,uint256)'),
      // LockReserve events
      LOCK_CREATED: ethers.id('LockCreated(uint256,bytes32,uint256,uint256,address)'),
      LOCK_RELEASED: ethers.id('LockReleased(uint256,address)'),
      LOCK_CONSUMED: ethers.id('LockConsumed(uint256,address,uint256)'),
      // VUSDMinter events
      BACKED_SIGNATURE: ethers.id('BackedSignatureGenerated(bytes32,uint256,address)'),
      VUSD_MINTED: ethers.id('VUSDMinted(address,uint256,bytes32)'),
      MINT_EXECUTED: ethers.id('MintExecuted(address,uint256,bytes32)')
    };
    
    console.log('%c📋 Event Signatures:', 'color: #9b59b6;');
    console.log('   TRANSFER:', EVENT_SIGNATURES.TRANSFER);
    console.log('   USD_INJECTED:', EVENT_SIGNATURES.USD_INJECTED);
    console.log('   INJECTION_ACCEPTED:', EVENT_SIGNATURES.INJECTION_ACCEPTED);
    console.log('   LOCK_CREATED:', EVENT_SIGNATURES.LOCK_CREATED);
    
    // Contract addresses to scan with detailed event mapping
    const contractsToScan = [
      { name: 'VUSD', address: CONTRACT_ADDRESSES_V5.VUSD, type: 'TRANSFER' as const },
      { name: 'USDTokenized', address: CONTRACT_ADDRESSES_V5.USDTokenized, type: 'INJECTION' as const },
      { name: 'LockReserve', address: CONTRACT_ADDRESSES_V5.LockReserve, type: 'LOCK' as const },
      { name: 'VUSDMinter', address: CONTRACT_ADDRESSES_V5.VUSDMinter, type: 'MINT' as const },
      { name: 'MultichainBridge', address: CONTRACT_ADDRESSES_V5.MultichainBridge, type: 'BRIDGE' as const }
    ];
    
    try {
      for (const contract of contractsToScan) {
        try {
          // Direct RPC call to get ALL logs from contract (from block 0)
          const response = await fetch(LEMONCHAIN_CONFIG.rpcUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              jsonrpc: '2.0',
              method: 'eth_getLogs',
              params: [{
                fromBlock: '0x0',
                toBlock: 'latest',
                address: contract.address
              }],
              id: 1
            })
          });
          
          const data = await response.json();
          
          if (data.result && Array.isArray(data.result)) {
            const eventCount = data.result.length;
            console.log(`   📊 ${contract.name} (${contract.address.slice(0,10)}...): ${eventCount} eventos`);
            
            // Process each event with detailed decoding
            for (const log of data.result) {
              const txHash = log.transactionHash;
              const blockNumber = parseInt(log.blockNumber, 16);
              const logIndex = parseInt(log.logIndex, 16);
              const topic0 = log.topics?.[0] || '';
              
              // Initialize transaction data
              let amount = '0';
              let from = '';
              let to = '';
              let eventType: ProtocolTransaction['type'] = contract.type;
              let eventName = 'Unknown';
              let details: Record<string, any> = { 
                contractName: contract.name,
                contractAddress: contract.address,
                logIndex,
                topics: log.topics,
                rawData: log.data
              };
              
              // Decode based on event signature
              if (topic0 === EVENT_SIGNATURES.TRANSFER) {
                // ERC20 Transfer event
                eventName = 'Transfer';
                if (log.topics?.length >= 3) {
                  from = '0x' + log.topics[1].slice(26);
                  to = '0x' + log.topics[2].slice(26);
                }
                if (log.data && log.data !== '0x') {
                  try {
                    const decimals = contract.name === 'USDTokenized' ? 6 : 18;
                    const amountBigInt = BigInt(log.data);
                    amount = (Number(amountBigInt) / Math.pow(10, decimals)).toFixed(decimals === 6 ? 2 : 6);
                  } catch (e) { amount = '0'; }
                }
                details.eventName = eventName;
                details.from = from;
                details.to = to;
                
                // Identify mint (from zero address)
                if (from === '0x0000000000000000000000000000000000000000') {
                  eventType = 'MINT';
                  eventName = 'Mint';
                  details.isMint = true;
                }
              } 
              // USDTokenized specific events - Match by hash OR by contract name
              else if (contract.name === 'USDTokenized') {
                eventType = 'INJECTION';
                
                // Match specific event types by hash
                if (topic0 === EVENT_SIGNATURES.USD_INJECTED) {
                  eventName = 'USDInjected';
                } else if (topic0 === EVENT_SIGNATURES.INJECTION_ACCEPTED) {
                  eventName = 'InjectionAccepted';
                } else if (topic0 === EVENT_SIGNATURES.MOVED_TO_LOCK) {
                  eventName = 'MovedToLockReserve';
                } else if (topic0 === EVENT_SIGNATURES.CONSUMED_FOR_VUSD) {
                  eventName = 'ConsumedForVUSD';
                } else {
                  eventName = 'USDTokenized Event';
                }
                
                // Try to decode USDTokenized events
                if (log.topics?.length >= 2) {
                  // injectionId is usually in topics[1]
                  details.injectionId = log.topics[1];
                }
                if (log.topics?.length >= 3) {
                  // depositor/acceptedBy in topics[2]
                  details.actor = '0x' + log.topics[2].slice(26);
                  from = details.actor;
                }
                
                // Decode data field for amount
                if (log.data && log.data !== '0x' && log.data.length >= 66) {
                  try {
                    // First 32 bytes is usually amount (in 6 decimals for USD)
                    const amountHex = '0x' + log.data.slice(2, 66);
                    const amountBigInt = BigInt(amountHex);
                    amount = (Number(amountBigInt) / 1e6).toFixed(2);
                  } catch (e) { }
                }
                
                details.eventName = eventName;
                
                // Log USDTokenized events for debugging
                console.log(`      💵 USDTokenized: ${eventName} | Topic0: ${topic0.slice(0, 18)}... | Amount: ${amount}`);
              }
              // LockReserve specific events  
              else if (contract.name === 'LockReserve') {
                eventType = 'LOCK';
                
                // Match specific event types by hash
                if (topic0 === EVENT_SIGNATURES.LOCK_CREATED) {
                  eventName = 'LockCreated';
                } else if (topic0 === EVENT_SIGNATURES.LOCK_RELEASED) {
                  eventName = 'LockReleased';
                } else if (topic0 === EVENT_SIGNATURES.LOCK_CONSUMED) {
                  eventName = 'LockConsumed';
                } else {
                  eventName = 'LockReserve Event';
                }
                
                // Decode lock events
                if (log.topics?.length >= 2) {
                  // lockId is usually in topics[1]
                  try {
                    details.lockId = parseInt(log.topics[1], 16);
                  } catch (e) {
                    details.lockId = log.topics[1];
                  }
                }
                
                // Log LockReserve events for debugging
                console.log(`      🔒 LockReserve: ${eventName} | Topic0: ${topic0.slice(0, 18)}... | LockId: ${details.lockId}`);
                if (log.topics?.length >= 3) {
                  // injectionId or address in topics[2]
                  details.injectionId = log.topics[2];
                }
                if (log.topics?.length >= 4) {
                  // beneficiary in topics[3]
                  details.beneficiary = '0x' + log.topics[3].slice(26);
                  to = details.beneficiary;
                }
                
                // Decode data for amounts
                if (log.data && log.data !== '0x' && log.data.length >= 66) {
                  try {
                    // usdAmount (6 decimals) in first 32 bytes
                    const usdHex = '0x' + log.data.slice(2, 66);
                    const usdAmount = Number(BigInt(usdHex)) / 1e6;
                    details.usdAmount = usdAmount.toFixed(2);
                    amount = details.usdAmount;
                    
                    // vusdAmount (18 decimals) in second 32 bytes
                    if (log.data.length >= 130) {
                      const vusdHex = '0x' + log.data.slice(66, 130);
                      const vusdAmount = Number(BigInt(vusdHex)) / 1e18;
                      details.vusdAmount = vusdAmount.toFixed(6);
                    }
                  } catch (e) { }
                }
                
                // Determine event name
                eventName = 'LockCreated';
                if (topic0.toLowerCase().includes('release')) {
                  eventName = 'LockReleased';
                } else if (topic0.toLowerCase().includes('consum')) {
                  eventName = 'LockConsumed';
                }
                
                details.eventName = eventName;
              }
              // VUSDMinter specific events
              else if (contract.name === 'VUSDMinter') {
                eventType = 'MINT';
                
                if (log.topics?.length >= 2) {
                  // beneficiary or signature in topics[1]
                  if (log.topics[1].length === 66) {
                    details.beneficiary = '0x' + log.topics[1].slice(26);
                    to = details.beneficiary;
                  } else {
                    details.backedSignature = log.topics[1];
                  }
                }
                
                // Decode amount from data
                if (log.data && log.data !== '0x' && log.data.length >= 66) {
                  try {
                    const amountHex = '0x' + log.data.slice(2, 66);
                    const amountBigInt = BigInt(amountHex);
                    amount = (Number(amountBigInt) / 1e18).toFixed(6);
                  } catch (e) { }
                }
                
                eventName = 'VUSDMinted';
                if (topic0.toLowerCase().includes('backed') || topic0.toLowerCase().includes('signature')) {
                  eventName = 'BackedSignatureGenerated';
                } else if (topic0.toLowerCase().includes('execute')) {
                  eventName = 'MintExecuted';
                }
                
                details.eventName = eventName;
              }
              
              allTransactions.push({
                id: `${contract.name.toLowerCase()}-${txHash}-${logIndex}`,
                type: eventType,
                status: 'completed',
                txHash,
                blockNumber,
                timestamp: 0,
                amount,
                from,
                to,
                contractAddress: contract.address,
                details
              });
            }
          }
        } catch (contractError) {
          console.warn(`   ⚠️ Error scanning ${contract.name}:`, contractError);
        }
      }
      
      // Sort by block number descending
      allTransactions.sort((a, b) => b.blockNumber - a.blockNumber);
      
      // Update explorer data with detailed counts
      this.explorerData.allTransactions = allTransactions;
      this.explorerData.totalTransactions = allTransactions.length;
      
      // Count by type
      const injectionCount = allTransactions.filter(t => t.type === 'INJECTION').length;
      const lockCount = allTransactions.filter(t => t.type === 'LOCK').length;
      const mintCount = allTransactions.filter(t => t.type === 'MINT').length;
      
      if (injectionCount > 0) this.explorerData.totalInjections = injectionCount;
      if (lockCount > 0) this.explorerData.totalLocks = lockCount;
      
      console.log(`%c   ✅ TOTAL: ${allTransactions.length} transacciones del protocolo V5`, 'color: #2ecc71; font-weight: bold;');
      console.log(`      📥 Injections (USDTokenized): ${injectionCount}`);
      console.log(`      🔒 Locks (LockReserve): ${lockCount}`);
      console.log(`      🪙 Mints (VUSD/Minter): ${mintCount}`);
      
      // Log recent transactions for verification
      const recentTxs = allTransactions.slice(0, 5);
      recentTxs.forEach(tx => {
        console.log(`      📝 ${tx.details?.eventName || tx.type}: ${tx.amount} | Block ${tx.blockNumber} | ${tx.txHash.slice(0, 14)}...`);
      });
      
      // Save to cache
      localStorage.setItem(STORAGE_KEYS.ALL_TRANSACTIONS, JSON.stringify(allTransactions));
      
      // Notify listeners immediately after protocol scan
      this.explorerData.lastUpdated = new Date().toISOString();
      this.notifyExplorerListeners(this.explorerData);
      
    } catch (error) {
      console.error('[AutoConnectService] Error scanning protocol events:', error);
    }
  }
  
  // Calculate keccak256 hash for event signatures using ethers
  private keccak256(signature: string): string {
    try {
      // Use ethers to calculate the proper keccak256 hash
      const hash = ethers.id(signature);
      return hash.slice(2); // Remove '0x' prefix
    } catch (e) {
      console.warn('[AutoConnectService] Error calculating keccak256:', e);
      // Fallback - return a placeholder
      return signature.split('').reduce((hash, char) => {
        return ((hash << 5) - hash + char.charCodeAt(0)) | 0;
      }, 0).toString(16).padStart(64, '0');
    }
  }

  async syncFromBlockchain(): Promise<BlockchainEvent[]> {
    if (!this.connectionState.isConnected || !this.provider) {
      // Try with cached data
      const cached = this.getCachedExplorerData();
      if (cached) {
        this.explorerData = { ...this.explorerData, ...cached };
        this.notifyExplorerListeners(this.explorerData);
      }
      return [];
    }
    
    console.log('%c🔄 [AutoConnectService] Sincronizando desde LemonChain RPC...', 'color: #00ffff;');
    
    const events: BlockchainEvent[] = [];
    
    try {
      // 1. Fetch network stats first (fast, always works)
      const networkStats = await this.fetchNetworkStatistics();
      
      // 2. Fetch VUSD total supply directly (CRITICAL - this always works)
      const vusdStats = await this.fetchVUSDStats();
      
      // 3. Fetch contract statistics (may fail if methods not implemented)
      const usdStats = await this.fetchUSDStatistics();
      const lockReserveStats = await this.fetchLockReserveStatistics();
      const minterStats = await this.fetchMinterStatistics();
      
      // 4. Fetch injections and locks (if contract methods exist)
      const injections = await this.fetchAllInjections();
      const locks = await this.fetchAllLocks();
      
      // 5. Convert to events for explorer
      injections.forEach(inj => {
        events.push({
          id: `inj-${inj.injectionId}`,
          type: this.getInjectionEventType(inj.status),
          timestamp: new Date(inj.timestamp * 1000).toISOString(),
          txHash: inj.injectionId,
          blockNumber: networkStats?.blockNumber || 0,
          data: inj
        });
      });
      
      locks.forEach(lock => {
        events.push({
          id: `lock-${lock.lockId}`,
          type: 'LOCK_CREATED',
          timestamp: new Date(lock.createdAt * 1000).toISOString(),
          txHash: lock.injectionId,
          blockNumber: networkStats?.blockNumber || 0,
          data: lock
        });
      });
      
      // Update sync state
      this.syncState.lastSyncTime = new Date().toISOString();
      this.syncState.totalInjections = injections.length;
      this.syncState.totalLocks = locks.length;
      this.syncState.totalVUSDMinted = vusdStats.totalSupply;
      this.syncState.lastBlockScanned = networkStats?.blockNumber || 0;
      this.saveState();

      // Update explorer data - THIS FEEDS THE ENTIRE PLATFORM
      // Preserve existing vusdTransfers and allTransactions from full scan
      this.explorerData = {
        ...this.explorerData, // Keep existing data from full scan
        totalMints: minterStats?.totalBackingOperations || this.explorerData.totalMints || 0,
        totalVUSDMinted: vusdStats.totalSupply,
        totalLocks: locks.length || this.explorerData.totalLocks,
        totalInjections: injections.length || this.explorerData.totalInjections,
        recentEvents: events.length > 0 ? events.slice(-50) : this.explorerData.recentEvents,
        injections: injections.length > 0 ? injections : this.explorerData.injections,
        locks: locks.length > 0 ? locks : this.explorerData.locks,
        usdStats: usdStats || this.explorerData.usdStats,
        lockReserveStats: lockReserveStats || this.explorerData.lockReserveStats,
        minterStats: minterStats || this.explorerData.minterStats,
        networkStats: networkStats || this.explorerData.networkStats,
        lastUpdated: new Date().toISOString(),
        lastScannedBlock: networkStats?.blockNumber || this.explorerData.lastScannedBlock
      };
      
      // Cache all data
      this.cacheAllData(injections, locks, vusdStats, usdStats, lockReserveStats, minterStats, networkStats);
      
      // Notify all listeners
      this.notifySyncListeners(events);
      this.notifyExplorerListeners(this.explorerData);
      
      console.log('%c   ✅ Sincronización desde LemonChain:', 'color: #00ff00;');
      console.log(`      📊 VUSD: ${vusdStats.totalSupply} | ${injections.length} injections | ${locks.length} locks`);
      console.log(`      📜 ${this.explorerData.totalTransactions || 0} transacciones totales | ${this.explorerData.totalVUSDTransfers || 0} VUSD transfers`);
      console.log(`      🔗 Block: ${networkStats?.blockNumber || 'N/A'} | Gas: ${networkStats?.gasPrice || 'N/A'} gwei`);
      
      return events;
      
    } catch (error) {
      console.error('[AutoConnectService] Error en sync:', error);
      // Return cached data on error
      this.notifyExplorerListeners(this.explorerData);
      return this.loadCachedEvents();
    }
  }

  private getInjectionEventType(status: number): BlockchainEvent['type'] {
    switch (status) {
      case 0: return 'USD_INJECTED'; // PENDING
      case 1: return 'INJECTION_ACCEPTED'; // ACCEPTED
      case 2: return 'MOVED_TO_LOCK_RESERVE'; // IN_LOCK_RESERVE
      case 3: return 'CONSUMED_FOR_VUSD'; // CONSUMED_FOR_VUSD
      default: return 'USD_INJECTED';
    }
  }

  private getInjectionStatusLabel(status: number): string {
    switch (status) {
      case 0: return 'PENDING';
      case 1: return 'ACCEPTED';
      case 2: return 'IN_LOCK_RESERVE';
      case 3: return 'CONSUMED_FOR_VUSD';
      default: return 'UNKNOWN';
    }
  }

  private getLockStatusLabel(status: number): string {
    switch (status) {
      case 0: return 'ACTIVE';
      case 1: return 'RELEASED';
      case 2: return 'CONSUMED';
      default: return 'UNKNOWN';
    }
  }

  async fetchAllInjections(): Promise<InjectionData[]> {
    if (!this.contracts.usdTokenized) return [];
    
    try {
      let injectionIds: string[] = [];
      
      // Try getAllInjectionIds first
      try {
        injectionIds = await this.contracts.usdTokenized.getAllInjectionIds();
        console.log(`   📥 Obteniendo ${injectionIds.length} injections de USDTokenized...`);
      } catch (e) {
        // Contract doesn't have getAllInjectionIds - try to get recent events
        console.log('   ⚠️ getAllInjectionIds not available, scanning events...');
        
        // Try to scan Transfer events from the contract
        try {
          const currentBlock = await this.provider!.getBlockNumber();
          const fromBlock = Math.max(0, currentBlock - 50000); // Last ~50k blocks
          
          const filter = this.contracts.usdTokenized.filters.Transfer();
          const events = await this.contracts.usdTokenized.queryFilter(filter, fromBlock, currentBlock);
          
          // Get unique injection IDs from events
          const uniqueIds = new Set<string>();
          for (const event of events) {
            if ('args' in event && event.args) {
              const txHash = event.transactionHash;
              uniqueIds.add(txHash);
            }
          }
          
          console.log(`   📥 Found ${uniqueIds.size} Transfer events in USDTokenized...`);
          
          // Create synthetic injection data from events
          const injections: InjectionData[] = [];
          for (const event of events.slice(0, 100)) { // Limit to 100 most recent
            if ('args' in event && event.args) {
              const block = await event.getBlock();
              injections.push({
                injectionId: event.transactionHash,
                depositor: event.args.from || '0x0',
                amount: ethers.formatUnits(event.args.value || 0, 18),
                timestamp: block?.timestamp || Math.floor(Date.now() / 1000),
                status: 1, // ACCEPTED
                statusLabel: 'ACCEPTED',
                iso20022Hash: '',
                daesTransactionId: event.transactionHash.slice(0, 20),
                beneficiary: event.args.to || '0x0'
              });
            }
          }
          
          return injections;
        } catch (eventError) {
          console.warn('[AutoConnectService] Could not scan events:', eventError);
          return this.getCachedInjections();
        }
      }
      
      const injections: InjectionData[] = [];
      
      for (const id of injectionIds) {
        try {
          const data = await this.contracts.usdTokenized.getInjection(id);
          const status = Number(data.status || data[4]);
          injections.push({
            injectionId: id,
            depositor: data.depositor || data[1],
            amount: ethers.formatUnits(data.amount || data[2], 18),
            timestamp: Number(data.timestamp || data[3]),
            status,
            statusLabel: this.getInjectionStatusLabel(status),
            iso20022Hash: data.iso20022Hash || data[5] || '',
            daesTransactionId: data.daesTransactionId || data[6] || '',
            beneficiary: data.beneficiary || data[7] || ''
          });
        } catch (e) {
          console.warn(`[AutoConnectService] Error fetching injection ${id}:`, e);
        }
      }
      
      return injections;
    } catch (error) {
      console.error('[AutoConnectService] Error fetching injections:', error);
      return this.getCachedInjections();
    }
  }

  async fetchAllLocks(): Promise<LockData[]> {
    if (!this.contracts.lockReserve) return [];
    
    try {
      let lockCount = 0;
      
      // Try getLockCount first
      try {
        lockCount = Number(await this.contracts.lockReserve.getLockCount());
        console.log(`   🔒 Obteniendo ${lockCount} locks de LockReserve...`);
      } catch (e) {
        // Contract doesn't have getLockCount - try to scan events
        console.log('   ⚠️ getLockCount not available, scanning events...');
        
        try {
          const currentBlock = await this.provider!.getBlockNumber();
          const fromBlock = Math.max(0, currentBlock - 50000);
          
          const filter = this.contracts.lockReserve.filters.LockCreated();
          const events = await this.contracts.lockReserve.queryFilter(filter, fromBlock, currentBlock);
          
          console.log(`   🔒 Found ${events.length} LockCreated events...`);
          
          const locks: LockData[] = [];
          for (const event of events.slice(0, 100)) {
            if ('args' in event && event.args) {
              const block = await event.getBlock();
              locks.push({
                lockId: Number(event.args.lockId || 0),
                injectionId: event.args.injectionId || event.transactionHash,
                usdAmount: ethers.formatUnits(event.args.usdAmount || 0, 18),
                vusdAmount: ethers.formatUnits(event.args.vusdAmount || 0, 18),
                beneficiary: event.args.beneficiary || '0x0',
                createdAt: block?.timestamp || Math.floor(Date.now() / 1000),
                status: 0,
                statusLabel: 'ACTIVE'
              });
            }
          }
          
          return locks;
        } catch (eventError) {
          console.warn('[AutoConnectService] Could not scan lock events:', eventError);
          return this.getCachedLocks();
        }
      }
      
      const locks: LockData[] = [];
      
      for (let i = 1; i <= lockCount; i++) {
        try {
          const data = await this.contracts.lockReserve.getLockDetails(i);
          const status = Number(data.status || data[6]);
          locks.push({
            lockId: Number(data.id || data[0]),
            injectionId: data.injectionId || data[1],
            usdAmount: ethers.formatUnits(data.usdAmount || data[2], 18),
            vusdAmount: ethers.formatUnits(data.vusdAmount || data[3], 18),
            beneficiary: data.beneficiary || data[4],
            createdAt: Number(data.createdAt || data[5]),
            status,
            statusLabel: this.getLockStatusLabel(status)
          });
        } catch (e) {
          // Lock might not exist
        }
      }
      
      return locks;
    } catch (error) {
      console.error('[AutoConnectService] Error fetching locks:', error);
      return [];
    }
  }

  async fetchVUSDStats(): Promise<{ totalSupply: string; decimals: number }> {
    console.log('%c📊 [VUSD] Leyendo totalSupply de VUSD...', 'color: #f1c40f;');
    
    // Method 1: Try with ethers contract
    if (this.contracts.vusd) {
      try {
        const [totalSupply, decimals] = await Promise.all([
          this.contracts.vusd.totalSupply(),
          this.contracts.vusd.decimals()
        ]);
        
        const formatted = ethers.formatUnits(totalSupply, decimals);
        console.log(`%c   ✅ VUSD totalSupply (contract): ${formatted}`, 'color: #2ecc71;');
        
        return {
          totalSupply: formatted,
          decimals: Number(decimals)
        };
      } catch (error) {
        console.warn('[AutoConnectService] Contract method failed, trying direct RPC...');
      }
    }
    
    // Method 2: Direct RPC call as fallback (ALWAYS WORKS)
    try {
      const response = await fetch(LEMONCHAIN_CONFIG.rpcUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          method: 'eth_call',
          params: [{
            to: CONTRACT_ADDRESSES_V5.VUSD,
            data: '0x18160ddd' // totalSupply()
          }, 'latest'],
          id: 1
        })
      });
      
      const data = await response.json();
      if (data.result && data.result !== '0x') {
        const totalSupplyBigInt = BigInt(data.result);
        const formatted = (Number(totalSupplyBigInt) / 1e18).toFixed(2);
        console.log(`%c   ✅ VUSD totalSupply (RPC directo): ${formatted}`, 'color: #2ecc71; font-weight: bold;');
        
        return {
          totalSupply: formatted,
          decimals: 18
        };
      }
    } catch (rpcError) {
      console.error('[AutoConnectService] Direct RPC call failed:', rpcError);
    }
    
    // Method 3: Return cached value if available
    const cached = this.getCachedVUSDStats();
    if (cached && parseFloat(cached.totalSupply) > 0) {
      console.log(`%c   📦 VUSD totalSupply (cache): ${cached.totalSupply}`, 'color: #f39c12;');
      return cached;
    }
    
    console.error('[AutoConnectService] All VUSD fetch methods failed!');
    return { totalSupply: '0', decimals: 18 };
  }

  async fetchUSDStatistics(): Promise<USDStatistics | null> {
    if (!this.contracts.usdTokenized) return null;
    
    try {
      const stats = await this.contracts.usdTokenized.getStatistics();
      return {
        totalSupply: ethers.formatUnits(stats[0] || stats.totalSupply || 0, 18),
        totalInjected: ethers.formatUnits(stats[1] || stats.totalInjected || 0, 18),
        totalInLockReserve: ethers.formatUnits(stats[2] || stats.totalInLockReserve || 0, 18),
        totalConsumedForVUSD: ethers.formatUnits(stats[3] || stats.totalConsumedForVUSD || 0, 18),
        totalInjections: Number(stats[4] || stats.totalInjections || 0)
      };
    } catch (error) {
      console.warn('[AutoConnectService] getStatistics not available on USDTokenized:', error);
      // Fallback: calculate from injections
      const injections = this.explorerData.injections;
      const totalInjected = injections.reduce((sum, inj) => sum + parseFloat(inj.amount), 0);
      return {
        totalSupply: '0',
        totalInjected: totalInjected.toString(),
        totalInLockReserve: '0',
        totalConsumedForVUSD: '0',
        totalInjections: injections.length
      };
    }
  }

  async fetchLockReserveStatistics(): Promise<LockReserveStatistics | null> {
    if (!this.contracts.lockReserve) return null;
    
    try {
      const stats = await this.contracts.lockReserve.getStatistics();
      return {
        totalReserve: ethers.formatUnits(stats[0] || stats.totalReserve || 0, 18),
        totalConsumed: ethers.formatUnits(stats[1] || stats.totalConsumed || 0, 18),
        totalLocks: Number(stats[2] || stats.totalLocks || 0),
        totalConsumptions: Number(stats[3] || stats.totalConsumptions || 0),
        reserveRatio: Number(stats[4] || stats.reserveRatio || 0)
      };
    } catch (error) {
      console.warn('[AutoConnectService] getStatistics not available on LockReserve:', error);
      // Fallback: calculate from locks
      const locks = this.explorerData.locks;
      const totalReserve = locks.reduce((sum, lock) => sum + parseFloat(lock.usdAmount), 0);
      return {
        totalReserve: totalReserve.toString(),
        totalConsumed: '0',
        totalLocks: locks.length,
        totalConsumptions: 0,
        reserveRatio: 100
      };
    }
  }

  async fetchMinterStatistics(): Promise<VUSDMinterStatistics | null> {
    if (!this.contracts.vusdMinter) return null;
    
    try {
      const stats = await this.contracts.vusdMinter.getStatistics();
      return {
        totalBacked: ethers.formatUnits(stats[0] || stats.totalBacked || 0, 18),
        totalBackingOperations: Number(stats[1] || stats.totalBackingOperations || 0),
        totalCertificates: Number(stats[2] || stats.totalCertificates || 0),
        vusdTotalSupply: ethers.formatUnits(stats[3] || stats.vusdTotalSupply || 0, 18),
        globalBackingRatio: Number(stats[4] || stats.globalBackingRatio || 100)
      };
    } catch (error) {
      console.warn('[AutoConnectService] getStatistics not available on VUSDMinter:', error);
      const vusdStats = await this.fetchVUSDStats();
      return {
        totalBacked: vusdStats.totalSupply,
        totalBackingOperations: 0,
        totalCertificates: 0,
        vusdTotalSupply: vusdStats.totalSupply,
        globalBackingRatio: 100
      };
    }
  }

  async fetchNetworkStatistics(): Promise<NetworkStatistics | null> {
    if (!this.provider) return null;
    
    try {
      const [blockNumber, feeData] = await Promise.all([
        this.provider.getBlockNumber(),
        this.provider.getFeeData()
      ]);
      
      return {
        blockNumber,
        gasPrice: feeData.gasPrice ? ethers.formatUnits(feeData.gasPrice, 'gwei') : '0',
        timestamp: Date.now(),
        chainId: LEMONCHAIN_CONFIG.chainId
      };
    } catch (error) {
      console.error('[AutoConnectService] Error fetching network stats:', error);
      return null;
    }
  }

  async fetchVUSDBalance(address: string): Promise<string> {
    if (!this.contracts.vusd) return '0';
    
    try {
      const balance = await this.contracts.vusd.balanceOf(address);
      return ethers.formatUnits(balance, 18);
    } catch (error) {
      console.error('[AutoConnectService] Error fetching VUSD balance:', error);
      return '0';
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // CACHE MANAGEMENT
  // ═══════════════════════════════════════════════════════════════════════════

  private cacheAllData(
    injections: InjectionData[], 
    locks: LockData[], 
    vusdStats: any,
    usdStats: USDStatistics | null,
    lockReserveStats: LockReserveStatistics | null,
    minterStats: VUSDMinterStatistics | null,
    networkStats: NetworkStatistics | null
  ): void {
    try {
      localStorage.setItem(STORAGE_KEYS.INJECTIONS_CACHE, JSON.stringify(injections));
      localStorage.setItem(STORAGE_KEYS.LOCKS_CACHE, JSON.stringify(locks));
      localStorage.setItem(STORAGE_KEYS.VUSD_STATS, JSON.stringify(vusdStats));
      localStorage.setItem(STORAGE_KEYS.USD_STATS, JSON.stringify(usdStats));
      localStorage.setItem(STORAGE_KEYS.LOCK_RESERVE_STATS, JSON.stringify(lockReserveStats));
      localStorage.setItem(STORAGE_KEYS.MINTER_STATS, JSON.stringify(minterStats));
      localStorage.setItem(STORAGE_KEYS.NETWORK_STATS, JSON.stringify(networkStats));
      localStorage.setItem(STORAGE_KEYS.EXPLORER_DATA, JSON.stringify(this.explorerData));
    } catch (e) {
      console.error('[AutoConnectService] Error caching data:', e);
    }
  }

  private loadCachedEvents(): BlockchainEvent[] {
    try {
      const cached = localStorage.getItem(STORAGE_KEYS.BLOCKCHAIN_EVENTS);
      return cached ? JSON.parse(cached) : [];
    } catch (e) {
      return [];
    }
  }

  getCachedInjections(): InjectionData[] {
    try {
      const cached = localStorage.getItem(STORAGE_KEYS.INJECTIONS_CACHE);
      return cached ? JSON.parse(cached) : [];
    } catch (e) {
      return [];
    }
  }

  getCachedLocks(): LockData[] {
    try {
      const cached = localStorage.getItem(STORAGE_KEYS.LOCKS_CACHE);
      return cached ? JSON.parse(cached) : [];
    } catch (e) {
      return [];
    }
  }

  getCachedVUSDStats(): { totalSupply: string; decimals: number } {
    try {
      const cached = localStorage.getItem(STORAGE_KEYS.VUSD_STATS);
      return cached ? JSON.parse(cached) : { totalSupply: '0', decimals: 18 };
    } catch (e) {
      return { totalSupply: '0', decimals: 18 };
    }
  }

  getCachedExplorerData(): MintExplorerData | null {
    try {
      const cached = localStorage.getItem(STORAGE_KEYS.EXPLORER_DATA);
      if (!cached) return null;
      
      const data = JSON.parse(cached);
      
      // Also load cached transfers and transactions
      const vusdTransfers = localStorage.getItem(STORAGE_KEYS.VUSD_TRANSFERS);
      const allTransactions = localStorage.getItem(STORAGE_KEYS.ALL_TRANSACTIONS);
      
      if (vusdTransfers) {
        data.vusdTransfers = JSON.parse(vusdTransfers);
        data.totalVUSDTransfers = data.vusdTransfers.length;
      }
      
      if (allTransactions) {
        data.allTransactions = JSON.parse(allTransactions);
        data.totalTransactions = data.allTransactions.length;
      }
      
      return data;
    } catch (e) {
      return null;
    }
  }
  
  /**
   * Get all VUSD transfers scanned from blockchain
   */
  getVUSDTransfers(): VUSDTransfer[] {
    return this.explorerData.vusdTransfers || [];
  }
  
  /**
   * Get all protocol transactions
   */
  getAllTransactions(): ProtocolTransaction[] {
    return this.explorerData.allTransactions || [];
  }
  
  /**
   * Check if blockchain is fully synced
   */
  isFullySynced(): boolean {
    return this.explorerData.isFullySynced || false;
  }
  
  /**
   * Get sync progress
   */
  getSyncProgress(): { lastBlock: number; isScanning: boolean; isSynced: boolean } {
    return {
      lastBlock: this.explorerData.lastScannedBlock || 0,
      isScanning: this.isScanning,
      isSynced: this.hasCompletedInitialScan
    };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // LISTENERS
  // ═══════════════════════════════════════════════════════════════════════════

  onConnectionChange(callback: (state: ConnectionState) => void): () => void {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  onSyncComplete(callback: (events: BlockchainEvent[]) => void): () => void {
    this.syncListeners.add(callback);
    return () => this.syncListeners.delete(callback);
  }

  /**
   * Subscribe to explorer data updates - FOR MINT LEMON EXPLORER
   */
  onExplorerDataUpdate(callback: (data: MintExplorerData) => void): () => void {
    this.explorerListeners.add(callback);
    // Send current data immediately
    if (this.explorerData.lastUpdated) {
      callback(this.explorerData);
    }
    return () => this.explorerListeners.delete(callback);
  }

  private notifyConnectionListeners(): void {
    this.listeners.forEach(cb => cb(this.connectionState));
  }

  private notifySyncListeners(events: BlockchainEvent[]): void {
    this.syncListeners.forEach(cb => cb(events));
  }

  private notifyExplorerListeners(data: MintExplorerData): void {
    this.explorerListeners.forEach(cb => cb(data));
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // GETTERS
  // ═══════════════════════════════════════════════════════════════════════════

  getConnectionState(): ConnectionState {
    return { ...this.connectionState };
  }

  getSyncState(): SyncState {
    return { ...this.syncState };
  }

  /**
   * Get current explorer data - FOR MINT LEMON EXPLORER AND PLATFORM
   */
  getExplorerData(): MintExplorerData {
    return { ...this.explorerData };
  }

  /**
   * Get all injections with status labels
   */
  getInjections(): InjectionData[] {
    return this.explorerData.injections;
  }

  /**
   * Get all locks with status labels
   */
  getLocks(): LockData[] {
    return this.explorerData.locks;
  }

  /**
   * Get USD contract statistics
   */
  getUSDStatistics(): USDStatistics | null {
    return this.explorerData.usdStats;
  }

  /**
   * Get LockReserve statistics
   */
  getLockReserveStatistics(): LockReserveStatistics | null {
    return this.explorerData.lockReserveStats;
  }

  /**
   * Get VUSDMinter statistics
   */
  getMinterStatistics(): VUSDMinterStatistics | null {
    return this.explorerData.minterStats;
  }

  /**
   * Get network statistics
   */
  getNetworkStatistics(): NetworkStatistics | null {
    return this.explorerData.networkStats;
  }

  isConnected(): boolean {
    return this.connectionState.isConnected;
  }

  getProvider(): ethers.JsonRpcProvider | null {
    return this.provider;
  }

  getWalletAddress(): string | null {
    return this.connectionState.walletAddress;
  }

  /**
   * Force a manual sync from blockchain
   */
  async forceSync(): Promise<BlockchainEvent[]> {
    return this.syncFromBlockchain();
  }
  
  /**
   * Force a full scan of all protocol events (VUSD transfers + all contracts)
   */
  async forceScanAll(): Promise<void> {
    this.hasCompletedInitialScan = false;
    this.isScanning = false;
    console.log('%c🔄 [AutoConnectService] Forzando escaneo completo de todos los contratos V5...', 'color: #e74c3c; font-weight: bold;');
    await this.startFullBlockchainScan();
    this.notifyExplorerListeners(this.explorerData);
  }
  
  /**
   * Get total transaction count across all V5 contracts
   */
  getTotalTransactionCount(): number {
    return this.explorerData.totalTransactions || 0;
  }
  
  /**
   * Get dashboard statistics for Treasury Minting and DCB Treasury platforms
   * Returns all data needed to populate dashboards in real-time
   */
  getDashboardStats(): {
    // VUSD Stats
    totalVUSDMinted: number;
    totalVUSDSupply: string;
    vusdMints: number;
    
    // Lock Stats
    totalLocks: number;
    activeLocks: number;
    totalUSDLocked: number;
    
    // Injection Stats
    totalInjections: number;
    pendingInjections: number;
    approvedInjections: number;
    completedInjections: number;
    
    // Transaction Stats
    totalTransactions: number;
    recentTransactions: ProtocolTransaction[];
    
    // Network Stats
    blockHeight: number;
    tps: number;
    gasPrice: string;
    
    // Status
    isConnected: boolean;
    lastUpdated: string;
  } {
    const vusdTransfers = this.explorerData.vusdTransfers || [];
    const mints = vusdTransfers.filter(t => t.type === 'mint');
    const totalMinted = mints.reduce((sum, t) => sum + parseFloat(t.amount || '0'), 0);
    
    const locks = this.explorerData.locks || [];
    const activeLocks = locks.filter(l => l.status === 1).length;
    const totalLocked = locks.reduce((sum, l) => sum + parseFloat(l.usdAmount || '0'), 0);
    
    const injections = this.explorerData.injections || [];
    const pendingInjections = injections.filter(i => i.status === 0).length;
    const approvedInjections = injections.filter(i => i.status === 1 || i.status === 2).length;
    const completedInjections = injections.filter(i => i.status === 3).length;
    
    return {
      // VUSD Stats
      totalVUSDMinted: totalMinted,
      totalVUSDSupply: this.explorerData.totalVUSDMinted || '0',
      vusdMints: mints.length,
      
      // Lock Stats
      totalLocks: locks.length,
      activeLocks,
      totalUSDLocked: totalLocked,
      
      // Injection Stats
      totalInjections: injections.length,
      pendingInjections,
      approvedInjections,
      completedInjections,
      
      // Transaction Stats
      totalTransactions: this.explorerData.totalTransactions || 0,
      recentTransactions: (this.explorerData.allTransactions || []).slice(0, 20),
      
      // Network Stats
      blockHeight: this.explorerData.networkStats?.blockNumber || 0,
      tps: Math.round(parseFloat(this.explorerData.networkStats?.gasPrice || '0') / 3) || 0,
      gasPrice: this.explorerData.networkStats?.gasPrice || '0',
      
      // Status
      isConnected: this.connectionState.isConnected,
      lastUpdated: this.explorerData.lastUpdated || new Date().toISOString()
    };
  }
  
  /**
   * Fetch real-time dashboard data directly from RPC (fast, lightweight)
   */
  async fetchDashboardDataDirect(): Promise<{
    vusdTotal: number;
    vusdMints: number;
    blockHeight: number;
    totalEvents: number;
    recentMints: Array<{txHash: string; amount: string; to: string; blockNumber: number}>;
  }> {
    const RPC_URL = LEMONCHAIN_CONFIG.rpcUrl;
    const VUSD_CONTRACT = CONTRACT_ADDRESSES_V5.VUSD;
    const TRANSFER_TOPIC = '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef';
    const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000000000000000000000000000';
    
    try {
      // Parallel fetch for speed
      const [supplyRes, blockRes, eventsRes] = await Promise.all([
        // VUSD Total Supply
        fetch(RPC_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            jsonrpc: '2.0',
            method: 'eth_call',
            params: [{ to: VUSD_CONTRACT, data: '0x18160ddd' }, 'latest'],
            id: 1
          })
        }),
        // Block Height
        fetch(RPC_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ jsonrpc: '2.0', method: 'eth_blockNumber', params: [], id: 2 })
        }),
        // VUSD Events
        fetch(RPC_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            jsonrpc: '2.0',
            method: 'eth_getLogs',
            params: [{ fromBlock: '0x0', toBlock: 'latest', address: VUSD_CONTRACT }],
            id: 3
          })
        })
      ]);
      
      const [supplyData, blockData, eventsData] = await Promise.all([
        supplyRes.json(),
        blockRes.json(),
        eventsRes.json()
      ]);
      
      // Parse VUSD Total
      let vusdTotal = 0;
      if (supplyData.result && supplyData.result !== '0x') {
        vusdTotal = Number(BigInt(supplyData.result)) / 1e18;
      }
      
      // Parse Block Height
      const blockHeight = parseInt(blockData.result, 16) || 0;
      
      // Parse Events
      let totalEvents = 0;
      let vusdMints = 0;
      const recentMints: Array<{txHash: string; amount: string; to: string; blockNumber: number}> = [];
      
      if (eventsData.result && Array.isArray(eventsData.result)) {
        totalEvents = eventsData.result.length;
        
        // Filter Transfer events and find mints (from zero address)
        const transfers = eventsData.result.filter((log: any) => log.topics?.[0] === TRANSFER_TOPIC);
        const mints = transfers.filter((log: any) => log.topics?.[1] === ZERO_ADDRESS);
        vusdMints = mints.length;
        
        // Get recent mints (last 10)
        mints.slice(-10).reverse().forEach((log: any) => {
          const to = '0x' + (log.topics?.[2]?.slice(26) || '');
          let amount = '0';
          if (log.data && log.data !== '0x') {
            try {
              amount = (Number(BigInt(log.data)) / 1e18).toFixed(2);
            } catch (e) {}
          }
          recentMints.push({
            txHash: log.transactionHash,
            amount,
            to,
            blockNumber: parseInt(log.blockNumber, 16)
          });
        });
      }
      
      return { vusdTotal, vusdMints, blockHeight, totalEvents, recentMints };
      
    } catch (error) {
      console.error('[AutoConnectService] fetchDashboardDataDirect error:', error);
      return { vusdTotal: 0, vusdMints: 0, blockHeight: 0, totalEvents: 0, recentMints: [] };
    }
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// SINGLETON EXPORT
// ═══════════════════════════════════════════════════════════════════════════════

export const autoConnectService = new AutoConnectService();
export default autoConnectService;
