// ═══════════════════════════════════════════════════════════════════════════════
// DCB TREASURY - API KEYS MANAGER COMPONENT
// Gestión de API Keys y Webhooks para DCB Treasury Certification Platform
// Conecta con https://luxliqdaes.cloud en producción
// ═══════════════════════════════════════════════════════════════════════════════

import React, { useState, useEffect, useCallback } from 'react';
import {
  Key, Shield, RefreshCw, Copy, Eye, EyeOff, Trash2, Plus,
  CheckCircle, XCircle, Globe, Server, Bell, Settings,
  Clock, Activity, AlertTriangle, ExternalLink, Loader2
} from 'lucide-react';
import { dcbApiClient, type ApiKey, type WebhookEndpoint, type WebhookEvent } from '../lib/dcb-api-client';
import { CONFIG, API_CONFIG } from '../lib/api-config';

// ═══════════════════════════════════════════════════════════════════════════════
// COLORS
// ═══════════════════════════════════════════════════════════════════════════════

const COLORS = {
  bg: '#050505',
  surface: '#0A0A0A',
  card: '#0D0D0D',
  border: '#1A1A1A',
  borderHover: '#252525',
  primary: '#00D4AA',
  primaryDark: '#00A080',
  accent: '#FFD700',
  text: '#FFFFFF',
  textSecondary: '#B0B0B0',
  textMuted: '#666666',
  success: '#00D4AA',
  warning: '#FFD700',
  error: '#FF4444',
  info: '#3B82F6'
};

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════

interface APIKeysManagerProps {
  onClose?: () => void;
}

