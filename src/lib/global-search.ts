/**
 * Global Search - Búsqueda Inteligente en Todo el Sistema
 * Búsqueda fuzzy con ranking por relevancia
 */

import { balanceStore } from './balances-store';
import { custodyStore } from './custody-store';

export type SearchResultType = 'account' | 'transaction' | 'iban' | 'swift' | 'amount' | 'currency' | 'custody';

export interface SearchResult {
  id: string;
  type: SearchResultType;
  title: string;
  subtitle: string;
  data: any;
  relevance: number;
  highlight: string;
  module: string;
  action?: () => void;
}

class GlobalSearch {
  private searchHistory: string[] = [];
  private readonly MAX_HISTORY = 20;

  constructor() {
    this.loadHistory();
  }

  /**
   * Search across all modules
   */
  async search(query: string): Promise<SearchResult[]> {
    if (!query || query.length < 2) return [];

    const normalizedQuery = query.toLowerCase().trim();

    // Add to history
    this.addToHistory(query);

    const results: SearchResult[] = [];

    // Search in balances
    results.push(...this.searchBalances(normalizedQuery));

    // Search in custody accounts
    results.push(...this.searchCustodyAccounts(normalizedQuery));

    // Search IBANs/SWIFT codes
    results.push(...this.searchBankingCodes(normalizedQuery));

    // Sort by relevance
    results.sort((a, b) => b.relevance - a.relevance);

    return results.slice(0, 50); // Return top 50
  }

  /**
   * Search in balances
   */
  private searchBalances(query: string): SearchResult[] {
    const results: SearchResult[] = [];
    const balances = balanceStore.getBalances();

    balances.forEach(balance => {
      // Search by currency
      if (balance.currency.toLowerCase().includes(query)) {
        results.push({
          id: `balance-${balance.currency}`,
          type: 'currency',
          title: balance.currency,
          subtitle: `Balance: ${balance.totalAmount.toLocaleString()} - ${balance.transactionCount} transacciones`,
          data: balance,
          relevance: this.calculateRelevance(balance.currency, query) + 10,
          highlight: balance.currency,
          module: 'ledger'
        });
      }

      // Search by account name
      if (balance.accountName.toLowerCase().includes(query)) {
        results.push({
          id: `account-${balance.accountName}`,
          type: 'account',
          title: balance.accountName,
          subtitle: `${balance.currency} - ${balance.totalAmount.toLocaleString()}`,
          data: balance,
          relevance: this.calculateRelevance(balance.accountName, query) + 5,
          highlight: balance.accountName,
          module: 'ledger'
        });
      }

      // Search by amount
      const amountStr = balance.totalAmount.toString();
      if (amountStr.includes(query.replace(/,/g, ''))) {
        results.push({
          id: `amount-${balance.currency}-${balance.totalAmount}`,
          type: 'amount',
          title: `${balance.currency} ${balance.totalAmount.toLocaleString()}`,
          subtitle: balance.accountName,
          data: balance,
          relevance: this.calculateRelevance(amountStr, query),
          highlight: balance.totalAmount.toLocaleString(),
          module: 'ledger'
        });
      }
    });

    return results;
  }

  /**
   * Search in custody accounts
   */
  private searchCustodyAccounts(query: string): SearchResult[] {
    const results: SearchResult[] = [];
    const accounts = custodyStore.getAccounts();

    accounts.forEach(account => {
      // Search by account name
      if (account.accountName.toLowerCase().includes(query)) {
        results.push({
          id: `custody-${account.id}`,
          type: 'custody',
          title: account.accountName,
          subtitle: `${account.currency} - Balance: ${account.totalBalance.toLocaleString()}`,
          data: account,
          relevance: this.calculateRelevance(account.accountName, query) + 8,
          highlight: account.accountName,
          module: 'custody'
        });
      }

      // Search by currency
      if (account.currency.toLowerCase().includes(query)) {
        results.push({
          id: `custody-currency-${account.id}`,
          type: 'custody',
          title: `${account.accountName} (${account.currency})`,
          subtitle: `Balance: ${account.totalBalance.toLocaleString()}`,
          data: account,
          relevance: this.calculateRelevance(account.currency, query) + 6,
          highlight: account.currency,
          module: 'custody'
        });
      }

      // Search by IBAN
      if (account.iban && account.iban.toLowerCase().includes(query)) {
        results.push({
          id: `custody-iban-${account.id}`,
          type: 'iban',
          title: account.iban,
          subtitle: account.accountName,
          data: account,
          relevance: this.calculateRelevance(account.iban, query) + 12,
          highlight: account.iban,
          module: 'custody'
        });
      }

      // Search by SWIFT
      if (account.swiftCode && account.swiftCode.toLowerCase().includes(query)) {
        results.push({
          id: `custody-swift-${account.id}`,
          type: 'swift',
          title: account.swiftCode,
          subtitle: account.accountName,
          data: account,
          relevance: this.calculateRelevance(account.swiftCode, query) + 12,
          highlight: account.swiftCode,
          module: 'custody'
        });
      }

      // Search by API ID
      if (account.apiId && account.apiId.toLowerCase().includes(query)) {
        results.push({
          id: `custody-api-${account.id}`,
          type: 'custody',
          title: `API: ${account.apiId}`,
          subtitle: account.accountName,
          data: account,
          relevance: this.calculateRelevance(account.apiId, query) + 7,
          highlight: account.apiId,
          module: 'custody'
        });
      }
    });

    return results;
  }

