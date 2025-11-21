/**
 * Use Case: Confirm Bank Settlement Instruction
 * Actualiza el estado de una instrucción tras ejecución manual en ENBD
 */

import { ISettlementRepository } from '../interfaces/ISettlementRepository';
import { IAuditLogRepository } from '../interfaces/IAuditLogRepository';
import { ConfirmSettlementDTO, ConfirmSettlementResponse } from '../dtos/ConfirmSettlementDTO';
import { SettlementStatus } from '../../domain/value-objects/SettlementStatus';
import { AuditLog, AuditActionType } from '../../domain/entities/AuditLog';
import { SettlementNotFoundError } from '../../domain/errors/DomainError';

export class ConfirmBankSettlementInstruction {
  constructor(
    private readonly settlementRepo: ISettlementRepository,
    private readonly auditLogRepo: IAuditLogRepository
  ) {}

  async execute(dto: ConfirmSettlementDTO): Promise<ConfirmSettlementResponse> {
    // 1. Buscar instrucción
    const instruction = await this.settlementRepo.findById(dto.settlementId);

    if (!instruction) {
      throw new SettlementNotFoundError(dto.settlementId);
    }

    const previousStatus = instruction.getStatus().getCode();

    // 2. Validar y crear nuevo estado
    const newStatus = SettlementStatus.create(dto.status);

    // 3. Validar transición (se lanza error si es inválida)
    if (!instruction.getStatus().canTransitionTo(newStatus)) {
      throw new Error(
        `Invalid status transition: ${previousStatus} → ${dto.status}. ` +
        `Current status: ${previousStatus}. ` +
        (instruction.getStatus().isFinal() ? 'Status is final and cannot be changed.' : '')
      );
    }

    // 4. Confirmar en la entidad de dominio
    instruction.confirm({
      newStatus,
      executedBy: dto.executedBy,
      enbdTransactionReference: dto.enbdTransactionReference,
      failureReason: dto.failureReason
    });

    // 5. Persistir cambios
    await this.settlementRepo.update(instruction);

    // 6. Crear audit log
    const auditLog = AuditLog.create(
      instruction.getId(),
      AuditActionType.UPDATE_STATUS,
      dto.executedBy,
      previousStatus,
      instruction.getStatus().getCode(),
      {
        enbdTransactionReference: dto.enbdTransactionReference,
        failureReason: dto.failureReason
      }
    );

    await this.auditLogRepo.save(auditLog);

    console.log('[ConfirmSettlement] ✅ Status updated:', {
      id: instruction.getId(),
      previousStatus,
      newStatus: instruction.getStatus().getCode(),
      executedBy: dto.executedBy
    });

    // 7. Retornar respuesta
    const response: ConfirmSettlementResponse = {
      id: instruction.getId(),
      status: instruction.getStatus().getCode(),
      enbdTransactionReference: instruction.getEnbdTransactionReference(),
      executedBy: instruction.getExecutedBy()!,
      executedAt: instruction.getExecutedAt()!.toISOString(),
      failureReason: instruction.getFailureReason()
    };

    return response;
  }
}

