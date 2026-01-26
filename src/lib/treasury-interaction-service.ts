// ═══════════════════════════════════════════════════════════════════════════════════════════════════
// TREASURY INTERACTION SERVICE - Full Flow Management
// DCB Treasury ↔ Treasury Minting Platform Bidirectional Communication
// Version: 5.0.0 - LemonChain Integration
// ═══════════════════════════════════════════════════════════════════════════════════════════════════

import { CONTRACT_ADDRESSES, LEMONCHAIN_CONFIG } from './blockchain/contracts';

// ═══════════════════════════════════════════════════════════════════════════════════════════════════
// TYPES & INTERFACES
// ═══════════════════════════════════════════════════════════════════════════════════════════════════

export interface USDInjection {
  id: string;
  injectionId: string;
  timestamp: string;
  
  // Source Account (Custody Account selected)
  sourceAccount: {
    id: string;
    name: string;
    type: 'custody' | 'banking' | 'blockchain';
    currency: string;
    balance: number;
  };
  
  // Amount Details
  amount: number;
  currency: string;
  
  // ISO 20022 Data from JSON/XML
  isoData: {
    messageType: string;        // pacs.008, pacs.009, etc.
    messageId: string;
    endToEndId: string;
    instructionId: string;
    senderBIC: string;
    receiverBIC: string;
    senderIBAN: string;
    receiverIBAN: string;
    remittanceInfo: string;
    xmlHash: string;
    jsonPayload?: any;
  };
  
  // Beneficiary
  beneficiary: {
    address: string;
    name?: string;
  };
  
  // Blockchain Data
  blockchain: {
    txHash?: string;
    blockNumber?: number;
    contractAddress: string;
    chainId: number;
    network: string;
  };
  
  // Status
  status: 'pending' | 'tokenized' | 'locked' | 'consumed' | 'minted' | 'cancelled';
  
  // Signatures
  firstSignature?: {
    hash: string;
    signer: string;
    timestamp: string;
    txHash?: string;
  };
}

export interface PendingLock {
  id: string;
  lockId: string;
  timestamp: string;
  
  // From Injection
  injectionId: string;
  
  // Amount
  originalAmount: number;
  availableAmount: number;
  lockedAmount: number;
  currency: string;
  
  // Beneficiary
  beneficiary: string;
  
  // Bank Info
  bank: {
    id: string;
    name: string;
    signer: string;
  };
  
  // ISO Data
  isoData?: {
    messageId: string;
    uetr?: string;
  };
  
  // Authorization
  authorizationCode: string;
  
  // Signatures
  firstSignature: {
    hash: string;
    signer: string;
    timestamp: string;
    txHash?: string;
  };
  
  secondSignature?: {
    hash: string;
    signer: string;
    timestamp: string;
    txHash?: string;
  };
  
  // Status
  status: 'pending' | 'accepted' | 'rejected' | 'partially_used' | 'fully_consumed';
  
  // Source info for DCB notification
  sourceInfo: {
    accountId: string;
    accountName: string;
    platform: 'dcb_treasury';
  };
}

export interface LockReserve {
  id: string;
  reserveId: string;
  lockId: string;
  timestamp: string;
  
  // Amount
  amount: number;
  currency: string;
  
  // Beneficiary
  beneficiary: string;
  
  // Authorization
  authorizationCode: string;
  
  // Signatures
  firstSignature: string;
  secondSignature: string;
  
  // Status
  status: 'reserved' | 'partially_consumed' | 'fully_consumed';
  
  // Consumption tracking
  consumedAmount: number;
  remainingAmount: number;
  
  // Blockchain
  blockchain?: {
    txHash: string;
    blockNumber: number;
  };
}

export interface MintWithCodeRequest {
  id: string;
  timestamp: string;
  
  // Code
  authorizationCode: string;
  lockReserveId?: string;
  lockId: string;
  
  // Amount
  amountUSD: number;
  
  // Beneficiary
  beneficiary: string;
  
  // Bank
  bankName: string;
  
  // Auto-complete Hash (from Lock)
  lockHash: string;
  
  // Signatures
  firstSignature: string;
  secondSignature: string;
  thirdSignature?: string;
  
  // Status
  status: 'pending_hash' | 'ready_to_mint' | 'minting' | 'completed' | 'cancelled';
  
  // Minting Result
  mintResult?: {
    txHash: string;
    blockNumber: number;
    vusdAmount: string;
    publicationCode: string;
    timestamp: string;
  };
}

export interface MintExplorerPublication {
  id: string;
  publicationCode: string;
  timestamp: string;
  
  // Type
  type: 'USD_INJECTION' | 'LOCK_CREATED' | 'LOCK_ACCEPTED' | 'LOCK_RESERVE' | 'VUSD_MINTED';
  
