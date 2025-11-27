/**
 * Transaction and Events Module
 * Sistema de registro y auditoría de todas las transacciones y eventos
 * Diseño de grado bancario con trazabilidad completa
 */

import { useState, useEffect } from 'react';
import {
  Activity, FileText, Download, RefreshCw, Filter, Calendar,
  TrendingUp, Database, Lock, Send, AlertCircle, CheckCircle,
  Clock, DollarSign, Search, Eye, Trash2
} from 'lucide-react';
import { useLanguage } from '../lib/i18n';
import { transactionEventStore, type TransactionEvent, type TransactionType, type ModuleSource } from '../lib/transaction-event-store';

export function TransactionEventsModule() {
  const { language } = useLanguage();
  const isSpanish = language === 'es';

  const [events, setEvents] = useState<TransactionEvent[]>([]);
  const [filteredEvents, setFilteredEvents] = useState<TransactionEvent[]>([]);
  const [loading, setLoading] = useState(false);
  
  // Filtros
  const [selectedModule, setSelectedModule] = useState<ModuleSource | 'ALL'>('ALL');
  const [selectedType, setSelectedType] = useState<TransactionType | 'ALL'>('ALL');
  const [selectedStatus, setSelectedStatus] = useState<'ALL' | 'PENDING' | 'COMPLETED' | 'FAILED'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [dateRange, setDateRange] = useState({
    start: '',
    end: ''
  });

  useEffect(() => {
    console.log('[TxModule] 🔄 Inicializando módulo...');
    loadEvents();
    
    // Crear evento de prueba si no hay ninguno
    const currentEvents = transactionEventStore.getEvents();
    if (currentEvents.length === 0) {
      console.log('[TxModule] 📝 Creando evento de prueba inicial...');
      transactionEventStore.recordEvent(
        'ACCOUNT_CREATED',
        'SYSTEM',
        isSpanish ? 'Sistema de eventos inicializado correctamente' : 'Event system initialized successfully',
        {
          status: 'COMPLETED',
          metadata: {
            version: '5.2.0',
            initialized: new Date().toISOString()
          }
        }
      );
    }
    
    // Suscribirse a cambios en tiempo real
    const unsubscribe = transactionEventStore.subscribe((updatedEvents) => {
      console.log('[TxModule] 🔔 Eventos actualizados:', updatedEvents.length);
      setEvents(updatedEvents);
      applyFilters(updatedEvents);
    });
    
    // Auto-reload cada 2 segundos para detectar cambios
    const interval = setInterval(() => {
      const freshEvents = transactionEventStore.getEvents();
      console.log('[TxModule] 🔍 Verificando eventos:', freshEvents.length, 'vs', events.length);
      
      // Siempre actualizar, no solo cuando cambia la cantidad
      if (JSON.stringify(freshEvents) !== JSON.stringify(events)) {
        console.log('[TxModule] 🔄 Actualizando eventos...');
        setEvents(freshEvents);
        applyFilters(freshEvents);
      }
    }, 2000);
    
    return () => {
      unsubscribe();
      clearInterval(interval);
    };
  }, [events]);

  useEffect(() => {
    applyFilters(events);
  }, [selectedModule, selectedType, selectedStatus, searchQuery, dateRange, events]);

  const loadEvents = () => {
    const allEvents = transactionEventStore.getEvents();
    console.log('[TxModule] 📊 Eventos cargados:', allEvents.length);
    setEvents(allEvents);
    setFilteredEvents(allEvents);
  };

  const applyFilters = (eventsToFilter: TransactionEvent[]) => {
    let filtered = [...eventsToFilter];

    // Filtro por módulo
    if (selectedModule !== 'ALL') {
      filtered = filtered.filter(e => e.module === selectedModule);
    }

    // Filtro por tipo
    if (selectedType !== 'ALL') {
      filtered = filtered.filter(e => e.type === selectedType);
    }

    // Filtro por estado
    if (selectedStatus !== 'ALL') {
      filtered = filtered.filter(e => e.status === selectedStatus);
    }

    // Filtro por búsqueda
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(e =>
        e.description.toLowerCase().includes(query) ||
        e.id.toLowerCase().includes(query) ||
        e.reference?.toLowerCase().includes(query) ||
        e.accountName?.toLowerCase().includes(query)
      );
    }

    // Filtro por rango de fechas
    if (dateRange.start && dateRange.end) {
      filtered = transactionEventStore.getEventsByDateRange(dateRange.start, dateRange.end);
    }

    setFilteredEvents(filtered);
  };

  const generateTestEvents = () => {
    // Generar eventos de prueba
    transactionEventStore.recordAccountCreated('Test USD Account', 'USD', 5000000, 'TEST-ACC-001');
    transactionEventStore.recordBalanceIncrease('TEST-ACC-001', 'Test USD Account', 1000000, 'USD', 5000000, 6000000);
    transactionEventStore.recordPledgeCreated('API_VUSD', 'TEST-PLD-001', 500000, 'Test Corp', 'Test USD Account');
    transactionEventStore.recordPorGenerated(500000, 1, 'TEST-POR-001');
    
    loadEvents();
    
    alert(
      `✅ ${isSpanish ? 'Eventos de prueba generados' : 'Test events generated'}\n\n` +
      `${isSpanish ? 'Se crearon 4 eventos de ejemplo' : '4 sample events created'}\n\n` +
      `${isSpanish ? 'Recarga la página para verlos' : 'Reload page to see them'}`
    );
  };

  const downloadTXT = () => {
    const txt = transactionEventStore.exportToTXT(filteredEvents, language);
    const blob = new Blob([txt], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `DAES_Transactions_${new Date().toISOString().split('T')[0]}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    
    console.log('[TxModule] 📄 TXT descargado con', filteredEvents.length, 'eventos');
  };

  const downloadCSV = () => {
    const csv = transactionEventStore.exportToCSV(filteredEvents);
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `DAES_Transactions_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    
    console.log('[TxModule] 📊 CSV descargado con', filteredEvents.length, 'eventos');
  };

  const stats = transactionEventStore.getStats();

  const translateEventType = (type: TransactionType): string => {
    if (!isSpanish) return type;
    
    const translations: Record<TransactionType, string> = {
      'ACCOUNT_CREATED': 'Cuenta Creada',
      'ACCOUNT_DELETED': 'Cuenta Eliminada',
      'BALANCE_INCREASE': 'Aumento de Balance',
      'BALANCE_DECREASE': 'Disminución de Balance',
      'FUNDS_RESERVED': 'Fondos Reservados',
      'FUNDS_RELEASED': 'Fondos Liberados',
      'PLEDGE_CREATED': 'Pledge Creado',
      'PLEDGE_EDITED': 'Pledge Editado',
      'PLEDGE_DELETED': 'Pledge Eliminado',
      'TRANSFER_CREATED': 'Transferencia Creada',
      'TRANSFER_COMPLETED': 'Transferencia Completada',
      'POR_GENERATED': 'PoR Generado',
      'POR_DELETED': 'PoR Eliminado',
      'API_KEY_CREATED': 'API Key Creada',
      'API_KEY_REVOKED': 'API Key Revocada',
      'PAYOUT_CREATED': 'Payout Creado',
      'PAYOUT_COMPLETED': 'Payout Completado',
      'RECONCILIATION_RUN': 'Conciliación Ejecutada',
      'PROFILE_CREATED': 'Perfil Creado',
      'PROFILE_UPDATED': 'Perfil Actualizado',
      'PROFILE_ACTIVATED': 'Perfil Activado',
      'PROFILE_DELETED': 'Perfil Eliminado',
      'PROFILE_EXPORTED': 'Perfil Exportado',
      'PROFILE_IMPORTED': 'Perfil Importado',
      'PROFILE_AUTO_SNAPSHOT': 'Snapshot Automático'
    };
    
    return translations[type] || type;
  };

  const translateModule = (module: ModuleSource): string => {
    if (!isSpanish) return module;
    
    const translations: Record<ModuleSource, string> = {
      'CUSTODY_ACCOUNTS': 'Cuentas Custody',
      'API_VUSD': 'API VUSD',
      'API_VUSD1': 'API VUSD1',
      'API_DAES': 'API DAES',
      'API_GLOBAL': 'API Global',
      'API_DIGITAL': 'API Digital',
      'POR_API': 'PoR API',
      'POR_API1_ANCHOR': 'PoR API1 Anchor',
      'ACCOUNT_LEDGER': 'Libro Mayor',
      'BLACK_SCREEN': 'Black Screen',
      'LARGE_FILE_ANALYZER': 'Analizador Archivos',
      'SYSTEM': 'Sistema',
      'PROFILES': 'Perfiles'
    };
    
    return translations[module] || module;
  };

  const translateStatus = (status: string): string => {
    if (!isSpanish) return status;
    
    const translations: Record<string, string> = {
      'COMPLETED': 'Completado',
      'PENDING': 'Pendiente',
      'FAILED': 'Fallido',
      'CANCELLED': 'Cancelado'
    };
    
    return translations[status] || status;
  };

  const getTypeColor = (type: TransactionType): string => {
    if (type.includes('CREATED')) return 'text-white bg-white/20/20';
    if (type.includes('DELETED')) return 'text-red-400 bg-red-500/20';
    if (type.includes('EDITED') || type.includes('INCREASE')) return 'text-blue-400 bg-blue-500/20';
    if (type.includes('DECREASE')) return 'text-orange-400 bg-orange-500/20';
    if (type.includes('COMPLETED')) return 'text-cyan-400 bg-cyan-500/20';
    return 'text-purple-400 bg-purple-500/20';
  };

  const getStatusColor = (status: string): string => {
    switch (status) {
      case 'COMPLETED': return 'bg-white/20/20 text-white';
      case 'PENDING': return 'bg-yellow-500/20 text-yellow-300';
      case 'FAILED': return 'bg-red-500/20 text-red-300';
      case 'CANCELLED': return 'bg-gray-500/20 text-gray-300';
      default: return 'bg-blue-500/20 text-blue-300';
    }
  };

  return (
    <div className="min-h-screen bg-black text-white p-6">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-cyan-400 flex items-center gap-3">
              <Activity className="w-8 h-8" />
              {isSpanish ? 'Transacciones y Eventos' : 'Transactions and Events'}
            </h1>
            <p className="text-cyan-300/60 mt-2">
              {isSpanish 
                ? 'Registro completo de todas las operaciones del sistema'
                : 'Complete log of all system operations'}
            </p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={generateTestEvents}
              className="px-4 py-2 bg-purple-500/20 border border-purple-500 text-purple-300 rounded-lg hover:bg-purple-500/30 flex items-center gap-2"
            >
              <Activity className="w-4 h-4" />
              {isSpanish ? 'Test' : 'Test'}
            </button>
            <button
              onClick={downloadCSV}
              className="px-4 py-2 bg-white/20/20 border border-white/30 text-white rounded-lg hover:bg-white/20/30 flex items-center gap-2"
            >
              <Download className="w-4 h-4" />
              CSV
            </button>
            <button
              onClick={downloadTXT}
              className="px-4 py-2 bg-blue-500/20 border border-blue-500 text-blue-300 rounded-lg hover:bg-blue-500/30 flex items-center gap-2"
            >
              <FileText className="w-4 h-4" />
              TXT
            </button>
            <button
              onClick={loadEvents}
              className="px-4 py-2 bg-cyan-500/20 border border-cyan-500 text-cyan-300 rounded-lg hover:bg-cyan-500/30 flex items-center gap-2"
            >
              <RefreshCw className="w-4 h-4" />
              {isSpanish ? 'Actualizar' : 'Refresh'}
            </button>
          </div>
        </div>
      </div>

      {/* Estadísticas */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div className="bg-[#0d0d0d] border border-cyan-500 rounded-lg p-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-cyan-300/60 text-sm">{isSpanish ? 'Total Eventos' : 'Total Events'}</span>
            <Activity className="w-5 h-5 text-cyan-400" />
          </div>
          <div className="text-3xl font-bold text-cyan-400">{stats.totalEvents.toLocaleString()}</div>
        </div>

        <div className="bg-[#0d0d0d] border border-white/30 rounded-lg p-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-white/60 text-sm">{isSpanish ? 'Hoy' : 'Today'}</span>
            <Calendar className="w-5 h-5 text-white" />
          </div>
          <div className="text-3xl font-bold text-white">{stats.todayEvents.toLocaleString()}</div>
        </div>

        <div className="bg-[#0d0d0d] border border-purple-500 rounded-lg p-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-purple-300/60 text-sm">{isSpanish ? 'Volumen Total' : 'Total Volume'}</span>
            <DollarSign className="w-5 h-5 text-purple-400" />
          </div>
          <div className="text-2xl font-bold text-purple-400">
            ${stats.totalVolume.toLocaleString('en-US', { maximumFractionDigits: 0 })}
          </div>
        </div>

        <div className="bg-[#0d0d0d] border border-yellow-500 rounded-lg p-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-yellow-300/60 text-sm">{isSpanish ? 'Volumen Hoy' : 'Today Volume'}</span>
            <TrendingUp className="w-5 h-5 text-yellow-400" />
          </div>
          <div className="text-2xl font-bold text-yellow-400">
            ${stats.todayVolume.toLocaleString('en-US', { maximumFractionDigits: 0 })}
          </div>
        </div>
      </div>

      {/* Filtros */}
      <div className="bg-[#0d0d0d] border border-[#1a1a1a] rounded-lg p-6 mb-6">
        <div className="flex items-center gap-3 mb-4">
          <Filter className="w-5 h-5 text-cyan-400" />
          <h3 className="text-lg font-bold text-cyan-300">
            {isSpanish ? 'Filtros' : 'Filters'}
          </h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Filtro por Módulo */}
          <div>
            <label className="block text-cyan-300/60 text-sm mb-2">
              {isSpanish ? 'Módulo:' : 'Module:'}
            </label>
            <select
              value={selectedModule}
              onChange={(e) => setSelectedModule(e.target.value as any)}
              className="w-full bg-[#0a0a0a] border border-cyan-500/30 rounded-lg px-4 py-2 text-white"
            >
              <option value="ALL">{isSpanish ? 'Todos' : 'All'}</option>
              <option value="CUSTODY_ACCOUNTS">Custody Accounts</option>
              <option value="API_VUSD">API VUSD</option>
              <option value="API_VUSD1">API VUSD1</option>
              <option value="POR_API">PoR API</option>
              <option value="POR_API1_ANCHOR">PoR API1 Anchor</option>
              <option value="API_DAES">API DAES</option>
              <option value="ACCOUNT_LEDGER">Account Ledger</option>
            </select>
          </div>

          {/* Filtro por Tipo */}
          <div>
            <label className="block text-cyan-300/60 text-sm mb-2">
              {isSpanish ? 'Tipo:' : 'Type:'}
            </label>
            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value as any)}
              className="w-full bg-[#0a0a0a] border border-cyan-500/30 rounded-lg px-4 py-2 text-white"
            >
              <option value="ALL">{isSpanish ? 'Todos' : 'All'}</option>
              <option value="ACCOUNT_CREATED">{isSpanish ? 'Cuenta Creada' : 'Account Created'}</option>
              <option value="BALANCE_INCREASE">{isSpanish ? 'Aumento Balance' : 'Balance Increase'}</option>
              <option value="BALANCE_DECREASE">{isSpanish ? 'Disminución Balance' : 'Balance Decrease'}</option>
              <option value="PLEDGE_CREATED">{isSpanish ? 'Pledge Creado' : 'Pledge Created'}</option>
              <option value="PLEDGE_EDITED">{isSpanish ? 'Pledge Editado' : 'Pledge Edited'}</option>
              <option value="PLEDGE_DELETED">{isSpanish ? 'Pledge Eliminado' : 'Pledge Deleted'}</option>
              <option value="TRANSFER_CREATED">{isSpanish ? 'Transferencia' : 'Transfer'}</option>
              <option value="POR_GENERATED">{isSpanish ? 'PoR Generado' : 'PoR Generated'}</option>
              <option value="PAYOUT_CREATED">{isSpanish ? 'Payout Creado' : 'Payout Created'}</option>
            </select>
          </div>

          {/* Filtro por Estado */}
          <div>
            <label className="block text-cyan-300/60 text-sm mb-2">
              {isSpanish ? 'Estado:' : 'Status:'}
            </label>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value as any)}
              className="w-full bg-[#0a0a0a] border border-cyan-500/30 rounded-lg px-4 py-2 text-white"
            >
              <option value="ALL">{isSpanish ? 'Todos' : 'All'}</option>
              <option value="COMPLETED">{isSpanish ? 'Completado' : 'Completed'}</option>
              <option value="PENDING">{isSpanish ? 'Pendiente' : 'Pending'}</option>
              <option value="FAILED">{isSpanish ? 'Fallido' : 'Failed'}</option>
            </select>
          </div>

          {/* Búsqueda */}
          <div>
            <label className="block text-cyan-300/60 text-sm mb-2">
              {isSpanish ? 'Buscar:' : 'Search:'}
            </label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-cyan-400/60" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 bg-[#0a0a0a] border border-cyan-500/30 rounded-lg px-4 py-2 text-white"
                placeholder={isSpanish ? 'ID, cuenta, referencia...' : 'ID, account, reference...'}
              />
            </div>
          </div>
        </div>

        <div className="mt-4 flex items-center justify-between">
          <div className="text-sm text-cyan-300/60">
            {isSpanish ? 'Mostrando' : 'Showing'} <span className="text-cyan-300 font-bold">{filteredEvents.length}</span> {isSpanish ? 'de' : 'of'} <span className="text-cyan-300 font-bold">{events.length}</span> {isSpanish ? 'eventos' : 'events'}
          </div>
          {(selectedModule !== 'ALL' || selectedType !== 'ALL' || selectedStatus !== 'ALL' || searchQuery) && (
            <button
              onClick={() => {
                setSelectedModule('ALL');
                setSelectedType('ALL');
                setSelectedStatus('ALL');
                setSearchQuery('');
                setDateRange({ start: '', end: '' });
              }}
              className="px-3 py-1 bg-red-500/20 border border-red-500/30 text-red-300 rounded text-sm hover:bg-red-500/30"
            >
              {isSpanish ? 'Limpiar Filtros' : 'Clear Filters'}
            </button>
          )}
        </div>
      </div>

      {/* Lista de Eventos */}
      <div className="bg-[#0d0d0d] border border-[#1a1a1a] rounded-lg">
        <div className="p-6 border-b border-[#1a1a1a]">
          <h3 className="text-xl font-bold text-cyan-300 flex items-center gap-2">
            <FileText className="w-6 h-6" />
            {isSpanish ? 'Registro de Eventos' : 'Event Log'}
          </h3>
        </div>
        <div className="p-6">
          {filteredEvents.length === 0 ? (
            <div className="text-center py-12">
              <Activity className="w-16 h-16 text-cyan-400/30 mx-auto mb-4" />
              <div className="text-cyan-300/60 mb-2">
                {isSpanish ? 'No hay eventos registrados' : 'No events registered'}
              </div>
              <div className="text-cyan-300/40 text-sm">
                {isSpanish 
                  ? 'Los eventos se registran automáticamente cuando realizas operaciones'
                  : 'Events are automatically registered when you perform operations'}
              </div>
            </div>
          ) : (
            <div className="space-y-3 max-h-[calc(100vh-500px)] min-h-[400px] overflow-y-auto pr-2 scroll-smooth">
              {filteredEvents.map((event) => (
                <div
                  key={event.id}
                  className="bg-gradient-to-r from-[#0a0a0a] to-[#0d0d0d] border border-cyan-500/20 rounded-lg p-4 hover:border-cyan-500/40 transition-all"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2 flex-wrap">
                        <span className={`px-2 py-1 rounded text-xs font-bold ${getTypeColor(event.type)}`}>
                          {translateEventType(event.type)}
                        </span>
                        <span className={`px-2 py-1 rounded text-xs font-bold ${getStatusColor(event.status)}`}>
                          {translateStatus(event.status)}
                        </span>
                        <span className="px-2 py-1 bg-purple-500/20 text-purple-300 rounded text-xs font-mono">
                          {translateModule(event.module)}
                        </span>
                        {event.amount && event.amount > 0 && (
                          <span className="px-3 py-1 bg-white/20/20 text-white rounded text-xs font-bold flex items-center gap-1">
                            <DollarSign className="w-3 h-3" />
                            {event.currency} {event.amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </span>
                        )}
                      </div>
                      <div className="text-white font-semibold mb-1">{event.description}</div>
                      <div className="flex items-center gap-4 text-xs text-cyan-300/60">
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {new Date(event.timestamp).toLocaleString(isSpanish ? 'es-ES' : 'en-US')}
                        </span>
                        <span className="font-mono">{event.id}</span>
                      </div>
                    </div>
                  </div>

                  {/* Detalles adicionales */}
                  {(event.accountName || event.reference || event.metadata) && (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                      {event.accountName && (
                        <div className="bg-black/30 rounded p-2">
                          <div className="text-cyan-300/60 mb-1">{isSpanish ? 'Cuenta:' : 'Account:'}</div>
                          <div className="text-cyan-300 font-mono">{event.accountName}</div>
                        </div>
                      )}
                      {event.reference && (
                        <div className="bg-black/30 rounded p-2">
                          <div className="text-cyan-300/60 mb-1">{isSpanish ? 'Referencia:' : 'Reference:'}</div>
                          <div className="text-cyan-300 font-mono">{event.reference}</div>
                        </div>
                      )}
                      {event.metadata && Object.keys(event.metadata).length > 0 && (
                        <div className="bg-black/30 rounded p-2">
                          <div className="text-cyan-300/60 mb-1">{isSpanish ? 'Metadata:' : 'Metadata:'}</div>
                          <div className="text-cyan-300/80 text-xs">
                            {Object.entries(event.metadata).slice(0, 3).map(([key, value]) => (
                              <div key={key}>{key}: {String(value)}</div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

