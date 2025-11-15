/**
 * Audit Store - Persistent Storage for Audit Bank Data
 * Maintains audit results across tab changes
 */

interface AuthenticityProof {
  blockHash: string;           // Hash del bloque de datos
  digitalSignature: string;     // Firma digital extraída
  verificationCode: string;     // Código de verificación
  timestamp: string;            // Timestamp de creación
  sourceOffset: number;         // Posición en archivo fuente
  rawHexData: string;          // Datos hex originales
  checksumVerified: boolean;   // Checksum verificado
}

interface AuditFinding {
  id_registro: string;
  archivo: {
    ruta: string;
    hash_sha256: string;
    fecha_mod: string;
  };
  banco_detectado: string;
  numero_cuenta_mask: string;
  numero_cuenta_full?: string; // Cuenta completa sin enmascarar
  iban_full?: string | null; // IBAN completo
  swift_code?: string | null; // Código SWIFT completo
  money: {
    amount: number;
    currency: string;
  };
  classification: 'M0' | 'M1' | 'M2' | 'M3' | 'M4';
  evidencia_fragmento: string;
  score_confianza: number;
  timestamp_detectado: string;
  authenticityProof?: AuthenticityProof; // Prueba de autenticidad
}

interface AggregatedData {
  currency: string;
  M0: number;
  M1: number;
  M2: number;
  M3: number;
  M4: number;
  equiv_usd: number;
}

interface AuditResults {
  resumen: {
    total_hallazgos: number;
    fecha: string;
  };
  agregados: AggregatedData[];
  hallazgos: AuditFinding[];
}

interface ExtractedBankData {
  accountNumbers: string[];
  ibanCodes: string[];
  swiftCodes: string[];
  bankNames: string[];
  routingNumbers: string[];
  amounts: { value: number; currency: string; offset: number }[];
  transactions: {
    type: string;
    from: string;
    to: string;
    amount: number;
    currency: string;
    date: string;
  }[];
  metadata: {
    fileSize: number;
    fileName: string;
    blocksDetected: number;
    entropyLevel: number;
    hasEncryption: boolean;
    totalAccounts: number;
    totalBanks: number;
    totalCurrencies: number;
  };
  rawData: {
    hexSample: string;
    textSample: string;
    binarySignature: string;
  };
  // Datos de Ingeniería Inversa Avanzada
  reverseEngineering?: {
    fileSignatures: string[];
    headerBytes: number[];
    structuredFieldsCount: number;
    structuredFieldsSample: any[];
    hexPatterns: {
      sha256Count: number;
      md5Count: number;
      apiKeysCount: number;
      sha256Samples: string[];
      md5Samples: string[];
    };
    dataStructures: {
      jsonLikeCount: number;
      xmlTagsCount: number;
      keyValuePairsCount: number;
      jsonSamples: string[];
      xmlSamples: string[];
      kvSamples: string[];
    };
    confidence: number;
  };
}

interface AuditStoreData {
  results: AuditResults | null;
  extractedData: ExtractedBankData | null;
  lastAuditDate: string;
  filesProcessed: string[];
}

const STORAGE_KEY = 'Digital Commercial Bank Ltd_audit_data';

class AuditStore {
  private listeners: Set<(data: AuditStoreData | null) => void> = new Set();

  /**
   * Save audit data to localStorage
   */
  saveAuditData(results: AuditResults | null, extractedData: ExtractedBankData | null): void {
    try {
      const storeData: AuditStoreData = {
        results,
        extractedData,
        lastAuditDate: new Date().toISOString(),
        filesProcessed: extractedData ? [extractedData.metadata.fileName] : [],
      };

      localStorage.setItem(STORAGE_KEY, JSON.stringify(storeData));
      
      console.log('[AuditStore] Audit data saved:', {
        hasResults: !!results,
        hasExtractedData: !!extractedData,
        fileName: extractedData?.metadata.fileName,
      });

      this.notifyListeners(storeData);
    } catch (error) {
      console.error('[AuditStore] Error saving audit data:', error);
    }
  }

  /**
   * Load audit data from localStorage
   */
  loadAuditData(): AuditStoreData | null {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (!stored) return null;

      const data: AuditStoreData = JSON.parse(stored);
      
      console.log('[AuditStore] Loaded audit data:', {
        hasResults: !!data.results,
        hasExtractedData: !!data.extractedData,
        lastAudit: data.lastAuditDate,
      });

      return data;
    } catch (error) {
      console.error('[AuditStore] Error loading audit data:', error);
      return null;
    }
  }

  /**
   * Clear all audit data
   */
  clearAuditData(): void {
    try {
      localStorage.removeItem(STORAGE_KEY);
      console.log('[AuditStore] Audit data cleared');
      this.notifyListeners(null);
    } catch (error) {
      console.error('[AuditStore] Error clearing audit data:', error);
    }
  }

  /**
   * Subscribe to audit data changes
   */
  subscribe(listener: (data: AuditStoreData | null) => void): () => void {
    this.listeners.add(listener);
    // Immediately call with current data
    listener(this.loadAuditData());
    
    return () => {
      this.listeners.delete(listener);
    };
  }

  /**
   * Notify all listeners
   */
  private notifyListeners(data: AuditStoreData | null): void {
    this.listeners.forEach(listener => {
      try {
        listener(data);
      } catch (error) {
        console.error('[AuditStore] Error in listener:', error);
      }
    });
  }

  /**
   * Check if audit data exists
   */
  hasAuditData(): boolean {
    const data = this.loadAuditData();
    return !!(data?.results || data?.extractedData);
  }
}

// Export singleton instance
export const auditStore = new AuditStore();

// Export types
export type { AuditResults, ExtractedBankData, AuditStoreData, AuditFinding, AggregatedData, AuthenticityProof };


