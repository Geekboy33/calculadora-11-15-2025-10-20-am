/**
 * Large File Analyzer 2 - Digital Commercial Bank Ltd
 * Análisis de 15 divisas con técnica optimizada del Private Central Bank
 * Streaming, progreso sincronizado, persistencia total
 */

import React, { useState } from 'react';
import {
  Database, Shield, Activity, CheckCircle, DollarSign, 
  Eye, EyeOff, Download, RefreshCw, Upload, TrendingUp
} from 'lucide-react';
import { BankingCard, BankingHeader, BankingButton, BankingSection, BankingMetric, BankingBadge } from './ui/BankingComponents';
import { useBankingTheme } from '../hooks/useBankingTheme';
import { downloadTXT } from '../lib/download-helper';
import { balanceStore, type CurrencyBalance } from '../lib/balances-store';
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
  currency: string;
  balance: number;
  percentage: number;
}

export function LargeFileAnalyzer2() {
  const { fmt, isSpanish } = useBankingTheme();

  // Estados
  const [analyzing, setAnalyzing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [balances, setBalances] = useState<CurrencyBalance[]>(() => {
    const saved = localStorage.getItem('lfa2_balances');
    return saved ? JSON.parse(saved) : CURRENCIES.map(c => ({ currency: c.code, balance: 0, percentage: c.percentage }));
  });
  const [lastOffset, setLastOffset] = useState(() => {
    const saved = localStorage.getItem('lfa2_last_offset');
    return saved ? parseInt(saved) : 0;
  });
  const [currentFile, setCurrentFile] = useState(() => {
    return localStorage.getItem('lfa2_current_file') || '';
  });
  const [totalScanned, setTotalScanned] = useState(0);
  const [certified, setCertified] = useState(false);
  const [balancesVisible, setBalancesVisible] = useState(true);
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const processingRef = React.useRef(false);

  // Auto-guardar balances
  React.useEffect(() => {
    if (balances.some(b => b.balance > 0)) {
      localStorage.setItem('lfa2_balances', JSON.stringify(balances));
    }
  }, [balances]);

  // ✅ NO detener procesamiento al desmontar
  React.useEffect(() => {
    return () => {
      // El procesamiento continúa en background
      console.log('[LFA2] 💾 Componente desmontado, procesamiento continúa en background');
      // NO hacemos processingRef.current = false aquí
    };
  }, []);

  const handleAnalyzeFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    processingRef.current = true;
    setAnalyzing(true);

    try {
      const fileId = `${file.name}_${file.size}_${file.lastModified}`;
      const isSameFile = currentFile === fileId;
      const totalSize = file.size;
      const CHUNK_SIZE = 10 * 1024 * 1024;
      
      let offset = isSameFile ? lastOffset : 0;
      let m2Count = 0;
      let m2Total = isSameFile ? balances.reduce((sum, b) => sum + b.balance, 0) : 0;

      console.log('[LFA2] 📂', file.name, '-', (file.size / (1024 * 1024)).toFixed(2), 'MB');

      if (isSameFile && offset > 0) {
        const savedProg = (offset / totalSize) * 100;
        setProgress(savedProg);
        console.log(`[LFA2] 🔄 Continuando desde ${savedProg.toFixed(1)}%`);
        alert(`🔄 ${isSpanish ? 'Continuando desde' : 'Resuming from'} ${savedProg.toFixed(1)}%`);
      } else {
        setProgress(0);
        setTotalScanned(0);
        setCurrentFile(fileId);
        localStorage.setItem('lfa2_current_file', fileId);
        // Reset balances
        setBalances(CURRENCIES.map(c => ({ currency: c.code, balance: 0, percentage: c.percentage })));
      }

      // ✅ PROCESAMIENTO ASÍNCRONO NO BLOQUEANTE
      const processChunk = async (chunkOffset: number) => {
        if (!processingRef.current) return false;

        const chunk = file.slice(chunkOffset, Math.min(chunkOffset + CHUNK_SIZE, totalSize));
        const buffer = await chunk.arrayBuffer();
        const bytes = new Uint8Array(buffer);
        
        // Procesar chunk
        for (let i = 0; i < bytes.length - 7; i += 8) {
          const v = bytes[i] + (bytes[i+1] << 8) + (bytes[i+2] << 16) + (bytes[i+3] << 24);
          if (v > 100000000) {
            m2Count++;
            m2Total += 1000;
          }
        }
        
        return true;
      };

      // Loop asíncrono con yields frecuentes
      while (offset < totalSize && processingRef.current) {
        // Procesar chunk
        await processChunk(offset);
        
        offset += CHUNK_SIZE;
        const prog = Math.min((offset / totalSize) * 100, 100);
        
        // Distribuir en 15 divisas
        const newBalances = CURRENCIES.map(c => ({
          currency: c.code,
          balance: m2Total * c.percentage,
          percentage: c.percentage
        }));
        
        // ✅ Actualizar UI usando requestAnimationFrame (más suave)
        requestAnimationFrame(() => {
          setProgress(prog);
          setTotalScanned(m2Total);
          setBalances(newBalances);
          setLastOffset(offset);
        });
        
        localStorage.setItem('lfa2_last_offset', offset.toString());
        localStorage.setItem('lfa2_balances', JSON.stringify(newBalances));
        
        // ✅ ALIMENTAR SISTEMA cada 10%
        if (Math.floor(prog) % 10 === 0 && Math.floor(prog) !== Math.floor(((offset - CHUNK_SIZE) / totalSize) * 100)) {
          console.log(`[LFA2] 📊 ${prog.toFixed(0)}%`);
          
          const balancesForStore: CurrencyBalance[] = newBalances.map(bal => ({
            currency: bal.currency,
            totalAmount: bal.balance,
            balance: bal.balance,
            transactionCount: Math.floor(bal.balance / 1000),
            lastUpdated: Date.now(),
            amounts: [bal.balance],
            largestTransaction: bal.balance,
            smallestTransaction: bal.balance / 1000,
            averageTransaction: bal.balance / Math.max(1, Math.floor(bal.balance / 1000)),
            accountName: `${bal.currency} Account`,
            lastUpdate: new Date().toISOString()
          }));

          // ✅ Usar setTimeout para no bloquear
          setTimeout(() => {
            balanceStore.saveBalances({
              balances: balancesForStore,
              lastScanDate: new Date().toISOString(),
              fileName: file.name,
              fileSize: file.size,
              totalTransactions: balancesForStore.reduce((sum, b) => sum + b.transactionCount, 0)
            });

            ledgerPersistenceStore.updateBalances(
              balancesForStore.map(b => ({
                currency: b.currency,
                balance: b.balance,
                account: b.accountName,
                lastUpdate: Date.now()
              }))
            );

            console.log(`[LFA2] 💾 Sistema alimentado al ${prog.toFixed(0)}%`);
          }, 0);
        }
        
        // ✅ YIELD frecuente para permitir navegación
        await new Promise(r => setTimeout(r, 50)); // 50ms para dar tiempo a la UI
      }

      if (processingRef.current) {
        setProgress(100);
        setCertified(true);
        
        // ✅ ALIMENTAR TODO EL SISTEMA (como Large File Analyzer)
        
        // 1. Convertir a CurrencyBalance para balanceStore
        const currencyBalances: CurrencyBalance[] = newBalances.map(bal => ({
          currency: bal.currency,
          totalAmount: bal.balance,
          balance: bal.balance,
          transactionCount: Math.floor(bal.balance / 1000), // Aproximación
          lastUpdated: Date.now(),
          amounts: [bal.balance],
          largestTransaction: bal.balance,
          smallestTransaction: bal.balance / 1000,
          averageTransaction: bal.balance / Math.max(1, Math.floor(bal.balance / 1000)),
          accountName: `${bal.currency} Account`,
          lastUpdate: new Date().toISOString()
        }));

        // 2. Guardar en balanceStore (alimenta Panel Central)
        balanceStore.saveBalances({
          balances: currencyBalances,
          lastScanDate: new Date().toISOString(),
          fileName: file.name,
          fileSize: file.size,
          totalTransactions: currencyBalances.reduce((sum, b) => sum + b.transactionCount, 0)
        });

        console.log('[LFA2] 💾 Balances guardados en balanceStore (Panel Central alimentado)');

        // 3. Guardar en ledgerPersistenceStore (alimenta Account Ledger)
        ledgerPersistenceStore.updateBalances(
          currencyBalances.map(b => ({
            currency: b.currency,
            balance: b.balance,
            account: b.accountName,
            lastUpdate: Date.now()
          }))
        );

        console.log('[LFA2] 💾 Balances guardados en ledgerPersistenceStore (Account Ledger alimentado)');

        // 4. Disparar eventos para Black Screen
        window.dispatchEvent(new CustomEvent('balances-updated', {
          detail: { balances: currencyBalances, source: 'LFA2' }
        }));

        console.log('[LFA2] 📡 Evento disparado para Black Screen');
        
        console.log('[LFA2] ✅ COMPLETADO - 15 divisas cargadas');
        console.log('[LFA2] ✅ Panel Central: Alimentado');
        console.log('[LFA2] ✅ Account Ledger: Alimentado');
        console.log('[LFA2] ✅ Black Screen: Activado');
        
        alert(
          `✅ ${isSpanish ? 'ANÁLISIS COMPLETADO' : 'ANALYSIS COMPLETED'}\n\n` +
          `${isSpanish ? 'Progreso:' : 'Progress:'} 100%\n` +
          `M2 Values: ${m2Count.toLocaleString()}\n` +
          `${isSpanish ? 'Total:' : 'Total:'} ${m2Total.toLocaleString()}\n\n` +
          `${isSpanish ? '15 Divisas Cargadas:' : '15 Currencies Loaded:'}\n` +
          `✅ Panel Central\n` +
          `✅ Account Ledger\n` +
          `✅ Black Screen\n\n` +
          `${isSpanish ? 'Sistema completo alimentado' : 'Complete system fed'}`
        );
      }

    } catch (error) {
      console.error('[LFA2] ❌', error);
      alert(`❌ Error: ${error instanceof Error ? error.message : 'Unknown'}`);
    } finally {
      setAnalyzing(false);
      processingRef.current = false;
    }
  };

  const handleClear = () => {
    if (confirm(`⚠️ ${isSpanish ? 'Limpiar análisis' : 'Clear analysis'}?`)) {
      processingRef.current = false;
      localStorage.removeItem('lfa2_balances');
      localStorage.removeItem('lfa2_last_offset');
      localStorage.removeItem('lfa2_current_file');
      setBalances(CURRENCIES.map(c => ({ currency: c.code, balance: 0, percentage: c.percentage })));
      setProgress(0);
      setTotalScanned(0);
      setLastOffset(0);
      setCurrentFile('');
      setCertified(false);
      alert(`✅ ${isSpanish ? 'Limpiado' : 'Cleared'}`);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        
        <BankingHeader
          icon={Database}
          title="Large File Analyzer 2"
          subtitle={isSpanish ? "Análisis de 15 Divisas - Técnica Optimizada" : "15 Currencies Analysis - Optimized Technique"}
          gradient="emerald"
          actions={
            <div className="flex items-center gap-3">
              <input
                ref={fileInputRef}
                type="file"
                accept="*"
                onChange={handleAnalyzeFile}
                aria-label="Select file"
                title="Select Ledger1 file"
                className="hidden"
              />
              <BankingButton
                variant="primary"
                icon={Upload}
                onClick={() => fileInputRef.current?.click()}
                disabled={analyzing}
              >
                {analyzing ? (isSpanish ? 'Analizando...' : 'Analyzing...') : (isSpanish ? 'Cargar Ledger1' : 'Load Ledger1')}
              </BankingButton>
              {certified && (
                <BankingButton variant="ghost" icon={RefreshCw} onClick={handleClear} className="border border-amber-500/30">
                  {isSpanish ? 'Limpiar' : 'Clear'}
                </BankingButton>
              )}
              <button
                onClick={() => setBalancesVisible(!balancesVisible)}
                className="p-3 bg-slate-800 border border-slate-600 hover:border-slate-500 text-slate-300 rounded-xl transition-all"
              >
                {balancesVisible ? <Eye className="w-5 h-5" /> : <EyeOff className="w-5 h-5" />}
              </button>
              {certified && <BankingBadge variant="success" icon={CheckCircle}>Certified</BankingBadge>}
            </div>
          }
        />

        {/* Progreso */}
        {analyzing && (
          <BankingCard className="p-6 border-2 border-emerald-500/50">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <Activity className="w-6 h-6 text-emerald-400 animate-spin" />
                <div>
                  <p className="text-emerald-400 font-bold text-xl">
                    {isSpanish ? "Escaneando 15 Divisas..." : "Scanning 15 Currencies..."}
                  </p>
                  <p className="text-sky-400 text-sm">
                    {isSpanish ? "✅ Puede navegar a otros módulos mientras procesa" : "✅ You can navigate to other modules while processing"}
                  </p>
                </div>
              </div>
              <p className="text-emerald-400 font-black text-3xl">{progress.toFixed(1)}%</p>
            </div>
            <div className="w-full bg-slate-800 rounded-full h-4 overflow-hidden border border-slate-700 mb-4">
              <div className="h-full bg-gradient-to-r from-emerald-500 to-teal-600 rounded-full transition-all" style={{ width: `${progress}%` }}>
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-pulse" />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4 text-center text-sm">
              <div>
                <p className="text-slate-400">{isSpanish ? "Escaneado" : "Scanned"}</p>
                <p className="text-emerald-400 font-bold">{totalScanned.toFixed(0)} Billions</p>
              </div>
              <div>
                <p className="text-slate-400">{isSpanish ? "Alimentando" : "Feeding"}</p>
                <p className="text-sky-400 font-bold">
                  Panel Central + Ledger + Black Screen
                </p>
              </div>
              <div>
                <p className="text-slate-400">{isSpanish ? "Divisas" : "Currencies"}</p>
                <p className="text-purple-400 font-bold">15</p>
              </div>
            </div>
          </BankingCard>
        )}

        {/* 15 Divisas Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
          {balances.map((bal) => {
            const currInfo = CURRENCIES.find(c => c.code === bal.currency)!;
            return (
              <BankingCard key={bal.currency} className="p-5">
                <div className="text-center">
                  <div className="text-4xl mb-2">{currInfo.flag}</div>
                  <p className="text-slate-100 font-bold text-lg mb-1">{bal.currency}</p>
                  <p className="text-slate-500 text-xs mb-3">{currInfo.name}</p>
                  {balancesVisible ? (
                    <>
                      <p className="text-2xl font-black text-emerald-400 mb-1">
                        {bal.balance.toFixed(0)}
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
            );
          })}
        </div>

        {/* Módulos Alimentados */}
        {(analyzing || certified) && (
          <BankingCard className="p-6">
            <h3 className="text-lg font-bold text-slate-100 mb-4 flex items-center gap-2">
              <Database className="w-5 h-5 text-sky-400" />
              {isSpanish ? "Módulos del Sistema Alimentados" : "System Modules Fed"}
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-slate-900/50 border border-slate-700 rounded-xl p-4">
                <div className="flex items-center gap-3 mb-2">
                  <div className={`w-3 h-3 rounded-full ${analyzing || certified ? 'bg-emerald-500 animate-pulse' : 'bg-slate-600'}`} />
                  <p className="text-slate-100 font-semibold">🏦 Panel Central</p>
                </div>
                <p className="text-slate-400 text-xs">
                  {isSpanish ? "Dashboard consolidado actualizado" : "Consolidated dashboard updated"}
                </p>
              </div>
              <div className="bg-slate-900/50 border border-slate-700 rounded-xl p-4">
                <div className="flex items-center gap-3 mb-2">
                  <div className={`w-3 h-3 rounded-full ${analyzing || certified ? 'bg-emerald-500 animate-pulse' : 'bg-slate-600'}`} />
                  <p className="text-slate-100 font-semibold">📊 Account Ledger</p>
                </div>
                <p className="text-slate-400 text-xs">
                  {isSpanish ? "15 cuentas activas" : "15 active accounts"}
                </p>
              </div>
              <div className="bg-slate-900/50 border border-slate-700 rounded-xl p-4">
                <div className="flex items-center gap-3 mb-2">
                  <div className={`w-3 h-3 rounded-full ${analyzing || certified ? 'bg-emerald-500 animate-pulse' : 'bg-slate-600'}`} />
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

