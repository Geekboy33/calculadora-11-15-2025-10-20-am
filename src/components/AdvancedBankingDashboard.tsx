import { useState, useEffect, useMemo } from 'react';
import {
  Wallet, TrendingUp, Activity, ArrowUpRight, ArrowDownRight,
  PieChart, AlertCircle, CheckCircle, Clock, XCircle, FileText, Database,
  Eye, EyeOff, Shield, RefreshCw
} from 'lucide-react';
import { transactionsStore, type FileAccount, type Transaction } from '../lib/transactions-store';
import { formatCurrency } from '../lib/balances-store';
import { ledgerAccountsStore, type LedgerAccount } from '../lib/ledger-accounts-store';
import { useLanguage } from '../lib/i18n';

interface DashboardStats {
  totalBalance: number;
  totalAccounts: number;
  totalCurrencies: number;
  totalTransactions: number;
  pendingTransactions: number;
  completedTransactions: number;
  failedTransactions: number;
  totalDebits: number;
  totalCredits: number;
  totalFees: number;
}

interface CurrencyStats {
  currency: string;
  balance: number;
  transactionCount: number;
  debitCount: number;
  creditCount: number;
  avgTransaction: number;
  largestTransaction: number;
  percentageOfTotal: number;
}

export function AdvancedBankingDashboard() {
  const { t } = useLanguage();
  const [accounts, setAccounts] = useState<FileAccount[]>([]);
  const [ledgerAccounts, setLedgerAccounts] = useState<LedgerAccount[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [balanceVisible, setBalanceVisible] = useState(true);
  const [selectedPeriod, setSelectedPeriod] = useState<'24h' | '7d' | '30d' | 'all'>('all');
  const [selectedCurrency, setSelectedCurrency] = useState<string>('all');

  useEffect(() => {
    loadDashboardData();

    const unsubscribeLedger = ledgerAccountsStore.subscribe((updatedAccounts) => {
      console.log('[Dashboard] Ledger accounts updated:', updatedAccounts.length);
      setLedgerAccounts(updatedAccounts);
    });

    const intervalId = setInterval(() => {
      console.log('[Dashboard] Auto-refresh - polling for updates');
      loadDashboardData(false);
    }, 5000);

    return () => {
      unsubscribeLedger();
      clearInterval(intervalId);
    };
  }, []);

  const loadDashboardData = async (showLoading = true) => {
    try {
      if (showLoading) {
        setLoading(true);
      }
      const [loadedAccounts, loadedLedgerAccounts, loadedTransactions] = await Promise.all([
        transactionsStore.getAvailableAccounts(true),
        ledgerAccountsStore.getAllAccounts(true),
        transactionsStore.getTransactionHistory(undefined, 100)
      ]);

      setAccounts(loadedAccounts);
      setLedgerAccounts(loadedLedgerAccounts);
      setTransactions(loadedTransactions);

      console.log('[Dashboard] Loaded:', {
        accounts: loadedAccounts.length,
        ledgerAccounts: loadedLedgerAccounts.length,
        transactions: loadedTransactions.length,
        totalBalance: loadedLedgerAccounts.reduce((sum, acc) => sum + acc.balance, 0)
      });
    } catch (error) {
      console.error('[Dashboard] Error loading data:', error);
    } finally {
      if (showLoading) {
        setLoading(false);
      }
    }
  };

  const refreshData = async () => {
    setRefreshing(true);
    await loadDashboardData();
    setRefreshing(false);
  };

  const dashboardStats = useMemo<DashboardStats>(() => {
    let totalBalance = 0;
    const currencies = new Set<string>();
    let totalDebits = 0;
    let totalCredits = 0;
    let totalFees = 0;
    let pendingCount = 0;
    let completedCount = 0;
    let failedCount = 0;

    ledgerAccounts.forEach(account => {
      if (account.balance > 0) {
        currencies.add(account.currency);
        totalBalance += account.balance;
      }
    });

    transactions.forEach(tx => {
      if (tx.transactionType === 'debit') {
        totalDebits += tx.amount;
      } else {
        totalCredits += tx.amount;
      }
      totalFees += tx.fee;

      if (tx.status === 'pending') pendingCount++;
      if (tx.status === 'completed') completedCount++;
      if (tx.status === 'failed') failedCount++;
    });

    return {
      totalBalance,
      totalAccounts: ledgerAccounts.filter(acc => acc.balance > 0).length,
      totalCurrencies: currencies.size,
      totalTransactions: transactions.length,
      pendingTransactions: pendingCount,
      completedTransactions: completedCount,
      failedTransactions: failedCount,
      totalDebits,
      totalCredits,
      totalFees
    };
  }, [ledgerAccounts, transactions]);

  const currencyStats = useMemo<CurrencyStats[]>(() => {
    const statsMap = new Map<string, CurrencyStats>();
    const totalValue = dashboardStats.totalBalance;

    ledgerAccounts.forEach(account => {
      if (account.balance > 0) {
        statsMap.set(account.currency, {
          currency: account.currency,
          balance: account.balance,
          transactionCount: account.transactionCount,
          debitCount: 0,
          creditCount: 0,
          avgTransaction: account.averageTransaction,
          largestTransaction: account.largestTransaction,
          percentageOfTotal: 0
        });
      }
    });

    transactions.forEach(tx => {
      const stats = statsMap.get(tx.currency);
      if (stats) {
        if (tx.transactionType === 'debit') {
          stats.debitCount++;
        } else {
          stats.creditCount++;
        }
      }
    });

    const result = Array.from(statsMap.values()).map(stats => ({
      ...stats,
      percentageOfTotal: totalValue > 0 ? (stats.balance / totalValue) * 100 : 0
    }));

    return result.sort((a, b) => b.balance - a.balance);
  }, [ledgerAccounts, transactions, dashboardStats.totalBalance]);

  const filteredTransactions = useMemo(() => {
    return transactions.filter(tx => {
      if (selectedCurrency !== 'all' && tx.currency !== selectedCurrency) {
        return false;
      }

      if (selectedPeriod !== 'all') {
        const txDate = new Date(tx.createdAt);
        const now = new Date();
        const diffMs = now.getTime() - txDate.getTime();
        const diffHours = diffMs / (1000 * 60 * 60);

        if (selectedPeriod === '24h' && diffHours > 24) return false;
        if (selectedPeriod === '7d' && diffHours > 24 * 7) return false;
        if (selectedPeriod === '30d' && diffHours > 24 * 30) return false;
      }

      return true;
    });
  }, [transactions, selectedCurrency, selectedPeriod]);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return <CheckCircle className="w-4 h-4 text-[#ffffff]" />;
      case 'pending': return <Clock className="w-4 h-4 text-yellow-500" />;
      case 'failed': return <XCircle className="w-4 h-4 text-red-500" />;
      default: return <AlertCircle className="w-4 h-4 text-gray-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'text-[#ffffff]';
      case 'pending': return 'text-yellow-500';
      case 'failed': return 'text-red-500';
      default: return 'text-gray-500';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black p-6 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Activity className="w-12 h-12 text-[#ffffff] animate-spin" />
          <p className="text-[#ffffff] text-lg">Cargando dashboard bancario...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black p-3 sm:p-6">
      <div className="max-w-7xl mx-auto space-y-6">

        {/* Header */}
        <div className="bg-gradient-to-r from-[#0a0a0a] to-[#0d0d0d] rounded-xl border border-[#ffffff]/20 p-6 shadow-[0_0_30px_rgba(255, 255, 255,0.1)]">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 bg-gradient-to-br from-[#ffffff] to-[#e0e0e0] rounded-xl flex items-center justify-center shadow-[0_0_20px_rgba(255, 255, 255,0.3)]">
                <Shield className="w-8 h-8 text-black" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-[#ffffff]">{t.advDashboardTitle}</h1>
                <p className="text-[#ffffff] text-sm">{t.advDashboardSubtitle}</p>
              </div>
            </div>
            <button
              onClick={refreshData}
              disabled={refreshing}
              className="flex items-center gap-2 bg-[#ffffff] hover:bg-[#e0e0e0] text-black px-4 py-2 rounded-lg font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
              {refreshing ? t.advDashboardUpdating : t.advDashboardUpdate}
            </button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Total Balance */}
          <div className="bg-gradient-to-br from-[#0a0a0a] to-[#0d0d0d] border border-[#ffffff]/30 rounded-xl p-6 hover:shadow-[0_0_20px_rgba(255, 255, 255,0.2)] transition-all">
            <div className="flex items-center justify-between mb-4">
              <Wallet className="w-10 h-10 text-[#ffffff]" />
              <button onClick={() => setBalanceVisible(!balanceVisible)} className="text-[#ffffff] hover:text-[#ffffff]">
                {balanceVisible ? <Eye className="w-5 h-5" /> : <EyeOff className="w-5 h-5" />}
              </button>
            </div>
            <p className="text-[#ffffff] text-sm mb-2">{t.advDashboardTotalBalance}</p>
            <p className="text-3xl font-black text-[#ffffff] drop-shadow-[0_0_10px_rgba(255, 255, 255,0.5)]">
              {balanceVisible ? `$${dashboardStats.totalBalance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '••••••'}
            </p>
            <p className="text-[#ffffff] text-xs mt-2">{dashboardStats.totalCurrencies} {t.dashboardCurrenciesDetected}</p>
          </div>

          {/* Accounts */}
          <div className="bg-gradient-to-br from-[#0a0a0a] to-[#0d0d0d] border border-[#ffffff]/30 rounded-xl p-6 hover:shadow-[0_0_20px_rgba(255, 255, 255,0.2)] transition-all">
            <Database className="w-10 h-10 text-[#ffffff] mb-4" />
            <p className="text-[#ffffff] text-sm mb-2">{t.advDashboardActiveAccounts}</p>
            <p className="text-3xl font-black text-[#ffffff]">{dashboardStats.totalAccounts}</p>
            <p className="text-[#ffffff] text-xs mt-2">{dashboardStats.totalCurrencies} divisas</p>
          </div>

          {/* Transactions */}
          <div className="bg-gradient-to-br from-[#0a0a0a] to-[#0d0d0d] border border-[#ffffff]/30 rounded-xl p-6 hover:shadow-[0_0_20px_rgba(255, 255, 255,0.2)] transition-all">
            <Activity className="w-10 h-10 text-[#ffffff] mb-4" />
            <p className="text-[#ffffff] text-sm mb-2">Transacciones</p>
            <p className="text-3xl font-black text-[#ffffff]">{dashboardStats.totalTransactions}</p>
            <div className="flex items-center gap-3 mt-2">
              <span className="text-[#ffffff] text-xs">✓ {dashboardStats.completedTransactions}</span>
              <span className="text-yellow-500 text-xs">⏱ {dashboardStats.pendingTransactions}</span>
              <span className="text-red-500 text-xs">✗ {dashboardStats.failedTransactions}</span>
            </div>
          </div>

          {/* Movement Summary */}
          <div className="bg-gradient-to-br from-[#0a0a0a] to-[#0d0d0d] border border-[#ffffff]/30 rounded-xl p-6 hover:shadow-[0_0_20px_rgba(255, 255, 255,0.2)] transition-all">
            <TrendingUp className="w-10 h-10 text-[#ffffff] mb-4" />
            <p className="text-[#ffffff] text-sm mb-2">{t.advDashboardMovements}</p>
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-xs text-[#ffffff]">{t.advDashboardDebits}:</span>
                <span className="text-sm font-bold text-red-400">${dashboardStats.totalDebits.toFixed(2)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-[#ffffff]">{t.advDashboardCredits}:</span>
                <span className="text-sm font-bold text-[#ffffff]">${dashboardStats.totalCredits.toFixed(2)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-[#ffffff]">{t.advDashboardFees}:</span>
                <span className="text-sm font-bold text-yellow-500">${dashboardStats.totalFees.toFixed(2)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Ledger Accounts - 15 Divisas Ordenadas */}
        <div className="bg-gradient-to-br from-[#0a0a0a] to-[#0d0d0d] border border-[#ffffff]/20 rounded-xl p-6">
          <div className="flex items-center gap-3 mb-6">
            <Database className="w-6 h-6 text-[#ffffff]" />
            <h2 className="text-2xl font-bold text-[#ffffff]">{t.advDashboardLedgerAccounts}</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-3 mb-8">
            {ledgerAccounts.map((account, index) => {
              const isMainCurrency = index < 4;
              return (
                <div
                  key={account.currency}
                  className={`${
                    isMainCurrency
                      ? 'bg-gradient-to-br from-[#ffffff]/20 to-[#e0e0e0]/20 border-[#ffffff]/50'
                      : 'bg-[#ffffff]/5 border-[#ffffff]/20'
                  } border rounded-lg p-3 hover:bg-[#ffffff]/15 transition-all`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className={`text-xl font-black ${isMainCurrency ? 'text-[#ffffff]' : 'text-[#ffffff]'}`}>
                      {account.currency}
                    </span>
                    {isMainCurrency && (
                      <span className="text-xs bg-[#ffffff] text-black px-2 py-0.5 rounded-full font-bold">★</span>
                    )}
                  </div>

                  <div className="space-y-1">
                    <div className="text-lg font-bold text-[#ffffff]">
                      {balanceVisible ? formatCurrency(account.balance, account.currency) : '••••••'}
                    </div>
                    <div className="text-xs text-[#ffffff]">
                      {account.transactionCount} tx
                    </div>
                    <div className={`text-xs font-semibold ${
                      account.status === 'active' ? 'text-[#ffffff]' :
                      account.status === 'frozen' ? 'text-yellow-500' :
                      'text-red-400'
                    }`}>
                      {account.status.toUpperCase()}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Currency Distribution */}
        <div className="bg-gradient-to-br from-[#0a0a0a] to-[#0d0d0d] border border-[#ffffff]/20 rounded-xl p-6">
          <div className="flex items-center gap-3 mb-6">
            <PieChart className="w-6 h-6 text-[#ffffff]" />
            <h2 className="text-2xl font-bold text-[#ffffff]">{t.advDashboardCurrencyDistribution}</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {currencyStats.map(stats => (
              <div
                key={stats.currency}
                className="bg-[#ffffff]/5 border border-[#ffffff]/20 rounded-lg p-4 hover:bg-[#ffffff]/10 transition-all"
              >
                <div className="flex items-center justify-between mb-3">
                  <span className="text-2xl font-black text-[#ffffff]">{stats.currency}</span>
                  <span className="text-sm font-bold text-[#ffffff]">{stats.percentageOfTotal.toFixed(1)}%</span>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-[#ffffff]">Balance:</span>
                    <span className="text-sm font-bold text-[#ffffff]">
                      {formatCurrency(stats.balance, stats.currency)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-[#ffffff]">Transacciones:</span>
                    <span className="text-sm font-bold text-[#ffffff]">{stats.transactionCount}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-[#ffffff]">Mayor:</span>
                    <span className="text-sm font-bold text-[#ffffff]">
                      {formatCurrency(stats.largestTransaction, stats.currency)}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 mt-2">
                    <span className="text-xs text-red-400">↓ {stats.debitCount}</span>
                    <span className="text-xs text-[#ffffff]">↑ {stats.creditCount}</span>
                  </div>
                </div>

                <div className="mt-3 h-2 bg-[#ffffff]/20 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-[#ffffff] to-[#e0e0e0]"
                    style={{ width: `${stats.percentageOfTotal}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Transaction History */}
        <div className="bg-gradient-to-br from-[#0a0a0a] to-[#0d0d0d] border border-[#ffffff]/20 rounded-xl p-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
            <div className="flex items-center gap-3">
              <FileText className="w-6 h-6 text-[#ffffff]" />
              <h2 className="text-2xl font-bold text-[#ffffff]">{t.advDashboardTransactionHistory}</h2>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              {/* Period Filter */}
              <select
                value={selectedPeriod}
                onChange={(e) => setSelectedPeriod(e.target.value)}
                className="bg-[#0d0d0d] border border-[#ffffff]/30 text-[#ffffff] px-3 py-2 rounded-lg text-sm focus:border-[#ffffff] focus:outline-none"
              >
                <option value="all">{t.advDashboardAllPeriods}</option>
                <option value="24h">{t.advDashboardLast24h}</option>
                <option value="7d">{t.advDashboardLast7d}</option>
                <option value="30d">{t.advDashboardLast30d}</option>
              </select>

              {/* Currency Filter */}
              <select
                value={selectedCurrency}
                onChange={(e) => setSelectedCurrency(e.target.value)}
                className="bg-[#0d0d0d] border border-[#ffffff]/30 text-[#ffffff] px-3 py-2 rounded-lg text-sm focus:border-[#ffffff] focus:outline-none"
              >
                <option value="all">{t.advDashboardAllCurrencies}</option>
                {currencyStats.map(stats => (
                  <option key={stats.currency} value={stats.currency}>{stats.currency}</option>
                ))}
              </select>
            </div>
          </div>

          {filteredTransactions.length === 0 ? (
            <div className="text-center py-12">
              <AlertCircle className="w-16 h-16 text-[#ffffff] mx-auto mb-4 opacity-50" />
              <p className="text-[#ffffff] text-lg">{t.advDashboardNoTransactions}</p>
              <p className="text-[#ffffff] text-sm mt-2">{t.advDashboardNoTransactionsMessage}</p>
            </div>
          ) : (
            <div className="space-y-2 max-h-[500px] overflow-y-auto">
              {filteredTransactions.map(tx => (
                <div
                  key={tx.id}
                  className="bg-[#ffffff]/5 border border-[#ffffff]/20 rounded-lg p-4 hover:bg-[#ffffff]/10 transition-all"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3 flex-1">
                      <div className="mt-1">
                        {tx.transactionType === 'debit' ? (
                          <ArrowDownRight className="w-8 h-8 text-red-400" />
                        ) : (
                          <ArrowUpRight className="w-8 h-8 text-[#ffffff]" />
                        )}
                      </div>

                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className={`text-sm font-bold ${tx.transactionType === 'debit' ? 'text-red-400' : 'text-[#ffffff]'}`}>
                            {tx.transactionType === 'debit' ? 'DÉBITO' : 'CRÉDITO'}
                          </span>
                          <span className="text-xs text-[#ffffff]">•</span>
                          <span className="text-xs font-bold text-[#ffffff]">{tx.currency}</span>
                        </div>

                        <p className="text-[#ffffff] font-semibold text-lg mb-1">
                          {formatCurrency(tx.amount, tx.currency)}
                        </p>

                        {tx.description && (
                          <p className="text-[#ffffff] text-sm mb-2">{tx.description}</p>
                        )}

                        {tx.recipientName && (
                          <div className="text-xs text-[#ffffff]">
                            <span className="opacity-70">Para: </span>
                            <span className="font-semibold">{tx.recipientName}</span>
                          </div>
                        )}

                        {tx.fee > 0 && (
                          <p className="text-xs text-yellow-500 mt-1">Comisión: {formatCurrency(tx.fee, tx.currency)}</p>
                        )}
                      </div>
                    </div>

                    <div className="text-right">
                      <div className="flex items-center gap-2 mb-2">
                        {getStatusIcon(tx.status)}
                        <span className={`text-xs font-bold uppercase ${getStatusColor(tx.status)}`}>
                          {tx.status}
                        </span>
                      </div>
                      <p className="text-xs text-[#ffffff]">
                        {new Date(tx.createdAt).toLocaleString('es-ES', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
