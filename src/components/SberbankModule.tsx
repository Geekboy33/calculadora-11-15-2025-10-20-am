/**
 * Sberbank Ruble Payment Orders Module
 * Integration with Sberbank API for creating Ruble Payment Orders
 * https://developers.sber.ru/docs/ru/sber-api/specifications/payments/create-payment
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  Building2, Send, History, Settings, CheckCircle, AlertCircle,
  FileText, CreditCard, Copy, RefreshCw, Info, Download, FileDown,
  Wifi, WifiOff, Eye, Trash2, Filter, Calendar, BarChart3, Clock
} from 'lucide-react';
import { BankingCard, BankingHeader, BankingButton, BankingSection, BankingInput } from './ui/BankingComponents';
import { useBankingTheme } from '../hooks/useBankingTheme';
import { 
  SberbankClient, 
  SberbankConfig, 
  SberbankPaymentOrder, 
  SBERBANK_API_CONFIG,
  BANK_STATUS,
  isFinalStatus,
  isFinalSuccessStatus,
  isFinalFailedStatus,
  isIntermediateStatus
} from '../lib/sberbankClient';
import { custodyStore, type CustodyAccount } from '../lib/custody-store';
import { balanceStore, type CurrencyBalance } from '../lib/balances-store';

// Sberbank brand colors
const SBERBANK_GREEN = '#21a038';

// Payment history entry type
interface PaymentHistoryEntry {
  id: string;
  externalId: string;
  number?: string;
  date: string;
  amount: number;
  status: 'DRAFT' | 'PENDING' | 'COMPLETED' | 'FAILED' | 'CANCELLED';
  payerName: string;
  payerInn: string;
  payerAccount: string;
  payeeName: string;
  payeeInn?: string;
  payeeAccount?: string;
  payeeBankBic: string;
  purpose: string;
  priority: string;
  urgencyCode?: string;
  createdAt: string;
  completedAt?: string;
  custodyAccountId?: string;
  custodyAccountName?: string;
}

export function SberbankModule() {
  const { fmt, isSpanish } = useBankingTheme();
  const receiptRef = useRef<HTMLDivElement>(null);

  // API Configuration
  const [config, setConfig] = useState<SberbankConfig>(() => {
    const saved = localStorage.getItem('sberbank_config');
    if (saved) {
      const parsed = JSON.parse(saved);
      // Ensure environment is set
      if (!parsed.environment) {
        parsed.environment = 'TEST';
        parsed.baseUrl = SBERBANK_API_CONFIG.ENVIRONMENTS.TEST;
      }
      return parsed;
    }
    return {
      baseUrl: SBERBANK_API_CONFIG.ENVIRONMENTS.TEST,
      accessToken: '',
      environment: 'TEST' as 'TEST' | 'PRODUCTION'
    };
  });

  // Connection status
  const [connectionStatus, setConnectionStatus] = useState<'connected' | 'disconnected' | 'checking'>('disconnected');
  const [lastConnectionCheck, setLastConnectionCheck] = useState<string>('');

  // Accounts
  const [custodyAccounts, setCustodyAccounts] = useState<CustodyAccount[]>([]);
  const [accountLedgerBalances, setAccountLedgerBalances] = useState<CurrencyBalance[]>([]);
  const [selectedCustodyAccountId, setSelectedCustodyAccountId] = useState<string>('');
  const [balanceSource, setBalanceSource] = useState<'custody' | 'ledger'>('custody');
  
  // UI State
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [activeTab, setActiveTab] = useState<'payment' | 'history' | 'reports' | 'settings'>('payment');
  const [client, setClient] = useState<SberbankClient | null>(null);

  // Payment form state - Pre-filled with Digital Commercial Bank Ltd (Payer)
  const [paymentForm, setPaymentForm] = useState<SberbankPaymentOrder>({
    number: '',
    date: SberbankClient.formatDate(),
    externalId: SberbankClient.generateExternalId(),
    amount: 0,
    operationCode: '01',
    priority: '3',
    urgencyCode: 'NORMAL',
    purpose: '',
    // ═══════════════════════════════════════════════════════════════════════════
    // PAYER: Digital Commercial Bank Ltd (Russia)
    // ═══════════════════════════════════════════════════════════════════════════
    payerName: 'DIGITAL COMMERCIAL BANK LTD',           // Nombre legal completo
    payerInn: '7707083893',                             // INN (10 dígitos - empresa)
    payerKpp: '770701001',                              // KPP (código de registro fiscal)
    payerAccount: '40702810938000000001',               // Cuenta corriente (20 dígitos)
    payerBankBic: '044525225',                          // BIC Sberbank Moscow
    payerBankCorrAccount: '30101810400000000225',       // Cuenta corresponsal Sberbank
    // ═══════════════════════════════════════════════════════════════════════════
    // PAYEE: (To be filled by user)
    // ═══════════════════════════════════════════════════════════════════════════
    payeeName: '',
    payeeInn: '',
    payeeKpp: '',
    payeeAccount: '',
    payeeBankBic: '',
    payeeBankCorrAccount: '',
  });

  // Payment history
  const [paymentHistory, setPaymentHistory] = useState<PaymentHistoryEntry[]>(() => {
    const saved = localStorage.getItem('sberbank_payment_history');
    return saved ? JSON.parse(saved) : [];
  });

  // History filters
  const [historyFilter, setHistoryFilter] = useState<'all' | 'COMPLETED' | 'PENDING' | 'DRAFT' | 'FAILED'>('all');
  const [dateFilter, setDateFilter] = useState<{ from: string; to: string }>({ from: '', to: '' });
  const [selectedPayment, setSelectedPayment] = useState<PaymentHistoryEntry | null>(null);

  // Reports state
  const [reportDateRange, setReportDateRange] = useState<{ from: string; to: string }>({
    from: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    to: new Date().toISOString().split('T')[0]
  });

  // Immediate processing toggle (digestSignatures)
  const [immediateProcessing, setImmediateProcessing] = useState(true);

  // Load Custody Accounts
  useEffect(() => {
    const loadCustodyAccounts = () => {
      const accounts = custodyStore.getAccounts();
      setCustodyAccounts(accounts);
    };
    
    loadCustodyAccounts();
    const unsubscribe = custodyStore.subscribe(setCustodyAccounts);
    return () => unsubscribe();
  }, []);

  // Load Account Ledger Balances
  useEffect(() => {
    const loadBalances = () => {
      const balances = balanceStore.getBalances();
      setAccountLedgerBalances(balances);
    };
    
    loadBalances();
    const unsubscribe = balanceStore.subscribe(setAccountLedgerBalances);
    return () => unsubscribe();
  }, []);

  // Save config and initialize client
  useEffect(() => {
    if (config.accessToken) {
      localStorage.setItem('sberbank_config', JSON.stringify(config));
      setClient(new SberbankClient(config));
    }
  }, [config]);

  // Auto-fill payer info from selected custody account
  useEffect(() => {
    if (selectedCustodyAccountId && balanceSource === 'custody') {
      const account = custodyAccounts.find(a => a.id === selectedCustodyAccountId);
      if (account) {
        setPaymentForm(prev => ({
          ...prev,
          payerName: account.accountName || prev.payerName,
          payerAccount: account.accountNumber || prev.payerAccount,
        }));
      }
    }
  }, [selectedCustodyAccountId, balanceSource, custodyAccounts]);

  // Check API Connection
  const handleCheckConnection = async () => {
    if (!config.accessToken) {
      setConnectionStatus('disconnected');
      setError(isSpanish ? 'Configure el access token primero' : 'Configure access token first');
      return;
    }

    setConnectionStatus('checking');
    setError('');
    setSuccess('');

    try {
      // Create client and verify connection
      const testClient = new SberbankClient(config);
      const status = await testClient.verifyConnection();
      
      setLastConnectionCheck(new Date().toLocaleString());
      
      if (status.connected) {
        setConnectionStatus('connected');
        if (status.tokenValid === false) {
          setError(isSpanish 
            ? `⚠️ Servidor alcanzable pero token inválido: ${status.error}`
            : `⚠️ Server reachable but token invalid: ${status.error}`);
        } else if (status.error && status.error.includes('CORS')) {
          setSuccess(isSpanish 
            ? `✅ API configurada correctamente (${status.latency}ms). En producción usar proxy del servidor.`
            : `✅ API configured correctly (${status.latency}ms). Use server proxy in production.`);
        } else if (status.error) {
          setSuccess(isSpanish 
            ? `✅ Conexión establecida (${status.latency}ms). Nota: ${status.error}`
            : `✅ Connection established (${status.latency}ms). Note: ${status.error}`);
        } else {
          setSuccess(isSpanish 
            ? `✅ Conexión exitosa con Sberbank API (${status.latency}ms). Scope: ${status.scope}`
            : `✅ Successfully connected to Sberbank API (${status.latency}ms). Scope: ${status.scope}`);
        }
      } else {
        setConnectionStatus('disconnected');
        setError(status.error || (isSpanish ? 'No se pudo conectar al servidor' : 'Could not connect to server'));
      }
    } catch (err: any) {
      setConnectionStatus('disconnected');
      setError(err.message || (isSpanish ? 'Error de conexión' : 'Connection error'));
      setLastConnectionCheck(new Date().toLocaleString());
    }
  };

  // Generate new external ID
  const handleGenerateExternalId = () => {
    setPaymentForm({
      ...paymentForm,
      externalId: SberbankClient.generateExternalId()
    });
  };

  // Copy to clipboard
  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setSuccess(isSpanish ? 'Copiado al portapapeles' : 'Copied to clipboard');
    setTimeout(() => setSuccess(''), 2000);
  };

  // Get selected account balance
  const getSelectedAccountBalance = (): { balance: number; currency: string; name: string } | null => {
    if (!selectedCustodyAccountId) return null;
    
    if (balanceSource === 'custody') {
      const account = custodyAccounts.find(a => a.id === selectedCustodyAccountId);
      if (account) {
        return { balance: account.availableBalance, currency: account.currency, name: account.accountName };
      }
    } else {
      const balance = accountLedgerBalances.find(b => b.currency === selectedCustodyAccountId);
      if (balance) {
        return { balance: balance.totalAmount, currency: balance.currency, name: balance.accountName };
      }
    }
    return null;
  };

  // Create payment order
  const handleCreatePayment = async () => {
    if (!client) {
      setError(isSpanish ? 'Configura el access token primero' : 'Configure access token first');
      setActiveTab('settings');
      return;
    }

    const accountInfo = getSelectedAccountBalance();

    // Validate balance
    if (accountInfo) {
      if (accountInfo.currency !== 'RUB' && accountInfo.currency !== 'RUR') {
        setError(isSpanish 
          ? 'Solo se pueden crear órdenes de pago en rublos (RUB)'
          : 'Only Ruble payment orders can be created (RUB)');
        return;
      }

      if (accountInfo.balance < paymentForm.amount) {
        setError(isSpanish 
          ? `Balance insuficiente. Disponible: ₽${accountInfo.balance.toLocaleString()}`
          : `Insufficient balance. Available: ₽${accountInfo.balance.toLocaleString()}`);
        return;
      }
    }

    // Validate form
    if (!paymentForm.payerName || !paymentForm.payerInn || !paymentForm.payerAccount) {
      setError(isSpanish ? 'Complete la información del pagador' : 'Complete payer information');
      return;
    }
    if (!paymentForm.payeeName || !paymentForm.payeeBankBic) {
      setError(isSpanish ? 'Complete la información del beneficiario' : 'Complete payee information');
      return;
    }
    if (!paymentForm.amount || paymentForm.amount < 0.01) {
      setError(isSpanish ? 'El monto debe ser mayor a 0.01' : 'Amount must be greater than 0.01');
      return;
    }
    if (!paymentForm.purpose) {
      setError(isSpanish ? 'El propósito del pago es requerido' : 'Payment purpose is required');
      return;
    }

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      // Build payment order with optional digestSignatures for immediate processing
      const orderToSubmit: SberbankPaymentOrder = {
        ...paymentForm,
        // Add digestSignatures for immediate processing (not DRAFT)
        digestSignatures: immediateProcessing ? [{ externalId: paymentForm.externalId }] : undefined,
      };

      const response = await client.createPaymentOrder(orderToSubmit);
      
      // Create history entry
      const historyEntry: PaymentHistoryEntry = {
        id: `sber_${Date.now()}`,
        externalId: paymentForm.externalId,
        number: paymentForm.number,
        date: paymentForm.date,
        amount: paymentForm.amount,
        status: 'DRAFT',
        payerName: paymentForm.payerName,
        payerInn: paymentForm.payerInn,
        payerAccount: paymentForm.payerAccount,
        payeeName: paymentForm.payeeName,
        payeeInn: paymentForm.payeeInn || undefined,
        payeeAccount: paymentForm.payeeAccount || undefined,
        payeeBankBic: paymentForm.payeeBankBic,
        purpose: paymentForm.purpose,
        priority: paymentForm.priority,
        urgencyCode: paymentForm.urgencyCode || undefined,
        createdAt: new Date().toISOString(),
        custodyAccountId: selectedCustodyAccountId || undefined,
        custodyAccountName: accountInfo?.name,
      };

      const newHistory = [historyEntry, ...paymentHistory].slice(0, 100);
      setPaymentHistory(newHistory);
      localStorage.setItem('sberbank_payment_history', JSON.stringify(newHistory));

      // Update balance if custody account selected
      if (selectedCustodyAccountId && balanceSource === 'custody') {
        const allAccounts = custodyStore.getAccounts();
        const accountIndex = allAccounts.findIndex(a => a.id === selectedCustodyAccountId);
        if (accountIndex !== -1) {
          allAccounts[accountIndex].availableBalance -= paymentForm.amount;
          allAccounts[accountIndex].reservedBalance += paymentForm.amount;
          allAccounts[accountIndex].lastUpdated = new Date().toISOString();
          
          const STORAGE_KEY = 'Digital Commercial Bank Ltd_custody_accounts';
          const data = {
            accounts: allAccounts,
            totalReserved: allAccounts.reduce((sum, a) => sum + a.reservedBalance, 0),
            totalAvailable: allAccounts.reduce((sum, a) => sum + a.availableBalance, 0),
            lastSync: new Date().toISOString(),
          };
          localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
        }
      }

      setSuccess(isSpanish 
        ? `✅ Orden de pago creada. ID: ${paymentForm.externalId}`
        : `✅ Payment order created. ID: ${paymentForm.externalId}`);

      // Reset form for next payment
      setPaymentForm({
        ...paymentForm,
        externalId: SberbankClient.generateExternalId(),
        number: '',
        amount: 0,
        purpose: '',
        payeeName: '',
        payeeInn: '',
        payeeAccount: '',
        payeeBankBic: '',
        payeeBankCorrAccount: '',
      });

    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  // Generate Receipt TXT
  const generateReceiptTXT = (payment: PaymentHistoryEntry): string => {
    const lines = [
      '═══════════════════════════════════════════════════════════════════',
      '                    ПЛАТЁЖНОЕ ПОРУЧЕНИЕ / PAYMENT ORDER',
      '                           SBERBANK RUSSIA',
      '═══════════════════════════════════════════════════════════════════',
      '',
      `Номер документа / Document Number: ${payment.number || 'N/A'}`,
      `Дата / Date: ${payment.date}`,
      `External ID: ${payment.externalId}`,
      `Статус / Status: ${payment.status}`,
      '',
      '───────────────────────────────────────────────────────────────────',
      '                    ПЛАТЕЛЬЩИК / PAYER',
      '───────────────────────────────────────────────────────────────────',
      `Наименование / Name: ${payment.payerName}`,
      `ИНН / INN: ${payment.payerInn}`,
      `Счёт / Account: ${payment.payerAccount}`,
      '',
      '───────────────────────────────────────────────────────────────────',
      '                    ПОЛУЧАТЕЛЬ / PAYEE',
      '───────────────────────────────────────────────────────────────────',
      `Наименование / Name: ${payment.payeeName}`,
      `ИНН / INN: ${payment.payeeInn || 'N/A'}`,
      `Счёт / Account: ${payment.payeeAccount || 'N/A'}`,
      `БИК / BIC: ${payment.payeeBankBic}`,
      '',
      '───────────────────────────────────────────────────────────────────',
      '                    ДЕТАЛИ ПЛАТЕЖА / PAYMENT DETAILS',
      '───────────────────────────────────────────────────────────────────',
      `Сумма / Amount: ₽${payment.amount.toLocaleString('ru-RU', { minimumFractionDigits: 2 })}`,
      `Приоритет / Priority: ${payment.priority}`,
      `Срочность / Urgency: ${payment.urgencyCode || 'NORMAL'}`,
      '',
      'Назначение платежа / Purpose:',
      payment.purpose,
      '',
      '───────────────────────────────────────────────────────────────────',
      `Создано / Created: ${new Date(payment.createdAt).toLocaleString()}`,
      payment.completedAt ? `Завершено / Completed: ${new Date(payment.completedAt).toLocaleString()}` : '',
      payment.custodyAccountName ? `Счёт списания / Debit Account: ${payment.custodyAccountName}` : '',
      '',
      '═══════════════════════════════════════════════════════════════════',
      '          Digital Commercial Bank Ltd - Sberbank Integration',
      '═══════════════════════════════════════════════════════════════════',
    ].filter(Boolean);

    return lines.join('\n');
  };

  // Download Receipt as TXT
  const handleDownloadReceiptTXT = (payment: PaymentHistoryEntry) => {
    const content = generateReceiptTXT(payment);
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `sberbank_payment_${payment.externalId.slice(0, 8)}_${payment.date}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Download Receipt as PDF
  const handleDownloadReceiptPDF = async (payment: PaymentHistoryEntry) => {
    try {
      const { jsPDF } = await import('jspdf');
      const doc = new jsPDF();

      // Header
      doc.setFillColor(33, 160, 56); // Sberbank green
      doc.rect(0, 0, 210, 35, 'F');
      
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(20);
      doc.text('SBERBANK', 105, 15, { align: 'center' });
      doc.setFontSize(12);
      doc.text('Payment Order / Платёжное Поручение', 105, 25, { align: 'center' });

      // Reset text color
      doc.setTextColor(0, 0, 0);
      
      let y = 45;
      const leftMargin = 20;
      const rightCol = 110;

      // Document Info
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.text('Document Information', leftMargin, y);
      y += 8;
      doc.setFont('helvetica', 'normal');
      doc.text(`Number: ${payment.number || 'N/A'}`, leftMargin, y);
      doc.text(`Date: ${payment.date}`, rightCol, y);
      y += 6;
      doc.text(`External ID: ${payment.externalId}`, leftMargin, y);
      y += 6;
      doc.text(`Status: ${payment.status}`, leftMargin, y);
      
      // Line
      y += 10;
      doc.setDrawColor(33, 160, 56);
      doc.line(leftMargin, y, 190, y);
      y += 10;

      // Payer
      doc.setFont('helvetica', 'bold');
      doc.text('Payer / Плательщик', leftMargin, y);
      y += 8;
      doc.setFont('helvetica', 'normal');
      doc.text(`Name: ${payment.payerName}`, leftMargin, y);
      y += 6;
      doc.text(`INN: ${payment.payerInn}`, leftMargin, y);
      doc.text(`Account: ${payment.payerAccount}`, rightCol, y);
      
      // Line
      y += 10;
      doc.line(leftMargin, y, 190, y);
      y += 10;

      // Payee
      doc.setFont('helvetica', 'bold');
      doc.text('Payee / Получатель', leftMargin, y);
      y += 8;
      doc.setFont('helvetica', 'normal');
      doc.text(`Name: ${payment.payeeName}`, leftMargin, y);
      y += 6;
      doc.text(`INN: ${payment.payeeInn || 'N/A'}`, leftMargin, y);
      doc.text(`Account: ${payment.payeeAccount || 'N/A'}`, rightCol, y);
      y += 6;
      doc.text(`BIC: ${payment.payeeBankBic}`, leftMargin, y);

      // Line
      y += 10;
      doc.line(leftMargin, y, 190, y);
      y += 10;

      // Amount
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(14);
      doc.text(`Amount: RUB ${payment.amount.toLocaleString('ru-RU', { minimumFractionDigits: 2 })}`, leftMargin, y);
      y += 10;

      // Purpose
      doc.setFontSize(10);
      doc.text('Purpose / Назначение платежа:', leftMargin, y);
      y += 6;
      doc.setFont('helvetica', 'normal');
      
      // Word wrap for purpose
      const purposeLines = doc.splitTextToSize(payment.purpose, 170);
      doc.text(purposeLines, leftMargin, y);
      y += purposeLines.length * 5 + 10;

      // Footer
      doc.setDrawColor(33, 160, 56);
      doc.line(leftMargin, y, 190, y);
      y += 8;
      doc.setFontSize(8);
      doc.setTextColor(128, 128, 128);
      doc.text(`Created: ${new Date(payment.createdAt).toLocaleString()}`, leftMargin, y);
      y += 5;
      doc.text('Digital Commercial Bank Ltd - Sberbank Integration', leftMargin, y);

      doc.save(`sberbank_payment_${payment.externalId.slice(0, 8)}_${payment.date}.pdf`);
    } catch (err) {
      console.error('Error generating PDF:', err);
      setError(isSpanish ? 'Error al generar PDF' : 'Error generating PDF');
    }
  };

  // Generate Full Report TXT
  const generateFullReportTXT = (): string => {
    const filteredPayments = getFilteredPayments();
    
    const totalAmount = filteredPayments.reduce((sum, p) => sum + p.amount, 0);
    const completedPayments = filteredPayments.filter(p => p.status === 'COMPLETED');
    const pendingPayments = filteredPayments.filter(p => p.status === 'PENDING' || p.status === 'DRAFT');

    const lines = [
      '═══════════════════════════════════════════════════════════════════════════',
      '                    SBERBANK PAYMENT ORDERS REPORT',
      '                    ОТЧЁТ ПО ПЛАТЁЖНЫМ ПОРУЧЕНИЯМ',
      '═══════════════════════════════════════════════════════════════════════════',
      '',
      `Report Generated: ${new Date().toLocaleString()}`,
      `Period: ${reportDateRange.from} to ${reportDateRange.to}`,
      '',
      '═══════════════════════════════════════════════════════════════════════════',
      '                              SUMMARY',
      '═══════════════════════════════════════════════════════════════════════════',
      '',
      `Total Payments: ${filteredPayments.length}`,
      `Total Amount: ₽${totalAmount.toLocaleString('ru-RU', { minimumFractionDigits: 2 })}`,
      `Completed: ${completedPayments.length}`,
      `Pending/Draft: ${pendingPayments.length}`,
      '',
      '═══════════════════════════════════════════════════════════════════════════',
      '                          PAYMENT DETAILS',
      '═══════════════════════════════════════════════════════════════════════════',
    ];

    filteredPayments.forEach((payment, index) => {
      lines.push('');
      lines.push(`─── Payment ${index + 1} ───────────────────────────────────────────────`);
      lines.push(`External ID: ${payment.externalId}`);
      lines.push(`Date: ${payment.date} | Status: ${payment.status}`);
      lines.push(`Amount: ₽${payment.amount.toLocaleString('ru-RU', { minimumFractionDigits: 2 })}`);
      lines.push(`Payer: ${payment.payerName} (INN: ${payment.payerInn})`);
      lines.push(`Payee: ${payment.payeeName} (BIC: ${payment.payeeBankBic})`);
      lines.push(`Purpose: ${payment.purpose}`);
    });

    lines.push('');
    lines.push('═══════════════════════════════════════════════════════════════════════════');
    lines.push('                   Digital Commercial Bank Ltd');
    lines.push('                    Sberbank API Integration');
    lines.push('═══════════════════════════════════════════════════════════════════════════');

    return lines.join('\n');
  };

  // Download Full Report TXT
  const handleDownloadReportTXT = () => {
    const content = generateFullReportTXT();
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `sberbank_report_${reportDateRange.from}_${reportDateRange.to}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Download Full Report PDF
  const handleDownloadReportPDF = async () => {
    try {
      const { jsPDF } = await import('jspdf');
      const doc = new jsPDF();
      
      const filteredPayments = getFilteredPayments();
      const totalAmount = filteredPayments.reduce((sum, p) => sum + p.amount, 0);

      // Header
      doc.setFillColor(33, 160, 56);
      doc.rect(0, 0, 210, 30, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(18);
      doc.text('SBERBANK PAYMENT REPORT', 105, 12, { align: 'center' });
      doc.setFontSize(10);
      doc.text(`Period: ${reportDateRange.from} to ${reportDateRange.to}`, 105, 22, { align: 'center' });

      doc.setTextColor(0, 0, 0);
      let y = 40;

      // Summary
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.text('Summary', 20, y);
      y += 8;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      doc.text(`Total Payments: ${filteredPayments.length}`, 20, y);
      doc.text(`Total Amount: RUB ${totalAmount.toLocaleString('ru-RU', { minimumFractionDigits: 2 })}`, 110, y);
      y += 15;

      // Table header
      doc.setFillColor(240, 240, 240);
      doc.rect(15, y - 5, 180, 10, 'F');
      doc.setFont('helvetica', 'bold');
      doc.text('Date', 20, y);
      doc.text('Payee', 50, y);
      doc.text('Amount', 120, y);
      doc.text('Status', 160, y);
      y += 10;

      // Table rows
      doc.setFont('helvetica', 'normal');
      filteredPayments.slice(0, 30).forEach(payment => {
        if (y > 270) {
          doc.addPage();
          y = 20;
        }
        doc.text(payment.date, 20, y);
        doc.text(payment.payeeName.slice(0, 25), 50, y);
        doc.text(`RUB ${payment.amount.toLocaleString()}`, 120, y);
        doc.text(payment.status, 160, y);
        y += 7;
      });

      // Footer
      doc.setFontSize(8);
      doc.setTextColor(128, 128, 128);
      doc.text(`Generated: ${new Date().toLocaleString()} - Digital Commercial Bank Ltd`, 105, 285, { align: 'center' });

      doc.save(`sberbank_report_${reportDateRange.from}_${reportDateRange.to}.pdf`);
    } catch (err) {
      console.error('Error generating PDF report:', err);
      setError(isSpanish ? 'Error al generar reporte PDF' : 'Error generating PDF report');
    }
  };

  // Filter payments
  const getFilteredPayments = (): PaymentHistoryEntry[] => {
    return paymentHistory.filter(payment => {
      // Status filter
      if (historyFilter !== 'all' && payment.status !== historyFilter) {
        return false;
      }
      // Date filter
      if (dateFilter.from && payment.date < dateFilter.from) {
        return false;
      }
      if (dateFilter.to && payment.date > dateFilter.to) {
        return false;
      }
      return true;
    });
  };

  // Delete payment from history
  const handleDeletePayment = (id: string) => {
    const newHistory = paymentHistory.filter(p => p.id !== id);
    setPaymentHistory(newHistory);
    localStorage.setItem('sberbank_payment_history', JSON.stringify(newHistory));
    setSelectedPayment(null);
  };

  // Get statistics
  const getStatistics = () => {
    const payments = getFilteredPayments();
    return {
      total: payments.length,
      totalAmount: payments.reduce((sum, p) => sum + p.amount, 0),
      completed: payments.filter(p => p.status === 'COMPLETED').length,
      pending: payments.filter(p => p.status === 'PENDING' || p.status === 'DRAFT').length,
      failed: payments.filter(p => p.status === 'FAILED').length,
    };
  };

  const stats = getStatistics();

  return (
    <div className="min-h-screen bg-[var(--bg-main)] p-card">
      <div className="max-w-7xl mx-auto space-y-6">
        
        {/* Header */}
        <div className="relative overflow-hidden rounded-2xl p-6" style={{ background: `linear-gradient(135deg, ${SBERBANK_GREEN} 0%, #1a8833 100%)` }}>
          <div className="absolute inset-0 opacity-10">
            <div className="absolute top-0 right-0 w-96 h-96 rounded-full bg-white/20 blur-3xl transform translate-x-1/2 -translate-y-1/2" />
          </div>
          <div className="relative flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-xl bg-white/10 backdrop-blur flex items-center justify-center">
                <Building2 className="w-8 h-8 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-white">Sberbank</h1>
                <p className="text-white/80 text-sm mt-1">
                  {isSpanish ? 'Órdenes de Pago en Rublos (RPO)' : 'Ruble Payment Orders (RPO)'}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3 flex-wrap">
              {/* Connection Status */}
              <button
                onClick={handleCheckConnection}
                className={`px-4 py-2 rounded-full text-sm font-semibold flex items-center gap-2 transition-all ${
                  connectionStatus === 'connected' ? 'bg-white/20 text-white' :
                  connectionStatus === 'checking' ? 'bg-amber-500/20 text-amber-200' :
                  'bg-red-500/20 text-red-200'
                }`}
              >
                {connectionStatus === 'connected' ? (
                  <><Wifi className="w-4 h-4" />{isSpanish ? 'Conectado' : 'Connected'}</>
                ) : connectionStatus === 'checking' ? (
                  <><RefreshCw className="w-4 h-4 animate-spin" />{isSpanish ? 'Verificando...' : 'Checking...'}</>
                ) : (
                  <><WifiOff className="w-4 h-4" />{isSpanish ? 'Verificar Conexión' : 'Check Connection'}</>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Messages */}
        {error && (
          <BankingCard className="p-card-sm bg-red-500/10 border-red-500/30">
            <div className="flex items-center gap-card">
              <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0" />
              <p className="text-red-400">{error}</p>
              <button onClick={() => setError('')} className="ml-auto text-red-400 hover:text-red-300">×</button>
            </div>
          </BankingCard>
        )}

        {success && (
          <BankingCard className="p-card-sm bg-emerald-500/10 border-emerald-500/30">
            <div className="flex items-center gap-card">
              <CheckCircle className="w-5 h-5 text-emerald-400 flex-shrink-0" />
              <p className="text-emerald-400">{success}</p>
              <button onClick={() => setSuccess('')} className="ml-auto text-emerald-400 hover:text-emerald-300">×</button>
            </div>
          </BankingCard>
        )}

        {/* Tabs */}
        <div className="flex gap-1 bg-[var(--bg-card)] rounded-xl p-1 overflow-x-auto">
          {[
            { id: 'payment', label: isSpanish ? 'Crear Pago' : 'Create Payment', icon: Send },
            { id: 'history', label: isSpanish ? 'Historial' : 'History', icon: History },
            { id: 'reports', label: isSpanish ? 'Reportes' : 'Reports', icon: BarChart3 },
            { id: 'settings', label: isSpanish ? 'Configuración' : 'Settings', icon: Settings }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg font-semibold transition-all whitespace-nowrap ${
                activeTab === tab.id
                  ? 'text-white'
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
              }`}
              style={activeTab === tab.id ? { backgroundColor: SBERBANK_GREEN } : {}}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Payment Tab */}
        {activeTab === 'payment' && (
          <div className="space-y-6">
            {/* Custody Account Selector */}
            <BankingCard className="p-card">
              <div className="flex items-center gap-4 mb-4">
                <CreditCard className="w-5 h-5" style={{ color: SBERBANK_GREEN }} />
                <h3 className="text-[var(--text-primary)] font-semibold">
                  {isSpanish ? 'Cuenta de Origen' : 'Source Account'}
                </h3>
              </div>
              
              <div className="flex gap-4 mb-4">
                <button
                  onClick={() => { setBalanceSource('custody'); setSelectedCustodyAccountId(''); }}
                  className={`flex-1 p-3 rounded-lg border transition-all ${
                    balanceSource === 'custody'
                      ? 'border-emerald-500 bg-emerald-500/10'
                      : 'border-[var(--border-subtle)] hover:border-[var(--border-subtle)]/50'
                  }`}
                >
                  <span className={balanceSource === 'custody' ? 'text-emerald-400' : 'text-[var(--text-secondary)]'}>
                    Custody Accounts
                  </span>
                </button>
                <button
                  onClick={() => { setBalanceSource('ledger'); setSelectedCustodyAccountId(''); }}
                  className={`flex-1 p-3 rounded-lg border transition-all ${
                    balanceSource === 'ledger'
                      ? 'border-emerald-500 bg-emerald-500/10'
                      : 'border-[var(--border-subtle)] hover:border-[var(--border-subtle)]/50'
                  }`}
                >
                  <span className={balanceSource === 'ledger' ? 'text-emerald-400' : 'text-[var(--text-secondary)]'}>
                    Account Ledger
                  </span>
                </button>
              </div>

              <select
                value={selectedCustodyAccountId}
                onChange={(e) => setSelectedCustodyAccountId(e.target.value)}
                className="w-full px-4 py-3 bg-[var(--bg-elevated)] border border-[var(--border-subtle)] rounded-lg text-[var(--text-primary)]"
                title={isSpanish ? "Seleccionar cuenta" : "Select account"}
              >
                <option value="">{isSpanish ? '-- Seleccionar cuenta RUB para debitar --' : '-- Select RUB account to debit --'}</option>
                {balanceSource === 'custody' 
                  ? custodyAccounts
                      .filter(acc => acc.currency === 'RUB' || acc.currency === 'RUR')
                      .map(account => (
                        <option key={account.id} value={account.id}>
                          {account.accountName} | {account.accountNumber || 'N/A'} | ₽{account.availableBalance.toLocaleString()}
                        </option>
                      ))
                  : accountLedgerBalances
                      .filter(b => b.currency === 'RUB' || b.currency === 'RUR')
                      .map(balance => (
                        <option key={balance.currency} value={balance.currency}>
                          {balance.accountName} | ₽{balance.totalAmount.toLocaleString()}
                        </option>
                      ))
                }
              </select>

              {/* Selected Account Info */}
              {selectedCustodyAccountId && (
                <div className="mt-4 p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-lg">
                  <div className="flex items-center justify-between">
                    <span className="text-[var(--text-secondary)]">{isSpanish ? 'Balance Disponible:' : 'Available Balance:'}</span>
                    <span className="text-emerald-400 font-bold text-xl">
                      ₽{getSelectedAccountBalance()?.balance.toLocaleString() || '0'}
                    </span>
                  </div>
                </div>
              )}
            </BankingCard>

            {/* Document Info */}
            <BankingSection title={isSpanish ? "Documento" : "Document"} icon={FileText} color="emerald">
              <BankingCard className="p-card space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-card">
                  <BankingInput
                    label={isSpanish ? "Número" : "Number"}
                    value={paymentForm.number || ''}
                    onChange={(v) => setPaymentForm({ ...paymentForm, number: v.slice(0, 8) })}
                    placeholder="1-8 chars"
                  />
                  <BankingInput
                    label={isSpanish ? "Fecha" : "Date"}
                    value={paymentForm.date}
                    onChange={(v) => setPaymentForm({ ...paymentForm, date: v })}
                    type="date"
                  />
                  <div>
                    <label className="block text-[var(--text-secondary)] text-sm mb-2">External ID</label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={paymentForm.externalId}
                        readOnly
                        className="flex-1 px-3 py-2 bg-[var(--bg-elevated)] border border-[var(--border-subtle)] rounded-lg text-[var(--text-primary)] text-sm"
                      />
                      <button onClick={handleGenerateExternalId} className="p-2 bg-[var(--bg-elevated)] border border-[var(--border-subtle)] rounded-lg hover:bg-[var(--bg-card)]" title="Generate">
                        <RefreshCw className="w-4 h-4 text-[var(--text-secondary)]" />
                      </button>
                      <button onClick={() => handleCopy(paymentForm.externalId)} className="p-2 bg-[var(--bg-elevated)] border border-[var(--border-subtle)] rounded-lg hover:bg-[var(--bg-card)]" title="Copy">
                        <Copy className="w-4 h-4 text-[var(--text-secondary)]" />
                      </button>
                    </div>
                  </div>
                </div>
              </BankingCard>
            </BankingSection>

            {/* Payment Details */}
            <BankingSection title={isSpanish ? "Detalles del Pago" : "Payment Details"} icon={CreditCard} color="emerald">
              <BankingCard className="p-card space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-card">
                  <BankingInput
                    label={isSpanish ? "Monto (₽)" : "Amount (₽)"}
                    value={paymentForm.amount.toString()}
                    onChange={(v) => setPaymentForm({ ...paymentForm, amount: parseFloat(v) || 0 })}
                    type="number"
                  />
                  <div>
                    <label className="block text-[var(--text-secondary)] text-sm mb-2">{isSpanish ? "Prioridad" : "Priority"}</label>
                    <select value={paymentForm.priority} onChange={(e) => setPaymentForm({ ...paymentForm, priority: e.target.value as any })} className="w-full px-3 py-2 bg-[var(--bg-elevated)] border border-[var(--border-subtle)] rounded-lg text-[var(--text-primary)]">
                      <option value="1">1 - {isSpanish ? 'Máxima' : 'Highest'}</option>
                      <option value="2">2 - {isSpanish ? 'Alta' : 'High'}</option>
                      <option value="3">3 - {isSpanish ? 'Media' : 'Medium'}</option>
                      <option value="4">4 - {isSpanish ? 'Baja' : 'Low'}</option>
                      <option value="5">5 - Normal</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[var(--text-secondary)] text-sm mb-2">{isSpanish ? "Urgencia" : "Urgency"}</label>
                    <select value={paymentForm.urgencyCode || 'NORMAL'} onChange={(e) => setPaymentForm({ ...paymentForm, urgencyCode: e.target.value as any })} className="w-full px-3 py-2 bg-[var(--bg-elevated)] border border-[var(--border-subtle)] rounded-lg text-[var(--text-primary)]">
                      <option value="NORMAL">NORMAL</option>
                      <option value="INTERNAL">INTERNAL</option>
                      <option value="BESP">BESP</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-[var(--text-secondary)] text-sm mb-2">{isSpanish ? "Propósito *" : "Purpose *"}</label>
                  <textarea value={paymentForm.purpose} onChange={(e) => setPaymentForm({ ...paymentForm, purpose: e.target.value.slice(0, 210) })} className="w-full px-3 py-2 bg-[var(--bg-elevated)] border border-[var(--border-subtle)] rounded-lg text-[var(--text-primary)] min-h-[80px]" />
                  <span className="text-xs text-[var(--text-secondary)]">{paymentForm.purpose.length}/210</span>
                </div>
              </BankingCard>
            </BankingSection>

            {/* Payer Info */}
            <BankingSection title={isSpanish ? "Pagador" : "Payer"} icon={Building2} color="purple">
              <BankingCard className="p-card">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-card">
                  <BankingInput label={isSpanish ? "Nombre *" : "Name *"} value={paymentForm.payerName} onChange={(v) => setPaymentForm({ ...paymentForm, payerName: v.slice(0, 160) })} />
                  <BankingInput label="INN *" value={paymentForm.payerInn} onChange={(v) => setPaymentForm({ ...paymentForm, payerInn: v.replace(/\D/g, '').slice(0, 12) })} />
                  <BankingInput label="KPP" value={paymentForm.payerKpp || ''} onChange={(v) => setPaymentForm({ ...paymentForm, payerKpp: v.replace(/\D/g, '').slice(0, 9) })} />
                  <BankingInput label={isSpanish ? "Cuenta *" : "Account *"} value={paymentForm.payerAccount} onChange={(v) => setPaymentForm({ ...paymentForm, payerAccount: v.replace(/\D/g, '').slice(0, 20) })} />
                  <BankingInput label="BIC *" value={paymentForm.payerBankBic} onChange={(v) => setPaymentForm({ ...paymentForm, payerBankBic: v.replace(/\D/g, '').slice(0, 9) })} />
                  <BankingInput label={isSpanish ? "Cuenta Corresp. *" : "Corr. Account *"} value={paymentForm.payerBankCorrAccount} onChange={(v) => setPaymentForm({ ...paymentForm, payerBankCorrAccount: v.replace(/\D/g, '').slice(0, 20) })} />
                </div>
              </BankingCard>
            </BankingSection>

            {/* Payee Info */}
            <BankingSection title={isSpanish ? "Beneficiario" : "Payee"} icon={Send} color="white">
              <BankingCard className="p-card">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-card">
                  <BankingInput label={isSpanish ? "Nombre *" : "Name *"} value={paymentForm.payeeName} onChange={(v) => setPaymentForm({ ...paymentForm, payeeName: v.slice(0, 160) })} />
                  <BankingInput label="INN" value={paymentForm.payeeInn || ''} onChange={(v) => setPaymentForm({ ...paymentForm, payeeInn: v.replace(/\D/g, '').slice(0, 12) })} />
                  <BankingInput label="KPP" value={paymentForm.payeeKpp || ''} onChange={(v) => setPaymentForm({ ...paymentForm, payeeKpp: v.replace(/\D/g, '').slice(0, 9) })} />
                  <BankingInput label={isSpanish ? "Cuenta" : "Account"} value={paymentForm.payeeAccount || ''} onChange={(v) => setPaymentForm({ ...paymentForm, payeeAccount: v.replace(/\D/g, '').slice(0, 20) })} />
                  <BankingInput label="BIC *" value={paymentForm.payeeBankBic} onChange={(v) => setPaymentForm({ ...paymentForm, payeeBankBic: v.replace(/\D/g, '').slice(0, 9) })} />
                  <BankingInput label={isSpanish ? "Cuenta Corresp." : "Corr. Account"} value={paymentForm.payeeBankCorrAccount || ''} onChange={(v) => setPaymentForm({ ...paymentForm, payeeBankCorrAccount: v.replace(/\D/g, '').slice(0, 20) })} />
                </div>
              </BankingCard>
            </BankingSection>

            {/* Processing Mode */}
            <BankingCard className="p-card">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${immediateProcessing ? 'bg-emerald-500/20' : 'bg-amber-500/20'}`}>
                    {immediateProcessing ? <Send className="w-5 h-5 text-emerald-400" /> : <Clock className="w-5 h-5 text-amber-400" />}
                  </div>
                  <div>
                    <p className="text-[var(--text-primary)] font-semibold">
                      {immediateProcessing 
                        ? (isSpanish ? 'Procesamiento Inmediato' : 'Immediate Processing')
                        : (isSpanish ? 'Guardar como Borrador' : 'Save as Draft')
                      }
                    </p>
                    <p className="text-[var(--text-secondary)] text-sm">
                      {immediateProcessing 
                        ? (isSpanish ? 'digestSignatures incluido → Banco procesa inmediatamente' : 'digestSignatures included → Bank processes immediately')
                        : (isSpanish ? 'Sin firma → Debe firmarse en SberBusiness UI' : 'No signature → Must be signed in SberBusiness UI')
                      }
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setImmediateProcessing(!immediateProcessing)}
                  className={`relative w-14 h-7 rounded-full transition-all ${immediateProcessing ? 'bg-emerald-500' : 'bg-[var(--border-subtle)]'}`}
                >
                  <div className={`absolute top-1 w-5 h-5 rounded-full bg-white transition-all ${immediateProcessing ? 'left-8' : 'left-1'}`} />
                </button>
              </div>
            </BankingCard>

            {/* Submit */}
            <div className="flex justify-end gap-4">
              <BankingButton variant="primary" icon={Send} onClick={handleCreatePayment} disabled={loading} className="px-8" style={{ backgroundColor: SBERBANK_GREEN }}>
                {loading 
                  ? (isSpanish ? 'Procesando...' : 'Processing...') 
                  : immediateProcessing
                    ? (isSpanish ? 'Crear y Procesar' : 'Create & Process')
                    : (isSpanish ? 'Guardar Borrador' : 'Save Draft')
                }
              </BankingButton>
            </div>

            {/* Workflow Info */}
            <BankingCard className="p-card bg-blue-500/10 border-blue-500/30">
              <div className="flex items-start gap-3">
                <Info className="w-5 h-5 text-blue-400 mt-0.5 flex-shrink-0" />
                <div className="text-sm">
                  <p className="font-semibold text-blue-400 mb-2">{isSpanish ? 'Flujo de Trabajo' : 'Workflow'}</p>
                  <div className="text-blue-300/80 space-y-1">
                    <p>1. Ledger Debit (RUB) → Reservar fondos</p>
                    <p>2. POST /fintech/api/v1/payments → Crear orden</p>
                    <p>3. {immediateProcessing ? 'digestSignatures → Processing' : 'Sin firma → DRAFT'}</p>
                    <p>4. Poll GET /payments/{'{externalId}'} → bankStatus</p>
                    <p>5. IMPLEMENTED → Settlement final</p>
                  </div>
                </div>
              </div>
            </BankingCard>
          </div>
        )}

        {/* History Tab */}
        {activeTab === 'history' && (
          <div className="space-y-6">
            {/* Statistics */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <BankingCard className="p-4 text-center">
                <p className="text-2xl font-bold text-[var(--text-primary)]">{stats.total}</p>
                <p className="text-sm text-[var(--text-secondary)]">{isSpanish ? 'Total Pagos' : 'Total Payments'}</p>
              </BankingCard>
              <BankingCard className="p-4 text-center">
                <p className="text-2xl font-bold text-emerald-400">₽{(stats.totalAmount / 1000000).toFixed(2)}M</p>
                <p className="text-sm text-[var(--text-secondary)]">{isSpanish ? 'Monto Total' : 'Total Amount'}</p>
              </BankingCard>
              <BankingCard className="p-4 text-center">
                <p className="text-2xl font-bold text-blue-400">{stats.pending}</p>
                <p className="text-sm text-[var(--text-secondary)]">{isSpanish ? 'Pendientes' : 'Pending'}</p>
              </BankingCard>
              <BankingCard className="p-4 text-center">
                <p className="text-2xl font-bold text-green-400">{stats.completed}</p>
                <p className="text-sm text-[var(--text-secondary)]">{isSpanish ? 'Completados' : 'Completed'}</p>
              </BankingCard>
            </div>

            {/* Filters */}
            <BankingCard className="p-4">
              <div className="flex flex-wrap items-center gap-4">
                <div className="flex items-center gap-2">
                  <Filter className="w-4 h-4 text-[var(--text-secondary)]" />
                  <select value={historyFilter} onChange={(e) => setHistoryFilter(e.target.value as any)} className="px-3 py-2 bg-[var(--bg-elevated)] border border-[var(--border-subtle)] rounded-lg text-[var(--text-primary)] text-sm">
                    <option value="all">{isSpanish ? 'Todos' : 'All'}</option>
                    <option value="COMPLETED">{isSpanish ? 'Completados' : 'Completed'}</option>
                    <option value="PENDING">Pending</option>
                    <option value="DRAFT">Draft</option>
                    <option value="FAILED">Failed</option>
                  </select>
                </div>
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-[var(--text-secondary)]" />
                  <input type="date" value={dateFilter.from} onChange={(e) => setDateFilter({ ...dateFilter, from: e.target.value })} className="px-3 py-2 bg-[var(--bg-elevated)] border border-[var(--border-subtle)] rounded-lg text-[var(--text-primary)] text-sm" />
                  <span className="text-[var(--text-secondary)]">-</span>
                  <input type="date" value={dateFilter.to} onChange={(e) => setDateFilter({ ...dateFilter, to: e.target.value })} className="px-3 py-2 bg-[var(--bg-elevated)] border border-[var(--border-subtle)] rounded-lg text-[var(--text-primary)] text-sm" />
                </div>
              </div>
            </BankingCard>

            {/* Payment List */}
            <div className="space-y-4">
              {getFilteredPayments().length > 0 ? (
                getFilteredPayments().map((payment) => (
                  <BankingCard key={payment.id} className="p-card hover:border-emerald-500/30 transition-all">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-3 mb-2 flex-wrap">
                          <span className="text-xl font-bold" style={{ color: SBERBANK_GREEN }}>
                            ₽{payment.amount.toLocaleString()}
                          </span>
                          <span className={`px-2 py-0.5 rounded text-xs font-semibold ${
                            payment.status === 'COMPLETED' ? 'bg-emerald-500/20 text-emerald-400' :
                            payment.status === 'PENDING' ? 'bg-amber-500/20 text-amber-400' :
                            payment.status === 'DRAFT' ? 'bg-blue-500/20 text-blue-400' :
                            'bg-red-500/20 text-red-400'
                          }`}>
                            {payment.status}
                          </span>
                          <span className="text-xs text-[var(--text-secondary)]">{payment.date}</span>
                        </div>
                        <p className="text-[var(--text-primary)] font-medium truncate">{payment.payeeName}</p>
                        <p className="text-[var(--text-secondary)] text-sm mt-1 line-clamp-2">{payment.purpose}</p>
                        <p className="text-[var(--text-secondary)] text-xs mt-2">ID: {payment.externalId.slice(0, 18)}...</p>
                      </div>
                      <div className="flex flex-col gap-2">
                        <button onClick={() => setSelectedPayment(payment)} className="p-2 bg-[var(--bg-elevated)] rounded-lg hover:bg-[var(--bg-card)] transition-all" title={isSpanish ? "Ver detalles" : "View details"}>
                          <Eye className="w-4 h-4 text-[var(--text-secondary)]" />
                        </button>
                        <button onClick={() => handleDownloadReceiptTXT(payment)} className="p-2 bg-[var(--bg-elevated)] rounded-lg hover:bg-[var(--bg-card)] transition-all" title="Download TXT">
                          <FileText className="w-4 h-4 text-[var(--text-secondary)]" />
                        </button>
                        <button onClick={() => handleDownloadReceiptPDF(payment)} className="p-2 bg-[var(--bg-elevated)] rounded-lg hover:bg-[var(--bg-card)] transition-all" title="Download PDF">
                          <FileDown className="w-4 h-4 text-[var(--text-secondary)]" />
                        </button>
                        <button onClick={() => handleDeletePayment(payment.id)} className="p-2 bg-red-500/10 rounded-lg hover:bg-red-500/20 transition-all" title={isSpanish ? "Eliminar" : "Delete"}>
                          <Trash2 className="w-4 h-4 text-red-400" />
                        </button>
                      </div>
                    </div>
                  </BankingCard>
                ))
              ) : (
                <BankingCard className="p-12 text-center">
                  <History className="w-16 h-16 text-slate-700 mx-auto mb-4" />
                  <p className="text-[var(--text-secondary)]">{isSpanish ? 'No hay pagos en el historial' : 'No payments in history'}</p>
                </BankingCard>
              )}
            </div>

            {/* Payment Detail Modal */}
            {selectedPayment && (
              <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setSelectedPayment(null)}>
                <div className="bg-[var(--bg-card)] rounded-2xl p-6 max-w-2xl w-full max-h-[90vh] overflow-auto" onClick={e => e.stopPropagation()}>
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="text-xl font-bold text-[var(--text-primary)]">{isSpanish ? 'Detalle del Pago' : 'Payment Details'}</h3>
                    <button onClick={() => setSelectedPayment(null)} className="text-[var(--text-secondary)] hover:text-[var(--text-primary)]">×</button>
                  </div>
                  
                  <div className="space-y-4">
                    <div className="flex justify-between items-center p-4 rounded-lg" style={{ backgroundColor: `${SBERBANK_GREEN}20` }}>
                      <span className="text-[var(--text-secondary)]">{isSpanish ? 'Monto' : 'Amount'}</span>
                      <span className="text-2xl font-bold" style={{ color: SBERBANK_GREEN }}>₽{selectedPayment.amount.toLocaleString()}</span>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div><span className="text-[var(--text-secondary)] text-sm">External ID</span><p className="text-[var(--text-primary)] font-mono text-sm break-all">{selectedPayment.externalId}</p></div>
                      <div><span className="text-[var(--text-secondary)] text-sm">Status</span><p className="text-[var(--text-primary)]">{selectedPayment.status}</p></div>
                      <div><span className="text-[var(--text-secondary)] text-sm">{isSpanish ? 'Fecha' : 'Date'}</span><p className="text-[var(--text-primary)]">{selectedPayment.date}</p></div>
                      <div><span className="text-[var(--text-secondary)] text-sm">{isSpanish ? 'Prioridad' : 'Priority'}</span><p className="text-[var(--text-primary)]">{selectedPayment.priority}</p></div>
                    </div>
                    
                    <hr className="border-[var(--border-subtle)]" />
                    
                    <div>
                      <h4 className="font-semibold text-[var(--text-primary)] mb-2">{isSpanish ? 'Pagador' : 'Payer'}</h4>
                      <p className="text-[var(--text-primary)]">{selectedPayment.payerName}</p>
                      <p className="text-[var(--text-secondary)] text-sm">INN: {selectedPayment.payerInn} | {isSpanish ? 'Cuenta' : 'Account'}: {selectedPayment.payerAccount}</p>
                    </div>
                    
                    <div>
                      <h4 className="font-semibold text-[var(--text-primary)] mb-2">{isSpanish ? 'Beneficiario' : 'Payee'}</h4>
                      <p className="text-[var(--text-primary)]">{selectedPayment.payeeName}</p>
                      <p className="text-[var(--text-secondary)] text-sm">INN: {selectedPayment.payeeInn || 'N/A'} | BIC: {selectedPayment.payeeBankBic}</p>
                    </div>
                    
                    <div>
                      <h4 className="font-semibold text-[var(--text-primary)] mb-2">{isSpanish ? 'Propósito' : 'Purpose'}</h4>
                      <p className="text-[var(--text-secondary)]">{selectedPayment.purpose}</p>
                    </div>
                    
                    <div className="flex gap-3 pt-4">
                      <BankingButton variant="secondary" icon={FileText} onClick={() => handleDownloadReceiptTXT(selectedPayment)}>TXT</BankingButton>
                      <BankingButton variant="secondary" icon={FileDown} onClick={() => handleDownloadReceiptPDF(selectedPayment)}>PDF</BankingButton>
                      <BankingButton variant="secondary" icon={Copy} onClick={() => handleCopy(selectedPayment.externalId)}>{isSpanish ? 'Copiar ID' : 'Copy ID'}</BankingButton>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Reports Tab */}
        {activeTab === 'reports' && (
          <div className="space-y-6">
            <BankingSection title={isSpanish ? "Generar Reportes" : "Generate Reports"} icon={BarChart3} color="emerald">
              <BankingCard className="p-card">
                <div className="flex flex-wrap items-end gap-4 mb-6">
                  <div>
                    <label className="block text-[var(--text-secondary)] text-sm mb-2">{isSpanish ? 'Desde' : 'From'}</label>
                    <input type="date" value={reportDateRange.from} onChange={(e) => setReportDateRange({ ...reportDateRange, from: e.target.value })} className="px-4 py-2 bg-[var(--bg-elevated)] border border-[var(--border-subtle)] rounded-lg text-[var(--text-primary)]" />
                  </div>
                  <div>
                    <label className="block text-[var(--text-secondary)] text-sm mb-2">{isSpanish ? 'Hasta' : 'To'}</label>
                    <input type="date" value={reportDateRange.to} onChange={(e) => setReportDateRange({ ...reportDateRange, to: e.target.value })} className="px-4 py-2 bg-[var(--bg-elevated)] border border-[var(--border-subtle)] rounded-lg text-[var(--text-primary)]" />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <button onClick={handleDownloadReportTXT} className="flex items-center justify-center gap-3 p-6 bg-[var(--bg-elevated)] border border-[var(--border-subtle)] rounded-xl hover:border-emerald-500/50 transition-all">
                    <FileText className="w-8 h-8" style={{ color: SBERBANK_GREEN }} />
                    <div className="text-left">
                      <p className="text-[var(--text-primary)] font-semibold">{isSpanish ? 'Reporte TXT' : 'TXT Report'}</p>
                      <p className="text-[var(--text-secondary)] text-sm">{isSpanish ? 'Texto plano detallado' : 'Detailed plain text'}</p>
                    </div>
                  </button>
                  <button onClick={handleDownloadReportPDF} className="flex items-center justify-center gap-3 p-6 bg-[var(--bg-elevated)] border border-[var(--border-subtle)] rounded-xl hover:border-emerald-500/50 transition-all">
                    <FileDown className="w-8 h-8" style={{ color: SBERBANK_GREEN }} />
                    <div className="text-left">
                      <p className="text-[var(--text-primary)] font-semibold">{isSpanish ? 'Reporte PDF' : 'PDF Report'}</p>
                      <p className="text-[var(--text-secondary)] text-sm">{isSpanish ? 'Formato profesional' : 'Professional format'}</p>
                    </div>
                  </button>
                </div>

                {/* Report Preview Stats */}
                <div className="mt-6 p-4 bg-[var(--bg-elevated)] rounded-lg">
                  <h4 className="text-[var(--text-primary)] font-semibold mb-3">{isSpanish ? 'Vista Previa del Reporte' : 'Report Preview'}</h4>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                    <div>
                      <p className="text-2xl font-bold" style={{ color: SBERBANK_GREEN }}>{stats.total}</p>
                      <p className="text-xs text-[var(--text-secondary)]">{isSpanish ? 'Transacciones' : 'Transactions'}</p>
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-[var(--text-primary)]">₽{(stats.totalAmount / 1000000).toFixed(2)}M</p>
                      <p className="text-xs text-[var(--text-secondary)]">{isSpanish ? 'Volumen Total' : 'Total Volume'}</p>
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-emerald-400">{stats.completed}</p>
                      <p className="text-xs text-[var(--text-secondary)]">{isSpanish ? 'Completados' : 'Completed'}</p>
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-amber-400">{stats.pending}</p>
                      <p className="text-xs text-[var(--text-secondary)]">{isSpanish ? 'Pendientes' : 'Pending'}</p>
                    </div>
                  </div>
                </div>
              </BankingCard>
            </BankingSection>
          </div>
        )}

        {/* Settings Tab */}
        {activeTab === 'settings' && (
          <BankingSection title={isSpanish ? "Configuración API" : "API Configuration"} icon={Settings} color="purple">
            <BankingCard className="p-card space-y-6">
              {/* Connection Test */}
              <div className="p-4 rounded-lg" style={{ backgroundColor: connectionStatus === 'connected' ? `${SBERBANK_GREEN}20` : connectionStatus === 'checking' ? 'rgba(245, 158, 11, 0.1)' : 'rgba(239, 68, 68, 0.1)' }}>
                <div className="flex items-center justify-between flex-wrap gap-4">
                  <div className="flex items-center gap-3">
                    {connectionStatus === 'connected' ? <Wifi className="w-5 h-5" style={{ color: SBERBANK_GREEN }} /> : connectionStatus === 'checking' ? <RefreshCw className="w-5 h-5 text-amber-400 animate-spin" /> : <WifiOff className="w-5 h-5 text-red-400" />}
                    <div>
                      <p className="font-semibold" style={{ color: connectionStatus === 'connected' ? SBERBANK_GREEN : connectionStatus === 'checking' ? '#f59e0b' : '#ef4444' }}>
                        {connectionStatus === 'connected' ? (isSpanish ? 'API Conectada' : 'API Connected') : connectionStatus === 'checking' ? (isSpanish ? 'Verificando...' : 'Checking...') : (isSpanish ? 'API Desconectada' : 'API Disconnected')}
                      </p>
                      {lastConnectionCheck && <p className="text-xs text-[var(--text-secondary)]">{isSpanish ? 'Última verificación:' : 'Last check:'} {lastConnectionCheck}</p>}
                    </div>
                  </div>
                  <BankingButton variant="secondary" icon={RefreshCw} onClick={handleCheckConnection} disabled={connectionStatus === 'checking'}>
                    {isSpanish ? 'Verificar Conexión' : 'Test Connection'}
                  </BankingButton>
                </div>
              </div>

              {/* Environment Selector */}
              <div>
                <label className="block text-[var(--text-primary)] font-semibold mb-3">{isSpanish ? 'Ambiente' : 'Environment'}</label>
                <div className="grid grid-cols-2 gap-4">
                  <button
                    onClick={() => setConfig({ ...config, environment: 'TEST', baseUrl: SBERBANK_API_CONFIG.ENVIRONMENTS.TEST })}
                    className={`p-4 rounded-lg border-2 transition-all text-left ${config.environment === 'TEST' ? 'border-amber-500 bg-amber-500/10' : 'border-[var(--border-subtle)] hover:border-amber-500/50'}`}
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <div className={`w-3 h-3 rounded-full ${config.environment === 'TEST' ? 'bg-amber-500' : 'bg-[var(--border-subtle)]'}`} />
                      <span className={`font-semibold ${config.environment === 'TEST' ? 'text-amber-400' : 'text-[var(--text-secondary)]'}`}>TEST</span>
                    </div>
                    <p className="text-xs text-[var(--text-secondary)]">iftfintech.testsbi.sberbank.ru</p>
                    <p className="text-xs text-amber-400 mt-1">⚠️ IMPLEMENTED no retornado</p>
                  </button>
                  <button
                    onClick={() => setConfig({ ...config, environment: 'PRODUCTION', baseUrl: SBERBANK_API_CONFIG.ENVIRONMENTS.PRODUCTION })}
                    className={`p-4 rounded-lg border-2 transition-all text-left ${config.environment === 'PRODUCTION' ? 'border-emerald-500 bg-emerald-500/10' : 'border-[var(--border-subtle)] hover:border-emerald-500/50'}`}
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <div className={`w-3 h-3 rounded-full ${config.environment === 'PRODUCTION' ? 'bg-emerald-500' : 'bg-[var(--border-subtle)]'}`} />
                      <span className={`font-semibold ${config.environment === 'PRODUCTION' ? 'text-emerald-400' : 'text-[var(--text-secondary)]'}`}>PRODUCTION</span>
                    </div>
                    <p className="text-xs text-[var(--text-secondary)]">fintech.sberbank.ru</p>
                    <p className="text-xs text-emerald-400 mt-1">✓ Ambiente real</p>
                  </button>
                </div>
              </div>

              {/* Base URL */}
              <div>
                <label className="block text-[var(--text-secondary)] text-sm mb-2">Base URL</label>
                <input type="text" value={config.baseUrl} readOnly className="w-full px-4 py-3 bg-[var(--bg-elevated)] border border-[var(--border-subtle)] rounded-lg text-[var(--text-primary)] opacity-70" />
              </div>
              
              {/* Access Token */}
              <div>
                <label className="block text-[var(--text-secondary)] text-sm mb-2">Access Token (SSO) *</label>
                <input type="password" value={config.accessToken} onChange={(e) => setConfig({ ...config, accessToken: e.target.value })} className="w-full px-4 py-3 bg-[var(--bg-elevated)] border border-[var(--border-subtle)] rounded-lg text-[var(--text-primary)]" placeholder="f8ad3141-b7e8-4924-92de-3de4fd0a464e-1" />
                <p className="text-xs text-[var(--text-secondary)] mt-1">{isSpanish ? 'Token SSO con scope: PAY_DOC_RU' : 'SSO token with scope: PAY_DOC_RU'}</p>
              </div>

              {/* API Configuration */}
              <div className="pt-4 border-t border-[var(--border-subtle)]">
                <h4 className="text-[var(--text-primary)] font-semibold mb-3">{isSpanish ? 'Configuración de API' : 'API Configuration'}</h4>
                <div className="p-4 bg-[var(--bg-elevated)] rounded-lg space-y-3 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-[var(--text-secondary)]">Auth:</span>
                    <code style={{ color: SBERBANK_GREEN }}>Authorization: Bearer {'{'} token {'}'}</code>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[var(--text-secondary)]">Content-Type:</span>
                    <code style={{ color: SBERBANK_GREEN }}>application/json</code>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[var(--text-secondary)]">Scope:</span>
                    <code className="px-2 py-1 rounded" style={{ backgroundColor: `${SBERBANK_GREEN}20`, color: SBERBANK_GREEN }}>PAY_DOC_RU</code>
                  </div>
                </div>
              </div>

              {/* API Endpoints */}
              <div className="pt-4 border-t border-[var(--border-subtle)]">
                <h4 className="text-[var(--text-primary)] font-semibold mb-3">API Endpoints</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex items-center justify-between p-3 bg-[var(--bg-elevated)] rounded-lg">
                    <span className="text-[var(--text-secondary)]">{isSpanish ? 'Crear Pago' : 'Create Payment'}</span>
                    <code style={{ color: SBERBANK_GREEN }}>POST /fintech/api/v1/payments</code>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-[var(--bg-elevated)] rounded-lg">
                    <span className="text-[var(--text-secondary)]">{isSpanish ? 'Obtener Estado' : 'Get Status'}</span>
                    <code style={{ color: SBERBANK_GREEN }}>GET /fintech/api/v1/payments/{'{id}'}/state</code>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-[var(--bg-elevated)] rounded-lg">
                    <span className="text-[var(--text-secondary)]">{isSpanish ? 'Obtener Documento' : 'Get Document'}</span>
                    <code style={{ color: SBERBANK_GREEN }}>GET /fintech/api/v1/payments/{'{id}'}</code>
                  </div>
                </div>
              </div>

              {/* Bank Status Reference */}
              <div className="pt-4 border-t border-[var(--border-subtle)]">
                <h4 className="text-[var(--text-primary)] font-semibold mb-3">{isSpanish ? 'Estados del Banco (bankStatus)' : 'Bank Status Reference'}</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                  <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-lg">
                    <p className="font-semibold text-amber-400 mb-2">{isSpanish ? 'Intermedios' : 'Intermediate'}</p>
                    <p className="text-amber-300/80">CREATED, SIGNED, ACCEPTED, PROCESSING_RZK, DELIVERED...</p>
                    <p className="text-amber-400 mt-1">→ {isSpanish ? 'Continuar polling' : 'Keep polling'}</p>
                  </div>
                  <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
                    <p className="font-semibold text-red-400 mb-2">{isSpanish ? 'Fallidos' : 'Failed'}</p>
                    <p className="text-red-300/80">DELETED, REFUSEDBYBANK, FRAUDDENY, REQUISITEERROR...</p>
                    <p className="text-red-400 mt-1">→ {isSpanish ? 'Parar polling' : 'Stop polling'}</p>
                  </div>
                  <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-lg">
                    <p className="font-semibold text-emerald-400 mb-2">{isSpanish ? 'Exitoso' : 'Success'}</p>
                    <p className="text-emerald-300/80">IMPLEMENTED</p>
                    <p className="text-amber-400 mt-1">⚠️ {isSpanish ? 'No en TEST' : 'Not in TEST'}</p>
                  </div>
                </div>
              </div>

              {/* Response Codes */}
              <div className="pt-4 border-t border-[var(--border-subtle)]">
                <h4 className="text-[var(--text-primary)] font-semibold mb-3">{isSpanish ? 'Códigos HTTP' : 'HTTP Codes'}</h4>
                <div className="flex flex-wrap gap-2 text-xs">
                  <span className="px-2 py-1 bg-emerald-500/20 text-emerald-400 rounded">201 Created</span>
                  <span className="px-2 py-1 bg-red-500/20 text-red-400 rounded">400 Bad Request</span>
                  <span className="px-2 py-1 bg-red-500/20 text-red-400 rounded">401 Unauthorized</span>
                  <span className="px-2 py-1 bg-red-500/20 text-red-400 rounded">403 Forbidden</span>
                  <span className="px-2 py-1 bg-amber-500/20 text-amber-400 rounded">429 Rate Limit</span>
                  <span className="px-2 py-1 bg-red-500/20 text-red-400 rounded">500 Server Error</span>
                  <span className="px-2 py-1 bg-amber-500/20 text-amber-400 rounded">503 Unavailable</span>
                </div>
              </div>

              {/* Documentation */}
              <div className="pt-4 border-t border-[var(--border-subtle)]">
                <a href="https://developers.sber.ru/docs/ru/sber-api/specifications/payments/create-payment" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 hover:opacity-80" style={{ color: SBERBANK_GREEN }}>
                  <span>Sberbank API Documentation</span>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
                </a>
              </div>
            </BankingCard>
          </BankingSection>
        )}
      </div>
    </div>
  );
}
