/**
 * Persistent Storage Manager
 * Sistema de almacenamiento persistente en disco local usando IndexedDB
 * para manejar archivos grandes (hasta 800 GB) con recuperación automática
 */

import { logger } from './logger';

const DB_NAME = 'DigitalCommercialBank_PersistentStorage';
const DB_VERSION = 1;
const STORE_NAME = 'file_chunks';
const CHECKPOINTS_STORE = 'checkpoints';
const METADATA_STORE = 'metadata';

export interface FileChunk {
  id: string; // `${fileHash}_chunk_${index}`
  fileHash: string;
  chunkIndex: number;
  data: Uint8Array;
  size: number;
  timestamp: number;
  processed: boolean;
}

export interface ProcessingCheckpoint {
  id: string;
  fileHash: string;
  fileName: string;
  fileSize: number;
  lastChunkIndex: number;
  bytesProcessed: number;
  progress: number;
  timestamp: number;
  balances: any[];
  status: 'active' | 'paused' | 'completed' | 'error';
}

export interface FileMetadata {
  fileHash: string;
  fileName: string;
  fileSize: number;
  totalChunks: number;
  chunksStored: number;
  createdAt: number;
  lastAccessed: number;
}

class PersistentStorageManager {
  private db: IDBDatabase | null = null;
  private initPromise: Promise<void> | null = null;

  constructor() {
    this.initPromise = this.initialize();
  }

