/**
 * DCB Receipt Module - Generador de Recibos de Transferencia
 * Con historial y persistencia de datos
 */

import { useState, useEffect } from 'react';
import {
  Receipt,
  Download,
  History,
  FileText,
  Trash2,
  Archive,
  RefreshCw,
  Search,
  Calendar,
  DollarSign,
  User,
  Building2,
  CreditCard,
  ChevronDown,
  ChevronUp,
  X,
  Check,
  Copy,
  Filter,
  BarChart3,
  Clock,
  ExternalLink
} from 'lucide-react';
import { useLanguage } from '../lib/i18n';
import { dcbReceiptStore, StoredReceipt, ReceiptFormData } from '../lib/dcb-receipt-store';
import { custodyStore, type CustodyAccount } from '../lib/custody-store';

// Divisas disponibles
const CURRENCIES = [
  { code: 'USD', name: 'US Dollar', symbol: '$' },
  { code: 'EUR', name: 'Euro', symbol: '€' },
  { code: 'GBP', name: 'British Pound', symbol: '£' },
  { code: 'RUB', name: 'Russian Ruble', symbol: '₽' },
  { code: 'CHF', name: 'Swiss Franc', symbol: 'Fr.' },
  { code: 'JPY', name: 'Japanese Yen', symbol: '¥' },
  { code: 'CNY', name: 'Chinese Yuan', symbol: '¥' },
  { code: 'AED', name: 'UAE Dirham', symbol: 'د.إ' },
  { code: 'MXN', name: 'Mexican Peso', symbol: '$' },
  { code: 'BRL', name: 'Brazilian Real', symbol: 'R$' },
  { code: 'CAD', name: 'Canadian Dollar', symbol: 'C$' },
  { code: 'AUD', name: 'Australian Dollar', symbol: 'A$' },
];

