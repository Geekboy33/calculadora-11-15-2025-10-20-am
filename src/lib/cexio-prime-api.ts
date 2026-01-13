/**
 * CEX.io Prime API Client - Professional Integration
 * 
 * Endpoints:
 * - REST API: https://prime.cex.io/api/rest
 * - Public API: https://prime.cex.io/api/rest-public
 * 
 * Features:
 * - HMAC-SHA256 Authentication
 * - Balance tracking
 * - Trading (spot/margin)
 * - Deposits/Withdrawals
 * - Order management
 * - Transaction history
 */

import CryptoJS from 'crypto-js';

// ═══════════════════════════════════════════════════════════════════════════
// TIPOS E INTERFACES
// ═══════════════════════════════════════════════════════════════════════════

export interface CEXioConfig {
  apiKey: string;
  apiSecret: string;
  isConfigured: boolean;
  environment: 'production' | 'sandbox';
}

export interface CEXioBalance {
  currency: string;
  available: string;
  reserved: string;
  total: string;
}

export interface CEXioAccount {
  id: string;
  type: 'spot' | 'margin' | 'funding';
  balances: CEXioBalance[];
  marginLevel?: string;
  equity?: string;
}

export interface CEXioOrder {
  orderId: string;
  clientOrderId?: string;
  symbol: string;
  side: 'buy' | 'sell';
  type: 'market' | 'limit' | 'stop' | 'stopLimit';
  price?: string;
  stopPrice?: string;
  amount: string;
  filledAmount: string;
  remainingAmount: string;
  status: 'pending' | 'open' | 'partially_filled' | 'filled' | 'cancelled' | 'rejected';
  fee?: string;
  feeCurrency?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface CEXioTrade {
  tradeId: string;
  orderId: string;
  symbol: string;
  side: 'buy' | 'sell';
  price: string;
  amount: string;
  fee: string;
  feeCurrency: string;
  timestamp: string;
}

export interface CEXioWithdrawal {
  withdrawalId: string;
  currency: string;
  amount: string;
  fee: string;
  address: string;
  network?: string;
  txId?: string;
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled';
  createdAt: string;
}

export interface CEXioDeposit {
  depositId: string;
  currency: string;
  amount: string;
  address: string;
  network?: string;
  txId?: string;
  confirmations: number;
  requiredConfirmations: number;
  status: 'pending' | 'confirmed' | 'completed';
  createdAt: string;
}

export interface CEXioTicker {
  symbol: string;
  bid: string;
  ask: string;
  last: string;
  volume24h: string;
  change24h: string;
  high24h: string;
  low24h: string;
  timestamp: string;
}

export interface CEXioCurrency {
  currency: string;
  name: string;
  precision: number;
  minWithdrawal: string;
  maxWithdrawal: string;
  withdrawalFee: string;
  depositEnabled: boolean;
  withdrawalEnabled: boolean;
  networks: string[];
}

export interface CEXioSymbol {
  symbol: string;
  baseCurrency: string;
  quoteCurrency: string;
  minOrderSize: string;
  maxOrderSize: string;
  pricePrecision: number;
  amountPrecision: number;
  status: 'active' | 'suspended';
}

export interface CEXioTransaction {
  id: string;
  type: 'deposit' | 'withdrawal' | 'trade' | 'transfer' | 'fee' | 'rebate';
  currency: string;
  amount: string;
  fee?: string;
  balance: string;
  reference?: string;
  description: string;
  status: string;
  timestamp: string;
}

export interface CEXioConversion {
  conversionId: string;
  fromCurrency: string;
  toCurrency: string;
  fromAmount: string;
  toAmount: string;
  rate: string;
  fee: string;
  status: 'pending' | 'completed' | 'failed';
  createdAt: string;
}

export interface FlowOperation {
  id: string;
  type: 'balance' | 'order' | 'trade' | 'withdrawal' | 'deposit' | 'conversion' | 'transfer';
  status: 'pending' | 'success' | 'failed' | 'processing';
  data: any;
  message: string;
  timestamp: string;
}

// ═══════════════════════════════════════════════════════════════════════════
// CONSTANTES
// ═══════════════════════════════════════════════════════════════════════════

const STORAGE_KEY = 'cexio_prime_config';
const EVENTS_KEY = 'cexio_prime_events';
const BALANCES_KEY = 'cexio_prime_balances';

const DEFAULT_CONFIG: CEXioConfig = {
  apiKey: '',
  apiSecret: '',
  isConfigured: false,
  environment: 'production'
};

// ═══════════════════════════════════════════════════════════════════════════
// CLIENTE CEX.io PRIME
// ═══════════════════════════════════════════════════════════════════════════

class CEXioPrimeClient {
  private config: CEXioConfig;
  private events: FlowOperation[] = [];
  private balances: CEXioBalance[] = [];

