import React, { useState, useEffect } from 'react';
import { 
  Send, Globe, Building2, CreditCard, DollarSign, 
  CheckCircle, XCircle, Clock, RefreshCw, Download,
  Shield, Zap, ArrowRight, Wallet, History, Settings,
  AlertCircle, FileText, Loader2, ExternalLink, Check, Wifi, WifiOff
} from 'lucide-react';
import { custodyStore, type CustodyAccount } from '../lib/custody-store';
import jsPDF from 'jspdf';

// ═══════════════════════════════════════════════════════════════════════════════
// RESPONSE INTERFACES - Soporta USD, EUR, GBP
// ═══════════════════════════════════════════════════════════════════════════════

interface BankAddress {
  city: string;
  country: string;
  line1: string;
  line2: string | null;
  postal_code: string;
  state: string;
}

// GBP Response - Sort Code (UK)
interface SortCodeDetails {
  account_holder_address?: BankAddress;
  account_holder_name?: string;
  account_number?: string;
  bank_address?: BankAddress;
  sort_code?: string;
}

// USD Response - ACH / Wire (US)
interface ACHDetails {
  account_holder_name?: string;
  account_number?: string;
  routing_number?: string;
  bank_name?: string;
  account_type?: string; // checking, savings
}

// EUR Response - IBAN / SEPA (Europe)
interface IBANDetails {
  account_holder_name?: string;
  iban?: string;
  bic?: string;
  bank_name?: string;
  bank_address?: BankAddress;
}

interface TransferResponse {
  success: boolean;
  status?: string;
  amount_due?: number;
  bank_details?: {
    // GBP - UK Sort Code
    sort_code?: SortCodeDetails;
    // USD - ACH/Wire
    ach?: ACHDetails;
    // EUR - IBAN/SEPA
    iban?: IBANDetails;
    // Common
    supported_networks?: string[];
    type?: string;
  };
  reference_memo?: string;
  latency?: number;
  timestamp?: string;
  error?: string;
  message?: string;
}

interface TransferHistory {
  id: string;
  amount: number;
  currency: string;
  transferType: string;
  email: string;
  name: string;
  status: string;
  reference: string;
  timestamp: string;
  response?: TransferResponse;
  custodyAccountId?: string;
}

// ═══════════════════════════════════════════════════════════════════════════════
// E-GREEN TRANSFER API CONFIGURATION
// Endpoint: https://us-central1-egreen-tranfers.cloudfunctions.net/createTransferRequest
// ═══════════════════════════════════════════════════════════════════════════════

const CURRENCIES = [
  { 
    code: 'usd', 
    name: 'US Dollar', 
    symbol: '$', 
    flag: '🇺🇸', 
    apiType: 'us_bank_transfer', 
    region: 'United States (ACH & Wire, Swift)',
    requiresCountry: true,
    networks: ['ACH', 'Wire', 'Swift']
  },
  { 
    code: 'eur', 
    name: 'Euro', 
    symbol: '€', 
    flag: '🇪🇺', 
    apiType: 'eu_bank_transfer', 
    region: 'SEPA (Europe), IBAN',
    requiresCountry: true,
    networks: ['SEPA', 'IBAN', 'Swift']
  },
  { 
    code: 'gbp', 
    name: 'British Pound', 
    symbol: '£', 
    flag: '🇬🇧', 
    apiType: 'gb_bank_transfer', 
    region: 'United Kingdom (Bacs/FPS)',
    requiresCountry: false, // NOTA: Para GBP NO es necesario enviar el país
    networks: ['Bacs', 'FPS (Faster Payments)']
  },
];

// API Endpoint directo de E-Green Transfer
const EGREEN_API_URL = 'https://us-central1-egreen-tranfers.cloudfunctions.net/createTransferRequest';
const BACKEND_URL = 'http://localhost:3000';

// ═══════════════════════════════════════════════════════════════════════════════
// DIGITAL COMMERCIAL BANK - SORT CODE CONFIGURATION
// Configuración del Sort Code para recibir transferencias
// ═══════════════════════════════════════════════════════════════════════════════

interface DCBSortCodeConfig {
  sortCode: string;
  accountNumber: string;
  accountHolderName: string;
  bankName: string;
  bankAddress: {
    line1: string;
    line2: string | null;
    city: string;
    state: string;
    postalCode: string;
    country: string;
  };
  supportedNetworks: string[];
  isActive: boolean;
}

// Default Sort Code configuration for Digital Commercial Bank
const DEFAULT_DCB_SORT_CODE: DCBSortCodeConfig = {
  sortCode: '185023',
  accountNumber: '10847291',
  accountHolderName: 'Digital Commercial Bank Ltd',
  bankName: 'Digital Commercial Bank',
  bankAddress: {
    line1: '71-75 Shelton Street',
    line2: 'Covent Garden',
    city: 'London',
    state: 'Greater London',
    postalCode: 'WC2H 9JQ',
    country: 'GB'
  },
  supportedNetworks: ['bacs', 'fps', 'chaps'],
  isActive: true
};

// Interface for incoming transfer (to complete)
interface IncomingTransfer {
  id: string;
  referenceMemo: string;
  amount: number;
  currency: string;
  senderName: string;
  senderEmail: string;
  senderSortCode?: string;
  senderAccountNumber?: string;
  receiverSortCode: string;
  receiverAccountNumber: string;
  status: 'pending' | 'received' | 'completed' | 'rejected';
  createdAt: string;
  completedAt?: string;
  network?: string;
};

// ═══════════════════════════════════════════════════════════════════════════════
// NOTA IMPORTANTE SOBRE EL MONTO:
// El monto (Amount) NO recibe punto ni comas pero espera los dos dígitos de 
// los centavos, por lo que cualquier valor a enviar se debe multiplicar por 100.
// Ejemplo: para enviar 200 USD se debe digitar 20000 (200 * 100)
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Convierte un monto decimal a formato API (sin decimales, multiplicado por 100)
 * @param amount - Monto en formato decimal (ej: 300.50)
 * @returns Monto en formato API (ej: 30050)
 */
const formatAmountForAPI = (amount: number): number => {
  return Math.round(amount * 100);
};

/**
 * Convierte un monto API a formato decimal
 * @param apiAmount - Monto en formato API (ej: 30050)
 * @returns Monto en formato decimal (ej: 300.50)
 */
const formatAmountFromAPI = (apiAmount: number): number => {
  return apiAmount / 100;
};

