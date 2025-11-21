/**
 * Transaction and Event Store
 * Sistema centralizado de registro de todas las transacciones y eventos
 * Estándar bancario con trazabilidad completa
 */

export type TransactionType =
  | 'ACCOUNT_CREATED'      // Custody Accounts
  | 'ACCOUNT_DELETED'
  | 'BALANCE_INCREASE'     // Aumentar capital
  | 'BALANCE_DECREASE'     // Disminuir capital
  | 'FUNDS_RESERVED'       // Reservar fondos
  | 'FUNDS_RELEASED'       // Liberar fondos
  | 'PLEDGE_CREATED'       // API VUSD, VUSD1, API1
  | 'PLEDGE_EDITED'
  | 'PLEDGE_DELETED'
  | 'TRANSFER_CREATED'     // Transferencias
  | 'TRANSFER_COMPLETED'
  | 'POR_GENERATED'        // Proof of Reserve
  | 'POR_DELETED'
  | 'API_KEY_CREATED'      // API Keys
  | 'API_KEY_REVOKED'
  | 'PAYOUT_CREATED'       // Payouts
  | 'PAYOUT_COMPLETED'
  | 'RECONCILIATION_RUN'   // Conciliación
  | 'PROFILE_CREATED'      // Profiles module
  | 'PROFILE_UPDATED'
  | 'PROFILE_ACTIVATED'
  | 'PROFILE_DELETED'
  | 'PROFILE_EXPORTED'
  | 'PROFILE_IMPORTED'
  | 'PROFILE_AUTO_SNAPSHOT';

export type ModuleSource =
  | 'CUSTODY_ACCOUNTS'
  | 'API_VUSD'
  | 'API_VUSD1'
  | 'API_DAES'
  | 'API_GLOBAL'
  | 'API_DIGITAL'
  | 'POR_API'
  | 'POR_API1_ANCHOR'
  | 'ACCOUNT_LEDGER'
  | 'BLACK_SCREEN'
  | 'LARGE_FILE_ANALYZER'
  | 'SYSTEM'
  | 'PROFILES';

export interface TransactionEvent {
  id: string;
  timestamp: string;
  type: TransactionType;
  module: ModuleSource;
  description: string;
  amount?: number;
  currency?: string;
  accountId?: string;
  accountName?: string;
  reference?: string;
  status: 'PENDING' | 'COMPLETED' | 'FAILED' | 'CANCELLED';
  metadata?: {
    fromBalance?: number;
    toBalance?: number;
    pledgeId?: string;
    porId?: string;
    apiKeyId?: string;
    externalRef?: string;
    beneficiary?: string;
    [key: string]: any;
  };
  userId?: string;
  ipAddress?: string;
}

class TransactionEventStore {
  private static instance: TransactionEventStore;
  private readonly STORAGE_KEY = 'daes_transactions_events';
  private readonly MAX_EVENTS = 10000; // Máximo de eventos en memoria
  private listeners: Set<(events: TransactionEvent[]) => void> = new Set();

  private constructor() {
    console.log('[TxStore] 📊 Transaction Event Store inicializado');
  }

  static getInstance(): TransactionEventStore {
    if (!TransactionEventStore.instance) {
      TransactionEventStore.instance = new TransactionEventStore();
    }
    return TransactionEventStore.instance;
  }

  // ==========================================
  // REGISTRO DE EVENTOS
  // ==========================================

  recordEvent(
    type: TransactionType,
    module: ModuleSource,
    description: string,
    options?: {
      amount?: number;
      currency?: string;
      accountId?: string;
      accountName?: string;
      reference?: string;
      status?: 'PENDING' | 'COMPLETED' | 'FAILED' | 'CANCELLED';
      metadata?: any;
    }
  ): TransactionEvent {
    const event: TransactionEvent = {
      id: `TXN-${Date.now()}-${Math.random().toString(36).substring(2, 9).toUpperCase()}`,
      timestamp: new Date().toISOString(),
      type,
      module,
      description,
      amount: options?.amount,
      currency: options?.currency,
      accountId: options?.accountId,
      accountName: options?.accountName,
      reference: options?.reference,
      status: options?.status || 'COMPLETED',
      metadata: options?.metadata,
      userId: localStorage.getItem('daes_user') || undefined
    };

    const events = this.getEvents();
    events.unshift(event); // Agregar al inicio (más reciente primero)

    // Limitar a MAX_EVENTS
    if (events.length > this.MAX_EVENTS) {
      events.splice(this.MAX_EVENTS);
    }

    this.saveEvents(events);
    this.notifyListeners(events);

    console.log('[TxStore] 📝 Evento registrado:', {
      id: event.id,
      type: event.type,
      module: event.module,
      amount: event.amount
    });

    return event;
  }

