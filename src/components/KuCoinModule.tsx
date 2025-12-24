/**
 * KuCoin API Module - Professional Integration
 * 
 * Features:
 * - REST API para ejecución (Cuentas, Órdenes, Retiros)
 * - WebSocket (Pub/Sub) para monitoreo en tiempo real
 * - Flujo completo: Fiat USD → USDT → Withdrawal
 * - Auto-conversión cuando detecta depósitos USD
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  Settings, RefreshCw, Send, Wallet, ArrowRightLeft, History,
  CheckCircle, XCircle, Clock, AlertTriangle, Eye, EyeOff,
  Trash2, Download, DollarSign, Coins, Globe, Shield, Zap,
  ChevronRight, Terminal, FileText, ExternalLink, Radio,
  Wifi, WifiOff, Play, Square, Bell, Activity, Server, Database
} from 'lucide-react';
import { useLanguage } from '../lib/i18n';
import {
  kucoinClient,
  KuCoinConfig,
  FiatToUSDTFlow,
  FlowOperation,
  SUPPORTED_NETWORKS,
  NetworkType,
  KuCoinAccount,
  API_ENDPOINTS,
  WS_CHANNELS,
  REST_ENDPOINTS,
  EnvironmentType
} from '../lib/kucoin-api';
import jsPDF from 'jspdf';

export default function KuCoinModule() {
  const { language } = useLanguage();
  const isSpanish = language === 'es';

  // Estados
  const [activeTab, setActiveTab] = useState<'convert' | 'websocket' | 'history' | 'config' | 'docs'>('convert');
  const [config, setConfig] = useState<KuCoinConfig>(kucoinClient.getConfig());
  const [flows, setFlows] = useState<FiatToUSDTFlow[]>(kucoinClient.getFlows());
  const [events, setEvents] = useState<FlowOperation[]>(kucoinClient.getEvents());
  const [isLoading, setIsLoading] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'untested' | 'connected' | 'error'>('untested');
  const [wsStatus, setWsStatus] = useState<'disconnected' | 'connecting' | 'connected'>('disconnected');
  const [showPassphrase, setShowPassphrase] = useState(false);
  const [accounts, setAccounts] = useState<KuCoinAccount[]>([]);
  const [currentOperations, setCurrentOperations] = useState<FlowOperation[]>([]);
  const [autoConversionEnabled, setAutoConversionEnabled] = useState(false);
  const eventsContainerRef = useRef<HTMLDivElement>(null);

  // Formulario de configuración
  const [tempConfig, setTempConfig] = useState({
    apiKey: config.apiKey,
    apiSecret: config.apiSecret,
    passphrase: config.passphrase,
    environment: config.environment || 'production' as EnvironmentType,
  });

  // Formulario de conversión
  const [convertForm, setConvertForm] = useState({
    usdAmount: '',
    destAddress: '',
    network: 'TRC20' as NetworkType,
  });

  // Auto-conversión config
  const [autoConfig, setAutoConfig] = useState({
    destAddress: '',
    network: 'TRC20' as NetworkType,
  });

  // Cargar datos iniciales y configurar listeners
  useEffect(() => {
    const loadedConfig = kucoinClient.getConfig();
    setConfig(loadedConfig);
    setFlows(kucoinClient.getFlows());
    setEvents(kucoinClient.getEvents());
    setTempConfig({
      apiKey: loadedConfig.apiKey,
      apiSecret: loadedConfig.apiSecret,
      passphrase: loadedConfig.passphrase,
      environment: loadedConfig.environment || 'production',
    });

    // Event listeners
    const handleEvent = (event: FlowOperation) => {
      setEvents(kucoinClient.getEvents());
    };

    const handleWsConnected = () => {
      setWsStatus('connected');
    };

    const handleWsDisconnected = () => {
      setWsStatus('disconnected');
    };

    const handleFlowComplete = (flow: FiatToUSDTFlow) => {
      setFlows(kucoinClient.getFlows());
    };

    kucoinClient.on('event', handleEvent);
    kucoinClient.on('ws:connected', handleWsConnected);
    kucoinClient.on('ws:disconnected', handleWsDisconnected);
    kucoinClient.on('flow:complete', handleFlowComplete);

    // Check WebSocket status
    if (kucoinClient.isWebSocketConnected()) {
      setWsStatus('connected');
    }

    return () => {
      kucoinClient.off('event', handleEvent);
      kucoinClient.off('ws:connected', handleWsConnected);
      kucoinClient.off('ws:disconnected', handleWsDisconnected);
      kucoinClient.off('flow:complete', handleFlowComplete);
    };
  }, []);

  // Auto-scroll events
  useEffect(() => {
    if (eventsContainerRef.current) {
      eventsContainerRef.current.scrollTop = 0;
    }
  }, [events]);

  // Guardar configuración
  const handleSaveConfig = () => {
    kucoinClient.setConfig(
      tempConfig.apiKey,
      tempConfig.apiSecret,
      tempConfig.passphrase,
      tempConfig.environment
    );
    setConfig(kucoinClient.getConfig());
    alert(isSpanish ? '✓ Configuración guardada' : '✓ Configuration saved');
  };

  // Test de conexión REST
  const handleTestConnection = async () => {
    if (!config.isConfigured) {
      alert(isSpanish 
        ? '❌ Configura las credenciales primero' 
        : '❌ Configure credentials first');
      return;
    }

    setIsLoading(true);
    try {
      const result = await kucoinClient.testConnection();
      if (result.success) {
        setConnectionStatus('connected');
        setAccounts(result.accounts || []);
        alert(isSpanish 
          ? `✓ ${result.message}` 
          : `✓ ${result.message}`);
      } else {
        setConnectionStatus('error');
        alert(`❌ ${result.message}`);
      }
    } catch (error: any) {
      setConnectionStatus('error');
      alert(`❌ Error: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  // Test WebSocket
  const handleTestWebSocket = async () => {
    if (!config.isConfigured) {
      alert(isSpanish 
        ? '❌ Configura las credenciales primero' 
        : '❌ Configure credentials first');
      return;
    }

    setWsStatus('connecting');
    try {
      const result = await kucoinClient.testWebSocket();
      if (result.success) {
        setWsStatus('connected');
      } else {
        setWsStatus('disconnected');
        alert(`❌ ${result.message}`);
      }
    } catch (error: any) {
      setWsStatus('disconnected');
      alert(`❌ Error: ${error.message}`);
    }
  };

  // Conectar/Desconectar WebSocket
  const handleToggleWebSocket = async () => {
    if (wsStatus === 'connected') {
      kucoinClient.disconnectWebSocket();
      setWsStatus('disconnected');
      setAutoConversionEnabled(false);
    } else {
      setWsStatus('connecting');
      try {
        await kucoinClient.connectWebSocket();
        await kucoinClient.subscribe(WS_CHANNELS.balance, true);
        setWsStatus('connected');
      } catch (error: any) {
        setWsStatus('disconnected');
        alert(`❌ Error: ${error.message}`);
      }
    }
  };

  // Activar auto-conversión
  const handleToggleAutoConversion = async () => {
    if (autoConversionEnabled) {
      setAutoConversionEnabled(false);
      return;
    }

    if (!autoConfig.destAddress) {
      alert(isSpanish 
        ? '❌ Configura la dirección de destino' 
        : '❌ Configure destination address');
      return;
    }

    try {
      await kucoinClient.setupAutoConversion(
        autoConfig.destAddress,
        autoConfig.network,
        (op) => setCurrentOperations(prev => [...prev, op])
      );
      setAutoConversionEnabled(true);
    } catch (error: any) {
      alert(`❌ Error: ${error.message}`);
    }
  };

  // Ejecutar conversión manual
  const handleExecuteConversion = async () => {
    if (!config.isConfigured) {
      alert(isSpanish 
        ? '❌ Configura las credenciales primero' 
        : '❌ Configure credentials first');
      setActiveTab('config');
      return;
    }

    if (!convertForm.usdAmount || parseFloat(convertForm.usdAmount) <= 0) {
      alert(isSpanish ? '❌ Ingresa un monto válido' : '❌ Enter a valid amount');
      return;
    }

    if (!convertForm.destAddress) {
      alert(isSpanish 
        ? '❌ Ingresa la dirección de destino USDT' 
        : '❌ Enter destination USDT address');
      return;
    }

    const confirmed = confirm(isSpanish
      ? `¿Confirmar conversión de ${convertForm.usdAmount} USD a USDT y envío a ${convertForm.destAddress.slice(0, 15)}...?`
      : `Confirm conversion of ${convertForm.usdAmount} USD to USDT and send to ${convertForm.destAddress.slice(0, 15)}...?`
    );

    if (!confirmed) return;

    setIsLoading(true);
    setCurrentOperations([]);

    try {
      const flow = await kucoinClient.executeFiatToUSDTFlow(
        convertForm.usdAmount,
        convertForm.destAddress,
        convertForm.network,
        (operation) => {
          setCurrentOperations(prev => [...prev, operation]);
        }
      );

      setFlows(kucoinClient.getFlows());

      if (flow.status === 'completed') {
        alert(isSpanish
          ? `✓ ¡Conversión completada!\nUSDT enviado: ${flow.usdtReceived}\nID de retiro: ${flow.withdrawalId}`
          : `✓ Conversion completed!\nUSDT sent: ${flow.usdtReceived}\nWithdrawal ID: ${flow.withdrawalId}`
        );
        setConvertForm({
          usdAmount: '',
          destAddress: '',
          network: 'TRC20',
        });
      } else {
        alert(isSpanish
          ? `❌ Error en la conversión: ${flow.error}`
          : `❌ Conversion error: ${flow.error}`
        );
      }
    } catch (error: any) {
      alert(`❌ Error: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  // Generar PDF
  const generateFlowPDF = (flow: FiatToUSDTFlow) => {
    const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const pageWidth = pdf.internal.pageSize.getWidth();
    const margin = 15;
    let y = margin;

    // Header negro
    pdf.setFillColor(0, 0, 0);
    pdf.rect(0, 0, pageWidth, 50, 'F');

    pdf.setTextColor(0, 200, 100);
    pdf.setFontSize(18);
    pdf.setFont('helvetica', 'bold');
    pdf.text('KUCOIN CONVERSION RECEIPT', pageWidth / 2, 20, { align: 'center' });

    pdf.setTextColor(255, 255, 255);
    pdf.setFontSize(10);
    pdf.setFont('helvetica', 'normal');
    pdf.text('USD → USDT Conversion & Withdrawal', pageWidth / 2, 28, { align: 'center' });

    pdf.setFontSize(8);
    pdf.setTextColor(150, 150, 150);
    pdf.text(`Flow ID: ${flow.id}`, pageWidth / 2, 38, { align: 'center' });
    pdf.text(`Generated: ${new Date().toISOString()}`, pageWidth / 2, 44, { align: 'center' });

    y = 60;

    // Status
    pdf.setTextColor(0, 0, 0);
    pdf.setFontSize(12);
    pdf.setFont('helvetica', 'bold');
    pdf.text('STATUS:', margin, y);
    
    if (flow.status === 'completed') {
      pdf.setTextColor(22, 163, 74);
      pdf.text('COMPLETED', margin + 25, y);
    } else if (flow.status === 'failed') {
      pdf.setTextColor(220, 38, 38);
      pdf.text('FAILED', margin + 25, y);
    } else {
      pdf.setTextColor(234, 179, 8);
      pdf.text(flow.status.toUpperCase(), margin + 25, y);
    }

    y += 12;

    // Details
    pdf.setTextColor(0, 0, 0);
    pdf.setFontSize(10);

    const details = [
      ['USD Amount:', `$${flow.usdAmount}`],
      ['USDT Received:', flow.usdtReceived || 'N/A'],
      ['Network:', flow.network],
      ['Destination:', flow.destAddress],
      ['Withdrawal ID:', flow.withdrawalId || 'N/A'],
      ['Fee:', flow.fee || 'N/A'],
      ['Started:', flow.startedAt],
      ['Completed:', flow.completedAt || 'N/A'],
    ];

    details.forEach(([label, value]) => {
      pdf.setFont('helvetica', 'bold');
      pdf.text(label, margin, y);
      pdf.setFont('helvetica', 'normal');
      pdf.text(String(value).slice(0, 50), margin + 40, y);
      y += 7;
    });

    y += 10;

    // Operations
    pdf.setFontSize(12);
    pdf.setFont('helvetica', 'bold');
    pdf.text('OPERATIONS LOG:', margin, y);
    y += 8;

    pdf.setFontSize(8);
    flow.operations.forEach((op, idx) => {
      const statusIcon = op.status === 'success' ? '✓' : op.status === 'failed' ? '✗' : '○';
      pdf.setFont('helvetica', 'normal');
      const text = `${idx + 1}. [${statusIcon}] ${op.message}`;
      pdf.text(text.slice(0, 90), margin, y);
      y += 5;
      if (y > 270) {
        pdf.addPage();
        y = margin;
      }
    });

    // Footer
    y = 280;
    pdf.setFontSize(7);
    pdf.setTextColor(128, 128, 128);
    pdf.text('KuCoin API Module | api.kucoin.com', pageWidth / 2, y, { align: 'center' });

    pdf.save(`KuCoin_Receipt_${flow.id}.pdf`);
  };

  // Estadísticas
  const stats = {
    total: flows.length,
    completed: flows.filter(f => f.status === 'completed').length,
    failed: flows.filter(f => f.status === 'failed').length,
    totalUSD: flows.filter(f => f.status === 'completed').reduce((sum, f) => sum + parseFloat(f.usdAmount), 0),
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0a0a0a] via-[#111] to-[#0a0a0a] text-white p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="bg-gradient-to-r from-green-900/30 to-emerald-900/30 border-2 border-green-500/50 rounded-2xl p-6 mb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 bg-gradient-to-br from-green-500 to-emerald-500 rounded-xl flex items-center justify-center">
                <Coins className="w-8 h-8 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-white">KuCoin API</h1>
                <p className="text-green-300 text-sm">REST + WebSocket Integration</p>
                <p className="text-xs text-gray-400 font-mono mt-1">
                  {API_ENDPOINTS[config.environment || 'production']}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              {/* REST Status */}
              <div className={`flex items-center gap-2 px-3 py-2 rounded-lg ${
                connectionStatus === 'connected' ? 'bg-emerald-500/20 text-emerald-400' :
                connectionStatus === 'error' ? 'bg-red-500/20 text-red-400' :
                'bg-gray-500/20 text-gray-400'
              }`}>
                <Server className="w-4 h-4" />
                <span className="text-xs">REST</span>
              </div>
              {/* WebSocket Status */}
              <div className={`flex items-center gap-2 px-3 py-2 rounded-lg ${
                wsStatus === 'connected' ? 'bg-emerald-500/20 text-emerald-400' :
                wsStatus === 'connecting' ? 'bg-yellow-500/20 text-yellow-400' :
                'bg-gray-500/20 text-gray-400'
              }`}>
                {wsStatus === 'connected' ? <Wifi className="w-4 h-4" /> :
                 wsStatus === 'connecting' ? <Radio className="w-4 h-4 animate-pulse" /> :
                 <WifiOff className="w-4 h-4" />}
                <span className="text-xs">WS</span>
              </div>
              <button
                onClick={handleTestConnection}
                disabled={isLoading || !config.isConfigured}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-500 transition-all disabled:opacity-50 flex items-center gap-2"
              >
                <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
                Test
              </button>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-5 gap-4 mt-6">
            <div className="bg-black/30 rounded-lg p-3 text-center">
              <div className="text-2xl font-bold text-white">{stats.total}</div>
              <div className="text-xs text-gray-400">Total</div>
            </div>
            <div className="bg-black/30 rounded-lg p-3 text-center">
              <div className="text-2xl font-bold text-emerald-400">{stats.completed}</div>
              <div className="text-xs text-gray-400">{isSpanish ? 'Completados' : 'Completed'}</div>
            </div>
            <div className="bg-black/30 rounded-lg p-3 text-center">
              <div className="text-2xl font-bold text-red-400">{stats.failed}</div>
              <div className="text-xs text-gray-400">{isSpanish ? 'Fallidos' : 'Failed'}</div>
            </div>
            <div className="bg-black/30 rounded-lg p-3 text-center">
              <div className="text-lg font-bold text-green-400">${stats.totalUSD.toLocaleString()}</div>
              <div className="text-xs text-gray-400">USD</div>
            </div>
            <div className="bg-black/30 rounded-lg p-3 text-center">
              <div className="text-lg font-bold text-blue-400">{events.length}</div>
              <div className="text-xs text-gray-400">{isSpanish ? 'Eventos' : 'Events'}</div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6 flex-wrap">
          {[
            { id: 'convert', icon: ArrowRightLeft, label: isSpanish ? 'Convertir' : 'Convert' },
            { id: 'websocket', icon: Radio, label: 'WebSocket' },
            { id: 'history', icon: History, label: isSpanish ? 'Historial' : 'History', count: flows.length },
            { id: 'config', icon: Settings, label: isSpanish ? 'Config' : 'Settings', alert: !config.isConfigured },
            { id: 'docs', icon: FileText, label: 'Docs' },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-5 py-3 rounded-lg font-bold flex items-center gap-2 transition-all ${
                activeTab === tab.id 
                  ? 'bg-gradient-to-r from-green-600 to-emerald-600 text-white' 
                  : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
              }`}
            >
              <tab.icon className="w-5 h-5" />
              {tab.label}
              {tab.count !== undefined && <span className="text-xs bg-black/30 px-2 py-0.5 rounded-full">{tab.count}</span>}
              {tab.alert && <AlertTriangle className="w-4 h-4 text-yellow-400" />}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="col-span-2 bg-gradient-to-br from-[#0d0d0d] to-[#1a1a1a] border border-gray-700 rounded-2xl p-6">
            
            {/* Convert Tab */}
            {activeTab === 'convert' && (
              <div className="space-y-6">
                <div className="flex items-center gap-3 mb-6">
                  <ArrowRightLeft className="w-6 h-6 text-green-400" />
                  <h2 className="text-xl font-bold">{isSpanish ? 'Convertir USD a USDT' : 'Convert USD to USDT'}</h2>
                </div>

                {!config.isConfigured && (
                  <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4 flex items-center gap-3">
                    <AlertTriangle className="w-6 h-6 text-yellow-400" />
                    <div>
                      <div className="font-semibold text-yellow-400">
                        {isSpanish ? 'Configuración Requerida' : 'Configuration Required'}
                      </div>
                      <div className="text-sm text-gray-400">
                        {isSpanish 
                          ? 'Configura tus credenciales de KuCoin API para comenzar' 
                          : 'Configure your KuCoin API credentials to begin'}
                      </div>
                    </div>
                  </div>
                )}

                {/* Flujo Visual */}
                <div className="bg-black/30 rounded-xl p-6">
                  <h3 className="text-sm font-semibold text-gray-400 mb-4 uppercase tracking-wider">
                    {isSpanish ? 'Flujo de Conversión' : 'Conversion Flow'}
                  </h3>
                  <div className="flex items-center justify-between">
                    {[
                      { icon: DollarSign, label: 'USD (Main)', color: 'green' },
                      { icon: ArrowRightLeft, label: 'Trade', color: 'blue' },
                      { icon: Coins, label: 'Buy USDT', color: 'yellow' },
                      { icon: Wallet, label: 'Main', color: 'purple' },
                      { icon: Send, label: 'Withdraw', color: 'emerald' },
                    ].map((step, idx) => (
                      <div key={idx} className="flex items-center">
                        <div className="flex flex-col items-center">
                          <div className={`w-12 h-12 bg-${step.color}-500/20 rounded-full flex items-center justify-center mb-2`}>
                            <step.icon className={`w-6 h-6 text-${step.color}-400`} />
                          </div>
                          <span className="text-xs text-gray-400">{step.label}</span>
                        </div>
                        {idx < 4 && <ChevronRight className="w-6 h-6 text-gray-600 mx-2" />}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Formulario */}
                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <label className="text-sm text-gray-400 mb-2 block">
                      {isSpanish ? 'Monto USD' : 'USD Amount'}
                    </label>
                    <div className="relative">
                      <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                      <input
                        type="number"
                        value={convertForm.usdAmount}
                        onChange={(e) => setConvertForm({...convertForm, usdAmount: e.target.value})}
                        placeholder="100.00"
                        className="w-full pl-10 pr-4 py-3 bg-black/50 border border-gray-700 rounded-lg text-white focus:border-green-500 outline-none"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="text-sm text-gray-400 mb-2 block">
                      {isSpanish ? 'Red de Retiro' : 'Withdrawal Network'}
                    </label>
                    <select
                      value={convertForm.network}
                      onChange={(e) => setConvertForm({...convertForm, network: e.target.value as NetworkType})}
                      className="w-full px-4 py-3 bg-black/50 border border-gray-700 rounded-lg text-white focus:border-green-500 outline-none"
                    >
                      {SUPPORTED_NETWORKS.map(net => (
                        <option key={net.id} value={net.id}>
                          {net.name} ({net.fee})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="text-sm text-gray-400 mb-2 block">
                    {isSpanish ? 'Dirección de Destino USDT' : 'Destination USDT Address'}
                  </label>
                  <input
                    type="text"
                    value={convertForm.destAddress}
                    onChange={(e) => setConvertForm({...convertForm, destAddress: e.target.value})}
                    placeholder={convertForm.network === 'TRC20' ? 'T...' : '0x...'}
                    className="w-full px-4 py-3 bg-black/50 border border-gray-700 rounded-lg text-white focus:border-green-500 outline-none font-mono text-sm"
                  />
                </div>

                {/* Operaciones en progreso */}
                {currentOperations.length > 0 && (
                  <div className="bg-black/30 rounded-xl p-4">
                    <h4 className="text-sm font-semibold text-gray-400 mb-3 flex items-center gap-2">
                      <Terminal className="w-4 h-4" />
                      {isSpanish ? 'Progreso' : 'Progress'}
                    </h4>
                    <div className="space-y-2 max-h-40 overflow-y-auto">
                      {currentOperations.map((op) => (
                        <div key={op.id} className={`flex items-center gap-2 text-sm ${
                          op.status === 'success' ? 'text-emerald-400' :
                          op.status === 'failed' ? 'text-red-400' :
                          'text-yellow-400'
                        }`}>
                          {op.status === 'success' ? <CheckCircle className="w-4 h-4" /> :
                           op.status === 'failed' ? <XCircle className="w-4 h-4" /> :
                           <Clock className="w-4 h-4 animate-pulse" />}
                          <span>{op.message}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <button
                  onClick={handleExecuteConversion}
                  disabled={isLoading || !config.isConfigured}
                  className="w-full py-4 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-xl hover:from-green-500 hover:to-emerald-500 transition-all disabled:opacity-50 font-bold text-lg flex items-center justify-center gap-3"
                >
                  {isLoading ? (
                    <>
                      <RefreshCw className="w-6 h-6 animate-spin" />
                      {isSpanish ? 'Procesando...' : 'Processing...'}
                    </>
                  ) : (
                    <>
                      <Zap className="w-6 h-6" />
                      {isSpanish ? 'Ejecutar Conversión' : 'Execute Conversion'}
                    </>
                  )}
                </button>
              </div>
            )}

            {/* WebSocket Tab */}
            {activeTab === 'websocket' && (
              <div className="space-y-6">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-3">
                    <Radio className="w-6 h-6 text-green-400" />
                    <h2 className="text-xl font-bold">WebSocket (Pub/Sub)</h2>
                  </div>
                  <button
                    onClick={handleToggleWebSocket}
                    disabled={!config.isConfigured}
                    className={`px-4 py-2 rounded-lg font-bold flex items-center gap-2 ${
                      wsStatus === 'connected' 
                        ? 'bg-red-600 hover:bg-red-500 text-white' 
                        : 'bg-green-600 hover:bg-green-500 text-white'
                    } disabled:opacity-50`}
                  >
                    {wsStatus === 'connected' ? (
                      <>
                        <Square className="w-4 h-4" />
                        {isSpanish ? 'Desconectar' : 'Disconnect'}
                      </>
                    ) : wsStatus === 'connecting' ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        {isSpanish ? 'Conectando...' : 'Connecting...'}
                      </>
                    ) : (
                      <>
                        <Play className="w-4 h-4" />
                        {isSpanish ? 'Conectar' : 'Connect'}
                      </>
                    )}
                  </button>
                </div>

                {/* WebSocket Info */}
                <div className="bg-blue-500/10 border border-blue-500/30 rounded-xl p-4">
                  <h3 className="text-sm font-semibold text-blue-400 mb-3 flex items-center gap-2">
                    <Activity className="w-4 h-4" />
                    {isSpanish ? 'Canales de Suscripción' : 'Subscription Channels'}
                  </h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center justify-between bg-black/20 p-2 rounded">
                      <code className="text-green-400">/account/balance</code>
                      <span className="text-gray-400">{isSpanish ? 'Cambios en balance' : 'Balance changes'}</span>
                    </div>
                    <div className="flex items-center justify-between bg-black/20 p-2 rounded">
                      <code className="text-green-400">/spotMarket/tradeOrders</code>
                      <span className="text-gray-400">{isSpanish ? 'Estado de órdenes' : 'Order status'}</span>
                    </div>
                  </div>
                </div>

                {/* Auto-Conversión */}
                <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-4">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-sm font-semibold text-emerald-400 flex items-center gap-2">
                      <Bell className="w-4 h-4" />
                      {isSpanish ? 'Auto-Conversión en Depósito USD' : 'Auto-Convert on USD Deposit'}
                    </h3>
                    <button
                      onClick={handleToggleAutoConversion}
                      disabled={wsStatus !== 'connected'}
                      className={`px-3 py-1 rounded-lg text-sm font-semibold ${
                        autoConversionEnabled 
                          ? 'bg-emerald-500 text-white' 
                          : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                      } disabled:opacity-50`}
                    >
                      {autoConversionEnabled ? 'ON' : 'OFF'}
                    </button>
                  </div>
                  
                  <div className="space-y-3">
                    <div>
                      <label className="text-xs text-gray-400 mb-1 block">{isSpanish ? 'Dirección Destino' : 'Destination Address'}</label>
                      <input
                        type="text"
                        value={autoConfig.destAddress}
                        onChange={(e) => setAutoConfig({...autoConfig, destAddress: e.target.value})}
                        placeholder="USDT Address..."
                        className="w-full px-3 py-2 bg-black/50 border border-gray-700 rounded-lg text-white text-sm font-mono"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-gray-400 mb-1 block">Network</label>
                      <select
                        value={autoConfig.network}
                        onChange={(e) => setAutoConfig({...autoConfig, network: e.target.value as NetworkType})}
                        className="w-full px-3 py-2 bg-black/50 border border-gray-700 rounded-lg text-white text-sm"
                      >
                        {SUPPORTED_NETWORKS.map(net => (
                          <option key={net.id} value={net.id}>{net.name}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                  
                  {autoConversionEnabled && (
                    <div className="mt-3 p-2 bg-emerald-500/20 rounded-lg text-xs text-emerald-300 flex items-center gap-2">
                      <Radio className="w-4 h-4 animate-pulse" />
                      {isSpanish 
                        ? 'Escuchando depósitos USD... Se convertirá automáticamente.' 
                        : 'Listening for USD deposits... Will auto-convert.'}
                    </div>
                  )}
                </div>

                {/* Flujo WebSocket */}
                <div className="bg-black/30 rounded-xl p-4">
                  <h3 className="text-sm font-semibold text-gray-400 mb-3">
                    {isSpanish ? 'Flujo de Autenticación WebSocket' : 'WebSocket Authentication Flow'}
                  </h3>
                  <div className="space-y-2 text-xs font-mono">
                    <div className="flex items-center gap-2">
                      <span className="text-gray-500">1.</span>
                      <code className="text-yellow-400">POST /api/v1/bullet-private</code>
                      <span className="text-gray-500">→ token + endpoint</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-gray-500">2.</span>
                      <code className="text-blue-400">WSS connect</code>
                      <span className="text-gray-500">→ endpoint?token=xxx</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-gray-500">3.</span>
                      <code className="text-green-400">subscribe</code>
                      <span className="text-gray-500">→ /account/balance</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* History Tab */}
            {activeTab === 'history' && (
              <div>
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-bold flex items-center gap-3">
                    <History className="w-6 h-6 text-green-400" />
                    {isSpanish ? 'Historial' : 'History'}
                  </h2>
                  {flows.length > 0 && (
                    <button
                      onClick={() => {
                        if (confirm(isSpanish ? '¿Limpiar historial?' : 'Clear history?')) {
                          kucoinClient.clearFlows();
                          setFlows([]);
                        }
                      }}
                      className="px-4 py-2 bg-red-600/20 text-red-400 rounded-lg hover:bg-red-600/30 flex items-center gap-2"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>

                {flows.length === 0 ? (
                  <div className="text-center py-12 text-gray-500">
                    <History className="w-16 h-16 mx-auto mb-4 opacity-30" />
                    <p>{isSpanish ? 'No hay conversiones' : 'No conversions'}</p>
                  </div>
                ) : (
                  <div className="space-y-4 max-h-[500px] overflow-y-auto">
                    {flows.map((flow) => (
                      <div 
                        key={flow.id}
                        className={`border rounded-xl p-4 ${
                          flow.status === 'completed' ? 'border-emerald-500/30 bg-emerald-500/5' :
                          flow.status === 'failed' ? 'border-red-500/30 bg-red-500/5' :
                          'border-yellow-500/30 bg-yellow-500/5'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-3">
                            {flow.status === 'completed' ? 
                              <CheckCircle className="w-5 h-5 text-emerald-400" /> :
                             flow.status === 'failed' ?
                              <XCircle className="w-5 h-5 text-red-400" /> :
                              <Clock className="w-5 h-5 text-yellow-400" />
                            }
                            <div>
                              <div className="font-bold">${flow.usdAmount} USD → USDT</div>
                              <div className="text-xs text-gray-500 font-mono">{flow.id}</div>
                            </div>
                          </div>
                          <button
                            onClick={() => generateFlowPDF(flow)}
                            className="p-2 bg-gray-700 rounded-lg hover:bg-gray-600"
                          >
                            <FileText className="w-4 h-4" />
                          </button>
                        </div>
                        <div className="grid grid-cols-3 gap-3 text-sm">
                          <div>
                            <div className="text-gray-500 text-xs">{isSpanish ? 'Red' : 'Network'}</div>
                            <div className="font-semibold">{flow.network}</div>
                          </div>
                          <div>
                            <div className="text-gray-500 text-xs">USDT</div>
                            <div className="font-semibold text-green-400">{flow.usdtReceived || 'N/A'}</div>
                          </div>
                          <div>
                            <div className="text-gray-500 text-xs">{isSpanish ? 'Fecha' : 'Date'}</div>
                            <div className="text-xs">{new Date(flow.startedAt).toLocaleDateString()}</div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Config Tab */}
            {activeTab === 'config' && (
              <div className="space-y-6">
                <div className="flex items-center gap-3 mb-6">
                  <Settings className="w-6 h-6 text-green-400" />
                  <h2 className="text-xl font-bold">{isSpanish ? 'Configuración' : 'Configuration'}</h2>
                </div>

                {/* Requisitos */}
                <div className="bg-blue-500/10 border border-blue-500/30 rounded-xl p-4">
                  <h3 className="text-sm font-semibold text-blue-400 mb-3 flex items-center gap-2">
                    <Shield className="w-4 h-4" />
                    {isSpanish ? 'Requisitos API Key' : 'API Key Requirements'}
                  </h3>
                  <ul className="text-sm text-gray-300 space-y-2">
                    <li className="flex items-center gap-2">
                      <CheckCircle className="w-4 h-4 text-green-400" />
                      {isSpanish ? 'Permisos: General, Trade, Transfer' : 'Permissions: General, Trade, Transfer'}
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle className="w-4 h-4 text-green-400" />
                      IP Whitelist
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle className="w-4 h-4 text-green-400" />
                      {isSpanish ? 'Saldo USD en Main' : 'USD in Main Account'}
                    </li>
                  </ul>
                </div>

                {/* Environment */}
                <div>
                  <label className="text-sm text-gray-400 mb-2 block">{isSpanish ? 'Entorno' : 'Environment'}</label>
                  <select
                    value={tempConfig.environment}
                    onChange={(e) => setTempConfig({...tempConfig, environment: e.target.value as EnvironmentType})}
                    className="w-full px-4 py-3 bg-black/50 border border-gray-700 rounded-lg text-white"
                  >
                    <option value="production">Production (api.kucoin.com)</option>
                    <option value="broker">Broker (api-broker.kucoin.com)</option>
                    <option value="futures">Futures (api-futures.kucoin.com)</option>
                  </select>
                </div>

                {/* Credenciales */}
                <div className="space-y-4">
                  <div>
                    <label className="text-sm text-gray-400 mb-2 block">API Key</label>
                    <input
                      type="text"
                      value={tempConfig.apiKey}
                      onChange={(e) => setTempConfig({...tempConfig, apiKey: e.target.value})}
                      placeholder="Tu API Key"
                      className="w-full px-4 py-3 bg-black/50 border border-gray-700 rounded-lg text-white font-mono text-sm"
                    />
                  </div>
                  <div>
                    <label className="text-sm text-gray-400 mb-2 block">API Secret</label>
                    <input
                      type="password"
                      value={tempConfig.apiSecret}
                      onChange={(e) => setTempConfig({...tempConfig, apiSecret: e.target.value})}
                      placeholder="Tu API Secret"
                      className="w-full px-4 py-3 bg-black/50 border border-gray-700 rounded-lg text-white font-mono text-sm"
                    />
                  </div>
                  <div>
                    <label className="text-sm text-gray-400 mb-2 block">Passphrase</label>
                    <div className="relative">
                      <input
                        type={showPassphrase ? 'text' : 'password'}
                        value={tempConfig.passphrase}
                        onChange={(e) => setTempConfig({...tempConfig, passphrase: e.target.value})}
                        placeholder="Tu Passphrase"
                        className="w-full px-4 py-3 pr-12 bg-black/50 border border-gray-700 rounded-lg text-white font-mono text-sm"
                      />
                      <button
                        onClick={() => setShowPassphrase(!showPassphrase)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white"
                      >
                        {showPassphrase ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                      </button>
                    </div>
                  </div>
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={handleSaveConfig}
                    className="flex-1 py-3 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-lg font-bold flex items-center justify-center gap-2"
                  >
                    <Shield className="w-5 h-5" />
                    {isSpanish ? 'Guardar' : 'Save'}
                  </button>
                  <button
                    onClick={handleTestConnection}
                    disabled={!tempConfig.apiKey}
                    className="px-6 py-3 bg-gray-700 text-white rounded-lg disabled:opacity-50 flex items-center gap-2"
                  >
                    <RefreshCw className="w-5 h-5" />
                    Test
                  </button>
                </div>

                <a
                  href="https://www.kucoin.com/account/api"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-green-400 hover:text-green-300 text-sm flex items-center justify-center gap-2"
                >
                  <ExternalLink className="w-4 h-4" />
                  {isSpanish ? 'Crear API Key' : 'Create API Key'}
                </a>
              </div>
            )}

            {/* Docs Tab */}
            {activeTab === 'docs' && (
              <div className="space-y-6">
                <div className="flex items-center gap-3 mb-6">
                  <FileText className="w-6 h-6 text-green-400" />
                  <h2 className="text-xl font-bold">{isSpanish ? 'Documentación API' : 'API Documentation'}</h2>
                </div>

                {/* Endpoints REST */}
                <div className="bg-black/30 rounded-xl p-4">
                  <h3 className="text-sm font-semibold text-green-400 mb-3">REST Endpoints</h3>
                  <div className="space-y-2 text-xs font-mono">
                    <div className="flex justify-between bg-black/20 p-2 rounded">
                      <span className="text-blue-400">GET</span>
                      <code className="text-white">/api/v1/accounts</code>
                      <span className="text-gray-500">{isSpanish ? 'Ver saldo' : 'Get balance'}</span>
                    </div>
                    <div className="flex justify-between bg-black/20 p-2 rounded">
                      <span className="text-green-400">POST</span>
                      <code className="text-white">/api/v1/orders</code>
                      <span className="text-gray-500">{isSpanish ? 'Crear orden' : 'Create order'}</span>
                    </div>
                    <div className="flex justify-between bg-black/20 p-2 rounded">
                      <span className="text-green-400">POST</span>
                      <code className="text-white">/api/v2/accounts/inner-transfer</code>
                      <span className="text-gray-500">{isSpanish ? 'Transferir' : 'Transfer'}</span>
                    </div>
                    <div className="flex justify-between bg-black/20 p-2 rounded">
                      <span className="text-green-400">POST</span>
                      <code className="text-white">/api/v3/withdrawals</code>
                      <span className="text-gray-500">{isSpanish ? 'Retirar' : 'Withdraw'}</span>
                    </div>
                    <div className="flex justify-between bg-black/20 p-2 rounded">
                      <span className="text-green-400">POST</span>
                      <code className="text-white">/api/v1/bullet-private</code>
                      <span className="text-gray-500">WebSocket Token</span>
                    </div>
                  </div>
                </div>

                {/* Entornos */}
                <div className="bg-black/30 rounded-xl p-4">
                  <h3 className="text-sm font-semibold text-blue-400 mb-3">{isSpanish ? 'Entornos' : 'Environments'}</h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-400">Producción</span>
                      <code className="text-green-400">api.kucoin.com</code>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Broker</span>
                      <code className="text-yellow-400">api-broker.kucoin.com</code>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Futures</span>
                      <code className="text-purple-400">api-futures.kucoin.com</code>
                    </div>
                  </div>
                </div>

                {/* WebSocket Channels */}
                <div className="bg-black/30 rounded-xl p-4">
                  <h3 className="text-sm font-semibold text-purple-400 mb-3">WebSocket Channels</h3>
                  <div className="space-y-2 text-sm font-mono">
                    <div className="bg-black/20 p-2 rounded">
                      <code className="text-green-400">/account/balance</code>
                      <p className="text-xs text-gray-500 mt-1">{isSpanish ? 'Cambios de balance en tiempo real' : 'Real-time balance changes'}</p>
                    </div>
                    <div className="bg-black/20 p-2 rounded">
                      <code className="text-blue-400">/spotMarket/tradeOrders</code>
                      <p className="text-xs text-gray-500 mt-1">{isSpanish ? 'Estado de órdenes' : 'Order status'}</p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Events Panel */}
          <div className="bg-gradient-to-br from-[#0d0d0d] to-[#1a1a1a] border border-gray-700 rounded-2xl p-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold flex items-center gap-2">
                <Activity className="w-5 h-5 text-green-400" />
                {isSpanish ? 'Eventos en Tiempo Real' : 'Real-time Events'}
              </h3>
              {events.length > 0 && (
                <button
                  onClick={() => {
                    kucoinClient.clearEvents();
                    setEvents([]);
                  }}
                  className="text-xs text-gray-500 hover:text-red-400"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>
            
            <div ref={eventsContainerRef} className="space-y-2 max-h-[600px] overflow-y-auto">
              {events.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <Radio className="w-8 h-8 mx-auto mb-2 opacity-30" />
                  <p className="text-xs">{isSpanish ? 'Sin eventos' : 'No events'}</p>
                </div>
              ) : (
                events.map((event) => (
                  <div 
                    key={event.id}
                    className={`p-3 rounded-lg text-sm ${
                      event.status === 'success' ? 'bg-emerald-500/10 border border-emerald-500/30' :
                      event.status === 'failed' ? 'bg-red-500/10 border border-red-500/30' :
                      event.status === 'listening' ? 'bg-blue-500/10 border border-blue-500/30' :
                      'bg-yellow-500/10 border border-yellow-500/30'
                    }`}
                  >
                    <div className="flex items-start gap-2">
                      {event.type === 'websocket' ? <Radio className="w-4 h-4 text-blue-400 flex-shrink-0" /> :
                       event.type === 'balance' ? <Wallet className="w-4 h-4 text-green-400 flex-shrink-0" /> :
                       event.type === 'order' ? <ArrowRightLeft className="w-4 h-4 text-yellow-400 flex-shrink-0" /> :
                       event.type === 'transfer' ? <Send className="w-4 h-4 text-purple-400 flex-shrink-0" /> :
                       <Activity className="w-4 h-4 text-gray-400 flex-shrink-0" />}
                      <div className="flex-1 min-w-0">
                        <p className="text-xs break-words">{event.message}</p>
                        <p className="text-[10px] text-gray-500 mt-1">
                          {new Date(event.timestamp).toLocaleTimeString()}
                        </p>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Accounts found */}
            {accounts.length > 0 && (
              <div className="mt-4 pt-4 border-t border-gray-700">
                <h4 className="text-xs font-semibold text-gray-400 mb-2">
                  {isSpanish ? 'Cuentas' : 'Accounts'}
                </h4>
                <div className="space-y-2">
                  {accounts.slice(0, 5).map((acc, idx) => (
                    <div key={idx} className="flex justify-between text-xs bg-black/30 p-2 rounded">
                      <span className="font-semibold">{acc.currency}</span>
                      <span className="text-green-400">{parseFloat(acc.available).toFixed(2)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
