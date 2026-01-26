/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * DATA PERSISTENCE SERVICE - Enhanced Redundancy & Reliability
 * Servicio de persistencia de datos con redundancia y sincronización
 * ═══════════════════════════════════════════════════════════════════════════════
 */

// ═══════════════════════════════════════════════════════════════════════════════
// STORAGE KEYS
// ═══════════════════════════════════════════════════════════════════════════════

const STORAGE_PREFIX = 'DCB_DAES_';

export const PERSISTENCE_KEYS = {
  // Core Data
  PENDING_LOCKS: `${STORAGE_PREFIX}pending_locks`,
  APPROVED_LOCKS: `${STORAGE_PREFIX}approved_locks`,
  REJECTED_LOCKS: `${STORAGE_PREFIX}rejected_locks`,
  COMPLETED_MINTS: `${STORAGE_PREFIX}completed_mints`,
  MINT_QUEUE: `${STORAGE_PREFIX}mint_queue`,
  
  // Explorer Data
  EXPLORER_EVENTS: `${STORAGE_PREFIX}explorer_events`,
  EXPLORER_STATS: `${STORAGE_PREFIX}explorer_stats`,
  
  // Blockchain Data
  BLOCKCHAIN_INJECTIONS: `${STORAGE_PREFIX}blockchain_injections`,
  BLOCKCHAIN_LOCKS: `${STORAGE_PREFIX}blockchain_locks`,
  BLOCKCHAIN_EVENTS: `${STORAGE_PREFIX}blockchain_events`,
  VUSD_STATS: `${STORAGE_PREFIX}vusd_stats`,
  
  // Connection State
  LAST_SYNC: `${STORAGE_PREFIX}last_sync`,
  CONNECTION_STATE: `${STORAGE_PREFIX}connection_state`,
  
  // Backup
  FULL_BACKUP: `${STORAGE_PREFIX}full_backup`,
  BACKUP_TIMESTAMP: `${STORAGE_PREFIX}backup_timestamp`
};

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

export interface LockRecord {
  id: string;
  lockId?: string;
  authorizationCode: string;
  amount: string;
  currency: string;
  beneficiary: string;
  bankName?: string;
  status: 'pending' | 'approved' | 'rejected' | 'reserved' | 'minted';
  createdAt: string;
  updatedAt: string;
  blockchain?: {
    injectionId?: string;
    txHash?: string;
    blockNumber?: number;
    firstSignature?: string;
    secondSignature?: string;
    thirdSignature?: string;
  };
  isoData?: {
    messageId?: string;
    uetr?: string;
    xmlHash?: string;
  };
}

export interface MintRecord {
  id: string;
  lockId: string;
  authorizationCode: string;
  publicationCode?: string;
  amount: string;
  beneficiary: string;
  mintedAt: string;
  txHash?: string;
  blockNumber?: number;
  status: 'completed' | 'pending' | 'failed';
}

export interface ExplorerEvent {
  id: string;
  type: string;
  timestamp: string;
  amount: string;
  authorizationCode?: string;
  publicationCode?: string;
  status: string;
  blockchain?: {
    txHash?: string;
    blockNumber?: number;
    network?: string;
  };
  details?: Record<string, any>;
}

export interface SyncState {
  lastSyncTime: string | null;
  lastBlockchainSync: string | null;
  pendingCount: number;
  approvedCount: number;
  mintedCount: number;
  totalVolume: number;
}

// ═══════════════════════════════════════════════════════════════════════════════
// DATA PERSISTENCE SERVICE CLASS
// ═══════════════════════════════════════════════════════════════════════════════

class DataPersistenceService {
  private listeners: Map<string, Set<(data: any) => void>> = new Map();
  private syncInterval: NodeJS.Timeout | null = null;
  private backupInterval: NodeJS.Timeout | null = null;