export const APIKeysManager: React.FC<APIKeysManagerProps> = ({ onClose }) => {
  const [activeTab, setActiveTab] = useState<'keys' | 'webhooks' | 'events' | 'config'>('keys');
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([]);
  const [webhooks, setWebhooks] = useState<WebhookEndpoint[]>([]);
  const [webhookEvents, setWebhookEvents] = useState<WebhookEvent[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [apiStatus, setApiStatus] = useState({ dcb: false, lemx: false });
  
  // Form states
  const [newKeyName, setNewKeyName] = useState('');
  const [newKeyPermissions, setNewKeyPermissions] = useState<string[]>(['read']);
  const [newWebhookUrl, setNewWebhookUrl] = useState('');
  const [newWebhookName, setNewWebhookName] = useState('');
  const [newWebhookEvents, setNewWebhookEvents] = useState<string[]>(['lock.created', 'mint.completed']);
  
  // UI states
  const [showSecrets, setShowSecrets] = useState<Record<string, boolean>>({});
  const [copiedText, setCopiedText] = useState<string | null>(null);
  const [createdKey, setCreatedKey] = useState<ApiKey | null>(null);

  // ═══════════════════════════════════════════════════════════════════════════════
  // DATA FETCHING
  // ═══════════════════════════════════════════════════════════════════════════════

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [health, keysResult, webhooksResult, eventsResult] = await Promise.all([
        dcbApiClient.checkHealth(),
        dcbApiClient.getApiKeys(),
        dcbApiClient.getRegisteredWebhooks(),
        dcbApiClient.getWebhookEvents(50)
      ]);

      setApiStatus(health);
      if (keysResult.success && keysResult.data) setApiKeys(keysResult.data);
      if (webhooksResult.success && webhooksResult.data) setWebhooks(webhooksResult.data);
      if (eventsResult.success && eventsResult.data) setWebhookEvents(eventsResult.data);
    } catch (error) {
      console.error('Error fetching data:', error);
    }
    setIsLoading(false);
  }, []);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 15000);
    return () => clearInterval(interval);
  }, [fetchData]);

  // ═══════════════════════════════════════════════════════════════════════════════
  // HANDLERS
  // ═══════════════════════════════════════════════════════════════════════════════

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedText(text);
    setTimeout(() => setCopiedText(null), 2000);
  };

  const createApiKey = async () => {
    if (!newKeyName.trim()) return;
    
    setIsLoading(true);
    const result = await dcbApiClient.createApiKey(newKeyName, newKeyPermissions);
    if (result.success && result.data) {
      setCreatedKey(result.data);
      setNewKeyName('');
      setNewKeyPermissions(['read']);
      await fetchData();
    }
    setIsLoading(false);
  };

  const revokeApiKey = async (keyId: string) => {
    if (!confirm('Are you sure you want to revoke this API key?')) return;
    
    setIsLoading(true);
    await dcbApiClient.revokeApiKey(keyId);
    await fetchData();
    setIsLoading(false);
  };

  const rotateApiKey = async (keyId: string) => {
    if (!confirm('Are you sure you want to rotate this API key? The old key will stop working immediately.')) return;
    
    setIsLoading(true);
    const result = await dcbApiClient.rotateApiKey(keyId);
    if (result.success && result.data) {
      setCreatedKey(result.data);
    }
    await fetchData();
    setIsLoading(false);
  };

  const registerWebhook = async () => {
    if (!newWebhookUrl.trim()) return;
    
    setIsLoading(true);
    await dcbApiClient.registerWebhook(newWebhookUrl, newWebhookEvents, newWebhookName);
    setNewWebhookUrl('');
    setNewWebhookName('');
    await fetchData();
    setIsLoading(false);
  };

  const deleteWebhook = async (webhookId: string) => {
    if (!confirm('Are you sure you want to delete this webhook?')) return;
    
    setIsLoading(true);
    await dcbApiClient.deleteWebhook(webhookId);
    await fetchData();
    setIsLoading(false);
  };

  const testWebhook = async (webhookId: string) => {
    setIsLoading(true);
    const result = await dcbApiClient.testWebhook(webhookId);
    if (result.success) {
      alert('Test webhook sent successfully!');
    } else {
      alert('Failed to send test webhook: ' + result.error);
    }
    setIsLoading(false);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  // ═══════════════════════════════════════════════════════════════════════════════
  // RENDER
  // ═══════════════════════════════════════════════════════════════════════════════

  return (
    <div style={{
      minHeight: '100vh',
      background: `linear-gradient(180deg, ${COLORS.bg} 0%, #0A0A0A 100%)`,
      color: COLORS.text,
      padding: '24px'
    }}>
      {/* Header */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '24px',
        padding: '20px',
        background: COLORS.card,
        borderRadius: '16px',
        border: `1px solid ${COLORS.border}`
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{
            width: '48px',
            height: '48px',
            borderRadius: '12px',
            background: `linear-gradient(135deg, ${COLORS.primary}20, ${COLORS.primary}10)`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <Key size={24} color={COLORS.primary} />
          </div>
          <div>
            <h1 style={{ fontSize: '24px', fontWeight: 700, margin: 0 }}>
              API Keys & Webhooks
            </h1>
            <p style={{ fontSize: '14px', color: COLORS.textSecondary, margin: 0 }}>
              DCB Treasury Certification Platform
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          {/* Environment Badge */}
          <div style={{
            padding: '8px 16px',
            background: CONFIG.IS_PRODUCTION ? COLORS.success + '20' : COLORS.warning + '20',
            border: `1px solid ${CONFIG.IS_PRODUCTION ? COLORS.success : COLORS.warning}40`,
            borderRadius: '8px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            <Globe size={16} color={CONFIG.IS_PRODUCTION ? COLORS.success : COLORS.warning} />
            <span style={{ 
              fontSize: '12px', 
              fontWeight: 600,
              color: CONFIG.IS_PRODUCTION ? COLORS.success : COLORS.warning
            }}>
              {CONFIG.IS_PRODUCTION ? 'PRODUCTION' : 'DEVELOPMENT'}
            </span>
          </div>

          <button
            onClick={fetchData}
            disabled={isLoading}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '10px 20px',
              background: COLORS.surface,
              border: `1px solid ${COLORS.border}`,
              borderRadius: '8px',
              color: COLORS.text,
              fontSize: '14px',
              cursor: 'pointer'
            }}
          >
            <RefreshCw size={16} style={{ animation: isLoading ? 'spin 1s linear infinite' : 'none' }} />
            Refresh
          </button>
        </div>
      </div>

      {/* Status Cards */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(4, 1fr)',
        gap: '16px',
        marginBottom: '24px'
      }}>
        <div style={{
          padding: '20px',
          background: COLORS.card,
          borderRadius: '12px',
          border: `1px solid ${apiStatus.dcb ? COLORS.success + '40' : COLORS.error + '40'}`
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
            {apiStatus.dcb ? <CheckCircle size={20} color={COLORS.success} /> : <XCircle size={20} color={COLORS.error} />}
            <span style={{ fontSize: '14px', color: COLORS.textSecondary }}>DCB API</span>
          </div>
          <p style={{ fontSize: '20px', fontWeight: 700, margin: 0 }}>
            {apiStatus.dcb ? 'Connected' : 'Disconnected'}
          </p>
        </div>

        <div style={{
          padding: '20px',
          background: COLORS.card,
          borderRadius: '12px',
          border: `1px solid ${apiStatus.lemx ? COLORS.success + '40' : COLORS.error + '40'}`
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
            {apiStatus.lemx ? <CheckCircle size={20} color={COLORS.success} /> : <XCircle size={20} color={COLORS.error} />}
            <span style={{ fontSize: '14px', color: COLORS.textSecondary }}>LEMX API</span>
          </div>
          <p style={{ fontSize: '20px', fontWeight: 700, margin: 0 }}>
            {apiStatus.lemx ? 'Connected' : 'Disconnected'}
          </p>
        </div>

        <div style={{
          padding: '20px',
          background: COLORS.card,
          borderRadius: '12px',
          border: `1px solid ${COLORS.border}`
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
            <Key size={20} color={COLORS.primary} />
            <span style={{ fontSize: '14px', color: COLORS.textSecondary }}>API Keys</span>
          </div>
          <p style={{ fontSize: '20px', fontWeight: 700, margin: 0 }}>
            {apiKeys.filter(k => k.active).length}
          </p>
        </div>

        <div style={{
          padding: '20px',
          background: COLORS.card,
          borderRadius: '12px',
          border: `1px solid ${COLORS.border}`
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
            <Bell size={20} color={COLORS.accent} />
            <span style={{ fontSize: '14px', color: COLORS.textSecondary }}>Webhooks</span>
          </div>
          <p style={{ fontSize: '20px', fontWeight: 700, margin: 0 }}>
            {webhooks.filter(w => w.active).length}
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div style={{
        display: 'flex',
        gap: '8px',
        marginBottom: '24px',
        padding: '4px',
        background: COLORS.surface,
        borderRadius: '12px',
        width: 'fit-content'
      }}>
        {[
          { id: 'keys', label: 'API Keys', icon: Key },
          { id: 'webhooks', label: 'Webhooks', icon: Bell },
          { id: 'events', label: 'Events', icon: Activity },
          { id: 'config', label: 'Configuration', icon: Settings }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '10px 20px',
              background: activeTab === tab.id ? COLORS.primary : 'transparent',
              border: 'none',
              borderRadius: '8px',
              color: activeTab === tab.id ? COLORS.bg : COLORS.textSecondary,
              fontSize: '14px',
              fontWeight: 600,
              cursor: 'pointer'
            }}
          >
            <tab.icon size={16} />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div style={{
        background: COLORS.card,
        borderRadius: '16px',
        border: `1px solid ${COLORS.border}`,
        padding: '24px',
        minHeight: '400px'
      }}>
        {/* API Keys Tab */}
        {activeTab === 'keys' && (
          <div>
            {/* Create New Key Form */}
            <div style={{
              padding: '20px',
              background: COLORS.surface,
              borderRadius: '12px',
              marginBottom: '24px'
            }}>
              <h3 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '16px' }}>
                Create New API Key
              </h3>
              <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-end' }}>
                <div style={{ flex: 1 }}>
                  <label style={{ fontSize: '12px', color: COLORS.textMuted, display: 'block', marginBottom: '4px' }}>
                    Key Name
                  </label>
                  <input
                    type="text"
                    value={newKeyName}
                    onChange={(e) => setNewKeyName(e.target.value)}
                    placeholder="e.g., Production API Key"
                    style={{
                      width: '100%',
                      padding: '12px',
                      background: COLORS.bg,
                      border: `1px solid ${COLORS.border}`,
                      borderRadius: '8px',
                      color: COLORS.text,
                      fontSize: '14px'
                    }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '12px', color: COLORS.textMuted, display: 'block', marginBottom: '4px' }}>
                    Permissions
                  </label>
                  <select
                    value={newKeyPermissions[0]}
                    onChange={(e) => setNewKeyPermissions([e.target.value])}
                    style={{
                      padding: '12px',
                      background: COLORS.bg,
                      border: `1px solid ${COLORS.border}`,
                      borderRadius: '8px',
                      color: COLORS.text,
                      fontSize: '14px'
                    }}
                  >
                    <option value="read">Read Only</option>
                    <option value="write">Read & Write</option>
                    <option value="admin">Full Access</option>
                  </select>
                </div>
                <button
                  onClick={createApiKey}
                  disabled={!newKeyName.trim() || isLoading}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '12px 24px',
                    background: COLORS.primary,
                    border: 'none',
                    borderRadius: '8px',
                    color: COLORS.bg,
                    fontSize: '14px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    opacity: !newKeyName.trim() ? 0.5 : 1
                  }}
                >
                  <Plus size={16} />
                  Create Key
                </button>
              </div>
            </div>

            {/* Created Key Alert */}
            {createdKey && (
              <div style={{
                padding: '20px',
                background: COLORS.success + '10',
                borderRadius: '12px',
                border: `1px solid ${COLORS.success}40`,
                marginBottom: '24px'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                  <CheckCircle size={20} color={COLORS.success} />
                  <h4 style={{ margin: 0, color: COLORS.success }}>API Key Created - Save These Credentials!</h4>
                </div>
                <div style={{ display: 'grid', gap: '12px' }}>
                  <div>
                    <label style={{ fontSize: '12px', color: COLORS.textMuted }}>API Key</label>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <code style={{
                        flex: 1,
                        padding: '12px',
                        background: COLORS.bg,
                        borderRadius: '6px',
                        fontSize: '13px',
                        fontFamily: 'monospace'
                      }}>
                        {createdKey.key}
                      </code>
                      <button
                        onClick={() => copyToClipboard(createdKey.key)}
                        style={{ padding: '12px', background: COLORS.primary, border: 'none', borderRadius: '6px', cursor: 'pointer' }}
                      >
                        <Copy size={16} color={COLORS.bg} />
                      </button>
                    </div>
                  </div>
                  {createdKey.secret && (
                    <div>
                      <label style={{ fontSize: '12px', color: COLORS.textMuted }}>API Secret</label>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <code style={{
                          flex: 1,
                          padding: '12px',
                          background: COLORS.bg,
                          borderRadius: '6px',
                          fontSize: '13px',
                          fontFamily: 'monospace'
                        }}>
                          {createdKey.secret}
                        </code>
                        <button
                          onClick={() => copyToClipboard(createdKey.secret!)}
                          style={{ padding: '12px', background: COLORS.primary, border: 'none', borderRadius: '6px', cursor: 'pointer' }}
                        >
                          <Copy size={16} color={COLORS.bg} />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
                <button
                  onClick={() => setCreatedKey(null)}
                  style={{
                    marginTop: '12px',
                    padding: '8px 16px',
                    background: 'transparent',
                    border: `1px solid ${COLORS.success}`,
                    borderRadius: '6px',
                    color: COLORS.success,
                    cursor: 'pointer'
                  }}
                >
                  I've saved these credentials
                </button>
              </div>
            )}

            {/* Keys List */}
            <h3 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '16px' }}>
              Active API Keys ({apiKeys.length})
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {apiKeys.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px', color: COLORS.textMuted }}>
                  <Key size={48} style={{ opacity: 0.3, marginBottom: '16px' }} />
                  <p>No API keys created yet</p>
                </div>
              ) : (
                apiKeys.map(key => (
                  <div
                    key={key.id}
                    style={{
                      padding: '16px',
                      background: COLORS.surface,
                      borderRadius: '12px',
                      border: `1px solid ${key.active ? COLORS.border : COLORS.error + '40'}`
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                          <span style={{ fontWeight: 600 }}>{key.name}</span>
                          <span style={{
                            padding: '4px 8px',
                            background: key.active ? COLORS.success + '20' : COLORS.error + '20',
                            color: key.active ? COLORS.success : COLORS.error,
                            borderRadius: '4px',
                            fontSize: '11px',
                            fontWeight: 600
                          }}>
                            {key.active ? 'ACTIVE' : 'REVOKED'}
                          </span>
                          <span style={{
                            padding: '4px 8px',
                            background: COLORS.info + '20',
                            color: COLORS.info,
                            borderRadius: '4px',
                            fontSize: '11px'
                          }}>
                            {key.permissions?.join(', ') || 'read'}
                          </span>
                        </div>
                        <code style={{ fontSize: '12px', color: COLORS.textMuted }}>{key.key}</code>
                        <div style={{ fontSize: '11px', color: COLORS.textMuted, marginTop: '4px' }}>
                          Created: {formatDate(key.createdAt)}
                          {key.lastUsed && ` • Last used: ${formatDate(key.lastUsed)}`}
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <button
                          onClick={() => rotateApiKey(key.id)}
                          style={{
                            padding: '8px 12px',
                            background: COLORS.warning + '20',
                            border: 'none',
                            borderRadius: '6px',
                            color: COLORS.warning,
                            cursor: 'pointer',
                            fontSize: '12px'
                          }}
                        >
                          <RefreshCw size={14} />
                        </button>
                        <button
                          onClick={() => revokeApiKey(key.id)}
                          style={{
                            padding: '8px 12px',
                            background: COLORS.error + '20',
                            border: 'none',
                            borderRadius: '6px',
                            color: COLORS.error,
                            cursor: 'pointer',
                            fontSize: '12px'
                          }}
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* Webhooks Tab */}
        {activeTab === 'webhooks' && (
          <div>
            {/* Register Webhook Form */}
            <div style={{
              padding: '20px',
              background: COLORS.surface,
              borderRadius: '12px',
              marginBottom: '24px'
            }}>
              <h3 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '16px' }}>
                Register New Webhook
              </h3>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr auto', gap: '12px', alignItems: 'flex-end' }}>
                <div>
                  <label style={{ fontSize: '12px', color: COLORS.textMuted, display: 'block', marginBottom: '4px' }}>
                    Webhook URL
                  </label>
                  <input
                    type="url"
                    value={newWebhookUrl}
                    onChange={(e) => setNewWebhookUrl(e.target.value)}
                    placeholder="https://your-server.com/webhook"
                    style={{
                      width: '100%',
                      padding: '12px',
                      background: COLORS.bg,
                      border: `1px solid ${COLORS.border}`,
                      borderRadius: '8px',
                      color: COLORS.text,
                      fontSize: '14px'
                    }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '12px', color: COLORS.textMuted, display: 'block', marginBottom: '4px' }}>
                    Name (optional)
                  </label>
                  <input
                    type="text"
                    value={newWebhookName}
                    onChange={(e) => setNewWebhookName(e.target.value)}
                    placeholder="My Webhook"
                    style={{
                      width: '100%',
                      padding: '12px',
                      background: COLORS.bg,
                      border: `1px solid ${COLORS.border}`,
                      borderRadius: '8px',
                      color: COLORS.text,
                      fontSize: '14px'
                    }}
                  />
                </div>
                <button
                  onClick={registerWebhook}
                  disabled={!newWebhookUrl.trim() || isLoading}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '12px 24px',
                    background: COLORS.primary,
                    border: 'none',
                    borderRadius: '8px',
                    color: COLORS.bg,
                    fontSize: '14px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    opacity: !newWebhookUrl.trim() ? 0.5 : 1
                  }}
                >
                  <Plus size={16} />
                  Register
                </button>
              </div>
            </div>

            {/* Webhooks List */}
            <h3 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '16px' }}>
              Registered Webhooks ({webhooks.length})
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {webhooks.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px', color: COLORS.textMuted }}>
                  <Bell size={48} style={{ opacity: 0.3, marginBottom: '16px' }} />
                  <p>No webhooks registered yet</p>
                </div>
              ) : (
                webhooks.map(webhook => (
                  <div
                    key={webhook.id}
                    style={{
                      padding: '16px',
                      background: COLORS.surface,
                      borderRadius: '12px',
                      border: `1px solid ${webhook.active ? COLORS.border : COLORS.error + '40'}`
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                          <span style={{ fontWeight: 600 }}>{webhook.name}</span>
                          <span style={{
                            padding: '4px 8px',
                            background: webhook.active ? COLORS.success + '20' : COLORS.error + '20',
                            color: webhook.active ? COLORS.success : COLORS.error,
                            borderRadius: '4px',
                            fontSize: '11px',
                            fontWeight: 600
                          }}>
                            {webhook.active ? 'ACTIVE' : 'INACTIVE'}
                          </span>
                        </div>
                        <code style={{ fontSize: '12px', color: COLORS.textMuted }}>{webhook.url}</code>
                        <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
                          {webhook.events?.map(event => (
                            <span
                              key={event}
                              style={{
                                padding: '2px 6px',
                                background: COLORS.info + '20',
                                color: COLORS.info,
                                borderRadius: '4px',
                                fontSize: '10px'
                              }}
                            >
                              {event}
                            </span>
                          ))}
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <button
                          onClick={() => testWebhook(webhook.id)}
                          style={{
                            padding: '8px 12px',
                            background: COLORS.info + '20',
                            border: 'none',
                            borderRadius: '6px',
                            color: COLORS.info,
                            cursor: 'pointer',
                            fontSize: '12px'
                          }}
                        >
                          Test
                        </button>
                        <button
                          onClick={() => deleteWebhook(webhook.id)}
                          style={{
                            padding: '8px 12px',
                            background: COLORS.error + '20',
                            border: 'none',
                            borderRadius: '6px',
                            color: COLORS.error,
                            cursor: 'pointer',
                            fontSize: '12px'
                          }}
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* Events Tab */}
        {activeTab === 'events' && (
          <div>
            <h3 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '16px' }}>
              Recent Webhook Events ({webhookEvents.length})
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '500px', overflowY: 'auto' }}>
              {webhookEvents.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px', color: COLORS.textMuted }}>
                  <Activity size={48} style={{ opacity: 0.3, marginBottom: '16px' }} />
                  <p>No webhook events yet</p>
                </div>
              ) : (
                webhookEvents.map((event, index) => (
                  <div
                    key={event.id || index}
                    style={{
                      padding: '12px',
                      background: COLORS.surface,
                      borderRadius: '8px',
                      borderLeft: `4px solid ${
                        event.type?.includes('completed') ? COLORS.success :
                        event.type?.includes('created') ? COLORS.info :
                        COLORS.warning
                      }`
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                      <span style={{
                        padding: '2px 8px',
                        background: COLORS.primary + '20',
                        color: COLORS.primary,
                        borderRadius: '4px',
                        fontSize: '11px',
                        fontWeight: 600
                      }}>
                        {event.type}
                      </span>
                      <span style={{ fontSize: '11px', color: COLORS.textMuted }}>
                        {formatDate(event.timestamp)}
                      </span>
                    </div>
                    <div style={{ fontSize: '11px', color: COLORS.textMuted }}>
                      Source: {event.source}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* Config Tab */}
        {activeTab === 'config' && (
          <div>
            <h3 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '16px' }}>
              API Configuration
            </h3>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {/* Production URL */}
              <div style={{
                padding: '20px',
                background: `linear-gradient(135deg, ${COLORS.success}15, ${COLORS.primary}15)`,
                borderRadius: '12px',
                border: `1px solid ${COLORS.success}40`
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                  <Globe size={24} color={COLORS.success} />
                  <h4 style={{ margin: 0, color: COLORS.success }}>Production URL</h4>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <code style={{
                    flex: 1,
                    padding: '16px',
                    background: COLORS.bg,
                    borderRadius: '8px',
                    fontSize: '16px',
                    fontWeight: 600,
                    color: COLORS.success
                  }}>
                    https://luxliqdaes.cloud
                  </code>
                  <button
                    onClick={() => copyToClipboard('https://luxliqdaes.cloud')}
                    style={{ padding: '16px', background: COLORS.success, border: 'none', borderRadius: '8px', cursor: 'pointer' }}
                  >
                    <Copy size={16} color={COLORS.bg} />
                  </button>
                </div>
              </div>

              {/* Current Environment */}
              <div style={{
                padding: '20px',
                background: COLORS.surface,
                borderRadius: '12px'
              }}>
                <h4 style={{ fontSize: '14px', color: COLORS.textSecondary, marginBottom: '12px' }}>
                  Current Environment
                </h4>
                <span style={{
                  padding: '8px 16px',
                  background: CONFIG.IS_PRODUCTION ? COLORS.success : COLORS.warning,
                  color: COLORS.bg,
                  borderRadius: '6px',
                  fontWeight: 700
                }}>
                  {CONFIG.ENV.toUpperCase()}
                </span>
              </div>

              {/* API URLs */}
              <div style={{
                padding: '20px',
                background: COLORS.surface,
                borderRadius: '12px'
              }}>
                <h4 style={{ fontSize: '14px', color: COLORS.textSecondary, marginBottom: '12px' }}>
                  DCB Treasury API
                </h4>
                <code style={{ fontSize: '14px' }}>{API_CONFIG.DCB_TREASURY_API}</code>
              </div>

              <div style={{
                padding: '20px',
                background: COLORS.surface,
                borderRadius: '12px'
              }}>
                <h4 style={{ fontSize: '14px', color: COLORS.textSecondary, marginBottom: '12px' }}>
                  LEMX Minting API
                </h4>
                <code style={{ fontSize: '14px' }}>{API_CONFIG.LEMX_API_URL}</code>
              </div>

              {/* LemonChain */}
              <div style={{
                padding: '20px',
                background: COLORS.surface,
                borderRadius: '12px'
              }}>
                <h4 style={{ fontSize: '14px', color: COLORS.textSecondary, marginBottom: '12px' }}>
                  LemonChain Configuration
                </h4>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px' }}>
                  <div>
                    <p style={{ fontSize: '12px', color: COLORS.textMuted }}>Chain ID</p>
                    <p style={{ fontWeight: 600 }}>{CONFIG.LEMON_CHAIN.chainId}</p>
                  </div>
                  <div>
                    <p style={{ fontSize: '12px', color: COLORS.textMuted }}>Network</p>
                    <p style={{ fontWeight: 600 }}>{CONFIG.LEMON_CHAIN.name}</p>
                  </div>
                  <div style={{ gridColumn: 'span 2' }}>
                    <p style={{ fontSize: '12px', color: COLORS.textMuted }}>VUSD Contract</p>
                    <code style={{ fontSize: '12px', color: COLORS.primary }}>
                      {CONFIG.LEMON_CHAIN.lusdContract}
                    </code>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Copy notification */}
      {copiedText && (
        <div style={{
          position: 'fixed',
          bottom: '24px',
          right: '24px',
          padding: '12px 24px',
          background: COLORS.success,
          color: COLORS.bg,
          borderRadius: '8px',
          fontWeight: 600,
          boxShadow: '0 4px 12px rgba(0,0,0,0.3)'
        }}>
          ✓ Copied to clipboard
        </div>
      )}
    </div>
  );
};

export default APIKeysManager;
