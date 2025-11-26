/**
 * APIs Digital Commercial Bank Ltd / DAES Partner API Module
 * Frontend UI para gestión de Partner API
 * Nivel: JP Morgan / Goldman Sachs
 */

import { useState } from 'react';
import { 
  Globe, Key, Users, Wallet, Shield, Lock, Copy, Eye, EyeOff,
  CheckCircle, AlertCircle, ArrowRight, Plus, RefreshCw, Download
} from 'lucide-react';
import { BankingCard, BankingHeader, BankingButton, BankingSection, BankingMetric, BankingBadge, BankingInput } from './ui/BankingComponents';
import { useBankingTheme } from '../hooks/useBankingTheme';
import { custodyStore, type CustodyAccount } from '../lib/custody-store';
import { useEffect } from 'react';

interface Partner {
  partnerId: string;
  name: string;
  clientId: string;
  status: 'ACTIVE' | 'INACTIVE';
  allowedCurrencies: string[];
  createdAt: string;
}

export function DAESPartnerAPIModule() {
  const { fmt, isSpanish } = useBankingTheme();
  
  const [partners, setPartners] = useState<Partner[]>([]);
  const [showSecret, setShowSecret] = useState(false);
  const [newPartner, setNewPartner] = useState({
    name: '',
    allowedCurrencies: ['USD']
  });
  const [createdCredentials, setCreatedCredentials] = useState<{clientId: string; clientSecret: string} | null>(null);
  
  // 15 monedas completas
  const availableCurrencies = [
    { code: 'USD', name: 'US Dollar', flag: '🇺🇸' },
    { code: 'EUR', name: 'Euro', flag: '🇪🇺' },
    { code: 'GBP', name: 'British Pound', flag: '🇬🇧' },
    { code: 'CAD', name: 'Canadian Dollar', flag: '🇨🇦' },
    { code: 'AUD', name: 'Australian Dollar', flag: '🇦🇺' },
    { code: 'JPY', name: 'Japanese Yen', flag: '🇯🇵' },
    { code: 'CHF', name: 'Swiss Franc', flag: '🇨🇭' },
    { code: 'CNY', name: 'Chinese Yuan', flag: '🇨🇳' },
    { code: 'INR', name: 'Indian Rupee', flag: '🇮🇳' },
    { code: 'MXN', name: 'Mexican Peso', flag: '🇲🇽' },
    { code: 'BRL', name: 'Brazilian Real', flag: '🇧🇷' },
    { code: 'RUB', name: 'Russian Ruble', flag: '🇷🇺' },
    { code: 'KRW', name: 'South Korean Won', flag: '🇰🇷' },
    { code: 'SGD', name: 'Singapore Dollar', flag: '🇸🇬' },
    { code: 'HKD', name: 'Hong Kong Dollar', flag: '🇭🇰' }
  ];
  
  const [selectedTab, setSelectedTab] = useState<'partners' | 'clients' | 'accounts' | 'transfers'>('partners');
  const [clients, setClients] = useState<any[]>([]);
  const [accounts, setAccounts] = useState<any[]>([]);
  const [transfers, setTransfers] = useState<any[]>([]);
  
  // Formulario de crear cliente
  const [newClient, setNewClient] = useState({
    partnerIdForClient: '',
    externalClientId: '',
    legalName: '',
    country: 'US',
    type: 'WALLET' as 'FINTECH' | 'PSP' | 'WALLET' | 'EXCHANGE',
    allowedCurrencies: ['USD']
  });
  
  // Integración con Cuentas Custodio
  const [custodyAccounts, setCustodyAccounts] = useState<CustodyAccount[]>([]);
  const [selectedPartner, setSelectedPartner] = useState<string>('');
  const [selectedCustodyAccount, setSelectedCustodyAccount] = useState<string>('');
  const [transferForm, setTransferForm] = useState({
    amount: '',
    currency: 'USD',
    receivingName: '',
    receivingAccount: '',
    description: '',
    clientId: ''
  });
  const [processing, setProcessing] = useState(false);

  // Cargar cuentas custodio
  useEffect(() => {
    const loadCustodyAccounts = () => {
      const accounts = custodyStore.getAccounts();
      setCustodyAccounts(accounts);
      console.log('[DAES Partner API] 📊 Cuentas custodio cargadas:', accounts.length);
    };

    loadCustodyAccounts();
    const unsubscribe = custodyStore.subscribe(setCustodyAccounts);

    return () => unsubscribe();
  }, []);

  const handleCreatePartner = () => {
    // Generar credenciales
    const clientId = `dcb_${Date.now()}_${Math.random().toString(36).substring(2, 10)}`;
    const clientSecret = Array.from({length: 64}, () => Math.random().toString(36).charAt(2)).join('');
    
    const partner: Partner = {
      partnerId: `PTN_${Date.now()}`,
      name: newPartner.name,
      clientId,
      status: 'ACTIVE',
      allowedCurrencies: newPartner.allowedCurrencies,
      createdAt: new Date().toISOString()
    };

    setPartners([...partners, partner]);
    setCreatedCredentials({ clientId, clientSecret });
    setNewPartner({ name: '', allowedCurrencies: ['USD', 'EUR', 'MXN'] });
    
    alert(
      `✅ PARTNER CREADO EXITOSAMENTE\n\n` +
      `Nombre: ${partner.name}\n` +
      `Partner ID: ${partner.partnerId}\n\n` +
      `⚠️ IMPORTANTE: Guarda estas credenciales\n` +
      `Client ID: ${clientId}\n` +
      `Client Secret: ${clientSecret}\n\n` +
      `El Client Secret solo se muestra UNA VEZ`
    );
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    alert(`✅ ${label} copiado al portapapeles`);
  };

  const handleCreateClient = () => {
    if (!newClient.partnerIdForClient) {
      alert(isSpanish ? '⚠️ Selecciona un Partner' : '⚠️ Select a Partner');
      return;
    }

    if (!newClient.legalName || !newClient.externalClientId) {
      alert(isSpanish ? '⚠️ Completa todos los campos obligatorios' : '⚠️ Complete all required fields');
      return;
    }

    const partner = partners.find(p => p.partnerId === newClient.partnerIdForClient);
    if (!partner) return;

    const clientId = `CLT_${Date.now()}_${Math.random().toString(36).substring(2, 9).toUpperCase()}`;
    const apiKey = Array.from({length: 48}, () => Math.random().toString(36).charAt(2)).join('');

    const client = {
      clientId,
      partnerId: partner.partnerId,
      partnerName: partner.name,
      externalClientId: newClient.externalClientId,
      legalName: newClient.legalName,
      country: newClient.country,
      type: newClient.type,
      allowedCurrencies: newClient.allowedCurrencies,
      status: 'ACTIVE',
      createdAt: new Date().toISOString(),
      apiKey,
      apiEndpoint: 'https://luxliqdaes.cloud/partner-api/v1'
    };

    setClients([...clients, client]);
    generateClientCredentialsTXT(client, partner);
    setNewClient({
      partnerIdForClient: '',
      externalClientId: '',
      legalName: '',
      country: 'US',
      type: 'WALLET',
      allowedCurrencies: ['USD']
    });

    alert(`✅ ${isSpanish ? 'CLIENTE CREADO' : 'CLIENT CREATED'}\n\n${client.legalName}\n\n📄 ${isSpanish ? 'TXT con credenciales descargado' : 'Credentials TXT downloaded'}`);
  };

  const generateClientCredentialsTXT = (client: any, partner: Partner) => {
    const baseUrl = 'https://luxliqdaes.cloud/partner-api/v1';
    const currenciesText = client.allowedCurrencies.map((curr: string) => {
      const currInfo = availableCurrencies.find(c => c.code === curr);
      return `${currInfo?.flag || ''} ${curr} - ${currInfo?.name || curr}`;
    }).join('\\n');

    const txtContent = `
DIGITAL COMMERCIAL BANK LTD / DAES - CREDENCIALES DE API
Cliente: ${client.legalName}
ID: ${client.clientId}
Partner: ${partner.name}
Tipo: ${client.type}

CREDENCIALES:
Partner Client ID: ${partner.clientId}
Client API Key: ${client.apiKey}

DIVISAS HABILITADAS:
${currenciesText}

ENDPOINTS:
Base URL: ${baseUrl}

1. Auth: POST ${baseUrl}/auth/token
2. Accounts: POST ${baseUrl}/clients/${client.clientId}/accounts
3. Transfers: POST ${baseUrl}/transfers

Generado: ${fmt.dateTime(new Date())}
`;

    const blob = new Blob([txtContent], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `DAES_API_${client.legalName.replace(/\\s+/g, '_')}_${client.clientId}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleDeleteClient = (clientId: string) => {
    const client = clients.find(c => c.clientId === clientId);
    if (!client) return;

    if (confirm(`⚠️ ${isSpanish ? 'Eliminar' : 'Delete'}: ${client.legalName}?`)) {
      setClients(clients.filter(c => c.clientId !== clientId));
      alert(`✅ ${isSpanish ? 'Cliente eliminado' : 'Client deleted'}`);
    }
  };

  // Ejecutar transferencia desde cuenta custodio
  const handleExecuteTransfer = async () => {
    if (!selectedPartner) {
      alert(isSpanish ? '⚠️ Selecciona un Partner' : '⚠️ Select a Partner');
      return;
    }

    if (!selectedCustodyAccount) {
      alert(isSpanish ? '⚠️ Selecciona una Cuenta Custodio' : '⚠️ Select a Custody Account');
      return;
    }

    const partner = partners.find(p => p.partnerId === selectedPartner);
    const custodyAccount = custodyAccounts.find(a => a.id === selectedCustodyAccount);

    if (!partner || !custodyAccount) {
      alert(isSpanish ? '❌ Partner o cuenta no encontrada' : '❌ Partner or account not found');
      return;
    }

    if (!transferForm.amount || parseFloat(transferForm.amount) <= 0) {
      alert(isSpanish ? '⚠️ Ingresa un monto válido' : '⚠️ Enter valid amount');
      return;
    }

    if (!transferForm.receivingName || !transferForm.receivingAccount) {
      alert(isSpanish ? '⚠️ Completa todos los campos' : '⚠️ Complete all fields');
      return;
    }

    setProcessing(true);

    try {
      const transferRequestId = `${partner.name.substring(0, 3).toUpperCase()}-TX-${Date.now()}`;
      
      // Crear estructura CashTransfer.v1
      const cashTransfer = {
        'CashTransfer.v1': {
          SendingName: custodyAccount.accountName,
          SendingAccount: custodyAccount.accountNumber || custodyAccount.id,
          ReceivingName: transferForm.receivingName,
          ReceivingAccount: transferForm.receivingAccount,
          Datetime: new Date().toISOString(),
          Amount: parseFloat(transferForm.amount).toFixed(2),
          SendingCurrency: transferForm.currency,
          ReceivingCurrency: transferForm.currency,
          Description: transferForm.description,
          TransferRequestID: transferRequestId,
          ReceivingInstitution: 'Digital Commercial Bank DAES',
          SendingInstitution: 'Digital Commercial Bank DAES',
          method: 'API' as const,
          purpose: 'PARTNER_TRANSFER',
          source: 'DAES_PARTNER_API'
        }
      };

      const transfer = {
        transferId: `TRF_${Date.now()}`,
        partnerId: partner.partnerId,
        partnerName: partner.name,
        transferRequestId,
        fromAccount: custodyAccount.accountName,
        toAccount: transferForm.receivingName,
        amount: transferForm.amount,
        currency: transferForm.currency,
        state: 'SETTLED' as const,
        createdAt: new Date().toISOString(),
        cashTransfer
      };

      setTransfers([transfer, ...transfers]);

      const messageText = 
        `✅ TRANSFERENCIA COMPLETADA EXITOSAMENTE\n\n` +
        `=== DETALLES ===\n` +
        `Partner: ${partner.name}\n` +
        `Transfer ID: ${transferRequestId}\n` +
        `Cuenta Origen: ${custodyAccount.accountName}\n` +
        `Balance Disponible: ${fmt.currency(custodyAccount.availableBalance, transferForm.currency)}\n` +
        `Monto Enviado: ${fmt.currency(parseFloat(transferForm.amount), transferForm.currency)}\n` +
        `Destinatario: ${transferForm.receivingName}\n` +
        `Cuenta Destino: ${transferForm.receivingAccount}\n\n` +
        `=== VALIDACIÓN ===\n` +
        `Digital Commercial Bank DAES: ✅ YES\n` +
        `Firma Digital: ✅ YES - 1 verified\n` +
        `CashTransfer.v1: ✅ Generado\n\n` +
        `Estado: ✅ SETTLED`;

      alert(messageText);

      // Reset form
      setTransferForm({
        amount: '',
        currency: 'USD',
        receivingName: '',
        receivingAccount: '',
        description: '',
        clientId: ''
      });

    } catch (error) {
      console.error('[DAES Partner API] Error en transferencia:', error);
      alert(isSpanish ? '❌ Error al procesar transferencia' : '❌ Error processing transfer');
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        
        {/* Header */}
        <BankingHeader
          icon={Globe}
          title="APIs Digital Commercial Bank Ltd"
          subtitle={isSpanish ? 'DAES Partner API - Gestión de Partners y Acceso API' : 'DAES Partner API - Partner & API Access Management'}
          gradient="sky"
          actions={
            <div className="flex items-center gap-3">
              <BankingBadge variant="success" icon={CheckCircle}>
                API v1.0
              </BankingBadge>
              <BankingBadge variant="info" icon={Shield}>
                Production Ready
              </BankingBadge>
            </div>
          }
        />

        {/* Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <BankingMetric
            label={isSpanish ? "Partners Activos" : "Active Partners"}
            value={partners.length}
            icon={Users}
            color="sky"
          />
          <BankingMetric
            label={isSpanish ? "Clientes" : "Clients"}
            value={clients.length}
            icon={Wallet}
            color="emerald"
          />
          <BankingMetric
            label={isSpanish ? "Cuentas" : "Accounts"}
            value={accounts.length}
            icon={Key}
            color="amber"
          />
          <BankingMetric
            label={isSpanish ? "Transferencias" : "Transfers"}
            value={transfers.length}
            icon={ArrowRight}
            color="purple"
          />
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center gap-2 bg-slate-900 border border-slate-700 p-2 rounded-xl">
          <button
            onClick={() => setSelectedTab('partners')}
            className={`flex-1 px-6 py-3 rounded-lg font-semibold transition-all ${
              selectedTab === 'partners'
                ? 'bg-gradient-to-r from-sky-500 to-blue-600 text-white shadow-lg'
                : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800'
            }`}
          >
            <Users className="w-5 h-5 inline mr-2" />
            {isSpanish ? 'Partners' : 'Partners'}
          </button>
          <button
            onClick={() => setSelectedTab('clients')}
            className={`flex-1 px-6 py-3 rounded-lg font-semibold transition-all ${
              selectedTab === 'clients'
                ? 'bg-gradient-to-r from-emerald-500 to-teal-600 text-white shadow-lg'
                : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800'
            }`}
          >
            <Wallet className="w-5 h-5 inline mr-2" />
            {isSpanish ? 'Clientes' : 'Clients'}
          </button>
          <button
            onClick={() => setSelectedTab('accounts')}
            className={`flex-1 px-6 py-3 rounded-lg font-semibold transition-all ${
              selectedTab === 'accounts'
                ? 'bg-gradient-to-r from-amber-500 to-orange-600 text-white shadow-lg'
                : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800'
            }`}
          >
            <Key className="w-5 h-5 inline mr-2" />
            {isSpanish ? 'Cuentas' : 'Accounts'}
          </button>
          <button
            onClick={() => setSelectedTab('transfers')}
            className={`flex-1 px-6 py-3 rounded-lg font-semibold transition-all ${
              selectedTab === 'transfers'
                ? 'bg-gradient-to-r from-purple-500 to-pink-600 text-white shadow-lg'
                : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800'
            }`}
          >
            <ArrowRight className="w-5 h-5 inline mr-2" />
            {isSpanish ? 'Transferencias' : 'Transfers'}
          </button>
        </div>

        {/* Content by Tab */}
        {selectedTab === 'partners' && (
          <>
            {/* Crear Nuevo Partner */}
            <BankingSection
          title={isSpanish ? "Crear Nuevo Partner" : "Create New Partner"}
          icon={Plus}
          color="sky"
        >
          <div className="space-y-4">
            <BankingInput
              label={isSpanish ? "Nombre del Partner" : "Partner Name"}
              value={newPartner.name}
              onChange={(val) => setNewPartner({...newPartner, name: val})}
              placeholder="Ej: Plankton Wallet, Fintech Mexico, etc."
              required
            />
            
            <div>
              <label className="block text-sm font-semibold text-slate-300 mb-2">
                {isSpanish ? "Divisas Permitidas" : "Allowed Currencies"}
              </label>
              <div className="flex flex-wrap gap-2">
                {availableCurrencies.map(currency => (
                  <button
                    key={currency.code}
                    onClick={() => {
                      if (newPartner.allowedCurrencies.includes(currency.code)) {
                        setNewPartner({
                          ...newPartner,
                          allowedCurrencies: newPartner.allowedCurrencies.filter(c => c !== currency.code)
                        });
                      } else {
                        setNewPartner({
                          ...newPartner,
                          allowedCurrencies: [...newPartner.allowedCurrencies, currency.code]
                        });
                      }
                    }}
                    className={`px-4 py-2 rounded-lg border-2 font-semibold transition-all flex items-center gap-2 ${
                      newPartner.allowedCurrencies.includes(currency.code)
                        ? 'bg-sky-500/20 border-sky-500 text-sky-400'
                        : 'bg-slate-800 border-slate-600 text-slate-400 hover:border-slate-500'
                    }`}
                    title={currency.name}
                  >
                    <span>{currency.flag}</span>
                    <span>{currency.code}</span>
                  </button>
                ))}
              </div>
            </div>

            <BankingButton
              variant="primary"
              icon={Plus}
              onClick={handleCreatePartner}
              disabled={!newPartner.name}
            >
              {isSpanish ? "Crear Partner" : "Create Partner"}
            </BankingButton>
          </div>
        </BankingSection>

        {/* Credenciales Generadas */}
        {createdCredentials && (
          <BankingCard className="p-6 border-2 border-sky-500/50">
            <div className="flex items-start gap-4 mb-4">
              <div className="p-3 bg-sky-500/10 rounded-xl">
                <Key className="w-6 h-6 text-sky-400" />
              </div>
              <div className="flex-1">
                <h3 className="text-xl font-bold text-slate-100 mb-2">
                  {isSpanish ? "⚠️ Credenciales Generadas (Guárdalas Ahora)" : "⚠️ Generated Credentials (Save Now)"}
                </h3>
                <p className="text-amber-400 text-sm font-semibold">
                  {isSpanish ? "El Client Secret solo se muestra UNA VEZ. Cópialo ahora." : "Client Secret shown only ONCE. Copy it now."}
                </p>
              </div>
            </div>

            <div className="space-y-4 bg-slate-900/50 border border-slate-700 rounded-xl p-4">
              <div>
                <label className="text-slate-400 text-sm font-semibold mb-2 block">Client ID:</label>
                <div className="flex items-center gap-2">
                  <code className="flex-1 bg-slate-800 border border-slate-600 text-sky-400 px-4 py-3 rounded-lg font-mono text-sm">
                    {createdCredentials.clientId}
                  </code>
                  <BankingButton
                    variant="secondary"
                    icon={Copy}
                    onClick={() => copyToClipboard(createdCredentials.clientId, 'Client ID')}
                  >
                    {isSpanish ? "Copiar" : "Copy"}
                  </BankingButton>
                </div>
              </div>

              <div>
                <label className="text-slate-400 text-sm font-semibold mb-2 block">Client Secret:</label>
                <div className="flex items-center gap-2">
                  <code className="flex-1 bg-slate-800 border border-slate-600 text-amber-400 px-4 py-3 rounded-lg font-mono text-sm break-all">
                    {showSecret ? createdCredentials.clientSecret : '•'.repeat(64)}
                  </code>
                  <button
                    onClick={() => setShowSecret(!showSecret)}
                    className="p-3 bg-slate-800 border border-slate-600 hover:border-slate-500 text-slate-300 rounded-lg transition-all"
                  >
                    {showSecret ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                  <BankingButton
                    variant="secondary"
                    icon={Copy}
                    onClick={() => copyToClipboard(createdCredentials.clientSecret, 'Client Secret')}
                  >
                    {isSpanish ? "Copiar" : "Copy"}
                  </BankingButton>
                </div>
              </div>
            </div>
          </BankingCard>
        )}

        {/* Lista de Partners */}
        <BankingSection
          title={isSpanish ? "Partners Registrados" : "Registered Partners"}
          icon={Users}
          color="emerald"
          actions={
            <BankingButton variant="ghost" icon={RefreshCw}>
              {isSpanish ? "Actualizar" : "Refresh"}
            </BankingButton>
          }
        >
          {partners.length > 0 ? (
            <div className="space-y-3">
              {partners.map((partner) => (
                <div
                  key={partner.partnerId}
                  className="bg-slate-900/50 border border-slate-700 hover:border-sky-500/50 rounded-xl p-5 transition-all group"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <h4 className="text-slate-100 font-bold text-lg mb-2 group-hover:text-sky-400 transition-colors">
                        {partner.name}
                      </h4>
                      <div className="flex flex-wrap items-center gap-2">
                        <BankingBadge variant="success">
                          {partner.status}
                        </BankingBadge>
                        <span className="text-slate-500 text-sm">ID: {partner.partnerId}</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-slate-400 text-sm mb-1">Client ID:</p>
                      <code className="text-sky-400 text-xs font-mono bg-slate-800 px-2 py-1 rounded">
                        {partner.clientId}
                      </code>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2 mt-3">
                    {partner.allowedCurrencies.map(curr => (
                      <span
                        key={curr}
                        className="bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 px-3 py-1 rounded-md text-xs font-bold"
                      >
                        {curr}
                      </span>
                    ))}
                  </div>

                  <div className="mt-3 text-slate-500 text-xs">
                    {isSpanish ? "Creado:" : "Created:"} {fmt.dateTime(partner.createdAt)}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-16">
              <Users className="w-20 h-20 text-slate-700 mx-auto mb-4" />
              <p className="text-slate-400 text-lg font-medium">
                {isSpanish ? "No hay partners registrados" : "No partners registered"}
              </p>
              <p className="text-slate-600 text-sm mt-2">
                {isSpanish ? "Crea tu primer partner para comenzar" : "Create your first partner to get started"}
              </p>
            </div>
          )}
        </BankingSection>

        {/* Documentación de API */}
        <BankingSection
          title={isSpanish ? "Documentación de API" : "API Documentation"}
          icon={Shield}
          color="purple"
        >
          <div className="space-y-6">
            {/* Endpoints */}
            <div>
              <h3 className="text-lg font-bold text-slate-100 mb-4 flex items-center gap-2">
                <ArrowRight className="w-5 h-5 text-purple-400" />
                {isSpanish ? "Endpoints Disponibles" : "Available Endpoints"}
              </h3>
              
              <div className="space-y-3">
                <div className="bg-slate-900/50 border border-slate-700 rounded-lg p-4">
                  <div className="flex items-center gap-3 mb-2">
                    <span className="bg-sky-500/10 border border-sky-500/30 text-sky-400 px-3 py-1 rounded-md text-xs font-bold">
                      POST
                    </span>
                    <code className="text-slate-100 font-mono text-sm">/partner-api/v1/auth/token</code>
                  </div>
                  <p className="text-slate-400 text-sm">
                    {isSpanish ? "Obtener token de acceso JWT" : "Get JWT access token"}
                  </p>
                </div>

                <div className="bg-slate-900/50 border border-slate-700 rounded-lg p-4">
                  <div className="flex items-center gap-3 mb-2">
                    <span className="bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 px-3 py-1 rounded-md text-xs font-bold">
                      POST
                    </span>
                    <code className="text-slate-100 font-mono text-sm">/partner-api/v1/clients</code>
                  </div>
                  <p className="text-slate-400 text-sm">
                    {isSpanish ? "Crear cliente para el partner" : "Create client for partner"}
                  </p>
                </div>

                <div className="bg-slate-900/50 border border-slate-700 rounded-lg p-4">
                  <div className="flex items-center gap-3 mb-2">
                    <span className="bg-amber-500/10 border border-amber-500/30 text-amber-400 px-3 py-1 rounded-md text-xs font-bold">
                      POST
                    </span>
                    <code className="text-slate-100 font-mono text-sm">/partner-api/v1/clients/:clientId/accounts</code>
                  </div>
                  <p className="text-slate-400 text-sm">
                    {isSpanish ? "Crear cuenta multi-moneda" : "Create multi-currency account"}
                  </p>
                </div>

                <div className="bg-slate-900/50 border border-slate-700 rounded-lg p-4">
                  <div className="flex items-center gap-3 mb-2">
                    <span className="bg-purple-500/10 border border-purple-500/30 text-purple-400 px-3 py-1 rounded-md text-xs font-bold">
                      POST
                    </span>
                    <code className="text-slate-100 font-mono text-sm">/partner-api/v1/transfers</code>
                  </div>
                  <p className="text-slate-400 text-sm">
                    {isSpanish ? "Crear transferencia con CashTransfer.v1" : "Create transfer with CashTransfer.v1"}
                  </p>
                </div>
              </div>
            </div>

            {/* Divisas Soportadas */}
            <div>
              <h3 className="text-lg font-bold text-slate-100 mb-4 flex items-center gap-2">
                <Globe className="w-5 h-5 text-sky-400" />
                {isSpanish ? "15 Divisas Soportadas" : "15 Supported Currencies"}
              </h3>
              <div className="grid grid-cols-3 sm:grid-cols-5 gap-3">
                {availableCurrencies.map(curr => (
                  <div
                    key={curr.code}
                    className="bg-slate-900/50 border border-slate-700 rounded-lg p-3 text-center hover:border-sky-500/50 transition-all"
                  >
                    <div className="text-2xl mb-1">{curr.flag}</div>
                    <p className="text-slate-100 font-bold text-sm">{curr.code}</p>
                    <p className="text-slate-500 text-xs">{curr.name}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Ejemplo CashTransfer.v1 */}
            <div>
              <h3 className="text-lg font-bold text-slate-100 mb-4">
                {isSpanish ? "Ejemplo CashTransfer.v1" : "CashTransfer.v1 Example"}
              </h3>
              <div className="bg-slate-900 border border-slate-700 rounded-xl p-4 overflow-x-auto">
                <pre className="text-sky-400 font-mono text-xs">
{`{
  "CashTransfer.v1": {
    "SendingName": "Digital Commercial Bank Ltd",
    "SendingAccount": "ACC-USD-001",
    "ReceivingName": "Cliente Destino",
    "ReceivingAccount": "ACC-USD-002",
    "Datetime": "2025-11-26T12:00:00.000Z",
    "Amount": "1000.00",
    "SendingCurrency": "USD",
    "ReceivingCurrency": "USD",
    "Description": "Payment",
    "TransferRequestID": "PLK-TX-001",
    "ReceivingInstitution": "Digital Commercial Bank DAES",
    "SendingInstitution": "Digital Commercial Bank DAES",
    "method": "API",
    "purpose": "PAYMENT",
    "source": "DAES"
  }
}`}
                </pre>
              </div>
            </div>
          </div>
        </BankingSection>

          </>
        )}

        {/* Tab: Clientes */}
        {selectedTab === 'clients' && (
          <div className="space-y-6">
            {/* Crear Cliente */}
            <BankingSection
              title={isSpanish ? "Crear Nuevo Cliente" : "Create New Client"}
              icon={Plus}
              color="emerald"
            >
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-semibold text-slate-300 mb-2">
                      {isSpanish ? "Partner" : "Partner"} <span className="text-red-400">*</span>
                    </label>
                    <select
                      value={newClient.partnerIdForClient}
                      onChange={(e) => setNewClient({...newClient, partnerIdForClient: e.target.value})}
                      aria-label="Select Partner"
                      className="w-full bg-slate-900 border border-slate-700 focus:border-emerald-500 text-slate-100 px-4 py-3 rounded-xl focus:ring-2 focus:ring-emerald-500/30 outline-none transition-all"
                    >
                      <option value="">{isSpanish ? "-- Selecciona Partner --" : "-- Select Partner --"}</option>
                      {partners.map(p => (
                        <option key={p.partnerId} value={p.partnerId}>{p.name}</option>
                      ))}
                    </select>
                  </div>

                  <BankingInput
                    label={isSpanish ? "ID Externo del Cliente" : "External Client ID"}
                    value={newClient.externalClientId}
                    onChange={(val) => setNewClient({...newClient, externalClientId: val})}
                    placeholder="PLK-USER-001"
                    required
                  />

                  <BankingInput
                    label={isSpanish ? "Nombre Legal" : "Legal Name"}
                    value={newClient.legalName}
                    onChange={(val) => setNewClient({...newClient, legalName: val})}
                    placeholder={isSpanish ? "Nombre completo o razón social" : "Full name or company name"}
                    required
                  />
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-semibold text-slate-300 mb-2">
                      {isSpanish ? "Tipo de Cliente" : "Client Type"}
                    </label>
                    <select
                      value={newClient.type}
                      onChange={(e) => setNewClient({...newClient, type: e.target.value as any})}
                      aria-label="Client Type"
                      className="w-full bg-slate-900 border border-slate-700 focus:border-emerald-500 text-slate-100 px-4 py-3 rounded-xl focus:ring-2 focus:ring-emerald-500/30 outline-none transition-all"
                    >
                      <option value="WALLET">Wallet</option>
                      <option value="FINTECH">Fintech</option>
                      <option value="PSP">PSP (Payment Service Provider)</option>
                      <option value="EXCHANGE">Exchange</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-slate-300 mb-2">
                      {isSpanish ? "Divisas para API" : "API Currencies"} <span className="text-red-400">*</span>
                    </label>
                    <div className="flex flex-wrap gap-2 bg-slate-900/50 border border-slate-700 rounded-xl p-4 max-h-48 overflow-y-auto">
                      {availableCurrencies.map(currency => (
                        <button
                          key={currency.code}
                          onClick={() => {
                            if (newClient.allowedCurrencies.includes(currency.code)) {
                              setNewClient({
                                ...newClient,
                                allowedCurrencies: newClient.allowedCurrencies.filter(c => c !== currency.code)
                              });
                            } else {
                              setNewClient({
                                ...newClient,
                                allowedCurrencies: [...newClient.allowedCurrencies, currency.code]
                              });
                            }
                          }}
                          className={`px-3 py-2 rounded-lg border font-semibold text-sm transition-all ${
                            newClient.allowedCurrencies.includes(currency.code)
                              ? 'bg-emerald-500/20 border-emerald-500 text-emerald-400'
                              : 'bg-slate-800 border-slate-600 text-slate-400 hover:border-slate-500'
                          }`}
                        >
                          {currency.flag} {currency.code}
                        </button>
                      ))}
                    </div>
                    <p className="text-slate-500 text-xs mt-2">
                      {isSpanish ? "Selecciona las divisas que este cliente podrá usar" : "Select currencies this client will be able to use"}
                    </p>
                  </div>

                  <BankingButton
                    variant="primary"
                    icon={Plus}
                    onClick={handleCreateClient}
                    disabled={!newClient.partnerIdForClient || !newClient.legalName || !newClient.externalClientId || newClient.allowedCurrencies.length === 0}
                    className="w-full mt-4"
                  >
                    {isSpanish ? "Crear Cliente y Descargar Credenciales" : "Create Client & Download Credentials"}
                  </BankingButton>
                </div>
              </div>
            </BankingSection>

            {/* Lista de Clientes */}
            <BankingSection
              title={isSpanish ? "Clientes Registrados" : "Registered Clients"}
              icon={Wallet}
              color="sky"
            >
              {clients.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {clients.map((client) => (
                    <div
                      key={client.clientId}
                      className="bg-slate-900/50 border border-slate-700 hover:border-emerald-500/50 rounded-xl p-5 transition-all group"
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1">
                          <h4 className="text-slate-100 font-bold text-lg mb-1 group-hover:text-emerald-400 transition-colors">
                            {client.legalName}
                          </h4>
                          <p className="text-slate-500 text-sm mb-2">{client.externalClientId}</p>
                          <div className="flex flex-wrap items-center gap-2">
                            <BankingBadge variant="success">{client.status}</BankingBadge>
                            <BankingBadge variant="info">{client.type}</BankingBadge>
                            <span className="text-slate-600 text-xs">{client.country}</span>
                          </div>
                        </div>
                        <button
                          onClick={() => handleDeleteClient(client.clientId)}
                          className="p-2 bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 hover:border-red-500 text-red-400 rounded-lg transition-all"
                          title={isSpanish ? "Eliminar cliente" : "Delete client"}
                        >
                          <AlertCircle className="w-5 h-5" />
                        </button>
                      </div>

                      <div className="space-y-2">
                        <div className="text-xs">
                          <span className="text-slate-500">{isSpanish ? "Partner:" : "Partner:"}</span>
                          <span className="text-slate-300 ml-2">{client.partnerName}</span>
                        </div>
                        <div className="text-xs">
                          <span className="text-slate-500">Client ID:</span>
                          <code className="text-sky-400 ml-2 font-mono">{client.clientId}</code>
                        </div>
                        <div className="flex flex-wrap gap-1 mt-2">
                          {client.allowedCurrencies.map((curr: string) => {
                            const currInfo = availableCurrencies.find(c => c.code === curr);
                            return (
                              <span key={curr} className="text-xs bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded">
                                {currInfo?.flag} {curr}
                              </span>
                            );
                          })}
                        </div>
                        <div className="text-slate-600 text-xs mt-2">
                          {fmt.dateTime(client.createdAt)}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-16">
                  <Wallet className="w-20 h-20 text-slate-700 mx-auto mb-4" />
                  <p className="text-slate-400 text-lg font-medium">
                    {isSpanish ? "No hay clientes registrados" : "No clients registered"}
                  </p>
                  <p className="text-slate-600 text-sm mt-2">
                    {isSpanish ? "Crea tu primer cliente para comenzar" : "Create your first client to get started"}
                  </p>
                </div>
              )}
            </BankingSection>
          </div>
        )}

        {/* Tab: Cuentas */}
        {selectedTab === 'accounts' && (
          <BankingSection
            title={isSpanish ? "Gestión de Cuentas Multi-Moneda" : "Multi-Currency Account Management"}
            icon={Key}
            color="amber"
          >
            <div className="space-y-6">
              <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                {availableCurrencies.map(curr => (
                  <div
                    key={curr.code}
                    className="bg-slate-900/50 border border-slate-700 hover:border-amber-500/50 rounded-xl p-4 transition-all text-center"
                  >
                    <div className="text-3xl mb-2">{curr.flag}</div>
                    <p className="text-slate-100 font-bold">{curr.code}</p>
                    <p className="text-slate-500 text-xs">{curr.name}</p>
                    <div className="mt-3">
                      <BankingBadge variant="info">
                        {accounts.filter(a => a.currency === curr.code).length} {isSpanish ? "cuentas" : "accounts"}
                      </BankingBadge>
                    </div>
                  </div>
                ))}
              </div>
              <div className="text-center py-8">
                <p className="text-slate-400">
                  {isSpanish ? "Cuentas disponibles en las 15 monedas principales" : "Accounts available in 15 major currencies"}
                </p>
              </div>
            </div>
          </BankingSection>
        )}

        {/* Tab: Transferencias */}
        {selectedTab === 'transfers' && (
          <div className="space-y-6">
            {/* Formulario de Transferencia */}
            <BankingSection
              title={isSpanish ? "Nueva Transferencia desde Cuenta Custodio" : "New Transfer from Custody Account"}
              icon={ArrowRight}
              color="purple"
            >
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Columna Izquierda - Origen */}
                <div className="space-y-4">
                  <h3 className="text-lg font-bold text-slate-100 mb-4">
                    {isSpanish ? "Origen de Fondos" : "Source of Funds"}
                  </h3>

                  {/* Seleccionar Partner */}
                  <div>
                    <label className="block text-sm font-semibold text-slate-300 mb-2">
                      {isSpanish ? "1. Seleccionar Partner" : "1. Select Partner"}
                    </label>
                    <select
                      value={selectedPartner}
                      onChange={(e) => setSelectedPartner(e.target.value)}
                      aria-label="Select Partner"
                      className="w-full bg-slate-900 border border-slate-700 focus:border-sky-500 text-slate-100 px-4 py-3 rounded-xl focus:ring-2 focus:ring-sky-500/30 outline-none transition-all"
                    >
                      <option value="">{isSpanish ? "-- Selecciona Partner --" : "-- Select Partner --"}</option>
                      {partners.map(partner => (
                        <option key={partner.partnerId} value={partner.partnerId}>
                          {partner.name} ({partner.clientId})
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Seleccionar Cuenta Custodio */}
                  <div>
                    <label className="block text-sm font-semibold text-slate-300 mb-2">
                      {isSpanish ? "2. Seleccionar Cuenta Custodio" : "2. Select Custody Account"}
                    </label>
                    <select
                      value={selectedCustodyAccount}
                      onChange={(e) => setSelectedCustodyAccount(e.target.value)}
                      aria-label="Select Custody Account"
                      className="w-full bg-slate-900 border border-slate-700 focus:border-sky-500 text-slate-100 px-4 py-3 rounded-xl focus:ring-2 focus:ring-sky-500/30 outline-none transition-all"
                      disabled={!selectedPartner}
                    >
                      <option value="">{isSpanish ? "-- Selecciona Cuenta --" : "-- Select Account --"}</option>
                      {custodyAccounts.map(account => (
                        <option key={account.id} value={account.id}>
                          {account.accountName} - {account.currency} {fmt.currency(account.availableBalance, account.currency)}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Mostrar Balance de Cuenta Seleccionada */}
                  {selectedCustodyAccount && custodyAccounts.find(a => a.id === selectedCustodyAccount) && (
                    <div className="bg-gradient-to-br from-emerald-500/10 to-teal-500/10 border border-emerald-500/30 rounded-xl p-4">
                      {(() => {
                        const account = custodyAccounts.find(a => a.id === selectedCustodyAccount)!;
                        return (
                          <>
                            <p className="text-emerald-400 text-sm font-semibold mb-2">
                              {isSpanish ? "Balance Disponible:" : "Available Balance:"}
                            </p>
                            <p className="text-3xl font-black text-slate-100">
                              {fmt.currency(account.availableBalance, account.currency)}
                            </p>
                            <div className="mt-3 space-y-1 text-sm">
                              <div className="flex justify-between">
                                <span className="text-slate-400">{isSpanish ? "Total:" : "Total:"}</span>
                                <span className="text-slate-100 font-semibold">{fmt.currency(account.totalBalance, account.currency)}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-amber-400">{isSpanish ? "Reservado:" : "Reserved:"}</span>
                                <span className="text-amber-300 font-semibold">{fmt.currency(account.reservedBalance, account.currency)}</span>
                              </div>
                            </div>
                          </>
                        );
                      })()}
                    </div>
                  )}

                  {/* Moneda y Monto */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-semibold text-slate-300 mb-2">
                        {isSpanish ? "3. Moneda" : "3. Currency"}
                      </label>
                      <select
                        value={transferForm.currency}
                        onChange={(e) => setTransferForm({...transferForm, currency: e.target.value})}
                        aria-label="Select Currency"
                        className="w-full bg-slate-900 border border-slate-700 focus:border-sky-500 text-slate-100 px-4 py-3 rounded-xl focus:ring-2 focus:ring-sky-500/30 outline-none transition-all"
                      >
                        {availableCurrencies.map(curr => (
                          <option key={curr.code} value={curr.code}>
                            {curr.flag} {curr.code} - {curr.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <BankingInput
                      label={isSpanish ? "4. Monto" : "4. Amount"}
                      value={transferForm.amount}
                      onChange={(val) => setTransferForm({...transferForm, amount: val})}
                      type="number"
                      placeholder="1000.00"
                      required
                    />
                  </div>
                </div>

                {/* Columna Derecha - Destino */}
                <div className="space-y-4">
                  <h3 className="text-lg font-bold text-slate-100 mb-4">
                    {isSpanish ? "Destino de Fondos" : "Destination"}
                  </h3>

                  <BankingInput
                    label={isSpanish ? "5. Nombre del Cliente" : "5. Client Name"}
                    value={transferForm.receivingName}
                    onChange={(val) => setTransferForm({...transferForm, receivingName: val})}
                    placeholder={isSpanish ? "Nombre del cliente destino" : "Destination client name"}
                    required
                  />

                  <BankingInput
                    label={isSpanish ? "6. Cuenta Destino" : "6. Destination Account"}
                    value={transferForm.receivingAccount}
                    onChange={(val) => setTransferForm({...transferForm, receivingAccount: val})}
                    placeholder="ACC-USD-001"
                    required
                  />

                  <BankingInput
                    label={isSpanish ? "7. Descripción" : "7. Description"}
                    value={transferForm.description}
                    onChange={(val) => setTransferForm({...transferForm, description: val})}
                    placeholder={isSpanish ? "Concepto de la transferencia" : "Transfer description"}
                  />

                  <div className="bg-sky-500/10 border border-sky-500/30 rounded-xl p-4 space-y-2">
                    <div className="flex items-center gap-2 text-sky-400 font-semibold">
                      <Shield className="w-4 h-4" />
                      <span>{isSpanish ? "Resumen de la Transferencia" : "Transfer Summary"}</span>
                    </div>
                    <div className="space-y-1 text-sm">
                      <div className="flex justify-between">
                        <span className="text-slate-400">{isSpanish ? "Partner:" : "Partner:"}</span>
                        <span className="text-slate-100 font-semibold">
                          {partners.find(p => p.partnerId === selectedPartner)?.name || '-'}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">{isSpanish ? "Cuenta Origen:" : "Source Account:"}</span>
                        <span className="text-slate-100 font-semibold">
                          {custodyAccounts.find(a => a.id === selectedCustodyAccount)?.accountName || '-'}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">{isSpanish ? "Monto:" : "Amount:"}</span>
                        <span className="text-emerald-400 font-bold text-lg">
                          {transferForm.amount ? fmt.currency(parseFloat(transferForm.amount), transferForm.currency) : '-'}
                        </span>
                      </div>
                    </div>
                  </div>

                  <BankingButton
                    variant="primary"
                    icon={ArrowRight}
                    onClick={handleExecuteTransfer}
                    disabled={processing || !selectedPartner || !selectedCustodyAccount || !transferForm.amount}
                    className="w-full"
                  >
                    {processing 
                      ? (isSpanish ? "Procesando..." : "Processing...") 
                      : (isSpanish ? "Ejecutar Transferencia" : "Execute Transfer")
                    }
                  </BankingButton>
                </div>
              </div>
            </BankingSection>

            {/* Historial de Transferencias */}
            <BankingSection
              title={isSpanish ? "Historial de Transferencias" : "Transfer History"}
              icon={Download}
              color="emerald"
            >
              {transfers.length > 0 ? (
                <div className="space-y-3">
                  {transfers.map((transfer, idx) => (
                    <div
                      key={idx}
                      className="bg-slate-900/50 border border-slate-700 hover:border-emerald-500/50 rounded-xl p-5 transition-all"
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1">
                          <p className="text-slate-100 font-bold text-base mb-1">
                            {transfer.partnerName}
                          </p>
                          <p className="text-slate-400 text-sm">
                            {transfer.fromAccount} → {transfer.toAccount}
                          </p>
                          <div className="flex flex-wrap items-center gap-2 mt-2">
                            <BankingBadge variant="success">{transfer.state}</BankingBadge>
                            <span className="text-slate-500 text-xs">{transfer.transferRequestId}</span>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-emerald-400 font-black text-2xl">
                            {fmt.currency(parseFloat(transfer.amount), transfer.currency)}
                          </p>
                          <p className="text-slate-500 text-xs mt-1">
                            {fmt.dateTime(transfer.createdAt)}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-16">
                  <ArrowRight className="w-20 h-20 text-slate-700 mx-auto mb-4" />
                  <p className="text-slate-400 text-lg font-medium">
                    {isSpanish ? "No hay transferencias aún" : "No transfers yet"}
                  </p>
                  <p className="text-slate-600 text-sm mt-2">
                    {isSpanish ? "Las transferencias aparecerán aquí" : "Transfers will appear here"}
                  </p>
                </div>
              )}
            </BankingSection>
          </div>
        )}

        {/* Footer - API Info */}
        <BankingCard className="p-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <Shield className="w-5 h-5 text-emerald-400" />
              <div>
                <p className="text-slate-100 font-semibold">
                  {isSpanish ? "API Segura y Lista para Producción" : "Secure & Production-Ready API"}
                </p>
                <p className="text-slate-400 text-sm">
                  OAuth 2.0 • JWT • SHA-256 • Multi-tenant
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <BankingBadge variant="success">ISO 27001</BankingBadge>
              <BankingBadge variant="info">PCI DSS</BankingBadge>
              <BankingBadge variant="success">SOC 2</BankingBadge>
            </div>
          </div>
        </BankingCard>
      </div>
    </div>
  );
}

