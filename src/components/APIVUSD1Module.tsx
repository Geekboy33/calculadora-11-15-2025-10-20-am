/**
 * API VUSD1 Module - Interface for Pledges, Payouts, Attestations & Webhooks
 * Complete DAES API implementation with HMAC security
 */

import React, { useState, useEffect } from 'react';
import {
  Lock, Send, FileText, Activity, CheckCircle, Clock,
  AlertCircle, Database, Shield, Zap, Download, RefreshCw, Trash2, Key
} from 'lucide-react';
import { apiVUSD1Store, type ApiPledge, type ApiPayout, type ApiAttestation, type ReserveSummary } from '../lib/api-vusd1-store';
import { APIVUSD1KeysManager } from './APIVUSD1KeysManager';
import { custodyStore, type CustodyAccount } from '../lib/custody-store';

export default function APIVUSD1Module() {
  const [selectedView, setSelectedView] = useState<'overview' | 'pledges' | 'payouts' | 'attestations' | 'events' | 'api-keys'>('overview');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Data states
  const [pledges, setPledges] = useState<ApiPledge[]>([]);
  const [payouts, setPayouts] = useState<ApiPayout[]>([]);
  const [attestation, setAttestation] = useState<ApiAttestation | null>(null);
  const [reserveSummary, setReserveSummary] = useState<ReserveSummary | null>(null);
  const [custodyAccounts, setCustodyAccounts] = useState<CustodyAccount[]>([]);

  // Form states
  const [showPledgeModal, setShowPledgeModal] = useState(false);
  const [showPayoutModal, setShowPayoutModal] = useState(false);
  const [selectedCustodyAccount, setSelectedCustodyAccount] = useState<string>('');
  const [pledgeForm, setPledgeForm] = useState({
    amount: 0,
    currency: 'USD',
    beneficiary: 'VUSD', // Default beneficiary
    external_ref: '',
    expires_at: ''
  });
  const [payoutForm, setPayoutForm] = useState({
    pledge_id: '',
    amount: 0,
    destination_account: '',
    external_ref: ''
  });

  // Load data
  useEffect(() => {
    loadData();
    loadCustodyAccounts();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);

      const [pledgesData, summary, latestAttestation] = await Promise.all([
        apiVUSD1Store.listPledges({ status: 'ACTIVE' }),
        apiVUSD1Store.getReservesSummary(),
        apiVUSD1Store.getLatestAttestation()
      ]);

      setPledges(pledgesData);
      setReserveSummary(summary);
      setAttestation(latestAttestation);

    } catch (err) {
      console.error('[APIVUSD1] Error loading data:', err);
      setError(err instanceof Error ? err.message : 'Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const loadCustodyAccounts = () => {
    const accounts = custodyStore.getAccounts();
    console.log('[APIVUSD1] Loaded custody accounts:', accounts.length);
    setCustodyAccounts(accounts);
  };

  // Create Pledge
  const handleCreatePledge = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setLoading(true);
      setError(null);

      const result = await apiVUSD1Store.createPledge({
        amount: pledgeForm.amount,
        currency: pledgeForm.currency,
        beneficiary: pledgeForm.beneficiary,
        external_ref: pledgeForm.external_ref || undefined,
        expires_at: pledgeForm.expires_at || undefined,
        idempotency_key: `PLEDGE_${Date.now()}`
      });

      console.log('[APIVUSD1] ✅ Pledge created:', result);

      setShowPledgeModal(false);
      setPledgeForm({ amount: 0, currency: 'USD', beneficiary: '', external_ref: '', expires_at: '' });

      await loadData();

      alert(`✅ Pledge Created Successfully!\n\nPledge ID: ${result.pledge_id}\nAmount: ${result.currency} ${result.amount.toLocaleString('en-US', { minimumFractionDigits: 3, maximumFractionDigits: 3 })}\nBeneficiary: ${result.beneficiary}`);

    } catch (err) {
      const error = err as Error;
      console.error('[APIVUSD1] Error creating pledge:', error);
      setError(error.message);
      alert('Error creating pledge: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  // Create Payout
  const handleCreatePayout = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setLoading(true);
      setError(null);

      const result = await apiVUSD1Store.createPayout({
        pledge_id: payoutForm.pledge_id,
        amount: payoutForm.amount,
        destination_account: payoutForm.destination_account,
        external_ref: payoutForm.external_ref || undefined,
        idempotency_key: `PAYOUT_${Date.now()}`
      });

      console.log('[APIVUSD1] ✅ Payout created:', result);

      setShowPayoutModal(false);
      setPayoutForm({ pledge_id: '', amount: 0, destination_account: '', external_ref: '' });

      await loadData();

      alert(`✅ Payout Created Successfully!\n\nPayout ID: ${result.payout_id}\nAmount: ${result.currency} ${result.amount.toLocaleString('en-US', { minimumFractionDigits: 3, maximumFractionDigits: 3 })}\nStatus: ${result.status}`);

    } catch (err) {
      const error = err as Error;
      console.error('[APIVUSD1] Error creating payout:', error);
      setError(error.message);
      alert('Error creating payout: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  // Delete Pledge
  const handleDeletePledge = async (pledge: ApiPledge) => {
    const confirmMessage =
      `Delete this pledge?\n\n` +
      `Pledge ID: ${pledge.pledge_id}\n` +
      `Amount: ${pledge.currency} ${pledge.amount.toLocaleString('en-US', { minimumFractionDigits: 3, maximumFractionDigits: 3 })}\n` +
      `Beneficiary: ${pledge.beneficiary}\n\n` +
      `This action cannot be undone.`;

    if (!window.confirm(confirmMessage)) {
      return;
    }

    try {
      setLoading(true);
      setError(null);

      console.log('[APIVUSD1] 🗑️ Deleting pledge:', pledge.pledge_id);

      await apiVUSD1Store.deletePledge(pledge.pledge_id);

      console.log('[APIVUSD1] ✅ Pledge deleted successfully');

      await loadData();

      alert(
        `✅ Pledge Deleted Successfully!\n\n` +
        `Pledge ID: ${pledge.pledge_id}\n` +
        `Amount: ${pledge.currency} ${pledge.amount.toLocaleString('en-US', { minimumFractionDigits: 3, maximumFractionDigits: 3 })}`
      );

    } catch (err) {
      const error = err as Error;
      console.error('[APIVUSD1] ❌ Error deleting pledge:', error);
      setError(error.message);
      alert('Error deleting pledge: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  // Create Attestation
  const handleCreateAttestation = async () => {
    try {
      setLoading(true);
      setError(null);

      const result = await apiVUSD1Store.createAttestation({
        as_of_date: new Date().toISOString().split('T')[0],
        document_url: 'https://attestations.daes.vergy.world/latest'
      });

      console.log('[APIVUSD1] ✅ Attestation created:', result);

      await loadData();

      alert(`✅ Attestation Created!\n\nAttestation ID: ${result.attestation_id}\nCirculating Cap: $${result.circulating_cap.toLocaleString('en-US', { minimumFractionDigits: 3, maximumFractionDigits: 3 })}\nDocument Hash: ${result.document_hash.substring(0, 16)}...`);

    } catch (err) {
      const error = err as Error;
      console.error('[APIVUSD1] Error creating attestation:', error);
      alert('Error creating attestation: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  // Complete Payout
  const handleCompletePayout = async (payout_id: string) => {
    try {
      setLoading(true);
      const result = await apiVUSD1Store.completePayout(payout_id);
      console.log('[APIVUSD1] ✅ Payout completed:', result);
      await loadData();
      alert(`✅ Payout ${payout_id} marked as COMPLETED`);
    } catch (err) {
      const error = err as Error;
      alert('Error completing payout: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white p-6">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <Database className="w-8 h-8 text-[#00ff88]" />
          <h1 className="text-3xl font-bold text-[#00ff88]">API VUSD1</h1>
          <span className="px-3 py-1 bg-[#00ff88]/20 text-[#00ff88] text-sm rounded-full border border-[#00ff88]">
            Production Ready
          </span>
        </div>
        <p className="text-[#4d7c4d]">
          Pledges, Payouts, Attestations & HMAC Webhooks System
        </p>
      </div>

      {/* Error Display */}
      {error && (
        <div className="mb-6 bg-red-500/10 border border-red-500 rounded-lg p-4 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <div className="font-bold text-red-500">Error</div>
            <div className="text-red-400 text-sm">{error}</div>
          </div>
        </div>
      )}

      {/* Quick Stats */}
      {reserveSummary && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-[#0d0d0d] border border-[#00ff88]/30 rounded-lg p-4">
            <div className="flex items-center gap-2 text-[#4d7c4d] text-sm mb-1">
              <Shield className="w-4 h-4" />
              Circulating Cap
            </div>
            <div className="text-2xl font-bold text-[#00ff88]">
              ${reserveSummary.circulating_cap.toLocaleString('en-US', { minimumFractionDigits: 3, maximumFractionDigits: 3 })}
            </div>
          </div>

          <div className="bg-[#0d0d0d] border border-[#1a1a1a] rounded-lg p-4">
            <div className="flex items-center gap-2 text-[#4d7c4d] text-sm mb-1">
              <Lock className="w-4 h-4" />
              Pledged USD
            </div>
            <div className="text-2xl font-bold text-white">
              ${reserveSummary.pledged_usd.toLocaleString('en-US', { minimumFractionDigits: 3, maximumFractionDigits: 3 })}
            </div>
          </div>

          <div className="bg-[#0d0d0d] border border-[#1a1a1a] rounded-lg p-4">
            <div className="flex items-center gap-2 text-[#4d7c4d] text-sm mb-1">
              <Activity className="w-4 h-4" />
              Active Pledges
            </div>
            <div className="text-2xl font-bold text-white">
              {reserveSummary.pledge_count}
            </div>
          </div>

          <div className="bg-[#0d0d0d] border border-[#1a1a1a] rounded-lg p-4">
            <div className="flex items-center gap-2 text-[#4d7c4d] text-sm mb-1">
              <Zap className="w-4 h-4" />
              Total Reserves
            </div>
            <div className="text-2xl font-bold text-white">
              ${reserveSummary.total_reserves.toLocaleString('en-US', { minimumFractionDigits: 3, maximumFractionDigits: 3 })}
            </div>
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <button
          onClick={() => setShowPledgeModal(true)}
          className="bg-[#0d0d0d] border border-[#00ff88] rounded-lg p-6 hover:bg-[#00ff88]/10 transition-colors flex items-center gap-4"
        >
          <Lock className="w-8 h-8 text-[#00ff88]" />
          <div className="text-left">
            <div className="font-bold text-[#00ff88]">Create Pledge</div>
            <div className="text-sm text-[#4d7c4d]">Lock USD for VUSD cap</div>
          </div>
        </button>

        <button
          onClick={() => setShowPayoutModal(true)}
          className="bg-[#0d0d0d] border border-blue-500 rounded-lg p-6 hover:bg-blue-500/10 transition-colors flex items-center gap-4"
        >
          <Send className="w-8 h-8 text-blue-400" />
          <div className="text-left">
            <div className="font-bold text-blue-400">Create Payout</div>
            <div className="text-sm text-blue-300">VUSD → USD withdrawal</div>
          </div>
        </button>

        <button
          onClick={handleCreateAttestation}
          disabled={loading}
          className="bg-[#0d0d0d] border border-purple-500 rounded-lg p-6 hover:bg-purple-500/10 transition-colors flex items-center gap-4 disabled:opacity-50"
        >
          <FileText className="w-8 h-8 text-purple-400" />
          <div className="text-left">
            <div className="font-bold text-purple-400">New Attestation</div>
            <div className="text-sm text-purple-300">Sign reserves snapshot</div>
          </div>
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6 border-b border-[#1a1a1a] pb-2 overflow-x-auto">
        {['overview', 'pledges', 'payouts', 'attestations', 'events', 'api-keys'].map((view) => (
          <button
            key={view}
            onClick={() => setSelectedView(view as any)}
            className={`px-4 py-2 rounded-lg font-medium transition-colors whitespace-nowrap flex items-center gap-2 ${
              selectedView === view
                ? 'bg-[#00ff88] text-black'
                : 'text-[#4d7c4d] hover:text-[#00ff88]'
            }`}
          >
            {view === 'api-keys' && <Key className="w-4 h-4" />}
            {view === 'api-keys' ? 'API Keys' : view.charAt(0).toUpperCase() + view.slice(1)}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="bg-[#0d0d0d] border border-[#1a1a1a] rounded-lg p-6">
        {selectedView === 'overview' && reserveSummary && (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-bold text-[#00ff88] mb-4">Reserve Summary</h2>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-[#4d7c4d]">As of Date:</span>
                  <span className="text-white ml-2 font-mono">{reserveSummary.as_of_date}</span>
                </div>
                <div>
                  <span className="text-[#4d7c4d]">Active Payouts:</span>
                  <span className="text-white ml-2 font-bold">{reserveSummary.active_payouts}</span>
                </div>
                <div>
                  <span className="text-[#4d7c4d]">Unpledged USD:</span>
                  <span className="text-white ml-2 font-mono">${reserveSummary.unpledged_usd.toLocaleString('en-US', { minimumFractionDigits: 3, maximumFractionDigits: 3 })}</span>
                </div>
              </div>
            </div>

            {attestation && (
              <div>
                <h2 className="text-xl font-bold text-purple-400 mb-4">Latest Attestation</h2>
                <div className="bg-[#0a0a0a] border border-purple-500/30 rounded-lg p-4">
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <div className="text-[#4d7c4d] mb-1">Attestation ID</div>
                      <div className="text-purple-400 font-mono">{attestation.attestation_id}</div>
                    </div>
                    <div>
                      <div className="text-[#4d7c4d] mb-1">Document Hash</div>
                      <div className="text-white font-mono text-xs">{attestation.document_hash.substring(0, 32)}...</div>
                    </div>
                    <div>
                      <div className="text-[#4d7c4d] mb-1">Signing Key</div>
                      <div className="text-white font-mono">{attestation.signing_key_id}</div>
                    </div>
                    <div>
                      <div className="text-[#4d7c4d] mb-1">Created</div>
                      <div className="text-white">{new Date(attestation.created_at).toLocaleString()}</div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {selectedView === 'pledges' && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-[#00ff88]">Active Pledges</h2>
              <button
                onClick={loadData}
                className="px-4 py-2 bg-[#00ff88]/20 text-[#00ff88] rounded-lg hover:bg-[#00ff88]/30 flex items-center gap-2"
              >
                <RefreshCw className="w-4 h-4" />
                Refresh
              </button>
            </div>
            {pledges.length === 0 ? (
              <div className="text-center py-12 text-[#4d7c4d]">No active pledges</div>
            ) : (
              <div className="space-y-3">
                {pledges.map((pledge) => (
                  <div
                    key={pledge.id}
                    className="bg-[#0a0a0a] border border-[#00ff88]/30 rounded-lg p-4"
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-1 bg-[#00ff88]/20 text-[#00ff88] text-xs rounded">
                          {pledge.status}
                        </span>
                        <span className="text-white font-mono">{pledge.pledge_id}</span>
                      </div>
                      <Lock className="w-5 h-5 text-[#00ff88]" />
                    </div>
                    <div className="grid grid-cols-3 gap-4 text-sm mb-3">
                      <div>
                        <div className="text-[#4d7c4d]">Amount</div>
                        <div className="text-[#00ff88] font-bold">${pledge.amount.toLocaleString('en-US', { minimumFractionDigits: 3, maximumFractionDigits: 3 })} {pledge.currency}</div>
                      </div>
                      <div>
                        <div className="text-[#4d7c4d]">Available</div>
                        <div className="text-white font-bold">${pledge.available.toLocaleString('en-US', { minimumFractionDigits: 3, maximumFractionDigits: 3 })}</div>
                      </div>
                      <div>
                        <div className="text-[#4d7c4d]">Beneficiary</div>
                        <div className="text-white truncate">{pledge.beneficiary}</div>
                      </div>
                    </div>
                    {pledge.status === 'ACTIVE' && (
                      <div className="flex justify-end">
                        <button
                          onClick={() => handleDeletePledge(pledge)}
                          className="flex items-center gap-2 px-3 py-1.5 bg-red-600/20 hover:bg-red-600/30 border border-red-500/30 rounded text-sm text-red-400 transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                          Delete
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {selectedView === 'payouts' && (
          <div>
            <h2 className="text-xl font-bold text-blue-400 mb-4">Recent Payouts</h2>
            <div className="text-center py-12 text-[#4d7c4d]">
              Payout tracking coming soon...
            </div>
          </div>
        )}

        {selectedView === 'api-keys' && (
          <APIVUSD1KeysManager />
        )}
      </div>

      {/* Create Pledge Modal */}
      {showPledgeModal && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="bg-[#0d0d0d] border border-[#00ff88] rounded-lg max-w-xl w-full p-6 max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold text-[#00ff88] mb-4">Create New Pledge</h2>
            <form onSubmit={handleCreatePledge} className="space-y-4">

              {/* Custody Account Selector */}
              <div className="bg-[#0a0a0a] border-2 border-[#00ff88]/40 rounded-lg p-4">
                <label className="block text-[#00ff88] text-sm font-semibold mb-2 flex items-center gap-2">
                  <Database className="w-4 h-4" />
                  Select Custody Account *
                </label>
                {custodyAccounts.length === 0 ? (
                  <div className="bg-[#1a1a1a] border border-yellow-500/30 rounded p-3 text-center">
                    <AlertCircle className="w-6 h-6 text-yellow-500 mx-auto mb-2" />
                    <p className="text-yellow-400 text-sm font-semibold">No Custody Accounts Available</p>
                    <p className="text-[#4d7c4d] text-xs mt-1">
                      Create custody accounts first in the Custody Accounts module
                    </p>
                  </div>
                ) : (
                  <>
                    <select
                      value={selectedCustodyAccount}
                      onChange={(e) => {
                        const accountId = e.target.value;
                        setSelectedCustodyAccount(accountId);
                        const account = custodyAccounts.find(a => a.id === accountId);
                        if (account) {
                          setPledgeForm({
                            ...pledgeForm,
                            amount: account.availableBalance,
                            currency: account.currency
                          });
                        }
                      }}
                      className="w-full bg-[#0d0d0d] border-2 border-[#00ff88]/30 focus:border-[#00ff88] text-[#e0ffe0] px-4 py-3 rounded-lg outline-none transition-all text-sm"
                      required
                    >
                      <option value="">-- Select a custody account --</option>
                      {custodyAccounts.map((account) => (
                        <option key={account.id} value={account.id}>
                          {account.accountName} | {account.currency} ${account.availableBalance.toLocaleString()} available
                        </option>
                      ))}
                    </select>
                    {selectedCustodyAccount && (
                      <p className="text-green-400 text-xs mt-2 flex items-center gap-1">
                        <CheckCircle className="w-3 h-3" />
                        Account selected - Amount and currency auto-filled
                      </p>
                    )}
                  </>
                )}
              </div>

              <div>
                <label className="block text-[#4d7c4d] text-sm mb-2">Amount</label>
                <input
                  type="number"
                  step="0.01"
                  value={pledgeForm.amount}
                  onChange={(e) => setPledgeForm({ ...pledgeForm, amount: parseFloat(e.target.value) || 0 })}
                  className="w-full bg-[#0a0a0a] border border-[#1a1a1a] rounded px-4 py-2 text-white"
                  required
                  disabled={!selectedCustodyAccount}
                />
                {!selectedCustodyAccount && (
                  <p className="text-[#4d7c4d] text-xs mt-1">Select a custody account first</p>
                )}
              </div>

              <div>
                <label className="block text-[#4d7c4d] text-sm mb-2">Currency</label>
                <select
                  value={pledgeForm.currency}
                  onChange={(e) => setPledgeForm({ ...pledgeForm, currency: e.target.value })}
                  className="w-full bg-[#0a0a0a] border border-[#1a1a1a] rounded px-4 py-2 text-white"
                  disabled={!selectedCustodyAccount}
                >
                  <option value="USD">USD</option>
                  <option value="EUR">EUR</option>
                  <option value="GBP">GBP</option>
                </select>
                {!selectedCustodyAccount && (
                  <p className="text-[#4d7c4d] text-xs mt-1">Select a custody account first</p>
                )}
              </div>

              <div>
                <label className="block text-[#00ff88] text-sm font-semibold mb-2">Beneficiary</label>
                <input
                  type="text"
                  value={pledgeForm.beneficiary}
                  onChange={(e) => setPledgeForm({ ...pledgeForm, beneficiary: e.target.value })}
                  className="w-full bg-[#0a0a0a] border border-[#00ff88]/30 focus:border-[#00ff88] rounded px-4 py-2 text-white"
                  required
                />
                <p className="text-green-400 text-xs mt-1">Default: VUSD</p>
              </div>

              <div>
                <label className="block text-[#4d7c4d] text-sm mb-2">External Reference (Optional)</label>
                <input
                  type="text"
                  value={pledgeForm.external_ref}
                  onChange={(e) => setPledgeForm({ ...pledgeForm, external_ref: e.target.value })}
                  className="w-full bg-[#0a0a0a] border border-[#1a1a1a] rounded px-4 py-2 text-white"
                  placeholder="Optional reference ID"
                />
              </div>

              <div className="flex gap-3 pt-6 border-t border-[#00ff88]/20 mt-6">
                <button
                  type="button"
                  onClick={() => {
                    setShowPledgeModal(false);
                    setSelectedCustodyAccount('');
                    setPledgeForm({ amount: 0, currency: 'USD', beneficiary: 'VUSD', external_ref: '', expires_at: '' });
                  }}
                  className="flex-1 px-6 py-3 bg-[#1a1a1a] border border-[#00ff88]/30 hover:border-[#00ff88] text-[#00ff88] rounded-lg font-bold transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading || !selectedCustodyAccount}
                  className="flex-1 px-6 py-4 bg-gradient-to-r from-[#00ff88] to-[#00cc6a] hover:from-[#00cc6a] hover:to-[#00aa55] text-black rounded-lg font-bold text-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-[0_0_20px_rgba(0,255,136,0.5)] flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <>
                      <div className="w-5 h-5 border-2 border-black/30 border-t-black rounded-full animate-spin"></div>
                      Creating Pledge...
                    </>
                  ) : !selectedCustodyAccount ? (
                    <>
                      <AlertCircle className="w-5 h-5" />
                      Select Account First
                    </>
                  ) : (
                    <>
                      <Lock className="w-5 h-5" />
                      Create Pledge
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Create Payout Modal */}
      {showPayoutModal && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="bg-[#0d0d0d] border border-blue-500 rounded-lg max-w-md w-full p-6">
            <h2 className="text-xl font-bold text-blue-400 mb-4">Create Payout</h2>
            <form onSubmit={handleCreatePayout} className="space-y-4">
              <div>
                <label className="block text-[#4d7c4d] text-sm mb-2">Select Pledge</label>
                <select
                  value={payoutForm.pledge_id}
                  onChange={(e) => setPayoutForm({ ...payoutForm, pledge_id: e.target.value })}
                  className="w-full bg-[#0a0a0a] border border-[#1a1a1a] rounded px-4 py-2 text-white"
                  required
                >
                  <option value="">-- Select Pledge --</option>
                  {pledges.map((p) => (
                    <option key={p.id} value={p.pledge_id}>
                      {p.pledge_id} - ${p.available.toLocaleString('en-US', { minimumFractionDigits: 3, maximumFractionDigits: 3 })} available
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[#4d7c4d] text-sm mb-2">Amount</label>
                <input
                  type="number"
                  step="0.01"
                  value={payoutForm.amount}
                  onChange={(e) => setPayoutForm({ ...payoutForm, amount: parseFloat(e.target.value) || 0 })}
                  className="w-full bg-[#0a0a0a] border border-[#1a1a1a] rounded px-4 py-2 text-white"
                  required
                />
              </div>

              <div>
                <label className="block text-[#4d7c4d] text-sm mb-2">Destination Account</label>
                <input
                  type="text"
                  value={payoutForm.destination_account}
                  onChange={(e) => setPayoutForm({ ...payoutForm, destination_account: e.target.value })}
                  className="w-full bg-[#0a0a0a] border border-[#1a1a1a] rounded px-4 py-2 text-white"
                  required
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowPayoutModal(false);
                    setPayoutForm({ pledge_id: '', amount: 0, destination_account: '', external_ref: '' });
                  }}
                  className="flex-1 px-4 py-2 bg-[#1a1a1a] text-white rounded-lg hover:bg-[#2a2a2a]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 font-bold flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <>
                      <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                      Creating...
                    </>
                  ) : (
                    <>
                      <Send className="w-5 h-5" />
                      Create Payout
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
