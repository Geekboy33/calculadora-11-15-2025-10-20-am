/**
 * Central Banking Dashboard - Digital Commercial Bank Ltd
 * Nivel Bancario Profesional de Primera Línea
 * Diseño inspirado en: JP Morgan, Goldman Sachs, Revolut Business
 */

import { useState, useEffect, useMemo } from 'react';
import {
  TrendingUp, DollarSign, Database, Activity, Shield, Wallet,
  Clock, CheckCircle, Lock, ChevronLeft, ChevronRight, BarChart3,
  Globe, Building2, Coins, Bell, RefreshCw, Sparkles, Users,
  FileText, ArrowRight, Download
} from 'lucide-react';
import { balanceStore, type CurrencyBalance } from '../lib/balances-store';
import { custodyStore, type CustodyAccount } from '../lib/custody-store';
import { unifiedPledgeStore, type UnifiedPledge } from '../lib/unified-pledge-store';
import { analyzerPersistenceStore } from '../lib/analyzer-persistence-store';
import { useLanguage } from '../lib/i18n';
import { useFormatters } from '../lib/professional-formatters';
import { BankingStyles, cn } from '../lib/design-system';
import { StatementExporter } from '../lib/statement-exporter';
import { useSwipeable } from '../hooks/useSwipeable';
import { useScrollReveal } from '../hooks/useScrollReveal';

interface DashboardMetrics {
  totalBalances: { [currency: string]: number };
  totalAccounts: number;
  activePledges: number;
  totalTransactions: number;
  activeCurrencies: number;
  ledgerProgress: number;
  systemHealth: 'excellent' | 'good' | 'warning' | 'critical';
  totalCustodyValue: number;
  totalPledgedValue: number;
  accountsByType: { blockchain: number; banking: number };
}

interface ActivityItem {
  id: string;
  type: 'account_created' | 'pledge_active' | 'transfer' | 'analysis';
  title: string;
  description: string;
  amount?: number;
  currency?: string;
  timestamp: string;
  status: 'success' | 'warning' | 'info';
}

