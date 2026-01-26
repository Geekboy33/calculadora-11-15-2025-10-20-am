/**
 * DCB Receipt Store - Historial y Persistencia de Recibos
 * Almacena todos los recibos generados con opción de re-descargar
 */

import { DCBTransferReceiptData, generateDCBTransferReceipt } from './dcb-transfer-receipt';

export interface StoredReceipt extends DCBTransferReceiptData {
  // Metadata adicional
  receiptId: string;
  createdAt: string;
  downloadCount: number;
  lastDownloaded?: string;
  status: 'generated' | 'downloaded' | 'archived';
}

export interface ReceiptFormData {
  // Datos del pagador
  payerAccountNumber: string;
  payerName: string;
  payerBank: string;
  
  // Datos del custodio
  custodyAccountName: string;
  custodyAccountNumber: string;
  custodyBankName: string;
  
  // Datos del beneficiario
  beneficiaryName: string;
  beneficiaryAccountNumber: string;
  beneficiaryBank: string;
  beneficiaryBIC: string;
  
  // Datos de la transferencia
  amount: string;
  currency: string;
  concept: string;
}

const STORAGE_KEY = 'DCB_receipt_history';
const FORM_DATA_KEY = 'DCB_receipt_form_data';

class DCBReceiptStore {
  private listeners: Set<(receipts: StoredReceipt[]) => void> = new Set();

  /**
   * Generar ID único para recibo
   */
  private generateReceiptId(): string {
    const now = new Date();
    const dateStr = now.toISOString().slice(0, 10).replace(/-/g, '');
    const random = Math.random().toString(36).substring(2, 10).toUpperCase();
    return `RCP-${dateStr}-${random}`;
  }