  /**
   * Search banking codes (IBAN/SWIFT) in localStorage
   */
  private searchBankingCodes(query: string): SearchResult[] {
    const results: SearchResult[] = [];

    // This would search in audit data or other sources
    // For now, returning empty as it depends on other modules

    return results;
  }

  /**
   * Calculate relevance score using fuzzy matching
   */
  private calculateRelevance(text: string, query: string): number {
    const normalizedText = text.toLowerCase();
    const normalizedQuery = query.toLowerCase();

    // Exact match
    if (normalizedText === normalizedQuery) return 100;

    // Starts with query
    if (normalizedText.startsWith(normalizedQuery)) return 90;

    // Contains query
    if (normalizedText.includes(normalizedQuery)) return 70;

    // Fuzzy match
    let score = 0;
    let queryIndex = 0;

    for (let i = 0; i < normalizedText.length && queryIndex < normalizedQuery.length; i++) {
      if (normalizedText[i] === normalizedQuery[queryIndex]) {
        score += 2;
        queryIndex++;
      }
    }

    // Bonus for matching all characters
    if (queryIndex === normalizedQuery.length) {
      score += 30;
    }

    return Math.min(score, 100);
  }

  /**
   * Get search suggestions
   */
  getSuggestions(query: string): string[] {
    if (!query || query.length < 1) {
      return this.searchHistory.slice(0, 5);
    }

    const normalizedQuery = query.toLowerCase();

    // Common search terms
    const commonTerms = [
      'USD', 'EUR', 'GBP', 'CHF', 'JPY', 'CNY',
      'Balance', 'Transaction', 'IBAN', 'SWIFT',
      'Custody', 'Account', 'Transfer', 'Audit'
    ];

    return commonTerms
      .filter(term => term.toLowerCase().includes(normalizedQuery))
      .slice(0, 5);
  }

  /**
   * Add to search history
   */
  private addToHistory(query: string): void {
    // Remove if already exists
    this.searchHistory = this.searchHistory.filter(q => q !== query);

    // Add to beginning
    this.searchHistory.unshift(query);

    // Limit history size
    if (this.searchHistory.length > this.MAX_HISTORY) {
      this.searchHistory = this.searchHistory.slice(0, this.MAX_HISTORY);
    }

    this.saveHistory();
  }

  /**
   * Get search history
   */
  getHistory(): string[] {
    return this.searchHistory;
  }

  /**
   * Clear search history
   */
  clearHistory(): void {
    this.searchHistory = [];
    this.saveHistory();
  }

  /**
   * Save history to localStorage
   */
  private saveHistory(): void {
    try {
      localStorage.setItem('search_history', JSON.stringify(this.searchHistory));
    } catch (error) {
      console.error('[GlobalSearch] Error saving history:', error);
    }
  }

  /**
   * Load history from localStorage
   */
  private loadHistory(): void {
    try {
      const stored = localStorage.getItem('search_history');
      if (stored) {
        this.searchHistory = JSON.parse(stored);
      }
    } catch (error) {
      console.error('[GlobalSearch] Error loading history:', error);
    }
  }
}

// Export singleton instance
export const globalSearch = new GlobalSearch();
