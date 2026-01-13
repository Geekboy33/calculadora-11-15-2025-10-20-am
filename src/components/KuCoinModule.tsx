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
  Wifi, WifiOff, Play, Square, Bell, Activity, Server, Database,
  Repeat, TrendingUp, TrendingDown, Search, ArrowDownUp, Loader2, X
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
import { custodyStore, CustodyAccount } from '../lib/custody-store';
import { kucoinSyncStore } from '../lib/kucoin-sync-store';
import jsPDF from 'jspdf';

// Constantes para localStorage
const KUCOIN_STORAGE_KEY = 'kucoin_module_data';
const KUCOIN_ACCOUNTS_KEY = 'kucoin_accounts';
const KUCOIN_FUNDING_KEY = 'kucoin_funding';

export default function KuCoinModule() {
  const { language } = useLanguage();
  const isSpanish = language === 'es';

  // Estados
  const [activeTab, setActiveTab] = useState<'funding' | 'fiat' | 'trading' | 'swap' | 'convert' | 'custody' | 'websocket' | 'history' | 'config' | 'docs'>('funding');
  const [config, setConfig] = useState<KuCoinConfig>(kucoinClient.getConfig());
  const [flows, setFlows] = useState<FiatToUSDTFlow[]>(kucoinClient.getFlows());
  const [events, setEvents] = useState<FlowOperation[]>(kucoinClient.getEvents());
  const [isLoading, setIsLoading] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'untested' | 'connected' | 'error'>('untested');
  const [wsStatus, setWsStatus] = useState<'disconnected' | 'connecting' | 'connected'>('disconnected');
  const [showPassphrase, setShowPassphrase] = useState(false);
  const [simulationMode, setSimulationMode] = useState<boolean>(() => {
    const saved = localStorage.getItem('kucoin_simulation_mode');
    return saved ? JSON.parse(saved) : false; // Por defecto en modo REAL
  });
  const [accounts, setAccounts] = useState<KuCoinAccount[]>([]);
  const [currentOperations, setCurrentOperations] = useState<FlowOperation[]>([]);
  const [autoConversionEnabled, setAutoConversionEnabled] = useState(false);
  const [custodyAccounts, setCustodyAccounts] = useState<CustodyAccount[]>([]);
  const [selectedCustodyAccount, setSelectedCustodyAccount] = useState<string>('');
  const [useCustodyFunds, setUseCustodyFunds] = useState(false);
  const [showDepositModal, setShowDepositModal] = useState(false);
  const [depositAmount, setDepositAmount] = useState('');
  const [depositFromAccount, setDepositFromAccount] = useState('');
  const eventsContainerRef = useRef<HTMLDivElement>(null);
  
  // Estados para Fuente de Fondos en Fiat (Custody, DAES Card, Manual)
  const [fiatFundSource, setFiatFundSource] = useState<'manual' | 'custody' | 'daes_card'>('manual');
  const [selectedFiatCustodyAccount, setSelectedFiatCustodyAccount] = useState<string>('');
  const [daesCardBalance, setDaesCardBalance] = useState<number>(0);
  const [daesCards, setDaesCards] = useState<any[]>([]);
  const [selectedDaesCard, setSelectedDaesCard] = useState<string>('');
  
  // Estados para Carga Directa EUR desde Custody a Trading
  const [showCustodyToTradingModal, setShowCustodyToTradingModal] = useState(false);
  const [custodyToTradingAmount, setCustodyToTradingAmount] = useState('');
  const [selectedCustodyForTrading, setSelectedCustodyForTrading] = useState<string>('');
  const [tradingEurBalance, setTradingEurBalance] = useState<number>(0);
  const [executingTrade, setExecutingTrade] = useState(false);
  const [syncStatus, setSyncStatus] = useState<'idle' | 'syncing' | 'synced' | 'error'>('idle');
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);
  
  // Historial de Trades EUR persistido
  const [eurTradeHistory, setEurTradeHistory] = useState<any[]>(() => {
    const saved = localStorage.getItem('kucoin_eur_trade_history');
    return saved ? JSON.parse(saved) : [];
  });
  
  // Historial de Cargas EUR desde Custody - persistido
  const [eurLoadHistory, setEurLoadHistory] = useState<any[]>(() => {
    const saved = localStorage.getItem('kucoin_eur_load_history');
    return saved ? JSON.parse(saved) : [];
  });

  // Estados para SWAP (Conversión de Criptomonedas)
  const [swapFromCurrency, setSwapFromCurrency] = useState('USDT');
  const [swapToCurrency, setSwapToCurrency] = useState('BTC');
  const [swapAmount, setSwapAmount] = useState('');
  const [swapEstimate, setSwapEstimate] = useState<{price: string, estimated: string, fee: string} | null>(null);
  const [availableCurrencies, setAvailableCurrencies] = useState<{currency: string, name: string, fullName: string}[]>([]);
  const [availableSymbols, setAvailableSymbols] = useState<{symbol: string, baseCurrency: string, quoteCurrency: string}[]>([]);
  const [allTickers, setAllTickers] = useState<{symbol: string, last: string, changeRate: string}[]>([]);
  const [isLoadingSwap, setIsLoadingSwap] = useState(false);
  const [swapHistory, setSwapHistory] = useState<{id: string, from: string, to: string, spent: string, received: string, timestamp: string, status: string}[]>([]);
  const [searchCurrency, setSearchCurrency] = useState('');

  // Estados para FUNDING (Main Account) - Persistido en localStorage
  const [fundingAccounts, setFundingAccounts] = useState<any[]>(() => {
    const saved = localStorage.getItem('kucoin_funding_accounts');
    return saved ? JSON.parse(saved) : [];
  });
  const [fundingFiat, setFundingFiat] = useState<any[]>([]);
  const [fundingCrypto, setFundingCrypto] = useState<any[]>([]);
  
  // Estados para FIAT
  const [fiatCurrencies, setFiatCurrencies] = useState<any[]>([]);
  const [fiatDepositMethod, setFiatDepositMethod] = useState('BANK_TRANSFER');
  const [fiatDepositCurrency, setFiatDepositCurrency] = useState('USD');
  const [fiatDepositAmount, setFiatDepositAmount] = useState('');
  
  // Estados para TRADING MARKETS - Persistido en localStorage
  const [tradingAccounts, setTradingAccounts] = useState<any[]>(() => {
    const saved = localStorage.getItem('kucoin_trading_accounts');
    return saved ? JSON.parse(saved) : [];
  });
  const [selectedMarket, setSelectedMarket] = useState('USDT');
  const [marketSymbols, setMarketSymbols] = useState<any[]>([]);
  const [marketTickers, setMarketTickers] = useState<any[]>([]);
  
  // Estados para transferencias internas
  const [transferCurrency, setTransferCurrency] = useState('USDT');
  const [transferAmount, setTransferAmount] = useState('');
  const [transferFrom, setTransferFrom] = useState<'main' | 'trade'>('main');
  const [transferTo, setTransferTo] = useState<'main' | 'trade'>('trade');

  // Función para depositar USD desde Custody a KuCoin
  const handleDepositToKuCoin = () => {
    if (!depositFromAccount || !depositAmount) {
      alert(isSpanish ? '❌ Selecciona cuenta y monto' : '❌ Select account and amount');
      return;
    }

    const amount = parseFloat(depositAmount);
    if (isNaN(amount) || amount <= 0) {
      alert(isSpanish ? '❌ Monto inválido' : '❌ Invalid amount');
      return;
    }

    const custodyAccount = custodyAccounts.find(a => a.id === depositFromAccount);
    if (!custodyAccount) {
      alert(isSpanish ? '❌ Cuenta no encontrada' : '❌ Account not found');
      return;
    }

    if (custodyAccount.availableBalance < amount) {
      alert(isSpanish 
        ? `❌ Fondos insuficientes. Disponible: $${custodyAccount.availableBalance.toLocaleString()}` 
        : `❌ Insufficient funds. Available: $${custodyAccount.availableBalance.toLocaleString()}`);
      return;
    }

    // Confirmar
    const confirmed = confirm(isSpanish
      ? `¿Depositar $${amount.toLocaleString()} USD desde "${custodyAccount.accountName}" a KuCoin?`
      : `Deposit $${amount.toLocaleString()} USD from "${custodyAccount.accountName}" to KuCoin?`
    );

    if (!confirmed) return;

    // 1. Descontar de Custody Account
    custodyStore.withdrawFundsWithTransaction(custodyAccount.id, {
      amount: amount,
      description: `KuCoin Deposit | Transfer to KuCoin Main Account`,
      destinationAccount: 'KuCoin Main Account',
      destinationBank: 'KuCoin Exchange',
      transactionDate: new Date().toISOString().split('T')[0],
      transactionTime: new Date().toTimeString().split(' ')[0]
    });

    // 2. Actualizar balance de KuCoin (agregar a USD Main)
    setAccounts(prevAccounts => {
      const newAccounts = [...prevAccounts];
      const usdMainIndex = newAccounts.findIndex(a => a.currency === 'USD' && a.type === 'main');
      
      if (usdMainIndex >= 0) {
        // Actualizar existente
        const currentBalance = parseFloat(newAccounts[usdMainIndex].available) || 0;
        const currentTotal = parseFloat(newAccounts[usdMainIndex].balance) || 0;
        newAccounts[usdMainIndex] = {
          ...newAccounts[usdMainIndex],
          available: (currentBalance + amount).toFixed(2),
          balance: (currentTotal + amount).toFixed(2)
        };
      } else {
        // Crear nueva cuenta USD Main
        newAccounts.push({
          id: `main-usd-${Date.now()}`,
          currency: 'USD',
          type: 'main',
          balance: amount.toFixed(2),
          available: amount.toFixed(2),
          holds: '0'
        });
      }
      
      return newAccounts;
    });

    // 3. Agregar evento al log
    kucoinClient.addEvent({
      type: 'balance',
      status: 'success',
      data: { 
        currency: 'USD', 
        available: amount.toFixed(2),
        availableChange: `+${amount.toFixed(2)}`,
        source: custodyAccount.accountName
      },
      message: `💰 Depósito USD: +$${amount.toLocaleString()} desde ${custodyAccount.accountName}`,
    });

    // 4. Actualizar lista de custody accounts
    setCustodyAccounts(custodyStore.getAccounts());

    // 5. Cerrar modal y limpiar
    setShowDepositModal(false);
    setDepositAmount('');
    setDepositFromAccount('');

    // 6. Actualizar eventos
    setEvents(kucoinClient.getEvents());

    alert(isSpanish
      ? `✓ Depósito exitoso!\n$${amount.toLocaleString()} USD enviado a KuCoin Main Account`
      : `✓ Deposit successful!\n$${amount.toLocaleString()} USD sent to KuCoin Main Account`
    );
  };

  // ============================================================================
  // FUNCIONES PARA SWAP DE CRIPTOMONEDAS
  // ============================================================================

  // Cargar monedas disponibles
  const loadAvailableCurrencies = async () => {
    try {
      const response = await fetch('http://localhost:3000/api/kucoin/currencies');
      const data = await response.json();
      if (data.success && data.data) {
        setAvailableCurrencies(data.data);
      }
    } catch (error) {
      console.error('[KuCoin Swap] Error cargando monedas:', error);
    }
  };

  // Cargar pares de trading disponibles
  const loadAvailableSymbols = async () => {
    try {
      const response = await fetch('http://localhost:3000/api/kucoin/symbols');
      const data = await response.json();
      if (data.success && data.data) {
        setAvailableSymbols(data.data);
      }
    } catch (error) {
      console.error('[KuCoin Swap] Error cargando símbolos:', error);
    }
  };

  // Cargar todos los tickers (precios)
  const loadAllTickers = async () => {
    try {
      const response = await fetch('http://localhost:3000/api/kucoin/tickers');
      const data = await response.json();
      if (data.success && data.data?.ticker) {
        setAllTickers(data.data.ticker);
      }
    } catch (error) {
      console.error('[KuCoin Swap] Error cargando tickers:', error);
    }
  };

  // Obtener precio estimado para el swap
  const getSwapEstimate = async () => {
    if (!swapFromCurrency || !swapToCurrency || !swapAmount || parseFloat(swapAmount) <= 0) {
      setSwapEstimate(null);
      return;
    }

    try {
      const stableCoins = ['USDT', 'USDC', 'USD', 'BUSD', 'DAI'];
      const amount = parseFloat(swapAmount);
      
      // Caso especial: USD se trata como USDT (1:1) para cálculos
      const fromCurrency = swapFromCurrency === 'USD' ? 'USDT' : swapFromCurrency;
      const toCurrency = swapToCurrency === 'USD' ? 'USDT' : swapToCurrency;
      
      // Si ambos son USD/USDT, es 1:1
      if ((swapFromCurrency === 'USD' && swapToCurrency === 'USDT') || 
          (swapFromCurrency === 'USDT' && swapToCurrency === 'USD')) {
        const fee = amount * 0.001;
        setSwapEstimate({
          price: '1.00',
          estimated: (amount - fee).toFixed(2),
          fee: fee.toFixed(4)
        });
        return;
      }
      
      let symbol: string;
      let isBuy: boolean;

      if (stableCoins.includes(toCurrency)) {
        // Vendiendo crypto por stable
        symbol = `${fromCurrency}-${toCurrency}`;
        isBuy = false;
      } else if (stableCoins.includes(fromCurrency)) {
        // Comprando crypto con stable (USD/USDT/USDC)
        symbol = `${toCurrency}-${fromCurrency}`;
        isBuy = true;
      } else {
        // Crypto a crypto
        symbol = `${fromCurrency}-${toCurrency}`;
        isBuy = false;
      }

      const response = await fetch(`http://localhost:3000/api/kucoin/ticker/${symbol}`);
      const data = await response.json();
      
      if (data.success && data.data) {
        const price = parseFloat(data.data.price || data.data.last || '0');
        let estimated: number;
        
        if (isBuy) {
          // Comprando crypto con stable: amount / price
          estimated = amount / price;
        } else {
          // Vendiendo crypto por stable: amount * price
          estimated = amount * price;
        }
        
        const fee = estimated * 0.001; // 0.1% fee aproximado
        
        setSwapEstimate({
          price: isBuy ? price.toFixed(8) : price.toString(),
          estimated: (estimated - fee).toFixed(8),
          fee: fee.toFixed(8)
        });
      } else {
        // Intentar con el par invertido
        const invertedSymbol = symbol.split('-').reverse().join('-');
        const invertedResponse = await fetch(`http://localhost:3000/api/kucoin/ticker/${invertedSymbol}`);
        const invertedData = await invertedResponse.json();
        
        if (invertedData.success && invertedData.data) {
          const price = parseFloat(invertedData.data.price || invertedData.data.last || '0');
          const estimated = amount / price;
          const fee = estimated * 0.001;
          
          setSwapEstimate({
            price: (1/price).toFixed(8),
            estimated: (estimated - fee).toFixed(8),
            fee: fee.toFixed(8)
          });
        } else {
          setSwapEstimate(null);
        }
      }
    } catch (error) {
      console.error('[KuCoin Swap] Error obteniendo estimación:', error);
      setSwapEstimate(null);
    }
  };

  // Ejecutar el swap
  const executeSwap = async () => {
    // Permitir swap en modo simulación O si está configurado
    if (!config.isConfigured && !simulationMode) {
      alert(isSpanish 
        ? '❌ Configura las credenciales o activa el Modo Simulación' 
        : '❌ Configure credentials or enable Simulation Mode');
      setActiveTab('config');
      return;
    }

    if (!swapAmount || parseFloat(swapAmount) <= 0) {
      alert(isSpanish ? '❌ Ingresa un monto válido' : '❌ Enter a valid amount');
      return;
    }

    if (swapFromCurrency === swapToCurrency) {
      alert(isSpanish ? '❌ Las monedas deben ser diferentes' : '❌ Currencies must be different');
      return;
    }

    // Verificar balance disponible
    const availableBalance = parseFloat(getCurrencyBalance(swapFromCurrency));
    if (parseFloat(swapAmount) > availableBalance) {
      alert(isSpanish 
        ? `❌ Balance insuficiente. Disponible: ${availableBalance} ${swapFromCurrency}` 
        : `❌ Insufficient balance. Available: ${availableBalance} ${swapFromCurrency}`);
      return;
    }

    // Mensaje especial para USD
    const usdNote = swapFromCurrency === 'USD' 
      ? (isSpanish ? '\n\n💡 Se usará tu balance USD de KuCoin para esta compra.' : '\n\n💡 Your KuCoin USD balance will be used for this purchase.')
      : '';

    const confirmed = confirm(isSpanish
      ? `¿Confirmar conversión de ${swapAmount} ${swapFromCurrency} a ${swapToCurrency}?\n\nEstimado a recibir: ~${swapEstimate?.estimated || '?'} ${swapToCurrency}${usdNote}`
      : `Confirm conversion of ${swapAmount} ${swapFromCurrency} to ${swapToCurrency}?\n\nEstimated to receive: ~${swapEstimate?.estimated || '?'} ${swapToCurrency}${usdNote}`
    );

    if (!confirmed) return;

    setIsLoadingSwap(true);

    try {
      // Para USD, usamos USDT como intermediario en el servidor
      // El servidor maneja la lógica de conversión USD → USDT → Crypto
      const fromCurrency = swapFromCurrency;
      const toCurrency = swapToCurrency;

      const response = await fetch('http://localhost:3000/api/kucoin/convert', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          apiKey: simulationMode ? 'SIMULATION_MODE' : config.apiKey,
          apiSecret: simulationMode ? 'SIMULATION_MODE' : config.apiSecret,
          passphrase: simulationMode ? 'SIMULATION_MODE' : config.passphrase,
          fromCurrency: fromCurrency,
          toCurrency: toCurrency,
          amount: swapAmount,
          simulationMode: simulationMode
        })
      });

      const data = await response.json();

      if (data.success && data.code === '200000') {
        // Éxito
        const swapRecord = {
          id: data.data.orderId,
          from: swapFromCurrency,
          to: swapToCurrency,
          spent: data.data.spentAmount || swapAmount,
          received: data.data.receivedAmount || swapEstimate?.estimated || '?',
          timestamp: new Date().toISOString(),
          status: 'completed'
        };

        setSwapHistory(prev => [swapRecord, ...prev]);

        // Agregar evento
        kucoinClient.addEvent({
          type: 'order',
          status: 'success',
          data: data.data,
          message: `✓ Swap completado: ${swapAmount} ${swapFromCurrency} → ${data.data.receivedAmount || swapEstimate?.estimated} ${swapToCurrency}`,
        });

        setEvents(kucoinClient.getEvents());

        // Actualizar balances después de un pequeño delay
        setTimeout(() => handleTestConnection(), 1000);

        // Actualizar balance local de USD si fue usado
        if (swapFromCurrency === 'USD') {
          setAccounts(prevAccounts => {
            return prevAccounts.map(acc => {
              if (acc.currency === 'USD' && acc.type === 'main') {
                const newBalance = Math.max(0, parseFloat(acc.available) - parseFloat(swapAmount));
                return {
                  ...acc,
                  available: newBalance.toFixed(2),
                  balance: newBalance.toFixed(2)
                };
              }
              return acc;
            });
          });
        }

        alert(isSpanish
          ? `✓ ¡Conversión exitosa!\n\n${swapAmount} ${swapFromCurrency} → ${data.data.receivedAmount || swapEstimate?.estimated} ${swapToCurrency}\n\nID: ${data.data.orderId}`
          : `✓ Conversion successful!\n\n${swapAmount} ${swapFromCurrency} → ${data.data.receivedAmount || swapEstimate?.estimated} ${swapToCurrency}\n\nID: ${data.data.orderId}`
        );

        // Limpiar formulario
        setSwapAmount('');
        setSwapEstimate(null);
      } else {
        alert(`❌ Error: ${data.message || data.msg || 'Error desconocido'}`);
      }
    } catch (error: any) {
      console.error('[KuCoin Swap] Error:', error);
      alert(`❌ Error: ${error.message}`);
    } finally {
      setIsLoadingSwap(false);
    }
  };

  // Intercambiar monedas (from <-> to)
  const swapCurrencies = () => {
    const temp = swapFromCurrency;
    setSwapFromCurrency(swapToCurrency);
    setSwapToCurrency(temp);
    setSwapEstimate(null);
  };

  // Obtener balance de una moneda específica
  const getCurrencyBalance = (currency: string): string => {
    const account = accounts.find(a => a.currency === currency && a.type === 'trade');
    const mainAccount = accounts.find(a => a.currency === currency && a.type === 'main');
    const tradeBalance = account ? parseFloat(account.available) : 0;
    const mainBalance = mainAccount ? parseFloat(mainAccount.available) : 0;
    const total = tradeBalance + mainBalance;
    // Para USD y stablecoins, mostrar con 2 decimales; para crypto, 8 decimales
    return currency === 'USD' || currency === 'USDT' || currency === 'USDC' 
      ? total.toFixed(2) 
      : total.toFixed(8);
  };

  // Efecto para cargar datos del swap cuando se activa la pestaña
  useEffect(() => {
    if (activeTab === 'swap') {
      loadAvailableCurrencies();
      loadAvailableSymbols();
      loadAllTickers();
    }
  }, [activeTab]);

  // Efecto para actualizar estimación cuando cambian los valores
  useEffect(() => {
    const debounce = setTimeout(() => {
      if (swapAmount && parseFloat(swapAmount) > 0) {
        getSwapEstimate();
      }
    }, 500);
    return () => clearTimeout(debounce);
  }, [swapFromCurrency, swapToCurrency, swapAmount]);

  // ============================================================================
  // FUNCIONES PARA MÓDULO FUNDING (Main Account)
  // ============================================================================
  const loadFundingAccounts = async () => {
    try {
      // Construir headers con credenciales si están configuradas
      const headers: Record<string, string> = {
        'Content-Type': 'application/json'
      };
      
      // Si hay configuración válida, enviar credenciales para obtener datos reales
      if (config.isConfigured && config.apiKey && config.apiSecret && config.passphrase) {
        headers['KC-API-KEY'] = config.apiKey;
        headers['KC-API-SECRET'] = config.apiSecret;
        headers['KC-API-PASSPHRASE'] = config.passphrase;
      }
      
      const response = await fetch('http://localhost:3000/api/kucoin/funding/accounts', { headers });
      const data = await response.json();
      
      if (data.success && data.data) {
        const allAccounts = data.data.accounts || data.data || [];
        // Convertir al formato esperado si viene directamente de KuCoin
        const normalizedAccounts = Array.isArray(allAccounts) ? allAccounts.map((a: any) => ({
          ...a,
          isFiat: ['USD', 'EUR', 'GBP', 'AUD', 'CAD'].includes(a.currency)
        })) : [];
        
        // 🔄 MANEJO DE BALANCES SEGÚN MODO
        const savedLocal = localStorage.getItem('kucoin_funding_accounts');
        const localAccounts = savedLocal ? JSON.parse(savedLocal) : [];
        
        // Detectar si estamos en modo REAL (con credenciales válidas)
        const isRealMode = config.isConfigured && config.apiKey && config.apiSecret && config.passphrase;
        const apiReturnedData = data.mode !== 'LOCAL'; // La API devuelve 'LOCAL' cuando usa datos simulados
        
        let mergedAccounts: any[] = [];
        
        if (isRealMode && apiReturnedData) {
          // 🔴 MODO REAL: SIEMPRE priorizar datos de la API de KuCoin
          console.log('[KuCoin Funding] 🔴 MODO REAL - Usando datos de KuCoin API');
          mergedAccounts = normalizedAccounts.map((apiAcc: any) => {
            console.log(`[KuCoin Funding] ${apiAcc.currency}: API balance = ${apiAcc.available}`);
            return apiAcc;
          });
          
          // Solo agregar cuentas locales que NO estén en la API (como EUR cargado manualmente)
          localAccounts.forEach((localAcc: any) => {
            if (!mergedAccounts.find((m: any) => m.currency === localAcc.currency)) {
              // Solo agregar si es una moneda local especial (EUR trading, etc.)
              if (['EUR'].includes(localAcc.currency) && parseFloat(localAcc.available) > 0) {
                console.log(`[KuCoin Funding] ${localAcc.currency}: Agregando cuenta local especial ${localAcc.available}`);
                mergedAccounts.push(localAcc);
              }
            }
          });
        } else {
          // 🟢 MODO LOCAL/SIMULACIÓN: Priorizar datos locales si existen
          console.log('[KuCoin Funding] 🟢 MODO LOCAL - Usando datos simulados/locales');
          mergedAccounts = normalizedAccounts.map((apiAcc: any) => {
            const localAcc = localAccounts.find((l: any) => l.currency === apiAcc.currency);
            if (localAcc) {
              const localBalance = parseFloat(localAcc.available) || 0;
              if (localBalance > 0) {
                console.log(`[KuCoin Funding] ${apiAcc.currency}: MODO LOCAL - usando balance local ${localBalance}`);
                return { ...apiAcc, ...localAcc };
              }
            }
            return apiAcc;
          });
          
          // Agregar cuentas locales que no estén en el API
          localAccounts.forEach((localAcc: any) => {
            if (!mergedAccounts.find((m: any) => m.currency === localAcc.currency)) {
              mergedAccounts.push(localAcc);
            }
          });
        }
        
        setFundingAccounts(mergedAccounts);
        setFundingFiat(mergedAccounts.filter((a: any) => a.isFiat || ['USD', 'EUR', 'GBP', 'AUD', 'CAD'].includes(a.currency)));
        setFundingCrypto(mergedAccounts.filter((a: any) => !a.isFiat && !['USD', 'EUR', 'GBP', 'AUD', 'CAD', 'USDT', 'USDC'].includes(a.currency)));
        
        // Persistir los datos mezclados
        localStorage.setItem('kucoin_funding_accounts', JSON.stringify(mergedAccounts));
        
        // También actualizar accounts principal para los balances
        setAccounts(prev => {
          const newAccounts = [...prev];
          mergedAccounts.forEach((acc: any) => {
            const existingIdx = newAccounts.findIndex(a => a.currency === acc.currency && a.type === 'main');
            if (existingIdx >= 0) {
              newAccounts[existingIdx] = { ...newAccounts[existingIdx], ...acc, type: 'main' };
            } else {
              newAccounts.push({ ...acc, type: 'main' });
            }
          });
          return newAccounts;
        });
        
        console.log('[KuCoin Funding] ✓ Cuentas cargadas y mezcladas:', mergedAccounts.length, 'modo:', config.isConfigured ? 'REAL' : 'LOCAL');
      }
    } catch (error) {
      console.error('[KuCoin Funding] Error:', error);
    }
  };

  const handleFundingDeposit = async (currency: string, amount: string, source: string) => {
    try {
      const response = await fetch('http://localhost:3000/api/kucoin/funding/deposit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currency, amount, source })
      });
      const data = await response.json();
      if (data.success) {
        alert(isSpanish 
          ? `✓ Depósito completado: ${amount} ${currency} en Main Account` 
          : `✓ Deposit completed: ${amount} ${currency} to Main Account`);
        loadFundingAccounts();
        kucoinClient.addEvent({
          type: 'balance',
          status: 'success',
          data: data.data,
          message: `💰 Depósito: +${amount} ${currency} en Funding`
        });
        setEvents(kucoinClient.getEvents());
      }
      return data;
    } catch (error: any) {
      alert(`❌ Error: ${error.message}`);
      return { success: false, error: error.message };
    }
  };

  const handleInternalTransfer = async () => {
    if (!transferCurrency || !transferAmount || parseFloat(transferAmount) <= 0) {
      alert(isSpanish ? '❌ Completa todos los campos' : '❌ Fill all fields');
      return;
    }

    // Lista de divisas FIAT
    const FIAT_CURRENCIES = ['USD', 'EUR', 'GBP', 'AUD', 'CAD', 'CHF', 'JPY', 'CNY', 'KRW', 'BRL', 'MXN', 'ARS'];
    const isFiat = FIAT_CURRENCIES.includes(transferCurrency.toUpperCase());

    if (isFiat) {
      // Mostrar alerta explicativa con opción de convertir
      const convertConfirm = window.confirm(
        isSpanish 
          ? `⚠️ ${transferCurrency} es una divisa FIAT y no puede transferirse directamente entre cuentas en KuCoin.\n\n` +
            `¿Deseas convertir ${transferAmount} ${transferCurrency} a USDT primero?\n\n` +
            `El USDT podrá transferirse a la cuenta Trade después de la conversión.`
          : `⚠️ ${transferCurrency} is a FIAT currency and cannot be transferred directly between KuCoin accounts.\n\n` +
            `Do you want to convert ${transferAmount} ${transferCurrency} to USDT first?\n\n` +
            `USDT can be transferred to Trade account after conversion.`
      );

      if (convertConfirm) {
        // Cambiar a la pestaña de conversión USD→USDT
        setSwapFromCurrency(transferCurrency);
        setSwapToCurrency('USDT');
        setSwapAmount(transferAmount);
        setActiveTab('usd-to-usdt');
        return;
      }
      return;
    }

    try {
      const response = await fetch('http://localhost:3000/api/kucoin/funding/transfer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          apiKey: config.apiKey,
          apiSecret: config.apiSecret,
          passphrase: config.passphrase,
          currency: transferCurrency,
          amount: transferAmount,
          from: transferFrom,
          to: transferTo
        })
      });
      const data = await response.json();
      
      if (data.success) {
        alert(isSpanish 
          ? `✓ Transferido ${transferAmount} ${transferCurrency} de ${transferFrom} a ${transferTo}` 
          : `✓ Transferred ${transferAmount} ${transferCurrency} from ${transferFrom} to ${transferTo}`);
        loadFundingAccounts();
        loadTradingAccounts();
        setTransferAmount('');
        kucoinClient.addEvent({
          type: 'transfer',
          status: 'success',
          data: data.data,
          message: `↔️ Transfer: ${transferAmount} ${transferCurrency} ${transferFrom} → ${transferTo}`
        });
        setEvents(kucoinClient.getEvents());
      } else if (data.code === 'FIAT_NOT_TRANSFERABLE') {
        // Error específico de FIAT - ofrecer conversión
        const convertConfirm = window.confirm(data.message + '\n\n' + 
          (isSpanish ? '¿Deseas ir a la conversión USD→USDT?' : 'Do you want to go to USD→USDT conversion?'));
        if (convertConfirm) {
          setSwapFromCurrency(transferCurrency);
          setSwapToCurrency('USDT');
          setSwapAmount(transferAmount);
          setActiveTab('usd-to-usdt');
        }
      } else {
        alert(`❌ Error: ${data.message || data.msg || 'Error desconocido'}`);
      }
    } catch (error: any) {
      alert(`❌ Error: ${error.message}`);
    }
  };

  // ============================================================================
  // FUNCIONES PARA CARGA DIRECTA EUR DESDE CUSTODY A TRADING
  // ============================================================================
  
  // Cargar EUR directamente desde Custody Account al Trading Account CON API REAL
  const loadEurFromCustodyToTrading = async () => {
    const amount = parseFloat(custodyToTradingAmount);
    if (!selectedCustodyForTrading || isNaN(amount) || amount <= 0) {
      alert(isSpanish ? '❌ Selecciona una cuenta y un monto válido' : '❌ Select an account and valid amount');
      return;
    }

    const custodyAcc = custodyAccounts.find(a => a.id === selectedCustodyForTrading);
    if (!custodyAcc) {
      alert(isSpanish ? '❌ Cuenta custodio no encontrada' : '❌ Custody account not found');
      return;
    }

    if (custodyAcc.availableBalance < amount) {
      alert(isSpanish ? '❌ Saldo insuficiente en cuenta custodio' : '❌ Insufficient balance in custody account');
      return;
    }

    try {
      setExecutingTrade(true);
      
      // 🔴 LLAMAR AL API PARA INYECTAR EUR (registra en servidor con precios reales)
      console.log('[KuCoin] 🔴 Inyectando EUR via API:', amount);
      const injectResponse = await fetch('http://localhost:3000/api/kucoin/trading/inject-eur', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          apiKey: config.apiKey,
          apiSecret: config.apiSecret,
          passphrase: config.passphrase,
          amount: amount.toString(),
          source: custodyAcc.accountName
        })
      });
      const injectData = await injectResponse.json();
      
      if (!injectData.success) {
        throw new Error(injectData.message || 'Error al inyectar EUR');
      }
      
      console.log('[KuCoin] ✅ EUR inyectado via API:', injectData);
      
      // 1. Descontar del Custody Account
      const updatedCustodyAccounts = custodyAccounts.map(acc => {
        if (acc.id === selectedCustodyForTrading) {
          return {
            ...acc,
            availableBalance: acc.availableBalance - amount,
            lastUpdate: new Date().toISOString()
          };
        }
        return acc;
      });
      setCustodyAccounts(updatedCustodyAccounts);
      localStorage.setItem('custody_accounts', JSON.stringify(updatedCustodyAccounts));

      // 2. Acreditar al Trading Account EUR
      const existingEurAcc = tradingAccounts.find((a: any) => a.currency === 'EUR');
      let updatedTradingAccounts;
      
      if (existingEurAcc) {
        updatedTradingAccounts = tradingAccounts.map((acc: any) => {
          if (acc.currency === 'EUR') {
            return {
              ...acc,
              available: (parseFloat(acc.available) + amount).toFixed(4),
              balance: (parseFloat(acc.balance) + amount).toFixed(4),
              injectionId: injectData.data?.injectionId,
              priceSource: 'KUCOIN_REAL'
            };
          }
          return acc;
        });
      } else {
        updatedTradingAccounts = [...tradingAccounts, {
          id: `trade-eur-${Date.now()}`,
          currency: 'EUR',
          type: 'trade',
          balance: amount.toFixed(4),
          available: amount.toFixed(4),
          holds: '0',
          injectionId: injectData.data?.injectionId,
          priceSource: 'KUCOIN_REAL'
        }];
      }
      setTradingAccounts(updatedTradingAccounts);
      setTradingEurBalance(prev => prev + amount);
      
      // ⚡ PERSISTIR EN LOCALSTORAGE Y SINCRONIZAR CON SUPABASE
      localStorage.setItem('kucoin_trading_accounts', JSON.stringify(updatedTradingAccounts));
      kucoinSyncStore.saveBalances(updatedTradingAccounts);
      console.log('[KuCoin] ✓ EUR inyectado, persistido y sincronizado:', amount, 'EUR');
      
      // 📜 Registrar en historial de cargas EUR
      const loadRecord = {
        id: injectData.data?.injectionId || `LOAD_EUR_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
        type: 'INJECTION',
        mode: 'REAL_PRICES',
        from: custodyAcc.accountName,
        from_id: custodyAcc.id,
        to: 'Trading EUR (KuCoin Prices)',
        amount,
        currency: 'EUR',
        timestamp: new Date().toISOString(),
        balance_after: updatedTradingAccounts.find((a: any) => a.currency === 'EUR')?.available || amount.toFixed(4),
        tradingCapabilities: injectData.data?.tradingCapabilities
      };
      const newLoadHistory = [loadRecord, ...eurLoadHistory].slice(0, 50);
      setEurLoadHistory(newLoadHistory);
      localStorage.setItem('kucoin_eur_load_history', JSON.stringify(newLoadHistory));
      // Sincronizar historial de cargas
      kucoinSyncStore.saveLoadHistory(loadRecord);
      setSyncStatus('synced');
      setLastSyncTime(new Date());

      // 3. Registrar evento
      kucoinClient.addEvent({
        type: 'eur_injection',
        status: 'success',
        data: loadRecord,
        message: `🔴 EUR INYECTADO (Precios Reales): ${amount.toLocaleString()} EUR de ${custodyAcc.accountName}`
      });
      setEvents(kucoinClient.getEvents());

      alert(isSpanish 
        ? `✅ EUR INYECTADO CON PRECIOS REALES!\n\n💶 Monto: ${amount.toLocaleString()} EUR\n📊 Desde: ${custodyAcc.accountName}\n🔴 Trading con precios de KuCoin\n\nPares disponibles:\n• BTC-EUR, ETH-EUR, SOL-EUR\n• XRP-EUR, ADA-EUR, DOT-EUR\n• USDT-EUR, USDC-EUR` 
        : `✅ EUR INJECTED WITH REAL PRICES!\n\n💶 Amount: ${amount.toLocaleString()} EUR\n📊 From: ${custodyAcc.accountName}\n🔴 Trading with KuCoin prices\n\nAvailable pairs:\n• BTC-EUR, ETH-EUR, SOL-EUR\n• XRP-EUR, ADA-EUR, DOT-EUR\n• USDT-EUR, USDC-EUR`);
      
      setShowCustodyToTradingModal(false);
      setCustodyToTradingAmount('');
      setSelectedCustodyForTrading('');
      
    } catch (error: any) {
      console.error('[KuCoin] ❌ Error inyectando EUR:', error);
      alert(`❌ Error: ${error.message}`);
    } finally {
      setExecutingTrade(false);
    }
  };

  // ============================================================================
  // CONVERTIR USDT A EUR EN TRADE ACCOUNT (API REAL DE KUCOIN)
  // ============================================================================
  const convertUsdtToEurReal = async (amount: string) => {
    const usdtAmount = parseFloat(amount);
    if (isNaN(usdtAmount) || usdtAmount <= 0) {
      alert(isSpanish ? '❌ Ingresa un monto válido de USDT' : '❌ Enter a valid USDT amount');
      return;
    }

    // Verificar que estamos en modo real
    if (!config.isConfigured || !config.apiKey || !config.apiSecret || !config.passphrase) {
      alert(isSpanish 
        ? '❌ Debes configurar las credenciales API de KuCoin para conversiones reales' 
        : '❌ You must configure KuCoin API credentials for real conversions');
      return;
    }

    // Verificar balance de USDT en Trade
    const usdtTradeAcc = tradingAccounts.find((a: any) => a.currency === 'USDT');
    const usdtTradeBalance = usdtTradeAcc ? parseFloat(usdtTradeAcc.available) : 0;
    
    if (usdtTradeBalance < usdtAmount) {
      alert(isSpanish 
        ? `❌ Saldo insuficiente en Trade Account.\n\nUSDT disponible: ${usdtTradeBalance.toFixed(4)}\nRequerido: ${usdtAmount}\n\n💡 Primero transfiere USDT de Main a Trade.`
        : `❌ Insufficient balance in Trade Account.\n\nAvailable USDT: ${usdtTradeBalance.toFixed(4)}\nRequired: ${usdtAmount}\n\n💡 First transfer USDT from Main to Trade.`);
      return;
    }

    try {
      setExecutingTrade(true);
      console.log(`[KuCoin] 🔴 Convirtiendo ${usdtAmount} USDT → EUR (REAL API)`);

      const response = await fetch('http://localhost:3000/api/kucoin/trading/convert-to-eur', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          apiKey: config.apiKey,
          apiSecret: config.apiSecret,
          passphrase: config.passphrase,
          amount: usdtAmount.toString()
        })
      });

      const data = await response.json();

      if (data.success) {
        console.log('[KuCoin] ✅ Conversión USDT→EUR exitosa:', data);
        
        // Recargar balances desde KuCoin
        setTimeout(() => {
          loadTradingAccounts();
          loadFundingAccounts();
        }, 1500);

        // Registrar evento
        kucoinClient.addEvent({
          type: 'conversion',
          status: 'success',
          data: { 
            from: 'USDT', 
            to: 'EUR', 
            amount: usdtAmount, 
            estimated: data.conversion?.estimatedReceived,
            mode: 'REAL',
            orderId: data.data?.orderId 
          },
          message: `🔴 CONVERSIÓN REAL: ${usdtAmount} USDT → ~${data.conversion?.estimatedReceived || '?'} EUR`
        });
        setEvents(kucoinClient.getEvents());

        alert(isSpanish 
          ? `✅ CONVERSIÓN REAL EXITOSA!\n\n💱 Vendido: ${usdtAmount} USDT\n💶 Recibido aprox: ${data.conversion?.estimatedReceived || '?'} EUR\n\n📊 Los balances se actualizarán en unos segundos.`
          : `✅ REAL CONVERSION SUCCESSFUL!\n\n💱 Sold: ${usdtAmount} USDT\n💶 Received approx: ${data.conversion?.estimatedReceived || '?'} EUR\n\n📊 Balances will update in a few seconds.`);
      } else {
        // Manejar errores específicos de KuCoin
        const errorMsg = data.msg || data.message || 'Error desconocido';
        console.error('[KuCoin] ❌ Error en conversión:', errorMsg);
        
        if (errorMsg.includes('balance') || data.code === '200004') {
          alert(isSpanish 
            ? `❌ Sin saldo suficiente de USDT en Trade Account.\n\n${errorMsg}\n\n💡 Transfiere USDT de Main a Trade primero.`
            : `❌ Insufficient USDT balance in Trade Account.\n\n${errorMsg}\n\n💡 Transfer USDT from Main to Trade first.`);
        } else {
          alert(`❌ Error: ${errorMsg}`);
        }
      }
    } catch (error: any) {
      console.error('[KuCoin] ❌ Error:', error);
      alert(`❌ Error de conexión: ${error.message}`);
    } finally {
      setExecutingTrade(false);
    }
  };

  // Ejecutar Trade EUR Real - Persiste en localStorage y actualiza balances
  const executeEurTrade = async (pair: string, side: 'buy' | 'sell', amountInput: string) => {
    const amount = parseFloat(amountInput);
    if (isNaN(amount) || amount <= 0) {
      alert(isSpanish ? '❌ Monto inválido' : '❌ Invalid amount');
      return;
    }

    const [baseCurrency, quoteCurrency] = pair.split('-');
    const eurBalance = tradingAccounts.find((a: any) => a.currency === 'EUR');
    const baseBalance = tradingAccounts.find((a: any) => a.currency === baseCurrency);

    // Obtener precio actual del ticker
    const ticker = marketTickers.find((t: any) => t.symbol === pair);
    const price = ticker ? parseFloat(ticker.last) : 0;
    
    if (price <= 0) {
      alert(isSpanish ? '❌ No se pudo obtener el precio del par' : '❌ Could not get pair price');
      return;
    }

    const timestamp = new Date().toISOString();
    const tradeId = `EUR_TRADE_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;

    if (side === 'buy') {
      // Comprando cripto con EUR
      const eurNeeded = amount * price;
      const fee = eurNeeded * 0.001; // 0.1% fee KuCoin
      const totalEurNeeded = eurNeeded + fee;
      
      if (!eurBalance || parseFloat(eurBalance.available) < totalEurNeeded) {
        alert(isSpanish 
          ? `❌ Saldo EUR insuficiente. Necesitas ${totalEurNeeded.toFixed(2)} EUR (incluye fee 0.1%)` 
          : `❌ Insufficient EUR balance. You need ${totalEurNeeded.toFixed(2)} EUR (includes 0.1% fee)`);
        return;
      }

      try {
        setExecutingTrade(true);

        // Actualizar balances
        let updatedAccounts = tradingAccounts.map((acc: any) => {
          if (acc.currency === 'EUR') {
            return {
              ...acc,
              available: (parseFloat(acc.available) - totalEurNeeded).toFixed(4),
              balance: (parseFloat(acc.balance) - totalEurNeeded).toFixed(4)
            };
          }
          if (acc.currency === baseCurrency) {
            return {
              ...acc,
              available: (parseFloat(acc.available) + amount).toFixed(8),
              balance: (parseFloat(acc.balance) + amount).toFixed(8)
            };
          }
          return acc;
        });

        // Si no existe la cuenta de la cripto, agregarla
        if (!baseBalance) {
          updatedAccounts.push({
            id: `trade-${baseCurrency.toLowerCase()}-${Date.now()}`,
            currency: baseCurrency,
            type: 'trade',
            balance: amount.toFixed(8),
            available: amount.toFixed(8),
            holds: '0'
          });
        }

        setTradingAccounts(updatedAccounts);
        // Persistir balances de trading y sincronizar con Supabase
        localStorage.setItem('kucoin_trading_accounts', JSON.stringify(updatedAccounts));
        kucoinSyncStore.saveBalances(updatedAccounts);

        // Crear registro de trade
        const tradeRecord = {
          id: tradeId,
          pair,
          side: 'BUY' as const,
          base_currency: baseCurrency,
          quote_currency: 'EUR',
          amount,
          price,
          total: eurNeeded,
          fee,
          total_with_fee: totalEurNeeded,
          timestamp,
          status: 'FILLED',
          balance_after: {
            eur: parseFloat(eurBalance.available) - totalEurNeeded,
            [baseCurrency.toLowerCase()]: baseBalance 
              ? parseFloat(baseBalance.available) + amount 
              : amount
          }
        };

        // Agregar al historial, persistir y sincronizar
        const newHistory = [tradeRecord, ...eurTradeHistory].slice(0, 100);
        setEurTradeHistory(newHistory);
        localStorage.setItem('kucoin_eur_trade_history', JSON.stringify(newHistory));
        // Sincronizar con Supabase
        kucoinSyncStore.saveTrade(tradeRecord);
        setSyncStatus('synced');
        setLastSyncTime(new Date());

        // Registrar evento
        kucoinClient.addEvent({
          type: 'trade',
          status: 'success',
          data: tradeRecord,
          message: `🟢 COMPRA EJECUTADA: ${amount} ${baseCurrency} @ ${price.toLocaleString()} EUR = ${eurNeeded.toFixed(2)} EUR (fee: ${fee.toFixed(4)} EUR)`
        });
        setEvents(kucoinClient.getEvents());

        alert(isSpanish 
          ? `✅ TRADE EJECUTADO\n\n📈 Comprado: ${amount} ${baseCurrency}\n💰 Precio: ${price.toLocaleString()} EUR\n💸 Total: ${eurNeeded.toFixed(2)} EUR\n📋 Fee: ${fee.toFixed(4)} EUR\n🆔 ID: ${tradeId}` 
          : `✅ TRADE EXECUTED\n\n📈 Bought: ${amount} ${baseCurrency}\n💰 Price: ${price.toLocaleString()} EUR\n💸 Total: ${eurNeeded.toFixed(2)} EUR\n📋 Fee: ${fee.toFixed(4)} EUR\n🆔 ID: ${tradeId}`);

      } catch (error: any) {
        alert(`❌ Error: ${error.message}`);
      } finally {
        setExecutingTrade(false);
      }

    } else {
      // Vendiendo cripto por EUR
      if (!baseBalance || parseFloat(baseBalance.available) < amount) {
        alert(isSpanish 
          ? `❌ Saldo ${baseCurrency} insuficiente. Tienes: ${baseBalance ? parseFloat(baseBalance.available).toFixed(8) : '0'} ${baseCurrency}` 
          : `❌ Insufficient ${baseCurrency} balance. You have: ${baseBalance ? parseFloat(baseBalance.available).toFixed(8) : '0'} ${baseCurrency}`);
        return;
      }

      try {
        setExecutingTrade(true);
        const eurReceived = amount * price;
        const fee = eurReceived * 0.001; // 0.1% fee KuCoin
        const netEurReceived = eurReceived - fee;

        // Actualizar balances
        let updatedAccounts = tradingAccounts.map((acc: any) => {
          if (acc.currency === baseCurrency) {
            return {
              ...acc,
              available: (parseFloat(acc.available) - amount).toFixed(8),
              balance: (parseFloat(acc.balance) - amount).toFixed(8)
            };
          }
          if (acc.currency === 'EUR') {
            return {
              ...acc,
              available: (parseFloat(acc.available) + netEurReceived).toFixed(4),
              balance: (parseFloat(acc.balance) + netEurReceived).toFixed(4)
            };
          }
          return acc;
        });

        // Si no hay cuenta EUR, crearla
        if (!eurBalance) {
          updatedAccounts.push({
            id: `trade-eur-${Date.now()}`,
            currency: 'EUR',
            type: 'trade',
            balance: netEurReceived.toFixed(4),
            available: netEurReceived.toFixed(4),
            holds: '0'
          });
        }

        setTradingAccounts(updatedAccounts);
        // Persistir balances de trading y sincronizar
        localStorage.setItem('kucoin_trading_accounts', JSON.stringify(updatedAccounts));
        kucoinSyncStore.saveBalances(updatedAccounts);

        // Crear registro de trade
        const tradeRecord = {
          id: tradeId,
          pair,
          side: 'SELL' as const,
          base_currency: baseCurrency,
          quote_currency: 'EUR',
          amount,
          price,
          total: eurReceived,
          fee,
          net_received: netEurReceived,
          timestamp,
          status: 'FILLED',
          balance_after: {
            eur: eurBalance 
              ? parseFloat(eurBalance.available) + netEurReceived 
              : netEurReceived,
            [baseCurrency.toLowerCase()]: parseFloat(baseBalance.available) - amount
          }
        };

        // Agregar al historial, persistir y sincronizar
        const newHistory = [tradeRecord, ...eurTradeHistory].slice(0, 100);
        setEurTradeHistory(newHistory);
        localStorage.setItem('kucoin_eur_trade_history', JSON.stringify(newHistory));
        // Sincronizar con Supabase
        kucoinSyncStore.saveTrade(tradeRecord);
        setSyncStatus('synced');
        setLastSyncTime(new Date());

        // Registrar evento
        kucoinClient.addEvent({
          type: 'trade',
          status: 'success',
          data: tradeRecord,
          message: `🔴 VENTA EJECUTADA: ${amount} ${baseCurrency} @ ${price.toLocaleString()} EUR = ${netEurReceived.toFixed(2)} EUR (fee: ${fee.toFixed(4)} EUR)`
        });
        setEvents(kucoinClient.getEvents());

        alert(isSpanish 
          ? `✅ TRADE EJECUTADO\n\n📉 Vendido: ${amount} ${baseCurrency}\n💰 Precio: ${price.toLocaleString()} EUR\n💸 Total bruto: ${eurReceived.toFixed(2)} EUR\n📋 Fee: ${fee.toFixed(4)} EUR\n✨ Neto recibido: ${netEurReceived.toFixed(2)} EUR\n🆔 ID: ${tradeId}` 
          : `✅ TRADE EXECUTED\n\n📉 Sold: ${amount} ${baseCurrency}\n💰 Price: ${price.toLocaleString()} EUR\n💸 Gross total: ${eurReceived.toFixed(2)} EUR\n📋 Fee: ${fee.toFixed(4)} EUR\n✨ Net received: ${netEurReceived.toFixed(2)} EUR\n🆔 ID: ${tradeId}`);

      } catch (error: any) {
        alert(`❌ Error: ${error.message}`);
      } finally {
        setExecutingTrade(false);
      }
    }
  };

  // ============================================================================
  // COMPRA FORZADA REAL - USA USDT COMO PUENTE PARA COMPRAR CRYPTO REAL
  // ============================================================================
  const executeForceRealBuy = async (targetCrypto: string, eurAmount: string) => {
    const eur = parseFloat(eurAmount);
    if (isNaN(eur) || eur <= 0) {
      alert(isSpanish ? '❌ Monto EUR inválido' : '❌ Invalid EUR amount');
      return;
    }

    if (!config.isConfigured || !config.apiKey || !config.apiSecret || !config.passphrase) {
      alert(isSpanish 
        ? '❌ Necesitas configurar las credenciales API de KuCoin para compras reales' 
        : '❌ You need to configure KuCoin API credentials for real purchases');
      return;
    }

    const eurBalance = tradingAccounts.find((a: any) => a.currency === 'EUR');
    if (!eurBalance || parseFloat(eurBalance.available) < eur) {
      alert(isSpanish 
        ? `❌ Saldo EUR insuficiente. Tienes: ${eurBalance ? parseFloat(eurBalance.available).toFixed(2) : '0'} EUR` 
        : `❌ Insufficient EUR balance. You have: ${eurBalance ? parseFloat(eurBalance.available).toFixed(2) : '0'} EUR`);
      return;
    }

    const confirmMsg = isSpanish
      ? `🔴 COMPRA REAL FORZADA\n\n⚠️ Esta operación usará ${eur.toFixed(2)} EUR (equivalente en USDT) para comprar ${targetCrypto} REAL.\n\nEl crypto será depositado en tu cuenta Trade de KuCoin.\n\n¿Continuar?`
      : `🔴 FORCED REAL PURCHASE\n\n⚠️ This operation will use ${eur.toFixed(2)} EUR (USDT equivalent) to buy REAL ${targetCrypto}.\n\nThe crypto will be deposited in your KuCoin Trade account.\n\nContinue?`;

    if (!confirm(confirmMsg)) return;

    try {
      setExecutingTrade(true);
      
      const response = await fetch('http://localhost:3000/api/kucoin/trading/force-real-buy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          apiKey: config.apiKey,
          apiSecret: config.apiSecret,
          passphrase: config.passphrase,
          targetCrypto,
          eurAmount: eur.toString()
        })
      });

      const data = await response.json();

      if (data.success && data.mode === 'REAL_FORCED') {
        // Descontar EUR del balance local
        const updatedAccounts = tradingAccounts.map((acc: any) => {
          if (acc.currency === 'EUR') {
            return {
              ...acc,
              available: (parseFloat(acc.available) - eur).toFixed(4),
              balance: (parseFloat(acc.balance) - eur).toFixed(4)
            };
          }
          return acc;
        });
        
        setTradingAccounts(updatedAccounts);
        localStorage.setItem('kucoin_trading_accounts', JSON.stringify(updatedAccounts));
        kucoinSyncStore.saveBalances(updatedAccounts);

        // Registrar trade
        const tradeRecord = {
          id: data.data.orderId || `FORCE_${Date.now()}`,
          pair: `${targetCrypto}-EUR`,
          side: 'BUY' as const,
          base_currency: targetCrypto,
          quote_currency: 'EUR',
          amount: parseFloat(data.data.cryptoReceived),
          price: parseFloat(data.data.priceUsdt) * 0.925, // Aproximación EUR
          total: eur,
          fee: eur * 0.001,
          total_with_fee: eur,
          timestamp: data.data.timestamp,
          status: 'FILLED',
          mode: 'REAL_FORCED',
          real_order_id: data.data.orderId,
          usdt_spent: data.data.usdtSpent
        };

        const newHistory = [tradeRecord, ...eurTradeHistory].slice(0, 100);
        setEurTradeHistory(newHistory);
        localStorage.setItem('kucoin_eur_trade_history', JSON.stringify(newHistory));
        kucoinSyncStore.saveTrade(tradeRecord);

        kucoinClient.addEvent({
          type: 'trade',
          status: 'success',
          data: tradeRecord,
          message: `🔴 COMPRA REAL FORZADA: ${data.data.cryptoReceived} ${targetCrypto} comprados con ${eur.toFixed(2)} EUR (${data.data.usdtSpent} USDT)`
        });
        setEvents(kucoinClient.getEvents());

        // Recargar balances de KuCoin para ver el crypto real
        setTimeout(() => loadTradingAccounts(), 2000);

        alert(data.data.message);
      } else {
        alert(isSpanish 
          ? `❌ ${data.message || 'Error en compra real'}\n\n${data.suggestion || ''}` 
          : `❌ ${data.message || 'Real purchase error'}\n\n${data.suggestion || ''}`);
      }
    } catch (error: any) {
      alert(`❌ Error: ${error.message}`);
    } finally {
      setExecutingTrade(false);
    }
  };

  // ============================================================================
  // INYECCIÓN FORZADA DE EUR (CONVIERTE USDT REAL A EUR)
  // ============================================================================
  const forceInjectEur = async (amount: string, source: string = 'Sistema Externo') => {
    const eurAmount = parseFloat(amount);
    if (isNaN(eurAmount) || eurAmount <= 0) {
      alert(isSpanish ? '❌ Monto inválido' : '❌ Invalid amount');
      return;
    }

    if (!config.isConfigured || !config.apiKey) {
      alert(isSpanish 
        ? '❌ Configura las credenciales API para inyección real' 
        : '❌ Configure API credentials for real injection');
      return;
    }

    const confirmMsg = isSpanish
      ? `🔴 INYECCIÓN FORZADA EUR\n\nEsto convertirá USDT real a EUR en tu cuenta KuCoin.\n\nMonto: ${eurAmount.toFixed(2)} EUR (aprox ${(eurAmount / 0.925).toFixed(2)} USDT)\n\n¿Continuar?`
      : `🔴 FORCED EUR INJECTION\n\nThis will convert real USDT to EUR in your KuCoin account.\n\nAmount: ${eurAmount.toFixed(2)} EUR (approx ${(eurAmount / 0.925).toFixed(2)} USDT)\n\nContinue?`;

    if (!confirm(confirmMsg)) return;

    try {
      setExecutingTrade(true);

      const response = await fetch('http://localhost:3000/api/kucoin/trading/inject-eur', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          apiKey: config.apiKey,
          apiSecret: config.apiSecret,
          passphrase: config.passphrase,
          amount: eurAmount.toString(),
          source,
          forceReal: true
        })
      });

      const data = await response.json();

      if (data.success) {
        if (data.mode === 'REAL_FORCED') {
          alert(isSpanish
            ? `✅ INYECCIÓN REAL EXITOSA\n\n${data.data.message}\n\nEUR ahora disponible en tu cuenta Trade de KuCoin.`
            : `✅ REAL INJECTION SUCCESSFUL\n\n${data.data.message}\n\nEUR now available in your KuCoin Trade account.`);
          
          // Recargar balances reales
          setTimeout(() => loadTradingAccounts(), 2000);
        } else {
          // Modo híbrido - agregar EUR localmente
          const updatedAccounts = [...tradingAccounts];
          const eurAccIdx = updatedAccounts.findIndex((a: any) => a.currency === 'EUR');
          
          if (eurAccIdx >= 0) {
            updatedAccounts[eurAccIdx] = {
              ...updatedAccounts[eurAccIdx],
              available: (parseFloat(updatedAccounts[eurAccIdx].available) + eurAmount).toFixed(4),
              balance: (parseFloat(updatedAccounts[eurAccIdx].balance) + eurAmount).toFixed(4)
            };
          } else {
            updatedAccounts.push({
              id: `trade-eur-${Date.now()}`,
              currency: 'EUR',
              type: 'trade',
              balance: eurAmount.toFixed(4),
              available: eurAmount.toFixed(4),
              holds: '0'
            });
          }
          
          setTradingAccounts(updatedAccounts);
          localStorage.setItem('kucoin_trading_accounts', JSON.stringify(updatedAccounts));

          alert(isSpanish
            ? `✅ EUR INYECTADO (MODO HÍBRIDO)\n\n${data.data.message}\n\n⚠️ Para inyección 100% real, necesitas USDT en tu Trade Account.`
            : `✅ EUR INJECTED (HYBRID MODE)\n\n${data.data.message}\n\n⚠️ For 100% real injection, you need USDT in your Trade Account.`);
        }

        kucoinClient.addEvent({
          type: 'deposit',
          status: 'success',
          data: data.data,
          message: data.data.message
        });
        setEvents(kucoinClient.getEvents());
      } else {
        alert(`❌ Error: ${data.message || 'Inyección fallida'}`);
      }
    } catch (error: any) {
      alert(`❌ Error: ${error.message}`);
    } finally {
      setExecutingTrade(false);
    }
  };

  // ============================================================================
  // CONVERTIR EUR REAL → USDT REAL
  // ============================================================================
  const convertEurToUsdtReal = async (amount: string) => {
    const eurAmount = parseFloat(amount);
    if (isNaN(eurAmount) || eurAmount <= 0) {
      alert(isSpanish ? '❌ Monto EUR inválido' : '❌ Invalid EUR amount');
      return;
    }

    if (!config.isConfigured || !config.apiKey || !config.apiSecret || !config.passphrase) {
      alert(isSpanish 
        ? '❌ Configura las credenciales API de KuCoin para conversiones reales' 
        : '❌ Configure KuCoin API credentials for real conversions');
      return;
    }

    const eurBalance = tradingAccounts.find((a: any) => a.currency === 'EUR');
    const availableEur = eurBalance ? parseFloat(eurBalance.available) : 0;

    if (availableEur < eurAmount) {
      alert(isSpanish 
        ? `❌ Saldo EUR insuficiente. Tienes: ${availableEur.toFixed(2)} EUR, necesitas: ${eurAmount.toFixed(2)} EUR` 
        : `❌ Insufficient EUR balance. You have: ${availableEur.toFixed(2)} EUR, need: ${eurAmount.toFixed(2)} EUR`);
      return;
    }

    const estimatedUsdt = eurAmount / 0.925;
    const confirmMsg = isSpanish
      ? `🔴 CONVERSIÓN REAL EUR → USDT\n\n⚠️ Esta operación comprará USDT con tu EUR REAL en KuCoin.\n\nGastarás: ${eurAmount.toFixed(2)} EUR\nRecibirás: ~${estimatedUsdt.toFixed(2)} USDT\n\n¿Continuar?`
      : `🔴 REAL EUR → USDT CONVERSION\n\n⚠️ This operation will buy USDT with your REAL EUR on KuCoin.\n\nYou'll spend: ${eurAmount.toFixed(2)} EUR\nYou'll receive: ~${estimatedUsdt.toFixed(2)} USDT\n\nContinue?`;

    if (!confirm(confirmMsg)) return;

    try {
      setExecutingTrade(true);

      const response = await fetch('http://localhost:3000/api/kucoin/trading/eur-to-usdt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          apiKey: config.apiKey,
          apiSecret: config.apiSecret,
          passphrase: config.passphrase,
          eurAmount: eurAmount.toString()
        })
      });

      const data = await response.json();

      if (data.success) {
        // Actualizar balances locales
        const updatedAccounts = tradingAccounts.map((acc: any) => {
          if (acc.currency === 'EUR') {
            return {
              ...acc,
              available: (parseFloat(acc.available) - eurAmount).toFixed(4),
              balance: (parseFloat(acc.balance) - eurAmount).toFixed(4)
            };
          }
          if (acc.currency === 'USDT') {
            return {
              ...acc,
              available: (parseFloat(acc.available) + parseFloat(data.data.usdtReceived)).toFixed(4),
              balance: (parseFloat(acc.balance) + parseFloat(data.data.usdtReceived)).toFixed(4)
            };
          }
          return acc;
        });

        // Si no existía cuenta USDT en trade, agregarla
        if (!tradingAccounts.find((a: any) => a.currency === 'USDT')) {
          updatedAccounts.push({
            id: `trade-usdt-${Date.now()}`,
            currency: 'USDT',
            type: 'trade',
            balance: data.data.usdtReceived,
            available: data.data.usdtReceived,
            holds: '0'
          });
        }

        setTradingAccounts(updatedAccounts);
        localStorage.setItem('kucoin_trading_accounts', JSON.stringify(updatedAccounts));
        kucoinSyncStore.saveBalances(updatedAccounts);

        kucoinClient.addEvent({
          type: 'trade',
          status: 'success',
          data: data.data,
          message: data.data.message
        });
        setEvents(kucoinClient.getEvents());

        // Recargar balances reales de KuCoin
        setTimeout(() => loadTradingAccounts(), 2000);

        alert(data.data.message);
      } else {
        alert(isSpanish 
          ? `❌ ${data.message || 'Error en conversión'}\n\n${data.suggestion || ''}` 
          : `❌ ${data.message || 'Conversion error'}\n\n${data.suggestion || ''}`);
      }
    } catch (error: any) {
      alert(`❌ Error: ${error.message}`);
    } finally {
      setExecutingTrade(false);
    }
  };

  // ============================================================================
  // FUNCIONES PARA MÓDULO FIAT
  // ============================================================================
  const loadFiatCurrencies = async () => {
    try {
      const response = await fetch('http://localhost:3000/api/kucoin/fiat/currencies');
      const data = await response.json();
      if (data.success && data.data) {
        setFiatCurrencies(data.data.currencies || []);
      }
    } catch (error) {
      console.error('[KuCoin Fiat] Error:', error);
    }
  };

  const handleFiatDeposit = async () => {
    if (!fiatDepositCurrency || !fiatDepositAmount || parseFloat(fiatDepositAmount) <= 0) {
      alert(isSpanish ? '❌ Completa todos los campos' : '❌ Fill all fields');
      return;
    }

    const amount = parseFloat(fiatDepositAmount);
    let sourceName = 'Manual Deposit';
    let sourceType = fiatFundSource;

    // Validar fuente de fondos
    if (fiatFundSource === 'custody') {
      if (!selectedFiatCustodyAccount) {
        alert(isSpanish ? '❌ Selecciona una cuenta custodio' : '❌ Select a custody account');
        return;
      }
      const custodyAcc = custodyAccounts.find(a => a.id === selectedFiatCustodyAccount);
      if (!custodyAcc) {
        alert(isSpanish ? '❌ Cuenta custodio no encontrada' : '❌ Custody account not found');
        return;
      }
      if (custodyAcc.availableBalance < amount) {
        alert(isSpanish 
          ? `❌ Fondos insuficientes en ${custodyAcc.accountName}. Disponible: $${custodyAcc.availableBalance.toLocaleString()}`
          : `❌ Insufficient funds in ${custodyAcc.accountName}. Available: $${custodyAcc.availableBalance.toLocaleString()}`);
        return;
      }
      sourceName = custodyAcc.accountName;
    } else if (fiatFundSource === 'daes_card') {
      if (!selectedDaesCard) {
        alert(isSpanish ? '❌ Selecciona una tarjeta DAES' : '❌ Select a DAES card');
        return;
      }
      const card = daesCards.find(c => c.id === selectedDaesCard);
      if (!card) {
        alert(isSpanish ? '❌ Tarjeta DAES no encontrada' : '❌ DAES card not found');
        return;
      }
      if (card.balance < amount) {
        alert(isSpanish 
          ? `❌ Fondos insuficientes en ${card.name}. Disponible: $${card.balance.toLocaleString()}`
          : `❌ Insufficient funds in ${card.name}. Available: $${card.balance.toLocaleString()}`);
        return;
      }
      sourceName = card.name;
    }

    // Confirmar operación
    const confirmed = confirm(isSpanish
      ? `¿Depositar $${amount.toLocaleString()} ${fiatDepositCurrency} desde ${sourceName} a KuCoin Funding?`
      : `Deposit $${amount.toLocaleString()} ${fiatDepositCurrency} from ${sourceName} to KuCoin Funding?`);
    
    if (!confirmed) return;

    try {
      // Si viene de Custody, descontar del saldo
      if (fiatFundSource === 'custody' && selectedFiatCustodyAccount) {
        custodyStore.withdrawFundsWithTransaction(selectedFiatCustodyAccount, {
          amount: amount,
          description: `KuCoin Fiat Deposit | Transfer to KuCoin Funding Account`,
          destinationAccount: 'KuCoin Funding Account',
          destinationBank: 'KuCoin Exchange',
          transactionDate: new Date().toISOString().split('T')[0],
          transactionTime: new Date().toTimeString().split(' ')[0]
        });
        setCustodyAccounts(custodyStore.getAccounts());
      }
      
      // Si viene de DAES Card, descontar del saldo
      if (fiatFundSource === 'daes_card' && selectedDaesCard) {
        const updatedCards = daesCards.map(c => 
          c.id === selectedDaesCard ? { ...c, balance: c.balance - amount } : c
        );
        setDaesCards(updatedCards);
        localStorage.setItem('daes_cards', JSON.stringify(updatedCards));
      }

      // Actualizar balance en Funding Account
      setAccounts(prevAccounts => {
        const newAccounts = [...prevAccounts];
        const currencyIndex = newAccounts.findIndex(a => a.currency === fiatDepositCurrency && a.type === 'main');
        
        if (currencyIndex >= 0) {
          const currentBalance = parseFloat(newAccounts[currencyIndex].available) || 0;
          const currentTotal = parseFloat(newAccounts[currencyIndex].balance) || 0;
          newAccounts[currencyIndex] = {
            ...newAccounts[currencyIndex],
            available: (currentBalance + amount).toFixed(2),
            balance: (currentTotal + amount).toFixed(2)
          };
        } else {
          newAccounts.push({
            id: `main-${fiatDepositCurrency.toLowerCase()}-${Date.now()}`,
            currency: fiatDepositCurrency,
            type: 'main',
            balance: amount.toFixed(2),
            available: amount.toFixed(2),
            holds: '0'
          });
        }
        
        return newAccounts;
      });

      // Actualizar Funding Fiat
      setFundingFiat(prevFiat => {
        const newFiat = [...prevFiat];
        const index = newFiat.findIndex((f: any) => f.currency === fiatDepositCurrency);
        
        if (index >= 0) {
          const currentBalance = parseFloat(newFiat[index].available) || 0;
          newFiat[index] = {
            ...newFiat[index],
            available: (currentBalance + amount).toFixed(2),
            balance: (currentBalance + amount).toFixed(2)
          };
        } else {
          newFiat.push({
            id: `funding-${fiatDepositCurrency.toLowerCase()}-${Date.now()}`,
            currency: fiatDepositCurrency,
            available: amount.toFixed(2),
            balance: amount.toFixed(2),
            isFiat: true
          });
        }
        
        return newFiat;
      });

      // Agregar evento
      kucoinClient.addEvent({
        type: 'balance',
        status: 'success',
        data: { 
          currency: fiatDepositCurrency, 
          amount: amount.toFixed(2),
          source: sourceName,
          sourceType: sourceType
        },
        message: `💵 Fiat Deposit: +$${amount.toLocaleString()} ${fiatDepositCurrency} desde ${sourceName}`
      });
      setEvents(kucoinClient.getEvents());

      alert(isSpanish 
        ? `✓ Depósito Fiat completado!\n$${amount.toLocaleString()} ${fiatDepositCurrency}\nFuente: ${sourceName}` 
        : `✓ Fiat deposit completed!\n$${amount.toLocaleString()} ${fiatDepositCurrency}\nSource: ${sourceName}`);
      
      setFiatDepositAmount('');
      
    } catch (error: any) {
      alert(`❌ Error: ${error.message}`);
    }
  };

  // ============================================================================
  // FUNCIONES PARA MÓDULO TRADING
  // ============================================================================
  const loadTradingAccounts = async () => {
    try {
      // 1. Primero cargar balances persistidos localmente
      const savedAccounts = localStorage.getItem('kucoin_trading_accounts');
      const localAccounts: any[] = savedAccounts ? JSON.parse(savedAccounts) : [];
      
      // Construir headers con credenciales si están configuradas
      const headers: Record<string, string> = {
        'Content-Type': 'application/json'
      };
      
      const isRealMode = config.isConfigured && config.apiKey && config.apiSecret && config.passphrase;
      
      if (isRealMode) {
        headers['KC-API-KEY'] = config.apiKey;
        headers['KC-API-SECRET'] = config.apiSecret;
        headers['KC-API-PASSPHRASE'] = config.passphrase;
      }
      
      const response = await fetch('http://localhost:3000/api/kucoin/trading/spot/accounts', { headers });
      const data = await response.json();
      
      if (data.success && data.data) {
        const serverAccounts = data.data.accounts || data.data || [];
        const isApiRealData = data.mode === 'REAL'; // La API indica si son datos reales de KuCoin
        
        let mergedAccounts: any[] = [];
        
        if (isRealMode && isApiRealData) {
          // 🔴 MODO REAL: SIEMPRE priorizar datos de la API de KuCoin
          console.log('[KuCoin Trading] 🔴 MODO REAL - Usando datos de KuCoin API');
          mergedAccounts = serverAccounts.map((acc: any) => {
            console.log(`[KuCoin Trading] ${acc.currency}: API balance = ${acc.available}`);
            return acc;
          });
          
          // Solo agregar cuentas locales que NO estén en la API (como EUR cargado manualmente)
          localAccounts.forEach((localAcc: any) => {
            if (!mergedAccounts.find((m: any) => m.currency === localAcc.currency)) {
              // Solo agregar si es una moneda local especial (EUR cargado, etc.)
              if (['EUR'].includes(localAcc.currency) && parseFloat(localAcc.available) > 0) {
                console.log(`[KuCoin Trading] ${localAcc.currency}: Agregando cuenta local especial ${localAcc.available}`);
                mergedAccounts.push(localAcc);
              }
            }
          });
        } else {
          // 🟢 MODO LOCAL/SIMULACIÓN: Mantener comportamiento actual
          console.log('[KuCoin Trading] 🟢 MODO LOCAL - Usando datos simulados/locales');
          mergedAccounts = [...serverAccounts];
          
          localAccounts.forEach((localAcc: any) => {
            const existingIdx = mergedAccounts.findIndex((a: any) => a.currency === localAcc.currency);
            if (existingIdx >= 0) {
              const serverBalance = parseFloat(mergedAccounts[existingIdx].available) || 0;
              const localBalance = parseFloat(localAcc.available) || 0;
              
              if (localBalance !== serverBalance) {
                mergedAccounts[existingIdx] = {
                  ...mergedAccounts[existingIdx],
                  ...localAcc,
                  available: localAcc.available,
                  balance: localAcc.balance
                };
              }
            } else {
              mergedAccounts.push(localAcc);
            }
          });
        }
        
        setTradingAccounts(mergedAccounts);
        // Persistir la mezcla
        localStorage.setItem('kucoin_trading_accounts', JSON.stringify(mergedAccounts));
        console.log('[KuCoin Trading] ✓ Cuentas procesadas:', mergedAccounts.length, 'modo:', isApiRealData ? 'REAL' : 'LOCAL');
        
        // Actualizar accounts principal con datos de trade
        setAccounts(prev => {
          const newAccounts = [...prev];
          mergedAccounts.forEach((acc: any) => {
            const existingIdx = newAccounts.findIndex(a => a.currency === acc.currency && a.type === 'trade');
            if (existingIdx >= 0) {
              newAccounts[existingIdx] = { ...newAccounts[existingIdx], ...acc, type: 'trade' };
            } else {
              newAccounts.push({ ...acc, type: 'trade' });
            }
          });
          return newAccounts;
        });
        
        console.log('[KuCoin Trading] ✓ Cuentas cargadas (merged):', mergedAccounts.length, 'local:', localAccounts.length);
      } else if (localAccounts.length > 0) {
        // Si no hay respuesta del server pero hay datos locales, usarlos
        setTradingAccounts(localAccounts);
        console.log('[KuCoin Trading] ✓ Usando cuentas locales:', localAccounts.length);
      }
    } catch (error) {
      console.error('[KuCoin Trading] Error:', error);
      // En caso de error, usar datos locales si existen
      const savedAccounts = localStorage.getItem('kucoin_trading_accounts');
      if (savedAccounts) {
        setTradingAccounts(JSON.parse(savedAccounts));
        console.log('[KuCoin Trading] ✓ Fallback a cuentas locales');
      }
    }
  };

  const loadMarketSymbols = async (market: string) => {
    try {
      const response = await fetch(`http://localhost:3000/api/kucoin/trading/market/${market}`);
      const data = await response.json();
      if (data.success && data.data) {
        setMarketSymbols(data.data.symbols || []);
      }
    } catch (error) {
      console.error('[KuCoin Market Symbols] Error:', error);
    }
  };

  const loadMarketTickers = async (market: string) => {
    try {
      const response = await fetch(`http://localhost:3000/api/kucoin/trading/market/${market}/tickers`);
      const data = await response.json();
      if (data.success && data.data) {
        setMarketTickers(data.data.ticker || []);
      }
    } catch (error) {
      console.error('[KuCoin Market Tickers] Error:', error);
    }
  };

  // Efecto para cargar datos según la pestaña activa
  useEffect(() => {
    if (activeTab === 'funding') {
      loadFundingAccounts();
    } else if (activeTab === 'fiat') {
      loadFiatCurrencies();
      loadFundingAccounts();
    } else if (activeTab === 'trading') {
      loadTradingAccounts();
      loadMarketSymbols(selectedMarket);
      loadMarketTickers(selectedMarket);
    }
  }, [activeTab]);

  // Efecto para cargar tickers cuando cambia el mercado
  useEffect(() => {
    if (activeTab === 'trading') {
      loadMarketSymbols(selectedMarket);
      loadMarketTickers(selectedMarket);
    }
  }, [selectedMarket]);

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

  // ============================================================================
  // FUNCIONES DE PERSISTENCIA (localStorage)
  // ============================================================================
  
  // Guardar accounts en localStorage
  const saveAccountsToStorage = useCallback((accountsData: KuCoinAccount[]) => {
    try {
      localStorage.setItem(KUCOIN_ACCOUNTS_KEY, JSON.stringify(accountsData));
      console.log('[KuCoin] ✓ Accounts guardados en localStorage:', accountsData.length);
    } catch (error) {
      console.error('[KuCoin] Error guardando accounts:', error);
    }
  }, []);
  
  // Guardar funding en localStorage
  const saveFundingToStorage = useCallback((fundingData: any) => {
    try {
      localStorage.setItem(KUCOIN_FUNDING_KEY, JSON.stringify(fundingData));
      console.log('[KuCoin] ✓ Funding guardado en localStorage');
    } catch (error) {
      console.error('[KuCoin] Error guardando funding:', error);
    }
  }, []);
  
  // Cargar accounts desde localStorage
  const loadAccountsFromStorage = useCallback((): KuCoinAccount[] => {
    try {
      const stored = localStorage.getItem(KUCOIN_ACCOUNTS_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        console.log('[KuCoin] ✓ Accounts cargados desde localStorage:', parsed.length);
        return parsed;
      }
    } catch (error) {
      console.error('[KuCoin] Error cargando accounts:', error);
    }
    return [];
  }, []);
  
  // Cargar funding desde localStorage
  const loadFundingFromStorage = useCallback(() => {
    try {
      const stored = localStorage.getItem(KUCOIN_FUNDING_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        console.log('[KuCoin] ✓ Funding cargado desde localStorage');
        return parsed;
      }
    } catch (error) {
      console.error('[KuCoin] Error cargando funding:', error);
    }
    return { fundingAccounts: [], fundingFiat: [], fundingCrypto: [] };
  }, []);
  
  // Cargar DAES Cards desde localStorage
  const loadDaesCards = useCallback(() => {
    try {
      const stored = localStorage.getItem('daes_cards');
      if (stored) {
        const cards = JSON.parse(stored);
        setDaesCards(cards);
        return cards;
      }
      // Si no hay cards guardadas, crear algunas de ejemplo
      const defaultCards = [
        { id: 'card-001', name: 'DAES Platinum', balance: 5000, currency: 'USD', status: 'active' },
        { id: 'card-002', name: 'DAES Gold', balance: 2500, currency: 'USD', status: 'active' }
      ];
      setDaesCards(defaultCards);
      localStorage.setItem('daes_cards', JSON.stringify(defaultCards));
      return defaultCards;
    } catch (error) {
      console.error('[KuCoin] Error cargando DAES Cards:', error);
      return [];
    }
  }, []);

  // Efecto para persistir accounts cuando cambian
  useEffect(() => {
    if (accounts.length > 0) {
      saveAccountsToStorage(accounts);
    }
  }, [accounts, saveAccountsToStorage]);

  // Efecto para persistir funding cuando cambia
  useEffect(() => {
    if (fundingAccounts.length > 0 || fundingFiat.length > 0 || fundingCrypto.length > 0) {
      saveFundingToStorage({ fundingAccounts, fundingFiat, fundingCrypto });
    }
  }, [fundingAccounts, fundingFiat, fundingCrypto, saveFundingToStorage]);

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

    // Cargar datos persistentes desde localStorage
    const storedAccounts = loadAccountsFromStorage();
    if (storedAccounts.length > 0) {
      setAccounts(storedAccounts);
    }
    
    const storedFunding = loadFundingFromStorage();
    if (storedFunding.fundingAccounts?.length > 0) {
      setFundingAccounts(storedFunding.fundingAccounts);
      setFundingFiat(storedFunding.fundingFiat || []);
      setFundingCrypto(storedFunding.fundingCrypto || []);
    }
    
    // Cargar DAES Cards
    loadDaesCards();

    // Cargar cuentas custodio
    const loadCustodyAccountsData = () => {
      const custodyData = custodyStore.getAccounts();
      setCustodyAccounts(custodyData);
    };
    loadCustodyAccountsData();

    // Suscribirse a cambios en custody accounts
    const unsubscribeCustody = custodyStore.subscribe((custodyData) => {
      setCustodyAccounts(custodyData);
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
      unsubscribeCustody();
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

  // 🔄 Sincronizar con Supabase al iniciar
  useEffect(() => {
    const syncWithSupabase = async () => {
      setSyncStatus('syncing');
      try {
        const result = await kucoinSyncStore.syncAll();
        console.log('[KuCoin] ✓ Sincronizado con Supabase:', result);
        
        // Cargar trades desde Supabase
        const trades = await kucoinSyncStore.getTrades();
        if (trades.length > 0) {
          setEurTradeHistory(trades);
        }
        
        // Cargar balances desde Supabase
        const balances = await kucoinSyncStore.getBalances();
        if (balances.length > 0) {
          setTradingAccounts(prevAccounts => {
            const merged = [...prevAccounts];
            balances.forEach((remoteBalance: any) => {
              const existingIdx = merged.findIndex(a => a.currency === remoteBalance.currency && a.type === remoteBalance.type);
              if (existingIdx === -1) {
                merged.push(remoteBalance);
              }
            });
            return merged;
          });
        }
        
        setSyncStatus('synced');
        setLastSyncTime(new Date());
      } catch (error) {
        console.error('[KuCoin] Error sincronizando:', error);
        setSyncStatus('error');
      }
    };

    syncWithSupabase();
  }, []);

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
    setIsLoading(true);
    try {
      // Primero probar el proxy
      const proxyTest = await kucoinClient.testProxy();
      console.log('[KuCoin UI] Proxy test:', proxyTest);
      
      if (!proxyTest.success) {
        setConnectionStatus('error');
        alert(isSpanish 
          ? `❌ Error de proxy: ${proxyTest.message}\n\nAsegúrate de que el servidor esté corriendo:\ncd server && node index.js` 
          : `❌ Proxy error: ${proxyTest.message}\n\nMake sure the server is running:\ncd server && node index.js`);
        setIsLoading(false);
        return;
      }

      // Luego probar la conexión completa
      const result = await kucoinClient.testConnection();
      if (result.success) {
        setConnectionStatus('connected');
        setAccounts(result.accounts || []);
        const modeInfo = result.mode === 'LOCAL_SIMULATION' 
          ? (isSpanish ? ' (Modo Local)' : ' (Local Mode)')
          : '';
        alert(isSpanish 
          ? `✓ ${result.message}${modeInfo}` 
          : `✓ ${result.message}${modeInfo}`);
      } else {
        setConnectionStatus('error');
        alert(`❌ ${result.message}`);
      }
    } catch (error: any) {
      setConnectionStatus('error');
      console.error('[KuCoin UI] Test error:', error);
      alert(`❌ Error: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  // Test WebSocket
  const handleTestWebSocket = async () => {
    setWsStatus('connecting');
    try {
      // Primero verificar que el proxy esté online
      const proxyTest = await kucoinClient.testProxy();
      if (!proxyTest.success) {
        setWsStatus('disconnected');
        alert(isSpanish 
          ? `❌ Error de proxy: ${proxyTest.message}` 
          : `❌ Proxy error: ${proxyTest.message}`);
        return;
      }

      const result = await kucoinClient.testWebSocket();
      if (result.success) {
        setWsStatus('connected');
        alert(isSpanish 
          ? `✓ ${result.message}` 
          : `✓ ${result.message}`);
      } else {
        setWsStatus('disconnected');
        alert(`❌ ${result.message}`);
      }
    } catch (error: any) {
      setWsStatus('disconnected');
      console.error('[KuCoin UI] WS Test error:', error);
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

    // Validar cuenta custodio si está seleccionada
    let custodyAccount: CustodyAccount | null = null;
    if (useCustodyFunds && selectedCustodyAccount) {
      custodyAccount = custodyAccounts.find(a => a.id === selectedCustodyAccount) || null;
      if (!custodyAccount) {
        alert(isSpanish ? '❌ Cuenta custodio no encontrada' : '❌ Custody account not found');
        return;
      }
      const amount = parseFloat(convertForm.usdAmount);
      if (custodyAccount.availableBalance < amount) {
        alert(isSpanish 
          ? `❌ Fondos insuficientes en cuenta custodio. Disponible: ${custodyAccount.currency} ${custodyAccount.availableBalance.toLocaleString()}` 
          : `❌ Insufficient funds in custody account. Available: ${custodyAccount.currency} ${custodyAccount.availableBalance.toLocaleString()}`);
        return;
      }
    }

    const sourceInfo = useCustodyFunds && custodyAccount 
      ? `\n${isSpanish ? 'Cuenta Origen' : 'Source Account'}: ${custodyAccount.accountName}`
      : '';

    const confirmed = confirm(isSpanish
      ? `¿Confirmar conversión de ${convertForm.usdAmount} USD a USDT y envío a ${convertForm.destAddress.slice(0, 15)}...?${sourceInfo}`
      : `Confirm conversion of ${convertForm.usdAmount} USD to USDT and send to ${convertForm.destAddress.slice(0, 15)}...?${sourceInfo}`
    );

    if (!confirmed) return;

    setIsLoading(true);
    setCurrentOperations([]);

    try {
      // Si usamos fondos de cuenta custodio, registrar el retiro
      if (useCustodyFunds && custodyAccount) {
        const amount = parseFloat(convertForm.usdAmount);
        
        // Registrar retiro en la cuenta custodio
        custodyStore.withdrawFundsWithTransaction(custodyAccount.id, {
          amount: amount,
          description: `KuCoin USD→USDT Conversion | Dest: ${convertForm.destAddress.slice(0, 20)}... | Network: ${convertForm.network}`,
          destinationAccount: convertForm.destAddress,
          destinationBank: 'KuCoin Exchange',
          transactionDate: new Date().toISOString().split('T')[0],
          transactionTime: new Date().toTimeString().split(' ')[0]
        });

        // Actualizar lista de cuentas
        setCustodyAccounts(custodyStore.getAccounts());
      }

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
        const custodyInfo = useCustodyFunds && custodyAccount 
          ? `\n${isSpanish ? 'Descontado de' : 'Deducted from'}: ${custodyAccount.accountName}`
          : '';
        
        alert(isSpanish
          ? `✓ ¡Conversión completada!\nUSDT enviado: ${flow.usdtReceived}\nID de retiro: ${flow.withdrawalId}${custodyInfo}`
          : `✓ Conversion completed!\nUSDT sent: ${flow.usdtReceived}\nWithdrawal ID: ${flow.withdrawalId}${custodyInfo}`
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
              {/* Indicador de Sincronización Supabase */}
              <div className={`flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer transition-all ${
                syncStatus === 'synced' ? 'bg-blue-500/20 text-blue-400' :
                syncStatus === 'syncing' ? 'bg-yellow-500/20 text-yellow-400' :
                syncStatus === 'error' ? 'bg-red-500/20 text-red-400' :
                'bg-gray-500/20 text-gray-400'
              }`} onClick={async () => {
                setSyncStatus('syncing');
                try {
                  await kucoinSyncStore.syncAll();
                  const trades = await kucoinSyncStore.getTrades();
                  if (trades.length > 0) setEurTradeHistory(trades);
                  setSyncStatus('synced');
                  setLastSyncTime(new Date());
                } catch { setSyncStatus('error'); }
              }} title={lastSyncTime ? `Última sync: ${lastSyncTime.toLocaleTimeString()}` : 'Click para sincronizar'}>
                {syncStatus === 'syncing' ? <RefreshCw className="w-4 h-4 animate-spin" /> :
                 syncStatus === 'synced' ? <Database className="w-4 h-4" /> :
                 syncStatus === 'error' ? <AlertTriangle className="w-4 h-4" /> :
                 <Database className="w-4 h-4" />}
                <span className="text-xs">SYNC</span>
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
            { id: 'funding', icon: Wallet, label: '💰 Funding', highlight: true },
            { id: 'fiat', icon: DollarSign, label: '💵 Fiat' },
            { id: 'trading', icon: TrendingUp, label: '📊 Trading' },
            { id: 'swap', icon: Repeat, label: '🔄 Swap' },
            { id: 'convert', icon: ArrowRightLeft, label: 'USD→USDT' },
            { id: 'custody', icon: Database, label: isSpanish ? 'Cuentas' : 'Accounts', count: custodyAccounts.length },
            { id: 'history', icon: History, label: isSpanish ? 'Historial' : 'History', count: flows.length + swapHistory.length },
            { id: 'config', icon: Settings, label: 'Config', alert: !config.isConfigured },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-5 py-3 rounded-lg font-bold flex items-center gap-2 transition-all ${
                activeTab === tab.id 
                  ? 'bg-gradient-to-r from-green-600 to-emerald-600 text-white shadow-lg shadow-green-500/30' 
                  : (tab as any).highlight && activeTab !== tab.id
                    ? 'bg-gradient-to-r from-amber-600/30 to-orange-600/30 text-amber-300 border border-amber-500/50 hover:from-amber-600/50 hover:to-orange-600/50'
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
            
            {/* ================================================================
                FUNDING TAB - Main Account / Financiamiento
            ================================================================ */}
            {activeTab === 'funding' && (
              <div className="space-y-6">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-gradient-to-br from-emerald-500 to-green-500 rounded-xl flex items-center justify-center">
                      <Wallet className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <h2 className="text-xl font-bold">{isSpanish ? 'Cuenta Funding (Main)' : 'Funding Account (Main)'}</h2>
                      <p className="text-sm text-gray-400">{isSpanish ? 'Depósitos, Retiros y Transferencias' : 'Deposits, Withdrawals & Transfers'}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      loadFundingAccounts();
                      // También sincronizar con accounts persistidos
                      const mainAccounts = accounts.filter(a => a.type === 'main');
                      if (mainAccounts.length > 0) {
                        const fiat = mainAccounts.filter(a => ['USD', 'EUR', 'GBP', 'AUD', 'CAD'].includes(a.currency));
                        const crypto = mainAccounts.filter(a => !['USD', 'EUR', 'GBP', 'AUD', 'CAD'].includes(a.currency));
                        if (fiat.length > 0) setFundingFiat(prev => [...fiat, ...prev.filter((p: any) => !fiat.find(f => f.currency === p.currency))]);
                        if (crypto.length > 0) setFundingCrypto(prev => [...crypto, ...prev.filter((p: any) => !crypto.find(c => c.currency === p.currency))]);
                      }
                    }}
                    className="p-2 bg-gray-700 rounded-lg hover:bg-gray-600"
                  >
                    <RefreshCw className="w-5 h-5" />
                  </button>
                </div>

                {/* Balance Total Destacado */}
                {accounts.filter(a => a.type === 'main').length > 0 && (
                  <div className="bg-gradient-to-r from-emerald-600/20 to-green-600/20 border-2 border-emerald-500/50 rounded-xl p-6">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-bold text-emerald-400">
                        💰 {isSpanish ? 'Balance Total en Main Account' : 'Total Balance in Main Account'}
                      </h3>
                      <span className="text-xs bg-emerald-500/20 text-emerald-400 px-2 py-1 rounded-full">
                        {accounts.filter(a => a.type === 'main').length} {isSpanish ? 'monedas' : 'currencies'}
                      </span>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      {accounts.filter(a => a.type === 'main' && parseFloat(a.available) > 0).map((acc) => (
                        <div key={acc.id} className="bg-black/40 rounded-xl p-4 text-center">
                          <div className="text-3xl font-bold text-white mb-1">
                            {['USD', 'EUR', 'GBP'].includes(acc.currency) 
                              ? `${acc.currency === 'USD' ? '$' : acc.currency === 'EUR' ? '€' : '£'}${parseFloat(acc.available).toLocaleString()}`
                              : parseFloat(acc.available).toFixed(acc.currency === 'BTC' || acc.currency === 'ETH' ? 8 : 2)
                            }
                          </div>
                          <div className="text-sm text-gray-400">{acc.currency}</div>
                          <div className="text-xs text-emerald-400 mt-1">Main</div>
                        </div>
                      ))}
                      {accounts.filter(a => a.type === 'main' && parseFloat(a.available) > 0).length === 0 && (
                        <div className="col-span-4 text-center py-4 text-gray-500">
                          {isSpanish ? 'No hay balances en Main Account' : 'No balances in Main Account'}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Resumen de Balances */}
                <div className="grid grid-cols-3 gap-4">
                  <div className="bg-gradient-to-r from-green-900/30 to-emerald-900/30 border border-green-500/30 rounded-xl p-4">
                    <h3 className="text-sm text-gray-400 mb-2">💵 Fiat</h3>
                    <div className="space-y-1">
                      {/* Mostrar de accounts primero */}
                      {accounts.filter(a => a.type === 'main' && ['USD', 'EUR', 'GBP'].includes(a.currency)).map((acc) => (
                        <div key={acc.id} className="flex justify-between">
                          <span className="text-sm text-gray-300">{acc.currency}</span>
                          <span className="text-sm font-bold text-green-400">
                            {acc.currency === 'USD' ? '$' : acc.currency === 'EUR' ? '€' : '£'}
                            {parseFloat(acc.available).toLocaleString()}
                          </span>
                        </div>
                      ))}
                      {/* Luego de fundingFiat si no está en accounts */}
                      {fundingFiat.filter((f: any) => !accounts.find(a => a.type === 'main' && a.currency === f.currency)).slice(0, 3).map((acc: any) => (
                        <div key={acc.id} className="flex justify-between">
                          <span className="text-sm text-gray-300">{acc.currency}</span>
                          <span className="text-sm font-bold text-green-400">{parseFloat(acc.available).toLocaleString()}</span>
                        </div>
                      ))}
                      {accounts.filter(a => a.type === 'main' && ['USD', 'EUR', 'GBP'].includes(a.currency)).length === 0 && fundingFiat.length === 0 && (
                        <div className="text-xs text-gray-500">{isSpanish ? 'Sin balances' : 'No balances'}</div>
                      )}
                    </div>
                  </div>
                  <div className="bg-gradient-to-r from-blue-900/30 to-cyan-900/30 border border-blue-500/30 rounded-xl p-4">
                    <h3 className="text-sm text-gray-400 mb-2">💎 Stablecoins</h3>
                    <div className="space-y-1">
                      {accounts.filter(a => a.type === 'main' && ['USDT', 'USDC'].includes(a.currency)).map((acc) => (
                        <div key={acc.id} className="flex justify-between">
                          <span className="text-sm text-gray-300">{acc.currency}</span>
                          <span className="text-sm font-bold text-blue-400">{parseFloat(acc.available).toLocaleString()}</span>
                        </div>
                      ))}
                      {fundingCrypto.filter((acc: any) => ['USDT', 'USDC'].includes(acc.currency) && !accounts.find(a => a.type === 'main' && a.currency === acc.currency)).map((acc: any) => (
                        <div key={acc.id} className="flex justify-between">
                          <span className="text-sm text-gray-300">{acc.currency}</span>
                          <span className="text-sm font-bold text-blue-400">{parseFloat(acc.available).toLocaleString()}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="bg-gradient-to-r from-amber-900/30 to-orange-900/30 border border-amber-500/30 rounded-xl p-4">
                    <h3 className="text-sm text-gray-400 mb-2">₿ Crypto</h3>
                    <div className="space-y-1">
                      {accounts.filter(a => a.type === 'main' && !['USD', 'EUR', 'GBP', 'USDT', 'USDC'].includes(a.currency)).slice(0, 3).map((acc) => (
                        <div key={acc.id} className="flex justify-between">
                          <span className="text-sm text-gray-300">{acc.currency}</span>
                          <span className="text-sm font-bold text-amber-400">{parseFloat(acc.available).toLocaleString()}</span>
                        </div>
                      ))}
                      {fundingCrypto.filter((acc: any) => !['USDT', 'USDC'].includes(acc.currency) && !accounts.find(a => a.type === 'main' && a.currency === acc.currency)).slice(0, 3).map((acc: any) => (
                        <div key={acc.id} className="flex justify-between">
                          <span className="text-sm text-gray-300">{acc.currency}</span>
                          <span className="text-sm font-bold text-amber-400">{parseFloat(acc.available).toLocaleString()}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Lista completa de balances */}
                <div className="bg-black/30 rounded-xl p-4">
                  <h3 className="text-sm font-semibold text-gray-400 mb-3">{isSpanish ? 'Todos los Balances - Main Account' : 'All Balances - Main Account'}</h3>
                  <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto">
                    {/* Primero mostrar de accounts */}
                    {accounts.filter(a => a.type === 'main').map((acc) => (
                      <div key={acc.id} className="bg-black/30 rounded-lg p-3 flex justify-between items-center">
                        <div className="flex items-center gap-2">
                          <span className={`w-2 h-2 rounded-full ${['USD', 'EUR', 'GBP'].includes(acc.currency) ? 'bg-green-500' : 'bg-blue-500'}`}></span>
                          <span className="font-medium">{acc.currency}</span>
                        </div>
                        <span className={`font-bold ${parseFloat(acc.available) > 0 ? 'text-emerald-400' : 'text-gray-500'}`}>
                          {parseFloat(acc.available).toLocaleString()}
                        </span>
                      </div>
                    ))}
                    {/* Luego de fundingAccounts si no están en accounts */}
                    {fundingAccounts.filter((f: any) => !accounts.find(a => a.type === 'main' && a.currency === f.currency)).map((acc: any) => (
                      <div key={acc.id} className="bg-black/30 rounded-lg p-3 flex justify-between items-center">
                        <div className="flex items-center gap-2">
                          <span className={`w-2 h-2 rounded-full ${acc.isFiat ? 'bg-green-500' : 'bg-blue-500'}`}></span>
                          <span className="font-medium">{acc.currency}</span>
                        </div>
                        <span className={`font-bold ${parseFloat(acc.available) > 0 ? 'text-emerald-400' : 'text-gray-500'}`}>
                          {parseFloat(acc.available).toLocaleString()}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Transferencia Interna */}
                <div className="bg-gradient-to-r from-purple-900/20 to-indigo-900/20 border border-purple-500/30 rounded-xl p-4">
                  <h3 className="text-sm font-semibold text-purple-400 mb-4 flex items-center gap-2">
                    <ArrowRightLeft className="w-4 h-4" />
                    {isSpanish ? 'Transferencia Interna (Main ↔ Trade)' : 'Internal Transfer (Main ↔ Trade)'}
                  </h3>
                  <div className="grid grid-cols-4 gap-3">
                    <select
                      value={transferCurrency}
                      onChange={(e) => setTransferCurrency(e.target.value)}
                      className="px-3 py-2 bg-black/50 border border-gray-700 rounded-lg text-white"
                    >
                      <option value="USD">USD</option>
                      <option value="EUR">EUR</option>
                      <option value="USDT">USDT</option>
                      <option value="USDC">USDC</option>
                      <option value="BTC">BTC</option>
                      <option value="ETH">ETH</option>
                    </select>
                    <input
                      type="number"
                      value={transferAmount}
                      onChange={(e) => setTransferAmount(e.target.value)}
                      placeholder="Amount"
                      className="px-3 py-2 bg-black/50 border border-gray-700 rounded-lg text-white"
                    />
                    <div className="flex items-center gap-2">
                      <select
                        value={transferFrom}
                        onChange={(e) => setTransferFrom(e.target.value as 'main' | 'trade')}
                        className="px-2 py-2 bg-black/50 border border-gray-700 rounded-lg text-white text-sm"
                      >
                        <option value="main">Main</option>
                        <option value="trade">Trade</option>
                      </select>
                      <span className="text-gray-400">→</span>
                      <select
                        value={transferTo}
                        onChange={(e) => setTransferTo(e.target.value as 'main' | 'trade')}
                        className="px-2 py-2 bg-black/50 border border-gray-700 rounded-lg text-white text-sm"
                      >
                        <option value="trade">Trade</option>
                        <option value="main">Main</option>
                      </select>
                    </div>
                    <button
                      onClick={handleInternalTransfer}
                      className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-500 font-bold"
                    >
                      {isSpanish ? 'Transferir' : 'Transfer'}
                    </button>
                  </div>
                </div>

                {/* Información de estructura */}
                <div className="bg-black/20 rounded-lg p-4 border border-gray-700">
                  <h4 className="text-sm font-semibold text-gray-400 mb-2">{isSpanish ? 'Estructura de Cuentas KuCoin' : 'KuCoin Account Structure'}</h4>
                  <div className="grid grid-cols-2 gap-4 text-xs">
                    <div>
                      <span className="text-emerald-400">Main (Funding):</span>
                      <span className="text-gray-400 ml-2">{isSpanish ? 'Depósitos y Retiros' : 'Deposits & Withdrawals'}</span>
                    </div>
                    <div>
                      <span className="text-blue-400">Trade:</span>
                      <span className="text-gray-400 ml-2">{isSpanish ? 'Trading Spot' : 'Spot Trading'}</span>
                    </div>
                    <div>
                      <span className="text-amber-400">Margin:</span>
                      <span className="text-gray-400 ml-2">{isSpanish ? 'Trading con Margen' : 'Margin Trading'}</span>
                    </div>
                    <div>
                      <span className="text-purple-400">Futures:</span>
                      <span className="text-gray-400 ml-2">{isSpanish ? 'Contratos Futuros' : 'Futures Contracts'}</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ================================================================
                FIAT TAB - Divisas Fiat
            ================================================================ */}
            {activeTab === 'fiat' && (
              <div className="space-y-6">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-emerald-500 rounded-xl flex items-center justify-center">
                      <DollarSign className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <h2 className="text-xl font-bold">{isSpanish ? 'Módulo Fiat' : 'Fiat Module'}</h2>
                      <p className="text-sm text-gray-400">{isSpanish ? 'Depósitos de Divisas Fiat' : 'Fiat Currency Deposits'}</p>
                    </div>
                  </div>
                  <button
                    onClick={loadFiatCurrencies}
                    className="p-2 bg-gray-700 rounded-lg hover:bg-gray-600"
                  >
                    <RefreshCw className="w-5 h-5" />
                  </button>
                </div>

                {/* Balances Fiat actuales */}
                <div className="bg-gradient-to-r from-green-900/30 to-emerald-900/30 border-2 border-green-500/50 rounded-xl p-4">
                  <h3 className="text-sm font-semibold text-green-400 mb-3">{isSpanish ? 'Tus Balances Fiat' : 'Your Fiat Balances'}</h3>
                  <div className="grid grid-cols-3 gap-3">
                    {fundingFiat.map((acc: any) => (
                      <div key={acc.id} className="bg-black/30 rounded-lg p-3 text-center">
                        <div className="text-2xl font-bold text-green-400">
                          {acc.currency === 'USD' ? '$' : acc.currency === 'EUR' ? '€' : acc.currency === 'GBP' ? '£' : ''}
                          {parseFloat(acc.available).toLocaleString()}
                        </div>
                        <div className="text-xs text-gray-400">{acc.currency}</div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Formulario de Depósito Fiat */}
                <div className="bg-black/30 rounded-xl p-4">
                  <h3 className="text-sm font-semibold text-gray-400 mb-4">{isSpanish ? 'Depositar Fiat' : 'Deposit Fiat'}</h3>
                  
                  {/* Fuente de Fondos */}
                  <div className="mb-4">
                    <label className="text-xs text-gray-500 mb-2 block">{isSpanish ? '💰 Fuente de Fondos' : '💰 Fund Source'}</label>
                    <div className="grid grid-cols-3 gap-2">
                      <button
                        onClick={() => setFiatFundSource('manual')}
                        className={`p-3 rounded-lg border-2 transition-all ${
                          fiatFundSource === 'manual' 
                            ? 'border-green-500 bg-green-500/20 text-green-400' 
                            : 'border-gray-700 bg-black/30 text-gray-400 hover:border-gray-600'
                        }`}
                      >
                        <div className="text-xl mb-1">🏦</div>
                        <div className="text-xs font-bold">{isSpanish ? 'Manual' : 'Manual'}</div>
                      </button>
                      <button
                        onClick={() => setFiatFundSource('custody')}
                        className={`p-3 rounded-lg border-2 transition-all ${
                          fiatFundSource === 'custody' 
                            ? 'border-blue-500 bg-blue-500/20 text-blue-400' 
                            : 'border-gray-700 bg-black/30 text-gray-400 hover:border-gray-600'
                        }`}
                      >
                        <div className="text-xl mb-1">🔐</div>
                        <div className="text-xs font-bold">{isSpanish ? 'Custody' : 'Custody'}</div>
                        <div className="text-[10px] text-gray-500">{custodyAccounts.length} {isSpanish ? 'cuentas' : 'accounts'}</div>
                      </button>
                      <button
                        onClick={() => setFiatFundSource('daes_card')}
                        className={`p-3 rounded-lg border-2 transition-all ${
                          fiatFundSource === 'daes_card' 
                            ? 'border-purple-500 bg-purple-500/20 text-purple-400' 
                            : 'border-gray-700 bg-black/30 text-gray-400 hover:border-gray-600'
                        }`}
                      >
                        <div className="text-xl mb-1">💳</div>
                        <div className="text-xs font-bold">DAES Card</div>
                        <div className="text-[10px] text-gray-500">{daesCards.length} {isSpanish ? 'tarjetas' : 'cards'}</div>
                      </button>
                    </div>
                  </div>

                  {/* Selector de Custody Account */}
                  {fiatFundSource === 'custody' && (
                    <div className="mb-4 p-3 bg-blue-500/10 border border-blue-500/30 rounded-lg">
                      <label className="text-xs text-blue-400 mb-2 block">{isSpanish ? 'Seleccionar Cuenta Custodio' : 'Select Custody Account'}</label>
                      <select
                        value={selectedFiatCustodyAccount}
                        onChange={(e) => setSelectedFiatCustodyAccount(e.target.value)}
                        className="w-full px-4 py-3 bg-black/50 border border-blue-500/50 rounded-lg text-white"
                      >
                        <option value="">{isSpanish ? '-- Seleccionar cuenta --' : '-- Select account --'}</option>
                        {custodyAccounts.filter(a => a.availableBalance > 0).map(acc => (
                          <option key={acc.id} value={acc.id}>
                            {acc.accountName} - ${acc.availableBalance.toLocaleString()} {acc.currency}
                          </option>
                        ))}
                      </select>
                      {selectedFiatCustodyAccount && (
                        <div className="mt-2 text-sm text-blue-300">
                          {isSpanish ? 'Disponible: ' : 'Available: '}
                          <span className="font-bold text-green-400">
                            ${custodyAccounts.find(a => a.id === selectedFiatCustodyAccount)?.availableBalance.toLocaleString() || 0}
                          </span>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Selector de DAES Card */}
                  {fiatFundSource === 'daes_card' && (
                    <div className="mb-4 p-3 bg-purple-500/10 border border-purple-500/30 rounded-lg">
                      <label className="text-xs text-purple-400 mb-2 block">{isSpanish ? 'Seleccionar Tarjeta DAES' : 'Select DAES Card'}</label>
                      <select
                        value={selectedDaesCard}
                        onChange={(e) => setSelectedDaesCard(e.target.value)}
                        className="w-full px-4 py-3 bg-black/50 border border-purple-500/50 rounded-lg text-white"
                      >
                        <option value="">{isSpanish ? '-- Seleccionar tarjeta --' : '-- Select card --'}</option>
                        {daesCards.filter(c => c.balance > 0 && c.status === 'active').map(card => (
                          <option key={card.id} value={card.id}>
                            {card.name} - ${card.balance.toLocaleString()} {card.currency}
                          </option>
                        ))}
                      </select>
                      {selectedDaesCard && (
                        <div className="mt-2 text-sm text-purple-300">
                          {isSpanish ? 'Disponible: ' : 'Available: '}
                          <span className="font-bold text-green-400">
                            ${daesCards.find(c => c.id === selectedDaesCard)?.balance.toLocaleString() || 0}
                          </span>
                        </div>
                      )}
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs text-gray-500 mb-1 block">{isSpanish ? 'Divisa' : 'Currency'}</label>
                      <select
                        value={fiatDepositCurrency}
                        onChange={(e) => setFiatDepositCurrency(e.target.value)}
                        className="w-full px-4 py-3 bg-black/50 border border-gray-700 rounded-lg text-white"
                      >
                        <option value="USD">$ USD - US Dollar</option>
                        <option value="EUR">€ EUR - Euro</option>
                        <option value="GBP">£ GBP - British Pound</option>
                        {fiatCurrencies.filter(c => !['USD', 'EUR', 'GBP'].includes(c.code)).map((c: any) => (
                          <option key={c.code} value={c.code} disabled={!c.depositEnabled}>
                            {c.symbol} {c.code} - {c.name} {!c.depositEnabled && '(Disabled)'}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="text-xs text-gray-500 mb-1 block">{isSpanish ? 'Método' : 'Method'}</label>
                      <select
                        value={fiatDepositMethod}
                        onChange={(e) => setFiatDepositMethod(e.target.value)}
                        className="w-full px-4 py-3 bg-black/50 border border-gray-700 rounded-lg text-white"
                      >
                        <option value="BANK_TRANSFER">🏦 Bank Transfer (0-1% fee)</option>
                        <option value="CARD">💳 Card (3-5% fee)</option>
                        <option value="P2P">👥 P2P (0% fee)</option>
                        <option value="THIRD_PARTY">🔗 Third Party (2-4% fee)</option>
                        {fiatFundSource === 'custody' && <option value="CUSTODY_TRANSFER">🔐 Custody Transfer (0% fee)</option>}
                        {fiatFundSource === 'daes_card' && <option value="DAES_CARD">💳 DAES Card (0% fee)</option>}
                      </select>
                    </div>
                  </div>
                  <div className="mt-4">
                    <label className="text-xs text-gray-500 mb-1 block">{isSpanish ? 'Monto' : 'Amount'}</label>
                    <div className="relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-green-400 text-xl">
                        {fiatDepositCurrency === 'USD' ? '$' : fiatDepositCurrency === 'EUR' ? '€' : fiatDepositCurrency === 'GBP' ? '£' : '$'}
                      </span>
                      <input
                        type="number"
                        value={fiatDepositAmount}
                        onChange={(e) => setFiatDepositAmount(e.target.value)}
                        placeholder="0.00"
                        className="w-full pl-12 pr-4 py-3 bg-black/50 border border-gray-700 rounded-lg text-white text-2xl font-bold"
                      />
                    </div>
                    {/* Botones de porcentaje */}
                    {(fiatFundSource === 'custody' && selectedFiatCustodyAccount) || (fiatFundSource === 'daes_card' && selectedDaesCard) ? (
                      <div className="flex gap-2 mt-2">
                        {[25, 50, 75, 100].map(pct => {
                          const maxBalance = fiatFundSource === 'custody' 
                            ? custodyAccounts.find(a => a.id === selectedFiatCustodyAccount)?.availableBalance || 0
                            : daesCards.find(c => c.id === selectedDaesCard)?.balance || 0;
                          return (
                            <button
                              key={pct}
                              onClick={() => setFiatDepositAmount((maxBalance * pct / 100).toFixed(2))}
                              className="flex-1 py-1 text-xs bg-gray-700 hover:bg-gray-600 rounded text-gray-300"
                            >
                              {pct}%
                            </button>
                          );
                        })}
                      </div>
                    ) : null}
                  </div>
                  <button
                    onClick={handleFiatDeposit}
                    disabled={!fiatDepositAmount || parseFloat(fiatDepositAmount) <= 0 || 
                      (fiatFundSource === 'custody' && !selectedFiatCustodyAccount) ||
                      (fiatFundSource === 'daes_card' && !selectedDaesCard)}
                    className="w-full mt-4 py-4 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-xl font-bold text-lg hover:from-green-500 hover:to-emerald-500 disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    <DollarSign className="w-6 h-6" />
                    {isSpanish ? 'Depositar Fiat' : 'Deposit Fiat'}
                    {fiatFundSource !== 'manual' && (
                      <span className="text-sm opacity-75">
                        ({fiatFundSource === 'custody' ? 'Custody' : 'DAES Card'})
                      </span>
                    )}
                  </button>
                </div>

                {/* Divisas soportadas */}
                <div className="bg-black/20 rounded-xl p-4">
                  <h3 className="text-sm font-semibold text-gray-400 mb-3">{isSpanish ? 'Divisas Fiat Soportadas' : 'Supported Fiat Currencies'}</h3>
                  <div className="grid grid-cols-4 gap-2">
                    {fiatCurrencies.map((c: any) => (
                      <div 
                        key={c.code} 
                        className={`p-2 rounded-lg text-center cursor-pointer transition-all ${
                          c.depositEnabled 
                            ? 'bg-green-500/10 border border-green-500/30 hover:bg-green-500/20' 
                            : 'bg-gray-500/10 border border-gray-500/30 opacity-50'
                        }`}
                        onClick={() => c.depositEnabled && setFiatDepositCurrency(c.code)}
                      >
                        <div className="text-lg">{c.symbol}</div>
                        <div className="text-xs text-gray-400">{c.code}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* ================================================================
                TRADING TAB - Mercados de Trading
            ================================================================ */}
            {activeTab === 'trading' && (
              <div className="space-y-6">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-xl flex items-center justify-center">
                      <TrendingUp className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <h2 className="text-xl font-bold">{isSpanish ? 'Trading Spot' : 'Spot Trading'}</h2>
                      <p className="text-sm text-gray-400">{isSpanish ? 'Mercados: USDT, USDC, EUR, BTC' : 'Markets: USDT, USDC, EUR, BTC'}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      loadTradingAccounts();
                      loadFundingAccounts();
                      loadMarketTickers(selectedMarket);
                    }}
                    className="p-2 bg-gray-700 rounded-lg hover:bg-gray-600"
                  >
                    <RefreshCw className="w-5 h-5" />
                  </button>
                </div>

                {/* TODOS los Balances de Trading Account */}
                <div className="bg-gradient-to-r from-blue-900/30 to-cyan-900/30 border-2 border-blue-500/50 rounded-xl p-4">
                  <h3 className="text-sm font-semibold text-blue-300 mb-3 flex items-center gap-2">
                    <Database className="w-4 h-4" />
                    {isSpanish ? '💼 Todos tus Balances en Trade Account' : '💼 All Your Trade Account Balances'}
                  </h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {tradingAccounts.length > 0 ? tradingAccounts.map((acc: any) => (
                      <div key={acc.currency} className="bg-black/40 rounded-lg p-3 border border-blue-500/20">
                        <div className="text-xs text-gray-400">{acc.currency}</div>
                        <div className="text-lg font-bold text-white">
                          {parseFloat(acc.available).toLocaleString(undefined, { maximumFractionDigits: 8 })}
                        </div>
                        {parseFloat(acc.holds) > 0 && (
                          <div className="text-xs text-yellow-400">Hold: {acc.holds}</div>
                        )}
                      </div>
                    )) : (
                      <div className="col-span-4 text-center text-gray-500 py-4">
                        {isSpanish ? 'Sin balances en Trade Account' : 'No balances in Trade Account'}
                      </div>
                    )}
                  </div>
                </div>

                {/* Transferencia Rápida Main → Trade */}
                <div className="bg-gradient-to-r from-purple-900/30 to-pink-900/30 border border-purple-500/30 rounded-xl p-4">
                  <h3 className="text-sm font-semibold text-purple-300 mb-3 flex items-center gap-2">
                    <ArrowRightLeft className="w-4 h-4" />
                    {isSpanish ? '⚡ Transferencia Rápida: Main → Trade' : '⚡ Quick Transfer: Main → Trade'}
                  </h3>
                  <div className="flex flex-wrap items-center gap-3">
                    <select
                      value={transferCurrency}
                      onChange={(e) => setTransferCurrency(e.target.value)}
                      className="px-4 py-2 bg-black/50 border border-purple-500/30 rounded-lg text-white"
                    >
                      <option value="USDT">USDT</option>
                      <option value="USDC">USDC</option>
                      <option value="USD">USD</option>
                      <option value="EUR">EUR</option>
                      <option value="BTC">BTC</option>
                      <option value="ETH">ETH</option>
                    </select>
                    <input
                      type="number"
                      value={transferAmount}
                      onChange={(e) => setTransferAmount(e.target.value)}
                      placeholder="Monto"
                      className="px-4 py-2 bg-black/50 border border-purple-500/30 rounded-lg text-white w-32"
                    />
                    <div className="flex items-center gap-2 text-sm text-gray-400">
                      <span className="text-emerald-400">Main</span>
                      <span>→</span>
                      <span className="text-blue-400">Trade</span>
                    </div>
                    <button
                      onClick={async () => {
                        if (!transferAmount || parseFloat(transferAmount) <= 0) {
                          alert(isSpanish ? '❌ Ingresa un monto válido' : '❌ Enter a valid amount');
                          return;
                        }
                        setTransferFrom('main');
                        setTransferTo('trade');
                        await handleInternalTransfer();
                      }}
                      className="px-6 py-2 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg font-bold hover:from-purple-500 hover:to-pink-500 shadow-lg shadow-purple-500/30"
                    >
                      {isSpanish ? '⚡ Transferir a Trade' : '⚡ Transfer to Trade'}
                    </button>
                    <div className="text-xs text-gray-500">
                      Main: {(() => {
                        const acc = fundingAccounts.find((a: any) => a.currency === transferCurrency);
                        return acc ? parseFloat(acc.available).toLocaleString() : '0.00';
                      })()} {transferCurrency}
                    </div>
                  </div>
                </div>

                {/* 🔄 Transferencia Trade → Main (NUEVA) */}
                <div className="bg-gradient-to-r from-emerald-900/30 to-teal-900/30 border border-emerald-500/30 rounded-xl p-4">
                  <h3 className="text-sm font-semibold text-emerald-300 mb-3 flex items-center gap-2">
                    <ArrowRightLeft className="w-4 h-4" />
                    {isSpanish ? '💰 Transferir Trade → Main (Retirar Ganancias)' : '💰 Transfer Trade → Main (Withdraw Profits)'}
                  </h3>
                  <div className="flex flex-wrap items-center gap-3">
                    <select
                      value={transferCurrency}
                      onChange={(e) => setTransferCurrency(e.target.value)}
                      className="px-4 py-2 bg-black/50 border border-emerald-500/30 rounded-lg text-white"
                    >
                      {tradingAccounts.filter((a: any) => parseFloat(a.available) > 0).map((acc: any) => (
                        <option key={`trade-to-main-${acc.currency}`} value={acc.currency}>
                          {acc.currency} ({parseFloat(acc.available).toLocaleString()})
                        </option>
                      ))}
                      {tradingAccounts.filter((a: any) => parseFloat(a.available) > 0).length === 0 && (
                        <option value="">Sin balances en Trade</option>
                      )}
                    </select>
                    <input
                      type="number"
                      value={transferAmount}
                      onChange={(e) => setTransferAmount(e.target.value)}
                      placeholder="Monto"
                      className="px-4 py-2 bg-black/50 border border-emerald-500/30 rounded-lg text-white w-32"
                    />
                    <div className="flex items-center gap-2 text-sm text-gray-400">
                      <span className="text-blue-400">Trade</span>
                      <span>→</span>
                      <span className="text-emerald-400">Main</span>
                    </div>
                    <button
                      onClick={async () => {
                        if (!transferAmount || parseFloat(transferAmount) <= 0) {
                          alert(isSpanish ? '❌ Ingresa un monto válido' : '❌ Enter a valid amount');
                          return;
                        }
                        const tradeAcc = tradingAccounts.find((a: any) => a.currency === transferCurrency);
                        if (!tradeAcc || parseFloat(tradeAcc.available) < parseFloat(transferAmount)) {
                          alert(isSpanish 
                            ? `❌ Saldo insuficiente en Trade. Disponible: ${tradeAcc ? parseFloat(tradeAcc.available).toLocaleString() : '0'} ${transferCurrency}` 
                            : `❌ Insufficient Trade balance. Available: ${tradeAcc ? parseFloat(tradeAcc.available).toLocaleString() : '0'} ${transferCurrency}`);
                          return;
                        }
                        
                        const amount = parseFloat(transferAmount);
                        const isRealMode = config.isConfigured && config.apiKey && config.apiSecret && config.passphrase;
                        
                        // 🔴 MODO REAL: Llamar a la API de KuCoin para transferencia real
                        if (isRealMode) {
                          try {
                            console.log(`[KuCoin] 🔴 TRANSFERENCIA REAL: ${amount} ${transferCurrency} Trade → Main`);
                            
                            const response = await fetch('http://localhost:3000/api/kucoin/funding/transfer', {
                              method: 'POST',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({
                                apiKey: config.apiKey,
                                apiSecret: config.apiSecret,
                                passphrase: config.passphrase,
                                currency: transferCurrency,
                                amount: amount.toString(),
                                from: 'trade',
                                to: 'main'
                              })
                            });
                            
                            const data = await response.json();
                            
                            if (data.success) {
                              console.log('[KuCoin] ✅ Transferencia REAL exitosa:', data);
                              
                              // Recargar balances reales desde KuCoin
                              setTimeout(() => {
                                loadFundingAccounts();
                                loadTradingAccounts();
                              }, 1000); // Esperar 1 segundo para que KuCoin procese
                              
                              // Registrar evento
                              kucoinClient.addEvent({
                                type: 'transfer',
                                status: 'success',
                                data: { currency: transferCurrency, amount, from: 'trade', to: 'main', mode: 'REAL' },
                                message: `🔴 Transferencia REAL: ${amount.toLocaleString()} ${transferCurrency} Trade → Main`
                              });
                              setEvents(kucoinClient.getEvents());
                              
                              alert(isSpanish 
                                ? `✅ TRANSFERENCIA REAL EXITOSA!\n${amount.toLocaleString()} ${transferCurrency} transferidos de Trade a Main.\n\nLos balances se actualizarán desde KuCoin.` 
                                : `✅ REAL TRANSFER SUCCESSFUL!\n${amount.toLocaleString()} ${transferCurrency} transferred from Trade to Main.\n\nBalances will update from KuCoin.`);
                              setTransferAmount('');
                            } else {
                              // Manejar errores específicos de KuCoin
                              const errorCode = data.code || (data.data && data.data.code);
                              const errorMsg = data.msg || data.message || 'Error desconocido';
                              
                              if (errorCode === '230003' || errorMsg.toLowerCase().includes('no balance')) {
                                alert(isSpanish 
                                  ? `❌ SIN BALANCE EN TRADE ACCOUNT\n\nNo tienes ${transferCurrency} en tu cuenta Trade de KuCoin.\n\nTu ${transferCurrency} (${fundingAccounts.find((a: any) => a.currency === transferCurrency)?.available || 0}) está en Main Account.\n\n💡 Para hacer trading, primero transfiere de Main → Trade.`
                                  : `❌ NO BALANCE IN TRADE ACCOUNT\n\nYou don't have ${transferCurrency} in your KuCoin Trade account.\n\nYour ${transferCurrency} (${fundingAccounts.find((a: any) => a.currency === transferCurrency)?.available || 0}) is in Main Account.\n\n💡 To trade, first transfer from Main → Trade.`);
                              } else {
                                alert(`❌ Error en transferencia: ${errorMsg} (código: ${errorCode || 'N/A'})`);
                              }
                            }
                          } catch (error: any) {
                            console.error('[KuCoin] ❌ Error en transferencia real:', error);
                            alert(`❌ Error: ${error.message}`);
                          }
                          return;
                        }
                        
                        // 🟢 MODO LOCAL/SIMULACIÓN: Actualización local
                        console.log(`[KuCoin] 🟢 TRANSFERENCIA LOCAL: ${amount} ${transferCurrency} Trade → Main`);
                        
                        // Actualizar Trading Accounts (restar)
                        const updatedTradingAccounts = tradingAccounts.map((acc: any) => {
                          if (acc.currency === transferCurrency) {
                            return {
                              ...acc,
                              available: (parseFloat(acc.available) - amount).toFixed(8),
                              balance: (parseFloat(acc.balance) - amount).toFixed(8)
                            };
                          }
                          return acc;
                        });
                        setTradingAccounts(updatedTradingAccounts);
                        localStorage.setItem('kucoin_trading_accounts', JSON.stringify(updatedTradingAccounts));
                        kucoinSyncStore.saveBalances(updatedTradingAccounts);
                        
                        // Actualizar Funding/Main Accounts (sumar) y PERSISTIR
                        setFundingAccounts((prev: any[]) => {
                          const existingIdx = prev.findIndex((a: any) => a.currency === transferCurrency);
                          let updated;
                          if (existingIdx !== -1) {
                            updated = [...prev];
                            updated[existingIdx] = {
                              ...updated[existingIdx],
                              available: (parseFloat(updated[existingIdx].available) + amount).toFixed(8),
                              balance: (parseFloat(updated[existingIdx].balance) + amount).toFixed(8)
                            };
                          } else {
                            updated = [...prev, {
                              id: `main-${transferCurrency.toLowerCase()}-${Date.now()}`,
                              currency: transferCurrency,
                              type: 'main',
                              balance: amount.toFixed(8),
                              available: amount.toFixed(8),
                              holds: '0'
                            }];
                          }
                          // ⚡ PERSISTIR en localStorage
                          localStorage.setItem('kucoin_funding_accounts', JSON.stringify(updated));
                          console.log('[KuCoin] ✅ Main Account LOCAL actualizado:', transferCurrency, '+', amount);
                          return updated;
                        });
                        
                        // Registrar evento
                        kucoinClient.addEvent({
                          type: 'transfer',
                          status: 'success',
                          data: { currency: transferCurrency, amount, from: 'trade', to: 'main', mode: 'LOCAL' },
                          message: `🟢 Transferencia LOCAL: ${amount.toLocaleString()} ${transferCurrency} Trade → Main`
                        });
                        setEvents(kucoinClient.getEvents());
                        
                        alert(isSpanish 
                          ? `✅ Transferido ${amount.toLocaleString()} ${transferCurrency} de Trade a Main (simulación)` 
                          : `✅ Transferred ${amount.toLocaleString()} ${transferCurrency} from Trade to Main (simulation)`);
                        setTransferAmount('');
                      }}
                      disabled={tradingAccounts.filter((a: any) => parseFloat(a.available) > 0).length === 0}
                      className="px-6 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 text-white rounded-lg font-bold hover:from-emerald-500 hover:to-teal-500 shadow-lg shadow-emerald-500/30 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isSpanish ? '💰 Retirar a Main' : '💰 Withdraw to Main'}
                    </button>
                  </div>
                  
                  {/* Lista de balances disponibles en Trade para retirar */}
                  <div className="mt-3 flex flex-wrap gap-2">
                    {tradingAccounts.filter((a: any) => parseFloat(a.available) > 0).map((acc: any) => (
                      <button
                        key={`withdraw-${acc.currency}`}
                        onClick={() => {
                          setTransferCurrency(acc.currency);
                          setTransferAmount(acc.available);
                        }}
                        className="px-3 py-1 bg-emerald-500/20 border border-emerald-500/40 rounded-lg text-xs text-emerald-300 hover:bg-emerald-500/30 transition-all"
                      >
                        {acc.currency}: {parseFloat(acc.available).toLocaleString()}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Swap Rápido desde Trade Account */}
                <div className="bg-gradient-to-r from-amber-900/30 to-orange-900/30 border border-amber-500/30 rounded-xl p-4">
                  <h3 className="text-sm font-semibold text-amber-300 mb-3 flex items-center gap-2">
                    <Repeat className="w-4 h-4" />
                    {isSpanish ? '🔄 Swap Rápido desde Trade Account' : '🔄 Quick Swap from Trade Account'}
                  </h3>
                  <div className="flex flex-wrap items-center gap-3">
                    <select
                      value={swapFromCurrency}
                      onChange={(e) => setSwapFromCurrency(e.target.value)}
                      className="px-4 py-2 bg-black/50 border border-amber-500/30 rounded-lg text-white"
                    >
                      {tradingAccounts.map((acc: any) => (
                        <option key={acc.currency} value={acc.currency}>
                          {acc.currency} ({parseFloat(acc.available).toFixed(4)})
                        </option>
                      ))}
                      {tradingAccounts.length === 0 && <option value="USDT">USDT</option>}
                    </select>
                    <input
                      type="number"
                      value={swapAmount}
                      onChange={(e) => setSwapAmount(e.target.value)}
                      placeholder="Monto"
                      className="px-4 py-2 bg-black/50 border border-amber-500/30 rounded-lg text-white w-32"
                    />
                    <span className="text-gray-400">→</span>
                    <select
                      value={swapToCurrency}
                      onChange={(e) => setSwapToCurrency(e.target.value)}
                      className="px-4 py-2 bg-black/50 border border-amber-500/30 rounded-lg text-white"
                    >
                      <option value="BTC">BTC</option>
                      <option value="ETH">ETH</option>
                      <option value="USDT">USDT</option>
                      <option value="USDC">USDC</option>
                      <option value="XRP">XRP</option>
                      <option value="SOL">SOL</option>
                    </select>
                    <button
                      onClick={executeSwap}
                      disabled={isLoadingSwap || !swapAmount || parseFloat(swapAmount) <= 0 || swapFromCurrency === swapToCurrency}
                      className="px-6 py-2 bg-gradient-to-r from-amber-600 to-orange-600 text-white rounded-lg font-bold hover:from-amber-500 hover:to-orange-500 shadow-lg shadow-amber-500/30 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                    >
                      {isLoadingSwap ? (
                        <><Loader2 className="w-4 h-4 animate-spin" /> Procesando...</>
                      ) : (
                        <><Repeat className="w-4 h-4" /> {isSpanish ? 'Ejecutar Swap' : 'Execute Swap'}</>
                      )}
                    </button>
                  </div>
                  {swapEstimate && (
                    <div className="mt-3 text-sm text-amber-300 bg-amber-500/10 rounded p-2">
                      ≈ Recibirás: <span className="font-bold">{swapEstimate.estimated} {swapToCurrency}</span>
                      {swapEstimate.price && <span className="text-xs text-gray-400 ml-2">(1 {swapFromCurrency} = {swapEstimate.price} {swapToCurrency})</span>}
                    </div>
                  )}
                </div>

                {/* Selector de Mercado */}
                <div className="flex gap-2 mb-4">
                  {['USDT', 'USDC', 'EUR', 'BTC'].map(market => (
                    <button
                      key={market}
                      onClick={() => setSelectedMarket(market)}
                      className={`px-6 py-3 rounded-xl font-bold transition-all ${
                        selectedMarket === market
                          ? 'bg-gradient-to-r from-blue-600 to-cyan-600 text-white shadow-lg shadow-blue-500/30'
                          : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                      }`}
                    >
                      {market} Market
                    </button>
                  ))}
                </div>

                {/* Balance del Mercado Seleccionado con Carga desde Custody */}
                <div className="bg-gradient-to-r from-amber-900/30 to-orange-900/30 border border-amber-500/30 rounded-xl p-4">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm text-amber-300 font-semibold">
                      {isSpanish ? 'Balance del Mercado Seleccionado' : 'Selected Market Balance'}: <span className="text-white">{selectedMarket}</span>
                    </h3>
                    {selectedMarket === 'EUR' && (
                      <span className="px-2 py-0.5 bg-green-500/20 text-green-400 text-xs rounded-full">
                        💶 EUR Trading Activo
                      </span>
                    )}
                  </div>
                  
                  <div className="flex flex-wrap items-center gap-4">
                    <div className="text-3xl font-bold text-amber-400">
                      {(() => {
                        const acc = tradingAccounts.find((a: any) => a.currency === selectedMarket);
                        return acc ? parseFloat(acc.available).toLocaleString() : '0.00';
                      })()} {selectedMarket}
                    </div>
                    
                    <div className="flex gap-2">
                      <button
                        onClick={() => {
                          setTransferCurrency(selectedMarket);
                          setActiveTab('funding');
                        }}
                        className="px-3 py-1.5 bg-blue-600/50 text-blue-300 text-sm rounded-lg hover:bg-blue-600 flex items-center gap-1"
                      >
                        <ArrowRightLeft className="w-3 h-3" />
                        {isSpanish ? 'Desde Main' : 'From Main'}
                      </button>
                      
                      {/* Botón para cargar desde Custody - Solo para EUR */}
                      {(selectedMarket === 'EUR' || selectedMarket === 'USD') && (
                        <button
                          onClick={() => setShowCustodyToTradingModal(true)}
                          className="px-3 py-1.5 bg-gradient-to-r from-purple-600 to-pink-600 text-white text-sm rounded-lg hover:from-purple-500 hover:to-pink-500 flex items-center gap-1 shadow-lg shadow-purple-500/30"
                        >
                          <Database className="w-3 h-3" />
                          💰 {isSpanish ? 'Cargar desde Custody' : 'Load from Custody'}
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Info de Cuentas Custody EUR disponibles */}
                  {selectedMarket === 'EUR' && custodyAccounts.filter(a => a.currency === 'EUR' && a.availableBalance > 0).length > 0 && (
                    <div className="mt-3 p-2 bg-black/30 rounded-lg border border-purple-500/20">
                      <div className="text-xs text-purple-300 mb-1">💼 Cuentas Custody EUR disponibles:</div>
                      <div className="flex flex-wrap gap-2">
                        {custodyAccounts.filter(a => a.currency === 'EUR' && a.availableBalance > 0).map(acc => (
                          <span key={acc.id} className="px-2 py-0.5 bg-purple-500/20 text-purple-300 text-xs rounded">
                            {acc.accountName}: €{acc.availableBalance.toLocaleString()}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* 🔴 CONVERSIÓN REAL USDT → EUR */}
                  {selectedMarket === 'EUR' && config.isConfigured && (
                    <div className="mt-4 p-4 bg-gradient-to-r from-red-900/30 to-orange-900/30 border-2 border-red-500/50 rounded-xl">
                      <div className="flex items-center gap-2 mb-3">
                        <span className="px-2 py-0.5 bg-red-500 text-white text-xs font-bold rounded animate-pulse">🔴 REAL</span>
                        <h4 className="text-sm font-semibold text-red-400">
                          {isSpanish ? 'Convertir USDT → EUR (API Real KuCoin)' : 'Convert USDT → EUR (Real KuCoin API)'}
                        </h4>
                      </div>
                      <p className="text-xs text-gray-400 mb-3">
                        {isSpanish 
                          ? '⚠️ Esta operación venderá USDT en el par USDT-EUR para obtener EUR REAL en tu Trade Account de KuCoin.'
                          : '⚠️ This operation will sell USDT on the USDT-EUR pair to get REAL EUR in your KuCoin Trade Account.'}
                      </p>
                      <div className="flex items-center gap-3">
                        <div className="flex-1">
                          <div className="text-xs text-gray-500 mb-1">USDT en Trade: <span className="text-green-400 font-bold">
                            {tradingAccounts.find((a: any) => a.currency === 'USDT')?.available || '0'}
                          </span></div>
                          <input
                            type="number"
                            id="usdt-to-eur-amount"
                            placeholder={isSpanish ? 'Cantidad USDT a convertir' : 'USDT amount to convert'}
                            className="w-full px-3 py-2 bg-black/50 border border-red-500/30 rounded-lg text-white placeholder-gray-500 focus:border-red-400 focus:outline-none"
                          />
                        </div>
                        <button
                          onClick={() => {
                            const input = document.getElementById('usdt-to-eur-amount') as HTMLInputElement;
                            if (input?.value) {
                              convertUsdtToEurReal(input.value);
                            } else {
                              alert(isSpanish ? '❌ Ingresa un monto' : '❌ Enter an amount');
                            }
                          }}
                          disabled={executingTrade || parseFloat(tradingAccounts.find((a: any) => a.currency === 'USDT')?.available || '0') <= 0}
                          className="px-4 py-2 bg-gradient-to-r from-red-600 to-orange-600 text-white font-bold rounded-lg hover:from-red-500 hover:to-orange-500 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 shadow-lg shadow-red-500/30"
                        >
                          {executingTrade ? (
                            <RefreshCw className="w-4 h-4 animate-spin" />
                          ) : (
                            <ArrowRightLeft className="w-4 h-4" />
                          )}
                          {isSpanish ? 'Convertir REAL' : 'Convert REAL'}
                        </button>
                      </div>
                      <div className="mt-2 flex gap-2">
                        <button
                          onClick={() => {
                            const input = document.getElementById('usdt-to-eur-amount') as HTMLInputElement;
                            const balance = tradingAccounts.find((a: any) => a.currency === 'USDT')?.available || '0';
                            if (input) input.value = balance;
                          }}
                          className="px-2 py-1 bg-red-500/20 text-red-300 text-xs rounded hover:bg-red-500/30"
                        >
                          MAX
                        </button>
                        <button
                          onClick={() => {
                            const input = document.getElementById('usdt-to-eur-amount') as HTMLInputElement;
                            const balance = parseFloat(tradingAccounts.find((a: any) => a.currency === 'USDT')?.available || '0');
                            if (input) input.value = (balance / 2).toFixed(2);
                          }}
                          className="px-2 py-1 bg-red-500/20 text-red-300 text-xs rounded hover:bg-red-500/30"
                        >
                          50%
                        </button>
                        <button
                          onClick={() => {
                            const input = document.getElementById('usdt-to-eur-amount') as HTMLInputElement;
                            const balance = parseFloat(tradingAccounts.find((a: any) => a.currency === 'USDT')?.available || '0');
                            if (input) input.value = (balance / 4).toFixed(2);
                          }}
                          className="px-2 py-1 bg-red-500/20 text-red-300 text-xs rounded hover:bg-red-500/30"
                        >
                          25%
                        </button>
                      </div>
                    </div>
                  )}

                  {/* 🔴 INYECCIÓN FORZADA EUR DESDE SISTEMA EXTERNO */}
                  {selectedMarket === 'EUR' && config.isConfigured && (
                    <div className="mt-4 p-4 bg-gradient-to-r from-purple-900/30 to-pink-900/30 border-2 border-purple-500/50 rounded-xl">
                      <div className="flex items-center gap-2 mb-3">
                        <span className="px-2 py-0.5 bg-purple-500 text-white text-xs font-bold rounded animate-pulse">🔴 FORZADO</span>
                        <h4 className="text-sm font-semibold text-purple-400">
                          {isSpanish ? 'Inyectar EUR desde Sistema Externo' : 'Inject EUR from External System'}
                        </h4>
                      </div>
                      <p className="text-xs text-gray-400 mb-3">
                        {isSpanish 
                          ? '💉 Esta función inyecta EUR a tu sistema. Si tienes USDT, se convertirá REALMENTE a EUR. Si no, funcionará en modo híbrido con precios reales.'
                          : '💉 This function injects EUR into your system. If you have USDT, it will REALLY convert to EUR. If not, it works in hybrid mode with real prices.'}
                      </p>
                      <div className="flex items-center gap-3">
                        <div className="flex-1">
                          <input
                            type="number"
                            id="force-inject-eur-amount"
                            placeholder={isSpanish ? 'Monto EUR a inyectar' : 'EUR amount to inject'}
                            className="w-full px-3 py-2 bg-black/50 border border-purple-500/30 rounded-lg text-white placeholder-gray-500 focus:border-purple-400 focus:outline-none"
                          />
                        </div>
                        <button
                          onClick={() => {
                            const input = document.getElementById('force-inject-eur-amount') as HTMLInputElement;
                            if (input?.value) {
                              forceInjectEur(input.value, 'Sistema Externo');
                            } else {
                              alert(isSpanish ? '❌ Ingresa un monto' : '❌ Enter an amount');
                            }
                          }}
                          disabled={executingTrade}
                          className="px-4 py-2 bg-gradient-to-r from-purple-600 to-pink-600 text-white font-bold rounded-lg hover:from-purple-500 hover:to-pink-500 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 shadow-lg shadow-purple-500/30"
                        >
                          {executingTrade ? (
                            <RefreshCw className="w-4 h-4 animate-spin" />
                          ) : (
                            <>💉</>
                          )}
                          {isSpanish ? 'INYECTAR EUR' : 'INJECT EUR'}
                        </button>
                      </div>
                      <div className="mt-2 flex gap-2">
                        {[10, 50, 100, 500, 1000].map(amt => (
                          <button
                            key={amt}
                            onClick={() => {
                              const input = document.getElementById('force-inject-eur-amount') as HTMLInputElement;
                              if (input) input.value = amt.toString();
                            }}
                            className="px-2 py-1 bg-purple-500/20 text-purple-300 text-xs rounded hover:bg-purple-500/30"
                          >
                            €{amt}
                          </button>
                        ))}
                      </div>
                      <div className="mt-3 text-xs text-gray-500 flex items-center gap-2">
                        <span>💡 Tip: Para inyección 100% REAL, asegúrate de tener USDT en tu Trade Account.</span>
                      </div>
                    </div>
                  )}

                  {/* 🔴 CONVERSIÓN EUR REAL → USDT REAL */}
                  {selectedMarket === 'EUR' && config.isConfigured && (
                    <div className="mt-4 p-4 bg-gradient-to-r from-green-900/30 to-emerald-900/30 border-2 border-green-500/50 rounded-xl">
                      <div className="flex items-center gap-2 mb-3">
                        <span className="px-2 py-0.5 bg-green-500 text-white text-xs font-bold rounded animate-pulse">🔴 REAL</span>
                        <h4 className="text-sm font-semibold text-green-400">
                          {isSpanish ? 'Convertir EUR → USDT (API Real KuCoin)' : 'Convert EUR → USDT (Real KuCoin API)'}
                        </h4>
                      </div>
                      <p className="text-xs text-gray-400 mb-3">
                        {isSpanish 
                          ? '💶→💵 Compra USDT con tu EUR real. El USDT quedará en tu Trade Account de KuCoin.'
                          : '💶→💵 Buy USDT with your real EUR. USDT will be in your KuCoin Trade Account.'}
                      </p>
                      <div className="flex items-center gap-3">
                        <div className="flex-1">
                          <div className="text-xs text-gray-500 mb-1">EUR en Trade: <span className="text-green-400 font-bold">
                            {tradingAccounts.find((a: any) => a.currency === 'EUR')?.available || '0'}
                          </span></div>
                          <input
                            type="number"
                            id="eur-to-usdt-amount"
                            placeholder={isSpanish ? 'Cantidad EUR a convertir' : 'EUR amount to convert'}
                            className="w-full px-3 py-2 bg-black/50 border border-green-500/30 rounded-lg text-white placeholder-gray-500 focus:border-green-400 focus:outline-none"
                          />
                        </div>
                        <button
                          onClick={() => {
                            const input = document.getElementById('eur-to-usdt-amount') as HTMLInputElement;
                            if (input?.value) {
                              convertEurToUsdtReal(input.value);
                            } else {
                              alert(isSpanish ? '❌ Ingresa un monto' : '❌ Enter an amount');
                            }
                          }}
                          disabled={executingTrade || parseFloat(tradingAccounts.find((a: any) => a.currency === 'EUR')?.available || '0') <= 0}
                          className="px-4 py-2 bg-gradient-to-r from-green-600 to-emerald-600 text-white font-bold rounded-lg hover:from-green-500 hover:to-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 shadow-lg shadow-green-500/30"
                        >
                          {executingTrade ? (
                            <RefreshCw className="w-4 h-4 animate-spin" />
                          ) : (
                            <ArrowRightLeft className="w-4 h-4" />
                          )}
                          EUR → USDT
                        </button>
                      </div>
                      <div className="mt-2 flex gap-2">
                        <button
                          onClick={() => {
                            const input = document.getElementById('eur-to-usdt-amount') as HTMLInputElement;
                            const balance = tradingAccounts.find((a: any) => a.currency === 'EUR')?.available || '0';
                            if (input) input.value = balance;
                          }}
                          className="px-2 py-1 bg-green-500/20 text-green-300 text-xs rounded hover:bg-green-500/30"
                        >
                          MAX
                        </button>
                        <button
                          onClick={() => {
                            const input = document.getElementById('eur-to-usdt-amount') as HTMLInputElement;
                            const balance = parseFloat(tradingAccounts.find((a: any) => a.currency === 'EUR')?.available || '0');
                            if (input) input.value = (balance / 2).toFixed(2);
                          }}
                          className="px-2 py-1 bg-green-500/20 text-green-300 text-xs rounded hover:bg-green-500/30"
                        >
                          50%
                        </button>
                        <button
                          onClick={() => {
                            const input = document.getElementById('eur-to-usdt-amount') as HTMLInputElement;
                            const balance = parseFloat(tradingAccounts.find((a: any) => a.currency === 'EUR')?.available || '0');
                            if (input) input.value = (balance / 4).toFixed(2);
                          }}
                          className="px-2 py-1 bg-green-500/20 text-green-300 text-xs rounded hover:bg-green-500/30"
                        >
                          25%
                        </button>
                      </div>
                      <div className="mt-3 p-2 bg-green-500/10 rounded-lg">
                        <div className="text-xs text-green-300">
                          💡 {isSpanish 
                            ? 'Conversión aproximada: 1 EUR ≈ 1.08 USDT (varía según mercado)' 
                            : 'Approximate conversion: 1 EUR ≈ 1.08 USDT (varies by market)'}
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Modal de Carga desde Custody a Trading */}
                {showCustodyToTradingModal && (
                  <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
                    <div className="bg-gray-900 border border-amber-500/30 rounded-2xl p-6 max-w-md w-full shadow-2xl">
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="text-xl font-bold text-amber-400 flex items-center gap-2">
                          💶 {isSpanish ? `Cargar ${selectedMarket} desde Custody` : `Load ${selectedMarket} from Custody`}
                        </h3>
                        <button 
                          onClick={() => setShowCustodyToTradingModal(false)}
                          className="p-1 hover:bg-gray-700 rounded-lg"
                        >
                          <X className="w-5 h-5" />
                        </button>
                      </div>

                      {/* Seleccionar Cuenta Custody */}
                      <div className="space-y-4">
                        <div>
                          <label className="text-sm text-gray-400 block mb-1">
                            {isSpanish ? 'Cuenta Custody Origen' : 'Source Custody Account'}
                          </label>
                          <select
                            value={selectedCustodyForTrading}
                            onChange={(e) => {
                              setSelectedCustodyForTrading(e.target.value);
                              const acc = custodyAccounts.find(a => a.id === e.target.value);
                              if (acc) setCustodyToTradingAmount(acc.availableBalance.toString());
                            }}
                            className="w-full px-4 py-3 bg-black/50 border border-amber-500/30 rounded-lg text-white"
                          >
                            <option value="">{isSpanish ? '-- Seleccionar Cuenta --' : '-- Select Account --'}</option>
                            {custodyAccounts.filter(a => a.currency === selectedMarket && a.availableBalance > 0).map(acc => (
                              <option key={acc.id} value={acc.id}>
                                {acc.accountName} - {selectedMarket === 'EUR' ? '€' : '$'}{acc.availableBalance.toLocaleString()}
                              </option>
                            ))}
                          </select>
                        </div>

                        {selectedCustodyForTrading && (
                          <>
                            <div className="bg-purple-500/10 border border-purple-500/20 rounded-lg p-3">
                              <div className="text-xs text-purple-300 mb-1">{isSpanish ? 'Cuenta Seleccionada' : 'Selected Account'}</div>
                              {(() => {
                                const acc = custodyAccounts.find(a => a.id === selectedCustodyForTrading);
                                if (!acc) return null;
                                return (
                                  <div className="space-y-1">
                                    <div className="text-white font-bold">{acc.accountName}</div>
                                    <div className="text-sm text-gray-400">
                                      {isSpanish ? 'Disponible' : 'Available'}: <span className="text-amber-400 font-bold">{selectedMarket === 'EUR' ? '€' : '$'}{acc.availableBalance.toLocaleString()}</span>
                                    </div>
                                    <div className="text-xs text-gray-500">{acc.accountCategory}</div>
                                  </div>
                                );
                              })()}
                            </div>

                            <div>
                              <label className="text-sm text-gray-400 block mb-1">
                                {isSpanish ? 'Monto a Cargar' : 'Amount to Load'}
                              </label>
                              <div className="relative">
                                <input
                                  type="number"
                                  value={custodyToTradingAmount}
                                  onChange={(e) => setCustodyToTradingAmount(e.target.value)}
                                  placeholder="0.00"
                                  className="w-full px-4 py-3 bg-black/50 border border-amber-500/30 rounded-lg text-white text-xl font-bold pr-16"
                                />
                                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-amber-400 font-bold">
                                  {selectedMarket}
                                </span>
                              </div>
                              
                              {/* Botones de porcentaje */}
                              <div className="flex gap-2 mt-2">
                                {[25, 50, 75, 100].map(pct => {
                                  const acc = custodyAccounts.find(a => a.id === selectedCustodyForTrading);
                                  const maxBalance = acc?.availableBalance || 0;
                                  return (
                                    <button
                                      key={pct}
                                      onClick={() => setCustodyToTradingAmount((maxBalance * pct / 100).toFixed(2))}
                                      className="flex-1 py-1 bg-amber-500/20 text-amber-300 text-xs rounded hover:bg-amber-500/40"
                                    >
                                      {pct}%
                                    </button>
                                  );
                                })}
                              </div>
                            </div>

                            <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-3">
                              <div className="text-xs text-green-300 mb-1">{isSpanish ? 'Destino' : 'Destination'}</div>
                              <div className="flex items-center gap-2">
                                <TrendingUp className="w-5 h-5 text-green-400" />
                                <span className="text-white font-bold">Trading Account - {selectedMarket}</span>
                              </div>
                              <div className="text-xs text-gray-400 mt-1">
                                {isSpanish ? 'Podrás hacer trading con pares ' : 'You can trade with '}{selectedMarket} {isSpanish ? 'disponibles' : 'pairs'}
                              </div>
                            </div>

                            <button
                              onClick={loadEurFromCustodyToTrading}
                              disabled={executingTrade || !custodyToTradingAmount || parseFloat(custodyToTradingAmount) <= 0}
                              className="w-full py-4 bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-xl font-bold text-lg hover:from-amber-400 hover:to-orange-400 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg shadow-amber-500/30"
                            >
                              {executingTrade ? (
                                <>
                                  <RefreshCw className="w-5 h-5 animate-spin" />
                                  {isSpanish ? 'Cargando...' : 'Loading...'}
                                </>
                              ) : (
                                <>
                                  <ArrowRightLeft className="w-5 h-5" />
                                  {isSpanish 
                                    ? `Cargar ${custodyToTradingAmount || '0'} ${selectedMarket} a Trading`
                                    : `Load ${custodyToTradingAmount || '0'} ${selectedMarket} to Trading`}
                                </>
                              )}
                            </button>
                          </>
                        )}

                        {custodyAccounts.filter(a => a.currency === selectedMarket && a.availableBalance > 0).length === 0 && (
                          <div className="text-center py-6 text-gray-500">
                            <Database className="w-12 h-12 mx-auto mb-2 opacity-30" />
                            <p>{isSpanish ? `No hay cuentas Custody con ${selectedMarket}` : `No Custody accounts with ${selectedMarket}`}</p>
                            <p className="text-xs mt-1">{isSpanish ? 'Crea una cuenta en Custody Accounts' : 'Create an account in Custody Accounts'}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* Pares de Trading con Trading Real */}
                <div className="bg-black/30 rounded-xl p-4">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-semibold text-gray-400">
                      {isSpanish ? `Pares de Trading - ${selectedMarket}` : `Trading Pairs - ${selectedMarket}`}
                    </h3>
                    <span className="text-xs text-amber-400">
                      {marketTickers.length} {isSpanish ? 'pares disponibles' : 'pairs available'}
                    </span>
                  </div>
                  <div className="grid grid-cols-1 gap-3 max-h-96 overflow-y-auto pr-2">
                    {marketTickers.map((ticker: any) => {
                      const [baseCurrency] = ticker.symbol.split('-');
                      const price = parseFloat(ticker.last);
                      const changeRate = parseFloat(ticker.changeRate);
                      const eurBalance = tradingAccounts.find((a: any) => a.currency === selectedMarket);
                      const baseBalance = tradingAccounts.find((a: any) => a.currency === baseCurrency);
                      
                      return (
                        <div 
                          key={ticker.symbol} 
                          className="bg-gradient-to-r from-gray-800/50 to-gray-900/50 rounded-xl p-4 border border-gray-700 hover:border-amber-500/50 transition-all"
                        >
                          <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 bg-gradient-to-br from-amber-500 to-orange-500 rounded-lg flex items-center justify-center text-white font-bold text-sm">
                                {baseCurrency.slice(0, 2)}
                              </div>
                              <div>
                                <span className="font-bold text-white text-lg">{ticker.symbol}</span>
                                <div className="text-xs text-gray-500">
                                  {isSpanish ? 'Vol 24h' : '24h Vol'}: {parseFloat(ticker.vol).toLocaleString()}
                                </div>
                              </div>
                            </div>
                            <div className="text-right">
                              <div className="font-bold text-white text-xl">{price.toLocaleString()}</div>
                              <div className={`text-sm font-semibold ${changeRate >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                                {changeRate >= 0 ? '▲' : '▼'} {changeRate >= 0 ? '+' : ''}{(changeRate * 100).toFixed(2)}%
                              </div>
                            </div>
                          </div>

                          {/* Sección de Trading Rápido - Solo si hay balance EUR */}
                          {selectedMarket === 'EUR' && (
                            <div className="border-t border-gray-700 pt-3 mt-3">
                              <div className="flex items-center gap-2 mb-2">
                                <input
                                  type="number"
                                  placeholder={`${isSpanish ? 'Cantidad' : 'Amount'} ${baseCurrency}`}
                                  className="flex-1 px-3 py-2 bg-black/50 border border-gray-600 rounded-lg text-white text-sm"
                                  id={`trade-amount-${ticker.symbol}`}
                                />
                                <span className="text-xs text-gray-400">
                                  = {(() => {
                                    const input = document.getElementById(`trade-amount-${ticker.symbol}`) as HTMLInputElement;
                                    const val = input?.value ? parseFloat(input.value) : 0;
                                    return (val * price).toFixed(2);
                                  })()} €
                                </span>
                              </div>
                              <div className="flex gap-2">
                                <button
                                  onClick={() => {
                                    const input = document.getElementById(`trade-amount-${ticker.symbol}`) as HTMLInputElement;
                                    if (input?.value) {
                                      executeEurTrade(ticker.symbol, 'buy', input.value);
                                    } else {
                                      alert(isSpanish ? 'Ingresa una cantidad' : 'Enter an amount');
                                    }
                                  }}
                                  disabled={executingTrade || !eurBalance || parseFloat(eurBalance.available) <= 0}
                                  className="flex-1 py-2 bg-green-600 hover:bg-green-500 text-white text-sm font-bold rounded-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-1"
                                >
                                  <TrendingUp className="w-4 h-4" />
                                  {isSpanish ? 'COMPRAR' : 'BUY'}
                                </button>
                                <button
                                  onClick={() => {
                                    const input = document.getElementById(`trade-amount-${ticker.symbol}`) as HTMLInputElement;
                                    if (input?.value) {
                                      executeEurTrade(ticker.symbol, 'sell', input.value);
                                    } else {
                                      alert(isSpanish ? 'Ingresa una cantidad' : 'Enter an amount');
                                    }
                                  }}
                                  disabled={executingTrade || !baseBalance || parseFloat(baseBalance.available) <= 0}
                                  className="flex-1 py-2 bg-red-600 hover:bg-red-500 text-white text-sm font-bold rounded-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-1"
                                >
                                  <TrendingDown className="w-4 h-4" />
                                  {isSpanish ? 'VENDER' : 'SELL'}
                                </button>
                              </div>
                              <div className="flex justify-between text-xs text-gray-500 mt-2">
                                <span>💶 {eurBalance ? parseFloat(eurBalance.available).toFixed(2) : '0.00'} EUR</span>
                                <span>🪙 {baseBalance ? parseFloat(baseBalance.available).toFixed(8) : '0'} {baseCurrency}</span>
                              </div>
                              
                              {/* 🔴 BOTÓN COMPRA REAL FORZADA */}
                              {config.isConfigured && (
                                <button
                                  onClick={() => {
                                    const input = document.getElementById(`trade-amount-${ticker.symbol}`) as HTMLInputElement;
                                    if (input?.value) {
                                      const amount = parseFloat(input.value);
                                      const eurNeeded = (amount * price * 1.001).toFixed(2); // Con fee
                                      executeForceRealBuy(baseCurrency, eurNeeded);
                                    } else {
                                      alert(isSpanish ? 'Ingresa una cantidad' : 'Enter an amount');
                                    }
                                  }}
                                  disabled={executingTrade || !eurBalance || parseFloat(eurBalance.available) <= 0}
                                  className="w-full mt-2 py-2 bg-gradient-to-r from-red-600 to-orange-600 hover:from-red-500 hover:to-orange-500 text-white text-xs font-bold rounded-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-1 shadow-lg shadow-red-500/30"
                                >
                                  🔴 {isSpanish ? 'COMPRA REAL FORZADA (USDT→Crypto)' : 'FORCED REAL BUY (USDT→Crypto)'}
                                </button>
                              )}
                            </div>
                          )}

                          {/* Botón simple para otros mercados */}
                          {selectedMarket !== 'EUR' && (
                            <div className="flex gap-2 mt-2">
                              <button 
                                className="flex-1 py-2 bg-emerald-600/50 text-emerald-300 text-sm rounded-lg hover:bg-emerald-600 font-semibold"
                                onClick={() => {
                                  setSwapFromCurrency(selectedMarket);
                                  setSwapToCurrency(baseCurrency);
                                  setActiveTab('swap');
                                }}
                              >
                                🔄 {isSpanish ? 'Ir a Swap' : 'Go to Swap'}
                              </button>
                            </div>
                          )}
                        </div>
                      );
                    })}
                    
                    {marketTickers.length === 0 && (
                      <div className="text-center py-8 text-gray-500">
                        <RefreshCw className="w-8 h-8 mx-auto mb-2 opacity-30 animate-spin" />
                        <p>{isSpanish ? 'Cargando pares de trading...' : 'Loading trading pairs...'}</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Historial de Trades EUR */}
                {selectedMarket === 'EUR' && eurTradeHistory.length > 0 && (
                  <div className="bg-gradient-to-r from-amber-900/20 to-yellow-900/20 border border-amber-500/30 rounded-xl p-4">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="text-sm font-semibold text-amber-400 flex items-center gap-2">
                        <History className="w-4 h-4" />
                        {isSpanish ? '📊 Historial de Trades EUR' : '📊 EUR Trade History'}
                      </h4>
                      <span className="text-xs text-gray-500">{eurTradeHistory.length} trades</span>
                    </div>
                    <div className="space-y-2 max-h-64 overflow-y-auto">
                      {eurTradeHistory.slice(0, 10).map((trade: any) => (
                        <div 
                          key={trade.id} 
                          className={`flex items-center justify-between p-3 rounded-lg ${
                            trade.side === 'BUY' 
                              ? 'bg-green-500/10 border border-green-500/30' 
                              : 'bg-red-500/10 border border-red-500/30'
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                              trade.side === 'BUY' ? 'bg-green-500/30' : 'bg-red-500/30'
                            }`}>
                              {trade.side === 'BUY' 
                                ? <TrendingUp className="w-4 h-4 text-green-400" />
                                : <TrendingDown className="w-4 h-4 text-red-400" />
                              }
                            </div>
                            <div>
                              <div className="font-semibold text-white text-sm">
                                {trade.side === 'BUY' ? '🟢 COMPRA' : '🔴 VENTA'} {trade.pair}
                              </div>
                              <div className="text-xs text-gray-400">
                                {new Date(trade.timestamp).toLocaleString()}
                              </div>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className={`font-bold ${trade.side === 'BUY' ? 'text-green-400' : 'text-red-400'}`}>
                              {trade.side === 'BUY' ? '+' : '-'}{trade.amount.toFixed(6)} {trade.baseCurrency}
                            </div>
                            <div className="text-xs text-gray-400">
                              @ {parseFloat(trade.price).toLocaleString()} EUR
                            </div>
                            <div className="text-xs text-amber-400">
                              Total: {trade.total.toFixed(2)} EUR
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                    {eurTradeHistory.length > 10 && (
                      <div className="text-center mt-2 text-xs text-gray-500">
                        {isSpanish 
                          ? `... y ${eurTradeHistory.length - 10} trades más` 
                          : `... and ${eurTradeHistory.length - 10} more trades`}
                      </div>
                    )}
                    <button
                      onClick={() => {
                        if (confirm(isSpanish ? '¿Borrar historial de trades?' : 'Clear trade history?')) {
                          setEurTradeHistory([]);
                          localStorage.removeItem('kucoin_eur_trade_history');
                        }
                      }}
                      className="mt-3 w-full py-2 text-xs text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-lg transition-colors"
                    >
                      🗑️ {isSpanish ? 'Borrar historial' : 'Clear history'}
                    </button>
                  </div>
                )}

                {/* Historial de Cargas EUR desde Custody */}
                {selectedMarket === 'EUR' && eurLoadHistory.length > 0 && (
                  <div className="bg-gradient-to-r from-blue-900/20 to-cyan-900/20 border border-blue-500/30 rounded-xl p-4">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="text-sm font-semibold text-blue-400 flex items-center gap-2">
                        <Download className="w-4 h-4" />
                        {isSpanish ? '📥 Historial de Cargas EUR' : '📥 EUR Load History'}
                      </h4>
                      <span className="text-xs text-gray-500">{eurLoadHistory.length} {isSpanish ? 'cargas' : 'loads'}</span>
                    </div>
                    <div className="space-y-2 max-h-48 overflow-y-auto">
                      {eurLoadHistory.slice(0, 5).map((load: any) => (
                        <div 
                          key={load.id} 
                          className="flex items-center justify-between p-3 rounded-lg bg-blue-500/10 border border-blue-500/30"
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 bg-blue-500/30 rounded-full flex items-center justify-center">
                              <Download className="w-4 h-4 text-blue-400" />
                            </div>
                            <div>
                              <div className="font-semibold text-white text-sm">
                                💶 {isSpanish ? 'CARGA EUR' : 'EUR LOAD'}
                              </div>
                              <div className="text-xs text-gray-400">
                                {load.from} → Trading
                              </div>
                              <div className="text-xs text-gray-500">
                                {new Date(load.timestamp).toLocaleString()}
                              </div>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="font-bold text-blue-400">
                              +{parseFloat(load.amount).toLocaleString()} EUR
                            </div>
                            <div className="text-xs text-gray-400">
                              Balance: {parseFloat(load.balanceAfter).toLocaleString()} EUR
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                    <button
                      onClick={() => {
                        if (confirm(isSpanish ? '¿Borrar historial de cargas?' : 'Clear load history?')) {
                          setEurLoadHistory([]);
                          localStorage.removeItem('kucoin_eur_load_history');
                        }
                      }}
                      className="mt-3 w-full py-2 text-xs text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-lg transition-colors"
                    >
                      🗑️ {isSpanish ? 'Borrar historial de cargas' : 'Clear load history'}
                    </button>
                  </div>
                )}

                {/* Información de Mercados */}
                <div className="bg-black/20 rounded-lg p-4 border border-gray-700">
                  <h4 className="text-sm font-semibold text-gray-400 mb-2">{isSpanish ? 'Mercados Disponibles' : 'Available Markets'}</h4>
                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-2">
                      <span className="text-green-400 font-bold">USDT Market:</span>
                      <span className="text-gray-400 ml-2">BTC, ETH, XRP, SOL, ADA, DOGE...</span>
                    </div>
                    <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-2">
                      <span className="text-blue-400 font-bold">USDC Market:</span>
                      <span className="text-gray-400 ml-2">BTC, ETH, XRP, SOL, AVAX...</span>
                    </div>
                    <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-2">
                      <span className="text-amber-400 font-bold">EUR Market:</span>
                      <span className="text-gray-400 ml-2">BTC-EUR, ETH-EUR, USDT-EUR...</span>
                    </div>
                    <div className="bg-orange-500/10 border border-orange-500/20 rounded-lg p-2">
                      <span className="text-orange-400 font-bold">BTC Market:</span>
                      <span className="text-gray-400 ml-2">ETH-BTC, XRP-BTC, SOL-BTC...</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

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

                {/* Info: Cómo depositar USD en KuCoin */}
                <div className="bg-gradient-to-r from-amber-900/20 to-orange-900/20 border border-amber-500/30 rounded-xl p-4 mb-4">
                  <h3 className="text-sm font-semibold text-amber-400 flex items-center gap-2 mb-3">
                    <AlertTriangle className="w-4 h-4" />
                    {isSpanish ? '¿Cómo cargar USD en KuCoin?' : 'How to load USD in KuCoin?'}
                  </h3>
                  <div className="text-xs text-gray-300 space-y-2">
                    <p>
                      {isSpanish 
                        ? 'Para convertir USD a USDT necesitas tener USD en tu cuenta KuCoin Main:' 
                        : 'To convert USD to USDT you need USD in your KuCoin Main account:'}
                    </p>
                    <ol className="list-decimal list-inside space-y-1 text-gray-400">
                      <li>{isSpanish ? 'Deposita USD Fiat en KuCoin (banco/tarjeta)' : 'Deposit USD Fiat to KuCoin (bank/card)'}</li>
                      <li>{isSpanish ? 'O transfiere desde otra cuenta/exchange' : 'Or transfer from another account/exchange'}</li>
                      <li>{isSpanish ? 'Los fondos aparecerán en tu Main Account' : 'Funds will appear in your Main Account'}</li>
                    </ol>
                  </div>
                  
                  {/* Balance actual de KuCoin USD */}
                  <div className="mt-3 p-2 bg-black/30 rounded-lg flex justify-between items-center">
                    <span className="text-xs text-gray-400">{isSpanish ? 'Tu USD en KuCoin Main:' : 'Your USD in KuCoin Main:'}</span>
                    <span className="text-lg font-bold text-green-400">
                      ${(() => {
                        const usdMain = accounts.find(a => a.currency === 'USD' && a.type === 'main');
                        return usdMain ? parseFloat(usdMain.available).toLocaleString() : '0.00';
                      })()}
                    </span>
                  </div>
                </div>

                {/* Fuente de Fondos - Custody Accounts (para registro interno) */}
                <div className="bg-gradient-to-r from-purple-900/20 to-indigo-900/20 border border-purple-500/30 rounded-xl p-4">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-sm font-semibold text-purple-400 flex items-center gap-2">
                      <Database className="w-4 h-4" />
                      {isSpanish ? 'Registro de Origen (Custody Account)' : 'Source Record (Custody Account)'}
                    </h3>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={useCustodyFunds}
                        onChange={(e) => {
                          setUseCustodyFunds(e.target.checked);
                          if (!e.target.checked) {
                            setSelectedCustodyAccount('');
                          }
                        }}
                        className="w-4 h-4 accent-purple-500"
                      />
                      <span className="text-sm text-gray-300">
                        {isSpanish ? 'Usar Cuenta Custodio' : 'Use Custody Account'}
                      </span>
                    </label>
                  </div>

                  {useCustodyFunds && (
                    <div className="space-y-3">
                      {custodyAccounts.length === 0 ? (
                        <div className="text-center py-4 text-gray-500">
                          <Database className="w-8 h-8 mx-auto mb-2 opacity-30" />
                          <p className="text-sm">{isSpanish ? 'No hay cuentas custodio creadas' : 'No custody accounts created'}</p>
                          <p className="text-xs text-gray-600">{isSpanish ? 'Crea una cuenta en el módulo Custody Accounts' : 'Create an account in Custody Accounts module'}</p>
                        </div>
                      ) : (
                        <>
                          <select
                            value={selectedCustodyAccount}
                            onChange={(e) => {
                              setSelectedCustodyAccount(e.target.value);
                              // Auto-fill amount from selected account
                              if (e.target.value) {
                                const account = custodyAccounts.find(a => a.id === e.target.value);
                                if (account) {
                                  setConvertForm({
                                    ...convertForm,
                                    usdAmount: account.availableBalance.toString()
                                  });
                                }
                              }
                            }}
                            className="w-full px-4 py-3 bg-black/50 border border-purple-500/30 rounded-lg text-white focus:border-purple-500 outline-none"
                          >
                            <option value="">{isSpanish ? '-- Seleccionar Cuenta Custodio --' : '-- Select Custody Account --'}</option>
                            {custodyAccounts.filter(a => a.availableBalance > 0).map(account => (
                              <option key={account.id} value={account.id}>
                                {account.accountName} | {account.currency} {account.availableBalance.toLocaleString()} | {account.accountCategory}
                              </option>
                            ))}
                          </select>

                          {/* Cuenta Seleccionada - Detalles */}
                          {selectedCustodyAccount && (
                            <div className="bg-black/30 rounded-lg p-3 space-y-2">
                              {(() => {
                                const account = custodyAccounts.find(a => a.id === selectedCustodyAccount);
                                if (!account) return null;
                                return (
                                  <>
                                    <div className="flex justify-between items-center">
                                      <span className="text-xs text-gray-400">{isSpanish ? 'Nombre' : 'Name'}</span>
                                      <span className="text-sm font-semibold text-white">{account.accountName}</span>
                                    </div>
                                    <div className="flex justify-between items-center">
                                      <span className="text-xs text-gray-400">{isSpanish ? 'Número' : 'Number'}</span>
                                      <span className="text-xs font-mono text-gray-300">{account.accountNumber}</span>
                                    </div>
                                    <div className="flex justify-between items-center">
                                      <span className="text-xs text-gray-400">{isSpanish ? 'Tipo' : 'Type'}</span>
                                      <span className="text-xs text-purple-400 uppercase">{account.accountCategory}</span>
                                    </div>
                                    <div className="flex justify-between items-center">
                                      <span className="text-xs text-gray-400">{isSpanish ? 'Divisa' : 'Currency'}</span>
                                      <span className="text-sm font-semibold text-blue-400">{account.currency}</span>
                                    </div>
                                    <div className="flex justify-between items-center border-t border-gray-700 pt-2 mt-2">
                                      <span className="text-xs text-gray-400">{isSpanish ? 'Balance Disponible' : 'Available Balance'}</span>
                                      <span className="text-lg font-bold text-green-400">
                                        {account.currency === 'USD' ? '$' : ''}{account.availableBalance.toLocaleString()}
                                      </span>
                                    </div>
                                    <div className="flex justify-between items-center">
                                      <span className="text-xs text-gray-400">{isSpanish ? 'Balance Reservado' : 'Reserved Balance'}</span>
                                      <span className="text-sm text-yellow-400">{account.reservedBalance.toLocaleString()}</span>
                                    </div>
                                  </>
                                );
                              })()}
                            </div>
                          )}

                          {/* Lista de cuentas USD disponibles */}
                          <div className="mt-3">
                            <p className="text-xs text-gray-500 mb-2">{isSpanish ? 'Cuentas USD disponibles:' : 'Available USD accounts:'}</p>
                            <div className="grid grid-cols-2 gap-2 max-h-32 overflow-y-auto">
                              {custodyAccounts
                                .filter(a => a.currency === 'USD' && a.availableBalance > 0)
                                .slice(0, 6)
                                .map(account => (
                                  <button
                                    key={account.id}
                                    onClick={() => {
                                      setSelectedCustodyAccount(account.id);
                                      setConvertForm({
                                        ...convertForm,
                                        usdAmount: account.availableBalance.toString()
                                      });
                                    }}
                                    className={`p-2 rounded-lg text-left text-xs transition-all ${
                                      selectedCustodyAccount === account.id
                                        ? 'bg-purple-500/30 border border-purple-500'
                                        : 'bg-black/30 border border-gray-700 hover:border-purple-500/50'
                                    }`}
                                  >
                                    <div className="font-semibold text-white truncate">{account.accountName}</div>
                                    <div className="text-green-400">${account.availableBalance.toLocaleString()}</div>
                                  </button>
                                ))}
                            </div>
                          </div>
                        </>
                      )}
                    </div>
                  )}
                </div>

                {/* Flujo Visual */}
                <div className="bg-black/30 rounded-xl p-6">
                  <h3 className="text-sm font-semibold text-gray-400 mb-4 uppercase tracking-wider">
                    {isSpanish ? 'Flujo de Conversión' : 'Conversion Flow'}
                  </h3>
                  <div className="flex items-center justify-between">
                    {[
                      { icon: useCustodyFunds ? Database : DollarSign, label: useCustodyFunds ? 'Custody' : 'USD (Main)', color: useCustodyFunds ? 'purple' : 'green' },
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

            {/* ================================================================
                SWAP CRYPTO TAB - Conversión entre cualquier criptomoneda
            ================================================================ */}
            {activeTab === 'swap' && (
              <div className="space-y-6">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-gradient-to-br from-amber-500 to-orange-500 rounded-xl flex items-center justify-center">
                      <Repeat className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <h2 className="text-xl font-bold">{isSpanish ? 'Swap de Criptomonedas' : 'Crypto Swap'}</h2>
                      <p className="text-sm text-gray-400">{isSpanish ? 'Convierte entre cualquier cripto disponible' : 'Convert between any available crypto'}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      loadAvailableCurrencies();
                      loadAvailableSymbols();
                      loadAllTickers();
                    }}
                    className="p-2 bg-gray-700 rounded-lg hover:bg-gray-600"
                    title={isSpanish ? 'Actualizar datos' : 'Refresh data'}
                  >
                    <RefreshCw className="w-5 h-5" />
                  </button>
                </div>

                {/* Toggle de Modo REAL / Simulación */}
                <div className={`rounded-lg p-4 border-2 ${
                  simulationMode 
                    ? 'bg-gradient-to-r from-purple-500/10 to-blue-500/10 border-purple-500/30'
                    : 'bg-gradient-to-r from-green-500/10 to-emerald-500/10 border-green-500/50'
                }`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                        simulationMode 
                          ? 'bg-gradient-to-br from-purple-500 to-blue-500'
                          : 'bg-gradient-to-br from-green-500 to-emerald-500'
                      }`}>
                        {simulationMode ? <Zap className="w-5 h-5 text-white" /> : <CheckCircle className="w-5 h-5 text-white" />}
                      </div>
                      <div>
                        <div className={`font-semibold ${simulationMode ? 'text-purple-300' : 'text-green-300'}`}>
                          {simulationMode 
                            ? (isSpanish ? '🧪 Modo Simulación' : '🧪 Simulation Mode')
                            : (isSpanish ? '🔴 Modo REAL (KuCoin Live)' : '🔴 REAL Mode (KuCoin Live)')
                          }
                        </div>
                        <div className="text-xs text-gray-400">
                          {simulationMode 
                            ? (isSpanish ? 'Prueba swaps sin credenciales reales' : 'Test swaps without real credentials')
                            : (isSpanish ? '⚠️ Los swaps se ejecutarán en KuCoin real' : '⚠️ Swaps will execute on real KuCoin')
                          }
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={() => {
                        const newMode = !simulationMode;
                        setSimulationMode(newMode);
                        localStorage.setItem('kucoin_simulation_mode', JSON.stringify(newMode));
                      }}
                      className={`relative w-14 h-7 rounded-full transition-all ${
                        simulationMode 
                          ? 'bg-gradient-to-r from-purple-500 to-blue-500' 
                          : 'bg-gradient-to-r from-green-500 to-emerald-500'
                      }`}
                    >
                      <div className={`absolute top-1 w-5 h-5 bg-white rounded-full transition-all ${
                        simulationMode ? 'left-8' : 'left-1'
                      }`} />
                    </button>
                  </div>
                  {simulationMode ? (
                    <div className="mt-3 text-xs text-purple-300 bg-purple-500/10 rounded p-2">
                      ✨ {isSpanish 
                        ? 'Los swaps se simularán con precios reales de mercado pero sin ejecutar órdenes reales' 
                        : 'Swaps will be simulated with real market prices but without executing real orders'}
                    </div>
                  ) : (
                    <div className="mt-3 text-xs text-green-300 bg-green-500/10 rounded p-2">
                      🔴 {isSpanish 
                        ? 'ADVERTENCIA: Las órdenes se ejecutarán en tiempo real en tu cuenta de KuCoin. Asegúrate de tener fondos disponibles.' 
                        : 'WARNING: Orders will execute in real-time on your KuCoin account. Make sure you have available funds.'}
                    </div>
                  )}
                </div>

                {!config.isConfigured && !simulationMode && (
                  <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4 flex items-center gap-3">
                    <AlertTriangle className="w-6 h-6 text-yellow-400" />
                    <div>
                      <div className="font-semibold text-yellow-400">
                        {isSpanish ? 'Configuración Requerida' : 'Configuration Required'}
                      </div>
                      <div className="text-sm text-gray-400">
                        {isSpanish 
                          ? 'Configura tus credenciales de KuCoin API para hacer swaps' 
                          : 'Configure your KuCoin API credentials to make swaps'}
                      </div>
                    </div>
                  </div>
                )}

                {/* Balance USD disponible en KuCoin - Prominente */}
                <div className="bg-gradient-to-r from-green-900/30 to-emerald-900/30 border-2 border-green-500/50 rounded-xl p-4 mb-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-emerald-500 rounded-xl flex items-center justify-center">
                        <DollarSign className="w-6 h-6 text-white" />
                      </div>
                      <div>
                        <div className="text-sm text-gray-400">{isSpanish ? 'Tu Balance USD en KuCoin' : 'Your USD Balance in KuCoin'}</div>
                        <div className="text-2xl font-bold text-green-400">
                          ${(() => {
                            const usdMain = accounts.find(a => a.currency === 'USD' && a.type === 'main');
                            const usdTrade = accounts.find(a => a.currency === 'USD' && a.type === 'trade');
                            const total = (usdMain ? parseFloat(usdMain.available) : 0) + (usdTrade ? parseFloat(usdTrade.available) : 0);
                            return total.toLocaleString();
                          })()}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-xs text-gray-500">Main: ${(() => {
                        const usdMain = accounts.find(a => a.currency === 'USD' && a.type === 'main');
                        return usdMain ? parseFloat(usdMain.available).toLocaleString() : '0.00';
                      })()}</div>
                      <div className="text-xs text-gray-500">Trade: ${(() => {
                        const usdTrade = accounts.find(a => a.currency === 'USD' && a.type === 'trade');
                        return usdTrade ? parseFloat(usdTrade.available).toLocaleString() : '0.00';
                      })()}</div>
                      <button
                        onClick={() => {
                          setSwapFromCurrency('USD');
                          const usdMain = accounts.find(a => a.currency === 'USD' && a.type === 'main');
                          const usdTrade = accounts.find(a => a.currency === 'USD' && a.type === 'trade');
                          const total = (usdMain ? parseFloat(usdMain.available) : 0) + (usdTrade ? parseFloat(usdTrade.available) : 0);
                          setSwapAmount(total.toFixed(2));
                        }}
                        className="mt-2 px-3 py-1 bg-green-600 text-white text-xs rounded-lg hover:bg-green-500 transition-all"
                      >
                        {isSpanish ? 'Usar USD' : 'Use USD'}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Card principal del Swap */}
                <div className="bg-gradient-to-br from-[#1a1a1a] to-[#0a0a0a] border-2 border-amber-500/30 rounded-2xl p-6 shadow-2xl">
                  
                  {/* FROM - Moneda origen */}
                  <div className={`rounded-xl p-4 mb-2 ${swapFromCurrency === 'USD' ? 'bg-green-900/30 border border-green-500/30' : 'bg-black/40'}`}>
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-sm text-gray-400">{isSpanish ? 'De' : 'From'}</span>
                      <span className={`text-xs ${swapFromCurrency === 'USD' ? 'text-green-400' : 'text-gray-500'}`}>
                        {isSpanish ? 'Balance' : 'Balance'}: {swapFromCurrency === 'USD' ? '$' : ''}{getCurrencyBalance(swapFromCurrency)} {swapFromCurrency}
                      </span>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="relative flex-1">
                        {swapFromCurrency === 'USD' && (
                          <DollarSign className="absolute left-0 top-1/2 -translate-y-1/2 w-8 h-8 text-green-400" />
                        )}
                        <input
                          type="number"
                          value={swapAmount}
                          onChange={(e) => setSwapAmount(e.target.value)}
                          placeholder="0.00"
                          className={`w-full bg-transparent text-3xl font-bold outline-none ${swapFromCurrency === 'USD' ? 'text-green-400 pl-10' : 'text-white'}`}
                        />
                      </div>
                      <div className="relative">
                        <select
                          value={swapFromCurrency}
                          onChange={(e) => setSwapFromCurrency(e.target.value)}
                          className={`appearance-none text-white font-bold px-4 py-3 pr-10 rounded-xl cursor-pointer transition-all ${
                            swapFromCurrency === 'USD' 
                              ? 'bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500' 
                              : 'bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500'
                          }`}
                        >
                          <option value="USD">💵 USD</option>
                          <option value="USDT">USDT</option>
                          <option value="USDC">USDC</option>
                          <option value="BTC">BTC</option>
                          <option value="ETH">ETH</option>
                          <option value="XRP">XRP</option>
                          <option value="SOL">SOL</option>
                          <option value="ADA">ADA</option>
                          <option value="DOGE">DOGE</option>
                          <option value="DOT">DOT</option>
                          <option value="MATIC">MATIC</option>
                          <option value="AVAX">AVAX</option>
                          <option value="LINK">LINK</option>
                          <option value="LTC">LTC</option>
                          <option value="UNI">UNI</option>
                          <option value="ATOM">ATOM</option>
                          {availableCurrencies
                            .filter(c => !['USD', 'USDT', 'USDC', 'BTC', 'ETH', 'XRP', 'SOL', 'ADA', 'DOGE', 'DOT', 'MATIC', 'AVAX', 'LINK', 'LTC', 'UNI', 'ATOM'].includes(c.currency))
                            .map(c => (
                              <option key={c.currency} value={c.currency}>{c.currency}</option>
                            ))
                          }
                        </select>
                        <ChevronRight className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 rotate-90 pointer-events-none" />
                      </div>
                    </div>
                    {/* Botones de porcentaje */}
                    <div className="flex gap-2 mt-3">
                      {[25, 50, 75, 100].map(pct => (
                        <button
                          key={pct}
                          onClick={() => {
                            const balance = parseFloat(getCurrencyBalance(swapFromCurrency));
                            setSwapAmount((balance * pct / 100).toFixed(swapFromCurrency === 'USD' ? 2 : 8));
                          }}
                          className={`flex-1 py-1 text-xs rounded transition-all ${
                            swapFromCurrency === 'USD'
                              ? 'bg-green-700/50 text-green-300 hover:bg-green-600/50 hover:text-white'
                              : 'bg-gray-700/50 text-gray-400 hover:bg-gray-600/50 hover:text-white'
                          }`}
                        >
                          {pct}%
                        </button>
                      ))}
                    </div>
                    
                    {/* Nota cuando USD está seleccionado */}
                    {swapFromCurrency === 'USD' && (
                      <div className="mt-3 p-2 bg-green-500/10 border border-green-500/20 rounded-lg">
                        <p className="text-xs text-green-300">
                          💡 {isSpanish 
                            ? 'Usando tu balance USD de KuCoin. El swap se ejecutará comprando la crypto destino con tus dólares.' 
                            : 'Using your KuCoin USD balance. The swap will buy the destination crypto with your dollars.'}
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Botón de intercambio */}
                  <div className="flex justify-center -my-3 relative z-10">
                    <button
                      onClick={swapCurrencies}
                      className="w-12 h-12 bg-gradient-to-br from-amber-500 to-orange-500 rounded-full flex items-center justify-center hover:scale-110 transition-transform shadow-lg shadow-amber-500/30"
                    >
                      <ArrowDownUp className="w-5 h-5 text-white" />
                    </button>
                  </div>

                  {/* TO - Moneda destino */}
                  <div className="bg-black/40 rounded-xl p-4 mt-2">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-sm text-gray-400">{isSpanish ? 'A' : 'To'}</span>
                      <span className="text-xs text-gray-500">
                        {isSpanish ? 'Balance' : 'Balance'}: {getCurrencyBalance(swapToCurrency)} {swapToCurrency}
                      </span>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="flex-1">
                        <div className="text-3xl font-bold text-emerald-400">
                          {swapEstimate ? swapEstimate.estimated : '0.00'}
                        </div>
                        {swapEstimate && (
                          <div className="text-xs text-gray-500 mt-1">
                            {isSpanish ? 'Estimado (incluye ~0.1% fee)' : 'Estimated (includes ~0.1% fee)'}
                          </div>
                        )}
                      </div>
                      <div className="relative">
                        <select
                          value={swapToCurrency}
                          onChange={(e) => setSwapToCurrency(e.target.value)}
                          className="appearance-none bg-gradient-to-r from-emerald-600 to-green-600 text-white font-bold px-4 py-3 pr-10 rounded-xl cursor-pointer hover:from-emerald-500 hover:to-green-500 transition-all"
                        >
                          <option value="BTC">BTC</option>
                          <option value="ETH">ETH</option>
                          <option value="USDT">USDT</option>
                          <option value="USDC">USDC</option>
                          <option value="XRP">XRP</option>
                          <option value="SOL">SOL</option>
                          <option value="ADA">ADA</option>
                          <option value="DOGE">DOGE</option>
                          <option value="DOT">DOT</option>
                          <option value="MATIC">MATIC</option>
                          <option value="AVAX">AVAX</option>
                          <option value="LINK">LINK</option>
                          <option value="LTC">LTC</option>
                          <option value="UNI">UNI</option>
                          <option value="ATOM">ATOM</option>
                          {availableCurrencies
                            .filter(c => !['USDT', 'USDC', 'BTC', 'ETH', 'XRP', 'SOL', 'ADA', 'DOGE', 'DOT', 'MATIC', 'AVAX', 'LINK', 'LTC', 'UNI', 'ATOM'].includes(c.currency))
                            .map(c => (
                              <option key={c.currency} value={c.currency}>{c.currency}</option>
                            ))
                          }
                        </select>
                        <ChevronRight className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 rotate-90 pointer-events-none" />
                      </div>
                    </div>
                  </div>

                  {/* Info del swap */}
                  {swapEstimate && (
                    <div className="mt-4 bg-black/30 rounded-lg p-3 space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-400">{isSpanish ? 'Precio' : 'Price'}</span>
                        <span className="text-white">1 {swapFromCurrency} ≈ {swapEstimate.price} {swapToCurrency}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-400">{isSpanish ? 'Fee estimado' : 'Estimated Fee'}</span>
                        <span className="text-yellow-400">~{swapEstimate.fee} {swapToCurrency}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-400">{isSpanish ? 'Recibirás' : "You'll receive"}</span>
                        <span className="text-emerald-400 font-bold">{swapEstimate.estimated} {swapToCurrency}</span>
                      </div>
                    </div>
                  )}

                  {/* Botón de ejecutar */}
                  <button
                    onClick={executeSwap}
                    disabled={isLoadingSwap || (!config.isConfigured && !simulationMode) || !swapAmount || parseFloat(swapAmount) <= 0 || swapFromCurrency === swapToCurrency}
                    className="w-full mt-6 py-4 bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-xl font-bold text-lg hover:from-amber-400 hover:to-orange-400 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3 shadow-lg shadow-amber-500/30"
                  >
                    {isLoadingSwap ? (
                      <>
                        <Loader2 className="w-6 h-6 animate-spin" />
                        {isSpanish ? 'Procesando...' : 'Processing...'}
                      </>
                    ) : (
                      <>
                        <Repeat className="w-6 h-6" />
                        {isSpanish ? 'Ejecutar Swap' : 'Execute Swap'}
                      </>
                    )}
                  </button>
                </div>

                {/* Precios de mercado */}
                <div className="bg-black/30 rounded-xl p-4">
                  <h3 className="text-sm font-semibold text-gray-400 mb-4 flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-emerald-400" />
                    {isSpanish ? 'Precios de Mercado' : 'Market Prices'}
                  </h3>
                  <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto">
                    {allTickers.slice(0, 12).map(ticker => (
                      <div 
                        key={ticker.symbol}
                        className="bg-black/30 rounded-lg p-2 flex justify-between items-center cursor-pointer hover:bg-black/50 transition-all"
                        onClick={() => {
                          const [base, quote] = ticker.symbol.split('-');
                          setSwapFromCurrency(quote);
                          setSwapToCurrency(base);
                        }}
                      >
                        <span className="text-sm font-medium text-white">{ticker.symbol}</span>
                        <div className="text-right">
                          <div className="text-sm text-emerald-400">${parseFloat(ticker.last).toLocaleString()}</div>
                          <div className={`text-xs ${parseFloat(ticker.changeRate) >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                            {parseFloat(ticker.changeRate) >= 0 ? '+' : ''}{(parseFloat(ticker.changeRate) * 100).toFixed(2)}%
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Historial de swaps reciente */}
                {swapHistory.length > 0 && (
                  <div className="bg-black/30 rounded-xl p-4">
                    <h3 className="text-sm font-semibold text-gray-400 mb-3 flex items-center gap-2">
                      <History className="w-4 h-4" />
                      {isSpanish ? 'Swaps Recientes' : 'Recent Swaps'}
                    </h3>
                    <div className="space-y-2 max-h-32 overflow-y-auto">
                      {swapHistory.slice(0, 5).map(swap => (
                        <div key={swap.id} className="flex items-center justify-between bg-black/20 p-2 rounded-lg">
                          <div className="flex items-center gap-2">
                            <CheckCircle className="w-4 h-4 text-emerald-400" />
                            <span className="text-sm text-white">{swap.spent} {swap.from} → {swap.received} {swap.to}</span>
                          </div>
                          <span className="text-xs text-gray-500">{new Date(swap.timestamp).toLocaleTimeString()}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Custody Accounts Tab */}
            {activeTab === 'custody' && (
              <div className="space-y-6">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-3">
                    <Database className="w-6 h-6 text-purple-400" />
                    <h2 className="text-xl font-bold">{isSpanish ? 'Cuentas Custodio Disponibles' : 'Available Custody Accounts'}</h2>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-gray-400">
                    <span>{custodyAccounts.length} {isSpanish ? 'cuentas' : 'accounts'}</span>
                    <button
                      onClick={() => setCustodyAccounts(custodyStore.getAccounts())}
                      className="p-2 hover:bg-gray-700 rounded-lg"
                      title={isSpanish ? 'Actualizar' : 'Refresh'}
                    >
                      <RefreshCw className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Resumen de fondos */}
                <div className="grid grid-cols-3 gap-4">
                  <div className="bg-green-500/10 border border-green-500/30 rounded-xl p-4 text-center">
                    <div className="text-2xl font-bold text-green-400">
                      ${custodyAccounts
                        .filter(a => a.currency === 'USD')
                        .reduce((sum, a) => sum + a.availableBalance, 0)
                        .toLocaleString()}
                    </div>
                    <div className="text-xs text-gray-400">USD {isSpanish ? 'Disponible' : 'Available'}</div>
                  </div>
                  <div className="bg-blue-500/10 border border-blue-500/30 rounded-xl p-4 text-center">
                    <div className="text-2xl font-bold text-blue-400">
                      €{custodyAccounts
                        .filter(a => a.currency === 'EUR')
                        .reduce((sum, a) => sum + a.availableBalance, 0)
                        .toLocaleString()}
                    </div>
                    <div className="text-xs text-gray-400">EUR {isSpanish ? 'Disponible' : 'Available'}</div>
                  </div>
                  <div className="bg-purple-500/10 border border-purple-500/30 rounded-xl p-4 text-center">
                    <div className="text-2xl font-bold text-purple-400">
                      {custodyAccounts.filter(a => a.availableBalance > 0).length}
                    </div>
                    <div className="text-xs text-gray-400">{isSpanish ? 'Cuentas con Fondos' : 'Funded Accounts'}</div>
                  </div>
                </div>

                {/* Lista de cuentas */}
                {custodyAccounts.length === 0 ? (
                  <div className="text-center py-12 text-gray-500">
                    <Database className="w-16 h-16 mx-auto mb-4 opacity-30" />
                    <p className="text-lg">{isSpanish ? 'No hay cuentas custodio' : 'No custody accounts'}</p>
                    <p className="text-sm mt-2">{isSpanish ? 'Crea cuentas en el módulo Custody Accounts' : 'Create accounts in Custody Accounts module'}</p>
                  </div>
                ) : (
                  <div className="space-y-3 max-h-[400px] overflow-y-auto">
                    {custodyAccounts.map(account => (
                      <div
                        key={account.id}
                        className={`border rounded-xl p-4 transition-all cursor-pointer hover:border-purple-500/50 ${
                          selectedCustodyAccount === account.id 
                            ? 'border-purple-500 bg-purple-500/10' 
                            : 'border-gray-700 bg-black/20'
                        }`}
                        onClick={() => {
                          setSelectedCustodyAccount(account.id);
                          setUseCustodyFunds(true);
                          setConvertForm({
                            ...convertForm,
                            usdAmount: account.availableBalance.toString()
                          });
                          setActiveTab('convert');
                        }}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                              account.currency === 'USD' ? 'bg-green-500/20' :
                              account.currency === 'EUR' ? 'bg-blue-500/20' :
                              'bg-gray-500/20'
                            }`}>
                              <DollarSign className={`w-5 h-5 ${
                                account.currency === 'USD' ? 'text-green-400' :
                                account.currency === 'EUR' ? 'text-blue-400' :
                                'text-gray-400'
                              }`} />
                            </div>
                            <div>
                              <div className="font-semibold text-white">{account.accountName}</div>
                              <div className="text-xs text-gray-500 font-mono">{account.accountNumber}</div>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className={`text-lg font-bold ${
                              account.availableBalance > 0 ? 'text-green-400' : 'text-gray-500'
                            }`}>
                              {account.currency} {account.availableBalance.toLocaleString()}
                            </div>
                            <div className="text-xs text-gray-500 uppercase">{account.accountCategory}</div>
                          </div>
                        </div>
                        
                        {/* Detalles adicionales */}
                        <div className="mt-3 pt-3 border-t border-gray-700/50 grid grid-cols-4 gap-2 text-xs">
                          <div>
                            <span className="text-gray-500">{isSpanish ? 'Reservado' : 'Reserved'}</span>
                            <div className="text-yellow-400">{account.reservedBalance.toLocaleString()}</div>
                          </div>
                          <div>
                            <span className="text-gray-500">{isSpanish ? 'Tipo' : 'Type'}</span>
                            <div className="text-purple-400 uppercase">{account.accountType}</div>
                          </div>
                          <div>
                            <span className="text-gray-500">Bank</span>
                            <div className="text-gray-300 truncate">{account.bankName || 'DCB'}</div>
                          </div>
                          <div>
                            <span className="text-gray-500">{isSpanish ? 'Transacciones' : 'Transactions'}</span>
                            <div className="text-gray-300">{account.transactions?.length || 0}</div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Acciones rápidas */}
                <div className="flex gap-3">
                  <button
                    onClick={() => {
                      // Seleccionar la cuenta USD con mayor balance
                      const usdAccounts = custodyAccounts.filter(a => a.currency === 'USD' && a.availableBalance > 0);
                      if (usdAccounts.length > 0) {
                        const maxAccount = usdAccounts.reduce((max, a) => a.availableBalance > max.availableBalance ? a : max);
                        setSelectedCustodyAccount(maxAccount.id);
                        setUseCustodyFunds(true);
                        setConvertForm({
                          ...convertForm,
                          usdAmount: maxAccount.availableBalance.toString()
                        });
                        setActiveTab('convert');
                      } else {
                        alert(isSpanish ? '❌ No hay cuentas USD con fondos' : '❌ No USD accounts with funds');
                      }
                    }}
                    className="flex-1 py-3 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-xl font-bold flex items-center justify-center gap-2"
                  >
                    <Zap className="w-5 h-5" />
                    {isSpanish ? 'Convertir Mayor Balance USD' : 'Convert Highest USD Balance'}
                  </button>
                </div>
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

            {/* USD Balance - Prominente */}
            <div className="mt-4 pt-4 border-t border-gray-700">
              <h4 className="text-xs font-semibold text-gray-400 mb-2 flex items-center gap-2">
                <DollarSign className="w-4 h-4 text-green-400" />
                {isSpanish ? 'Balance USD (KuCoin)' : 'USD Balance (KuCoin)'}
              </h4>
              
              {/* USD Main Account */}
              <div className="bg-gradient-to-r from-green-900/30 to-emerald-900/30 border border-green-500/30 rounded-lg p-3 mb-2">
                <div className="flex justify-between items-center">
                  <div>
                    <span className="text-xs text-gray-400">Main Account</span>
                    <div className="text-xl font-bold text-green-400">
                      ${(() => {
                        const usdMain = accounts.find(a => a.currency === 'USD' && a.type === 'main');
                        return usdMain ? parseFloat(usdMain.available).toLocaleString() : '0.00';
                      })()}
                    </div>
                  </div>
                  <DollarSign className="w-8 h-8 text-green-500/30" />
                </div>
              </div>
              
              {/* USD Trade Account */}
              <div className="bg-black/30 border border-gray-700 rounded-lg p-3 mb-3">
                <div className="flex justify-between items-center">
                  <div>
                    <span className="text-xs text-gray-400">Trade Account</span>
                    <div className="text-lg font-bold text-blue-400">
                      ${(() => {
                        const usdTrade = accounts.find(a => a.currency === 'USD' && a.type === 'trade');
                        return usdTrade ? parseFloat(usdTrade.available).toLocaleString() : '0.00';
                      })()}
                    </div>
                  </div>
                  <ArrowRightLeft className="w-6 h-6 text-blue-500/30" />
                </div>
              </div>

              {/* Botón para depositar USD desde Custody a KuCoin */}
              {custodyAccounts.filter(a => a.currency === 'USD' && a.availableBalance > 0).length > 0 && (
                <button
                  onClick={() => setShowDepositModal(true)}
                  className="w-full py-3 bg-gradient-to-r from-green-600 to-emerald-600 border border-green-500/50 text-white rounded-lg text-sm font-bold hover:from-green-500 hover:to-emerald-500 transition-all flex items-center justify-center gap-2 shadow-lg shadow-green-500/20"
                >
                  <Send className="w-5 h-5" />
                  {isSpanish ? '💵 Depositar USD a KuCoin' : '💵 Deposit USD to KuCoin'}
                  <span className="bg-black/30 px-2 py-0.5 rounded-full text-xs">
                    ${custodyAccounts
                      .filter(a => a.currency === 'USD')
                      .reduce((sum, a) => sum + a.availableBalance, 0)
                      .toLocaleString()} {isSpanish ? 'disponible' : 'available'}
                  </span>
                </button>
              )}
            </div>

            {/* USDT Balance */}
            <div className="mt-3">
              <h4 className="text-xs font-semibold text-gray-400 mb-2 flex items-center gap-2">
                <Coins className="w-4 h-4 text-emerald-400" />
                USDT
              </h4>
              <div className="bg-black/30 border border-gray-700 rounded-lg p-3">
                <div className="flex justify-between items-center">
                  <div>
                    <span className="text-xs text-gray-400">Main</span>
                    <div className="text-lg font-bold text-emerald-400">
                      {(() => {
                        const usdtMain = accounts.find(a => a.currency === 'USDT' && a.type === 'main');
                        return usdtMain ? parseFloat(usdtMain.available).toLocaleString() : '0.00';
                      })()} USDT
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-xs text-gray-400">Trade</span>
                    <div className="text-sm text-gray-300">
                      {(() => {
                        const usdtTrade = accounts.find(a => a.currency === 'USDT' && a.type === 'trade');
                        return usdtTrade ? parseFloat(usdtTrade.available).toLocaleString() : '0.00';
                      })()} USDT
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Otras cuentas */}
            {accounts.length > 0 && (
              <div className="mt-3">
                <h4 className="text-xs font-semibold text-gray-400 mb-2">
                  {isSpanish ? 'Otras Monedas' : 'Other Currencies'}
                </h4>
                <div className="space-y-1 max-h-24 overflow-y-auto">
                  {accounts
                    .filter(a => !['USD', 'USDT'].includes(a.currency))
                    .slice(0, 6)
                    .map((acc, idx) => (
                      <div key={idx} className="flex justify-between text-xs bg-black/20 p-2 rounded">
                        <span className="font-semibold text-gray-300">{acc.currency}</span>
                        <span className={parseFloat(acc.available) > 0 ? 'text-green-400' : 'text-gray-500'}>
                          {parseFloat(acc.available).toFixed(4)}
                        </span>
                      </div>
                    ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Modal de Depósito USD a KuCoin */}
      {showDepositModal && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="bg-gradient-to-br from-[#1a1a1a] to-[#0d0d0d] border border-green-500/30 rounded-2xl p-6 max-w-md w-full">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-white flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-emerald-500 rounded-lg flex items-center justify-center">
                  <Send className="w-5 h-5 text-white" />
                </div>
                {isSpanish ? 'Depositar USD a KuCoin' : 'Deposit USD to KuCoin'}
              </h3>
              <button
                onClick={() => setShowDepositModal(false)}
                className="text-gray-500 hover:text-white text-2xl"
              >
                ×
              </button>
            </div>

            {/* Flujo visual */}
            <div className="bg-black/30 rounded-xl p-4 mb-4">
              <div className="flex items-center justify-between text-xs">
                <div className="flex flex-col items-center">
                  <Database className="w-8 h-8 text-purple-400 mb-1" />
                  <span className="text-gray-400">Custody</span>
                </div>
                <div className="flex-1 mx-3 border-t-2 border-dashed border-green-500/50 relative">
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-green-500 text-white text-xs px-2 py-0.5 rounded-full">
                    USD
                  </span>
                </div>
                <div className="flex flex-col items-center">
                  <Coins className="w-8 h-8 text-green-400 mb-1" />
                  <span className="text-gray-400">KuCoin</span>
                </div>
              </div>
            </div>

            {/* Seleccionar cuenta origen */}
            <div className="mb-4">
              <label className="text-sm text-gray-400 mb-2 block">
                {isSpanish ? 'Cuenta Origen (Custody USD)' : 'Source Account (Custody USD)'}
              </label>
              <select
                value={depositFromAccount}
                onChange={(e) => {
                  setDepositFromAccount(e.target.value);
                  // Auto-fill amount
                  if (e.target.value) {
                    const account = custodyAccounts.find(a => a.id === e.target.value);
                    if (account) {
                      setDepositAmount(account.availableBalance.toString());
                    }
                  }
                }}
                className="w-full px-4 py-3 bg-black/50 border border-gray-700 rounded-lg text-white focus:border-green-500 outline-none"
              >
                <option value="">{isSpanish ? '-- Seleccionar Cuenta --' : '-- Select Account --'}</option>
                {custodyAccounts
                  .filter(a => a.currency === 'USD' && a.availableBalance > 0)
                  .map(account => (
                    <option key={account.id} value={account.id}>
                      {account.accountName} | ${account.availableBalance.toLocaleString()}
                    </option>
                  ))}
              </select>
            </div>

            {/* Cuenta seleccionada info */}
            {depositFromAccount && (() => {
              const account = custodyAccounts.find(a => a.id === depositFromAccount);
              if (!account) return null;
              return (
                <div className="bg-purple-500/10 border border-purple-500/30 rounded-lg p-3 mb-4">
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-gray-400">{isSpanish ? 'Disponible' : 'Available'}</span>
                    <span className="text-lg font-bold text-purple-400">${account.availableBalance.toLocaleString()}</span>
                  </div>
                  <div className="text-xs text-gray-500 mt-1">{account.accountNumber}</div>
                </div>
              );
            })()}

            {/* Monto a depositar */}
            <div className="mb-4">
              <label className="text-sm text-gray-400 mb-2 block">
                {isSpanish ? 'Monto USD a Depositar' : 'USD Amount to Deposit'}
              </label>
              <div className="relative">
                <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                <input
                  type="number"
                  value={depositAmount}
                  onChange={(e) => setDepositAmount(e.target.value)}
                  placeholder="0.00"
                  min="0"
                  step="0.01"
                  className="w-full pl-10 pr-4 py-3 bg-black/50 border border-gray-700 rounded-lg text-white text-xl font-bold focus:border-green-500 outline-none"
                />
              </div>
              
              {/* Botones de cantidad rápida */}
              {depositFromAccount && (
                <div className="flex gap-2 mt-2">
                  {[25, 50, 75, 100].map(pct => {
                    const account = custodyAccounts.find(a => a.id === depositFromAccount);
                    if (!account) return null;
                    const amount = (account.availableBalance * pct / 100).toFixed(2);
                    return (
                      <button
                        key={pct}
                        onClick={() => setDepositAmount(amount)}
                        className="flex-1 py-1 bg-gray-700 text-gray-300 text-xs rounded hover:bg-gray-600"
                      >
                        {pct}%
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Destino */}
            <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-3 mb-6">
              <div className="flex items-center gap-2 mb-2">
                <Coins className="w-5 h-5 text-green-400" />
                <span className="text-sm font-semibold text-green-400">
                  {isSpanish ? 'Destino: KuCoin Main Account (USD)' : 'Destination: KuCoin Main Account (USD)'}
                </span>
              </div>
              <div className="text-xs text-gray-400">
                {isSpanish 
                  ? 'Los fondos estarán disponibles para conversión USD → USDT' 
                  : 'Funds will be available for USD → USDT conversion'}
              </div>
            </div>

            {/* Botones */}
            <div className="flex gap-3">
              <button
                onClick={() => setShowDepositModal(false)}
                className="flex-1 py-3 bg-gray-700 text-white rounded-xl font-bold hover:bg-gray-600"
              >
                {isSpanish ? 'Cancelar' : 'Cancel'}
              </button>
              <button
                onClick={handleDepositToKuCoin}
                disabled={!depositFromAccount || !depositAmount || parseFloat(depositAmount) <= 0}
                className="flex-1 py-3 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-xl font-bold hover:from-green-500 hover:to-emerald-500 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                <Send className="w-5 h-5" />
                {isSpanish ? 'Depositar' : 'Deposit'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
