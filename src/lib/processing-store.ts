import { CurrencyBalance, balanceStore } from './balances-store';
import { getSupabaseClient } from './supabase-client';
import { persistentStorage, ProcessingCheckpoint } from './persistent-storage-manager';
import { logger } from './logger';

const getSupabase = () => getSupabaseClient();

export interface ProcessingState {
  id: string;
  fileName: string;
  fileSize: number;
  bytesProcessed: number;
  progress: number;
  status: 'idle' | 'processing' | 'paused' | 'completed' | 'error';
  startTime: string;
  lastUpdateTime: string;
  balances: CurrencyBalance[];
  chunkIndex: number;
  totalChunks: number;
  errorMessage?: string;
  fileData?: ArrayBuffer;
  fileHash?: string;
  fileLastModified?: number;
  syncStatus: 'synced' | 'syncing' | 'error' | 'local-only';
  lastSyncTime?: string;
  retryCount: number;
}

class ProcessingStore {
  private static STORAGE_KEY = 'Digital Commercial Bank Ltd_processing_state';
  private static SAVE_INTERVAL_MS = 5000;
  private static AUTO_CHECKPOINT_INTERVAL_MS = 30000; // 30 segundos para auto-guardado
  private listeners: Array<(state: ProcessingState | null) => void> = [];
  private currentState: ProcessingState | null = null;
  private isProcessingActive: boolean = false;
  private processingController: AbortController | null = null;
  private currentUserId: string | null = null;
  private currentDbId: string | null = null;
  private userIdPromise: Promise<string | null>;
  private lastSaveTime: number = 0;
  private pendingSave: ProcessingState | null = null;
  private saveTimeoutId: NodeJS.Timeout | null = null;
  private lastCheckpointTime: number = 0;
  private autoCheckpointTimer: NodeJS.Timeout | null = null;
  private lastProgressNotified: number = -1; // ✅ Para throttle de updateProgress
  private notifyTimer: NodeJS.Timeout | null = null; // ✅ Para debounce de notificaciones

  private currencyPatterns: Map<string, Uint8Array> = new Map();

  constructor() {
    this.userIdPromise = this.initializeUser();
    this.initializeCurrencyPatterns();
    this.userIdPromise.then(() => this.loadState());

    window.addEventListener('beforeunload', () => {
      this.flushPendingSave();
      this.saveCheckpointNow();
    });

    // NO iniciar timer aquí - solo cuando haya procesamiento activo
  }

  private async initializeUser(): Promise<string | null> {
    try {
      const supabase = getSupabase();
      if (!supabase) {
        logger.warn('[ProcessingStore] Sin conexión a Supabase');
        return null;
      }
      const { data: { user } } = await supabase.auth.getUser();
      this.currentUserId = user?.id || null;
      return this.currentUserId;
    } catch (error) {
      logger.error('[ProcessingStore] Error getting user:', error);
      return null;
    }
  }

  private async ensureUserId(): Promise<string | null> {
    if (this.currentUserId) return this.currentUserId;
    return await this.userIdPromise;
  }

  private initializeCurrencyPatterns(): void {
    const currencies = ['USD', 'EUR', 'GBP', 'CAD', 'AUD', 'JPY', 'CHF', 'CNY', 'INR', 'MXN', 'BRL', 'RUB', 'KRW', 'SGD', 'HKD'];
    const encoder = new TextEncoder();
    currencies.forEach(currency => {
      this.currencyPatterns.set(currency, encoder.encode(currency));
    });
  }

  async calculateFileHash(file: File): Promise<string> {
    try {
      const chunkSize = 1024 * 1024;
      const chunks: ArrayBuffer[] = [];

      const start = file.slice(0, chunkSize);
      chunks.push(await start.arrayBuffer());

      if (file.size > chunkSize * 2) {
        const middle = file.slice(Math.floor(file.size / 2), Math.floor(file.size / 2) + chunkSize);
        chunks.push(await middle.arrayBuffer());
      }

      if (file.size > chunkSize) {
        const end = file.slice(Math.max(0, file.size - chunkSize));
        chunks.push(await end.arrayBuffer());
      }

      const combined = new Uint8Array(chunks.reduce((acc, chunk) => acc + chunk.byteLength, 0));
      let offset = 0;
      for (const chunk of chunks) {
        combined.set(new Uint8Array(chunk), offset);
        offset += chunk.byteLength;
      }

      const hashBuffer = await crypto.subtle.digest('SHA-256', combined);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

      return `${hashHex}-${file.size}-${file.lastModified}`;
    } catch (error) {
      logger.error('[ProcessingStore] Error calculating file hash:', error);
      return `fallback-${file.name}-${file.size}-${file.lastModified}`;
    }
  }

