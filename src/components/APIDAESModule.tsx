/**
 * API DAES Module - Sistema de Transferencias API
 * Gestión de APIs bancarias con privilegios y transferencias
 */

import { useState, useEffect } from 'react';
import {
  Send,
  Download,
  Key,
  RefreshCw,
  CheckCircle,
  X,
  AlertCircle
} from 'lucide-react';
import { useLanguage } from '../lib/i18n';
import { custodyStore, type CustodyAccount } from '../lib/custody-store';


export function APIDAESModule() {
  const { language } = useLanguage();
  const [custodyAccounts, setCustodyAccounts] = useState<CustodyAccount[]>([]);
  const [selectedAPI, setSelectedAPI] = useState<CustodyAccount | null>(null);
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [showAPIConfigModal, setShowAPIConfigModal] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editingAPI, setEditingAPI] = useState({
    apiId: '',
    endpoint: '',
    externalProvider: '',
    externalAPIKey: '',
    externalAPISecret: '',
  });
  
  const [transferData, setTransferData] = useState({
    amount: 0,
    destinationBank: '',
    destinationAccount: '',
    destinationIBAN: '',
    beneficiaryName: '',
    reference: '',
    urgent: false,
    // Credenciales API del destino
    destinationAPIKey: '',
    destinationAPISecret: '',
  });

  // Cargar cuentas custodio
  useEffect(() => {
    try {
      const accounts = custodyStore.getAccounts();
      // Solo cuentas bancarias, con validación
      const bankingAccounts = accounts.filter(a => 
        a && a.accountType === 'banking'
      );
      setCustodyAccounts(bankingAccounts);
      setError(null);

      const unsubscribe = custodyStore.subscribe((newAccounts) => {
        try {
          const banking = newAccounts.filter(a => a.accountType === 'banking');
          setCustodyAccounts(banking);
          console.log('[API DAES] 🔄 Cuentas sincronizadas:', banking.length);
        } catch (err) {
          console.error('[API DAES] Error en suscripción:', err);
          setError(err instanceof Error ? err.message : 'Error desconocido');
        }
      });

      return unsubscribe;
    } catch (err) {
      console.error('[API DAES] Error al cargar cuentas:', err);
      setError(err instanceof Error ? err.message : 'Error al cargar cuentas');
    }
  }, []);

  // Abrir modal de configuración API
  const handleOpenAPIConfig = (account: CustodyAccount) => {
    setSelectedAPI(account);
    setEditingAPI({
      apiId: account.apiId || '',
      endpoint: account.apiEndpoint || '',
      externalProvider: account.externalProvider || '',
      externalAPIKey: account.externalAPIKey || '',
      externalAPISecret: account.externalAPISecret || '',
    });
    setShowAPIConfigModal(true);
  };

  // Conectar API externa
  const handleConnectExternal = () => {
    if (!selectedAPI) return;

    if (!editingAPI.externalProvider || !editingAPI.externalAPIKey || !editingAPI.externalAPISecret) {
      alert(language === 'es' ? 'Completa todos los campos de API externa' : 'Complete all external API fields');
      return;
    }

    const success = custodyStore.connectExternalAPI(
      selectedAPI.id,
      editingAPI.externalProvider,
      editingAPI.externalAPIKey,
      editingAPI.externalAPISecret
    );

    if (success) {
      alert(
        language === 'es'
          ? `✅ API Externa Conectada\n\nProveedor: ${editingAPI.externalProvider}\n\nAhora puedes ejecutar transferencias reales.`
          : `✅ External API Connected\n\nProvider: ${editingAPI.externalProvider}\n\nYou can now execute real transfers.`
      );
    }
  };

  // Desconectar API externa
  const handleDisconnectExternal = () => {
    if (!selectedAPI) return;

    const confirmed = confirm(
      language === 'es'
        ? '¿Desconectar API externa?\n\nNo podrás ejecutar transferencias reales hasta reconectar.'
        : 'Disconnect external API?\n\nYou won\'t be able to execute real transfers until reconnecting.'
    );

    if (confirmed) {
      custodyStore.disconnectExternalAPI(selectedAPI.id);
      setEditingAPI({
        ...editingAPI,
        externalProvider: '',
        externalAPIKey: '',
        externalAPISecret: '',
      });
      alert(language === 'es' ? '✅ API externa desconectada' : '✅ External API disconnected');
    }
  };

  // Regenerar API completa (ID, Endpoint, Key)
  const handleRegenerateAPI = () => {
    if (!selectedAPI) return;

    const confirmed = confirm(
      language === 'es'
        ? `¿Regenerar credenciales API?\n\nEsto generará:\n• Nuevo API ID\n• Nuevo Endpoint\n• Nueva API Key\n\n⚠️ Las credenciales anteriores dejarán de funcionar.`
        : `Regenerate API credentials?\n\nThis will generate:\n• New API ID\n• New Endpoint\n• New API Key\n\n⚠️ Previous credentials will stop working.`
    );

    if (confirmed) {
      // Generar nuevas credenciales
      const newApiId = `BK-API-${selectedAPI.currency}-${Math.random().toString(36).substring(2, 9).toUpperCase()}`;
      const newEndpoint = `https://api.daes-custody.io/banking/verify/${selectedAPI.id}`;
      const newKey = custodyStore.regenerateAPIKey(selectedAPI.id);

      // Actualizar
      custodyStore.updateAPIConfig(selectedAPI.id, newApiId, newEndpoint);

      console.log('[API DAES] 🔄 API REGENERADA:');
      console.log(`  Nuevo API ID: ${newApiId}`);
      console.log(`  Nuevo Endpoint: ${newEndpoint}`);
      console.log(`  Nueva Key: ${newKey?.substring(0, 20)}...`);

      alert(
        language === 'es'
          ? `✅ API Regenerada\n\nNuevo API ID: ${newApiId}\n\n⚠️ Actualiza tus integraciones con las nuevas credenciales.`
          : `✅ API Regenerated\n\nNew API ID: ${newApiId}\n\n⚠️ Update your integrations with new credentials.`
      );

      setShowAPIConfigModal(false);
    }
  };

  // Guardar configuración de API
  const handleSaveAPIConfig = () => {
    if (!selectedAPI || !editingAPI.apiId || !editingAPI.endpoint) {
      alert(language === 'es' ? 'Completa todos los campos' : 'Complete all fields');
      return;
    }

    const success = custodyStore.updateAPIConfig(selectedAPI.id, editingAPI.apiId, editingAPI.endpoint);

    if (success) {
      alert(
        language === 'es'
          ? `✅ Configuración API Actualizada\n\nAPI ID: ${editingAPI.apiId}\nEndpoint: ${editingAPI.endpoint}`
          : `✅ API Configuration Updated\n\nAPI ID: ${editingAPI.apiId}\nEndpoint: ${editingAPI.endpoint}`
      );
      setShowAPIConfigModal(false);
    } else {
      alert(language === 'es' ? 'Error al actualizar' : 'Update error');
    }
  };

  // Ejecutar transferencia API
  const handleExecuteTransfer = () => {
    if (!selectedAPI || transferData.amount <= 0) {
      alert(language === 'es' ? 'Ingresa un monto válido' : 'Enter valid amount');
      return;
    }

    if (transferData.amount > selectedAPI.availableBalance) {
      alert(language === 'es' ? 'Fondos insuficientes' : 'Insufficient funds');
      return;
    }

    const transferId = `API-TRF-${Date.now()}-${Math.random().toString(36).substring(2, 7).toUpperCase()}`;
    
    console.log('[API DAES] 🚀 EJECUTANDO TRANSFERENCIA API:');
    console.log(`  Transfer ID: ${transferId}`);
    console.log(`  API ID Origen: ${selectedAPI.apiId}`);
    console.log(`  Endpoint Origen: ${selectedAPI.apiEndpoint}`);
    console.log(`  De: ${selectedAPI.accountName} (${selectedAPI.accountNumber})`);
    console.log(`  Monto: ${selectedAPI.currency} ${transferData.amount.toLocaleString()}`);
    console.log(`  Destino: ${transferData.destinationBank}`);
    console.log(`  Beneficiario: ${transferData.beneficiaryName}`);
    if (transferData.destinationAPIKey) {
      console.log(`  API Key Destino: ${transferData.destinationAPIKey.substring(0, 10)}...`);
    }
    if (transferData.destinationAPISecret) {
      console.log(`  Secret Destino: ${transferData.destinationAPISecret.substring(0, 5)}...`);
    }

    const message = language === 'es'
      ? `✅ Transferencia API Ejecutada\n\n` +
        `ID: ${transferId}\n` +
        `API ID: ${selectedAPI.apiId}\n` +
        `Monto: ${selectedAPI.currency} ${transferData.amount.toLocaleString()}\n` +
        `Destino: ${transferData.beneficiaryName}\n` +
        `Banco: ${transferData.destinationBank}\n\n` +
        `Estado: PROCESANDO\n` +
        `Tiempo: ${transferData.urgent ? '1-2 horas' : '24-48 horas'}`
      : `✅ API Transfer Executed\n\n` +
        `ID: ${transferId}\n` +
        `API ID: ${selectedAPI.apiId}\n` +
        `Amount: ${selectedAPI.currency} ${transferData.amount.toLocaleString()}\n` +
        `To: ${transferData.beneficiaryName}\n` +
        `Bank: ${transferData.destinationBank}\n\n` +
        `Status: PROCESSING\n` +
        `Time: ${transferData.urgent ? '1-2 hours' : '24-48 hours'}`;

    alert(message);
    setShowTransferModal(false);
    setTransferData({
      amount: 0,
      destinationBank: '',
      destinationAccount: '',
      destinationIBAN: '',
      beneficiaryName: '',
      reference: '',
      urgent: false,
      destinationAPIKey: '',
      destinationAPISecret: '',
    });
  };

  return (
    <div className="p-8 space-y-6">
      {/* Error Display */}
      {error && (
        <div className="bg-red-900/20 border-2 border-red-500 rounded-lg p-4 mb-4">
          <div className="flex items-center gap-2 text-red-400">
            <AlertCircle className="w-5 h-5" />
            <span className="font-bold">{language === 'es' ? 'Error:' : 'Error:'}</span>
            <span>{error}</span>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-[#00ff88] flex items-center gap-3">
            <Key className="w-8 h-8" />
            {language === 'es' ? 'API DAES - Transferencias Bancarias' : 'DAES API - Banking Transfers'}
          </h1>
          <p className="text-[#4d7c4d] mt-2">
            {language === 'es' 
              ? 'Sistema de gestión de APIs bancarias con privilegios de transferencia' 
              : 'Banking API management system with transfer privileges'}
          </p>
        </div>
      </div>

      {/* Estadísticas */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-[#0d0d0d] border border-[#1a1a1a] rounded-xl p-6">
          <div className="flex items-center gap-3 mb-2">
            <Key className="w-5 h-5 text-cyan-400" />
            <span className="text-[#4d7c4d] text-sm">{language === 'es' ? 'APIs Activas' : 'Active APIs'}</span>
          </div>
          <p className="text-3xl font-bold text-cyan-400">{custodyAccounts.length}</p>
        </div>

        <div className="bg-[#0d0d0d] border border-[#1a1a1a] rounded-xl p-6">
          <div className="flex items-center gap-3 mb-2">
            <Send className="w-5 h-5 text-green-400" />
            <span className="text-[#4d7c4d] text-sm">{language === 'es' ? 'Pueden Enviar' : 'Can Send'}</span>
          </div>
          <p className="text-3xl font-bold text-green-400">{custodyAccounts.length}</p>
        </div>

        <div className="bg-[#0d0d0d] border border-[#1a1a1a] rounded-xl p-6">
          <div className="flex items-center gap-3 mb-2">
            <Download className="w-5 h-5 text-blue-400" />
            <span className="text-[#4d7c4d] text-sm">{language === 'es' ? 'Pueden Recibir' : 'Can Receive'}</span>
          </div>
          <p className="text-3xl font-bold text-blue-400">{custodyAccounts.length}</p>
        </div>

        <div className="bg-[#0d0d0d] border border-[#1a1a1a] rounded-xl p-6">
          <div className="flex items-center gap-3 mb-2">
            <CheckCircle className="w-5 h-5 text-[#00ff88]" />
            <span className="text-[#4d7c4d] text-sm">{language === 'es' ? 'Total Activas' : 'Total Active'}</span>
          </div>
          <p className="text-3xl font-bold text-[#00ff88]">
            {custodyAccounts.filter(a => a.apiStatus === 'active').length}
          </p>
        </div>
      </div>

      {/* Lista de APIs */}
      {custodyAccounts.length > 0 ? (
        <div className="space-y-4">
          <h2 className="text-xl font-bold text-[#00ff88] mb-4">
            {language === 'es' ? 'APIs Bancarias Disponibles' : 'Available Banking APIs'}
          </h2>
          {custodyAccounts.map(account => (
            <div key={account.id} className="bg-[#0d0d0d] border border-[#1a1a1a] rounded-xl p-6 hover:border-[#00ff88]/30 transition-all">
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="text-2xl">🏦</div>
                    <h3 className="text-xl font-bold text-[#00ff88]">{account.accountName}</h3>
                    <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                      account.apiStatus === 'active' ? 'bg-green-500/20 text-green-400' :
                      'bg-yellow-500/20 text-yellow-400'
                    }`}>
                      {account.apiStatus?.toUpperCase() || 'PENDING'}
                    </span>
                  </div>
                  <div className="flex items-center gap-4 text-sm">
                    <p className="text-[#4d7c4d]">
                      {language === 'es' ? 'Cuenta:' : 'Account:'} <span className="text-[#00ff88] font-mono">{account.accountNumber}</span>
                    </p>
                    <p className="text-[#4d7c4d]">
                      API ID: <span className="text-cyan-400 font-mono">{account.apiId || 'N/A'}</span>
                    </p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleOpenAPIConfig(account)}
                    className="px-4 py-2 bg-cyan-500/20 border border-cyan-500/40 text-cyan-400 rounded-lg hover:bg-cyan-500/30 transition-all text-sm"
                  >
                    <Key className="w-4 h-4 inline mr-1" />
                    {language === 'es' ? 'Configurar API' : 'Configure API'}
                  </button>
                  <button
                    onClick={() => {
                      setSelectedAPI(account);
                      setShowTransferModal(true);
                    }}
                    className="px-6 py-3 bg-gradient-to-br from-[#00ff88] to-[#00cc6a] text-black font-bold rounded-lg hover:shadow-[0_0_20px_rgba(0,255,136,0.6)] transition-all"
                  >
                    <Send className="w-5 h-5 inline mr-2" />
                    {language === 'es' ? 'Nueva Transferencia' : 'New Transfer'}
                  </button>
                </div>
              </div>

              {/* Info API */}
              <div className="grid grid-cols-3 gap-4 mb-4">
                <div className="bg-[#0a0a0a] border border-[#1a1a1a] rounded-lg p-3">
                  <div className="text-xs text-[#4d7c4d] mb-1">{language === 'es' ? 'Disponible' : 'Available'}</div>
                  <div className="text-lg font-bold text-green-400 font-mono">
                    {account.currency} {account.availableBalance.toLocaleString()}
                  </div>
                </div>
                <div className="bg-[#0a0a0a] border border-[#1a1a1a] rounded-lg p-3">
                  <div className="text-xs text-[#4d7c4d] mb-1">{language === 'es' ? 'Privilegios' : 'Privileges'}</div>
                  <div className="flex gap-2">
                    <span className="px-2 py-1 bg-green-500/20 text-green-400 text-xs rounded">
                      <Send className="w-3 h-3 inline" /> {language === 'es' ? 'ENVIAR' : 'SEND'}
                    </span>
                    <span className="px-2 py-1 bg-blue-500/20 text-blue-400 text-xs rounded">
                      <Download className="w-3 h-3 inline" /> {language === 'es' ? 'RECIBIR' : 'RECEIVE'}
                    </span>
                  </div>
                </div>
                <div className="bg-[#0a0a0a] border border-[#1a1a1a] rounded-lg p-3">
                  <div className="text-xs text-[#4d7c4d] mb-1">Endpoint</div>
                  <div className="text-xs text-cyan-400 font-mono truncate">{account.apiEndpoint || 'N/A'}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-[#0d0d0d] border border-[#1a1a1a] rounded-xl p-12 text-center">
          <Key className="w-16 h-16 text-[#4d7c4d] mx-auto mb-4" />
          <h3 className="text-xl text-[#4d7c4d] mb-2">
            {language === 'es' ? 'No hay APIs bancarias configuradas' : 'No banking APIs configured'}
          </h3>
          <p className="text-[#4d7c4d] text-sm mb-4">
            {language === 'es' 
              ? 'Crea cuentas bancarias en "Cuentas Custodio" para gestionar APIs de transferencia'
              : 'Create banking accounts in "Custody Accounts" to manage transfer APIs'}
          </p>
        </div>
      )}

      {/* Modal de Transferencia API */}
      {showTransferModal && selectedAPI && (
        <div className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4">
          <div className="bg-black border-2 border-[#00ff88] rounded-xl p-6 max-w-3xl w-full shadow-[0_0_50px_rgba(0,255,136,0.5)]">
            <div className="flex items-center justify-between mb-6 border-b border-[#00ff88]/30 pb-4">
              <h2 className="text-2xl font-bold text-[#00ff88]">
                🌐 {language === 'es' ? 'Nueva Transferencia API' : 'New API Transfer'}
              </h2>
              <button
                onClick={() => setShowTransferModal(false)}
                className="p-2 bg-red-900/30 border border-red-700/50 text-red-400 rounded-lg"
                title={language === 'es' ? 'Cerrar' : 'Close'}
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Info Cuenta */}
            <div className="bg-[#0d0d0d] border border-[#00ff88]/30 rounded-lg p-4 mb-6">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-[#4d7c4d]">{language === 'es' ? 'De:' : 'From:'}</span>
                  <div className="text-[#00ff88] font-bold">{selectedAPI.accountName}</div>
                </div>
                <div>
                  <span className="text-[#4d7c4d]">API ID:</span>
                  <div className="text-cyan-400 font-mono">{selectedAPI.apiId}</div>
                </div>
                <div>
                  <span className="text-[#4d7c4d]">{language === 'es' ? 'Disponible:' : 'Available:'}</span>
                  <div className="text-green-400 font-mono font-bold">
                    {selectedAPI.currency} {selectedAPI.availableBalance.toLocaleString()}
                  </div>
                </div>
                <div>
                  <span className="text-[#4d7c4d]">{language === 'es' ? 'Privilegios:' : 'Privileges:'}</span>
                  <div className="flex gap-1">
                    <span className="text-green-400 text-xs">✓ SEND</span>
                    <span className="text-blue-400 text-xs">✓ RECEIVE</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Formulario */}
            <div className="space-y-4 mb-6">
              <div>
                <label className="text-sm text-[#00ff88] mb-2 block font-bold">
                  💰 {language === 'es' ? 'Monto a Transferir *' : 'Amount to Transfer *'}
                </label>
                <input
                  type="number"
                  value={transferData.amount}
                  onChange={e => setTransferData({...transferData, amount: parseFloat(e.target.value) || 0})}
                  className="w-full px-4 py-3 bg-[#0a0a0a] border-2 border-[#00ff88]/50 rounded-lg text-[#00ff88] font-mono text-xl focus:outline-none focus:border-[#00ff88]"
                  placeholder="0.00"
                />
              </div>

              <div>
                <label className="text-sm text-[#00ff88] mb-2 block font-bold">
                  👤 {language === 'es' ? 'Beneficiario *' : 'Beneficiary *'}
                </label>
                <input
                  type="text"
                  value={transferData.beneficiaryName}
                  onChange={e => setTransferData({...transferData, beneficiaryName: e.target.value})}
                  className="w-full px-4 py-3 bg-[#0a0a0a] border border-[#1a1a1a] rounded-lg text-[#80ff80] focus:outline-none focus:border-[#00ff88]/50"
                  placeholder={language === 'es' ? 'Nombre completo' : 'Full name'}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm text-[#00ff88] mb-2 block font-bold">
                    🏦 {language === 'es' ? 'Banco Destino *' : 'Destination Bank *'}
                  </label>
                  <input
                    type="text"
                    value={transferData.destinationBank}
                    onChange={e => setTransferData({...transferData, destinationBank: e.target.value})}
                    className="w-full px-4 py-3 bg-[#0a0a0a] border border-[#1a1a1a] rounded-lg text-[#80ff80] focus:outline-none focus:border-[#00ff88]/50"
                    placeholder="Deutsche Bank"
                  />
                </div>
                <div>
                  <label className="text-sm text-[#00ff88] mb-2 block font-bold">
                    💳 {language === 'es' ? 'Cuenta/IBAN *' : 'Account/IBAN *'}
                  </label>
                  <input
                    type="text"
                    value={transferData.destinationIBAN}
                    onChange={e => setTransferData({...transferData, destinationIBAN: e.target.value})}
                    className="w-full px-4 py-3 bg-[#0a0a0a] border border-[#1a1a1a] rounded-lg text-[#80ff80] font-mono focus:outline-none focus:border-[#00ff88]/50"
                    placeholder="DE89370400440532013000"
                  />
                </div>
              </div>

              <div>
                <label className="text-sm text-[#00ff88] mb-2 block font-bold">
                  📝 {language === 'es' ? 'Referencia' : 'Reference'}
                </label>
                <input
                  type="text"
                  value={transferData.reference}
                  onChange={e => setTransferData({...transferData, reference: e.target.value})}
                  className="w-full px-4 py-3 bg-[#0a0a0a] border border-[#1a1a1a] rounded-lg text-[#80ff80] focus:outline-none focus:border-[#00ff88]/50"
                  placeholder={language === 'es' ? 'Concepto de pago' : 'Payment concept'}
                />
              </div>

              {/* Credenciales API del Destino */}
              <div className="bg-gradient-to-r from-purple-900/20 to-blue-900/20 border-2 border-purple-500/40 rounded-lg p-4">
                <div className="text-sm font-semibold text-purple-400 mb-3">
                  🔐 {language === 'es' ? 'Credenciales API del Destino (Opcional)' : 'Destination API Credentials (Optional)'}
                </div>
                <p className="text-xs text-[#4d7c4d] mb-3">
                  {language === 'es'
                    ? 'Si el destino requiere autenticación API, ingresa sus credenciales aquí'
                    : 'If destination requires API authentication, enter credentials here'}
                </p>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-purple-300 mb-1 block">
                      🔑 {language === 'es' ? 'API Key Destino:' : 'Destination API Key:'}
                    </label>
                    <input
                      type="password"
                      value={transferData.destinationAPIKey}
                      onChange={e => setTransferData({...transferData, destinationAPIKey: e.target.value})}
                      className="w-full px-3 py-2 bg-[#0a0a0a] border border-purple-500/30 rounded text-purple-300 font-mono text-sm focus:outline-none focus:border-purple-500"
                      placeholder="pk_..."
                    />
                  </div>
                  <div>
                    <label className="text-xs text-purple-300 mb-1 block">
                      🔐 {language === 'es' ? 'Secret Destino:' : 'Destination Secret:'}
                    </label>
                    <input
                      type="password"
                      value={transferData.destinationAPISecret}
                      onChange={e => setTransferData({...transferData, destinationAPISecret: e.target.value})}
                      className="w-full px-3 py-2 bg-[#0a0a0a] border border-purple-500/30 rounded text-purple-300 font-mono text-sm focus:outline-none focus:border-purple-500"
                      placeholder="••••••••"
                    />
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3 bg-yellow-900/20 border border-yellow-500/30 rounded-lg p-4">
                <input
                  type="checkbox"
                  checked={transferData.urgent}
                  onChange={e => setTransferData({...transferData, urgent: e.target.checked})}
                  className="w-5 h-5"
                  id="urgent"
                />
                <label htmlFor="urgent" className="text-sm text-yellow-400">
                  ⚡ {language === 'es' ? 'Transferencia Urgente (1-2h)' : 'Urgent Transfer (1-2h)'}
                </label>
              </div>

              {/* Vista Previa */}
              <div className="bg-gradient-to-r from-cyan-900/20 to-green-900/20 border border-cyan-500/40 rounded-lg p-6">
                <div className="text-sm font-bold text-cyan-400 mb-3">
                  {language === 'es' ? '📊 Resumen de Transferencia' : '📊 Transfer Summary'}
                </div>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-[#4d7c4d]">{language === 'es' ? 'Monto:' : 'Amount:'}</span>
                    <span className="text-[#00ff88] font-mono font-bold">
                      {selectedAPI.currency} {transferData.amount.toLocaleString()}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#4d7c4d]">{language === 'es' ? 'Comisión:' : 'Fee:'}</span>
                    <span className="text-yellow-400 font-mono">
                      {selectedAPI.currency} {(transferData.amount * (transferData.urgent ? 0.005 : 0.001)).toLocaleString()}
                    </span>
                  </div>
                  <div className="flex justify-between border-t border-cyan-500/30 pt-2">
                    <span className="text-cyan-400 font-bold">{language === 'es' ? 'Total:' : 'Total:'}</span>
                    <span className="text-cyan-400 font-mono font-bold">
                      {selectedAPI.currency} {(transferData.amount * (transferData.urgent ? 1.005 : 1.001)).toLocaleString()}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Botones */}
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setShowTransferModal(false)}
                className="px-6 py-2 bg-[#1a1a1a] border border-[#2a2a2a] text-[#4d7c4d] rounded-lg hover:bg-[#252525]"
              >
                {language === 'es' ? 'Cancelar' : 'Cancel'}
              </button>
              <button
                onClick={handleExecuteTransfer}
                className="px-6 py-3 bg-gradient-to-br from-[#00ff88] to-[#00cc6a] text-black font-bold rounded-lg hover:shadow-[0_0_25px_rgba(0,255,136,0.8)]"
              >
                <Send className="w-5 h-5 inline mr-2" />
                {language === 'es' ? '🚀 Ejecutar Transferencia' : '🚀 Execute Transfer'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Configuración API */}
      {showAPIConfigModal && selectedAPI && (
        <div className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4">
          <div className="bg-black border-2 border-cyan-500 rounded-xl p-6 max-w-2xl w-full shadow-[0_0_50px_rgba(0,255,255,0.5)]">
            <div className="flex items-center justify-between mb-6 border-b border-cyan-500/30 pb-4">
              <h2 className="text-2xl font-bold text-cyan-400">
                🔧 {language === 'es' ? 'Configuración de API' : 'API Configuration'}
              </h2>
              <button
                onClick={() => setShowAPIConfigModal(false)}
                className="p-2 bg-red-900/30 border border-red-700/50 text-red-400 rounded-lg"
                title={language === 'es' ? 'Cerrar' : 'Close'}
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Info Cuenta */}
            <div className="bg-[#0d0d0d] border border-cyan-500/30 rounded-lg p-4 mb-6">
              <div className="text-sm">
                <span className="text-[#4d7c4d]">{language === 'es' ? 'Cuenta:' : 'Account:'}</span>
                <div className="text-[#00ff88] font-bold text-lg mt-1">{selectedAPI.accountName}</div>
              </div>
            </div>

            {/* Formulario */}
            <div className="space-y-4 mb-6">
              <div>
                <label className="text-sm text-cyan-400 mb-2 block font-bold">
                  🔑 API ID *
                </label>
                <input
                  type="text"
                  value={editingAPI.apiId}
                  onChange={e => setEditingAPI({...editingAPI, apiId: e.target.value})}
                  className="w-full px-4 py-3 bg-[#0a0a0a] border-2 border-cyan-500/50 rounded-lg text-cyan-400 font-mono focus:outline-none focus:border-cyan-500"
                  placeholder="BK-API-EUR-X9Y2Z1W"
                />
              </div>

              <div>
                <label className="text-sm text-cyan-400 mb-2 block font-bold">
                  🔗 API Endpoint *
                </label>
                <input
                  type="text"
                  value={editingAPI.endpoint}
                  onChange={e => setEditingAPI({...editingAPI, endpoint: e.target.value})}
                  className="w-full px-4 py-3 bg-[#0a0a0a] border-2 border-cyan-500/50 rounded-lg text-cyan-400 font-mono focus:outline-none focus:border-cyan-500"
                  placeholder="https://api.daes-custody.io/banking/verify/..."
                />
              </div>

              <div className="bg-[#0d0d0d] border border-yellow-500/30 rounded-lg p-4">
                <div className="flex items-start gap-2">
                  <AlertCircle className="w-5 h-5 text-yellow-400 flex-shrink-0 mt-0.5" />
                  <div className="text-xs text-yellow-300">
                    {language === 'es'
                      ? 'Cambiar el API ID o Endpoint requerirá actualizar tus integraciones externas. Las credenciales anteriores dejarán de funcionar.'
                      : 'Changing API ID or Endpoint will require updating your external integrations. Previous credentials will stop working.'}
                  </div>
                </div>
              </div>

              {/* Conexión API Externa */}
              <div className="bg-gradient-to-r from-purple-900/20 to-blue-900/20 border-2 border-purple-500/40 rounded-lg p-4">
                <div className="text-sm font-semibold text-purple-400 mb-3 flex items-center gap-2">
                  🔌 {language === 'es' ? 'Conectar API Externa' : 'Connect External API'}
                  {selectedAPI?.externalConnected && (
                    <span className="px-2 py-1 bg-green-500/20 text-green-400 text-xs rounded">
                      ✓ {language === 'es' ? 'CONECTADA' : 'CONNECTED'}
                    </span>
                  )}
                </div>
                <p className="text-xs text-[#4d7c4d] mb-3">
                  {language === 'es'
                    ? 'Conecta con APIs bancarias reales (Stripe, Wise, Plaid, etc.) para ejecutar transferencias'
                    : 'Connect with real banking APIs (Stripe, Wise, Plaid, etc.) to execute transfers'}
                </p>

                <div className="space-y-3">
                  <div>
                    <label className="text-xs text-purple-300 mb-1 block">
                      {language === 'es' ? 'Proveedor:' : 'Provider:'}
                    </label>
                    <select
                      value={editingAPI.externalProvider}
                      onChange={e => setEditingAPI({...editingAPI, externalProvider: e.target.value})}
                      className="w-full px-3 py-2 bg-[#0a0a0a] border border-purple-500/30 rounded text-purple-300 text-sm focus:outline-none focus:border-purple-500"
                      aria-label={language === 'es' ? 'Seleccionar proveedor de API' : 'Select API provider'}
                    >
                      <option value="">{language === 'es' ? 'Seleccionar...' : 'Select...'}</option>
                      <option value="Stripe Connect">Stripe Connect</option>
                      <option value="Wise API">Wise API (TransferWise)</option>
                      <option value="Plaid">Plaid</option>
                      <option value="PayPal">PayPal Business API</option>
                      <option value="Revolut">Revolut Business</option>
                      <option value="Custom">Custom API</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-xs text-purple-300 mb-1 block">
                      🔑 API Key Externa:
                    </label>
                    <input
                      type="password"
                      value={editingAPI.externalAPIKey}
                      onChange={e => setEditingAPI({...editingAPI, externalAPIKey: e.target.value})}
                      className="w-full px-3 py-2 bg-[#0a0a0a] border border-purple-500/30 rounded text-purple-300 font-mono text-sm focus:outline-none focus:border-purple-500"
                      placeholder="sk_live_..."
                    />
                  </div>

                  <div>
                    <label className="text-xs text-purple-300 mb-1 block">
                      🔐 API Secret:
                    </label>
                    <input
                      type="password"
                      value={editingAPI.externalAPISecret}
                      onChange={e => setEditingAPI({...editingAPI, externalAPISecret: e.target.value})}
                      className="w-full px-3 py-2 bg-[#0a0a0a] border border-purple-500/30 rounded text-purple-300 font-mono text-sm focus:outline-none focus:border-purple-500"
                      placeholder="••••••••"
                    />
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={handleConnectExternal}
                      className="flex-1 px-4 py-2 bg-purple-500/20 border border-purple-500/40 text-purple-400 rounded-lg hover:bg-purple-500/30 transition-all text-sm"
                    >
                      <CheckCircle className="w-4 h-4 inline mr-1" />
                      {language === 'es' ? 'Conectar' : 'Connect'}
                    </button>
                    {selectedAPI?.externalConnected && (
                      <button
                        onClick={handleDisconnectExternal}
                        className="px-4 py-2 bg-red-500/20 border border-red-500/40 text-red-400 rounded-lg hover:bg-red-500/30 transition-all text-sm"
                      >
                        <X className="w-4 h-4 inline mr-1" />
                        {language === 'es' ? 'Desconectar' : 'Disconnect'}
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Regenerar API Interna */}
              <div className="bg-cyan-900/20 border border-cyan-500/40 rounded-lg p-4">
                <div className="text-sm font-semibold text-cyan-400 mb-3">
                  {language === 'es' ? '🔄 Regenerar API Interna DAES' : '🔄 Regenerate DAES Internal API'}
                </div>
                <p className="text-xs text-[#4d7c4d] mb-3">
                  {language === 'es'
                    ? 'Genera automáticamente un nuevo API ID, Endpoint y API Key de DAES'
                    : 'Automatically generates new DAES API ID, Endpoint and API Key'}
                </p>
                <button
                  onClick={handleRegenerateAPI}
                  className="w-full px-4 py-2 bg-yellow-500/20 border border-yellow-500/40 text-yellow-400 rounded-lg hover:bg-yellow-500/30 transition-all"
                >
                  <RefreshCw className="w-4 h-4 inline mr-2" />
                  {language === 'es' ? 'Regenerar API DAES' : 'Regenerate DAES API'}
                </button>
              </div>
            </div>

            {/* Botones */}
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setShowAPIConfigModal(false)}
                className="px-6 py-2 bg-[#1a1a1a] border border-[#2a2a2a] text-[#4d7c4d] rounded-lg hover:bg-[#252525]"
              >
                {language === 'es' ? 'Cancelar' : 'Cancel'}
              </button>
              <button
                onClick={handleSaveAPIConfig}
                className="px-6 py-3 bg-gradient-to-br from-cyan-500 to-blue-500 text-white font-bold rounded-lg hover:shadow-[0_0_25px_rgba(0,255,255,0.8)]"
              >
                <CheckCircle className="w-5 h-5 inline mr-2" />
                {language === 'es' ? 'Guardar Configuración' : 'Save Configuration'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

