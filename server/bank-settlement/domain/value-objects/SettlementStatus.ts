/**
 * Settlement Status Value Object
 * Máquina de estados para instrucciones de liquidación
 */

export enum SettlementStatusCode {
  PENDING = 'PENDING',
  SENT = 'SENT',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED'
}

export class SettlementStatus {
  private readonly status: SettlementStatusCode;

  private constructor(status: SettlementStatusCode) {
    this.status = status;
  }

  static create(status: string): SettlementStatus {
    const upperStatus = status.toUpperCase();
    
    if (!Object.values(SettlementStatusCode).includes(upperStatus as SettlementStatusCode)) {
      throw new Error(
        `Invalid settlement status: ${status}. Valid statuses: ${Object.values(SettlementStatusCode).join(', ')}`
      );
    }

    return new SettlementStatus(upperStatus as SettlementStatusCode);
  }

  static pending(): SettlementStatus {
    return new SettlementStatus(SettlementStatusCode.PENDING);
  }

  static sent(): SettlementStatus {
    return new SettlementStatus(SettlementStatusCode.SENT);
  }

  static completed(): SettlementStatus {
    return new SettlementStatus(SettlementStatusCode.COMPLETED);
  }

  static failed(): SettlementStatus {
    return new SettlementStatus(SettlementStatusCode.FAILED);
  }

  getCode(): string {
    return this.status;
  }

  isPending(): boolean {
    return this.status === SettlementStatusCode.PENDING;
  }

  isSent(): boolean {
    return this.status === SettlementStatusCode.SENT;
  }

  isCompleted(): boolean {
    return this.status === SettlementStatusCode.COMPLETED;
  }

  isFailed(): boolean {
    return this.status === SettlementStatusCode.FAILED;
  }

  isFinal(): boolean {
    return this.isCompleted() || this.isFailed();
  }

  canTransitionTo(newStatus: SettlementStatus): boolean {
    // Estados finales no permiten transiciones
    if (this.isFinal()) {
      return false;
    }

    const current = this.status;
    const target = newStatus.status;

    // Transiciones permitidas
    const validTransitions: Record<SettlementStatusCode, SettlementStatusCode[]> = {
      [SettlementStatusCode.PENDING]: [
        SettlementStatusCode.SENT,
        SettlementStatusCode.COMPLETED,
        SettlementStatusCode.FAILED
      ],
      [SettlementStatusCode.SENT]: [
        SettlementStatusCode.COMPLETED,
        SettlementStatusCode.FAILED
      ],
      [SettlementStatusCode.COMPLETED]: [], // Final
      [SettlementStatusCode.FAILED]: [] // Final
    };

    return validTransitions[current]?.includes(target) || false;
  }

  equals(other: SettlementStatus): boolean {
    return this.status === other.status;
  }

  toString(): string {
    return this.status;
  }
}

