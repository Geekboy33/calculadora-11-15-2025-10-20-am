/**
 * PayPal Invoicing Module - Sistema de Facturación PayPal
 * Módulo completo para crear, enviar, y gestionar facturas de PayPal
 * Integración directa con PayPal Invoicing API v2
 */

import { useState, useEffect, useCallback } from 'react';
import {
  Send,
  Settings,
  Users,
  History,
  CheckCircle,
  XCircle,
  AlertCircle,
  Plus,
  ArrowRight,
  Globe,
  DollarSign,
  Wallet,
  RefreshCw,
  Eye,
  EyeOff,
  Copy,
  Download,
  Search,
  Clock,
  TrendingUp,
  Building2,
  Mail,
  User,
  Calendar,
  FileText,
  Zap,
  Shield,
  ExternalLink,
  Info,
  Loader2,
  X,
  Check,
  Trash2,
  Bell,
  Ban,
  Receipt,
  CreditCard,
  Printer,
  Link2,
  ChevronRight,
  ChevronDown,
  MoreVertical,
  Edit,
  Tag,
  Percent,
  Package,
  Hash
} from 'lucide-react';
import { useLanguage } from '../lib/i18n';
import { custodyStore, type CustodyAccount } from '../lib/custody-store';

// Tipos
interface PayPalRestConfig {
  isConfigured: boolean;
  clientId: string;
  clientSecret: string;
  environment: 'SANDBOX' | 'LIVE';
  businessEmail: string;
  hasValidToken?: boolean;
}

interface Invoice {
  id: string;
  invoiceNumber: string;
  status: 'DRAFT' | 'SENT' | 'SCHEDULED' | 'PAYMENT_PENDING' | 'PAID' | 'MARKED_AS_PAID' | 'CANCELLED' | 'REFUNDED' | 'PARTIALLY_PAID' | 'MARKED_AS_REFUNDED';
  amount: number;
  currency: string;
  recipientEmail: string;
  recipientName: string;
  dueDate: string;
  createdAt: string;
  sentAt?: string;
  paidAt?: string;
  viewUrl?: string;
  payUrl?: string;
  note?: string;
  items?: InvoiceItem[];
}

interface InvoiceItem {
  name: string;
  description?: string;
  quantity: number;
  unitPrice: number;
  currency: string;
  tax?: number;
}

interface SavedBeneficiary {
  id: string;
  email: string;
  name: string;
  nickname?: string;
  createdAt: string;
  lastUsed?: string;
  totalInvoices: number;
  totalAmount: number;
}

// Constantes
const SUPPORTED_CURRENCIES = [
  { code: 'USD', symbol: '$', name: 'US Dollar', flag: '🇺🇸' },
  { code: 'EUR', symbol: '€', name: 'Euro', flag: '🇪🇺' },
  { code: 'GBP', symbol: '£', name: 'British Pound', flag: '🇬🇧' },
  { code: 'CHF', symbol: 'Fr', name: 'Swiss Franc', flag: '🇨🇭' },
  { code: 'CAD', symbol: 'C$', name: 'Canadian Dollar', flag: '🇨🇦' },
  { code: 'AUD', symbol: 'A$', name: 'Australian Dollar', flag: '🇦🇺' },
  { code: 'JPY', symbol: '¥', name: 'Japanese Yen', flag: '🇯🇵' },
  { code: 'MXN', symbol: '$', name: 'Mexican Peso', flag: '🇲🇽' }
];

const INVOICE_STATUS_COLORS: Record<string, { bg: string; text: string; icon: any }> = {
  DRAFT: { bg: 'bg-gray-500/20', text: 'text-gray-400', icon: FileText },
  SENT: { bg: 'bg-blue-500/20', text: 'text-blue-400', icon: Send },
  SCHEDULED: { bg: 'bg-purple-500/20', text: 'text-purple-400', icon: Clock },
  PAYMENT_PENDING: { bg: 'bg-yellow-500/20', text: 'text-yellow-400', icon: Clock },
  PAID: { bg: 'bg-green-500/20', text: 'text-green-400', icon: CheckCircle },
  MARKED_AS_PAID: { bg: 'bg-green-500/20', text: 'text-green-400', icon: Check },
  CANCELLED: { bg: 'bg-red-500/20', text: 'text-red-400', icon: Ban },
  REFUNDED: { bg: 'bg-orange-500/20', text: 'text-orange-400', icon: ArrowRight },
  PARTIALLY_PAID: { bg: 'bg-amber-500/20', text: 'text-amber-400', icon: Percent },
  MARKED_AS_REFUNDED: { bg: 'bg-orange-500/20', text: 'text-orange-400', icon: ArrowRight }
};

