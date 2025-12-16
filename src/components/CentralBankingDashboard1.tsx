/**
 * Central Panel 1 - Digital Commercial Bank Ltd
 * CLON del Central Banking Dashboard alimentado por Treasury Reserve1
 * Usa ledgerPersistenceStoreV2 para datos en tiempo real
 */

import { useState, useEffect, useMemo } from 'react';
import {
  TrendingUp, DollarSign, Database, Activity, Shield, Wallet,
  Clock, CheckCircle, Lock, ChevronLeft, ChevronRight, BarChart3,
  Globe, Building2, Coins, Bell, RefreshCw, Sparkles, Users,
  FileText, ArrowRight, Download, Cpu, Zap
} from 'lucide-react';
import { ledgerPersistenceStoreV2, type LedgerBalanceV2 } from '../lib/ledger-persistence-store-v2';
import { useLanguage } from '../lib/i18n';

// Tipos locales
interface DashboardMetrics {
  totalBalances: { [currency: string]: number };
  totalAccounts: number;
  totalTransactions: number;
  activeCurrencies: number;
  ledgerProgress: number;
  systemHealth: 'excellent' | 'good' | 'warning' | 'critical';
  currentQuadrillion: number;
  isProcessing: boolean;
}

// Formateador de moneda completo
function formatCurrencyFull(amount: number): string {
  if (amount <= 0) return '$0.00';
  const bigAmount = BigInt(Math.floor(amount));
  return '$' + bigAmount.toLocaleString('en-US') + '.00';
}

function formatQuadrillion(q: number): string {
  return q.toLocaleString() + ' Quadrillion';
}