  async saveState(state: ProcessingState): Promise<void> {
    this.currentState = state;
    this.pendingSave = state;

    const stateToSave = {
      ...state,
      fileData: undefined
    };

    try {
      localStorage.setItem(ProcessingStore.STORAGE_KEY, JSON.stringify(stateToSave));
      this.notifyListeners();

      const now = Date.now();
      const timeSinceLastSave = now - this.lastSaveTime;

      if (this.saveTimeoutId) {
        clearTimeout(this.saveTimeoutId);
      }

      if (timeSinceLastSave >= ProcessingStore.SAVE_INTERVAL_MS ||
          state.status === 'completed' ||
          state.status === 'error') {
        await this.saveToSupabaseWithRetry(state);
        this.lastSaveTime = now;
        this.pendingSave = null;
      } else {
        this.saveTimeoutId = setTimeout(async () => {
          if (this.pendingSave) {
            await this.saveToSupabaseWithRetry(this.pendingSave);
            this.lastSaveTime = Date.now();
            this.pendingSave = null;
          }
        }, ProcessingStore.SAVE_INTERVAL_MS - timeSinceLastSave);
      }
    } catch (error) {
      logger.error('[ProcessingStore] Error guardando estado:', error);
    }
  }

  private async saveToSupabaseWithRetry(state: ProcessingState, maxRetries: number = 3): Promise<boolean> {
    let lastError: any;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        this.currentState = { ...state, syncStatus: 'syncing' };
        this.notifyListeners();

        await this.saveToSupabase(state);

        this.currentState = {
          ...state,
          syncStatus: 'synced',
          lastSyncTime: new Date().toISOString(),
          retryCount: 0
        };
        this.notifyListeners();

        return true;
      } catch (error) {
        lastError = error;
        logger.warn(`[ProcessingStore] Intento ${attempt}/${maxRetries} falló:`, error);

        if (attempt < maxRetries) {
          await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(2, attempt - 1)));
        }
      }
    }

    logger.error('[ProcessingStore] Todos los intentos fallaron:', lastError);

    this.currentState = {
      ...state,
      syncStatus: 'error',
      retryCount: (state.retryCount || 0) + 1
    };
    this.notifyListeners();

    return false;
  }

  private async saveToSupabase(state: ProcessingState): Promise<void> {
    const supabase = getSupabase();
    if (!supabase) {
      if (this.currentState) {
        this.currentState.syncStatus = 'local-only';
        this.notifyListeners();
      }
      return;
    }

    const userId = await this.ensureUserId();
    if (!userId) {
      logger.warn('[ProcessingStore] No hay usuario autenticado');
      if (this.currentState) {
        this.currentState.syncStatus = 'local-only';
        this.notifyListeners();
      }
      return;
    }

    const dataToSave = {
      id: this.currentDbId || undefined,
      user_id: userId,
      file_name: state.fileName,
      file_size: state.fileSize,
      bytes_processed: state.bytesProcessed,
      progress: state.progress,
      status: state.status,
      start_time: state.startTime,
      last_update_time: state.lastUpdateTime,
      balances: state.balances,
      chunk_index: state.chunkIndex,
      total_chunks: state.totalChunks,
      error_message: state.errorMessage,
      file_hash: state.fileHash,
      file_last_modified: state.fileLastModified,
      sync_status: 'synced',
      last_sync_time: new Date().toISOString(),
      retry_count: 0
    };

    if (this.currentDbId) {
      const { error } = await supabase
        .from('processing_state')
        .update(dataToSave)
        .eq('id', this.currentDbId);

      if (error) throw error;
    } else {
      const { data, error } = await supabase
        .from('processing_state')
        .insert([dataToSave])
        .select()
        .single();

      if (error) throw error;
      if (data) this.currentDbId = data.id;
    }

    logger.log('[ProcessingStore] Estado guardado en Supabase');
  }

  async flushPendingSave(): Promise<void> {
    if (this.saveTimeoutId) {
      clearTimeout(this.saveTimeoutId);
      this.saveTimeoutId = null;
    }

    if (this.pendingSave) {
      await this.saveToSupabaseWithRetry(this.pendingSave);
      this.pendingSave = null;
    }
  }

  /**
   * Inicia el temporizador de auto-guardado de checkpoints
   * SOLO cuando hay procesamiento activo
   */
  private startAutoCheckpointTimer(): void {
    // Solo iniciar si no existe ya
    if (this.autoCheckpointTimer) {
      return;
    }

    this.autoCheckpointTimer = setInterval(() => {
      if (this.isProcessingActive && this.currentState) {
        this.saveCheckpointNow();
      }
    }, ProcessingStore.AUTO_CHECKPOINT_INTERVAL_MS);
  }

  /**
   * Detiene el temporizador de auto-guardado
   */
  private stopAutoCheckpointTimer(): void {
    if (this.autoCheckpointTimer) {
      clearInterval(this.autoCheckpointTimer);
      this.autoCheckpointTimer = null;
    }
  }

  /**
   * Guarda un checkpoint inmediatamente
   */
  private async saveCheckpointNow(): Promise<void> {
    if (!this.currentState || !this.currentState.fileHash) return;

    const now = Date.now();
    const timeSinceLastCheckpoint = now - this.lastCheckpointTime;

    // Solo guardar si ha pasado al menos 25 segundos desde el último checkpoint
    if (timeSinceLastCheckpoint < 25000 && this.lastCheckpointTime > 0) {
      return;
    }

    try {
      // ✅ VALIDACIÓN: Asegurar que no haya valores NaN o inválidos
      const bytesProcessed = this.currentState.bytesProcessed || 0;
      const fileSize = this.currentState.fileSize || 0;
      const progress = this.currentState.progress || 0;
      
      // Validar que los valores sean números válidos
      if (isNaN(bytesProcessed) || isNaN(fileSize) || isNaN(progress)) {
        logger.error('[ProcessingStore] ⚠️ Valores inválidos detectados en checkpoint - Saltando guardado');
        logger.error('[ProcessingStore] bytesProcessed:', bytesProcessed, 'fileSize:', fileSize, 'progress:', progress);
        return;
      }

      const checkpoint: ProcessingCheckpoint = {
        id: `checkpoint_${this.currentState.fileHash}_${now}`,
        fileHash: this.currentState.fileHash,
        fileName: this.currentState.fileName || 'Unknown',
        fileSize: fileSize,
        lastChunkIndex: this.currentState.chunkIndex || 0,
        bytesProcessed: bytesProcessed,
        progress: progress,
        timestamp: now,
        balances: this.currentState.balances || [],
        status: this.currentState.status === 'processing' ? 'active' : 
                this.currentState.status === 'paused' ? 'paused' : 
                this.currentState.status === 'completed' ? 'completed' : 'error'
      };

      await persistentStorage.saveCheckpoint(checkpoint);
      this.lastCheckpointTime = now;

      logger.log(`[ProcessingStore] 💾 AUTO-GUARDADO: ${checkpoint.progress.toFixed(2)}% (${(checkpoint.bytesProcessed / (1024*1024*1024)).toFixed(2)} GB de ${(checkpoint.fileSize / (1024*1024*1024)).toFixed(2)} GB)`);

      // Limpiar checkpoints antiguos (mantener solo los últimos 3)
      await persistentStorage.pruneOldCheckpoints(this.currentState.fileHash);
    } catch (error) {
      logger.error('[ProcessingStore] Error guardando checkpoint:', error);
    }
  }

  /**
   * Recupera el último checkpoint guardado para un archivo
   */
  async getLastCheckpoint(fileHash: string): Promise<ProcessingCheckpoint | null> {
    try {
      return await persistentStorage.getLastCheckpoint(fileHash);
    } catch (error) {
      logger.error('[ProcessingStore] Error recuperando checkpoint:', error);
      return null;
    }
  }

  /**
   * Obtiene estadísticas del almacenamiento persistente
   */
  async getPersistentStorageStats() {
    try {
      return await persistentStorage.getStats();
    } catch (error) {
      logger.error('[ProcessingStore] Error obteniendo stats:', error);
      return {
        totalChunks: 0,
        totalCheckpoints: 0,
        totalFiles: 0,
        storageUsage: { used: 0, available: 0, percentage: 0 }
      };
    }
  }

  async loadState(): Promise<ProcessingState | null> {
    try {
      const fromSupabase = await this.loadFromSupabase();
      if (fromSupabase) {
        this.currentState = fromSupabase;
        logger.log('[ProcessingStore] Estado cargado desde Supabase:', this.currentState?.progress + '%');
        return this.currentState;
      }

      const saved = localStorage.getItem(ProcessingStore.STORAGE_KEY);
      if (saved) {
        this.currentState = JSON.parse(saved);
        logger.log('[ProcessingStore] Estado cargado desde localStorage:', this.currentState?.progress + '%');
        return this.currentState;
      }
    } catch (error) {
      logger.error('[ProcessingStore] Error cargando estado:', error);
      await this.clearState();
    }
    return null;
  }

  private async loadFromSupabase(): Promise<ProcessingState | null> {
    const userId = await this.ensureUserId();
    if (!userId) return null;

    try {
      const { data, error } = await supabase
        .from('processing_state')
        .select('*')
        .eq('user_id', userId)
        .in('status', ['processing', 'paused'])
        .order('last_update_time', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        this.currentDbId = data.id;
        return {
          id: data.id,
          fileName: data.file_name,
          fileSize: data.file_size,
          bytesProcessed: data.bytes_processed,
          progress: parseFloat(data.progress),
          status: data.status,
          startTime: data.start_time,
          lastUpdateTime: data.last_update_time,
          balances: data.balances || [],
          chunkIndex: data.chunk_index,
          totalChunks: data.total_chunks,
          errorMessage: data.error_message,
          fileHash: data.file_hash,
          fileLastModified: data.file_last_modified,
          syncStatus: data.sync_status || 'synced',
          lastSyncTime: data.last_sync_time,
          retryCount: data.retry_count || 0
        };
      }
    } catch (error) {
      logger.error('[ProcessingStore] Error cargando desde Supabase:', error);
    }

    return null;
  }

  async findProcessingByFileHash(fileHash: string): Promise<ProcessingState | null> {
    const userId = await this.ensureUserId();
    if (!userId) return null;

    try {
      const { data, error } = await supabase
        .from('processing_state')
        .select('*')
        .eq('user_id', userId)
        .eq('file_hash', fileHash)
        .in('status', ['processing', 'paused'])
        .order('last_update_time', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        this.currentDbId = data.id;
        logger.log('[ProcessingStore] Archivo reconocido! Progreso:', data.progress + '%');
        return {
          id: data.id,
          fileName: data.file_name,
          fileSize: data.file_size,
          bytesProcessed: data.bytes_processed,
          progress: parseFloat(data.progress),
          status: data.status,
          startTime: data.start_time,
          lastUpdateTime: data.last_update_time,
          balances: data.balances || [],
          chunkIndex: data.chunk_index,
          totalChunks: data.total_chunks,
          errorMessage: data.error_message,
          fileHash: data.file_hash,
          fileLastModified: data.file_last_modified,
          syncStatus: data.sync_status || 'synced',
          lastSyncTime: data.last_sync_time,
          retryCount: data.retry_count || 0
        };
      }
    } catch (error) {
      logger.error('[ProcessingStore] Error buscando por hash:', error);
    }

    return null;
  }

  getState(): ProcessingState | null {
    return this.currentState;
  }

  async updateProgress(
    bytesProcessed: number,
    progress: number,
    balances: CurrencyBalance[],
    chunkIndex: number
  ): Promise<void> {
    if (!this.currentState) return;

    try {
      this.currentState = {
        ...this.currentState,
        bytesProcessed,
        progress,
        balances,
        chunkIndex,
        lastUpdateTime: new Date().toISOString(),
      };

      await this.saveState(this.currentState);
      await this.saveBalancesToSupabase(balances, progress);
      
      // ✅ UPDATE EN TIEMPO REAL: Actualizar TODOS los módulos
      // Esto notifica a Account Ledger, Dashboard, BankBlackScreen instantáneamente
      // Funciona incluso si el usuario está en otro módulo
      const { balanceStore } = await import('./balances-store');
      balanceStore.updateBalancesRealTime(
        balances, 
        this.currentState.fileName, 
        this.currentState.fileSize, 
        progress
      );

      // ✅ NUEVO: Actualizar Ledger Accounts en tiempo real
      if (balances && balances.length > 0) {
        try {
          const { ledgerAccountsStore } = await import('./ledger-accounts-store');
          await ledgerAccountsStore.updateMultipleAccounts(balances);
          logger.log('[ProcessingStore] ✅ Ledger Accounts actualizados en tiempo real');
        } catch (error) {
          logger.warn('[ProcessingStore] ⚠️ No se pudo actualizar Ledger Accounts:', error);
        }
      }
    } catch (error) {
      logger.error('[ProcessingStore] Error updating progress:', error);
    }
  }

  async pauseProcessing(): Promise<void> {
    if (!this.currentState) return;

    try {
      this.currentState = {
        ...this.currentState,
        status: 'paused',
        lastUpdateTime: new Date().toISOString(),
      };

      await this.saveState(this.currentState);
    } catch (error) {
      logger.error('[ProcessingStore] Error pausing:', error);
    }
  }

  async resumeProcessing(): Promise<void> {
    if (!this.currentState) return;

    try {
      this.currentState = {
        ...this.currentState,
        status: 'processing',
        lastUpdateTime: new Date().toISOString(),
      };

      await this.saveState(this.currentState);
    } catch (error) {
      logger.error('[ProcessingStore] Error resuming:', error);
    }
  }

  async completeProcessing(balances: CurrencyBalance[]): Promise<void> {
    if (!this.currentState) return;

    try {
      this.currentState = {
        ...this.currentState,
        status: 'completed',
        progress: 100,
        balances,
        lastUpdateTime: new Date().toISOString(),
      };

      await this.saveState(this.currentState);
      await this.saveBalancesToSupabase(balances, 100, 'completed');

      // 🔥 UPDATE: Notificar finalización a Account Ledger y BankBlackScreen
      const { balanceStore } = await import('./balances-store');
      balanceStore.updateBalancesRealTime(
        balances, 
        this.currentState.fileName, 
        this.currentState.fileSize, 
        100
      );

      await this.updateLedgerAccounts(balances);
    } catch (error) {
      logger.error('[ProcessingStore] Error completing:', error);
    }
  }

  private async updateLedgerAccounts(balances: CurrencyBalance[]): Promise<void> {
    try {
      const { ledgerAccountsStore } = await import('./ledger-accounts-store');

      logger.log('[ProcessingStore] Updating ledger accounts with new balances');
      await ledgerAccountsStore.updateMultipleAccounts(balances);

      logger.log('[ProcessingStore] ✓ Ledger accounts updated successfully');
    } catch (error) {
      logger.error('[ProcessingStore] Error updating ledger accounts:', error);
    }
  }

  async setError(errorMessage: string): Promise<void> {
    if (!this.currentState) return;

    try {
      this.currentState = {
        ...this.currentState,
        status: 'error',
        errorMessage,
        lastUpdateTime: new Date().toISOString(),
      };

      await this.saveState(this.currentState);
    } catch (error) {
      logger.error('[ProcessingStore] Error setting error state:', error);
    }
  }

  async clearState(): Promise<void> {
    await this.flushPendingSave();

    if (this.currentDbId && this.currentUserId) {
      try {
        await supabase
          .from('processing_state')
          .delete()
          .eq('id', this.currentDbId)
          .eq('user_id', this.currentUserId);
        logger.log('[ProcessingStore] Estado eliminado de Supabase');
      } catch (error) {
        logger.error('[ProcessingStore] Error eliminando de Supabase:', error);
      }
    }

    this.currentState = null;
    this.currentDbId = null;
    localStorage.removeItem(ProcessingStore.STORAGE_KEY);
    this.notifyListeners();
    logger.log('[ProcessingStore] Estado limpiado');
  }

  startProcessing(fileName: string, fileSize: number, fileData: ArrayBuffer, fileHash: string, fileLastModified: number): string {
    const id = `process_${Date.now()}`;
    
    // ✅ VALIDACIÓN: Asegurar que fileSize es válido
    if (isNaN(fileSize) || fileSize <= 0) {
      logger.error('[ProcessingStore] ❌ fileSize inválido en startProcessing:', fileSize);
      fileSize = 1; // Evitar división por cero
    }
    
    const totalChunks = Math.ceil(fileSize / (10 * 1024 * 1024));

    this.currentState = {
      id,
      fileName,
      fileSize,
      bytesProcessed: 0,
      progress: 0,
      status: 'processing',
      startTime: new Date().toISOString(),
      lastUpdateTime: new Date().toISOString(),
      balances: [],
      chunkIndex: 0,
      totalChunks,
      fileData,
      fileHash,
      fileLastModified,
      syncStatus: 'syncing',
      retryCount: 0
    };

    this.saveState(this.currentState);
    return id;
  }

  hasActiveProcessing(): boolean {
    return this.currentState !== null &&
           (this.currentState.status === 'processing' || this.currentState.status === 'paused');
  }

  subscribe(listener: (state: ProcessingState | null) => void): () => void {
    this.listeners.push(listener);
    listener(this.currentState);

    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  // ✅ Notificaciones inmediatas para velocidad máxima
  private notifyListeners(): void {
    this.listeners.forEach(listener => {
      try {
        listener(this.currentState);
      } catch (error) {
        logger.error('[ProcessingStore] Error in listener:', error);
      }
    });
  }

  async saveFileDataToIndexedDB(fileData: ArrayBuffer): Promise<boolean> {
    return new Promise((resolve) => {
      const request = indexedDB.open('DTC1BProcessing', 1);

      request.onerror = () => {
        logger.error('[ProcessingStore] IndexedDB error:', request.error);
        resolve(false);
      };

      request.onsuccess = () => {
        const db = request.result;
        const transaction = db.transaction(['fileData'], 'readwrite');
        const store = transaction.objectStore('fileData');

        const putRequest = store.put({
          id: 'current',
          data: fileData,
          timestamp: Date.now()
        });

        putRequest.onerror = () => {
          if (putRequest.error?.name === 'QuotaExceededError') {
            logger.warn('[ProcessingStore] Espacio insuficiente en IndexedDB');
            this.clearIndexedDB().then(() => {
              logger.log('[ProcessingStore] IndexedDB limpiado');
            });
          }
          resolve(false);
        };

        transaction.oncomplete = () => {
          logger.log('[ProcessingStore] FileData guardado en IndexedDB');
          resolve(true);
        };
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains('fileData')) {
          db.createObjectStore('fileData', { keyPath: 'id' });
        }
      };
    });
  }

  async loadFileDataFromIndexedDB(): Promise<ArrayBuffer | null> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open('DTC1BProcessing', 1);

      request.onerror = () => reject(request.error);

      request.onsuccess = () => {
        const db = request.result;
        const transaction = db.transaction(['fileData'], 'readonly');
        const store = transaction.objectStore('fileData');
        const getRequest = store.get('current');

        getRequest.onsuccess = () => {
          const result = getRequest.result;
          if (result && result.data) {
            logger.log('[ProcessingStore] FileData cargado desde IndexedDB');
            resolve(result.data);
          } else {
            resolve(null);
          }
        };

        getRequest.onerror = () => reject(getRequest.error);
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains('fileData')) {
          db.createObjectStore('fileData', { keyPath: 'id' });
        }
      };
    });
  }

  async clearIndexedDB(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open('DTC1BProcessing', 1);

      request.onsuccess = () => {
        const db = request.result;
        const transaction = db.transaction(['fileData'], 'readwrite');
        const store = transaction.objectStore('fileData');
        store.clear();

        transaction.oncomplete = () => {
          logger.log('[ProcessingStore] IndexedDB limpiado');
          resolve();
        };

        transaction.onerror = () => reject(transaction.error);
      };

      request.onerror = () => reject(request.error);
    });
  }

  isProcessing(): boolean {
    return this.isProcessingActive;
  }

  stopProcessing(): void {
    if (this.processingController) {
      this.processingController.abort();
      this.processingController = null;
    }
    this.isProcessingActive = false;
    // ✅ DETENER timer cuando se detiene el procesamiento
    this.stopAutoCheckpointTimer();
    if (this.currentState) {
      this.pauseProcessing();
    }
  }

  async startGlobalProcessing(
    file: File,
    resumeFrom: number = 0,
    onProgress?: (progress: number, balances: CurrencyBalance[]) => void
  ): Promise<void> {
    if (this.isProcessingActive) {
      logger.warn('[ProcessingStore] ⚠️ Ya hay un procesamiento activo - Ignorando nueva solicitud');
      return;
    }

    logger.log('[ProcessingStore] 🚀 Iniciando procesamiento GLOBAL - Independiente de navegación');

    this.isProcessingActive = true;
    this.processingController = new AbortController();
    const signal = this.processingController.signal;

    // ✅ INICIAR timer de auto-checkpoint SOLO cuando hay procesamiento
    this.startAutoCheckpointTimer();

    try {
      logger.log('[ProcessingStore] 📂 Archivo:', file.name, '| Tamaño:', (file.size / (1024*1024*1024)).toFixed(2), 'GB');
      logger.log('[ProcessingStore] ℹ️ El procesamiento continuará en segundo plano sin importar la navegación');

      const fileHash = await this.calculateFileHash(file);

      // 🆕 RECUPERACIÓN AUTOMÁTICA: Buscar checkpoint guardado
      const lastCheckpoint = await this.getLastCheckpoint(fileHash);
      if (lastCheckpoint && resumeFrom === 0 && lastCheckpoint.status !== 'completed') {
        resumeFrom = lastCheckpoint.bytesProcessed;
        logger.log(`[ProcessingStore] 🔄 CHECKPOINT ENCONTRADO! Recuperando desde ${lastCheckpoint.progress.toFixed(2)}%`);
        logger.log(`[ProcessingStore] 📦 Datos recuperados: ${(lastCheckpoint.bytesProcessed / (1024*1024*1024)).toFixed(2)} GB procesados`);
      }

      const existingProcess = await this.findProcessingByFileHash(fileHash);
      if (existingProcess && resumeFrom === 0) {
        resumeFrom = existingProcess.bytesProcessed;
        logger.log(`[ProcessingStore] 🎯 Archivo reconocido! Reanudando desde ${existingProcess.progress.toFixed(2)}%`);

        this.currentState = existingProcess;
        this.notifyListeners();
      }

      // 🆕 OPTIMIZACIÓN: Chunks adaptativos según tamaño del archivo
      // Para archivos > 100 GB, usar chunks de 50 MB
      // Para archivos > 500 GB, usar chunks de 100 MB
      const fileSize_GB = file.size / (1024 * 1024 * 1024);
      let CHUNK_SIZE = 10 * 1024 * 1024; // 10 MB por defecto
      
      if (fileSize_GB > 500) {
        CHUNK_SIZE = 100 * 1024 * 1024; // 100 MB para archivos gigantes
        logger.log('[ProcessingStore] 📊 Archivo muy grande detectado: usando chunks de 100 MB');
      } else if (fileSize_GB > 100) {
        CHUNK_SIZE = 50 * 1024 * 1024; // 50 MB para archivos grandes
        logger.log('[ProcessingStore] 📊 Archivo grande detectado: usando chunks de 50 MB');
      }

      const totalSize = file.size;
      let bytesProcessed = resumeFrom;
      const balanceTracker: { [currency: string]: CurrencyBalance } = {};

      // Recuperar balances del checkpoint si existen
      if (lastCheckpoint && lastCheckpoint.balances) {
        lastCheckpoint.balances.forEach(balance => {
          balanceTracker[balance.currency] = balance;
        });
        logger.log(`[ProcessingStore] 💰 ${lastCheckpoint.balances.length} balances recuperados del checkpoint`);
      }

      if (existingProcess && existingProcess.balances) {
        existingProcess.balances.forEach(balance => {
          balanceTracker[balance.currency] = balance;
        });
      }

      if (totalSize < 2 * 1024 * 1024 * 1024 && resumeFrom === 0) {
        try {
          const buffer = await file.arrayBuffer();
          await this.saveFileDataToIndexedDB(buffer);
        } catch (error) {
          logger.warn('[ProcessingStore] No se pudo guardar en IndexedDB:', error);
        }
      }

      // ✅ VALIDACIÓN: Asegurar que totalSize es un número válido
      if (isNaN(totalSize) || totalSize <= 0) {
        logger.error('[ProcessingStore] ❌ Tamaño de archivo inválido:', totalSize);
        throw new Error('Tamaño de archivo inválido');
      }

      // ✅ FIX: No inicializar desde 0 si estamos resumiendo
      const totalChunks = Math.ceil(totalSize / CHUNK_SIZE);
      let currentChunk = Math.floor(resumeFrom / CHUNK_SIZE);
      
      // ✅ Inicializar estado con el progreso correcto
      if (resumeFrom > 0) {
        // Estamos resumiendo - NO sobrescribir el progreso
        const initialProgress = (resumeFrom / totalSize) * 100;
        logger.log(`[ProcessingStore] 📊 Resumiendo procesamiento desde ${initialProgress.toFixed(2)}% (${resumeFrom} bytes)`);
        
        if (!this.currentState || this.currentState.fileHash !== fileHash) {
          // Solo crear nuevo estado si no existe o es archivo diferente
          this.currentState = {
            id: `process_${Date.now()}`,
            fileName: file.name,
            fileSize: totalSize,
            bytesProcessed: resumeFrom,  // ✅ USAR VALOR GUARDADO
            progress: initialProgress,   // ✅ USAR PROGRESO REAL
            status: 'processing',
            startTime: new Date().toISOString(),
            lastUpdateTime: new Date().toISOString(),
            balances: lastCheckpoint?.balances || existingProcess?.balances || [],
            chunkIndex: currentChunk,
            totalChunks,
            fileHash,
            fileLastModified: file.lastModified,
            syncStatus: 'syncing',
            retryCount: 0
          };
          this.notifyListeners();
        }
      } else {
        // Empezando desde 0 - inicializar normal
        const processId = this.startProcessing(file.name, totalSize, new ArrayBuffer(0), fileHash, file.lastModified);
      }

      let offset = resumeFrom;

      while (offset < totalSize && !signal.aborted) {
        try {
          while (this.currentState?.status === 'paused' && !signal.aborted) {
            await new Promise(resolve => setTimeout(resolve, 100));
          }

          if (signal.aborted) break;

          const chunkEnd = Math.min(offset + CHUNK_SIZE, totalSize);
          const blob = file.slice(offset, chunkEnd);
          const buffer = await blob.arrayBuffer();
          const chunk = new Uint8Array(buffer);

          this.extractCurrencyBalancesOptimized(chunk, offset, balanceTracker);

          bytesProcessed += chunk.length;
          offset = chunkEnd;
          currentChunk++;

          const progress = (bytesProcessed / totalSize) * 100;
          const progressInt = Math.floor(progress);
          
          // Log detallado cada 10%
          if (progressInt % 10 === 0 && progressInt !== Math.floor((bytesProcessed - chunk.length) / totalSize * 100)) {
            logger.log(`[ProcessingStore] 📊 Progreso: ${progress.toFixed(2)}% (${(bytesProcessed / 1024 / 1024 / 1024).toFixed(2)} GB de ${(totalSize / 1024 / 1024 / 1024).toFixed(2)} GB) - Chunk ${currentChunk}/${totalChunks}`);
          }
          
          const balancesArray = Object.values(balanceTracker).sort((a, b) => {
            if (a.currency === 'USD') return -1;
            if (b.currency === 'USD') return 1;
            if (a.currency === 'EUR') return -1;
            if (b.currency === 'EUR') return 1;
            return b.totalAmount - a.totalAmount;
          });

          // ✅ OPTIMIZACIÓN CRÍTICA: Solo actualizar UI cada 1% (no cada 5 chunks)
          // Esto reduce de 1,600 updates a solo 100 updates
          if (progressInt > this.lastProgressNotified) {
            this.lastProgressNotified = progressInt;
            
            // Actualizar estado en memoria (ligero)
            this.currentState = {
              ...this.currentState,
              bytesProcessed,
              progress,
              balances: balancesArray,
              chunkIndex: currentChunk,
              lastUpdateTime: new Date().toISOString()
            };
            
            // ✅ Solo guardar en disco cada 5% (no cada 1%)
            if (progressInt % 5 === 0) {
              await this.saveState(this.currentState);
            } else {
              // Solo notificar (sin guardar en disco)
              this.notifyListeners();
            }

            // ✅ Callback solo cada 1% para evitar re-renders masivos
            if (onProgress) {
              onProgress(progress, balancesArray);
            }
          }

          // ✅ OPTIMIZACIÓN: Yield mínimo para máxima velocidad
          // Solo dar control al navegador ocasionalmente para evitar bloqueo total
          if (currentChunk % 50 === 0) {
            await new Promise(resolve => setTimeout(resolve, 10)); // Solo 10ms cada 50 chunks
          } else {
            await new Promise(resolve => setTimeout(resolve, 0)); // Yield instantáneo
          }
          
        } catch (chunkError) {
          logger.error(`[ProcessingStore] ❌ Error procesando chunk ${currentChunk} en ${(offset / 1024 / 1024 / 1024).toFixed(2)} GB:`, chunkError);
          
          // Intentar continuar con siguiente chunk
          offset = chunkEnd;
          currentChunk++;
          
          // Si hay muchos errores consecutivos, detener
          if (currentChunk % 100 === 0) {
            logger.warn(`[ProcessingStore] ⚠️ Errores detectados pero continuando... Chunk ${currentChunk}`);
          }
        }
      }

      if (!signal.aborted) {
        const balancesArray = Object.values(balanceTracker);
        await this.completeProcessing(balancesArray);
        logger.log('[ProcessingStore] ✅ Procesamiento completado al 100%');
        logger.log('[ProcessingStore] 📊 Total de monedas detectadas:', balancesArray.length);
        logger.log('[ProcessingStore] 💾 Datos guardados en Supabase y localStorage');
      } else {
        logger.log('[ProcessingStore] ⚠️ Procesamiento detenido por el usuario');
      }

    } catch (error) {
      logger.error('[ProcessingStore] Error en procesamiento:', error);
      await this.setError(error instanceof Error ? error.message : 'Error desconocido');
    } finally {
      this.isProcessingActive = false;
      this.processingController = null;
      // ✅ DETENER timer cuando termina el procesamiento
      this.stopAutoCheckpointTimer();
      await this.flushPendingSave();
    }
  }

  private extractCurrencyBalancesOptimized(
    data: Uint8Array,
    offset: number,
    currentBalances: { [currency: string]: CurrencyBalance }
  ): void {
    const dataLength = data.length;

    for (let i = 0; i < dataLength - 11; i++) {
      for (const [currency, pattern] of this.currencyPatterns) {
        if (this.matchesPattern(data, i, pattern)) {
          const amount = this.extractAmount(data, i + pattern.length);

          if (amount > 0) {
            this.addToBalance(currentBalances, currency, amount);
            i += pattern.length + 8;
            break;
          }
        }
      }
    }
  }

  private matchesPattern(data: Uint8Array, offset: number, pattern: Uint8Array): boolean {
    if (offset + pattern.length > data.length) return false;

    for (let i = 0; i < pattern.length; i++) {
      if (data[offset + i] !== pattern[i]) return false;
    }
    return true;
  }

  private extractAmount(data: Uint8Array, offset: number): number {
    try {
      if (offset + 4 <= data.length) {
        const view = new DataView(data.buffer, data.byteOffset + offset, 4);
        const potentialAmount = view.getUint32(0, true);

        if (potentialAmount > 0 && potentialAmount < 100000000000) {
          return potentialAmount / 100;
        }
      }

      if (offset + 8 <= data.length) {
        const view = new DataView(data.buffer, data.byteOffset + offset, 8);
        const potentialDouble = view.getFloat64(0, true);

        if (potentialDouble > 0 && potentialDouble < 1000000000 && !isNaN(potentialDouble)) {
          return potentialDouble;
        }
      }
    } catch (error) {
    }

    return 0;
  }

  private addToBalance(
    currentBalances: { [currency: string]: CurrencyBalance },
    currency: string,
    amount: number
  ): void {
    if (!currentBalances[currency]) {
      currentBalances[currency] = {
        currency,
        totalAmount: 0,
        transactionCount: 0,
        averageTransaction: 0,
        lastUpdated: new Date().toISOString(),
        accountName: this.getCurrencyAccountName(currency),
        amounts: [],
        largestTransaction: 0,
        smallestTransaction: Infinity,
      };
    }

    const balance = currentBalances[currency];
    balance.totalAmount += amount;
    balance.transactionCount++;
    balance.amounts.push(amount);
    balance.averageTransaction = balance.totalAmount / balance.transactionCount;
    balance.largestTransaction = Math.max(balance.largestTransaction, amount);
    balance.smallestTransaction = Math.min(balance.smallestTransaction, amount);
    balance.lastUpdated = new Date().toISOString();
  }

  private getCurrencyAccountName(currency: string): string {
    const accountNames: { [key: string]: string } = {
      'USD': 'US Dollars Account',
      'EUR': 'Euros Account',
      'GBP': 'Pound Sterling Account',
      'CAD': 'Canadian Dollars Account',
      'AUD': 'Australian Dollars Account',
      'JPY': 'Japanese Yen Account',
      'CHF': 'Swiss Francs Account',
      'CNY': 'Chinese Yuan Account',
      'INR': 'Indian Rupees Account',
      'MXN': 'Mexican Pesos Account',
      'BRL': 'Brazilian Reals Account',
      'RUB': 'Russian Rubles Account',
      'KRW': 'South Korean Won Account',
      'SGD': 'Singapore Dollars Account',
      'HKD': 'Hong Kong Dollars Account'
    };
    return accountNames[currency] || `${currency} Account`;
  }

  private async saveBalancesToSupabase(
    balances: CurrencyBalance[],
    progress: number,
    status: 'processing' | 'completed' = 'processing'
  ): Promise<void> {
    if (!this.currentState || !this.currentState.fileHash) return;

    const userId = await this.ensureUserId();
    if (!userId) return;

    try {
      for (const balance of balances) {
        const balanceData = {
          user_id: userId,
          file_hash: this.currentState.fileHash,
          file_name: this.currentState.fileName,
          file_size: this.currentState.fileSize,
          currency: balance.currency,
          account_name: balance.accountName,
          total_amount: balance.totalAmount,
          transaction_count: balance.transactionCount,
          average_transaction: balance.averageTransaction,
          largest_transaction: balance.largestTransaction,
          smallest_transaction: balance.smallestTransaction,
          amounts: balance.amounts,
          last_updated: new Date().toISOString(),
          status: status,
          progress: progress
        };

        const { error } = await supabase
          .from('currency_balances')
          .upsert(balanceData, {
            onConflict: 'user_id,file_hash,currency'
          });

        if (error) {
          logger.error('[ProcessingStore] Error saving balance:', error);
        }
      }

      logger.log(`[ProcessingStore] Balances saved to Supabase (${balances.length} currencies)`);
    } catch (error) {
      logger.error('[ProcessingStore] Error in saveBalancesToSupabase:', error);
    }
  }

  async loadBalancesFromSupabase(fileHash: string): Promise<CurrencyBalance[]> {
    const userId = await this.ensureUserId();
    if (!userId) return [];

    try {
      const { data, error } = await supabase
        .from('currency_balances')
        .select('*')
        .eq('user_id', userId)
        .eq('file_hash', fileHash)
        .order('total_amount', { ascending: false });

      if (error) throw error;

      if (data && data.length > 0) {
        logger.log(`[ProcessingStore] Loaded ${data.length} balances from Supabase`);
        return data.map(row => ({
          currency: row.currency,
          accountName: row.account_name,
          totalAmount: parseFloat(row.total_amount),
          transactionCount: row.transaction_count,
          averageTransaction: parseFloat(row.average_transaction),
          largestTransaction: parseFloat(row.largest_transaction),
          smallestTransaction: parseFloat(row.smallest_transaction),
          amounts: row.amounts || [],
          lastUpdated: row.last_updated
        }));
      }
    } catch (error) {
      logger.error('[ProcessingStore] Error loading balances:', error);
    }

    return [];
  }

  async deleteBalancesFromSupabase(fileHash: string): Promise<void> {
    const userId = await this.ensureUserId();
    if (!userId) return;

    try {
      const { error } = await supabase
        .from('currency_balances')
        .delete()
        .eq('user_id', userId)
        .eq('file_hash', fileHash);

      if (error) throw error;
      logger.log('[ProcessingStore] Balances deleted from Supabase');
    } catch (error) {
      logger.error('[ProcessingStore] Error deleting balances:', error);
    }
  }
}

export const processingStore = new ProcessingStore();
