/**
 * The Kingdom Bank Integration Module
 * Integración completa con The Kingdom Bank API
 */

import React, { useState, useEffect } from 'react';
import {
  Building2, Key, CreditCard, Send, ArrowRightLeft, History,
  Settings, CheckCircle, AlertCircle, Globe, Download, Upload
} from 'lucide-react';
import { BankingCard, BankingHeader, BankingButton, BankingSection, BankingInput } from './ui/BankingComponents';
import { useBankingTheme } from '../hooks/useBankingTheme';
import { TheKingdomBankClient, TKBConfig, TKBAccount, TKBPaymentRequest, TKBTransfer, TKBExternalTransfer, TKBExchange } from '../lib/tkbClient';

export function TheKingdomBankModule() {
  const { fmt, isSpanish } = useBankingTheme();

  const [config, setConfig] = useState<TKBConfig>(() => {
    const saved = localStorage.getItem('tkb_config');
    return saved ? JSON.parse(saved) : {
      baseUrl: 'https://api.thekingdombank.com',
      apiKey: '',
      apiSecret: '',
      signatureKeyId: '',
      signatureKey: ''
    };
  });

  const [accounts, setAccounts] = useState<TKBAccount[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState<'accounts' | 'payments' | 'transfers' | 'exchange' | 'history' | 'settings'>('accounts');
  const [client, setClient] = useState<TheKingdomBankClient | null>(null);

  // Payment Request Form
  const [paymentForm, setPaymentForm] = useState<TKBPaymentRequest>({
    foreignTransactionId: '',
    amount: 0,
    currency: 'EUR',
    notificationUrl: 'https://luxliqdaes.cloud/webhooks/tkb/payments',
    reference: '',
    successUrl: '',
    failUrl: '',
    customer: {
      firstName: '',
      lastName: '',
      email: '',
      phone: '',
      country: 'DEU',
      language: 'en'
    },
    paymentMethodFlow: 'CHECKOUT',
    allowedPaymentMethods: ['BANKWIRE']
  });

  // Transfer Form
  const [transferForm, setTransferForm] = useState<TKBTransfer>({
    fromAccountId: 0,
    toAccountId: 0,
    amount: 0,
    currency: 'EUR',
    reference: ''
  });

  // External Transfer Form
  const [externalTransferForm, setExternalTransferForm] = useState<TKBExternalTransfer>({
    fromAccountId: 0,
    amount: 0,
    currency: 'EUR',
    beneficiaryName: '',
    beneficiaryIban: '',
    beneficiaryBic: '',
    reference: ''
  });

  // Exchange Form
  const [exchangeForm, setExchangeForm] = useState<TKBExchange>({
    fromAccountId: 0,
    toAccountId: 0,
    amount: 0,
    fromCurrency: 'EUR',
    toCurrency: 'USD',
    reference: ''
  });

  // Guardar configuración
  useEffect(() => {
    if (config.apiKey && config.apiSecret) {
      localStorage.setItem('tkb_config', JSON.stringify(config));
      setClient(new TheKingdomBankClient(config));
    }
  }, [config]);

  const handleLoadAccounts = async () => {
    if (!client) {
      setError(isSpanish ? 'Configura las credenciales primero' : 'Configure credentials first');
      setActiveTab('settings');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await client.getAccounts();
      setAccounts(response.accounts || []);
      console.log('[TKB] ✅ Cuentas cargadas:', response.accounts?.length);
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMsg);
      console.error('[TKB] ❌ Error:', errorMsg);
    } finally {
      setLoading(false);
    }
  };

  const handleCreatePayment = async () => {
    if (!client) {
      setError(isSpanish ? 'Configura las credenciales primero' : 'Configure credentials first');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await client.createPaymentRequest(paymentForm);
      alert(
        `✅ ${isSpanish ? 'Payment Request Creado' : 'Payment Request Created'}\n\n` +
        `${isSpanish ? 'ID:' : 'ID:'} ${response.id || response.requestId}\n` +
        `${isSpanish ? 'URL:' : 'URL:'} ${response.checkoutUrl || response.url || 'N/A'}`
      );
      console.log('[TKB] ✅ Payment creado:', response);
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMsg);
      alert(`❌ Error: ${errorMsg}`);
    } finally {
      setLoading(false);
    }
  };

  const handleInternalTransfer = async () => {
    if (!client) {
      setError(isSpanish ? 'Configura las credenciales primero' : 'Configure credentials first');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await client.createInternalTransfer(transferForm);
      alert(
        `✅ ${isSpanish ? 'Transferencia Interna Creada' : 'Internal Transfer Created'}\n\n` +
        `${isSpanish ? 'ID:' : 'ID:'} ${response.id || response.transactionId}`
      );
      console.log('[TKB] ✅ Transfer creada:', response);
      await handleLoadAccounts(); // Recargar balances
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMsg);
      alert(`❌ Error: ${errorMsg}`);
    } finally {
      setLoading(false);
    }
  };

  const handleExternalTransfer = async () => {
    if (!client) {
      setError(isSpanish ? 'Configura las credenciales primero' : 'Configure credentials first');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await client.createExternalTransfer(externalTransferForm);
      alert(
        `✅ ${isSpanish ? 'Transferencia Externa Creada' : 'External Transfer Created'}\n\n` +
        `${isSpanish ? 'ID:' : 'ID:'} ${response.id || response.transactionId}`
      );
      console.log('[TKB] ✅ External transfer creada:', response);
      await handleLoadAccounts();
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMsg);
      alert(`❌ Error: ${errorMsg}`);
    } finally {
      setLoading(false);
    }
  };

  const handleExchange = async () => {
    if (!client) {
      setError(isSpanish ? 'Configura las credenciales primero' : 'Configure credentials first');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await client.createExchange(exchangeForm);
      alert(
        `✅ ${isSpanish ? 'Exchange Creado' : 'Exchange Created'}\n\n` +
        `${isSpanish ? 'ID:' : 'ID:'} ${response.id || response.transactionId}`
      );
      console.log('[TKB] ✅ Exchange creado:', response);
      await handleLoadAccounts();
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMsg);
      alert(`❌ Error: ${errorMsg}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        
        <BankingHeader
          icon={Building2}
          title="The Kingdom Bank"
          subtitle={isSpanish 
            ? "Integración API completa - Payments, Transfers, Exchange"
            : "Complete API Integration - Payments, Transfers, Exchange"
          }
          gradient="purple"
          actions={
            <BankingButton
              variant="primary"
              icon={CheckCircle}
              onClick={handleLoadAccounts}
              disabled={loading || !client}
            >
              {loading ? (isSpanish ? 'Cargando...' : 'Loading...') : (isSpanish ? 'Cargar Cuentas' : 'Load Accounts')}
            </BankingButton>
          }
        />

        {/* Error */}
        {error && (
          <BankingCard className="p-4 bg-red-500/10 border-red-500/30">
            <div className="flex items-center gap-3">
              <AlertCircle className="w-5 h-5 text-red-400" />
              <p className="text-red-400">{error}</p>
            </div>
          </BankingCard>
        )}

        {/* Tabs */}
        <div className="flex gap-2 bg-slate-900 rounded-xl p-1">
          {[
            { id: 'accounts', label: isSpanish ? 'Cuentas' : 'Accounts', icon: CreditCard },
            { id: 'payments', label: isSpanish ? 'Payments' : 'Payments', icon: Send },
            { id: 'transfers', label: isSpanish ? 'Transfers' : 'Transfers', icon: ArrowRightLeft },
            { id: 'exchange', label: isSpanish ? 'Exchange' : 'Exchange', icon: Globe },
            { id: 'history', label: isSpanish ? 'Historial' : 'History', icon: History },
            { id: 'settings', label: isSpanish ? 'Config' : 'Settings', icon: Settings }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg font-semibold transition-all ${
                activeTab === tab.id
                  ? 'bg-sky-500 text-white'
                  : 'text-slate-400 hover:text-slate-100'
              }`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Accounts Tab */}
        {activeTab === 'accounts' && (
          <BankingSection title={isSpanish ? "Cuentas TKB" : "TKB Accounts"} icon={CreditCard} color="emerald">
            {accounts.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {accounts.map(account => (
                  <BankingCard key={account.id} className="p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <h4 className="text-slate-100 font-bold text-lg mb-1">
                          {account.currency} Account
                        </h4>
                        <p className="text-slate-400 text-sm">ID: {account.id}</p>
                        {account.accountNumber && (
                          <p className="text-slate-400 text-sm">Account: {account.accountNumber}</p>
                        )}
                        {account.iban && (
                          <p className="text-slate-400 text-sm">IBAN: {account.iban}</p>
                        )}
                      </div>
                      <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                        account.status === 'ACTIVE' 
                          ? 'bg-emerald-500/20 text-emerald-400'
                          : 'bg-amber-500/20 text-amber-400'
                      }`}>
                        {account.status}
                      </span>
                    </div>
                    <div className="space-y-2">
                      <div className="flex justify-between py-2 border-b border-slate-800">
                        <span className="text-slate-400">{isSpanish ? 'Balance:' : 'Balance:'}</span>
                        <span className="text-emerald-400 font-bold text-xl">
                          {fmt.currency(account.balance, account.currency)}
                        </span>
                      </div>
                      <div className="flex justify-between py-2">
                        <span className="text-slate-400">{isSpanish ? 'Disponible:' : 'Available:'}</span>
                        <span className="text-sky-400 font-semibold">
                          {fmt.currency(account.availableBalance, account.currency)}
                        </span>
                      </div>
                    </div>
                  </BankingCard>
                ))}
              </div>
            ) : (
              <BankingCard className="p-12 text-center">
                <CreditCard className="w-20 h-20 text-slate-700 mx-auto mb-4" />
                <p className="text-slate-400">
                  {isSpanish ? 'No hay cuentas. Carga las cuentas desde TKB.' : 'No accounts. Load accounts from TKB.'}
                </p>
              </BankingCard>
            )}
          </BankingSection>
        )}

        {/* Settings Tab */}
        {activeTab === 'settings' && (
          <BankingSection title={isSpanish ? "Configuración API" : "API Configuration"} icon={Settings} color="purple">
            <BankingCard className="p-6 space-y-4">
              <BankingInput
                label={isSpanish ? "Base URL" : "Base URL"}
                value={config.baseUrl}
                onChange={(v) => setConfig({ ...config, baseUrl: v })}
              />
              <BankingInput
                label="X-Api-Key"
                value={config.apiKey}
                onChange={(v) => setConfig({ ...config, apiKey: v })}
                type="password"
              />
              <BankingInput
                label="X-Api-Secret"
                value={config.apiSecret}
                onChange={(v) => setConfig({ ...config, apiSecret: v })}
                type="password"
              />
              <BankingInput
                label="X-Signature-Key-Id"
                value={config.signatureKeyId}
                onChange={(v) => setConfig({ ...config, signatureKeyId: v })}
              />
              <BankingInput
                label={isSpanish ? "Signature Key (secreta)" : "Signature Key (secret)"}
                value={config.signatureKey}
                onChange={(v) => setConfig({ ...config, signatureKey: v })}
                type="password"
              />
              <div className="pt-4 border-t border-slate-800">
                <p className="text-slate-400 text-sm mb-4">
                  {isSpanish 
                    ? "Webhook URL para notificaciones:"
                    : "Webhook URL for notifications:"
                  }
                </p>
                <code className="block p-3 bg-slate-900 rounded-lg text-sky-400 text-sm">
                  https://luxliqdaes.cloud/webhooks/tkb/payments
                </code>
              </div>
            </BankingCard>
          </BankingSection>
        )}

        {/* Payments Tab */}
        {activeTab === 'payments' && (
          <BankingSection title={isSpanish ? "Crear Payment Request" : "Create Payment Request"} icon={Send} color="sky">
            <BankingCard className="p-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <BankingInput
                  label={isSpanish ? "Foreign Transaction ID" : "Foreign Transaction ID"}
                  value={paymentForm.foreignTransactionId}
                  onChange={(v) => setPaymentForm({ ...paymentForm, foreignTransactionId: v })}
                />
                <BankingInput
                  label={isSpanish ? "Monto" : "Amount"}
                  value={paymentForm.amount.toString()}
                  onChange={(v) => setPaymentForm({ ...paymentForm, amount: parseFloat(v) || 0 })}
                  type="number"
                />
                <BankingInput
                  label={isSpanish ? "Moneda" : "Currency"}
                  value={paymentForm.currency}
                  onChange={(v) => setPaymentForm({ ...paymentForm, currency: v })}
                />
                <BankingInput
                  label={isSpanish ? "Reference" : "Reference"}
                  value={paymentForm.reference || ''}
                  onChange={(v) => setPaymentForm({ ...paymentForm, reference: v })}
                />
                <BankingInput
                  label={isSpanish ? "Success URL" : "Success URL"}
                  value={paymentForm.successUrl || ''}
                  onChange={(v) => setPaymentForm({ ...paymentForm, successUrl: v })}
                />
                <BankingInput
                  label={isSpanish ? "Fail URL" : "Fail URL"}
                  value={paymentForm.failUrl || ''}
                  onChange={(v) => setPaymentForm({ ...paymentForm, failUrl: v })}
                />
              </div>
              <div className="pt-4 border-t border-slate-800">
                <h5 className="text-slate-100 font-semibold mb-4">{isSpanish ? "Cliente" : "Customer"}</h5>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <BankingInput
                    label={isSpanish ? "Nombre" : "First Name"}
                    value={paymentForm.customer?.firstName || ''}
                    onChange={(v) => setPaymentForm({
                      ...paymentForm,
                      customer: { ...paymentForm.customer!, firstName: v }
                    })}
                  />
                  <BankingInput
                    label={isSpanish ? "Apellido" : "Last Name"}
                    value={paymentForm.customer?.lastName || ''}
                    onChange={(v) => setPaymentForm({
                      ...paymentForm,
                      customer: { ...paymentForm.customer!, lastName: v }
                    })}
                  />
                  <BankingInput
                    label="Email"
                    value={paymentForm.customer?.email || ''}
                    onChange={(v) => setPaymentForm({
                      ...paymentForm,
                      customer: { ...paymentForm.customer!, email: v }
                    })}
                    type="email"
                  />
                  <BankingInput
                    label={isSpanish ? "Teléfono" : "Phone"}
                    value={paymentForm.customer?.phone || ''}
                    onChange={(v) => setPaymentForm({
                      ...paymentForm,
                      customer: { ...paymentForm.customer!, phone: v }
                    })}
                  />
                </div>
              </div>
              <BankingButton
                variant="primary"
                icon={Send}
                onClick={handleCreatePayment}
                disabled={loading}
              >
                {isSpanish ? 'Crear Payment Request' : 'Create Payment Request'}
              </BankingButton>
            </BankingCard>
          </BankingSection>
        )}

        {/* Transfers Tab */}
        {activeTab === 'transfers' && (
          <div className="space-y-6">
            {/* Internal Transfer */}
            <BankingSection title={isSpanish ? "Transferencia Interna" : "Internal Transfer"} icon={ArrowRightLeft} color="emerald">
              <BankingCard className="p-6 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <BankingInput
                    label={isSpanish ? "Desde Account ID" : "From Account ID"}
                    value={transferForm.fromAccountId.toString()}
                    onChange={(v) => setTransferForm({ ...transferForm, fromAccountId: parseInt(v) || 0 })}
                    type="number"
                  />
                  <BankingInput
                    label={isSpanish ? "Hacia Account ID" : "To Account ID"}
                    value={transferForm.toAccountId.toString()}
                    onChange={(v) => setTransferForm({ ...transferForm, toAccountId: parseInt(v) || 0 })}
                    type="number"
                  />
                  <BankingInput
                    label={isSpanish ? "Monto" : "Amount"}
                    value={transferForm.amount.toString()}
                    onChange={(v) => setTransferForm({ ...transferForm, amount: parseFloat(v) || 0 })}
                    type="number"
                  />
                  <BankingInput
                    label={isSpanish ? "Moneda" : "Currency"}
                    value={transferForm.currency}
                    onChange={(v) => setTransferForm({ ...transferForm, currency: v })}
                  />
                  <BankingInput
                    label={isSpanish ? "Reference" : "Reference"}
                    value={transferForm.reference || ''}
                    onChange={(v) => setTransferForm({ ...transferForm, reference: v })}
                  />
                </div>
                <BankingButton
                  variant="primary"
                  icon={ArrowRightLeft}
                  onClick={handleInternalTransfer}
                  disabled={loading}
                >
                  {isSpanish ? 'Crear Transferencia Interna' : 'Create Internal Transfer'}
                </BankingButton>
              </BankingCard>
            </BankingSection>

            {/* External Transfer */}
            <BankingSection title={isSpanish ? "Transferencia Externa" : "External Transfer"} icon={Send} color="purple">
              <BankingCard className="p-6 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <BankingInput
                    label={isSpanish ? "Desde Account ID" : "From Account ID"}
                    value={externalTransferForm.fromAccountId.toString()}
                    onChange={(v) => setExternalTransferForm({ ...externalTransferForm, fromAccountId: parseInt(v) || 0 })}
                    type="number"
                  />
                  <BankingInput
                    label={isSpanish ? "Monto" : "Amount"}
                    value={externalTransferForm.amount.toString()}
                    onChange={(v) => setExternalTransferForm({ ...externalTransferForm, amount: parseFloat(v) || 0 })}
                    type="number"
                  />
                  <BankingInput
                    label={isSpanish ? "Moneda" : "Currency"}
                    value={externalTransferForm.currency}
                    onChange={(v) => setExternalTransferForm({ ...externalTransferForm, currency: v })}
                  />
                  <BankingInput
                    label={isSpanish ? "Nombre Beneficiario" : "Beneficiary Name"}
                    value={externalTransferForm.beneficiaryName}
                    onChange={(v) => setExternalTransferForm({ ...externalTransferForm, beneficiaryName: v })}
                  />
                  <BankingInput
                    label="IBAN"
                    value={externalTransferForm.beneficiaryIban}
                    onChange={(v) => setExternalTransferForm({ ...externalTransferForm, beneficiaryIban: v })}
                  />
                  <BankingInput
                    label="BIC (opcional)"
                    value={externalTransferForm.beneficiaryBic || ''}
                    onChange={(v) => setExternalTransferForm({ ...externalTransferForm, beneficiaryBic: v })}
                  />
                  <BankingInput
                    label={isSpanish ? "Reference" : "Reference"}
                    value={externalTransferForm.reference || ''}
                    onChange={(v) => setExternalTransferForm({ ...externalTransferForm, reference: v })}
                  />
                </div>
                <BankingButton
                  variant="primary"
                  icon={Send}
                  onClick={handleExternalTransfer}
                  disabled={loading}
                >
                  {isSpanish ? 'Crear Transferencia Externa' : 'Create External Transfer'}
                </BankingButton>
              </BankingCard>
            </BankingSection>
          </div>
        )}

        {/* Exchange Tab */}
        {activeTab === 'exchange' && (
          <BankingSection title={isSpanish ? "Exchange" : "Exchange"} icon={Globe} color="amber">
            <BankingCard className="p-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <BankingInput
                  label={isSpanish ? "Desde Account ID" : "From Account ID"}
                  value={exchangeForm.fromAccountId.toString()}
                  onChange={(v) => setExchangeForm({ ...exchangeForm, fromAccountId: parseInt(v) || 0 })}
                  type="number"
                />
                <BankingInput
                  label={isSpanish ? "Hacia Account ID" : "To Account ID"}
                  value={exchangeForm.toAccountId.toString()}
                  onChange={(v) => setExchangeForm({ ...exchangeForm, toAccountId: parseInt(v) || 0 })}
                  type="number"
                />
                <BankingInput
                  label={isSpanish ? "Monto" : "Amount"}
                  value={exchangeForm.amount.toString()}
                  onChange={(v) => setExchangeForm({ ...exchangeForm, amount: parseFloat(v) || 0 })}
                  type="number"
                />
                <BankingInput
                  label={isSpanish ? "Moneda Origen" : "From Currency"}
                  value={exchangeForm.fromCurrency}
                  onChange={(v) => setExchangeForm({ ...exchangeForm, fromCurrency: v })}
                />
                <BankingInput
                  label={isSpanish ? "Moneda Destino" : "To Currency"}
                  value={exchangeForm.toCurrency}
                  onChange={(v) => setExchangeForm({ ...exchangeForm, toCurrency: v })}
                />
                <BankingInput
                  label={isSpanish ? "Reference" : "Reference"}
                  value={exchangeForm.reference || ''}
                  onChange={(v) => setExchangeForm({ ...exchangeForm, reference: v })}
                />
              </div>
              <BankingButton
                variant="primary"
                icon={Globe}
                onClick={handleExchange}
                disabled={loading}
              >
                {isSpanish ? 'Crear Exchange' : 'Create Exchange'}
              </BankingButton>
            </BankingCard>
          </BankingSection>
        )}

        {/* History Tab */}
        {activeTab === 'history' && (
          <BankingSection title={isSpanish ? "Historial de Transacciones" : "Transaction History"} icon={History} color="sky">
            <BankingCard className="p-12 text-center">
              <History className="w-20 h-20 text-slate-700 mx-auto mb-4" />
              <p className="text-slate-400">
                {isSpanish ? 'Funcionalidad de historial próximamente' : 'History functionality coming soon'}
              </p>
            </BankingCard>
          </BankingSection>
        )}

      </div>
    </div>
  );
}

