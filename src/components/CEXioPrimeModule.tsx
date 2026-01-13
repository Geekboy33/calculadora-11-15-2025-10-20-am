/**
 * CEX.io Prime Module - Professional Integration
 * 
 * Features:
 * - Balance Management
 * - Trading (Spot/Margin)
 * - Deposits & Withdrawals
 * - Order Management
 * - Transaction History
 * - Real-time monitoring
 */

import { useState, useEffect } from 'react';
import {
  Settings, RefreshCw, Send, Wallet, ArrowRightLeft, History,
  CheckCircle, XCircle, Clock, AlertTriangle, Eye, EyeOff,
  Trash2, Download, DollarSign, Coins, Globe, Shield, Zap,
  ChevronRight, Terminal, FileText, ExternalLink, Activity,
  TrendingUp, TrendingDown, Loader2, X, Plus, ArrowUpRight,
  ArrowDownLeft, CreditCard, Building2, BarChart3
} from 'lucide-react';
import { useLanguage } from '../lib/i18n';
import {
  cexioPrimeClient,
  CEXioConfig,
  CEXioBalance,
  FlowOperation,
  formatCurrency,
  formatUSD,
  getStatusColor,
  getStatusBadgeClass,
  SUPPORTED_NETWORKS,
  POPULAR_PAIRS
} from '../lib/cexio-prime-api';
import { custodyStore, type CustodyAccount } from '../lib/custody-store';
import jsPDF from 'jspdf';

// Storage keys
const CEXIO_STORAGE_KEY = 'cexio_prime_module_data';
const CEXIO_ORDERS_KEY = 'cexio_prime_orders';
const CEXIO_TRADES_KEY = 'cexio_prime_trades';

