/**
 * Settlement Routes
 * Define endpoints HTTP para bank settlements
 */

import { Router } from 'express';
import { SettlementController } from '../controllers/SettlementController';

export function createSettlementRoutes(controller: SettlementController): Router {
  const router = Router();

  /**
   * POST /api/bank-settlements
   * Crear nueva instrucción de settlement
   * Requiere rol: TREASURY_OPERATOR
   */
  router.post(
    '/',
    // authMiddleware.requireRole('TREASURY_OPERATOR'), // Descomentar en producción
    (req, res) => controller.createSettlement(req, res)
  );

  /**
   * GET /api/bank-settlements/:id
   * Obtener settlement por ID
   * Requiere rol: TREASURY_VIEWER | TREASURY_OPERATOR | TREASURY_MANAGER
   */
  router.get(
    '/:id',
    // authMiddleware.requireRole(['TREASURY_VIEWER', 'TREASURY_OPERATOR', 'TREASURY_MANAGER']),
    (req, res) => controller.getSettlement(req, res)
  );

  /**
   * PATCH /api/bank-settlements/:id/confirm
   * Confirmar ejecución de settlement (tras ENBD manual)
   * Requiere rol: TREASURY_MANAGER
   */
  router.patch(
    '/:id/confirm',
    // authMiddleware.requireRole('TREASURY_MANAGER'),
    (req, res) => controller.confirmSettlement(req, res)
  );

  /**
   * GET /api/bank-settlements/:id/audit-log
   * Obtener historial de auditoría
   * Requiere rol: TREASURY_MANAGER | COMPLIANCE_OFFICER
   */
  router.get(
    '/:id/audit-log',
    // authMiddleware.requireRole(['TREASURY_MANAGER', 'COMPLIANCE_OFFICER']),
    (req, res) => controller.getAuditLog(req, res)
  );

  /**
   * GET /api/bank-settlements/report
   * Generar reporte diario
   * Query params: date (YYYY-MM-DD), format (json|csv)
   * Requiere rol: TREASURY_VIEWER | TREASURY_MANAGER | TREASURY_OPERATOR
   */
  router.get(
    '/report',
    // authMiddleware.requireRole(['TREASURY_VIEWER', 'TREASURY_MANAGER', 'TREASURY_OPERATOR']),
    (req, res) => controller.generateReport(req, res)
  );

  return router;
}

