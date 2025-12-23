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

// ═══════════════════════════════════════════════════════════════════════════
// TIPOS PARA TEST DE CONEXIÓN ROBUSTO
// ═══════════════════════════════════════════════════════════════════════════

export interface ConnectionCheck {
  name: string;
  status: 'pending' | 'passed' | 'failed' | 'warning';
  message: string;
  duration: number;
  details?: any;
}

export interface ConnectionTestResult {
  success: boolean;
  message: string;
  checks: ConnectionCheck[];
  summary: {
    total: number;
    passed: number;
    failed: number;
    warnings: number;
    duration: number;
  };
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
  // Test de conexión ROBUSTO
  // ─────────────────────────────────────────────────────────────────────────

  async testConnection(): Promise<ConnectionTestResult> {
    const startTime = Date.now();
    const checks: ConnectionCheck[] = [];

    console.log('[TZDigital] 🔍 Iniciando verificación robusta de conexión...');

    // CHECK 1: Verificar configuración
    const configCheck: ConnectionCheck = {
      name: 'Configuración',
      status: 'pending',
      message: '',
      duration: 0
    };
    
    if (!this.config.bearerToken) {
      configCheck.status = 'failed';
      configCheck.message = 'Bearer Token no configurado';
      checks.push(configCheck);
      return this.buildTestResult(false, checks, startTime);
    }
    
    if (this.config.bearerToken.length < 10) {
      configCheck.status = 'warning';
      configCheck.message = 'Bearer Token parece demasiado corto';
    } else {
      configCheck.status = 'passed';
      configCheck.message = `Token configurado (${this.config.bearerToken.substring(0, 8)}...)`;
    }
    checks.push(configCheck);

    // CHECK 2: Verificar proxy local (solo en browser)
    if (IS_BROWSER) {
      const proxyCheck = await this.checkLocalProxy();
      checks.push(proxyCheck);
      
      if (proxyCheck.status === 'failed') {
        return this.buildTestResult(false, checks, startTime);
      }
    }

    // CHECK 3: Verificar endpoint de test
    const endpointCheck = await this.checkEndpoint();
    checks.push(endpointCheck);

    // CHECK 4: Verificar autenticación
    const authCheck = await this.checkAuthentication();
    checks.push(authCheck);

    // CHECK 5: Verificar latencia
    const latencyCheck = await this.checkLatency();
    checks.push(latencyCheck);

    // Determinar resultado final
    const hasFailures = checks.some(c => c.status === 'failed');
    const hasWarnings = checks.some(c => c.status === 'warning');
    
    return this.buildTestResult(!hasFailures, checks, startTime, hasWarnings);
  }

  private async checkLocalProxy(): Promise<ConnectionCheck> {
    const check: ConnectionCheck = {
      name: 'Proxy Local',
      status: 'pending',
      message: '',
      duration: 0
    };
    const start = Date.now();

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);

      const response = await fetch('/api/tz-digital/test', {
        method: 'GET',
        signal: controller.signal,
        headers: {
          'X-TZ-Token': this.config.bearerToken,
        },
      });

      clearTimeout(timeoutId);
      check.duration = Date.now() - start;

