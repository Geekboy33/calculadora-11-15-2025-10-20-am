/**
 * Audit Log Repository Interface
 */

import { AuditLog } from '../../domain/entities/AuditLog';

export interface IAuditLogRepository {
  /**
   * Guardar log de auditoría
   */
  save(log: AuditLog): Promise<void>;

  /**
   * Obtener logs para un settlement específico
   */
  findBySettlementId(settlementId: string): Promise<AuditLog[]>;

  /**
   * Obtener logs por rango de fechas
   */
  findByDateRange(startDate: Date, endDate: Date): Promise<AuditLog[]>;

  /**
   * Obtener logs por usuario
   */
  findByUser(userId: string): Promise<AuditLog[]>;
}

