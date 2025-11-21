/**
 * Ledger Service Interface
 * Contrato para integración con el ledger interno de DAES
 */

export interface LedgerDebitResult {
  success: boolean;
  ledgerDebitId?: string;
  error?: string;
  balanceAfter?: number;
}

export interface LedgerCreditResult {
  success: boolean;
  ledgerCreditId?: string;
  error?: string;
  balanceAfter?: number;
}

export interface ILedgerService {
  /**
   * Debitar cuenta de tesorería DAES
   * @returns ledgerDebitId si exitoso
   */
  debitTreasuryAccount(
    currency: string,
    amount: number,
    reference: string,
    requestedBy: string
  ): Promise<LedgerDebitResult>;

  /**
   * Acreditar cuenta de tesorería DAES
   * (para reversiones o fondos entrantes)
   */
  creditTreasuryAccount(
    currency: string,
    amount: number,
    reference: string,
    requestedBy: string
  ): Promise<LedgerCreditResult>;

  /**
   * Verificar saldo disponible
   */
  getAvailableBalance(currency: string): Promise<number>;
}

