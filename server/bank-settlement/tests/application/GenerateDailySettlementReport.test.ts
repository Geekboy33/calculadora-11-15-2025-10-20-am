/**
 * Tests: GenerateDailySettlementReport Use Case
 */

import { GenerateDailySettlementReport } from '../../application/use-cases/GenerateDailySettlementReport';
import { CreateBankSettlementInstruction } from '../../application/use-cases/CreateBankSettlementInstruction';
import { ConfirmBankSettlementInstruction } from '../../application/use-cases/ConfirmBankSettlementInstruction';
import { InMemorySettlementRepository } from '../../infrastructure/database/repositories/InMemorySettlementRepository';
import { InMemoryAuditLogRepository } from '../../infrastructure/database/repositories/InMemoryAuditLogRepository';
import { InMemoryBankConfigRepository } from '../../infrastructure/database/repositories/InMemoryBankConfigRepository';
import { FakeLedgerService } from '../../infrastructure/services/FakeLedgerService';
import { DailySettlementReportDTO } from '../../application/dtos/SettlementReportDTO';

describe('GenerateDailySettlementReport Use Case', () => {
  let generateReportUseCase: GenerateDailySettlementReport;
  let createSettlementUseCase: CreateBankSettlementInstruction;
  let confirmSettlementUseCase: ConfirmBankSettlementInstruction;
  let settlementRepo: InMemorySettlementRepository;
  let auditLogRepo: InMemoryAuditLogRepository;

  beforeEach(() => {
    settlementRepo = new InMemorySettlementRepository();
    auditLogRepo = new InMemoryAuditLogRepository();
    const bankConfigRepo = new InMemoryBankConfigRepository();
    const ledgerService = new FakeLedgerService();

    createSettlementUseCase = new CreateBankSettlementInstruction(
      settlementRepo,
      auditLogRepo,
      bankConfigRepo,
      ledgerService
    );

    confirmSettlementUseCase = new ConfirmBankSettlementInstruction(
      settlementRepo,
      auditLogRepo
    );

    generateReportUseCase = new GenerateDailySettlementReport(
      settlementRepo,
      auditLogRepo
    );
  });

  it('should generate report for specific date', async () => {
    // Crear settlements
    const settlement1 = await createSettlementUseCase.execute({
      amount: 1000000,
      currency: 'USD',
      requestedBy: 'user_test'
    });

    const settlement2 = await createSettlementUseCase.execute({
      amount: 500000,
      currency: 'EUR',
      requestedBy: 'user_test'
    });

    // Confirmar uno
    await confirmSettlementUseCase.execute({
      settlementId: settlement1.id,
      status: 'COMPLETED',
      enbdTransactionReference: 'ENBD-123',
      executedBy: 'manager_test'
    });

    // Generar reporte
    const today = new Date().toISOString().split('T')[0];
    const report = await generateReportUseCase.execute(today, 'json', 'report_user') as DailySettlementReportDTO;

    expect(report.totalCount).toBe(1); // Solo el completado
    expect(report.completedCount).toBe(1);
    expect(report.failedCount).toBe(0);
    expect(report.totalAmountUSD).toBe('1000000.00');
    expect(report.settlements.length).toBe(1);
    expect(report.settlements[0].daesReferenceId).toContain('DAES-SET-');
    expect(report.settlements[0].status).toBe('COMPLETED');
  });

  it('should generate CSV format', async () => {
    const settlement = await createSettlementUseCase.execute({
      amount: 250000,
      currency: 'AED',
      requestedBy: 'user_test'
    });

    await confirmSettlementUseCase.execute({
      settlementId: settlement.id,
      status: 'COMPLETED',
      enbdTransactionReference: 'ENBD-CSV-001',
      executedBy: 'manager_test'
    });

    const today = new Date().toISOString().split('T')[0];
    const csv = await generateReportUseCase.execute(today, 'csv', 'report_user') as string;

    expect(typeof csv).toBe('string');
    expect(csv).toContain('DAES Reference');
    expect(csv).toContain('AED');
    expect(csv).toContain('250000.00');
    expect(csv).toContain('ENBD-CSV-001');
    expect(csv).toContain('COMPLETED');
  });

  it('should return empty report if no settlements on date', async () => {
    const futureDate = '2099-12-31';
    const report = await generateReportUseCase.execute(futureDate, 'json', 'report_user') as DailySettlementReportDTO;

    expect(report.totalCount).toBe(0);
    expect(report.settlements.length).toBe(0);
  });
});

