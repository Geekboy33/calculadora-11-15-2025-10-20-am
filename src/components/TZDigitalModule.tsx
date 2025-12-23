/**
 * TZ Digital Bank Transfer Module
 * API: https://banktransfer.tzdigitalpvtlimited.com
 * Transferencias USD y EUR vía REST API + Bearer Token
 */

import { useState, useEffect } from 'react';
import { 
  Send, Settings, History, DollarSign, Euro, CheckCircle, XCircle, 
  Clock, RefreshCw, Trash2, Copy, Eye, EyeOff, Wifi, WifiOff,
  ArrowRightLeft, FileText, Shield, Globe, AlertTriangle
} from 'lucide-react';
import { useLanguage } from '../lib/i18n';
import { 
  tzDigitalClient, 
  MoneyTransferPayload, 
  TZDigitalConfig, 
  TransferRecord,
  Currency 
} from '../lib/tz-digital-api';

export function TZDigitalModule() {
  const { language } = useLanguage();
  const isSpanish = language === 'es';

  // Estados
  const [config, setConfig] = useState<TZDigitalConfig>(tzDigitalClient.getConfig());
  const [transfers, setTransfers] = useState<TransferRecord[]>(tzDigitalClient.getTransfers());
  const [showConfig, setShowConfig] = useState(false);
  const [showToken, setShowToken] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'unknown' | 'connected' | 'error'>('unknown');
  const [activeTab, setActiveTab] = useState<'transfer' | 'history' | 'config'>('transfer');

  // Formulario de transferencia
  const [transferForm, setTransferForm] = useState<MoneyTransferPayload>({
    amount: 0,
    currency: 'USD',
    reference: '',
    beneficiary_name: '',
    beneficiary_account: '',
    beneficiary_bank: '',
    beneficiary_iban: '',
    beneficiary_swift: '',
    beneficiary_country: '',
    note: '',
    purpose: 'Treasury Transfer',
    channel: 'API2API',
  });

  // Configuración temporal
  const [tempConfig, setTempConfig] = useState({
    bearerToken: config.bearerToken,
    defaultSenderName: config.defaultSenderName,
    defaultSenderAccount: config.defaultSenderAccount,
  });

  // Estadísticas
  const stats = tzDigitalClient.getStats();

  // Cargar datos y auto-test
  useEffect(() => {
    const loadedConfig = tzDigitalClient.getConfig();
    setConfig(loadedConfig);
    setTransfers(tzDigitalClient.getTransfers());
    setTempConfig({
      bearerToken: loadedConfig.bearerToken,
      defaultSenderName: loadedConfig.defaultSenderName,
      defaultSenderAccount: loadedConfig.defaultSenderAccount,
    });
    
    // Auto-test de conexión si está configurado
    if (loadedConfig.isConfigured && loadedConfig.bearerToken) {
      setConnectionStatus('connected');
    }
  }, []);

  // Test de conexión
  const handleTestConnection = async () => {
    setIsLoading(true);
    const result = await tzDigitalClient.testConnection();
    setConnectionStatus(result.success ? 'connected' : 'error');
    setIsLoading(false);
    
    alert(isSpanish 
      ? `${result.success ? '✅' : '❌'} ${result.message}`
      : `${result.success ? '✅' : '❌'} ${result.message}`);
  };

  // Guardar configuración
  const handleSaveConfig = () => {
    tzDigitalClient.configure({
      bearerToken: tempConfig.bearerToken,
      defaultSenderName: tempConfig.defaultSenderName,
      defaultSenderAccount: tempConfig.defaultSenderAccount,
    });
    setConfig(tzDigitalClient.getConfig());
    setShowConfig(false);
    alert(isSpanish ? '✅ Configuración guardada' : '✅ Configuration saved');
  };

  // Generar referencia
  const handleGenerateReference = () => {
    const ref = tzDigitalClient.generateReference(transferForm.currency);
    setTransferForm({ ...transferForm, reference: ref });
  };

  // Enviar transferencia
  const handleSendTransfer = async () => {
    if (!tzDigitalClient.isConfigured()) {
      alert(isSpanish 
        ? '❌ Configura el Bearer Token primero' 
        : '❌ Configure Bearer Token first');
      setActiveTab('config');
      return;
    }

    if (transferForm.amount <= 0) {
      alert(isSpanish ? '❌ Ingresa un monto válido' : '❌ Enter a valid amount');
      return;
    }

    if (!transferForm.beneficiary_name) {
      alert(isSpanish ? '❌ Ingresa el nombre del beneficiario' : '❌ Enter beneficiary name');
      return;
    }

    setIsLoading(true);

    const payload: MoneyTransferPayload = {
      ...transferForm,
      reference: transferForm.reference || tzDigitalClient.generateReference(transferForm.currency),
      sender_name: config.defaultSenderName,
      sender_account: config.defaultSenderAccount,
      sender_bank: 'Digital Commercial Bank Ltd',
    };

    const result = await tzDigitalClient.sendMoney(payload, {
      idempotencyKey: payload.reference,
    });

    setTransfers(tzDigitalClient.getTransfers());
    setIsLoading(false);

    if (result.ok) {
      alert(isSpanish 
        ? `✅ Transferencia enviada exitosamente\n\nReferencia: ${payload.reference}\nMonto: ${payload.currency} ${payload.amount.toLocaleString()}`
        : `✅ Transfer sent successfully\n\nReference: ${payload.reference}\nAmount: ${payload.currency} ${payload.amount.toLocaleString()}`);
      
      // Limpiar formulario
      setTransferForm({
        ...transferForm,
        amount: 0,
        reference: '',
        beneficiary_name: '',
        beneficiary_account: '',
        beneficiary_bank: '',
        beneficiary_iban: '',
        beneficiary_swift: '',
        note: '',
      });
    } else {
      alert(isSpanish 
        ? `❌ Error en transferencia\n\n${result.error?.message}\n${result.error?.details || ''}`
        : `❌ Transfer error\n\n${result.error?.message}\n${result.error?.details || ''}`);
    }
  };

  // Copiar al portapapeles
  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0a0a0a] via-[#111] to-[#0a0a0a] text-white p-6">
      {/* Header */}
      <div className="max-w-6xl mx-auto">
        <div className="bg-gradient-to-r from-blue-900/30 to-cyan-900/30 border-2 border-blue-500/50 rounded-2xl p-6 mb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-xl flex items-center justify-center">
                <Globe className="w-8 h-8 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-white">TZ Digital API</h1>
                <p className="text-blue-300 text-sm">Bank Transfer Protocol • USD / EUR</p>
                <p className="text-xs text-gray-400 font-mono mt-1">
                  banktransfer.tzdigitalpvtlimited.com
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              {/* Estado de conexión */}
              <div className={`flex items-center gap-2 px-3 py-2 rounded-lg ${
                connectionStatus === 'connected' ? 'bg-emerald-500/20 text-emerald-400' :
                connectionStatus === 'error' ? 'bg-red-500/20 text-red-400' :
                'bg-gray-500/20 text-gray-400'
              }`}>
                {connectionStatus === 'connected' ? <Wifi className="w-4 h-4" /> :
                 connectionStatus === 'error' ? <WifiOff className="w-4 h-4" /> :
                 <Clock className="w-4 h-4" />}
                <span className="text-sm font-semibold">
                  {connectionStatus === 'connected' ? (isSpanish ? 'Conectado' : 'Connected') :
                   connectionStatus === 'error' ? (isSpanish ? 'Error' : 'Error') :
                   (isSpanish ? 'Sin probar' : 'Not tested')}
                </span>
              </div>
              <button
                onClick={handleTestConnection}
                disabled={isLoading || !config.bearerToken}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-500 transition-all disabled:opacity-50 flex items-center gap-2"
              >
                <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
                {isSpanish ? 'Test' : 'Test'}
              </button>
            </div>
          </div>

          {/* Estadísticas */}
          <div className="grid grid-cols-5 gap-4 mt-6">
            <div className="bg-black/30 rounded-lg p-3 text-center">
              <div className="text-2xl font-bold text-white">{stats.total}</div>
              <div className="text-xs text-gray-400">{isSpanish ? 'Total' : 'Total'}</div>
            </div>
            <div className="bg-black/30 rounded-lg p-3 text-center">
              <div className="text-2xl font-bold text-emerald-400">{stats.successful}</div>
              <div className="text-xs text-gray-400">{isSpanish ? 'Exitosas' : 'Successful'}</div>
            </div>
            <div className="bg-black/30 rounded-lg p-3 text-center">
              <div className="text-2xl font-bold text-red-400">{stats.failed}</div>
              <div className="text-xs text-gray-400">{isSpanish ? 'Fallidas' : 'Failed'}</div>
            </div>
            <div className="bg-black/30 rounded-lg p-3 text-center">
              <div className="text-lg font-bold text-green-400">USD {stats.totalUSD.toLocaleString()}</div>
              <div className="text-xs text-gray-400">{isSpanish ? 'Total USD' : 'Total USD'}</div>
            </div>
            <div className="bg-black/30 rounded-lg p-3 text-center">
              <div className="text-lg font-bold text-blue-400">EUR {stats.totalEUR.toLocaleString()}</div>
              <div className="text-xs text-gray-400">{isSpanish ? 'Total EUR' : 'Total EUR'}</div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6">
          <button
            onClick={() => setActiveTab('transfer')}
            className={`px-6 py-3 rounded-lg font-bold flex items-center gap-2 transition-all ${
              activeTab === 'transfer' 
                ? 'bg-gradient-to-r from-blue-600 to-cyan-600 text-white' 
                : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
            }`}
          >
            <Send className="w-5 h-5" />
            {isSpanish ? 'Nueva Transferencia' : 'New Transfer'}
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`px-6 py-3 rounded-lg font-bold flex items-center gap-2 transition-all ${
              activeTab === 'history' 
                ? 'bg-gradient-to-r from-blue-600 to-cyan-600 text-white' 
                : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
            }`}
          >
            <History className="w-5 h-5" />
            {isSpanish ? 'Historial' : 'History'} ({transfers.length})
          </button>
          <button
            onClick={() => setActiveTab('config')}
            className={`px-6 py-3 rounded-lg font-bold flex items-center gap-2 transition-all ${
              activeTab === 'config' 
                ? 'bg-gradient-to-r from-blue-600 to-cyan-600 text-white' 
                : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
            }`}
          >
            <Settings className="w-5 h-5" />
            {isSpanish ? 'Configuración' : 'Settings'}
            {!config.isConfigured && <AlertTriangle className="w-4 h-4 text-yellow-400" />}
          </button>
        </div>

        {/* Tab Content */}
        <div className="bg-gradient-to-br from-[#0d0d0d] to-[#1a1a1a] border border-gray-700 rounded-2xl p-6">
          
          {/* Nueva Transferencia */}
          {activeTab === 'transfer' && (
            <div className="space-y-6">
              <div className="flex items-center gap-3 mb-6">
                <ArrowRightLeft className="w-6 h-6 text-blue-400" />
                <h2 className="text-xl font-bold">{isSpanish ? 'Enviar Transferencia' : 'Send Transfer'}</h2>
              </div>

              {!config.isConfigured && (
                <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4 flex items-center gap-3">
                  <AlertTriangle className="w-6 h-6 text-yellow-400" />
                  <div>
                    <div className="font-semibold text-yellow-400">
                      {isSpanish ? 'Configuración Requerida' : 'Configuration Required'}
                    </div>
                    <div className="text-sm text-gray-400">
                      {isSpanish ? 'Configura el Bearer Token para enviar transferencias' : 'Configure Bearer Token to send transfers'}
                    </div>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-6">
                {/* Columna izquierda - Monto y Moneda */}
                <div className="space-y-4">
                  <div className="bg-black/30 rounded-xl p-4">
                    <label className="text-sm text-gray-400 mb-2 block">{isSpanish ? 'Moneda' : 'Currency'}</label>
                    <div className="flex gap-3">
                      <button
                        onClick={() => setTransferForm({ ...transferForm, currency: 'USD' })}
                        className={`flex-1 py-4 rounded-lg font-bold flex items-center justify-center gap-2 transition-all ${
                          transferForm.currency === 'USD' 
                            ? 'bg-green-600 text-white' 
                            : 'bg-gray-700 text-gray-400 hover:bg-gray-600'
                        }`}
                      >
                        <DollarSign className="w-6 h-6" />
                        USD
                      </button>
                      <button
                        onClick={() => setTransferForm({ ...transferForm, currency: 'EUR' })}
                        className={`flex-1 py-4 rounded-lg font-bold flex items-center justify-center gap-2 transition-all ${
                          transferForm.currency === 'EUR' 
                            ? 'bg-blue-600 text-white' 
                            : 'bg-gray-700 text-gray-400 hover:bg-gray-600'
                        }`}
                      >
                        <Euro className="w-6 h-6" />
                        EUR
                      </button>
                    </div>
                  </div>

                  <div className="bg-black/30 rounded-xl p-4">
                    <label className="text-sm text-gray-400 mb-2 block">{isSpanish ? 'Monto' : 'Amount'}</label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={transferForm.amount || ''}
                      onChange={e => setTransferForm({ ...transferForm, amount: parseFloat(e.target.value) || 0 })}
                      className="w-full px-4 py-4 bg-black/50 border border-gray-600 rounded-lg text-white text-2xl font-mono focus:outline-none focus:border-blue-500"
                      placeholder="0.00"
                    />
                    <div className="flex gap-2 mt-2">
                      {[10000, 50000, 100000, 500000].map(amt => (
                        <button
                          key={amt}
                          onClick={() => setTransferForm({ ...transferForm, amount: amt })}
                          className="px-3 py-1 bg-gray-700 text-gray-300 rounded text-xs hover:bg-gray-600"
                        >
                          {(amt / 1000)}K
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="bg-black/30 rounded-xl p-4">
                    <label className="text-sm text-gray-400 mb-2 block">{isSpanish ? 'Referencia' : 'Reference'}</label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={transferForm.reference}
                        onChange={e => setTransferForm({ ...transferForm, reference: e.target.value })}
                        className="flex-1 px-4 py-3 bg-black/50 border border-gray-600 rounded-lg text-white font-mono focus:outline-none focus:border-blue-500"
                        placeholder="DAES-USD-..."
                      />
                      <button
                        onClick={handleGenerateReference}
                        className="px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-500"
                      >
                        <RefreshCw className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                </div>

                {/* Columna derecha - Beneficiario */}
                <div className="space-y-4">
                  <div className="bg-black/30 rounded-xl p-4">
                    <label className="text-sm text-gray-400 mb-2 block">{isSpanish ? 'Beneficiario' : 'Beneficiary'}</label>
                    <input
                      type="text"
                      value={transferForm.beneficiary_name}
                      onChange={e => setTransferForm({ ...transferForm, beneficiary_name: e.target.value })}
                      className="w-full px-4 py-3 bg-black/50 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-blue-500 mb-3"
                      placeholder={isSpanish ? 'Nombre del beneficiario' : 'Beneficiary name'}
                    />
                    <input
                      type="text"
                      value={transferForm.beneficiary_account}
                      onChange={e => setTransferForm({ ...transferForm, beneficiary_account: e.target.value })}
                      className="w-full px-4 py-3 bg-black/50 border border-gray-600 rounded-lg text-white font-mono focus:outline-none focus:border-blue-500 mb-3"
                      placeholder={isSpanish ? 'Número de cuenta' : 'Account number'}
                    />
                    <input
                      type="text"
                      value={transferForm.beneficiary_bank}
                      onChange={e => setTransferForm({ ...transferForm, beneficiary_bank: e.target.value })}
                      className="w-full px-4 py-3 bg-black/50 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-blue-500"
                      placeholder={isSpanish ? 'Banco del beneficiario' : 'Beneficiary bank'}
                    />
                  </div>

                  {transferForm.currency === 'EUR' && (
                    <div className="bg-black/30 rounded-xl p-4">
                      <label className="text-sm text-gray-400 mb-2 block">IBAN / SWIFT</label>
                      <input
                        type="text"
                        value={transferForm.beneficiary_iban}
                        onChange={e => setTransferForm({ ...transferForm, beneficiary_iban: e.target.value })}
                        className="w-full px-4 py-3 bg-black/50 border border-gray-600 rounded-lg text-white font-mono focus:outline-none focus:border-blue-500 mb-3"
                        placeholder="IBAN"
                      />
                      <input
                        type="text"
                        value={transferForm.beneficiary_swift}
                        onChange={e => setTransferForm({ ...transferForm, beneficiary_swift: e.target.value })}
                        className="w-full px-4 py-3 bg-black/50 border border-gray-600 rounded-lg text-white font-mono focus:outline-none focus:border-blue-500"
                        placeholder="SWIFT/BIC"
                      />
                    </div>
                  )}

                  <div className="bg-black/30 rounded-xl p-4">
                    <label className="text-sm text-gray-400 mb-2 block">{isSpanish ? 'Nota / Propósito' : 'Note / Purpose'}</label>
                    <input
                      type="text"
                      value={transferForm.note}
                      onChange={e => setTransferForm({ ...transferForm, note: e.target.value })}
                      className="w-full px-4 py-3 bg-black/50 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-blue-500"
                      placeholder={isSpanish ? 'Concepto de la transferencia' : 'Transfer concept'}
                    />
                  </div>
                </div>
              </div>

              {/* Botón de envío */}
              <button
                onClick={handleSendTransfer}
                disabled={isLoading || !config.isConfigured || transferForm.amount <= 0}
                className="w-full py-5 bg-gradient-to-r from-blue-600 to-cyan-600 text-white rounded-xl font-bold text-lg hover:from-blue-500 hover:to-cyan-500 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3"
              >
                {isLoading ? (
                  <>
                    <RefreshCw className="w-6 h-6 animate-spin" />
                    {isSpanish ? 'Enviando...' : 'Sending...'}
                  </>
                ) : (
                  <>
                    <Send className="w-6 h-6" />
                    {isSpanish ? 'Enviar Transferencia' : 'Send Transfer'} {transferForm.currency} {transferForm.amount.toLocaleString()}
                  </>
                )}
              </button>
            </div>
          )}

          {/* Historial */}
          {activeTab === 'history' && (
            <div>
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold flex items-center gap-3">
                  <History className="w-6 h-6 text-blue-400" />
                  {isSpanish ? 'Historial de Transferencias' : 'Transfer History'}
                </h2>
                {transfers.length > 0 && (
                  <button
                    onClick={() => {
                      if (confirm(isSpanish ? '¿Limpiar historial?' : 'Clear history?')) {
                        tzDigitalClient.clearTransfers();
                        setTransfers([]);
                      }
                    }}
                    className="px-4 py-2 bg-red-600/20 text-red-400 rounded-lg hover:bg-red-600/30 flex items-center gap-2"
                  >
                    <Trash2 className="w-4 h-4" />
                    {isSpanish ? 'Limpiar' : 'Clear'}
                  </button>
                )}
              </div>

              {transfers.length === 0 ? (
                <div className="text-center py-12 text-gray-400">
                  <FileText className="w-16 h-16 mx-auto mb-4 opacity-30" />
                  <p>{isSpanish ? 'No hay transferencias registradas' : 'No transfers recorded'}</p>
                </div>
              ) : (
                <div className="space-y-3 max-h-[500px] overflow-y-auto">
                  {transfers.map((t, idx) => (
                    <div 
                      key={idx}
                      className={`bg-black/30 rounded-xl p-4 border ${
                        t.status === 'success' ? 'border-emerald-500/30' :
                        t.status === 'failed' ? 'border-red-500/30' :
                        'border-gray-600'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          {t.status === 'success' ? (
                            <CheckCircle className="w-6 h-6 text-emerald-400" />
                          ) : t.status === 'failed' ? (
                            <XCircle className="w-6 h-6 text-red-400" />
                          ) : (
                            <Clock className="w-6 h-6 text-yellow-400" />
                          )}
                          <div>
                            <div className="font-bold text-white">
                              {t.payload.currency} {t.payload.amount.toLocaleString()}
                            </div>
                            <div className="text-sm text-gray-400">{t.payload.beneficiary_name}</div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-mono text-xs text-gray-400">{t.payload.reference}</div>
                          <div className="text-xs text-gray-500">
                            {new Date(t.timestamp).toLocaleString()}
                          </div>
                        </div>
                      </div>
                      {t.result.error && (
                        <div className="mt-2 text-xs text-red-400 bg-red-500/10 p-2 rounded">
                          {t.result.error.message}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Configuración */}
          {activeTab === 'config' && (
            <div className="space-y-6">
              <div className="flex items-center gap-3 mb-6">
                <Settings className="w-6 h-6 text-blue-400" />
                <h2 className="text-xl font-bold">{isSpanish ? 'Configuración API' : 'API Configuration'}</h2>
              </div>

              <div className="bg-black/30 rounded-xl p-6">
                <div className="flex items-center gap-3 mb-4">
                  <Shield className="w-5 h-5 text-blue-400" />
                  <label className="text-white font-semibold">Bearer Token</label>
                </div>
                <div className="flex gap-2">
                  <input
                    type={showToken ? 'text' : 'password'}
                    value={tempConfig.bearerToken}
                    onChange={e => setTempConfig({ ...tempConfig, bearerToken: e.target.value })}
                    className="flex-1 px-4 py-3 bg-black/50 border border-gray-600 rounded-lg text-white font-mono focus:outline-none focus:border-blue-500"
                    placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
                  />
                  <button
                    onClick={() => setShowToken(!showToken)}
                    className="px-4 py-3 bg-gray-700 text-white rounded-lg hover:bg-gray-600"
                  >
                    {showToken ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  {isSpanish 
                    ? 'Token de autorización para la API de TZ Digital' 
                    : 'Authorization token for TZ Digital API'}
                </p>
              </div>

              <div className="bg-black/30 rounded-xl p-6">
                <label className="text-white font-semibold block mb-3">{isSpanish ? 'Remitente por Defecto' : 'Default Sender'}</label>
                <input
                  type="text"
                  value={tempConfig.defaultSenderName}
                  onChange={e => setTempConfig({ ...tempConfig, defaultSenderName: e.target.value })}
                  className="w-full px-4 py-3 bg-black/50 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-blue-500 mb-3"
                  placeholder={isSpanish ? 'Nombre del banco/empresa' : 'Bank/Company name'}
                />
                <input
                  type="text"
                  value={tempConfig.defaultSenderAccount}
                  onChange={e => setTempConfig({ ...tempConfig, defaultSenderAccount: e.target.value })}
                  className="w-full px-4 py-3 bg-black/50 border border-gray-600 rounded-lg text-white font-mono focus:outline-none focus:border-blue-500"
                  placeholder={isSpanish ? 'Cuenta del remitente' : 'Sender account'}
                />
              </div>

              <div className="bg-blue-900/20 border border-blue-500/30 rounded-xl p-4">
                <h4 className="font-semibold text-blue-400 mb-2">{isSpanish ? 'Endpoint API' : 'API Endpoint'}</h4>
                <code className="text-sm text-gray-300 font-mono bg-black/30 px-3 py-2 rounded block">
                  POST https://banktransfer.tzdigitalpvtlimited.com/api/transactions
                </code>
              </div>

              <button
                onClick={handleSaveConfig}
                className="w-full py-4 bg-gradient-to-r from-blue-600 to-cyan-600 text-white rounded-xl font-bold hover:from-blue-500 hover:to-cyan-500 transition-all flex items-center justify-center gap-2"
              >
                <CheckCircle className="w-5 h-5" />
                {isSpanish ? 'Guardar Configuración' : 'Save Configuration'}
              </button>
            </div>
          )}
        </div>

        {/* Footer info */}
        <div className="mt-6 text-center text-xs text-gray-500">
          <p>TZ Digital Bank Transfer API • REST Protocol • Bearer Token Auth</p>
          <p className="mt-1">Digital Commercial Bank Ltd • DAES Platform</p>
        </div>
      </div>
    </div>
  );
}

export default TZDigitalModule;

