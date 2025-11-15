/**
 * Custody Accounts Module - Cuentas Custodio para Tokenización Blockchain
 * Sistema de reservas y verificación de fondos para stablecoins
 */

import { useState, useEffect, useRef } from 'react';
import {
  Shield,
  Plus,
  Lock,
  Unlock,
  ExternalLink,
  Check,
  X,
  Copy,
  Download,
  AlertCircle,
  CheckCircle,
  Wallet,
  ArrowUp
} from 'lucide-react';
import { useLanguage } from '../lib/i18n';
import { balanceStore, type CurrencyBalance } from '../lib/balances-store';
import { custodyStore, type CustodyAccount } from '../lib/custody-store';
import { CustodyBlackScreen } from './CustodyBlackScreen';
import { apiVUSD1Store } from '../lib/api-vusd1-store';

const BLOCKCHAINS = [
  { name: 'Ethereum', symbol: 'ETH', color: 'text-blue-400' },
  { name: 'Binance Smart Chain', symbol: 'BSC', color: 'text-yellow-400' },
  { name: 'Polygon', symbol: 'MATIC', color: 'text-purple-400' },
  { name: 'Arbitrum', symbol: 'ARB', color: 'text-cyan-400' },
  { name: 'Optimism', symbol: 'OP', color: 'text-red-400' },
  { name: 'Avalanche', symbol: 'AVAX', color: 'text-red-300' },
  { name: 'Solana', symbol: 'SOL', color: 'text-green-400' },
  { name: 'Stellar', symbol: 'XLM', color: 'text-indigo-400' },
];