      if (response.ok) {
        const data = await response.json().catch(() => ({}));
        check.status = 'passed';
        check.message = `Proxy activo (${check.duration}ms)`;
        check.details = data;
      } else if (response.status === 404) {
        check.status = 'failed';
        check.message = 'Proxy no encontrado - Verifica que el servidor backend esté corriendo';
      } else {
        check.status = 'warning';
        check.message = `Proxy responde con HTTP ${response.status}`;
      }
    } catch (err: any) {
      check.duration = Date.now() - start;
      if (err?.name === 'AbortError') {
        check.status = 'failed';
        check.message = 'Timeout conectando al proxy local';
      } else {
        check.status = 'failed';
        check.message = `Error de proxy: ${err?.message || 'Conexión rechazada'}`;
        check.details = { error: err?.message, hint: 'Ejecuta: cd server && node index.js' };
      }
    }

    return check;
  }

  private async checkEndpoint(): Promise<ConnectionCheck> {
    const check: ConnectionCheck = {
      name: 'Endpoint TZ Digital',
      status: 'pending',
      message: '',
      duration: 0
    };
    const start = Date.now();

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);

      const testUrl = IS_BROWSER ? '/api/tz-digital/test' : TZ_DIRECT_URL;
      
      const response = await fetch(testUrl, {
        method: IS_BROWSER ? 'GET' : 'OPTIONS',
        signal: controller.signal,
        headers: {
          'Authorization': `Bearer ${this.config.bearerToken}`,
          'X-TZ-Token': this.config.bearerToken,
        },
      });

      clearTimeout(timeoutId);
      check.duration = Date.now() - start;

      // Cualquier respuesta del servidor indica que está accesible
      if (response.ok || response.status === 405 || response.status === 401 || response.status === 403) {
        check.status = 'passed';
        check.message = `Servidor accesible (HTTP ${response.status}, ${check.duration}ms)`;
      } else if (response.status === 404) {
        check.status = 'warning';
        check.message = 'Endpoint responde pero ruta no encontrada';
      } else {
        check.status = 'warning';
        check.message = `Servidor responde HTTP ${response.status}`;
      }

      check.details = {
        status: response.status,
        statusText: response.statusText,
        url: testUrl
      };

    } catch (err: any) {
      check.duration = Date.now() - start;
      
      if (err?.name === 'AbortError') {
        check.status = 'failed';
        check.message = 'Timeout - El servidor no responde en 10s';
      } else if (err?.message?.includes('ENOTFOUND') || err?.message?.includes('DNS')) {
        check.status = 'failed';
        check.message = 'Error DNS - No se puede resolver el dominio';
      } else if (err?.message?.includes('ECONNREFUSED')) {
        check.status = 'failed';
        check.message = 'Conexión rechazada por el servidor';
      } else if (err?.message?.includes('SSL') || err?.message?.includes('certificate')) {
        check.status = 'failed';
        check.message = 'Error de certificado SSL';
      } else {
        check.status = 'failed';
        check.message = `Error de red: ${err?.message || 'Desconocido'}`;
      }
      
      check.details = { error: err?.message };
    }

    return check;
  }

  private async checkAuthentication(): Promise<ConnectionCheck> {
    const check: ConnectionCheck = {
      name: 'Autenticación',
      status: 'pending',
      message: '',
      duration: 0
    };
    const start = Date.now();

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);

      // Enviar una petición mínima para verificar el token
      const testUrl = IS_BROWSER ? '/api/tz-digital/transactions' : TZ_DIRECT_URL;
      
      const response = await fetch(testUrl, {
        method: 'POST',
        signal: controller.signal,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.config.bearerToken}`,
          'X-TZ-Token': this.config.bearerToken,
        },
        body: JSON.stringify({
          amount: 0.01,
          currency: 'USD',
          reference: `TEST-${Date.now()}`,
          _test: true
        }),
      });

      clearTimeout(timeoutId);
      check.duration = Date.now() - start;

      let responseData: any = {};
      try {
        responseData = await response.json();
      } catch {
        // Ignorar error de parsing
      }

      if (response.status === 401) {
        check.status = 'failed';
        check.message = 'Token inválido o expirado';
        check.details = responseData;
      } else if (response.status === 403) {
        check.status = 'failed';
        check.message = 'Token sin permisos suficientes';
        check.details = responseData;
      } else if (response.ok) {
        check.status = 'passed';
        check.message = 'Token válido y autorizado';
      } else if (response.status === 400 || response.status === 422) {
        // Error de validación significa que el token es válido pero el payload no
        check.status = 'passed';
        check.message = 'Token aceptado (validación de payload fallida - esperado)';
      } else {
        check.status = 'warning';
        check.message = `Respuesta HTTP ${response.status} - Verificar manualmente`;
        check.details = responseData;
      }

    } catch (err: any) {
      check.duration = Date.now() - start;
      check.status = 'warning';
      check.message = 'No se pudo verificar autenticación';
      check.details = { error: err?.message };
    }

    return check;
  }

  private async checkLatency(): Promise<ConnectionCheck> {
    const check: ConnectionCheck = {
      name: 'Latencia',
      status: 'pending',
      message: '',
      duration: 0
    };

    const latencies: number[] = [];
    const testUrl = IS_BROWSER ? '/api/tz-digital/test' : TZ_DIRECT_URL;

    // Hacer 3 pings para medir latencia promedio
    for (let i = 0; i < 3; i++) {
      const start = Date.now();
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000);
        
        await fetch(testUrl, {
          method: IS_BROWSER ? 'GET' : 'HEAD',
          signal: controller.signal,
          headers: {
            'X-TZ-Token': this.config.bearerToken,
          },
        });
        
        clearTimeout(timeoutId);
        latencies.push(Date.now() - start);
      } catch {
        latencies.push(5000); // Timeout value
      }
    }

    const avgLatency = Math.round(latencies.reduce((a, b) => a + b, 0) / latencies.length);
    check.duration = avgLatency;

    if (avgLatency < 500) {
      check.status = 'passed';
      check.message = `Excelente (${avgLatency}ms promedio)`;
    } else if (avgLatency < 1500) {
      check.status = 'passed';
      check.message = `Buena (${avgLatency}ms promedio)`;
    } else if (avgLatency < 3000) {
      check.status = 'warning';
      check.message = `Alta latencia (${avgLatency}ms promedio)`;
    } else {
      check.status = 'warning';
      check.message = `Muy alta latencia (${avgLatency}ms promedio)`;
    }

    check.details = { latencies, average: avgLatency };
    return check;
  }

  private buildTestResult(
    success: boolean, 
    checks: ConnectionCheck[], 
    startTime: number,
    hasWarnings: boolean = false
  ): ConnectionTestResult {
    const totalDuration = Date.now() - startTime;
    const passed = checks.filter(c => c.status === 'passed').length;
    const failed = checks.filter(c => c.status === 'failed').length;
    const warnings = checks.filter(c => c.status === 'warning').length;

    let message: string;
    if (success && !hasWarnings) {
      message = `✅ Conexión verificada (${passed}/${checks.length} checks OK)`;
    } else if (success && hasWarnings) {
      message = `⚠️ Conexión disponible con advertencias (${warnings} warnings)`;
    } else {
      message = `❌ Conexión fallida (${failed} errores)`;
    }

    console.log(`[TZDigital] ${message} - ${totalDuration}ms total`);
    checks.forEach(c => {
      const icon = c.status === 'passed' ? '✅' : c.status === 'warning' ? '⚠️' : '❌';
      console.log(`[TZDigital]   ${icon} ${c.name}: ${c.message}`);
    });

    return {
      success,
      message,
      checks,
      summary: {
        total: checks.length,
        passed,
        failed,
        warnings,
        duration: totalDuration
      },
      timestamp: new Date().toISOString()
    };
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

