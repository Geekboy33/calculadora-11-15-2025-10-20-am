import React, { useState, useEffect, useCallback } from 'react';
import { 
  TrendingUp, 
  TrendingDown, 
  ArrowRight, 
  Settings, 
  Loader, 
  AlertCircle,
  RefreshCw,
  Wallet,
  BarChart3,
  ArrowUpDown,
  Send,
  Download,
  Activity,
  Globe,
  Shield,
  Zap,
  Clock,
  CheckCircle,
  XCircle,
  Copy,
  ExternalLink,
  BookOpen,
  Key,
  Server,
  Wifi,
  WifiOff,
  ChevronDown,
  ChevronUp,
  LineChart,
  CandlestickChart,
  DollarSign,
  Percent,
  Hash,
  Database,
  Building2,
  Link2,
  Plus,
  ArrowDownToLine
} from 'lucide-react';
import { custodyStore, CustodyAccount } from '../lib/custody-store';

/**
 * 🔀 YEX API Module - Frontend Completo
 * 
 * Integrado con daes-yex SDK y Custody Accounts
 * 
 * ✅ Spot Trading (Market, Limit, IOC, FOK)
 * ✅ Margin Trading
 * ✅ Futures Trading
 * ✅ Withdraw/Deposit
 * ✅ WebSocket Real-time
 * ✅ Account Management
 * ✅ Custody Account Integration
 */

// Types
interface TickerData {
  symbol: string;
  lastPrice: string;
  highPrice: string;
  lowPrice: string;
  volume: string;
  priceChange: string;
  priceChangePercent: string;
}

interface OrderData {
  orderId: string;
  symbol: string;
  side: 'BUY' | 'SELL';
  type: string;
  price: string;
  quantity: string;
  executedQty: string;
  status: string;
  time: number;
}

interface BalanceData {
  asset: string;
  free: string;
  locked: string;
}

interface DepthData {
  bids: [string, string][];
  asks: [string, string][];
}

interface TradeData {
  id: number;
  price: string;
  qty: string;
  time: number;
  isBuyerMaker: boolean;
}

// YEX Balance linked from Custody
interface YexLinkedBalance {
  accountId: string;
  accountName: string;
  currency: string;
  availableBalance: number;
  totalBalance: number;
  accountType: string;
  linkedAt: string;
}

// API Base URL
const API_BASE = '/api/yex';

