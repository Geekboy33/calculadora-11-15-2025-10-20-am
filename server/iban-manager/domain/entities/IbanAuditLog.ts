/**
 * IBAN Audit Log Entity
 */

export enum AuditActionType {
  ALLOCATE = 'ALLOCATE',
  ACTIVATE = 'ACTIVATE',
  BLOCK = 'BLOCK',
  CLOSE = 'CLOSE',
  CHANGE_STATUS = 'CHANGE_STATUS',
  VIEW = 'VIEW'
}

export interface IbanAuditLogProps {
  id: string;
  ibanId: string;
  actionType: AuditActionType;
  previousStatus?: string;
  newStatus?: string;
  performedBy: string;
  metadata?: Record<string, any>;
  createdAt: Date;
}

export class IbanAuditLog {
  private constructor(private readonly props: IbanAuditLogProps) {}

  static create(
    ibanId: string,
    actionType: AuditActionType,
    performedBy: string,
    previousStatus?: string,
    newStatus?: string,
    metadata?: Record<string, any>
  ): IbanAuditLog {
    return new IbanAuditLog({
      id: crypto.randomUUID(),
      ibanId,
      actionType,
      previousStatus,
      newStatus,
      performedBy,
      metadata,
      createdAt: new Date()
    });
  }

  static reconstitute(props: IbanAuditLogProps): IbanAuditLog {
    return new IbanAuditLog(props);
  }

  getId(): string {
    return this.props.id;
  }

  getIbanId(): string {
    return this.props.ibanId;
  }

  getActionType(): AuditActionType {
    return this.props.actionType;
  }

  getPreviousStatus(): string | undefined {
    return this.props.previousStatus;
  }

  getNewStatus(): string | undefined {
    return this.props.newStatus;
  }

  getPerformedBy(): string {
    return this.props.performedBy;
  }

  getMetadata(): Record<string, any> | undefined {
    return this.props.metadata;
  }

  getCreatedAt(): Date {
    return this.props.createdAt;
  }

  toJSON(): Record<string, any> {
    return {
      id: this.props.id,
      ibanId: this.props.ibanId,
      actionType: this.props.actionType,
      previousStatus: this.props.previousStatus,
      newStatus: this.props.newStatus,
      performedBy: this.props.performedBy,
      metadata: this.props.metadata,
      createdAt: this.props.createdAt.toISOString()
    };
  }
}

