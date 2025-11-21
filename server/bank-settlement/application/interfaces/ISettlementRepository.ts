/**
 * Settlement Repository Interface
 * Contrato para persistencia de instrucciones de liquidación
 */

import { BankSettlementInstruction } from '../../domain/entities/BankSettlementInstruction';

export interface ISettlementRepository {
  /**
   * Guardar nueva instrucción
   */
  save(instruction: BankSettlementInstruction): Promise<void>;

  /**
   * Actualizar instrucción existente
   */
  update(instruction: BankSettlementInstruction): Promise<void>;

  /**
   * Buscar por ID
   */
  findById(id: string): Promise<BankSettlementInstruction | null>;

  /**
   * Buscar por DAES Reference ID
   */
  findByDaesReferenceId(daesReferenceId: string): Promise<BankSettlementInstruction | null>;

  /**
   * Listar por estado
   */
  findByStatus(status: string): Promise<BankSettlementInstruction[]>;

  /**
   * Listar por rango de fechas (executedAt)
   */
  findByExecutionDate(
    startDate: Date,
    endDate: Date
  ): Promise<BankSettlementInstruction[]>;

  /**
   * Listar todas las instrucciones (con paginación)
   */
  findAll(limit?: number, offset?: number): Promise<BankSettlementInstruction[]>;
}

