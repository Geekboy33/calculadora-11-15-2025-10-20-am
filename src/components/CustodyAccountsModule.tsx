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
  ArrowUp,
  TrendingUp,
  Database,
  DollarSign,
  Building2,
  PlusCircle,
  History,
  Calendar,
  Clock,
  FileText,
  Banknote,
  ArrowDownCircle,
  ArrowUpCircle
} from 'lucide-react';
import { useLanguage } from '../lib/i18n';
import { balanceStore, type CurrencyBalance } from '../lib/balances-store';
import { ledgerPersistenceStoreV2, type LedgerBalanceV2 } from '../lib/ledger-persistence-store-v2';
import { custodyStore, type CustodyAccount, type CustodyTransaction, type AccountCategory } from '../lib/custody-store';
import { CustodyBlackScreen } from './CustodyBlackScreen';
import { apiVUSD1Store } from '../lib/api-vusd1-store';
import { transactionEventStore } from '../lib/transaction-event-store';

const BLOCKCHAINS = [
  { name: 'Ethereum', symbol: 'ETH', color: 'text-blue-400' },
  { name: 'Binance Smart Chain', symbol: 'BSC', color: 'text-yellow-400' },
  { name: 'Polygon', symbol: 'MATIC', color: 'text-purple-400' },
  { name: 'Arbitrum', symbol: 'ARB', color: 'text-cyan-400' },
  { name: 'Optimism', symbol: 'OP', color: 'text-red-400' },
  { name: 'Avalanche', symbol: 'AVAX', color: 'text-red-300' },
  { name: 'Solana', symbol: 'SOL', color: 'text-white' },
  { name: 'Stellar', symbol: 'XLM', color: 'text-indigo-400' },
];

