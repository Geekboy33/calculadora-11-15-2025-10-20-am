/**
 * Custody Transfer Handler
 * Maneja transferencias desde custody accounts con sincronización total del sistema
 * Account Ledger + Black Screen + Transaction Events
 */

import { custodyStore, type CustodyAccount } from './custody-store';
import { transactionEventStore } from './transaction-event-store';

export interface TransferRequest {
  fromAccountId: string;
  toDestination: string;
  amount: number;
  currency: string;
  reference?: string;
  description?: string;
  beneficiaryName?: string;
  destinationType: 'external' | 'custody' | 'api';
}

export interface TransferResult {
  success: boolean;
  transferId?: string;
  error?: string;
  newBalance?: number;
  oldBalance?: number;
}

class CustodyTransferHandler {
  /**
   * Ejecutar transferencia desde cuenta custody
   * SINCRONIZA: Account Ledger + Black Screen + Transaction Events
   */
  async executeTransfer(request: TransferRequest): Promise<TransferResult> {
    try {
      const account = custodyStore.getAccountById(request.fromAccountId);
      
      if (!account) {
        return {
          success: false,
          error: 'Cuenta custody no encontrada'
        };
      }

      // Validar fondos disponibles
      if (account.availableBalance < request.amount) {
        return {
          success: false,
          error: `Fondos insuficientes. Disponible: ${account.currency} ${account.availableBalance.toLocaleString()}, Requerido: ${account.currency} ${request.amount.toLocaleString()}`
        };
      }

      // Validar que la moneda coincida
      if (account.currency !== request.currency) {
        return {
          success: false,
          error: `La moneda de la cuenta (${account.currency}) no coincide con la moneda de transferencia (${request.currency})`
        };
      }

      const transferId = `TRF-${Date.now()}-${Math.random().toString(36).substring(2, 9).toUpperCase()}`;
      const oldBalance = account.totalBalance;
      const newTotalBalance = oldBalance - request.amount;

      console.log('[CustodyTransferHandler] 🚀 EJECUTANDO TRANSFERENCIA:');
      console.log(`  Transfer ID: ${transferId}`);
      console.log(`  Cuenta origen: ${account.accountName} (${account.accountNumber})`);
      console.log(`  Destino: ${request.toDestination}`);
      console.log(`  Monto: ${account.currency} ${request.amount.toLocaleString()}`);
      console.log(`  Balance ANTES: ${account.currency} ${oldBalance.toLocaleString()}`);
      console.log(`  Balance DESPUÉS: ${account.currency} ${newTotalBalance.toLocaleString()}`);

      // 1️⃣ ACTUALIZAR CUENTA CUSTODY
      const updateSuccess = custodyStore.updateAccountBalance(
        request.fromAccountId,
        newTotalBalance
      );

      if (!updateSuccess) {
        return {
          success: false,
          error: 'No se pudo actualizar el balance de la cuenta custody'
        };
      }

      console.log('[CustodyTransferHandler] ✅ Cuenta custody actualizada');

      // 2️⃣ DEBITAR DEL BALANCE GLOBAL (Account Ledger + Black Screen)
      await this.debitFromGlobalLedger(request.currency, request.amount, account.accountName);

      // 3️⃣ REGISTRAR EN TRANSACTION EVENTS
      transactionEventStore.recordEvent(
        'TRANSFER_CREATED',
        'CUSTODY_ACCOUNTS',
        `Transferencia desde ${account.accountName} a ${request.toDestination}`,
        {
          amount: request.amount,
          currency: request.currency,
          accountId: request.fromAccountId,
          accountName: account.accountName,
          reference: transferId,
          status: 'COMPLETED',
          metadata: {
            fromAccount: account.accountName,
            fromAccountNumber: account.accountNumber,
            toDestination: request.toDestination,
            beneficiaryName: request.beneficiaryName,
            description: request.description,
            oldBalance: oldBalance,
            newBalance: newTotalBalance,
            destinationType: request.destinationType,
            transferId
          }
        }
      );

      console.log('[CustodyTransferHandler] ✅ Evento registrado en Transaction Events');

      return {
        success: true,
        transferId,
        newBalance: newTotalBalance,
        oldBalance: oldBalance
      };

    } catch (error: any) {
      console.error('[CustodyTransferHandler] ❌ Error ejecutando transferencia:', error);
      return {
        success: false,
        error: error?.message || 'Error desconocido'
      };
    }
  }

