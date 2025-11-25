/**
 * Analyzer Persistence Store
 * Sistema de persistencia robusto para el Analizador de Archivos Grandes
 * Guarda y recupera el progreso de análisis automáticamente
 */

import { type CurrencyBalance } from './balances-store';

interface AnalyzerProgressState {
  fileHash: string;
  fileName: string;
  fileSize: number;
  lastModified: number;
  progress: number;
  bytesProcessed: number;
  balances: CurrencyBalance[];
  timestamp: number;
  version: string;
}

const STORAGE_KEY = 'analyzer_progress_state';
const VERSION = '1.0.0';

class AnalyzerPersistenceStore {
  /**
   * Calcula un hash simple pero efectivo del archivo
   * Lee el inicio, medio y final del archivo para crear un identificador único
   */
  async calculateFileHash(file: File): Promise<string> {
    const chunkSize = 1024 * 64; // 64KB por chunk
    const chunks: Uint8Array[] = [];

    try {
      // Leer inicio del archivo
      const start = file.slice(0, chunkSize);
      const startBuffer = await start.arrayBuffer();
      chunks.push(new Uint8Array(startBuffer));

      // Leer medio del archivo
      const middle = file.slice(
        Math.floor(file.size / 2) - chunkSize / 2,
        Math.floor(file.size / 2) + chunkSize / 2
      );
      const middleBuffer = await middle.arrayBuffer();
      chunks.push(new Uint8Array(middleBuffer));

      // Leer final del archivo
      const end = file.slice(Math.max(0, file.size - chunkSize), file.size);
      const endBuffer = await end.arrayBuffer();
      chunks.push(new Uint8Array(endBuffer));

      // Crear hash simple pero efectivo
      let hash = 0;
      for (const chunk of chunks) {
        for (let i = 0; i < chunk.length; i++) {
          hash = ((hash << 5) - hash) + chunk[i];
          hash = hash & hash; // Convert to 32bit integer
        }
      }

      // Combinar con metadatos del archivo
      const combined = `${Math.abs(hash)}_${file.size}_${file.lastModified}_${file.name}`;
      return combined;
    } catch (error) {
      console.error('[AnalyzerPersistence] Error calculando hash:', error);
      // Fallback: usar solo metadatos
      return `${file.size}_${file.lastModified}_${file.name}`;
    }
  }

  /**
   * Guarda el estado actual del análisis
   */
  async saveProgress(
    file: File,
    progress: number,
    bytesProcessed: number,
    balances: CurrencyBalance[]
  ): Promise<void> {
    try {
      const fileHash = await this.calculateFileHash(file);
      
      const state: AnalyzerProgressState = {
        fileHash,
        fileName: file.name,
        fileSize: file.size,
        lastModified: file.lastModified,
        progress,
        bytesProcessed,
        balances: balances.map(b => ({
          ...b,
          // Asegurar que todos los campos estén serializados correctamente
          lastUpdate: b.lastUpdate || new Date().toISOString(),
          lastUpdated: b.lastUpdated || Date.now()
        })),
        timestamp: Date.now(),
        version: VERSION
      };

      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
      console.log(`[AnalyzerPersistence] 💾 Progreso guardado: ${progress.toFixed(2)}% | ${balances.length} divisas`);
    } catch (error) {
      console.error('[AnalyzerPersistence] Error guardando progreso:', error);
    }
  }

  /**
   * Intenta recuperar el progreso guardado para un archivo específico
   */
  async loadProgress(file: File): Promise<AnalyzerProgressState | null> {
    try {
      const fileHash = await this.calculateFileHash(file);
      const stored = localStorage.getItem(STORAGE_KEY);
      
      if (!stored) {
        console.log('[AnalyzerPersistence] No hay progreso guardado');
        return null;
      }

      const state: AnalyzerProgressState = JSON.parse(stored);

      // Verificar que el hash coincida
      if (state.fileHash !== fileHash) {
        console.log('[AnalyzerPersistence] Hash no coincide, archivo diferente');
        return null;
      }

      // Verificar que no sea muy antiguo (más de 7 días)
      const daysSinceLastUpdate = (Date.now() - state.timestamp) / (1000 * 60 * 60 * 24);
      if (daysSinceLastUpdate > 7) {
        console.log('[AnalyzerPersistence] Progreso muy antiguo, ignorando');
        this.clearProgress();
        return null;
      }

      console.log(`[AnalyzerPersistence] ✅ Progreso recuperado: ${state.progress.toFixed(2)}% | ${state.balances.length} divisas`);
      return state;
    } catch (error) {
      console.error('[AnalyzerPersistence] Error cargando progreso:', error);
      return null;
    }
  }

  /**
   * Verifica si existe progreso guardado sin necesidad de tener el archivo
   */
  hasProgress(): boolean {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored !== null;
  }