  // ==========================================
  // MÉTODOS ESPECÍFICOS POR MÓDULO
  // ==========================================

  // Custody Accounts
  recordAccountCreated(accountName: string, currency: string, balance: number, accountId: string) {
    return this.recordEvent(
      'ACCOUNT_CREATED',
      'CUSTODY_ACCOUNTS',
      `Cuenta custody creada: ${accountName}`,
      {
        amount: balance,
        currency,
        accountId,
        accountName,
        status: 'COMPLETED'
      }
    );
  }

  recordBalanceIncrease(accountId: string, accountName: string, amount: number, currency: string, oldBalance: number, newBalance: number) {
    return this.recordEvent(
      'BALANCE_INCREASE',
      'CUSTODY_ACCOUNTS',
      `Capital agregado a ${accountName}`,
      {
        amount,
        currency,
        accountId,
        accountName,
        status: 'COMPLETED',
        metadata: {
          fromBalance: oldBalance,
          toBalance: newBalance,
          operation: 'CREDIT'
        }
      }
    );
  }

  recordBalanceDecrease(accountId: string, accountName: string, amount: number, currency: string, oldBalance: number, newBalance: number) {
    return this.recordEvent(
      'BALANCE_DECREASE',
      'CUSTODY_ACCOUNTS',
      `Capital retirado de ${accountName}`,
      {
        amount,
        currency,
        accountId,
        accountName,
        status: 'COMPLETED',
        metadata: {
          fromBalance: oldBalance,
          toBalance: newBalance,
          operation: 'DEBIT'
        }
      }
    );
  }

  // API VUSD / VUSD1
  recordPledgeCreated(module: ModuleSource, pledgeId: string, amount: number, beneficiary: string, accountName?: string) {
    return this.recordEvent(
      'PLEDGE_CREATED',
      module,
      `Pledge creado para ${beneficiary}`,
      {
        amount,
        currency: 'USD',
        reference: pledgeId,
        accountName,
        status: 'COMPLETED',
        metadata: {
          pledgeId,
          beneficiary
        }
      }
    );
  }

  recordPledgeEdited(module: ModuleSource, pledgeId: string, oldAmount: number, newAmount: number, beneficiary: string) {
    return this.recordEvent(
      'PLEDGE_EDITED',
      module,
      `Pledge editado: ${beneficiary}`,
      {
        amount: newAmount,
        currency: 'USD',
        reference: pledgeId,
        status: 'COMPLETED',
        metadata: {
          pledgeId,
          oldAmount,
          newAmount,
          delta: newAmount - oldAmount
        }
      }
    );
  }

  recordPledgeDeleted(module: ModuleSource, pledgeId: string, amount: number, beneficiary: string) {
    return this.recordEvent(
      'PLEDGE_DELETED',
      module,
      `Pledge eliminado: ${beneficiary}`,
      {
        amount,
        currency: 'USD',
        reference: pledgeId,
        status: 'COMPLETED',
        metadata: {
          pledgeId
        }
      }
    );
  }

  // Proof of Reserve
  recordPorGenerated(circulatingCap: number, pledgesCount: number, porId: string) {
    return this.recordEvent(
      'POR_GENERATED',
      'API_VUSD',
      `Proof of Reserve generado`,
      {
        amount: circulatingCap,
        currency: 'USD',
        reference: porId,
        status: 'COMPLETED',
        metadata: {
          porId,
          pledgesCount,
          circulatingCap
        }
      }
    );
  }

  // Profiles
  recordProfileCreated(profileName: string, snapshotSizeMB: number, keysCount: number) {
    return this.recordEvent(
      'PROFILE_CREATED',
      'PROFILES',
      `Perfil creado: ${profileName}`,
      {
        status: 'COMPLETED',
        metadata: {
          snapshotSizeMB,
          keysCount
        }
      }
    );
  }

  recordProfileUpdated(profileName: string, snapshotSizeMB: number, keysCount: number) {
    return this.recordEvent(
      'PROFILE_UPDATED',
      'PROFILES',
      `Perfil actualizado: ${profileName}`,
      {
        status: 'COMPLETED',
        metadata: {
          snapshotSizeMB,
          keysCount
        }
      }
    );
  }

  recordProfileActivated(profileName: string) {
    return this.recordEvent(
      'PROFILE_ACTIVATED',
      'PROFILES',
      `Perfil activado: ${profileName}`,
      {
        status: 'COMPLETED'
      }
    );
  }

  recordProfileDeleted(profileName: string) {
    return this.recordEvent(
      'PROFILE_DELETED',
      'PROFILES',
      `Perfil eliminado: ${profileName}`,
      {
        status: 'COMPLETED'
      }
    );
  }

  recordProfileExported(profileName: string) {
    return this.recordEvent(
      'PROFILE_EXPORTED',
      'PROFILES',
      `Perfil exportado: ${profileName}`,
      { status: 'COMPLETED' }
    );
  }

