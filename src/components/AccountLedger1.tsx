/**
 * Account Ledger1 - Live Balance Module para Treasury Reserve1
 * Muestra las 15 divisas con actualizaciones en tiempo real desde Treasury Reserve1
 */

import { useState, useEffect } from 'react';
import { RefreshCw, TrendingUp, Database, CheckCircle, Activity, DollarSign, Cpu, Zap, Search, Clock, Pause } from 'lucide-react';
import { ledgerPersistenceStoreV2, type LedgerBalanceV2 } from '../lib/ledger-persistence-store-v2';
import { useLanguage } from '../lib/i18n.tsx';

// Función para formatear moneda con TODOS los ceros y .00 al final
function formatCurrencyFull(amount: number, currency: string): string {
  // Convertir a BigInt para manejar números muy grandes sin pérdida de precisión
  const bigAmount = BigInt(Math.floor(amount));
  
  // Formatear el número con separadores de miles
  const formatted = bigAmount.toLocaleString('en-US');
  
  // Agregar símbolo de moneda
  const symbols: Record<string, string> = {
    'USD': '$', 'EUR': '€', 'GBP': '£', 'CHF': 'CHF ', 'CAD': 'C$',
    'AUD': 'A$', 'JPY': '¥', 'CNY': '¥', 'INR': '₹', 'MXN': 'MX$',
    'BRL': 'R$', 'RUB': '₽', 'KRW': '₩', 'SGD': 'S$', 'HKD': 'HK$'
  };
  
  // Agregar .00 al final para formato monetario completo
  return `${symbols[currency] || currency + ' '}${formatted}.00`;
}

// Función para mostrar el número de ceros
function countZeros(amount: number): number {
  if (amount <= 0) return 0;
  return Math.floor(Math.log10(amount));
}

