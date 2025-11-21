/**
 * In-Memory Audit Log Repository
 * Para desarrollo y testing
 */

import { AuditLog } from '../../../domain/entities/AuditLog';
import { IAuditLogRepository } from '../../../application/interfaces/IAuditLogRepository';

export class InMemoryAuditLogRepository implements IAuditLogRepository {
  private logs: AuditLog[] = [];

  async save(log: AuditLog): Promise<void> {
    this.logs.push(log);
    console.log('[InMemoryAuditLogRepo] Log saved:', log.getActionType());
  }

  async findBySettlementId(settlementId: string): Promise<AuditLog[]> {
    return this.logs
      .filter(log => log.getSettlementId() === settlementId)
      .sort((a, b) => a.getTimestamp().getTime() - b.getTimestamp().getTime());
  }

  async findByDateRange(startDate: Date, endDate: Date): Promise<AuditLog[]> {
    return this.logs
      .filter(log => {
        const timestamp = log.getTimestamp();
        return timestamp >= startDate && timestamp <= endDate;
      })
      .sort((a, b) => a.getTimestamp().getTime() - b.getTimestamp().getTime());
  }

  async findByUser(userId: string): Promise<AuditLog[]> {
    return this.logs
      .filter(log => log.getPerformedBy() === userId)
      .sort((a, b) => b.getTimestamp().getTime() - a.getTimestamp().getTime());
  }

  // Helper para testing
  clear(): void {
    this.logs = [];
  }

  count(): number {
    return this.logs.length;
  }

  getAll(): AuditLog[] {
    return [...this.logs];
  }
}

