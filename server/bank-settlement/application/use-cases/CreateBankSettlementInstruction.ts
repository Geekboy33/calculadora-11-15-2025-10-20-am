/**
 * Use Case: Create Bank Settlement Instruction
 * Crea una nueva instrucción de liquidación bancaria con débito en ledger DAES
 */

import { BankSettlementInstruction } from '../../domain/entities/BankSettlementInstruction';
import { AuditLog, AuditActionType } from '../../domain/entities/AuditLog';
import { Amount } from '../../domain/value-objects/Amount';
import { Currency } from '../../domain/value-objects/Currency';
import { IBAN } from '../../domain/value-objects/IBAN';
import { SettlementStatus } from '../../domain/value-objects/SettlementStatus';
import { ISettlementRepository } from '../interfaces/ISettlementRepository';
import { IAuditLogRepository } from '../interfaces/IAuditLogRepository';
import { IBankConfigRepository } from '../interfaces/IBankConfigRepository';
import { ILedgerService } from '../interfaces/ILedgerService';
import { CreateSettlementDTO, CreateSettlementResponse } from '../dtos/CreateSettlementDTO';
import {
  BankConfigNotFoundError,
  UnsupportedCurrencyError,
  LedgerDebitFailedError
} from '../../domain/errors/DomainError';

export class CreateBankSettlementInstruction {
  constructor(
    private readonly settlementRepo: ISettlementRepository,
    private readonly auditLogRepo: IAuditLogRepository,
    private readonly bankConfigRepo: IBankConfigRepository,
    private readonly ledgerService: ILedgerService
  ) {}

  async execute(dto: CreateSettlementDTO): Promise<CreateSettlementResponse> {
    // 1. Validar y crear value objects
    const amount = Amount.create(dto.amount);
    const currency = Currency.create(dto.currency);

    // 2. Obtener configuración del banco
    const bankCode = dto.bankCode || 'ENBD';
    const bankConfig = await this.bankConfigRepo.findByBankCode(bankCode);

    if (!bankConfig) {
      throw new BankConfigNotFoundError(bankCode);
    }

    if (!bankConfig.isActive()) {
      throw new Error(`Bank ${bankCode} is not active`);
    }

    // 3. Validar que el banco soporte la moneda
    if (!bankConfig.supportsCurrency(currency.getCode())) {
      throw new UnsupportedCurrencyError(
        currency.getCode(),
        Object.keys(bankConfig.toJSON().ibanByCurrency)
      );
    }

    // 4. Obtener IBAN correcto para la moneda
    const ibanString = bankConfig.getIBANForCurrency(currency.getCode());
    if (!ibanString) {
      throw new Error(`No IBAN configured for currency ${currency.getCode()} in bank ${bankCode}`);
    }
    const iban = IBAN.create(ibanString);

    // 5. Generar DAES Reference ID único
    const daesReferenceId = this.generateDaesReferenceId();

    // 6. Debitar del ledger DAES (operación crítica)
    const ledgerResult = await this.ledgerService.debitTreasuryAccount(
      currency.getCode(),
      amount.getValue(),
      daesReferenceId,
      dto.requestedBy
    );

    if (!ledgerResult.success || !ledgerResult.ledgerDebitId) {
      throw new LedgerDebitFailedError(
        ledgerResult.error || 'Unknown ledger error'
      );
    }

    console.log('[CreateSettlement] ✅ Ledger debitado:', ledgerResult.ledgerDebitId);

    // 7. Crear entidad de dominio
    const instruction = BankSettlementInstruction.create({
      id: crypto.randomUUID(),
      daesReferenceId,
      bankCode,
      amount,
      currency,
      beneficiaryName: bankConfig.getBeneficiaryName(),
      beneficiaryIban: iban,
      swiftCode: bankConfig.getSwiftCode(),
      referenceText: dto.reference,
      ledgerDebitId: ledgerResult.ledgerDebitId,
      createdBy: dto.requestedBy
    });

    // 8. Persistir (dentro de transacción DB idealmente)
    await this.settlementRepo.save(instruction);

    // 9. Crear audit log
    const auditLog = AuditLog.create(
      instruction.getId(),
      AuditActionType.CREATE_INSTRUCTION,
      dto.requestedBy,
      undefined,
      instruction.getStatus().getCode(),
      {
        amount: amount.getValue(),
        currency: currency.getCode(),
        ledgerDebitId: ledgerResult.ledgerDebitId,
        balanceAfter: ledgerResult.balanceAfter
      }
    );

    await this.auditLogRepo.save(auditLog);

    console.log('[CreateSettlement] ✅ Settlement instruction created:', instruction.getDaesReferenceId());

    // 10. Retornar respuesta
    const response: CreateSettlementResponse = {
      id: instruction.getId(),
      daesReferenceId: instruction.getDaesReferenceId(),
      amount: instruction.getAmount().toFixed(2),
      currency: instruction.getCurrency().getCode(),
      beneficiaryName: instruction.getBeneficiaryName(),
      beneficiaryIban: instruction.getBeneficiaryIban().getValue(),
      swiftCode: instruction.getSwiftCode(),
      status: instruction.getStatus().getCode(),
      ledgerDebitId: instruction.getLedgerDebitId(),
      createdBy: instruction.getCreatedBy(),
      createdAt: instruction.getCreatedAt().toISOString()
    };

    return response;
  }

  private generateDaesReferenceId(): string {
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const random = Math.random().toString(36).substring(2, 8).toUpperCase();
    
    return `DAES-SET-${year}${month}${day}-${random}`;
  }
}