// Función para formatear con notación científica clara
function formatScientific(amount: number, currency: string): string {
  if (amount <= 0) return `${currency} 0`;
  
  const exponent = Math.floor(Math.log10(amount));
  const mantissa = amount / Math.pow(10, exponent);
  
  return `${currency} ${mantissa.toFixed(2)} × 10^${exponent}`;
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
      console.log('[AccountLedger1] 📊 Actualización recibida:', {
        progress: newState.progress.percentage.toFixed(1) + '%',
        quadrillion: newState.progress.currentQuadrillion,
        balances: newState.balances.length,
        isProcessing: newState.isProcessing
      });
      
      setBalances(newState.balances);
      setProgress(newState.progress.percentage);
      setCurrentQuadrillion(newState.progress.currentQuadrillion);
      setIsProcessing(newState.isProcessing);
      setDeepScanStats(newState.deepScanStats);
      setLastUpdate(new Date());
      
      // Indicador de actualización - más breve para flujo continuo
      setIsLiveUpdating(true);
      setTimeout(() => setIsLiveUpdating(false), 200);
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
      'USD': 'from-emerald-900/50 to-slate-800/50 border-emerald-500',
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
      <div className="bg-gradient-to-r from-emerald-900/30 to-pink-900/30 border-b border-emerald-500/30 p-8 sticky top-0 z-10">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2 flex items-center gap-3">
              <Cpu className="w-10 h-10 text-emerald-400" />
              Account Ledger1
              <span className="text-sm bg-emerald-500/20 text-emerald-300 px-3 py-1 rounded-full border border-emerald-500/30">
                Treasury Reserve1
              </span>
            </h1>
            <p className="text-emerald-300">
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
              <div className="flex items-center gap-2 bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-4 py-2 rounded-lg animate-pulse">
                <Zap className="w-5 h-5" />
                <span className="font-semibold">{isSpanish ? 'Actualizando...' : 'Updating...'}</span>
              </div>
            )}
            <button
              onClick={refreshBalances}
              className="bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/30 text-emerald-300 px-4 py-2 rounded-lg flex items-center gap-2 transition-all"
            >
              <RefreshCw className="w-5 h-5" />
              {isSpanish ? 'Actualizar' : 'Refresh'}
            </button>
          </div>
        </div>
      </div>

      {/* Indicador de Tiempo Real - Siempre visible */}
      <div className="px-6 pt-4">
        <div className={`rounded-xl p-4 border transition-all duration-300 ${
          isProcessing 
            ? 'bg-amber-900/30 border-amber-500/50 animate-pulse' 
            : progress > 0 
              ? 'bg-emerald-900/20 border-emerald-500/30'
              : 'bg-emerald-900/20 border-emerald-500/30'
        }`}>
          {/* Header con estado */}
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              <div className={`w-3 h-3 rounded-full ${isProcessing ? 'bg-amber-400 animate-ping' : (progress > 0 ? 'bg-emerald-400' : 'bg-emerald-400')}`} />
              <span className={`text-sm font-bold ${isProcessing ? 'text-amber-300' : (progress > 0 ? 'text-emerald-300' : 'text-emerald-300')}`}>
                {isProcessing 
                  ? (isSpanish ? <><Search className="w-4 h-4 inline mr-1 animate-pulse" /> ESCANEANDO EN TIEMPO REAL</> : <><Search className="w-4 h-4 inline mr-1 animate-pulse" /> SCANNING IN REAL-TIME</>)
                  : progress >= 100 
                    ? (isSpanish ? <><CheckCircle className="w-4 h-4 inline mr-1" /> ESCANEO COMPLETADO</> : <><CheckCircle className="w-4 h-4 inline mr-1" /> SCAN COMPLETED</>)
                    : progress > 0 
                      ? (isSpanish ? <><Pause className="w-4 h-4 inline mr-1" /> ESCANEO PAUSADO</> : <><Pause className="w-4 h-4 inline mr-1" /> SCAN PAUSED</>)
                      : (isSpanish ? <><Clock className="w-4 h-4 inline mr-1" /> ESPERANDO ESCANEO</> : <><Clock className="w-4 h-4 inline mr-1" /> WAITING FOR SCAN</>)
                }
              </span>
            </div>
            <div className="flex items-center gap-2">
              {isLiveUpdating && (
                <span className="text-xs bg-emerald-500/30 text-emerald-300 px-2 py-1 rounded animate-pulse">
                  LIVE
                </span>
              )}
              <span className={`font-bold ${isProcessing ? 'text-amber-400' : 'text-emerald-400'}`}>
                {progress.toFixed(1)}%
              </span>
            </div>
          </div>
          
          {/* Barra de progreso */}
          <div className="w-full bg-black/30 rounded-full h-4 overflow-hidden border border-white/10">
            <div
              className={`h-full rounded-full transition-all duration-300 relative ${
                isProcessing 
                  ? 'bg-gradient-to-r from-amber-500 via-orange-500 to-red-500' 
                  : 'bg-gradient-to-r from-emerald-500 via-pink-500 to-amber-500'
              }`}
              style={{ width: `${progress}%` }}
            >
              {isProcessing && (
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent animate-pulse" />
              )}
            </div>
          </div>
          
          {/* Métricas en tiempo real */}
          <div className="grid grid-cols-3 gap-4 mt-3">
            <div className="text-center">
              <p className="text-xs text-emerald-300/70">{isSpanish ? 'Balance Detectado' : 'Detected Balance'}</p>
              <p className={`text-lg font-black ${isProcessing ? 'text-amber-400 animate-pulse' : 'text-white'}`}>
                {currentQuadrillion.toLocaleString()} Q
              </p>
            </div>
            <div className="text-center">
              <p className="text-xs text-emerald-300/70">{isSpanish ? 'Valores Encontrados' : 'Values Found'}</p>
              <p className={`text-lg font-black ${isProcessing ? 'text-amber-400 animate-pulse' : 'text-white'}`}>
                {getTotalValues().toLocaleString()}
              </p>
            </div>
            <div className="text-center">
              <p className="text-xs text-emerald-300/70">{isSpanish ? 'Última Actualización' : 'Last Update'}</p>
              <p className={`text-lg font-black ${isProcessing ? 'text-amber-400' : 'text-white'}`}>
                {lastUpdate ? lastUpdate.toLocaleTimeString() : '--:--:--'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="p-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-gradient-to-br from-emerald-500/20 to-emerald-600/20 border border-emerald-500/30 rounded-xl p-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-emerald-300 text-sm font-semibold">{isSpanish ? 'Total Cuentas' : 'Total Accounts'}</span>
              <Database className="w-6 h-6 text-emerald-400" />
            </div>
            <div className="text-4xl font-black text-white">{balances.length}</div>
            <div className="text-emerald-300/70 text-xs mt-1">{isSpanish ? 'de 15 divisas' : 'of 15 currencies'}</div>
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
                ? (isSpanish ? <><Search className="w-3 h-3 inline mr-1 animate-pulse" /> Escaneando</> : <><Search className="w-3 h-3 inline mr-1 animate-pulse" /> Scanning</>)
                : (balances.length > 0 ? <><CheckCircle className="w-3 h-3 inline mr-1" /> Operativo</> : (isSpanish ? <><Clock className="w-3 h-3 inline mr-1" /> Esperando</> : <><Clock className="w-3 h-3 inline mr-1" /> Waiting</>))}
            </div>
            <div className="text-pink-300/70 text-xs mt-1">
              {isProcessing ? `${progress.toFixed(1)}% ${isSpanish ? 'completado' : 'complete'}` : (isSpanish ? 'Listo' : 'Ready')}
            </div>
          </div>
        </div>

        {/* Deep Scan Stats */}
        {deepScanStats && (
          <div className="mb-6 bg-gradient-to-r from-emerald-900/20 to-pink-900/20 rounded-xl p-4 border border-emerald-500/20">
            <h3 className="text-emerald-300 font-semibold mb-3 flex items-center gap-2">
              <Cpu className="w-4 h-4" />
              {isSpanish ? 'Estadísticas de Escaneo Profundo' : 'Deep Scan Statistics'}
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-2">
              {[
                { label: 'L1 (32-bit)', value: deepScanStats.values32bit, color: 'blue' },
                { label: 'L2 (64-bit)', value: deepScanStats.values64bit, color: 'emerald' },
                { label: 'L3 (Float)', value: deepScanStats.valuesFloat64, color: 'amber' },
                { label: 'L4 (BigEnd)', value: deepScanStats.valuesBigEndian, color: 'cyan' },
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
                    {/* Mostrar valor completo con todos los ceros */}
                    <div className={`${isProcessing ? 'animate-pulse' : ''}`}>
                      <p className="text-lg font-black text-white break-all leading-tight">
                        {formatCurrencyFull(balance.balance, balance.currency)}
                      </p>
                      {balance.balance > 0 && (
                        <div className="mt-2 flex items-center gap-2">
                          <span className="text-amber-400 text-xs font-mono bg-amber-500/20 px-2 py-1 rounded">
                            {countZeros(balance.balance)} {isSpanish ? 'ceros' : 'zeros'}
                          </span>
                          <span className="text-emerald-300 text-xs font-mono">
                            ({formatScientific(balance.balance, balance.currency)})
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Statistics Grid */}
                  <div className="grid grid-cols-2 gap-2">
                    <div className="bg-black/20 rounded-lg p-2">
                      <p className="text-white/60 text-xs">{isSpanish ? 'Transacciones' : 'Transactions'}</p>
                      <p className="text-lg font-bold text-white">{balance.transactionCount.toLocaleString()}</p>
                    </div>
                    <div className="bg-black/20 rounded-lg p-2">
                      <p className="text-white/60 text-xs">{isSpanish ? 'Promedio' : 'Average'}</p>
                      <p className="text-xs font-bold text-white break-all">
                        {formatCurrencyFull(balance.averageTransaction, balance.currency)}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="bg-emerald-900/20 rounded-xl p-12 text-center border-2 border-dashed border-emerald-500/30">
            <Cpu className="w-16 h-16 text-emerald-400 mx-auto mb-4" />
            <h3 className="text-2xl font-bold text-white mb-2">
              {isSpanish ? 'Sin Cuentas Cargadas' : 'No Accounts Loaded'}
            </h3>
            <p className="text-emerald-300 mb-6">
              {isSpanish 
                ? 'Carga un archivo en Treasury Reserve1 para ver los balances aquí'
                : 'Load a file in Treasury Reserve1 to see balances here'}
            </p>
          </div>
        )}
      </div>

      {/* Live Update Footer */}
      {balances.length > 0 && (
        <div className="sticky bottom-0 bg-gradient-to-r from-emerald-900/50 to-pink-900/50 border-t border-emerald-500/30 p-4">
          <div className="flex items-center justify-between max-w-7xl mx-auto">
            <div className="flex items-center gap-3">
              <div className={`w-3 h-3 rounded-full ${isProcessing ? 'bg-amber-400 animate-pulse' : (isLiveUpdating ? 'bg-emerald-400 animate-pulse' : 'bg-emerald-400')}`} />
              <span className="text-emerald-300 text-sm font-semibold">
                {isProcessing 
                  ? (isSpanish ? `Escaneando... ${progress.toFixed(1)}%` : `Scanning... ${progress.toFixed(1)}%`)
                  : (isLiveUpdating ? (isSpanish ? 'Actualizando...' : 'Updating...') : (isSpanish ? 'Conectado a Treasury Reserve1' : 'Connected to Treasury Reserve1'))}
              </span>
            </div>
            <div className="text-emerald-300/70 text-xs">
              {isSpanish ? 'Última actualización:' : 'Last update:'} {lastUpdate ? lastUpdate.toLocaleString() : 'N/A'}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default AccountLedger1;

