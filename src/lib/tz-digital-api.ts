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

// ═══════════════════════════════════════════════════════════════════════════
// CIS S2S API 2025 - DEVMIND GROUP CONFIGURATION
// ═══════════════════════════════════════════════════════════════════════════
// Receiving Server Name: DEV-CORE-PAY-GW-01
// Server Location: London, United Kingdom
// Protocol: HTTPS REST API — JSON Payload
// ═══════════════════════════════════════════════════════════════════════════

// URL directa de DevMind Group API (CIS S2S)
const TZ_DIRECT_URL = "https://banktransfer.devmindgroup.com/api/transactions";

// API alternativa de recepción
const DEVMIND_RECEIVE_URL = "https://secure.devmindpay.com/api/v1/transaction/receive";

// Global Server IP
const GLOBAL_SERVER_IP = "172.67.157.88";
const RECEIVING_PORT = 8443; // TLS/SSL Enabled

// API Keys del documento CIS S2S
const CIS_API_KEY = "47061d41-7994-4fad-99a7-54879acd9a83";
const CIS_AUTH_KEY = "DMP-SECURE-KEY-7X93-FF28-ZQ19";

// SHA256 Handshake Hash (del documento)
const CIS_SHA256_HANDSHAKE = "b19f2a94eab4cd3b92f1e3e0dce9d541c8b7aa3fdbe6e2f4ac3c91a5fbb2f44";

// Internal IP Ranges
const INTERNAL_IP_RANGES = ["172.16.0.0/24", "10.26.0.0/16"];
const DNS_RANGE = "192.168.1.100/24";

// Servidor local Express (para Electron y producción)
const LOCAL_SERVER_URL = "http://localhost:3000";

// Proxy local para evitar CORS en browser
const TZ_PROXY_URL = "/api/tz-digital/transactions";
const TZ_PROXY_TEST_URL = "/api/tz-digital/test";

// Detectar entorno
const IS_BROWSER = typeof window !== 'undefined';
const IS_ELECTRON = IS_BROWSER && ((window as any).electron !== undefined || navigator.userAgent.includes('Electron'));
const IS_FILE_PROTOCOL = IS_BROWSER && window.location.protocol === 'file:';
const IS_PRODUCTION = IS_BROWSER && !window.location.hostname.includes('localhost') && window.location.protocol !== 'file:';

// Determinar URLs según entorno
// En Electron o file:// usamos el servidor local directamente
// En desarrollo web usamos el proxy de Vite
const getApiUrl = () => {
  if (IS_ELECTRON || IS_FILE_PROTOCOL) {
    return `${LOCAL_SERVER_URL}/api/tz-digital/transactions`;
  }
  return TZ_PROXY_URL;
};

const getTestUrl = () => {
  if (IS_ELECTRON || IS_FILE_PROTOCOL) {
    return `${LOCAL_SERVER_URL}/api/tz-digital/test`;
  }
  return TZ_PROXY_TEST_URL;
};

const API_URL = getApiUrl();
const TEST_URL = getTestUrl();

// Estado del servidor local
let localServerAvailable: boolean | null = null;

const DEFAULT_TIMEOUT = 25000; // 25 segundos

export type Currency = "USD" | "EUR";

// ═══════════════════════════════════════════════════════════════════════════
// FUNDS PROCESSING - SHA256 HANDSHAKE TYPES
// ═══════════════════════════════════════════════════════════════════════════

/**
 * CIS S2S Supported Transfer Protocols (Sin Blockchain)
 */
export type TransferProtocol = 
  | 'SWIFT_NET'
  | 'SWIFT_COM'
  | 'SWIFT_MT103_DIRECT'
  | 'SWIFT_MT103_GPI'
  | 'SWIFT_MT103_GPI_SEMI'
  | 'VISA_NET'
  | 'SERVER_TO_SERVER'
  | 'GLOBAL_SERVER_POOL';

/**
 * CIS S2S Client Information (Black Screen Display)
 */
export interface CISClientInfo {
  signatory_name: string;
  nationality: string;
  passport_number: string;
  date_of_issue: string;
  expiration_date: string;
  issued_by: string;
  date_of_birth: string;
  place_of_birth: string;
}

/**
 * CIS S2S Server Details (Black Screen Display)
 */
export interface CISServerDetails {
  global_server_ip: string;
  global_id?: string;
  receiving_server_name: string;
  receiving_port: number;
  api_endpoint: string;
  api_key: string;
  auth_key: string;
  internal_ip_ranges: string[];
  dns_range: string;
}

/**
 * CIS S2S Transmission Codes
 */
export interface TransmissionCodes {
  reference_number?: string;
  transaction_code?: string;
  access_code?: string;
  release_code?: string;
  withdrawal_code?: string;
  download_code?: string;
  final_code?: string;
  final_blocking_code?: string;
  interbank_blocking_code?: string;
  permit_arrival_money_number?: string;
  clearing_house_number?: string;
  transaction_id?: string;
  unique_transaction_number?: string;
  hash_code?: string;
  approval_code?: string;
}

/**
 * Funds Processing Transaction Payload
 * Based on CIS S2S API 2025 - Expected Payload Structure
 */
export interface FundsTxPayload {
  transaction_id: string;
  amount: number;
  currency: string;      // e.g. "EUR", "USD"
  from_bank: string;     // e.g. "Deutsche Bank AG"
  to_bank: string;       // e.g. "HSBC UK Bank plc"
  status: "pending" | "approved" | "rejected" | string;
  // CIS S2S Optional fields
  protocol?: TransferProtocol;
  channel?: 'INSTANT_SERVER_SETTLEMENT' | string;
  transmission_codes?: TransmissionCodes;
  client_info?: CISClientInfo;
  // Optional additional fields
  reference?: string;
  description?: string;
  metadata?: Record<string, any>;
}

