/**
 * Country Code Value Object
 * ISO 3166-1 alpha-2 country codes for IBAN
 */

export enum SupportedCountryCode {
  AE = 'AE', // United Arab Emirates
  DE = 'DE', // Germany
  ES = 'ES'  // Spain
}

export class CountryCode {
  private readonly code: SupportedCountryCode;

  private constructor(code: SupportedCountryCode) {
    this.code = code;
  }

  static create(code: string): CountryCode {
    const upperCode = code.toUpperCase();
    
    if (!Object.values(SupportedCountryCode).includes(upperCode as SupportedCountryCode)) {
      throw new Error(
        `Unsupported country code: ${code}. Supported: ${Object.values(SupportedCountryCode).join(', ')}`
      );
    }

    return new CountryCode(upperCode as SupportedCountryCode);
  }

  static AE(): CountryCode {
    return new CountryCode(SupportedCountryCode.AE);
  }

  static DE(): CountryCode {
    return new CountryCode(SupportedCountryCode.DE);
  }

  static ES(): CountryCode {
    return new CountryCode(SupportedCountryCode.ES);
  }

  getCode(): string {
    return this.code;
  }

  equals(other: CountryCode): boolean {
    return this.code === other.code;
  }

  toString(): string {
    return this.code;
  }
}

