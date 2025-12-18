/**
 * DAES API - Conexión con el sistema de cuentas custodio DAES
 * Endpoint: https://luxliqdaes.cloud/
 * 
 * Este módulo permite:
 * - Configurar API Key personalizada
 * - Verificar fondos en tiempo real
 * - Sincronizar con cuentas custodio
 * - Validar transacciones de tarjetas
 */

import CryptoJS from 'crypto-js';

// ═══════════════════════════════════════════════════════════════════════════
// 🔐 INTERFACES
// ═══════════════════════════════════════════════════════════════════════════

export interface DAESApiConfig {
  apiKey: string;
  secretKey?: string;
  environment: 'sandbox' | 'production';
  webhookUrl?: string;
  autoSync: boolean;
  syncInterval: number; // minutos
}

export interface DAESAccount {
  id: string;
  accountNumber: string;
  accountName: string;
  currency: string;
  availableBalance: number;
  totalBalance: number;
  holdBalance: number;
  status: 'active' | 'frozen' | 'closed';
  type: 'custody' | 'operating' | 'reserve';
  iban?: string;
  swift?: string;
  lastUpdated: string;
}

export interface DAESBalance {
  accountId: string;
  currency: string;
  available: number;
  total: number;
  pending: number;
  reserved: number;
  lastChecked: string;
  verified: boolean;
}

export interface DAESTransaction {
  id: string;
  type: 'credit' | 'debit' | 'transfer' | 'card_payment' | 'card_refund';
  amount: number;
  currency: string;
  description: string;
  reference: string;
  status: 'pending' | 'completed' | 'failed' | 'reversed';
  accountId: string;
  cardId?: string;
  merchantName?: string;
  createdAt: string;
  completedAt?: string;
}

export interface DAESVerificationResult {
  success: boolean;
  verified: boolean;
  accountId: string;
  requestedAmount: number;
  availableBalance: number;
  sufficientFunds: boolean;
  holdId?: string;
  message: string;
  timestamp: string;
  signature?: string;
}

export interface DAESCardFunding {
  cardId: string;
  accountId: string;
  amount: number;
  currency: string;
  status: 'pending' | 'completed' | 'failed';
  transactionId?: string;
}

// ═══════════════════════════════════════════════════════════════════════════
// 🔑 CONSTANTES
// ═══════════════════════════════════════════════════════════════════════════

const API_BASE_URL = 'https://luxliqdaes.cloud';
const STORAGE_KEY = 'daes_api_config';
const ACCOUNTS_CACHE_KEY = 'daes_accounts_cache';
const SYNC_INTERVAL_DEFAULT = 5; // minutos

// ═══════════════════════════════════════════════════════════════════════════
// 🏦 CLASE PRINCIPAL: DAESApiService
// ═══════════════════════════════════════════════════════════════════════════

class DAESApiService {
  private config: DAESApiConfig | null = null;
  private accountsCache: Map<string, DAESAccount> = new Map();
  private balancesCache: Map<string, DAESBalance> = new Map();
  private syncTimer: NodeJS.Timeout | null = null;
  private listeners: Set<(accounts: DAESAccount[]) => void> = new Set();
  
  constructor() {
    this.loadConfig();
    this.loadCache();
  }
  
  // ═══════════════════════════════════════════════════════════════════════════
  // 💾 PERSISTENCIA
  // ═══════════════════════════════════════════════════════════════════════════
  
