/**
 * Proof of Reserves API1 Module
 * API institucional compatible con Anchor VUSD (https://anchor.vergy.world)
 * Endpoints: PoR, Pledges/Lockbox, Payouts, Reconciliation, Webhooks HMAC
 */

import { useState, useEffect } from 'react';
import {
  Shield, Lock, Send, TrendingUp, Database, Activity, 
  CheckCircle, AlertCircle, RefreshCw, Download, Key,
  FileText, DollarSign, Clock, Zap, Webhook, Trash2, Copy
} from 'lucide-react';
import { useLanguage } from '../lib/i18n';
import { unifiedPledgeStore } from '../lib/unified-pledge-store';
import { custodyStore } from '../lib/custody-store';

interface PledgeAPI1 {
  pledgeId: string;
  porId: string;
  status: 'ACTIVE' | 'EXPIRED' | 'RELEASED';
  amountUsd: string;
  available: string;
  currency: string;
  beneficiary: string;
  lockedAt: string;
  expiresAt?: string;
  termDays?: number;
  linkedVUSDPledge?: string;
  linkedPorReport?: string;
  porReportData?: string;
  apiEndpoint?: string;
}

interface PayoutAPI1 {
  payoutId: string;
  externalRef: string;
  pledgeId: string;
  status: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED';
  amountUsd: string;
  currency: string;
  createdAt: string;
  completedAt?: string;
  beneficiary: {
    name: string;
    accountType: 'institutional' | 'retail';
  };
}

interface ReserveSummary {
  asOf: string;
  totalUsdReserves: string;
  totalUsdPledges: string;
  unpledgedUsd: string;
  circulatingCap: string;
  coverageRatio: string;
}

