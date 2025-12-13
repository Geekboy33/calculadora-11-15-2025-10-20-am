import { useState, useEffect } from 'react';
import { 
  Database, Users, CreditCard, History, Settings, FileText, 
  Download, Trash2, RefreshCw, Search, Filter, ChevronDown,
  Shield, Activity, Server, HardDrive, Clock, AlertTriangle,
  CheckCircle, XCircle, Eye, FileDown, Layers
} from 'lucide-react';
import { ledgerDB, DBProfile, DBAccount, DBTransaction, DBAPIConfig, DBAuditLog } from '../lib/database';
import jsPDF from 'jspdf';

// ════════════════════════════════════════════════════════════════════════════
// ESTILOS Y CONSTANTES
// ════════════════════════════════════════════════════════════════════════════

const DB_BLUE = '#2563eb';
const DB_GREEN = '#10b981';
const DB_RED = '#ef4444';
const DB_ORANGE = '#f59e0b';

type TabType = 'overview' | 'profiles' | 'accounts' | 'transactions' | 'apis' | 'audit' | 'export';

// ════════════════════════════════════════════════════════════════════════════
// COMPONENTE PRINCIPAL
// ════════════════════════════════════════════════════════════════════════════

export default function DatabaseModule() {
  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const [isSpanish] = useState(true);
  
  // Data states
  const [profiles, setProfiles] = useState<DBProfile[]>([]);
  const [accounts, setAccounts] = useState<DBAccount[]>([]);
  const [transactions, setTransactions] = useState<DBTransaction[]>([]);
  const [apiConfigs, setApiConfigs] = useState<DBAPIConfig[]>([]);
  const [auditLogs, setAuditLogs] = useState<DBAuditLog[]>([]);
  const [stats, setStats] = useState<Record<string, number>>({});
  
  // UI states
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterModule, setFilterModule] = useState<string>('all');
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());

  // ══════════════════════════════════════════════════════════════════════════
  // CARGAR DATOS
  // ══════════════════════════════════════════════════════════════════════════

  const loadAllData = async () => {
    setLoading(true);
    try {
      await ledgerDB.init();
      const [p, a, t, api, audit, s] = await Promise.all([
        ledgerDB.getAllProfiles(),
        ledgerDB.getAllAccounts(),
        ledgerDB.getAllTransactions(),
        ledgerDB.getAllAPIConfigs(),
        ledgerDB.getAllAuditLogs(),
        ledgerDB.getStats(),
      ]);
      setProfiles(p);
      setAccounts(a);
      setTransactions(t);
      setApiConfigs(api);
      setAuditLogs(audit);
      setStats(s);
    } catch (error) {
      console.error('Error loading data:', error);
    }
    setLoading(false);
  };

  useEffect(() => {
    loadAllData();
  }, []);

  // ══════════════════════════════════════════════════════════════════════════
  // FUNCIONES DE ELIMINACIÓN
  // ══════════════════════════════════════════════════════════════════════════

  const handleDeleteProfile = async (id: string) => {
    if (confirm(isSpanish ? '¿Eliminar este perfil?' : 'Delete this profile?')) {
      await ledgerDB.deleteProfile(id);
      loadAllData();
    }
  };

  const handleDeleteAccount = async (id: string) => {
    if (confirm(isSpanish ? '¿Eliminar esta cuenta?' : 'Delete this account?')) {
      await ledgerDB.deleteAccount(id);
      loadAllData();
    }
  };

  const handleDeleteTransaction = async (id: string) => {
    if (confirm(isSpanish ? '¿Eliminar esta transacción?' : 'Delete this transaction?')) {
      await ledgerDB.deleteTransaction(id);
      loadAllData();
    }
  };

  const handleDeleteAPIConfig = async (id: string) => {
    if (confirm(isSpanish ? '¿Eliminar esta configuración API?' : 'Delete this API config?')) {
      await ledgerDB.deleteAPIConfig(id);
      loadAllData();
    }
  };

  const handleClearAuditLogs = async () => {
    if (confirm(isSpanish ? '¿Limpiar todos los logs de auditoría?' : 'Clear all audit logs?')) {
      await ledgerDB.clearAuditLogs();
      loadAllData();
    }
  };

  const handleClearAllData = async () => {
    if (confirm(isSpanish ? '⚠️ ¿ELIMINAR TODOS LOS DATOS? Esta acción no se puede deshacer.' : '⚠️ DELETE ALL DATA? This cannot be undone.')) {
      if (confirm(isSpanish ? 'Confirmar eliminación total' : 'Confirm total deletion')) {
        await ledgerDB.clearAllData();
        loadAllData();
      }
    }
  };

  // ══════════════════════════════════════════════════════════════════════════
  // EXPORTAR DATOS
  // ══════════════════════════════════════════════════════════════════════════

  const handleExportTXT = async () => {
    const data = await ledgerDB.exportAllData();
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    
    let content = `════════════════════════════════════════════════════════════════════════════════
                    LEDGER DAES TERMINAL - DATABASE EXPORT
                    Generated: ${new Date().toLocaleString()}
════════════════════════════════════════════════════════════════════════════════

`;

    // Profiles
    content += `\n═══ PROFILES (${data.profiles?.length || 0}) ═══\n`;
    (data.profiles as DBProfile[])?.forEach((p, i) => {
      content += `\n[${i + 1}] ${p.name}\n`;
      content += `    ID: ${p.id}\n`;
      content += `    Email: ${p.email || 'N/A'}\n`;
      content += `    Role: ${p.role}\n`;
      content += `    Created: ${new Date(p.createdAt).toLocaleString()}\n`;
      content += `    Active: ${p.isActive ? 'Yes' : 'No'}\n`;
    });

    // Accounts
    content += `\n\n═══ ACCOUNTS (${data.accounts?.length || 0}) ═══\n`;
    (data.accounts as DBAccount[])?.forEach((a, i) => {
      content += `\n[${i + 1}] ${a.accountName}\n`;
      content += `    Sequence: #${a.sequenceNumber}\n`;
      content += `    Account: ${a.accountNumber}\n`;
      content += `    Currency: ${a.currency}\n`;
      content += `    Balance: ${a.balance.toLocaleString()}\n`;
      content += `    Bank: ${a.bankName}\n`;
      content += `    Type: ${a.accountType}\n`;
      content += `    Created: ${new Date(a.createdAt).toLocaleString()}\n`;
    });

    // Transactions
    content += `\n\n═══ TRANSACTIONS (${data.transactions?.length || 0}) ═══\n`;
    (data.transactions as DBTransaction[])?.forEach((t, i) => {
      content += `\n[${i + 1}] ${t.reference}\n`;
      content += `    Type: ${t.type}\n`;
      content += `    Amount: ${t.amount.toLocaleString()} ${t.currency}\n`;
      content += `    Status: ${t.status}\n`;
      content += `    Module: ${t.module}\n`;
      content += `    Description: ${t.description}\n`;
      content += `    Created: ${new Date(t.createdAt).toLocaleString()}\n`;
    });

    // API Configs
    content += `\n\n═══ API CONFIGURATIONS (${data.apiConfigs?.length || 0}) ═══\n`;
    (data.apiConfigs as DBAPIConfig[])?.forEach((api, i) => {
      content += `\n[${i + 1}] ${api.name}\n`;
      content += `    Module: ${api.module}\n`;
      content += `    Base URL: ${api.baseUrl}\n`;
      content += `    Environment: ${api.environment}\n`;
      content += `    Active: ${api.isActive ? 'Yes' : 'No'}\n`;
    });

    // Audit Logs
    content += `\n\n═══ AUDIT LOGS (${data.auditLogs?.length || 0}) ═══\n`;
    (data.auditLogs as DBAuditLog[])?.slice(0, 100).forEach((log, i) => {
      content += `\n[${i + 1}] ${log.action}\n`;
      content += `    Module: ${log.module}\n`;
      content += `    Details: ${log.details}\n`;
      content += `    Timestamp: ${new Date(log.timestamp).toLocaleString()}\n`;
    });

    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `LedgerDAES_Database_${timestamp}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleExportPDF = async () => {
    const data = await ledgerDB.exportAllData();
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    
    const pdf = new jsPDF();
    let y = 20;
    const lineHeight = 7;
    const margin = 15;
    const pageHeight = pdf.internal.pageSize.height;

    const addPage = () => {
      pdf.addPage();
      y = 20;
    };

    const checkPage = () => {
      if (y > pageHeight - 30) addPage();
    };

    // Title
    pdf.setFontSize(18);
    pdf.setTextColor(37, 99, 235);
    pdf.text('LEDGER DAES TERMINAL', margin, y);
    y += lineHeight * 2;
    
    pdf.setFontSize(12);
    pdf.setTextColor(100);
    pdf.text(`Database Export - ${new Date().toLocaleString()}`, margin, y);
    y += lineHeight * 2;

    // Stats
    pdf.setFontSize(14);
    pdf.setTextColor(0);
    pdf.text('DATABASE STATISTICS', margin, y);
    y += lineHeight;
    
    pdf.setFontSize(10);
    pdf.text(`Profiles: ${data.profiles?.length || 0}`, margin, y); y += lineHeight;
    pdf.text(`Accounts: ${data.accounts?.length || 0}`, margin, y); y += lineHeight;
    pdf.text(`Transactions: ${data.transactions?.length || 0}`, margin, y); y += lineHeight;
    pdf.text(`API Configs: ${data.apiConfigs?.length || 0}`, margin, y); y += lineHeight;
    pdf.text(`Audit Logs: ${data.auditLogs?.length || 0}`, margin, y); y += lineHeight * 2;

    // Profiles
    checkPage();
    pdf.setFontSize(14);
    pdf.setTextColor(37, 99, 235);
    pdf.text('PROFILES', margin, y);
    y += lineHeight;
    
    pdf.setFontSize(9);
    pdf.setTextColor(0);
    (data.profiles as DBProfile[])?.forEach((p) => {
      checkPage();
      pdf.text(`• ${p.name} (${p.role}) - ${p.email || 'No email'}`, margin, y);
      y += lineHeight;
    });

    // Accounts
    y += lineHeight;
    checkPage();
    pdf.setFontSize(14);
    pdf.setTextColor(37, 99, 235);
    pdf.text('ACCOUNTS', margin, y);
    y += lineHeight;
    
    pdf.setFontSize(9);
    pdf.setTextColor(0);
    (data.accounts as DBAccount[])?.forEach((a) => {
      checkPage();
      pdf.text(`• #${a.sequenceNumber} ${a.accountNumber} - ${a.currency} ${a.balance.toLocaleString()}`, margin, y);
      y += lineHeight;
    });

    // Transactions
    y += lineHeight;
    checkPage();
    pdf.setFontSize(14);
    pdf.setTextColor(37, 99, 235);
    pdf.text('TRANSACTIONS', margin, y);
    y += lineHeight;
    
    pdf.setFontSize(9);
    pdf.setTextColor(0);
    (data.transactions as DBTransaction[])?.slice(0, 50).forEach((t) => {
      checkPage();
      pdf.text(`• ${t.type.toUpperCase()} ${t.amount.toLocaleString()} ${t.currency} - ${t.status}`, margin, y);
      y += lineHeight;
    });

    pdf.save(`LedgerDAES_Database_${timestamp}.pdf`);
  };

  const handleExportJSON = async () => {
    const data = await ledgerDB.exportAllData();
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `LedgerDAES_Database_${timestamp}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // ══════════════════════════════════════════════════════════════════════════
  // FILTROS
  // ══════════════════════════════════════════════════════════════════════════

  const filteredTransactions = transactions.filter(t => {
    const matchesSearch = searchTerm === '' || 
      t.reference.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesModule = filterModule === 'all' || t.module === filterModule;
    return matchesSearch && matchesModule;
  });

  const filteredAuditLogs = auditLogs.filter(log => {
    const matchesSearch = searchTerm === '' || 
      log.action.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.details.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesModule = filterModule === 'all' || log.module === filterModule;
    return matchesSearch && matchesModule;
  });

  const uniqueModules = [...new Set([...transactions.map(t => t.module), ...auditLogs.map(l => l.module)])];

  // ══════════════════════════════════════════════════════════════════════════
  // RENDER
  // ══════════════════════════════════════════════════════════════════════════

  const tabs: { id: TabType; label: string; icon: React.ReactNode }[] = [
    { id: 'overview', label: isSpanish ? 'Resumen' : 'Overview', icon: <Layers size={18} /> },
    { id: 'profiles', label: isSpanish ? 'Perfiles' : 'Profiles', icon: <Users size={18} /> },
    { id: 'accounts', label: isSpanish ? 'Cuentas' : 'Accounts', icon: <CreditCard size={18} /> },
    { id: 'transactions', label: isSpanish ? 'Transacciones' : 'Transactions', icon: <History size={18} /> },
    { id: 'apis', label: 'APIs', icon: <Server size={18} /> },
    { id: 'audit', label: isSpanish ? 'Auditoría' : 'Audit', icon: <Shield size={18} /> },
    { id: 'export', label: isSpanish ? 'Exportar' : 'Export', icon: <Download size={18} /> },
  ];

  return (
    <div className="min-h-screen p-6" style={{ backgroundColor: 'var(--bg-primary)' }}>
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-2">
          <div className="p-3 rounded-xl" style={{ backgroundColor: `${DB_BLUE}20` }}>
            <Database size={28} style={{ color: DB_BLUE }} />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-[var(--text-primary)]">
              {isSpanish ? 'Base de Datos' : 'Database'}
            </h1>
            <p className="text-sm text-[var(--text-secondary)]">
              {isSpanish ? 'Gestión de datos, perfiles y auditoría' : 'Data management, profiles and audit'}
            </p>
          </div>
        </div>
        
        {/* Quick Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3 mt-4">
          {Object.entries(stats).map(([key, value]) => (
            <div key={key} className="p-3 rounded-lg bg-[var(--bg-secondary)] border border-[var(--border-subtle)]">
              <div className="text-xs text-[var(--text-secondary)] capitalize">{key}</div>
              <div className="text-xl font-bold text-[var(--text-primary)]">{value}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap gap-2 mb-6 border-b border-[var(--border-subtle)] pb-4">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all ${
              activeTab === tab.id
                ? 'text-white'
                : 'bg-[var(--bg-secondary)] text-[var(--text-secondary)] hover:bg-[var(--bg-elevated)]'
            }`}
            style={activeTab === tab.id ? { backgroundColor: DB_BLUE } : {}}
          >
            {tab.icon}
            <span className="text-sm font-medium">{tab.label}</span>
          </button>
        ))}
        
        <button
          onClick={loadAllData}
          className="ml-auto flex items-center gap-2 px-4 py-2 rounded-lg bg-[var(--bg-secondary)] text-[var(--text-secondary)] hover:bg-[var(--bg-elevated)]"
        >
          <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
          <span className="text-sm">{isSpanish ? 'Actualizar' : 'Refresh'}</span>
        </button>
      </div>

      {/* Content */}
      <div className="bg-[var(--bg-secondary)] rounded-xl border border-[var(--border-subtle)] p-6">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <RefreshCw size={32} className="animate-spin text-[var(--text-secondary)]" />
          </div>
        ) : (
          <>
            {/* Overview */}
            {activeTab === 'overview' && (
              <div className="space-y-6">
                <h2 className="text-lg font-semibold text-[var(--text-primary)]">
                  {isSpanish ? 'Resumen de la Base de Datos' : 'Database Overview'}
                </h2>
                
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="p-4 rounded-lg border" style={{ borderColor: DB_BLUE, backgroundColor: `${DB_BLUE}10` }}>
                    <div className="flex items-center gap-3">
                      <Users size={24} style={{ color: DB_BLUE }} />
                      <div>
                        <div className="text-2xl font-bold" style={{ color: DB_BLUE }}>{stats.profiles || 0}</div>
                        <div className="text-sm text-[var(--text-secondary)]">{isSpanish ? 'Perfiles' : 'Profiles'}</div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="p-4 rounded-lg border" style={{ borderColor: DB_GREEN, backgroundColor: `${DB_GREEN}10` }}>
                    <div className="flex items-center gap-3">
                      <CreditCard size={24} style={{ color: DB_GREEN }} />
                      <div>
                        <div className="text-2xl font-bold" style={{ color: DB_GREEN }}>{stats.accounts || 0}</div>
                        <div className="text-sm text-[var(--text-secondary)]">{isSpanish ? 'Cuentas' : 'Accounts'}</div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="p-4 rounded-lg border" style={{ borderColor: DB_ORANGE, backgroundColor: `${DB_ORANGE}10` }}>
                    <div className="flex items-center gap-3">
                      <History size={24} style={{ color: DB_ORANGE }} />
                      <div>
                        <div className="text-2xl font-bold" style={{ color: DB_ORANGE }}>{stats.transactions || 0}</div>
                        <div className="text-sm text-[var(--text-secondary)]">{isSpanish ? 'Transacciones' : 'Transactions'}</div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="p-4 rounded-lg border" style={{ borderColor: DB_RED, backgroundColor: `${DB_RED}10` }}>
                    <div className="flex items-center gap-3">
                      <Shield size={24} style={{ color: DB_RED }} />
                      <div>
                        <div className="text-2xl font-bold" style={{ color: DB_RED }}>{stats.auditLogs || 0}</div>
                        <div className="text-sm text-[var(--text-secondary)]">{isSpanish ? 'Logs' : 'Logs'}</div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Recent Activity */}
                <div>
                  <h3 className="text-md font-semibold text-[var(--text-primary)] mb-3">
                    {isSpanish ? 'Actividad Reciente' : 'Recent Activity'}
                  </h3>
                  <div className="space-y-2 max-h-[300px] overflow-y-auto">
                    {auditLogs.slice(0, 10).map((log) => (
                      <div key={log.id} className="flex items-center gap-3 p-3 rounded-lg bg-[var(--bg-primary)]">
                        <Activity size={16} className="text-[var(--text-secondary)]" />
                        <div className="flex-1">
                          <div className="text-sm text-[var(--text-primary)]">{log.action}</div>
                          <div className="text-xs text-[var(--text-secondary)]">{log.details}</div>
                        </div>
                        <div className="text-xs text-[var(--text-secondary)]">
                          {new Date(log.timestamp).toLocaleString()}
                        </div>
                      </div>
                    ))}
                    {auditLogs.length === 0 && (
                      <div className="text-center py-8 text-[var(--text-secondary)]">
                        {isSpanish ? 'No hay actividad registrada' : 'No activity recorded'}
                      </div>
                    )}
                  </div>
                </div>

                {/* Danger Zone */}
                <div className="p-4 rounded-lg border border-red-500/30 bg-red-500/5">
                  <h3 className="text-md font-semibold text-red-500 mb-3 flex items-center gap-2">
                    <AlertTriangle size={18} />
                    {isSpanish ? 'Zona de Peligro' : 'Danger Zone'}
                  </h3>
                  <p className="text-sm text-[var(--text-secondary)] mb-3">
                    {isSpanish 
                      ? 'Estas acciones son irreversibles. Proceda con precaución.'
                      : 'These actions are irreversible. Proceed with caution.'}
                  </p>
                  <button
                    onClick={handleClearAllData}
                    className="px-4 py-2 rounded-lg bg-red-500 text-white hover:bg-red-600 transition-colors"
                  >
                    {isSpanish ? 'Eliminar Todos los Datos' : 'Delete All Data'}
                  </button>
                </div>
              </div>
            )}

            {/* Profiles */}
            {activeTab === 'profiles' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-semibold text-[var(--text-primary)]">
                    {isSpanish ? 'Perfiles de Usuario' : 'User Profiles'} ({profiles.length})
                  </h2>
                </div>
                
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-[var(--border-subtle)]">
                        <th className="text-left p-3 text-sm text-[var(--text-secondary)]">ID</th>
                        <th className="text-left p-3 text-sm text-[var(--text-secondary)]">{isSpanish ? 'Nombre' : 'Name'}</th>
                        <th className="text-left p-3 text-sm text-[var(--text-secondary)]">Email</th>
                        <th className="text-left p-3 text-sm text-[var(--text-secondary)]">{isSpanish ? 'Rol' : 'Role'}</th>
                        <th className="text-left p-3 text-sm text-[var(--text-secondary)]">{isSpanish ? 'Creado' : 'Created'}</th>
                        <th className="text-left p-3 text-sm text-[var(--text-secondary)]">{isSpanish ? 'Estado' : 'Status'}</th>
                        <th className="text-left p-3 text-sm text-[var(--text-secondary)]">{isSpanish ? 'Acciones' : 'Actions'}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {profiles.map((profile) => (
                        <tr key={profile.id} className="border-b border-[var(--border-subtle)] hover:bg-[var(--bg-primary)]">
                          <td className="p-3 text-xs font-mono text-[var(--text-secondary)]">{profile.id.slice(0, 12)}...</td>
                          <td className="p-3 text-sm text-[var(--text-primary)]">{profile.name}</td>
                          <td className="p-3 text-sm text-[var(--text-secondary)]">{profile.email || '-'}</td>
                          <td className="p-3">
                            <span className={`px-2 py-1 rounded text-xs ${
                              profile.role === 'admin' ? 'bg-red-500/20 text-red-400' :
                              profile.role === 'operator' ? 'bg-blue-500/20 text-blue-400' :
                              'bg-gray-500/20 text-gray-400'
                            }`}>
                              {profile.role}
                            </span>
                          </td>
                          <td className="p-3 text-xs text-[var(--text-secondary)]">
                            {new Date(profile.createdAt).toLocaleString()}
                          </td>
                          <td className="p-3">
                            {profile.isActive ? (
                              <CheckCircle size={16} className="text-green-500" />
                            ) : (
                              <XCircle size={16} className="text-red-500" />
                            )}
                          </td>
                          <td className="p-3">
                            <button
                              onClick={() => handleDeleteProfile(profile.id)}
                              className="p-1 rounded hover:bg-red-500/20 text-red-500"
                            >
                              <Trash2 size={16} />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {profiles.length === 0 && (
                    <div className="text-center py-12 text-[var(--text-secondary)]">
                      {isSpanish ? 'No hay perfiles registrados' : 'No profiles registered'}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Accounts */}
            {activeTab === 'accounts' && (
              <div className="space-y-4">
                <h2 className="text-lg font-semibold text-[var(--text-primary)]">
                  {isSpanish ? 'Cuentas Bancarias' : 'Bank Accounts'} ({accounts.length})
                </h2>
                
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-[var(--border-subtle)]">
                        <th className="text-left p-3 text-sm text-[var(--text-secondary)]">#</th>
                        <th className="text-left p-3 text-sm text-[var(--text-secondary)]">{isSpanish ? 'Cuenta' : 'Account'}</th>
                        <th className="text-left p-3 text-sm text-[var(--text-secondary)]">{isSpanish ? 'Nombre' : 'Name'}</th>
                        <th className="text-left p-3 text-sm text-[var(--text-secondary)]">{isSpanish ? 'Divisa' : 'Currency'}</th>
                        <th className="text-left p-3 text-sm text-[var(--text-secondary)]">{isSpanish ? 'Balance' : 'Balance'}</th>
                        <th className="text-left p-3 text-sm text-[var(--text-secondary)]">{isSpanish ? 'Banco' : 'Bank'}</th>
                        <th className="text-left p-3 text-sm text-[var(--text-secondary)]">{isSpanish ? 'Creado' : 'Created'}</th>
                        <th className="text-left p-3 text-sm text-[var(--text-secondary)]">{isSpanish ? 'Acciones' : 'Actions'}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {accounts.map((account) => (
                        <tr key={account.id} className="border-b border-[var(--border-subtle)] hover:bg-[var(--bg-primary)]">
                          <td className="p-3 text-sm font-bold" style={{ color: DB_BLUE }}>#{account.sequenceNumber}</td>
                          <td className="p-3 text-sm font-mono text-[var(--text-primary)]">{account.accountNumber}</td>
                          <td className="p-3 text-sm text-[var(--text-primary)]">{account.accountName}</td>
                          <td className="p-3">
                            <span className="px-2 py-1 rounded text-xs bg-green-500/20 text-green-400">
                              {account.currency}
                            </span>
                          </td>
                          <td className="p-3 text-sm font-semibold text-[var(--text-primary)]">
                            {account.balance.toLocaleString()}
                          </td>
                          <td className="p-3 text-sm text-[var(--text-secondary)]">{account.bankName}</td>
                          <td className="p-3 text-xs text-[var(--text-secondary)]">
                            {new Date(account.createdAt).toLocaleString()}
                          </td>
                          <td className="p-3">
                            <button
                              onClick={() => handleDeleteAccount(account.id)}
                              className="p-1 rounded hover:bg-red-500/20 text-red-500"
                            >
                              <Trash2 size={16} />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {accounts.length === 0 && (
                    <div className="text-center py-12 text-[var(--text-secondary)]">
                      {isSpanish ? 'No hay cuentas registradas' : 'No accounts registered'}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Transactions */}
            {activeTab === 'transactions' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between flex-wrap gap-4">
                  <h2 className="text-lg font-semibold text-[var(--text-primary)]">
                    {isSpanish ? 'Historial de Transacciones' : 'Transaction History'} ({filteredTransactions.length})
                  </h2>
                  
                  <div className="flex items-center gap-3">
                    <div className="relative">
                      <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-secondary)]" />
                      <input
                        type="text"
                        placeholder={isSpanish ? 'Buscar...' : 'Search...'}
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-9 pr-4 py-2 rounded-lg bg-[var(--bg-primary)] border border-[var(--border-subtle)] text-sm text-[var(--text-primary)]"
                      />
                    </div>
                    
                    <select
                      value={filterModule}
                      onChange={(e) => setFilterModule(e.target.value)}
                      className="px-3 py-2 rounded-lg bg-[var(--bg-primary)] border border-[var(--border-subtle)] text-sm text-[var(--text-primary)]"
                    >
                      <option value="all">{isSpanish ? 'Todos los módulos' : 'All modules'}</option>
                      {uniqueModules.map((mod) => (
                        <option key={mod} value={mod}>{mod}</option>
                      ))}
                    </select>
                  </div>
                </div>
                
                <div className="overflow-x-auto max-h-[500px]">
                  <table className="w-full">
                    <thead className="sticky top-0 bg-[var(--bg-secondary)]">
                      <tr className="border-b border-[var(--border-subtle)]">
                        <th className="text-left p-3 text-sm text-[var(--text-secondary)]">{isSpanish ? 'Referencia' : 'Reference'}</th>
                        <th className="text-left p-3 text-sm text-[var(--text-secondary)]">{isSpanish ? 'Tipo' : 'Type'}</th>
                        <th className="text-left p-3 text-sm text-[var(--text-secondary)]">{isSpanish ? 'Monto' : 'Amount'}</th>
                        <th className="text-left p-3 text-sm text-[var(--text-secondary)]">{isSpanish ? 'Estado' : 'Status'}</th>
                        <th className="text-left p-3 text-sm text-[var(--text-secondary)]">{isSpanish ? 'Módulo' : 'Module'}</th>
                        <th className="text-left p-3 text-sm text-[var(--text-secondary)]">{isSpanish ? 'Fecha' : 'Date'}</th>
                        <th className="text-left p-3 text-sm text-[var(--text-secondary)]">{isSpanish ? 'Acciones' : 'Actions'}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredTransactions.map((tx) => (
                        <tr key={tx.id} className="border-b border-[var(--border-subtle)] hover:bg-[var(--bg-primary)]">
                          <td className="p-3 text-xs font-mono text-[var(--text-primary)]">{tx.reference}</td>
                          <td className="p-3">
                            <span className={`px-2 py-1 rounded text-xs ${
                              tx.type === 'credit' ? 'bg-green-500/20 text-green-400' :
                              tx.type === 'debit' ? 'bg-red-500/20 text-red-400' :
                              'bg-blue-500/20 text-blue-400'
                            }`}>
                              {tx.type}
                            </span>
                          </td>
                          <td className="p-3 text-sm font-semibold text-[var(--text-primary)]">
                            {tx.amount.toLocaleString()} {tx.currency}
                          </td>
                          <td className="p-3">
                            <span className={`px-2 py-1 rounded text-xs ${
                              tx.status === 'completed' ? 'bg-green-500/20 text-green-400' :
                              tx.status === 'pending' ? 'bg-yellow-500/20 text-yellow-400' :
                              tx.status === 'failed' ? 'bg-red-500/20 text-red-400' :
                              'bg-gray-500/20 text-gray-400'
                            }`}>
                              {tx.status}
                            </span>
                          </td>
                          <td className="p-3 text-xs text-[var(--text-secondary)]">{tx.module}</td>
                          <td className="p-3 text-xs text-[var(--text-secondary)]">
                            {new Date(tx.createdAt).toLocaleString()}
                          </td>
                          <td className="p-3">
                            <button
                              onClick={() => handleDeleteTransaction(tx.id)}
                              className="p-1 rounded hover:bg-red-500/20 text-red-500"
                            >
                              <Trash2 size={16} />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {filteredTransactions.length === 0 && (
                    <div className="text-center py-12 text-[var(--text-secondary)]">
                      {isSpanish ? 'No hay transacciones' : 'No transactions'}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* APIs */}
            {activeTab === 'apis' && (
              <div className="space-y-4">
                <h2 className="text-lg font-semibold text-[var(--text-primary)]">
                  {isSpanish ? 'Configuraciones de API' : 'API Configurations'} ({apiConfigs.length})
                </h2>
                
                <div className="grid gap-4">
                  {apiConfigs.map((api) => (
                    <div key={api.id} className="p-4 rounded-lg bg-[var(--bg-primary)] border border-[var(--border-subtle)]">
                      <div className="flex items-start justify-between">
                        <div>
                          <h3 className="font-semibold text-[var(--text-primary)]">{api.name}</h3>
                          <p className="text-sm text-[var(--text-secondary)]">{api.module}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className={`px-2 py-1 rounded text-xs ${
                            api.environment === 'production' ? 'bg-green-500/20 text-green-400' : 'bg-yellow-500/20 text-yellow-400'
                          }`}>
                            {api.environment}
                          </span>
                          <button
                            onClick={() => handleDeleteAPIConfig(api.id)}
                            className="p-1 rounded hover:bg-red-500/20 text-red-500"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </div>
                      <div className="mt-3 text-xs text-[var(--text-secondary)]">
                        <div>Base URL: <span className="font-mono">{api.baseUrl}</span></div>
                        <div>Created: {new Date(api.createdAt).toLocaleString()}</div>
                        {api.lastConnected && <div>Last Connected: {new Date(api.lastConnected).toLocaleString()}</div>}
                      </div>
                    </div>
                  ))}
                  {apiConfigs.length === 0 && (
                    <div className="text-center py-12 text-[var(--text-secondary)]">
                      {isSpanish ? 'No hay APIs configuradas' : 'No APIs configured'}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Audit */}
            {activeTab === 'audit' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between flex-wrap gap-4">
                  <h2 className="text-lg font-semibold text-[var(--text-primary)]">
                    {isSpanish ? 'Logs de Auditoría' : 'Audit Logs'} ({filteredAuditLogs.length})
                  </h2>
                  
                  <div className="flex items-center gap-3">
                    <div className="relative">
                      <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-secondary)]" />
                      <input
                        type="text"
                        placeholder={isSpanish ? 'Buscar...' : 'Search...'}
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-9 pr-4 py-2 rounded-lg bg-[var(--bg-primary)] border border-[var(--border-subtle)] text-sm text-[var(--text-primary)]"
                      />
                    </div>
                    
                    <button
                      onClick={handleClearAuditLogs}
                      className="px-3 py-2 rounded-lg bg-red-500/10 text-red-500 hover:bg-red-500/20 text-sm"
                    >
                      {isSpanish ? 'Limpiar Logs' : 'Clear Logs'}
                    </button>
                  </div>
                </div>
                
                <div className="overflow-y-auto max-h-[500px] space-y-2">
                  {filteredAuditLogs.map((log) => (
                    <div key={log.id} className="p-3 rounded-lg bg-[var(--bg-primary)] border border-[var(--border-subtle)]">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-2">
                          <span className={`px-2 py-1 rounded text-xs ${
                            log.action.includes('CREATE') ? 'bg-green-500/20 text-green-400' :
                            log.action.includes('UPDATE') ? 'bg-blue-500/20 text-blue-400' :
                            log.action.includes('DELETE') ? 'bg-red-500/20 text-red-400' :
                            'bg-gray-500/20 text-gray-400'
                          }`}>
                            {log.action}
                          </span>
                          <span className="text-xs text-[var(--text-secondary)]">{log.module}</span>
                        </div>
                        <span className="text-xs text-[var(--text-secondary)]">
                          {new Date(log.timestamp).toLocaleString()}
                        </span>
                      </div>
                      <p className="mt-2 text-sm text-[var(--text-primary)]">{log.details}</p>
                    </div>
                  ))}
                  {filteredAuditLogs.length === 0 && (
                    <div className="text-center py-12 text-[var(--text-secondary)]">
                      {isSpanish ? 'No hay logs de auditoría' : 'No audit logs'}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Export */}
            {activeTab === 'export' && (
              <div className="space-y-6">
                <h2 className="text-lg font-semibold text-[var(--text-primary)]">
                  {isSpanish ? 'Exportar Base de Datos' : 'Export Database'}
                </h2>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <button
                    onClick={handleExportTXT}
                    className="p-6 rounded-lg border border-[var(--border-subtle)] hover:border-blue-500 transition-colors group"
                  >
                    <FileText size={32} className="mx-auto mb-3 text-[var(--text-secondary)] group-hover:text-blue-500" />
                    <div className="text-lg font-semibold text-[var(--text-primary)]">TXT</div>
                    <div className="text-sm text-[var(--text-secondary)]">
                      {isSpanish ? 'Formato de texto plano' : 'Plain text format'}
                    </div>
                  </button>
                  
                  <button
                    onClick={handleExportPDF}
                    className="p-6 rounded-lg border border-[var(--border-subtle)] hover:border-red-500 transition-colors group"
                  >
                    <FileDown size={32} className="mx-auto mb-3 text-[var(--text-secondary)] group-hover:text-red-500" />
                    <div className="text-lg font-semibold text-[var(--text-primary)]">PDF</div>
                    <div className="text-sm text-[var(--text-secondary)]">
                      {isSpanish ? 'Documento portable' : 'Portable document'}
                    </div>
                  </button>
                  
                  <button
                    onClick={handleExportJSON}
                    className="p-6 rounded-lg border border-[var(--border-subtle)] hover:border-green-500 transition-colors group"
                  >
                    <HardDrive size={32} className="mx-auto mb-3 text-[var(--text-secondary)] group-hover:text-green-500" />
                    <div className="text-lg font-semibold text-[var(--text-primary)]">JSON</div>
                    <div className="text-sm text-[var(--text-secondary)]">
                      {isSpanish ? 'Backup completo' : 'Full backup'}
                    </div>
                  </button>
                </div>

                <div className="p-4 rounded-lg bg-blue-500/10 border border-blue-500/30">
                  <h3 className="font-semibold text-blue-400 mb-2 flex items-center gap-2">
                    <HardDrive size={18} />
                    {isSpanish ? 'Información de Almacenamiento' : 'Storage Information'}
                  </h3>
                  <p className="text-sm text-[var(--text-secondary)]">
                    {isSpanish 
                      ? 'Los datos se almacenan localmente usando IndexedDB. Los datos persisten entre sesiones y actualizaciones de la aplicación.'
                      : 'Data is stored locally using IndexedDB. Data persists between sessions and application updates.'}
                  </p>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

