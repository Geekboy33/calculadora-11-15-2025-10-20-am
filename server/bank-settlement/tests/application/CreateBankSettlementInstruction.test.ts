/**
 * Tests: CreateBankSettlementInstruction Use Case
 */

import { CreateBankSettlementInstruction } from '../../application/use-cases/CreateBankSettlementInstruction';
import { InMemorySettlementRepository } from '../../infrastructure/database/repositories/InMemorySettlementRepository';
import { InMemoryAuditLogRepository } from '../../infrastructure/database/repositories/InMemoryAuditLogRepository';
import { InMemoryBankConfigRepository } from '../../infrastructure/database/repositories/InMemoryBankConfigRepository';
import { FakeLedgerService } from '../../infrastructure/services/FakeLedgerService';
import { UnsupportedCurrencyError, LedgerDebitFailedError } from '../../domain/errors/DomainError';

describe('CreateBankSettlementInstruction Use Case', () => {
  let useCase: CreateBankSettlementInstruction;
  let settlementRepo: InMemorySettlementRepository;
  let auditLogRepo: InMemoryAuditLogRepository;
  let bankConfigRepo: InMemoryBankConfigRepository;
  let ledgerService: FakeLedgerService;

  beforeEach(() => {
    settlementRepo = new InMemorySettlementRepository();
    auditLogRepo = new InMemoryAuditLogRepository();
    bankConfigRepo = new InMemoryBankConfigRepository();
    ledgerService = new FakeLedgerService();

    useCase = new CreateBankSettlementInstruction(
      settlementRepo,
      auditLogRepo,
      bankConfigRepo,
      ledgerService
    );
  });

  it('should create settlement instruction successfully', async () => {
    const dto = {
      amount: 1000000,
      currency: 'USD',
      reference: 'Test monthly settlement',
      requestedBy: 'user_treasury_001'
    };

    const result = await useCase.execute(dto);

    expect(result.amount).toBe('1000000.00');
    expect(result.currency).toBe('USD');
    expect(result.beneficiaryName).toBe('TRADEMORE VALUE CAPITAL FZE');
    expect(result.beneficiaryIban).toBe('AE690260001025381452402');
    expect(result.swiftCode).toBe('EBILAEADXXX');
    expect(result.status).toBe('PENDING');
    expect(result.ledgerDebitId).toBeDefined();
    expect(result.daesReferenceId).toMatch(/^DAES-SET-\d{8}-[A-Z0-9]+$/);

    // Verificar que se guardó
    const saved = await settlementRepo.findById(result.id);
    expect(saved).not.toBeNull();
    expect(saved?.getAmount().getValue()).toBe(1000000);

    // Verificar audit log
    const logs = await auditLogRepo.findBySettlementId(result.id);
    expect(logs.length).toBe(1);
    expect(logs[0].getActionType()).toBe('CREATE_INSTRUCTION');
  });

  it('should reject unsupported currency', async () => {
    const dto = {
      amount: 500000,
      currency: 'GBP', // No soportado
      reference: 'Test',
      requestedBy: 'user_test'
    };

    await expect(useCase.execute(dto)).rejects.toThrow(UnsupportedCurrencyError);
  });

  it('should reject if ledger debit fails', async () => {
    // Configurar ledger para fallar (balance insuficiente)
    ledgerService.setBalance('USD', 100); // Menos de lo que se solicita

    const dto = {
      amount: 1000000,
      currency: 'USD',
      reference: 'Test',
      requestedBy: 'user_test'
    };

    await expect(useCase.execute(dto)).rejects.toThrow(LedgerDebitFailedError);
  });

  it('should select correct IBAN for each currency', async () => {
    const currencies = [
      { code: 'AED', iban: 'AE610260001015381452401' },
      { code: 'USD', iban: 'AE690260001025381452402' },
      { code: 'EUR', iban: 'AE420260001025381452403' }
    ];

    for (const { code, iban } of currencies) {
      const result = await useCase.execute({
        amount: 100000,
        currency: code,
        requestedBy: 'user_test'
      });

      expect(result.beneficiaryIban).toBe(iban);
      expect(result.currency).toBe(code);
    }
  });
});

