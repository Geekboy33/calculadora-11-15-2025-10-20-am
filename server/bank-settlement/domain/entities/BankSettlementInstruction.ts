/**
 * Bank Settlement Instruction Entity
 * Entidad principal del dominio de liquidación bancaria
 */

import { Amount } from '../value-objects/Amount';
import { Currency } from '../value-objects/Currency';
import { IBAN } from '../value-objects/IBAN';
import { SettlementStatus, SettlementStatusCode } from '../value-objects/SettlementStatus';
import { InvalidStatusTransitionError } from '../errors/DomainError';

export interface BankSettlementInstructionProps {
  id: string;
  daesReferenceId: string;
  bankCode: string;
  amount: Amount;
  currency: Currency;
  beneficiaryName: string;
  beneficiaryIban: IBAN;
  swiftCode: string;
  referenceText?: string;
  ledgerDebitId: string;
  status: SettlementStatus;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
  enbdTransactionReference?: string;
  executedBy?: string;
  executedAt?: Date;
  failureReason?: string;
}

export interface CreateSettlementParams {
  id: string;
  daesReferenceId: string;
  bankCode: string;
  amount: Amount;
  currency: Currency;
  beneficiaryName: string;
  beneficiaryIban: IBAN;
  swiftCode: string;
  referenceText?: string;
  ledgerDebitId: string;
  createdBy: string;
}

export interface ConfirmSettlementParams {
  newStatus: SettlementStatus;
  executedBy: string;
  enbdTransactionReference?: string;
  failureReason?: string;
}

export class BankSettlementInstruction {
  private constructor(private props: BankSettlementInstructionProps) {}

  static create(params: CreateSettlementParams): BankSettlementInstruction {
    const now = new Date();

    const instruction = new BankSettlementInstruction({
      ...params,
      status: SettlementStatus.pending(),
      createdAt: now,
      updatedAt: now
    });

    return instruction;
  }

  static reconstitute(props: BankSettlementInstructionProps): BankSettlementInstruction {
    return new BankSettlementInstruction(props);
  }

  // Getters
  getId(): string {
    return this.props.id;
  }

  getDaesReferenceId(): string {
    return this.props.daesReferenceId;
  }

  getBankCode(): string {
    return this.props.bankCode;
  }

  getAmount(): Amount {
    return this.props.amount;
  }

  getCurrency(): Currency {
    return this.props.currency;
  }

  getBeneficiaryName(): string {
    return this.props.beneficiaryName;
  }

  getBeneficiaryIban(): IBAN {
    return this.props.beneficiaryIban;
  }

  getSwiftCode(): string {
    return this.props.swiftCode;
  }

  getReferenceText(): string | undefined {
    return this.props.referenceText;
  }

  getLedgerDebitId(): string {
    return this.props.ledgerDebitId;
  }

  getStatus(): SettlementStatus {
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

  getEnbdTransactionReference(): string | undefined {
    return this.props.enbdTransactionReference;
  }

  getExecutedBy(): string | undefined {
    return this.props.executedBy;
  }

  getExecutedAt(): Date | undefined {
    return this.props.executedAt;
  }

  getFailureReason(): string | undefined {
    return this.props.failureReason;
  }

  // Business logic
  confirm(params: ConfirmSettlementParams): void {
    // Validar transición de estado
    if (!this.props.status.canTransitionTo(params.newStatus)) {
      throw new InvalidStatusTransitionError(
        this.props.status.getCode(),
        params.newStatus.getCode()
      );
    }

    // Actualizar estado
    this.props.status = params.newStatus;
    this.props.executedBy = params.executedBy;
    this.props.executedAt = new Date();
    this.props.updatedAt = new Date();

    // Si es COMPLETED, guardar referencia de ENBD
    if (params.newStatus.isCompleted() && params.enbdTransactionReference) {
      this.props.enbdTransactionReference = params.enbdTransactionReference;
    }

    // Si es FAILED, guardar razón
    if (params.newStatus.isFailed() && params.failureReason) {
      this.props.failureReason = params.failureReason;
    }
  }

  markAsSent(executedBy: string): void {
    this.confirm({
      newStatus: SettlementStatus.sent(),
      executedBy
    });
  }

  markAsCompleted(executedBy: string, enbdTransactionReference: string): void {
    this.confirm({
      newStatus: SettlementStatus.completed(),
      executedBy,
      enbdTransactionReference
    });
  }

  markAsFailed(executedBy: string, failureReason: string): void {
    this.confirm({
      newStatus: SettlementStatus.failed(),
      executedBy,
      failureReason
    });
  }

  // Serialization
  toJSON(): Record<string, any> {
    return {
      id: this.props.id,
      daesReferenceId: this.props.daesReferenceId,
      bankCode: this.props.bankCode,
      amount: this.props.amount.getValue(),
      currency: this.props.currency.getCode(),
      beneficiaryName: this.props.beneficiaryName,
      beneficiaryIban: this.props.beneficiaryIban.getValue(),
      swiftCode: this.props.swiftCode,
      referenceText: this.props.referenceText,
      ledgerDebitId: this.props.ledgerDebitId,
      status: this.props.status.getCode(),
      createdBy: this.props.createdBy,
      createdAt: this.props.createdAt.toISOString(),
      updatedAt: this.props.updatedAt.toISOString(),
      enbdTransactionReference: this.props.enbdTransactionReference,
      executedBy: this.props.executedBy,
      executedAt: this.props.executedAt?.toISOString(),
      failureReason: this.props.failureReason
    };
  }

  // Outbound Payment Order (para finance team o API ENBD)
  toPaymentOrder(): Record<string, any> {
    return {
      bankName: 'EMIRATES NBD',
      beneficiaryName: this.props.beneficiaryName,
      beneficiaryIban: this.props.beneficiaryIban.getValue(),
      swiftCode: this.props.swiftCode,
      currency: this.props.currency.getCode(),
      amount: this.props.amount.toFixed(2),
      daesReferenceId: this.props.daesReferenceId,
      referenceText: this.props.referenceText || '',
      createdAt: this.props.createdAt.toISOString(),
      status: this.props.status.getCode(),
      enbdTransactionReference: this.props.enbdTransactionReference
    };
  }
}

