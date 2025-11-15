/**
 * Unified Pledge Store
 * Centraliza la gestión de pledges entre API VUSD y API VUSD1
 * Previene duplicación de balance y sincroniza automáticamente
 */

import { custodyStore } from './custody-store';
import { apiVUSD1Store } from './api-vusd1-store';

export interface UnifiedPledge {
  id: string;
  custody_account_id: string;
  amount: number;
  currency: string;
  beneficiary: string;
  status: 'ACTIVE' | 'EXPIRED' | 'RELEASED';
  created_at: string;
  expires_at?: string;
  external_ref?: string;
  // Metadata
  account_name: string;
  account_number: string;
  // Tracking
  source_module: 'API_VUSD' | 'API_VUSD1';
  vusd_pledge_id?: string;  // ID en API VUSD
  vusd1_pledge_id?: string; // ID en API VUSD1
  // Blockchain data
  blockchain_network?: string;
  contract_address?: string;
  anchored_coins?: number;
  token_symbol?: string;
}

class UnifiedPledgeStore {
  private readonly STORAGE_KEY = 'unified_pledges';
  private listeners: Set<(pledges: UnifiedPledge[]) => void> = new Set();

  /**
   * Get all pledges
   */
  getPledges(): UnifiedPledge[] {
    try {
      const data = localStorage.getItem(this.STORAGE_KEY);
      return data ? JSON.parse(data) : [];
    } catch (error) {
      console.error('[UnifiedPledgeStore] Error loading pledges:', error);
      return [];
    }
  }

  /**
   * Get active pledges for a custody account
   */
  getActivePledgesByCustodyAccount(custodyAccountId: string): UnifiedPledge[] {
    const pledges = this.getPledges();
    return pledges.filter(
      p => p.custody_account_id === custodyAccountId && p.status === 'ACTIVE'
    );
  }

  /**
   * Get total pledged amount for a custody account
   */
  getTotalPledgedAmount(custodyAccountId: string): number {
    const activePledges = this.getActivePledgesByCustodyAccount(custodyAccountId);
    return activePledges.reduce((sum, pledge) => sum + pledge.amount, 0);
  }

  /**
   * Check if custody account has available balance for new pledge
   */
  canCreatePledge(custodyAccountId: string, requestedAmount: number): {
    allowed: boolean;
    reason?: string;
    availableBalance?: number;
    totalPledged?: number;
  } {
    const account = custodyStore.getAccountById(custodyAccountId);

    if (!account) {
      return {
        allowed: false,
        reason: 'Custody account not found'
      };
    }

    const totalPledged = this.getTotalPledgedAmount(custodyAccountId);
    const availableForPledge = account.totalBalance - totalPledged;

    console.log('[UnifiedPledgeStore] Can create pledge check:', {
      accountId: custodyAccountId,
      totalBalance: account.totalBalance,
      totalPledged,
      availableForPledge,
      requestedAmount
    });

    if (requestedAmount > availableForPledge) {
      return {
        allowed: false,
        reason: `Insufficient balance. Available: ${availableForPledge.toFixed(2)}, Requested: ${requestedAmount.toFixed(2)}`,
        availableBalance: availableForPledge,
        totalPledged
      };
    }

    return {
      allowed: true,
      availableBalance: availableForPledge,
      totalPledged
    };
  }

