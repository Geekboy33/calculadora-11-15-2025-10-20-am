/**
 * IBAN Manager Module - DAES CoreBanking
 * Emisión y gestión de IBANs bajo licencia de Digital Commercial Bank Ltd
 */

import { useState, useEffect } from 'react';
import {
  CreditCard,
  Plus,
  Shield,
  CheckCircle,
  XCircle,
  Lock,
  Unlock,
  Eye,
  Download,
  RefreshCw,
  Wallet,
  AlertTriangle,
  Globe,
  Trash2
} from 'lucide-react';
import { useLanguage } from '../lib/i18n';
import { useToast } from './ui/Toast';
import { custodyStore, type CustodyAccount } from '../lib/custody-store';

interface IbanRecord {
  id: string;
  daesAccountId: string;
  iban: string;
  ibanFormatted: string;
  countryCode: 'AE' | 'DE' | 'ES';
  currency: string;
  bankCode: string;
  branchCode?: string;
  internalAccountNumber: string;
  status: 'PENDING' | 'ACTIVE' | 'BLOCKED' | 'CLOSED';
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  accountName?: string;
}

interface AuditEntry {
  id: string;
  actionType: string;
  previousStatus?: string;
  newStatus?: string;
  performedBy: string;
  metadata?: Record<string, any>;
  createdAt: string;
}

