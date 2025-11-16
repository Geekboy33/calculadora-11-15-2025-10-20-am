/**
 * Proof of Reserves API Module
 * Sistema de API para transmitir Proof of Reserve data
 * Genera API keys, endpoints y secret keys para acceso externo
 */

import { useState, useEffect } from 'react';
import {
  Key, Shield, Database, Lock, Copy, RefreshCw, Trash2,
  Eye, EyeOff, CheckCircle, AlertCircle, Link as LinkIcon,
  FileText, Activity, Download
} from 'lucide-react';
import { useLanguage } from '../lib/i18n';

interface PorReport {
  id: string;
  report: string;
  pledgesM2: number;
  pledgesM3: number;
  totalM2: number;
  totalM3: number;
  timestamp: string;
  circulatingCap: number;
  pledgedUSD: number;
  activePledgesCount: number;
  expanded: boolean;
}

interface ApiKeyData {
  id: string;
  name: string;
  apiKey: string;
  secretKey: string;
  endpoint: string;
  apiUrls: {
    baseEndpoint: string;
    dataEndpoint: string;
    downloadEndpoint: string;
    summaryEndpoint: string;
    verifyEndpoint: string;
  };
  webhookUrl?: string;
  webhookEvents: string[];
  linkedPorIds: string[];
  createdAt: string;
  lastUsed: string | null;
  requestCount: number;
  permissions: {
    read_por: boolean;
    download_por: boolean;
  };
  status: 'active' | 'revoked';
}

interface WebhookLog {
  id: string;
  apiKeyId: string;
  event: string;
  endpoint: string;
  method: string;
  timestamp: string;
  status: 'success' | 'failed';
  responseTime: number;
  payload?: any;
}

