/**
 * IBAN Country Configuration Entity
 * Define estructura de IBAN por país
 */

export interface IbanCountryConfigProps {
  id: string;
  countryCode: string;
  countryName: string;
  ibanLength: number;
  bankCode: string;
  branchCode?: string;
  bbanPattern: string;
  allowedCurrencies: string[];
  isActive: boolean;
}

export class IbanCountryConfig {
  private constructor(private readonly props: IbanCountryConfigProps) {}

  static create(props: IbanCountryConfigProps): IbanCountryConfig {
    // Validaciones
    if (!props.countryCode || props.countryCode.length !== 2) {
      throw new Error('Country code must be 2 characters');
    }

    if (props.ibanLength < 15 || props.ibanLength > 34) {
      throw new Error('IBAN length must be between 15-34');
    }

    if (!props.bankCode || props.bankCode.length === 0) {
      throw new Error('Bank code is required');
    }

    if (!props.allowedCurrencies || props.allowedCurrencies.length === 0) {
      throw new Error('At least one currency must be allowed');
    }

    return new IbanCountryConfig(props);
  }

  getId(): string {
    return this.props.id;
  }

  getCountryCode(): string {
    return this.props.countryCode;
  }

  getCountryName(): string {
    return this.props.countryName;
  }

  getIbanLength(): number {
    return this.props.ibanLength;
  }

  getBankCode(): string {
    return this.props.bankCode;
  }

  getBranchCode(): string | undefined {
    return this.props.branchCode;
  }

  getBbanPattern(): string {
    return this.props.bbanPattern;
  }

  getAllowedCurrencies(): string[] {
    return [...this.props.allowedCurrencies];
  }

  isActive(): boolean {
    return this.props.isActive;
  }

  isCurrencyAllowed(currency: string): boolean {
    return this.props.allowedCurrencies.includes(currency.toUpperCase());
  }

  toJSON(): IbanCountryConfigProps {
    return { ...this.props };
  }
}

