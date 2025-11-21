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
  DollarSign,
  Trash2,
  CreditCard,
  AlertTriangle,
  Plus
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
  // Sender information (Digital Commercial Bank IBAN)
  senderIban?: string;
  senderIbanFormatted?: string;
  senderBankName?: string;
  senderBankAddress?: string;
  senderAccountName?: string;
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

interface DestinationBeneficiary {
  id: string;
  accountHolderName: string;
  bankName: string;
  bankAddress: string;
  accountType: 'Current Account' | 'Saving Account';
  accountNumber: string;
  iban: string;
  ibanFormatted: string;
  swiftCode: string;
  currency: 'AED' | 'USD' | 'EUR';
  countryCode: string;
  createdAt: string;
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
  const [issuedIbans, setIssuedIbans] = useState<any[]>([]);
  const [savedBeneficiaries, setSavedBeneficiaries] = useState<DestinationBeneficiary[]>([]);

  // Form states
  const [createForm, setCreateForm] = useState({
    custodyAccountId: '',
    sourceIbanId: '', // IBAN de origen (Digital Commercial Bank)
    amount: 0,
    currency: 'USD' as 'AED' | 'USD' | 'EUR',
    destinationIban: 'AE690260001025381452402' as string,
    destinationBeneficiaryId: '', // ID de beneficiario guardado o 'ENBD' por defecto
    reference: '',
    requestedBy: localStorage.getItem('daes_user') || 'user_default'
  });

  const [selectedCustodyAccount, setSelectedCustodyAccount] = useState<CustodyAccount | null>(null);
  const [selectedSourceIban, setSelectedSourceIban] = useState<any | null>(null);
  const [selectedDestinationBeneficiary, setSelectedDestinationBeneficiary] = useState<DestinationBeneficiary | null>(null);
  const [showAddBeneficiaryModal, setShowAddBeneficiaryModal] = useState(false);

  const [newBeneficiaryForm, setNewBeneficiaryForm] = useState({
    accountHolderName: '',
    bankName: '',
    bankAddress: '',
    accountType: 'Current Account' as 'Current Account' | 'Saving Account',
    accountNumber: '',
    iban: '',
    swiftCode: '',
    currency: 'USD' as 'AED' | 'USD' | 'EUR',
    countryCode: 'AE'
  });

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
    loadIssuedIbans();
    loadSavedBeneficiaries();

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

  const loadIssuedIbans = () => {
    try {
      const saved = localStorage.getItem('daes_ibans');
      if (saved) {
        const parsed = JSON.parse(saved);
        // Solo IBANs activos
        const activeIbans = parsed.filter((i: any) => i.status === 'ACTIVE');
        setIssuedIbans(activeIbans);
        console.log('[BankSettlement] ✅ IBANs emitidos cargados:', activeIbans.length);
      }
    } catch (error) {
      console.error('[BankSettlement] Error cargando IBANs:', error);
    }
  };

  const loadSavedBeneficiaries = () => {
    try {
      const saved = localStorage.getItem('settlement_beneficiaries');
      if (saved) {
        const parsed = JSON.parse(saved);
        setSavedBeneficiaries(parsed);
        console.log('[BankSettlement] ✅ Beneficiarios guardados:', parsed.length);
      }
    } catch (error) {
      console.error('[BankSettlement] Error cargando beneficiarios:', error);
    }
  };

  const handleAddBeneficiary = async () => {
    if (!newBeneficiaryForm.accountHolderName || !newBeneficiaryForm.iban || !newBeneficiaryForm.bankName) {
      addToast({
        type: 'error',
        title: isSpanish ? 'Datos incompletos' : 'Incomplete data',
        description: isSpanish ? 'Completa todos los campos requeridos (*)' : 'Fill in all required fields (*)'
      });
      return;
    }

    try {
      // Limpiar y formatear IBAN
      const cleanedIban = newBeneficiaryForm.iban.replace(/\s+/g, '').toUpperCase();
      const ibanFormatted = cleanedIban.replace(/(.{4})/g, '$1 ').trim();
      
      const newBeneficiary: DestinationBeneficiary = {
        id: crypto.randomUUID(),
        accountHolderName: newBeneficiaryForm.accountHolderName,
        bankName: newBeneficiaryForm.bankName,
        bankAddress: newBeneficiaryForm.bankAddress || 'N/A',
        accountType: newBeneficiaryForm.accountType,
        accountNumber: newBeneficiaryForm.accountNumber || 'N/A',
        iban: cleanedIban,
        ibanFormatted,
        swiftCode: newBeneficiaryForm.swiftCode || 'N/A',
        currency: newBeneficiaryForm.currency,
        countryCode: newBeneficiaryForm.countryCode,
        createdAt: new Date().toISOString()
      };

      const updated = [newBeneficiary, ...savedBeneficiaries];
      setSavedBeneficiaries(updated);
      localStorage.setItem('settlement_beneficiaries', JSON.stringify(updated));

      // Registrar en Transaction Events
      const { transactionEventStore } = await import('../lib/transaction-event-store');
      transactionEventStore.recordEvent(
        'API_KEY_CREATED',
        'SYSTEM',
        `Beneficiario agregado: ${newBeneficiaryForm.accountHolderName}`,
        {
          currency: newBeneficiaryForm.currency,
          reference: cleanedIban,
          status: 'COMPLETED',
          metadata: {
            beneficiaryId: newBeneficiary.id,
            bankName: newBeneficiaryForm.bankName,
            accountType: newBeneficiaryForm.accountType,
            operation: 'ADD_BENEFICIARY'
          }
        }
      );

      addToast({
        type: 'success',
        title: isSpanish ? 'Beneficiario guardado' : 'Beneficiary saved',
        description: `${newBeneficiaryForm.accountHolderName} - ${ibanFormatted}`
      });

      setShowAddBeneficiaryModal(false);
      setNewBeneficiaryForm({
        accountHolderName: '',
        bankName: '',
        bankAddress: '',
        accountType: 'Current Account',
        accountNumber: '',
        iban: '',
        swiftCode: '',
        currency: 'USD',
        countryCode: 'AE'
      });

      console.log('[BankSettlement] ✅ Beneficiario guardado:', newBeneficiary);

    } catch (error: any) {
      console.error('[BankSettlement] Error:', error);
      addToast({
        type: 'error',
        title: isSpanish ? 'Error' : 'Error',
        description: error.message
      });
    }
  };