export function ProofOfReservesAPIModule() {
  const { language } = useLanguage();
  const API_BASE = (import.meta as any).env?.VITE_POR_API_BASE || 'http://localhost:8787';
  const [porReports, setPorReports] = useState<PorReport[]>([]);
  const [apiKeys, setApiKeys] = useState<ApiKeyData[]>([]);
  const [showCreateKeyModal, setShowCreateKeyModal] = useState(false);
  const [showSecretModal, setShowSecretModal] = useState(false);
  const [newKeyData, setNewKeyData] = useState<{ apiKey: string; secretKey: string } | null>(null);
  const [keyName, setKeyName] = useState('');
  const [showSecrets, setShowSecrets] = useState<{ [key: string]: boolean }>({});
  const [selectedPorIds, setSelectedPorIds] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [webhookLogs, setWebhookLogs] = useState<WebhookLog[]>([]);
  const [webhookUrl, setWebhookUrl] = useState('');
  const [selectedEvents, setSelectedEvents] = useState<string[]>(['por.created', 'por.updated']);
  const [expandedLogs, setExpandedLogs] = useState<{ [key: string]: boolean }>({});

  const isSpanish = language === 'es';

  console.log('[PoR API] 🚀 Módulo inicializado');

  // Cargar PoR reports desde API VUSD
  useEffect(() => {
    loadPorReports();
    loadApiKeys();
    
    // Recargar cada 5 segundos para detectar cambios
    const interval = setInterval(() => {
      loadPorReports();
    }, 5000);
    
    return () => clearInterval(interval);
  }, []);

  const loadPorReports = () => {
    try {
      console.log('[PoR API] 📋 Cargando PoR reports...');
      const saved = localStorage.getItem('vusd_por_reports');
      if (saved) {
        const reports: PorReport[] = JSON.parse(saved);
        setPorReports(reports);
        console.log('[PoR API] ✅ Loaded', reports.length, 'PoR reports from API VUSD');
      } else {
        console.log('[PoR API] ℹ️ No hay PoR reports guardados');
        setPorReports([]);
      }
    } catch (err) {
      console.error('[PoR API] ❌ Error loading PoR reports:', err);
      setPorReports([]);
      setError('Error cargando PoR reports: ' + (err as Error).message);
    }
  };

  const loadApiKeys = () => {
    try {
      const saved = localStorage.getItem('por_api_keys');
      if (saved) {
        const keys: ApiKeyData[] = JSON.parse(saved);
        setApiKeys(keys);
        console.log('[PoR API] 🔑 Loaded', keys.length, 'API keys');
      } else {
        setApiKeys([]);
      }
    } catch (err) {
      console.error('[PoR API] ❌ Error loading API keys:', err);
      setApiKeys([]);
      setError('Error cargando API keys: ' + (err as Error).message);
    }
  };

  const generateApiKey = () => {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 15);
    return `por_${timestamp}_${random}`;
  };

  const generateSecretKey = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let secret = 'sk_';
    for (let i = 0; i < 64; i++) {
      secret += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return secret;
  };

  const generateEndpoint = (apiKey: string) => {
    const baseUrl = API_BASE;
    return `${baseUrl}/api/v1/proof-of-reserves/${apiKey}`;
  };

  const generateApiUrls = (apiKey: string) => {
    const baseUrl = API_BASE;
    return {
      baseEndpoint: `${baseUrl}/api/v1/proof-of-reserves/${apiKey}`,
      dataEndpoint: `${baseUrl}/api/v1/proof-of-reserves/${apiKey}/data`,
      downloadEndpoint: `${baseUrl}/api/v1/proof-of-reserves/${apiKey}/download`,
      summaryEndpoint: `${baseUrl}/api/v1/proof-of-reserves/${apiKey}/summary`,
      verifyEndpoint: `${baseUrl}/api/v1/proof-of-reserves/${apiKey}/verify`
    };
  };

  const handleCreateApiKey = async () => {
    if (!keyName.trim()) {
      alert(isSpanish ? 'Por favor ingresa un nombre para la API key' : 'Please enter a name for the API key');
      return;
    }

    if (selectedPorIds.length === 0) {
      alert(isSpanish 
        ? 'Selecciona al menos un Proof of Reserve para vincular a esta API key'
        : 'Select at least one Proof of Reserve to link to this API key');
      return;
    }

    const apiKey = generateApiKey();
    const secretKey = generateSecretKey();
    const endpoint = generateEndpoint(apiKey);
    const apiUrls = generateApiUrls(apiKey);

    const newKey: ApiKeyData = {
      id: `KEY_${Date.now()}`,
      name: keyName,
      apiKey: apiKey,
      secretKey: secretKey,
      endpoint: endpoint,
      apiUrls: apiUrls,
      webhookUrl: webhookUrl || undefined,
      webhookEvents: selectedEvents,
      linkedPorIds: selectedPorIds,
      createdAt: new Date().toISOString(),
      lastUsed: null,
      requestCount: 0,
      permissions: {
        read_por: true,
        download_por: true
      },
      status: 'active'
    };

    const updatedKeys = [...apiKeys, newKey];
    setApiKeys(updatedKeys);
    localStorage.setItem('por_api_keys', JSON.stringify(updatedKeys));

    setNewKeyData({ apiKey, secretKey });
    setShowCreateKeyModal(false);
    setShowSecretModal(true);
    setKeyName('');
    setSelectedPorIds([]);
    setWebhookUrl('');
    setSelectedEvents(['por.created', 'por.updated']);

    console.log('[PoR API] ✅ API Key creada:', apiKey);
    console.log('[PoR API] 🔔 Webhook configurado:', webhookUrl || 'No webhook');

    // Registrar API key REAL en backend
    try {
      const resp = await fetch(`${API_BASE}/admin/api-keys`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newKey)
      });
      if (!resp.ok) {
        console.warn('[PoR API] ⚠️ No se pudo registrar API key en backend');
      }
    } catch (e) {
      console.warn('[PoR API] ⚠️ Error registrando API key en backend:', (e as Error).message);
    }

    // Enviar PoR reales al backend para consumo API
    try {
      const resp = await fetch(`${API_BASE}/admin/import-por`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reports: porReports })
      });
      if (!resp.ok) {
        console.warn('[PoR API] ⚠️ No se pudieron sincronizar PoR con backend');
      }
    } catch (e) {
      console.warn('[PoR API] ⚠️ Error sincronizando PoR con backend:', (e as Error).message);
    }
  };

  const handleRevokeKey = (keyId: string) => {
    const updatedKeys = apiKeys.map(k => 
      k.id === keyId ? { ...k, status: 'revoked' as const } : k
    );
    setApiKeys(updatedKeys);
    localStorage.setItem('por_api_keys', JSON.stringify(updatedKeys));
    console.log('[PoR API] 🔒 API Key revocada:', keyId);
  };

  const handleDeleteKey = (keyId: string) => {
    if (!confirm(isSpanish 
      ? '¿Eliminar esta API key permanentemente?' 
      : 'Delete this API key permanently?')) {
      return;
    }

    const updatedKeys = apiKeys.filter(k => k.id !== keyId);
    setApiKeys(updatedKeys);
    localStorage.setItem('por_api_keys', JSON.stringify(updatedKeys));
    console.log('[PoR API] 🗑️ API Key eliminada:', keyId);
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text).then(() => {
      alert(isSpanish ? `✅ ${label} copiado al portapapeles` : `✅ ${label} copied to clipboard`);
    });
  };

  const downloadPorData = (porReport: PorReport) => {
    const blob = new Blob([porReport.report], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `PoR_API_${new Date(porReport.timestamp).toISOString().split('T')[0]}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Ejecutar llamada REAL al endpoint API
  const simulateApiCall = async (key: ApiKeyData, endpoint: string) => {
    const startTime = Date.now();
    
    try {
      console.log('[PoR API] 📡 Ejecutando llamada API REAL:', endpoint);

      const resp = await fetch(endpoint, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${key.apiKey}`,
          'X-Secret-Key': key.secretKey,
          'Accept': 'application/json'
        }
      });

      const payload = await resp.json().catch(() => ({}));
      const ok = resp.ok;
      
      // Crear log con respuesta real
      const webhookLog: WebhookLog = {
        id: `WH_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
        apiKeyId: key.id,
        event: ok ? 'api.request' : 'api.error',
        endpoint: endpoint,
        method: 'GET',
        timestamp: new Date().toISOString(),
        status: ok ? 'success' : 'failed',
        responseTime: Date.now() - startTime,
        payload
      };
      
      setWebhookLogs(prev => [webhookLog, ...prev].slice(0, 100));
      
      // Actualizar lastUsed y requestCount
      const updatedKeys = apiKeys.map(k => 
        k.id === key.id 
          ? { ...k, lastUsed: new Date().toISOString(), requestCount: (k.requestCount || 0) + 1 }
          : k
      );
      setApiKeys(updatedKeys);
      localStorage.setItem('por_api_keys', JSON.stringify(updatedKeys));
      
      alert(
        `${ok ? '✅' : '❌'} ${isSpanish ? (ok ? 'Llamada API Exitosa' : 'Error en llamada API') : (ok ? 'API Call Successful' : 'API Call Error')}\n\n` +
        `Endpoint: ${endpoint}\n` +
        `${isSpanish ? 'Tiempo de respuesta' : 'Response time'}: ${Date.now() - startTime}ms\n` +
        `${isSpanish ? 'Status' : 'Status'}: ${resp.status}\n\n` +
        `${isSpanish ? '📄 Ver respuesta completa en logs abajo' : '📄 See full response in logs below'}`
      );
      
    } catch (err) {
      console.error('[PoR API] ❌ Error en llamada API:', err);
      
      const errorLog: WebhookLog = {
        id: `WH_ERROR_${Date.now()}`,
        apiKeyId: key.id,
        event: 'api.error',
        endpoint: endpoint,
        method: 'GET',
        timestamp: new Date().toISOString(),
        status: 'failed',
        responseTime: Date.now() - startTime,
        payload: { error: (err as Error).message }
      };
      
      setWebhookLogs(prev => [errorLog, ...prev].slice(0, 100));
      
      alert(`❌ ${isSpanish ? 'Error en llamada API' : 'API Call Error'}: ${(err as Error).message}`);
    }
  };

  return (
    <div className="min-h-screen bg-black text-white p-6">
      {/* Error Message */}
      {error && (
        <div className="mb-6 bg-red-900/20 border-2 border-red-500 rounded-lg p-4">
          <div className="flex items-center gap-3">
            <AlertCircle className="w-6 h-6 text-red-400" />
            <div>
              <div className="text-red-300 font-bold">Error</div>
              <div className="text-red-300/80 text-sm">{error}</div>
            </div>
            <button
              onClick={() => setError(null)}
              className="ml-auto px-3 py-1 bg-red-500/20 border border-red-500 text-red-300 rounded hover:bg-red-500/30"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-cyan-400 flex items-center gap-3">
              <Database className="w-8 h-8" />
              {isSpanish ? 'Proof of Reserves API' : 'Proof of Reserves API'}
            </h1>
            <p className="text-cyan-300/60 mt-2">
              {isSpanish 
                ? 'Sistema de API para transmitir Proof of Reserve data'
                : 'API system to transmit Proof of Reserve data'}
            </p>
          </div>
          <button
            onClick={() => {
              console.log('[PoR API] 🔄 Actualizando manualmente...');
              loadPorReports();
              loadApiKeys();
              alert(isSpanish 
                ? `✅ Actualizado\n\nPoR disponibles: ${porReports.length}\nAPI Keys: ${apiKeys.length}`
                : `✅ Refreshed\n\nAvailable PoR: ${porReports.length}\nAPI Keys: ${apiKeys.length}`);
            }}
            className="px-4 py-2 bg-cyan-500/20 border border-cyan-500 text-cyan-300 rounded-lg hover:bg-cyan-500/30 flex items-center gap-2"
          >
            <RefreshCw className="w-4 h-4" />
            {isSpanish ? 'Actualizar' : 'Refresh'}
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <div className="bg-gradient-to-r from-cyan-900/20 to-blue-900/20 border border-cyan-500/30 rounded-lg p-4">
          <div className="flex items-center gap-3">
            <FileText className="w-8 h-8 text-cyan-400" />
            <div>
              <div className="text-2xl font-bold text-cyan-300">{porReports.length}</div>
              <div className="text-xs text-cyan-300/60">
                {isSpanish ? 'Proof of Reserves Disponibles' : 'Available Proof of Reserves'}
              </div>
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-r from-green-900/20 to-emerald-900/20 border border-green-500/30 rounded-lg p-4">
          <div className="flex items-center gap-3">
            <Key className="w-8 h-8 text-green-400" />
            <div>
              <div className="text-2xl font-bold text-green-300">
                {apiKeys.filter(k => k.status === 'active').length}
              </div>
              <div className="text-xs text-green-300/60">
                {isSpanish ? 'API Keys Activas' : 'Active API Keys'}
              </div>
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-r from-purple-900/20 to-pink-900/20 border border-purple-500/30 rounded-lg p-4">
          <div className="flex items-center gap-3">
            <LinkIcon className="w-8 h-8 text-purple-400" />
            <div>
              <div className="text-2xl font-bold text-purple-300">{apiKeys.length}</div>
              <div className="text-xs text-purple-300/60">
                {isSpanish ? 'Endpoints Generados' : 'Generated Endpoints'}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Available PoR Reports */}
      <div className="bg-[#0d0d0d] border border-cyan-500/30 rounded-lg mb-8">
        <div className="p-6 border-b border-cyan-500/20">
          <h2 className="text-xl font-bold text-cyan-300 flex items-center gap-2">
            <FileText className="w-6 h-6" />
            {isSpanish ? 'Proof of Reserves Disponibles (desde API VUSD)' : 'Available Proof of Reserves (from API VUSD)'}
          </h2>
          <p className="text-sm text-cyan-300/60 mt-2">
            {isSpanish 
              ? 'Estos PoR están disponibles para ser transmitidos vía API'
              : 'These PoR are available to be transmitted via API'}
          </p>
        </div>
        <div className="p-6">
          {porReports.length === 0 ? (
            <div className="text-center py-12">
              <FileText className="w-16 h-16 text-cyan-400/30 mx-auto mb-4" />
              <div className="text-cyan-300/60 mb-2">
                {isSpanish 
                  ? 'No hay Proof of Reserve disponibles'
                  : 'No Proof of Reserve available'}
              </div>
              <div className="text-cyan-300/40 text-sm">
                {isSpanish
                  ? 'Ve a API VUSD → Proof of Reserve y genera un reporte'
                  : 'Go to API VUSD → Proof of Reserve and generate a report'}
              </div>
            </div>
          ) : (
            <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2">
              {porReports.map((por, index) => (
                <div
                  key={por.id}
                  className="bg-black/30 border border-cyan-500/20 rounded-lg p-4 hover:border-cyan-500/50 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <span className="px-2 py-1 bg-cyan-500/20 text-cyan-300 text-xs rounded font-mono">
                          PoR #{porReports.length - index}
                        </span>
                        <span className="text-cyan-300/60 text-xs">
                          {new Date(por.timestamp).toLocaleString(isSpanish ? 'es-ES' : 'en-US')}
                        </span>
                      </div>
                      <div className="grid grid-cols-4 gap-4 text-xs">
                        <div>
                          <span className="text-cyan-300/60">{isSpanish ? 'Pledges:' : 'Pledges:'} </span>
                          <span className="text-white font-bold">{por.activePledgesCount}</span>
                        </div>
                        <div>
                          <span className="text-cyan-300/60">Cap: </span>
                          <span className="text-cyan-300 font-bold">${por.circulatingCap.toLocaleString()}</span>
                        </div>
                        <div>
                          <span className="text-green-300/60">M2: </span>
                          <span className="text-green-300 font-bold">{por.pledgesM2}</span>
                        </div>
                        <div>
                          <span className="text-purple-300/60">M3: </span>
                          <span className="text-purple-300 font-bold">{por.pledgesM3}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => downloadPorData(por)}
                        className="p-2 bg-cyan-500/20 border border-cyan-500 text-cyan-300 rounded-lg hover:bg-cyan-500/30"
                        title={isSpanish ? 'Descargar' : 'Download'}
                      >
                        <Download className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => {
                          if (confirm(isSpanish 
                            ? '¿Eliminar este Proof of Reserve?\n\nEsto también lo eliminará de API VUSD.'
                            : 'Delete this Proof of Reserve?\n\nThis will also remove it from API VUSD.')) {
                            
                            // Eliminar del localStorage de API VUSD
                            const saved = localStorage.getItem('vusd_por_reports');
                            if (saved) {
                              const allPorReports = JSON.parse(saved);
                              const updated = allPorReports.filter((p: any) => p.id !== por.id);
                              localStorage.setItem('vusd_por_reports', JSON.stringify(updated));
                            }
                            
                            // Actualizar lista local
                            setPorReports(prev => prev.filter(p => p.id !== por.id));
                            
                            console.log('[PoR API] 🗑️ PoR eliminado:', por.id);
                            alert(isSpanish 
                              ? '✅ PoR eliminado correctamente'
                              : '✅ PoR deleted successfully');
                          }
                        }}
                        className="p-2 bg-red-500/20 border border-red-500 text-red-400 rounded-lg hover:bg-red-500/30"
                        title={isSpanish ? 'Eliminar' : 'Delete'}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* API Keys Section */}
      <div className="bg-[#0d0d0d] border border-green-500/30 rounded-lg">
        <div className="p-6 border-b border-green-500/20 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-green-300 flex items-center gap-2">
              <Key className="w-6 h-6" />
              {isSpanish ? 'API Keys Generadas' : 'Generated API Keys'}
            </h2>
            <p className="text-sm text-green-300/60 mt-1">
              {isSpanish 
                ? 'Gestiona las API keys para acceso a Proof of Reserve data'
                : 'Manage API keys for Proof of Reserve data access'}
            </p>
          </div>
          <button
            onClick={() => {
              console.log('[PoR API] 🔑 Abriendo modal para generar API Key...');
              console.log('[PoR API] 📊 PoR disponibles:', porReports.length);
              
              if (porReports.length === 0) {
                alert(isSpanish 
                  ? '⚠️ No hay Proof of Reserves disponibles\n\nPrimero genera PoR en API VUSD → Proof of Reserve'
                  : '⚠️ No Proof of Reserves available\n\nFirst generate PoR in API VUSD → Proof of Reserve');
                return;
              }
              
              // Recargar PoR antes de abrir modal
              loadPorReports();
              setShowCreateKeyModal(true);
            }}
            className="px-6 py-3 bg-green-500/20 border border-green-500 text-green-300 rounded-lg hover:bg-green-500/30 flex items-center gap-2 font-bold"
          >
            <Key className="w-5 h-5" />
            {isSpanish ? 'Generar Nueva API Key' : 'Generate New API Key'}
          </button>
        </div>
        <div className="p-6">
          {apiKeys.length === 0 ? (
            <div className="text-center py-12">
              <Key className="w-16 h-16 text-green-400/30 mx-auto mb-4" />
              <div className="text-green-300/60 mb-2">
                {isSpanish ? 'No hay API keys generadas' : 'No API keys generated'}
              </div>
              <div className="text-green-300/40 text-sm">
                {isSpanish
                  ? 'Genera una API key para transmitir PoR data'
                  : 'Generate an API key to transmit PoR data'}
              </div>
            </div>
          ) : (
            <div className="space-y-4 max-h-[1000px] overflow-y-auto pr-2">
              {apiKeys.map((key) => {
                // Validación defensiva: asegurar que todas las propiedades existen
                if (!key.apiUrls) {
                  key.apiUrls = generateApiUrls(key.apiKey);
                }
                if (!key.linkedPorIds) {
                  key.linkedPorIds = [];
                }
                if (!key.permissions) {
                  key.permissions = { read_por: true, download_por: true };
                }
                
                return (
                  <div
                    key={key.id}
                    className={`border-2 rounded-lg p-6 ${
                      key.status === 'active' 
                        ? 'bg-green-900/10 border-green-500/30' 
                        : 'bg-red-900/10 border-red-500/30 opacity-60'
                    }`}
                  >
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <Shield className="w-6 h-6 text-green-400" />
                      <div>
                        <div className="text-lg font-bold text-white">{key.name}</div>
                        <div className="text-xs text-green-300/60">
                          {isSpanish ? 'Creada:' : 'Created:'} {new Date(key.createdAt).toLocaleString(isSpanish ? 'es-ES' : 'en-US')}
                        </div>
                      </div>
                      <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                        key.status === 'active' 
                          ? 'bg-green-500/20 text-green-300' 
                          : 'bg-red-500/20 text-red-300'
                      }`}>
                        {key.status === 'active' 
                          ? (isSpanish ? 'ACTIVA' : 'ACTIVE')
                          : (isSpanish ? 'REVOCADA' : 'REVOKED')}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      {key.status === 'active' && (
                        <button
                          onClick={() => handleRevokeKey(key.id)}
                          className="px-3 py-2 bg-orange-500/20 border border-orange-500 text-orange-300 rounded-lg hover:bg-orange-500/30 text-sm"
                        >
                          {isSpanish ? 'Revocar' : 'Revoke'}
                        </button>
                      )}
                      <button
                        onClick={() => handleDeleteKey(key.id)}
                        className="p-2 bg-red-500/20 border border-red-500 text-red-400 rounded-lg hover:bg-red-500/30"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* API Key */}
                  <div className="space-y-3">
                    <div className="bg-black/50 rounded-lg p-4">
                      <div className="text-xs text-green-300/60 mb-2 font-semibold">
                        {isSpanish ? '🔑 API KEY:' : '🔑 API KEY:'}
                      </div>
                      <div className="flex items-center gap-2">
                        <code className="flex-1 text-green-400 font-mono text-sm bg-black/50 p-2 rounded border border-green-500/20">
                          {key.apiKey}
                        </code>
                        <button
                          onClick={() => copyToClipboard(key.apiKey, 'API Key')}
                          className="p-2 bg-green-500/20 border border-green-500 text-green-300 rounded hover:bg-green-500/30"
                        >
                          <Copy className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    {/* Secret Key */}
                    <div className="bg-black/50 rounded-lg p-4">
                      <div className="text-xs text-orange-300/60 mb-2 font-semibold">
                        {isSpanish ? '🔐 SECRET KEY:' : '🔐 SECRET KEY:'}
                      </div>
                      <div className="flex items-center gap-2">
                        <code className="flex-1 text-orange-400 font-mono text-sm bg-black/50 p-2 rounded border border-orange-500/20">
                          {showSecrets[key.id] ? key.secretKey : '••••••••••••••••••••••••••••••••'}
                        </code>
                        <button
                          onClick={() => setShowSecrets(prev => ({ ...prev, [key.id]: !prev[key.id] }))}
                          className="p-2 bg-orange-500/20 border border-orange-500 text-orange-300 rounded hover:bg-orange-500/30"
                        >
                          {showSecrets[key.id] ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                        <button
                          onClick={() => copyToClipboard(key.secretKey, 'Secret Key')}
                          className="p-2 bg-orange-500/20 border border-orange-500 text-orange-300 rounded hover:bg-orange-500/30"
                        >
                          <Copy className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    {/* API URLs - Endpoints Completos */}
                    <div className="bg-black/50 rounded-lg p-4">
                      <div className="text-sm text-blue-300 mb-3 font-bold flex items-center gap-2">
                        <LinkIcon className="w-5 h-5" />
                        {isSpanish ? '🔗 URLs API VINCULADAS:' : '🔗 LINKED API URLS:'}
                      </div>
                      
                      <div className="space-y-3">
                        {/* Base Endpoint */}
                        <div>
                          <div className="text-xs text-blue-300/60 mb-1">
                            {isSpanish ? '📍 Endpoint Principal (PoR Completo):' : '📍 Main Endpoint (Full PoR):'}
                          </div>
                          <div className="flex items-center gap-2">
                            <code className="flex-1 text-blue-400 font-mono text-xs bg-black/50 p-2 rounded border border-blue-500/20 overflow-x-auto">
                              GET {key.apiUrls.baseEndpoint}
                            </code>
                            <button
                              onClick={() => copyToClipboard(key.apiUrls.baseEndpoint, 'Base Endpoint')}
                              className="p-2 bg-blue-500/20 border border-blue-500 text-blue-300 rounded hover:bg-blue-500/30"
                              title={isSpanish ? 'Copiar' : 'Copy'}
                            >
                              <Copy className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => simulateApiCall(key, key.apiUrls.baseEndpoint)}
                              className="px-3 py-2 bg-green-500/20 border border-green-500 text-green-300 rounded hover:bg-green-500/30 text-xs font-bold"
                            >
                              {isSpanish ? 'Probar' : 'Test'}
                            </button>
                          </div>
                        </div>

                        {/* Data Endpoint */}
                        <div>
                          <div className="text-xs text-cyan-300/60 mb-1">
                            {isSpanish ? '📊 Data Endpoint (Solo Datos):' : '📊 Data Endpoint (Data Only):'}
                          </div>
                          <div className="flex items-center gap-2">
                            <code className="flex-1 text-cyan-400 font-mono text-xs bg-black/50 p-2 rounded border border-cyan-500/20 overflow-x-auto">
                              GET {key.apiUrls.dataEndpoint}
                            </code>
                            <button
                              onClick={() => copyToClipboard(key.apiUrls.dataEndpoint, 'Data Endpoint')}
                              className="p-2 bg-cyan-500/20 border border-cyan-500 text-cyan-300 rounded hover:bg-cyan-500/30"
                            >
                              <Copy className="w-4 h-4" />
                            </button>
                          </div>
                        </div>

                        {/* Download Endpoint */}
                        <div>
                          <div className="text-xs text-green-300/60 mb-1">
                            {isSpanish ? '⬇️ Download Endpoint (Descargar TXT):' : '⬇️ Download Endpoint (Download TXT):'}
                          </div>
                          <div className="flex items-center gap-2">
                            <code className="flex-1 text-green-400 font-mono text-xs bg-black/50 p-2 rounded border border-green-500/20 overflow-x-auto">
                              GET {key.apiUrls.downloadEndpoint}
                            </code>
                            <button
                              onClick={() => copyToClipboard(key.apiUrls.downloadEndpoint, 'Download Endpoint')}
                              className="p-2 bg-green-500/20 border border-green-500 text-green-300 rounded hover:bg-green-500/30"
                            >
                              <Copy className="w-4 h-4" />
                            </button>
                          </div>
                        </div>

                        {/* Summary Endpoint */}
                        <div>
                          <div className="text-xs text-purple-300/60 mb-1">
                            {isSpanish ? '📈 Summary Endpoint (Resumen):' : '📈 Summary Endpoint (Summary):'}
                          </div>
                          <div className="flex items-center gap-2">
                            <code className="flex-1 text-purple-400 font-mono text-xs bg-black/50 p-2 rounded border border-purple-500/20 overflow-x-auto">
                              GET {key.apiUrls.summaryEndpoint}
                            </code>
                            <button
                              onClick={() => copyToClipboard(key.apiUrls.summaryEndpoint, 'Summary Endpoint')}
                              className="p-2 bg-purple-500/20 border border-purple-500 text-purple-300 rounded hover:bg-purple-500/30"
                            >
                              <Copy className="w-4 h-4" />
                            </button>
                          </div>
                        </div>

                        {/* Verify Endpoint */}
                        <div>
                          <div className="text-xs text-orange-300/60 mb-1">
                            {isSpanish ? '✅ Verify Endpoint (Verificar):' : '✅ Verify Endpoint (Verify):'}
                          </div>
                          <div className="flex items-center gap-2">
                            <code className="flex-1 text-orange-400 font-mono text-xs bg-black/50 p-2 rounded border border-orange-500/20 overflow-x-auto">
                              GET {key.apiUrls.verifyEndpoint}
                            </code>
                            <button
                              onClick={() => copyToClipboard(key.apiUrls.verifyEndpoint, 'Verify Endpoint')}
                              className="p-2 bg-orange-500/20 border border-orange-500 text-orange-300 rounded hover:bg-orange-500/30"
                            >
                              <Copy className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      </div>

                      {/* Authentication Info */}
                      <div className="mt-4 p-3 bg-yellow-900/20 border border-yellow-500/30 rounded">
                        <div className="text-xs font-semibold text-yellow-300 mb-2">
                          {isSpanish ? '🔐 Autenticación Requerida:' : '🔐 Authentication Required:'}
                        </div>
                        <div className="text-xs text-yellow-300/80 space-y-1 font-mono">
                          <div>Header: <span className="text-green-400">Authorization: Bearer {key.apiKey}</span></div>
                          <div>Header: <span className="text-orange-400">X-Secret-Key: {key.secretKey.substring(0, 20)}...</span></div>
                        </div>
                      </div>

                      {/* PoR Vinculados */}
                      <div className="mt-3 p-3 bg-cyan-900/20 border border-cyan-500/20 rounded">
                        <div className="text-xs text-cyan-300/80">
                          {isSpanish ? '📄 PoR Vinculados:' : '📄 Linked PoR:'} {key.linkedPorIds.length}
                        </div>
                      </div>
                    </div>

                    {/* Usage Stats */}
                    <div className="bg-black/30 rounded-lg p-3">
                      <div className="text-xs text-cyan-300/60 mb-2 font-semibold">
                        {isSpanish ? 'Estadísticas de Uso:' : 'Usage Stats:'}
                      </div>
                      <div className="grid grid-cols-2 gap-4 text-xs">
                        <div>
                          <span className="text-cyan-300/60">{isSpanish ? 'Requests:' : 'Requests:'} </span>
                          <span className="text-white font-bold">{key.requestCount || 0}</span>
                        </div>
                        <div>
                          <span className="text-cyan-300/60">{isSpanish ? 'Último uso:' : 'Last used:'} </span>
                          <span className="text-white font-mono text-xs">
                            {key.lastUsed ? new Date(key.lastUsed).toLocaleTimeString(isSpanish ? 'es-ES' : 'en-US') : 'N/A'}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Webhook Configuration */}
                    {key.webhookUrl && (
                      <div className="bg-purple-900/20 rounded-lg p-3 border border-purple-500/30">
                        <div className="text-xs text-purple-300 mb-2 font-semibold">
                          {isSpanish ? '🔔 Webhook Configurado:' : '🔔 Webhook Configured:'}
                        </div>
                        <div className="text-xs text-purple-300/80 font-mono truncate mb-2">
                          {key.webhookUrl}
                        </div>
                        <div className="flex flex-wrap gap-1">
                          {(key.webhookEvents || []).map(event => (
                            <span key={event} className="px-2 py-1 bg-purple-500/20 text-purple-300 rounded text-xs">
                              {event}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Permissions */}
                    <div className="bg-black/30 rounded-lg p-3">
                      <div className="text-xs text-cyan-300/60 mb-2 font-semibold">
                        {isSpanish ? 'Permisos:' : 'Permissions:'}
                      </div>
                      <div className="flex gap-4 text-xs">
                        <span className="text-green-300">
                          ✅ {isSpanish ? 'Leer PoR' : 'Read PoR'}
                        </span>
                        <span className="text-green-300">
                          ✅ {isSpanish ? 'Descargar PoR' : 'Download PoR'}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Webhook Logs Section */}
      {webhookLogs.length > 0 && (
        <div className="bg-[#0d0d0d] border border-purple-500/30 rounded-lg mt-8">
          <div className="p-6 border-b border-purple-500/20">
            <h2 className="text-xl font-bold text-purple-300 flex items-center gap-2">
              <Activity className="w-6 h-6" />
              {isSpanish ? 'Logs de Webhook' : 'Webhook Logs'}
            </h2>
            <p className="text-sm text-purple-300/60 mt-1">
              {isSpanish 
                ? 'Historial de llamadas API y webhooks enviados'
                : 'History of API calls and sent webhooks'}
            </p>
          </div>
          <div className="p-6">
            <div className="space-y-3 max-h-[600px] overflow-y-auto pr-2">
              {webhookLogs.map((log) => (
                <div
                  key={log.id}
                  className={`border rounded-lg p-4 ${
                    log.status === 'success'
                      ? 'bg-green-900/10 border-green-500/30'
                      : 'bg-red-900/10 border-red-500/30'
                  }`}
                >
                  <div 
                    className="flex items-center justify-between mb-2 cursor-pointer" 
                    onClick={() => setExpandedLogs(prev => ({ ...prev, [log.id]: !prev[log.id] }))}
                  >
                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-1 rounded text-xs font-bold ${
                        log.status === 'success'
                          ? 'bg-green-500/20 text-green-300'
                          : 'bg-red-500/20 text-red-300'
                      }`}>
                        {log.method}
                      </span>
                      <span className="text-white text-sm font-mono">{log.event}</span>
                      <button className="ml-2 text-purple-400 text-lg">
                        {expandedLogs[log.id] ? '▼' : '▶'}
                      </button>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-xs text-purple-300/60">
                        {log.responseTime}ms
                      </span>
                      <span className="text-xs text-purple-300/60">
                        {new Date(log.timestamp).toLocaleString(isSpanish ? 'es-ES' : 'en-US')}
                      </span>
                    </div>
                  </div>
                  <div className="text-xs text-purple-300/60 font-mono mb-2">
                    🔗 {log.endpoint}
                  </div>
                  
                  {/* Payload Completo - Expandible */}
                  {expandedLogs[log.id] && log.payload && (
                    <div className="mt-3 p-3 bg-black/50 border border-purple-500/20 rounded">
                      <div className="text-xs text-purple-300 mb-2 font-semibold flex items-center justify-between">
                        <span>{isSpanish ? '📦 Payload Completo:' : '📦 Full Payload:'}</span>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            navigator.clipboard.writeText(JSON.stringify(log.payload, null, 2));
                            alert(isSpanish ? '✅ Payload copiado' : '✅ Payload copied');
                          }}
                          className="px-2 py-1 bg-purple-500/20 border border-purple-500 text-purple-300 rounded text-xs hover:bg-purple-500/30"
                        >
                          {isSpanish ? 'Copiar JSON' : 'Copy JSON'}
                        </button>
                      </div>
                      <pre className="text-xs text-green-400 font-mono overflow-x-auto max-h-96 overflow-y-auto bg-black/50 p-3 rounded border border-green-500/20 whitespace-pre-wrap break-words">
                        {JSON.stringify(log.payload, null, 2)}
                      </pre>
                      <div className="mt-2 text-xs text-purple-300/60">
                        {isSpanish 
                          ? `💾 Tamaño: ${JSON.stringify(log.payload).length} bytes • Click para scroll`
                          : `💾 Size: ${JSON.stringify(log.payload).length} bytes • Click to scroll`}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Create API Key Modal */}
      {showCreateKeyModal && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="bg-[#0d0d0d] border-2 border-green-500 rounded-lg max-w-2xl w-full p-6 max-h-[90vh] overflow-y-auto">
            <div className="mb-6">
              <h3 className="text-2xl font-bold text-green-300 flex items-center gap-2">
                <Key className="w-6 h-6" />
                {isSpanish ? 'Generar Nueva API Key' : 'Generate New API Key'}
              </h3>
              <p className="text-green-300/60 text-sm mt-2">
                {isSpanish 
                  ? `${porReports.length} Proof of Reserves activos disponibles para vincular`
                  : `${porReports.length} active Proof of Reserves available to link`}
              </p>
            </div>

            <div className="space-y-6">
              {/* Key Name */}
              <div>
                <label className="block text-green-300 text-sm mb-2 font-semibold">
                  {isSpanish ? 'Nombre de la API Key:' : 'API Key Name:'}
                </label>
                <input
                  type="text"
                  value={keyName}
                  onChange={(e) => setKeyName(e.target.value)}
                  placeholder={isSpanish ? 'Ej: External PoR Access' : 'e.g., External PoR Access'}
                  className="w-full bg-black/50 border border-green-500/30 rounded-lg px-4 py-3 text-white focus:border-green-500 focus:ring-2 focus:ring-green-500/20"
                />
              </div>

              {/* Select PoR Reports */}
              <div>
                <label className="block text-green-300 text-sm mb-3 font-semibold">
                  {isSpanish 
                    ? 'Selecciona Proof of Reserves a vincular:'
                    : 'Select Proof of Reserves to link:'}
                </label>
                <div className="space-y-2 max-h-60 overflow-y-auto bg-black/30 rounded-lg p-3 border border-green-500/20">
                  {porReports.map((por, index) => (
                    <label
                      key={por.id}
                      className="flex items-center gap-3 p-3 bg-black/50 rounded-lg border border-green-500/10 hover:border-green-500/30 cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={selectedPorIds.includes(por.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedPorIds(prev => [...prev, por.id]);
                          } else {
                            setSelectedPorIds(prev => prev.filter(id => id !== por.id));
                          }
                        }}
                        className="w-4 h-4"
                      />
                      <div className="flex-1">
                        <div className="text-white text-sm">PoR #{porReports.length - index}</div>
                        <div className="text-xs text-green-300/60">
                          {new Date(por.timestamp).toLocaleString(isSpanish ? 'es-ES' : 'en-US')} • 
                          {por.activePledgesCount} pledges • ${por.circulatingCap.toLocaleString()}
                        </div>
                      </div>
                    </label>
                  ))}
                </div>
                <div className="text-xs text-green-300/60 mt-2">
                  {isSpanish 
                    ? `✅ ${selectedPorIds.length} PoR seleccionado(s)`
                    : `✅ ${selectedPorIds.length} PoR selected`}
                </div>
              </div>

              {/* Webhook URL (Opcional) */}
              <div>
                <label className="block text-cyan-300 text-sm mb-2 font-semibold">
                  {isSpanish ? '🔔 Webhook URL (Opcional):' : '🔔 Webhook URL (Optional):'}
                </label>
                <input
                  type="url"
                  value={webhookUrl}
                  onChange={(e) => setWebhookUrl(e.target.value)}
                  placeholder={isSpanish ? 'https://tu-servidor.com/webhook' : 'https://your-server.com/webhook'}
                  className="w-full bg-black/50 border border-cyan-500/30 rounded-lg px-4 py-3 text-white focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20"
                />
                <div className="text-xs text-cyan-300/60 mt-1">
                  {isSpanish 
                    ? 'Se enviará POST con data de PoR cuando se acceda a la API'
                    : 'POST will be sent with PoR data when API is accessed'}
                </div>
              </div>

              {/* Webhook Events */}
              <div>
                <label className="block text-cyan-300 text-sm mb-2 font-semibold">
                  {isSpanish ? '📡 Eventos de Webhook:' : '📡 Webhook Events:'}
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { id: 'por.created', label: isSpanish ? 'PoR Creado' : 'PoR Created' },
                    { id: 'por.updated', label: isSpanish ? 'PoR Actualizado' : 'PoR Updated' },
                    { id: 'api.request', label: isSpanish ? 'API Request' : 'API Request' },
                    { id: 'api.download', label: isSpanish ? 'API Download' : 'API Download' }
                  ].map(event => (
                    <label key={event.id} className="flex items-center gap-2 p-2 bg-black/30 rounded border border-cyan-500/20 cursor-pointer hover:border-cyan-500/40">
                      <input
                        type="checkbox"
                        checked={selectedEvents.includes(event.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedEvents(prev => [...prev, event.id]);
                          } else {
                            setSelectedEvents(prev => prev.filter(ev => ev !== event.id));
                          }
                        }}
                        className="w-4 h-4"
                      />
                      <span className="text-xs text-cyan-300">{event.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Buttons */}
              <div className="flex gap-3 pt-4 border-t border-green-500/20">
                <button
                  onClick={() => {
                    setShowCreateKeyModal(false);
                    setKeyName('');
                    setSelectedPorIds([]);
                  }}
                  className="flex-1 px-4 py-3 bg-[#1a1a1a] border border-[#2a2a2a] text-white rounded-lg hover:bg-[#2a2a2a]"
                >
                  {isSpanish ? 'Cancelar' : 'Cancel'}
                </button>
                <button
                  onClick={handleCreateApiKey}
                  className="flex-1 px-6 py-3 bg-green-500/20 border border-green-500 text-green-300 rounded-lg hover:bg-green-500/30 font-bold flex items-center justify-center gap-2"
                >
                  <Key className="w-5 h-5" />
                  {isSpanish ? 'Generar API Key' : 'Generate API Key'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Show Secret Modal */}
      {showSecretModal && newKeyData && (
        <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-[#0d0d0d] border-2 border-green-500 rounded-lg max-w-5xl w-full p-8 my-8 max-h-[90vh] overflow-y-auto">
            <div className="text-center mb-6">
              <CheckCircle className="w-16 h-16 text-green-400 mx-auto mb-4" />
              <h3 className="text-2xl font-bold text-green-300 mb-2">
                {isSpanish ? '✅ API Key Generada Exitosamente' : '✅ API Key Generated Successfully'}
              </h3>
              <p className="text-green-300/60">
                {isSpanish 
                  ? '⚠️ Guarda estas credenciales de forma segura. No podrás verlas nuevamente.'
                  : '⚠️ Save these credentials securely. You won\'t be able to see them again.'}
              </p>
            </div>

            <div className="space-y-4">
              {/* API Key */}
              <div className="bg-black/50 rounded-lg p-4 border border-green-500/30">
                <div className="text-sm text-green-300 mb-2 font-semibold">🔑 API KEY:</div>
                <div className="flex items-center gap-2">
                  <code className="flex-1 text-green-400 font-mono text-sm bg-black/50 p-3 rounded border border-green-500/20 break-all">
                    {newKeyData.apiKey}
                  </code>
                  <button
                    onClick={() => copyToClipboard(newKeyData.apiKey, 'API Key')}
                    className="p-3 bg-green-500/20 border border-green-500 text-green-300 rounded hover:bg-green-500/30"
                  >
                    <Copy className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Secret Key */}
              <div className="bg-black/50 rounded-lg p-4 border border-orange-500/30">
                <div className="text-sm text-orange-300 mb-2 font-semibold">🔐 SECRET KEY:</div>
                <div className="flex items-center gap-2">
                  <code className="flex-1 text-orange-400 font-mono text-xs bg-black/50 p-3 rounded border border-orange-500/20 break-all">
                    {newKeyData.secretKey}
                  </code>
                  <button
                    onClick={() => copyToClipboard(newKeyData.secretKey, 'Secret Key')}
                    className="p-3 bg-orange-500/20 border border-orange-500 text-orange-300 rounded hover:bg-orange-500/30"
                  >
                    <Copy className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Endpoints Preview */}
              <div className="bg-black/50 rounded-lg p-4 border border-blue-500/30">
                <div className="text-sm text-blue-300 mb-3 font-semibold flex items-center gap-2">
                  <LinkIcon className="w-5 h-5" />
                  {isSpanish ? '🔗 URLs API Generadas:' : '🔗 Generated API URLs:'}
                </div>
                <div className="space-y-2 text-xs font-mono">
                  <div className="p-2 bg-black/50 rounded border border-blue-500/10">
                    <div className="text-blue-300/60 mb-1">📍 Base:</div>
                    <div className="text-blue-400 break-all">
                      GET https://api.luxliqdaes.cloud/api/v1/proof-of-reserves/{newKeyData.apiKey}
                    </div>
                  </div>
                  <div className="p-2 bg-black/50 rounded border border-cyan-500/10">
                    <div className="text-cyan-300/60 mb-1">📊 Data:</div>
                    <div className="text-cyan-400 break-all">
                      GET https://api.luxliqdaes.cloud/api/v1/proof-of-reserves/{newKeyData.apiKey}/data
                    </div>
                  </div>
                  <div className="p-2 bg-black/50 rounded border border-green-500/10">
                    <div className="text-green-300/60 mb-1">⬇️ Download:</div>
                    <div className="text-green-400 break-all">
                      GET https://api.luxliqdaes.cloud/api/v1/proof-of-reserves/{newKeyData.apiKey}/download
                    </div>
                  </div>
                  <div className="p-2 bg-black/50 rounded border border-purple-500/10">
                    <div className="text-purple-300/60 mb-1">📈 Summary:</div>
                    <div className="text-purple-400 break-all">
                      GET https://api.luxliqdaes.cloud/api/v1/proof-of-reserves/{newKeyData.apiKey}/summary
                    </div>
                  </div>
                  <div className="p-2 bg-black/50 rounded border border-orange-500/10">
                    <div className="text-orange-300/60 mb-1">✅ Verify:</div>
                    <div className="text-orange-400 break-all">
                      GET https://api.luxliqdaes.cloud/api/v1/proof-of-reserves/{newKeyData.apiKey}/verify
                    </div>
                  </div>
                </div>
              </div>

              {/* Authentication Info */}
              <div className="bg-yellow-900/20 rounded-lg p-4 border border-yellow-500/30">
                <div className="text-sm text-yellow-300 mb-2 font-semibold">
                  {isSpanish ? '🔐 Ejemplo de Autenticación:' : '🔐 Authentication Example:'}
                </div>
                <pre className="text-xs text-yellow-300/80 font-mono bg-black/50 p-3 rounded overflow-x-auto">
{`curl -X GET \\
  'https://api.luxliqdaes.cloud/api/v1/proof-of-reserves/${newKeyData.apiKey}' \\
  -H 'Authorization: Bearer ${newKeyData.apiKey}' \\
  -H 'X-Secret-Key: ${newKeyData.secretKey.substring(0, 30)}...'`}
                </pre>
              </div>

              {/* Close Button */}
              <button
                onClick={() => {
                  setShowSecretModal(false);
                  setNewKeyData(null);
                }}
                className="w-full px-6 py-4 bg-green-500/20 border border-green-500 text-green-300 rounded-lg hover:bg-green-500/30 font-bold text-lg"
              >
                {isSpanish ? 'Entendido - Cerrar' : 'Understood - Close'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

