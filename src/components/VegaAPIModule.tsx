import React, { useState, useEffect, useCallback } from 'react';
import {
  LayoutDashboard, DollarSign, RefreshCcw, ArrowRightLeft, History, Settings, 
  Globe, Zap, Shield, CheckCircle, XCircle, Server, Key, Bell, TrendingUp, 
  Database, ArrowUpRight, ArrowDownLeft, Loader, Clock, Lock, AlertTriangle, 
  Wifi, WifiOff, ExternalLink, BookOpen, Copy, Eye, EyeOff, Activity, Coins,
  FileText, Users, Layers, Link2, Play, FlaskConical, Power, Terminal, Code,
  Send, Download, Upload, CreditCard, Banknote, Building2, TestTube2
} from 'lucide-react';
import { useLanguage } from '../lib/i18n';

// ============================================================================
// VEGA API CONFIGURATION - https://api.vega-dev.com/v1
// ============================================================================

const VEGA_API_CONFIG = {
  // Base URLs
  DEV_BASE_URL: 'https://api.vega-dev.com/v1',
  PROD_BASE_URL: 'https://api.vega.com/v1',
  
  // API Endpoints
  ENDPOINTS: {
    // Authentication
    AUTH: {
      TOKEN: '/auth/token',
      REFRESH: '/auth/refresh',
      REVOKE: '/auth/revoke',
    },
    // Accounts & Balances
    ACCOUNTS: {
      LIST: '/accounts',
      GET: '/accounts/:id',
      BALANCES: '/accounts/:id/balances',
      TRANSACTIONS: '/accounts/:id/transactions',
    },
    // Conversions
    CONVERSIONS: {
      QUOTE: '/conversions/quote',
      CREATE: '/conversions',
      GET: '/conversions/:id',
      LIST: '/conversions',
      CANCEL: '/conversions/:id/cancel',
    },
    // Orders
    ORDERS: {
      CREATE: '/orders',
      GET: '/orders/:id',
      LIST: '/orders',
      CANCEL: '/orders/:id/cancel',
    },
    // Deposits & Withdrawals
    DEPOSITS: {
      CREATE: '/deposits',
      GET: '/deposits/:id',
      LIST: '/deposits',
      ADDRESS: '/deposits/address/:currency',
    },
    WITHDRAWALS: {
      CREATE: '/withdrawals',
      GET: '/withdrawals/:id',
      LIST: '/withdrawals',
      ESTIMATE_FEE: '/withdrawals/estimate-fee',
    },
    // Liquidity
    LIQUIDITY: {
      PROVIDERS: '/liquidity/providers',
      RATES: '/liquidity/rates',
      DEPTH: '/liquidity/depth/:pair',
    },
    // Webhooks
    WEBHOOKS: {
      CREATE: '/webhooks',
      LIST: '/webhooks',
      DELETE: '/webhooks/:id',
      TEST: '/webhooks/:id/test',
      LOGS: '/webhooks/logs',
    },
    // Blockchain
    BLOCKCHAIN: {
      STATUS: '/blockchain/status',
      NETWORKS: '/blockchain/networks',
      FEES: '/blockchain/fees/:network',
    },
    // Reports
    REPORTS: {
      DAILY: '/reports/daily',
      MONTHLY: '/reports/monthly',
      EXPORT: '/reports/export',
    },
  },
  
  // Supported Currencies
  CURRENCIES: ['USD', 'EUR', 'GBP', 'BTC', 'ETH', 'USDT', 'USDC', 'XRP', 'LTC', 'SOL'],
  
  // Trading Pairs
  PAIRS: [
    'BTC/USD', 'ETH/USD', 'USDT/USD', 'USDC/USD', 'XRP/USD', 'LTC/USD', 'SOL/USD',
    'BTC/EUR', 'ETH/EUR', 'BTC/GBP', 'ETH/GBP',
    'BTC/USDT', 'ETH/USDT', 'ETH/BTC'
  ],
  
  // Rate Limits
  RATE_LIMITS: {
    PUBLIC: '100 requests/minute',
    AUTHENTICATED: '1000 requests/minute',
    ORDERS: '50 requests/second',
  },
  
  // Webhook Events
  WEBHOOK_EVENTS: [
    'conversion.created', 'conversion.completed', 'conversion.failed',
    'deposit.pending', 'deposit.confirmed', 'deposit.completed',
    'withdrawal.pending', 'withdrawal.processing', 'withdrawal.completed', 'withdrawal.failed',
    'order.created', 'order.filled', 'order.cancelled',
    'account.updated', 'balance.changed'
  ],
};

// ============================================================================
// TIPOS DE MODO
// ============================================================================

type VegaOperationMode = 'sandbox' | 'real';
type VegaEnvironment = 'development' | 'production';

// Storage key for real mode data persistence
const VEGA_REAL_MODE_STORAGE_KEY = 'vega_api_real_mode_data';
const VEGA_OPERATION_MODE_KEY = 'vega_api_operation_mode';
const VEGA_ENVIRONMENT_KEY = 'vega_api_environment';

// Interface for persisted real mode data
interface RealModeData {
  balances: Balance[];
  orders: Order[];
  transactions: Transaction[];
  webhookLogs: WebhookLog[];
  totalValueUsd: string;
  orderCounter: number;
  transactionCounter: number;
}

// ============================================================================
// TIPOS E INTERFACES
// ============================================================================

interface Balance {
  currency: string;
  balance: string;
  available_balance: string;
  locked_balance: string;
  last_transaction_at: string;
}

interface Order {
  order_id: string;
  order_number: string;
  from_currency: string;
  to_currency: string;
  from_amount: string;
  to_amount: string;
  rate: string;
  status: 'pending' | 'quoting' | 'executing' | 'settling' | 'settled' | 'failed' | 'cancelled';
  created_at: string;
  settled_at?: string;
  liquidity_provider?: string;
}

interface LiquidityProvider {
  code: string;
  name: string;
  spread: string;
  min_order: string;
  max_order: string;
  status: 'online' | 'offline' | 'degraded';
  supported_pairs: string[];
}

interface WebhookLog {
  id: string;
  event_type: string;
  status: 'success' | 'failed' | 'pending';
  payload_summary: string;
  timestamp: string;
  response_code?: number;
  signature_valid?: boolean;
}

interface BlockchainStatus {
  btc: {
    block_height: number;
    last_scanned: string;
    confirmations_required: number;
    synced: boolean;
  };
  eth: {
    block_height: number;
    last_scanned: string;
    confirmations_required: number;
    synced: boolean;
  };
  pending_transactions: number;
}

interface Transaction {
  id: string;
  type: 'deposit' | 'withdrawal' | 'conversion' | 'fee' | 'settlement';
  currency: string;
  amount: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  reference: string;
  created_at: string;
  description: string;
}

interface Quote {
  quote_id: string;
  from_currency: string;
  to_currency: string;
  from_amount: string;
  to_amount: string;
  rate: string;
  fee_amount: string;
  fee_currency: string;
  expires_at: string;
  liquidity_provider: string;
}

interface ApiConfig {
  environment: 'sandbox' | 'production';
  api_key: string;
  api_secret: string;
  webhook_url: string;
  webhook_secret: string;
  base_url: string;
  client_id: string;
}

interface ApiEndpoint {
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  path: string;
  description: string;
  category: string;
  requiresAuth: boolean;
}

interface ApiTestResult {
  endpoint: string;
  status: 'success' | 'error' | 'pending';
  responseTime: number;
  statusCode?: number;
  message: string;
}
// ============================================================================
// SANDBOX API - Datos simulados para modo sandbox
// ============================================================================

const sandboxApi = {
  getBalances: async (): Promise<{ balances: Balance[]; total_value_usd: string }> => {
    await new Promise(r => setTimeout(r, 300));
    return {
      balances: [
        { currency: 'USD', balance: '2500000.00', available_balance: '2350000.00', locked_balance: '150000.00', last_transaction_at: new Date(Date.now() - 3600000).toISOString() },
        { currency: 'BTC', balance: '45.87654321', available_balance: '43.50000000', locked_balance: '2.37654321', last_transaction_at: new Date(Date.now() - 7200000).toISOString() },
        { currency: 'ETH', balance: '892.12345678', available_balance: '892.12345678', locked_balance: '0.00000000', last_transaction_at: new Date(Date.now() - 1800000).toISOString() },
        { currency: 'USDT', balance: '750000.00', available_balance: '750000.00', locked_balance: '0.00', last_transaction_at: new Date(Date.now() - 600000).toISOString() },
        { currency: 'USDC', balance: '500000.00', available_balance: '500000.00', locked_balance: '0.00', last_transaction_at: new Date(Date.now() - 900000).toISOString() }
      ],
      total_value_usd: '6,847,235.50'
    };
  },
  getOrders: async (): Promise<Order[]> => {
    await new Promise(r => setTimeout(r, 200));
    return [
      { order_id: 'ord_sandbox_001', order_number: 'ORD-2026-000147', from_currency: 'USD', to_currency: 'BTC', from_amount: '100000.00', to_amount: '2.31502145', rate: '43210.50', status: 'settled', created_at: new Date(Date.now() - 86400000).toISOString(), settled_at: new Date(Date.now() - 82800000).toISOString(), liquidity_provider: 'LP_PRIME_A' },
      { order_id: 'ord_sandbox_002', order_number: 'ORD-2026-000148', from_currency: 'USD', to_currency: 'ETH', from_amount: '50000.00', to_amount: '20.83333333', rate: '2400.00', status: 'executing', created_at: new Date(Date.now() - 3600000).toISOString(), liquidity_provider: 'LP_OTC_B' },
      { order_id: 'ord_sandbox_003', order_number: 'ORD-2026-000149', from_currency: 'BTC', to_currency: 'USD', from_amount: '5.00000000', to_amount: '216052.50', rate: '43210.50', status: 'settling', created_at: new Date(Date.now() - 1800000).toISOString(), liquidity_provider: 'LP_INST_C' }
    ];
  },
  getLiquidityProviders: async (): Promise<LiquidityProvider[]> => {
    await new Promise(r => setTimeout(r, 150));
    return [
      { code: 'LP_PRIME_A', name: 'Prime Broker Alpha', spread: '0.12%', min_order: '\,000', max_order: '\,000,000', status: 'online', supported_pairs: ['BTC/USD', 'ETH/USD', 'USDT/USD', 'USDC/USD'] },
      { code: 'LP_OTC_B', name: 'OTC Desk Beta', spread: '0.08%', min_order: '\,000', max_order: '\,000,000', status: 'online', supported_pairs: ['BTC/USD', 'ETH/USD', 'BTC/ETH'] },
      { code: 'LP_INST_C', name: 'Institutional Gamma', spread: '0.06%', min_order: '\,000', max_order: '\,000,000', status: 'online', supported_pairs: ['BTC/USD', 'ETH/USD', 'USDT/USD'] },
      { code: 'LP_MARKET_D', name: 'Market Maker Delta', spread: '0.15%', min_order: '\,000', max_order: '\,000,000', status: 'degraded', supported_pairs: ['BTC/USD', 'ETH/USD'] }
    ];
  },
  getWebhookLogs: async (): Promise<WebhookLog[]> => {
    await new Promise(r => setTimeout(r, 200));
    return [
      { id: 'wh_sandbox_001', event_type: 'CashTransfer.v1', status: 'success', payload_summary: 'Credit USD 1,000,000.00 - DAES Bank Transfer', timestamp: new Date(Date.now() - 1800000).toISOString(), response_code: 200, signature_valid: true },
      { id: 'wh_sandbox_002', event_type: 'ConversionOrder.Settled', status: 'success', payload_summary: 'ORD-2026-000147 settled successfully', timestamp: new Date(Date.now() - 3600000).toISOString(), response_code: 200, signature_valid: true },
      { id: 'wh_sandbox_003', event_type: 'BlockchainDeposit.Confirmed', status: 'success', payload_summary: 'BTC deposit 2.5 confirmed (6 blocks)', timestamp: new Date(Date.now() - 7200000).toISOString(), response_code: 200, signature_valid: true }
    ];
  },
  getBlockchainStatus: async (): Promise<BlockchainStatus> => {
    await new Promise(r => setTimeout(r, 100));
    return {
      btc: { block_height: 876543, last_scanned: new Date(Date.now() - 60000).toISOString(), confirmations_required: 6, synced: true },
      eth: { block_height: 19876543, last_scanned: new Date(Date.now() - 15000).toISOString(), confirmations_required: 12, synced: true },
      pending_transactions: 3
    };
  },
  getTransactions: async (): Promise<Transaction[]> => {
    await new Promise(r => setTimeout(r, 250));
    return [
      { id: 'tx_sandbox_001', type: 'deposit', currency: 'USD', amount: '1000000.00', status: 'completed', reference: 'DAES-TRF-2026-001234', created_at: new Date(Date.now() - 1800000).toISOString(), description: 'Wire transfer from DAES Bank' },
      { id: 'tx_sandbox_002', type: 'conversion', currency: 'BTC', amount: '2.31502145', status: 'completed', reference: 'ORD-2026-000147', created_at: new Date(Date.now() - 82800000).toISOString(), description: 'USD to BTC conversion' },
      { id: 'tx_sandbox_003', type: 'fee', currency: 'USD', amount: '100.00', status: 'completed', reference: 'FEE-ORD-2026-000147', created_at: new Date(Date.now() - 82800000).toISOString(), description: 'Conversion fee' },
      { id: 'tx_sandbox_004', type: 'withdrawal', currency: 'BTC', amount: '1.50000000', status: 'processing', reference: 'WD-2026-000089', created_at: new Date(Date.now() - 600000).toISOString(), description: 'Withdrawal to external wallet' }
    ];
  },
  getQuote: async (fromCurrency: string, toCurrency: string, amount: string): Promise<Quote> => {
    await new Promise(r => setTimeout(r, 500));
    const rates: Record<string, number> = { 'USD-BTC': 43210.50, 'USD-ETH': 2400.00, 'BTC-USD': 43150.00, 'ETH-USD': 2395.00, 'USD-USDT': 1.0001, 'USD-USDC': 1.0002 };
    const key = fromCurrency + '-' + toCurrency;
    const rate = rates[key] || 1;
    const fromAmount = parseFloat(amount);
    const toAmount = fromCurrency === 'USD' ? fromAmount / rate : fromAmount * rate;
    const fee = fromAmount * 0.001;
    return {
      quote_id: 'quote_' + Math.random().toString(36).substring(2, 15),
      from_currency: fromCurrency,
      to_currency: toCurrency,
      from_amount: fromAmount.toFixed(fromCurrency === 'USD' ? 2 : 8),
      to_amount: toAmount.toFixed(toCurrency === 'USD' ? 2 : 8),
      rate: rate.toFixed(toCurrency === 'USD' ? 2 : 8),
      fee_amount: fee.toFixed(2),
      fee_currency: fromCurrency,
      expires_at: new Date(Date.now() + 300000).toISOString(),
      liquidity_provider: 'LP_PRIME_A'
    };
  }
};
// ============================================================================
// REAL MODE API - Datos reales que inician en 0
// ============================================================================