  // Amounts
  amount: string;
  currency: string;
  
  // References
  injectionId?: string;
  lockId?: string;
  lockReserveId?: string;
  mintId?: string;
  
  // Signatures (all 3)
  signatures: {
    first: { hash: string; signer: string; timestamp: string; };
    second?: { hash: string; signer: string; timestamp: string; };
    third?: { hash: string; signer: string; timestamp: string; };
  };
  
  // Blockchain
  blockchain: {
    network: string;
    chainId: number;
    txHash: string;
    blockNumber: number;
    contractAddress: string;
  };
  
  // Actors
  actors: {
    injector?: string;
    locker?: string;
    minter?: string;
    beneficiary: string;
  };
  
  // Bank
  bank: {
    id: string;
    name: string;
  };
  
  // Status
  status: 'published' | 'verified';
}

export interface TreasuryStatistics {
  // DCB Treasury Stats
  dcb: {
    totalInjected: number;
    totalTokenized: number;
    pendingLocks: number;
    activeLocks: number;
    totalMinted: number;
  };
  
  // Treasury Minting Stats
  minting: {
    pendingLocks: number;
    acceptedLocks: number;
    lockReserves: number;
    mintWithCodeQueue: number;
    totalMinted: number;
    totalVolume: number;
  };
  
  // Combined
  combined: {
    totalUSDLocked: number;
    totalVUSDMinted: number;
    totalTransactions: number;
  };
}

// ═══════════════════════════════════════════════════════════════════════════════════════════════════
// STORAGE KEYS
// ═══════════════════════════════════════════════════════════════════════════════════════════════════

const STORAGE_KEYS = {
  USD_INJECTIONS: 'treasury_usd_injections',
  PENDING_LOCKS: 'treasury_pending_locks',
  LOCK_RESERVES: 'treasury_lock_reserves',
  MINT_WITH_CODE_QUEUE: 'treasury_mint_with_code_queue',
  MINT_EXPLORER: 'treasury_mint_explorer',
  STATISTICS: 'treasury_statistics',
  NOTIFICATIONS: 'treasury_notifications',
  SYNC_STATE: 'treasury_sync_state'
};

// ═══════════════════════════════════════════════════════════════════════════════════════════════════
// HELPER FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════════════════════════════

