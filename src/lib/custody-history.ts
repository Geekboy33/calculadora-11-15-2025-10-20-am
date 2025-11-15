/**
 * Custody History & Alerts System
 * Sistema de historial de transacciones y alertas
 */

export interface TransactionLog {
  id: string;
  timestamp: string;
  accountId: string;
  accountName: string;
  type: 'CREATE' | 'RESERVE' | 'CONFIRM' | 'RELEASE' | 'DELETE' | 'TRANSFER';
  amount?: number;
  currency?: string;
  details: string;
  user: string;
  ipAddress?: string;
  hash: string;
  status: 'success' | 'pending' | 'failed';
}

export interface Alert {
  id: string;
  timestamp: string;
  accountId: string;
  accountName: string;
  type: 'balance_low' | 'large_reserve' | 'security' | 'compliance' | 'info';
  severity: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  message: string;
  read: boolean;
  actionRequired: boolean;
}

export interface OperationLimit {
  accountId: string;
  dailyLimit: number;
  perOperationLimit: number;
  requiresApprovalAbove: number;
  autoApproveBelow: number;
  dailyUsed: number;
  lastReset: string;
}

const HISTORY_KEY = 'Digital Commercial Bank Ltd_custody_history';
const ALERTS_KEY = 'Digital Commercial Bank Ltd_custody_alerts';
const LIMITS_KEY = 'Digital Commercial Bank Ltd_custody_limits';

class CustodyHistoryManager {
  /**
   * Agregar log de transacción
   */
  addTransactionLog(
    accountId: string,
    accountName: string,
    type: TransactionLog['type'],
    details: string,
    amount?: number,
    currency?: string
  ): TransactionLog {
    const log: TransactionLog = {
      id: `TXN-${Date.now()}-${Math.random().toString(36).substring(2, 7).toUpperCase()}`,
      timestamp: new Date().toISOString(),
      accountId,
      accountName,
      type,
      amount,
      currency,
      details,
      user: 'admin', // En producción vendría del sistema de auth
      ipAddress: '192.168.1.100', // En producción vendría del navegador
      hash: this.generateTransactionHash(accountId, type, details, Date.now()),
      status: 'success',
    };

    const logs = this.getTransactionLogs();
    logs.unshift(log); // Agregar al inicio
    
    // Mantener solo últimos 1000 logs
    if (logs.length > 1000) logs.splice(1000);
    
    localStorage.setItem(HISTORY_KEY, JSON.stringify(logs));
    
    console.log('[CustodyHistory] ✅ Log agregado:', log.type, log.details);
    return log;
  }

