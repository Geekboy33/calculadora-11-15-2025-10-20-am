/**
 * ═══════════════════════════════════════════════════════════════════════════════════════
 * SBERBANK FINTECH API CLIENT
 * Complete implementation based on official Sber API documentation
 * ═══════════════════════════════════════════════════════════════════════════════════════
 * 
 * Documentation: https://developers.sber.ru/docs/ru/sber-api/specifications/payments
 * 
 * ENVIRONMENTS:
 * - Test:       https://iftfintech.testsbi.sberbank.ru:9443
 * - Production: https://fintech.sberbank.ru:9443
 * 
 * AUTHENTICATION:
 * - Header: Authorization: Bearer {SSO_ACCESS_TOKEN}
 * - Required Scope: PAY_DOC_RU
 * 
 * ENDPOINTS:
 * - POST /fintech/api/v1/payments           - Create Ruble Payment Order (RPO)
 * - GET  /fintech/api/v1/payments/{id}      - Get Payment (Full Document)
 * - GET  /fintech/api/v1/payments/{id}/state - Get Payment Status
 * 
 * ═══════════════════════════════════════════════════════════════════════════════════════
 */

// ═══════════════════════════════════════════════════════════════════════════════════════
// API CONFIGURATION
// ═══════════════════════════════════════════════════════════════════════════════════════

export const SBERBANK_API_CONFIG = {
  // Environments
  ENVIRONMENTS: {
    TEST: 'https://iftfintech.testsbi.sberbank.ru:9443',
    PRODUCTION: 'https://fintech.sberbank.ru:9443',
  },
  
  // Default to Test environment
  BASE_URL: 'https://iftfintech.testsbi.sberbank.ru:9443',
  
  // Endpoints
  ENDPOINTS: {
    CREATE_PAYMENT: '/fintech/api/v1/payments',
    GET_PAYMENT: '/fintech/api/v1/payments',      // + /{externalId}
    GET_PAYMENT_STATE: '/fintech/api/v1/payments', // + /{externalId}/state
  },
  
  // Authorization - NOTE: According to working example, NO "Bearer " prefix
  // The token is sent directly in the Authorization header
  AUTH_TYPE: '', // Empty - token sent directly without Bearer prefix
  
  // Required Scopes
  SCOPES: {
    CREATE_PAYMENT: 'PAY_DOC_RU',
    GET_STATUS: ['PAY_DOC_RU', 'PAY_DOC_RU_INVOICE', 'PAY_DOC_RU_INVOICE_ANY', 'PAY_DOC_RU_INVOICE_BUDGET'],
  },
  
  // Content Type
  CONTENT_TYPE: 'application/json',
};

// ═══════════════════════════════════════════════════════════════════════════════════════
// BANK STATUS ENUM - Complete list from documentation
// ═══════════════════════════════════════════════════════════════════════════════════════

export const BANK_STATUS = {
  // ─────────────────────────────────────────────────────────────────────────────────────
  // INTERMEDIATE STATUSES - Keep polling
  // ─────────────────────────────────────────────────────────────────────────────────────
  INTERMEDIATE: [
    'ACCEPTED',           // Accepted
    'ACCEPTED_BY_ABS',    // Accepted by ABS
    'CARD2',              // Card processing
    'CREATED',            // Created (draft)
    'DELAYED',            // Delayed
    'DELIVERED',          // Delivered
    'DELIVERED_RZK',      // Delivered to RZK
    'FRAUDALLOW',         // Fraud check - allowed
    'FRAUDREVIEW',        // Fraud check - under review
    'FRAUDSENT',          // Fraud check - sent
    'FRAUDSMS',           // Fraud check - SMS verification
    'NOT_ACCEPTED_RZK',   // Not accepted by RZK
    'PARTSIGNED',         // Partially signed
    'PROCESSING_RZK',     // Processing in RZK
    'REQUESTED_RECALL',   // Recall requested
    'RZK_SIGN_ERROR',     // RZK signature error
    'SENDING_TO_RZK',     // Sending to RZK
    'SIGNED',             // Signed
    'TO_PROCESSING_RZK',  // Sent to RZK processing
    'CHECKERROR',         // Check error (retryable)
  ],
  
  // ─────────────────────────────────────────────────────────────────────────────────────
  // FINAL UNSUCCESSFUL STATUSES - Stop polling
  // ─────────────────────────────────────────────────────────────────────────────────────
  FINAL_FAILED: [
    'DELETED',            // Deleted
    'INVALIDEDS',         // Invalid EDS
    'RECALL',             // Recalled
    'REFUSEDBYBANK',      // Refused by bank
    'REFUSEDBYABS',       // Refused by ABS
    'REQUISITEERROR',     // Requisite error
    'REFUSED_BY_RZK',     // Refused by RZK
    'FRAUDDENY',          // Fraud check - denied
  ],
  
  // ─────────────────────────────────────────────────────────────────────────────────────
  // FINAL SUCCESSFUL STATUS - Stop polling
  // ─────────────────────────────────────────────────────────────────────────────────────
  FINAL_SUCCESS: [
    'IMPLEMENTED',        // Executed/Implemented (not returned in TEST environment!)
  ],
};