  const loadSettlements = () => {
    try {
      // Cargar desde localStorage
      const saved = localStorage.getItem('bank_settlements');
      if (saved) {
        const parsed = JSON.parse(saved);
        setSettlements(parsed);
        console.log('[BankSettlement] ✅ Settlements cargados:', parsed.length);
      } else {
        setSettlements([]);
        console.log('[BankSettlement] ℹ️ No hay settlements guardados');
      }
      
      addToast({
        type: 'info',
        title: isSpanish ? 'Actualizado' : 'Refreshed',
        description: isSpanish 
          ? `${saved ? JSON.parse(saved).length : 0} liquidaciones cargadas`
          : `${saved ? JSON.parse(saved).length : 0} settlements loaded`
      });
    } catch (error) {
      console.error('[BankSettlement] Error cargando settlements:', error);
      addToast({
        type: 'error',
        title: isSpanish ? 'Error' : 'Error',
        description: isSpanish ? 'No se pudo cargar settlements' : 'Failed to load settlements'
      });
    }
  };

  const loadCustodyAccounts = () => {
    const accounts = custodyStore.getAccounts();
    setCustodyAccounts(accounts);
    console.log('[BankSettlement] ✅ Custody accounts cargadas:', accounts.length);
  };

  const handleCreateSettlement = async () => {
    console.log('[BankSettlement] 🔍 Validando form:', {
      sourceIbanId: createForm.sourceIbanId,
      custodyAccountId: createForm.custodyAccountId,
      amount: createForm.amount,
      currency: createForm.currency,
      type: typeof createForm.amount
    });

    // Validar que se haya seleccionado un IBAN de origen
    if (!createForm.sourceIbanId) {
      addToast({
        type: 'error',
        title: isSpanish ? 'IBAN requerido' : 'IBAN required',
        description: isSpanish 
          ? 'Selecciona un IBAN de origen de Digital Commercial Bank'
          : 'Select a source IBAN from Digital Commercial Bank'
      });
      return;
    }

    if (!createForm.custodyAccountId) {
      addToast({
        type: 'error',
        title: isSpanish ? 'Cuenta requerida' : 'Account required',
        description: isSpanish 
          ? 'No se pudo encontrar la cuenta vinculada al IBAN. Ve a IBAN Manager y verifica el IBAN.'
          : 'Could not find account linked to IBAN. Go to IBAN Manager and verify the IBAN.'
      });
      return;
    }

    const amountValue = Number(createForm.amount);
    console.log('[BankSettlement] 📊 Amount validation:', {
      original: createForm.amount,
      parsed: amountValue,
      isValid: amountValue > 0
    });

    if (isNaN(amountValue) || amountValue <= 0) {
      addToast({
        type: 'error',
        title: isSpanish ? 'Monto inválido' : 'Invalid amount',
        description: isSpanish 
          ? `El monto debe ser mayor a cero. Valor recibido: ${createForm.amount}` 
          : `Amount must be greater than zero. Received: ${createForm.amount}`
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

      // Determinar información del beneficiario
      let beneficiaryName = 'TRADEMORE VALUE CAPITAL FZE';
      let beneficiarySwift = 'EBILAEADXXX';
      
      if (selectedDestinationBeneficiary) {
        beneficiaryName = selectedDestinationBeneficiary.accountHolderName;
        beneficiarySwift = selectedDestinationBeneficiary.swiftCode;
      }

      const newSettlement: Settlement = {
        id,
        daesReferenceId,
        amount: amountValue.toFixed(2), // Usar valor validado
        currency: createForm.currency,
        beneficiaryName,
        beneficiaryIban: createForm.destinationIban, // Usar IBAN seleccionado
        swiftCode: beneficiarySwift,
        referenceText: createForm.reference || `Settlement from ${custodyAccount.accountName}`,
        status: 'PENDING',
        ledgerDebitId,
        createdBy: createForm.requestedBy,
        createdAt: date.toISOString(),
        updatedAt: date.toISOString(),
        // Sender information (si hay IBAN seleccionado)
        senderIban: selectedSourceIban?.iban,
        senderIbanFormatted: selectedSourceIban?.ibanFormatted,
        senderBankName: 'DIGITAL COMMERCIAL BANK LTD',
        senderBankAddress: 'B2B Tower, 15th Floor, Marasi Drive, Business Bay, Dubai, UAE',
        senderAccountName: custodyAccount.accountName
      };

      // Usar custody-transfer-handler para débito completo
      const { custodyTransferHandler } = await import('../lib/custody-transfer-handler');
      
      const transferResult = await custodyTransferHandler.executeTransfer({
        fromAccountId: createForm.custodyAccountId,
        toDestination: `${beneficiaryName} (${selectedDestinationBeneficiary?.bankName || 'ENBD'})`,
        amount: amountValue, // Usar valor validado
        currency: createForm.currency,
        reference: daesReferenceId,
        description: `Bank Settlement to ${beneficiaryName} - ${createForm.reference || 'No reference'}`,
        beneficiaryName,
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
          amount: amountValue, // Usar valor validado
          currency: createForm.currency,
          accountId: custodyAccount.id,
          accountName: custodyAccount.accountName,
          reference: daesReferenceId,
          status: 'COMPLETED',
          metadata: {
            settlementId: id,
            bankCode: 'ENBD',
            beneficiary: 'TRADEMORE VALUE CAPITAL FZE',
            iban: createForm.destinationIban, // Usar IBAN seleccionado
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
          ? `${daesReferenceId}\n${createForm.currency} ${amountValue.toLocaleString()}\nDe: ${custodyAccount.accountName}\n✅ Sincronizado con todo el sistema`
          : `${daesReferenceId}\n${createForm.currency} ${amountValue.toLocaleString()}\nFrom: ${custodyAccount.accountName}\n✅ Synced across the system`
      });

      setShowCreateModal(false);
      setCreateForm({
        custodyAccountId: '',
        sourceIbanId: '',
        amount: 0,
        currency: 'USD',
        destinationIban: 'AE690260001025381452402',
        destinationBeneficiaryId: '',
        reference: '',
        requestedBy: createForm.requestedBy
      });
      setSelectedSourceIban(null);
      setSelectedDestinationBeneficiary(null);

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

  const handleDownloadReceipt = (settlement: Settlement) => {
    try {
      const custodyAccount = custodyAccounts.find(a => a.currency === settlement.currency);
      const accountInfo = custodyAccount 
        ? `${custodyAccount.accountName} (${custodyAccount.accountNumber})`
        : 'N/A';

      const txt = `
═══════════════════════════════════════════════════════════════════
  ${isSpanish ? 'SISTEMA COREBANKING DAES' : 'DAES COREBANKING SYSTEM'}
  ${isSpanish ? 'COMPROBANTE DE LIQUIDACIÓN BANCARIA' : 'BANK SETTLEMENT RECEIPT'}
═══════════════════════════════════════════════════════════════════
${isSpanish ? 'DIGITAL COMMERCIAL BANK LTD' : 'DIGITAL COMMERCIAL BANK LTD'}
${isSpanish ? 'B2B Tower, Piso 15, Marasi Drive' : 'B2B Tower, 15th Floor, Marasi Drive'}
${isSpanish ? 'Business Bay, Dubai, EAU' : 'Business Bay, Dubai, UAE'}
═══════════════════════════════════════════════════════════════════

${isSpanish ? 'INFORMACIÓN DE LA INSTRUCCIÓN' : 'INSTRUCTION INFORMATION'}
───────────────────────────────────────────────────────────────────

${isSpanish ? 'DAES Reference ID:' : 'DAES Reference ID:'}          ${settlement.daesReferenceId}
${isSpanish ? 'Ledger Debit ID:' : 'Ledger Debit ID:'}            ${settlement.ledgerDebitId}
${isSpanish ? 'Estado:' : 'Status:'}                     ${settlement.status}

${isSpanish ? 'INFORMACIÓN DEL REMITENTE (SENDER)' : 'SENDER INFORMATION'}
───────────────────────────────────────────────────────────────────

${isSpanish ? 'Banco remitente:' : 'Sender bank:'}              ${settlement.senderBankName || 'DIGITAL COMMERCIAL BANK LTD'}
${isSpanish ? 'Dirección:' : 'Address:'}                   ${settlement.senderBankAddress || 'B2B Tower, 15th Floor, Marasi Drive, Business Bay, Dubai, UAE'}
${isSpanish ? 'Cuenta:' : 'Account:'}                     ${settlement.senderAccountName || accountInfo}
${settlement.senderIbanFormatted ? `${isSpanish ? 'IBAN remitente:' : 'Sender IBAN:'}            ${settlement.senderIbanFormatted}` : ''}
${settlement.senderIban ? `SWIFT/BIC:                  DIGCUSXX` : ''}
${isSpanish ? 'Moneda de la cuenta:' : 'Account currency:'}          ${settlement.currency}

${isSpanish ? 'DETALLES DE LA TRANSFERENCIA' : 'TRANSFER DETAILS'}
───────────────────────────────────────────────────────────────────

${isSpanish ? 'Monto:' : 'Amount:'}                      ${settlement.currency} ${parseFloat(settlement.amount).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
${isSpanish ? 'Moneda:' : 'Currency:'}                     ${settlement.currency}
${isSpanish ? 'Tipo de transferencia:' : 'Transfer type:'}           ${isSpanish ? 'Internacional SWIFT' : 'International SWIFT'}

${isSpanish ? 'INFORMACIÓN DEL BENEFICIARIO (RECEIVER)' : 'BENEFICIARY INFORMATION (RECEIVER)'}
───────────────────────────────────────────────────────────────────

${isSpanish ? 'Banco beneficiario:' : 'Beneficiary bank:'}          EMIRATES NBD (ENBD)
${isSpanish ? 'Dirección:' : 'Address:'}                    DUBAI, UNITED ARAB EMIRATES
${isSpanish ? 'Beneficiario:' : 'Beneficiary:'}                TRADEMORE VALUE CAPITAL FZE
${isSpanish ? 'IBAN beneficiario:' : 'Beneficiary IBAN:'}          ${settlement.beneficiaryIban}
SWIFT/BIC:                  ${settlement.swiftCode}

${isSpanish ? 'FECHAS Y AUDITORÍA' : 'DATES AND AUDIT'}
───────────────────────────────────────────────────────────────────

${isSpanish ? 'Creado por:' : 'Created by:'}                 ${settlement.createdBy}
${isSpanish ? 'Fecha de creación:' : 'Creation date:'}            ${new Date(settlement.createdAt).toLocaleString(isSpanish ? 'es-ES' : 'en-US')}
${isSpanish ? 'Última actualización:' : 'Last update:'}             ${new Date(settlement.updatedAt).toLocaleString(isSpanish ? 'es-ES' : 'en-US')}
${settlement.executedBy ? `${isSpanish ? 'Ejecutado por:' : 'Executed by:'}             ${settlement.executedBy}` : ''}
${settlement.executedAt ? `${isSpanish ? 'Fecha de ejecución:' : 'Execution date:'}          ${new Date(settlement.executedAt).toLocaleString(isSpanish ? 'es-ES' : 'en-US')}` : ''}

${settlement.enbdTransactionReference ? `${isSpanish ? 'CONFIRMACIÓN ENBD' : 'ENBD CONFIRMATION'}\n───────────────────────────────────────────────────────────────────\n\n${isSpanish ? 'Referencia ENBD:' : 'ENBD Reference:'}            ${settlement.enbdTransactionReference}` : ''}

${settlement.referenceText ? `${isSpanish ? 'REFERENCIA ADICIONAL' : 'ADDITIONAL REFERENCE'}\n───────────────────────────────────────────────────────────────────\n\n${settlement.referenceText}` : ''}

${settlement.failureReason ? `${isSpanish ? 'RAZÓN DE FALLO' : 'FAILURE REASON'}\n───────────────────────────────────────────────────────────────────\n\n${settlement.failureReason}` : ''}

${isSpanish ? 'INSTRUCCIONES PARA EJECUCIÓN MANUAL' : 'MANUAL EXECUTION INSTRUCTIONS'}
───────────────────────────────────────────────────────────────────

${isSpanish ? '1. Acceder a ENBD Online Banking' : '1. Access ENBD Online Banking'}
${isSpanish ? '2. Seleccionar transferencia internacional' : '2. Select international transfer'}
${isSpanish ? '3. Ingresar los siguientes datos:' : '3. Enter the following data:'}

   ${isSpanish ? 'Beneficiario:' : 'Beneficiary:'}       ${settlement.beneficiaryName}
   IBAN:              ${settlement.beneficiaryIban}
   SWIFT/BIC:         ${settlement.swiftCode}
   ${isSpanish ? 'Monto:' : 'Amount:'}              ${settlement.currency} ${parseFloat(settlement.amount).toLocaleString('en-US', { minimumFractionDigits: 2 })}
   ${isSpanish ? 'Referencia:' : 'Reference:'}          ${settlement.daesReferenceId}

${isSpanish ? '4. Ejecutar transferencia' : '4. Execute transfer'}
${isSpanish ? '5. Guardar referencia de transacción ENBD' : '5. Save ENBD transaction reference'}
${isSpanish ? '6. Volver a DAES y confirmar ejecución' : '6. Return to DAES and confirm execution'}

═══════════════════════════════════════════════════════════════════
  ${isSpanish ? 'Sistema CoreBanking DAES' : 'DAES CoreBanking System'}
  ${isSpanish ? 'Datos e Intercambio de Liquidación' : 'Data and Exchange Settlement'}
  
  Digital Commercial Bank Ltd
  ${isSpanish ? 'Número de Licencia Bancaria Internacional: L 15446' : 'International Banking License Number: L 15446'}
  ${isSpanish ? 'Número de Compañía: 15446' : 'Company Number: 15446'}
  
  © ${new Date().getFullYear()} - ${isSpanish ? 'Todos los derechos reservados' : 'All rights reserved'}
═══════════════════════════════════════════════════════════════════

${isSpanish ? 'ADVERTENCIA DE SEGURIDAD:' : 'SECURITY WARNING:'}
${isSpanish ? 'Este documento contiene información confidencial bancaria.' : 'This document contains confidential banking information.'}
${isSpanish ? 'Manténgalo en lugar seguro y no lo comparta con terceros no autorizados.' : 'Keep it in a secure place and do not share with unauthorized third parties.'}

${isSpanish ? 'Generado el:' : 'Generated on:'} ${new Date().toLocaleString(isSpanish ? 'es-ES' : 'en-US')}
`;

      const blob = new Blob([txt], { type: 'text/plain;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `DAES_Settlement_Receipt_${settlement.daesReferenceId}.txt`;
      link.click();
      URL.revokeObjectURL(url);

      addToast({
        type: 'success',
        title: isSpanish ? 'Comprobante descargado' : 'Receipt downloaded',
        description: settlement.daesReferenceId
      });

      console.log('[BankSettlement] 📄 Comprobante generado:', settlement.daesReferenceId);

    } catch (error: any) {
      console.error('[BankSettlement] Error generando comprobante:', error);
      addToast({
        type: 'error',
        title: isSpanish ? 'Error' : 'Error',
        description: error.message
      });
    }
  };

  const handleDeleteSettlement = async (settlementId: string) => {
    const settlement = settlements.find(s => s.id === settlementId);
    if (!settlement) return;

    const confirmMessage = isSpanish
      ? `¿Eliminar settlement ${settlement.daesReferenceId}?\n\nMonto: ${settlement.currency} ${parseFloat(settlement.amount).toLocaleString()}\nStatus: ${settlement.status}\n\n⚠️ Esta acción no se puede deshacer.`
      : `Delete settlement ${settlement.daesReferenceId}?\n\nAmount: ${settlement.currency} ${parseFloat(settlement.amount).toLocaleString()}\nStatus: ${settlement.status}\n\n⚠️ This action cannot be undone.`;

    if (!window.confirm(confirmMessage)) return;

    try {
      const updated = settlements.filter(s => s.id !== settlementId);
      setSettlements(updated);
      localStorage.setItem('bank_settlements', JSON.stringify(updated));

      // Registrar eliminación en Transaction Events
      const { transactionEventStore } = await import('../lib/transaction-event-store');
      transactionEventStore.recordEvent(
        'TRANSFER_CREATED',
        'SYSTEM',
        `Bank Settlement eliminado: ${settlement.daesReferenceId}`,
        {
          amount: parseFloat(settlement.amount),
          currency: settlement.currency,
          reference: settlement.daesReferenceId,
          status: 'CANCELLED',
          metadata: {
            settlementId: settlement.id,
            previousStatus: settlement.status,
            operation: 'DELETE_SETTLEMENT'
          }
        }
      );

      addToast({
        type: 'warning',
        title: isSpanish ? 'Settlement eliminado' : 'Settlement deleted',
        description: settlement.daesReferenceId
      });

      console.log('[BankSettlement] 🗑️ Settlement eliminado:', settlement.daesReferenceId);

    } catch (error: any) {
      console.error('[BankSettlement] Error eliminando:', error);
      addToast({
        type: 'error',
        title: isSpanish ? 'Error' : 'Error',
        description: error.message
      });
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
    if (settlements.length === 0) {
      addToast({
        type: 'warning',
        title: isSpanish ? 'Sin datos' : 'No data',
        description: isSpanish 
          ? 'No hay settlements para exportar. Crea uno primero.'
          : 'No settlements to export. Create one first.'
      });
      return;
    }

    try {
      // Calcular totales por moneda
      const totalsByCurrency: Record<string, number> = {};
      settlements.forEach(s => {
        totalsByCurrency[s.currency] = (totalsByCurrency[s.currency] || 0) + parseFloat(s.amount);
      });

      // Header del CSV
      const csv = [
        '═══════════════════════════════════════════════════════════',
        'DAES COREBANKING SYSTEM - BANK SETTLEMENT REPORT',
        '═══════════════════════════════════════════════════════════',
        `Date Generated: ${new Date().toLocaleString(isSpanish ? 'es-ES' : 'en-US')}`,
        `Bank: EMIRATES NBD (ENBD)`,
        `Beneficiary: TRADEMORE VALUE CAPITAL FZE`,
        `Total Settlements: ${settlements.length}`,
        '',
        'SUMMARY BY STATUS:',
        `- Pending: ${stats.pending}`,
        `- Completed: ${stats.completed}`,
        `- Failed: ${stats.failed}`,
        '',
        'TOTAL BY CURRENCY:',
        ...Object.entries(totalsByCurrency).map(([curr, total]) => 
          `- ${curr}: ${total.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
        ),
        '',
        '═══════════════════════════════════════════════════════════',
        'SETTLEMENT INSTRUCTIONS',
        '═══════════════════════════════════════════════════════════',
        '',
        'DAES Reference,Currency,Amount,IBAN,SWIFT,Beneficiary,Status,ENBD Ref,Created By,Created At,Executed By,Executed At,Reference Text'
      ];
      
      settlements.forEach(s => {
        csv.push([
          s.daesReferenceId,
          s.currency,
          s.amount,
          s.beneficiaryIban,
          s.swiftCode,
          s.beneficiaryName,
          s.status,
          s.enbdTransactionReference || '',
          s.createdBy,
          new Date(s.createdAt).toLocaleString(isSpanish ? 'es-ES' : 'en-US'),
          s.executedBy || '',
          s.executedAt ? new Date(s.executedAt).toLocaleString(isSpanish ? 'es-ES' : 'en-US') : '',
          `"${s.referenceText || ''}"`
        ].join(','));
      });

      csv.push('');
      csv.push('═══════════════════════════════════════════════════════════');
      csv.push('DAES CoreBanking System - Data and Exchange Settlement');
      csv.push(`© ${new Date().getFullYear()} Digital Commercial Bank Ltd`);
      csv.push('═══════════════════════════════════════════════════════════');

      const blob = new Blob([csv.join('\n')], { type: 'text/csv;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `DAES_Bank_Settlements_Report_${new Date().toISOString().split('T')[0]}.csv`;
      link.click();
      URL.revokeObjectURL(url);

      console.log('[BankSettlement] ✅ Reporte CSV generado:', {
        settlements: settlements.length,
        pending: stats.pending,
        completed: stats.completed,
        failed: stats.failed
      });

      addToast({
        type: 'success',
        title: isSpanish ? 'Reporte descargado' : 'Report downloaded',
        description: isSpanish
          ? `${settlements.length} liquidaciones · ${stats.completed} completadas`
          : `${settlements.length} settlements · ${stats.completed} completed`
      });
    } catch (error: any) {
      console.error('[BankSettlement] Error generando reporte:', error);
      addToast({
        type: 'error',
        title: isSpanish ? 'Error' : 'Error',
        description: error.message
      });
    }
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
                      onClick={() => handleDownloadReceipt(settlement)}
                      className="px-4 py-2 rounded-xl bg-green-500/10 border border-green-400/30 text-green-300 text-sm font-semibold hover:bg-green-500/20 transition flex items-center gap-2"
                    >
                      <FileText className="w-4 h-4" />
                      {isSpanish ? 'Descargar comprobante' : 'Download receipt'}
                    </button>
                    <button
                      onClick={() => handleShowAuditLog(settlement)}
                      className="px-4 py-2 rounded-xl bg-purple-500/10 border border-purple-400/30 text-purple-300 text-sm font-semibold hover:bg-purple-500/20 transition flex items-center gap-2"
                    >
                      <Eye className="w-4 h-4" />
                      {isSpanish ? 'Audit log' : 'Audit log'}
                    </button>
                    <button
                      onClick={() => handleDeleteSettlement(settlement.id)}
                      className="px-3 py-2 rounded-xl bg-red-500/10 border border-red-400/30 text-red-300 text-sm font-semibold hover:bg-red-500/20 transition"
                      title={isSpanish ? 'Eliminar settlement' : 'Delete settlement'}
                    >
                      <Trash2 className="w-4 h-4" />
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
          <div className="bg-gradient-to-br from-[#0a0f1c] to-[#000] border border-[#00ff88]/30 rounded-3xl p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-center gap-3 mb-6 sticky top-0 bg-gradient-to-br from-[#0a0f1c] to-[#000] pb-4 z-10">
              <Send className="w-6 h-6 text-[#00ff88]" />
              <h2 className="text-2xl font-bold">
                {isSpanish ? 'Nueva instrucción de liquidación' : 'New settlement instruction'}
              </h2>
            </div>

            <div className="space-y-4 pr-2">
              <div>
                <label className="block text-sm font-medium text-white/70 mb-2 flex items-center gap-2">
                  <CreditCard className="w-4 h-4" />
                  {isSpanish ? 'IBAN de origen (Digital Commercial Bank)' : 'Source IBAN (Digital Commercial Bank)'}
                </label>
                <select
                  value={createForm.sourceIbanId}
                  onChange={e => {
                    const ibanId = e.target.value;
                    const iban = issuedIbans.find(i => i.id === ibanId);
                    
                    if (iban) {
                      // Buscar cuenta custody vinculada
                      const account = custodyAccounts.find(a => a.id === iban.daesAccountId);
                      
                      console.log('[BankSettlement] IBAN origen seleccionado:', {
                        iban: iban.ibanFormatted,
                        currency: iban.currency,
                        account: account?.accountName
                      });
                      
                      setSelectedSourceIban(iban);
                      setSelectedCustodyAccount(account || null);
                      
                      // Mapear IBAN destino (ENBD) según currency
                      const destinationIbanMap: Record<string, string> = {
                        'AED': 'AE610260001015381452401',
                        'USD': 'AE690260001025381452402',
                        'EUR': 'AE420260001025381452403'
                      };
                      
                      setCreateForm({
                        ...createForm,
                        sourceIbanId: ibanId,
                        custodyAccountId: account?.id || '',
                        currency: iban.currency as 'AED' | 'USD' | 'EUR',
                        destinationIban: destinationIbanMap[iban.currency] || 'AE690260001025381452402',
                        amount: 0
                      });
                    } else {
                      setSelectedSourceIban(null);
                      setSelectedCustodyAccount(null);
                    }
                  }}
                  className="w-full bg-black/40 border border-white/20 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-[#00ff88]/40 font-mono text-sm"
                  required
                >
                  <option value="">
                    {isSpanish ? '-- Seleccionar IBAN --' : '-- Select IBAN --'}
                  </option>
                  {issuedIbans.map(iban => (
                    <option key={iban.id} value={iban.id}>
                      {iban.ibanFormatted} · {iban.currency} · {iban.accountName || 'N/A'}
                    </option>
                  ))}
                </select>
                {issuedIbans.length === 0 && (
                  <p className="text-xs text-yellow-300 mt-2 flex items-center gap-1">
                    <AlertTriangle className="w-3 h-3" />
                    {isSpanish
                      ? 'No hay IBANs activos. Ve al módulo IBAN Manager para emitir uno.'
                      : 'No active IBANs. Go to IBAN Manager module to issue one.'}
                  </p>
                )}
                {selectedSourceIban && (
                  <div className="mt-3 p-3 bg-cyan-500/10 border border-cyan-400/30 rounded-lg text-sm">
                    <p className="text-cyan-300 font-semibold mb-2">
                      {isSpanish ? 'IBAN de origen seleccionado:' : 'Selected source IBAN:'}
                    </p>
                    <div className="space-y-1 text-white/70">
                      <p><span className="text-white/50">IBAN:</span> <span className="text-cyan-300 font-mono text-xs">{selectedSourceIban.ibanFormatted}</span></p>
                      <p><span className="text-white/50">{isSpanish ? 'Banco:' : 'Bank:'}</span> DIGITAL COMMERCIAL BANK LTD</p>
                      <p><span className="text-white/50">{isSpanish ? 'Dirección:' : 'Address:'}</span> B2B Tower, Dubai, UAE</p>
                      <p><span className="text-white/50">{isSpanish ? 'Moneda:' : 'Currency:'}</span> <span className="text-[#00ff88] font-semibold">{selectedSourceIban.currency}</span></p>
                    </div>
                  </div>
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
                  value={createForm.amount > 0 ? createForm.amount : ''}
                  onChange={e => {
                    const value = e.target.value;
                    const numValue = value === '' ? 0 : parseFloat(value);
                    setCreateForm({ ...createForm, amount: isNaN(numValue) ? 0 : numValue });
                  }}
                  className="w-full bg-black/40 border border-white/20 rounded-xl px-4 py-3 text-white text-lg font-semibold focus:outline-none focus:ring-2 focus:ring-[#00ff88]/40"
                  placeholder="1000000.00"
                  min="0.01"
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
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-sm font-medium text-white/70 flex items-center gap-2">
                    <Building2 className="w-4 h-4" />
                    {isSpanish ? 'Beneficiario destino' : 'Destination beneficiary'}
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowAddBeneficiaryModal(true)}
                    className="flex items-center gap-1 px-3 py-1 rounded-lg bg-purple-500/10 border border-purple-400/30 text-purple-300 text-xs font-semibold hover:bg-purple-500/20 transition"
                  >
                    <Plus className="w-3 h-3" />
                    {isSpanish ? 'Nuevo beneficiario' : 'New beneficiary'}
                  </button>
                </div>
                <select
                  value={createForm.destinationBeneficiaryId}
                  onChange={e => {
                    const beneficiaryId = e.target.value;
                    
                    if (beneficiaryId === 'ENBD_USD') {
                      setCreateForm({
                        ...createForm,
                        destinationBeneficiaryId: beneficiaryId,
                        destinationIban: 'AE690260001025381452402',
                        currency: 'USD'
                      });
                      setSelectedDestinationBeneficiary(null);
                    } else if (beneficiaryId === 'ENBD_AED') {
                      setCreateForm({
                        ...createForm,
                        destinationBeneficiaryId: beneficiaryId,
                        destinationIban: 'AE610260001015381452401',
                        currency: 'AED'
                      });
                      setSelectedDestinationBeneficiary(null);
                    } else if (beneficiaryId === 'ENBD_EUR') {
                      setCreateForm({
                        ...createForm,
                        destinationBeneficiaryId: beneficiaryId,
                        destinationIban: 'AE420260001025381452403',
                        currency: 'EUR'
                      });
                      setSelectedDestinationBeneficiary(null);
                    } else {
                      // Beneficiario personalizado
                      const beneficiary = savedBeneficiaries.find(b => b.id === beneficiaryId);
                      if (beneficiary) {
                        setSelectedDestinationBeneficiary(beneficiary);
                        setCreateForm({
                          ...createForm,
                          destinationBeneficiaryId: beneficiaryId,
                          destinationIban: beneficiary.iban,
                          currency: beneficiary.currency as 'AED' | 'USD' | 'EUR'
                        });
                      }
                    }
                  }}
                  className="w-full bg-black/40 border border-white/20 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-cyan-400/40 text-sm"
                  required
                >
                  <option value="">{isSpanish ? '-- Seleccionar beneficiario destino --' : '-- Select destination beneficiary --'}</option>
                  {savedBeneficiaries.length > 0 && (
                    <optgroup label={isSpanish ? '💼 Beneficiarios guardados' : '💼 Saved beneficiaries'}>
                      {savedBeneficiaries.map(ben => (
                        <option key={ben.id} value={ben.id}>
                          {ben.currency} - {ben.ibanFormatted} - {ben.accountHolderName} ({ben.bankName})
                        </option>
                      ))}
                    </optgroup>
                  )}
                  <optgroup label={isSpanish ? '🏦 ENBD - TRADEMORE VALUE CAPITAL FZE (predeterminado)' : '🏦 ENBD - TRADEMORE VALUE CAPITAL FZE (default)'}>
                    <option value="ENBD_USD">USD - AE69 0260 0010 2538 1452 402 - TRADEMORE (ENBD)</option>
                    <option value="ENBD_AED">AED - AE61 0260 0010 1538 1452 401 - TRADEMORE (ENBD)</option>
                    <option value="ENBD_EUR">EUR - AE42 0260 0010 2538 1452 403 - TRADEMORE (ENBD)</option>
                  </optgroup>
                </select>
                <p className="text-xs text-white/50 mt-2">
                  {isSpanish 
                    ? 'Selecciona un beneficiario guardado o usa las cuentas ENBD predeterminadas'
                    : 'Select a saved beneficiary or use default ENBD accounts'}
                </p>
                {selectedDestinationBeneficiary && (
                  <div className="mt-3 p-3 bg-purple-500/10 border border-purple-400/30 rounded-lg text-sm">
                    <p className="text-purple-300 font-semibold mb-2">
                      {isSpanish ? 'Beneficiario personalizado:' : 'Custom beneficiary:'}
                    </p>
                    <div className="grid grid-cols-2 gap-3 text-white/70">
                      <div>
                        <span className="text-white/50 text-xs">{isSpanish ? 'Banco:' : 'Bank:'}</span>
                        <p className="text-white">{selectedDestinationBeneficiary.bankName}</p>
                      </div>
                      <div>
                        <span className="text-white/50 text-xs">{isSpanish ? 'Titular:' : 'Holder:'}</span>
                        <p className="text-white">{selectedDestinationBeneficiary.accountHolderName}</p>
                      </div>
                      <div>
                        <span className="text-white/50 text-xs">{isSpanish ? 'Tipo:' : 'Type:'}</span>
                        <p className="text-cyan-300">{selectedDestinationBeneficiary.accountType}</p>
                      </div>
                      <div>
                        <span className="text-white/50 text-xs">{isSpanish ? 'Moneda:' : 'Currency:'}</span>
                        <p className="text-green-300 font-semibold">{selectedDestinationBeneficiary.currency}</p>
                      </div>
                      <div className="col-span-2">
                        <span className="text-white/50 text-xs">IBAN:</span>
                        <p className="text-cyan-300 font-mono text-xs">{selectedDestinationBeneficiary.ibanFormatted}</p>
                      </div>
                      {selectedDestinationBeneficiary.accountNumber && selectedDestinationBeneficiary.accountNumber !== 'N/A' && (
                        <div>
                          <span className="text-white/50 text-xs">{isSpanish ? 'Nº Cuenta:' : 'Acc. Number:'}</span>
                          <p className="text-white font-mono text-xs">{selectedDestinationBeneficiary.accountNumber}</p>
                        </div>
                      )}
                      <div>
                        <span className="text-white/50 text-xs">SWIFT:</span>
                        <p className="text-white font-mono text-xs">{selectedDestinationBeneficiary.swiftCode}</p>
                      </div>
                    </div>
                  </div>
                )}
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

              {selectedSourceIban && createForm.destinationBeneficiaryId && (
                <div className="bg-green-500/10 border border-green-400/30 rounded-xl p-4 text-sm">
                  <p className="text-green-300 font-semibold mb-2 flex items-center gap-2">
                    <Building2 className="w-4 h-4" />
                    {isSpanish ? 'Transferencia:' : 'Transfer:'}
                  </p>
                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="bg-black/30 rounded-lg p-3">
                      <p className="text-white/50 text-xs uppercase mb-1">{isSpanish ? 'Desde' : 'From'}</p>
                      <p className="text-white font-semibold text-sm">DIGITAL COMMERCIAL BANK LTD</p>
                      <p className="text-white/60 text-xs">B2B Tower, Dubai, UAE</p>
                      <p className="text-cyan-300 font-mono text-[11px] mt-2">{selectedSourceIban.ibanFormatted}</p>
                      <p className="text-[#00ff88] font-semibold text-xs mt-1">{selectedSourceIban.currency}</p>
                    </div>
                    <div className="bg-black/30 rounded-lg p-3">
                      <p className="text-white/50 text-xs uppercase mb-1">{isSpanish ? 'Hacia' : 'To'}</p>
                      <p className="text-white font-semibold text-sm">
                        {selectedDestinationBeneficiary?.accountHolderName || 'TRADEMORE VALUE CAPITAL FZE'}
                      </p>
                      <p className="text-white/60 text-xs">
                        {selectedDestinationBeneficiary?.bankName || 'EMIRATES NBD'}, {selectedDestinationBeneficiary?.bankAddress?.split(',')[0] || 'Dubai'}
                      </p>
                      <p className="text-cyan-300 font-mono text-[11px] mt-2">{createForm.destinationIban.replace(/(.{4})/g, '$1 ').trim()}</p>
                      <p className="text-[#00ff88] font-semibold text-xs mt-1">{createForm.currency}</p>
                    </div>
                  </div>
                  <p className="text-xs text-green-200/60 mt-3">
                    {isSpanish 
                      ? '✓ Transferencia entre cuentas IBAN verificadas'
                      : '✓ Transfer between verified IBAN accounts'}
                  </p>
                </div>
              )}

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

      {/* Modal Agregar Beneficiario */}
      {showAddBeneficiaryModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setShowAddBeneficiaryModal(false)}>
          <div className="bg-gradient-to-br from-[#0a0f1c] to-[#000] border border-purple-400/30 rounded-3xl p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-center gap-3 mb-6 sticky top-0 bg-gradient-to-br from-[#0a0f1c] to-[#000] pb-4 z-10">
              <Plus className="w-6 h-6 text-purple-300" />
              <h2 className="text-2xl font-bold">
                {isSpanish ? 'Agregar nuevo beneficiario' : 'Add new beneficiary'}
              </h2>
            </div>

            <div className="space-y-4 pr-2">
              <div>
                <label className="block text-sm font-medium text-white/70 mb-2">
                  {isSpanish ? 'Nombre del banco' : 'Bank Name'} *
                </label>
                <input
                  type="text"
                  value={newBeneficiaryForm.bankName}
                  onChange={e => setNewBeneficiaryForm({ ...newBeneficiaryForm, bankName: e.target.value })}
                  className="w-full bg-black/40 border border-white/20 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-purple-400/40"
                  placeholder="First Abu Dhabi Bank"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-white/70 mb-2">
                  {isSpanish ? 'Nombre del titular' : 'Account Holder Name'} *
                </label>
                <input
                  type="text"
                  value={newBeneficiaryForm.accountHolderName}
                  onChange={e => setNewBeneficiaryForm({ ...newBeneficiaryForm, accountHolderName: e.target.value })}
                  className="w-full bg-black/40 border border-white/20 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-purple-400/40"
                  placeholder="ACME Corporation Ltd"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-white/70 mb-2">
                  {isSpanish ? 'Tipo de cuenta' : 'Account Type'} *
                </label>
                <div className="grid grid-cols-2 gap-3">
                  {(['Current Account', 'Saving Account'] as const).map(type => (
                    <button
                      key={type}
                      type="button"
                      onClick={() => setNewBeneficiaryForm({ ...newBeneficiaryForm, accountType: type })}
                      className={`px-4 py-3 rounded-xl font-semibold transition ${
                        newBeneficiaryForm.accountType === type
                          ? 'bg-cyan-500/20 border-2 border-cyan-400/60 text-cyan-300'
                          : 'bg-white/5 border border-white/20 text-white/60 hover:border-white/40'
                      }`}
                    >
                      {type}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-white/70 mb-2">
                  {isSpanish ? 'Número de cuenta' : 'Account Number'}
                </label>
                <input
                  type="text"
                  value={newBeneficiaryForm.accountNumber}
                  onChange={e => setNewBeneficiaryForm({ ...newBeneficiaryForm, accountNumber: e.target.value })}
                  className="w-full bg-black/40 border border-white/20 rounded-xl px-4 py-3 text-white font-mono focus:outline-none focus:ring-2 focus:ring-purple-400/40"
                  placeholder="1234567890"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-white/70 mb-2">
                  IBAN *
                </label>
                <input
                  type="text"
                  value={newBeneficiaryForm.iban}
                  onChange={e => setNewBeneficiaryForm({ ...newBeneficiaryForm, iban: e.target.value.toUpperCase() })}
                  className="w-full bg-black/40 border border-white/20 rounded-xl px-4 py-3 text-white font-mono focus:outline-none focus:ring-2 focus:ring-purple-400/40"
                  placeholder="AE070331234567890123456"
                  required
                />
                <p className="text-xs text-white/50 mt-1">
                  {isSpanish ? 'Ingresa el IBAN completo (con o sin espacios)' : 'Enter complete IBAN (with or without spaces)'}
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-white/70 mb-2">
                  {isSpanish ? 'Moneda' : 'Currency'} *
                </label>
                <div className="grid grid-cols-3 gap-3">
                  {(['AED', 'USD', 'EUR'] as const).map(curr => (
                    <button
                      key={curr}
                      type="button"
                      onClick={() => setNewBeneficiaryForm({ ...newBeneficiaryForm, currency: curr })}
                      className={`px-4 py-3 rounded-xl font-semibold transition ${
                        newBeneficiaryForm.currency === curr
                          ? 'bg-green-500/20 border-2 border-green-400/60 text-green-300'
                          : 'bg-white/5 border border-white/20 text-white/60 hover:border-white/40'
                      }`}
                    >
                      {curr}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-white/70 mb-2">
                  {isSpanish ? 'Dirección del banco' : 'Bank Address'}
                </label>
                <input
                  type="text"
                  value={newBeneficiaryForm.bankAddress}
                  onChange={e => setNewBeneficiaryForm({ ...newBeneficiaryForm, bankAddress: e.target.value })}
                  className="w-full bg-black/40 border border-white/20 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-purple-400/40"
                  placeholder="Abu Dhabi, United Arab Emirates"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-white/70 mb-2">
                  SWIFT/BIC
                </label>
                <input
                  type="text"
                  value={newBeneficiaryForm.swiftCode}
                  onChange={e => setNewBeneficiaryForm({ ...newBeneficiaryForm, swiftCode: e.target.value.toUpperCase() })}
                  className="w-full bg-black/40 border border-white/20 rounded-xl px-4 py-3 text-white font-mono focus:outline-none focus:ring-2 focus:ring-purple-400/40"
                  placeholder="NBADAEAAXXX"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-white/70 mb-2">
                  {isSpanish ? 'País' : 'Country'}
                </label>
                <div className="grid grid-cols-3 gap-3">
                  {(['AE', 'DE', 'ES'] as const).map(country => (
                    <button
                      key={country}
                      type="button"
                      onClick={() => setNewBeneficiaryForm({ ...newBeneficiaryForm, countryCode: country })}
                      className={`px-4 py-2 rounded-xl font-semibold transition ${
                        newBeneficiaryForm.countryCode === country
                          ? 'bg-purple-500/20 border-2 border-purple-400/60 text-purple-300'
                          : 'bg-white/5 border border-white/20 text-white/60 hover:border-white/40'
                      }`}
                    >
                      {country}
                    </button>
                  ))}
                </div>
              </div>

              <div className="bg-yellow-500/10 border border-yellow-400/30 rounded-xl p-4 text-sm">
                <p className="text-yellow-300 font-semibold mb-2">
                  {isSpanish ? '⚠️ Importante:' : '⚠️ Important:'}
                </p>
                <ul className="space-y-1 text-white/70 text-xs list-disc list-inside">
                  <li>{isSpanish ? 'Verifica que el IBAN sea correcto antes de guardar' : 'Verify IBAN is correct before saving'}</li>
                  <li>{isSpanish ? 'El beneficiario se guardará para futuros settlements' : 'Beneficiary will be saved for future settlements'}</li>
                  <li>{isSpanish ? 'Puedes eliminarlo después si es necesario' : 'You can delete it later if needed'}</li>
                </ul>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  onClick={handleAddBeneficiary}
                  className="flex-1 flex items-center justify-center gap-2 bg-purple-500/20 border border-purple-400/60 text-purple-300 rounded-xl py-3 font-semibold hover:bg-purple-500/30 transition"
                >
                  <Plus className="w-5 h-5" />
                  {isSpanish ? 'Guardar beneficiario' : 'Save beneficiary'}
                </button>
                <button
                  onClick={() => setShowAddBeneficiaryModal(false)}
                  className="px-6 py-3 rounded-xl border border-white/20 text-white/80 hover:border-white/40 transition"
                >
                  {isSpanish ? 'Cancelar' : 'Cancel'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