  recordProfileImported(profileName: string) {
    return this.recordEvent(
      'PROFILE_IMPORTED',
      'PROFILES',
      `Perfil importado: ${profileName}`,
      { status: 'COMPLETED' }
    );
  }

  recordProfileAutoSnapshot(profileName: string, intervalMinutes: number) {
    return this.recordEvent(
      'PROFILE_AUTO_SNAPSHOT',
      'PROFILES',
      `Snapshot automático ejecutado: ${profileName}`,
      {
        status: 'COMPLETED',
        metadata: { intervalMinutes }
      }
    );
  }

  // Payouts
  recordPayoutCreated(payoutId: string, amount: number, externalRef: string, pledgeId: string) {
    return this.recordEvent(
      'PAYOUT_CREATED',
      'POR_API1_ANCHOR',
      `Payout creado para ${externalRef}`,
      {
        amount,
        currency: 'USD',
        reference: payoutId,
        status: 'PENDING',
        metadata: {
          payoutId,
          externalRef,
          pledgeId
        }
      }
    );
  }

  recordPayoutCompleted(payoutId: string, amount: number, externalRef: string) {
    return this.recordEvent(
      'PAYOUT_COMPLETED',
      'POR_API1_ANCHOR',
      `Payout completado: ${externalRef}`,
      {
        amount,
        currency: 'USD',
        reference: payoutId,
        status: 'COMPLETED',
        metadata: {
          payoutId,
          externalRef
        }
      }
    );
  }

  // Transfers
  recordTransfer(fromAccount: string, toAccount: string, amount: number, currency: string, reference: string) {
    return this.recordEvent(
      'TRANSFER_CREATED',
      'API_VUSD',
      `Transferencia: ${fromAccount} → ${toAccount}`,
      {
        amount,
        currency,
        reference,
        status: 'COMPLETED',
        metadata: {
          fromAccount,
          toAccount
        }
      }
    );
  }

  // ==========================================
  // CONSULTAS
  // ==========================================

