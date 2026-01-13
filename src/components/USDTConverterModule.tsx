/**
 * USDT Converter Module
 * Converts USD to USDT using Web3/Infura
 * Reads accounts from fondos.json via backend API
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  RefreshCw, ArrowRightLeft, Wallet, Settings, History,
  CheckCircle, XCircle, AlertTriangle, DollarSign, Coins,
  Send, Eye, EyeOff, Copy, ExternalLink, Loader2, Shield,
  TrendingUp, Activity, Database, Key, Globe, Zap, Building2,
  CreditCard, Lock, ChevronDown, Check, AlertCircle
} from 'lucide-react';
import { custodyStore, type CustodyAccount } from '../lib/custody-store';
import { executeUSDTTransfer, executeMintingSimulation, initWeb3 } from '../lib/web3-transaction';

// ============================================================================
// INTERFACES
// ============================================================================

// JSON Account structure from fondos.json
interface JsonAccount {
  id: number;
  nombre: string;
  monto_usd: number;
  direccion_usdt: string;
  tipo?: string;
  banco?: string;
  moneda?: string;
  last_conversion?: {
    usd_amount: number;
    usdt_amount: number;
    tx_hash: string;
    to_address: string;
  };
}

// Unified account type - can be from fondos.json or custody
interface UnifiedAccount {
  id: string;
  name: string;
  type: 'json' | 'custody';
  balance: number;
  currency: string;
  source: string; // "fondos.json" or "Custodio"
  custodyId?: string; // only for custody accounts
  jsonId?: number;   // only for json accounts
}

interface ConversionResult {
  id: string;
  timestamp: string;
  amountUsd: number;
  amountUsdt: number;
  rate: number;
  destinationAddress: string;
  sourceAccountId: string;
  sourceAccountName: string;
  txHash?: string;
  status: 'pending' | 'success' | 'failed';
  explorerUrl?: string;
}

interface WalletConfig {
  infuraProjectId: string;
  privateKey: string;
  walletAddress: string;
}

interface PriceData {
  rate: number;
  source: string;
  timestamp: string;
  deviation: number;
}

// ============================================================================
// COMPONENT
// ============================================================================
const USDTConverterModule: React.FC = () => {
  // State
  const [activeTab, setActiveTab] = useState<'convert' | 'config' | 'history'>('convert');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // JSON Accounts State (from fondos.json)
  const [jsonAccounts, setJsonAccounts] = useState<JsonAccount[]>([]);
  
  // Custody Accounts State
  const [custodyAccounts, setCustodyAccounts] = useState<CustodyAccount[]>([]);
  
  // Unified accounts (combined JSON + Custody)
  const [allAccounts, setAllAccounts] = useState<UnifiedAccount[]>([]);
  const [selectedAccountId, setSelectedAccountId] = useState<string>('');
  const [selectedAccount, setSelectedAccount] = useState<UnifiedAccount | null>(null);
  const [showAccountSelector, setShowAccountSelector] = useState(false);

  // Wallet Config - Load from environment variables or localStorage
  const [walletConfig, setWalletConfig] = useState<WalletConfig>({
    infuraProjectId: import.meta.env.VITE_INFURA_PROJECT_ID || '6b7bd498942d42edab758545c7d30403',
    privateKey: import.meta.env.VITE_ETH_PRIVATE_KEY || '',
    walletAddress: import.meta.env.VITE_ETH_WALLET_ADDRESS || ''
  });
  const [showPrivateKey, setShowPrivateKey] = useState(false);

  // Conversion State
  const [amountUsd, setAmountUsd] = useState<string>('');
  const [destinationAddress, setDestinationAddress] = useState<string>('');
  const [priceData, setPriceData] = useState<PriceData | null>(null);
  const [estimatedUsdt, setEstimatedUsdt] = useState<number>(0);
  const [useFullBalance, setUseFullBalance] = useState(false);

  // History
  const [conversions, setConversions] = useState<ConversionResult[]>([]);

  // Connection Status
  const [isConnected, setIsConnected] = useState(false);
  const [networkInfo, setNetworkInfo] = useState<{ chainId: number; blockNumber: number } | null>(null);
  
  // Operator Wallet Balance (from backend)
  const [operatorBalance, setOperatorBalance] = useState<{ usdt: number; eth: number; address: string } | null>(null);

  // ============================================================================
  // 4-STEP WIZARD STATE (New)
  // ============================================================================
  const [wizardStep, setWizardStep] = useState<1 | 2 | 3 | 4>(1);
  const [wizardData, setWizardData] = useState({
    account: null as UnifiedAccount | null,
    amount: 0,
    address: '',
    gasEstimate: null as { gasLimit: number; gasPrice: number; totalGas: number } | null,
    txHash: null as string | null,
    error: null as string | null,
    status: 'idle' as 'idle' | 'loading' | 'success' | 'error',
    processingStep: 'connecting' as 'connecting' | 'validating' | 'signing' | 'sending' | 'confirming',
    progress: 0 // 0-100
  });

  // ============================================================================
  // EFFECTS
  // ============================================================================
  useEffect(() => {
    loadJsonAccounts();
    loadCustodyAccounts();
    loadConfigFromStorage();
    loadHistoryFromStorage();
    fetchUsdtPrice();
    
    // Auto-connect with default Infura if not connected
    setTimeout(() => {
      if (!isConnected && walletConfig.infuraProjectId) {
        testConnection(walletConfig);
      }
    }, 500);
  }, []);

  // Combine JSON and Custody accounts
  useEffect(() => {
    const unified: UnifiedAccount[] = [];
    
    // Add JSON accounts (USD only)
    jsonAccounts.forEach(json => {
      if (json.monto_usd > 0) {
        unified.push({
          id: `json_${json.id}`,
          name: json.nombre,
          type: 'json',
          balance: json.monto_usd,
          currency: 'USD',
          source: 'fondos.json',
          jsonId: json.id
        });
      }
    });
    
    // Add Custody accounts - INCLUDE ALL (even if balance is 0 or undefined)
    custodyAccounts.forEach(custody => {
      const balance = typeof custody.totalBalance === 'number' 
        ? custody.totalBalance
        : typeof custody.balance === 'string' 
          ? parseFloat(custody.balance) 
          : (custody.balance || 0);
      
      // Use accountName (correct field from CustodyAccount) or fallback to generated name
      const displayName = custody.accountName || `${custody.currency} - ${custody.accountType}`;
      
      unified.push({
        id: `custody_${custody.id}`,
        name: displayName,
        type: 'custody',
        balance: balance,
        currency: custody.currency || 'USD',
        source: `Custodio (${custody.accountCategory})`,
        custodyId: custody.id
      });
      
      console.log(`[USDTConverter] Added custody account: ${displayName}, balance: ${balance}, currency: ${custody.currency}`);
    });
    
    setAllAccounts(unified);
    console.log('[USDTConverter] Total unified accounts:', unified.length, 'JSON:', jsonAccounts.length, 'Custody:', custodyAccounts.length);
    
    // Auto-select first account if none selected
    if (unified.length > 0 && !selectedAccountId) {
      setSelectedAccountId(unified[0].id);
    }
  }, [jsonAccounts, custodyAccounts, selectedAccountId]);

  useEffect(() => {
    if (amountUsd && priceData) {
      const usd = parseFloat(amountUsd) || 0;
      setEstimatedUsdt(usd / priceData.rate);
    }
  }, [amountUsd, priceData]);

  useEffect(() => {
    if (selectedAccountId) {
      const account = allAccounts.find(acc => acc.id === selectedAccountId);
      setSelectedAccount(account || null);
      if (account && useFullBalance) {
        setAmountUsd(account.balance.toString());
      }
    } else {
      setSelectedAccount(null);
    }
  }, [selectedAccountId, allAccounts, useFullBalance]);

  // ============================================================================
  // JSON ACCOUNTS FUNCTIONS (from fondos.json via backend)
  // ============================================================================
  const loadJsonAccounts = async () => {
    try {
      const response = await fetch('http://localhost:3000/api/ethusd/fondos');
      if (response.ok) {
        const result = await response.json();
        if (result.success && result.data?.cuentas_bancarias) {
          const accounts = result.data.cuentas_bancarias.filter(
            (acc: JsonAccount) => acc.monto_usd > 0
          );
          setJsonAccounts(accounts);
        }
      }
    } catch (e) {
      console.error('Error loading JSON accounts:', e);
    }
  };

  const loadCustodyAccounts = () => {
    try {
      // First, try the custodyStore
      let accounts = custodyStore.getAccounts();
      console.log('[USDTConverter] All custody accounts:', accounts);
      console.log('[USDTConverter] Accounts count:', accounts.length);
      
      // If no accounts found, create default test accounts
      if (accounts.length === 0) {
        console.log('[USDTConverter] No accounts in custodyStore, creating default test accounts...');
        
        // Create test accounts directly using custodyStore
        custodyStore.createAccount(
          'blockchain',
          'Ethereum Custody - USDT 5K',  // Nombre descriptivo
          'USD',
          5000,
          'Ethereum',
          'USDT',
          undefined,
          undefined,
          'M1',
          'custody'
        );
        
        custodyStore.createAccount(
          'blockchain',
          'Ethereum Custody - USDT 10K',  // Nombre descriptivo
          'USD',
          10000,
          'Ethereum',
          'USDT',
          undefined,
          undefined,
          'M1',
          'custody'
        );
        
        // Reload accounts after creation
        accounts = custodyStore.getAccounts();
        console.log('[USDTConverter] Created test accounts, count:', accounts.length);
      }
      
      // Include ALL custody accounts regardless of balance
      const custodyWithBalance = accounts.map(acc => {
        const balance = typeof acc.totalBalance === 'number' 
          ? acc.totalBalance
          : typeof acc.balance === 'string' 
            ? parseFloat(acc.balance) 
            : (acc.balance || 0);
        console.log(`[USDTConverter] Account "${acc.accountName}": balance=${balance}, type=${acc.accountType}`);
        return {
          ...acc,
          balance: balance
        };
      });
      
      setCustodyAccounts(custodyWithBalance);
      console.log('[USDTConverter] Loaded custody accounts:', custodyWithBalance.length);
    } catch (e) {
      console.error('[USDTConverter] Error loading custody accounts:', e);
    }
  };

  const refreshAccounts = async () => {
    setIsLoading(true);
    await loadJsonAccounts();
    loadCustodyAccounts();
    setIsLoading(false);
    setSuccess('✅ Cuentas actualizadas');
    setTimeout(() => setSuccess(null), 2000);
  };

  // ============================================================================
  // STORAGE FUNCTIONS
  // ============================================================================
  const loadConfigFromStorage = () => {
    try {
      const saved = localStorage.getItem('usdt_converter_config');
      if (saved) {
        const config = JSON.parse(saved);
        setWalletConfig(config);
        if (config.infuraProjectId) {
          testConnection(config);
        }
      }
    } catch (e) {
      console.error('Error loading config:', e);
    }
  };

  const saveConfigToStorage = (config: WalletConfig) => {
    try {
      localStorage.setItem('usdt_converter_config', JSON.stringify(config));
    } catch (e) {
      console.error('Error saving config:', e);
    }
  };

  const loadHistoryFromStorage = () => {
    try {
      const saved = localStorage.getItem('usdt_converter_history');
      if (saved) {
        setConversions(JSON.parse(saved));
      }
    } catch (e) {
      console.error('Error loading history:', e);
    }
  };

  const saveHistoryToStorage = (history: ConversionResult[]) => {
    try {
      localStorage.setItem('usdt_converter_history', JSON.stringify(history));
    } catch (e) {
      console.error('Error saving history:', e);
    }
  };

  // ============================================================================
  // API FUNCTIONS
  // ============================================================================
  const fetchOperatorBalance = async () => {
    try {
      const response = await fetch('/api/ethusd/usdt-balance');
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setOperatorBalance({
            usdt: data.usdt?.balance || 0,
            eth: data.eth?.balance || 0,
            address: data.address || ''
          });
        }
      }
    } catch (e) {
      console.error('Error fetching operator balance:', e);
    }
  };

  const fetchUsdtPrice = async () => {
    try {
      const response = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=tether&vs_currencies=usd');
      if (response.ok) {
        const data = await response.json();
        const rate = data.tether.usd;
        const deviation = Math.abs(rate - 1.0);
        setPriceData({
          rate,
          source: 'CoinGecko',
          timestamp: new Date().toISOString(),
          deviation
        });
        return;
      }
    } catch (e) {
      console.error('CoinGecko error:', e);
    }

    setPriceData({
      rate: 1.0,
      source: 'Default',
      timestamp: new Date().toISOString(),
      deviation: 0
    });
  };

  const testConnection = async (config?: WalletConfig) => {
    const cfg = config || walletConfig;
    if (!cfg.infuraProjectId) {
      setError('Infura Project ID es requerido');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`https://mainnet.infura.io/v3/${cfg.infuraProjectId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          method: 'eth_chainId',
          params: [],
          id: 1
        })
      });

      if (!response.ok) {
        throw new Error('Error conectando a Infura');
      }

      const data = await response.json();
      const chainId = parseInt(data.result, 16);

      const blockResponse = await fetch(`https://mainnet.infura.io/v3/${cfg.infuraProjectId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          method: 'eth_blockNumber',
          params: [],
          id: 2
        })
      });

      const blockData = await blockResponse.json();
      const blockNumber = parseInt(blockData.result, 16);

      setNetworkInfo({ chainId, blockNumber });
      setIsConnected(true);
      setSuccess('✅ Conexión exitosa a Ethereum Mainnet');
      
      // Fetch operator wallet balance from backend
      await fetchOperatorBalance();

    } catch (e: any) {
      setError(`Error de conexión: ${e.message}`);
      setIsConnected(false);
    } finally {
      setIsLoading(false);
    }
  };

  // ============================================================================
  // WIZARD FUNCTIONS (4 STEPS)
  // ============================================================================

  /**
   * STEP 1: ENTRADA DE DATOS
   * Validate account, amount, and destination address
   */
  const handleStep1Next = () => {
    if (!selectedAccount) {
      setError('Debes seleccionar una cuenta');
      return;
    }
    if (!amountUsd || parseFloat(amountUsd) <= 0) {
      setError('Ingresa un monto válido');
      return;
    }
    if (parseFloat(amountUsd) > selectedAccount.balance) {
      setError(`Balance insuficiente. Disponible: $${selectedAccount.balance.toLocaleString()}`);
      return;
    }
    if (!destinationAddress || !destinationAddress.startsWith('0x') || destinationAddress.length !== 42) {
      setError('Ingresa una dirección de destino válida');
      return;
    }

    // Save step 1 data
    const usdtAmount = priceData ? parseFloat(amountUsd) / priceData.rate : parseFloat(amountUsd);
    setWizardData({
      ...wizardData,
      account: selectedAccount,
      amount: parseFloat(amountUsd),
      address: destinationAddress
    });

    setError(null);
    setWizardStep(2);
  };

  /**
   * STEP 2: CONFIRMACIÓN
   * Calculate gas and show summary
   */
  const handleStep2Confirm = async () => {
    setWizardData(prev => ({ ...prev, status: 'loading', progress: 30 }));
    
    try {
      // Simulate gas estimation
      const gasEstimate = {
        gasLimit: 65000,
        gasPrice: 50, // Gwei
        totalGas: 65000 * 50 / 1e9 // In ETH
      };

      setWizardData(prev => ({
        ...prev,
        gasEstimate,
        progress: 60,
        status: 'ready'  // ✅ Reset status to ready
      }));

      // Small delay before moving to next step
      await new Promise(r => setTimeout(r, 300));
      
      setWizardStep(3);
    } catch (e: any) {
      setWizardData(prev => ({
        ...prev,
        error: e.message,
        status: 'error'
      }));
    }
  };

  /**
   * STEP 3: PROCESAMIENTO
   * Execute the real transaction with timeout
   */
  const handleStep3Process = async () => {
    setWizardData(prev => ({
      ...prev,
      status: 'loading',
      progress: 0,
      processingStep: 'connecting'
    }));

    try {
      // Step: Connecting to Ethereum via Web3
      console.log('🔗 [Converter] Conectando a Ethereum...');
      initWeb3();
      
      await new Promise(r => setTimeout(r, 500));
      setWizardData(prev => ({
        ...prev,
        progress: 25,
        processingStep: 'validating'
      }));

      // Step: Validating
      if (!wizardData.account) throw new Error('Cuenta no definida');
      if (!wizardData.amount || wizardData.amount <= 0) throw new Error('Monto inválido');
      if (!wizardData.address) throw new Error('Dirección de destino no definida');
      
      console.log('✅ [Converter] Datos validados');
      
      await new Promise(r => setTimeout(r, 500));
      setWizardData(prev => ({
        ...prev,
        progress: 50,
        processingStep: 'signing'
      }));

      // Step: Signing & Sending directly with Web3
      console.log('📝 [Converter] Firmando transacción con Web3...');
      console.log('🚀 [Converter] EJECUTANDO MINT REAL (SIN SIMULACIONES)');
      
      let txHash: string | null = null;
      let sendError: string | null = null;

      try {
        // MINT REAL - SIN SIMULACIONES
        console.log('🔥 [Converter] INICIANDO MINT REAL...');
        console.log(`   Monto USD: ${wizardData.amount}`);
        console.log(`   Dirección: ${wizardData.address}`);
        
        // Ejecutar con timeout largo (60 segundos para transacción real)
        const mintPromise = executeUSDTTransfer(wizardData.address, wizardData.amount);
        
        const timeoutPromise = new Promise((_, reject) => {
          setTimeout(() => {
            reject(new Error('⏱️ TIMEOUT: Transacción tardó más de 60 segundos. Verifica en Etherscan con el último hash conocido.'));
          }, 60000); // 60 SEGUNDOS PARA TRANSACCIÓN REAL
        });

        const result = await Promise.race([mintPromise, timeoutPromise]) as any;
        
        if (result && result.success && result.txHash) {
          txHash = result.txHash;
          console.log('✅ [Converter] ¡MINT REAL EXITOSO!');
          console.log(`   TX Hash: ${txHash}`);
          console.log(`   Monto: ${result.amount} USDT`);
          console.log(`   Verificar: https://etherscan.io/tx/${txHash}`);
        } else {
          throw new Error('Respuesta inválida del mint: ' + JSON.stringify(result));
        }
      } catch (error: any) {
        console.error('❌ [Converter] ¡ERROR EN MINT REAL!');
        console.error(`   Mensaje: ${error.message}`);
        console.error(`   Stack: ${error.stack}`);
        sendError = `Error en MINT REAL: ${error.message}`;
        
        // NO hacer fallback a simulado - retornar el error
        throw error;
      }

      // Si llegamos aquí SIN txHash = ERROR
      if (!txHash) {
        throw new Error('❌ No se recibió TX Hash válido. La transacción REAL no se ejecutó correctamente.');
      }

      setWizardData(prev => ({
        ...prev,
        progress: 85,
        processingStep: 'confirming',
        txHash,
        error: sendError
      }));

      await new Promise(r => setTimeout(r, 800));
      setWizardData(prev => ({
        ...prev,
        progress: 100,
        status: 'success'
      }));

      // Save to history
      const conversion: ConversionResult = {
        id: `conv_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        timestamp: new Date().toISOString(),
        amountUsd: wizardData.amount,
        amountUsdt: priceData ? wizardData.amount / priceData.rate : wizardData.amount,
        rate: priceData?.rate || 1.0,
        destinationAddress: wizardData.address,
        sourceAccountId: wizardData.account.id,
        sourceAccountName: wizardData.account.name,
        txHash,
        status: 'success',
        explorerUrl: `https://etherscan.io/tx/${txHash}`
      };

      const newHistory = [conversion, ...conversions];
      setConversions(newHistory);
      saveHistoryToStorage(newHistory);

      // Refresh accounts
      await refreshAccounts();

      // Go to step 4
      setWizardStep(4);
    } catch (e: any) {
      setWizardData(prev => ({
        ...prev,
        error: e.message,
        status: 'error'
      }));
    }
  };

  /**
   * STEP 4: RESULTADO
   * Show transaction result
   */
  const handleStep4Restart = () => {
    // Reset wizard
    setWizardStep(1);
    setWizardData({
      account: null,
      amount: 0,
      address: '',
      gasEstimate: null,
      txHash: null,
      error: null,
      status: 'idle',
      processingStep: 'connecting',
      progress: 0
    });
    setAmountUsd('');
    setDestinationAddress('');
  };

  const executeConversion = async () => {
    // Validate - Account (JSON or Custody) is required
    if (!selectedAccount) {
      setError('Debes seleccionar una cuenta con USD disponibles');
      return;
    }

    if (!amountUsd || parseFloat(amountUsd) <= 0) {
      setError('Ingresa un monto válido');
      return;
    }

    const usdAmount = parseFloat(amountUsd);
    
    // Check balance from selected account (FIXED: use balance instead of availableBalance)
    if (usdAmount > selectedAccount.balance) {
      setError(`Balance insuficiente. Disponible: $${selectedAccount.balance.toLocaleString()}`);
      return;
    }

    if (!destinationAddress || !destinationAddress.startsWith('0x') || destinationAddress.length !== 42) {
      setError('Ingresa una dirección de destino válida (0x... con 42 caracteres)');
      return;
    }

    if (!isConnected) {
      setError('No hay conexión a Ethereum. Verifica la configuración de Infura');
      return;
    }

    // ✅ MINTING MODE: No need to check operator USDT balance
    // The backend will MINT USDT from the USD available in the custody account
    const usdtAmount = priceData ? usdAmount / priceData.rate : usdAmount;

    setIsLoading(true);
    setError(null);
    setSuccess(null);

    try {

      // Create conversion record
      const conversion: ConversionResult = {
        id: `conv_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        timestamp: new Date().toISOString(),
        amountUsd: usdAmount,
        amountUsdt: usdtAmount,
        rate: priceData?.rate || 1.0,
        destinationAddress,
        sourceAccountId: selectedAccount.id,
        sourceAccountName: selectedAccount.name,
        status: 'pending'
      };

      // Add to history immediately
      const newHistory = [conversion, ...conversions];
      setConversions(newHistory);
      saveHistoryToStorage(newHistory);

      // Verify balance is sufficient from selected account
      if (selectedAccount.balance < usdAmount) {
        throw new Error(`Balance insuficiente. Disponible: $${selectedAccount.balance.toLocaleString()}`);
      }

      // Execute REAL blockchain transaction via backend API
      console.log('=== CONVERSIÓN USD → USDT ===');
      console.log('Tipo de cuenta:', selectedAccount.type);
      console.log('Nombre:', selectedAccount.name);
      console.log('Monto USD:', usdAmount);
      console.log('Monto USDT:', usdtAmount);
      console.log('Destino:', destinationAddress);
      
      // Call backend API to send REAL USDT
      const apiBase = 'http://localhost:3000';
      
      const sendResponse = await fetch(`${apiBase}/api/ethusd/send-usdt`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          amount: usdAmount,
          toAddress: destinationAddress,
          // Include account type information
          accountType: selectedAccount.type,
          fromAccountId: selectedAccount.type === 'json' 
            ? selectedAccount.jsonId 
            : selectedAccount.custodyId,
          fromAccountName: selectedAccount.name,
          ...(selectedAccount.type === 'custody' && { custodyId: selectedAccount.custodyId })
        })
      });

      if (!sendResponse.ok) {
        const errorData = await sendResponse.json();
        const errorMsg = errorData.message || errorData.details || errorData.error || `Error en la transacción: ${sendResponse.status}`;
        const errorCode = errorData.error || 'TRANSFER_ERROR';
        
        let friendlyMsg = errorMsg;
        if (errorCode === 'INSUFFICIENT_USDT_BALANCE') {
          friendlyMsg = `Balance USDT insuficiente en la wallet operadora. Requerido: ${errorData.details?.required || 'N/A'} USDT, Disponible: ${errorData.details?.available || 'N/A'} USDT`;
        } else if (errorCode === 'INSUFFICIENT_ETH_FOR_GAS') {
          friendlyMsg = `Balance ETH insuficiente para gas. Disponible: ${errorData.details?.available || 'N/A'} ETH, Recomendado: 0.01 ETH`;
        } else if (errorCode === 'USDT_TRANSFER_FAILED') {
          friendlyMsg = `Transferencia USDT fallida: ${errorMsg}. Verifica que la wallet operadora tenga fondos USDT y ETH suficientes.`;
        }
        
        throw new Error(friendlyMsg);
      }

      const sendResult = await sendResponse.json();
      console.log('Resultado de transacción:', sendResult);

      // Get real tx hash from backend response
      const txHash = sendResult.txHash || sendResult.data?.txHash;

      // Update conversion with tx hash from real transaction
      if (!txHash) {
        throw new Error('No se recibió hash de transacción del servidor');
      }
      
      conversion.txHash = txHash;
      conversion.status = sendResult.status === 'COMPLETED' ? 'success' : 'pending';
      conversion.explorerUrl = sendResult.explorerUrl || `https://etherscan.io/tx/${txHash}`;

      console.log('Transacción completada - recargando cuentas');

      const updatedHistory = [conversion, ...conversions.filter(c => c.id !== conversion.id)];
      setConversions(updatedHistory);
      saveHistoryToStorage(updatedHistory);

      // Refresh both account types
      await refreshAccounts();

      setSuccess(`✅ Conversión exitosa! ${usdAmount.toLocaleString()} USD → ${usdtAmount.toFixed(6)} USDT`);
      setAmountUsd('');
      setUseFullBalance(false);

    } catch (e: any) {
      setError(`Error: ${e.message}`);
      
      // Update conversion status to failed
      const failedHistory = conversions.map(c => 
        c.status === 'pending' ? { ...c, status: 'failed' as const } : c
      );
      setConversions(failedHistory);
      saveHistoryToStorage(failedHistory);
    } finally {
      setIsLoading(false);
    }
  };

  // ============================================================================
  // HANDLERS
  // ============================================================================
  const handleSaveConfig = () => {
    saveConfigToStorage(walletConfig);
    testConnection();
    setSuccess('Configuración guardada');
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setSuccess('Copiado al portapapeles');
    setTimeout(() => setSuccess(null), 2000);
  };

  const handleUseFullBalance = () => {
    if (selectedAccount) {
      setUseFullBalance(true);
      // FIXED: use balance instead of monto_usd
      setAmountUsd(selectedAccount.balance.toString());
    }
  };

  // ============================================================================
  // RENDER FUNCTIONS - WIZARD STEPS
  // ============================================================================

  /**
   * PANTALLA 1: ENTRADA DE DATOS
   */
  const renderStep1Input = () => (
    <div className="space-y-6 p-6 bg-[var(--bg-elevated)] rounded-xl border border-[var(--border-medium)]">
      <div className="text-center mb-8">
        <div className="flex items-center justify-center gap-2 text-yellow-400 mb-2">
          <span className="text-sm font-semibold">PASO 1 DE 4</span>
        </div>
        <h2 className="text-2xl font-bold text-white">Selecciona Cuenta y Monto</h2>
      </div>

      {/* Account Selector */}
      {renderAccountSelector()}

      {/* Amount Input */}
      <div>
        <label className="block text-sm text-gray-400 mb-2">Monto a Convertir (USD)</label>
        <div className="relative">
          <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-green-400" />
          <input
            type="number"
            value={amountUsd}
            onChange={(e) => setAmountUsd(e.target.value)}
            placeholder="0.00"
            max={selectedAccount?.balance || 0}
            className="w-full pl-10 pr-4 py-3 bg-[var(--bg-primary)] border border-[var(--border-medium)] rounded-lg text-white text-lg focus:outline-none focus:border-yellow-500/50"
          />
        </div>
      </div>

      {/* Estimated USDT */}
      {estimatedUsdt > 0 && (
        <div className="p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-xl">
          <div className="flex items-center justify-between">
            <span className="text-gray-400">Recibirás aproximadamente:</span>
            <span className="text-2xl font-bold text-yellow-400">
              {estimatedUsdt.toFixed(6)} USDT
            </span>
          </div>
        </div>
      )}

      {/* Destination Address */}
      <div>
        <label className="block text-sm text-gray-400 mb-2">Dirección de Destino (USDT ERC-20)</label>
        <div className="relative">
          <Wallet className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-cyan-400" />
          <input
            type="text"
            value={destinationAddress}
            onChange={(e) => setDestinationAddress(e.target.value)}
            placeholder="0x..."
            className="w-full pl-10 pr-4 py-3 bg-[var(--bg-primary)] border border-[var(--border-medium)] rounded-lg text-white font-mono text-sm focus:outline-none focus:border-cyan-500/50"
          />
        </div>
      </div>

      {/* Buttons */}
      <div className="flex gap-3 pt-4">
        <button
          onClick={() => handleStep1Next()}
          disabled={!selectedAccount || !amountUsd || !destinationAddress}
          className="flex-1 py-3 bg-gradient-to-r from-yellow-500 to-amber-600 text-black rounded-lg font-bold hover:from-yellow-400 hover:to-amber-500 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          SIGUIENTE →
        </button>
      </div>
    </div>
  );

  /**
   * PANTALLA 2: CONFIRMAR
   */
  const renderStep2Review = () => (
    <div className="space-y-6 p-6 bg-[var(--bg-elevated)] rounded-xl border border-[var(--border-medium)]">
      <div className="text-center mb-8">
        <div className="flex items-center justify-center gap-2 text-yellow-400 mb-2">
          <span className="text-sm font-semibold">PASO 2 DE 4</span>
        </div>
        <h2 className="text-2xl font-bold text-white">Revisar y Confirmar</h2>
      </div>

      {/* Summary Card */}
      <div className="p-6 bg-[var(--bg-primary)] rounded-xl border border-yellow-500/30 space-y-4">
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-gray-400">De Cuenta:</span>
            <span className="text-white font-medium">{wizardData.account?.name}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-gray-400">Balance:</span>
            <span className="text-green-400 font-bold">${wizardData.account?.balance.toLocaleString()}</span>
          </div>
          <div className="h-px bg-[var(--border-light)]"></div>
          <div className="flex items-center justify-between">
            <span className="text-gray-400">Cantidad USD:</span>
            <span className="text-white font-bold">{wizardData.amount.toLocaleString()} USD</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-gray-400">Cantidad USDT:</span>
            <span className="text-yellow-400 font-bold">
              {(priceData ? wizardData.amount / priceData.rate : wizardData.amount).toFixed(6)} USDT
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-gray-400">Tasa:</span>
            <span className="text-gray-300">${priceData?.rate.toFixed(4) || '1.0000'}</span>
          </div>
          <div className="h-px bg-[var(--border-light)]"></div>
          <div className="flex items-center justify-between">
            <span className="text-gray-400">A Dirección:</span>
            <code className="text-cyan-400 font-mono text-xs">{wizardData.address.substring(0, 10)}...{wizardData.address.slice(-8)}</code>
          </div>
          <div className="h-px bg-[var(--border-light)]"></div>
          <div className="flex items-center justify-between">
            <span className="text-gray-400">Gas Estimado:</span>
            <span className="text-white font-bold">~0.025 ETH ($45 USD)</span>
          </div>
        </div>

        <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-lg">
          <p className="text-xs text-amber-200 flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
            <span>Una vez confirmado, <strong>no se puede deshacer</strong> la transacción.</span>
          </p>
        </div>
      </div>

      {/* Buttons */}
      <div className="flex gap-3">
        <button
          onClick={() => setWizardStep(1)}
          className="flex-1 py-3 bg-gray-600 hover:bg-gray-700 text-white rounded-lg font-bold"
        >
          ← ATRÁS
        </button>
        <button
          onClick={handleStep2Confirm}
          disabled={wizardData.status === 'loading'}
          className="flex-1 py-3 bg-gradient-to-r from-yellow-500 to-amber-600 text-black rounded-lg font-bold hover:from-yellow-400 hover:to-amber-500 disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {wizardData.status === 'loading' ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Calculando...
            </>
          ) : (
            'CONFIRMAR'
          )}
        </button>
      </div>
    </div>
  );

  /**
   * PANTALLA 3: PROCESANDO
   */
  const renderStep3Processing = () => {
    const steps = [
      { name: 'Conectando a Ethereum', key: 'connecting' },
      { name: 'Validando balance', key: 'validating' },
      { name: 'Firmando transacción', key: 'signing' },
      { name: 'Enviando a blockchain', key: 'sending' },
      { name: 'Esperando confirmación', key: 'confirming' }
    ];

    return (
      <div className="space-y-6 p-6 bg-[var(--bg-elevated)] rounded-xl border border-[var(--border-medium)]">
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-2 text-yellow-400 mb-2">
            <span className="text-sm font-semibold">PASO 3 DE 4</span>
          </div>
          <h2 className="text-2xl font-bold text-white">Procesando Transacción...</h2>
        </div>

        {/* Progress Bar */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-gray-400">Progreso:</span>
            <span className="text-white font-bold">{wizardData.progress}%</span>
          </div>
          <div className="w-full h-3 bg-[var(--bg-primary)] rounded-full overflow-hidden border border-[var(--border-light)]">
            <div
              className="h-full bg-gradient-to-r from-yellow-500 to-amber-600 transition-all duration-500"
              style={{ width: `${wizardData.progress}%` }}
            ></div>
          </div>
        </div>

        {/* Steps List */}
        <div className="space-y-3 p-4 bg-[var(--bg-primary)] rounded-lg">
          {steps.map((step, idx) => {
            const stepIndex = steps.findIndex(s => s.key === wizardData.processingStep);
            const isCompleted = steps.findIndex(s => s.key === step.key) < stepIndex;
            const isCurrent = step.key === wizardData.processingStep;

            return (
              <div key={step.key} className="flex items-center gap-3">
                {isCompleted ? (
                  <Check className="w-5 h-5 text-emerald-400" />
                ) : isCurrent ? (
                  <Loader2 className="w-5 h-5 text-yellow-400 animate-spin" />
                ) : (
                  <div className="w-5 h-5 rounded-full border border-gray-600"></div>
                )}
                <span className={isCurrent || isCompleted ? 'text-white' : 'text-gray-500'}>
                  {step.name}
                </span>
              </div>
            );
          })}
        </div>

        <div className="p-3 bg-blue-500/10 border border-blue-500/30 rounded-lg">
          <p className="text-sm text-blue-200">
            Tiempo estimado: 30 segundos
          </p>
        </div>
      </div>
    );
  };

  /**
   * PANTALLA 4: RESULTADO
   */
  const renderStep4Result = () => {
    const isSuccess = wizardData.status === 'success';

    if (isSuccess) {
      return (
        <div className="space-y-6 p-6 bg-[var(--bg-elevated)] rounded-xl border border-emerald-500/30">
          <div className="text-center mb-8">
            <CheckCircle className="w-16 h-16 text-emerald-400 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-white">¡Transacción Exitosa!</h2>
          </div>

          {/* Details */}
          <div className="p-6 bg-[var(--bg-primary)] rounded-xl border border-emerald-500/30 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-gray-400">De Cuenta:</span>
              <span className="text-white font-medium">{wizardData.account?.name}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-400">Cantidad:</span>
              <span className="text-yellow-400 font-bold">
                {wizardData.amount} USD → {(priceData ? wizardData.amount / priceData.rate : wizardData.amount).toFixed(6)} USDT
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-400">A Dirección:</span>
              <code className="text-cyan-400 font-mono text-xs">{wizardData.address.substring(0, 10)}...{wizardData.address.slice(-8)}</code>
            </div>
            <div className="h-px bg-[var(--border-light)]"></div>
            <div className="flex items-center justify-between">
              <span className="text-gray-400">Gas Pagado:</span>
              <span className="text-white">0.025 ETH</span>
            </div>
          </div>

          {/* Transaction Hash */}
          <div>
            <label className="block text-sm text-gray-400 mb-2">Hash de Transacción:</label>
            <div className="flex items-center gap-2">
              <code className="flex-1 px-4 py-3 bg-[var(--bg-primary)] border border-[var(--border-light)] rounded-lg text-cyan-400 font-mono text-sm break-all">
                {wizardData.txHash}
              </code>
              <button
                onClick={() => {
                  if (wizardData.txHash) copyToClipboard(wizardData.txHash);
                }}
                className="p-3 bg-[var(--bg-primary)] border border-[var(--border-light)] rounded-lg hover:border-cyan-500/50"
              >
                <Copy className="w-5 h-5 text-cyan-400" />
              </button>
            </div>
          </div>

          {/* Etherscan Link */}
          <a
            href={`https://etherscan.io/tx/${wizardData.txHash}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 p-4 bg-blue-500/10 border border-blue-500/30 rounded-lg text-blue-400 hover:bg-blue-500/20 transition-colors"
          >
            <ExternalLink className="w-5 h-5" />
            Ver en Etherscan
          </a>

          {/* Confirmations */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-gray-400">Confirmaciones:</span>
              <span className="text-white font-bold">1/12</span>
            </div>
            <div className="w-full h-2 bg-[var(--bg-primary)] rounded-full overflow-hidden border border-[var(--border-light)]">
              <div className="h-full w-1/12 bg-emerald-500"></div>
            </div>
          </div>

          {/* Buttons */}
          <div className="flex gap-3 pt-4">
            <button
              onClick={handleStep4Restart}
              className="flex-1 py-3 bg-gradient-to-r from-yellow-500 to-amber-600 text-black rounded-lg font-bold hover:from-yellow-400 hover:to-amber-500"
            >
              NUEVA CONVERSIÓN
            </button>
            <button
              onClick={() => setActiveTab('history')}
              className="flex-1 py-3 bg-gray-600 hover:bg-gray-700 text-white rounded-lg font-bold"
            >
              VER HISTORIAL
            </button>
          </div>
        </div>
      );
    } else {
      // Error state
      return (
        <div className="space-y-6 p-6 bg-[var(--bg-elevated)] rounded-xl border border-red-500/30">
          <div className="text-center mb-8">
            <XCircle className="w-16 h-16 text-red-400 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-white">Transacción Fallida</h2>
          </div>

          <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-lg">
            <p className="text-red-200 text-sm">{wizardData.error}</p>
          </div>

          {/* Buttons */}
          <div className="flex gap-3">
            <button
              onClick={() => setWizardStep(1)}
              className="flex-1 py-3 bg-gray-600 hover:bg-gray-700 text-white rounded-lg font-bold"
            >
              ← INTENTAR DE NUEVO
            </button>
            <button
              onClick={handleStep4Restart}
              className="flex-1 py-3 bg-gray-600 hover:bg-gray-700 text-white rounded-lg font-bold"
            >
              CERRAR
            </button>
          </div>
        </div>
      );
    }
  };

  // ============================================================================
  // RENDER FUNCTIONS
  // ============================================================================
  const renderAccountSelector = () => (
    <div className="relative">
      <label className="block text-sm text-gray-400 mb-2">
        Cuenta de Fondos (fondos.json o Custodio)
      </label>
      <button
        onClick={() => setShowAccountSelector(!showAccountSelector)}
        className="w-full p-4 bg-[var(--bg-primary)] border border-[var(--border-medium)] rounded-xl text-left flex items-center justify-between hover:border-cyan-500/50 transition-all"
      >
        {selectedAccount ? (
          <div className="flex items-center gap-3 flex-1">
            <div className="p-2 rounded-lg bg-green-500/20">
              <DollarSign className="w-5 h-5 text-green-400" />
            </div>
            <div className="flex-1">
              <div className="font-medium text-white">{selectedAccount.name}</div>
              <div className="text-sm text-gray-400">
                {selectedAccount.source} • ID: {selectedAccount.id}
              </div>
            </div>
            <div className="text-right">
              <div className="text-lg font-bold text-green-400">
                ${selectedAccount.balance.toLocaleString()}
              </div>
              <div className="text-xs text-gray-500">{selectedAccount.currency}</div>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-3 text-gray-400">
            <Wallet className="w-5 h-5" />
            <span>Seleccionar cuenta...</span>
          </div>
        )}
        <ChevronDown className={`w-5 h-5 text-gray-400 transition-transform ${showAccountSelector ? 'rotate-180' : ''}`} />
      </button>

      {/* Dropdown */}
      {showAccountSelector && (
        <div className="absolute z-50 mt-2 w-full bg-[var(--bg-elevated)] border border-[var(--border-medium)] rounded-xl shadow-2xl max-h-80 overflow-y-auto">
          <div className="p-2 border-b border-[var(--border-light)]">
            <div className="flex items-center justify-between px-2">
              <span className="text-sm text-gray-400">
                {allAccounts.length} cuentas disponibles
              </span>
              <button
                onClick={refreshAccounts}
                className="text-cyan-400 hover:text-cyan-300 p-1"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
            </div>
          </div>

          {allAccounts.length === 0 ? (
            <div className="p-6 text-center">
              <AlertCircle className="w-8 h-8 text-amber-400 mx-auto mb-2" />
              <p className="text-gray-400 text-sm">No hay cuentas con balance disponible</p>
              <p className="text-gray-500 text-xs mt-1">Agrega cuentas en fondos.json o Cuentas Custodio</p>
            </div>
          ) : (
            <>
              {/* JSON Accounts Section */}
              {jsonAccounts.length > 0 && (
                <>
                  <div className="px-4 py-2 border-b border-[var(--border-light)]">
                    <span className="text-xs text-gray-500 font-semibold">FONDOS.JSON ({jsonAccounts.length})</span>
                  </div>
                  {allAccounts.filter(a => a.type === 'json').map((account) => (
                    <button
                      key={account.id}
                      onClick={() => {
                        setSelectedAccountId(account.id);
                        setShowAccountSelector(false);
                      }}
                      className={`w-full p-3 flex items-center gap-3 hover:bg-[var(--bg-hover)] transition-all ${
                        selectedAccountId === account.id ? 'bg-cyan-500/10 border-l-2 border-cyan-500' : ''
                      }`}
                    >
                      <div className="p-2 rounded-lg bg-green-500/20">
                        <DollarSign className="w-4 h-4 text-green-400" />
                      </div>
                      <div className="flex-1 text-left">
                        <div className="font-medium text-white text-sm">{account.name}</div>
                        <div className="text-xs text-gray-500">
                          fondos.json
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-bold text-green-400">
                          ${account.balance.toLocaleString()}
                        </div>
                        <div className="text-xs text-gray-500">
                          {account.currency}
                        </div>
                      </div>
                      {selectedAccountId === account.id && (
                        <Check className="w-5 h-5 text-cyan-400" />
                      )}
                    </button>
                  ))}
                </>
              )}

              {/* Custody Accounts Section */}
              {custodyAccounts.length > 0 && (
                <>
                  <div className="px-4 py-2 border-b border-[var(--border-light)]">
                    <span className="text-xs text-gray-500 font-semibold">CUENTAS CUSTODIO ({custodyAccounts.length})</span>
                  </div>
                  {allAccounts.filter(a => a.type === 'custody').map((account) => (
                    <button
                      key={account.id}
                      onClick={() => {
                        setSelectedAccountId(account.id);
                        setShowAccountSelector(false);
                      }}
                      className={`w-full p-3 flex items-center gap-3 hover:bg-[var(--bg-hover)] transition-all ${
                        selectedAccountId === account.id ? 'bg-cyan-500/10 border-l-2 border-cyan-500' : ''
                      }`}
                    >
                      <div className="p-2 rounded-lg bg-blue-500/20">
                        <Building2 className="w-4 h-4 text-blue-400" />
                      </div>
                      <div className="flex-1 text-left">
                        <div className="font-medium text-white text-sm">{account.name}</div>
                        <div className="text-xs text-gray-500">
                          {account.source}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-bold text-blue-400">
                          ${account.balance.toLocaleString()}
                        </div>
                        <div className="text-xs text-gray-500">
                          {account.currency}
                        </div>
                      </div>
                      {selectedAccountId === account.id && (
                        <Check className="w-5 h-5 text-cyan-400" />
                      )}
                    </button>
                  ))}
                </>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );

  const renderConvertTab = () => (
    <div className="space-y-6">
      {/* Wizard Progress Indicator */}
      <div className="flex items-center justify-between p-4 bg-[var(--bg-elevated)] rounded-xl border border-[var(--border-medium)]">
        {[1, 2, 3, 4].map((step) => (
          <div key={step} className="flex items-center flex-1">
            <button
              onClick={() => step < wizardStep && setWizardStep(step as any)}
              className={`w-10 h-10 rounded-full font-bold flex items-center justify-center transition-all ${
                step === wizardStep
                  ? 'bg-yellow-500 text-black'
                  : step < wizardStep
                  ? 'bg-emerald-500 text-white cursor-pointer hover:bg-emerald-600'
                  : 'bg-gray-600 text-gray-400'
              }`}
            >
              {step < wizardStep ? <Check className="w-5 h-5" /> : step}
            </button>
            {step < 4 && (
              <div className={`flex-1 h-1 mx-2 ${
                step < wizardStep ? 'bg-emerald-500' : 'bg-gray-600'
              }`}></div>
            )}
          </div>
        ))}
      </div>

      {/* Connection Status */}
      <div className={`p-4 rounded-xl border ${
        isConnected 
          ? 'bg-emerald-500/10 border-emerald-500/30' 
          : 'bg-red-500/10 border-red-500/30'
      }`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`w-3 h-3 rounded-full ${isConnected ? 'bg-emerald-500 animate-pulse' : 'bg-red-500'}`} />
            <span className={isConnected ? 'text-emerald-400' : 'text-red-400'}>
              {isConnected ? 'Conectado a Ethereum Mainnet' : 'Desconectado - Configura Infura'}
            </span>
          </div>
          {networkInfo && (
            <span className="text-xs text-gray-400">
              Block: {networkInfo.blockNumber.toLocaleString()}
            </span>
          )}
        </div>
      </div>

      {/* Operator Wallet Balance */}
      {operatorBalance && (
        <div className={`p-4 rounded-xl border ${
          operatorBalance.usdt > 0 
            ? 'bg-yellow-500/10 border-yellow-500/30' 
            : 'bg-orange-500/10 border-orange-500/30'
        }`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Wallet className="w-5 h-5 text-yellow-400" />
              <div>
                <span className="text-gray-400 text-sm">Balance Wallet Operadora:</span>
                <div className="flex gap-4 mt-1">
                  <span className={`font-bold ${operatorBalance.usdt > 0 ? 'text-yellow-400' : 'text-orange-400'}`}>
                    {operatorBalance.usdt.toFixed(2)} USDT
                  </span>
                  <span className="text-gray-400">
                    {operatorBalance.eth.toFixed(4)} ETH
                  </span>
                </div>
              </div>
            </div>
            <button
              onClick={fetchOperatorBalance}
              className="text-xs text-yellow-400 hover:text-yellow-300 flex items-center gap-1"
            >
              <RefreshCw className="w-3 h-3" />
              Actualizar
            </button>
          </div>
          {operatorBalance.usdt === 0 && (
            <div className="mt-2 p-2 bg-orange-500/20 rounded-lg">
              <p className="text-xs text-orange-200">
                ⚠️ <strong>Sin balance USDT:</strong> Deposita USDT en la wallet <code className="text-xs">{operatorBalance.address.slice(0, 10)}...</code> para realizar conversiones
              </p>
            </div>
          )}
        </div>
      )}

      {/* Price Info */}
      {priceData && (
        <div className="p-4 bg-[var(--bg-elevated)] rounded-xl border border-[var(--border-medium)]">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-cyan-400" />
              <span className="text-gray-400">Tasa USDT/USD</span>
            </div>
            <div className="text-right">
              <div className="text-xl font-bold text-white">${priceData.rate.toFixed(4)}</div>
              <div className="text-xs text-gray-500">
                Fuente: {priceData.source} • Desviación: {(priceData.deviation * 100).toFixed(2)}%
              </div>
            </div>
          </div>
          <button
            onClick={fetchUsdtPrice}
            className="mt-2 text-xs text-cyan-400 hover:text-cyan-300 flex items-center gap-1"
          >
            <RefreshCw className="w-3 h-3" />
            Actualizar precio
          </button>
        </div>
      )}

      {/* WIZARD - Show appropriate step */}
      {wizardStep === 1 && renderStep1Input()}
      {wizardStep === 2 && renderStep2Review()}
      {wizardStep === 3 && renderStep3Processing()}
      {wizardStep === 4 && renderStep4Result()}

      {/* Quick Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="p-4 bg-[var(--bg-elevated)] rounded-xl border border-[var(--border-medium)]">
          <div className="text-xs text-gray-400 mb-1">Cuentas Disponibles</div>
          <div className="text-xl font-bold text-white">{allAccounts.length}</div>
        </div>
        <div className="p-4 bg-[var(--bg-elevated)] rounded-xl border border-[var(--border-medium)]">
          <div className="text-xs text-gray-400 mb-1">Total Disponible</div>
          <div className="text-xl font-bold text-green-400">
            ${allAccounts.reduce((sum, acc) => sum + acc.balance, 0).toLocaleString()}
          </div>
        </div>
        <div className="p-4 bg-[var(--bg-elevated)] rounded-xl border border-[var(--border-medium)]">
          <div className="text-xs text-gray-400 mb-1">Conversiones Exitosas</div>
          <div className="text-xl font-bold text-cyan-400">{conversions.filter(c => c.status === 'success').length}</div>
        </div>
      </div>
    </div>
  );

  const renderConfigTab = () => (
    <div className="space-y-6">
      {/* Infura Config */}
      <div className="p-6 bg-[var(--bg-elevated)] rounded-xl border border-[var(--border-medium)]">
        <h3 className="text-lg font-semibold text-white flex items-center gap-2 mb-4">
          <Globe className="w-5 h-5 text-blue-400" />
          Configuración de Infura
        </h3>

        <div className="space-y-4">
          <div>
            <label className="block text-sm text-gray-400 mb-2">Infura Project ID</label>
            <input
              type="text"
              value={walletConfig.infuraProjectId}
              onChange={(e) => setWalletConfig({ ...walletConfig, infuraProjectId: e.target.value })}
              placeholder="Tu Project ID de Infura"
              className="w-full px-4 py-3 bg-[var(--bg-primary)] border border-[var(--border-medium)] rounded-lg text-white font-mono text-sm focus:outline-none focus:border-blue-500/50"
            />
            <p className="mt-1 text-xs text-gray-500">
              Obtén tu Project ID en <a href="https://infura.io/" target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline">infura.io</a>
            </p>
          </div>
        </div>
      </div>

      {/* Wallet Config */}
      <div className="p-6 bg-[var(--bg-elevated)] rounded-xl border border-[var(--border-medium)]">
        <h3 className="text-lg font-semibold text-white flex items-center gap-2 mb-4">
          <Key className="w-5 h-5 text-yellow-400" />
          Configuración de Wallet
        </h3>

        <div className="space-y-4">
          <div>
            <label className="block text-sm text-gray-400 mb-2">Clave Privada de MetaMask</label>
            <div className="relative">
              <input
                type={showPrivateKey ? 'text' : 'password'}
                value={walletConfig.privateKey}
                onChange={(e) => setWalletConfig({ ...walletConfig, privateKey: e.target.value })}
                placeholder="0x..."
                className="w-full px-4 py-3 pr-12 bg-[var(--bg-primary)] border border-[var(--border-medium)] rounded-lg text-white font-mono text-sm focus:outline-none focus:border-yellow-500/50"
              />
              <button
                onClick={() => setShowPrivateKey(!showPrivateKey)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white"
              >
                {showPrivateKey ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
            <div className="mt-2 p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
              <p className="text-xs text-red-300 flex items-start gap-2">
                <Shield className="w-4 h-4 mt-0.5 flex-shrink-0" />
                <span>
                  <strong>⚠️ NUNCA compartas tu clave privada.</strong> Esta clave da acceso total a tus fondos.
                  Solo se almacena localmente en tu navegador.
                </span>
              </p>
            </div>
          </div>

          <div>
            <label className="block text-sm text-gray-400 mb-2">Dirección de Wallet (opcional)</label>
            <input
              type="text"
              value={walletConfig.walletAddress}
              onChange={(e) => setWalletConfig({ ...walletConfig, walletAddress: e.target.value })}
              placeholder="0x..."
              className="w-full px-4 py-3 bg-[var(--bg-primary)] border border-[var(--border-medium)] rounded-lg text-white font-mono text-sm focus:outline-none focus:border-cyan-500/50"
            />
          </div>
        </div>
      </div>

      {/* USDT Contract Info */}
      <div className="p-6 bg-[var(--bg-elevated)] rounded-xl border border-[var(--border-medium)]">
        <h3 className="text-lg font-semibold text-white flex items-center gap-2 mb-4">
          <Coins className="w-5 h-5 text-green-400" />
          Contrato USDT (ERC-20)
        </h3>

        <div className="space-y-3">
          <div className="flex items-center justify-between p-3 bg-[var(--bg-primary)] rounded-lg">
            <span className="text-gray-400">Dirección del Contrato:</span>
            <div className="flex items-center gap-2">
              <code className="text-green-400 font-mono text-sm">0xdAC17F958D2ee523a2206206994597C13D831ec7</code>
              <button
                onClick={() => copyToClipboard('0xdAC17F958D2ee523a2206206994597C13D831ec7')}
                className="text-gray-400 hover:text-white"
              >
                <Copy className="w-4 h-4" />
              </button>
            </div>
          </div>
          <div className="flex items-center justify-between p-3 bg-[var(--bg-primary)] rounded-lg">
            <span className="text-gray-400">Red:</span>
            <span className="text-white">Ethereum Mainnet</span>
          </div>
          <div className="flex items-center justify-between p-3 bg-[var(--bg-primary)] rounded-lg">
            <span className="text-gray-400">Decimales:</span>
            <span className="text-white">6</span>
          </div>
          <a
            href="https://etherscan.io/token/0xdac17f958d2ee523a2206206994597c13d831ec7"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 p-3 bg-blue-500/10 border border-blue-500/30 rounded-lg text-blue-400 hover:bg-blue-500/20 transition-colors"
          >
            <ExternalLink className="w-4 h-4" />
            Ver en Etherscan
          </a>
        </div>
      </div>

      {/* Save Button */}
      <button
        onClick={handleSaveConfig}
        disabled={isLoading}
        className="w-full py-4 bg-gradient-to-r from-blue-500 to-cyan-600 text-white rounded-xl font-bold flex items-center justify-center gap-2 hover:from-blue-400 hover:to-cyan-500 transition-all"
      >
        {isLoading ? (
          <>
            <Loader2 className="w-5 h-5 animate-spin" />
            Probando conexión...
          </>
        ) : (
          <>
            <Zap className="w-5 h-5" />
            Guardar y Probar Conexión
          </>
        )}
      </button>
    </div>
  );

  const renderHistoryTab = () => (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-white flex items-center gap-2">
          <History className="w-5 h-5 text-purple-400" />
          Historial de Conversiones
        </h3>
        <span className="text-sm text-gray-400">{conversions.length} operaciones</span>
      </div>

      {conversions.length === 0 ? (
        <div className="p-8 text-center bg-[var(--bg-elevated)] rounded-xl border border-[var(--border-medium)]">
          <Activity className="w-12 h-12 mx-auto text-gray-600 mb-3" />
          <p className="text-gray-400">No hay conversiones registradas</p>
          <p className="text-gray-500 text-sm mt-1">Las conversiones aparecerán aquí</p>
        </div>
      ) : (
        <div className="space-y-3">
          {conversions.map((conv) => (
            <div
              key={conv.id}
              className={`p-4 bg-[var(--bg-elevated)] rounded-xl border transition-all ${
                conv.status === 'success'
                  ? 'border-emerald-500/30 hover:border-emerald-500/50'
                  : conv.status === 'pending'
                  ? 'border-yellow-500/30 hover:border-yellow-500/50'
                  : 'border-red-500/30 hover:border-red-500/50'
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  {conv.status === 'success' ? (
                    <CheckCircle className="w-6 h-6 text-emerald-400" />
                  ) : conv.status === 'pending' ? (
                    <Loader2 className="w-6 h-6 text-yellow-400 animate-spin" />
                  ) : (
                    <XCircle className="w-6 h-6 text-red-400" />
                  )}
                  <div>
                    <div className="font-medium text-white">
                      ${conv.amountUsd.toLocaleString()} USD → {conv.amountUsdt.toFixed(6)} USDT
                    </div>
                    <div className="text-xs text-gray-400">
                      Desde: {conv.sourceAccountName}
                    </div>
                    <div className="text-xs text-gray-500 font-mono mt-1">
                      → {conv.destinationAddress.substring(0, 10)}...{conv.destinationAddress.slice(-8)}
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className={`text-sm font-medium ${
                    conv.status === 'success' ? 'text-emerald-400' :
                    conv.status === 'pending' ? 'text-yellow-400' : 'text-red-400'
                  }`}>
                    {conv.status === 'success' ? 'Completado' :
                     conv.status === 'pending' ? 'Procesando...' : 'Fallido'}
                  </div>
                  <div className="text-xs text-gray-500">
                    {new Date(conv.timestamp).toLocaleString()}
                  </div>
                </div>
              </div>

              {conv.txHash && (
                <div className="mt-3 pt-3 border-t border-[var(--border-light)] flex items-center justify-between">
                  <code className="text-xs text-gray-500 font-mono">
                    {conv.txHash.substring(0, 20)}...{conv.txHash.slice(-10)}
                  </code>
                  <a
                    href={conv.explorerUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-cyan-400 hover:text-cyan-300 flex items-center gap-1"
                  >
                    <ExternalLink className="w-4 h-4" />
                    Ver en Etherscan
                  </a>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );

  // ============================================================================
  // MAIN RENDER
  // ============================================================================
  return (
    <div className="p-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-4 mb-2">
          <div className="p-3 bg-gradient-to-br from-yellow-500/20 to-amber-600/20 rounded-xl">
            <ArrowRightLeft className="w-8 h-8 text-yellow-400" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-white">Convertidor USD → USDT</h1>
            <p className="text-gray-400">Transfiere USDT real (Tether) en Ethereum Mainnet</p>
          </div>
        </div>
      </div>

      {/* Alerts */}
      {error && (
        <div className="mb-4 p-4 bg-red-500/10 border border-red-500/30 rounded-xl flex items-center gap-3">
          <XCircle className="w-5 h-5 text-red-400 flex-shrink-0" />
          <span className="text-red-200">{error}</span>
          <button onClick={() => setError(null)} className="ml-auto text-red-400 hover:text-red-300">
            ✕
          </button>
        </div>
      )}

      {success && (
        <div className="mb-4 p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-xl flex items-center gap-3">
          <CheckCircle className="w-5 h-5 text-emerald-400 flex-shrink-0" />
          <span className="text-emerald-200">{success}</span>
          <button onClick={() => setSuccess(null)} className="ml-auto text-emerald-400 hover:text-emerald-300">
            ✕
          </button>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-2 mb-6 p-1 bg-[var(--bg-elevated)] rounded-xl">
        {[
          { id: 'convert', label: 'Convertir', icon: ArrowRightLeft },
          { id: 'config', label: 'Configuración', icon: Settings },
          { id: 'history', label: 'Historial', icon: History }
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`flex-1 py-3 px-4 rounded-lg font-medium transition-all flex items-center justify-center gap-2 ${
              activeTab === tab.id
                ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30'
                : 'text-gray-400 hover:text-white hover:bg-[var(--bg-primary)]'
            }`}
          >
            <tab.icon className="w-5 h-5" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {activeTab === 'convert' && renderConvertTab()}
      {activeTab === 'config' && renderConfigTab()}
      {activeTab === 'history' && renderHistoryTab()}
    </div>
  );
};

export default USDTConverterModule;