  private loadConfig(): void {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        this.config = JSON.parse(stored);
        if (this.config?.autoSync) {
          this.startAutoSync();
        }
        console.log('[DAES API] ✅ Configuración cargada');
      }
    } catch (e) {
      console.error('[DAES API] Error cargando configuración:', e);
    }
  }
  
  private saveConfig(): void {
    if (this.config) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.config));
    }
  }
  
  private loadCache(): void {
    try {
      const stored = localStorage.getItem(ACCOUNTS_CACHE_KEY);
      if (stored) {
        const accounts: DAESAccount[] = JSON.parse(stored);
        accounts.forEach(acc => this.accountsCache.set(acc.id, acc));
      }
    } catch (e) {
      console.error('[DAES API] Error cargando cache:', e);
    }
  }
  
  private saveCache(): void {
    localStorage.setItem(ACCOUNTS_CACHE_KEY, JSON.stringify(Array.from(this.accountsCache.values())));
  }
  
  // ═══════════════════════════════════════════════════════════════════════════
  // ⚙️ CONFIGURACIÓN
  // ═══════════════════════════════════════════════════════════════════════════
  
  /**
   * Configurar API Key del DAES
   */
  configure(config: DAESApiConfig): void {
    this.config = config;
    this.saveConfig();
    
    if (config.autoSync) {
      this.startAutoSync();
    } else {
      this.stopAutoSync();
    }
    
    console.log(`[DAES API] ✅ Configurado: ${config.environment}`);
    console.log(`[DAES API] 🔑 API Key: ${this.maskApiKey(config.apiKey)}`);
  }
  
  /**
   * Obtener configuración actual
   */
  getConfig(): DAESApiConfig | null {
    return this.config;
  }
  
  /**
   * Verificar si está configurado
   */
  isConfigured(): boolean {
    return this.config !== null && this.config.apiKey.length > 0;
  }
  
  /**
   * Enmascarar API Key para mostrar
   */
  private maskApiKey(key: string): string {
    if (key.length < 8) return '****';
    return key.substring(0, 4) + '****' + key.substring(key.length - 4);
  }
  
  // ═══════════════════════════════════════════════════════════════════════════
  // 🔗 CONEXIÓN CON API
  // ═══════════════════════════════════════════════════════════════════════════
  
  /**
   * Realizar petición a la API DAES
   */
  private async apiRequest<T>(
    endpoint: string,
    method: 'GET' | 'POST' | 'PUT' | 'DELETE' = 'GET',
    body?: Record<string, unknown>
  ): Promise<{ success: boolean; data?: T; error?: string }> {
    if (!this.config) {
      return { success: false, error: 'API no configurada' };
    }
    
    const url = `${API_BASE_URL}${endpoint}`;
    const timestamp = Date.now().toString();
    
    // Generar firma HMAC para autenticación
    const signaturePayload = `${method}${endpoint}${timestamp}${JSON.stringify(body || {})}`;
    const signature = this.config.secretKey 
      ? CryptoJS.HmacSHA256(signaturePayload, this.config.secretKey).toString()
      : '';
    
    try {
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'X-DAES-API-Key': this.config.apiKey,
          'X-DAES-Timestamp': timestamp,
          'X-DAES-Signature': signature,
          'X-DAES-Environment': this.config.environment,
        },
        body: body ? JSON.stringify(body) : undefined,
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error(`[DAES API] Error ${response.status}:`, errorText);
        return { 
          success: false, 
          error: `HTTP ${response.status}: ${errorText || response.statusText}` 
        };
      }
      
      const data = await response.json();
      return { success: true, data };
      
    } catch (error) {
      console.error('[DAES API] Error de conexión:', error);
      
      // Si hay error de red, usar datos en cache/simulados
      if (this.config.environment === 'sandbox') {
        console.log('[DAES API] Usando modo sandbox con datos simulados');
        return this.simulateResponse(endpoint, method, body);
      }
      
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Error de conexión' 
      };
    }
  }
  
  /**
   * Simular respuestas para modo sandbox
   */
  private simulateResponse<T>(
    endpoint: string,
    method: string,
    body?: Record<string, unknown>
  ): { success: boolean; data?: T; error?: string } {
    console.log(`[DAES API] 🧪 Simulando: ${method} ${endpoint}`);
    
    // Simular respuestas según el endpoint
    if (endpoint.includes('/accounts')) {
      return {
        success: true,
        data: this.getSimulatedAccounts() as T
      };
    }
    
    if (endpoint.includes('/balance')) {
      const accountId = endpoint.split('/').pop() || '';
      return {
        success: true,
        data: this.getSimulatedBalance(accountId) as T
      };
    }
    
    if (endpoint.includes('/verify-funds')) {
      return {
        success: true,
        data: this.simulateVerifyFunds(body as Record<string, unknown>) as T
      };
    }
    
    if (endpoint.includes('/fund-card')) {
      return {
        success: true,
        data: this.simulateFundCard(body as Record<string, unknown>) as T
      };
    }
    
    return { success: true, data: {} as T };
  }
  
  // ═══════════════════════════════════════════════════════════════════════════
  // 🧪 DATOS SIMULADOS (SANDBOX)
  // ═══════════════════════════════════════════════════════════════════════════
  
  private getSimulatedAccounts(): DAESAccount[] {
    // Obtener cuentas custodio locales
    const { custodyStore } = require('./custody-store');
    const localAccounts = custodyStore.getAccounts();
    
    return localAccounts.map((acc: any) => ({
      id: acc.id,
      accountNumber: acc.accountNumber || `DAES${Math.random().toString().slice(2, 12)}`,
      accountName: acc.accountName,
      currency: acc.currency,
      availableBalance: acc.availableBalance,
      totalBalance: acc.totalBalance,
      holdBalance: 0,
      status: 'active',
      type: 'custody',
      iban: acc.iban || `DAES${acc.currency}${Math.random().toString().slice(2, 18)}`,
      swift: 'DAESUSXX',
      lastUpdated: new Date().toISOString(),
    }));
  }
  
  private getSimulatedBalance(accountId: string): DAESBalance {
    const accounts = this.getSimulatedAccounts();
    const account = accounts.find(a => a.id === accountId);
    
    return {
      accountId,
      currency: account?.currency || 'USD',
      available: account?.availableBalance || 0,
      total: account?.totalBalance || 0,
      pending: 0,
      reserved: account?.holdBalance || 0,
      lastChecked: new Date().toISOString(),
      verified: true,
    };
  }
  
  private simulateVerifyFunds(body?: Record<string, unknown>): DAESVerificationResult {
    const accountId = body?.accountId as string || '';
    const amount = body?.amount as number || 0;
    
    const accounts = this.getSimulatedAccounts();
    const account = accounts.find(a => a.id === accountId);
    const available = account?.availableBalance || 0;
    
    return {
      success: true,
      verified: true,
      accountId,
      requestedAmount: amount,
      availableBalance: available,
      sufficientFunds: available >= amount,
      holdId: available >= amount ? `HOLD_${Date.now()}` : undefined,
      message: available >= amount 
        ? 'Fondos verificados y disponibles' 
        : 'Fondos insuficientes',
      timestamp: new Date().toISOString(),
      signature: CryptoJS.SHA256(`${accountId}${amount}${Date.now()}`).toString().substring(0, 32),
    };
  }
  
  private simulateFundCard(body?: Record<string, unknown>): DAESCardFunding {
    return {
      cardId: body?.cardId as string || '',
      accountId: body?.accountId as string || '',
      amount: body?.amount as number || 0,
      currency: body?.currency as string || 'USD',
      status: 'completed',
      transactionId: `TXN_${Date.now()}_${Math.random().toString(36).substring(2, 8).toUpperCase()}`,
    };
  }
  
  // ═══════════════════════════════════════════════════════════════════════════
  // 🏦 CUENTAS
  // ═══════════════════════════════════════════════════════════════════════════
  
  /**
   * Obtener todas las cuentas custodio
   */
  async getAccounts(): Promise<DAESAccount[]> {
    const result = await this.apiRequest<DAESAccount[]>('/api/v1/accounts');
    
    if (result.success && result.data) {
      // Actualizar cache
      result.data.forEach(acc => this.accountsCache.set(acc.id, acc));
      this.saveCache();
      this.notifyListeners();
      return result.data;
    }
    
    // Retornar cache si hay error
    return Array.from(this.accountsCache.values());
  }
  
  /**
   * Obtener cuenta por ID
   */
  async getAccount(accountId: string): Promise<DAESAccount | null> {
    const result = await this.apiRequest<DAESAccount>(`/api/v1/accounts/${accountId}`);
    
    if (result.success && result.data) {
      this.accountsCache.set(accountId, result.data);
      this.saveCache();
      return result.data;
    }
    
    return this.accountsCache.get(accountId) || null;
  }
  
  /**
   * Obtener cuentas del cache
   */
  getCachedAccounts(): DAESAccount[] {
    return Array.from(this.accountsCache.values());
  }
  
  // ═══════════════════════════════════════════════════════════════════════════
  // 💰 VERIFICACIÓN DE FONDOS
  // ═══════════════════════════════════════════════════════════════════════════
  
  /**
   * Verificar fondos disponibles en cuenta custodio
   */
  async verifyFunds(
    accountId: string, 
    amount: number, 
    currency: string,
    purpose?: string
  ): Promise<DAESVerificationResult> {
    console.log(`[DAES API] 💰 Verificando fondos: ${currency} ${amount.toLocaleString()}`);
    
    const result = await this.apiRequest<DAESVerificationResult>('/api/v1/verify-funds', 'POST', {
      accountId,
      amount,
      currency,
      purpose: purpose || 'card_funding',
      timestamp: Date.now(),
    });
    
    if (result.success && result.data) {
      console.log(`[DAES API] ✅ Verificación: ${result.data.message}`);
      return result.data;
    }
    
    return {
      success: false,
      verified: false,
      accountId,
      requestedAmount: amount,
      availableBalance: 0,
      sufficientFunds: false,
      message: result.error || 'Error verificando fondos',
      timestamp: new Date().toISOString(),
    };
  }
  
  /**
   * Obtener balance actual de una cuenta
   */
  async getBalance(accountId: string): Promise<DAESBalance | null> {
    const result = await this.apiRequest<DAESBalance>(`/api/v1/balance/${accountId}`);
    
    if (result.success && result.data) {
      this.balancesCache.set(accountId, result.data);
      return result.data;
    }
    
    return this.balancesCache.get(accountId) || null;
  }
  
  /**
   * Verificar fondos para múltiples cuentas
   */
  async verifyMultipleFunds(
    requests: Array<{ accountId: string; amount: number; currency: string }>
  ): Promise<DAESVerificationResult[]> {
    const results = await Promise.all(
      requests.map(req => this.verifyFunds(req.accountId, req.amount, req.currency))
    );
    return results;
  }
  
  // ═══════════════════════════════════════════════════════════════════════════
  // 💳 FONDEO DE TARJETAS
  // ═══════════════════════════════════════════════════════════════════════════
  
  /**
   * Transferir fondos de cuenta custodio a tarjeta
   */
  async fundCard(
    cardId: string,
    accountId: string,
    amount: number,
    currency: string
  ): Promise<DAESCardFunding> {
    console.log(`[DAES API] 💳 Fondeo de tarjeta: ${currency} ${amount.toLocaleString()}`);
    
    // Primero verificar fondos
    const verification = await this.verifyFunds(accountId, amount, currency, 'card_funding');
    
    if (!verification.sufficientFunds) {
      return {
        cardId,
        accountId,
        amount,
        currency,
        status: 'failed',
      };
    }
    
    // Procesar fondeo
    const result = await this.apiRequest<DAESCardFunding>('/api/v1/fund-card', 'POST', {
      cardId,
      accountId,
      amount,
      currency,
      holdId: verification.holdId,
      timestamp: Date.now(),
    });
    
    if (result.success && result.data) {
      // Actualizar balance local de cuenta custodio
      const { custodyStore } = await import('./custody-store');
      const account = custodyStore.getAccountById(accountId);
      if (account) {
        const newBalance = account.totalBalance - amount;
        custodyStore.updateAccountBalance(accountId, newBalance);
      }
      
      console.log(`[DAES API] ✅ Fondeo completado: ${result.data.transactionId}`);
      return result.data;
    }
    
    return {
      cardId,
      accountId,
      amount,
      currency,
      status: 'failed',
    };
  }
  
  /**
   * Devolver fondos de tarjeta a cuenta custodio
   */
  async refundToAccount(
    cardId: string,
    accountId: string,
    amount: number,
    currency: string
  ): Promise<DAESCardFunding> {
    console.log(`[DAES API] 🔄 Devolución: ${currency} ${amount.toLocaleString()}`);
    
    const result = await this.apiRequest<DAESCardFunding>('/api/v1/refund-card', 'POST', {
      cardId,
      accountId,
      amount,
      currency,
      timestamp: Date.now(),
    });
    
    if (result.success && result.data) {
      // Actualizar balance local de cuenta custodio
      const { custodyStore } = await import('./custody-store');
      const account = custodyStore.getAccountById(accountId);
      if (account) {
        const newBalance = account.totalBalance + amount;
        custodyStore.updateAccountBalance(accountId, newBalance);
      }
      
      return result.data;
    }
    
    return {
      cardId,
      accountId,
      amount,
      currency,
      status: 'failed',
    };
  }
  
  // ═══════════════════════════════════════════════════════════════════════════
  // 🔄 SINCRONIZACIÓN AUTOMÁTICA
  // ═══════════════════════════════════════════════════════════════════════════
  
  /**
   * Iniciar sincronización automática
   */
  startAutoSync(): void {
    if (this.syncTimer) {
      clearInterval(this.syncTimer);
    }
    
    const interval = (this.config?.syncInterval || SYNC_INTERVAL_DEFAULT) * 60 * 1000;
    
    this.syncTimer = setInterval(async () => {
      await this.syncAccounts();
    }, interval);
    
    console.log(`[DAES API] 🔄 Auto-sync activado: cada ${this.config?.syncInterval || SYNC_INTERVAL_DEFAULT} minutos`);
    
    // Sincronizar inmediatamente
    this.syncAccounts();
  }
  
  /**
   * Detener sincronización automática
   */
  stopAutoSync(): void {
    if (this.syncTimer) {
      clearInterval(this.syncTimer);
      this.syncTimer = null;
      console.log('[DAES API] ⏹️ Auto-sync detenido');
    }
  }
  
  /**
   * Sincronizar cuentas con el servidor
   */
  async syncAccounts(): Promise<void> {
    console.log('[DAES API] 🔄 Sincronizando cuentas...');
    
    try {
      const accounts = await this.getAccounts();
      
      // Actualizar store local de custody
      const { custodyStore } = await import('./custody-store');
      
      accounts.forEach(daesAccount => {
        const localAccount = custodyStore.getAccountById(daesAccount.id);
        if (localAccount) {
          // Actualizar balance si difiere
          if (localAccount.totalBalance !== daesAccount.totalBalance) {
            custodyStore.updateAccountBalance(daesAccount.id, daesAccount.totalBalance);
            console.log(`[DAES API] 📊 Actualizado: ${daesAccount.accountName} = ${daesAccount.currency} ${daesAccount.totalBalance.toLocaleString()}`);
          }
        }
      });
      
      console.log(`[DAES API] ✅ Sincronización completada: ${accounts.length} cuentas`);
      
    } catch (error) {
      console.error('[DAES API] ❌ Error en sincronización:', error);
    }
  }
  
  // ═══════════════════════════════════════════════════════════════════════════
  // 📊 TRANSACCIONES
  // ═══════════════════════════════════════════════════════════════════════════
  
  /**
   * Obtener historial de transacciones
   */
  async getTransactions(
    accountId: string, 
    options?: { limit?: number; offset?: number; type?: string }
  ): Promise<DAESTransaction[]> {
    const params = new URLSearchParams();
    if (options?.limit) params.set('limit', options.limit.toString());
    if (options?.offset) params.set('offset', options.offset.toString());
    if (options?.type) params.set('type', options.type);
    
    const result = await this.apiRequest<DAESTransaction[]>(
      `/api/v1/transactions/${accountId}?${params.toString()}`
    );
    
    return result.data || [];
  }
  
  // ═══════════════════════════════════════════════════════════════════════════
  // 🔔 SUSCRIPTORES
  // ═══════════════════════════════════════════════════════════════════════════
  
  subscribe(listener: (accounts: DAESAccount[]) => void): () => void {
    this.listeners.add(listener);
    listener(Array.from(this.accountsCache.values()));
    return () => this.listeners.delete(listener);
  }
  
  private notifyListeners(): void {
    const accounts = Array.from(this.accountsCache.values());
    this.listeners.forEach(l => l(accounts));
  }
  
  // ═══════════════════════════════════════════════════════════════════════════
  // 🧪 TESTING
  // ═══════════════════════════════════════════════════════════════════════════
  
  /**
   * Probar conexión con la API
   */
  async testConnection(): Promise<{ success: boolean; message: string; latency?: number }> {
    if (!this.config) {
      return { success: false, message: 'API no configurada' };
    }
    
    const startTime = Date.now();
    
    try {
      const result = await this.apiRequest('/api/v1/ping');
      const latency = Date.now() - startTime;
      
      if (result.success) {
        return { 
          success: true, 
          message: `Conexión exitosa (${latency}ms)`,
          latency 
        };
      }
      
      return { success: false, message: result.error || 'Error de conexión' };
      
    } catch (error) {
      return { 
        success: false, 
        message: error instanceof Error ? error.message : 'Error desconocido' 
      };
    }
  }
  
  /**
   * Limpiar configuración y cache
   */
  clear(): void {
    this.config = null;
    this.accountsCache.clear();
    this.balancesCache.clear();
    this.stopAutoSync();
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(ACCOUNTS_CACHE_KEY);
    console.log('[DAES API] 🗑️ Configuración eliminada');
  }
}

// Singleton
export const daesApiService = new DAESApiService();

export default daesApiService;