export function CentralBankingDashboard() {
  const { language } = useLanguage();
  const isSpanish = language === 'es';
  const locale = isSpanish ? 'es-ES' : 'en-US';
  const fmt = useFormatters(locale);

  // States
  const [selectedCurrency, setSelectedCurrency] = useState<string>('USD');
  const [balances, setBalances] = useState<CurrencyBalance[]>([]);
  const [custodyAccounts, setCustodyAccounts] = useState<CustodyAccount[]>([]);
  const [pledges, setPledges] = useState<UnifiedPledge[]>([]);
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [filterType, setFilterType] = useState<'all' | 'blockchain' | 'banking'>('all');

  // Scroll reveal para secciones
  const { ref: metricsRef, isVisible: metricsVisible } = useScrollReveal({ threshold: 0.1 });
  const { ref: balanceRef, isVisible: balanceVisible } = useScrollReveal({ threshold: 0.1 });

  // Touch gestures para carousel de monedas
  const currencySwipeHandlers = useSwipeable({
    onSwipedLeft: () => {
      const currentIdx = currencies.indexOf(selectedCurrency);
      if (currentIdx < currencies.length - 1) {
        setSelectedCurrency(currencies[currentIdx + 1] || currencies[0]);
      }
    },
    onSwipedRight: () => {
      const currentIdx = currencies.indexOf(selectedCurrency);
      if (currentIdx > 0) {
        setSelectedCurrency(currencies[currentIdx - 1] || currencies[0]);
      }
    },
    trackMouse: true, // También funciona con mouse drag
  });

  // Update time every second
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Load and subscribe to data
  useEffect(() => {
    loadData();

    const unsubBalances = balanceStore.subscribe(setBalances);
    const unsubCustody = custodyStore.subscribe(setCustodyAccounts);
    const unsubPledges = unifiedPledgeStore.subscribe(setPledges);

    // Refresh data every 30 seconds
    const refreshInterval = setInterval(loadData, 30000);

    return () => {
      unsubBalances();
      unsubCustody();
      unsubPledges();
      clearInterval(refreshInterval);
    };
  }, []);

  const loadData = () => {
    const balanceData = balanceStore.loadBalances();
    if (balanceData) setBalances(balanceData.balances);

    const accounts = custodyStore.getAccounts();
    setCustodyAccounts(accounts);

    const allPledges = unifiedPledgeStore.getPledges();
    setPledges(allPledges);

    calculateMetrics();
  };

  const calculateMetrics = () => {
    const balanceData = balanceStore.loadBalances();
    const accounts = custodyStore.getAccounts();
    const allPledges = unifiedPledgeStore.getPledges();
    const progressInfo = analyzerPersistenceStore.getProgressInfo();

    const totalBalances: { [currency: string]: number } = {};

    // Consolidar balances
    if (balanceData) {
      balanceData.balances.forEach(b => {
        totalBalances[b.currency] = (totalBalances[b.currency] || 0) + (b.totalAmount || 0);
      });
    }

    accounts.forEach(acc => {
      totalBalances[acc.currency] = (totalBalances[acc.currency] || 0) + (acc.totalBalance || 0);
    });

    // System health logic
    let systemHealth: 'excellent' | 'good' | 'warning' | 'critical' = 'excellent';
    const totalAccounts = accounts.length;
    const activePledges = allPledges.filter(p => p.status === 'ACTIVE').length;

    if (totalAccounts === 0) systemHealth = 'warning';
    if (totalAccounts > 0 && activePledges > totalAccounts * 0.5) systemHealth = 'excellent';
    if (activePledges === 0 && totalAccounts > 0) systemHealth = 'good';

    setMetrics({
      totalBalances,
      totalAccounts,
      activePledges,
      totalTransactions: balanceData?.totalTransactions || 0,
      activeCurrencies: Object.keys(totalBalances).length,
      ledgerProgress: progressInfo?.progress || 0,
      systemHealth,
      totalCustodyValue: accounts.reduce((sum, acc) => sum + (acc.totalBalance || 0), 0),
      totalPledgedValue: allPledges.filter(p => p.status === 'ACTIVE').reduce((sum, p) => sum + (p.amount || 0), 0),
      accountsByType: {
        blockchain: accounts.filter(a => a.accountType === 'blockchain').length,
        banking: accounts.filter(a => a.accountType === 'banking').length
      }
    });
  };

  const handleRefresh = () => {
    setRefreshing(true);
    loadData();
    setTimeout(() => setRefreshing(false), 800);
  };

  const handleExportStatement = () => {
    if (!metrics) return;

    const statementData = {
      metrics: {
        totalBalances: metrics.totalBalances,
        totalAccounts: metrics.totalAccounts,
        activePledges: metrics.activePledges,
        totalTransactions: metrics.totalTransactions,
        activeCurrencies: metrics.activeCurrencies,
        ledgerProgress: metrics.ledgerProgress,
        systemHealth: metrics.systemHealth,
        totalCustodyValue: metrics.totalCustodyValue,
        totalPledgedValue: metrics.totalPledgedValue
      },
      balances,
      custodyAccounts,
      pledges,
      recentActivity: recentActivity.map(a => ({
        type: a.type,
        title: a.title,
        description: a.description,
        timestamp: a.timestamp
      }))
    };

    StatementExporter.downloadStatement(statementData, locale);
    
    // Show confirmation
    alert(isSpanish 
      ? '✅ Estado de cuentas descargado exitosamente'
      : '✅ Account statement downloaded successfully'
    );
  };

  // Sorted currencies
  const currencies = useMemo(() => {
    if (!metrics) return [];
    const priority = ['USD', 'EUR', 'GBP', 'CHF', 'JPY', 'CAD', 'AUD'];
    return Object.keys(metrics.totalBalances).sort((a, b) => {
      const idxA = priority.indexOf(a);
      const idxB = priority.indexOf(b);
      if (idxA !== -1 && idxB !== -1) return idxA - idxB;
      if (idxA !== -1) return -1;
      if (idxB !== -1) return 1;
      return metrics.totalBalances[b] - metrics.totalBalances[a];
    });
  }, [metrics]);

  // Navigate currency
  const navigateCurrency = (direction: 'next' | 'prev') => {
    const currentIdx = currencies.indexOf(selectedCurrency);
    if (direction === 'next') {
      setSelectedCurrency(currencies[(currentIdx + 1) % currencies.length] || currencies[0]);
    } else {
      setSelectedCurrency(currencies[(currentIdx - 1 + currencies.length) % currencies.length] || currencies[0]);
    }
  };

  // Recent activity
  const recentActivity = useMemo((): ActivityItem[] => {
    const items: ActivityItem[] = [];

    custodyAccounts.slice(-8).reverse().forEach(acc => {
      items.push({
        id: `acc-${acc.id}`,
        type: 'account_created',
        title: isSpanish ? 'Cuenta Creada' : 'Account Created',
        description: `${acc.accountName} (${acc.currency})`,
        amount: acc.totalBalance,
        currency: acc.currency,
        timestamp: new Date().toISOString(),
        status: 'success'
      });
    });

    pledges.filter(p => p.status === 'ACTIVE').slice(-8).reverse().forEach(p => {
      items.push({
        id: `pledge-${p.id}`,
        type: 'pledge_active',
        title: isSpanish ? 'Pledge Activado' : 'Pledge Activated',
        description: p.account_name,
        amount: p.amount,
        currency: p.currency,
        timestamp: p.created_at,
        status: 'warning'
      });
    });

    return items.slice(0, 12).sort((a, b) => 
      new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
  }, [custodyAccounts, pledges, isSpanish]);

  // Filtered accounts
  const filteredAccounts = useMemo(() => {
    if (filterType === 'all') return custodyAccounts;
    return custodyAccounts.filter(acc => acc.accountType === filterType);
  }, [custodyAccounts, filterType]);

  if (!metrics) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block w-16 h-16 border-4 border-white/30 border-t-transparent rounded-full animate-spin m-card" />
          <p className="text-[var(--text-secondary)] text-lg font-semibold">
            {isSpanish ? 'Cargando Panel Central...' : 'Loading Central Panel...'}
          </p>
        </div>
      </div>
    );
  }

  const currentCurrencyBalance = metrics.totalBalances[selectedCurrency] || 0;
  const currencyIndex = currencies.indexOf(selectedCurrency);

  return (
    <div className="w-full bg-black p-card-sm sm:p-card lg:p-card-lg">
      <div className="max-w-[1800px] mx-auto space-y-6">
        
        {/* Professional Header */}
        <header className="bg-gradient-to-br from-[#0d0d0d] via-[#141414] to-[#0d0d0d] border border-[#1a1a1a] rounded-2xl shadow-2xl p-card">
          <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-section">
            {/* Brand & Title */}
            <div className="flex items-center gap-card">
              <div className="relative">
                <div className="absolute inset-0 bg-white/20 blur-xl opacity-30" />
                <div className="relative bg-gradient-to-br from-white to-white p-card-sm rounded-xl">
                  <Building2 className="w-8 h-8 text-black" />
                </div>
              </div>
              <div>
                <h1 className="text-heading">
                  Digital Commercial Bank Ltd
                </h1>
                <p className="text-secondary">
                  {isSpanish ? 'Panel Central de Control' : 'Central Control Panel'} • {fmt.dateTime(currentTime)}
                </p>
              </div>
            </div>

            {/* Status & Actions */}
            <div className="flex flex-wrap items-center gap-3">
              {/* System Status */}
              <div 
                className={cn(
                  'flex items-center gap-2 px-4 py-2 rounded-lg border',
                  metrics.systemHealth === 'excellent' && 'bg-emerald-500/10 border-emerald-500/30',
                  metrics.systemHealth === 'good' && 'bg-white/5 border-white/15',
                  metrics.systemHealth === 'warning' && 'bg-amber-500/10 border-amber-500/30',
                  metrics.systemHealth === 'critical' && 'bg-red-500/10 border-red-500/30'
                )}
                role="status"
                aria-live="polite"
                aria-label={`System status: ${metrics.systemHealth}`}
              >
                <div 
                  className={cn(
                    'w-2 h-2 rounded-full',
                    metrics.systemHealth === 'excellent' && BankingStyles.status.dot.active,
                    metrics.systemHealth === 'good' && BankingStyles.status.dot.active,
                    metrics.systemHealth === 'warning' && BankingStyles.status.dot.warning,
                    metrics.systemHealth === 'critical' && BankingStyles.status.dot.error
                  )}
                  aria-hidden="true"
                />
                <span className={cn(
                  'text-sm font-semibold',
                  metrics.systemHealth === 'excellent' && 'text-emerald-400',
                  metrics.systemHealth === 'good' && 'text-white',
                  metrics.systemHealth === 'warning' && 'text-amber-400',
                  metrics.systemHealth === 'critical' && 'text-red-400'
                )}>
                  {isSpanish ? 'Sistema Operativo' : 'System Operational'}
                </span>
              </div>

              {/* Export Button */}
              <button
                onClick={handleExportStatement}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-gradient-to-r from-white to-white hover:from-white hover:to-white text-black font-semibold transition-all shadow-lg hover:shadow-white/20"
                aria-label={isSpanish ? 'Exportar estado financiero en formato TXT' : 'Export financial statement as TXT'}
              >
                <Download className="w-4 h-4" aria-hidden="true" />
                <span className="hidden sm:inline">{isSpanish ? 'Exportar TXT' : 'Export TXT'}</span>
              </button>

              {/* Refresh Button */}
              <button
                onClick={handleRefresh}
                disabled={refreshing}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[#141414] border border-[#1a1a1a] hover:border-[#1a1a1a] text-[var(--text-secondary)] hover:text-[var(--text-primary)] font-medium transition-all disabled:opacity-50"
                aria-label={isSpanish ? 'Actualizar datos del panel' : 'Refresh panel data'}
                aria-busy={refreshing ? 'true' : 'false'}
              >
                <RefreshCw className={cn('w-4 h-4', refreshing && 'animate-spin')} aria-hidden="true" />
                <span className="hidden sm:inline">{isSpanish ? 'Actualizar' : 'Refresh'}</span>
              </button>

              {/* Compliance Badges */}
              <div className="hidden lg:flex items-center gap-2">
                <div className={BankingStyles.badge.info}>
                  <Shield className="w-3 h-3 inline mr-1" />
                  ISO 27001
                </div>
                <div className={BankingStyles.badge.success}>
                  <CheckCircle className="w-3 h-3 inline mr-1" />
                  SOC 2 Type II
                </div>
              </div>
            </div>
          </div>
        </header>

        {/* Main Metrics - 4 Cards Premium */}
        <div 
          ref={metricsRef}
          className={`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-card stagger-container ${metricsVisible ? 'visible' : ''}`}
        >
          {/* Total Assets */}
          <div className={`${BankingStyles.metric.container} stagger-item`}>
            <div className="flex items-start justify-between m-card">
              <div>
                <p className={BankingStyles.metric.label}>
                  {isSpanish ? 'Activos Totales' : 'Total Assets'}
                </p>
                <p className={BankingStyles.metric.value}>
                  {fmt.currency(Object.values(metrics.totalBalances).reduce((sum, v) => sum + v, 0), 'USD')}
                </p>
              </div>
              <div className="p-3 bg-white/5 rounded-xl">
                <DollarSign className="w-6 h-6 text-white" />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-emerald-400" />
              <span className="text-emerald-400 text-sm font-semibold">
                {isSpanish ? '+12,3% este mes' : '+12.3% this month'}
              </span>
            </div>
          </div>

          {/* Active Accounts */}
          <div className={`${BankingStyles.metric.container} stagger-item`}>
            <div className="flex items-start justify-between m-card">
              <div>
                <p className={BankingStyles.metric.label}>
                  {isSpanish ? 'Cuentas Activas' : 'Active Accounts'}
                </p>
                <p className={BankingStyles.metric.value}>{metrics.totalAccounts}</p>
              </div>
              <div className="p-3 bg-emerald-500/10 rounded-xl">
                <Wallet className="w-6 h-6 text-emerald-400" />
              </div>
            </div>
            <div className="flex items-center gap-2 text-[var(--text-secondary)] text-sm">
              <Users className="w-4 h-4" />
              <span>{metrics.accountsByType.blockchain} Blockchain • {metrics.accountsByType.banking} Banking</span>
            </div>
          </div>

          {/* Active Pledges */}
          <div className={`${BankingStyles.metric.container} stagger-item`}>
            <div className="flex items-start justify-between m-card">
              <div>
                <p className={BankingStyles.metric.label}>
                  {isSpanish ? 'Fondos Reservados' : 'Reserved Funds'}
                </p>
                <p className={BankingStyles.metric.value}>
                  {fmt.currency(metrics.totalPledgedValue, 'USD')}
                </p>
              </div>
              <div className="p-3 bg-amber-500/10 rounded-xl">
                <Lock className="w-6 h-6 text-amber-400" />
              </div>
            </div>
            <div className="flex items-center gap-2 text-[var(--text-secondary)] text-sm">
              <FileText className="w-4 h-4" />
              <span>{metrics.activePledges} {isSpanish ? 'pledges activos' : 'active pledges'}</span>
            </div>
          </div>

          {/* Transactions */}
          <div className={BankingStyles.metric.container}>
            <div className="flex items-start justify-between m-card">
              <div>
                <p className={BankingStyles.metric.label}>
                  {isSpanish ? 'Transacciones' : 'Transactions'}
                </p>
                <p className={BankingStyles.metric.value}>{fmt.compact(metrics.totalTransactions)}</p>
              </div>
              <div className="p-3 bg-purple-500/10 rounded-xl">
                <Activity className="w-6 h-6 text-purple-400" />
              </div>
            </div>
            <div className="flex items-center gap-2 text-[var(--text-secondary)] text-sm">
              <Database className="w-4 h-4" />
              <span>{metrics.activeCurrencies} {isSpanish ? 'divisas' : 'currencies'}</span>
            </div>
          </div>
        </div>

        {/* Balance Carousel - Professional */}
        <div 
          ref={balanceRef}
          {...currencySwipeHandlers}
          className={`bg-gradient-to-br from-[#0d0d0d] via-[#141414] to-[#0d0d0d] border border-[#1a1a1a] rounded-2xl shadow-2xl overflow-hidden scroll-reveal ${balanceVisible ? 'visible' : ''}`}
        >
          <div className="p-card border-b border-[#1a1a1a]">
            <div className="flex items-center justify-between">
              <h2 className="text-heading-sm flex items-center gap-3">
                <Coins className="w-6 h-6 text-white" />
                {isSpanish ? 'Balances por Divisa' : 'Balance by Currency'}
              </h2>
              <div className="flex items-center gap-2">
                <span className="text-[var(--text-secondary)] text-sm">
                  {currencyIndex + 1} / {currencies.length}
                </span>
              </div>
            </div>
          </div>

          <div className="p-card-lg">
            <div className="flex items-center gap-section">
              {/* Previous Button */}
              <button
                onClick={() => navigateCurrency('prev')}
                disabled={currencies.length <= 1}
                aria-label={isSpanish ? 'Divisa anterior' : 'Previous currency'}
                className="flex-shrink-0 w-14 h-14 rounded-full bg-gradient-to-br from-[#141414] to-[#0d0d0d] border-2 border-[#1a1a1a] hover:border-white/30 text-[var(--text-secondary)] hover:text-white font-bold shadow-lg hover:shadow-white/20 transition-all disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center group"
              >
                <ChevronLeft className="w-7 h-7 group-hover:scale-110 transition-transform" />
              </button>

              {/* Balance Display - Premium */}
              <div className="flex-1">
                <div className="relative bg-gradient-to-br from-[#0d0d0d] to-[#141414] border-2 border-[#1a1a1a] rounded-2xl p-10 overflow-hidden">
                  {/* Background Glow */}
                  <div className="absolute inset-0 bg-gradient-to-r from-white/3 via-transparent to-white/3" />
                  
                  <div className="relative z-10 text-center">
                    {/* Currency Code */}
                    <div className="flex items-center justify-center gap-3 m-card">
                      <div className="flex items-center gap-2 bg-[#141414]/80 border border-[#1a1a1a] px-6 py-2 rounded-full backdrop-blur-sm">
                        <Globe className="w-5 h-5 text-white" />
                        <span className="text-[var(--text-primary)] text-xl font-bold tracking-wide">
                          {selectedCurrency}
                        </span>
                      </div>
                      <span className="text-[var(--text-muted)] text-sm">
                        {isSpanish ? 'Saldo Disponible' : 'Available Balance'}
                      </span>
                    </div>

                    {/* Main Balance */}
                    <p className="text-6xl sm:text-7xl font-bold text-[var(--text-primary)] m-card tracking-tight">
                      {fmt.currency(currentCurrencyBalance, selectedCurrency)}
                    </p>

                    {/* Stats Row */}
                    <div className="flex items-center justify-center gap-section text-sm">
                      <div className="flex items-center gap-2">
                        <Activity className="w-4 h-4 text-[var(--text-muted)]" />
                        <span className="text-[var(--text-secondary)]">
                          {balances.find(b => b.currency === selectedCurrency)?.transactionCount || 0} {isSpanish ? 'trans.' : 'txns'}
                        </span>
                      </div>
                      <div className="w-px h-4 bg-[var(--bg-active)]" />
                      <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4 text-[var(--text-muted)]" />
                        <span className="text-[var(--text-secondary)]">
                          {isSpanish ? 'Actualizado ahora' : 'Updated now'}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Currency Dots */}
                <div className="flex items-center justify-center gap-2 mt-6">
                  {currencies.map((curr, idx) => (
                    <button
                      key={curr}
                      onClick={() => setSelectedCurrency(curr)}
                      className={cn(
                        'transition-all rounded-full',
                        idx === currencyIndex
                          ? 'w-10 h-2 bg-sky-500 shadow-[0_0_12px_rgba(14,165,233,0.8)]'
                          : 'w-2 h-2 bg-[var(--bg-active)] hover:bg-slate-500'
                      )}
                      title={curr}
                    />
                  ))}
                </div>
              </div>

              {/* Next Button */}
              <button
                onClick={() => navigateCurrency('next')}
                disabled={currencies.length <= 1}
                aria-label={isSpanish ? 'Siguiente divisa' : 'Next currency'}
                className="flex-shrink-0 w-14 h-14 rounded-full bg-gradient-to-br from-[#141414] to-[#0d0d0d] border-2 border-[#1a1a1a] hover:border-white/30 text-[var(--text-secondary)] hover:text-white font-bold shadow-lg hover:shadow-white/20 transition-all disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center group"
              >
                <ChevronRight className="w-7 h-7 group-hover:scale-110 transition-transform" />
              </button>
            </div>
          </div>
        </div>

        {/* Main Grid */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-section">
          {/* Left Column - Accounts & Pledges */}
          <div className="xl:col-span-2 space-y-6">
            
            {/* Custody Accounts - Professional Table */}
            <div className="bg-gradient-to-br from-[#0d0d0d] via-[#141414] to-[#0d0d0d] border border-[#1a1a1a] rounded-2xl shadow-2xl overflow-hidden">
              <div className="p-card border-b border-[#1a1a1a]">
                <div className="flex items-center justify-between m-card">
                  <h2 className="text-heading-sm flex items-center gap-3">
                    <Shield className="w-6 h-6 text-white" />
                    {isSpanish ? 'Cuentas Custodio' : 'Custody Accounts'}
                  </h2>
                  <div className="flex items-center gap-3">
                    {/* Filter Buttons */}
                    <div className="flex items-center gap-1 bg-[#141414] p-1 rounded-lg">
                      <button
                        onClick={() => setFilterType('all')}
                        className={cn(
                          'px-3 py-1.5 rounded-md text-sm font-medium transition-all',
                          filterType === 'all' ? 'bg-white text-black' : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                        )}
                      >
                        {isSpanish ? 'Todas' : 'All'}
                      </button>
                      <button
                        onClick={() => setFilterType('blockchain')}
                        className={cn(
                          'px-3 py-1.5 rounded-md text-sm font-medium transition-all',
                          filterType === 'blockchain' ? 'bg-white text-black' : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                        )}
                      >
                        ⛓️ Blockchain
                      </button>
                      <button
                        onClick={() => setFilterType('banking')}
                        className={cn(
                          'px-3 py-1.5 rounded-md text-sm font-medium transition-all',
                          filterType === 'banking' ? 'bg-white text-black' : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                        )}
                      >
                        🏦 Banking
                      </button>
                    </div>
                    <div className="bg-[#141414] px-3 py-2 rounded-lg">
                      <span className="text-[var(--text-primary)] font-bold text-lg">{filteredAccounts.length}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Accounts Grid */}
              <div className="p-card">
                {filteredAccounts.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-card max-h-[600px] overflow-y-auto pr-2">
                    {filteredAccounts.map((account) => (
                      <div
                        key={account.id}
                        className="group bg-[#0d0d0d]/50 border border-[#1a1a1a] hover:border-white/20 rounded-xl p-5 transition-all hover:shadow-white/20 cursor-pointer"
                      >
                        {/* Header */}
                        <div className="flex items-start justify-between m-card">
                          <div className="flex-1">
                            <p className="text-[var(--text-primary)] font-bold text-base mb-1 group-hover:text-white transition-colors">
                              {account.accountName}
                            </p>
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="bg-white/5 border border-white/15 text-white px-2 py-0.5 rounded-md text-xs font-bold">
                                {account.currency}
                              </span>
                              <span className="text-[var(--text-muted)] text-xs">
                                {account.accountType === 'blockchain' ? '⛓️ Blockchain' : '🏦 Banking'}
                              </span>
                            </div>
                          </div>
                          {account.apiStatus === 'active' && (
                            <div className={BankingStyles.status.dot.active} />
                          )}
                        </div>

                        {/* Balances */}
                        <div className="space-y-2 text-sm">
                          <div className="flex justify-between items-center py-2 border-b border-[var(--border-subtle)]">
                            <span className="text-[var(--text-secondary)] font-medium">{isSpanish ? 'Total' : 'Total'}</span>
                            <span className="text-[var(--text-primary)] font-bold">
                              {fmt.currency(account.totalBalance, account.currency)}
                            </span>
                          </div>
                          <div className="flex justify-between items-center py-2 border-b border-[var(--border-subtle)]">
                            <span className="text-amber-400 font-medium">{isSpanish ? 'Reservado' : 'Reserved'}</span>
                            <span className="text-amber-300 font-bold">
                              {fmt.currency(account.reservedBalance, account.currency)}
                            </span>
                          </div>
                          <div className="flex justify-between items-center py-2">
                            <span className="text-emerald-400 font-medium">{isSpanish ? 'Disponible' : 'Available'}</span>
                            <span className="text-emerald-300 font-bold">
                              {fmt.currency(account.availableBalance, account.currency)}
                            </span>
                          </div>
                        </div>

                        {/* Progress Bar */}
                        <div className="mt-4">
                          <div className="flex justify-between text-xs text-[var(--text-muted)] mb-2">
                            <span>{isSpanish ? 'Utilización' : 'Utilization'}</span>
                            <span>
                              {account.totalBalance > 0 
                                ? ((account.reservedBalance / account.totalBalance) * 100).toFixed(1) 
                                : 0}%
                            </span>
                          </div>
                          <div className="w-full bg-[#141414] rounded-full h-1.5 overflow-hidden">
                            <div
                              className="h-full bg-gradient-to-r from-white to-white rounded-full transition-all duration-500"
                              style={{ 
                                width: `${account.totalBalance > 0 ? (account.reservedBalance / account.totalBalance) * 100 : 0}%` 
                              }}
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-20">
                    <Wallet className="w-20 h-20 text-slate-700 mx-auto m-card" />
                    <p className="text-[var(--text-secondary)] text-lg font-medium">
                      {isSpanish ? 'No hay cuentas custodio' : 'No custody accounts'}
                    </p>
                    <p className="text-[var(--text-muted)] text-sm mt-2">
                      {isSpanish ? 'Crea tu primera cuenta para comenzar' : 'Create your first account to get started'}
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Active Pledges - Professional */}
            <div className="bg-gradient-to-br from-[#0d0d0d] via-[#141414] to-[#0d0d0d] border border-[#1a1a1a] rounded-2xl shadow-2xl overflow-hidden">
              <div className="p-card border-b border-[#1a1a1a]">
                <div className="flex items-center justify-between">
                  <h2 className="text-heading-sm flex items-center gap-3">
                    <Lock className="w-6 h-6 text-amber-400" />
                    {isSpanish ? 'Reservas Activas (Pledges)' : 'Active Reserves (Pledges)'}
                  </h2>
                  <div className="flex items-center gap-2 bg-amber-500/10 border border-amber-500/30 px-4 py-2 rounded-lg">
                    <Sparkles className="w-4 h-4 text-amber-400" />
                    <span className="text-amber-400 font-bold text-xl">{metrics.activePledges}</span>
                  </div>
                </div>
              </div>

              <div className="p-card">
                {pledges.filter(p => p.status === 'ACTIVE').length > 0 ? (
                  <div className="space-y-3 max-h-[500px] overflow-y-auto pr-2">
                    {pledges.filter(p => p.status === 'ACTIVE').map((pledge) => (
                      <div
                        key={pledge.id}
                        className="bg-[#0d0d0d]/50 border border-[#1a1a1a] hover:border-amber-500/50 rounded-xl p-5 transition-all hover:shadow-amber group"
                      >
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex-1">
                            <p className="text-[var(--text-primary)] font-bold text-base mb-1 group-hover:text-amber-400 transition-colors">
                              {pledge.account_name}
                            </p>
                            <p className="text-[var(--text-secondary)] text-sm mb-3">{pledge.beneficiary}</p>
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="bg-amber-500/10 border border-amber-500/30 text-amber-400 px-2 py-1 rounded-md text-xs font-bold">
                                {pledge.currency}
                              </span>
                              <span className="bg-white/5 border border-white/15 text-white px-2 py-1 rounded-md text-xs font-bold">
                                {pledge.source_module}
                              </span>
                              {pledge.token_symbol && (
                                <span className="bg-purple-500/10 border border-purple-500/30 text-purple-400 px-2 py-1 rounded-md text-xs font-bold">
                                  {pledge.token_symbol}
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-amber-400 font-black text-2xl mb-1">
                              {fmt.currency(pledge.amount, pledge.currency)}
                            </p>
                            <p className="text-[var(--text-muted)] text-xs">
                              {fmt.date(pledge.created_at)}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-20">
                    <Lock className="w-20 h-20 text-slate-700 mx-auto m-card" />
                    <p className="text-[var(--text-secondary)] text-lg font-medium">
                      {isSpanish ? 'No hay pledges activos' : 'No active pledges'}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Right Column - Activity & Status */}
          <div className="space-y-6">
            {/* Ledger Analysis Status */}
            <div className="bg-gradient-to-br from-[#0d0d0d] via-[#141414] to-[#0d0d0d] border border-[#1a1a1a] rounded-2xl shadow-2xl p-card">
              <div className="flex items-center gap-3 m-section">
                <div className="p-3 bg-white/5 rounded-xl">
                  <Database className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-[var(--text-primary)]">
                    {isSpanish ? 'Análisis del Ledger' : 'Ledger Analysis'}
                  </h3>
                  <p className="text-[var(--text-muted)] text-xs">Digital Commercial Bank Ltd</p>
                </div>
              </div>

              {/* Progress */}
              <div className="m-section">
                <div className="flex justify-between items-center mb-3">
                  <span className="text-[var(--text-secondary)] text-sm font-medium">
                    {isSpanish ? 'Progreso de Análisis' : 'Analysis Progress'}
                  </span>
                  <span className="text-white font-bold text-xl">
                    {metrics.ledgerProgress.toFixed(1)}%
                  </span>
                </div>
                <div className="w-full bg-[#141414] rounded-full h-3 overflow-hidden border border-[#1a1a1a]">
                  <div
                    className="h-full bg-gradient-to-r from-white to-white rounded-full transition-all duration-500 relative overflow-hidden"
                    style={{ width: `${metrics.ledgerProgress}%` }}
                  >
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-pulse" />
                  </div>
                </div>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-2 gap-card">
                <div className="bg-[#0d0d0d]/50 border border-[#1a1a1a] rounded-lg p-card-sm">
                  <p className="text-[var(--text-muted)] text-xs mb-1">{isSpanish ? 'Divisas' : 'Currencies'}</p>
                  <p className="text-2xl font-bold text-[var(--text-primary)]">{metrics.activeCurrencies}</p>
                </div>
                <div className="bg-[#0d0d0d]/50 border border-[#1a1a1a] rounded-lg p-card-sm">
                  <p className="text-[var(--text-muted)] text-xs mb-1">{isSpanish ? 'Operaciones' : 'Operations'}</p>
                  <p className="text-2xl font-bold text-[var(--text-primary)]">{fmt.compact(metrics.totalTransactions)}</p>
                </div>
              </div>

              {metrics.ledgerProgress > 0 && metrics.ledgerProgress < 100 && (
                <div className="mt-4 bg-white/5 border border-white/15 rounded-lg p-3 flex items-center gap-3">
                  <Activity className="w-5 h-5 text-white animate-spin" />
                  <div className="flex-1">
                    <p className="text-white font-semibold text-sm">
                      {isSpanish ? 'Análisis en curso...' : 'Analysis in progress...'}
                    </p>
                    <p className="text-[var(--text-muted)] text-xs">
                      {isSpanish ? 'Puede continuar usando otros módulos' : 'You can continue using other modules'}
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Recent Activity Timeline */}
            <div className="bg-gradient-to-br from-[#0d0d0d] via-[#141414] to-[#0d0d0d] border border-[#1a1a1a] rounded-2xl shadow-2xl p-card">
              <div className="flex items-center gap-3 m-section">
                <div className="p-3 bg-purple-500/10 rounded-xl">
                  <Bell className="w-6 h-6 text-purple-400" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-[var(--text-primary)]">
                    {isSpanish ? 'Actividad Reciente' : 'Recent Activity'}
                  </h3>
                  <p className="text-[var(--text-muted)] text-xs">
                    {isSpanish ? 'Últimas operaciones del sistema' : 'Latest system operations'}
                  </p>
                </div>
              </div>

              <div className="space-y-3 max-h-[600px] overflow-y-auto pr-2">
                {recentActivity.length > 0 ? (
                  recentActivity.map((activity, idx) => (
                    <div
                      key={activity.id}
                      className="relative bg-[#0d0d0d]/50 border border-[#1a1a1a] hover:border-[#1a1a1a] rounded-lg p-card-sm transition-all group"
                    >
                      {/* Timeline Line */}
                      {idx < recentActivity.length - 1 && (
                        <div className="absolute left-[21px] top-[52px] bottom-[-12px] w-px bg-[#1a1a1a]" />
                      )}

                      <div className="flex items-start gap-3">
                        {/* Icon */}
                        <div className={cn(
                          'relative z-10 flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center border-2',
                          activity.status === 'success' && 'bg-emerald-500/10 border-emerald-500/30',
                          activity.status === 'warning' && 'bg-amber-500/10 border-amber-500/30',
                          activity.status === 'info' && 'bg-white/5 border-white/15'
                        )}>
                          {activity.type === 'account_created' && <Wallet className={cn('w-5 h-5', activity.status === 'success' && 'text-emerald-400')} />}
                          {activity.type === 'pledge_active' && <Lock className={cn('w-5 h-5', activity.status === 'warning' && 'text-amber-400')} />}
                          {activity.type === 'transfer' && <ArrowRight className={cn('w-5 h-5', activity.status === 'info' && 'text-white')} />}
                          {activity.type === 'analysis' && <BarChart3 className={cn('w-5 h-5', activity.status === 'info' && 'text-white')} />}
                        </div>

                        {/* Content */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between mb-1">
                            <p className="text-[var(--text-primary)] font-semibold text-sm group-hover:text-white transition-colors">
                              {activity.title}
                            </p>
                            {activity.amount && activity.currency && (
                              <span className="text-[var(--text-primary)] font-bold text-sm ml-2">
                                {fmt.currency(activity.amount, activity.currency)}
                              </span>
                            )}
                          </div>
                          <p className="text-[var(--text-secondary)] text-xs mb-2 truncate">
                            {activity.description}
                          </p>
                          <div className="flex items-center gap-2 text-[var(--text-muted)] text-xs">
                            <Clock className="w-3 h-3" />
                            <span>{fmt.relativeTime(activity.timestamp)}</span>
                            <span className="text-slate-700">•</span>
                            <span>{fmt.dateTime(activity.timestamp)}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-16">
                    <Activity className="w-16 h-16 text-slate-700 mx-auto m-card" />
                    <p className="text-[var(--text-secondary)] font-medium">
                      {isSpanish ? 'No hay actividad reciente' : 'No recent activity'}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Footer - Trust & Compliance */}
        <footer className="bg-gradient-to-r from-[#0d0d0d] via-[#141414] to-[#0d0d0d] border border-[#1a1a1a] rounded-2xl shadow-xl p-card">
          <div className="flex flex-wrap items-center justify-between gap-card">
            <div className="flex items-center gap-card text-sm">
              <div className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-emerald-400" />
                <span className="text-[var(--text-secondary)]">
                  {isSpanish ? 'Sistema Verificado' : 'Verified System'}
                </span>
              </div>
              <div className="hidden sm:block w-px h-4 bg-[#1a1a1a]" />
              <div className="hidden sm:flex items-center gap-2">
                <Shield className="w-4 h-4 text-white" />
                <span className="text-[var(--text-secondary)]">
                  {isSpanish ? 'Cumplimiento Total' : 'Fully Compliant'}
                </span>
              </div>
              <div className="hidden md:block w-px h-4 bg-[#1a1a1a]" />
              <div className="hidden md:flex items-center gap-2">
                <Lock className="w-4 h-4 text-amber-400" />
                <span className="text-[var(--text-secondary)]">
                  {isSpanish ? 'Encriptación de Grado Bancario' : 'Bank-Grade Encryption'}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className={BankingStyles.badge.success}>ISO 27001</div>
              <div className={BankingStyles.badge.info}>SOC 2 Type II</div>
              <div className={BankingStyles.badge.success}>PCI DSS</div>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}