export default function EGreenTransferModule() {
  const [activeTab, setActiveTab] = useState<'transfer' | 'history' | 'config' | 'sortcode' | 'incoming' | 'webhook'>('transfer');
  const [amount, setAmount] = useState<number>(5000);
  const [email, setEmail] = useState<string>('');
  const [name, setName] = useState<string>('');
  const [selectedCurrency, setSelectedCurrency] = useState(CURRENCIES[2]);
  const [selectedCustodyAccount, setSelectedCustodyAccount] = useState<CustodyAccount | null>(null);
  const [custodyAccounts, setCustodyAccounts] = useState<CustodyAccount[]>([]);
  const [showCustodyDropdown, setShowCustodyDropdown] = useState(false);
  
  const [transferStatus, setTransferStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [transferResponse, setTransferResponse] = useState<TransferResponse | null>(null);
  const [showResponseModal, setShowResponseModal] = useState(false);
  
  const [connectionStatus, setConnectionStatus] = useState<'unknown' | 'connected' | 'disconnected' | 'checking'>('unknown');
  const [connectionLatency, setConnectionLatency] = useState<number | null>(null);
  const [lastConnectionCheck, setLastConnectionCheck] = useState<Date | null>(null);
  
  const [transferHistory, setTransferHistory] = useState<TransferHistory[]>([]);

  // Transaction Status Verification State
  const [pendingTransactions, setPendingTransactions] = useState<Map<string, any>>(new Map());
  const [verifyingStatus, setVerifyingStatus] = useState<string | null>(null);
  const [webhookConfig, setWebhookConfig] = useState<any>(null);

  // DCB Sort Code State
  const [dcbSortCode, setDcbSortCode] = useState<DCBSortCodeConfig>(() => {
    const saved = localStorage.getItem('dcb_sort_code_config');
    return saved ? JSON.parse(saved) : DEFAULT_DCB_SORT_CODE;
  });
  const [editingSortCode, setEditingSortCode] = useState(false);
  const [tempSortCodeConfig, setTempSortCodeConfig] = useState<DCBSortCodeConfig>(DEFAULT_DCB_SORT_CODE);

  // Incoming Transfers State
  const [incomingTransfers, setIncomingTransfers] = useState<IncomingTransfer[]>(() => {
    const saved = localStorage.getItem('dcb_incoming_transfers');
    return saved ? JSON.parse(saved) : [];
  });
  const [showCompleteModal, setShowCompleteModal] = useState(false);
  const [selectedIncoming, setSelectedIncoming] = useState<IncomingTransfer | null>(null);

  // Save DCB Sort Code config to localStorage
  useEffect(() => {
    localStorage.setItem('dcb_sort_code_config', JSON.stringify(dcbSortCode));
  }, [dcbSortCode]);

  // Save incoming transfers to localStorage
  useEffect(() => {
    localStorage.setItem('dcb_incoming_transfers', JSON.stringify(incomingTransfers));
  }, [incomingTransfers]);

  // Function to save Sort Code configuration
  const saveSortCodeConfig = () => {
    setDcbSortCode(tempSortCodeConfig);
    setEditingSortCode(false);
  };

  // ═══════════════════════════════════════════════════════════════════════════════
  // STRIPE/E-GREEN WEBHOOK & TRANSACTION STATUS FUNCTIONS
  // ═══════════════════════════════════════════════════════════════════════════════

  // Register transaction in backend for tracking
  const registerTransaction = async (reference: string, amount: number, currency: string, custodyAccountId: string, senderName: string, senderEmail: string) => {
    try {
      const response = await fetch(`${BACKEND_URL}/api/egreen/transactions/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reference,
          amount,
          currency,
          custodyAccountId,
          senderName,
          senderEmail
        })
      });
      const data = await response.json();
      if (data.success) {
        setPendingTransactions(prev => new Map(prev).set(reference, data.transaction));
        console.log('📝 Transacción registrada para tracking:', reference);
      }
      return data;
    } catch (error) {
      console.error('Error registrando transacción:', error);
      return { success: false, error };
    }
  };

  // Verify transaction status from backend
  const verifyTransactionStatus = async (reference: string) => {
    setVerifyingStatus(reference);
    try {
      const response = await fetch(`${BACKEND_URL}/api/egreen/transactions/${reference}/status`);
      const data = await response.json();
      
      if (data.success && data.transaction) {
        // Update local state
        setPendingTransactions(prev => {
          const newMap = new Map(prev);
          newMap.set(reference, data.transaction);
          return newMap;
        });

        // If funds received, update incoming transfer status
        if (data.transaction.status === 'funds_received') {
          setIncomingTransfers(prev => prev.map(t => 
            t.referenceMemo === reference 
              ? { ...t, status: 'funds_confirmed' as any, confirmedAt: data.transaction.confirmedAt }
              : t
          ));
        }
      }
      
      setVerifyingStatus(null);
      return data;
    } catch (error) {
      console.error('Error verificando estado:', error);
      setVerifyingStatus(null);
      return { success: false, error };
    }
  };

  // Manually confirm funds received (for testing or manual confirmation)
  const confirmFundsReceived = async (reference: string, amount?: number) => {
    try {
      const response = await fetch(`${BACKEND_URL}/api/egreen/transactions/${reference}/confirm`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount, confirmedBy: 'manual_ui' })
      });
      const data = await response.json();
      
      if (data.success) {
        // Update incoming transfer
        setIncomingTransfers(prev => prev.map(t => 
          t.referenceMemo === reference 
            ? { ...t, status: 'funds_confirmed' as any, confirmedAt: new Date().toISOString() }
            : t
        ));
      }
      
      return data;
    } catch (error) {
      console.error('Error confirmando fondos:', error);
      return { success: false, error };
    }
  };

  // Get webhook configuration
  const fetchWebhookConfig = async () => {
    try {
      const response = await fetch(`${BACKEND_URL}/api/egreen/webhook/config`);
      const data = await response.json();
      if (data.success) {
        setWebhookConfig(data);
      }
      return data;
    } catch (error) {
      console.error('Error obteniendo config webhook:', error);
      return { success: false, error };
    }
  };

  // Load webhook config on mount
  useEffect(() => {
    fetchWebhookConfig();
  }, []);

  // Function to simulate receiving a transfer (from E-Green response)
  const registerIncomingTransfer = (response: TransferResponse, senderName: string, senderEmail: string) => {
    if (response.reference_memo && response.amount_due) {
      const newIncoming: IncomingTransfer = {
        id: `INC-${Date.now()}`,
        referenceMemo: response.reference_memo,
        amount: response.amount_due,
        currency: 'GBP',
        senderName,
        senderEmail,
        senderSortCode: response.bank_details?.sort_code?.sort_code,
        senderAccountNumber: response.bank_details?.sort_code?.account_number,
        receiverSortCode: dcbSortCode.sortCode,
        receiverAccountNumber: dcbSortCode.accountNumber,
        status: 'pending',
        createdAt: new Date().toISOString(),
        network: response.bank_details?.supported_networks?.[0] || 'fps'
      };
      setIncomingTransfers(prev => [newIncoming, ...prev]);
    }
  };

  // Function to complete an incoming transfer
  const completeIncomingTransfer = (transferId: string) => {
    setIncomingTransfers(prev => prev.map(t => 
      t.id === transferId 
        ? { ...t, status: 'completed' as const, completedAt: new Date().toISOString() }
        : t
    ));
    
    // Add to custody account if selected
    if (selectedCustodyAccount && selectedIncoming) {
      const now = new Date();
      custodyStore.depositFundsWithTransaction(selectedCustodyAccount.id, {
        amount: selectedIncoming.amount,
        type: 'transfer_in',
        description: `E-Green Transfer from ${selectedIncoming.senderName} - ${selectedIncoming.referenceMemo}`,
        sourceBank: selectedIncoming.senderName,
        sourceAccount: selectedIncoming.senderAccountNumber || 'N/A',
        transactionDate: now.toISOString().split('T')[0],
        transactionTime: now.toTimeString().split(' ')[0],
        valueDate: now.toISOString().split('T')[0],
        reference: selectedIncoming.referenceMemo,
        notes: `Received via ${selectedIncoming.network?.toUpperCase()} - Sort Code: ${selectedIncoming.senderSortCode}`
      });
    }
    
    setShowCompleteModal(false);
    setSelectedIncoming(null);
  };

  // Function to reject an incoming transfer
  const rejectIncomingTransfer = (transferId: string) => {
    setIncomingTransfers(prev => prev.map(t => 
      t.id === transferId 
        ? { ...t, status: 'rejected' as const }
        : t
    ));
  };

  useEffect(() => {
    const loadAccounts = () => {
      const accounts = custodyStore.getAccounts();
      setCustodyAccounts(accounts);
    };
    
    loadAccounts();
    const unsubscribe = custodyStore.subscribe(loadAccounts);
    return () => unsubscribe();
  }, []);

  const testConnection = async () => {
    setConnectionStatus('checking');
    const startTime = Date.now();
    
    try {
      // Intentar conexión directa al API de E-Green (puede fallar por CORS)
      // Si falla, usar el backend proxy
      const response = await fetch(`${BACKEND_URL}/api/egreen/test`, {
        method: 'GET',
        headers: { 'Accept': 'application/json' }
      });
      
      const latency = Date.now() - startTime;
      setConnectionLatency(latency);
      setLastConnectionCheck(new Date());
      
      if (response.ok) {
        const data = await response.json();
        setConnectionStatus(data.success ? 'connected' : 'disconnected');
      } else {
        setConnectionStatus('disconnected');
      }
    } catch (error) {
      setConnectionLatency(Date.now() - startTime);
      setLastConnectionCheck(new Date());
      setConnectionStatus('disconnected');
    }
  };

  // Función para llamar directamente al API de E-Green
  const callEGreenAPI = async (payload: {
    amount: number;
    email: string;
    name: string;
    transferType: string;
    currency: string;
  }) => {
    // Convertir monto a formato API (multiplicar por 100)
    const apiPayload = {
      amount: formatAmountForAPI(payload.amount),
      email: payload.email,
      name: payload.name,
      transferType: payload.transferType,
      currency: payload.currency
    };

    console.log('📤 E-Green API Request:', {
      endpoint: EGREEN_API_URL,
      payload: apiPayload,
      originalAmount: payload.amount,
      formattedAmount: apiPayload.amount,
      note: `${payload.amount} ${payload.currency.toUpperCase()} → ${apiPayload.amount} (×100)`
    });

    // Intentar llamada directa (puede fallar por CORS en navegador)
    try {
      const response = await fetch(EGREEN_API_URL, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify(apiPayload)
      });
      
      return await response.json();
    } catch (corsError) {
      console.log('⚠️ CORS error, using backend proxy...');
      // Fallback al backend proxy
      const proxyResponse = await fetch(`${BACKEND_URL}/api/egreen/transfer`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify(apiPayload)
      });
      
      return await proxyResponse.json();
    }
  };

  const handleTransfer = async () => {
    if (!selectedCustodyAccount || amount <= 0 || !name || !email) return;
    
    if (selectedCustodyAccount.availableBalance < amount) {
      setTransferStatus('error');
      setTransferResponse({
        success: false,
        error: 'INSUFFICIENT_FUNDS',
        message: `Fondos insuficientes. Disponible: ${selectedCustodyAccount.availableBalance.toLocaleString()} ${selectedCustodyAccount.currency}`
      });
      setShowResponseModal(true);
      return;
    }
    
    setTransferStatus('loading');
    
    try {
      // Usar la función callEGreenAPI que maneja el formato del monto
      const data: TransferResponse = await callEGreenAPI({
        amount,
        email,
        name,
        transferType: selectedCurrency.apiType,
        currency: selectedCurrency.code
      });
      
      if (data.success || data.status === 'awaiting_funds') {
        setTransferStatus('success');
        setTransferResponse(data);
        
        // Deduct funds from custody account using withdrawFundsWithTransaction
        const now = new Date();
        custodyStore.withdrawFundsWithTransaction(selectedCustodyAccount.id, {
          amount,
          type: 'transfer_out',
          description: `E-Green Transfer to ${name} - ${data.reference_memo || 'N/A'}`,
          destinationBank: 'E-GREEN-ENERGY GLOBAL LTD',
          destinationAccount: data.bank_details?.sort_code?.account_number || 'N/A',
          transactionDate: now.toISOString().split('T')[0],
          transactionTime: now.toTimeString().split(' ')[0],
          valueDate: now.toISOString().split('T')[0],
          reference: data.reference_memo || `EGT-${Date.now()}`,
          notes: `E-Green Transfer via ${selectedCurrency.apiType} - ${selectedCurrency.region}`
        });
        
        const historyEntry: TransferHistory = {
          id: `EGT-${Date.now()}`,
          amount,
          currency: selectedCurrency.code.toUpperCase(),
          transferType: selectedCurrency.apiType,
          email,
          name,
          status: data.status || 'completed',
          reference: data.reference_memo || `REF-${Date.now()}`,
          timestamp: new Date().toISOString(),
          response: data,
          custodyAccountId: selectedCustodyAccount.id
        };
        
        setTransferHistory(prev => [historyEntry, ...prev]);

        // Register as incoming transfer for completion (when receiving to DCB Sort Code)
        if (data.reference_memo && data.amount_due) {
          registerIncomingTransfer(data, name, email);
          
          // Register transaction in backend for webhook tracking
          await registerTransaction(
            data.reference_memo,
            data.amount_due,
            selectedCurrency.code.toUpperCase(),
            selectedCustodyAccount.id,
            name,
            email
          );
        }
      } else {
        setTransferStatus('error');
        setTransferResponse(data);
      }
      
      setShowResponseModal(true);
      
    } catch (error: any) {
      setTransferStatus('error');
      setTransferResponse({
        success: false,
        error: 'NETWORK_ERROR',
        message: error.message || 'Error de conexión con el servidor'
      });
      setShowResponseModal(true);
    }
  };

  // Generate Premium PDF Receipt - Digital Commercial Bank
  const generatePDF = (transfer: TransferHistory) => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    
    // Generate unique document identifiers
    const documentId = `DCB${new Date().getFullYear()}${String(Date.now()).slice(-8)}`;
    const confirmationNo = `CNF-${String(Math.random()).slice(2, 10).toUpperCase()}`;
    
    // ==================== CLEAN HEADER ====================
    // Subtle top border
    doc.setFillColor(0, 82, 73); // Deep teal
    doc.rect(0, 0, pageWidth, 4, 'F');
    
    // Bank name - clean typography
    doc.setTextColor(0, 82, 73);
    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.text('Digital Commercial Bank', 20, 22);
    
    // Document type - right aligned
    doc.setTextColor(100, 100, 100);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text('Payment Confirmation', pageWidth - 20, 18, { align: 'right' });
    doc.setFontSize(8);
    doc.text(`No. ${documentId}`, pageWidth - 20, 25, { align: 'right' });
    
    // Thin separator line
    doc.setDrawColor(220, 220, 220);
    doc.setLineWidth(0.5);
    doc.line(20, 32, pageWidth - 20, 32);
    
    let yPos = 45;
    
    // ==================== TRANSFER AMOUNT ====================
    doc.setTextColor(40, 40, 40);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.text('Transfer Amount', 20, yPos);
    
    yPos += 8;
    const currencySymbol = CURRENCIES.find(c => c.code === transfer.currency.toLowerCase())?.symbol || '';
    doc.setTextColor(0, 82, 73);
    doc.setFontSize(28);
    doc.setFont('helvetica', 'bold');
    doc.text(`${currencySymbol}${transfer.amount.toLocaleString('en-US', { minimumFractionDigits: 2 })} ${transfer.currency.toUpperCase()}`, 20, yPos + 8);
    
    // Status indicator
    const isSuccess = transfer.status === 'awaiting_funds' || transfer.status === 'completed';
    doc.setFillColor(isSuccess ? 0 : 200, isSuccess ? 128 : 50, isSuccess ? 96 : 50);
    doc.circle(pageWidth - 30, yPos + 2, 4, 'F');
    doc.setTextColor(60, 60, 60);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    const statusDisplay = transfer.status === 'awaiting_funds' ? 'Processing' : 'Completed';
    doc.text(statusDisplay, pageWidth - 40, yPos + 4, { align: 'right' });
    
    yPos += 25;
    
    // Separator
    doc.setDrawColor(240, 240, 240);
    doc.setLineWidth(0.3);
    doc.line(20, yPos, pageWidth - 20, yPos);
    
    yPos += 15;
    
    // ==================== TRANSACTION INFORMATION ====================
    doc.setTextColor(0, 82, 73);
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text('Transaction Information', 20, yPos);
    
    yPos += 12;
    
    // Two column layout for details
    const leftCol = 20;
    const rightCol = 110;
    const labelColor = [120, 120, 120];
    const valueColor = [30, 30, 30];
    
    const addField = (label: string, value: string, x: number, y: number) => {
      doc.setTextColor(labelColor[0], labelColor[1], labelColor[2]);
      doc.setFontSize(8);
      doc.setFont('helvetica', 'normal');
      doc.text(label, x, y);
      doc.setTextColor(valueColor[0], valueColor[1], valueColor[2]);
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.text(value, x, y + 5);
    };
    
    // Row 1
    addField('Date', new Date(transfer.timestamp).toLocaleDateString('en-GB', { 
      day: '2-digit', month: 'short', year: 'numeric' 
    }), leftCol, yPos);
    addField('Time', new Date(transfer.timestamp).toLocaleTimeString('en-GB', { 
      hour: '2-digit', minute: '2-digit', hour12: false 
    }), rightCol, yPos);
    
    yPos += 18;
    
    // Row 2
    addField('Reference', transfer.reference, leftCol, yPos);
    addField('Confirmation', confirmationNo, rightCol, yPos);
    
    yPos += 18;
    
    // Row 3
    const region = CURRENCIES.find(c => c.apiType === transfer.transferType)?.region || 'International';
    addField('Payment Method', transfer.transferType.replace(/_/g, ' ').toUpperCase(), leftCol, yPos);
    addField('Network', region, rightCol, yPos);
    
    yPos += 25;
    
    // Separator
    doc.setDrawColor(240, 240, 240);
    doc.line(20, yPos, pageWidth - 20, yPos);
    
    yPos += 15;
    
    // ==================== BENEFICIARY DETAILS ====================
    doc.setTextColor(0, 82, 73);
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text('Beneficiary Details', 20, yPos);
    
    yPos += 12;
    
    addField('Name', transfer.name, leftCol, yPos);
    addField('Email', transfer.email, rightCol, yPos);
    
    yPos += 25;
    
    // ==================== DESTINATION (if available) ====================
    if (transfer.response?.bank_details?.sort_code) {
      doc.setDrawColor(240, 240, 240);
      doc.line(20, yPos, pageWidth - 20, yPos);
      
      yPos += 15;
      
      doc.setTextColor(0, 82, 73);
      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.text('Receiving Account', 20, yPos);
      
      yPos += 12;
      
      const bankDetails = transfer.response.bank_details.sort_code;
      addField('Account Holder', bankDetails.account_holder_name || '—', leftCol, yPos);
      addField('Account Number', bankDetails.account_number ? `****${bankDetails.account_number.slice(-4)}` : '—', rightCol, yPos);
      
      yPos += 25;
    }
    
    // ==================== VERIFICATION BOX ====================
    doc.setFillColor(248, 250, 252);
    doc.roundedRect(20, yPos, pageWidth - 40, 28, 2, 2, 'F');
    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.5);
    doc.roundedRect(20, yPos, pageWidth - 40, 28, 2, 2, 'S');
    
    doc.setTextColor(71, 85, 105);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.text('This transaction has been verified and processed securely.', 28, yPos + 10);
    doc.text(`Document generated on ${new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })} at ${new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}`, 28, yPos + 18);
    
    // Checkmark
    doc.setFillColor(0, 128, 96);
    doc.circle(pageWidth - 38, yPos + 14, 6, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text('✓', pageWidth - 38, yPos + 17, { align: 'center' });
    
    // ==================== FOOTER ====================
    // Bottom border
    doc.setFillColor(0, 82, 73);
    doc.rect(0, pageHeight - 18, pageWidth, 18, 'F');
    
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.text('Digital Commercial Bank', 20, pageHeight - 10);
    
    doc.setTextColor(180, 210, 200);
    doc.setFontSize(7);
    doc.setFont('helvetica', 'normal');
    doc.text('This is an electronically generated document', pageWidth - 20, pageHeight - 10, { align: 'right' });
    
    // Save the PDF
    doc.save(`DCB-Payment-${transfer.reference}.pdf`);
  };

  const canTransfer = selectedCustodyAccount && amount > 0 && name && email && 
                      selectedCustodyAccount.availableBalance >= amount;

  return (
    <div className="h-full bg-gradient-to-br from-emerald-950 via-slate-900 to-teal-950 p-6 overflow-auto">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-emerald-500/20 rounded-xl border border-emerald-500/30">
            <Send className="w-8 h-8 text-emerald-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">E-GREEN TRANSFER</h1>
            <p className="text-emerald-300/70">International Bank Transfer System • USD | EUR | GBP</p>
            <p className="text-xs text-slate-500 mt-1">E-GREEN-ENERGY GLOBAL LTD • ACH, Wire, Swift, SEPA, Bacs, FPS</p>
          </div>
        </div>
        
        <div className="flex items-center gap-4">
          <div className={`flex items-center gap-2 px-4 py-2 rounded-lg border ${
            connectionStatus === 'connected' ? 'bg-emerald-500/20 border-emerald-500/30 text-emerald-400' :
            connectionStatus === 'checking' ? 'bg-yellow-500/20 border-yellow-500/30 text-yellow-400' :
            connectionStatus === 'disconnected' ? 'bg-red-500/20 border-red-500/30 text-red-400' :
            'bg-slate-500/20 border-slate-500/30 text-slate-400'
          }`}>
            {connectionStatus === 'checking' ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : connectionStatus === 'connected' ? (
              <Wifi className="w-4 h-4" />
            ) : (
              <WifiOff className="w-4 h-4" />
            )}
            <span className="text-sm font-medium">
              {connectionStatus === 'connected' ? 'API Conectada' :
               connectionStatus === 'checking' ? 'Verificando...' :
               connectionStatus === 'disconnected' ? 'API Desconectada' : 'Sin verificar'}
            </span>
          </div>
          
          <button
            onClick={testConnection}
            disabled={connectionStatus === 'checking'}
            className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-600 text-white rounded-lg transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${connectionStatus === 'checking' ? 'animate-spin' : ''}`} />
            Verificar Conexión
          </button>
          
          <div className="flex items-center gap-3">
            <div className="px-3 py-1 bg-emerald-500/20 rounded-full border border-emerald-500/30">
              <span className="text-emerald-400 text-sm font-medium">{CURRENCIES.length} Currencies</span>
            </div>
            <div className="flex items-center gap-1">
              {CURRENCIES.map(c => (
                <span key={c.code} className="text-lg" title={c.name}>{c.flag}</span>
              ))}
            </div>
          </div>
        </div>
      </div>
      
      {connectionStatus !== 'unknown' && (
        <div className={`mb-4 p-4 rounded-lg border ${
          connectionStatus === 'connected' ? 'bg-emerald-500/10 border-emerald-500/30' :
          connectionStatus === 'disconnected' ? 'bg-red-500/10 border-red-500/30' :
          'bg-yellow-500/10 border-yellow-500/30'
        }`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {connectionStatus === 'connected' ? (
                <CheckCircle className="w-5 h-5 text-emerald-400" />
              ) : connectionStatus === 'disconnected' ? (
                <XCircle className="w-5 h-5 text-red-400" />
              ) : (
                <Loader2 className="w-5 h-5 text-yellow-400 animate-spin" />
              )}
              <div>
                <p className={`font-medium ${
                  connectionStatus === 'connected' ? 'text-emerald-400' :
                  connectionStatus === 'disconnected' ? 'text-red-400' : 'text-yellow-400'
                }`}>
                  {connectionStatus === 'connected' ? '✅ Conexión Exitosa' :
                   connectionStatus === 'disconnected' ? '❌ Error de Conexión' : '⏳ Verificando...'}
                </p>
                <p className="text-sm text-slate-400">
                  {connectionStatus === 'connected' ? 'El servidor E-Green Transfer está disponible' :
                   connectionStatus === 'disconnected' ? 'No se pudo conectar al servidor. Verifique que el backend esté corriendo.' :
                   'Probando conectividad con el servidor...'}
                </p>
                {lastConnectionCheck && (
                  <p className="text-xs text-slate-500 mt-1">
                    Última verificación: {lastConnectionCheck.toLocaleString()} 
                    {connectionLatency && ` • Latencia: ${connectionLatency}ms`}
                  </p>
                )}
              </div>
            </div>
            <code className="text-xs text-slate-500 bg-slate-800/50 px-2 py-1 rounded">
              {BACKEND_URL}/api/egreen/*
            </code>
          </div>
        </div>
      )}
      
      <div className="flex gap-2 mb-6 flex-wrap">
        <button
          onClick={() => setActiveTab('transfer')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
            activeTab === 'transfer' 
              ? 'bg-emerald-600 text-white' 
              : 'bg-slate-800/50 text-slate-400 hover:bg-slate-700/50'
          }`}
        >
          <Send className="w-4 h-4" />
          Nueva Transferencia
        </button>
        <button
          onClick={() => setActiveTab('incoming')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
            activeTab === 'incoming' 
              ? 'bg-blue-600 text-white' 
              : 'bg-slate-800/50 text-slate-400 hover:bg-slate-700/50'
          }`}
        >
          <Download className="w-4 h-4" />
          Transferencias Entrantes
          {incomingTransfers.filter(t => t.status === 'pending').length > 0 && (
            <span className="px-2 py-0.5 bg-red-500 text-white text-xs rounded-full">
              {incomingTransfers.filter(t => t.status === 'pending').length}
            </span>
          )}
        </button>
        <button
          onClick={() => setActiveTab('sortcode')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
            activeTab === 'sortcode' 
              ? 'bg-purple-600 text-white' 
              : 'bg-slate-800/50 text-slate-400 hover:bg-slate-700/50'
          }`}
        >
          <Building2 className="w-4 h-4" />
          DCB Sort Code
        </button>
        <button
          onClick={() => setActiveTab('history')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
            activeTab === 'history' 
              ? 'bg-emerald-600 text-white' 
              : 'bg-slate-800/50 text-slate-400 hover:bg-slate-700/50'
          }`}
        >
          <History className="w-4 h-4" />
          Historial
        </button>
        <button
          onClick={() => setActiveTab('config')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
            activeTab === 'config' 
              ? 'bg-emerald-600 text-white' 
              : 'bg-slate-800/50 text-slate-400 hover:bg-slate-700/50'
          }`}
        >
          <Settings className="w-4 h-4" />
          Configuración API
        </button>
        <button
          onClick={() => setActiveTab('webhook')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
            activeTab === 'webhook' 
              ? 'bg-purple-600 text-white' 
              : 'bg-slate-800/50 text-slate-400 hover:bg-slate-700/50'
          }`}
        >
          <Zap className="w-4 h-4" />
          Webhook & Status
          {pendingTransactions.size > 0 && (
            <span className="px-2 py-0.5 bg-yellow-500 text-black text-xs rounded-full font-bold">
              {pendingTransactions.size}
            </span>
          )}
        </button>
      </div>
      
      {activeTab === 'transfer' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="space-y-6">
            <div className="bg-slate-800/50 rounded-xl border border-slate-700/50 p-6">
              <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                <Globe className="w-5 h-5 text-emerald-400" />
                Seleccionar Moneda y Región
              </h3>
              
              <div className="grid grid-cols-3 gap-3 mb-4">
                {CURRENCIES.map(currency => (
                  <button
                    key={currency.code}
                    onClick={() => setSelectedCurrency(currency)}
                    className={`p-3 rounded-lg border transition-all ${
                      selectedCurrency.code === currency.code
                        ? 'bg-emerald-600/30 border-emerald-500 text-white'
                        : 'bg-slate-700/30 border-slate-600 text-slate-300 hover:border-emerald-500/50'
                    }`}
                  >
                    <div className="text-2xl mb-1">{currency.flag}</div>
                    <div className="text-sm font-bold">{currency.code.toUpperCase()}</div>
                    <div className="text-xs text-slate-400">{currency.name}</div>
                  </button>
                ))}
              </div>
              
              <div className="p-3 bg-emerald-500/10 rounded-lg border border-emerald-500/30">
                <div className="flex items-center gap-3">
                  <span className="text-3xl">{selectedCurrency.flag}</span>
                  <div>
                    <div className="text-white font-medium">{selectedCurrency.name}</div>
                    <div className="text-emerald-400 text-sm">{selectedCurrency.region}</div>
                    <div className="text-slate-400 text-xs">API: {selectedCurrency.apiType}</div>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="bg-slate-800/50 rounded-xl border border-slate-700/50 p-6">
              <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                <Wallet className="w-5 h-5 text-emerald-400" />
                Cuenta Custodio (Origen de Fondos)
              </h3>
              
              <div className="relative">
                <button
                  onClick={() => setShowCustodyDropdown(!showCustodyDropdown)}
                  className="w-full p-4 bg-slate-700/50 rounded-lg border border-slate-600 text-left flex items-center justify-between hover:border-emerald-500/50 transition-colors"
                >
                  {selectedCustodyAccount ? (
                    <div>
                      <div className="text-white font-medium">{selectedCustodyAccount.accountName}</div>
                      <div className="text-emerald-400 text-sm">
                        Balance: {selectedCustodyAccount.availableBalance.toLocaleString()} {selectedCustodyAccount.currency}
                      </div>
                    </div>
                  ) : (
                    <span className="text-slate-400">Seleccionar cuenta custodio...</span>
                  )}
                  <ArrowRight className="w-5 h-5 text-slate-400" />
                </button>
                
                {showCustodyDropdown && (
                  <div className="absolute z-10 w-full mt-2 bg-slate-800 rounded-lg border border-slate-600 shadow-xl max-h-60 overflow-auto">
                    {custodyAccounts.length === 0 ? (
                      <div className="p-4 text-slate-400 text-center">
                        No hay cuentas custodio disponibles
                      </div>
                    ) : (
                      custodyAccounts.map(account => (
                        <button
                          key={account.id}
                          onClick={() => {
                            setSelectedCustodyAccount(account);
                            setShowCustodyDropdown(false);
                          }}
                          className={`w-full p-4 text-left hover:bg-slate-700/50 transition-colors border-b border-slate-700 last:border-0 ${
                            selectedCustodyAccount?.id === account.id ? 'bg-emerald-600/20' : ''
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <div>
                              <div className="text-white font-medium">{account.accountName}</div>
                              <div className="text-slate-400 text-sm">{account.accountNumber}</div>
                            </div>
                            <div className="text-right">
                              <div className="text-emerald-400 font-medium">
                                {account.availableBalance.toLocaleString()} {account.currency}
                              </div>
                              <div className="text-slate-500 text-xs">Disponible</div>
                            </div>
                          </div>
                        </button>
                      ))
                    )}
                  </div>
                )}
              </div>
            </div>
            
            <div className="bg-slate-800/50 rounded-xl border border-slate-700/50 p-6">
              <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-emerald-400" />
                Detalles de la Transferencia
              </h3>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-slate-400 text-sm mb-2">Monto a Transferir</label>
                  <div className="flex items-center">
                    <span className="px-4 py-3 bg-slate-700 rounded-l-lg text-emerald-400 font-bold border border-r-0 border-slate-600">
                      {selectedCurrency.symbol}
                    </span>
                    <input
                      type="number"
                      value={amount}
                      onChange={(e) => setAmount(parseFloat(e.target.value) || 0)}
                      className="flex-1 px-4 py-3 bg-slate-700/50 rounded-r-lg border border-slate-600 text-white focus:border-emerald-500 focus:outline-none"
                      placeholder="5000"
                    />
                  </div>
                </div>
                
                <div>
                  <label className="block text-slate-400 text-sm mb-2">Nombre del Remitente (Banco/Entidad)</label>
                  <div className="relative">
                    <Building2 className="w-5 h-5 text-slate-500 absolute left-3 top-1/2 transform -translate-y-1/2" />
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="w-full pl-10 pr-4 py-3 bg-slate-700/50 rounded-lg border border-slate-600 text-white focus:border-emerald-500 focus:outline-none"
                      placeholder="Nombre del banco o entidad..."
                    />
                  </div>
                </div>
                
                <div>
                  <label className="block text-slate-400 text-sm mb-2">Email de Contacto</label>
                  <div className="relative">
                    <Send className="w-5 h-5 text-slate-500 absolute left-3 top-1/2 transform -translate-y-1/2" />
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full pl-10 pr-4 py-3 bg-slate-700/50 rounded-lg border border-slate-600 text-white focus:border-emerald-500 focus:outline-none"
                      placeholder="correo@entidad.com"
                    />
                  </div>
                </div>
              </div>
              
              <button
                onClick={handleTransfer}
                disabled={!canTransfer || transferStatus === 'loading'}
                className={`w-full mt-6 py-4 rounded-lg font-bold text-lg flex items-center justify-center gap-3 transition-all ${
                  canTransfer && transferStatus !== 'loading'
                    ? 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white shadow-lg shadow-emerald-500/25'
                    : 'bg-slate-700 text-slate-500 cursor-not-allowed'
                }`}
              >
                {transferStatus === 'loading' ? (
                  <>
                    <Loader2 className="w-6 h-6 animate-spin" />
                    Procesando Transferencia...
                  </>
                ) : (
                  <>
                    <Send className="w-6 h-6" />
                    Iniciar Transferencia
                    <ArrowRight className="w-5 h-5" />
                  </>
                )}
              </button>
            </div>
          </div>
          
          <div className="space-y-6">
            {/* API Endpoint Info */}
            <div className="bg-slate-800/50 rounded-xl border border-slate-700/50 p-6">
              <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                <ExternalLink className="w-5 h-5 text-emerald-400" />
                API Endpoint
              </h3>
              
              <div className="space-y-3">
                <div>
                  <div className="text-slate-400 text-xs mb-1">E-Green API (Directo)</div>
                  <code className="block p-3 bg-slate-900 rounded-lg text-yellow-400 text-xs break-all">
                    {EGREEN_API_URL}
                  </code>
                </div>
                <div>
                  <div className="text-slate-400 text-xs mb-1">Backend Proxy (CORS)</div>
                  <code className="block p-3 bg-slate-900 rounded-lg text-emerald-400 text-xs break-all">
                    {BACKEND_URL}/api/egreen/transfer
                  </code>
                </div>
              </div>
              
              <div className="mt-4 space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-slate-400">Method:</span>
                  <span className="text-emerald-400 font-mono">POST</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Content-Type:</span>
                  <span className="text-emerald-400 font-mono">application/json</span>
                </div>
              </div>
              
              <button
                onClick={testConnection}
                disabled={connectionStatus === 'checking'}
                className="w-full mt-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors flex items-center justify-center gap-2"
              >
                {connectionStatus === 'checking' ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Zap className="w-4 h-4" />
                )}
                Probar Conexión
              </button>
            </div>

            {/* NOTA IMPORTANTE - Formato del Monto */}
            <div className="bg-amber-500/10 rounded-xl border border-amber-500/30 p-4">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-amber-400 mt-0.5 flex-shrink-0" />
                <div>
                  <div className="text-amber-400 font-bold text-sm">⚠️ NOTA IMPORTANTE - Formato del Monto</div>
                  <div className="text-amber-200/80 text-xs mt-2 space-y-1">
                    <p>El monto (Amount) <strong>NO recibe punto ni comas</strong> pero espera los dos dígitos de los centavos.</p>
                    <p>Cualquier valor a enviar se debe <strong>multiplicar por 100</strong>.</p>
                    <div className="mt-2 p-2 bg-slate-900/50 rounded text-amber-300 font-mono">
                      Ejemplo: 200 USD → amount: <strong>20000</strong> (200 × 100)
                    </div>
                    <p className="text-emerald-400 mt-2">✅ El sistema convierte automáticamente el monto.</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Request Preview con formato correcto */}
            <div className="bg-slate-800/50 rounded-xl border border-slate-700/50 p-6">
              <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                <FileText className="w-5 h-5 text-emerald-400" />
                Request Preview (Formato API)
              </h3>
              
              <div className="mb-3 p-2 bg-emerald-500/10 rounded-lg border border-emerald-500/30">
                <div className="text-emerald-400 text-xs">
                  💡 Monto ingresado: <strong>{amount.toLocaleString()} {selectedCurrency.code.toUpperCase()}</strong> 
                  → API amount: <strong>{formatAmountForAPI(amount)}</strong>
                </div>
              </div>
              
              <pre className="p-4 bg-slate-900 rounded-lg text-sm text-slate-300 overflow-auto">
{JSON.stringify({
  amount: formatAmountForAPI(amount),
  email: email || 'correo@entidad.com',
  name: name || 'NOMBRE DEL BANCO O LA ENTIDAD QUE ENVIA',
  transferType: selectedCurrency.apiType,
  currency: selectedCurrency.code
}, null, 2)}
              </pre>

              {selectedCurrency.code === 'gbp' && (
                <div className="mt-3 p-2 bg-blue-500/10 rounded-lg border border-blue-500/30">
                  <div className="text-blue-400 text-xs flex items-center gap-2">
                    <span>🇬🇧</span>
                    <span><strong>GBP:</strong> No es necesario enviar el país en la solicitud.</span>
                  </div>
                </div>
              )}
            </div>
            
            {/* Redes Soportadas por Moneda */}
            <div className="bg-slate-800/50 rounded-xl border border-slate-700/50 p-6">
              <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                <Shield className="w-5 h-5 text-emerald-400" />
                Redes Soportadas por Moneda
              </h3>
              
              <div className="space-y-3">
                {CURRENCIES.map((currency) => (
                  <div key={currency.code} className={`p-3 rounded-lg border transition-all ${
                    selectedCurrency.code === currency.code 
                      ? 'bg-emerald-500/20 border-emerald-500/50' 
                      : 'bg-slate-700/30 border-slate-600/50'
                  }`}>
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className="text-xl">{currency.flag}</span>
                        <span className="text-white font-medium">{currency.code.toUpperCase()}</span>
                        <span className="text-slate-400 text-sm">({currency.name})</span>
                      </div>
                      <span className="text-xs px-2 py-1 bg-slate-800 rounded text-slate-400">
                        {currency.apiType}
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {currency.networks.map((network, idx) => (
                        <span key={idx} className="text-xs px-2 py-1 bg-slate-800/50 rounded text-emerald-400">
                          {network}
                        </span>
                      ))}
                    </div>
                    <div className="text-xs text-slate-500 mt-2">{currency.region}</div>
                    {!currency.requiresCountry && (
                      <div className="text-xs text-blue-400 mt-1">ℹ️ No requiere enviar país</div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
      
      {activeTab === 'history' && (
        <div className="bg-slate-800/50 rounded-xl border border-slate-700/50 p-6">
          <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <History className="w-5 h-5 text-emerald-400" />
            Historial de Transferencias
          </h3>
          
          {transferHistory.length === 0 ? (
            <div className="text-center py-12">
              <Send className="w-12 h-12 text-slate-600 mx-auto mb-4" />
              <p className="text-slate-400">No hay transferencias registradas</p>
              <p className="text-slate-500 text-sm">Las transferencias realizadas aparecerán aquí</p>
            </div>
          ) : (
            <div className="space-y-4">
              {transferHistory.map(transfer => (
                <div key={transfer.id} className="p-4 bg-slate-700/30 rounded-lg border border-slate-600">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-lg ${
                        transfer.status === 'awaiting_funds' || transfer.status === 'completed' 
                          ? 'bg-emerald-500/20 text-emerald-400' 
                          : 'bg-red-500/20 text-red-400'
                      }`}>
                        {transfer.status === 'awaiting_funds' || transfer.status === 'completed' 
                          ? <CheckCircle className="w-5 h-5" /> 
                          : <XCircle className="w-5 h-5" />}
                      </div>
                      <div>
                        <div className="text-white font-medium">{transfer.name}</div>
                        <div className="text-slate-400 text-sm">{transfer.email}</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-emerald-400 font-bold text-lg">
                        {transfer.amount.toLocaleString()} {transfer.currency}
                      </div>
                      <div className="text-slate-500 text-xs">{transfer.reference}</div>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-slate-400">
                      {new Date(transfer.timestamp).toLocaleString()}
                    </span>
                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-1 rounded text-xs ${
                        transfer.status === 'awaiting_funds' ? 'bg-yellow-500/20 text-yellow-400' :
                        transfer.status === 'completed' ? 'bg-emerald-500/20 text-emerald-400' :
                        'bg-red-500/20 text-red-400'
                      }`}>
                        {transfer.status.toUpperCase()}
                      </span>
                      <button
                        onClick={() => generatePDF(transfer)}
                        className="p-2 bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-400 rounded transition-colors"
                        title="Descargar PDF"
                      >
                        <Download className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
      
      {activeTab === 'config' && (
        <div className="space-y-6">
          {/* API Configuration */}
          <div className="bg-slate-800/50 rounded-xl border border-slate-700/50 p-6">
            <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <Settings className="w-5 h-5 text-emerald-400" />
              Configuración de la API E-Green Transfer
            </h3>
            
            <div className="space-y-4">
              <div className="p-4 bg-slate-700/30 rounded-lg">
                <div className="text-slate-400 text-sm mb-1">🔗 API Endpoint (Original - E-Green)</div>
                <code className="text-yellow-400 text-sm break-all">{EGREEN_API_URL}</code>
              </div>
              
              <div className="p-4 bg-slate-700/30 rounded-lg">
                <div className="text-slate-400 text-sm mb-1">🔄 API Endpoint (Proxy Backend)</div>
                <code className="text-emerald-400 text-sm">{BACKEND_URL}/api/egreen/transfer</code>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-slate-700/30 rounded-lg">
                  <div className="text-slate-400 text-sm mb-1">Método</div>
                  <code className="text-emerald-400 font-bold">POST</code>
                </div>
                
                <div className="p-4 bg-slate-700/30 rounded-lg">
                  <div className="text-slate-400 text-sm mb-1">Content-Type</div>
                  <code className="text-emerald-400">application/json</code>
                </div>
              </div>
            </div>
          </div>

          {/* Currency Configuration Table */}
          <div className="bg-slate-800/50 rounded-xl border border-slate-700/50 p-6">
            <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <Globe className="w-5 h-5 text-emerald-400" />
              Configuración de Monedas
            </h3>
            
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-700">
                    <th className="text-left py-3 px-4 text-slate-400 font-medium">Currency</th>
                    <th className="text-left py-3 px-4 text-slate-400 font-medium">Code</th>
                    <th className="text-left py-3 px-4 text-slate-400 font-medium">API Type</th>
                    <th className="text-left py-3 px-4 text-slate-400 font-medium">Region</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b border-slate-700/50 hover:bg-slate-700/20">
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <span>🇺🇸</span>
                        <span className="text-white">US Dollar</span>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-emerald-400 font-mono">usd</td>
                    <td className="py-3 px-4 text-yellow-400 font-mono">us_bank_transfer</td>
                    <td className="py-3 px-4 text-slate-300">United States (ACH & Wire, Swift)</td>
                  </tr>
                  <tr className="border-b border-slate-700/50 hover:bg-slate-700/20">
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <span>🇪🇺</span>
                        <span className="text-white">Euro</span>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-emerald-400 font-mono">eur</td>
                    <td className="py-3 px-4 text-yellow-400 font-mono">eu_bank_transfer</td>
                    <td className="py-3 px-4 text-slate-300">SEPA (Europe), IBAN</td>
                  </tr>
                  <tr className="hover:bg-slate-700/20">
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <span>🇬🇧</span>
                        <span className="text-white">British Pound</span>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-emerald-400 font-mono">gbp</td>
                    <td className="py-3 px-4 text-yellow-400 font-mono">gb_bank_transfer</td>
                    <td className="py-3 px-4 text-slate-300">United Kingdom (Bacs/FPS)</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Amount Format Note */}
          <div className="bg-amber-500/10 rounded-xl border border-amber-500/30 p-6">
            <h3 className="text-lg font-semibold text-amber-400 mb-4 flex items-center gap-2">
              <AlertCircle className="w-5 h-5" />
              NOTA IMPORTANTE: Formato del Monto (Amount)
            </h3>
            
            <div className="space-y-4 text-sm">
              <p className="text-amber-200">
                El campo <code className="bg-slate-800 px-2 py-1 rounded text-amber-400">amount</code> <strong>NO recibe punto ni comas</strong> pero espera los dos dígitos de los centavos.
              </p>
              <p className="text-amber-200">
                Por lo tanto, cualquier valor a enviar se debe <strong>multiplicar por 100</strong>.
              </p>
              
              <div className="bg-slate-900/50 rounded-lg p-4 space-y-2">
                <div className="text-slate-400">Ejemplo: Para enviar <span className="text-white font-bold">200 USD</span></div>
                <div className="flex items-center gap-3">
                  <span className="text-slate-400">200</span>
                  <span className="text-slate-500">+</span>
                  <span className="text-slate-400">00 adicionales</span>
                  <span className="text-slate-500">=</span>
                  <code className="text-emerald-400 font-bold text-lg">20000</code>
                </div>
                <div className="text-xs text-slate-500">En el campo amount iría: 20000</div>
              </div>

              <div className="bg-slate-900/50 rounded-lg p-4">
                <div className="text-slate-400 mb-2">Más ejemplos:</div>
                <div className="grid grid-cols-3 gap-4 text-xs">
                  <div>
                    <div className="text-white">$100.00</div>
                    <div className="text-emerald-400 font-mono">amount: 10000</div>
                  </div>
                  <div>
                    <div className="text-white">$1,500.50</div>
                    <div className="text-emerald-400 font-mono">amount: 150050</div>
                  </div>
                  <div>
                    <div className="text-white">£300.00</div>
                    <div className="text-emerald-400 font-mono">amount: 30000</div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* GBP Special Note */}
          <div className="bg-blue-500/10 rounded-xl border border-blue-500/30 p-6">
            <h3 className="text-lg font-semibold text-blue-400 mb-4 flex items-center gap-2">
              <span>🇬🇧</span>
              Nota Especial para GBP (British Pound)
            </h3>
            
            <p className="text-blue-200 text-sm mb-4">
              Para transferencias en GBP <strong>NO es necesario enviar el país</strong> en el body de la solicitud.
            </p>
            
            <div className="bg-slate-900/50 rounded-lg p-4">
              <div className="text-slate-400 text-xs mb-2">Ejemplo de Body para GBP (300 £):</div>
              <pre className="text-sm text-slate-300">
{`{
  "amount": 30000,
  "email": "correo@entidad.com",
  "name": "NOMBRE DEL BANCO O LA ENTIDAD QUE ENVIA",
  "transferType": "gb_bank_transfer",
  "currency": "gbp"
}`}
              </pre>
            </div>
          </div>

          {/* Example Response */}
          <div className="bg-slate-800/50 rounded-xl border border-slate-700/50 p-6">
            <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <FileText className="w-5 h-5 text-emerald-400" />
              Ejemplo de Respuesta (GBP)
            </h3>
            
            <pre className="p-4 bg-slate-900 rounded-lg text-xs text-slate-300 overflow-auto max-h-80">
{`{
  "status": "awaiting_funds",
  "amount_due": 300,
  "bank_details": {
    "sort_code": {
      "account_holder_address": {
        "city": "London",
        "country": "GB",
        "line1": "9th Floor, 107 Cheapside",
        "line2": null,
        "postal_code": "EC2V6DN",
        "state": "London"
      },
      "account_holder_name": "E-GREEN-ENERGY GLOBAL LTD",
      "account_number": "62558727",
      "bank_address": {
        "city": "London",
        "country": "GB",
        "line1": "1 CHURCHILL PLACE",
        "line2": null,
        "postal_code": "E14 5HP",
        "state": "England"
      },
      "sort_code": "236802"
    },
    "supported_networks": ["bacs", "fps"],
    "type": "sort_code"
  },
  "reference_memo": "EJ79N9CQZZ63"
}`}
            </pre>
          </div>

          {/* Proxy Info */}
          <div className="bg-emerald-500/10 rounded-xl border border-emerald-500/30 p-6">
            <div className="flex items-start gap-3">
              <Shield className="w-5 h-5 text-emerald-400 mt-0.5" />
              <div>
                <div className="text-emerald-400 font-medium">Proxy Backend Habilitado</div>
                <div className="text-slate-400 text-sm mt-1">
                  Las solicitudes se envían a través del backend local para evitar problemas de CORS.
                  El backend actúa como intermediario entre el frontend y la API de E-Green Transfer.
                </div>
                <div className="mt-3 p-3 bg-slate-900/50 rounded-lg">
                  <div className="text-xs text-slate-500">Flujo de la solicitud:</div>
                  <div className="flex items-center gap-2 mt-2 text-sm">
                    <span className="px-2 py-1 bg-blue-500/20 text-blue-400 rounded">Frontend</span>
                    <ArrowRight className="w-4 h-4 text-slate-500" />
                    <span className="px-2 py-1 bg-emerald-500/20 text-emerald-400 rounded">Backend Proxy</span>
                    <ArrowRight className="w-4 h-4 text-slate-500" />
                    <span className="px-2 py-1 bg-yellow-500/20 text-yellow-400 rounded">E-Green API</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════════════════ */}
      {/* DCB SORT CODE CONFIGURATION TAB */}
      {/* ═══════════════════════════════════════════════════════════════════════════════ */}
      {activeTab === 'sortcode' && (
        <div className="space-y-6">
          {/* DCB Sort Code Header */}
          <div className="bg-gradient-to-r from-purple-900/50 to-slate-800/50 rounded-xl border border-purple-500/30 p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-purple-500/20 rounded-xl">
                  <Building2 className="w-8 h-8 text-purple-400" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-white">Digital Commercial Bank - Sort Code</h3>
                  <p className="text-purple-300/70">Configuración para recibir transferencias UK (Bacs/FPS/CHAPS)</p>
                </div>
              </div>
              <div className={`px-4 py-2 rounded-lg ${dcbSortCode.isActive ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'}`}>
                {dcbSortCode.isActive ? '● Activo' : '○ Inactivo'}
              </div>
            </div>
          </div>

          {/* Sort Code Display Card */}
          <div className="bg-slate-800/50 rounded-xl border border-slate-700/50 p-6">
            <div className="flex items-center justify-between mb-6">
              <h4 className="text-lg font-semibold text-white flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-purple-400" />
                Detalles del Sort Code DCB
              </h4>
              <button
                onClick={() => {
                  setTempSortCodeConfig(dcbSortCode);
                  setEditingSortCode(!editingSortCode);
                }}
                className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-lg transition-colors flex items-center gap-2"
              >
                <Settings className="w-4 h-4" />
                {editingSortCode ? 'Cancelar' : 'Editar'}
              </button>
            </div>

            {!editingSortCode ? (
              /* Display Mode */
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div className="p-4 bg-purple-500/10 rounded-lg border border-purple-500/30">
                    <div className="text-purple-400 text-sm mb-1">Sort Code</div>
                    <div className="text-3xl font-bold text-white font-mono tracking-wider">
                      {dcbSortCode.sortCode.slice(0,2)}-{dcbSortCode.sortCode.slice(2,4)}-{dcbSortCode.sortCode.slice(4,6)}
                    </div>
                  </div>
                  <div className="p-4 bg-slate-700/30 rounded-lg">
                    <div className="text-slate-400 text-sm mb-1">Número de Cuenta</div>
                    <div className="text-xl font-bold text-emerald-400 font-mono">{dcbSortCode.accountNumber}</div>
                  </div>
                  <div className="p-4 bg-slate-700/30 rounded-lg">
                    <div className="text-slate-400 text-sm mb-1">Titular de la Cuenta</div>
                    <div className="text-white font-medium">{dcbSortCode.accountHolderName}</div>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="p-4 bg-slate-700/30 rounded-lg">
                    <div className="text-slate-400 text-sm mb-1">Banco</div>
                    <div className="text-white font-medium">{dcbSortCode.bankName}</div>
                  </div>
                  <div className="p-4 bg-slate-700/30 rounded-lg">
                    <div className="text-slate-400 text-sm mb-2">Dirección del Banco</div>
                    <div className="text-slate-300 text-sm">
                      {dcbSortCode.bankAddress.line1}<br />
                      {dcbSortCode.bankAddress.line2 && <>{dcbSortCode.bankAddress.line2}<br /></>}
                      {dcbSortCode.bankAddress.city}, {dcbSortCode.bankAddress.postalCode}<br />
                      {dcbSortCode.bankAddress.country}
                    </div>
                  </div>
                  <div className="p-4 bg-slate-700/30 rounded-lg">
                    <div className="text-slate-400 text-sm mb-2">Redes Soportadas</div>
                    <div className="flex flex-wrap gap-2">
                      {dcbSortCode.supportedNetworks.map((network, idx) => (
                        <span key={idx} className="px-3 py-1 bg-emerald-500/20 text-emerald-400 rounded-full text-sm">
                          {network.toUpperCase()}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              /* Edit Mode */
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-slate-400 text-sm mb-2">Sort Code (6 dígitos)</label>
                    <input
                      type="text"
                      value={tempSortCodeConfig.sortCode}
                      onChange={(e) => setTempSortCodeConfig({...tempSortCodeConfig, sortCode: e.target.value.replace(/\D/g, '').slice(0,6)})}
                      className="w-full px-4 py-3 bg-slate-700/50 rounded-lg border border-slate-600 text-white font-mono text-lg focus:border-purple-500 focus:outline-none"
                      placeholder="185023"
                      maxLength={6}
                    />
                  </div>
                  <div>
                    <label className="block text-slate-400 text-sm mb-2">Número de Cuenta (8 dígitos)</label>
                    <input
                      type="text"
                      value={tempSortCodeConfig.accountNumber}
                      onChange={(e) => setTempSortCodeConfig({...tempSortCodeConfig, accountNumber: e.target.value.replace(/\D/g, '').slice(0,8)})}
                      className="w-full px-4 py-3 bg-slate-700/50 rounded-lg border border-slate-600 text-white font-mono focus:border-purple-500 focus:outline-none"
                      placeholder="10847291"
                      maxLength={8}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-slate-400 text-sm mb-2">Titular de la Cuenta</label>
                  <input
                    type="text"
                    value={tempSortCodeConfig.accountHolderName}
                    onChange={(e) => setTempSortCodeConfig({...tempSortCodeConfig, accountHolderName: e.target.value})}
                    className="w-full px-4 py-3 bg-slate-700/50 rounded-lg border border-slate-600 text-white focus:border-purple-500 focus:outline-none"
                    placeholder="Digital Commercial Bank Ltd"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 text-sm mb-2">Nombre del Banco</label>
                  <input
                    type="text"
                    value={tempSortCodeConfig.bankName}
                    onChange={(e) => setTempSortCodeConfig({...tempSortCodeConfig, bankName: e.target.value})}
                    className="w-full px-4 py-3 bg-slate-700/50 rounded-lg border border-slate-600 text-white focus:border-purple-500 focus:outline-none"
                    placeholder="Digital Commercial Bank"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-slate-400 text-sm mb-2">Dirección Línea 1</label>
                    <input
                      type="text"
                      value={tempSortCodeConfig.bankAddress.line1}
                      onChange={(e) => setTempSortCodeConfig({...tempSortCodeConfig, bankAddress: {...tempSortCodeConfig.bankAddress, line1: e.target.value}})}
                      className="w-full px-4 py-3 bg-slate-700/50 rounded-lg border border-slate-600 text-white focus:border-purple-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-400 text-sm mb-2">Ciudad</label>
                    <input
                      type="text"
                      value={tempSortCodeConfig.bankAddress.city}
                      onChange={(e) => setTempSortCodeConfig({...tempSortCodeConfig, bankAddress: {...tempSortCodeConfig.bankAddress, city: e.target.value}})}
                      className="w-full px-4 py-3 bg-slate-700/50 rounded-lg border border-slate-600 text-white focus:border-purple-500 focus:outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-slate-400 text-sm mb-2">Código Postal</label>
                    <input
                      type="text"
                      value={tempSortCodeConfig.bankAddress.postalCode}
                      onChange={(e) => setTempSortCodeConfig({...tempSortCodeConfig, bankAddress: {...tempSortCodeConfig.bankAddress, postalCode: e.target.value}})}
                      className="w-full px-4 py-3 bg-slate-700/50 rounded-lg border border-slate-600 text-white focus:border-purple-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-400 text-sm mb-2">País</label>
                    <input
                      type="text"
                      value={tempSortCodeConfig.bankAddress.country}
                      onChange={(e) => setTempSortCodeConfig({...tempSortCodeConfig, bankAddress: {...tempSortCodeConfig.bankAddress, country: e.target.value}})}
                      className="w-full px-4 py-3 bg-slate-700/50 rounded-lg border border-slate-600 text-white focus:border-purple-500 focus:outline-none"
                    />
                  </div>
                </div>

                <div className="flex items-center gap-4 pt-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={tempSortCodeConfig.isActive}
                      onChange={(e) => setTempSortCodeConfig({...tempSortCodeConfig, isActive: e.target.checked})}
                      className="w-5 h-5 rounded border-slate-600 bg-slate-700 text-purple-500 focus:ring-purple-500"
                    />
                    <span className="text-slate-300">Sort Code Activo</span>
                  </label>
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    onClick={saveSortCodeConfig}
                    className="flex-1 py-3 bg-purple-600 hover:bg-purple-500 text-white rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
                  >
                    <Check className="w-5 h-5" />
                    Guardar Configuración
                  </button>
                  <button
                    onClick={() => setEditingSortCode(false)}
                    className="px-6 py-3 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors"
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Instructions */}
          <div className="bg-blue-500/10 rounded-xl border border-blue-500/30 p-6">
            <h4 className="text-blue-400 font-semibold mb-3 flex items-center gap-2">
              <AlertCircle className="w-5 h-5" />
              Cómo Recibir Transferencias
            </h4>
            <div className="text-slate-300 text-sm space-y-2">
              <p>1. Comparte tu Sort Code (<code className="bg-slate-800 px-2 py-1 rounded text-purple-400">{dcbSortCode.sortCode}</code>) y Número de Cuenta (<code className="bg-slate-800 px-2 py-1 rounded text-emerald-400">{dcbSortCode.accountNumber}</code>) con el remitente.</p>
              <p>2. El remitente realiza la transferencia usando Bacs, FPS o CHAPS.</p>
              <p>3. Las transferencias entrantes aparecerán en la pestaña "Transferencias Entrantes".</p>
              <p>4. Confirma la recepción para acreditar los fondos a tu cuenta custodio.</p>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════════════════ */}
      {/* INCOMING TRANSFERS TAB */}
      {/* ═══════════════════════════════════════════════════════════════════════════════ */}
      {activeTab === 'incoming' && (
        <div className="space-y-6">
          {/* Incoming Transfers Header */}
          <div className="bg-gradient-to-r from-blue-900/50 to-slate-800/50 rounded-xl border border-blue-500/30 p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-blue-500/20 rounded-xl">
                  <Download className="w-8 h-8 text-blue-400" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-white">Transferencias Entrantes</h3>
                  <p className="text-blue-300/70">Transferencias pendientes de completar al Sort Code de DCB</p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-yellow-400">{incomingTransfers.filter(t => t.status === 'pending').length}</div>
                  <div className="text-xs text-slate-400">Pendientes</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-emerald-400">{incomingTransfers.filter(t => t.status === 'completed').length}</div>
                  <div className="text-xs text-slate-400">Completadas</div>
                </div>
              </div>
            </div>
          </div>

          {/* Incoming Transfers List */}
          <div className="bg-slate-800/50 rounded-xl border border-slate-700/50 p-6">
            <h4 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <Clock className="w-5 h-5 text-blue-400" />
              Lista de Transferencias
            </h4>

            {incomingTransfers.length === 0 ? (
              <div className="text-center py-12">
                <Download className="w-12 h-12 text-slate-600 mx-auto mb-4" />
                <p className="text-slate-400">No hay transferencias entrantes</p>
                <p className="text-slate-500 text-sm">Las transferencias recibidas aparecerán aquí</p>
              </div>
            ) : (
              <div className="space-y-4">
                {incomingTransfers.map(transfer => (
                  <div key={transfer.id} className={`p-4 rounded-lg border ${
                    transfer.status === 'pending' ? 'bg-yellow-500/10 border-yellow-500/30' :
                    transfer.status === 'completed' ? 'bg-emerald-500/10 border-emerald-500/30' :
                    'bg-red-500/10 border-red-500/30'
                  }`}>
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-lg ${
                          transfer.status === 'pending' ? 'bg-yellow-500/20 text-yellow-400' :
                          transfer.status === 'completed' ? 'bg-emerald-500/20 text-emerald-400' :
                          'bg-red-500/20 text-red-400'
                        }`}>
                          {transfer.status === 'pending' ? <Clock className="w-5 h-5" /> :
                           transfer.status === 'completed' ? <CheckCircle className="w-5 h-5" /> :
                           <XCircle className="w-5 h-5" />}
                        </div>
                        <div>
                          <div className="text-white font-medium">{transfer.senderName}</div>
                          <div className="text-slate-400 text-sm">{transfer.senderEmail}</div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-emerald-400 font-bold text-xl">
                          £{transfer.amount.toLocaleString()}
                        </div>
                        <div className="text-slate-500 text-xs font-mono">{transfer.referenceMemo}</div>
                      </div>
                    </div>

                    <div className="grid grid-cols-4 gap-4 text-sm mb-3">
                      <div>
                        <div className="text-slate-500 text-xs">Sort Code Origen</div>
                        <div className="text-slate-300 font-mono">{transfer.senderSortCode || 'N/A'}</div>
                      </div>
                      <div>
                        <div className="text-slate-500 text-xs">Cuenta Origen</div>
                        <div className="text-slate-300 font-mono">{transfer.senderAccountNumber || 'N/A'}</div>
                      </div>
                      <div>
                        <div className="text-slate-500 text-xs">Red</div>
                        <div className="text-blue-400">{transfer.network?.toUpperCase()}</div>
                      </div>
                      <div>
                        <div className="text-slate-500 text-xs">Fecha</div>
                        <div className="text-slate-300">{new Date(transfer.createdAt).toLocaleDateString()}</div>
                      </div>
                    </div>

                    {transfer.status === 'pending' && (
                      <div className="flex gap-3 pt-3 border-t border-slate-700">
                        <button
                          onClick={() => {
                            setSelectedIncoming(transfer);
                            setShowCompleteModal(true);
                          }}
                          className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
                        >
                          <CheckCircle className="w-4 h-4" />
                          Completar Transferencia
                        </button>
                        <button
                          onClick={() => rejectIncomingTransfer(transfer.id)}
                          className="px-4 py-2 bg-red-600/20 hover:bg-red-600/30 text-red-400 rounded-lg transition-colors"
                        >
                          <XCircle className="w-4 h-4" />
                        </button>
                      </div>
                    )}

                    {transfer.status === 'completed' && transfer.completedAt && (
                      <div className="pt-3 border-t border-slate-700">
                        <span className="text-emerald-400 text-sm">
                          ✓ Completada el {new Date(transfer.completedAt).toLocaleString()}
                        </span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Complete Transfer Modal */}
      {showCompleteModal && selectedIncoming && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-slate-800 rounded-xl border border-slate-700 max-w-lg w-full">
            <div className="p-6 border-b border-slate-700 bg-emerald-500/10">
              <div className="flex items-center gap-3">
                <CheckCircle className="w-8 h-8 text-emerald-400" />
                <div>
                  <h3 className="text-xl font-bold text-white">Completar Transferencia</h3>
                  <p className="text-slate-400">Confirmar recepción de fondos</p>
                </div>
              </div>
            </div>

            <div className="p-6 space-y-4">
              <div className="p-4 bg-slate-700/30 rounded-lg">
                <div className="text-slate-400 text-sm mb-1">Monto a Recibir</div>
                <div className="text-3xl font-bold text-emerald-400">£{selectedIncoming.amount.toLocaleString()}</div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="p-3 bg-slate-700/30 rounded-lg">
                  <div className="text-slate-400 text-xs mb-1">Remitente</div>
                  <div className="text-white text-sm">{selectedIncoming.senderName}</div>
                </div>
                <div className="p-3 bg-slate-700/30 rounded-lg">
                  <div className="text-slate-400 text-xs mb-1">Referencia</div>
                  <div className="text-emerald-400 font-mono text-sm">{selectedIncoming.referenceMemo}</div>
                </div>
              </div>

              <div>
                <label className="block text-slate-400 text-sm mb-2">Acreditar a Cuenta Custodio</label>
                <div className="relative">
                  <button
                    onClick={() => setShowCustodyDropdown(!showCustodyDropdown)}
                    className="w-full p-3 bg-slate-700/50 rounded-lg border border-slate-600 text-left flex items-center justify-between hover:border-emerald-500/50 transition-colors"
                  >
                    {selectedCustodyAccount ? (
                      <div>
                        <div className="text-white font-medium">{selectedCustodyAccount.accountName}</div>
                        <div className="text-emerald-400 text-sm">
                          Balance: {selectedCustodyAccount.availableBalance.toLocaleString()} {selectedCustodyAccount.currency}
                        </div>
                      </div>
                    ) : (
                      <span className="text-slate-400">Seleccionar cuenta...</span>
                    )}
                    <ArrowRight className="w-5 h-5 text-slate-400" />
                  </button>

                  {showCustodyDropdown && (
                    <div className="absolute z-10 w-full mt-2 bg-slate-800 rounded-lg border border-slate-600 shadow-xl max-h-40 overflow-auto">
                      {custodyAccounts.map(account => (
                        <button
                          key={account.id}
                          onClick={() => {
                            setSelectedCustodyAccount(account);
                            setShowCustodyDropdown(false);
                          }}
                          className="w-full p-3 text-left hover:bg-slate-700/50 transition-colors border-b border-slate-700 last:border-0"
                        >
                          <div className="text-white font-medium">{account.accountName}</div>
                          <div className="text-emerald-400 text-sm">{account.availableBalance.toLocaleString()} {account.currency}</div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="p-6 border-t border-slate-700 flex gap-3">
              <button
                onClick={() => completeIncomingTransfer(selectedIncoming.id)}
                disabled={!selectedCustodyAccount}
                className={`flex-1 py-3 rounded-lg font-medium transition-colors flex items-center justify-center gap-2 ${
                  selectedCustodyAccount 
                    ? 'bg-emerald-600 hover:bg-emerald-500 text-white' 
                    : 'bg-slate-700 text-slate-500 cursor-not-allowed'
                }`}
              >
                <CheckCircle className="w-5 h-5" />
                Confirmar Recepción
              </button>
              <button
                onClick={() => {
                  setShowCompleteModal(false);
                  setSelectedIncoming(null);
                }}
                className="px-6 py-3 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
      
      {showResponseModal && transferResponse && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-slate-800 rounded-xl border border-slate-700 max-w-2xl w-full max-h-[90vh] overflow-auto">
            <div className={`p-6 border-b border-slate-700 ${
              transferResponse.success || transferResponse.status === 'awaiting_funds'
                ? 'bg-emerald-500/10' : 'bg-red-500/10'
            }`}>
              <div className="flex items-center gap-3">
                {transferResponse.success || transferResponse.status === 'awaiting_funds' ? (
                  <CheckCircle className="w-8 h-8 text-emerald-400" />
                ) : (
                  <XCircle className="w-8 h-8 text-red-400" />
                )}
                <div>
                  <h3 className="text-xl font-bold text-white">
                    {transferResponse.success || transferResponse.status === 'awaiting_funds'
                      ? 'Transferencia Iniciada' : 'Error en la Transferencia'}
                  </h3>
                  <p className="text-slate-400">
                    {transferResponse.status || transferResponse.error}
                  </p>
                </div>
              </div>
            </div>
            
            <div className="p-6 space-y-4">
              {transferResponse.reference_memo && (
                <div className="p-4 bg-slate-700/30 rounded-lg">
                  <div className="text-slate-400 text-sm mb-1">Referencia</div>
                  <code className="text-emerald-400 text-lg font-bold">{transferResponse.reference_memo}</code>
                </div>
              )}
              
              {transferResponse.amount_due && (
                <div className="p-4 bg-slate-700/30 rounded-lg">
                  <div className="text-slate-400 text-sm mb-1">Monto a Depositar</div>
                  <div className="text-white text-2xl font-bold">{transferResponse.amount_due.toLocaleString()}</div>
                </div>
              )}
              
              {/* GBP - Sort Code Details (UK) */}
              {transferResponse.bank_details?.sort_code && (
                <div className="p-4 bg-slate-700/30 rounded-lg space-y-3">
                  <div className="flex items-center gap-2 text-white font-medium">
                    <span>🇬🇧</span>
                    <span>Detalles Bancarios (UK - Sort Code)</span>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <div className="text-slate-400">Titular de la Cuenta</div>
                      <div className="text-white">{transferResponse.bank_details.sort_code.account_holder_name}</div>
                    </div>
                    <div>
                      <div className="text-slate-400">Número de Cuenta</div>
                      <div className="text-emerald-400 font-mono">{transferResponse.bank_details.sort_code.account_number}</div>
                    </div>
                    <div>
                      <div className="text-slate-400">Sort Code</div>
                      <div className="text-emerald-400 font-mono">{transferResponse.bank_details.sort_code.sort_code}</div>
                    </div>
                    <div>
                      <div className="text-slate-400">Redes Soportadas</div>
                      <div className="text-white">{transferResponse.bank_details.supported_networks?.join(', ').toUpperCase()}</div>
                    </div>
                  </div>
                  
                  {transferResponse.bank_details.sort_code.bank_address && (
                    <div className="mt-3 pt-3 border-t border-slate-600">
                      <div className="text-slate-400 text-xs mb-2">Dirección del Banco</div>
                      <div className="text-slate-300 text-sm">
                        {transferResponse.bank_details.sort_code.bank_address.line1}<br />
                        {transferResponse.bank_details.sort_code.bank_address.city}, {transferResponse.bank_details.sort_code.bank_address.postal_code}<br />
                        {transferResponse.bank_details.sort_code.bank_address.country}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* USD - ACH/Wire Details (US) */}
              {transferResponse.bank_details?.ach && (
                <div className="p-4 bg-slate-700/30 rounded-lg space-y-3">
                  <div className="flex items-center gap-2 text-white font-medium">
                    <span>🇺🇸</span>
                    <span>Detalles Bancarios (US - ACH/Wire)</span>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <div className="text-slate-400">Titular de la Cuenta</div>
                      <div className="text-white">{transferResponse.bank_details.ach.account_holder_name}</div>
                    </div>
                    <div>
                      <div className="text-slate-400">Número de Cuenta</div>
                      <div className="text-emerald-400 font-mono">{transferResponse.bank_details.ach.account_number}</div>
                    </div>
                    <div>
                      <div className="text-slate-400">Routing Number (ABA)</div>
                      <div className="text-emerald-400 font-mono">{transferResponse.bank_details.ach.routing_number}</div>
                    </div>
                    <div>
                      <div className="text-slate-400">Banco</div>
                      <div className="text-white">{transferResponse.bank_details.ach.bank_name}</div>
                    </div>
                    {transferResponse.bank_details.ach.account_type && (
                      <div>
                        <div className="text-slate-400">Tipo de Cuenta</div>
                        <div className="text-white capitalize">{transferResponse.bank_details.ach.account_type}</div>
                      </div>
                    )}
                    <div>
                      <div className="text-slate-400">Redes Soportadas</div>
                      <div className="text-white">{transferResponse.bank_details.supported_networks?.join(', ').toUpperCase()}</div>
                    </div>
                  </div>
                </div>
              )}

              {/* EUR - IBAN/SEPA Details (Europe) */}
              {transferResponse.bank_details?.iban && (
                <div className="p-4 bg-slate-700/30 rounded-lg space-y-3">
                  <div className="flex items-center gap-2 text-white font-medium">
                    <span>🇪🇺</span>
                    <span>Detalles Bancarios (EU - IBAN/SEPA)</span>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <div className="text-slate-400">Titular de la Cuenta</div>
                      <div className="text-white">{transferResponse.bank_details.iban.account_holder_name}</div>
                    </div>
                    <div>
                      <div className="text-slate-400">IBAN</div>
                      <div className="text-emerald-400 font-mono text-xs">{transferResponse.bank_details.iban.iban}</div>
                    </div>
                    <div>
                      <div className="text-slate-400">BIC/SWIFT</div>
                      <div className="text-emerald-400 font-mono">{transferResponse.bank_details.iban.bic}</div>
                    </div>
                    <div>
                      <div className="text-slate-400">Banco</div>
                      <div className="text-white">{transferResponse.bank_details.iban.bank_name}</div>
                    </div>
                    <div>
                      <div className="text-slate-400">Redes Soportadas</div>
                      <div className="text-white">{transferResponse.bank_details.supported_networks?.join(', ').toUpperCase()}</div>
                    </div>
                  </div>
                </div>
              )}
              
              {transferResponse.message && (
                <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-lg">
                  <div className="text-red-400">{transferResponse.message}</div>
                </div>
              )}
            </div>
            
            <div className="p-6 border-t border-slate-700 flex justify-end gap-3">
              {(transferResponse.success || transferResponse.status === 'awaiting_funds') && transferHistory.length > 0 && (
                <button
                  onClick={() => generatePDF(transferHistory[0])}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg transition-colors flex items-center gap-2"
                >
                  <Download className="w-4 h-4" />
                  Descargar Recibo PDF
                </button>
              )}
              <button
                onClick={() => {
                  setShowResponseModal(false);
                  setTransferStatus('idle');
                }}
                className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* ═══════════════════════════════════════════════════════════════════════════════ */}
      {/* WEBHOOK & STATUS TAB */}
      {/* ═══════════════════════════════════════════════════════════════════════════════ */}
      {activeTab === 'webhook' && (
        <div className="space-y-6">
          {/* Webhook Header */}
          <div className="bg-gradient-to-r from-purple-900/50 to-slate-800/50 rounded-xl border border-purple-500/30 p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-purple-500/20 rounded-xl">
                  <Zap className="w-8 h-8 text-purple-400" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-white">Stripe/E-Green Webhook</h3>
                  <p className="text-slate-400">Configuración y verificación de estado de transacciones</p>
                </div>
              </div>
              <button
                onClick={fetchWebhookConfig}
                className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-lg transition-colors flex items-center gap-2"
              >
                <RefreshCw className="w-4 h-4" />
                Actualizar Config
              </button>
            </div>
          </div>

          {/* Webhook Configuration */}
          {webhookConfig && (
            <div className="bg-slate-800/50 rounded-xl border border-slate-700 p-6">
              <h4 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                <Settings className="w-5 h-5 text-purple-400" />
                Configuración de Webhook
              </h4>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                <div className="p-4 bg-slate-700/30 rounded-lg">
                  <div className="text-slate-400 text-sm mb-2">Stripe Webhook Endpoint</div>
                  <code className="text-purple-400 text-sm break-all block bg-slate-900/50 p-2 rounded">
                    {webhookConfig.webhookEndpoints?.stripe}
                  </code>
                </div>
                <div className="p-4 bg-slate-700/30 rounded-lg">
                  <div className="text-slate-400 text-sm mb-2">JSON Webhook Endpoint</div>
                  <code className="text-emerald-400 text-sm break-all block bg-slate-900/50 p-2 rounded">
                    {webhookConfig.webhookEndpoints?.json}
                  </code>
                </div>
              </div>

              <div className="p-4 bg-slate-700/30 rounded-lg mb-4">
                <div className="text-slate-400 text-sm mb-2">Producción URL</div>
                <code className="text-yellow-400 text-sm break-all block bg-slate-900/50 p-2 rounded">
                  {webhookConfig.productionUrl}
                </code>
              </div>

              <div className="p-4 bg-purple-500/10 border border-purple-500/30 rounded-lg">
                <div className="text-purple-400 font-medium mb-2">Eventos Soportados:</div>
                <div className="flex flex-wrap gap-2">
                  {webhookConfig.supportedEvents?.map((event: string, idx: number) => (
                    <span key={idx} className="px-3 py-1 bg-purple-500/20 text-purple-300 rounded-full text-sm">
                      {event}
                    </span>
                  ))}
                </div>
              </div>

              <div className="mt-4 p-4 bg-blue-500/10 border border-blue-500/30 rounded-lg">
                <div className="text-blue-400 font-medium mb-2">📋 Instrucciones:</div>
                <ul className="text-slate-300 text-sm space-y-1">
                  <li>• <strong>Stripe:</strong> {webhookConfig.instructions?.stripe}</li>
                  <li>• <strong>Manual:</strong> {webhookConfig.instructions?.manual}</li>
                </ul>
              </div>
            </div>
          )}

          {/* Pending Transactions */}
          <div className="bg-slate-800/50 rounded-xl border border-slate-700 p-6">
            <h4 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
              <Clock className="w-5 h-5 text-yellow-400" />
              Transacciones Pendientes
              {pendingTransactions.size > 0 && (
                <span className="px-2 py-1 bg-yellow-500/20 text-yellow-400 text-sm rounded-full">
                  {pendingTransactions.size}
                </span>
              )}
            </h4>

            {pendingTransactions.size === 0 ? (
              <div className="text-center py-8">
                <Clock className="w-12 h-12 text-slate-600 mx-auto mb-4" />
                <p className="text-slate-400">No hay transacciones pendientes de verificación</p>
                <p className="text-slate-500 text-sm">Las transacciones aparecerán aquí cuando inicies una transferencia</p>
              </div>
            ) : (
              <div className="space-y-4">
                {Array.from(pendingTransactions.entries()).map(([reference, transaction]) => (
                  <div key={reference} className="p-4 bg-slate-700/30 rounded-lg border border-slate-600">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-lg ${
                          transaction.status === 'funds_received' 
                            ? 'bg-emerald-500/20' 
                            : 'bg-yellow-500/20'
                        }`}>
                          {transaction.status === 'funds_received' ? (
                            <CheckCircle className="w-5 h-5 text-emerald-400" />
                          ) : (
                            <Clock className="w-5 h-5 text-yellow-400" />
                          )}
                        </div>
                        <div>
                          <div className="text-white font-medium">{transaction.senderName}</div>
                          <code className="text-purple-400 text-sm">{reference}</code>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-emerald-400 font-bold">
                          £{transaction.amount?.toLocaleString()}
                        </div>
                        <div className={`text-xs px-2 py-1 rounded ${
                          transaction.status === 'funds_received'
                            ? 'bg-emerald-500/20 text-emerald-400'
                            : 'bg-yellow-500/20 text-yellow-400'
                        }`}>
                          {transaction.status === 'funds_received' ? 'FONDOS RECIBIDOS' : 'ESPERANDO FONDOS'}
                        </div>
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <button
                        onClick={() => verifyTransactionStatus(reference)}
                        disabled={verifyingStatus === reference}
                        className="flex-1 py-2 bg-purple-600 hover:bg-purple-500 disabled:bg-slate-600 text-white rounded-lg transition-colors flex items-center justify-center gap-2 text-sm"
                      >
                        {verifyingStatus === reference ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin" />
                            Verificando...
                          </>
                        ) : (
                          <>
                            <RefreshCw className="w-4 h-4" />
                            Verificar Estado
                          </>
                        )}
                      </button>
                      {transaction.status !== 'funds_received' && (
                        <button
                          onClick={() => confirmFundsReceived(reference, transaction.amount)}
                          className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg transition-colors flex items-center gap-2 text-sm"
                        >
                          <Check className="w-4 h-4" />
                          Confirmar Manual
                        </button>
                      )}
                    </div>

                    {transaction.confirmedAt && (
                      <div className="mt-3 p-2 bg-emerald-500/10 rounded text-emerald-400 text-sm">
                        ✅ Confirmado: {new Date(transaction.confirmedAt).toLocaleString()}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Incoming Transfers with Status */}
          <div className="bg-slate-800/50 rounded-xl border border-slate-700 p-6">
            <h4 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
              <Download className="w-5 h-5 text-blue-400" />
              Transferencias con Verificación de Estado
            </h4>

            <div className="space-y-3">
              {incomingTransfers.filter(t => t.status === 'pending').map(transfer => (
                <div key={transfer.id} className="p-4 bg-slate-700/30 rounded-lg flex items-center justify-between">
                  <div>
                    <div className="text-white font-medium">{transfer.senderName}</div>
                    <div className="flex items-center gap-2 text-sm">
                      <code className="text-purple-400">{transfer.referenceMemo}</code>
                      <span className="text-slate-500">•</span>
                      <span className="text-emerald-400">£{transfer.amount}</span>
                    </div>
                  </div>
                  <button
                    onClick={() => verifyTransactionStatus(transfer.referenceMemo)}
                    disabled={verifyingStatus === transfer.referenceMemo}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-600 text-white rounded-lg transition-colors flex items-center gap-2 text-sm"
                  >
                    {verifyingStatus === transfer.referenceMemo ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <RefreshCw className="w-4 h-4" />
                    )}
                    Verificar
                  </button>
                </div>
              ))}

              {incomingTransfers.filter(t => t.status === 'pending').length === 0 && (
                <div className="text-center py-6 text-slate-400">
                  No hay transferencias pendientes de verificación
                </div>
              )}
            </div>
          </div>

          {/* Quick Actions */}
          <div className="bg-gradient-to-r from-emerald-900/30 to-slate-800/30 rounded-xl border border-emerald-500/30 p-6">
            <h4 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
              <Zap className="w-5 h-5 text-emerald-400" />
              Acciones Rápidas
            </h4>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <button
                onClick={async () => {
                  const response = await fetch(`${BACKEND_URL}/api/egreen/transactions`);
                  const data = await response.json();
                  if (data.success) {
                    data.transactions.forEach((t: any) => {
                      setPendingTransactions(prev => new Map(prev).set(t.reference, t));
                    });
                  }
                }}
                className="p-4 bg-slate-700/50 hover:bg-slate-700 rounded-lg transition-colors text-left"
              >
                <RefreshCw className="w-6 h-6 text-purple-400 mb-2" />
                <div className="text-white font-medium">Sincronizar Transacciones</div>
                <div className="text-slate-400 text-sm">Obtener todas las transacciones del servidor</div>
              </button>

              <button
                onClick={async () => {
                  const response = await fetch(`${BACKEND_URL}/api/egreen/webhook/events`);
                  const data = await response.json();
                  console.log('Webhook Events:', data);
                  alert(`${data.count} eventos webhook recibidos. Ver consola para detalles.`);
                }}
                className="p-4 bg-slate-700/50 hover:bg-slate-700 rounded-lg transition-colors text-left"
              >
                <FileText className="w-6 h-6 text-blue-400 mb-2" />
                <div className="text-white font-medium">Ver Eventos Webhook</div>
                <div className="text-slate-400 text-sm">Listar todos los eventos recibidos</div>
              </button>

              <button
                onClick={() => {
                  const testPayload = {
                    reference: incomingTransfers[0]?.referenceMemo || 'TEST-REF',
                    status: 'funds_received',
                    amount: 10
                  };
                  navigator.clipboard.writeText(JSON.stringify(testPayload, null, 2));
                  alert('Payload de prueba copiado al portapapeles');
                }}
                className="p-4 bg-slate-700/50 hover:bg-slate-700 rounded-lg transition-colors text-left"
              >
                <ExternalLink className="w-6 h-6 text-yellow-400 mb-2" />
                <div className="text-white font-medium">Copiar Payload Test</div>
                <div className="text-slate-400 text-sm">Payload para simular webhook</div>
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="mt-6 text-center text-slate-500 text-sm space-y-1">
        <div>E-GREEN TRANSFER v2.0 - International Bank Transfer System</div>
        <div className="text-xs text-slate-600">
          E-GREEN-ENERGY GLOBAL LTD • London, UK • API: us-central1-egreen-tranfers.cloudfunctions.net
        </div>
      </div>
    </div>
  );
}