export function IbanManagerModule() {
  const { language } = useLanguage();
  const isSpanish = language === 'es';
  const { addToast } = useToast();

  const [ibans, setIbans] = useState<IbanRecord[]>([]);
  const [custodyAccounts, setCustodyAccounts] = useState<CustodyAccount[]>([]);
  const [selectedIban, setSelectedIban] = useState<IbanRecord | null>(null);
  const [auditLogs, setAuditLogs] = useState<AuditEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [showAllocateModal, setShowAllocateModal] = useState(false);
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [showAuditModal, setShowAuditModal] = useState(false);

  const [allocateForm, setAllocateForm] = useState({
    custodyAccountId: '',
    countryCode: 'AE' as 'AE' | 'DE' | 'ES',
    currency: 'USD' as 'AED' | 'USD' | 'EUR',
    createdBy: localStorage.getItem('daes_user') || 'system'
  });

  const [selectedCustodyAccount, setSelectedCustodyAccount] = useState<CustodyAccount | null>(null);

  const [statusForm, setStatusForm] = useState({
    newStatus: 'ACTIVE' as 'ACTIVE' | 'BLOCKED' | 'CLOSED',
    reason: '',
    performedBy: localStorage.getItem('daes_user') || 'admin'
  });

  useEffect(() => {
    loadIbans();
    loadCustodyAccounts();

    const unsubscribe = custodyStore.subscribe(accounts => {
      setCustodyAccounts(accounts);
    });

    return unsubscribe;
  }, []);

  const loadIbans = () => {
    try {
      const saved = localStorage.getItem('daes_ibans');
      if (saved) {
        const parsed = JSON.parse(saved);
        setIbans(parsed);
        console.log('[IbanManager] ✅ IBANs cargados:', parsed.length);
      } else {
        setIbans([]);
      }
    } catch (error) {
      console.error('[IbanManager] Error cargando IBANs:', error);
    }
  };

  const loadCustodyAccounts = () => {
    const accounts = custodyStore.getAccounts();
    setCustodyAccounts(accounts);
  };

  const generateIban = (countryCode: string, bankCode: string, accountNumber: string, currency?: string): string => {
    // Implementación del algoritmo ISO 13616 mod 97
    let bban = '';

    switch (countryCode) {
      case 'AE':
        // UAE: 3 bank + 16 account
        // Para UAE, ajustar bank code según currency
        let adjustedBankCode = bankCode;
        if (currency === 'AED') {
          adjustedBankCode = '026'; // Cuenta AED
        } else if (currency === 'USD') {
          adjustedBankCode = '026'; // Cuenta USD (mismo banco, diferente sub-cuenta)
        } else if (currency === 'EUR') {
          adjustedBankCode = '026'; // Cuenta EUR
        }
        bban = adjustedBankCode.padStart(3, '0') + accountNumber.padStart(16, '0');
        break;
      case 'DE':
        // Germany: 8 BLZ + 10 account
        bban = bankCode.padStart(8, '0') + accountNumber.padStart(10, '0');
        break;
      case 'ES':
        // Spain: 4 bank + 4 branch + 2 control + 10 account
        const branch = '0418';
        const control = '45'; // Simplificado
        bban = bankCode.padStart(4, '0') + branch + control + accountNumber.padStart(10, '0');
        break;
    }

    // Calcular check digits con mod 97
    const rearranged = bban + countryCode + '00';
    const numericString = rearranged.replace(/[A-Z]/g, char => 
      (char.charCodeAt(0) - 'A'.charCodeAt(0) + 10).toString()
    );

    let remainder = 0;
    for (let i = 0; i < numericString.length; i++) {
      remainder = (remainder * 10 + parseInt(numericString[i], 10)) % 97;
    }

    const checkDigits = (98 - remainder).toString().padStart(2, '0');
    const iban = countryCode + checkDigits + bban;

    console.log('[IbanManager] IBAN generado:', {
      country: countryCode,
      currency,
      bban,
      checkDigits,
      iban
    });

    return iban;
  };

  const handleAllocateIban = async () => {
    if (!allocateForm.custodyAccountId) {
      addToast({
        type: 'error',
        title: isSpanish ? 'Cuenta requerida' : 'Account required',
        description: isSpanish ? 'Selecciona una cuenta custody' : 'Select a custody account'
      });
      return;
    }

    setLoading(true);
    try {
      const custodyAccount = custodyAccounts.find(a => a.id === allocateForm.custodyAccountId);
      if (!custodyAccount) {
        throw new Error('Custody account not found');
      }

      // Generar número de cuenta interno único
      const accountNumber = Date.now().toString().substring(3);
      
      // Bank code según país
      const bankCodes: Record<string, string> = {
        'AE': '026',  // Digital Commercial Bank Ltd
        'DE': '37040044',
        'ES': '2100'
      };

      const bankCode = bankCodes[allocateForm.countryCode];
      
      // Para UAE, usar la currency seleccionada en el form
      const currencyToUse = allocateForm.countryCode === 'AE' ? allocateForm.currency : custodyAccount.currency;
      
      // Generar IBAN con currency específica
      const iban = generateIban(allocateForm.countryCode, bankCode, accountNumber, currencyToUse);
      const ibanFormatted = iban.replace(/(.{4})/g, '$1 ').trim();

      const newIban: IbanRecord = {
        id: crypto.randomUUID(),
        daesAccountId: custodyAccount.id,
        iban,
        ibanFormatted,
        countryCode: allocateForm.countryCode,
        currency: currencyToUse,
        bankCode,
        internalAccountNumber: accountNumber,
        status: 'PENDING',
        createdBy: allocateForm.createdBy,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        accountName: custodyAccount.accountName
      };

      const updated = [newIban, ...ibans];
      setIbans(updated);
      localStorage.setItem('daes_ibans', JSON.stringify(updated));

      // Registrar en Transaction Events
      const { transactionEventStore } = await import('../lib/transaction-event-store');
      transactionEventStore.recordEvent(
        'ACCOUNT_CREATED',
        'SYSTEM',
        `IBAN emitido: ${ibanFormatted}`,
        {
          currency: custodyAccount.currency,
          accountId: custodyAccount.id,
          accountName: custodyAccount.accountName,
          reference: iban,
          status: 'COMPLETED',
          metadata: {
            ibanId: newIban.id,
            countryCode: allocateForm.countryCode,
            bankCode,
            internalAccountNumber: accountNumber,
            operation: 'IBAN_ALLOCATION'
          }
        }
      );

      addToast({
        type: 'success',
        title: isSpanish ? 'IBAN emitido' : 'IBAN issued',
        description: isSpanish
          ? `${allocateForm.countryCode}: ${ibanFormatted}\nDigital Commercial Bank Ltd\nDubai, UAE`
          : `${allocateForm.countryCode}: ${ibanFormatted}\nDigital Commercial Bank Ltd\nDubai, UAE`
      });

      setShowAllocateModal(false);
      setAllocateForm({
        custodyAccountId: '',
        countryCode: 'AE',
        currency: 'USD',
        createdBy: allocateForm.createdBy
      });
      setSelectedCustodyAccount(null);

    } catch (error: any) {
      console.error('[IbanManager] Error:', error);
      addToast({
        type: 'error',
        title: isSpanish ? 'Error' : 'Error',
        description: error.message
      });
    } finally {
      setLoading(false);
    }
  };

  const handleChangeStatus = async () => {
    if (!selectedIban) return;

    setLoading(true);
    try {
      const updated = { ...selectedIban };
      updated.status = statusForm.newStatus;
      updated.updatedAt = new Date().toISOString();

      const allIbans = ibans.map(i => i.id === updated.id ? updated : i);
      setIbans(allIbans);
      localStorage.setItem('daes_ibans', JSON.stringify(allIbans));

      // Registrar en Transaction Events
      const { transactionEventStore } = await import('../lib/transaction-event-store');
      transactionEventStore.recordEvent(
        'ACCOUNT_CREATED',
        'SYSTEM',
        `IBAN status cambió: ${updated.ibanFormatted} → ${statusForm.newStatus}`,
        {
          reference: updated.iban,
          status: 'COMPLETED',
          metadata: {
            ibanId: updated.id,
            previousStatus: selectedIban.status,
            newStatus: statusForm.newStatus,
            reason: statusForm.reason,
            performedBy: statusForm.performedBy
          }
        }
      );

      addToast({
        type: 'success',
        title: isSpanish ? 'Status actualizado' : 'Status updated',
        description: `${updated.ibanFormatted} → ${statusForm.newStatus}`
      });

      setShowStatusModal(false);
      setSelectedIban(null);

    } catch (error: any) {
      console.error('[IbanManager] Error:', error);
      addToast({
        type: 'error',
        title: isSpanish ? 'Error' : 'Error',
        description: error.message
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteIban = async (ibanId: string) => {
    const iban = ibans.find(i => i.id === ibanId);
    if (!iban) return;

    const confirmMessage = isSpanish
      ? `¿Eliminar IBAN ${iban.ibanFormatted}?\n\nCuenta: ${iban.accountName}\nMoneda: ${iban.currency}\nStatus: ${iban.status}\n\n⚠️ Esta acción no se puede deshacer.`
      : `Delete IBAN ${iban.ibanFormatted}?\n\nAccount: ${iban.accountName}\nCurrency: ${iban.currency}\nStatus: ${iban.status}\n\n⚠️ This action cannot be undone.`;

    if (!window.confirm(confirmMessage)) return;

    try {
      const updated = ibans.filter(i => i.id !== ibanId);
      setIbans(updated);
      localStorage.setItem('daes_ibans', JSON.stringify(updated));

      // Registrar eliminación en Transaction Events
      const { transactionEventStore } = await import('../lib/transaction-event-store');
      transactionEventStore.recordEvent(
        'ACCOUNT_DELETED',
        'SYSTEM',
        `IBAN eliminado: ${iban.ibanFormatted}`,
        {
          currency: iban.currency,
          accountName: iban.accountName,
          reference: iban.iban,
          status: 'COMPLETED',
          metadata: {
            ibanId: iban.id,
            countryCode: iban.countryCode,
            previousStatus: iban.status,
            operation: 'DELETE_IBAN'
          }
        }
      );

      addToast({
        type: 'warning',
        title: isSpanish ? 'IBAN eliminado' : 'IBAN deleted',
        description: iban.ibanFormatted
      });

      console.log('[IbanManager] 🗑️ IBAN eliminado:', iban.ibanFormatted);

    } catch (error: any) {
      console.error('[IbanManager] Error eliminando:', error);
      addToast({
        type: 'error',
        title: isSpanish ? 'Error' : 'Error',
        description: error.message
      });
    }
  };

  const handleShowAudit = (iban: IbanRecord) => {
    setSelectedIban(iban);
    
    const logs: AuditEntry[] = [
      {
        id: crypto.randomUUID(),
        actionType: 'ALLOCATE',
        newStatus: 'PENDING',
        performedBy: iban.createdBy,
        createdAt: iban.createdAt
      }
    ];

    if (iban.status !== 'PENDING') {
      logs.push({
        id: crypto.randomUUID(),
        actionType: 'CHANGE_STATUS',
        previousStatus: 'PENDING',
        newStatus: iban.status,
        performedBy: 'system',
        createdAt: iban.updatedAt
      });
    }

    setAuditLogs(logs);
    setShowAuditModal(true);
  };

  const downloadIbanCertificate = (iban: IbanRecord) => {
    const txt = `
═══════════════════════════════════════════════════════════════════
  ${isSpanish ? 'CERTIFICADO DE IBAN' : 'IBAN CERTIFICATE'}
  DIGITAL COMMERCIAL BANK LTD
  B2B Tower, 15th Floor, Marasi Drive
  Business Bay, Dubai, UAE
═══════════════════════════════════════════════════════════════════

${isSpanish ? 'INFORMACIÓN DEL IBAN' : 'IBAN INFORMATION'}
───────────────────────────────────────────────────────────────────

IBAN:                       ${iban.ibanFormatted}
${isSpanish ? 'País:' : 'Country:'}                      ${iban.countryCode} - ${iban.countryCode === 'AE' ? 'United Arab Emirates' : iban.countryCode === 'DE' ? 'Germany' : 'Spain'}
${isSpanish ? 'Moneda:' : 'Currency:'}                     ${iban.currency}
${isSpanish ? 'Estado:' : 'Status:'}                     ${iban.status}

${isSpanish ? 'DETALLES BANCARIOS' : 'BANK DETAILS'}
───────────────────────────────────────────────────────────────────

${isSpanish ? 'Banco emisor:' : 'Issuing bank:'}              Digital Commercial Bank Ltd
${isSpanish ? 'Dirección:' : 'Address:'}                   B2B Tower, 15th Floor, Marasi Drive
                             Business Bay, Dubai, UAE
${isSpanish ? 'Código de banco:' : 'Bank code:'}               ${iban.bankCode}
${iban.branchCode ? `${isSpanish ? 'Código de sucursal:' : 'Branch code:'}           ${iban.branchCode}` : ''}
${isSpanish ? 'Número de cuenta interno:' : 'Internal account number:'}  ${iban.internalAccountNumber}
SWIFT/BIC:                  DIGCUSXX (Digital Commercial Bank Ltd)

${isSpanish ? 'CUENTA DAES VINCULADA' : 'LINKED DAES ACCOUNT'}
───────────────────────────────────────────────────────────────────

${isSpanish ? 'Nombre de cuenta:' : 'Account name:'}            ${iban.accountName || 'N/A'}
${isSpanish ? 'ID de cuenta DAES:' : 'DAES Account ID:'}         ${iban.daesAccountId}
${isSpanish ? 'Tipo de cuenta:' : 'Account type:'}             ${isSpanish ? 'Cuenta corporativa' : 'Corporate account'}

${isSpanish ? 'EMISIÓN' : 'ISSUANCE'}
───────────────────────────────────────────────────────────────────

${isSpanish ? 'Emitido por:' : 'Issued by:'}                ${iban.createdBy}
${isSpanish ? 'Fecha de emisión:' : 'Issue date:'}             ${new Date(iban.createdAt).toLocaleString(isSpanish ? 'es-ES' : 'en-US')}
${isSpanish ? 'Última actualización:' : 'Last update:'}            ${new Date(iban.updatedAt).toLocaleString(isSpanish ? 'es-ES' : 'en-US')}

${isSpanish ? 'CAPACIDADES DE LA CUENTA' : 'ACCOUNT CAPABILITIES'}
───────────────────────────────────────────────────────────────────

${iban.countryCode === 'AE' ? `
${isSpanish ? '✓ Recibir transferencias internacionales' : '✓ Receive international transfers'}
${isSpanish ? '✓ Enviar transferencias internacionales' : '✓ Send international transfers'}
${isSpanish ? '✓ Compatible con sistemas SWIFT' : '✓ Compatible with SWIFT systems'}
${isSpanish ? '✓ Soporta múltiples divisas (AED, USD, EUR)' : '✓ Supports multiple currencies (AED, USD, EUR)'}
${isSpanish ? '✓ Transferencias en tiempo real' : '✓ Real-time transfers'}
${isSpanish ? '✓ Compatible con sistemas de pago ISO 20022' : '✓ Compatible with ISO 20022 payment systems'}
` : `
${isSpanish ? '✓ Transferencias SEPA (solo EUR)' : '✓ SEPA transfers (EUR only)'}
${isSpanish ? '✓ Transferencias internacionales SWIFT' : '✓ International SWIFT transfers'}
`}

═══════════════════════════════════════════════════════════════════
  Digital Commercial Bank Ltd
  B2B Tower, 15th Floor, Marasi Drive
  Business Bay, Dubai, United Arab Emirates
  
  ${isSpanish ? 'Número de Licencia Bancaria Internacional: L 15446' : 'International Banking License Number: L 15446'}
  ${isSpanish ? 'Número de Compañía: 15446' : 'Company Number: 15446'}
  SWIFT/BIC: DIGCUSXX
  
  ${isSpanish ? 'Este IBAN es emitido bajo nuestra licencia bancaria y cumple con' : 'This IBAN is issued under our banking license and complies with'}
  ISO 13616 ${isSpanish ? '(Estándar Internacional de Números de Cuenta Bancaria)' : '(International Bank Account Number Standard)'}
  
  © ${new Date().getFullYear()} - ${isSpanish ? 'Todos los derechos reservados' : 'All rights reserved'}
═══════════════════════════════════════════════════════════════════

${isSpanish ? 'ADVERTENCIA:' : 'NOTICE:'}
${isSpanish ? 'Este certificado es un documento oficial del banco.' : 'This certificate is an official bank document.'}
${isSpanish ? 'Úselo únicamente para transacciones bancarias legítimas.' : 'Use it only for legitimate banking transactions.'}

${isSpanish ? 'Generado el:' : 'Generated on:'} ${new Date().toLocaleString(isSpanish ? 'es-ES' : 'en-US')}
`;

    const blob = new Blob([txt], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `IBAN_Certificate_${iban.iban}.txt`;
    link.click();
    URL.revokeObjectURL(url);

    addToast({
      type: 'success',
      title: isSpanish ? 'Certificado descargado' : 'Certificate downloaded',
      description: iban.ibanFormatted
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ACTIVE': return 'bg-green-500/20 text-green-300 border-green-500/40';
      case 'PENDING': return 'bg-yellow-500/20 text-yellow-300 border-yellow-500/40';
      case 'BLOCKED': return 'bg-red-500/20 text-red-300 border-red-500/40';
      case 'CLOSED': return 'bg-gray-500/20 text-gray-300 border-gray-500/40';
      default: return 'bg-gray-500/20 text-gray-300 border-gray-500/40';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'ACTIVE': return <CheckCircle className="w-4 h-4" />;
      case 'PENDING': return <Shield className="w-4 h-4" />;
      case 'BLOCKED': return <Lock className="w-4 h-4" />;
      case 'CLOSED': return <XCircle className="w-4 h-4" />;
      default: return <AlertTriangle className="w-4 h-4" />;
    }
  };

  const stats = {
    total: ibans.length,
    active: ibans.filter(i => i.status === 'ACTIVE').length,
    pending: ibans.filter(i => i.status === 'PENDING').length,
    blocked: ibans.filter(i => i.status === 'BLOCKED').length,
    byCountry: {
      AE: ibans.filter(i => i.countryCode === 'AE').length,
      DE: ibans.filter(i => i.countryCode === 'DE').length,
      ES: ibans.filter(i => i.countryCode === 'ES').length
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#030712] via-[#050b1c] to-[#000] text-white p-6">
      <div className="flex flex-col gap-2 mb-8">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <CreditCard className="w-8 h-8 text-[#00ff88]" />
            <div>
              <h1 className="text-3xl font-bold tracking-tight">
                {isSpanish ? 'Gestor de IBANs' : 'IBAN Manager'}
              </h1>
              <p className="text-white/70">
                {isSpanish ? 'Emisión y gestión de IBANs · ISO 13616' : 'IBAN Issuance & Management · ISO 13616'}
              </p>
            </div>
          </div>
          <div className="flex gap-3">
            <button
              onClick={loadIbans}
              className="flex items-center gap-2 px-4 py-2 bg-white/5 border border-white/20 rounded-xl hover:border-white/40 transition"
            >
              <RefreshCw className="w-4 h-4" />
              {isSpanish ? 'Actualizar' : 'Refresh'}
            </button>
            <button
              onClick={() => setShowAllocateModal(true)}
              className="flex items-center gap-2 px-6 py-2 bg-[#00ff88]/20 border border-[#00ff88]/40 text-[#00ff88] rounded-xl font-semibold hover:bg-[#00ff88]/30 transition"
            >
              <Plus className="w-5 h-5" />
              {isSpanish ? 'Emitir IBAN' : 'Issue IBAN'}
            </button>
          </div>
        </div>
      </div>

      {/* Estadísticas */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
          <div className="flex items-center gap-3 mb-2">
            <CreditCard className="w-5 h-5 text-cyan-300" />
            <span className="text-sm text-white/60">{isSpanish ? 'Total IBANs' : 'Total IBANs'}</span>
          </div>
          <p className="text-3xl font-bold">{stats.total}</p>
        </div>
        <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
          <div className="flex items-center gap-3 mb-2">
            <CheckCircle className="w-5 h-5 text-green-300" />
            <span className="text-sm text-white/60">{isSpanish ? 'Activos' : 'Active'}</span>
          </div>
          <p className="text-3xl font-bold text-green-300">{stats.active}</p>
        </div>
        <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
          <div className="flex items-center gap-3 mb-2">
            <Shield className="w-5 h-5 text-yellow-300" />
            <span className="text-sm text-white/60">{isSpanish ? 'Pendientes' : 'Pending'}</span>
          </div>
          <p className="text-3xl font-bold text-yellow-300">{stats.pending}</p>
        </div>
        <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
          <div className="flex items-center gap-3 mb-2">
            <Globe className="w-5 h-5 text-purple-300" />
            <span className="text-sm text-white/60">{isSpanish ? 'Países' : 'Countries'}</span>
          </div>
          <p className="text-xl font-bold text-purple-300">
            AE:{stats.byCountry.AE} DE:{stats.byCountry.DE} ES:{stats.byCountry.ES}
          </p>
        </div>
      </div>

      {/* Lista de IBANs */}
      <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Shield className="w-5 h-5 text-cyan-300" />
          {isSpanish ? 'IBANs emitidos' : 'Issued IBANs'}
        </h2>

        {ibans.length === 0 ? (
          <div className="text-center py-12 text-white/60">
            {isSpanish
              ? 'No hay IBANs emitidos. Emite uno para comenzar.'
              : 'No IBANs issued yet. Issue one to start.'}
          </div>
        ) : (
          <div className="space-y-3 max-h-[calc(100vh-500px)] overflow-y-auto pr-2">
            {ibans.map(iban => (
              <div
                key={iban.id}
                className="bg-black/40 border border-white/10 rounded-xl p-5 hover:border-[#00ff88]/30 transition"
              >
                <div className="flex flex-wrap gap-4 justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className="text-xl font-semibold font-mono">{iban.ibanFormatted}</h3>
                      <span className={`px-3 py-1 rounded-full text-xs font-semibold border ${getStatusColor(iban.status)} flex items-center gap-1`}>
                        {getStatusIcon(iban.status)}
                        {iban.status}
                      </span>
                      <span className="px-2 py-1 rounded bg-purple-500/20 text-purple-300 text-xs font-semibold">
                        {iban.countryCode}
                      </span>
                    </div>
                    <div className="grid md:grid-cols-2 gap-x-6 gap-y-2 text-sm">
                      <div>
                        <span className="text-white/50">{isSpanish ? 'Cuenta:' : 'Account:'}</span>
                        <span className="text-white/80 ml-2">{iban.accountName || 'N/A'}</span>
                      </div>
                      <div>
                        <span className="text-white/50">{isSpanish ? 'Moneda:' : 'Currency:'}</span>
                        <span className="text-[#00ff88] font-semibold ml-2">{iban.currency}</span>
                      </div>
                      <div>
                        <span className="text-white/50">{isSpanish ? 'Banco:' : 'Bank:'}</span>
                        <span className="text-white/80 ml-2 font-mono text-xs">{iban.bankCode}</span>
                      </div>
                      <div>
                        <span className="text-white/50">{isSpanish ? 'Emitido:' : 'Issued:'}</span>
                        <span className="text-white/80 ml-2 text-xs">
                          {new Date(iban.createdAt).toLocaleDateString(isSpanish ? 'es-ES' : 'en-US')}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col gap-2">
                    {iban.status === 'PENDING' && (
                      <button
                        onClick={() => {
                          setSelectedIban(iban);
                          setStatusForm({ ...statusForm, newStatus: 'ACTIVE' });
                          setShowStatusModal(true);
                        }}
                        className="px-4 py-2 rounded-xl bg-green-500/10 border border-green-400/30 text-green-300 text-sm font-semibold hover:bg-green-500/20 transition flex items-center gap-2"
                      >
                        <Unlock className="w-4 h-4" />
                        {isSpanish ? 'Activar' : 'Activate'}
                      </button>
                    )}
                    {iban.status === 'ACTIVE' && (
                      <button
                        onClick={() => {
                          setSelectedIban(iban);
                          setStatusForm({ ...statusForm, newStatus: 'BLOCKED' });
                          setShowStatusModal(true);
                        }}
                        className="px-4 py-2 rounded-xl bg-orange-500/10 border border-orange-400/30 text-orange-300 text-sm font-semibold hover:bg-orange-500/20 transition flex items-center gap-2"
                      >
                        <Lock className="w-4 h-4" />
                        {isSpanish ? 'Bloquear' : 'Block'}
                      </button>
                    )}
                    <button
                      onClick={() => downloadIbanCertificate(iban)}
                      className="px-4 py-2 rounded-xl bg-cyan-500/10 border border-cyan-400/30 text-cyan-300 text-sm font-semibold hover:bg-cyan-500/20 transition flex items-center gap-2"
                    >
                      <Download className="w-4 h-4" />
                      {isSpanish ? 'Certificado' : 'Certificate'}
                    </button>
                    <button
                      onClick={() => handleShowAudit(iban)}
                      className="px-4 py-2 rounded-xl bg-purple-500/10 border border-purple-400/30 text-purple-300 text-sm font-semibold hover:bg-purple-500/20 transition flex items-center gap-2"
                    >
                      <Eye className="w-4 h-4" />
                      {isSpanish ? 'Auditoría' : 'Audit'}
                    </button>
                    <button
                      onClick={() => handleDeleteIban(iban.id)}
                      className="px-3 py-2 rounded-xl bg-red-500/10 border border-red-400/30 text-red-300 text-sm font-semibold hover:bg-red-500/20 transition"
                      title={isSpanish ? 'Eliminar IBAN' : 'Delete IBAN'}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal Emitir IBAN */}
      {showAllocateModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setShowAllocateModal(false)}>
          <div className="bg-gradient-to-br from-[#0a0f1c] to-[#000] border border-[#00ff88]/30 rounded-3xl p-6 max-w-2xl w-full" onClick={e => e.stopPropagation()}>
            <div className="flex items-center gap-3 mb-6">
              <Plus className="w-6 h-6 text-[#00ff88]" />
              <h2 className="text-2xl font-bold">
                {isSpanish ? 'Emitir nuevo IBAN' : 'Issue new IBAN'}
              </h2>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-white/70 mb-2 flex items-center gap-2">
                  <Wallet className="w-4 h-4" />
                  {isSpanish ? 'Cuenta DAES' : 'DAES Account'}
                </label>
                <select
                  value={allocateForm.custodyAccountId}
                  onChange={e => {
                    const accountId = e.target.value;
                    const account = custodyAccounts.find(a => a.id === accountId);
                    setSelectedCustodyAccount(account || null);
                    setAllocateForm({ 
                      ...allocateForm, 
                      custodyAccountId: accountId,
                      currency: account?.currency === 'AED' || account?.currency === 'USD' || account?.currency === 'EUR'
                        ? account.currency as 'AED' | 'USD' | 'EUR'
                        : 'USD'
                    });
                  }}
                  className="w-full bg-black/40 border border-white/20 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-[#00ff88]/40"
                  required
                >
                  <option value="">{isSpanish ? '-- Seleccionar cuenta --' : '-- Select account --'}</option>
                  {custodyAccounts.map(account => (
                    <option key={account.id} value={account.id}>
                      {account.accountName} · {account.currency} ({account.accountNumber})
                    </option>
                  ))}
                </select>
                {selectedCustodyAccount && (
                  <div className="mt-3 p-3 bg-purple-500/10 border border-purple-400/30 rounded-lg text-sm">
                    <p className="text-purple-300 font-semibold mb-2">
                      {isSpanish ? 'Cuenta seleccionada:' : 'Selected account:'}
                    </p>
                    <div className="grid grid-cols-2 gap-2 text-white/70">
                      <div>
                        <span className="text-white/50">{isSpanish ? 'Nombre:' : 'Name:'}</span>
                        <p className="text-white">{selectedCustodyAccount.accountName}</p>
                      </div>
                      <div>
                        <span className="text-white/50">{isSpanish ? 'Moneda:' : 'Currency:'}</span>
                        <p className="text-[#00ff88]">{selectedCustodyAccount.currency}</p>
                      </div>
                      <div>
                        <span className="text-white/50">{isSpanish ? 'Balance:' : 'Balance:'}</span>
                        <p className="text-white">{selectedCustodyAccount.currency} {selectedCustodyAccount.totalBalance.toLocaleString()}</p>
                      </div>
                      <div>
                        <span className="text-white/50">{isSpanish ? 'Tipo:' : 'Type:'}</span>
                        <p className="text-white capitalize">{selectedCustodyAccount.accountType}</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-white/70 mb-2">
                  {isSpanish ? 'País del IBAN' : 'IBAN Country'}
                </label>
                <div className="grid grid-cols-3 gap-3">
                  {(['AE', 'DE', 'ES'] as const).map(country => (
                    <button
                      key={country}
                      type="button"
                      onClick={() => setAllocateForm({ ...allocateForm, countryCode: country })}
                      className={`px-4 py-3 rounded-xl font-semibold transition ${
                        allocateForm.countryCode === country
                          ? 'bg-[#00ff88]/20 border-2 border-[#00ff88]/60 text-[#00ff88]'
                          : 'bg-white/5 border border-white/20 text-white/60 hover:border-white/40'
                      }`}
                    >
                      <div className="text-lg font-mono">{country}</div>
                      <div className="text-[10px] text-white/60">
                        {country === 'AE' && (isSpanish ? 'Emiratos' : 'Emirates')}
                        {country === 'DE' && (isSpanish ? 'Alemania' : 'Germany')}
                        {country === 'ES' && (isSpanish ? 'España' : 'Spain')}
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {allocateForm.countryCode === 'AE' && (
                <div>
                  <label className="block text-sm font-medium text-white/70 mb-2">
                    {isSpanish ? 'Moneda del IBAN (UAE soporta 3 divisas)' : 'IBAN Currency (UAE supports 3 currencies)'}
                  </label>
                  <div className="grid grid-cols-3 gap-3">
                    {(['AED', 'USD', 'EUR'] as const).map(curr => (
                      <button
                        key={curr}
                        type="button"
                        onClick={() => setAllocateForm({ ...allocateForm, currency: curr })}
                        className={`px-4 py-3 rounded-xl font-semibold transition ${
                          allocateForm.currency === curr
                            ? 'bg-cyan-500/20 border-2 border-cyan-400/60 text-cyan-300'
                            : 'bg-white/5 border border-white/20 text-white/60 hover:border-white/40'
                        }`}
                      >
                        <div className="text-lg font-mono">{curr}</div>
                        <div className="text-[10px] text-white/60">
                          {curr === 'AED' && (isSpanish ? 'Dirham' : 'Dirham')}
                          {curr === 'USD' && (isSpanish ? 'Dólar' : 'Dollar')}
                          {curr === 'EUR' && (isSpanish ? 'Euro' : 'Euro')}
                        </div>
                      </button>
                    ))}
                  </div>
                  <p className="text-xs text-cyan-200/60 mt-2">
                    {isSpanish 
                      ? 'Digital Commercial Bank Ltd emite IBANs de UAE en las 3 divisas principales'
                      : 'Digital Commercial Bank Ltd issues UAE IBANs in 3 major currencies'}
                  </p>
                </div>
              )}

              <div className="bg-cyan-500/10 border border-cyan-400/30 rounded-xl p-4 text-sm">
                <p className="text-cyan-300 font-semibold mb-2">
                  {isSpanish ? 'IBAN que se generará:' : 'IBAN to be generated:'}
                </p>
                <div className="space-y-1 text-white/70">
                  <p><span className="text-white/50">{isSpanish ? 'Banco emisor:' : 'Issuing bank:'}</span> Digital Commercial Bank Ltd</p>
                  <p className="text-xs text-white/60">
                    B2B Tower, 15th Floor, Marasi Drive<br />
                    Business Bay, Dubai, UAE
                  </p>
                  <p className="mt-2"><span className="text-white/50">{isSpanish ? 'Licencia bancaria:' : 'Banking license:'}</span> L 15446</p>
                  <p><span className="text-white/50">SWIFT/BIC:</span> DIGCUSXX</p>
                  <p><span className="text-white/50">{isSpanish ? 'País del IBAN:' : 'IBAN country:'}</span> {allocateForm.countryCode} - {
                    allocateForm.countryCode === 'AE' ? (isSpanish ? 'Emiratos Árabes Unidos' : 'United Arab Emirates') :
                    allocateForm.countryCode === 'DE' ? (isSpanish ? 'Alemania' : 'Germany') :
                    (isSpanish ? 'España' : 'Spain')
                  }</p>
                  <p><span className="text-white/50">{isSpanish ? 'Código de banco:' : 'Bank code:'}</span> {allocateForm.countryCode === 'AE' ? '026' : allocateForm.countryCode === 'DE' ? '37040044' : '2100'}</p>
                  {allocateForm.countryCode === 'AE' && (
                    <p><span className="text-white/50">{isSpanish ? 'Moneda:' : 'Currency:'}</span> <span className="text-cyan-300 font-semibold">{allocateForm.currency}</span></p>
                  )}
                  <p className="text-xs text-cyan-200/60 mt-2">
                    {isSpanish 
                      ? '✓ IBAN generado cumplirá con ISO 13616 (mod 97)'
                      : '✓ Generated IBAN will comply with ISO 13616 (mod 97)'}
                  </p>
                  {allocateForm.countryCode === 'AE' && (
                    <p className="text-xs text-cyan-200/60">
                      {isSpanish 
                        ? '✓ UAE permite múltiples divisas en IBANs del mismo banco'
                        : '✓ UAE allows multiple currencies in IBANs from the same bank'}
                    </p>
                  )}
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  onClick={handleAllocateIban}
                  disabled={loading}
                  className="flex-1 flex items-center justify-center gap-2 bg-[#00ff88]/20 border border-[#00ff88]/60 text-[#00ff88] rounded-xl py-3 font-semibold hover:bg-[#00ff88]/30 transition disabled:opacity-50"
                >
                  <Plus className="w-5 h-5" />
                  {loading ? (isSpanish ? 'Emitiendo...' : 'Issuing...') : (isSpanish ? 'Emitir IBAN' : 'Issue IBAN')}
                </button>
                <button
                  onClick={() => setShowAllocateModal(false)}
                  className="px-6 py-3 rounded-xl border border-white/20 text-white/80 hover:border-white/40 transition"
                >
                  {isSpanish ? 'Cancelar' : 'Cancel'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal Cambiar Status */}
      {showStatusModal && selectedIban && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setShowStatusModal(false)}>
          <div className="bg-gradient-to-br from-[#0a0f1c] to-[#000] border border-cyan-400/30 rounded-3xl p-6 max-w-2xl w-full" onClick={e => e.stopPropagation()}>
            <div className="flex items-center gap-3 mb-6">
              <Shield className="w-6 h-6 text-cyan-300" />
              <div>
                <h2 className="text-2xl font-bold">
                  {isSpanish ? 'Cambiar estado del IBAN' : 'Change IBAN status'}
                </h2>
                <p className="text-sm text-white/60 font-mono">{selectedIban.ibanFormatted}</p>
              </div>
            </div>

            <div className="bg-white/5 border border-white/10 rounded-xl p-4 mb-6 text-sm">
              <p className="text-white/60">{isSpanish ? 'Estado actual:' : 'Current status:'} <span className="text-white font-semibold">{selectedIban.status}</span></p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-white/70 mb-2">
                  {isSpanish ? 'Nuevo estado' : 'New status'}
                </label>
                <div className="grid grid-cols-3 gap-3">
                  {(['ACTIVE', 'BLOCKED', 'CLOSED'] as const).map(status => (
                    <button
                      key={status}
                      type="button"
                      onClick={() => setStatusForm({ ...statusForm, newStatus: status })}
                      className={`px-4 py-3 rounded-xl font-semibold transition ${
                        statusForm.newStatus === status
                          ? status === 'ACTIVE'
                            ? 'bg-green-500/20 border-2 border-green-400/60 text-green-300'
                            : status === 'BLOCKED'
                            ? 'bg-orange-500/20 border-2 border-orange-400/60 text-orange-300'
                            : 'bg-gray-500/20 border-2 border-gray-400/60 text-gray-300'
                          : 'bg-white/5 border border-white/20 text-white/60 hover:border-white/40'
                      }`}
                    >
                      {status}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-white/70 mb-2">
                  {isSpanish ? 'Razón (opcional)' : 'Reason (optional)'}
                </label>
                <input
                  type="text"
                  value={statusForm.reason}
                  onChange={e => setStatusForm({ ...statusForm, reason: e.target.value })}
                  className="w-full bg-black/40 border border-white/20 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-cyan-400/40"
                  placeholder={isSpanish ? 'KYC completado, verificación de compliance, etc.' : 'KYC completed, compliance check, etc.'}
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  onClick={handleChangeStatus}
                  disabled={loading}
                  className="flex-1 flex items-center justify-center gap-2 bg-cyan-500/20 border border-cyan-400/60 text-cyan-300 rounded-xl py-3 font-semibold hover:bg-cyan-500/30 transition disabled:opacity-50"
                >
                  <CheckCircle className="w-5 h-5" />
                  {loading ? (isSpanish ? 'Actualizando...' : 'Updating...') : (isSpanish ? 'Actualizar' : 'Update')}
                </button>
                <button
                  onClick={() => setShowStatusModal(false)}
                  className="px-6 py-3 rounded-xl border border-white/20 text-white/80 hover:border-white/40 transition"
                >
                  {isSpanish ? 'Cancelar' : 'Cancel'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal Audit */}
      {showAuditModal && selectedIban && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setShowAuditModal(false)}>
          <div className="bg-gradient-to-br from-[#0a0f1c] to-[#000] border border-purple-400/30 rounded-3xl p-6 max-w-3xl w-full max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <Shield className="w-6 h-6 text-purple-300" />
                <div>
                  <h2 className="text-2xl font-bold">
                    {isSpanish ? 'Historial de auditoría' : 'Audit trail'}
                  </h2>
                  <p className="text-sm text-white/60 font-mono">{selectedIban.ibanFormatted}</p>
                </div>
              </div>
              <button
                onClick={() => setShowAuditModal(false)}
                className="px-4 py-2 rounded-xl border border-white/20 text-white/80 hover:border-white/40 transition"
              >
                {isSpanish ? 'Cerrar' : 'Close'}
              </button>
            </div>

            <div className="space-y-3">
              {auditLogs.map(log => (
                <div key={log.id} className="bg-white/5 border border-white/10 rounded-xl p-4">
                  <div className="flex items-start justify-between gap-4 mb-2">
                    <div>
                      <p className="font-semibold text-purple-300">{log.actionType}</p>
                      <p className="text-xs text-white/50">
                        {new Date(log.createdAt).toLocaleString(isSpanish ? 'es-ES' : 'en-US')}
                      </p>
                    </div>
                    <div className="text-right text-sm">
                      <p className="text-white/60">{isSpanish ? 'Por:' : 'By:'}</p>
                      <p className="text-white font-semibold">{log.performedBy}</p>
                    </div>
                  </div>
                  {log.previousStatus && log.newStatus && (
                    <div className="flex items-center gap-2 text-sm mt-2">
                      <span className="px-2 py-1 rounded bg-white/10 text-white/70">{log.previousStatus}</span>
                      <span className="text-white/40">→</span>
                      <span className="px-2 py-1 rounded bg-[#00ff88]/20 text-[#00ff88]">{log.newStatus}</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

