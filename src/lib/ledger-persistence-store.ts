/**
 * Ledger Persistence Store
 * Sistema centralizado de persistencia para el archivo Ledger1 Digital Commercial Bank DAES
 * Mantiene el estado de carga y balances incluso si se recarga la página o falla la conexión
 */

interface LedgerFileState {
  fileName: string;
  fileSize: number;
  lastModified: number;
  uploadTimestamp: number;
}

interface LedgerProgress {
  bytesProcessed: number;
  totalBytes: number;
  percentage: number;
  lastChunkIndex: number;
  isComplete: boolean;
  pausedAt?: number;
}

interface LedgerBalance {
  currency: string;
  balance: number;
  account?: string;
  lastUpdate: number;
}

interface LedgerState {
  fileState: LedgerFileState | null;
  progress: LedgerProgress;
  balances: LedgerBalance[];
  isLoaded: boolean;
  isProcessing: boolean;
  lastSyncTimestamp: number;
}

class LedgerPersistenceStore {
  private static instance: LedgerPersistenceStore;
  private state: LedgerState;
  private listeners: Set<() => void> = new Set();
  private readonly STORAGE_KEY = 'daes_ledger_state';
  private readonly FILE_CACHE_KEY = 'daes_ledger_file_cache';
  private autoSaveInterval: number | null = null;

  private constructor() {
    this.state = {
      fileState: null,
      progress: {
        bytesProcessed: 0,
        totalBytes: 0,
        percentage: 0,
        lastChunkIndex: 0,
        isComplete: false
      },
      balances: [],
      isLoaded: false,
      isProcessing: false,
      lastSyncTimestamp: 0
    };
    
    this.loadFromStorage();
    this.startAutoSave();
    
    console.log('[Ledger Store] 📁 Inicializado');
  }

  static getInstance(): LedgerPersistenceStore {
    if (!LedgerPersistenceStore.instance) {
      LedgerPersistenceStore.instance = new LedgerPersistenceStore();
    }
    return LedgerPersistenceStore.instance;
  }

  // ==========================================
  // PERSISTENCIA
  // ==========================================

  private loadFromStorage() {
    try {
      const saved = localStorage.getItem(this.STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        this.state = { ...this.state, ...parsed };
        
        // ✅ FIX: Al recargar la página, el proceso real ya no está corriendo
        // Resetear isProcessing para que el botón "Cargar Ledger1" funcione
        if (this.state.isProcessing) {
          console.log('[Ledger Store] ⚠️ Proceso anterior interrumpido, reseteando estado...');
          this.state.isProcessing = false;
        }
        
        console.log('[Ledger Store] ✅ Estado cargado desde localStorage');
        console.log('[Ledger Store] 📊 Progreso:', this.state.progress.percentage.toFixed(2) + '%');
        console.log('[Ledger Store] 💰 Balances:', this.state.balances.length);
      }
    } catch (err) {
      console.error('[Ledger Store] ❌ Error cargando estado:', err);
    }
  }