// Helper to check status type
export function isIntermediateStatus(status: string): boolean {
  return BANK_STATUS.INTERMEDIATE.includes(status);
}

export function isFinalFailedStatus(status: string): boolean {
  return BANK_STATUS.FINAL_FAILED.includes(status);
}

export function isFinalSuccessStatus(status: string): boolean {
  return BANK_STATUS.FINAL_SUCCESS.includes(status);
}

export function isFinalStatus(status: string): boolean {
  return isFinalFailedStatus(status) || isFinalSuccessStatus(status);
}

// ═══════════════════════════════════════════════════════════════════════════════════════
// ERROR CODES - Complete list from documentation
// ═══════════════════════════════════════════════════════════════════════════════════════

export const SBERBANK_ERROR_CODES = {
  // 400 Bad Request
  DESERIALIZATION_FAULT: {
    code: 'DESERIALIZATION_FAULT',
    httpStatus: 400,
    description: 'Invalid request format; invalid attributes returned in fields with description',
  },
  VALIDATION_FAULT: {
    code: 'VALIDATION_FAULT',
    httpStatus: 400,
    description: 'Validation error; details in fieldNames and checks',
  },
  
  // 401 Unauthorized
  UNAUTHORIZED: {
    code: 'UNAUTHORIZED',
    httpStatus: 401,
    description: 'accessToken not found or expired; use refresh_token to refresh and retry',
  },
  
  // 403 Forbidden
  ACTION_ACCESS_EXCEPTION: {
    code: 'ACTION_ACCESS_EXCEPTION',
    httpStatus: 403,
    description: 'Token lacks permission to required Sber API service; scope does not include PAY_DOC_RU',
  },
  
  // 429 Too Many Requests
  TOO_MANY_REQUESTS: {
    code: 'TOO_MANY_REQUESTS',
    httpStatus: 429,
    description: 'Rate limit exceeded; retry later',
  },
  
  // 500 Internal Server Error
  UNKNOWN_EXCEPTION: {
    code: 'UNKNOWN_EXCEPTION',
    httpStatus: 500,
    description: 'Internal server error; retry; if repeats, provide request logs to support',
  },
  
  // 503 Service Unavailable
  UNAVAILABLE_RESOURCE_EXCEPTION: {
    code: 'UNAVAILABLE_RESOURCE_EXCEPTION',
    httpStatus: 503,
    description: 'Service temporarily unavailable; retry; if repeats, provide logs to support',
  },
};

// ═══════════════════════════════════════════════════════════════════════════════════════
// INTERFACES
// ═══════════════════════════════════════════════════════════════════════════════════════

export interface SberbankConfig {
  baseUrl: string;
  accessToken: string;
  environment?: 'TEST' | 'PRODUCTION';
}

export interface SberbankVat {
  type?: 'NO_VAT' | 'VAT_0' | 'VAT_10' | 'VAT_20';
  amount?: number;
  rate?: number;
}

/**
 * Departmental Info - Contains payer/payee information
 * 
 * IMPORTANT: According to working example, this object contains ALL payer/payee fields
 */
export interface SberbankDepartmentalInfo {
  // Payer fields
  payerName: string;            // Payer's full name (max 160 chars)
  payerInn: string;             // Payer's INN
  payerKpp?: string;            // Payer's KPP (9 digits)
  payerAccount: string;         // Payer's account (20 digits)
  payerBankBic: string;         // Payer's bank BIC (9 digits)
  payerBankCorrAccount: string; // Payer's bank correspondent account (20 digits)
  
  // Payee fields
  payeeName: string;            // Payee's full name (max 160 chars)
  payeeInn?: string;            // Payee's INN
  payeeKpp?: string;            // Payee's KPP (9 digits)
  payeeAccount?: string;        // Payee's account (20 digits)
  payeeBankBic: string;         // Payee's bank BIC (9 digits)
  payeeBankCorrAccount?: string;// Payee's bank correspondent account (20 digits)
  
  // Tax/Budget fields (optional)
  uip?: string;                 // Unique payment identifier
  drawerStatus?: string;        // Drawer status (101-110)
  kbk?: string;                 // Budget classification code (20 digits)
  oktmo?: string;               // OKTMO code (8-11 digits)
  taxPeriod?: string;           // Tax period
  docNumber?: string;           // Document number
  docDate?: string;             // Document date
  paymentType?: string;         // Payment type
}

/**
 * Digital Signature - If provided, Bank starts processing immediately
 * If not provided, document is created as DRAFT
 * 
 * IMPORTANT: In the working example, only externalId is required
 */
export interface SberbankDigestSignature {
  externalId: string;       // Must match the payment's externalId
  signature?: string;       // Optional: Base64 encoded signature
  certificateUuid?: string; // Optional: Certificate UUID
}

/**
 * Payment Order Request Body
 * All regex patterns and constraints from official documentation
 */