function generateId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 8)}`.toUpperCase();
}

function generateInjectionId(): string {
  return `INJ-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`.toUpperCase();
}

function generateLockId(): string {
  return `LOCK-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`.toUpperCase();
}

function generateReserveId(): string {
  return `RSV-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`.toUpperCase();
}

function generateAuthorizationCode(): string {
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `AUTH-${timestamp}-${random}`;
}

function generatePublicationCode(): string {
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).substring(2, 8).toUpperCase();
  return `PUB-${timestamp}-${random}`;
}

function generateSignatureHash(data: string, prefix: string): string {
  // Simplified hash generation - in production use proper crypto
  const combined = `${prefix}_${data}_${Date.now()}`;
  let hash = 0;
  for (let i = 0; i < combined.length; i++) {
    const char = combined.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return '0x' + Math.abs(hash).toString(16).padStart(64, '0');
}

function safeParseJSON<T>(key: string, defaultValue: T): T {
  try {
    const stored = localStorage.getItem(key);
    if (stored) {
      return JSON.parse(stored) as T;
    }
  } catch (error) {
    console.error(`[Treasury] Error parsing ${key}:`, error);
  }
  return defaultValue;
}

function safeStoreJSON(key: string, value: any): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (error) {
    console.error(`[Treasury] Error storing ${key}:`, error);
  }
}

// ═══════════════════════════════════════════════════════════════════════════════════════════════════
// TREASURY INTERACTION SERVICE CLASS
// ═══════════════════════════════════════════════════════════════════════════════════════════════════

class TreasuryInteractionService {
  private usdInjections: USDInjection[] = [];
  private pendingLocks: PendingLock[] = [];
  private lockReserves: LockReserve[] = [];
  private mintWithCodeQueue: MintWithCodeRequest[] = [];
  private mintExplorer: MintExplorerPublication[] = [];
  private statistics: TreasuryStatistics;
  private listeners: Map<string, Function[]> = new Map();

  constructor() {
    this.loadFromStorage();
    this.statistics = this.calculateStatistics();
  }

  // ═══════════════════════════════════════════════════════════════════════════════════════════════
  // STORAGE MANAGEMENT
  // ═══════════════════════════════════════════════════════════════════════════════════════════════

  private loadFromStorage(): void {
    this.usdInjections = safeParseJSON(STORAGE_KEYS.USD_INJECTIONS, []);
    this.pendingLocks = safeParseJSON(STORAGE_KEYS.PENDING_LOCKS, []);
    this.lockReserves = safeParseJSON(STORAGE_KEYS.LOCK_RESERVES, []);
    this.mintWithCodeQueue = safeParseJSON(STORAGE_KEYS.MINT_WITH_CODE_QUEUE, []);
    this.mintExplorer = safeParseJSON(STORAGE_KEYS.MINT_EXPLORER, []);
  }

  private saveToStorage(): void {
    safeStoreJSON(STORAGE_KEYS.USD_INJECTIONS, this.usdInjections);
    safeStoreJSON(STORAGE_KEYS.PENDING_LOCKS, this.pendingLocks);
    safeStoreJSON(STORAGE_KEYS.LOCK_RESERVES, this.lockReserves);
    safeStoreJSON(STORAGE_KEYS.MINT_WITH_CODE_QUEUE, this.mintWithCodeQueue);
    safeStoreJSON(STORAGE_KEYS.MINT_EXPLORER, this.mintExplorer);
    safeStoreJSON(STORAGE_KEYS.STATISTICS, this.statistics);
  }

  // ═══════════════════════════════════════════════════════════════════════════════════════════════
  // EVENT SYSTEM
  // ═══════════════════════════════════════════════════════════════════════════════════════════════

  public on(event: string, callback: Function): void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event)!.push(callback);
  }

  public off(event: string, callback: Function): void {
    const callbacks = this.listeners.get(event);
    if (callbacks) {
      const index = callbacks.indexOf(callback);
      if (index > -1) {
        callbacks.splice(index, 1);
      }
    }
  }

  private emit(event: string, data: any): void {
    const callbacks = this.listeners.get(event);
    if (callbacks) {
      callbacks.forEach(callback => callback(data));
    }
    // Also emit to 'all' listeners
    const allCallbacks = this.listeners.get('all');
    if (allCallbacks) {
      allCallbacks.forEach(callback => callback({ event, data }));
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════════════════════════
  // STEP 1: USD INJECTION (DCB Treasury - Custody Account → USDTokenized)
  // ═══════════════════════════════════════════════════════════════════════════════════════════════

  public async injectUSD(params: {
    sourceAccount: {
      id: string;
      name: string;
      type: 'custody' | 'banking' | 'blockchain';
      currency: string;
      balance: number;
    };
    amount: number;
    beneficiary: string;
    isoData: {
      messageType: string;
      messageId: string;
      endToEndId: string;
      instructionId: string;
      senderBIC: string;
      receiverBIC: string;
      senderIBAN: string;
      receiverIBAN: string;
      remittanceInfo: string;
      xmlContent?: string;
      jsonPayload?: any;
    };
  }): Promise<{ success: boolean; injection?: USDInjection; error?: string }> {
    
    try {
      const injectionId = generateInjectionId();
      const timestamp = new Date().toISOString();
      
      // Generate XML hash
      const xmlHash = generateSignatureHash(
        params.isoData.xmlContent || JSON.stringify(params.isoData.jsonPayload) || params.isoData.messageId,
        'XML_HASH'
      );
      
      // Generate first signature (DCB/DAES signature)
      const firstSignatureHash = generateSignatureHash(
        `${injectionId}_${params.amount}_${params.beneficiary}_${timestamp}`,
        'DCB_TREASURY_DAES_FIRST_SIGNATURE_v5'
      );
      
      // Simulate blockchain transaction
      const txHash = '0x' + Math.random().toString(16).substring(2).padStart(64, '0');
      const blockNumber = Math.floor(Math.random() * 1000000) + 1400000;
      
      const injection: USDInjection = {
        id: generateId(),
        injectionId,
        timestamp,
        sourceAccount: params.sourceAccount,
        amount: params.amount,
        currency: 'USD',
        isoData: {
          ...params.isoData,
          xmlHash
        },
        beneficiary: {
          address: params.beneficiary,
        },
        blockchain: {
          txHash,
          blockNumber,
          contractAddress: CONTRACT_ADDRESSES.USDTokenized || CONTRACT_ADDRESSES.LocksTreasuryVUSD,
          chainId: LEMONCHAIN_CONFIG.chainId,
          network: LEMONCHAIN_CONFIG.name
        },
        status: 'tokenized',
        firstSignature: {
          hash: firstSignatureHash,
          signer: '0x772923E3f1C22A1b5Cb11722bD7B0E77BEDE8559',
          timestamp,
          txHash
        }
      };
      
      this.usdInjections.push(injection);
      this.saveToStorage();
      this.emit('usd_injected', injection);
      
      console.log('✅ [Treasury] USD Injected:', injectionId, 'Amount:', params.amount);
      
      // Automatically create pending lock for Treasury Minting
      await this.createPendingLockFromInjection(injection);
      
      return { success: true, injection };
      
    } catch (error: any) {
      console.error('❌ [Treasury] USD Injection failed:', error);
      return { success: false, error: error.message };
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════════════════════════
  // STEP 2: CREATE PENDING LOCK (Automatic after USD Injection)
  // ═══════════════════════════════════════════════════════════════════════════════════════════════

  private async createPendingLockFromInjection(injection: USDInjection): Promise<PendingLock> {
    const lockId = generateLockId();
    const authorizationCode = generateAuthorizationCode();
    const timestamp = new Date().toISOString();
    
    const pendingLock: PendingLock = {
      id: generateId(),
      lockId,
      timestamp,
      injectionId: injection.injectionId,
      originalAmount: injection.amount,
      availableAmount: injection.amount,
      lockedAmount: 0,
      currency: injection.currency,
      beneficiary: injection.beneficiary.address,
      bank: {
        id: 'DCB-001',
        name: 'Digital Commercial Bank Ltd.',
        signer: '0x772923E3f1C22A1b5Cb11722bD7B0E77BEDE8559'
      },
      isoData: {
        messageId: injection.isoData.messageId,
        uetr: injection.isoData.endToEndId
      },
      authorizationCode,
      firstSignature: injection.firstSignature!,
      status: 'pending',
      sourceInfo: {
        accountId: injection.sourceAccount.id,
        accountName: injection.sourceAccount.name,
        platform: 'dcb_treasury'
      }
    };
    
    this.pendingLocks.push(pendingLock);
    this.saveToStorage();
    
    // Also save to LEMX format for Treasury Minting to pick up
    this.syncToLEMXFormat(pendingLock);
    
    this.emit('pending_lock_created', pendingLock);
    console.log('📤 [Treasury] Pending Lock created and sent to Treasury Minting:', lockId);
    
    return pendingLock;
  }

  // Sync to LEMX localStorage format
  private syncToLEMXFormat(lock: PendingLock): void {
    const lemxLock = {
      id: lock.id,
      lockId: lock.lockId,
      authorizationCode: lock.authorizationCode,
      timestamp: lock.timestamp,
      lockDetails: {
        amount: lock.originalAmount.toString(),
        currency: lock.currency,
        beneficiary: lock.beneficiary,
        custodyVault: CONTRACT_ADDRESSES.CustodyVault,
        expiry: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
      },
      bankInfo: {
        bankId: lock.bank.id,
        bankName: lock.bank.name,
        signerAddress: lock.bank.signer
      },
      sourceOfFunds: {
        accountId: lock.sourceInfo.accountId,
        accountName: lock.sourceInfo.accountName,
        accountType: 'custody',
        originalBalance: lock.originalAmount.toString()
      },
      signatures: [{
        role: 'DAES_FIRST_SIGNATURE',
        address: lock.firstSignature.signer,
        hash: lock.firstSignature.hash,
        timestamp: lock.firstSignature.timestamp
      }],
      blockchain: {
        txHash: lock.firstSignature.txHash,
        chainId: LEMONCHAIN_CONFIG.chainId,
        network: LEMONCHAIN_CONFIG.name
      },
      isoData: lock.isoData
    };
    
    // Save to LEMX pending locks
    const existingLocks = safeParseJSON<any[]>('lemx_pending_locks', []);
    if (!existingLocks.find((l: any) => l.lockId === lock.lockId)) {
      existingLocks.push(lemxLock);
      safeStoreJSON('lemx_pending_locks', existingLocks);
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════════════════════════
  // STEP 3: ACCEPT LOCK (Treasury Minting accepts the lock)
  // ═══════════════════════════════════════════════════════════════════════════════════════════════

  public async acceptLock(params: {
    lockId: string;
    acceptedAmount: number;  // Amount to lock (can be partial)
    operator: string;
  }): Promise<{ success: boolean; lock?: PendingLock; lockReserve?: LockReserve; mintWithCode?: MintWithCodeRequest; error?: string }> {
    
    try {
      const lockIndex = this.pendingLocks.findIndex(l => l.lockId === params.lockId);
      if (lockIndex === -1) {
        return { success: false, error: 'Lock not found' };
      }
      
      const lock = this.pendingLocks[lockIndex];
      const timestamp = new Date().toISOString();
      
      // Generate second signature (Treasury Minting acceptance)
      const secondSignatureHash = generateSignatureHash(
        `${lock.lockId}_${params.acceptedAmount}_${params.operator}_${timestamp}`,
        'TREASURY_MINTING_SECOND_SIGNATURE_v5'
      );
      
      // Simulate transaction
      const txHash = '0x' + Math.random().toString(16).substring(2).padStart(64, '0');
      
      // Update lock with second signature
      lock.secondSignature = {
        hash: secondSignatureHash,
        signer: params.operator,
        timestamp,
        txHash
      };
      lock.status = 'accepted';
      
      // Calculate amounts
      const lockReserveAmount = params.acceptedAmount;
      const remainingForMint = lock.originalAmount - params.acceptedAmount;
      
      lock.lockedAmount = lockReserveAmount;
      lock.availableAmount = remainingForMint;
      
      // Create Lock Reserve
      const lockReserve = await this.createLockReserve({
        lockId: lock.lockId,
        amount: lockReserveAmount,
        beneficiary: lock.beneficiary,
        authorizationCode: lock.authorizationCode,
        firstSignature: lock.firstSignature.hash,
        secondSignature: secondSignatureHash
      });
      
      let mintWithCode: MintWithCodeRequest | undefined;
      
      // If there's remaining amount, create Mint With Code request
      if (remainingForMint > 0) {
        mintWithCode = await this.createMintWithCodeRequest({
          lockId: lock.lockId,
          lockReserveId: lockReserve.reserveId,
          amount: remainingForMint,
          beneficiary: lock.beneficiary,
          bankName: lock.bank.name,
          authorizationCode: lock.authorizationCode,
          firstSignature: lock.firstSignature.hash,
          secondSignature: secondSignatureHash,
          lockHash: txHash
        });
      }
      
      this.saveToStorage();
      
      // Notify DCB Treasury about lock acceptance
      this.notifyDCBTreasury('lock_accepted', {
        lockId: lock.lockId,
        acceptedAmount: params.acceptedAmount,
        lockReserveId: lockReserve.reserveId,
        secondSignature: secondSignatureHash,
        timestamp
      });
      
      this.emit('lock_accepted', { lock, lockReserve, mintWithCode });
      console.log('✅ [Treasury] Lock accepted:', lock.lockId, 'Reserve:', lockReserveAmount, 'For Mint:', remainingForMint);
      
      return { success: true, lock, lockReserve, mintWithCode };
      
    } catch (error: any) {
      console.error('❌ [Treasury] Accept lock failed:', error);
      return { success: false, error: error.message };
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════════════════════════
  // STEP 4: CREATE LOCK RESERVE
  // ═══════════════════════════════════════════════════════════════════════════════════════════════

  private async createLockReserve(params: {
    lockId: string;
    amount: number;
    beneficiary: string;
    authorizationCode: string;
    firstSignature: string;
    secondSignature: string;
  }): Promise<LockReserve> {
    const reserveId = generateReserveId();
    const timestamp = new Date().toISOString();
    
    // Simulate transaction
    const txHash = '0x' + Math.random().toString(16).substring(2).padStart(64, '0');
    const blockNumber = Math.floor(Math.random() * 1000000) + 1400000;
    
    const lockReserve: LockReserve = {
      id: generateId(),
      reserveId,
      lockId: params.lockId,
      timestamp,
      amount: params.amount,
      currency: 'USD',
      beneficiary: params.beneficiary,
      authorizationCode: params.authorizationCode,
      firstSignature: params.firstSignature,
      secondSignature: params.secondSignature,
      status: 'reserved',
      consumedAmount: 0,
      remainingAmount: params.amount,
      blockchain: {
        txHash,
        blockNumber
      }
    };
    
    this.lockReserves.push(lockReserve);
    this.saveToStorage();
    
    // Publish to Mint Explorer
    await this.publishToMintExplorer({
      type: 'LOCK_RESERVE',
      amount: params.amount.toString(),
      lockId: params.lockId,
      lockReserveId: reserveId,
      signatures: {
        first: { hash: params.firstSignature, signer: '0x772923E3f1C22A1b5Cb11722bD7B0E77BEDE8559', timestamp },
        second: { hash: params.secondSignature, signer: CONTRACT_ADDRESSES.VUSDMinting, timestamp }
      },
      beneficiary: params.beneficiary,
      txHash,
      blockNumber
    });
    
    this.emit('lock_reserve_created', lockReserve);
    console.log('🔒 [Treasury] Lock Reserve created:', reserveId, 'Amount:', params.amount);
    
    return lockReserve;
  }

  // ═══════════════════════════════════════════════════════════════════════════════════════════════
  // STEP 5: CREATE MINT WITH CODE REQUEST
  // ═══════════════════════════════════════════════════════════════════════════════════════════════

  private async createMintWithCodeRequest(params: {
    lockId: string;
    lockReserveId?: string;
    amount: number;
    beneficiary: string;
    bankName: string;
    authorizationCode: string;
    firstSignature: string;
    secondSignature: string;
    lockHash: string;
  }): Promise<MintWithCodeRequest> {
    const timestamp = new Date().toISOString();
    
    const mintRequest: MintWithCodeRequest = {
      id: generateId(),
      timestamp,
      authorizationCode: params.authorizationCode,
      lockReserveId: params.lockReserveId,
      lockId: params.lockId,
      amountUSD: params.amount,
      beneficiary: params.beneficiary,
      bankName: params.bankName,
      lockHash: params.lockHash, // Auto-completed from lock
      firstSignature: params.firstSignature,
      secondSignature: params.secondSignature,
      status: 'ready_to_mint'  // Ready because hash is auto-completed
    };
    
    this.mintWithCodeQueue.push(mintRequest);
    this.saveToStorage();
    
    // Also save to LEMX format
    this.syncMintWithCodeToLEMX(mintRequest);
    
    this.emit('mint_with_code_created', mintRequest);
    console.log('📝 [Treasury] Mint With Code request created:', params.authorizationCode, 'Amount:', params.amount);
    
    return mintRequest;
  }

  private syncMintWithCodeToLEMX(request: MintWithCodeRequest): void {
    const lemxRequest = {
      id: request.id,
      authorizationCode: request.authorizationCode,
      amountUSD: request.amountUSD.toString(),
      lockId: request.lockId,
      bankName: request.bankName,
      beneficiary: request.beneficiary,
      createdAt: request.timestamp,
      status: request.status,
      originalLockAmount: request.amountUSD.toString(),
      remainingLockAmount: '0',
      blockchain: {
        injectionId: request.lockId,
        firstSignature: request.firstSignature,
        secondSignature: request.secondSignature,
        lockReserveId: request.lockReserveId,
        lockTxHash: request.lockHash
      }
    };
    
    const existingQueue = safeParseJSON<any[]>('lemx_mint_with_code_queue', []);
    if (!existingQueue.find((r: any) => r.authorizationCode === request.authorizationCode)) {
      existingQueue.push(lemxRequest);
      safeStoreJSON('lemx_mint_with_code_queue', existingQueue);
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════════════════════════
  // STEP 6: EXECUTE MINT (Convert USD to VUSD)
  // ═══════════════════════════════════════════════════════════════════════════════════════════════

  public async executeMint(params: {
    authorizationCode: string;
    minterWallet: string;
  }): Promise<{ success: boolean; result?: any; error?: string }> {
    
    try {
      const requestIndex = this.mintWithCodeQueue.findIndex(
        r => r.authorizationCode === params.authorizationCode && r.status === 'ready_to_mint'
      );
      
      if (requestIndex === -1) {
        return { success: false, error: 'Mint request not found or not ready' };
      }
      
      const request = this.mintWithCodeQueue[requestIndex];
      const timestamp = new Date().toISOString();
      
      // Generate third signature (Minting signature)
      const thirdSignatureHash = generateSignatureHash(
        `${request.authorizationCode}_${request.amountUSD}_${params.minterWallet}_${timestamp}`,
        'VUSD_MINTING_THIRD_SIGNATURE_BACKED_v5'
      );
      
      // Simulate minting transaction
      const txHash = '0x' + Math.random().toString(16).substring(2).padStart(64, '0');
      const blockNumber = Math.floor(Math.random() * 1000000) + 1400000;
      const publicationCode = generatePublicationCode();
      
      // Update request
      request.thirdSignature = thirdSignatureHash;
      request.status = 'completed';
      request.mintResult = {
        txHash,
        blockNumber,
        vusdAmount: request.amountUSD.toString(),
        publicationCode,
        timestamp
      };
      
      // Update lock reserve if exists
      if (request.lockReserveId) {
        const reserveIndex = this.lockReserves.findIndex(r => r.reserveId === request.lockReserveId);
        if (reserveIndex !== -1) {
          this.lockReserves[reserveIndex].consumedAmount += request.amountUSD;
          this.lockReserves[reserveIndex].remainingAmount -= request.amountUSD;
          if (this.lockReserves[reserveIndex].remainingAmount <= 0) {
            this.lockReserves[reserveIndex].status = 'fully_consumed';
          } else {
            this.lockReserves[reserveIndex].status = 'partially_consumed';
          }
        }
      }
      
      this.saveToStorage();
      
      // Publish to Mint Explorer
      await this.publishToMintExplorer({
        type: 'VUSD_MINTED',
        amount: request.amountUSD.toString(),
        lockId: request.lockId,
        lockReserveId: request.lockReserveId,
        mintId: request.id,
        signatures: {
          first: { hash: request.firstSignature, signer: '0x772923E3f1C22A1b5Cb11722bD7B0E77BEDE8559', timestamp },
          second: { hash: request.secondSignature, signer: CONTRACT_ADDRESSES.VUSDMinting, timestamp },
          third: { hash: thirdSignatureHash, signer: params.minterWallet, timestamp }
        },
        beneficiary: request.beneficiary,
        txHash,
        blockNumber,
        publicationCode
      });
      
      // Notify DCB Treasury about minting
      this.notifyDCBTreasury('vusd_minted', {
        authorizationCode: request.authorizationCode,
        lockId: request.lockId,
        amount: request.amountUSD,
        vusdAmount: request.amountUSD,
        txHash,
        blockNumber,
        publicationCode,
        thirdSignature: thirdSignatureHash,
        minter: params.minterWallet,
        timestamp
      });
      
      // Update statistics
      this.updateStatistics();
      
      this.emit('mint_completed', { request, result: request.mintResult });
      console.log('🎉 [Treasury] VUSD Minted:', publicationCode, 'Amount:', request.amountUSD, 'VUSD');
      
      return { 
        success: true, 
        result: {
          ...request.mintResult,
          authorizationCode: request.authorizationCode,
          thirdSignature: thirdSignatureHash
        }
      };
      
    } catch (error: any) {
      console.error('❌ [Treasury] Mint execution failed:', error);
      return { success: false, error: error.message };
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════════════════════════
  // MINT EXPLORER PUBLICATION
  // ═══════════════════════════════════════════════════════════════════════════════════════════════

  private async publishToMintExplorer(params: {
    type: MintExplorerPublication['type'];
    amount: string;
    lockId?: string;
    lockReserveId?: string;
    mintId?: string;
    injectionId?: string;
    signatures: MintExplorerPublication['signatures'];
    beneficiary: string;
    txHash: string;
    blockNumber: number;
    publicationCode?: string;
  }): Promise<MintExplorerPublication> {
    const publication: MintExplorerPublication = {
      id: generateId(),
      publicationCode: params.publicationCode || generatePublicationCode(),
      timestamp: new Date().toISOString(),
      type: params.type,
      amount: params.amount,
      currency: params.type === 'VUSD_MINTED' ? 'VUSD' : 'USD',
      injectionId: params.injectionId,
      lockId: params.lockId,
      lockReserveId: params.lockReserveId,
      mintId: params.mintId,
      signatures: params.signatures,
      blockchain: {
        network: LEMONCHAIN_CONFIG.name,
        chainId: LEMONCHAIN_CONFIG.chainId,
        txHash: params.txHash,
        blockNumber: params.blockNumber,
        contractAddress: CONTRACT_ADDRESSES.VUSD
      },
      actors: {
        beneficiary: params.beneficiary
      },
      bank: {
        id: 'DCB-001',
        name: 'Digital Commercial Bank Ltd.'
      },
      status: 'published'
    };
    
    this.mintExplorer.push(publication);
    this.saveToStorage();
    
    // Also sync to LEMX mint explorer format
    this.syncToLEMXMintExplorer(publication);
    
    this.emit('publication_created', publication);
    console.log('📢 [Treasury] Published to Mint Explorer:', publication.publicationCode);
    
    return publication;
  }

  private syncToLEMXMintExplorer(publication: MintExplorerPublication): void {
    const lemxEntry = {
      id: publication.id,
      type: publication.type,
      timestamp: publication.timestamp,
      lockId: publication.lockId || '',
      authorizationCode: publication.publicationCode,
      publicationCode: publication.publicationCode,
      amount: publication.amount,
      description: `${publication.type.replace(/_/g, ' ')} - ${publication.amount} ${publication.currency}`,
      actor: publication.bank.name,
      status: publication.type === 'VUSD_MINTED' ? 'completed' : 
              publication.type === 'LOCK_RESERVE' ? 'reserved' : 'approved',
      signatures: [
        publication.signatures.first && {
          role: 'DAES_FIRST_SIGNATURE',
          address: publication.signatures.first.signer,
          hash: publication.signatures.first.hash,
          timestamp: publication.signatures.first.timestamp,
          txHash: publication.blockchain.txHash,
          blockNumber: publication.blockchain.blockNumber
        },
        publication.signatures.second && {
          role: 'TREASURY_SECOND_SIGNATURE',
          address: publication.signatures.second.signer,
          hash: publication.signatures.second.hash,
          timestamp: publication.signatures.second.timestamp
        },
        publication.signatures.third && {
          role: 'MINTING_THIRD_SIGNATURE',
          address: publication.signatures.third.signer,
          hash: publication.signatures.third.hash,
          timestamp: publication.signatures.third.timestamp
        }
      ].filter(Boolean),
      blockchain: {
        network: publication.blockchain.network,
        chainId: publication.blockchain.chainId,
        txHash: publication.blockchain.txHash,
        blockNumber: publication.blockchain.blockNumber,
        lusdContract: publication.blockchain.contractAddress
      },
      details: {
        beneficiary: publication.actors.beneficiary,
        bankName: publication.bank.name,
        publicationCode: publication.publicationCode
      }
    };
    
    const existingExplorer = safeParseJSON<any[]>('lemx_mint_explorer', []);
    existingExplorer.unshift(lemxEntry); // Add to beginning
    safeStoreJSON('lemx_mint_explorer', existingExplorer);
  }

  // ═══════════════════════════════════════════════════════════════════════════════════════════════
  // DCB TREASURY NOTIFICATION
  // ═══════════════════════════════════════════════════════════════════════════════════════════════

  private notifyDCBTreasury(event: string, data: any): void {
    // Save notification for DCB to pick up
    const notifications = safeParseJSON<any[]>(STORAGE_KEYS.NOTIFICATIONS, []);
    notifications.push({
      id: generateId(),
      event,
      data,
      timestamp: new Date().toISOString(),
      read: false
    });
    safeStoreJSON(STORAGE_KEYS.NOTIFICATIONS, notifications);
    
    // Emit for local listeners
    this.emit(`dcb_notification_${event}`, data);
    
    console.log('📨 [Treasury] Notification sent to DCB:', event);
  }

  // ═══════════════════════════════════════════════════════════════════════════════════════════════
  // STATISTICS
  // ═══════════════════════════════════════════════════════════════════════════════════════════════

  private calculateStatistics(): TreasuryStatistics {
    const stats: TreasuryStatistics = {
      dcb: {
        totalInjected: this.usdInjections.reduce((sum, i) => sum + i.amount, 0),
        totalTokenized: this.usdInjections.filter(i => i.status !== 'pending').reduce((sum, i) => sum + i.amount, 0),
        pendingLocks: this.pendingLocks.filter(l => l.status === 'pending').length,
        activeLocks: this.pendingLocks.filter(l => l.status === 'accepted').length,
        totalMinted: this.mintWithCodeQueue.filter(m => m.status === 'completed').reduce((sum, m) => sum + m.amountUSD, 0)
      },
      minting: {
        pendingLocks: this.pendingLocks.filter(l => l.status === 'pending').length,
        acceptedLocks: this.pendingLocks.filter(l => l.status === 'accepted').length,
        lockReserves: this.lockReserves.length,
        mintWithCodeQueue: this.mintWithCodeQueue.filter(m => m.status === 'ready_to_mint').length,
        totalMinted: this.mintWithCodeQueue.filter(m => m.status === 'completed').length,
        totalVolume: this.mintWithCodeQueue.filter(m => m.status === 'completed').reduce((sum, m) => sum + m.amountUSD, 0)
      },
      combined: {
        totalUSDLocked: this.lockReserves.reduce((sum, r) => sum + r.amount, 0),
        totalVUSDMinted: this.mintWithCodeQueue.filter(m => m.status === 'completed').reduce((sum, m) => sum + m.amountUSD, 0),
        totalTransactions: this.mintExplorer.length
      }
    };
    
    return stats;
  }

  private updateStatistics(): void {
    this.statistics = this.calculateStatistics();
    safeStoreJSON(STORAGE_KEYS.STATISTICS, this.statistics);
    this.emit('statistics_updated', this.statistics);
  }

  // ═══════════════════════════════════════════════════════════════════════════════════════════════
  // GETTERS
  // ═══════════════════════════════════════════════════════════════════════════════════════════════

  public getUSDInjections(): USDInjection[] {
    return [...this.usdInjections];
  }

  public getPendingLocks(): PendingLock[] {
    return [...this.pendingLocks];
  }

  public getLockReserves(): LockReserve[] {
    return [...this.lockReserves];
  }

  public getMintWithCodeQueue(): MintWithCodeRequest[] {
    return [...this.mintWithCodeQueue];
  }

  public getMintExplorer(): MintExplorerPublication[] {
    return [...this.mintExplorer];
  }

  public getStatistics(): TreasuryStatistics {
    this.updateStatistics();
    return this.statistics;
  }

  public getPendingNotifications(): any[] {
    return safeParseJSON(STORAGE_KEYS.NOTIFICATIONS, []).filter((n: any) => !n.read);
  }

  public markNotificationRead(id: string): void {
    const notifications = safeParseJSON<any[]>(STORAGE_KEYS.NOTIFICATIONS, []);
    const index = notifications.findIndex((n: any) => n.id === id);
    if (index !== -1) {
      notifications[index].read = true;
      safeStoreJSON(STORAGE_KEYS.NOTIFICATIONS, notifications);
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════════════════════════
  // REFRESH
  // ═══════════════════════════════════════════════════════════════════════════════════════════════

  public refresh(): void {
    this.loadFromStorage();
    this.updateStatistics();
    this.emit('data_refreshed', this.statistics);
  }
}

// ═══════════════════════════════════════════════════════════════════════════════════════════════════
// SINGLETON INSTANCE
// ═══════════════════════════════════════════════════════════════════════════════════════════════════

export const treasuryInteractionService = new TreasuryInteractionService();
export default treasuryInteractionService;