  /**
   * Debitar del balance global (Account Ledger + Black Screen)
   */
  private async debitFromGlobalLedger(
    currency: string,
    amount: number,
    accountName: string
  ): Promise<void> {
    try {
      const { balanceStore } = require('./balances-store');
      
      const balanceStoreData = balanceStore.loadBalances();
      if (!balanceStoreData) {
        console.warn('[CustodyTransferHandler] ⚠️ No hay balances en el sistema global');
        return;
      }

      const balanceIndex = balanceStoreData.balances.findIndex((b: any) => b.currency === currency);
      
      if (balanceIndex === -1) {
        console.warn(`[CustodyTransferHandler] ⚠️ No se encontró balance ${currency} en Account Ledger`);
        return;
      }

      const currentBalance = balanceStoreData.balances[balanceIndex];
      const oldAmount = currentBalance.totalAmount;
      
      console.log('[CustodyTransferHandler] 💰 DEBITANDO DE ACCOUNT LEDGER:');
      console.log(`  Divisa: ${currency}`);
      console.log(`  Balance Global ANTES: ${oldAmount.toLocaleString()}`);
      console.log(`  Monto a debitar: ${amount.toLocaleString()}`);
      
      // Debitar del balance global
      currentBalance.totalAmount -= amount;
      currentBalance.balance = currentBalance.totalAmount;
      
      console.log(`  Balance Global DESPUÉS: ${currentBalance.totalAmount.toLocaleString()}`);
      
      // Actualizar balance store
      balanceStoreData.balances[balanceIndex] = currentBalance;
      balanceStore.saveBalances(balanceStoreData);
      
      // 🔥 SINCRONIZAR EN TIEMPO REAL con Account Ledger y Black Screen
      balanceStore.updateBalancesRealTime(
        balanceStoreData.balances,
        balanceStoreData.fileName,
        balanceStoreData.fileSize,
        100
      );
      
      console.log('[CustodyTransferHandler] ✅ Account Ledger actualizado');
      console.log('[CustodyTransferHandler] ✅ Black Screen sincronizado');
      console.log('[CustodyTransferHandler] ✅ Balance global reducido por transferencia');

    } catch (error) {
      console.error('[CustodyTransferHandler] ❌ Error debitando de Account Ledger:', error);
    }
  }

  /**
   * Acreditar en balance global (para transferencias entrantes)
   */
  async creditToGlobalLedger(
    currency: string,
    amount: number,
    accountName: string,
    reference: string
  ): Promise<void> {
    try {
      const { balanceStore } = require('./balances-store');
      
      const balanceStoreData = balanceStore.loadBalances();
      if (!balanceStoreData) {
        console.warn('[CustodyTransferHandler] ⚠️ No hay balances en el sistema global');
        return;
      }

      const balanceIndex = balanceStoreData.balances.findIndex((b: any) => b.currency === currency);
      
      if (balanceIndex === -1) {
        console.warn(`[CustodyTransferHandler] ⚠️ No se encontró balance ${currency} en Account Ledger`);
        return;
      }

      const currentBalance = balanceStoreData.balances[balanceIndex];
      const oldAmount = currentBalance.totalAmount;
      
      console.log('[CustodyTransferHandler] 💰 ACREDITANDO EN ACCOUNT LEDGER:');
      console.log(`  Divisa: ${currency}`);
      console.log(`  Balance Global ANTES: ${oldAmount.toLocaleString()}`);
      console.log(`  Monto a acreditar: ${amount.toLocaleString()}`);
      
      // Acreditar al balance global
      currentBalance.totalAmount += amount;
      currentBalance.balance = currentBalance.totalAmount;
      
      console.log(`  Balance Global DESPUÉS: ${currentBalance.totalAmount.toLocaleString()}`);
      
      // Actualizar balance store
      balanceStoreData.balances[balanceIndex] = currentBalance;
      balanceStore.saveBalances(balanceStoreData);
      
      // 🔥 SINCRONIZAR EN TIEMPO REAL
      balanceStore.updateBalancesRealTime(
        balanceStoreData.balances,
        balanceStoreData.fileName,
        balanceStoreData.fileSize,
        100
      );
      
      console.log('[CustodyTransferHandler] ✅ Account Ledger actualizado');
      console.log('[CustodyTransferHandler] ✅ Black Screen sincronizado');

      // Registrar evento de transferencia completada
      transactionEventStore.recordEvent(
        'TRANSFER_COMPLETED',
        'CUSTODY_ACCOUNTS',
        `Transferencia recibida en ${accountName}`,
        {
          amount,
          currency,
          accountName,
          reference,
          status: 'COMPLETED',
          metadata: {
            oldBalance: oldAmount,
            newBalance: currentBalance.totalAmount,
            operation: 'CREDIT'
          }
        }
      );

    } catch (error) {
      console.error('[CustodyTransferHandler] ❌ Error acreditando en Account Ledger:', error);
    }
  }

  /**
   * Verificar saldo disponible antes de transferir
   */
  canTransfer(fromAccountId: string, amount: number): {
    allowed: boolean;
    reason?: string;
    availableBalance?: number;
  } {
    const account = custodyStore.getAccountById(fromAccountId);
    
    if (!account) {
      return {
        allowed: false,
        reason: 'Cuenta no encontrada'
      };
    }

    if (account.availableBalance < amount) {
      return {
        allowed: false,
        reason: `Fondos insuficientes. Disponible: ${account.currency} ${account.availableBalance.toLocaleString()}`,
        availableBalance: account.availableBalance
      };
    }

    return {
      allowed: true,
      availableBalance: account.availableBalance
    };
  }
}

export const custodyTransferHandler = new CustodyTransferHandler();

