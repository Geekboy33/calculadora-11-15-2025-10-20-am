import { useState, useEffect, useMemo } from 'react';
import {
  Wallet, TrendingUp, Activity, ArrowUpRight, ArrowDownRight,
  PieChart, AlertCircle, CheckCircle, Clock, XCircle, FileText, Database,
  Eye, EyeOff, Shield, RefreshCw, Layers, Lock, Zap, DollarSign, Users, Server
} from 'lucide-react';
import { transactionsStore, type FileAccount, type Transaction } from '../lib/transactions-store';
import { formatCurrency, balanceStore, type CurrencyBalance } from '../lib/balances-store';
import { ledgerAccountsStore, type LedgerAccount } from '../lib/ledger-accounts-store';
import { custodyStore, type CustodyAccount } from '../lib/custody-store';
import { profilesStore } from '../lib/profiles-store';
import { unifiedPledgeStore, type UnifiedPledge } from '../lib/unified-pledge-store';
import { processingStore } from '../lib/processing-store';
import { transactionEventStore } from '../lib/transaction-event-store';
import { useLanguage } from '../lib/i18n';
import { formatters } from '../lib/formatters';
import { Card, CardHeader } from './ui/Card';
import { StatusBadge } from './ui/Badge';
import { Progress, ProgressCircle } from './ui/Progress';
import { DashboardSkeleton } from './ui/Skeleton';

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
  const { t, language } = useLanguage();
  const isSpanish = language === 'es';
  
  // Estados originales
  const [accounts, setAccounts] = useState<FileAccount[]>([]);
  const [ledgerAccounts, setLedgerAccounts] = useState<LedgerAccount[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [balanceVisible, setBalanceVisible] = useState(true);
  const [selectedPeriod, setSelectedPeriod] = useState<'24h' | '7d' | '30d' | 'all'>('all');
  const [selectedCurrency, setSelectedCurrency] = useState<string>('all');
  
  // ✅ NUEVOS ESTADOS: Conectar con otros módulos
  const [analyzedBalances, setAnalyzedBalances] = useState<CurrencyBalance[]>([]);
  const [custodyAccounts, setCustodyAccounts] = useState<CustodyAccount[]>([]);
  const [profiles, setProfiles] = useState<any[]>([]);
  const [pledges, setPledges] = useState<UnifiedPledge[]>([]);
  const [processingState, setProcessingState] = useState<any>(null);
  const [recentEvents, setRecentEvents] = useState<any[]>([]);

  useEffect(() => {
    loadDashboardData();

    // ✅ SUSCRIBIRSE A TODOS LOS STORES
    const unsubscribeLedger = ledgerAccountsStore.subscribe((updatedAccounts) => {
      console.log('[Dashboard] Ledger accounts updated:', updatedAccounts.length);
      setLedgerAccounts(updatedAccounts);
    });

    const unsubscribeBalances = balanceStore.subscribe((updatedBalances) => {
      console.log('[Dashboard] Analyzed balances updated:', updatedBalances.length);
      setAnalyzedBalances(updatedBalances);
    });

    const unsubscribeCustody = custodyStore.subscribe((updatedAccounts) => {
      console.log('[Dashboard] Custody accounts updated:', updatedAccounts.length);
      setCustodyAccounts(updatedAccounts);
    });

    const unsubscribeProfiles = profilesStore.subscribe((state) => {
      console.log('[Dashboard] Profiles updated:', state.profiles.length);
      setProfiles(state.profiles);
    });

    const unsubscribeProcessing = processingStore.subscribe((state) => {
      console.log('[Dashboard] Processing state updated:', state?.status);
      setProcessingState(state);
    });

    // Cargar datos iniciales de otros stores
    setAnalyzedBalances(balanceStore.getBalances());
    setCustodyAccounts(custodyStore.getAccounts());
    setProfiles(profilesStore.getProfiles());
    setPledges(unifiedPledgeStore.getPledges());
    setRecentEvents(transactionEventStore.getRecentEvents(10));

    // Auto-refresh cada 10 segundos (optimizado)
    const intervalId = setInterval(() => {
      console.log('[Dashboard] Auto-refresh');
      loadDashboardData(false);
      setRecentEvents(transactionEventStore.getRecentEvents(10));
    }, 10000); // Cada 10 segundos en lugar de 5

    return () => {
      unsubscribeLedger();
      unsubscribeBalances();
      unsubscribeCustody();
      unsubscribeProfiles();
      unsubscribeProcessing();
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

  // ✅ ESTADÍSTICAS MEJORADAS: Combinar datos de TODOS los módulos
  const dashboardStats = useMemo<DashboardStats>(() => {
    let totalBalance = 0;
    const currencies = new Set<string>();
    let totalDebits = 0;
    let totalCredits = 0;
    let totalFees = 0;
    let pendingCount = 0;
    let completedCount = 0;
    let failedCount = 0;

    // Sumar balances de Ledger Accounts
    ledgerAccounts.forEach(account => {
      if (account.balance > 0) {
        currencies.add(account.currency);
        totalBalance += account.balance;
      }
    });

    // ✅ NUEVO: Sumar balances del Analizador de Archivos
    analyzedBalances.forEach(balance => {
      currencies.add(balance.currency);
      // Solo sumar si no está ya en ledger (evitar duplicados)
      const inLedger = ledgerAccounts.some(acc => acc.currency === balance.currency);
      if (!inLedger) {
        totalBalance += balance.totalAmount || balance.balance || 0;
      }
    });

    // ✅ NUEVO: Sumar balances de Custody Accounts
    custodyAccounts.forEach(account => {
      currencies.add(account.currency);
      // Total custody separado, no sumar al balance general para evitar duplicados
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
      totalAccounts: ledgerAccounts.filter(acc => acc.balance > 0).length + 
                     analyzedBalances.length + 
                     custodyAccounts.length,
      totalCurrencies: currencies.size,
      totalTransactions: transactions.length + recentEvents.length,
      pendingTransactions: pendingCount,
      completedTransactions: completedCount,
      failedTransactions: failedCount,
      totalDebits,
      totalCredits,
      totalFees
    };
  }, [ledgerAccounts, transactions, analyzedBalances, custodyAccounts, recentEvents]);

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
      case 'completed': return <CheckCircle className="w-4 h-4 text-[#00ff88]" />;
      case 'pending': return <Clock className="w-4 h-4 text-yellow-500" />;
      case 'failed': return <XCircle className="w-4 h-4 text-red-500" />;
      default: return <AlertCircle className="w-4 h-4 text-gray-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'text-[#00ff88]';
      case 'pending': return 'text-yellow-500';
      case 'failed': return 'text-red-500';
      default: return 'text-gray-500';
    }
  };

  // ✅ Métricas adicionales de otros módulos
  const additionalStats = useMemo(() => {
    const custodyTotal = custodyAccounts.reduce((sum, acc) => sum + acc.totalBalance, 0);
    const custodyReserved = custodyAccounts.reduce((sum, acc) => sum + acc.reservedBalance, 0);
    const pledgesTotal = pledges.reduce((sum, p) => sum + (p.amount || 0), 0);
    const profilesCount = profiles.length;
    
    return {
      custodyTotal,
      custodyReserved,
      custodyAvailable: custodyTotal - custodyReserved,
      pledgesCount: pledges.length,
      pledgesTotal,
      profilesCount,
      activeProfiles: profiles.filter(p => p.stats?.ledger?.status === 'processing').length,
    };
  }, [custodyAccounts, pledges, profiles]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-[#030712] via-[#050b1c] to-[#000] p-6">
        <DashboardSkeleton />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#030712] via-[#050b1c] to-[#000] p-3 sm:p-6">
      <div className="max-w-[1920px] mx-auto space-y-6">

        {/* ✅ Header Mejorado con Estado de Procesamiento */}
        <div className="sticky top-0 z-20 bg-gradient-to-r from-[#0a0f1c]/95 via-[#050b1c]/95 to-[#000]/95 backdrop-blur-xl rounded-2xl border-2 border-[#00ff88]/30 p-6 shadow-2xl shadow-[#00ff88]/20">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="relative">
                <div className="absolute inset-0 bg-[#00ff88] rounded-2xl blur-xl opacity-50 animate-pulse" />
                <div className="relative w-16 h-16 bg-gradient-to-br from-[#00ff88] to-[#00cc6a] rounded-2xl flex items-center justify-center shadow-xl">
                  <Shield className="w-9 h-9 text-black" />
                </div>
              </div>
              <div>
                <h1 className="text-4xl font-bold text-white tracking-tight">
                  {isSpanish ? 'Panel de Control Bancario' : 'Banking Dashboard'}
                </h1>
                <p className="text-white/60 text-sm mt-1">
                  {isSpanish ? 'Sistema avanzado de gestión financiera en tiempo real' : 'Advanced financial management system with real-time data'}
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              {/* Estado de procesamiento */}
              {processingState && processingState.status === 'processing' && (
                <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-500/20 border border-blue-500/40">
                  <Activity className="w-4 h-4 text-blue-300 animate-spin" />
                  <span className="text-sm font-semibold text-blue-200">
                    {isSpanish ? 'Procesando' : 'Processing'} {formatters.percentage(processingState.progress, 1)}
                  </span>
                </div>
              )}
              
              <button
                onClick={refreshData}
                disabled={refreshing}
                className="flex items-center gap-2 bg-gradient-to-r from-[#00ff88] to-[#00cc6a] hover:from-[#00cc6a] hover:to-[#00aa55] text-black px-6 py-3 rounded-xl font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-[#00ff88]/30 hover:shadow-xl hover:scale-105 active:scale-95"
              >
                <RefreshCw className={`w-5 h-5 ${refreshing ? 'animate-spin' : ''}`} />
                {refreshing ? (isSpanish ? 'Actualizando...' : 'Updating...') : (isSpanish ? 'Actualizar' : 'Update')}
              </button>
            </div>
          </div>
        </div>

        {/* ✅ Stats Cards MEJORADAS con datos de todos los módulos */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
          
          {/* Total Balance - Mejorado con glassmorphism */}
          <Card variant="glass" elevated interactive glowOnHover>
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 rounded-xl bg-[#00ff88]/20 border border-[#00ff88]/40 shadow-lg">
                <Wallet className="w-7 h-7 text-[#00ff88]" />
              </div>
              <button 
                onClick={() => setBalanceVisible(!balanceVisible)} 
                className="p-2 rounded-lg hover:bg-white/10 transition-colors"
                aria-label={balanceVisible ? 'Ocultar balance' : 'Mostrar balance'}
              >
                {balanceVisible ? <Eye className="w-5 h-5 text-white/60" /> : <EyeOff className="w-5 h-5 text-white/60" />}
              </button>
            </div>
            
            <p className="text-xs font-semibold text-white/50 uppercase tracking-wider mb-2">
              {t.advDashboardTotalBalance}
            </p>
            
            <p className="text-4xl font-bold text-white mb-2 font-mono">
              {balanceVisible ? formatters.currency(dashboardStats.totalBalance, 'USD') : '$ •••,•••,•••.••'}
            </p>
            
            <div className="flex items-center gap-2">
              <div className="flex-1 h-1.5 bg-white/10 rounded-full overflow-hidden">
                <div className="h-full bg-gradient-to-r from-[#00ff88] to-[#00cc6a] w-full" />
              </div>
              <span className="text-xs text-[#00ff88] font-semibold">
                {dashboardStats.totalCurrencies} {isSpanish ? 'divisas' : 'currencies'}
              </span>
            </div>
          </Card>

          {/* Active Accounts - Mejorado */}
          <Card variant="glass" elevated interactive glowOnHover>
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 rounded-xl bg-blue-500/20 border border-blue-500/40 shadow-lg">
                <Database className="w-7 h-7 text-blue-300" />
              </div>
              <StatusBadge status="active" pulsing />
            </div>
            
            <p className="text-xs font-semibold text-white/50 uppercase tracking-wider mb-2">
              {t.advDashboardActiveAccounts}
            </p>
            
            <p className="text-4xl font-bold text-white mb-2 font-mono">
              {dashboardStats.totalAccounts}
            </p>
            
            <div className="flex items-center justify-between text-xs">
              <span className="text-white/50">
                {isSpanish ? 'Ledger' : 'Ledger'}: <strong className="text-blue-300">{ledgerAccounts.length}</strong>
              </span>
              <span className="text-white/50">
                {isSpanish ? 'Custody' : 'Custody'}: <strong className="text-[#00ff88]">{custodyAccounts.length}</strong>
              </span>
            </div>
          </Card>

          {/* Transactions - Mejorado */}
          <Card variant="glass" elevated interactive glowOnHover>
            <div className="p-3 rounded-xl bg-purple-500/20 border border-purple-500/40 shadow-lg mb-4 w-fit">
              <Activity className="w-7 h-7 text-purple-300" />
            </div>
            
            <p className="text-xs font-semibold text-white/50 uppercase tracking-wider mb-2">
              {isSpanish ? 'Transacciones' : 'Transactions'}
            </p>
            
            <p className="text-4xl font-bold text-white mb-3 font-mono">
              {formatters.number(dashboardStats.totalTransactions, 'en-US', 0)}
            </p>
            
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1">
                <CheckCircle className="w-3.5 h-3.5 text-[#00ff88]" />
                <span className="text-xs font-semibold text-[#00ff88]">{dashboardStats.completedTransactions}</span>
              </div>
              <div className="flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-amber-400" />
                <span className="text-xs font-semibold text-amber-400">{dashboardStats.pendingTransactions}</span>
              </div>
              <div className="flex items-center gap-1">
                <XCircle className="w-3.5 h-3.5 text-red-400" />
                <span className="text-xs font-semibold text-red-400">{dashboardStats.failedTransactions}</span>
              </div>
            </div>
          </Card>

          {/* Movement Summary - Mejorado */}
          <Card variant="glass" elevated interactive glowOnHover>
            <div className="p-3 rounded-xl bg-amber-500/20 border border-amber-500/40 shadow-lg mb-4 w-fit">
              <TrendingUp className="w-7 h-7 text-amber-300" />
            </div>
            
            <p className="text-xs font-semibold text-white/50 uppercase tracking-wider mb-3">
              {t.advDashboardMovements}
            </p>
            
            <div className="space-y-2">
              <div className="flex items-center justify-between p-2 rounded-lg bg-red-500/10 border border-red-500/20">
                <div className="flex items-center gap-2">
                  <ArrowDownRight className="w-4 h-4 text-red-400" />
                  <span className="text-xs text-white/60">{t.advDashboardDebits}</span>
                </div>
                <span className="text-sm font-bold text-red-300">
                  {formatters.currency(dashboardStats.totalDebits, 'USD')}
                </span>
              </div>
              
              <div className="flex items-center justify-between p-2 rounded-lg bg-[#00ff88]/10 border border-[#00ff88]/20">
                <div className="flex items-center gap-2">
                  <ArrowUpRight className="w-4 h-4 text-[#00ff88]" />
                  <span className="text-xs text-white/60">{t.advDashboardCredits}</span>
                </div>
                <span className="text-sm font-bold text-[#00ff88]">
                  {formatters.currency(dashboardStats.totalCredits, 'USD')}
                </span>
              </div>
              
              <div className="flex items-center justify-between p-2 rounded-lg bg-amber-500/10 border border-amber-500/20">
                <div className="flex items-center gap-2">
                  <Zap className="w-4 h-4 text-amber-400" />
                  <span className="text-xs text-white/60">{t.advDashboardFees}</span>
                </div>
                <span className="text-sm font-bold text-amber-300">
                  {formatters.currency(dashboardStats.totalFees, 'USD')}
                </span>
              </div>
            </div>
          </Card>
        </div>
        
        {/* ✅ NUEVAS MÉTRICAS: Custody, Pledges, Profiles */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
          
          {/* Custody Accounts Total */}
          <Card variant="glass" elevated interactive glowOnHover>
            <CardHeader 
              title={isSpanish ? 'Cuentas Custody' : 'Custody Accounts'}
              icon={Lock}
            />
            <div className="space-y-3">
              <div>
                <p className="text-xs text-white/50 mb-1">{isSpanish ? 'Capital Total' : 'Total Capital'}</p>
                <p className="text-3xl font-bold text-[#00ff88]">
                  {formatters.currency(additionalStats.custodyTotal, 'USD')}
                </p>
              </div>
              
              <div className="grid grid-cols-2 gap-3 pt-3 border-t border-white/10">
                <div>
                  <p className="text-xs text-white/40">{isSpanish ? 'Disponible' : 'Available'}</p>
                  <p className="text-base font-semibold text-white">
                    {formatters.compact(additionalStats.custodyAvailable)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-white/40">{isSpanish ? 'Reservado' : 'Reserved'}</p>
                  <p className="text-base font-semibold text-amber-400">
                    {formatters.compact(additionalStats.custodyReserved)}
                  </p>
                </div>
              </div>
            </div>
          </Card>
          
          {/* Pledges */}
          <Card variant="glass" elevated interactive glowOnHover>
            <CardHeader 
              title={isSpanish ? 'Pledges Activos' : 'Active Pledges'}
              icon={Shield}
            />
            <div className="space-y-3">
              <div>
                <p className="text-xs text-white/50 mb-1">{isSpanish ? 'Total Comprometido' : 'Total Pledged'}</p>
                <p className="text-3xl font-bold text-purple-300">
                  {formatters.currency(additionalStats.pledgesTotal, 'USD')}
                </p>
              </div>
              
              <div className="flex items-center justify-between pt-3 border-t border-white/10">
                <span className="text-xs text-white/40">{isSpanish ? 'Cantidad' : 'Count'}</span>
                <span className="text-2xl font-bold text-white">
                  {additionalStats.pledgesCount}
                </span>
              </div>
            </div>
          </Card>
          
          {/* Profiles */}
          <Card variant="glass" elevated interactive glowOnHover>
            <CardHeader 
              title={isSpanish ? 'Perfiles Guardados' : 'Saved Profiles'}
              icon={Layers}
            />
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-white/50 mb-1">{isSpanish ? 'Total' : 'Total'}</p>
                  <p className="text-4xl font-bold text-cyan-300 font-mono">
                    {additionalStats.profilesCount}
                  </p>
                </div>
                {additionalStats.activeProfiles > 0 && (
                  <div className="text-right">
                    <p className="text-xs text-white/50 mb-1">{isSpanish ? 'Procesando' : 'Processing'}</p>
                    <div className="flex items-center gap-1">
                      <Activity className="w-4 h-4 text-blue-400 animate-spin" />
                      <span className="text-lg font-bold text-blue-300">{additionalStats.activeProfiles}</span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </Card>
        </div>

        {/* ✅ NUEVO: Estado del Sistema en Tiempo Real */}
        {(processingState || recentEvents.length > 0) && (
          <Card variant="gradient" elevated>
            <CardHeader 
              title={isSpanish ? 'Actividad del Sistema' : 'System Activity'}
              subtitle={isSpanish ? 'Actualizaciones en tiempo real' : 'Real-time updates'}
              icon={Zap}
            />
            
            <div className="grid lg:grid-cols-2 gap-6">
              {/* Procesamiento activo */}
              {processingState && (
                <div className="bg-black/30 rounded-2xl p-5 border border-[#00ff88]/10">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="relative">
                      <div className="absolute inset-0 bg-blue-500 rounded-full blur-md opacity-50 animate-pulse" />
                      <div className="relative w-3 h-3 bg-blue-500 rounded-full" />
                    </div>
                    <h3 className="text-lg font-bold text-white">
                      {isSpanish ? 'Procesamiento Activo' : 'Active Processing'}
                    </h3>
                  </div>
                  
                  <p className="text-sm text-white/60 mb-3 truncate">
                    📂 {processingState.fileName}
                  </p>
                  
                  <Progress 
                    value={processingState.progress || 0}
                    showPercentage
                    showMilestones
                    variant="gradient"
                    size="md"
                  />
                  
                  <div className="mt-3 flex items-center justify-between text-xs">
                    <span className="text-white/50">
                      {formatters.bytes(processingState.bytesProcessed || 0)} / {formatters.bytes(processingState.fileSize || 0)}
                    </span>
                    <StatusBadge 
                      status={processingState.status === 'processing' ? 'processing' : 'pending'} 
                      label={processingState.status?.toUpperCase()}
                    />
                  </div>
                </div>
              )}
              
              {/* Eventos recientes */}
              {recentEvents.length > 0 && (
                <div className="bg-black/30 rounded-2xl p-5 border border-white/10">
                  <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                    <Activity className="w-5 h-5 text-[#00ff88]" />
                    {isSpanish ? 'Eventos Recientes' : 'Recent Events'}
                  </h3>
                  
                  <div className="space-y-2 max-h-48 overflow-y-auto scrollbar-thin scrollbar-thumb-white/20 scrollbar-track-transparent">
                    {recentEvents.slice(0, 5).map((event, idx) => (
                      <div 
                        key={idx}
                        className="flex items-center gap-3 p-2 rounded-lg bg-white/5 hover:bg-white/10 transition-colors"
                        style={{ animationDelay: `${idx * 50}ms` }}
                      >
                        <div className="w-2 h-2 rounded-full bg-[#00ff88]" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-white truncate">{event.type}</p>
                          <p className="text-xs text-white/50">
                            {formatters.relativeTime(event.timestamp, isSpanish ? 'es-ES' : 'en-US')}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </Card>
        )}

        {/* Ledger Accounts - 15 Divisas Ordenadas - MEJORADO */}
        <Card variant="glass" elevated>
          <CardHeader 
            title={isSpanish ? 'Cuentas del Ledger' : 'Ledger Accounts'}
            subtitle={`15 ${isSpanish ? 'divisas ordenadas por jerarquía' : 'currencies ordered by hierarchy'}`}
            icon={Database}
          />
          <div className="flex items-center gap-3 mb-6">
            <Database className="w-6 h-6 text-[#00ff88]" />
            <h2 className="text-2xl font-bold text-[#e0ffe0]">{t.advDashboardLedgerAccounts}</h2>
          </div>

          {ledgerAccounts.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 sm:gap-4">
              {ledgerAccounts.map((account, index) => {
                const isMainCurrency = index < 4;
                return (
                  <div
                    key={account.currency}
                    className={`
                      relative overflow-hidden
                      ${isMainCurrency
                        ? 'bg-gradient-to-br from-[#00ff88]/15 to-[#00cc6a]/10 border-2 border-[#00ff88]/50'
                        : 'bg-gradient-to-br from-white/5 to-white/[0.02] border-2 border-white/10'
                      }
                      rounded-2xl p-4
                      hover:scale-105 hover:border-[#00ff88]/60
                      transition-all duration-300
                      shadow-lg
                      group
                    `}
                    style={{ animationDelay: `${index * 30}ms` }}
                  >
                    {/* Glow effect para monedas principales */}
                    {isMainCurrency && (
                      <div className="absolute -inset-0.5 bg-gradient-to-r from-[#00ff88]/20 to-[#00cc6a]/20 rounded-2xl blur-lg -z-10 opacity-0 group-hover:opacity-100 transition-opacity" />
                    )}
                    
                    <div className="relative z-10">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <DollarSign className={`w-5 h-5 ${isMainCurrency ? 'text-[#00ff88]' : 'text-white/60'}`} />
                          <span className={`text-xl font-black ${isMainCurrency ? 'text-[#00ff88]' : 'text-white'}`}>
                            {account.currency}
                          </span>
                        </div>
                        {isMainCurrency && (
                          <span className="px-2 py-0.5 bg-[#00ff88] text-black text-xs font-bold rounded-full shadow-lg">
                            ★
                          </span>
                        )}
                      </div>

                      <div className="space-y-2">
                        <p className="text-lg font-bold text-white font-mono">
                          {balanceVisible ? formatters.currency(account.balance, account.currency) : '•••,•••.••'}
                        </p>
                        
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-white/50">
                            {account.transactionCount} tx
                          </span>
                          <StatusBadge 
                            status={account.status}
                            label={account.status.toUpperCase()}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-12">
              <Database className="w-16 h-16 text-white/20 mx-auto mb-4" />
              <p className="text-white/40">
                {isSpanish ? 'No hay cuentas ledger. Carga un archivo DTC1B para inicializar.' : 'No ledger accounts. Load a DTC1B file to initialize.'}
              </p>
            </div>
          )}
        </Card>

        {/* ✅ Currency Distribution MEJORADO */}
        <Card variant="glass" elevated>
          <CardHeader 
            title={t.advDashboardCurrencyDistribution}
            subtitle={isSpanish ? `${currencyStats.length} divisas detectadas` : `${currencyStats.length} currencies detected`}
            icon={PieChart}
          />

          {currencyStats.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {currencyStats.map((stats, idx) => (
                <div
                  key={stats.currency}
                  className="relative overflow-hidden bg-gradient-to-br from-white/5 to-white/[0.02] border-2 border-white/10 rounded-2xl p-5 hover:border-[#00ff88]/40 hover:scale-[1.02] transition-all duration-300 group shadow-lg"
                  style={{ animationDelay: `${idx * 50}ms` }}
                >
                  {/* Shimmer effect */}
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-[#00ff88]/5 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
                  
                  <div className="relative z-10">
                    {/* Header */}
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-2">
                        <div className="p-2 rounded-lg bg-[#00ff88]/10 border border-[#00ff88]/30">
                          <DollarSign className="w-5 h-5 text-[#00ff88]" />
                        </div>
                        <span className="text-2xl font-black text-white">{stats.currency}</span>
                      </div>
                      
                      <div className="text-right">
                        <p className="text-xs text-white/40">{isSpanish ? '% del total' : '% of total'}</p>
                        <p className="text-lg font-bold text-[#00ff88]">
                          {formatters.percentage(stats.percentageOfTotal, 1)}
                        </p>
                      </div>
                    </div>

                    {/* Balance */}
                    <div className="mb-4">
                      <p className="text-xs text-white/50 mb-1">{isSpanish ? 'Balance' : 'Balance'}</p>
                      <p className="text-2xl font-bold text-white">
                        {formatters.currency(stats.balance, stats.currency)}
                      </p>
                    </div>

                    {/* Métricas */}
                    <div className="grid grid-cols-2 gap-2 text-xs mb-3">
                      <div className="bg-black/30 rounded-lg p-2">
                        <p className="text-white/40">{isSpanish ? 'Transacciones' : 'Transactions'}</p>
                        <p className="text-white font-bold">{formatters.number(stats.transactionCount, 'en-US', 0)}</p>
                      </div>
                      <div className="bg-black/30 rounded-lg p-2">
                        <p className="text-white/40">{isSpanish ? 'Promedio' : 'Average'}</p>
                        <p className="text-white font-bold">{formatters.compact(stats.avgTransaction)}</p>
                      </div>
                    </div>
                    
                    {/* Movimientos */}
                    <div className="flex items-center gap-3 mb-3">
                      <div className="flex items-center gap-1">
                        <ArrowDownRight className="w-3.5 h-3.5 text-red-400" />
                        <span className="text-xs text-red-300 font-semibold">{stats.debitCount}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <ArrowUpRight className="w-3.5 h-3.5 text-[#00ff88]" />
                        <span className="text-xs text-[#00ff88] font-semibold">{stats.creditCount}</span>
                      </div>
                    </div>

                    {/* Progress bar de distribución */}
                    <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-[#00ff88] to-[#00cc6a] transition-all duration-500"
                        style={{ width: `${stats.percentageOfTotal}%` }}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <PieChart className="w-16 h-16 text-white/20 mx-auto mb-4" />
              <p className="text-white/40">
                {isSpanish ? 'No hay datos de distribución. Procesa transacciones para ver métricas.' : 'No distribution data. Process transactions to see metrics.'}
              </p>
            </div>
          )}
        </Card>

        {/* ✅ Transaction History MEJORADO */}
        <Card variant="glass" elevated>
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
            <CardHeader 
              title={t.advDashboardTransactionHistory}
              subtitle={isSpanish ? `${filteredTransactions.length} transacciones` : `${filteredTransactions.length} transactions`}
              icon={FileText}
            />

            <div className="flex items-center gap-2 flex-wrap">
              {/* Period Filter */}
              <select
                value={selectedPeriod}
                onChange={(e) => setSelectedPeriod(e.target.value)}
                className="bg-[#0d0d0d] border border-[#00ff88]/30 text-[#e0ffe0] px-3 py-2 rounded-lg text-sm focus:border-[#00ff88] focus:outline-none"
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
                className="bg-[#0d0d0d] border border-[#00ff88]/30 text-[#e0ffe0] px-3 py-2 rounded-lg text-sm focus:border-[#00ff88] focus:outline-none"
              >
                <option value="all">{t.advDashboardAllCurrencies}</option>
                {currencyStats.map(stats => (
                  <option key={stats.currency} value={stats.currency}>{stats.currency}</option>
                ))}
              </select>
            </div>
          </div>

          {filteredTransactions.length === 0 ? (
            <div className="py-16">
              <div className="text-center">
                <div className="relative inline-block mb-6">
                  <div className="absolute inset-0 bg-[#00ff88]/20 rounded-full blur-3xl animate-pulse" />
                  <div className="relative p-6 rounded-full bg-[#00ff88]/10 border-2 border-[#00ff88]/30">
                    <FileText className="w-16 h-16 text-[#00ff88]" />
                  </div>
                </div>
                <h3 className="text-2xl font-bold text-white mb-2">{t.advDashboardNoTransactions}</h3>
                <p className="text-white/50 max-w-md mx-auto">{t.advDashboardNoTransactionsMessage}</p>
              </div>
            </div>
          ) : (
            <div className="space-y-3 max-h-[600px] overflow-y-auto scrollbar-thin scrollbar-thumb-[#00ff88]/30 scrollbar-track-white/5 pr-2">
              {filteredTransactions.map((tx, idx) => (
                <div
                  key={tx.id}
                  className="relative overflow-hidden bg-gradient-to-br from-white/5 to-white/[0.02] border-2 border-white/10 rounded-2xl p-5 hover:border-[#00ff88]/40 hover:bg-white/[0.08] transition-all duration-300 group shadow-lg"
                  style={{ animationDelay: `${idx * 30}ms` }}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3 flex-1">
                      <div className="mt-1">
                        {tx.transactionType === 'debit' ? (
                          <ArrowDownRight className="w-8 h-8 text-red-400" />
                        ) : (
                          <ArrowUpRight className="w-8 h-8 text-[#00ff88]" />
                        )}
                      </div>

                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className={`text-sm font-bold ${tx.transactionType === 'debit' ? 'text-red-400' : 'text-[#00ff88]'}`}>
                            {tx.transactionType === 'debit' ? 'DÉBITO' : 'CRÉDITO'}
                          </span>
                          <span className="text-xs text-[#80ff80]">•</span>
                          <span className="text-xs font-bold text-[#e0ffe0]">{tx.currency}</span>
                        </div>

                        <p className="text-[#e0ffe0] font-semibold text-lg mb-1">
                          {formatCurrency(tx.amount, tx.currency)}
                        </p>

                        {tx.description && (
                          <p className="text-[#80ff80] text-sm mb-2">{tx.description}</p>
                        )}

                        {tx.recipientName && (
                          <div className="text-xs text-[#80ff80]">
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
                      <p className="text-xs text-white/40">
                        {formatters.dateTime(tx.createdAt, isSpanish ? 'es-ES' : 'en-US')}
                      </p>
                      <p className="text-xs text-[#00ff88] font-semibold">
                        {formatters.relativeTime(tx.createdAt, isSpanish ? 'es-ES' : 'en-US')}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
        
        {/* ✅ NUEVO: Resumen de Todos los Módulos */}
        <div className="grid lg:grid-cols-2 gap-6">
          
          {/* Módulos Conectados */}
          <Card variant="gradient" elevated>
            <CardHeader 
              title={isSpanish ? 'Módulos Conectados' : 'Connected Modules'}
              subtitle={isSpanish ? 'Estado en tiempo real' : 'Real-time status'}
              icon={Server}
            />
            
            <div className="space-y-3">
              {/* Analyzed Balances */}
              <div className="flex items-center justify-between p-4 rounded-xl bg-white/5 border border-white/10 hover:border-[#00ff88]/30 transition-all group">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-[#00ff88]/10 border border-[#00ff88]/30">
                    <FileText className="w-5 h-5 text-[#00ff88]" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-white">{isSpanish ? 'Analizador de Archivos' : 'File Analyzer'}</p>
                    <p className="text-xs text-white/50">
                      {analyzedBalances.length} {isSpanish ? 'divisas analizadas' : 'currencies analyzed'}
                    </p>
                  </div>
                </div>
                <StatusBadge 
                  status={analyzedBalances.length > 0 ? 'active' : 'inactive'}
                  pulsing={analyzedBalances.length > 0}
                />
              </div>
              
              {/* Custody */}
              <div className="flex items-center justify-between p-4 rounded-xl bg-white/5 border border-white/10 hover:border-purple-500/30 transition-all group">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-purple-500/10 border border-purple-500/30">
                    <Lock className="w-5 h-5 text-purple-300" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-white">{isSpanish ? 'Cuentas Custody' : 'Custody Accounts'}</p>
                    <p className="text-xs text-white/50">
                      {formatters.currency(additionalStats.custodyTotal, 'USD')}
                    </p>
                  </div>
                </div>
                <StatusBadge 
                  status={custodyAccounts.length > 0 ? 'active' : 'inactive'}
                  pulsing={custodyAccounts.length > 0}
                />
              </div>
              
              {/* Pledges */}
              <div className="flex items-center justify-between p-4 rounded-xl bg-white/5 border border-white/10 hover:border-amber-500/30 transition-all group">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-amber-500/10 border border-amber-500/30">
                    <Shield className="w-5 h-5 text-amber-300" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-white">Pledges</p>
                    <p className="text-xs text-white/50">
                      {additionalStats.pledgesCount} {isSpanish ? 'activos' : 'active'} · {formatters.compact(additionalStats.pledgesTotal)} USD
                    </p>
                  </div>
                </div>
                <StatusBadge 
                  status={pledges.length > 0 ? 'active' : 'inactive'}
                />
              </div>
              
              {/* Profiles */}
              <div className="flex items-center justify-between p-4 rounded-xl bg-white/5 border border-white/10 hover:border-cyan-500/30 transition-all group">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-cyan-500/10 border border-cyan-500/30">
                    <Layers className="w-5 h-5 text-cyan-300" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-white">{isSpanish ? 'Perfiles' : 'Profiles'}</p>
                    <p className="text-xs text-white/50">
                      {additionalStats.profilesCount} {isSpanish ? 'guardados' : 'saved'}
                    </p>
                  </div>
                </div>
                <span className="text-2xl font-bold text-cyan-300 font-mono">
                  {additionalStats.profilesCount}
                </span>
              </div>
            </div>
          </Card>
          
          {/* Quick Actions */}
          <Card variant="gradient" elevated>
            <CardHeader 
              title={isSpanish ? 'Acciones Rápidas' : 'Quick Actions'}
              subtitle={isSpanish ? 'Accede directamente a los módulos' : 'Direct access to modules'}
              icon={Zap}
            />
            
            <div className="grid grid-cols-2 gap-3">
              <button className="flex flex-col items-center gap-2 p-4 rounded-xl bg-white/5 border-2 border-white/10 hover:border-[#00ff88]/40 hover:bg-white/10 transition-all group">
                <FileText className="w-6 h-6 text-[#00ff88] group-hover:scale-110 transition-transform" />
                <span className="text-xs font-semibold text-white/70 group-hover:text-white">
                  {isSpanish ? 'Cargar Archivo' : 'Load File'}
                </span>
              </button>
              
              <button className="flex flex-col items-center gap-2 p-4 rounded-xl bg-white/5 border-2 border-white/10 hover:border-purple-500/40 hover:bg-white/10 transition-all group">
                <Lock className="w-6 h-6 text-purple-300 group-hover:scale-110 transition-transform" />
                <span className="text-xs font-semibold text-white/70 group-hover:text-white">
                  {isSpanish ? 'Nueva Custody' : 'New Custody'}
                </span>
              </button>
              
              <button className="flex flex-col items-center gap-2 p-4 rounded-xl bg-white/5 border-2 border-white/10 hover:border-amber-500/40 hover:bg-white/10 transition-all group">
                <Shield className="w-6 h-6 text-amber-300 group-hover:scale-110 transition-transform" />
                <span className="text-xs font-semibold text-white/70 group-hover:text-white">
                  {isSpanish ? 'Crear Pledge' : 'Create Pledge'}
                </span>
              </button>
              
              <button className="flex flex-col items-center gap-2 p-4 rounded-xl bg-white/5 border-2 border-white/10 hover:border-cyan-500/40 hover:bg-white/10 transition-all group">
                <Layers className="w-6 h-6 text-cyan-300 group-hover:scale-110 transition-transform" />
                <span className="text-xs font-semibold text-white/70 group-hover:text-white">
                  {isSpanish ? 'Guardar Perfil' : 'Save Profile'}
                </span>
              </button>
            </div>
            
            {/* System Health */}
            <div className="mt-6 pt-6 border-t border-white/10">
              <p className="text-xs font-semibold text-white/50 uppercase tracking-wider mb-3">
                {isSpanish ? 'Salud del Sistema' : 'System Health'}
              </p>
              
              <div className="grid grid-cols-3 gap-3">
                <div className="text-center p-3 rounded-xl bg-[#00ff88]/10 border border-[#00ff88]/20">
                  <p className="text-2xl font-bold text-[#00ff88] mb-1">
                    {formatters.percentage((dashboardStats.completedTransactions / (dashboardStats.totalTransactions || 1)) * 100, 0)}
                  </p>
                  <p className="text-xs text-white/50">{isSpanish ? 'Éxito' : 'Success'}</p>
                </div>
                
                <div className="text-center p-3 rounded-xl bg-white/5 border border-white/10">
                  <p className="text-2xl font-bold text-white mb-1">
                    {dashboardStats.totalCurrencies}
                  </p>
                  <p className="text-xs text-white/50">{isSpanish ? 'Divisas' : 'Currencies'}</p>
                </div>
                
                <div className="text-center p-3 rounded-xl bg-blue-500/10 border border-blue-500/20">
                  <p className="text-2xl font-bold text-blue-300 mb-1">
                    {custodyAccounts.length + profiles.length}
                  </p>
                  <p className="text-xs text-white/50">{isSpanish ? 'Activos' : 'Assets'}</p>
                </div>
              </div>
            </div>
          </Card>
        </div>

      </div>
    </div>
  );
}