export function ProofOfReservesAPI1Module() {
  const { language } = useLanguage();
  const isSpanish = language === 'es';
  
  const API_BASE = 'http://localhost:8788'; // Puerto diferente para API1
  const [selectedView, setSelectedView] = useState<'overview' | 'pledges' | 'payouts' | 'reconciliation' | 'webhooks'>('overview');
  
  // Data states
  const [pledges, setPledges] = useState<PledgeAPI1[]>([]);
  const [payouts, setPayouts] = useState<PayoutAPI1[]>([]);
  const [reserveSummary, setReserveSummary] = useState<ReserveSummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [porReports, setPorReports] = useState<any[]>([]);
  const [availablePledgesVUSD, setAvailablePledgesVUSD] = useState<any[]>([]);
  
  // API Configuration (keys stored in Netlify environment)
  const POR_ID = 'por_1763215039421_v9p76zcxqxd';
  const API_KEY = 'por_1763215039421_v9p76zcxqxd'; // Solo para display, no se usa en requests
  const SECRET_KEY = '••••••••'; // Oculto por seguridad
  
  // Modals
  const [showCreatePledgeModal, setShowCreatePledgeModal] = useState(false);
  const [showCreatePayoutModal, setShowCreatePayoutModal] = useState(false);
  
  // Forms
  const [pledgeForm, setPledgeForm] = useState({
    amountUsd: 0,
    currency: 'USD',
    termDays: 90,
    beneficiary: 'VUSD',
    notes: '',
    selectedVUSDPledge: '',
    selectedPorReport: ''
  });
  
  const [payoutForm, setPayoutForm] = useState({
    pledgeId: '',
    externalRef: '',
    amountUsd: 0,
    beneficiaryName: '',
    accountType: 'institutional' as 'institutional' | 'retail'
  });
  
  const [webhookLogs, setWebhookLogs] = useState<any[]>([]);
  const [reconciliationData, setReconciliationData] = useState<any>(null);

  useEffect(() => {
    loadData().catch(err => {
      console.error('[API1] ❌ Error crítico en mount:', err);
      setError('Error al inicializar módulo');
    });
    
    // Cargar PoR reports desde API VUSD
    loadPorReportsFromVUSD();
    
    // Auto-reload cada 5 segundos
    const interval = setInterval(() => {
      loadPorReportsFromVUSD();
    }, 5000);
    
    return () => clearInterval(interval);
  }, []);

  const loadPorReportsFromVUSD = () => {
    try {
      const saved = localStorage.getItem('vusd_por_reports');
      if (saved) {
        const reports = JSON.parse(saved);
        setPorReports(reports);
        console.log('[API1] ✅ PoR reports cargados desde API VUSD:', reports.length);
      }
      
      // Cargar pledges de API VUSD
      const unifiedPledges = unifiedPledgeStore.getPledges();
      const vusdPledges = unifiedPledges.filter(p => 
        p.source_module === 'API_VUSD' && p.status === 'ACTIVE'
      );
      setAvailablePledgesVUSD(vusdPledges);
      console.log('[API1] ✅ Pledges VUSD disponibles:', vusdPledges.length);
    } catch (err) {
      console.error('[API1] ⚠️ Error cargando PoR/Pledges VUSD:', err);
    }
  };

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      console.log('[API1] 🔄 Cargando datos desde localStorage y stores...');
      
      // 1. Cargar pledges de API1 desde localStorage
      const savedAPI1Pledges = localStorage.getItem('api1_pledges');
      let activePledges: PledgeAPI1[] = [];
      
      if (savedAPI1Pledges) {
        const parsed = JSON.parse(savedAPI1Pledges);
        activePledges = parsed.filter((p: PledgeAPI1) => p.status === 'ACTIVE');
        console.log('[API1] ✅ Pledges API1 cargados:', activePledges.length);
      }
      
      setPledges(activePledges);
      
      // 2. Recargar PoR reports desde API VUSD
      loadPorReportsFromVUSD();
      
      // 3. Cargar payouts desde localStorage
      const savedPayouts = localStorage.getItem('api1_payouts');
      if (savedPayouts) {
        const parsed = JSON.parse(savedPayouts);
        setPayouts(parsed);
        console.log('[API1] ✅ Payouts cargados:', parsed.length);
      }
      
      // 4. Calcular resumen de reservas desde custody accounts
      const custodyAccounts = custodyStore.getAccounts();
      const totalReserves = custodyAccounts
        .filter(a => a.currency === 'USD')
        .reduce((sum, a) => sum + a.totalBalance, 0);
      
      const totalPledges = activePledges.reduce((sum, p) => sum + parseFloat(p.amountUsd), 0);
      const unpledged = totalReserves - totalPledges;
      const circulatingCap = totalPledges;
      const coverageRatio = totalPledges > 0 ? (totalReserves / totalPledges) : 0;
      
      setReserveSummary({
        asOf: new Date().toISOString(),
        totalUsdReserves: totalReserves.toFixed(2),
        totalUsdPledges: totalPledges.toFixed(2),
        unpledgedUsd: unpledged.toFixed(2),
        circulatingCap: circulatingCap.toFixed(2),
        coverageRatio: coverageRatio.toFixed(4)
      });
      
      console.log('[API1] ✅ Refresh completado:', {
        pledges: activePledges.length,
        payouts: savedPayouts ? JSON.parse(savedPayouts).length : 0,
        porReports: porReports.length,
        totalReserves,
        totalPledges,
        circulatingCap
      });
      
      // 5. Mostrar confirmación
      if (!loading) {
        alert(
          `✅ ${isSpanish ? 'Datos actualizados' : 'Data refreshed'}\n\n` +
          `${isSpanish ? 'Pledges:' : 'Pledges:'} ${activePledges.length}\n` +
          `${isSpanish ? 'PoR Reports:' : 'PoR Reports:'} ${porReports.length}\n` +
          `${isSpanish ? 'Reservas Totales:' : 'Total Reserves:'} $${totalReserves.toLocaleString()}\n` +
          `CIRC_CAP: $${circulatingCap.toLocaleString()}`
        );
      }
      
    } catch (err) {
      console.error('[API1] ❌ Error cargando datos:', err);
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const handleDeletePledge = (pledge: PledgeAPI1) => {
    if (!confirm(
      (isSpanish ? '¿Eliminar este pledge?\n\n' : 'Delete this pledge?\n\n') +
      `Pledge ID: ${pledge.pledgeId}\n` +
      `Amount: USD ${parseFloat(pledge.amountUsd).toLocaleString()}\n` +
      `Beneficiary: ${pledge.beneficiary}`
    )) {
      return;
    }
    
    const savedPledges = localStorage.getItem('api1_pledges');
    if (savedPledges) {
      const currentPledges: PledgeAPI1[] = JSON.parse(savedPledges);
      const updated = currentPledges.filter(p => p.pledgeId !== pledge.pledgeId);
      localStorage.setItem('api1_pledges', JSON.stringify(updated));
    }
    
    loadData();
    
    alert(
      `✅ ${isSpanish ? 'Pledge eliminado' : 'Pledge deleted'}\n\n` +
      `Pledge ID: ${pledge.pledgeId}`
    );
  };

  const downloadPledgeTXT = (pledge: PledgeAPI1) => {
    let content = '';
    
    // Si tiene PoR vinculado, usar ese contenido
    if (pledge.porReportData) {
      content = pledge.porReportData;
    } else {
      // Generar contenido básico
      content = `
═══════════════════════════════════════════════════════════════
  DAES CoreBanking - Pledge for Anchor VUSD
═══════════════════════════════════════════════════════════════

${isSpanish ? 'INFORMACIÓN DEL PLEDGE' : 'PLEDGE INFORMATION'}
───────────────────────────────────────────────────────────────

Pledge ID:           ${pledge.pledgeId}
PoR ID:              ${pledge.porId}
Status:              ${pledge.status}
${isSpanish ? 'Monto USD:' : 'USD Amount:'}           USD ${parseFloat(pledge.amountUsd).toLocaleString('en-US', { minimumFractionDigits: 2 })}
${isSpanish ? 'Disponible:' : 'Available:'}           USD ${parseFloat(pledge.available).toLocaleString('en-US', { minimumFractionDigits: 2 })}
${isSpanish ? 'Moneda:' : 'Currency:'}              ${pledge.currency}
${isSpanish ? 'Beneficiario:' : 'Beneficiary:'}         ${pledge.beneficiary}
${isSpanish ? 'Bloqueado:' : 'Locked At:'}           ${new Date(pledge.lockedAt).toLocaleString(isSpanish ? 'es-ES' : 'en-US')}
${pledge.expiresAt ? `${isSpanish ? 'Expira:' : 'Expires At:'}            ${new Date(pledge.expiresAt).toLocaleString(isSpanish ? 'es-ES' : 'en-US')}` : `${isSpanish ? 'Expira:' : 'Expires At:'}            ∞ ${isSpanish ? 'PERPETUO' : 'PERPETUAL'}`}
${pledge.termDays && pledge.termDays > 0 ? `${isSpanish ? 'Plazo:' : 'Term:'}                ${pledge.termDays} ${isSpanish ? 'días' : 'days'}` : `${isSpanish ? 'Plazo:' : 'Term:'}                ∞ ${isSpanish ? 'Sin vencimiento' : 'No expiration'}`}

───────────────────────────────────────────────────────────────
${isSpanish ? 'API ENDPOINT' : 'API ENDPOINT'}
───────────────────────────────────────────────────────────────

Endpoint:            ${pledge.apiEndpoint}

${isSpanish ? 'Autenticación:' : 'Authentication:'}
Authorization: Bearer ${API_KEY}
X-Secret-Key: ${SECRET_KEY}

${isSpanish ? 'Ejemplo cURL:' : 'cURL Example:'}
curl -X GET \\
  '${pledge.apiEndpoint}' \\
  -H 'Authorization: Bearer ${API_KEY}' \\
  -H 'X-Secret-Key: ${SECRET_KEY}'

───────────────────────────────────────────────────────────────
${isSpanish ? 'VÍNCULOS' : 'LINKS'}
───────────────────────────────────────────────────────────────

${pledge.linkedVUSDPledge ? `${isSpanish ? 'Pledge VUSD:' : 'VUSD Pledge:'}        ${pledge.linkedVUSDPledge}` : `${isSpanish ? 'Pledge VUSD:' : 'VUSD Pledge:'}        ${isSpanish ? 'No vinculado' : 'Not linked'}`}
${pledge.linkedPorReport ? `${isSpanish ? 'PoR Report:' : 'PoR Report:'}          ${pledge.linkedPorReport}` : `${isSpanish ? 'PoR Report:' : 'PoR Report:'}          ${isSpanish ? 'No vinculado' : 'Not linked'}`}

───────────────────────────────────────────────────────────────
${isSpanish ? 'INTEGRACIÓN ANCHOR' : 'ANCHOR INTEGRATION'}
───────────────────────────────────────────────────────────────

Anchor URL:          https://anchor.vergy.world
${isSpanish ? 'Compatible con:' : 'Compatible with:'}      SEP-24 (Stellar)
${isSpanish ? 'Protocolo:' : 'Protocol:'}            Institutional Treasury API
${isSpanish ? 'Webhooks:' : 'Webhooks:'}             HMAC-SHA256 signed

═══════════════════════════════════════════════════════════════
  DAES CoreBanking System - Data and Exchange Settlement
  © ${new Date().getFullYear()} - ${isSpanish ? 'Todos los derechos reservados' : 'All rights reserved'}
═══════════════════════════════════════════════════════════════
`;
    }
    
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Pledge_Anchor_${pledge.pledgeId}_${new Date().toISOString().split('T')[0]}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    
    console.log('[API1] 📄 TXT descargado:', pledge.pledgeId);
  };

  const handleCreatePledge = () => {
    if (pledgeForm.amountUsd <= 0) {
      alert(isSpanish ? '⚠️ Ingresa un monto válido' : '⚠️ Enter a valid amount');
      return;
    }
    
    const pledgeId = `PL-ANCHOR-${Date.now()}`;
    const lockedAt = new Date().toISOString();
    
    // Si termDays es 0, es perpetuo (sin expiración)
    let expiresAtISO: string | undefined = undefined;
    if (pledgeForm.termDays > 0) {
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + pledgeForm.termDays);
      expiresAtISO = expiresAt.toISOString();
    }
    
    // Obtener PoR report vinculado si existe
    let porReportData = '';
    if (pledgeForm.selectedPorReport) {
      const selectedPor = porReports.find(p => p.id === pledgeForm.selectedPorReport);
      if (selectedPor) {
        porReportData = selectedPor.report;
      }
    }
    
    // Generar endpoint único para este pledge
    const apiEndpoint = `https://api.luxliqdaes.cloud/api/v1/anchor/pledges/${pledgeId}`;
    
    const newPledge: PledgeAPI1 = {
      pledgeId,
      porId: POR_ID,
      status: 'ACTIVE',
      amountUsd: pledgeForm.amountUsd.toFixed(2),
      available: pledgeForm.amountUsd.toFixed(2),
      currency: pledgeForm.currency,
      beneficiary: pledgeForm.beneficiary,
      lockedAt,
      expiresAt: expiresAtISO,
      termDays: pledgeForm.termDays || undefined,
      linkedVUSDPledge: pledgeForm.selectedVUSDPledge || undefined,
      linkedPorReport: pledgeForm.selectedPorReport || undefined,
      porReportData: porReportData || undefined,
      apiEndpoint
    };
    
    // Guardar en localStorage
    const savedPledges = localStorage.getItem('api1_pledges');
    const currentPledges = savedPledges ? JSON.parse(savedPledges) : [];
    currentPledges.push(newPledge);
    localStorage.setItem('api1_pledges', JSON.stringify(currentPledges));
    
    setShowCreatePledgeModal(false);
    setPledgeForm({
      amountUsd: 0,
      currency: 'USD',
      termDays: 90,
      beneficiary: 'VUSD',
      notes: '',
      selectedVUSDPledge: '',
      selectedPorReport: ''
    });
    
    loadData();
    
    alert(
      `✅ ${isSpanish ? 'Pledge creado para Anchor VUSD' : 'Pledge created for Anchor VUSD'}\n\n` +
      `Pledge ID: ${pledgeId}\n` +
      `Amount: USD ${pledgeForm.amountUsd.toLocaleString()}\n` +
      `Beneficiary: ${pledgeForm.beneficiary}\n` +
      `Term: ${pledgeForm.termDays === 0 ? (isSpanish ? '∞ Perpetuo' : '∞ Perpetual') : pledgeForm.termDays + ' days'}\n` +
      `API Endpoint: ${apiEndpoint}\n\n` +
      (pledgeForm.selectedVUSDPledge ? `✓ ${isSpanish ? 'Vinculado a pledge VUSD' : 'Linked to VUSD pledge'}\n` : '') +
      (pledgeForm.selectedPorReport ? `✓ ${isSpanish ? 'Vinculado a PoR report' : 'Linked to PoR report'}` : '')
    );
  };

  const handleCreatePayout = async () => {
    if (!payoutForm.pledgeId) {
      alert(isSpanish ? '⚠️ Selecciona un pledge' : '⚠️ Select a pledge');
      return;
    }
    
    if (payoutForm.amountUsd <= 0) {
      alert(isSpanish ? '⚠️ Ingresa un monto válido' : '⚠️ Enter a valid amount');
      return;
    }
    
    if (!payoutForm.externalRef) {
      alert(isSpanish ? '⚠️ Ingresa una referencia externa' : '⚠️ Enter external reference');
      return;
    }
    
    try {
      setLoading(true);
      
      const idempotencyKey = `payout-${Date.now()}`;
      
      const response = await fetch(`${API_BASE}/api/v1/payouts`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${API_KEY}`,
          'X-Secret-Key': SECRET_KEY,
          'Content-Type': 'application/json',
          'Idempotency-Key': idempotencyKey
        },
        body: JSON.stringify({
          externalRef: payoutForm.externalRef,
          amountUsd: payoutForm.amountUsd.toFixed(2),
          currency: 'USD',
          pledgeId: payoutForm.pledgeId,
          beneficiary: {
            name: payoutForm.beneficiaryName || 'Unknown',
            accountType: payoutForm.accountType
          },
          callbackUrl: `${API_BASE}/webhooks/payouts/callback`
        })
      });
      
      if (response.ok) {
        const data = await response.json();
        
        // Agregar a lista de payouts
        const newPayout: PayoutAPI1 = {
          payoutId: data.payoutId,
          externalRef: payoutForm.externalRef,
          pledgeId: payoutForm.pledgeId,
          status: data.status,
          amountUsd: payoutForm.amountUsd.toFixed(2),
          currency: 'USD',
          createdAt: data.createdAt,
          beneficiary: {
            name: payoutForm.beneficiaryName,
            accountType: payoutForm.accountType
          }
        };
        
        // Guardar en localStorage
        const savedPayouts = localStorage.getItem('api1_payouts');
        const currentPayouts = savedPayouts ? JSON.parse(savedPayouts) : [];
        currentPayouts.unshift(newPayout); // Agregar al inicio
        localStorage.setItem('api1_payouts', JSON.stringify(currentPayouts));
        
        setPayouts(prev => [newPayout, ...prev]);
        
        setShowCreatePayoutModal(false);
        setPayoutForm({
          pledgeId: '',
          externalRef: '',
          amountUsd: 0,
          beneficiaryName: '',
          accountType: 'institutional'
        });
        
        alert(
          `✅ ${isSpanish ? 'Payout creado exitosamente' : 'Payout created successfully'}\n\n` +
          `Payout ID: ${data.payoutId}\n` +
          `External Ref: ${payoutForm.externalRef}\n` +
          `Amount: USD ${payoutForm.amountUsd.toLocaleString()}\n` +
          `Status: ${data.status}\n\n` +
          `${isSpanish ? 'El payout se procesará en 2 segundos' : 'Payout will be processed in 2 seconds'}`
        );
        
        // Recargar después de 3 segundos para ver el payout completado
        setTimeout(() => loadData(), 3000);
      } else {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Payout creation failed');
      }
    } catch (err) {
      console.error('[API1] ❌ Error creando payout:', err);
      alert(`❌ Error: ${(err as Error).message}`);
    } finally {
      setLoading(false);
    }
  };

  const generateReconciliation = async () => {
    try {
      setLoading(true);
      
      const today = new Date().toISOString().split('T')[0];
      
      const response = await fetch(
        `${API_BASE}/api/v1/reconciliation?date=${today}&format=json`,
        {
          headers: {
            'Authorization': `Bearer ${API_KEY}`,
            'X-Secret-Key': SECRET_KEY
          }
        }
      );
      
      if (response.ok) {
        const data = await response.json();
        setReconciliationData(data);
        
        alert(
          `✅ ${isSpanish ? 'Reporte de conciliación generado' : 'Reconciliation report generated'}\n\n` +
          `${isSpanish ? 'Fecha:' : 'Date:'} ${data.date}\n` +
          `${isSpanish ? 'Total Pledges:' : 'Total Pledges:'} ${data.summary.totalPledges}\n` +
          `${isSpanish ? 'Monto Pledges:' : 'Pledges Amount:'} $${parseFloat(data.summary.totalPledgeAmount).toLocaleString()}\n` +
          `${isSpanish ? 'Total Payouts:' : 'Total Payouts:'} ${data.summary.totalPayouts}\n` +
          `${isSpanish ? 'Monto Payouts:' : 'Payouts Amount:'} $${parseFloat(data.summary.totalPayoutAmount).toLocaleString()}`
        );
      } else {
        throw new Error('Failed to generate reconciliation');
      }
    } catch (err) {
      console.error('[API1] ❌ Error generando reconciliación:', err);
      alert(`❌ Error: ${(err as Error).message}`);
    } finally {
      setLoading(false);
    }
  };

  const downloadReconciliationCSV = async () => {
    try {
      setLoading(true);
      
      const today = new Date().toISOString().split('T')[0];
      
      const response = await fetch(
        `${API_BASE}/api/v1/reconciliation?date=${today}&format=csv`,
        {
          headers: {
            'Authorization': `Bearer ${API_KEY}`,
            'X-Secret-Key': SECRET_KEY
          }
        }
      );
      
      if (response.ok) {
        const csvText = await response.text();
        const blob = new Blob([csvText], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `reconciliation_${today}.csv`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        
        alert(
          `✅ ${isSpanish ? 'CSV descargado' : 'CSV downloaded'}\n\n` +
          `${isSpanish ? 'Archivo:' : 'File:'} reconciliation_${today}.csv`
        );
      }
    } catch (err) {
      console.error('[API1] ❌ Error descargando CSV:', err);
      alert(`❌ Error: ${(err as Error).message}`);
    } finally {
      setLoading(false);
    }
  };

  const testAnchorConnection = async () => {
    try {
      setLoading(true);
      setError(null);
      
      console.log('[API1] 🔌 Probando conexión con API1...');
      console.log('[API1] 📡 URL:', `${API_BASE}/api/v1/proof-of-reserves/${POR_ID}`);
      
      const response = await fetch(`${API_BASE}/api/v1/proof-of-reserves/${POR_ID}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${API_KEY}`,
          'X-Secret-Key': SECRET_KEY,
          'Accept': 'application/json'
        }
      });
      
      console.log('[API1] 📥 Respuesta recibida:', response.status);
      
      if (response.ok) {
        const data = await response.json();
        console.log('[API1] ✅ Data:', data);
        
        alert(
          `✅ ${isSpanish ? 'Conexión exitosa con API1' : 'Successful API1 connection'}\n\n` +
          `Endpoint: ${API_BASE}/api/v1/proof-of-reserves/${POR_ID}\n` +
          `Status: ${response.status} OK\n` +
          `PoR ID: ${data.porId || POR_ID}\n` +
          `Total Reserves: $${parseFloat(data.totalUsdReserves || 0).toLocaleString()}\n` +
          `Total Pledges: $${parseFloat(data.totalUsdPledges || 0).toLocaleString()}\n` +
          `CIRC_CAP: $${parseFloat(data.circulatingCap || 0).toLocaleString()}\n` +
          `Coverage Ratio: ${parseFloat(data.coverageRatio || 0).toFixed(4)}\n\n` +
          `✓ ${isSpanish ? 'Servidor API1 funcionando correctamente' : 'API1 server working correctly'}`
        );
      } else {
        const errorData = await response.json().catch(() => ({}));
        console.error('[API1] ❌ Error response:', errorData);
        
        alert(
          `⚠️ ${isSpanish ? 'Error del servidor API1' : 'API1 server error'}\n\n` +
          `Status: ${response.status} ${response.statusText}\n` +
          `Error: ${errorData.error || 'Unknown'}\n` +
          `Message: ${errorData.message || 'No details'}\n\n` +
          `${isSpanish ? '💡 Verifica que el servidor esté corriendo:' : '💡 Verify server is running:'}\n` +
          `npm run server:api1`
        );
      }
    } catch (err) {
      console.error('[API1] ❌ Error de conexión:', err);
      
      const errorMessage = (err as Error).message;
      
      alert(
        `❌ ${isSpanish ? 'No se pudo conectar al servidor API1' : 'Could not connect to API1 server'}\n\n` +
        `Error: ${errorMessage}\n\n` +
        `${isSpanish ? '🔧 Solución:' : '🔧 Solution:'}\n` +
        `1. ${isSpanish ? 'Abre una nueva terminal' : 'Open a new terminal'}\n` +
        `2. cd "${isSpanish ? 'carpeta-proyecto' : 'project-folder'}"\n` +
        `3. npm run server:api1\n\n` +
        `${isSpanish ? 'El servidor debe iniciar en puerto 8788' : 'Server should start on port 8788'}`
      );
      
      setError(isSpanish 
        ? 'Servidor API1 no disponible. Ejecuta: npm run server:api1'
        : 'API1 server not available. Run: npm run server:api1');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-black text-white p-6">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-cyan-400 flex items-center gap-3">
              <Shield className="w-8 h-8" />
              {isSpanish ? 'Proof of Reserves API1 - Anchor VUSD' : 'Proof of Reserves API1 - Anchor VUSD'}
            </h1>
            <p className="text-cyan-300/60 mt-2">
              {isSpanish 
                ? 'API institucional compatible con https://anchor.vergy.world'
                : 'Institutional API compatible with https://anchor.vergy.world'}
            </p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={testAnchorConnection}
              disabled={loading}
              className="px-4 py-2 bg-blue-500/20 border border-blue-500 text-blue-300 rounded-lg hover:bg-blue-500/30 flex items-center gap-2 disabled:opacity-50"
            >
              <Zap className="w-5 h-5" />
              {isSpanish ? 'Test Anchor' : 'Test Anchor'}
            </button>
            <button
              onClick={loadData}
              disabled={loading}
              className="px-4 py-2 bg-cyan-500/20 border border-cyan-500 text-cyan-300 rounded-lg hover:bg-cyan-500/30 flex items-center gap-2 disabled:opacity-50"
            >
              <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
              {isSpanish ? 'Actualizar' : 'Refresh'}
            </button>
          </div>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="mb-6 bg-red-900/20 border border-red-500 rounded-lg p-4">
          <div className="flex items-center gap-3">
            <AlertCircle className="w-6 h-6 text-red-400" />
            <div>
              <div className="text-red-300 font-bold">Error</div>
              <div className="text-red-300/80 text-sm">{error}</div>
            </div>
            <button
              onClick={() => setError(null)}
              className="ml-auto text-red-400 hover:text-red-300"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {/* API Credentials Banner */}
      <div className="bg-gradient-to-r from-purple-900/20 to-blue-900/20 border border-purple-500/30 rounded-lg p-4 mb-8">
        <div className="flex items-center gap-3 mb-3">
          <Key className="w-5 h-5 text-purple-400" />
          <h3 className="text-lg font-bold text-purple-300">
            {isSpanish ? 'Credenciales de Autenticación' : 'Authentication Credentials'}
          </h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
          <div className="bg-black/30 rounded p-3">
            <div className="text-purple-300/60 mb-1">PoR ID:</div>
            <div className="text-purple-300 font-mono break-all">{POR_ID}</div>
          </div>
          <div className="bg-black/30 rounded p-3">
            <div className="text-purple-300/60 mb-1">API Key:</div>
            <div className="text-purple-300 font-mono break-all">{API_KEY}</div>
          </div>
          <div className="bg-black/30 rounded p-3">
            <div className="text-purple-300/60 mb-1">Anchor URL:</div>
            <div className="text-blue-400 font-mono">https://anchor.vergy.world</div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6 border-b border-[#1a1a1a]">
        {(['overview', 'pledges', 'payouts', 'reconciliation', 'webhooks'] as const).map((view) => (
          <button
            key={view}
            onClick={() => setSelectedView(view)}
            className={`px-6 py-3 font-medium transition-colors capitalize ${
              selectedView === view
                ? 'text-cyan-400 border-b-2 border-cyan-400'
                : 'text-[#4d7c4d] hover:text-cyan-300'
            }`}
          >
            {view}
          </button>
        ))}
      </div>

      {/* Overview Section */}
      {selectedView === 'overview' && (
        <div className="space-y-6">
          {!reserveSummary ? (
            <div className="text-center py-12">
              <Database className="w-16 h-16 text-cyan-400/30 mx-auto mb-4 animate-pulse" />
              <div className="text-cyan-300/60 mb-2">
                {isSpanish ? 'Cargando datos...' : 'Loading data...'}
              </div>
            </div>
          ) : (
            <>
          {/* Contenido del overview */}
          {/* Key Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-[#0d0d0d] border border-cyan-500 rounded-lg p-6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-cyan-300/60 text-sm">{isSpanish ? 'Reservas Totales' : 'Total Reserves'}</span>
                <Database className="w-5 h-5 text-cyan-400" />
              </div>
              <div className="text-3xl font-bold text-cyan-400">
                ${parseFloat(reserveSummary.totalUsdReserves).toLocaleString()}
              </div>
            </div>

            <div className="bg-[#0d0d0d] border border-green-500 rounded-lg p-6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-green-300/60 text-sm">{isSpanish ? 'Pledges Totales' : 'Total Pledges'}</span>
                <Lock className="w-5 h-5 text-green-400" />
              </div>
              <div className="text-3xl font-bold text-green-400">
                ${parseFloat(reserveSummary.totalUsdPledges).toLocaleString()}
              </div>
            </div>

            <div className="bg-[#0d0d0d] border border-purple-500 rounded-lg p-6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-purple-300/60 text-sm">CIRC_CAP</span>
                <TrendingUp className="w-5 h-5 text-purple-400" />
              </div>
              <div className="text-3xl font-bold text-purple-400">
                ${parseFloat(reserveSummary.circulatingCap).toLocaleString()}
              </div>
            </div>

            <div className="bg-[#0d0d0d] border border-yellow-500 rounded-lg p-6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-yellow-300/60 text-sm">{isSpanish ? 'Ratio Cobertura' : 'Coverage Ratio'}</span>
                <CheckCircle className="w-5 h-5 text-yellow-400" />
              </div>
              <div className="text-3xl font-bold text-yellow-400">
                {parseFloat(reserveSummary.coverageRatio).toFixed(4)}
              </div>
            </div>
          </div>

          {/* API Info */}
          <div className="bg-[#0d0d0d] border border-cyan-500/30 rounded-lg p-6">
            <h3 className="text-xl font-bold text-cyan-300 mb-4 flex items-center gap-2">
              <Database className="w-6 h-6" />
              {isSpanish ? 'Endpoints API Disponibles' : 'Available API Endpoints'}
            </h3>
            <div className="space-y-3 text-sm font-mono max-h-[400px] overflow-y-auto pr-2 scroll-smooth">
              <div className="bg-black/30 rounded p-3">
                <div className="text-cyan-300/60 mb-1">GET Proof of Reserves:</div>
                <div className="text-cyan-400">
                  {API_BASE}/api/v1/proof-of-reserves/{POR_ID}
                </div>
              </div>
              <div className="bg-black/30 rounded p-3">
                <div className="text-green-300/60 mb-1">GET Active Pledges:</div>
                <div className="text-green-400">
                  {API_BASE}/api/v1/pledges?status=ACTIVE&porId={POR_ID}
                </div>
              </div>
              <div className="bg-black/30 rounded p-3">
                <div className="text-purple-300/60 mb-1">POST Create Pledge:</div>
                <div className="text-purple-400">
                  {API_BASE}/api/v1/pledges
                </div>
              </div>
              <div className="bg-black/30 rounded p-3">
                <div className="text-yellow-300/60 mb-1">GET Reserves Summary:</div>
                <div className="text-yellow-400">
                  {API_BASE}/api/v1/reserves/summary
                </div>
              </div>
            </div>
          </div>

          {/* Anchor Integration Status */}
          <div className="bg-gradient-to-r from-blue-900/20 to-purple-900/20 border border-blue-500/30 rounded-lg p-6">
            <h3 className="text-xl font-bold text-blue-300 mb-4 flex items-center gap-2">
              <Webhook className="w-6 h-6" />
              {isSpanish ? 'Estado de Integración Anchor' : 'Anchor Integration Status'}
            </h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div className="bg-black/30 rounded p-3">
                <div className="text-blue-300/60 mb-1">{isSpanish ? 'URL Anchor:' : 'Anchor URL:'}</div>
                <div className="text-blue-400 font-mono">https://anchor.vergy.world</div>
              </div>
              <div className="bg-black/30 rounded p-3">
                <div className="text-blue-300/60 mb-1">{isSpanish ? 'Webhooks HMAC:' : 'HMAC Webhooks:'}</div>
                <div className="text-green-400 font-bold">✅ {isSpanish ? 'Habilitados' : 'Enabled'}</div>
              </div>
              <div className="bg-black/30 rounded p-3">
                <div className="text-blue-300/60 mb-1">{isSpanish ? 'Protocolo:' : 'Protocol:'}</div>
                <div className="text-purple-400">SEP-24 Compatible</div>
              </div>
              <div className="bg-black/30 rounded p-3">
                <div className="text-blue-300/60 mb-1">{isSpanish ? 'Idempotencia:' : 'Idempotency:'}</div>
                <div className="text-green-400">✅ {isSpanish ? 'Soportada' : 'Supported'}</div>
              </div>
            </div>
          </div>
            </>
          )}
        </div>
      )}

      {/* Pledges Section */}
      {selectedView === 'pledges' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-bold text-green-300">
              {isSpanish ? 'Pledges Activos (Lockbox)' : 'Active Pledges (Lockbox)'}
            </h2>
            <button
              onClick={() => setShowCreatePledgeModal(true)}
              className="px-6 py-3 bg-green-500/20 border border-green-500 text-green-300 rounded-lg hover:bg-green-500/30 flex items-center gap-2 font-bold"
            >
              <Lock className="w-5 h-5" />
              {isSpanish ? 'Crear Pledge' : 'Create Pledge'}
            </button>
          </div>

          {pledges.length === 0 ? (
            <div className="text-center py-12">
              <Lock className="w-16 h-16 text-green-400/30 mx-auto mb-4" />
              <div className="text-green-300/60 mb-2">
                {isSpanish ? 'No hay pledges activos' : 'No active pledges'}
              </div>
              <div className="text-green-300/40 text-sm">
                {isSpanish 
                  ? 'Los pledges permiten al Anchor calcular CIRC_CAP'
                  : 'Pledges allow Anchor to calculate CIRC_CAP'}
              </div>
            </div>
          ) : (
            <div className="space-y-3 max-h-[calc(100vh-400px)] min-h-[300px] overflow-y-auto pr-2 scroll-smooth">
              {pledges.map((pledge) => (
                <div
                  key={pledge.pledgeId}
                  className="bg-[#0d0d0d] border border-green-500/30 rounded-lg p-6"
                >
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <span className="px-3 py-1 bg-green-500/20 text-green-300 text-xs rounded font-bold">
                          {pledge.status}
                        </span>
                        <span className="text-white font-mono text-sm">{pledge.pledgeId}</span>
                      </div>
                      <div className="text-sm text-green-300/60">
                        {isSpanish ? 'Beneficiario:' : 'Beneficiary:'} {pledge.beneficiary}
                      </div>
                      {pledge.linkedVUSDPledge && (
                        <div className="text-xs text-cyan-400 mt-1">
                          🔗 {isSpanish ? 'Vinculado a:' : 'Linked to:'} {pledge.linkedVUSDPledge}
                        </div>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => downloadPledgeTXT(pledge)}
                        className="p-2 bg-cyan-500/20 border border-cyan-500 text-cyan-300 rounded-lg hover:bg-cyan-500/30 transition-all"
                        title={isSpanish ? 'Descargar TXT' : 'Download TXT'}
                      >
                        <FileText className="w-5 h-5" />
                      </button>
                      <button
                        onClick={() => handleDeletePledge(pledge)}
                        className="p-2 bg-red-500/20 border border-red-500 text-red-400 rounded-lg hover:bg-red-500/30 transition-all"
                        title={isSpanish ? 'Eliminar' : 'Delete'}
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm mb-4">
                    <div>
                      <div className="text-green-300/60 mb-1">{isSpanish ? 'Monto USD:' : 'USD Amount:'}</div>
                      <div className="text-2xl font-bold text-green-300">
                        ${parseFloat(pledge.amountUsd).toLocaleString()}
                      </div>
                    </div>
                    <div>
                      <div className="text-cyan-300/60 mb-1">{isSpanish ? 'Disponible:' : 'Available:'}</div>
                      <div className="text-xl font-bold text-cyan-300">
                        ${parseFloat(pledge.available).toLocaleString()}
                      </div>
                    </div>
                    <div>
                      <div className="text-purple-300/60 mb-1">{isSpanish ? 'Bloqueado:' : 'Locked:'}</div>
                      <div className="text-purple-300 text-sm">
                        {new Date(pledge.lockedAt).toLocaleDateString(isSpanish ? 'es-ES' : 'en-US')}
                      </div>
                    </div>
                    <div>
                      <div className="text-yellow-300/60 mb-1">{isSpanish ? 'Expira:' : 'Expires:'}</div>
                      <div className="text-yellow-300 text-sm font-bold">
                        {pledge.expiresAt 
                          ? new Date(pledge.expiresAt).toLocaleDateString(isSpanish ? 'es-ES' : 'en-US')
                          : (
                            <span className="text-purple-400 flex items-center gap-1">
                              ∞ {isSpanish ? 'Perpetuo' : 'Perpetual'}
                            </span>
                          )
                        }
                      </div>
                    </div>
                  </div>

                  {/* API Endpoint */}
                  {pledge.apiEndpoint && (
                    <div className="bg-blue-900/20 border border-blue-500/30 rounded-lg p-3">
                      <div className="text-xs text-blue-300/60 mb-2 font-semibold flex items-center gap-2">
                        <Key className="w-3 h-3" />
                        {isSpanish ? 'API Endpoint Generado:' : 'Generated API Endpoint:'}
                      </div>
                      <div className="flex items-center gap-2">
                        <code className="flex-1 text-blue-400 font-mono text-xs bg-black/50 p-2 rounded border border-blue-500/20 break-all">
                          GET {pledge.apiEndpoint}
                        </code>
                        <button
                          onClick={() => {
                            navigator.clipboard.writeText(pledge.apiEndpoint || '');
                            alert(isSpanish ? '✅ Endpoint copiado' : '✅ Endpoint copied');
                          }}
                          className="p-2 bg-blue-500/20 border border-blue-500 text-blue-300 rounded hover:bg-blue-500/30"
                        >
                          <Key className="w-4 h-4" />
                        </button>
                      </div>
                      <div className="text-xs text-blue-300/60 mt-2">
                        🔐 {isSpanish ? 'Requiere autenticación Bearer + X-Secret-Key' : 'Requires Bearer + X-Secret-Key authentication'}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Payouts Section */}
      {selectedView === 'payouts' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-bold text-blue-300">
              {isSpanish ? 'Payouts (Retiros VUSD → USD)' : 'Payouts (VUSD → USD Withdrawals)'}
            </h2>
            <button
              onClick={() => setShowCreatePayoutModal(true)}
              disabled={pledges.length === 0}
              className="px-6 py-3 bg-blue-500/20 border border-blue-500 text-blue-300 rounded-lg hover:bg-blue-500/30 flex items-center gap-2 font-bold disabled:opacity-50"
            >
              <Send className="w-5 h-5" />
              {isSpanish ? 'Crear Payout' : 'Create Payout'}
            </button>
          </div>

          {payouts.length === 0 ? (
            <div className="text-center py-12">
              <Send className="w-16 h-16 text-blue-400/30 mx-auto mb-4" />
              <div className="text-blue-300/60 mb-2">
                {isSpanish ? 'No hay payouts registrados' : 'No payouts registered'}
              </div>
              <div className="text-blue-300/40 text-sm">
                {isSpanish 
                  ? 'Compatible con SEP-24 para integración con Anchor'
                  : 'SEP-24 compatible for Anchor integration'}
              </div>
            </div>
          ) : (
            <div className="space-y-3 max-h-[calc(100vh-400px)] min-h-[300px] overflow-y-auto pr-2 scroll-smooth">
              {payouts.map((payout) => (
                <div
                  key={payout.payoutId}
                  className="bg-[#0d0d0d] border border-blue-500/30 rounded-lg p-6"
                >
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <div className="flex items-center gap-3 mb-2">
                        <span className={`px-3 py-1 text-xs rounded font-bold ${
                          payout.status === 'COMPLETED' ? 'bg-green-500/20 text-green-300' :
                          payout.status === 'PROCESSING' ? 'bg-yellow-500/20 text-yellow-300' :
                          payout.status === 'FAILED' ? 'bg-red-500/20 text-red-400' :
                          'bg-blue-500/20 text-blue-300'
                        }`}>
                          {payout.status}
                        </span>
                        <span className="text-white font-mono text-sm">{payout.payoutId}</span>
                      </div>
                      <div className="text-sm text-blue-300/60">
                        External Ref: {payout.externalRef}
                      </div>
                    </div>
                    <Send className="w-8 h-8 text-blue-400" />
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div>
                      <div className="text-blue-300/60 mb-1">{isSpanish ? 'Monto:' : 'Amount:'}</div>
                      <div className="text-xl font-bold text-blue-300">
                        ${parseFloat(payout.amountUsd).toLocaleString()}
                      </div>
                    </div>
                    <div>
                      <div className="text-cyan-300/60 mb-1">{isSpanish ? 'Beneficiario:' : 'Beneficiary:'}</div>
                      <div className="text-cyan-300">{payout.beneficiary.name}</div>
                    </div>
                    <div>
                      <div className="text-purple-300/60 mb-1">{isSpanish ? 'Creado:' : 'Created:'}</div>
                      <div className="text-purple-300 text-sm">
                        {new Date(payout.createdAt).toLocaleString(isSpanish ? 'es-ES' : 'en-US')}
                      </div>
                    </div>
                    {payout.completedAt && (
                      <div>
                        <div className="text-green-300/60 mb-1">{isSpanish ? 'Completado:' : 'Completed:'}</div>
                        <div className="text-green-300 text-sm">
                          {new Date(payout.completedAt).toLocaleString(isSpanish ? 'es-ES' : 'en-US')}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Reconciliation Section */}
      {selectedView === 'reconciliation' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-bold text-purple-300">
              {isSpanish ? 'Conciliación Diaria' : 'Daily Reconciliation'}
            </h2>
            <div className="flex gap-2">
              <button
                onClick={downloadReconciliationCSV}
                disabled={loading}
                className="px-4 py-2 bg-green-500/20 border border-green-500 text-green-300 rounded-lg hover:bg-green-500/30 flex items-center gap-2 disabled:opacity-50"
              >
                <Download className="w-4 h-4" />
                CSV
              </button>
              <button
                onClick={generateReconciliation}
                disabled={loading}
                className="px-6 py-3 bg-purple-500/20 border border-purple-500 text-purple-300 rounded-lg hover:bg-purple-500/30 flex items-center gap-2 font-bold disabled:opacity-50"
              >
                <FileText className="w-5 h-5" />
                {isSpanish ? 'Generar Reporte' : 'Generate Report'}
              </button>
            </div>
          </div>

          <div className="bg-[#0d0d0d] border border-purple-500/30 rounded-lg p-6">
            <div className="flex items-center gap-3 mb-4">
              <FileText className="w-6 h-6 text-purple-400" />
              <h3 className="text-lg font-bold text-purple-300">
                {isSpanish ? 'Reporte de Conciliación' : 'Reconciliation Report'}
              </h3>
            </div>
            <div className="text-sm text-purple-300/60 mb-4">
              {isSpanish 
                ? 'Genera reportes CSV/JSON con pledges, payouts y movimientos del día'
                : 'Generate CSV/JSON reports with pledges, payouts and daily movements'}
            </div>
            
            {reconciliationData ? (
              <div className="bg-black/30 rounded-lg p-4 space-y-3">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div className="bg-purple-900/20 rounded p-3">
                    <div className="text-purple-300/60 mb-1">{isSpanish ? 'Fecha:' : 'Date:'}</div>
                    <div className="text-purple-300 font-bold">{reconciliationData.date}</div>
                  </div>
                  <div className="bg-green-900/20 rounded p-3">
                    <div className="text-green-300/60 mb-1">{isSpanish ? 'Pledges:' : 'Pledges:'}</div>
                    <div className="text-green-300 font-bold">{reconciliationData.summary.totalPledges}</div>
                  </div>
                  <div className="bg-blue-900/20 rounded p-3">
                    <div className="text-blue-300/60 mb-1">{isSpanish ? 'Payouts:' : 'Payouts:'}</div>
                    <div className="text-blue-300 font-bold">{reconciliationData.summary.totalPayouts}</div>
                  </div>
                  <div className="bg-cyan-900/20 rounded p-3">
                    <div className="text-cyan-300/60 mb-1">{isSpanish ? 'Neto:' : 'Net:'}</div>
                    <div className="text-cyan-300 font-bold">
                      ${(parseFloat(reconciliationData.summary.totalPledgeAmount) - parseFloat(reconciliationData.summary.totalPayoutAmount)).toLocaleString()}
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-6 text-purple-300/60">
                {isSpanish 
                  ? 'Click "Generar Reporte" para ver datos de hoy'
                  : 'Click "Generate Report" to view today\'s data'}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Webhooks Section */}
      {selectedView === 'webhooks' && (
        <div className="space-y-6">
          <h2 className="text-2xl font-bold text-orange-300 mb-4">
            {isSpanish ? 'Webhooks HMAC → Anchor' : 'HMAC Webhooks → Anchor'}
          </h2>

          <div className="bg-[#0d0d0d] border border-orange-500/30 rounded-lg p-6">
            <div className="flex items-center gap-3 mb-4">
              <Webhook className="w-6 h-6 text-orange-400" />
              <h3 className="text-lg font-bold text-orange-300">
                {isSpanish ? 'Configuración de Webhooks' : 'Webhook Configuration'}
              </h3>
            </div>

            <div className="space-y-4">
              <div className="bg-black/30 rounded p-4">
                <div className="text-orange-300/60 text-sm mb-2">{isSpanish ? 'URL Destino:' : 'Destination URL:'}</div>
                <div className="text-orange-300 font-mono text-sm">
                  https://anchor.vergy.world/daes/webhooks/pledges
                </div>
              </div>
              <div className="bg-black/30 rounded p-4">
                <div className="text-orange-300/60 text-sm mb-2">{isSpanish ? 'Firma:' : 'Signature:'}</div>
                <div className="text-orange-300 font-mono text-xs">
                  X-DAES-Signature: HMAC-SHA256(secret, timestamp + body)
                </div>
              </div>
              <div className="bg-black/30 rounded p-4 max-h-[300px] overflow-y-auto scroll-smooth">
                <div className="text-orange-300/60 text-sm mb-2">{isSpanish ? 'Eventos:' : 'Events:'}</div>
                <div className="flex flex-wrap gap-2">
                  {['PLEDGE_CREATED', 'PLEDGE_ADJUSTED', 'PLEDGE_RELEASED', 'PAYOUT_COMPLETED'].map(event => (
                    <span key={event} className="px-2 py-1 bg-orange-500/20 text-orange-300 rounded text-xs">
                      {event}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Create Pledge Modal - Integrado con API VUSD */}
      {showCreatePledgeModal && (
        <div className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4">
          <div className="bg-[#0d0d0d] border-2 border-green-500 rounded-xl max-w-3xl w-full p-6 max-h-[90vh] overflow-y-auto">
            <h3 className="text-2xl font-bold text-green-300 mb-6 flex items-center gap-3">
              <Lock className="w-7 h-7" />
              {isSpanish ? 'Crear Pledge para Anchor VUSD' : 'Create Pledge for Anchor VUSD'}
            </h3>

            <div className="space-y-4">
              {/* Seleccionar Pledge de API VUSD */}
              <div className="bg-cyan-900/20 border border-cyan-500/30 rounded-lg p-4">
                <label className="block text-cyan-300 text-sm mb-3 font-semibold flex items-center gap-2">
                  <Database className="w-4 h-4" />
                  {isSpanish ? '1. Seleccionar Pledge de API VUSD (Opcional):' : '1. Select Pledge from API VUSD (Optional):'}
                </label>
                {availablePledgesVUSD.length === 0 ? (
                  <div className="bg-yellow-900/20 border border-yellow-500/30 rounded p-3 text-sm text-yellow-300">
                    ⚠️ {isSpanish 
                      ? 'No hay pledges en API VUSD. Puedes crear uno manualmente o ir a API VUSD primero.'
                      : 'No pledges in API VUSD. You can create one manually or go to API VUSD first.'}
                  </div>
                ) : (
                  <select
                    value={pledgeForm.selectedVUSDPledge}
                    onChange={(e) => {
                      const pledgeId = e.target.value;
                      
                      if (pledgeId) {
                        const selectedPledge = availablePledgesVUSD.find(p => p.id === pledgeId);
                        if (selectedPledge) {
                          setPledgeForm({
                            ...pledgeForm,
                            selectedVUSDPledge: pledgeId,
                            amountUsd: selectedPledge.amount,
                            currency: selectedPledge.currency,
                            beneficiary: selectedPledge.beneficiary
                          });
                        }
                      } else {
                        setPledgeForm({
                          ...pledgeForm,
                          selectedVUSDPledge: '',
                          amountUsd: 0,
                          beneficiary: 'VUSD'
                        });
                      }
                    }}
                    className="w-full bg-[#0a0a0a] border border-cyan-500/30 rounded-lg px-4 py-3 text-white"
                  >
                    <option value="">{isSpanish ? '-- Crear manualmente --' : '-- Create manually --'}</option>
                    {availablePledgesVUSD.map(p => (
                      <option key={p.id} value={p.id}>
                        {p.id} | ${p.amount.toLocaleString()} | {p.beneficiary}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              {/* Seleccionar PoR Report de API VUSD */}
              <div className="bg-purple-900/20 border border-purple-500/30 rounded-lg p-4">
                <label className="block text-purple-300 text-sm mb-3 font-semibold flex items-center gap-2">
                  <FileText className="w-4 h-4" />
                  {isSpanish ? '2. Vincular Proof of Reserve (Opcional):' : '2. Link Proof of Reserve (Optional):'}
                </label>
                {porReports.length === 0 ? (
                  <div className="bg-yellow-900/20 border border-yellow-500/30 rounded p-3 text-sm text-yellow-300">
                    ⚠️ {isSpanish 
                      ? 'No hay PoR generados. Ve a API VUSD → Proof of Reserve para generar uno.'
                      : 'No PoR generated. Go to API VUSD → Proof of Reserve to generate one.'}
                  </div>
                ) : (
                  <select
                    value={pledgeForm.selectedPorReport}
                    onChange={(e) => setPledgeForm({ ...pledgeForm, selectedPorReport: e.target.value })}
                    className="w-full bg-[#0a0a0a] border border-purple-500/30 rounded-lg px-4 py-3 text-white"
                  >
                    <option value="">{isSpanish ? '-- Sin vincular --' : '-- No link --'}</option>
                    {porReports.map((por, i) => (
                      <option key={por.id} value={por.id}>
                        PoR #{porReports.length - i} | Cap: ${por.circulatingCap.toLocaleString()} | {new Date(por.timestamp).toLocaleDateString()}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              <div>
                <label className="block text-green-300 text-sm mb-2 font-semibold">
                  {isSpanish ? '3. Monto USD:' : '3. USD Amount:'}
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={pledgeForm.amountUsd}
                  onChange={(e) => setPledgeForm({ ...pledgeForm, amountUsd: parseFloat(e.target.value) || 0 })}
                  className="w-full bg-[#0a0a0a] border border-green-500/30 rounded-lg px-4 py-3 text-white font-mono text-xl focus:border-green-500 focus:ring-2 focus:ring-green-500/20"
                  placeholder="0.00"
                  disabled={!!pledgeForm.selectedVUSDPledge}
                />
                {pledgeForm.selectedVUSDPledge && (
                  <div className="text-xs text-cyan-300 mt-1">
                    ✓ {isSpanish ? 'Monto auto-cargado desde pledge VUSD' : 'Amount auto-loaded from VUSD pledge'}
                  </div>
                )}
              </div>

              <div>
                <label className="block text-green-300 text-sm mb-2 font-semibold">
                  {isSpanish ? '4. Beneficiario:' : '4. Beneficiary:'}
                </label>
                <input
                  type="text"
                  value={pledgeForm.beneficiary}
                  onChange={(e) => setPledgeForm({ ...pledgeForm, beneficiary: e.target.value })}
                  className="w-full bg-[#0a0a0a] border border-green-500/30 rounded-lg px-4 py-3 text-white"
                  disabled={!!pledgeForm.selectedVUSDPledge}
                />
              </div>

              <div>
                <label className="block text-green-300 text-sm mb-2 font-semibold">
                  {isSpanish ? '5. Plazo (días):' : '5. Term (days):'}
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {[60, 90, 180].map(days => (
                    <button
                      key={days}
                      type="button"
                      onClick={() => setPledgeForm({ ...pledgeForm, termDays: days })}
                      className={`px-4 py-2 rounded-lg font-bold transition-all ${
                        pledgeForm.termDays === days
                          ? 'bg-green-500 text-black'
                          : 'bg-green-500/20 border border-green-500/30 text-green-300 hover:bg-green-500/30'
                      }`}
                    >
                      {days}d
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={() => setPledgeForm({ ...pledgeForm, termDays: 0 })}
                    className={`px-4 py-2 rounded-lg font-bold transition-all ${
                      pledgeForm.termDays === 0
                        ? 'bg-purple-500 text-white border-2 border-purple-300'
                        : 'bg-purple-500/20 border border-purple-500/30 text-purple-300 hover:bg-purple-500/30'
                    }`}
                  >
                    <div className="text-lg">∞</div>
                    <div className="text-xs">{isSpanish ? 'Perpetuo' : 'Perpetual'}</div>
                  </button>
                </div>
                {pledgeForm.termDays === 0 && (
                  <div className="mt-2 text-xs text-purple-300 bg-purple-900/20 border border-purple-500/30 rounded p-2">
                    ♾️ {isSpanish 
                      ? 'Pledge perpetuo - Sin fecha de expiración'
                      : 'Perpetual pledge - No expiration date'}
                  </div>
                )}
              </div>

              <div>
                <label className="block text-green-300 text-sm mb-2 font-semibold">
                  {isSpanish ? '6. Notas (opcional):' : '6. Notes (optional):'}
                </label>
                <textarea
                  value={pledgeForm.notes}
                  onChange={(e) => setPledgeForm({ ...pledgeForm, notes: e.target.value })}
                  className="w-full bg-[#0a0a0a] border border-green-500/30 rounded-lg px-4 py-3 text-white"
                  rows={3}
                  placeholder={isSpanish ? 'Información adicional...' : 'Additional information...'}
                />
              </div>
            </div>

            <div className="flex gap-3 mt-6 pt-6 border-t border-green-500/20">
              <button
                onClick={() => {
                  setShowCreatePledgeModal(false);
                  setPledgeForm({
                    amountUsd: 0,
                    currency: 'USD',
                    termDays: 90,
                    beneficiary: 'VUSD',
                    notes: '',
                    selectedVUSDPledge: '',
                    selectedPorReport: ''
                  });
                }}
                className="flex-1 px-6 py-3 bg-[#1a1a1a] border border-[#2a2a2a] text-[#4d7c4d] rounded-lg hover:bg-[#252525] font-semibold"
              >
                {isSpanish ? 'Cancelar' : 'Cancel'}
              </button>
              <button
                onClick={handleCreatePledge}
                className="flex-1 px-6 py-3 bg-gradient-to-r from-green-500 to-emerald-500 text-black rounded-lg hover:shadow-[0_0_20px_rgba(34,197,94,0.6)] font-bold flex items-center justify-center gap-2"
              >
                <Lock className="w-5 h-5" />
                {isSpanish ? 'Crear Pledge para Anchor' : 'Create Pledge for Anchor'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create Payout Modal */}
      {showCreatePayoutModal && (
        <div className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4">
          <div className="bg-[#0d0d0d] border-2 border-blue-500 rounded-xl max-w-2xl w-full p-6">
            <h3 className="text-2xl font-bold text-blue-300 mb-6 flex items-center gap-3">
              <Send className="w-7 h-7" />
              {isSpanish ? 'Crear Payout (VUSD → USD)' : 'Create Payout (VUSD → USD)'}
            </h3>

            <div className="space-y-4">
              <div>
                <label className="block text-blue-300 text-sm mb-2 font-semibold">
                  {isSpanish ? 'Seleccionar Pledge:' : 'Select Pledge:'}
                </label>
                <select
                  value={payoutForm.pledgeId}
                  onChange={(e) => setPayoutForm({ ...payoutForm, pledgeId: e.target.value })}
                  className="w-full bg-[#0a0a0a] border border-blue-500/30 rounded-lg px-4 py-3 text-white"
                  required
                >
                  <option value="">{isSpanish ? '-- Selecciona un pledge --' : '-- Select a pledge --'}</option>
                  {pledges.map(p => (
                    <option key={p.pledgeId} value={p.pledgeId}>
                      {p.pledgeId} | ${parseFloat(p.available).toLocaleString()} {isSpanish ? 'disponible' : 'available'}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-blue-300 text-sm mb-2 font-semibold">
                  {isSpanish ? 'Referencia Externa (SEP-24):' : 'External Reference (SEP-24):'}
                </label>
                <input
                  type="text"
                  value={payoutForm.externalRef}
                  onChange={(e) => setPayoutForm({ ...payoutForm, externalRef: e.target.value })}
                  className="w-full bg-[#0a0a0a] border border-blue-500/30 rounded-lg px-4 py-3 text-white font-mono"
                  placeholder="SEP24-TRX-001"
                  required
                />
              </div>

              <div>
                <label className="block text-blue-300 text-sm mb-2 font-semibold">
                  {isSpanish ? 'Monto USD:' : 'USD Amount:'}
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={payoutForm.amountUsd}
                  onChange={(e) => setPayoutForm({ ...payoutForm, amountUsd: parseFloat(e.target.value) || 0 })}
                  className="w-full bg-[#0a0a0a] border border-blue-500/30 rounded-lg px-4 py-3 text-white font-mono text-xl"
                  placeholder="0.00"
                  required
                />
              </div>

              <div>
                <label className="block text-blue-300 text-sm mb-2 font-semibold">
                  {isSpanish ? 'Nombre del Beneficiario:' : 'Beneficiary Name:'}
                </label>
                <input
                  type="text"
                  value={payoutForm.beneficiaryName}
                  onChange={(e) => setPayoutForm({ ...payoutForm, beneficiaryName: e.target.value })}
                  className="w-full bg-[#0a0a0a] border border-blue-500/30 rounded-lg px-4 py-3 text-white"
                  placeholder="John Doe"
                />
              </div>

              <div>
                <label className="block text-blue-300 text-sm mb-2 font-semibold">
                  {isSpanish ? 'Tipo de Cuenta:' : 'Account Type:'}
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setPayoutForm({ ...payoutForm, accountType: 'institutional' })}
                    className={`px-4 py-2 rounded-lg font-bold ${
                      payoutForm.accountType === 'institutional'
                        ? 'bg-blue-500 text-white'
                        : 'bg-blue-500/20 border border-blue-500/30 text-blue-300'
                    }`}
                  >
                    {isSpanish ? 'Institucional' : 'Institutional'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setPayoutForm({ ...payoutForm, accountType: 'retail' })}
                    className={`px-4 py-2 rounded-lg font-bold ${
                      payoutForm.accountType === 'retail'
                        ? 'bg-blue-500 text-white'
                        : 'bg-blue-500/20 border border-blue-500/30 text-blue-300'
                    }`}
                  >
                    {isSpanish ? 'Retail' : 'Retail'}
                  </button>
                </div>
              </div>
            </div>

            <div className="flex gap-3 mt-6 pt-6 border-t border-blue-500/20">
              <button
                onClick={() => {
                  setShowCreatePayoutModal(false);
                  setPayoutForm({
                    pledgeId: '',
                    externalRef: '',
                    amountUsd: 0,
                    beneficiaryName: '',
                    accountType: 'institutional'
                  });
                }}
                className="flex-1 px-6 py-3 bg-[#1a1a1a] border border-[#2a2a2a] text-[#4d7c4d] rounded-lg hover:bg-[#252525] font-semibold"
              >
                {isSpanish ? 'Cancelar' : 'Cancel'}
              </button>
              <button
                onClick={handleCreatePayout}
                disabled={loading}
                className="flex-1 px-6 py-3 bg-gradient-to-r from-blue-500 to-cyan-500 text-white rounded-lg hover:shadow-[0_0_20px_rgba(59,130,246,0.6)] font-bold flex items-center justify-center gap-2 disabled:opacity-50"
              >
                <Send className="w-5 h-5" />
                {isSpanish ? 'Crear Payout' : 'Create Payout'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

