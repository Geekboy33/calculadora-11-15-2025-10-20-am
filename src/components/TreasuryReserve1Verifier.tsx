/**
 * Treasury Reserve1 Verifier
 * Verificación algorítmica para determinar si los fondos detectados en Treasury Reserve1
 * provienen de datos reales del Ledger1 Digital Commercial Bank DAES o si son simulados.
 *
 * Alimentado en tiempo real por ledgerPersistenceStoreV2.
 */

import { useEffect, useMemo, useState } from 'react';
import { ShieldCheck, ShieldAlert, Activity, TrendingUp, Gauge, Database, AlertTriangle, CheckCircle2, Cpu, Zap, ListChecks, Info } from 'lucide-react';
import { ledgerPersistenceStoreV2, type LedgerBalanceV2 } from '../lib/ledger-persistence-store-v2';
import { useLanguage } from '../lib/i18n';

type Verdict = 'real' | 'simulated' | 'incomplete';

interface Signal {
  label: string;
  status: 'pass' | 'warn' | 'fail';
  detail: string;
}

export function TreasuryReserve1Verifier() {
  const { language } = useLanguage();
  const isSpanish = language === 'es';

  const [balances, setBalances] = useState<LedgerBalanceV2[]>([]);
  const [progress, setProgress] = useState(0);
  const [currentQuadrillion, setCurrentQuadrillion] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const [signals, setSignals] = useState<Signal[]>([]);
  const [verdict, setVerdict] = useState<Verdict>('incomplete');
  const [confidence, setConfidence] = useState(0);
  const [evidence, setEvidence] = useState<string[]>([]);

  // Suscripción en tiempo real
  useEffect(() => {
    const state = ledgerPersistenceStoreV2.getState();
    updateStateFromStore();

    const unsubscribe = ledgerPersistenceStoreV2.subscribe(() => {
      updateStateFromStore();
    });

    return unsubscribe;
  }, []);

  const updateStateFromStore = () => {
    const state = ledgerPersistenceStoreV2.getState();
    setBalances(state.balances);
    setProgress(state.progress.percentage);
    setCurrentQuadrillion(state.progress.currentQuadrillion);
    setIsProcessing(state.isProcessing);
    const result = evaluateSignals(state.balances, state.progress.percentage, state.progress.currentQuadrillion, state.deepScanStats);
    setSignals(result.signalsList);
    setConfidence(result.confidence);
    setVerdict(result.verdict);
    if (result.evidenceMsg) {
      setEvidence(prev => [result.evidenceMsg, ...prev].slice(0, 12));
    }
  };

  const evaluateSignals = (
    bal: LedgerBalanceV2[],
    prog: number,
    quad: number,
    deepStats: ReturnType<typeof ledgerPersistenceStoreV2.getDeepScanStats> | null
  ) => {
    const signalsList: Signal[] = [];
    let score = 50; // base
    let evidenceMsg = '';
    const ISO_CURRENCIES = new Set(['USD','EUR','GBP','CHF','CAD','AUD','JPY','CNY','INR','MXN','BRL','RUB','KRW','SGD','HKD']);

    // Señal 1: Progreso suficiente
    if (prog >= 80) {
      signalsList.push({ label: isSpanish ? 'Progreso de escaneo' : 'Scan progress', status: 'pass', detail: `${prog.toFixed(1)}%` });
      score += 15;
      evidenceMsg ||= isSpanish ? `Progreso alto: ${prog.toFixed(1)}%` : `High progress: ${prog.toFixed(1)}%`;
    } else if (prog >= 30) {
      signalsList.push({ label: isSpanish ? 'Progreso de escaneo' : 'Scan progress', status: 'warn', detail: `${prog.toFixed(1)}%` });
      score += 5;
    } else {
      signalsList.push({ label: isSpanish ? 'Progreso de escaneo' : 'Scan progress', status: 'fail', detail: `${prog.toFixed(1)}%` });
      score -= 10;
    }

    // Señal 2: Cercanía al objetivo 745,381 Quadrillion
    const target = 745_381;
    const delta = Math.abs(target - quad);
    const ratio = target > 0 ? quad / target : 0;
    if (quad > 0 && delta / target < 0.2) {
      signalsList.push({ label: isSpanish ? 'Proximidad al objetivo' : 'Proximity to target', status: 'pass', detail: `${quad.toLocaleString()} Q (~${(ratio * 100).toFixed(1)}%)` });
      score += 15;
      evidenceMsg ||= isSpanish ? `Quadrillion cercano al objetivo: ${quad.toLocaleString()} Q` : `Quadrillion near target: ${quad.toLocaleString()} Q`;
    } else if (quad > 0 && delta / target < 0.5) {
      signalsList.push({ label: isSpanish ? 'Proximidad al objetivo' : 'Proximity to target', status: 'warn', detail: `${quad.toLocaleString()} Q (~${(ratio * 100).toFixed(1)}%)` });
      score += 5;
    } else {
      signalsList.push({ label: isSpanish ? 'Proximidad al objetivo' : 'Proximity to target', status: 'fail', detail: quad > 0 ? `${quad.toLocaleString()} Q` : '0' });
      score -= 10;
    }

    // Señal 3: Diversidad de divisas (esperamos 15 balances)
    if (bal.length >= 12) {
      signalsList.push({ label: isSpanish ? 'Cobertura de divisas' : 'Currency coverage', status: 'pass', detail: `${bal.length} / 15` });
      score += 10;
      evidenceMsg ||= isSpanish ? `Cobertura alta de divisas: ${bal.length}` : `High currency coverage: ${bal.length}`;
    } else if (bal.length >= 6) {
      signalsList.push({ label: isSpanish ? 'Cobertura de divisas' : 'Currency coverage', status: 'warn', detail: `${bal.length} / 15` });
      score += 2;
    } else {
      signalsList.push({ label: isSpanish ? 'Cobertura de divisas' : 'Currency coverage', status: 'fail', detail: `${bal.length} / 15` });
      score -= 5;
    }

    // Señal 4: Estadísticas de patrones (si existen)
    if (deepStats) {
      const totalPatterns =
        deepStats.values32bit +
        deepStats.values64bit +
        deepStats.values128bit +
        deepStats.valuesFloat64 +
        deepStats.valuesBigEndian +
        deepStats.valuesCompressed +
        deepStats.valuesCumulative;
      if (totalPatterns > 0) {
        signalsList.push({
          label: isSpanish ? 'Patrones detectados' : 'Detected patterns',
          status: 'pass',
          detail: totalPatterns.toLocaleString()
        });
        score += 10;
        evidenceMsg ||= isSpanish ? `Patrones detectados: ${totalPatterns.toLocaleString()}` : `Detected patterns: ${totalPatterns.toLocaleString()}`;
      } else {
        signalsList.push({
          label: isSpanish ? 'Patrones detectados' : 'Detected patterns',
          status: 'fail',
          detail: '0'
        });
        score -= 10;
      }
    } else {
      signalsList.push({
        label: isSpanish ? 'Patrones detectados' : 'Detected patterns',
        status: 'warn',
        detail: isSpanish ? 'Sin estadísticas (aún)' : 'No stats yet'
      });
    }

    // Señal 5: Códigos ISO válidos
    const invalidCodes = bal.filter(b => !ISO_CURRENCIES.has(b.currency)).map(b => b.currency);
    if (invalidCodes.length === 0 && bal.length > 0) {
      signalsList.push({
        label: isSpanish ? 'Códigos ISO de divisa' : 'ISO currency codes',
        status: 'pass',
        detail: `${bal.length} válidos`
      });
      score += 8;
      evidenceMsg ||= isSpanish ? 'Divisas ISO válidas detectadas' : 'Valid ISO currencies detected';
    } else if (invalidCodes.length < bal.length) {
      signalsList.push({
        label: isSpanish ? 'Códigos ISO de divisa' : 'ISO currency codes',
        status: 'warn',
        detail: isSpanish ? `No estándar: ${invalidCodes.join(', ')}` : `Non-standard: ${invalidCodes.join(', ')}`
      });
      score -= 2;
    } else {
      signalsList.push({
        label: isSpanish ? 'Códigos ISO de divisa' : 'ISO currency codes',
        status: 'fail',
        detail: isSpanish ? 'Sin divisas válidas' : 'No valid currencies'
      });
      score -= 10;
    }

    // Señal 6: Consistencia de balances (suma vs. cuadrillones)
    const sumBalances = bal.reduce((sum, b) => sum + b.balance, 0);
    const expectedTotal = quad * 1e15;
    const consistencyRatio = expectedTotal > 0 ? sumBalances / expectedTotal : 0;
    if (expectedTotal > 0 && consistencyRatio > 0.5 && consistencyRatio < 1.5) {
      signalsList.push({
        label: isSpanish ? 'Consistencia de balances' : 'Balance consistency',
        status: 'pass',
        detail: `${(consistencyRatio * 100).toFixed(1)}%`
      });
      score += 10;
      evidenceMsg ||= isSpanish ? `Consistencia alta: ${(consistencyRatio * 100).toFixed(1)}%` : `High consistency: ${(consistencyRatio * 100).toFixed(1)}%`;
    } else if (expectedTotal > 0 && consistencyRatio > 0.2 && consistencyRatio < 2.0) {
      signalsList.push({
        label: isSpanish ? 'Consistencia de balances' : 'Balance consistency',
        status: 'warn',
        detail: `${(consistencyRatio * 100).toFixed(1)}%`
      });
      score += 2;
    } else {
      signalsList.push({
        label: isSpanish ? 'Consistencia de balances' : 'Balance consistency',
        status: 'fail',
        detail: expectedTotal > 0 ? `${(consistencyRatio * 100).toFixed(1)}%` : 'N/A'
      });
      score -= 10;
    }

    // Señal 7: Actividad en cuentas (transacciones > 0)
    const accountsWithActivity = bal.filter(b => b.transactionCount > 0).length;
    if (bal.length > 0 && accountsWithActivity / bal.length >= 0.6) {
      signalsList.push({
        label: isSpanish ? 'Actividad de cuentas' : 'Account activity',
        status: 'pass',
        detail: `${accountsWithActivity}/${bal.length} con transacciones`
      });
      score += 6;
      evidenceMsg ||= isSpanish ? 'Cuentas con actividad de transacciones' : 'Accounts with transaction activity';
    } else if (accountsWithActivity > 0) {
      signalsList.push({
        label: isSpanish ? 'Actividad de cuentas' : 'Account activity',
        status: 'warn',
        detail: `${accountsWithActivity}/${bal.length} con transacciones`
      });
      score += 1;
    } else {
      signalsList.push({
        label: isSpanish ? 'Actividad de cuentas' : 'Account activity',
        status: 'fail',
        detail: isSpanish ? 'Sin transacciones' : 'No transactions'
      });
      score -= 6;
    }

    // Señal 8: Frescura temporal (lastUpdate < 15 min)
    const now = Date.now();
    const staleAccounts = bal.filter(b => now - b.lastUpdate > 15 * 60 * 1000).length;
    if (bal.length > 0 && staleAccounts === 0) {
      signalsList.push({
        label: isSpanish ? 'Frescura de datos' : 'Data freshness',
        status: 'pass',
        detail: isSpanish ? 'Actualizado (<15m)' : 'Fresh (<15m)'
      });
      score += 6;
      evidenceMsg ||= isSpanish ? 'Timestamps recientes en balances' : 'Recent timestamps on balances';
    } else if (bal.length > 0 && staleAccounts < bal.length) {
      signalsList.push({
        label: isSpanish ? 'Frescura de datos' : 'Data freshness',
        status: 'warn',
        detail: isSpanish ? `Obsoletos: ${staleAccounts}` : `Stale: ${staleAccounts}`
      });
      score -= 2;
    } else if (bal.length > 0) {
      signalsList.push({
        label: isSpanish ? 'Frescura de datos' : 'Data freshness',
        status: 'fail',
        detail: isSpanish ? 'Todos obsoletos' : 'All stale'
      });
      score -= 8;
    }

    // Señal 9: Progreso vs. velocidad (heurística simple)
    if (isProcessing && prog > 0) {
      signalsList.push({
        label: isSpanish ? 'Ejecución activa' : 'Active processing',
        status: 'pass',
        detail: isSpanish ? 'Escaneo en curso' : 'Scanning'
      });
      score += 5;
    }

    // Determinar veredicto
    let v: Verdict = 'incomplete';
    if (prog < 30 || quad <= 0) {
      v = 'incomplete';
    } else if (score >= 75) {
      v = 'real';
    } else if (score <= 50) {
      v = 'simulated';
    } else {
      v = 'incomplete';
    }

    setSignals(signalsList);
    const conf = Math.max(0, Math.min(100, score));
    return { signalsList, verdict: v, confidence: conf, evidenceMsg };
  };

  const verdictColor = useMemo(() => {
    switch (verdict) {
      case 'real': return 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30';
      case 'simulated': return 'text-red-400 bg-red-500/10 border-red-500/30';
      default: return 'text-amber-300 bg-amber-500/10 border-amber-500/30';
    }
  }, [verdict]);

  const verdictLabel = useMemo(() => {
    if (verdict === 'real') return isSpanish ? 'Fondos Reales' : 'Real Funds';
    if (verdict === 'simulated') return isSpanish ? 'Fondos Simulados' : 'Simulated Funds';
    return isSpanish ? 'Verificación Incompleta' : 'Incomplete Verification';
  }, [verdict, isSpanish]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-purple-950 to-slate-950 text-white p-6 overflow-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <ShieldCheck className="w-10 h-10 text-emerald-400" />
            <h1 className="text-3xl font-bold bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text text-transparent">
              {isSpanish ? 'Verificador Treasury Reserve1' : 'Treasury Reserve1 Verifier'}
            </h1>
            <span className="text-xs bg-purple-500/20 text-purple-300 px-3 py-1 rounded-full border border-purple-500/30">
              Treasury Reserve1
            </span>
          </div>
          <p className="text-purple-300/70">
            {isSpanish
              ? 'Verificación algorítmica de fondos contra Ledger1 Digital Commercial Bank DAES'
              : 'Algorithmic verification of funds vs Ledger1 Digital Commercial Bank DAES'}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className={`px-3 py-2 rounded-lg border ${verdictColor}`}>
            <div className="text-xs uppercase">{isSpanish ? 'Veredicto' : 'Verdict'}</div>
            <div className="text-lg font-bold">{verdictLabel}</div>
          </div>
          <div className="px-3 py-2 rounded-lg border border-purple-500/30 bg-purple-900/30 text-purple-200">
            <div className="text-xs uppercase">{isSpanish ? 'Confianza' : 'Confidence'}</div>
            <div className="text-lg font-bold">{confidence.toFixed(0)}%</div>
          </div>
        </div>
      </div>

      {/* Progress & Quadrillion */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-gradient-to-br from-purple-900/40 to-pink-900/40 rounded-2xl p-4 border border-purple-500/30">
          <div className="flex items-center justify-between mb-2">
            <Activity className="w-6 h-6 text-purple-300" />
            <span className="text-sm text-purple-200">{isProcessing ? 'LIVE' : 'IDLE'}</span>
          </div>
          <p className="text-sm text-purple-200/70 mb-1">{isSpanish ? 'Progreso de Escaneo' : 'Scan Progress'}</p>
          <p className="text-3xl font-black text-white">{progress.toFixed(1)}%</p>
        </div>

        <div className="bg-gradient-to-br from-emerald-900/40 to-teal-900/40 rounded-2xl p-4 border border-emerald-500/30">
          <div className="flex items-center justify-between mb-2">
            <TrendingUp className="w-6 h-6 text-emerald-300" />
            <Gauge className="w-6 h-6 text-emerald-300" />
          </div>
          <p className="text-sm text-emerald-200/70 mb-1">{isSpanish ? 'Quadrillion Detectados' : 'Quadrillion Detected'}</p>
          <p className="text-3xl font-black text-white">{currentQuadrillion.toLocaleString()} Q</p>
        </div>

        <div className={`rounded-2xl p-4 border ${verdictColor}`}>
          <div className="flex items-center justify-between mb-2">
            {verdict === 'real' ? <CheckCircle2 className="w-6 h-6" /> : verdict === 'simulated' ? <ShieldAlert className="w-6 h-6" /> : <AlertTriangle className="w-6 h-6" />}
            <Cpu className="w-6 h-6" />
          </div>
          <p className="text-sm mb-1">{isSpanish ? 'Clasificación' : 'Classification'}</p>
          <p className="text-2xl font-black">
            {verdictLabel}
          </p>
        </div>
      </div>

      {/* Signals */}
      <div className="bg-slate-900/40 border border-slate-700/50 rounded-2xl p-4 mb-6">
        <div className="flex items-center gap-2 mb-3">
          <Database className="w-5 h-5 text-purple-300" />
          <h2 className="text-lg font-bold text-white">{isSpanish ? 'Pruebas Algorítmicas' : 'Algorithmic Checks'}</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {signals.map((s, idx) => {
            const color =
              s.status === 'pass' ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-200' :
              s.status === 'warn' ? 'bg-amber-500/10 border-amber-500/30 text-amber-200' :
              'bg-red-500/10 border-red-500/30 text-red-200';
            return (
              <div key={idx} className={`p-3 rounded-xl border ${color}`}>
                <div className="text-sm font-semibold">{s.label}</div>
                <div className="text-xs opacity-80">{s.detail}</div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Currency Overview */}
      <div className="bg-slate-900/40 border border-slate-700/50 rounded-2xl p-4">
        <div className="flex items-center gap-2 mb-3">
          <Zap className="w-5 h-5 text-purple-300" />
          <h2 className="text-lg font-bold text-white">{isSpanish ? 'Divisas Detectadas' : 'Detected Currencies'}</h2>
        </div>
        {balances.length === 0 ? (
          <p className="text-slate-400 text-sm">
            {isSpanish ? 'Sin datos. Ejecuta Treasury Reserve1.' : 'No data. Run Treasury Reserve1.'}
          </p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-3">
            {balances.map(b => (
              <div key={b.currency} className="p-3 rounded-lg bg-slate-800/50 border border-slate-700/50">
                <div className="flex items-center justify-between mb-1">
                  <span className="font-bold">{b.currency}</span>
                  <span className="text-xs text-slate-400">tx {b.transactionCount.toLocaleString()}</span>
                </div>
                <p className="text-sm font-mono break-all">
                  {BigInt(Math.floor(b.balance)).toLocaleString()}.00
                </p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Evidence Stream */}
      <div className="bg-slate-900/40 border border-slate-700/50 rounded-2xl p-4 mt-6">
        <div className="flex items-center gap-2 mb-3">
          <ListChecks className="w-5 h-5 text-emerald-300" />
          <h2 className="text-lg font-bold text-white">{isSpanish ? 'Evidencia en tiempo real' : 'Real-time Evidence'}</h2>
        </div>
        {evidence.length === 0 ? (
          <p className="text-slate-400 text-sm">{isSpanish ? 'Aún sin evidencia. Ejecuta el escaneo.' : 'No evidence yet. Run the scan.'}</p>
        ) : (
          <ul className="space-y-2 text-sm text-slate-200">
            {evidence.map((ev, idx) => (
              <li key={idx} className="bg-slate-800/60 border border-slate-700/50 rounded-lg px-3 py-2">
                {ev}
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Por qué se consideran divisas reales */}
      <div className="bg-slate-900/50 border border-slate-700/50 rounded-2xl p-4 mt-6">
        <div className="flex items-center gap-2 mb-3">
          <Info className="w-5 h-5 text-purple-300" />
          <h2 className="text-lg font-bold text-white">{isSpanish ? 'Por qué se consideran divisas reales' : 'Why we consider them real currencies'}</h2>
        </div>
        <ul className="list-disc ml-5 space-y-2 text-sm text-slate-200">
          <li>{isSpanish ? 'Códigos ISO validados (USD, EUR, GBP, etc.)' : 'Validated ISO codes (USD, EUR, GBP, etc.)'}</li>
          <li>{isSpanish ? 'Transacciones registradas y actividad reciente' : 'Recorded transactions and recent activity'}</li>
          <li>{isSpanish ? 'Timestamps frescos (<15 minutos) en balances' : 'Fresh timestamps (<15 minutes) on balances'}</li>
          <li>{isSpanish ? 'Cobertura amplia de 15 divisas esperadas' : 'Wide coverage across expected 15 currencies'}</li>
          <li>{isSpanish ? 'Consistencia entre suma de balances y quadrillions detectados' : 'Consistency between balance sums and detected quadrillions'}</li>
          <li>{isSpanish ? 'Patrones binarios y estructuras detectadas durante el deep scan' : 'Binary patterns and structures detected during deep scan'}</li>
        </ul>
      </div>
    </div>
  );
}

export default TreasuryReserve1Verifier;

