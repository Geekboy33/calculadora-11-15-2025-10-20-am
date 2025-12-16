/**
 * Custody Accounts 1 - Cuentas Custodio para Treasury Reserve1
 * CLON de CustodyAccountsModule alimentado por ledgerPersistenceStoreV2
 */

import { useState, useEffect, useRef } from 'react';
import {
  Shield, Plus, Lock, Unlock, ExternalLink, Check, X, Copy,
  Download, AlertCircle, CheckCircle, Wallet, ArrowUp, TrendingUp,
  Database, DollarSign, Building2, Cpu, Zap, Activity
} from 'lucide-react';
import { useLanguage } from '../lib/i18n';
import { ledgerPersistenceStoreV2, type LedgerBalanceV2 } from '../lib/ledger-persistence-store-v2';

const BLOCKCHAINS = [
  { name: 'Ethereum', symbol: 'ETH', color: 'text-blue-400' },
  { name: 'Binance Smart Chain', symbol: 'BSC', color: 'text-yellow-400' },
  { name: 'Polygon', symbol: 'MATIC', color: 'text-purple-400' },
  { name: 'Arbitrum', symbol: 'ARB', color: 'text-cyan-400' },
  { name: 'Optimism', symbol: 'OP', color: 'text-red-400' },
  { name: 'Avalanche', symbol: 'AVAX', color: 'text-red-300' },
  { name: 'Solana', symbol: 'SOL', color: 'text-white' },
  { name: 'Stellar', symbol: 'XLM', color: 'text-indigo-400' },
];

interface CustodyAccount1 {
  id: string;
  accountName: string;
  accountType: 'blockchain' | 'banking';
  currency: string;
  balance: number;
  reservedBalance: number;
  availableBalance: number;
  blockchain: string;
  tokenSymbol: string;
  fundDenomination: 'M1' | 'M2';
  status: 'active' | 'pending' | 'locked';
  createdAt: string;
  lastUpdate: number;
  transactionCount: number;
}

// Formateador
function formatCurrencyFull(amount: number, currency: string): string {
  if (amount <= 0) return `${currency} 0.00`;
  const bigAmount = BigInt(Math.floor(amount));
  const symbols: Record<string, string> = {
    'USD': '$', 'EUR': '€', 'GBP': '£', 'CHF': 'CHF ', 'CAD': 'C$',
    'AUD': 'A$', 'JPY': '¥', 'CNY': '¥', 'INR': '₹', 'MXN': 'MX$',
    'BRL': 'R$', 'RUB': '₽', 'KRW': '₩', 'SGD': 'S$', 'HKD': 'HK$'
  };
  return `${symbols[currency] || currency + ' '}${bigAmount.toLocaleString('en-US')}.00`;
}