  constructor() {
    this.config = this.loadConfig();
    this.events = this.loadEvents();
    this.balances = this.loadBalances();
  }

  // ─────────────────────────────────────────────────────────────────────────
  // CONFIGURACIÓN Y PERSISTENCIA
  // ─────────────────────────────────────────────────────────────────────────

  private loadConfig(): CEXioConfig {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        return { ...DEFAULT_CONFIG, ...JSON.parse(saved) };
      }
    } catch (e) {
      console.error('[CEX.io Prime] Error loading config:', e);
    }
    return { ...DEFAULT_CONFIG };
  }

  private saveConfig(): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.config));
    } catch (e) {
      console.error('[CEX.io Prime] Error saving config:', e);
    }
  }

  private loadEvents(): FlowOperation[] {
    try {
      const saved = localStorage.getItem(EVENTS_KEY);
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.error('[CEX.io Prime] Error loading events:', e);
    }
    return [];
  }

  private saveEvents(): void {
    try {
      // Mantener solo los últimos 100 eventos
      const toSave = this.events.slice(-100);
      localStorage.setItem(EVENTS_KEY, JSON.stringify(toSave));
    } catch (e) {
      console.error('[CEX.io Prime] Error saving events:', e);
    }
  }

  private loadBalances(): CEXioBalance[] {
    // En modo LIVE, siempre empezar con balances vacíos
    // Los balances reales se obtienen del backend
    return [];
  }
  
  clearBalances(): void {
    this.balances = [];
    this.saveBalances();
  }

  private saveBalances(): void {
    try {
      localStorage.setItem(BALANCES_KEY, JSON.stringify(this.balances));
    } catch (e) {
      console.error('[CEX.io Prime] Error saving balances:', e);
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // AUTENTICACIÓN HMAC-SHA256
  // ─────────────────────────────────────────────────────────────────────────

  generateSignature(timestamp: string, method: string, path: string, body: string = ''): string {
    const message = timestamp + method.toUpperCase() + path + body;
    return CryptoJS.HmacSHA256(message, this.config.apiSecret).toString(CryptoJS.enc.Hex);
  }

  getAuthHeaders(method: string, path: string, body: string = ''): Record<string, string> {
    const timestamp = Date.now().toString();
    const signature = this.generateSignature(timestamp, method, path, body);
    
    return {
      'Content-Type': 'application/json',
      'X-CEX-APIKEY': this.config.apiKey,
      'X-CEX-SIGNATURE': signature,
      'X-CEX-TIMESTAMP': timestamp
    };
  }

  // ─────────────────────────────────────────────────────────────────────────
  // CONFIGURACIÓN PÚBLICA
  // ─────────────────────────────────────────────────────────────────────────

  getConfig(): CEXioConfig {
    return { ...this.config };
  }

  setConfig(apiKey: string, apiSecret: string, environment: 'production' | 'sandbox' = 'production'): void {
    this.config = {
      apiKey,
      apiSecret,
      isConfigured: !!(apiKey && apiSecret),
      environment
    };
    this.saveConfig();
    this.addEvent({
      id: `cfg-${Date.now()}`,
      type: 'balance',
      status: 'success',
      data: { configured: this.config.isConfigured },
      message: 'Configuración actualizada',
      timestamp: new Date().toISOString()
    });
  }

  clearConfig(): void {
    this.config = { ...DEFAULT_CONFIG };
    this.saveConfig();
  }

  // ─────────────────────────────────────────────────────────────────────────
  // EVENTOS
  // ─────────────────────────────────────────────────────────────────────────

  addEvent(event: FlowOperation): void {
    this.events.push(event);
    this.saveEvents();
  }

  getEvents(): FlowOperation[] {
    return [...this.events];
  }

  clearEvents(): void {
    this.events = [];
    this.saveEvents();
  }

  // ─────────────────────────────────────────────────────────────────────────
  // BALANCES
  // ─────────────────────────────────────────────────────────────────────────

  getBalances(): CEXioBalance[] {
    return [...this.balances];
  }

  setBalances(balances: CEXioBalance[]): void {
    this.balances = balances;
    this.saveBalances();
  }

  updateBalance(currency: string, available: string, reserved: string): void {
    const total = (parseFloat(available) + parseFloat(reserved)).toString();
    const index = this.balances.findIndex(b => b.currency === currency);
    
    if (index >= 0) {
      this.balances[index] = { currency, available, reserved, total };
    } else {
      this.balances.push({ currency, available, reserved, total });
    }
    this.saveBalances();
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// INSTANCIA SINGLETON
// ═══════════════════════════════════════════════════════════════════════════

export const cexioPrimeClient = new CEXioPrimeClient();

// ═══════════════════════════════════════════════════════════════════════════
// FUNCIONES DE UTILIDAD
// ═══════════════════════════════════════════════════════════════════════════

export function formatCurrency(amount: string | number, decimals: number = 8): string {
  const num = typeof amount === 'string' ? parseFloat(amount) : amount;
  if (isNaN(num)) return '0.00';
  
  if (num >= 1000000) {
    return (num / 1000000).toFixed(2) + 'M';
  } else if (num >= 1000) {
    return (num / 1000).toFixed(2) + 'K';
  }
  return num.toFixed(decimals);
}

export function formatUSD(amount: string | number): string {
  const num = typeof amount === 'string' ? parseFloat(amount) : amount;
  if (isNaN(num)) return '$0.00';
  return '$' + num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function getStatusColor(status: string): string {
  switch (status.toLowerCase()) {
    case 'completed':
    case 'filled':
    case 'success':
    case 'confirmed':
      return 'text-emerald-400';
    case 'pending':
    case 'open':
    case 'processing':
      return 'text-yellow-400';
    case 'failed':
    case 'cancelled':
    case 'rejected':
      return 'text-red-400';
    case 'partially_filled':
      return 'text-cyan-400';
    default:
      return 'text-gray-400';
  }
}

export function getStatusBadgeClass(status: string): string {
  switch (status.toLowerCase()) {
    case 'completed':
    case 'filled':
    case 'success':
    case 'confirmed':
      return 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30';
    case 'pending':
    case 'open':
    case 'processing':
      return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
    case 'failed':
    case 'cancelled':
    case 'rejected':
      return 'bg-red-500/20 text-red-400 border-red-500/30';
    case 'partially_filled':
      return 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30';
    default:
      return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
  }
}

// Tipos de red soportados
export const SUPPORTED_NETWORKS = [
  { id: 'ETH', name: 'Ethereum (ERC-20)', fee: '0.001' },
  { id: 'TRX', name: 'Tron (TRC-20)', fee: '1.0' },
  { id: 'BSC', name: 'BNB Smart Chain (BEP-20)', fee: '0.0005' },
  { id: 'MATIC', name: 'Polygon', fee: '0.1' },
  { id: 'ARB', name: 'Arbitrum One', fee: '0.0001' },
  { id: 'OP', name: 'Optimism', fee: '0.0001' },
  { id: 'AVAX', name: 'Avalanche C-Chain', fee: '0.01' },
  { id: 'SOL', name: 'Solana', fee: '0.00001' }
];

// Pares de trading populares
export const POPULAR_PAIRS = [
  'BTC/USD', 'ETH/USD', 'BTC/EUR', 'ETH/EUR',
  'BTC/USDT', 'ETH/USDT', 'XRP/USD', 'SOL/USD',
  'MATIC/USD', 'AVAX/USD', 'LTC/USD', 'ADA/USD'
];

export default cexioPrimeClient;



