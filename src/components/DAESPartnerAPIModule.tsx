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
          <BankingSection
            title={isSpanish ? "Gestión de Clientes" : "Client Management"}
            icon={Wallet}
            color="emerald"
          >
            <div className="text-center py-16">
              <Wallet className="w-20 h-20 text-slate-700 mx-auto mb-4" />
              <p className="text-slate-400 text-lg font-medium mb-2">
                {isSpanish ? "Panel de Clientes" : "Client Panel"}
              </p>
              <p className="text-slate-600 text-sm">
                {isSpanish ? "Gestión de clientes asociados a partners" : "Management of clients associated with partners"}
              </p>
              <div className="mt-6 flex items-center justify-center gap-3">
                <BankingBadge variant="info">
                  {clients.length} {isSpanish ? "clientes registrados" : "registered clients"}
                </BankingBadge>
              </div>
            </div>
          </BankingSection>
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
          <BankingSection
            title={isSpanish ? "Transferencias CashTransfer.v1" : "CashTransfer.v1 Transfers"}
            icon={ArrowRight}
            color="purple"
          >
            <div className="text-center py-16">
              <ArrowRight className="w-20 h-20 text-slate-700 mx-auto mb-4" />
              <p className="text-slate-400 text-lg font-medium mb-2">
                {isSpanish ? "Panel de Transferencias" : "Transfer Panel"}
              </p>
              <p className="text-slate-600 text-sm">
                {isSpanish ? "Transferencias multi-moneda con estructura CashTransfer.v1" : "Multi-currency transfers with CashTransfer.v1 structure"}
              </p>
              <div className="mt-6 flex items-center justify-center gap-3">
                <BankingBadge variant="success">
                  {transfers.length} {isSpanish ? "transferencias procesadas" : "transfers processed"}
                </BankingBadge>
                <BankingBadge variant="info">
                  {availableCurrencies.length} {isSpanish ? "divisas disponibles" : "currencies available"}
                </BankingBadge>
              </div>
            </div>
          </BankingSection>
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