  /**
   * Obtiene información básica del progreso guardado sin verificar el archivo
   */
  getProgressInfo(): { fileName: string; progress: number; timestamp: number } | null {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (!stored) return null;

      const state: AnalyzerProgressState = JSON.parse(stored);
      return {
        fileName: state.fileName,
        progress: state.progress,
        timestamp: state.timestamp
      };
    } catch (error) {
      console.error('[AnalyzerPersistence] Error obteniendo info:', error);
      return null;
    }
  }

  /**
   * Borra el progreso guardado
   */
  clearProgress(): void {
    localStorage.removeItem(STORAGE_KEY);
    console.log('[AnalyzerPersistence] 🗑️ Progreso borrado');
  }

  /**
   * Auto-guardado inteligente (solo guarda si hay cambios significativos)
   */
  private lastSavedProgress: number = 0;
  private saveThrottle: number = 0; // Timestamp del último guardado

  async autoSave(
    file: File,
    progress: number,
    bytesProcessed: number,
    balances: CurrencyBalance[]
  ): Promise<void> {
    const now = Date.now();
    const progressDiff = Math.abs(progress - this.lastSavedProgress);
    const timeDiff = now - this.saveThrottle;

    // ✅✅✅ GUARDADO ULTRA-AGRESIVO: Guardar si:
    // 1. Ha avanzado al menos 0.1% (prácticamente cada cambio)
    // 2. Ha pasado al menos 1 segundo (mínimo delay)
    // 3. O si hay balances nuevos (length cambió)
    // 4. O si hay más transacciones en cualquier balance
    const balancesChanged = balances.length !== this.lastBalancesCount;
    const hasNewData = progressDiff >= 0.1 || balancesChanged;
    
    // Guardar si hay cambios Y ha pasado al menos 1 segundo (para no saturar)
    if (hasNewData && (timeDiff >= 1000 || balancesChanged)) {
      await this.saveProgress(file, progress, bytesProcessed, balances);
      this.lastSavedProgress = progress;
      this.saveThrottle = now;
      this.lastBalancesCount = balances.length;
      console.log(`[AnalyzerPersistence] 💾 Auto-guardado INMEDIATO: ${progress.toFixed(2)}% | ${balances.length} divisas`);
    }
  }

  private lastBalancesCount: number = 0;

  /**
   * Guarda inmediatamente sin throttling (para casos críticos como pause/stop)
   */
  async forceSave(
    file: File,
    progress: number,
    bytesProcessed: number,
    balances: CurrencyBalance[]
  ): Promise<void> {
    await this.saveProgress(file, progress, bytesProcessed, balances);
    this.lastSavedProgress = progress;
    this.saveThrottle = Date.now();
  }
}

  /**
   * Guarda el progreso asociado a un perfil específico
   */
  async saveToProfile(
    profileId: string,
    file: File,
    progress: number,
    bytesProcessed: number,
    balances: CurrencyBalance[]
  ): Promise<void> {
    try {
      const fileHash = await this.calculateFileHash(file);
      
      const state: AnalyzerProgressState = {
        fileHash,
        fileName: file.name,
        fileSize: file.size,
        lastModified: file.lastModified,
        progress,
        bytesProcessed,
        balances: balances.map(b => ({
          ...b,
          lastUpdate: b.lastUpdate || new Date().toISOString(),
          lastUpdated: b.lastUpdated || Date.now()
        })),
        timestamp: Date.now(),
        version: VERSION
      };

      localStorage.setItem(`analyzer_progress_profile_${profileId}`, JSON.stringify(state));
      console.log(`[AnalyzerPersistence] 💾 Progreso guardado en perfil ${profileId}: ${progress.toFixed(2)}%`);
    } catch (error) {
      console.error('[AnalyzerPersistence] Error guardando en perfil:', error);
    }
  }

  /**
   * Carga el progreso asociado a un perfil específico
   */
  loadFromProfile(profileId: string): AnalyzerProgressState | null {
    try {
      const stored = localStorage.getItem(`analyzer_progress_profile_${profileId}`);
      if (!stored) return null;

      const state: AnalyzerProgressState = JSON.parse(stored);
      console.log(`[AnalyzerPersistence] ✅ Progreso cargado desde perfil ${profileId}: ${state.progress.toFixed(2)}%`);
      return state;
    } catch (error) {
      console.error('[AnalyzerPersistence] Error cargando desde perfil:', error);
      return null;
    }
  }

  /**
   * Borra el progreso asociado a un perfil específico
   */
  clearProfile(profileId: string): void {
    localStorage.removeItem(`analyzer_progress_profile_${profileId}`);
    console.log(`[AnalyzerPersistence] 🗑️ Progreso de perfil ${profileId} borrado`);
  }
}

// Exportar instancia única
export const analyzerPersistenceStore = new AnalyzerPersistenceStore();
