/**
 * API VEGA Module - Institutional Crypto Trading Platform
 * Based on VegaDev API Architecture
 * Production-Grade Bank-Integrated Digital Asset System
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  Server, Shield, Database, Zap, Activity, Lock, Key, Globe,
  ArrowRightLeft, Wallet, TrendingUp, Clock, CheckCircle2, XCircle,
  AlertTriangle, RefreshCw, FileJson, Terminal, Eye, EyeOff,
  Copy, Download, Send, Search, Filter, BarChart3, Settings,
  Bitcoin, DollarSign, Coins, Link, Network, MonitorDot, Play,
  Pause, ChevronRight, ChevronDown, Hash, Binary, Cpu, HardDrive,
  CloudLightning, Layers, GitBranch, Box, Radio, Webhook, Code2
} from 'lucide-react';
import CryptoJS from 'crypto-js';

// ============================================================================
// TYPES & INTERFACES
// ============================================================================

interface VegaConfig {
  apiEndpoint: string;
  apiVersion: string;
  apiKey: string;
  apiSecret: string;
  webhookSecret: string;
  environment: 'production' | 'sandbox';
}

interface Balance {
  currency: string;
  balance: string;
  availableBalance: string;
  lockedBalance: string;
  lastTransactionAt: string;
}

interface ConversionQuote {
  quoteId: string;
  fromCurrency: string;
  toCurrency: string;
  fromAmount: string;
  toAmount: string;
  rate: string;
  feeAmount: string;
  feeCurrency: string;
  expiresAt: Date;
  liquidityProvider: string;
}

interface ConversionOrder {
  orderId: string;
  orderNumber: string;
  status: 'initiated' | 'validated' | 'quoted' | 'executing' | 'executed' | 'settling' | 'settled' | 'failed' | 'cancelled';
  fromCurrency: string;
  toCurrency: string;
  fromAmount: string;
  toAmount?: string;
  executedRate?: string;
  feeAmount: string;
  blockchainTxHash?: string;
  confirmations: number;
  createdAt: string;
  settledAt?: string;
}

interface Transaction {
  transactionId: string;
  type: 'deposit' | 'withdrawal' | 'conversion' | 'fee';
  currency: string;
  amount: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  reference: string;
  createdAt: string;
  completedAt?: string;
  metadata?: Record<string, any>;
}

interface LiquidityProvider {
  code: string;
  name: string;
  status: 'healthy' | 'unhealthy' | 'degraded';
  supportedPairs: string[];
  minTradeSize: string;
  maxTradeSize: string;
  currentSpread: string;
}

interface BlockchainStatus {
  currency: 'BTC' | 'ETH';
  currentBlock: number;
  lastScannedBlock: number;
  pendingTransactions: number;
  confirmationsRequired: number;
  networkStatus: 'online' | 'syncing' | 'offline';
}

interface WebhookEvent {
  id: string;
  type: string;
  timestamp: string;
  payload: any;
  status: 'received' | 'processing' | 'completed' | 'failed';
}

interface AuditLogEntry {
  eventId: string;
  eventTime: string;
  eventType: string;
  entityType: string;
  entityId: string;
  action: string;
  userId: string;
  ipAddress: string;
}

// ============================================================================
// CONFIGURATION
// ============================================================================

const VEGA_DEFAULT_CONFIG: VegaConfig = {
  apiEndpoint: 'https://api.vega-platform.com',
  apiVersion: 'v1',
  apiKey: '',
  apiSecret: '',
  webhookSecret: '',
  environment: 'sandbox'
};

const SUPPORTED_CURRENCIES = ['USD', 'BTC', 'ETH', 'USDT', 'USDC'];
const CURRENCY_PAIRS = ['USD-BTC', 'USD-ETH', 'BTC-USD', 'ETH-USD', 'USD-USDT', 'USD-USDC'];

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

const generateSignature = (
  apiSecret: string,
  timestamp: number,
  method: string,
  path: string,
  body: string
): string => {
  const message = `${timestamp}${method}${path}${body}`;
  return CryptoJS.HmacSHA256(message, apiSecret).toString(CryptoJS.enc.Hex);
};

const generateUUID = (): string => {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
};

const formatCurrency = (amount: string, currency: string): string => {
  const num = parseFloat(amount);
  if (currency === 'BTC') return num.toFixed(8);
  if (currency === 'ETH') return num.toFixed(8);
  return num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

const getCurrencyIcon = (currency: string) => {
  switch (currency) {
    case 'BTC': return <Bitcoin className="w-4 h-4 text-orange-400" />;
    case 'ETH': return <Coins className="w-4 h-4 text-purple-400" />;
    case 'USD': return <DollarSign className="w-4 h-4 text-green-400" />;
    default: return <Coins className="w-4 h-4 text-blue-400" />;
  }
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================

const VegaAPIModule: React.FC = () => {
  // State Management
  const [isSpanish, setIsSpanish] = useState(true);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'conversion' | 'transactions' | 'blockchain' | 'webhooks' | 'settings'>('dashboard');
  const [config, setConfig] = useState<VegaConfig>(VEGA_DEFAULT_CONFIG);
  const [showApiSecret, setShowApiSecret] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Data State
  const [balances, setBalances] = useState<Balance[]>([]);
  const [currentQuote, setCurrentQuote] = useState<ConversionQuote | null>(null);
  const [orders, setOrders] = useState<ConversionOrder[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [liquidityProviders, setLiquidityProviders] = useState<LiquidityProvider[]>([]);
  const [blockchainStatus, setBlockchainStatus] = useState<BlockchainStatus[]>([]);
  const [webhookEvents, setWebhookEvents] = useState<WebhookEvent[]>([]);
  const [auditLog, setAuditLog] = useState<AuditLogEntry[]>([]);

  // Form State
  const [conversionForm, setConversionForm] = useState({
    fromCurrency: 'USD',
    toCurrency: 'BTC',
    fromAmount: ''
  });

  // Labels
  const labels = {
    title: isSpanish ? 'API VEGA - Plataforma Institucional' : 'VEGA API - Institutional Platform',
    subtitle: isSpanish ? 'Sistema de Trading Cripto de Grado Bancario' : 'Bank-Grade Crypto Trading System',
    dashboard: isSpanish ? 'Panel Principal' : 'Dashboard',
    conversion: isSpanish ? 'Conversión' : 'Conversion',
    transactions: isSpanish ? 'Transacciones' : 'Transactions',
    blockchain: isSpanish ? 'Blockchain' : 'Blockchain',
    webhooks: isSpanish ? 'Webhooks' : 'Webhooks',
    settings: isSpanish ? 'Configuración' : 'Settings',
    balances: isSpanish ? 'Balances' : 'Balances',
    totalValue: isSpanish ? 'Valor Total USD' : 'Total Value USD',
    availableBalance: isSpanish ? 'Disponible' : 'Available',
    lockedBalance: isSpanish ? 'Bloqueado' : 'Locked',
    requestQuote: isSpanish ? 'Solicitar Cotización' : 'Request Quote',
    executeConversion: isSpanish ? 'Ejecutar Conversión' : 'Execute Conversion',
    liquidityProviders: isSpanish ? 'Proveedores de Liquidez' : 'Liquidity Providers',
    blockchainMonitor: isSpanish ? 'Monitor Blockchain' : 'Blockchain Monitor',
    recentWebhooks: isSpanish ? 'Webhooks Recientes' : 'Recent Webhooks',
    auditTrail: isSpanish ? 'Auditoría' : 'Audit Trail',
    connect: isSpanish ? 'Conectar' : 'Connect',
    disconnect: isSpanish ? 'Desconectar' : 'Disconnect',
    connected: isSpanish ? 'Conectado' : 'Connected',
    disconnected: isSpanish ? 'Desconectado' : 'Disconnected',
    apiKey: isSpanish ? 'Clave API' : 'API Key',
    apiSecret: isSpanish ? 'Secreto API' : 'API Secret',
    webhookSecret: isSpanish ? 'Secreto Webhook' : 'Webhook Secret',
    environment: isSpanish ? 'Entorno' : 'Environment',
    production: isSpanish ? 'Producción' : 'Production',
    sandbox: isSpanish ? 'Sandbox' : 'Sandbox'
  };

  // Initialize with demo data
  useEffect(() => {
    initializeDemoData();
  }, []);

  const initializeDemoData = () => {
    // Demo Balances
    setBalances([
      {
        currency: 'USD',
        balance: '1500000.00',
        availableBalance: '1450000.00',
        lockedBalance: '50000.00',
        lastTransactionAt: new Date().toISOString()
      },
      {
        currency: 'BTC',
        balance: '25.75000000',
        availableBalance: '25.75000000',
        lockedBalance: '0.00000000',
        lastTransactionAt: new Date().toISOString()
      },
      {
        currency: 'ETH',
        balance: '450.00000000',
        availableBalance: '450.00000000',
        lockedBalance: '0.00000000',
        lastTransactionAt: new Date().toISOString()
      }
    ]);

    // Demo Liquidity Providers
    setLiquidityProviders([
      {
        code: 'LP_PRIME',
        name: 'Prime Broker A',
        status: 'healthy',
        supportedPairs: ['USD-BTC', 'USD-ETH'],
        minTradeSize: '10000',
        maxTradeSize: '10000000',
        currentSpread: '0.15%'
      },
      {
        code: 'LP_OTC',
        name: 'OTC Desk B',
        status: 'healthy',
        supportedPairs: ['USD-BTC', 'USD-ETH', 'BTC-USD', 'ETH-USD'],
        minTradeSize: '50000',
        maxTradeSize: '50000000',
        currentSpread: '0.10%'
      },
      {
        code: 'LP_INST',
        name: 'Institutional C',
        status: 'degraded',
        supportedPairs: ['USD-BTC'],
        minTradeSize: '100000',
        maxTradeSize: '100000000',
        currentSpread: '0.08%'
      }
    ]);

    // Demo Blockchain Status
    setBlockchainStatus([
      {
        currency: 'BTC',
        currentBlock: 825000,
        lastScannedBlock: 824998,
        pendingTransactions: 3,
        confirmationsRequired: 6,
        networkStatus: 'online'
      },
      {
        currency: 'ETH',
        currentBlock: 19000000,
        lastScannedBlock: 18999995,
        pendingTransactions: 5,
        confirmationsRequired: 12,
        networkStatus: 'syncing'
      }
    ]);

    // Demo Orders
    setOrders([
      {
        orderId: generateUUID(),
        orderNumber: 'ORD-2026-000001',
        status: 'settled',
        fromCurrency: 'USD',
        toCurrency: 'BTC',
        fromAmount: '100000.00',
        toAmount: '2.31502145',
        executedRate: '43218.92',
        feeAmount: '100.00',
        blockchainTxHash: '0x' + generateUUID().replace(/-/g, ''),
        confirmations: 6,
        createdAt: new Date(Date.now() - 3600000).toISOString(),
        settledAt: new Date().toISOString()
      },
      {
        orderId: generateUUID(),
        orderNumber: 'ORD-2026-000002',
        status: 'executing',
        fromCurrency: 'USD',
        toCurrency: 'ETH',
        fromAmount: '50000.00',
        toAmount: '20.83333333',
        executedRate: '2400.00',
        feeAmount: '50.00',
        confirmations: 0,
        createdAt: new Date(Date.now() - 300000).toISOString()
      }
    ]);

    // Demo Transactions
    setTransactions([
      {
        transactionId: generateUUID(),
        type: 'deposit',
        currency: 'USD',
        amount: '1000000.00',
        status: 'completed',
        reference: 'DAES-WIRE-001',
        createdAt: new Date(Date.now() - 86400000).toISOString(),
        completedAt: new Date(Date.now() - 86000000).toISOString(),
        metadata: { bankReference: 'WIRE-12345', senderName: 'Client Corp' }
      },
      {
        transactionId: generateUUID(),
        type: 'conversion',
        currency: 'BTC',
        amount: '2.31502145',
        status: 'completed',
        reference: 'ORD-2026-000001',
        createdAt: new Date(Date.now() - 3600000).toISOString(),
        completedAt: new Date().toISOString()
      }
    ]);

    // Demo Webhook Events
    setWebhookEvents([
      {
        id: generateUUID(),
        type: 'bank.transfer.received',
        timestamp: new Date(Date.now() - 86400000).toISOString(),
        payload: { amount: 1000000, currency: 'USD', reference: 'DAES-WIRE-001' },
        status: 'completed'
      },
      {
        id: generateUUID(),
        type: 'conversion.settled',
        timestamp: new Date().toISOString(),
        payload: { orderId: 'ORD-2026-000001', txHash: '0x123...' },
        status: 'completed'
      }
    ]);

    // Demo Audit Log
    setAuditLog([
      {
        eventId: generateUUID(),
        eventTime: new Date().toISOString(),
        eventType: 'conversion.initiated',
        entityType: 'conversion_order',
        entityId: 'ORD-2026-000001',
        action: 'create',
        userId: 'api_client',
        ipAddress: '192.168.1.100'
      }
    ]);
  };

  // API Connection Handler
  const handleConnect = async () => {
    setIsLoading(true);
    try {
      // Simulate API connection
      await new Promise(resolve => setTimeout(resolve, 1500));
      setIsConnected(true);
    } catch (error) {
      console.error('Connection failed:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDisconnect = () => {
    setIsConnected(false);
  };

  // Quote Request Handler
  const handleRequestQuote = async () => {
    if (!conversionForm.fromAmount) return;
    
    setIsLoading(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const rate = conversionForm.toCurrency === 'BTC' ? 43250.00 : 2400.00;
      const toAmount = (parseFloat(conversionForm.fromAmount) / rate).toFixed(8);
      const feeAmount = (parseFloat(conversionForm.fromAmount) * 0.001).toFixed(2);
      
      setCurrentQuote({
        quoteId: generateUUID(),
        fromCurrency: conversionForm.fromCurrency,
        toCurrency: conversionForm.toCurrency,
        fromAmount: conversionForm.fromAmount,
        toAmount,
        rate: rate.toString(),
        feeAmount,
        feeCurrency: 'USD',
        expiresAt: new Date(Date.now() + 300000),
        liquidityProvider: 'LP_PRIME'
      });
    } catch (error) {
      console.error('Quote request failed:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Execute Conversion Handler
  const handleExecuteConversion = async () => {
    if (!currentQuote) return;
    
    setIsLoading(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      const newOrder: ConversionOrder = {
        orderId: generateUUID(),
        orderNumber: `ORD-2026-${String(orders.length + 1).padStart(6, '0')}`,
        status: 'executing',
        fromCurrency: currentQuote.fromCurrency,
        toCurrency: currentQuote.toCurrency,
        fromAmount: currentQuote.fromAmount,
        toAmount: currentQuote.toAmount,
        executedRate: currentQuote.rate,
        feeAmount: currentQuote.feeAmount,
        confirmations: 0,
        createdAt: new Date().toISOString()
      };
      
      setOrders([newOrder, ...orders]);
      setCurrentQuote(null);
      setConversionForm({ ...conversionForm, fromAmount: '' });
    } catch (error) {
      console.error('Conversion execution failed:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Copy to clipboard
  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  // ============================================================================
  // RENDER FUNCTIONS
  // ============================================================================

  const renderDashboard = () => (
    <div className="space-y-6">
      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-gradient-to-br from-green-900/50 to-emerald-900/30 rounded-xl p-4 border border-green-500/30">
          <div className="flex items-center gap-3 mb-2">
            <Wallet className="w-5 h-5 text-green-400" />
            <span className="text-sm text-slate-400">{labels.totalValue}</span>
          </div>
          <div className="text-2xl font-bold text-green-400">
            ${(1500000 + 25.75 * 43250 + 450 * 2400).toLocaleString()}
          </div>
        </div>
        
        <div className="bg-gradient-to-br from-blue-900/50 to-cyan-900/30 rounded-xl p-4 border border-blue-500/30">
          <div className="flex items-center gap-3 mb-2">
            <ArrowRightLeft className="w-5 h-5 text-blue-400" />
            <span className="text-sm text-slate-400">{isSpanish ? 'Conversiones Hoy' : 'Conversions Today'}</span>
          </div>
          <div className="text-2xl font-bold text-blue-400">
            {orders.filter(o => new Date(o.createdAt).toDateString() === new Date().toDateString()).length}
          </div>
        </div>
        
        <div className="bg-gradient-to-br from-purple-900/50 to-violet-900/30 rounded-xl p-4 border border-purple-500/30">
          <div className="flex items-center gap-3 mb-2">
            <Activity className="w-5 h-5 text-purple-400" />
            <span className="text-sm text-slate-400">{isSpanish ? 'Liquidez Activa' : 'Active Liquidity'}</span>
          </div>
          <div className="text-2xl font-bold text-purple-400">
            {liquidityProviders.filter(lp => lp.status === 'healthy').length}/{liquidityProviders.length}
          </div>
        </div>
        
        <div className="bg-gradient-to-br from-orange-900/50 to-amber-900/30 rounded-xl p-4 border border-orange-500/30">
          <div className="flex items-center gap-3 mb-2">
            <Webhook className="w-5 h-5 text-orange-400" />
            <span className="text-sm text-slate-400">{isSpanish ? 'Webhooks 24h' : 'Webhooks 24h'}</span>
          </div>
          <div className="text-2xl font-bold text-orange-400">
            {webhookEvents.length}
          </div>
        </div>
      </div>

      {/* Balances */}
      <div className="bg-slate-800/50 rounded-xl border border-slate-700/50 overflow-hidden">
        <div className="p-4 border-b border-slate-700/50 flex items-center justify-between">
          <h3 className="font-bold flex items-center gap-2">
            <Wallet className="w-5 h-5 text-blue-400" />
            {labels.balances}
          </h3>
          <button 
            onClick={initializeDemoData}
            className="p-2 hover:bg-slate-700 rounded-lg transition-all"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
        <div className="divide-y divide-slate-700/50">
          {balances.map((balance, index) => (
            <div key={index} className="p-4 flex items-center justify-between hover:bg-slate-700/30 transition-all">
              <div className="flex items-center gap-3">
                {getCurrencyIcon(balance.currency)}
                <div>
                  <div className="font-bold">{balance.currency}</div>
                  <div className="text-xs text-slate-400">
                    {isSpanish ? 'Última tx:' : 'Last tx:'} {new Date(balance.lastTransactionAt).toLocaleString()}
                  </div>
                </div>
              </div>
              <div className="text-right">
                <div className="font-mono font-bold">
                  {formatCurrency(balance.balance, balance.currency)}
                </div>
                <div className="text-xs text-slate-400">
                  <span className="text-green-400">{formatCurrency(balance.availableBalance, balance.currency)}</span>
                  {' / '}
                  <span className="text-orange-400">{formatCurrency(balance.lockedBalance, balance.currency)}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Recent Orders */}
      <div className="bg-slate-800/50 rounded-xl border border-slate-700/50 overflow-hidden">
        <div className="p-4 border-b border-slate-700/50">
          <h3 className="font-bold flex items-center gap-2">
            <ArrowRightLeft className="w-5 h-5 text-purple-400" />
            {isSpanish ? 'Órdenes Recientes' : 'Recent Orders'}
          </h3>
        </div>
        <div className="divide-y divide-slate-700/50">
          {orders.slice(0, 5).map((order, index) => (
            <div key={index} className="p-4 flex items-center justify-between hover:bg-slate-700/30 transition-all">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                  order.status === 'settled' ? 'bg-green-500/20' :
                  order.status === 'executing' ? 'bg-blue-500/20' :
                  order.status === 'failed' ? 'bg-red-500/20' : 'bg-slate-500/20'
                }`}>
                  {order.status === 'settled' ? <CheckCircle2 className="w-5 h-5 text-green-400" /> :
                   order.status === 'executing' ? <RefreshCw className="w-5 h-5 text-blue-400 animate-spin" /> :
                   order.status === 'failed' ? <XCircle className="w-5 h-5 text-red-400" /> :
                   <Clock className="w-5 h-5 text-slate-400" />}
                </div>
                <div>
                  <div className="font-mono text-sm">{order.orderNumber}</div>
                  <div className="text-xs text-slate-400">
                    {order.fromCurrency} → {order.toCurrency}
                  </div>
                </div>
              </div>
              <div className="text-right">
                <div className="font-mono">
                  {formatCurrency(order.fromAmount, order.fromCurrency)} {order.fromCurrency}
                </div>
                <div className="text-xs text-green-400">
                  → {order.toAmount ? formatCurrency(order.toAmount, order.toCurrency) : '...'} {order.toCurrency}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Liquidity Providers */}
      <div className="bg-slate-800/50 rounded-xl border border-slate-700/50 overflow-hidden">
        <div className="p-4 border-b border-slate-700/50">
          <h3 className="font-bold flex items-center gap-2">
            <Network className="w-5 h-5 text-cyan-400" />
            {labels.liquidityProviders}
          </h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4">
          {liquidityProviders.map((lp, index) => (
            <div key={index} className={`p-4 rounded-xl border ${
              lp.status === 'healthy' ? 'bg-green-900/20 border-green-500/30' :
              lp.status === 'degraded' ? 'bg-yellow-900/20 border-yellow-500/30' :
              'bg-red-900/20 border-red-500/30'
            }`}>
              <div className="flex items-center justify-between mb-2">
                <span className="font-bold">{lp.name}</span>
                <div className={`w-3 h-3 rounded-full ${
                  lp.status === 'healthy' ? 'bg-green-400 animate-pulse' :
                  lp.status === 'degraded' ? 'bg-yellow-400' : 'bg-red-400'
                }`} />
              </div>
              <div className="text-xs text-slate-400 space-y-1">
                <div>Spread: <span className="text-white">{lp.currentSpread}</span></div>
                <div>Min: <span className="text-white">${parseInt(lp.minTradeSize).toLocaleString()}</span></div>
                <div>Max: <span className="text-white">${parseInt(lp.maxTradeSize).toLocaleString()}</span></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  const renderConversion = () => (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Quote Request Form */}
      <div className="bg-slate-800/50 rounded-xl border border-slate-700/50 overflow-hidden">
        <div className="p-4 border-b border-slate-700/50 bg-gradient-to-r from-blue-600/20 to-purple-600/20">
          <h3 className="font-bold flex items-center gap-2">
            <ArrowRightLeft className="w-5 h-5 text-blue-400" />
            {labels.requestQuote}
          </h3>
        </div>
        <div className="p-6 space-y-4">
          {/* From Currency */}
          <div>
            <label className="block text-sm text-slate-400 mb-2">
              {isSpanish ? 'Desde' : 'From'}
            </label>
            <div className="flex gap-2">
              <select
                value={conversionForm.fromCurrency}
                onChange={(e) => setConversionForm({ ...conversionForm, fromCurrency: e.target.value })}
                className="bg-slate-700 border border-slate-600 rounded-lg px-4 py-3 flex-1"
              >
                {SUPPORTED_CURRENCIES.map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
              <input
                type="number"
                value={conversionForm.fromAmount}
                onChange={(e) => setConversionForm({ ...conversionForm, fromAmount: e.target.value })}
                placeholder="0.00"
                className="bg-slate-700 border border-slate-600 rounded-lg px-4 py-3 flex-1 font-mono"
              />
            </div>
          </div>

          {/* Swap Button */}
          <div className="flex justify-center">
            <button
              onClick={() => setConversionForm({
                ...conversionForm,
                fromCurrency: conversionForm.toCurrency,
                toCurrency: conversionForm.fromCurrency
              })}
              className="p-3 bg-slate-700 hover:bg-slate-600 rounded-full transition-all"
            >
              <ArrowRightLeft className="w-5 h-5" />
            </button>
          </div>

          {/* To Currency */}
          <div>
            <label className="block text-sm text-slate-400 mb-2">
              {isSpanish ? 'Hacia' : 'To'}
            </label>
            <select
              value={conversionForm.toCurrency}
              onChange={(e) => setConversionForm({ ...conversionForm, toCurrency: e.target.value })}
              className="bg-slate-700 border border-slate-600 rounded-lg px-4 py-3 w-full"
            >
              {SUPPORTED_CURRENCIES.filter(c => c !== conversionForm.fromCurrency).map(c => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>

          {/* Request Quote Button */}
          <button
            onClick={handleRequestQuote}
            disabled={!conversionForm.fromAmount || isLoading}
            className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 disabled:opacity-50 py-4 rounded-xl font-bold flex items-center justify-center gap-2 transition-all"
          >
            {isLoading ? <RefreshCw className="w-5 h-5 animate-spin" /> : <Zap className="w-5 h-5" />}
            {labels.requestQuote}
          </button>
        </div>
      </div>

      {/* Quote Display & Execution */}
      <div className="bg-slate-800/50 rounded-xl border border-slate-700/50 overflow-hidden">
        <div className="p-4 border-b border-slate-700/50 bg-gradient-to-r from-green-600/20 to-emerald-600/20">
          <h3 className="font-bold flex items-center gap-2">
            <FileJson className="w-5 h-5 text-green-400" />
            {isSpanish ? 'Cotización Actual' : 'Current Quote'}
          </h3>
        </div>
        <div className="p-6">
          {currentQuote ? (
            <div className="space-y-4">
              {/* Quote Details */}
              <div className="bg-slate-900/50 rounded-xl p-4 border border-slate-700">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-slate-400">{isSpanish ? 'ID Cotización' : 'Quote ID'}</span>
                    <div className="font-mono text-xs mt-1 flex items-center gap-2">
                      {currentQuote.quoteId.substring(0, 8)}...
                      <button onClick={() => copyToClipboard(currentQuote.quoteId)}>
                        <Copy className="w-3 h-3 text-slate-400 hover:text-white" />
                      </button>
                    </div>
                  </div>
                  <div>
                    <span className="text-slate-400">{isSpanish ? 'Proveedor' : 'Provider'}</span>
                    <div className="font-mono mt-1">{currentQuote.liquidityProvider}</div>
                  </div>
                  <div>
                    <span className="text-slate-400">{isSpanish ? 'Tasa' : 'Rate'}</span>
                    <div className="font-mono text-lg text-green-400 mt-1">
                      1 {currentQuote.toCurrency} = ${parseFloat(currentQuote.rate).toLocaleString()}
                    </div>
                  </div>
                  <div>
                    <span className="text-slate-400">{isSpanish ? 'Comisión' : 'Fee'}</span>
                    <div className="font-mono mt-1">${currentQuote.feeAmount} {currentQuote.feeCurrency}</div>
                  </div>
                </div>

                <div className="mt-4 pt-4 border-t border-slate-700">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-slate-400 text-sm">{isSpanish ? 'Envías' : 'You Send'}</div>
                      <div className="text-xl font-bold">
                        {formatCurrency(currentQuote.fromAmount, currentQuote.fromCurrency)} {currentQuote.fromCurrency}
                      </div>
                    </div>
                    <ChevronRight className="w-6 h-6 text-slate-500" />
                    <div className="text-right">
                      <div className="text-slate-400 text-sm">{isSpanish ? 'Recibes' : 'You Receive'}</div>
                      <div className="text-xl font-bold text-green-400">
                        {formatCurrency(currentQuote.toAmount, currentQuote.toCurrency)} {currentQuote.toCurrency}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Expiration Timer */}
                <div className="mt-4 flex items-center gap-2 text-sm">
                  <Clock className="w-4 h-4 text-orange-400" />
                  <span className="text-slate-400">{isSpanish ? 'Expira en:' : 'Expires in:'}</span>
                  <span className="text-orange-400 font-mono">
                    {Math.max(0, Math.floor((currentQuote.expiresAt.getTime() - Date.now()) / 1000))}s
                  </span>
                </div>
              </div>

              {/* Execute Button */}
              <button
                onClick={handleExecuteConversion}
                disabled={isLoading || new Date() > currentQuote.expiresAt}
                className="w-full bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 disabled:opacity-50 py-4 rounded-xl font-bold flex items-center justify-center gap-2 transition-all"
              >
                {isLoading ? <RefreshCw className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
                {labels.executeConversion}
              </button>
            </div>
          ) : (
            <div className="text-center py-12 text-slate-400">
              <ArrowRightLeft className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>{isSpanish ? 'Solicita una cotización para comenzar' : 'Request a quote to begin'}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  const renderTransactions = () => (
    <div className="bg-slate-800/50 rounded-xl border border-slate-700/50 overflow-hidden">
      <div className="p-4 border-b border-slate-700/50 flex items-center justify-between">
        <h3 className="font-bold flex items-center gap-2">
          <Activity className="w-5 h-5 text-blue-400" />
          {labels.transactions}
        </h3>
        <div className="flex items-center gap-2">
          <button className="p-2 hover:bg-slate-700 rounded-lg transition-all">
            <Filter className="w-4 h-4" />
          </button>
          <button className="p-2 hover:bg-slate-700 rounded-lg transition-all">
            <Download className="w-4 h-4" />
          </button>
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-slate-900/50 text-xs text-slate-400">
            <tr>
              <th className="px-4 py-3 text-left">{isSpanish ? 'ID' : 'ID'}</th>
              <th className="px-4 py-3 text-left">{isSpanish ? 'Tipo' : 'Type'}</th>
              <th className="px-4 py-3 text-left">{isSpanish ? 'Moneda' : 'Currency'}</th>
              <th className="px-4 py-3 text-right">{isSpanish ? 'Monto' : 'Amount'}</th>
              <th className="px-4 py-3 text-center">{isSpanish ? 'Estado' : 'Status'}</th>
              <th className="px-4 py-3 text-left">{isSpanish ? 'Referencia' : 'Reference'}</th>
              <th className="px-4 py-3 text-left">{isSpanish ? 'Fecha' : 'Date'}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-700/50">
            {transactions.map((tx, index) => (
              <tr key={index} className="hover:bg-slate-700/30 transition-all">
                <td className="px-4 py-3 font-mono text-xs">{tx.transactionId.substring(0, 8)}...</td>
                <td className="px-4 py-3">
                  <span className={`px-2 py-1 rounded text-xs ${
                    tx.type === 'deposit' ? 'bg-green-500/20 text-green-400' :
                    tx.type === 'withdrawal' ? 'bg-red-500/20 text-red-400' :
                    tx.type === 'conversion' ? 'bg-blue-500/20 text-blue-400' :
                    'bg-slate-500/20 text-slate-400'
                  }`}>
                    {tx.type}
                  </span>
                </td>
                <td className="px-4 py-3 flex items-center gap-2">
                  {getCurrencyIcon(tx.currency)}
                  {tx.currency}
                </td>
                <td className="px-4 py-3 text-right font-mono">
                  {formatCurrency(tx.amount, tx.currency)}
                </td>
                <td className="px-4 py-3 text-center">
                  <span className={`px-2 py-1 rounded text-xs ${
                    tx.status === 'completed' ? 'bg-green-500/20 text-green-400' :
                    tx.status === 'processing' ? 'bg-blue-500/20 text-blue-400' :
                    tx.status === 'pending' ? 'bg-yellow-500/20 text-yellow-400' :
                    'bg-red-500/20 text-red-400'
                  }`}>
                    {tx.status}
                  </span>
                </td>
                <td className="px-4 py-3 font-mono text-xs">{tx.reference}</td>
                <td className="px-4 py-3 text-xs text-slate-400">
                  {new Date(tx.createdAt).toLocaleString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );

  const renderBlockchain = () => (
    <div className="space-y-6">
      {/* Blockchain Status Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {blockchainStatus.map((chain, index) => (
          <div key={index} className={`bg-slate-800/50 rounded-xl border overflow-hidden ${
            chain.currency === 'BTC' ? 'border-orange-500/30' : 'border-purple-500/30'
          }`}>
            <div className={`p-4 border-b border-slate-700/50 ${
              chain.currency === 'BTC' ? 'bg-gradient-to-r from-orange-600/20 to-amber-600/20' : 
              'bg-gradient-to-r from-purple-600/20 to-violet-600/20'
            }`}>
              <div className="flex items-center justify-between">
                <h3 className="font-bold flex items-center gap-2">
                  {chain.currency === 'BTC' ? 
                    <Bitcoin className="w-6 h-6 text-orange-400" /> : 
                    <Coins className="w-6 h-6 text-purple-400" />
                  }
                  {chain.currency} Network
                </h3>
                <div className={`flex items-center gap-2 px-3 py-1 rounded-full text-xs ${
                  chain.networkStatus === 'online' ? 'bg-green-500/20 text-green-400' :
                  chain.networkStatus === 'syncing' ? 'bg-blue-500/20 text-blue-400' :
                  'bg-red-500/20 text-red-400'
                }`}>
                  <div className={`w-2 h-2 rounded-full ${
                    chain.networkStatus === 'online' ? 'bg-green-400 animate-pulse' :
                    chain.networkStatus === 'syncing' ? 'bg-blue-400 animate-pulse' :
                    'bg-red-400'
                  }`} />
                  {chain.networkStatus}
                </div>
              </div>
            </div>
            <div className="p-4 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-slate-900/50 rounded-lg p-3">
                  <div className="text-xs text-slate-400 mb-1">{isSpanish ? 'Bloque Actual' : 'Current Block'}</div>
                  <div className="font-mono text-lg">{chain.currentBlock.toLocaleString()}</div>
                </div>
                <div className="bg-slate-900/50 rounded-lg p-3">
                  <div className="text-xs text-slate-400 mb-1">{isSpanish ? 'Último Escaneado' : 'Last Scanned'}</div>
                  <div className="font-mono text-lg">{chain.lastScannedBlock.toLocaleString()}</div>
                </div>
                <div className="bg-slate-900/50 rounded-lg p-3">
                  <div className="text-xs text-slate-400 mb-1">{isSpanish ? 'TX Pendientes' : 'Pending TX'}</div>
                  <div className="font-mono text-lg text-yellow-400">{chain.pendingTransactions}</div>
                </div>
                <div className="bg-slate-900/50 rounded-lg p-3">
                  <div className="text-xs text-slate-400 mb-1">{isSpanish ? 'Confirmaciones Req.' : 'Confirmations Req.'}</div>
                  <div className="font-mono text-lg">{chain.confirmationsRequired}</div>
                </div>
              </div>
              
              {/* Sync Progress */}
              <div>
                <div className="flex justify-between text-xs text-slate-400 mb-1">
                  <span>{isSpanish ? 'Progreso de Sincronización' : 'Sync Progress'}</span>
                  <span>{((chain.lastScannedBlock / chain.currentBlock) * 100).toFixed(4)}%</span>
                </div>
                <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
                  <div 
                    className={`h-full transition-all ${
                      chain.currency === 'BTC' ? 'bg-gradient-to-r from-orange-500 to-amber-500' :
                      'bg-gradient-to-r from-purple-500 to-violet-500'
                    }`}
                    style={{ width: `${(chain.lastScannedBlock / chain.currentBlock) * 100}%` }}
                  />
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Pending Transactions */}
      <div className="bg-slate-800/50 rounded-xl border border-slate-700/50 overflow-hidden">
        <div className="p-4 border-b border-slate-700/50">
          <h3 className="font-bold flex items-center gap-2">
            <Clock className="w-5 h-5 text-yellow-400" />
            {isSpanish ? 'Transacciones Pendientes de Confirmación' : 'Pending Confirmation Transactions'}
          </h3>
        </div>
        <div className="p-4">
          {orders.filter(o => o.status === 'executing' || o.status === 'settling').length > 0 ? (
            <div className="space-y-3">
              {orders.filter(o => o.status === 'executing' || o.status === 'settling').map((order, index) => (
                <div key={index} className="bg-slate-900/50 rounded-lg p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <RefreshCw className="w-5 h-5 text-blue-400 animate-spin" />
                    <div>
                      <div className="font-mono text-sm">{order.orderNumber}</div>
                      <div className="text-xs text-slate-400">
                        {order.fromCurrency} → {order.toCurrency}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm">{order.confirmations} / {
                      order.toCurrency === 'BTC' ? 6 : 12
                    } {isSpanish ? 'confirmaciones' : 'confirmations'}</div>
                    <div className="h-1.5 w-24 bg-slate-700 rounded-full overflow-hidden mt-1">
                      <div 
                        className="h-full bg-blue-500 transition-all"
                        style={{ width: `${(order.confirmations / (order.toCurrency === 'BTC' ? 6 : 12)) * 100}%` }}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-slate-400">
              <CheckCircle2 className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>{isSpanish ? 'No hay transacciones pendientes' : 'No pending transactions'}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  const renderWebhooks = () => (
    <div className="space-y-6">
      {/* Webhook Configuration */}
      <div className="bg-slate-800/50 rounded-xl border border-slate-700/50 overflow-hidden">
        <div className="p-4 border-b border-slate-700/50 bg-gradient-to-r from-orange-600/20 to-amber-600/20">
          <h3 className="font-bold flex items-center gap-2">
            <Webhook className="w-5 h-5 text-orange-400" />
            {isSpanish ? 'Configuración de Webhooks' : 'Webhook Configuration'}
          </h3>
        </div>
        <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-slate-900/50 rounded-lg p-4">
            <div className="text-xs text-slate-400 mb-2">Endpoint URL</div>
            <div className="font-mono text-sm bg-slate-800 rounded px-3 py-2 flex items-center justify-between">
              <span>https://your-domain.com/webhook/vega</span>
              <Copy className="w-4 h-4 text-slate-400 cursor-pointer hover:text-white" />
            </div>
          </div>
          <div className="bg-slate-900/50 rounded-lg p-4">
            <div className="text-xs text-slate-400 mb-2">{labels.webhookSecret}</div>
            <div className="font-mono text-sm bg-slate-800 rounded px-3 py-2 flex items-center justify-between">
              <span>••••••••••••••••</span>
              <Eye className="w-4 h-4 text-slate-400 cursor-pointer hover:text-white" />
            </div>
          </div>
        </div>
      </div>

      {/* Webhook Events */}
      <div className="bg-slate-800/50 rounded-xl border border-slate-700/50 overflow-hidden">
        <div className="p-4 border-b border-slate-700/50 flex items-center justify-between">
          <h3 className="font-bold flex items-center gap-2">
            <Activity className="w-5 h-5 text-blue-400" />
            {labels.recentWebhooks}
          </h3>
          <button className="p-2 hover:bg-slate-700 rounded-lg transition-all">
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
        <div className="divide-y divide-slate-700/50">
          {webhookEvents.map((event, index) => (
            <div key={index} className="p-4 hover:bg-slate-700/30 transition-all">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                    event.status === 'completed' ? 'bg-green-500/20' :
                    event.status === 'processing' ? 'bg-blue-500/20' :
                    event.status === 'failed' ? 'bg-red-500/20' : 'bg-slate-500/20'
                  }`}>
                    {event.status === 'completed' ? <CheckCircle2 className="w-4 h-4 text-green-400" /> :
                     event.status === 'processing' ? <RefreshCw className="w-4 h-4 text-blue-400 animate-spin" /> :
                     <XCircle className="w-4 h-4 text-red-400" />}
                  </div>
                  <div>
                    <div className="font-mono text-sm">{event.type}</div>
                    <div className="text-xs text-slate-400">
                      ID: {event.id.substring(0, 8)}...
                    </div>
                  </div>
                </div>
                <div className="text-xs text-slate-400">
                  {new Date(event.timestamp).toLocaleString()}
                </div>
              </div>
              <div className="bg-slate-900/50 rounded-lg p-3 font-mono text-xs overflow-x-auto">
                <pre className="text-green-400">{JSON.stringify(event.payload, null, 2)}</pre>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Signature Verification Example */}
      <div className="bg-slate-800/50 rounded-xl border border-slate-700/50 overflow-hidden">
        <div className="p-4 border-b border-slate-700/50">
          <h3 className="font-bold flex items-center gap-2">
            <Code2 className="w-5 h-5 text-purple-400" />
            {isSpanish ? 'Ejemplo de Verificación de Firma' : 'Signature Verification Example'}
          </h3>
        </div>
        <div className="p-4">
          <pre className="bg-slate-900 rounded-lg p-4 font-mono text-xs text-green-400 overflow-x-auto">
{`// Verificación HMAC-SHA256
const crypto = require('crypto');

function verifyWebhookSignature(payload, signature, timestamp, secret) {
  const message = \`\${timestamp}.\${JSON.stringify(payload)}\`;
  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(message)
    .digest('hex');
  
  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expectedSignature)
  );
}`}
          </pre>
        </div>
      </div>
    </div>
  );

  const renderSettings = () => (
    <div className="space-y-6">
      {/* API Configuration */}
      <div className="bg-slate-800/50 rounded-xl border border-slate-700/50 overflow-hidden">
        <div className="p-4 border-b border-slate-700/50 bg-gradient-to-r from-blue-600/20 to-cyan-600/20">
          <h3 className="font-bold flex items-center gap-2">
            <Settings className="w-5 h-5 text-blue-400" />
            {isSpanish ? 'Configuración de API' : 'API Configuration'}
          </h3>
        </div>
        <div className="p-6 space-y-4">
          {/* Environment */}
          <div>
            <label className="block text-sm text-slate-400 mb-2">{labels.environment}</label>
            <div className="flex gap-2">
              <button
                onClick={() => setConfig({ ...config, environment: 'sandbox' })}
                className={`flex-1 py-3 rounded-lg font-bold transition-all ${
                  config.environment === 'sandbox' 
                    ? 'bg-blue-600 text-white' 
                    : 'bg-slate-700 hover:bg-slate-600'
                }`}
              >
                🧪 {labels.sandbox}
              </button>
              <button
                onClick={() => setConfig({ ...config, environment: 'production' })}
                className={`flex-1 py-3 rounded-lg font-bold transition-all ${
                  config.environment === 'production' 
                    ? 'bg-green-600 text-white' 
                    : 'bg-slate-700 hover:bg-slate-600'
                }`}
              >
                🚀 {labels.production}
              </button>
            </div>
          </div>

          {/* API Key */}
          <div>
            <label className="block text-sm text-slate-400 mb-2">{labels.apiKey}</label>
            <input
              type="text"
              value={config.apiKey}
              onChange={(e) => setConfig({ ...config, apiKey: e.target.value })}
              placeholder="vega_api_key_..."
              className="w-full bg-slate-700 border border-slate-600 rounded-lg px-4 py-3 font-mono"
            />
          </div>

          {/* API Secret */}
          <div>
            <label className="block text-sm text-slate-400 mb-2">{labels.apiSecret}</label>
            <div className="relative">
              <input
                type={showApiSecret ? 'text' : 'password'}
                value={config.apiSecret}
                onChange={(e) => setConfig({ ...config, apiSecret: e.target.value })}
                placeholder="vega_secret_..."
                className="w-full bg-slate-700 border border-slate-600 rounded-lg px-4 py-3 font-mono pr-12"
              />
              <button
                onClick={() => setShowApiSecret(!showApiSecret)}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 hover:bg-slate-600 rounded"
              >
                {showApiSecret ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
          </div>

          {/* Webhook Secret */}
          <div>
            <label className="block text-sm text-slate-400 mb-2">{labels.webhookSecret}</label>
            <input
              type="password"
              value={config.webhookSecret}
              onChange={(e) => setConfig({ ...config, webhookSecret: e.target.value })}
              placeholder="whsec_..."
              className="w-full bg-slate-700 border border-slate-600 rounded-lg px-4 py-3 font-mono"
            />
          </div>

          {/* Connect/Disconnect Button */}
          <button
            onClick={isConnected ? handleDisconnect : handleConnect}
            disabled={isLoading || (!config.apiKey && !isConnected)}
            className={`w-full py-4 rounded-xl font-bold flex items-center justify-center gap-2 transition-all ${
              isConnected 
                ? 'bg-red-600 hover:bg-red-500' 
                : 'bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500'
            } disabled:opacity-50`}
          >
            {isLoading ? (
              <RefreshCw className="w-5 h-5 animate-spin" />
            ) : isConnected ? (
              <>
                <XCircle className="w-5 h-5" />
                {labels.disconnect}
              </>
            ) : (
              <>
                <Zap className="w-5 h-5" />
                {labels.connect}
              </>
            )}
          </button>
        </div>
      </div>

      {/* API Endpoints Reference */}
      <div className="bg-slate-800/50 rounded-xl border border-slate-700/50 overflow-hidden">
        <div className="p-4 border-b border-slate-700/50">
          <h3 className="font-bold flex items-center gap-2">
            <Globe className="w-5 h-5 text-cyan-400" />
            {isSpanish ? 'Endpoints de API' : 'API Endpoints'}
          </h3>
        </div>
        <div className="p-4 space-y-3 font-mono text-sm">
          <div className="bg-slate-900/50 rounded-lg p-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 bg-green-500/20 text-green-400 rounded text-xs">GET</span>
              <span>/api/v1/accounts/balances</span>
            </div>
            <Copy className="w-4 h-4 text-slate-400 cursor-pointer hover:text-white" />
          </div>
          <div className="bg-slate-900/50 rounded-lg p-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 bg-blue-500/20 text-blue-400 rounded text-xs">POST</span>
              <span>/api/v1/conversions/quote</span>
            </div>
            <Copy className="w-4 h-4 text-slate-400 cursor-pointer hover:text-white" />
          </div>
          <div className="bg-slate-900/50 rounded-lg p-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 bg-blue-500/20 text-blue-400 rounded text-xs">POST</span>
              <span>/api/v1/conversions/execute</span>
            </div>
            <Copy className="w-4 h-4 text-slate-400 cursor-pointer hover:text-white" />
          </div>
          <div className="bg-slate-900/50 rounded-lg p-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 bg-green-500/20 text-green-400 rounded text-xs">GET</span>
              <span>/api/v1/transactions</span>
            </div>
            <Copy className="w-4 h-4 text-slate-400 cursor-pointer hover:text-white" />
          </div>
          <div className="bg-slate-900/50 rounded-lg p-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 bg-blue-500/20 text-blue-400 rounded text-xs">POST</span>
              <span>/api/v1/withdrawals/crypto</span>
            </div>
            <Copy className="w-4 h-4 text-slate-400 cursor-pointer hover:text-white" />
          </div>
          <div className="bg-slate-900/50 rounded-lg p-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 bg-orange-500/20 text-orange-400 rounded text-xs">WEBHOOK</span>
              <span>/webhook/daes/transfer</span>
            </div>
            <Copy className="w-4 h-4 text-slate-400 cursor-pointer hover:text-white" />
          </div>
        </div>
      </div>

      {/* Security Information */}
      <div className="bg-slate-800/50 rounded-xl border border-slate-700/50 overflow-hidden">
        <div className="p-4 border-b border-slate-700/50">
          <h3 className="font-bold flex items-center gap-2">
            <Shield className="w-5 h-5 text-green-400" />
            {isSpanish ? 'Información de Seguridad' : 'Security Information'}
          </h3>
        </div>
        <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-slate-900/50 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <Lock className="w-4 h-4 text-green-400" />
              <span className="font-bold">HMAC-SHA256</span>
            </div>
            <p className="text-xs text-slate-400">
              {isSpanish 
                ? 'Todas las solicitudes están firmadas con HMAC-SHA256 para garantizar la integridad.'
                : 'All requests are signed with HMAC-SHA256 to ensure integrity.'}
            </p>
          </div>
          <div className="bg-slate-900/50 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <Key className="w-4 h-4 text-blue-400" />
              <span className="font-bold">TLS 1.3</span>
            </div>
            <p className="text-xs text-slate-400">
              {isSpanish 
                ? 'Conexiones encriptadas con TLS 1.3 para máxima seguridad.'
                : 'Encrypted connections with TLS 1.3 for maximum security.'}
            </p>
          </div>
          <div className="bg-slate-900/50 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <Clock className="w-4 h-4 text-orange-400" />
              <span className="font-bold">{isSpanish ? 'Protección Replay' : 'Replay Protection'}</span>
            </div>
            <p className="text-xs text-slate-400">
              {isSpanish 
                ? 'Timestamps validados dentro de ventana de 5 minutos.'
                : 'Timestamps validated within 5-minute window.'}
            </p>
          </div>
          <div className="bg-slate-900/50 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <Database className="w-4 h-4 text-purple-400" />
              <span className="font-bold">{isSpanish ? 'Idempotencia' : 'Idempotency'}</span>
            </div>
            <p className="text-xs text-slate-400">
              {isSpanish 
                ? 'Claves de idempotencia con TTL de 7 días.'
                : 'Idempotency keys with 7-day TTL.'}
            </p>
          </div>
        </div>
      </div>
    </div>
  );

  // ============================================================================
  // MAIN RENDER
  // ============================================================================

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white">
      {/* Header */}
      <div className="bg-slate-800/50 border-b border-slate-700/50 sticky top-0 z-50 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center">
                <Server className="w-7 h-7" />
              </div>
              <div>
                <h1 className="text-xl font-bold">{labels.title}</h1>
                <p className="text-sm text-slate-400">{labels.subtitle}</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              {/* Connection Status */}
              <div className={`flex items-center gap-2 px-4 py-2 rounded-lg ${
                isConnected ? 'bg-green-500/20 text-green-400' : 'bg-slate-700 text-slate-400'
              }`}>
                <div className={`w-2 h-2 rounded-full ${
                  isConnected ? 'bg-green-400 animate-pulse' : 'bg-slate-500'
                }`} />
                {isConnected ? labels.connected : labels.disconnected}
              </div>
              
              {/* Language Toggle */}
              <button
                onClick={() => setIsSpanish(!isSpanish)}
                className="p-2 hover:bg-slate-700 rounded-lg transition-all"
              >
                {isSpanish ? '🇪🇸' : '🇺🇸'}
              </button>
            </div>
          </div>

          {/* Navigation Tabs */}
          <div className="flex gap-2 mt-4 overflow-x-auto">
            {[
              { id: 'dashboard', label: labels.dashboard, icon: <BarChart3 className="w-4 h-4" /> },
              { id: 'conversion', label: labels.conversion, icon: <ArrowRightLeft className="w-4 h-4" /> },
              { id: 'transactions', label: labels.transactions, icon: <Activity className="w-4 h-4" /> },
              { id: 'blockchain', label: labels.blockchain, icon: <Layers className="w-4 h-4" /> },
              { id: 'webhooks', label: labels.webhooks, icon: <Webhook className="w-4 h-4" /> },
              { id: 'settings', label: labels.settings, icon: <Settings className="w-4 h-4" /> }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all whitespace-nowrap ${
                  activeTab === tab.id
                    ? 'bg-blue-600 text-white'
                    : 'bg-slate-700/50 hover:bg-slate-700 text-slate-300'
                }`}
              >
                {tab.icon}
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 py-6">
        {activeTab === 'dashboard' && renderDashboard()}
        {activeTab === 'conversion' && renderConversion()}
        {activeTab === 'transactions' && renderTransactions()}
        {activeTab === 'blockchain' && renderBlockchain()}
        {activeTab === 'webhooks' && renderWebhooks()}
        {activeTab === 'settings' && renderSettings()}
      </div>

      {/* Footer */}
      <div className="bg-slate-800/50 border-t border-slate-700/50 py-4 mt-8">
        <div className="max-w-7xl mx-auto px-4 flex items-center justify-between text-sm text-slate-400">
          <div className="flex items-center gap-4">
            <span>API VEGA v1.0</span>
            <span>•</span>
            <span>{isSpanish ? 'Grado Institucional' : 'Institutional Grade'}</span>
          </div>
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1">
              <Shield className="w-4 h-4 text-green-400" />
              SOC 2 Type II
            </span>
            <span className="flex items-center gap-1">
              <Lock className="w-4 h-4 text-blue-400" />
              ISO 27001
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default VegaAPIModule;

