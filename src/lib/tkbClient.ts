/**
 * The Kingdom Bank API Client
 * Cliente completo para integración con The Kingdom Bank
 */

import { signPayload } from './tkbSigner';

export interface TKBConfig {
  baseUrl: string;
  apiKey: string;
  apiSecret: string;
  signatureKeyId: string;
  signatureKey: string;
}

export interface TKBAccount {
  id: number;
  currency: string;
  balance: number;
  availableBalance: number;
  accountNumber?: string;
  iban?: string;
  status: string;
}

export interface TKBPaymentRequest {
  foreignTransactionId: string;
  amount: number;
  currency: string;
  notificationUrl: string;
  reference?: string;
  successUrl?: string;
  failUrl?: string;
  externalUserId?: string;
  accountId?: number;
  customer?: {
    firstName: string;
    lastName: string;
    email: string;
    phone?: string;
    addressLine1?: string;
    addressLine2?: string;
    city?: string;
    state?: string;
    postalCode?: string;
    country?: string;
    language?: string;
  };
  paymentMethodFlow?: 'CHECKOUT' | 'DIRECT';
  allowedPaymentMethods?: string[];
  generateInvoice?: boolean;
}

export interface TKBTransfer {
  fromAccountId: number;
  toAccountId: number;
  amount: number;
  currency: string;
  reference?: string;
}

export interface TKBExternalTransfer {
  fromAccountId: number;
  amount: number;
  currency: string;
  beneficiaryName: string;
  beneficiaryIban: string;
  beneficiaryBic?: string;
  reference?: string;
}

export interface TKBExchange {
  fromAccountId: number;
  toAccountId: number;
  amount: number;
  fromCurrency: string;
  toCurrency: string;
  reference?: string;
}

export interface TKBTransactionHistory {
  accountId?: number;
  fromDate?: string;
  toDate?: string;
  limit?: number;
  offset?: number;
}

export class TheKingdomBankClient {
  private baseUrl: string;
  private apiKey: string;
  private apiSecret: string;
  private signatureKeyId: string;
  private signatureKey: string;

  constructor(config: TKBConfig) {
    this.baseUrl = config.baseUrl.replace(/\/+$/, '');
    this.apiKey = config.apiKey;
    this.apiSecret = config.apiSecret;
    this.signatureKeyId = config.signatureKeyId;
    this.signatureKey = config.signatureKey;
  }

  /**
   * Request genérico a TKB
   */
  private async request<T>(
    method: 'GET' | 'POST' | 'PUT' | 'DELETE',
    path: string,
    bodyObj: any = null
  ): Promise<T> {
    const url = path.startsWith('/') ? path : `/${path}`;
    const fullUrl = `${this.baseUrl}${url}`;

    // Headers mínimos de autenticación
    const headers: Record<string, string> = {
      'X-Api-Key': this.apiKey,
      'X-Api-Secret': this.apiSecret,
    };

    let body: string | undefined = undefined;

    if (bodyObj !== null && bodyObj !== undefined) {
      // JSON estrictamente igual al enviado
      const bodyJson = JSON.stringify(bodyObj);

      // Firma HMAC-SHA256 + Base64 del payload
      const signature = await signPayload(bodyJson, this.signatureKey);

      headers['Content-Type'] = 'application/json';
      headers['X-Signature'] = signature;
      headers['X-Signature-Key-Id'] = this.signatureKeyId;

      body = bodyJson;
    }

    const response = await fetch(fullUrl, {
      method,
      headers,
      body,
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`TKB API Error (${response.status}): ${errorText}`);
    }

    return response.json();
  }

  /**
   * GET /v1/accounts
   * Devuelve todas las cuentas y balances
   */
  async getAccounts(): Promise<{ accounts: TKBAccount[] }> {
    return this.request('GET', '/v1/accounts');
  }

  /**
   * GET /v1/accounts/{accountId}
   */
  async getAccountById(accountId: number): Promise<TKBAccount> {
    return this.request('GET', `/v1/accounts/${accountId}`);
  }

  /**
   * POST /v1/payments
   * Crea Payment Request (checkout redirect link)
   */
  async createPaymentRequest(body: TKBPaymentRequest): Promise<any> {
    return this.request('POST', '/v1/payments', body);
  }

  /**
   * POST /v1/transfers/internal
   */
  async createInternalTransfer(body: TKBTransfer): Promise<any> {
    return this.request('POST', '/v1/transfers/internal', body);
  }

  /**
   * POST /v1/transfers/external
   */
  async createExternalTransfer(body: TKBExternalTransfer): Promise<any> {
    return this.request('POST', '/v1/transfers/external', body);
  }

  /**
   * POST /v1/exchange
   */
  async createExchange(body: TKBExchange): Promise<any> {
    return this.request('POST', '/v1/exchange', body);
  }

  /**
   * POST /v1/transaction-history
   */
  async getTransactionHistory(body: TKBTransactionHistory): Promise<any> {
    return this.request('POST', '/v1/transaction-history', body);
  }
}

