/**
 * Central Banking Dashboard - Digital Commercial Bank Ltd
 * Dashboard principal de última generación que consolida TODA la actividad del sistema
 */

import { useState, useEffect, useMemo } from 'react';
import {
  TrendingUp, DollarSign, Database, Activity, Shield, Users,
  ArrowUpRight, ArrowDownRight, Clock, CheckCircle, AlertCircle,
  Wallet, Lock, Unlock, Eye, EyeOff, ChevronLeft, ChevronRight,
  BarChart3, PieChart, LineChart, Zap, Globe, Server, FileText,
  CreditCard, Building2, Coins, TrendingDown, Star, Award,
  Bell, Settings, RefreshCw, Download, Upload, Play, Pause,
  Calendar, Target, Sparkles, Layers, Box
} from 'lucide-react';
import { balanceStore, type CurrencyBalance } from '../lib/balances-store';
import { custodyStore, type CustodyAccount } from '../lib/custody-store';
import { unifiedPledgeStore, type UnifiedPledge } from '../lib/unified-pledge-store';
import { ledgerPersistenceStore } from '../lib/ledger-persistence-store';
import { analyzerPersistenceStore } from '../lib/analyzer-persistence-store';
import { profilesStore } from '../lib/profiles-store';
import { analyticsStore } from '../lib/analytics-store';
import { transactionEventStore } from '../lib/transaction-event-store';
import { useLanguage } from '../lib/i18n';

interface DashboardStats {
  totalBalances: { [currency: string]: number };
  totalAccounts: number;
  totalPledges: number;
  totalTransactions: number;
  activeCurrencies: number;
  ledgerProgress: number;
  systemHealth: 'excellent' | 'good' | 'warning' | 'critical';
}