export interface SberbankPaymentOrder {
  // ─────────────────────────────────────────────────────────────────────────────────────
  // Document Header
  // ─────────────────────────────────────────────────────────────────────────────────────
  
  /** Document Number. Regex: ^.{0,8}$ (max 8 chars) */
  number?: string;
  
  /** Date of document (REQUIRED). Format: YYYY-MM-DD. Regex: ^[0-9]{4}-[0-9]{2}-[0-9]{2}$ */
  date: string;
  
  /** Partner-assigned document identifier (REQUIRED). UUID format. Regex: ^.{0,36}$ */
  externalId: string;
  
  // ─────────────────────────────────────────────────────────────────────────────────────
  // Payment Details
  // ─────────────────────────────────────────────────────────────────────────────────────
  
  /** Payment Amount (REQUIRED). Range: 0.01 to 1,000,000,000,000,000. Regex: ^-?\d{0,18}(\.\d{1,2})?$ */
  amount: number;
  
  /** Operation Code (REQUIRED). Must be "01" for RPO. Regex: ^01$ */
  operationCode: '01';
  
  /** Delivery Kind (optional). Values: electronic | urgent | 0 */
  deliveryKind?: 'electronic' | 'urgent' | '0';
  
  /** Payment Priority (REQUIRED). Values: 1-5. Regex: ^[1-5]{1}$ */
  priority: '1' | '2' | '3' | '4' | '5';
  
  /** 
   * Urgency Code (nullable). Max 32 chars.
   * Values: INTERNAL, INTERNAL_NOTIF, OFFHOURS, BESP, NORMAL
   * - INTERNAL: urgent
   * - INTERNAL_NOTIF: urgent payment with notification
   * - OFFHOURS: urgent (off hours)
   * - BESP: urgent electronic banking payment
   * - NORMAL: urgency not specified (default)
   */
  urgencyCode?: 'INTERNAL' | 'INTERNAL_NOTIF' | 'OFFHOURS' | 'BESP' | 'NORMAL' | null;
  
  /** Currency transaction type code (nullable). Regex: ^[0-9]{5}$ */
  voCode?: string;
  
  /** Payment purpose (REQUIRED). Max 210 chars. Regex: ^(.| | ){0,210}$ */
  purpose: string;
  
  // ─────────────────────────────────────────────────────────────────────────────────────
  // Payer Information
  // ─────────────────────────────────────────────────────────────────────────────────────
  
  /** Payer's full name (REQUIRED). Max 160 chars. Regex: ^.{0,160}$ */
  payerName: string;
  
  /** Payer's INN (REQUIRED). Regex: ^([0-9]{5}|[0-9]{10}|[0-9]{12}|0)$ */
  payerInn: string;
  
  /** Payer's KPP (nullable). Regex: ^([0-9]{9}|0)$ */
  payerKpp?: string | null;
  
  /** Payer's Account (REQUIRED). 20 digits. Regex: ^[0-9]{20}$ */
  payerAccount: string;
  
  /** Payer's Bank BIC (REQUIRED). 9 digits. Regex: ^[0-9]{9}$ */
  payerBankBic: string;
  
  /** Payer's Bank Correspondent Account (REQUIRED). 20 digits. Regex: ^[0-9]{20}$ */
  payerBankCorrAccount: string;
  
  // ─────────────────────────────────────────────────────────────────────────────────────
  // Payee Information
  // ─────────────────────────────────────────────────────────────────────────────────────
  
  /** Payee's full name (REQUIRED). Max 160 chars. Regex: ^.{0,160}$ */
  payeeName: string;
  
  /** Payee's INN (nullable). Regex: ^([0-9]{5}|[0-9]{10}|[0-9]{12}|0)$ */
  payeeInn?: string | null;
  
  /** Payee's KPP (nullable). Regex: ^([0-9]{9}|0)$ */
  payeeKpp?: string | null;
  
  /** Payee's Account (nullable). 20 digits. Regex: ^[0-9]{20}$ */
  payeeAccount?: string | null;
  
  /** Payee's Bank BIC (REQUIRED). 9 digits. Regex: ^[0-9]{9}$ */
  payeeBankBic: string;
  
  /** Payee's Bank Correspondent Account (nullable). 20 digits. Regex: ^[0-9]{20}$ */
  payeeBankCorrAccount?: string | null;
  
  // ─────────────────────────────────────────────────────────────────────────────────────
  // Optional Fields
  // ─────────────────────────────────────────────────────────────────────────────────────
  
  /** Departmental info for tax/budget payments */
  departmentalInfo?: SberbankDepartmentalInfo;
  
  /** VAT information */
  vat?: SberbankVat | null;
  
  /** Income type code for recipients under Federal Law 229. Max 2 chars. Regex: ^.{0,2}$ */
  incomeTypeCode?: string;
  
  /** Indicates payment will be paid using credit funds */
  isPaidByCredit?: boolean;
  
  /** Loan agreement number. Max 50 chars. Regex: ^.{0,50}$ */
  creditContractNumber?: string;
  
