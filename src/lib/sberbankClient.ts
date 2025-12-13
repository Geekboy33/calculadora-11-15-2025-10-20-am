/**
 * Sberbank API Client
 * Client for Sberbank Ruble Payment Orders API
 * Based on: https://developers.sber.ru/docs/ru/sber-api/specifications/payments/create-payment
 */

export interface SberbankConfig {
  baseUrl: string;
  accessToken: string;
}

export interface SberbankVat {
  type?: 'NO_VAT' | 'VAT_0' | 'VAT_10' | 'VAT_20';
  amount?: number;
  rate?: number;
}

export interface SberbankDepartmentalInfo {
  uip?: string;
  drawerStatus?: string;
  kbk?: string;
  oktmo?: string;
  taxPeriod?: string;
  docNumber?: string;
  docDate?: string;
  paymentType?: string;
}

export interface SberbankDigestSignature {
  signature: string;
  certificateUuid: string;
}

export interface SberbankPaymentOrder {
  // Document info
  number?: string;
  date: string; // YYYY-MM-DD
  externalId: string; // UUID, max 36 chars
  
  // Payment details
  amount: number; // 0.01 - 1000000000000000
  operationCode: '01'; // Always '01' for RPO
  deliveryKind?: 'electronic' | 'urgent' | '0';
  priority: '1' | '2' | '3' | '4' | '5';
  urgencyCode?: 'INTERNAL' | 'INTERNAL_NOTIF' | 'OFFHOURS' | 'BESP' | 'NORMAL' | null;
  voCode?: string; // 5 digits for currency transactions
  purpose: string; // max 210 chars
  
  // Payer info
  payerName: string; // max 160 chars
  payerInn: string; // 5, 10 or 12 digits, or '0'
  payerKpp?: string | null; // 9 digits or '0'
  payerAccount: string; // 20 digits
  payerBankBic: string; // 9 digits
  payerBankCorrAccount: string; // 20 digits
  
  // Payee info
  payeeName: string; // max 160 chars
  payeeInn?: string | null; // 5, 10 or 12 digits, or '0'
  payeeKpp?: string | null; // 9 digits or '0'
  payeeAccount?: string | null; // 20 digits
  payeeBankBic: string; // 9 digits
  payeeBankCorrAccount?: string | null; // 20 digits
  
  // Optional fields
  departmentalInfo?: SberbankDepartmentalInfo;
  vat?: SberbankVat | null;
  incomeTypeCode?: string; // max 2 chars
  isPaidByCredit?: boolean;
  creditContractNumber?: string; // max 50 chars
  
  // Digital signature (optional - if not provided, document is saved as draft)
  digestSignatures?: SberbankDigestSignature[];
}

export interface SberbankPaymentResponse {
  number: string;
  date: string;
  externalId: string;
  amount: number;
  status?: string;
  documentId?: string;
  createdAt?: string;
}

export interface SberbankError {
  code: string;
  message: string;
  field?: string;
}

export class SberbankClient {
  private config: SberbankConfig;

  constructor(config: SberbankConfig) {
    this.config = config;
  }

  private async request<T>(
    endpoint: string,
    method: 'GET' | 'POST' | 'PUT' | 'DELETE' = 'GET',
    body?: any
  ): Promise<T> {
    const url = `${this.config.baseUrl}${endpoint}`;
    
    const headers: Record<string, string> = {
      'Authorization': `Bearer ${this.config.accessToken}`,
      'Content-Type': 'application/json',
    };

    const options: RequestInit = {
      method,
      headers,
    };

    if (body) {
      options.body = JSON.stringify(body);
    }

    console.log(`[Sberbank] ${method} ${url}`, body ? JSON.stringify(body, null, 2) : '');

    const response = await fetch(url, options);
    const data = await response.json();

    if (!response.ok) {
      console.error('[Sberbank] Error:', data);
      throw new Error(data.message || data.error || `HTTP ${response.status}`);
    }

    console.log('[Sberbank] Response:', data);
    return data as T;
  }

  /**
   * Create a Ruble Payment Order (RPO)
   * POST /fintech/api/v1/payments
   */
  async createPaymentOrder(order: SberbankPaymentOrder): Promise<SberbankPaymentResponse> {
    // Validate required fields
    if (!order.externalId) {
      throw new Error('externalId is required (UUID)');
    }
    if (!order.date) {
      throw new Error('date is required (YYYY-MM-DD)');
    }
    if (!order.amount || order.amount < 0.01) {
      throw new Error('amount must be >= 0.01');
    }
    if (!order.purpose) {
      throw new Error('purpose is required');
    }
    if (!order.payerName || !order.payerInn || !order.payerAccount || !order.payerBankBic || !order.payerBankCorrAccount) {
      throw new Error('Payer information is incomplete');
    }
    if (!order.payeeName || !order.payeeBankBic) {
      throw new Error('Payee information is incomplete');
    }

    return this.request<SberbankPaymentResponse>('/fintech/api/v1/payments', 'POST', order);
  }

  /**
   * Get payment order status
   * GET /fintech/api/v1/payments/{externalId}
   */
  async getPaymentStatus(externalId: string): Promise<SberbankPaymentResponse> {
    return this.request<SberbankPaymentResponse>(`/fintech/api/v1/payments/${externalId}`, 'GET');
  }

  /**
   * Generate a new UUID for externalId
   */
  static generateExternalId(): string {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      const r = Math.random() * 16 | 0;
      const v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  }

  /**
   * Format date as YYYY-MM-DD
   */
  static formatDate(date: Date = new Date()): string {
    return date.toISOString().split('T')[0];
  }

  /**
   * Validate INN (Taxpayer Identification Number)
   */
  static validateInn(inn: string): boolean {
    if (inn === '0') return true;
    return /^([0-9]{5}|[0-9]{10}|[0-9]{12})$/.test(inn);
  }

  /**
   * Validate BIC
   */
  static validateBic(bic: string): boolean {
    return /^[0-9]{9}$/.test(bic);
  }

  /**
   * Validate account number (20 digits)
   */
  static validateAccount(account: string): boolean {
    return /^[0-9]{20}$/.test(account);
  }

  /**
   * Validate KPP
   */
  static validateKpp(kpp: string): boolean {
    if (kpp === '0') return true;
    return /^[0-9]{9}$/.test(kpp);
  }
}