const getInitialRealModeData = (): RealModeData => ({
  balances: [
    { currency: 'USD', balance: '0.00', available_balance: '0.00', locked_balance: '0.00', last_transaction_at: '' },
    { currency: 'BTC', balance: '0.00000000', available_balance: '0.00000000', locked_balance: '0.00000000', last_transaction_at: '' },
    { currency: 'ETH', balance: '0.00000000', available_balance: '0.00000000', locked_balance: '0.00000000', last_transaction_at: '' },
    { currency: 'USDT', balance: '0.00', available_balance: '0.00', locked_balance: '0.00', last_transaction_at: '' },
    { currency: 'USDC', balance: '0.00', available_balance: '0.00', locked_balance: '0.00', last_transaction_at: '' }
  ],
  orders: [],
  transactions: [],
  webhookLogs: [],
  totalValueUsd: '0.00',
  orderCounter: 0,
  transactionCounter: 0
});

const loadRealModeData = (): RealModeData => {
  try {
    const stored = localStorage.getItem(VEGA_REAL_MODE_STORAGE_KEY);
    if (stored) return JSON.parse(stored);
  } catch (e) {
    console.error('Error loading real mode data:', e);
  }
  return getInitialRealModeData();
};

const saveRealModeData = (data: RealModeData): void => {
  try {
    localStorage.setItem(VEGA_REAL_MODE_STORAGE_KEY, JSON.stringify(data));
  } catch (e) {
    console.error('Error saving real mode data:', e);
  }
};