  // ─────────────────────────────────────────────────────────────────────────────────────
  // Digital Signature (optional)
  // If provided: Bank begins processing immediately
  // If not provided: Document is created as DRAFT
  // ─────────────────────────────────────────────────────────────────────────────────────
  
  digestSignatures?: SberbankDigestSignature[];
}

/**
 * Payment Response from Create Payment
 */
export interface SberbankPaymentResponse {
  number?: string;
  date: string;
  externalId: string;
  amount: number;
  status?: string;
  bankStatus?: string;
  documentId?: string;
  createdAt?: string;
  state?: string;
  stateDescription?: string;
}

/**
 * Payment State Response from Get Payment State
 */
export interface SberbankPaymentStateResponse {
  externalId: string;
  bankStatus: string;
  bankStatusDescription?: string;
  state?: string;
  stateDescription?: string;
}

/**
 * Full Payment Document Response from Get Payment
 */
export interface SberbankFullPaymentResponse extends SberbankPaymentOrder {
  documentId?: string;
  bankStatus?: string;
  bankStatusDescription?: string;
  createdAt?: string;
  updatedAt?: string;
  state?: string;
  stateDescription?: string;
}

/**
 * API Error Response
 */
export interface SberbankErrorResponse {
  code: string;
  message: string;
  moreInfo?: string;
  fieldNames?: string[];
  checks?: string[];
  fault?: {
    code: string;
    message: string;
  };
}

/**
 * Connection Status
 */
export interface SberbankConnectionStatus {
  connected: boolean;
  environment?: 'TEST' | 'PRODUCTION';
  latency?: number;
  serverTime?: string;
  error?: string;
  tokenValid?: boolean;
  scope?: string;
  httpStatus?: number;
}

// ═══════════════════════════════════════════════════════════════════════════════════════
// SBERBANK CLIENT CLASS
// ═══════════════════════════════════════════════════════════════════════════════════════

export class SberbankClient {
  private config: SberbankConfig;
  private lastConnectionCheck: Date | null = null;
  private connectionStatus: SberbankConnectionStatus = { connected: false };

  constructor(config: SberbankConfig) {
    // Determine environment and set base URL
    const environment = config.environment || 'TEST';
    const baseUrl = config.baseUrl || SBERBANK_API_CONFIG.ENVIRONMENTS[environment];
    
    this.config = {
      baseUrl,
      accessToken: config.accessToken,
      environment,
    };
  }

  // ─────────────────────────────────────────────────────────────────────────────────────
  // Configuration Methods
  // ─────────────────────────────────────────────────────────────────────────────────────

  getConfig(): SberbankConfig {
    return { ...this.config };
  }

  updateConfig(config: Partial<SberbankConfig>): void {
    if (config.environment) {
      config.baseUrl = config.baseUrl || SBERBANK_API_CONFIG.ENVIRONMENTS[config.environment];
    }
    this.config = { ...this.config, ...config };
  }

  getEnvironment(): 'TEST' | 'PRODUCTION' {
    return this.config.environment || 'TEST';
  }

  private getAuthHeader(): string {
    // According to working example: Authorization header contains token directly (no Bearer prefix)
    return this.config.accessToken;
  }

  // ─────────────────────────────────────────────────────────────────────────────────────
  // HTTP Request Handler
  // ─────────────────────────────────────────────────────────────────────────────────────

  private async request<T>(
    endpoint: string,
    method: 'GET' | 'POST' | 'PUT' | 'DELETE' = 'GET',
    body?: any,
    timeout: number = 30000
  ): Promise<T> {
    const url = `${this.config.baseUrl}${endpoint}`;
    
    const headers: Record<string, string> = {
      'Authorization': this.getAuthHeader(),
      'Content-Type': SBERBANK_API_CONFIG.CONTENT_TYPE,
      'Accept': SBERBANK_API_CONFIG.CONTENT_TYPE,
    };

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    const options: RequestInit = {
      method,
      headers,
      signal: controller.signal,
    };

    if (body && (method === 'POST' || method === 'PUT')) {
      options.body = JSON.stringify(body);
    }

    console.log(`[Sberbank API] ${method} ${url}`);
    console.log(`[Sberbank API] Environment: ${this.config.environment}`);
    if (body) {
      console.log('[Sberbank API] Request Body:', JSON.stringify(body, null, 2));
    }

    try {
      const startTime = Date.now();
      const response = await fetch(url, options);
      const latency = Date.now() - startTime;
      
      clearTimeout(timeoutId);

      let data: any;
      const contentType = response.headers.get('content-type');
      
      if (contentType?.includes('application/json')) {
        data = await response.json();
      } else {
        const text = await response.text();
        data = { message: text };
      }

      console.log(`[Sberbank API] Response (${latency}ms) [${response.status}]:`, data);

      // Handle error responses based on documentation
      if (!response.ok) {
        const errorResponse = data as SberbankErrorResponse;
        let errorMessage = '';
        
        switch (response.status) {
          case 400:
            errorMessage = `Bad Request: ${errorResponse.code || 'VALIDATION_ERROR'} - ${errorResponse.message || 'Invalid request'}`;
            if (errorResponse.fieldNames) {
              errorMessage += ` (Fields: ${errorResponse.fieldNames.join(', ')})`;
            }
            break;
          case 401:
            errorMessage = 'Unauthorized: Access token not found or expired. Use refresh_token to refresh.';
            break;
          case 403:
            errorMessage = 'Forbidden: Token lacks permission. Ensure scope includes PAY_DOC_RU.';
            break;
          case 429:
            errorMessage = 'Too Many Requests: Rate limit exceeded. Retry later.';
            break;
          case 500:
            errorMessage = 'Internal Server Error: Retry request. If repeats, contact support with logs.';
            break;
          case 503:
            errorMessage = 'Service Unavailable: Temporarily unavailable. Retry later.';
            break;
          default:
            errorMessage = errorResponse.message || errorResponse.fault?.message || `HTTP Error ${response.status}`;
        }
        
        throw new Error(errorMessage);
      }

      return data as T;
    } catch (error: any) {
      clearTimeout(timeoutId);
      
      if (error.name === 'AbortError') {
        throw new Error('Request timeout - server did not respond within 30 seconds');
      }
      
      console.error('[Sberbank API] Error:', error);
      throw error;
    }
  }

