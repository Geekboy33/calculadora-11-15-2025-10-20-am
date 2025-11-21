/**
 * Tests: BankSettlementInstruction Domain Entity
 */

import { BankSettlementInstruction } from '../../domain/entities/BankSettlementInstruction';
import { Amount } from '../../domain/value-objects/Amount';
import { Currency } from '../../domain/value-objects/Currency';
import { IBAN } from '../../domain/value-objects/IBAN';
import { SettlementStatus } from '../../domain/value-objects/SettlementStatus';
import { InvalidStatusTransitionError } from '../../domain/errors/DomainError';

describe('BankSettlementInstruction', () => {
  describe('create', () => {
    it('should create a new settlement with PENDING status', () => {
      const instruction = BankSettlementInstruction.create({
        id: crypto.randomUUID(),
        daesReferenceId: 'DAES-SET-20251121-TEST01',
        bankCode: 'ENBD',
        amount: Amount.create(1000000),
        currency: Currency.create('USD'),
        beneficiaryName: 'TRADEMORE VALUE CAPITAL FZE',
        beneficiaryIban: IBAN.create('AE690260001025381452402'),
        swiftCode: 'EBILAEADXXX',
        referenceText: 'Test settlement',
        ledgerDebitId: 'LEDGER-DEB-123',
        createdBy: 'user_test'
      });

      expect(instruction.getStatus().isPending()).toBe(true);
      expect(instruction.getAmount().getValue()).toBe(1000000);
      expect(instruction.getCurrency().getCode()).toBe('USD');
    });
  });

  describe('status transitions', () => {
    let instruction: BankSettlementInstruction;

    beforeEach(() => {
      instruction = BankSettlementInstruction.create({
        id: crypto.randomUUID(),
        daesReferenceId: 'DAES-SET-20251121-TEST02',
        bankCode: 'ENBD',
        amount: Amount.create(500000),
        currency: Currency.create('EUR'),
        beneficiaryName: 'TRADEMORE VALUE CAPITAL FZE',
        beneficiaryIban: IBAN.create('AE420260001025381452403'),
        swiftCode: 'EBILAEADXXX',
        ledgerDebitId: 'LEDGER-DEB-456',
        createdBy: 'user_test'
      });
    });

    it('should allow PENDING → COMPLETED', () => {
      instruction.markAsCompleted('manager_test', 'ENBD-TXN-123');
      
      expect(instruction.getStatus().isCompleted()).toBe(true);
      expect(instruction.getEnbdTransactionReference()).toBe('ENBD-TXN-123');
      expect(instruction.getExecutedBy()).toBe('manager_test');
    });

    it('should allow PENDING → SENT → COMPLETED', () => {
      instruction.markAsSent('operator_test');
      expect(instruction.getStatus().isSent()).toBe(true);

      instruction.markAsCompleted('manager_test', 'ENBD-TXN-456');
      expect(instruction.getStatus().isCompleted()).toBe(true);
    });

    it('should allow PENDING → FAILED', () => {
      instruction.markAsFailed('manager_test', 'ENBD API timeout');
      
      expect(instruction.getStatus().isFailed()).toBe(true);
      expect(instruction.getFailureReason()).toBe('ENBD API timeout');
    });

    it('should NOT allow COMPLETED → PENDING', () => {
      instruction.markAsCompleted('manager_test', 'ENBD-TXN-789');

      expect(() => {
        instruction.confirm({
          newStatus: SettlementStatus.pending(),
          executedBy: 'user_test'
        });
      }).toThrow(InvalidStatusTransitionError);
    });

    it('should NOT allow COMPLETED → FAILED', () => {
      instruction.markAsCompleted('manager_test', 'ENBD-TXN-999');

      expect(() => {
        instruction.markAsFailed('user_test', 'Test');
      }).toThrow(InvalidStatusTransitionError);
    });
  });

  describe('toPaymentOrder', () => {
    it('should generate payment order payload', () => {
      const instruction = BankSettlementInstruction.create({
        id: crypto.randomUUID(),
        daesReferenceId: 'DAES-SET-20251121-TEST03',
        bankCode: 'ENBD',
        amount: Amount.create(750000),
        currency: Currency.create('AED'),
        beneficiaryName: 'TRADEMORE VALUE CAPITAL FZE',
        beneficiaryIban: IBAN.create('AE610260001015381452401'),
        swiftCode: 'EBILAEADXXX',
        referenceText: 'Weekly settlement',
        ledgerDebitId: 'LEDGER-DEB-789',
        createdBy: 'user_test'
      });

      const paymentOrder = instruction.toPaymentOrder();

      expect(paymentOrder.bankName).toBe('EMIRATES NBD');
      expect(paymentOrder.amount).toBe('750000.00');
      expect(paymentOrder.currency).toBe('AED');
      expect(paymentOrder.beneficiaryIban).toBe('AE610260001015381452401');
      expect(paymentOrder.swiftCode).toBe('EBILAEADXXX');
      expect(paymentOrder.daesReferenceId).toBe('DAES-SET-20251121-TEST03');
      expect(paymentOrder.status).toBe('PENDING');
    });
  });
});

