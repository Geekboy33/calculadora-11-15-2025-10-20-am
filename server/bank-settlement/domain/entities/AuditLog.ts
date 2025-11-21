/**
 * Audit Log Entity
 * Registra todas las acciones sobre settlement instructions
 */

export interface AuditLogProps {
  id: string;
  settlementId: string;
  actionType: AuditActionType;
  performedBy: string;
  previousStatus?: string;
  newStatus?: string;
  metadata?: Record<string, any>;
  timestamp: Date;
}

export enum AuditActionType {
  CREATE_INSTRUCTION = 'CREATE_INSTRUCTION',
  UPDATE_STATUS = 'UPDATE_STATUS',
  MARK_AS_SENT = 'MARK_AS_SENT',
  MARK_AS_COMPLETED = 'MARK_AS_COMPLETED',
  MARK_AS_FAILED = 'MARK_AS_FAILED',
  VIEW_INSTRUCTION = 'VIEW_INSTRUCTION',
  GENERATE_REPORT = 'GENERATE_REPORT'
}

export class AuditLog {
  private constructor(private readonly props: AuditLogProps) {}

  static create(
    settlementId: string,
    actionType: AuditActionType,
    performedBy: string,
    previousStatus?: string,
    newStatus?: string,
    metadata?: Record<string, any>
  ): AuditLog {
    return new AuditLog({
      id: crypto.randomUUID(),
      settlementId,
      actionType,
      performedBy,
      previousStatus,
      newStatus,
      metadata,
      timestamp: new Date()
    });
  }

  static reconstitute(props: AuditLogProps): AuditLog {
    return new AuditLog(props);
  }

  getId(): string {
    return this.props.id;
  }

  getSettlementId(): string {
    return this.props.settlementId;
  }

  getActionType(): AuditActionType {
    return this.props.actionType;
  }

  getPerformedBy(): string {
    return this.props.performedBy;
  }

  getPreviousStatus(): string | undefined {
    return this.props.previousStatus;
  }

  getNewStatus(): string | undefined {
    return this.props.newStatus;
  }

  getMetadata(): Record<string, any> | undefined {
    return this.props.metadata;
  }

  getTimestamp(): Date {
    return this.props.timestamp;
  }

  toJSON(): Record<string, any> {
    return {
      id: this.props.id,
      settlementId: this.props.settlementId,
      actionType: this.props.actionType,
      performedBy: this.props.performedBy,
      previousStatus: this.props.previousStatus,
      newStatus: this.props.newStatus,
      metadata: this.props.metadata,
      timestamp: this.props.timestamp.toISOString()
    };
  }
}