  /**
   * Obtener logs de transacciones
   */
  getTransactionLogs(accountId?: string): TransactionLog[] {
    try {
      const logs: TransactionLog[] = JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]');
      if (accountId) {
        return logs.filter(l => l.accountId === accountId);
      }
      return logs;
    } catch {
      return [];
    }
  }

  /**
   * Generar hash de transacción
   */
  private generateTransactionHash(accountId: string, type: string, details: string, timestamp: number): string {
    const data = `${accountId}-${type}-${details}-${timestamp}`;
    // Simple hash (en producción usar crypto.SHA256)
    let hash = 0;
    for (let i = 0; i < data.length; i++) {
      hash = ((hash << 5) - hash) + data.charCodeAt(i);
      hash = hash & hash;
    }
    return Math.abs(hash).toString(16).padStart(16, '0').toUpperCase();
  }

  /**
   * Crear alerta
   */
  createAlert(
    accountId: string,
    accountName: string,
    type: Alert['type'],
    severity: Alert['severity'],
    title: string,
    message: string,
    actionRequired = false
  ): Alert {
    const alert: Alert = {
      id: `ALT-${Date.now()}-${Math.random().toString(36).substring(2, 7).toUpperCase()}`,
      timestamp: new Date().toISOString(),
      accountId,
      accountName,
      type,
      severity,
      title,
      message,
      read: false,
      actionRequired,
    };

    const alerts = this.getAlerts();
    alerts.unshift(alert);
    
    // Mantener solo últimas 500 alertas
    if (alerts.length > 500) alerts.splice(500);
    
    localStorage.setItem(ALERTS_KEY, JSON.stringify(alerts));
    
    console.log('[CustodyAlerts] 🔔 Alerta creada:', severity, title);
    return alert;
  }

  /**
   * Obtener alertas
   */
  getAlerts(unreadOnly = false): Alert[] {
    try {
      const alerts: Alert[] = JSON.parse(localStorage.getItem(ALERTS_KEY) || '[]');
      if (unreadOnly) {
        return alerts.filter(a => !a.read);
      }
      return alerts;
    } catch {
      return [];
    }
  }

  /**
   * Marcar alerta como leída
   */
  markAlertAsRead(alertId: string): void {
    const alerts = this.getAlerts();
    const alert = alerts.find(a => a.id === alertId);
    if (alert) {
      alert.read = true;
      localStorage.setItem(ALERTS_KEY, JSON.stringify(alerts));
    }
  }

  /**
   * Eliminar alerta
   */
  deleteAlert(alertId: string): void {
    const alerts = this.getAlerts().filter(a => a.id !== alertId);
    localStorage.setItem(ALERTS_KEY, JSON.stringify(alerts));
  }

  /**
   * Configurar límites de operación
   */
  setOperationLimits(accountId: string, limits: Omit<OperationLimit, 'accountId' | 'dailyUsed' | 'lastReset'>): void {
    const allLimits = this.getAllLimits();
    const existing = allLimits.find(l => l.accountId === accountId);
    
    if (existing) {
      Object.assign(existing, limits);
    } else {
      allLimits.push({
        accountId,
        ...limits,
        dailyUsed: 0,
        lastReset: new Date().toISOString(),
      });
    }
    
    localStorage.setItem(LIMITS_KEY, JSON.stringify(allLimits));
    console.log('[CustodyLimits] ✅ Límites configurados para', accountId);
  }

  /**
   * Obtener límites de una cuenta
   */
  getLimits(accountId: string): OperationLimit | null {
    const allLimits = this.getAllLimits();
    const limits = allLimits.find(l => l.accountId === accountId);
    
    if (limits) {
      // Resetear diario si es necesario
      const lastReset = new Date(limits.lastReset);
      const now = new Date();
      if (now.getDate() !== lastReset.getDate()) {
        limits.dailyUsed = 0;
        limits.lastReset = now.toISOString();
        localStorage.setItem(LIMITS_KEY, JSON.stringify(allLimits));
      }
    }
    
    return limits || null;
  }

  /**
   * Obtener todos los límites
   */
  private getAllLimits(): OperationLimit[] {
    try {
      return JSON.parse(localStorage.getItem(LIMITS_KEY) || '[]');
    } catch {
      return [];
    }
  }

  /**
   * Verificar si operación excede límites
   */
  checkLimits(accountId: string, amount: number): { allowed: boolean; reason?: string; requiresApproval?: boolean } {
    const limits = this.getLimits(accountId);
    
    if (!limits) {
      return { allowed: true };
    }

    // Verificar límite por operación
    if (amount > limits.perOperationLimit) {
      return { 
        allowed: false, 
        reason: `Excede límite por operación (${limits.perOperationLimit.toLocaleString()})` 
      };
    }

    // Verificar límite diario
    if (limits.dailyUsed + amount > limits.dailyLimit) {
      return { 
        allowed: false, 
        reason: `Excede límite diario (${limits.dailyLimit.toLocaleString()})` 
      };
    }

    // Verificar si requiere aprobación
    if (amount > limits.requiresApprovalAbove) {
      return { 
        allowed: true, 
        requiresApproval: true 
      };
    }

    return { allowed: true };
  }

  /**
   * Registrar uso en límite diario
   */
  recordDailyUsage(accountId: string, amount: number): void {
    const allLimits = this.getAllLimits();
    const limits = allLimits.find(l => l.accountId === accountId);
    
    if (limits) {
      limits.dailyUsed += amount;
      localStorage.setItem(LIMITS_KEY, JSON.stringify(allLimits));
    }
  }

  /**
   * Limpiar todos los datos
   */
  clearAll(): void {
    localStorage.removeItem(HISTORY_KEY);
    localStorage.removeItem(ALERTS_KEY);
    localStorage.removeItem(LIMITS_KEY);
  }

  /**
   * Obtener estadísticas
   */
  getStats() {
    const logs = this.getTransactionLogs();
    const alerts = this.getAlerts();
    const unreadAlerts = alerts.filter(a => !a.read);
    
    return {
      totalTransactions: logs.length,
      totalAlerts: alerts.length,
      unreadAlerts: unreadAlerts.length,
      criticalAlerts: alerts.filter(a => a.severity === 'critical' && !a.read).length,
      recentTransactions: logs.slice(0, 10),
      recentAlerts: alerts.slice(0, 10),
    };
  }
}

export const custodyHistory = new CustodyHistoryManager();

