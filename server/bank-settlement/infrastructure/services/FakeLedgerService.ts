/**
 * Fake Ledger Service - Para testing y desarrollo
 */

import { ILedgerService, LedgerDebitResult, LedgerCreditResult } from '../../application/interfaces/ILedgerService';

export class FakeLedgerService implements ILedgerService {
  private balances: Map<string, number> = new Map([
    ['AED', 10000000],
    ['USD', 5000000],
    ['EUR', 3000000]
  ]);

  async debitTreasuryAccount(
    currency: string,
    amount: number,
    reference: string,
    requestedBy: string
  ): Promise<LedgerDebitResult> {
    const currentBalance = this.balances.get(currency) || 0;

    if (currentBalance < amount) {
      return {
        success: false,
        error: `Insufficient funds. Available: ${currentBalance}, Requested: ${amount}`
      };
    }

    this.balances.set(currency, currentBalance - amount);

    const ledgerDebitId = `LEDGER-DEB-${Date.now()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;

    console.log(`[FakeLedgerService] ✅ Debit: ${currency} ${amount} | Balance: ${currentBalance} → ${currentBalance - amount}`);

    return {
      success: true,
      ledgerDebitId,
      balanceAfter: currentBalance - amount
    };
  }

  async creditTreasuryAccount(
    currency: string,
    amount: number,
    reference: string,
    requestedBy: string
  ): Promise<LedgerCreditResult> {
    const currentBalance = this.balances.get(currency) || 0;
    this.balances.set(currency, currentBalance + amount);

    const ledgerCreditId = `LEDGER-CRE-${Date.now()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;

    console.log(`[FakeLedgerService] ✅ Credit: ${currency} ${amount} | Balance: ${currentBalance} → ${currentBalance + amount}`);

    return {
      success: true,
      ledgerCreditId,
      balanceAfter: currentBalance + amount
    };
  }

  async getAvailableBalance(currency: string): Promise<number> {
    return this.balances.get(currency) || 0;
  }

  // Helper para testing
  resetBalances(): void {
    this.balances = new Map([
      ['AED', 10000000],
      ['USD', 5000000],
      ['EUR', 3000000]
    ]);
  }

  setBalance(currency: string, amount: number): void {
    this.balances.set(currency, amount);
  }

  getAllBalances(): Map<string, number> {
    return new Map(this.balances);
  }
}

