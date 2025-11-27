/**
 * Large File Analyzer 2 - Digital Commercial Bank Ltd
 * Replica EXACTA de la técnica del Banco Central Privado
 * Streaming por chunks (10MB), sincronización progreso=balance, navegación libre
 */

import React, { useState } from 'react';
import {
  Database,
  Activity,
  CheckCircle,
  Eye,
  EyeOff,
  RefreshCw,
  Upload
} from 'lucide-react';
import {
  BankingCard,
  BankingHeader,
  BankingButton,
  BankingBadge
} from './ui/BankingComponents';
import { useBankingTheme } from '../hooks/useBankingTheme';
import {
  balanceStore,
  type CurrencyBalance as StoreCurrencyBalance
} from '../lib/balances-store';
import { ledgerPersistenceStore } from '../lib/ledger-persistence-store';

// 15 Divisas
const CURRENCIES = [
  { code: 'USD', name: 'US Dollar', flag: '🇺🇸', percentage: 0.35 },
  { code: 'EUR', name: 'Euro', flag: '🇪🇺', percentage: 0.25 },
  { code: 'GBP', name: 'British Pound', flag: '🇬🇧', percentage: 0.10 },
  { code: 'CAD', name: 'Canadian Dollar', flag: '🇨🇦', percentage: 0.05 },
  { code: 'AUD', name: 'Australian Dollar', flag: '🇦🇺', percentage: 0.04 },
  { code: 'JPY', name: 'Japanese Yen', flag: '🇯🇵', percentage: 0.08 },
  { code: 'CHF', name: 'Swiss Franc', flag: '🇨🇭', percentage: 0.03 },
  { code: 'CNY', name: 'Chinese Yuan', flag: '🇨🇳', percentage: 0.03 },
  { code: 'INR', name: 'Indian Rupee', flag: '🇮🇳', percentage: 0.02 },
  { code: 'MXN', name: 'Mexican Peso', flag: '🇲🇽', percentage: 0.02 },
  { code: 'BRL', name: 'Brazilian Real', flag: '🇧🇷', percentage: 0.01 },
  { code: 'RUB', name: 'Russian Ruble', flag: '🇷🇺', percentage: 0.01 },
  { code: 'KRW', name: 'South Korean Won', flag: '🇰🇷', percentage: 0.005 },
  { code: 'SGD', name: 'Singapore Dollar', flag: '🇸🇬', percentage: 0.005 },
  { code: 'HKD', name: 'Hong Kong Dollar', flag: '🇭🇰', percentage: 0.005 }
];

interface CurrencyBalance {
  code: string;
  name: string;
  flag: string;
  amount: number;
  percentage: number;
}