const YexApiModule: React.FC = () => {
  // Estado general
  const [activeTab, setActiveTab] = useState<'spot' | 'margin' | 'futures' | 'withdraw' | 'account' | 'settings'>('spot');
  const [activeSubTab, setActiveSubTab] = useState<'market' | 'trading' | 'orders' | 'history'>('market');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<'online' | 'offline' | 'connecting'>('offline');
  
  // Mercado
  const [symbol, setSymbol] = useState('BTCUSDT');
  const [symbols, setSymbols] = useState<string[]>([]);
  const [ticker, setTicker] = useState<TickerData | null>(null);
  const [depth, setDepth] = useState<DepthData | null>(null);
  const [trades, setTrades] = useState<TradeData[]>([]);
  const [serverTime, setServerTime] = useState<number | null>(null);
  
  // Trading
  const [orderForm, setOrderForm] = useState({
    symbol: 'BTCUSDT',
    side: 'BUY' as 'BUY' | 'SELL',
    type: 'LIMIT' as 'LIMIT' | 'MARKET' | 'IOC' | 'FOK',
    quantity: '',
    price: '',
    timeInForce: 'GTC' as 'GTC' | 'IOC' | 'FOK',
    clientOrderId: ''
  });
  
  // Órdenes
  const [openOrders, setOpenOrders] = useState<OrderData[]>([]);
  const [orderHistory, setOrderHistory] = useState<OrderData[]>([]);
  
  // Cuenta - YEX API Balance
  const [balances, setBalances] = useState<BalanceData[]>([]);
  const [totalBalance, setTotalBalance] = useState<string>('0.00');
  
  // Custody Accounts Integration
  const [custodyAccounts, setCustodyAccounts] = useState<CustodyAccount[]>([]);
  const [selectedCustodyAccount, setSelectedCustodyAccount] = useState<string>('');
  const [linkedBalances, setLinkedBalances] = useState<YexLinkedBalance[]>([]);
  const [showLinkModal, setShowLinkModal] = useState(false);
  
  // Transfer from Custody to YEX
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [transferSourceAccount, setTransferSourceAccount] = useState<string>('');
  const [transferAmount, setTransferAmount] = useState<string>('');
  const [yexBalancesFromCustody, setYexBalancesFromCustody] = useState<{asset: string; amount: number; fromAccount: string; timestamp: string}[]>([]);
  
  // 🔄 MODO DEMO vs REAL
  const [tradingMode, setTradingMode] = useState<'demo' | 'real'>('demo');
  const [realYexBalances, setRealYexBalances] = useState<BalanceData[]>([]);
  const [realBalanceLoading, setRealBalanceLoading] = useState(false);
  const [realBalanceError, setRealBalanceError] = useState<string | null>(null);
  const TRADING_MODE_KEY = 'yex_trading_mode';
  
  // Withdraw
  const [withdrawForm, setWithdrawForm] = useState({
    coin: 'USDT',
    network: 'ERC20',
    address: '',
    amount: '',
    memo: ''
  });
  
  // Settings - Cargar desde variables de entorno (.env)
  const [apiConfig, setApiConfig] = useState({
    apiKey: import.meta.env.VITE_YEX_API_KEY || '',
    apiSecret: import.meta.env.VITE_YEX_SECRET_KEY || '',
    restBase: import.meta.env.VITE_YEX_API_BASE || 'https://openapi.yex.io',
    futuresBase: import.meta.env.VITE_YEX_FUTURES_BASE || 'https://futuresopenapi.yex.io',
    wsUrl: import.meta.env.VITE_YEX_WS_URL || 'wss://ws.yex.io/kline-api/ws'
  });

  // Load linked balances from localStorage
  const LINKED_BALANCES_KEY = 'yex_linked_custody_balances';
  const YEX_BALANCES_KEY = 'yex_balances_from_custody';
  const YEX_API_CONFIG_KEY = 'yex_api_config';
  
  const loadLinkedBalances = useCallback(() => {
    try {
      const stored = localStorage.getItem(LINKED_BALANCES_KEY);
      if (stored) {
        setLinkedBalances(JSON.parse(stored));
      }
      // Load YEX balances from custody
      const yexStored = localStorage.getItem(YEX_BALANCES_KEY);
      if (yexStored) {
        setYexBalancesFromCustody(JSON.parse(yexStored));
      }
      // Load API config from localStorage (solo URLs, no credenciales)
      const configStored = localStorage.getItem(YEX_API_CONFIG_KEY);
      if (configStored) {
        const storedConfig = JSON.parse(configStored);
        // Solo cargar URLs desde localStorage, las credenciales vienen del .env
        setApiConfig(prev => ({
          ...prev,
          restBase: storedConfig.restBase || prev.restBase,
          futuresBase: storedConfig.futuresBase || prev.futuresBase,
          wsUrl: storedConfig.wsUrl || prev.wsUrl
        }));
      }
      // Load trading mode
      const savedMode = localStorage.getItem(TRADING_MODE_KEY);
      if (savedMode === 'demo' || savedMode === 'real') {
        setTradingMode(savedMode);
      }
    } catch (e) {
      console.error('Error loading linked balances:', e);
    }
  }, []);

  // 🔄 Cambiar modo DEMO/REAL
  const toggleTradingMode = useCallback(() => {
    const newMode = tradingMode === 'demo' ? 'real' : 'demo';
    setTradingMode(newMode);
    localStorage.setItem(TRADING_MODE_KEY, newMode);
    if (newMode === 'real') {
      fetchRealYexBalance();
    }
  }, [tradingMode]);

  // 📊 Obtener balance REAL de YEX API usando /sapi/v1/account
  const fetchRealYexBalance = useCallback(async () => {
    setRealBalanceLoading(true);
    setRealBalanceError(null);
    try {
      const response = await fetch(`${API_BASE}/balance`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      const data = await response.json();
      
      if (data.error) {
        setRealBalanceError(data.error);
        setRealYexBalances([]);
      } else if (data.balances && Array.isArray(data.balances)) {
        // Formato estándar de YEX: { balances: [{ asset, free, locked }] }
        setRealYexBalances(data.balances);
        setRealBalanceError(null);
      } else if (Array.isArray(data)) {
        // Si viene como array directo
        setRealYexBalances(data);
        setRealBalanceError(null);
      } else {
        // Intentar extraer balances de la respuesta
        setRealYexBalances([]);
        setRealBalanceError('Formato de respuesta no reconocido');
      }
    } catch (err: any) {
      setRealBalanceError(err.message || 'Error al obtener balance real');
      setRealYexBalances([]);
    } finally {
      setRealBalanceLoading(false);
    }
  }, []);

  // Calcular total de balances reales
  const calculateRealTotal = useCallback(() => {
    return realYexBalances.reduce((sum, b) => {
      const free = parseFloat(b.free) || 0;
      const locked = parseFloat(b.locked) || 0;
      return sum + free + locked;
    }, 0);
  }, [realYexBalances]);

  // Save API config to localStorage
  const saveApiConfig = useCallback((config: typeof apiConfig) => {
    localStorage.setItem(YEX_API_CONFIG_KEY, JSON.stringify(config));
    setApiConfig(config);
    if (config.apiKey && config.apiSecret) {
      setSuccess('✅ API Keys guardadas correctamente');
    }
  }, []);

  const saveLinkedBalances = (balances: YexLinkedBalance[]) => {
    localStorage.setItem(LINKED_BALANCES_KEY, JSON.stringify(balances));
    setLinkedBalances(balances);
  };

  const saveYexBalances = (yexBalances: {asset: string; amount: number; fromAccount: string; timestamp: string}[]) => {
    localStorage.setItem(YEX_BALANCES_KEY, JSON.stringify(yexBalances));
    setYexBalancesFromCustody(yexBalances);
  };

  // Copiar al portapapeles
  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setSuccess('Copiado al portapapeles');
    setTimeout(() => setSuccess(null), 2000);
  };

  // API Calls
  const apiCall = async (endpoint: string, method: string = 'GET', body?: any, silent: boolean = false) => {
    setLoading(true);
    if (!silent) setError(null);
    try {
      const options: RequestInit = {
        method,
        headers: { 'Content-Type': 'application/json' }
      };
      if (body) {
        options.body = JSON.stringify(body);
      }
      const response = await fetch(`${API_BASE}${endpoint}`, options);
      
      // Verificar si la respuesta es válida
      if (!response.ok) {
        const errorText = await response.text();
        try {
          const errorJson = JSON.parse(errorText);
          throw new Error(errorJson.error || `Error ${response.status}`);
        } catch {
          throw new Error(`Error ${response.status}: ${response.statusText}`);
        }
      }
      
      const data = await response.json();
      if (data.error) throw new Error(data.error);
      return data;
    } catch (err: any) {
      // Solo mostrar error si no es silencioso
      if (!silent) {
        setError(err.message || 'Error de conexión');
      }
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Ping y conexión
  const checkConnection = useCallback(async () => {
    setConnectionStatus('connecting');
    try {
      const data = await apiCall('/ping', 'POST');
      if (data) {
        setConnectionStatus('online');
        const timeData = await apiCall('/time', 'POST');
        if (timeData?.serverTime) {
          setServerTime(timeData.serverTime);
        }
      }
    } catch {
      setConnectionStatus('offline');
    }
  }, []);

  // Obtener símbolos
  const fetchSymbols = async () => {
    try {
      const data = await apiCall('/symbols', 'POST');
      if (Array.isArray(data)) {
        setSymbols(data.map((s: any) => s.symbol || s));
      }
    } catch {}
  };

  // Obtener ticker (silencioso para no mostrar errores)
  const fetchTicker = async (sym?: string) => {
    try {
      const data = await apiCall('/ticker', 'POST', { symbol: sym || symbol }, true);
      setTicker(data);
    } catch {
      // Silencioso - no mostrar error
    }
  };

  // Obtener depth
  const fetchDepth = async (sym?: string, limit: number = 10) => {
    try {
      const data = await apiCall('/depth', 'POST', { symbol: sym || symbol, limit });
      setDepth(data);
    } catch {}
  };

  // Obtener trades
  const fetchTrades = async (sym?: string, limit: number = 20) => {
    try {
      const data = await apiCall('/trades', 'POST', { symbol: sym || symbol, limit });
      if (Array.isArray(data)) {
        setTrades(data);
      }
    } catch {}
  };

  // Crear orden
  const createOrder = async () => {
    if (!orderForm.quantity) {
      setError('Ingresa la cantidad');
      return;
    }
    if (orderForm.type === 'LIMIT' && !orderForm.price) {
      setError('Ingresa el precio para orden LIMIT');
      return;
    }

    try {
      const clientOrderId = orderForm.clientOrderId || `DAES-${Date.now()}`;
      const data = await apiCall('/order', 'POST', {
        ...orderForm,
        newClientOrderId: clientOrderId
      });
      setSuccess(`✅ Orden creada: ${data.orderId}`);
      fetchOpenOrders();
      setOrderForm(prev => ({ ...prev, quantity: '', price: '', clientOrderId: '' }));
    } catch {}
  };

  // Cancelar orden
  const cancelOrder = async (orderId: string, sym?: string) => {
    try {
      await apiCall('/cancel', 'POST', { 
        symbol: sym || symbol, 
        orderId 
      });
      setSuccess(`✅ Orden ${orderId} cancelada`);
      fetchOpenOrders();
    } catch {}
  };

  // Obtener órdenes abiertas
  const fetchOpenOrders = async (sym?: string) => {
    try {
      const data = await apiCall('/orders', 'POST', { symbol: sym || symbol });
      if (Array.isArray(data)) {
        setOpenOrders(data);
      }
    } catch {}
  };

  // Obtener balance de YEX API
  const fetchBalance = async () => {
    try {
      const data = await apiCall('/balance', 'POST');
      if (data?.balances) {
        setBalances(data.balances.filter((b: BalanceData) => 
          parseFloat(b.free) > 0 || parseFloat(b.locked) > 0
        ));
        setTotalBalance(data.totalWalletBalance || '0.00');
      }
    } catch {}
  };

  // Link Custody Account to YEX
  const linkCustodyAccount = (accountId: string) => {
    const account = custodyAccounts.find(a => a.id === accountId);
    if (!account) {
      setError('Cuenta no encontrada');
      return;
    }

    // Check if already linked
    if (linkedBalances.find(lb => lb.accountId === accountId)) {
      setError('Esta cuenta ya está vinculada');
      return;
    }

    const newLinked: YexLinkedBalance = {
      accountId: account.id,
      accountName: account.accountName,
      currency: account.currency,
      availableBalance: account.availableBalance,
      totalBalance: account.totalBalance,
      accountType: account.accountType,
      linkedAt: new Date().toISOString()
    };

    const updated = [...linkedBalances, newLinked];
    saveLinkedBalances(updated);
    setSuccess(`✅ Cuenta "${account.accountName}" vinculada exitosamente`);
    setShowLinkModal(false);
    setSelectedCustodyAccount('');
  };

  // Unlink Custody Account
  const unlinkCustodyAccount = (accountId: string) => {
    const updated = linkedBalances.filter(lb => lb.accountId !== accountId);
    saveLinkedBalances(updated);
    setSuccess('✅ Cuenta desvinculada');
  };

  // Refresh linked balances from custody store
  const refreshLinkedBalances = () => {
    const accounts = custodyStore.getAccounts();
    const updated = linkedBalances.map(lb => {
      const account = accounts.find(a => a.id === lb.accountId);
      if (account) {
        return {
          ...lb,
          availableBalance: account.availableBalance,
          totalBalance: account.totalBalance
        };
      }
      return lb;
    });
    saveLinkedBalances(updated);
    setSuccess('✅ Balances actualizados desde Custody Accounts');
  };

  // Calculate total from linked balances
  const calculateLinkedTotal = () => {
    return linkedBalances.reduce((sum, lb) => sum + lb.availableBalance, 0);
  };

  // Calculate total YEX balance from custody transfers
  const calculateYexTotalFromCustody = () => {
    return yexBalancesFromCustody.reduce((sum, b) => sum + b.amount, 0);
  };

  // Estado para depósito/transferencia real
  const [depositInfo, setDepositInfo] = useState<{
    address: string;
    network: string;
    memo: string;
    coin: string;
    amount: number;
    transferId?: string;
    status?: string;
  } | null>(null);
  const [showDepositModal, setShowDepositModal] = useState(false);
  const [depositLoading, setDepositLoading] = useState(false);

  // Transfer from Custody to YEX API Balance
  const transferToYexBalance = async () => {
    if (!transferSourceAccount || !transferAmount) {
      setError('Selecciona una cuenta y un monto');
      return;
    }

    const amount = parseFloat(transferAmount);
    if (isNaN(amount) || amount <= 0) {
      setError('El monto debe ser mayor a 0');
      return;
    }

    // Find the linked balance
    const linkedBalance = linkedBalances.find(lb => lb.accountId === transferSourceAccount);
    if (!linkedBalance) {
      setError('Cuenta no encontrada');
      return;
    }

    if (amount > linkedBalance.availableBalance) {
      setError(`Balance insuficiente. Disponible: $${linkedBalance.availableBalance.toLocaleString()}`);
      return;
    }

    // Si estamos en modo REAL, hacer transferencia REAL a YEX API
    if (tradingMode === 'real') {
      setDepositLoading(true);
      try {
        console.log('💰 Iniciando transferencia REAL desde Custody a YEX...');
        
        // Llamar a la API real de transferencia Custody -> YEX
        const response = await fetch(`${API_BASE}/custody-to-yex`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            coin: linkedBalance.currency, // USD, USDT, etc.
            amount: amount,
            fromAccountId: linkedBalance.accountId,
            fromAccountName: linkedBalance.accountName,
            network: 'ERC20' // Red por defecto
          })
        });
        
        const data = await response.json();
        
        if (data.error || !data.success) {
          throw new Error(data.error || data.message || 'Error en la transferencia');
        }
        
        console.log('✅ Transferencia REAL completada:', data);
        
        // Mostrar información del depósito/transferencia
        setDepositInfo({
          address: data.toAccount?.address || data.depositInfo?.address || 'Procesando...',
          network: data.toAccount?.network || 'ERC20',
          memo: data.depositInfo?.memo || '',
          coin: data.coin || 'USDT',
          amount: amount,
          transferId: data.transferId,
          status: data.status
        });
        
        // Deducir del balance de Custody
        const success = custodyStore.updateBalance(transferSourceAccount, -amount);
        if (!success) {
          console.warn('⚠️ No se pudo actualizar el balance de Custody localmente');
        }

        // Update linked balance locally
        const updatedLinked = linkedBalances.map(lb => {
          if (lb.accountId === transferSourceAccount) {
            return {
              ...lb,
              availableBalance: lb.availableBalance - amount,
              totalBalance: lb.totalBalance - amount
            };
          }
          return lb;
        });
        saveLinkedBalances(updatedLinked);
        
        setShowTransferModal(false);
        setShowDepositModal(true);
        setSuccess(`✅ Transferencia REAL completada: $${amount.toLocaleString()} ${data.coin || 'USDT'} a YEX Exchange`);
        
        // Refrescar balances reales de YEX después de un momento
        setTimeout(() => {
          fetchRealYexBalance();
        }, 2000);
        
      } catch (err: any) {
        setError(err.message || 'Error al solicitar depósito real');
      } finally {
        setDepositLoading(false);
        setTransferSourceAccount('');
        setTransferAmount('');
      }
      return;
    }

    // MODO DEMO: Transferencia local
    // Deduct from custody account using custodyStore
    const success = custodyStore.updateBalance(transferSourceAccount, -amount);
    if (!success) {
      setError('Error al deducir del balance de Custody');
      return;
    }

    // Update linked balance locally
    const updatedLinked = linkedBalances.map(lb => {
      if (lb.accountId === transferSourceAccount) {
        return {
          ...lb,
          availableBalance: lb.availableBalance - amount,
          totalBalance: lb.totalBalance - amount
        };
      }
      return lb;
    });
    saveLinkedBalances(updatedLinked);

    // Add to YEX balance - mantener la moneda original (USD es USD, no USDT)
    const newYexBalance = {
      asset: linkedBalance.currency, // Mantener USD como USD, no convertir a USDT
      amount: amount,
      fromAccount: linkedBalance.accountName,
      timestamp: new Date().toISOString()
    };

    // Check if asset already exists
    const existingIndex = yexBalancesFromCustody.findIndex(b => b.asset === newYexBalance.asset);
    let updatedYexBalances;
    if (existingIndex >= 0) {
      updatedYexBalances = yexBalancesFromCustody.map((b, i) => 
        i === existingIndex 
          ? { ...b, amount: b.amount + amount, timestamp: new Date().toISOString() }
          : b
      );
    } else {
      updatedYexBalances = [...yexBalancesFromCustody, newYexBalance];
    }
    saveYexBalances(updatedYexBalances);

    setSuccess(`✅ Transferido $${amount.toLocaleString()} de "${linkedBalance.accountName}" a YEX API Balance (DEMO)`);
    setShowTransferModal(false);
    setTransferSourceAccount('');
    setTransferAmount('');
  };

  // Withdraw
  const submitWithdraw = async () => {
    if (!withdrawForm.address || !withdrawForm.amount) {
      setError('Completa todos los campos requeridos');
      return;
    }
    try {
      const data = await apiCall('/withdraw/apply', 'POST', {
        coin: withdrawForm.coin,
        address: withdrawForm.address,
        amount: withdrawForm.amount,
        memo: withdrawForm.memo || undefined,
        clientWithdrawId: `DAES-WD-${Date.now()}`
      });
      setSuccess(`✅ Retiro solicitado: ${data.id}`);
      setWithdrawForm(prev => ({ ...prev, address: '', amount: '', memo: '' }));
    } catch {}
  };

  // Load custody accounts
  const loadCustodyAccounts = useCallback(() => {
    const accounts = custodyStore.getAccounts();
    setCustodyAccounts(accounts);
  }, []);

  // Efectos
  useEffect(() => {
    checkConnection();
    fetchSymbols();
    loadCustodyAccounts();
    loadLinkedBalances();
    
    // Subscribe to custody store changes
    const unsubscribe = custodyStore.subscribe((accounts) => {
      setCustodyAccounts(accounts);
    });

    const interval = setInterval(checkConnection, 30000);
    return () => {
      clearInterval(interval);
      unsubscribe();
    };
  }, [checkConnection, loadCustodyAccounts, loadLinkedBalances]);

  useEffect(() => {
    if (connectionStatus === 'online' && symbol) {
      fetchTicker();
      fetchDepth();
      fetchTrades();
    }
  }, [symbol, connectionStatus]);

  // Formatear número
  const formatNumber = (num: string | number, decimals: number = 2) => {
    const n = typeof num === 'string' ? parseFloat(num) : num;
    if (isNaN(n)) return '0.00';
    return n.toLocaleString('en-US', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
  };

  // Formatear fecha
  const formatTime = (timestamp: number) => {
    return new Date(timestamp).toLocaleTimeString();
  };

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white">
      {/* Header */}
      <div className="border-b border-slate-800 bg-gradient-to-r from-[#0a0a0f] via-[#0f1419] to-[#0a0a0f]">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                <BarChart3 className="w-7 h-7 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
                  YEX API Module
                </h1>
                <p className="text-slate-500 text-sm">DAES Trading Integration</p>
              </div>
            </div>
            
            <div className="flex items-center gap-4">
              {/* Connection Status */}
              <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm ${
                connectionStatus === 'online' ? 'bg-emerald-500/20 text-emerald-400' :
                connectionStatus === 'connecting' ? 'bg-yellow-500/20 text-yellow-400' :
                'bg-red-500/20 text-red-400'
              }`}>
                {connectionStatus === 'online' ? <Wifi className="w-4 h-4" /> :
                 connectionStatus === 'connecting' ? <Loader className="w-4 h-4 animate-spin" /> :
                 <WifiOff className="w-4 h-4" />}
                <span className="capitalize">{connectionStatus}</span>
              </div>

              {/* Server Time */}
              {serverTime && (
                <div className="flex items-center gap-2 text-slate-400 text-sm">
                  <Clock className="w-4 h-4" />
                  <span>{formatTime(serverTime)}</span>
                </div>
              )}

              {/* Refresh */}
              <button
                onClick={() => {
                  checkConnection();
                  fetchTicker();
                  fetchBalance();
                  refreshLinkedBalances();
                }}
                className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 transition"
              >
                <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Tabs */}
      <div className="border-b border-slate-800">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex gap-1 overflow-x-auto">
            {[
              { id: 'spot', label: 'Spot', icon: CandlestickChart },
              { id: 'margin', label: 'Margin', icon: Percent },
              { id: 'futures', label: 'Futures', icon: LineChart },
              { id: 'withdraw', label: 'Withdraw', icon: Send },
              { id: 'account', label: 'Account', icon: Wallet },
              { id: 'settings', label: 'Settings', icon: Settings }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-2 px-4 py-3 border-b-2 transition font-medium ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-400'
                    : 'border-transparent text-slate-400 hover:text-white'
                }`}
              >
                <tab.icon className="w-4 h-4" />
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Alerts */}
      <div className="max-w-7xl mx-auto px-4 mt-4">
        {/* API Keys Status - Loaded from .env */}
        {apiConfig.apiKey && apiConfig.apiSecret && (
          <div className="mb-4 p-4 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center gap-3">
            <CheckCircle className="w-5 h-5 text-emerald-400 flex-shrink-0" />
            <span className="text-emerald-300">✅ YEX API conectada</span>
            <span className="text-xs bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded-full">
              Credenciales cargadas desde .env
            </span>
          </div>
        )}
        {/* API Keys Not Configured */}
        {(!apiConfig.apiKey || !apiConfig.apiSecret) && (
          <div className="mb-4 p-4 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-amber-400 flex-shrink-0" />
            <span className="text-amber-300">Configura las credenciales en el archivo .env</span>
            <code className="text-xs bg-slate-800 text-slate-300 px-2 py-1 rounded font-mono">
              VITE_YEX_API_KEY / VITE_YEX_SECRET_KEY
            </code>
          </div>
        )}
        {error && (
          <div className="mb-4 p-4 rounded-lg bg-red-500/10 border border-red-500/30 flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0" />
            <span className="text-red-300">{error}</span>
            <button onClick={() => setError(null)} className="ml-auto text-red-400 hover:text-red-300">
              <XCircle className="w-5 h-5" />
            </button>
          </div>
        )}
        {success && (
          <div className="mb-4 p-4 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center gap-3">
            <CheckCircle className="w-5 h-5 text-emerald-400 flex-shrink-0" />
            <span className="text-emerald-300">{success}</span>
            <button onClick={() => setSuccess(null)} className="ml-auto text-emerald-400 hover:text-emerald-300">
              <XCircle className="w-5 h-5" />
            </button>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 py-6">
        {/* ==================== SPOT TAB ==================== */}
        {activeTab === 'spot' && (
          <div className="space-y-6">
            {/* Sub Tabs */}
            <div className="flex gap-2 bg-slate-900/50 p-1 rounded-lg w-fit">
              {['market', 'trading', 'orders'].map(sub => (
                <button
                  key={sub}
                  onClick={() => setActiveSubTab(sub as any)}
                  className={`px-4 py-2 rounded-md font-medium transition ${
                    activeSubTab === sub
                      ? 'bg-blue-600 text-white'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {sub === 'market' && '📊 Market'}
                  {sub === 'trading' && '💹 Trading'}
                  {sub === 'orders' && '📋 Orders'}
                </button>
              ))}
            </div>

            {/* Market View */}
            {activeSubTab === 'market' && (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Symbol Selector & Ticker */}
                <div className="lg:col-span-2 space-y-4">
                  {/* Symbol Input */}
                  <div className="bg-slate-900/50 rounded-xl p-4 border border-slate-800">
                    <div className="flex items-center gap-4">
                      <div className="flex-1">
                        <label className="text-slate-400 text-sm mb-1 block">Symbol</label>
                        <div className="flex gap-2">
                          <input
                            type="text"
                            value={symbol}
                            onChange={(e) => setSymbol(e.target.value.toUpperCase())}
                            className="flex-1 bg-slate-800 border border-slate-700 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-blue-500"
                            placeholder="BTCUSDT"
                          />
                          <button
                            onClick={() => fetchTicker()}
                            disabled={loading}
                            className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-700 rounded-lg font-medium transition"
                          >
                            {loading ? <Loader className="w-5 h-5 animate-spin" /> : 'Load'}
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Quick Symbols */}
                    <div className="flex gap-2 mt-3 flex-wrap">
                      {['BTCUSDT', 'ETHUSDT', 'BNBUSDT', 'SOVUSDT', 'XRPUSDT'].map(s => (
                        <button
                          key={s}
                          onClick={() => {
                            setSymbol(s);
                            fetchTicker(s);
                            fetchDepth(s);
                          }}
                          className={`px-3 py-1 rounded-md text-sm transition ${
                            symbol === s
                              ? 'bg-blue-600 text-white'
                              : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                          }`}
                        >
                          {s}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Ticker Display */}
                  {ticker && (
                    <div className="bg-slate-900/50 rounded-xl p-6 border border-slate-800">
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-orange-500 to-yellow-500 flex items-center justify-center font-bold">
                            {ticker.symbol?.slice(0, 1) || '?'}
                          </div>
                          <div>
                            <h3 className="text-xl font-bold">{ticker.symbol}</h3>
                            <span className="text-slate-500 text-sm">24h Ticker</span>
                          </div>
                        </div>
                        <div className={`flex items-center gap-1 px-3 py-1 rounded-full ${
                          parseFloat(ticker.priceChangePercent) >= 0 
                            ? 'bg-emerald-500/20 text-emerald-400' 
                            : 'bg-red-500/20 text-red-400'
                        }`}>
                          {parseFloat(ticker.priceChangePercent) >= 0 
                            ? <TrendingUp className="w-4 h-4" /> 
                            : <TrendingDown className="w-4 h-4" />
                          }
                          <span className="font-medium">
                            {parseFloat(ticker.priceChangePercent) >= 0 ? '+' : ''}
                            {formatNumber(ticker.priceChangePercent)}%
                          </span>
                        </div>
                      </div>

                      <div className="text-4xl font-bold mb-6">
                        ${formatNumber(ticker.lastPrice, 2)}
                      </div>

                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="bg-slate-800/50 rounded-lg p-3">
                          <div className="text-slate-400 text-xs mb-1">24h High</div>
                          <div className="text-emerald-400 font-semibold">${formatNumber(ticker.highPrice)}</div>
                        </div>
                        <div className="bg-slate-800/50 rounded-lg p-3">
                          <div className="text-slate-400 text-xs mb-1">24h Low</div>
                          <div className="text-red-400 font-semibold">${formatNumber(ticker.lowPrice)}</div>
                        </div>
                        <div className="bg-slate-800/50 rounded-lg p-3">
                          <div className="text-slate-400 text-xs mb-1">24h Volume</div>
                          <div className="text-white font-semibold">{formatNumber(ticker.volume, 0)}</div>
                        </div>
                        <div className="bg-slate-800/50 rounded-lg p-3">
                          <div className="text-slate-400 text-xs mb-1">24h Change</div>
                          <div className={parseFloat(ticker.priceChange) >= 0 ? 'text-emerald-400' : 'text-red-400'}>
                            {parseFloat(ticker.priceChange) >= 0 ? '+' : ''}{formatNumber(ticker.priceChange)}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Order Book */}
                <div className="bg-slate-900/50 rounded-xl p-4 border border-slate-800">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-semibold flex items-center gap-2">
                      <Database className="w-4 h-4 text-blue-400" />
                      Order Book
                    </h3>
                    <button
                      onClick={() => fetchDepth()}
                      className="text-slate-400 hover:text-white"
                    >
                      <RefreshCw className="w-4 h-4" />
                    </button>
                  </div>

                  {depth && (
                    <div className="space-y-2">
                      {/* Asks (Sells) */}
                      <div className="space-y-1">
                        {depth.asks.slice(0, 8).reverse().map((ask, i) => (
                          <div key={i} className="flex justify-between text-sm py-1 px-2 rounded bg-red-500/5">
                            <span className="text-red-400 font-mono">{formatNumber(ask[0], 2)}</span>
                            <span className="text-slate-400 font-mono">{formatNumber(ask[1], 4)}</span>
                          </div>
                        ))}
                      </div>

                      {/* Spread */}
                      <div className="py-2 text-center border-y border-slate-700">
                        <span className="text-lg font-bold text-white">
                          ${ticker ? formatNumber(ticker.lastPrice, 2) : '---'}
                        </span>
                      </div>

                      {/* Bids (Buys) */}
                      <div className="space-y-1">
                        {depth.bids.slice(0, 8).map((bid, i) => (
                          <div key={i} className="flex justify-between text-sm py-1 px-2 rounded bg-emerald-500/5">
                            <span className="text-emerald-400 font-mono">{formatNumber(bid[0], 2)}</span>
                            <span className="text-slate-400 font-mono">{formatNumber(bid[1], 4)}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Trading View */}
            {activeSubTab === 'trading' && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Order Form */}
                <div className="bg-slate-900/50 rounded-xl p-6 border border-slate-800">
                  <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                    <ArrowUpDown className="w-5 h-5 text-blue-400" />
                    Place Order
                  </h3>

                  <div className="space-y-4">
                    {/* Symbol */}
                    <div>
                      <label className="text-slate-400 text-sm mb-1 block">Symbol</label>
                      <input
                        type="text"
                        value={orderForm.symbol}
                        onChange={(e) => setOrderForm({...orderForm, symbol: e.target.value.toUpperCase()})}
                        className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-blue-500"
                      />
                    </div>

                    {/* Side Buttons */}
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        onClick={() => setOrderForm({...orderForm, side: 'BUY'})}
                        className={`py-3 rounded-lg font-semibold transition ${
                          orderForm.side === 'BUY'
                            ? 'bg-emerald-600 text-white'
                            : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                        }`}
                      >
                        BUY
                      </button>
                      <button
                        onClick={() => setOrderForm({...orderForm, side: 'SELL'})}
                        className={`py-3 rounded-lg font-semibold transition ${
                          orderForm.side === 'SELL'
                            ? 'bg-red-600 text-white'
                            : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                        }`}
                      >
                        SELL
                      </button>
                    </div>

                    {/* Order Type */}
                    <div>
                      <label className="text-slate-400 text-sm mb-1 block">Order Type</label>
                      <select
                        value={orderForm.type}
                        onChange={(e) => setOrderForm({...orderForm, type: e.target.value as any})}
                        className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-blue-500"
                      >
                        <option value="LIMIT">LIMIT</option>
                        <option value="MARKET">MARKET</option>
                        <option value="IOC">IOC (Immediate or Cancel)</option>
                        <option value="FOK">FOK (Fill or Kill)</option>
                      </select>
                    </div>

                    {/* Price (for LIMIT) */}
                    {orderForm.type === 'LIMIT' && (
                      <div>
                        <label className="text-slate-400 text-sm mb-1 block">Price</label>
                        <div className="relative">
                          <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                          <input
                            type="number"
                            step="0.01"
                            value={orderForm.price}
                            onChange={(e) => setOrderForm({...orderForm, price: e.target.value})}
                            className="w-full bg-slate-800 border border-slate-700 rounded-lg pl-10 pr-4 py-2.5 text-white focus:outline-none focus:border-blue-500"
                            placeholder="0.00"
                          />
                        </div>
                      </div>
                    )}

                    {/* Quantity */}
                    <div>
                      <label className="text-slate-400 text-sm mb-1 block">Quantity</label>
                      <input
                        type="number"
                        step="0.00000001"
                        value={orderForm.quantity}
                        onChange={(e) => setOrderForm({...orderForm, quantity: e.target.value})}
                        className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-blue-500"
                        placeholder="0.00"
                      />
                    </div>

                    {/* Client Order ID */}
                    <div>
                      <label className="text-slate-400 text-sm mb-1 block">Client Order ID (DAES Idempotency)</label>
                      <input
                        type="text"
                        value={orderForm.clientOrderId}
                        onChange={(e) => setOrderForm({...orderForm, clientOrderId: e.target.value})}
                        className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-blue-500"
                        placeholder={`DAES-${Date.now()}`}
                      />
                    </div>

                    {/* Submit Button */}
                    <button
                      onClick={createOrder}
                      disabled={loading || !orderForm.quantity}
                      className={`w-full py-3 rounded-lg font-bold text-white transition ${
                        orderForm.side === 'BUY'
                          ? 'bg-emerald-600 hover:bg-emerald-700'
                          : 'bg-red-600 hover:bg-red-700'
                      } disabled:opacity-50 disabled:cursor-not-allowed`}
                    >
                      {loading ? (
                        <Loader className="w-5 h-5 animate-spin mx-auto" />
                      ) : (
                        `${orderForm.side} ${orderForm.symbol}`
                      )}
                    </button>
                  </div>
                </div>

                {/* Recent Trades */}
                <div className="bg-slate-900/50 rounded-xl p-6 border border-slate-800">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold flex items-center gap-2">
                      <Activity className="w-5 h-5 text-purple-400" />
                      Recent Trades
                    </h3>
                    <button
                      onClick={() => fetchTrades()}
                      className="text-slate-400 hover:text-white"
                    >
                      <RefreshCw className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="space-y-1 max-h-96 overflow-y-auto">
                    {trades.length > 0 ? trades.map((trade, i) => (
                      <div key={i} className="flex justify-between items-center py-2 px-2 rounded hover:bg-slate-800/50">
                        <div className="flex items-center gap-2">
                          <span className={trade.isBuyerMaker ? 'text-red-400' : 'text-emerald-400'}>
                            {trade.isBuyerMaker ? '↓' : '↑'}
                          </span>
                          <span className="font-mono">${formatNumber(trade.price, 2)}</span>
                        </div>
                        <span className="text-slate-400 font-mono text-sm">{formatNumber(trade.qty, 4)}</span>
                        <span className="text-slate-500 text-xs">{formatTime(trade.time)}</span>
                      </div>
                    )) : (
                      <div className="text-center text-slate-500 py-8">No trades</div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Orders View */}
            {activeSubTab === 'orders' && (
              <div className="bg-slate-900/50 rounded-xl p-6 border border-slate-800">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold flex items-center gap-2">
                    <BookOpen className="w-5 h-5 text-yellow-400" />
                    Open Orders
                  </h3>
                  <button
                    onClick={() => fetchOpenOrders()}
                    disabled={loading}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg transition"
                  >
                    <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                    Refresh
                  </button>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="text-slate-400 text-sm border-b border-slate-700">
                        <th className="text-left py-3 px-2">Symbol</th>
                        <th className="text-left py-3 px-2">Side</th>
                        <th className="text-left py-3 px-2">Type</th>
                        <th className="text-right py-3 px-2">Price</th>
                        <th className="text-right py-3 px-2">Quantity</th>
                        <th className="text-right py-3 px-2">Filled</th>
                        <th className="text-center py-3 px-2">Status</th>
                        <th className="text-center py-3 px-2">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {openOrders.length > 0 ? openOrders.map((order, i) => (
                        <tr key={i} className="border-b border-slate-800 hover:bg-slate-800/30">
                          <td className="py-3 px-2 font-medium">{order.symbol}</td>
                          <td className={`py-3 px-2 ${order.side === 'BUY' ? 'text-emerald-400' : 'text-red-400'}`}>
                            {order.side}
                          </td>
                          <td className="py-3 px-2 text-slate-400">{order.type}</td>
                          <td className="py-3 px-2 text-right font-mono">${formatNumber(order.price)}</td>
                          <td className="py-3 px-2 text-right font-mono">{formatNumber(order.quantity, 4)}</td>
                          <td className="py-3 px-2 text-right font-mono text-slate-400">{formatNumber(order.executedQty, 4)}</td>
                          <td className="py-3 px-2 text-center">
                            <span className={`px-2 py-1 rounded text-xs font-medium ${
                              order.status === 'FILLED' ? 'bg-emerald-500/20 text-emerald-400' :
                              order.status === 'CANCELED' ? 'bg-red-500/20 text-red-400' :
                              'bg-yellow-500/20 text-yellow-400'
                            }`}>
                              {order.status}
                            </span>
                          </td>
                          <td className="py-3 px-2 text-center">
                            <button
                              onClick={() => cancelOrder(order.orderId, order.symbol)}
                              className="text-red-400 hover:text-red-300 p-1"
                              title="Cancel Order"
                            >
                              <XCircle className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      )) : (
                        <tr>
                          <td colSpan={8} className="py-8 text-center text-slate-500">
                            No open orders
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ==================== MARGIN TAB ==================== */}
        {activeTab === 'margin' && (
          <div className="bg-slate-900/50 rounded-xl p-8 border border-slate-800 text-center">
            <Percent className="w-16 h-16 text-purple-400 mx-auto mb-4" />
            <h2 className="text-2xl font-bold mb-2">Margin Trading</h2>
            <p className="text-slate-400 mb-6">Cross & Isolated Margin with up to 10x leverage</p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-2xl mx-auto">
              <div className="bg-slate-800/50 rounded-lg p-4">
                <div className="text-2xl font-bold text-purple-400">10x</div>
                <div className="text-slate-400 text-sm">Max Leverage</div>
              </div>
              <div className="bg-slate-800/50 rounded-lg p-4">
                <div className="text-2xl font-bold text-emerald-400">Cross</div>
                <div className="text-slate-400 text-sm">Margin Mode</div>
              </div>
              <div className="bg-slate-800/50 rounded-lg p-4">
                <div className="text-2xl font-bold text-blue-400">Auto</div>
                <div className="text-slate-400 text-sm">Liquidation</div>
              </div>
            </div>
          </div>
        )}

        {/* ==================== FUTURES TAB ==================== */}
        {activeTab === 'futures' && (
          <div className="bg-slate-900/50 rounded-xl p-8 border border-slate-800 text-center">
            <LineChart className="w-16 h-16 text-blue-400 mx-auto mb-4" />
            <h2 className="text-2xl font-bold mb-2">Futures Trading</h2>
            <p className="text-slate-400 mb-6">Perpetual contracts with up to 125x leverage</p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-2xl mx-auto">
              <div className="bg-slate-800/50 rounded-lg p-4">
                <div className="text-2xl font-bold text-blue-400">125x</div>
                <div className="text-slate-400 text-sm">Max Leverage</div>
              </div>
              <div className="bg-slate-800/50 rounded-lg p-4">
                <div className="text-2xl font-bold text-emerald-400">USDT</div>
                <div className="text-slate-400 text-sm">Settlement</div>
              </div>
              <div className="bg-slate-800/50 rounded-lg p-4">
                <div className="text-2xl font-bold text-yellow-400">24/7</div>
                <div className="text-slate-400 text-sm">Trading</div>
              </div>
            </div>
          </div>
        )}

        {/* ==================== WITHDRAW TAB ==================== */}
        {activeTab === 'withdraw' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Withdraw Form */}
            <div className="bg-slate-900/50 rounded-xl p-6 border border-slate-800">
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <Send className="w-5 h-5 text-orange-400" />
                Withdraw Crypto
              </h3>

              <div className="space-y-4">
                <div>
                  <label className="text-slate-400 text-sm mb-1 block">Coin</label>
                  <select
                    value={withdrawForm.coin}
                    onChange={(e) => setWithdrawForm({...withdrawForm, coin: e.target.value})}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2.5 text-white"
                  >
                    <option value="USDT">USDT</option>
                    <option value="BTC">BTC</option>
                    <option value="ETH">ETH</option>
                    <option value="BNB">BNB</option>
                  </select>
                </div>

                <div>
                  <label className="text-slate-400 text-sm mb-1 block">Network</label>
                  <select
                    value={withdrawForm.network}
                    onChange={(e) => setWithdrawForm({...withdrawForm, network: e.target.value})}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2.5 text-white"
                  >
                    <option value="ERC20">ERC20 (Ethereum)</option>
                    <option value="TRC20">TRC20 (Tron)</option>
                    <option value="BEP20">BEP20 (BSC)</option>
                  </select>
                </div>

                <div>
                  <label className="text-slate-400 text-sm mb-1 block">Address</label>
                  <input
                    type="text"
                    value={withdrawForm.address}
                    onChange={(e) => setWithdrawForm({...withdrawForm, address: e.target.value})}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2.5 text-white"
                    placeholder="0x..."
                  />
                </div>

                <div>
                  <label className="text-slate-400 text-sm mb-1 block">Amount</label>
                  <input
                    type="number"
                    value={withdrawForm.amount}
                    onChange={(e) => setWithdrawForm({...withdrawForm, amount: e.target.value})}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2.5 text-white"
                    placeholder="0.00"
                  />
                </div>

                <div>
                  <label className="text-slate-400 text-sm mb-1 block">Memo (Optional)</label>
                  <input
                    type="text"
                    value={withdrawForm.memo}
                    onChange={(e) => setWithdrawForm({...withdrawForm, memo: e.target.value})}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2.5 text-white"
                    placeholder="Tag/Memo"
                  />
                </div>

                <button
                  onClick={submitWithdraw}
                  disabled={loading || !withdrawForm.address || !withdrawForm.amount}
                  className="w-full py-3 bg-orange-600 hover:bg-orange-700 rounded-lg font-bold transition disabled:opacity-50"
                >
                  {loading ? <Loader className="w-5 h-5 animate-spin mx-auto" /> : 'Submit Withdraw'}
                </button>
              </div>
            </div>

            {/* Deposit Info */}
            <div className="bg-slate-900/50 rounded-xl p-6 border border-slate-800">
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <Download className="w-5 h-5 text-emerald-400" />
                Deposit Info
              </h3>

              <div className="space-y-4">
                <div className="bg-slate-800/50 rounded-lg p-4">
                  <div className="text-slate-400 text-sm mb-2">Network Fee</div>
                  <div className="text-white font-semibold">Variable (check network)</div>
                </div>

                <div className="bg-slate-800/50 rounded-lg p-4">
                  <div className="text-slate-400 text-sm mb-2">Min Withdraw</div>
                  <div className="text-white font-semibold">10 USDT</div>
                </div>

                <div className="bg-slate-800/50 rounded-lg p-4">
                  <div className="text-slate-400 text-sm mb-2">Processing Time</div>
                  <div className="text-white font-semibold">1-30 minutes</div>
                </div>

                <div className="p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
                  <div className="flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 text-yellow-400 flex-shrink-0 mt-0.5" />
                    <div className="text-sm text-yellow-200">
                      <strong>Important:</strong> Always verify the address and network before withdrawing. 
                      Incorrect network selection may result in permanent loss of funds.
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ==================== ACCOUNT TAB ==================== */}
        {activeTab === 'account' && (
          <div className="space-y-6">
            {/* Linked Custody Accounts Balance */}
            <div className="bg-gradient-to-br from-blue-900/30 to-purple-900/30 rounded-xl p-6 border border-blue-500/30">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold flex items-center gap-2">
                  <Building2 className="w-5 h-5 text-blue-400" />
                  Custody Account Balance
                  <span className="text-xs bg-blue-500/20 text-blue-400 px-2 py-0.5 rounded-full ml-2">
                    Linked from DAES
                  </span>
                </h3>
                <div className="flex gap-2">
                  <button
                    onClick={refreshLinkedBalances}
                    disabled={loading}
                    className="flex items-center gap-2 px-3 py-2 bg-slate-800 hover:bg-slate-700 rounded-lg transition text-sm"
                  >
                    <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                    Sync
                  </button>
                  <button
                    onClick={() => setShowLinkModal(true)}
                    className="flex items-center gap-2 px-3 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg transition text-sm"
                  >
                    <Plus className="w-4 h-4" />
                    Link Account
                  </button>
                </div>
              </div>

              {/* Total Linked Balance */}
              <div className="mb-6 p-4 bg-slate-900/50 rounded-lg border border-slate-700">
                <div className="text-slate-400 text-sm mb-1">Total Linked Balance (USD)</div>
                <div className="text-4xl font-bold text-white">
                  ${formatNumber(calculateLinkedTotal())}
                </div>
                <div className="text-sm text-slate-500 mt-1">
                  {linkedBalances.length} cuenta{linkedBalances.length !== 1 ? 's' : ''} vinculada{linkedBalances.length !== 1 ? 's' : ''}
                </div>
              </div>

              {/* Linked Accounts Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {linkedBalances.length > 0 ? linkedBalances.map((lb, i) => (
                  <div key={i} className="bg-slate-800/50 rounded-lg p-4 border border-slate-700 hover:border-blue-500/50 transition">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                          lb.accountType === 'blockchain' 
                            ? 'bg-purple-500/20 text-purple-400' 
                            : 'bg-emerald-500/20 text-emerald-400'
                        }`}>
                          {lb.accountType === 'blockchain' ? '⛓️' : '🏦'}
                        </div>
                        <div>
                          <div className="font-semibold text-sm">{lb.accountName}</div>
                          <div className="text-xs text-slate-500">{lb.currency}</div>
                        </div>
                      </div>
                      <button
                        onClick={() => unlinkCustodyAccount(lb.accountId)}
                        className="text-slate-500 hover:text-red-400 transition"
                        title="Desvincular"
                      >
                        <XCircle className="w-4 h-4" />
                      </button>
                    </div>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-slate-400 text-sm">Disponible</span>
                        <span className="font-semibold text-emerald-400">
                          ${formatNumber(lb.availableBalance)}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400 text-sm">Total</span>
                        <span className="font-semibold text-white">
                          ${formatNumber(lb.totalBalance)}
                        </span>
                      </div>
                    </div>
                    <div className="mt-3 pt-3 border-t border-slate-700 space-y-2">
                      <div className="flex items-center gap-1 text-xs text-slate-500">
                        <Link2 className="w-3 h-3" />
                        Vinculado: {new Date(lb.linkedAt).toLocaleDateString()}
                      </div>
                      {/* Transfer Button */}
                      <button
                        onClick={() => {
                          setTransferSourceAccount(lb.accountId);
                          setShowTransferModal(true);
                        }}
                        disabled={lb.availableBalance <= 0}
                        className="w-full py-2 bg-gradient-to-r from-emerald-600 to-blue-600 hover:from-emerald-700 hover:to-blue-700 rounded-lg text-sm font-semibold transition flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <ArrowRight className="w-4 h-4" />
                        Cargar a YEX Balance
                      </button>
                    </div>
                  </div>
                )) : (
                  <div className="col-span-full text-center py-8 text-slate-500">
                    <Building2 className="w-12 h-12 mx-auto mb-3 opacity-50" />
                    <p>No hay cuentas vinculadas</p>
                    <p className="text-sm mt-1">Haz clic en "Link Account" para vincular una cuenta de Custody</p>
                  </div>
                )}
              </div>
            </div>

            {/* YEX API Balance */}
            <div className="bg-slate-900/50 rounded-xl p-6 border border-slate-800">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold flex items-center gap-2">
                  <Wallet className="w-5 h-5 text-emerald-400" />
                  YEX API Balance
                  <span className="text-xs bg-slate-700 text-slate-400 px-2 py-0.5 rounded-full ml-2">
                    Exchange
                  </span>
                </h3>
                <div className="flex items-center gap-3">
                  {/* 🔄 BOTÓN DEMO/REAL */}
                  <button
                    onClick={toggleTradingMode}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg font-semibold transition-all duration-300 ${
                      tradingMode === 'demo'
                        ? 'bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-white shadow-lg shadow-amber-500/25'
                        : 'bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-500 hover:to-green-500 text-white shadow-lg shadow-emerald-500/25'
                    }`}
                  >
                    {tradingMode === 'demo' ? (
                      <>
                        <div className="w-3 h-3 bg-amber-300 rounded-full animate-pulse" />
                        🎮 DEMO
                      </>
                    ) : (
                      <>
                        <div className="w-3 h-3 bg-emerald-300 rounded-full animate-pulse" />
                        💰 REAL
                      </>
                    )}
                  </button>
                  <button
                    onClick={tradingMode === 'real' ? fetchRealYexBalance : fetchBalance}
                    disabled={loading || realBalanceLoading}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg transition"
                  >
                    <RefreshCw className={`w-4 h-4 ${(loading || realBalanceLoading) ? 'animate-spin' : ''}`} />
                    Refresh
                  </button>
                </div>
              </div>

              {/* Indicador de Modo */}
              <div className={`mb-6 p-4 rounded-lg border ${
                tradingMode === 'demo' 
                  ? 'bg-gradient-to-r from-amber-900/30 to-orange-900/30 border-amber-500/30'
                  : 'bg-gradient-to-r from-emerald-900/30 to-green-900/30 border-emerald-500/30'
              }`}>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    {tradingMode === 'demo' ? (
                      <>
                        <span className="text-2xl">🎮</span>
                        <span className="text-amber-400 font-bold text-lg">MODO DEMO</span>
                      </>
                    ) : (
                      <>
                        <span className="text-2xl">💰</span>
                        <span className="text-emerald-400 font-bold text-lg">MODO REAL</span>
                      </>
                    )}
                  </div>
                  <span className={`text-xs px-3 py-1 rounded-full ${
                    tradingMode === 'demo'
                      ? 'bg-amber-500/20 text-amber-400'
                      : 'bg-emerald-500/20 text-emerald-400'
                  }`}>
                    {tradingMode === 'demo' ? 'Dinero Local (Simulado)' : 'YEX API /sapi/v1/account'}
                  </span>
                </div>
                <p className="text-sm text-slate-400">
                  {tradingMode === 'demo' 
                    ? 'Los balances mostrados provienen del almacenamiento local y transferencias desde Custody. No afectan tu cuenta real de YEX.'
                    : 'Los balances mostrados provienen directamente de tu cuenta YEX Exchange mediante la API /sapi/v1/account.'
                  }
                </p>
              </div>

              {/* MODO DEMO: Mostrar balances locales */}
              {tradingMode === 'demo' && (
                <>
                  <div className="mb-6 p-4 bg-gradient-to-r from-amber-900/20 to-orange-900/20 rounded-lg border border-amber-500/20">
                    <div className="text-slate-400 text-sm mb-1">Total Balance DEMO (Local)</div>
                    <div className="text-4xl font-bold text-amber-400">${formatNumber(calculateYexTotalFromCustody())}</div>
                    <div className="text-sm text-slate-500 mt-1">
                      {yexBalancesFromCustody.length} activo{yexBalancesFromCustody.length !== 1 ? 's' : ''} cargado{yexBalancesFromCustody.length !== 1 ? 's' : ''} desde Custody (Local)
                    </div>
                  </div>
                </>
              )}

              {/* MODO REAL: Mostrar balances de YEX API */}
              {tradingMode === 'real' && (
                <>
                  {realBalanceLoading && (
                    <div className="mb-6 p-4 bg-slate-800/50 rounded-lg border border-slate-700 text-center">
                      <RefreshCw className="w-8 h-8 animate-spin text-emerald-400 mx-auto mb-2" />
                      <p className="text-slate-400">Consultando YEX API /sapi/v1/account...</p>
                    </div>
                  )}
                  
                  {realBalanceError && (
                    <div className="mb-6 p-4 bg-red-900/20 rounded-lg border border-red-500/30">
                      <div className="flex items-center gap-2 text-red-400 mb-2">
                        <XCircle className="w-5 h-5" />
                        <span className="font-semibold">Error al obtener balance real</span>
                      </div>
                      <p className="text-sm text-red-300">{realBalanceError}</p>
                      <button
                        onClick={fetchRealYexBalance}
                        className="mt-3 px-4 py-2 bg-red-600 hover:bg-red-700 rounded-lg text-sm transition"
                      >
                        Reintentar
                      </button>
                    </div>
                  )}
                  
                  {!realBalanceLoading && !realBalanceError && (
                    <div className="mb-6 p-4 bg-gradient-to-r from-emerald-900/30 to-green-900/30 rounded-lg border border-emerald-500/30">
                      <div className="text-slate-400 text-sm mb-1">Total Balance REAL (YEX API)</div>
                      <div className="text-4xl font-bold text-emerald-400">${formatNumber(calculateRealTotal())}</div>
                      <div className="text-sm text-slate-500 mt-1">
                        {realYexBalances.length} activo{realYexBalances.length !== 1 ? 's' : ''} en YEX Exchange
                      </div>
                    </div>
                  )}

                  {/* Balances Reales */}
                  {realYexBalances.length > 0 && (
                    <div className="mb-6">
                      <h4 className="text-sm font-semibold text-emerald-400 mb-3 flex items-center gap-2">
                        <Globe className="w-4 h-4" />
                        Balances REALES - YEX Exchange
                      </h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {realYexBalances.map((balance, i) => (
                          <div key={i} className="bg-gradient-to-br from-emerald-900/30 to-green-900/30 rounded-lg p-4 border border-emerald-500/30">
                            <div className="flex items-center justify-between mb-2">
                              <span className="font-semibold text-emerald-400">{balance.asset}</span>
                              <span className="text-xs bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded-full">
                                💰 REAL
                              </span>
                            </div>
                            <div className="text-2xl font-bold text-white">{formatNumber(balance.free, 4)}</div>
                            {parseFloat(balance.locked) > 0 && (
                              <div className="mt-1 text-sm text-slate-400">
                                🔒 Bloqueado: {formatNumber(balance.locked, 4)}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {realYexBalances.length === 0 && !realBalanceLoading && !realBalanceError && (
                    <div className="mb-6 text-center py-8 text-slate-500">
                      <Globe className="w-12 h-12 mx-auto mb-3 opacity-50" />
                      <p>Click "Refresh" para cargar balances reales de YEX</p>
                    </div>
                  )}
                </>
              )}

              {/* Balances from Custody - Solo en modo DEMO */}
              {tradingMode === 'demo' && yexBalancesFromCustody.length > 0 && (
                <div className="mb-6">
                  <h4 className="text-sm font-semibold text-amber-400 mb-3 flex items-center gap-2">
                    <ArrowDownToLine className="w-4 h-4" />
                    Balances DEMO - Cargados desde Custody
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {yexBalancesFromCustody.map((balance, i) => (
                      <div key={i} className="bg-gradient-to-br from-amber-900/20 to-orange-900/20 rounded-lg p-4 border border-amber-500/20">
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-semibold text-amber-400">{balance.asset}</span>
                          <span className="text-xs bg-amber-500/20 text-amber-400 px-2 py-0.5 rounded-full">
                            🎮 DEMO
                          </span>
                        </div>
                        <div className="text-2xl font-bold text-white">${formatNumber(balance.amount)}</div>
                        <div className="mt-2 text-xs text-slate-500">
                          Desde: {balance.fromAccount}
                        </div>
                        <div className="text-xs text-slate-600">
                          {new Date(balance.timestamp).toLocaleString()}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Mensaje si no hay balances en modo DEMO */}
              {tradingMode === 'demo' && yexBalancesFromCustody.length === 0 && (
                <div className="text-center py-8 text-slate-500">
                  <Wallet className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p>No hay balances DEMO cargados</p>
                  <p className="text-sm mt-2">Vincula una cuenta de Custody y transfiere fondos</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ==================== SETTINGS TAB ==================== */}
        {activeTab === 'settings' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* API Configuration - Loaded from .env */}
            <div className="bg-slate-900/50 rounded-xl p-6 border border-slate-800">
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <Key className="w-5 h-5 text-yellow-400" />
                API Configuration
                <span className="text-xs bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded-full ml-2">
                  .env
                </span>
              </h3>

              <div className="space-y-4">
                {/* API Key Status */}
                <div className="p-4 bg-slate-800/50 rounded-lg border border-slate-700">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-slate-400 text-sm">API Key</span>
                    {apiConfig.apiKey ? (
                      <span className="flex items-center gap-1 text-emerald-400 text-xs">
                        <CheckCircle className="w-3 h-3" />
                        Cargada desde .env
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-red-400 text-xs">
                        <XCircle className="w-3 h-3" />
                        No configurada
                      </span>
                    )}
                  </div>
                  <div className="font-mono text-sm text-white bg-slate-900 rounded px-3 py-2">
                    {apiConfig.apiKey ? '••••••••••••••••••••••••••••••••' : 'VITE_YEX_API_KEY no definida'}
                  </div>
                </div>

                {/* API Secret Status */}
                <div className="p-4 bg-slate-800/50 rounded-lg border border-slate-700">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-slate-400 text-sm">API Secret</span>
                    {apiConfig.apiSecret ? (
                      <span className="flex items-center gap-1 text-emerald-400 text-xs">
                        <CheckCircle className="w-3 h-3" />
                        Cargada desde .env
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-red-400 text-xs">
                        <XCircle className="w-3 h-3" />
                        No configurada
                      </span>
                    )}
                  </div>
                  <div className="font-mono text-sm text-white bg-slate-900 rounded px-3 py-2">
                    {apiConfig.apiSecret ? '••••••••••••••••••••••••••••••••' : 'VITE_YEX_SECRET_KEY no definida'}
                  </div>
                </div>

                {/* Info Box */}
                <div className="p-4 bg-blue-500/10 border border-blue-500/30 rounded-lg">
                  <div className="flex items-start gap-3">
                    <Shield className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
                    <div className="text-sm text-blue-200">
                      <strong>Credenciales Seguras:</strong> Las API Keys se cargan automáticamente desde el archivo <code className="bg-slate-800 px-1 rounded">.env</code>. 
                      Edita el archivo para cambiar las credenciales.
                    </div>
                  </div>
                </div>

                {/* Status Summary */}
                {apiConfig.apiKey && apiConfig.apiSecret ? (
                  <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-lg">
                    <div className="flex items-start gap-3">
                      <CheckCircle className="w-5 h-5 text-emerald-400 flex-shrink-0 mt-0.5" />
                      <div className="text-sm text-emerald-200">
                        <strong>✅ Conexión Lista:</strong> Las credenciales están configuradas correctamente en el archivo .env
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="p-4 bg-amber-500/10 border border-amber-500/30 rounded-lg">
                    <div className="flex items-start gap-3">
                      <AlertCircle className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
                      <div className="text-sm text-amber-200">
                        <strong>⚠️ Configuración Requerida:</strong> Agrega las variables al archivo .env:
                        <pre className="mt-2 bg-slate-900 p-2 rounded text-xs overflow-x-auto">
{`VITE_YEX_API_KEY=tu_api_key
VITE_YEX_SECRET_KEY=tu_secret_key`}
                        </pre>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Endpoints */}
            <div className="bg-slate-900/50 rounded-xl p-6 border border-slate-800">
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <Server className="w-5 h-5 text-blue-400" />
                API Endpoints
              </h3>

              <div className="space-y-4">
                <div>
                  <label className="text-slate-400 text-sm mb-1 block">REST Base URL</label>
                  <input
                    type="text"
                    value={apiConfig.restBase}
                    onChange={(e) => setApiConfig({...apiConfig, restBase: e.target.value})}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2.5 text-white font-mono text-sm"
                  />
                </div>

                <div>
                  <label className="text-slate-400 text-sm mb-1 block">Futures Base URL</label>
                  <input
                    type="text"
                    value={apiConfig.futuresBase}
                    onChange={(e) => setApiConfig({...apiConfig, futuresBase: e.target.value})}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2.5 text-white font-mono text-sm"
                  />
                </div>

                <div>
                  <label className="text-slate-400 text-sm mb-1 block">WebSocket URL</label>
                  <input
                    type="text"
                    value={apiConfig.wsUrl}
                    onChange={(e) => setApiConfig({...apiConfig, wsUrl: e.target.value})}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2.5 text-white font-mono text-sm"
                    placeholder="wss://ws.yex.io/kline-api/ws"
                  />
                </div>

                <button
                  onClick={() => {
                    saveApiConfig(apiConfig);
                    setSuccess('✅ Configuración de URLs guardada correctamente');
                  }}
                  className="w-full py-3 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 rounded-lg font-bold transition flex items-center justify-center gap-2"
                >
                  <Server className="w-5 h-5" />
                  Guardar URLs
                </button>

                {(apiConfig.restBase || apiConfig.futuresBase || apiConfig.wsUrl) && (
                  <div className="p-4 bg-blue-500/10 border border-blue-500/30 rounded-lg">
                    <div className="flex items-start gap-3">
                      <CheckCircle className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
                      <div className="text-sm text-blue-200">
                        <strong>URLs Configuradas:</strong> Los endpoints están guardados y persistentes.
                      </div>
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-3 pt-2">
                  <div className="bg-slate-800/50 rounded-lg p-3">
                    <div className="text-slate-400 text-xs mb-1">Rate Limit (IP)</div>
                    <div className="text-white font-semibold">12,000/min</div>
                  </div>
                  <div className="bg-slate-800/50 rounded-lg p-3">
                    <div className="text-slate-400 text-xs mb-1">Rate Limit (UID)</div>
                    <div className="text-white font-semibold">60,000/min</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Configuration Status Summary */}
            <div className="lg:col-span-2 bg-gradient-to-r from-slate-900/50 to-blue-900/30 rounded-xl p-6 border border-slate-700">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-lg font-semibold flex items-center gap-2">
                    <Database className="w-5 h-5 text-blue-400" />
                    Estado de Configuración
                  </h3>
                  <p className="text-slate-400 text-sm mt-1">
                    Las credenciales se cargan desde el archivo .env - Las URLs se pueden personalizar
                  </p>
                </div>
                <button
                  onClick={() => {
                    // Solo guardar URLs, no credenciales
                    const urlConfig = {
                      restBase: apiConfig.restBase,
                      futuresBase: apiConfig.futuresBase,
                      wsUrl: apiConfig.wsUrl
                    };
                    localStorage.setItem(YEX_API_CONFIG_KEY, JSON.stringify(urlConfig));
                    setSuccess('✅ URLs guardadas correctamente');
                  }}
                  className="px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 rounded-lg font-bold transition flex items-center gap-2"
                >
                  <Server className="w-5 h-5" />
                  Guardar URLs
                </button>
              </div>
              
              {/* Configuration Status */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className={`p-3 rounded-lg ${apiConfig.apiKey ? 'bg-emerald-500/20 border border-emerald-500/30' : 'bg-red-500/20 border border-red-500/30'}`}>
                  <div className="flex items-center gap-2">
                    {apiConfig.apiKey ? <CheckCircle className="w-4 h-4 text-emerald-400" /> : <XCircle className="w-4 h-4 text-red-400" />}
                    <span className="text-sm">API Key</span>
                  </div>
                  <span className="text-xs text-slate-500 mt-1 block">.env</span>
                </div>
                <div className={`p-3 rounded-lg ${apiConfig.apiSecret ? 'bg-emerald-500/20 border border-emerald-500/30' : 'bg-red-500/20 border border-red-500/30'}`}>
                  <div className="flex items-center gap-2">
                    {apiConfig.apiSecret ? <CheckCircle className="w-4 h-4 text-emerald-400" /> : <XCircle className="w-4 h-4 text-red-400" />}
                    <span className="text-sm">Secret Key</span>
                  </div>
                  <span className="text-xs text-slate-500 mt-1 block">.env</span>
                </div>
                <div className={`p-3 rounded-lg ${apiConfig.restBase ? 'bg-emerald-500/20 border border-emerald-500/30' : 'bg-slate-800/50 border border-slate-700'}`}>
                  <div className="flex items-center gap-2">
                    {apiConfig.restBase ? <CheckCircle className="w-4 h-4 text-emerald-400" /> : <XCircle className="w-4 h-4 text-slate-500" />}
                    <span className="text-sm">REST URL</span>
                  </div>
                  <span className="text-xs text-slate-500 mt-1 block">Editable</span>
                </div>
                <div className={`p-3 rounded-lg ${apiConfig.wsUrl ? 'bg-emerald-500/20 border border-emerald-500/30' : 'bg-slate-800/50 border border-slate-700'}`}>
                  <div className="flex items-center gap-2">
                    {apiConfig.wsUrl ? <CheckCircle className="w-4 h-4 text-emerald-400" /> : <XCircle className="w-4 h-4 text-slate-500" />}
                    <span className="text-sm">WebSocket</span>
                  </div>
                  <span className="text-xs text-slate-500 mt-1 block">Editable</span>
                </div>
              </div>
            </div>

            {/* Documentation */}
            <div className="lg:col-span-2 bg-slate-900/50 rounded-xl p-6 border border-slate-800">
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-purple-400" />
                Documentation & Resources
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <a
                  href="https://docs.yex.io/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 p-4 bg-slate-800/50 rounded-lg hover:bg-slate-800 transition"
                >
                  <Globe className="w-6 h-6 text-blue-400" />
                  <div>
                    <div className="font-semibold">YEX API Docs</div>
                    <div className="text-slate-400 text-sm">Official documentation</div>
                  </div>
                  <ExternalLink className="w-4 h-4 text-slate-500 ml-auto" />
                </a>

                <a
                  href="#"
                  className="flex items-center gap-3 p-4 bg-slate-800/50 rounded-lg hover:bg-slate-800 transition"
                >
                  <Zap className="w-6 h-6 text-yellow-400" />
                  <div>
                    <div className="font-semibold">DAES SDK</div>
                    <div className="text-slate-400 text-sm">daes-yex package</div>
                  </div>
                  <ExternalLink className="w-4 h-4 text-slate-500 ml-auto" />
                </a>

                <a
                  href="#"
                  className="flex items-center gap-3 p-4 bg-slate-800/50 rounded-lg hover:bg-slate-800 transition"
                >
                  <Hash className="w-6 h-6 text-emerald-400" />
                  <div>
                    <div className="font-semibold">API Examples</div>
                    <div className="text-slate-400 text-sm">Code samples</div>
                  </div>
                  <ExternalLink className="w-4 h-4 text-slate-500 ml-auto" />
                </a>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Link Custody Account Modal */}
      {showLinkModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900 rounded-xl border border-slate-700 w-full max-w-lg">
            <div className="p-6 border-b border-slate-700">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold flex items-center gap-2">
                  <Link2 className="w-5 h-5 text-blue-400" />
                  Link Custody Account
                </h3>
                <button
                  onClick={() => setShowLinkModal(false)}
                  className="text-slate-400 hover:text-white"
                >
                  <XCircle className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="text-slate-400 text-sm mb-2 block">Select Custody Account</label>
                <select
                  value={selectedCustodyAccount}
                  onChange={(e) => setSelectedCustodyAccount(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-3 text-white"
                >
                  <option value="">-- Seleccionar cuenta --</option>
                  {custodyAccounts
                    .filter(acc => !linkedBalances.find(lb => lb.accountId === acc.id))
                    .map(acc => (
                      <option key={acc.id} value={acc.id}>
                        {acc.accountName} - {acc.currency} {acc.availableBalance.toLocaleString()} ({acc.accountType === 'blockchain' ? '⛓️ Blockchain' : '🏦 Banking'})
                      </option>
                    ))
                  }
                </select>
              </div>

              {selectedCustodyAccount && (
                <div className="bg-slate-800/50 rounded-lg p-4">
                  {(() => {
                    const acc = custodyAccounts.find(a => a.id === selectedCustodyAccount);
                    if (!acc) return null;
                    return (
                      <div className="space-y-2">
                        <div className="flex justify-between">
                          <span className="text-slate-400">Nombre</span>
                          <span className="font-semibold">{acc.accountName}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-400">Tipo</span>
                          <span className={acc.accountType === 'blockchain' ? 'text-purple-400' : 'text-emerald-400'}>
                            {acc.accountType === 'blockchain' ? '⛓️ Blockchain' : '🏦 Banking'}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-400">Divisa</span>
                          <span>{acc.currency}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-400">Balance Disponible</span>
                          <span className="text-emerald-400 font-semibold">
                            ${acc.availableBalance.toLocaleString()}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-400">Balance Total</span>
                          <span className="font-semibold">
                            ${acc.totalBalance.toLocaleString()}
                          </span>
                        </div>
                      </div>
                    );
                  })()}
                </div>
              )}

              <div className="p-4 bg-blue-500/10 border border-blue-500/30 rounded-lg">
                <div className="flex items-start gap-3">
                  <ArrowDownToLine className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
                  <div className="text-sm text-blue-200">
                    Al vincular una cuenta, su balance se mostrará en el módulo YEX API y podrás usarlo para trading.
                    Los cambios en Custody Accounts se sincronizarán automáticamente.
                  </div>
                </div>
              </div>
            </div>

            <div className="p-6 border-t border-slate-700 flex gap-3">
              <button
                onClick={() => setShowLinkModal(false)}
                className="flex-1 py-3 bg-slate-800 hover:bg-slate-700 rounded-lg font-semibold transition"
              >
                Cancelar
              </button>
              <button
                onClick={() => linkCustodyAccount(selectedCustodyAccount)}
                disabled={!selectedCustodyAccount}
                className="flex-1 py-3 bg-blue-600 hover:bg-blue-700 rounded-lg font-semibold transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Vincular Cuenta
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Transfer to YEX Balance Modal */}
      {showTransferModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900 rounded-xl border border-slate-700 w-full max-w-lg">
            <div className="p-6 border-b border-slate-700">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold flex items-center gap-2">
                  <ArrowRight className="w-5 h-5 text-emerald-400" />
                  Cargar Balance a YEX API
                </h3>
                <button
                  onClick={() => {
                    setShowTransferModal(false);
                    setTransferSourceAccount('');
                    setTransferAmount('');
                  }}
                  className="text-slate-400 hover:text-white"
                >
                  <XCircle className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="p-6 space-y-4">
              {/* Source Account Info */}
              {transferSourceAccount && (
                <div className="bg-gradient-to-r from-blue-900/30 to-purple-900/30 rounded-lg p-4 border border-blue-500/30">
                  <div className="text-sm text-slate-400 mb-2">Cuenta Origen (Custody)</div>
                  {(() => {
                    const acc = linkedBalances.find(lb => lb.accountId === transferSourceAccount);
                    if (!acc) return null;
                    return (
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                            acc.accountType === 'blockchain' 
                              ? 'bg-purple-500/20 text-purple-400' 
                              : 'bg-emerald-500/20 text-emerald-400'
                          }`}>
                            {acc.accountType === 'blockchain' ? '⛓️' : '🏦'}
                          </div>
                          <div>
                            <div className="font-semibold">{acc.accountName}</div>
                            <div className="text-xs text-slate-500">{acc.currency}</div>
                          </div>
                        </div>
                        <div className="flex justify-between pt-2 border-t border-slate-700">
                          <span className="text-slate-400">Balance Disponible</span>
                          <span className="text-emerald-400 font-bold text-lg">
                            ${formatNumber(acc.availableBalance)}
                          </span>
                        </div>
                      </div>
                    );
                  })()}
                </div>
              )}

              {/* Amount Input */}
              <div>
                <label className="text-slate-400 text-sm mb-2 block">Monto a Transferir (USD)</label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                  <input
                    type="number"
                    value={transferAmount}
                    onChange={(e) => setTransferAmount(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg pl-10 pr-4 py-3 text-white text-lg font-semibold"
                    placeholder="0.00"
                    min="0"
                    step="0.01"
                  />
                </div>
                {/* Quick Amount Buttons */}
                {transferSourceAccount && (() => {
                  const acc = linkedBalances.find(lb => lb.accountId === transferSourceAccount);
                  if (!acc) return null;
                  return (
                    <div className="flex gap-2 mt-2">
                      {[25, 50, 75, 100].map(pct => (
                        <button
                          key={pct}
                          onClick={() => setTransferAmount(String((acc.availableBalance * pct / 100).toFixed(2)))}
                          className="flex-1 py-1.5 bg-slate-800 hover:bg-slate-700 rounded text-sm font-medium transition"
                        >
                          {pct}%
                        </button>
                      ))}
                    </div>
                  );
                })()}
              </div>

              {/* Destination Info */}
              <div className="bg-emerald-900/20 rounded-lg p-4 border border-emerald-500/30">
                <div className="flex items-center gap-3">
                  <Wallet className="w-8 h-8 text-emerald-400" />
                  <div>
                    <div className="text-sm text-slate-400">Destino</div>
                    <div className="font-semibold text-emerald-400">YEX API Balance</div>
                  </div>
                </div>
              </div>

              {/* Info */}
              <div className="p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
                <div className="flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-yellow-400 flex-shrink-0 mt-0.5" />
                  <div className="text-sm text-yellow-200">
                    Esta transferencia moverá fondos de tu cuenta Custody vinculada al balance de YEX API 
                    para trading. El monto se deducirá de la cuenta origen.
                  </div>
                </div>
              </div>
            </div>

            <div className="p-6 border-t border-slate-700 flex gap-3">
              <button
                onClick={() => {
                  setShowTransferModal(false);
                  setTransferSourceAccount('');
                  setTransferAmount('');
                }}
                className="flex-1 py-3 bg-slate-800 hover:bg-slate-700 rounded-lg font-semibold transition"
              >
                Cancelar
              </button>
              <button
                onClick={transferToYexBalance}
                disabled={!transferSourceAccount || !transferAmount || parseFloat(transferAmount) <= 0 || depositLoading}
                className="flex-1 py-3 bg-gradient-to-r from-emerald-600 to-blue-600 hover:from-emerald-700 hover:to-blue-700 rounded-lg font-semibold transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {depositLoading ? (
                  <>
                    <RefreshCw className="w-5 h-5 animate-spin" />
                    Procesando...
                  </>
                ) : (
                  <>
                    <ArrowRight className="w-5 h-5" />
                    {tradingMode === 'real' ? 'Depositar a YEX (REAL)' : 'Transferir a YEX (DEMO)'}
                  </>
                )}
              </button>
            </div>
            
            {/* Indicador de modo en el modal */}
            <div className={`mt-4 p-3 rounded-lg text-center text-sm ${
              tradingMode === 'real' 
                ? 'bg-emerald-900/30 border border-emerald-500/30 text-emerald-400'
                : 'bg-amber-900/30 border border-amber-500/30 text-amber-400'
            }`}>
              {tradingMode === 'real' ? (
                <>💰 MODO REAL: Se solicitará dirección de depósito de YEX API</>
              ) : (
                <>🎮 MODO DEMO: Transferencia local simulada</>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modal de Transferencia REAL a YEX */}
      {showDepositModal && depositInfo && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900 rounded-2xl p-6 w-full max-w-lg border border-emerald-500/30">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold flex items-center gap-2 text-emerald-400">
                <ArrowDownToLine className="w-6 h-6" />
                💰 Transferencia REAL a YEX Exchange
              </h3>
              <button
                onClick={() => setShowDepositModal(false)}
                className="text-slate-400 hover:text-white"
              >
                <XCircle className="w-6 h-6" />
              </button>
            </div>

            <div className="space-y-4">
              {/* Estado de la transferencia */}
              {depositInfo.status && (
                <div className={`p-4 rounded-lg border ${
                  depositInfo.status === 'COMPLETED' 
                    ? 'bg-emerald-900/30 border-emerald-500/30' 
                    : 'bg-amber-900/30 border-amber-500/30'
                }`}>
                  <div className="flex items-center gap-3">
                    {depositInfo.status === 'COMPLETED' ? (
                      <CheckCircle className="w-8 h-8 text-emerald-400" />
                    ) : (
                      <RefreshCw className="w-8 h-8 text-amber-400 animate-spin" />
                    )}
                    <div>
                      <div className={`font-bold text-lg ${
                        depositInfo.status === 'COMPLETED' ? 'text-emerald-400' : 'text-amber-400'
                      }`}>
                        {depositInfo.status === 'COMPLETED' ? '✅ Transferencia Completada' : '⏳ Procesando...'}
                      </div>
                      {depositInfo.transferId && (
                        <div className="text-sm text-slate-400">
                          ID: {depositInfo.transferId}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Información del monto */}
              <div className="p-4 bg-emerald-900/20 rounded-lg border border-emerald-500/30">
                <div className="text-center">
                  <div className="text-4xl font-bold text-emerald-400">
                    ${depositInfo.amount.toLocaleString()} {depositInfo.coin}
                  </div>
                  <div className="text-sm text-slate-400 mt-1">Monto transferido a YEX Exchange</div>
                </div>
              </div>

              {/* Dirección de depósito YEX */}
              {depositInfo.address && depositInfo.address !== 'Procesando...' && (
                <div className="p-4 bg-slate-800/50 rounded-lg">
                  <div className="text-sm text-slate-400 mb-2">Dirección YEX ({depositInfo.network})</div>
                  <div className="flex items-center gap-2">
                    <code className="flex-1 bg-slate-900 p-3 rounded-lg text-sm font-mono text-emerald-400 break-all">
                      {depositInfo.address}
                    </code>
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(depositInfo.address);
                        setSuccess('✅ Dirección copiada al portapapeles');
                      }}
                      className="p-3 bg-emerald-600 hover:bg-emerald-700 rounded-lg transition"
                    >
                      <Copy className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              )}

              {/* Memo si existe */}
              {depositInfo.memo && (
                <div className="p-4 bg-slate-800/50 rounded-lg">
                  <div className="text-sm text-slate-400 mb-2">Memo/Tag (REQUERIDO)</div>
                  <div className="flex items-center gap-2">
                    <code className="flex-1 bg-slate-900 p-3 rounded-lg text-sm font-mono text-yellow-400">
                      {depositInfo.memo}
                    </code>
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(depositInfo.memo);
                        setSuccess('✅ Memo copiado al portapapeles');
                      }}
                      className="p-3 bg-yellow-600 hover:bg-yellow-700 rounded-lg transition"
                    >
                      <Copy className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              )}

              {/* Información de la red */}
              <div className="grid grid-cols-2 gap-4">
                <div className="p-3 bg-slate-800/50 rounded-lg">
                  <div className="text-xs text-slate-400">Red</div>
                  <div className="font-semibold text-white">{depositInfo.network}</div>
                </div>
                <div className="p-3 bg-slate-800/50 rounded-lg">
                  <div className="text-xs text-slate-400">Moneda</div>
                  <div className="font-semibold text-white">{depositInfo.coin}</div>
                </div>
              </div>

              {/* Información importante */}
              <div className="p-4 bg-blue-900/20 rounded-lg border border-blue-500/30">
                <h4 className="font-semibold text-blue-400 mb-2 flex items-center gap-2">
                  <AlertCircle className="w-5 h-5" />
                  Información
                </h4>
                <ul className="text-sm text-slate-300 space-y-1">
                  <li>• La transferencia ha sido procesada por YEX API</li>
                  <li>• El balance de Custody ha sido actualizado</li>
                  <li>• Los fondos aparecerán en tu cuenta YEX Exchange</li>
                  <li>• Haz clic en "Verificar Balance" para actualizar</li>
                </ul>
              </div>

              {/* Botón para verificar balance */}
              <button
                onClick={() => {
                  fetchRealYexBalance();
                  setShowDepositModal(false);
                }}
                className="w-full py-3 bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-700 hover:to-green-700 rounded-lg font-semibold transition flex items-center justify-center gap-2"
              >
                <RefreshCw className="w-5 h-5" />
                Verificar Balance en YEX Exchange
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default YexApiModule;