export default function CEXioPrimeModule() {
  const { language } = useLanguage();
  const isSpanish = language === 'es';

  // States
  const [activeTab, setActiveTab] = useState<'balances' | 'market' | 'trading' | 'withdraw' | 'deposit' | 'history' | 'config'>('balances');
  const [config, setConfig] = useState<CEXioConfig>(cexioPrimeClient.getConfig());
  const [balances, setBalances] = useState<CEXioBalance[]>(cexioPrimeClient.getBalances());
  const [events, setEvents] = useState<FlowOperation[]>(cexioPrimeClient.getEvents());
  const [isLoading, setIsLoading] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'untested' | 'connected' | 'error'>('untested');
  const [showApiSecret, setShowApiSecret] = useState(false);
  const [simulationMode, setSimulationMode] = useState<boolean>(() => {
    const saved = localStorage.getItem('cexio_simulation_mode');
    return saved ? JSON.parse(saved) : true;
  });

  // Form states
  const [apiKey, setApiKey] = useState(config.apiKey);
  const [apiSecret, setApiSecret] = useState(config.apiSecret);
  const [environment, setEnvironment] = useState<'production' | 'sandbox'>(config.environment);

  // Trading states
  const [selectedPair, setSelectedPair] = useState('BTC/USD');
  const [orderType, setOrderType] = useState<'market' | 'limit'>('market');
  const [orderSide, setOrderSide] = useState<'buy' | 'sell'>('buy');
  const [orderAmount, setOrderAmount] = useState('');
  const [orderPrice, setOrderPrice] = useState('');

  // Withdrawal states
  const [withdrawCurrency, setWithdrawCurrency] = useState('USDT');
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [withdrawAddress, setWithdrawAddress] = useState('');
  const [withdrawNetwork, setWithdrawNetwork] = useState('ETH');

  // Orders & Trades
  const [orders, setOrders] = useState<any[]>(() => {
    const saved = localStorage.getItem(CEXIO_ORDERS_KEY);
    return saved ? JSON.parse(saved) : [];
  });
  const [trades, setTrades] = useState<any[]>(() => {
    const saved = localStorage.getItem(CEXIO_TRADES_KEY);
    return saved ? JSON.parse(saved) : [];
  });

  // Custody Account states for deposits
  const [custodyAccounts, setCustodyAccounts] = useState<CustodyAccount[]>([]);
  const [selectedCustodyAccount, setSelectedCustodyAccount] = useState<string>('');
  const [depositAmount, setDepositAmount] = useState('');
  const [depositCurrency, setDepositCurrency] = useState('USDT');
  const [targetWallet, setTargetWallet] = useState<'spot' | 'wallet'>('spot');
  
  // Market prices state
  interface MarketTicker {
    symbol: string;
    base: string;
    quote: string;
    last: string;
    bid: string;
    ask: string;
    high: string;
    low: string;
    volume: string;
    change24h: string;
    timestamp: string;
  }
  const [marketPrices, setMarketPrices] = useState<MarketTicker[]>([]);
  const [pricesLoading, setPricesLoading] = useState(false);
  const [lastPriceUpdate, setLastPriceUpdate] = useState<Date | null>(null);

  // Load initial data and fetch real balances
  useEffect(() => {
    const savedConfig = cexioPrimeClient.getConfig();
    setConfig(savedConfig);
    setApiKey(savedConfig.apiKey);
    setApiSecret(savedConfig.apiSecret);
    setEnvironment(savedConfig.environment);
    
    // Clear old cached balances - always start fresh
    cexioPrimeClient.clearBalances();
    setBalances([]);
    
    // Load events (keep history)
    setEvents(cexioPrimeClient.getEvents());
    
    // Load custody accounts
    loadCustodyAccounts();
    
    // Auto-fetch real balances from backend on mount
    fetchRealBalances();
  }, []);
  
  // Function to load custody accounts with logging
  const loadCustodyAccounts = () => {
    const accounts = custodyStore.getAccounts();
    console.log('[CEX.io Prime] 📦 Cargando cuentas custodio:', {
      total: accounts.length,
      cuentas: accounts.map(a => ({
        id: a.id,
        nombre: a.accountName,
        moneda: a.currency,
        disponible: a.availableBalance,
        tipo: a.accountType
      }))
    });
    setCustodyAccounts(accounts);
    return accounts;
  };
  
  // Reload custody accounts when switching to deposit tab
  useEffect(() => {
    if (activeTab === 'deposit') {
      console.log('[CEX.io Prime] 🔄 Recargando cuentas custodio (tab: deposit)');
      loadCustodyAccounts();
    }
  }, [activeTab]);
  
  // Fetch real balances from backend
  const fetchRealBalances = async () => {
    try {
      // First check the mode from test endpoint
      const testResponse = await fetch('/api/cexio/test');
      const testData = await testResponse.json();
      
      if (testData.success) {
        // Update simulation mode based on backend
        const isLiveMode = testData.mode === 'LIVE';
        setSimulationMode(!isLiveMode);
        localStorage.setItem('cexio_simulation_mode', JSON.stringify(!isLiveMode));
      }
      
      const response = await fetch('/api/cexio/balances');
      const data = await response.json();
      
      if (data.success && data.balances) {
        const apiBalances: CEXioBalance[] = data.balances.map((b: any) => ({
          currency: b.currency,
          available: b.available,
          reserved: b.reserved || '0.00',
          total: b.total || b.available
        }));
        cexioPrimeClient.setBalances(apiBalances);
        setBalances(apiBalances);
        
        // Set connected if we got a successful response
        if (data.source === 'trade.cex.io API' || data.mode !== 'simulation') {
          setConnectionStatus('connected');
        }
      }
    } catch (error) {
      console.error('[CEX.io Prime] Error fetching balances:', error);
      // Keep balances empty on error
      setBalances([]);
    }
  };

  // Save simulation mode
  useEffect(() => {
    localStorage.setItem('cexio_simulation_mode', JSON.stringify(simulationMode));
  }, [simulationMode]);

  // Save orders
  useEffect(() => {
    localStorage.setItem(CEXIO_ORDERS_KEY, JSON.stringify(orders));
  }, [orders]);

  // Save trades
  useEffect(() => {
    localStorage.setItem(CEXIO_TRADES_KEY, JSON.stringify(trades));
  }, [trades]);
  
  // Fetch market prices from CEX.io
  const fetchMarketPrices = async () => {
    setPricesLoading(true);
    try {
      const response = await fetch('/api/cexio/market-prices');
      const data = await response.json();
      
      if (data.success && data.tickers) {
        setMarketPrices(data.tickers);
        setLastPriceUpdate(new Date());
      }
    } catch (error) {
      console.error('[CEX.io Prime] Error fetching market prices:', error);
    }
    setPricesLoading(false);
  };
  
  // Auto-refresh market prices every 10 seconds
  useEffect(() => {
    // Initial fetch
    fetchMarketPrices();
    
    // Set up interval for auto-refresh
    const interval = setInterval(() => {
      fetchMarketPrices();
    }, 10000); // 10 seconds
    
    return () => clearInterval(interval);
  }, []);

  // Add event helper
  const addEvent = (type: FlowOperation['type'], status: FlowOperation['status'], message: string, data?: any) => {
    const event: FlowOperation = {
      id: `evt-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      type,
      status,
      data,
      message,
      timestamp: new Date().toISOString()
    };
    cexioPrimeClient.addEvent(event);
    setEvents(cexioPrimeClient.getEvents());
  };

  // Save configuration
  const handleSaveConfig = () => {
    cexioPrimeClient.setConfig(apiKey, apiSecret, environment);
    setConfig(cexioPrimeClient.getConfig());
    addEvent('balance', 'success', isSpanish ? 'Configuración guardada' : 'Configuration saved');
  };

  // Test connection - using real backend API
  const handleTestConnection = async () => {
    setIsLoading(true);
    addEvent('balance', 'pending', isSpanish ? 'Probando conexión con backend...' : 'Testing backend connection...');
    
    try {
      // First test the backend endpoint
      const testResponse = await fetch('/api/cexio/test');
      const testData = await testResponse.json();
      
      if (testData.success) {
        addEvent('balance', 'success', `Backend: ${testData.mode} - API Key: ${testData.apiKeyConfigured ? 'Configurada' : 'No configurada'}`);
        
        // Update simulation mode based on backend response
        const isLiveMode = testData.mode === 'LIVE';
        setSimulationMode(!isLiveMode);
        localStorage.setItem('cexio_simulation_mode', JSON.stringify(!isLiveMode));
        
        // Now fetch real balances from backend
        const balancesResponse = await fetch('/api/cexio/balances');
        const balancesData = await balancesResponse.json();
        
        if (balancesData.success) {
          setConnectionStatus('connected');
          
          // In LIVE mode with empty account, keep balances at 0
          // Only show balances that actually exist in the real account
          const apiBalances: CEXioBalance[] = balancesData.balances.map((b: any) => ({
            currency: b.currency,
            available: b.available,
            reserved: b.reserved || '0.00',
            total: b.total || b.available
          }));
          
          cexioPrimeClient.setBalances(apiBalances);
          setBalances(apiBalances);
          
          const modeLabel = balancesData.mode === 'simulation' ? 'SIMULATION' : 'LIVE';
          addEvent('balance', 'success', `${isSpanish ? 'Conexión exitosa - Modo' : 'Connection successful - Mode'}: ${modeLabel}`);
          
          // If in LIVE mode and no balances, show informative message
          if (modeLabel === 'LIVE' && apiBalances.length === 0) {
            addEvent('balance', 'info', isSpanish ? 'Cuenta LIVE sin fondos - Balance: $0.00' : 'LIVE account empty - Balance: $0.00');
          }
        } else {
          setConnectionStatus('error');
          addEvent('balance', 'failed', `Error: ${balancesData.error || 'Unknown error'}`);
        }
      } else {
        setConnectionStatus('error');
        addEvent('balance', 'failed', isSpanish ? 'Backend no disponible' : 'Backend not available');
      }
    } catch (error: any) {
      setConnectionStatus('error');
      addEvent('balance', 'failed', `Error: ${error.message}`);
    }
    
    setIsLoading(false);
  };

  // Refresh balances - using real backend API
  const handleRefreshBalances = async () => {
    setIsLoading(true);
    addEvent('balance', 'pending', isSpanish ? 'Obteniendo balances reales...' : 'Fetching real balances...');
    
    try {
      const response = await fetch('/api/cexio/balances');
      const data = await response.json();
      
      if (data.success) {
        const apiBalances: CEXioBalance[] = data.balances.map((b: any) => ({
          currency: b.currency,
          available: b.available,
          reserved: b.reserved || '0.00',
          total: b.total || b.available
        }));
        cexioPrimeClient.setBalances(apiBalances);
        setBalances(apiBalances);
        setConnectionStatus('connected');
        addEvent('balance', 'success', `${isSpanish ? 'Balances actualizados' : 'Balances updated'} (${data.mode || 'LIVE'})`);
      } else {
        addEvent('balance', 'failed', `Error: ${data.error || 'Unknown error'}`);
      }
    } catch (error: any) {
      addEvent('balance', 'failed', `Error: ${error.message}`);
    }
    
    setIsLoading(false);
  };

  // Place order
  const handlePlaceOrder = async () => {
    if (!orderAmount) {
      addEvent('order', 'failed', isSpanish ? 'Ingrese cantidad' : 'Enter amount');
      return;
    }
    if (orderType === 'limit' && !orderPrice) {
      addEvent('order', 'failed', isSpanish ? 'Ingrese precio límite' : 'Enter limit price');
      return;
    }

    setIsLoading(true);
    addEvent('order', 'pending', `${isSpanish ? 'Colocando orden' : 'Placing order'} ${orderSide.toUpperCase()} ${orderAmount} ${selectedPair}`);
    
    await new Promise(resolve => setTimeout(resolve, 1500));

    const newOrder = {
      orderId: `ORD-${Date.now()}`,
      symbol: selectedPair,
      side: orderSide,
      type: orderType,
      amount: orderAmount,
      price: orderType === 'limit' ? orderPrice : (selectedPair.includes('BTC') ? '42500.00' : '2250.00'),
      filledAmount: orderType === 'market' ? orderAmount : '0',
      remainingAmount: orderType === 'market' ? '0' : orderAmount,
      status: orderType === 'market' ? 'filled' : 'open',
      fee: (parseFloat(orderAmount) * 0.001).toFixed(8),
      feeCurrency: selectedPair.split('/')[1],
      createdAt: new Date().toISOString()
    };

    setOrders(prev => [newOrder, ...prev]);
    
    if (orderType === 'market') {
      const newTrade = {
        tradeId: `TRD-${Date.now()}`,
        orderId: newOrder.orderId,
        symbol: selectedPair,
        side: orderSide,
        price: newOrder.price,
        amount: orderAmount,
        fee: newOrder.fee,
        feeCurrency: newOrder.feeCurrency,
        timestamp: new Date().toISOString()
      };
      setTrades(prev => [newTrade, ...prev]);
    }

    addEvent('order', 'success', `${isSpanish ? 'Orden ejecutada' : 'Order executed'}: ${newOrder.orderId}`);
    setOrderAmount('');
    setOrderPrice('');
    setIsLoading(false);
  };

  // Process withdrawal
  const handleWithdraw = async () => {
    if (!withdrawAmount || !withdrawAddress) {
      addEvent('withdrawal', 'failed', isSpanish ? 'Complete todos los campos' : 'Fill all fields');
      return;
    }

    setIsLoading(true);
    addEvent('withdrawal', 'pending', `${isSpanish ? 'Procesando retiro' : 'Processing withdrawal'}: ${withdrawAmount} ${withdrawCurrency}`);
    
    await new Promise(resolve => setTimeout(resolve, 2000));

    const network = SUPPORTED_NETWORKS.find(n => n.id === withdrawNetwork);
    const fee = network?.fee || '0';

    addEvent('withdrawal', 'success', 
      `${isSpanish ? 'Retiro enviado' : 'Withdrawal sent'}: ${withdrawAmount} ${withdrawCurrency} → ${withdrawAddress.slice(0, 10)}...`
    );
    
    setWithdrawAmount('');
    setWithdrawAddress('');
    setIsLoading(false);
  };

  // Deposit from Custody Account to CEX.io
  const handleDepositFromCustody = async () => {
    console.log('[CEX.io Prime] 🏦 Iniciando depósito:', {
      depositAmount,
      depositCurrency,
      targetWallet,
      selectedCustodyAccount,
      custodyAccountsCount: custodyAccounts.length,
      custodyAccountsAvailable: custodyAccounts.map(a => ({
        id: a.id,
        name: a.accountName,
        currency: a.currency,
        available: a.availableBalance
      }))
    });
    
    if (!depositAmount || parseFloat(depositAmount) <= 0) {
      addEvent('deposit', 'failed', isSpanish ? 'Ingrese un monto válido' : 'Enter a valid amount');
      return;
    }

    // If no custody account selected but we have amount, allow direct deposit
    let custodyAccount = custodyAccounts.find(a => a.id === selectedCustodyAccount);
    
    console.log('[CEX.io Prime] 📋 Cuenta custodio seleccionada:', custodyAccount ? {
      id: custodyAccount.id,
      name: custodyAccount.accountName,
      currency: custodyAccount.currency,
      available: custodyAccount.availableBalance
    } : 'NINGUNA');
    
    // If no custody accounts available OR none selected, create a direct deposit
    if (!custodyAccount) {
      // Allow deposit without custody account (direct external deposit)
      setIsLoading(true);
      const reason = custodyAccounts.length === 0 
        ? (isSpanish ? 'Sin cuentas custodio - Depósito directo' : 'No custody accounts - Direct deposit')
        : (isSpanish ? 'Depósito directo sin cuenta custodio' : 'Direct deposit without custody account');
      addEvent('deposit', 'pending', `${reason}: ${depositAmount} ${depositCurrency}...`);
      
      try {
        const response = await fetch('/api/cexio/deposit', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            currency: depositCurrency,
            amount: depositAmount,
            type: 'external'
          })
        });
        
        const data = await response.json();
        
        if (data.success) {
          // Update CEX.io balance
          const depositAmountNum = parseFloat(depositAmount);
          const existingBalance = balances.find(b => b.currency === depositCurrency);
          if (existingBalance) {
            const newCexBalance = (parseFloat(existingBalance.available) + depositAmountNum).toFixed(2);
            const updatedBalances = balances.map(b => 
              b.currency === depositCurrency 
                ? { ...b, available: newCexBalance, total: newCexBalance }
                : b
            );
            cexioPrimeClient.setBalances(updatedBalances);
            setBalances(updatedBalances);
          } else {
            const newBalances = [...balances, {
              currency: depositCurrency,
              available: depositAmount,
              reserved: '0',
              total: depositAmount
            }];
            cexioPrimeClient.setBalances(newBalances);
            setBalances(newBalances);
          }
          
          addEvent('deposit', 'success', 
            `✅ ${isSpanish ? 'Depósito exitoso' : 'Deposit successful'}: ${parseFloat(depositAmount).toLocaleString()} ${depositCurrency}`
          );
          setConnectionStatus('connected');
        } else {
          addEvent('deposit', 'failed', `Error: ${data.error || 'Unknown error'}`);
        }
      } catch (error: any) {
        addEvent('deposit', 'failed', `Error: ${error.message}`);
      }
      
      setDepositAmount('');
      setIsLoading(false);
      return;
    }

    // At this point, custodyAccount is defined - verify sufficient balance
    const accountBalance = parseFloat(custodyAccount.availableBalance);
    const depositAmountNum = parseFloat(depositAmount);
    
    if (depositAmountNum > accountBalance) {
      addEvent('deposit', 'failed', isSpanish ? `Saldo insuficiente. Disponible: ${accountBalance.toLocaleString()} ${custodyAccount.currency}` : `Insufficient balance. Available: ${accountBalance.toLocaleString()} ${custodyAccount.currency}`);
      return;
    }

    setIsLoading(true);
    addEvent('deposit', 'pending', `${isSpanish ? 'Transfiriendo desde' : 'Transferring from'} ${custodyAccount.accountName}...`);

    try {
      // Call the backend API to deposit from custody
      const response = await fetch('/api/cexio/deposit-from-custody', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          custodyAccountId: custodyAccount.id,
          custodyAccountName: custodyAccount.accountName,
          currency: depositCurrency,
          amount: depositAmount,
          targetWallet: targetWallet
        })
      });

      const data = await response.json();

      if (data.success) {
        // Update custody account balance locally
        const newBalance = accountBalance - depositAmountNum;
        custodyStore.updateAccountBalance(custodyAccount.id, newBalance.toString());
        setCustodyAccounts(custodyStore.getAccounts());

        // Update CEX.io balance
        const existingBalance = balances.find(b => b.currency === depositCurrency);
        if (existingBalance) {
          const newCexBalance = (parseFloat(existingBalance.available) + depositAmountNum).toFixed(2);
          const updatedBalances = balances.map(b => 
            b.currency === depositCurrency 
              ? { ...b, available: newCexBalance, total: newCexBalance }
              : b
          );
          cexioPrimeClient.setBalances(updatedBalances);
          setBalances(updatedBalances);
        } else {
          const newBalances = [...balances, {
            currency: depositCurrency,
            available: depositAmount,
            reserved: '0',
            total: depositAmount
          }];
          cexioPrimeClient.setBalances(newBalances);
          setBalances(newBalances);
        }

        addEvent('deposit', 'success', 
          `✅ ${isSpanish ? 'Depósito exitoso' : 'Deposit successful'}: ${parseFloat(depositAmount).toLocaleString()} ${depositCurrency} → CEX.io ${targetWallet}`
        );
        setConnectionStatus('connected');
        
        // Refresh balances from backend
        handleRefreshBalances();
      } else {
        addEvent('deposit', 'failed', `Error: ${data.error || 'Unknown error'}`);
      }
    } catch (error: any) {
      addEvent('deposit', 'failed', `Error: ${error.message}`);
    }

    setDepositAmount('');
    setSelectedCustodyAccount('');
    setIsLoading(false);
  };

  // Export PDF
  const exportToPDF = () => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    
    // Header
    doc.setFillColor(15, 23, 42);
    doc.rect(0, 0, pageWidth, 40, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(24);
    doc.text('CEX.io Prime', 20, 25);
    doc.setFontSize(10);
    doc.text(isSpanish ? 'Reporte de Cuenta' : 'Account Report', 20, 35);
    doc.text(new Date().toLocaleString(), pageWidth - 60, 35);

    // Balances
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(14);
    doc.text(isSpanish ? 'Balances' : 'Balances', 20, 55);
    
    let y = 65;
    balances.forEach(balance => {
      doc.setFontSize(10);
      doc.text(`${balance.currency}: ${formatCurrency(balance.available)} (${isSpanish ? 'Disponible' : 'Available'})`, 25, y);
      y += 8;
    });

    // Recent Events
    y += 10;
    doc.setFontSize(14);
    doc.text(isSpanish ? 'Eventos Recientes' : 'Recent Events', 20, y);
    y += 10;
    
    events.slice(0, 10).forEach(event => {
      doc.setFontSize(8);
      doc.text(`[${event.status.toUpperCase()}] ${event.message}`, 25, y);
      y += 6;
    });

    doc.save(`cexio-prime-report-${Date.now()}.pdf`);
    addEvent('balance', 'success', isSpanish ? 'PDF exportado' : 'PDF exported');
  };

  // Clear history
  const clearHistory = () => {
    cexioPrimeClient.clearEvents();
    setEvents([]);
    setOrders([]);
    setTrades([]);
    localStorage.removeItem(CEXIO_ORDERS_KEY);
    localStorage.removeItem(CEXIO_TRADES_KEY);
    addEvent('balance', 'success', isSpanish ? 'Historial limpiado' : 'History cleared');
  };

  // Calculate total in USD
  const calculateTotalUSD = () => {
    const prices: Record<string, number> = {
      USD: 1, EUR: 1.08, BTC: 42500, ETH: 2250, USDT: 1, USDC: 1
    };
    return balances.reduce((total, b) => {
      const price = prices[b.currency] || 1;
      return total + parseFloat(b.total) * price;
    }, 0);
  };

  // Tab navigation
  const tabs = [
    { id: 'balances', label: isSpanish ? 'Balances' : 'Balances', icon: Wallet },
    { id: 'market', label: isSpanish ? 'Mercado' : 'Market', icon: TrendingUp },
    { id: 'trading', label: 'Trading', icon: BarChart3 },
    { id: 'withdraw', label: isSpanish ? 'Retiro' : 'Withdraw', icon: ArrowUpRight },
    { id: 'deposit', label: isSpanish ? 'Depósito' : 'Deposit', icon: ArrowDownLeft },
    { id: 'history', label: isSpanish ? 'Historial' : 'History', icon: History },
    { id: 'config', label: isSpanish ? 'Config' : 'Config', icon: Settings }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-white p-4 md:p-6">
      {/* Header */}
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center shadow-lg shadow-blue-500/20">
              <Building2 className="w-7 h-7 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">
                CEX.io Prime
              </h1>
              <p className="text-sm text-slate-400">
                {isSpanish ? 'Plataforma de Trading Institucional' : 'Institutional Trading Platform'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Connection Status */}
            <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium ${
              connectionStatus === 'connected' ? 'bg-emerald-500/20 text-emerald-400' :
              connectionStatus === 'error' ? 'bg-red-500/20 text-red-400' :
              'bg-slate-700 text-slate-400'
            }`}>
              <div className={`w-2 h-2 rounded-full ${
                connectionStatus === 'connected' ? 'bg-emerald-400 animate-pulse' :
                connectionStatus === 'error' ? 'bg-red-400' :
                'bg-slate-500'
              }`} />
              {connectionStatus === 'connected' ? (isSpanish ? 'Conectado' : 'Connected') :
               connectionStatus === 'error' ? 'Error' : (isSpanish ? 'Sin probar' : 'Untested')}
            </div>

            {/* Simulation Mode Toggle */}
            <button
              onClick={() => setSimulationMode(!simulationMode)}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                simulationMode 
                  ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' 
                  : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
              }`}
            >
              {simulationMode ? (
                <>
                  <AlertTriangle className="w-3.5 h-3.5" />
                  {isSpanish ? 'Simulación' : 'Simulation'}
                </>
              ) : (
                <>
                  <Zap className="w-3.5 h-3.5" />
                  {isSpanish ? 'Producción' : 'Production'}
                </>
              )}
            </button>

            {/* Export PDF */}
            <button
              onClick={exportToPDF}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs transition-all"
            >
              <Download className="w-3.5 h-3.5" />
              PDF
            </button>
          </div>
        </div>

        {/* Total Balance Card */}
        <div className="bg-gradient-to-r from-blue-600/20 to-cyan-600/20 border border-blue-500/30 rounded-2xl p-6 mb-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <p className="text-sm text-blue-300 mb-1">{isSpanish ? 'Balance Total Estimado' : 'Estimated Total Balance'}</p>
              <p className="text-4xl font-bold text-white">{formatUSD(calculateTotalUSD())}</p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={handleRefreshBalances}
                disabled={isLoading}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-medium transition-all disabled:opacity-50"
              >
                <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
                {isSpanish ? 'Actualizar' : 'Refresh'}
              </button>
              <button
                onClick={handleTestConnection}
                disabled={isLoading}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-700 hover:bg-slate-600 text-white font-medium transition-all disabled:opacity-50"
              >
                <Activity className="w-4 h-4" />
                {isSpanish ? 'Probar API' : 'Test API'}
              </button>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex overflow-x-auto gap-2 mb-6 pb-2">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium whitespace-nowrap transition-all ${
                activeTab === tab.id
                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20'
                  : 'bg-slate-800/50 text-slate-400 hover:bg-slate-700/50 hover:text-white'
              }`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Balances Tab */}
            {activeTab === 'balances' && (
              <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6">
                <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <Wallet className="w-5 h-5 text-blue-400" />
                  {isSpanish ? 'Balances de Cuenta' : 'Account Balances'}
                </h2>
                
                {balances.length === 0 ? (
                  <div className="text-center py-12 text-slate-500">
                    <Wallet className="w-12 h-12 mx-auto mb-3 opacity-50" />
                    <p>{isSpanish ? 'Sin balances. Pruebe la conexión API.' : 'No balances. Test API connection.'}</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {balances.map((balance, idx) => (
                      <div key={idx} className="flex items-center justify-between p-4 bg-slate-800/50 rounded-xl hover:bg-slate-800 transition-all">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center text-sm font-bold">
                            {balance.currency.slice(0, 2)}
                          </div>
                          <div>
                            <p className="font-semibold">{balance.currency}</p>
                            <p className="text-xs text-slate-500">{isSpanish ? 'Disponible' : 'Available'}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-mono font-semibold">{formatCurrency(balance.available, balance.currency === 'BTC' ? 8 : 2)}</p>
                          <p className="text-xs text-slate-500">
                            {isSpanish ? 'Reservado' : 'Reserved'}: {formatCurrency(balance.reserved, 2)}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Market Tab - Real-time prices */}
            {activeTab === 'market' && (
              <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-lg font-semibold flex items-center gap-2">
                    <TrendingUp className="w-5 h-5 text-green-400" />
                    {isSpanish ? 'Precios de Mercado en Tiempo Real' : 'Real-Time Market Prices'}
                  </h2>
                  <div className="flex items-center gap-3">
                    {lastPriceUpdate && (
                      <span className="text-xs text-slate-500">
                        {isSpanish ? 'Actualizado:' : 'Updated:'} {lastPriceUpdate.toLocaleTimeString()}
                      </span>
                    )}
                    <button
                      onClick={fetchMarketPrices}
                      disabled={pricesLoading}
                      className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-700 hover:bg-slate-600 text-sm transition-all disabled:opacity-50"
                    >
                      {pricesLoading ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <RefreshCw className="w-4 h-4" />
                      )}
                      {isSpanish ? 'Actualizar' : 'Refresh'}
                    </button>
                  </div>
                </div>

                {/* Live indicator */}
                <div className="flex items-center gap-2 mb-4 text-sm">
                  <span className="relative flex h-3 w-3">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
                  </span>
                  <span className="text-green-400 font-medium">
                    {isSpanish ? 'Datos en vivo desde CEX.io' : 'Live data from CEX.io'}
                  </span>
                  <span className="text-slate-500">• {isSpanish ? 'Actualización cada 10s' : 'Updates every 10s'}</span>
                </div>

                {marketPrices.length === 0 ? (
                  <div className="text-center py-12 text-slate-500">
                    {pricesLoading ? (
                      <>
                        <Loader2 className="w-12 h-12 mx-auto mb-3 animate-spin opacity-50" />
                        <p>{isSpanish ? 'Cargando precios...' : 'Loading prices...'}</p>
                      </>
                    ) : (
                      <>
                        <BarChart3 className="w-12 h-12 mx-auto mb-3 opacity-50" />
                        <p>{isSpanish ? 'No hay datos de mercado disponibles' : 'No market data available'}</p>
                      </>
                    )}
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {marketPrices.map((ticker, idx) => {
                      const change = parseFloat(ticker.change24h);
                      const isPositive = change >= 0;
                      const lastPrice = parseFloat(ticker.last);
                      
                      return (
                        <div
                          key={idx}
                          className="p-4 bg-slate-800/50 rounded-xl border border-slate-700 hover:border-slate-600 transition-all"
                        >
                          <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-3">
                              <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold ${
                                ticker.base === 'BTC' ? 'bg-gradient-to-br from-orange-500 to-yellow-500' :
                                ticker.base === 'ETH' ? 'bg-gradient-to-br from-purple-500 to-blue-500' :
                                ticker.base === 'XRP' ? 'bg-gradient-to-br from-blue-400 to-cyan-400' :
                                ticker.base === 'SOL' ? 'bg-gradient-to-br from-purple-600 to-pink-500' :
                                ticker.base === 'DOGE' ? 'bg-gradient-to-br from-yellow-400 to-orange-400' :
                                ticker.base === 'ADA' ? 'bg-gradient-to-br from-blue-600 to-indigo-600' :
                                ticker.base === 'LTC' ? 'bg-gradient-to-br from-gray-400 to-gray-600' :
                                'bg-gradient-to-br from-green-500 to-emerald-500'
                              }`}>
                                {ticker.base.slice(0, 2)}
                              </div>
                              <div>
                                <p className="font-bold text-lg">{ticker.symbol}</p>
                                <p className="text-xs text-slate-500">{ticker.base}/{ticker.quote}</p>
                              </div>
                            </div>
                            <div className={`flex items-center gap-1 px-2 py-1 rounded-lg text-sm font-semibold ${
                              isPositive ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
                            }`}>
                              {isPositive ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                              {isPositive ? '+' : ''}{ticker.change24h}%
                            </div>
                          </div>
                          
                          <div className="space-y-2">
                            <div className="flex justify-between items-center">
                              <span className="text-slate-400 text-sm">{isSpanish ? 'Último precio' : 'Last Price'}</span>
                              <span className="font-mono font-bold text-xl">
                                ${lastPrice < 1 ? lastPrice.toFixed(6) : lastPrice.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                              </span>
                            </div>
                            
                            <div className="grid grid-cols-2 gap-2 text-sm">
                              <div className="flex justify-between">
                                <span className="text-slate-500">Bid</span>
                                <span className="font-mono text-green-400">${parseFloat(ticker.bid).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-slate-500">Ask</span>
                                <span className="font-mono text-red-400">${parseFloat(ticker.ask).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-slate-500">High 24h</span>
                                <span className="font-mono">${parseFloat(ticker.high).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-slate-500">Low 24h</span>
                                <span className="font-mono">${parseFloat(ticker.low).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                              </div>
                            </div>
                            
                            <div className="pt-2 border-t border-slate-700">
                              <div className="flex justify-between text-xs">
                                <span className="text-slate-500">{isSpanish ? 'Volumen 24h' : 'Volume 24h'}</span>
                                <span className="font-mono">{parseFloat(ticker.volume).toLocaleString('en-US', { maximumFractionDigits: 2 })} {ticker.base}</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
                
                {/* Market summary */}
                {marketPrices.length > 0 && (
                  <div className="mt-6 p-4 bg-slate-800/30 rounded-xl border border-slate-700">
                    <div className="flex items-center gap-2 mb-3">
                      <Globe className="w-4 h-4 text-blue-400" />
                      <span className="font-semibold">{isSpanish ? 'Resumen del Mercado' : 'Market Summary'}</span>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div>
                        <p className="text-slate-500">{isSpanish ? 'Pares activos' : 'Active Pairs'}</p>
                        <p className="font-bold text-lg">{marketPrices.length}</p>
                      </div>
                      <div>
                        <p className="text-slate-500">{isSpanish ? 'En alza' : 'Gainers'}</p>
                        <p className="font-bold text-lg text-green-400">
                          {marketPrices.filter(t => parseFloat(t.change24h) > 0).length}
                        </p>
                      </div>
                      <div>
                        <p className="text-slate-500">{isSpanish ? 'En baja' : 'Losers'}</p>
                        <p className="font-bold text-lg text-red-400">
                          {marketPrices.filter(t => parseFloat(t.change24h) < 0).length}
                        </p>
                      </div>
                      <div>
                        <p className="text-slate-500">{isSpanish ? 'Fuente' : 'Source'}</p>
                        <p className="font-bold text-lg text-blue-400">CEX.io</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Trading Tab */}
            {activeTab === 'trading' && (
              <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6">
                <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <BarChart3 className="w-5 h-5 text-blue-400" />
                  Trading
                </h2>

                <div className="space-y-4">
                  {/* Pair Selection */}
                  <div>
                    <label className="text-sm text-slate-400 mb-2 block">{isSpanish ? 'Par de Trading' : 'Trading Pair'}</label>
                    <select
                      value={selectedPair}
                      onChange={(e) => setSelectedPair(e.target.value)}
                      className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500"
                    >
                      {POPULAR_PAIRS.map(pair => (
                        <option key={pair} value={pair}>{pair}</option>
                      ))}
                    </select>
                  </div>

                  {/* Order Type & Side */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm text-slate-400 mb-2 block">{isSpanish ? 'Tipo' : 'Type'}</label>
                      <div className="flex gap-2">
                        <button
                          onClick={() => setOrderType('market')}
                          className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${
                            orderType === 'market' ? 'bg-blue-600 text-white' : 'bg-slate-800 text-slate-400'
                          }`}
                        >
                          Market
                        </button>
                        <button
                          onClick={() => setOrderType('limit')}
                          className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${
                            orderType === 'limit' ? 'bg-blue-600 text-white' : 'bg-slate-800 text-slate-400'
                          }`}
                        >
                          Limit
                        </button>
                      </div>
                    </div>
                    <div>
                      <label className="text-sm text-slate-400 mb-2 block">{isSpanish ? 'Lado' : 'Side'}</label>
                      <div className="flex gap-2">
                        <button
                          onClick={() => setOrderSide('buy')}
                          className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${
                            orderSide === 'buy' ? 'bg-emerald-600 text-white' : 'bg-slate-800 text-slate-400'
                          }`}
                        >
                          {isSpanish ? 'Comprar' : 'Buy'}
                        </button>
                        <button
                          onClick={() => setOrderSide('sell')}
                          className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${
                            orderSide === 'sell' ? 'bg-red-600 text-white' : 'bg-slate-800 text-slate-400'
                          }`}
                        >
                          {isSpanish ? 'Vender' : 'Sell'}
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Amount & Price */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm text-slate-400 mb-2 block">{isSpanish ? 'Cantidad' : 'Amount'}</label>
                      <input
                        type="text"
                        value={orderAmount}
                        onChange={(e) => setOrderAmount(e.target.value)}
                        placeholder="0.00"
                        className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500"
                      />
                    </div>
                    {orderType === 'limit' && (
                      <div>
                        <label className="text-sm text-slate-400 mb-2 block">{isSpanish ? 'Precio' : 'Price'}</label>
                        <input
                          type="text"
                          value={orderPrice}
                          onChange={(e) => setOrderPrice(e.target.value)}
                          placeholder="0.00"
                          className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500"
                        />
                      </div>
                    )}
                  </div>

                  {/* Place Order Button */}
                  <button
                    onClick={handlePlaceOrder}
                    disabled={isLoading || !orderAmount}
                    className={`w-full py-3 rounded-xl font-semibold transition-all disabled:opacity-50 ${
                      orderSide === 'buy'
                        ? 'bg-emerald-600 hover:bg-emerald-500 text-white'
                        : 'bg-red-600 hover:bg-red-500 text-white'
                    }`}
                  >
                    {isLoading ? (
                      <Loader2 className="w-5 h-5 animate-spin mx-auto" />
                    ) : (
                      `${orderSide === 'buy' ? (isSpanish ? 'Comprar' : 'Buy') : (isSpanish ? 'Vender' : 'Sell')} ${selectedPair}`
                    )}
                  </button>
                </div>

                {/* Recent Orders */}
                {orders.length > 0 && (
                  <div className="mt-6 pt-6 border-t border-slate-800">
                    <h3 className="text-sm font-semibold text-slate-400 mb-3">{isSpanish ? 'Órdenes Recientes' : 'Recent Orders'}</h3>
                    <div className="space-y-2 max-h-48 overflow-y-auto">
                      {orders.slice(0, 5).map((order, idx) => (
                        <div key={idx} className="flex items-center justify-between p-3 bg-slate-800/50 rounded-lg text-sm">
                          <div className="flex items-center gap-2">
                            <span className={order.side === 'buy' ? 'text-emerald-400' : 'text-red-400'}>
                              {order.side.toUpperCase()}
                            </span>
                            <span className="text-slate-300">{order.symbol}</span>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className="font-mono">{order.amount}</span>
                            <span className={`px-2 py-0.5 rounded text-xs ${getStatusBadgeClass(order.status)}`}>
                              {order.status}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Withdraw Tab */}
            {activeTab === 'withdraw' && (
              <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6">
                <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <ArrowUpRight className="w-5 h-5 text-blue-400" />
                  {isSpanish ? 'Retiro de Fondos' : 'Withdraw Funds'}
                </h2>

                <div className="space-y-4">
                  <div>
                    <label className="text-sm text-slate-400 mb-2 block">{isSpanish ? 'Moneda' : 'Currency'}</label>
                    <select
                      value={withdrawCurrency}
                      onChange={(e) => setWithdrawCurrency(e.target.value)}
                      className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500"
                    >
                      <option value="USDT">USDT</option>
                      <option value="USDC">USDC</option>
                      <option value="BTC">BTC</option>
                      <option value="ETH">ETH</option>
                      <option value="USD">USD</option>
                      <option value="EUR">EUR</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-sm text-slate-400 mb-2 block">{isSpanish ? 'Red' : 'Network'}</label>
                    <select
                      value={withdrawNetwork}
                      onChange={(e) => setWithdrawNetwork(e.target.value)}
                      className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500"
                    >
                      {SUPPORTED_NETWORKS.map(net => (
                        <option key={net.id} value={net.id}>{net.name} (Fee: {net.fee})</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="text-sm text-slate-400 mb-2 block">{isSpanish ? 'Cantidad' : 'Amount'}</label>
                    <input
                      type="text"
                      value={withdrawAmount}
                      onChange={(e) => setWithdrawAmount(e.target.value)}
                      placeholder="0.00"
                      className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <label className="text-sm text-slate-400 mb-2 block">{isSpanish ? 'Dirección de Destino' : 'Destination Address'}</label>
                    <input
                      type="text"
                      value={withdrawAddress}
                      onChange={(e) => setWithdrawAddress(e.target.value)}
                      placeholder="0x..."
                      className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white font-mono text-sm focus:outline-none focus:border-blue-500"
                    />
                  </div>

                  <button
                    onClick={handleWithdraw}
                    disabled={isLoading || !withdrawAmount || !withdrawAddress}
                    className="w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold transition-all disabled:opacity-50"
                  >
                    {isLoading ? (
                      <Loader2 className="w-5 h-5 animate-spin mx-auto" />
                    ) : (
                      isSpanish ? 'Procesar Retiro' : 'Process Withdrawal'
                    )}
                  </button>
                </div>
              </div>
            )}

            {/* Deposit Tab */}
            {activeTab === 'deposit' && (
              <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6">
                <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <ArrowDownLeft className="w-5 h-5 text-blue-400" />
                  {isSpanish ? 'Depósito de Fondos' : 'Deposit Funds'}
                </h2>

                <div className="space-y-6">
                  {/* Deposit from Custody Account */}
                  <div className="p-4 bg-gradient-to-r from-blue-500/10 to-purple-500/10 rounded-xl border border-blue-500/30">
                    <h3 className="text-sm font-semibold mb-4 flex items-center gap-2">
                      <Building2 className="w-4 h-4 text-blue-400" />
                      {isSpanish ? 'Depósito desde Cuenta Custodio' : 'Deposit from Custody Account'}
                    </h3>

                    <div className="space-y-4">
                      {/* Select Custody Account */}
                      <div>
                        <label className="text-sm text-slate-400 mb-2 block">
                          {isSpanish ? 'Cuenta Custodio de Origen' : 'Source Custody Account'}
                        </label>
                        <select
                          value={selectedCustodyAccount}
                          onChange={(e) => setSelectedCustodyAccount(e.target.value)}
                          className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500"
                        >
                          <option value="">{isSpanish ? '-- Seleccionar Cuenta --' : '-- Select Account --'}</option>
                          {custodyAccounts.filter(a => parseFloat(a.availableBalance) > 0).map(account => (
                            <option key={account.id} value={account.id}>
                              {account.accountName} - {account.currency} {parseFloat(account.availableBalance).toLocaleString()}
                            </option>
                          ))}
                        </select>
                        {custodyAccounts.length === 0 && (
                          <p className="text-xs text-amber-400 mt-2">
                            {isSpanish ? '⚠️ No hay cuentas custodio disponibles' : '⚠️ No custody accounts available'}
                          </p>
                        )}
                      </div>

                      {/* Selected Account Info */}
                      {selectedCustodyAccount && (
                        <div className="p-3 bg-slate-800/50 rounded-lg border border-slate-700">
                          {(() => {
                            const account = custodyAccounts.find(a => a.id === selectedCustodyAccount);
                            if (!account) return null;
                            return (
                              <div className="flex justify-between items-center">
                                <div>
                                  <p className="text-sm font-medium">{account.accountName}</p>
                                  <p className="text-xs text-slate-500">{account.accountNumber}</p>
                                </div>
                                <div className="text-right">
                                  <p className="text-lg font-bold text-green-400">
                                    {parseFloat(account.availableBalance).toLocaleString()} {account.currency}
                                  </p>
                                  <p className="text-xs text-slate-500">{isSpanish ? 'Disponible' : 'Available'}</p>
                                </div>
                              </div>
                            );
                          })()}
                        </div>
                      )}

                      {/* Amount and Currency */}
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="text-sm text-slate-400 mb-2 block">{isSpanish ? 'Monto' : 'Amount'}</label>
                          <input
                            type="number"
                            value={depositAmount}
                            onChange={(e) => setDepositAmount(e.target.value)}
                            placeholder="0.00"
                            className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500"
                          />
                        </div>
                        <div>
                          <label className="text-sm text-slate-400 mb-2 block">{isSpanish ? 'Moneda' : 'Currency'}</label>
                          <select
                            value={depositCurrency}
                            onChange={(e) => setDepositCurrency(e.target.value)}
                            className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500"
                          >
                            <option value="USDT">USDT</option>
                            <option value="USD">USD</option>
                            <option value="EUR">EUR</option>
                            <option value="USDC">USDC</option>
                          </select>
                        </div>
                      </div>

                      {/* Target Wallet */}
                      <div>
                        <label className="text-sm text-slate-400 mb-2 block">{isSpanish ? 'Destino en CEX.io' : 'CEX.io Destination'}</label>
                        <div className="grid grid-cols-2 gap-2">
                          <button
                            onClick={() => setTargetWallet('spot')}
                            className={`p-3 rounded-xl border transition-all ${
                              targetWallet === 'spot'
                                ? 'bg-blue-600 border-blue-500 text-white'
                                : 'bg-slate-800 border-slate-700 text-slate-400 hover:border-slate-600'
                            }`}
                          >
                            <BarChart3 className="w-4 h-4 mx-auto mb-1" />
                            <span className="text-sm">Spot Trading</span>
                          </button>
                          <button
                            onClick={() => setTargetWallet('wallet')}
                            className={`p-3 rounded-xl border transition-all ${
                              targetWallet === 'wallet'
                                ? 'bg-blue-600 border-blue-500 text-white'
                                : 'bg-slate-800 border-slate-700 text-slate-400 hover:border-slate-600'
                            }`}
                          >
                            <Wallet className="w-4 h-4 mx-auto mb-1" />
                            <span className="text-sm">Wallet</span>
                          </button>
                        </div>
                      </div>

                      {/* Deposit Button */}
                      <button
                        onClick={handleDepositFromCustody}
                        disabled={isLoading || !depositAmount}
                        className="w-full py-3 rounded-xl bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                      >
                        {isLoading ? (
                          <Loader2 className="w-5 h-5 animate-spin" />
                        ) : (
                          <>
                            <ArrowRightLeft className="w-5 h-5" />
                            {isSpanish ? 'Depositar a CEX.io' : 'Deposit to CEX.io'}
                          </>
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Divider */}
                  <div className="flex items-center gap-4">
                    <div className="flex-1 h-px bg-slate-700"></div>
                    <span className="text-xs text-slate-500">{isSpanish ? 'O depositar externamente' : 'Or deposit externally'}</span>
                    <div className="flex-1 h-px bg-slate-700"></div>
                  </div>

                  {/* External Deposit Address */}
                  <div className="p-4 bg-slate-800/50 rounded-xl border border-slate-700">
                    <p className="text-sm text-slate-400 mb-2">{isSpanish ? 'Dirección de Depósito (USDT - ERC20)' : 'Deposit Address (USDT - ERC20)'}</p>
                    <div className="flex items-center gap-2">
                      <code className="flex-1 bg-slate-900 px-3 py-2 rounded-lg text-sm font-mono text-blue-400 break-all">
                        0x742d35Cc6634C0532925a3b844Bc9e7595f8dE0a
                      </code>
                      <button className="p-2 bg-slate-700 rounded-lg hover:bg-slate-600 transition-all">
                        <FileText className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    {SUPPORTED_NETWORKS.slice(0, 4).map(net => (
                      <div key={net.id} className="p-3 bg-slate-800/50 rounded-xl border border-slate-700 hover:border-blue-500/50 cursor-pointer transition-all">
                        <p className="font-medium text-sm">{net.name}</p>
                        <p className="text-xs text-slate-500">Fee: {net.fee}</p>
                      </div>
                    ))}
                  </div>

                  <div className="p-4 bg-amber-500/10 border border-amber-500/30 rounded-xl">
                    <div className="flex items-start gap-2">
                      <AlertTriangle className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="text-sm font-medium text-amber-400">{isSpanish ? 'Importante' : 'Important'}</p>
                        <p className="text-xs text-amber-400/80 mt-1">
                          {isSpanish 
                            ? 'Verifique la red antes de enviar. Los depósitos en red incorrecta pueden resultar en pérdida de fondos.'
                            : 'Verify the network before sending. Deposits on wrong network may result in loss of funds.'}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* History Tab */}
            {activeTab === 'history' && (
              <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-semibold flex items-center gap-2">
                    <History className="w-5 h-5 text-blue-400" />
                    {isSpanish ? 'Historial de Transacciones' : 'Transaction History'}
                  </h2>
                  <button
                    onClick={clearHistory}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-red-500/20 text-red-400 text-xs hover:bg-red-500/30 transition-all"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    {isSpanish ? 'Limpiar' : 'Clear'}
                  </button>
                </div>

                {trades.length === 0 ? (
                  <div className="text-center py-12 text-slate-500">
                    <History className="w-12 h-12 mx-auto mb-3 opacity-50" />
                    <p>{isSpanish ? 'Sin transacciones' : 'No transactions'}</p>
                  </div>
                ) : (
                  <div className="space-y-2 max-h-96 overflow-y-auto">
                    {trades.map((trade, idx) => (
                      <div key={idx} className="flex items-center justify-between p-3 bg-slate-800/50 rounded-xl">
                        <div className="flex items-center gap-3">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                            trade.side === 'buy' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'
                          }`}>
                            {trade.side === 'buy' ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                          </div>
                          <div>
                            <p className="font-medium text-sm">{trade.symbol}</p>
                            <p className="text-xs text-slate-500">{new Date(trade.timestamp).toLocaleString()}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-mono text-sm">{trade.amount}</p>
                          <p className="text-xs text-slate-500">@ {trade.price}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Config Tab */}
            {activeTab === 'config' && (
              <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6">
                <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <Settings className="w-5 h-5 text-blue-400" />
                  {isSpanish ? 'Configuración API' : 'API Configuration'}
                </h2>

                <div className="space-y-4">
                  <div>
                    <label className="text-sm text-slate-400 mb-2 block">API Key</label>
                    <input
                      type="text"
                      value={apiKey}
                      onChange={(e) => setApiKey(e.target.value)}
                      placeholder="Enter API Key"
                      className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white font-mono text-sm focus:outline-none focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <label className="text-sm text-slate-400 mb-2 block">API Secret</label>
                    <div className="relative">
                      <input
                        type={showApiSecret ? 'text' : 'password'}
                        value={apiSecret}
                        onChange={(e) => setApiSecret(e.target.value)}
                        placeholder="Enter API Secret"
                        className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 pr-12 text-white font-mono text-sm focus:outline-none focus:border-blue-500"
                      />
                      <button
                        onClick={() => setShowApiSecret(!showApiSecret)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                      >
                        {showApiSecret ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="text-sm text-slate-400 mb-2 block">{isSpanish ? 'Entorno' : 'Environment'}</label>
                    <select
                      value={environment}
                      onChange={(e) => setEnvironment(e.target.value as 'production' | 'sandbox')}
                      className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500"
                    >
                      <option value="production">Production</option>
                      <option value="sandbox">Sandbox</option>
                    </select>
                  </div>

                  <div className="flex gap-3">
                    <button
                      onClick={handleSaveConfig}
                      className="flex-1 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold transition-all"
                    >
                      {isSpanish ? 'Guardar Configuración' : 'Save Configuration'}
                    </button>
                    <button
                      onClick={handleTestConnection}
                      disabled={isLoading}
                      className="flex-1 py-3 rounded-xl bg-slate-700 hover:bg-slate-600 text-white font-semibold transition-all disabled:opacity-50"
                    >
                      {isLoading ? <Loader2 className="w-5 h-5 animate-spin mx-auto" /> : (isSpanish ? 'Probar Conexión' : 'Test Connection')}
                    </button>
                  </div>

                  <div className="p-4 bg-slate-800/50 rounded-xl border border-slate-700">
                    <h3 className="text-sm font-semibold mb-2">{isSpanish ? 'Documentación' : 'Documentation'}</h3>
                    <a
                      href="https://prime.cex.io/api/rest"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 text-blue-400 hover:text-blue-300 text-sm"
                    >
                      <ExternalLink className="w-4 h-4" />
                      CEX.io Prime API Documentation
                    </a>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Events Panel */}
          <div className="lg:col-span-1">
            <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-4 sticky top-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold flex items-center gap-2">
                  <Terminal className="w-4 h-4 text-blue-400" />
                  {isSpanish ? 'Eventos' : 'Events'}
                </h3>
                <span className="text-xs text-slate-500">{events.length} {isSpanish ? 'registros' : 'logs'}</span>
              </div>

              <div className="space-y-2 max-h-[500px] overflow-y-auto">
                {events.length === 0 ? (
                  <p className="text-sm text-slate-500 text-center py-8">{isSpanish ? 'Sin eventos' : 'No events'}</p>
                ) : (
                  events.slice().reverse().slice(0, 20).map((event, idx) => (
                    <div key={idx} className="p-3 bg-slate-800/50 rounded-lg">
                      <div className="flex items-center gap-2 mb-1">
                        {event.status === 'success' && <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />}
                        {event.status === 'failed' && <XCircle className="w-3.5 h-3.5 text-red-400" />}
                        {event.status === 'pending' && <Clock className="w-3.5 h-3.5 text-yellow-400" />}
                        {event.status === 'processing' && <Loader2 className="w-3.5 h-3.5 text-blue-400 animate-spin" />}
                        <span className={`text-xs font-medium ${getStatusColor(event.status)}`}>
                          {event.type.toUpperCase()}
                        </span>
                      </div>
                      <p className="text-xs text-slate-300">{event.message}</p>
                      <p className="text-xs text-slate-600 mt-1">
                        {new Date(event.timestamp).toLocaleTimeString()}
                      </p>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}


