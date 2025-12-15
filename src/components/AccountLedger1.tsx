/**
 * Account Ledger1 - Live Balance Module para Treasury Reserve1
 * Muestra las 15 divisas con actualizaciones en tiempo real desde Treasury Reserve1
 */

import { useState, useEffect } from 'react';
import { RefreshCw, TrendingUp, Database, CheckCircle, Activity, DollarSign, Cpu, Zap } from 'lucide-react';
import { ledgerPersistenceStoreV2, type LedgerBalanceV2 } from '../lib/ledger-persistence-store-v2';
import { useLanguage } from '../lib/i18n.tsx';

// Función para formatear moneda
function formatCurrency(amount: number, currency: string): string {
  if (amount >= 1e15) {
    return `${(amount / 1e15).toLocaleString(undefined, { maximumFractionDigits: 0 })} Q`;
  }
  if (amount >= 1e12) {
    return `${(amount / 1e12).toLocaleString(undefined, { maximumFractionDigits: 0 })} T`;
  }
  if (amount >= 1e9) {
    return `${(amount / 1e9).toLocaleString(undefined, { maximumFractionDigits: 0 })} B`;
  }
  try {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
      maximumFractionDigits: 0
    }).format(amount);
  } catch {
    return `${currency} ${amount.toLocaleString()}`;
  }
}

// Nombres de divisas
const CURRENCY_NAMES: Record<string, string> = {
  'USD': 'US Dollars',
  'EUR': 'Euros',
  'GBP': 'Pound Sterling',
  'CHF': 'Swiss Francs',
  'CAD': 'Canadian Dollars',
  'AUD': 'Australian Dollars',
  'JPY': 'Japanese Yen',
  'CNY': 'Chinese Yuan',
  'INR': 'Indian Rupees',
  'MXN': 'Mexican Pesos',
  'BRL': 'Brazilian Reals',
  'RUB': 'Russian Rubles',
  'KRW': 'South Korean Won',
  'SGD': 'Singapore Dollars',
  'HKD': 'Hong Kong Dollars',
};