export function CentralBankingDashboard1() {
  const { language } = useLanguage();
  const isSpanish = language === 'es';

  // States
  const [selectedCurrency, setSelectedCurrency] = useState<string>('USD');
  const [balances, setBalances] = useState<LedgerBalanceV2[]>([]);
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentQuadrillion, setCurrentQuadrillion] = useState(0);
  const [isLiveUpdating, setIsLiveUpdating] = useState(false);

  // Update time every second
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Suscribirse a Treasury Reserve1 (Store V2)
  useEffect(() => {
    // Cargar estado inicial
    const state = ledgerPersistenceStoreV2.getState();
    setBalances(state.balances);
    setProgress(state.progress.percentage);
    setCurrentQuadrillion(state.progress.currentQuadrillion);
    setIsProcessing(state.isProcessing);
    calculateMetrics(state.balances, state.progress.currentQuadrillion, state.isProcessing, state.progress.percentage);

    // Suscribirse a actualizaciones
    const unsubscribe = ledgerPersistenceStoreV2.subscribe((newState) => {
      setBalances(newState.balances);
      setProgress(newState.progress.percentage);
      setCurrentQuadrillion(newState.progress.currentQuadrillion);
      setIsProcessing(newState.isProcessing);
      calculateMetrics(newState.balances, newState.progress.currentQuadrillion, newState.isProcessing, newState.progress.percentage);
      
      setIsLiveUpdating(true);
      setTimeout(() => setIsLiveUpdating(false), 300);
    });

    return unsubscribe;
  }, []);

  const calculateMetrics = (balanceData: LedgerBalanceV2[], quadrillion: number, processing: boolean, prog: number) => {
    const totalBalances: { [currency: string]: number } = {};
    let totalTransactions = 0;

    balanceData.forEach(b => {
      totalBalances[b.currency] = b.balance;
      totalTransactions += b.transactionCount;
    });

    const activeCurrencies = Object.keys(totalBalances).filter(k => totalBalances[k] > 0).length;
    
    let systemHealth: 'excellent' | 'good' | 'warning' | 'critical' = 'warning';
    if (prog >= 100) systemHealth = 'excellent';
    else if (prog > 50) systemHealth = 'good';
    else if (prog > 0) systemHealth = 'warning';

    setMetrics({
      totalBalances,
      totalAccounts: balanceData.length,
      totalTransactions,
      activeCurrencies,
      ledgerProgress: prog,
      systemHealth,
      currentQuadrillion: quadrillion,
      isProcessing: processing
    });
  };

  const currencies = useMemo(() => balances.map(b => b.currency), [balances]);
  const selectedBalance = balances.find(b => b.currency === selectedCurrency);

  const getCurrencySymbol = (currency: string): string => {
    const symbols: Record<string, string> = {
      'USD': '$', 'EUR': '€', 'GBP': '£', 'CHF': 'CHF', 'CAD': 'C$',
      'AUD': 'A$', 'JPY': '¥', 'CNY': '¥', 'INR': '₹', 'MXN': 'MX$',
      'BRL': 'R$', 'RUB': '₽', 'KRW': '₩', 'SGD': 'S$', 'HKD': 'HK$'
    };
    return symbols[currency] || currency;
  };

  const getHealthColor = (health: string) => {
    switch (health) {
      case 'excellent': return 'text-emerald-400 bg-emerald-500/20';
      case 'good': return 'text-blue-400 bg-blue-500/20';
      case 'warning': return 'text-amber-400 bg-amber-500/20';
      case 'critical': return 'text-red-400 bg-red-500/20';
      default: return 'text-gray-400 bg-gray-500/20';
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-purple-950 to-slate-950 text-white p-6 overflow-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <Cpu className="w-10 h-10 text-purple-400" />
            <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
              Central Panel 1
            </h1>
            <span className="text-xs bg-purple-500/20 text-purple-300 px-3 py-1 rounded-full border border-purple-500/30">
              Treasury Reserve1
            </span>
            {isLiveUpdating && (
              <span className="text-xs bg-amber-500/20 text-amber-300 px-2 py-1 rounded animate-pulse">
                LIVE
              </span>
            )}
          </div>
          <p className="text-purple-300/70">
            {isSpanish ? 'Sincronizado con Treasury Reserve1 en tiempo real' : 'Synced with Treasury Reserve1 in real-time'}
          </p>
        </div>
        <div className="text-right">
          <p className="text-purple-300 text-sm">{currentTime.toLocaleDateString()}</p>
          <p className="text-2xl font-mono text-white">{currentTime.toLocaleTimeString()}</p>
        </div>
      </div>

      {/* Progress Bar Global */}
      <div className={`mb-6 rounded-xl p-4 border ${isProcessing ? 'bg-amber-900/20 border-amber-500/30 animate-pulse' : 'bg-purple-900/20 border-purple-500/30'}`}>
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <div className={`w-3 h-3 rounded-full ${isProcessing ? 'bg-amber-400 animate-ping' : 'bg-emerald-400'}`} />
            <span className={`font-semibold ${isProcessing ? 'text-amber-300' : 'text-purple-300'}`}>
              {isProcessing 
                ? (isSpanish ? '🔍 ESCANEANDO EN TIEMPO REAL' : '🔍 SCANNING IN REAL-TIME')
                : progress >= 100 
                  ? '✅ COMPLETADO' 
                  : progress > 0 
                    ? '⏸️ PAUSADO' 
                    : '⏳ ESPERANDO'}
            </span>
          </div>
          <span className={`font-bold text-lg ${isProcessing ? 'text-amber-400' : 'text-purple-400'}`}>
            {progress.toFixed(1)}%
          </span>
        </div>
        <div className="w-full bg-black/30 rounded-full h-3 overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-300 ${isProcessing ? 'bg-gradient-to-r from-amber-500 to-orange-500' : 'bg-gradient-to-r from-purple-500 to-pink-500'}`}
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Main Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {/* Total Quadrillion */}
        <div className="bg-gradient-to-br from-purple-900/40 to-pink-900/40 rounded-2xl p-6 border border-purple-500/30">
          <div className="flex items-center justify-between mb-4">
            <Database className="w-8 h-8 text-purple-400" />
            <span className={`px-2 py-1 rounded-full text-xs ${getHealthColor(metrics?.systemHealth || 'warning')}`}>
              {metrics?.systemHealth?.toUpperCase()}
            </span>
          </div>
          <p className="text-purple-300/70 text-sm mb-1">{isSpanish ? 'Balance Total' : 'Total Balance'}</p>
          <p className={`text-3xl font-black ${isProcessing ? 'text-amber-400 animate-pulse' : 'text-white'}`}>
            {formatQuadrillion(currentQuadrillion)}
          </p>
        </div>

        {/* Accounts */}
        <div className="bg-gradient-to-br from-blue-900/40 to-cyan-900/40 rounded-2xl p-6 border border-blue-500/30">
          <div className="flex items-center justify-between mb-4">
            <Wallet className="w-8 h-8 text-blue-400" />
            <Activity className="w-5 h-5 text-blue-300" />
          </div>
          <p className="text-blue-300/70 text-sm mb-1">{isSpanish ? 'Cuentas Activas' : 'Active Accounts'}</p>
          <p className="text-3xl font-black text-white">{metrics?.totalAccounts || 0}</p>
          <p className="text-blue-300/50 text-xs mt-1">15 {isSpanish ? 'divisas' : 'currencies'}</p>
        </div>

        {/* Transactions */}
        <div className="bg-gradient-to-br from-emerald-900/40 to-teal-900/40 rounded-2xl p-6 border border-emerald-500/30">
          <div className="flex items-center justify-between mb-4">
            <TrendingUp className="w-8 h-8 text-emerald-400" />
            <Zap className="w-5 h-5 text-emerald-300" />
          </div>
          <p className="text-emerald-300/70 text-sm mb-1">{isSpanish ? 'Valores Detectados' : 'Values Detected'}</p>
          <p className="text-3xl font-black text-white">{(metrics?.totalTransactions || 0).toLocaleString()}</p>
        </div>

        {/* Progress */}
        <div className="bg-gradient-to-br from-amber-900/40 to-orange-900/40 rounded-2xl p-6 border border-amber-500/30">
          <div className="flex items-center justify-between mb-4">
            <BarChart3 className="w-8 h-8 text-amber-400" />
            {isProcessing && <RefreshCw className="w-5 h-5 text-amber-300 animate-spin" />}
          </div>
          <p className="text-amber-300/70 text-sm mb-1">{isSpanish ? 'Progreso Escaneo' : 'Scan Progress'}</p>
          <p className="text-3xl font-black text-white">{progress.toFixed(1)}%</p>
        </div>
      </div>

      {/* Currency Grid */}
      <div className="mb-8">
        <h2 className="text-xl font-bold text-purple-300 mb-4 flex items-center gap-2">
          <Globe className="w-6 h-6" />
          {isSpanish ? 'Balances por Divisa' : 'Balances by Currency'}
        </h2>
        
        {balances.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-3">
            {balances.map((balance, idx) => (
              <div
                key={balance.currency}
                onClick={() => setSelectedCurrency(balance.currency)}
                className={`p-4 rounded-xl cursor-pointer transition-all border ${
                  selectedCurrency === balance.currency
                    ? 'bg-purple-500/30 border-purple-400 scale-105'
                    : 'bg-slate-800/50 border-slate-700/50 hover:bg-slate-700/50'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-lg font-bold">{balance.currency}</span>
                  <span className="text-purple-400">{getCurrencySymbol(balance.currency)}</span>
                </div>
                <p className={`text-sm font-mono break-all ${isProcessing ? 'text-amber-300' : 'text-white'}`}>
                  {getCurrencySymbol(balance.currency)}{BigInt(Math.floor(balance.balance)).toLocaleString()}.00
                </p>
                <p className="text-xs text-slate-400 mt-1">
                  {balance.transactionCount.toLocaleString()} txns
                </p>
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-slate-800/30 rounded-xl p-12 text-center border border-slate-700/50">
            <Cpu className="w-16 h-16 text-purple-400 mx-auto mb-4 opacity-50" />
            <p className="text-slate-400">
              {isSpanish 
                ? 'Carga un archivo en Treasury Reserve1 para ver los datos aquí'
                : 'Load a file in Treasury Reserve1 to see data here'}
            </p>
          </div>
        )}
      </div>

      {/* Selected Currency Detail */}
      {selectedBalance && (
        <div className="bg-gradient-to-br from-slate-800/50 to-slate-900/50 rounded-2xl p-6 border border-purple-500/20">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-purple-500/20 flex items-center justify-center">
                <DollarSign className="w-7 h-7 text-purple-400" />
              </div>
              <div>
                <h3 className="text-xl font-bold">{selectedBalance.currency}</h3>
                <p className="text-purple-300/50 text-sm">{selectedBalance.account}</p>
              </div>
            </div>
            <CheckCircle className="w-8 h-8 text-emerald-400" />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-black/20 rounded-xl p-4">
              <p className="text-purple-300/70 text-sm mb-1">{isSpanish ? 'Balance Total' : 'Total Balance'}</p>
              <p className="text-2xl font-black text-white break-all">
                {getCurrencySymbol(selectedBalance.currency)}{BigInt(Math.floor(selectedBalance.balance)).toLocaleString()}.00
              </p>
            </div>
            <div className="bg-black/20 rounded-xl p-4">
              <p className="text-purple-300/70 text-sm mb-1">{isSpanish ? 'Transacciones' : 'Transactions'}</p>
              <p className="text-2xl font-black text-white">
                {selectedBalance.transactionCount.toLocaleString()}
              </p>
            </div>
            <div className="bg-black/20 rounded-xl p-4">
              <p className="text-purple-300/70 text-sm mb-1">{isSpanish ? 'Última Actualización' : 'Last Update'}</p>
              <p className="text-lg font-bold text-white">
                {new Date(selectedBalance.lastUpdate).toLocaleTimeString()}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      <div className="mt-8 text-center text-purple-300/50 text-sm">
        <p>Central Panel 1 - {isSpanish ? 'Sincronizado con' : 'Synced with'} Treasury Reserve1</p>
        <p className="text-xs mt-1">Digital Commercial Bank Ltd © 2025</p>
      </div>
    </div>
  );
}

export default CentralBankingDashboard1;

