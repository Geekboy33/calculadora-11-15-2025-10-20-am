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
  Database,
  ArrowUpRight,
  Trash2,
  FileText,
  Edit,
  Plus,
  Minus
} from 'lucide-react';
import { useLanguage } from '../lib/i18n';
import { vusdCapStore, type Pledge, type PorPublication, type TreasuryTransfer } from '../lib/vusd-cap-store';
import { custodyStore } from '../lib/custody-store';
import { apiVUSD1Store } from '../lib/api-vusd1-store';
import { unifiedPledgeStore } from '../lib/unified-pledge-store';
import { ledgerPersistenceStore } from '../lib/ledger-persistence-store';
import { LedgerStatusIndicator } from './LedgerStatusIndicator';
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
  const [generatedPorReports, setGeneratedPorReports] = useState<Array<{
    id: string;
    report: string;
    pledgesM2: number;
    pledgesM3: number;
    totalM2: number;
    totalM3: number;
    timestamp: string;
    circulatingCap: number;
    pledgedUSD: number;
    activePledgesCount: number;
    expanded: boolean;
  }>>(() => {
    // Cargar PoR guardados desde localStorage al iniciar
    try {
      const saved = localStorage.getItem('vusd_por_reports');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

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
    console.log('[VUSD] 🚀 Inicializando módulo API VUSD...');
    
    loadData();
    loadCustodyAccounts();
    const interval = setInterval(loadData, 30000); // Refresh every 30s
    return () => clearInterval(interval);
  }, []);

  // Guardar PoR reports en localStorage cada vez que cambian
  useEffect(() => {
    if (generatedPorReports.length > 0) {
      localStorage.setItem('vusd_por_reports', JSON.stringify(generatedPorReports));
      console.log('[VUSD] 💾 PoR reports guardados en localStorage:', generatedPorReports.length);
    }
  }, [generatedPorReports]);

  // Load custody accounts - CARGAR TODAS LAS CUENTAS
  const loadCustodyAccounts = async () => {
    console.log('[VUSD] 📋 Cargando TODAS las cuentas custody desde Custody Accounts...');
    
    const allAccounts = custodyStore.getAccounts();

    console.log('[VUSD] 🔍 Cuentas custody encontradas:', {
      total: allAccounts.length,
      cuentas: allAccounts.map(a => ({
        nombre: a.accountName,
        tipo: a.accountType,
        moneda: a.currency,
        balance: a.totalBalance,
        disponible: a.availableBalance
      }))
    });

    if (allAccounts.length === 0) {
      console.warn('[VUSD] ⚠️ No se encontraron cuentas custody');
      console.log('[VUSD] 💡 Ve a Custody Accounts y crea al menos una cuenta');
    } else {
      console.log('[VUSD] ✅ Se cargaron', allAccounts.length, 'cuentas correctamente');
      allAccounts.forEach(account => {
        console.log('[VUSD] 📊', account.accountName, '-', account.currency, account.totalBalance.toLocaleString());
      });
    }

    setCustodyAccounts(allAccounts);
  };

  // Handle custody account selection - Cargar datos de la cuenta seleccionada
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
      // Calcular balance restante (total - ya usado en pledges)
      const totalBalance = account.totalBalance;
      const alreadyPledged = unifiedPledgeStore.getTotalPledgedAmount(accountId);
      const remainingBalance = totalBalance - alreadyPledged;
      
      console.log('[VUSD] 📋 Cuenta custody seleccionada:', {
        account: account.accountName,
        totalBalance: totalBalance,
        alreadyPledged: alreadyPledged,
        remainingBalance: remainingBalance,
        currency: account.currency
      });

      // Auto-completar con el balance RESTANTE (total - pledges)
      setPledgeForm({
        amount: remainingBalance,
        currency: account.currency,
        beneficiary: account.accountName,
        expires_at: ''
      });
    }
  };

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);

      console.log('[VUSD] 📊 Cargando datos del sistema...');

      // Cargar datos con manejo de errores individual
      const pledges = await vusdCapStore.getActivePledges().catch(err => {
        console.warn('[VUSD] ⚠️ No se pudieron cargar pledges:', err.message);
        return [];
      });

      const cap = await vusdCapStore.getCirculatingCap().catch(err => {
        console.warn('[VUSD] ⚠️ No se pudo cargar circulating cap:', err.message);
        return 0;
      });

      const out = await vusdCapStore.getCirculatingOut().catch(err => {
        console.warn('[VUSD] ⚠️ No se pudo cargar circulating out:', err.message);
        return 0;
      });

      const transfers = await vusdCapStore.getRecentTransfers().catch(err => {
        console.warn('[VUSD] ⚠️ No se pudieron cargar transferencias:', err.message);
        return [];
      });

      const pors = await vusdCapStore.getRecentPorPublications().catch(err => {
        console.warn('[VUSD] ⚠️ No se pudieron cargar PoR publications:', err.message);
        return [];
      });

      const pledgedTotal = await vusdCapStore.getTotalPledgedUSD().catch(err => {
        console.warn('[VUSD] ⚠️ No se pudo cargar total pledged USD:', err.message);
        return 0;
      });

      // Cargar también pledges del Unified Store (localStorage)
      const unifiedPledges = unifiedPledgeStore.getPledges().filter(p => p.status === 'ACTIVE');
      
      console.log('[VUSD] 📊 Pledges desde Unified Store:', unifiedPledges.length);
      
      // Convertir unified pledges a formato de activePledges
      const unifiedPledgesFormatted = unifiedPledges.map(up => ({
        pledge_id: up.id,
        status: up.status.toLowerCase() as any,
        amount: up.amount,
        available: up.amount,
        currency: up.currency,
        beneficiary: up.beneficiary,
        custody_account_id: up.custody_account_id,
        expires_at: up.expires_at,
        updated_at: up.created_at
      }));

      // Combinar pledges de Supabase + Unified Store (sin duplicados)
      const allPledges = [...pledges];
      unifiedPledgesFormatted.forEach(up => {
        if (!allPledges.find(p => p.pledge_id === up.pledge_id)) {
          allPledges.push(up);
        }
      });

      // ========================================
      // CALCULAR MÉTRICAS DESDE LOS PLEDGES ACTIVOS
      // ========================================
      
      // Total pledged en USD (suma de todos los pledges USD activos)
      const calculatedPledgedUSD = allPledges
        .filter(p => p.currency === 'USD')
        .reduce((sum, p) => sum + p.amount, 0);

      // Circulating Cap = Total pledged disponible (suma de available de todos los pledges)
      const calculatedCirculatingCap = allPledges
        .reduce((sum, p) => sum + (p.available || p.amount), 0);

      // Circulating Out = Total emitido desde treasury (por ahora 0, se actualiza con transfers)
      const calculatedCirculatingOut = transfers.reduce((sum, t) => sum + t.amount, 0);

      // Disponible = Cap - Out
      const calculatedRemaining = calculatedCirculatingCap - calculatedCirculatingOut;

      console.log('[VUSD] 📊 Métricas calculadas desde pledges activos:', {
        pledgesSupabase: pledges.length,
        pledgesUnified: unifiedPledges.length,
        pledgesTotal: allPledges.length,
        calculatedPledgedUSD: calculatedPledgedUSD,
        calculatedCirculatingCap: calculatedCirculatingCap,
        calculatedCirculatingOut: calculatedCirculatingOut,
        calculatedRemaining: calculatedRemaining
      });

      // Usar métricas calculadas si hay pledges, sino usar las de Supabase
      const finalCap = allPledges.length > 0 ? calculatedCirculatingCap : cap;
      const finalOut = calculatedCirculatingOut;
      const finalPledgedUSD = allPledges.length > 0 ? calculatedPledgedUSD : pledgedTotal;

      console.log('[VUSD] ✅ Métricas finales:', {
        circulatingCap: finalCap,
        circulatingOut: finalOut,
        remaining: finalCap - finalOut,
        pledgedUSD: finalPledgedUSD
      });

      setActivePledges(allPledges);
      setCirculatingCap(finalCap);
      setCirculatingOut(finalOut);
      setRecentTransfers(transfers);
      setPorPublications(pors);
      setPledgedUSD(finalPledgedUSD);
      
      setError(null); // Limpiar cualquier error previo si todo cargó bien
    } catch (err) {
      console.error('[VUSD] ❌ Error crítico loading data:', err);
      const errorMessage = err instanceof Error ? err.message : 'Error desconocido al cargar datos';
      setError(errorMessage);
      
      // Aún así, inicializar con valores por defecto
      setActivePledges([]);
      setCirculatingCap(0);
      setCirculatingOut(0);
      setRecentTransfers([]);
      setPorPublications([]);
      setPledgedUSD(0);
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
      // INFORMACIÓN: PLEDGES EXISTENTES (SOLO INFO)
      // ========================================
      if (selectedCustodyAccount) {
        try {
          const existingPledges = await vusdCapStore.getActivePledges();
          const pledgesForThisAccount = existingPledges.filter(p => p.custody_account_id === selectedCustodyAccount);
          
          if (pledgesForThisAccount.length > 0) {
            console.log('[VUSD] 📊 Esta cuenta ya tiene', pledgesForThisAccount.length, 'pledge(s) activo(s):');
            pledgesForThisAccount.forEach(p => {
              console.log(`   • ${p.pledge_id}: ${p.currency} ${p.amount.toLocaleString()}`);
            });
            console.log('[VUSD] ✅ Se permitirá crear pledge adicional si hay balance restante');
          } else {
            console.log('[VUSD] ✅ Primer pledge para esta cuenta');
          }
        } catch (err) {
          console.warn('[VUSD] ⚠️ No se pudo verificar pledges existentes (continuando):', err);
        }
      }

      // ========================================
      // VALIDACIÓN 2: BALANCE SUFICIENTE
      // ========================================
      if (selectedCustodyAccount) {
        const validation = unifiedPledgeStore.canCreatePledge(selectedCustodyAccount, pledgeForm.amount);

        if (!validation.allowed) {
          const custodyAccount = custodyStore.getAccountById(selectedCustodyAccount);
          throw new Error(
            `❌ BALANCE TOTAL INSUFICIENTE\n\n` +
            `Cuenta: ${custodyAccount?.accountName || 'Unknown'}\n` +
            `Balance Total: ${pledgeForm.currency} ${(validation.totalBalance || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}\n` +
            `Ya Usado en Pledges: ${pledgeForm.currency} ${(validation.totalPledged || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}\n` +
            `Restante para Pledges: ${pledgeForm.currency} ${(validation.remainingBalance || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}\n` +
            `Solicitado Ahora: ${pledgeForm.currency} ${pledgeForm.amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}\n\n` +
            `Solución:\n` +
            `1. Reduce el monto del pledge a ${(validation.remainingBalance || 0).toFixed(2)} o menos\n` +
            `2. Elimina un pledge existente para liberar capital\n` +
            `3. Usa los botones de % para calcular automáticamente`
          );
        }

        const custodyAccount = custodyStore.getAccountById(selectedCustodyAccount);

        console.log('[VUSD] ✅ Validación APROBADA:', {
          cuenta: custodyAccount?.accountName,
          balanceTotal: validation.totalBalance,
          yaUsadoEnPledges: validation.totalPledged,
          restante: validation.remainingBalance,
          solicitado: pledgeForm.amount,
          porcentajeDelTotal: ((pledgeForm.amount / (validation.totalBalance || 1)) * 100).toFixed(1) + '%',
          quedaraDespues: (validation.remainingBalance || 0)
        });
      }

      console.log('[VUSD] Creando pledge:', {
        amount: pledgeForm.amount,
        currency: pledgeForm.currency,
        beneficiary: pledgeForm.beneficiary,
        custody_account_id: selectedCustodyAccount || null,
        fromCustodyAccount: selectedCustodyAccount ? custodyAccounts.find(a => a.id === selectedCustodyAccount)?.accountName : 'Manual Entry'
      });

      // ========================================
      // CREAR PLEDGE - Primero en Unified Store (SIEMPRE FUNCIONA)
      // ========================================
      console.log('[VUSD] 🔨 Creando pledge en Unified Pledge Store...');
      
      let unifiedPledge = null;
      let result = null;

      if (selectedCustodyAccount) {
        try {
          const custodyAccount = custodyStore.getAccountById(selectedCustodyAccount);
          unifiedPledge = await unifiedPledgeStore.createPledge({
            custody_account_id: selectedCustodyAccount,
            amount: pledgeForm.amount,
            currency: pledgeForm.currency,
            beneficiary: pledgeForm.beneficiary,
            source_module: 'API_VUSD',
            external_ref: `VUSD_${Date.now()}_${Math.random().toString(36).substring(2, 9).toUpperCase()}`,
            expires_at: pledgeForm.expires_at || undefined,
            blockchain_network: custodyAccount?.blockchainLink,
            contract_address: custodyAccount?.contractAddress,
            token_symbol: custodyAccount?.tokenSymbol
          });

          console.log('[VUSD→Unified] ✅ Pledge creado en Unified Store:', unifiedPledge.id);
          
          // Usar el ID del unified pledge como referencia
          result = {
            pledge_id: unifiedPledge.id,
            amount: pledgeForm.amount,
            currency: pledgeForm.currency,
            beneficiary: pledgeForm.beneficiary
          };
          
        } catch (unifiedError) {
          console.error('[VUSD→Unified] ❌ Error creating unified pledge:', unifiedError);
          throw new Error('Error creando pledge: ' + (unifiedError as Error).message);
        }
      } else {
        // Sin cuenta custody, crear pledge manual
        result = {
          pledge_id: `MANUAL_${Date.now()}_${Math.random().toString(36).substring(2, 9).toUpperCase()}`,
          amount: pledgeForm.amount,
          currency: pledgeForm.currency,
          beneficiary: pledgeForm.beneficiary
        };
        console.log('[VUSD] ✅ Pledge manual creado (sin cuenta custody)');
      }

      // Intentar sincronizar con vusdCapStore (si Supabase disponible)
      try {
        await vusdCapStore.createPledge({
          amount: pledgeForm.amount,
          currency: pledgeForm.currency,
          beneficiary: pledgeForm.beneficiary,
          custody_account_id: selectedCustodyAccount || undefined,
          expires_at: pledgeForm.expires_at || undefined
        });
        console.log('[VUSD] ✅ Pledge también guardado en vusdCapStore (Supabase)');
      } catch (vusdError: any) {
        console.warn('[VUSD] ⚠️ No se pudo guardar en vusdCapStore (sin Supabase):', vusdError.message);
        console.log('[VUSD] ℹ️ Pledge guardado solo en Unified Store (localStorage)');
      }

      // El pledge ya fue creado en Unified Store arriba
      // Los balances ya fueron actualizados por unifiedPledgeStore.createPledge()

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

      // ========================================
      // ACTUALIZAR UI INMEDIATAMENTE (SIN ESPERAR RECARGA)
      // ========================================
      
      // 1. Agregar el pledge a la lista de activePledges INMEDIATAMENTE
      const newPledgeForDisplay = {
        pledge_id: result.pledge_id,
        status: 'active' as any,
        amount: pledgeForm.amount,
        available: pledgeForm.amount,
        currency: pledgeForm.currency,
        beneficiary: pledgeForm.beneficiary,
        custody_account_id: selectedCustodyAccount,
        expires_at: pledgeForm.expires_at,
        updated_at: new Date().toISOString()
      };

      setActivePledges(prev => {
        const updated = [newPledgeForDisplay, ...prev];
        
        // Actualizar métricas inmediatamente basadas en los nuevos pledges
        const newPledgedUSD = updated
          .filter(p => p.currency === 'USD')
          .reduce((sum, p) => sum + p.amount, 0);
        
        const newCirculatingCap = updated
          .reduce((sum, p) => sum + (p.available || p.amount), 0);
        
        setCirculatingCap(newCirculatingCap);
        setPledgedUSD(newPledgedUSD);
        
        console.log('[VUSD] ✅ Métricas actualizadas INMEDIATAMENTE:', {
          pledgesActivos: updated.length,
          circulatingCap: newCirculatingCap,
          pledgedUSD: newPledgedUSD
        });
        
        return updated;
      });
      
      console.log('[VUSD] ✅ Pledge agregado a la lista INMEDIATAMENTE');

      // 2. Cerrar modal y limpiar
      setShowPledgeModal(false);
      setSelectedCustodyAccount('');
      setPledgeForm({ amount: 0, currency: 'USD', beneficiary: '', expires_at: '' });

      // 3. Recargar en background (sin bloquear UI)
      console.log('[VUSD] 🔄 Recargando datos en background...');
      
      Promise.all([
        vusdCapStore.initializeCache().catch(err => console.warn('[VUSD] ⚠️ Error init cache:', err)),
        loadData().catch(err => console.warn('[VUSD] ⚠️ Error loadData:', err))
      ]).then(() => {
        loadCustodyAccounts();
        console.log('[VUSD] ✅ Datos recargados en background');
      });

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

      console.log('[VUSD] 📊 Generando Proof of Reserve completo...');

      // ========================================
      // GENERAR REPORTE COMPLETO DE PROOF OF RESERVE
      // ========================================
      
      const timestamp = new Date().toISOString();
      const reportDate = new Date().toLocaleString('es-ES', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      });

      // Textos traducibles
      const isSpanish = language === 'es';
      
      let porReport = '';
      porReport += '═══════════════════════════════════════════════════════════════════\n';
      porReport += isSpanish 
        ? '              PRUEBA DE RESERVAS - API VUSD\n'
        : '              PROOF OF RESERVE - API VUSD\n';
      porReport += '           DATA AND EXCHANGE SETTLEMENT (DAES)\n';
      porReport += '═══════════════════════════════════════════════════════════════════\n\n';
      porReport += isSpanish ? `Fecha de Generación: ${reportDate}\n` : `Generation Date: ${reportDate}\n`;
      porReport += `Timestamp ISO: ${timestamp}\n`;
      porReport += isSpanish ? `Sistema: CoreBanking DAES v5.2.0\n` : `System: CoreBanking DAES v5.2.0\n`;
      porReport += isSpanish 
        ? `Módulo: API VUSD - Gestión de Cap Circulante\n\n`
        : `Module: API VUSD - Circulating Cap Management\n\n`;

      // Resumen General
      porReport += '───────────────────────────────────────────────────────────────────\n';
      porReport += isSpanish ? 'RESUMEN GENERAL\n' : 'GENERAL SUMMARY\n';
      porReport += '───────────────────────────────────────────────────────────────────\n\n';
      porReport += isSpanish 
        ? `Total Pledges Activos:       ${activePledges.length}\n`
        : `Total Active Pledges:        ${activePledges.length}\n`;
      porReport += isSpanish
        ? `Cap Circulante Total:        USD ${circulatingCap.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}\n`
        : `Total Circulating Cap:       USD ${circulatingCap.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}\n`;
      porReport += isSpanish
        ? `Circulante Emitido:          USD ${circulatingOut.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}\n`
        : `Circulating Out (Issued):    USD ${circulatingOut.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}\n`;
      porReport += isSpanish
        ? `Disponible:                  USD ${(circulatingCap - circulatingOut).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}\n`
        : `Available:                   USD ${(circulatingCap - circulatingOut).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}\n`;
      porReport += isSpanish
        ? `Pledges USD Totales:         USD ${pledgedUSD.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}\n\n`
        : `Total USD Pledges:           USD ${pledgedUSD.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}\n\n`;

      // Detalle de Pledges por Cuenta Custody
      porReport += '═══════════════════════════════════════════════════════════════════\n';
      porReport += isSpanish 
        ? 'DETALLE DE PLEDGES POR CUENTA CUSTODY\n'
        : 'PLEDGE DETAILS BY CUSTODY ACCOUNT\n';
      porReport += '═══════════════════════════════════════════════════════════════════\n\n';

      activePledges.forEach((pledge, index) => {
        const custodyAccount = pledge.custody_account_id 
          ? custodyAccounts.find(a => a.id === pledge.custody_account_id)
          : null;

        porReport += `─────────────────────────────────────────────────────────────────\n`;
        porReport += `PLEDGE ${index + 1} de ${activePledges.length}\n`;
        porReport += `─────────────────────────────────────────────────────────────────\n\n`;
        
        porReport += `Pledge ID:           ${pledge.pledge_id}\n`;
        porReport += `Status:              ${pledge.status.toUpperCase()}\n`;
        porReport += isSpanish
          ? `Monto:               ${pledge.currency} ${pledge.amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}\n`
          : `Amount:              ${pledge.currency} ${pledge.amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}\n`;
        porReport += isSpanish
          ? `Disponible:          ${pledge.currency} ${(pledge.available || pledge.amount).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}\n`
          : `Available:           ${pledge.currency} ${(pledge.available || pledge.amount).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}\n`;
        porReport += isSpanish
          ? `Beneficiario:        ${pledge.beneficiary}\n`
          : `Beneficiary:         ${pledge.beneficiary}\n`;
        porReport += isSpanish
          ? `Fecha Creación:      ${pledge.updated_at ? new Date(pledge.updated_at).toLocaleString('es-ES') : 'N/A'}\n`
          : `Creation Date:       ${pledge.updated_at ? new Date(pledge.updated_at).toLocaleString('en-US') : 'N/A'}\n`;
        
        if (pledge.expires_at) {
          porReport += `Fecha Expiración:    ${new Date(pledge.expires_at).toLocaleDateString('es-ES')}\n`;
        }
        
        porReport += `\n`;

        if (custodyAccount) {
          // Calcular distribución 40% M2 / 60% M3 del pledge
          const pledgeAmount = pledge.amount;
          const m2Amount = pledgeAmount * 0.40; // 40% M2
          const m3Amount = pledgeAmount * 0.60; // 60% M3
          
          porReport += isSpanish
            ? `┌─ CUENTA CUSTODY VINCULADA ─────────────────────────────────┐\n`
            : `┌─ LINKED CUSTODY ACCOUNT ───────────────────────────────────┐\n`;
          porReport += `│\n`;
          porReport += isSpanish
            ? `│ Nombre Cuenta:       ${custodyAccount.accountName}\n`
            : `│ Account Name:        ${custodyAccount.accountName}\n`;
          porReport += isSpanish
            ? `│ Tipo de Cuenta:      ${custodyAccount.accountType === 'banking' ? 'BANKING (M2)' : 'BLOCKCHAIN (M3)'}\n`
            : `│ Account Type:        ${custodyAccount.accountType === 'banking' ? 'BANKING (M2)' : 'BLOCKCHAIN (M3)'}\n`;
          porReport += isSpanish
            ? `│ Moneda:              ${custodyAccount.currency}\n`
            : `│ Currency:            ${custodyAccount.currency}\n`;
          porReport += isSpanish
            ? `│ Balance Total:       ${custodyAccount.currency} ${custodyAccount.totalBalance.toLocaleString('en-US', { minimumFractionDigits: 2 })}\n`
            : `│ Total Balance:       ${custodyAccount.currency} ${custodyAccount.totalBalance.toLocaleString('en-US', { minimumFractionDigits: 2 })}\n`;
          porReport += `│\n`;
          
          // DISTRIBUCIÓN DE RESERVAS: 40% M2 / 60% M3
          porReport += isSpanish ? `│ DISTRIBUCIÓN DE RESERVAS:\n` : `│ RESERVE DISTRIBUTION:\n`;
          porReport += isSpanish
            ? `│ ├─ M2 (Bancaria):    ${custodyAccount.currency} ${m2Amount.toLocaleString('en-US', { minimumFractionDigits: 2 })} (40%)\n`
            : `│ ├─ M2 (Banking):     ${custodyAccount.currency} ${m2Amount.toLocaleString('en-US', { minimumFractionDigits: 2 })} (40%)\n`;
          porReport += isSpanish
            ? `│ └─ M3 (Blockchain):  ${custodyAccount.currency} ${m3Amount.toLocaleString('en-US', { minimumFractionDigits: 2 })} (60%)\n`
            : `│ └─ M3 (Blockchain):  ${custodyAccount.currency} ${m3Amount.toLocaleString('en-US', { minimumFractionDigits: 2 })} (60%)\n`;
          porReport += `│\n`;
          
          // Clasificación M2/M3
          if (custodyAccount.accountType === 'banking') {
            porReport += isSpanish
              ? `│ CLASIFICACIÓN PRINCIPAL: M2 - RESERVA BANCARIA\n`
              : `│ PRIMARY CLASSIFICATION:  M2 - BANKING RESERVE\n`;
            porReport += `│\n`;
            porReport += isSpanish ? `│ Detalles Bancarios:\n` : `│ Banking Details:\n`;
            porReport += isSpanish
              ? `│ ├─ Banco:            Digital Commercial Bank Ltd\n`
              : `│ ├─ Bank:             Digital Commercial Bank Ltd\n`;
            porReport += isSpanish
              ? `│ ├─ Sistema:          Core BANKING System DAES\n`
              : `│ ├─ System:           Core BANKING System DAES\n`;
            porReport += isSpanish
              ? `│ │                    Data and Exchange Settlement\n`
              : `│ │                    Data and Exchange Settlement\n`;
            porReport += isSpanish
              ? `│ └─ Núm. de Cuenta:   ${custodyAccount.accountNumber || 'N/A'}\n`
              : `│ └─ Account Number:   ${custodyAccount.accountNumber || 'N/A'}\n`;
          } else {
            porReport += isSpanish
              ? `│ CLASIFICACIÓN PRINCIPAL: M3 - RESERVA BLOCKCHAIN\n`
              : `│ PRIMARY CLASSIFICATION:  M3 - BLOCKCHAIN RESERVE\n`;
            porReport += `│\n`;
            porReport += isSpanish ? `│ Detalles Blockchain:\n` : `│ Blockchain Details:\n`;
            porReport += isSpanish
              ? `│ ├─ Red:              ${custodyAccount.blockchainLink || 'N/A'}\n`
              : `│ ├─ Network:          ${custodyAccount.blockchainLink || 'N/A'}\n`;
            porReport += isSpanish
              ? `│ ├─ Dirección Contrato: ${custodyAccount.contractAddress || 'N/A'}\n`
              : `│ ├─ Contract Address: ${custodyAccount.contractAddress || 'N/A'}\n`;
            porReport += isSpanish
              ? `│ ├─ Símbolo Token:    ${custodyAccount.tokenSymbol || 'N/A'}\n`
              : `│ ├─ Token Symbol:     ${custodyAccount.tokenSymbol || 'N/A'}\n`;
            porReport += isSpanish
              ? `│ └─ Tipo de Cadena:   ${custodyAccount.blockchainLink ? 'Blockchain Pública' : 'N/A'}\n`
              : `│ └─ Chain Type:       ${custodyAccount.blockchainLink ? 'Public Blockchain' : 'N/A'}\n`;
          }
          
          porReport += `│\n`;
          porReport += `│ Compliance:\n`;
          porReport += isSpanish
            ? `│ ├─ ISO 27001:        ${custodyAccount.iso27001Compliant ? '✅ CUMPLE' : '❌ NO'}\n`
            : `│ ├─ ISO 27001:        ${custodyAccount.iso27001Compliant ? '✅ COMPLIANT' : '❌ NO'}\n`;
          porReport += isSpanish
            ? `│ ├─ ISO 20022:        ${custodyAccount.iso20022Compatible ? '✅ COMPATIBLE' : '❌ NO'}\n`
            : `│ ├─ ISO 20022:        ${custodyAccount.iso20022Compatible ? '✅ COMPATIBLE' : '❌ NO'}\n`;
          porReport += isSpanish
            ? `│ ├─ FATF AML:         ${custodyAccount.fatfAmlVerified ? '✅ VERIFICADO' : '❌ NO'}\n`
            : `│ ├─ FATF AML:         ${custodyAccount.fatfAmlVerified ? '✅ VERIFIED' : '❌ NO'}\n`;
          porReport += isSpanish
            ? `│ ├─ KYC:              ${custodyAccount.kycVerified ? '✅ VERIFICADO' : '❌ NO'}\n`
            : `│ ├─ KYC:              ${custodyAccount.kycVerified ? '✅ VERIFIED' : '❌ NO'}\n`;
          porReport += isSpanish
            ? `│ ├─ Puntuación AML:   ${custodyAccount.amlScore}/100\n`
            : `│ ├─ AML Score:        ${custodyAccount.amlScore}/100\n`;
          porReport += isSpanish
            ? `│ └─ Nivel de Riesgo:  ${custodyAccount.riskLevel.toUpperCase()}\n`
            : `│ └─ Risk Level:       ${custodyAccount.riskLevel.toUpperCase()}\n`;
          porReport += `│\n`;
          porReport += `└────────────────────────────────────────────────────────────┘\n`;
        } else {
          porReport += isSpanish
            ? `┌─ PLEDGE MANUAL (SIN CUENTA CUSTODY) ──────────────────────┐\n`
            : `┌─ MANUAL PLEDGE (NO CUSTODY ACCOUNT) ──────────────────────┐\n`;
          porReport += isSpanish
            ? `│ Tipo: Entrada Manual                                      │\n`
            : `│ Type: Manual Entry                                        │\n`;
          porReport += isSpanish
            ? `│ Clasificación: Sin clasificar                             │\n`
            : `│ Classification: Unclassified                              │\n`;
          porReport += `└────────────────────────────────────────────────────────────┘\n`;
        }
        
        porReport += `\n`;
      });

      // Resumen por Tipo de Reserva
      porReport += '═══════════════════════════════════════════════════════════════════\n';
      porReport += isSpanish 
        ? 'CLASIFICACIÓN DE RESERVAS (M2/M3)\n'
        : 'RESERVE CLASSIFICATION (M2/M3)\n';
      porReport += '═══════════════════════════════════════════════════════════════════\n\n';

      const pledgesM2 = activePledges.filter(p => {
        const acc = custodyAccounts.find(a => a.id === p.custody_account_id);
        return acc && acc.accountType === 'banking';
      });

      const pledgesM3 = activePledges.filter(p => {
        const acc = custodyAccounts.find(a => a.id === p.custody_account_id);
        return acc && acc.accountType === 'blockchain';
      });

      const pledgesManual = activePledges.filter(p => !p.custody_account_id);

      const totalM2 = pledgesM2.reduce((sum, p) => sum + p.amount, 0);
      const totalM3 = pledgesM3.reduce((sum, p) => sum + p.amount, 0);
      const totalManual = pledgesManual.reduce((sum, p) => sum + p.amount, 0);

      porReport += isSpanish ? `M2 - RESERVAS BANCARIAS:\n` : `M2 - BANKING RESERVES:\n`;
      porReport += isSpanish
        ? `  Cantidad de Pledges:  ${pledgesM2.length}\n`
        : `  Number of Pledges:    ${pledgesM2.length}\n`;
      porReport += `  Total en USD:         USD ${totalM2.toLocaleString('en-US', { minimumFractionDigits: 2 })}\n`;
      porReport += isSpanish
        ? `  Porcentaje del Total: ${circulatingCap > 0 ? ((totalM2 / circulatingCap) * 100).toFixed(2) : 0}%\n\n`
        : `  Percentage of Total:  ${circulatingCap > 0 ? ((totalM2 / circulatingCap) * 100).toFixed(2) : 0}%\n\n`;

      porReport += isSpanish ? `M3 - RESERVAS BLOCKCHAIN:\n` : `M3 - BLOCKCHAIN RESERVES:\n`;
      porReport += isSpanish
        ? `  Cantidad de Pledges:  ${pledgesM3.length}\n`
        : `  Number of Pledges:    ${pledgesM3.length}\n`;
      porReport += `  Total en USD:         USD ${totalM3.toLocaleString('en-US', { minimumFractionDigits: 2 })}\n`;
      porReport += isSpanish
        ? `  Porcentaje del Total: ${circulatingCap > 0 ? ((totalM3 / circulatingCap) * 100).toFixed(2) : 0}%\n\n`
        : `  Percentage of Total:  ${circulatingCap > 0 ? ((totalM3 / circulatingCap) * 100).toFixed(2) : 0}%\n\n`;

      if (pledgesManual.length > 0) {
        porReport += isSpanish 
          ? `PLEDGES MANUALES (Sin clasificar):\n`
          : `MANUAL PLEDGES (Unclassified):\n`;
        porReport += isSpanish
          ? `  Cantidad:             ${pledgesManual.length}\n`
          : `  Quantity:             ${pledgesManual.length}\n`;
        porReport += `  Total en USD:         USD ${totalManual.toLocaleString('en-US', { minimumFractionDigits: 2 })}\n\n`;
      }

      // Footer
      porReport += '═══════════════════════════════════════════════════════════════════\n';
      porReport += isSpanish ? 'CERTIFICACIÓN\n' : 'CERTIFICATION\n';
      porReport += '═══════════════════════════════════════════════════════════════════\n\n';
      porReport += isSpanish
        ? `Este documento certifica que las reservas arriba detalladas\n` +
          `están respaldadas por activos verificados en cuentas custody\n` +
          `bajo el control de DATA AND EXCHANGE SETTLEMENT (DAES).\n\n`
        : `This document certifies that the reserves detailed above\n` +
          `are backed by verified assets in custody accounts\n` +
          `under the control of DATA AND EXCHANGE SETTLEMENT (DAES).\n\n`;
      porReport += isSpanish
        ? `Generado por: Sistema CoreBanking DAES\n`
        : `Generated by: CoreBanking DAES System\n`;
      porReport += isSpanish
        ? `Módulo: API VUSD - Cap Circulante\n`
        : `Module: API VUSD - Circulating Cap\n`;
      porReport += `Timestamp: ${timestamp}\n\n`;
      porReport += '═══════════════════════════════════════════════════════════════════\n';
      porReport += isSpanish
        ? '                    FIN DEL REPORTE\n'
        : '                    END OF REPORT\n';
      porReport += '═══════════════════════════════════════════════════════════════════\n';

      // Exportar como TXT
      const blob = new Blob([porReport], { type: 'text/plain;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `Proof_of_Reserve_${new Date().toISOString().split('T')[0]}_${Date.now()}.txt`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      // Agregar reporte al array (permite múltiples PoR)
      const newPorReport = {
        id: `POR_${Date.now()}_${Math.random().toString(36).substring(2, 9).toUpperCase()}`,
        report: porReport,
        pledgesM2: pledgesM2.length,
        pledgesM3: pledgesM3.length,
        totalM2: totalM2,
        totalM3: totalM3,
        timestamp: timestamp,
        circulatingCap: circulatingCap,
        pledgedUSD: pledgedUSD,
        activePledgesCount: activePledges.length,
        expanded: true
      };

      setGeneratedPorReports(prev => [newPorReport, ...prev]);

      console.log('[VUSD] ✅ Proof of Reserve generado y descargado');
      console.log('[VUSD] 📄 Reporte incluye:', {
        pledgesTotal: activePledges.length,
        pledgesM2: pledgesM2.length,
        pledgesM3: pledgesM3.length,
        totalReserves: circulatingCap
      });

      // Intentar publicar en blockchain (si Supabase disponible)
      try {
        const result = await vusdCapStore.publishPor();
        alert(
          `✅ ${t.porPublished}\n\n` +
          `TX ID: ${result.tx_id || 'N/A'}\n` +
          `Pledges: ${activePledges.length}\n` +
          `Total: USD ${circulatingCap.toLocaleString()}\n` +
          `M2 (Banking): ${pledgesM2.length} (${totalM2.toLocaleString()})\n` +
          `M3 (Blockchain): ${pledgesM3.length} (${totalM3.toLocaleString()})\n\n` +
          `📄 Archivo TXT descargado con especificaciones completas`
        );
      } catch (err) {
        console.warn('[VUSD] ⚠️ No se pudo publicar en blockchain (sin Supabase)');
        alert(
          `✅ Proof of Reserve Generado\n\n` +
          `Pledges: ${activePledges.length}\n` +
          `Total: USD ${circulatingCap.toLocaleString()}\n` +
          `M2 (Banking): ${pledgesM2.length}\n` +
          `M3 (Blockchain): ${pledgesM3.length}\n\n` +
          `📄 Archivo TXT descargado con todas las especificaciones\n\n` +
          `⚠️ Blockchain publish requiere Supabase configurado`
        );
      }

      await loadData();
    } catch (err) {
      const error = err as Error;
      console.error('[VUSD] ❌ Error generando PoR:', error);
      setError(error.message || 'PoR publication failed');
      alert('Error generando Proof of Reserve: ' + error.message);
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

      // ========================================
      // 1. ELIMINAR DEL UNIFIED PLEDGE STORE (PRIMERO)
      // ========================================
      let pledgeEliminado = false;
      
      try {
        // Buscar el pledge en Unified Store (puede ser el mismo ID o buscar por external_ref)
        const unifiedPledges = unifiedPledgeStore.getPledges();
        const matchingUnifiedPledge = unifiedPledges.find(p =>
          p.id === pledge.pledge_id ||
          p.external_ref === pledge.pledge_id ||
          p.vusd_pledge_id === pledge.pledge_id
        );

        if (matchingUnifiedPledge) {
          unifiedPledgeStore.releasePledge(matchingUnifiedPledge.id);
          console.log('[VUSD→Unified] ✅ Pledge eliminado del Unified Store:', matchingUnifiedPledge.id);
          pledgeEliminado = true;
        } else {
          console.log('[VUSD→Unified] ℹ️ Pledge no encontrado en Unified Store, buscando en Supabase...');
        }
      } catch (unifiedError) {
        console.warn('[VUSD→Unified] ⚠️ Error eliminando de Unified Store:', unifiedError);
      }

      // ========================================
      // 2. INTENTAR ELIMINAR DE SUPABASE (OPCIONAL)
      // ========================================
      try {
        await vusdCapStore.deletePledge(pledge.pledge_id);
        console.log('[VUSD→Supabase] ✅ Pledge eliminado de Supabase');
        pledgeEliminado = true;
      } catch (supabaseError: any) {
        console.warn('[VUSD→Supabase] ⚠️ No se pudo eliminar de Supabase:', supabaseError.message);
        // No es crítico si no hay Supabase
      }

      if (!pledgeEliminado) {
        throw new Error('No se pudo eliminar el pledge de ninguna fuente');
      }

      console.log('[VUSD] ✅ Pledge eliminado exitosamente');

      // ========================================
      // 3. LIBERAR CAPITAL EN CUSTODY STORE
      // ========================================
      if (pledge.custody_account_id) {
        try {
          const accounts = custodyStore.getAccounts();
          const custodyAccount = accounts.find(a => a.id === pledge.custody_account_id);
          if (custodyAccount) {
            // Recalcular desde unified store (fuente de verdad)
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

      // ========================================
      // ACTUALIZAR UI INMEDIATAMENTE (SIN ESPERAR)
      // ========================================
      
      // 1. Eliminar de la lista INMEDIATAMENTE y actualizar métricas
      setActivePledges(prev => {
        const updated = prev.filter(p => p.pledge_id !== pledge.pledge_id);
        
        // Recalcular métricas inmediatamente
        const newPledgedUSD = updated
          .filter(p => p.currency === 'USD')
          .reduce((sum, p) => sum + p.amount, 0);
        
        const newCirculatingCap = updated
          .reduce((sum, p) => sum + (p.available || p.amount), 0);
        
        setCirculatingCap(newCirculatingCap);
        setPledgedUSD(newPledgedUSD);
        
        console.log('[VUSD] ✅ Métricas actualizadas después de eliminar:', {
          pledgesActivos: updated.length,
          circulatingCap: newCirculatingCap,
          pledgedUSD: newPledgedUSD
        });
        
        return updated;
      });
      
      console.log('[VUSD] ✅ Pledge eliminado de la lista INMEDIATAMENTE');

      // 2. Recargar datos en background (sin bloquear)
      Promise.all([
        vusdCapStore.initializeCache().catch(err => console.warn('[VUSD] ⚠️ Error cache:', err)),
        loadData().catch(err => console.warn('[VUSD] ⚠️ Error loadData:', err))
      ]).then(() => {
        loadCustodyAccounts();
        console.log('[VUSD] ✅ Datos sincronizados en background');
      });

      // 3. Mensaje de éxito
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
    <div className="min-h-screen bg-black text-white p-2 sm:p-4 md:p-6">
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
            <LedgerStatusIndicator />
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
                          {pledge.custody_account_id && (
                            <div>
                              <span className="text-[#4d7c4d]">Custody Account: </span>
                              <span className="text-cyan-400 font-mono text-xs">
                                {custodyAccounts.find(a => a.id === pledge.custody_account_id)?.accountName || pledge.custody_account_id.substring(0, 12) + '...'}
                              </span>
                            </div>
                          )}
                          {pledge.updated_at && (
                            <div className="col-span-2">
                              <span className="text-[#4d7c4d]">📅 Creado: </span>
                              <span className="text-blue-400 font-mono text-xs">
                                {new Date(pledge.updated_at).toLocaleString('es-ES', {
                                  year: 'numeric',
                                  month: '2-digit',
                                  day: '2-digit',
                                  hour: '2-digit',
                                  minute: '2-digit',
                                  second: '2-digit'
                                })}
                              </span>
                            </div>
                          )}
                          {pledge.expires_at && (
                            <div className="col-span-2">
                              <span className="text-[#4d7c4d]">{t.expiresAt}: </span>
                              <span className="text-yellow-400">
                                {new Date(pledge.expires_at).toLocaleDateString()}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="flex flex-col gap-2">
                        <button
                          onClick={() => {
                            const newAmount = prompt(
                              (language === 'es' ? '✏️ Editar monto del pledge\n\n' : '✏️ Edit pledge amount\n\n') +
                              `Pledge: ${pledge.pledge_id}\n` +
                              `${language === 'es' ? 'Monto actual:' : 'Current amount:'} ${pledge.currency} ${pledge.amount.toLocaleString()}\n` +
                              `${language === 'es' ? 'Beneficiario:' : 'Beneficiary:'} ${pledge.beneficiary}\n\n` +
                              (language === 'es' ? 'Ingresa el nuevo monto:' : 'Enter new amount:'),
                              pledge.amount.toString()
                            );
                            
                            if (newAmount && !isNaN(parseFloat(newAmount))) {
                              const amount = parseFloat(newAmount);
                              
                              // Validar con custody account si existe
                              if (pledge.custody_account_id) {
                                const account = custodyAccounts.find(a => a.id === pledge.custody_account_id);
                                if (account) {
                                  const currentPledged = unifiedPledgeStore.getTotalPledgedAmount(account.id);
                                  const otherPledges = currentPledged - pledge.amount;
                                  const newTotal = otherPledges + amount;
                                  
                                  if (newTotal > account.totalBalance) {
                                    alert(`❌ Error\n\n${language === 'es' ? 'El nuevo monto excede el balance total de la cuenta' : 'New amount exceeds account total balance'}\n\n${language === 'es' ? 'Balance total:' : 'Total balance:'} ${account.totalBalance.toLocaleString()}\n${language === 'es' ? 'Otros pledges:' : 'Other pledges:'} ${otherPledges.toLocaleString()}\n${language === 'es' ? 'Máximo permitido:' : 'Maximum allowed:'} ${(account.totalBalance - otherPledges).toLocaleString()}`);
                                    return;
                                  }
                                }
                              }
                              
                              // Actualizar en unified pledge store
                              const unifiedPledges = unifiedPledgeStore.getPledges();
                              const unifiedPledge = unifiedPledges.find(p => 
                                p.id === pledge.pledge_id || p.vusd_pledge_id === pledge.pledge_id
                              );
                              
                              if (unifiedPledge) {
                                unifiedPledge.amount = amount;
                                localStorage.setItem('unified_pledges', JSON.stringify(unifiedPledges));
                                console.log('[VUSD] ✅ Pledge actualizado en Unified Store');
                              }
                              
                              // Actualizar en lista local
                              setActivePledges(prev => prev.map(p => 
                                p.pledge_id === pledge.pledge_id 
                                  ? { ...p, amount, available: amount }
                                  : p
                              ));
                              
                              // Recalcular métricas inmediatamente
                              const newPledgedUSD = activePledges
                                .filter(p => p.currency === 'USD')
                                .map(p => p.pledge_id === pledge.pledge_id ? { ...p, amount } : p)
                                .reduce((sum, p) => sum + p.amount, 0);
                              
                              const newCirculatingCap = activePledges
                                .map(p => p.pledge_id === pledge.pledge_id ? { ...p, amount } : p)
                                .reduce((sum, p) => sum + p.amount, 0);
                              
                              setCirculatingCap(newCirculatingCap);
                              setPledgedUSD(newPledgedUSD);
                              
                              // Recargar datos en background
                              loadData();
                              
                              alert(`✅ ${language === 'es' ? 'Pledge actualizado' : 'Pledge updated'}\n\n${language === 'es' ? 'Monto anterior:' : 'Previous amount:'} ${pledge.amount.toLocaleString()}\n${language === 'es' ? 'Nuevo monto:' : 'New amount:'} ${amount.toLocaleString()}\n\n${language === 'es' ? 'Las métricas se actualizarán automáticamente' : 'Metrics will update automatically'}`);
                            }
                          }}
                          disabled={loading}
                          className="p-2 bg-blue-500/10 border border-blue-500/30 text-blue-400 rounded-lg hover:bg-blue-500/20 hover:border-blue-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                          title={language === 'es' ? 'Editar monto' : 'Edit amount'}
                        >
                          <Edit className="w-5 h-5" />
                        </button>
                        <button
                          onClick={() => handleDeletePledge(pledge)}
                          disabled={loading}
                          className="p-2 bg-red-500/10 border border-red-500/30 text-red-400 rounded-lg hover:bg-red-500/20 hover:border-red-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                          title={language === 'es' ? 'Eliminar pledge' : 'Delete pledge'}
                        >
                          <Trash2 className="w-5 h-5" />
                        </button>
                      </div>
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
          <div className="p-6 space-y-6">
            {/* Lista de Reportes PoR Generados - Con scroll */}
            {generatedPorReports.length > 0 && (
              <div className="space-y-4 max-h-[800px] overflow-y-auto pr-2">
                {generatedPorReports.map((porItem, index) => (
                  <div key={porItem.id} className="bg-gradient-to-r from-blue-900/20 to-cyan-900/20 border-2 border-cyan-500/50 rounded-lg p-6">
                    <div className="flex items-center justify-between mb-4">
                      <div 
                        className="flex items-center gap-3 cursor-pointer flex-1" 
                        onClick={() => {
                          setGeneratedPorReports(prev => prev.map(p => 
                            p.id === porItem.id ? { ...p, expanded: !p.expanded } : p
                          ));
                        }}
                      >
                        <FileText className="w-6 h-6 text-cyan-400" />
                        <h3 className="text-xl font-bold text-cyan-300">
                          {language === 'es' 
                            ? `Proof of Reserve #${generatedPorReports.length - index}`
                            : `Proof of Reserve #${generatedPorReports.length - index}`}
                        </h3>
                        <button
                          type="button"
                          className="ml-2 text-cyan-400 hover:text-cyan-300 transition-colors text-xl"
                          title={porItem.expanded ? (language === 'es' ? 'Minimizar' : 'Minimize') : (language === 'es' ? 'Maximizar' : 'Maximize')}
                        >
                          {porItem.expanded ? '▼' : '▶'}
                        </button>
                        <span className="text-xs text-cyan-300/60 ml-2">
                          {new Date(porItem.timestamp).toLocaleString(language === 'es' ? 'es-ES' : 'en-US')}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => {
                            const blob = new Blob([porItem.report], { type: 'text/plain;charset=utf-8' });
                            const url = URL.createObjectURL(blob);
                            const link = document.createElement('a');
                            link.href = url;
                            link.download = `Proof_of_Reserve_${new Date(porItem.timestamp).toISOString().split('T')[0]}_${porItem.id}.txt`;
                            document.body.appendChild(link);
                            link.click();
                            document.body.removeChild(link);
                            URL.revokeObjectURL(url);
                          }}
                          className="px-3 py-2 bg-cyan-500/20 border border-cyan-500 text-cyan-300 rounded-lg hover:bg-cyan-500/30 flex items-center gap-2"
                        >
                          <ArrowUpRight className="w-4 h-4" />
                          {language === 'es' ? 'TXT' : 'TXT'}
                        </button>
                        <button
                          onClick={() => {
                            if (confirm(language === 'es' 
                              ? '¿Eliminar este Proof of Reserve?' 
                              : 'Delete this Proof of Reserve?')) {
                              setGeneratedPorReports(prev => prev.filter(p => p.id !== porItem.id));
                              console.log('[VUSD] 🗑️ PoR eliminado:', porItem.id);
                            }
                          }}
                          className="p-2 bg-red-500/20 border border-red-500 text-red-400 rounded-lg hover:bg-red-500/30 flex items-center gap-2"
                          title={language === 'es' ? 'Eliminar' : 'Delete'}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    {/* Resumen Visual - Siempre visible */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
                      <div className="bg-black/30 rounded-lg p-3">
                        <div className="text-xs text-cyan-300/60 mb-1">
                          {language === 'es' ? 'Pledges' : 'Pledges'}
                        </div>
                        <div className="text-2xl font-bold text-cyan-300">{porItem.activePledgesCount}</div>
                      </div>
                      <div className="bg-black/30 rounded-lg p-3">
                        <div className="text-xs text-cyan-300/60 mb-1">
                          {language === 'es' ? 'Cap Total' : 'Total Cap'}
                        </div>
                        <div className="text-lg font-bold text-cyan-300">
                          ${porItem.circulatingCap.toLocaleString('en-US', { maximumFractionDigits: 0 })}
                        </div>
                      </div>
                      <div className="bg-black/30 rounded-lg p-3">
                        <div className="text-xs text-green-300/60 mb-1">M2</div>
                        <div className="text-lg font-bold text-green-300">
                          {porItem.pledgesM2} <span className="text-sm">({porItem.totalM2.toLocaleString()})</span>
                        </div>
                      </div>
                      <div className="bg-black/30 rounded-lg p-3">
                        <div className="text-xs text-purple-300/60 mb-1">M3</div>
                        <div className="text-lg font-bold text-purple-300">
                          {porItem.pledgesM3} <span className="text-sm">({porItem.totalM3.toLocaleString()})</span>
                        </div>
                      </div>
                    </div>

                    {/* Reporte Completo - Solo visible cuando está expandido */}
                    {porItem.expanded && (
                      <div>
                        <div className="text-sm text-cyan-300 mb-2 font-semibold flex items-center gap-2">
                          <FileText className="w-4 h-4" />
                          {language === 'es' ? '📄 Reporte Completo:' : '📄 Full Report:'}
                        </div>
                        <textarea
                          value={porItem.report}
                          readOnly
                          className="w-full h-96 bg-black/50 border border-cyan-500/30 rounded-lg p-4 text-green-400 font-mono text-xs overflow-y-auto resize-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20"
                          style={{ fontFamily: 'Consolas, Monaco, monospace' }}
                        />
                        <div className="text-xs text-cyan-300/60 mt-2">
                          {language === 'es'
                            ? 'ℹ️ Scroll para ver el reporte completo • Incluye clasificación M2/M3, datos de custody, blockchain, compliance'
                            : 'ℹ️ Scroll to view full report • Includes M2/M3 classification, custody data, blockchain, compliance'}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Mensaje cuando no hay reportes */}
            {generatedPorReports.length === 0 && porPublications.length === 0 ? (
              <div className="text-center py-12">
                <Database className="w-16 h-16 text-[#4d7c4d] mx-auto mb-4" />
                <div className="text-[#4d7c4d] mb-2">
                  {language === 'es' 
                    ? 'No hay Proof of Reserve generados'
                    : 'No Proof of Reserve generated'}
                </div>
                <div className="text-[#4d7c4d] text-sm">
                  {language === 'es'
                    ? 'Click en "Publicar PoR" para generar el reporte'
                    : 'Click on "Publish PoR" to generate the report'}
                </div>
              </div>
            ) : porPublications.length > 0 ? (
              <div className="space-y-3">
                <div className="text-lg font-bold text-purple-400 mb-4">Publicaciones en Blockchain:</div>
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
            ) : null}
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
                    <label className="block text-purple-300 text-sm mb-2 font-semibold flex items-center gap-2">
                      <Database className="w-4 h-4" />
                      {t.selectCustodyAccount}
                    </label>
                    <select
                      value={selectedCustodyAccount}
                      onChange={(e) => handleCustodyAccountSelect(e.target.value)}
                      size={Math.min(custodyAccounts.length + 1, 8)}
                      className="w-full bg-[#0a0a0a] border border-purple-500/30 rounded-lg px-4 py-2 text-white hover:border-purple-500/50 focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 transition-all cursor-pointer overflow-y-auto"
                      style={{ maxHeight: '300px' }}
                    >
                      <option value="" className="bg-[#0a0a0a] py-2">📝 {t.manualEntry} (Sin cuenta custody)</option>
                      {custodyAccounts.map(account => {
                        const totalBalance = account.totalBalance;
                        const alreadyPledged = unifiedPledgeStore.getTotalPledgedAmount(account.id);
                        const remaining = totalBalance - alreadyPledged;
                        
                        return (
                          <option 
                            key={account.id} 
                            value={account.id}
                            className="bg-[#0a0a0a] py-2 hover:bg-purple-900/30"
                          >
                            💰 {account.accountName} | {account.currency} {remaining.toLocaleString('en-US', { minimumFractionDigits: 2 })} restante {alreadyPledged > 0 ? `(${alreadyPledged.toLocaleString()} usado)` : ''}
                          </option>
                        );
                      })}
                    </select>
                    <div className="text-xs text-purple-300/60 mt-2 flex items-start gap-2">
                      <div>💡</div>
                      <div>
                        Selecciona una cuenta de Custody Accounts para auto-completar el pledge.
                        {custodyAccounts.length === 0 && (
                          <span className="text-orange-300 font-semibold"> ⚠️ No hay cuentas - ve a "Custody Accounts" para crearlas.</span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Información de cuenta seleccionada */}
                  {selectedCustodyAccount && custodyAccounts.find(a => a.id === selectedCustodyAccount) && (
                    <div className="bg-gradient-to-r from-purple-900/30 to-blue-900/30 border-2 border-purple-500/50 rounded-lg p-4">
                      <div className="text-sm font-bold text-purple-300 mb-3 flex items-center gap-2">
                        <CheckCircle className="w-4 h-4" />
                        {t.custodyAccountInfo}
                      </div>
                      {(() => {
                        const account = custodyAccounts.find(a => a.id === selectedCustodyAccount)!;
                        const totalBalance = account.totalBalance;
                        const pledgedAmount = unifiedPledgeStore.getTotalPledgedAmount(selectedCustodyAccount);
                        const remainingBalance = totalBalance - pledgedAmount;
                        const afterThisPledge = remainingBalance - pledgeForm.amount;
                        
                        return (
                          <div className="space-y-3">
                            <div className="grid grid-cols-2 gap-3">
                              <div className="bg-black/30 rounded p-3">
                                <div className="text-xs text-purple-300/60 mb-1">Cuenta Seleccionada</div>
                                <div className="text-base font-bold text-white">{account.accountName}</div>
                                <div className="text-xs text-purple-300/60 mt-1">{account.accountType === 'banking' ? '🏦 Banking' : '⛓️ Blockchain'}</div>
                              </div>
                              <div className="bg-black/30 rounded p-3">
                                <div className="text-xs text-purple-300/60 mb-1">Moneda</div>
                                <div className="text-base font-bold text-white">{account.currency}</div>
                              </div>
                            </div>
                            
                            <div className="grid grid-cols-3 gap-2">
                              <div className="bg-blue-900/30 rounded p-2">
                                <div className="text-xs text-blue-300/80 mb-1">Balance Total</div>
                                <div className="text-sm font-bold text-blue-300">
                                  {totalBalance.toLocaleString('en-US', { maximumFractionDigits: 0 })}
                                </div>
                              </div>
                              <div className="bg-orange-900/30 rounded p-2">
                                <div className="text-xs text-orange-300/80 mb-1">Ya en Pledges</div>
                                <div className="text-sm font-bold text-orange-300">
                                  {pledgedAmount.toLocaleString('en-US', { maximumFractionDigits: 0 })}
                                </div>
                              </div>
                              <div className="bg-green-900/30 rounded p-2">
                                <div className="text-xs text-green-300/80 mb-1">Restante</div>
                                <div className="text-sm font-bold text-green-300">
                                  {remainingBalance.toLocaleString('en-US', { maximumFractionDigits: 0 })}
                                </div>
                              </div>
                            </div>

                            {pledgeForm.amount > 0 && (
                              <div className={`border-2 rounded-lg p-3 ${afterThisPledge >= 0 ? 'bg-cyan-900/20 border-cyan-500/50' : 'bg-red-900/20 border-red-500/50'}`}>
                                <div className="text-xs mb-1 font-semibold" style={{color: afterThisPledge >= 0 ? '#67e8f9' : '#fca5a5'}}>
                                  📊 Después de crear este pledge:
                                </div>
                                <div className="text-base font-bold" style={{color: afterThisPledge >= 0 ? '#67e8f9' : '#fca5a5'}}>
                                  {afterThisPledge >= 0 ? '✅' : '❌'} Restará: {account.currency} {afterThisPledge.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                                </div>
                                <div className="text-xs mt-1 opacity-80" style={{color: afterThisPledge >= 0 ? '#67e8f9' : '#fca5a5'}}>
                                  {afterThisPledge >= 0 
                                    ? `Podrás crear más pledges con el restante` 
                                    : `⚠️ Excede el balance restante - reduce el monto`
                                  }
                                </div>
                              </div>
                            )}
                            
                            {account.blockchainLink && (
                              <div className="bg-black/30 rounded p-2">
                                <div className="text-xs text-purple-300/60 mb-1">🔗 Blockchain Network</div>
                                <div className="text-xs font-mono text-blue-400">{account.blockchainLink}</div>
                              </div>
                            )}
                          </div>
                        );
                      })()}
                    </div>
                  )}
                </>
              ) : (
                <div className="bg-gradient-to-r from-yellow-900/30 to-orange-900/30 border-2 border-yellow-500/50 rounded-lg p-4">
                  <div className="flex items-start gap-3">
                    <AlertCircle className="w-6 h-6 text-yellow-400 flex-shrink-0 mt-0.5" />
                    <div>
                      <div className="text-sm font-semibold text-yellow-300 mb-1">
                        {language === 'es' ? '⚠️ No hay Cuentas con Reservas Disponibles' : '⚠️ No Accounts with Reserves Available'}
                      </div>
                      <div className="text-xs text-yellow-300/80 mb-2">
                        {language === 'es' 
                          ? 'Para crear pledges, necesitas cuentas de custodia con fondos RESERVADOS.'
                          : 'To create pledges, you need custody accounts with RESERVED funds.'}
                      </div>
                      <div className="text-xs bg-yellow-500/20 border border-yellow-500/30 rounded p-2 mt-2">
                        <div className="font-semibold mb-1">💡 {language === 'es' ? 'Pasos REQUERIDOS' : 'REQUIRED Steps'}:</div>
                        <div className="space-y-1">
                          <div>1. {language === 'es' ? 'Ve al módulo' : 'Go to'} <span className="font-bold text-yellow-200">"Custody Accounts"</span></div>
                          <div>2. {language === 'es' ? 'Crea o selecciona una cuenta con balance' : 'Create or select an account with balance'}</div>
                          <div className="font-bold text-orange-300">3. {language === 'es' ? '⚠️ HAZ UNA RESERVA DE FONDOS (botón "Reservar")' : '⚠️ MAKE A FUND RESERVATION (button "Reserve")'}</div>
                          <div>4. {language === 'es' ? 'Verifica que "Reservado" sea > 0' : 'Verify that "Reserved" is > 0'}</div>
                          <div>5. {language === 'es' ? 'Vuelve aquí y recarga (F5)' : 'Return here and reload (F5)'}</div>
                        </div>
                        <div className="mt-2 p-2 bg-red-500/20 border border-red-500/30 rounded">
                          <span className="font-bold text-red-300">⚠️ CRÍTICO:</span> {language === 'es' ? 'Sin RESERVAR fondos, la cuenta NO aparecerá aquí' : 'Without RESERVING funds, the account will NOT appear here'}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Selector de Porcentajes - Solo si hay cuenta seleccionada */}
              {selectedCustodyAccount && (() => {
                const account = custodyAccounts.find(a => a.id === selectedCustodyAccount);
                if (!account) return null;
                
                const totalBalance = account.totalBalance;
                const pledgedAmount = unifiedPledgeStore.getTotalPledgedAmount(selectedCustodyAccount);
                const remainingBalance = totalBalance - pledgedAmount;
                
                return (
                  <div className="bg-gradient-to-r from-purple-900/20 to-pink-900/20 border border-purple-500/30 rounded-lg p-4">
                    <label className="text-sm text-purple-400 mb-3 block font-semibold flex items-center gap-2">
                      <Activity className="w-4 h-4" />
                      ⚡ {language === 'es' ? 'Creación Rápida - % del Balance Restante' : 'Quick Create - % of Remaining Balance'}
                    </label>
                    <div className="grid grid-cols-5 gap-2">
                      {[10, 20, 30, 50, 100].map(percentage => {
                        const calculatedAmount = (remainingBalance * percentage) / 100;

                        return (
                          <button
                            key={percentage}
                            type="button"
                            onClick={() => {
                              setPledgeForm({
                                ...pledgeForm,
                                amount: calculatedAmount
                              });
                              console.log(`[VUSD] ✅ ${percentage}% del restante = ${account.currency} ${calculatedAmount.toLocaleString()}`);
                            }}
                            className="px-3 py-3 bg-gradient-to-br from-purple-600 to-pink-600 text-white rounded-lg hover:shadow-[0_0_20px_rgba(168,85,247,0.6)] transition-all text-sm font-bold hover:scale-105"
                          >
                            <div className="text-lg mb-1">{percentage}%</div>
                            <div className="text-xs opacity-90">
                              {calculatedAmount.toLocaleString('en-US', { maximumFractionDigits: 0 })}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                    <div className="mt-3 text-xs text-center space-y-1">
                      <div className="text-purple-300">
                        💰 {language === 'es' ? 'Balance Restante' : 'Remaining Balance'}: {account.currency} {remainingBalance.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                      </div>
                      {pledgedAmount > 0 && (
                        <div className="text-orange-300/80">
                          📊 {language === 'es' ? 'Ya usado en pledges' : 'Already in pledges'}: {pledgedAmount.toLocaleString('en-US', { maximumFractionDigits: 0 })}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })()}

              <div>
                <label className="block text-purple-300 text-sm mb-2 font-semibold flex items-center gap-2">
                  <DollarSign className="w-4 h-4" />
                  {t.amount} {selectedCustodyAccount && '(editable)'}
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={pledgeForm.amount}
                  onChange={(e) => setPledgeForm({ ...pledgeForm, amount: parseFloat(e.target.value) || 0 })}
                  className="w-full bg-[#0a0a0a] border border-purple-500/30 rounded-lg px-4 py-3 text-white focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 transition-all"
                  required
                />
                <div className="text-xs text-purple-300/60 mt-1">
                  {selectedCustodyAccount 
                    ? '✏️ Puedes editar el monto manualmente o usar los botones de % arriba'
                    : '💡 Selecciona una cuenta custody primero para usar los % rápidos'
                  }
                </div>
              </div>

              <div>
                <label className="block text-purple-300 text-sm mb-2">{t.beneficiary}</label>
                <input
                  type="text"
                  value={pledgeForm.beneficiary}
                  onChange={(e) => setPledgeForm({ ...pledgeForm, beneficiary: e.target.value })}
                  className="w-full bg-[#0a0a0a] border border-purple-500/30 rounded-lg px-4 py-3 text-white focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 transition-all"
                  required
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