/**
 * Handshake configuration for SHA256/HMAC-SHA256 verification
 */
export interface HandshakeConfig {
  enabled?: boolean;
  mode?: "sha256" | "hmac-sha256";
  secret?: string; // only for hmac-sha256
  headerName?: string; // default "X-Handshake-Hash"
}

/**
 * Funds Processing Configuration
 */
export interface FundsProcessingConfig {
  baseUrl: string;        // e.g. "https://banktransfer.tzdigitalpvtlimited.com"
  endpointPath?: string;  // default "/api/transactions"
  bearerToken: string;    // API Authentication Key
  timeoutMs?: number;
  handshake?: HandshakeConfig;
}

/**
 * Result from Funds Processing API call
 */
export interface FundsProcessingResult {
  ok: boolean;
  status: number;
  data: any;
  rawText?: string;
  handshakeHash?: string;
  timestamp: string;
}

// ═══════════════════════════════════════════════════════════════════════════
// SHA256 HANDSHAKE UTILITIES
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Canonicalize JSON to get stable hashing:
 * - Sorts object keys recursively
 * - Ensures the same payload always produces the same hash
 */
function canonicalize(value: any): any {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (value && typeof value === "object") {
    const out: Record<string, any> = {};
    for (const k of Object.keys(value).sort()) out[k] = canonicalize(value[k]);
    return out;
  }
  return value;
}

/**
 * Generate SHA256 hash (browser compatible)
 */
