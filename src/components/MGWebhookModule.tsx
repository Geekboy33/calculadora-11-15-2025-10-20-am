/**
 * MG Webhook Module - DAES CoreBanking
 * Módulo para enviar transferencias desde DAES hacia MG Productive Investments
 * 
 * Banco Emisor: Digital Commercial Bank Ltd (DCB)
 * Core Bancario: DAES (Digital Asset Exchange & Settlement)
 * Banco Receptor: MG Productive Investments
 */

import { useState, useEffect } from 'react';
import {
  Send,
  CheckCircle,
  XCircle,
  AlertCircle,
  Clock,
  RefreshCw,
  Settings,
  Globe,
  DollarSign,
  FileText,
  Copy,
  ExternalLink,
  Download,
  Wallet,
  Mail,
  Activity,
  Zap,
  Building2
} from 'lucide-react';
import { useLanguage } from '../lib/i18n';
import { sendTransferToMG, MgTransferParams, MgWebhookResponse } from '../services/mgWebhookService';
import { BankingCard, BankingHeader, BankingButton, BankingSection, BankingInput, BankingBadge } from './ui/BankingComponents';
import { useBankingTheme } from '../hooks/useBankingTheme';
import { custodyStore, type CustodyAccount } from '../lib/custody-store';
import { downloadTXT } from '../lib/download-helper';

interface TransferHistory {
  id: string;
  transferRequestId: string;
  amount: string;
  currency: string;
  receivingAccount: string;
  sendingName: string;
  status: 'PENDING' | 'SENT' | 'SUCCESS' | 'FAILED';
  response?: MgWebhookResponse;
  error?: string;
  timestamp: string;
  // Información de cuenta custodio
  custodyAccountId?: string;
  custodyAccountName?: string;
  custodyAccountBalance?: number;
}

