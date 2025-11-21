/**
 * DAES Ledger Service - Implementación real
 * Integra con balanceStore y custody-transfer-handler del sistema DAES
 */

import { ILedgerService, LedgerDebitResult, LedgerCreditResult } from '../../application/interfaces/ILedgerService';

export class DAESLedgerService implements ILedgerService {
  async debitTreasuryAccount(
    currency: string,
    amount: number,
    reference: string,
    requestedBy: string
  ): Promise<LedgerDebitResult> {
    try {
      console.log('[DAESLedgerService] 💰 Debitando cuenta de tesorería DAES');
      console.log(`  Currency: ${currency}`);
      console.log(`  Amount: ${amount.toLocaleString()}`);
      console.log(`  Reference: ${reference}`);
      console.log(`  Requested by: ${requestedBy}`);

      // Importar dinámicamente para evitar dependencias circulares
      // En producción, esto se conectaría a balanceStore
      const { balanceStore } = require('../../../src/lib/balances-store');
      
      const balanceStoreData = balanceStore.loadBalances();
      if (!balanceStoreData) {
        return {
          success: false,
          error: 'Balance store not initialized'
        };
      }

      const balanceIndex = balanceStoreData.balances.findIndex((b: any) => b.currency === currency);
      
      if (balanceIndex === -1) {
        return {
          success: false,
          error: `No balance found for currency ${currency} in DAES treasury`
        };
      }

      const currentBalance = balanceStoreData.balances[balanceIndex];
      
      // Verificar fondos suficientes
      if (currentBalance.totalAmount < amount) {
        return {
          success: false,
          error: `Insufficient funds. Available: ${currentBalance.totalAmount.toFixed(2)}, Requested: ${amount.toFixed(2)}`
        };
      }

      const oldAmount = currentBalance.totalAmount;
      
      // Debitar
      currentBalance.totalAmount -= amount;
      currentBalance.balance = currentBalance.totalAmount;
      
      // Actualizar balance store
      balanceStoreData.balances[balanceIndex] = currentBalance;
      balanceStore.saveBalances(balanceStoreData);
      
      // Sincronizar con Account Ledger y Black Screen
      balanceStore.updateBalancesRealTime(
        balanceStoreData.balances,
        balanceStoreData.fileName,
        balanceStoreData.fileSize,
        100
      );

      // Generar ledger debit ID
      const ledgerDebitId = `LEDGER-DEB-${new Date().toISOString().split('T')[0].replace(/-/g, '')}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;

      console.log('[DAESLedgerService] ✅ Débito exitoso');
      console.log(`  Ledger Debit ID: ${ledgerDebitId}`);
      console.log(`  Balance anterior: ${oldAmount.toLocaleString()}`);
      console.log(`  Balance después: ${currentBalance.totalAmount.toLocaleString()}`);
      console.log('  ✅ Sincronizado con Account Ledger y Black Screen');

      // Registrar en Transaction Events
      const { transactionEventStore } = require('../../../src/lib/transaction-event-store');
      transactionEventStore.recordEvent(
        'BALANCE_DECREASE',
        'SYSTEM',
        `Débito para bank settlement: ${reference}`,
        {
          amount,
          currency,
          reference: ledgerDebitId,
          status: 'COMPLETED',
          metadata: {
            fromBalance: oldAmount,
            toBalance: currentBalance.totalAmount,
            operation: 'BANK_SETTLEMENT_DEBIT',
            daesReferenceId: reference
          }
        }
      );

      return {
        success: true,
        ledgerDebitId,
        balanceAfter: currentBalance.totalAmount
      };

    } catch (error: any) {
      console.error('[DAESLedgerService] ❌ Error debitando:', error);
      return {
        success: false,
        error: error.message || 'Unknown error'
      };
    }
  }

  async creditTreasuryAccount(
    currency: string,
    amount: number,
    reference: string,
    requestedBy: string
  ): Promise<LedgerCreditResult> {
    try {
      console.log('[DAESLedgerService] 💰 Acreditando cuenta de tesorería DAES');
      
      const { balanceStore } = require('../../../src/lib/balances-store');
      
      const balanceStoreData = balanceStore.loadBalances();
      if (!balanceStoreData) {
        return {
          success: false,
          error: 'Balance store not initialized'
        };
      }

      const balanceIndex = balanceStoreData.balances.findIndex((b: any) => b.currency === currency);
      
      if (balanceIndex === -1) {
        return {
          success: false,
          error: `No balance found for currency ${currency}`
        };
      }

      const currentBalance = balanceStoreData.balances[balanceIndex];
      const oldAmount = currentBalance.totalAmount;
      
      // Acreditar
      currentBalance.totalAmount += amount;
      currentBalance.balance = currentBalance.totalAmount;
      
      // Actualizar
      balanceStoreData.balances[balanceIndex] = currentBalance;
      balanceStore.saveBalances(balanceStoreData);
      
      // Sincronizar
      balanceStore.updateBalancesRealTime(
        balanceStoreData.balances,
        balanceStoreData.fileName,
        balanceStoreData.fileSize,
        100
      );

      const ledgerCreditId = `LEDGER-CRE-${new Date().toISOString().split('T')[0].replace(/-/g, '')}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;

      console.log('[DAESLedgerService] ✅ Crédito exitoso:', ledgerCreditId);

      // Registrar evento
      const { transactionEventStore } = require('../../../src/lib/transaction-event-store');
      transactionEventStore.recordEvent(
        'BALANCE_INCREASE',
        'SYSTEM',
        `Crédito para bank settlement: ${reference}`,
        {
          amount,
          currency,
          reference: ledgerCreditId,
          status: 'COMPLETED',
          metadata: {
            fromBalance: oldAmount,
            toBalance: currentBalance.totalAmount,
            operation: 'BANK_SETTLEMENT_CREDIT'
          }
        }
      );

      return {
        success: true,
        ledgerCreditId,
        balanceAfter: currentBalance.totalAmount
      };

    } catch (error: any) {
      console.error('[DAESLedgerService] ❌ Error acreditando:', error);
      return {
        success: false,
        error: error.message || 'Unknown error'
      };
    }
  }

  async getAvailableBalance(currency: string): Promise<number> {
    try {
      const { balanceStore } = require('../../../src/lib/balances-store');
      const balanceStoreData = balanceStore.loadBalances();
      
      if (!balanceStoreData) {
        return 0;
      }

      const balance = balanceStoreData.balances.find((b: any) => b.currency === currency);
      return balance?.totalAmount || 0;

    } catch (error) {
      console.error('[DAESLedgerService] ❌ Error obteniendo balance:', error);
      return 0;
    }
  }
}

