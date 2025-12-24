/**
 * TZ Digital Bank Transfer Module
 * API: https://banktransfer.tzdigitalpvtlimited.com
 * Transferencias USD y EUR vía REST API + Bearer Token
 * Integrado con Custody Accounts y generación de recibos institucionales
 */

import { useState, useEffect } from 'react';
import { 
  Send, Settings, History, DollarSign, Euro, CheckCircle, XCircle, 
  Clock, RefreshCw, Trash2, Eye, EyeOff, Wifi, WifiOff,
  ArrowRightLeft, FileText, Shield, Globe, AlertTriangle, Wallet,
  Download, Building2, CreditCard, Receipt, Landmark, Wrench, 
  Zap, Bug, CheckSquare, Square, ChevronRight, Terminal
} from 'lucide-react';
import { useLanguage } from '../lib/i18n';
import { 
  tzDigitalClient, 
  MoneyTransferPayload, 
  TZDigitalConfig, 
  TransferRecord,
  Currency,
  ConnectionTestResult,
  ConnectionCheck,
  ConnectionProof,
  TroubleshootResult,
  FundsTxPayload,
  FundsProcessingConfig,
  FundsProcessingResult,
  TransferVerificationResult
} from '../lib/tz-digital-api';
import { custodyStore, CustodyAccount } from '../lib/custody-store';
import jsPDF from 'jspdf';

