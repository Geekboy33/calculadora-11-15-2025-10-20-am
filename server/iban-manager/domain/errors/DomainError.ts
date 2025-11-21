/**
 * Domain Errors for IBAN Manager
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

export class InvalidIbanError extends DomainError {
  constructor(iban: string, reason: string) {
    super(
      `Invalid IBAN: ${iban}. ${reason}`,
      'INVALID_IBAN',
      400
    );
  }
}

export class InvalidStatusTransitionError extends DomainError {
  constructor(currentStatus: string, targetStatus: string) {
    super(
      `Invalid IBAN status transition: ${currentStatus} → ${targetStatus}`,
      'INVALID_STATUS_TRANSITION',
      400
    );
  }
}

export class DuplicateIbanError extends DomainError {
  constructor(iban: string) {
    super(
      `IBAN already exists: ${iban}`,
      'DUPLICATE_IBAN',
      409
    );
  }
}

export class IbanNotFoundError extends DomainError {
  constructor(identifier: string) {
    super(
      `IBAN not found: ${identifier}`,
      'IBAN_NOT_FOUND',
      404
    );
  }
}

export class AccountNotFoundError extends DomainError {
  constructor(accountId: string) {
    super(
      `DAES account not found: ${accountId}`,
      'ACCOUNT_NOT_FOUND',
      404
    );
  }
}

export class UnsupportedCountryError extends DomainError {
  constructor(countryCode: string, supported: string[]) {
    super(
      `Unsupported country code: ${countryCode}. Supported: ${supported.join(', ')}`,
      'UNSUPPORTED_COUNTRY',
      400
    );
  }
}

export class CurrencyNotAllowedError extends DomainError {
  constructor(currency: string, country: string, allowed: string[]) {
    super(
      `Currency ${currency} not allowed for country ${country}. Allowed: ${allowed.join(', ')}`,
      'CURRENCY_NOT_ALLOWED',
      400
    );
  }
}

export class IbanAllocationError extends DomainError {
  constructor(reason: string) {
    super(
      `Failed to allocate IBAN: ${reason}`,
      'IBAN_ALLOCATION_FAILED',
      500
    );
  }
}