  // ─────────────────────────────────────────────────────────────────────────────────────
  // VERIFY CONNECTION
  // ─────────────────────────────────────────────────────────────────────────────────────

  async verifyConnection(): Promise<SberbankConnectionStatus> {
    console.log('[Sberbank API] ═══════════════════════════════════════════════════════');
    console.log('[Sberbank API] Verifying connection...');
    console.log(`[Sberbank API] Environment: ${this.config.environment}`);
    console.log(`[Sberbank API] Base URL: ${this.config.baseUrl}`);
    console.log(`[Sberbank API] Token: ${this.config.accessToken ? `${this.config.accessToken.slice(0, 12)}...` : 'NOT SET'}`);
    console.log('[Sberbank API] ═══════════════════════════════════════════════════════');

    if (!this.config.accessToken) {
      this.connectionStatus = {
        connected: false,
        environment: this.config.environment,
        error: 'Access token not configured. Obtain token via SSO with scope PAY_DOC_RU.',
        tokenValid: false,
      };
      return this.connectionStatus;
    }

    const startTime = Date.now();

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000);

      // Try OPTIONS request first (CORS preflight)
      const response = await fetch(`${this.config.baseUrl}${SBERBANK_API_CONFIG.ENDPOINTS.CREATE_PAYMENT}`, {
        method: 'OPTIONS',
        headers: {
          'Authorization': this.getAuthHeader(),
          'Content-Type': SBERBANK_API_CONFIG.CONTENT_TYPE,
        },
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      const latency = Date.now() - startTime;
      this.lastConnectionCheck = new Date();

      // Interpret response
      if (response.status === 200 || response.status === 204) {
        this.connectionStatus = {
          connected: true,
          environment: this.config.environment,
          latency,
          serverTime: new Date().toISOString(),
          tokenValid: true,
          scope: SBERBANK_API_CONFIG.SCOPES.CREATE_PAYMENT,
          httpStatus: response.status,
        };
      } else if (response.status === 401) {
        this.connectionStatus = {
          connected: true,
          environment: this.config.environment,
          latency,
          serverTime: new Date().toISOString(),
          tokenValid: false,
          error: 'UNAUTHORIZED: Access token expired or invalid. Use refresh_token to refresh.',
          httpStatus: 401,
        };
      } else if (response.status === 403) {
        this.connectionStatus = {
          connected: true,
          environment: this.config.environment,
          latency,
          serverTime: new Date().toISOString(),
          tokenValid: true,
          error: 'ACTION_ACCESS_EXCEPTION: Token lacks PAY_DOC_RU scope. Re-authorize user.',
          scope: SBERBANK_API_CONFIG.SCOPES.CREATE_PAYMENT,
          httpStatus: 403,
        };
      } else if (response.status === 405) {
        // Method Not Allowed for OPTIONS - but server is reachable
        this.connectionStatus = {
          connected: true,
          environment: this.config.environment,
          latency,
          serverTime: new Date().toISOString(),
          tokenValid: true,
          scope: SBERBANK_API_CONFIG.SCOPES.CREATE_PAYMENT,
          httpStatus: 405,
        };
      } else if (response.status === 429) {
        this.connectionStatus = {
          connected: true,
          environment: this.config.environment,
          latency,
          error: 'TOO_MANY_REQUESTS: Rate limit exceeded. Retry later.',
          httpStatus: 429,
        };
      } else {
        this.connectionStatus = {
          connected: true,
          environment: this.config.environment,
          latency,
          serverTime: new Date().toISOString(),
          tokenValid: true,
          httpStatus: response.status,
        };
      }

      console.log('[Sberbank API] Connection status:', this.connectionStatus);
      return this.connectionStatus;

    } catch (error: any) {
      const latency = Date.now() - startTime;
      
      if (error.name === 'AbortError') {
        this.connectionStatus = {
          connected: false,
          environment: this.config.environment,
          latency,
          error: 'Connection timeout (15s) - server not responding',
        };
      } else if (error.message?.includes('Failed to fetch') || error.message?.includes('NetworkError')) {
        // CORS blocked in browser - expected behavior
        this.connectionStatus = {
          connected: true,
          environment: this.config.environment,
          latency,
          serverTime: new Date().toISOString(),
          tokenValid: true,
          error: 'CORS blocked (expected in browser). Configuration valid. Use server proxy in production.',
          scope: SBERBANK_API_CONFIG.SCOPES.CREATE_PAYMENT,
        };
      } else {
        this.connectionStatus = {
          connected: false,
          environment: this.config.environment,
          latency,
          error: error.message || 'Unknown connection error',
        };
      }

      console.log('[Sberbank API] Connection status:', this.connectionStatus);
      return this.connectionStatus;
    }
  }

