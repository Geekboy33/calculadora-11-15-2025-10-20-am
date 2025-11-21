/**
 * Bank Settlement Module - DAES CoreBanking
 * Gestión de instrucciones de liquidación bancaria hacia Emirates NBD
 */

import { useState, useEffect } from 'react';
import {
  Building2,
  Send,
  CheckCircle,
  XCircle,
  Clock,
  FileText,
  Download,
  Shield,
  TrendingDown,
  AlertCircle,
  RefreshCw,
  Eye,
  Wallet,
  DollarSign
} from 'lucide-react';
import { useLanguage } from '../lib/i18n';
import { useToast } from './ui/Toast';
import { custodyStore, type CustodyAccount } from '../lib/custody-store';

interface Settlement {
  id: string;
  daesReferenceId: string;
  amount: string;
  currency: string;
  beneficiaryName: string;
  beneficiaryIban: string;
  swiftCode: string;
  referenceText?: string;
  status: 'PENDING' | 'SENT' | 'COMPLETED' | 'FAILED';
  ledgerDebitId: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  enbdTransactionReference?: string;
  executedBy?: string;
  executedAt?: string;
  failureReason?: string;
}

interface AuditLogEntry {
  id: string;
  actionType: string;
  performedBy: string;
  previousStatus?: string;
  newStatus?: string;
  timestamp: string;
  metadata?: Record<string, any>;
}

