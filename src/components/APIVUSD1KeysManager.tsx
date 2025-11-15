/**
 * API VUSD1 Keys Manager
 * Component for managing API keys for external integrations
 */

import { useState, useEffect } from 'react';
import {
  Key, Plus, Trash2, Eye, EyeOff, Copy, CheckCircle, AlertCircle,
  Settings, TrendingUp, Clock, Shield, RefreshCw, ExternalLink, DollarSign, Lock, Download, Database
} from 'lucide-react';
import { apiKeysStore, type ApiKey, type ApiKeyUsage } from '../lib/api-keys-store';
import { getSupabaseClient } from '../lib/supabase-client';
import { proofOfReservesAPI, type ProofOfReservesAPIKey } from '../lib/proof-of-reserves-api';
import { unifiedPledgeStore } from '../lib/unified-pledge-store';

interface Pledge {
  id: string;
  pledge_id: string;
  amount: string | number;
  available: string | number;
  currency: string;
  status: string;
  beneficiary: string;
  created_at: string;
}

export function APIVUSD1KeysManager() {
  const [keys, setKeys] = useState<ApiKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newKey, setNewKey] = useState<ApiKey | null>(null);
  const [showSecret, setShowSecret] = useState<Record<string, boolean>>({});
  const [selectedKeyUsage, setSelectedKeyUsage] = useState<{ keyId: string; usage: ApiKeyUsage } | null>(null);

  // Pledges
  const [pledges, setPledges] = useState<Pledge[]>([]);
  const [loadingData, setLoadingData] = useState(false);

  // Proof of Reserves API Keys
  const [porKeys, setPorKeys] = useState<ProofOfReservesAPIKey[]>([]);
  const [showPorModal, setShowPorModal] = useState(false);
  const [porKeyName, setPorKeyName] = useState('');
  const [selectedPledgeIds, setSelectedPledgeIds] = useState<string[]>([]);
  const [viewMode, setViewMode] = useState<'standard' | 'por'>('standard');

  // Form state
  const [keyName, setKeyName] = useState('');
  const [rateLimit, setRateLimit] = useState(60);
  const [selectedPledgeId, setSelectedPledgeId] = useState('');
  const [permissions, setPermissions] = useState({
    read_pledges: true,
    create_pledges: false,
    update_pledges: false,
    delete_pledges: false,
  });

  // All pledges available for selection
  const availablePledges = pledges;

  useEffect(() => {
    loadKeys();
    loadCustodyAccountsAndPledges();
    loadPorKeys();
  }, []);

  const loadPorKeys = () => {
    const keys = proofOfReservesAPI.getAllAPIKeys();
    setPorKeys(keys);
    console.log('[PoR Keys] Loaded', keys.length, 'API keys');
  };

  const loadKeys = async () => {
    try {
      setLoading(true);
      const data = await apiKeysStore.listKeys();
      setKeys(data);
    } catch (error) {
      console.error('Error loading keys:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadCustodyAccountsAndPledges = async () => {
    const supabase = getSupabaseClient();
    console.log('[APIVUSD1KeysManager] loadCustodyAccountsAndPledges called, supabase:', !!supabase);

    setLoadingData(true);
    console.log('[APIVUSD1KeysManager] Set loadingData to true');

    if (!supabase) {
      console.error('[APIVUSD1KeysManager] Supabase client not available!');
      setLoadingData(false);
      return;
    }

    try {
      // Get current user
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      console.log('[APIVUSD1KeysManager] User:', user?.id, 'Error:', userError);

      if (!user) {
        console.error('[APIVUSD1KeysManager] No user authenticated!');
        setPledges([]);
        return;
      }

      // Load pledges - only ACTIVE pledges (no custody accounts needed)
      console.log('[APIVUSD1KeysManager] Loading ACTIVE pledges from api_pledges table...');
      console.log('[APIVUSD1KeysManager] Query: SELECT * FROM api_pledges WHERE status = ACTIVE ORDER BY created_at DESC');

      const { data: pledgesData, error: pledgesError } = await supabase
        .from('api_pledges')
        .select('*')
        .eq('status', 'ACTIVE')
        .order('created_at', { ascending: false });

      console.log('[APIVUSD1KeysManager] Query completed!');
      console.log('[APIVUSD1KeysManager] - Data received:', pledgesData);
      console.log('[APIVUSD1KeysManager] - Error:', pledgesError);
      console.log('[APIVUSD1KeysManager] - Count:', pledgesData?.length || 0);

      if (pledgesError) {
        console.error('[APIVUSD1KeysManager] ❌ ERROR loading pledges:', pledgesError);
        console.error('[APIVUSD1KeysManager] Error details:', JSON.stringify(pledgesError, null, 2));
        setPledges([]);
      } else {
        console.log('[APIVUSD1KeysManager] ✅ SUCCESS - Loaded pledges:', pledgesData?.length || 0);
        console.log('[APIVUSD1KeysManager] Pledges data:', JSON.stringify(pledgesData, null, 2));
        console.log('[APIVUSD1KeysManager] Setting pledges state NOW...');
        setPledges(pledgesData || []);
        console.log('[APIVUSD1KeysManager] Pledges state updated!');
      }
    } catch (error) {
      console.error('[APIVUSD1KeysManager] ❌ Exception in loadCustodyAccountsAndPledges:', error);
      setPledges([]);
    } finally {
      console.log('[APIVUSD1KeysManager] Setting loadingData to false');
      setLoadingData(false);
      console.log('[APIVUSD1KeysManager] Function completed!');
    }
  };

  const handleCreateKey = async () => {
    try {
      const supabase = getSupabaseClient();
      if (!supabase) {
        alert('Supabase client not initialized');
        return;
      }

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        alert('You must be logged in to create API keys. Please log in and try again.');
        return;
      }

      // Get selected pledge data
      const pledge = selectedPledgeId
        ? pledges.find(p => p.id === selectedPledgeId)
        : undefined;

      const result = await apiKeysStore.createKey({
        name: keyName,
        permissions,
        rate_limit: rateLimit,
        pledge: pledge,
      });

      setNewKey(result.key);
      setShowCreateModal(false);
      await loadKeys();

      // Reset form
      setKeyName('');
      setRateLimit(60);
      setSelectedPledgeId('');
      setPermissions({
        read_pledges: true,
        create_pledges: false,
        update_pledges: false,
        delete_pledges: false,
      });
    } catch (error: any) {
      console.error('Error creating API key:', error);
      alert('Error creating API key: ' + error.message);
    }
  };

  const handleDeleteKey = async (keyId: string) => {
    if (!confirm('Are you sure you want to delete this API key? This action cannot be undone.')) {
      return;
    }

    try {
      await apiKeysStore.deleteKey(keyId);
      await loadKeys();
    } catch (error: any) {
      alert('Error deleting API key: ' + error.message);
    }
  };

  const handleRevokeKey = async (keyId: string) => {
    try {
      await apiKeysStore.updateKey(keyId, { status: 'revoked' });
      await loadKeys();
    } catch (error: any) {
      alert('Error revoking API key: ' + error.message);
    }
  };

  const handleViewUsage = async (keyId: string) => {
    try {
      const usage = await apiKeysStore.getKeyUsage(keyId);
      setSelectedKeyUsage({ keyId, usage });
    } catch (error: any) {
      alert('Error loading usage: ' + error.message);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    alert('Copied to clipboard!');
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'text-green-400 bg-green-400/10 border-green-400/30';
      case 'revoked': return 'text-red-400 bg-red-400/10 border-red-400/30';
      case 'expired': return 'text-yellow-400 bg-yellow-400/10 border-yellow-400/30';
      default: return 'text-gray-400 bg-gray-400/10 border-gray-400/30';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-[#0a0a0a] to-[#0d0d0d] rounded-xl border border-[#00ff88]/20 p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-2xl font-bold text-[#e0ffe0] flex items-center gap-3">
              <Key className="w-8 h-8 text-[#00ff88]" />
              API Keys Manager
            </h2>
            <p className="text-[#80ff80] mt-1">
              Manage API keys for external integrations with luxliqdaes.cloud
            </p>
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            className="bg-gradient-to-r from-[#00ff88] to-[#00cc6a] hover:from-[#00cc6a] hover:to-[#00aa55] text-black px-6 py-3 rounded-lg font-bold transition-all flex items-center gap-2 shadow-[0_0_20px_rgba(0,255,136,0.4)]"
          >
            <Plus className="w-5 h-5" />
            Create API Key
          </button>
        </div>

        {/* API Endpoint Info */}
        <div className="bg-[#0a0a0a] border border-[#1a1a1a] rounded-lg p-4">
          <div className="flex items-start gap-3">
            <ExternalLink className="w-5 h-5 text-[#00ff88] flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-[#e0ffe0] font-semibold mb-1">API Base URL</p>
              <code className="text-[#00ff88] bg-[#0d0d0d] px-3 py-1 rounded border border-[#00ff88]/30 text-sm">
                {import.meta.env.VITE_SUPABASE_URL}/functions/v1/vusd1-pledges-api
              </code>
              <p className="text-[#80ff80] text-sm mt-2">
                Use X-API-Key and X-API-Secret headers for authentication
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Keys List Container with Scroll */}
      <div className="max-h-[600px] overflow-y-auto pr-2 custom-scrollbar">
        {loading ? (
          <div className="text-center py-12">
            <RefreshCw className="w-8 h-8 text-[#00ff88] animate-spin mx-auto mb-3" />
            <p className="text-[#80ff80]">Loading API keys...</p>
          </div>
        ) : keys.length === 0 ? (
          <div className="bg-[#0d0d0d] border border-[#1a1a1a] rounded-xl p-12 text-center">
            <Key className="w-16 h-16 text-[#4d7c4d] mx-auto mb-4" />
            <h3 className="text-xl font-bold text-[#e0ffe0] mb-2">No API Keys</h3>
            <p className="text-[#80ff80] mb-6">
              Create your first API key to start integrating with external applications
            </p>
            <button
              onClick={() => setShowCreateModal(true)}
              className="bg-gradient-to-r from-[#00ff88] to-[#00cc6a] hover:from-[#00cc6a] hover:to-[#00aa55] text-black px-6 py-3 rounded-lg font-bold transition-all shadow-[0_0_20px_rgba(0,255,136,0.4)]"
            >
              Create First API Key
            </button>
          </div>
        ) : (
        <div className="space-y-4">
          {keys.map((key) => (
            <div
              key={key.id}
              className="bg-[#0d0d0d] border border-[#1a1a1a] rounded-xl p-6 hover:border-[#00ff88]/30 transition-all"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-xl font-bold text-[#e0ffe0]">{key.name}</h3>
                    <span className={`px-3 py-1 rounded-full text-xs font-bold border ${getStatusColor(key.status)}`}>
                      {key.status.toUpperCase()}
                    </span>
                  </div>
                  <div className="flex items-center gap-4 text-sm text-[#80ff80]">
                    <span className="flex items-center gap-1">
                      <Clock className="w-4 h-4" />
                      Created {new Date(key.created_at).toLocaleDateString()}
                    </span>
                    {key.last_used_at && (
                      <span className="flex items-center gap-1">
                        <CheckCircle className="w-4 h-4" />
                        Last used {new Date(key.last_used_at).toLocaleDateString()}
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleViewUsage(key.id)}
                    className="bg-[#1a1a1a] border border-[#00ff88]/30 hover:border-[#00ff88] text-[#00ff88] px-4 py-2 rounded-lg transition-all flex items-center gap-2"
                  >
                    <TrendingUp className="w-4 h-4" />
                    Usage
                  </button>
                  {key.status === 'active' && (
                    <button
                      onClick={() => handleRevokeKey(key.id)}
                      className="bg-[#1a1a1a] border border-yellow-400/30 hover:border-yellow-400 text-yellow-400 px-4 py-2 rounded-lg transition-all"
                    >
                      Revoke
                    </button>
                  )}
                  <button
                    onClick={() => handleDeleteKey(key.id)}
                    className="bg-[#1a1a1a] border border-red-400/30 hover:border-red-400 text-red-400 px-4 py-2 rounded-lg transition-all"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* API Key */}
              <div className="bg-[#0a0a0a] border border-[#1a1a1a] rounded-lg p-4 mb-3">
                <label className="text-[#80ff80] text-sm block mb-2">API Key</label>
                <div className="flex items-center gap-2">
                  <code className="flex-1 text-[#00ff88] bg-[#0d0d0d] px-3 py-2 rounded border border-[#00ff88]/30 font-mono text-sm">
                    {key.api_key}
                  </code>
                  <button
                    onClick={() => copyToClipboard(key.api_key)}
                    className="bg-[#1a1a1a] border border-[#00ff88]/30 hover:border-[#00ff88] text-[#00ff88] px-3 py-2 rounded transition-all"
                  >
                    <Copy className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Permissions */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3">
                {Object.entries(key.permissions).map(([perm, enabled]) => (
                  <div
                    key={perm}
                    className={`${
                      enabled
                        ? 'bg-[#00ff88]/10 border-[#00ff88]/30'
                        : 'bg-[#1a1a1a] border-[#333]'
                    } border rounded-lg p-3`}
                  >
                    <div className="flex items-center gap-2">
                      {enabled ? (
                        <CheckCircle className="w-4 h-4 text-[#00ff88]" />
                      ) : (
                        <AlertCircle className="w-4 h-4 text-[#666]" />
                      )}
                      <span className={`text-xs font-semibold ${enabled ? 'text-[#00ff88]' : 'text-[#666]'}`}>
                        {perm.replace(/_/g, ' ').toUpperCase()}
                      </span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Rate Limit */}
              <div className="flex items-center gap-2 text-sm text-[#80ff80]">
                <Shield className="w-4 h-4" />
                <span>Rate Limit: {key.rate_limit} requests/minute</span>
              </div>
            </div>
          ))}
        </div>
        )}
      </div>

      {/* Create Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#0d0d0d] border border-[#00ff88]/30 rounded-xl shadow-[0_0_30px_rgba(0,255,136,0.3)] p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <h3 className="text-2xl font-bold text-[#e0ffe0] mb-6 flex items-center gap-3">
              <Key className="w-6 h-6 text-[#00ff88]" />
              Create New API Key
            </h3>

            <div className="space-y-4">
              <div>
                <label className="text-[#80ff80] text-sm block mb-2">Key Name *</label>
                <input
                  type="text"
                  value={keyName}
                  onChange={(e) => setKeyName(e.target.value)}
                  className="w-full bg-[#0a0a0a] border border-[#1a1a1a] focus:border-[#00ff88] text-[#e0ffe0] px-4 py-3 rounded-lg outline-none transition-all"
                  placeholder="Production API Key"
                />
              </div>

              {/* Pledge Selector - MAIN FOCUS */}
              <div className="bg-[#0a0a0a] border-2 border-[#00ff88]/40 rounded-lg p-5 shadow-[0_0_20px_rgba(0,255,136,0.2)]">
                <div className="flex items-center justify-between mb-3">
                  <label className="text-[#00ff88] text-base font-semibold flex items-center gap-2">
                    <Lock className="w-5 h-5 text-[#00ff88]" />
                    Select Active Pledge *
                  </label>
                  <button
                    onClick={loadCustodyAccountsAndPledges}
                    disabled={loadingData}
                    className="flex items-center gap-2 px-3 py-1.5 bg-[#1a1a1a] border border-[#00ff88]/30 hover:border-[#00ff88] text-[#00ff88] rounded-lg text-sm transition-all disabled:opacity-50"
                  >
                    <RefreshCw className={`w-4 h-4 ${loadingData ? 'animate-spin' : ''}`} />
                    Refresh
                  </button>
                </div>
                {loadingData ? (
                  <div className="text-center py-6">
                    <RefreshCw className="w-6 h-6 text-[#00ff88] animate-spin mx-auto mb-2" />
                    <p className="text-[#80ff80]">Loading active pledges...</p>
                  </div>
                ) : availablePledges.length === 0 ? (
                  <div className="bg-[#1a1a1a] border-2 border-yellow-500/50 rounded-lg p-5 text-center">
                    <AlertCircle className="w-10 h-10 text-yellow-500 mx-auto mb-3" />
                    <p className="text-yellow-400 font-bold text-lg mb-2">No Active Pledges Available</p>
                    <p className="text-[#e0ffe0] text-sm mb-3">
                      You need to create pledges first in the <span className="text-[#00ff88] font-semibold">API VUSD1</span> module before you can associate them with API keys.
                    </p>
                    <div className="bg-[#0a0a0a] border border-blue-500/30 rounded p-3 mt-3">
                      <p className="text-blue-400 text-xs font-mono">
                        Debug: {pledges.length} pledges loaded | Status: {loadingData ? 'loading' : 'ready'}
                      </p>
                      <p className="text-[#4d7c4d] text-xs mt-1">Open browser console (F12) for detailed logs</p>
                    </div>
                  </div>
                ) : (
                  <>
                    <select
                      value={selectedPledgeId}
                      onChange={(e) => setSelectedPledgeId(e.target.value)}
                      className="w-full bg-[#0d0d0d] border-2 border-[#00ff88]/30 focus:border-[#00ff88] text-[#e0ffe0] px-4 py-4 rounded-lg outline-none transition-all text-base font-medium"
                    >
                      <option value="" className="bg-[#0d0d0d]">-- Choose a pledge from the list --</option>
                      {availablePledges.map((pledge) => (
                        <option key={pledge.id} value={pledge.id} className="bg-[#0d0d0d] py-2">
                          {pledge.pledge_id} | {pledge.currency} ${Number(pledge.amount).toLocaleString()} | {pledge.beneficiary}
                        </option>
                      ))}
                    </select>
                    <div className="mt-3 p-3 bg-green-900/20 border border-green-500/30 rounded">
                      <p className="text-green-400 font-semibold flex items-center gap-2">
                        <CheckCircle className="w-4 h-4" />
                        {availablePledges.length} Active Pledge{availablePledges.length !== 1 ? 's' : ''} Available
                      </p>
                      <p className="text-[#80ff80] text-xs mt-1">
                        Select the pledge you want to associate with this API key
                      </p>
                    </div>
                  </>
                )}
              </div>

              <div>
                <label className="text-[#80ff80] text-sm block mb-3">Permissions</label>
                <div className="grid grid-cols-2 gap-3">
                  {Object.entries(permissions).map(([perm, enabled]) => (
                    <label
                      key={perm}
                      className="flex items-center gap-3 bg-[#0a0a0a] border border-[#1a1a1a] rounded-lg p-3 cursor-pointer hover:border-[#00ff88]/30 transition-all"
                    >
                      <input
                        type="checkbox"
                        checked={enabled}
                        onChange={(e) => setPermissions({ ...permissions, [perm]: e.target.checked })}
                        className="w-5 h-5 accent-[#00ff88]"
                      />
                      <span className="text-[#e0ffe0] text-sm">
                        {perm.replace(/_/g, ' ').replace(/^\w/, c => c.toUpperCase())}
                      </span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="flex gap-3 pt-6 border-t border-[#00ff88]/20 mt-6">
                <button
                  onClick={handleCreateKey}
                  disabled={!keyName || !selectedPledgeId}
                  className="flex-1 bg-gradient-to-r from-[#00ff88] to-[#00cc6a] hover:from-[#00cc6a] hover:to-[#00aa55] text-black px-6 py-4 rounded-lg font-bold text-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-[0_0_20px_rgba(0,255,136,0.5)]"
                >
                  {!selectedPledgeId ? 'Select a Pledge First' : 'Create API Key'}
                </button>
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="px-6 py-4 bg-[#1a1a1a] border border-[#00ff88]/30 hover:border-[#00ff88] text-[#00ff88] rounded-lg font-bold transition-all"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* New Key Success Modal */}
      {newKey && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#0d0d0d] border border-[#00ff88] rounded-xl shadow-[0_0_30px_rgba(0,255,136,0.5)] p-6 max-w-2xl w-full">
            <div className="text-center mb-6">
              <CheckCircle className="w-16 h-16 text-[#00ff88] mx-auto mb-4" />
              <h3 className="text-2xl font-bold text-[#e0ffe0] mb-2">API Key Created Successfully!</h3>
              <p className="text-yellow-400 font-semibold">
                ⚠️ Save these credentials securely. The secret will not be shown again.
              </p>
            </div>

            <div className="space-y-4">
              <div className="bg-[#0a0a0a] border border-[#00ff88]/30 rounded-lg p-4">
                <label className="text-[#80ff80] text-sm block mb-2">API Key</label>
                <div className="flex items-center gap-2">
                  <code className="flex-1 text-[#00ff88] bg-[#0d0d0d] px-3 py-2 rounded border border-[#00ff88]/30 font-mono text-sm break-all">
                    {newKey.api_key}
                  </code>
                  <button
                    onClick={() => copyToClipboard(newKey.api_key)}
                    className="bg-[#1a1a1a] border border-[#00ff88] text-[#00ff88] px-3 py-2 rounded"
                  >
                    <Copy className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div className="bg-[#0a0a0a] border border-[#00ff88]/30 rounded-lg p-4">
                <label className="text-[#80ff80] text-sm block mb-2">API Secret (⚠️ Save Now)</label>
                <div className="flex items-center gap-2">
                  <code className="flex-1 text-[#00ff88] bg-[#0d0d0d] px-3 py-2 rounded border border-[#00ff88]/30 font-mono text-sm break-all">
                    {newKey.api_secret}
                  </code>
                  <button
                    onClick={() => copyToClipboard(newKey.api_secret!)}
                    className="bg-[#1a1a1a] border border-[#00ff88] text-[#00ff88] px-3 py-2 rounded"
                  >
                    <Copy className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div className="bg-yellow-400/10 border border-yellow-400/30 rounded-lg p-4">
                <p className="text-yellow-400 text-sm">
                  <strong>Important:</strong> Store the API secret in a secure location. You will not be able to view it again after closing this dialog.
                </p>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setNewKey(null)}
                  className="flex-1 bg-gradient-to-r from-[#00ff88] to-[#00cc6a] hover:from-[#00cc6a] hover:to-[#00aa55] text-black px-6 py-3 rounded-lg font-bold transition-all"
                >
                  I've Saved My Credentials
                </button>
                <button
                  onClick={async () => {
                    if (confirm('Are you sure you want to delete this API key? This action cannot be undone.')) {
                      await handleDeleteKey(newKey.id);
                      setNewKey(null);
                    }
                  }}
                  className="bg-[#1a1a1a] border border-red-400/30 hover:border-red-400 hover:bg-red-400/10 text-red-400 px-6 py-3 rounded-lg font-bold transition-all flex items-center gap-2"
                >
                  <Trash2 className="w-5 h-5" />
                  Delete
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Usage Modal */}
      {selectedKeyUsage && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#0d0d0d] border border-[#00ff88]/30 rounded-xl shadow-[0_0_30px_rgba(0,255,136,0.3)] p-6 max-w-3xl w-full max-h-[90vh] overflow-y-auto">
            <h3 className="text-2xl font-bold text-[#e0ffe0] mb-6 flex items-center gap-3">
              <TrendingUp className="w-6 h-6 text-[#00ff88]" />
              API Key Usage Statistics
            </h3>

            <div className="grid grid-cols-2 gap-4 mb-6">
              <div className="bg-[#0a0a0a] border border-[#1a1a1a] rounded-lg p-4">
                <p className="text-[#80ff80] text-sm mb-1">Total Requests</p>
                <p className="text-3xl font-bold text-[#e0ffe0]">
                  {selectedKeyUsage.usage.total_requests.toLocaleString()}
                </p>
              </div>
              <div className="bg-[#0a0a0a] border border-[#1a1a1a] rounded-lg p-4">
                <p className="text-[#80ff80] text-sm mb-1">Success Rate</p>
                <p className="text-3xl font-bold text-[#00ff88]">
                  {selectedKeyUsage.usage.success_rate.toFixed(1)}%
                </p>
              </div>
            </div>

            <div className="mb-6">
              <h4 className="text-lg font-bold text-[#e0ffe0] mb-3">Recent Requests</h4>
              <div className="space-y-2">
                {selectedKeyUsage.usage.recent_requests.map((req, i) => (
                  <div key={i} className="bg-[#0a0a0a] border border-[#1a1a1a] rounded-lg p-3 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className={`px-2 py-1 rounded text-xs font-bold ${
                        req.status_code < 400 ? 'bg-green-400/20 text-green-400' : 'bg-red-400/20 text-red-400'
                      }`}>
                        {req.status_code}
                      </span>
                      <span className="text-[#e0ffe0] font-mono text-sm">{req.method}</span>
                      <span className="text-[#80ff80] text-sm">{req.endpoint}</span>
                    </div>
                    <span className="text-[#80ff80] text-xs">
                      {new Date(req.created_at).toLocaleString()}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <button
              onClick={() => setSelectedKeyUsage(null)}
              className="w-full bg-[#1a1a1a] border border-[#00ff88]/30 hover:border-[#00ff88] text-[#00ff88] px-6 py-3 rounded-lg font-bold transition-all"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
