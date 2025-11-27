/**
 * Account Ledger 1 - Private Central Bank Treasury Accounts
 * 15 Master Accounts sincronizadas en tiempo real
 */

import React, { useState, useEffect } from 'react';
import { 
  Database, TrendingUp, Activity, CheckCircle, DollarSign,
  Shield, RefreshCw, Download, Eye, EyeOff
} from 'lucide-react';
import { BankingCard, BankingHeader, BankingSection, BankingBadge } from './ui/BankingComponents';
import { useBankingTheme } from '../hooks/useBankingTheme';
import { ledgerAccountsStore, type LedgerAccount } from '../lib/ledger-accounts-store';

export function AccountLedger1() {
  const { fmt, isSpanish } = useBankingTheme();
  const [accounts, setAccounts] = useState<LedgerAccount[]>([]);
  const [balancesVisible, setBalancesVisible] = useState(true);

  // ✅ Suscribirse a ledgerAccountsStore para tiempo real
  useEffect(() => {
    const loadAccounts = async () => {
      const allAccounts = await ledgerAccountsStore.getAllAccounts(true);
      // Filtrar solo cuentas de Private Central Bank
      const pcbAccounts = allAccounts.filter(acc => acc.accountId.startsWith('PCB-'));
      setAccounts(pcbAccounts);
      console.log('[Account Ledger 1] 📊 Cargadas:', pcbAccounts.length, 'cuentas Treasury');
    };

    loadAccounts();

    const unsubscribe = ledgerAccountsStore.subscribe((allAccounts) => {
      const pcbAccounts = allAccounts.filter(acc => acc.accountId.startsWith('PCB-'));
      setAccounts(pcbAccounts);
      console.log('[Account Ledger 1] 🔄 Actualizado:', pcbAccounts.length, 'cuentas');
    });

    return () => unsubscribe();
  }, []);

  const totalBalance = accounts.reduce((sum, acc) => sum + acc.balance, 0);
  const activeCurrencies = new Set(accounts.map(acc => acc.currency)).size;

  return (
    <div className="min-h-screen bg-slate-950 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        
        {/* Header */}
        <BankingHeader
          icon={Database}
          title={isSpanish ? "Account Ledger 1" : "Account Ledger 1"}
          subtitle={isSpanish 
            ? "Cuentas Treasury del Private Central Bank - 15 Master Accounts"
            : "Private Central Bank Treasury Accounts - 15 Master Accounts"
          }
          gradient="emerald"
          actions={
            <div className="flex items-center gap-3">
              <button
                onClick={() => setBalancesVisible(!balancesVisible)}
                className="p-3 bg-slate-800 border border-slate-600 hover:border-slate-500 text-slate-300 rounded-xl transition-all"
              >
                {balancesVisible ? <Eye className="w-5 h-5" /> : <EyeOff className="w-5 h-5" />}
              </button>
              <BankingBadge variant="success" icon={Activity}>
                {isSpanish ? "En Vivo" : "Live"}
              </BankingBadge>
            </div>
          }
        />

        {/* Métricas */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <BankingCard className="p-6">
            <div className="flex items-start justify-between mb-4">
              <div>
                <p className="text-slate-400 text-sm font-semibold uppercase mb-2">
                  {isSpanish ? "Total Cuentas" : "Total Accounts"}
                </p>
                <p className="text-4xl font-bold text-slate-100">{accounts.length}</p>
              </div>
              <div className="p-3 bg-emerald-500/10 rounded-xl">
                <Database className="w-6 h-6 text-emerald-400" />
              </div>
            </div>
          </BankingCard>

          <BankingCard className="p-6">
            <div className="flex items-start justify-between mb-4">
              <div>
                <p className="text-slate-400 text-sm font-semibold uppercase mb-2">
                  {isSpanish ? "Divisas Activas" : "Active Currencies"}
                </p>
                <p className="text-4xl font-bold text-slate-100">{activeCurrencies}</p>
              </div>
              <div className="p-3 bg-sky-500/10 rounded-xl">
                <TrendingUp className="w-6 h-6 text-sky-400" />
              </div>
            </div>
          </BankingCard>

          <BankingCard className="p-6 md:col-span-2">
            <div className="flex items-start justify-between mb-4">
              <div>
                <p className="text-slate-400 text-sm font-semibold uppercase mb-2">
                  {isSpanish ? "Balance Total (USD equiv.)" : "Total Balance (USD equiv.)"}
                </p>
                {balancesVisible ? (
                  <p className="text-3xl font-bold text-emerald-400">
                    {fmt.currency(totalBalance, 'USD')}
                  </p>
                ) : (
                  <p className="text-3xl font-bold text-slate-600">
                    {'*'.repeat(15)}
                  </p>
                )}
              </div>
              <div className="p-3 bg-emerald-500/10 rounded-xl">
                <DollarSign className="w-6 h-6 text-emerald-400" />
              </div>
            </div>
            <p className="text-slate-500 text-xs">
              {isSpanish ? "Actualización en tiempo real desde Private Central Bank" : "Real-time update from Private Central Bank"}
            </p>
          </BankingCard>
        </div>

        {/* 15 Master Accounts Treasury */}
        <BankingSection
          title={isSpanish ? "15 Master Accounts Treasury (M2 Money Supply)" : "15 Master Accounts Treasury (M2 Money Supply)"}
          icon={Shield}
          color="emerald"
        >
          {accounts.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {accounts.map((account) => {
                // Encontrar info de la divisa
                const currInfo = [
                  { code: 'USD', flag: '🇺🇸', name: 'US Dollar' },
                  { code: 'EUR', flag: '🇪🇺', name: 'Euro' },
                  { code: 'GBP', flag: '🇬🇧', name: 'British Pound' },
                  { code: 'JPY', flag: '🇯🇵', name: 'Japanese Yen' },
                  { code: 'CHF', flag: '🇨🇭', name: 'Swiss Franc' },
                  { code: 'CAD', flag: '🇨🇦', name: 'Canadian Dollar' },
                  { code: 'AUD', flag: '🇦🇺', name: 'Australian Dollar' },
                  { code: 'CNY', flag: '🇨🇳', name: 'Chinese Yuan' },
                  { code: 'MXN', flag: '🇲🇽', name: 'Mexican Peso' },
                  { code: 'SGD', flag: '🇸🇬', name: 'Singapore Dollar' },
                  { code: 'HKD', flag: '🇭🇰', name: 'Hong Kong Dollar' },
                  { code: 'INR', flag: '🇮🇳', name: 'Indian Rupee' },
                  { code: 'BRL', flag: '🇧🇷', name: 'Brazilian Real' },
                  { code: 'RUB', flag: '🇷🇺', name: 'Russian Ruble' },
                  { code: 'KRW', flag: '🇰🇷', name: 'South Korean Won' }
                ].find(c => c.code === account.currency);

                return (
                  <div
                    key={account.accountId}
                    className="bg-gradient-to-br from-slate-900 to-slate-800 border border-slate-700 hover:border-emerald-500/50 rounded-xl p-5 transition-all group"
                  >
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <span className="text-3xl">{currInfo?.flag}</span>
                        <div>
                          <p className="text-slate-100 font-bold text-lg group-hover:text-emerald-400 transition-colors">
                            {account.currency}
                          </p>
                          <p className="text-slate-500 text-xs">{currInfo?.name}</p>
                        </div>
                      </div>
                      <BankingBadge variant="success">{account.status}</BankingBadge>
                    </div>

                    <div className="mb-4">
                      <p className="text-slate-400 text-xs mb-2 uppercase">{isSpanish ? "Balance Treasury" : "Treasury Balance"}</p>
                      {balancesVisible ? (
                        <>
                          <p className="text-2xl font-black text-emerald-400">
                            {fmt.currency(account.balance, account.currency)}
                          </p>
                          <p className="text-slate-500 text-xs mt-1">
                            {(account.balance / 1000000000).toLocaleString(isSpanish ? 'es-ES' : 'en-US', { maximumFractionDigits: 0 })} {isSpanish ? "M.Millones" : "Billions"}
                          </p>
                        </>
                      ) : (
                        <p className="text-2xl font-black text-slate-600">
                          {'*'.repeat(12)}
                        </p>
                      )}
                    </div>

                    <div className="space-y-2 text-xs">
                      <div className="flex justify-between">
                        <span className="text-slate-500">Account ID:</span>
                        <code className="text-sky-400 font-mono">{account.accountId}</code>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">{isSpanish ? "Tipo:" : "Type:"}</span>
                        <span className="text-purple-400 font-semibold">M2 Treasury</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">{isSpanish ? "Actualizado:" : "Updated:"}</span>
                        <span className="text-slate-400">{fmt.relativeTime(account.lastUpdated)}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-20">
              <Database className="w-20 h-20 text-slate-700 mx-auto mb-4" />
              <p className="text-slate-400 text-lg font-medium mb-2">
                {isSpanish ? "No hay cuentas Treasury aún" : "No Treasury accounts yet"}
              </p>
              <p className="text-slate-600 text-sm">
                {isSpanish 
                  ? "Carga un archivo Ledger1 en Private Central Bank para crear las 15 Master Accounts"
                  : "Load a Ledger1 file in Private Central Bank to create the 15 Master Accounts"
                }
              </p>
            </div>
          )}
        </BankingSection>

        {/* Footer Info */}
        <BankingCard className="p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-3 h-3 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)] animate-pulse" />
              <div>
                <p className="text-slate-100 font-semibold">
                  {isSpanish ? "Conectado a Private Central Bank" : "Connected to Private Central Bank"}
                </p>
                <p className="text-slate-400 text-sm">
                  {isSpanish ? "Actualización automática en tiempo real" : "Automatic real-time update"}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <BankingBadge variant="success">M2 Money Supply</BankingBadge>
              <BankingBadge variant="info">Treasury</BankingBadge>
            </div>
          </div>
        </BankingCard>
      </div>
    </div>
  );
}

