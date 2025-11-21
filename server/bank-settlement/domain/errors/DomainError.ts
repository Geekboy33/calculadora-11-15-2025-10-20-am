/**
 * Base Domain Error
 * Clase base para todos los errores de dominio
 */

export abstract class DomainError extends Error {
  public readonly code: string;
  public readonly statusCode: number;

  constructor(message: string, code: string, statusCode: number = 400) {
    super(message);
    this.name = this.constructor.name;
    this.code = code;
    this.statusCode = statusCode;
    Error.captureStackTrace(this, this.constructor);
  }
}

export class InvalidStatusTransitionError extends DomainError {
  constructor(currentStatus: string, targetStatus: string) {
    super(
      `Invalid status transition: ${currentStatus} → ${targetStatus}. This transition is not allowed.`,
      'INVALID_STATUS_TRANSITION',
      400
    );
  }
}

export class UnsupportedCurrencyError extends DomainError {
  constructor(currency: string, supportedCurrencies: string[]) {
    super(
      `Unsupported currency: ${currency}. Supported currencies: ${supportedCurrencies.join(', ')}`,
      'UNSUPPORTED_CURRENCY',
      400
    );
  }
}

export class InsufficientFundsError extends DomainError {
  constructor(currency: string, requested: number, available: number) {
    super(
      `Insufficient funds for ${currency}. Requested: ${requested.toFixed(2)}, Available: ${available.toFixed(2)}`,
      'INSUFFICIENT_FUNDS',
      400
    );
  }
}

export class SettlementNotFoundError extends DomainError {
  constructor(settlementId: string) {
    super(
      `Settlement instruction not found: ${settlementId}`,
      'SETTLEMENT_NOT_FOUND',
      404
    );
  }
}

export class BankConfigNotFoundError extends DomainError {
  constructor(bankCode: string) {
    super(
      `Bank configuration not found for bank code: ${bankCode}`,
      'BANK_CONFIG_NOT_FOUND',
      404
    );
  }
}

export class LedgerDebitFailedError extends DomainError {
  constructor(reason: string) {
    super(
      `Failed to debit DAES treasury ledger: ${reason}`,
      'LEDGER_DEBIT_FAILED',
      500
    );
  }
}

export class InvalidIBANError extends DomainError {
  constructor(iban: string, reason: string) {
    super(
      `Invalid IBAN: ${iban}. ${reason}`,
      'INVALID_IBAN',
      400
    );
  }
}

export class InvalidAmountError extends DomainError {
  constructor(amount: number | string, reason: string) {
    super(
      `Invalid amount: ${amount}. ${reason}`,
      'INVALID_AMOUNT',
      400
    );
  }
}