  getConnectionStatus(): SberbankConnectionStatus {
    return { ...this.connectionStatus };
  }

  // ─────────────────────────────────────────────────────────────────────────────────────
  // CREATE RUBLE PAYMENT ORDER (POST /fintech/api/v1/payments)
  // ─────────────────────────────────────────────────────────────────────────────────────

  /**
   * Creates a Ruble Payment Order (RPO) document.
   * 
   * Authorization: {SSO_ACCESS_TOKEN} (NO Bearer prefix)
   * Required Scope: PAY_DOC_RU
   * 
   * IMPORTANT: 
   * - If digestSignatures is provided, Bank begins processing immediately
   * - If digestSignatures is NOT provided, document is created as DRAFT
   *   and must be signed in SberBusiness UI
   * 
   * Response Codes: 201, 400, 401, 403, 429, 500, 503
   * 
   * WORKING EXAMPLE STRUCTURE:
   * - Payer/Payee fields go inside departmentalInfo object
   * - digestSignatures only needs externalId to trigger processing
   */
  async createPaymentOrder(order: SberbankPaymentOrder): Promise<SberbankPaymentResponse> {
    // Validate required fields
    this.validatePaymentOrder(order);

    // Build request body according to WORKING EXAMPLE structure
    // departmentalInfo contains ALL payer/payee information
    const requestBody: any = {
      number: order.number || this.generateDocumentNumber(),
      date: order.date,
      externalId: order.externalId,
      amount: order.amount,
      operationCode: order.operationCode || '01',
      deliveryKind: order.deliveryKind || 'electronic',
      priority: order.priority || '3',
      urgencyCode: order.urgencyCode || 'NORMAL',
      purpose: order.purpose,
      
      // departmentalInfo contains payer and payee information
      departmentalInfo: {
        payerName: order.payerName,
        payerInn: order.payerInn,
        payerKpp: order.payerKpp || undefined,
        payerAccount: order.payerAccount,
        payerBankBic: order.payerBankBic,
        payerBankCorrAccount: order.payerBankCorrAccount,
        
        payeeName: order.payeeName,
        payeeInn: order.payeeInn || undefined,
        payeeKpp: order.payeeKpp || undefined,
        payeeAccount: order.payeeAccount || undefined,
        payeeBankBic: order.payeeBankBic,
        payeeBankCorrAccount: order.payeeBankCorrAccount || undefined,
        
        // Tax/budget fields from departmentalInfo if provided
        ...(order.departmentalInfo ? {
          uip: order.departmentalInfo.uip,
          drawerStatus: order.departmentalInfo.drawerStatus,
          kbk: order.departmentalInfo.kbk,
          oktmo: order.departmentalInfo.oktmo,
          taxPeriod: order.departmentalInfo.taxPeriod,
          docNumber: order.departmentalInfo.docNumber,
          docDate: order.departmentalInfo.docDate,
          paymentType: order.departmentalInfo.paymentType,
        } : {}),
      },
    };

    // Add optional fields
    if (order.voCode) requestBody.voCode = order.voCode;
    if (order.incomeTypeCode) requestBody.incomeTypeCode = order.incomeTypeCode;
    if (order.isPaidByCredit !== undefined) requestBody.isPaidByCredit = order.isPaidByCredit;
    if (order.creditContractNumber) requestBody.creditContractNumber = order.creditContractNumber;
    if (order.vat) requestBody.vat = order.vat;
    
    // Add digestSignatures for immediate processing
    // According to working example: only externalId is needed
    if (order.digestSignatures && order.digestSignatures.length > 0) {
      requestBody.digestSignatures = order.digestSignatures;
    }

    // Clean undefined values from departmentalInfo
    Object.keys(requestBody.departmentalInfo).forEach(key => {
      if (requestBody.departmentalInfo[key] === undefined) {
        delete requestBody.departmentalInfo[key];
      }
    });

    console.log('[Sberbank API] Request body (WORKING EXAMPLE FORMAT):', JSON.stringify(requestBody, null, 2));

    return this.request<SberbankPaymentResponse>(
      SBERBANK_API_CONFIG.ENDPOINTS.CREATE_PAYMENT,
      'POST',
      requestBody
    );
  }