  private async initialize(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => {
        console.error('[PersistentStorage] Error al abrir IndexedDB:', request.error);
        reject(request.error);
      };

      request.onsuccess = () => {
        this.db = request.result;
        console.log('[PersistentStorage] ✅ IndexedDB inicializado correctamente');
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;

        // Store para chunks de archivos
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          const chunkStore = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
          chunkStore.createIndex('fileHash', 'fileHash', { unique: false });
          chunkStore.createIndex('chunkIndex', 'chunkIndex', { unique: false });
          chunkStore.createIndex('processed', 'processed', { unique: false });
        }

        // Store para checkpoints
        if (!db.objectStoreNames.contains(CHECKPOINTS_STORE)) {
          const checkpointStore = db.createObjectStore(CHECKPOINTS_STORE, { keyPath: 'id' });
          checkpointStore.createIndex('fileHash', 'fileHash', { unique: false });
          checkpointStore.createIndex('timestamp', 'timestamp', { unique: false });
        }

        // Store para metadata
        if (!db.objectStoreNames.contains(METADATA_STORE)) {
          const metadataStore = db.createObjectStore(METADATA_STORE, { keyPath: 'fileHash' });
          metadataStore.createIndex('lastAccessed', 'lastAccessed', { unique: false });
        }

        console.log('[PersistentStorage] 🔧 Base de datos creada/actualizada');
      };
    });
  }

  private async ensureInitialized(): Promise<void> {
    if (!this.initPromise) {
      this.initPromise = this.initialize();
    }
    await this.initPromise;
  }

  /**
   * Guarda un chunk de archivo en disco
   */
  async saveChunk(chunk: FileChunk): Promise<void> {
    await this.ensureInitialized();
    if (!this.db) throw new Error('IndexedDB no inicializado');

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.put(chunk);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Guarda múltiples chunks en lote (más eficiente)
   */
  async saveChunksBatch(chunks: FileChunk[]): Promise<void> {
    await this.ensureInitialized();
    if (!this.db) throw new Error('IndexedDB no inicializado');

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);

      let completed = 0;
      let hasError = false;

      chunks.forEach(chunk => {
        const request = store.put(chunk);
        request.onsuccess = () => {
          completed++;
          if (completed === chunks.length && !hasError) {
            resolve();
          }
        };
        request.onerror = () => {
          if (!hasError) {
            hasError = true;
            reject(request.error);
          }
        };
      });

      transaction.onerror = () => {
        if (!hasError) {
          hasError = true;
          reject(transaction.error);
        }
      };
    });
  }

  /**
   * Obtiene un chunk específico
   */
  async getChunk(fileHash: string, chunkIndex: number): Promise<FileChunk | null> {
    await this.ensureInitialized();
    if (!this.db) return null;

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORE_NAME], 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const id = `${fileHash}_chunk_${chunkIndex}`;
      const request = store.get(id);

      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Obtiene todos los chunks de un archivo
   */
  async getFileChunks(fileHash: string): Promise<FileChunk[]> {
    await this.ensureInitialized();
    if (!this.db) return [];

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORE_NAME], 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const index = store.index('fileHash');
      const request = index.getAll(fileHash);

      request.onsuccess = () => {
        const chunks = request.result || [];
        // Ordenar por chunkIndex
        chunks.sort((a, b) => a.chunkIndex - b.chunkIndex);
        resolve(chunks);
      };
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Guarda un checkpoint de procesamiento
   */
  async saveCheckpoint(checkpoint: ProcessingCheckpoint): Promise<void> {
    await this.ensureInitialized();
    if (!this.db) throw new Error('IndexedDB no inicializado');

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([CHECKPOINTS_STORE], 'readwrite');
      const store = transaction.objectStore(CHECKPOINTS_STORE);
      const request = store.put(checkpoint);

      request.onsuccess = () => {
        console.log(`[PersistentStorage] 💾 Checkpoint guardado: ${checkpoint.progress.toFixed(2)}%`);
        resolve();
      };
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Obtiene el último checkpoint de un archivo
   */
  async getLastCheckpoint(fileHash: string): Promise<ProcessingCheckpoint | null> {
    await this.ensureInitialized();
    if (!this.db) return null;

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([CHECKPOINTS_STORE], 'readonly');
      const store = transaction.objectStore(CHECKPOINTS_STORE);
      const index = store.index('fileHash');
      const request = index.getAll(fileHash);

      request.onsuccess = () => {
        const checkpoints = request.result || [];
        if (checkpoints.length === 0) {
          resolve(null);
          return;
        }
        // Ordenar por timestamp y obtener el más reciente
        checkpoints.sort((a, b) => b.timestamp - a.timestamp);
        resolve(checkpoints[0]);
      };
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Guarda metadata del archivo
   */
  async saveMetadata(metadata: FileMetadata): Promise<void> {
    await this.ensureInitialized();
    if (!this.db) throw new Error('IndexedDB no inicializado');

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([METADATA_STORE], 'readwrite');
      const store = transaction.objectStore(METADATA_STORE);
      const request = store.put(metadata);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Obtiene metadata de un archivo
   */
  async getMetadata(fileHash: string): Promise<FileMetadata | null> {
    await this.ensureInitialized();
    if (!this.db) return null;

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([METADATA_STORE], 'readonly');
      const store = transaction.objectStore(METADATA_STORE);
      const request = store.get(fileHash);

      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Elimina todos los chunks de un archivo
   */
  async deleteFileChunks(fileHash: string): Promise<void> {
    await this.ensureInitialized();
    if (!this.db) return;

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const index = store.index('fileHash');
      const request = index.openCursor(IDBKeyRange.only(fileHash));

      request.onsuccess = (event) => {
        const cursor = (event.target as IDBRequest).result;
        if (cursor) {
          cursor.delete();
          cursor.continue();
        } else {
          resolve();
        }
      };
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Elimina checkpoints antiguos (mantiene solo los últimos 3)
   */
  async pruneOldCheckpoints(fileHash: string): Promise<void> {
    await this.ensureInitialized();
    if (!this.db) return;

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([CHECKPOINTS_STORE], 'readwrite');
      const store = transaction.objectStore(CHECKPOINTS_STORE);
      const index = store.index('fileHash');
      const request = index.getAll(fileHash);

      request.onsuccess = () => {
        const checkpoints = request.result || [];
        if (checkpoints.length <= 3) {
          resolve();
          return;
        }

        // Ordenar por timestamp y eliminar los más antiguos
        checkpoints.sort((a, b) => b.timestamp - a.timestamp);
        const toDelete = checkpoints.slice(3);

        toDelete.forEach(checkpoint => {
          store.delete(checkpoint.id);
        });

        resolve();
      };
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Obtiene el espacio usado aproximado
   */
  async getStorageUsage(): Promise<{ used: number; available: number; percentage: number }> {
    try {
      if ('storage' in navigator && 'estimate' in navigator.storage) {
        const estimate = await navigator.storage.estimate();
        const used = estimate.usage || 0;
        const available = estimate.quota || 0;
        const percentage = available > 0 ? (used / available) * 100 : 0;
        
        return {
          used,
          available,
          percentage: Math.round(percentage * 100) / 100
        };
      }
      return { used: 0, available: 0, percentage: 0 };
    } catch (error) {
      console.error('[PersistentStorage] Error obteniendo uso de almacenamiento:', error);
      return { used: 0, available: 0, percentage: 0 };
    }
  }

  /**
   * Limpia todos los datos (usar con precaución)
   */
  async clearAll(): Promise<void> {
    await this.ensureInitialized();
    if (!this.db) return;

    const stores = [STORE_NAME, CHECKPOINTS_STORE, METADATA_STORE];
    
    for (const storeName of stores) {
      await new Promise<void>((resolve, reject) => {
        const transaction = this.db!.transaction([storeName], 'readwrite');
        const store = transaction.objectStore(storeName);
        const request = store.clear();

        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      });
    }

    console.log('[PersistentStorage] 🧹 Todos los datos eliminados');
  }

  /**
   * Obtiene estadísticas del almacenamiento
   */
  async getStats(): Promise<{
    totalChunks: number;
    totalCheckpoints: number;
    totalFiles: number;
    storageUsage: { used: number; available: number; percentage: number };
  }> {
    await this.ensureInitialized();
    if (!this.db) {
      return {
        totalChunks: 0,
        totalCheckpoints: 0,
        totalFiles: 0,
        storageUsage: { used: 0, available: 0, percentage: 0 }
      };
    }

    const [totalChunks, totalCheckpoints, totalFiles, storageUsage] = await Promise.all([
      this.countRecords(STORE_NAME),
      this.countRecords(CHECKPOINTS_STORE),
      this.countRecords(METADATA_STORE),
      this.getStorageUsage()
    ]);

    return { totalChunks, totalCheckpoints, totalFiles, storageUsage };
  }

  private async countRecords(storeName: string): Promise<number> {
    if (!this.db) return 0;

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([storeName], 'readonly');
      const store = transaction.objectStore(storeName);
      const request = store.count();

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }
}

export const persistentStorage = new PersistentStorageManager();