export function AccountLedger1() {
  const { language } = useLanguage();
  const isSpanish = language === 'es';
  
  const [balances, setBalances] = useState<LedgerBalanceV2[]>([]);
  const [isLiveUpdating, setIsLiveUpdating] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [progress, setProgress] = useState(0);
  const [currentQuadrillion, setCurrentQuadrillion] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const [deepScanStats, setDeepScanStats] = useState<{
    values32bit: number;
    values64bit: number;
    values128bit: number;
    valuesFloat64: number;
    valuesBigEndian: number;
    valuesCompressed: number;
    valuesCumulative: number;
  } | null>(null);

  useEffect(() => {
    // Cargar estado inicial
    const state = ledgerPersistenceStoreV2.getState();
    setBalances(state.balances);
    setProgress(state.progress.percentage);
    setCurrentQuadrillion(state.progress.currentQuadrillion);
    setIsProcessing(state.isProcessing);
    setDeepScanStats(state.deepScanStats);
    
    if (state.balances.length > 0) {
      setLastUpdate(new Date(state.lastSyncTimestamp));
    }

    // Suscribirse a actualizaciones en tiempo real
    const unsubscribe = ledgerPersistenceStoreV2.subscribe((newState) => {
      setBalances(newState.balances);
      setProgress(newState.progress.percentage);
      setCurrentQuadrillion(newState.progress.currentQuadrillion);
      setIsProcessing(newState.isProcessing);
      setDeepScanStats(newState.deepScanStats);
      setLastUpdate(new Date());
      
      // Indicador de actualización
      setIsLiveUpdating(true);
      setTimeout(() => setIsLiveUpdating(false), 500);
    });

    return unsubscribe;
  }, []);

  const getTotalTransactions = () => {
    return balances.reduce((sum, b) => sum + b.transactionCount, 0);
  };

  const getTotalValues = () => {
    if (!deepScanStats) return 0;
    return deepScanStats.values32bit + 
           deepScanStats.values64bit + 
           deepScanStats.values128bit +
           deepScanStats.valuesFloat64 +
           deepScanStats.valuesBigEndian +
           deepScanStats.valuesCompressed +
           deepScanStats.valuesCumulative;
  };

  const getCurrencyColor = (currency: string, index: number) => {
    const colors: Record<string, string> = {
      'USD': 'from-purple-900/50 to-purple-800/50 border-purple-500',
      'EUR': 'from-blue-900/50 to-blue-800/50 border-blue-500',
      'GBP': 'from-indigo-900/50 to-indigo-800/50 border-indigo-500',
      'CHF': 'from-emerald-900/50 to-emerald-800/50 border-emerald-500',
      'JPY': 'from-amber-900/50 to-amber-800/50 border-amber-500',
      'CAD': 'from-red-900/50 to-red-800/50 border-red-500',
      'AUD': 'from-orange-900/50 to-orange-800/50 border-orange-500',
      'CNY': 'from-pink-900/50 to-pink-800/50 border-pink-500',
      'INR': 'from-teal-900/50 to-teal-800/50 border-teal-500',
      'MXN': 'from-lime-900/50 to-lime-800/50 border-lime-500',
      'BRL': 'from-green-900/50 to-green-800/50 border-green-500',
      'KRW': 'from-violet-900/50 to-violet-800/50 border-violet-500',
      'SGD': 'from-cyan-900/50 to-cyan-800/50 border-cyan-500',
      'HKD': 'from-rose-900/50 to-rose-800/50 border-rose-500',
      'RUB': 'from-sky-900/50 to-sky-800/50 border-sky-500',
    };
    return colors[currency] || 'from-gray-900/50 to-gray-800/50 border-gray-500';
  };

  const refreshBalances = () => {
    const state = ledgerPersistenceStoreV2.getState();
    setBalances(state.balances);
    setProgress(state.progress.percentage);
    setCurrentQuadrillion(state.progress.currentQuadrillion);
    setLastUpdate(new Date());
  };

  return (
    <div className="flex flex-col h-full bg-[var(--bg-main)] overflow-auto">
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-900/30 to-pink-900/30 border-b border-purple-500/30 p-8 sticky top-0 z-10">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2 flex items-center gap-3">
              <Cpu className="w-10 h-10 text-purple-400" />
              Account Ledger1
              <span className="text-sm bg-purple-500/20 text-purple-300 px-3 py-1 rounded-full border border-purple-500/30">
                Treasury Reserve1
              </span>
            </h1>
            <p className="text-purple-300">
              {isSpanish 
                ? 'Balances en tiempo real desde Treasury Reserve1 - Algoritmo V2'
                : 'Real-time balances from Treasury Reserve1 - Algorithm V2'}
            </p>
          </div>
          <div className="flex items-center gap-4">
            {isProcessing && (
              <div className="flex items-center gap-2 bg-amber-500/20 text-amber-300 border border-amber-500/30 px-4 py-2 rounded-lg animate-pulse">
                <Activity className="w-5 h-5 animate-spin" />
                <span className="font-semibold">{progress.toFixed(1)}%</span>
              </div>
            )}
            {isLiveUpdating && (
              <div className="flex items-center gap-2 bg-purple-500/20 text-purple-300 border border-purple-500/30 px-4 py-2 rounded-lg animate-pulse">
                <Zap className="w-5 h-5" />
                <span className="font-semibold">{isSpanish ? 'Actualizando...' : 'Updating...'}</span>
              </div>
            )}
            <button
              onClick={refreshBalances}
              className="bg-purple-500/20 hover:bg-purple-500/30 border border-purple-500/30 text-purple-300 px-4 py-2 rounded-lg flex items-center gap-2 transition-all"
            >
              <RefreshCw className="w-5 h-5" />
              {isSpanish ? 'Actualizar' : 'Refresh'}
            </button>
          </div>
        </div>
      </div>

      {/* Progress Bar (visible durante procesamiento) */}
      {(isProcessing || progress > 0) && (
        <div className="px-6 pt-4">
          <div className="bg-purple-900/20 rounded-xl p-4 border border-purple-500/30">
            <div className="flex items-center justify-between mb-2">
              <span className="text-purple-300 text-sm font-semibold">
                {isSpanish ? 'Progreso de Escaneo V2' : 'V2 Scan Progress'}
              </span>
              <span className="text-purple-400 font-bold">{progress.toFixed(1)}%</span>
            </div>
            <div className="w-full bg-purple-900/50 rounded-full h-3 overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-purple-500 via-pink-500 to-amber-500 rounded-full transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
            <div className="flex justify-between text-xs mt-2 text-purple-300/70">
              <span>{currentQuadrillion.toLocaleString()} Quadrillion</span>
              <span>{getTotalValues().toLocaleString()} {isSpanish ? 'valores detectados' : 'values detected'}</span>
            </div>
          </div>
        </div>
      )}

      {/* Summary Stats */}
      <div className="p-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-gradient-to-br from-purple-500/20 to-purple-600/20 border border-purple-500/30 rounded-xl p-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-purple-300 text-sm font-semibold">{isSpanish ? 'Total Cuentas' : 'Total Accounts'}</span>
              <Database className="w-6 h-6 text-purple-400" />
            </div>
            <div className="text-4xl font-black text-white">{balances.length}</div>
            <div className="text-purple-300/70 text-xs mt-1">{isSpanish ? 'de 15 divisas' : 'of 15 currencies'}</div>
          </div>

          <div className="bg-gradient-to-br from-amber-500/20 to-orange-500/20 border border-amber-500/30 rounded-xl p-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-amber-300 text-sm font-semibold">Quadrillion</span>
              <TrendingUp className="w-6 h-6 text-amber-400" />
            </div>
            <div className="text-4xl font-black text-white">{currentQuadrillion.toLocaleString()}</div>
            <div className="text-amber-300/70 text-xs mt-1">{isSpanish ? 'detectados' : 'detected'}</div>
          </div>

          <div className="bg-gradient-to-br from-emerald-500/20 to-green-500/20 border border-emerald-500/30 rounded-xl p-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-emerald-300 text-sm font-semibold">{isSpanish ? 'Última Actualización' : 'Last Update'}</span>
              <CheckCircle className="w-6 h-6 text-emerald-400" />
            </div>
            <div className="text-lg font-bold text-white">
              {lastUpdate ? lastUpdate.toLocaleTimeString() : 'N/A'}
            </div>
            <div className="text-emerald-300/70 text-xs mt-1">
              {lastUpdate ? lastUpdate.toLocaleDateString() : (isSpanish ? 'Sin datos' : 'No data')}
            </div>
          </div>

          <div className="bg-gradient-to-br from-pink-500/20 to-rose-500/20 border border-pink-500/30 rounded-xl p-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-pink-300 text-sm font-semibold">{isSpanish ? 'Estado' : 'Status'}</span>
              <Activity className="w-6 h-6 text-pink-400" />
            </div>
            <div className="text-lg font-bold text-white">
              {isProcessing 
                ? (isSpanish ? '🔍 Escaneando' : '🔍 Scanning')
                : (balances.length > 0 ? '✅ Operativo' : (isSpanish ? '⏳ Esperando' : '⏳ Waiting'))}
            </div>
            <div className="text-pink-300/70 text-xs mt-1">
              {isProcessing ? `${progress.toFixed(1)}% ${isSpanish ? 'completado' : 'complete'}` : (isSpanish ? 'Listo' : 'Ready')}
            </div>
          </div>
        </div>

        {/* Deep Scan Stats */}
        {deepScanStats && (
          <div className="mb-6 bg-gradient-to-r from-purple-900/20 to-pink-900/20 rounded-xl p-4 border border-purple-500/20">
            <h3 className="text-purple-300 font-semibold mb-3 flex items-center gap-2">
              <Cpu className="w-4 h-4" />
              {isSpanish ? 'Estadísticas de Escaneo Profundo' : 'Deep Scan Statistics'}
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-2">
              {[
                { label: 'L1 (32-bit)', value: deepScanStats.values32bit, color: 'blue' },
                { label: 'L2 (64-bit)', value: deepScanStats.values64bit, color: 'emerald' },
                { label: 'L3 (Float)', value: deepScanStats.valuesFloat64, color: 'amber' },
                { label: 'L4 (BigEnd)', value: deepScanStats.valuesBigEndian, color: 'purple' },
                { label: 'L5 (128-bit)', value: deepScanStats.values128bit, color: 'pink' },
                { label: 'L6 (Compress)', value: deepScanStats.valuesCompressed, color: 'cyan' },
                { label: 'L7 (Cumul)', value: deepScanStats.valuesCumulative, color: 'orange' },
              ].map((item, idx) => (
                <div key={idx} className={`bg-${item.color}-500/10 border border-${item.color}-500/20 rounded-lg p-2 text-center`}>
                  <p className={`text-${item.color}-300 text-xs`}>{item.label}</p>
                  <p className={`text-${item.color}-400 font-bold text-sm`}>{item.value.toLocaleString()}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Accounts Grid */}
        {balances.length > 0 ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
            {balances.map((balance, index) => {
              const isMainCurrency = index < 4;
              const colorClass = getCurrencyColor(balance.currency, index);

              return (
                <div
                  key={balance.currency}
                  className={`bg-gradient-to-br ${colorClass} rounded-xl p-6 border-2 transform transition-all hover:scale-102 hover:shadow-xl ${isProcessing ? 'animate-pulse-subtle' : ''}`}
                >
                  {/* Account Header */}
                  <div className="flex items-center justify-between mb-4 pb-3 border-b border-white/20">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <DollarSign className="w-5 h-5 text-white" />
                        <h3 className="text-xl font-bold text-white">{balance.currency}</h3>
                        {isMainCurrency && (
                          <span className="bg-white/20 text-white px-2 py-0.5 rounded-full text-xs font-bold">
                            ★ {index === 0 ? 'Principal' : index === 1 ? 'Secundaria' : index === 2 ? 'Terciaria' : 'Cuarta'}
                          </span>
                        )}
                      </div>
                      <p className="text-white/70 text-sm">{CURRENCY_NAMES[balance.currency] || balance.currency}</p>
                    </div>
                    <div className="text-right">
                      <div className="text-white/60 text-xs">{isSpanish ? 'Cuenta' : 'Account'}</div>
                      <div className="text-white font-mono text-lg font-bold">#{index + 1}</div>
                    </div>
                  </div>

                  {/* Balance Amount */}
                  <div className="mb-4 bg-black/30 rounded-lg p-4">
                    <p className="text-white/60 text-xs mb-1 uppercase tracking-wide">{isSpanish ? 'Balance Total' : 'Total Balance'}</p>
                    <p className={`text-2xl font-black text-white ${isProcessing ? 'animate-pulse' : ''}`}>
                      {formatCurrency(balance.balance, balance.currency)}
                    </p>
                    <p className="text-white/50 text-xs mt-2">
                      {balance.balance.toExponential(2)} {balance.currency}
                    </p>
                  </div>

                  {/* Statistics Grid */}
                  <div className="grid grid-cols-2 gap-2">
                    <div className="bg-black/20 rounded-lg p-2">
                      <p className="text-white/60 text-xs">{isSpanish ? 'Transacciones' : 'Transactions'}</p>
                      <p className="text-lg font-bold text-white">{balance.transactionCount.toLocaleString()}</p>
                    </div>
                    <div className="bg-black/20 rounded-lg p-2">
                      <p className="text-white/60 text-xs">{isSpanish ? 'Promedio' : 'Average'}</p>
                      <p className="text-sm font-bold text-white">
                        {formatCurrency(balance.averageTransaction, balance.currency)}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="bg-purple-900/20 rounded-xl p-12 text-center border-2 border-dashed border-purple-500/30">
            <Cpu className="w-16 h-16 text-purple-400 mx-auto mb-4" />
            <h3 className="text-2xl font-bold text-white mb-2">
              {isSpanish ? 'Sin Cuentas Cargadas' : 'No Accounts Loaded'}
            </h3>
            <p className="text-purple-300 mb-6">
              {isSpanish 
                ? 'Carga un archivo en Treasury Reserve1 para ver los balances aquí'
                : 'Load a file in Treasury Reserve1 to see balances here'}
            </p>
          </div>
        )}
      </div>

      {/* Live Update Footer */}
      {balances.length > 0 && (
        <div className="sticky bottom-0 bg-gradient-to-r from-purple-900/50 to-pink-900/50 border-t border-purple-500/30 p-4">
          <div className="flex items-center justify-between max-w-7xl mx-auto">
            <div className="flex items-center gap-3">
              <div className={`w-3 h-3 rounded-full ${isProcessing ? 'bg-amber-400 animate-pulse' : (isLiveUpdating ? 'bg-purple-400 animate-pulse' : 'bg-emerald-400')}`} />
              <span className="text-purple-300 text-sm font-semibold">
                {isProcessing 
                  ? (isSpanish ? `Escaneando... ${progress.toFixed(1)}%` : `Scanning... ${progress.toFixed(1)}%`)
                  : (isLiveUpdating ? (isSpanish ? 'Actualizando...' : 'Updating...') : (isSpanish ? 'Conectado a Treasury Reserve1' : 'Connected to Treasury Reserve1'))}
              </span>
            </div>
            <div className="text-purple-300/70 text-xs">
              {isSpanish ? 'Última actualización:' : 'Last update:'} {lastUpdate ? lastUpdate.toLocaleString() : 'N/A'}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default AccountLedger1;

