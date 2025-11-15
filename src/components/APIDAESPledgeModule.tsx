/**
 * API DAES Pledge/Escrow Module
 * Sistema completo de gestión de pledges, payouts y reconciliación
 * Spec: 2025-11-12 01:10 UTC
 */

import { useState, useEffect } from 'react';
import {
  Shield,
  Lock,
  Unlock,
  DollarSign,
  TrendingUp,
  TrendingDown,
  Send,
  RefreshCw,
  CheckCircle,
  XCircle,
  Clock,
  AlertCircle,
  Download,
  FileText,
  Activity,
  Eye,
  Settings,
  Webhook,
  Database,
  ArrowUpRight,
  ArrowDownRight,
  Trash2
} from 'lucide-react';
import { useLanguage } from '../lib/i18n';
import { daesPledgeStore, type Pledge, type Payout, type ReserveSummary, type Attestation, type WebhookEvent } from '../lib/daes-pledge-store';

type ViewType = 'overview' | 'pledges' | 'payouts' | 'attestations' | 'webhooks' | 'settings';

export function APIDAESPledgeModule() {
  const { t, language } = useLanguage();
  const [selectedView, setSelectedView] = useState<ViewType>('overview');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Data state
  const [pledges, setPledges] = useState<Pledge[]>([]);
  const [payouts, setPayouts] = useState<Payout[]>([]);
  const [reserveSummary, setReserveSummary] = useState<ReserveSummary | null>(null);
  const [latestAttestation, setLatestAttestation] = useState<Attestation | null>(null);
  const [webhookEvents, setWebhookEvents] = useState<WebhookEvent[]>([]);

  // Settings state
  const [apiKey, setApiKey] = useState('');
  const [apiSecret, setApiSecret] = useState('');
  const [baseUrl, setBaseUrl] = useState('https://api.daes.world');
  const [isConfigured, setIsConfigured] = useState(false);

  // Modal states
  const [showPledgeModal, setShowPledgeModal] = useState(false);
  const [showPayoutModal, setShowPayoutModal] = useState(false);
  const [showAdjustModal, setShowAdjustModal] = useState(false);
  const [selectedPledge, setSelectedPledge] = useState<Pledge | null>(null);

  // Form states
  const [pledgeForm, setPledgeForm] = useState({
    amount: '',
    currency: 'USD',
    beneficiary: 'VUSD',
    expires_at: '',
    purpose: 'liquidity_backing'
  });

  const [payoutForm, setPayoutForm] = useState({
    external_ref: '',
    amount: '',
    currency: 'USD',
    beneficiary_name: '',
    iban: '',
    swift: '',
    channel: 'DAES',
    pledge_id: '',
    callback_url: ''
  });

  const [adjustForm, setAdjustForm] = useState({
    type: 'IN' as 'IN' | 'OUT',
    amount: '',
    reason: ''
  });

  useEffect(() => {
    if (isConfigured) {
      loadData();
      const interval = setInterval(loadData, 10000);
      return () => clearInterval(interval);
    }
  }, [isConfigured]);

  const loadData = async () => {
    try {
      const [pledgesList, payoutsList, summary, attestation] = await Promise.all([
        daesPledgeStore.listPledges(),
        daesPledgeStore.getPayouts(),
        daesPledgeStore.getReserveSummary(),
        daesPledgeStore.getLatestAttestation()
      ]);

      setPledges(pledgesList);
      setPayouts(payoutsList);
      setReserveSummary(summary);
      setLatestAttestation(attestation);
      setWebhookEvents(daesPledgeStore.getWebhookEvents());
    } catch (err) {
      console.error('[DAES Pledge] Error loading data:', err);
    }
  };

  const handleConfigure = () => {
    if (!apiKey || !apiSecret) {
      setError(language === 'es' ? 'Completa API Key y Secret' : 'Complete API Key and Secret');
      return;
    }

    daesPledgeStore.setCredentials(apiKey, apiSecret, baseUrl);
    setIsConfigured(true);
    setSuccess(language === 'es' ? 'Configuración guardada' : 'Configuration saved');
    loadData();
  };

  const handleCreatePledge = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isConfigured) return;

    try {
      setLoading(true);
      setError(null);

      await daesPledgeStore.createPledge({
        amount: pledgeForm.amount,
        currency: pledgeForm.currency,
        beneficiary: pledgeForm.beneficiary,
        expires_at: pledgeForm.expires_at,
        purpose: pledgeForm.purpose
      });

      setSuccess(language === 'es' ? 'Pledge creado exitosamente' : 'Pledge created successfully');
      setShowPledgeModal(false);
      setPledgeForm({ amount: '', currency: 'USD', beneficiary: 'VUSD', expires_at: '', purpose: 'liquidity_backing' });
      await loadData();
    } catch (err) {
      const error = err as Error;
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCreatePayout = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isConfigured) return;

    try {
      setLoading(true);
      setError(null);

      await daesPledgeStore.createPayout({
        external_ref: payoutForm.external_ref,
        amount: payoutForm.amount,
        currency: payoutForm.currency,
        beneficiary: {
          name: payoutForm.beneficiary_name,
          iban: payoutForm.iban || undefined,
          swift: payoutForm.swift || undefined
        },
        channel: payoutForm.channel,
        pledge_id: payoutForm.pledge_id || undefined,
        callback_url: payoutForm.callback_url || undefined
      });

      setSuccess(language === 'es' ? 'Payout creado exitosamente' : 'Payout created successfully');
      setShowPayoutModal(false);
      setPayoutForm({ external_ref: '', amount: '', currency: 'USD', beneficiary_name: '', iban: '', swift: '', channel: 'DAES', pledge_id: '', callback_url: '' });
      await loadData();
    } catch (err) {
      const error = err as Error;
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleAdjustPledge = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isConfigured || !selectedPledge) return;

    try {
      setLoading(true);
      setError(null);

      await daesPledgeStore.adjustPledge(
        selectedPledge.pledge_id,
        adjustForm.type,
        adjustForm.amount,
        adjustForm.reason
      );

      setSuccess(language === 'es' ? 'Pledge ajustado exitosamente' : 'Pledge adjusted successfully');
      setShowAdjustModal(false);
      setSelectedPledge(null);
      setAdjustForm({ type: 'IN', amount: '', reason: '' });
      await loadData();
    } catch (err) {
      const error = err as Error;
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleReleasePledge = async (pledgeId: string) => {
    if (!isConfigured) return;
    if (!confirm(language === 'es' ? '¿Liberar este pledge?' : 'Release this pledge?')) return;

    try {
      setLoading(true);
      await daesPledgeStore.releasePledge(pledgeId);
      setSuccess(language === 'es' ? 'Pledge liberado' : 'Pledge released');
      await loadData();
    } catch (err) {
      const error = err as Error;
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDeletePledge = async (pledge: Pledge) => {
    if (!isConfigured) return;

    const confirmMessage = language === 'es'
      ? `¿Eliminar este pledge?\n\n` +
        `Pledge ID: ${pledge.pledge_id}\n` +
        `Monto: ${pledge.currency} ${parseFloat(pledge.amount).toLocaleString()}\n` +
        `Propósito: ${pledge.purpose}\n\n` +
        `Esta acción no se puede deshacer.`
      : `Delete this pledge?\n\n` +
        `Pledge ID: ${pledge.pledge_id}\n` +
        `Amount: ${pledge.currency} ${parseFloat(pledge.amount).toLocaleString()}\n` +
        `Purpose: ${pledge.purpose}\n\n` +
        `This action cannot be undone.`;

    if (!confirm(confirmMessage)) return;

    try {
      setLoading(true);
      await daesPledgeStore.deletePledge(pledge.pledge_id);
      setSuccess(language === 'es' ? 'Pledge eliminado exitosamente' : 'Pledge deleted successfully');
      await loadData();
    } catch (err) {
      const error = err as Error;
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const downloadReconciliation = async () => {
    try {
      setLoading(true);
      const today = new Date().toISOString().split('T')[0];
      const report = await daesPledgeStore.getReconciliationReport(today);

      const blob = new Blob([report.csv_data], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `reconciliation_${today}.csv`;
      a.click();
      URL.revokeObjectURL(url);

      setSuccess(language === 'es' ? 'Reporte descargado' : 'Report downloaded');
    } catch (err) {
      const error = err as Error;
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  if (!isConfigured) {
    return (
      <div className="min-h-screen bg-black text-white p-6">
        <div className="max-w-2xl mx-auto">
          <div className="bg-gradient-to-br from-green-900/20 to-blue-900/20 border border-green-500/30 rounded-lg p-8">
            <div className="flex items-center gap-3 mb-6">
              <Shield className="w-8 h-8 text-green-400" />
              <h1 className="text-2xl font-bold">
                {language === 'es' ? 'API DAES Pledge/Escrow' : 'DAES Pledge/Escrow API'}
              </h1>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm text-gray-400 mb-2">API Key</label>
                <input
                  type="text"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  className="w-full bg-black/50 border border-green-500/30 rounded px-4 py-2 text-white"
                  placeholder="your-api-key"
                />
              </div>

              <div>
                <label className="block text-sm text-gray-400 mb-2">API Secret</label>
                <input
                  type="password"
                  value={apiSecret}
                  onChange={(e) => setApiSecret(e.target.value)}
                  className="w-full bg-black/50 border border-green-500/30 rounded px-4 py-2 text-white"
                  placeholder="your-api-secret"
                />
              </div>

              <div>
                <label className="block text-sm text-gray-400 mb-2">Base URL</label>
                <input
                  type="text"
                  value={baseUrl}
                  onChange={(e) => setBaseUrl(e.target.value)}
                  className="w-full bg-black/50 border border-green-500/30 rounded px-4 py-2 text-white"
                  placeholder="https://api.daes.world"
                />
              </div>

              {error && (
                <div className="bg-red-500/10 border border-red-500 rounded p-3 text-red-400 text-sm">
                  {error}
                </div>
              )}

              <button
                onClick={handleConfigure}
                className="w-full bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded font-semibold transition-colors"
              >
                {language === 'es' ? 'Configurar API' : 'Configure API'}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Shield className="w-8 h-8 text-green-400" />
            <h1 className="text-2xl font-bold">
              {language === 'es' ? 'DAES Pledge/Escrow API' : 'DAES Pledge/Escrow API'}
            </h1>
          </div>
          <button
            onClick={loadData}
            disabled={loading}
            className="flex items-center gap-2 bg-green-600/20 hover:bg-green-600/30 border border-green-500/30 px-4 py-2 rounded transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            {language === 'es' ? 'Actualizar' : 'Refresh'}
          </button>
        </div>

        {/* Alerts */}
        {error && (
          <div className="bg-red-500/10 border border-red-500 rounded-lg p-4 mb-6 flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0" />
            <span className="text-red-400">{error}</span>
            <button onClick={() => setError(null)} className="ml-auto text-red-400 hover:text-red-300">
              <XCircle className="w-5 h-5" />
            </button>
          </div>
        )}

        {success && (
          <div className="bg-green-500/10 border border-green-500 rounded-lg p-4 mb-6 flex items-center gap-3">
            <CheckCircle className="w-5 h-5 text-green-400 flex-shrink-0" />
            <span className="text-green-400">{success}</span>
            <button onClick={() => setSuccess(null)} className="ml-auto text-green-400 hover:text-green-300">
              <XCircle className="w-5 h-5" />
            </button>
          </div>
        )}

        {/* Navigation Tabs */}
        <div className="flex gap-2 mb-6 overflow-x-auto">
          {[
            { id: 'overview', label: language === 'es' ? 'Resumen' : 'Overview', icon: Activity },
            { id: 'pledges', label: 'Pledges', icon: Lock },
            { id: 'payouts', label: 'Payouts', icon: Send },
            { id: 'attestations', label: language === 'es' ? 'Attestaciones' : 'Attestations', icon: Shield },
            { id: 'webhooks', label: 'Webhooks', icon: Webhook },
            { id: 'settings', label: language === 'es' ? 'Configuración' : 'Settings', icon: Settings }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setSelectedView(tab.id as ViewType)}
              className={`flex items-center gap-2 px-4 py-2 rounded transition-colors whitespace-nowrap ${
                selectedView === tab.id
                  ? 'bg-green-600 text-white'
                  : 'bg-green-600/20 text-green-400 hover:bg-green-600/30'
              }`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Overview */}
        {selectedView === 'overview' && reserveSummary && (
          <div className="space-y-6">
            {/* Reserve Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="bg-gradient-to-br from-green-900/20 to-blue-900/20 border border-green-500/30 rounded-lg p-6">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-gray-400 text-sm">{language === 'es' ? 'Total Reservas' : 'Total Reserves'}</span>
                  <Database className="w-5 h-5 text-green-400" />
                </div>
                <div className="text-2xl font-bold text-green-400">${parseFloat(reserveSummary.total_usd).toLocaleString()}</div>
              </div>

              <div className="bg-gradient-to-br from-blue-900/20 to-purple-900/20 border border-blue-500/30 rounded-lg p-6">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-gray-400 text-sm">{language === 'es' ? 'Pledged' : 'Pledged'}</span>
                  <Lock className="w-5 h-5 text-blue-400" />
                </div>
                <div className="text-2xl font-bold text-blue-400">${parseFloat(reserveSummary.pledged_usd).toLocaleString()}</div>
              </div>

              <div className="bg-gradient-to-br from-purple-900/20 to-pink-900/20 border border-purple-500/30 rounded-lg p-6">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-gray-400 text-sm">{language === 'es' ? 'Disponible' : 'Available'}</span>
                  <Unlock className="w-5 h-5 text-purple-400" />
                </div>
                <div className="text-2xl font-bold text-purple-400">${parseFloat(reserveSummary.unpledged_usd).toLocaleString()}</div>
              </div>

              <div className="bg-gradient-to-br from-yellow-900/20 to-orange-900/20 border border-yellow-500/30 rounded-lg p-6">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-gray-400 text-sm">{language === 'es' ? 'Payouts Pendientes' : 'Pending Payouts'}</span>
                  <Clock className="w-5 h-5 text-yellow-400" />
                </div>
                <div className="text-2xl font-bold text-yellow-400">${parseFloat(reserveSummary.total_payouts_pending).toLocaleString()}</div>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <button
                onClick={() => setShowPledgeModal(true)}
                className="bg-green-600/20 hover:bg-green-600/30 border border-green-500/30 rounded-lg p-6 text-left transition-colors"
              >
                <Lock className="w-8 h-8 text-green-400 mb-3" />
                <h3 className="text-lg font-semibold mb-1">{language === 'es' ? 'Crear Pledge' : 'Create Pledge'}</h3>
                <p className="text-sm text-gray-400">{language === 'es' ? 'Comprometer fondos para VUSD' : 'Commit funds for VUSD'}</p>
              </button>

              <button
                onClick={() => setShowPayoutModal(true)}
                className="bg-blue-600/20 hover:bg-blue-600/30 border border-blue-500/30 rounded-lg p-6 text-left transition-colors"
              >
                <Send className="w-8 h-8 text-blue-400 mb-3" />
                <h3 className="text-lg font-semibold mb-1">{language === 'es' ? 'Crear Payout' : 'Create Payout'}</h3>
                <p className="text-sm text-gray-400">{language === 'es' ? 'Enviar fondos a beneficiario' : 'Send funds to beneficiary'}</p>
              </button>

              <button
                onClick={downloadReconciliation}
                className="bg-purple-600/20 hover:bg-purple-600/30 border border-purple-500/30 rounded-lg p-6 text-left transition-colors"
              >
                <Download className="w-8 h-8 text-purple-400 mb-3" />
                <h3 className="text-lg font-semibold mb-1">{language === 'es' ? 'Reconciliación' : 'Reconciliation'}</h3>
                <p className="text-sm text-gray-400">{language === 'es' ? 'Descargar reporte diario' : 'Download daily report'}</p>
              </button>
            </div>

            {/* Recent Activity */}
            <div className="bg-gradient-to-br from-gray-900/50 to-black border border-gray-700 rounded-lg p-6">
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <Activity className="w-5 h-5 text-green-400" />
                {language === 'es' ? 'Actividad Reciente' : 'Recent Activity'}
              </h3>
              <div className="space-y-3">
                {pledges.slice(0, 3).map(pledge => (
                  <div key={pledge.pledge_id} className="flex items-center justify-between p-3 bg-black/50 rounded border border-gray-700">
                    <div className="flex items-center gap-3">
                      <Lock className="w-4 h-4 text-blue-400" />
                      <div>
                        <div className="font-mono text-sm">{pledge.pledge_id}</div>
                        <div className="text-xs text-gray-400">{new Date(pledge.created_at).toLocaleString()}</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-semibold text-green-400">${parseFloat(pledge.amount).toLocaleString()} {pledge.currency}</div>
                      <div className="text-xs text-gray-400">{pledge.status}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Pledges View */}
        {selectedView === 'pledges' && (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-bold">{language === 'es' ? 'Gestión de Pledges' : 'Pledge Management'}</h2>
              <button
                onClick={() => setShowPledgeModal(true)}
                className="flex items-center gap-2 bg-green-600 hover:bg-green-700 px-4 py-2 rounded transition-colors"
              >
                <Lock className="w-4 h-4" />
                {language === 'es' ? 'Nuevo Pledge' : 'New Pledge'}
              </button>
            </div>

            <div className="grid gap-4">
              {pledges.map(pledge => (
                <div key={pledge.pledge_id} className="bg-gradient-to-br from-gray-900/50 to-black border border-gray-700 rounded-lg p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <div className="font-mono text-lg font-bold mb-1">{pledge.pledge_id}</div>
                      <div className="text-sm text-gray-400">{pledge.purpose}</div>
                    </div>
                    <div className={`px-3 py-1 rounded text-sm font-semibold ${
                      pledge.status === 'ACTIVE' ? 'bg-green-500/20 text-green-400' :
                      pledge.status === 'RELEASED' ? 'bg-gray-500/20 text-gray-400' :
                      'bg-yellow-500/20 text-yellow-400'
                    }`}>
                      {pledge.status}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                    <div>
                      <div className="text-xs text-gray-400 mb-1">{language === 'es' ? 'Monto Total' : 'Total Amount'}</div>
                      <div className="font-semibold text-green-400">${parseFloat(pledge.amount).toLocaleString()} {pledge.currency}</div>
                    </div>
                    <div>
                      <div className="text-xs text-gray-400 mb-1">{language === 'es' ? 'Disponible' : 'Available'}</div>
                      <div className="font-semibold text-blue-400">${parseFloat(pledge.available).toLocaleString()}</div>
                    </div>
                    <div>
                      <div className="text-xs text-gray-400 mb-1">{language === 'es' ? 'Reservado' : 'Reserved'}</div>
                      <div className="font-semibold text-yellow-400">${parseFloat(pledge.reserved).toLocaleString()}</div>
                    </div>
                    <div>
                      <div className="text-xs text-gray-400 mb-1">{language === 'es' ? 'Expira' : 'Expires'}</div>
                      <div className="font-semibold text-gray-300">{new Date(pledge.expires_at).toLocaleDateString()}</div>
                    </div>
                  </div>

                  {pledge.status === 'ACTIVE' && (
                    <div className="flex gap-2">
                      <button
                        onClick={() => {
                          setSelectedPledge(pledge);
                          setShowAdjustModal(true);
                        }}
                        className="flex items-center gap-2 bg-blue-600/20 hover:bg-blue-600/30 border border-blue-500/30 px-3 py-2 rounded text-sm transition-colors"
                      >
                        <TrendingUp className="w-4 h-4" />
                        {language === 'es' ? 'Ajustar' : 'Adjust'}
                      </button>
                      <button
                        onClick={() => handleReleasePledge(pledge.pledge_id)}
                        className="flex items-center gap-2 bg-gray-600/20 hover:bg-gray-600/30 border border-gray-500/30 px-3 py-2 rounded text-sm transition-colors"
                      >
                        <Unlock className="w-4 h-4" />
                        {language === 'es' ? 'Liberar' : 'Release'}
                      </button>
                      <button
                        onClick={() => handleDeletePledge(pledge)}
                        className="flex items-center gap-2 bg-red-600/20 hover:bg-red-600/30 border border-red-500/30 px-3 py-2 rounded text-sm transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                        {language === 'es' ? 'Eliminar' : 'Delete'}
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Payouts View */}
        {selectedView === 'payouts' && (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-bold">{language === 'es' ? 'Gestión de Payouts' : 'Payout Management'}</h2>
              <button
                onClick={() => setShowPayoutModal(true)}
                className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded transition-colors"
              >
                <Send className="w-4 h-4" />
                {language === 'es' ? 'Nuevo Payout' : 'New Payout'}
              </button>
            </div>

            <div className="grid gap-4">
              {payouts.map(payout => (
                <div key={payout.payout_id} className="bg-gradient-to-br from-gray-900/50 to-black border border-gray-700 rounded-lg p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <div className="font-mono text-lg font-bold mb-1">{payout.payout_id}</div>
                      <div className="text-sm text-gray-400">{payout.external_ref}</div>
                    </div>
                    <div className={`px-3 py-1 rounded text-sm font-semibold ${
                      payout.state === 'COMPLETED' ? 'bg-green-500/20 text-green-400' :
                      payout.state === 'FAILED' ? 'bg-red-500/20 text-red-400' :
                      payout.state === 'PROCESSING' ? 'bg-blue-500/20 text-blue-400' :
                      'bg-yellow-500/20 text-yellow-400'
                    }`}>
                      {payout.state}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-4">
                    <div>
                      <div className="text-xs text-gray-400 mb-1">{language === 'es' ? 'Monto' : 'Amount'}</div>
                      <div className="font-semibold text-blue-400">${parseFloat(payout.amount).toLocaleString()} {payout.currency}</div>
                    </div>
                    <div>
                      <div className="text-xs text-gray-400 mb-1">{language === 'es' ? 'Beneficiario' : 'Beneficiary'}</div>
                      <div className="font-semibold">{payout.beneficiary.name}</div>
                    </div>
                    <div>
                      <div className="text-xs text-gray-400 mb-1">{language === 'es' ? 'Canal' : 'Channel'}</div>
                      <div className="font-semibold">{payout.channel}</div>
                    </div>
                  </div>

                  {payout.error_message && (
                    <div className="bg-red-500/10 border border-red-500/30 rounded p-3 text-sm text-red-400">
                      {payout.error_message}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Attestations View */}
        {selectedView === 'attestations' && latestAttestation && (
          <div className="space-y-4">
            <h2 className="text-xl font-bold">{language === 'es' ? 'Attestaciones' : 'Attestations'}</h2>

            <div className="bg-gradient-to-br from-gray-900/50 to-black border border-gray-700 rounded-lg p-6">
              <div className="flex items-center gap-3 mb-6">
                <Shield className="w-8 h-8 text-green-400" />
                <div>
                  <h3 className="text-lg font-bold">{language === 'es' ? 'Última Attestación' : 'Latest Attestation'}</h3>
                  <p className="text-sm text-gray-400">{new Date(latestAttestation.timestamp).toLocaleString()}</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                <div>
                  <div className="text-sm text-gray-400 mb-2">{language === 'es' ? 'Total Reservas' : 'Total Reserves'}</div>
                  <div className="text-2xl font-bold text-green-400">${parseFloat(latestAttestation.reserves_total).toLocaleString()}</div>
                </div>
                <div>
                  <div className="text-sm text-gray-400 mb-2">{language === 'es' ? 'Total Pledges' : 'Total Pledges'}</div>
                  <div className="text-2xl font-bold text-blue-400">${parseFloat(latestAttestation.pledges_total).toLocaleString()}</div>
                </div>
              </div>

              <div className="space-y-3">
                <div>
                  <div className="text-sm text-gray-400 mb-1">Hash</div>
                  <div className="font-mono text-sm bg-black/50 p-3 rounded border border-gray-700 break-all">{latestAttestation.hash}</div>
                </div>
                <div>
                  <div className="text-sm text-gray-400 mb-1">Signature</div>
                  <div className="font-mono text-sm bg-black/50 p-3 rounded border border-gray-700 break-all">{latestAttestation.signature}</div>
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <a
                  href={latestAttestation.pdf_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 bg-red-600/20 hover:bg-red-600/30 border border-red-500/30 px-4 py-2 rounded transition-colors"
                >
                  <FileText className="w-4 h-4" />
                  {language === 'es' ? 'Ver PDF' : 'View PDF'}
                </a>
                <a
                  href={latestAttestation.csv_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 bg-green-600/20 hover:bg-green-600/30 border border-green-500/30 px-4 py-2 rounded transition-colors"
                >
                  <Download className="w-4 h-4" />
                  {language === 'es' ? 'Descargar CSV' : 'Download CSV'}
                </a>
              </div>
            </div>
          </div>
        )}

        {/* Webhooks View */}
        {selectedView === 'webhooks' && (
          <div className="space-y-4">
            <h2 className="text-xl font-bold">{language === 'es' ? 'Eventos Webhook' : 'Webhook Events'}</h2>

            <div className="grid gap-4">
              {webhookEvents.slice().reverse().map(event => (
                <div key={event.event_id} className="bg-gradient-to-br from-gray-900/50 to-black border border-gray-700 rounded-lg p-6">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <div className="font-mono text-sm font-bold mb-1">{event.event_id}</div>
                      <div className="text-sm text-gray-400">{event.event_type}</div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className={`px-3 py-1 rounded text-xs font-semibold ${
                        event.delivered ? 'bg-green-500/20 text-green-400' : 'bg-yellow-500/20 text-yellow-400'
                      }`}>
                        {event.delivered ? 'Delivered' : `Retry ${event.retry_count}`}
                      </div>
                      {event.delivered ? (
                        <CheckCircle className="w-5 h-5 text-green-400" />
                      ) : (
                        <Clock className="w-5 h-5 text-yellow-400" />
                      )}
                    </div>
                  </div>
                  <div className="text-xs text-gray-400">{new Date(event.timestamp).toLocaleString()}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Settings View */}
        {selectedView === 'settings' && (
          <div className="space-y-4">
            <h2 className="text-xl font-bold">{language === 'es' ? 'Configuración' : 'Settings'}</h2>

            <div className="bg-gradient-to-br from-gray-900/50 to-black border border-gray-700 rounded-lg p-6 space-y-4">
              <div>
                <label className="block text-sm text-gray-400 mb-2">API Key</label>
                <input
                  type="text"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  className="w-full bg-black/50 border border-gray-600 rounded px-4 py-2"
                />
              </div>

              <div>
                <label className="block text-sm text-gray-400 mb-2">API Secret</label>
                <input
                  type="password"
                  value={apiSecret}
                  onChange={(e) => setApiSecret(e.target.value)}
                  className="w-full bg-black/50 border border-gray-600 rounded px-4 py-2"
                />
              </div>

              <div>
                <label className="block text-sm text-gray-400 mb-2">Base URL</label>
                <input
                  type="text"
                  value={baseUrl}
                  onChange={(e) => setBaseUrl(e.target.value)}
                  className="w-full bg-black/50 border border-gray-600 rounded px-4 py-2"
                />
              </div>

              <button
                onClick={handleConfigure}
                className="bg-green-600 hover:bg-green-700 px-6 py-2 rounded transition-colors"
              >
                {language === 'es' ? 'Guardar Cambios' : 'Save Changes'}
              </button>
            </div>
          </div>
        )}

        {/* Create Pledge Modal */}
        {showPledgeModal && (
          <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
            <div className="bg-gradient-to-br from-gray-900 to-black border border-green-500/30 rounded-lg p-6 max-w-md w-full">
              <h3 className="text-xl font-bold mb-4">{language === 'es' ? 'Crear Nuevo Pledge' : 'Create New Pledge'}</h3>

              <form onSubmit={handleCreatePledge} className="space-y-4">
                <div>
                  <label className="block text-sm text-gray-400 mb-2">{language === 'es' ? 'Monto' : 'Amount'}</label>
                  <input
                    type="number"
                    step="0.01"
                    value={pledgeForm.amount}
                    onChange={(e) => setPledgeForm({ ...pledgeForm, amount: e.target.value })}
                    className="w-full bg-black/50 border border-gray-600 rounded px-4 py-2"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm text-gray-400 mb-2">{language === 'es' ? 'Divisa' : 'Currency'}</label>
                  <select
                    value={pledgeForm.currency}
                    onChange={(e) => setPledgeForm({ ...pledgeForm, currency: e.target.value })}
                    className="w-full bg-black/50 border border-gray-600 rounded px-4 py-2"
                  >
                    <option value="USD">USD</option>
                    <option value="EUR">EUR</option>
                    <option value="GBP">GBP</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm text-gray-400 mb-2">{language === 'es' ? 'Beneficiario' : 'Beneficiary'}</label>
                  <input
                    type="text"
                    value={pledgeForm.beneficiary}
                    onChange={(e) => setPledgeForm({ ...pledgeForm, beneficiary: e.target.value })}
                    className="w-full bg-black/50 border border-gray-600 rounded px-4 py-2"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm text-gray-400 mb-2">{language === 'es' ? 'Fecha Expiración' : 'Expiration Date'}</label>
                  <input
                    type="datetime-local"
                    value={pledgeForm.expires_at}
                    onChange={(e) => setPledgeForm({ ...pledgeForm, expires_at: e.target.value })}
                    className="w-full bg-black/50 border border-gray-600 rounded px-4 py-2"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm text-gray-400 mb-2">{language === 'es' ? 'Propósito' : 'Purpose'}</label>
                  <input
                    type="text"
                    value={pledgeForm.purpose}
                    onChange={(e) => setPledgeForm({ ...pledgeForm, purpose: e.target.value })}
                    className="w-full bg-black/50 border border-gray-600 rounded px-4 py-2"
                    required
                  />
                </div>

                <div className="flex gap-3">
                  <button
                    type="submit"
                    disabled={loading}
                    className="flex-1 bg-green-600 hover:bg-green-700 px-4 py-2 rounded transition-colors disabled:opacity-50"
                  >
                    {loading ? (language === 'es' ? 'Creando...' : 'Creating...') : (language === 'es' ? 'Crear' : 'Create')}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowPledgeModal(false)}
                    className="flex-1 bg-gray-600 hover:bg-gray-700 px-4 py-2 rounded transition-colors"
                  >
                    {language === 'es' ? 'Cancelar' : 'Cancel'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Create Payout Modal */}
        {showPayoutModal && (
          <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4 overflow-y-auto">
            <div className="bg-gradient-to-br from-gray-900 to-black border border-blue-500/30 rounded-lg p-6 max-w-md w-full my-8">
              <h3 className="text-xl font-bold mb-4">{language === 'es' ? 'Crear Nuevo Payout' : 'Create New Payout'}</h3>

              <form onSubmit={handleCreatePayout} className="space-y-4">
                <div>
                  <label className="block text-sm text-gray-400 mb-2">{language === 'es' ? 'Referencia Externa' : 'External Reference'}</label>
                  <input
                    type="text"
                    value={payoutForm.external_ref}
                    onChange={(e) => setPayoutForm({ ...payoutForm, external_ref: e.target.value })}
                    className="w-full bg-black/50 border border-gray-600 rounded px-4 py-2"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm text-gray-400 mb-2">{language === 'es' ? 'Monto' : 'Amount'}</label>
                  <input
                    type="number"
                    step="0.01"
                    value={payoutForm.amount}
                    onChange={(e) => setPayoutForm({ ...payoutForm, amount: e.target.value })}
                    className="w-full bg-black/50 border border-gray-600 rounded px-4 py-2"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm text-gray-400 mb-2">{language === 'es' ? 'Nombre Beneficiario' : 'Beneficiary Name'}</label>
                  <input
                    type="text"
                    value={payoutForm.beneficiary_name}
                    onChange={(e) => setPayoutForm({ ...payoutForm, beneficiary_name: e.target.value })}
                    className="w-full bg-black/50 border border-gray-600 rounded px-4 py-2"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm text-gray-400 mb-2">IBAN</label>
                  <input
                    type="text"
                    value={payoutForm.iban}
                    onChange={(e) => setPayoutForm({ ...payoutForm, iban: e.target.value })}
                    className="w-full bg-black/50 border border-gray-600 rounded px-4 py-2"
                  />
                </div>

                <div>
                  <label className="block text-sm text-gray-400 mb-2">SWIFT</label>
                  <input
                    type="text"
                    value={payoutForm.swift}
                    onChange={(e) => setPayoutForm({ ...payoutForm, swift: e.target.value })}
                    className="w-full bg-black/50 border border-gray-600 rounded px-4 py-2"
                  />
                </div>

                <div>
                  <label className="block text-sm text-gray-400 mb-2">Pledge ID (opcional)</label>
                  <select
                    value={payoutForm.pledge_id}
                    onChange={(e) => setPayoutForm({ ...payoutForm, pledge_id: e.target.value })}
                    className="w-full bg-black/50 border border-gray-600 rounded px-4 py-2"
                  >
                    <option value="">-- {language === 'es' ? 'Sin Pledge' : 'No Pledge'} --</option>
                    {pledges.filter(p => p.status === 'ACTIVE').map(p => (
                      <option key={p.pledge_id} value={p.pledge_id}>
                        {p.pledge_id} (${parseFloat(p.available).toLocaleString()} available)
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex gap-3">
                  <button
                    type="submit"
                    disabled={loading}
                    className="flex-1 bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded transition-colors disabled:opacity-50"
                  >
                    {loading ? (language === 'es' ? 'Creando...' : 'Creating...') : (language === 'es' ? 'Crear' : 'Create')}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowPayoutModal(false)}
                    className="flex-1 bg-gray-600 hover:bg-gray-700 px-4 py-2 rounded transition-colors"
                  >
                    {language === 'es' ? 'Cancelar' : 'Cancel'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Adjust Pledge Modal */}
        {showAdjustModal && selectedPledge && (
          <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
            <div className="bg-gradient-to-br from-gray-900 to-black border border-yellow-500/30 rounded-lg p-6 max-w-md w-full">
              <h3 className="text-xl font-bold mb-4">{language === 'es' ? 'Ajustar Pledge' : 'Adjust Pledge'}</h3>
              <p className="text-sm text-gray-400 mb-4">{selectedPledge.pledge_id}</p>

              <form onSubmit={handleAdjustPledge} className="space-y-4">
                <div>
                  <label className="block text-sm text-gray-400 mb-2">{language === 'es' ? 'Tipo' : 'Type'}</label>
                  <div className="flex gap-3">
                    <button
                      type="button"
                      onClick={() => setAdjustForm({ ...adjustForm, type: 'IN' })}
                      className={`flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded transition-colors ${
                        adjustForm.type === 'IN'
                          ? 'bg-green-600 text-white'
                          : 'bg-green-600/20 text-green-400 hover:bg-green-600/30'
                      }`}
                    >
                      <ArrowUpRight className="w-4 h-4" />
                      IN
                    </button>
                    <button
                      type="button"
                      onClick={() => setAdjustForm({ ...adjustForm, type: 'OUT' })}
                      className={`flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded transition-colors ${
                        adjustForm.type === 'OUT'
                          ? 'bg-red-600 text-white'
                          : 'bg-red-600/20 text-red-400 hover:bg-red-600/30'
                      }`}
                    >
                      <ArrowDownRight className="w-4 h-4" />
                      OUT
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-sm text-gray-400 mb-2">{language === 'es' ? 'Monto' : 'Amount'}</label>
                  <input
                    type="number"
                    step="0.01"
                    value={adjustForm.amount}
                    onChange={(e) => setAdjustForm({ ...adjustForm, amount: e.target.value })}
                    className="w-full bg-black/50 border border-gray-600 rounded px-4 py-2"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm text-gray-400 mb-2">{language === 'es' ? 'Razón' : 'Reason'}</label>
                  <textarea
                    value={adjustForm.reason}
                    onChange={(e) => setAdjustForm({ ...adjustForm, reason: e.target.value })}
                    className="w-full bg-black/50 border border-gray-600 rounded px-4 py-2 h-24"
                    required
                  />
                </div>

                <div className="flex gap-3">
                  <button
                    type="submit"
                    disabled={loading}
                    className="flex-1 bg-yellow-600 hover:bg-yellow-700 px-4 py-2 rounded transition-colors disabled:opacity-50"
                  >
                    {loading ? (language === 'es' ? 'Ajustando...' : 'Adjusting...') : (language === 'es' ? 'Ajustar' : 'Adjust')}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowAdjustModal(false);
                      setSelectedPledge(null);
                    }}
                    className="flex-1 bg-gray-600 hover:bg-gray-700 px-4 py-2 rounded transition-colors"
                  >
                    {language === 'es' ? 'Cancelar' : 'Cancel'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
