/**
 * IBAN Entity
 * Representa un IBAN emitido por Digital Commercial Bank Ltd
 */

import { IbanStatus, IbanStatusCode } from '../value-objects/IbanStatus';
import { CountryCode } from '../value-objects/CountryCode';
import { InvalidStatusTransitionError } from '../errors/DomainError';

export interface IBANProps {
  id: string;
  daesAccountId: string;
  iban: string;
  countryCode: CountryCode;
  currency: string;
  bankCode: string;
  branchCode?: string;
  internalAccountNumber: string;
  status: IbanStatus;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateIBANParams {
  id: string;
  daesAccountId: string;
  iban: string;
  countryCode: CountryCode;
  currency: string;
  bankCode: string;
  branchCode?: string;
  internalAccountNumber: string;
  createdBy: string;
}

export class IBAN {
  private constructor(private props: IBANProps) {}

  static create(params: CreateIBANParams): IBAN {
    const now = new Date();

    const entity = new IBAN({
      ...params,
      status: IbanStatus.pending(),
      createdAt: now,
      updatedAt: now
    });

    return entity;
  }

  static reconstitute(props: IBANProps): IBAN {
    return new IBAN(props);
  }

  // Getters
  getId(): string {
    return this.props.id;
  }

  getDaesAccountId(): string {
    return this.props.daesAccountId;
  }

  getIban(): string {
    return this.props.iban;
  }

  getIbanFormatted(): string {
    return this.props.iban.replace(/(.{4})/g, '$1 ').trim();
  }

  getCountryCode(): CountryCode {
    return this.props.countryCode;
  }

  getCurrency(): string {
    return this.props.currency;
  }

  getBankCode(): string {
    return this.props.bankCode;
  }

  getBranchCode(): string | undefined {
    return this.props.branchCode;
  }

  getInternalAccountNumber(): string {
    return this.props.internalAccountNumber;
  }

  getStatus(): IbanStatus {
    return this.props.status;
  }

  getCreatedBy(): string {
    return this.props.createdBy;
  }

  getCreatedAt(): Date {
    return this.props.createdAt;
  }

  getUpdatedAt(): Date {
    return this.props.updatedAt;
  }

  // Business logic
  changeStatus(newStatus: IbanStatus, performedBy: string, reason?: string): void {
    // Validar transición
    if (!this.props.status.canTransitionTo(newStatus)) {
      throw new InvalidStatusTransitionError(
        this.props.status.getCode(),
        newStatus.getCode()
      );
    }

    this.props.status = newStatus;
    this.props.updatedAt = new Date();

    console.log('[IBAN Entity] Status changed:', {
      iban: this.props.iban,
      newStatus: newStatus.getCode(),
      performedBy,
      reason
    });
  }

  activate(performedBy: string): void {
    this.changeStatus(IbanStatus.active(), performedBy, 'Activation');
  }

  block(performedBy: string, reason?: string): void {
    this.changeStatus(IbanStatus.blocked(), performedBy, reason);
  }

  close(performedBy: string, reason?: string): void {
    this.changeStatus(IbanStatus.closed(), performedBy, reason);
  }

  isUsable(): boolean {
    return this.props.status.isActive();
  }

  // Serialization
  toJSON(): Record<string, any> {
    return {
      id: this.props.id,
      daesAccountId: this.props.daesAccountId,
      iban: this.props.iban,
      ibanFormatted: this.getIbanFormatted(),
      countryCode: this.props.countryCode.getCode(),
      currency: this.props.currency,
      bankCode: this.props.bankCode,
      branchCode: this.props.branchCode,
      internalAccountNumber: this.props.internalAccountNumber,
      status: this.props.status.getCode(),
      createdBy: this.props.createdBy,
      createdAt: this.props.createdAt.toISOString(),
      updatedAt: this.props.updatedAt.toISOString()
    };
  }
}