  private saveToStorage() {
    try {
      const toSave = {
        ...this.state,
        lastSyncTimestamp: Date.now()
      };
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(toSave));
      console.log('[Ledger Store] 💾 Estado guardado');
    } catch (err) {
      console.error('[Ledger Store] ❌ Error guardando estado:', err);
    }
  }

  private startAutoSave() {
    // Guardar automáticamente cada 10 segundos
    this.autoSaveInterval = window.setInterval(() => {
      if (this.state.isProcessing) {
        this.saveToStorage();
      }
    }, 10000) as unknown as number;
  }

  // ==========================================
  // GESTIÓN DE ARCHIVO
  // ==========================================

  setFileState(fileName: string, fileSize: number, lastModified: number) {
    this.state.fileState = {
      fileName,
      fileSize,
      lastModified,
      uploadTimestamp: Date.now()
    };
    this.state.isLoaded = true;
    this.saveToStorage();
    this.notifyListeners();
    
    console.log('[Ledger Store] 📄 Archivo registrado:', fileName);
  }

  getFileState(): LedgerFileState | null {
    return this.state.fileState;
  }

  isFileLoaded(): boolean {
    return this.state.isLoaded && this.state.fileState !== null;
  }

  clearFileState() {
    this.state.fileState = null;
    this.state.isLoaded = false;
    this.state.progress = {
      bytesProcessed: 0,
      totalBytes: 0,
      percentage: 0,
      lastChunkIndex: 0,
      isComplete: false
    };
    this.saveToStorage();
    this.notifyListeners();
    
    console.log('[Ledger Store] 🗑️ Estado de archivo limpiado');
  }

  // ==========================================
  // GESTIÓN DE PROGRESO
  // ==========================================

  updateProgress(bytesProcessed: number, totalBytes: number, chunkIndex: number) {
    this.state.progress = {
      bytesProcessed,
      totalBytes,
      percentage: totalBytes > 0 ? (bytesProcessed / totalBytes) * 100 : 0,
      lastChunkIndex: chunkIndex,
      isComplete: bytesProcessed >= totalBytes
    };
    this.state.isProcessing = !this.state.progress.isComplete;
    
    // Guardar cada 5% de progreso
    if (this.state.progress.percentage % 5 < 0.1) {
      this.saveToStorage();
    }
    
    this.notifyListeners();
  }

  getProgress(): LedgerProgress {
    return { ...this.state.progress };
  }

  setProcessing(isProcessing: boolean) {
    this.state.isProcessing = isProcessing;
    this.notifyListeners();
  }

  pauseProcessing() {
    this.state.progress.pausedAt = Date.now();
    this.state.isProcessing = false;
    this.saveToStorage();
    this.notifyListeners();
    
    console.log('[Ledger Store] ⏸️ Procesamiento pausado');
  }

  refreshFromProfiles() {
    this.loadFromStorage();
    this.notifyListeners();
    console.log('[Ledger Store] 🔄 Estado de Ledger sincronizado desde perfiles');
  }

  resumeProcessing() {
    delete this.state.progress.pausedAt;
    this.state.isProcessing = true;
    this.notifyListeners();
    
    console.log('[Ledger Store] ▶️ Procesamiento reanudado desde:', this.state.progress.lastChunkIndex);
  }

  // ==========================================
  // GESTIÓN DE BALANCES
  // ==========================================

  addBalance(currency: string, balance: number, account?: string) {
    const existing = this.state.balances.find(b => 
      b.currency === currency && b.account === account
    );

    if (existing) {
      existing.balance = balance;
      existing.lastUpdate = Date.now();
    } else {
      this.state.balances.push({
        currency,
        balance,
        account,
        lastUpdate: Date.now()
      });
    }

    this.notifyListeners();
  }

  updateBalances(balances: LedgerBalance[]) {
    balances.forEach(b => {
      this.addBalance(b.currency, b.balance, b.account);
    });
    this.saveToStorage();
  }

  getBalances(): LedgerBalance[] {
    return [...this.state.balances];
  }

  getBalanceByCurrency(currency: string): number {
    return this.state.balances
      .filter(b => b.currency === currency)
      .reduce((sum, b) => sum + b.balance, 0);
  }

  clearBalances() {
    this.state.balances = [];
    this.saveToStorage();
    this.notifyListeners();
    
    console.log('[Ledger Store] 🗑️ Balances limpiados');
  }

  // ==========================================
  // RECUPERACIÓN INTELIGENTE
  // ==========================================

  needsRecovery(): boolean {
    return (
      this.state.fileState !== null &&
      !this.state.progress.isComplete &&
      this.state.progress.bytesProcessed > 0
    );
  }

  getRecoveryInfo() {
    if (!this.needsRecovery()) return null;

    return {
      fileName: this.state.fileState?.fileName,
      percentage: this.state.progress.percentage,
      lastChunkIndex: this.state.progress.lastChunkIndex,
      bytesProcessed: this.state.progress.bytesProcessed,
      totalBytes: this.state.progress.totalBytes,
      balancesCount: this.state.balances.length,
      pausedAt: this.state.progress.pausedAt
    };
  }

  // ==========================================
  // VERIFICACIÓN DE ESTADO
  // ==========================================

  getStatus() {
    return {
      isLoaded: this.state.isLoaded,
      isProcessing: this.state.isProcessing,
      isComplete: this.state.progress.isComplete,
      fileName: this.state.fileState?.fileName || null,
      progress: this.state.progress.percentage,
      balancesCount: this.state.balances.length,
      lastSync: this.state.lastSyncTimestamp
    };
  }

  requiresRefresh(): boolean {
    // Requiere refresh si pasaron más de 1 hora desde la última sincronización
    const oneHour = 60 * 60 * 1000;
    return (
      this.state.isLoaded &&
      this.state.lastSyncTimestamp > 0 &&
      (Date.now() - this.state.lastSyncTimestamp) > oneHour
    );
  }

  // ==========================================
  // SUSCRIPCIONES
  // ==========================================

  subscribe(listener: () => void) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notifyListeners() {
    this.listeners.forEach(listener => listener());
  }

  // ==========================================
  // LIMPIEZA
  // ==========================================

  cleanup() {
    if (this.autoSaveInterval) {
      window.clearInterval(this.autoSaveInterval);
    }
  }

  reset() {
    this.state = {
      fileState: null,
      progress: {
        bytesProcessed: 0,
        totalBytes: 0,
        percentage: 0,
        lastChunkIndex: 0,
        isComplete: false
      },
      balances: [],
      isLoaded: false,
      isProcessing: false,
      lastSyncTimestamp: 0
    };
    
    localStorage.removeItem(this.STORAGE_KEY);
    this.notifyListeners();
    
    console.log('[Ledger Store] 🔄 Reset completo');
  }
}

// Export singleton instance
export const ledgerPersistenceStore = LedgerPersistenceStore.getInstance();
export type { LedgerFileState, LedgerProgress, LedgerBalance };