  getEvents(): TransactionEvent[] {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      if (!stored) return [];
      return JSON.parse(stored);
    } catch (err) {
      console.error('[TxStore] ❌ Error cargando eventos:', err);
      return [];
    }
  }

  getEventsByModule(module: ModuleSource): TransactionEvent[] {
    return this.getEvents().filter(e => e.module === module);
  }

  getEventsByType(type: TransactionType): TransactionEvent[] {
    return this.getEvents().filter(e => e.type === type);
  }

  getEventsByDateRange(startDate: string, endDate: string): TransactionEvent[] {
    const start = new Date(startDate).getTime();
    const end = new Date(endDate).getTime();
    
    return this.getEvents().filter(e => {
      const eventTime = new Date(e.timestamp).getTime();
      return eventTime >= start && eventTime <= end;
    });
  }

  getEventsByAccount(accountId: string): TransactionEvent[] {
    return this.getEvents().filter(e => e.accountId === accountId);
  }

  // Buscar por referencia (pledge ID, payout ID, etc)
  getEventsByReference(reference: string): TransactionEvent[] {
    return this.getEvents().filter(e => e.reference === reference);
  }

  // ==========================================
  // ESTADÍSTICAS
  // ==========================================

  getStats() {
    const events = this.getEvents();
    const today = new Date().toISOString().split('T')[0];
    const todayEvents = events.filter(e => e.timestamp.startsWith(today));

    return {
      totalEvents: events.length,
      todayEvents: todayEvents.length,
      byModule: this.groupBy(events, 'module'),
      byType: this.groupBy(events, 'type'),
      byStatus: this.groupBy(events, 'status'),
      totalVolume: events.reduce((sum, e) => sum + (e.amount || 0), 0),
      todayVolume: todayEvents.reduce((sum, e) => sum + (e.amount || 0), 0)
    };
  }

  private groupBy(events: TransactionEvent[], key: keyof TransactionEvent) {
    return events.reduce((acc: any, event) => {
      const value = event[key] as string;
      acc[value] = (acc[value] || 0) + 1;
      return acc;
    }, {});
  }

  // ==========================================
  // PERSISTENCIA
  // ==========================================

  private saveEvents(events: TransactionEvent[]): void {
    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(events));
    } catch (err) {
      console.error('[TxStore] ❌ Error guardando eventos:', err);
    }
  }

  clearEvents(): void {
    localStorage.removeItem(this.STORAGE_KEY);
    this.notifyListeners([]);
    console.log('[TxStore] 🗑️ Todos los eventos limpiados');
  }

  // ==========================================
  // SUSCRIPCIONES
  // ==========================================

  subscribe(listener: (events: TransactionEvent[]) => void): () => void {
    this.listeners.add(listener);
    listener(this.getEvents());
    return () => this.listeners.delete(listener);
  }

  private notifyListeners(events: TransactionEvent[]): void {
    this.listeners.forEach(listener => listener(events));
  }

  // ==========================================
  // EXPORTACIÓN
  // ==========================================

  exportToTXT(events: TransactionEvent[], language: 'es' | 'en' = 'es'): string {
    const isSpanish = language === 'es';
    
    let txt = `
═══════════════════════════════════════════════════════════════
  DAES CoreBanking System - ${isSpanish ? 'Registro de Transacciones y Eventos' : 'Transaction and Event Log'}
═══════════════════════════════════════════════════════════════

${isSpanish ? 'Fecha de Generación:' : 'Generation Date:'} ${new Date().toLocaleString(isSpanish ? 'es-ES' : 'en-US')}
${isSpanish ? 'Total de Eventos:' : 'Total Events:'} ${events.length}
${isSpanish ? 'Sistema:' : 'System:'} DAES CoreBanking v5.2.0

═══════════════════════════════════════════════════════════════
${isSpanish ? 'RESUMEN EJECUTIVO' : 'EXECUTIVE SUMMARY'}
═══════════════════════════════════════════════════════════════

${isSpanish ? 'Volumen Total Transaccionado:' : 'Total Transaction Volume:'}
  USD ${events.reduce((sum, e) => sum + (e.amount || 0), 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}

${isSpanish ? 'Por Tipo de Evento:' : 'By Event Type:'}
${this.getTypesSummary(events, isSpanish)}

${isSpanish ? 'Por Módulo:' : 'By Module:'}
${this.getModulesSummary(events, isSpanish)}

═══════════════════════════════════════════════════════════════
${isSpanish ? 'REGISTRO DETALLADO DE EVENTOS' : 'DETAILED EVENT LOG'}
═══════════════════════════════════════════════════════════════

`;

    events.forEach((event, index) => {
      txt += `
${index + 1}. [${event.timestamp}] ${event.type}
   ${isSpanish ? 'ID:' : 'ID:'}                  ${event.id}
   ${isSpanish ? 'Módulo:' : 'Module:'}             ${event.module}
   ${isSpanish ? 'Descripción:' : 'Description:'}       ${event.description}
   ${isSpanish ? 'Estado:' : 'Status:'}             ${event.status}
${event.amount ? `   ${isSpanish ? 'Monto:' : 'Amount:'}             ${event.currency} ${event.amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}` : ''}
${event.accountName ? `   ${isSpanish ? 'Cuenta:' : 'Account:'}            ${event.accountName}` : ''}
${event.reference ? `   ${isSpanish ? 'Referencia:' : 'Reference:'}         ${event.reference}` : ''}
${event.metadata ? `   ${isSpanish ? 'Metadata:' : 'Metadata:'}           ${JSON.stringify(event.metadata, null, 2).split('\n').join('\n   ')}` : ''}
───────────────────────────────────────────────────────────────
`;
    });

    txt += `
═══════════════════════════════════════════════════════════════
  DAES CoreBanking System - Data and Exchange Settlement
  © ${new Date().getFullYear()} - ${isSpanish ? 'Todos los derechos reservados' : 'All rights reserved'}
═══════════════════════════════════════════════════════════════
`;

    return txt;
  }

  exportToCSV(events: TransactionEvent[]): string {
    let csv = 'ID,Timestamp,Type,Module,Description,Amount,Currency,Account,Reference,Status\n';
    
    events.forEach(event => {
      csv += `"${event.id}",`;
      csv += `"${event.timestamp}",`;
      csv += `"${event.type}",`;
      csv += `"${event.module}",`;
      csv += `"${event.description}",`;
      csv += `"${event.amount || ''}",`;
      csv += `"${event.currency || ''}",`;
      csv += `"${event.accountName || ''}",`;
      csv += `"${event.reference || ''}",`;
      csv += `"${event.status}"\n`;
    });
    
    return csv;
  }

  private getTypesSummary(events: TransactionEvent[], isSpanish: boolean): string {
    const byType = this.groupBy(events, 'type');
    let summary = '';
    
    Object.entries(byType).forEach(([type, count]) => {
      summary += `  ${type}: ${count}\n`;
    });
    
    return summary || `  ${isSpanish ? 'Sin eventos' : 'No events'}\n`;
  }

  private getModulesSummary(events: TransactionEvent[], isSpanish: boolean): string {
    const byModule = this.groupBy(events, 'module');
    let summary = '';
    
    Object.entries(byModule).forEach(([module, count]) => {
      summary += `  ${module}: ${count}\n`;
    });
    
    return summary || `  ${isSpanish ? 'Sin eventos' : 'No events'}\n`;
  }
}

// Export singleton instance
export const transactionEventStore = TransactionEventStore.getInstance();

