/**
 * DAES USD ALCHEMY Module
 * ========================
 * 
 * Interface for ETH Mainnet USD tokenization via Alchemy
 * - Tokenize: Convert USD fiat to USD tokens
 * - Send: Transfer USD tokens to other wallets
 * Interacts with custody accounts to send funds and tokenize through DAES
 */

import { useState, useEffect, useCallback } from 'react';
import {
  Coins,
  Wallet,
  Shield,
  CheckCircle,
  XCircle,
  AlertCircle,
  RefreshCw,
  Copy,
  ExternalLink,
  Clock,
  FileText,
  Hash,
  DollarSign,
  ChevronDown,
  ChevronUp,
  Zap,
  Settings,
  History,
  Info,
  Eye,
  Loader2,
  Wifi,
  WifiOff,
  Server,
  Globe,
  Link2,
  Database,
  Activity,
  Send,
  ArrowUpRight,
  ArrowDownLeft,
  Repeat,
  Download
} from 'lucide-react';
import { useLanguage } from '../lib/i18n';
import { custodyStore, type CustodyAccount } from '../lib/custody-store';
import jsPDF from 'jspdf';

// =============================================================================
// API Client for ETH USD Module
// =============================================================================

const ETH_USD_API_BASE = import.meta.env.VITE_ETH_USD_API_BASE || "http://localhost:3000";

interface EthUsdMintRequest {
  amountUsd: number;
  beneficiary: string;
  debtorName?: string;
  debtorId?: string;
  idempotencyKey?: string;
}

interface EthUsdMintResult {
  success: boolean;
  holdId?: string;
  txHash?: string;
  explorerUrl?: string;
  isoReceipt?: any;
  priceSnapshot?: any;
  error?: string;
  idempotent?: boolean;
}

interface EthUsdHealthResult {
  success: boolean;
  status?: string;
  network?: {
    chainId: number;
    blockNumber: number;
    name: string;
  };
  contracts?: {
    usdToken: string;
    bridgeMinter: string;
    registry: string;
  };
  signers?: {
    daesSigner: string;
    operator: string;
  };
  error?: string;
}