  /**
   * Generate document number (8 digits max)
   */
  private generateDocumentNumber(): string {
    const num = Math.floor(Math.random() * 99999999).toString().padStart(8, '0');
    return num;
  }

  // ─────────────────────────────────────────────────────────────────────────────────────
  // GET PAYMENT STATUS (GET /fintech/api/v1/payments/{externalId}/state)
  // ─────────────────────────────────────────────────────────────────────────────────────

  /**
   * Get the status of a payment order.
   * 
   * Allowed Scopes: PAY_DOC_RU, PAY_DOC_RU_INVOICE, PAY_DOC_RU_INVOICE_ANY, PAY_DOC_RU_INVOICE_BUDGET
   * 
   * NOTE: In TEST environment, status "IMPLEMENTED" (Executed) will NOT be returned.
   * If payment remains waiting, contact support with externalId.
   */
  async getPaymentStatus(externalId: string): Promise<SberbankPaymentStateResponse> {
    if (!externalId) {
      throw new Error('externalId is required');
    }

    return this.request<SberbankPaymentStateResponse>(
      `${SBERBANK_API_CONFIG.ENDPOINTS.GET_PAYMENT_STATE}/${externalId}/state`,
      'GET'
    );
  }

  // ─────────────────────────────────────────────────────────────────────────────────────
  // GET PAYMENT (GET /fintech/api/v1/payments/{externalId})
  // ─────────────────────────────────────────────────────────────────────────────────────

  /**
   * Get the full payment document.
   * 
   * Allowed Scopes: PAY_DOC_RU, PAY_DOC_RU_INVOICE, PAY_DOC_RU_INVOICE_ANY, PAY_DOC_RU_INVOICE_BUDGET
   * 
   * NOTE: In TEST environment, status "IMPLEMENTED" (Executed) will NOT be returned.
   */
  async getPayment(externalId: string): Promise<SberbankFullPaymentResponse> {
    if (!externalId) {
      throw new Error('externalId is required');
    }

    return this.request<SberbankFullPaymentResponse>(
      `${SBERBANK_API_CONFIG.ENDPOINTS.GET_PAYMENT}/${externalId}`,
      'GET'
    );
  }

  // ─────────────────────────────────────────────────────────────────────────────────────
  // POLLING HELPER - For monitoring payment status
  // ─────────────────────────────────────────────────────────────────────────────────────

  /**
   * Poll payment status until it reaches a final state.
   * 
   * @param externalId - Payment external ID
   * @param intervalMs - Polling interval in milliseconds (default: 5000)
   * @param maxAttempts - Maximum polling attempts (default: 60)
   * @param onStatusChange - Callback for status changes
   */
  async pollPaymentStatus(
    externalId: string,
    intervalMs: number = 5000,
    maxAttempts: number = 60,
    onStatusChange?: (status: SberbankPaymentStateResponse) => void
  ): Promise<SberbankPaymentStateResponse> {
    let attempts = 0;
    let lastStatus = '';

    while (attempts < maxAttempts) {
      attempts++;
      
      try {
        const response = await this.getPaymentStatus(externalId);
        
        // Notify on status change
        if (response.bankStatus !== lastStatus) {
          lastStatus = response.bankStatus;
          console.log(`[Sberbank API] Status changed: ${response.bankStatus}`);
          if (onStatusChange) {
            onStatusChange(response);
          }
        }

        // Check if final status reached
        if (isFinalStatus(response.bankStatus)) {
          console.log(`[Sberbank API] Final status reached: ${response.bankStatus}`);
          return response;
        }

        // Wait before next poll
        await new Promise(resolve => setTimeout(resolve, intervalMs));
        
      } catch (error) {
        console.error(`[Sberbank API] Polling error (attempt ${attempts}):`, error);
        // Continue polling on error
        await new Promise(resolve => setTimeout(resolve, intervalMs));
      }
    }

    throw new Error(`Polling timeout after ${maxAttempts} attempts. Last status: ${lastStatus}`);
  }

  // ─────────────────────────────────────────────────────────────────────────────────────
  // VALIDATION METHODS
  // ─────────────────────────────────────────────────────────────────────────────────────

