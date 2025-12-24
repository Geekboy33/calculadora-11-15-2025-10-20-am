/**
 * KuCoin API Module
 * Flujo: Fiat USD → USDT → Withdrawal
 * 
 * Implementa el ciclo completo:
 * 1. Transferencia interna USD (Main → Trade)
 * 2. Compra USDT con USD (Market Order)
 * 3. Transferencia USDT (Trade → Main)
 * 4. Retiro USDT a wallet externa
 */

import { useState, useEffect } from 'react';
import {
  Settings, RefreshCw, Send, Wallet, ArrowRightLeft, History,
  CheckCircle, XCircle, Clock, AlertTriangle, Eye, EyeOff,
  Trash2, Download, DollarSign, Coins, Globe, Shield, Zap,
  ChevronRight, Terminal, FileText, ExternalLink
} from 'lucide-react';
import { useLanguage } from '../lib/i18n';
import {
  kucoinClient,
  KuCoinConfig,
  FiatToUSDTFlow,
  FlowOperation,
  SUPPORTED_NETWORKS,
  NetworkType,
  KuCoinAccount
} from '../lib/kucoin-api';
import jsPDF from 'jspdf';

export default function KuCoinModule() {
  const { language } = useLanguage();
  const isSpanish = language === 'es';

  // Estados
  const [activeTab, setActiveTab] = useState<'convert' | 'history' | 'config'>('convert');
  const [config, setConfig] = useState<KuCoinConfig>(kucoinClient.getConfig());
  const [flows, setFlows] = useState<FiatToUSDTFlow[]>(kucoinClient.getFlows());
  const [isLoading, setIsLoading] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'untested' | 'connected' | 'error'>('untested');
  const [showPassphrase, setShowPassphrase] = useState(false);
  const [accounts, setAccounts] = useState<KuCoinAccount[]>([]);
  const [currentOperations, setCurrentOperations] = useState<FlowOperation[]>([]);

  // Formulario de configuración
  const [tempConfig, setTempConfig] = useState({
    apiKey: config.apiKey,
    apiSecret: config.apiSecret,
    passphrase: config.passphrase,
  });

  // Formulario de conversión
  const [convertForm, setConvertForm] = useState({
    usdAmount: '',
    destAddress: '',
    network: 'TRC20' as NetworkType,
  });

  // Cargar datos iniciales
  useEffect(() => {
    const loadedConfig = kucoinClient.getConfig();
    setConfig(loadedConfig);
    setFlows(kucoinClient.getFlows());
    setTempConfig({
      apiKey: loadedConfig.apiKey,
      apiSecret: loadedConfig.apiSecret,
      passphrase: loadedConfig.passphrase,
    });
  }, []);

  // Guardar configuración
  const handleSaveConfig = () => {
    kucoinClient.setConfig(
      tempConfig.apiKey,
      tempConfig.apiSecret,
      tempConfig.passphrase
    );
    setConfig(kucoinClient.getConfig());
    alert(isSpanish ? '✓ Configuración guardada' : '✓ Configuration saved');
  };

  // Test de conexión
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

  // Ejecutar conversión
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
        // Limpiar formulario
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

  // Generar PDF de flujo
  const generateFlowPDF = (flow: FiatToUSDTFlow) => {
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    });

    const pageWidth = pdf.internal.pageSize.getWidth();
    const margin = 15;
    let y = margin;

    // Header
    pdf.setFillColor(0, 0, 0);
    pdf.rect(0, 0, pageWidth, 50, 'F');

    pdf.setTextColor(255, 255, 255);
    pdf.setFontSize(18);
    pdf.setFont('helvetica', 'bold');
    pdf.text('KUCOIN CONVERSION RECEIPT', pageWidth / 2, 20, { align: 'center' });

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
    pdf.setFont('helvetica', 'normal');

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
      const maxWidth = pageWidth - margin * 2 - 40;
      const lines = pdf.splitTextToSize(String(value), maxWidth);
      pdf.text(lines[0], margin + 40, y);
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
      pdf.text(`${idx + 1}. [${statusIcon}] ${op.message}`, margin, y);
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
    pdf.text('This document is generated automatically by the KuCoin API Module', pageWidth / 2, y, { align: 'center' });

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
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="bg-gradient-to-r from-green-900/30 to-emerald-900/30 border-2 border-green-500/50 rounded-2xl p-6 mb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 bg-gradient-to-br from-green-500 to-emerald-500 rounded-xl flex items-center justify-center">
                <Coins className="w-8 h-8 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-white">KuCoin API</h1>
                <p className="text-green-300 text-sm">Fiat USD → USDT Conversion & Withdrawal</p>
                <p className="text-xs text-gray-400 font-mono mt-1">
                  api.kucoin.com
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className={`flex items-center gap-2 px-3 py-2 rounded-lg ${
                connectionStatus === 'connected' ? 'bg-emerald-500/20 text-emerald-400' :
                connectionStatus === 'error' ? 'bg-red-500/20 text-red-400' :
                'bg-gray-500/20 text-gray-400'
              }`}>
                {connectionStatus === 'connected' ? <CheckCircle className="w-4 h-4" /> :
                 connectionStatus === 'error' ? <XCircle className="w-4 h-4" /> :
                 <Clock className="w-4 h-4" />}
                <span className="text-sm font-semibold">
                  {connectionStatus === 'connected' ? (isSpanish ? 'Conectado' : 'Connected') :
                   connectionStatus === 'error' ? 'Error' :
                   (isSpanish ? 'Sin probar' : 'Not tested')}
                </span>
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

          {/* Estadísticas */}
          <div className="grid grid-cols-4 gap-4 mt-6">
            <div className="bg-black/30 rounded-lg p-3 text-center">
              <div className="text-2xl font-bold text-white">{stats.total}</div>
              <div className="text-xs text-gray-400">{isSpanish ? 'Total' : 'Total'}</div>
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
              <div className="text-xs text-gray-400">{isSpanish ? 'USD Convertido' : 'USD Converted'}</div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6">
          <button
            onClick={() => setActiveTab('convert')}
            className={`px-6 py-3 rounded-lg font-bold flex items-center gap-2 transition-all ${
              activeTab === 'convert' 
                ? 'bg-gradient-to-r from-green-600 to-emerald-600 text-white' 
                : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
            }`}
          >
            <ArrowRightLeft className="w-5 h-5" />
            {isSpanish ? 'Convertir' : 'Convert'}
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`px-6 py-3 rounded-lg font-bold flex items-center gap-2 transition-all ${
              activeTab === 'history' 
                ? 'bg-gradient-to-r from-green-600 to-emerald-600 text-white' 
                : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
            }`}
          >
            <History className="w-5 h-5" />
            {isSpanish ? 'Historial' : 'History'} ({flows.length})
          </button>
          <button
            onClick={() => setActiveTab('config')}
            className={`px-6 py-3 rounded-lg font-bold flex items-center gap-2 transition-all ${
              activeTab === 'config' 
                ? 'bg-gradient-to-r from-green-600 to-emerald-600 text-white' 
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
                  <div className="flex flex-col items-center">
                    <div className="w-12 h-12 bg-green-500/20 rounded-full flex items-center justify-center mb-2">
                      <DollarSign className="w-6 h-6 text-green-400" />
                    </div>
                    <span className="text-xs text-gray-400">USD (Main)</span>
                  </div>
                  <ChevronRight className="w-6 h-6 text-gray-600" />
                  <div className="flex flex-col items-center">
                    <div className="w-12 h-12 bg-blue-500/20 rounded-full flex items-center justify-center mb-2">
                      <ArrowRightLeft className="w-6 h-6 text-blue-400" />
                    </div>
                    <span className="text-xs text-gray-400">Trade</span>
                  </div>
                  <ChevronRight className="w-6 h-6 text-gray-600" />
                  <div className="flex flex-col items-center">
                    <div className="w-12 h-12 bg-yellow-500/20 rounded-full flex items-center justify-center mb-2">
                      <Coins className="w-6 h-6 text-yellow-400" />
                    </div>
                    <span className="text-xs text-gray-400">Buy USDT</span>
                  </div>
                  <ChevronRight className="w-6 h-6 text-gray-600" />
                  <div className="flex flex-col items-center">
                    <div className="w-12 h-12 bg-purple-500/20 rounded-full flex items-center justify-center mb-2">
                      <Wallet className="w-6 h-6 text-purple-400" />
                    </div>
                    <span className="text-xs text-gray-400">Main</span>
                  </div>
                  <ChevronRight className="w-6 h-6 text-gray-600" />
                  <div className="flex flex-col items-center">
                    <div className="w-12 h-12 bg-emerald-500/20 rounded-full flex items-center justify-center mb-2">
                      <Send className="w-6 h-6 text-emerald-400" />
                    </div>
                    <span className="text-xs text-gray-400">Withdraw</span>
                  </div>
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
                        {net.name} (Fee: {net.fee})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="text-sm text-gray-400 mb-2 block">
                  {isSpanish ? 'Dirección de Destino USDT' : 'Destination USDT Address'}
                </label>
                <div className="relative">
                  <Wallet className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                  <input
                    type="text"
                    value={convertForm.destAddress}
                    onChange={(e) => setConvertForm({...convertForm, destAddress: e.target.value})}
                    placeholder={convertForm.network === 'TRC20' ? 'T...' : '0x...'}
                    className="w-full pl-10 pr-4 py-3 bg-black/50 border border-gray-700 rounded-lg text-white focus:border-green-500 outline-none font-mono text-sm"
                  />
                </div>
              </div>

              {/* Operaciones en progreso */}
              {currentOperations.length > 0 && (
                <div className="bg-black/30 rounded-xl p-4">
                  <h4 className="text-sm font-semibold text-gray-400 mb-3 flex items-center gap-2">
                    <Terminal className="w-4 h-4" />
                    {isSpanish ? 'Progreso de Operaciones' : 'Operations Progress'}
                  </h4>
                  <div className="space-y-2 max-h-40 overflow-y-auto">
                    {currentOperations.map((op, idx) => (
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

              {/* Botón de ejecución */}
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

              {/* Advertencia */}
              <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-4 text-sm text-amber-200">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-semibold text-amber-400 mb-1">
                      {isSpanish ? 'Importante' : 'Important'}
                    </p>
                    <ul className="list-disc list-inside space-y-1 text-gray-300">
                      <li>{isSpanish ? 'Asegúrate de tener USD en tu cuenta Main de KuCoin' : 'Make sure you have USD in your KuCoin Main account'}</li>
                      <li>{isSpanish ? 'Verifica que la dirección de destino sea correcta' : 'Verify the destination address is correct'}</li>
                      <li>{isSpanish ? 'KuCoin cobra comisiones por trading y retiro' : 'KuCoin charges trading and withdrawal fees'}</li>
                    </ul>
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
                  {isSpanish ? 'Historial de Conversiones' : 'Conversion History'}
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
                    {isSpanish ? 'Limpiar' : 'Clear'}
                  </button>
                )}
              </div>

              {flows.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  <History className="w-16 h-16 mx-auto mb-4 opacity-30" />
                  <p>{isSpanish ? 'No hay conversiones registradas' : 'No conversions recorded'}</p>
                </div>
              ) : (
                <div className="space-y-4">
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
                            <CheckCircle className="w-6 h-6 text-emerald-400" /> :
                           flow.status === 'failed' ?
                            <XCircle className="w-6 h-6 text-red-400" /> :
                            <Clock className="w-6 h-6 text-yellow-400" />
                          }
                          <div>
                            <div className="font-bold text-lg">${flow.usdAmount} USD → USDT</div>
                            <div className="text-xs text-gray-400 font-mono">{flow.id}</div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                            flow.status === 'completed' ? 'bg-emerald-500/20 text-emerald-400' :
                            flow.status === 'failed' ? 'bg-red-500/20 text-red-400' :
                            'bg-yellow-500/20 text-yellow-400'
                          }`}>
                            {flow.status.toUpperCase()}
                          </span>
                          <button
                            onClick={() => generateFlowPDF(flow)}
                            className="p-2 bg-gray-700 rounded-lg hover:bg-gray-600"
                            title={isSpanish ? 'Descargar PDF' : 'Download PDF'}
                          >
                            <FileText className="w-4 h-4" />
                          </button>
                        </div>
                      </div>

                      <div className="grid grid-cols-4 gap-4 text-sm">
                        <div>
                          <div className="text-gray-500">{isSpanish ? 'Red' : 'Network'}</div>
                          <div className="font-semibold">{flow.network}</div>
                        </div>
                        <div>
                          <div className="text-gray-500">USDT</div>
                          <div className="font-semibold text-green-400">{flow.usdtReceived || 'N/A'}</div>
                        </div>
                        <div>
                          <div className="text-gray-500">{isSpanish ? 'Destino' : 'Destination'}</div>
                          <div className="font-mono text-xs truncate">{flow.destAddress.slice(0, 20)}...</div>
                        </div>
                        <div>
                          <div className="text-gray-500">{isSpanish ? 'Fecha' : 'Date'}</div>
                          <div className="text-xs">{new Date(flow.startedAt).toLocaleString()}</div>
                        </div>
                      </div>

                      {flow.error && (
                        <div className="mt-3 text-xs text-red-400 bg-red-500/10 p-2 rounded">
                          Error: {flow.error}
                        </div>
                      )}
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
                <h2 className="text-xl font-bold">{isSpanish ? 'Configuración API' : 'API Configuration'}</h2>
              </div>

              {/* Requisitos */}
              <div className="bg-blue-500/10 border border-blue-500/30 rounded-xl p-4">
                <h3 className="text-sm font-semibold text-blue-400 mb-3 flex items-center gap-2">
                  <Shield className="w-4 h-4" />
                  {isSpanish ? 'Requisitos de la API Key' : 'API Key Requirements'}
                </h3>
                <ul className="text-sm text-gray-300 space-y-2">
                  <li className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-green-400" />
                    {isSpanish ? 'Permisos: General, Trade, Transfer (Withdrawal)' : 'Permissions: General, Trade, Transfer (Withdrawal)'}
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-green-400" />
                    {isSpanish ? 'IP Whitelist configurado en KuCoin' : 'IP Whitelist configured in KuCoin'}
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-green-400" />
                    {isSpanish ? 'Saldo USD disponible en Main Account' : 'USD balance available in Main Account'}
                  </li>
                </ul>
              </div>

              {/* Formulario de credenciales */}
              <div className="space-y-4">
                <div>
                  <label className="text-sm text-gray-400 mb-2 block">API Key</label>
                  <input
                    type="text"
                    value={tempConfig.apiKey}
                    onChange={(e) => setTempConfig({...tempConfig, apiKey: e.target.value})}
                    placeholder="Tu API Key de KuCoin"
                    className="w-full px-4 py-3 bg-black/50 border border-gray-700 rounded-lg text-white focus:border-green-500 outline-none font-mono text-sm"
                  />
                </div>
                <div>
                  <label className="text-sm text-gray-400 mb-2 block">API Secret</label>
                  <input
                    type="password"
                    value={tempConfig.apiSecret}
                    onChange={(e) => setTempConfig({...tempConfig, apiSecret: e.target.value})}
                    placeholder="Tu API Secret de KuCoin"
                    className="w-full px-4 py-3 bg-black/50 border border-gray-700 rounded-lg text-white focus:border-green-500 outline-none font-mono text-sm"
                  />
                </div>
                <div>
                  <label className="text-sm text-gray-400 mb-2 block">Passphrase</label>
                  <div className="relative">
                    <input
                      type={showPassphrase ? 'text' : 'password'}
                      value={tempConfig.passphrase}
                      onChange={(e) => setTempConfig({...tempConfig, passphrase: e.target.value})}
                      placeholder="Tu Passphrase de KuCoin"
                      className="w-full px-4 py-3 pr-12 bg-black/50 border border-gray-700 rounded-lg text-white focus:border-green-500 outline-none font-mono text-sm"
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
                  className="flex-1 py-3 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-lg hover:from-green-500 hover:to-emerald-500 font-bold flex items-center justify-center gap-2"
                >
                  <Shield className="w-5 h-5" />
                  {isSpanish ? 'Guardar Configuración' : 'Save Configuration'}
                </button>
                <button
                  onClick={handleTestConnection}
                  disabled={!tempConfig.apiKey || !tempConfig.apiSecret || !tempConfig.passphrase}
                  className="px-6 py-3 bg-gray-700 text-white rounded-lg hover:bg-gray-600 disabled:opacity-50 flex items-center gap-2"
                >
                  <RefreshCw className="w-5 h-5" />
                  Test
                </button>
              </div>

              {/* Link a KuCoin */}
              <div className="text-center pt-4">
                <a
                  href="https://www.kucoin.com/account/api"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-green-400 hover:text-green-300 text-sm flex items-center justify-center gap-2"
                >
                  <ExternalLink className="w-4 h-4" />
                  {isSpanish ? 'Crear API Key en KuCoin' : 'Create API Key on KuCoin'}
                </a>
              </div>

              {/* Cuentas encontradas */}
              {accounts.length > 0 && (
                <div className="mt-6">
                  <h3 className="text-sm font-semibold text-gray-400 mb-3">
                    {isSpanish ? 'Cuentas Encontradas' : 'Accounts Found'}
                  </h3>
                  <div className="grid grid-cols-2 gap-3">
                    {accounts.slice(0, 6).map((acc, idx) => (
                      <div key={idx} className="bg-black/30 rounded-lg p-3">
                        <div className="flex items-center justify-between">
                          <span className="font-semibold text-white">{acc.currency}</span>
                          <span className="text-xs text-gray-500 uppercase">{acc.type}</span>
                        </div>
                        <div className="text-sm text-green-400 mt-1">
                          {parseFloat(acc.available).toFixed(4)}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