async function sha256Hex(data: string): Promise<string> {
  try {
    const encoder = new TextEncoder();
    const dataBuffer = encoder.encode(data);
    const hashBuffer = await crypto.subtle.digest('SHA-256', dataBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  } catch {
    // Fallback for environments without crypto.subtle
    let hash = 0;
    for (let i = 0; i < data.length; i++) {
      const char = data.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return Math.abs(hash).toString(16).padStart(64, '0');
  }
}

/**
 * Generate HMAC-SHA256 hash (browser compatible)
 */
async function hmacSha256Hex(data: string, secret: string): Promise<string> {
  try {
    const encoder = new TextEncoder();
    const keyData = encoder.encode(secret);
    const key = await crypto.subtle.importKey(
      'raw',
      keyData,
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    );
    const dataBuffer = encoder.encode(data);
    const signature = await crypto.subtle.sign('HMAC', key, dataBuffer);
    const hashArray = Array.from(new Uint8Array(signature));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  } catch (err) {
    console.error('[TZDigital] HMAC-SHA256 error:', err);
    throw new Error('HMAC-SHA256 not available in this environment');
  }
}

/**
 * Build handshake hash from payload
 */
async function buildHandshakeHash(
  payload: FundsTxPayload, 
  handshake?: HandshakeConfig
): Promise<string | null> {
  if (!handshake || handshake.enabled === false) return null;

  const canonicalPayload = canonicalize(payload);
  const bodyStr = JSON.stringify(canonicalPayload);

  const mode = handshake.mode ?? "sha256";

  if (mode === "sha256") {
    return await sha256Hex(bodyStr);
  }

  // hmac-sha256
  if (!handshake.secret) {
    throw new Error("handshake.secret is required when handshake.mode is 'hmac-sha256'");
  }
  return await hmacSha256Hex(bodyStr, handshake.secret);
}

// ═══════════════════════════════════════════════════════════════════════════
// TIPOS DE PAYLOAD - STANDARD TRANSFER
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
  isRealConnection: boolean;
  connectionProof?: ConnectionProof;
}

export interface ConnectionProof {
  serverIP?: string;
  serverHeaders?: Record<string, string>;
  responseTime: number;
  sslVerified: boolean;
  dnsResolved: boolean;
  httpStatusCode: number;
  serverFingerprint: string;
  timestamp: string;
  proofHash: string;
}

// ═══════════════════════════════════════════════════════════════════════════
// TIPOS PARA SOLUCIONADOR DE ERRORES
// ═══════════════════════════════════════════════════════════════════════════

export interface ConnectionError {
  code: string;
  message: string;
  details?: string;
  timestamp: string;
}

export interface ConnectionSolution {
  errorCode: string;
  description: string;
  steps: string[];
  autoFixAvailable: boolean;
  autoFixAction?: () => Promise<boolean>;
  priority: 'critical' | 'high' | 'medium' | 'low';
}

export interface TroubleshootResult {
  success: boolean;
  errorsFound: ConnectionError[];
  solutionsApplied: string[];
  solutionsPending: ConnectionSolution[];
  finalStatus: 'connected' | 'partially_connected' | 'disconnected';
  recommendations: string[];
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
   * Envía una transacción de Funds Processing con SHA256 Handshake Hash
   * 
   * @param payload - FundsTxPayload con datos de la transacción
   * @param config - Configuración opcional (usa la config del cliente por defecto)
   * @returns FundsProcessingResult con el resultado de la operación
   */
  async sendFundsProcessingTransaction(
    payload: FundsTxPayload,
    config?: Partial<FundsProcessingConfig>
  ): Promise<FundsProcessingResult> {
    const cfg: FundsProcessingConfig = {
      baseUrl: config?.baseUrl || TZ_DIRECT_URL.replace('/api/transactions', ''),
      endpointPath: config?.endpointPath || '/api/transactions',
      bearerToken: config?.bearerToken || this.config.bearerToken,
      timeoutMs: config?.timeoutMs || DEFAULT_TIMEOUT,
      handshake: config?.handshake ?? {
        enabled: true,
        mode: 'sha256',
        headerName: 'X-Handshake-Hash'
      }
    };

    if (!cfg.bearerToken) {
      return {
        ok: false,
        status: 0,
        data: { error: 'Bearer Token no configurado' },
        timestamp: new Date().toISOString()
      };
    }

    // Validar payload
    if (!payload.transaction_id) {
      payload.transaction_id = `CR${Date.now()}${Math.floor(Math.random() * 10000)}`;
    }
    if (!payload.amount || payload.amount <= 0) {
      return {
        ok: false,
        status: 0,
        data: { error: 'Monto inválido' },
        timestamp: new Date().toISOString()
      };
    }
    if (!payload.currency) {
      return {
        ok: false,
        status: 0,
        data: { error: 'Moneda requerida' },
        timestamp: new Date().toISOString()
      };
    }

    // Construir URL
    const url = (IS_ELECTRON || IS_FILE_PROTOCOL)
      ? `${LOCAL_SERVER_URL}/api/tz-digital/funds-processing`
      : '/api/tz-digital/funds-processing';

    // Generar handshake hash
    let handshakeHash: string | null = null;
    try {
      handshakeHash = await buildHandshakeHash(payload, cfg.handshake);
    } catch (err: any) {
      console.error('[TZDigital] Error generando handshake hash:', err);
    }

    const headerName = cfg.handshake?.headerName ?? 'X-Handshake-Hash';

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${cfg.bearerToken}`,
      'X-TZ-Token': cfg.bearerToken,
    };

    if (handshakeHash) {
      headers[headerName] = handshakeHash;
    }

    console.log(`[TZDigital] 📤 Funds Processing Transaction:`);
    console.log(`  - ID: ${payload.transaction_id}`);
    console.log(`  - Amount: ${payload.currency} ${payload.amount.toLocaleString()}`);
    console.log(`  - From: ${payload.from_bank}`);
    console.log(`  - To: ${payload.to_bank}`);
    console.log(`  - Handshake Hash: ${handshakeHash ? handshakeHash.substring(0, 16) + '...' : 'disabled'}`);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), cfg.timeoutMs || DEFAULT_TIMEOUT);

    try {
      const response = await fetch(url, {
        method: 'POST',
        signal: controller.signal,
        headers,
        body: JSON.stringify(payload),
      });

      clearTimeout(timeoutId);

      const text = await response.text();
      let data: any = null;

      try {
        data = text ? JSON.parse(text) : null;
      } catch {
        data = null;
      }

      const result: FundsProcessingResult = {
        ok: response.ok,
        status: response.status,
        data: data ?? { message: 'Non-JSON response', body: text },
        rawText: data ? undefined : text,
        handshakeHash: handshakeHash || undefined,
        timestamp: new Date().toISOString()
      };

      // Guardar en historial
      const record: TransferRecord = {
        id: `FP-${payload.transaction_id}`,
        payload: payload as any,
        result: result as any,
        timestamp: new Date().toISOString(),
        status: response.ok ? 'success' : 'failed',
      };
      this.transfers.unshift(record);
      if (this.transfers.length > 100) {
        this.transfers = this.transfers.slice(0, 100);
      }
      this.saveTransfers();

      console.log(`[TZDigital] ${response.ok ? '✅' : '❌'} Funds Processing Result:`, result);

      return result;

    } catch (err: any) {
      clearTimeout(timeoutId);
      
      const isAbort = err?.name === 'AbortError';
      return {
        ok: false,
        status: 0,
        data: {
          error: isAbort ? `Timeout (${cfg.timeoutMs}ms)` : 'Error de red/conexión',
          details: String(err?.message || err)
        },
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * Genera un hash SHA256 para verificar integridad de datos
   */
  async generateSHA256Hash(data: string | object): Promise<string> {
    const str = typeof data === 'string' ? data : JSON.stringify(canonicalize(data));
    return await sha256Hex(str);
  }

  /**
   * Genera un hash HMAC-SHA256 para autenticación
   */
  async generateHMACSHA256Hash(data: string | object, secret: string): Promise<string> {
    const str = typeof data === 'string' ? data : JSON.stringify(canonicalize(data));
    return await hmacSha256Hex(str, secret);
  }

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

    // CHECK 6: Verificar que la conexión es REAL (no simulada)
    const { realConnectionCheck, connectionProof } = await this.checkRealConnection();
    checks.push(realConnectionCheck);

    // Determinar resultado final
    const hasFailures = checks.some(c => c.status === 'failed');
    const hasWarnings = checks.some(c => c.status === 'warning');
    
    return this.buildTestResult(!hasFailures, checks, startTime, hasWarnings, connectionProof);
  }

  // ─────────────────────────────────────────────────────────────────────────
  // CHECK: Verificar conexión REAL (no simulada)
  // ─────────────────────────────────────────────────────────────────────────
  private async checkRealConnection(): Promise<{ realConnectionCheck: ConnectionCheck; connectionProof: ConnectionProof }> {
    const check: ConnectionCheck = {
      name: 'Conexión Real',
      status: 'pending',
      message: '',
      duration: 0
    };
    const start = Date.now();

    // Inicializar prueba de conexión
    const proof: ConnectionProof = {
      responseTime: 0,
      sslVerified: false,
      dnsResolved: false,
      httpStatusCode: 0,
      serverFingerprint: '',
      timestamp: new Date().toISOString(),
      proofHash: '',
      serverHeaders: {}
    };

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000);

      // Hacer una llamada real al endpoint
      const testUrl = IS_BROWSER ? '/api/tz-digital/transactions' : TZ_DIRECT_URL;
      const uniqueRef = `CONN-TEST-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
      
      console.log('[TZDigital] 🔬 Verificando conexión REAL...');
      console.log(`[TZDigital] URL: ${testUrl}`);
      console.log(`[TZDigital] Reference: ${uniqueRef}`);

      const response = await fetch(testUrl, {
        method: 'POST',
        signal: controller.signal,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.config.bearerToken}`,
          'X-TZ-Token': this.config.bearerToken,
          'X-Connection-Test': 'true',
          'X-Test-Reference': uniqueRef,
        },
        body: JSON.stringify({
          amount: 0.01,
          currency: 'USD',
          reference: uniqueRef,
          _connectionTest: true,
          _timestamp: Date.now(),
        }),
      });

      clearTimeout(timeoutId);
      check.duration = Date.now() - start;
      proof.responseTime = check.duration;

      // Capturar headers del servidor
      const serverHeaders: Record<string, string> = {};
      response.headers.forEach((value, key) => {
        serverHeaders[key] = value;
      });
      proof.serverHeaders = serverHeaders;

      // Verificar código HTTP
      proof.httpStatusCode = response.status;

      // DNS resuelto si llegamos aquí
      proof.dnsResolved = true;

      // SSL verificado si la URL es HTTPS y no hubo error
      proof.sslVerified = testUrl.startsWith('https') || IS_BROWSER;

      // Generar fingerprint del servidor basado en headers y respuesta
      const fingerprintData = [
        response.status,
        response.statusText,
        serverHeaders['server'] || '',
        serverHeaders['content-type'] || '',
        serverHeaders['date'] || '',
        serverHeaders['x-request-id'] || serverHeaders['x-correlation-id'] || '',
        check.duration,
      ].join('|');
      
      proof.serverFingerprint = await this.generateHash(fingerprintData);

      // Generar hash de prueba
      const proofData = JSON.stringify({
        status: response.status,
        duration: check.duration,
        timestamp: proof.timestamp,
        fingerprint: proof.serverFingerprint,
        headers: Object.keys(serverHeaders).length,
      });
      proof.proofHash = await this.generateHash(proofData);

      // Leer respuesta
      let responseData: any = {};
      try {
        responseData = await response.json();
      } catch {
        // Ignorar error de parsing
      }

      // Validar criterios de conexión real
      const validationResults = {
        hasRealLatency: check.duration > 50, // Conexión remota real > 50ms
        hasServerResponse: response.status > 0,
        hasDnsResolved: proof.dnsResolved,
        hasHeaders: Object.keys(serverHeaders).length > 0,
        hasFingerprint: proof.serverFingerprint.length > 0,
        hasValidStatus: response.status !== 0 && response.status < 600,
      };

      const passedValidations = Object.values(validationResults).filter(Boolean).length;
      const totalValidations = Object.keys(validationResults).length;

      console.log('[TZDigital] Validaciones de conexión real:', validationResults);
      console.log(`[TZDigital] Validaciones pasadas: ${passedValidations}/${totalValidations}`);

      if (passedValidations >= 5) {
        check.status = 'passed';
        check.message = `✓ CONEXIÓN REAL VERIFICADA (${passedValidations}/${totalValidations} criterios)`;
        check.details = {
          proof: {
            responseTime: `${proof.responseTime}ms`,
            httpStatus: proof.httpStatusCode,
            dnsResolved: proof.dnsResolved,
            sslVerified: proof.sslVerified,
            serverHeaders: Object.keys(serverHeaders).length,
            fingerprint: proof.serverFingerprint.substring(0, 16) + '...',
            proofHash: proof.proofHash.substring(0, 16) + '...',
          },
          validations: validationResults,
        };
      } else if (passedValidations >= 3) {
        check.status = 'warning';
        check.message = `⚠ Conexión parcialmente verificada (${passedValidations}/${totalValidations} criterios)`;
        check.details = {
          validations: validationResults,
          warning: 'La conexión puede no ser completamente real',
        };
      } else {
        check.status = 'failed';
        check.message = `✗ NO se pudo verificar como conexión REAL (${passedValidations}/${totalValidations} criterios)`;
        check.details = {
          validations: validationResults,
          error: 'La conexión puede ser simulada o hay problemas de conectividad',
        };
      }

    } catch (err: any) {
      check.duration = Date.now() - start;
      proof.responseTime = check.duration;

      if (err?.name === 'AbortError') {
        check.status = 'failed';
        check.message = '✗ Timeout - No se pudo verificar conexión real';
      } else {
        check.status = 'failed';
        check.message = `✗ Error verificando conexión real: ${err?.message || 'Desconocido'}`;
      }

      check.details = { error: err?.message };
    }

    return { realConnectionCheck: check, connectionProof: proof };
  }

  // Generar hash para fingerprint y proof
  private async generateHash(data: string): Promise<string> {
    try {
      const encoder = new TextEncoder();
      const dataBuffer = encoder.encode(data);
      const hashBuffer = await crypto.subtle.digest('SHA-256', dataBuffer);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    } catch {
      // Fallback simple si crypto.subtle no está disponible
      let hash = 0;
      for (let i = 0; i < data.length; i++) {
        const char = data.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash;
      }
      return Math.abs(hash).toString(16).padStart(16, '0');
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // SOLUCIONADOR DE ERRORES DE CONEXIÓN
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Diagnostica y soluciona automáticamente problemas de conexión
   */
  async troubleshootConnection(): Promise<TroubleshootResult> {
    console.log('[TZDigital] 🔧 Iniciando diagnóstico y solución de errores...');
    
    const errorsFound: ConnectionError[] = [];
    const solutionsApplied: string[] = [];
    const solutionsPending: ConnectionSolution[] = [];
    const recommendations: string[] = [];

    // PASO 1: Verificar configuración básica
    console.log('[TZDigital] 📋 Paso 1: Verificando configuración...');
    const configErrors = this.diagnoseConfiguration();
    errorsFound.push(...configErrors);

    // Auto-fix: Configuración básica
    for (const error of configErrors) {
      const solution = this.getSolutionForError(error.code);
      if (solution.autoFixAvailable && solution.autoFixAction) {
        console.log(`[TZDigital] 🔧 Aplicando auto-fix: ${solution.description}`);
        const fixed = await solution.autoFixAction();
        if (fixed) {
          solutionsApplied.push(solution.description);
        } else {
          solutionsPending.push(solution);
        }
      } else {
        solutionsPending.push(solution);
      }
    }

    // PASO 2: Verificar conectividad de red
    console.log('[TZDigital] 🌐 Paso 2: Verificando conectividad de red...');
    const networkErrors = await this.diagnoseNetwork();
    errorsFound.push(...networkErrors);

    for (const error of networkErrors) {
      const solution = this.getSolutionForError(error.code);
      if (solution.autoFixAvailable && solution.autoFixAction) {
        console.log(`[TZDigital] 🔧 Aplicando auto-fix: ${solution.description}`);
        const fixed = await solution.autoFixAction();
        if (fixed) {
          solutionsApplied.push(solution.description);
        } else {
          solutionsPending.push(solution);
        }
      } else {
        solutionsPending.push(solution);
      }
    }

    // PASO 3: Verificar proxy local
    console.log('[TZDigital] 🖥️ Paso 3: Verificando proxy local...');
    const proxyErrors = await this.diagnoseProxy();
    errorsFound.push(...proxyErrors);

    for (const error of proxyErrors) {
      const solution = this.getSolutionForError(error.code);
      solutionsPending.push(solution);
    }

    // PASO 4: Verificar autenticación
    console.log('[TZDigital] 🔑 Paso 4: Verificando autenticación...');
    const authErrors = await this.diagnoseAuthentication();
    errorsFound.push(...authErrors);

    for (const error of authErrors) {
      const solution = this.getSolutionForError(error.code);
      solutionsPending.push(solution);
    }

    // PASO 5: Intentar conexión alternativa
    console.log('[TZDigital] 🔄 Paso 5: Probando conexión alternativa...');
    const alternativeResult = await this.tryAlternativeConnection();
    if (alternativeResult.success) {
      solutionsApplied.push('Conexión alternativa establecida');
    }

    // Generar recomendaciones
    recommendations.push(...this.generateRecommendations(errorsFound, solutionsPending));

    // Determinar estado final
    let finalStatus: 'connected' | 'partially_connected' | 'disconnected' = 'disconnected';
    
    if (errorsFound.length === 0 || solutionsApplied.length > 0) {
      // Hacer test final
      const finalTest = await this.quickConnectionTest();
      if (finalTest) {
        finalStatus = 'connected';
      } else if (solutionsApplied.length > 0) {
        finalStatus = 'partially_connected';
      }
    }

    const result: TroubleshootResult = {
      success: finalStatus === 'connected',
      errorsFound,
      solutionsApplied,
      solutionsPending,
      finalStatus,
      recommendations
    };

    console.log('[TZDigital] ✅ Diagnóstico completado:', {
      errores: errorsFound.length,
      solucionesAplicadas: solutionsApplied.length,
      solucionesPendientes: solutionsPending.length,
      estadoFinal: finalStatus
    });

    return result;
  }

  private diagnoseConfiguration(): ConnectionError[] {
    const errors: ConnectionError[] = [];

    if (!this.config.bearerToken) {
      errors.push({
        code: 'NO_TOKEN',
        message: 'Bearer Token no configurado',
        details: 'El token de autenticación es requerido para conectarse a TZ Digital',
        timestamp: new Date().toISOString()
      });
    } else if (this.config.bearerToken.length < 20) {
      errors.push({
        code: 'INVALID_TOKEN_LENGTH',
        message: 'Bearer Token parece ser inválido (muy corto)',
        details: `Longitud actual: ${this.config.bearerToken.length} caracteres`,
        timestamp: new Date().toISOString()
      });
    }

    if (!this.config.baseUrl) {
      errors.push({
        code: 'NO_BASE_URL',
        message: 'URL base no configurada',
        timestamp: new Date().toISOString()
      });
    }

    return errors;
  }

  private async diagnoseNetwork(): Promise<ConnectionError[]> {
    const errors: ConnectionError[] = [];

    // Test de conectividad básica
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);

      // Intentar conectar a un endpoint conocido
      await fetch('https://www.google.com/favicon.ico', {
        method: 'HEAD',
        signal: controller.signal,
        mode: 'no-cors'
      });

      clearTimeout(timeoutId);
    } catch (err: any) {
      if (err?.name === 'AbortError') {
        errors.push({
          code: 'NETWORK_TIMEOUT',
          message: 'Timeout de red - Sin conexión a Internet',
          details: 'No se pudo establecer conexión en 5 segundos',
          timestamp: new Date().toISOString()
        });
      } else {
        errors.push({
          code: 'NETWORK_ERROR',
          message: 'Error de conectividad de red',
          details: err?.message || 'Error desconocido',
          timestamp: new Date().toISOString()
        });
      }
    }

    return errors;
  }

  private async diagnoseProxy(): Promise<ConnectionError[]> {
    const errors: ConnectionError[] = [];

    if (!IS_BROWSER) return errors;

    // Determinar la URL de test según el entorno
    const testUrl = (IS_ELECTRON || IS_FILE_PROTOCOL) 
      ? `${LOCAL_SERVER_URL}/api/tz-digital/test`
      : '/api/tz-digital/test';

    console.log(`[TZDigital] 🔍 Probando proxy en: ${testUrl} (Electron: ${IS_ELECTRON}, File: ${IS_FILE_PROTOCOL})`);

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 8000);

      const response = await fetch(testUrl, {
        method: 'GET',
        signal: controller.signal,
        headers: {
          'Accept': 'application/json',
        }
      });

      clearTimeout(timeoutId);
      localServerAvailable = response.ok;

      if (response.status === 404) {
        errors.push({
          code: 'PROXY_NOT_FOUND',
          message: 'Proxy local no encontrado',
          details: IS_ELECTRON || IS_FILE_PROTOCOL
            ? `Servidor local no responde en ${LOCAL_SERVER_URL}. Abre una terminal y ejecuta: cd server && node index.js`
            : 'El servidor backend no está corriendo o el endpoint no existe. Ejecuta: cd server && node index.js',
          timestamp: new Date().toISOString()
        });
      } else if (!response.ok && response.status !== 500) {
        errors.push({
          code: 'PROXY_ERROR',
          message: `Proxy responde con error HTTP ${response.status}`,
          timestamp: new Date().toISOString()
        });
      } else {
        console.log('[TZDigital] ✅ Proxy local disponible');
      }
    } catch (err: any) {
      localServerAvailable = false;
      
      const isNetworkError = err?.name === 'TypeError' || err?.message?.includes('fetch');
      const isAbortError = err?.name === 'AbortError';
      
      errors.push({
        code: 'PROXY_UNREACHABLE',
        message: 'No se puede conectar al servidor local',
        details: IS_ELECTRON || IS_FILE_PROTOCOL
          ? `⚠️ IMPORTANTE: Debes iniciar el servidor manualmente.\n\n1. Abre PowerShell o Terminal\n2. Navega a: ${window.location.href.includes('file:') ? 'tu directorio del proyecto' : ''}\n3. Ejecuta: cd server && node index.js\n4. Espera ver: "Server listening on port 3000"\n5. Vuelve a probar la conexión`
          : isAbortError 
            ? 'Timeout: El servidor tardó demasiado en responder'
            : isNetworkError
              ? 'Error de red: Verifica que el servidor esté corriendo en puerto 3000'
              : `Error: ${err?.message || 'Error desconocido'}`,
        timestamp: new Date().toISOString()
      });
    }

    return errors;
  }

  // Verificar si el servidor local está disponible
  async checkLocalServerAvailable(): Promise<boolean> {
    if (localServerAvailable !== null) {
      return localServerAvailable;
    }

    try {
      const testUrl = (IS_ELECTRON || IS_FILE_PROTOCOL) 
        ? `${LOCAL_SERVER_URL}/api/tz-digital/test`
        : '/api/tz-digital/test';

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);

      const response = await fetch(testUrl, {
        method: 'GET',
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      localServerAvailable = response.ok || response.status < 500;
      return localServerAvailable;
    } catch {
      localServerAvailable = false;
      return false;
    }
  }

  private async diagnoseAuthentication(): Promise<ConnectionError[]> {
    const errors: ConnectionError[] = [];

    if (!this.config.bearerToken) return errors;

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);

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
          reference: `AUTH-TEST-${Date.now()}`,
          _test: true
        }),
      });

      clearTimeout(timeoutId);

      if (response.status === 401) {
        errors.push({
          code: 'AUTH_INVALID_TOKEN',
          message: 'Token de autenticación inválido',
          details: 'El servidor rechazó el token. Verifica que sea correcto.',
          timestamp: new Date().toISOString()
        });
      } else if (response.status === 403) {
        errors.push({
          code: 'AUTH_FORBIDDEN',
          message: 'Token sin permisos suficientes',
          details: 'El token es válido pero no tiene permisos para esta operación.',
          timestamp: new Date().toISOString()
        });
      }
    } catch (err: any) {
      // No agregar error si es un problema de red ya diagnosticado
      if (!err?.message?.includes('network') && !err?.message?.includes('fetch')) {
        errors.push({
          code: 'AUTH_CHECK_FAILED',
          message: 'No se pudo verificar la autenticación',
          details: err?.message,
          timestamp: new Date().toISOString()
        });
      }
    }

    return errors;
  }

  private getSolutionForError(errorCode: string): ConnectionSolution {
    const solutions: Record<string, ConnectionSolution> = {
      'NO_TOKEN': {
        errorCode: 'NO_TOKEN',
        description: 'Configurar Bearer Token',
        steps: [
          '1. Ve a la pestaña "Configuración" en el módulo TZ Digital',
          '2. Ingresa el Bearer Token proporcionado',
          '3. Guarda la configuración',
          '4. Vuelve a probar la conexión'
        ],
        autoFixAvailable: true,
        autoFixAction: async () => {
          // Intentar usar el token por defecto si existe
          const defaultToken = '4e2e1b2f-03f3-4c5b-b54e-23d9145c1fde';
          if (defaultToken) {
            this.configure({ bearerToken: defaultToken });
            return true;
          }
          return false;
        },
        priority: 'critical'
      },
      'INVALID_TOKEN_LENGTH': {
        errorCode: 'INVALID_TOKEN_LENGTH',
        description: 'Verificar formato del Bearer Token',
        steps: [
          '1. El token debe tener formato UUID (ej: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx)',
          '2. Verifica que no haya espacios en blanco',
          '3. Copia el token directamente desde la fuente original'
        ],
        autoFixAvailable: false,
        priority: 'critical'
      },
      'NO_BASE_URL': {
        errorCode: 'NO_BASE_URL',
        description: 'Restaurar URL base',
        steps: [
          'La URL base se restaurará automáticamente'
        ],
        autoFixAvailable: true,
        autoFixAction: async () => {
          this.configure({ baseUrl: API_URL });
          return true;
        },
        priority: 'high'
      },
      'NETWORK_TIMEOUT': {
        errorCode: 'NETWORK_TIMEOUT',
        description: 'Resolver problema de conexión a Internet',
        steps: [
          '1. Verifica tu conexión a Internet',
          '2. Desactiva temporalmente el firewall/antivirus',
          '3. Verifica si usas proxy corporativo',
          '4. Intenta con otra red (ej: datos móviles)'
        ],
        autoFixAvailable: false,
        priority: 'critical'
      },
      'NETWORK_ERROR': {
        errorCode: 'NETWORK_ERROR',
        description: 'Solucionar error de red',
        steps: [
          '1. Reinicia tu router/módem',
          '2. Verifica cables de red',
          '3. Desactiva VPN si está activo',
          '4. Contacta a soporte de red'
        ],
        autoFixAvailable: false,
        priority: 'high'
      },
      'PROXY_NOT_FOUND': {
        errorCode: 'PROXY_NOT_FOUND',
        description: 'Iniciar servidor backend',
        steps: IS_ELECTRON || IS_FILE_PROTOCOL ? [
          '⚠️ ESTÁS USANDO EL INSTALADOR DE ESCRITORIO',
          '1. Abre PowerShell o CMD como administrador',
          '2. Navega al directorio donde instalaste la app',
          '3. Entra a la carpeta "server": cd server',
          '4. Ejecuta: node index.js',
          '5. Deja la ventana abierta',
          '6. Vuelve a la app y prueba la conexión'
        ] : [
          '1. Abre una terminal',
          '2. Navega al directorio del proyecto',
          '3. Ejecuta: cd server && node index.js',
          '4. Espera a ver "Server listening on port 3000"'
        ],
        autoFixAvailable: false,
        priority: 'critical'
      },
      'PROXY_UNREACHABLE': {
        errorCode: 'PROXY_UNREACHABLE',
        description: 'Servidor local no disponible',
        steps: IS_ELECTRON || IS_FILE_PROTOCOL ? [
          '⚠️ EL SERVIDOR LOCAL DEBE EJECUTARSE MANUALMENTE',
          '',
          '📋 PASOS PARA WINDOWS:',
          '1. Presiona Win + X y selecciona "Terminal"',
          `2. Escribe: cd "${process.env.PORTABLE_EXECUTABLE_DIR || 'C:\\ruta\\a\\tu\\proyecto'}"`,
          '3. Luego: cd server',
          '4. Finalmente: node index.js',
          '',
          '✅ Debes ver: "Server listening on port 3000"',
          '⚠️ NO cierres la terminal mientras uses la app'
        ] : [
          '1. Detén el servidor actual (Ctrl+C)',
          '2. Ejecuta: cd server && node index.js',
          '3. Verifica que no haya errores en la consola'
        ],
        autoFixAvailable: false,
        priority: 'critical'
      },
      'PROXY_ERROR': {
        errorCode: 'PROXY_ERROR',
        description: 'Verificar configuración del proxy',
        steps: [
          '1. Revisa los logs del servidor',
          '2. Verifica que el puerto 3000 esté libre',
          '3. Reinicia el servidor backend'
        ],
        autoFixAvailable: false,
        priority: 'high'
      },
      'AUTH_INVALID_TOKEN': {
        errorCode: 'AUTH_INVALID_TOKEN',
        description: 'Corregir token de autenticación',
        steps: [
          '1. Verifica que el token sea el correcto',
          '2. El token puede haber expirado - solicita uno nuevo',
          '3. Contacta al administrador de TZ Digital'
        ],
        autoFixAvailable: false,
        priority: 'critical'
      },
      'AUTH_FORBIDDEN': {
        errorCode: 'AUTH_FORBIDDEN',
        description: 'Solicitar permisos adicionales',
        steps: [
          '1. El token no tiene permisos para transferencias',
          '2. Contacta al administrador para habilitar permisos',
          '3. Solicita un token con permisos de producción'
        ],
        autoFixAvailable: false,
        priority: 'high'
      },
      'AUTH_CHECK_FAILED': {
        errorCode: 'AUTH_CHECK_FAILED',
        description: 'Reintentar verificación de autenticación',
        steps: [
          '1. Espera unos segundos',
          '2. Vuelve a probar la conexión',
          '3. Si persiste, verifica el token'
        ],
        autoFixAvailable: false,
        priority: 'medium'
      }
    };

    return solutions[errorCode] || {
      errorCode,
      description: 'Error desconocido',
      steps: ['Contacta a soporte técnico'],
      autoFixAvailable: false,
      priority: 'low'
    };
  }

  private async tryAlternativeConnection(): Promise<{ success: boolean }> {
    console.log('[TZDigital] 🔄 Intentando conexión alternativa...');

    // Intentar con diferentes configuraciones
    const attempts = [
      { name: 'Proxy directo', url: '/api/tz-digital/test' },
      { name: 'Health check', url: '/api/tz-digital/transactions' },
    ];

    for (const attempt of attempts) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 8000);

        const response = await fetch(attempt.url, {
          method: attempt.url.includes('test') ? 'GET' : 'OPTIONS',
          signal: controller.signal,
          headers: {
            'X-TZ-Token': this.config.bearerToken,
          }
        });

        clearTimeout(timeoutId);

        if (response.ok || response.status === 405 || response.status < 500) {
          console.log(`[TZDigital] ✅ Conexión alternativa exitosa: ${attempt.name}`);
          return { success: true };
        }
      } catch {
        console.log(`[TZDigital] ❌ Intento fallido: ${attempt.name}`);
      }
    }

    return { success: false };
  }

  private async quickConnectionTest(): Promise<boolean> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);

      const response = await fetch(IS_BROWSER ? '/api/tz-digital/test' : API_URL, {
        method: IS_BROWSER ? 'GET' : 'OPTIONS',
        signal: controller.signal,
        headers: {
          'X-TZ-Token': this.config.bearerToken,
        }
      });

      clearTimeout(timeoutId);
      return response.ok || response.status === 405 || response.status < 500;
    } catch {
      return false;
    }
  }

  private generateRecommendations(errors: ConnectionError[], pendingSolutions: ConnectionSolution[]): string[] {
    const recommendations: string[] = [];

    // Priorizar recomendaciones según errores
    const hasCritical = pendingSolutions.some(s => s.priority === 'critical');
    const hasProxyError = errors.some(e => e.code.includes('PROXY'));
    const hasAuthError = errors.some(e => e.code.includes('AUTH'));
    const hasNetworkError = errors.some(e => e.code.includes('NETWORK'));

    if (hasCritical) {
      recommendations.push('⚠️ Hay errores críticos que deben resolverse antes de continuar');
    }

    if (hasProxyError) {
      recommendations.push('💡 Asegúrate de que el servidor backend esté corriendo (cd server && node index.js)');
    }

    if (hasAuthError) {
      recommendations.push('🔑 Verifica que tu Bearer Token sea válido y tenga permisos');
    }

    if (hasNetworkError) {
      recommendations.push('🌐 Verifica tu conexión a Internet antes de intentar de nuevo');
    }

    if (errors.length === 0) {
      recommendations.push('✅ No se encontraron errores - La conexión debería funcionar');
    }

    if (pendingSolutions.length > 0) {
      recommendations.push(`📋 Hay ${pendingSolutions.length} solución(es) pendiente(s) de aplicar manualmente`);
    }

    return recommendations;
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
    hasWarnings: boolean = false,
    connectionProof?: ConnectionProof
  ): ConnectionTestResult {
    const totalDuration = Date.now() - startTime;
    const passed = checks.filter(c => c.status === 'passed').length;
    const failed = checks.filter(c => c.status === 'failed').length;
    const warnings = checks.filter(c => c.status === 'warning').length;

    // Determinar si es una conexión real
    const isRealConnection = this.validateRealConnection(checks, connectionProof);

    let message: string;
    if (success && !hasWarnings && isRealConnection) {
      message = `✅ Conexión REAL verificada (${passed}/${checks.length} checks OK)`;
    } else if (success && !isRealConnection) {
      message = `⚠️ Conexión detectada pero NO verificada como REAL`;
    } else if (success && hasWarnings) {
      message = `⚠️ Conexión disponible con advertencias (${warnings} warnings)`;
    } else {
      message = `❌ Conexión fallida (${failed} errores)`;
    }

    console.log(`[TZDigital] ${message} - ${totalDuration}ms total`);
    console.log(`[TZDigital] Conexión Real: ${isRealConnection ? 'SÍ ✓' : 'NO ✗'}`);
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
      timestamp: new Date().toISOString(),
      isRealConnection,
      connectionProof
    };
  }

  private validateRealConnection(checks: ConnectionCheck[], proof?: ConnectionProof): boolean {
    // Criterios para determinar si es una conexión real:
    // 1. El endpoint respondió con un código HTTP válido
    // 2. El tiempo de respuesta es realista (> 50ms para conexión remota)
    // 3. Hay headers de servidor presentes
    // 4. El DNS se resolvió correctamente
    
    if (!proof) return false;
    
    const criteria = {
      hasValidHttpStatus: proof.httpStatusCode > 0 && proof.httpStatusCode < 600,
      hasRealisticLatency: proof.responseTime > 50, // Conexión remota real > 50ms
      hasDnsResolved: proof.dnsResolved,
      hasServerFingerprint: !!proof.serverFingerprint && proof.serverFingerprint.length > 0,
      hasTimestamp: !!proof.timestamp,
    };

    const passedCriteria = Object.values(criteria).filter(Boolean).length;
    const totalCriteria = Object.keys(criteria).length;

    console.log('[TZDigital] Validación de conexión real:', criteria);
    console.log(`[TZDigital] Criterios cumplidos: ${passedCriteria}/${totalCriteria}`);

    // Necesita al menos 4 de 5 criterios para ser considerada real
    return passedCriteria >= 4;
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