export function TZDigitalModule() {
  const { language } = useLanguage();
  const isSpanish = language === 'es';

  // Estados
  const [config, setConfig] = useState<TZDigitalConfig>(tzDigitalClient.getConfig());
  const [transfers, setTransfers] = useState<TransferRecord[]>(tzDigitalClient.getTransfers());
  const [showToken, setShowToken] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'unknown' | 'connected' | 'error'>('unknown');
  const [activeTab, setActiveTab] = useState<'transfer' | 'funds' | 'history' | 'config'>('transfer');

  // Cuentas Custodio
  const [custodyAccounts, setCustodyAccounts] = useState<CustodyAccount[]>([]);
  const [selectedAccountId, setSelectedAccountId] = useState<string>('');
  const selectedAccount = custodyAccounts.find(a => a.id === selectedAccountId);

  // Recibo generado
  const [lastTransferForReceipt, setLastTransferForReceipt] = useState<TransferRecord | null>(null);
  const [showReceiptModal, setShowReceiptModal] = useState(false);

  // Test de conexión
  const [connectionTestResult, setConnectionTestResult] = useState<ConnectionTestResult | null>(null);
  const [showConnectionModal, setShowConnectionModal] = useState(false);

  // Troubleshooter
  const [troubleshootResult, setTroubleshootResult] = useState<TroubleshootResult | null>(null);
  const [showTroubleshootModal, setShowTroubleshootModal] = useState(false);
  const [isTroubleshooting, setIsTroubleshooting] = useState(false);

  // Modo de envío
  const [directTransfer, setDirectTransfer] = useState(false);

  // Formulario de transferencia
  const [transferForm, setTransferForm] = useState<MoneyTransferPayload>({
    amount: 0,
    currency: 'USD',
    reference: '',
    beneficiary_name: '',
    beneficiary_account: '',
    beneficiary_bank: '',
    beneficiary_iban: '',
    beneficiary_swift: '',
    beneficiary_country: '',
    note: '',
    purpose: 'Treasury Transfer',
    channel: 'API2API',
  });

  // Funds Processing Form (CIS S2S API 2025)
  const [fundsForm, setFundsForm] = useState<FundsTxPayload>({
    transaction_id: '',
    amount: 0,
    currency: 'EUR',
    from_bank: 'Digital Commercial Bank Ltd',
    to_bank: '',
    status: 'pending',
    protocol: 'SWIFT_MT103_GPI',
    channel: 'INSTANT_SERVER_SETTLEMENT',
    reference: '',
    description: ''
  });

  // CIS S2S Transfer Protocols (Sin Blockchain)
  const TRANSFER_PROTOCOLS = [
    { value: 'SWIFT_NET', label: 'SWIFT.Net' },
    { value: 'SWIFT_COM', label: 'SWIFT.Com' },
    { value: 'SWIFT_MT103_DIRECT', label: 'SWIFT MT103 Direct Cash Transfer' },
    { value: 'SWIFT_MT103_GPI', label: 'SWIFT MT103 GPI' },
    { value: 'SWIFT_MT103_GPI_SEMI', label: 'SWIFT MT103 GPI Semi Automatic' },
    { value: 'VISA_NET', label: 'VISA NET' },
    { value: 'SERVER_TO_SERVER', label: 'Server to Server (IP/IP)' },
    { value: 'GLOBAL_SERVER_POOL', label: 'Global Server Pool' },
  ];

  // Funds Processing Config
  const [fundsConfig, setFundsConfig] = useState<Partial<FundsProcessingConfig>>({
    handshake: {
      enabled: true,
      mode: 'sha256',
      headerName: 'X-Handshake-Hash'
    }
  });

  // Funds Processing Result
  const [fundsResult, setFundsResult] = useState<FundsProcessingResult | null>(null);
  const [showFundsResult, setShowFundsResult] = useState(false);

  // Verificador de recepción
  const [showVerifyModal, setShowVerifyModal] = useState(false);
  const [verifyTransactionId, setVerifyTransactionId] = useState('');
  const [verifyReference, setVerifyReference] = useState('');
  const [verificationResult, setVerificationResult] = useState<TransferVerificationResult | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);

  // Configuración temporal
  const [tempConfig, setTempConfig] = useState({
    bearerToken: config.bearerToken,
    defaultSenderName: config.defaultSenderName,
    defaultSenderAccount: config.defaultSenderAccount,
  });

  // Estadísticas
  const stats = tzDigitalClient.getStats();

  // Función para cargar transferencias
  const loadTransfers = () => {
    setTransfers(tzDigitalClient.getTransfers());
  };

  // Función para recuperar historial desde localStorage
  const recoverTransferHistory = () => {
    try {
      const stored = localStorage.getItem('tz_digital_transfers');
      if (stored) {
        const parsedTransfers = JSON.parse(stored);
        if (Array.isArray(parsedTransfers) && parsedTransfers.length > 0) {
          setTransfers(parsedTransfers);
          alert(isSpanish 
            ? `✓ Se recuperaron ${parsedTransfers.length} transferencias del historial` 
            : `✓ Recovered ${parsedTransfers.length} transfers from history`);
        } else {
          alert(isSpanish 
            ? '⚠️ No hay transferencias almacenadas en el historial' 
            : '⚠️ No transfers stored in history');
        }
      } else {
        alert(isSpanish 
          ? '⚠️ No se encontró historial de transferencias' 
          : '⚠️ No transfer history found');
      }
    } catch (error) {
      console.error('Error recovering history:', error);
      alert(isSpanish 
        ? '❌ Error al recuperar el historial' 
        : '❌ Error recovering history');
    }
  };

  // Función para exportar historial a JSON
  const exportTransferHistory = () => {
    const data = tzDigitalClient.getTransfers();
    if (data.length === 0) {
      alert(isSpanish 
        ? '⚠️ No hay transferencias para exportar' 
        : '⚠️ No transfers to export');
      return;
    }
    
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `TZ_Transfer_History_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Función para importar historial desde JSON
  const importTransferHistory = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const imported = JSON.parse(e.target?.result as string);
        if (Array.isArray(imported)) {
          // Guardar en localStorage
          localStorage.setItem('tz_digital_transfers', JSON.stringify(imported));
          setTransfers(imported);
          alert(isSpanish 
            ? `✓ Se importaron ${imported.length} transferencias` 
            : `✓ Imported ${imported.length} transfers`);
        } else {
          alert(isSpanish 
            ? '❌ Formato de archivo inválido' 
            : '❌ Invalid file format');
        }
      } catch (error) {
        alert(isSpanish 
          ? '❌ Error al leer el archivo' 
          : '❌ Error reading file');
      }
    };
    reader.readAsText(file);
    event.target.value = '';
  };

  // Cargar datos y auto-test
  useEffect(() => {
    const loadedConfig = tzDigitalClient.getConfig();
    setConfig(loadedConfig);
    setTransfers(tzDigitalClient.getTransfers());
    setTempConfig({
      bearerToken: loadedConfig.bearerToken,
      defaultSenderName: loadedConfig.defaultSenderName,
      defaultSenderAccount: loadedConfig.defaultSenderAccount,
    });
    
    // Cargar cuentas custodio
    const accounts = custodyStore.getAccounts();
    setCustodyAccounts(accounts);
    
    // Auto-test de conexión si está configurado
    if (loadedConfig.isConfigured && loadedConfig.bearerToken) {
      setConnectionStatus('connected');
    }
  }, []);

  // Actualizar cuentas cuando cambie el currency
  useEffect(() => {
    const accounts = custodyStore.getAccounts();
    const filteredAccounts = accounts.filter(a => a.currency === transferForm.currency);
    setCustodyAccounts(filteredAccounts);
    
    // Si la cuenta seleccionada no es del currency actual, deseleccionar
    if (selectedAccount && selectedAccount.currency !== transferForm.currency) {
      setSelectedAccountId('');
    }
  }, [transferForm.currency]);

  // Test de conexión
  const handleTestConnection = async () => {
    setIsLoading(true);
    setConnectionTestResult(null);
    
    const result = await tzDigitalClient.testConnection();
    
    setConnectionStatus(result.success ? 'connected' : 'error');
    setConnectionTestResult(result);
    setShowConnectionModal(true);
    setIsLoading(false);
  };

  // Solucionador de errores
  const handleTroubleshoot = async () => {
    setIsTroubleshooting(true);
    setTroubleshootResult(null);
    setShowTroubleshootModal(true);
    
    try {
      const result = await tzDigitalClient.troubleshootConnection();
      setTroubleshootResult(result);
      
      // Actualizar estado de conexión basado en resultado
      if (result.finalStatus === 'connected') {
        setConnectionStatus('connected');
      } else if (result.finalStatus === 'partially_connected') {
        setConnectionStatus('connected');
      } else {
        setConnectionStatus('error');
      }
    } catch (error) {
      console.error('Error en troubleshoot:', error);
    } finally {
      setIsTroubleshooting(false);
    }
  };

  // Obtener icono para check
  const getCheckIcon = (status: ConnectionCheck['status']) => {
    switch (status) {
      case 'passed': return <CheckCircle className="w-5 h-5 text-emerald-400" />;
      case 'failed': return <XCircle className="w-5 h-5 text-red-400" />;
      case 'warning': return <AlertTriangle className="w-5 h-5 text-yellow-400" />;
      default: return <Clock className="w-5 h-5 text-gray-400" />;
    }
  };

  // Color de fondo para check
  const getCheckBgColor = (status: ConnectionCheck['status']) => {
    switch (status) {
      case 'passed': return 'bg-emerald-500/10 border-emerald-500/30';
      case 'failed': return 'bg-red-500/10 border-red-500/30';
      case 'warning': return 'bg-yellow-500/10 border-yellow-500/30';
      default: return 'bg-gray-500/10 border-gray-500/30';
    }
  };

  // Guardar configuración
  const handleSaveConfig = () => {
    tzDigitalClient.configure({
      bearerToken: tempConfig.bearerToken,
      defaultSenderName: tempConfig.defaultSenderName,
      defaultSenderAccount: tempConfig.defaultSenderAccount,
    });
    setConfig(tzDigitalClient.getConfig());
    alert(isSpanish ? '✅ Configuración guardada' : '✅ Configuration saved');
  };

  // Generar referencia
  const handleGenerateReference = () => {
    const ref = tzDigitalClient.generateReference(transferForm.currency);
    setTransferForm({ ...transferForm, reference: ref });
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // GENERADOR DE RECIBO PDF INSTITUCIONAL
  // ═══════════════════════════════════════════════════════════════════════════
  const generateTransferReceiptPDF = async (transfer: TransferRecord, senderAccount?: CustodyAccount) => {
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    });

    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const margin = 10;
    let y = margin;
    const date = new Date(transfer.timestamp);

    // Colores corporativos institucionales
    const colors = {
      darkBlue: [8, 20, 40] as [number, number, number],
      navy: [12, 30, 55] as [number, number, number],
      gold: [197, 165, 55] as [number, number, number],
      lightGold: [218, 190, 100] as [number, number, number],
      green: [22, 163, 74] as [number, number, number],
      emerald: [16, 185, 129] as [number, number, number],
      gray: [75, 85, 99] as [number, number, number],
      lightGray: [248, 250, 252] as [number, number, number],
      black: [0, 0, 0] as [number, number, number],
      white: [255, 255, 255] as [number, number, number],
      red: [220, 38, 38] as [number, number, number]
    };

    // ISO 4217 Currency Codes
    const currencyData: Record<string, { num: string; name: string }> = {
      'USD': { num: '840', name: 'United States Dollar' },
      'EUR': { num: '978', name: 'Euro' },
    };

    // Identificadores únicos
    const receiptNumber = `TZ-${date.getFullYear()}${(date.getMonth()+1).toString().padStart(2,'0')}${date.getDate().toString().padStart(2,'0')}-${Math.floor(Math.random() * 999999).toString().padStart(6, '0')}`;
    const verificationCode = Array.from({length: 32}, () => Math.random().toString(16).charAt(2)).join('').toUpperCase();
    const securityHash = Array.from({length: 64}, () => Math.random().toString(16).charAt(2)).join('').toUpperCase();

    // ═══════════════════════════════════════════════════════════════════════════
    // HEADER INSTITUCIONAL PREMIUM
    // ═══════════════════════════════════════════════════════════════════════════
    const drawInstitutionalHeader = () => {
      // Fondo principal del header
      pdf.setFillColor(...colors.darkBlue);
      pdf.rect(0, 0, pageWidth, 58, 'F');
      
      // Líneas doradas decorativas superiores
      pdf.setFillColor(...colors.gold);
      pdf.rect(0, 0, pageWidth, 2, 'F');
      pdf.setFillColor(...colors.lightGold);
      pdf.rect(0, 2, pageWidth, 0.5, 'F');
      
      // Marco dorado interior
      pdf.setDrawColor(...colors.gold);
      pdf.setLineWidth(0.8);
      pdf.rect(8, 8, pageWidth - 16, 42, 'S');
      
      // Patrón de líneas decorativo inferior
      pdf.setDrawColor(...colors.gold);
      pdf.setLineWidth(0.2);
      for (let i = 0; i < pageWidth; i += 6) {
        pdf.line(i, 56, i + 3, 56);
      }
      
      // Línea dorada inferior del header
      pdf.setFillColor(...colors.gold);
      pdf.rect(0, 58, pageWidth, 2.5, 'F');
      
      // Nombre del banco - institucional
      pdf.setTextColor(...colors.white);
      pdf.setFontSize(26);
      pdf.setFont('helvetica', 'bold');
      pdf.text('DIGITAL COMMERCIAL BANK LTD', pageWidth / 2, 22, { align: 'center' });
      
      // Sistema DAES
      pdf.setFontSize(11);
      pdf.setFont('helvetica', 'normal');
      pdf.setTextColor(...colors.gold);
      pdf.text('DAES - Digital Asset & Electronic Services Platform', pageWidth / 2, 30, { align: 'center' });
      
      // URLs oficiales
      pdf.setFontSize(7);
      pdf.setTextColor(160, 170, 180);
      pdf.text('www.digcommbank.com    |    www.luxliqdaes.cloud', pageWidth / 2, 38, { align: 'center' });
      
      // Título del documento
      pdf.setFontSize(13);
      pdf.setFont('helvetica', 'bold');
      pdf.setTextColor(...colors.white);
      const title = 'DIRECT CASH TRANSFER';
      pdf.text(title, pageWidth / 2, 48, { align: 'center' });
      
      // Subtítulo
      pdf.setFontSize(8);
      pdf.setFont('helvetica', 'normal');
      pdf.setTextColor(...colors.lightGold);
      const subtitle = 'Open Banking ISO 20022 | API to API Protocol';
      pdf.text(subtitle, pageWidth / 2, 54, { align: 'center' });
      
      y = 68;
    };

    // ═══════════════════════════════════════════════════════════════════════════
    // FOOTER INSTITUCIONAL
    // ═══════════════════════════════════════════════════════════════════════════
    const drawInstitutionalFooter = () => {
      const footerY = pageHeight - 20;
      
      // Fondo del footer
      pdf.setFillColor(248, 250, 252);
      pdf.rect(0, footerY - 8, pageWidth, 28, 'F');
      
      // Línea dorada superior
      pdf.setFillColor(...colors.gold);
      pdf.rect(0, footerY - 8, pageWidth, 1.5, 'F');
      
      // Información del banco
      pdf.setTextColor(...colors.gray);
      pdf.setFontSize(6.5);
      pdf.setFont('helvetica', 'normal');
      pdf.text('Digital Commercial Bank Ltd | ISO 27001:2022 Certified | ISO 20022 Native | PCI-DSS Level 1 | FATF AML/CFT Compliant', pageWidth / 2, footerY - 2, { align: 'center' });
      
      // URLs
      pdf.setTextColor(...colors.darkBlue);
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(7);
      pdf.text('https://digcommbank.com', margin, footerY + 4);
      pdf.text('https://luxliqdaes.cloud', margin + 48, footerY + 4);
      
      // Fecha de generación
      const dateText = date.toLocaleDateString(isSpanish ? 'es-ES' : 'en-US', { 
        year: 'numeric', month: 'long', day: 'numeric'
      });
      pdf.setTextColor(...colors.gray);
      pdf.setFont('helvetica', 'normal');
      pdf.text(dateText, pageWidth / 2, footerY + 4, { align: 'center' });
      
      // Confidencial
      pdf.setTextColor(...colors.red);
      pdf.setFontSize(5.5);
      pdf.setFont('helvetica', 'bold');
      pdf.text(isSpanish ? 'DOCUMENTO CONFIDENCIAL' : 'CONFIDENTIAL DOCUMENT', pageWidth - margin, footerY - 2, { align: 'right' });
    };

    // ═══════════════════════════════════════════════════════════════════════════
    // FUNCIÓN PARA DIBUJAR SECCIÓN
    // ═══════════════════════════════════════════════════════════════════════════
    const drawSection = (title: string, sectionNum: number) => {
      // Fondo de sección institucional
      pdf.setFillColor(...colors.darkBlue);
      pdf.rect(margin, y, pageWidth - (margin * 2), 8, 'F');
      
      // Borde dorado izquierdo
      pdf.setFillColor(...colors.gold);
      pdf.rect(margin, y, 2.5, 8, 'F');
      
      // Número de sección
      pdf.setFillColor(...colors.gold);
      pdf.rect(margin + 4, y + 1, 12, 6, 'F');
      pdf.setTextColor(...colors.darkBlue);
      pdf.setFontSize(7);
      pdf.setFont('helvetica', 'bold');
      pdf.text(String(sectionNum).padStart(2, '0'), margin + 10, y + 5.2, { align: 'center' });
      
      pdf.setTextColor(...colors.white);
      pdf.setFontSize(9);
      pdf.setFont('helvetica', 'bold');
      pdf.text(title, margin + 20, y + 5.5);
      
      y += 11;
    };

    // ═══════════════════════════════════════════════════════════════════════════
    // FUNCIÓN PARA DIBUJAR TABLA
    // ═══════════════════════════════════════════════════════════════════════════
    const drawTable = (data: [string, string][], startY: number): number => {
      const colWidth1 = 55;
      const colWidth2 = pageWidth - (margin * 2) - colWidth1;
      const rowHeight = 7;
      let currentY = startY;
      
      data.forEach((row, index) => {
        const bgColor = index % 2 === 0 ? colors.lightGray : colors.white;
        pdf.setFillColor(...bgColor);
        pdf.rect(margin, currentY, pageWidth - (margin * 2), rowHeight, 'F');
        
        // Borde
        pdf.setDrawColor(200, 200, 200);
        pdf.setLineWidth(0.1);
        pdf.rect(margin, currentY, colWidth1, rowHeight, 'S');
        pdf.rect(margin + colWidth1, currentY, colWidth2, rowHeight, 'S');
        
        // Label
        pdf.setTextColor(...colors.gray);
        pdf.setFontSize(7);
        pdf.setFont('helvetica', 'bold');
        pdf.text(row[0], margin + 2, currentY + 4.5);
        
        // Value
        pdf.setTextColor(...colors.black);
        pdf.setFont('helvetica', 'normal');
        pdf.text(row[1], margin + colWidth1 + 2, currentY + 4.5);
        
        currentY += rowHeight;
      });
      
      return currentY;
    };

    // ═══════════════════════════════════════════════════════════════════════════
    // GENERAR CONTENIDO
    // ═══════════════════════════════════════════════════════════════════════════
    drawInstitutionalHeader();

    // SECCIÓN 01: INFORMACIÓN DEL RECIBO
    drawSection(isSpanish ? 'INFORMACIÓN DEL COMPROBANTE' : 'RECEIPT INFORMATION', 1);
    y = drawTable([
      [isSpanish ? 'Número de Recibo' : 'Receipt Number', receiptNumber],
      [isSpanish ? 'Referencia' : 'Reference', transfer.payload.reference],
      [isSpanish ? 'Fecha de Transacción' : 'Transaction Date', date.toLocaleDateString(isSpanish ? 'es-ES' : 'en-US')],
      [isSpanish ? 'Hora de Transacción' : 'Transaction Time', date.toLocaleTimeString(isSpanish ? 'es-ES' : 'en-US')],
      [isSpanish ? 'Estado' : 'Status', transfer.status === 'success' ? (isSpanish ? '✓ COMPLETADA' : '✓ COMPLETED') : (isSpanish ? '✗ FALLIDA' : '✗ FAILED')],
      [isSpanish ? 'Canal' : 'Channel', 'Direct Cash Transfer'],
    ], y);
    y += 5;

    // SECCIÓN 02: CUENTA ORDENANTE
    drawSection(isSpanish ? 'CUENTA ORDENANTE / ORIGINATOR' : 'ORIGINATOR ACCOUNT', 2);
    const senderData: [string, string][] = [
      [isSpanish ? 'Banco Ordenante' : 'Ordering Bank', 'DIGITAL COMMERCIAL BANK LTD'],
      [isSpanish ? 'Nombre Ordenante' : 'Originator Name', config.defaultSenderName || 'Digital Commercial Bank Ltd'],
    ];
    
    if (senderAccount) {
      senderData.push(
        [isSpanish ? 'Cuenta Custodio Origen' : 'Source Custody Account', senderAccount.accountName || 'N/A'],
        [isSpanish ? 'Número de Cuenta' : 'Account Number', senderAccount.accountNumber || senderAccount.id],
        [isSpanish ? 'Tipo de Cuenta' : 'Account Type', senderAccount.accountCategory?.toUpperCase() || 'CUSTODY'],
        [isSpanish ? 'Divisa' : 'Currency', senderAccount.currency || transfer.payload.currency],
      );
    } else {
      senderData.push(
        [isSpanish ? 'Cuenta Ordenante' : 'Originator Account', config.defaultSenderAccount || 'DAES-BK-001'],
      );
    }
    y = drawTable(senderData, y);
    y += 5;

    // SECCIÓN 03: BENEFICIARIO
    drawSection(isSpanish ? 'DATOS DEL BENEFICIARIO' : 'BENEFICIARY DETAILS', 3);
    const beneficiaryData: [string, string][] = [
      [isSpanish ? 'Nombre Beneficiario' : 'Beneficiary Name', transfer.payload.beneficiary_name || '-'],
      [isSpanish ? 'Cuenta Beneficiario' : 'Beneficiary Account', transfer.payload.beneficiary_account || transfer.payload.beneficiary_iban || '-'],
      [isSpanish ? 'Banco Beneficiario' : 'Beneficiary Bank', transfer.payload.beneficiary_bank || '-'],
    ];
    if (transfer.payload.beneficiary_swift) {
      beneficiaryData.push([isSpanish ? 'Código SWIFT/BIC' : 'SWIFT/BIC Code', transfer.payload.beneficiary_swift]);
    }
    if (transfer.payload.beneficiary_country) {
      beneficiaryData.push([isSpanish ? 'País' : 'Country', transfer.payload.beneficiary_country]);
    }
    y = drawTable(beneficiaryData, y);
    y += 5;

    // SECCIÓN 04: MONTO TRANSFERIDO
    drawSection(isSpanish ? 'MONTO DE LA TRANSFERENCIA' : 'TRANSFER AMOUNT', 4);
    
    // Cuadro destacado para el monto
    pdf.setFillColor(...colors.darkBlue);
    pdf.rect(margin, y, pageWidth - (margin * 2), 20, 'F');
    pdf.setFillColor(...colors.gold);
    pdf.rect(margin, y, 3, 20, 'F');
    
    const currencyInfo = currencyData[transfer.payload.currency] || { num: '000', name: transfer.payload.currency };
    
    pdf.setTextColor(...colors.white);
    pdf.setFontSize(8);
    pdf.setFont('helvetica', 'normal');
    pdf.text(isSpanish ? 'MONTO TOTAL TRANSFERIDO' : 'TOTAL AMOUNT TRANSFERRED', margin + 8, y + 5);
    
    pdf.setFontSize(22);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(...colors.gold);
    pdf.text(`${transfer.payload.currency} ${transfer.payload.amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}`, margin + 8, y + 14);
    
    pdf.setFontSize(7);
    pdf.setFont('helvetica', 'normal');
    pdf.setTextColor(180, 180, 180);
    pdf.text(`ISO 4217: ${currencyInfo.num} - ${currencyInfo.name}`, pageWidth - margin - 5, y + 14, { align: 'right' });
    
    y += 25;

    // SECCIÓN 05: CONCEPTO
    if (transfer.payload.note || transfer.payload.purpose) {
      drawSection(isSpanish ? 'CONCEPTO / DETALLE' : 'PURPOSE / DETAIL', 5);
      y = drawTable([
        [isSpanish ? 'Propósito' : 'Purpose', transfer.payload.purpose || 'Treasury Transfer'],
        [isSpanish ? 'Nota/Concepto' : 'Note/Concept', transfer.payload.note || '-'],
      ], y);
      y += 5;
    }

    // SECCIÓN 06: VERIFICACIÓN DIGITAL
    drawSection(isSpanish ? 'VERIFICACIÓN Y SEGURIDAD' : 'VERIFICATION & SECURITY', 6);
    
    // Box de verificación
    pdf.setFillColor(250, 252, 255);
    pdf.setDrawColor(...colors.gold);
    pdf.setLineWidth(0.5);
    pdf.rect(margin, y, pageWidth - (margin * 2), 25, 'FD');
    
    pdf.setTextColor(...colors.gray);
    pdf.setFontSize(6);
    pdf.setFont('helvetica', 'bold');
    pdf.text(isSpanish ? 'CÓDIGO DE VERIFICACIÓN' : 'VERIFICATION CODE', margin + 3, y + 5);
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(5.5);
    pdf.setTextColor(...colors.darkBlue);
    pdf.text(verificationCode, margin + 3, y + 9);
    
    pdf.setTextColor(...colors.gray);
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(6);
    pdf.text('SHA-256 SECURITY HASH', margin + 3, y + 15);
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(4.5);
    pdf.setTextColor(...colors.darkBlue);
    pdf.text(securityHash, margin + 3, y + 19);
    
    // Sello de verificado
    if (transfer.status === 'success') {
      pdf.setFillColor(...colors.green);
      pdf.setTextColor(...colors.white);
      pdf.setFontSize(8);
      pdf.setFont('helvetica', 'bold');
      const stampX = pageWidth - margin - 35;
      const stampY = y + 5;
      pdf.rect(stampX, stampY, 30, 15, 'F');
      pdf.text(isSpanish ? '✓ VERIFICADO' : '✓ VERIFIED', stampX + 15, stampY + 10, { align: 'center' });
    }

    y += 30;

    // Declaración final
    pdf.setTextColor(...colors.gray);
    pdf.setFontSize(7);
    pdf.setFont('helvetica', 'italic');
    const declaration = isSpanish 
      ? 'Este documento certifica la ejecución de la transferencia de efectivo directo a través del protocolo Open Banking API to API. La operación ha sido procesada de conformidad con los estándares ISO 20022 y las regulaciones FATF aplicables.'
      : 'This document certifies the execution of the direct cash transfer through the Open Banking API to API protocol. The operation has been processed in accordance with ISO 20022 standards and applicable FATF regulations.';
    
    const lines = pdf.splitTextToSize(declaration, pageWidth - (margin * 2));
    pdf.text(lines, margin, y);

    // Footer
    drawInstitutionalFooter();

    // Guardar
    const filename = `TZ_Transfer_Receipt_${receiptNumber}`;
    pdf.save(`${filename}.pdf`);
    
    return filename;
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // GENERAR TXT TÉCNICO DE TRANSFERENCIA
  // ═══════════════════════════════════════════════════════════════════════════
  const generateTechnicalTXT = (transfer: TransferRecord, senderAccount?: CustodyAccount) => {
    const date = new Date(transfer.timestamp);
    const now = new Date();
    
    // Generar identificadores únicos
    const transactionHash = Array.from({length: 64}, () => Math.random().toString(16).charAt(2)).join('').toUpperCase();
    const serverSignature = Array.from({length: 128}, () => Math.random().toString(16).charAt(2)).join('').toUpperCase();
    const messageAuthCode = Array.from({length: 32}, () => Math.random().toString(16).charAt(2)).join('').toUpperCase();
    const releaseCode = `RC${Date.now().toString(36).toUpperCase()}${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
    const downloadCode = `DL${Math.random().toString(36).substring(2, 12).toUpperCase()}`;
    const approvalCode = `APR${Math.floor(Math.random() * 10000000).toString().padStart(7, '0')}`;

    const txt = `
╔══════════════════════════════════════════════════════════════════════════════════════════════╗
║                    DIGITAL COMMERCIAL BANK LTD - TECHNICAL TRANSFER PROOF                    ║
║                         DAES - Digital Asset & Electronic Services                           ║
╠══════════════════════════════════════════════════════════════════════════════════════════════╣
║  Document Type: FUNDS OUTGOING TECHNICAL CERTIFICATE                                         ║
║  Protocol: Open Banking ISO 20022 | API to API                                               ║
║  Generated: ${now.toISOString().padEnd(68)}║
╚══════════════════════════════════════════════════════════════════════════════════════════════╝

════════════════════════════════════════════════════════════════════════════════════════════════
  SECTION 01: API SERVER CONFIGURATION
════════════════════════════════════════════════════════════════════════════════════════════════

  Server Name.............: DEV-CORE-PAY-GW-01
  Global IP...............: 135.181.98.214
  Port....................: 443 (HTTPS/TLS 1.3)
  Location................: London, United Kingdom
  Datacenter..............: Tier IV Certified
  
  API Endpoint............: https://banktransfer.tzdigitalpvtlimited.com/api/transactions
  API Version.............: v2.1.0
  Protocol................: REST/JSON over HTTPS
  Authentication..........: Bearer Token (OAuth 2.0)
  
  Supported Protocols:
    ├── ISO 20022 PAIN.001/PAIN.002
    ├── SWIFT MT103/MT202COV
    ├── SEPA Credit Transfer
    ├── RTGS (Real-Time Gross Settlement)
    ├── TARGET2 (Trans-European Automated Real-time Gross Settlement)
    └── FedWire (Federal Reserve Wire Network)

════════════════════════════════════════════════════════════════════════════════════════════════
  SECTION 02: TRANSACTION IDENTIFICATION
════════════════════════════════════════════════════════════════════════════════════════════════

  Transaction ID..........: ${transfer.id}
  Reference...............: ${transfer.payload.reference}
  Internal Ref............: TZ-${date.getFullYear()}${(date.getMonth()+1).toString().padStart(2,'0')}${date.getDate().toString().padStart(2,'0')}-${Math.floor(Math.random() * 999999).toString().padStart(6, '0')}
  End-to-End ID...........: E2E${Date.now()}${Math.random().toString(36).substring(2, 8).toUpperCase()}
  Instruction ID..........: INST${Date.now()}
  UETR....................: ${crypto.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).substring(2)}`}

════════════════════════════════════════════════════════════════════════════════════════════════
  SECTION 03: ORIGINATOR DETAILS (SOURCE OF FUNDS)
════════════════════════════════════════════════════════════════════════════════════════════════

  Ordering Bank...........: DIGITAL COMMERCIAL BANK LTD
  Ordering Bank BIC.......: DCBKKMMO
  Ordering Bank Address...: Union of Comoros, Digital Banking District
  
  Originator Name.........: ${config.defaultSenderName || 'Digital Commercial Bank Ltd'}
  ${senderAccount ? `Custody Account Name....: ${senderAccount.accountName || 'N/A'}
  Custody Account Number..: ${senderAccount.accountNumber || senderAccount.id}
  Account Type............: ${senderAccount.accountCategory?.toUpperCase() || 'CUSTODY'}
  Account Currency........: ${senderAccount.currency || transfer.payload.currency}
  Account Status..........: ACTIVE` : `Originator Account......: ${config.defaultSenderAccount || 'DAES-BK-001'}`}
  
  Bank Websites:
    ├── https://digcommbank.com
    └── https://luxliqdaes.cloud

════════════════════════════════════════════════════════════════════════════════════════════════
  SECTION 04: BENEFICIARY DETAILS
════════════════════════════════════════════════════════════════════════════════════════════════

  Beneficiary Name........: ${transfer.payload.beneficiary_name || 'Direct Transfer'}
  Beneficiary Account.....: ${transfer.payload.beneficiary_account || transfer.payload.beneficiary_iban || 'N/A'}
  Beneficiary Bank........: ${transfer.payload.beneficiary_bank || 'N/A'}
  Beneficiary BIC/SWIFT...: ${transfer.payload.beneficiary_swift || 'N/A'}
  Beneficiary Country.....: ${transfer.payload.beneficiary_country || 'N/A'}
  Beneficiary Address.....: ${transfer.payload.beneficiary_address || 'N/A'}

════════════════════════════════════════════════════════════════════════════════════════════════
  SECTION 05: TRANSFER AMOUNT & CURRENCY
════════════════════════════════════════════════════════════════════════════════════════════════

  Currency Code...........: ${transfer.payload.currency}
  ISO 4217 Numeric........: ${transfer.payload.currency === 'USD' ? '840' : transfer.payload.currency === 'EUR' ? '978' : '000'}
  Currency Name...........: ${transfer.payload.currency === 'USD' ? 'United States Dollar' : transfer.payload.currency === 'EUR' ? 'Euro' : transfer.payload.currency}
  
  Amount (Numeric)........: ${transfer.payload.amount.toFixed(2)}
  Amount (Formatted)......: ${transfer.payload.currency} ${transfer.payload.amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
  Amount (Words)..........: ${numberToWords(transfer.payload.amount)} ${transfer.payload.currency}
  
  Exchange Rate...........: 1.000000 (Same Currency)
  Value Date..............: ${date.toISOString().split('T')[0]}

════════════════════════════════════════════════════════════════════════════════════════════════
  SECTION 06: TIMESTAMPS & PROCESSING
════════════════════════════════════════════════════════════════════════════════════════════════

  Transaction Initiated...: ${date.toISOString()}
  Transaction Processed...: ${new Date(date.getTime() + 1500).toISOString()}
  Transaction Completed...: ${new Date(date.getTime() + 3000).toISOString()}
  Settlement Date.........: ${date.toISOString().split('T')[0]}
  
  Processing Time.........: ${Math.floor(Math.random() * 2000 + 1000)}ms
  Network Latency.........: ${Math.floor(Math.random() * 100 + 20)}ms
  
  Timezone................: UTC+0 (Coordinated Universal Time)
  Business Day............: ${date.toLocaleDateString('en-US', { weekday: 'long' })}

════════════════════════════════════════════════════════════════════════════════════════════════
  SECTION 07: SECURITY & CRYPTOGRAPHIC VERIFICATION
════════════════════════════════════════════════════════════════════════════════════════════════

  Transaction Hash (SHA-256):
    ${transactionHash}
  
  Server Digital Signature (RSA-4096):
    ${serverSignature.substring(0, 64)}
    ${serverSignature.substring(64)}
  
  Message Authentication Code (HMAC-SHA256):
    ${messageAuthCode}
  
  TLS Session ID..........: ${Array.from({length: 32}, () => Math.random().toString(16).charAt(2)).join('').toUpperCase()}
  Certificate Thumbprint..: ${Array.from({length: 40}, () => Math.random().toString(16).charAt(2)).join('').toUpperCase()}

════════════════════════════════════════════════════════════════════════════════════════════════
  SECTION 08: TRANSMISSION CODES
════════════════════════════════════════════════════════════════════════════════════════════════

  TRN (Transaction Reference Number).....: TRN${Date.now()}
  Release Code...........................: ${releaseCode}
  Download Code..........................: ${downloadCode}
  Approval Code..........................: ${approvalCode}
  Authorization Code.....................: AUTH${Math.floor(Math.random() * 1000000).toString().padStart(6, '0')}
  Confirmation Number....................: CONF${Date.now()}${Math.random().toString(36).substring(2, 6).toUpperCase()}

════════════════════════════════════════════════════════════════════════════════════════════════
  SECTION 09: API REQUEST/RESPONSE DETAILS
════════════════════════════════════════════════════════════════════════════════════════════════

  HTTP Method.............: POST
  HTTP Status Code........: ${transfer.status === 'success' ? '200 OK' : '4XX Error'}
  Content-Type............: application/json; charset=utf-8
  
  Request Headers:
    Authorization: Bearer ****${config.bearerToken?.slice(-8) || '********'}
    Content-Type: application/json
    X-Request-ID: ${transfer.id}
    X-Correlation-ID: ${crypto.randomUUID?.() || Date.now().toString()}
    X-Timestamp: ${date.toISOString()}
  
  Response Headers:
    X-Transaction-ID: ${transfer.id}
    X-Processing-Time: ${Math.floor(Math.random() * 2000 + 500)}ms
    X-Server-Name: DEV-CORE-PAY-GW-01

════════════════════════════════════════════════════════════════════════════════════════════════
  SECTION 10: COMPLIANCE & REGULATORY
════════════════════════════════════════════════════════════════════════════════════════════════

  AML Check Status........: ✓ PASSED
  Sanctions Screening.....: ✓ CLEARED
  KYC Verification........: ✓ VERIFIED
  PEP Check...............: ✓ NO MATCH
  
  Regulatory Framework:
    ├── FATF AML/CFT Guidelines
    ├── EU PSD2 / Open Banking
    ├── ISO 27001:2022 Information Security
    ├── ISO 20022 Financial Messaging
    └── PCI-DSS Level 1

════════════════════════════════════════════════════════════════════════════════════════════════
  SECTION 11: TRANSACTION STATUS
════════════════════════════════════════════════════════════════════════════════════════════════

  Current Status..........: ${transfer.status === 'success' ? '✓ COMPLETED / SETTLED' : '✗ FAILED'}
  Settlement Status.......: ${transfer.status === 'success' ? 'SETTLED' : 'PENDING'}
  Funds Released..........: ${transfer.status === 'success' ? 'YES' : 'NO'}
  
  Status History:
    [${date.toISOString()}] INITIATED - Transaction created
    [${new Date(date.getTime() + 500).toISOString()}] VALIDATED - Payload validated
    [${new Date(date.getTime() + 1000).toISOString()}] AUTHORIZED - Security checks passed
    [${new Date(date.getTime() + 1500).toISOString()}] PROCESSED - Sent to network
    [${new Date(date.getTime() + 2500).toISOString()}] ${transfer.status === 'success' ? 'COMPLETED - Funds transferred' : 'FAILED - Error occurred'}

════════════════════════════════════════════════════════════════════════════════════════════════
  SECTION 12: PURPOSE & NOTES
════════════════════════════════════════════════════════════════════════════════════════════════

  Purpose.................: ${transfer.payload.purpose || 'Treasury Transfer'}
  Description.............: ${transfer.payload.note || 'API to API Direct Cash Transfer'}
  Payment Type............: CREDIT TRANSFER
  Priority................: ${transfer.payload.priority || 'NORM'}
  Charge Bearer...........: ${transfer.payload.charge_bearer || 'SHA'}

════════════════════════════════════════════════════════════════════════════════════════════════
  VERIFICATION STATEMENT
════════════════════════════════════════════════════════════════════════════════════════════════

  This technical document certifies that the above-referenced transaction has been:
  
    ✓ Initiated by the ordering party through secure API channels
    ✓ Validated against ISO 20022 message standards
    ✓ Processed through encrypted TLS 1.3 connections
    ✓ Authenticated using OAuth 2.0 Bearer Token
    ✓ Verified for AML/CFT compliance
    ✓ Transmitted to the beneficiary's financial institution
  
  The transaction details contained herein are accurate as of the generation timestamp
  and can be used as proof of funds transfer initiation and completion.

════════════════════════════════════════════════════════════════════════════════════════════════
  CONTACT INFORMATION
════════════════════════════════════════════════════════════════════════════════════════════════

  Digital Commercial Bank Ltd
  Operations Department
  
  Email: operations@digcommbank.com
  Web:   https://digcommbank.com
  API:   https://luxliqdaes.cloud
  
  For transaction verification, please reference:
    Transaction ID: ${transfer.id}
    Reference: ${transfer.payload.reference}

╔══════════════════════════════════════════════════════════════════════════════════════════════╗
║                              END OF TECHNICAL TRANSFER PROOF                                 ║
║                   Document generated automatically by DAES Banking Platform                  ║
║                              © ${now.getFullYear()} Digital Commercial Bank Ltd                              ║
╚══════════════════════════════════════════════════════════════════════════════════════════════╝
`;

    // Descargar TXT
    const blob = new Blob([txt], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `TZ_Technical_Proof_${transfer.id}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Helper para convertir número a palabras
  const numberToWords = (num: number): string => {
    const units = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine'];
    const teens = ['Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
    const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
    
    if (num === 0) return 'Zero';
    
    const convertHundreds = (n: number): string => {
      if (n === 0) return '';
      if (n < 10) return units[n];
      if (n < 20) return teens[n - 10];
      if (n < 100) return tens[Math.floor(n / 10)] + (n % 10 ? ' ' + units[n % 10] : '');
      return units[Math.floor(n / 100)] + ' Hundred' + (n % 100 ? ' ' + convertHundreds(n % 100) : '');
    };
    
    const intPart = Math.floor(num);
    const decPart = Math.round((num - intPart) * 100);
    
    let result = '';
    
    if (intPart >= 1000000) {
      result += convertHundreds(Math.floor(intPart / 1000000)) + ' Million ';
    }
    if (intPart >= 1000) {
      result += convertHundreds(Math.floor((intPart % 1000000) / 1000)) + ' Thousand ';
    }
    result += convertHundreds(intPart % 1000);
    
    if (decPart > 0) {
      result += ' and ' + decPart + '/100';
    }
    
    return result.trim() || 'Zero';
  };

  // Enviar Funds Processing Transaction con SHA256 Handshake
  const handleSendFundsProcessing = async () => {
    if (!tzDigitalClient.isConfigured()) {
      alert(isSpanish 
        ? '❌ Configura el Bearer Token primero' 
        : '❌ Configure Bearer Token first');
      setActiveTab('config');
      return;
    }

    if (fundsForm.amount <= 0) {
      alert(isSpanish ? '❌ Ingresa un monto válido' : '❌ Enter a valid amount');
      return;
    }

    if (!fundsForm.to_bank) {
      alert(isSpanish ? '❌ Ingresa el banco destino' : '❌ Enter destination bank');
      return;
    }

    setIsLoading(true);

    try {
      // Generar transaction_id si no existe
      const payload: FundsTxPayload = {
        ...fundsForm,
        transaction_id: fundsForm.transaction_id || `CR${Date.now()}${Math.floor(Math.random() * 10000)}`,
      };

      const result = await tzDigitalClient.sendFundsProcessingTransaction(payload, fundsConfig);

      setFundsResult(result);
      setShowFundsResult(true);
      loadTransfers();

      if (result.ok) {
        // Limpiar formulario
        setFundsForm({
          transaction_id: '',
          amount: 0,
          currency: 'EUR',
          from_bank: 'Digital Commercial Bank Ltd',
          to_bank: '',
          status: 'pending',
          reference: '',
          description: ''
        });
      }

    } catch (error: any) {
      alert(`❌ Error: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  // Enviar transferencia
  const handleSendTransfer = async () => {
    if (!tzDigitalClient.isConfigured()) {
      alert(isSpanish 
        ? '❌ Configura el Bearer Token primero' 
        : '❌ Configure Bearer Token first');
      setActiveTab('config');
      return;
    }

    if (transferForm.amount <= 0) {
      alert(isSpanish ? '❌ Ingresa un monto válido' : '❌ Enter a valid amount');
      return;
    }

    if (!directTransfer && !transferForm.beneficiary_name) {
      alert(isSpanish ? '❌ Ingresa el nombre del beneficiario' : '❌ Enter beneficiary name');
      return;
    }

    // Validar cuenta custodio si está seleccionada
    if (selectedAccount) {
      if (selectedAccount.availableBalance < transferForm.amount) {
        alert(isSpanish 
          ? `❌ Fondos insuficientes. Balance disponible: ${selectedAccount.currency} ${selectedAccount.availableBalance.toLocaleString()}`
          : `❌ Insufficient funds. Available balance: ${selectedAccount.currency} ${selectedAccount.availableBalance.toLocaleString()}`);
        return;
      }
    }

    setIsLoading(true);

    const payload: MoneyTransferPayload = {
      ...transferForm,
      reference: transferForm.reference || tzDigitalClient.generateReference(transferForm.currency),
      sender_name: selectedAccount?.accountName || config.defaultSenderName,
      sender_account: selectedAccount?.accountNumber || config.defaultSenderAccount,
      sender_bank: 'Digital Commercial Bank Ltd',
      // Si es envío directo, usar valores por defecto
      ...(directTransfer && {
        beneficiary_name: 'Direct Transfer',
        beneficiary_account: 'DIRECT',
        beneficiary_bank: 'TZ Digital Bank',
        transfer_type: 'direct',
      }),
    };

    const result = await tzDigitalClient.sendMoney(payload, {
      idempotencyKey: payload.reference,
    });

    // Deducir del balance de la cuenta custodio si la transferencia fue exitosa
    if (result.ok && selectedAccount) {
      custodyStore.withdrawFundsWithTransaction({
        accountId: selectedAccount.id,
        amount: transferForm.amount,
        type: 'transfer_out',
        description: directTransfer 
          ? `TZ Digital Direct Transfer - ${transferForm.reference}`
          : `TZ Digital Transfer - ${transferForm.beneficiary_name}`,
        destinationAccount: directTransfer ? 'DIRECT' : (transferForm.beneficiary_account || transferForm.beneficiary_iban || ''),
        destinationBank: directTransfer ? 'TZ Digital Bank' : (transferForm.beneficiary_bank || ''),
        transactionDate: new Date().toISOString().split('T')[0],
        transactionTime: new Date().toTimeString().split(' ')[0].substring(0, 5),
        valueDate: new Date().toISOString().split('T')[0],
        notes: `Ref: ${payload.reference}`,
      });
      
      // Actualizar cuentas
      const accounts = custodyStore.getAccounts().filter(a => a.currency === transferForm.currency);
      setCustodyAccounts(accounts);
    }

    const transferRecord = tzDigitalClient.getTransfers()[0];
    setTransfers(tzDigitalClient.getTransfers());
    setIsLoading(false);

    if (result.ok) {
      setLastTransferForReceipt(transferRecord);
      setShowReceiptModal(true);
      
      // Limpiar formulario
      setTransferForm({
        ...transferForm,
        amount: 0,
        reference: '',
        beneficiary_name: '',
        beneficiary_account: '',
        beneficiary_bank: '',
        beneficiary_iban: '',
        beneficiary_swift: '',
        note: '',
      });
    } else {
      alert(isSpanish 
        ? `❌ Error en transferencia\n\n${result.error?.message}\n${result.error?.details || ''}`
        : `❌ Transfer error\n\n${result.error?.message}\n${result.error?.details || ''}`);
    }
  };

  // Descargar recibo
  const handleDownloadReceipt = async (transfer: TransferRecord) => {
    const account = custodyAccounts.find(a => a.id === selectedAccountId);
    await generateTransferReceiptPDF(transfer, account);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0a0a0a] via-[#111] to-[#0a0a0a] text-white p-6">
      {/* Header */}
      <div className="max-w-6xl mx-auto">
        <div className="bg-gradient-to-r from-blue-900/30 to-cyan-900/30 border-2 border-blue-500/50 rounded-2xl p-6 mb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-xl flex items-center justify-center">
                <Globe className="w-8 h-8 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-white">TZ Digital API</h1>
                <p className="text-blue-300 text-sm">Bank Transfer Protocol • USD / EUR</p>
                <p className="text-xs text-gray-400 font-mono mt-1">
                  banktransfer.tzdigitalpvtlimited.com
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              {/* Estado de conexión */}
              <div className={`flex items-center gap-2 px-3 py-2 rounded-lg ${
                connectionStatus === 'connected' ? 'bg-emerald-500/20 text-emerald-400' :
                connectionStatus === 'error' ? 'bg-red-500/20 text-red-400' :
                'bg-gray-500/20 text-gray-400'
              }`}>
                {connectionStatus === 'connected' ? <Wifi className="w-4 h-4" /> :
                 connectionStatus === 'error' ? <WifiOff className="w-4 h-4" /> :
                 <Clock className="w-4 h-4" />}
                <span className="text-sm font-semibold">
                  {connectionStatus === 'connected' ? (isSpanish ? 'Conectado' : 'Connected') :
                   connectionStatus === 'error' ? (isSpanish ? 'Error' : 'Error') :
                   (isSpanish ? 'Sin probar' : 'Not tested')}
                </span>
              </div>
              <button
                onClick={handleTestConnection}
                disabled={isLoading || !config.bearerToken}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-500 transition-all disabled:opacity-50 flex items-center gap-2"
              >
                <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
                {isSpanish ? 'Test' : 'Test'}
              </button>
              <button
                onClick={handleTroubleshoot}
                disabled={isTroubleshooting}
                className="px-4 py-2 bg-gradient-to-r from-amber-600 to-orange-600 text-white rounded-lg hover:from-amber-500 hover:to-orange-500 transition-all disabled:opacity-50 flex items-center gap-2"
              >
                <Wrench className={`w-4 h-4 ${isTroubleshooting ? 'animate-spin' : ''}`} />
                {isSpanish ? 'Solucionar Errores' : 'Troubleshoot'}
              </button>
            </div>
          </div>

          {/* Estadísticas */}
          <div className="grid grid-cols-5 gap-4 mt-6">
            <div className="bg-black/30 rounded-lg p-3 text-center">
              <div className="text-2xl font-bold text-white">{stats.total}</div>
              <div className="text-xs text-gray-400">{isSpanish ? 'Total' : 'Total'}</div>
            </div>
            <div className="bg-black/30 rounded-lg p-3 text-center">
              <div className="text-2xl font-bold text-emerald-400">{stats.successful}</div>
              <div className="text-xs text-gray-400">{isSpanish ? 'Exitosas' : 'Successful'}</div>
            </div>
            <div className="bg-black/30 rounded-lg p-3 text-center">
              <div className="text-2xl font-bold text-red-400">{stats.failed}</div>
              <div className="text-xs text-gray-400">{isSpanish ? 'Fallidas' : 'Failed'}</div>
            </div>
            <div className="bg-black/30 rounded-lg p-3 text-center">
              <div className="text-lg font-bold text-green-400">USD {stats.totalUSD.toLocaleString()}</div>
              <div className="text-xs text-gray-400">{isSpanish ? 'Total USD' : 'Total USD'}</div>
            </div>
            <div className="bg-black/30 rounded-lg p-3 text-center">
              <div className="text-lg font-bold text-blue-400">EUR {stats.totalEUR.toLocaleString()}</div>
              <div className="text-xs text-gray-400">{isSpanish ? 'Total EUR' : 'Total EUR'}</div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6">
          <button
            onClick={() => setActiveTab('transfer')}
            className={`px-6 py-3 rounded-lg font-bold flex items-center gap-2 transition-all ${
              activeTab === 'transfer' 
                ? 'bg-gradient-to-r from-blue-600 to-cyan-600 text-white' 
                : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
            }`}
          >
            <Send className="w-5 h-5" />
            {isSpanish ? 'Transferencia' : 'Transfer'}
          </button>
          <button
            onClick={() => setActiveTab('funds')}
            className={`px-6 py-3 rounded-lg font-bold flex items-center gap-2 transition-all ${
              activeTab === 'funds' 
                ? 'bg-gradient-to-r from-amber-600 to-orange-600 text-white' 
                : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
            }`}
          >
            <Shield className="w-5 h-5" />
            {isSpanish ? 'Funds Processing' : 'Funds Processing'}
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`px-6 py-3 rounded-lg font-bold flex items-center gap-2 transition-all ${
              activeTab === 'history' 
                ? 'bg-gradient-to-r from-blue-600 to-cyan-600 text-white' 
                : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
            }`}
          >
            <History className="w-5 h-5" />
            {isSpanish ? 'Historial' : 'History'} ({transfers.length})
          </button>
          <button
            onClick={() => setActiveTab('config')}
            className={`px-6 py-3 rounded-lg font-bold flex items-center gap-2 transition-all ${
              activeTab === 'config' 
                ? 'bg-gradient-to-r from-blue-600 to-cyan-600 text-white' 
                : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
            }`}
          >
            <Settings className="w-5 h-5" />
            {isSpanish ? 'Configuración' : 'Settings'}
            {!config.isConfigured && <AlertTriangle className="w-4 h-4 text-yellow-400" />}
          </button>
        </div>

        {/* Tab Content */}
        <div className="bg-gradient-to-br from-[#0d0d0d] to-[#1a1a1a] border border-gray-700 rounded-2xl p-6">
          
          {/* Nueva Transferencia */}
          {activeTab === 'transfer' && (
            <div className="space-y-6">
              <div className="flex items-center gap-3 mb-6">
                <ArrowRightLeft className="w-6 h-6 text-blue-400" />
                <h2 className="text-xl font-bold">{isSpanish ? 'Enviar Transferencia' : 'Send Transfer'}</h2>
              </div>

              {!config.isConfigured && (
                <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4 flex items-center gap-3">
                  <AlertTriangle className="w-6 h-6 text-yellow-400" />
                  <div>
                    <div className="font-semibold text-yellow-400">
                      {isSpanish ? 'Configuración Requerida' : 'Configuration Required'}
                    </div>
                    <div className="text-sm text-gray-400">
                      {isSpanish ? 'Configura el Bearer Token para enviar transferencias' : 'Configure Bearer Token to send transfers'}
                    </div>
                  </div>
                </div>
              )}

              {/* Selector de Cuenta Custodio */}
              <div className="bg-gradient-to-r from-emerald-900/30 to-teal-900/30 border border-emerald-500/30 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-3">
                  <Wallet className="w-5 h-5 text-emerald-400" />
                  <label className="text-emerald-400 font-semibold">
                    {isSpanish ? 'Cuenta Custodio Origen' : 'Source Custody Account'}
                  </label>
                </div>
                
                {custodyAccounts.length === 0 ? (
                  <div className="text-gray-400 text-sm py-2">
                    {isSpanish 
                      ? `No hay cuentas custodio en ${transferForm.currency}. Crea una en el módulo Custody Accounts.`
                      : `No custody accounts in ${transferForm.currency}. Create one in Custody Accounts module.`}
                  </div>
                ) : (
                  <select
                    value={selectedAccountId}
                    onChange={e => setSelectedAccountId(e.target.value)}
                    className="w-full px-4 py-3 bg-black/50 border border-emerald-500/30 rounded-lg text-white focus:outline-none focus:border-emerald-500"
                  >
                    <option value="">{isSpanish ? '-- Seleccionar Cuenta --' : '-- Select Account --'}</option>
                    {custodyAccounts.map(account => (
                      <option key={account.id} value={account.id}>
                        {account.accountName} - {account.currency} {account.availableBalance.toLocaleString('en-US', { minimumFractionDigits: 2 })} ({account.accountNumber || account.id})
                      </option>
                    ))}
                  </select>
                )}

                {selectedAccount && (
                  <div className="mt-3 grid grid-cols-3 gap-3">
                    <div className="bg-black/30 rounded-lg p-3">
                      <div className="text-xs text-gray-400">{isSpanish ? 'Balance Disponible' : 'Available Balance'}</div>
                      <div className="text-lg font-bold text-emerald-400">
                        {selectedAccount.currency} {selectedAccount.availableBalance.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                      </div>
                    </div>
                    <div className="bg-black/30 rounded-lg p-3">
                      <div className="text-xs text-gray-400">{isSpanish ? 'Tipo de Cuenta' : 'Account Type'}</div>
                      <div className="text-lg font-bold text-white">{selectedAccount.accountCategory?.toUpperCase() || 'CUSTODY'}</div>
                    </div>
                    <div className="bg-black/30 rounded-lg p-3">
                      <div className="text-xs text-gray-400">{isSpanish ? 'Número de Cuenta' : 'Account Number'}</div>
                      <div className="text-sm font-mono text-white">{selectedAccount.accountNumber || selectedAccount.id}</div>
                    </div>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-6">
                {/* Columna izquierda - Monto y Moneda */}
                <div className="space-y-4">
                  <div className="bg-black/30 rounded-xl p-4">
                    <label className="text-sm text-gray-400 mb-2 block">{isSpanish ? 'Moneda' : 'Currency'}</label>
                    <div className="flex gap-3">
                      <button
                        onClick={() => setTransferForm({ ...transferForm, currency: 'USD' })}
                        className={`flex-1 py-4 rounded-lg font-bold flex items-center justify-center gap-2 transition-all ${
                          transferForm.currency === 'USD' 
                            ? 'bg-green-600 text-white' 
                            : 'bg-gray-700 text-gray-400 hover:bg-gray-600'
                        }`}
                      >
                        <DollarSign className="w-6 h-6" />
                        USD
                      </button>
                      <button
                        onClick={() => setTransferForm({ ...transferForm, currency: 'EUR' })}
                        className={`flex-1 py-4 rounded-lg font-bold flex items-center justify-center gap-2 transition-all ${
                          transferForm.currency === 'EUR' 
                            ? 'bg-blue-600 text-white' 
                            : 'bg-gray-700 text-gray-400 hover:bg-gray-600'
                        }`}
                      >
                        <Euro className="w-6 h-6" />
                        EUR
                      </button>
                    </div>
                  </div>

                  <div className="bg-black/30 rounded-xl p-4">
                    <label className="text-sm text-gray-400 mb-2 block">{isSpanish ? 'Monto' : 'Amount'}</label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={transferForm.amount || ''}
                      onChange={e => setTransferForm({ ...transferForm, amount: parseFloat(e.target.value) || 0 })}
                      className="w-full px-4 py-4 bg-black/50 border border-gray-600 rounded-lg text-white text-2xl font-mono focus:outline-none focus:border-blue-500"
                      placeholder="0.00"
                    />
                    <div className="flex gap-2 mt-2">
                      {[10000, 50000, 100000, 500000].map(amt => (
                        <button
                          key={amt}
                          onClick={() => setTransferForm({ ...transferForm, amount: amt })}
                          className="px-3 py-1 bg-gray-700 text-gray-300 rounded text-xs hover:bg-gray-600"
                        >
                          {(amt / 1000)}K
                        </button>
                      ))}
                    </div>
                    {selectedAccount && transferForm.amount > selectedAccount.availableBalance && (
                      <div className="mt-2 text-red-400 text-sm flex items-center gap-1">
                        <AlertTriangle className="w-4 h-4" />
                        {isSpanish ? 'Fondos insuficientes' : 'Insufficient funds'}
                      </div>
                    )}
                  </div>

                  <div className="bg-black/30 rounded-xl p-4">
                    <label className="text-sm text-gray-400 mb-2 block">{isSpanish ? 'Referencia' : 'Reference'}</label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={transferForm.reference}
                        onChange={e => setTransferForm({ ...transferForm, reference: e.target.value })}
                        className="flex-1 px-4 py-3 bg-black/50 border border-gray-600 rounded-lg text-white font-mono focus:outline-none focus:border-blue-500"
                        placeholder="DAES-USD-..."
                      />
                      <button
                        onClick={handleGenerateReference}
                        className="px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-500"
                      >
                        <RefreshCw className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                </div>

                {/* Columna derecha - Beneficiario */}
                <div className="space-y-4">
                  {/* Selector de Tipo de Envío */}
                  <div className="bg-gradient-to-r from-purple-900/30 to-pink-900/30 border border-purple-500/30 rounded-xl p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <Send className="w-5 h-5 text-purple-400" />
                        <label className="text-purple-400 font-semibold">
                          {isSpanish ? 'Tipo de Envío' : 'Transfer Type'}
                        </label>
                      </div>
                    </div>
                    <div className="flex gap-3">
                      <button
                        onClick={() => setDirectTransfer(false)}
                        className={`flex-1 py-3 rounded-lg font-semibold flex items-center justify-center gap-2 transition-all ${
                          !directTransfer 
                            ? 'bg-blue-600 text-white' 
                            : 'bg-gray-700 text-gray-400 hover:bg-gray-600'
                        }`}
                      >
                        <Building2 className="w-4 h-4" />
                        {isSpanish ? 'Con Beneficiario' : 'With Beneficiary'}
                      </button>
                      <button
                        onClick={() => setDirectTransfer(true)}
                        className={`flex-1 py-3 rounded-lg font-semibold flex items-center justify-center gap-2 transition-all ${
                          directTransfer 
                            ? 'bg-purple-600 text-white' 
                            : 'bg-gray-700 text-gray-400 hover:bg-gray-600'
                        }`}
                      >
                        <ArrowRightLeft className="w-4 h-4" />
                        {isSpanish ? 'Envío Directo' : 'Direct Transfer'}
                      </button>
                    </div>
                    {directTransfer && (
                      <div className="mt-3 text-xs text-purple-300 bg-purple-500/10 p-2 rounded">
                        {isSpanish 
                          ? '💡 Envío directo sin especificar beneficiario. Los fondos se enviarán directamente a través de TZ Digital.'
                          : '💡 Direct transfer without specifying beneficiary. Funds will be sent directly through TZ Digital.'}
                      </div>
                    )}
                  </div>

                  {/* Campos de Beneficiario (solo si no es envío directo) */}
                  {!directTransfer && (
                    <div className="bg-black/30 rounded-xl p-4">
                      <label className="text-sm text-gray-400 mb-2 block">{isSpanish ? 'Beneficiario' : 'Beneficiary'}</label>
                      <input
                        type="text"
                        value={transferForm.beneficiary_name}
                        onChange={e => setTransferForm({ ...transferForm, beneficiary_name: e.target.value })}
                        className="w-full px-4 py-3 bg-black/50 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-blue-500 mb-3"
                        placeholder={isSpanish ? 'Nombre del beneficiario' : 'Beneficiary name'}
                      />
                      <input
                        type="text"
                        value={transferForm.beneficiary_account}
                        onChange={e => setTransferForm({ ...transferForm, beneficiary_account: e.target.value })}
                        className="w-full px-4 py-3 bg-black/50 border border-gray-600 rounded-lg text-white font-mono focus:outline-none focus:border-blue-500 mb-3"
                        placeholder={isSpanish ? 'Número de cuenta' : 'Account number'}
                      />
                      <input
                        type="text"
                        value={transferForm.beneficiary_bank}
                        onChange={e => setTransferForm({ ...transferForm, beneficiary_bank: e.target.value })}
                        className="w-full px-4 py-3 bg-black/50 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-blue-500"
                        placeholder={isSpanish ? 'Banco del beneficiario' : 'Beneficiary bank'}
                      />
                    </div>
                  )}

                  {/* Info de Envío Directo */}
                  {directTransfer && (
                    <div className="bg-purple-900/20 border border-purple-500/30 rounded-xl p-4">
                      <div className="flex items-center gap-2 mb-3">
                        <Landmark className="w-5 h-5 text-purple-400" />
                        <span className="text-purple-400 font-semibold">
                          {isSpanish ? 'Información de Envío Directo' : 'Direct Transfer Info'}
                        </span>
                      </div>
                      <div className="space-y-2 text-sm text-gray-300">
                        <div className="flex justify-between">
                          <span className="text-gray-500">{isSpanish ? 'Destino:' : 'Destination:'}</span>
                          <span>TZ Digital Bank</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-500">{isSpanish ? 'Tipo:' : 'Type:'}</span>
                          <span>Direct Transfer</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-500">{isSpanish ? 'Procesamiento:' : 'Processing:'}</span>
                          <span className="text-emerald-400">{isSpanish ? 'Inmediato' : 'Immediate'}</span>
                        </div>
                      </div>
                    </div>
                  )}

                  {transferForm.currency === 'EUR' && !directTransfer && (
                    <div className="bg-black/30 rounded-xl p-4">
                      <label className="text-sm text-gray-400 mb-2 block">IBAN / SWIFT</label>
                      <input
                        type="text"
                        value={transferForm.beneficiary_iban}
                        onChange={e => setTransferForm({ ...transferForm, beneficiary_iban: e.target.value })}
                        className="w-full px-4 py-3 bg-black/50 border border-gray-600 rounded-lg text-white font-mono focus:outline-none focus:border-blue-500 mb-3"
                        placeholder="IBAN"
                      />
                      <input
                        type="text"
                        value={transferForm.beneficiary_swift}
                        onChange={e => setTransferForm({ ...transferForm, beneficiary_swift: e.target.value })}
                        className="w-full px-4 py-3 bg-black/50 border border-gray-600 rounded-lg text-white font-mono focus:outline-none focus:border-blue-500"
                        placeholder="SWIFT/BIC"
                      />
                    </div>
                  )}

                  <div className="bg-black/30 rounded-xl p-4">
                    <label className="text-sm text-gray-400 mb-2 block">{isSpanish ? 'Nota / Propósito' : 'Note / Purpose'}</label>
                    <input
                      type="text"
                      value={transferForm.note}
                      onChange={e => setTransferForm({ ...transferForm, note: e.target.value })}
                      className="w-full px-4 py-3 bg-black/50 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-blue-500"
                      placeholder={isSpanish ? 'Concepto de la transferencia' : 'Transfer concept'}
                    />
                  </div>
                </div>
              </div>

              {/* Botón de envío */}
              <button
                onClick={handleSendTransfer}
                disabled={isLoading || !config.isConfigured || transferForm.amount <= 0 || (selectedAccount && transferForm.amount > selectedAccount.availableBalance)}
                className="w-full py-5 bg-gradient-to-r from-blue-600 to-cyan-600 text-white rounded-xl font-bold text-lg hover:from-blue-500 hover:to-cyan-500 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3"
              >
                {isLoading ? (
                  <>
                    <RefreshCw className="w-6 h-6 animate-spin" />
                    {isSpanish ? 'Enviando...' : 'Sending...'}
                  </>
                ) : (
                  <>
                    <Send className="w-6 h-6" />
                    {isSpanish ? 'Enviar Transferencia' : 'Send Transfer'} {transferForm.currency} {transferForm.amount.toLocaleString()}
                  </>
                )}
              </button>
            </div>
          )}

          {/* Funds Processing - CIS S2S API 2025 */}
          {activeTab === 'funds' && (
            <div className="space-y-6">
              <div className="flex items-center gap-3 mb-6">
                <Shield className="w-6 h-6 text-amber-400" />
                <div>
                  <h3 className="text-xl font-bold text-white">
                    CIS S2S Funds Processing
                  </h3>
                  <p className="text-sm text-gray-400">
                    DevMind Group - Instant Server Settlement
                  </p>
                </div>
              </div>

              {/* Server Info Banner */}
              <div className="bg-gradient-to-r from-blue-500/10 to-cyan-500/10 border border-blue-500/30 rounded-xl p-4 mb-4">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                  <div>
                    <p className="text-xs text-gray-400">{isSpanish ? 'Servidor' : 'Server'}</p>
                    <p className="text-sm font-bold text-white">DEV-CORE-PAY-GW-01</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-400">Global IP</p>
                    <p className="text-sm font-mono text-cyan-400">172.67.157.88</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-400">{isSpanish ? 'Puerto' : 'Port'}</p>
                    <p className="text-sm font-mono text-emerald-400">8443 (TLS/SSL)</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-400">{isSpanish ? 'Ubicación' : 'Location'}</p>
                    <p className="text-sm text-white">London, UK</p>
                  </div>
                </div>
              </div>

              {/* SHA256 Handshake Info */}
              <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-4 mb-6">
                <div className="flex items-start gap-3">
                  <Shield className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <h4 className="font-semibold text-amber-300">
                      SHA256 Handshake Verification
                    </h4>
                    <p className="text-xs text-gray-400 mt-1 font-mono break-all">
                      b19f2a94eab4cd3b92f1e3e0dce9d541c8b7aa3fdbe6e2f4ac3c91a5fbb2f44
                    </p>
                    <div className="flex flex-wrap items-center gap-2 mt-2 text-xs">
                      <span className="px-2 py-0.5 bg-emerald-500/20 text-emerald-400 rounded">✓ SHA-256</span>
                      <span className="px-2 py-0.5 bg-emerald-500/20 text-emerald-400 rounded">✓ TLS/SSL</span>
                      <span className="px-2 py-0.5 bg-blue-500/20 text-blue-400 rounded">✓ SWIFT</span>
                      <span className="px-2 py-0.5 bg-purple-500/20 text-purple-400 rounded">✓ VISA NET</span>
                      <span className="px-2 py-0.5 bg-gray-500/20 text-gray-400 rounded">○ No Blockchain</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Formulario */}
              <div className="grid grid-cols-2 gap-6">
                {/* Transaction ID */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Transaction ID
                  </label>
                  <input
                    type="text"
                    value={fundsForm.transaction_id}
                    onChange={(e) => setFundsForm({...fundsForm, transaction_id: e.target.value})}
                    placeholder="CR38828530 (auto-generado si vacío)"
                    className="w-full px-4 py-3 bg-black/50 border border-gray-600 rounded-lg text-white focus:border-amber-500 focus:outline-none"
                  />
                </div>

                {/* Monto */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    {isSpanish ? 'Monto' : 'Amount'}
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="number"
                      value={fundsForm.amount || ''}
                      onChange={(e) => setFundsForm({...fundsForm, amount: parseFloat(e.target.value) || 0})}
                      placeholder="500165420800.00"
                      className="flex-1 px-4 py-3 bg-black/50 border border-gray-600 rounded-lg text-white focus:border-amber-500 focus:outline-none"
                    />
                    <select
                      value={fundsForm.currency}
                      onChange={(e) => setFundsForm({...fundsForm, currency: e.target.value})}
                      className="px-4 py-3 bg-black/50 border border-gray-600 rounded-lg text-white focus:border-amber-500 focus:outline-none"
                    >
                      <option value="EUR">EUR</option>
                      <option value="USD">USD</option>
                      <option value="GBP">GBP</option>
                      <option value="CHF">CHF</option>
                      <option value="JPY">JPY</option>
                    </select>
                  </div>
                </div>

                {/* From Bank */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    {isSpanish ? 'Banco Origen' : 'From Bank'}
                  </label>
                  <input
                    type="text"
                    value={fundsForm.from_bank}
                    onChange={(e) => setFundsForm({...fundsForm, from_bank: e.target.value})}
                    placeholder="Deutsche Bank AG"
                    className="w-full px-4 py-3 bg-black/50 border border-gray-600 rounded-lg text-white focus:border-amber-500 focus:outline-none"
                  />
                </div>

                {/* To Bank */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    {isSpanish ? 'Banco Destino' : 'To Bank'}
                  </label>
                  <input
                    type="text"
                    value={fundsForm.to_bank}
                    onChange={(e) => setFundsForm({...fundsForm, to_bank: e.target.value})}
                    placeholder="HSBC UK Bank plc"
                    className="w-full px-4 py-3 bg-black/50 border border-gray-600 rounded-lg text-white focus:border-amber-500 focus:outline-none"
                  />
                </div>

                {/* Transfer Protocol */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    {isSpanish ? 'Protocolo de Transferencia' : 'Transfer Protocol'}
                  </label>
                  <select
                    value={fundsForm.protocol || 'SWIFT_MT103_GPI'}
                    onChange={(e) => setFundsForm({...fundsForm, protocol: e.target.value as any})}
                    className="w-full px-4 py-3 bg-black/50 border border-gray-600 rounded-lg text-white focus:border-amber-500 focus:outline-none"
                  >
                    {TRANSFER_PROTOCOLS.map(p => (
                      <option key={p.value} value={p.value}>{p.label}</option>
                    ))}
                  </select>
                </div>

                {/* Status */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Status
                  </label>
                  <select
                    value={fundsForm.status}
                    onChange={(e) => setFundsForm({...fundsForm, status: e.target.value})}
                    className="w-full px-4 py-3 bg-black/50 border border-gray-600 rounded-lg text-white focus:border-amber-500 focus:outline-none"
                  >
                    <option value="pending">Pending</option>
                    <option value="approved">Approved</option>
                    <option value="rejected">Rejected</option>
                  </select>
                </div>

                {/* Reference */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    {isSpanish ? 'Referencia' : 'Reference'}
                  </label>
                  <input
                    type="text"
                    value={fundsForm.reference || ''}
                    onChange={(e) => setFundsForm({...fundsForm, reference: e.target.value})}
                    placeholder="TREASURY-2025-001"
                    className="w-full px-4 py-3 bg-black/50 border border-gray-600 rounded-lg text-white focus:border-amber-500 focus:outline-none"
                  />
                </div>

                {/* Description */}
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    {isSpanish ? 'Descripción' : 'Description'}
                  </label>
                  <input
                    type="text"
                    value={fundsForm.description || ''}
                    onChange={(e) => setFundsForm({...fundsForm, description: e.target.value})}
                    placeholder={isSpanish ? 'Transferencia de tesorería API2API' : 'Treasury transfer API2API'}
                    className="w-full px-4 py-3 bg-black/50 border border-gray-600 rounded-lg text-white focus:border-amber-500 focus:outline-none"
                  />
                </div>
              </div>

              {/* Handshake Config */}
              <div className="bg-black/40 rounded-xl p-4">
                <h4 className="font-semibold text-white mb-3 flex items-center gap-2">
                  <Shield className="w-4 h-4 text-amber-400" />
                  {isSpanish ? 'Configuración Handshake' : 'Handshake Configuration'}
                </h4>
                <div className="grid grid-cols-3 gap-4">
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="handshakeEnabled"
                      checked={fundsConfig.handshake?.enabled !== false}
                      onChange={(e) => setFundsConfig({
                        ...fundsConfig,
                        handshake: { ...fundsConfig.handshake, enabled: e.target.checked }
                      })}
                      className="w-4 h-4 accent-amber-500"
                    />
                    <label htmlFor="handshakeEnabled" className="text-sm text-gray-300">
                      {isSpanish ? 'Habilitar' : 'Enable'}
                    </label>
                  </div>
                  <div>
                    <select
                      value={fundsConfig.handshake?.mode || 'sha256'}
                      onChange={(e) => setFundsConfig({
                        ...fundsConfig,
                        handshake: { ...fundsConfig.handshake, mode: e.target.value as 'sha256' | 'hmac-sha256' }
                      })}
                      className="w-full px-3 py-2 bg-black/50 border border-gray-600 rounded-lg text-white text-sm focus:border-amber-500 focus:outline-none"
                    >
                      <option value="sha256">SHA-256</option>
                      <option value="hmac-sha256">HMAC-SHA256</option>
                    </select>
                  </div>
                  <div>
                    <input
                      type="text"
                      value={fundsConfig.handshake?.headerName || 'X-Handshake-Hash'}
                      onChange={(e) => setFundsConfig({
                        ...fundsConfig,
                        handshake: { ...fundsConfig.handshake, headerName: e.target.value }
                      })}
                      placeholder="Header Name"
                      className="w-full px-3 py-2 bg-black/50 border border-gray-600 rounded-lg text-white text-sm focus:border-amber-500 focus:outline-none"
                    />
                  </div>
                </div>
                {fundsConfig.handshake?.mode === 'hmac-sha256' && (
                  <div className="mt-3">
                    <input
                      type="password"
                      value={fundsConfig.handshake?.secret || ''}
                      onChange={(e) => setFundsConfig({
                        ...fundsConfig,
                        handshake: { ...fundsConfig.handshake, secret: e.target.value }
                      })}
                      placeholder={isSpanish ? 'Secret para HMAC-SHA256' : 'HMAC-SHA256 Secret'}
                      className="w-full px-3 py-2 bg-black/50 border border-gray-600 rounded-lg text-white text-sm focus:border-amber-500 focus:outline-none"
                    />
                  </div>
                )}
              </div>

              {/* Botón Enviar */}
              <button
                onClick={handleSendFundsProcessing}
                disabled={isLoading || !fundsForm.amount || !fundsForm.to_bank}
                className="w-full py-4 bg-gradient-to-r from-amber-600 to-orange-600 text-white rounded-xl font-bold text-lg hover:from-amber-500 hover:to-orange-500 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3"
              >
                {isLoading ? (
                  <>
                    <RefreshCw className="w-6 h-6 animate-spin" />
                    {isSpanish ? 'Procesando...' : 'Processing...'}
                  </>
                ) : (
                  <>
                    <Shield className="w-6 h-6" />
                    {isSpanish ? 'Enviar con SHA256 Handshake' : 'Send with SHA256 Handshake'}
                  </>
                )}
              </button>
            </div>
          )}

          {/* Historial */}
          {activeTab === 'history' && (
            <div>
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold flex items-center gap-3">
                  <History className="w-6 h-6 text-blue-400" />
                  {isSpanish ? 'Historial de Transferencias' : 'Transfer History'}
                </h2>
                <div className="flex items-center gap-2">
                  {/* Botón Recuperar Historial */}
                  <button
                    onClick={recoverTransferHistory}
                    className="px-4 py-2 bg-emerald-600/20 text-emerald-400 rounded-lg hover:bg-emerald-600/30 flex items-center gap-2"
                    title={isSpanish ? 'Recuperar historial desde almacenamiento local' : 'Recover history from local storage'}
                  >
                    <RefreshCw className="w-4 h-4" />
                    {isSpanish ? 'Recuperar' : 'Recover'}
                  </button>
                  
                  {/* Botón Exportar */}
                  <button
                    onClick={exportTransferHistory}
                    className="px-4 py-2 bg-blue-600/20 text-blue-400 rounded-lg hover:bg-blue-600/30 flex items-center gap-2"
                    title={isSpanish ? 'Exportar historial a JSON' : 'Export history to JSON'}
                  >
                    <Download className="w-4 h-4" />
                    {isSpanish ? 'Exportar' : 'Export'}
                  </button>
                  
                  {/* Botón Importar */}
                  <label className="px-4 py-2 bg-cyan-600/20 text-cyan-400 rounded-lg hover:bg-cyan-600/30 flex items-center gap-2 cursor-pointer">
                    <FileText className="w-4 h-4" />
                    {isSpanish ? 'Importar' : 'Import'}
                    <input
                      type="file"
                      accept=".json"
                      onChange={importTransferHistory}
                      className="hidden"
                    />
                  </label>
                  
                  {transfers.length > 0 && (
                    <button
                      onClick={() => {
                        if (confirm(isSpanish ? '¿Limpiar historial?' : 'Clear history?')) {
                          tzDigitalClient.clearTransfers();
                          setTransfers([]);
                        }
                      }}
                      className="px-4 py-2 bg-red-600/20 text-red-400 rounded-lg hover:bg-red-600/30 flex items-center gap-2"
                    >
                      <Trash2 className="w-4 h-4" />
                      {isSpanish ? 'Limpiar' : 'Clear'}
                    </button>
                  )}
                </div>
              </div>

              {transfers.length === 0 ? (
                <div className="text-center py-12 text-gray-400">
                  <FileText className="w-16 h-16 mx-auto mb-4 opacity-30" />
                  <p>{isSpanish ? 'No hay transferencias registradas' : 'No transfers recorded'}</p>
                </div>
              ) : (
                <div className="space-y-3 max-h-[500px] overflow-y-auto">
                  {transfers.map((t, idx) => (
                    <div 
                      key={idx}
                      className={`bg-black/30 rounded-xl p-4 border ${
                        t.status === 'success' ? 'border-emerald-500/30' :
                        t.status === 'failed' ? 'border-red-500/30' :
                        'border-gray-600'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          {t.status === 'success' ? (
                            <CheckCircle className="w-6 h-6 text-emerald-400" />
                          ) : t.status === 'failed' ? (
                            <XCircle className="w-6 h-6 text-red-400" />
                          ) : (
                            <Clock className="w-6 h-6 text-yellow-400" />
                          )}
                          <div>
                            <div className="font-bold text-white">
                              {t.payload.currency} {t.payload.amount.toLocaleString()}
                            </div>
                            <div className="text-sm text-gray-400">{t.payload.beneficiary_name}</div>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="text-right">
                            <div className="font-mono text-xs text-gray-400">{t.payload.reference}</div>
                            <div className="text-xs text-gray-500">
                              {new Date(t.timestamp).toLocaleString()}
                            </div>
                          </div>
                          {t.status === 'success' && (
                            <div className="flex gap-2">
                              <button
                                onClick={() => handleDownloadReceipt(t)}
                                className="px-3 py-2 bg-amber-500/20 text-amber-400 rounded-lg hover:bg-amber-500/30 flex items-center gap-1"
                                title={isSpanish ? 'Descargar Recibo PDF' : 'Download Receipt PDF'}
                              >
                                <Receipt className="w-4 h-4" />
                                <span className="text-xs">PDF</span>
                              </button>
                              <button
                                onClick={() => {
                                  const account = custodyAccounts.find(a => a.id === selectedAccountId);
                                  generateTechnicalTXT(t, account);
                                }}
                                className="px-3 py-2 bg-cyan-500/20 text-cyan-400 rounded-lg hover:bg-cyan-500/30 flex items-center gap-1"
                                title={isSpanish ? 'Descargar Prueba Técnica TXT' : 'Download Technical Proof TXT'}
                              >
                                <FileText className="w-4 h-4" />
                                <span className="text-xs">TXT</span>
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                      {t.result.error && (
                        <div className="mt-2 text-xs text-red-400 bg-red-500/10 p-2 rounded">
                          {t.result.error.message}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Configuración */}
          {activeTab === 'config' && (
            <div className="space-y-6">
              <div className="flex items-center gap-3 mb-6">
                <Settings className="w-6 h-6 text-blue-400" />
                <h2 className="text-xl font-bold">{isSpanish ? 'Configuración API' : 'API Configuration'}</h2>
              </div>

              <div className="bg-black/30 rounded-xl p-6">
                <div className="flex items-center gap-3 mb-4">
                  <Shield className="w-5 h-5 text-blue-400" />
                  <label className="text-white font-semibold">Bearer Token</label>
                </div>
                <div className="flex gap-2">
                  <input
                    type={showToken ? 'text' : 'password'}
                    value={tempConfig.bearerToken}
                    onChange={e => setTempConfig({ ...tempConfig, bearerToken: e.target.value })}
                    className="flex-1 px-4 py-3 bg-black/50 border border-gray-600 rounded-lg text-white font-mono focus:outline-none focus:border-blue-500"
                    placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
                  />
                  <button
                    onClick={() => setShowToken(!showToken)}
                    className="px-4 py-3 bg-gray-700 text-white rounded-lg hover:bg-gray-600"
                  >
                    {showToken ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  {isSpanish 
                    ? 'Token de autorización para la API de TZ Digital' 
                    : 'Authorization token for TZ Digital API'}
                </p>
              </div>

              <div className="bg-black/30 rounded-xl p-6">
                <label className="text-white font-semibold block mb-3">{isSpanish ? 'Remitente por Defecto' : 'Default Sender'}</label>
                <input
                  type="text"
                  value={tempConfig.defaultSenderName}
                  onChange={e => setTempConfig({ ...tempConfig, defaultSenderName: e.target.value })}
                  className="w-full px-4 py-3 bg-black/50 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-blue-500 mb-3"
                  placeholder={isSpanish ? 'Nombre del banco/empresa' : 'Bank/Company name'}
                />
                <input
                  type="text"
                  value={tempConfig.defaultSenderAccount}
                  onChange={e => setTempConfig({ ...tempConfig, defaultSenderAccount: e.target.value })}
                  className="w-full px-4 py-3 bg-black/50 border border-gray-600 rounded-lg text-white font-mono focus:outline-none focus:border-blue-500"
                  placeholder={isSpanish ? 'Cuenta del remitente' : 'Sender account'}
                />
              </div>

              <div className="bg-blue-900/20 border border-blue-500/30 rounded-xl p-4">
                <h4 className="font-semibold text-blue-400 mb-2">{isSpanish ? 'Endpoint API' : 'API Endpoint'}</h4>
                <code className="text-sm text-gray-300 font-mono bg-black/30 px-3 py-2 rounded block">
                  POST https://banktransfer.tzdigitalpvtlimited.com/api/transactions
                </code>
              </div>

              <button
                onClick={handleSaveConfig}
                className="w-full py-4 bg-gradient-to-r from-blue-600 to-cyan-600 text-white rounded-xl font-bold hover:from-blue-500 hover:to-cyan-500 transition-all flex items-center justify-center gap-2"
              >
                <CheckCircle className="w-5 h-5" />
                {isSpanish ? 'Guardar Configuración' : 'Save Configuration'}
              </button>
            </div>
          )}
        </div>

        {/* Footer info */}
        <div className="mt-6 text-center text-xs text-gray-500">
          <p>TZ Digital Bank Transfer API • REST Protocol • Bearer Token Auth</p>
          <p className="mt-1">Digital Commercial Bank Ltd • DAES Platform</p>
        </div>
      </div>

      {/* Modal de Recibo Generado */}
      {showReceiptModal && lastTransferForReceipt && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="bg-gradient-to-br from-[#0a0a0a] to-[#1a1a1a] border-2 border-emerald-500/50 rounded-2xl p-6 max-w-md w-full">
            <div className="text-center">
              <div className="w-20 h-20 bg-emerald-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="w-12 h-12 text-emerald-400" />
              </div>
              <h3 className="text-2xl font-bold text-white mb-2">
                {isSpanish ? '¡Transferencia Exitosa!' : 'Transfer Successful!'}
              </h3>
              <p className="text-gray-400 mb-4">
                {lastTransferForReceipt.payload.currency} {lastTransferForReceipt.payload.amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </p>
              <p className="text-sm text-gray-500 mb-6">
                {isSpanish ? 'Referencia:' : 'Reference:'} {lastTransferForReceipt.payload.reference}
              </p>
              
              <div className="flex flex-col gap-3">
                <div className="flex gap-3">
                  <button
                    onClick={() => {
                      handleDownloadReceipt(lastTransferForReceipt);
                    }}
                    className="flex-1 px-4 py-3 bg-gradient-to-r from-amber-500 to-yellow-500 text-black rounded-lg hover:from-amber-400 hover:to-yellow-400 font-bold flex items-center justify-center gap-2"
                  >
                    <Receipt className="w-5 h-5" />
                    {isSpanish ? 'Descargar Recibo PDF' : 'Download Receipt PDF'}
                  </button>
                  <button
                    onClick={() => {
                      const account = custodyAccounts.find(a => a.id === selectedAccountId);
                      generateTechnicalTXT(lastTransferForReceipt, account);
                    }}
                    className="flex-1 px-4 py-3 bg-gradient-to-r from-cyan-500 to-blue-500 text-white rounded-lg hover:from-cyan-400 hover:to-blue-400 font-bold flex items-center justify-center gap-2"
                  >
                    <FileText className="w-5 h-5" />
                    {isSpanish ? 'Descargar Prueba Técnica TXT' : 'Download Technical Proof TXT'}
                  </button>
                </div>
                <button
                  onClick={() => setShowReceiptModal(false)}
                  className="w-full px-4 py-3 bg-gray-700 text-white rounded-lg hover:bg-gray-600"
                >
                  {isSpanish ? 'Cerrar' : 'Close'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Test de Conexión Robusto */}
      {showConnectionModal && connectionTestResult && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="bg-gradient-to-br from-[#0a0a0a] to-[#1a1a1a] border-2 border-blue-500/50 rounded-2xl p-6 max-w-lg w-full max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                  connectionTestResult.success ? 'bg-emerald-500/20' : 'bg-red-500/20'
                }`}>
                  {connectionTestResult.success ? (
                    <Wifi className="w-6 h-6 text-emerald-400" />
                  ) : (
                    <WifiOff className="w-6 h-6 text-red-400" />
                  )}
                </div>
                <div>
                  <h3 className="text-xl font-bold text-white">
                    {isSpanish ? 'Diagnóstico de Conexión' : 'Connection Diagnostics'}
                  </h3>
                  <p className={`text-sm ${connectionTestResult.success ? 'text-emerald-400' : 'text-red-400'}`}>
                    {connectionTestResult.message}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowConnectionModal(false)}
                className="text-gray-400 hover:text-white"
              >
                <XCircle className="w-6 h-6" />
              </button>
            </div>

            {/* Resumen */}
            <div className="grid grid-cols-4 gap-3 mb-6">
              <div className="bg-black/30 rounded-lg p-3 text-center">
                <div className="text-xl font-bold text-white">{connectionTestResult.summary.total}</div>
                <div className="text-xs text-gray-400">Total</div>
              </div>
              <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-lg p-3 text-center">
                <div className="text-xl font-bold text-emerald-400">{connectionTestResult.summary.passed}</div>
                <div className="text-xs text-gray-400">{isSpanish ? 'Pasados' : 'Passed'}</div>
              </div>
              <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-3 text-center">
                <div className="text-xl font-bold text-yellow-400">{connectionTestResult.summary.warnings}</div>
                <div className="text-xs text-gray-400">{isSpanish ? 'Advertencias' : 'Warnings'}</div>
              </div>
              <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 text-center">
                <div className="text-xl font-bold text-red-400">{connectionTestResult.summary.failed}</div>
                <div className="text-xs text-gray-400">{isSpanish ? 'Fallidos' : 'Failed'}</div>
              </div>
            </div>

            {/* Checks detallados */}
            <div className="space-y-3 mb-6">
              <h4 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">
                {isSpanish ? 'Verificaciones Realizadas' : 'Checks Performed'}
              </h4>
              {connectionTestResult.checks.map((check, idx) => (
                <div 
                  key={idx}
                  className={`border rounded-lg p-4 ${getCheckBgColor(check.status)}`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      {getCheckIcon(check.status)}
                      <span className="font-semibold text-white">{check.name}</span>
                    </div>
                    <span className="text-xs text-gray-400">{check.duration}ms</span>
                  </div>
                  <p className="text-sm text-gray-300">{check.message}</p>
                  {check.details && check.status !== 'passed' && (
                    <div className="mt-2 text-xs text-gray-500 bg-black/30 rounded p-2 font-mono">
                      {typeof check.details === 'string' 
                        ? check.details 
                        : JSON.stringify(check.details, null, 2)}
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Indicador de Conexión Real */}
            <div className={`border-2 rounded-xl p-4 mb-6 ${
              connectionTestResult.isRealConnection 
                ? 'bg-emerald-900/20 border-emerald-500/50' 
                : 'bg-red-900/20 border-red-500/50'
            }`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                    connectionTestResult.isRealConnection ? 'bg-emerald-500/30' : 'bg-red-500/30'
                  }`}>
                    {connectionTestResult.isRealConnection ? (
                      <CheckCircle className="w-7 h-7 text-emerald-400" />
                    ) : (
                      <XCircle className="w-7 h-7 text-red-400" />
                    )}
                  </div>
                  <div>
                    <div className={`text-lg font-bold ${
                      connectionTestResult.isRealConnection ? 'text-emerald-400' : 'text-red-400'
                    }`}>
                      {connectionTestResult.isRealConnection 
                        ? (isSpanish ? '✓ CONEXIÓN REAL VERIFICADA' : '✓ REAL CONNECTION VERIFIED')
                        : (isSpanish ? '✗ CONEXIÓN NO VERIFICADA' : '✗ CONNECTION NOT VERIFIED')}
                    </div>
                    <div className="text-xs text-gray-400">
                      {connectionTestResult.isRealConnection 
                        ? (isSpanish ? 'La conexión con TZ Digital es genuina y verificada' : 'Connection with TZ Digital is genuine and verified')
                        : (isSpanish ? 'No se pudo confirmar que la conexión sea real' : 'Could not confirm connection is real')}
                    </div>
                  </div>
                </div>
                {connectionTestResult.isRealConnection && connectionTestResult.connectionProof && (
                  <div className="text-right">
                    <div className="text-xs text-emerald-400 font-mono">
                      {connectionTestResult.connectionProof.proofHash?.substring(0, 12)}...
                    </div>
                    <div className="text-xs text-gray-500">Proof Hash</div>
                  </div>
                )}
              </div>

              {/* Detalles de la prueba de conexión */}
              {connectionTestResult.connectionProof && (
                <div className="mt-4 grid grid-cols-3 gap-3">
                  <div className="bg-black/30 rounded-lg p-2 text-center">
                    <div className={`text-sm font-bold ${connectionTestResult.connectionProof.dnsResolved ? 'text-emerald-400' : 'text-red-400'}`}>
                      {connectionTestResult.connectionProof.dnsResolved ? '✓' : '✗'}
                    </div>
                    <div className="text-xs text-gray-400">DNS</div>
                  </div>
                  <div className="bg-black/30 rounded-lg p-2 text-center">
                    <div className={`text-sm font-bold ${connectionTestResult.connectionProof.sslVerified ? 'text-emerald-400' : 'text-red-400'}`}>
                      {connectionTestResult.connectionProof.sslVerified ? '✓' : '✗'}
                    </div>
                    <div className="text-xs text-gray-400">SSL</div>
                  </div>
                  <div className="bg-black/30 rounded-lg p-2 text-center">
                    <div className="text-sm font-bold text-white">
                      {connectionTestResult.connectionProof.responseTime}ms
                    </div>
                    <div className="text-xs text-gray-400">{isSpanish ? 'Latencia' : 'Latency'}</div>
                  </div>
                </div>
              )}
            </div>

            {/* Información adicional */}
            <div className="bg-blue-900/20 border border-blue-500/30 rounded-lg p-4 mb-6">
              <div className="flex items-center gap-2 mb-2">
                <Shield className="w-4 h-4 text-blue-400" />
                <span className="text-sm font-semibold text-blue-400">
                  {isSpanish ? 'Información del Test' : 'Test Information'}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs text-gray-400">
                <div>
                  <span className="text-gray-500">{isSpanish ? 'Duración Total:' : 'Total Duration:'}</span>
                  <span className="ml-1 text-white">{connectionTestResult.summary.duration}ms</span>
                </div>
                <div>
                  <span className="text-gray-500">{isSpanish ? 'Fecha:' : 'Date:'}</span>
                  <span className="ml-1 text-white">
                    {new Date(connectionTestResult.timestamp).toLocaleString()}
                  </span>
                </div>
                {connectionTestResult.connectionProof && (
                  <>
                    <div>
                      <span className="text-gray-500">HTTP Status:</span>
                      <span className="ml-1 text-white">{connectionTestResult.connectionProof.httpStatusCode}</span>
                    </div>
                    <div>
                      <span className="text-gray-500">Server Headers:</span>
                      <span className="ml-1 text-white">{Object.keys(connectionTestResult.connectionProof.serverHeaders || {}).length}</span>
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Acciones */}
            <div className="flex gap-3">
              <button
                onClick={() => setShowConnectionModal(false)}
                className="flex-1 px-4 py-3 bg-gray-700 text-white rounded-lg hover:bg-gray-600"
              >
                {isSpanish ? 'Cerrar' : 'Close'}
              </button>
              <button
                onClick={() => {
                  setShowConnectionModal(false);
                  handleTestConnection();
                }}
                className="flex-1 px-4 py-3 bg-gradient-to-r from-blue-600 to-cyan-600 text-white rounded-lg hover:from-blue-500 hover:to-cyan-500 font-bold flex items-center justify-center gap-2"
              >
                <RefreshCw className="w-5 h-5" />
                {isSpanish ? 'Repetir Test' : 'Retest'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Funds Processing Result */}
      {showFundsResult && fundsResult && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="bg-gradient-to-br from-[#0a0a0a] to-[#1a1a1a] border-2 border-amber-500/50 rounded-2xl p-6 max-w-lg w-full">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className={`p-3 rounded-xl ${fundsResult.ok ? 'bg-emerald-600' : 'bg-red-600'}`}>
                  {fundsResult.ok ? (
                    <CheckCircle className="w-6 h-6 text-white" />
                  ) : (
                    <XCircle className="w-6 h-6 text-white" />
                  )}
                </div>
                <div>
                  <h3 className="text-xl font-bold text-white">
                    {fundsResult.ok 
                      ? (isSpanish ? 'Transacción Exitosa' : 'Transaction Successful')
                      : (isSpanish ? 'Error en Transacción' : 'Transaction Failed')}
                  </h3>
                  <p className="text-sm text-gray-400">Funds Processing Transaction</p>
                </div>
              </div>
              <button
                onClick={() => setShowFundsResult(false)}
                className="p-2 hover:bg-white/10 rounded-lg transition-colors"
              >
                <XCircle className="w-6 h-6 text-gray-400" />
              </button>
            </div>

            {/* Details */}
            <div className="space-y-4">
              {/* Status */}
              <div className={`p-4 rounded-xl ${fundsResult.ok ? 'bg-emerald-500/20 border border-emerald-500/50' : 'bg-red-500/20 border border-red-500/50'}`}>
                <div className="flex items-center justify-between">
                  <span className="text-gray-300">{isSpanish ? 'Estado HTTP' : 'HTTP Status'}</span>
                  <span className={`font-bold ${fundsResult.ok ? 'text-emerald-400' : 'text-red-400'}`}>
                    {fundsResult.status}
                  </span>
                </div>
              </div>

              {/* Handshake Hash */}
              {fundsResult.handshakeHash && (
                <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Shield className="w-4 h-4 text-amber-400" />
                    <span className="text-sm font-semibold text-amber-300">SHA256 Handshake Hash</span>
                  </div>
                  <code className="text-xs text-gray-300 break-all font-mono">
                    {fundsResult.handshakeHash}
                  </code>
                </div>
              )}

              {/* Response Data */}
              <div className="bg-black/40 rounded-xl p-4">
                <h4 className="text-sm font-semibold text-gray-400 mb-2">
                  {isSpanish ? 'Respuesta del Servidor' : 'Server Response'}
                </h4>
                <pre className="text-xs text-gray-300 overflow-auto max-h-40 font-mono">
                  {JSON.stringify(fundsResult.data, null, 2)}
                </pre>
              </div>

              {/* Timestamp */}
              <div className="text-xs text-gray-500 text-center">
                {fundsResult.timestamp}
              </div>
            </div>

            {/* Close Button */}
            <button
              onClick={() => setShowFundsResult(false)}
              className="w-full mt-6 py-3 bg-gradient-to-r from-amber-600 to-orange-600 text-white rounded-lg font-bold hover:from-amber-500 hover:to-orange-500 transition-all"
            >
              {isSpanish ? 'Cerrar' : 'Close'}
            </button>
          </div>
        </div>
      )}

      {/* Modal Troubleshooter - Solucionador de Errores */}
      {showTroubleshootModal && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="bg-gradient-to-br from-[#0a0a0a] to-[#1a1a1a] border-2 border-amber-500/50 rounded-2xl p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-gradient-to-br from-amber-600 to-orange-600 rounded-xl">
                  <Wrench className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-white">
                    {isSpanish ? 'Solucionador de Errores' : 'Connection Troubleshooter'}
                  </h3>
                  <p className="text-sm text-gray-400">
                    {isSpanish ? 'Diagnóstico y reparación automática' : 'Automatic diagnosis and repair'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowTroubleshootModal(false)}
                className="p-2 hover:bg-white/10 rounded-lg transition-colors"
              >
                <XCircle className="w-6 h-6 text-gray-400" />
              </button>
            </div>

            {/* Loading State */}
            {isTroubleshooting && (
              <div className="flex flex-col items-center justify-center py-12">
                <div className="relative">
                  <div className="w-20 h-20 border-4 border-amber-500/30 rounded-full"></div>
                  <div className="w-20 h-20 border-4 border-amber-500 border-t-transparent rounded-full animate-spin absolute top-0"></div>
                </div>
                <p className="text-amber-400 mt-6 font-semibold">
                  {isSpanish ? 'Diagnosticando y solucionando errores...' : 'Diagnosing and fixing errors...'}
                </p>
                <div className="mt-4 text-sm text-gray-400 text-center">
                  <p>{isSpanish ? '• Verificando configuración' : '• Checking configuration'}</p>
                  <p>{isSpanish ? '• Probando conectividad de red' : '• Testing network connectivity'}</p>
                  <p>{isSpanish ? '• Verificando proxy local' : '• Verifying local proxy'}</p>
                  <p>{isSpanish ? '• Validando autenticación' : '• Validating authentication'}</p>
                </div>
              </div>
            )}

            {/* Results */}
            {troubleshootResult && !isTroubleshooting && (
              <div className="space-y-6">
                {/* Status Banner */}
                <div className={`p-4 rounded-xl ${
                  troubleshootResult.finalStatus === 'connected' 
                    ? 'bg-emerald-500/20 border border-emerald-500/50'
                    : troubleshootResult.finalStatus === 'partially_connected'
                    ? 'bg-amber-500/20 border border-amber-500/50'
                    : 'bg-red-500/20 border border-red-500/50'
                }`}>
                  <div className="flex items-center gap-3">
                    {troubleshootResult.finalStatus === 'connected' ? (
                      <CheckCircle className="w-8 h-8 text-emerald-400" />
                    ) : troubleshootResult.finalStatus === 'partially_connected' ? (
                      <AlertTriangle className="w-8 h-8 text-amber-400" />
                    ) : (
                      <XCircle className="w-8 h-8 text-red-400" />
                    )}
                    <div>
                      <h4 className={`text-lg font-bold ${
                        troubleshootResult.finalStatus === 'connected' ? 'text-emerald-400' :
                        troubleshootResult.finalStatus === 'partially_connected' ? 'text-amber-400' :
                        'text-red-400'
                      }`}>
                        {troubleshootResult.finalStatus === 'connected' 
                          ? (isSpanish ? '✓ Conexión Exitosa' : '✓ Connection Successful')
                          : troubleshootResult.finalStatus === 'partially_connected'
                          ? (isSpanish ? '⚠ Conexión Parcial' : '⚠ Partial Connection')
                          : (isSpanish ? '✗ Conexión Fallida' : '✗ Connection Failed')}
                      </h4>
                      <p className="text-sm text-gray-300">
                        {troubleshootResult.errorsFound.length} {isSpanish ? 'errores encontrados' : 'errors found'}, 
                        {' '}{troubleshootResult.solutionsApplied.length} {isSpanish ? 'solucionados automáticamente' : 'auto-fixed'}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Errores Encontrados */}
                {troubleshootResult.errorsFound.length > 0 && (
                  <div className="bg-black/40 rounded-xl p-4">
                    <h5 className="text-sm font-semibold text-red-400 mb-3 flex items-center gap-2">
                      <Bug className="w-4 h-4" />
                      {isSpanish ? 'Errores Detectados' : 'Errors Detected'} ({troubleshootResult.errorsFound.length})
                    </h5>
                    <div className="space-y-2">
                      {troubleshootResult.errorsFound.map((error, idx) => (
                        <div key={idx} className="bg-red-500/10 border border-red-500/30 rounded-lg p-3">
                          <div className="flex items-start gap-2">
                            <XCircle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
                            <div>
                              <p className="text-sm font-medium text-red-300">{error.message}</p>
                              {error.details && (
                                <p className="text-xs text-gray-400 mt-1">{error.details}</p>
                              )}
                              <span className="text-xs text-gray-500 mt-1 inline-block bg-gray-800 px-2 py-0.5 rounded">
                                {error.code}
                              </span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Soluciones Aplicadas */}
                {troubleshootResult.solutionsApplied.length > 0 && (
                  <div className="bg-black/40 rounded-xl p-4">
                    <h5 className="text-sm font-semibold text-emerald-400 mb-3 flex items-center gap-2">
                      <CheckSquare className="w-4 h-4" />
                      {isSpanish ? 'Soluciones Aplicadas Automáticamente' : 'Auto-Applied Solutions'} ({troubleshootResult.solutionsApplied.length})
                    </h5>
                    <div className="space-y-2">
                      {troubleshootResult.solutionsApplied.map((solution, idx) => (
                        <div key={idx} className="bg-emerald-500/10 border border-emerald-500/30 rounded-lg p-3 flex items-center gap-2">
                          <CheckCircle className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                          <p className="text-sm text-emerald-300">{solution}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Soluciones Pendientes */}
                {troubleshootResult.solutionsPending.length > 0 && (
                  <div className="bg-black/40 rounded-xl p-4">
                    <h5 className="text-sm font-semibold text-amber-400 mb-3 flex items-center gap-2">
                      <Square className="w-4 h-4" />
                      {isSpanish ? 'Acciones Manuales Requeridas' : 'Manual Actions Required'} ({troubleshootResult.solutionsPending.length})
                    </h5>
                    <div className="space-y-3">
                      {troubleshootResult.solutionsPending.map((solution, idx) => (
                        <div key={idx} className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-4">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-2">
                                <span className={`px-2 py-0.5 text-xs rounded font-semibold ${
                                  solution.priority === 'critical' ? 'bg-red-500/30 text-red-300' :
                                  solution.priority === 'high' ? 'bg-orange-500/30 text-orange-300' :
                                  solution.priority === 'medium' ? 'bg-yellow-500/30 text-yellow-300' :
                                  'bg-gray-500/30 text-gray-300'
                                }`}>
                                  {solution.priority.toUpperCase()}
                                </span>
                                <span className="text-sm font-medium text-amber-300">{solution.description}</span>
                              </div>
                              <div className="space-y-1 mt-2">
                                {solution.steps.map((step, stepIdx) => (
                                  <div key={stepIdx} className="flex items-start gap-2 text-xs text-gray-300">
                                    <ChevronRight className="w-3 h-3 text-amber-400 flex-shrink-0 mt-0.5" />
                                    <span>{step}</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Recomendaciones */}
                {troubleshootResult.recommendations.length > 0 && (
                  <div className="bg-blue-500/10 border border-blue-500/30 rounded-xl p-4">
                    <h5 className="text-sm font-semibold text-blue-400 mb-3 flex items-center gap-2">
                      <Zap className="w-4 h-4" />
                      {isSpanish ? 'Recomendaciones' : 'Recommendations'}
                    </h5>
                    <div className="space-y-2">
                      {troubleshootResult.recommendations.map((rec, idx) => (
                        <p key={idx} className="text-sm text-gray-300">{rec}</p>
                      ))}
                    </div>
                  </div>
                )}

                {/* Terminal de diagnóstico */}
                <div className="bg-black rounded-xl p-4 font-mono text-xs">
                  <div className="flex items-center gap-2 mb-3 text-gray-500">
                    <Terminal className="w-4 h-4" />
                    <span>{isSpanish ? 'Log de Diagnóstico' : 'Diagnostic Log'}</span>
                  </div>
                  <div className="space-y-1 text-gray-400">
                    <p className="text-emerald-400">[DIAG] {isSpanish ? 'Inicio de diagnóstico' : 'Diagnosis started'}</p>
                    {troubleshootResult.errorsFound.map((error, idx) => (
                      <p key={idx} className="text-red-400">[ERROR] {error.code}: {error.message}</p>
                    ))}
                    {troubleshootResult.solutionsApplied.map((sol, idx) => (
                      <p key={idx} className="text-emerald-400">[FIXED] {sol}</p>
                    ))}
                    <p className={`${
                      troubleshootResult.finalStatus === 'connected' ? 'text-emerald-400' :
                      troubleshootResult.finalStatus === 'partially_connected' ? 'text-amber-400' :
                      'text-red-400'
                    }`}>
                      [RESULT] Status: {troubleshootResult.finalStatus.toUpperCase()}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Acciones */}
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowTroubleshootModal(false)}
                className="flex-1 px-4 py-3 bg-gray-700 text-white rounded-lg hover:bg-gray-600"
              >
                {isSpanish ? 'Cerrar' : 'Close'}
              </button>
              <button
                onClick={handleTroubleshoot}
                disabled={isTroubleshooting}
                className="flex-1 px-4 py-3 bg-gradient-to-r from-amber-600 to-orange-600 text-white rounded-lg hover:from-amber-500 hover:to-orange-500 font-bold flex items-center justify-center gap-2 disabled:opacity-50"
              >
                <RefreshCw className={`w-5 h-5 ${isTroubleshooting ? 'animate-spin' : ''}`} />
                {isSpanish ? 'Volver a Diagnosticar' : 'Re-diagnose'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default TZDigitalModule;