export function DCBReceiptModule() {
  const { language } = useLanguage();
  const isSpanish = language === 'es';
  
  // Estado del formulario con persistencia
  const [formData, setFormData] = useState<ReceiptFormData>(dcbReceiptStore.getFormData());
  
  // Estado de historial
  const [receipts, setReceipts] = useState<StoredReceipt[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [filterCurrency, setFilterCurrency] = useState<string>('');
  const [filterDateFrom, setFilterDateFrom] = useState<string>('');
  const [filterDateTo, setFilterDateTo] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState<string>('');
  
  // Cuentas custodio disponibles
  const [custodyAccounts, setCustodyAccounts] = useState<CustodyAccount[]>([]);
  const [selectedCustodyAccount, setSelectedCustodyAccount] = useState<string>('');
  
  // UI State
  const [expandedSections, setExpandedSections] = useState({
    payer: true,
    custody: true,
    beneficiary: true,
    transfer: true,
  });
  const [isGenerating, setIsGenerating] = useState(false);
  const [showStats, setShowStats] = useState(false);
  
  // Cargar datos al montar
  useEffect(() => {
    // Cargar recibos
    const unsubscribe = dcbReceiptStore.subscribe(setReceipts);
    
    // Cargar cuentas custodio
    const accounts = custodyStore.getAccounts();
    setCustodyAccounts(accounts);
    
    // Cargar datos persistidos del formulario
    const savedForm = dcbReceiptStore.getFormData();
    setFormData(savedForm);
    
    return () => unsubscribe();
  }, []);
  
  // Guardar formulario en cada cambio
  useEffect(() => {
    dcbReceiptStore.saveFormData(formData);
  }, [formData]);
  
  // Actualizar formulario
  const updateForm = (field: keyof ReceiptFormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };
  
  // Seleccionar cuenta custodio
  const handleSelectCustodyAccount = (accountId: string) => {
    const account = custodyAccounts.find(a => a.id === accountId);
    if (account) {
      setSelectedCustodyAccount(accountId);
      setFormData(prev => ({
        ...prev,
        custodyAccountName: account.accountName,
        custodyAccountNumber: account.accountNumber || '',
        custodyBankName: account.bankName || 'Digital Commercial Bank Ltd.',
        currency: account.currency,
      }));
    }
  };
  
  // Generar recibo
  const handleGenerateReceipt = () => {
    // Validar campos requeridos
    if (!formData.payerAccountNumber || !formData.beneficiaryName || !formData.beneficiaryAccountNumber || !formData.amount) {
      alert(isSpanish 
        ? '⚠️ Complete los campos requeridos:\n- Número de cuenta pagador\n- Nombre beneficiario\n- Cuenta beneficiario\n- Monto' 
        : '⚠️ Complete required fields:\n- Payer account number\n- Beneficiary name\n- Beneficiary account\n- Amount');
      return;
    }
    
    setIsGenerating(true);
    
    try {
      const now = new Date();
      
      // Crear recibo
      dcbReceiptStore.createReceipt({
        transferId: `TRF-${now.toISOString().slice(0, 10).replace(/-/g, '')}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`,
        amount: parseFloat(formData.amount.replace(/,/g, '')),
        currency: formData.currency,
        transferDate: now.toISOString().split('T')[0],
        transferTime: now.toTimeString().split(' ')[0],
        concept: formData.concept,
        
        custodyAccountName: formData.custodyAccountName || 'DCB Custody Account',
        custodyAccountNumber: formData.custodyAccountNumber || 'N/A',
        custodyBankName: formData.custodyBankName,
        
        payerAccountNumber: formData.payerAccountNumber,
        payerName: formData.payerName,
        payerBank: formData.payerBank,
        
        beneficiaryName: formData.beneficiaryName,
        beneficiaryAccountNumber: formData.beneficiaryAccountNumber,
        beneficiaryBank: formData.beneficiaryBank,
        beneficiaryBIC: formData.beneficiaryBIC,
      }, true);
      
      // Éxito
      setTimeout(() => {
        setIsGenerating(false);
        alert(isSpanish ? '✅ Recibo generado y descargado exitosamente' : '✅ Receipt generated and downloaded successfully');
      }, 500);
      
    } catch (error) {
      console.error('Error generating receipt:', error);
      setIsGenerating(false);
      alert(isSpanish ? '❌ Error al generar el recibo' : '❌ Error generating receipt');
    }
  };
  
  // Limpiar formulario
  const handleClearForm = () => {
    if (confirm(isSpanish ? '¿Limpiar todos los campos?' : 'Clear all fields?')) {
      dcbReceiptStore.clearFormData();
      setFormData(dcbReceiptStore.getDefaultFormData());
      setSelectedCustodyAccount('');
    }
  };
  
  // Filtrar recibos
  const filteredReceipts = receipts.filter(r => {
    if (filterCurrency && r.currency !== filterCurrency) return false;
    if (filterDateFrom && r.transferDate < filterDateFrom) return false;
    if (filterDateTo && r.transferDate > filterDateTo) return false;
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      return (
        r.beneficiaryName.toLowerCase().includes(term) ||
        r.payerAccountNumber.toLowerCase().includes(term) ||
        r.beneficiaryAccountNumber.toLowerCase().includes(term) ||
        r.transferId.toLowerCase().includes(term) ||
        r.receiptId.toLowerCase().includes(term)
      );
    }
    return true;
  });
  
  // Estadísticas
  const stats = dcbReceiptStore.getStats();
  
  // Toggle sección
  const toggleSection = (section: keyof typeof expandedSections) => {
    setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }));
  };
  
  // Formatear moneda
  const formatCurrency = (amount: number, currency: string) => {
    const curr = CURRENCIES.find(c => c.code === currency);
    return `${curr?.symbol || currency} ${amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}`;
  };
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-[#000000] via-[#0a0a0a] to-[#111111] p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-orange-500 flex items-center gap-3">
              <Receipt className="w-8 h-8 text-amber-400" />
              {isSpanish ? 'Generador de Recibos DCB' : 'DCB Receipt Generator'}
            </h1>
            <p className="text-[#888] mt-1">
              {isSpanish ? 'Genera recibos PDF de transferencias con historial' : 'Generate PDF transfer receipts with history'}
            </p>
          </div>
          
          <div className="flex gap-3">
            <button
              onClick={() => setShowStats(!showStats)}
              className="px-4 py-2 bg-gradient-to-br from-purple-600 to-indigo-600 text-white rounded-lg hover:shadow-[0_0_20px_rgba(139,92,246,0.5)] transition-all flex items-center gap-2"
            >
              <BarChart3 className="w-5 h-5" />
              {isSpanish ? 'Estadísticas' : 'Stats'}
            </button>
            <button
              onClick={() => setShowHistory(!showHistory)}
              className={`px-4 py-2 ${showHistory ? 'bg-amber-600' : 'bg-gradient-to-br from-amber-600 to-orange-600'} text-white rounded-lg hover:shadow-[0_0_20px_rgba(251,191,36,0.5)] transition-all flex items-center gap-2`}
            >
              <History className="w-5 h-5" />
              {isSpanish ? 'Historial' : 'History'} ({receipts.length})
            </button>
          </div>
        </div>
        
        {/* Estadísticas */}
        {showStats && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-gradient-to-br from-blue-900/30 to-blue-800/20 border border-blue-500/30 rounded-xl p-4">
              <div className="text-sm text-blue-400">{isSpanish ? 'Total Recibos' : 'Total Receipts'}</div>
              <div className="text-2xl font-bold text-white">{stats.total}</div>
            </div>
            <div className="bg-gradient-to-br from-green-900/30 to-green-800/20 border border-green-500/30 rounded-xl p-4">
              <div className="text-sm text-green-400">{isSpanish ? 'Este Mes' : 'This Month'}</div>
              <div className="text-2xl font-bold text-white">{stats.thisMonth}</div>
            </div>
            <div className="bg-gradient-to-br from-amber-900/30 to-amber-800/20 border border-amber-500/30 rounded-xl p-4">
              <div className="text-sm text-amber-400">{isSpanish ? 'Esta Semana' : 'This Week'}</div>
              <div className="text-2xl font-bold text-white">{stats.thisWeek}</div>
            </div>
            <div className="bg-gradient-to-br from-purple-900/30 to-purple-800/20 border border-purple-500/30 rounded-xl p-4">
              <div className="text-sm text-purple-400">{isSpanish ? 'Descargados' : 'Downloaded'}</div>
              <div className="text-2xl font-bold text-white">{stats.downloaded}</div>
            </div>
          </div>
        )}
        
        {/* Contenido Principal */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Formulario de Recibo */}
          <div className="bg-gradient-to-br from-[#0d0d0d] to-[#1a1a1a] border border-amber-500/30 rounded-2xl p-6 shadow-[0_0_30px_rgba(251,191,36,0.1)]">
            <h2 className="text-xl font-bold text-amber-400 mb-6 flex items-center gap-2">
              <FileText className="w-6 h-6" />
              {isSpanish ? 'Nuevo Recibo' : 'New Receipt'}
            </h2>
            
            {/* Selector de Cuenta Custodio */}
            {custodyAccounts.length > 0 && (
              <div className="mb-6">
                <label className="text-sm text-amber-400 mb-2 block font-semibold">
                  {isSpanish ? 'Cargar desde Cuenta Custodio' : 'Load from Custody Account'}
                </label>
                <select
                  value={selectedCustodyAccount}
                  onChange={e => handleSelectCustodyAccount(e.target.value)}
                  className="w-full px-4 py-3 bg-[#0a0a0a] border border-amber-500/30 rounded-lg text-white focus:border-amber-400 focus:outline-none"
                >
                  <option value="">{isSpanish ? '-- Seleccionar cuenta --' : '-- Select account --'}</option>
                  {custodyAccounts.map(acc => (
                    <option key={acc.id} value={acc.id}>
                      {acc.accountName} ({acc.currency} - {acc.accountNumber})
                    </option>
                  ))}
                </select>
              </div>
            )}
            
            {/* Sección: Cuenta Pagador */}
            <div className="mb-4">
              <button
                onClick={() => toggleSection('payer')}
                className="w-full flex items-center justify-between text-blue-400 font-semibold mb-3 hover:text-blue-300"
              >
                <span className="flex items-center gap-2">
                  <CreditCard className="w-5 h-5" />
                  {isSpanish ? 'Cuenta Pagador (Origen)' : 'Payer Account (Origin)'}
                </span>
                {expandedSections.payer ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
              </button>
              
              {expandedSections.payer && (
                <div className="space-y-3 pl-4 border-l-2 border-blue-500/30">
                  <div>
                    <label className="text-xs text-[#888] mb-1 block">{isSpanish ? 'Número de Cuenta *' : 'Account Number *'}</label>
                    <input
                      type="text"
                      value={formData.payerAccountNumber}
                      onChange={e => updateForm('payerAccountNumber', e.target.value)}
                      placeholder="40817810268783338156"
                      className="w-full px-3 py-2 bg-[#0a0a0a] border border-[#333] rounded-lg text-white text-sm focus:border-blue-400 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-[#888] mb-1 block">{isSpanish ? 'Nombre del Pagador' : 'Payer Name'}</label>
                    <input
                      type="text"
                      value={formData.payerName}
                      onChange={e => updateForm('payerName', e.target.value)}
                      placeholder="KAMENSKIKH ELENA VLADIMIROVNA"
                      className="w-full px-3 py-2 bg-[#0a0a0a] border border-[#333] rounded-lg text-white text-sm focus:border-blue-400 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-[#888] mb-1 block">{isSpanish ? 'Banco del Pagador' : 'Payer Bank'}</label>
                    <input
                      type="text"
                      value={formData.payerBank}
                      onChange={e => updateForm('payerBank', e.target.value)}
                      placeholder="SBERBANK"
                      className="w-full px-3 py-2 bg-[#0a0a0a] border border-[#333] rounded-lg text-white text-sm focus:border-blue-400 focus:outline-none"
                    />
                  </div>
                </div>
              )}
            </div>
            
            {/* Sección: Cuenta Custodio */}
            <div className="mb-4">
              <button
                onClick={() => toggleSection('custody')}
                className="w-full flex items-center justify-between text-amber-400 font-semibold mb-3 hover:text-amber-300"
              >
                <span className="flex items-center gap-2">
                  <Building2 className="w-5 h-5" />
                  {isSpanish ? 'Cuenta Custodio (Intermediaria)' : 'Custody Account (Intermediary)'}
                </span>
                {expandedSections.custody ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
              </button>
              
              {expandedSections.custody && (
                <div className="space-y-3 pl-4 border-l-2 border-amber-500/30">
                  <div>
                    <label className="text-xs text-[#888] mb-1 block">{isSpanish ? 'Nombre de Cuenta' : 'Account Name'}</label>
                    <input
                      type="text"
                      value={formData.custodyAccountName}
                      onChange={e => updateForm('custodyAccountName', e.target.value)}
                      placeholder="DCB Custody Account"
                      className="w-full px-3 py-2 bg-[#0a0a0a] border border-[#333] rounded-lg text-white text-sm focus:border-amber-400 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-[#888] mb-1 block">{isSpanish ? 'Número de Cuenta' : 'Account Number'}</label>
                    <input
                      type="text"
                      value={formData.custodyAccountNumber}
                      onChange={e => updateForm('custodyAccountNumber', e.target.value)}
                      placeholder="DAES-BC-USD-1000001"
                      className="w-full px-3 py-2 bg-[#0a0a0a] border border-[#333] rounded-lg text-white text-sm focus:border-amber-400 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-[#888] mb-1 block">{isSpanish ? 'Banco Custodio' : 'Custody Bank'}</label>
                    <input
                      type="text"
                      value={formData.custodyBankName}
                      onChange={e => updateForm('custodyBankName', e.target.value)}
                      placeholder="Digital Commercial Bank Ltd."
                      className="w-full px-3 py-2 bg-[#0a0a0a] border border-[#333] rounded-lg text-white text-sm focus:border-amber-400 focus:outline-none"
                    />
                  </div>
                </div>
              )}
            </div>
            
            {/* Sección: Beneficiario */}
            <div className="mb-4">
              <button
                onClick={() => toggleSection('beneficiary')}
                className="w-full flex items-center justify-between text-green-400 font-semibold mb-3 hover:text-green-300"
              >
                <span className="flex items-center gap-2">
                  <User className="w-5 h-5" />
                  {isSpanish ? 'Beneficiario Final' : 'Final Beneficiary'}
                </span>
                {expandedSections.beneficiary ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
              </button>
              
              {expandedSections.beneficiary && (
                <div className="space-y-3 pl-4 border-l-2 border-green-500/30">
                  <div>
                    <label className="text-xs text-[#888] mb-1 block">{isSpanish ? 'Nombre del Beneficiario *' : 'Beneficiary Name *'}</label>
                    <input
                      type="text"
                      value={formData.beneficiaryName}
                      onChange={e => updateForm('beneficiaryName', e.target.value)}
                      placeholder='ООО "ПОИНТЕР"'
                      className="w-full px-3 py-2 bg-[#0a0a0a] border border-[#333] rounded-lg text-white text-sm focus:border-green-400 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-[#888] mb-1 block">{isSpanish ? 'Número de Cuenta *' : 'Account Number *'}</label>
                    <input
                      type="text"
                      value={formData.beneficiaryAccountNumber}
                      onChange={e => updateForm('beneficiaryAccountNumber', e.target.value)}
                      placeholder="40702810669000001880"
                      className="w-full px-3 py-2 bg-[#0a0a0a] border border-[#333] rounded-lg text-white text-sm focus:border-green-400 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-[#888] mb-1 block">{isSpanish ? 'Banco del Beneficiario' : 'Beneficiary Bank'}</label>
                    <input
                      type="text"
                      value={formData.beneficiaryBank}
                      onChange={e => updateForm('beneficiaryBank', e.target.value)}
                      placeholder="УЛЬЯНОВСКОЕ ОТДЕЛЕНИЕ N8588 ПАО СБЕРБАНК"
                      className="w-full px-3 py-2 bg-[#0a0a0a] border border-[#333] rounded-lg text-white text-sm focus:border-green-400 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-[#888] mb-1 block">BIC/SWIFT</label>
                    <input
                      type="text"
                      value={formData.beneficiaryBIC}
                      onChange={e => updateForm('beneficiaryBIC', e.target.value)}
                      placeholder="047308602"
                      className="w-full px-3 py-2 bg-[#0a0a0a] border border-[#333] rounded-lg text-white text-sm focus:border-green-400 focus:outline-none"
                    />
                  </div>
                </div>
              )}
            </div>
            
            {/* Sección: Datos de Transferencia */}
            <div className="mb-6">
              <button
                onClick={() => toggleSection('transfer')}
                className="w-full flex items-center justify-between text-purple-400 font-semibold mb-3 hover:text-purple-300"
              >
                <span className="flex items-center gap-2">
                  <DollarSign className="w-5 h-5" />
                  {isSpanish ? 'Datos de la Transferencia' : 'Transfer Details'}
                </span>
                {expandedSections.transfer ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
              </button>
              
              {expandedSections.transfer && (
                <div className="space-y-3 pl-4 border-l-2 border-purple-500/30">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs text-[#888] mb-1 block">{isSpanish ? 'Monto *' : 'Amount *'}</label>
                      <input
                        type="text"
                        value={formData.amount}
                        onChange={e => updateForm('amount', e.target.value)}
                        placeholder="100,000.00"
                        className="w-full px-3 py-2 bg-[#0a0a0a] border border-[#333] rounded-lg text-white text-sm focus:border-purple-400 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-[#888] mb-1 block">{isSpanish ? 'Divisa' : 'Currency'}</label>
                      <select
                        value={formData.currency}
                        onChange={e => updateForm('currency', e.target.value)}
                        className="w-full px-3 py-2 bg-[#0a0a0a] border border-[#333] rounded-lg text-white text-sm focus:border-purple-400 focus:outline-none"
                      >
                        {CURRENCIES.map(c => (
                          <option key={c.code} value={c.code}>{c.code} - {c.name}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="text-xs text-[#888] mb-1 block">{isSpanish ? 'Concepto' : 'Concept'}</label>
                    <input
                      type="text"
                      value={formData.concept}
                      onChange={e => updateForm('concept', e.target.value)}
                      placeholder={isSpanish ? 'Pago por servicios' : 'Payment for services'}
                      className="w-full px-3 py-2 bg-[#0a0a0a] border border-[#333] rounded-lg text-white text-sm focus:border-purple-400 focus:outline-none"
                    />
                  </div>
                </div>
              )}
            </div>
            
            {/* Botones de acción */}
            <div className="flex gap-3">
              <button
                onClick={handleGenerateReceipt}
                disabled={isGenerating}
                className="flex-1 px-6 py-4 bg-gradient-to-br from-amber-600 to-orange-600 text-white font-bold rounded-xl hover:shadow-[0_0_25px_rgba(251,191,36,0.6)] transition-all disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {isGenerating ? (
                  <>
                    <RefreshCw className="w-5 h-5 animate-spin" />
                    {isSpanish ? 'Generando...' : 'Generating...'}
                  </>
                ) : (
                  <>
                    <Download className="w-5 h-5" />
                    {isSpanish ? 'Generar Recibo PDF' : 'Generate PDF Receipt'}
                  </>
                )}
              </button>
              <button
                onClick={handleClearForm}
                className="px-4 py-4 bg-[#1a1a1a] border border-[#333] text-[#888] rounded-xl hover:text-white hover:border-red-500/50 transition-all"
                title={isSpanish ? 'Limpiar formulario' : 'Clear form'}
              >
                <Trash2 className="w-5 h-5" />
              </button>
            </div>
          </div>
          
          {/* Historial de Recibos */}
          <div className="bg-gradient-to-br from-[#0d0d0d] to-[#1a1a1a] border border-[#333] rounded-2xl p-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <History className="w-6 h-6 text-blue-400" />
                {isSpanish ? 'Historial de Recibos' : 'Receipt History'}
              </h2>
              <span className="text-sm text-[#888]">
                {filteredReceipts.length} {isSpanish ? 'recibos' : 'receipts'}
              </span>
            </div>
            
            {/* Filtros */}
            <div className="grid grid-cols-3 gap-3 mb-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-[#666]" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  placeholder={isSpanish ? 'Buscar...' : 'Search...'}
                  className="w-full pl-9 pr-3 py-2 bg-[#0a0a0a] border border-[#333] rounded-lg text-white text-sm focus:border-blue-400 focus:outline-none"
                />
              </div>
              <select
                value={filterCurrency}
                onChange={e => setFilterCurrency(e.target.value)}
                className="px-3 py-2 bg-[#0a0a0a] border border-[#333] rounded-lg text-white text-sm focus:border-blue-400 focus:outline-none"
              >
                <option value="">{isSpanish ? 'Todas las divisas' : 'All currencies'}</option>
                {CURRENCIES.map(c => (
                  <option key={c.code} value={c.code}>{c.code}</option>
                ))}
              </select>
              <input
                type="date"
                value={filterDateFrom}
                onChange={e => setFilterDateFrom(e.target.value)}
                className="px-3 py-2 bg-[#0a0a0a] border border-[#333] rounded-lg text-white text-sm focus:border-blue-400 focus:outline-none"
              />
            </div>
            
            {/* Lista de recibos */}
            <div className="space-y-3 max-h-[500px] overflow-y-auto pr-2">
              {filteredReceipts.length === 0 ? (
                <div className="text-center py-12 text-[#666]">
                  <Receipt className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>{isSpanish ? 'No hay recibos generados' : 'No receipts generated'}</p>
                </div>
              ) : (
                filteredReceipts.map(receipt => (
                  <div
                    key={receipt.receiptId}
                    className="bg-[#0a0a0a] border border-[#222] rounded-xl p-4 hover:border-amber-500/30 transition-all"
                  >
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <div className="text-sm font-mono text-amber-400">{receipt.receiptId}</div>
                        <div className="text-xs text-[#666]">{receipt.transferDate} {receipt.transferTime}</div>
                      </div>
                      <div className="text-right">
                        <div className="text-lg font-bold text-emerald-400">
                          {formatCurrency(receipt.amount, receipt.currency)}
                        </div>
                        <span className={`text-xs px-2 py-0.5 rounded ${
                          receipt.status === 'downloaded' ? 'bg-green-500/20 text-green-400' :
                          receipt.status === 'archived' ? 'bg-gray-500/20 text-gray-400' :
                          'bg-blue-500/20 text-blue-400'
                        }`}>
                          {receipt.status}
                        </span>
                      </div>
                    </div>
                    
                    <div className="text-sm text-[#999] mb-2">
                      <div className="truncate"><span className="text-[#666]">→</span> {receipt.beneficiaryName}</div>
                      <div className="text-xs text-[#555]">{receipt.beneficiaryAccountNumber}</div>
                    </div>
                    
                    <div className="flex gap-2">
                      <button
                        onClick={() => dcbReceiptStore.downloadReceipt(receipt.receiptId)}
                        className="flex-1 px-3 py-2 bg-gradient-to-br from-amber-600/20 to-orange-600/20 border border-amber-500/30 text-amber-400 rounded-lg hover:bg-amber-600/30 transition-all text-sm flex items-center justify-center gap-1"
                      >
                        <Download className="w-4 h-4" />
                        {isSpanish ? 'Descargar' : 'Download'}
                      </button>
                      <button
                        onClick={() => {
                          if (confirm(isSpanish ? '¿Eliminar este recibo?' : 'Delete this receipt?')) {
                            dcbReceiptStore.deleteReceipt(receipt.receiptId);
                          }
                        }}
                        className="px-3 py-2 bg-red-500/10 border border-red-500/30 text-red-400 rounded-lg hover:bg-red-500/20 transition-all"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                    
                    {receipt.downloadCount > 1 && (
                      <div className="text-xs text-[#555] mt-2 flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {isSpanish ? `Descargado ${receipt.downloadCount} veces` : `Downloaded ${receipt.downloadCount} times`}
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default DCBReceiptModule;