export function CentralBankingDashboard() {
  const { t, language } = useLanguage();
  const isSpanish = language === 'es';

  // States
  const [selectedCurrency, setSelectedCurrency] = useState<string>('ALL');
  const [balances, setBalances] = useState<CurrencyBalance[]>([]);
  const [custodyAccounts, setCustodyAccounts] = useState<CustodyAccount[]>([]);
  const [pledges, setPledges] = useState<UnifiedPledge[]>([]);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [showAllBalances, setShowAllBalances] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [currentBalanceIndex, setCurrentBalanceIndex] = useState(0);

  // Load all data
  useEffect(() => {
    loadAllData();

    // Subscribe to changes
    const unsubscribeBalances = balanceStore.subscribe(setBalances);
    const unsubscribeCustody = custodyStore.subscribe(setCustodyAccounts);
    const unsubscribePledges = unifiedPledgeStore.subscribe(setPledges);

    return () => {
      unsubscribeBalances();
      unsubscribeCustody();
      unsubscribePledges();
    };
  }, []);

  const loadAllData = () => {
    // Load balances
    const balanceData = balanceStore.loadBalances();
    if (balanceData) {
      setBalances(balanceData.balances);
    }

    // Load custody accounts
    const accounts = custodyStore.getAccounts();
    setCustodyAccounts(accounts);

    // Load pledges
    const allPledges = unifiedPledgeStore.getPledges();
    setPledges(allPledges);

    // Calculate stats
    calculateStats();
  };

  const calculateStats = () => {
    const balanceData = balanceStore.loadBalances();
    const accounts = custodyStore.getAccounts();
    const allPledges = unifiedPledgeStore.getPledges();
    const ledgerInfo = ledgerPersistenceStore.getStatus();
    const progressInfo = analyzerPersistenceStore.getProgressInfo();

    // Consolidar balances por divisa
    const totalBalances: { [currency: string]: number } = {};
    
    // From analyzer balances
    if (balanceData) {
      balanceData.balances.forEach(b => {
        totalBalances[b.currency] = (totalBalances[b.currency] || 0) + b.totalAmount;
      });
    }

    // From custody accounts
    accounts.forEach(acc => {
      totalBalances[acc.currency] = (totalBalances[acc.currency] || 0) + acc.totalBalance;
    });

    // System health
    let systemHealth: 'excellent' | 'good' | 'warning' | 'critical' = 'excellent';
    if (accounts.length === 0 && (!balanceData || balanceData.balances.length === 0)) {
      systemHealth = 'warning';
    }

    setStats({
      totalBalances,
      totalAccounts: accounts.length,
      totalPledges: allPledges.filter(p => p.status === 'ACTIVE').length,
      totalTransactions: balanceData?.totalTransactions || 0,
      activeCurrencies: Object.keys(totalBalances).length,
      ledgerProgress: progressInfo?.progress || ledgerInfo?.percentage || 0,
      systemHealth
    });
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    loadAllData();
    setTimeout(() => setRefreshing(false), 1000);
  };

  // Currency selector functions
  const currencies = useMemo(() => {
    if (!stats) return [];
    return Object.keys(stats.totalBalances).sort((a, b) => {
      const priority = ['USD', 'EUR', 'GBP', 'CHF', 'JPY'];
      const indexA = priority.indexOf(a);
      const indexB = priority.indexOf(b);
      if (indexA !== -1 && indexB !== -1) return indexA - indexB;
      if (indexA !== -1) return -1;
      if (indexB !== -1) return 1;
      return stats.totalBalances[b] - stats.totalBalances[a];
    });
  }, [stats]);

  const nextCurrency = () => {
    setCurrentBalanceIndex((prev) => (prev + 1) % currencies.length);
    setSelectedCurrency(currencies[(currentBalanceIndex + 1) % currencies.length]);
  };

  const prevCurrency = () => {
    setCurrentBalanceIndex((prev) => (prev - 1 + currencies.length) % currencies.length);
    setSelectedCurrency(currencies[(currentBalanceIndex - 1 + currencies.length) % currencies.length]);
  };

  const formatCurrency = (amount: number, currency: string): string => {
    try {
      return new Intl.NumberFormat(isSpanish ? 'es-ES' : 'en-US', {
        style: 'currency',
        currency: currency,
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      }).format(amount);
    } catch {
      return `${currency} ${amount.toLocaleString()}`;
    }
  };

  const formatNumber = (num: number): string => {
    return num.toLocaleString(isSpanish ? 'es-ES' : 'en-US');
  };

  // Recent activity
  const recentActivity = useMemo(() => {
    const activities: Array<{type: string; description: string; time: string; icon: any; color: string}> = [];

    // From custody accounts (últimas 5)
    custodyAccounts.slice(-5).reverse().forEach(acc => {
      activities.push({
        type: isSpanish ? 'Cuenta Creada' : 'Account Created',
        description: `${acc.accountName} (${acc.currency})`,
        time: new Date().toISOString(),
        icon: Wallet,
        color: '#00ff88'
      });
    });

    // From pledges (últimos 5)
    pledges.filter(p => p.status === 'ACTIVE').slice(-5).reverse().forEach(p => {
      activities.push({
        type: isSpanish ? 'Pledge Activo' : 'Active Pledge',
        description: `${p.account_name} - ${formatCurrency(p.amount, p.currency)}`,
        time: p.created_at,
        icon: Lock,
        color: '#ffa500'
      });
    });

    return activities.slice(0, 10).sort((a, b) => 
      new Date(b.time).getTime() - new Date(a.time).getTime()
    );
  }, [custodyAccounts, pledges, isSpanish]);

  if (!stats) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <Activity className="w-16 h-16 text-[#00ff88] animate-spin mx-auto mb-4" />
          <p className="text-[#00ff88] text-xl font-bold">
            {isSpanish ? 'Cargando Dashboard...' : 'Loading Dashboard...'}
          </p>
        </div>
      </div>
    );
  }

  const currentCurrencyBalance = selectedCurrency === 'ALL' 
    ? Object.values(stats.totalBalances).reduce((sum, val) => sum + val, 0)
    : stats.totalBalances[selectedCurrency] || 0;

  return (
    <div className="min-h-screen bg-black p-3 sm:p-6">
      <div className="max-w-[1920px] mx-auto pb-20">
        {/* Hero Header */}
        <div className="relative overflow-hidden bg-gradient-to-br from-[#0a0a0a] via-[#0d0d0d] to-[#0a0a0a] rounded-2xl shadow-[0_0_60px_rgba(0,255,136,0.3)] p-6 sm:p-8 lg:p-12 mb-6 border border-[#00ff88]/30">
          {/* Background Pattern */}
          <div className="absolute inset-0 opacity-5">
            <div className="absolute inset-0" style={{
              backgroundImage: 'radial-gradient(circle at 2px 2px, #00ff88 1px, transparent 1px)',
              backgroundSize: '40px 40px'
            }} />
          </div>

          <div className="relative z-10">
            <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
              <div className="flex-1">
                <div className="flex items-center gap-4 mb-4">
                  <div className="bg-gradient-to-br from-[#00ff88] to-[#00cc6a] p-4 rounded-2xl shadow-[0_0_30px_rgba(0,255,136,0.5)]">
                    <Building2 className="w-8 h-8 sm:w-12 sm:h-12 text-black" />
                  </div>
                  <div>
                    <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black text-[#e0ffe0] mb-2 tracking-tight">
                      Digital Commercial Bank Ltd
                    </h1>
                    <p className="text-[#80ff80] text-base sm:text-lg lg:text-xl font-semibold">
                      {isSpanish ? 'Panel Central de Control Bancario' : 'Central Banking Control Panel'}
                    </p>
                  </div>
                </div>

                {/* Real-time Status */}
                <div className="flex flex-wrap items-center gap-3">
                  <div className={`flex items-center gap-2 px-4 py-2 rounded-full border-2 ${
                    stats.systemHealth === 'excellent' ? 'bg-[#00ff88]/20 border-[#00ff88]/50' :
                    stats.systemHealth === 'good' ? 'bg-blue-500/20 border-blue-500/50' :
                    stats.systemHealth === 'warning' ? 'bg-yellow-500/20 border-yellow-500/50' :
                    'bg-red-500/20 border-red-500/50'
                  }`}>
                    <div className={`w-3 h-3 rounded-full animate-pulse ${
                      stats.systemHealth === 'excellent' ? 'bg-[#00ff88] shadow-[0_0_10px_#00ff88]' :
                      stats.systemHealth === 'good' ? 'bg-blue-500' :
                      stats.systemHealth === 'warning' ? 'bg-yellow-500' :
                      'bg-red-500'
                    }`} />
                    <span className={`font-bold text-sm ${
                      stats.systemHealth === 'excellent' ? 'text-[#00ff88]' :
                      stats.systemHealth === 'good' ? 'text-blue-400' :
                      stats.systemHealth === 'warning' ? 'text-yellow-400' :
                      'text-red-400'
                    }`}>
                      {isSpanish ? 'Sistema Operativo' : 'System Operational'}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-[#00ff88]/10 border-2 border-[#00ff88]/30">
                    <Clock className="w-4 h-4 text-[#00ff88]" />
                    <span className="text-[#00ff88] font-semibold text-sm">
                      {new Date().toLocaleTimeString(isSpanish ? 'es-ES' : 'en-US')}
                    </span>
                  </div>

                  <button
                    onClick={handleRefresh}
                    disabled={refreshing}
                    className="flex items-center gap-2 px-4 py-2 rounded-full bg-[#0a0a0a] border-2 border-[#00ff88]/30 hover:border-[#00ff88] text-[#00ff88] font-semibold text-sm transition-all disabled:opacity-50"
                  >
                    <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
                    {isSpanish ? 'Actualizar' : 'Refresh'}
                  </button>
                </div>
              </div>

              {/* Quick Stats Cards */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:min-w-[600px]">
                <div className="bg-gradient-to-br from-[#00ff88]/20 to-[#00cc6a]/10 border-2 border-[#00ff88]/40 rounded-xl p-4 backdrop-blur-sm">
                  <div className="flex items-center gap-2 mb-2">
                    <Database className="w-5 h-5 text-[#00ff88]" />
                    <span className="text-[#80ff80] text-xs font-semibold uppercase">
                      {isSpanish ? 'Divisas' : 'Currencies'}
                    </span>
                  </div>
                  <p className="text-3xl font-black text-[#e0ffe0]">{stats.activeCurrencies}</p>
                </div>

                <div className="bg-gradient-to-br from-blue-500/20 to-blue-600/10 border-2 border-blue-500/40 rounded-xl p-4 backdrop-blur-sm">
                  <div className="flex items-center gap-2 mb-2">
                    <Wallet className="w-5 h-5 text-blue-400" />
                    <span className="text-blue-300 text-xs font-semibold uppercase">
                      {isSpanish ? 'Cuentas' : 'Accounts'}
                    </span>
                  </div>
                  <p className="text-3xl font-black text-blue-100">{stats.totalAccounts}</p>
                </div>

                <div className="bg-gradient-to-br from-yellow-500/20 to-orange-500/10 border-2 border-yellow-500/40 rounded-xl p-4 backdrop-blur-sm">
                  <div className="flex items-center gap-2 mb-2">
                    <Lock className="w-5 h-5 text-yellow-400" />
                    <span className="text-yellow-300 text-xs font-semibold uppercase">
                      Pledges
                    </span>
                  </div>
                  <p className="text-3xl font-black text-yellow-100">{stats.totalPledges}</p>
                </div>

                <div className="bg-gradient-to-br from-purple-500/20 to-pink-500/10 border-2 border-purple-500/40 rounded-xl p-4 backdrop-blur-sm">
                  <div className="flex items-center gap-2 mb-2">
                    <Activity className="w-5 h-5 text-purple-400" />
                    <span className="text-purple-300 text-xs font-semibold uppercase">
                      {isSpanish ? 'Transacciones' : 'Transactions'}
                    </span>
                  </div>
                  <p className="text-3xl font-black text-purple-100">{formatNumber(stats.totalTransactions)}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Decorative Elements */}
          <div className="absolute top-0 right-0 w-96 h-96 bg-[#00ff88]/5 rounded-full blur-3xl" />
          <div className="absolute bottom-0 left-0 w-96 h-96 bg-blue-500/5 rounded-full blur-3xl" />
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          {/* Left Column - Balance Selector & Details */}
          <div className="xl:col-span-2 space-y-6">
            {/* Currency Balance Selector with Scroll */}
            <div className="bg-gradient-to-br from-[#0d0d0d] to-[#0a0a0a] border border-[#00ff88]/20 rounded-2xl shadow-[0_0_40px_rgba(0,255,136,0.2)] p-6 overflow-hidden">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-black text-[#e0ffe0] flex items-center gap-3">
                  <DollarSign className="w-7 h-7 text-[#00ff88]" />
                  {isSpanish ? 'Balances Consolidados' : 'Consolidated Balances'}
                </h2>
                <button
                  onClick={() => setShowAllBalances(!showAllBalances)}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[#00ff88]/10 border border-[#00ff88]/30 hover:bg-[#00ff88]/20 text-[#00ff88] font-semibold text-sm transition-all"
                >
                  {showAllBalances ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  {showAllBalances ? (isSpanish ? 'Ocultar' : 'Hide') : (isSpanish ? 'Ver Todos' : 'Show All')}
                </button>
              </div>

              {/* Scrollable Currency Selector */}
              {!showAllBalances && currencies.length > 0 && (
                <div className="relative">
                  {/* Navigation Buttons */}
                  <div className="flex items-center gap-4">
                    <button
                      onClick={prevCurrency}
                      disabled={currencies.length <= 1}
                      className="flex-shrink-0 w-12 h-12 rounded-full bg-gradient-to-r from-[#00ff88] to-[#00cc6a] hover:from-[#00cc6a] hover:to-[#00aa55] text-black font-bold shadow-[0_0_20px_rgba(0,255,136,0.4)] transition-all disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center"
                    >
                      <ChevronLeft className="w-6 h-6" />
                    </button>

                    {/* Current Balance Display */}
                    <div className="flex-1 bg-gradient-to-r from-[#00ff88]/10 via-[#00ff88]/5 to-[#00ff88]/10 border-2 border-[#00ff88]/40 rounded-2xl p-8 text-center relative overflow-hidden">
                      {/* Animated Background */}
                      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-[#00ff88]/10 to-transparent animate-pulse" />
                      
                      <div className="relative z-10">
                        <div className="flex items-center justify-center gap-3 mb-3">
                          <Coins className="w-8 h-8 text-[#00ff88]" />
                          <span className="text-[#80ff80] text-lg font-bold">
                            {currencies[currentBalanceIndex] || 'USD'}
                          </span>
                          <span className="text-xs text-[#4d7c4d] bg-[#00ff88]/20 px-3 py-1 rounded-full">
                            {currentBalanceIndex + 1} / {currencies.length}
                          </span>
                        </div>
                        <p className="text-5xl sm:text-6xl font-black text-[#e0ffe0] mb-2 drop-shadow-[0_0_20px_rgba(0,255,136,0.6)]">
                          {formatCurrency(stats.totalBalances[currencies[currentBalanceIndex]] || 0, currencies[currentBalanceIndex] || 'USD')}
                        </p>
                        <p className="text-[#4d7c4d] text-sm font-semibold">
                          {isSpanish ? 'Balance Total' : 'Total Balance'}
                        </p>
                      </div>
                    </div>

                    <button
                      onClick={nextCurrency}
                      disabled={currencies.length <= 1}
                      className="flex-shrink-0 w-12 h-12 rounded-full bg-gradient-to-r from-[#00ff88] to-[#00cc6a] hover:from-[#00cc6a] hover:to-[#00aa55] text-black font-bold shadow-[0_0_20px_rgba(0,255,136,0.4)] transition-all disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center"
                    >
                      <ChevronRight className="w-6 h-6" />
                    </button>
                  </div>

                  {/* Currency Dots Indicator */}
                  <div className="flex items-center justify-center gap-2 mt-4">
                    {currencies.map((curr, idx) => (
                      <button
                        key={curr}
                        onClick={() => {
                          setCurrentBalanceIndex(idx);
                          setSelectedCurrency(curr);
                        }}
                        className={`transition-all ${
                          idx === currentBalanceIndex
                            ? 'w-8 h-3 bg-[#00ff88] rounded-full shadow-[0_0_10px_rgba(0,255,136,0.8)]'
                            : 'w-3 h-3 bg-[#00ff88]/30 rounded-full hover:bg-[#00ff88]/50'
                        }`}
                        title={curr}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* All Balances Grid */}
              {showAllBalances && (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 max-h-[600px] overflow-y-auto pr-2">
                  {currencies.map((currency, idx) => (
                    <div
                      key={currency}
                      className="bg-gradient-to-br from-[#0a0a0a] to-[#0d0d0d] border border-[#00ff88]/30 rounded-xl p-5 hover:border-[#00ff88]/60 hover:shadow-[0_0_20px_rgba(0,255,136,0.2)] transition-all cursor-pointer group"
                      onClick={() => {
                        setSelectedCurrency(currency);
                        setCurrentBalanceIndex(idx);
                        setShowAllBalances(false);
                      }}
                    >
                      <div className="flex items-center gap-2 mb-3">
                        <div className="w-10 h-10 rounded-full bg-[#00ff88]/20 border border-[#00ff88]/40 flex items-center justify-center">
                          <span className="text-[#00ff88] font-bold text-lg">{currency.slice(0, 1)}</span>
                        </div>
                        <div className="flex-1">
                          <p className="text-[#e0ffe0] font-bold text-lg">{currency}</p>
                          <p className="text-[#4d7c4d] text-xs">
                            {isSpanish ? 'Balance Total' : 'Total Balance'}
                          </p>
                        </div>
                        <ArrowUpRight className="w-5 h-5 text-[#00ff88] opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>
                      <p className="text-2xl font-black text-[#e0ffe0] group-hover:text-[#00ff88] transition-colors">
                        {formatCurrency(stats.totalBalances[currency], currency)}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Custody Accounts Overview */}
            <div className="bg-gradient-to-br from-[#0d0d0d] to-[#0a0a0a] border border-blue-500/20 rounded-2xl shadow-[0_0_40px_rgba(59,130,246,0.15)] p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-black text-[#e0ffe0] flex items-center gap-3">
                  <Shield className="w-7 h-7 text-blue-400" />
                  {isSpanish ? 'Cuentas Custodio' : 'Custody Accounts'}
                </h2>
                <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-500/10 border border-blue-500/30">
                  <span className="text-blue-400 font-bold text-2xl">{stats.totalAccounts}</span>
                  <span className="text-blue-300 text-sm">{isSpanish ? 'activas' : 'active'}</span>
                </div>
              </div>

              {custodyAccounts.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-[400px] overflow-y-auto pr-2">
                  {custodyAccounts.slice(0, 8).map((account) => (
                    <div
                      key={account.id}
                      className="bg-[#0a0a0a] border border-blue-500/20 rounded-xl p-4 hover:border-blue-500/40 hover:shadow-[0_0_15px_rgba(59,130,246,0.2)] transition-all"
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1">
                          <p className="text-[#e0ffe0] font-bold text-sm mb-1">{account.accountName}</p>
                          <div className="flex items-center gap-2">
                            <span className="bg-blue-500/20 border border-blue-500/40 text-blue-400 px-2 py-0.5 rounded-full text-xs font-bold">
                              {account.currency}
                            </span>
                            <span className="text-[#4d7c4d] text-xs">
                              {account.accountType === 'blockchain' ? '⛓️ Blockchain' : '🏦 Banking'}
                            </span>
                          </div>
                        </div>
                        {account.apiStatus === 'active' && (
                          <div className="w-2 h-2 rounded-full bg-[#00ff88] shadow-[0_0_8px_#00ff88] animate-pulse" />
                        )}
                      </div>
                      <div className="space-y-2">
                        <div className="flex justify-between items-center">
                          <span className="text-[#80ff80] text-xs">{isSpanish ? 'Total' : 'Total'}:</span>
                          <span className="text-[#e0ffe0] font-bold text-sm">
                            {formatCurrency(account.totalBalance, account.currency)}
                          </span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-yellow-400 text-xs">{isSpanish ? 'Reservado' : 'Reserved'}:</span>
                          <span className="text-yellow-300 font-bold text-sm">
                            {formatCurrency(account.reservedBalance, account.currency)}
                          </span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-[#00ff88] text-xs">{isSpanish ? 'Disponible' : 'Available'}:</span>
                          <span className="text-[#00ff88] font-bold text-sm">
                            {formatCurrency(account.availableBalance, account.currency)}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12 text-[#4d7c4d]">
                  <Wallet className="w-16 h-16 mx-auto mb-4 opacity-30" />
                  <p className="text-lg font-semibold">
                    {isSpanish ? 'No hay cuentas custodio creadas' : 'No custody accounts created'}
                  </p>
                </div>
              )}
            </div>

            {/* Active Pledges */}
            <div className="bg-gradient-to-br from-[#0d0d0d] to-[#0a0a0a] border border-yellow-500/20 rounded-2xl shadow-[0_0_40px_rgba(234,179,8,0.15)] p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-black text-[#e0ffe0] flex items-center gap-3">
                  <Lock className="w-7 h-7 text-yellow-400" />
                  {isSpanish ? 'Pledges Activos' : 'Active Pledges'}
                </h2>
                <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-yellow-500/10 border border-yellow-500/30">
                  <Sparkles className="w-4 h-4 text-yellow-400" />
                  <span className="text-yellow-400 font-bold text-xl">{stats.totalPledges}</span>
                </div>
              </div>

              {pledges.filter(p => p.status === 'ACTIVE').length > 0 ? (
                <div className="space-y-3 max-h-[350px] overflow-y-auto pr-2">
                  {pledges.filter(p => p.status === 'ACTIVE').slice(0, 10).map((pledge) => (
                    <div
                      key={pledge.id}
                      className="bg-[#0a0a0a] border border-yellow-500/20 rounded-xl p-4 hover:border-yellow-500/40 hover:shadow-[0_0_15px_rgba(234,179,8,0.2)] transition-all"
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1">
                          <p className="text-[#e0ffe0] font-bold text-sm mb-1">{pledge.account_name}</p>
                          <p className="text-[#4d7c4d] text-xs mb-2">{pledge.beneficiary}</p>
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="bg-yellow-500/20 border border-yellow-500/40 text-yellow-400 px-2 py-0.5 rounded-full text-xs font-bold">
                              {pledge.currency}
                            </span>
                            <span className="bg-[#00ff88]/20 border border-[#00ff88]/40 text-[#00ff88] px-2 py-0.5 rounded-full text-xs font-bold">
                              {pledge.source_module}
                            </span>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-yellow-400 font-black text-xl">
                            {formatCurrency(pledge.amount, pledge.currency)}
                          </p>
                          <p className="text-[#4d7c4d] text-xs mt-1">
                            {new Date(pledge.created_at).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12 text-[#4d7c4d]">
                  <Lock className="w-16 h-16 mx-auto mb-4 opacity-30" />
                  <p className="text-lg font-semibold">
                    {isSpanish ? 'No hay pledges activos' : 'No active pledges'}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Right Column - Activity & Status */}
          <div className="space-y-6">
            {/* Ledger Status */}
            <div className="bg-gradient-to-br from-[#0d0d0d] to-[#0a0a0a] border border-[#00ff88]/20 rounded-2xl shadow-[0_0_40px_rgba(0,255,136,0.15)] p-6">
              <div className="flex items-center gap-3 mb-6">
                <div className="bg-gradient-to-br from-[#00ff88] to-[#00cc6a] p-3 rounded-xl shadow-[0_0_20px_rgba(0,255,136,0.4)]">
                  <FileText className="w-6 h-6 text-black" />
                </div>
                <div>
                  <h3 className="text-xl font-black text-[#e0ffe0]">
                    {isSpanish ? 'Estado del Ledger' : 'Ledger Status'}
                  </h3>
                  <p className="text-[#4d7c4d] text-sm">Digital Commercial Bank Ltd</p>
                </div>
              </div>

              <div className="space-y-4">
                {/* Progress Bar */}
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-[#80ff80] text-sm font-semibold">
                      {isSpanish ? 'Progreso de Análisis' : 'Analysis Progress'}
                    </span>
                    <span className="text-[#00ff88] font-bold text-lg">
                      {stats.ledgerProgress.toFixed(1)}%
                    </span>
                  </div>
                  <div className="w-full bg-[#1a1a1a] rounded-full h-4 overflow-hidden border border-[#00ff88]/20">
                    <div
                      className="bg-gradient-to-r from-[#00ff88] to-[#00cc6a] h-full rounded-full transition-all duration-500 shadow-[0_0_15px_rgba(0,255,136,0.6)] relative overflow-hidden"
                      style={{ width: `${stats.ledgerProgress}%` }}
                    >
                      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-pulse" />
                    </div>
                  </div>
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-[#00ff88]/5 border border-[#00ff88]/20 rounded-lg p-3">
                    <p className="text-[#80ff80] text-xs mb-1">{isSpanish ? 'Divisas' : 'Currencies'}</p>
                    <p className="text-2xl font-black text-[#e0ffe0]">{stats.activeCurrencies}</p>
                  </div>
                  <div className="bg-[#00ff88]/5 border border-[#00ff88]/20 rounded-lg p-3">
                    <p className="text-[#80ff80] text-xs mb-1">{isSpanish ? 'Transacciones' : 'Transactions'}</p>
                    <p className="text-2xl font-black text-[#e0ffe0]">{formatNumber(stats.totalTransactions)}</p>
                  </div>
                </div>

                {stats.ledgerProgress < 100 && stats.ledgerProgress > 0 && (
                  <div className="bg-[#00ff88]/10 border border-[#00ff88]/30 rounded-lg p-3 flex items-center gap-3">
                    <Activity className="w-5 h-5 text-[#00ff88] animate-spin" />
                    <div className="flex-1">
                      <p className="text-[#00ff88] font-bold text-sm">
                        {isSpanish ? 'Procesando en segundo plano...' : 'Processing in background...'}
                      </p>
                      <p className="text-[#4d7c4d] text-xs">
                        {isSpanish ? 'Continúa usando otros módulos' : 'Continue using other modules'}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Recent Activity */}
            <div className="bg-gradient-to-br from-[#0d0d0d] to-[#0a0a0a] border border-purple-500/20 rounded-2xl shadow-[0_0_40px_rgba(168,85,247,0.15)] p-6">
              <div className="flex items-center gap-3 mb-6">
                <div className="bg-gradient-to-br from-purple-500 to-purple-600 p-3 rounded-xl shadow-[0_0_20px_rgba(168,85,247,0.4)]">
                  <Bell className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h3 className="text-xl font-black text-[#e0ffe0]">
                    {isSpanish ? 'Actividad Reciente' : 'Recent Activity'}
                  </h3>
                  <p className="text-[#4d7c4d] text-sm">{isSpanish ? 'Últimas acciones' : 'Latest actions'}</p>
                </div>
              </div>

              <div className="space-y-3 max-h-[500px] overflow-y-auto pr-2">
                {recentActivity.length > 0 ? (
                  recentActivity.map((activity, idx) => {
                    const Icon = activity.icon;
                    return (
                      <div
                        key={idx}
                        className="bg-[#0a0a0a] border border-[#1a1a1a] rounded-lg p-4 hover:border-[#00ff88]/30 transition-all group"
                      >
                        <div className="flex items-start gap-3">
                          <div className={`p-2 rounded-lg`} style={{ backgroundColor: `${activity.color}20`, border: `1px solid ${activity.color}40` }}>
                            <Icon className="w-5 h-5" style={{ color: activity.color }} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-[#e0ffe0] font-semibold text-sm mb-1">{activity.type}</p>
                            <p className="text-[#80ff80] text-xs mb-2 truncate">{activity.description}</p>
                            <p className="text-[#4d7c4d] text-xs flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {new Date(activity.time).toLocaleString(isSpanish ? 'es-ES' : 'en-US')}
                            </p>
                          </div>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="text-center py-12 text-[#4d7c4d]">
                    <Activity className="w-16 h-16 mx-auto mb-4 opacity-30" />
                    <p className="text-lg font-semibold">
                      {isSpanish ? 'No hay actividad reciente' : 'No recent activity'}
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* System Metrics */}
            <div className="bg-gradient-to-br from-[#0d0d0d] to-[#0a0a0a] border border-[#00ff88]/20 rounded-2xl shadow-[0_0_40px_rgba(0,255,136,0.15)] p-6">
              <h3 className="text-xl font-black text-[#e0ffe0] mb-6 flex items-center gap-3">
                <Target className="w-6 h-6 text-[#00ff88]" />
                {isSpanish ? 'Métricas del Sistema' : 'System Metrics'}
              </h3>

              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-[#0a0a0a] border border-[#1a1a1a] rounded-xl hover:border-[#00ff88]/30 transition-all">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-[#00ff88]/20 border border-[#00ff88]/40 flex items-center justify-center">
                      <TrendingUp className="w-5 h-5 text-[#00ff88]" />
                    </div>
                    <span className="text-[#e0ffe0] font-semibold">
                      {isSpanish ? 'Balance Total (USD)' : 'Total Balance (USD)'}
                    </span>
                  </div>
                  <span className="text-[#00ff88] font-black text-xl">
                    {formatCurrency(stats.totalBalances['USD'] || 0, 'USD')}
                  </span>
                </div>

                <div className="flex items-center justify-between p-4 bg-[#0a0a0a] border border-[#1a1a1a] rounded-xl hover:border-blue-500/30 transition-all">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-blue-500/20 border border-blue-500/40 flex items-center justify-center">
                      <Shield className="w-5 h-5 text-blue-400" />
                    </div>
                    <span className="text-[#e0ffe0] font-semibold">
                      {isSpanish ? 'Fondos Custodiados' : 'Custodied Funds'}
                    </span>
                  </div>
                  <span className="text-blue-400 font-black text-xl">
                    {formatCurrency(
                      custodyAccounts.reduce((sum, acc) => sum + acc.totalBalance, 0),
                      'USD'
                    )}
                  </span>
                </div>

                <div className="flex items-center justify-between p-4 bg-[#0a0a0a] border border-[#1a1a1a] rounded-xl hover:border-yellow-500/30 transition-all">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-yellow-500/20 border border-yellow-500/40 flex items-center justify-center">
                      <Lock className="w-5 h-5 text-yellow-400" />
                    </div>
                    <span className="text-[#e0ffe0] font-semibold">
                      {isSpanish ? 'Fondos Reservados' : 'Reserved Funds'}
                    </span>
                  </div>
                  <span className="text-yellow-400 font-black text-xl">
                    {formatCurrency(
                      pledges.filter(p => p.status === 'ACTIVE').reduce((sum, p) => sum + p.amount, 0),
                      'USD'
                    )}
                  </span>
                </div>

                <div className="flex items-center justify-between p-4 bg-[#0a0a0a] border border-[#1a1a1a] rounded-xl hover:border-purple-500/30 transition-all">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-purple-500/20 border border-purple-500/40 flex items-center justify-center">
                      <Layers className="w-5 h-5 text-purple-400" />
                    </div>
                    <span className="text-[#e0ffe0] font-semibold">
                      {isSpanish ? 'Perfiles Guardados' : 'Saved Profiles'}
                    </span>
                  </div>
                  <span className="text-purple-400 font-black text-xl">
                    {profilesStore.getProfiles().length}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Section - Charts & Analytics */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
          {/* Currency Distribution */}
          <div className="bg-gradient-to-br from-[#0d0d0d] to-[#0a0a0a] border border-[#00ff88]/20 rounded-2xl shadow-[0_0_40px_rgba(0,255,136,0.15)] p-6">
            <h3 className="text-xl font-black text-[#e0ffe0] mb-6 flex items-center gap-3">
              <PieChart className="w-6 h-6 text-[#00ff88]" />
              {isSpanish ? 'Distribución por Divisa' : 'Currency Distribution'}
            </h3>

            <div className="space-y-3">
              {currencies.slice(0, 8).map((currency, idx) => {
                const amount = stats.totalBalances[currency];
                const total = Object.values(stats.totalBalances).reduce((sum, val) => sum + val, 0);
                const percentage = total > 0 ? (amount / total) * 100 : 0;

                return (
                  <div key={currency} className="group">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className="text-[#e0ffe0] font-bold">{currency}</span>
                        <span className="text-[#4d7c4d] text-sm">{percentage.toFixed(1)}%</span>
                      </div>
                      <span className="text-[#00ff88] font-bold text-sm">
                        {formatCurrency(amount, currency)}
                      </span>
                    </div>
                    <div className="w-full bg-[#1a1a1a] rounded-full h-2 overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-[#00ff88] to-[#00cc6a] rounded-full transition-all duration-500 group-hover:shadow-[0_0_10px_rgba(0,255,136,0.6)]"
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Account Types Summary */}
          <div className="bg-gradient-to-br from-[#0d0d0d] to-[#0a0a0a] border border-blue-500/20 rounded-2xl shadow-[0_0_40px_rgba(59,130,246,0.15)] p-6">
            <h3 className="text-xl font-black text-[#e0ffe0] mb-6 flex items-center gap-3">
              <BarChart3 className="w-6 h-6 text-blue-400" />
              {isSpanish ? 'Resumen de Cuentas' : 'Accounts Summary'}
            </h3>

            <div className="space-y-4">
              {/* Blockchain Accounts */}
              <div className="bg-[#0a0a0a] border border-blue-500/20 rounded-xl p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Globe className="w-5 h-5 text-blue-400" />
                    <span className="text-[#e0ffe0] font-bold">
                      {isSpanish ? 'Cuentas Blockchain' : 'Blockchain Accounts'}
                    </span>
                  </div>
                  <span className="text-blue-400 font-black text-2xl">
                    {custodyAccounts.filter(a => a.accountType === 'blockchain').length}
                  </span>
                </div>
                <div className="h-2 bg-[#1a1a1a] rounded-full overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-blue-500 to-blue-600 rounded-full" style={{
                    width: `${custodyAccounts.length > 0 ? (custodyAccounts.filter(a => a.accountType === 'blockchain').length / custodyAccounts.length) * 100 : 0}%`
                  }} />
                </div>
              </div>

              {/* Banking Accounts */}
              <div className="bg-[#0a0a0a] border border-[#00ff88]/20 rounded-xl p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Building2 className="w-5 h-5 text-[#00ff88]" />
                    <span className="text-[#e0ffe0] font-bold">
                      {isSpanish ? 'Cuentas Bancarias' : 'Banking Accounts'}
                    </span>
                  </div>
                  <span className="text-[#00ff88] font-black text-2xl">
                    {custodyAccounts.filter(a => a.accountType === 'banking').length}
                  </span>
                </div>
                <div className="h-2 bg-[#1a1a1a] rounded-full overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-[#00ff88] to-[#00cc6a] rounded-full" style={{
                    width: `${custodyAccounts.length > 0 ? (custodyAccounts.filter(a => a.accountType === 'banking').length / custodyAccounts.length) * 100 : 0}%`
                  }} />
                </div>
              </div>

              {/* Pledge Status */}
              <div className="bg-[#0a0a0a] border border-yellow-500/20 rounded-xl p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Lock className="w-5 h-5 text-yellow-400" />
                    <span className="text-[#e0ffe0] font-bold">
                      {isSpanish ? 'Pledges Activos' : 'Active Pledges'}
                    </span>
                  </div>
                  <span className="text-yellow-400 font-black text-2xl">
                    {pledges.filter(p => p.status === 'ACTIVE').length}
                  </span>
                </div>
                <div className="flex gap-2 text-xs">
                  <div className="flex-1 bg-[#00ff88]/10 border border-[#00ff88]/20 rounded px-2 py-1 text-center">
                    <p className="text-[#00ff88] font-bold">
                      {pledges.filter(p => p.source_module === 'API_VUSD').length}
                    </p>
                    <p className="text-[#4d7c4d]">VUSD</p>
                  </div>
                  <div className="flex-1 bg-blue-500/10 border border-blue-500/20 rounded px-2 py-1 text-center">
                    <p className="text-blue-400 font-bold">
                      {pledges.filter(p => p.source_module === 'API_VUSD1').length}
                    </p>
                    <p className="text-[#4d7c4d]">VUSD1</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Banner - Quick Actions */}
        <div className="mt-6 bg-gradient-to-r from-[#0a0a0a] via-[#0d0d0d] to-[#0a0a0a] border border-[#00ff88]/20 rounded-2xl shadow-[0_0_40px_rgba(0,255,136,0.15)] p-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <Sparkles className="w-6 h-6 text-[#00ff88]" />
              <div>
                <p className="text-[#e0ffe0] font-bold text-lg">
                  {isSpanish ? 'Sistema Operativo y Seguro' : 'System Operational & Secure'}
                </p>
                <p className="text-[#4d7c4d] text-sm">
                  {isSpanish ? 'Todos los módulos funcionando correctamente' : 'All modules functioning correctly'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[#00ff88]/10 border border-[#00ff88]/30">
                <CheckCircle className="w-5 h-5 text-[#00ff88]" />
                <span className="text-[#00ff88] font-bold">
                  {isSpanish ? 'Verificado' : 'Verified'}
                </span>
              </div>
              <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-500/10 border border-blue-500/30">
                <Shield className="w-5 h-5 text-blue-400" />
                <span className="text-blue-400 font-bold">
                  {isSpanish ? 'Seguro' : 'Secure'}
                </span>
              </div>
              <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-purple-500/10 border border-purple-500/30">
                <Zap className="w-5 h-5 text-purple-400" />
                <span className="text-purple-400 font-bold">
                  {isSpanish ? 'Activo' : 'Active'}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