export function MGWebhookModule() {
  const { t, language } = useLanguage();
  const isSpanish = language === 'es';
  const { fmt } = useBankingTheme();

  // Vista activa
  const [selectedView, setSelectedView] = useState<'overview' | 'transfer' | 'history'>('overview');

  // Estado del formulario
  const [transferForm, setTransferForm] = useState<MgTransferParams>({
    transferRequestId: '',
    amount: '',
    receivingCurrency: 'USD',
    receivingAccount: '',
    sendingName: 'Digital Commercial Bank Ltd'
  });

  // Estado de la aplicación
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [lastResponse, setLastResponse] = useState<MgWebhookResponse | null>(null);

  // Historial de transferencias
  const [transferHistory, setTransferHistory] = useState<TransferHistory[]>(() => {
    const saved = localStorage.getItem('mg_webhook_transfer_history');
    return saved ? JSON.parse(saved) : [];
  });

  // Configuración del webhook
  const [webhookUrl, setWebhookUrl] = useState(() => {
    const saved = localStorage.getItem('mg_webhook_url');
    return saved || 'http://localhost:8787/api/mg-webhook/transfer → https://api.mgproductiveinvestments.com/webhook/dcb/transfer';
  });

  const [showConfig, setShowConfig] = useState(false);

  // API Connection status
  const [apiStatus, setApiStatus] = useState<'checking' | 'connected' | 'error'>('checking');
  const [testingConnection, setTestingConnection] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);

  // Cuentas custodio
  const [custodyAccounts, setCustodyAccounts] = useState<CustodyAccount[]>([]);
  const [selectedCustodyAccount, setSelectedCustodyAccount] = useState<string>('');

  // Email configuration
  const [emailConfig, setEmailConfig] = useState({
    recipientEmail: '',
    sendEmailOnSuccess: false
  });

  // Stats
  const [stats, setStats] = useState({
    total_sent: 0,
    successful_transfers: 0,
    pending_transfers: 0,
    failed_transfers: 0
  });

  // Cargar cuentas custodio
  useEffect(() => {
    const loadCustodyAccounts = () => {
      const accounts = custodyStore.getAccounts();
      // Solo cuentas bancarias
      const bankingAccounts = accounts.filter(a => 
        a && a.accountType === 'banking'
      );
      setCustodyAccounts(bankingAccounts);
      console.log('[MG Webhook] 📊 Cuentas custodio cargadas:', bankingAccounts.length);
    };

    loadCustodyAccounts();
    const unsubscribe = custodyStore.subscribe((newAccounts) => {
      const banking = newAccounts.filter(a => a.accountType === 'banking');
      setCustodyAccounts(banking);
    });

    return () => unsubscribe();
  }, []);

  // Guardar historial automáticamente
  useEffect(() => {
    localStorage.setItem('mg_webhook_transfer_history', JSON.stringify(transferHistory));
    updateStats();
  }, [transferHistory]);

  // Actualizar estadísticas
  const updateStats = () => {
    const successful = transferHistory.filter(t => t.status === 'SUCCESS').length;
    const pending = transferHistory.filter(t => t.status === 'PENDING').length;
    const failed = transferHistory.filter(t => t.status === 'FAILED').length;
    const total = transferHistory.reduce((sum, t) => 
      t.status === 'SUCCESS' ? sum + parseFloat(t.amount) : sum, 0
    );

    setStats({
      total_sent: total,
      successful_transfers: successful,
      pending_transfers: pending,
      failed_transfers: failed
    });
  };

  // Test de conexión con MG
  const testConnection = async () => {
    setTestingConnection(true);
    setApiStatus('checking');
    setError(null);
    setConnectionError(null);

    try {
      console.log('[MG Webhook] 🔍 Testing connection to MG Productive Investments...');
      console.log('[MG Webhook] URL:', 'https://api.mgproductiveinvestments.com/webhook/dcb/transfer');

      const testParams: MgTransferParams = {
        transferRequestId: `TEST-${Date.now()}`,
        amount: '0.01',
        receivingCurrency: 'USD',
        receivingAccount: 'TEST-000',
        sendingName: 'API_CONNECTION_TEST',
        dateTime: new Date().toISOString()
      };

      console.log('[MG Webhook] Test payload:', testParams);

      const response = await sendTransferToMG(testParams);

      setApiStatus('connected');
      setConnectionError(null);
      setSuccess(isSpanish 
        ? '✅ Conexión exitosa con MG Productive Investments'
        : '✅ Successfully connected to MG Productive Investments');
      console.log('[MG Webhook] ✅ Connection test PASSED');
      console.log('[MG Webhook] Response:', response);
    } catch (err) {
      setApiStatus('error');
      const errorMessage = err instanceof Error ? err.message : String(err);
      setConnectionError(errorMessage);
      setError(isSpanish 
        ? `Error de conexión`
        : `Connection error`);
      console.error('[MG Webhook] ❌ Connection test FAILED');
      console.error('[MG Webhook] Error details:', err);
    } finally {
      setTestingConnection(false);
    }
  };

  // Generar TransferRequestID automáticamente
  const generateTransferRequestId = () => {
    const timestamp = new Date().toISOString().replace(/[-:]/g, '').split('.')[0];
    const random = Math.random().toString(36).substring(2, 8).toUpperCase();
    return `MG-${timestamp}-${random}`;
  };

  // Generar recibo en formato TXT
  const generateReceipt = (transfer: TransferHistory, response?: MgWebhookResponse): string => {
    const date = new Date(transfer.timestamp);
    const formattedDate = date.toLocaleString(isSpanish ? 'es-ES' : 'en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });

    const receiptContent = `
═══════════════════════════════════════════════════════════════════════════════
                    DIGITAL COMMERCIAL BANK LTD / DAES
                    ${isSpanish ? 'RECIBO DE TRANSFERENCIA MG WEBHOOK' : 'MG WEBHOOK TRANSFER RECEIPT'}
                              MG Productive Investments
═══════════════════════════════════════════════════════════════════════════════

${isSpanish ? 'INFORMACIÓN DE LA TRANSFERENCIA' : 'TRANSFER INFORMATION'}
═══════════════════════════════════════════════════════════════════════════════

${isSpanish ? 'TransferRequestID:' : 'TransferRequestID:'}        ${transfer.transferRequestId}
${isSpanish ? 'Estado:' : 'Status:'}                            ${transfer.status}
${isSpanish ? 'Fecha y Hora:' : 'Date and Time:'}               ${formattedDate}

${isSpanish ? 'DETALLES FINANCIEROS' : 'FINANCIAL DETAILS'}
═══════════════════════════════════════════════════════════════════════════════

${isSpanish ? 'Monto Transferido:' : 'Amount Transferred:'}     ${fmt.currency(parseFloat(transfer.amount), transfer.currency)}
${isSpanish ? 'Moneda:' : 'Currency:'}                          ${transfer.currency}
${isSpanish ? 'Nombre del Remitente:' : 'Sender Name:'}         ${transfer.sendingName}

${isSpanish ? 'INFORMACIÓN DEL DESTINO' : 'DESTINATION INFORMATION'}
═══════════════════════════════════════════════════════════════════════════════

${isSpanish ? 'Banco Receptor:' : 'Receiving Bank:'}            MG Productive Investments
${isSpanish ? 'Cuenta Receptora:' : 'Receiving Account:'}       ${transfer.receivingAccount}

${transfer.custodyAccountId ? `
${isSpanish ? 'INFORMACIÓN DE CUENTA CUSTODIO' : 'CUSTODY ACCOUNT INFORMATION'}
═══════════════════════════════════════════════════════════════════════════════

${isSpanish ? 'Cuenta Custodio:' : 'Custody Account:'}          ${transfer.custodyAccountName || '-'}
${isSpanish ? 'ID de Cuenta:' : 'Account ID:'}                  ${transfer.custodyAccountId}
${isSpanish ? 'Balance Disponible:' : 'Available Balance:'}      ${transfer.custodyAccountBalance ? fmt.currency(transfer.custodyAccountBalance, transfer.currency) : '-'}
` : ''}

${response ? `
${isSpanish ? 'RESPUESTA DEL SERVIDOR MG' : 'MG SERVER RESPONSE'}
═══════════════════════════════════════════════════════════════════════════════

${JSON.stringify(response, null, 2)}
` : ''}

${isSpanish ? 'INFORMACIÓN DEL SISTEMA' : 'SYSTEM INFORMATION'}
═══════════════════════════════════════════════════════════════════════════════

${isSpanish ? 'Banco Emisor:' : 'Issuing Bank:'}                Digital Commercial Bank Ltd (DCB)
${isSpanish ? 'Core Bancario:' : 'Core Banking:'}               DAES (Digital Asset Exchange & Settlement)
${isSpanish ? 'Método de Transferencia:' : 'Transfer Method:'}   Webhook HTTP POST
${isSpanish ? 'URL del Webhook:' : 'Webhook URL:'}              ${webhookUrl}

${isSpanish ? 'NOTAS IMPORTANTES' : 'IMPORTANT NOTES'}
═══════════════════════════════════════════════════════════════════════════════

${isSpanish 
  ? '• Este recibo confirma que la transferencia fue enviada al webhook de MG Productive Investments.\n• Guarde este documento para sus registros.\n• El estado de la transferencia puede verificarse consultando el historial en el sistema.\n• Para soporte, contacte al administrador del sistema DAES.'
  : '• This receipt confirms that the transfer was sent to MG Productive Investments webhook.\n• Keep this document for your records.\n• Transfer status can be verified by checking the history in the system.\n• For support, contact the DAES system administrator.'}

═══════════════════════════════════════════════════════════════════════════════
                    ${isSpanish ? 'FIN DEL RECIBO' : 'END OF RECEIPT'}
═══════════════════════════════════════════════════════════════════════════════

${isSpanish ? 'Generado el' : 'Generated on'} ${new Date().toLocaleString(isSpanish ? 'es-ES' : 'en-US')}
${isSpanish ? 'Sistema DAES CoreBanking' : 'DAES CoreBanking System'}
`;

    return receiptContent;
  };

  // Enviar recibo por email
  const sendReceiptByEmail = async (transfer: TransferHistory, email: string) => {
    if (!email || !email.includes('@')) {
      alert(isSpanish ? 'Email inválido' : 'Invalid email');
      return;
    }

    const receiptText = generateReceipt(transfer, transfer.response);
    
    // Crear mailto link con el recibo
    const subject = `Transfer Receipt - ${transfer.transferRequestId}`;
    const body = encodeURIComponent(receiptText);
    const mailtoLink = `mailto:${email}?subject=${encodeURIComponent(subject)}&body=${body}`;
    
    // Abrir cliente de email
    window.location.href = mailtoLink;
    
    setSuccess(isSpanish 
      ? `Recibo enviado a ${email}`
      : `Receipt sent to ${email}`);
  };

  // Manejar envío de transferencia
  const handleSendTransfer = async () => {
    // Validaciones
    if (!transferForm.transferRequestId.trim()) {
      setError(isSpanish ? 'TransferRequestID es requerido' : 'TransferRequestID is required');
      return;
    }

    if (!transferForm.amount || parseFloat(transferForm.amount) <= 0) {
      setError(isSpanish ? 'Monto debe ser mayor a 0' : 'Amount must be greater than 0');
      return;
    }

    if (!transferForm.receivingAccount.trim()) {
      setError(isSpanish ? 'Cuenta receptora es requerida' : 'Receiving account is required');
      return;
    }

    if (!transferForm.receivingCurrency.trim()) {
      setError(isSpanish ? 'Moneda es requerida' : 'Currency is required');
      return;
    }

    if (!selectedCustodyAccount) {
      setError(isSpanish ? 'Debe seleccionar una cuenta custodio' : 'Must select a custody account');
      return;
    }

    // Validar saldo de cuenta custodio
    const custodyAccount = custodyAccounts.find(a => a.id === selectedCustodyAccount);
    if (!custodyAccount) {
      setError(isSpanish ? 'Cuenta custodio no encontrada' : 'Custody account not found');
      return;
    }

    const transferAmount = parseFloat(transferForm.amount);
    if (custodyAccount.currency !== transferForm.receivingCurrency) {
      setError(
        isSpanish
          ? `La moneda de la cuenta custodio (${custodyAccount.currency}) no coincide con la moneda de la transferencia (${transferForm.receivingCurrency})`
          : `Custody account currency (${custodyAccount.currency}) does not match transfer currency (${transferForm.receivingCurrency})`
      );
      return;
    }

    if (custodyAccount.availableBalance < transferAmount) {
      setError(
        isSpanish
          ? `Saldo insuficiente. Disponible: ${fmt.currency(custodyAccount.availableBalance, custodyAccount.currency)}, Requerido: ${fmt.currency(transferAmount, transferForm.receivingCurrency)}`
          : `Insufficient balance. Available: ${fmt.currency(custodyAccount.availableBalance, custodyAccount.currency)}, Required: ${fmt.currency(transferAmount, transferForm.receivingCurrency)}`
      );
      return;
    }

    setProcessing(true);
    setError(null);
    setSuccess(null);
    setLastResponse(null);

    // Crear entrada en historial
    const historyEntry: TransferHistory = {
      id: Date.now().toString(),
      transferRequestId: transferForm.transferRequestId,
      amount: transferForm.amount,
      currency: transferForm.receivingCurrency,
      receivingAccount: transferForm.receivingAccount,
      sendingName: transferForm.sendingName,
      status: 'PENDING',
      timestamp: new Date().toISOString(),
      custodyAccountId: custodyAccount.id,
      custodyAccountName: custodyAccount.accountName,
      custodyAccountBalance: custodyAccount.availableBalance
    };

    setTransferHistory(prev => [historyEntry, ...prev]);

    try {
      // Enviar transferencia
      const response = await sendTransferToMG(transferForm);

      // Actualizar historial con éxito
      setTransferHistory(prev => prev.map(item =>
        item.id === historyEntry.id
          ? { ...item, status: 'SUCCESS', response }
          : item
      ));

      setLastResponse(response);
      const successMessage = isSpanish
        ? `Transferencia enviada exitosamente a MG Productive Investments`
        : `Transfer successfully sent to MG Productive Investments`;
      
      setSuccess(successMessage);
      alert(successMessage);

      // Generar y descargar recibo automáticamente
      const receiptText = generateReceipt({ ...historyEntry, status: 'SUCCESS', response });
      const filename = `MG-Transfer-${historyEntry.transferRequestId}-${new Date().toISOString().split('T')[0]}.txt`;
      downloadTXT(receiptText, filename);

      // Enviar por email si está configurado
      if (emailConfig.sendEmailOnSuccess && emailConfig.recipientEmail) {
        setTimeout(() => {
          sendReceiptByEmail({ ...historyEntry, status: 'SUCCESS', response }, emailConfig.recipientEmail);
        }, 1000);
      }

      // Limpiar formulario (mantener algunos campos)
      setTransferForm(prev => ({
        ...prev,
        transferRequestId: generateTransferRequestId(),
        amount: '',
        receivingAccount: ''
      }));

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);

      // Actualizar historial con error
      setTransferHistory(prev => prev.map(item =>
        item.id === historyEntry.id
          ? { ...item, status: 'FAILED', error: errorMessage }
          : item
      ));

      setError(errorMessage);
      alert(isSpanish ? `Error: ${errorMessage}` : `Error: ${errorMessage}`);
      console.error('[MG Webhook] Error:', err);
    } finally {
      setProcessing(false);
    }
  };

  // Descargar recibo de una transferencia específica
  const handleDownloadReceipt = (transfer: TransferHistory) => {
    const receiptText = generateReceipt(transfer, transfer.response);
    const filename = `MG-Transfer-${transfer.transferRequestId}-${new Date(transfer.timestamp).toISOString().split('T')[0]}.txt`;
    downloadTXT(receiptText, filename);
  };

  // Enviar recibo por email desde historial
  const handleEmailReceipt = (transfer: TransferHistory) => {
    const email = prompt(isSpanish ? 'Ingrese el email del destinatario:' : 'Enter recipient email:');
    if (email) {
      sendReceiptByEmail(transfer, email);
    }
  };

  // Copiar al portapapeles
  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setSuccess(isSpanish ? 'Copiado al portapapeles' : 'Copied to clipboard');
    setTimeout(() => setSuccess(null), 2000);
  };

  // Limpiar historial
  const clearHistory = () => {
    if (confirm(isSpanish ? '¿Eliminar todo el historial?' : 'Delete all history?')) {
      setTransferHistory([]);
      localStorage.removeItem('mg_webhook_transfer_history');
    }
  };

  // Get status color
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'SUCCESS': return 'text-emerald-400 bg-emerald-500/20';
      case 'FAILED': return 'text-red-400 bg-red-500/20';
      case 'PENDING': return 'text-yellow-400 bg-yellow-500/20';
      default: return 'text-gray-400 bg-gray-500/20';
    }
  };

  return (
    <div className="min-h-screen bg-[var(--bg-main)] p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <BankingHeader
          title={isSpanish ? 'MG Webhook Service' : 'MG Webhook Service'}
          subtitle={
            isSpanish
              ? 'Enviar transferencias desde DAES hacia MG Productive Investments'
              : 'Send transfers from DAES to MG Productive Investments'
          }
          icon={Globe}
        />

        {/* Navigation Tabs */}
        <BankingCard className="p-4">
          <div className="flex gap-2 overflow-x-auto">
            <button
              onClick={() => setSelectedView('overview')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all ${
                selectedView === 'overview'
                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/50'
                  : 'bg-[var(--bg-card)] text-[var(--text-secondary)] hover:bg-[var(--bg-hover)]'
              }`}
            >
              <Activity className="w-4 h-4" />
              {isSpanish ? 'Resumen' : 'Overview'}
            </button>
            <button
              onClick={() => setSelectedView('transfer')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all ${
                selectedView === 'transfer'
                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/50'
                  : 'bg-[var(--bg-card)] text-[var(--text-secondary)] hover:bg-[var(--bg-hover)]'
              }`}
            >
              <Send className="w-4 h-4" />
              {isSpanish ? 'Nueva Transferencia' : 'New Transfer'}
            </button>
            <button
              onClick={() => setSelectedView('history')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all ${
                selectedView === 'history'
                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/50'
                  : 'bg-[var(--bg-card)] text-[var(--text-secondary)] hover:bg-[var(--bg-hover)]'
              }`}
            >
              <Clock className="w-4 h-4" />
              {isSpanish ? 'Historial' : 'History'}
            </button>
          </div>
        </BankingCard>

        {/* Overview View */}
        {selectedView === 'overview' && (
          <div className="space-y-6">
            {/* API Status */}
            <BankingCard className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-[var(--text-primary)] flex items-center gap-2">
                  <Zap className="w-5 h-5" />
                  {isSpanish ? 'Estado de Conexión' : 'Connection Status'}
                </h2>
                <BankingButton
                  variant="secondary"
                  icon={RefreshCw}
                  onClick={testConnection}
                  disabled={testingConnection}
                >
                  {testingConnection 
                    ? (isSpanish ? 'Probando...' : 'Testing...')
                    : (isSpanish ? 'Probar Conexión' : 'Test Connection')}
                </BankingButton>
              </div>

              <div className={`flex items-start gap-3 p-4 rounded-lg ${
                apiStatus === 'connected' ? 'bg-emerald-500/20 border border-emerald-500/50' :
                apiStatus === 'error' ? 'bg-red-500/20 border border-red-500/50' :
                'bg-yellow-500/20 border border-yellow-500/50'
              }`}>
                {apiStatus === 'connected' && <CheckCircle className="w-6 h-6 text-emerald-400 flex-shrink-0" />}
                {apiStatus === 'error' && <XCircle className="w-6 h-6 text-red-400 flex-shrink-0" />}
                {apiStatus === 'checking' && <RefreshCw className="w-6 h-6 text-yellow-400 animate-spin flex-shrink-0" />}
                <div className="flex-1">
                  <p className={`font-bold text-lg ${
                    apiStatus === 'connected' ? 'text-green-400' :
                    apiStatus === 'error' ? 'text-red-400' :
                    'text-yellow-400'
                  }`}>
                    {apiStatus === 'connected' && (isSpanish ? '✅ Conectado' : '✅ Connected')}
                    {apiStatus === 'error' && (isSpanish ? '❌ Error de conexión' : '❌ Connection error')}
                    {apiStatus === 'checking' && (isSpanish ? '🔄 Verificando...' : '🔄 Checking...')}
                  </p>
                  <p className="text-sm text-[var(--text-secondary)] mt-1 break-all">
                    {webhookUrl}
                  </p>
                  {connectionError && (
                    <div className="mt-3 p-3 bg-red-900/30 border border-red-500/50 rounded-lg">
                      <p className="text-xs font-semibold text-red-300 mb-2">
                        {isSpanish ? 'Detalles del Error:' : 'Error Details:'}
                      </p>
                      <pre className="text-xs text-red-200 whitespace-pre-wrap break-words">
                        {connectionError}
                      </pre>
                    </div>
                  )}
                </div>
              </div>
            </BankingCard>

            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <BankingCard className="p-6">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-[var(--text-secondary)] text-sm mb-1">
                      {isSpanish ? 'Total Enviado' : 'Total Sent'}
                    </p>
                    <p className="text-2xl font-bold text-emerald-400">
                      ${stats.total_sent.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </p>
                  </div>
                  <DollarSign className="w-8 h-8 text-emerald-400" />
                </div>
              </BankingCard>

              <BankingCard className="p-6">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-[var(--text-secondary)] text-sm mb-1">
                      {isSpanish ? 'Exitosas' : 'Successful'}
                    </p>
                    <p className="text-2xl font-bold text-[var(--text-primary)]">
                      {stats.successful_transfers}
                    </p>
                  </div>
                  <CheckCircle className="w-8 h-8 text-emerald-400" />
                </div>
              </BankingCard>

              <BankingCard className="p-6">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-[var(--text-secondary)] text-sm mb-1">
                      {isSpanish ? 'Pendientes' : 'Pending'}
                    </p>
                    <p className="text-2xl font-bold text-yellow-400">
                      {stats.pending_transfers}
                    </p>
                  </div>
                  <Clock className="w-8 h-8 text-yellow-400" />
                </div>
              </BankingCard>

              <BankingCard className="p-6">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-[var(--text-secondary)] text-sm mb-1">
                      {isSpanish ? 'Fallidas' : 'Failed'}
                    </p>
                    <p className="text-2xl font-bold text-red-400">
                      {stats.failed_transfers}
                    </p>
                  </div>
                  <XCircle className="w-8 h-8 text-red-400" />
                </div>
              </BankingCard>
            </div>

            {/* Configuration */}
            <BankingCard className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-[var(--text-primary)] flex items-center gap-2">
                  <Settings className="w-5 h-5" />
                  {isSpanish ? 'Configuración' : 'Configuration'}
                </h2>
                <BankingButton
                  variant="secondary"
                  icon={showConfig ? XCircle : Settings}
                  onClick={() => setShowConfig(!showConfig)}
                >
                  {showConfig
                    ? (isSpanish ? 'Ocultar' : 'Hide')
                    : (isSpanish ? 'Mostrar' : 'Show')}
                </BankingButton>
              </div>

              {showConfig && (
                <div className="space-y-4 mt-4">
                  <div>
                    <label className="block text-sm font-semibold text-[var(--text-secondary)] mb-2">
                      {isSpanish ? 'URL del Webhook' : 'Webhook URL'}
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={webhookUrl}
                        onChange={(e) => {
                          setWebhookUrl(e.target.value);
                          localStorage.setItem('mg_webhook_url', e.target.value);
                        }}
                        className="flex-1 bg-[var(--bg-card)] border border-[var(--border-subtle)] text-[var(--text-primary)] px-4 py-2 rounded-lg focus:ring-2 focus:ring-white/30 outline-none"
                        placeholder="https://api.mgproductiveinvestments.com/webhook/dcb/transfer"
                      />
                      <BankingButton
                        variant="secondary"
                        icon={Copy}
                        onClick={() => copyToClipboard(webhookUrl)}
                      >
                        {isSpanish ? 'Copiar' : 'Copy'}
                      </BankingButton>
                    </div>
                  </div>

                  {/* Email Configuration */}
                  <div className="border-t border-[var(--border-subtle)] pt-4">
                    <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-3 flex items-center gap-2">
                      <Mail className="w-5 h-5" />
                      {isSpanish ? 'Configuración de Email' : 'Email Configuration'}
                    </h3>
                    <div className="space-y-3">
                      <BankingInput
                        label={isSpanish ? 'Email del Destinatario' : 'Recipient Email'}
                        value={emailConfig.recipientEmail}
                        onChange={(val) => setEmailConfig({ ...emailConfig, recipientEmail: val })}
                        placeholder="ejemplo@correo.com"
                        type="email"
                      />
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={emailConfig.sendEmailOnSuccess}
                          onChange={(e) => setEmailConfig({ ...emailConfig, sendEmailOnSuccess: e.target.checked })}
                          className="w-4 h-4 rounded border-[var(--border-subtle)] bg-[var(--bg-card)] checked:bg-emerald-500"
                        />
                        <span className="text-sm text-[var(--text-secondary)]">
                          {isSpanish 
                            ? 'Enviar recibo por email automáticamente después de cada transferencia exitosa'
                            : 'Send receipt by email automatically after each successful transfer'}
                        </span>
                      </label>
                    </div>
                  </div>
                </div>
              )}
            </BankingCard>

            {/* Info */}
            <BankingCard className="p-6">
              <div className="flex items-start gap-4">
                <div className="p-3 bg-emerald-500/10 rounded-lg">
                  <Building2 className="w-6 h-6 text-emerald-400" />
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-bold text-[var(--text-primary)] mb-2">
                    {isSpanish ? 'Acerca del Servicio' : 'About Service'}
                  </h3>
                  <p className="text-sm text-[var(--text-secondary)] mb-4">
                    {isSpanish
                      ? 'Sistema de transferencias directas desde DAES hacia MG Productive Investments mediante webhook HTTP POST.'
                      : 'Direct transfer system from DAES to MG Productive Investments via HTTP POST webhook.'}
                  </p>
                  <div className="space-y-2 text-xs text-[var(--text-muted)]">
                    <p>
                      <strong className="text-[var(--text-primary)]">
                        {isSpanish ? 'Banco Emisor:' : 'Issuing Bank:'}
                      </strong>{' '}
                      Digital Commercial Bank Ltd (DCB)
                    </p>
                    <p>
                      <strong className="text-[var(--text-primary)]">
                        {isSpanish ? 'Core Bancario:' : 'Core Banking:'}
                      </strong>{' '}
                      DAES (Digital Asset Exchange & Settlement)
                    </p>
                    <p>
                      <strong className="text-[var(--text-primary)]">
                        {isSpanish ? 'Banco Receptor:' : 'Receiving Bank:'}
                      </strong>{' '}
                      MG Productive Investments
                    </p>
                  </div>
                </div>
              </div>
            </BankingCard>
          </div>
        )}

        {/* Transfer View */}
        {selectedView === 'transfer' && (
          <div className="space-y-6">
            <BankingSection
              title={isSpanish ? 'Nueva Transferencia a MG' : 'New Transfer to MG'}
              icon={Send}
              color="emerald"
            >
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Columna Izquierda */}
                <div className="space-y-4">
                  {/* Seleccionar Cuenta Custodio */}
                  <div>
                    <label className="block text-sm font-semibold text-[var(--text-secondary)] mb-2">
                      {isSpanish ? '1. Cuenta Custodio (Origen)' : '1. Custody Account (Source)'}
                    </label>
                    <select
                      value={selectedCustodyAccount}
                      onChange={(e) => {
                        setSelectedCustodyAccount(e.target.value);
                        // Actualizar moneda automáticamente si hay cuenta seleccionada
                        const account = custodyAccounts.find(a => a.id === e.target.value);
                        if (account) {
                          setTransferForm(prev => ({
                            ...prev,
                            receivingCurrency: account.currency
                          }));
                        }
                      }}
                      className="w-full bg-[var(--bg-card)] border border-[var(--border-subtle)] text-[var(--text-primary)] px-4 py-2 rounded-lg focus:ring-2 focus:ring-white/30 outline-none"
                    >
                      <option value="">{isSpanish ? '-- Selecciona Cuenta Custodio --' : '-- Select Custody Account --'}</option>
                      {custodyAccounts.map(account => (
                        <option key={account.id} value={account.id}>
                          {account.accountName} - {account.currency} ({fmt.currency(account.availableBalance, account.currency)} disponible)
                        </option>
                      ))}
                    </select>
                    {selectedCustodyAccount && custodyAccounts.find(a => a.id === selectedCustodyAccount) && (
                      <div className="mt-2 bg-gradient-to-br from-emerald-500/10 to-teal-500/10 border border-emerald-500/30 rounded-lg p-3">
                        {(() => {
                          const account = custodyAccounts.find(a => a.id === selectedCustodyAccount)!;
                          return (
                            <>
                              <div className="flex items-center gap-2 mb-2">
                                <Wallet className="w-4 h-4 text-emerald-400" />
                                <span className="text-emerald-400 text-sm font-semibold">
                                  {account.accountName}
                                </span>
                              </div>
                              <div className="space-y-1 text-xs">
                                <div className="flex justify-between">
                                  <span className="text-[var(--text-secondary)]">{isSpanish ? 'Balance Total:' : 'Total Balance:'}</span>
                                  <span className="text-[var(--text-primary)] font-semibold">
                                    {fmt.currency(account.totalBalance, account.currency)}
                                  </span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-emerald-400">{isSpanish ? 'Disponible:' : 'Available:'}</span>
                                  <span className="text-emerald-300 font-bold">
                                    {fmt.currency(account.availableBalance, account.currency)}
                                  </span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-amber-400">{isSpanish ? 'Reservado:' : 'Reserved:'}</span>
                                  <span className="text-amber-300 font-semibold">
                                    {fmt.currency(account.reservedBalance, account.currency)}
                                  </span>
                                </div>
                              </div>
                            </>
                          );
                        })()}
                      </div>
                    )}
                  </div>

                  <BankingInput
                    label={isSpanish ? '2. TransferRequestID' : '2. TransferRequestID'}
                    value={transferForm.transferRequestId}
                    onChange={(val) => setTransferForm({ ...transferForm, transferRequestId: val })}
                    placeholder="MG-20251128-ABC123"
                    required
                  />

                  <div className="flex gap-2">
                    <BankingButton
                      variant="secondary"
                      icon={RefreshCw}
                      onClick={() => setTransferForm(prev => ({
                        ...prev,
                        transferRequestId: generateTransferRequestId()
                      }))}
                      className="flex-shrink-0"
                    >
                      {isSpanish ? 'Generar' : 'Generate'}
                    </BankingButton>
                    <p className="text-xs text-[var(--text-muted)] flex items-center">
                      {isSpanish
                        ? 'ID único para esta transacción'
                        : 'Unique ID for this transaction'}
                    </p>
                  </div>

                  <BankingInput
                    label={isSpanish ? '3. Monto' : '3. Amount'}
                    value={transferForm.amount}
                    onChange={(val) => setTransferForm({ ...transferForm, amount: val })}
                    type="number"
                    placeholder="1000.00"
                    required
                  />

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-semibold text-[var(--text-secondary)] mb-2">
                        {isSpanish ? '4. Moneda' : '4. Currency'}
                      </label>
                      <select
                        value={transferForm.receivingCurrency}
                        onChange={(e) => setTransferForm({ ...transferForm, receivingCurrency: e.target.value })}
                        className="w-full bg-[var(--bg-card)] border border-[var(--border-subtle)] text-[var(--text-primary)] px-4 py-2 rounded-lg focus:ring-2 focus:ring-white/30 outline-none"
                        disabled={!!selectedCustodyAccount}
                      >
                        <option value="USD">USD - US Dollar</option>
                        <option value="EUR">EUR - Euro</option>
                        <option value="GBP">GBP - British Pound</option>
                        <option value="CAD">CAD - Canadian Dollar</option>
                        <option value="AUD">AUD - Australian Dollar</option>
                      </select>
                      {selectedCustodyAccount && (
                        <p className="text-xs text-[var(--text-muted)] mt-1">
                          {isSpanish ? 'Moneda bloqueada por cuenta custodio' : 'Currency locked by custody account'}
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Columna Derecha */}
                <div className="space-y-4">
                  <BankingInput
                    label={isSpanish ? '5. Cuenta Receptora (MG)' : '5. Receiving Account (MG)'}
                    value={transferForm.receivingAccount}
                    onChange={(val) => setTransferForm({ ...transferForm, receivingAccount: val })}
                    placeholder="MG-001"
                    required
                  />

                  <BankingInput
                    label={isSpanish ? '6. Nombre del Remitente' : '6. Sending Name'}
                    value={transferForm.sendingName}
                    onChange={(val) => setTransferForm({ ...transferForm, sendingName: val })}
                    placeholder="Digital Commercial Bank Ltd"
                    required
                  />

                  {/* Resumen */}
                  <div className="bg-gradient-to-br from-emerald-500/10 to-teal-500/10 border border-emerald-500/30 rounded-xl p-4 space-y-2">
                    <div className="flex items-center gap-2 text-emerald-400 font-semibold mb-2">
                      <FileText className="w-4 h-4" />
                      {isSpanish ? 'Resumen de Transferencia' : 'Transfer Summary'}
                    </div>
                    <div className="space-y-1 text-sm">
                      <div className="flex justify-between">
                        <span className="text-[var(--text-secondary)]">
                          {isSpanish ? 'TransferRequestID:' : 'TransferRequestID:'}
                        </span>
                        <span className="text-[var(--text-primary)] font-mono text-xs">
                          {transferForm.transferRequestId || '-'}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-[var(--text-secondary)]">
                          {isSpanish ? 'Monto:' : 'Amount:'}
                        </span>
                        <span className="text-emerald-400 font-bold">
                          {transferForm.amount
                            ? fmt.currency(parseFloat(transferForm.amount), transferForm.receivingCurrency)
                            : '-'}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-[var(--text-secondary)]">
                          {isSpanish ? 'Cuenta MG:' : 'MG Account:'}
                        </span>
                        <span className="text-[var(--text-primary)] font-semibold">
                          {transferForm.receivingAccount || '-'}
                        </span>
                      </div>
                    </div>
                  </div>

                  <BankingButton
                    variant="primary"
                    icon={Send}
                    onClick={handleSendTransfer}
                    disabled={processing || !transferForm.transferRequestId || !transferForm.amount || !transferForm.receivingAccount || !selectedCustodyAccount}
                    className="w-full"
                  >
                    {processing
                      ? (isSpanish ? 'Enviando...' : 'Sending...')
                      : (isSpanish ? 'Enviar Transferencia a MG' : 'Send Transfer to MG')}
                  </BankingButton>
                </div>
              </div>

              {/* Mensajes de Estado */}
              {error && (
                <div className="mt-4 bg-red-900/20 border border-red-500/50 rounded-lg p-4 flex items-start gap-3">
                  <XCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <p className="text-red-400 font-semibold">
                      {isSpanish ? 'Error' : 'Error'}
                    </p>
                    <p className="text-red-300 text-sm mt-1">{error}</p>
                  </div>
                </div>
              )}

              {success && (
                <div className="mt-4 bg-emerald-900/20 border border-emerald-500/50 rounded-lg p-4 flex items-start gap-3">
                  <CheckCircle className="w-5 h-5 text-emerald-400 flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <p className="text-emerald-400 font-semibold">
                      {isSpanish ? 'Éxito' : 'Success'}
                    </p>
                    <p className="text-emerald-300 text-sm mt-1">{success}</p>
                  </div>
                </div>
              )}

              {/* Respuesta del Servidor */}
              {lastResponse && (
                <div className="mt-4 bg-blue-900/20 border border-blue-500/50 rounded-lg p-4">
                  <div className="flex items-center gap-2 text-blue-400 font-semibold mb-2">
                    <ExternalLink className="w-4 h-4" />
                    {isSpanish ? 'Respuesta del Servidor MG' : 'MG Server Response'}
                  </div>
                  <pre className="text-xs text-blue-300 overflow-x-auto">
                    {JSON.stringify(lastResponse, null, 2)}
                  </pre>
                </div>
              )}
            </BankingSection>
          </div>
        )}

        {/* History View */}
        {selectedView === 'history' && (
          <div className="space-y-6">
            <BankingSection
              title={isSpanish ? 'Historial de Transferencias' : 'Transfer History'}
              icon={Clock}
              color="purple"
            >
              <div className="flex items-center justify-between mb-4">
                <p className="text-sm text-[var(--text-secondary)]">
                  {isSpanish
                    ? `${transferHistory.length} transferencias registradas`
                    : `${transferHistory.length} transfers recorded`}
                </p>
                {transferHistory.length > 0 && (
                  <BankingButton
                    variant="secondary"
                    icon={XCircle}
                    onClick={clearHistory}
                  >
                    {isSpanish ? 'Limpiar Historial' : 'Clear History'}
                  </BankingButton>
                )}
              </div>

              {transferHistory.length > 0 ? (
                <div className="space-y-3 max-h-[600px] overflow-y-auto">
                  {transferHistory.map((transfer) => (
                    <div
                      key={transfer.id}
                      className="bg-[var(--bg-card)]/50 border border-[var(--border-subtle)] rounded-xl p-4 hover:border-purple-500/50 transition-all"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <span className="text-[var(--text-primary)] font-bold font-mono text-sm">
                              {transfer.transferRequestId}
                            </span>
                            <span className={`px-2 py-1 rounded-lg text-xs font-semibold ${getStatusColor(transfer.status)}`}>
                              {transfer.status}
                            </span>
                          </div>

                          <div className="space-y-1 text-sm">
                            <div className="flex items-center gap-2 text-[var(--text-secondary)]">
                              <DollarSign className="w-3 h-3" />
                              <span>
                                {fmt.currency(parseFloat(transfer.amount), transfer.currency)}
                              </span>
                            </div>
                            <div className="flex items-center gap-2 text-[var(--text-secondary)]">
                              <Globe className="w-3 h-3" />
                              <span>
                                {isSpanish ? 'Cuenta MG:' : 'MG Account:'} {transfer.receivingAccount}
                              </span>
                            </div>
                            <div className="flex items-center gap-2 text-[var(--text-muted)] text-xs">
                              <Clock className="w-3 h-3" />
                              <span>{fmt.dateTime(transfer.timestamp)}</span>
                            </div>
                          </div>

                          {transfer.error && (
                            <div className="mt-2 text-xs text-red-400 bg-red-900/20 rounded p-2">
                              {transfer.error}
                            </div>
                          )}

                          {transfer.response && (
                            <details className="mt-2">
                              <summary className="text-xs text-blue-400 cursor-pointer hover:text-blue-300">
                                {isSpanish ? 'Ver respuesta completa' : 'View full response'}
                              </summary>
                              <pre className="text-xs text-blue-300 mt-2 bg-blue-900/20 rounded p-2 overflow-x-auto">
                                {JSON.stringify(transfer.response, null, 2)}
                              </pre>
                            </details>
                          )}

                          {/* Botones de acción */}
                          {transfer.status === 'SUCCESS' && (
                            <div className="mt-3 pt-3 border-t border-[var(--border-subtle)] flex gap-2">
                              <BankingButton
                                variant="secondary"
                                icon={Download}
                                onClick={() => handleDownloadReceipt(transfer)}
                                className="flex-1"
                              >
                                {isSpanish ? 'Descargar Recibo' : 'Download Receipt'}
                              </BankingButton>
                              <BankingButton
                                variant="secondary"
                                icon={Mail}
                                onClick={() => handleEmailReceipt(transfer)}
                                className="flex-1"
                              >
                                {isSpanish ? 'Enviar por Email' : 'Send by Email'}
                              </BankingButton>
                            </div>
                          )}

                          {/* Información de cuenta custodio */}
                          {transfer.custodyAccountName && (
                            <div className="mt-2 text-xs bg-emerald-900/20 border border-emerald-500/30 rounded p-2">
                              <div className="flex items-center gap-2 text-emerald-400 mb-1">
                                <Wallet className="w-3 h-3" />
                                <span className="font-semibold">
                                  {isSpanish ? 'Cuenta Custodio:' : 'Custody Account:'}
                                </span>
                              </div>
                              <p className="text-emerald-300">{transfer.custodyAccountName}</p>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <Send className="w-16 h-16 text-slate-700 mx-auto mb-4" />
                  <p className="text-[var(--text-secondary)]">
                    {isSpanish
                      ? 'No hay transferencias registradas'
                      : 'No transfers recorded'}
                  </p>
                  <p className="text-[var(--text-muted)] text-sm mt-2">
                    {isSpanish
                      ? 'Las transferencias aparecerán aquí después de enviarlas'
                      : 'Transfers will appear here after sending them'}
                  </p>
                </div>
              )}
            </BankingSection>
          </div>
        )}
      </div>
    </div>
  );
}