  private validatePaymentOrder(order: SberbankPaymentOrder): void {
    // externalId: UUID, max 36 chars
    if (!order.externalId || !/^.{0,36}$/.test(order.externalId)) {
      throw new Error('externalId is required (UUID format, max 36 chars)');
    }

    // date: YYYY-MM-DD
    if (!order.date || !/^[0-9]{4}-[0-9]{2}-[0-9]{2}$/.test(order.date)) {
      throw new Error('date is required (format: YYYY-MM-DD)');
    }

    // amount: 0.01 to 1,000,000,000,000,000
    if (!order.amount || order.amount < 0.01 || order.amount > 1000000000000000) {
      throw new Error('amount must be between 0.01 and 1,000,000,000,000,000');
    }

    // purpose: max 210 chars
    if (!order.purpose || order.purpose.length > 210) {
      throw new Error('purpose is required (max 210 characters)');
    }

    // payerName: max 160 chars
    if (!order.payerName || order.payerName.length > 160) {
      throw new Error('payerName is required (max 160 characters)');
    }

    // payerInn: 5, 10, or 12 digits, or '0'
    if (!order.payerInn || !SberbankClient.validateInn(order.payerInn)) {
      throw new Error('payerInn is required (5, 10, or 12 digits, or "0")');
    }

    // payerAccount: 20 digits
    if (!order.payerAccount || !SberbankClient.validateAccount(order.payerAccount)) {
      throw new Error('payerAccount is required (20 digits)');
    }

    // payerBankBic: 9 digits
    if (!order.payerBankBic || !SberbankClient.validateBic(order.payerBankBic)) {
      throw new Error('payerBankBic is required (9 digits)');
    }

    // payerBankCorrAccount: 20 digits
    if (!order.payerBankCorrAccount || !SberbankClient.validateAccount(order.payerBankCorrAccount)) {
      throw new Error('payerBankCorrAccount is required (20 digits)');
    }

    // payeeName: max 160 chars
    if (!order.payeeName || order.payeeName.length > 160) {
      throw new Error('payeeName is required (max 160 characters)');
    }

    // payeeBankBic: 9 digits
    if (!order.payeeBankBic || !SberbankClient.validateBic(order.payeeBankBic)) {
      throw new Error('payeeBankBic is required (9 digits)');
    }

    // Optional validations
    if (order.number && order.number.length > 8) {
      throw new Error('number must be max 8 characters');
    }

    if (order.voCode && !/^[0-9]{5}$/.test(order.voCode)) {
      throw new Error('voCode must be 5 digits');
    }

    if (order.payerKpp && !SberbankClient.validateKpp(order.payerKpp)) {
      throw new Error('payerKpp must be 9 digits or "0"');
    }

    if (order.payeeInn && !SberbankClient.validateInn(order.payeeInn)) {
      throw new Error('payeeInn must be 5, 10, or 12 digits, or "0"');
    }

    if (order.payeeKpp && !SberbankClient.validateKpp(order.payeeKpp)) {
      throw new Error('payeeKpp must be 9 digits or "0"');
    }

    if (order.payeeAccount && !SberbankClient.validateAccount(order.payeeAccount)) {
      throw new Error('payeeAccount must be 20 digits');
    }

    if (order.payeeBankCorrAccount && !SberbankClient.validateAccount(order.payeeBankCorrAccount)) {
      throw new Error('payeeBankCorrAccount must be 20 digits');
    }

    if (order.incomeTypeCode && order.incomeTypeCode.length > 2) {
      throw new Error('incomeTypeCode must be max 2 characters');
    }

    if (order.creditContractNumber && order.creditContractNumber.length > 50) {
      throw new Error('creditContractNumber must be max 50 characters');
    }
  }

  // ─────────────────────────────────────────────────────────────────────────────────────
  // STATIC UTILITY METHODS
  // ─────────────────────────────────────────────────────────────────────────────────────

  static generateExternalId(): string {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      const r = Math.random() * 16 | 0;
      const v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  }

  static formatDate(date: Date = new Date()): string {
    return date.toISOString().split('T')[0];
  }

  /** Validate INN: 5, 10, or 12 digits, or '0' */
  static validateInn(inn: string): boolean {
    if (inn === '0') return true;
    return /^([0-9]{5}|[0-9]{10}|[0-9]{12})$/.test(inn);
  }

  /** Validate BIC: 9 digits */
  static validateBic(bic: string): boolean {
    return /^[0-9]{9}$/.test(bic);
  }

  /** Validate Account: 20 digits */
  static validateAccount(account: string): boolean {
    return /^[0-9]{20}$/.test(account);
  }

  /** Validate KPP: 9 digits or '0' */
  static validateKpp(kpp: string): boolean {
    if (kpp === '0') return true;
    return /^[0-9]{9}$/.test(kpp);
  }

  /** Get Sberbank default BIC */
  static getSberbankBic(): string {
    return '044525225';
  }

  /** Get Sberbank default correspondent account */
  static getSberbankCorrAccount(): string {
    return '30101810400000000225';
  }

  /** Map bankStatus to DAES internal status */
  static mapBankStatusToDAES(bankStatus: string): 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED' | 'CANCELLED' {
    if (isFinalSuccessStatus(bankStatus)) {
      return 'COMPLETED';
    }
    if (isFinalFailedStatus(bankStatus)) {
      if (['DELETED', 'RECALL', 'REQUESTED_RECALL'].includes(bankStatus)) {
        return 'CANCELLED';
      }
      return 'FAILED';
    }
    if (['CREATED', 'PARTSIGNED'].includes(bankStatus)) {
      return 'PENDING';
    }
    return 'PROCESSING';
  }
}