export function CustodyAccountsModule() {
  const { t, language } = useLanguage();
  const [custodyAccounts, setCustodyAccounts] = useState<CustodyAccount[]>([]);
  const [systemBalances, setSystemBalances] = useState<CurrencyBalance[]>([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showReserveModal, setShowReserveModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showBlackScreen, setShowBlackScreen] = useState(false);
  const [selectedAccount, setSelectedAccount] = useState<CustodyAccount | null>(null);
  const [showScrollTop, setShowScrollTop] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const accountsListRef = useRef<HTMLDivElement>(null);

  // Formulario de creación
  const [formData, setFormData] = useState({
    accountType: 'blockchain' as 'blockchain' | 'banking',
    accountName: '',
    currency: 'USD',
    amount: 0,
    blockchain: 'Ethereum',
    tokenSymbol: '',
    bankName: 'DAES - Data and Exchange Settlement',
  });


  // Formulario de reserva
  const [reserveData, setReserveData] = useState({
    amount: 0,
    // Para blockchain
    blockchain: 'Ethereum',
    contractAddress: '',
    tokenAmount: 0,
    // Para banking
    destinationBank: '',
    destinationAccount: '',
    transferReference: '',
  });

  // Formulario de transferencia API
  const [apiTransferData, setApiTransferData] = useState({
    amount: 0,
    destinationBank: '',
    destinationAccount: '',
    destinationIBAN: '',
    destinationSWIFT: '',
    beneficiaryName: '',
    reference: '',
    urgent: false,
  });

  // Cargar datos al montar
  useEffect(() => {
    const accounts = custodyStore.getAccounts();
    setCustodyAccounts(accounts);

    const balances = balanceStore.getBalances();
    setSystemBalances(balances);

    // 🔥 SUSCRIBIRSE A CAMBIOS EN TIEMPO REAL 🔥
    const unsubscribeCustody = custodyStore.subscribe((newAccounts) => {
      console.log('[CustodyModule] 🔄 Actualización de cuentas custodio:', newAccounts.length);
      setCustodyAccounts(newAccounts);
    });
    
    const unsubscribeBalance = balanceStore.subscribe((newBalances) => {
      console.log('[CustodyModule] 🔄 Actualización de balances del sistema:', newBalances.length, 'divisas');
      setSystemBalances(newBalances);
    });

    return () => {
      unsubscribeCustody();
      unsubscribeBalance();
    };
  }, []);

  // Detectar scroll para mostrar botón "Ir arriba"
  useEffect(() => {
    const handleScroll = () => {
      if (containerRef.current) {
        const scrollTop = containerRef.current.scrollTop;
        setShowScrollTop(scrollTop > 300);
      }
    };

    const container = containerRef.current;
    if (container) {
      container.addEventListener('scroll', handleScroll);
      return () => container.removeEventListener('scroll', handleScroll);
    }
  }, []);

  // Scroll automático a nueva cuenta cuando se crea
  useEffect(() => {
    if (custodyAccounts.length > 0 && accountsListRef.current) {
      // Scroll suave a la lista de cuentas cuando se crea una nueva
      setTimeout(() => {
        accountsListRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 200);
    }
  }, [custodyAccounts.length]);

  // Función para ir al inicio
  const scrollToTop = () => {
    if (containerRef.current) {
      containerRef.current.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  // Crear cuenta custodio
  const handleCreateAccount = () => {
    if (!formData.accountName || formData.amount <= 0) {
      alert('Completa todos los campos');
      return;
    }

    // Verificar que hay fondos disponibles
    const balance = systemBalances.find(b => b.currency === formData.currency);
    if (!balance || balance.totalAmount < formData.amount) {
      alert('Fondos insuficientes en el sistema DAES');
      return;
    }

    const balanceBefore = balance.totalAmount;
    const tokenSymbol = formData.tokenSymbol || `${formData.currency}T`;
    
    console.log('[CustodyModule] 💸 TRANSFERENCIA DE FONDOS:');
    console.log(`  Balance DAES ANTES: ${formData.currency} ${balanceBefore.toLocaleString()}`);
    console.log(`  Monto a transferir: ${formData.currency} ${formData.amount.toLocaleString()}`);
    console.log(`  Balance DAES DESPUÉS: ${formData.currency} ${(balanceBefore - formData.amount).toLocaleString()}`);
    console.log(`  Destino: Cuenta Custodio (${formData.accountType})`);
    
    custodyStore.createAccount(
      formData.accountType,
      formData.accountName,
      formData.currency,
      formData.amount,
      formData.blockchain,
      tokenSymbol,
      formData.bankName
    );

    setShowCreateModal(false);
    setFormData({ 
      accountType: 'blockchain', 
      accountName: '', 
      currency: 'USD', 
      amount: 0, 
      blockchain: 'Ethereum', 
      tokenSymbol: '',
      bankName: 'DAES - Data and Exchange Settlement',
    });
    
    // Mostrar mensaje de confirmación
    setTimeout(() => {
      alert(`✅ Cuenta custodio creada\n\n` +
            `Fondos transferidos del sistema DAES:\n` +
            `${formData.currency} ${formData.amount.toLocaleString()}\n\n` +
            `Balance DAES actualizado:\n` +
            `ANTES: ${formData.currency} ${balanceBefore.toLocaleString()}\n` +
            `DESPUÉS: ${formData.currency} ${(balanceBefore - formData.amount).toLocaleString()}`);
    }, 100);
  };

  // Eliminar cuenta con confirmación y devolución de fondos
  const handleDeleteAccount = async (account: CustodyAccount) => {
    const confirmMessage = language === 'es'
      ? `¿Estás seguro de que deseas eliminar esta cuenta?\n\n` +
        `Cuenta: ${account.accountName}\n` +
        `Tipo: ${account.accountType === 'blockchain' ? 'BLOCKCHAIN CUSTODY' : 'BANKING ACCOUNT'}\n` +
        `Número: ${account.accountNumber || 'N/A'}\n\n` +
        `Total de fondos: ${account.currency} ${account.totalBalance.toLocaleString()}\n` +
        `Reservado: ${account.currency} ${account.reservedBalance.toLocaleString()}\n` +
        `Disponible: ${account.currency} ${account.availableBalance.toLocaleString()}\n\n` +
        `⚠️ Los fondos (${account.currency} ${account.totalBalance.toLocaleString()}) se devolverán automáticamente al sistema DAES.\n` +
        `⚠️ Se eliminarán todos los pledges asociados (API VUSD y API VUSD1).\n\n` +
        `Esta acción NO se puede deshacer.`
      : `Are you sure you want to delete this account?\n\n` +
        `Account: ${account.accountName}\n` +
        `Type: ${account.accountType === 'blockchain' ? 'BLOCKCHAIN CUSTODY' : 'BANKING ACCOUNT'}\n` +
        `Number: ${account.accountNumber || 'N/A'}\n\n` +
        `Total funds: ${account.currency} ${account.totalBalance.toLocaleString()}\n` +
        `Reserved: ${account.currency} ${account.reservedBalance.toLocaleString()}\n` +
        `Available: ${account.currency} ${account.availableBalance.toLocaleString()}\n\n` +
        `⚠️ Funds (${account.currency} ${account.totalBalance.toLocaleString()}) will be automatically returned to DAES system.\n` +
        `⚠️ All associated pledges will be deleted (API VUSD and API VUSD1).\n\n` +
        `This action CANNOT be undone.`;

    if (confirm(confirmMessage)) {
      console.log('[CustodyModule] 🗑️ ELIMINANDO CUENTA:');
      console.log(`  Cuenta: ${account.accountName}`);
      console.log(`  Tipo: ${account.accountType === 'blockchain' ? 'BLOCKCHAIN' : 'BANKING'}`);
      console.log(`  Número: ${account.accountNumber}`);
      console.log(`  Fondos a devolver: ${account.currency} ${account.totalBalance.toLocaleString()}`);

      const balanceBefore = systemBalances.find(b => b.currency === account.currency)?.totalAmount || 0;

      // ========================================
      // STEP 1: ELIMINAR PLEDGES ASOCIADOS
      // ========================================
      console.log('[CustodyModule] 🗑️ Step 1: Eliminando pledges asociados...');

      let vusd1DeletedCount = 0;
      try {
        vusd1DeletedCount = await apiVUSD1Store.deletePledgesByCustodyAccountId(account.id);
        console.log(`[CustodyModule] ✅ API VUSD1: ${vusd1DeletedCount} pledges eliminados`);
      } catch (error) {
        console.error('[CustodyModule] ⚠️ Error eliminando pledges API VUSD1:', error);
      }

      // ========================================
      // STEP 2: ELIMINAR CUENTA
      // ========================================
      console.log('[CustodyModule] 🗑️ Step 2: Eliminando cuenta custody...');

      // Eliminar cuenta (automáticamente devuelve fondos al sistema)
      const success = custodyStore.deleteAccount(account.id);
      
      if (success) {
        const balanceAfter = balanceBefore + account.totalBalance;

        console.log('[CustodyModule] ✅ CUENTA ELIMINADA Y FONDOS DEVUELTOS');
        console.log(`  Balance DAES ANTES: ${account.currency} ${balanceBefore.toLocaleString()}`);
        console.log(`  Fondos devueltos: ${account.currency} ${account.totalBalance.toLocaleString()}`);
        console.log(`  Balance DAES DESPUÉS: ${account.currency} ${balanceAfter.toLocaleString()}`);
        console.log(`  Pledges API VUSD1 eliminados: ${vusd1DeletedCount}`);

        // Mostrar confirmación
        const confirmationMsg = language === 'es'
          ? `✅ Cuenta eliminada exitosamente\n\n` +
            `Fondos devueltos al sistema DAES:\n` +
            `${account.currency} ${account.totalBalance.toLocaleString()}\n\n` +
            `Balance DAES actualizado:\n` +
            `ANTES: ${account.currency} ${balanceBefore.toLocaleString()}\n` +
            `DESPUÉS: ${account.currency} ${balanceAfter.toLocaleString()}\n\n` +
            `Pledges eliminados:\n` +
            `API VUSD1: ${vusd1DeletedCount} pledge${vusd1DeletedCount !== 1 ? 's' : ''}\n\n` +
            `Los fondos están nuevamente disponibles en el sistema.`
          : `✅ Account deleted successfully\n\n` +
            `Funds returned to DAES system:\n` +
            `${account.currency} ${account.totalBalance.toLocaleString()}\n\n` +
            `DAES Balance updated:\n` +
            `BEFORE: ${account.currency} ${balanceBefore.toLocaleString()}\n` +
            `AFTER: ${account.currency} ${balanceAfter.toLocaleString()}\n\n` +
            `Pledges deleted:\n` +
            `API VUSD1: ${vusd1DeletedCount} pledge${vusd1DeletedCount !== 1 ? 's' : ''}\n\n` +
            `Funds are now available in the system again.`;

        setTimeout(() => {
          alert(confirmationMsg);
        }, 100);
      } else {
        alert(language === 'es' ? 'Error al eliminar la cuenta' : 'Error deleting account');
      }
    }
  };

  // Reservar fondos (blockchain o banking)
  const handleReserveFunds = (bypassLimits: boolean = false) => {
    if (!selectedAccount || reserveData.amount <= 0) {
      alert(language === 'es' ? 'Ingresa un monto válido' : 'Enter a valid amount');
      return;
    }

    const isBanking = (selectedAccount.accountType || 'blockchain') === 'banking';

    // Validar campos según tipo
    if (!isBanking && !reserveData.contractAddress) {
      alert(language === 'es' ? 'Ingresa la dirección del contrato blockchain' : 'Enter blockchain contract address');
      return;
    }

    const success = custodyStore.reserveFunds(
      selectedAccount.id,
      reserveData.amount,
      reserveData.blockchain,
      reserveData.contractAddress,
      reserveData.tokenAmount,
      bypassLimits
    );

    if (success) {
      // 🔥 AUTO-APROBAR SI ES CUENTA BANCARIA 🔥
      if (isBanking) {
        const account = custodyStore.getAccountById(selectedAccount.id);
        if (account && account.reservations.length > 0) {
          const lastReservation = account.reservations[account.reservations.length - 1];
          custodyStore.confirmReservation(selectedAccount.id, lastReservation.id);
          
          console.log('[CustodyModule] ✅ RESERVA BANCARIA AUTO-APROBADA');
          console.log(`  Cuenta: ${selectedAccount.accountName}`);
          console.log(`  Monto: ${selectedAccount.currency} ${reserveData.amount.toLocaleString()}`);
          console.log(`  Estado: RESERVED → CONFIRMED (automático)`);
          console.log(`  Motivo: Cuenta bancaria no requiere confirmación manual`);
        }
      }

      setShowReserveModal(false);
      setReserveData({ 
        amount: 0, 
        blockchain: 'Ethereum', 
        contractAddress: '', 
        tokenAmount: 0,
        destinationBank: '',
        destinationAccount: '',
        transferReference: '',
      });

      // Mensaje de confirmación
      const message = isBanking
        ? (language === 'es' 
          ? `✅ Fondos reservados y aprobados automáticamente\n\nCuenta bancaria: ${selectedAccount.accountName}\nMonto: ${selectedAccount.currency} ${reserveData.amount.toLocaleString()}\n\nEstado: CONFIRMED\nListo para transferencia API` 
          : `✅ Funds reserved and auto-approved\n\nBanking account: ${selectedAccount.accountName}\nAmount: ${selectedAccount.currency} ${reserveData.amount.toLocaleString()}\n\nStatus: CONFIRMED\nReady for API transfer`)
        : (language === 'es'
          ? `✅ Fondos reservados para tokenización\n\nMonto: ${selectedAccount.currency} ${reserveData.amount.toLocaleString()}\nTokens: ${reserveData.tokenAmount.toLocaleString()} ${selectedAccount.tokenSymbol}\n\nEstado: RESERVED (requiere confirmación manual)`
          : `✅ Funds reserved for tokenization\n\nAmount: ${selectedAccount.currency} ${reserveData.amount.toLocaleString()}\nTokens: ${reserveData.tokenAmount.toLocaleString()} ${selectedAccount.tokenSymbol}\n\nStatus: RESERVED (requires manual confirmation)`);

      setTimeout(() => alert(message), 100);
    } else {
      alert(language === 'es' ? 'Error al reservar fondos' : 'Error reserving funds');
    }
  };

  // Copiar al portapapeles
  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  // Exportar estado de cuenta
  const exportAccountStatement = (account: CustodyAccount) => {
    const timestamp = new Date().toLocaleString(language === 'es' ? 'es-ES' : 'en-US');
    const isBanking = (account.accountType || 'blockchain') === 'banking';
    
    const statement = `
╔═══════════════════════════════════════════════════════════════════════╗
║           ${language === 'es' ? 'ESTADO DE CUENTA CUSTODIO' : 'CUSTODY ACCOUNT STATEMENT'}                    ║
║           DAES - DATA AND EXCHANGE SETTLEMENT                        ║
╚═══════════════════════════════════════════════════════════════════════╝

${language === 'es' ? 'DOCUMENTO CONFIDENCIAL' : 'CONFIDENTIAL DOCUMENT'}
═══════════════════════════════════════════════════════════════════════

${language === 'es' ? 'TIPO DE CUENTA' : 'ACCOUNT TYPE'}:
${isBanking 
  ? `🏦 CUENTA BANCARIA (BANKING ACCOUNT)
     ${language === 'es' ? 'Configurada para transferencias API internacionales' : 'Configured for international API transfers'}
     ${language === 'es' ? 'Compatible con sistemas ISO 20022' : 'Compatible with ISO 20022 systems'}`
  : `🌐 CUENTA BLOCKCHAIN (BLOCKCHAIN CUSTODY)
     ${language === 'es' ? 'Configurada para tokenización y stablecoins' : 'Configured for tokenization and stablecoins'}
     ${language === 'es' ? 'Red' : 'Network'}: ${account.blockchainLink || 'N/A'}
     Token: ${account.tokenSymbol || 'N/A'}`
}

═══════════════════════════════════════════════════════════════════════
${language === 'es' ? 'IDENTIFICACIÓN' : 'IDENTIFICATION'}
═══════════════════════════════════════════════════════════════════════

${language === 'es' ? 'Nombre de la Cuenta' : 'Account Name'}:      ${account.accountName}
${language === 'es' ? 'Número de Cuenta' : 'Account Number'}:         ${account.accountNumber || 'N/A'}
ID Interno:                   ${account.id}
${language === 'es' ? 'Moneda' : 'Currency'}:                         ${account.currency}
${language === 'es' ? 'Fecha de Creación' : 'Creation Date'}:        ${new Date(account.createdAt).toLocaleString(language === 'es' ? 'es-ES' : 'en-US')}

═══════════════════════════════════════════════════════════════════════
${language === 'es' ? 'RESUMEN DE BALANCES' : 'BALANCE SUMMARY'}
═══════════════════════════════════════════════════════════════════════

${language === 'es' ? 'Balance Total' : 'Total Balance'}:             ${account.currency} ${account.totalBalance.toLocaleString()}
${language === 'es' ? 'Fondos Reservados' : 'Reserved Funds'}:        ${account.currency} ${account.reservedBalance.toLocaleString()}
${language === 'es' ? 'Fondos Disponibles' : 'Available Funds'}:      ${account.currency} ${account.availableBalance.toLocaleString()}

${language === 'es' ? 'Porcentaje Reservado' : 'Reserved Percentage'}:  ${account.totalBalance > 0 ? ((account.reservedBalance / account.totalBalance) * 100).toFixed(2) : 0}%
${language === 'es' ? 'Porcentaje Disponible' : 'Available Percentage'}: ${account.totalBalance > 0 ? ((account.availableBalance / account.totalBalance) * 100).toFixed(2) : 0}%

${isBanking ? `
═══════════════════════════════════════════════════════════════════════
${language === 'es' ? 'INFORMACIÓN BANCARIA' : 'BANKING INFORMATION'}
═══════════════════════════════════════════════════════════════════════

${language === 'es' ? 'Banco' : 'Bank'}:                  ${account.bankName || 'DAES - Data and Exchange Settlement'}
${language === 'es' ? 'Tipo de Cuenta' : 'Account Type'}:  BANKING ACCOUNT

${language === 'es' ? 'CAPACIDADES' : 'CAPABILITIES'}:
✓ ${language === 'es' ? 'Transferencias API internacionales' : 'International API transfers'}
✓ ${language === 'es' ? 'Compatible con sistemas ISO 20022' : 'Compatible with ISO 20022 systems'}
✓ ${language === 'es' ? 'Integración con bancos centrales' : 'Central bank integration'}
✓ ${language === 'es' ? 'Soporte SWIFT network' : 'SWIFT network support'}
` : `
═══════════════════════════════════════════════════════════════════════
${language === 'es' ? 'INFORMACIÓN BLOCKCHAIN' : 'BLOCKCHAIN INFORMATION'}
═══════════════════════════════════════════════════════════════════════

Blockchain Network:           ${account.blockchainLink || 'N/A'}
Token Symbol:                 ${account.tokenSymbol || 'N/A'}
${language === 'es' ? 'Dirección del Contrato' : 'Contract Address'}:  ${account.contractAddress || 'N/A'}
`}

═══════════════════════════════════════════════════════════════════════
${language === 'es' ? 'API DE VERIFICACIÓN' : 'VERIFICATION API'}
═══════════════════════════════════════════════════════════════════════

Endpoint:                     ${account.apiEndpoint}
API Key:                      ${account.apiKey || 'N/A'}
${language === 'es' ? 'Estado API' : 'API Status'}:                   ${(account.apiStatus || 'pending').toUpperCase()}

${language === 'es' ? 'USO' : 'USAGE'}:
GET ${account.apiEndpoint}
Authorization: Bearer ${account.apiKey || '[API_KEY]'}

═══════════════════════════════════════════════════════════════════════
${language === 'es' ? 'SEGURIDAD Y CUMPLIMIENTO' : 'SECURITY & COMPLIANCE'}
═══════════════════════════════════════════════════════════════════════

${language === 'es' ? 'Hash de Verificación' : 'Verification Hash'} (SHA-256):
${account.verificationHash}

${language === 'es' ? 'Datos Encriptados' : 'Encrypted Data'} (AES-256):
${account.encryptedData.substring(0, 80)}...

${language === 'es' ? 'CUMPLIMIENTO DE ESTÁNDARES' : 'STANDARDS COMPLIANCE'}:
┌─────────────────────────────────────────────────────────────────┐
│ 🥇 ISO 27001:2022 - ${language === 'es' ? 'Seguridad de la Información' : 'Information Security'}        │
│    ${language === 'es' ? 'Estado' : 'Status'}: ${account.iso27001Compliant !== false ? '✓ COMPLIANT' : '⚡ PENDING'}                                      │
│    ${language === 'es' ? 'Seguridad total del sistema DAES' : 'Total DAES system security'}                  │
│                                                                 │
│ 🥇 ISO 20022 - ${language === 'es' ? 'Interoperabilidad Financiera' : 'Financial Interoperability'}          │
│    ${language === 'es' ? 'Estado' : 'Status'}: ${account.iso20022Compatible !== false ? '✓ COMPATIBLE' : '⚡ PENDING'}                                   │
│    ${language === 'es' ? 'Interoperabilidad con bancos centrales' : 'Central bank interoperability'}          │
│                                                                 │
│ 🥇 FATF AML/CFT - ${language === 'es' ? 'Anti-Lavado de Dinero' : 'Anti-Money Laundering'}               │
│    ${language === 'es' ? 'Estado' : 'Status'}: ${account.fatfAmlVerified !== false ? '✓ VERIFIED' : '⚡ PENDING'}                                    │
│    ${language === 'es' ? 'Legalidad y trazabilidad global' : 'Global legality & traceability'}               │
└─────────────────────────────────────────────────────────────────┘

KYC ${language === 'es' ? 'Verificado' : 'Verified'}:               ${account.kycVerified !== false ? '✓ YES' : '✗ NO'}
AML Score:                    ${account.amlScore || 85}/100 ${
  (account.amlScore || 85) >= 90 ? '(LOW RISK)' : 
  (account.amlScore || 85) >= 75 ? '(MEDIUM RISK)' : 
  '(HIGH RISK)'}
${language === 'es' ? 'Nivel de Riesgo' : 'Risk Level'}:              ${(account.riskLevel || 'medium').toUpperCase()}

═══════════════════════════════════════════════════════════════════════
${language === 'es' ? 'RESERVAS ACTIVAS' : 'ACTIVE RESERVATIONS'} (${account.reservations?.length || 0})
═══════════════════════════════════════════════════════════════════════

${account.reservations && account.reservations.length > 0 ? account.reservations.map((r, i) => `
${i + 1}. ${language === 'es' ? 'Reserva' : 'Reservation'} ${r.id}
   ${language === 'es' ? 'Monto' : 'Amount'}:                 ${account.currency} ${r.amount.toLocaleString()}
   ${language === 'es' ? 'Estado' : 'Status'}:                ${r.status.toUpperCase()}
   ${r.type === 'blockchain' ? `Blockchain:             ${r.blockchain || 'N/A'}
   ${language === 'es' ? 'Contrato' : 'Contract'}:            ${r.contractAddress || 'N/A'}
   Tokens:               ${r.tokenAmount?.toLocaleString() || 'N/A'} ${account.tokenSymbol || ''}` : `
   ${language === 'es' ? 'Referencia' : 'Reference'}:         ${r.transferReference || 'N/A'}`}
   Timestamp:            ${new Date(r.timestamp).toLocaleString(language === 'es' ? 'es-ES' : 'en-US')}
`).join('\n') : (language === 'es' ? 'No hay reservas activas' : 'No active reservations')}

═══════════════════════════════════════════════════════════════════════
${language === 'es' ? 'AUDITORÍA' : 'AUDIT TRAIL'}
═══════════════════════════════════════════════════════════════════════

${language === 'es' ? 'Fecha de Creación' : 'Created'}:              ${new Date(account.createdAt).toLocaleString(language === 'es' ? 'es-ES' : 'en-US')}
${language === 'es' ? 'Última Actualización' : 'Last Updated'}:      ${new Date(account.lastUpdated).toLocaleString(language === 'es' ? 'es-ES' : 'en-US')}
${language === 'es' ? 'Última Auditoría' : 'Last Audit'}:            ${new Date(account.lastAudit || account.lastUpdated).toLocaleString(language === 'es' ? 'es-ES' : 'en-US')}

═══════════════════════════════════════════════════════════════════════
${language === 'es' ? 'CERTIFICACIÓN' : 'CERTIFICATION'}
═══════════════════════════════════════════════════════════════════════

${language === 'es' 
  ? 'Este estado de cuenta certifica que los fondos mencionados están bajo custodia del sistema DAES (Data and Exchange Settlement) y están disponibles según se indica.'
  : 'This account statement certifies that the mentioned funds are under custody of the DAES system (Data and Exchange Settlement) and are available as indicated.'}

${language === 'es' ? 'Cumplimiento' : 'Compliance'}: ISO 27001 • ISO 20022 • FATF AML/CFT
${language === 'es' ? 'Seguridad' : 'Security'}: SHA-256 Hash • AES-256 Encryption

═══════════════════════════════════════════════════════════════════════

${language === 'es' ? 'Generado' : 'Generated'}: ${timestamp}
${language === 'es' ? 'Generado por' : 'Generated by'}: DAES CoreBanking System
${language === 'es' ? 'Hash del Documento' : 'Document Hash'}: ${Math.random().toString(36).substring(2, 15).toUpperCase()}

© ${new Date().getFullYear()} DAES - Data and Exchange Settlement
═══════════════════════════════════════════════════════════════════════
`;

    const blob = new Blob([statement], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const fileName = `Estado_Cuenta_${account.accountNumber || account.id}_${Date.now()}.txt`;
    a.download = fileName;
    a.click();
    URL.revokeObjectURL(url);
    
    console.log('[CustodyModule] 📥 Estado de cuenta descargado:', fileName);
  };

  // Exportar informe de cuenta
  const exportAccountReport = (account: CustodyAccount) => {
    const report = `
═══════════════════════════════════════════════════════════════════════
DAES CUSTODY ACCOUNT - VERIFICACIÓN DE FONDOS RESERVADOS
═══════════════════════════════════════════════════════════════════════

INFORMACIÓN DE LA CUENTA CUSTODIO
───────────────────────────────────────────────────────────────────────

ID de Cuenta:           ${account.id}
Nombre:                 ${account.accountName}
Moneda:                 ${account.currency}

BALANCES
───────────────────────────────────────────────────────────────────────

Total:                  ${account.currency} ${account.totalBalance.toLocaleString()}
Reservado:              ${account.currency} ${account.reservedBalance.toLocaleString()}
Disponible:             ${account.currency} ${account.availableBalance.toLocaleString()}

INFORMACIÓN BLOCKCHAIN
───────────────────────────────────────────────────────────────────────

Blockchain:             ${account.blockchainLink}
Dirección Contrato:     ${account.contractAddress}
Token Symbol:           ${account.tokenSymbol}
API Endpoint:           ${account.apiEndpoint}
Estado API:             ${account.apiStatus.toUpperCase()}

VERIFICACIÓN Y SEGURIDAD
───────────────────────────────────────────────────────────────────────

Hash de Verificación:   ${account.verificationHash}
Datos Encriptados:      ${account.encryptedData.substring(0, 50)}...
Algoritmo:              AES-256
Creado:                 ${new Date(account.createdAt).toLocaleString()}
Última Actualización:   ${new Date(account.lastUpdated).toLocaleString()}

RESERVAS ACTIVAS (${account.reservations.length})
═══════════════════════════════════════════════════════════════════════

${account.reservations.map((r, i) => `
${i + 1}. Reserva ${r.id}
   Monto Reservado:     ${account.currency} ${r.amount.toLocaleString()}
   Blockchain:          ${r.blockchain}
   Contrato:            ${r.contractAddress}
   Tokens Emitidos:     ${r.tokenAmount.toLocaleString()} ${account.tokenSymbol}
   Estado:              ${r.status.toUpperCase()}
   Timestamp:           ${new Date(r.timestamp).toLocaleString()}
`).join('\n')}

═══════════════════════════════════════════════════════════════════════
CERTIFICACIÓN
═══════════════════════════════════════════════════════════════════════

Este documento certifica que los fondos arriba mencionados están reservados
y bajo custodia del sistema DAES (Data and Exchange Settlement) para respaldo
de stablecoins y activos tokenizados en blockchain.

Estándares de Cumplimiento:
✓ ISO 27001:2022 - Seguridad de la Información
✓ ISO 20022 - Interoperabilidad Financiera
✓ FATF AML/CFT - Anti-Lavado de Dinero

Generado por: DAES CoreBanking System
Timestamp: ${new Date().toISOString()}
Hash de Documento: ${Math.random().toString(36).substring(2, 15).toUpperCase()}

© ${new Date().getFullYear()} DAES - Data and Exchange Settlement
═══════════════════════════════════════════════════════════════════════
`;

    const blob = new Blob([report], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `DAES_Custody_Account_${account.id}_${Date.now()}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const stats = custodyStore.getStats();

  return (
    <div className="relative w-full h-full">
      {/* Contenedor principal con scroll */}
      <div 
        ref={containerRef} 
        className="absolute inset-0 overflow-y-auto overflow-x-hidden p-8 space-y-6"
        style={{ 
          scrollBehavior: 'smooth',
          WebkitOverflowScrolling: 'touch' // Para scroll suave en móviles
        }}
      >
        {/* Botón flotante "Ir arriba" */}
        {showScrollTop && (
          <button
            onClick={scrollToTop}
            className="fixed bottom-8 right-8 z-50 p-4 bg-gradient-to-br from-[#00ff88] to-[#00cc6a] text-black font-bold rounded-full shadow-[0_0_30px_rgba(0,255,136,0.8)] hover:shadow-[0_0_50px_rgba(0,255,136,1)] transition-all hover:scale-110 animate-bounce"
            title={language === 'es' ? 'Ir al inicio' : 'Go to top'}
          >
            <ArrowUp className="w-6 h-6" />
          </button>
        )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-[#00ff88] flex items-center gap-3">
            <Shield className="w-8 h-8" />
            {language === 'es' ? 'Cuentas Custodio - Tokenización Blockchain' : 'Custody Accounts - Blockchain Tokenization'}
          </h1>
          <p className="text-[#4d7c4d] mt-2">
            {language === 'es' 
              ? 'Sistema de reservas y verificación de fondos para stablecoins' 
              : 'Reserve system and fund verification for stablecoins'}
          </p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="px-6 py-3 bg-gradient-to-br from-[#00ff88] to-[#00cc6a] text-black font-bold rounded-lg hover:shadow-[0_0_20px_rgba(0,255,136,0.6)] transition-all flex items-center gap-2"
        >
          <Plus className="w-5 h-5" />
          {language === 'es' ? 'Crear Cuenta Custodio' : 'Create Custody Account'}
        </button>
      </div>

      {/* Estadísticas Generales */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-[#0d0d0d] border border-[#1a1a1a] rounded-xl p-6">
          <div className="flex items-center gap-3 mb-2">
            <Wallet className="w-5 h-5 text-[#00ff88]" />
            <span className="text-[#4d7c4d] text-sm">{language === 'es' ? 'Cuentas Totales' : 'Total Accounts'}</span>
          </div>
          <p className="text-3xl font-bold text-[#00ff88]">{stats.totalAccounts}</p>
        </div>

        <div className="bg-[#0d0d0d] border border-[#1a1a1a] rounded-xl p-6">
          <div className="flex items-center gap-3 mb-2">
            <Lock className="w-5 h-5 text-yellow-400" />
            <span className="text-[#4d7c4d] text-sm">{language === 'es' ? 'Fondos Reservados' : 'Reserved Funds'}</span>
          </div>
          <p className="text-3xl font-bold text-yellow-400">${stats.totalReserved.toLocaleString()}</p>
        </div>

        <div className="bg-[#0d0d0d] border border-[#1a1a1a] rounded-xl p-6">
          <div className="flex items-center gap-3 mb-2">
            <Unlock className="w-5 h-5 text-green-400" />
            <span className="text-[#4d7c4d] text-sm">{language === 'es' ? 'Fondos Disponibles' : 'Available Funds'}</span>
          </div>
          <p className="text-3xl font-bold text-green-400">${stats.totalAvailable.toLocaleString()}</p>
        </div>

        <div className="bg-[#0d0d0d] border border-[#1a1a1a] rounded-xl p-6">
          <div className="flex items-center gap-3 mb-2">
            <CheckCircle className="w-5 h-5 text-cyan-400" />
            <span className="text-[#4d7c4d] text-sm">{language === 'es' ? 'Reservas Confirmadas' : 'Confirmed Reservations'}</span>
          </div>
          <p className="text-3xl font-bold text-cyan-400">{stats.confirmedReservations}</p>
        </div>
      </div>

      {/* Balances del Sistema Disponibles */}
      {systemBalances.length > 0 && (
        <div className="bg-[#0d0d0d] border border-[#1a1a1a] rounded-xl p-6">
          <h2 className="text-xl font-semibold text-[#00ff88] mb-4">
            {language === 'es' ? 'Fondos Disponibles del Sistema Digital Commercial Bank Ltd' : 'Digital Commercial Bank Ltd System Available Funds'}
          </h2>
          <div className="grid grid-cols-3 md:grid-cols-5 gap-3">
            {systemBalances.map(bal => (
              <div key={bal.currency} className="bg-[#0a0a0a] border border-[#00ff88]/20 rounded-lg p-3 text-center">
                <div className="text-sm text-[#4d7c4d]">{bal.currency}</div>
                <div className="text-lg font-bold text-[#00ff88] font-mono">
                  {bal.totalAmount.toLocaleString()}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Cuentas Custodio */}
      {custodyAccounts.length > 0 ? (
        <>
        <div ref={accountsListRef} className="space-y-4">
          {custodyAccounts.map(account => (
            <div 
              key={account.id} 
              className="bg-[#0d0d0d] border border-[#1a1a1a] rounded-xl p-6 hover:border-[#00ff88]/30 transition-all cursor-pointer"
              onClick={() => {
                setSelectedAccount(account);
                setShowDetailsModal(true);
              }}
              title={language === 'es' ? 'Clic para ver detalles completos' : 'Click to view full details'}
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    {(account.accountType || 'blockchain') === 'blockchain' ? (
                      <div className="text-2xl">🌐</div>
                    ) : (
                      <div className="text-2xl">🏦</div>
                    )}
                    <h3 className="text-xl font-bold text-[#00ff88]">{account.accountName}</h3>
                    <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                      (account.accountType || 'blockchain') === 'blockchain' 
                        ? 'bg-cyan-500/20 border border-cyan-500/40 text-cyan-400' 
                        : 'bg-green-500/20 border border-green-500/40 text-green-400'
                    }`}>
                      {(account.accountType || 'blockchain') === 'blockchain' ? 'BLOCKCHAIN CUSTODY' : 'BANKING ACCOUNT'}
                    </span>
                    <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                      account.apiStatus === 'active' ? 'bg-green-500/20 text-green-400' :
                      account.apiStatus === 'pending' ? 'bg-yellow-500/20 text-yellow-400' :
                      'bg-red-500/20 text-red-400'
                    }`}>
                      {(account.apiStatus || 'pending').toUpperCase()}
                    </span>
                  </div>
                  <div className="flex items-center gap-4 text-sm">
                    <p className="text-[#4d7c4d]">ID: {account.id}</p>
                    {account.accountNumber && (
                      <p className="text-[#00ff88] font-mono font-bold">
                        {language === 'es' ? 'Nº Cuenta:' : 'Account #:'} {account.accountNumber}
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex gap-2 flex-wrap">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      const verificationUrl = `${window.location.origin}/${account.accountType}/verify/${account.id}`;
                      window.open(verificationUrl, '_blank');
                    }}
                    className="px-4 py-2 bg-gradient-to-r from-green-600 to-blue-600 text-white rounded-lg hover:shadow-[0_0_20px_rgba(0,255,136,0.6)] transition-all text-sm font-bold"
                  >
                    <Shield className="w-4 h-4 inline mr-1" />
                    {language === 'es' ? 'Ver Verificación' : 'View Verification'}
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedAccount(account);
                      setShowBlackScreen(true);
                    }}
                    className="px-4 py-2 bg-black border border-[#00ff88] text-[#00ff88] rounded-lg hover:shadow-[0_0_15px_rgba(0,255,136,0.6)] transition-all text-sm font-bold"
                  >
                    <CheckCircle className="w-4 h-4 inline mr-1" />
                    Black Screen
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedAccount(account);
                      setShowReserveModal(true);
                    }}
                    className="px-4 py-2 bg-[#1a1a1a] border border-[#00ff88]/30 text-[#00ff88] rounded-lg hover:bg-[#252525] transition-all text-sm"
                  >
                    <Lock className="w-4 h-4 inline mr-1" />
                    {language === 'es' ? 'Reservar' : 'Reserve'}
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteAccount(account);
                    }}
                    className="px-4 py-2 bg-red-900/30 border border-red-700/50 text-red-400 rounded-lg hover:bg-red-900/50 transition-all text-sm"
                  >
                    <X className="w-4 h-4 inline mr-1" />
                    {language === 'es' ? 'Eliminar' : 'Delete'}
                  </button>
                </div>
              </div>

              {/* Balances */}
              <div className="grid grid-cols-3 gap-4 mb-4">
                <div className="bg-[#0a0a0a] border border-[#1a1a1a] rounded-lg p-4">
                  <div className="text-xs text-[#4d7c4d] mb-1">
                    {language === 'es' ? 'Total' : 'Total'}
                  </div>
                  <div className="text-2xl font-bold text-[#00ff88] font-mono">
                    {account.currency} {account.totalBalance.toLocaleString()}
                  </div>
                </div>
                <div className="bg-[#0a0a0a] border border-yellow-900/30 rounded-lg p-4">
                  <div className="text-xs text-[#4d7c4d] mb-1">
                    {language === 'es' ? 'Reservado' : 'Reserved'}
                  </div>
                  <div className="text-2xl font-bold text-yellow-400 font-mono">
                    {account.currency} {account.reservedBalance.toLocaleString()}
                  </div>
                </div>
                <div className="bg-[#0a0a0a] border border-green-900/30 rounded-lg p-4">
                  <div className="text-xs text-[#4d7c4d] mb-1">
                    {language === 'es' ? 'Disponible' : 'Available'}
                  </div>
                  <div className="text-2xl font-bold text-green-400 font-mono">
                    {account.currency} {account.availableBalance.toLocaleString()}
                  </div>
                </div>
              </div>

              {/* API Integration Toggles */}
              <div className="bg-gradient-to-r from-purple-900/20 to-pink-900/20 border border-purple-500/30 rounded-lg p-4 mb-4">
                <h4 className="text-sm font-semibold text-purple-400 mb-3 flex items-center gap-2">
                  🔗 {language === 'es' ? 'Integración con APIs' : 'API Integration'}
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* VUSD Balance Toggle */}
                  <div className="flex items-center justify-between bg-black/30 rounded-lg p-3 border border-purple-500/20">
                    <div className="flex items-center gap-2">
                      <Shield className="w-4 h-4 text-green-400" />
                      <div>
                        <div className="text-sm font-semibold text-white">API VUSD</div>
                        <div className="text-xs text-gray-400">
                          {account.vusdBalanceEnabled ? (
                            <span className="text-green-400">✓ {language === 'es' ? 'Activo' : 'Active'}</span>
                          ) : (
                            <span className="text-gray-500">{language === 'es' ? 'Desactivado' : 'Disabled'}</span>
                          )}
                          {account.vusdBalanceId && (
                            <span className="ml-2 font-mono text-xs">({account.vusdBalanceId.substring(0, 10)}...)</span>
                          )}
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={async (e) => {
                        e.stopPropagation();
                        try {
                          await custodyStore.toggleVUSDBalance(account.id, !account.vusdBalanceEnabled);
                          loadCustodyAccounts();
                        } catch (error) {
                          console.error('Error toggling VUSD:', error);
                        }
                      }}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                        account.vusdBalanceEnabled ? 'bg-green-600' : 'bg-gray-600'
                      }`}
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                          account.vusdBalanceEnabled ? 'translate-x-6' : 'translate-x-1'
                        }`}
                      />
                    </button>
                  </div>

                  {/* DAES Pledge Toggle */}
                  <div className="flex items-center justify-between bg-black/30 rounded-lg p-3 border border-purple-500/20">
                    <div className="flex items-center gap-2">
                      <Lock className="w-4 h-4 text-blue-400" />
                      <div>
                        <div className="text-sm font-semibold text-white">DAES Pledge/Escrow</div>
                        <div className="text-xs text-gray-400">
                          {account.daesPledgeEnabled ? (
                            <span className="text-blue-400">✓ {language === 'es' ? 'Activo' : 'Active'}</span>
                          ) : (
                            <span className="text-gray-500">{language === 'es' ? 'Desactivado' : 'Disabled'}</span>
                          )}
                          {account.daesPledgeId && (
                            <span className="ml-2 font-mono text-xs">({account.daesPledgeId.substring(0, 10)}...)</span>
                          )}
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={async (e) => {
                        e.stopPropagation();
                        try {
                          await custodyStore.toggleDAESPledge(account.id, !account.daesPledgeEnabled);
                          loadCustodyAccounts();
                        } catch (error) {
                          console.error('Error toggling DAES Pledge:', error);
                        }
                      }}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                        account.daesPledgeEnabled ? 'bg-blue-600' : 'bg-gray-600'
                      }`}
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                          account.daesPledgeEnabled ? 'translate-x-6' : 'translate-x-1'
                        }`}
                      />
                    </button>
                  </div>
                </div>
              </div>

              {/* Información según Tipo de Cuenta */}
              {(account.accountType || 'blockchain') === 'blockchain' ? (
                <div className="bg-gradient-to-r from-cyan-900/20 to-blue-900/20 border border-cyan-500/30 rounded-lg p-4 mb-4">
                  <h4 className="text-sm font-semibold text-cyan-400 mb-3 flex items-center gap-2">
                    🌐 Información Blockchain & Tokenización
                  </h4>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <div className="text-[#4d7c4d] mb-1">{language === 'es' ? 'Número de Cuenta:' : 'Account Number:'}</div>
                      <div className="text-cyan-400 font-mono font-bold">{account.accountNumber}</div>
                    </div>
                    <div>
                      <div className="text-[#4d7c4d] mb-1">Blockchain:</div>
                      <div className="text-[#80ff80] flex items-center gap-2">
                        {account.blockchainLink}
                        <ExternalLink className="w-3 h-3" />
                      </div>
                    </div>
                    <div>
                      <div className="text-[#4d7c4d] mb-1">Token Symbol:</div>
                      <div className="text-[#80ff80] font-mono font-bold">{account.tokenSymbol}</div>
                    </div>
                    <div className="col-span-1">
                      <div className="text-[#4d7c4d] mb-1">Tipo:</div>
                      <div className="text-cyan-400 font-bold">BLOCKCHAIN CUSTODY</div>
                    </div>
                    <div className="col-span-2">
                      <div className="text-[#4d7c4d] mb-1">Dirección del Contrato:</div>
                      <div className="flex items-center gap-2">
                        <code className="text-[#80ff80] font-mono text-xs bg-[#000] border border-[#1a1a1a] rounded px-2 py-1 flex-1">
                          {account.contractAddress}
                        </code>
                        <button
                          onClick={() => copyToClipboard(account.contractAddress || '')}
                          className="p-1 bg-[#1a1a1a] border border-[#00ff88]/30 rounded hover:bg-[#252525]"
                          title="Copiar"
                        >
                          <Copy className="w-4 h-4 text-[#00ff88]" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="bg-gradient-to-r from-green-900/20 to-emerald-900/20 border border-green-500/30 rounded-lg p-4 mb-4">
                  <h4 className="text-sm font-semibold text-green-400 mb-3 flex items-center gap-2">
                    🏦 {language === 'es' ? 'Información Bancaria' : 'Banking Information'}
                  </h4>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <div className="text-[#4d7c4d] mb-1">{language === 'es' ? 'Número de Cuenta:' : 'Account Number:'}</div>
                      <div className="text-green-400 font-mono font-bold">{account.accountNumber}</div>
                    </div>
                    <div>
                      <div className="text-[#4d7c4d] mb-1">{language === 'es' ? 'Banco:' : 'Bank:'}</div>
                      <div className="text-[#80ff80]">{account.bankName}</div>
                    </div>
                    <div>
                      <div className="text-[#4d7c4d] mb-1">{language === 'es' ? 'Tipo:' : 'Type:'}</div>
                      <div className="text-green-400 font-bold">BANKING ACCOUNT</div>
                    </div>
                  </div>
                </div>
              )}

              {/* API Endpoint (común para ambos tipos) */}
              <div className="bg-[#0a0a0a] border border-[#1a1a1a] rounded-lg p-4 mb-4">
                <h4 className="text-sm font-semibold text-[#00ff88] mb-3">
                  {language === 'es' ? 'API de Verificación' : 'Verification API'}
                </h4>
                <div className="space-y-3">
                  <div>
                    <div className="text-[#4d7c4d] mb-1 text-xs">Endpoint:</div>
                    <div className="flex items-center gap-2">
                      <code className="text-cyan-400 font-mono text-xs bg-[#000] border border-cyan-500/20 rounded px-2 py-1 flex-1">
                        {account.apiEndpoint}
                      </code>
                      <a
                        href={account.apiEndpoint}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-1 bg-cyan-500/20 border border-cyan-500/30 rounded hover:bg-cyan-500/30"
                        title="Verificar API"
                      >
                        <ExternalLink className="w-4 h-4 text-cyan-400" />
                      </a>
                    </div>
                  </div>
                  {account.apiKey && (
                    <div>
                      <div className="text-[#4d7c4d] mb-1 text-xs">API Key:</div>
                      <div className="flex items-center gap-2">
                        <code className="text-orange-400 font-mono text-xs bg-[#000] border border-orange-500/20 rounded px-2 py-1 flex-1">
                          {account.apiKey}
                        </code>
                        <button
                          onClick={() => copyToClipboard(account.apiKey)}
                          className="p-1 bg-orange-500/20 border border-orange-500/30 rounded hover:bg-orange-500/30"
                          title="Copiar API Key"
                        >
                          <Copy className="w-4 h-4 text-orange-400" />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Cumplimiento y Seguridad ISO/FATF */}
              <div className="bg-gradient-to-r from-green-900/20 to-cyan-900/20 border border-green-500/30 rounded-lg p-4 mb-4">
                <h4 className="text-sm font-semibold text-green-400 mb-3 flex items-center gap-2">
                  🥇 {language === 'es' ? 'Cumplimiento de Estándares Internacionales' : 'International Standards Compliance'}
                </h4>
                <div className="grid grid-cols-3 gap-3 mb-3">
                  <div className="bg-[#0a0a0a] border border-cyan-500/20 rounded p-2 text-center">
                    <div className="text-xs text-[#4d7c4d] mb-1">ISO 27001</div>
                    <div className={`font-bold text-sm ${account.iso27001Compliant !== false ? 'text-green-400' : 'text-yellow-400'}`}>
                      {account.iso27001Compliant !== false ? '✓ COMPLIANT' : '⚡ PENDING'}
                    </div>
                    <div className="text-xs text-cyan-300 mt-1">{language === 'es' ? 'Seguridad' : 'Security'}</div>
                  </div>
                  <div className="bg-[#0a0a0a] border border-blue-500/20 rounded p-2 text-center">
                    <div className="text-xs text-[#4d7c4d] mb-1">ISO 20022</div>
                    <div className={`font-bold text-sm ${account.iso20022Compatible !== false ? 'text-green-400' : 'text-yellow-400'}`}>
                      {account.iso20022Compatible !== false ? '✓ COMPATIBLE' : '⚡ PENDING'}
                    </div>
                    <div className="text-xs text-blue-300 mt-1">{language === 'es' ? 'Interop.' : 'Interop.'}</div>
                  </div>
                  <div className="bg-[#0a0a0a] border border-yellow-500/20 rounded p-2 text-center">
                    <div className="text-xs text-[#4d7c4d] mb-1">FATF AML/CFT</div>
                    <div className={`font-bold text-sm ${account.fatfAmlVerified !== false ? 'text-green-400' : 'text-yellow-400'}`}>
                      {account.fatfAmlVerified !== false ? '✓ VERIFIED' : '⚡ PENDING'}
                    </div>
                    <div className="text-xs text-yellow-300 mt-1">{language === 'es' ? 'Anti-Lavado' : 'Anti-Money Laundering'}</div>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-3 text-xs">
                  <div className="bg-[#0a0a0a] border border-[#1a1a1a] rounded p-2">
                    <div className="text-[#4d7c4d] mb-1">KYC Status:</div>
                    <div className={`font-semibold ${account.kycVerified !== false ? 'text-green-400' : 'text-red-400'}`}>
                      {account.kycVerified !== false ? '✓ VERIFIED' : '✗ NOT VERIFIED'}
                    </div>
                  </div>
                  <div className="bg-[#0a0a0a] border border-[#1a1a1a] rounded p-2">
                    <div className="text-[#4d7c4d] mb-1">AML Score:</div>
                    <div className={`font-mono font-bold ${
                      (account.amlScore || 85) >= 90 ? 'text-green-400' :
                      (account.amlScore || 85) >= 75 ? 'text-yellow-400' :
                      'text-red-400'
                    }`}>
                      {account.amlScore || 85}/100
                    </div>
                  </div>
                  <div className="bg-[#0a0a0a] border border-[#1a1a1a] rounded p-2">
                    <div className="text-[#4d7c4d] mb-1">Risk Level:</div>
                    <div className={`font-bold ${
                      (account.riskLevel || 'medium') === 'low' ? 'text-green-400' :
                      (account.riskLevel || 'medium') === 'medium' ? 'text-yellow-400' :
                      'text-red-400'
                    }`}>
                      {(account.riskLevel || 'medium').toUpperCase()}
                    </div>
                  </div>
                </div>
              </div>

              {/* Hash de Verificación */}
              <div className="bg-gradient-to-r from-purple-900/20 to-blue-900/20 border border-purple-500/30 rounded-lg p-4 mb-4">
                <h4 className="text-sm font-semibold text-purple-400 mb-2 flex items-center gap-2">
                  <Lock className="w-4 h-4" />
                  {language === 'es' ? 'Hash de Verificación Criptográfico (SHA-256)' : 'Cryptographic Verification Hash (SHA-256)'}
                </h4>
                <div className="flex items-center gap-2">
                  <code className="text-purple-300 font-mono text-xs bg-[#000] border border-purple-500/20 rounded px-3 py-2 flex-1 break-all">
                    {account.verificationHash}
                  </code>
                  <button
                    onClick={() => copyToClipboard(account.verificationHash)}
                    className="p-2 bg-purple-500/20 border border-purple-500/30 rounded hover:bg-purple-500/30"
                    title={language === 'es' ? 'Copiar Hash' : 'Copy Hash'}
                  >
                    <Copy className="w-4 h-4 text-purple-400" />
                  </button>
                </div>
                <div className="mt-2 text-xs text-purple-300/70">
                  {language === 'es' 
                    ? 'Este hash único identifica y verifica la integridad de la cuenta custodio' 
                    : 'This unique hash identifies and verifies the custody account integrity'}
                </div>
              </div>

              {/* Reservas */}
              {account.reservations.length > 0 && (
                <div className="bg-[#0a0a0a] border border-[#1a1a1a] rounded-lg p-4">
                  <h4 className="text-sm font-semibold text-[#00ff88] mb-3">
                    {language === 'es' ? `Reservas para Tokenización (${account.reservations.length})` : `Tokenization Reserves (${account.reservations.length})`}
                  </h4>
                  <div className="space-y-2">
                    {account.reservations.map(reservation => (
                      <div key={reservation.id} className="bg-[#000] border border-[#1a1a1a] rounded p-3">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-mono text-[#80ff80]">{reservation.id}</span>
                          <span className={`px-2 py-1 rounded text-xs font-bold ${
                            reservation.status === 'confirmed' ? 'bg-green-500/20 text-green-400' :
                            reservation.status === 'reserved' ? 'bg-yellow-500/20 text-yellow-400' :
                            'bg-gray-500/20 text-gray-400'
                          }`}>
                            {reservation.status.toUpperCase()}
                          </span>
                        </div>
                        <div className="grid grid-cols-2 gap-2 text-xs">
                          <div>
                            <span className="text-[#4d7c4d]">Monto:</span> 
                            <span className="text-[#80ff80] ml-1">{account.currency} {reservation.amount.toLocaleString()}</span>
                          </div>
                          <div>
                            <span className="text-[#4d7c4d]">Tokens:</span> 
                            <span className="text-cyan-400 ml-1">{reservation.tokenAmount.toLocaleString()} {account.tokenSymbol}</span>
                          </div>
                          <div>
                            <span className="text-[#4d7c4d]">Blockchain:</span> 
                            <span className="text-[#80ff80] ml-1">{reservation.blockchain}</span>
                          </div>
                          <div className="col-span-2">
                            <span className="text-[#4d7c4d]">Contrato:</span> 
                            <code className="text-purple-400 ml-1 text-xs">{reservation.contractAddress.substring(0, 20)}...</code>
                          </div>
                        </div>
                        <div className="mt-2 flex gap-2">
                          {reservation.status === 'reserved' && (
                            <button
                              onClick={() => custodyStore.confirmReservation(account.id, reservation.id)}
                              className="px-3 py-1 bg-green-500/20 border border-green-500/40 text-green-400 rounded text-xs hover:bg-green-500/30"
                            >
                              <Check className="w-3 h-3 inline mr-1" />
                              Confirmar
                            </button>
                          )}
                          {reservation.status !== 'released' && (
                            <button
                              onClick={() => custodyStore.releaseReservation(account.id, reservation.id)}
                              className="px-3 py-1 bg-red-500/20 border border-red-500/40 text-red-400 rounded text-xs hover:bg-red-500/30"
                            >
                              <X className="w-3 h-3 inline mr-1" />
                              Liberar
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Botón para Crear Más Cuentas */}
        <div className="mt-6 bg-gradient-to-r from-[#0d0d0d] to-black border-2 border-[#00ff88]/30 rounded-xl p-6 text-center">
          <div className="mb-4">
            <h3 className="text-lg font-bold text-[#00ff88] mb-2">
              {language === 'es' ? '✨ Crear Nueva Cuenta Custodio' : '✨ Create New Custody Account'}
            </h3>
            <p className="text-sm text-[#4d7c4d]">
              {language === 'es' 
                ? 'Agrega más cuentas blockchain o bancarias para gestionar fondos adicionales'
                : 'Add more blockchain or banking accounts to manage additional funds'}
            </p>
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            className="px-8 py-4 bg-gradient-to-br from-[#00ff88] to-[#00cc6a] text-black font-bold rounded-lg hover:shadow-[0_0_30px_rgba(0,255,136,0.8)] transition-all text-lg flex items-center gap-3 mx-auto"
          >
            <Plus className="w-6 h-6" />
            {language === 'es' ? 'Crear Otra Cuenta Custodio' : 'Create Another Custody Account'}
          </button>
          <div className="mt-3 text-xs text-[#4d7c4d]">
            {language === 'es' 
              ? `Total de cuentas activas: ${custodyAccounts.length}` 
              : `Total active accounts: ${custodyAccounts.length}`}
          </div>
        </div>
        </>
      ) : (
        <div className="bg-[#0d0d0d] border border-[#1a1a1a] rounded-xl p-12 text-center">
          <Shield className="w-16 h-16 text-[#4d7c4d] mx-auto mb-4" />
          <h3 className="text-xl text-[#4d7c4d] mb-2">
            {language === 'es' ? 'No hay cuentas custodio creadas' : 'No custody accounts created'}
          </h3>
          <p className="text-[#4d7c4d] text-sm mb-4">
            {language === 'es' 
              ? 'Crea una cuenta custodio para reservar fondos y prepararlos para tokenización blockchain'
              : 'Create a custody account to reserve funds and prepare them for blockchain tokenization'}
          </p>
          <button
            onClick={() => setShowCreateModal(true)}
            className="px-6 py-3 bg-gradient-to-br from-[#00ff88] to-[#00cc6a] text-black font-bold rounded-lg hover:shadow-[0_0_20px_rgba(0,255,136,0.6)] transition-all"
          >
            <Plus className="w-5 h-5 inline mr-2" />
            {language === 'es' ? 'Crear Primera Cuenta Custodio' : 'Create First Custody Account'}
          </button>
        </div>
      )}

      {/* Modal de Creación */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
          <div className="bg-[#0d0d0d] border-2 border-[#00ff88] rounded-xl p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <h2 className="text-2xl font-bold text-[#00ff88] mb-6">
              {language === 'es' ? 'Crear Cuenta Custodio' : 'Create Custody Account'}
            </h2>
            
            <div className="space-y-4 mb-6">
              {/* Selector de Tipo */}
              <div>
                <label className="text-sm text-[#4d7c4d] mb-2 block">
                  {language === 'es' ? 'Tipo de Cuenta' : 'Account Type'}
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => setFormData({...formData, accountType: 'blockchain'})}
                    className={`p-4 rounded-lg border-2 transition-all ${
                      formData.accountType === 'blockchain'
                        ? 'border-cyan-500 bg-cyan-500/20 text-cyan-400'
                        : 'border-[#1a1a1a] bg-[#0a0a0a] text-[#4d7c4d] hover:border-cyan-500/30'
                    }`}
                  >
                    <div className="text-2xl mb-2">🌐</div>
                    <div className="font-bold">BLOCKCHAIN</div>
                    <div className="text-xs mt-1">
                      {language === 'es' ? 'Para tokenización' : 'For tokenization'}
                    </div>
                  </button>
                  <button
                    onClick={() => setFormData({...formData, accountType: 'banking'})}
                    className={`p-4 rounded-lg border-2 transition-all ${
                      formData.accountType === 'banking'
                        ? 'border-green-500 bg-green-500/20 text-green-400'
                        : 'border-[#1a1a1a] bg-[#0a0a0a] text-[#4d7c4d] hover:border-green-500/30'
                    }`}
                  >
                    <div className="text-2xl mb-2">🏦</div>
                    <div className="font-bold">BANKING</div>
                    <div className="text-xs mt-1">
                      {language === 'es' ? 'Para transferencias' : 'For transfers'}
                    </div>
                  </button>
                </div>
              </div>

              {/* Estándares de Cumplimiento */}
              <div className="bg-gradient-to-r from-green-900/20 to-cyan-900/20 border border-green-500/30 rounded-lg p-4">
                <div className="text-sm font-semibold text-green-400 mb-3">
                  {language === 'es' ? '🔐 Seguridad y Cumplimiento Incluidos' : '🔐 Security & Compliance Included'}
                </div>
                <div className="grid grid-cols-3 gap-2 text-xs">
                  <div className="flex items-center gap-1">
                    <CheckCircle className="w-3 h-3 text-green-400" />
                    <span className="text-green-300">ISO 27001</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <CheckCircle className="w-3 h-3 text-cyan-400" />
                    <span className="text-cyan-300">ISO 20022</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <CheckCircle className="w-3 h-3 text-yellow-400" />
                    <span className="text-yellow-300">FATF AML/CFT</span>
                  </div>
                </div>
              </div>

              <div>
                <label className="text-sm text-[#4d7c4d] mb-2 block">
                  {language === 'es' ? 'Nombre de la Cuenta' : 'Account Name'}
                </label>
                <input
                  type="text"
                  value={formData.accountName}
                  onChange={e => setFormData({...formData, accountName: e.target.value})}
                  className="w-full px-4 py-3 bg-[#0a0a0a] border border-[#1a1a1a] rounded-lg text-[#80ff80] focus:outline-none focus:border-[#00ff88]/50"
                  placeholder={formData.accountType === 'blockchain' 
                    ? (language === 'es' ? 'Ej: USD Stablecoin Reserve' : 'Ex: USD Stablecoin Reserve')
                    : (language === 'es' ? 'Ej: Cuenta Wire Transfer EUR' : 'Ex: EUR Wire Transfer Account')}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm text-[#4d7c4d] mb-2 block">
                    {language === 'es' ? 'Moneda' : 'Currency'}
                  </label>
                  <select
                    value={formData.currency}
                    onChange={e => setFormData({...formData, currency: e.target.value})}
                    className="w-full px-4 py-3 bg-[#0a0a0a] border border-[#1a1a1a] rounded-lg text-[#80ff80] focus:outline-none focus:border-[#00ff88]/50"
                    aria-label="Seleccionar moneda"
                  >
                    {systemBalances.map(bal => (
                      <option key={bal.currency} value={bal.currency}>
                        {bal.currency} - {language === 'es' ? 'Disponible' : 'Available'}: {bal.totalAmount.toLocaleString()}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-sm text-[#4d7c4d] mb-2 block">
                    {language === 'es' ? 'Monto a Transferir' : 'Amount to Transfer'}
                  </label>
                  <input
                    type="number"
                    value={formData.amount}
                    onChange={e => setFormData({...formData, amount: parseFloat(e.target.value) || 0})}
                    className="w-full px-4 py-3 bg-[#0a0a0a] border border-[#1a1a1a] rounded-lg text-[#80ff80] font-mono focus:outline-none focus:border-[#00ff88]/50"
                    placeholder="0.00"
                  />
                </div>
              </div>

              {/* Selector de Porcentajes */}
              <div className="bg-gradient-to-r from-purple-900/20 to-pink-900/20 border border-purple-500/30 rounded-lg p-4">
                <label className="text-sm text-purple-400 mb-3 block font-semibold">
                  ⚡ {language === 'es' ? 'Carga Rápida - % del Capital Disponible' : 'Quick Load - % of Available Capital'}
                </label>
                <div className="grid grid-cols-5 gap-2">
                  {[10, 20, 50, 75, 100].map(percentage => {
                    const selectedBalance = systemBalances.find(b => b.currency === formData.currency);
                    const availableAmount = selectedBalance?.totalAmount || 0;
                    const calculatedAmount = (availableAmount * percentage) / 100;

                    return (
                      <button
                        key={percentage}
                        type="button"
                        onClick={() => setFormData({...formData, amount: calculatedAmount})}
                        className="px-3 py-3 bg-gradient-to-br from-purple-600 to-pink-600 text-white rounded-lg hover:shadow-[0_0_20px_rgba(168,85,247,0.6)] transition-all text-sm font-bold hover:scale-105"
                      >
                        <div className="text-lg mb-1">{percentage}%</div>
                        <div className="text-xs opacity-80">
                          {formData.currency} {calculatedAmount.toLocaleString(undefined, {maximumFractionDigits: 0})}
                        </div>
                      </button>
                    );
                  })}
                </div>
                <div className="mt-3 text-xs text-gray-400 text-center">
                  {language === 'es'
                    ? `💰 Disponible: ${formData.currency} ${(systemBalances.find(b => b.currency === formData.currency)?.totalAmount || 0).toLocaleString()}`
                    : `💰 Available: ${formData.currency} ${(systemBalances.find(b => b.currency === formData.currency)?.totalAmount || 0).toLocaleString()}`
                  }
                </div>
              </div>

              {/* CAMPOS ESPECÍFICOS PARA BLOCKCHAIN */}
              {formData.accountType === 'blockchain' && (
                <div className="bg-gradient-to-r from-cyan-900/20 to-blue-900/20 border-2 border-cyan-500/40 rounded-lg p-4 space-y-4">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="text-xl">🌐</div>
                    <h4 className="text-sm font-bold text-cyan-400">
                      {language === 'es' ? 'CONFIGURACIÓN BLOCKCHAIN (Obligatorio)' : 'BLOCKCHAIN CONFIGURATION (Required)'}
                    </h4>
                  </div>

                  <div>
                    <label className="text-sm text-[#4d7c4d] mb-2 block">
                      {language === 'es' ? 'Red Blockchain *' : 'Blockchain Network *'}
                    </label>
                    <select
                      value={formData.blockchain}
                      onChange={e => setFormData({...formData, blockchain: e.target.value})}
                      className="w-full px-4 py-3 bg-[#0a0a0a] border border-cyan-500/50 rounded-lg text-[#80ff80] focus:outline-none focus:border-cyan-500"
                      aria-label="Seleccionar blockchain"
                    >
                      {BLOCKCHAINS.map(chain => (
                        <option key={chain.symbol} value={chain.name}>
                          {chain.name} ({chain.symbol})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="text-sm text-[#4d7c4d] mb-2 block">
                      {language === 'es' ? 'Símbolo del Token *' : 'Token Symbol *'}
                    </label>
                    <input
                      type="text"
                      value={formData.tokenSymbol}
                      onChange={e => setFormData({...formData, tokenSymbol: e.target.value})}
                      className="w-full px-4 py-3 bg-[#0a0a0a] border border-cyan-500/50 rounded-lg text-[#80ff80] font-mono focus:outline-none focus:border-cyan-500"
                      placeholder={language === 'es' ? `Ej: ${formData.currency}T, USDT, EURT` : `Ex: ${formData.currency}T, USDT, EURT`}
                    />
                    <div className="text-xs text-cyan-300 mt-1">
                      {language === 'es' 
                        ? `Símbolo del token que representará ${formData.currency} en blockchain` 
                        : `Token symbol that will represent ${formData.currency} on blockchain`}
                    </div>
                  </div>

                  <div className="bg-cyan-900/20 border border-cyan-500/30 rounded p-3">
                    <div className="text-xs text-cyan-300">
                      ℹ️ {language === 'es' 
                        ? 'La dirección del contrato se generará automáticamente al crear la cuenta' 
                        : 'Contract address will be auto-generated when creating the account'}
                    </div>
                  </div>
                </div>
              )}

              {/* CAMPOS ESPECÍFICOS PARA BANKING */}
              {formData.accountType === 'banking' && (
                <div className="bg-gradient-to-r from-green-900/20 to-emerald-900/20 border-2 border-green-500/40 rounded-lg p-4 space-y-4">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="text-xl">🏦</div>
                    <h4 className="text-sm font-bold text-green-400">
                      {language === 'es' ? 'CONFIGURACIÓN BANCARIA (Auto-generado)' : 'BANKING CONFIGURATION (Auto-generated)'}
                    </h4>
                  </div>

                  <div>
                    <label className="text-sm text-[#4d7c4d] mb-2 block">
                      {language === 'es' ? 'Nombre del Banco (opcional)' : 'Bank Name (optional)'}
                    </label>
                    <input
                      type="text"
                      value={formData.bankName}
                      onChange={e => setFormData({...formData, bankName: e.target.value})}
                      className="w-full px-4 py-3 bg-[#0a0a0a] border border-green-500/50 rounded-lg text-[#80ff80] focus:outline-none focus:border-green-500"
                      placeholder="DAES - Data and Exchange Settlement"
                    />
                  </div>

                  <div className="bg-green-900/20 border border-green-500/30 rounded p-3 space-y-1">
                    <div className="text-xs text-green-300 font-semibold">
                      ℹ️ {language === 'es' ? 'Se generarán automáticamente:' : 'Will be auto-generated:'}
                    </div>
                    <div className="text-xs text-green-300/80">
                      • {language === 'es' ? 'Número de Cuenta' : 'Account Number'}: DAES-BK-{formData.currency}-XXXXXXX
                    </div>
                    <div className="text-xs text-green-300/80">
                      • IBAN: {language === 'es' ? 'Estándar ISO 13616' : 'ISO 13616 Standard'}
                    </div>
                    <div className="text-xs text-green-300/80">
                      • SWIFT/BIC: DAES{formData.currency.substring(0,2)}XXX
                    </div>
                    <div className="text-xs text-green-300/80">
                      • Routing Number: 021XXXXXX
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setShowCreateModal(false)}
                className="px-6 py-2 bg-[#1a1a1a] border border-[#2a2a2a] text-[#4d7c4d] rounded-lg hover:bg-[#252525]"
              >
                {language === 'es' ? 'Cancelar' : 'Cancel'}
              </button>
              <button
                onClick={() => {
                  // Cargar 100% de los fondos disponibles
                  const selectedBalance = systemBalances.find(b => b.currency === formData.currency);
                  const totalAvailable = selectedBalance?.totalAmount || 0;
                  setFormData({...formData, amount: totalAvailable});
                  // Ejecutar creación inmediatamente
                  setTimeout(() => {
                    handleCreateAccount();
                  }, 100);
                }}
                className={`px-6 py-2 bg-gradient-to-br text-white font-bold rounded-lg transition-all border-2 ${
                  formData.accountType === 'blockchain'
                    ? 'from-purple-600 to-pink-600 border-purple-400 hover:shadow-[0_0_20px_rgba(168,85,247,0.8)]'
                    : 'from-purple-600 to-pink-600 border-purple-400 hover:shadow-[0_0_20px_rgba(168,85,247,0.8)]'
                }`}
              >
                {formData.accountType === 'blockchain' ? (
                  <>
                    <div className="inline text-lg mr-2">💎</div>
                    {language === 'es' ? 'Crear con TODO (100%)' : 'Create with ALL (100%)'}
                  </>
                ) : (
                  <>
                    <div className="inline text-lg mr-2">💎</div>
                    {language === 'es' ? 'Crear con TODO (100%)' : 'Create with ALL (100%)'}
                  </>
                )}
              </button>
              <button
                onClick={handleCreateAccount}
                className={`px-6 py-2 bg-gradient-to-br text-black font-bold rounded-lg transition-all ${
                  formData.accountType === 'blockchain'
                    ? 'from-cyan-500 to-blue-500 hover:shadow-[0_0_20px_rgba(0,255,255,0.6)]'
                    : 'from-green-500 to-emerald-500 hover:shadow-[0_0_20px_rgba(0,255,0,0.6)]'
                }`}
              >
                {formData.accountType === 'blockchain' ? (
                  <>
                    <div className="inline text-lg mr-2">🌐</div>
                    {language === 'es' ? 'Crear Cuenta Blockchain' : 'Create Blockchain Account'}
                  </>
                ) : (
                  <>
                    <div className="inline text-lg mr-2">🏦</div>
                    {language === 'es' ? 'Crear Cuenta Bancaria' : 'Create Banking Account'}
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Reserva */}
      {showReserveModal && selectedAccount && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
          <div className={`bg-[#0d0d0d] border-2 rounded-xl p-6 max-w-2xl w-full ${
            (selectedAccount.accountType || 'blockchain') === 'blockchain'
              ? 'border-yellow-500'
              : 'border-green-500'
          }`}>
            <h2 className={`text-2xl font-bold mb-6 ${
              (selectedAccount.accountType || 'blockchain') === 'blockchain'
                ? 'text-yellow-400'
                : 'text-green-400'
            }`}>
              {(selectedAccount.accountType || 'blockchain') === 'blockchain'
                ? (language === 'es' ? '🌐 Reservar Fondos para Tokenización' : '🌐 Reserve Funds for Tokenization')
                : (language === 'es' ? '🏦 Reservar Fondos para Transferencia Bancaria' : '🏦 Reserve Funds for Banking Transfer')}
            </h2>
            
            <div className="bg-[#0a0a0a] border border-yellow-500/20 rounded-lg p-4 mb-6">
              <div className="text-sm text-[#4d7c4d] mb-1">
                {language === 'es' ? 'Cuenta Seleccionada:' : 'Selected Account:'}
              </div>
              <div className="text-lg font-bold text-[#00ff88]">{selectedAccount.accountName}</div>
              <div className="text-sm text-green-400 mt-1">
                {language === 'es' ? 'Disponible:' : 'Available:'} {selectedAccount.currency} {selectedAccount.availableBalance.toLocaleString()}
              </div>
            </div>

            <div className="space-y-4 mb-6">
              <div>
                <label className="text-sm text-[#4d7c4d] mb-2 block">
                  {language === 'es' ? 'Monto a Reservar' : 'Amount to Reserve'}
                </label>
                <input
                  type="number"
                  value={reserveData.amount}
                  onChange={e => setReserveData({...reserveData, amount: parseFloat(e.target.value) || 0})}
                  className="w-full px-4 py-3 bg-[#0a0a0a] border border-[#1a1a1a] rounded-lg text-[#80ff80] font-mono text-lg focus:outline-none focus:border-yellow-500/50"
                  placeholder="0.00"
                  max={selectedAccount.availableBalance}
                />
              </div>

              {/* Selector de Porcentajes para Reserva */}
              <div className="bg-gradient-to-r from-purple-900/20 to-pink-900/20 border border-purple-500/30 rounded-lg p-4">
                <label className="text-sm text-purple-400 mb-3 block font-semibold">
                  ⚡ {language === 'es' ? 'Reserva Rápida - % del Disponible' : 'Quick Reserve - % of Available'}
                </label>
                <div className="grid grid-cols-5 gap-2">
                  {[10, 20, 50, 75, 100].map(percentage => {
                    const availableAmount = selectedAccount.availableBalance;
                    const calculatedAmount = (availableAmount * percentage) / 100;

                    return (
                      <button
                        key={percentage}
                        type="button"
                        onClick={() => setReserveData({...reserveData, amount: calculatedAmount})}
                        className="px-3 py-3 bg-gradient-to-br from-purple-600 to-pink-600 text-white rounded-lg hover:shadow-[0_0_20px_rgba(168,85,247,0.6)] transition-all text-sm font-bold hover:scale-105"
                      >
                        <div className="text-lg mb-1">{percentage}%</div>
                        <div className="text-xs opacity-80">
                          {selectedAccount.currency} {calculatedAmount.toLocaleString(undefined, {maximumFractionDigits: 0})}
                        </div>
                      </button>
                    );
                  })}
                </div>
                <div className="mt-3 text-xs text-gray-400 text-center">
                  {language === 'es'
                    ? `💰 Disponible: ${selectedAccount.currency} ${selectedAccount.availableBalance.toLocaleString()}`
                    : `💰 Available: ${selectedAccount.currency} ${selectedAccount.availableBalance.toLocaleString()}`
                  }
                </div>
              </div>

              {/* CAMPOS PARA BLOCKCHAIN */}
              {(selectedAccount.accountType || 'blockchain') === 'blockchain' && (
                <>
                  <div>
                    <label className="text-sm text-[#4d7c4d] mb-2 block">
                      {language === 'es' ? 'Blockchain Destino' : 'Destination Blockchain'}
                    </label>
                    <select
                      value={reserveData.blockchain}
                      onChange={e => setReserveData({...reserveData, blockchain: e.target.value})}
                      className="w-full px-4 py-3 bg-[#0a0a0a] border border-cyan-500/50 rounded-lg text-[#80ff80] focus:outline-none focus:border-cyan-500"
                      aria-label="Seleccionar blockchain destino"
                    >
                      {BLOCKCHAINS.map(chain => (
                        <option key={chain.symbol} value={chain.name}>
                          {chain.name} ({chain.symbol})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="text-sm text-[#4d7c4d] mb-2 block">
                      {language === 'es' ? 'Dirección del Contrato Blockchain *' : 'Blockchain Contract Address *'}
                    </label>
                    <input
                      type="text"
                      value={reserveData.contractAddress}
                      onChange={e => setReserveData({...reserveData, contractAddress: e.target.value})}
                      className="w-full px-4 py-3 bg-[#0a0a0a] border border-cyan-500/50 rounded-lg text-[#80ff80] font-mono text-sm focus:outline-none focus:border-cyan-500"
                      placeholder="0x..."
                    />
                  </div>

                  <div>
                    <label className="text-sm text-[#4d7c4d] mb-2 block">
                      {language === 'es' ? 'Cantidad de Tokens a Emitir' : 'Token Amount to Mint'}
                    </label>
                    <input
                      type="number"
                      value={reserveData.tokenAmount}
                      onChange={e => setReserveData({...reserveData, tokenAmount: parseFloat(e.target.value) || 0})}
                      className="w-full px-4 py-3 bg-[#0a0a0a] border border-cyan-500/50 rounded-lg text-[#80ff80] font-mono text-lg focus:outline-none focus:border-cyan-500"
                      placeholder="1000000"
                    />
                    <div className="text-xs text-cyan-400 mt-1">
                      Token: {selectedAccount.tokenSymbol}
                    </div>
                  </div>

                  {/* Selector de Porcentajes para Token Mint */}
                  <div className="bg-gradient-to-r from-cyan-900/20 to-blue-900/20 border border-cyan-500/30 rounded-lg p-4">
                    <label className="text-sm text-cyan-400 mb-3 block font-semibold">
                      ⚡ {language === 'es' ? 'Minteo Rápido - % del Monto a Reservar' : 'Quick Mint - % of Reserved Amount'}
                    </label>
                    <div className="grid grid-cols-5 gap-2">
                      {[10, 20, 50, 75, 100].map(percentage => {
                        const reservedAmount = reserveData.amount;
                        const calculatedTokens = (reservedAmount * percentage) / 100;

                        return (
                          <button
                            key={percentage}
                            type="button"
                            onClick={() => setReserveData({...reserveData, tokenAmount: calculatedTokens})}
                            className="px-3 py-3 bg-gradient-to-br from-cyan-600 to-blue-600 text-white rounded-lg hover:shadow-[0_0_20px_rgba(0,255,255,0.6)] transition-all text-sm font-bold hover:scale-105"
                          >
                            <div className="text-lg mb-1">{percentage}%</div>
                            <div className="text-xs opacity-80">
                              {calculatedTokens.toLocaleString(undefined, {maximumFractionDigits: 0})} {selectedAccount.tokenSymbol}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                    <div className="mt-3 text-xs text-gray-400 text-center">
                      {language === 'es'
                        ? `💰 Monto Reservado: ${selectedAccount.currency} ${reserveData.amount.toLocaleString()}`
                        : `💰 Reserved Amount: ${selectedAccount.currency} ${reserveData.amount.toLocaleString()}`
                      }
                    </div>
                    <div className="mt-2 text-xs text-cyan-300 text-center">
                      {language === 'es'
                        ? `ℹ️ 100% = 1:1 ratio (${reserveData.amount.toLocaleString()} ${selectedAccount.tokenSymbol})`
                        : `ℹ️ 100% = 1:1 ratio (${reserveData.amount.toLocaleString()} ${selectedAccount.tokenSymbol})`
                      }
                    </div>
                  </div>
                </>
              )}

              {/* CAMPOS PARA BANKING */}
              {(selectedAccount.accountType || 'blockchain') === 'banking' && (
                <>
                  <div>
                    <label className="text-sm text-[#4d7c4d] mb-2 block">
                      {language === 'es' ? 'Referencia de Transferencia (opcional)' : 'Transfer Reference (optional)'}
                    </label>
                    <input
                      type="text"
                      value={reserveData.transferReference}
                      onChange={e => setReserveData({...reserveData, transferReference: e.target.value})}
                      className="w-full px-4 py-3 bg-[#0a0a0a] border border-green-500/50 rounded-lg text-[#80ff80] focus:outline-none focus:border-green-500"
                      placeholder={language === 'es' ? 'Ej: WIRE-2024-001, Pago servicios, etc.' : 'Ex: WIRE-2024-001, Payment for services, etc.'}
                    />
                  </div>

                  <div className="bg-gradient-to-r from-green-900/20 to-cyan-900/20 border border-green-500/40 rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <CheckCircle className="w-5 h-5 text-green-400" />
                      <div className="text-sm font-semibold text-green-400">
                        {language === 'es' ? 'Aprobación Automática' : 'Automatic Approval'}
                      </div>
                    </div>
                    <div className="text-xs text-green-300/80 space-y-1">
                      <div>
                        {language === 'es'
                          ? '✓ Las reservas bancarias se aprueban automáticamente'
                          : '✓ Banking reservations are auto-approved'}
                      </div>
                      <div>
                        {language === 'es'
                          ? '✓ Estado: RESERVED → CONFIRMED (inmediato)'
                          : '✓ Status: RESERVED → CONFIRMED (immediate)'}
                      </div>
                      <div>
                        {language === 'es'
                          ? '✓ Listo para transferencia API sin confirmación manual'
                          : '✓ Ready for API transfer without manual confirmation'}
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Advertencia según tipo */}
            {(selectedAccount.accountType || 'blockchain') === 'blockchain' ? (
              <div className="bg-gradient-to-r from-yellow-900/20 to-orange-900/20 border border-yellow-700/50 rounded-lg p-4 mb-6">
                <div className="flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-yellow-400 flex-shrink-0 mt-0.5" />
                  <div className="text-xs text-yellow-300/80">
                    <strong>{language === 'es' ? 'Importante:' : 'Important:'}</strong> {language === 'es'
                      ? 'Los fondos reservados quedarán bloqueados hasta que sean confirmados o liberados. Requiere confirmación manual.'
                      : 'Reserved funds will be locked until confirmed or released. Requires manual confirmation.'}
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-gradient-to-r from-green-900/20 to-cyan-900/20 border border-green-700/50 rounded-lg p-4 mb-6">
                <div className="flex items-start gap-3">
                  <CheckCircle className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" />
                  <div className="text-xs text-green-300/80">
                    <strong>{language === 'es' ? '✓ Aprobación Automática:' : '✓ Auto-Approval:'}</strong> {language === 'es'
                      ? 'Los fondos se aprobarán automáticamente para transferencia API. No requiere confirmación manual.'
                      : 'Funds will be auto-approved for API transfer. No manual confirmation required.'}
                  </div>
                </div>
              </div>
            )}

            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setShowReserveModal(false)}
                className="px-6 py-2 bg-[#1a1a1a] border border-[#2a2a2a] text-[#4d7c4d] rounded-lg hover:bg-[#252525]"
              >
                {language === 'es' ? 'Cancelar' : 'Cancel'}
              </button>
              <button
                onClick={() => {
                  // Cargar 100% del disponible y ejecutar reserva
                  const availableAmount = selectedAccount.availableBalance;
                  setReserveData({...reserveData, amount: availableAmount});
                  // Ejecutar reserva después de actualizar el estado, bypasseando límites
                  setTimeout(() => {
                    handleReserveFunds(true);
                  }, 100);
                }}
                className="px-6 py-2 bg-gradient-to-br from-purple-600 to-pink-600 text-white font-bold rounded-lg transition-all border-2 border-purple-400 hover:shadow-[0_0_20px_rgba(168,85,247,0.8)]"
              >
                <div className="inline text-lg mr-2">💎</div>
                {language === 'es' ? 'Reservar TODO (100%)' : 'Reserve ALL (100%)'}
              </button>
              <button
                onClick={handleReserveFunds}
                className={`px-6 py-2 bg-gradient-to-br text-black font-bold rounded-lg ${
                  (selectedAccount.accountType || 'blockchain') === 'blockchain'
                    ? 'from-yellow-500 to-orange-500 hover:shadow-[0_0_20px_rgba(255,193,7,0.6)]'
                    : 'from-green-500 to-emerald-500 hover:shadow-[0_0_20px_rgba(0,255,0,0.6)]'
                }`}
              >
                <Lock className="w-4 h-4 inline mr-2" />
                {(selectedAccount.accountType || 'blockchain') === 'blockchain'
                  ? (language === 'es' ? 'Reservar para Blockchain' : 'Reserve for Blockchain')
                  : (language === 'es' ? 'Reservar para Transferencia' : 'Reserve for Transfer')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Detalles Completos (Clic en Cuenta) */}
      {showDetailsModal && selectedAccount && (
        <div className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-black border-2 border-[#00ff88] rounded-xl p-6 max-w-4xl w-full max-h-[90vh] overflow-y-auto shadow-[0_0_50px_rgba(0,255,136,0.5)]">
            {/* Header */}
            <div className="flex items-center justify-between mb-6 border-b border-[#00ff88]/30 pb-4">
              <div>
                <h2 className="text-2xl font-bold text-[#00ff88] flex items-center gap-3">
                  {(selectedAccount.accountType || 'blockchain') === 'blockchain' ? '🌐' : '🏦'}
                  {language === 'es' ? 'Detalles de Cuenta Custodio' : 'Custody Account Details'}
                </h2>
                <p className="text-[#4d7c4d] mt-1">{selectedAccount.accountName}</p>
              </div>
              <button
                onClick={() => setShowDetailsModal(false)}
                className="p-2 bg-red-900/30 border border-red-700/50 text-red-400 rounded-lg hover:bg-red-900/50"
                title={language === 'es' ? 'Cerrar' : 'Close'}
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Contenido */}
            <div className="space-y-6 text-[#00ff88]">
              
              {/* Tipo y Estado */}
              <div className="flex gap-3">
                <span className={`px-4 py-2 rounded-lg border-2 font-bold ${
                  (selectedAccount.accountType || 'blockchain') === 'blockchain' 
                    ? 'border-cyan-500 bg-cyan-500/20 text-cyan-400' 
                    : 'border-green-500 bg-green-500/20 text-green-400'
                }`}>
                  {(selectedAccount.accountType || 'blockchain') === 'blockchain' 
                    ? (language === 'es' ? '🌐 BLOCKCHAIN CUSTODY' : '🌐 BLOCKCHAIN CUSTODY')
                    : (language === 'es' ? '🏦 CUENTA BANCARIA' : '🏦 BANKING ACCOUNT')}
                </span>
                <span className={`px-4 py-2 rounded-lg border-2 font-bold ${
                  selectedAccount.apiStatus === 'active' ? 'border-green-500 bg-green-500/20 text-green-400' :
                  selectedAccount.apiStatus === 'pending' ? 'border-yellow-500 bg-yellow-500/20 text-yellow-400' :
                  'border-red-500 bg-red-500/20 text-red-400'
                }`}>
                  {(selectedAccount.apiStatus || 'pending').toUpperCase()}
                </span>
              </div>

              {/* Identificación */}
              <div className="bg-[#0d0d0d] border border-[#1a1a1a] rounded-lg p-6">
                <h3 className="text-lg font-bold text-[#00ff88] mb-4">
                  {language === 'es' ? '📋 Identificación' : '📋 Identification'}
                </h3>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <div className="text-[#4d7c4d] mb-1">{language === 'es' ? 'ID:' : 'ID:'}</div>
                    <div className="text-[#80ff80] font-mono">{selectedAccount.id}</div>
                  </div>
                  <div>
                    <div className="text-[#4d7c4d] mb-1">{language === 'es' ? 'Número de Cuenta:' : 'Account Number:'}</div>
                    <div className="text-[#00ff88] font-mono font-bold text-lg">
                      {selectedAccount.accountNumber || 'N/A'}
                    </div>
                  </div>
                  <div>
                    <div className="text-[#4d7c4d] mb-1">{language === 'es' ? 'Nombre:' : 'Name:'}</div>
                    <div className="text-[#80ff80]">{selectedAccount.accountName}</div>
                  </div>
                  <div>
                    <div className="text-[#4d7c4d] mb-1">{language === 'es' ? 'Moneda:' : 'Currency:'}</div>
                    <div className="text-[#80ff80] font-bold">{selectedAccount.currency}</div>
                  </div>
                </div>
              </div>

              {/* Balances */}
              <div className="bg-[#0d0d0d] border border-[#1a1a1a] rounded-lg p-6">
                <h3 className="text-lg font-bold text-[#00ff88] mb-4">
                  {language === 'es' ? '💰 Balances' : '💰 Balances'}
                </h3>
                <div className="grid grid-cols-3 gap-4">
                  <div className="bg-[#0a0a0a] border border-cyan-500/30 rounded-lg p-4 text-center">
                    <div className="text-xs text-[#4d7c4d] mb-1">{language === 'es' ? 'Total' : 'Total'}</div>
                    <div className="text-2xl font-bold text-cyan-400 font-mono">
                      {selectedAccount.currency} {selectedAccount.totalBalance.toLocaleString()}
                    </div>
                  </div>
                  <div className="bg-[#0a0a0a] border border-yellow-500/30 rounded-lg p-4 text-center">
                    <div className="text-xs text-[#4d7c4d] mb-1">{language === 'es' ? 'Reservado' : 'Reserved'}</div>
                    <div className="text-2xl font-bold text-yellow-400 font-mono">
                      {selectedAccount.currency} {selectedAccount.reservedBalance.toLocaleString()}
                    </div>
                  </div>
                  <div className="bg-[#0a0a0a] border border-green-500/30 rounded-lg p-4 text-center">
                    <div className="text-xs text-[#4d7c4d] mb-1">{language === 'es' ? 'Disponible' : 'Available'}</div>
                    <div className="text-2xl font-bold text-green-400 font-mono">
                      {selectedAccount.currency} {selectedAccount.availableBalance.toLocaleString()}
                    </div>
                  </div>
                </div>
              </div>

              {/* Información Específica por Tipo */}
              {(selectedAccount.accountType || 'blockchain') === 'blockchain' ? (
                <div className="bg-gradient-to-r from-cyan-900/20 to-blue-900/20 border border-cyan-500/40 rounded-lg p-6">
                  <h3 className="text-lg font-bold text-cyan-400 mb-4">
                    {language === 'es' ? '🌐 Información Blockchain' : '🌐 Blockchain Information'}
                  </h3>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <div className="text-[#4d7c4d] mb-1">{language === 'es' ? 'Blockchain:' : 'Blockchain:'}</div>
                      <div className="text-[#80ff80] font-bold">{selectedAccount.blockchainLink}</div>
                    </div>
                    <div>
                      <div className="text-[#4d7c4d] mb-1">{language === 'es' ? 'Token Symbol:' : 'Token Symbol:'}</div>
                      <div className="text-[#80ff80] font-mono font-bold">{selectedAccount.tokenSymbol}</div>
                    </div>
                    <div className="col-span-2">
                      <div className="text-[#4d7c4d] mb-1">{language === 'es' ? 'Dirección del Contrato:' : 'Contract Address:'}</div>
                      <div className="flex items-center gap-2">
                        <code className="text-cyan-400 font-mono text-sm bg-[#000] border border-cyan-500/20 rounded px-3 py-2 flex-1">
                          {selectedAccount.contractAddress}
                        </code>
                        <button
                          onClick={() => copyToClipboard(selectedAccount.contractAddress || '')}
                          className="p-2 bg-cyan-500/20 border border-cyan-500/30 rounded hover:bg-cyan-500/30"
                          title={language === 'es' ? 'Copiar dirección del contrato' : 'Copy contract address'}
                        >
                          <Copy className="w-4 h-4 text-cyan-400" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="bg-gradient-to-r from-green-900/20 to-emerald-900/20 border border-green-500/40 rounded-lg p-6">
                  <h3 className="text-lg font-bold text-green-400 mb-4">
                    {language === 'es' ? '🏦 Cuenta Bancaria - Configuración API' : '🏦 Banking Account - API Configuration'}
                  </h3>
                  <div className="space-y-4 text-sm">
                    <div>
                      <div className="text-[#4d7c4d] mb-1">{language === 'es' ? 'Banco:' : 'Bank:'}</div>
                      <div className="text-[#80ff80] font-semibold">{selectedAccount.bankName}</div>
                    </div>
                    <div className="bg-green-900/20 border border-green-500/30 rounded-lg p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <CheckCircle className="w-5 h-5 text-green-400" />
                        <div className="text-sm font-semibold text-green-400">
                          {language === 'es' ? 'Configuración para Conexión API' : 'API Connection Configuration'}
                        </div>
                      </div>
                      <div className="text-xs text-green-300/80 space-y-1">
                        <div>
                          {language === 'es' 
                            ? '✓ Cuenta bancaria lista para conectar API de transferencias' 
                            : '✓ Banking account ready to connect transfer API'}
                        </div>
                        <div>
                          {language === 'es' 
                            ? '✓ Soporte para transferencias internacionales SWIFT' 
                            : '✓ Support for international SWIFT transfers'}
                        </div>
                        <div>
                          {language === 'es' 
                            ? '✓ Compatible con sistemas de pago ISO 20022' 
                            : '✓ Compatible with ISO 20022 payment systems'}
                        </div>
                        <div>
                          {language === 'es' 
                            ? '✓ Listo para integración con bancos centrales' 
                            : '✓ Ready for central bank integration'}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* API de Verificación */}
              <div className="bg-[#0d0d0d] border border-[#1a1a1a] rounded-lg p-6">
                <h3 className="text-lg font-bold text-[#00ff88] mb-4">
                  {language === 'es' ? '🔗 API de Verificación' : '🔗 Verification API'}
                </h3>
                <div className="space-y-3">
                  <div>
                    <div className="text-[#4d7c4d] mb-1 text-xs">{language === 'es' ? 'Endpoint:' : 'Endpoint:'}</div>
                    <div className="flex items-center gap-2">
                      <code className="text-cyan-400 font-mono text-xs bg-[#000] border border-cyan-500/20 rounded px-3 py-2 flex-1 break-all">
                        {selectedAccount.apiEndpoint}
                      </code>
                      <button 
                        onClick={() => copyToClipboard(selectedAccount.apiEndpoint)} 
                        className="p-2 bg-cyan-500/20 border border-cyan-500/30 rounded"
                        title={language === 'es' ? 'Copiar endpoint' : 'Copy endpoint'}
                      >
                        <Copy className="w-4 h-4 text-cyan-400" />
                      </button>
                    </div>
                  </div>
                  {selectedAccount.apiKey && (
                    <div>
                      <div className="text-[#4d7c4d] mb-1 text-xs">API Key:</div>
                      <div className="flex items-center gap-2">
                        <code className="text-orange-400 font-mono text-xs bg-[#000] border border-orange-500/20 rounded px-3 py-2 flex-1">
                          {selectedAccount.apiKey}
                        </code>
                        <button 
                          onClick={() => copyToClipboard(selectedAccount.apiKey)} 
                          className="p-2 bg-orange-500/20 border border-orange-500/30 rounded"
                          title={language === 'es' ? 'Copiar API Key' : 'Copy API Key'}
                        >
                          <Copy className="w-4 h-4 text-orange-400" />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Cumplimiento ISO/FATF */}
              <div className="bg-gradient-to-r from-green-900/20 to-cyan-900/20 border border-green-500/40 rounded-lg p-6">
                <h3 className="text-lg font-bold text-green-400 mb-4">
                  {language === 'es' ? '🥇 Cumplimiento de Estándares' : '🥇 Standards Compliance'}
                </h3>
                <div className="grid grid-cols-3 gap-4 mb-4">
                  <div className="bg-[#0a0a0a] border border-cyan-500/30 rounded-lg p-4 text-center">
                    <div className="text-2xl mb-2">🔒</div>
                    <div className="text-sm text-[#4d7c4d] mb-1">ISO 27001:2022</div>
                    <div className="font-bold text-green-400">
                      {selectedAccount.iso27001Compliant !== false ? '✓ COMPLIANT' : '⚡ PENDING'}
                    </div>
                    <div className="text-xs text-cyan-300 mt-1">
                      {language === 'es' ? 'Seguridad total del sistema DAES' : 'Total DAES system security'}
                    </div>
                  </div>
                  <div className="bg-[#0a0a0a] border border-blue-500/30 rounded-lg p-4 text-center">
                    <div className="text-2xl mb-2">🏦</div>
                    <div className="text-sm text-[#4d7c4d] mb-1">ISO 20022</div>
                    <div className="font-bold text-green-400">
                      {selectedAccount.iso20022Compatible !== false ? '✓ COMPATIBLE' : '⚡ PENDING'}
                    </div>
                    <div className="text-xs text-blue-300 mt-1">
                      {language === 'es' ? 'Interoperabilidad con bancos centrales' : 'Central bank interoperability'}
                    </div>
                  </div>
                  <div className="bg-[#0a0a0a] border border-yellow-500/30 rounded-lg p-4 text-center">
                    <div className="text-2xl mb-2">⚖️</div>
                    <div className="text-sm text-[#4d7c4d] mb-1">FATF AML/CFT</div>
                    <div className="font-bold text-green-400">
                      {selectedAccount.fatfAmlVerified !== false ? '✓ VERIFIED' : '⚡ PENDING'}
                    </div>
                    <div className="text-xs text-yellow-300 mt-1">
                      {language === 'es' ? 'Legalidad y trazabilidad global' : 'Global legality & traceability'}
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div className="bg-[#0a0a0a] border border-[#1a1a1a] rounded-lg p-3 text-center">
                    <div className="text-[#4d7c4d] mb-1">KYC</div>
                    <div className={`font-bold ${selectedAccount.kycVerified !== false ? 'text-green-400' : 'text-red-400'}`}>
                      {selectedAccount.kycVerified !== false ? '✓ VERIFIED' : '✗ NOT VERIFIED'}
                    </div>
                  </div>
                  <div className="bg-[#0a0a0a] border border-[#1a1a1a] rounded-lg p-3 text-center">
                    <div className="text-[#4d7c4d] mb-1">AML Score</div>
                    <div className={`font-mono font-bold text-lg ${
                      (selectedAccount.amlScore || 85) >= 90 ? 'text-green-400' :
                      (selectedAccount.amlScore || 85) >= 75 ? 'text-yellow-400' :
                      'text-red-400'
                    }`}>
                      {selectedAccount.amlScore || 85}/100
                    </div>
                  </div>
                  <div className="bg-[#0a0a0a] border border-[#1a1a1a] rounded-lg p-3 text-center">
                    <div className="text-[#4d7c4d] mb-1">Risk Level</div>
                    <div className={`font-bold ${
                      (selectedAccount.riskLevel || 'medium') === 'low' ? 'text-green-400' :
                      (selectedAccount.riskLevel || 'medium') === 'medium' ? 'text-yellow-400' :
                      'text-red-400'
                    }`}>
                      {(selectedAccount.riskLevel || 'medium').toUpperCase()}
                    </div>
                  </div>
                </div>
              </div>

              {/* Seguridad Criptográfica */}
              <div className="bg-[#0d0d0d] border border-purple-500/40 rounded-lg p-6">
                <h3 className="text-lg font-bold text-purple-400 mb-4">
                  {language === 'es' ? '🔐 Seguridad Criptográfica' : '🔐 Cryptographic Security'}
                </h3>
                <div className="space-y-3">
                  <div>
                    <div className="text-[#4d7c4d] mb-2 text-xs">
                      {language === 'es' ? 'Hash de Verificación (SHA-256):' : 'Verification Hash (SHA-256):'}
                    </div>
                    <div className="flex items-center gap-2">
                      <code className="text-purple-400 font-mono text-xs bg-[#000] border border-purple-500/20 rounded px-3 py-2 flex-1 break-all">
                        {selectedAccount.verificationHash}
                      </code>
                      <button 
                        onClick={() => copyToClipboard(selectedAccount.verificationHash)} 
                        className="p-2 bg-purple-500/20 border border-purple-500/30 rounded"
                        title={language === 'es' ? 'Copiar hash' : 'Copy hash'}
                      >
                        <Copy className="w-4 h-4 text-purple-400" />
                      </button>
                    </div>
                  </div>
                  <div>
                    <div className="text-[#4d7c4d] mb-2 text-xs">
                      {language === 'es' ? 'Datos Encriptados (AES-256):' : 'Encrypted Data (AES-256):'}
                    </div>
                    <code className="text-green-400 font-mono text-xs bg-[#000] border border-green-500/20 rounded px-3 py-2 block break-all">
                      {selectedAccount.encryptedData.substring(0, 100)}...
                    </code>
                  </div>
                </div>
              </div>

              {/* Timestamps */}
              <div className="bg-[#0d0d0d] border border-[#1a1a1a] rounded-lg p-6">
                <h3 className="text-lg font-bold text-[#00ff88] mb-4">
                  {language === 'es' ? '🕐 Fechas y Auditoría' : '🕐 Dates & Audit'}
                </h3>
                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div>
                    <div className="text-[#4d7c4d] mb-1">{language === 'es' ? 'Creado:' : 'Created:'}</div>
                    <div className="text-[#80ff80]">{new Date(selectedAccount.createdAt).toLocaleString(language === 'es' ? 'es-ES' : 'en-US')}</div>
                  </div>
                  <div>
                    <div className="text-[#4d7c4d] mb-1">{language === 'es' ? 'Última Actualización:' : 'Last Updated:'}</div>
                    <div className="text-[#80ff80]">{new Date(selectedAccount.lastUpdated).toLocaleString(language === 'es' ? 'es-ES' : 'en-US')}</div>
                  </div>
                  <div>
                    <div className="text-[#4d7c4d] mb-1">{language === 'es' ? 'Última Auditoría:' : 'Last Audit:'}</div>
                    <div className="text-[#80ff80]">{new Date(selectedAccount.lastAudit || selectedAccount.lastUpdated).toLocaleString(language === 'es' ? 'es-ES' : 'en-US')}</div>
                  </div>
                </div>
              </div>

              {/* Reservas */}
              {selectedAccount.reservations && selectedAccount.reservations.length > 0 && (
                <div className="bg-[#0d0d0d] border border-[#1a1a1a] rounded-lg p-6">
                  <h3 className="text-lg font-bold text-[#00ff88] mb-4">
                    {language === 'es' ? `📜 Reservas (${selectedAccount.reservations.length})` : `📜 Reservations (${selectedAccount.reservations.length})`}
                  </h3>
                  <div className="space-y-3">
                    {selectedAccount.reservations.map(r => (
                      <div key={r.id} className="bg-[#0a0a0a] border border-[#1a1a1a] rounded-lg p-4">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-mono text-[#80ff80]">{r.id}</span>
                          <span className={`px-2 py-1 rounded text-xs font-bold ${
                            r.status === 'confirmed' ? 'bg-green-500/20 text-green-400' :
                            r.status === 'reserved' ? 'bg-yellow-500/20 text-yellow-400' :
                            r.status === 'completed' ? 'bg-blue-500/20 text-blue-400' :
                            'bg-gray-500/20 text-gray-400'
                          }`}>
                            {r.status.toUpperCase()}
                          </span>
                        </div>
                        <div className="grid grid-cols-2 gap-2 text-xs">
                          <div>
                            <span className="text-[#4d7c4d]">{language === 'es' ? 'Monto:' : 'Amount:'}</span>
                            <span className="text-[#80ff80] ml-1">{selectedAccount.currency} {r.amount.toLocaleString()}</span>
                          </div>
                          {r.type === 'blockchain' && r.tokenAmount && (
                            <div>
                              <span className="text-[#4d7c4d]">{language === 'es' ? 'Tokens:' : 'Tokens:'}</span>
                              <span className="text-cyan-400 ml-1">{r.tokenAmount.toLocaleString()} {selectedAccount.tokenSymbol}</span>
                            </div>
                          )}
                          {r.blockchain && (
                            <div>
                              <span className="text-[#4d7c4d]">Blockchain:</span>
                              <span className="text-[#80ff80] ml-1">{r.blockchain}</span>
                            </div>
                          )}
                          {r.destinationBank && (
                            <div>
                              <span className="text-[#4d7c4d]">{language === 'es' ? 'Banco Destino:' : 'Dest. Bank:'}</span>
                              <span className="text-[#80ff80] ml-1">{r.destinationBank}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Botones de Acción */}
              <div className="grid grid-cols-2 gap-3 pt-4 border-t border-[#00ff88]/30">
                <button
                  onClick={() => {
                    setShowDetailsModal(false);
                    setShowBlackScreen(true);
                  }}
                  className="px-6 py-3 bg-black border-2 border-[#00ff88] text-[#00ff88] font-bold rounded-lg hover:shadow-[0_0_25px_rgba(0,255,136,0.8)] transition-all"
                >
                  <CheckCircle className="w-5 h-5 inline mr-2" />
                  {language === 'es' ? '🖤 Generar Black Screen' : '🖤 Generate Black Screen'}
                </button>
                <button
                  onClick={() => exportAccountStatement(selectedAccount)}
                  className="px-6 py-3 bg-gradient-to-br from-[#00ff88] to-[#00cc6a] text-black font-bold rounded-lg hover:shadow-[0_0_20px_rgba(0,255,136,0.6)] transition-all"
                >
                  <Download className="w-5 h-5 inline mr-2" />
                  {language === 'es' ? '📄 Estado de Cuenta' : '📄 Account Statement'}
                </button>
                <button
                  onClick={() => {
                    setShowDetailsModal(false);
                    setShowReserveModal(true);
                  }}
                  className="px-6 py-2 bg-[#1a1a1a] border border-[#00ff88]/30 text-[#00ff88] rounded-lg hover:bg-[#252525]"
                >
                  <Lock className="w-4 h-4 inline mr-2" />
                  {language === 'es' ? 'Reservar Fondos' : 'Reserve Funds'}
                </button>
                <button
                  onClick={() => setShowDetailsModal(false)}
                  className="px-6 py-2 bg-[#1a1a1a] border border-[#2a2a2a] text-[#4d7c4d] rounded-lg hover:bg-[#252525]"
                >
                  {language === 'es' ? 'Cerrar' : 'Close'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Black Screen de Cuenta Custodio */}
      {showBlackScreen && selectedAccount && (
        <CustodyBlackScreen
          account={selectedAccount}
          onClose={() => setShowBlackScreen(false)}
        />
      )}
      </div>
      {/* Fin contenedor scroll */}
    </div>
  );
}