export function CustodyAccountsModule1() {
  const { language } = useLanguage();
  const isSpanish = language === 'es';
  
  const [accounts, setAccounts] = useState<CustodyAccount1[]>([]);
  const [ledgerBalances, setLedgerBalances] = useState<LedgerBalanceV2[]>([]);
  const [selectedAccount, setSelectedAccount] = useState<CustodyAccount1 | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentQuadrillion, setCurrentQuadrillion] = useState(0);
  const [isLiveUpdating, setIsLiveUpdating] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showReserveModal, setShowReserveModal] = useState(false);
  
  const [formData, setFormData] = useState({
    accountType: 'blockchain' as 'blockchain' | 'banking',
    accountName: '',
    currency: 'USD',
    amount: 0,
    blockchain: 'Ethereum',
    tokenSymbol: 'VUSD',
    fundDenomination: 'M1' as 'M1' | 'M2',
  });
  
  const [reserveAmount, setReserveAmount] = useState(0);

  // Suscribirse a Treasury Reserve1
  useEffect(() => {
    const state = ledgerPersistenceStoreV2.getState();
    updateAccountsFromBalances(state.balances);
    setLedgerBalances(state.balances);
    setProgress(state.progress.percentage);
    setCurrentQuadrillion(state.progress.currentQuadrillion);
    setIsProcessing(state.isProcessing);

    const unsubscribe = ledgerPersistenceStoreV2.subscribe((newState) => {
      updateAccountsFromBalances(newState.balances);
      setLedgerBalances(newState.balances);
      setProgress(newState.progress.percentage);
      setCurrentQuadrillion(newState.progress.currentQuadrillion);
      setIsProcessing(newState.isProcessing);
      
      setIsLiveUpdating(true);
      setTimeout(() => setIsLiveUpdating(false), 300);
    });

    return unsubscribe;
  }, []);

  const updateAccountsFromBalances = (balances: LedgerBalanceV2[]) => {
    // Cargar cuentas guardadas
    const savedAccounts = localStorage.getItem('custody_accounts_v2');
    let existingAccounts: CustodyAccount1[] = savedAccounts ? JSON.parse(savedAccounts) : [];
    
    // Actualizar balances de cuentas existentes basado en los balances del store
    const updatedAccounts = existingAccounts.map(acc => {
      const matchingBalance = balances.find(b => b.currency === acc.currency);
      if (matchingBalance) {
        return {
          ...acc,
          balance: matchingBalance.balance,
          availableBalance: matchingBalance.balance - acc.reservedBalance,
          lastUpdate: matchingBalance.lastUpdate,
          transactionCount: matchingBalance.transactionCount
        };
      }
      return acc;
    });
    
    setAccounts(updatedAccounts);
  };

  const handleCreateAccount = () => {
    if (!formData.accountName || formData.amount <= 0) {
      alert(isSpanish ? 'Completa nombre y monto' : 'Complete name and amount');
      return;
    }

    const balanceCurrency = ledgerBalances.find(b => b.currency === formData.currency);
    if (!balanceCurrency) {
      alert(isSpanish ? 'No hay balance para esa divisa' : 'No balance for that currency');
      return;
    }
    if (formData.amount > balanceCurrency.balance) {
      alert(isSpanish ? 'Monto supera el balance disponible en Treasury1' : 'Amount exceeds available balance from Treasury1');
      return;
    }

    const newAccount: CustodyAccount1 = {
      id: `CUSTODY1-${Date.now()}`,
      accountName: formData.accountName,
      accountType: formData.accountType,
      currency: formData.currency,
      balance: formData.amount,
      reservedBalance: 0,
      availableBalance: formData.amount,
      blockchain: formData.blockchain,
      tokenSymbol: formData.tokenSymbol || `${formData.currency}T`,
      fundDenomination: formData.fundDenomination,
      status: 'active',
      createdAt: new Date().toISOString(),
      lastUpdate: Date.now(),
      transactionCount: 0
    };

    const updatedAccounts = [...accounts, newAccount];
    setAccounts(updatedAccounts);
    localStorage.setItem('custody_accounts_v2', JSON.stringify(updatedAccounts));
    setShowCreateModal(false);
    
    // Reiniciar form
    setFormData({
      accountType: 'blockchain',
      accountName: '',
      currency: 'USD',
      amount: 0,
      blockchain: 'Ethereum',
      tokenSymbol: 'VUSD',
      fundDenomination: 'M1',
    });
  };

  const handleReserveFunds = () => {
    if (!selectedAccount || reserveAmount <= 0) return;
    if (reserveAmount > selectedAccount.availableBalance) {
      alert(isSpanish ? 'Monto excede balance disponible' : 'Amount exceeds available balance');
      return;
    }
    if (selectedAccount.reservedBalance > 0) {
      alert(isSpanish ? '⛔ Esta cuenta ya tiene fondos reservados' : '⛔ This account already has reserved funds');
      return;
    }

    const updatedAccounts = accounts.map(acc => {
      if (acc.id === selectedAccount.id) {
        return {
          ...acc,
          reservedBalance: reserveAmount,
          availableBalance: acc.balance - reserveAmount,
          status: 'locked' as const
        };
      }
      return acc;
    });

    setAccounts(updatedAccounts);
    localStorage.setItem('custody_accounts_v2', JSON.stringify(updatedAccounts));
    setShowReserveModal(false);
    setReserveAmount(0);
    setSelectedAccount(null);
  };

  const handleReleaseFunds = (accountId: string) => {
    const updatedAccounts = accounts.map(acc => {
      if (acc.id === accountId) {
        return {
          ...acc,
          availableBalance: acc.balance,
          reservedBalance: 0,
          status: 'active' as const
        };
      }
      return acc;
    });

    setAccounts(updatedAccounts);
    localStorage.setItem('custody_accounts_v2', JSON.stringify(updatedAccounts));
  };

  const handleDeleteAccount = (accountId: string) => {
    if (!confirm(isSpanish ? '¿Eliminar esta cuenta?' : 'Delete this account?')) return;
    const updatedAccounts = accounts.filter(acc => acc.id !== accountId);
    setAccounts(updatedAccounts);
    localStorage.setItem('custody_accounts_v2', JSON.stringify(updatedAccounts));
  };

  const totalBalance = accounts.reduce((sum, acc) => sum + acc.balance, 0);
  const totalReserved = accounts.reduce((sum, acc) => sum + acc.reservedBalance, 0);
  const totalAvailable = accounts.reduce((sum, acc) => sum + acc.availableBalance, 0);

  // Separar M1 y M2
  const m1Accounts = accounts.filter(acc => acc.fundDenomination === 'M1');
  const m2Accounts = accounts.filter(acc => acc.fundDenomination === 'M2');
  const totalM1 = m1Accounts.reduce((sum, acc) => sum + acc.balance, 0);
  const totalM2 = m2Accounts.reduce((sum, acc) => sum + acc.balance, 0);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-purple-950 to-slate-950 text-white p-6 overflow-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <Shield className="w-10 h-10 text-purple-400" />
            <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
              Custody Accounts 1
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
            {isSpanish ? 'Cuentas custodio sincronizadas con Treasury Reserve1' : 'Custody accounts synced with Treasury Reserve1'}
          </p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 bg-purple-500 hover:bg-purple-600 px-4 py-2 rounded-lg transition-colors"
        >
          <Plus className="w-5 h-5" />
          {isSpanish ? 'Crear Cuenta' : 'Create Account'}
        </button>
      </div>

      {/* Progress Bar */}
      <div className={`mb-6 rounded-xl p-4 border ${isProcessing ? 'bg-amber-900/20 border-amber-500/30 animate-pulse' : 'bg-purple-900/20 border-purple-500/30'}`}>
        <div className="flex items-center justify-between mb-2">
          <span className={`font-semibold ${isProcessing ? 'text-amber-300' : 'text-purple-300'}`}>
            {isProcessing ? '🔍 ESCANEANDO' : progress >= 100 ? '✅ COMPLETADO' : '⏳ ESPERANDO'}
          </span>
          <span className={`font-bold ${isProcessing ? 'text-amber-400' : 'text-purple-400'}`}>
            {progress.toFixed(1)}% | {currentQuadrillion.toLocaleString()} Q
          </span>
        </div>
        <div className="w-full bg-black/30 rounded-full h-2">
          <div
            className={`h-full rounded-full transition-all ${isProcessing ? 'bg-amber-500' : 'bg-purple-500'}`}
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-gradient-to-br from-purple-900/40 to-pink-900/40 rounded-xl p-4 border border-purple-500/30">
          <div className="flex items-center gap-2 mb-2">
            <Database className="w-5 h-5 text-purple-400" />
            <span className="text-purple-300 text-sm">{isSpanish ? 'Total Cuentas' : 'Total Accounts'}</span>
          </div>
          <p className="text-2xl font-black">{accounts.length}</p>
        </div>
        
        <div className="bg-gradient-to-br from-emerald-900/40 to-teal-900/40 rounded-xl p-4 border border-emerald-500/30">
          <div className="flex items-center gap-2 mb-2">
            <DollarSign className="w-5 h-5 text-emerald-400" />
            <span className="text-emerald-300 text-sm">{isSpanish ? 'Balance Total' : 'Total Balance'}</span>
          </div>
          <p className="text-lg font-black break-all">{formatCurrencyFull(totalBalance, 'USD')}</p>
        </div>
        
        <div className="bg-gradient-to-br from-amber-900/40 to-orange-900/40 rounded-xl p-4 border border-amber-500/30">
          <div className="flex items-center gap-2 mb-2">
            <Lock className="w-5 h-5 text-amber-400" />
            <span className="text-amber-300 text-sm">{isSpanish ? 'Reservado' : 'Reserved'}</span>
          </div>
          <p className="text-lg font-black break-all">{formatCurrencyFull(totalReserved, 'USD')}</p>
        </div>
        
        <div className="bg-gradient-to-br from-blue-900/40 to-cyan-900/40 rounded-xl p-4 border border-blue-500/30">
          <div className="flex items-center gap-2 mb-2">
            <Unlock className="w-5 h-5 text-blue-400" />
            <span className="text-blue-300 text-sm">{isSpanish ? 'Disponible' : 'Available'}</span>
          </div>
          <p className="text-lg font-black break-all">{formatCurrencyFull(totalAvailable, 'USD')}</p>
        </div>
      </div>

      {/* M1/M2 Summary */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <div className="bg-gradient-to-br from-green-900/30 to-emerald-900/30 rounded-xl p-4 border border-green-500/20">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="w-5 h-5 text-green-400" />
            <span className="text-green-300 font-semibold">M1 - {isSpanish ? 'Efectivo Líquido' : 'Liquid Cash'}</span>
          </div>
          <p className="text-xl font-black">{m1Accounts.length} {isSpanish ? 'cuentas' : 'accounts'}</p>
          <p className="text-green-300/70 text-sm break-all">{formatCurrencyFull(totalM1, 'USD')}</p>
        </div>
        
        <div className="bg-gradient-to-br from-blue-900/30 to-indigo-900/30 rounded-xl p-4 border border-blue-500/20">
          <div className="flex items-center gap-2 mb-2">
            <Building2 className="w-5 h-5 text-blue-400" />
            <span className="text-blue-300 font-semibold">M2 - {isSpanish ? 'Cuasi-Dinero' : 'Quasi-Money'}</span>
          </div>
          <p className="text-xl font-black">{m2Accounts.length} {isSpanish ? 'cuentas' : 'accounts'}</p>
          <p className="text-blue-300/70 text-sm break-all">{formatCurrencyFull(totalM2, 'USD')}</p>
        </div>
      </div>

      {/* Accounts List */}
      <div className="space-y-3">
        <h2 className="text-xl font-bold text-purple-300 flex items-center gap-2">
          <Wallet className="w-6 h-6" />
          {isSpanish ? 'Cuentas Custodio' : 'Custody Accounts'}
        </h2>
        
        {accounts.length > 0 ? (
          accounts.map(account => (
            <div
              key={account.id}
              className={`bg-slate-800/50 rounded-xl p-4 border ${
                account.status === 'locked' 
                  ? 'border-amber-500/30' 
                  : 'border-slate-700/50'
              }`}
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                    account.fundDenomination === 'M1' ? 'bg-green-500/20' : 'bg-blue-500/20'
                  }`}>
                    {account.fundDenomination === 'M1' 
                      ? <DollarSign className="w-6 h-6 text-green-400" />
                      : <Building2 className="w-6 h-6 text-blue-400" />
                    }
                  </div>
                  <div>
                  <p className="font-bold">{account.accountName || account.id}</p>
                  <p className="text-xs text-slate-400">{account.accountType.toUpperCase()} • {account.currency} • {account.blockchain} • {account.tokenSymbol}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`px-2 py-1 rounded text-xs ${
                    account.fundDenomination === 'M1' 
                      ? 'bg-green-500/20 text-green-300' 
                      : 'bg-blue-500/20 text-blue-300'
                  }`}>
                    {account.fundDenomination}
                  </span>
                  <span className={`px-2 py-1 rounded text-xs ${
                    account.status === 'active' 
                      ? 'bg-emerald-500/20 text-emerald-300' 
                      : account.status === 'locked'
                        ? 'bg-amber-500/20 text-amber-300'
                        : 'bg-slate-500/20 text-slate-300'
                  }`}>
                    {account.status.toUpperCase()}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3 mb-3">
                <div className="bg-black/20 rounded-lg p-2">
                  <p className="text-xs text-slate-400">{isSpanish ? 'Balance' : 'Balance'}</p>
                  <p className="font-bold text-sm break-all">{formatCurrencyFull(account.balance, account.currency)}</p>
                </div>
                <div className="bg-black/20 rounded-lg p-2">
                  <p className="text-xs text-slate-400">{isSpanish ? 'Reservado' : 'Reserved'}</p>
                  <p className="font-bold text-sm text-amber-400 break-all">{formatCurrencyFull(account.reservedBalance, account.currency)}</p>
                </div>
                <div className="bg-black/20 rounded-lg p-2">
                  <p className="text-xs text-slate-400">{isSpanish ? 'Disponible' : 'Available'}</p>
                  <p className="font-bold text-sm text-emerald-400 break-all">{formatCurrencyFull(account.availableBalance, account.currency)}</p>
                </div>
              </div>

              <div className="flex gap-2">
                {account.status !== 'locked' && account.availableBalance > 0 && (
                  <button
                    onClick={() => {
                      setSelectedAccount(account);
                      setShowReserveModal(true);
                    }}
                    className="flex items-center gap-1 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 px-3 py-1 rounded text-sm"
                  >
                    <Lock className="w-4 h-4" />
                    {isSpanish ? 'Reservar' : 'Reserve'}
                  </button>
                )}
                {account.status === 'locked' && (
                  <button
                    onClick={() => handleReleaseFunds(account.id)}
                    className="flex items-center gap-1 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 px-3 py-1 rounded text-sm"
                  >
                    <Unlock className="w-4 h-4" />
                    {isSpanish ? 'Liberar' : 'Release'}
                  </button>
                )}
                <button
                  onClick={() => handleDeleteAccount(account.id)}
                  className="flex items-center gap-1 bg-red-500/20 hover:bg-red-500/30 text-red-300 px-3 py-1 rounded text-sm"
                >
                  <X className="w-4 h-4" />
                  {isSpanish ? 'Eliminar' : 'Delete'}
                </button>
              </div>
            </div>
          ))
        ) : (
          <div className="bg-slate-800/30 rounded-xl p-12 text-center border border-slate-700/50">
            <Shield className="w-16 h-16 text-purple-400 mx-auto mb-4 opacity-50" />
            <p className="text-slate-400">
              {isSpanish 
                ? 'No hay cuentas custodio. Crea una para comenzar.'
                : 'No custody accounts. Create one to start.'}
            </p>
          </div>
        )}
      </div>

      {/* Create Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900 rounded-2xl p-6 w-full max-w-md border border-purple-500/30">
            <h3 className="text-xl font-bold mb-4">{isSpanish ? 'Crear Cuenta Custodio' : 'Create Custody Account'}</h3>
            
            <div className="space-y-4">
              {/* Tipo de cuenta */}
              <div>
                <label className="block text-sm text-purple-300 mb-1">{isSpanish ? 'Tipo de Cuenta' : 'Account Type'}</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => setFormData({...formData, accountType: 'blockchain'})}
                    className={`p-3 rounded-lg border ${formData.accountType === 'blockchain' ? 'border-cyan-400 bg-cyan-500/20 text-cyan-200' : 'border-slate-700 bg-slate-800'}`}
                  >
                    🌐 {isSpanish ? 'Blockchain' : 'Blockchain'}
                  </button>
                  <button
                    onClick={() => setFormData({...formData, accountType: 'banking'})}
                    className={`p-3 rounded-lg border ${formData.accountType === 'banking' ? 'border-emerald-400 bg-emerald-500/20 text-emerald-200' : 'border-slate-700 bg-slate-800'}`}
                  >
                    🏦 {isSpanish ? 'Bancaria' : 'Banking'}
                  </button>
                </div>
              </div>

              {/* Nombre de cuenta */}
              <div>
                <label className="block text-sm text-purple-300 mb-1">{isSpanish ? 'Nombre de la Cuenta' : 'Account Name'}</label>
                <input
                  type="text"
                  value={formData.accountName}
                  onChange={(e) => setFormData({...formData, accountName: e.target.value})}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2"
                  placeholder={isSpanish ? 'Ej: Reserva USD Stablecoin' : 'Ex: USD Stablecoin Reserve'}
                />
              </div>

              {/* Moneda y monto */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm text-purple-300 mb-1">{isSpanish ? 'Moneda' : 'Currency'}</label>
                  <select
                    value={formData.currency}
                    onChange={(e) => setFormData({...formData, currency: e.target.value})}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2"
                  >
                    {ledgerBalances.map(b => (
                      <option key={b.currency} value={b.currency}>
                        {b.currency} • {isSpanish ? 'Balance' : 'Balance'}: {BigInt(Math.floor(b.balance)).toLocaleString()}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm text-purple-300 mb-1">{isSpanish ? 'Monto' : 'Amount'}</label>
                  <input
                    type="number"
                    value={formData.amount}
                    onChange={(e) => setFormData({...formData, amount: Number(e.target.value)})}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2"
                    placeholder="0.00"
                    min={0}
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm text-purple-300 mb-1">Blockchain</label>
                <select
                  value={formData.blockchain}
                  onChange={(e) => setFormData({...formData, blockchain: e.target.value})}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2"
                >
                  {BLOCKCHAINS.map(bc => (
                    <option key={bc.symbol} value={bc.name}>{bc.name} ({bc.symbol})</option>
                  ))}
                </select>
              </div>
              
              <div>
                <label className="block text-sm text-purple-300 mb-1">Token Symbol</label>
                <input
                  type="text"
                  value={formData.tokenSymbol}
                  onChange={(e) => setFormData({...formData, tokenSymbol: e.target.value})}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2"
                  placeholder="VUSD"
                />
              </div>
              
              <div>
                <label className="block text-sm text-purple-300 mb-1">{isSpanish ? 'Denominación de Fondos' : 'Fund Denomination'}</label>
                <select
                  value={formData.fundDenomination}
                  onChange={(e) => setFormData({...formData, fundDenomination: e.target.value as 'M1' | 'M2'})}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2"
                >
                  <option value="M1">M1 - {isSpanish ? 'Efectivo Líquido' : 'Liquid Cash'}</option>
                  <option value="M2">M2 - {isSpanish ? 'Cuasi-Dinero' : 'Quasi-Money'}</option>
                </select>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowCreateModal(false)}
                className="flex-1 bg-slate-700 hover:bg-slate-600 px-4 py-2 rounded-lg"
              >
                {isSpanish ? 'Cancelar' : 'Cancel'}
              </button>
              <button
                onClick={handleCreateAccount}
                className="flex-1 bg-purple-500 hover:bg-purple-600 px-4 py-2 rounded-lg"
              >
                {isSpanish ? 'Crear' : 'Create'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reserve Modal */}
      {showReserveModal && selectedAccount && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900 rounded-2xl p-6 w-full max-w-md border border-amber-500/30">
            <h3 className="text-xl font-bold mb-4">{isSpanish ? 'Reservar Fondos' : 'Reserve Funds'}</h3>
            
            <div className="bg-slate-800/50 rounded-lg p-3 mb-4">
              <p className="text-sm text-slate-400">{isSpanish ? 'Disponible' : 'Available'}</p>
              <p className="font-bold">{formatCurrencyFull(selectedAccount.availableBalance, selectedAccount.currency)}</p>
            </div>
            
            <div>
              <label className="block text-sm text-amber-300 mb-1">{isSpanish ? 'Monto a Reservar' : 'Amount to Reserve'}</label>
              <input
                type="number"
                value={reserveAmount}
                onChange={(e) => setReserveAmount(Number(e.target.value))}
                max={selectedAccount.availableBalance}
                className="w-full bg-slate-800 border border-amber-500/30 rounded-lg px-3 py-2"
              />
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => {
                  setShowReserveModal(false);
                  setReserveAmount(0);
                }}
                className="flex-1 bg-slate-700 hover:bg-slate-600 px-4 py-2 rounded-lg"
              >
                {isSpanish ? 'Cancelar' : 'Cancel'}
              </button>
              <button
                onClick={handleReserveFunds}
                className="flex-1 bg-amber-500 hover:bg-amber-600 px-4 py-2 rounded-lg"
              >
                {isSpanish ? 'Reservar' : 'Reserve'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      <div className="mt-8 text-center text-purple-300/50 text-sm">
        <p>Custody Accounts 1 - {isSpanish ? 'Sincronizado con' : 'Synced with'} Treasury Reserve1</p>
      </div>
    </div>
  );
}

export default CustodyAccountsModule1;

