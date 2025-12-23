/**
 * TZ Digital Bank Transfer API Client
 * API: https://banktransfer.tzdigitalpvtlimited.com/api/transactions
 * Protocol: HTTPS REST
 * Auth: Bearer Token
 * 
 * Soporta transferencias USD y EUR
 */

// ═══════════════════════════════════════════════════════════════════════════
// CONFIGURACIÓN
// ═══════════════════════════════════════════════════════════════════════════

// URL directa de TZ Digital
const TZ_DIRECT_URL = "https://banktransfer.tzdigitalpvtlimited.com/api/transactions";

// Proxy local para evitar CORS en browser
const TZ_PROXY_URL = "/api/tz-digital/transactions";
const TZ_PROXY_TEST_URL = "/api/tz-digital/test";

// Detectar si estamos en browser y usar proxy
const IS_BROWSER = typeof window !== 'undefined';
const API_URL = IS_BROWSER ? TZ_PROXY_URL : TZ_DIRECT_URL;
const TEST_URL = IS_BROWSER ? TZ_PROXY_TEST_URL : TZ_DIRECT_URL;

const DEFAULT_TIMEOUT = 25000; // 25 segundos

export type Currency = "USD" | "EUR";

// ═══════════════════════════════════════════════════════════════════════════
// TIPOS DE PAYLOAD
// ═══════════════════════════════════════════════════════════════════════════

export interface MoneyTransferPayload {
  amount: number;
  currency: Currency;
  reference: string;
  
  // Beneficiario
  beneficiary_name?: string;
  beneficiary_account?: string;
  beneficiary_bank?: string;
  beneficiary_iban?: string;
  beneficiary_swift?: string;
  beneficiary_country?: string;
  
  // Remitente
  sender_name?: string;
  sender_account?: string;
  sender_bank?: string;
  
  // Metadatos
  note?: string;
  purpose?: string;
  channel?: string;
  
  // Campos adicionales
  [key: string]: any;
}

export interface StandardTransfer {
  currency: Currency;
  amount: number;
  reference: string;
  
  beneficiary: {
    name: string;
    iban?: string;
    accountNumber?: string;
    bankName?: string;
    swiftBic?: string;
    country?: string;
  };
  
  sender?: {
    name?: string;
    accountId?: string;
  };
  
  metadata?: Record<string, any>;
}

// ═══════════════════════════════════════════════════════════════════════════
// TIPOS DE RESPUESTA
// ═══════════════════════════════════════════════════════════════════════════

export interface ApiResult<T = any> {
  ok: boolean;
  success: boolean;
  status: number;
  data?: T;
  response?: T;
  error?: {
    message: string;
    details?: any;
  };
  requestId?: string;
  timestamp: string;
}

export interface TransferRecord {
  id: string;
  payload: MoneyTransferPayload;
  result: ApiResult;
  timestamp: string;
  status: 'pending' | 'success' | 'failed';
}

// ═══════════════════════════════════════════════════════════════════════════
// STORAGE
// ═══════════════════════════════════════════════════════════════════════════

const STORAGE_KEY = 'tz_digital_config';
const TRANSFERS_KEY = 'tz_digital_transfers';

export interface TZDigitalConfig {
  bearerToken: string;
  baseUrl: string;
  defaultCurrency: Currency;
  defaultSenderName: string;
  defaultSenderAccount: string;
  defaultSenderBank: string;
  isConfigured: boolean;
  lastUpdated: string;
}

// ═══════════════════════════════════════════════════════════════════════════
// BEARER TOKEN CONFIGURADO
// ═══════════════════════════════════════════════════════════════════════════
const CONFIGURED_BEARER_TOKEN = '4e2e1b2f-03f3-4c5b-b54e-23d9145c1fde';

