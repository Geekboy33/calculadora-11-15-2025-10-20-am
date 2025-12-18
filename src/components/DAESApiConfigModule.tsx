/**
 * DAES API Configuration Module
 * Configuración de conexión con https://luxliqdaes.cloud/
 */

import { useState, useEffect } from 'react';
import {
  Settings,
  Key,
  Server,
  RefreshCw,
  Check,
  X,
  Shield,
  Wallet,
  ArrowRightLeft,
  Clock,
  AlertTriangle,
  Copy,
  Eye,
  EyeOff,
  Zap,
  Globe,
  Database,
  Lock,
  CheckCircle2,
  XCircle,
  Activity,
  DollarSign
} from 'lucide-react';
import { daesApiService, DAESApiConfig, DAESAccount, DAESVerificationResult } from '../lib/daes-api';
import { custodyStore, CustodyAccount } from '../lib/custody-store';

export function DAESApiConfigModule() {
  const [config, setConfig] = useState<DAESApiConfig | null>(null);
  const [accounts, setAccounts] = useState<DAESAccount[]>([]);
  const [localAccounts, setLocalAccounts] = useState<CustodyAccount[]>([]);
  const [isConfigured, setIsConfigured] = useState(false);
  const [showApiKey, setShowApiKey] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [lastSync, setLastSync] = useState<Date | null>(null);
  
  // Form
  const [apiKey, setApiKey] = useState('');
  const [secretKey, setSecretKey] = useState('');
  const [environment, setEnvironment] = useState<'sandbox' | 'production'>('sandbox');
  const [autoSync, setAutoSync] = useState(true);
  const [syncInterval, setSyncInterval] = useState(5);
  
  // Verificación de fondos
  const [selectedAccount, setSelectedAccount] = useState('');
  const [verifyAmount, setVerifyAmount] = useState('1000');
  const [verifying, setVerifying] = useState(false);
  const [verifyResult, setVerifyResult] = useState<DAESVerificationResult | null>(null);
  
  useEffect(() => {
    const storedConfig = daesApiService.getConfig();
    if (storedConfig) {
      setConfig(storedConfig);
      setApiKey(storedConfig.apiKey);
      setSecretKey(storedConfig.secretKey || '');
      setEnvironment(storedConfig.environment);
      setAutoSync(storedConfig.autoSync);
      setSyncInterval(storedConfig.syncInterval);
      setIsConfigured(true);
    }
    
    setAccounts(daesApiService.getCachedAccounts());
    
    const unsub = custodyStore.subscribe(setLocalAccounts);
    
    return () => {
      unsub();
    };
  }, []);
  
  // Guardar configuración
  const handleSaveConfig = () => {
    const newConfig: DAESApiConfig = {
      apiKey,
      secretKey: secretKey || undefined,
      environment,
      autoSync,
      syncInterval,
    };
    
    daesApiService.configure(newConfig);
    setConfig(newConfig);
    setIsConfigured(true);
    
    alert('✅ Configuración guardada exitosamente');
  };
  
  // Probar conexión
  const handleTestConnection = async () => {
    setTesting(true);
    setTestResult(null);
    
    // Guardar config temporalmente para probar
    if (!isConfigured) {
      daesApiService.configure({
        apiKey,
        secretKey: secretKey || undefined,
        environment,
        autoSync: false,
        syncInterval: 5,
      });
    }
    
    const result = await daesApiService.testConnection();
    setTestResult(result);
    setTesting(false);
  };
  
  // Sincronizar cuentas
  const handleSync = async () => {
    setSyncing(true);
    
    try {
      await daesApiService.syncAccounts();
      const updatedAccounts = await daesApiService.getAccounts();
      setAccounts(updatedAccounts);
      setLastSync(new Date());
    } catch (error) {
      console.error('Error sincronizando:', error);
    }
    
    setSyncing(false);
  };
  
  // Verificar fondos
  const handleVerifyFunds = async () => {
    if (!selectedAccount || !verifyAmount) return;
    
    setVerifying(true);
    setVerifyResult(null);
    
    const account = localAccounts.find(a => a.id === selectedAccount);
    
    const result = await daesApiService.verifyFunds(
      selectedAccount,
      parseFloat(verifyAmount),
      account?.currency || 'USD',
      'manual_verification'
    );
    
    setVerifyResult(result);
    setVerifying(false);
  };
  
  // Copiar al portapapeles
  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    alert('✅ Copiado al portapapeles');
  };
  
  return (
    <div className="min-h-screen bg-[#0a0a0f] p-4 md:p-6">
      {/* Header */}
      <div className="max-w-6xl mx-auto mb-8">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl shadow-lg shadow-blue-500/30">
            <Server className="w-8 h-8 text-white" />
          </div>
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-white">
              DAES API Configuration
            </h1>
            <p className="text-gray-400">
              Conexión con{' '}
              <a href="https://luxliqdaes.cloud/" target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline">
                https://luxliqdaes.cloud/
              </a>
            </p>
          </div>
        </div>
      </div>
      
      <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Panel de Configuración */}
        <div className="bg-gradient-to-br from-blue-500/10 to-indigo-500/10 border border-blue-500/30 rounded-2xl p-6">
          <h2 className="text-xl font-bold text-blue-400 mb-6 flex items-center gap-2">
            <Key className="w-5 h-5" />
            Configuración de API
          </h2>
          
          <div className="space-y-4">
            {/* API Key */}
            <div>
              <label className="block text-sm text-gray-400 mb-2">API Key</label>
              <div className="relative">
                <input
                  type={showApiKey ? 'text' : 'password'}
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder="daes_live_xxxxxxxxxxxxxxxx"
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white font-mono pr-20"
                />
                <div className="absolute right-2 top-1/2 -translate-y-1/2 flex gap-1">
                  <button
                    onClick={() => setShowApiKey(!showApiKey)}
                    className="p-2 hover:bg-white/10 rounded"
                  >
                    {showApiKey ? <EyeOff className="w-4 h-4 text-gray-400" /> : <Eye className="w-4 h-4 text-gray-400" />}
                  </button>
                  <button
                    onClick={() => copyToClipboard(apiKey)}
                    className="p-2 hover:bg-white/10 rounded"
                  >
                    <Copy className="w-4 h-4 text-gray-400" />
                  </button>
                </div>
              </div>
            </div>
            
            {/* Secret Key */}
            <div>
              <label className="block text-sm text-gray-400 mb-2">Secret Key (Opcional)</label>
              <input
                type="password"
                value={secretKey}
                onChange={(e) => setSecretKey(e.target.value)}
                placeholder="Para firma HMAC de peticiones"
                className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white font-mono"
              />
            </div>
            
            {/* Environment */}
            <div>
              <label className="block text-sm text-gray-400 mb-2">Entorno</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => setEnvironment('sandbox')}
                  className={`p-3 rounded-lg border transition-all flex items-center justify-center gap-2 ${
                    environment === 'sandbox'
                      ? 'bg-amber-500/20 border-amber-500 text-amber-400'
                      : 'bg-white/5 border-white/10 text-gray-400 hover:bg-white/10'
                  }`}
                >
                  <Zap className="w-4 h-4" />
                  Sandbox
                </button>
                <button
                  onClick={() => setEnvironment('production')}
                  className={`p-3 rounded-lg border transition-all flex items-center justify-center gap-2 ${
                    environment === 'production'
                      ? 'bg-green-500/20 border-green-500 text-green-400'
                      : 'bg-white/5 border-white/10 text-gray-400 hover:bg-white/10'
                  }`}
                >
                  <Globe className="w-4 h-4" />
                  Production
                </button>
              </div>
            </div>
            
            {/* Auto Sync */}
            <div className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
              <div className="flex items-center gap-2">
                <RefreshCw className="w-4 h-4 text-gray-400" />
                <span className="text-white">Sincronización automática</span>
              </div>
              <button
                onClick={() => setAutoSync(!autoSync)}
                className={`w-12 h-6 rounded-full transition-all ${
                  autoSync ? 'bg-green-500' : 'bg-gray-600'
                }`}
              >
                <div className={`w-5 h-5 bg-white rounded-full transition-all ${
                  autoSync ? 'translate-x-6' : 'translate-x-0.5'
                }`} />
              </button>
            </div>
            
            {/* Sync Interval */}
            {autoSync && (
              <div>
                <label className="block text-sm text-gray-400 mb-2">
                  Intervalo de sincronización: {syncInterval} minutos
                </label>
                <input
                  type="range"
                  min={1}
                  max={60}
                  value={syncInterval}
                  onChange={(e) => setSyncInterval(parseInt(e.target.value))}
                  className="w-full"
                />
              </div>
            )}
            
            {/* Botones */}
            <div className="flex gap-3 pt-4">
              <button
                onClick={handleTestConnection}
                disabled={testing || !apiKey}
                className="flex-1 py-3 rounded-lg bg-white/10 text-gray-400 hover:bg-white/20 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {testing ? (
                  <RefreshCw className="w-5 h-5 animate-spin" />
                ) : (
                  <Activity className="w-5 h-5" />
                )}
                Probar Conexión
              </button>
              <button
                onClick={handleSaveConfig}
                disabled={!apiKey}
                className="flex-1 py-3 rounded-lg bg-gradient-to-r from-blue-500 to-indigo-500 text-white font-bold hover:from-blue-400 hover:to-indigo-400 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
              >
                <Check className="w-5 h-5" />
                Guardar
              </button>
            </div>
            
            {/* Resultado de prueba */}
            {testResult && (
              <div className={`p-4 rounded-lg ${
                testResult.success 
                  ? 'bg-green-500/10 border border-green-500/30' 
                  : 'bg-red-500/10 border border-red-500/30'
              }`}>
                <div className="flex items-center gap-2">
                  {testResult.success ? (
                    <CheckCircle2 className="w-5 h-5 text-green-400" />
                  ) : (
                    <XCircle className="w-5 h-5 text-red-400" />
                  )}
                  <span className={testResult.success ? 'text-green-400' : 'text-red-400'}>
                    {testResult.message}
                  </span>
                </div>
              </div>
            )}
          </div>
          
          {/* Estado actual */}
          <div className="mt-6 pt-6 border-t border-white/10">
            <h3 className="text-sm font-bold text-gray-400 mb-3">Estado de Conexión</h3>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-gray-400">Configurado</span>
                <span className={isConfigured ? 'text-green-400' : 'text-red-400'}>
                  {isConfigured ? '● Sí' : '○ No'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-400">Entorno</span>
                <span className={environment === 'production' ? 'text-green-400' : 'text-amber-400'}>
                  {environment === 'production' ? 'Producción' : 'Sandbox'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-400">Última sincronización</span>
                <span className="text-white">
                  {lastSync ? lastSync.toLocaleTimeString() : 'Nunca'}
                </span>
              </div>
            </div>
          </div>
        </div>
        
        {/* Panel de Verificación de Fondos */}
        <div className="bg-gradient-to-br from-green-500/10 to-emerald-500/10 border border-green-500/30 rounded-2xl p-6">
          <h2 className="text-xl font-bold text-green-400 mb-6 flex items-center gap-2">
            <DollarSign className="w-5 h-5" />
            Verificación de Fondos
          </h2>
          
          <div className="space-y-4">
            {/* Seleccionar cuenta */}
            <div>
              <label className="block text-sm text-gray-400 mb-2">Cuenta Custodio</label>
              <select
                value={selectedAccount}
                onChange={(e) => setSelectedAccount(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white"
              >
                <option value="">Seleccionar cuenta...</option>
                {localAccounts.map(acc => (
                  <option key={acc.id} value={acc.id}>
                    {acc.accountName} - {acc.currency} {acc.totalBalance.toLocaleString()}
                  </option>
                ))}
              </select>
            </div>
            
            {/* Monto a verificar */}
            <div>
              <label className="block text-sm text-gray-400 mb-2">Monto a Verificar</label>
              <input
                type="number"
                value={verifyAmount}
                onChange={(e) => setVerifyAmount(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white text-lg font-bold"
              />
            </div>
            
            {/* Botón verificar */}
            <button
              onClick={handleVerifyFunds}
              disabled={verifying || !selectedAccount || !verifyAmount || !isConfigured}
              className="w-full py-4 rounded-xl bg-gradient-to-r from-green-500 to-emerald-500 text-black font-bold hover:from-green-400 hover:to-emerald-400 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {verifying ? (
                <>
                  <RefreshCw className="w-5 h-5 animate-spin" />
                  Verificando...
                </>
              ) : (
                <>
                  <Shield className="w-5 h-5" />
                  Verificar Fondos en DAES
                </>
              )}
            </button>
            
            {/* Resultado de verificación */}
            {verifyResult && (
              <div className={`p-4 rounded-xl ${
                verifyResult.sufficientFunds 
                  ? 'bg-green-500/10 border border-green-500/30' 
                  : 'bg-red-500/10 border border-red-500/30'
              }`}>
                <div className="flex items-center gap-2 mb-3">
                  {verifyResult.sufficientFunds ? (
                    <CheckCircle2 className="w-6 h-6 text-green-400" />
                  ) : (
                    <XCircle className="w-6 h-6 text-red-400" />
                  )}
                  <span className={`font-bold ${verifyResult.sufficientFunds ? 'text-green-400' : 'text-red-400'}`}>
                    {verifyResult.message}
                  </span>
                </div>
                
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-400">Monto solicitado:</span>
                    <span className="text-white">{verifyResult.requestedAmount.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Disponible:</span>
                    <span className="text-white">{verifyResult.availableBalance.toLocaleString()}</span>
                  </div>
                  {verifyResult.holdId && (
                    <div className="flex justify-between">
                      <span className="text-gray-400">Hold ID:</span>
                      <span className="text-green-400 font-mono text-xs">{verifyResult.holdId}</span>
                    </div>
                  )}
                  {verifyResult.signature && (
                    <div className="flex justify-between">
                      <span className="text-gray-400">Firma:</span>
                      <span className="text-blue-400 font-mono text-xs truncate max-w-[200px]">
                        {verifyResult.signature}
                      </span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="text-gray-400">Timestamp:</span>
                    <span className="text-white text-xs">{new Date(verifyResult.timestamp).toLocaleString()}</span>
                  </div>
                </div>
              </div>
            )}
          </div>
          
          {/* Info */}
          <div className="mt-6 p-4 bg-blue-500/10 border border-blue-500/30 rounded-lg">
            <div className="flex items-start gap-2">
              <Shield className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-blue-400 font-bold text-sm mb-1">Verificación Segura</p>
                <p className="text-blue-300/70 text-xs">
                  Los fondos se verifican en tiempo real contra el servidor DAES.
                  En modo sandbox, se utilizan datos simulados.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Cuentas Sincronizadas */}
      <div className="max-w-6xl mx-auto mt-6">
        <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <Database className="w-5 h-5 text-purple-400" />
              Cuentas Custodio Sincronizadas
            </h2>
            <button
              onClick={handleSync}
              disabled={syncing || !isConfigured}
              className="px-4 py-2 bg-purple-500/20 border border-purple-500/50 text-purple-400 rounded-lg hover:bg-purple-500/30 transition-all disabled:opacity-50 flex items-center gap-2"
            >
              <RefreshCw className={`w-4 h-4 ${syncing ? 'animate-spin' : ''}`} />
              {syncing ? 'Sincronizando...' : 'Sincronizar'}
            </button>
          </div>
          
          {localAccounts.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {localAccounts.map(account => (
                <div 
                  key={account.id}
                  className="bg-gradient-to-br from-purple-500/10 to-indigo-500/10 border border-purple-500/20 rounded-xl p-4"
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-purple-400 font-bold">{account.accountName}</span>
                    <span className="text-xs text-gray-500">{account.currency}</span>
                  </div>
                  <div className="text-2xl font-bold text-white mb-2">
                    {account.currency} {account.totalBalance.toLocaleString()}
                  </div>
                  <div className="flex items-center justify-between text-xs text-gray-400">
                    <span>Disponible: {account.availableBalance.toLocaleString()}</span>
                    <span className="px-2 py-0.5 bg-green-500/20 text-green-400 rounded">
                      ● Activa
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 text-gray-500">
              <Wallet className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>No hay cuentas custodio</p>
              <p className="text-sm">Cree cuentas en el módulo "Cuentas Custodio"</p>
            </div>
          )}
        </div>
      </div>
      
      {/* Información de API */}
      <div className="max-w-6xl mx-auto mt-6">
        <div className="bg-gradient-to-r from-blue-500/10 to-indigo-500/10 border border-blue-500/30 rounded-xl p-6">
          <h3 className="text-lg font-bold text-blue-400 mb-4 flex items-center gap-2">
            <Globe className="w-5 h-5" />
            Endpoints de API DAES
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div className="bg-black/30 rounded-lg p-3">
              <div className="text-green-400 font-mono text-xs">GET</div>
              <div className="text-white font-mono">/api/v1/accounts</div>
              <div className="text-gray-400 text-xs mt-1">Obtener cuentas custodio</div>
            </div>
            <div className="bg-black/30 rounded-lg p-3">
              <div className="text-green-400 font-mono text-xs">GET</div>
              <div className="text-white font-mono">/api/v1/balance/:id</div>
              <div className="text-gray-400 text-xs mt-1">Obtener balance de cuenta</div>
            </div>
            <div className="bg-black/30 rounded-lg p-3">
              <div className="text-amber-400 font-mono text-xs">POST</div>
              <div className="text-white font-mono">/api/v1/verify-funds</div>
              <div className="text-gray-400 text-xs mt-1">Verificar fondos disponibles</div>
            </div>
            <div className="bg-black/30 rounded-lg p-3">
              <div className="text-amber-400 font-mono text-xs">POST</div>
              <div className="text-white font-mono">/api/v1/fund-card</div>
              <div className="text-gray-400 text-xs mt-1">Transferir fondos a tarjeta</div>
            </div>
          </div>
          
          <div className="mt-4 text-xs text-blue-300/70">
            <p><strong>Base URL:</strong> https://luxliqdaes.cloud</p>
            <p><strong>Headers requeridos:</strong> X-DAES-API-Key, X-DAES-Timestamp, X-DAES-Signature</p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default DAESApiConfigModule;