export function BankSettlementModule() {
  const { language } = useLanguage();
  const isSpanish = language === 'es';
  const { addToast } = useToast();

  const [settlements, setSettlements] = useState<Settlement[]>([]);
  const [selectedSettlement, setSelectedSettlement] = useState<Settlement | null>(null);
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [showAuditModal, setShowAuditModal] = useState(false);
  const [custodyAccounts, setCustodyAccounts] = useState<CustodyAccount[]>([]);

  // Form states
  const [createForm, setCreateForm] = useState({
    custodyAccountId: '',
    amount: 0,
    currency: 'USD' as 'AED' | 'USD' | 'EUR',
    reference: '',
    requestedBy: localStorage.getItem('daes_user') || 'user_default'
  });

  const [selectedCustodyAccount, setSelectedCustodyAccount] = useState<CustodyAccount | null>(null);

  const [confirmForm, setConfirmForm] = useState({
    status: 'COMPLETED' as 'COMPLETED' | 'FAILED' | 'SENT',
    enbdTransactionReference: '',
    failureReason: '',
    executedBy: localStorage.getItem('daes_user') || 'manager_default'
  });

  const API_BASE = 'http://localhost:3001';

  useEffect(() => {
    loadSettlements();
    loadCustodyAccounts();

    // Suscribirse a cambios en custody accounts
    const unsubscribe = custodyStore.subscribe(accounts => {
      setCustodyAccounts(accounts);
      
      // Actualizar cuenta seleccionada si cambió
      if (createForm.custodyAccountId) {
        const updated = accounts.find(a => a.id === createForm.custodyAccountId);
        setSelectedCustodyAccount(updated || null);
      }
    });

    return unsubscribe;
  }, [createForm.custodyAccountId]);

  const loadSettlements = () => {
    try {
      // Cargar desde localStorage (simulado)
      const saved = localStorage.getItem('bank_settlements');
      if (saved) {
        setSettlements(JSON.parse(saved));
      }
    } catch (error) {
      console.error('[BankSettlement] Error cargando settlements:', error);
    }
  };

  const loadCustodyAccounts = () => {
    const accounts = custodyStore.getAccounts();
    setCustodyAccounts(accounts);
    console.log('[BankSettlement] ✅ Custody accounts cargadas:', accounts.length);
  };

  const handleCreateSettlement = async () => {
    if (!createForm.custodyAccountId) {
      addToast({
        type: 'error',
        title: isSpanish ? 'Cuenta requerida' : 'Account required',
        description: isSpanish ? 'Selecciona una cuenta custody' : 'Select a custody account'
      });
      return;
    }

    if (createForm.amount <= 0) {
      addToast({
        type: 'error',
        title: isSpanish ? 'Monto inválido' : 'Invalid amount',
        description: isSpanish ? 'El monto debe ser mayor a cero' : 'Amount must be greater than zero'
      });
      return;
    }

    setLoading(true);
    try {
      // Obtener cuenta custody seleccionada
      const custodyAccount = custodyAccounts.find(a => a.id === createForm.custodyAccountId);
      
      if (!custodyAccount) {
        throw new Error(isSpanish ? 'Cuenta custody no encontrada' : 'Custody account not found');
      }

      // Validar que la moneda coincida
      if (custodyAccount.currency !== createForm.currency) {
        addToast({
          type: 'error',
          title: isSpanish ? 'Moneda incorrecta' : 'Wrong currency',
          description: isSpanish
            ? `La cuenta ${custodyAccount.accountName} es ${custodyAccount.currency}, no ${createForm.currency}`
            : `Account ${custodyAccount.accountName} is ${custodyAccount.currency}, not ${createForm.currency}`
        });
        setLoading(false);
        return;
      }

      // Validar fondos disponibles en custody account
      if (custodyAccount.availableBalance < createForm.amount) {
        addToast({
          type: 'error',
          title: isSpanish ? 'Fondos insuficientes' : 'Insufficient funds',
          description: isSpanish
            ? `Disponible: ${custodyAccount.currency} ${custodyAccount.availableBalance.toLocaleString()}`
            : `Available: ${custodyAccount.currency} ${custodyAccount.availableBalance.toLocaleString()}`
        });
        setLoading(false);
        return;
      }

      // Generar ID y reference
      const id = crypto.randomUUID();
      const date = new Date();
      const dateStr = date.toISOString().split('T')[0].replace(/-/g, '');
      const random = Math.random().toString(36).substring(2, 8).toUpperCase();
      const daesReferenceId = `DAES-SET-${dateStr}-${random}`;
      const ledgerDebitId = `LEDGER-DEB-${dateStr}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;

      // Mapear IBAN según moneda
      const ibanMap = {
        AED: 'AE610260001015381452401',
        USD: 'AE690260001025381452402',
        EUR: 'AE420260001025381452403'
      };

      const newSettlement: Settlement = {
        id,
        daesReferenceId,
        amount: createForm.amount.toFixed(2),
        currency: createForm.currency,
        beneficiaryName: 'TRADEMORE VALUE CAPITAL FZE',
        beneficiaryIban: ibanMap[createForm.currency],
        swiftCode: 'EBILAEADXXX',
        referenceText: createForm.reference || `Settlement from ${custodyAccount.accountName}`,
        status: 'PENDING',
        ledgerDebitId,
        createdBy: createForm.requestedBy,
        createdAt: date.toISOString(),
        updatedAt: date.toISOString()
      };

      // Usar custody-transfer-handler para débito completo
      const { custodyTransferHandler } = await import('../lib/custody-transfer-handler');
      
      const transferResult = await custodyTransferHandler.executeTransfer({
        fromAccountId: createForm.custodyAccountId,
        toDestination: 'TRADEMORE VALUE CAPITAL FZE (ENBD)',
        amount: createForm.amount,
        currency: createForm.currency,
        reference: daesReferenceId,
        description: `Bank Settlement to ENBD - ${createForm.reference || 'No reference'}`,
        beneficiaryName: 'TRADEMORE VALUE CAPITAL FZE',
        destinationType: 'external'
      });

      if (!transferResult.success) {
        throw new Error(transferResult.error || 'Transfer failed');
      }

      console.log('[BankSettlement] ✅ TRANSFERENCIA COMPLETA CON SINCRONIZACIÓN:', {
        transferId: transferResult.transferId,
        custodyAccount: custodyAccount.accountName,
        oldBalance: transferResult.oldBalance,
        newBalance: transferResult.newBalance,
        amount: createForm.amount,
        currency: createForm.currency,
        daesReferenceId,
        ledgerDebitId
      });
      console.log('[BankSettlement] ✅ Custody Account actualizada');
      console.log('[BankSettlement] ✅ Account Ledger debitado');
      console.log('[BankSettlement] ✅ Black Screen sincronizado');
      console.log('[BankSettlement] ✅ Transaction Events registrado');

      // Registrar evento específico de Bank Settlement
      const { transactionEventStore } = await import('../lib/transaction-event-store');
      transactionEventStore.recordEvent(
        'TRANSFER_CREATED',
        'SYSTEM',
        `Bank Settlement ENBD: ${daesReferenceId}`,
        {
          amount: createForm.amount,
          currency: createForm.currency,
          accountId: custodyAccount.id,
          accountName: custodyAccount.accountName,
          reference: daesReferenceId,
          status: 'COMPLETED',
          metadata: {
            settlementId: id,
            bankCode: 'ENBD',
            beneficiary: 'TRADEMORE VALUE CAPITAL FZE',
            iban: ibanMap[createForm.currency],
            swift: 'EBILAEADXXX',
            ledgerDebitId,
            custodyAccountNumber: custodyAccount.accountNumber,
            operation: 'BANK_SETTLEMENT_OUTBOUND'
          }
        }
      );

      // Guardar settlement
      const updated = [newSettlement, ...settlements];
      setSettlements(updated);
      localStorage.setItem('bank_settlements', JSON.stringify(updated));

      // Recargar custody accounts
      loadCustodyAccounts();

      addToast({
        type: 'success',
        title: isSpanish ? 'Settlement creado' : 'Settlement created',
        description: isSpanish
          ? `${daesReferenceId}\n${createForm.currency} ${createForm.amount.toLocaleString()}\nDe: ${custodyAccount.accountName}\n✅ Sincronizado con todo el sistema`
          : `${daesReferenceId}\n${createForm.currency} ${createForm.amount.toLocaleString()}\nFrom: ${custodyAccount.accountName}\n✅ Synced across the system`
      });

      setShowCreateModal(false);
      setCreateForm({
        custodyAccountId: '',
        amount: 0,
        currency: 'USD',
        reference: '',
        requestedBy: createForm.requestedBy
      });

    } catch (error: any) {
      console.error('[BankSettlement] Error:', error);
      addToast({
        type: 'error',
        title: isSpanish ? 'Error' : 'Error',
        description: error.message
      });
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmSettlement = async () => {
    if (!selectedSettlement) return;

    setLoading(true);
    try {
      const updated = { ...selectedSettlement };
      updated.status = confirmForm.status;
      updated.executedBy = confirmForm.executedBy;
      updated.executedAt = new Date().toISOString();
      updated.updatedAt = new Date().toISOString();

      if (confirmForm.status === 'COMPLETED' && confirmForm.enbdTransactionReference) {
        updated.enbdTransactionReference = confirmForm.enbdTransactionReference;
      }

      if (confirmForm.status === 'FAILED' && confirmForm.failureReason) {
        updated.failureReason = confirmForm.failureReason;
      }

      const allSettlements = settlements.map(s => s.id === updated.id ? updated : s);
      setSettlements(allSettlements);
      localStorage.setItem('bank_settlements', JSON.stringify(allSettlements));

      // Registrar en Transaction Events
      const { transactionEventStore } = await import('../lib/transaction-event-store');
      transactionEventStore.recordEvent(
        confirmForm.status === 'COMPLETED' ? 'TRANSFER_COMPLETED' : 'TRANSFER_CREATED',
        'SYSTEM',
        `Bank Settlement ${confirmForm.status}: ${updated.daesReferenceId}`,
        {
          amount: parseFloat(updated.amount),
          currency: updated.currency,
          reference: updated.daesReferenceId,
          status: confirmForm.status,
          metadata: {
            enbdTransactionReference: updated.enbdTransactionReference,
            executedBy: updated.executedBy,
            settlementId: updated.id
          }
        }
      );

      addToast({
        type: 'success',
        title: isSpanish ? 'Settlement confirmado' : 'Settlement confirmed',
        description: `${updated.daesReferenceId} → ${confirmForm.status}`
      });

      setShowConfirmModal(false);
      setSelectedSettlement(null);

    } catch (error: any) {
      console.error('[BankSettlement] Error confirmando:', error);
      addToast({
        type: 'error',
        title: isSpanish ? 'Error' : 'Error',
        description: error.message
      });
    } finally {
      setLoading(false);
    }
  };

  const handleShowAuditLog = (settlement: Settlement) => {
    setSelectedSettlement(settlement);
    // Simular audit logs
    const logs: AuditLogEntry[] = [
      {
        id: crypto.randomUUID(),
        actionType: 'CREATE_INSTRUCTION',
        performedBy: settlement.createdBy,
        newStatus: 'PENDING',
        timestamp: settlement.createdAt
      }
    ];

    if (settlement.executedBy) {
      logs.push({
        id: crypto.randomUUID(),
        actionType: 'UPDATE_STATUS',
        performedBy: settlement.executedBy,
        previousStatus: 'PENDING',
        newStatus: settlement.status,
        timestamp: settlement.executedAt || settlement.updatedAt
      });
    }

    setAuditLogs(logs);
    setShowAuditModal(true);
  };

  const downloadReport = () => {
    const csv = ['DAES Reference,Currency,Amount,IBAN,ENBD Ref,Status,Executed By,Executed At'];
    
    settlements.forEach(s => {
      csv.push([
        s.daesReferenceId,
        s.currency,
        s.amount,
        s.beneficiaryIban,
        s.enbdTransactionReference || '',
        s.status,
        s.executedBy || '',
        s.executedAt || ''
      ].join(','));
    });

    const blob = new Blob([csv.join('\n')], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `DAES_Bank_Settlements_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);

    addToast({
      type: 'success',
      title: isSpanish ? 'Reporte descargado' : 'Report downloaded',
      description: `${settlements.length} ${isSpanish ? 'registros' : 'records'}`
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'COMPLETED': return 'bg-green-500/20 text-green-300 border-green-500/40';
      case 'PENDING': return 'bg-yellow-500/20 text-yellow-300 border-yellow-500/40';
      case 'SENT': return 'bg-blue-500/20 text-blue-300 border-blue-500/40';
      case 'FAILED': return 'bg-red-500/20 text-red-300 border-red-500/40';
      default: return 'bg-gray-500/20 text-gray-300 border-gray-500/40';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'COMPLETED': return <CheckCircle className="w-4 h-4" />;
      case 'PENDING': return <Clock className="w-4 h-4" />;
      case 'SENT': return <Send className="w-4 h-4" />;
      case 'FAILED': return <XCircle className="w-4 h-4" />;
      default: return <AlertCircle className="w-4 h-4" />;
    }
  };

  const stats = {
    total: settlements.length,
    pending: settlements.filter(s => s.status === 'PENDING').length,
    completed: settlements.filter(s => s.status === 'COMPLETED').length,
    failed: settlements.filter(s => s.status === 'FAILED').length,
    totalAmount: settlements.reduce((sum, s) => sum + parseFloat(s.amount), 0)
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#030712] via-[#050b1c] to-[#000] text-white p-6">
      <div className="flex flex-col gap-2 mb-8">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Building2 className="w-8 h-8 text-[#00ff88]" />
            <div>
              <h1 className="text-3xl font-bold tracking-tight">
                {isSpanish ? 'Liquidaciones Bancarias' : 'Bank Settlements'}
              </h1>
              <p className="text-white/70">
                {isSpanish ? 'Emirates NBD (ENBD) · TRADEMORE VALUE CAPITAL FZE' : 'Emirates NBD (ENBD) · TRADEMORE VALUE CAPITAL FZE'}
              </p>
            </div>
          </div>
          <div className="flex gap-3">
            <button
              onClick={loadSettlements}
              className="flex items-center gap-2 px-4 py-2 bg-white/5 border border-white/20 rounded-xl hover:border-white/40 transition"
            >
              <RefreshCw className="w-4 h-4" />
              {isSpanish ? 'Actualizar' : 'Refresh'}
            </button>
            <button
              onClick={downloadReport}
              className="flex items-center gap-2 px-4 py-2 bg-green-500/10 border border-green-400/30 rounded-xl text-green-300 hover:bg-green-500/20 transition"
            >
              <Download className="w-4 h-4" />
              {isSpanish ? 'Descargar reporte' : 'Download report'}
            </button>
            <button
              onClick={() => setShowCreateModal(true)}
              className="flex items-center gap-2 px-6 py-2 bg-[#00ff88]/20 border border-[#00ff88]/40 text-[#00ff88] rounded-xl font-semibold hover:bg-[#00ff88]/30 transition"
            >
              <Send className="w-5 h-5" />
              {isSpanish ? 'Nueva liquidación' : 'New settlement'}
            </button>
          </div>
        </div>
      </div>

      {/* Estadísticas */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
          <div className="flex items-center gap-3 mb-2">
            <FileText className="w-5 h-5 text-cyan-300" />
            <span className="text-sm text-white/60">{isSpanish ? 'Total' : 'Total'}</span>
          </div>
          <p className="text-3xl font-bold">{stats.total}</p>
        </div>
        <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
          <div className="flex items-center gap-3 mb-2">
            <Clock className="w-5 h-5 text-yellow-300" />
            <span className="text-sm text-white/60">{isSpanish ? 'Pendientes' : 'Pending'}</span>
          </div>
          <p className="text-3xl font-bold text-yellow-300">{stats.pending}</p>
        </div>
        <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
          <div className="flex items-center gap-3 mb-2">
            <CheckCircle className="w-5 h-5 text-green-300" />
            <span className="text-sm text-white/60">{isSpanish ? 'Completados' : 'Completed'}</span>
          </div>
          <p className="text-3xl font-bold text-green-300">{stats.completed}</p>
        </div>
        <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
          <div className="flex items-center gap-3 mb-2">
            <TrendingDown className="w-5 h-5 text-[#00ff88]" />
            <span className="text-sm text-white/60">{isSpanish ? 'Total enviado' : 'Total sent'}</span>
          </div>
          <p className="text-2xl font-bold text-[#00ff88]">USD {stats.totalAmount.toLocaleString()}</p>
        </div>
      </div>

      {/* Lista de settlements */}
      <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Shield className="w-5 h-5 text-purple-300" />
          {isSpanish ? 'Instrucciones de liquidación' : 'Settlement instructions'}
        </h2>

        {settlements.length === 0 ? (
          <div className="text-center py-12 text-white/60">
            {isSpanish
              ? 'No hay liquidaciones bancarias. Crea una para comenzar.'
              : 'No bank settlements. Create one to start.'}
          </div>
        ) : (
          <div className="space-y-3 max-h-[calc(100vh-500px)] overflow-y-auto pr-2">
            {settlements.map(settlement => (
              <div
                key={settlement.id}
                className="bg-black/40 border border-white/10 rounded-xl p-5 hover:border-[#00ff88]/30 transition"
              >
                <div className="flex flex-wrap gap-4 justify-between items-start mb-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className="text-xl font-semibold font-mono">{settlement.daesReferenceId}</h3>
                      <span className={`px-3 py-1 rounded-full text-xs font-semibold border ${getStatusColor(settlement.status)} flex items-center gap-1`}>
                        {getStatusIcon(settlement.status)}
                        {settlement.status}
                      </span>
                    </div>
                    <div className="grid md:grid-cols-2 gap-x-6 gap-y-2 text-sm">
                      <div>
                        <span className="text-white/50">{isSpanish ? 'Monto:' : 'Amount:'}</span>
                        <span className="text-[#00ff88] font-semibold ml-2">
                          {settlement.currency} {parseFloat(settlement.amount).toLocaleString()}
                        </span>
                      </div>
                      <div>
                        <span className="text-white/50">IBAN:</span>
                        <span className="text-white/80 ml-2 font-mono text-xs">{settlement.beneficiaryIban}</span>
                      </div>
                      <div>
                        <span className="text-white/50">{isSpanish ? 'Creado por:' : 'Created by:'}</span>
                        <span className="text-white/80 ml-2">{settlement.createdBy}</span>
                      </div>
                      <div>
                        <span className="text-white/50">{isSpanish ? 'Fecha:' : 'Date:'}</span>
                        <span className="text-white/80 ml-2">
                          {new Date(settlement.createdAt).toLocaleString(isSpanish ? 'es-ES' : 'en-US')}
                        </span>
                      </div>
                      {settlement.enbdTransactionReference && (
                        <div className="md:col-span-2">
                          <span className="text-white/50">ENBD Ref:</span>
                          <span className="text-cyan-300 ml-2 font-mono">{settlement.enbdTransactionReference}</span>
                        </div>
                      )}
                      {settlement.referenceText && (
                        <div className="md:col-span-2">
                          <span className="text-white/50">{isSpanish ? 'Referencia:' : 'Reference:'}</span>
                          <span className="text-white/80 ml-2">{settlement.referenceText}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-col gap-2">
                    {settlement.status === 'PENDING' && (
                      <button
                        onClick={() => {
                          setSelectedSettlement(settlement);
                          setShowConfirmModal(true);
                        }}
                        className="px-4 py-2 rounded-xl bg-cyan-500/10 border border-cyan-400/30 text-cyan-300 text-sm font-semibold hover:bg-cyan-500/20 transition"
                      >
                        {isSpanish ? 'Confirmar ejecución' : 'Confirm execution'}
                      </button>
                    )}
                    <button
                      onClick={() => handleShowAuditLog(settlement)}
                      className="px-4 py-2 rounded-xl bg-purple-500/10 border border-purple-400/30 text-purple-300 text-sm font-semibold hover:bg-purple-500/20 transition flex items-center gap-2"
                    >
                      <Eye className="w-4 h-4" />
                      {isSpanish ? 'Audit log' : 'Audit log'}
                    </button>
                  </div>
                </div>

                {settlement.failureReason && (
                  <div className="mt-3 bg-red-500/10 border border-red-500/30 rounded-lg p-3 text-sm">
                    <span className="text-red-300 font-semibold">{isSpanish ? 'Razón de fallo:' : 'Failure reason:'}</span>
                    <p className="text-red-200 mt-1">{settlement.failureReason}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal de creación */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setShowCreateModal(false)}>
          <div className="bg-gradient-to-br from-[#0a0f1c] to-[#000] border border-[#00ff88]/30 rounded-3xl p-6 max-w-2xl w-full" onClick={e => e.stopPropagation()}>
            <div className="flex items-center gap-3 mb-6">
              <Send className="w-6 h-6 text-[#00ff88]" />
              <h2 className="text-2xl font-bold">
                {isSpanish ? 'Nueva instrucción de liquidación' : 'New settlement instruction'}
              </h2>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-white/70 mb-2 flex items-center gap-2">
                  <Wallet className="w-4 h-4" />
                  {isSpanish ? 'Cuenta Custody origen' : 'Source Custody Account'}
                </label>
                <select
                  value={createForm.custodyAccountId}
                  onChange={e => {
                    const accountId = e.target.value;
                    const account = custodyAccounts.find(a => a.id === accountId);
                    
                    console.log('[BankSettlement] Cuenta seleccionada:', {
                      id: accountId,
                      account: account?.accountName,
                      currency: account?.currency,
                      total: account?.totalBalance,
                      available: account?.availableBalance,
                      reserved: account?.reservedBalance
                    });
                    
                    setSelectedCustodyAccount(account || null);
                    setCreateForm({
                      ...createForm,
                      custodyAccountId: accountId,
                      currency: (account?.currency || 'USD') as 'AED' | 'USD' | 'EUR',
                      amount: 0 // Reset amount al cambiar cuenta
                    });
                  }}
                  className="w-full bg-black/40 border border-white/20 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-[#00ff88]/40"
                  required
                >
                  <option value="">
                    {isSpanish ? '-- Seleccionar cuenta --' : '-- Select account --'}
                  </option>
                  {custodyAccounts
                    .filter(a => ['AED', 'USD', 'EUR'].includes(a.currency))
                    .map(account => (
                      <option key={account.id} value={account.id}>
                        {account.accountName} ({account.accountNumber}) · {account.currency} {account.availableBalance.toLocaleString()} {isSpanish ? 'disponible' : 'available'}
                      </option>
                    ))}
                </select>
                {custodyAccounts.filter(a => ['AED', 'USD', 'EUR'].includes(a.currency)).length === 0 && (
                  <p className="text-xs text-red-300 mt-2 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" />
                    {isSpanish
                      ? 'No hay cuentas custody con AED/USD/EUR. Crea una en el módulo Custody Accounts.'
                      : 'No custody accounts with AED/USD/EUR. Create one in Custody Accounts module.'}
                  </p>
                )}
              </div>

              {selectedCustodyAccount && (
                <div className="bg-purple-500/10 border border-purple-400/30 rounded-xl p-5">
                  <p className="text-purple-300 font-semibold mb-3 flex items-center gap-2">
                    <DollarSign className="w-5 h-5" />
                    {isSpanish ? 'Balance de cuenta seleccionada:' : 'Selected account balance:'}
                  </p>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-black/30 rounded-lg p-3">
                      <span className="text-white/50 text-xs uppercase tracking-wider block mb-1">
                        {isSpanish ? 'Total' : 'Total'}
                      </span>
                      <p className="text-white font-bold text-lg">
                        {selectedCustodyAccount.currency} {selectedCustodyAccount.totalBalance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </p>
                    </div>
                    <div className="bg-black/30 rounded-lg p-3">
                      <span className="text-white/50 text-xs uppercase tracking-wider block mb-1">
                        {isSpanish ? 'Disponible' : 'Available'}
                      </span>
                      <p className="text-[#00ff88] font-bold text-lg">
                        {selectedCustodyAccount.currency} {selectedCustodyAccount.availableBalance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </p>
                    </div>
                    <div className="bg-black/30 rounded-lg p-3">
                      <span className="text-white/50 text-xs uppercase tracking-wider block mb-1">
                        {isSpanish ? 'Reservado' : 'Reserved'}
                      </span>
                      <p className="text-orange-300 font-bold text-lg">
                        {selectedCustodyAccount.currency} {selectedCustodyAccount.reservedBalance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </p>
                    </div>
                    <div className="bg-black/30 rounded-lg p-3">
                      <span className="text-white/50 text-xs uppercase tracking-wider block mb-1">
                        {isSpanish ? 'Tipo' : 'Type'}
                      </span>
                      <p className="text-white/80 capitalize font-semibold">
                        {selectedCustodyAccount.accountType === 'banking' 
                          ? (isSpanish ? 'Bancaria' : 'Banking')
                          : 'Blockchain'}
                      </p>
                    </div>
                  </div>
                  <div className="mt-3 pt-3 border-t border-purple-400/20">
                    <p className="text-xs text-purple-200/70">
                      <span className="font-semibold">{isSpanish ? 'Número de cuenta:' : 'Account number:'}</span> {selectedCustodyAccount.accountNumber}
                    </p>
                  </div>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-white/70 mb-2">
                  {isSpanish ? 'Monto a transferir' : 'Amount to transfer'}
                </label>
                <input
                  type="number"
                  value={createForm.amount || ''}
                  onChange={e => setCreateForm({ ...createForm, amount: parseFloat(e.target.value) || 0 })}
                  className="w-full bg-black/40 border border-white/20 rounded-xl px-4 py-3 text-white text-lg font-semibold focus:outline-none focus:ring-2 focus:ring-[#00ff88]/40"
                  placeholder="1000000.00"
                  min="0"
                  step="0.01"
                  disabled={!createForm.custodyAccountId}
                />
                {selectedCustodyAccount && createForm.amount > 0 && (
                  <div className="mt-3 p-3 bg-black/40 border border-white/10 rounded-lg">
                    <div className="flex justify-between items-center text-sm mb-2">
                      <span className="text-white/60">{isSpanish ? 'Balance actual:' : 'Current balance:'}</span>
                      <span className="text-white font-semibold">
                        {selectedCustodyAccount.currency} {selectedCustodyAccount.availableBalance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                    </div>
                    <div className="flex justify-between items-center text-sm mb-2">
                      <span className="text-white/60">{isSpanish ? 'Monto a debitar:' : 'Amount to debit:'}</span>
                      <span className="text-red-300 font-semibold">
                        - {selectedCustodyAccount.currency} {createForm.amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                    </div>
                    <div className="flex justify-between items-center text-sm pt-2 border-t border-white/10">
                      <span className="text-white/70 font-semibold">{isSpanish ? 'Nuevo balance disponible:' : 'New available balance:'}</span>
                      <span className={`font-bold text-lg ${selectedCustodyAccount.availableBalance - createForm.amount >= 0 ? 'text-[#00ff88]' : 'text-red-400'}`}>
                        {selectedCustodyAccount.currency} {(selectedCustodyAccount.availableBalance - createForm.amount).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                    </div>
                    {selectedCustodyAccount.availableBalance - createForm.amount < 0 && (
                      <p className="text-xs text-red-300 mt-2 flex items-center gap-1">
                        <AlertCircle className="w-3 h-3" />
                        {isSpanish ? 'Fondos insuficientes' : 'Insufficient funds'}
                      </p>
                    )}
                  </div>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-white/70 mb-2">
                  {isSpanish ? 'Moneda destino' : 'Destination currency'}
                </label>
                <div className="bg-white/5 border border-white/10 rounded-xl px-4 py-3">
                  <p className="text-white font-semibold">{createForm.currency}</p>
                  <p className="text-xs text-white/50 mt-1">
                    {isSpanish ? 'Se ajusta automáticamente según la cuenta seleccionada' : 'Automatically set based on selected account'}
                  </p>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-white/70 mb-2">
                  {isSpanish ? 'Referencia' : 'Reference'}
                </label>
                <input
                  type="text"
                  value={createForm.reference}
                  onChange={e => setCreateForm({ ...createForm, reference: e.target.value })}
                  className="w-full bg-black/40 border border-white/20 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-[#00ff88]/40"
                  placeholder={isSpanish ? 'Liquidación mensual Nov 2025' : 'Monthly settlement Nov 2025'}
                  maxLength={140}
                />
              </div>

              <div className="bg-cyan-500/10 border border-cyan-400/30 rounded-xl p-4 text-sm">
                <p className="text-cyan-300 font-semibold mb-2 flex items-center gap-2">
                  <Building2 className="w-4 h-4" />
                  {isSpanish ? 'Información del beneficiario:' : 'Beneficiary information:'}
                </p>
                <div className="space-y-1 text-white/70">
                  <p><span className="text-white/50">Bank:</span> EMIRATES NBD (ENBD)</p>
                  <p><span className="text-white/50">Location:</span> Dubai, United Arab Emirates</p>
                  <p><span className="text-white/50">Beneficiary:</span> TRADEMORE VALUE CAPITAL FZE</p>
                  <p><span className="text-white/50">SWIFT/BIC:</span> EBILAEADXXX</p>
                  <p>
                    <span className="text-white/50">IBAN ({createForm.currency}):</span>
                    <span className="text-cyan-300 ml-2 font-mono text-xs">
                      {createForm.currency === 'AED' && 'AE61 0260 0010 1538 1452 401'}
                      {createForm.currency === 'USD' && 'AE69 0260 0010 2538 1452 402'}
                      {createForm.currency === 'EUR' && 'AE42 0260 0010 2538 1452 403'}
                    </span>
                  </p>
                </div>
              </div>

              <div className="bg-orange-500/10 border border-orange-400/30 rounded-xl p-4 text-sm">
                <p className="text-orange-300 font-semibold mb-2 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4" />
                  {isSpanish ? 'Importante:' : 'Important:'}
                </p>
                <ul className="space-y-1 text-white/70 text-xs list-disc list-inside">
                  <li>{isSpanish ? 'El monto se debitará de la cuenta custody seleccionada' : 'Amount will be debited from selected custody account'}</li>
                  <li>{isSpanish ? 'Account Ledger y Black Screen se actualizarán automáticamente' : 'Account Ledger and Black Screen will update automatically'}</li>
                  <li>{isSpanish ? 'La transacción se registrará en Transaction Events' : 'Transaction will be logged in Transaction Events'}</li>
                  <li>{isSpanish ? 'Ejecuta manualmente en ENBD Online Banking después' : 'Execute manually in ENBD Online Banking after'}</li>
                </ul>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  onClick={handleCreateSettlement}
                  disabled={loading}
                  className="flex-1 flex items-center justify-center gap-2 bg-[#00ff88]/20 border border-[#00ff88]/60 text-[#00ff88] rounded-xl py-3 font-semibold hover:bg-[#00ff88]/30 transition disabled:opacity-50"
                >
                  <Send className="w-5 h-5" />
                  {loading ? (isSpanish ? 'Creando...' : 'Creating...') : (isSpanish ? 'Crear instrucción' : 'Create instruction')}
                </button>
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="px-6 py-3 rounded-xl border border-white/20 text-white/80 hover:border-white/40 transition"
                >
                  {isSpanish ? 'Cancelar' : 'Cancel'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal de confirmación */}
      {showConfirmModal && selectedSettlement && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setShowConfirmModal(false)}>
          <div className="bg-gradient-to-br from-[#0a0f1c] to-[#000] border border-cyan-400/30 rounded-3xl p-6 max-w-2xl w-full" onClick={e => e.stopPropagation()}>
            <div className="flex items-center gap-3 mb-6">
              <CheckCircle className="w-6 h-6 text-cyan-300" />
              <div>
                <h2 className="text-2xl font-bold">
                  {isSpanish ? 'Confirmar ejecución manual' : 'Confirm manual execution'}
                </h2>
                <p className="text-sm text-white/60">{selectedSettlement.daesReferenceId}</p>
              </div>
            </div>

            <div className="bg-white/5 border border-white/10 rounded-xl p-4 mb-6 text-sm space-y-2">
              <div className="flex justify-between">
                <span className="text-white/60">{isSpanish ? 'Monto:' : 'Amount:'}</span>
                <span className="text-white font-semibold">{selectedSettlement.currency} {parseFloat(selectedSettlement.amount).toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-white/60">IBAN:</span>
                <span className="text-white/80 font-mono text-xs">{selectedSettlement.beneficiaryIban}</span>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-white/70 mb-2">
                  {isSpanish ? 'Estado' : 'Status'}
                </label>
                <div className="grid grid-cols-3 gap-3">
                  {(['COMPLETED', 'FAILED', 'SENT'] as const).map(status => (
                    <button
                      key={status}
                      type="button"
                      onClick={() => setConfirmForm({ ...confirmForm, status })}
                      className={`px-4 py-3 rounded-xl font-semibold transition ${
                        confirmForm.status === status
                          ? status === 'COMPLETED'
                            ? 'bg-green-500/20 border-2 border-green-400/60 text-green-300'
                            : status === 'FAILED'
                            ? 'bg-red-500/20 border-2 border-red-400/60 text-red-300'
                            : 'bg-blue-500/20 border-2 border-blue-400/60 text-blue-300'
                          : 'bg-white/5 border border-white/20 text-white/60 hover:border-white/40'
                      }`}
                    >
                      {status}
                    </button>
                  ))}
                </div>
              </div>

              {confirmForm.status === 'COMPLETED' && (
                <div>
                  <label className="block text-sm font-medium text-white/70 mb-2">
                    {isSpanish ? 'Referencia ENBD' : 'ENBD Reference'}
                  </label>
                  <input
                    type="text"
                    value={confirmForm.enbdTransactionReference}
                    onChange={e => setConfirmForm({ ...confirmForm, enbdTransactionReference: e.target.value })}
                    className="w-full bg-black/40 border border-white/20 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-cyan-400/40"
                    placeholder="ENBD-TXN-20251121-ABC123"
                  />
                </div>
              )}

              {confirmForm.status === 'FAILED' && (
                <div>
                  <label className="block text-sm font-medium text-white/70 mb-2">
                    {isSpanish ? 'Razón de fallo' : 'Failure reason'}
                  </label>
                  <textarea
                    value={confirmForm.failureReason}
                    onChange={e => setConfirmForm({ ...confirmForm, failureReason: e.target.value })}
                    className="w-full bg-black/40 border border-white/20 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-red-400/40 h-24"
                    placeholder={isSpanish ? 'Describir razón del fallo...' : 'Describe failure reason...'}
                  />
                </div>
              )}

              <div className="flex gap-3 pt-4">
                <button
                  onClick={handleConfirmSettlement}
                  disabled={loading}
                  className="flex-1 flex items-center justify-center gap-2 bg-cyan-500/20 border border-cyan-400/60 text-cyan-300 rounded-xl py-3 font-semibold hover:bg-cyan-500/30 transition disabled:opacity-50"
                >
                  <CheckCircle className="w-5 h-5" />
                  {loading ? (isSpanish ? 'Confirmando...' : 'Confirming...') : (isSpanish ? 'Confirmar' : 'Confirm')}
                </button>
                <button
                  onClick={() => {
                    setShowConfirmModal(false);
                    setSelectedSettlement(null);
                  }}
                  className="px-6 py-3 rounded-xl border border-white/20 text-white/80 hover:border-white/40 transition"
                >
                  {isSpanish ? 'Cancelar' : 'Cancel'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal de audit log */}
      {showAuditModal && selectedSettlement && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setShowAuditModal(false)}>
          <div className="bg-gradient-to-br from-[#0a0f1c] to-[#000] border border-purple-400/30 rounded-3xl p-6 max-w-3xl w-full max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <Shield className="w-6 h-6 text-purple-300" />
                <div>
                  <h2 className="text-2xl font-bold">
                    {isSpanish ? 'Historial de auditoría' : 'Audit trail'}
                  </h2>
                  <p className="text-sm text-white/60">{selectedSettlement.daesReferenceId}</p>
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
                        {new Date(log.timestamp).toLocaleString(isSpanish ? 'es-ES' : 'en-US')}
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