const DEFAULT_CONFIG: TZDigitalConfig = {
  bearerToken: CONFIGURED_BEARER_TOKEN,
  baseUrl: API_URL,
  defaultCurrency: 'USD',
  defaultSenderName: 'Digital Commercial Bank Ltd',
  defaultSenderAccount: 'DAES-BK-USD-001',
  defaultSenderBank: 'Digital Commercial Bank Ltd',
  isConfigured: true,
  lastUpdated: new Date().toISOString(),
};

// ═══════════════════════════════════════════════════════════════════════════
// CLIENTE API
// ═══════════════════════════════════════════════════════════════════════════

class TZDigitalTransferClient {
  private config: TZDigitalConfig;
  private transfers: TransferRecord[] = [];

  constructor() {
    this.config = this.loadConfig();
    this.transfers = this.loadTransfers();
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Configuración
  // ─────────────────────────────────────────────────────────────────────────

  private loadConfig(): TZDigitalConfig {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        return { ...DEFAULT_CONFIG, ...JSON.parse(stored) };
      }
    } catch (e) {
      console.error('[TZDigital] Error loading config:', e);
    }
    return DEFAULT_CONFIG;
  }

  private saveConfig(): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.config));
    } catch (e) {
      console.error('[TZDigital] Error saving config:', e);
    }
  }

  getConfig(): TZDigitalConfig {
    return { ...this.config };
  }

  configure(config: Partial<TZDigitalConfig>): void {
    this.config = {
      ...this.config,
      ...config,
      isConfigured: !!(config.bearerToken || this.config.bearerToken),
      lastUpdated: new Date().toISOString(),
    };
    this.saveConfig();
    console.log('[TZDigital] ✅ Configuración actualizada');
  }

  isConfigured(): boolean {
    return this.config.isConfigured && !!this.config.bearerToken;
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Historial de transferencias
  // ─────────────────────────────────────────────────────────────────────────

  private loadTransfers(): TransferRecord[] {
    try {
      const stored = localStorage.getItem(TRANSFERS_KEY);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (e) {
      console.error('[TZDigital] Error loading transfers:', e);
    }
    return [];
  }

  private saveTransfers(): void {
    try {
      localStorage.setItem(TRANSFERS_KEY, JSON.stringify(this.transfers));
    } catch (e) {
      console.error('[TZDigital] Error saving transfers:', e);
    }
  }

  getTransfers(): TransferRecord[] {
    return [...this.transfers];
  }

  clearTransfers(): void {
    this.transfers = [];
    this.saveTransfers();
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Generador de referencias
  // ─────────────────────────────────────────────────────────────────────────

  generateReference(currency: Currency): string {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 8).toUpperCase();
    return `DAES-${currency}-${timestamp}-${random}`;
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Envío de transferencias
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Envía una transferencia con payload genérico
   */
  async sendMoney(
    payload: MoneyTransferPayload,
    opts?: { timeoutMs?: number; idempotencyKey?: string }
  ): Promise<ApiResult> {
    if (!this.config.bearerToken) {
      return {
        ok: false,
        success: false,
        status: 0,
        error: { message: 'Bearer Token no configurado' },
        timestamp: new Date().toISOString(),
      };
    }

    // Validaciones básicas
    if (!payload.amount || payload.amount <= 0) {
      return {
        ok: false,
        success: false,
        status: 0,
        error: { message: 'Monto inválido' },
        timestamp: new Date().toISOString(),
      };
    }

    if (!payload.currency || !['USD', 'EUR'].includes(payload.currency)) {
      return {
        ok: false,
        success: false,
        status: 0,
        error: { message: 'Moneda inválida (debe ser USD o EUR)' },
        timestamp: new Date().toISOString(),
      };
    }

    if (!payload.reference) {
      payload.reference = this.generateReference(payload.currency);
    }

    const timeoutMs = opts?.timeoutMs ?? DEFAULT_TIMEOUT;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    const transferId = `TXN-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
    
    console.log(`[TZDigital] 📤 Enviando transferencia ${payload.currency} ${payload.amount}...`);
    console.log(`[TZDigital] Reference: ${payload.reference}`);
    console.log(`[TZDigital] URL: ${this.config.baseUrl} (Browser: ${IS_BROWSER})`);

    try {
      const response = await fetch(this.config.baseUrl, {
        method: 'POST',
        signal: controller.signal,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.config.bearerToken}`,
          'X-TZ-Token': this.config.bearerToken, // Header para el proxy
          ...(opts?.idempotencyKey ? { 'Idempotency-Key': opts.idempotencyKey } : {}),
        },
        body: JSON.stringify(payload),
      });

      const text = await response.text();
      let data: any;
      
      try {
        data = text ? JSON.parse(text) : undefined;
      } catch {
        data = text;
      }

      const requestId = 
        response.headers.get('x-request-id') ||
        response.headers.get('x-correlation-id') ||
        response.headers.get('request-id') ||
        undefined;

      const result: ApiResult = {
        ok: response.ok,
        success: response.ok,
        status: response.status,
        data,
        response: data,
        requestId,
        timestamp: new Date().toISOString(),
        ...(response.ok ? {} : {
          error: {
            message: `API Error HTTP ${response.status}`,
            details: data,
          },
        }),
      };

      // Guardar en historial
      const record: TransferRecord = {
        id: transferId,
        payload,
        result,
        timestamp: new Date().toISOString(),
        status: response.ok ? 'success' : 'failed',
      };
      this.transfers.unshift(record);
      if (this.transfers.length > 100) {
        this.transfers = this.transfers.slice(0, 100);
      }
      this.saveTransfers();

      console.log(`[TZDigital] ${response.ok ? '✅' : '❌'} Resultado:`, result);
      
      return result;

    } catch (err: any) {
      const isAbort = err?.name === 'AbortError';
      const result: ApiResult = {
        ok: false,
        success: false,
        status: 0,
        error: {
          message: isAbort ? `Timeout (${timeoutMs}ms)` : 'Error de red/conexión',
          details: String(err?.message || err),
        },
        timestamp: new Date().toISOString(),
      };

      // Guardar en historial
      const record: TransferRecord = {
        id: transferId,
        payload,
        result,
        timestamp: new Date().toISOString(),
        status: 'failed',
      };
      this.transfers.unshift(record);
      this.saveTransfers();

      console.error('[TZDigital] ❌ Error:', result);
      return result;

    } finally {
      clearTimeout(timeoutId);
    }
  }

  /**
   * Envía una transferencia con formato estándar
   */
  async sendStandardTransfer(
    transfer: StandardTransfer,
    opts?: { timeoutMs?: number; idempotencyKey?: string }
  ): Promise<ApiResult> {
    // Convertir formato estándar a payload genérico
    const payload: MoneyTransferPayload = {
      amount: transfer.amount,
      currency: transfer.currency,
      reference: transfer.reference || this.generateReference(transfer.currency),
      
      beneficiary_name: transfer.beneficiary.name,
      beneficiary_account: transfer.beneficiary.accountNumber,
      beneficiary_iban: transfer.beneficiary.iban,
      beneficiary_bank: transfer.beneficiary.bankName,
      beneficiary_swift: transfer.beneficiary.swiftBic,
      beneficiary_country: transfer.beneficiary.country,
      
      sender_name: transfer.sender?.name || this.config.defaultSenderName,
      sender_account: transfer.sender?.accountId || this.config.defaultSenderAccount,
      sender_bank: this.config.defaultSenderBank,
      
      ...transfer.metadata,
    };

    return this.sendMoney(payload, opts);
  }

  /**
   * Envía payload RAW tal cual
   */
  async sendRaw(
    payload: Record<string, any>,
    opts?: { timeoutMs?: number; idempotencyKey?: string }
  ): Promise<ApiResult> {
    return this.sendMoney(payload as MoneyTransferPayload, opts);
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Test de conexión
  // ─────────────────────────────────────────────────────────────────────────

  async testConnection(): Promise<{ success: boolean; message: string; details?: any }> {
    if (!this.config.bearerToken) {
      return { success: false, message: 'Bearer Token no configurado' };
    }

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);

      // Usar endpoint de test del proxy en browser
      const testUrl = IS_BROWSER ? TEST_URL : this.config.baseUrl;
      
      console.log(`[TZDigital] 🔍 Test de conexión a: ${testUrl}`);

      const response = await fetch(testUrl, {
        method: IS_BROWSER ? 'GET' : 'OPTIONS',
        signal: controller.signal,
        headers: {
          'Authorization': `Bearer ${this.config.bearerToken}`,
          'X-TZ-Token': this.config.bearerToken,
        },
      });

      clearTimeout(timeoutId);

      // En browser, el proxy devuelve JSON
      let result = { success: false, message: '' };
      if (IS_BROWSER) {
        try {
          result = await response.json();
        } catch {
          result = { success: response.ok, message: `HTTP ${response.status}` };
        }
      }

      return {
        success: IS_BROWSER ? result.success : (response.ok || response.status === 405 || response.status === 404),
        message: IS_BROWSER ? result.message : (response.ok 
          ? 'Conexión exitosa'
          : `Servidor responde (HTTP ${response.status})`),
        details: {
          status: response.status,
          statusText: response.statusText,
        },
      };

    } catch (err: any) {
      return {
        success: false,
        message: err?.name === 'AbortError' ? 'Timeout de conexión' : 'Error de conexión',
        details: String(err?.message || err),
      };
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Estadísticas
  // ─────────────────────────────────────────────────────────────────────────

  getStats(): {
    total: number;
    successful: number;
    failed: number;
    pending: number;
    totalUSD: number;
    totalEUR: number;
  } {
    const stats = {
      total: this.transfers.length,
      successful: 0,
      failed: 0,
      pending: 0,
      totalUSD: 0,
      totalEUR: 0,
    };

    this.transfers.forEach(t => {
      if (t.status === 'success') {
        stats.successful++;
        if (t.payload.currency === 'USD') stats.totalUSD += t.payload.amount;
        if (t.payload.currency === 'EUR') stats.totalEUR += t.payload.amount;
      } else if (t.status === 'failed') {
        stats.failed++;
      } else {
        stats.pending++;
      }
    });

    return stats;
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// INSTANCIA SINGLETON
// ═══════════════════════════════════════════════════════════════════════════

export const tzDigitalClient = new TZDigitalTransferClient();

// ═══════════════════════════════════════════════════════════════════════════
// FUNCIONES DE CONVENIENCIA
// ═══════════════════════════════════════════════════════════════════════════

export async function sendMoney(payload: MoneyTransferPayload): Promise<ApiResult> {
  return tzDigitalClient.sendMoney(payload);
}

export async function sendUSD(
  amount: number,
  beneficiaryName: string,
  beneficiaryAccount: string,
  opts?: { reference?: string; note?: string }
): Promise<ApiResult> {
  return tzDigitalClient.sendMoney({
    amount,
    currency: 'USD',
    reference: opts?.reference || tzDigitalClient.generateReference('USD'),
    beneficiary_name: beneficiaryName,
    beneficiary_account: beneficiaryAccount,
    note: opts?.note,
  });
}

export async function sendEUR(
  amount: number,
  beneficiaryName: string,
  beneficiaryIban: string,
  opts?: { reference?: string; note?: string }
): Promise<ApiResult> {
  return tzDigitalClient.sendMoney({
    amount,
    currency: 'EUR',
    reference: opts?.reference || tzDigitalClient.generateReference('EUR'),
    beneficiary_name: beneficiaryName,
    beneficiary_iban: beneficiaryIban,
    note: opts?.note,
  });
}

export default tzDigitalClient;

