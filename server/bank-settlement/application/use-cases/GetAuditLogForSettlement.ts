/**
 * Use Case: Get Audit Log For Settlement
 */

import { IAuditLogRepository } from '../interfaces/IAuditLogRepository';

export class GetAuditLogForSettlement {
  constructor(private readonly auditLogRepo: IAuditLogRepository) {}

  async execute(settlementId: string): Promise<Record<string, any>[]> {
    const logs = await this.auditLogRepo.findBySettlementId(settlementId);
    
    return logs.map(log => log.toJSON());
  }
}