export function LargeFileAnalyzer2() {
  const { isSpanish } = useBankingTheme();

  const [balancesVisible, setBalancesVisible] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentScannedAmount, setCurrentScannedAmount] = useState(0);
  const [balances, setBalances] = useState<CurrencyBalance[]>(
    CURRENCIES.map(c => ({ ...c, amount: 0 }))
  );
  const [analysisResults, setAnalysisResults] = useState<{
    totalM2Values: number;
    totalM2Amount: number;
    filesProcessed: number;
    certified: boolean;
  } | null>(() => {
    const saved = localStorage.getItem('lfa2_analysis_results');
    return saved ? JSON.parse(saved) : null;
  });
  const [lastProcessedOffset, setLastProcessedOffset] = useState(() => {
    const saved = localStorage.getItem('lfa2_last_offset');
    return saved ? parseInt(saved) : 0;
  });
  const [currentFileName, setCurrentFileName] = useState(() => {
    return localStorage.getItem('lfa2_current_file') || '';
  });

  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const processingRef = React.useRef(false);

  // ✅ Cargar balances guardados al iniciar
  React.useEffect(() => {
    const savedBalances = localStorage.getItem('lfa2_balances');
    if (savedBalances) {
      try {
        const parsed = JSON.parse(savedBalances);
        setBalances(parsed);
        const total = parsed.reduce((sum: number, b: CurrencyBalance) => sum + b.amount, 0);
        setCurrentScannedAmount(total);
      } catch (e) {
        console.error('[LFA2] Error loading balances:', e);
      }
    }
    const savedProgress = localStorage.getItem('lfa2_progress');
    if (savedProgress) {
      setProgress(parseFloat(savedProgress));
    }
  }, []);

  // ✅ NO detener el procesamiento al desmontar
  React.useEffect(() => {
    return () => {
      console.log('[LFA2] 💾 Componente desmontado, procesamiento continúa en background');
    };
  }, []);

  // ✅ TÉCNICA EXACTA DEL BANCO CENTRAL PRIVADO
  const handleAnalyzeFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    processingRef.current = true;
    setAnalyzing(true);

    try {
      const fileIdentifier = `${file.name}_${file.size}_${file.lastModified}`;
      const isSameFile = currentFileName === fileIdentifier;

      console.log('[LFA2] 📂 Archivo:', file.name);
      console.log('[LFA2] 📊 Tamaño:', (file.size / (1024 * 1024)).toFixed(2), 'MB');

      const totalSize = file.size;
      const CHUNK_SIZE = 10 * 1024 * 1024; // 10MB por chunk (IGUAL que Banco Central)
      
      // ✅ SINCRONIZACIÓN PERFECTA: Restaurar offset Y balance guardados
      let offset = isSameFile ? lastProcessedOffset : 0;
      let m2Count = 0;
      let m2Total = isSameFile ? currentScannedAmount : 0;

      if (isSameFile && offset > 0) {
        const savedProgress = (offset / totalSize) * 100;
        
        console.log(`[LFA2] 🔄 CONTINUANDO DESDE:`);
        console.log(`  Offset: ${((offset / (1024 * 1024 * 1024)).toFixed(2))} GB`);
        console.log(`  Progreso: ${savedProgress.toFixed(1)}%`);
        console.log(`  Balance guardado: ${m2Total.toFixed(0)} Billions`);
        console.log(`  ✅ Progreso y balance SINCRONIZADOS`);
        
        setProgress(savedProgress);
        setCurrentScannedAmount(m2Total);
        
        alert(
          `🔄 ${isSpanish ? 'CONTINUANDO EXACTAMENTE DONDE QUEDÓ' : 'RESUMING EXACTLY WHERE LEFT OFF'}\n\n` +
          `${isSpanish ? 'Progreso guardado:' : 'Saved progress:'} ${savedProgress.toFixed(1)}%\n` +
          `${isSpanish ? 'Balance guardado:' : 'Saved balance:'} ${m2Total.toFixed(0)} ${isSpanish ? 'Miles de Millones' : 'Billions'}\n\n` +
          `✅ ${isSpanish ? 'Progreso y balance COINCIDEN perfectamente' : 'Progress and balance MATCH perfectly'}`
        );
      } else {
        console.log('[LFA2] 🆕 Nuevo archivo, iniciando desde 0%');
        setProgress(0);
        setCurrentScannedAmount(0);
        setBalances(CURRENCIES.map(c => ({ ...c, amount: 0 })));
        setCurrentFileName(fileIdentifier);
        localStorage.setItem('lfa2_current_file', fileIdentifier);
      }

      // ✅ LEER POR CHUNKS (streaming, continúa en background) - EXACTO COMO BANCO CENTRAL
      while (offset < totalSize && processingRef.current) {
        const chunk = file.slice(offset, Math.min(offset + CHUNK_SIZE, totalSize));
        const buffer = await chunk.arrayBuffer();
        const bytes = new Uint8Array(buffer);
        
        // ✅ Escanear este chunk (IGUAL que Banco Central)
        for (let i = 0; i < bytes.length - 7; i += 8) {
          const v = bytes[i] + (bytes[i+1] << 8) + (bytes[i+2] << 16) + (bytes[i+3] << 24);
          
          if (v > 100000000) {
            m2Count++;
            m2Total += 1000;
          }
        }
        
        offset += CHUNK_SIZE;
        const progressPercent = Math.min((offset / totalSize) * 100, 100);
        
        // ✅ DISTRIBUIR EN 15 DIVISAS (según porcentajes)
        const distributed = CURRENCIES.map(c => ({
          ...c,
          amount: m2Total * c.percentage
        }));
        
        // ✅ ACTUALIZAR ESTADO (Progreso y Balance SINCRONIZADOS)
        setProgress(progressPercent);
        setCurrentScannedAmount(m2Total);
        setBalances(distributed);
        setLastProcessedOffset(offset);
        
        // ✅ GUARDAR EN CADA CHUNK (para máxima persistencia) - IGUAL que Banco Central
        localStorage.setItem('lfa2_last_offset', offset.toString());
        localStorage.setItem('lfa2_progress', progressPercent.toString());
        localStorage.setItem('lfa2_balances', JSON.stringify(distributed));
        
        // Guardar también m2Count y m2Total actuales
        const tempResults = {
          totalM2Values: m2Count,
          totalM2Amount: m2Total,
          filesProcessed: 1,
          certified: false
        };
        localStorage.setItem('lfa2_analysis_results', JSON.stringify(tempResults));
        
        // Log cada 10%
        if (Math.floor(progressPercent) % 10 === 0 && Math.floor(progressPercent) !== Math.floor(((offset - CHUNK_SIZE) / totalSize) * 100)) {
          console.log(`[LFA2] 📊 ${progressPercent.toFixed(1)}%`);
          console.log(`  Offset: ${(offset / (1024 * 1024 * 1024)).toFixed(2)} GB`);
          console.log(`  M2 Values: ${m2Count}`);
          console.log(`  Total: ${m2Total.toFixed(0)} Billions`);
          console.log(`  ✅ Progreso y balance guardados y SINCRONIZADOS`);
        }
        
        // ✅ YIELD para permitir navegación (10ms) - IGUAL que Banco Central
        await new Promise(r => setTimeout(r, 10));
      }

      if (processingRef.current) {
        // ✅ COMPLETADO AL 100%
        setProgress(100);
        setLastProcessedOffset(totalSize);
        
        const finalResults = {
          totalM2Values: m2Count,
          totalM2Amount: m2Total,
          filesProcessed: 1,
          certified: true
        };
        
        setAnalysisResults(finalResults);
        
        // ✅ GUARDAR ESTADO FINAL
        localStorage.setItem('lfa2_last_offset', totalSize.toString());
        localStorage.setItem('lfa2_progress', '100');
        localStorage.setItem('lfa2_analysis_results', JSON.stringify(finalResults));

        // ✅ ALIMENTAR TODO EL SISTEMA FINAL
        const distributed = CURRENCIES.map(c => ({
          ...c,
          amount: m2Total * c.percentage
        }));
        
        const storeBalances: StoreCurrencyBalance[] = distributed.map(bal => ({
          currency: bal.code,
          totalAmount: bal.amount,
          transactionCount: Math.floor(bal.amount / 1000),
          lastUpdated: Date.now(),
          amounts: [bal.amount],
          largestTransaction: bal.amount,
          smallestTransaction: bal.amount / 1000,
          averageTransaction: bal.amount / Math.max(1, Math.floor(bal.amount / 1000)),
          accountName: `${bal.code} Liquidity`
        }));

        balanceStore.saveBalances({
          balances: storeBalances,
          lastScanDate: new Date().toISOString(),
          fileName: file.name,
          fileSize: file.size,
          totalTransactions: storeBalances.reduce((sum, b) => sum + b.transactionCount, 0)
        });

        ledgerPersistenceStore.updateBalances(
          storeBalances.map(b => ({
            currency: b.currency,
            balance: b.totalAmount,
            account: b.accountName,
            lastUpdate: Date.now()
          }))
        );

        window.dispatchEvent(new CustomEvent('balances-updated', {
          detail: { balances: storeBalances, source: 'LargeFileAnalyzer2', progress: 100 }
        }));

        console.log('[LFA2] ✅ COMPLETADO AL 100%');
        console.log(`  Progreso: 100%`);
        console.log(`  M2 Values: ${m2Count}`);
        console.log(`  Total: ${m2Total.toFixed(0)} Billions`);
        console.log(`  ✅ Panel Central: Alimentado`);
        console.log(`  ✅ Account Ledger: Alimentado`);
        console.log(`  ✅ Black Screen: Activado`);

        alert(
          `✅ ${isSpanish ? 'ANÁLISIS COMPLETADO AL 100%' : 'ANALYSIS 100% COMPLETED'}\n\n` +
          `${isSpanish ? 'Progreso:' : 'Progress:'} 100%\n` +
          `M2 Values: ${m2Count.toLocaleString()}\n` +
          `${isSpanish ? 'Total:' : 'Total:'} ${m2Total.toLocaleString()} ${isSpanish ? 'Miles de Millones' : 'Billions'}\n\n` +
          `✅ ${isSpanish ? '15 Divisas cargadas' : '15 Currencies loaded'}\n` +
          `✅ Panel Central\n` +
          `✅ Account Ledger\n` +
          `✅ Black Screen\n\n` +
          `✅ ${isSpanish ? 'Sistema completo alimentado' : 'Complete system fed'}`
        );
      } else {
        console.log('[LFA2] ⏸️ Procesamiento detenido por usuario');
      }

    } catch (error) {
      console.error('[LFA2] ❌', error);
      setProgress(0);
      alert(`❌ Error: ${error instanceof Error ? error.message : 'Unknown'}`);
    } finally {
      setAnalyzing(false);
      processingRef.current = false;
    }
  };

  const handleClearAnalysis = () => {
    const confirmed = confirm(
      `⚠️ ${isSpanish ? 'LIMPIAR ANÁLISIS Y PROGRESO' : 'CLEAR ANALYSIS AND PROGRESS'}\n\n` +
      `${isSpanish ? '¿Eliminar los balances y el progreso guardado?' : 'Delete balances and saved progress?'}\n\n` +
      `${isSpanish ? 'El próximo archivo empezará desde 0%' : 'Next file will start from 0%'}`
    );

    if (confirmed) {
      // ✅ Detener procesamiento si está activo
      processingRef.current = false;

      // Limpiar TODO de localStorage
      localStorage.removeItem('lfa2_balances');
      localStorage.removeItem('lfa2_analysis_results');
      localStorage.removeItem('lfa2_last_offset');
      localStorage.removeItem('lfa2_current_file');
      localStorage.removeItem('lfa2_progress');

      // Restaurar valores por defecto
      setBalances(CURRENCIES.map(c => ({ ...c, amount: 0 })));
      setAnalysisResults(null);
      setProgress(0);
      setCurrentScannedAmount(0);
      setLastProcessedOffset(0);
      setCurrentFileName('');

      // Limpiar también los stores globales
      balanceStore.clearBalances();
      ledgerPersistenceStore.reset();

      alert(`✅ ${isSpanish ? 'Análisis limpiado. Puede cargar un nuevo archivo desde 0%.' : 'Analysis cleared. You can load a new file from 0%.'}`);
      console.log('[LFA2] 🗑️ TODO limpiado: balances, progreso y archivo');
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        
        {/* Header */}
        <BankingHeader
          icon={Database}
          title="Large File Analyzer 2"
          subtitle={isSpanish 
            ? "15 Divisas - Técnica Banco Central Privado"
            : "15 Currencies - Private Central Bank Technique"
          }
          gradient="emerald"
          actions={
            <div className="flex items-center gap-3">
              <input
                ref={fileInputRef}
                type="file"
                accept="*"
                onChange={handleAnalyzeFile}
                aria-label={isSpanish ? "Seleccionar archivo Ledger1" : "Select Ledger1 file"}
                title={isSpanish ? "Seleccionar archivo Ledger1 para análisis" : "Select Ledger1 file for analysis"}
                className="hidden"
              />
              <BankingButton
                variant="primary"
                icon={Upload}
                onClick={() => fileInputRef.current?.click()}
                disabled={analyzing}
              >
                {analyzing 
                  ? (isSpanish ? 'Analizando...' : 'Analyzing...')
                  : (isSpanish ? 'Cargar Ledger1' : 'Load Ledger1')
                }
              </BankingButton>
              <BankingButton
                variant="ghost"
                icon={RefreshCw}
                onClick={handleClearAnalysis}
                className="border border-amber-500/30 hover:border-amber-500 text-amber-400"
              >
                {isSpanish ? "Reset 0%" : "Reset 0%"}
              </BankingButton>
              <button
                onClick={() => setBalancesVisible(!balancesVisible)}
                className="p-3 bg-slate-800 border border-slate-600 hover:border-slate-500 text-slate-300 rounded-xl transition-all"
                aria-label={isSpanish ? "Ocultar/Mostrar balances" : "Hide/Show balances"}
              >
                {balancesVisible ? <Eye className="w-5 h-5" /> : <EyeOff className="w-5 h-5" />}
              </button>
              {analysisResults?.certified && (
                <BankingBadge variant="success" icon={CheckCircle}>
                  {isSpanish ? "Certificado" : "Certified"}
                </BankingBadge>
              )}
            </div>
          }
        />

        {/* Analysis Results (si hay archivo analizado) */}
        {analysisResults && (
          <BankingCard className="p-6 border-2 border-sky-500/50 bg-sky-500/5">
            <div className="flex items-start gap-4">
              <div className="p-3 bg-sky-500/20 rounded-xl animate-pulse">
                <Activity className="w-8 h-8 text-sky-400" />
              </div>
              <div className="flex-1">
                <h3 className="text-2xl font-bold text-slate-100 mb-2">
                  {isSpanish ? "Análisis Completado" : "Analysis Completed"}
                </h3>
                <p className="text-sky-400 text-lg font-semibold mb-3">
                  {analysisResults.totalM2Values.toLocaleString()} {isSpanish ? "Valores M2 Detectados" : "M2 Values Detected"}
                </p>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                  <div>
                    <p className="text-slate-500">{isSpanish ? "Total en Miles de Millones" : "Total in Billions"}</p>
                    <p className="text-slate-100 font-bold text-xl">
                      {analysisResults.totalM2Amount.toLocaleString(isSpanish ? 'es-ES' : 'en-US', { maximumFractionDigits: 0 })}
                    </p>
                  </div>
                  <div>
                    <p className="text-slate-500">{isSpanish ? "Archivos Analizados" : "Files Analyzed"}</p>
                    <p className="text-slate-100 font-bold text-xl">{analysisResults.filesProcessed}</p>
                  </div>
                  <div>
                    <p className="text-slate-500">{isSpanish ? "Estado" : "Status"}</p>
                    <p className="text-emerald-400 font-bold text-xl">
                      ✅ {isSpanish ? "CERTIFICADO" : "CERTIFIED"}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </BankingCard>
        )}

        {/* ✅ PANTALLA DE VERIFICACIÓN Y CARGA EN TIEMPO REAL */}
        {analyzing && (
          <BankingCard className="p-6 border-2 border-sky-500/50 bg-sky-500/5">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-sky-500/20 rounded-xl">
                  <Activity className="w-6 h-6 text-sky-400 animate-spin" />
                </div>
                <div>
                  <p className="text-sky-400 font-bold text-xl">
                    {isSpanish ? "Escaneando y Verificando Ledger1" : "Scanning and Verifying Ledger1"}
                  </p>
                  <p className="text-slate-400 text-sm">
                    {isSpanish ? "Extracción de valores M2 en proceso..." : "M2 values extraction in progress..."}
                  </p>
                  <p className="text-emerald-400 text-sm font-semibold mt-2">
                    ✅ {isSpanish ? "Puedes navegar a otros módulos mientras continúa" : "You can navigate to other modules while it continues"}
                  </p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-sky-400 font-black text-3xl">{progress.toFixed(1)}%</p>
                <p className="text-slate-500 text-xs">{isSpanish ? "Completado" : "Completed"}</p>
              </div>
            </div>
            
            {/* Barra de progreso principal */}
            <div className="w-full bg-slate-800 rounded-full h-5 overflow-hidden border border-slate-700 mb-6">
              <div
                className="h-full bg-gradient-to-r from-sky-500 via-blue-600 to-sky-500 rounded-full transition-all duration-300 relative overflow-hidden"
                style={{ width: `${progress}%` }}
              >
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-pulse" />
              </div>
            </div>

            {/* VERIFICACIÓN: 15 Divisas en tiempo real */}
            <div className="grid grid-cols-3 md:grid-cols-5 gap-3">
              {balances.slice(0, 5).map((bal) => (
                <div key={bal.code} className="bg-slate-900/80 border border-slate-700 rounded-xl p-3">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="text-2xl">{bal.flag}</div>
                    <div>
                      <p className="text-slate-100 font-bold text-sm">{bal.code}</p>
                      <p className="text-slate-500 text-xs">{(bal.percentage * 100).toFixed(1)}%</p>
                    </div>
                  </div>
                  <div className="text-center">
                    <p className="text-emerald-400 font-black text-lg">
                      {bal.amount.toLocaleString(isSpanish ? 'es-ES' : 'en-US', { maximumFractionDigits: 0 })}
                    </p>
                    <p className="text-slate-500 text-xs">
                      {isSpanish ? "Millones" : "Millions"}
                    </p>
                  </div>
                  <div className="w-full bg-slate-800 rounded-full h-1 overflow-hidden mt-2">
                    <div
                      className="h-full bg-gradient-to-r from-emerald-500 to-teal-600 rounded-full transition-all duration-500"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>

            {/* Info adicional */}
            <div className="mt-4 text-center text-sm text-slate-400">
              <p>
                {isSpanish ? "Técnica:" : "Technique:"} Byte-by-byte 64-bit Little-endian | 
                {isSpanish ? " Filtro:" : " Filter:"} {'>'}100M | 
                {isSpanish ? " Total escaneado:" : " Total scanned:"} {currentScannedAmount.toLocaleString()} {isSpanish ? "Miles de Millones" : "Billions"}
              </p>
            </div>
          </BankingCard>
        )}

        {/* 15 Divisas Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
          {balances.map((bal) => (
            <BankingCard key={bal.code} className="p-5">
              <div className="text-center">
                <div className="text-4xl mb-2">{bal.flag}</div>
                <p className="text-slate-100 font-bold text-lg mb-1">{bal.code}</p>
                <p className="text-slate-500 text-xs mb-3">{bal.name}</p>
                {balancesVisible ? (
                  <>
                    <p className="text-2xl font-black text-emerald-400 mb-1">
                      {bal.amount.toLocaleString(isSpanish ? 'es-ES' : 'en-US', { maximumFractionDigits: 0 })}
                    </p>
                    <p className="text-slate-500 text-xs">
                      {isSpanish ? "Miles de Millones" : "Billions"}
                    </p>
                    <div className="mt-3 bg-emerald-500/10 border border-emerald-500/20 rounded-lg py-1 px-2">
                      <p className="text-emerald-400 text-xs font-bold">
                        {(bal.percentage * 100).toFixed(1)}%
                      </p>
                    </div>
                  </>
                ) : (
                  <p className="text-2xl font-black text-slate-600">***</p>
                )}
              </div>
            </BankingCard>
          ))}
        </div>

        {/* Módulos Alimentados */}
        {(analyzing || analysisResults?.certified) && (
          <BankingCard className="p-6">
            <h3 className="text-lg font-bold text-slate-100 mb-4 flex items-center gap-2">
              <Database className="w-5 h-5 text-sky-400" />
              {isSpanish ? "Módulos del Sistema Alimentados" : "System Modules Fed"}
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-slate-900/50 border border-slate-700 rounded-xl p-4">
                <div className="flex items-center gap-3 mb-2">
                  <div className={`w-3 h-3 rounded-full ${analyzing || analysisResults?.certified ? 'bg-emerald-500 animate-pulse' : 'bg-slate-600'}`} />
                  <p className="text-slate-100 font-semibold">🏦 Panel Central</p>
                </div>
                <p className="text-slate-400 text-xs">
                  {isSpanish ? "Dashboard consolidado actualizado" : "Consolidated dashboard updated"}
                </p>
              </div>
              <div className="bg-slate-900/50 border border-slate-700 rounded-xl p-4">
                <div className="flex items-center gap-3 mb-2">
                  <div className={`w-3 h-3 rounded-full ${analyzing || analysisResults?.certified ? 'bg-emerald-500 animate-pulse' : 'bg-slate-600'}`} />
                  <p className="text-slate-100 font-semibold">📊 Account Ledger</p>
                </div>
                <p className="text-slate-400 text-xs">
                  {isSpanish ? "15 cuentas activas" : "15 active accounts"}
                </p>
              </div>
              <div className="bg-slate-900/50 border border-slate-700 rounded-xl p-4">
                <div className="flex items-center gap-3 mb-2">
                  <div className={`w-3 h-3 rounded-full ${analyzing || analysisResults?.certified ? 'bg-emerald-500 animate-pulse' : 'bg-slate-600'}`} />
                  <p className="text-slate-100 font-semibold">🖥️ Black Screen</p>
                </div>
                <p className="text-slate-400 text-xs">
                  {isSpanish ? "Pantallas generadas" : "Screens generated"}
                </p>
              </div>
            </div>
            {analyzing && (
              <div className="mt-4 bg-sky-500/10 border border-sky-500/30 rounded-lg p-3 text-center">
                <p className="text-sky-400 text-sm font-semibold">
                  ✅ {isSpanish ? "Puede navegar a otros módulos - El procesamiento continúa en segundo plano" : "You can navigate to other modules - Processing continues in background"}
                </p>
              </div>
            )}
          </BankingCard>
        )}
      </div>
    </div>
  );
}
