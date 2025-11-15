/**
 * API VUSD Module - Sistema de Circulating Cap con DAES Integration
 * Gestión de pledges, transferencias con enforcement de cap, y publicación de PoR
 */

import { useState, useEffect } from 'react';
import {
  Shield,
  TrendingUp,
  Send,
  RefreshCw,
  CheckCircle,
  AlertCircle,
  Lock,
  Unlock,
  DollarSign,
  Activity,
  Clock,
  ChevronRight,
  Database,
  ArrowUpRight,
  Trash2,
  FileText
} from 'lucide-react';
import { useLanguage } from '../lib/i18n';
import { vusdCapStore, type Pledge, type PorPublication, type TreasuryTransfer } from '../lib/vusd-cap-store';
import { custodyStore } from '../lib/custody-store';
import { apiVUSD1Store } from '../lib/api-vusd1-store';
import { unifiedPledgeStore } from '../lib/unified-pledge-store';
import {
  generateBlackScreenData,
  downloadBlackScreenHTML,
} from '../lib/blackscreen-generator';

export function APIVUSDModule() {
  const { language } = useLanguage();
  const [activePledges, setActivePledges] = useState<Pledge[]>([]);
  const [porPublications, setPorPublications] = useState<PorPublication[]>([]);
  const [recentTransfers, setRecentTransfers] = useState<TreasuryTransfer[]>([]);
  const [custodyAccounts, setCustodyAccounts] = useState<any[]>([]);
  const [circulatingCap, setCirculatingCap] = useState(0);
  const [circulatingOut, setCirculatingOut] = useState(0);
  const [pledgedUSD, setPledgedUSD] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedView, setSelectedView] = useState<'overview' | 'pledges' | 'transfers' | 'por'>('overview');
  const [lastPledgeData, setLastPledgeData] = useState<{
    currency: string;
    amount: number;
    beneficiary: string;
  } | null>(null);

  // Transfer form state
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [transferForm, setTransferForm] = useState({
    external_ref: '',
    amount: 0,
    to_account: '',
    description: ''
  });

  // Pledge form state
  const [showPledgeModal, setShowPledgeModal] = useState(false);
  const [selectedCustodyAccount, setSelectedCustodyAccount] = useState<string>('');
  const [pledgeForm, setPledgeForm] = useState({
    amount: 0,
    currency: 'USD',
    beneficiary: '',
    expires_at: ''
  });

  const texts = {
    es: {
      title: 'API VUSD - Circulating Cap',
      subtitle: 'Sistema de control de capitalización circulante con DAES',
      overview: 'Resumen',
      pledges: 'Pledges Activos',
      transfers: 'Transferencias',
      por: 'Proof of Reserve',
      circulatingCap: 'Cap Circulante',
      circulatingOut: 'Circulante Emitido',
      remaining: 'Disponible',
      pledgedUSD: 'Pledges USD Totales',
      refreshData: 'Actualizar Datos',
      createTransfer: 'Nueva Transferencia',
      createPledge: 'Nuevo Pledge',
      publishPor: 'Publicar PoR',
      amount: 'Monto',
      status: 'Estado',
      beneficiary: 'Beneficiario',
      expiresAt: 'Expira',
      selectCustodyAccount: 'Seleccionar Cuenta Custodio',
      manualEntry: 'Entrada Manual',
      custodyAccountInfo: 'Información de Cuenta',
      totalBalance: 'Balance Total',
      availableBalance: 'Balance Disponible',
      toAccount: 'Cuenta Destino',
      externalRef: 'Referencia Externa',
      description: 'Descripción',
      submit: 'Enviar',
      cancel: 'Cancelar',
      active: 'Activo',
      completed: 'Completado',
      failed: 'Fallido',
      loading: 'Cargando...',
      capViolation: 'Violación de Cap',
      success: 'Éxito',
      transferSuccess: 'Transferencia creada exitosamente',
      pledgeSuccess: 'Pledge creado exitosamente',
      porPublished: 'PoR publicado exitosamente',
      lastPor: 'Último PoR',
      asOf: 'A partir de',
      txId: 'TX ID',
      noData: 'Sin datos disponibles',
      // Validation Messages
      validationNoCapitalTitle: 'SIN CAPITAL DISPONIBLE',
      validationNoCapitalAccount: 'Cuenta',
      validationNoCapitalBalanceTotal: 'Balance Total',
      validationNoCapitalBalanceAvailable: 'Balance Disponible',
      validationNoCapitalBalanceReserved: 'Balance Reservado',
      validationNoCapitalMessage: 'No se puede crear pledge sin capital disponible.',
      validationNoCapitalSolution: 'Solución:',
      validationNoCapitalSolution1: 'Libera el pledge existente de esta cuenta, o',
      validationNoCapitalSolution2: 'Usa una cuenta custody con balance disponible',
      validationAmountExceedsTitle: 'MONTO EXCEDE DISPONIBLE',
      validationAmountExceedsRequested: 'Solicitado',
      validationAmountExceedsAvailable: 'Disponible',
      validationAmountExceedsMessage: 'Reduce el monto del pledge o selecciona otra cuenta.'
    },
    en: {
      title: 'API VUSD - Circulating Cap',
      subtitle: 'Circulating cap control system with DAES',
      overview: 'Overview',
      pledges: 'Active Pledges',
      transfers: 'Transfers',
      por: 'Proof of Reserve',
      circulatingCap: 'Circulating Cap',
      circulatingOut: 'Circulating Issued',
      remaining: 'Available',
      pledgedUSD: 'Total USD Pledges',
      refreshData: 'Refresh Data',
      createTransfer: 'New Transfer',
      createPledge: 'New Pledge',
      publishPor: 'Publish PoR',
      amount: 'Amount',
      status: 'Status',
      beneficiary: 'Beneficiary',
      expiresAt: 'Expires',
      selectCustodyAccount: 'Select Custody Account',
      manualEntry: 'Manual Entry',
      custodyAccountInfo: 'Account Information',
      totalBalance: 'Total Balance',
      availableBalance: 'Available Balance',
      toAccount: 'To Account',
      externalRef: 'External Reference',
      description: 'Description',
      submit: 'Submit',
      cancel: 'Cancel',
      active: 'Active',
      completed: 'Completed',
      failed: 'Failed',
      loading: 'Loading...',
      capViolation: 'Cap Violation',
      success: 'Success',
      transferSuccess: 'Transfer created successfully',
      pledgeSuccess: 'Pledge created successfully',
      porPublished: 'PoR published successfully',
      lastPor: 'Last PoR',
      asOf: 'As of',
      txId: 'TX ID',
      noData: 'No data available',
      // Validation Messages
      validationNoCapitalTitle: 'NO CAPITAL AVAILABLE',
      validationNoCapitalAccount: 'Account',
      validationNoCapitalBalanceTotal: 'Total Balance',
      validationNoCapitalBalanceAvailable: 'Available Balance',
      validationNoCapitalBalanceReserved: 'Reserved Balance',
      validationNoCapitalMessage: 'Cannot create pledge without available capital.',
      validationNoCapitalSolution: 'Solution:',
      validationNoCapitalSolution1: 'Release the existing pledge from this account, or',
      validationNoCapitalSolution2: 'Use a custody account with available balance',
      validationAmountExceedsTitle: 'AMOUNT EXCEEDS AVAILABLE',
      validationAmountExceedsRequested: 'Requested',
      validationAmountExceedsAvailable: 'Available',
      validationAmountExceedsMessage: 'Reduce the pledge amount or select another account.'
    }
  };

  const t = texts[language as keyof typeof texts] || texts.en;

  // Load initial data
  useEffect(() => {
    // IMPORTANTE: Recalcular balances desde unified store al montar el componente
    console.log('[VUSD] 🔄 Initializing: Recalculating all balances from unified store...');
    unifiedPledgeStore.recalculateAllBalances();

    loadData();
    loadCustodyAccounts();
    const interval = setInterval(loadData, 30000); // Refresh every 30s
    return () => clearInterval(interval);
  }, []);

  // Load custody accounts
  const loadCustodyAccounts = async () => {
    const accounts = custodyStore.getAccounts();

    // ========================================
    // SINCRONIZAR BALANCES CON PLEDGES ACTIVOS
    // ========================================
    // Resetear reservas de todos los pledges para recalcular
    accounts.forEach(account => {
      // Guardar el balance original total
      const originalTotal = account.totalBalance;

      // Resetear a estado inicial
      account.reservedBalance = 0;
      account.availableBalance = originalTotal;
    });

    // Recalcular reservas basado en pledges activos
    const pledges = await vusdCapStore.getActivePledges();
    pledges.forEach(pledge => {
      if (pledge.custody_account_id && pledge.status === 'active') {
        const account = accounts.find(a => a.id === pledge.custody_account_id);
        if (account && account.currency === pledge.currency) {
          account.reservedBalance += pledge.amount;
          account.availableBalance -= pledge.amount;

          console.log('[VUSD→Custody] 🔄 Sincronizando pledge:', {
            account: account.accountName,
            pledge: pledge.pledge_id,
            reserved: pledge.amount
          });
        }
      }
    });

    // Guardar estado actualizado
    custodyStore.saveAccounts(accounts);

    setCustodyAccounts(accounts);
  };

  // Handle custody account selection
  const handleCustodyAccountSelect = (accountId: string) => {
    setSelectedCustodyAccount(accountId);

    if (accountId === '') {
      // Manual entry - reset form
      setPledgeForm({
        amount: 0,
        currency: 'USD',
        beneficiary: '',
        expires_at: ''
      });
      return;
    }

    const account = custodyAccounts.find(a => a.id === accountId);
    if (account) {
      setPledgeForm({
        amount: account.totalBalance,
        currency: account.currency,
        beneficiary: account.accountName,
        expires_at: '' // Sin expiración por defecto
      });
    }
  };

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);

      const [pledges, cap, out, transfers, pors, pledgedTotal] = await Promise.all([
        vusdCapStore.getActivePledges(),
        vusdCapStore.getCirculatingCap(),
        vusdCapStore.getCirculatingOut(),
        vusdCapStore.getRecentTransfers(),
        vusdCapStore.getRecentPorPublications(),
        vusdCapStore.getTotalPledgedUSD()
      ]);

      setActivePledges(pledges);
      setCirculatingCap(cap);
      setCirculatingOut(out);
      setRecentTransfers(transfers);
      setPorPublications(pors);
      setPledgedUSD(pledgedTotal);
    } catch (err) {
      console.error('[VUSD] Error loading data:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateTransfer = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setLoading(true);
      setError(null);

      await vusdCapStore.createTransfer({
        external_ref: transferForm.external_ref,
        amount: transferForm.amount,
        to_account: transferForm.to_account
      });

      setShowTransferModal(false);
      setTransferForm({ external_ref: '', amount: 0, to_account: '', description: '' });
      await loadData();
    } catch (err) {
      const error = err as Error;
      setError(error.message || 'Transfer failed');
      if (error.message?.includes('cap')) {
        alert(`${t.capViolation}: ${error.message}`);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleCreatePledge = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setLoading(true);
      setError(null);

      // ========================================
      // VALIDACIÓN UNIFICADA DE BALANCE
      // ========================================
      if (selectedCustodyAccount) {
        const validation = unifiedPledgeStore.canCreatePledge(selectedCustodyAccount, pledgeForm.amount);

        if (!validation.allowed) {
          const custodyAccount = custodyStore.getAccountById(selectedCustodyAccount);
          throw new Error(
            `❌ ${t.validationNoCapitalTitle}\n\n` +
            `${t.validationNoCapitalAccount}: ${custodyAccount?.accountName || 'Unknown'}\n` +
            `${t.validationNoCapitalBalanceTotal}: ${pledgeForm.currency} ${custodyAccount?.totalBalance.toLocaleString('en-US', { minimumFractionDigits: 3, maximumFractionDigits: 3 })}\n` +
            `${t.validationNoCapitalBalanceAvailable}: ${pledgeForm.currency} ${(validation.availableBalance || 0).toLocaleString('en-US', { minimumFractionDigits: 3, maximumFractionDigits: 3 })}\n` +
            `${t.validationNoCapitalBalanceReserved}: ${pledgeForm.currency} ${(validation.totalPledged || 0).toLocaleString('en-US', { minimumFractionDigits: 3, maximumFractionDigits: 3 })}\n\n` +
            `${validation.reason}\n\n` +
            `${t.validationNoCapitalSolution}\n` +
            `1. ${t.validationNoCapitalSolution1}\n` +
            `2. ${t.validationNoCapitalSolution2}`
          );
        }

        const custodyAccount = custodyStore.getAccountById(selectedCustodyAccount);
        const realAvailableBalance = validation.availableBalance || 0;

        console.log('[VUSD] ✅ Balance validation APPROVED by UnifiedPledgeStore:', {
          account: custodyAccount?.accountName,
          totalBalance: custodyAccount?.totalBalance,
          totalPledged: validation.totalPledged,
          available: realAvailableBalance,
          requested: pledgeForm.amount,
          afterPledge: realAvailableBalance - pledgeForm.amount
        });
      }

      console.log('[VUSD] Creando pledge:', {
        amount: pledgeForm.amount,
        currency: pledgeForm.currency,
        beneficiary: pledgeForm.beneficiary,
        custody_account_id: selectedCustodyAccount || null,
        fromCustodyAccount: selectedCustodyAccount ? custodyAccounts.find(a => a.id === selectedCustodyAccount)?.accountName : 'Manual Entry'
      });

      const result = await vusdCapStore.createPledge({
        amount: pledgeForm.amount,
        currency: pledgeForm.currency,
        beneficiary: pledgeForm.beneficiary,
        custody_account_id: selectedCustodyAccount || undefined,
        expires_at: pledgeForm.expires_at || undefined
      });

      console.log('[VUSD] ✅ Pledge creado exitosamente:', result);

      // ========================================
      // CREAR UNIFIED PLEDGE (TRACKING CENTRAL)
      // ========================================
      let unifiedPledge = null;
      if (selectedCustodyAccount) {
        try {
          const custodyAccount = custodyStore.getAccountById(selectedCustodyAccount);
          unifiedPledge = await unifiedPledgeStore.createPledge({
            custody_account_id: selectedCustodyAccount,
            amount: pledgeForm.amount,
            currency: pledgeForm.currency,
            beneficiary: pledgeForm.beneficiary,
            source_module: 'API_VUSD',
            external_ref: result.pledge_id,
            expires_at: pledgeForm.expires_at || undefined,
            blockchain_network: custodyAccount?.blockchainLink,
            contract_address: custodyAccount?.contractAddress,
            token_symbol: custodyAccount?.tokenSymbol
          });

          console.log('[VUSD→Unified] ✅ Unified pledge created:', unifiedPledge.id);
        } catch (unifiedError) {
          console.error('[VUSD→Unified] ❌ Error creating unified pledge:', unifiedError);
        }
      }

      // ========================================
      // ACTUALIZAR BALANCES EN CUSTODY STORE DESDE UNIFIED STORE
      // ========================================
      if (selectedCustodyAccount && unifiedPledge) {
        try {
          const accounts = custodyStore.getAccounts();
          const custodyAccount = accounts.find(a => a.id === selectedCustodyAccount);
          if (custodyAccount) {
            // IMPORTANTE: Recalcular SIEMPRE desde unified store (fuente de verdad)
            const totalPledged = unifiedPledgeStore.getTotalPledgedAmount(selectedCustodyAccount);
            custodyAccount.reservedBalance = totalPledged;
            custodyAccount.availableBalance = custodyAccount.totalBalance - totalPledged;
            custodyStore.saveAccounts(accounts);

            console.log('[VUSD→Custody] ✅ Balance actualizado desde unified store:', {
              account: custodyAccount.accountName,
              totalBalance: custodyAccount.totalBalance,
              totalPledged: totalPledged,
              newAvailable: custodyAccount.availableBalance,
              newReserved: custodyAccount.reservedBalance
            });
          }
        } catch (reserveError) {
          console.warn('[VUSD→Custody] ⚠️ Error actualizando balance (no crítico):', reserveError);
        }
      }

      // ========================================
      // INTEGRACIÓN AUTOMÁTICA CON API VUSD1
      // ========================================
      try {
        console.log('[VUSD→VUSD1] 🔄 Replicando pledge a API VUSD1...');

        const custodyAccountName = selectedCustodyAccount
          ? custodyAccounts.find(a => a.id === selectedCustodyAccount)?.accountName
          : 'manual';

        const vusd1Pledge = await apiVUSD1Store.createPledge({
          amount: pledgeForm.amount,
          currency: pledgeForm.currency,
          beneficiary: pledgeForm.beneficiary,
          external_ref: result.pledge_id || `VUSD_${Date.now()}`,
          expires_at: pledgeForm.expires_at || undefined,
          metadata: {
            source: 'API_VUSD',
            original_pledge_id: result.pledge_id,
            custody_account_id: selectedCustodyAccount || null,
            custody_account_name: custodyAccountName,
            created_from: 'APIVUSDModule',
            validation: 'capital_disponible_verificado',
            no_duplicate: 'validado'
          },
          idempotency_key: `VUSD_${result.pledge_id || Date.now()}`
        });

        console.log('[VUSD→VUSD1] ✅ Pledge replicado exitosamente en API VUSD1:', vusd1Pledge.pledge_id);
        console.log('[VUSD→VUSD1] 📊 Circulating Cap actualizado automáticamente');
        console.log('[VUSD→VUSD1] 📨 Webhook HMAC queued hacia Anchor');

        // Link unified pledge with VUSD1
        if (unifiedPledge) {
          unifiedPledgeStore.linkVUSD1Pledge(unifiedPledge.id, vusd1Pledge.pledge_id);
          console.log('[VUSD→VUSD1] 🔗 Linked unified pledge with VUSD1 pledge');
        }

      } catch (vusd1Error) {
        console.warn('[VUSD→VUSD1] ⚠️ Error replicando a VUSD1 (no crítico):', vusd1Error);
        // No bloqueamos el flujo principal si VUSD1 falla
      }

      // Cerrar modal y limpiar
      setShowPledgeModal(false);
      setSelectedCustodyAccount('');
      setPledgeForm({ amount: 0, currency: 'USD', beneficiary: '', expires_at: '' });

      // Forzar actualización de caché y recargar datos
      console.log('[VUSD] 🔄 Recargando datos y caché...');
      await vusdCapStore.initializeCache(); // Forzar actualización de caché
      await loadData(); // Recargar todos los datos
      loadCustodyAccounts(); // Recargar cuentas custody con balances actualizados

      console.log('[VUSD] ✅ Datos recargados, pledge debe estar visible');

      // Guardar datos del pledge para Black Screen
      setLastPledgeData({
        currency: pledgeForm.currency,
        amount: pledgeForm.amount,
        beneficiary: pledgeForm.beneficiary,
      });

      // Notificar éxito
      alert(t.pledgeSuccess + '\n\n' +
            `Pledge ID: ${result.pledge_id || 'N/A'}\n` +
            `Amount: ${pledgeForm.currency} ${pledgeForm.amount.toLocaleString()}\n` +
            `Beneficiary: ${pledgeForm.beneficiary}\n\n` +
            `✅ Auto-synced to API VUSD1\n` +
            `📊 Circulating Cap Updated\n` +
            `📨 Webhook Queued to Anchor`);
    } catch (err) {
      const error = err as Error;
      console.error('[VUSD] ❌ Error creando pledge:', error);
      setError(error.message || 'Pledge creation failed');
      alert((language === 'es' ? 'Error creando pledge: ' : 'Error creating pledge: ') + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateBlackScreen = () => {
    if (!lastPledgeData) {
      alert('No pledge data available. Please create a pledge first.');
      return;
    }

    try {
      const blackScreenData = generateBlackScreenData({
        currency: lastPledgeData.currency,
        totalAmount: lastPledgeData.amount,
        transactionCount: 1,
        beneficiaryName: lastPledgeData.beneficiary,
        beneficiaryBank: 'DAES - DATA AND EXCHANGE SETTLEMENT',
      });

      downloadBlackScreenHTML(blackScreenData);
      alert('✅ Black Screen generated and downloaded successfully!');
    } catch (error) {
      console.error('[VUSD] Error generating Black Screen:', error);
      alert('❌ Error generating Black Screen. Please try again.');
    }
  };

  const handlePublishPor = async () => {
    try {
      setLoading(true);
      setError(null);

      const result = await vusdCapStore.publishPor();
      alert(`${t.porPublished}\nTX ID: ${result.txId || 'N/A'}`);
      await loadData();
    } catch (err) {
      const error = err as Error;
      setError(error.message || 'PoR publication failed');
    } finally {
      setLoading(false);
    }
  };

  const handleDeletePledge = async (pledge: Pledge) => {
    try {
      // Confirmación con detalles del pledge
      const confirmMessage =
        `¿Eliminar este pledge?\n\n` +
        `Pledge ID: ${pledge.pledge_id}\n` +
        `Amount: ${pledge.currency} ${pledge.amount.toLocaleString()}\n` +
        `Beneficiary: ${pledge.beneficiary}\n\n` +
        `El capital será liberado y podrás crear un nuevo pledge.`;

      if (!window.confirm(confirmMessage)) {
        return;
      }

      setLoading(true);
      setError(null);

      console.log('[VUSD] 🗑️ Eliminando pledge:', pledge.pledge_id);

      // Eliminar pledge (marca como RELEASED)
      await vusdCapStore.deletePledge(pledge.pledge_id);

      console.log('[VUSD] ✅ Pledge eliminado exitosamente');

      // ========================================
      // SINCRONIZAR ELIMINACIÓN CON API VUSD1
      // ========================================
      try {
        console.log('[VUSD→VUSD1] 🔄 Eliminando pledge replicado en API VUSD1...');

        // Buscar el pledge correspondiente en VUSD1 por external_ref
        const vusd1Pledges = await apiVUSD1Store.getActivePledges();
        const matchingPledge = vusd1Pledges.find(p =>
          p.external_ref === pledge.pledge_id ||
          p.metadata?.original_pledge_id === pledge.pledge_id
        );

        if (matchingPledge) {
          await apiVUSD1Store.deletePledge(matchingPledge.pledge_id);
          console.log('[VUSD→VUSD1] ✅ Pledge eliminado en API VUSD1:', matchingPledge.pledge_id);
        } else {
          console.log('[VUSD→VUSD1] ℹ️ No se encontró pledge replicado en VUSD1');
        }
      } catch (vusd1Error) {
        console.warn('[VUSD→VUSD1] ⚠️ Error eliminando en VUSD1 (no crítico):', vusd1Error);
      }

      // ========================================
      // LIBERAR EN UNIFIED PLEDGE STORE (CENTRAL)
      // ========================================
      try {
        const unifiedPledges = unifiedPledgeStore.getPledges();
        const matchingUnifiedPledge = unifiedPledges.find(p =>
          p.external_ref === pledge.pledge_id ||
          p.vusd_pledge_id === pledge.pledge_id
        );

        if (matchingUnifiedPledge) {
          unifiedPledgeStore.releasePledge(matchingUnifiedPledge.id);
          console.log('[VUSD→Unified] ✅ Released pledge in unified store:', matchingUnifiedPledge.id);
        }
      } catch (unifiedError) {
        console.warn('[VUSD→Unified] ⚠️ Error releasing unified pledge (no crítico):', unifiedError);
      }

      // ========================================
      // LIBERAR CAPITAL EN CUSTODY STORE
      // ========================================
      if (pledge.custody_account_id) {
        try {
          const accounts = custodyStore.getAccounts();
          const custodyAccount = accounts.find(a => a.id === pledge.custody_account_id);
          if (custodyAccount) {
            // IMPORTANTE: Recalcular desde unified store
            const totalPledged = unifiedPledgeStore.getTotalPledgedAmount(pledge.custody_account_id);
            custodyAccount.reservedBalance = totalPledged;
            custodyAccount.availableBalance = custodyAccount.totalBalance - totalPledged;
            custodyStore.saveAccounts(accounts);

            console.log('[VUSD→Custody] ✅ Capital recalculado desde unified store:', {
              account: custodyAccount.accountName,
              totalBalance: custodyAccount.totalBalance,
              totalPledged: totalPledged,
              newAvailable: custodyAccount.availableBalance,
              newReserved: custodyAccount.reservedBalance
            });

            // Recargar cuentas custody
            loadCustodyAccounts();
          }
        } catch (releaseError) {
          console.warn('[VUSD→Custody] ⚠️ Error liberando capital (no crítico):', releaseError);
        }
      }

      // Recargar datos
      await vusdCapStore.initializeCache();
      await loadData();

      alert(
        `✅ Pledge eliminado exitosamente\n\n` +
        `Pledge ID: ${pledge.pledge_id}\n` +
        `Amount: ${pledge.currency} ${pledge.amount.toLocaleString()}\n\n` +
        `💡 El capital ha sido liberado.\n` +
        `Ahora puedes crear un nuevo pledge desde esta cuenta custody.`
      );

    } catch (err) {
      const error = err as Error;
      console.error('[VUSD] ❌ Error eliminando pledge:', error);
      setError(error.message || 'Failed to delete pledge');
      alert('Error eliminando pledge: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const remaining = circulatingCap - circulatingOut;
  const utilizationPercent = circulatingCap > 0 ? (circulatingOut / circulatingCap) * 100 : 0;

  return (
    <div className="min-h-screen bg-black text-white p-6">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-[#00ff88] flex items-center gap-3">
              <Shield className="w-8 h-8" />
              {t.title}
            </h1>
            <p className="text-[#80ff80] mt-2">{t.subtitle}</p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={loadData}
              disabled={loading}
              className="px-4 py-2 bg-[#00ff88]/20 border border-[#00ff88] text-[#00ff88] rounded-lg hover:bg-[#00ff88]/30 disabled:opacity-50 flex items-center gap-2"
            >
              <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
              {t.refreshData}
            </button>
          </div>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="mb-6 p-4 bg-red-500/20 border border-red-500 rounded-lg flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-red-400" />
          <span className="text-red-200">{error}</span>
        </div>
      )}

      {/* Navigation Tabs */}
      <div className="flex gap-2 mb-6 border-b border-[#1a1a1a]">
        {(['overview', 'pledges', 'transfers', 'por'] as const).map((view) => (
          <button
            key={view}
            onClick={() => setSelectedView(view)}
            className={`px-6 py-3 font-medium transition-colors ${
              selectedView === view
                ? 'text-[#00ff88] border-b-2 border-[#00ff88]'
                : 'text-[#4d7c4d] hover:text-[#80ff80]'
            }`}
          >
            {t[view]}
          </button>
        ))}
      </div>

      {/* Overview Section */}
      {selectedView === 'overview' && (
        <div className="space-y-6">
          {/* Key Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Circulating Cap */}
            <div className="bg-[#0d0d0d] border border-[#00ff88] rounded-lg p-6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[#80ff80] text-sm">{t.circulatingCap}</span>
                <Lock className="w-5 h-5 text-[#00ff88]" />
              </div>
              <div className="text-3xl font-bold text-[#00ff88]">
                ${circulatingCap.toLocaleString()}
              </div>
            </div>

            {/* Circulating Out */}
            <div className="bg-[#0d0d0d] border border-blue-500 rounded-lg p-6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-blue-300 text-sm">{t.circulatingOut}</span>
                <Unlock className="w-5 h-5 text-blue-400" />
              </div>
              <div className="text-3xl font-bold text-blue-400">
                ${circulatingOut.toLocaleString()}
              </div>
            </div>

            {/* Remaining */}
            <div className="bg-[#0d0d0d] border border-yellow-500 rounded-lg p-6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-yellow-300 text-sm">{t.remaining}</span>
                <TrendingUp className="w-5 h-5 text-yellow-400" />
              </div>
              <div className="text-3xl font-bold text-yellow-400">
                ${remaining.toLocaleString()}
              </div>
            </div>

            {/* Pledged USD */}
            <div className="bg-[#0d0d0d] border border-purple-500 rounded-lg p-6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-purple-300 text-sm">{t.pledgedUSD}</span>
                <DollarSign className="w-5 h-5 text-purple-400" />
              </div>
              <div className="text-3xl font-bold text-purple-400">
                ${pledgedUSD.toLocaleString()}
              </div>
            </div>
          </div>

          {/* Utilization Bar */}
          <div className="bg-[#0d0d0d] border border-[#1a1a1a] rounded-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <span className="text-[#80ff80] font-medium">Cap Utilization</span>
              <span className="text-[#00ff88] font-bold">{utilizationPercent.toFixed(2)}%</span>
            </div>
            <div className="h-4 bg-[#1a1a1a] rounded-full overflow-hidden">
              <div
                className={`h-full transition-all duration-500 ${
                  utilizationPercent > 90 ? 'bg-red-500' : utilizationPercent > 70 ? 'bg-yellow-500' : 'bg-[#00ff88]'
                }`}
                style={{ width: `${Math.min(utilizationPercent, 100)}%` }}
              />
            </div>
          </div>

          {/* Quick Actions */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <button
              onClick={() => setShowTransferModal(true)}
              className="bg-[#0d0d0d] border border-[#00ff88] rounded-lg p-6 hover:bg-[#00ff88]/10 transition-colors flex items-center gap-4"
            >
              <Send className="w-8 h-8 text-[#00ff88]" />
              <div className="text-left">
                <div className="font-bold text-[#00ff88]">{t.createTransfer}</div>
                <div className="text-sm text-[#4d7c4d]">With cap enforcement</div>
              </div>
            </button>

            <button
              onClick={() => setShowPledgeModal(true)}
              className="bg-[#0d0d0d] border border-purple-500 rounded-lg p-6 hover:bg-purple-500/10 transition-colors flex items-center gap-4"
            >
              <Lock className="w-8 h-8 text-purple-400" />
              <div className="text-left">
                <div className="font-bold text-purple-400">{t.createPledge}</div>
                <div className="text-sm text-purple-300">Create new pledge</div>
              </div>
            </button>

            <button
              onClick={handlePublishPor}
              disabled={loading}
              className="bg-[#0d0d0d] border border-blue-500 rounded-lg p-6 hover:bg-blue-500/10 transition-colors flex items-center gap-4 disabled:opacity-50"
            >
              <Database className="w-8 h-8 text-blue-400" />
              <div className="text-left">
                <div className="font-bold text-blue-400">{t.publishPor}</div>
                <div className="text-sm text-blue-300">Publish to blockchain</div>
              </div>
            </button>
          </div>
        </div>
      )}

      {/* Pledges Section */}
      {selectedView === 'pledges' && (
        <div className="bg-[#0d0d0d] border border-[#1a1a1a] rounded-lg">
          <div className="p-6 border-b border-[#1a1a1a] flex items-center justify-between">
            <h2 className="text-xl font-bold text-[#00ff88]">{t.pledges}</h2>
            <div className="flex items-center gap-3">
              {lastPledgeData && (
                <button
                  onClick={handleGenerateBlackScreen}
                  className="px-4 py-2 bg-green-600/20 border border-green-500 text-green-400 rounded-lg hover:bg-green-600/30 flex items-center gap-2"
                >
                  <FileText className="w-4 h-4" />
                  Generate Black Screen
                </button>
              )}
              <button
                onClick={() => setShowPledgeModal(true)}
                className="px-4 py-2 bg-[#00ff88]/20 border border-[#00ff88] text-[#00ff88] rounded-lg hover:bg-[#00ff88]/30 flex items-center gap-2"
              >
                <Lock className="w-4 h-4" />
                {t.createPledge}
              </button>
            </div>
          </div>
          <div className="p-6">
            {activePledges.length === 0 ? (
              <div className="text-center py-12 text-[#4d7c4d]">{t.noData}</div>
            ) : (
              <div className="space-y-3">
                {activePledges.map((pledge) => (
                  <div
                    key={pledge.pledge_id}
                    className="bg-[#0a0a0a] border border-[#00ff88]/30 rounded-lg p-4 hover:border-[#00ff88] transition-colors"
                  >
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <span className="px-2 py-1 bg-[#00ff88]/20 text-[#00ff88] text-xs rounded">
                            {pledge.status}
                          </span>
                          <span className="text-[#80ff80] font-mono text-sm">
                            {pledge.pledge_id}
                          </span>
                        </div>
                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div>
                            <span className="text-[#4d7c4d]">{t.amount}: </span>
                            <span className="text-[#00ff88] font-bold">
                              ${pledge.amount.toLocaleString()} {pledge.currency}
                            </span>
                          </div>
                          <div>
                            <span className="text-[#4d7c4d]">Available: </span>
                            <span className="text-[#00ff88]">
                              ${pledge.available.toLocaleString()}
                            </span>
                          </div>
                          <div>
                            <span className="text-[#4d7c4d]">{t.beneficiary}: </span>
                            <span className="text-white">{pledge.beneficiary}</span>
                          </div>
                          {pledge.expires_at && (
                            <div>
                              <span className="text-[#4d7c4d]">{t.expiresAt}: </span>
                              <span className="text-yellow-400">
                                {new Date(pledge.expires_at).toLocaleDateString()}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                      <button
                        onClick={() => handleDeletePledge(pledge)}
                        disabled={loading}
                        className="p-3 bg-red-500/10 border border-red-500/30 text-red-400 rounded-lg hover:bg-red-500/20 hover:border-red-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        title="Eliminar pledge"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Transfers Section */}
      {selectedView === 'transfers' && (
        <div className="bg-[#0d0d0d] border border-[#1a1a1a] rounded-lg">
          <div className="p-6 border-b border-[#1a1a1a] flex items-center justify-between">
            <h2 className="text-xl font-bold text-[#00ff88]">{t.transfers}</h2>
            <button
              onClick={() => setShowTransferModal(true)}
              className="px-4 py-2 bg-[#00ff88]/20 border border-[#00ff88] text-[#00ff88] rounded-lg hover:bg-[#00ff88]/30 flex items-center gap-2"
            >
              <Send className="w-4 h-4" />
              {t.createTransfer}
            </button>
          </div>
          <div className="p-6">
            {recentTransfers.length === 0 ? (
              <div className="text-center py-12 text-[#4d7c4d]">{t.noData}</div>
            ) : (
              <div className="space-y-3">
                {recentTransfers.map((transfer) => (
                  <div
                    key={transfer.id}
                    className="bg-[#0a0a0a] border border-blue-500/30 rounded-lg p-4 hover:border-blue-500 transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <ArrowUpRight className="w-4 h-4 text-blue-400" />
                          <span className="text-[#80ff80] font-mono text-sm">
                            {transfer.external_ref}
                          </span>
                        </div>
                        <div className="grid grid-cols-3 gap-4 text-sm">
                          <div>
                            <span className="text-[#4d7c4d]">{t.amount}: </span>
                            <span className="text-blue-400 font-bold">
                              ${transfer.amount.toLocaleString()} {transfer.currency}
                            </span>
                          </div>
                          <div>
                            <span className="text-[#4d7c4d]">{t.toAccount}: </span>
                            <span className="text-white">{transfer.to_account}</span>
                          </div>
                          <div>
                            <span className="text-[#4d7c4d]">Date: </span>
                            <span className="text-[#80ff80]">
                              {new Date(transfer.created_at).toLocaleString()}
                            </span>
                          </div>
                        </div>
                      </div>
                      <CheckCircle className="w-5 h-5 text-[#00ff88]" />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* PoR Section */}
      {selectedView === 'por' && (
        <div className="bg-[#0d0d0d] border border-[#1a1a1a] rounded-lg">
          <div className="p-6 border-b border-[#1a1a1a] flex items-center justify-between">
            <h2 className="text-xl font-bold text-[#00ff88]">{t.por}</h2>
            <button
              onClick={handlePublishPor}
              disabled={loading}
              className="px-4 py-2 bg-[#00ff88]/20 border border-[#00ff88] text-[#00ff88] rounded-lg hover:bg-[#00ff88]/30 flex items-center gap-2 disabled:opacity-50"
            >
              <Database className="w-4 h-4" />
              {t.publishPor}
            </button>
          </div>
          <div className="p-6">
            {porPublications.length === 0 ? (
              <div className="text-center py-12 text-[#4d7c4d]">{t.noData}</div>
            ) : (
              <div className="space-y-3">
                {porPublications.map((por, idx) => (
                  <div
                    key={por.id}
                    className="bg-[#0a0a0a] border border-purple-500/30 rounded-lg p-4 hover:border-purple-500 transition-colors"
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <Activity className="w-5 h-5 text-purple-400" />
                        <span className="text-white font-bold">
                          {idx === 0 ? t.lastPor : `PoR #${por.id}`}
                        </span>
                      </div>
                      <Clock className="w-4 h-4 text-[#4d7c4d]" />
                    </div>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-[#4d7c4d]">Circ Cap: </span>
                        <span className="text-[#00ff88] font-bold">
                          ${por.circ_cap.toLocaleString()}
                        </span>
                      </div>
                      <div>
                        <span className="text-[#4d7c4d]">Pledged: </span>
                        <span className="text-purple-400 font-bold">
                          ${por.pledged_usd.toLocaleString()}
                        </span>
                      </div>
                      <div>
                        <span className="text-[#4d7c4d]">{t.asOf}: </span>
                        <span className="text-[#80ff80]">
                          {new Date(por.por_asof).toLocaleString()}
                        </span>
                      </div>
                      {por.tx_id && (
                        <div>
                          <span className="text-[#4d7c4d]">{t.txId}: </span>
                          <span className="text-blue-400 font-mono text-xs">
                            {por.tx_id.substring(0, 16)}...
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Transfer Modal */}
      {showTransferModal && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="bg-[#0d0d0d] border border-[#00ff88] rounded-lg max-w-md w-full p-6">
            <h3 className="text-xl font-bold text-[#00ff88] mb-4">{t.createTransfer}</h3>
            <form onSubmit={handleCreateTransfer} className="space-y-4">
              <div>
                <label className="block text-[#80ff80] text-sm mb-2">{t.externalRef}</label>
                <input
                  type="text"
                  value={transferForm.external_ref}
                  onChange={(e) => setTransferForm({ ...transferForm, external_ref: e.target.value })}
                  className="w-full bg-[#0a0a0a] border border-[#1a1a1a] rounded px-4 py-2 text-white"
                  required
                />
              </div>
              <div>
                <label className="block text-[#80ff80] text-sm mb-2">{t.amount} (USD)</label>
                <input
                  type="number"
                  step="0.01"
                  value={transferForm.amount}
                  onChange={(e) => setTransferForm({ ...transferForm, amount: parseFloat(e.target.value) || 0 })}
                  className="w-full bg-[#0a0a0a] border border-[#1a1a1a] rounded px-4 py-2 text-white"
                  required
                />
              </div>
              <div>
                <label className="block text-[#80ff80] text-sm mb-2">{t.toAccount}</label>
                <input
                  type="text"
                  value={transferForm.to_account}
                  onChange={(e) => setTransferForm({ ...transferForm, to_account: e.target.value })}
                  className="w-full bg-[#0a0a0a] border border-[#1a1a1a] rounded px-4 py-2 text-white"
                  required
                />
              </div>
              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowTransferModal(false)}
                  className="flex-1 px-4 py-2 bg-[#1a1a1a] border border-[#2a2a2a] text-white rounded-lg hover:bg-[#2a2a2a]"
                >
                  {t.cancel}
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 px-4 py-2 bg-[#00ff88] text-black rounded-lg hover:bg-[#00cc6a] disabled:opacity-50 font-bold"
                >
                  {loading ? t.loading : t.submit}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Pledge Modal */}
      {showPledgeModal && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="bg-[#0d0d0d] border border-purple-500 rounded-lg max-w-2xl w-full p-6">
            <h3 className="text-xl font-bold text-purple-400 mb-4">{t.createPledge}</h3>
            <form onSubmit={handleCreatePledge} className="space-y-4">
              {/* Selector de Cuenta Custodio - Solo si existen cuentas */}
              {custodyAccounts.length > 0 ? (
                <>
                  <div>
                    <label className="block text-purple-300 text-sm mb-2">{t.selectCustodyAccount}</label>
                    <select
                      value={selectedCustodyAccount}
                      onChange={(e) => handleCustodyAccountSelect(e.target.value)}
                      className="w-full bg-[#0a0a0a] border border-[#1a1a1a] rounded px-4 py-2 text-white"
                    >
                      <option value="">{t.manualEntry}</option>
                      {custodyAccounts.map(account => (
                        <option key={account.id} value={account.id}>
                          {account.accountName} - {account.currency} {account.totalBalance.toLocaleString()}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Información de cuenta seleccionada */}
                  {selectedCustodyAccount && custodyAccounts.find(a => a.id === selectedCustodyAccount) && (
                    <div className="bg-purple-900/20 border border-purple-500/40 rounded-lg p-4">
                      <div className="text-sm font-semibold text-purple-400 mb-2">{t.custodyAccountInfo}</div>
                      {(() => {
                        const account = custodyAccounts.find(a => a.id === selectedCustodyAccount)!;
                        return (
                          <div className="space-y-1 text-xs text-purple-300/80">
                            <div>• {t.beneficiary}: {account.accountName}</div>
                            <div>• {t.totalBalance}: {account.currency} {account.totalBalance.toLocaleString()}</div>
                            <div>• {t.availableBalance}: {account.currency} {account.availableBalance.toLocaleString()}</div>
                            <div>• Currency: {account.currency}</div>
                            {account.blockchain && <div>• Blockchain: {account.blockchain}</div>}
                          </div>
                        );
                      })()}
                    </div>
                  )}
                </>
              ) : (
                <div className="bg-yellow-900/20 border border-yellow-500/40 rounded-lg p-4">
                  <div className="text-sm text-yellow-300">
                    <AlertCircle className="w-4 h-4 inline mr-2" />
                    No custody accounts available. Using manual entry mode.
                  </div>
                  <div className="text-xs text-yellow-300/60 mt-2">
                    Go to <span className="font-semibold">Custody Accounts</span> module to create accounts.
                  </div>
                </div>
              )}

              <div>
                <label className="block text-purple-300 text-sm mb-2">{t.amount}</label>
                <input
                  type="number"
                  step="0.01"
                  value={pledgeForm.amount}
                  onChange={(e) => setPledgeForm({ ...pledgeForm, amount: parseFloat(e.target.value) || 0 })}
                  className="w-full bg-[#0a0a0a] border border-[#1a1a1a] rounded px-4 py-2 text-white"
                  required
                  disabled={!!selectedCustodyAccount}
                />
              </div>

              <div>
                <label className="block text-purple-300 text-sm mb-2">{t.beneficiary}</label>
                <input
                  type="text"
                  value={pledgeForm.beneficiary}
                  onChange={(e) => setPledgeForm({ ...pledgeForm, beneficiary: e.target.value })}
                  className="w-full bg-[#0a0a0a] border border-[#1a1a1a] rounded px-4 py-2 text-white"
                  required
                  disabled={!!selectedCustodyAccount}
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowPledgeModal(false);
                    setSelectedCustodyAccount('');
                    setPledgeForm({
                      amount: 0,
                      currency: 'USD',
                      beneficiary: '',
                      expires_at: ''
                    });
                  }}
                  className="flex-1 px-4 py-2 bg-[#1a1a1a] border border-[#2a2a2a] text-white rounded-lg hover:bg-[#2a2a2a]"
                >
                  {t.cancel}
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 px-6 py-3 bg-purple-500 text-white rounded-lg hover:bg-purple-600 disabled:opacity-50 font-bold flex items-center justify-center gap-2 transition-all"
                >
                  {loading ? (
                    <>
                      <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                      {t.loading}
                    </>
                  ) : (
                    <>
                      <Lock className="w-5 h-5" />
                      Create Pledge
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
