/**
 * Use Case: Generate Daily Settlement Report
 * Genera reporte de settlements ejecutados en una fecha específica
 */

import { ISettlementRepository } from '../interfaces/ISettlementRepository';
import { IAuditLogRepository } from '../interfaces/IAuditLogRepository';
import { AuditLog, AuditActionType } from '../../domain/entities/AuditLog';
import { SettlementReportRow, DailySettlementReportDTO } from '../dtos/SettlementReportDTO';

export type ReportFormat = 'json' | 'csv';

export class GenerateDailySettlementReport {
  constructor(
    private readonly settlementRepo: ISettlementRepository,
    private readonly auditLogRepo: IAuditLogRepository
  ) {}

  async execute(
    date: string,
    format: ReportFormat = 'json',
    performedBy: string = 'system'
  ): Promise<DailySettlementReportDTO | string> {
    // 1. Parse date y calcular rango
    const targetDate = new Date(date);
    if (isNaN(targetDate.getTime())) {
      throw new Error(`Invalid date format: ${date}. Expected YYYY-MM-DD`);
    }

    const startOfDay = new Date(targetDate);
    startOfDay.setUTCHours(0, 0, 0, 0);

    const endOfDay = new Date(targetDate);
    endOfDay.setUTCHours(23, 59, 59, 999);

    // 2. Buscar settlements ejecutados en ese día
    const settlements = await this.settlementRepo.findByExecutionDate(startOfDay, endOfDay);

    console.log('[GenerateReport] 📊 Settlements encontrados:', settlements.length);

    // 3. Construir filas del reporte
    const rows: SettlementReportRow[] = settlements.map(settlement => ({
      daesReferenceId: settlement.getDaesReferenceId(),
      currency: settlement.getCurrency().getCode(),
      amount: settlement.getAmount().toFixed(2),
      beneficiaryIban: settlement.getBeneficiaryIban().getValue(),
      enbdTransactionReference: settlement.getEnbdTransactionReference(),
      status: settlement.getStatus().getCode(),
      executedBy: settlement.getExecutedBy(),
      executedAt: settlement.getExecutedAt()?.toISOString(),
      createdAt: settlement.getCreatedAt().toISOString(),
      referenceText: settlement.getReferenceText()
    }));

    // 4. Calcular totales
    const totalAmounts: Record<string, number> = {};
    const statusCounts = {
      completed: 0,
      failed: 0,
      pending: 0
    };

    settlements.forEach(s => {
      const curr = s.getCurrency().getCode();
      totalAmounts[curr] = (totalAmounts[curr] || 0) + s.getAmount().getValue();

      if (s.getStatus().isCompleted()) statusCounts.completed++;
      else if (s.getStatus().isFailed()) statusCounts.failed++;
      else statusCounts.pending++;
    });

    // 5. Crear audit log (reporte generado)
    const auditLog = AuditLog.create(
      'REPORT',
      AuditActionType.GENERATE_REPORT,
      performedBy,
      undefined,
      undefined,
      {
        date,
        settlementsCount: settlements.length,
        format
      }
    );

    await this.auditLogRepo.save(auditLog);

    // 6. Formato de salida
    if (format === 'csv') {
      return this.generateCSV(rows);
    }

    // JSON format
    const report: DailySettlementReportDTO = {
      date,
      totalCount: settlements.length,
      completedCount: statusCounts.completed,
      failedCount: statusCounts.failed,
      pendingCount: statusCounts.pending,
      totalAmountByAED: totalAmounts['AED']?.toFixed(2),
      totalAmountUSD: totalAmounts['USD']?.toFixed(2),
      totalAmountEUR: totalAmounts['EUR']?.toFixed(2),
      settlements: rows
    };

    return report;
  }

  private generateCSV(rows: SettlementReportRow[]): string {
    const headers = [
      'DAES Reference',
      'Currency',
      'Amount',
      'IBAN',
      'ENBD Ref',
      'Status',
      'Executed By',
      'Executed At',
      'Created At',
      'Reference Text'
    ];

    let csv = headers.join(',') + '\n';

    rows.forEach(row => {
      const line = [
        row.daesReferenceId,
        row.currency,
        row.amount,
        row.beneficiaryIban,
        row.enbdTransactionReference || '',
        row.status,
        row.executedBy || '',
        row.executedAt || '',
        row.createdAt,
        `"${row.referenceText || ''}"`
      ];

      csv += line.join(',') + '\n';
    });

    return csv;
  }
}