const calculateTotalValueUsd = (balances: Balance[]): string => {
  const rates: Record<string, number> = { 'USD': 1, 'BTC': 43210.50, 'ETH': 2400.00, 'USDT': 1.00, 'USDC': 1.00 };
  let total = 0;
  for (const b of balances) {
    const balance = parseFloat(b.balance) || 0;
    const rate = rates[b.currency] || 1;
    total += balance * rate;
  }
  return total.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

// ============================================================================
// COMPONENTE PRINCIPAL
// ============================================================================

type VegaTab = 'dashboard' | 'deposits' | 'conversion' | 'transactions' | 'blockchain' | 'webhooks' | 'api_explorer' | 'settings';

// Deposit Address Interface
interface DepositAddress {
  currency: string;
  network: string;
  address: string;
  memo?: string;
  qrCode?: string;
  minDeposit: string;
  confirmations: number;
}

export function VegaAPIModule() {
  const { language } = useLanguage();
  const isSpanish = language === 'es';
  
  // Modo de operacion (Sandbox vs Real)
  const [operationMode, setOperationMode] = useState<VegaOperationMode>(() => {
    try {
      const stored = localStorage.getItem(VEGA_OPERATION_MODE_KEY);
      return (stored === 'real' || stored === 'sandbox') ? stored : 'sandbox';
    } catch {
      return 'sandbox';
    }
  });
  
  // Datos de modo real persistidos
  const [realModeData, setRealModeData] = useState<RealModeData>(() => loadRealModeData());
  
  // Estados
  const [activeTab, setActiveTab] = useState<VegaTab>('dashboard');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showModeConfirm, setShowModeConfirm] = useState<VegaOperationMode | null>(null);
  
  // Datos
  const [balances, setBalances] = useState<Balance[]>([]);
  const [totalValueUsd, setTotalValueUsd] = useState('0');
  const [orders, setOrders] = useState<Order[]>([]);
  const [liquidityProviders, setLiquidityProviders] = useState<LiquidityProvider[]>([]);
  const [webhookLogs, setWebhookLogs] = useState<WebhookLog[]>([]);
  const [blockchainStatus, setBlockchainStatus] = useState<BlockchainStatus | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  
  // Formulario de conversion
  const [conversionForm, setConversionForm] = useState({ fromCurrency: 'USD', toCurrency: 'BTC', amount: '', acceptTerms: false });
  const [currentQuote, setCurrentQuote] = useState<Quote | null>(null);
  const [conversionResult, setConversionResult] = useState<Order | null>(null);
  const [quoteLoading, setQuoteLoading] = useState(false);
  
  // Configuracion
  const [apiConfig, setApiConfig] = useState<ApiConfig>({
    environment: 'sandbox',
    api_key: 'vega_sk_dev_' + Math.random().toString(36).substring(2, 30),
    api_secret: 'vega_secret_' + Math.random().toString(36).substring(2, 40),
    webhook_url: 'https://your-domain.com/webhooks/vega',
    webhook_secret: 'whsec_' + Math.random().toString(36).substring(2, 40),
    base_url: VEGA_API_CONFIG.DEV_BASE_URL,
    client_id: 'client_' + Math.random().toString(36).substring(2, 15)
  });
  const [showSecrets, setShowSecrets] = useState(false);
  
  // Estado para deposito
  const [depositForm, setDepositForm] = useState({ currency: 'USD', amount: '' });
  const [showDepositModal, setShowDepositModal] = useState(false);
  
  // Estado para depósitos avanzados
  const [depositMethod, setDepositMethod] = useState<'fiat' | 'crypto'>('crypto');
  const [selectedDepositCurrency, setSelectedDepositCurrency] = useState('BTC');
  const [depositAddresses, setDepositAddresses] = useState<Record<string, DepositAddress>>({});
  const [isGeneratingAddress, setIsGeneratingAddress] = useState(false);
  const [fiatDepositDetails, setFiatDepositDetails] = useState<{
    bankName: string;
    accountNumber: string;
    routingNumber: string;
    swift: string;
    reference: string;
    beneficiary: string;
  } | null>(null);
  
  // API Explorer states
  const [selectedEndpoint, setSelectedEndpoint] = useState<string>('');
  const [apiTestResults, setApiTestResults] = useState<ApiTestResult[]>([]);
  const [isTestingApi, setIsTestingApi] = useState(false);
  const [apiRequestBody, setApiRequestBody] = useState('{}');
  const [apiResponse, setApiResponse] = useState<string | null>(null);
  
  // Environment state
  const [vegaEnvironment, setVegaEnvironment] = useState<VegaEnvironment>(() => {
    try {
      const stored = localStorage.getItem(VEGA_ENVIRONMENT_KEY);
      return (stored === 'development' || stored === 'production') ? stored : 'development';
    } catch {
      return 'development';
    }
  });
  // Cambiar modo de operacion
  const handleModeChange = (newMode: VegaOperationMode) => {
    if (newMode !== operationMode) {
      setShowModeConfirm(newMode);
    }
  };
  
  const confirmModeChange = () => {
    if (showModeConfirm) {
      setOperationMode(showModeConfirm);
      localStorage.setItem(VEGA_OPERATION_MODE_KEY, showModeConfirm);
      setShowModeConfirm(null);
      setTimeout(() => fetchData(), 100);
    }
  };
  
  const resetRealModeData = () => {
    const freshData = getInitialRealModeData();
    setRealModeData(freshData);
    saveRealModeData(freshData);
    if (operationMode === 'real') {
      setBalances(freshData.balances);
      setOrders(freshData.orders);
      setTransactions(freshData.transactions);
      setWebhookLogs(freshData.webhookLogs);
      setTotalValueUsd(freshData.totalValueUsd);
    }
  };
  
  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      if (operationMode === 'sandbox') {
        const [balancesData, ordersData, lpData, webhooksData, blockchainData, txData] = await Promise.all([
          sandboxApi.getBalances(), sandboxApi.getOrders(), sandboxApi.getLiquidityProviders(),
          sandboxApi.getWebhookLogs(), sandboxApi.getBlockchainStatus(), sandboxApi.getTransactions()
        ]);
        setBalances(balancesData.balances);
        setTotalValueUsd(balancesData.total_value_usd);
        setOrders(ordersData);
        setLiquidityProviders(lpData);
        setWebhookLogs(webhooksData);
        setBlockchainStatus(blockchainData);
        setTransactions(txData);
      } else {
        const data = loadRealModeData();
        setRealModeData(data);
        setBalances(data.balances);
        setTotalValueUsd(data.totalValueUsd);
        setOrders(data.orders);
        setTransactions(data.transactions);
        setWebhookLogs(data.webhookLogs);
        const [lpData, blockchainData] = await Promise.all([sandboxApi.getLiquidityProviders(), sandboxApi.getBlockchainStatus()]);
        setLiquidityProviders(lpData);
        setBlockchainStatus({ ...blockchainData, pending_transactions: data.transactions.filter(t => t.status === 'pending' || t.status === 'processing').length });
      }
    } catch (err: any) {
      setError(err.message || 'Error al cargar datos');
    } finally {
      setLoading(false);
    }
  }, [operationMode]);
  
  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 60000);
    return () => clearInterval(interval);
  }, [fetchData]);
  
  useEffect(() => {
    if (operationMode === 'real') {
      const updatedData: RealModeData = { ...realModeData, balances, orders, transactions, webhookLogs, totalValueUsd: calculateTotalValueUsd(balances) };
      saveRealModeData(updatedData);
    }
  }, [balances, orders, transactions, webhookLogs, operationMode]);
  const handleGetQuote = async () => {
    if (!conversionForm.amount || parseFloat(conversionForm.amount) <= 0) {
      setError(isSpanish ? 'Ingrese un monto valido' : 'Enter a valid amount');
      return;
    }
    if (operationMode === 'real') {
      const fromBalance = balances.find(b => b.currency === conversionForm.fromCurrency);
      const available = parseFloat(fromBalance?.available_balance || '0');
      const requested = parseFloat(conversionForm.amount);
      if (requested > available) {
        setError(isSpanish ? 'Balance insuficiente' : 'Insufficient balance');
        return;
      }
    }
    setQuoteLoading(true);
    setError(null);
    setCurrentQuote(null);
    setConversionResult(null);
    try {
      const quote = await sandboxApi.getQuote(conversionForm.fromCurrency, conversionForm.toCurrency, conversionForm.amount);
      setCurrentQuote(quote);
    } catch (err: any) {
      setError(err.message || 'Error al obtener cotizacion');
    } finally {
      setQuoteLoading(false);
    }
  };
  
  const handleExecuteConversion = async () => {
    if (!conversionForm.acceptTerms || !currentQuote) {
      setError(isSpanish ? 'Debe aceptar los terminos' : 'You must accept the terms');
      return;
    }
    setQuoteLoading(true);
    setError(null);
    try {
      if (operationMode === 'real') {
        const newOrderCounter = realModeData.orderCounter + 1;
        const newTxCounter = realModeData.transactionCounter + 1;
        const newOrder: Order = {
          order_id: 'ord_real_' + Date.now(), order_number: 'ORD-REAL-' + newOrderCounter.toString().padStart(6, '0'),
          from_currency: currentQuote.from_currency, to_currency: currentQuote.to_currency,
          from_amount: currentQuote.from_amount, to_amount: currentQuote.to_amount, rate: currentQuote.rate,
          status: 'settled', created_at: new Date().toISOString(), settled_at: new Date().toISOString(), liquidity_provider: currentQuote.liquidity_provider
        };
        const newTransaction: Transaction = { id: 'tx_real_' + Date.now(), type: 'conversion', currency: currentQuote.to_currency, amount: currentQuote.to_amount, status: 'completed', reference: newOrder.order_number, created_at: new Date().toISOString(), description: currentQuote.from_currency + ' to ' + currentQuote.to_currency + ' conversion' };
        const feeTransaction: Transaction = { id: 'tx_fee_' + Date.now(), type: 'fee', currency: currentQuote.fee_currency, amount: currentQuote.fee_amount, status: 'completed', reference: 'FEE-' + newOrder.order_number, created_at: new Date().toISOString(), description: 'Conversion fee' };
        const newWebhook: WebhookLog = { id: 'wh_real_' + Date.now(), event_type: 'ConversionOrder.Settled', status: 'success', payload_summary: newOrder.order_number + ' settled successfully', timestamp: new Date().toISOString(), response_code: 200, signature_valid: true };
        const updatedBalances = balances.map(b => {
          if (b.currency === currentQuote.from_currency) {
            const newBalance = (parseFloat(b.balance) - parseFloat(currentQuote.from_amount) - parseFloat(currentQuote.fee_amount));
            return { ...b, balance: newBalance.toFixed(b.currency === 'USD' || b.currency === 'USDT' || b.currency === 'USDC' ? 2 : 8), available_balance: newBalance.toFixed(b.currency === 'USD' || b.currency === 'USDT' || b.currency === 'USDC' ? 2 : 8), last_transaction_at: new Date().toISOString() };
          }
          if (b.currency === currentQuote.to_currency) {
            const newBalance = parseFloat(b.balance) + parseFloat(currentQuote.to_amount);
            return { ...b, balance: newBalance.toFixed(b.currency === 'USD' || b.currency === 'USDT' || b.currency === 'USDC' ? 2 : 8), available_balance: newBalance.toFixed(b.currency === 'USD' || b.currency === 'USDT' || b.currency === 'USDC' ? 2 : 8), last_transaction_at: new Date().toISOString() };
          }
          return b;
        });
        setBalances(updatedBalances);
        setOrders(prev => [newOrder, ...prev]);
        setTransactions(prev => [newTransaction, feeTransaction, ...prev]);
        setWebhookLogs(prev => [newWebhook, ...prev]);
        setTotalValueUsd(calculateTotalValueUsd(updatedBalances));
        const updatedRealData: RealModeData = { balances: updatedBalances, orders: [newOrder, ...realModeData.orders], transactions: [newTransaction, feeTransaction, ...realModeData.transactions], webhookLogs: [newWebhook, ...realModeData.webhookLogs], totalValueUsd: calculateTotalValueUsd(updatedBalances), orderCounter: newOrderCounter, transactionCounter: newTxCounter + 1 };
        setRealModeData(updatedRealData);
        saveRealModeData(updatedRealData);
        setConversionResult(newOrder);
      } else {
        const result: Order = { order_id: 'ord_' + Math.random().toString(36).substring(2, 10), order_number: 'ORD-2026-' + Math.floor(Math.random() * 1000000).toString().padStart(6, '0'), from_currency: currentQuote.from_currency, to_currency: currentQuote.to_currency, from_amount: currentQuote.from_amount, to_amount: currentQuote.to_amount, rate: currentQuote.rate, status: 'executing', created_at: new Date().toISOString(), liquidity_provider: currentQuote.liquidity_provider };
        setConversionResult(result);
        fetchData();
      }
      setCurrentQuote(null);
      setConversionForm(prev => ({ ...prev, amount: '', acceptTerms: false }));
    } catch (err: any) {
      setError(err.message || 'Error al ejecutar conversion');
    } finally {
      setQuoteLoading(false);
    }
  };
  const handleRealModeDeposit = (currency: string, amount: string) => {
    if (operationMode !== 'real') return;
    const depositAmount = parseFloat(amount);
    if (isNaN(depositAmount) || depositAmount <= 0) {
      setError(isSpanish ? 'Monto invalido' : 'Invalid amount');
      return;
    }
    const newTxCounter = realModeData.transactionCounter + 1;
    const newTransaction: Transaction = { id: 'tx_deposit_' + Date.now(), type: 'deposit', currency, amount: depositAmount.toFixed(currency === 'USD' || currency === 'USDT' || currency === 'USDC' ? 2 : 8), status: 'completed', reference: 'DEP-REAL-' + newTxCounter.toString().padStart(6, '0'), created_at: new Date().toISOString(), description: currency + ' deposit' };
    const newWebhook: WebhookLog = { id: 'wh_deposit_' + Date.now(), event_type: 'CashTransfer.v1', status: 'success', payload_summary: 'Credit ' + currency + ' ' + depositAmount.toLocaleString() + ' - Manual Deposit', timestamp: new Date().toISOString(), response_code: 200, signature_valid: true };
    const updatedBalances = balances.map(b => {
      if (b.currency === currency) {
        const newBalance = parseFloat(b.balance) + depositAmount;
        return { ...b, balance: newBalance.toFixed(currency === 'USD' || currency === 'USDT' || currency === 'USDC' ? 2 : 8), available_balance: newBalance.toFixed(currency === 'USD' || currency === 'USDT' || currency === 'USDC' ? 2 : 8), last_transaction_at: new Date().toISOString() };
      }
      return b;
    });
    setBalances(updatedBalances);
    setTransactions(prev => [newTransaction, ...prev]);
    setWebhookLogs(prev => [newWebhook, ...prev]);
    setTotalValueUsd(calculateTotalValueUsd(updatedBalances));
    const updatedRealData: RealModeData = { balances: updatedBalances, orders: realModeData.orders, transactions: [newTransaction, ...realModeData.transactions], webhookLogs: [newWebhook, ...realModeData.webhookLogs], totalValueUsd: calculateTotalValueUsd(updatedBalances), orderCounter: realModeData.orderCounter, transactionCounter: newTxCounter };
    setRealModeData(updatedRealData);
    saveRealModeData(updatedRealData);
  };
  
  // Helpers
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'online': case 'settled': case 'completed': case 'success': return 'text-emerald-400';
      case 'offline': case 'failed': case 'cancelled': return 'text-red-400';
      case 'executing': case 'processing': case 'pending': case 'quoting': return 'text-yellow-400';
      case 'settling': return 'text-blue-400';
      case 'degraded': return 'text-orange-400';
      default: return 'text-gray-400';
    }
  };
  
  const getStatusBg = (status: string) => {
    switch (status) {
      case 'online': case 'settled': case 'completed': case 'success': return 'bg-emerald-500/20';
      case 'offline': case 'failed': case 'cancelled': return 'bg-red-500/20';
      case 'executing': case 'processing': case 'pending': case 'quoting': return 'bg-yellow-500/20';
      case 'settling': return 'bg-blue-500/20';
      case 'degraded': return 'bg-orange-500/20';
      default: return 'bg-gray-500/20';
    }
  };
  
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'online': case 'settled': case 'completed': case 'success': return <CheckCircle className="w-4 h-4" />;
      case 'offline': case 'failed': case 'cancelled': return <XCircle className="w-4 h-4" />;
      case 'executing': case 'processing': case 'pending': case 'quoting': return <Loader className="w-4 h-4 animate-spin" />;
      case 'settling': return <Clock className="w-4 h-4" />;
      case 'degraded': return <AlertTriangle className="w-4 h-4" />;
      default: return <Activity className="w-4 h-4" />;
    }
  };
  
  const formatCurrency = (amount: string, currency: string) => {
    const num = parseFloat(amount);
    if (isNaN(num)) return amount;
    if (currency === 'USD' || currency === 'USDT' || currency === 'USDC') {
      return '\$' + num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    }
    return num.toFixed(8) + ' ' + currency;
  };
  
  const formatDateTime = (iso: string) => {
    if (!iso) return 'N/A';
    return new Date(iso).toLocaleString(isSpanish ? 'es-ES' : 'en-US', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  };
  
  const copyToClipboard = (text: string) => { navigator.clipboard.writeText(text); };
  
  const getCurrencyIcon = (currency: string) => {
    switch (currency) {
      case 'USD': return <DollarSign className="w-5 h-5 text-green-400" />;
      case 'BTC': return <Coins className="w-5 h-5 text-orange-400" />;
      case 'ETH': return <Coins className="w-5 h-5 text-purple-400" />;
      case 'USDT': return <DollarSign className="w-5 h-5 text-teal-400" />;
      case 'USDC': return <DollarSign className="w-5 h-5 text-blue-400" />;
      default: return <Coins className="w-5 h-5 text-gray-400" />;
    }
  };
  
  const tabs = [
    { id: 'dashboard' as VegaTab, name: isSpanish ? 'Panel Principal' : 'Dashboard', icon: LayoutDashboard },
    { id: 'deposits' as VegaTab, name: isSpanish ? 'Depósitos' : 'Deposits', icon: Download },
    { id: 'conversion' as VegaTab, name: isSpanish ? 'Conversión' : 'Conversion', icon: ArrowRightLeft },
    { id: 'transactions' as VegaTab, name: isSpanish ? 'Transacciones' : 'Transactions', icon: History },
    { id: 'blockchain' as VegaTab, name: 'Blockchain', icon: Database },
    { id: 'webhooks' as VegaTab, name: 'Webhooks', icon: Bell },
    { id: 'api_explorer' as VegaTab, name: 'API Explorer', icon: Terminal },
    { id: 'settings' as VegaTab, name: isSpanish ? 'Configuración' : 'Settings', icon: Settings }
  ];
  
  // Generate deposit address for crypto
  const generateDepositAddress = async (currency: string) => {
    setIsGeneratingAddress(true);
    await new Promise(r => setTimeout(r, 800));
    
    const networks: Record<string, string> = {
      'BTC': 'Bitcoin',
      'ETH': 'Ethereum (ERC-20)',
      'USDT': 'Ethereum (ERC-20)',
      'USDC': 'Ethereum (ERC-20)',
      'XRP': 'XRP Ledger',
      'LTC': 'Litecoin',
      'SOL': 'Solana'
    };
    
    const confirmations: Record<string, number> = {
      'BTC': 3,
      'ETH': 12,
      'USDT': 12,
      'USDC': 12,
      'XRP': 1,
      'LTC': 6,
      'SOL': 32
    };
    
    const minDeposits: Record<string, string> = {
      'BTC': '0.0001',
      'ETH': '0.01',
      'USDT': '10',
      'USDC': '10',
      'XRP': '10',
      'LTC': '0.01',
      'SOL': '0.1'
    };
    
    // Generate pseudo-random address based on currency
    const generateAddress = (cur: string) => {
      const chars = '0123456789abcdef';
      let addr = '';
      if (cur === 'BTC') {
        addr = 'bc1q' + Array(38).fill(0).map(() => chars[Math.floor(Math.random() * chars.length)]).join('');
      } else if (cur === 'ETH' || cur === 'USDT' || cur === 'USDC') {
        addr = '0x' + Array(40).fill(0).map(() => chars[Math.floor(Math.random() * chars.length)]).join('');
      } else if (cur === 'XRP') {
        addr = 'r' + Array(33).fill(0).map(() => 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'[Math.floor(Math.random() * 62)]).join('');
      } else if (cur === 'LTC') {
        addr = 'ltc1q' + Array(38).fill(0).map(() => chars[Math.floor(Math.random() * chars.length)]).join('');
      } else if (cur === 'SOL') {
        addr = Array(44).fill(0).map(() => 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'[Math.floor(Math.random() * 62)]).join('');
      }
      return addr;
    };
    
    const newAddress: DepositAddress = {
      currency,
      network: networks[currency] || 'Unknown',
      address: generateAddress(currency),
      memo: currency === 'XRP' ? Math.floor(Math.random() * 1000000000).toString() : undefined,
      minDeposit: minDeposits[currency] || '0.01',
      confirmations: confirmations[currency] || 6
    };
    
    setDepositAddresses(prev => ({ ...prev, [currency]: newAddress }));
    setIsGeneratingAddress(false);
    
    // Log webhook event
    const newWebhook: WebhookLog = {
      id: 'wh_addr_' + Date.now(),
      event_type: 'deposit.address_generated',
      status: 'success',
      payload_summary: `Generated ${currency} deposit address`,
      timestamp: new Date().toISOString(),
      response_code: 200,
      signature_valid: true
    };
    setWebhookLogs(prev => [newWebhook, ...prev]);
  };
  
  // Generate fiat deposit details
  const generateFiatDepositDetails = () => {
    const reference = 'VEGA-' + Date.now().toString(36).toUpperCase() + '-' + Math.random().toString(36).substring(2, 6).toUpperCase();
    setFiatDepositDetails({
      bankName: 'Prime Trust Bank',
      accountNumber: '8' + Math.floor(Math.random() * 100000000).toString().padStart(8, '0'),
      routingNumber: '021000021',
      swift: 'PRTRUS66',
      reference,
      beneficiary: 'VEGA Trading Ltd.'
    });
  };
  
  // API Endpoints list for explorer
  const apiEndpoints: ApiEndpoint[] = [
    // Authentication
    { method: 'POST', path: '/auth/token', description: isSpanish ? 'Obtener token de acceso' : 'Get access token', category: 'Authentication', requiresAuth: false },
    { method: 'POST', path: '/auth/refresh', description: isSpanish ? 'Refrescar token' : 'Refresh token', category: 'Authentication', requiresAuth: true },
    { method: 'POST', path: '/auth/revoke', description: isSpanish ? 'Revocar token' : 'Revoke token', category: 'Authentication', requiresAuth: true },
    // Accounts
    { method: 'GET', path: '/accounts', description: isSpanish ? 'Listar cuentas' : 'List accounts', category: 'Accounts', requiresAuth: true },
    { method: 'GET', path: '/accounts/:id', description: isSpanish ? 'Obtener cuenta' : 'Get account', category: 'Accounts', requiresAuth: true },
    { method: 'GET', path: '/accounts/:id/balances', description: isSpanish ? 'Obtener balances' : 'Get balances', category: 'Accounts', requiresAuth: true },
    { method: 'GET', path: '/accounts/:id/transactions', description: isSpanish ? 'Historial de transacciones' : 'Transaction history', category: 'Accounts', requiresAuth: true },
    // Conversions
    { method: 'POST', path: '/conversions/quote', description: isSpanish ? 'Obtener cotización' : 'Get quote', category: 'Conversions', requiresAuth: true },
    { method: 'POST', path: '/conversions', description: isSpanish ? 'Crear conversión' : 'Create conversion', category: 'Conversions', requiresAuth: true },
    { method: 'GET', path: '/conversions/:id', description: isSpanish ? 'Obtener conversión' : 'Get conversion', category: 'Conversions', requiresAuth: true },
    { method: 'GET', path: '/conversions', description: isSpanish ? 'Listar conversiones' : 'List conversions', category: 'Conversions', requiresAuth: true },
    // Orders
    { method: 'POST', path: '/orders', description: isSpanish ? 'Crear orden' : 'Create order', category: 'Orders', requiresAuth: true },
    { method: 'GET', path: '/orders/:id', description: isSpanish ? 'Obtener orden' : 'Get order', category: 'Orders', requiresAuth: true },
    { method: 'GET', path: '/orders', description: isSpanish ? 'Listar órdenes' : 'List orders', category: 'Orders', requiresAuth: true },
    { method: 'DELETE', path: '/orders/:id/cancel', description: isSpanish ? 'Cancelar orden' : 'Cancel order', category: 'Orders', requiresAuth: true },
    // Deposits
    { method: 'POST', path: '/deposits', description: isSpanish ? 'Crear depósito' : 'Create deposit', category: 'Deposits', requiresAuth: true },
    { method: 'GET', path: '/deposits/:id', description: isSpanish ? 'Obtener depósito' : 'Get deposit', category: 'Deposits', requiresAuth: true },
    { method: 'GET', path: '/deposits', description: isSpanish ? 'Listar depósitos' : 'List deposits', category: 'Deposits', requiresAuth: true },
    { method: 'GET', path: '/deposits/address/:currency', description: isSpanish ? 'Obtener dirección de depósito' : 'Get deposit address', category: 'Deposits', requiresAuth: true },
    // Withdrawals
    { method: 'POST', path: '/withdrawals', description: isSpanish ? 'Crear retiro' : 'Create withdrawal', category: 'Withdrawals', requiresAuth: true },
    { method: 'GET', path: '/withdrawals/:id', description: isSpanish ? 'Obtener retiro' : 'Get withdrawal', category: 'Withdrawals', requiresAuth: true },
    { method: 'GET', path: '/withdrawals', description: isSpanish ? 'Listar retiros' : 'List withdrawals', category: 'Withdrawals', requiresAuth: true },
    { method: 'POST', path: '/withdrawals/estimate-fee', description: isSpanish ? 'Estimar comisión' : 'Estimate fee', category: 'Withdrawals', requiresAuth: true },
    // Liquidity
    { method: 'GET', path: '/liquidity/providers', description: isSpanish ? 'Proveedores de liquidez' : 'Liquidity providers', category: 'Liquidity', requiresAuth: true },
    { method: 'GET', path: '/liquidity/rates', description: isSpanish ? 'Tasas de cambio' : 'Exchange rates', category: 'Liquidity', requiresAuth: false },
    { method: 'GET', path: '/liquidity/depth/:pair', description: isSpanish ? 'Profundidad de mercado' : 'Market depth', category: 'Liquidity', requiresAuth: false },
    // Webhooks
    { method: 'POST', path: '/webhooks', description: isSpanish ? 'Crear webhook' : 'Create webhook', category: 'Webhooks', requiresAuth: true },
    { method: 'GET', path: '/webhooks', description: isSpanish ? 'Listar webhooks' : 'List webhooks', category: 'Webhooks', requiresAuth: true },
    { method: 'DELETE', path: '/webhooks/:id', description: isSpanish ? 'Eliminar webhook' : 'Delete webhook', category: 'Webhooks', requiresAuth: true },
    { method: 'POST', path: '/webhooks/:id/test', description: isSpanish ? 'Probar webhook' : 'Test webhook', category: 'Webhooks', requiresAuth: true },
    // Blockchain
    { method: 'GET', path: '/blockchain/status', description: isSpanish ? 'Estado de blockchain' : 'Blockchain status', category: 'Blockchain', requiresAuth: false },
    { method: 'GET', path: '/blockchain/networks', description: isSpanish ? 'Redes soportadas' : 'Supported networks', category: 'Blockchain', requiresAuth: false },
    { method: 'GET', path: '/blockchain/fees/:network', description: isSpanish ? 'Comisiones de red' : 'Network fees', category: 'Blockchain', requiresAuth: false },
    // Reports
    { method: 'GET', path: '/reports/daily', description: isSpanish ? 'Reporte diario' : 'Daily report', category: 'Reports', requiresAuth: true },
    { method: 'GET', path: '/reports/monthly', description: isSpanish ? 'Reporte mensual' : 'Monthly report', category: 'Reports', requiresAuth: true },
    { method: 'POST', path: '/reports/export', description: isSpanish ? 'Exportar reporte' : 'Export report', category: 'Reports', requiresAuth: true },
  ];
  
  // Group endpoints by category
  const endpointCategories = [...new Set(apiEndpoints.map(e => e.category))];
  
  // Simulate API test
  const testApiEndpoint = async (endpoint: ApiEndpoint) => {
    setIsTestingApi(true);
    setApiResponse(null);
    
    const startTime = Date.now();
    
    // Simulate API call
    await new Promise(r => setTimeout(r, 300 + Math.random() * 700));
    
    const responseTime = Date.now() - startTime;
    const isSuccess = Math.random() > 0.1; // 90% success rate
    
    const mockResponses: Record<string, any> = {
      '/accounts': { accounts: [{ id: 'acc_001', name: 'Main Account', status: 'active' }], total: 1 },
      '/accounts/:id/balances': { balances: balances.map(b => ({ currency: b.currency, available: b.available_balance, locked: b.locked_balance })) },
      '/conversions/quote': { quote_id: 'quote_' + Date.now(), rate: '43210.50', expires_in: 300 },
      '/liquidity/providers': { providers: liquidityProviders },
      '/liquidity/rates': { rates: { 'BTC/USD': 43210.50, 'ETH/USD': 2400.00, 'USDT/USD': 1.0001 } },
      '/blockchain/status': blockchainStatus,
      '/webhooks': { webhooks: webhookLogs.slice(0, 5) },
    };
    
    const response = mockResponses[endpoint.path] || { message: 'OK', timestamp: new Date().toISOString() };
    
    const result: ApiTestResult = {
      endpoint: endpoint.path,
      status: isSuccess ? 'success' : 'error',
      responseTime,
      statusCode: isSuccess ? 200 : 500,
      message: isSuccess ? 'Request successful' : 'Internal server error'
    };
    
    setApiTestResults(prev => [result, ...prev.slice(0, 9)]);
    setApiResponse(JSON.stringify(response, null, 2));
    setIsTestingApi(false);
  };
  
  // Change environment
  const handleEnvironmentChange = (env: VegaEnvironment) => {
    setVegaEnvironment(env);
    localStorage.setItem(VEGA_ENVIRONMENT_KEY, env);
    setApiConfig(prev => ({
      ...prev,
      base_url: env === 'development' ? VEGA_API_CONFIG.DEV_BASE_URL : VEGA_API_CONFIG.PROD_BASE_URL
    }));
  };
  return (
    <div className="p-6 bg-gradient-to-br from-slate-900 via-slate-950 to-gray-950 min-h-full text-white">
      {/* Modal de confirmacion de cambio de modo */}
      {showModeConfirm && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
          <div className="bg-slate-800 rounded-2xl p-8 max-w-md mx-4 border border-slate-600 shadow-2xl">
            <div className="flex items-center gap-4 mb-6">
              {showModeConfirm === 'real' ? (
                <div className="p-3 bg-emerald-500/20 rounded-xl"><Power className="w-8 h-8 text-emerald-400" /></div>
              ) : (
                <div className="p-3 bg-yellow-500/20 rounded-xl"><FlaskConical className="w-8 h-8 text-yellow-400" /></div>
              )}
              <div>
                <h3 className="text-xl font-bold text-white">{showModeConfirm === 'real' ? (isSpanish ? 'Activar Modo Real?' : 'Activate Real Mode?') : (isSpanish ? 'Activar Modo Sandbox?' : 'Activate Sandbox Mode?')}</h3>
                <p className="text-slate-400 text-sm">{showModeConfirm === 'real' ? (isSpanish ? 'Los datos comenzaran desde 0' : 'Data will start from 0') : (isSpanish ? 'Se usaran datos simulados' : 'Simulated data will be used')}</p>
              </div>
            </div>
            <div className="bg-slate-900/50 rounded-xl p-4 mb-6">
              {showModeConfirm === 'real' ? (
                <ul className="space-y-2 text-sm text-slate-300">
                  <li className="flex items-center gap-2"><CheckCircle className="w-4 h-4 text-emerald-400" />{isSpanish ? 'Balances inician en 0' : 'Balances start at 0'}</li>
                  <li className="flex items-center gap-2"><CheckCircle className="w-4 h-4 text-emerald-400" />{isSpanish ? 'Datos persistentes' : 'Persistent data'}</li>
                  <li className="flex items-center gap-2"><CheckCircle className="w-4 h-4 text-emerald-400" />{isSpanish ? 'Historial real de operaciones' : 'Real operation history'}</li>
                </ul>
              ) : (
                <ul className="space-y-2 text-sm text-slate-300">
                  <li className="flex items-center gap-2"><FlaskConical className="w-4 h-4 text-yellow-400" />{isSpanish ? 'Datos de demostracion' : 'Demo data'}</li>
                  <li className="flex items-center gap-2"><FlaskConical className="w-4 h-4 text-yellow-400" />{isSpanish ? 'Operaciones simuladas' : 'Simulated operations'}</li>
                  <li className="flex items-center gap-2"><FlaskConical className="w-4 h-4 text-yellow-400" />{isSpanish ? 'Sin impacto real' : 'No real impact'}</li>
                </ul>
              )}
            </div>
            <div className="flex gap-3">
              <button onClick={() => setShowModeConfirm(null)} className="flex-1 py-3 bg-slate-700 hover:bg-slate-600 rounded-lg font-medium transition-colors">{isSpanish ? 'Cancelar' : 'Cancel'}</button>
              <button onClick={confirmModeChange} className={'flex-1 py-3 rounded-lg font-medium transition-colors ' + (showModeConfirm === 'real' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-yellow-600 hover:bg-yellow-700')}>{isSpanish ? 'Confirmar' : 'Confirm'}</button>
            </div>
          </div>
        </div>
      )}
      
      {/* Modal de deposito para modo real */}
      {showDepositModal && operationMode === 'real' && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
          <div className="bg-slate-800 rounded-2xl p-8 max-w-md mx-4 border border-slate-600 shadow-2xl">
            <div className="flex items-center gap-4 mb-6">
              <div className="p-3 bg-emerald-500/20 rounded-xl"><ArrowDownLeft className="w-8 h-8 text-emerald-400" /></div>
              <div><h3 className="text-xl font-bold text-white">{isSpanish ? 'Agregar Fondos' : 'Add Funds'}</h3><p className="text-slate-400 text-sm">{isSpanish ? 'Simular un deposito en modo real' : 'Simulate a deposit in real mode'}</p></div>
            </div>
            <div className="space-y-4 mb-6">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">{isSpanish ? 'Moneda' : 'Currency'}</label>
                <select value={depositForm.currency} onChange={e => setDepositForm({ ...depositForm, currency: e.target.value })} className="w-full p-3 bg-slate-900 border border-slate-600 rounded-lg text-white">
                  <option value="USD">USD</option><option value="BTC">BTC</option><option value="ETH">ETH</option><option value="USDT">USDT</option><option value="USDC">USDC</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">{isSpanish ? 'Monto' : 'Amount'}</label>
                <input type="number" value={depositForm.amount} onChange={e => setDepositForm({ ...depositForm, amount: e.target.value })} placeholder={isSpanish ? 'Ej: 100000' : 'Ex: 100000'} className="w-full p-3 bg-slate-900 border border-slate-600 rounded-lg text-white" />
              </div>
            </div>
            <div className="flex gap-3">
              <button onClick={() => setShowDepositModal(false)} className="flex-1 py-3 bg-slate-700 hover:bg-slate-600 rounded-lg font-medium transition-colors">{isSpanish ? 'Cancelar' : 'Cancel'}</button>
              <button onClick={() => { handleRealModeDeposit(depositForm.currency, depositForm.amount); setDepositForm({ currency: 'USD', amount: '' }); setShowDepositModal(false); }} className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-700 rounded-lg font-medium transition-colors">{isSpanish ? 'Depositar' : 'Deposit'}</button>
            </div>
          </div>
        </div>
      )}
      {/* Header */}
      <div className="flex items-center justify-between mb-6 pb-4 border-b border-slate-700">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-xl shadow-lg shadow-cyan-500/30">
            <Globe className="w-8 h-8 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-cyan-400 to-blue-400 bg-clip-text text-transparent">API VEGA</h1>
            <p className="text-slate-400 text-sm">{isSpanish ? 'Plataforma Institucional de Trading Crypto' : 'Institutional Crypto Trading Platform'}</p>
          </div>
        </div>
        
        <div className="flex items-center gap-4">
          {/* Mode Toggle */}
          <div className="flex items-center gap-2 bg-slate-800 rounded-xl p-1 border border-slate-700">
            <button onClick={() => handleModeChange('sandbox')} className={'flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all ' + (operationMode === 'sandbox' ? 'bg-yellow-500/30 text-yellow-400 border border-yellow-500/50' : 'text-slate-400 hover:text-slate-200')}>
              <FlaskConical className="w-4 h-4" />Sandbox
            </button>
            <button onClick={() => handleModeChange('real')} className={'flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all ' + (operationMode === 'real' ? 'bg-emerald-500/30 text-emerald-400 border border-emerald-500/50' : 'text-slate-400 hover:text-slate-200')}>
              <Power className="w-4 h-4" />Real
            </button>
          </div>
          
          {/* Real mode deposit button */}
          {operationMode === 'real' && (
            <button onClick={() => setShowDepositModal(true)} className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 rounded-lg font-medium transition-colors">
              <ArrowDownLeft className="w-4 h-4" />{isSpanish ? 'Depositar' : 'Deposit'}
            </button>
          )}
          
          <div className={'flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium ' + (loading ? 'bg-yellow-500/20 text-yellow-400' : operationMode === 'real' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-yellow-500/20 text-yellow-400')}>
            {loading ? <Loader className="w-4 h-4 animate-spin" /> : operationMode === 'real' ? <Play className="w-4 h-4" /> : <FlaskConical className="w-4 h-4" />}
            {loading ? (isSpanish ? 'Sincronizando...' : 'Syncing...') : operationMode === 'real' ? (isSpanish ? 'Modo Real' : 'Real Mode') : (isSpanish ? 'Modo Sandbox' : 'Sandbox Mode')}
          </div>
          <button onClick={fetchData} className="p-2 bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors" title={isSpanish ? 'Actualizar' : 'Refresh'}>
            <RefreshCcw className={'w-5 h-5 ' + (loading ? 'animate-spin' : '')} />
          </button>
        </div>
      </div>
      
      {/* Navigation */}
      <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
        {tabs.map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={'flex items-center gap-2 px-4 py-2.5 rounded-lg font-medium transition-all whitespace-nowrap ' + (activeTab === tab.id ? 'bg-gradient-to-r from-cyan-600 to-blue-600 text-white shadow-lg shadow-cyan-500/30' : 'bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white')}>
            <tab.icon className="w-5 h-5" />{tab.name}
          </button>
        ))}
      </div>
      
      {/* Error */}
      {error && (
        <div className="mb-6 p-4 bg-red-500/20 border border-red-500/50 rounded-xl flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 text-red-400 flex-shrink-0" />
          <span className="text-red-300">{error}</span>
          <button onClick={() => setError(null)} className="ml-auto text-red-400 hover:text-red-300"><XCircle className="w-5 h-5" /></button>
        </div>
      )}
      {/* Content */}
      {!loading && (
        <>
          {/* Dashboard */}
          {activeTab === 'dashboard' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-xl p-5 border border-slate-700">
                  <div className="flex items-center gap-3 mb-3"><div className="p-2 bg-emerald-500/20 rounded-lg"><DollarSign className="w-5 h-5 text-emerald-400" /></div><span className="text-slate-400 text-sm">{isSpanish ? 'Valor Total USD' : 'Total Value USD'}</span></div>
                  <p className="text-2xl font-bold text-emerald-400">\</p>
                </div>
                <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-xl p-5 border border-slate-700">
                  <div className="flex items-center gap-3 mb-3"><div className="p-2 bg-yellow-500/20 rounded-lg"><ArrowRightLeft className="w-5 h-5 text-yellow-400" /></div><span className="text-slate-400 text-sm">{isSpanish ? 'Ordenes Activas' : 'Active Orders'}</span></div>
                  <p className="text-2xl font-bold text-yellow-400">{orders.filter(o => ['executing', 'settling', 'quoting'].includes(o.status)).length}</p>
                </div>
                <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-xl p-5 border border-slate-700">
                  <div className="flex items-center gap-3 mb-3"><div className="p-2 bg-purple-500/20 rounded-lg"><Zap className="w-5 h-5 text-purple-400" /></div><span className="text-slate-400 text-sm">{isSpanish ? 'Liquidez Disponible' : 'Available Liquidity'}</span></div>
                  <p className="text-2xl font-bold text-purple-400">{liquidityProviders.filter(lp => lp.status === 'online').length}/{liquidityProviders.length}</p>
                </div>
                <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-xl p-5 border border-slate-700">
                  <div className="flex items-center gap-3 mb-3"><div className="p-2 bg-blue-500/20 rounded-lg"><Bell className="w-5 h-5 text-blue-400" /></div><span className="text-slate-400 text-sm">{isSpanish ? 'Webhooks Exitosos' : 'Successful Webhooks'}</span></div>
                  <p className="text-2xl font-bold text-blue-400">{webhookLogs.filter(w => w.status === 'success').length}</p>
                </div>
              </div>
              
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="bg-slate-800/50 rounded-xl p-6 border border-slate-700">
                  <h3 className="text-lg font-bold text-cyan-400 mb-4 flex items-center gap-2"><Layers className="w-5 h-5" />{isSpanish ? 'Balances' : 'Balances'}</h3>
                  <div className="space-y-3">
                    {balances.map(b => (
                      <div key={b.currency} className="bg-slate-900/50 p-4 rounded-lg border border-slate-700">
                        <div className="flex items-center justify-between mb-2"><div className="flex items-center gap-3">{getCurrencyIcon(b.currency)}<span className="font-semibold">{b.currency}</span></div><span className="font-bold">{formatCurrency(b.balance, b.currency)}</span></div>
                        <div className="flex justify-between text-xs text-slate-400"><span>{isSpanish ? 'Disponible:' : 'Available:'} {formatCurrency(b.available_balance, b.currency)}</span><span>{isSpanish ? 'Bloqueado:' : 'Locked:'} {formatCurrency(b.locked_balance, b.currency)}</span></div>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="bg-slate-800/50 rounded-xl p-6 border border-slate-700">
                  <h3 className="text-lg font-bold text-yellow-400 mb-4 flex items-center gap-2"><History className="w-5 h-5" />{isSpanish ? 'Ordenes Recientes' : 'Recent Orders'}</h3>
                  <div className="space-y-3">
                    {orders.slice(0, 5).map(order => (
                      <div key={order.order_id} className="bg-slate-900/50 p-4 rounded-lg border border-slate-700">
                        <div className="flex items-center justify-between mb-2"><span className="text-sm font-mono text-slate-300">{order.order_number}</span><span className={'flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full ' + getStatusBg(order.status) + ' ' + getStatusColor(order.status)}>{getStatusIcon(order.status)}{order.status}</span></div>
                        <div className="flex items-center gap-2 text-sm"><span>{formatCurrency(order.from_amount, order.from_currency)}</span><ArrowRightLeft className="w-4 h-4 text-slate-500" /><span>{formatCurrency(order.to_amount, order.to_currency)}</span></div>
                        <div className="text-xs text-slate-500 mt-2">{formatDateTime(order.created_at)}</div>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="bg-slate-800/50 rounded-xl p-6 border border-slate-700">
                  <h3 className="text-lg font-bold text-purple-400 mb-4 flex items-center gap-2"><TrendingUp className="w-5 h-5" />{isSpanish ? 'Proveedores de Liquidez' : 'Liquidity Providers'}</h3>
                  <div className="space-y-3">
                    {liquidityProviders.map(lp => (
                      <div key={lp.code} className="bg-slate-900/50 p-4 rounded-lg border border-slate-700">
                        <div className="flex items-center justify-between mb-2"><span className="font-semibold">{lp.name}</span><span className={'flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full ' + getStatusBg(lp.status) + ' ' + getStatusColor(lp.status)}>{getStatusIcon(lp.status)}{lp.status}</span></div>
                        <div className="grid grid-cols-2 gap-2 text-xs text-slate-400"><span>Spread: <span className="text-white">{lp.spread}</span></span><span>Min: <span className="text-white">{lp.min_order}</span></span></div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}
          {/* Deposits */}
          {activeTab === 'deposits' && (
            <div className="space-y-6">
              {/* Header */}
              <div className="bg-gradient-to-r from-emerald-900/40 to-cyan-900/40 rounded-xl p-6 border border-emerald-500/30">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-emerald-500/20 rounded-xl">
                    <Download className="w-8 h-8 text-emerald-400" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-white">{isSpanish ? 'Depositar Fondos a VEGA' : 'Deposit Funds to VEGA'}</h3>
                    <p className="text-slate-400 text-sm">{isSpanish ? 'Envía fondos fiat o crypto a tu cuenta VEGA' : 'Send fiat or crypto funds to your VEGA account'}</p>
                  </div>
                </div>
              </div>
              
              {/* Method Selection */}
              <div className="flex gap-4">
                <button
                  onClick={() => setDepositMethod('crypto')}
                  className={'flex-1 p-4 rounded-xl border-2 transition-all ' + (depositMethod === 'crypto' ? 'bg-orange-500/20 border-orange-500 text-orange-400' : 'bg-slate-800/50 border-slate-700 text-slate-400 hover:border-slate-600')}
                >
                  <div className="flex items-center gap-3">
                    <Coins className="w-6 h-6" />
                    <div className="text-left">
                      <div className="font-bold">{isSpanish ? 'Depósito Crypto' : 'Crypto Deposit'}</div>
                      <div className="text-xs opacity-70">BTC, ETH, USDT, USDC, XRP, LTC, SOL</div>
                    </div>
                  </div>
                </button>
                <button
                  onClick={() => { setDepositMethod('fiat'); if (!fiatDepositDetails) generateFiatDepositDetails(); }}
                  className={'flex-1 p-4 rounded-xl border-2 transition-all ' + (depositMethod === 'fiat' ? 'bg-emerald-500/20 border-emerald-500 text-emerald-400' : 'bg-slate-800/50 border-slate-700 text-slate-400 hover:border-slate-600')}
                >
                  <div className="flex items-center gap-3">
                    <Banknote className="w-6 h-6" />
                    <div className="text-left">
                      <div className="font-bold">{isSpanish ? 'Depósito Fiat' : 'Fiat Deposit'}</div>
                      <div className="text-xs opacity-70">USD, EUR, GBP - {isSpanish ? 'Transferencia Bancaria' : 'Wire Transfer'}</div>
                    </div>
                  </div>
                </button>
              </div>
              
              {/* Crypto Deposit */}
              {depositMethod === 'crypto' && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Currency Selection */}
                  <div className="bg-slate-800/50 rounded-xl p-6 border border-slate-700">
                    <h4 className="text-lg font-bold text-orange-400 mb-4 flex items-center gap-2">
                      <Coins className="w-5 h-5" />{isSpanish ? 'Seleccionar Moneda' : 'Select Currency'}
                    </h4>
                    <div className="grid grid-cols-2 gap-3">
                      {['BTC', 'ETH', 'USDT', 'USDC', 'XRP', 'LTC', 'SOL'].map(cur => (
                        <button
                          key={cur}
                          onClick={() => setSelectedDepositCurrency(cur)}
                          className={'p-3 rounded-lg border transition-all flex items-center gap-2 ' + (selectedDepositCurrency === cur ? 'bg-orange-500/20 border-orange-500 text-orange-400' : 'bg-slate-900/50 border-slate-700 text-slate-300 hover:border-slate-600')}
                        >
                          {getCurrencyIcon(cur)}
                          <span className="font-medium">{cur}</span>
                        </button>
                      ))}
                    </div>
                    
                    <button
                      onClick={() => generateDepositAddress(selectedDepositCurrency)}
                      disabled={isGeneratingAddress}
                      className="w-full mt-4 py-3 bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-700 hover:to-amber-700 text-white font-bold rounded-lg transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                      {isGeneratingAddress ? <Loader className="w-5 h-5 animate-spin" /> : <Key className="w-5 h-5" />}
                      {isSpanish ? 'Generar Dirección de Depósito' : 'Generate Deposit Address'}
                    </button>
                  </div>
                  
                  {/* Deposit Address */}
                  <div className="bg-slate-800/50 rounded-xl p-6 border border-slate-700">
                    <h4 className="text-lg font-bold text-cyan-400 mb-4 flex items-center gap-2">
                      <Link2 className="w-5 h-5" />{isSpanish ? 'Dirección de Depósito' : 'Deposit Address'}
                    </h4>
                    
                    {depositAddresses[selectedDepositCurrency] ? (
                      <div className="space-y-4">
                        <div className="bg-slate-900 rounded-lg p-4 border border-slate-700">
                          <div className="text-xs text-slate-400 mb-1">{isSpanish ? 'Red' : 'Network'}</div>
                          <div className="text-white font-medium">{depositAddresses[selectedDepositCurrency].network}</div>
                        </div>
                        
                        <div className="bg-slate-900 rounded-lg p-4 border border-cyan-500/30">
                          <div className="text-xs text-slate-400 mb-1">{isSpanish ? 'Dirección' : 'Address'}</div>
                          <div className="flex items-center gap-2">
                            <code className="text-cyan-400 text-sm font-mono break-all flex-1">{depositAddresses[selectedDepositCurrency].address}</code>
                            <button onClick={() => copyToClipboard(depositAddresses[selectedDepositCurrency].address)} className="p-2 hover:bg-slate-800 rounded-lg transition-colors">
                              <Copy className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                        
                        {depositAddresses[selectedDepositCurrency].memo && (
                          <div className="bg-yellow-900/30 rounded-lg p-4 border border-yellow-500/30">
                            <div className="text-xs text-yellow-400 mb-1 flex items-center gap-1">
                              <AlertTriangle className="w-3 h-3" />MEMO/TAG ({isSpanish ? 'Requerido' : 'Required'})
                            </div>
                            <div className="flex items-center gap-2">
                              <code className="text-yellow-400 text-lg font-mono">{depositAddresses[selectedDepositCurrency].memo}</code>
                              <button onClick={() => copyToClipboard(depositAddresses[selectedDepositCurrency].memo!)} className="p-2 hover:bg-slate-800 rounded-lg transition-colors">
                                <Copy className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        )}
                        
                        <div className="grid grid-cols-2 gap-3 text-sm">
                          <div className="bg-slate-900/50 rounded-lg p-3">
                            <div className="text-slate-400">{isSpanish ? 'Depósito Mínimo' : 'Min Deposit'}</div>
                            <div className="text-white font-medium">{depositAddresses[selectedDepositCurrency].minDeposit} {selectedDepositCurrency}</div>
                          </div>
                          <div className="bg-slate-900/50 rounded-lg p-3">
                            <div className="text-slate-400">{isSpanish ? 'Confirmaciones' : 'Confirmations'}</div>
                            <div className="text-white font-medium">{depositAddresses[selectedDepositCurrency].confirmations}</div>
                          </div>
                        </div>
                        
                        <div className="bg-blue-900/20 rounded-lg p-4 border border-blue-500/30">
                          <div className="flex items-start gap-2">
                            <Shield className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
                            <div className="text-sm text-blue-300">
                              {isSpanish 
                                ? `Envía solo ${selectedDepositCurrency} a esta dirección. Enviar otras monedas puede resultar en pérdida de fondos.`
                                : `Only send ${selectedDepositCurrency} to this address. Sending other coins may result in permanent loss.`}
                            </div>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="text-center py-8">
                        <Coins className="w-12 h-12 text-slate-600 mx-auto mb-3" />
                        <p className="text-slate-400">{isSpanish ? 'Genera una dirección para depositar' : 'Generate an address to deposit'} {selectedDepositCurrency}</p>
                      </div>
                    )}
                  </div>
                </div>
              )}
              
              {/* Fiat Deposit */}
              {depositMethod === 'fiat' && fiatDepositDetails && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Bank Details */}
                  <div className="bg-slate-800/50 rounded-xl p-6 border border-slate-700">
                    <h4 className="text-lg font-bold text-emerald-400 mb-4 flex items-center gap-2">
                      <Building2 className="w-5 h-5" />{isSpanish ? 'Datos Bancarios' : 'Bank Details'}
                    </h4>
                    
                    <div className="space-y-4">
                      <div className="bg-slate-900 rounded-lg p-4">
                        <div className="text-xs text-slate-400 mb-1">{isSpanish ? 'Banco' : 'Bank'}</div>
                        <div className="text-white font-medium">{fiatDepositDetails.bankName}</div>
                      </div>
                      
                      <div className="bg-slate-900 rounded-lg p-4">
                        <div className="text-xs text-slate-400 mb-1">{isSpanish ? 'Beneficiario' : 'Beneficiary'}</div>
                        <div className="flex items-center gap-2">
                          <span className="text-white font-medium">{fiatDepositDetails.beneficiary}</span>
                          <button onClick={() => copyToClipboard(fiatDepositDetails.beneficiary)} className="p-1 hover:bg-slate-800 rounded transition-colors">
                            <Copy className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-3">
                        <div className="bg-slate-900 rounded-lg p-4">
                          <div className="text-xs text-slate-400 mb-1">{isSpanish ? 'Número de Cuenta' : 'Account Number'}</div>
                          <div className="flex items-center gap-2">
                            <span className="text-white font-mono">{fiatDepositDetails.accountNumber}</span>
                            <button onClick={() => copyToClipboard(fiatDepositDetails.accountNumber)} className="p-1 hover:bg-slate-800 rounded transition-colors">
                              <Copy className="w-3 h-3" />
                            </button>
                          </div>
                        </div>
                        <div className="bg-slate-900 rounded-lg p-4">
                          <div className="text-xs text-slate-400 mb-1">Routing Number</div>
                          <div className="flex items-center gap-2">
                            <span className="text-white font-mono">{fiatDepositDetails.routingNumber}</span>
                            <button onClick={() => copyToClipboard(fiatDepositDetails.routingNumber)} className="p-1 hover:bg-slate-800 rounded transition-colors">
                              <Copy className="w-3 h-3" />
                            </button>
                          </div>
                        </div>
                      </div>
                      
                      <div className="bg-slate-900 rounded-lg p-4">
                        <div className="text-xs text-slate-400 mb-1">SWIFT/BIC</div>
                        <div className="flex items-center gap-2">
                          <span className="text-white font-mono">{fiatDepositDetails.swift}</span>
                          <button onClick={() => copyToClipboard(fiatDepositDetails.swift)} className="p-1 hover:bg-slate-800 rounded transition-colors">
                            <Copy className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  {/* Reference & Instructions */}
                  <div className="bg-slate-800/50 rounded-xl p-6 border border-slate-700">
                    <h4 className="text-lg font-bold text-yellow-400 mb-4 flex items-center gap-2">
                      <FileText className="w-5 h-5" />{isSpanish ? 'Referencia de Pago' : 'Payment Reference'}
                    </h4>
                    
                    <div className="bg-yellow-900/30 rounded-lg p-4 border border-yellow-500/50 mb-4">
                      <div className="text-xs text-yellow-400 mb-1 flex items-center gap-1">
                        <AlertTriangle className="w-3 h-3" />{isSpanish ? 'IMPORTANTE: Incluir en el concepto' : 'IMPORTANT: Include in payment reference'}
                      </div>
                      <div className="flex items-center gap-2">
                        <code className="text-yellow-400 text-xl font-mono font-bold">{fiatDepositDetails.reference}</code>
                        <button onClick={() => copyToClipboard(fiatDepositDetails.reference)} className="p-2 hover:bg-slate-800 rounded-lg transition-colors">
                          <Copy className="w-5 h-5" />
                        </button>
                      </div>
                    </div>
                    
                    <div className="space-y-3 text-sm">
                      <h5 className="font-semibold text-white">{isSpanish ? 'Instrucciones:' : 'Instructions:'}</h5>
                      <ol className="list-decimal list-inside space-y-2 text-slate-300">
                        <li>{isSpanish ? 'Inicia una transferencia bancaria desde tu banco' : 'Initiate a wire transfer from your bank'}</li>
                        <li>{isSpanish ? 'Usa los datos bancarios proporcionados arriba' : 'Use the bank details provided above'}</li>
                        <li>{isSpanish ? 'INCLUYE la referencia de pago en el concepto' : 'INCLUDE the payment reference in the memo'}</li>
                        <li>{isSpanish ? 'Espera 1-3 días hábiles para el acreditamiento' : 'Wait 1-3 business days for crediting'}</li>
                      </ol>
                    </div>
                    
                    <div className="mt-4 bg-emerald-900/20 rounded-lg p-4 border border-emerald-500/30">
                      <div className="flex items-start gap-2">
                        <Bell className="w-5 h-5 text-emerald-400 flex-shrink-0 mt-0.5" />
                        <div className="text-sm text-emerald-300">
                          {isSpanish 
                            ? 'Recibirás una notificación webhook cuando tu depósito sea acreditado.'
                            : 'You will receive a webhook notification when your deposit is credited.'}
                        </div>
                      </div>
                    </div>
                    
                    <div className="mt-4 grid grid-cols-3 gap-2 text-center text-xs">
                      <div className="bg-slate-900/50 rounded-lg p-2">
                        <div className="text-slate-400">{isSpanish ? 'Mínimo' : 'Minimum'}</div>
                        <div className="text-white font-medium">$100 USD</div>
                      </div>
                      <div className="bg-slate-900/50 rounded-lg p-2">
                        <div className="text-slate-400">{isSpanish ? 'Máximo' : 'Maximum'}</div>
                        <div className="text-white font-medium">$10M USD</div>
                      </div>
                      <div className="bg-slate-900/50 rounded-lg p-2">
                        <div className="text-slate-400">{isSpanish ? 'Comisión' : 'Fee'}</div>
                        <div className="text-emerald-400 font-medium">0%</div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
              
              {/* API Endpoint Info */}
              <div className="bg-slate-800/50 rounded-xl p-6 border border-slate-700">
                <h4 className="text-lg font-bold text-purple-400 mb-4 flex items-center gap-2">
                  <Code className="w-5 h-5" />API Endpoints {isSpanish ? 'para Depósitos' : 'for Deposits'}
                </h4>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-slate-900 rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="px-2 py-0.5 bg-emerald-500/20 text-emerald-400 rounded text-xs font-bold">GET</span>
                      <code className="text-sm text-slate-300">/deposits/address/:currency</code>
                    </div>
                    <p className="text-xs text-slate-400">{isSpanish ? 'Obtener dirección de depósito crypto' : 'Get crypto deposit address'}</p>
                  </div>
                  
                  <div className="bg-slate-900 rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="px-2 py-0.5 bg-blue-500/20 text-blue-400 rounded text-xs font-bold">POST</span>
                      <code className="text-sm text-slate-300">/deposits</code>
                    </div>
                    <p className="text-xs text-slate-400">{isSpanish ? 'Crear depósito fiat (interno)' : 'Create fiat deposit (internal)'}</p>
                  </div>
                  
                  <div className="bg-slate-900 rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="px-2 py-0.5 bg-emerald-500/20 text-emerald-400 rounded text-xs font-bold">GET</span>
                      <code className="text-sm text-slate-300">/deposits/:id</code>
                    </div>
                    <p className="text-xs text-slate-400">{isSpanish ? 'Consultar estado de depósito' : 'Check deposit status'}</p>
                  </div>
                  
                  <div className="bg-slate-900 rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="px-2 py-0.5 bg-purple-500/20 text-purple-400 rounded text-xs font-bold">WEBHOOK</span>
                      <code className="text-sm text-slate-300">deposit.confirmed</code>
                    </div>
                    <p className="text-xs text-slate-400">{isSpanish ? 'Notificación cuando se confirma' : 'Notification when confirmed'}</p>
                  </div>
                </div>
              </div>
            </div>
          )}
          
          {/* Conversion */}
          {activeTab === 'conversion' && (
            <div className="max-w-2xl mx-auto">
              <div className="bg-slate-800/50 rounded-xl p-8 border border-slate-700">
                <h3 className="text-2xl font-bold text-cyan-400 mb-6 flex items-center gap-3"><ArrowRightLeft className="w-6 h-6" />{isSpanish ? 'Nueva Conversion' : 'New Conversion'}</h3>
                <div className="space-y-5">
                  <div className="grid grid-cols-2 gap-4">
                    <div><label className="block text-sm font-medium text-slate-300 mb-2">{isSpanish ? 'Moneda Origen' : 'From Currency'}</label>
                      <select value={conversionForm.fromCurrency} onChange={e => setConversionForm({ ...conversionForm, fromCurrency: e.target.value })} className="w-full p-3 bg-slate-900 border border-slate-600 rounded-lg text-white"><option value="USD">USD</option><option value="BTC">BTC</option><option value="ETH">ETH</option><option value="USDT">USDT</option><option value="USDC">USDC</option></select></div>
                    <div><label className="block text-sm font-medium text-slate-300 mb-2">{isSpanish ? 'Moneda Destino' : 'To Currency'}</label>
                      <select value={conversionForm.toCurrency} onChange={e => setConversionForm({ ...conversionForm, toCurrency: e.target.value })} className="w-full p-3 bg-slate-900 border border-slate-600 rounded-lg text-white"><option value="BTC">BTC</option><option value="ETH">ETH</option><option value="USD">USD</option><option value="USDT">USDT</option><option value="USDC">USDC</option></select></div>
                  </div>
                  <div><label className="block text-sm font-medium text-slate-300 mb-2">{isSpanish ? 'Monto a Convertir' : 'Amount to Convert'}</label>
                    <input type="number" value={conversionForm.amount} onChange={e => setConversionForm({ ...conversionForm, amount: e.target.value })} placeholder={isSpanish ? 'Ej: 100000' : 'Ex: 100000'} className="w-full p-3 bg-slate-900 border border-slate-600 rounded-lg text-white" /></div>
                  <button onClick={handleGetQuote} disabled={quoteLoading} className="w-full py-3 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white font-bold rounded-lg transition-all flex items-center justify-center gap-2 disabled:opacity-50">{quoteLoading && <Loader className="w-5 h-5 animate-spin" />}{isSpanish ? 'Obtener Cotizacion' : 'Get Quote'}</button>
                  {currentQuote && (
                    <div className="mt-6 p-6 bg-slate-900 rounded-xl border border-cyan-500/50">
                      <h4 className="text-lg font-bold text-cyan-400 mb-4">{isSpanish ? 'Cotizacion Recibida' : 'Quote Received'}</h4>
                      <div className="space-y-3 text-sm">
                        <div className="flex justify-between"><span className="text-slate-400">{isSpanish ? 'Envia:' : 'Send:'}</span><span className="font-bold">{formatCurrency(currentQuote.from_amount, currentQuote.from_currency)}</span></div>
                        <div className="flex justify-between"><span className="text-slate-400">{isSpanish ? 'Recibe:' : 'Receive:'}</span><span className="font-bold text-emerald-400">{formatCurrency(currentQuote.to_amount, currentQuote.to_currency)}</span></div>
                        <div className="flex justify-between"><span className="text-slate-400">{isSpanish ? 'Tasa:' : 'Rate:'}</span><span>{currentQuote.rate}</span></div>
                        <div className="flex justify-between"><span className="text-slate-400">{isSpanish ? 'Comision:' : 'Fee:'}</span><span>{formatCurrency(currentQuote.fee_amount, currentQuote.fee_currency)}</span></div>
                        <div className="flex justify-between"><span className="text-slate-400">{isSpanish ? 'Expira:' : 'Expires:'}</span><span className="text-yellow-400">{formatDateTime(currentQuote.expires_at)}</span></div>
                      </div>
                      <div className="mt-4 flex items-center gap-3"><input type="checkbox" id="acceptTerms" checked={conversionForm.acceptTerms} onChange={e => setConversionForm({ ...conversionForm, acceptTerms: e.target.checked })} className="w-4 h-4 rounded border-slate-600 bg-slate-900 text-cyan-500" /><label htmlFor="acceptTerms" className="text-sm text-slate-300">{isSpanish ? 'Acepto los terminos y condiciones' : 'I accept the terms and conditions'}</label></div>
                      <button onClick={handleExecuteConversion} disabled={quoteLoading || !conversionForm.acceptTerms} className="w-full mt-4 py-3 bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-700 hover:to-green-700 text-white font-bold rounded-lg transition-all flex items-center justify-center gap-2 disabled:opacity-50">{quoteLoading && <Loader className="w-5 h-5 animate-spin" />}{isSpanish ? 'Ejecutar Conversion' : 'Execute Conversion'}</button>
                    </div>
                  )}
                  {conversionResult && (
                    <div className="mt-6 p-6 bg-emerald-900/30 rounded-xl border border-emerald-500/50">
                      <div className="flex items-center gap-3 mb-4"><CheckCircle className="w-6 h-6 text-emerald-400" /><h4 className="text-lg font-bold text-emerald-400">{isSpanish ? 'Conversion Iniciada!' : 'Conversion Started!'}</h4></div>
                      <div className="space-y-2 text-sm"><p><span className="text-slate-400">{isSpanish ? 'Orden:' : 'Order:'}</span> {conversionResult.order_number}</p><p><span className="text-slate-400">{isSpanish ? 'Estado:' : 'Status:'}</span> <span className="text-yellow-400">{conversionResult.status}</span></p></div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
          {/* Transactions */}
          {activeTab === 'transactions' && (
            <div className="bg-slate-800/50 rounded-xl p-6 border border-slate-700">
              <h3 className="text-xl font-bold text-yellow-400 mb-6 flex items-center gap-2"><History className="w-5 h-5" />{isSpanish ? 'Historial de Transacciones' : 'Transaction History'}</h3>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead><tr className="border-b border-slate-700"><th className="text-left py-3 px-4 text-slate-400 font-medium">ID</th><th className="text-left py-3 px-4 text-slate-400 font-medium">{isSpanish ? 'Tipo' : 'Type'}</th><th className="text-left py-3 px-4 text-slate-400 font-medium">{isSpanish ? 'Moneda' : 'Currency'}</th><th className="text-right py-3 px-4 text-slate-400 font-medium">{isSpanish ? 'Monto' : 'Amount'}</th><th className="text-left py-3 px-4 text-slate-400 font-medium">{isSpanish ? 'Estado' : 'Status'}</th><th className="text-left py-3 px-4 text-slate-400 font-medium">{isSpanish ? 'Fecha' : 'Date'}</th></tr></thead>
                  <tbody>
                    {transactions.map(tx => (
                      <tr key={tx.id} className="border-b border-slate-800 hover:bg-slate-800/50">
                        <td className="py-3 px-4 font-mono text-sm">{tx.reference}</td>
                        <td className="py-3 px-4"><div className="flex items-center gap-2">{tx.type === 'deposit' && <ArrowDownLeft className="w-4 h-4 text-emerald-400" />}{tx.type === 'withdrawal' && <ArrowUpRight className="w-4 h-4 text-red-400" />}{tx.type === 'conversion' && <ArrowRightLeft className="w-4 h-4 text-blue-400" />}{tx.type === 'fee' && <DollarSign className="w-4 h-4 text-yellow-400" />}{tx.type}</div></td>
                        <td className="py-3 px-4">{tx.currency}</td>
                        <td className="py-3 px-4 text-right font-mono">{formatCurrency(tx.amount, tx.currency)}</td>
                        <td className="py-3 px-4"><span className={'flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full w-fit ' + getStatusBg(tx.status) + ' ' + getStatusColor(tx.status)}>{getStatusIcon(tx.status)}{tx.status}</span></td>
                        <td className="py-3 px-4 text-slate-400 text-sm">{formatDateTime(tx.created_at)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
          
          {/* Blockchain */}
          {activeTab === 'blockchain' && blockchainStatus && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-gradient-to-br from-orange-900/30 to-slate-900 rounded-xl p-6 border border-orange-500/30">
                  <div className="flex items-center gap-3 mb-4"><div className="p-3 bg-orange-500/20 rounded-lg"><Coins className="w-6 h-6 text-orange-400" /></div><div><h3 className="text-xl font-bold text-orange-400">Bitcoin</h3><p className="text-sm text-slate-400">Network Status</p></div><div className={'ml-auto flex items-center gap-1 px-3 py-1 rounded-full text-sm ' + (blockchainStatus.btc.synced ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400')}>{blockchainStatus.btc.synced ? <CheckCircle className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}{blockchainStatus.btc.synced ? 'Synced' : 'Syncing'}</div></div>
                  <div className="space-y-3"><div className="flex justify-between"><span className="text-slate-400">{isSpanish ? 'Altura de Bloque:' : 'Block Height:'}</span><span className="font-mono font-bold">{blockchainStatus.btc.block_height.toLocaleString()}</span></div><div className="flex justify-between"><span className="text-slate-400">{isSpanish ? 'Confirmaciones Req:' : 'Confirmations Req:'}</span><span>{blockchainStatus.btc.confirmations_required}</span></div><div className="flex justify-between"><span className="text-slate-400">{isSpanish ? 'Ultimo Escaneo:' : 'Last Scanned:'}</span><span className="text-sm">{formatDateTime(blockchainStatus.btc.last_scanned)}</span></div></div>
                </div>
                <div className="bg-gradient-to-br from-purple-900/30 to-slate-900 rounded-xl p-6 border border-purple-500/30">
                  <div className="flex items-center gap-3 mb-4"><div className="p-3 bg-purple-500/20 rounded-lg"><Coins className="w-6 h-6 text-purple-400" /></div><div><h3 className="text-xl font-bold text-purple-400">Ethereum</h3><p className="text-sm text-slate-400">Network Status</p></div><div className={'ml-auto flex items-center gap-1 px-3 py-1 rounded-full text-sm ' + (blockchainStatus.eth.synced ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400')}>{blockchainStatus.eth.synced ? <CheckCircle className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}{blockchainStatus.eth.synced ? 'Synced' : 'Syncing'}</div></div>
                  <div className="space-y-3"><div className="flex justify-between"><span className="text-slate-400">{isSpanish ? 'Altura de Bloque:' : 'Block Height:'}</span><span className="font-mono font-bold">{blockchainStatus.eth.block_height.toLocaleString()}</span></div><div className="flex justify-between"><span className="text-slate-400">{isSpanish ? 'Confirmaciones Req:' : 'Confirmations Req:'}</span><span>{blockchainStatus.eth.confirmations_required}</span></div><div className="flex justify-between"><span className="text-slate-400">{isSpanish ? 'Ultimo Escaneo:' : 'Last Scanned:'}</span><span className="text-sm">{formatDateTime(blockchainStatus.eth.last_scanned)}</span></div></div>
                </div>
              </div>
              <div className="bg-slate-800/50 rounded-xl p-6 border border-slate-700">
                <div className="flex items-center gap-3 mb-4"><Clock className="w-5 h-5 text-yellow-400" /><h3 className="text-lg font-bold">{isSpanish ? 'Transacciones Pendientes' : 'Pending Transactions'}</h3><span className="ml-auto text-2xl font-bold text-yellow-400">{blockchainStatus.pending_transactions}</span></div>
                <p className="text-slate-400 text-sm">{isSpanish ? 'Transacciones esperando confirmaciones en la blockchain' : 'Transactions awaiting blockchain confirmations'}</p>
              </div>
            </div>
          )}
          {/* Webhooks */}
          {activeTab === 'webhooks' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-slate-800/50 rounded-xl p-5 border border-slate-700"><div className="flex items-center gap-3 mb-2"><Bell className="w-5 h-5 text-blue-400" /><span className="text-slate-400">{isSpanish ? 'Total Webhooks' : 'Total Webhooks'}</span></div><p className="text-2xl font-bold">{webhookLogs.length}</p></div>
                <div className="bg-slate-800/50 rounded-xl p-5 border border-slate-700"><div className="flex items-center gap-3 mb-2"><CheckCircle className="w-5 h-5 text-emerald-400" /><span className="text-slate-400">{isSpanish ? 'Exitosos' : 'Successful'}</span></div><p className="text-2xl font-bold text-emerald-400">{webhookLogs.filter(w => w.status === 'success').length}</p></div>
                <div className="bg-slate-800/50 rounded-xl p-5 border border-slate-700"><div className="flex items-center gap-3 mb-2"><XCircle className="w-5 h-5 text-red-400" /><span className="text-slate-400">{isSpanish ? 'Fallidos' : 'Failed'}</span></div><p className="text-2xl font-bold text-red-400">{webhookLogs.filter(w => w.status === 'failed').length}</p></div>
              </div>
              <div className="bg-slate-800/50 rounded-xl p-6 border border-slate-700">
                <h3 className="text-lg font-bold text-blue-400 mb-4">{isSpanish ? 'Registros de Webhooks' : 'Webhook Logs'}</h3>
                <div className="space-y-3">
                  {webhookLogs.map(log => (
                    <div key={log.id} className="bg-slate-900/50 p-4 rounded-lg border border-slate-700">
                      <div className="flex items-center justify-between mb-2"><div className="flex items-center gap-3"><span className={'flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full ' + getStatusBg(log.status) + ' ' + getStatusColor(log.status)}>{getStatusIcon(log.status)}{log.status}</span><span className="font-mono text-sm text-cyan-400">{log.event_type}</span></div><span className="text-xs text-slate-500">{formatDateTime(log.timestamp)}</span></div>
                      <p className="text-sm text-slate-300">{log.payload_summary}</p>
                      {log.signature_valid !== undefined && (<div className="mt-2 flex items-center gap-2 text-xs"><Lock className="w-3 h-3" /><span className={log.signature_valid ? 'text-emerald-400' : 'text-red-400'}>{log.signature_valid ? (isSpanish ? 'Firma HMAC valida' : 'Valid HMAC signature') : (isSpanish ? 'Firma HMAC invalida' : 'Invalid HMAC signature')}</span></div>)}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
          {/* API Explorer */}
          {activeTab === 'api_explorer' && (
            <div className="space-y-6">
              {/* API Base URL Banner */}
              <div className="bg-gradient-to-r from-cyan-900/40 to-blue-900/40 rounded-xl p-6 border border-cyan-500/30">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-cyan-500/20 rounded-xl">
                      <Globe className="w-8 h-8 text-cyan-400" />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-white">VEGA API {vegaEnvironment === 'development' ? 'Development' : 'Production'}</h3>
                      <p className="text-cyan-400 font-mono text-sm">{apiConfig.base_url}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => handleEnvironmentChange('development')}
                      className={'px-4 py-2 rounded-lg font-medium transition-all ' + (vegaEnvironment === 'development' ? 'bg-yellow-500/30 text-yellow-400 border border-yellow-500/50' : 'bg-slate-800 text-slate-400 hover:text-white')}
                    >
                      <TestTube2 className="w-4 h-4 inline mr-2" />Dev
                    </button>
                    <button
                      onClick={() => handleEnvironmentChange('production')}
                      className={'px-4 py-2 rounded-lg font-medium transition-all ' + (vegaEnvironment === 'production' ? 'bg-emerald-500/30 text-emerald-400 border border-emerald-500/50' : 'bg-slate-800 text-slate-400 hover:text-white')}
                    >
                      <Server className="w-4 h-4 inline mr-2" />Prod
                    </button>
                  </div>
                </div>
              </div>
              
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Endpoints List */}
                <div className="lg:col-span-1 bg-slate-800/50 rounded-xl p-5 border border-slate-700 max-h-[600px] overflow-y-auto">
                  <h3 className="text-lg font-bold text-cyan-400 mb-4 flex items-center gap-2">
                    <Code className="w-5 h-5" />{isSpanish ? 'Endpoints' : 'Endpoints'}
                  </h3>
                  
                  {endpointCategories.map(category => (
                    <div key={category} className="mb-4">
                      <h4 className="text-sm font-semibold text-slate-400 mb-2 uppercase tracking-wider">{category}</h4>
                      <div className="space-y-1">
                        {apiEndpoints.filter(e => e.category === category).map((endpoint, idx) => (
                          <button
                            key={idx}
                            onClick={() => setSelectedEndpoint(endpoint.path)}
                            className={'w-full text-left p-2 rounded-lg transition-all text-sm ' + (selectedEndpoint === endpoint.path ? 'bg-cyan-500/20 border border-cyan-500/50' : 'hover:bg-slate-700/50')}
                          >
                            <div className="flex items-center gap-2">
                              <span className={'px-2 py-0.5 rounded text-xs font-bold ' + (
                                endpoint.method === 'GET' ? 'bg-emerald-500/20 text-emerald-400' :
                                endpoint.method === 'POST' ? 'bg-blue-500/20 text-blue-400' :
                                endpoint.method === 'PUT' ? 'bg-yellow-500/20 text-yellow-400' :
                                endpoint.method === 'DELETE' ? 'bg-red-500/20 text-red-400' :
                                'bg-purple-500/20 text-purple-400'
                              )}>{endpoint.method}</span>
                              <span className="font-mono text-xs text-slate-300 truncate">{endpoint.path}</span>
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
                
                {/* Request/Response Panel */}
                <div className="lg:col-span-2 space-y-4">
                  {/* Selected Endpoint Info */}
                  {selectedEndpoint && (
                    <div className="bg-slate-800/50 rounded-xl p-5 border border-slate-700">
                      <div className="flex items-center justify-between mb-4">
                        <div>
                          <h3 className="text-lg font-bold text-white flex items-center gap-2">
                            {apiEndpoints.find(e => e.path === selectedEndpoint)?.description}
                          </h3>
                          <p className="text-cyan-400 font-mono text-sm mt-1">
                            {apiEndpoints.find(e => e.path === selectedEndpoint)?.method} {apiConfig.base_url}{selectedEndpoint}
                          </p>
                        </div>
                        <button
                          onClick={() => testApiEndpoint(apiEndpoints.find(e => e.path === selectedEndpoint)!)}
                          disabled={isTestingApi}
                          className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-700 hover:to-blue-700 rounded-lg font-medium transition-all disabled:opacity-50"
                        >
                          {isTestingApi ? <Loader className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                          {isSpanish ? 'Probar' : 'Test'}
                        </button>
                      </div>
                      
                      {/* Request Headers */}
                      <div className="mb-4">
                        <h4 className="text-sm font-semibold text-slate-400 mb-2">{isSpanish ? 'Headers' : 'Headers'}</h4>
                        <div className="bg-slate-900 rounded-lg p-3 font-mono text-xs text-slate-300 space-y-1">
                          <div><span className="text-cyan-400">Authorization:</span> Bearer {apiConfig.api_key.substring(0, 20)}...</div>
                          <div><span className="text-cyan-400">Content-Type:</span> application/json</div>
                          <div><span className="text-cyan-400">X-Client-ID:</span> {apiConfig.client_id}</div>
                          <div><span className="text-cyan-400">X-Request-ID:</span> req_{Date.now().toString(36)}</div>
                        </div>
                      </div>
                      
                      {/* Request Body (for POST/PUT) */}
                      {['POST', 'PUT', 'PATCH'].includes(apiEndpoints.find(e => e.path === selectedEndpoint)?.method || '') && (
                        <div className="mb-4">
                          <h4 className="text-sm font-semibold text-slate-400 mb-2">{isSpanish ? 'Cuerpo de la Solicitud' : 'Request Body'}</h4>
                          <textarea
                            value={apiRequestBody}
                            onChange={e => setApiRequestBody(e.target.value)}
                            className="w-full h-32 p-3 bg-slate-900 border border-slate-600 rounded-lg text-white font-mono text-sm resize-none"
                            placeholder='{"key": "value"}'
                          />
                        </div>
                      )}
                    </div>
                  )}
                  
                  {/* Response Panel */}
                  {apiResponse && (
                    <div className="bg-slate-800/50 rounded-xl p-5 border border-slate-700">
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="text-sm font-semibold text-emerald-400 flex items-center gap-2">
                          <CheckCircle className="w-4 h-4" />{isSpanish ? 'Respuesta' : 'Response'}
                        </h4>
                        <button
                          onClick={() => copyToClipboard(apiResponse)}
                          className="text-slate-400 hover:text-white transition-colors"
                        >
                          <Copy className="w-4 h-4" />
                        </button>
                      </div>
                      <pre className="bg-slate-900 rounded-lg p-4 font-mono text-xs text-slate-300 overflow-x-auto max-h-64">
                        {apiResponse}
                      </pre>
                    </div>
                  )}
                  
                  {/* Test History */}
                  {apiTestResults.length > 0 && (
                    <div className="bg-slate-800/50 rounded-xl p-5 border border-slate-700">
                      <h4 className="text-sm font-semibold text-slate-400 mb-3">{isSpanish ? 'Historial de Pruebas' : 'Test History'}</h4>
                      <div className="space-y-2">
                        {apiTestResults.map((result, idx) => (
                          <div key={idx} className="flex items-center justify-between p-2 bg-slate-900/50 rounded-lg text-sm">
                            <div className="flex items-center gap-3">
                              <span className={result.status === 'success' ? 'text-emerald-400' : 'text-red-400'}>
                                {result.status === 'success' ? <CheckCircle className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
                              </span>
                              <span className="font-mono text-slate-300">{result.endpoint}</span>
                            </div>
                            <div className="flex items-center gap-4">
                              <span className={'px-2 py-0.5 rounded text-xs font-bold ' + (result.statusCode === 200 ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400')}>
                                {result.statusCode}
                              </span>
                              <span className="text-slate-500 text-xs">{result.responseTime}ms</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {/* Empty State */}
                  {!selectedEndpoint && (
                    <div className="bg-slate-800/50 rounded-xl p-12 border border-slate-700 text-center">
                      <Terminal className="w-16 h-16 text-slate-600 mx-auto mb-4" />
                      <h3 className="text-lg font-semibold text-slate-400 mb-2">
                        {isSpanish ? 'Selecciona un Endpoint' : 'Select an Endpoint'}
                      </h3>
                      <p className="text-slate-500 text-sm">
                        {isSpanish ? 'Elige un endpoint de la lista para probarlo' : 'Choose an endpoint from the list to test it'}
                      </p>
                    </div>
                  )}
                </div>
              </div>
              
              {/* API Info Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-slate-800/50 rounded-xl p-5 border border-slate-700">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="p-2 bg-emerald-500/20 rounded-lg">
                      <Zap className="w-5 h-5 text-emerald-400" />
                    </div>
                    <span className="text-slate-400">{isSpanish ? 'Rate Limits' : 'Rate Limits'}</span>
                  </div>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between"><span className="text-slate-400">Public:</span><span>{VEGA_API_CONFIG.RATE_LIMITS.PUBLIC}</span></div>
                    <div className="flex justify-between"><span className="text-slate-400">Auth:</span><span>{VEGA_API_CONFIG.RATE_LIMITS.AUTHENTICATED}</span></div>
                    <div className="flex justify-between"><span className="text-slate-400">Orders:</span><span>{VEGA_API_CONFIG.RATE_LIMITS.ORDERS}</span></div>
                  </div>
                </div>
                
                <div className="bg-slate-800/50 rounded-xl p-5 border border-slate-700">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="p-2 bg-blue-500/20 rounded-lg">
                      <Coins className="w-5 h-5 text-blue-400" />
                    </div>
                    <span className="text-slate-400">{isSpanish ? 'Monedas Soportadas' : 'Supported Currencies'}</span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {VEGA_API_CONFIG.CURRENCIES.map(cur => (
                      <span key={cur} className="px-2 py-1 bg-slate-900 rounded text-xs font-mono">{cur}</span>
                    ))}
                  </div>
                </div>
                
                <div className="bg-slate-800/50 rounded-xl p-5 border border-slate-700">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="p-2 bg-purple-500/20 rounded-lg">
                      <Bell className="w-5 h-5 text-purple-400" />
                    </div>
                    <span className="text-slate-400">{isSpanish ? 'Eventos Webhook' : 'Webhook Events'}</span>
                  </div>
                  <div className="text-2xl font-bold text-purple-400">{VEGA_API_CONFIG.WEBHOOK_EVENTS.length}</div>
                  <div className="text-xs text-slate-500">{isSpanish ? 'tipos de eventos disponibles' : 'event types available'}</div>
                </div>
              </div>
            </div>
          )}
          
          {/* Settings */}
          {activeTab === 'settings' && (
            <div className="max-w-3xl mx-auto space-y-6">
              <div className="bg-slate-800/50 rounded-xl p-6 border border-slate-700">
                <h3 className="text-lg font-bold text-cyan-400 mb-4 flex items-center gap-2"><Power className="w-5 h-5" />{isSpanish ? 'Modo de Operacion' : 'Operation Mode'}</h3>
                <div className="flex gap-4 mb-4">
                  <button onClick={() => handleModeChange('sandbox')} className={'flex-1 py-4 px-4 rounded-xl font-medium transition-all flex items-center justify-center gap-3 ' + (operationMode === 'sandbox' ? 'bg-yellow-500/20 border-2 border-yellow-500 text-yellow-400' : 'bg-slate-900 border border-slate-600 text-slate-400 hover:border-slate-500')}><FlaskConical className="w-6 h-6" /><div className="text-left"><div className="font-bold">Sandbox</div><div className="text-xs opacity-70">{isSpanish ? 'Datos simulados' : 'Simulated data'}</div></div></button>
                  <button onClick={() => handleModeChange('real')} className={'flex-1 py-4 px-4 rounded-xl font-medium transition-all flex items-center justify-center gap-3 ' + (operationMode === 'real' ? 'bg-emerald-500/20 border-2 border-emerald-500 text-emerald-400' : 'bg-slate-900 border border-slate-600 text-slate-400 hover:border-slate-500')}><Power className="w-6 h-6" /><div className="text-left"><div className="font-bold">Real</div><div className="text-xs opacity-70">{isSpanish ? 'Datos reales desde 0' : 'Real data from 0'}</div></div></button>
                </div>
                <div className={'p-4 rounded-xl ' + (operationMode === 'real' ? 'bg-emerald-900/30 border border-emerald-500/30' : 'bg-yellow-900/30 border border-yellow-500/30')}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">{operationMode === 'real' ? <Play className="w-5 h-5 text-emerald-400" /> : <FlaskConical className="w-5 h-5 text-yellow-400" />}<div><div className={'font-bold ' + (operationMode === 'real' ? 'text-emerald-400' : 'text-yellow-400')}>{operationMode === 'real' ? (isSpanish ? 'Modo Real Activo' : 'Real Mode Active') : (isSpanish ? 'Modo Sandbox Activo' : 'Sandbox Mode Active')}</div><div className="text-xs text-slate-400">{operationMode === 'real' ? (isSpanish ? 'Los cambios son persistentes' : 'Changes are persistent') : (isSpanish ? 'Los datos son de demostracion' : 'Data is for demonstration')}</div></div></div>
                    {operationMode === 'real' && (<button onClick={resetRealModeData} className="px-4 py-2 bg-red-500/20 text-red-400 hover:bg-red-500/30 rounded-lg text-sm font-medium transition-colors border border-red-500/30">{isSpanish ? 'Reiniciar Datos' : 'Reset Data'}</button>)}
                  </div>
                </div>
              </div>
              <div className="bg-slate-800/50 rounded-xl p-6 border border-slate-700">
                <h3 className="text-lg font-bold text-emerald-400 mb-4 flex items-center gap-2"><Server className="w-5 h-5" />{isSpanish ? 'Entorno API' : 'API Environment'}</h3>
                <div className="flex gap-4 mb-4">
                  <button onClick={() => handleEnvironmentChange('development')} className={'flex-1 py-3 px-4 rounded-lg font-medium transition-all ' + (vegaEnvironment === 'development' ? 'bg-yellow-500/20 border-2 border-yellow-500 text-yellow-400' : 'bg-slate-900 border border-slate-600 text-slate-400 hover:border-slate-500')}>
                    <TestTube2 className="w-5 h-5 inline mr-2" />Development
                  </button>
                  <button onClick={() => handleEnvironmentChange('production')} className={'flex-1 py-3 px-4 rounded-lg font-medium transition-all ' + (vegaEnvironment === 'production' ? 'bg-emerald-500/20 border-2 border-emerald-500 text-emerald-400' : 'bg-slate-900 border border-slate-600 text-slate-400 hover:border-slate-500')}>
                    <Server className="w-5 h-5 inline mr-2" />Production
                  </button>
                </div>
                <div className="bg-slate-900/50 rounded-lg p-4 border border-slate-700">
                  <div className="flex items-center gap-3 mb-2">
                    <Globe className="w-5 h-5 text-cyan-400" />
                    <span className="text-sm text-slate-400">Base URL:</span>
                  </div>
                  <code className="text-cyan-400 font-mono text-sm">{apiConfig.base_url}</code>
                </div>
              </div>
              <div className="bg-slate-800/50 rounded-xl p-6 border border-slate-700">
                <div className="flex items-center justify-between mb-4"><h3 className="text-lg font-bold text-cyan-400 flex items-center gap-2"><Key className="w-5 h-5" />API Keys</h3><button onClick={() => setShowSecrets(!showSecrets)} className="text-slate-400 hover:text-white transition-colors flex items-center gap-2">{showSecrets ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}{showSecrets ? (isSpanish ? 'Ocultar' : 'Hide') : (isSpanish ? 'Mostrar' : 'Show')}</button></div>
                <div className="space-y-4">
                  <div><label className="block text-sm font-medium text-slate-300 mb-2">API Key</label><div className="flex gap-2"><input type={showSecrets ? 'text' : 'password'} value={apiConfig.api_key} readOnly className="flex-1 p-3 bg-slate-900 border border-slate-600 rounded-lg text-white font-mono text-sm" /><button onClick={() => copyToClipboard(apiConfig.api_key)} className="p-3 bg-slate-900 border border-slate-600 rounded-lg hover:border-cyan-500 transition-colors"><Copy className="w-5 h-5" /></button></div></div>
                  <div><label className="block text-sm font-medium text-slate-300 mb-2">API Secret</label><div className="flex gap-2"><input type={showSecrets ? 'text' : 'password'} value={apiConfig.api_secret} readOnly className="flex-1 p-3 bg-slate-900 border border-slate-600 rounded-lg text-white font-mono text-sm" /><button onClick={() => copyToClipboard(apiConfig.api_secret)} className="p-3 bg-slate-900 border border-slate-600 rounded-lg hover:border-cyan-500 transition-colors"><Copy className="w-5 h-5" /></button></div></div>
                  <div><label className="block text-sm font-medium text-slate-300 mb-2">Webhook Secret</label><div className="flex gap-2"><input type={showSecrets ? 'text' : 'password'} value={apiConfig.webhook_secret} readOnly className="flex-1 p-3 bg-slate-900 border border-slate-600 rounded-lg text-white font-mono text-sm" /><button onClick={() => copyToClipboard(apiConfig.webhook_secret)} className="p-3 bg-slate-900 border border-slate-600 rounded-lg hover:border-cyan-500 transition-colors"><Copy className="w-5 h-5" /></button></div></div>
                </div>
              </div>
              <div className="bg-slate-800/50 rounded-xl p-6 border border-slate-700">
                <h3 className="text-lg font-bold text-purple-400 mb-4 flex items-center gap-2"><Shield className="w-5 h-5" />{isSpanish ? 'Seguridad' : 'Security'}</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex items-center gap-3 p-3 bg-slate-900/50 rounded-lg"><CheckCircle className="w-5 h-5 text-emerald-400" /><span className="text-sm">HMAC-SHA256 Authentication</span></div>
                  <div className="flex items-center gap-3 p-3 bg-slate-900/50 rounded-lg"><CheckCircle className="w-5 h-5 text-emerald-400" /><span className="text-sm">TLS 1.3 Encryption</span></div>
                  <div className="flex items-center gap-3 p-3 bg-slate-900/50 rounded-lg"><CheckCircle className="w-5 h-5 text-emerald-400" /><span className="text-sm">Replay Protection (5min TTL)</span></div>
                  <div className="flex items-center gap-3 p-3 bg-slate-900/50 rounded-lg"><CheckCircle className="w-5 h-5 text-emerald-400" /><span className="text-sm">Idempotency Keys (7 day TTL)</span></div>
                </div>
              </div>
              <div className="bg-slate-800/50 rounded-xl p-6 border border-slate-700">
                <h3 className="text-lg font-bold text-blue-400 mb-4 flex items-center gap-2"><FileText className="w-5 h-5" />{isSpanish ? 'Cumplimiento' : 'Compliance'}</h3>
                <div className="flex flex-wrap gap-3">
                  <span className="px-4 py-2 bg-blue-500/20 text-blue-400 rounded-full text-sm font-medium">SOC 2 Type II</span>
                  <span className="px-4 py-2 bg-purple-500/20 text-purple-400 rounded-full text-sm font-medium">ISO 27001</span>
                  <span className="px-4 py-2 bg-emerald-500/20 text-emerald-400 rounded-full text-sm font-medium">PCI DSS Level 1</span>
                  <span className="px-4 py-2 bg-yellow-500/20 text-yellow-400 rounded-full text-sm font-medium">FINCEN BSA/AML</span>
                </div>
              </div>
              <div className="bg-gradient-to-r from-cyan-900/30 to-blue-900/30 rounded-xl p-6 border border-cyan-500/30">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4"><div className="p-3 bg-cyan-500/20 rounded-lg"><BookOpen className="w-6 h-6 text-cyan-400" /></div><div><h4 className="font-bold text-white">{isSpanish ? 'Documentacion API' : 'API Documentation'}</h4><p className="text-sm text-slate-400">{isSpanish ? 'Guia completa de integracion' : 'Complete integration guide'}</p></div></div>
                  <button className="flex items-center gap-2 px-4 py-2 bg-cyan-600 hover:bg-cyan-700 rounded-lg font-medium transition-colors"><ExternalLink className="w-4 h-4" />{isSpanish ? 'Ver Docs' : 'View Docs'}</button>
                </div>
              </div>
            </div>
          )}
        </>
      )}
      {/* Loading State */}
      {loading && (
        <div className="flex items-center justify-center py-20">
          <div className="text-center">
            <Loader className="w-12 h-12 animate-spin text-cyan-400 mx-auto mb-4" />
            <p className="text-slate-400">{isSpanish ? 'Cargando datos...' : 'Loading data...'}</p>
          </div>
        </div>
      )}
      
      {/* Footer */}
      <div className="mt-8 pt-4 border-t border-slate-800 text-center text-xs text-slate-500">
        API VEGA v1.0 - {isSpanish ? 'Plataforma Institucional de Grado Bancario' : 'Bank-Grade Institutional Platform'} - 
        <span className="text-cyan-400 ml-1">github.com/brahim-cherifi/api-vegadev</span>
      </div>
    </div>
  );
}

export default VegaAPIModule;
