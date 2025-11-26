/**
 * Digital Commercial Bank Ltd / DAES Partner API - Domain Types
 * Core type definitions for the partner API system
 * 
 * @module DCB-API/Domain/Types
 * @version 1.0.0
 * @author Digital Commercial Bank Ltd Engineering Team
 */

// ═══════════════════════════════════════════════════════════════
// PARTNER ENTITY
// ═══════════════════════════════════════════════════════════════

export interface Partner {
  partnerId: string;
  name: string;
  clientId: string;
  clientSecretHash: string;
  allowedCurrencies: string[];
  webhookUrl?: string;
  status: 'ACTIVE' | 'INACTIVE';
  createdAt: string;
  updatedAt: string;
  metadata?: {
    businessType?: string;
    country?: string;
    contactEmail?: string;
    rateLimit?: number;
  };
}

export interface CreatePartnerDTO {
  name: string;
  allowedCurrencies: string[];
  webhookUrl?: string;
  metadata?: Partner['metadata'];
}

export interface PartnerCredentials {
  partnerId: string;
  clientId: string;
  clientSecret: string; // Solo se retorna UNA VEZ al crear
}

// ═══════════════════════════════════════════════════════════════
// CLIENT ENTITY (End-user de cada Partner)
// ═══════════════════════════════════════════════════════════════

export interface PartnerClient {
  clientId: string;
  partnerId: string;
  externalClientId: string; // ID del partner para su cliente
  legalName: string;
  country: string;
  type: 'FINTECH' | 'PSP' | 'WALLET' | 'EXCHANGE';
  allowedCurrencies: string[];
  status: 'ACTIVE' | 'INACTIVE' | 'SUSPENDED';
  createdAt: string;
  updatedAt: string;
  metadata?: {
    email?: string;
    phone?: string;
    documentType?: string;
    documentNumber?: string;
    address?: string;
  };
}

export interface CreateClientDTO {
  externalClientId: string;
  legalName: string;
  country: string;
  type: PartnerClient['type'];
  allowedCurrencies: string[];
  metadata?: PartnerClient['metadata'];
}

// ═══════════════════════════════════════════════════════════════
// ACCOUNT ENTITY
// ═══════════════════════════════════════════════════════════════

export interface Account {
  accountId: string;
  clientId: string;
  currency: string;
  balance: string; // Usamos string para precisión decimal
  availableBalance: string;
  reservedBalance: string;
  status: 'ACTIVE' | 'BLOCKED' | 'CLOSED';
  createdAt: string;
  updatedAt: string;
  lastTransactionAt?: string;
  metadata?: {
    accountType?: 'CHECKING' | 'SAVINGS' | 'TRADING';
    iban?: string;
    swiftCode?: string;
  };
}

export interface CreateAccountDTO {
  clientId: string;
  currency: string;
  initialBalance?: string;
  metadata?: Account['metadata'];
}

// ═══════════════════════════════════════════════════════════════
// TRANSFER ENTITY
// ═══════════════════════════════════════════════════════════════

export interface Transfer {
  transferId: string;
  partnerId: string;
  transferRequestId: string; // Del partner (idempotencia)
  fromAccountId: string;
  toAccountId: string;
  sendingCurrency: string;
  receivingCurrency: string;
  amount: string;
  fxRate?: string;
  fxFee?: string;
  state: 'PENDING' | 'PROCESSING' | 'SETTLED' | 'REJECTED' | 'FAILED';
  createdAt: string;
  settledAt?: string;
  failureReason?: string | null;
  cashTransferData: CashTransferV1;
  metadata?: {
    sourceIP?: string;
    userAgent?: string;
    idempotencyKey?: string;
  };
}

// ═══════════════════════════════════════════════════════════════
// CASH TRANSFER V1 (Estructura estándar DAES)
// ═══════════════════════════════════════════════════════════════

export interface CashTransferV1 {
  SendingName: string;
  SendingAccount: string;
  ReceivingName: string;
  ReceivingAccount: string;
  Datetime: string; // ISO 8601
  Amount: string;
  SendingCurrency: string;
  ReceivingCurrency: string;
  Description: string;
  TransferRequestID: string;
  ReceivingInstitution: string;
  SendingInstitution: string;
  method: 'API' | 'WIRE' | 'ACH' | 'SEPA';
  purpose: string;
  source: string;
}

export interface CreateTransferDTO {
  'CashTransfer.v1': CashTransferV1;
}

// ═══════════════════════════════════════════════════════════════
// AUTHENTICATION & AUTHORIZATION
// ═══════════════════════════════════════════════════════════════

export interface AuthRequest {
  grant_type: 'client_credentials';
  client_id: string;
  client_secret: string;
}

export interface AuthResponse {
  access_token: string;
  token_type: 'Bearer';
  expires_in: number;
  scope: string;
}

export interface JWTPayload {
  partnerId: string;
  clientId: string;
  name: string;
  iat: number;
  exp: number;
}

// ═══════════════════════════════════════════════════════════════
// API RESPONSES
// ═══════════════════════════════════════════════════════════════

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
  timestamp: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}

// ═══════════════════════════════════════════════════════════════
// BALANCE RESPONSE
// ═══════════════════════════════════════════════════════════════

export interface BalanceResponse {
  accountId: string;
  currency: string;
  balance: string;
  availableBalance: string;
  reservedBalance: string;
  lastUpdated: string;
}

// ═══════════════════════════════════════════════════════════════
// TRANSFER RESPONSE
// ═══════════════════════════════════════════════════════════════

export interface TransferResponse {
  transferId: string;
  DCBReference: string; // ID interno del banco
  TransferRequestID: string; // ID del partner
  state: Transfer['state'];
  amount: string;
  sendingCurrency: string;
  receivingCurrency: string;
  createdAt: string;
  estimatedSettlement?: string;
}

// ═══════════════════════════════════════════════════════════════
// ERROR CODES
// ═══════════════════════════════════════════════════════════════

export enum ErrorCode {
  // Authentication
  INVALID_CREDENTIALS = 'INVALID_CREDENTIALS',
  EXPIRED_TOKEN = 'EXPIRED_TOKEN',
  INVALID_TOKEN = 'INVALID_TOKEN',
  
  // Authorization
  INSUFFICIENT_PERMISSIONS = 'INSUFFICIENT_PERMISSIONS',
  PARTNER_INACTIVE = 'PARTNER_INACTIVE',
  
  // Resources
  PARTNER_NOT_FOUND = 'PARTNER_NOT_FOUND',
  CLIENT_NOT_FOUND = 'CLIENT_NOT_FOUND',
  ACCOUNT_NOT_FOUND = 'ACCOUNT_NOT_FOUND',
  TRANSFER_NOT_FOUND = 'TRANSFER_NOT_FOUND',
  
  // Business Logic
  INSUFFICIENT_BALANCE = 'INSUFFICIENT_BALANCE',
  CURRENCY_NOT_ALLOWED = 'CURRENCY_NOT_ALLOWED',
  DUPLICATE_TRANSFER_REQUEST = 'DUPLICATE_TRANSFER_REQUEST',
  INVALID_AMOUNT = 'INVALID_AMOUNT',
  
  // System
  INTERNAL_ERROR = 'INTERNAL_ERROR',
  VALIDATION_ERROR = 'VALIDATION_ERROR'
}

