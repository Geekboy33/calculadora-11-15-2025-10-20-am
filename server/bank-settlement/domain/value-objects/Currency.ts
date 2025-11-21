/**
 * Currency Value Object
 * Representa monedas soportadas en el sistema de liquidación bancaria
 */

export enum CurrencyCode {
  AED = 'AED',
  USD = 'USD',
  EUR = 'EUR'
}

export class Currency {
  private readonly code: CurrencyCode;

  private constructor(code: CurrencyCode) {
    this.code = code;
  }

  static create(code: string): Currency {
    const upperCode = code.toUpperCase();
    
    if (!Object.values(CurrencyCode).includes(upperCode as CurrencyCode)) {
      throw new Error(
        `Unsupported currency: ${code}. Supported currencies: ${Object.values(CurrencyCode).join(', ')}`
      );
    }

    return new Currency(upperCode as CurrencyCode);
  }

  getCode(): string {
    return this.code;
  }

  equals(other: Currency): boolean {
    return this.code === other.code;
  }

  toString(): string {
    return this.code;
  }
}