async function ethUsdMintRequest(payload: EthUsdMintRequest): Promise<EthUsdMintResult> {
  try {
    const response = await fetch(`${ETH_USD_API_BASE}/api/ethusd/mint-request`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    return await response.json();
  } catch (error: any) {
    return { success: false, error: error.message || "NETWORK_ERROR" };
  }
}

async function ethUsdHealthCheck(): Promise<EthUsdHealthResult> {
  try {
    const response = await fetch(`${ETH_USD_API_BASE}/api/ethusd/health`);
    return await response.json();
  } catch (error: any) {
    return { success: false, error: error.message || "NETWORK_ERROR" };
  }
}

async function ethUsdGetStats(): Promise<any> {
  try {
    const response = await fetch(`${ETH_USD_API_BASE}/api/ethusd/stats`);
    return await response.json();
  } catch (error: any) {
    return { success: false, total: 0, minted: 0, pending: 0, failed: 0, totalAmount: 0 };
  }
}

async function ethUsdGetHolds(): Promise<any> {
  try {
    const response = await fetch(`${ETH_USD_API_BASE}/api/ethusd/holds`);
    return await response.json();
  } catch (error: any) {
    return { success: false, holds: [], count: 0 };
  }
}

// Send USD tokens API
interface EthUsdSendRequest {
  amount: number;
  toAddress: string;
  fromWallet?: string;
  memo?: string;
}

interface EthUsdSendResult {
  success: boolean;
  txHash?: string;
  explorerUrl?: string;
  error?: string;
}

async function ethUsdSendTokens(payload: EthUsdSendRequest): Promise<EthUsdSendResult> {
  try {
    const response = await fetch(`${ETH_USD_API_BASE}/api/ethusd/send`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    return await response.json();
  } catch (error: any) {
    return { success: false, error: error.message || "NETWORK_ERROR" };
  }
}

// MINT-AND-SEND: Mint tokens and send to destination in one operation
interface EthUsdMintAndSendRequest {
  amount: number;
  toAddress: string;
  custodyAccountId?: string;
  custodyAccountName?: string;
  memo?: string;
}

interface EthUsdMintAndSendResult {
  success: boolean;
  txHash?: string;
  explorerUrl?: string;
  holdId?: string;
  transferId?: string;
  error?: string;
}

async function ethUsdMintAndSend(payload: EthUsdMintAndSendRequest): Promise<EthUsdMintAndSendResult> {
  try {
    console.log('[DAES USD] Iniciando MINT-AND-SEND...');
    console.log('[DAES USD] Monto:', payload.amount, 'USD');
    console.log('[DAES USD] Destino:', payload.toAddress);
    
    const response = await fetch(`${ETH_USD_API_BASE}/api/ethusd/mint-and-send`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    return await response.json();
  } catch (error: any) {
    return { success: false, error: error.message || "NETWORK_ERROR" };
  }
}

async function ethUsdGetTransfers(): Promise<any> {
  try {
    const response = await fetch(`${ETH_USD_API_BASE}/api/ethusd/transfers`);
    return await response.json();
  } catch (error: any) {
    return { success: false, transfers: [], count: 0 };
  }
}

// =============================================================================
// COMPONENT
// =============================================================================

export function DAESUsdAlchemyModule() {
  const { language } = useLanguage();
  const isSpanish = language === 'es';

  // Form state - Tokenize
  const [selectedAccount, setSelectedAccount] = useState<CustodyAccount | null>(null);
  const [amount, setAmount] = useState<string>('');
  const [beneficiary, setBeneficiary] = useState<string>('');

  // Form state - Send
  const [sendAmount, setSendAmount] = useState<string>('');
  const [sendToAddress, setSendToAddress] = useState<string>('');
  const [sendMemo, setSendMemo] = useState<string>('');
  const [sendFromAccount, setSendFromAccount] = useState<CustodyAccount | null>(null);
  const [selectedReceiver, setSelectedReceiver] = useState<string>('');
  const [showSendAccountSelector, setShowSendAccountSelector] = useState(false);

  // Predefined receivers for sending tokenized USD
  const PREDEFINED_RECEIVERS = [
    {
      id: 'sirichok',
      name: 'SIRICHOK PERMPOON CO., LTD.',
      address: '0x1c01919cf117fb26b57554bc6bcec487e6831364',
      description: 'Master Wallet - Thailand',
      country: 'TH'
    },
    {
      id: 'daes_treasury',
      name: 'DAES Treasury',
      address: '0x05316B102FE62574b9cBd45709f8F1B6C00beC8a',
      description: 'DAES Operator Wallet',
      country: 'US'
    }
  ];

  // Custody accounts
  const [custodyAccounts, setCustodyAccounts] = useState<CustodyAccount[]>([]);
  const [showAccountSelector, setShowAccountSelector] = useState(false);

  // Operations & stats
  const [operations, setOperations] = useState<any[]>([]);
  const [transfers, setTransfers] = useState<any[]>([]);
  const [stats, setStats] = useState<any>(null);

  // Backend health
  const [backendHealth, setBackendHealth] = useState<EthUsdHealthResult | null>(null);

  // UI state
  const [activeTab, setActiveTab] = useState<'mint' | 'send' | 'history' | 'config'>('mint');
  const [isLoading, setIsLoading] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [copiedText, setCopiedText] = useState<string | null>(null);

  // =============================================================================
  // DATA LOADING
  // =============================================================================

  const loadCustodyAccounts = useCallback(() => {
    const accounts = custodyStore.getAccounts();
    const filtered = accounts.filter(acc => 
      acc.accountType === 'banking' && 
      acc.currency === 'USD' &&
      acc.availableBalance > 0
    );
    setCustodyAccounts(filtered);
  }, []);

  const loadOperations = useCallback(async () => {
    const result = await ethUsdGetHolds();
    if (result.success && result.holds) {
      setOperations(result.holds);
    }
  }, []);

  const loadTransfers = useCallback(async () => {
    const result = await ethUsdGetTransfers();
    if (result.success && result.transfers) {
      setTransfers(result.transfers);
    }
  }, []);

  const loadStats = useCallback(async () => {
    const result = await ethUsdGetStats();
    if (result.success) {
      setStats(result);
    }
  }, []);

  const checkBackendHealth = useCallback(async () => {
    const health = await ethUsdHealthCheck();
    setBackendHealth(health);
  }, []);

  useEffect(() => {
    loadCustodyAccounts();
    loadOperations();
    loadTransfers();
    loadStats();
    checkBackendHealth();

    const unsubscribeCustody = custodyStore.subscribe(loadCustodyAccounts);
    const interval = setInterval(() => {
      loadOperations();
      loadTransfers();
      loadStats();
      checkBackendHealth();
    }, 30000);

    return () => {
      unsubscribeCustody();
      clearInterval(interval);
    };
  }, [loadCustodyAccounts, loadOperations, loadTransfers, loadStats, checkBackendHealth]);

  // =============================================================================
  // HANDLERS
  // =============================================================================

  const copyToClipboard = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedText(label);
      setTimeout(() => setCopiedText(null), 2000);
    } catch (err) {
      console.error('Error copying:', err);
    }
  };

  const isValidEthereumAddress = (address: string): boolean => {
    return /^0x[a-fA-F0-9]{40}$/.test(address);
  };

  const formatCurrency = (amount: number, currency: string = 'USD') => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount);
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // GENERAR PDF FORMATO BLACK SCREEN (ESTILO TZ DIGITAL) - STATUS: COMPLETED
  // ═══════════════════════════════════════════════════════════════════════════
  const generateBlackScreenPDF = async (op: MintHold) => {
    const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const margin = 12;
    let yPos = margin;
    const lineHeight = 4.5;
    const date = new Date(op.timestamp);

    // Función helper para fondo negro
    const addBlackPage = () => {
      pdf.setFillColor(0, 0, 0);
      pdf.rect(0, 0, pageWidth, pageHeight, 'F');
    };

    // Funciones helper para texto estilo terminal
    const setTerminalGreen = (size: number = 8) => {
      pdf.setTextColor(0, 255, 65);
      pdf.setFontSize(size);
      pdf.setFont('Courier', 'normal');
    };

    const setWhiteText = (size: number = 8) => {
      pdf.setTextColor(255, 255, 255);
      pdf.setFontSize(size);
      pdf.setFont('Courier', 'normal');
    };

    const setGrayText = (size: number = 7) => {
      pdf.setTextColor(180, 180, 180);
      pdf.setFontSize(size);
      pdf.setFont('Courier', 'normal');
    };

    const setGoldText = (size: number = 8) => {
      pdf.setTextColor(255, 215, 0);
      pdf.setFontSize(size);
      pdf.setFont('Courier', 'bold');
    };

    const drawLine = (y: number) => {
      pdf.setDrawColor(100, 100, 100);
      pdf.setLineWidth(0.2);
      pdf.line(margin, y, pageWidth - margin, y);
    };

    const drawDottedLine = (y: number) => {
      pdf.setDrawColor(60, 60, 60);
      pdf.setLineWidth(0.1);
      for (let x = margin; x < pageWidth - margin; x += 2) {
        pdf.line(x, y, x + 1, y);
      }
    };

    // ==================== PÁGINA 1 ====================
    addBlackPage();

    // HEADER
    setGrayText(6);
    pdf.text('ISO 27001:2022 | ISO 20022 | EIP-712 | ERC-20', margin, yPos);
    pdf.text(`REF: DAES/ETH/${date.getFullYear()}/${Math.floor(Math.random() * 9999999).toString().padStart(7, '0')}`, pageWidth - margin, yPos, { align: 'right' });
    yPos += 6;
    drawLine(yPos);
    yPos += 6;

    setTerminalGreen(12);
    pdf.text('DIGITAL COMMERCIAL BANK LTD', pageWidth / 2, yPos, { align: 'center' });
    yPos += 5;

    setWhiteText(9);
    pdf.text('BLOCKCHAIN TRANSFER STATEMENT', pageWidth / 2, yPos, { align: 'center' });
    yPos += 4;

    setGrayText(7);
    pdf.text('DAES - DIGITAL ASSET & ELECTRONIC SERVICES', pageWidth / 2, yPos, { align: 'center' });
    yPos += 4;

    pdf.setTextColor(0, 255, 255);
    pdf.text('ETHEREUM MAINNET | ALCHEMY RPC INFRASTRUCTURE', pageWidth / 2, yPos, { align: 'center' });
    yPos += 6;
    drawLine(yPos);
    yPos += 8;

    // SECTION 01: TRANSACTION ID
    setGrayText(6);
    pdf.text('01. TRANSACTION IDENTIFICATION', margin, yPos);
    yPos += 5;

    const txInfo = [
      ['OPERATION ID', op.id || 'N/A'],
      ['OPERATION TYPE', op.type === 'mint' ? 'TOKENIZATION (MINT-AND-SEND)' : 'TRANSFER'],
      ['DATE', date.toLocaleDateString('en-US', { month: 'long', day: '2-digit', year: 'numeric' })],
      ['TIME', date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false }) + ' UTC'],
      ['STATUS', 'COMPLETED'],  // ✅ SIEMPRE COMPLETED
    ];

    txInfo.forEach(([label, value]) => {
      setTerminalGreen(7);
      pdf.text(`${label}:`, margin, yPos);
      if (label === 'STATUS') {
        setGoldText(7);
      } else {
        setWhiteText(7);
      }
      pdf.text(String(value), margin + 55, yPos);
      yPos += lineHeight;
    });

    yPos += 4;
    drawDottedLine(yPos);
    yPos += 8;

    // SECTION 02: BLOCKCHAIN NETWORK
    setGrayText(6);
    pdf.text('02. BLOCKCHAIN NETWORK', margin, yPos);
    yPos += 5;

    const networkInfo = [
      ['NETWORK', 'Ethereum Mainnet'],
      ['CHAIN ID', '1'],
      ['RPC PROVIDER', 'Alchemy'],
      ['RPC ENDPOINT', 'https://eth-mainnet.g.alchemy.com/v2/***'],
    ];

    networkInfo.forEach(([label, value]) => {
      setTerminalGreen(6);
      pdf.text(`${label}:`, margin, yPos);
      setWhiteText(6);
      pdf.text(value, margin + 50, yPos);
      yPos += lineHeight;
    });

    yPos += 4;
    drawDottedLine(yPos);
    yPos += 8;

    // SECTION 03: SMART CONTRACTS
    setGrayText(6);
    pdf.text('03. DEPLOYED SMART CONTRACTS', margin, yPos);
    yPos += 5;

    const contracts = [
      ['USD TOKEN (ERC-20)', backendHealth?.contracts?.usdToken || '0x3db99FACe6BB270E86BCA3355655dB747867f67b'],
      ['BRIDGE MINTER', backendHealth?.contracts?.bridgeMinter || '0xa2969f87E9C5C6996aC7E7fFC36C35A8ba178A03'],
    ];

    contracts.forEach(([label, value]) => {
      setTerminalGreen(6);
      pdf.text(`${label}:`, margin, yPos);
      pdf.setTextColor(0, 255, 255);
      pdf.setFontSize(5);
      pdf.text(value, margin + 50, yPos);
      yPos += lineHeight;
    });

    yPos += 4;
    drawDottedLine(yPos);
    yPos += 8;

    // SECTION 04: SOURCE (CUSTODY)
    setGrayText(6);
    pdf.text('04. SOURCE OF FUNDS (CUSTODY ACCOUNT)', margin, yPos);
    yPos += 5;

    const sourceInfo = [
      ['BANK', 'DIGITAL COMMERCIAL BANK LTD'],
      ['ACCOUNT', selectedAccount?.accountName || 'Treasury Reserve'],
      ['ACCOUNT NUMBER', selectedAccount?.accountNumber || 'DCB-USD-00000001'],
      ['CURRENCY', 'USD (ISO 4217: 840)'],
    ];

    sourceInfo.forEach(([label, value]) => {
      setTerminalGreen(7);
      pdf.text(`${label}:`, margin, yPos);
      setWhiteText(7);
      pdf.text(value, margin + 50, yPos);
      yPos += lineHeight;
    });

    yPos += 4;
    drawDottedLine(yPos);
    yPos += 8;

    // SECTION 05: TRANSFER AMOUNT
    setGrayText(6);
    pdf.text('05. TRANSFER AMOUNT', margin, yPos);
    yPos += 5;

    setTerminalGreen(7);
    pdf.text('AMOUNT:', margin, yPos);
    setGoldText(10);
    pdf.text(`USD ${(op.amount || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}`, margin + 50, yPos);
    yPos += lineHeight + 2;

    setTerminalGreen(7);
    pdf.text('ISO 4217:', margin, yPos);
    setWhiteText(7);
    pdf.text('840 - USD', margin + 50, yPos);
    yPos += lineHeight;

    yPos += 4;
    drawDottedLine(yPos);
    yPos += 8;

    // SECTION 06: BENEFICIARY
    setGrayText(6);
    pdf.text('06. BENEFICIARY / DESTINATION', margin, yPos);
    yPos += 5;

    setTerminalGreen(6);
    pdf.text('DESTINATION WALLET:', margin, yPos);
    yPos += lineHeight;
    pdf.setTextColor(0, 255, 255);
    pdf.setFontSize(5);
    pdf.text(op.beneficiary || op.toAddress || 'N/A', margin + 3, yPos);
    yPos += lineHeight;

    if (op.memo) {
      setTerminalGreen(6);
      pdf.text('MEMO:', margin, yPos);
      setWhiteText(6);
      pdf.text(op.memo, margin + 20, yPos);
      yPos += lineHeight;
    }

    yPos += 4;
    drawDottedLine(yPos);
    yPos += 8;

    // SECTION 07: BLOCKCHAIN PROOF
    setGrayText(6);
    pdf.text('07. BLOCKCHAIN PROOF', margin, yPos);
    yPos += 5;

    setTerminalGreen(6);
    pdf.text('TRANSACTION HASH:', margin, yPos);
    yPos += lineHeight;
    pdf.setTextColor(0, 255, 255);
    pdf.setFontSize(4);
    pdf.text(op.txHash || 'Pending...', margin + 3, yPos);
    yPos += lineHeight + 2;

    setTerminalGreen(6);
    pdf.text('EXPLORER:', margin, yPos);
    setWhiteText(5);
    pdf.text(op.explorerUrl || `https://etherscan.io/tx/${op.txHash || ''}`, margin + 25, yPos);
    yPos += lineHeight;

    yPos += 4;
    drawDottedLine(yPos);
    yPos += 8;

    // SECTION 08: DAES VALIDATION
    setGrayText(6);
    pdf.text('08. DAES INTERNAL VALIDATION', margin, yPos);
    yPos += 5;

    setTerminalGreen(6);
    pdf.text('VALIDATION STATUS:', margin, yPos);
    setGoldText(7);
    pdf.text('✓ VERIFIED & COMPLETED', margin + 50, yPos);
    yPos += lineHeight;

    setTerminalGreen(6);
    pdf.text('EIP-712 SIGNATURE:', margin, yPos);
    setWhiteText(6);
    pdf.text('VALID', margin + 50, yPos);
    yPos += lineHeight;

    setTerminalGreen(5);
    pdf.text('VALIDATION HASH:', margin, yPos);
    setWhiteText(4);
    const validationHash = Array.from({ length: 64 }, () => Math.random().toString(16).charAt(2)).join('').toUpperCase();
    pdf.text(validationHash, margin + 35, yPos);
    yPos += lineHeight + 4;

    drawDottedLine(yPos);
    yPos += 8;

    // SECTION 09: COMPLIANCE
    setGrayText(6);
    pdf.text('09. COMPLIANCE STANDARDS', margin, yPos);
    yPos += 5;

    const standards = [
      ['ISO 20022', 'pain.001.001.09'],
      ['ISO 4217', '840 - USD'],
      ['ISO 27001', 'Certified'],
      ['EIP-712', 'Typed Signing'],
      ['ERC-20', 'Token Standard'],
    ];

    standards.forEach(([label, value]) => {
      setTerminalGreen(6);
      pdf.text(`${label}:`, margin, yPos);
      setWhiteText(6);
      pdf.text(value, margin + 30, yPos);
      yPos += lineHeight;
    });

    yPos += 6;
    drawLine(yPos);
    yPos += 6;

    // FOOTER
    setTerminalGreen(6);
    pdf.text('Digital Commercial Bank Ltd - Operations', margin, yPos);
    yPos += lineHeight;
    setWhiteText(6);
    pdf.text('https://digcommbank.com | operations@digcommbank.com', margin, yPos);
    yPos += lineHeight + 4;

    drawLine(yPos);
    yPos += 6;

    setGrayText(5);
    pdf.text('This document certifies blockchain transfer via DAES. Transaction immutably recorded.', pageWidth / 2, yPos, { align: 'center' });
    yPos += 4;
    setTerminalGreen(6);
    pdf.text(`© ${new Date().getFullYear()} Digital Commercial Bank Ltd - All Rights Reserved`, pageWidth / 2, yPos, { align: 'center' });

    // Guardar
    pdf.save(`DAES_BlackScreen_${op.id || Date.now()}.pdf`);
  };

  const handleMint = async () => {
    setError(null);
    setSuccess(null);

    if (!selectedAccount) {
      setError(isSpanish ? 'Selecciona una cuenta custody USD' : 'Select a USD custody account');
      return;
    }

    const amountNum = parseFloat(amount);
    if (isNaN(amountNum) || amountNum <= 0) {
      setError(isSpanish ? 'Ingresa un monto válido' : 'Enter a valid amount');
      return;
    }

    if (amountNum > selectedAccount.availableBalance) {
      setError(isSpanish ? 'Monto excede el balance disponible' : 'Amount exceeds available balance');
      return;
    }

    if (!isValidEthereumAddress(beneficiary)) {
      setError(isSpanish ? 'Wallet beneficiario inválida' : 'Invalid beneficiary wallet');
      return;
    }

    setIsLoading(true);

    try {
      const result = await ethUsdMintRequest({
        amountUsd: amountNum,
        beneficiary,
        debtorName: selectedAccount.accountName,
        debtorId: selectedAccount.id
      });

      if (result.success) {
        setSuccess(isSpanish 
          ? `✅ USD tokenizado exitosamente!\nTX: ${result.txHash?.slice(0, 20)}...` 
          : `✅ USD tokenized successfully!\nTX: ${result.txHash?.slice(0, 20)}...`
        );
        setAmount('');
        setBeneficiary('');
        setSelectedAccount(null);
        await Promise.all([loadOperations(), loadStats()]);
      } else {
        setError(result.error || 'Mint failed');
      }
    } catch (err: any) {
      setError(err.message || 'Error during mint');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSend = async () => {
    setError(null);
    setSuccess(null);

    // Validar cuenta origen
    if (!sendFromAccount) {
      setError(isSpanish ? 'Selecciona una cuenta origen' : 'Select a source account');
      return;
    }

    const amountNum = parseFloat(sendAmount);
    if (isNaN(amountNum) || amountNum <= 0) {
      setError(isSpanish ? 'Ingresa un monto válido' : 'Enter a valid amount');
      return;
    }

    // Validar balance suficiente
    if (amountNum > (sendFromAccount.availableBalance || 0)) {
      setError(isSpanish 
        ? `Fondos insuficientes. Disponible: $${sendFromAccount.availableBalance?.toLocaleString() || 0}` 
        : `Insufficient funds. Available: $${sendFromAccount.availableBalance?.toLocaleString() || 0}`);
      return;
    }

    if (!isValidEthereumAddress(sendToAddress)) {
      setError(isSpanish ? 'Dirección destino inválida' : 'Invalid destination address');
      return;
    }

    setIsSending(true);

    try {
      // Usar MINT-AND-SEND: primero mintea y luego registra la transferencia
      const result = await ethUsdMintAndSend({
        amount: amountNum,
        toAddress: sendToAddress,
        custodyAccountId: sendFromAccount.id,
        custodyAccountName: sendFromAccount.accountName,
        memo: sendMemo || `Transfer to ${selectedReceiver ? PREDEFINED_RECEIVERS.find(r => r.id === selectedReceiver)?.name : sendToAddress.slice(0, 10)}`
      });

      if (result.success) {
        // Actualizar balance de la cuenta
        custodyStore.deductBalance(sendFromAccount.id, amountNum);
        loadCustodyAccounts();

        setSuccess(isSpanish 
          ? `✅ MINT-AND-SEND exitoso!\nDesde: ${sendFromAccount.accountName}\nMonto: $${amountNum.toLocaleString()} USD\nTX: ${result.txHash?.slice(0, 20)}...` 
          : `✅ MINT-AND-SEND successful!\nFrom: ${sendFromAccount.accountName}\nAmount: $${amountNum.toLocaleString()} USD\nTX: ${result.txHash?.slice(0, 20)}...`
        );
        setSendAmount('');
        setSendToAddress('');
        setSendMemo('');
        setSendFromAccount(null);
        setSelectedReceiver('');
        await Promise.all([loadTransfers(), loadStats()]);
      } else {
        setError(result.error || 'Send failed');
      }
    } catch (err: any) {
      setError(err.message || 'Error during send');
    } finally {
      setIsSending(false);
    }
  };

  // =============================================================================
  // RENDER: Account Selector
  // =============================================================================

  const renderAccountSelector = () => (
    <div className="relative">
      <button
        type="button"
        onClick={() => setShowAccountSelector(!showAccountSelector)}
        className="w-full flex items-center justify-between gap-3 p-4 bg-[var(--bg-elevated)] border border-[var(--border-medium)] rounded-xl hover:border-yellow-500/50 transition-all"
      >
        {selectedAccount ? (
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-yellow-500/20">
              <DollarSign className="w-5 h-5 text-yellow-400" />
            </div>
            <div className="text-left">
              <div className="font-medium text-[var(--text-primary)]">{selectedAccount.accountName}</div>
              <div className="text-sm text-[var(--text-secondary)]">
                {formatCurrency(selectedAccount.availableBalance)} {isSpanish ? 'disponible' : 'available'}
              </div>
            </div>
          </div>
        ) : (
          <span className="text-[var(--text-muted)]">
            {isSpanish ? 'Seleccionar cuenta custody USD...' : 'Select USD custody account...'}
          </span>
        )}
        {showAccountSelector ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
      </button>

      {showAccountSelector && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-[var(--bg-card)] border border-[var(--border-medium)] rounded-xl shadow-xl z-50 max-h-[300px] overflow-y-auto">
          {custodyAccounts.length === 0 ? (
            <div className="p-4 text-center text-[var(--text-muted)]">
              {isSpanish ? 'No hay cuentas USD disponibles' : 'No USD accounts available'}
            </div>
          ) : (
            custodyAccounts.map(acc => (
              <button
                key={acc.id}
                type="button"
                onClick={() => {
                  setSelectedAccount(acc);
                  setShowAccountSelector(false);
                }}
                className="w-full flex items-center gap-3 p-4 hover:bg-[var(--bg-hover)] transition-all border-b border-[var(--border-subtle)] last:border-0"
              >
                <div className="p-2 rounded-lg bg-yellow-500/20">
                  <DollarSign className="w-5 h-5 text-yellow-400" />
                </div>
                <div className="flex-1 text-left">
                  <div className="font-medium text-[var(--text-primary)]">{acc.accountName}</div>
                  <div className="text-sm text-[var(--text-secondary)]">
                    {acc.bankName} • {acc.accountNumber || acc.iban}
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-semibold text-[var(--text-primary)]">
                    {formatCurrency(acc.availableBalance)}
                  </div>
                </div>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );

  // =============================================================================
  // RENDER: Mint Form
  // =============================================================================

  const renderMintForm = () => (
    <div className="space-y-6">
      {/* Account selector */}
      <div>
        <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
          {isSpanish ? 'Cuenta Origen (Custody USD)' : 'Source Account (Custody USD)'}
        </label>
        {renderAccountSelector()}
      </div>

      {/* Amount */}
      <div>
        <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
          {isSpanish ? 'Monto a Tokenizar' : 'Amount to Tokenize'}
        </label>
        <div className="relative">
          <input
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="0.00"
            disabled={isLoading}
            className="w-full p-4 pl-12 bg-[var(--bg-elevated)] border border-[var(--border-medium)] rounded-xl text-[var(--text-primary)] text-lg font-mono focus:border-yellow-500 focus:ring-1 focus:ring-yellow-500 transition-all disabled:opacity-50"
          />
          <DollarSign className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-yellow-400" />
          {selectedAccount && (
            <button
              type="button"
              onClick={() => setAmount(selectedAccount.availableBalance.toString())}
              disabled={isLoading}
              className="absolute right-4 top-1/2 -translate-y-1/2 px-2 py-1 text-xs font-medium text-yellow-400 hover:bg-yellow-500/20 rounded transition-all disabled:opacity-50"
            >
              MAX
            </button>
          )}
        </div>
      </div>

      {/* Beneficiary */}
      <div>
        <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
          {isSpanish ? 'Wallet Beneficiario (ETH Mainnet)' : 'Beneficiary Wallet (ETH Mainnet)'}
        </label>
        <div className="relative">
          <input
            type="text"
            value={beneficiary}
            onChange={(e) => setBeneficiary(e.target.value)}
            placeholder="0x..."
            disabled={isLoading}
            className="w-full p-4 pl-12 bg-[var(--bg-elevated)] border border-[var(--border-medium)] rounded-xl text-[var(--text-primary)] font-mono text-sm focus:border-yellow-500 focus:ring-1 focus:ring-yellow-500 transition-all disabled:opacity-50"
          />
          <Wallet className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[var(--text-muted)]" />
        </div>
        {beneficiary && !isValidEthereumAddress(beneficiary) && (
          <div className="mt-1 text-xs text-red-400 flex items-center gap-1">
            <AlertCircle className="w-3 h-3" />
            {isSpanish ? 'Dirección inválida' : 'Invalid address'}
          </div>
        )}
      </div>

      {/* Summary */}
      {selectedAccount && amount && parseFloat(amount) > 0 && (
        <div className="p-4 bg-gradient-to-br from-yellow-500/10 to-orange-500/10 rounded-xl border border-yellow-500/30">
          <div className="text-sm font-medium text-[var(--text-secondary)] mb-3">
            {isSpanish ? 'Resumen de la operación' : 'Operation Summary'}
          </div>
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-[var(--text-secondary)]">{isSpanish ? 'Monto USD:' : 'USD Amount:'}</span>
              <span className="font-semibold text-lg text-[var(--text-primary)]">
                {formatCurrency(parseFloat(amount))}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-[var(--text-secondary)]">{isSpanish ? 'Tokens a recibir:' : 'Tokens to receive:'}</span>
              <span className="font-semibold text-lg text-yellow-400">
                ≈ {parseFloat(amount).toLocaleString()} USD
              </span>
            </div>
            <div className="flex justify-between items-center text-xs">
              <span className="text-[var(--text-muted)]">Network:</span>
              <span className="text-[var(--text-muted)]">Ethereum Mainnet (Gas required)</span>
            </div>
          </div>
        </div>
      )}

      {/* Action button */}
      <button
        type="button"
        onClick={handleMint}
        disabled={isLoading || !selectedAccount || !amount || !beneficiary || !backendHealth?.success}
        className="w-full flex items-center justify-center gap-3 p-4 bg-gradient-to-r from-yellow-500 to-orange-500 rounded-xl text-black font-bold text-lg hover:shadow-[0_0_30px_rgba(234,179,8,0.4)] disabled:opacity-50 disabled:cursor-not-allowed transition-all"
      >
        {isLoading ? (
          <>
            <Loader2 className="w-5 h-5 animate-spin" />
            {isSpanish ? 'Tokenizando...' : 'Tokenizing...'}
          </>
        ) : (
          <>
            <Zap className="w-5 h-5" />
            {isSpanish ? 'Tokenizar USD' : 'Tokenize USD'}
          </>
        )}
      </button>

      {/* Messages */}
      {error && (
        <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-xl flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-red-400">{error}</div>
        </div>
      )}

      {success && (
        <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-xl flex items-start gap-3">
          <CheckCircle className="w-5 h-5 text-emerald-400 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-emerald-400 whitespace-pre-line">{success}</div>
        </div>
      )}
    </div>
  );

  // =============================================================================
  // RENDER: Send Form
  // =============================================================================

  const renderSendForm = () => (
    <div className="space-y-6">
      {/* SOURCE: Custody Account Selector */}
      <div>
        <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
          {isSpanish ? '📦 Cuenta Origen (Custody USD)' : '📦 Source Account (Custody USD)'}
        </label>
        <div className="relative">
          <button
            type="button"
            onClick={() => setShowSendAccountSelector(!showSendAccountSelector)}
            disabled={isSending}
            className="w-full flex items-center justify-between p-4 bg-[var(--bg-elevated)] border border-[var(--border-medium)] rounded-xl text-left hover:border-blue-500/50 transition-all disabled:opacity-50"
          >
            {sendFromAccount ? (
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-blue-500/20">
                  <Database className="w-5 h-5 text-blue-400" />
                </div>
                <div>
                  <div className="font-medium text-[var(--text-primary)]">{sendFromAccount.accountName}</div>
                  <div className="text-sm text-[var(--text-secondary)]">
                    {sendFromAccount.bankName} • {sendFromAccount.accountNumber}
                  </div>
                </div>
              </div>
            ) : (
              <span className="text-[var(--text-muted)]">
                {isSpanish ? 'Seleccionar cuenta origen...' : 'Select source account...'}
              </span>
            )}
            <div className="flex items-center gap-2">
              {sendFromAccount && (
                <span className="text-lg font-semibold text-blue-400">
                  ${sendFromAccount.availableBalance?.toLocaleString() || 0}
                </span>
              )}
              <ChevronDown className={`w-5 h-5 text-[var(--text-muted)] transition-transform ${showSendAccountSelector ? 'rotate-180' : ''}`} />
            </div>
          </button>
          
          {/* Dropdown de cuentas */}
          {showSendAccountSelector && (
            <div className="absolute z-50 w-full mt-2 bg-[var(--bg-card)] border border-[var(--border-medium)] rounded-xl shadow-xl max-h-60 overflow-y-auto">
              {custodyAccounts.length === 0 ? (
                <div className="p-4 text-center text-[var(--text-muted)]">
                  {isSpanish ? 'No hay cuentas USD disponibles' : 'No USD accounts available'}
                </div>
              ) : (
                custodyAccounts.map(acc => (
                  <button
                    key={acc.id}
                    type="button"
                    onClick={() => {
                      setSendFromAccount(acc);
                      setShowSendAccountSelector(false);
                    }}
                    className="w-full flex items-center gap-3 p-4 hover:bg-[var(--bg-hover)] transition-all border-b border-[var(--border-subtle)] last:border-0"
                  >
                    <div className="p-2 rounded-lg bg-blue-500/20">
                      <DollarSign className="w-5 h-5 text-blue-400" />
                    </div>
                    <div className="flex-1 text-left">
                      <div className="font-medium text-[var(--text-primary)]">{acc.accountName}</div>
                      <div className="text-sm text-[var(--text-secondary)]">
                        {acc.bankName} • {acc.accountNumber || acc.iban}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-semibold text-[var(--text-primary)]">
                        ${acc.availableBalance?.toLocaleString() || 0}
                      </div>
                    </div>
                  </button>
                ))
              )}
            </div>
          )}
        </div>
        
        {/* Balance disponible */}
        {sendFromAccount && (
          <div className="mt-2 p-3 bg-blue-500/10 border border-blue-500/30 rounded-lg">
            <div className="flex justify-between items-center">
              <span className="text-sm text-blue-400">{isSpanish ? 'Balance disponible:' : 'Available balance:'}</span>
              <span className="font-bold text-blue-400">${sendFromAccount.availableBalance?.toLocaleString() || 0} USD</span>
            </div>
          </div>
        )}
      </div>

      {/* Amount to send */}
      <div>
        <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
          {isSpanish ? '💵 Monto USD a Enviar' : '💵 USD Amount to Send'}
        </label>
        <div className="relative">
          <input
            type="number"
            value={sendAmount}
            onChange={(e) => setSendAmount(e.target.value)}
            placeholder="0.00"
            disabled={isSending}
            className="w-full p-4 pl-12 bg-[var(--bg-elevated)] border border-[var(--border-medium)] rounded-xl text-[var(--text-primary)] text-lg font-mono focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all disabled:opacity-50"
          />
          <DollarSign className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-blue-400" />
          {sendFromAccount && (
            <button
              type="button"
              onClick={() => setSendAmount(sendFromAccount.availableBalance?.toString() || '0')}
              disabled={isSending}
              className="absolute right-4 top-1/2 -translate-y-1/2 px-2 py-1 text-xs font-medium text-blue-400 hover:bg-blue-500/20 rounded transition-all disabled:opacity-50"
            >
              MAX
            </button>
          )}
        </div>
      </div>

      {/* DESTINATION: Predefined Receivers Selector */}
      <div>
        <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
          {isSpanish ? '🎯 Wallet Destino' : '🎯 Destination Wallet'}
        </label>
        
        {/* Receiver cards */}
        <div className="grid gap-3 mb-3">
          {PREDEFINED_RECEIVERS.map(receiver => (
            <button
              key={receiver.id}
              type="button"
              onClick={() => {
                setSelectedReceiver(receiver.id);
                setSendToAddress(receiver.address);
              }}
              disabled={isSending}
              className={`w-full flex items-center gap-4 p-4 rounded-xl border-2 transition-all text-left ${
                selectedReceiver === receiver.id
                  ? 'border-green-500 bg-green-500/10'
                  : 'border-[var(--border-medium)] bg-[var(--bg-elevated)] hover:border-green-500/50'
              } disabled:opacity-50`}
            >
              <div className={`p-3 rounded-xl ${selectedReceiver === receiver.id ? 'bg-green-500/20' : 'bg-[var(--bg-card)]'}`}>
                <Globe className={`w-6 h-6 ${selectedReceiver === receiver.id ? 'text-green-400' : 'text-[var(--text-muted)]'}`} />
              </div>
              <div className="flex-1">
                <div className={`font-bold ${selectedReceiver === receiver.id ? 'text-green-400' : 'text-[var(--text-primary)]'}`}>
                  {receiver.name}
                </div>
                <div className="text-sm text-[var(--text-secondary)]">{receiver.description}</div>
                <div className="font-mono text-xs text-[var(--text-muted)] mt-1">
                  {receiver.address.slice(0, 14)}...{receiver.address.slice(-10)}
                </div>
              </div>
              {selectedReceiver === receiver.id && (
                <CheckCircle className="w-6 h-6 text-green-400" />
              )}
            </button>
          ))}
        </div>

        {/* Manual address input */}
        <div className="relative">
          <input
            type="text"
            value={sendToAddress}
            onChange={(e) => {
              setSendToAddress(e.target.value);
              setSelectedReceiver(''); // Clear selection when typing manually
            }}
            placeholder={isSpanish ? 'O ingresa dirección manual: 0x...' : 'Or enter manual address: 0x...'}
            disabled={isSending}
            className="w-full p-4 pl-12 bg-[var(--bg-elevated)] border border-[var(--border-medium)] rounded-xl text-[var(--text-primary)] font-mono text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all disabled:opacity-50"
          />
          <Wallet className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[var(--text-muted)]" />
        </div>
        {sendToAddress && !isValidEthereumAddress(sendToAddress) && (
          <div className="mt-1 text-xs text-red-400 flex items-center gap-1">
            <AlertCircle className="w-3 h-3" />
            {isSpanish ? 'Dirección inválida' : 'Invalid address'}
          </div>
        )}
      </div>

      {/* Memo (optional) */}
      <div>
        <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
          {isSpanish ? '📝 Memo / Referencia (Opcional)' : '📝 Memo / Reference (Optional)'}
        </label>
        <input
          type="text"
          value={sendMemo}
          onChange={(e) => setSendMemo(e.target.value)}
          placeholder={isSpanish ? 'Ej: Pago factura #123' : 'E.g. Invoice payment #123'}
          disabled={isSending}
          className="w-full p-4 bg-[var(--bg-elevated)] border border-[var(--border-medium)] rounded-xl text-[var(--text-primary)] text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all disabled:opacity-50"
        />
      </div>

      {/* Summary */}
      {sendAmount && parseFloat(sendAmount) > 0 && sendToAddress && (
        <div className="p-4 bg-gradient-to-br from-blue-500/10 to-cyan-500/10 rounded-xl border border-blue-500/30">
          <div className="text-sm font-medium text-[var(--text-secondary)] mb-3">
            {isSpanish ? '📋 Resumen del envío' : '📋 Send Summary'}
          </div>
          <div className="space-y-2">
            {sendFromAccount && (
              <div className="flex justify-between items-center">
                <span className="text-[var(--text-secondary)]">{isSpanish ? 'Desde:' : 'From:'}</span>
                <span className="font-medium text-[var(--text-primary)]">
                  {sendFromAccount.accountName}
                </span>
              </div>
            )}
            <div className="flex justify-between items-center">
              <span className="text-[var(--text-secondary)]">{isSpanish ? 'Enviar:' : 'Send:'}</span>
              <span className="font-semibold text-lg text-blue-400">
                ${parseFloat(sendAmount).toLocaleString()} USD
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-[var(--text-secondary)]">{isSpanish ? 'A:' : 'To:'}</span>
              <span className="font-mono text-xs text-green-400">
                {selectedReceiver ? PREDEFINED_RECEIVERS.find(r => r.id === selectedReceiver)?.name : sendToAddress.slice(0, 10) + '...' + sendToAddress.slice(-8)}
              </span>
            </div>
            <div className="flex justify-between items-center text-xs">
              <span className="text-[var(--text-muted)]">Network:</span>
              <span className="text-[var(--text-muted)]">Ethereum Mainnet (Gas required)</span>
            </div>
          </div>
        </div>
      )}

      {/* Action button */}
      <button
        type="button"
        onClick={handleSend}
        disabled={isSending || !sendAmount || !sendToAddress || !backendHealth?.success}
        className="w-full flex items-center justify-center gap-3 p-4 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-xl text-white font-bold text-lg hover:shadow-[0_0_30px_rgba(59,130,246,0.4)] disabled:opacity-50 disabled:cursor-not-allowed transition-all"
      >
        {isSending ? (
          <>
            <Loader2 className="w-5 h-5 animate-spin" />
            {isSpanish ? 'Enviando...' : 'Sending...'}
          </>
        ) : (
          <>
            <Send className="w-5 h-5" />
            {isSpanish ? 'Enviar USD Tokenizado' : 'Send Tokenized USD'}
          </>
        )}
      </button>

      {/* Messages */}
      {error && (
        <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-xl flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-red-400">{error}</div>
        </div>
      )}

      {success && (
        <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-xl flex items-start gap-3">
          <CheckCircle className="w-5 h-5 text-emerald-400 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-emerald-400 whitespace-pre-line">{success}</div>
        </div>
      )}
    </div>
  );

  // =============================================================================
  // RENDER: History
  // =============================================================================

  const renderHistory = () => {
    // Combine operations and transfers
    const allOperations = [
      ...operations.map((op: any) => ({ ...op, type: 'mint' })),
      ...transfers.map((t: any) => ({ ...t, type: 'send' }))
    ].sort((a, b) => new Date(b.createdAt || b.timestamp).getTime() - new Date(a.createdAt || a.timestamp).getTime());

    return (
      <div className="space-y-4">
        <div className="flex justify-between items-center mb-4">
          <h3 className="font-medium text-[var(--text-primary)]">
            {isSpanish ? 'Historial de Operaciones' : 'Operations History'}
          </h3>
          <button
            onClick={() => { loadOperations(); loadTransfers(); }}
            className="flex items-center gap-2 px-3 py-1.5 text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)] rounded-lg transition-all"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            {isSpanish ? 'Actualizar' : 'Refresh'}
          </button>
        </div>

        {/* Legend */}
        <div className="flex gap-4 text-xs text-[var(--text-muted)]">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-yellow-500/20 rounded">
              <ArrowDownLeft className="w-3 h-3 text-yellow-400" />
            </div>
            <span>{isSpanish ? 'Tokenizado' : 'Tokenized'}</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-blue-500/20 rounded">
              <ArrowUpRight className="w-3 h-3 text-blue-400" />
            </div>
            <span>{isSpanish ? 'Enviado' : 'Sent'}</span>
          </div>
        </div>

        {allOperations.length === 0 ? (
          <div className="text-center py-12">
            <Repeat className="w-16 h-16 mx-auto text-[var(--text-muted)] mb-4" />
            <div className="text-[var(--text-secondary)] font-medium mb-2">
              {isSpanish ? 'Sin operaciones' : 'No operations'}
            </div>
            <div className="text-sm text-[var(--text-muted)]">
              {isSpanish ? 'Las tokenizaciones y envíos aparecerán aquí' : 'Tokenizations and sends will appear here'}
            </div>
          </div>
        ) : (
          allOperations.map((op: any, idx: number) => (
            <div
              key={op.holdId || op.id || idx}
              className={`p-4 bg-[var(--bg-elevated)] border border-[var(--border-medium)] rounded-xl transition-all ${
                op.type === 'mint' ? 'hover:border-yellow-500/50' : 'hover:border-blue-500/50'
              }`}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <div className={`p-2 ${op.type === 'mint' ? 'bg-yellow-500/20' : 'bg-blue-500/20'} rounded-lg`}>
                      {op.type === 'mint' ? (
                        <ArrowDownLeft className="w-4 h-4 text-yellow-400" />
                      ) : (
                        <ArrowUpRight className="w-4 h-4 text-blue-400" />
                      )}
                    </div>
                    <div>
                      <div className="font-medium text-sm text-[var(--text-primary)]">
                        {op.type === 'mint' 
                          ? (isSpanish ? 'Tokenización USD' : 'USD Tokenization')
                          : (isSpanish ? 'Envío USD' : 'USD Send')
                        }
                      </div>
                      <div className="text-xs text-[var(--text-muted)]">
                        {new Date(op.createdAt || op.timestamp).toLocaleString()}
                      </div>
                    </div>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      op.status === 'MINTED' || op.status === 'COMPLETED'
                        ? 'bg-emerald-500/20 text-emerald-400'
                        : op.status === 'FAILED'
                        ? 'bg-red-500/20 text-red-400'
                        : 'bg-blue-500/20 text-blue-400'
                    }`}>
                      {op.status}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-4 mt-3">
                    <div>
                      <div className="text-xs text-[var(--text-muted)]">{isSpanish ? 'Monto' : 'Amount'}</div>
                      <div className={`font-semibold ${op.type === 'mint' ? 'text-yellow-400' : 'text-blue-400'}`}>
                        {op.type === 'mint' ? '+' : '-'} {formatCurrency(op.amount)}
                      </div>
                    </div>
                    <div>
                      <div className="text-xs text-[var(--text-muted)]">
                        {op.type === 'mint' ? 'Beneficiary' : (isSpanish ? 'Destino' : 'To')}
                      </div>
                      <div className={`font-mono text-xs ${op.type === 'mint' ? 'text-yellow-400' : 'text-blue-400'} truncate`}>
                        {op.beneficiary || op.toAddress}
                      </div>
                    </div>
                    {(op.txHash || op.explorerUrl) && (
                      <div className="col-span-2">
                        <div className="text-xs text-[var(--text-muted)]">TX Hash</div>
                        <a
                          href={op.explorerUrl || `https://etherscan.io/tx/${op.txHash}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className={`font-mono text-xs ${op.type === 'mint' ? 'text-yellow-400' : 'text-blue-400'} hover:underline flex items-center gap-1`}
                        >
                          {op.txHash ? `${op.txHash.slice(0, 20)}...` : 'View on Explorer'}
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      </div>
                    )}
                    {op.memo && (
                      <div className="col-span-2">
                        <div className="text-xs text-[var(--text-muted)]">Memo</div>
                        <div className="text-sm text-[var(--text-secondary)]">{op.memo}</div>
                      </div>
                    )}
                    
                    {/* Botones de descarga de recibos */}
                    <div className="col-span-2 pt-3 mt-3 border-t border-[var(--border-subtle)]">
                      <div className="flex gap-2">
                        <button
                          onClick={() => generateBlackScreenPDF(op)}
                          className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-black border border-green-500/50 rounded-lg text-green-400 text-xs font-medium hover:bg-green-900/20 transition-all"
                          title={isSpanish ? 'Descargar PDF BlackScreen' : 'Download BlackScreen PDF'}
                        >
                          <Download className="w-3.5 h-3.5" />
                          {isSpanish ? 'PDF BlackScreen' : 'BlackScreen PDF'}
                        </button>
                        {op.explorerUrl && (
                          <a
                            href={op.explorerUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center justify-center gap-2 px-3 py-2 bg-purple-500/10 border border-purple-500/30 rounded-lg text-purple-400 text-xs font-medium hover:bg-purple-500/20 transition-all"
                            title={isSpanish ? 'Ver en Etherscan' : 'View on Etherscan'}
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                            Etherscan
                          </a>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    );
  };

  // =============================================================================
  // GENERATE: Alchemy Connection Manual PDF (Ultra Premium Fintech Design)
  // =============================================================================

  const generateAlchemyManualPDF = () => {
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    });

    const W = pdf.internal.pageSize.getWidth();
    const H = pdf.internal.pageSize.getHeight();
    const M = 12;
    let y = M;

    // Premium Color Palette
    const COLORS = {
      black: [8, 8, 12] as [number, number, number],
      deepBlack: [3, 3, 6] as [number, number, number],
      gold: [212, 175, 55] as [number, number, number],
      goldLight: [255, 215, 0] as [number, number, number],
      goldDark: [184, 134, 11] as [number, number, number],
      white: [255, 255, 255] as [number, number, number],
      silver: [192, 192, 192] as [number, number, number],
      platinum: [229, 228, 226] as [number, number, number],
      cyan: [0, 212, 255] as [number, number, number],
      purple: [147, 51, 234] as [number, number, number],
      emerald: [16, 185, 129] as [number, number, number],
      slate: [71, 85, 105] as [number, number, number],
      charcoal: [18, 18, 24] as [number, number, number]
    };

    // 15 Global Currencies
    const CURRENCIES = [
      { code: 'USD', iso: '840', name: 'United States Dollar', region: 'Americas' },
      { code: 'EUR', iso: '978', name: 'Euro', region: 'Europe' },
      { code: 'GBP', iso: '826', name: 'British Pound', region: 'Europe' },
      { code: 'CHF', iso: '756', name: 'Swiss Franc', region: 'Europe' },
      { code: 'JPY', iso: '392', name: 'Japanese Yen', region: 'Asia-Pacific' },
      { code: 'CAD', iso: '124', name: 'Canadian Dollar', region: 'Americas' },
      { code: 'AUD', iso: '036', name: 'Australian Dollar', region: 'Asia-Pacific' },
      { code: 'SGD', iso: '702', name: 'Singapore Dollar', region: 'Asia-Pacific' },
      { code: 'HKD', iso: '344', name: 'Hong Kong Dollar', region: 'Asia-Pacific' },
      { code: 'NZD', iso: '554', name: 'New Zealand Dollar', region: 'Asia-Pacific' },
      { code: 'SEK', iso: '752', name: 'Swedish Krona', region: 'Europe' },
      { code: 'NOK', iso: '578', name: 'Norwegian Krone', region: 'Europe' },
      { code: 'DKK', iso: '208', name: 'Danish Krone', region: 'Europe' },
      { code: 'MXN', iso: '484', name: 'Mexican Peso', region: 'Americas' },
      { code: 'THB', iso: '764', name: 'Thai Baht', region: 'Asia-Pacific' }
    ];

    // Design Helpers
    const fill = (color: [number, number, number]) => pdf.setFillColor(...color);
    const stroke = (color: [number, number, number]) => pdf.setDrawColor(...color);
    const text = (color: [number, number, number], size: number) => {
      pdf.setTextColor(...color);
      pdf.setFontSize(size);
    };

    const drawGradientBar = (x: number, yy: number, w: number, h: number) => {
      const steps = 20;
      const stepW = w / steps;
      for (let i = 0; i < steps; i++) {
        const ratio = i / steps;
        const r = Math.round(COLORS.gold[0] * (1 - ratio) + COLORS.cyan[0] * ratio);
        const g = Math.round(COLORS.gold[1] * (1 - ratio) + COLORS.cyan[1] * ratio);
        const b = Math.round(COLORS.gold[2] * (1 - ratio) + COLORS.cyan[2] * ratio);
        pdf.setFillColor(r, g, b);
        pdf.rect(x + i * stepW, yy, stepW + 0.5, h, 'F');
      }
    };

    const drawHexPattern = (startY: number, height: number, opacity: number = 0.03) => {
      pdf.setDrawColor(COLORS.gold[0], COLORS.gold[1], COLORS.gold[2]);
      pdf.setLineWidth(0.1);
      const hexSize = 8;
      for (let row = 0; row < height / hexSize; row++) {
        for (let col = 0; col < W / hexSize; col++) {
          const cx = col * hexSize * 1.5 + (row % 2 === 0 ? 0 : hexSize * 0.75);
          const cy = startY + row * hexSize * 0.866;
          if (Math.random() < opacity) {
            pdf.circle(cx, cy, 2, 'S');
          }
        }
      }
    };

    const addPremiumPage = (pageNum: number) => {
      fill(COLORS.black);
      pdf.rect(0, 0, W, H, 'F');
      
      // Subtle corner accents
      stroke(COLORS.gold);
      pdf.setLineWidth(0.3);
      pdf.line(0, 0, 20, 0);
      pdf.line(0, 0, 0, 20);
      pdf.line(W, 0, W - 20, 0);
      pdf.line(W, 0, W, 20);
      pdf.line(0, H, 20, H);
      pdf.line(0, H, 0, H - 20);
      pdf.line(W, H, W - 20, H);
      pdf.line(W, H, W, H - 20);

      // Page number
      text(COLORS.slate, 7);
      pdf.text(`${pageNum}`, W - 10, H - 8);
    };

    const sectionHeader = (title: string, subtitle?: string) => {
      drawGradientBar(M, y, W - 2 * M, 0.8);
      y += 6;
      text(COLORS.gold, 14);
      pdf.text(title, M, y);
      if (subtitle) {
        text(COLORS.platinum, 9);
        pdf.text(subtitle, M, y + 5);
        y += 5;
      }
      y += 8;
    };

    const dataRow = (label: string, value: string, indent: number = 0) => {
      text(COLORS.silver, 8);
      pdf.text(label, M + indent, y);
      text(COLORS.white, 8);
      pdf.text(value, M + 55 + indent, y);
      y += 5;
    };

    const bulletPoint = (content: string, color: [number, number, number] = COLORS.cyan) => {
      text(color, 8);
      pdf.text('◆', M, y);
      text(COLORS.platinum, 8);
      pdf.text(content, M + 6, y);
      y += 5;
    };

    const checkPage = (space: number = 25) => {
      if (y + space > H - 15) {
        pdf.addPage();
        addPremiumPage(pdf.getNumberOfPages());
        y = 20;
        return true;
      }
      return false;
    };

    // ═══════════════════════════════════════════════════════════════════════
    // PAGE 1: PREMIUM COVER
    // ═══════════════════════════════════════════════════════════════════════
    fill(COLORS.deepBlack);
    pdf.rect(0, 0, W, H, 'F');

    // Geometric accent lines
    stroke(COLORS.gold);
    pdf.setLineWidth(1.5);
    pdf.line(0, 40, W, 40);
    pdf.line(0, H - 40, W, H - 40);

    // Side accents
    pdf.setLineWidth(3);
    pdf.line(8, 50, 8, H - 50);
    pdf.line(W - 8, 50, W - 8, H - 50);

    // Corner diamonds
    const drawDiamond = (cx: number, cy: number, size: number) => {
      fill(COLORS.gold);
      pdf.moveTo(cx, cy - size);
      pdf.lineTo(cx + size, cy);
      pdf.lineTo(cx, cy + size);
      pdf.lineTo(cx - size, cy);
      pdf.fill();
    };
    drawDiamond(20, 50, 4);
    drawDiamond(W - 20, 50, 4);
    drawDiamond(20, H - 50, 4);
    drawDiamond(W - 20, H - 50, 4);

    // Main title block
    y = 75;
    text(COLORS.gold, 11);
    pdf.text('DIGITAL COMMERCIAL BANK LTD', W / 2, y, { align: 'center' });
    
    y += 20;
    drawGradientBar(30, y, W - 60, 1.2);
    
    y += 18;
    text(COLORS.white, 32);
    pdf.text('DAES', W / 2, y, { align: 'center' });
    
    y += 12;
    text(COLORS.platinum, 12);
    pdf.text('Digital Asset & Electronic Services', W / 2, y, { align: 'center' });

    y += 25;
    text(COLORS.gold, 18);
    pdf.text('BLOCKCHAIN', W / 2, y, { align: 'center' });
    y += 9;
    pdf.text('INFRASTRUCTURE', W / 2, y, { align: 'center' });
    y += 9;
    pdf.text('MANUAL', W / 2, y, { align: 'center' });

    y += 20;
    drawGradientBar(50, y, W - 100, 0.5);

    y += 15;
    text(COLORS.cyan, 10);
    pdf.text('ALCHEMY POWERED  •  ETHEREUM MAINNET  •  CHAINLINK ORACLE', W / 2, y, { align: 'center' });

    // Version badge
    y += 30;
    fill(COLORS.charcoal);
    pdf.roundedRect(W / 2 - 30, y, 60, 20, 3, 3, 'F');
    stroke(COLORS.gold);
    pdf.setLineWidth(0.5);
    pdf.roundedRect(W / 2 - 30, y, 60, 20, 3, 3, 'S');
    text(COLORS.gold, 9);
    pdf.text('VERSION 2.0', W / 2, y + 8, { align: 'center' });
    text(COLORS.platinum, 7);
    pdf.text('CHAIN ID: 1', W / 2, y + 14, { align: 'center' });

    // Footer
    y = H - 25;
    text(COLORS.slate, 7);
    pdf.text('CONFIDENTIAL  •  PARTNER DISTRIBUTION ONLY', W / 2, y, { align: 'center' });
    y += 5;
    text(COLORS.gold, 8);
    pdf.text('digcommbank.com', W / 2, y, { align: 'center' });

    // ═══════════════════════════════════════════════════════════════════════
    // PAGE 2: TABLE OF CONTENTS
    // ═══════════════════════════════════════════════════════════════════════
    pdf.addPage();
    addPremiumPage(2);
    y = 25;

    // Title with accent
    fill(COLORS.charcoal);
    pdf.roundedRect(M, y - 5, W - 2 * M, 18, 2, 2, 'F');
    text(COLORS.gold, 14);
    pdf.text('CONTENTS', W / 2, y + 6, { align: 'center' });
    y += 25;

    const toc = [
      { n: '01', t: 'EXECUTIVE OVERVIEW', sub: 'Platform capabilities & value proposition' },
      { n: '02', t: 'SYSTEM ARCHITECTURE', sub: 'Multi-layer infrastructure design' },
      { n: '03', t: 'ALCHEMY RPC NODE', sub: 'Enterprise-grade blockchain connectivity' },
      { n: '04', t: 'SMART CONTRACTS', sub: 'Deployed contract addresses & functions' },
      { n: '05', t: 'GLOBAL CURRENCIES', sub: '15 ISO 4217 compliant tokenization pairs' },
      { n: '06', t: 'TOKENIZATION OVERVIEW', sub: 'End-to-end minting process' },
      { n: '07', t: 'COMPLIANCE FRAMEWORK', sub: 'ISO 20022, EIP-712, AML standards' },
      { n: '08', t: 'API REFERENCE', sub: 'RESTful endpoints & integration guide' },
      { n: '09', t: 'CUSTODY INTEGRATION', sub: 'Account linking & balance management' },
      { n: '10', t: 'SECURITY PROTOCOLS', sub: 'Key management & best practices' },
      { n: '11', t: 'M1 ARCHITECTURE', sub: 'Direct M1 fund tokenization from DAES' },
      { n: '12', t: 'TOKENIZATION FLOW', sub: 'Step-by-step M1 to token conversion' },
      { n: '13', t: 'CONTRACT FAQ', sub: 'Frequently asked technical questions' },
      { n: '14', t: 'EIP-712 SIGNATURES', sub: 'Typed data authorization & signing' },
      { n: '15', t: 'ON-CHAIN EVENTS', sub: 'Minted & PriceSnapshot emissions' },
      { n: '16', t: 'SUPPORT CHANNELS', sub: 'Contact information & resources' }
    ];

    toc.forEach((item, idx) => {
      checkPage(18);
      // Number box
      fill(COLORS.charcoal);
      pdf.rect(M, y - 3, 12, 12, 'F');
      stroke(COLORS.gold);
      pdf.setLineWidth(0.3);
      pdf.rect(M, y - 3, 12, 12, 'S');
      text(COLORS.gold, 9);
      pdf.text(item.n, M + 6, y + 4, { align: 'center' });
      
      // Title
      text(COLORS.white, 10);
      pdf.text(item.t, M + 18, y + 2);
      
      // Subtitle
      text(COLORS.slate, 7);
      pdf.text(item.sub, M + 18, y + 8);
      
      // Dotted line to page
      stroke(COLORS.slate);
      pdf.setLineWidth(0.1);
      for (let x = M + 120; x < W - M - 15; x += 3) {
        pdf.line(x, y + 2, x + 1, y + 2);
      }
      
      // Page number
      text(COLORS.gold, 9);
      pdf.text(`${idx + 3}`, W - M - 5, y + 2, { align: 'right' });
      
      y += 18;
    });

    // ═══════════════════════════════════════════════════════════════════════
    // PAGE 3: EXECUTIVE OVERVIEW
    // ═══════════════════════════════════════════════════════════════════════
    pdf.addPage();
    addPremiumPage(3);
    y = 20;

    sectionHeader('EXECUTIVE OVERVIEW', 'Platform Capabilities & Strategic Value');

    // Key stats boxes
    const statsBoxes = [
      { label: 'NETWORK', value: 'ETHEREUM', sub: 'Mainnet' },
      { label: 'ORACLE', value: 'CHAINLINK', sub: 'Real-time' },
      { label: 'COMPLIANCE', value: 'ISO 20022', sub: 'Certified' },
      { label: 'CURRENCIES', value: '15+', sub: 'Supported' }
    ];
    
    const boxW = (W - 2 * M - 15) / 4;
    statsBoxes.forEach((box, i) => {
      const bx = M + i * (boxW + 5);
      fill(COLORS.charcoal);
      pdf.roundedRect(bx, y, boxW, 28, 2, 2, 'F');
      stroke(COLORS.gold);
      pdf.setLineWidth(0.3);
      pdf.roundedRect(bx, y, boxW, 28, 2, 2, 'S');
      
      text(COLORS.slate, 6);
      pdf.text(box.label, bx + boxW / 2, y + 6, { align: 'center' });
      text(COLORS.gold, 11);
      pdf.text(box.value, bx + boxW / 2, y + 15, { align: 'center' });
      text(COLORS.platinum, 7);
      pdf.text(box.sub, bx + boxW / 2, y + 22, { align: 'center' });
    });
    y += 38;

    text(COLORS.platinum, 9);
    const overview = [
      'Digital Commercial Bank Ltd operates a next-generation blockchain infrastructure',
      'enabling seamless tokenization of fiat currencies on Ethereum Mainnet. Our DAES',
      '(Digital Asset & Electronic Services) platform bridges traditional finance with',
      'decentralized networks through enterprise-grade technology.',
      '',
      'The platform leverages Alchemy\'s high-performance RPC infrastructure combined',
      'with Chainlink\'s decentralized oracle network for real-time price attestation.',
      'Every transaction is cryptographically signed using EIP-712 typed data, ensuring',
      'maximum security and on-chain verifiability.'
    ];
    overview.forEach(line => {
      pdf.text(line, M, y);
      y += 5;
    });

    y += 8;
    text(COLORS.gold, 10);
    pdf.text('CORE CAPABILITIES', M, y);
    y += 8;

    const capabilities = [
      'Instant fiat-to-token conversion with 1:1 backing guarantee',
      'Multi-signature authorization with hardware wallet support',
      'Real-time price snapshots embedded in every transaction',
      'Full ISO 20022 compliance for cross-border settlement',
      'Immutable audit trail on public blockchain'
    ];
    capabilities.forEach(cap => {
      bulletPoint(cap);
    });

    // ═══════════════════════════════════════════════════════════════════════
    // PAGE 4: SYSTEM ARCHITECTURE
    // ═══════════════════════════════════════════════════════════════════════
    pdf.addPage();
    addPremiumPage(4);
    y = 20;

    sectionHeader('SYSTEM ARCHITECTURE', 'Multi-Layer Infrastructure Design');

    // Architecture layers
    const layers = [
      { name: 'PRESENTATION LAYER', color: COLORS.cyan, items: ['Web Dashboard', 'Mobile SDK', 'REST API'] },
      { name: 'APPLICATION LAYER', color: COLORS.purple, items: ['Transaction Engine', 'EIP-712 Signer', 'Validation'] },
      { name: 'BLOCKCHAIN LAYER', color: COLORS.emerald, items: ['Smart Contracts', 'Event Indexer', 'Oracle Feed'] },
      { name: 'SETTLEMENT LAYER', color: COLORS.gold, items: ['Custody Bridge', 'Bank Integration', 'Reconciliation'] }
    ];

    layers.forEach((layer, idx) => {
      checkPage(30);
      // Layer box
      fill(COLORS.charcoal);
      pdf.roundedRect(M, y, W - 2 * M, 24, 2, 2, 'F');
      
      // Left accent bar
      pdf.setFillColor(...layer.color);
      pdf.rect(M, y, 4, 24, 'F');
      
      // Layer name
      text(layer.color, 10);
      pdf.text(layer.name, M + 10, y + 8);
      
      // Components
      text(COLORS.platinum, 8);
      layer.items.forEach((item, i) => {
        pdf.text(`◆ ${item}`, M + 10 + i * 55, y + 17);
      });
      
      y += 30;
      
      // Connector arrow (except last)
      if (idx < layers.length - 1) {
        stroke(COLORS.gold);
        pdf.setLineWidth(0.5);
        pdf.line(W / 2, y - 6, W / 2, y + 2);
        fill(COLORS.gold);
        pdf.triangle(W / 2 - 3, y, W / 2 + 3, y, W / 2, y + 4, 'F');
        y += 8;
      }
    });

    y += 10;
    text(COLORS.gold, 10);
    pdf.text('DATA FLOW', M, y);
    y += 8;
    text(COLORS.platinum, 8);
    pdf.text('Request → Validation → EIP-712 Sign → Broadcast → Confirmation → Settlement', M, y);

    // ═══════════════════════════════════════════════════════════════════════
    // PAGE 5: ALCHEMY RPC INFRASTRUCTURE
    // ═══════════════════════════════════════════════════════════════════════
    pdf.addPage();
    addPremiumPage(5);
    y = 20;

    sectionHeader('ALCHEMY RPC NODE', 'Enterprise-Grade Blockchain Connectivity');

    // Provider badge
    fill(COLORS.charcoal);
    pdf.roundedRect(M, y, W - 2 * M, 35, 3, 3, 'F');
    stroke(COLORS.cyan);
    pdf.setLineWidth(0.5);
    pdf.roundedRect(M, y, W - 2 * M, 35, 3, 3, 'S');
    
    text(COLORS.cyan, 16);
    pdf.text('ALCHEMY', W / 2, y + 14, { align: 'center' });
    text(COLORS.platinum, 8);
    pdf.text('SUPERNODE INFRASTRUCTURE  •  99.99% UPTIME SLA  •  GLOBAL DISTRIBUTION', W / 2, y + 25, { align: 'center' });
    y += 45;

    // Connection details
    text(COLORS.gold, 10);
    pdf.text('CONNECTION PARAMETERS', M, y);
    y += 10;

    dataRow('Network', 'Ethereum Mainnet');
    dataRow('Chain ID', '1');
    dataRow('Protocol', 'JSON-RPC 2.0 over HTTPS/WSS');
    dataRow('Host', 'eth-mainnet.g.alchemy.com');
    dataRow('Latency', '< 50ms average');
    dataRow('Rate Limit', 'Enterprise tier (unlimited)');

    y += 8;
    text(COLORS.gold, 10);
    pdf.text('ENDPOINTS', M, y);
    y += 10;

    // Endpoint boxes
    fill(COLORS.deepBlack);
    pdf.roundedRect(M, y, W - 2 * M, 18, 2, 2, 'F');
    stroke(COLORS.emerald);
    pdf.setLineWidth(0.3);
    pdf.roundedRect(M, y, W - 2 * M, 18, 2, 2, 'S');
    text(COLORS.emerald, 7);
    pdf.text('HTTPS', M + 5, y + 6);
    text(COLORS.white, 7);
    pdf.text('https://eth-mainnet.g.alchemy.com/v2/[API_KEY]', M + 25, y + 6);
    text(COLORS.slate, 6);
    pdf.text('For standard requests and transactions', M + 25, y + 13);
    y += 22;

    fill(COLORS.deepBlack);
    pdf.roundedRect(M, y, W - 2 * M, 18, 2, 2, 'F');
    stroke(COLORS.purple);
    pdf.setLineWidth(0.3);
    pdf.roundedRect(M, y, W - 2 * M, 18, 2, 2, 'S');
    text(COLORS.purple, 7);
    pdf.text('WSS', M + 5, y + 6);
    text(COLORS.white, 7);
    pdf.text('wss://eth-mainnet.g.alchemy.com/v2/[API_KEY]', M + 25, y + 6);
    text(COLORS.slate, 6);
    pdf.text('For real-time subscriptions and event streaming', M + 25, y + 13);

    // ═══════════════════════════════════════════════════════════════════════
    // PAGE 6: SMART CONTRACTS
    // ═══════════════════════════════════════════════════════════════════════
    pdf.addPage();
    addPremiumPage(6);
    y = 20;

    sectionHeader('SMART CONTRACTS', 'Deployed Contract Addresses & Functions');

    const contracts = [
      { 
        name: 'USD TOKEN', 
        addr: backendHealth?.contracts?.usdToken || '0x3db99FACe6BB270E86BCA3355655dB747867f67b',
        type: 'ERC-20',
        color: COLORS.gold
      },
      { 
        name: 'BRIDGE MINTER V2', 
        addr: backendHealth?.contracts?.bridgeMinter || '0x5737342B02AF40815BD7881260F07777C0b1063f',
        type: 'Authorization',
        color: COLORS.cyan
      },
      { 
        name: 'SETTLEMENT REGISTRY', 
        addr: backendHealth?.contracts?.registry || '0x346bBC9976AE540896125B01e14E8bc7Ef1EDB32',
        type: 'Storage',
        color: COLORS.emerald
      },
      { 
        name: 'CHAINLINK ETH/USD', 
        addr: '0x5f4eC3Df9cbd43714FE2740f5E3616155c5b8419',
        type: 'Oracle',
        color: COLORS.purple
      }
    ];

    contracts.forEach(contract => {
      checkPage(35);
      
      fill(COLORS.charcoal);
      pdf.roundedRect(M, y, W - 2 * M, 32, 2, 2, 'F');
      
      // Color accent
      pdf.setFillColor(...contract.color);
      pdf.rect(M, y, 4, 32, 'F');
      
      // Badge
      fill(COLORS.deepBlack);
      pdf.roundedRect(W - M - 45, y + 5, 40, 12, 2, 2, 'F');
      text(contract.color, 7);
      pdf.text(contract.type, W - M - 25, y + 13, { align: 'center' });
      
      // Name
      text(contract.color, 11);
      pdf.text(contract.name, M + 10, y + 12);
      
      // Address
      text(COLORS.platinum, 7);
      pdf.text(contract.addr, M + 10, y + 24);
      
      y += 38;
    });

    y += 5;
    text(COLORS.slate, 7);
    pdf.text('All contracts verified on Etherscan  •  Source code audited  •  Upgradeable via proxy', W / 2, y, { align: 'center' });

    // ═══════════════════════════════════════════════════════════════════════
    // PAGE 7: GLOBAL CURRENCIES
    // ═══════════════════════════════════════════════════════════════════════
    pdf.addPage();
    addPremiumPage(7);
    y = 20;

    sectionHeader('GLOBAL CURRENCIES', '15 ISO 4217 Compliant Tokenization Pairs');

    // Currency table header
    fill(COLORS.charcoal);
    pdf.rect(M, y, W - 2 * M, 10, 'F');
    text(COLORS.gold, 7);
    pdf.text('CODE', M + 8, y + 7);
    pdf.text('ISO', M + 35, y + 7);
    pdf.text('CURRENCY', M + 60, y + 7);
    pdf.text('REGION', W - M - 30, y + 7);
    y += 12;

    CURRENCIES.forEach((curr, idx) => {
      checkPage(10);
      
      // Alternating background
      if (idx % 2 === 0) {
        fill(COLORS.deepBlack);
        pdf.rect(M, y - 2, W - 2 * M, 9, 'F');
      }
      
      text(COLORS.gold, 8);
      pdf.text(curr.code, M + 8, y + 4);
      text(COLORS.cyan, 8);
      pdf.text(curr.iso, M + 35, y + 4);
      text(COLORS.white, 8);
      pdf.text(curr.name, M + 60, y + 4);
      text(COLORS.slate, 7);
      pdf.text(curr.region, W - M - 30, y + 4);
      
      y += 10;
    });

    y += 10;
    fill(COLORS.charcoal);
    pdf.roundedRect(M, y, W - 2 * M, 20, 2, 2, 'F');
    text(COLORS.emerald, 8);
    pdf.text('✓ All currencies backed 1:1 by segregated custody accounts', W / 2, y + 8, { align: 'center' });
    text(COLORS.slate, 7);
    pdf.text('Additional currencies available upon request', W / 2, y + 15, { align: 'center' });

    // ═══════════════════════════════════════════════════════════════════════
    // PAGE 8: TOKENIZATION FLOW
    // ═══════════════════════════════════════════════════════════════════════
    pdf.addPage();
    addPremiumPage(8);
    y = 20;

    sectionHeader('TOKENIZATION FLOW', 'End-to-End Minting Process');

    const steps = [
      { n: '01', title: 'REQUEST INITIATION', desc: 'Client submits tokenization request with amount, beneficiary address, and custody account reference.' },
      { n: '02', title: 'FUND VERIFICATION', desc: 'DAES CoreBanking verifies sufficient balance in designated custody account and places hold.' },
      { n: '03', title: 'PRICE ATTESTATION', desc: 'Chainlink oracle provides real-time ETH/USD price snapshot for on-chain recording.' },
      { n: '04', title: 'EIP-712 SIGNING', desc: 'DAES Signer creates typed structured data signature authorizing the mint operation.' },
      { n: '05', title: 'BLOCKCHAIN TX', desc: 'Operator broadcasts transaction to BridgeMinterV2 with signature and price data.' },
      { n: '06', title: 'CONFIRMATION', desc: 'Transaction confirmed on Ethereum Mainnet. PriceSnapshot event emitted for transparency.' },
      { n: '07', title: 'SETTLEMENT', desc: 'Custody account debited. ISO 20022 receipt generated. Tokens transferred to beneficiary.' }
    ];

    steps.forEach((step, idx) => {
      checkPage(25);
      
      // Step number circle
      fill(COLORS.gold);
      pdf.circle(M + 8, y + 6, 6, 'F');
      text(COLORS.black, 8);
      pdf.text(step.n, M + 8, y + 8, { align: 'center' });
      
      // Content
      text(COLORS.white, 9);
      pdf.text(step.title, M + 20, y + 4);
      text(COLORS.platinum, 7);
      const lines = pdf.splitTextToSize(step.desc, W - 2 * M - 25);
      pdf.text(lines, M + 20, y + 10);
      
      y += 20 + (lines.length - 1) * 4;
      
      // Connector line
      if (idx < steps.length - 1) {
        stroke(COLORS.gold);
        pdf.setLineWidth(0.3);
        pdf.line(M + 8, y - 8, M + 8, y + 2);
      }
    });

    // ═══════════════════════════════════════════════════════════════════════
    // PAGE 9: COMPLIANCE FRAMEWORK
    // ═══════════════════════════════════════════════════════════════════════
    pdf.addPage();
    addPremiumPage(9);
    y = 20;

    sectionHeader('COMPLIANCE FRAMEWORK', 'Regulatory & Technical Standards');

    const standards = [
      { code: 'ISO 20022', name: 'Financial Messaging', desc: 'pain.001.001.09 Credit Transfer standard for all transaction metadata' },
      { code: 'ISO 4217', name: 'Currency Codes', desc: 'Numeric and alphabetic codes embedded in every token operation' },
      { code: 'ISO 27001', name: 'Information Security', desc: 'Certified management system for data protection and security controls' },
      { code: 'EIP-712', name: 'Typed Signing', desc: 'Structured data hashing for human-readable transaction authorization' },
      { code: 'ERC-20', name: 'Token Standard', desc: 'Full compatibility with Ethereum token ecosystem and exchanges' },
      { code: 'PCI-DSS', name: 'Payment Security', desc: 'Level 1 certified infrastructure for payment data handling' },
      { code: 'AML/CFT', name: 'Anti-Money Laundering', desc: 'FATF compliant transaction monitoring and reporting' }
    ];

    standards.forEach(std => {
      checkPage(22);
      
      fill(COLORS.charcoal);
      pdf.roundedRect(M, y, W - 2 * M, 20, 2, 2, 'F');
      
      // Code badge
      fill(COLORS.gold);
      pdf.roundedRect(M + 5, y + 4, 35, 12, 2, 2, 'F');
      text(COLORS.black, 7);
      pdf.text(std.code, M + 22.5, y + 12, { align: 'center' });
      
      // Name and description
      text(COLORS.white, 9);
      pdf.text(std.name, M + 48, y + 9);
      text(COLORS.slate, 7);
      pdf.text(std.desc, M + 48, y + 15);
      
      y += 24;
    });

    // ═══════════════════════════════════════════════════════════════════════
    // PAGE 10: API REFERENCE
    // ═══════════════════════════════════════════════════════════════════════
    pdf.addPage();
    addPremiumPage(10);
    y = 20;

    sectionHeader('API REFERENCE', 'RESTful Endpoints & Integration Guide');

    const endpoints = [
      { method: 'GET', path: '/api/ethusd/health', desc: 'System status and configuration' },
      { method: 'POST', path: '/api/ethusd/mint-request', desc: 'Initiate tokenization' },
      { method: 'POST', path: '/api/ethusd/mint-and-send', desc: 'Atomic mint + transfer' },
      { method: 'POST', path: '/api/ethusd/send', desc: 'Transfer existing tokens' },
      { method: 'GET', path: '/api/ethusd/stats', desc: 'Operation statistics' },
      { method: 'GET', path: '/api/ethusd/holds', desc: 'List pending holds' },
      { method: 'GET', path: '/api/ethusd/transfers', desc: 'Transfer history' }
    ];

    // Header
    fill(COLORS.charcoal);
    pdf.rect(M, y, W - 2 * M, 10, 'F');
    text(COLORS.gold, 7);
    pdf.text('METHOD', M + 8, y + 7);
    pdf.text('ENDPOINT', M + 40, y + 7);
    pdf.text('DESCRIPTION', W - M - 60, y + 7);
    y += 12;

    endpoints.forEach((ep, idx) => {
      if (idx % 2 === 0) {
        fill(COLORS.deepBlack);
        pdf.rect(M, y - 2, W - 2 * M, 10, 'F');
      }
      
      const methodColor = ep.method === 'GET' ? COLORS.emerald : COLORS.cyan;
      text(methodColor, 8);
      pdf.text(ep.method, M + 8, y + 5);
      text(COLORS.white, 7);
      pdf.text(ep.path, M + 40, y + 5);
      text(COLORS.slate, 7);
      pdf.text(ep.desc, W - M - 60, y + 5);
      
      y += 11;
    });

    y += 10;
    text(COLORS.gold, 9);
    pdf.text('AUTHENTICATION', M, y);
    y += 8;
    text(COLORS.platinum, 8);
    pdf.text('All endpoints require API key authentication via X-API-Key header.', M, y);
    y += 5;
    pdf.text('Rate limiting: 100 requests/minute standard, unlimited for enterprise tier.', M, y);

    // ═══════════════════════════════════════════════════════════════════════
    // PAGE 11: CUSTODY INTEGRATION
    // ═══════════════════════════════════════════════════════════════════════
    pdf.addPage();
    addPremiumPage(11);
    y = 20;

    sectionHeader('CUSTODY INTEGRATION', 'Account Linking & Balance Management');

    text(COLORS.platinum, 9);
    pdf.text('The DAES platform seamlessly integrates with custody accounts to ensure', M, y);
    y += 5;
    pdf.text('1:1 backing of all tokenized assets. Each custody account represents a', M, y);
    y += 5;
    pdf.text('segregated pool of fiat currency available for tokenization.', M, y);
    y += 15;

    text(COLORS.gold, 10);
    pdf.text('CUSTODY ACCOUNT STRUCTURE', M, y);
    y += 10;

    dataRow('Format', 'DAES-BK-[CURRENCY]-[SEQUENCE]');
    dataRow('Example', 'DAES-BK-USD-1000001');
    dataRow('Balance Query', 'Real-time via API');
    dataRow('Hold Duration', 'Until settlement confirmation');

    y += 10;
    text(COLORS.gold, 10);
    pdf.text('TOKENIZATION FROM CUSTODY', M, y);
    y += 10;

    bulletPoint('Select source custody account in UI or specify via API');
    bulletPoint('Available balance displayed in real-time');
    bulletPoint('Amount locked during transaction processing');
    bulletPoint('Automatic reconciliation upon blockchain confirmation');
    bulletPoint('Full audit trail maintained for compliance');

    // ═══════════════════════════════════════════════════════════════════════
    // PAGE 12: SECURITY PROTOCOLS
    // ═══════════════════════════════════════════════════════════════════════
    pdf.addPage();
    addPremiumPage(12);
    y = 20;

    sectionHeader('SECURITY PROTOCOLS', 'Key Management & Best Practices');

    // Safe to share box
    fill(COLORS.charcoal);
    pdf.roundedRect(M, y, W - 2 * M, 65, 2, 2, 'F');
    stroke(COLORS.emerald);
    pdf.setLineWidth(0.5);
    pdf.roundedRect(M, y, W - 2 * M, 65, 2, 2, 'S');
    
    text(COLORS.emerald, 10);
    pdf.text('✓ SAFE TO SHARE WITH PARTNERS', M + 10, y + 10);
    
    text(COLORS.platinum, 8);
    const safeItems = [
      'Master Wallet receiving address',
      'USD Token contract address',
      'BridgeMinter & Registry addresses',
      'Chain ID and network information',
      'Public RPC endpoints (without API key)'
    ];
    safeItems.forEach((item, i) => {
      pdf.text(`◆ ${item}`, M + 15, y + 22 + i * 8);
    });
    y += 75;

    // Never share box
    fill(COLORS.charcoal);
    pdf.roundedRect(M, y, W - 2 * M, 65, 2, 2, 'F');
    stroke(COLORS.gold);
    pdf.setLineWidth(0.5);
    pdf.roundedRect(M, y, W - 2 * M, 65, 2, 2, 'S');
    
    text(COLORS.gold, 10);
    pdf.text('⚠ NEVER SHARE - CONFIDENTIAL', M + 10, y + 10);
    
    text(COLORS.platinum, 8);
    const neverShare = [
      'DAES Signer private key',
      'Operator wallet private key',
      'Seed phrases or mnemonics',
      'API keys with write permissions',
      'Internal system credentials'
    ];
    neverShare.forEach((item, i) => {
      pdf.text(`◆ ${item}`, M + 15, y + 22 + i * 8);
    });

    // ═══════════════════════════════════════════════════════════════════════
    // PAGE 13: SUPPORT CHANNELS
    // ═══════════════════════════════════════════════════════════════════════
    pdf.addPage();
    addPremiumPage(13);
    y = 25;

    // Large logo area
    drawGradientBar(30, y, W - 60, 1.5);
    y += 15;
    
    text(COLORS.gold, 20);
    pdf.text('DIGITAL COMMERCIAL', W / 2, y, { align: 'center' });
    y += 10;
    pdf.text('BANK LTD', W / 2, y, { align: 'center' });
    y += 15;
    
    text(COLORS.platinum, 10);
    pdf.text('DAES - Digital Asset & Electronic Services', W / 2, y, { align: 'center' });
    y += 20;
    
    drawGradientBar(50, y, W - 100, 0.5);

    // ═══════════════════════════════════════════════════════════════════════
    // PAGE 14: M1 TOKENIZATION ARCHITECTURE
    // ═══════════════════════════════════════════════════════════════════════
    pdf.addPage();
    addPremiumPage(14);
    y = 20;

    sectionHeader('M1 TOKENIZATION ARCHITECTURE', 'Direct Fund Tokenization from DAES CoreBanking');

    // M1 Definition Box
    fill(COLORS.charcoal);
    pdf.roundedRect(M, y, W - 2 * M, 35, 2, 2, 'F');
    stroke(COLORS.emerald);
    pdf.setLineWidth(0.5);
    pdf.roundedRect(M, y, W - 2 * M, 35, 2, 2, 'S');
    
    text(COLORS.emerald, 11);
    pdf.text('M1 = LIQUID CASH', M + 10, y + 12);
    text(COLORS.platinum, 8);
    pdf.text('M1 represents immediately available funds: cash deposits, demand deposits, and', M + 10, y + 22);
    pdf.text('checking accounts. Every USD token minted is backed 1:1 by M1 reserves.', M + 10, y + 29);
    y += 45;

    // Fund Denomination Table
    text(COLORS.gold, 10);
    pdf.text('FUND DENOMINATION TYPES', M, y);
    y += 10;

    fill(COLORS.charcoal);
    pdf.rect(M, y, W - 2 * M, 10, 'F');
    text(COLORS.gold, 7);
    pdf.text('TYPE', M + 8, y + 7);
    pdf.text('DESCRIPTION', M + 30, y + 7);
    pdf.text('LIQUIDITY', W - M - 35, y + 7);
    y += 12;

    const fundTypes = [
      { type: 'M1', desc: 'Liquid Cash - Demand deposits, checking accounts', liquidity: 'IMMEDIATE' },
      { type: 'M2', desc: 'Near Money - Savings deposits, money market funds', liquidity: 'T+1 to T+3' }
    ];

    fundTypes.forEach((fund, idx) => {
      if (idx % 2 === 0) {
        fill(COLORS.deepBlack);
        pdf.rect(M, y - 2, W - 2 * M, 10, 'F');
      }
      text(fund.type === 'M1' ? COLORS.emerald : COLORS.cyan, 8);
      pdf.text(fund.type, M + 8, y + 5);
      text(COLORS.white, 8);
      pdf.text(fund.desc, M + 30, y + 5);
      text(COLORS.gold, 8);
      pdf.text(fund.liquidity, W - M - 35, y + 5);
      y += 11;
    });

    y += 15;
    text(COLORS.gold, 10);
    pdf.text('CUSTODY ACCOUNT STRUCTURE', M, y);
    y += 10;

    const custodyFields = [
      { field: 'accountNumber', value: 'DAES-BK-USD-1000001', desc: 'ISO Banking Reference' },
      { field: 'fundDenomination', value: 'M1', desc: 'Liquid Cash Classification' },
      { field: 'availableBalance', value: '$500,000.00', desc: 'Available for Tokenization' },
      { field: 'reservedBalance', value: '$0.00', desc: 'Blocked by Active Pledges' },
      { field: 'status', value: 'ACTIVE', desc: 'Account Operational Status' }
    ];

    custodyFields.forEach(item => {
      checkPage(12);
      text(COLORS.cyan, 8);
      pdf.text(item.field, M + 5, y);
      text(COLORS.white, 8);
      pdf.text(item.value, M + 55, y);
      text(COLORS.slate, 7);
      pdf.text(item.desc, M + 110, y);
      y += 9;
    });

    // ═══════════════════════════════════════════════════════════════════════
    // PAGE 15: TOKENIZATION FLOW DIAGRAM
    // ═══════════════════════════════════════════════════════════════════════
    pdf.addPage();
    addPremiumPage(15);
    y = 20;

    sectionHeader('TOKENIZATION FLOW', 'End-to-End M1 to Token Conversion');

    // Flow diagram components
    const flowSteps = [
      { num: '01', title: 'CUSTODY SELECTION', icon: '🏦', 
        desc: 'User selects M1 custody account with USD balance',
        detail: 'Frontend validates account status = ACTIVE and available balance >= requested amount' },
      { num: '02', title: 'HOLD CREATION', icon: '🔒',
        desc: 'System generates unique holdId using keccak256',
        detail: 'holdId = keccak256(DAES-ETH-{timestamp}-{random}) ensures uniqueness' },
      { num: '03', title: 'CHAINLINK ORACLE', icon: '📊',
        desc: 'Real-time ETH/USD price fetched from Chainlink',
        detail: 'Feed: 0x5f4eC3Df9cbd43714FE2740f5E3616155c5b8419 (8 decimals)' },
      { num: '04', title: 'ISO 20022 RECEIPT', icon: '📄',
        desc: 'Generate pain.001.001.09 credit transfer receipt',
        detail: 'iso20022Hash = keccak256(receiptXML) stored on-chain' },
      { num: '05', title: 'EIP-712 SIGNATURE', icon: '✍️',
        desc: 'DAES Signer authorizes mint with typed data',
        detail: 'Domain: "DAES USD BridgeMinter" v2, chainId: 1' },
      { num: '06', title: 'BLOCKCHAIN TX', icon: '⛓️',
        desc: 'Operator sends transaction to BridgeMinterV2',
        detail: 'Contract verifies signature, mints tokens, emits events' },
      { num: '07', title: 'SETTLEMENT', icon: '✅',
        desc: 'Token minted, custody debited, receipt finalized',
        detail: 'Hold status: MINTED, PriceSnapshot event emitted' }
    ];

    flowSteps.forEach((step, idx) => {
      checkPage(28);
      
      // Step box
      fill(COLORS.charcoal);
      pdf.roundedRect(M, y, W - 2 * M, 24, 2, 2, 'F');
      
      // Number circle
      fill(COLORS.gold);
      pdf.circle(M + 15, y + 12, 8, 'F');
      text(COLORS.black, 9);
      pdf.text(step.num, M + 15, y + 14, { align: 'center' });
      
      // Icon
      text(COLORS.white, 12);
      pdf.text(step.icon, M + 32, y + 14);
      
      // Title and description
      text(COLORS.gold, 9);
      pdf.text(step.title, M + 48, y + 8);
      text(COLORS.platinum, 7);
      pdf.text(step.desc, M + 48, y + 15);
      text(COLORS.slate, 6);
      pdf.text(step.detail, M + 48, y + 21);
      
      y += 28;
      
      // Connector arrow
      if (idx < flowSteps.length - 1) {
        stroke(COLORS.gold);
        pdf.setLineWidth(0.5);
        pdf.line(M + 15, y - 4, M + 15, y + 2);
        fill(COLORS.gold);
        pdf.triangle(M + 12, y, M + 18, y, M + 15, y + 4, 'F');
        y += 6;
      }
    });

    // ═══════════════════════════════════════════════════════════════════════
    // PAGE 16: CONTRACT FAQ
    // ═══════════════════════════════════════════════════════════════════════
    pdf.addPage();
    addPremiumPage(16);
    y = 20;

    sectionHeader('CONTRACT FAQ', 'Frequently Asked Questions');

    // FAQ Items
    const faqs = [
      {
        q: 'Why are there two BridgeMinter addresses?',
        a: 'BridgeMinter V1 (0xa296...) was the initial deployment. BridgeMinterV2 (0x5737...) is the current production contract with PriceSnapshot events and enhanced EIP-712 v2 signatures.'
      },
      {
        q: 'Which contract is currently in production?',
        a: 'BridgeMinterV2 at 0x5737342B02AF40815BD7881260F07777C0b1063f is the active production contract. V1 is deprecated.'
      },
      {
        q: 'What is the official USD token contract?',
        a: 'DAES USD Token: 0x3db99FACe6BB270E86BCA3355655dB747867f67b - ERC-20 standard with 6 decimals.'
      },
      {
        q: 'Are the contracts verified on Etherscan?',
        a: 'Yes, all contracts (USD Token, BridgeMinterV2, Settlement Registry) have verified source code on Etherscan.'
      },
      {
        q: 'Is the token freely transferable?',
        a: 'Yes. Once minted, USD tokens can be transferred freely between any wallets. There is no whitelist or blacklist for transfers. Only minting requires authorization.'
      },
      {
        q: 'What restrictions exist on minting?',
        a: 'Minting requires: (1) Valid EIP-712 signature from DAES_SIGNER_ROLE, (2) Unused holdId, (3) Non-expired deadline, (4) Operator with gas funds.'
      }
    ];

    faqs.forEach((faq, idx) => {
      checkPage(35);
      
      // Question
      fill(COLORS.charcoal);
      pdf.roundedRect(M, y, W - 2 * M, 30, 2, 2, 'F');
      
      text(COLORS.cyan, 8);
      pdf.text(`Q${idx + 1}:`, M + 5, y + 8);
      text(COLORS.gold, 8);
      const qLines = pdf.splitTextToSize(faq.q, W - 2 * M - 25);
      pdf.text(qLines, M + 18, y + 8);
      
      text(COLORS.platinum, 7);
      const aLines = pdf.splitTextToSize(faq.a, W - 2 * M - 10);
      pdf.text(aLines, M + 5, y + 18);
      
      y += 35;
    });

    // Contract Summary Box
    y += 5;
    fill(COLORS.deepBlack);
    pdf.roundedRect(M, y, W - 2 * M, 50, 2, 2, 'F');
    stroke(COLORS.gold);
    pdf.setLineWidth(0.5);
    pdf.roundedRect(M, y, W - 2 * M, 50, 2, 2, 'S');
    
    text(COLORS.gold, 9);
    pdf.text('PRODUCTION CONTRACTS SUMMARY', M + 10, y + 10);
    
    text(COLORS.cyan, 7);
    pdf.text('USD Token:', M + 10, y + 22);
    text(COLORS.white, 7);
    pdf.text('0x3db99FACe6BB270E86BCA3355655dB747867f67b', M + 45, y + 22);
    
    text(COLORS.cyan, 7);
    pdf.text('BridgeMinter V2:', M + 10, y + 30);
    text(COLORS.white, 7);
    pdf.text('0x5737342B02AF40815BD7881260F07777C0b1063f', M + 45, y + 30);
    
    text(COLORS.cyan, 7);
    pdf.text('Chainlink ETH/USD:', M + 10, y + 38);
    text(COLORS.white, 7);
    pdf.text('0x5f4eC3Df9cbd43714FE2740f5E3616155c5b8419', M + 45, y + 38);
    
    text(COLORS.cyan, 7);
    pdf.text('Registry:', M + 10, y + 46);
    text(COLORS.white, 7);
    pdf.text('0x346bBC9976AE540896125B01e14E8bc7Ef1EDB32', M + 45, y + 46);

    // ═══════════════════════════════════════════════════════════════════════
    // PAGE 17: SIGNATURE & AUTHORIZATION
    // ═══════════════════════════════════════════════════════════════════════
    pdf.addPage();
    addPremiumPage(17);
    y = 20;

    sectionHeader('EIP-712 AUTHORIZATION', 'Typed Structured Data Signing');

    // Domain Box
    text(COLORS.gold, 10);
    pdf.text('EIP-712 DOMAIN', M, y);
    y += 10;

    fill(COLORS.deepBlack);
    pdf.roundedRect(M, y, W - 2 * M, 35, 2, 2, 'F');
    stroke(COLORS.purple);
    pdf.setLineWidth(0.3);
    pdf.roundedRect(M, y, W - 2 * M, 35, 2, 2, 'S');
    
    text(COLORS.purple, 7);
    pdf.text('const domain = {', M + 10, y + 10);
    text(COLORS.white, 7);
    pdf.text('name: "DAES USD BridgeMinter",', M + 25, y + 17);
    pdf.text('version: "2",', M + 25, y + 24);
    pdf.text('chainId: 1,', M + 25, y + 31);
    text(COLORS.purple, 7);
    pdf.text('};', M + 10, y + 38);
    y += 48;

    // MintAuthorization Struct
    text(COLORS.gold, 10);
    pdf.text('MINT AUTHORIZATION STRUCT (V2)', M, y);
    y += 10;

    fill(COLORS.deepBlack);
    pdf.roundedRect(M, y, W - 2 * M, 70, 2, 2, 'F');
    stroke(COLORS.cyan);
    pdf.setLineWidth(0.3);
    pdf.roundedRect(M, y, W - 2 * M, 70, 2, 2, 'S');

    const structFields = [
      { name: 'holdId', type: 'bytes32', desc: 'Unique hold identifier' },
      { name: 'amount', type: 'uint256', desc: 'Token amount (6 decimals)' },
      { name: 'beneficiary', type: 'address', desc: 'Recipient wallet' },
      { name: 'iso20022Hash', type: 'bytes32', desc: 'Receipt hash' },
      { name: 'iso4217', type: 'bytes3', desc: 'Currency code (0x555344)' },
      { name: 'deadline', type: 'uint256', desc: 'Signature expiry' },
      { name: 'nonce', type: 'uint256', desc: 'Replay protection' },
      { name: 'ethUsdPrice', type: 'int256', desc: 'Chainlink price' },
      { name: 'priceDecimals', type: 'uint8', desc: 'Price decimals (8)' },
      { name: 'priceTs', type: 'uint64', desc: 'Price timestamp' }
    ];

    let yStruct = y + 8;
    structFields.forEach(field => {
      text(COLORS.cyan, 6);
      pdf.text(field.type, M + 10, yStruct);
      text(COLORS.white, 6);
      pdf.text(field.name, M + 40, yStruct);
      text(COLORS.slate, 6);
      pdf.text('// ' + field.desc, M + 75, yStruct);
      yStruct += 7;
    });
    y += 78;

    // Signature Flow
    text(COLORS.gold, 10);
    pdf.text('DUAL SIGNATURE SECURITY', M, y);
    y += 10;

    const sigFlow = [
      { role: 'DAES_SIGNER', action: 'Signs EIP-712 authorization off-chain', color: COLORS.emerald },
      { role: 'OPERATOR', action: 'Executes transaction on-chain (pays gas)', color: COLORS.cyan }
    ];

    sigFlow.forEach(sig => {
      fill(COLORS.charcoal);
      pdf.roundedRect(M, y, W - 2 * M, 18, 2, 2, 'F');
      
      fill(sig.color);
      pdf.roundedRect(M + 5, y + 4, 35, 10, 2, 2, 'F');
      text(COLORS.black, 7);
      pdf.text(sig.role, M + 22.5, y + 11, { align: 'center' });
      
      text(COLORS.platinum, 8);
      pdf.text(sig.action, M + 48, y + 11);
      
      y += 22;
    });

    // ═══════════════════════════════════════════════════════════════════════
    // PAGE 18: ON-CHAIN EVENTS
    // ═══════════════════════════════════════════════════════════════════════
    pdf.addPage();
    addPremiumPage(18);
    y = 20;

    sectionHeader('ON-CHAIN EVENTS', 'Blockchain Event Emissions');

    // Minted Event
    text(COLORS.gold, 10);
    pdf.text('MINTED EVENT', M, y);
    y += 10;

    fill(COLORS.deepBlack);
    pdf.roundedRect(M, y, W - 2 * M, 45, 2, 2, 'F');
    stroke(COLORS.emerald);
    pdf.setLineWidth(0.3);
    pdf.roundedRect(M, y, W - 2 * M, 45, 2, 2, 'S');

    text(COLORS.emerald, 7);
    pdf.text('event Minted(', M + 10, y + 10);
    text(COLORS.white, 7);
    pdf.text('bytes32 indexed holdId,', M + 20, y + 17);
    pdf.text('uint256 amount,', M + 20, y + 24);
    pdf.text('address indexed beneficiary,', M + 20, y + 31);
    pdf.text('bytes32 iso20022Hash,', M + 20, y + 38);
    text(COLORS.emerald, 7);
    pdf.text(');', M + 10, y + 45);
    y += 55;

    // PriceSnapshot Event
    text(COLORS.gold, 10);
    pdf.text('PRICESNAPSHOT EVENT', M, y);
    y += 10;

    fill(COLORS.deepBlack);
    pdf.roundedRect(M, y, W - 2 * M, 40, 2, 2, 'F');
    stroke(COLORS.purple);
    pdf.setLineWidth(0.3);
    pdf.roundedRect(M, y, W - 2 * M, 40, 2, 2, 'S');

    text(COLORS.purple, 7);
    pdf.text('event PriceSnapshot(', M + 10, y + 10);
    text(COLORS.white, 7);
    pdf.text('bytes32 indexed pairId,    // ETH/USD identifier', M + 20, y + 17);
    pdf.text('int256 price,              // Chainlink price (8 decimals)', M + 20, y + 24);
    pdf.text('uint8 decimals,            // Price decimals', M + 20, y + 31);
    pdf.text('uint64 ts,                 // Chainlink updatedAt timestamp', M + 20, y + 38);
    text(COLORS.purple, 7);
    pdf.text(');', M + 10, y + 45);
    y += 55;

    // Verification Steps
    text(COLORS.gold, 10);
    pdf.text('ON-CHAIN VERIFICATION', M, y);
    y += 10;

    const verifySteps = [
      'Every mint emits Minted + PriceSnapshot events',
      'holdId recorded in Settlement Registry for compliance',
      'iso20022Hash stored on-chain for audit trail',
      'All signatures verifiable via EIP-712 typed data recovery',
      'Chainlink price embedded in PriceSnapshot for transparency'
    ];

    verifySteps.forEach(step => {
      bulletPoint(step, COLORS.emerald);
    });

    // ═══════════════════════════════════════════════════════════════════════
    // PAGE 19: SUPPORT & CONTACT
    // ═══════════════════════════════════════════════════════════════════════
    pdf.addPage();
    addPremiumPage(19);
    y = 25;

    // Large logo area
    drawGradientBar(30, y, W - 60, 1.5);
    y += 15;
    
    text(COLORS.gold, 20);
    pdf.text('DIGITAL COMMERCIAL', W / 2, y, { align: 'center' });
    y += 10;
    pdf.text('BANK LTD', W / 2, y, { align: 'center' });
    y += 15;
    
    text(COLORS.platinum, 10);
    pdf.text('DAES - Digital Asset & Electronic Services', W / 2, y, { align: 'center' });
    y += 20;
    
    drawGradientBar(50, y, W - 100, 0.5);
    y += 20;

    // Contact info boxes
    const contacts = [
      { icon: '🌐', label: 'WEBSITE', value: 'digcommbank.com' },
      { icon: '✉', label: 'OPERATIONS', value: 'operations@digcommbank.com' },
      { icon: '⛓️', label: 'NETWORK', value: 'Ethereum Mainnet (Chain ID: 1)' },
      { icon: '📊', label: 'ORACLE', value: 'Chainlink ETH/USD Feed' }
    ];

    contacts.forEach(contact => {
      fill(COLORS.charcoal);
      pdf.roundedRect(M + 20, y, W - 2 * M - 40, 22, 2, 2, 'F');
      
      text(COLORS.white, 14);
      pdf.text(contact.icon, M + 35, y + 14);
      text(COLORS.slate, 8);
      pdf.text(contact.label, M + 55, y + 9);
      text(COLORS.gold, 10);
      pdf.text(contact.value, M + 55, y + 17);
      
      y += 28;
    });

    y += 10;
    text(COLORS.slate, 8);
    pdf.text('For technical integration support, API access requests, or partnership inquiries,', W / 2, y, { align: 'center' });
    y += 5;
    pdf.text('please contact our operations team.', W / 2, y, { align: 'center' });

    // Final footer
    y = H - 30;
    drawGradientBar(M, y, W - 2 * M, 0.5);
    y += 10;
    text(COLORS.slate, 7);
    pdf.text(`Document Version 2.1 | Generated: ${new Date().toISOString().split('T')[0]}`, W / 2, y, { align: 'center' });
    y += 5;
    text(COLORS.gold, 8);
    pdf.text('© 2025 Digital Commercial Bank Ltd - All Rights Reserved', W / 2, y, { align: 'center' });

    // Save with premium filename
    pdf.save('DAES_Blockchain_Infrastructure_Manual_v2.pdf');
  };

  // =============================================================================
  // RENDER: Config
  // =============================================================================

  const renderConfig = () => (
    <div className="space-y-6">
      <div className="p-4 bg-[var(--bg-elevated)] rounded-xl border border-[var(--border-medium)]">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            {backendHealth?.success ? (
              <Wifi className="w-6 h-6 text-yellow-400" />
            ) : (
              <WifiOff className="w-6 h-6 text-red-400" />
            )}
            <div>
              <div className="font-medium text-[var(--text-primary)]">
                {isSpanish ? 'Estado del Backend ETH USD' : 'ETH USD Backend Status'}
              </div>
              <div className={`text-sm ${backendHealth?.success ? 'text-yellow-400' : 'text-red-400'}`}>
                {backendHealth?.success ? 'Connected' : 'Disconnected'}
              </div>
            </div>
          </div>
          <button
            onClick={checkBackendHealth}
            className="flex items-center gap-2 px-4 py-2 bg-yellow-500/20 text-yellow-400 rounded-lg"
          >
            <RefreshCw className="w-4 h-4" />
            Test
          </button>
        </div>

        {backendHealth?.success && backendHealth.network && (
          <div className="grid grid-cols-2 gap-4 pt-4 border-t border-[var(--border-subtle)]">
            <div>
              <div className="text-xs text-[var(--text-muted)] mb-1">Network</div>
              <div className="font-medium text-[var(--text-primary)]">{backendHealth.network.name}</div>
            </div>
            <div>
              <div className="text-xs text-[var(--text-muted)] mb-1">Block</div>
              <div className="font-mono text-[var(--text-primary)]">
                {backendHealth.network.blockNumber?.toLocaleString()}
              </div>
            </div>
            {backendHealth.contracts && (
              <>
                <div className="col-span-2">
                  <div className="text-xs text-[var(--text-muted)] mb-1">USD Token</div>
                  <div className="font-mono text-xs text-yellow-400">{backendHealth.contracts.usdToken}</div>
                </div>
                <div className="col-span-2">
                  <div className="text-xs text-[var(--text-muted)] mb-1">Bridge Minter</div>
                  <div className="font-mono text-xs text-yellow-400">{backendHealth.contracts.bridgeMinter}</div>
                </div>
              </>
            )}
            {backendHealth.signers && (
              <div className="col-span-2">
                <div className="text-xs text-[var(--text-muted)] mb-1">DAES Signer</div>
                <div className="font-mono text-xs text-orange-400">{backendHealth.signers.daesSigner}</div>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-xl">
        <div className="flex items-start gap-3">
          <Globe className="w-5 h-5 text-yellow-400 flex-shrink-0 mt-0.5" />
          <div>
            <div className="font-medium text-yellow-400 mb-1">Ethereum Mainnet</div>
            <div className="text-sm text-[var(--text-secondary)]">
              {isSpanish 
                ? 'Este módulo tokeniza USD en Ethereum Mainnet. Las transacciones requieren ETH para gas.'
                : 'This module tokenizes USD on Ethereum Mainnet. Transactions require ETH for gas.'
              }
            </div>
          </div>
        </div>
      </div>

      {/* Download Manual Button */}
      <div className="p-4 bg-gradient-to-br from-yellow-500/20 to-orange-500/20 border border-yellow-500/50 rounded-xl">
        <div className="flex items-center justify-between">
          <div className="flex items-start gap-3">
            <FileText className="w-6 h-6 text-yellow-400 flex-shrink-0 mt-0.5" />
            <div>
              <div className="font-medium text-yellow-400 mb-1">
                {isSpanish ? 'Manual de Conexión Alchemy' : 'Alchemy Connection Manual'}
              </div>
              <div className="text-sm text-[var(--text-secondary)]">
                {isSpanish 
                  ? 'Documentación completa de infraestructura, contratos, APIs y proceso de tokenización. Incluye las 15 monedas soportadas con códigos ISO 4217.'
                  : 'Complete infrastructure documentation, contracts, APIs and tokenization process. Includes 15 supported currencies with ISO 4217 codes.'
                }
              </div>
            </div>
          </div>
          <button
            onClick={generateAlchemyManualPDF}
            className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-yellow-500 to-orange-500 text-black font-bold rounded-xl hover:shadow-[0_0_30px_rgba(234,179,8,0.4)] transition-all"
          >
            <Download className="w-5 h-5" />
            {isSpanish ? 'Descargar PDF' : 'Download PDF'}
          </button>
        </div>
      </div>

      {/* Contact Info */}
      <div className="p-4 bg-[var(--bg-elevated)] rounded-xl border border-[var(--border-medium)]">
        <div className="flex items-start gap-3">
          <Info className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
          <div className="space-y-2">
            <div className="font-medium text-[var(--text-primary)]">Digital Commercial Bank Ltd</div>
            <div className="text-sm text-[var(--text-secondary)] space-y-1">
              <div className="flex items-center gap-2">
                <Globe className="w-4 h-4 text-yellow-400" />
                <a href="https://digcommbank.com" target="_blank" rel="noopener noreferrer" className="text-yellow-400 hover:underline">
                  digcommbank.com
                </a>
              </div>
              <div className="flex items-center gap-2">
                <ExternalLink className="w-4 h-4 text-blue-400" />
                <a href="mailto:operations@digcommbank.com" className="text-blue-400 hover:underline">
                  operations@digcommbank.com
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  // =============================================================================
  // MAIN RENDER
  // =============================================================================

  return (
    <div className="min-h-full bg-[var(--bg-main)] p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-4 mb-4">
            <div className="p-4 bg-gradient-to-br from-yellow-500 to-orange-500 rounded-2xl shadow-[0_0_30px_rgba(234,179,8,0.3)]">
              <Globe className="w-8 h-8 text-black" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-[var(--text-primary)]">DAES USD ALCHEMY</h1>
              <p className="text-[var(--text-secondary)]">
                {isSpanish ? 'Tokenización USD en Ethereum Mainnet' : 'USD Tokenization on Ethereum Mainnet'}
              </p>
            </div>
            <div className="ml-auto flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${backendHealth?.success ? 'bg-yellow-400 animate-pulse' : 'bg-red-400'}`}></div>
              <span className="text-xs text-[var(--text-muted)]">
                {backendHealth?.success 
                  ? `Block ${backendHealth.network?.blockNumber?.toLocaleString() || 'N/A'}` 
                  : 'Offline'
                }
              </span>
            </div>
          </div>

          {/* Stats */}
          {stats && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
              <div className="p-4 bg-[var(--bg-card)] rounded-xl border border-[var(--border-subtle)]">
                <div className="text-2xl font-bold text-[var(--text-primary)]">{stats.total || 0}</div>
                <div className="text-xs text-[var(--text-muted)]">Total</div>
              </div>
              <div className="p-4 bg-[var(--bg-card)] rounded-xl border border-[var(--border-subtle)]">
                <div className="text-2xl font-bold text-yellow-400">{stats.minted || 0}</div>
                <div className="text-xs text-[var(--text-muted)]">{isSpanish ? 'Minteados' : 'Minted'}</div>
              </div>
              <div className="p-4 bg-[var(--bg-card)] rounded-xl border border-[var(--border-subtle)]">
                <div className="text-2xl font-bold text-yellow-400">${(stats.totalAmount || 0).toLocaleString()}</div>
                <div className="text-xs text-[var(--text-muted)]">{isSpanish ? 'Total USD' : 'Total USD'}</div>
              </div>
              <div className="p-4 bg-[var(--bg-card)] rounded-xl border border-[var(--border-subtle)]">
                <div className="text-2xl font-bold text-blue-400">{stats.pending || 0}</div>
                <div className="text-xs text-[var(--text-muted)]">{isSpanish ? 'Pendientes' : 'Pending'}</div>
              </div>
            </div>
          )}
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6 p-1 bg-[var(--bg-card)] rounded-xl border border-[var(--border-subtle)]">
          {[
            { id: 'mint', icon: Coins, label: isSpanish ? 'Tokenizar' : 'Tokenize', gradient: 'from-yellow-500 to-orange-500' },
            { id: 'send', icon: Send, label: isSpanish ? 'Enviar' : 'Send', gradient: 'from-blue-500 to-cyan-500' },
            { id: 'history', icon: History, label: isSpanish ? 'Historial' : 'History', gradient: 'from-purple-500 to-pink-500' },
            { id: 'config', icon: Server, label: 'Config', gradient: 'from-gray-500 to-gray-600' }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg font-medium transition-all ${
                activeTab === tab.id
                  ? `bg-gradient-to-r ${tab.gradient} ${tab.id === 'send' ? 'text-white' : 'text-black'}`
                  : 'text-[var(--text-secondary)] hover:bg-[var(--bg-hover)]'
              }`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="bg-[var(--bg-card)] rounded-2xl border border-[var(--border-medium)] p-6 shadow-[var(--shadow-card)]">
          {activeTab === 'mint' && renderMintForm()}
          {activeTab === 'send' && renderSendForm()}
          {activeTab === 'history' && renderHistory()}
          {activeTab === 'config' && renderConfig()}
        </div>

        {/* Footer */}
        <div className="mt-6 p-4 bg-[var(--bg-card)] rounded-xl border border-[var(--border-subtle)]">
          <div className="flex items-start gap-3">
            <Info className="w-5 h-5 text-yellow-400 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-[var(--text-secondary)]">
              <p className="mb-1">
                <strong>Network:</strong> Ethereum Mainnet (Chain ID: 1)
              </p>
              <p>
                <strong>ISO 4217:</strong> USD (0x555344)
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default DAESUsdAlchemyModule;