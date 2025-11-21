/**
 * Settlement Controller
 * Maneja requests HTTP para bank settlements
 */

import { Request, Response } from 'express';
import { CreateBankSettlementInstruction } from '../../application/use-cases/CreateBankSettlementInstruction';
import { ConfirmBankSettlementInstruction } from '../../application/use-cases/ConfirmBankSettlementInstruction';
import { GetBankSettlementById } from '../../application/use-cases/GetBankSettlementById';
import { GetAuditLogForSettlement } from '../../application/use-cases/GetAuditLogForSettlement';
import { GenerateDailySettlementReport } from '../../application/use-cases/GenerateDailySettlementReport';
import { DomainError } from '../../domain/errors/DomainError';

export class SettlementController {
  constructor(
    private readonly createSettlementUseCase: CreateBankSettlementInstruction,
    private readonly confirmSettlementUseCase: ConfirmBankSettlementInstruction,
    private readonly getSettlementUseCase: GetBankSettlementById,
    private readonly getAuditLogUseCase: GetAuditLogForSettlement,
    private readonly generateReportUseCase: GenerateDailySettlementReport
  ) {}

  /**
   * POST /api/bank-settlements
   */
  async createSettlement(req: Request, res: Response): Promise<void> {
    try {
      // Validar input
      const { amount, currency, reference, requestedBy, bankCode } = req.body;

      if (!amount || amount <= 0) {
        res.status(400).json({
          error: 'Invalid amount',
          message: 'Amount must be greater than zero'
        });
        return;
      }

      if (!currency) {
        res.status(400).json({
          error: 'Missing currency',
          message: 'Currency is required (AED, USD, EUR)'
        });
        return;
      }

      if (!requestedBy) {
        res.status(400).json({
          error: 'Missing requestedBy',
          message: 'requestedBy (user ID) is required'
        });
        return;
      }

      // Ejecutar use case
      const result = await this.createSettlementUseCase.execute({
        amount,
        currency,
        reference,
        requestedBy,
        bankCode
      });

      res.status(201).json(result);

    } catch (error: any) {
      console.error('[SettlementController] Error creating settlement:', error);
      
      if (error instanceof DomainError) {
        res.status(error.statusCode).json({
          error: error.code,
          message: error.message
        });
      } else {
        res.status(500).json({
          error: 'INTERNAL_ERROR',
          message: error.message || 'An unexpected error occurred'
        });
      }
    }
  }

  /**
   * GET /api/bank-settlements/:id
   */
  async getSettlement(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;

      const result = await this.getSettlementUseCase.execute(id);

      res.status(200).json(result);

    } catch (error: any) {
      console.error('[SettlementController] Error getting settlement:', error);
      
      if (error instanceof DomainError) {
        res.status(error.statusCode).json({
          error: error.code,
          message: error.message
        });
      } else {
        res.status(500).json({
          error: 'INTERNAL_ERROR',
          message: error.message
        });
      }
    }
  }

  /**
   * PATCH /api/bank-settlements/:id/confirm
   */
  async confirmSettlement(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { status, enbdTransactionReference, failureReason, executedBy } = req.body;

      if (!status) {
        res.status(400).json({
          error: 'Missing status',
          message: 'Status is required (COMPLETED, FAILED, SENT)'
        });
        return;
      }

      if (!executedBy) {
        res.status(400).json({
          error: 'Missing executedBy',
          message: 'executedBy (user ID) is required'
        });
        return;
      }

      // Ejecutar use case
      const result = await this.confirmSettlementUseCase.execute({
        settlementId: id,
        status,
        enbdTransactionReference,
        failureReason,
        executedBy
      });

      res.status(200).json(result);

    } catch (error: any) {
      console.error('[SettlementController] Error confirming settlement:', error);
      
      if (error instanceof DomainError) {
        res.status(error.statusCode).json({
          error: error.code,
          message: error.message
        });
      } else {
        res.status(400).json({
          error: 'VALIDATION_ERROR',
          message: error.message
        });
      }
    }
  }

  /**
   * GET /api/bank-settlements/:id/audit-log
   */
  async getAuditLog(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;

      const logs = await this.getAuditLogUseCase.execute(id);

      res.status(200).json(logs);

    } catch (error: any) {
      console.error('[SettlementController] Error getting audit log:', error);
      
      res.status(500).json({
        error: 'INTERNAL_ERROR',
        message: error.message
      });
    }
  }

  /**
   * GET /api/bank-settlements/report?date=YYYY-MM-DD&format=json|csv
   */
  async generateReport(req: Request, res: Response): Promise<void> {
    try {
      const { date, format } = req.query;

      if (!date || typeof date !== 'string') {
        res.status(400).json({
          error: 'Missing date',
          message: 'Query parameter "date" is required (format: YYYY-MM-DD)'
        });
        return;
      }

      const reportFormat = format === 'csv' ? 'csv' : 'json';
      const performedBy = (req as any).user?.id || 'system';

      const result = await this.generateReportUseCase.execute(date, reportFormat, performedBy);

      if (reportFormat === 'csv') {
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename=settlement-report-${date}.csv`);
        res.status(200).send(result);
      } else {
        res.status(200).json(result);
      }

    } catch (error: any) {
      console.error('[SettlementController] Error generating report:', error);
      
      res.status(500).json({
        error: 'INTERNAL_ERROR',
        message: error.message
      });
    }
  }
}