export function CustodyAccountsModule() {
  const { t, language } = useLanguage();
  const isSpanish = language === 'es';
  const [custodyAccounts, setCustodyAccounts] = useState<CustodyAccount[]>([]);
  const [systemBalances, setSystemBalances] = useState<CurrencyBalance[]>([]);
  const [ledger1Balances, setLedger1Balances] = useState<LedgerBalanceV2[]>([]);
  const [fundSource, setFundSource] = useState<'ledger' | 'ledger1'>('ledger');
  
  // IBAN Country Codes - Union of Comoros (Banco Digital Commercial Bank Ltd)
  // Código ISO 3166-1: KM (Comoros)
  const IBAN_COUNTRIES: Record<string, { code: string; length: number; name: string }> = {
    'USD': { code: 'KM', length: 27, name: 'Union of Comoros' },
    'EUR': { code: 'KM', length: 27, name: 'Union of Comoros' },
    'GBP': { code: 'KM', length: 27, name: 'Union of Comoros' },
    'CHF': { code: 'KM', length: 27, name: 'Union of Comoros' },
    'CAD': { code: 'KM', length: 27, name: 'Union of Comoros' },
    'AUD': { code: 'KM', length: 27, name: 'Union of Comoros' },
    'JPY': { code: 'KM', length: 27, name: 'Union of Comoros' },
    'CNY': { code: 'KM', length: 27, name: 'Union of Comoros' },
    'INR': { code: 'KM', length: 27, name: 'Union of Comoros' },
    'MXN': { code: 'KM', length: 27, name: 'Union of Comoros' },
    'BRL': { code: 'KM', length: 27, name: 'Union of Comoros' },
    'RUB': { code: 'KM', length: 27, name: 'Union of Comoros' },
    'KRW': { code: 'KM', length: 27, name: 'Union of Comoros' },
    'SGD': { code: 'KM', length: 27, name: 'Union of Comoros' },
    'HKD': { code: 'KM', length: 27, name: 'Union of Comoros' },
    'AED': { code: 'KM', length: 27, name: 'Union of Comoros' },
    'KMF': { code: 'KM', length: 27, name: 'Union of Comoros' }, // Franco Comorense
  };
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showReserveModal, setShowReserveModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showEditBalanceModal, setShowEditBalanceModal] = useState(false);
  const [balanceOperation, setBalanceOperation] = useState<'add' | 'subtract'>('add');
  const [balanceAmount, setBalanceAmount] = useState(0);
  const [showBlackScreen, setShowBlackScreen] = useState(false);
  const [selectedAccount, setSelectedAccount] = useState<CustodyAccount | null>(null);
  const [showScrollTop, setShowScrollTop] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const accountsListRef = useRef<HTMLDivElement>(null);

  // Tipos de cuenta disponibles
  const ACCOUNT_CATEGORIES = [
    { id: 'custody', nameEs: 'Cuenta Custodio', nameEn: 'Custody Account' },
    { id: 'savings', nameEs: 'Cuenta de Ahorros', nameEn: 'Savings Account' },
    { id: 'checking', nameEs: 'Cuenta Corriente', nameEn: 'Checking Account' },
    { id: 'nostro', nameEs: 'Cuenta Nostro', nameEn: 'Nostro Account' },
    { id: 'margin', nameEs: 'Cuenta de Margen', nameEn: 'Margin Account' },
  ];

  // Formulario de creación
  const [formData, setFormData] = useState({
    accountType: 'blockchain' as 'blockchain' | 'banking',
    accountCategory: 'custody' as 'custody' | 'savings' | 'checking' | 'nostro' | 'margin',
    accountName: '',
    currency: 'USD',
    amount: 0,
    blockchain: 'Ethereum',
    tokenSymbol: '',
    contractAddress: '',
    bankName: 'DAES - Data and Exchange Settlement',
    fundDenomination: 'M1' as 'M1' | 'M2',
    customAccountNumber: '', // Número de cuenta manual opcional
  });

  // Modal para agregar fondos
  const [showAddFundsModal, setShowAddFundsModal] = useState(false);
  const [addFundsData, setAddFundsData] = useState({
    amount: 0,
    type: 'deposit' as 'deposit' | 'transfer_in' | 'adjustment',
    description: '',
    sourceAccount: '',
    sourceBank: '',
    transactionDate: new Date().toISOString().split('T')[0],
    transactionTime: new Date().toTimeString().split(' ')[0].substring(0, 5),
    valueDate: new Date().toISOString().split('T')[0],
    notes: '',
  });

  // Modal para historial de transacciones
  const [showTransactionHistory, setShowTransactionHistory] = useState(false);

  // Modal para retiro de fondos
  const [showWithdrawModal, setShowWithdrawModal] = useState(false);
  const [withdrawData, setWithdrawData] = useState({
    amount: 0,
    type: 'withdrawal' as 'withdrawal' | 'transfer_out',
    description: '',
    destinationAccount: '',
    destinationBank: '',
    transactionDate: new Date().toISOString().split('T')[0],
    transactionTime: new Date().toTimeString().split(' ')[0].substring(0, 5),
    valueDate: new Date().toISOString().split('T')[0],
    notes: '',
  });

  // Modal para transferencia entre cuentas custodio
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [transferData, setTransferData] = useState({
    sourceAccountId: '',
    destinationAccountId: '',
    amount: 0,
    description: '',
    transactionDate: new Date().toISOString().split('T')[0],
    transactionTime: new Date().toTimeString().split(' ')[0].substring(0, 5),
    notes: '',
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

    // Cargar balances de Account Ledger
    const balances = balanceStore.getBalances();
    setSystemBalances(balances);
    
    // Cargar balances de Account Ledger1 (Treasury Reserve1)
    const ledger1State = ledgerPersistenceStoreV2.getState();
    setLedger1Balances(ledger1State.balances);

    // 🔥 SUSCRIBIRSE A CAMBIOS EN TIEMPO REAL 🔥
    const unsubscribeCustody = custodyStore.subscribe((newAccounts) => {
      console.log('[CustodyModule] 🔄 Actualización de cuentas custodio:', newAccounts.length);
      setCustodyAccounts(newAccounts);
    });
    
    const unsubscribeBalance = balanceStore.subscribe((newBalances) => {
      console.log('[CustodyModule] 🔄 Actualización de balances Account Ledger:', newBalances.length, 'divisas');
      setSystemBalances(newBalances);
    });
    
    const unsubscribeLedger1 = ledgerPersistenceStoreV2.subscribe((newState) => {
      console.log('[CustodyModule] 🔄 Actualización de balances Account Ledger1:', newState.balances.length, 'divisas');
      setLedger1Balances(newState.balances);
    });

    return () => {
      unsubscribeCustody();
      unsubscribeBalance();
      unsubscribeLedger1();
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
  // Función para agregar fondos a cuenta existente
  const handleAddFunds = () => {
    if (!selectedAccount || addFundsData.amount <= 0) {
      alert(isSpanish ? 'Ingrese un monto válido' : 'Enter a valid amount');
      return;
    }

    const transaction = custodyStore.addFundsWithTransaction(selectedAccount.id, {
      amount: addFundsData.amount,
      type: addFundsData.type,
      description: addFundsData.description || (isSpanish ? 'Ingreso de fondos' : 'Funds deposit'),
      sourceAccount: addFundsData.sourceAccount,
      sourceBank: addFundsData.sourceBank,
      transactionDate: addFundsData.transactionDate,
      transactionTime: addFundsData.transactionTime + ':00',
      valueDate: addFundsData.valueDate,
      notes: addFundsData.notes,
      createdBy: 'OPERATOR'
    });

    if (transaction) {
      alert(isSpanish 
        ? `✅ Fondos agregados exitosamente\nReferencia: ${transaction.reference}` 
        : `✅ Funds added successfully\nReference: ${transaction.reference}`
      );
      setShowAddFundsModal(false);
      setAddFundsData({
        amount: 0,
        type: 'deposit',
        description: '',
        sourceAccount: '',
        sourceBank: '',
        transactionDate: new Date().toISOString().split('T')[0],
        transactionTime: new Date().toTimeString().split(' ')[0].substring(0, 5),
        valueDate: new Date().toISOString().split('T')[0],
        notes: '',
      });
    } else {
      alert(isSpanish ? '❌ Error al agregar fondos' : '❌ Error adding funds');
    }
  };

  // Función para retirar fondos de cuenta existente
  const handleWithdraw = () => {
    if (!selectedAccount || withdrawData.amount <= 0) {
      alert(isSpanish ? 'Ingrese un monto válido' : 'Enter a valid amount');
      return;
    }

    if (withdrawData.amount > selectedAccount.availableBalance) {
      alert(isSpanish 
        ? `Fondos insuficientes. Disponible: ${selectedAccount.currency} ${selectedAccount.availableBalance.toLocaleString()}` 
        : `Insufficient funds. Available: ${selectedAccount.currency} ${selectedAccount.availableBalance.toLocaleString()}`
      );
      return;
    }

    const transaction = custodyStore.withdrawFundsWithTransaction(selectedAccount.id, {
      amount: withdrawData.amount,
      type: withdrawData.type,
      description: withdrawData.description || (isSpanish ? 'Retiro de fondos' : 'Funds withdrawal'),
      destinationAccount: withdrawData.destinationAccount,
      destinationBank: withdrawData.destinationBank,
      transactionDate: withdrawData.transactionDate,
      transactionTime: withdrawData.transactionTime + ':00',
      valueDate: withdrawData.valueDate,
      notes: withdrawData.notes,
      createdBy: 'OPERATOR'
    });

    if (transaction) {
      alert(isSpanish 
        ? `✅ Retiro procesado exitosamente\nReferencia: ${transaction.reference}\nMonto: ${selectedAccount.currency} ${withdrawData.amount.toLocaleString()}` 
        : `✅ Withdrawal processed successfully\nReference: ${transaction.reference}\nAmount: ${selectedAccount.currency} ${withdrawData.amount.toLocaleString()}`
      );
      setShowWithdrawModal(false);
      setWithdrawData({
        amount: 0,
        type: 'withdrawal',
        description: '',
        destinationAccount: '',
        destinationBank: '',
        transactionDate: new Date().toISOString().split('T')[0],
        transactionTime: new Date().toTimeString().split(' ')[0].substring(0, 5),
        valueDate: new Date().toISOString().split('T')[0],
        notes: '',
      });
    } else {
      alert(isSpanish ? '❌ Error al procesar retiro' : '❌ Error processing withdrawal');
    }
  };

  // Función para transferir entre cuentas custodio
  const handleTransferBetweenAccounts = () => {
    if (!transferData.sourceAccountId || !transferData.destinationAccountId) {
      alert(isSpanish ? 'Seleccione cuenta origen y destino' : 'Select source and destination accounts');
      return;
    }

    if (transferData.sourceAccountId === transferData.destinationAccountId) {
      alert(isSpanish ? 'Las cuentas origen y destino deben ser diferentes' : 'Source and destination accounts must be different');
      return;
    }

    if (transferData.amount <= 0) {
      alert(isSpanish ? 'Ingrese un monto válido' : 'Enter a valid amount');
      return;
    }

    const sourceAccount = custodyAccounts.find(a => a.id === transferData.sourceAccountId);
    const destAccount = custodyAccounts.find(a => a.id === transferData.destinationAccountId);

    if (!sourceAccount || !destAccount) {
      alert(isSpanish ? 'Cuenta no encontrada' : 'Account not found');
      return;
    }

    if (transferData.amount > sourceAccount.availableBalance) {
      alert(isSpanish 
        ? `Fondos insuficientes en cuenta origen. Disponible: ${sourceAccount.currency} ${sourceAccount.availableBalance.toLocaleString()}` 
        : `Insufficient funds in source account. Available: ${sourceAccount.currency} ${sourceAccount.availableBalance.toLocaleString()}`
      );
      return;
    }

    // Retirar de cuenta origen
    const withdrawTx = custodyStore.withdrawFundsWithTransaction(sourceAccount.id, {
      amount: transferData.amount,
      type: 'transfer_out',
      description: `${isSpanish ? 'Transferencia a' : 'Transfer to'}: ${destAccount.accountName}`,
      destinationAccount: destAccount.accountNumber || destAccount.id,
      destinationBank: 'DAES Internal',
      transactionDate: transferData.transactionDate,
      transactionTime: transferData.transactionTime + ':00',
      valueDate: transferData.transactionDate,
      notes: transferData.notes,
      createdBy: 'OPERATOR'
    });

    if (!withdrawTx) {
      alert(isSpanish ? '❌ Error al debitar cuenta origen' : '❌ Error debiting source account');
      return;
    }

    // Depositar en cuenta destino
    const depositTx = custodyStore.addFundsWithTransaction(destAccount.id, {
      amount: transferData.amount,
      type: 'transfer_in',
      description: `${isSpanish ? 'Transferencia desde' : 'Transfer from'}: ${sourceAccount.accountName}`,
      sourceAccount: sourceAccount.accountNumber || sourceAccount.id,
      sourceBank: 'DAES Internal',
      transactionDate: transferData.transactionDate,
      transactionTime: transferData.transactionTime + ':00',
      valueDate: transferData.transactionDate,
      notes: transferData.notes,
      createdBy: 'OPERATOR'
    });

    if (depositTx) {
      alert(isSpanish 
        ? `✅ Transferencia completada\n\nOrigen: ${sourceAccount.accountName}\nDestino: ${destAccount.accountName}\nMonto: ${sourceAccount.currency} ${transferData.amount.toLocaleString()}\n\nRef. Débito: ${withdrawTx.reference}\nRef. Crédito: ${depositTx.reference}` 
        : `✅ Transfer completed\n\nFrom: ${sourceAccount.accountName}\nTo: ${destAccount.accountName}\nAmount: ${sourceAccount.currency} ${transferData.amount.toLocaleString()}\n\nDebit Ref: ${withdrawTx.reference}\nCredit Ref: ${depositTx.reference}`
      );
      setShowTransferModal(false);
      setTransferData({
        sourceAccountId: '',
        destinationAccountId: '',
        amount: 0,
        description: '',
        transactionDate: new Date().toISOString().split('T')[0],
        transactionTime: new Date().toTimeString().split(' ')[0].substring(0, 5),
        notes: '',
      });
    } else {
      alert(isSpanish ? '❌ Error al acreditar cuenta destino' : '❌ Error crediting destination account');
    }
  };

  // Obtener nombre de categoría de cuenta
  const getAccountCategoryName = (category: string) => {
    const cat = ACCOUNT_CATEGORIES.find(c => c.id === category);
    return cat ? (isSpanish ? cat.nameEs : cat.nameEn) : category;
  };

  // Generar IBAN con formato internacional ISO 13616
  const generateInternationalIBAN = (currency: string, accountNumber?: string): string => {
    const country = IBAN_COUNTRIES[currency] || { code: 'KM', length: 27, name: 'Union of Comoros' };
    const bankCode = 'DCBK'; // Digital Commercial Bank - Comoros
    const branchCode = '001';
    
    // Generar número de cuenta si no se proporciona
    let baseNumber = accountNumber;
    if (!baseNumber) {
      const randomDigits = Math.floor(Math.random() * 10000000000).toString().padStart(10, '0');
      baseNumber = randomDigits;
    }
    
    // Calcular dígitos de control IBAN (simplificado)
    const checkDigits = ((98 - (parseInt(baseNumber.slice(-2)) % 97)) % 97).toString().padStart(2, '0');
    
    // Formato: PAÍS + CHECK + BANCO + BRANCH + CUENTA
    const iban = `${country.code}${checkDigits}${bankCode}${branchCode}${baseNumber.padStart(12, '0')}`;
    
    return iban.toUpperCase();
  };

  // Generar número de cuenta en formato internacional - Union of Comoros
  const generateInternationalAccountNumber = (currency: string, category: string): string => {
    const country = IBAN_COUNTRIES[currency] || { code: 'KM', length: 27, name: 'Union of Comoros' };
    const categoryCode: Record<string, string> = {
      'custody': 'CUS',
      'savings': 'SAV',
      'checking': 'CHK',
      'nostro': 'NOS',
      'margin': 'MRG'
    };
    
    const typeCode = categoryCode[category] || 'GEN';
    const date = new Date();
    const year = date.getFullYear().toString().slice(-2);
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const sequence = Math.floor(Math.random() * 9999999).toString().padStart(7, '0');
    
    // Formato: PAÍS-BANCO-TIPO-AÑO-MES-SECUENCIA
    return `${country.code}${currency}${typeCode}${year}${month}${sequence}`;
  };

  // Obtener balances disponibles según la fuente seleccionada
  const getAvailableBalances = () => {
    if (fundSource === 'ledger1') {
      return ledger1Balances.map(b => ({
        currency: b.currency,
        totalAmount: b.balance,
        accountName: b.account || `${b.currency} Account`,
        transactionCount: b.transactionCount,
        largestTransaction: b.largestTransaction,
        smallestTransaction: b.smallestTransaction,
        averageTransaction: b.averageTransaction,
        lastUpdated: b.lastUpdate,
        amounts: []
      }));
    }
    return systemBalances;
  };

  const handleCreateAccount = () => {
    if (!formData.accountName || formData.amount <= 0) {
      alert(isSpanish ? 'Completa todos los campos' : 'Complete all fields');
      return;
    }

    // Obtener balances según la fuente seleccionada
    const availableBalances = getAvailableBalances();
    const balance = availableBalances.find(b => b.currency === formData.currency);
    
    if (!balance || balance.totalAmount < formData.amount) {
      const sourceName = fundSource === 'ledger1' ? 'Account Ledger1 (Treasury Reserve1)' : 'Account Ledger';
      alert(isSpanish 
        ? `Fondos insuficientes en ${sourceName}` 
        : `Insufficient funds in ${sourceName}`);
      return;
    }

    const balanceBefore = balance.totalAmount;
    const tokenSymbol = formData.tokenSymbol || `${formData.currency}T`;
    
    // Generar número de cuenta internacional si no se proporciona
    let finalAccountNumber = formData.customAccountNumber;
    if (!finalAccountNumber) {
      finalAccountNumber = generateInternationalAccountNumber(
        formData.currency, 
        formData.accountCategory
      );
    }
    
    const sourceName = fundSource === 'ledger1' ? 'Account Ledger1' : 'Account Ledger';
    console.log('[CustodyModule] 💸 TRANSFERENCIA DE FONDOS:');
    console.log(`  Fuente: ${sourceName}`);
    console.log(`  Balance ANTES: ${formData.currency} ${balanceBefore.toLocaleString()}`);
    console.log(`  Monto a transferir: ${formData.currency} ${formData.amount.toLocaleString()}`);
    console.log(`  Balance DESPUÉS: ${formData.currency} ${(balanceBefore - formData.amount).toLocaleString()}`);
    console.log(`  Destino: Cuenta ${formData.accountCategory} (${formData.accountType})`);
    console.log(`  Número de cuenta: ${finalAccountNumber}`);
    
    custodyStore.createAccount(
      formData.accountType,
      formData.accountName,
      formData.currency,
      formData.amount,
      formData.blockchain,
      tokenSymbol,
      formData.bankName,
      formData.contractAddress || undefined,
      formData.fundDenomination,
      formData.accountCategory as AccountCategory,
      finalAccountNumber
    );

    setShowCreateModal(false);
    setFormData({ 
      accountType: 'blockchain', 
      accountCategory: 'custody',
      accountName: '', 
      currency: 'USD', 
      amount: 0, 
      blockchain: 'Ethereum', 
      tokenSymbol: '',
      contractAddress: '',
      bankName: 'DAES - Data and Exchange Settlement',
      fundDenomination: 'M1',
      customAccountNumber: '',
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

    // ⛔ VERIFICACIÓN PRINCIPAL: Si ya hay balance reservado, bloquear
    if (selectedAccount.reservedBalance > 0) {
      alert(
        language === 'es' 
          ? `⛔ Esta cuenta ya tiene fondos reservados.\n\n` +
            `Balance Reservado: ${selectedAccount.currency} ${selectedAccount.reservedBalance.toLocaleString()}\n\n` +
            `No se puede crear otra reserva hasta que se complete o libere la reserva actual.`
          : `⛔ This account already has reserved funds.\n\n` +
            `Reserved Balance: ${selectedAccount.currency} ${selectedAccount.reservedBalance.toLocaleString()}\n\n` +
            `Cannot create another reservation until the current one is completed or released.`
      );
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
║           Digital Commercial Bank Ltd                                ║
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
            className="fixed bottom-8 right-8 z-50 p-4 bg-gradient-to-br from-[#ffffff] to-[#e0e0e0] text-black font-bold rounded-full shadow-[0_0_30px_rgba(255, 255, 255,0.8)] hover:shadow-[0_0_50px_rgba(255, 255, 255,1)] transition-all hover:scale-110 animate-bounce"
            title={language === 'es' ? 'Ir al inicio' : 'Go to top'}
          >
            <ArrowUp className="w-6 h-6" />
          </button>
        )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-[#ffffff] flex items-center gap-3">
            <Shield className="w-8 h-8" />
            {language === 'es' ? 'Cuentas Custodio - Tokenización Blockchain' : 'Custody Accounts - Blockchain Tokenization'}
          </h1>
          <p className="text-[#ffffff] mt-2">
            {language === 'es' 
              ? 'Sistema de reservas y verificación de fondos para stablecoins' 
              : 'Reserve system and fund verification for stablecoins'}
          </p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="px-6 py-3 bg-gradient-to-br from-[#ffffff] to-[#e0e0e0] text-black font-bold rounded-lg hover:shadow-[0_0_20px_rgba(255, 255, 255,0.6)] transition-all flex items-center gap-2"
        >
          <Plus className="w-5 h-5" />
          {language === 'es' ? 'Crear Cuenta Custodio' : 'Create Custody Account'}
        </button>
      </div>

      {/* Estadísticas Generales */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-[#0d0d0d] border border-[#1a1a1a] rounded-xl p-6">
          <div className="flex items-center gap-3 mb-2">
            <Wallet className="w-5 h-5 text-[#ffffff]" />
            <span className="text-[#ffffff] text-sm">{language === 'es' ? 'Cuentas Totales' : 'Total Accounts'}</span>
          </div>
          <p className="text-3xl font-bold text-[#ffffff]">{stats.totalAccounts}</p>
        </div>

        <div className="bg-[#0d0d0d] border border-[#1a1a1a] rounded-xl p-6">
          <div className="flex items-center gap-3 mb-2">
            <Lock className="w-5 h-5 text-yellow-400" />
            <span className="text-[#ffffff] text-sm">{language === 'es' ? 'Fondos Reservados' : 'Reserved Funds'}</span>
          </div>
          <p className="text-3xl font-bold text-yellow-400">${stats.totalReserved.toLocaleString()}</p>
        </div>

        <div className="bg-[#0d0d0d] border border-[#1a1a1a] rounded-xl p-6">
          <div className="flex items-center gap-3 mb-2">
            <Unlock className="w-5 h-5 text-white" />
            <span className="text-[#ffffff] text-sm">{language === 'es' ? 'Fondos Disponibles' : 'Available Funds'}</span>
          </div>
          <p className="text-3xl font-bold text-white">${stats.totalAvailable.toLocaleString()}</p>
        </div>

        <div className="bg-[#0d0d0d] border border-[#1a1a1a] rounded-xl p-6">
          <div className="flex items-center gap-3 mb-2">
            <CheckCircle className="w-5 h-5 text-cyan-400" />
            <span className="text-[#ffffff] text-sm">{language === 'es' ? 'Reservas Confirmadas' : 'Confirmed Reservations'}</span>
          </div>
          <p className="text-3xl font-bold text-cyan-400">{stats.confirmedReservations}</p>
        </div>
      </div>

      {/* Selector de Fuente de Fondos */}
      <div className="bg-gradient-to-r from-blue-900/20 to-purple-900/20 border border-blue-500/30 rounded-xl p-6">
        <h2 className="text-xl font-semibold text-blue-400 mb-4 flex items-center gap-2">
          <Database className="w-5 h-5" />
          {language === 'es' ? 'Fuente de Fondos' : 'Fund Source'}
        </h2>
        <div className="grid grid-cols-2 gap-4 mb-4">
          <button
            onClick={() => setFundSource('ledger')}
            className={`p-4 rounded-lg border-2 transition-all ${
              fundSource === 'ledger'
                ? 'border-emerald-500 bg-emerald-500/20 text-emerald-400'
                : 'border-[#1a1a1a] bg-[#0a0a0a] text-[#999] hover:border-emerald-500/30'
            }`}
          >
            <div className="text-lg font-bold">📊 Account Ledger</div>
            <div className="text-xs mt-1">{language === 'es' ? 'Treasury Reserve Original' : 'Original Treasury Reserve'}</div>
            <div className="text-sm mt-2 font-mono">{systemBalances.length} {language === 'es' ? 'divisas' : 'currencies'}</div>
          </button>
          <button
            onClick={() => setFundSource('ledger1')}
            className={`p-4 rounded-lg border-2 transition-all ${
              fundSource === 'ledger1'
                ? 'border-purple-500 bg-purple-500/20 text-purple-400'
                : 'border-[#1a1a1a] bg-[#0a0a0a] text-[#999] hover:border-purple-500/30'
            }`}
          >
            <div className="text-lg font-bold">📈 Account Ledger1</div>
            <div className="text-xs mt-1">{language === 'es' ? 'Treasury Reserve1 (V2)' : 'Treasury Reserve1 (V2)'}</div>
            <div className="text-sm mt-2 font-mono">{ledger1Balances.length} {language === 'es' ? 'divisas' : 'currencies'}</div>
          </button>
        </div>
        
        {/* Balances de la fuente seleccionada */}
        <div className="grid grid-cols-3 md:grid-cols-5 gap-3">
          {getAvailableBalances().map(bal => (
            <div key={bal.currency} className={`bg-[#0a0a0a] border rounded-lg p-3 text-center ${
              fundSource === 'ledger1' ? 'border-purple-500/30' : 'border-emerald-500/30'
            }`}>
              <div className="text-sm text-[#ffffff]">{bal.currency}</div>
              <div className={`text-lg font-bold font-mono ${
                fundSource === 'ledger1' ? 'text-purple-400' : 'text-emerald-400'
              }`}>
                {bal.totalAmount.toLocaleString()}
              </div>
              {IBAN_COUNTRIES[bal.currency] && (
                <div className="text-xs text-[#666] mt-1">
                  {IBAN_COUNTRIES[bal.currency].code} - ISO
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Cuentas Custodio */}
      {custodyAccounts.length > 0 ? (
        <>
        <div ref={accountsListRef} className="space-y-4">
          {custodyAccounts.map(account => (
            <div 
              key={account.id} 
              className="bg-[#0d0d0d] border border-[#1a1a1a] rounded-xl p-6 hover:border-[#ffffff]/30 transition-all cursor-pointer"
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
                    <h3 className="text-xl font-bold text-[#ffffff]">{account.accountName}</h3>
                    <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                      (account.accountType || 'blockchain') === 'blockchain' 
                        ? 'bg-cyan-500/20 border border-cyan-500/40 text-cyan-400' 
                        : 'bg-white/20/20 border border-white/30/40 text-black'
                    }`}>
                      {(account.accountType || 'blockchain') === 'blockchain' ? 'BLOCKCHAIN CUSTODY' : 'BANKING ACCOUNT'}
                    </span>
                    {account.accountCategory && (
                      <span className="px-3 py-1 rounded-full text-xs font-bold bg-purple-500/20 border border-purple-500/40 text-purple-400">
                        {getAccountCategoryName(account.accountCategory)}
                      </span>
                    )}
                    <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                      account.apiStatus === 'active' ? 'bg-white/20/20 text-black' :
                      account.apiStatus === 'pending' ? 'bg-yellow-500/20 text-yellow-400' :
                      'bg-red-500/20 text-red-400'
                    }`}>
                      {(account.apiStatus || 'pending').toUpperCase()}
                    </span>
                  </div>
                  <div className="flex items-center gap-4 text-sm">
                    <p className="text-[#ffffff]">ID: {account.id}</p>
                    {account.accountNumber && (
                      <p className="text-[#ffffff] font-mono font-bold">
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
                    className="px-4 py-2 bg-gradient-to-r from-white/10 to-blue-600 text-white rounded-lg hover:shadow-[0_0_20px_rgba(255, 255, 255,0.6)] transition-all text-sm font-bold"
                  >
                    <Shield className="w-4 h-4 inline mr-1" />
                    {language === 'es' ? 'Ver Verificación' : 'View Verification'}
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedAccount(account);
                      setShowAddFundsModal(true);
                    }}
                    className="px-4 py-2 bg-gradient-to-r from-emerald-600 to-green-600 text-white rounded-lg hover:shadow-[0_0_15px_rgba(16,185,129,0.6)] transition-all text-sm font-bold"
                  >
                    <ArrowDownCircle className="w-4 h-4 inline mr-1" />
                    {language === 'es' ? '+ Fondos' : '+ Funds'}
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedAccount(account);
                      setShowWithdrawModal(true);
                    }}
                    className="px-4 py-2 bg-gradient-to-r from-orange-600 to-red-600 text-white rounded-lg hover:shadow-[0_0_15px_rgba(249,115,22,0.6)] transition-all text-sm font-bold"
                  >
                    <ArrowUpCircle className="w-4 h-4 inline mr-1" />
                    {language === 'es' ? '- Retiro' : '- Withdraw'}
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedAccount(account);
                      setShowTransactionHistory(true);
                    }}
                    className="px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg hover:shadow-[0_0_15px_rgba(59,130,246,0.6)] transition-all text-sm font-bold"
                  >
                    <History className="w-4 h-4 inline mr-1" />
                    {language === 'es' ? 'Historial' : 'History'}
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedAccount(account);
                      setShowBlackScreen(true);
                    }}
                    className="px-4 py-2 bg-black border border-[#ffffff] text-[#ffffff] rounded-lg hover:shadow-[0_0_15px_rgba(255, 255, 255,0.6)] transition-all text-sm font-bold"
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
                    className="px-4 py-2 bg-[#1a1a1a] border border-[#ffffff]/30 text-[#ffffff] rounded-lg hover:bg-[#252525] transition-all text-sm"
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

              {/* Balances con botón de ajuste */}
              <div className="grid grid-cols-3 gap-4 mb-4">
                <div className="bg-[#0a0a0a] border border-[#1a1a1a] rounded-lg p-4">
                  <div className="flex items-center justify-between mb-1">
                    <div className="text-xs text-[#ffffff]">
                      {language === 'es' ? 'Total' : 'Total'}
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedAccount(account);
                        setShowEditBalanceModal(true);
                      }}
                      className="p-1 bg-[#ffffff]/10 border border-[#ffffff]/30 text-[#ffffff] rounded hover:bg-[#ffffff]/20 transition-all"
                      title={isSpanish ? 'Ajustar balance' : 'Adjust balance'}
                    >
                      <TrendingUp className="w-3 h-3" />
                    </button>
                  </div>
                  <div className="text-2xl font-bold text-[#ffffff] font-mono">
                    {account.currency} {account.totalBalance.toLocaleString()}
                  </div>
                </div>
                <div className="bg-[#0a0a0a] border border-yellow-900/30 rounded-lg p-4">
                  <div className="text-xs text-[#ffffff] mb-1">
                    {language === 'es' ? 'Reservado' : 'Reserved'}
                  </div>
                  <div className="text-2xl font-bold text-yellow-400 font-mono">
                    {account.currency} {account.reservedBalance.toLocaleString()}
                  </div>
                </div>
                <div className="bg-[#0a0a0a] border border-white/30/30 rounded-lg p-4">
                  <div className="text-xs text-[#ffffff] mb-1">
                    {language === 'es' ? 'Disponible' : 'Available'}
                  </div>
                  <div className="text-2xl font-bold text-white font-mono">
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
                      <Shield className="w-4 h-4 text-white" />
                      <div>
                        <div className="text-sm font-semibold text-white">API VUSD</div>
                        <div className="text-xs text-gray-400">
                          {account.vusdBalanceEnabled ? (
                            <span className="text-white">✓ {language === 'es' ? 'Activo' : 'Active'}</span>
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
                        account.vusdBalanceEnabled ? 'bg-white/20' : 'bg-gray-600'
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
                      <div className="text-[#ffffff] mb-1">{language === 'es' ? 'Número de Cuenta:' : 'Account Number:'}</div>
                      <div className="text-cyan-400 font-mono font-bold">{account.accountNumber}</div>
                    </div>
                    <div>
                      <div className="text-[#ffffff] mb-1">Blockchain:</div>
                      <div className="text-[#ffffff] flex items-center gap-2">
                        {account.blockchainLink}
                        <ExternalLink className="w-3 h-3" />
                      </div>
                    </div>
                    <div>
                      <div className="text-[#ffffff] mb-1">Token Symbol:</div>
                      <div className="text-[#ffffff] font-mono font-bold">{account.tokenSymbol}</div>
                    </div>
                    <div className="col-span-1">
                      <div className="text-[#ffffff] mb-1">Tipo:</div>
                      <div className="text-cyan-400 font-bold">BLOCKCHAIN CUSTODY</div>
                    </div>
                    <div className="col-span-2">
                      <div className="text-[#ffffff] mb-1">Dirección del Contrato:</div>
                      <div className="flex items-center gap-2">
                        <code className="text-[#ffffff] font-mono text-xs bg-[#000] border border-[#1a1a1a] rounded px-2 py-1 flex-1">
                          {account.contractAddress}
                        </code>
                        <button
                          onClick={() => copyToClipboard(account.contractAddress || '')}
                          className="p-1 bg-[#1a1a1a] border border-[#ffffff]/30 rounded hover:bg-[#252525]"
                          title="Copiar"
                        >
                          <Copy className="w-4 h-4 text-[#ffffff]" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="bg-gradient-to-r from-white/10/20 to-emerald-900/20 border border-white/30/30 rounded-lg p-4 mb-4">
                  <h4 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
                    🏦 {language === 'es' ? 'Información Bancaria' : 'Banking Information'}
                  </h4>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <div className="text-[#ffffff] mb-1">{language === 'es' ? 'Número de Cuenta:' : 'Account Number:'}</div>
                      <div className="text-white font-mono font-bold">{account.accountNumber}</div>
                    </div>
                    <div>
                      <div className="text-[#ffffff] mb-1">{language === 'es' ? 'Banco:' : 'Bank:'}</div>
                      <div className="text-[#ffffff]">{account.bankName}</div>
                    </div>
                    <div>
                      <div className="text-[#ffffff] mb-1">{language === 'es' ? 'Tipo:' : 'Type:'}</div>
                      <div className="text-white font-bold">BANKING ACCOUNT</div>
                    </div>
                  </div>
                </div>
              )}

              {/* API Endpoint (común para ambos tipos) */}
              <div className="bg-[#0a0a0a] border border-[#1a1a1a] rounded-lg p-4 mb-4">
                <h4 className="text-sm font-semibold text-[#ffffff] mb-3">
                  {language === 'es' ? 'API de Verificación' : 'Verification API'}
                </h4>
                <div className="space-y-3">
                  <div>
                    <div className="text-[#ffffff] mb-1 text-xs">Endpoint:</div>
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
                      <div className="text-[#ffffff] mb-1 text-xs">API Key:</div>
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
              <div className="bg-gradient-to-r from-white/10/20 to-cyan-900/20 border border-white/30/30 rounded-lg p-4 mb-4">
                <h4 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
                  🥇 {language === 'es' ? 'Cumplimiento de Estándares Internacionales' : 'International Standards Compliance'}
                </h4>
                <div className="grid grid-cols-3 gap-3 mb-3">
                  <div className="bg-[#0a0a0a] border border-cyan-500/20 rounded p-2 text-center">
                    <div className="text-xs text-[#ffffff] mb-1">ISO 27001</div>
                    <div className={`font-bold text-sm ${account.iso27001Compliant !== false ? 'text-white' : 'text-yellow-400'}`}>
                      {account.iso27001Compliant !== false ? '✓ COMPLIANT' : '⚡ PENDING'}
                    </div>
                    <div className="text-xs text-cyan-300 mt-1">{language === 'es' ? 'Seguridad' : 'Security'}</div>
                  </div>
                  <div className="bg-[#0a0a0a] border border-blue-500/20 rounded p-2 text-center">
                    <div className="text-xs text-[#ffffff] mb-1">ISO 20022</div>
                    <div className={`font-bold text-sm ${account.iso20022Compatible !== false ? 'text-white' : 'text-yellow-400'}`}>
                      {account.iso20022Compatible !== false ? '✓ COMPATIBLE' : '⚡ PENDING'}
                    </div>
                    <div className="text-xs text-blue-300 mt-1">{language === 'es' ? 'Interop.' : 'Interop.'}</div>
                  </div>
                  <div className="bg-[#0a0a0a] border border-yellow-500/20 rounded p-2 text-center">
                    <div className="text-xs text-[#ffffff] mb-1">FATF AML/CFT</div>
                    <div className={`font-bold text-sm ${account.fatfAmlVerified !== false ? 'text-white' : 'text-yellow-400'}`}>
                      {account.fatfAmlVerified !== false ? '✓ VERIFIED' : '⚡ PENDING'}
                    </div>
                    <div className="text-xs text-yellow-300 mt-1">{language === 'es' ? 'Anti-Lavado' : 'Anti-Money Laundering'}</div>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-3 text-xs">
                  <div className="bg-[#0a0a0a] border border-[#1a1a1a] rounded p-2">
                    <div className="text-[#ffffff] mb-1">KYC Status:</div>
                    <div className={`font-semibold ${account.kycVerified !== false ? 'text-white' : 'text-red-400'}`}>
                      {account.kycVerified !== false ? '✓ VERIFIED' : '✗ NOT VERIFIED'}
                    </div>
                  </div>
                  <div className="bg-[#0a0a0a] border border-[#1a1a1a] rounded p-2">
                    <div className="text-[#ffffff] mb-1">AML Score:</div>
                    <div className={`font-mono font-bold ${
                      (account.amlScore || 85) >= 90 ? 'text-white' :
                      (account.amlScore || 85) >= 75 ? 'text-yellow-400' :
                      'text-red-400'
                    }`}>
                      {account.amlScore || 85}/100
                    </div>
                  </div>
                  <div className="bg-[#0a0a0a] border border-[#1a1a1a] rounded p-2">
                    <div className="text-[#ffffff] mb-1">Risk Level:</div>
                    <div className={`font-bold ${
                      (account.riskLevel || 'medium') === 'low' ? 'text-white' :
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

              {/* Reservas - Solo mostrar para cuentas blockchain */}
              {account.accountType === 'blockchain' && account.reservations.length > 0 && (
                <div className="bg-[#0a0a0a] border border-[#1a1a1a] rounded-lg p-4">
                  <h4 className="text-sm font-semibold text-[#ffffff] mb-3">
                    {language === 'es' ? `Reservas Blockchain (${account.reservations.length})` : `Blockchain Reserves (${account.reservations.length})`}
                  </h4>
                  <div className="space-y-2">
                    {account.reservations.map(reservation => (
                      <div key={reservation.id} className="bg-[#000] border border-[#1a1a1a] rounded p-3">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-mono text-[#ffffff]">{reservation.id}</span>
                          <span className={`px-2 py-1 rounded text-xs font-bold ${
                            reservation.status === 'confirmed' ? 'bg-white/20/20 text-black' :
                            reservation.status === 'reserved' ? 'bg-yellow-500/20 text-yellow-400' :
                            'bg-gray-500/20 text-gray-400'
                          }`}>
                            {reservation.status.toUpperCase()}
                          </span>
                        </div>
                        <div className="grid grid-cols-2 gap-2 text-xs">
                          <div>
                            <span className="text-[#ffffff]">Monto:</span> 
                            <span className="text-[#ffffff] ml-1">{account.currency} {reservation.amount.toLocaleString()}</span>
                          </div>
                          <div>
                            <span className="text-[#ffffff]">Tokens:</span> 
                            <span className="text-cyan-400 ml-1">{reservation.tokenAmount?.toLocaleString() || 0} {account.tokenSymbol}</span>
                          </div>
                          <div>
                            <span className="text-[#ffffff]">Blockchain:</span> 
                            <span className="text-[#ffffff] ml-1">{reservation.blockchain}</span>
                          </div>
                          <div className="col-span-2">
                            <span className="text-[#ffffff]">Contrato:</span> 
                            <code className="text-purple-400 ml-1 text-xs">{reservation.contractAddress?.substring(0, 20) || 'N/A'}...</code>
                          </div>
                        </div>
                        <div className="mt-2 flex gap-2">
                          {reservation.status === 'reserved' && (
                            <button
                              onClick={() => custodyStore.confirmReservation(account.id, reservation.id)}
                              className="px-3 py-1 bg-white/20/20 border border-white/30/40 text-black rounded text-xs hover:bg-white/20/30"
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

        {/* Acciones Rápidas */}
        <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Botón para Transferencia entre Cuentas */}
          <div className="bg-gradient-to-r from-purple-900/30 to-pink-900/30 border-2 border-purple-500/30 rounded-xl p-6 text-center">
            <div className="mb-4">
              <h3 className="text-lg font-bold text-purple-400 mb-2">
                {language === 'es' ? '🔄 Transferir entre Cuentas' : '🔄 Transfer Between Accounts'}
              </h3>
              <p className="text-sm text-[#999]">
                {language === 'es' 
                  ? 'Mueve fondos entre tus cuentas custodio creadas'
                  : 'Move funds between your custody accounts'}
              </p>
            </div>
            <button
              onClick={() => setShowTransferModal(true)}
              disabled={custodyAccounts.length < 2}
              className="px-8 py-4 bg-gradient-to-br from-purple-600 to-pink-600 text-white font-bold rounded-lg hover:shadow-[0_0_30px_rgba(168,85,247,0.6)] transition-all text-lg flex items-center gap-3 mx-auto disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Banknote className="w-6 h-6" />
              {language === 'es' ? 'Transferir Fondos' : 'Transfer Funds'}
            </button>
            {custodyAccounts.length < 2 && (
              <p className="text-xs text-yellow-500 mt-2">
                {language === 'es' ? '⚠️ Necesitas al menos 2 cuentas' : '⚠️ You need at least 2 accounts'}
              </p>
            )}
          </div>

          {/* Botón para Crear Más Cuentas */}
          <div className="bg-gradient-to-r from-[#0d0d0d] to-black border-2 border-[#ffffff]/30 rounded-xl p-6 text-center">
            <div className="mb-4">
              <h3 className="text-lg font-bold text-[#ffffff] mb-2">
                {language === 'es' ? '✨ Crear Nueva Cuenta Custodio' : '✨ Create New Custody Account'}
              </h3>
              <p className="text-sm text-[#999]">
                {language === 'es' 
                  ? 'Agrega más cuentas blockchain o bancarias'
                  : 'Add more blockchain or banking accounts'}
              </p>
            </div>
            <button
              onClick={() => setShowCreateModal(true)}
              className="px-8 py-4 bg-gradient-to-br from-[#ffffff] to-[#e0e0e0] text-black font-bold rounded-lg hover:shadow-[0_0_30px_rgba(255, 255, 255,0.8)] transition-all text-lg flex items-center gap-3 mx-auto"
            >
              <Plus className="w-6 h-6" />
              {language === 'es' ? 'Crear Otra Cuenta Custodio' : 'Create Another Custody Account'}
            </button>
            <div className="mt-3 text-xs text-[#999]">
              {language === 'es' 
                ? `Total de cuentas activas: ${custodyAccounts.length}` 
                : `Total active accounts: ${custodyAccounts.length}`}
            </div>
          </div>
        </div>
        </>
      ) : (
        <div className="bg-[#0d0d0d] border border-[#1a1a1a] rounded-xl p-12 text-center">
          <Shield className="w-16 h-16 text-[#ffffff] mx-auto mb-4" />
          <h3 className="text-xl text-[#ffffff] mb-2">
            {language === 'es' ? 'No hay cuentas custodio creadas' : 'No custody accounts created'}
          </h3>
          <p className="text-[#ffffff] text-sm mb-4">
            {language === 'es' 
              ? 'Crea una cuenta custodio para reservar fondos y prepararlos para tokenización blockchain'
              : 'Create a custody account to reserve funds and prepare them for blockchain tokenization'}
          </p>
          <button
            onClick={() => setShowCreateModal(true)}
            className="px-6 py-3 bg-gradient-to-br from-[#ffffff] to-[#e0e0e0] text-black font-bold rounded-lg hover:shadow-[0_0_20px_rgba(255, 255, 255,0.6)] transition-all"
          >
            <Plus className="w-5 h-5 inline mr-2" />
            {language === 'es' ? 'Crear Primera Cuenta Custodio' : 'Create First Custody Account'}
          </button>
        </div>
      )}

      {/* Modal de Creación */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
          <div className="bg-[#0d0d0d] border-2 border-[#ffffff] rounded-xl p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <h2 className="text-2xl font-bold text-[#ffffff] mb-6">
              {language === 'es' ? 'Crear Cuenta Custodio' : 'Create Custody Account'}
            </h2>
            
            <div className="space-y-4 mb-6">
              {/* Selector de Tipo */}
              <div>
                <label className="text-sm text-[#ffffff] mb-2 block">
                  {language === 'es' ? 'Tipo de Cuenta' : 'Account Type'}
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => setFormData({...formData, accountType: 'blockchain'})}
                    className={`p-4 rounded-lg border-2 transition-all ${
                      formData.accountType === 'blockchain'
                        ? 'border-cyan-500 bg-cyan-500/20 text-cyan-400'
                        : 'border-[#1a1a1a] bg-[#0a0a0a] text-[#ffffff] hover:border-cyan-500/30'
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
                        ? 'border-white/30 bg-white/20/20 text-black'
                        : 'border-[#1a1a1a] bg-[#0a0a0a] text-[#ffffff] hover:border-white/30/30'
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
              <div className="bg-gradient-to-r from-white/10/20 to-cyan-900/20 border border-white/30/30 rounded-lg p-4">
                <div className="text-sm font-semibold text-white mb-3">
                  {language === 'es' ? '🔐 Seguridad y Cumplimiento Incluidos' : '🔐 Security & Compliance Included'}
                </div>
                <div className="grid grid-cols-3 gap-2 text-xs">
                  <div className="flex items-center gap-1">
                    <CheckCircle className="w-3 h-3 text-white" />
                    <span className="text-white">ISO 27001</span>
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
                <label className="text-sm text-[#ffffff] mb-2 block">
                  {language === 'es' ? 'Nombre de la Cuenta' : 'Account Name'}
                </label>
                <input
                  type="text"
                  value={formData.accountName}
                  onChange={e => setFormData({...formData, accountName: e.target.value})}
                  className="w-full px-4 py-3 bg-[#0a0a0a] border border-[#1a1a1a] rounded-lg text-[#ffffff] focus:outline-none focus:border-[#ffffff]/50"
                  placeholder={formData.accountType === 'blockchain' 
                    ? (language === 'es' ? 'Ej: USD Stablecoin Reserve' : 'Ex: USD Stablecoin Reserve')
                    : (language === 'es' ? 'Ej: Cuenta Wire Transfer EUR' : 'Ex: EUR Wire Transfer Account')}
                />
              </div>

              {/* Indicador de fuente de fondos seleccionada */}
              <div className={`p-3 rounded-lg border ${
                fundSource === 'ledger1' 
                  ? 'bg-purple-500/10 border-purple-500/30' 
                  : 'bg-emerald-500/10 border-emerald-500/30'
              }`}>
                <div className="flex items-center gap-2">
                  <Database className={`w-4 h-4 ${fundSource === 'ledger1' ? 'text-purple-400' : 'text-emerald-400'}`} />
                  <span className={`text-sm font-bold ${fundSource === 'ledger1' ? 'text-purple-400' : 'text-emerald-400'}`}>
                    {fundSource === 'ledger1' ? 'Account Ledger1' : 'Account Ledger'}
                  </span>
                </div>
                <div className="text-xs text-[#999] mt-1">
                  {language === 'es' 
                    ? `Fondos de ${fundSource === 'ledger1' ? 'Treasury Reserve1' : 'Treasury Reserve'}`
                    : `Funds from ${fundSource === 'ledger1' ? 'Treasury Reserve1' : 'Treasury Reserve'}`}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm text-[#ffffff] mb-2 block">
                    {language === 'es' ? 'Moneda' : 'Currency'}
                  </label>
                  <select
                    value={formData.currency}
                    onChange={e => setFormData({...formData, currency: e.target.value})}
                    className="w-full px-4 py-3 bg-[#0a0a0a] border border-[#1a1a1a] rounded-lg text-[#ffffff] focus:outline-none focus:border-[#ffffff]/50"
                    aria-label="Seleccionar moneda"
                  >
                    {getAvailableBalances().map(bal => (
                      <option key={bal.currency} value={bal.currency}>
                        {bal.currency} ({IBAN_COUNTRIES[bal.currency]?.code || 'XX'}) - {language === 'es' ? 'Disponible' : 'Available'}: {bal.totalAmount.toLocaleString()}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-sm text-[#ffffff] mb-2 block">
                    {language === 'es' ? 'Monto a Transferir' : 'Amount to Transfer'}
                  </label>
                  <input
                    type="number"
                    value={formData.amount}
                    onChange={e => setFormData({...formData, amount: parseFloat(e.target.value) || 0})}
                    className="w-full px-4 py-3 bg-[#0a0a0a] border border-[#1a1a1a] rounded-lg text-[#ffffff] font-mono focus:outline-none focus:border-[#ffffff]/50"
                    placeholder="0.00"
                  />
                </div>
              </div>

              {/* Selector de Categoría de Cuenta */}
              <div className="bg-gradient-to-r from-purple-900/20 to-pink-900/20 border border-purple-500/30 rounded-lg p-4">
                <label className="text-sm text-purple-400 mb-3 block font-semibold flex items-center gap-2">
                  <Banknote className="w-4 h-4" />
                  {language === 'es' ? 'Categoría de Cuenta' : 'Account Category'}
                </label>
                <div className="grid grid-cols-5 gap-2">
                  {ACCOUNT_CATEGORIES.map(cat => (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => setFormData({...formData, accountCategory: cat.id as AccountCategory})}
                      className={`p-3 rounded-lg border-2 transition-all text-center ${
                        formData.accountCategory === cat.id
                          ? 'border-purple-500 bg-purple-500/20'
                          : 'border-[#1a1a1a] bg-[#0a0a0a] hover:border-purple-500/30'
                      }`}
                    >
                      <div className={`text-xs font-bold ${formData.accountCategory === cat.id ? 'text-purple-300' : 'text-[#999]'}`}>
                        {isSpanish ? cat.nameEs : cat.nameEn}
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Número de Cuenta con Formato Internacional */}
              <div className="bg-gradient-to-r from-yellow-900/20 to-orange-900/20 border border-yellow-500/30 rounded-lg p-4">
                <label className="text-sm text-yellow-400 mb-2 block flex items-center gap-2 font-semibold">
                  <FileText className="w-4 h-4" />
                  {language === 'es' ? 'Número de Cuenta Internacional' : 'International Account Number'}
                </label>
                
                {/* Botones para generar formatos */}
                <div className="grid grid-cols-3 gap-2 mb-3">
                  <button
                    type="button"
                    onClick={() => {
                      const iban = generateInternationalIBAN(formData.currency);
                      setFormData({...formData, customAccountNumber: iban});
                    }}
                    className="px-3 py-2 bg-blue-600/30 border border-blue-500/50 rounded-lg text-blue-400 text-xs font-bold hover:bg-blue-500/40 transition-all"
                  >
                    🏦 {language === 'es' ? 'Generar IBAN' : 'Generate IBAN'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const intl = generateInternationalAccountNumber(formData.currency, formData.accountCategory);
                      setFormData({...formData, customAccountNumber: intl});
                    }}
                    className="px-3 py-2 bg-emerald-600/30 border border-emerald-500/50 rounded-lg text-emerald-400 text-xs font-bold hover:bg-emerald-500/40 transition-all"
                  >
                    🌐 {language === 'es' ? 'ISO Estándar' : 'ISO Standard'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormData({...formData, customAccountNumber: ''})}
                    className="px-3 py-2 bg-gray-600/30 border border-gray-500/50 rounded-lg text-gray-400 text-xs font-bold hover:bg-gray-500/40 transition-all"
                  >
                    🔄 {language === 'es' ? 'Auto' : 'Auto'}
                  </button>
                </div>
                
                <input
                  type="text"
                  value={formData.customAccountNumber}
                  onChange={e => setFormData({...formData, customAccountNumber: e.target.value.toUpperCase()})}
                  className="w-full px-4 py-3 bg-[#0a0a0a] border border-yellow-500/30 rounded-lg text-[#ffffff] font-mono focus:outline-none focus:border-yellow-500 text-lg tracking-wider"
                  placeholder={language === 'es' ? 'Ej: DE89DAES0011234567890' : 'Ex: DE89DAES0011234567890'}
                />
                
                {/* Info del formato */}
                <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                  <div className="bg-[#0a0a0a] p-2 rounded border border-[#1a1a1a]">
                    <span className="text-[#666]">{language === 'es' ? 'País:' : 'Country:'}</span>
                    <span className="text-yellow-400 ml-1 font-bold">
                      {IBAN_COUNTRIES[formData.currency]?.code || 'XX'} - {IBAN_COUNTRIES[formData.currency]?.name || 'International'}
                    </span>
                  </div>
                  <div className="bg-[#0a0a0a] p-2 rounded border border-[#1a1a1a]">
                    <span className="text-[#666]">{language === 'es' ? 'Formato:' : 'Format:'}</span>
                    <span className="text-yellow-400 ml-1 font-bold">ISO 13616 IBAN</span>
                  </div>
                </div>
                
                <div className="text-xs text-[#666] mt-2">
                  💡 {language === 'es' 
                    ? 'Use los botones para generar o ingrese su propio número de cuenta.' 
                    : 'Use buttons to generate or enter your own account number.'}
                </div>
              </div>

              {/* Selector de Denominación de Fondos (M1/M2) */}
              <div className="bg-gradient-to-r from-emerald-900/20 to-teal-900/20 border border-emerald-500/30 rounded-lg p-4">
                <label className="text-sm text-emerald-400 mb-3 block font-semibold flex items-center gap-2">
                  <TrendingUp className="w-4 h-4" />
                  {language === 'es' ? 'Denominación de Fondos (Agregado Monetario)' : 'Fund Denomination (Monetary Aggregate)'}
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setFormData({...formData, fundDenomination: 'M1'})}
                    className={`p-4 rounded-lg border-2 transition-all text-left ${
                      formData.fundDenomination === 'M1'
                        ? 'border-emerald-500 bg-emerald-500/20'
                        : 'border-[#1a1a1a] bg-[#0a0a0a] hover:border-emerald-500/30'
                    }`}
                  >
                    <div className="flex items-center gap-3 mb-2">
                      <div className={`p-2 rounded-lg ${formData.fundDenomination === 'M1' ? 'bg-emerald-500/30' : 'bg-[#1a1a1a]'}`}>
                        <DollarSign className={`w-5 h-5 ${formData.fundDenomination === 'M1' ? 'text-emerald-400' : 'text-[#666]'}`} />
                      </div>
                      <span className={`font-bold text-lg ${formData.fundDenomination === 'M1' ? 'text-emerald-400' : 'text-[#ffffff]'}`}>M1</span>
                    </div>
                    <div className={`text-sm ${formData.fundDenomination === 'M1' ? 'text-emerald-300' : 'text-[#888]'}`}>
                      {language === 'es' ? 'Efectivo Líquido' : 'Liquid Cash'}
                    </div>
                    <div className={`text-xs mt-1 ${formData.fundDenomination === 'M1' ? 'text-emerald-400/70' : 'text-[#666]'}`}>
                      {language === 'es' 
                        ? 'Billetes, monedas, depósitos a la vista' 
                        : 'Currency, coins, demand deposits'}
                    </div>
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormData({...formData, fundDenomination: 'M2'})}
                    className={`p-4 rounded-lg border-2 transition-all text-left ${
                      formData.fundDenomination === 'M2'
                        ? 'border-blue-500 bg-blue-500/20'
                        : 'border-[#1a1a1a] bg-[#0a0a0a] hover:border-blue-500/30'
                    }`}
                  >
                    <div className="flex items-center gap-3 mb-2">
                      <div className={`p-2 rounded-lg ${formData.fundDenomination === 'M2' ? 'bg-blue-500/30' : 'bg-[#1a1a1a]'}`}>
                        <Building2 className={`w-5 h-5 ${formData.fundDenomination === 'M2' ? 'text-blue-400' : 'text-[#666]'}`} />
                      </div>
                      <span className={`font-bold text-lg ${formData.fundDenomination === 'M2' ? 'text-blue-400' : 'text-[#ffffff]'}`}>M2</span>
                    </div>
                    <div className={`text-sm ${formData.fundDenomination === 'M2' ? 'text-blue-300' : 'text-[#888]'}`}>
                      {language === 'es' ? 'Cuasi-Dinero' : 'Near Money'}
                    </div>
                    <div className={`text-xs mt-1 ${formData.fundDenomination === 'M2' ? 'text-blue-400/70' : 'text-[#666]'}`}>
                      {language === 'es' 
                        ? 'M1 + depósitos de ahorro, mercado monetario' 
                        : 'M1 + savings, money market deposits'}
                    </div>
                  </button>
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
                    <label className="text-sm text-[#ffffff] mb-2 block">
                      {language === 'es' ? 'Red Blockchain *' : 'Blockchain Network *'}
                    </label>
                    <select
                      value={formData.blockchain}
                      onChange={e => setFormData({...formData, blockchain: e.target.value})}
                      className="w-full px-4 py-3 bg-[#0a0a0a] border border-cyan-500/50 rounded-lg text-[#ffffff] focus:outline-none focus:border-cyan-500"
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
                    <label className="text-sm text-[#ffffff] mb-2 block">
                      {language === 'es' ? 'Símbolo del Token *' : 'Token Symbol *'}
                    </label>
                    <input
                      type="text"
                      value={formData.tokenSymbol}
                      onChange={e => setFormData({...formData, tokenSymbol: e.target.value})}
                      className="w-full px-4 py-3 bg-[#0a0a0a] border border-cyan-500/50 rounded-lg text-[#ffffff] font-mono focus:outline-none focus:border-cyan-500"
                      placeholder={language === 'es' ? `Ej: ${formData.currency}T, USDT, EURT` : `Ex: ${formData.currency}T, USDT, EURT`}
                    />
                    <div className="text-xs text-cyan-300 mt-1">
                      {language === 'es' 
                        ? `Símbolo del token que representará ${formData.currency} en blockchain` 
                        : `Token symbol that will represent ${formData.currency} on blockchain`}
                    </div>
                  </div>

                  <div>
                    <label className="text-sm text-[#ffffff] mb-2 block">
                      {language === 'es' ? 'Dirección del Contrato (Opcional)' : 'Contract Address (Optional)'}
                    </label>
                    <input
                      type="text"
                      value={formData.contractAddress}
                      onChange={e => setFormData({...formData, contractAddress: e.target.value})}
                      className="w-full px-4 py-3 bg-[#0a0a0a] border border-cyan-500/50 rounded-lg text-[#ffffff] font-mono focus:outline-none focus:border-cyan-500"
                      placeholder={language === 'es' ? 'Ej: 0x1234567890abcdef1234567890abcdef12345678' : 'Ex: 0x1234567890abcdef1234567890abcdef12345678'}
                    />
                    <div className="text-xs text-cyan-300 mt-1">
                      {language === 'es' 
                        ? '💡 Ingresa la dirección del contrato inteligente manualmente o déjalo vacío' 
                        : '💡 Enter the smart contract address manually or leave it empty'}
                    </div>
                  </div>
                </div>
              )}

              {/* CAMPOS ESPECÍFICOS PARA BANKING */}
              {formData.accountType === 'banking' && (
                <div className="bg-gradient-to-r from-white/10/20 to-emerald-900/20 border-2 border-white/30/40 rounded-lg p-4 space-y-4">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="text-xl">🏦</div>
                    <h4 className="text-sm font-bold text-white">
                      {language === 'es' ? 'CONFIGURACIÓN BANCARIA (Auto-generado)' : 'BANKING CONFIGURATION (Auto-generated)'}
                    </h4>
                  </div>

                  <div>
                    <label className="text-sm text-[#ffffff] mb-2 block">
                      {language === 'es' ? 'Nombre del Banco (opcional)' : 'Bank Name (optional)'}
                    </label>
                    <input
                      type="text"
                      value={formData.bankName}
                      onChange={e => setFormData({...formData, bankName: e.target.value})}
                      className="w-full px-4 py-3 bg-[#0a0a0a] border border-white/30/50 rounded-lg text-[#ffffff] focus:outline-none focus:border-white/30"
                      placeholder="DAES - Data and Exchange Settlement"
                    />
                  </div>

                  <div className="bg-white/10/20 border border-white/30/30 rounded p-3 space-y-1">
                    <div className="text-xs text-black font-semibold">
                      ℹ️ {language === 'es' ? 'Se generarán automáticamente:' : 'Will be auto-generated:'}
                    </div>
                    <div className="text-xs text-white/80">
                      • {language === 'es' ? 'Número de Cuenta' : 'Account Number'}: DAES-BK-{formData.currency}-XXXXXXX
                    </div>
                    <div className="text-xs text-white/80">
                      • IBAN: {language === 'es' ? 'Estándar ISO 13616' : 'ISO 13616 Standard'}
                    </div>
                    <div className="text-xs text-white/80">
                      • SWIFT/BIC: DAES{formData.currency.substring(0,2)}XXX
                    </div>
                    <div className="text-xs text-white/80">
                      • Routing Number: 021XXXXXX
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setShowCreateModal(false)}
                className="px-6 py-2 bg-[#1a1a1a] border border-[#2a2a2a] text-[#ffffff] rounded-lg hover:bg-[#252525]"
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
                    : 'from-white/20 to-emerald-500 hover:shadow-[0_0_20px_rgba(0,255,0,0.6)]'
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
              : 'border-white/30'
          }`}>
            <h2 className={`text-2xl font-bold mb-6 ${
              (selectedAccount.accountType || 'blockchain') === 'blockchain'
                ? 'text-yellow-400'
                : 'text-white'
            }`}>
              {(selectedAccount.accountType || 'blockchain') === 'blockchain'
                ? (language === 'es' ? '🌐 Reservar Fondos para Tokenización' : '🌐 Reserve Funds for Tokenization')
                : (language === 'es' ? '🏦 Reservar Fondos para Transferencia Bancaria' : '🏦 Reserve Funds for Banking Transfer')}
            </h2>
            
            <div className="bg-[#0a0a0a] border border-yellow-500/20 rounded-lg p-4 mb-6">
              <div className="text-sm text-[#ffffff] mb-1">
                {language === 'es' ? 'Cuenta Seleccionada:' : 'Selected Account:'}
              </div>
              <div className="text-lg font-bold text-[#ffffff]">{selectedAccount.accountName}</div>
              <div className="text-sm text-white mt-1">
                {language === 'es' ? 'Disponible:' : 'Available:'} {selectedAccount.currency} {selectedAccount.availableBalance.toLocaleString()}
              </div>
            </div>

            <div className="space-y-4 mb-6">
              <div>
                <label className="text-sm text-[#ffffff] mb-2 block">
                  {language === 'es' ? 'Monto a Reservar' : 'Amount to Reserve'}
                </label>
                <input
                  type="number"
                  value={reserveData.amount}
                  onChange={e => setReserveData({...reserveData, amount: parseFloat(e.target.value) || 0})}
                  className="w-full px-4 py-3 bg-[#0a0a0a] border border-[#1a1a1a] rounded-lg text-[#ffffff] font-mono text-lg focus:outline-none focus:border-yellow-500/50"
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
                    <label className="text-sm text-[#ffffff] mb-2 block">
                      {language === 'es' ? 'Blockchain Destino' : 'Destination Blockchain'}
                    </label>
                    <select
                      value={reserveData.blockchain}
                      onChange={e => setReserveData({...reserveData, blockchain: e.target.value})}
                      className="w-full px-4 py-3 bg-[#0a0a0a] border border-cyan-500/50 rounded-lg text-[#ffffff] focus:outline-none focus:border-cyan-500"
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
                    <label className="text-sm text-[#ffffff] mb-2 block">
                      {language === 'es' ? 'Dirección del Contrato Blockchain *' : 'Blockchain Contract Address *'}
                    </label>
                    <input
                      type="text"
                      value={reserveData.contractAddress}
                      onChange={e => setReserveData({...reserveData, contractAddress: e.target.value})}
                      className="w-full px-4 py-3 bg-[#0a0a0a] border border-cyan-500/50 rounded-lg text-[#ffffff] font-mono text-sm focus:outline-none focus:border-cyan-500"
                      placeholder="0x..."
                    />
                  </div>

                  <div>
                    <label className="text-sm text-[#ffffff] mb-2 block">
                      {language === 'es' ? 'Cantidad de Tokens a Emitir' : 'Token Amount to Mint'}
                    </label>
                    <input
                      type="number"
                      value={reserveData.tokenAmount}
                      onChange={e => setReserveData({...reserveData, tokenAmount: parseFloat(e.target.value) || 0})}
                      className="w-full px-4 py-3 bg-[#0a0a0a] border border-cyan-500/50 rounded-lg text-[#ffffff] font-mono text-lg focus:outline-none focus:border-cyan-500"
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
                    <label className="text-sm text-[#ffffff] mb-2 block">
                      {language === 'es' ? 'Referencia de Transferencia (opcional)' : 'Transfer Reference (optional)'}
                    </label>
                    <input
                      type="text"
                      value={reserveData.transferReference}
                      onChange={e => setReserveData({...reserveData, transferReference: e.target.value})}
                      className="w-full px-4 py-3 bg-[#0a0a0a] border border-white/30/50 rounded-lg text-[#ffffff] focus:outline-none focus:border-white/30"
                      placeholder={language === 'es' ? 'Ej: WIRE-2024-001, Pago servicios, etc.' : 'Ex: WIRE-2024-001, Payment for services, etc.'}
                    />
                  </div>

                  <div className="bg-gradient-to-r from-white/10/20 to-cyan-900/20 border border-white/30/40 rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <CheckCircle className="w-5 h-5 text-white" />
                      <div className="text-sm font-semibold text-white">
                        {language === 'es' ? 'Aprobación Automática' : 'Automatic Approval'}
                      </div>
                    </div>
                    <div className="text-xs text-white/80 space-y-1">
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
              <div className="bg-gradient-to-r from-white/10/20 to-cyan-900/20 border border-white/30/50 rounded-lg p-4 mb-6">
                <div className="flex items-start gap-3">
                  <CheckCircle className="w-5 h-5 text-white flex-shrink-0 mt-0.5" />
                  <div className="text-xs text-white/80">
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
                className="px-6 py-2 bg-[#1a1a1a] border border-[#2a2a2a] text-[#ffffff] rounded-lg hover:bg-[#252525]"
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
                    : 'from-white/20 to-emerald-500 hover:shadow-[0_0_20px_rgba(0,255,0,0.6)]'
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
          <div className="bg-black border-2 border-[#ffffff] rounded-xl p-6 max-w-4xl w-full max-h-[90vh] overflow-y-auto shadow-[0_0_50px_rgba(255, 255, 255,0.5)]">
            {/* Header */}
            <div className="flex items-center justify-between mb-6 border-b border-[#ffffff]/30 pb-4">
              <div>
                <h2 className="text-2xl font-bold text-[#ffffff] flex items-center gap-3">
                  {(selectedAccount.accountType || 'blockchain') === 'blockchain' ? '🌐' : '🏦'}
                  {language === 'es' ? 'Detalles de Cuenta Custodio' : 'Custody Account Details'}
                </h2>
                <p className="text-[#ffffff] mt-1">{selectedAccount.accountName}</p>
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
            <div className="space-y-6 text-[#ffffff]">
              
              {/* Tipo y Estado */}
              <div className="flex gap-3">
                <span className={`px-4 py-2 rounded-lg border-2 font-bold ${
                  (selectedAccount.accountType || 'blockchain') === 'blockchain' 
                    ? 'border-cyan-500 bg-cyan-500/20 text-cyan-400' 
                    : 'border-white/30 bg-white/20/20 text-black'
                }`}>
                  {(selectedAccount.accountType || 'blockchain') === 'blockchain' 
                    ? (language === 'es' ? '🌐 BLOCKCHAIN CUSTODY' : '🌐 BLOCKCHAIN CUSTODY')
                    : (language === 'es' ? '🏦 CUENTA BANCARIA' : '🏦 BANKING ACCOUNT')}
                </span>
                <span className={`px-4 py-2 rounded-lg border-2 font-bold ${
                  selectedAccount.apiStatus === 'active' ? 'border-white/30 bg-white/20/20 text-black' :
                  selectedAccount.apiStatus === 'pending' ? 'border-yellow-500 bg-yellow-500/20 text-yellow-400' :
                  'border-red-500 bg-red-500/20 text-red-400'
                }`}>
                  {(selectedAccount.apiStatus || 'pending').toUpperCase()}
                </span>
              </div>

              {/* Identificación */}
              <div className="bg-[#0d0d0d] border border-[#1a1a1a] rounded-lg p-6">
                <h3 className="text-lg font-bold text-[#ffffff] mb-4">
                  {language === 'es' ? '📋 Identificación' : '📋 Identification'}
                </h3>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <div className="text-[#ffffff] mb-1">{language === 'es' ? 'ID:' : 'ID:'}</div>
                    <div className="text-[#ffffff] font-mono">{selectedAccount.id}</div>
                  </div>
                  <div>
                    <div className="text-[#ffffff] mb-1">{language === 'es' ? 'Número de Cuenta:' : 'Account Number:'}</div>
                    <div className="text-[#ffffff] font-mono font-bold text-lg">
                      {selectedAccount.accountNumber || 'N/A'}
                    </div>
                  </div>
                  <div>
                    <div className="text-[#ffffff] mb-1">{language === 'es' ? 'Nombre:' : 'Name:'}</div>
                    <div className="text-[#ffffff]">{selectedAccount.accountName}</div>
                  </div>
                  <div>
                    <div className="text-[#ffffff] mb-1">{language === 'es' ? 'Moneda:' : 'Currency:'}</div>
                    <div className="text-[#ffffff] font-bold">{selectedAccount.currency}</div>
                  </div>
                </div>
              </div>

              {/* Balances */}
              <div className="bg-[#0d0d0d] border border-[#1a1a1a] rounded-lg p-6">
                <h3 className="text-lg font-bold text-[#ffffff] mb-4">
                  {language === 'es' ? '💰 Balances' : '💰 Balances'}
                </h3>
                <div className="grid grid-cols-3 gap-4">
                  <div className="bg-[#0a0a0a] border border-cyan-500/30 rounded-lg p-4 text-center">
                    <div className="text-xs text-[#ffffff] mb-1">{language === 'es' ? 'Total' : 'Total'}</div>
                    <div className="text-2xl font-bold text-cyan-400 font-mono">
                      {selectedAccount.currency} {selectedAccount.totalBalance.toLocaleString()}
                    </div>
                  </div>
                  <div className="bg-[#0a0a0a] border border-yellow-500/30 rounded-lg p-4 text-center">
                    <div className="text-xs text-[#ffffff] mb-1">{language === 'es' ? 'Reservado' : 'Reserved'}</div>
                    <div className="text-2xl font-bold text-yellow-400 font-mono">
                      {selectedAccount.currency} {selectedAccount.reservedBalance.toLocaleString()}
                    </div>
                  </div>
                  <div className="bg-[#0a0a0a] border border-white/30/30 rounded-lg p-4 text-center">
                    <div className="text-xs text-[#ffffff] mb-1">{language === 'es' ? 'Disponible' : 'Available'}</div>
                    <div className="text-2xl font-bold text-white font-mono">
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
                      <div className="text-[#ffffff] mb-1">{language === 'es' ? 'Blockchain:' : 'Blockchain:'}</div>
                      <div className="text-[#ffffff] font-bold">{selectedAccount.blockchainLink}</div>
                    </div>
                    <div>
                      <div className="text-[#ffffff] mb-1">{language === 'es' ? 'Token Symbol:' : 'Token Symbol:'}</div>
                      <div className="text-[#ffffff] font-mono font-bold">{selectedAccount.tokenSymbol}</div>
                    </div>
                    <div className="col-span-2">
                      <div className="text-[#ffffff] mb-1">{language === 'es' ? 'Dirección del Contrato:' : 'Contract Address:'}</div>
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
                <div className="bg-gradient-to-r from-white/10/20 to-emerald-900/20 border border-white/30/40 rounded-lg p-6">
                  <h3 className="text-lg font-bold text-white mb-4">
                    {language === 'es' ? '🏦 Cuenta Bancaria - Configuración API' : '🏦 Banking Account - API Configuration'}
                  </h3>
                  <div className="space-y-4 text-sm">
                    <div>
                      <div className="text-[#ffffff] mb-1">{language === 'es' ? 'Banco:' : 'Bank:'}</div>
                      <div className="text-[#ffffff] font-semibold">{selectedAccount.bankName}</div>
                    </div>
                    <div className="bg-white/10/20 border border-white/30/30 rounded-lg p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <CheckCircle className="w-5 h-5 text-white" />
                        <div className="text-sm font-semibold text-white">
                          {language === 'es' ? 'Configuración para Conexión API' : 'API Connection Configuration'}
                        </div>
                      </div>
                      <div className="text-xs text-white/80 space-y-1">
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
                <h3 className="text-lg font-bold text-[#ffffff] mb-4">
                  {language === 'es' ? '🔗 API de Verificación' : '🔗 Verification API'}
                </h3>
                <div className="space-y-3">
                  <div>
                    <div className="text-[#ffffff] mb-1 text-xs">{language === 'es' ? 'Endpoint:' : 'Endpoint:'}</div>
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
                      <div className="text-[#ffffff] mb-1 text-xs">API Key:</div>
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
              <div className="bg-gradient-to-r from-white/10/20 to-cyan-900/20 border border-white/30/40 rounded-lg p-6">
                <h3 className="text-lg font-bold text-white mb-4">
                  {language === 'es' ? '🥇 Cumplimiento de Estándares' : '🥇 Standards Compliance'}
                </h3>
                <div className="grid grid-cols-3 gap-4 mb-4">
                  <div className="bg-[#0a0a0a] border border-cyan-500/30 rounded-lg p-4 text-center">
                    <div className="text-2xl mb-2">🔒</div>
                    <div className="text-sm text-[#ffffff] mb-1">ISO 27001:2022</div>
                    <div className="font-bold text-white">
                      {selectedAccount.iso27001Compliant !== false ? '✓ COMPLIANT' : '⚡ PENDING'}
                    </div>
                    <div className="text-xs text-cyan-300 mt-1">
                      {language === 'es' ? 'Seguridad total del sistema DAES' : 'Total DAES system security'}
                    </div>
                  </div>
                  <div className="bg-[#0a0a0a] border border-blue-500/30 rounded-lg p-4 text-center">
                    <div className="text-2xl mb-2">🏦</div>
                    <div className="text-sm text-[#ffffff] mb-1">ISO 20022</div>
                    <div className="font-bold text-white">
                      {selectedAccount.iso20022Compatible !== false ? '✓ COMPATIBLE' : '⚡ PENDING'}
                    </div>
                    <div className="text-xs text-blue-300 mt-1">
                      {language === 'es' ? 'Interoperabilidad con bancos centrales' : 'Central bank interoperability'}
                    </div>
                  </div>
                  <div className="bg-[#0a0a0a] border border-yellow-500/30 rounded-lg p-4 text-center">
                    <div className="text-2xl mb-2">⚖️</div>
                    <div className="text-sm text-[#ffffff] mb-1">FATF AML/CFT</div>
                    <div className="font-bold text-white">
                      {selectedAccount.fatfAmlVerified !== false ? '✓ VERIFIED' : '⚡ PENDING'}
                    </div>
                    <div className="text-xs text-yellow-300 mt-1">
                      {language === 'es' ? 'Legalidad y trazabilidad global' : 'Global legality & traceability'}
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div className="bg-[#0a0a0a] border border-[#1a1a1a] rounded-lg p-3 text-center">
                    <div className="text-[#ffffff] mb-1">KYC</div>
                    <div className={`font-bold ${selectedAccount.kycVerified !== false ? 'text-white' : 'text-red-400'}`}>
                      {selectedAccount.kycVerified !== false ? '✓ VERIFIED' : '✗ NOT VERIFIED'}
                    </div>
                  </div>
                  <div className="bg-[#0a0a0a] border border-[#1a1a1a] rounded-lg p-3 text-center">
                    <div className="text-[#ffffff] mb-1">AML Score</div>
                    <div className={`font-mono font-bold text-lg ${
                      (selectedAccount.amlScore || 85) >= 90 ? 'text-white' :
                      (selectedAccount.amlScore || 85) >= 75 ? 'text-yellow-400' :
                      'text-red-400'
                    }`}>
                      {selectedAccount.amlScore || 85}/100
                    </div>
                  </div>
                  <div className="bg-[#0a0a0a] border border-[#1a1a1a] rounded-lg p-3 text-center">
                    <div className="text-[#ffffff] mb-1">Risk Level</div>
                    <div className={`font-bold ${
                      (selectedAccount.riskLevel || 'medium') === 'low' ? 'text-white' :
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
                    <div className="text-[#ffffff] mb-2 text-xs">
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
                    <div className="text-[#ffffff] mb-2 text-xs">
                      {language === 'es' ? 'Datos Encriptados (AES-256):' : 'Encrypted Data (AES-256):'}
                    </div>
                    <code className="text-white font-mono text-xs bg-[#000] border border-white/30/20 rounded px-3 py-2 block break-all">
                      {selectedAccount.encryptedData.substring(0, 100)}...
                    </code>
                  </div>
                </div>
              </div>

              {/* Timestamps */}
              <div className="bg-[#0d0d0d] border border-[#1a1a1a] rounded-lg p-6">
                <h3 className="text-lg font-bold text-[#ffffff] mb-4">
                  {language === 'es' ? '🕐 Fechas y Auditoría' : '🕐 Dates & Audit'}
                </h3>
                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div>
                    <div className="text-[#ffffff] mb-1">{language === 'es' ? 'Creado:' : 'Created:'}</div>
                    <div className="text-[#ffffff]">{new Date(selectedAccount.createdAt).toLocaleString(language === 'es' ? 'es-ES' : 'en-US')}</div>
                  </div>
                  <div>
                    <div className="text-[#ffffff] mb-1">{language === 'es' ? 'Última Actualización:' : 'Last Updated:'}</div>
                    <div className="text-[#ffffff]">{new Date(selectedAccount.lastUpdated).toLocaleString(language === 'es' ? 'es-ES' : 'en-US')}</div>
                  </div>
                  <div>
                    <div className="text-[#ffffff] mb-1">{language === 'es' ? 'Última Auditoría:' : 'Last Audit:'}</div>
                    <div className="text-[#ffffff]">{new Date(selectedAccount.lastAudit || selectedAccount.lastUpdated).toLocaleString(language === 'es' ? 'es-ES' : 'en-US')}</div>
                  </div>
                </div>
              </div>

              {/* Reservas - Solo mostrar para cuentas blockchain */}
              {selectedAccount.accountType === 'blockchain' && selectedAccount.reservations && selectedAccount.reservations.length > 0 && (
                <div className="bg-[#0d0d0d] border border-[#1a1a1a] rounded-lg p-6">
                  <h3 className="text-lg font-bold text-[#ffffff] mb-4">
                    {language === 'es' ? `📜 Reservas Blockchain (${selectedAccount.reservations.length})` : `📜 Blockchain Reserves (${selectedAccount.reservations.length})`}
                  </h3>
                  <div className="space-y-3">
                    {selectedAccount.reservations.map(r => (
                      <div key={r.id} className="bg-[#0a0a0a] border border-[#1a1a1a] rounded-lg p-4">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-mono text-[#ffffff]">{r.id}</span>
                          <span className={`px-2 py-1 rounded text-xs font-bold ${
                            r.status === 'confirmed' ? 'bg-white/20/20 text-black' :
                            r.status === 'reserved' ? 'bg-yellow-500/20 text-yellow-400' :
                            r.status === 'completed' ? 'bg-blue-500/20 text-blue-400' :
                            'bg-gray-500/20 text-gray-400'
                          }`}>
                            {r.status.toUpperCase()}
                          </span>
                        </div>
                        <div className="grid grid-cols-2 gap-2 text-xs">
                          <div>
                            <span className="text-[#ffffff]">{language === 'es' ? 'Monto:' : 'Amount:'}</span>
                            <span className="text-[#ffffff] ml-1">{selectedAccount.currency} {r.amount.toLocaleString()}</span>
                          </div>
                          {r.tokenAmount && (
                            <div>
                              <span className="text-[#ffffff]">{language === 'es' ? 'Tokens:' : 'Tokens:'}</span>
                              <span className="text-cyan-400 ml-1">{r.tokenAmount.toLocaleString()} {selectedAccount.tokenSymbol}</span>
                            </div>
                          )}
                          {r.blockchain && (
                            <div>
                              <span className="text-[#ffffff]">Blockchain:</span>
                              <span className="text-[#ffffff] ml-1">{r.blockchain}</span>
                            </div>
                          )}
                          {r.contractAddress && (
                            <div className="col-span-2">
                              <span className="text-[#ffffff]">{language === 'es' ? 'Contrato:' : 'Contract:'}</span>
                              <span className="text-cyan-400 ml-1 font-mono text-[10px]">{r.contractAddress.substring(0, 10)}...</span>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Botones de Acción */}
              <div className="grid grid-cols-2 gap-3 pt-4 border-t border-[#ffffff]/30">
                <button
                  onClick={() => {
                    setShowDetailsModal(false);
                    setShowBlackScreen(true);
                  }}
                  className="px-6 py-3 bg-black border-2 border-[#ffffff] text-[#ffffff] font-bold rounded-lg hover:shadow-[0_0_25px_rgba(255, 255, 255,0.8)] transition-all"
                >
                  <CheckCircle className="w-5 h-5 inline mr-2" />
                  {language === 'es' ? '🖤 Generar Black Screen' : '🖤 Generate Black Screen'}
                </button>
                <button
                  onClick={() => exportAccountStatement(selectedAccount)}
                  className="px-6 py-3 bg-gradient-to-br from-[#ffffff] to-[#e0e0e0] text-black font-bold rounded-lg hover:shadow-[0_0_20px_rgba(255, 255, 255,0.6)] transition-all"
                >
                  <Download className="w-5 h-5 inline mr-2" />
                  {language === 'es' ? '📄 Estado de Cuenta' : '📄 Account Statement'}
                </button>
                <button
                  onClick={() => {
                    setShowDetailsModal(false);
                    setShowReserveModal(true);
                  }}
                  className="px-6 py-2 bg-[#1a1a1a] border border-[#ffffff]/30 text-[#ffffff] rounded-lg hover:bg-[#252525]"
                >
                  <Lock className="w-4 h-4 inline mr-2" />
                  {language === 'es' ? 'Reservar Fondos' : 'Reserve Funds'}
                </button>
                <button
                  onClick={() => setShowDetailsModal(false)}
                  className="px-6 py-2 bg-[#1a1a1a] border border-[#2a2a2a] text-[#ffffff] rounded-lg hover:bg-[#252525]"
                >
                  {language === 'es' ? 'Cerrar' : 'Close'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Agregar Fondos */}
      {showAddFundsModal && selectedAccount && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="bg-gradient-to-br from-[#0a0a0a] to-[#1a1a1a] border-2 border-emerald-500/50 rounded-2xl p-6 max-w-lg w-full shadow-[0_0_50px_rgba(16,185,129,0.3)]">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold text-emerald-400 flex items-center gap-2">
                <PlusCircle className="w-6 h-6" />
                {isSpanish ? 'Agregar Fondos' : 'Add Funds'}
              </h3>
              <button
                onClick={() => setShowAddFundsModal(false)}
                className="text-[#ffffff] hover:text-red-400 transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="bg-[#0d0d0d] border border-emerald-500/30 rounded-lg p-4 mb-4">
              <div className="text-sm text-[#999] mb-1">{isSpanish ? 'Cuenta destino:' : 'Destination account:'}</div>
              <div className="text-lg font-bold text-[#ffffff]">{selectedAccount.accountName}</div>
              <div className="text-sm text-emerald-400 font-mono">{selectedAccount.accountNumber || selectedAccount.id}</div>
              <div className="text-sm text-[#666] mt-2">
                {isSpanish ? 'Balance actual:' : 'Current balance:'} {selectedAccount.currency} {selectedAccount.totalBalance.toLocaleString()}
              </div>
            </div>

            <div className="space-y-4">
              {/* Tipo de transacción */}
              <div>
                <label className="text-sm text-[#ffffff] mb-2 block">
                  {isSpanish ? 'Tipo de Transacción' : 'Transaction Type'}
                </label>
                <select
                  value={addFundsData.type}
                  onChange={e => setAddFundsData({...addFundsData, type: e.target.value as 'deposit' | 'transfer_in' | 'adjustment'})}
                  className="w-full px-4 py-3 bg-[#0a0a0a] border border-[#1a1a1a] rounded-lg text-[#ffffff] focus:outline-none focus:border-emerald-500"
                >
                  <option value="deposit">{isSpanish ? 'Depósito' : 'Deposit'}</option>
                  <option value="transfer_in">{isSpanish ? 'Transferencia Entrante' : 'Incoming Transfer'}</option>
                  <option value="adjustment">{isSpanish ? 'Ajuste Contable' : 'Accounting Adjustment'}</option>
                </select>
              </div>

              {/* Monto */}
              <div>
                <label className="text-sm text-[#ffffff] mb-2 block">
                  {isSpanish ? 'Monto' : 'Amount'} ({selectedAccount.currency})
                </label>
                <input
                  type="number"
                  value={addFundsData.amount || ''}
                  onChange={e => setAddFundsData({...addFundsData, amount: parseFloat(e.target.value) || 0})}
                  className="w-full px-4 py-3 bg-[#0a0a0a] border border-[#1a1a1a] rounded-lg text-[#ffffff] font-mono text-xl focus:outline-none focus:border-emerald-500"
                  placeholder="0.00"
                />
              </div>

              {/* Fecha y Hora */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm text-[#ffffff] mb-2 block flex items-center gap-1">
                    <Calendar className="w-4 h-4 text-emerald-400" />
                    {isSpanish ? 'Fecha' : 'Date'}
                  </label>
                  <input
                    type="date"
                    value={addFundsData.transactionDate}
                    onChange={e => setAddFundsData({...addFundsData, transactionDate: e.target.value})}
                    className="w-full px-4 py-3 bg-[#0a0a0a] border border-[#1a1a1a] rounded-lg text-[#ffffff] focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="text-sm text-[#ffffff] mb-2 block flex items-center gap-1">
                    <Clock className="w-4 h-4 text-emerald-400" />
                    {isSpanish ? 'Hora' : 'Time'}
                  </label>
                  <input
                    type="time"
                    value={addFundsData.transactionTime}
                    onChange={e => setAddFundsData({...addFundsData, transactionTime: e.target.value})}
                    className="w-full px-4 py-3 bg-[#0a0a0a] border border-[#1a1a1a] rounded-lg text-[#ffffff] focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              {/* Cuenta origen y banco */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm text-[#ffffff] mb-2 block">
                    {isSpanish ? 'Cuenta Origen' : 'Source Account'}
                  </label>
                  <input
                    type="text"
                    value={addFundsData.sourceAccount}
                    onChange={e => setAddFundsData({...addFundsData, sourceAccount: e.target.value})}
                    className="w-full px-4 py-3 bg-[#0a0a0a] border border-[#1a1a1a] rounded-lg text-[#ffffff] focus:outline-none focus:border-emerald-500"
                    placeholder={isSpanish ? 'Número de cuenta' : 'Account number'}
                  />
                </div>
                <div>
                  <label className="text-sm text-[#ffffff] mb-2 block">
                    {isSpanish ? 'Banco Origen' : 'Source Bank'}
                  </label>
                  <input
                    type="text"
                    value={addFundsData.sourceBank}
                    onChange={e => setAddFundsData({...addFundsData, sourceBank: e.target.value})}
                    className="w-full px-4 py-3 bg-[#0a0a0a] border border-[#1a1a1a] rounded-lg text-[#ffffff] focus:outline-none focus:border-emerald-500"
                    placeholder={isSpanish ? 'Nombre del banco' : 'Bank name'}
                  />
                </div>
              </div>

              {/* Descripción */}
              <div>
                <label className="text-sm text-[#ffffff] mb-2 block">
                  {isSpanish ? 'Descripción' : 'Description'}
                </label>
                <input
                  type="text"
                  value={addFundsData.description}
                  onChange={e => setAddFundsData({...addFundsData, description: e.target.value})}
                  className="w-full px-4 py-3 bg-[#0a0a0a] border border-[#1a1a1a] rounded-lg text-[#ffffff] focus:outline-none focus:border-emerald-500"
                  placeholder={isSpanish ? 'Concepto del depósito' : 'Deposit concept'}
                />
              </div>

              {/* Notas */}
              <div>
                <label className="text-sm text-[#ffffff] mb-2 block">
                  {isSpanish ? 'Notas adicionales' : 'Additional notes'}
                </label>
                <textarea
                  value={addFundsData.notes}
                  onChange={e => setAddFundsData({...addFundsData, notes: e.target.value})}
                  className="w-full px-4 py-3 bg-[#0a0a0a] border border-[#1a1a1a] rounded-lg text-[#ffffff] focus:outline-none focus:border-emerald-500 h-20 resize-none"
                  placeholder={isSpanish ? 'Información adicional...' : 'Additional information...'}
                />
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowAddFundsModal(false)}
                className="flex-1 px-4 py-3 bg-[#1a1a1a] border border-[#333] text-[#ffffff] rounded-lg hover:bg-[#222] transition-colors"
              >
                {isSpanish ? 'Cancelar' : 'Cancel'}
              </button>
              <button
                onClick={handleAddFunds}
                disabled={addFundsData.amount <= 0}
                className="flex-1 px-4 py-3 bg-gradient-to-r from-emerald-600 to-green-600 text-white rounded-lg hover:from-emerald-500 hover:to-green-500 transition-all font-bold disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                <ArrowDownCircle className="w-5 h-5" />
                {isSpanish ? 'Agregar Fondos' : 'Add Funds'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Retiro de Fondos */}
      {showWithdrawModal && selectedAccount && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="bg-gradient-to-br from-[#0a0a0a] to-[#1a1a1a] border-2 border-orange-500/50 rounded-2xl p-6 max-w-lg w-full shadow-[0_0_50px_rgba(249,115,22,0.3)]">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold text-orange-400 flex items-center gap-2">
                <ArrowUpCircle className="w-6 h-6" />
                {isSpanish ? 'Retirar Fondos' : 'Withdraw Funds'}
              </h3>
              <button
                onClick={() => setShowWithdrawModal(false)}
                className="text-[#ffffff] hover:text-red-400 transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="bg-[#0d0d0d] border border-orange-500/30 rounded-lg p-4 mb-4">
              <div className="text-sm text-[#999] mb-1">{isSpanish ? 'Cuenta origen:' : 'Source account:'}</div>
              <div className="text-lg font-bold text-[#ffffff]">{selectedAccount.accountName}</div>
              <div className="text-sm text-orange-400 font-mono">{selectedAccount.accountNumber || selectedAccount.id}</div>
              <div className="text-sm text-emerald-400 mt-2 font-bold">
                {isSpanish ? 'Disponible:' : 'Available:'} {selectedAccount.currency} {selectedAccount.availableBalance.toLocaleString()}
              </div>
            </div>

            <div className="space-y-4">
              {/* Tipo de retiro */}
              <div>
                <label className="text-sm text-[#ffffff] mb-2 block">
                  {isSpanish ? 'Tipo de Retiro' : 'Withdrawal Type'}
                </label>
                <select
                  value={withdrawData.type}
                  onChange={e => setWithdrawData({...withdrawData, type: e.target.value as 'withdrawal' | 'transfer_out'})}
                  className="w-full px-4 py-3 bg-[#0a0a0a] border border-[#1a1a1a] rounded-lg text-[#ffffff] focus:outline-none focus:border-orange-500"
                >
                  <option value="withdrawal">{isSpanish ? 'Retiro' : 'Withdrawal'}</option>
                  <option value="transfer_out">{isSpanish ? 'Transferencia Saliente' : 'Outgoing Transfer'}</option>
                </select>
              </div>

              {/* Monto */}
              <div>
                <label className="text-sm text-[#ffffff] mb-2 block">
                  {isSpanish ? 'Monto a Retirar' : 'Amount to Withdraw'} ({selectedAccount.currency})
                </label>
                <input
                  type="number"
                  value={withdrawData.amount || ''}
                  onChange={e => setWithdrawData({...withdrawData, amount: parseFloat(e.target.value) || 0})}
                  max={selectedAccount.availableBalance}
                  className="w-full px-4 py-3 bg-[#0a0a0a] border border-[#1a1a1a] rounded-lg text-[#ffffff] font-mono text-xl focus:outline-none focus:border-orange-500"
                  placeholder="0.00"
                />
                {/* Botones de porcentaje */}
                <div className="flex gap-2 mt-2">
                  {[25, 50, 75, 100].map(pct => (
                    <button
                      key={pct}
                      type="button"
                      onClick={() => setWithdrawData({...withdrawData, amount: (selectedAccount.availableBalance * pct) / 100})}
                      className="flex-1 px-2 py-1 bg-orange-600/20 border border-orange-500/30 rounded text-orange-400 text-xs font-bold hover:bg-orange-500/30 transition-all"
                    >
                      {pct}%
                    </button>
                  ))}
                </div>
              </div>

              {/* Fecha y Hora */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm text-[#ffffff] mb-2 block flex items-center gap-1">
                    <Calendar className="w-4 h-4 text-orange-400" />
                    {isSpanish ? 'Fecha' : 'Date'}
                  </label>
                  <input
                    type="date"
                    value={withdrawData.transactionDate}
                    onChange={e => setWithdrawData({...withdrawData, transactionDate: e.target.value})}
                    className="w-full px-4 py-3 bg-[#0a0a0a] border border-[#1a1a1a] rounded-lg text-[#ffffff] focus:outline-none focus:border-orange-500"
                  />
                </div>
                <div>
                  <label className="text-sm text-[#ffffff] mb-2 block flex items-center gap-1">
                    <Clock className="w-4 h-4 text-orange-400" />
                    {isSpanish ? 'Hora' : 'Time'}
                  </label>
                  <input
                    type="time"
                    value={withdrawData.transactionTime}
                    onChange={e => setWithdrawData({...withdrawData, transactionTime: e.target.value})}
                    className="w-full px-4 py-3 bg-[#0a0a0a] border border-[#1a1a1a] rounded-lg text-[#ffffff] focus:outline-none focus:border-orange-500"
                  />
                </div>
              </div>

              {/* Cuenta destino y banco */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm text-[#ffffff] mb-2 block">
                    {isSpanish ? 'Cuenta Destino' : 'Destination Account'}
                  </label>
                  <input
                    type="text"
                    value={withdrawData.destinationAccount}
                    onChange={e => setWithdrawData({...withdrawData, destinationAccount: e.target.value})}
                    className="w-full px-4 py-3 bg-[#0a0a0a] border border-[#1a1a1a] rounded-lg text-[#ffffff] focus:outline-none focus:border-orange-500"
                    placeholder={isSpanish ? 'Número de cuenta' : 'Account number'}
                  />
                </div>
                <div>
                  <label className="text-sm text-[#ffffff] mb-2 block">
                    {isSpanish ? 'Banco Destino' : 'Destination Bank'}
                  </label>
                  <input
                    type="text"
                    value={withdrawData.destinationBank}
                    onChange={e => setWithdrawData({...withdrawData, destinationBank: e.target.value})}
                    className="w-full px-4 py-3 bg-[#0a0a0a] border border-[#1a1a1a] rounded-lg text-[#ffffff] focus:outline-none focus:border-orange-500"
                    placeholder={isSpanish ? 'Nombre del banco' : 'Bank name'}
                  />
                </div>
              </div>

              {/* Descripción */}
              <div>
                <label className="text-sm text-[#ffffff] mb-2 block">
                  {isSpanish ? 'Descripción' : 'Description'}
                </label>
                <input
                  type="text"
                  value={withdrawData.description}
                  onChange={e => setWithdrawData({...withdrawData, description: e.target.value})}
                  className="w-full px-4 py-3 bg-[#0a0a0a] border border-[#1a1a1a] rounded-lg text-[#ffffff] focus:outline-none focus:border-orange-500"
                  placeholder={isSpanish ? 'Concepto del retiro' : 'Withdrawal concept'}
                />
              </div>

              {/* Notas */}
              <div>
                <label className="text-sm text-[#ffffff] mb-2 block">
                  {isSpanish ? 'Notas adicionales' : 'Additional notes'}
                </label>
                <textarea
                  value={withdrawData.notes}
                  onChange={e => setWithdrawData({...withdrawData, notes: e.target.value})}
                  className="w-full px-4 py-3 bg-[#0a0a0a] border border-[#1a1a1a] rounded-lg text-[#ffffff] focus:outline-none focus:border-orange-500 h-16 resize-none"
                  placeholder={isSpanish ? 'Información adicional...' : 'Additional information...'}
                />
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowWithdrawModal(false)}
                className="flex-1 px-4 py-3 bg-[#1a1a1a] border border-[#333] text-[#ffffff] rounded-lg hover:bg-[#222] transition-colors"
              >
                {isSpanish ? 'Cancelar' : 'Cancel'}
              </button>
              <button
                onClick={handleWithdraw}
                disabled={withdrawData.amount <= 0 || withdrawData.amount > selectedAccount.availableBalance}
                className="flex-1 px-4 py-3 bg-gradient-to-r from-orange-600 to-red-600 text-white rounded-lg hover:from-orange-500 hover:to-red-500 transition-all font-bold disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                <ArrowUpCircle className="w-5 h-5" />
                {isSpanish ? 'Retirar Fondos' : 'Withdraw Funds'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Transferencia entre Cuentas */}
      {showTransferModal && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="bg-gradient-to-br from-[#0a0a0a] to-[#1a1a1a] border-2 border-purple-500/50 rounded-2xl p-6 max-w-lg w-full shadow-[0_0_50px_rgba(168,85,247,0.3)]">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold text-purple-400 flex items-center gap-2">
                <Banknote className="w-6 h-6" />
                {isSpanish ? 'Transferencia entre Cuentas' : 'Transfer Between Accounts'}
              </h3>
              <button
                onClick={() => setShowTransferModal(false)}
                className="text-[#ffffff] hover:text-red-400 transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="space-y-4">
              {/* Cuenta Origen */}
              <div>
                <label className="text-sm text-[#ffffff] mb-2 block flex items-center gap-2">
                  <ArrowUpCircle className="w-4 h-4 text-orange-400" />
                  {isSpanish ? 'Cuenta Origen' : 'Source Account'}
                </label>
                <select
                  value={transferData.sourceAccountId}
                  onChange={e => setTransferData({...transferData, sourceAccountId: e.target.value})}
                  className="w-full px-4 py-3 bg-[#0a0a0a] border border-orange-500/30 rounded-lg text-[#ffffff] focus:outline-none focus:border-orange-500"
                >
                  <option value="">{isSpanish ? '-- Seleccionar cuenta origen --' : '-- Select source account --'}</option>
                  {custodyAccounts.map(acc => (
                    <option key={acc.id} value={acc.id}>
                      {acc.accountName} ({acc.currency}) - {isSpanish ? 'Disponible' : 'Available'}: {acc.availableBalance.toLocaleString()}
                    </option>
                  ))}
                </select>
                {transferData.sourceAccountId && (
                  <div className="mt-2 p-2 bg-orange-500/10 border border-orange-500/30 rounded text-xs">
                    <span className="text-orange-400 font-bold">
                      {custodyAccounts.find(a => a.id === transferData.sourceAccountId)?.accountNumber || 'N/A'}
                    </span>
                  </div>
                )}
              </div>

              {/* Cuenta Destino */}
              <div>
                <label className="text-sm text-[#ffffff] mb-2 block flex items-center gap-2">
                  <ArrowDownCircle className="w-4 h-4 text-emerald-400" />
                  {isSpanish ? 'Cuenta Destino' : 'Destination Account'}
                </label>
                <select
                  value={transferData.destinationAccountId}
                  onChange={e => setTransferData({...transferData, destinationAccountId: e.target.value})}
                  className="w-full px-4 py-3 bg-[#0a0a0a] border border-emerald-500/30 rounded-lg text-[#ffffff] focus:outline-none focus:border-emerald-500"
                >
                  <option value="">{isSpanish ? '-- Seleccionar cuenta destino --' : '-- Select destination account --'}</option>
                  {custodyAccounts
                    .filter(acc => acc.id !== transferData.sourceAccountId)
                    .map(acc => (
                      <option key={acc.id} value={acc.id}>
                        {acc.accountName} ({acc.currency}) - {isSpanish ? 'Balance' : 'Balance'}: {acc.totalBalance.toLocaleString()}
                      </option>
                    ))}
                </select>
                {transferData.destinationAccountId && (
                  <div className="mt-2 p-2 bg-emerald-500/10 border border-emerald-500/30 rounded text-xs">
                    <span className="text-emerald-400 font-bold">
                      {custodyAccounts.find(a => a.id === transferData.destinationAccountId)?.accountNumber || 'N/A'}
                    </span>
                  </div>
                )}
              </div>

              {/* Verificación de divisas */}
              {transferData.sourceAccountId && transferData.destinationAccountId && (
                (() => {
                  const source = custodyAccounts.find(a => a.id === transferData.sourceAccountId);
                  const dest = custodyAccounts.find(a => a.id === transferData.destinationAccountId);
                  if (source && dest && source.currency !== dest.currency) {
                    return (
                      <div className="p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-lg text-yellow-400 text-sm">
                        ⚠️ {isSpanish 
                          ? `Las cuentas tienen diferentes divisas (${source.currency} → ${dest.currency}). Se transferirá el monto nominal.`
                          : `Accounts have different currencies (${source.currency} → ${dest.currency}). Nominal amount will be transferred.`}
                      </div>
                    );
                  }
                  return null;
                })()
              )}

              {/* Monto */}
              <div>
                <label className="text-sm text-[#ffffff] mb-2 block">
                  {isSpanish ? 'Monto a Transferir' : 'Amount to Transfer'}
                </label>
                <input
                  type="number"
                  value={transferData.amount || ''}
                  onChange={e => setTransferData({...transferData, amount: parseFloat(e.target.value) || 0})}
                  className="w-full px-4 py-3 bg-[#0a0a0a] border border-[#1a1a1a] rounded-lg text-[#ffffff] font-mono text-xl focus:outline-none focus:border-purple-500"
                  placeholder="0.00"
                />
              </div>

              {/* Fecha y Hora */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm text-[#ffffff] mb-2 block flex items-center gap-1">
                    <Calendar className="w-4 h-4 text-purple-400" />
                    {isSpanish ? 'Fecha' : 'Date'}
                  </label>
                  <input
                    type="date"
                    value={transferData.transactionDate}
                    onChange={e => setTransferData({...transferData, transactionDate: e.target.value})}
                    className="w-full px-4 py-3 bg-[#0a0a0a] border border-[#1a1a1a] rounded-lg text-[#ffffff] focus:outline-none focus:border-purple-500"
                  />
                </div>
                <div>
                  <label className="text-sm text-[#ffffff] mb-2 block flex items-center gap-1">
                    <Clock className="w-4 h-4 text-purple-400" />
                    {isSpanish ? 'Hora' : 'Time'}
                  </label>
                  <input
                    type="time"
                    value={transferData.transactionTime}
                    onChange={e => setTransferData({...transferData, transactionTime: e.target.value})}
                    className="w-full px-4 py-3 bg-[#0a0a0a] border border-[#1a1a1a] rounded-lg text-[#ffffff] focus:outline-none focus:border-purple-500"
                  />
                </div>
              </div>

              {/* Notas */}
              <div>
                <label className="text-sm text-[#ffffff] mb-2 block">
                  {isSpanish ? 'Notas' : 'Notes'}
                </label>
                <textarea
                  value={transferData.notes}
                  onChange={e => setTransferData({...transferData, notes: e.target.value})}
                  className="w-full px-4 py-3 bg-[#0a0a0a] border border-[#1a1a1a] rounded-lg text-[#ffffff] focus:outline-none focus:border-purple-500 h-16 resize-none"
                  placeholder={isSpanish ? 'Notas de la transferencia...' : 'Transfer notes...'}
                />
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowTransferModal(false)}
                className="flex-1 px-4 py-3 bg-[#1a1a1a] border border-[#333] text-[#ffffff] rounded-lg hover:bg-[#222] transition-colors"
              >
                {isSpanish ? 'Cancelar' : 'Cancel'}
              </button>
              <button
                onClick={handleTransferBetweenAccounts}
                disabled={!transferData.sourceAccountId || !transferData.destinationAccountId || transferData.amount <= 0}
                className="flex-1 px-4 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg hover:from-purple-500 hover:to-pink-500 transition-all font-bold disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                <Banknote className="w-5 h-5" />
                {isSpanish ? 'Transferir' : 'Transfer'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Historial de Transacciones */}
      {showTransactionHistory && selectedAccount && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="bg-gradient-to-br from-[#0a0a0a] to-[#1a1a1a] border-2 border-blue-500/50 rounded-2xl p-6 max-w-4xl w-full max-h-[90vh] overflow-hidden shadow-[0_0_50px_rgba(59,130,246,0.3)]">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold text-blue-400 flex items-center gap-2">
                <History className="w-6 h-6" />
                {isSpanish ? 'Historial de Transacciones' : 'Transaction History'}
              </h3>
              <button
                onClick={() => setShowTransactionHistory(false)}
                className="text-[#ffffff] hover:text-red-400 transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="bg-[#0d0d0d] border border-blue-500/30 rounded-lg p-4 mb-4">
              <div className="text-lg font-bold text-[#ffffff]">{selectedAccount.accountName}</div>
              <div className="text-sm text-blue-400 font-mono">{selectedAccount.accountNumber || selectedAccount.id}</div>
              <div className="text-sm text-[#666] mt-1">
                {isSpanish ? 'Balance actual:' : 'Current balance:'} {selectedAccount.currency} {selectedAccount.totalBalance.toLocaleString()}
              </div>
            </div>

            <div className="overflow-y-auto max-h-[50vh]">
              {selectedAccount.transactions && selectedAccount.transactions.length > 0 ? (
                <table className="w-full text-sm">
                  <thead className="bg-blue-900/30 text-blue-300 sticky top-0">
                    <tr>
                      <th className="px-3 py-2 text-left">{isSpanish ? 'Fecha' : 'Date'}</th>
                      <th className="px-3 py-2 text-left">{isSpanish ? 'Hora' : 'Time'}</th>
                      <th className="px-3 py-2 text-left">{isSpanish ? 'Tipo' : 'Type'}</th>
                      <th className="px-3 py-2 text-left">{isSpanish ? 'Descripción' : 'Description'}</th>
                      <th className="px-3 py-2 text-right">{isSpanish ? 'Monto' : 'Amount'}</th>
                      <th className="px-3 py-2 text-right">{isSpanish ? 'Balance' : 'Balance'}</th>
                      <th className="px-3 py-2 text-left">{isSpanish ? 'Referencia' : 'Reference'}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[...selectedAccount.transactions].reverse().map((tx, idx) => (
                      <tr key={tx.id} className={`border-b border-[#1a1a1a] ${idx % 2 === 0 ? 'bg-[#0a0a0a]' : 'bg-[#0d0d0d]'}`}>
                        <td className="px-3 py-3 text-[#ffffff]">{tx.transactionDate}</td>
                        <td className="px-3 py-3 text-[#999]">{tx.transactionTime}</td>
                        <td className="px-3 py-3">
                          <span className={`px-2 py-1 rounded text-xs font-bold ${
                            tx.type === 'deposit' || tx.type === 'transfer_in' || tx.type === 'initial' 
                              ? 'bg-emerald-500/20 text-emerald-400'
                              : tx.type === 'withdrawal' || tx.type === 'transfer_out'
                              ? 'bg-red-500/20 text-red-400'
                              : 'bg-blue-500/20 text-blue-400'
                          }`}>
                            {tx.type.toUpperCase()}
                          </span>
                        </td>
                        <td className="px-3 py-3 text-[#999] max-w-[200px] truncate">{tx.description}</td>
                        <td className={`px-3 py-3 text-right font-mono font-bold ${tx.amount >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                          {tx.amount >= 0 ? '+' : ''}{selectedAccount.currency} {Math.abs(tx.amount).toLocaleString()}
                        </td>
                        <td className="px-3 py-3 text-right font-mono text-[#ffffff]">
                          {selectedAccount.currency} {tx.balanceAfter.toLocaleString()}
                        </td>
                        <td className="px-3 py-3 text-[#666] font-mono text-xs">{tx.reference}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <div className="text-center py-12 text-[#666]">
                  <History className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>{isSpanish ? 'No hay transacciones registradas' : 'No transactions recorded'}</p>
                </div>
              )}
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowTransactionHistory(false)}
                className="flex-1 px-4 py-3 bg-[#1a1a1a] border border-[#333] text-[#ffffff] rounded-lg hover:bg-[#222] transition-colors"
              >
                {isSpanish ? 'Cerrar' : 'Close'}
              </button>
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

      {/* Modal de Ajuste de Balance */}
      {showEditBalanceModal && selectedAccount && (
        <div className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4">
          <div className="bg-[#0d0d0d] border-2 border-[#ffffff] rounded-xl max-w-lg w-full p-6">
            <h2 className="text-2xl font-bold text-[#ffffff] mb-6 flex items-center gap-3">
              <TrendingUp className="w-7 h-7" />
              {isSpanish ? 'Ajustar Balance de Cuenta' : 'Adjust Account Balance'}
            </h2>

            {/* Información de la cuenta */}
            <div className="bg-gradient-to-r from-cyan-900/20 to-blue-900/20 border border-cyan-500/30 rounded-lg p-4 mb-6">
              <div className="text-sm text-cyan-300 mb-3 font-semibold">
                📋 {selectedAccount.accountName}
              </div>
              <div className="grid grid-cols-3 gap-3 text-xs">
                <div className="bg-black/30 rounded p-2">
                  <div className="text-cyan-300/60 mb-1">{isSpanish ? 'Total Actual' : 'Current Total'}</div>
                  <div className="text-cyan-300 font-mono font-bold">
                    {selectedAccount.currency} {selectedAccount.totalBalance.toLocaleString()}
                  </div>
                </div>
                <div className="bg-black/30 rounded p-2">
                  <div className="text-yellow-300/60 mb-1">{isSpanish ? 'Reservado' : 'Reserved'}</div>
                  <div className="text-yellow-300 font-mono font-bold">
                    {selectedAccount.currency} {selectedAccount.reservedBalance.toLocaleString()}
                  </div>
                </div>
                <div className="bg-black/30 rounded p-2">
                  <div className="text-white/60 mb-1">{isSpanish ? 'Disponible' : 'Available'}</div>
                  <div className="text-white font-mono font-bold">
                    {selectedAccount.currency} {selectedAccount.availableBalance.toLocaleString()}
                  </div>
                </div>
              </div>
            </div>

            {/* Selector de Operación */}
            <div className="mb-6">
              <label className="block text-[#ffffff] text-sm mb-3 font-semibold">
                {isSpanish ? 'Selecciona operación:' : 'Select operation:'}
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setBalanceOperation('add')}
                  className={`p-4 rounded-lg border-2 transition-all ${
                    balanceOperation === 'add'
                      ? 'border-white/30 bg-white/20/20 text-black'
                      : 'border-[#1a1a1a] bg-[#0a0a0a] text-[#ffffff] hover:border-white/30/30'
                  }`}
                >
                  <div className="text-3xl mb-2">📈</div>
                  <div className="font-bold">{isSpanish ? 'AUMENTAR' : 'ADD'}</div>
                  <div className="text-xs mt-1 opacity-80">
                    {isSpanish ? 'Agregar capital' : 'Add funds'}
                  </div>
                </button>
                <button
                  type="button"
                  onClick={() => setBalanceOperation('subtract')}
                  className={`p-4 rounded-lg border-2 transition-all ${
                    balanceOperation === 'subtract'
                      ? 'border-red-500 bg-red-500/20 text-red-300'
                      : 'border-[#1a1a1a] bg-[#0a0a0a] text-[#ffffff] hover:border-red-500/30'
                  }`}
                >
                  <div className="text-3xl mb-2">📉</div>
                  <div className="font-bold">{isSpanish ? 'DISMINUIR' : 'SUBTRACT'}</div>
                  <div className="text-xs mt-1 opacity-80">
                    {isSpanish ? 'Retirar capital' : 'Withdraw funds'}
                  </div>
                </button>
              </div>
            </div>

            {/* Input de Monto */}
            <div className="mb-6">
              <label className="block text-[#ffffff] text-sm mb-2 font-semibold">
                {isSpanish ? 'Monto:' : 'Amount:'}
              </label>
              <input
                type="number"
                step="0.01"
                value={balanceAmount}
                onChange={(e) => setBalanceAmount(parseFloat(e.target.value) || 0)}
                className="w-full bg-[#0a0a0a] border-2 border-[#ffffff]/30 focus:border-[#ffffff] rounded-lg px-4 py-3 text-[#ffffff] font-mono text-xl focus:outline-none transition-all"
                placeholder="0.00"
                autoFocus
              />
              <div className="text-xs text-[#ffffff] mt-2">
                {balanceOperation === 'add' ? (
                  <span className="text-white">
                    ➕ {isSpanish ? 'Se agregará:' : 'Will add:'} {selectedAccount.currency} {balanceAmount.toLocaleString()}
                  </span>
                ) : (
                  <span className="text-red-400">
                    ➖ {isSpanish ? 'Se restará:' : 'Will subtract:'} {selectedAccount.currency} {balanceAmount.toLocaleString()}
                  </span>
                )}
              </div>
            </div>

            {/* Preview del nuevo balance */}
            {balanceAmount > 0 && (
              <div className={`rounded-lg p-4 mb-6 border-2 ${
                balanceOperation === 'add'
                  ? 'bg-white/10/20 border-white/30/50'
                  : (selectedAccount.totalBalance - balanceAmount) >= selectedAccount.reservedBalance
                    ? 'bg-blue-900/20 border-blue-500/50'
                    : 'bg-red-900/20 border-red-500/50'
              }`}>
                <div className="text-sm font-semibold mb-3 flex items-center gap-2">
                  <Database className="w-4 h-4" />
                  {isSpanish ? 'Vista Previa:' : 'Preview:'}
                </div>
                <div className="grid grid-cols-3 gap-3 text-xs">
                  <div>
                    <div className="text-white/60 mb-1">{isSpanish ? 'Actual' : 'Current'}</div>
                    <div className="font-mono font-bold text-white">
                      {selectedAccount.totalBalance.toLocaleString()}
                    </div>
                  </div>
                  <div>
                    <div className="text-white/60 mb-1">{isSpanish ? 'Cambio' : 'Change'}</div>
                    <div className={`font-mono font-bold ${balanceOperation === 'add' ? 'text-white' : 'text-red-400'}`}>
                      {balanceOperation === 'add' ? '+' : '-'}{balanceAmount.toLocaleString()}
                    </div>
                  </div>
                  <div>
                    <div className="text-white/60 mb-1">{isSpanish ? 'Nuevo' : 'New'}</div>
                    <div className={`font-mono font-bold ${
                      balanceOperation === 'add' || (selectedAccount.totalBalance - balanceAmount) >= selectedAccount.reservedBalance
                        ? 'text-[#ffffff]'
                        : 'text-red-400'
                    }`}>
                      {balanceOperation === 'add'
                        ? (selectedAccount.totalBalance + balanceAmount).toLocaleString()
                        : (selectedAccount.totalBalance - balanceAmount).toLocaleString()}
                    </div>
                  </div>
                </div>
                {balanceOperation === 'subtract' && (selectedAccount.totalBalance - balanceAmount) < selectedAccount.reservedBalance && (
                  <div className="mt-3 text-xs text-red-300 bg-red-500/10 border border-red-500/30 rounded p-2">
                    ⚠️ {isSpanish 
                      ? `No puedes reducir el balance por debajo del monto reservado (${selectedAccount.currency} ${selectedAccount.reservedBalance.toLocaleString()})`
                      : `Cannot reduce balance below reserved amount (${selectedAccount.currency} ${selectedAccount.reservedBalance.toLocaleString()})`}
                  </div>
                )}
              </div>
            )}

            {/* Botones de Acción */}
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => {
                  setShowEditBalanceModal(false);
                  setBalanceAmount(0);
                  setBalanceOperation('add');
                }}
                className="flex-1 px-6 py-3 bg-[#1a1a1a] border border-[#2a2a2a] text-[#ffffff] rounded-lg hover:bg-[#252525] font-semibold"
              >
                {isSpanish ? 'Cancelar' : 'Cancel'}
              </button>
              <button
                type="button"
                onClick={() => {
                  if (balanceAmount <= 0) {
                    alert(isSpanish ? '⚠️ Ingresa un monto válido' : '⚠️ Enter a valid amount');
                    return;
                  }

                  const newTotal = balanceOperation === 'add'
                    ? selectedAccount.totalBalance + balanceAmount
                    : selectedAccount.totalBalance - balanceAmount;

                  if (custodyStore.updateAccountBalance(selectedAccount.id, newTotal)) {
                    loadCustodyAccounts();
                    setShowEditBalanceModal(false);
                    setBalanceAmount(0);
                    setBalanceOperation('add');
                    
                    alert(
                      `✅ ${isSpanish ? 'Balance actualizado correctamente' : 'Balance updated successfully'}\n\n` +
                      `${isSpanish ? 'Operación:' : 'Operation:'} ${balanceOperation === 'add' ? '➕ ' + (isSpanish ? 'Aumentar' : 'Add') : '➖ ' + (isSpanish ? 'Disminuir' : 'Subtract')}\n` +
                      `${isSpanish ? 'Monto:' : 'Amount:'} ${selectedAccount.currency} ${balanceAmount.toLocaleString()}\n` +
                      `${isSpanish ? 'Balance anterior:' : 'Previous balance:'} ${selectedAccount.currency} ${selectedAccount.totalBalance.toLocaleString()}\n` +
                      `${isSpanish ? 'Nuevo balance:' : 'New balance:'} ${selectedAccount.currency} ${newTotal.toLocaleString()}`
                    );
                  } else {
                    alert(`❌ Error: ${isSpanish ? 'No se pudo actualizar el balance' : 'Could not update balance'}`);
                  }
                }}
                disabled={balanceAmount <= 0 || (balanceOperation === 'subtract' && (selectedAccount.totalBalance - balanceAmount) < selectedAccount.reservedBalance)}
                className={`flex-1 px-6 py-3 font-bold rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed ${
                  balanceOperation === 'add'
                    ? 'bg-gradient-to-r from-white/20 to-emerald-500 text-black hover:shadow-[0_0_20px_rgba(34,197,94,0.6)]'
                    : 'bg-gradient-to-r from-red-500 to-orange-500 text-white hover:shadow-[0_0_20px_rgba(239,68,68,0.6)]'
                }`}
              >
                <CheckCircle className="w-5 h-5 inline mr-2" />
                {isSpanish ? 'Confirmar Cambio' : 'Confirm Change'}
              </button>
            </div>
          </div>
        </div>
      )}
      </div>
      {/* Fin contenedor scroll */}
    </div>
  );
}