  /**
   * Create a new unified pledge
   */
  async createPledge(params: {
    custody_account_id: string;
    amount: number;
    currency: string;
    beneficiary: string;
    source_module: 'API_VUSD' | 'API_VUSD1';
    external_ref?: string;
    expires_at?: string;
    blockchain_network?: string;
    contract_address?: string;
    token_symbol?: string;
  }): Promise<UnifiedPledge> {
    // Validate balance
    const validation = this.canCreatePledge(params.custody_account_id, params.amount);

    if (!validation.allowed) {
      throw new Error(validation.reason || 'Cannot create pledge');
    }

    // Get custody account details
    const account = custodyStore.getAccountById(params.custody_account_id);
    if (!account) {
      throw new Error('Custody account not found');
    }

    // Create unified pledge
    const pledge: UnifiedPledge = {
      id: `PLEDGE_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      custody_account_id: params.custody_account_id,
      amount: params.amount,
      currency: params.currency,
      beneficiary: params.beneficiary,
      status: 'ACTIVE',
      created_at: new Date().toISOString(),
      expires_at: params.expires_at,
      external_ref: params.external_ref,
      account_name: account.accountName,
      account_number: account.accountNumber || '',
      source_module: params.source_module,
      blockchain_network: params.blockchain_network || account.blockchainLink,
      contract_address: params.contract_address || account.contractAddress,
      token_symbol: params.token_symbol || account.tokenSymbol,
      anchored_coins: params.amount
    };

    // Save to storage
    const pledges = this.getPledges();
    pledges.push(pledge);
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(pledges));

    console.log('[UnifiedPledgeStore] ✅ Pledge created:', pledge);

    // Update custody account reserved balance
    this.updateCustodyAccountBalance(params.custody_account_id);

    // Notify listeners
    this.notifyListeners();

    return pledge;
  }

  /**
   * Link pledge with API VUSD1
   */
  linkVUSD1Pledge(unifiedPledgeId: string, vusd1PledgeId: string): void {
    const pledges = this.getPledges();
    const pledge = pledges.find(p => p.id === unifiedPledgeId);

    if (pledge) {
      pledge.vusd1_pledge_id = vusd1PledgeId;
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(pledges));
      console.log('[UnifiedPledgeStore] Linked VUSD1 pledge:', vusd1PledgeId);
      this.notifyListeners();
    }
  }

  /**
   * Update custody account balance based on active pledges
   */
  private updateCustodyAccountBalance(custodyAccountId: string): void {
    const totalPledged = this.getTotalPledgedAmount(custodyAccountId);
    const accounts = custodyStore.getAccounts();
    const account = accounts.find(a => a.id === custodyAccountId);

    if (account) {
      account.reservedBalance = totalPledged;
      account.availableBalance = account.totalBalance - totalPledged;

      // IMPORTANTE: Guardar cambios en localStorage
      custodyStore.saveAccounts(accounts);

      console.log('[UnifiedPledgeStore] ✅ Updated and SAVED account balance:', {
        accountId: custodyAccountId,
        accountName: account.accountName,
        totalBalance: account.totalBalance,
        reservedBalance: account.reservedBalance,
        availableBalance: account.availableBalance,
        totalActivePledges: this.getActivePledgesByCustodyAccount(custodyAccountId).length
      });
    }
  }

  /**
   * Release a pledge
   */
  releasePledge(pledgeId: string): void {
    const pledges = this.getPledges();
    const pledge = pledges.find(p => p.id === pledgeId);

    if (pledge && pledge.status === 'ACTIVE') {
      pledge.status = 'RELEASED';
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(pledges));

      // Update custody account balance
      this.updateCustodyAccountBalance(pledge.custody_account_id);

      console.log('[UnifiedPledgeStore] ✅ Pledge released:', pledgeId);
      this.notifyListeners();
    }
  }

  /**
   * Get pledge by ID
   */
  getPledgeById(pledgeId: string): UnifiedPledge | null {
    const pledges = this.getPledges();
    return pledges.find(p => p.id === pledgeId) || null;
  }

  /**
   * Subscribe to pledge changes
   */
  subscribe(listener: (pledges: UnifiedPledge[]) => void): () => void {
    this.listeners.add(listener);
    listener(this.getPledges());

    return () => {
      this.listeners.delete(listener);
    };
  }

  /**
   * Notify all listeners
   */
  private notifyListeners(): void {
    const pledges = this.getPledges();
    this.listeners.forEach(listener => {
      try {
        listener(pledges);
      } catch (error) {
        console.error('[UnifiedPledgeStore] Error in listener:', error);
      }
    });
  }

  /**
   * Clear all pledges (for testing)
   */
  clearPledges(): void {
    localStorage.removeItem(this.STORAGE_KEY);
    this.notifyListeners();
  }

  /**
   * Recalculate ALL custody account balances based on active pledges
   * Call this on app initialization to ensure consistency
   */
  recalculateAllBalances(): void {
    console.log('[UnifiedPledgeStore] 🔄 Recalculating all custody account balances...');

    const accounts = custodyStore.getAccounts();
    const pledges = this.getPledges();

    // Group pledges by custody account
    const pledgesByAccount = new Map<string, number>();

    pledges.forEach(pledge => {
      if (pledge.status === 'ACTIVE') {
        const current = pledgesByAccount.get(pledge.custody_account_id) || 0;
        pledgesByAccount.set(pledge.custody_account_id, current + pledge.amount);
      }
    });

    // Update all accounts
    accounts.forEach(account => {
      const totalPledged = pledgesByAccount.get(account.id) || 0;
      account.reservedBalance = totalPledged;
      account.availableBalance = account.totalBalance - totalPledged;

      console.log('[UnifiedPledgeStore] Account recalculated:', {
        account: account.accountName,
        totalBalance: account.totalBalance,
        reservedBalance: account.reservedBalance,
        availableBalance: account.availableBalance
      });
    });

    // Save all changes
    custodyStore.saveAccounts(accounts);

    console.log('[UnifiedPledgeStore] ✅ All balances recalculated and saved');
  }
}

export const unifiedPledgeStore = new UnifiedPledgeStore();