export default function PayPalTransferModule() {
  const { language } = useLanguage();
  const isSpanish = language === 'es';
  
  // Estados principales
  const [activeTab, setActiveTab] = useState<'create' | 'invoices' | 'beneficiaries' | 'history' | 'config'>('create');
  const [isLoading, setIsLoading] = useState(false);
  const [notification, setNotification] = useState<{ type: 'success' | 'error' | 'info'; message: string } | null>(null);
  
  // Configuración REST API
  const [restConfig, setRestConfig] = useState<PayPalRestConfig>({
    isConfigured: false,
    clientId: '',
    clientSecret: '',
    environment: 'LIVE',
    businessEmail: ''
  });
  const [connectionStatus, setConnectionStatus] = useState<'unknown' | 'connected' | 'error'>('unknown');
  const [showSecrets, setShowSecrets] = useState(false);
  
  // Facturas
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);
  
  // Formulario de nueva factura
  const [recipientEmail, setRecipientEmail] = useState('');
  const [recipientName, setRecipientName] = useState('');
  const [invoiceAmount, setInvoiceAmount] = useState('');
  const [invoiceCurrency, setInvoiceCurrency] = useState('USD');
  const [invoiceNote, setInvoiceNote] = useState('');
  const [invoiceDueDate, setInvoiceDueDate] = useState('');
  const [invoiceItems, setInvoiceItems] = useState<InvoiceItem[]>([]);
  const [showItemsEditor, setShowItemsEditor] = useState(false);
  
  // Beneficiarios
  const [beneficiaries, setBeneficiaries] = useState<SavedBeneficiary[]>([]);
  const [showAddBeneficiary, setShowAddBeneficiary] = useState(false);
  const [newBeneficiaryName, setNewBeneficiaryName] = useState('');
  const [newBeneficiaryEmail, setNewBeneficiaryEmail] = useState('');
  
  // Custody Accounts
  const [custodyAccounts, setCustodyAccounts] = useState<CustodyAccount[]>([]);
  const [selectedCustodyAccount, setSelectedCustodyAccount] = useState<string>('');
  
  // Stats
  const [stats, setStats] = useState({
    totalInvoices: 0,
    totalPaid: 0,
    totalPending: 0,
    totalAmount: 0
  });
  
  // Cargar configuración inicial
  useEffect(() => {
    loadConfig();
    loadInvoices();
    loadBeneficiaries();
    loadCustodyAccounts();
  }, []);
  
  const loadConfig = async () => {
    try {
      const response = await fetch('http://localhost:3000/api/paypal/rest/config');
      const data = await response.json();
      if (data.success && data.config) {
        setRestConfig(data.config);
        if (data.config.isConfigured) {
          testConnection();
        }
      }
    } catch (error) {
      console.error('Error loading config:', error);
    }
  };
  
  const loadInvoices = async () => {
    try {
      const response = await fetch('http://localhost:3000/api/paypal/invoicing/list?page_size=50');
      const data = await response.json();
      if (data.success) {
        setInvoices(data.invoices || []);
        calculateStats(data.invoices || []);
      }
    } catch (error) {
      console.error('Error loading invoices:', error);
      // Cargar de localStorage como fallback
      const saved = localStorage.getItem('paypal_invoices');
      if (saved) {
        const parsed = JSON.parse(saved);
        setInvoices(parsed);
        calculateStats(parsed);
      }
    }
  };
  
  const loadBeneficiaries = () => {
    const saved = localStorage.getItem('paypal_beneficiaries');
    if (saved) {
      setBeneficiaries(JSON.parse(saved));
    }
  };
  
  const loadCustodyAccounts = () => {
    const accounts = custodyStore.getAccounts();
    setCustodyAccounts(accounts);
    
    const unsubscribe = custodyStore.subscribe((newAccounts) => {
      setCustodyAccounts(newAccounts);
    });
    
    return () => unsubscribe();
  };
  
  const calculateStats = (invoiceList: Invoice[]) => {
    const paid = invoiceList.filter(i => ['PAID', 'MARKED_AS_PAID'].includes(i.status));
    const pending = invoiceList.filter(i => ['SENT', 'PAYMENT_PENDING', 'PARTIALLY_PAID'].includes(i.status));
    
    setStats({
      totalInvoices: invoiceList.length,
      totalPaid: paid.length,
      totalPending: pending.length,
      totalAmount: paid.reduce((sum, i) => sum + (parseFloat(String(i.amount)) || 0), 0)
    });
  };
  
  const testConnection = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('http://localhost:3000/api/paypal/rest/test-connection', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientId: restConfig.clientId,
          clientSecret: restConfig.clientSecret,
          environment: restConfig.environment
        })
      });
      const data = await response.json();
      setConnectionStatus(data.success ? 'connected' : 'error');
      if (data.success) {
        showNotification('success', isSpanish ? '✅ Conectado a PayPal' : '✅ Connected to PayPal');
      }
    } catch (error) {
      setConnectionStatus('error');
    } finally {
      setIsLoading(false);
    }
  };
  
  const saveConfig = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('http://localhost:3000/api/paypal/rest/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(restConfig)
      });
      const data = await response.json();
      if (data.success) {
        showNotification('success', isSpanish ? 'Configuración guardada' : 'Configuration saved');
        testConnection();
      }
    } catch (error) {
      showNotification('error', isSpanish ? 'Error guardando configuración' : 'Error saving configuration');
    } finally {
      setIsLoading(false);
    }
  };
  
  const showNotification = (type: 'success' | 'error' | 'info', message: string) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 5000);
  };
  
  // Crear factura
  const createInvoice = async () => {
    if (!recipientEmail || !invoiceAmount) {
      showNotification('error', isSpanish ? 'Complete todos los campos requeridos' : 'Complete all required fields');
      return;
    }
    
    setIsLoading(true);
    try {
      const response = await fetch('http://localhost:3000/api/paypal/invoicing/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recipientEmail,
          recipientName: recipientName || recipientEmail.split('@')[0],
          amount: invoiceAmount,
          currency: invoiceCurrency,
          note: invoiceNote,
          dueDate: invoiceDueDate || undefined,
          items: invoiceItems.length > 0 ? invoiceItems : undefined,
          sendImmediately: true
        })
      });
      
      const data = await response.json();
      
      if (data.success) {
        showNotification('success', data.message);
        
        // Agregar a lista local
        const newInvoice: Invoice = {
          id: data.invoice.id,
          invoiceNumber: data.invoice.invoiceNumber,
          status: data.invoice.status,
          amount: parseFloat(invoiceAmount),
          currency: invoiceCurrency,
          recipientEmail,
          recipientName: recipientName || recipientEmail.split('@')[0],
          dueDate: data.invoice.dueDate,
          createdAt: data.invoice.createdAt,
          sentAt: data.invoice.sentAt,
          viewUrl: data.invoice.viewUrl,
          payUrl: data.invoice.payUrl,
          note: invoiceNote
        };
        
        setInvoices(prev => [newInvoice, ...prev]);
        saveInvoicesToLocal([newInvoice, ...invoices]);
        
        // Descontar del custody account si está seleccionado
        if (selectedCustodyAccount) {
          const account = custodyAccounts.find(a => a.id === selectedCustodyAccount);
          if (account) {
            // Usar withdrawFundsWithTransaction para descontar y registrar la transacción
            const now = new Date();
            custodyStore.withdrawFundsWithTransaction(selectedCustodyAccount, {
              amount: parseFloat(invoiceAmount),
              type: 'withdrawal',
              description: `PayPal Invoice #${data.invoice.invoiceNumber} - ${recipientEmail}`,
              destinationAccount: recipientEmail,
              destinationBank: 'PayPal',
              transactionDate: now.toISOString().split('T')[0],
              transactionTime: now.toTimeString().split(' ')[0],
              notes: `Invoice ID: ${data.invoice.id}`,
              createdBy: 'PAYPAL_INVOICING'
            });
          }
        }
        
        // Actualizar beneficiario
        updateBeneficiaryStats(recipientEmail, parseFloat(invoiceAmount));
        
        // Limpiar formulario
        setRecipientEmail('');
        setRecipientName('');
        setInvoiceAmount('');
        setInvoiceNote('');
        setInvoiceDueDate('');
        setInvoiceItems([]);
        setSelectedCustodyAccount('');
        
        // Mostrar la factura
        setSelectedInvoice(newInvoice);
        setShowInvoiceModal(true);
        
      } else {
        showNotification('error', data.message || 'Error creating invoice');
      }
    } catch (error: any) {
      showNotification('error', error.message);
    } finally {
      setIsLoading(false);
    }
  };
  
  // Enviar factura
  const sendInvoice = async (invoiceId: string) => {
    setIsLoading(true);
    try {
      const response = await fetch(`http://localhost:3000/api/paypal/invoicing/${invoiceId}/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      const data = await response.json();
      
      if (data.success) {
        showNotification('success', isSpanish ? 'Factura enviada' : 'Invoice sent');
        updateInvoiceStatus(invoiceId, 'SENT');
      } else {
        showNotification('error', data.message);
      }
    } catch (error: any) {
      showNotification('error', error.message);
    } finally {
      setIsLoading(false);
    }
  };
  
  // Enviar recordatorio
  const sendReminder = async (invoiceId: string) => {
    setIsLoading(true);
    try {
      const response = await fetch(`http://localhost:3000/api/paypal/invoicing/${invoiceId}/remind`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          note: isSpanish 
            ? 'Recordatorio amable: Su factura está pendiente de pago.'
            : 'Friendly reminder: Your invoice is pending payment.'
        })
      });
      const data = await response.json();
      
      if (data.success) {
        showNotification('success', isSpanish ? 'Recordatorio enviado' : 'Reminder sent');
      } else {
        showNotification('error', data.message);
      }
    } catch (error: any) {
      showNotification('error', error.message);
    } finally {
      setIsLoading(false);
    }
  };
  
  // Cancelar factura
  const cancelInvoice = async (invoiceId: string) => {
    if (!confirm(isSpanish ? '¿Cancelar esta factura?' : 'Cancel this invoice?')) return;
    
    setIsLoading(true);
    try {
      const response = await fetch(`http://localhost:3000/api/paypal/invoicing/${invoiceId}/cancel`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reason: isSpanish ? 'Factura cancelada por el emisor' : 'Invoice cancelled by sender'
        })
      });
      const data = await response.json();
      
      if (data.success) {
        showNotification('success', isSpanish ? 'Factura cancelada' : 'Invoice cancelled');
        updateInvoiceStatus(invoiceId, 'CANCELLED');
      } else {
        showNotification('error', data.message);
      }
    } catch (error: any) {
      showNotification('error', error.message);
    } finally {
      setIsLoading(false);
    }
  };
  
  // Eliminar factura (solo borradores)
  const deleteInvoice = async (invoiceId: string) => {
    if (!confirm(isSpanish ? '¿Eliminar esta factura?' : 'Delete this invoice?')) return;
    
    setIsLoading(true);
    try {
      const response = await fetch(`http://localhost:3000/api/paypal/invoicing/${invoiceId}`, {
        method: 'DELETE'
      });
      const data = await response.json();
      
      if (data.success) {
        showNotification('success', isSpanish ? 'Factura eliminada' : 'Invoice deleted');
        setInvoices(prev => prev.filter(i => i.id !== invoiceId));
        saveInvoicesToLocal(invoices.filter(i => i.id !== invoiceId));
      } else {
        showNotification('error', data.message);
      }
    } catch (error: any) {
      showNotification('error', error.message);
    } finally {
      setIsLoading(false);
    }
  };
  
  const updateInvoiceStatus = (invoiceId: string, status: Invoice['status']) => {
    setInvoices(prev => prev.map(i => i.id === invoiceId ? { ...i, status } : i));
    saveInvoicesToLocal(invoices.map(i => i.id === invoiceId ? { ...i, status } : i));
  };
  
  const saveInvoicesToLocal = (invs: Invoice[]) => {
    localStorage.setItem('paypal_invoices', JSON.stringify(invs));
    calculateStats(invs);
  };
  
  // Beneficiarios
  const saveBeneficiary = () => {
    if (!newBeneficiaryEmail || !newBeneficiaryName) return;
    
    const newBen: SavedBeneficiary = {
      id: `ben_${Date.now()}`,
      email: newBeneficiaryEmail,
      name: newBeneficiaryName,
      createdAt: new Date().toISOString(),
      totalInvoices: 0,
      totalAmount: 0
    };
    
    const updated = [...beneficiaries, newBen];
    setBeneficiaries(updated);
    localStorage.setItem('paypal_beneficiaries', JSON.stringify(updated));
    
    setNewBeneficiaryName('');
    setNewBeneficiaryEmail('');
    setShowAddBeneficiary(false);
    showNotification('success', isSpanish ? 'Beneficiario guardado' : 'Beneficiary saved');
  };
  
  const deleteBeneficiary = (id: string) => {
    if (!confirm(isSpanish ? '¿Eliminar beneficiario?' : 'Delete beneficiary?')) return;
    const updated = beneficiaries.filter(b => b.id !== id);
    setBeneficiaries(updated);
    localStorage.setItem('paypal_beneficiaries', JSON.stringify(updated));
  };
  
  const updateBeneficiaryStats = (email: string, amount: number) => {
    const updated = beneficiaries.map(b => {
      if (b.email.toLowerCase() === email.toLowerCase()) {
        return {
          ...b,
          totalInvoices: b.totalInvoices + 1,
          totalAmount: b.totalAmount + amount,
          lastUsed: new Date().toISOString()
        };
      }
      return b;
    });
    setBeneficiaries(updated);
    localStorage.setItem('paypal_beneficiaries', JSON.stringify(updated));
  };
  
  const selectBeneficiary = (ben: SavedBeneficiary) => {
    setRecipientEmail(ben.email);
    setRecipientName(ben.name);
  };
  
  // Renderizar estado de factura
  const renderInvoiceStatus = (status: string) => {
    const config = INVOICE_STATUS_COLORS[status] || INVOICE_STATUS_COLORS.DRAFT;
    const StatusIcon = config.icon;
    
    const statusLabels: Record<string, { es: string; en: string }> = {
      DRAFT: { es: 'Borrador', en: 'Draft' },
      SENT: { es: 'Enviada', en: 'Sent' },
      SCHEDULED: { es: 'Programada', en: 'Scheduled' },
      PAYMENT_PENDING: { es: 'Pago Pendiente', en: 'Payment Pending' },
      PAID: { es: 'Pagada', en: 'Paid' },
      MARKED_AS_PAID: { es: 'Marcada Pagada', en: 'Marked as Paid' },
      CANCELLED: { es: 'Cancelada', en: 'Cancelled' },
      REFUNDED: { es: 'Reembolsada', en: 'Refunded' },
      PARTIALLY_PAID: { es: 'Pago Parcial', en: 'Partially Paid' },
      MARKED_AS_REFUNDED: { es: 'Marcada Reembolsada', en: 'Marked as Refunded' }
    };
    
    return (
      <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium ${config.bg} ${config.text}`}>
        <StatusIcon className="w-3 h-3" />
        {statusLabels[status]?.[isSpanish ? 'es' : 'en'] || status}
      </span>
    );
  };
  
  const getCurrencySymbol = (code: string) => {
    return SUPPORTED_CURRENCIES.find(c => c.code === code)?.symbol || '$';
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0a1628] via-[#1a1a2e] to-[#0f0f23] p-6">
      {/* Notificación */}
      {notification && (
        <div className={`fixed top-4 right-4 z-50 px-6 py-4 rounded-xl shadow-2xl flex items-center gap-3 animate-slide-in ${
          notification.type === 'success' ? 'bg-green-500/90' :
          notification.type === 'error' ? 'bg-red-500/90' : 'bg-blue-500/90'
        } text-white backdrop-blur-sm`}>
          {notification.type === 'success' ? <CheckCircle className="w-5 h-5" /> :
           notification.type === 'error' ? <XCircle className="w-5 h-5" /> :
           <Info className="w-5 h-5" />}
          <span className="font-medium">{notification.message}</span>
          <button onClick={() => setNotification(null)} className="ml-2 hover:opacity-70">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}
      
      {/* Header */}
      <div className="bg-gradient-to-r from-[#003087] to-[#009cde] rounded-2xl p-6 mb-6 shadow-2xl">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center shadow-lg">
              <Receipt className="w-10 h-10 text-[#003087]" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-white flex items-center gap-3">
                PayPal Invoicing
                <span className="text-sm font-normal bg-white/20 px-3 py-1 rounded-full">
                  {isSpanish ? 'Facturación' : 'Billing'}
                </span>
              </h1>
              <p className="text-blue-100 mt-1">
                {isSpanish ? 'Crea y envía facturas profesionales a cualquier email de PayPal' : 'Create and send professional invoices to any PayPal email'}
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <div className={`flex items-center gap-2 px-4 py-2 rounded-xl ${
              connectionStatus === 'connected' ? 'bg-green-500/20 text-green-300' :
              connectionStatus === 'error' ? 'bg-red-500/20 text-red-300' :
              'bg-yellow-500/20 text-yellow-300'
            }`}>
              {connectionStatus === 'connected' ? <CheckCircle className="w-5 h-5" /> :
               connectionStatus === 'error' ? <XCircle className="w-5 h-5" /> :
               <AlertCircle className="w-5 h-5" />}
              <span className="font-medium">
                {connectionStatus === 'connected' ? (isSpanish ? 'Conectado' : 'Connected') :
                 connectionStatus === 'error' ? (isSpanish ? 'Error' : 'Error') :
                 (isSpanish ? 'Pendiente' : 'Pending')}
              </span>
            </div>
            
            <span className={`px-4 py-2 rounded-xl font-bold ${
              restConfig.environment === 'LIVE' ? 'bg-red-500/30 text-red-300' : 'bg-yellow-500/30 text-yellow-300'
            }`}>
              {restConfig.environment === 'LIVE' ? '🔴 LIVE' : '🟡 SANDBOX'}
            </span>
            
            <button
              onClick={testConnection}
              disabled={isLoading || !restConfig.isConfigured}
              className="flex items-center gap-2 px-4 py-2 bg-white/20 hover:bg-white/30 rounded-xl text-white transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
              {isSpanish ? 'Verificar' : 'Verify'}
            </button>
          </div>
        </div>
        
        {/* Stats */}
        <div className="grid grid-cols-4 gap-4 mt-6">
          <div className="bg-white/10 rounded-xl p-4">
            <div className="text-3xl font-bold text-white">{stats.totalInvoices}</div>
            <div className="text-blue-200 text-sm">{isSpanish ? 'Total Facturas' : 'Total Invoices'}</div>
          </div>
          <div className="bg-white/10 rounded-xl p-4">
            <div className="text-3xl font-bold text-green-300">{stats.totalPaid}</div>
            <div className="text-blue-200 text-sm">{isSpanish ? 'Pagadas' : 'Paid'}</div>
          </div>
          <div className="bg-white/10 rounded-xl p-4">
            <div className="text-3xl font-bold text-yellow-300">{stats.totalPending}</div>
            <div className="text-blue-200 text-sm">{isSpanish ? 'Pendientes' : 'Pending'}</div>
          </div>
          <div className="bg-white/10 rounded-xl p-4">
            <div className="text-3xl font-bold text-white">
              ${stats.totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </div>
            <div className="text-blue-200 text-sm">{isSpanish ? 'Total Cobrado' : 'Total Collected'}</div>
          </div>
        </div>
      </div>
      
      {/* Tabs */}
      <div className="flex gap-2 mb-6 bg-gray-900/50 p-2 rounded-xl">
        {[
          { id: 'create', label: isSpanish ? 'Nueva Factura' : 'New Invoice', icon: Plus },
          { id: 'invoices', label: isSpanish ? 'Mis Facturas' : 'My Invoices', icon: FileText },
          { id: 'beneficiaries', label: isSpanish ? 'Beneficiarios' : 'Beneficiaries', icon: Users },
          { id: 'history', label: isSpanish ? 'Historial' : 'History', icon: History },
          { id: 'config', label: isSpanish ? 'Configuración' : 'Settings', icon: Settings }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`flex items-center gap-2 px-5 py-3 rounded-lg font-medium transition-all ${
              activeTab === tab.id
                ? 'bg-[#003087] text-white shadow-lg'
                : 'text-gray-400 hover:text-white hover:bg-gray-800'
            }`}
          >
            <tab.icon className="w-5 h-5" />
            {tab.label}
          </button>
        ))}
      </div>
      
      {/* Content */}
      <div className="grid grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="col-span-2">
          {/* Tab: Nueva Factura */}
          {activeTab === 'create' && (
            <div className="bg-gray-900/50 rounded-2xl p-6 border border-gray-800">
              <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-3">
                <div className="p-2 bg-[#003087] rounded-lg">
                  <Receipt className="w-6 h-6 text-white" />
                </div>
                {isSpanish ? 'Crear Nueva Factura' : 'Create New Invoice'}
              </h2>
              
              {/* Beneficiarios rápidos */}
              {beneficiaries.length > 0 && (
                <div className="mb-6">
                  <label className="text-sm text-gray-400 mb-2 block">
                    {isSpanish ? '⚡ Selección Rápida de Beneficiario' : '⚡ Quick Beneficiary Selection'}
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {beneficiaries.slice(0, 5).map(ben => (
                      <button
                        key={ben.id}
                        onClick={() => selectBeneficiary(ben)}
                        className={`flex items-center gap-2 px-3 py-2 rounded-lg border transition-all ${
                          recipientEmail === ben.email
                            ? 'border-[#009cde] bg-[#009cde]/20 text-[#009cde]'
                            : 'border-gray-700 bg-gray-800 text-gray-300 hover:border-gray-600'
                        }`}
                      >
                        <User className="w-4 h-4" />
                        <span className="text-sm">{ben.name}</span>
                      </button>
                    ))}
                    <button
                      onClick={() => setActiveTab('beneficiaries')}
                      className="flex items-center gap-2 px-3 py-2 rounded-lg border border-dashed border-gray-700 text-gray-500 hover:border-gray-600 hover:text-gray-400"
                    >
                      <Plus className="w-4 h-4" />
                      <span className="text-sm">{isSpanish ? 'Ver todos' : 'View all'}</span>
                    </button>
                  </div>
                </div>
              )}
              
              <div className="grid grid-cols-2 gap-6">
                {/* Destinatario */}
                <div>
                  <label className="text-sm text-gray-400 mb-2 block">
                    📧 {isSpanish ? 'Email del Destinatario' : 'Recipient Email'} *
                  </label>
                  <input
                    type="email"
                    value={recipientEmail}
                    onChange={(e) => setRecipientEmail(e.target.value)}
                    placeholder="cliente@email.com"
                    className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:border-[#009cde] focus:outline-none"
                  />
                </div>
                
                <div>
                  <label className="text-sm text-gray-400 mb-2 block">
                    👤 {isSpanish ? 'Nombre del Destinatario' : 'Recipient Name'}
                  </label>
                  <input
                    type="text"
                    value={recipientName}
                    onChange={(e) => setRecipientName(e.target.value)}
                    placeholder="Juan Pérez"
                    className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:border-[#009cde] focus:outline-none"
                  />
                </div>
                
                {/* Monto y moneda */}
                <div>
                  <label className="text-sm text-gray-400 mb-2 block">
                    💰 {isSpanish ? 'Monto' : 'Amount'} *
                  </label>
                  <div className="flex">
                    <span className="bg-gray-700 border border-gray-600 border-r-0 rounded-l-xl px-4 py-3 text-gray-400">
                      {getCurrencySymbol(invoiceCurrency)}
                    </span>
                    <input
                      type="number"
                      value={invoiceAmount}
                      onChange={(e) => setInvoiceAmount(e.target.value)}
                      placeholder="0.00"
                      step="0.01"
                      min="0.01"
                      className="flex-1 bg-gray-800 border border-gray-700 border-l-0 rounded-r-xl px-4 py-3 text-white placeholder-gray-500 focus:border-[#009cde] focus:outline-none"
                    />
                  </div>
                </div>
                
                <div>
                  <label className="text-sm text-gray-400 mb-2 block">
                    🌍 {isSpanish ? 'Moneda' : 'Currency'}
                  </label>
                  <select
                    value={invoiceCurrency}
                    onChange={(e) => setInvoiceCurrency(e.target.value)}
                    className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white focus:border-[#009cde] focus:outline-none"
                  >
                    {SUPPORTED_CURRENCIES.map(c => (
                      <option key={c.code} value={c.code}>
                        {c.flag} {c.code} - {c.name}
                      </option>
                    ))}
                  </select>
                </div>
                
                {/* Fecha de vencimiento */}
                <div>
                  <label className="text-sm text-gray-400 mb-2 block">
                    📅 {isSpanish ? 'Fecha de Vencimiento' : 'Due Date'}
                  </label>
                  <input
                    type="date"
                    value={invoiceDueDate}
                    onChange={(e) => setInvoiceDueDate(e.target.value)}
                    min={new Date().toISOString().split('T')[0]}
                    className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white focus:border-[#009cde] focus:outline-none"
                  />
                </div>
                
                {/* Cuenta origen */}
                <div>
                  <label className="text-sm text-gray-400 mb-2 block">
                    📁 {isSpanish ? 'Cuenta de Origen' : 'Source Account'}
                  </label>
                  <select
                    value={selectedCustodyAccount}
                    onChange={(e) => setSelectedCustodyAccount(e.target.value)}
                    className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white focus:border-[#009cde] focus:outline-none"
                  >
                    <option value="">{isSpanish ? '-- Opcional --' : '-- Optional --'}</option>
                    {custodyAccounts.filter(a => a.availableBalance > 0).map(acc => (
                      <option key={acc.id} value={acc.id}>
                        {acc.accountName} - {acc.currency} {acc.availableBalance.toLocaleString()}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              
              {/* Nota */}
              <div className="mt-6">
                <label className="text-sm text-gray-400 mb-2 block">
                  📝 {isSpanish ? 'Nota / Descripción' : 'Note / Description'}
                </label>
                <textarea
                  value={invoiceNote}
                  onChange={(e) => setInvoiceNote(e.target.value)}
                  placeholder={isSpanish ? 'Descripción del servicio o producto...' : 'Service or product description...'}
                  rows={3}
                  className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:border-[#009cde] focus:outline-none resize-none"
                />
              </div>
              
              {/* Items personalizados */}
              <div className="mt-6">
                <button
                  onClick={() => setShowItemsEditor(!showItemsEditor)}
                  className="flex items-center gap-2 text-[#009cde] hover:text-[#00b4ff] transition-colors"
                >
                  {showItemsEditor ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                  <Package className="w-4 h-4" />
                  {isSpanish ? 'Agregar items detallados' : 'Add detailed items'}
                </button>
                
                {showItemsEditor && (
                  <div className="mt-4 p-4 bg-gray-800/50 rounded-xl border border-gray-700">
                    {invoiceItems.map((item, idx) => (
                      <div key={idx} className="flex gap-3 mb-3">
                        <input
                          type="text"
                          value={item.name}
                          onChange={(e) => {
                            const updated = [...invoiceItems];
                            updated[idx].name = e.target.value;
                            setInvoiceItems(updated);
                          }}
                          placeholder={isSpanish ? 'Nombre del item' : 'Item name'}
                          className="flex-1 bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white text-sm"
                        />
                        <input
                          type="number"
                          value={item.quantity}
                          onChange={(e) => {
                            const updated = [...invoiceItems];
                            updated[idx].quantity = parseInt(e.target.value) || 1;
                            setInvoiceItems(updated);
                          }}
                          placeholder="Qty"
                          className="w-20 bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white text-sm"
                        />
                        <input
                          type="number"
                          value={item.unitPrice}
                          onChange={(e) => {
                            const updated = [...invoiceItems];
                            updated[idx].unitPrice = parseFloat(e.target.value) || 0;
                            setInvoiceItems(updated);
                          }}
                          placeholder="Price"
                          className="w-24 bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white text-sm"
                        />
                        <button
                          onClick={() => setInvoiceItems(invoiceItems.filter((_, i) => i !== idx))}
                          className="p-2 text-red-400 hover:bg-red-500/20 rounded-lg"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                    <button
                      onClick={() => setInvoiceItems([...invoiceItems, { name: '', quantity: 1, unitPrice: 0, currency: invoiceCurrency }])}
                      className="flex items-center gap-2 text-sm text-[#009cde] hover:text-[#00b4ff]"
                    >
                      <Plus className="w-4 h-4" />
                      {isSpanish ? 'Agregar item' : 'Add item'}
                    </button>
                  </div>
                )}
              </div>
              
              {/* Botón crear */}
              <button
                onClick={createInvoice}
                disabled={isLoading || !recipientEmail || !invoiceAmount || !restConfig.isConfigured}
                className="w-full mt-8 py-4 bg-gradient-to-r from-[#003087] to-[#009cde] hover:from-[#002060] hover:to-[#0080c0] text-white font-bold rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3 shadow-lg"
              >
                {isLoading ? (
                  <Loader2 className="w-6 h-6 animate-spin" />
                ) : (
                  <>
                    <Send className="w-6 h-6" />
                    {isSpanish ? 'Crear y Enviar Factura' : 'Create & Send Invoice'}
                  </>
                )}
              </button>
              
              {restConfig.isConfigured && (
                <p className="text-center text-gray-500 text-sm mt-3">
                  ✉️ {isSpanish ? 'La factura se enviará automáticamente a' : 'Invoice will be sent automatically to'} {recipientEmail || '...'}
                </p>
              )}
            </div>
          )}
          
          {/* Tab: Mis Facturas */}
          {activeTab === 'invoices' && (
            <div className="bg-gray-900/50 rounded-2xl p-6 border border-gray-800">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-white flex items-center gap-3">
                  <FileText className="w-6 h-6 text-[#009cde]" />
                  {isSpanish ? 'Mis Facturas' : 'My Invoices'}
                  <span className="text-sm font-normal bg-gray-700 px-3 py-1 rounded-full text-gray-300">
                    {invoices.length}
                  </span>
                </h2>
                <button
                  onClick={loadInvoices}
                  className="flex items-center gap-2 px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg text-gray-300 transition-colors"
                >
                  <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
                  {isSpanish ? 'Actualizar' : 'Refresh'}
                </button>
              </div>
              
              {invoices.length === 0 ? (
                <div className="text-center py-12">
                  <FileText className="w-16 h-16 text-gray-600 mx-auto mb-4" />
                  <p className="text-gray-500">
                    {isSpanish ? 'No hay facturas aún' : 'No invoices yet'}
                  </p>
                  <button
                    onClick={() => setActiveTab('create')}
                    className="mt-4 px-6 py-2 bg-[#003087] hover:bg-[#002060] text-white rounded-lg"
                  >
                    {isSpanish ? 'Crear primera factura' : 'Create first invoice'}
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  {invoices.map(invoice => (
                    <div
                      key={invoice.id}
                      className="bg-gray-800/50 rounded-xl p-4 border border-gray-700 hover:border-gray-600 transition-all"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className="p-3 bg-[#003087]/30 rounded-xl">
                            <Receipt className="w-6 h-6 text-[#009cde]" />
                          </div>
                          <div>
                            <div className="flex items-center gap-3">
                              <span className="font-bold text-white">
                                {getCurrencySymbol(invoice.currency)}{parseFloat(String(invoice.amount)).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                              </span>
                              <span className="text-gray-400">{invoice.currency}</span>
                              {renderInvoiceStatus(invoice.status)}
                            </div>
                            <div className="text-sm text-gray-400 mt-1">
                              {invoice.recipientEmail} • {invoice.invoiceNumber || invoice.id.slice(0, 12)}
                            </div>
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-2">
                          {invoice.status === 'DRAFT' && (
                            <button
                              onClick={() => sendInvoice(invoice.id)}
                              className="p-2 text-blue-400 hover:bg-blue-500/20 rounded-lg"
                              title={isSpanish ? 'Enviar' : 'Send'}
                            >
                              <Send className="w-4 h-4" />
                            </button>
                          )}
                          
                          {['SENT', 'PAYMENT_PENDING'].includes(invoice.status) && (
                            <button
                              onClick={() => sendReminder(invoice.id)}
                              className="p-2 text-yellow-400 hover:bg-yellow-500/20 rounded-lg"
                              title={isSpanish ? 'Enviar recordatorio' : 'Send reminder'}
                            >
                              <Bell className="w-4 h-4" />
                            </button>
                          )}
                          
                          {!['PAID', 'CANCELLED', 'REFUNDED'].includes(invoice.status) && (
                            <button
                              onClick={() => cancelInvoice(invoice.id)}
                              className="p-2 text-red-400 hover:bg-red-500/20 rounded-lg"
                              title={isSpanish ? 'Cancelar' : 'Cancel'}
                            >
                              <Ban className="w-4 h-4" />
                            </button>
                          )}
                          
                          {invoice.status === 'DRAFT' && (
                            <button
                              onClick={() => deleteInvoice(invoice.id)}
                              className="p-2 text-red-400 hover:bg-red-500/20 rounded-lg"
                              title={isSpanish ? 'Eliminar' : 'Delete'}
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                          
                          {invoice.payUrl && (
                            <a
                              href={invoice.payUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="p-2 text-[#009cde] hover:bg-[#009cde]/20 rounded-lg"
                              title={isSpanish ? 'Ver en PayPal' : 'View in PayPal'}
                            >
                              <ExternalLink className="w-4 h-4" />
                            </a>
                          )}
                          
                          <button
                            onClick={() => {
                              setSelectedInvoice(invoice);
                              setShowInvoiceModal(true);
                            }}
                            className="p-2 text-gray-400 hover:bg-gray-700 rounded-lg"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-4 mt-3 text-xs text-gray-500">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {new Date(invoice.createdAt).toLocaleDateString()}
                        </span>
                        {invoice.dueDate && (
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {isSpanish ? 'Vence:' : 'Due:'} {new Date(invoice.dueDate).toLocaleDateString()}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
          
          {/* Tab: Beneficiarios */}
          {activeTab === 'beneficiaries' && (
            <div className="bg-gray-900/50 rounded-2xl p-6 border border-gray-800">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-white flex items-center gap-3">
                  <Users className="w-6 h-6 text-[#009cde]" />
                  {isSpanish ? 'Beneficiarios Guardados' : 'Saved Beneficiaries'}
                </h2>
                <button
                  onClick={() => setShowAddBeneficiary(!showAddBeneficiary)}
                  className="flex items-center gap-2 px-4 py-2 bg-[#003087] hover:bg-[#002060] rounded-lg text-white transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  {isSpanish ? 'Agregar' : 'Add'}
                </button>
              </div>
              
              {showAddBeneficiary && (
                <div className="mb-6 p-4 bg-gray-800/50 rounded-xl border border-gray-700">
                  <h3 className="font-medium text-white mb-4">{isSpanish ? 'Nuevo Beneficiario' : 'New Beneficiary'}</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <input
                      type="text"
                      value={newBeneficiaryName}
                      onChange={(e) => setNewBeneficiaryName(e.target.value)}
                      placeholder={isSpanish ? 'Nombre completo' : 'Full name'}
                      className="bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-white"
                    />
                    <input
                      type="email"
                      value={newBeneficiaryEmail}
                      onChange={(e) => setNewBeneficiaryEmail(e.target.value)}
                      placeholder="email@paypal.com"
                      className="bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-white"
                    />
                  </div>
                  <div className="flex justify-end gap-2 mt-4">
                    <button
                      onClick={() => setShowAddBeneficiary(false)}
                      className="px-4 py-2 text-gray-400 hover:text-white"
                    >
                      {isSpanish ? 'Cancelar' : 'Cancel'}
                    </button>
                    <button
                      onClick={saveBeneficiary}
                      disabled={!newBeneficiaryName || !newBeneficiaryEmail}
                      className="px-4 py-2 bg-[#009cde] hover:bg-[#0080c0] rounded-lg text-white disabled:opacity-50"
                    >
                      {isSpanish ? 'Guardar' : 'Save'}
                    </button>
                  </div>
                </div>
              )}
              
              {beneficiaries.length === 0 ? (
                <div className="text-center py-12">
                  <Users className="w-16 h-16 text-gray-600 mx-auto mb-4" />
                  <p className="text-gray-500">{isSpanish ? 'No hay beneficiarios guardados' : 'No saved beneficiaries'}</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {beneficiaries.map(ben => (
                    <div
                      key={ben.id}
                      className="bg-gray-800/50 rounded-xl p-4 border border-gray-700 flex items-center justify-between"
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-gradient-to-br from-[#003087] to-[#009cde] rounded-full flex items-center justify-center text-white font-bold">
                          {ben.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <div className="font-medium text-white">{ben.name}</div>
                          <div className="text-sm text-gray-400">{ben.email}</div>
                          <div className="text-xs text-gray-500 mt-1">
                            {ben.totalInvoices} {isSpanish ? 'facturas' : 'invoices'} • ${ben.totalAmount.toLocaleString()} {isSpanish ? 'total' : 'total'}
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => {
                            selectBeneficiary(ben);
                            setActiveTab('create');
                          }}
                          className="px-4 py-2 bg-[#003087] hover:bg-[#002060] rounded-lg text-white text-sm"
                        >
                          {isSpanish ? 'Facturar' : 'Invoice'}
                        </button>
                        <button
                          onClick={() => deleteBeneficiary(ben.id)}
                          className="p-2 text-red-400 hover:bg-red-500/20 rounded-lg"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
          
          {/* Tab: Historial */}
          {activeTab === 'history' && (
            <div className="bg-gray-900/50 rounded-2xl p-6 border border-gray-800">
              <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-3">
                <History className="w-6 h-6 text-[#009cde]" />
                {isSpanish ? 'Historial de Actividad' : 'Activity History'}
              </h2>
              
              <div className="space-y-3">
                {invoices.map(invoice => (
                  <div key={invoice.id} className="flex items-center gap-4 p-3 bg-gray-800/30 rounded-lg">
                    <div className={`p-2 rounded-lg ${
                      invoice.status === 'PAID' ? 'bg-green-500/20' :
                      invoice.status === 'CANCELLED' ? 'bg-red-500/20' :
                      'bg-blue-500/20'
                    }`}>
                      {invoice.status === 'PAID' ? <CheckCircle className="w-4 h-4 text-green-400" /> :
                       invoice.status === 'CANCELLED' ? <XCircle className="w-4 h-4 text-red-400" /> :
                       <Clock className="w-4 h-4 text-blue-400" />}
                    </div>
                    <div className="flex-1">
                      <div className="text-white text-sm">
                        {isSpanish ? 'Factura' : 'Invoice'} #{invoice.invoiceNumber || invoice.id.slice(0, 8)} - 
                        <span className="font-bold ml-1">
                          {getCurrencySymbol(invoice.currency)}{parseFloat(String(invoice.amount)).toLocaleString()}
                        </span>
                      </div>
                      <div className="text-xs text-gray-500">{invoice.recipientEmail}</div>
                    </div>
                    <div className="text-right">
                      {renderInvoiceStatus(invoice.status)}
                      <div className="text-xs text-gray-500 mt-1">
                        {new Date(invoice.createdAt).toLocaleString()}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
          
          {/* Tab: Configuración */}
          {activeTab === 'config' && (
            <div className="bg-gray-900/50 rounded-2xl p-6 border border-gray-800">
              <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-3">
                <Settings className="w-6 h-6 text-[#009cde]" />
                {isSpanish ? 'Configuración PayPal REST API' : 'PayPal REST API Configuration'}
              </h2>
              
              <div className="space-y-6">
                <div>
                  <label className="text-sm text-gray-400 mb-2 block">Client ID</label>
                  <input
                    type="text"
                    value={restConfig.clientId}
                    onChange={(e) => setRestConfig({ ...restConfig, clientId: e.target.value })}
                    placeholder="AdMokcU-fWWwByjQ..."
                    className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white font-mono text-sm"
                  />
                </div>
                
                <div>
                  <label className="text-sm text-gray-400 mb-2 block flex items-center justify-between">
                    Client Secret
                    <button onClick={() => setShowSecrets(!showSecrets)} className="text-[#009cde]">
                      {showSecrets ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </label>
                  <input
                    type={showSecrets ? 'text' : 'password'}
                    value={restConfig.clientSecret}
                    onChange={(e) => setRestConfig({ ...restConfig, clientSecret: e.target.value })}
                    placeholder="EBwkPZgZT8VKVQ_L..."
                    className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white font-mono text-sm"
                  />
                </div>
                
                <div>
                  <label className="text-sm text-gray-400 mb-2 block">Business Email</label>
                  <input
                    type="email"
                    value={restConfig.businessEmail}
                    onChange={(e) => setRestConfig({ ...restConfig, businessEmail: e.target.value })}
                    placeholder="business@company.com"
                    className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white"
                  />
                </div>
                
                <div>
                  <label className="text-sm text-gray-400 mb-2 block">{isSpanish ? 'Entorno' : 'Environment'}</label>
                  <div className="flex gap-4">
                    <label className={`flex-1 flex items-center justify-center gap-2 p-4 rounded-xl border cursor-pointer transition-all ${
                      restConfig.environment === 'SANDBOX' ? 'border-yellow-500 bg-yellow-500/20' : 'border-gray-700 bg-gray-800'
                    }`}>
                      <input
                        type="radio"
                        name="environment"
                        value="SANDBOX"
                        checked={restConfig.environment === 'SANDBOX'}
                        onChange={(e) => setRestConfig({ ...restConfig, environment: 'SANDBOX' })}
                        className="hidden"
                      />
                      <span className="text-yellow-400">🟡</span>
                      <span className={restConfig.environment === 'SANDBOX' ? 'text-yellow-400' : 'text-gray-400'}>
                        SANDBOX
                      </span>
                    </label>
                    <label className={`flex-1 flex items-center justify-center gap-2 p-4 rounded-xl border cursor-pointer transition-all ${
                      restConfig.environment === 'LIVE' ? 'border-red-500 bg-red-500/20' : 'border-gray-700 bg-gray-800'
                    }`}>
                      <input
                        type="radio"
                        name="environment"
                        value="LIVE"
                        checked={restConfig.environment === 'LIVE'}
                        onChange={(e) => setRestConfig({ ...restConfig, environment: 'LIVE' })}
                        className="hidden"
                      />
                      <span className="text-red-400">🔴</span>
                      <span className={restConfig.environment === 'LIVE' ? 'text-red-400' : 'text-gray-400'}>
                        LIVE
                      </span>
                    </label>
                  </div>
                </div>
                
                <div className="flex gap-4">
                  <button
                    onClick={saveConfig}
                    disabled={isLoading}
                    className="flex-1 py-3 bg-[#003087] hover:bg-[#002060] text-white font-bold rounded-xl transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Check className="w-5 h-5" />}
                    {isSpanish ? 'Guardar Configuración' : 'Save Configuration'}
                  </button>
                  <button
                    onClick={testConnection}
                    disabled={isLoading || !restConfig.clientId || !restConfig.clientSecret}
                    className="px-6 py-3 bg-gray-700 hover:bg-gray-600 text-white font-bold rounded-xl transition-all disabled:opacity-50 flex items-center gap-2"
                  >
                    <RefreshCw className={`w-5 h-5 ${isLoading ? 'animate-spin' : ''}`} />
                    {isSpanish ? 'Probar' : 'Test'}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
        
        {/* Sidebar */}
        <div className="space-y-6">
          {/* Fondos disponibles */}
          <div className="bg-gray-900/50 rounded-2xl p-5 border border-gray-800">
            <h3 className="font-bold text-white mb-4 flex items-center gap-2">
              <Wallet className="w-5 h-5 text-[#009cde]" />
              {isSpanish ? 'Fondos Disponibles' : 'Available Funds'}
            </h3>
            
            {custodyAccounts.filter(a => a.availableBalance > 0).length === 0 ? (
              <p className="text-gray-500 text-sm">{isSpanish ? 'No hay fondos disponibles' : 'No funds available'}</p>
            ) : (
              <div className="space-y-2">
                {custodyAccounts.filter(a => a.availableBalance > 0).map(acc => (
                  <div key={acc.id} className="flex items-center justify-between p-3 bg-gray-800/50 rounded-lg">
                    <span className="text-sm text-gray-300">{acc.accountName}</span>
                    <span className="font-bold text-white">
                      {acc.currency} {acc.availableBalance.toLocaleString()}
                    </span>
                  </div>
                ))}
              </div>
            )}
            
            <button
              onClick={() => {
                window.dispatchEvent(new CustomEvent('navigate-to', { detail: 'custody' }));
              }}
              className="w-full mt-4 py-2 border border-dashed border-gray-700 text-gray-500 hover:border-gray-600 hover:text-gray-400 rounded-lg text-sm"
            >
              {isSpanish ? '+ Agregar fondos' : '+ Add funds'}
            </button>
          </div>
          
          {/* Info PayPal Invoicing */}
          <div className="bg-gradient-to-br from-[#003087]/30 to-[#009cde]/30 rounded-2xl p-5 border border-[#009cde]/30">
            <h3 className="font-bold text-white mb-3 flex items-center gap-2">
              <Info className="w-5 h-5 text-[#009cde]" />
              PayPal Invoicing
            </h3>
            <p className="text-gray-300 text-sm leading-relaxed">
              {isSpanish
                ? 'Envía facturas profesionales a cualquier email. El destinatario recibe un email de PayPal para pagar de forma segura.'
                : 'Send professional invoices to any email. The recipient receives a PayPal email to pay securely.'}
            </p>
            <div className="mt-4 space-y-2">
              <div className="flex items-center gap-2 text-sm text-green-400">
                <CheckCircle className="w-4 h-4" />
                {isSpanish ? 'Sin límites de pago' : 'No payment limits'}
              </div>
              <div className="flex items-center gap-2 text-sm text-green-400">
                <CheckCircle className="w-4 h-4" />
                {isSpanish ? 'Múltiples divisas' : 'Multiple currencies'}
              </div>
              <div className="flex items-center gap-2 text-sm text-green-400">
                <CheckCircle className="w-4 h-4" />
                {isSpanish ? 'Recordatorios automáticos' : 'Automatic reminders'}
              </div>
            </div>
            <a
              href="https://developer.paypal.com/docs/api/invoicing/v2/"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 mt-4 text-[#009cde] hover:text-[#00b4ff] text-sm"
            >
              {isSpanish ? 'Ver documentación' : 'View documentation'}
              <ExternalLink className="w-4 h-4" />
            </a>
          </div>
          
          {/* Monedas soportadas */}
          <div className="bg-gray-900/50 rounded-2xl p-5 border border-gray-800">
            <h3 className="font-bold text-white mb-4 flex items-center gap-2">
              <Globe className="w-5 h-5 text-[#009cde]" />
              {isSpanish ? 'Divisas Soportadas' : 'Supported Currencies'}
            </h3>
            <div className="grid grid-cols-4 gap-2">
              {SUPPORTED_CURRENCIES.map(c => (
                <div
                  key={c.code}
                  className="text-center p-2 bg-gray-800/50 rounded-lg"
                  title={c.name}
                >
                  <div className="text-lg">{c.flag}</div>
                  <div className="text-xs text-gray-400">{c.code}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
      
      {/* Modal de detalle de factura */}
      {showInvoiceModal && selectedInvoice && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full overflow-hidden shadow-2xl">
            {/* Header */}
            <div className="bg-[#003087] p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Receipt className="w-8 h-8 text-white" />
                  <div>
                    <h3 className="text-white font-bold text-lg">
                      {isSpanish ? 'Factura' : 'Invoice'} #{selectedInvoice.invoiceNumber || selectedInvoice.id.slice(0, 12)}
                    </h3>
                    <p className="text-blue-200 text-sm">{renderInvoiceStatus(selectedInvoice.status)}</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowInvoiceModal(false)}
                  className="text-white/70 hover:text-white"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
            </div>
            
            {/* Content */}
            <div className="p-6">
              <div className="text-center mb-6">
                <div className="text-4xl font-bold text-[#003087]">
                  {getCurrencySymbol(selectedInvoice.currency)}
                  {parseFloat(String(selectedInvoice.amount)).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </div>
                <div className="text-gray-500">{selectedInvoice.currency}</div>
              </div>
              
              <div className="space-y-4">
                <div className="flex justify-between py-2 border-b border-gray-100">
                  <span className="text-gray-500">{isSpanish ? 'Destinatario' : 'Recipient'}</span>
                  <span className="font-medium text-gray-800">{selectedInvoice.recipientEmail}</span>
                </div>
                
                {selectedInvoice.recipientName && (
                  <div className="flex justify-between py-2 border-b border-gray-100">
                    <span className="text-gray-500">{isSpanish ? 'Nombre' : 'Name'}</span>
                    <span className="font-medium text-gray-800">{selectedInvoice.recipientName}</span>
                  </div>
                )}
                
                <div className="flex justify-between py-2 border-b border-gray-100">
                  <span className="text-gray-500">{isSpanish ? 'Fecha' : 'Date'}</span>
                  <span className="text-gray-800">{new Date(selectedInvoice.createdAt).toLocaleDateString()}</span>
                </div>
                
                {selectedInvoice.dueDate && (
                  <div className="flex justify-between py-2 border-b border-gray-100">
                    <span className="text-gray-500">{isSpanish ? 'Vencimiento' : 'Due Date'}</span>
                    <span className="text-gray-800">{new Date(selectedInvoice.dueDate).toLocaleDateString()}</span>
                  </div>
                )}
                
                {selectedInvoice.note && (
                  <div className="py-2">
                    <span className="text-gray-500 text-sm block mb-1">{isSpanish ? 'Nota' : 'Note'}</span>
                    <p className="text-gray-800">{selectedInvoice.note}</p>
                  </div>
                )}
              </div>
            </div>
            
            {/* Actions */}
            <div className="p-6 bg-gray-50 flex gap-3">
              {selectedInvoice.payUrl && (
                <a
                  href={selectedInvoice.payUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 py-3 bg-[#009cde] hover:bg-[#0080c0] text-white font-bold rounded-xl flex items-center justify-center gap-2"
                >
                  <ExternalLink className="w-5 h-5" />
                  {isSpanish ? 'Ver en PayPal' : 'View in PayPal'}
                </a>
              )}
              <button
                onClick={() => setShowInvoiceModal(false)}
                className="flex-1 py-3 bg-gray-200 hover:bg-gray-300 text-gray-700 font-bold rounded-xl"
              >
                {isSpanish ? 'Cerrar' : 'Close'}
              </button>
            </div>
          </div>
        </div>
      )}
      
      <style>{`
        @keyframes slide-in {
          from {
            transform: translateX(100%);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }
        .animate-slide-in {
          animation: slide-in 0.3s ease-out;
        }
      `}</style>
    </div>
  );
}
