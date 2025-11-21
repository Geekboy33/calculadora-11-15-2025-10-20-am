/**
 * Bank Destination Configuration Entity
 * Representa la configuración de un banco destino para settlements
 */

export interface IBANByCurrency {
  AED?: string;
  USD?: string;
  EUR?: string;
}

export interface BankDestinationProps {
  id: string;
  bankCode: string;
  bankName: string;
  bankAddress?: string;
  beneficiaryName: string;
  swiftCode: string;
  ibanByCurrency: IBANByCurrency;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export class BankDestinationConfig {
  private constructor(private readonly props: BankDestinationProps) {}

  static create(props: BankDestinationProps): BankDestinationConfig {
    // Validaciones
    if (!props.bankCode || props.bankCode.length === 0) {
      throw new Error('Bank code is required');
    }

    if (!props.bankName || props.bankName.length === 0) {
      throw new Error('Bank name is required');
    }

    if (!props.beneficiaryName || props.beneficiaryName.length === 0) {
      throw new Error('Beneficiary name is required');
    }

    if (!props.swiftCode || !/^[A-Z]{6}[A-Z0-9]{2}([A-Z0-9]{3})?$/.test(props.swiftCode)) {
      throw new Error(`Invalid SWIFT/BIC code: ${props.swiftCode}`);
    }

    if (!props.ibanByCurrency || Object.keys(props.ibanByCurrency).length === 0) {
      throw new Error('At least one IBAN must be configured');
    }

    return new BankDestinationConfig(props);
  }

  getId(): string {
    return this.props.id;
  }

  getBankCode(): string {
    return this.props.bankCode;
  }

  getBankName(): string {
    return this.props.bankName;
  }

  getBeneficiaryName(): string {
    return this.props.beneficiaryName;
  }

  getSwiftCode(): string {
    return this.props.swiftCode;
  }

  getIBANForCurrency(currency: string): string | null {
    const iban = this.props.ibanByCurrency[currency as keyof IBANByCurrency];
    return iban || null;
  }

  isActive(): boolean {
    return this.props.isActive;
  }

  supportsCurrency(currency: string): boolean {
    return this.getIBANForCurrency(currency) !== null;
  }

  toJSON(): BankDestinationProps {
    return { ...this.props };
  }
}