  /**
   * Obtener todos los recibos almacenados
   */
  getReceipts(): StoredReceipt[] {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (!stored) return [];
      return JSON.parse(stored);
    } catch {
      return [];
    }
  }

  /**
   * Guardar recibos en localStorage
   */
  private saveReceipts(receipts: StoredReceipt[]): void {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(receipts));
    this.notifyListeners();
  }

  /**
   * Crear y almacenar un nuevo recibo
   */
  createReceipt(data: DCBTransferReceiptData, autoDownload: boolean = true): StoredReceipt {
    const receiptId = this.generateReceiptId();
    const now = new Date().toISOString();
    
    const storedReceipt: StoredReceipt = {
      ...data,
      receiptId,
      transferId: data.transferId || receiptId,
      createdAt: now,
      downloadCount: autoDownload ? 1 : 0,
      lastDownloaded: autoDownload ? now : undefined,
      status: autoDownload ? 'downloaded' : 'generated',
    };
    
    // Guardar en historial
    const receipts = this.getReceipts();
    receipts.unshift(storedReceipt); // Agregar al inicio
    this.saveReceipts(receipts);
    
    // Generar y descargar PDF si se solicita
    if (autoDownload) {
      generateDCBTransferReceipt(storedReceipt);
    }
    
    console.log('[DCBReceiptStore] ✅ Recibo creado:', receiptId);
    return storedReceipt;
  }

  /**
   * Re-descargar un recibo existente
   */
  downloadReceipt(receiptId: string): boolean {
    const receipts = this.getReceipts();
    const receipt = receipts.find(r => r.receiptId === receiptId);
    
    if (!receipt) {
      console.error('[DCBReceiptStore] ❌ Recibo no encontrado:', receiptId);
      return false;
    }
    
    // Actualizar contador de descargas
    receipt.downloadCount++;
    receipt.lastDownloaded = new Date().toISOString();
    receipt.status = 'downloaded';
    this.saveReceipts(receipts);
    
    // Generar PDF
    generateDCBTransferReceipt(receipt);
    
    console.log('[DCBReceiptStore] ✅ Recibo descargado:', receiptId, `(${receipt.downloadCount} veces)`);
    return true;
  }

  /**
   * Obtener un recibo por ID
   */
  getReceiptById(receiptId: string): StoredReceipt | null {
    return this.getReceipts().find(r => r.receiptId === receiptId) || null;
  }

  /**
   * Obtener recibos por rango de fechas
   */
  getReceiptsByDateRange(startDate: string, endDate: string): StoredReceipt[] {
    const receipts = this.getReceipts();
    return receipts.filter(r => {
      const date = r.transferDate;
      return date >= startDate && date <= endDate;
    });
  }

  /**
   * Obtener recibos por cuenta
   */
  getReceiptsByAccount(accountNumber: string): StoredReceipt[] {
    const receipts = this.getReceipts();
    return receipts.filter(r => 
      r.payerAccountNumber === accountNumber || 
      r.custodyAccountNumber === accountNumber ||
      r.beneficiaryAccountNumber === accountNumber
    );
  }

  /**
   * Archivar un recibo
   */
  archiveReceipt(receiptId: string): boolean {
    const receipts = this.getReceipts();
    const receipt = receipts.find(r => r.receiptId === receiptId);
    
    if (!receipt) return false;
    
    receipt.status = 'archived';
    this.saveReceipts(receipts);
    
    console.log('[DCBReceiptStore] 📦 Recibo archivado:', receiptId);
    return true;
  }

  /**
   * Eliminar un recibo
   */
  deleteReceipt(receiptId: string): boolean {
    const receipts = this.getReceipts();
    const index = receipts.findIndex(r => r.receiptId === receiptId);
    
    if (index === -1) return false;
    
    receipts.splice(index, 1);
    this.saveReceipts(receipts);
    
    console.log('[DCBReceiptStore] 🗑️ Recibo eliminado:', receiptId);
    return true;
  }

  /**
   * Limpiar recibos antiguos (más de X días)
   */
  cleanOldReceipts(daysOld: number = 90): number {
    const receipts = this.getReceipts();
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysOld);
    const cutoffStr = cutoffDate.toISOString();
    
    const filtered = receipts.filter(r => r.createdAt >= cutoffStr);
    const removed = receipts.length - filtered.length;
    
    if (removed > 0) {
      this.saveReceipts(filtered);
      console.log(`[DCBReceiptStore] 🧹 ${removed} recibos antiguos eliminados`);
    }
    
    return removed;
  }

  /**
   * Obtener estadísticas de recibos
   */
  getStats(): {
    total: number;
    downloaded: number;
    archived: number;
    totalAmount: Record<string, number>;
    thisMonth: number;
    thisWeek: number;
  } {
    const receipts = this.getReceipts();
    const now = new Date();
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
    
    const totalAmount: Record<string, number> = {};
    receipts.forEach(r => {
      totalAmount[r.currency] = (totalAmount[r.currency] || 0) + r.amount;
    });
    
    return {
      total: receipts.length,
      downloaded: receipts.filter(r => r.status === 'downloaded').length,
      archived: receipts.filter(r => r.status === 'archived').length,
      totalAmount,
      thisMonth: receipts.filter(r => r.createdAt >= monthStart).length,
      thisWeek: receipts.filter(r => r.createdAt >= weekAgo).length,
    };
  }

  // ==================== PERSISTENCIA DE FORMULARIOS ====================

  /**
   * Guardar datos del formulario para persistencia
   */
  saveFormData(formData: Partial<ReceiptFormData>): void {
    try {
      const existing = this.getFormData();
      const merged = { ...existing, ...formData };
      localStorage.setItem(FORM_DATA_KEY, JSON.stringify(merged));
      console.log('[DCBReceiptStore] 💾 Datos del formulario guardados');
    } catch (error) {
      console.error('[DCBReceiptStore] ❌ Error guardando formulario:', error);
    }
  }

  /**
   * Obtener datos guardados del formulario
   */
  getFormData(): ReceiptFormData {
    try {
      const stored = localStorage.getItem(FORM_DATA_KEY);
      if (!stored) return this.getDefaultFormData();
      return { ...this.getDefaultFormData(), ...JSON.parse(stored) };
    } catch {
      return this.getDefaultFormData();
    }
  }

  /**
   * Valores por defecto del formulario
   */
  getDefaultFormData(): ReceiptFormData {
    return {
      payerAccountNumber: '',
      payerName: '',
      payerBank: '',
      custodyAccountName: '',
      custodyAccountNumber: '',
      custodyBankName: 'Digital Commercial Bank Ltd.',
      beneficiaryName: '',
      beneficiaryAccountNumber: '',
      beneficiaryBank: '',
      beneficiaryBIC: '',
      amount: '',
      currency: 'USD',
      concept: '',
    };
  }

  /**
   * Limpiar datos del formulario
   */
  clearFormData(): void {
    localStorage.removeItem(FORM_DATA_KEY);
    console.log('[DCBReceiptStore] 🧹 Datos del formulario limpiados');
  }

  // ==================== SUSCRIPCIONES ====================

  /**
   * Suscribirse a cambios en los recibos
   */
  subscribe(listener: (receipts: StoredReceipt[]) => void): () => void {
    this.listeners.add(listener);
    listener(this.getReceipts());
    return () => {
      this.listeners.delete(listener);
    };
  }

  /**
   * Notificar a los listeners
   */
  private notifyListeners(): void {
    const receipts = this.getReceipts();
    this.listeners.forEach(listener => {
      try {
        listener(receipts);
      } catch (error) {
        console.error('[DCBReceiptStore] Error in listener:', error);
      }
    });
  }

  /**
   * Exportar todos los recibos como JSON
   */
  exportToJSON(): string {
    return JSON.stringify(this.getReceipts(), null, 2);
  }

  /**
   * Importar recibos desde JSON
   */
  importFromJSON(jsonString: string): number {
    try {
      const imported = JSON.parse(jsonString) as StoredReceipt[];
      const existing = this.getReceipts();
      
      // Agregar solo los que no existen
      let added = 0;
      imported.forEach(receipt => {
        if (!existing.find(r => r.receiptId === receipt.receiptId)) {
          existing.push(receipt);
          added++;
        }
      });
      
      this.saveReceipts(existing);
      console.log(`[DCBReceiptStore] 📥 ${added} recibos importados`);
      return added;
    } catch (error) {
      console.error('[DCBReceiptStore] ❌ Error importando recibos:', error);
      return 0;
    }
  }
}

export const dcbReceiptStore = new DCBReceiptStore();