  constructor() {
    this.initializeStorage();
    this.startAutoBackup();
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // INITIALIZATION
  // ═══════════════════════════════════════════════════════════════════════════

  private initializeStorage(): void {
    // Ensure all keys have initial values
    Object.values(PERSISTENCE_KEYS).forEach(key => {
      if (!localStorage.getItem(key)) {
        if (key.includes('_locks') || key.includes('_mints') || key.includes('_events') || key.includes('_queue')) {
          localStorage.setItem(key, '[]');
        } else if (key.includes('_stats')) {
          localStorage.setItem(key, '{}');
        }
      }
    });
    
    console.log('[DataPersistence] Storage initialized');
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // LOCKS MANAGEMENT
  // ═══════════════════════════════════════════════════════════════════════════

  savePendingLock(lock: LockRecord): void {
    const locks = this.getPendingLocks();
    const existingIndex = locks.findIndex(l => l.id === lock.id || l.authorizationCode === lock.authorizationCode);
    
    if (existingIndex >= 0) {
      locks[existingIndex] = { ...locks[existingIndex], ...lock, updatedAt: new Date().toISOString() };
    } else {
      locks.push({ ...lock, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() });
    }
    
    this.saveToStorage(PERSISTENCE_KEYS.PENDING_LOCKS, locks);
    this.notifyListeners(PERSISTENCE_KEYS.PENDING_LOCKS, locks);
    
    console.log(`[DataPersistence] Lock guardado: ${lock.authorizationCode}`);
  }

  getPendingLocks(): LockRecord[] {
    return this.loadFromStorage<LockRecord[]>(PERSISTENCE_KEYS.PENDING_LOCKS) || [];
  }

  approveLock(lockId: string, blockchainData?: Partial<LockRecord['blockchain']>): LockRecord | null {
    const pending = this.getPendingLocks();
    const approved = this.getApprovedLocks();
    
    const index = pending.findIndex(l => l.id === lockId || l.authorizationCode === lockId);
    if (index < 0) return null;
    
    const lock = { 
      ...pending[index], 
      status: 'approved' as const, 
      updatedAt: new Date().toISOString(),
      blockchain: { ...pending[index].blockchain, ...blockchainData }
    };
    
    pending.splice(index, 1);
    approved.push(lock);
    
    this.saveToStorage(PERSISTENCE_KEYS.PENDING_LOCKS, pending);
    this.saveToStorage(PERSISTENCE_KEYS.APPROVED_LOCKS, approved);
    
    this.notifyListeners(PERSISTENCE_KEYS.PENDING_LOCKS, pending);
    this.notifyListeners(PERSISTENCE_KEYS.APPROVED_LOCKS, approved);
    
    console.log(`[DataPersistence] Lock aprobado: ${lock.authorizationCode}`);
    return lock;
  }

  getApprovedLocks(): LockRecord[] {
    return this.loadFromStorage<LockRecord[]>(PERSISTENCE_KEYS.APPROVED_LOCKS) || [];
  }

  rejectLock(lockId: string, reason?: string): LockRecord | null {
    const pending = this.getPendingLocks();
    const rejected = this.getRejectedLocks();
    
    const index = pending.findIndex(l => l.id === lockId || l.authorizationCode === lockId);
    if (index < 0) return null;
    
    const lock = { 
      ...pending[index], 
      status: 'rejected' as const, 
      updatedAt: new Date().toISOString()
    };
    
    pending.splice(index, 1);
    rejected.push(lock);
    
    this.saveToStorage(PERSISTENCE_KEYS.PENDING_LOCKS, pending);
    this.saveToStorage(PERSISTENCE_KEYS.REJECTED_LOCKS, rejected);
    
    console.log(`[DataPersistence] Lock rechazado: ${lock.authorizationCode}`);
    return lock;
  }

  getRejectedLocks(): LockRecord[] {
    return this.loadFromStorage<LockRecord[]>(PERSISTENCE_KEYS.REJECTED_LOCKS) || [];
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // MINTS MANAGEMENT
  // ═══════════════════════════════════════════════════════════════════════════

  saveCompletedMint(mint: MintRecord): void {
    const mints = this.getCompletedMints();
    const existingIndex = mints.findIndex(m => m.id === mint.id);
    
    if (existingIndex >= 0) {
      mints[existingIndex] = mint;
    } else {
      mints.push(mint);
    }
    
    this.saveToStorage(PERSISTENCE_KEYS.COMPLETED_MINTS, mints);
    this.notifyListeners(PERSISTENCE_KEYS.COMPLETED_MINTS, mints);
    
    // Also move from approved to minted
    const approved = this.getApprovedLocks();
    const index = approved.findIndex(l => l.id === mint.lockId || l.authorizationCode === mint.authorizationCode);
    if (index >= 0) {
      approved[index].status = 'minted';
      approved[index].updatedAt = new Date().toISOString();
      this.saveToStorage(PERSISTENCE_KEYS.APPROVED_LOCKS, approved);
    }
    
    console.log(`[DataPersistence] Mint completado: ${mint.authorizationCode}`);
  }

  getCompletedMints(): MintRecord[] {
    return this.loadFromStorage<MintRecord[]>(PERSISTENCE_KEYS.COMPLETED_MINTS) || [];
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // EXPLORER EVENTS
  // ═══════════════════════════════════════════════════════════════════════════

  saveExplorerEvent(event: ExplorerEvent): void {
    const events = this.getExplorerEvents();
    const existingIndex = events.findIndex(e => e.id === event.id);
    
    if (existingIndex >= 0) {
      events[existingIndex] = event;
    } else {
      events.unshift(event); // Add to beginning
    }
    
    // Keep only last 500 events
    const trimmed = events.slice(0, 500);
    
    this.saveToStorage(PERSISTENCE_KEYS.EXPLORER_EVENTS, trimmed);
    this.notifyListeners(PERSISTENCE_KEYS.EXPLORER_EVENTS, trimmed);
  }

  saveExplorerEvents(events: ExplorerEvent[]): void {
    const existing = this.getExplorerEvents();
    const merged = this.mergeEvents(existing, events);
    const trimmed = merged.slice(0, 500);
    
    this.saveToStorage(PERSISTENCE_KEYS.EXPLORER_EVENTS, trimmed);
    this.notifyListeners(PERSISTENCE_KEYS.EXPLORER_EVENTS, trimmed);
    
    console.log(`[DataPersistence] ${events.length} eventos guardados`);
  }

  getExplorerEvents(): ExplorerEvent[] {
    return this.loadFromStorage<ExplorerEvent[]>(PERSISTENCE_KEYS.EXPLORER_EVENTS) || [];
  }

  private mergeEvents(existing: ExplorerEvent[], newEvents: ExplorerEvent[]): ExplorerEvent[] {
    const map = new Map<string, ExplorerEvent>();
    
    existing.forEach(e => map.set(e.id, e));
    newEvents.forEach(e => map.set(e.id, e));
    
    return Array.from(map.values())
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // BLOCKCHAIN DATA
  // ═══════════════════════════════════════════════════════════════════════════

  saveBlockchainInjections(injections: any[]): void {
    this.saveToStorage(PERSISTENCE_KEYS.BLOCKCHAIN_INJECTIONS, injections);
    console.log(`[DataPersistence] ${injections.length} injections de blockchain guardadas`);
  }

  getBlockchainInjections(): any[] {
    return this.loadFromStorage<any[]>(PERSISTENCE_KEYS.BLOCKCHAIN_INJECTIONS) || [];
  }

  saveBlockchainLocks(locks: any[]): void {
    this.saveToStorage(PERSISTENCE_KEYS.BLOCKCHAIN_LOCKS, locks);
  }

  getBlockchainLocks(): any[] {
    return this.loadFromStorage<any[]>(PERSISTENCE_KEYS.BLOCKCHAIN_LOCKS) || [];
  }

  saveVUSDStats(stats: any): void {
    this.saveToStorage(PERSISTENCE_KEYS.VUSD_STATS, stats);
  }

  getVUSDStats(): any {
    return this.loadFromStorage<any>(PERSISTENCE_KEYS.VUSD_STATS) || { totalSupply: '0' };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // SYNC STATE
  // ═══════════════════════════════════════════════════════════════════════════

  updateSyncState(): SyncState {
    const state: SyncState = {
      lastSyncTime: new Date().toISOString(),
      lastBlockchainSync: this.loadFromStorage<string>(PERSISTENCE_KEYS.LAST_SYNC) || null,
      pendingCount: this.getPendingLocks().length,
      approvedCount: this.getApprovedLocks().length,
      mintedCount: this.getCompletedMints().length,
      totalVolume: this.getCompletedMints().reduce((sum, m) => sum + parseFloat(m.amount || '0'), 0)
    };
    
    this.saveToStorage(PERSISTENCE_KEYS.LAST_SYNC, new Date().toISOString());
    return state;
  }

  getSyncState(): SyncState {
    return {
      lastSyncTime: this.loadFromStorage<string>(PERSISTENCE_KEYS.LAST_SYNC) || null,
      lastBlockchainSync: null,
      pendingCount: this.getPendingLocks().length,
      approvedCount: this.getApprovedLocks().length,
      mintedCount: this.getCompletedMints().length,
      totalVolume: this.getCompletedMints().reduce((sum, m) => sum + parseFloat(m.amount || '0'), 0)
    };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // BACKUP & RESTORE
  // ═══════════════════════════════════════════════════════════════════════════

  private startAutoBackup(): void {
    // Backup every 5 minutes
    this.backupInterval = setInterval(() => {
      this.createBackup();
    }, 5 * 60 * 1000);
    
    // Initial backup
    setTimeout(() => this.createBackup(), 30000);
  }

  createBackup(): void {
    const backup = {
      timestamp: new Date().toISOString(),
      pendingLocks: this.getPendingLocks(),
      approvedLocks: this.getApprovedLocks(),
      rejectedLocks: this.getRejectedLocks(),
      completedMints: this.getCompletedMints(),
      explorerEvents: this.getExplorerEvents().slice(0, 100), // Only last 100
      blockchainInjections: this.getBlockchainInjections(),
      blockchainLocks: this.getBlockchainLocks(),
      vusdStats: this.getVUSDStats()
    };
    
    this.saveToStorage(PERSISTENCE_KEYS.FULL_BACKUP, backup);
    this.saveToStorage(PERSISTENCE_KEYS.BACKUP_TIMESTAMP, new Date().toISOString());
    
    console.log('[DataPersistence] Backup creado:', new Date().toISOString());
  }

  restoreFromBackup(): boolean {
    try {
      const backup = this.loadFromStorage<any>(PERSISTENCE_KEYS.FULL_BACKUP);
      if (!backup) {
        console.warn('[DataPersistence] No backup found');
        return false;
      }
      
      this.saveToStorage(PERSISTENCE_KEYS.PENDING_LOCKS, backup.pendingLocks || []);
      this.saveToStorage(PERSISTENCE_KEYS.APPROVED_LOCKS, backup.approvedLocks || []);
      this.saveToStorage(PERSISTENCE_KEYS.REJECTED_LOCKS, backup.rejectedLocks || []);
      this.saveToStorage(PERSISTENCE_KEYS.COMPLETED_MINTS, backup.completedMints || []);
      this.saveToStorage(PERSISTENCE_KEYS.EXPLORER_EVENTS, backup.explorerEvents || []);
      this.saveToStorage(PERSISTENCE_KEYS.BLOCKCHAIN_INJECTIONS, backup.blockchainInjections || []);
      this.saveToStorage(PERSISTENCE_KEYS.BLOCKCHAIN_LOCKS, backup.blockchainLocks || []);
      this.saveToStorage(PERSISTENCE_KEYS.VUSD_STATS, backup.vusdStats || {});
      
      console.log('[DataPersistence] Datos restaurados desde backup:', backup.timestamp);
      return true;
    } catch (e) {
      console.error('[DataPersistence] Error restoring backup:', e);
      return false;
    }
  }

  exportData(): string {
    const data = {
      exportedAt: new Date().toISOString(),
      pendingLocks: this.getPendingLocks(),
      approvedLocks: this.getApprovedLocks(),
      rejectedLocks: this.getRejectedLocks(),
      completedMints: this.getCompletedMints(),
      explorerEvents: this.getExplorerEvents(),
      blockchainData: {
        injections: this.getBlockchainInjections(),
        locks: this.getBlockchainLocks(),
        vusdStats: this.getVUSDStats()
      }
    };
    
    return JSON.stringify(data, null, 2);
  }

  importData(jsonString: string): boolean {
    try {
      const data = JSON.parse(jsonString);
      
      if (data.pendingLocks) this.saveToStorage(PERSISTENCE_KEYS.PENDING_LOCKS, data.pendingLocks);
      if (data.approvedLocks) this.saveToStorage(PERSISTENCE_KEYS.APPROVED_LOCKS, data.approvedLocks);
      if (data.rejectedLocks) this.saveToStorage(PERSISTENCE_KEYS.REJECTED_LOCKS, data.rejectedLocks);
      if (data.completedMints) this.saveToStorage(PERSISTENCE_KEYS.COMPLETED_MINTS, data.completedMints);
      if (data.explorerEvents) this.saveToStorage(PERSISTENCE_KEYS.EXPLORER_EVENTS, data.explorerEvents);
      
      console.log('[DataPersistence] Data imported successfully');
      return true;
    } catch (e) {
      console.error('[DataPersistence] Error importing data:', e);
      return false;
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // STORAGE HELPERS
  // ═══════════════════════════════════════════════════════════════════════════

  private saveToStorage<T>(key: string, data: T): void {
    try {
      localStorage.setItem(key, JSON.stringify(data));
    } catch (e) {
      console.error(`[DataPersistence] Error saving to ${key}:`, e);
      // If quota exceeded, try to clear old data
      if (e instanceof Error && e.name === 'QuotaExceededError') {
        this.clearOldData();
        try {
          localStorage.setItem(key, JSON.stringify(data));
        } catch (e2) {
          console.error('[DataPersistence] Still cannot save after clearing:', e2);
        }
      }
    }
  }

  private loadFromStorage<T>(key: string): T | null {
    try {
      const data = localStorage.getItem(key);
      return data ? JSON.parse(data) : null;
    } catch (e) {
      console.error(`[DataPersistence] Error loading from ${key}:`, e);
      return null;
    }
  }

  private clearOldData(): void {
    // Remove old events to free space
    const events = this.getExplorerEvents();
    if (events.length > 100) {
      this.saveToStorage(PERSISTENCE_KEYS.EXPLORER_EVENTS, events.slice(0, 100));
    }
    
    console.log('[DataPersistence] Old data cleared');
  }

  clearAll(): void {
    Object.values(PERSISTENCE_KEYS).forEach(key => {
      localStorage.removeItem(key);
    });
    this.initializeStorage();
    console.log('[DataPersistence] All data cleared');
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // LISTENERS
  // ═══════════════════════════════════════════════════════════════════════════

  subscribe(key: string, callback: (data: any) => void): () => void {
    if (!this.listeners.has(key)) {
      this.listeners.set(key, new Set());
    }
    this.listeners.get(key)!.add(callback);
    
    return () => {
      this.listeners.get(key)?.delete(callback);
    };
  }

  private notifyListeners(key: string, data: any): void {
    this.listeners.get(key)?.forEach(cb => cb(data));
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// SINGLETON EXPORT
// ═══════════════════════════════════════════════════════════════════════════════

export const dataPersistence = new DataPersistenceService();
export default dataPersistence;
