/**
 * Proof of Reserves Manager
 * Gestiona API Keys para lectura pública de reservas
 */

import { useState, useEffect } from 'react';
import {
  Database, Key, Download, Eye, Copy, CheckCircle, Plus, Trash2, RefreshCw, Shield, Lock, Globe
} from 'lucide-react';
import { proofOfReservesAPI, type ProofOfReservesAPIKey, type ProofOfReservesData } from '../lib/proof-of-reserves-api';
import { unifiedPledgeStore, type UnifiedPledge } from '../lib/unified-pledge-store';

export function ProofOfReservesManager() {
  const [apiKeys, setApiKeys] = useState<ProofOfReservesAPIKey[]>([]);
  const [activePledges, setActivePledges] = useState<UnifiedPledge[]>([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedPledgeIds, setSelectedPledgeIds] = useState<string[]>([]);
  const [keyName, setKeyName] = useState('');
  const [previewData, setPreviewData] = useState<ProofOfReservesData | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = () => {
    const keys = proofOfReservesAPI.getAllAPIKeys();
    setApiKeys(keys);

    const pledges = unifiedPledgeStore.getPledges().filter(p => p.status === 'ACTIVE');
    setActivePledges(pledges);

    console.log('[PoR Manager] Loaded:', keys.length, 'API keys,', pledges.length, 'active pledges');
  };

  const handleCreateAPIKey = () => {
    if (!keyName.trim()) {
      alert('Please enter a name for the API key');
      return;
    }

    if (selectedPledgeIds.length === 0) {
      alert('Please select at least one pledge');
      return;
    }

    const newKey = proofOfReservesAPI.generateAPIKey({
      name: keyName,
      pledge_ids: selectedPledgeIds,
      can_download_txt: true,
      can_view_balances: true,
      can_view_blockchain_data: true
    });

    alert(`✅ API Key Created!\n\nKey: ${newKey.key}\n\nSave this key securely. You won't see it again.`);

    setShowCreateModal(false);
    setKeyName('');
    setSelectedPledgeIds([]);
    loadData();
  };

  const handlePreview = (key: ProofOfReservesAPIKey) => {
    const data = proofOfReservesAPI.fetchProofOfReserves(key.key);
    setPreviewData(data);
  };

  const handleDownloadTXT = (key: ProofOfReservesAPIKey) => {
    proofOfReservesAPI.downloadTXT(key.key, `proof-of-reserves-${key.name.toLowerCase().replace(/\s+/g, '-')}.txt`);
  };

  const handleCopyKey = (key: string) => {
    navigator.clipboard.writeText(key);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const handleRevoke = (keyId: string) => {
    if (confirm('Are you sure you want to revoke this API key?')) {
      proofOfReservesAPI.revokeAPIKey(keyId);
      loadData();
    }
  };

  const togglePledgeSelection = (pledgeId: string) => {
    if (selectedPledgeIds.includes(pledgeId)) {
      setSelectedPledgeIds(selectedPledgeIds.filter(id => id !== pledgeId));
    } else {
      setSelectedPledgeIds([...selectedPledgeIds, pledgeId]);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900 text-white p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <Database className="w-8 h-8 text-blue-400" />
            <h1 className="text-3xl font-bold">Proof of Reserves API</h1>
          </div>
          <p className="text-gray-400">
            Manage API keys for public reserve attestation
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-6">
            <div className="flex items-center gap-3 mb-2">
              <Key className="w-5 h-5 text-blue-400" />
              <span className="text-gray-400 text-sm">Active API Keys</span>
            </div>
            <div className="text-3xl font-bold text-blue-400">
              {apiKeys.filter(k => k.status === 'active').length}
            </div>
          </div>

          <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-6">
            <div className="flex items-center gap-3 mb-2">
              <Lock className="w-5 h-5 text-green-400" />
              <span className="text-gray-400 text-sm">Active Pledges</span>
            </div>
            <div className="text-3xl font-bold text-green-400">
              {activePledges.length}
            </div>
          </div>

          <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-6">
            <div className="flex items-center gap-3 mb-2">
              <Globe className="w-5 h-5 text-purple-400" />
              <span className="text-gray-400 text-sm">Total Usage</span>
            </div>
            <div className="text-3xl font-bold text-purple-400">
              {apiKeys.reduce((sum, k) => sum + k.usage_count, 0)}
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-3 mb-6">
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
          >
            <Plus className="w-4 h-4" />
            Create API Key
          </button>
          <button
            onClick={loadData}
            className="flex items-center gap-2 px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            Refresh
          </button>
        </div>

        {/* API Keys List */}
        <div className="bg-gray-800/50 border border-gray-700 rounded-lg overflow-hidden">
          <div className="p-6 border-b border-gray-700">
            <h2 className="text-xl font-bold flex items-center gap-2">
              <Shield className="w-5 h-5 text-blue-400" />
              API Keys
            </h2>
          </div>

          <div className="divide-y divide-gray-700">
            {apiKeys.length === 0 ? (
              <div className="p-12 text-center text-gray-500">
                No API keys created yet
              </div>
            ) : (
              apiKeys.map((key) => (
                <div key={key.id} className="p-6 hover:bg-gray-800/30 transition-colors">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-lg font-semibold">{key.name}</h3>
                        <span className={`px-2 py-1 rounded text-xs font-medium ${
                          key.status === 'active'
                            ? 'bg-green-900/30 text-green-400 border border-green-500/30'
                            : 'bg-red-900/30 text-red-400 border border-red-500/30'
                        }`}>
                          {key.status}
                        </span>
                      </div>

                      <div className="space-y-2 text-sm">
                        <div className="flex items-center gap-2">
                          <span className="text-gray-400">API Key:</span>
                          <code className="bg-gray-900 px-2 py-1 rounded font-mono text-xs">
                            {key.key.substring(0, 20)}...
                          </code>
                          <button
                            onClick={() => handleCopyKey(key.key)}
                            className="p-1 hover:bg-gray-700 rounded transition-colors"
                            title="Copy API key"
                          >
                            {copiedKey === key.key ? (
                              <CheckCircle className="w-4 h-4 text-green-400" />
                            ) : (
                              <Copy className="w-4 h-4 text-gray-400" />
                            )}
                          </button>
                        </div>

                        <div className="flex items-center gap-4 text-gray-400">
                          <span>Pledges: {key.pledge_ids.length}</span>
                          <span>Usage: {key.usage_count}</span>
                          <span>Created: {new Date(key.created_at).toLocaleDateString()}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handlePreview(key)}
                        className="p-2 bg-blue-600/20 hover:bg-blue-600/30 border border-blue-500/30 rounded-lg transition-colors"
                        title="Preview data"
                      >
                        <Eye className="w-4 h-4 text-blue-400" />
                      </button>
                      <button
                        onClick={() => handleDownloadTXT(key)}
                        className="p-2 bg-green-600/20 hover:bg-green-600/30 border border-green-500/30 rounded-lg transition-colors"
                        title="Download TXT"
                      >
                        <Download className="w-4 h-4 text-green-400" />
                      </button>
                      <button
                        onClick={() => handleRevoke(key.id)}
                        className="p-2 bg-red-600/20 hover:bg-red-600/30 border border-red-500/30 rounded-lg transition-colors"
                        title="Revoke key"
                      >
                        <Trash2 className="w-4 h-4 text-red-400" />
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Preview Modal */}
        {previewData && (
          <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
            <div className="bg-gray-900 border border-gray-700 rounded-lg max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
              <div className="p-6 border-b border-gray-700 flex items-center justify-between">
                <h3 className="text-xl font-bold">Proof of Reserves Data</h3>
                <button
                  onClick={() => setPreviewData(null)}
                  className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors"
                >
                  Close
                </button>
              </div>

              <div className="p-6 overflow-y-auto flex-1">
                <div className="space-y-6">
                  {/* Summary */}
                  <div>
                    <h4 className="text-lg font-semibold text-blue-400 mb-3">Summary</h4>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div className="bg-gray-800 p-4 rounded-lg">
                        <div className="text-gray-400 text-sm mb-1">Active Pledges</div>
                        <div className="text-2xl font-bold">{previewData.totals.active_pledges}</div>
                      </div>
                      <div className="bg-gray-800 p-4 rounded-lg">
                        <div className="text-gray-400 text-sm mb-1">USD</div>
                        <div className="text-2xl font-bold text-green-400">
                          ${previewData.totals.total_pledged_usd.toLocaleString()}
                        </div>
                      </div>
                      <div className="bg-gray-800 p-4 rounded-lg">
                        <div className="text-gray-400 text-sm mb-1">EUR</div>
                        <div className="text-2xl font-bold text-blue-400">
                          €{previewData.totals.total_pledged_eur.toLocaleString()}
                        </div>
                      </div>
                      <div className="bg-gray-800 p-4 rounded-lg">
                        <div className="text-gray-400 text-sm mb-1">GBP</div>
                        <div className="text-2xl font-bold text-purple-400">
                          £{previewData.totals.total_pledged_gbp.toLocaleString()}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Pledges */}
                  <div>
                    <h4 className="text-lg font-semibold text-blue-400 mb-3">Pledges Detail</h4>
                    <div className="space-y-3">
                      {previewData.pledges.map((pledge, index) => (
                        <div key={index} className="bg-gray-800 border border-gray-700 rounded-lg p-4">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                              <div className="text-xs text-gray-400 mb-2">CUSTODY ACCOUNT</div>
                              <div className="space-y-1 text-sm">
                                <div><span className="text-gray-400">Name:</span> <span className="font-semibold">{pledge.account_name}</span></div>
                                <div><span className="text-gray-400">Number:</span> <span className="font-mono">{pledge.account_number}</span></div>
                                <div><span className="text-gray-400">Institution:</span> {pledge.institution}</div>
                                <div><span className="text-gray-400">Money Type:</span> <span className="text-blue-400 font-semibold">{pledge.money_type}</span></div>
                              </div>
                            </div>
                            <div>
                              <div className="text-xs text-gray-400 mb-2">PLEDGE INFO</div>
                              <div className="space-y-1 text-sm">
                                <div><span className="text-gray-400">Amount:</span> <span className="text-green-400 font-bold text-lg">{pledge.currency} {pledge.amount.toLocaleString()}</span></div>
                                <div><span className="text-gray-400">Beneficiary:</span> {pledge.beneficiary}</div>
                                <div><span className="text-gray-400">Status:</span> <span className="text-green-400">{pledge.status}</span></div>
                              </div>
                            </div>
                            {pledge.blockchain_network && (
                              <div className="md:col-span-2 pt-3 border-t border-gray-700">
                                <div className="text-xs text-gray-400 mb-2">BLOCKCHAIN DATA</div>
                                <div className="grid grid-cols-2 gap-4 text-sm">
                                  <div><span className="text-gray-400">Network:</span> {pledge.blockchain_network}</div>
                                  <div><span className="text-gray-400">Token:</span> {pledge.token_symbol}</div>
                                  <div className="col-span-2"><span className="text-gray-400">Contract:</span> <code className="text-xs bg-gray-900 px-2 py-1 rounded">{pledge.contract_address}</code></div>
                                  <div><span className="text-gray-400">Anchored Coins:</span> <span className="text-blue-400 font-semibold">{pledge.anchored_coins?.toLocaleString()}</span></div>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Verification */}
                  <div>
                    <h4 className="text-lg font-semibold text-blue-400 mb-3">Verification</h4>
                    <div className="bg-gray-800 p-4 rounded-lg">
                      <div className="text-gray-400 text-sm mb-2">Verification Hash</div>
                      <code className="bg-gray-900 px-3 py-2 rounded font-mono text-xs block break-all">
                        {previewData.verification_hash}
                      </code>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Create Modal */}
        {showCreateModal && (
          <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
            <div className="bg-gray-900 border border-gray-700 rounded-lg max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col">
              <div className="p-6 border-b border-gray-700">
                <h3 className="text-xl font-bold">Create Proof of Reserves API Key</h3>
              </div>

              <div className="p-6 overflow-y-auto flex-1">
                <div className="space-y-6">
                  <div>
                    <label className="block text-sm font-medium mb-2">API Key Name</label>
                    <input
                      type="text"
                      value={keyName}
                      onChange={(e) => setKeyName(e.target.value)}
                      className="w-full bg-gray-800 border border-gray-600 rounded-lg px-4 py-2"
                      placeholder="e.g., Public Reserves API"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">
                      Select Pledges ({selectedPledgeIds.length} selected)
                    </label>
                    <div className="max-h-64 overflow-y-auto space-y-2 border border-gray-700 rounded-lg p-3">
                      {activePledges.length === 0 ? (
                        <div className="text-center py-8 text-gray-500">
                          No active pledges available
                        </div>
                      ) : (
                        activePledges.map((pledge) => (
                          <label
                            key={pledge.id}
                            className="flex items-center gap-3 p-3 bg-gray-800 hover:bg-gray-700 rounded-lg cursor-pointer transition-colors"
                          >
                            <input
                              type="checkbox"
                              checked={selectedPledgeIds.includes(pledge.id)}
                              onChange={() => togglePledgeSelection(pledge.id)}
                              className="w-4 h-4"
                            />
                            <div className="flex-1">
                              <div className="font-semibold">{pledge.account_name}</div>
                              <div className="text-sm text-gray-400">
                                {pledge.currency} {pledge.amount.toLocaleString()} - {pledge.beneficiary}
                              </div>
                            </div>
                          </label>
                        ))
                      )}
                    </div>
                  </div>
                </div>
              </div>

              <div className="p-6 border-t border-gray-700 flex items-center gap-3">
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="flex-1 px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreateAPIKey}
                  disabled={!keyName.trim() || selectedPledgeIds.length === 0}
                  className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition-colors"
                >
                  Create API Key
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
