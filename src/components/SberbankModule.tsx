/**
 * Sberbank Ruble Payment Orders Module
 * Integration with Sberbank API for creating Ruble Payment Orders
 * https://developers.sber.ru/docs/ru/sber-api/specifications/payments/create-payment
 */

import React, { useState, useEffect } from 'react';
import {
  Building2, Key, Send, History, Settings, CheckCircle, AlertCircle,
  FileText, Clock, Shield, CreditCard, Copy, RefreshCw, Info
} from 'lucide-react';
import { BankingCard, BankingHeader, BankingButton, BankingSection, BankingInput } from './ui/BankingComponents';
import { useBankingTheme } from '../hooks/useBankingTheme';
import { SberbankClient, SberbankConfig, SberbankPaymentOrder } from '../lib/sberbankClient';
import { custodyStore, type CustodyAccount } from '../lib/custody-store';
import { balanceStore, type CurrencyBalance } from '../lib/balances-store';

// Sberbank brand colors
const SBERBANK_GREEN = '#21a038';
const SBERBANK_DARK = '#1a1a1a';

export function SberbankModule() {
  const { fmt, isSpanish } = useBankingTheme();

  const [config, setConfig] = useState<SberbankConfig>(() => {
    const saved = localStorage.getItem('sberbank_config');
    return saved ? JSON.parse(saved) : {
      baseUrl: 'https://iftfintech.testsbi.sberbank.ru:9443',
      accessToken: ''
    };
  });

  const [custodyAccounts, setCustodyAccounts] = useState<CustodyAccount[]>([]);
  const [accountLedgerBalances, setAccountLedgerBalances] = useState<CurrencyBalance[]>([]);
  const [selectedCustodyAccountId, setSelectedCustodyAccountId] = useState<string>('');
  const [balanceSource, setBalanceSource] = useState<'custody' | 'ledger'>('custody');
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [activeTab, setActiveTab] = useState<'payment' | 'history' | 'settings'>('payment');
  const [client, setClient] = useState<SberbankClient | null>(null);

  // Payment form state
  const [paymentForm, setPaymentForm] = useState<SberbankPaymentOrder>({
    number: '',
    date: SberbankClient.formatDate(),
    externalId: SberbankClient.generateExternalId(),
    amount: 0,
    operationCode: '01',
    priority: '5',
    urgencyCode: 'NORMAL',
    purpose: '',
    // Payer
    payerName: '',
    payerInn: '',
    payerKpp: '',
    payerAccount: '',
    payerBankBic: '044525225', // Sberbank BIC
    payerBankCorrAccount: '30101810400000000225',
    // Payee
    payeeName: '',
    payeeInn: '',
    payeeKpp: '',
    payeeAccount: '',
    payeeBankBic: '',
    payeeBankCorrAccount: '',
  });

  // Payment history
  const [paymentHistory, setPaymentHistory] = useState<any[]>(() => {
    const saved = localStorage.getItem('sberbank_payment_history');
    return saved ? JSON.parse(saved) : [];
  });

  // Load Custody Accounts
  useEffect(() => {
    const loadCustodyAccounts = () => {
      const accounts = custodyStore.getAccounts();
      setCustodyAccounts(accounts);
    };
    
    loadCustodyAccounts();
    const unsubscribe = custodyStore.subscribe(setCustodyAccounts);
    return () => unsubscribe();
  }, []);

  // Load Account Ledger Balances
  useEffect(() => {
    const loadBalances = () => {
      const balances = balanceStore.getBalances();
      setAccountLedgerBalances(balances);
    };
    
    loadBalances();
    const unsubscribe = balanceStore.subscribe(setAccountLedgerBalances);
    return () => unsubscribe();
  }, []);

  // Save config and initialize client
  useEffect(() => {
    if (config.accessToken) {
      localStorage.setItem('sberbank_config', JSON.stringify(config));
      setClient(new SberbankClient(config));
    }
  }, [config]);

  // Generate new external ID
  const handleGenerateExternalId = () => {
    setPaymentForm({
      ...paymentForm,
      externalId: SberbankClient.generateExternalId()
    });
  };

  // Copy to clipboard
  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setSuccess(isSpanish ? 'Copiado al portapapeles' : 'Copied to clipboard');
    setTimeout(() => setSuccess(''), 2000);
  };

  // Create payment order
  const handleCreatePayment = async () => {
    if (!client) {
      setError(isSpanish ? 'Configura el access token primero' : 'Configure access token first');
      setActiveTab('settings');
      return;
    }

    // Validate balance source
    if (selectedCustodyAccountId) {
      let availableBalance = 0;
      let accountCurrency = '';

      if (balanceSource === 'custody') {
        const account = custodyAccounts.find(a => a.id === selectedCustodyAccountId);
        if (account) {
          availableBalance = account.availableBalance;
          accountCurrency = account.currency;
        }
      } else {
        const balance = accountLedgerBalances.find(b => b.currency === selectedCustodyAccountId);
        if (balance) {
          availableBalance = balance.totalAmount;
          accountCurrency = balance.currency;
        }
      }

      if (accountCurrency !== 'RUB' && accountCurrency !== 'RUR') {
        setError(isSpanish 
          ? 'Solo se pueden crear órdenes de pago en rublos (RUB)'
          : 'Only Ruble payment orders can be created (RUB)');
        return;
      }

      if (availableBalance < paymentForm.amount) {
        setError(isSpanish 
          ? `Balance insuficiente. Disponible: ₽${availableBalance.toLocaleString()}`
          : `Insufficient balance. Available: ₽${availableBalance.toLocaleString()}`);
        return;
      }
    }

    // Validate form
    if (!paymentForm.payerName || !paymentForm.payerInn || !paymentForm.payerAccount) {
      setError(isSpanish ? 'Complete la información del pagador' : 'Complete payer information');
      return;
    }
    if (!paymentForm.payeeName || !paymentForm.payeeBankBic) {
      setError(isSpanish ? 'Complete la información del beneficiario' : 'Complete payee information');
      return;
    }
    if (!paymentForm.amount || paymentForm.amount < 0.01) {
      setError(isSpanish ? 'El monto debe ser mayor a 0.01' : 'Amount must be greater than 0.01');
      return;
    }
    if (!paymentForm.purpose) {
      setError(isSpanish ? 'El propósito del pago es requerido' : 'Payment purpose is required');
      return;
    }

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const response = await client.createPaymentOrder(paymentForm);
      
      // Save to history
      const historyEntry = {
        ...response,
        createdAt: new Date().toISOString(),
        payerName: paymentForm.payerName,
        payeeName: paymentForm.payeeName,
        amount: paymentForm.amount,
        purpose: paymentForm.purpose,
      };
      const newHistory = [historyEntry, ...paymentHistory].slice(0, 50);
      setPaymentHistory(newHistory);
      localStorage.setItem('sberbank_payment_history', JSON.stringify(newHistory));

      // Update balance if custody account selected
      if (selectedCustodyAccountId && balanceSource === 'custody') {
        const allAccounts = custodyStore.getAccounts();
        const accountIndex = allAccounts.findIndex(a => a.id === selectedCustodyAccountId);
        if (accountIndex !== -1) {
          allAccounts[accountIndex].availableBalance -= paymentForm.amount;
          allAccounts[accountIndex].reservedBalance += paymentForm.amount;
          allAccounts[accountIndex].lastUpdated = new Date().toISOString();
          
          const STORAGE_KEY = 'Digital Commercial Bank Ltd_custody_accounts';
          const data = {
            accounts: allAccounts,
            totalReserved: allAccounts.reduce((sum, a) => sum + a.reservedBalance, 0),
            totalAvailable: allAccounts.reduce((sum, a) => sum + a.availableBalance, 0),
            lastSync: new Date().toISOString(),
          };
          localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
        }
      }

      setSuccess(isSpanish 
        ? `✅ Orden de pago creada exitosamente. ID: ${response.externalId || paymentForm.externalId}`
        : `✅ Payment order created successfully. ID: ${response.externalId || paymentForm.externalId}`);

      // Generate new external ID for next payment
      setPaymentForm({
        ...paymentForm,
        externalId: SberbankClient.generateExternalId(),
        number: '',
      });

    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[var(--bg-main)] p-card">
      <div className="max-w-7xl mx-auto space-y-6">
        
        {/* Header with Sberbank branding */}
        <div className="relative overflow-hidden rounded-2xl p-6" style={{ background: `linear-gradient(135deg, ${SBERBANK_GREEN} 0%, #1a8833 100%)` }}>
          <div className="absolute inset-0 opacity-10">
            <div className="absolute top-0 right-0 w-96 h-96 rounded-full bg-white/20 blur-3xl transform translate-x-1/2 -translate-y-1/2" />
          </div>
          <div className="relative flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-xl bg-white/10 backdrop-blur flex items-center justify-center">
                <Building2 className="w-8 h-8 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-white">Sberbank</h1>
                <p className="text-white/80 text-sm mt-1">
                  {isSpanish 
                    ? 'Órdenes de Pago en Rublos (RPO) - API FinTech'
                    : 'Ruble Payment Orders (RPO) - FinTech API'
                  }
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <span className={`px-4 py-2 rounded-full text-sm font-semibold flex items-center gap-2 ${
                client ? 'bg-white/20 text-white' : 'bg-red-500/20 text-red-200'
              }`}>
                {client ? (
                  <>
                    <CheckCircle className="w-4 h-4" />
                    {isSpanish ? 'Conectado' : 'Connected'}
                  </>
                ) : (
                  <>
                    <AlertCircle className="w-4 h-4" />
                    {isSpanish ? 'Sin configurar' : 'Not configured'}
                  </>
                )}
              </span>
            </div>
          </div>
        </div>

        {/* Messages */}
        {error && (
          <BankingCard className="p-card-sm bg-red-500/10 border-red-500/30">
            <div className="flex items-center gap-card">
              <AlertCircle className="w-5 h-5 text-red-400" />
              <p className="text-red-400">{error}</p>
            </div>
          </BankingCard>
        )}

        {success && (
          <BankingCard className="p-card-sm bg-emerald-500/10 border-emerald-500/30">
            <div className="flex items-center gap-card">
              <CheckCircle className="w-5 h-5 text-emerald-400" />
              <p className="text-emerald-400">{success}</p>
            </div>
          </BankingCard>
        )}

        {/* Tabs */}
        <div className="flex gap-card-sm bg-[var(--bg-card)] rounded-xl p-1">
          {[
            { id: 'payment', label: isSpanish ? 'Crear Pago' : 'Create Payment', icon: Send },
            { id: 'history', label: isSpanish ? 'Historial' : 'History', icon: History },
            { id: 'settings', label: isSpanish ? 'Configuración' : 'Settings', icon: Settings }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-card-sm px-card py-card-sm rounded-lg font-semibold transition-all ${
                activeTab === tab.id
                  ? 'text-white'
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
              }`}
              style={activeTab === tab.id ? { backgroundColor: SBERBANK_GREEN } : {}}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Payment Tab */}
        {activeTab === 'payment' && (
          <div className="space-y-6">
            {/* Balance Source Selector */}
            <BankingCard className="p-card">
              <div className="flex items-center gap-4 mb-4">
                <CreditCard className="w-5 h-5 text-[var(--text-secondary)]" />
                <h3 className="text-[var(--text-primary)] font-semibold">
                  {isSpanish ? 'Fuente de Balance' : 'Balance Source'}
                </h3>
              </div>
              
              <div className="flex gap-4 mb-4">
                <button
                  onClick={() => setBalanceSource('custody')}
                  className={`flex-1 p-3 rounded-lg border transition-all ${
                    balanceSource === 'custody'
                      ? 'border-emerald-500 bg-emerald-500/10'
                      : 'border-[var(--border-subtle)] hover:border-[var(--border-subtle)]/50'
                  }`}
                >
                  <span className={balanceSource === 'custody' ? 'text-emerald-400' : 'text-[var(--text-secondary)]'}>
                    Custody Accounts
                  </span>
                </button>
                <button
                  onClick={() => setBalanceSource('ledger')}
                  className={`flex-1 p-3 rounded-lg border transition-all ${
                    balanceSource === 'ledger'
                      ? 'border-emerald-500 bg-emerald-500/10'
                      : 'border-[var(--border-subtle)] hover:border-[var(--border-subtle)]/50'
                  }`}
                >
                  <span className={balanceSource === 'ledger' ? 'text-emerald-400' : 'text-[var(--text-secondary)]'}>
                    Account Ledger
                  </span>
                </button>
              </div>

              <select
                value={selectedCustodyAccountId}
                onChange={(e) => setSelectedCustodyAccountId(e.target.value)}
                className="w-full px-card-sm py-card-sm bg-[var(--bg-elevated)] border border-[var(--border-subtle)] rounded-lg text-[var(--text-primary)]"
                title={isSpanish ? "Seleccionar cuenta" : "Select account"}
              >
                <option value="">{isSpanish ? '-- Opcional: Seleccionar cuenta RUB --' : '-- Optional: Select RUB account --'}</option>
                {balanceSource === 'custody' 
                  ? custodyAccounts
                      .filter(acc => acc.currency === 'RUB' || acc.currency === 'RUR')
                      .map(account => (
                        <option key={account.id} value={account.id}>
                          {account.accountName} - ₽{account.availableBalance.toLocaleString()}
                        </option>
                      ))
                  : accountLedgerBalances
                      .filter(b => b.currency === 'RUB' || b.currency === 'RUR')
                      .map(balance => (
                        <option key={balance.currency} value={balance.currency}>
                          {balance.accountName} - ₽{balance.totalAmount.toLocaleString()}
                        </option>
                      ))
                }
              </select>
            </BankingCard>

            {/* Document Info */}
            <BankingSection 
              title={isSpanish ? "Información del Documento" : "Document Information"} 
              icon={FileText} 
              color="emerald"
            >
              <BankingCard className="p-card space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-card">
                  <BankingInput
                    label={isSpanish ? "Número de Documento" : "Document Number"}
                    value={paymentForm.number || ''}
                    onChange={(v) => setPaymentForm({ ...paymentForm, number: v.slice(0, 8) })}
                    placeholder="1-8 chars"
                  />
                  <BankingInput
                    label={isSpanish ? "Fecha" : "Date"}
                    value={paymentForm.date}
                    onChange={(v) => setPaymentForm({ ...paymentForm, date: v })}
                    type="date"
                  />
                  <div>
                    <label className="block text-[var(--text-secondary)] text-sm mb-2">External ID (UUID)</label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={paymentForm.externalId}
                        readOnly
                        className="flex-1 px-3 py-2 bg-[var(--bg-elevated)] border border-[var(--border-subtle)] rounded-lg text-[var(--text-primary)] text-sm"
                      />
                      <button
                        onClick={handleGenerateExternalId}
                        className="p-2 bg-[var(--bg-elevated)] border border-[var(--border-subtle)] rounded-lg hover:bg-[var(--bg-card)]"
                        title={isSpanish ? "Generar nuevo ID" : "Generate new ID"}
                      >
                        <RefreshCw className="w-4 h-4 text-[var(--text-secondary)]" />
                      </button>
                      <button
                        onClick={() => handleCopy(paymentForm.externalId)}
                        className="p-2 bg-[var(--bg-elevated)] border border-[var(--border-subtle)] rounded-lg hover:bg-[var(--bg-card)]"
                        title={isSpanish ? "Copiar" : "Copy"}
                      >
                        <Copy className="w-4 h-4 text-[var(--text-secondary)]" />
                      </button>
                    </div>
                  </div>
                </div>
              </BankingCard>
            </BankingSection>

            {/* Payment Details */}
            <BankingSection 
              title={isSpanish ? "Detalles del Pago" : "Payment Details"} 
              icon={CreditCard} 
              color="emerald"
            >
              <BankingCard className="p-card space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-card">
                  <BankingInput
                    label={isSpanish ? "Monto (₽)" : "Amount (₽)"}
                    value={paymentForm.amount.toString()}
                    onChange={(v) => setPaymentForm({ ...paymentForm, amount: parseFloat(v) || 0 })}
                    type="number"
                    placeholder="0.01 - 1,000,000,000,000,000"
                  />
                  <div>
                    <label className="block text-[var(--text-secondary)] text-sm mb-2">
                      {isSpanish ? "Prioridad" : "Priority"}
                    </label>
                    <select
                      value={paymentForm.priority}
                      onChange={(e) => setPaymentForm({ ...paymentForm, priority: e.target.value as any })}
                      className="w-full px-3 py-2 bg-[var(--bg-elevated)] border border-[var(--border-subtle)] rounded-lg text-[var(--text-primary)]"
                      title={isSpanish ? "Prioridad de pago" : "Payment priority"}
                    >
                      <option value="1">1 - {isSpanish ? 'Máxima' : 'Highest'}</option>
                      <option value="2">2 - {isSpanish ? 'Alta' : 'High'}</option>
                      <option value="3">3 - {isSpanish ? 'Media' : 'Medium'}</option>
                      <option value="4">4 - {isSpanish ? 'Baja' : 'Low'}</option>
                      <option value="5">5 - {isSpanish ? 'Normal' : 'Normal'}</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[var(--text-secondary)] text-sm mb-2">
                      {isSpanish ? "Código de Urgencia" : "Urgency Code"}
                    </label>
                    <select
                      value={paymentForm.urgencyCode || 'NORMAL'}
                      onChange={(e) => setPaymentForm({ ...paymentForm, urgencyCode: e.target.value as any })}
                      className="w-full px-3 py-2 bg-[var(--bg-elevated)] border border-[var(--border-subtle)] rounded-lg text-[var(--text-primary)]"
                      title={isSpanish ? "Código de urgencia" : "Urgency code"}
                    >
                      <option value="NORMAL">NORMAL</option>
                      <option value="INTERNAL">INTERNAL - {isSpanish ? 'Urgente' : 'Urgent'}</option>
                      <option value="INTERNAL_NOTIF">INTERNAL_NOTIF - {isSpanish ? 'Urgente con notificación' : 'Urgent with notification'}</option>
                      <option value="OFFHOURS">OFFHOURS - {isSpanish ? 'Fuera de horario' : 'Off hours'}</option>
                      <option value="BESP">BESP - {isSpanish ? 'Pago electrónico bancario urgente' : 'Urgent electronic banking payment'}</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-[var(--text-secondary)] text-sm mb-2">
                    {isSpanish ? "Propósito del Pago" : "Payment Purpose"} *
                  </label>
                  <textarea
                    value={paymentForm.purpose}
                    onChange={(e) => setPaymentForm({ ...paymentForm, purpose: e.target.value.slice(0, 210) })}
                    className="w-full px-3 py-2 bg-[var(--bg-elevated)] border border-[var(--border-subtle)] rounded-lg text-[var(--text-primary)] min-h-[80px]"
                    placeholder={isSpanish ? "Máximo 210 caracteres" : "Maximum 210 characters"}
                  />
                  <span className="text-xs text-[var(--text-secondary)]">
                    {paymentForm.purpose.length}/210
                  </span>
                </div>
              </BankingCard>
            </BankingSection>

            {/* Payer Information */}
            <BankingSection 
              title={isSpanish ? "Información del Pagador" : "Payer Information"} 
              icon={Building2} 
              color="purple"
            >
              <BankingCard className="p-card space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-card">
                  <BankingInput
                    label={isSpanish ? "Nombre del Pagador *" : "Payer Name *"}
                    value={paymentForm.payerName}
                    onChange={(v) => setPaymentForm({ ...paymentForm, payerName: v.slice(0, 160) })}
                    placeholder={isSpanish ? "Máximo 160 caracteres" : "Maximum 160 characters"}
                  />
                  <BankingInput
                    label="INN (ИНН) *"
                    value={paymentForm.payerInn}
                    onChange={(v) => setPaymentForm({ ...paymentForm, payerInn: v.replace(/\D/g, '').slice(0, 12) })}
                    placeholder="5, 10 o 12 dígitos"
                  />
                  <BankingInput
                    label="KPP (КПП)"
                    value={paymentForm.payerKpp || ''}
                    onChange={(v) => setPaymentForm({ ...paymentForm, payerKpp: v.replace(/\D/g, '').slice(0, 9) })}
                    placeholder="9 dígitos"
                  />
                  <BankingInput
                    label={isSpanish ? "Cuenta del Pagador *" : "Payer Account *"}
                    value={paymentForm.payerAccount}
                    onChange={(v) => setPaymentForm({ ...paymentForm, payerAccount: v.replace(/\D/g, '').slice(0, 20) })}
                    placeholder="20 dígitos"
                  />
                  <BankingInput
                    label={isSpanish ? "BIC del Banco *" : "Bank BIC *"}
                    value={paymentForm.payerBankBic}
                    onChange={(v) => setPaymentForm({ ...paymentForm, payerBankBic: v.replace(/\D/g, '').slice(0, 9) })}
                    placeholder="9 dígitos (ej: 044525225)"
                  />
                  <BankingInput
                    label={isSpanish ? "Cuenta Corresponsal *" : "Correspondent Account *"}
                    value={paymentForm.payerBankCorrAccount}
                    onChange={(v) => setPaymentForm({ ...paymentForm, payerBankCorrAccount: v.replace(/\D/g, '').slice(0, 20) })}
                    placeholder="20 dígitos"
                  />
                </div>
              </BankingCard>
            </BankingSection>

            {/* Payee Information */}
            <BankingSection 
              title={isSpanish ? "Información del Beneficiario" : "Payee Information"} 
              icon={Send} 
              color="white"
            >
              <BankingCard className="p-card space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-card">
                  <BankingInput
                    label={isSpanish ? "Nombre del Beneficiario *" : "Payee Name *"}
                    value={paymentForm.payeeName}
                    onChange={(v) => setPaymentForm({ ...paymentForm, payeeName: v.slice(0, 160) })}
                    placeholder={isSpanish ? "Máximo 160 caracteres" : "Maximum 160 characters"}
                  />
                  <BankingInput
                    label="INN (ИНН)"
                    value={paymentForm.payeeInn || ''}
                    onChange={(v) => setPaymentForm({ ...paymentForm, payeeInn: v.replace(/\D/g, '').slice(0, 12) })}
                    placeholder="5, 10 o 12 dígitos"
                  />
                  <BankingInput
                    label="KPP (КПП)"
                    value={paymentForm.payeeKpp || ''}
                    onChange={(v) => setPaymentForm({ ...paymentForm, payeeKpp: v.replace(/\D/g, '').slice(0, 9) })}
                    placeholder="9 dígitos"
                  />
                  <BankingInput
                    label={isSpanish ? "Cuenta del Beneficiario" : "Payee Account"}
                    value={paymentForm.payeeAccount || ''}
                    onChange={(v) => setPaymentForm({ ...paymentForm, payeeAccount: v.replace(/\D/g, '').slice(0, 20) })}
                    placeholder="20 dígitos"
                  />
                  <BankingInput
                    label={isSpanish ? "BIC del Banco *" : "Bank BIC *"}
                    value={paymentForm.payeeBankBic}
                    onChange={(v) => setPaymentForm({ ...paymentForm, payeeBankBic: v.replace(/\D/g, '').slice(0, 9) })}
                    placeholder="9 dígitos"
                  />
                  <BankingInput
                    label={isSpanish ? "Cuenta Corresponsal" : "Correspondent Account"}
                    value={paymentForm.payeeBankCorrAccount || ''}
                    onChange={(v) => setPaymentForm({ ...paymentForm, payeeBankCorrAccount: v.replace(/\D/g, '').slice(0, 20) })}
                    placeholder="20 dígitos"
                  />
                </div>
              </BankingCard>
            </BankingSection>

            {/* Submit Button */}
            <div className="flex justify-end">
              <BankingButton
                variant="primary"
                icon={Send}
                onClick={handleCreatePayment}
                disabled={loading}
                className="px-8"
                style={{ backgroundColor: SBERBANK_GREEN }}
              >
                {loading 
                  ? (isSpanish ? 'Procesando...' : 'Processing...') 
                  : (isSpanish ? 'Crear Orden de Pago' : 'Create Payment Order')
                }
              </BankingButton>
            </div>

            {/* Info Box */}
            <BankingCard className="p-card bg-blue-500/10 border-blue-500/30">
              <div className="flex items-start gap-3">
                <Info className="w-5 h-5 text-blue-400 mt-0.5" />
                <div className="text-sm text-blue-300">
                  <p className="font-semibold mb-1">
                    {isSpanish ? 'Nota sobre firma digital:' : 'Note on digital signature:'}
                  </p>
                  <p className="text-blue-300/80">
                    {isSpanish 
                      ? 'Si no proporciona una firma digital (DigestSignatures), la orden de pago se creará en estado borrador. Para procesarla, deberá iniciar sesión en la interfaz de SberBusiness y firmarla.'
                      : 'If you do not provide a digital signature (DigestSignatures), the payment order will be created in draft status. To process it, you will need to log in to the SberBusiness interface and sign it.'
                    }
                  </p>
                </div>
              </div>
            </BankingCard>
          </div>
        )}

        {/* History Tab */}
        {activeTab === 'history' && (
          <BankingSection title={isSpanish ? "Historial de Pagos" : "Payment History"} icon={History} color="emerald">
            {paymentHistory.length > 0 ? (
              <div className="space-y-4">
                {paymentHistory.map((payment, index) => (
                  <BankingCard key={index} className="p-card">
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-emerald-400 font-bold text-lg">
                            ₽{payment.amount?.toLocaleString()}
                          </span>
                          <span className={`px-2 py-0.5 rounded text-xs font-semibold ${
                            payment.status === 'COMPLETED' ? 'bg-emerald-500/20 text-emerald-400' :
                            payment.status === 'PENDING' ? 'bg-amber-500/20 text-amber-400' :
                            payment.status === 'DRAFT' ? 'bg-blue-500/20 text-blue-400' :
                            'bg-slate-500/20 text-slate-400'
                          }`}>
                            {payment.status || 'DRAFT'}
                          </span>
                        </div>
                        <p className="text-[var(--text-primary)] font-medium">{payment.payeeName}</p>
                        <p className="text-[var(--text-secondary)] text-sm mt-1">{payment.purpose}</p>
                        <p className="text-[var(--text-secondary)] text-xs mt-2">
                          ID: {payment.externalId}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-[var(--text-secondary)] text-xs">
                          {new Date(payment.createdAt).toLocaleString()}
                        </p>
                        <button
                          onClick={() => handleCopy(payment.externalId)}
                          className="mt-2 text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)] flex items-center gap-1"
                        >
                          <Copy className="w-3 h-3" />
                          {isSpanish ? 'Copiar ID' : 'Copy ID'}
                        </button>
                      </div>
                    </div>
                  </BankingCard>
                ))}
              </div>
            ) : (
              <BankingCard className="p-12 text-center">
                <History className="w-20 h-20 text-slate-700 mx-auto mb-card" />
                <p className="text-[var(--text-secondary)]">
                  {isSpanish ? 'No hay pagos en el historial' : 'No payments in history'}
                </p>
              </BankingCard>
            )}
          </BankingSection>
        )}

        {/* Settings Tab */}
        {activeTab === 'settings' && (
          <BankingSection title={isSpanish ? "Configuración API" : "API Configuration"} icon={Settings} color="purple">
            <BankingCard className="p-card space-y-4">
              <div className="flex items-start gap-3 p-4 bg-amber-500/10 border border-amber-500/30 rounded-lg mb-4">
                <Shield className="w-5 h-5 text-amber-400 mt-0.5" />
                <div className="text-sm">
                  <p className="font-semibold text-amber-400 mb-1">
                    {isSpanish ? 'Requisitos de acceso' : 'Access requirements'}
                  </p>
                  <p className="text-amber-300/80">
                    {isSpanish 
                      ? 'Para acceder a este método, el servicio PAY_DOC_RU debe estar especificado en el parámetro scope del enlace de autorización del usuario.'
                      : 'To access this method, the PAY_DOC_RU service must be specified in the scope parameter of the user authorization link.'
                    }
                  </p>
                </div>
              </div>

              <BankingInput
                label="Base URL"
                value={config.baseUrl}
                onChange={(v) => setConfig({ ...config, baseUrl: v })}
                placeholder="https://iftfintech.testsbi.sberbank.ru:9443"
              />
              
              <div>
                <label className="block text-[var(--text-secondary)] text-sm mb-2">
                  Access Token (SSO) *
                </label>
                <div className="flex gap-2">
                  <input
                    type="password"
                    value={config.accessToken}
                    onChange={(e) => setConfig({ ...config, accessToken: e.target.value })}
                    className="flex-1 px-3 py-2 bg-[var(--bg-elevated)] border border-[var(--border-subtle)] rounded-lg text-[var(--text-primary)]"
                    placeholder="f8ad3141-b7e8-4924-92de-3de4fd0a464e-1"
                  />
                </div>
                <p className="text-xs text-[var(--text-secondary)] mt-1">
                  {isSpanish 
                    ? 'Token de acceso de la organización cliente obtenido via SSO'
                    : 'Client organization access token obtained via SSO'
                  }
                </p>
              </div>

              <div className="pt-4 border-t border-[var(--border-subtle)]">
                <h4 className="text-[var(--text-primary)] font-semibold mb-3">
                  {isSpanish ? 'Endpoints de API' : 'API Endpoints'}
                </h4>
                <div className="space-y-2 text-sm">
                  <div className="flex items-center justify-between p-2 bg-[var(--bg-elevated)] rounded">
                    <span className="text-[var(--text-secondary)]">Create Payment</span>
                    <code className="text-emerald-400">POST /fintech/api/v1/payments</code>
                  </div>
                  <div className="flex items-center justify-between p-2 bg-[var(--bg-elevated)] rounded">
                    <span className="text-[var(--text-secondary)]">Get Status</span>
                    <code className="text-emerald-400">GET /fintech/api/v1/payments/{'{externalId}'}</code>
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t border-[var(--border-subtle)]">
                <h4 className="text-[var(--text-primary)] font-semibold mb-3">
                  {isSpanish ? 'Documentación' : 'Documentation'}
                </h4>
                <a 
                  href="https://developers.sber.ru/docs/ru/sber-api/specifications/payments/create-payment"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 text-emerald-400 hover:text-emerald-300"
                >
                  <span>Sberbank API Documentation</span>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                  </svg>
                </a>
              </div>
            </BankingCard>
          </BankingSection>
        )}

      </div>
    </div>
  );
}

