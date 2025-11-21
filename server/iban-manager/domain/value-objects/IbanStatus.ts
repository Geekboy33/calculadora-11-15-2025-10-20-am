/**
 * IBAN Status Value Object
 * Lifecycle states for IBAN accounts
 */

export enum IbanStatusCode {
  PENDING = 'PENDING',   // Reserved, not yet active
  ACTIVE = 'ACTIVE',     // Can be used for payments
  BLOCKED = 'BLOCKED',   // Temporarily blocked
  CLOSED = 'CLOSED'      // Permanently closed (final)
}

export class IbanStatus {
  private readonly status: IbanStatusCode;

  private constructor(status: IbanStatusCode) {
    this.status = status;
  }

  static create(status: string): IbanStatus {
    const upperStatus = status.toUpperCase();
    
    if (!Object.values(IbanStatusCode).includes(upperStatus as IbanStatusCode)) {
      throw new Error(
        `Invalid IBAN status: ${status}. Valid statuses: ${Object.values(IbanStatusCode).join(', ')}`
      );
    }

    return new IbanStatus(upperStatus as IbanStatusCode);
  }

  static pending(): IbanStatus {
    return new IbanStatus(IbanStatusCode.PENDING);
  }

  static active(): IbanStatus {
    return new IbanStatus(IbanStatusCode.ACTIVE);
  }

  static blocked(): IbanStatus {
    return new IbanStatus(IbanStatusCode.BLOCKED);
  }

  static closed(): IbanStatus {
    return new IbanStatus(IbanStatusCode.CLOSED);
  }

  getCode(): string {
    return this.status;
  }

  isPending(): boolean {
    return this.status === IbanStatusCode.PENDING;
  }

  isActive(): boolean {
    return this.status === IbanStatusCode.ACTIVE;
  }

  isBlocked(): boolean {
    return this.status === IbanStatusCode.BLOCKED;
  }

  isClosed(): boolean {
    return this.status === IbanStatusCode.CLOSED;
  }

  isFinal(): boolean {
    return this.isClosed();
  }

  canTransitionTo(newStatus: IbanStatus): boolean {
    if (this.isFinal()) {
      return false; // CLOSED is final
    }

    const current = this.status;
    const target = newStatus.status;

    // Valid transitions
    const validTransitions: Record<IbanStatusCode, IbanStatusCode[]> = {
      [IbanStatusCode.PENDING]: [
        IbanStatusCode.ACTIVE,
        IbanStatusCode.CLOSED
      ],
      [IbanStatusCode.ACTIVE]: [
        IbanStatusCode.BLOCKED,
        IbanStatusCode.CLOSED
      ],
      [IbanStatusCode.BLOCKED]: [
        IbanStatusCode.ACTIVE,
        IbanStatusCode.CLOSED
      ],
      [IbanStatusCode.CLOSED]: [] // Final state
    };

    return validTransitions[current]?.includes(target) || false;
  }

  equals(other: IbanStatus): boolean {
    return this.status === other.status;
  }

  toString(): string {
    return this.status;
  }
}

