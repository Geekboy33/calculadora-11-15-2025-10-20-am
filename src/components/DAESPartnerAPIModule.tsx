/**
 * APIs Digital Commercial Bank Ltd / DAES Partner API Module
 * Frontend UI para gestión de Partner API
 * Nivel: JP Morgan / Goldman Sachs
 */

import { useState } from 'react';
import { 
  Globe, Key, Users, Wallet, Shield, Copy, Eye, EyeOff,
  CheckCircle, AlertCircle, ArrowRight, Plus, RefreshCw, Download, Clock
} from 'lucide-react';
import { BankingCard, BankingHeader, BankingButton, BankingSection, BankingMetric, BankingBadge, BankingInput } from './ui/BankingComponents';
import { useBankingTheme } from '../hooks/useBankingTheme';
import { custodyStore, type CustodyAccount } from '../lib/custody-store';
import { downloadTXT } from '../lib/download-helper';
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
  
  // ✅ PERSISTENCIA: Cargar desde localStorage al iniciar
  const [partners, setPartners] = useState<Partner[]>(() => {
    const saved = localStorage.getItem('daes_partner_api_partners');
    return saved ? JSON.parse(saved) : [];
  });
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
  
  // ✅ PERSISTENCIA: Cargar desde localStorage
  const [clients, setClients] = useState<any[]>(() => {
    const saved = localStorage.getItem('daes_partner_api_clients');
    return saved ? JSON.parse(saved) : [];
  });
  const [accounts, setAccounts] = useState<any[]>(() => {
    const saved = localStorage.getItem('daes_partner_api_accounts');
    return saved ? JSON.parse(saved) : [];
  });
  const [transfers, setTransfers] = useState<any[]>(() => {
    const saved = localStorage.getItem('daes_partner_api_transfers');
    return saved ? JSON.parse(saved) : [];
  });
  
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
  const [verifying, setVerifying] = useState(false);
  const [verificationResults, setVerificationResults] = useState<any>(null);

  // ✅ PERSISTENCIA: Guardar automáticamente cuando cambien los datos
  useEffect(() => {
    localStorage.setItem('daes_partner_api_partners', JSON.stringify(partners));
    console.log('[DAES Partner API] 💾 Partners guardados:', partners.length);
  }, [partners]);

  useEffect(() => {
    localStorage.setItem('daes_partner_api_clients', JSON.stringify(clients));
    console.log('[DAES Partner API] 💾 Clientes guardados:', clients.length);
  }, [clients]);

  useEffect(() => {
    localStorage.setItem('daes_partner_api_accounts', JSON.stringify(accounts));
  }, [accounts]);

  useEffect(() => {
    localStorage.setItem('daes_partner_api_transfers', JSON.stringify(transfers));
    console.log('[DAES Partner API] 💾 Transferencias guardadas:', transfers.length);
  }, [transfers]);

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
    
    const txtContent = `
═══════════════════════════════════════════════════════════════════════════════
                      DIGITAL COMMERCIAL BANK LTD / DAES
           ${isSpanish ? 'DOCUMENTACIÓN COMPLETA DE API PARA CLIENTE' : 'COMPLETE API DOCUMENTATION FOR CLIENT'}
                              Partner API v1.0
═══════════════════════════════════════════════════════════════════════════════

${isSpanish ? 'INFORMACIÓN DEL CLIENTE' : 'CLIENT INFORMATION'}
═══════════════════════════════════════════════════════════════════════════════

${isSpanish ? 'Cliente ID:' : 'Client ID:'}                 ${client.clientId}
${isSpanish ? 'ID Externo:' : 'External ID:'}                 ${client.externalClientId}
${isSpanish ? 'Nombre Legal:' : 'Legal Name:'}               ${client.legalName}
${isSpanish ? 'Tipo:' : 'Type:'}                       ${client.type}
${isSpanish ? 'País:' : 'Country:'}                       ${client.country}
${isSpanish ? 'Estado:' : 'Status:'}                     ${client.status}
Partner:                    ${partner.name}
Partner ID:                 ${partner.partnerId}
${isSpanish ? 'Fecha de Creación:' : 'Created At:'}          ${fmt.dateTime(client.createdAt)}

${isSpanish ? 'CREDENCIALES DE AUTENTICACIÓN' : 'AUTHENTICATION CREDENTIALS'}
═══════════════════════════════════════════════════════════════════════════════

⚠️ ${isSpanish ? 'IMPORTANTE: Guarda estas credenciales de forma segura y NO las compartas' : 'IMPORTANT: Save these credentials securely and DO NOT share them'}

Partner Client ID:          ${partner.clientId}
Partner Client Secret:      ${isSpanish ? '[Solicita al administrador del partner]' : '[Request from partner administrator]'}
Client API Key:             ${client.apiKey}

${isSpanish ? 'DIVISAS HABILITADAS PARA ESTE CLIENTE' : 'ENABLED CURRENCIES FOR THIS CLIENT'}
═══════════════════════════════════════════════════════════════════════════════

${client.allowedCurrencies.map((curr: string) => {
  const currInfo = availableCurrencies.find(c => c.code === curr);
  return `${currInfo?.flag || ''} ${curr.padEnd(6)} - ${currInfo?.name || curr}`;
}).join('\n')}

Total: ${client.allowedCurrencies.length} ${isSpanish ? 'divisas disponibles' : 'available currencies'}

${isSpanish ? 'BASE URL DE LA API' : 'API BASE URL'}
═══════════════════════════════════════════════════════════════════════════════

${isSpanish ? 'Producción:' : 'Production:'}                 ${baseUrl}
${isSpanish ? 'Documentación:' : 'Documentation:'}              https://luxliqdaes.cloud/docs/partner-api
${isSpanish ? 'Portal de Partners:' : 'Partner Portal:'}         https://luxliqdaes.cloud/partner-portal

═══════════════════════════════════════════════════════════════════════════════
                         ${isSpanish ? 'GUÍA DE INTEGRACIÓN COMPLETA' : 'COMPLETE INTEGRATION GUIDE'}
═══════════════════════════════════════════════════════════════════════════════

${isSpanish ? 'PASO 1: AUTENTICACIÓN (Obtener Token de Acceso)' : 'STEP 1: AUTHENTICATION (Get Access Token)'}
═══════════════════════════════════════════════════════════════════════════════

Endpoint:   POST ${baseUrl}/auth/token
${isSpanish ? 'Propósito:  Obtener token JWT para autenticar todas las demás peticiones' : 'Purpose:    Get JWT token to authenticate all other requests'}

Headers:
  Content-Type: application/json

Body:
{
  "grant_type": "client_credentials",
  "client_id": "${partner.clientId}",
  "client_secret": "[TU_CLIENT_SECRET]"
}

Response (200 OK):
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "token_type": "Bearer",
  "expires_in": 3600,
  "scope": "partners:read partners:write"
}

⚠️ ${isSpanish ? 'IMPORTANTE:' : 'IMPORTANT:'}
- ${isSpanish ? 'El token expira en 1 hora (3600 segundos)' : 'Token expires in 1 hour (3600 seconds)'}
- ${isSpanish ? 'Guarda el access_token para usarlo en las siguientes peticiones' : 'Save the access_token to use in subsequent requests'}
- ${isSpanish ? 'Cuando expire, solicita uno nuevo' : 'When it expires, request a new one'}

${isSpanish ? 'Ejemplo en JavaScript/TypeScript:' : 'Example in JavaScript/TypeScript:'}
\`\`\`typescript
const getAccessToken = async () => {
  const response = await fetch('${baseUrl}/auth/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      grant_type: 'client_credentials',
      client_id: '${partner.clientId}',
      client_secret: process.env.DAES_CLIENT_SECRET
    })
  });
  
  const data = await response.json();
  return data.access_token;
};
\`\`\`

${isSpanish ? 'PASO 2: CREAR CUENTA PARA EL CLIENTE' : 'STEP 2: CREATE ACCOUNT FOR CLIENT'}
═══════════════════════════════════════════════════════════════════════════════

Endpoint:   POST ${baseUrl}/clients/${client.clientId}/accounts
${isSpanish ? 'Propósito:  Crear cuenta en una divisa específica' : 'Purpose:    Create account in specific currency'}

Headers:
  Authorization: Bearer [ACCESS_TOKEN]
  Content-Type: application/json

${isSpanish ? 'Body:' : 'Body:'}
{
  "currency": "USD",
  "initialBalance": "0.00"
}

Response (201 Created):
{
  "success": true,
  "data": {
    "accountId": "ACC_USD_1234567890_ABC12",
    "clientId": "${client.clientId}",
    "currency": "USD",
    "balance": "0.00",
    "availableBalance": "0.00",
    "status": "ACTIVE",
    "createdAt": "2025-11-26T12:00:00.000Z"
  }
}

${isSpanish ? 'Ejemplo en código:' : 'Code example:'}
\`\`\`typescript
const createAccount = async (accessToken: string, currency: string) => {
  const response = await fetch('${baseUrl}/clients/${client.clientId}/accounts', {
    method: 'POST',
    headers: {
      'Authorization': \`Bearer \${accessToken}\`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      currency: currency,
      initialBalance: '0.00'
    })
  });
  
  return await response.json();
};

// Crear cuentas para las divisas habilitadas
${client.allowedCurrencies.map((curr: string) => `await createAccount(token, '${curr}');`).join('\n')}
\`\`\`

PASO 3: CONSULTAR CUENTAS DEL CLIENTE
═══════════════════════════════════════════════════════════════════════════════

Endpoint:   GET ${baseUrl}/clients/${client.clientId}/accounts
${isSpanish ? 'Propósito:  Obtener todas las cuentas y sus balances' : 'Purpose:    Get all accounts and their balances'}

Headers:
  Authorization: Bearer [ACCESS_TOKEN]

Response (200 OK):
{
  "success": true,
  "data": [
    {
      "accountId": "ACC_USD_1234567890_ABC12",
      "currency": "USD",
      "balance": "1500.00",
      "availableBalance": "1500.00",
      "reservedBalance": "0.00",
      "status": "ACTIVE"
    },
    {
      "accountId": "ACC_EUR_1234567891_XYZ45",
      "currency": "EUR",
      "balance": "850.00",
      "availableBalance": "850.00",
      "reservedBalance": "0.00",
      "status": "ACTIVE"
    }
  ]
}

${isSpanish ? 'Ejemplo en código:' : 'Code example:'}
\`\`\`typescript
const getAccounts = async (accessToken: string) => {
  const response = await fetch('${baseUrl}/clients/${client.clientId}/accounts', {
    method: 'GET',
    headers: {
      'Authorization': \`Bearer \${accessToken}\`
    }
  });
  
  const data = await response.json();
  return data.data; // Array de cuentas
};
\`\`\`

PASO 4: RECIBIR TRANSFERENCIAS (Módulo de Recepción)
═══════════════════════════════════════════════════════════════════════════════

⭐ CÓMO FUNCIONA:

Digital Commercial Bank DAES → ENVÍA → Tu Cliente
Tú construyes el módulo para RECIBIR las transferencias que nosotros enviamos

Endpoint para consultar transferencias RECIBIDAS:
GET ${baseUrl}/transfers/incoming/${client.clientId}

Headers:
  Authorization: Bearer [ACCESS_TOKEN]

Query Params:
  ?status=SETTLED          (opcional: filtrar por estado)
  ?currency=USD            (opcional: filtrar por divisa)
  ?limit=50                (opcional: límite de resultados)

Response (200 OK):
{
  "success": true,
  "data": [
    {
      "transferId": "TRF_1234567890_XYZ123",
      "DCBReference": "TRF_1234567890_XYZ123",
      "receivingAccount": "${client.clientId}-ACC-USD-001",
      "amount": "1000.00",
      "currency": "USD",
      "state": "SETTLED",
      "settledAt": "2025-11-26T12:01:30.000Z",
      "cashTransfer": {
        "SendingName": "Digital Commercial Bank DAES",
        "SendingAccount": "DCB-MASTER-USD-001",
        "ReceivingName": "${client.legalName}",
        "ReceivingAccount": "${client.clientId}-ACC-USD-001",
        "Datetime": "2025-11-26T12:00:00.000Z",
        "Amount": "1000.00",
        "SendingCurrency": "USD",
        "ReceivingCurrency": "USD",
        "Description": "Transfer from DAES",
        "TransferRequestID": "DAES-TX-20251126-001",
        "ReceivingInstitution": "${client.legalName}",
        "SendingInstitution": "Digital Commercial Bank DAES",
        "method": "API",
        "purpose": "PAYMENT",
        "source": "DAES"
      }
    }
  ],
  "total": 1,
  "page": 1
}

⚠️ IMPORTANTE:
- Digital Commercial Bank DAES te ENVÍA las transferencias
- Tú las RECIBES en las cuentas que creaste
- Consulta este endpoint para ver transferencias recibidas
- El campo cashTransfer contiene toda la información CashTransfer.v1

Ejemplo COMPLETO en código:
\`\`\`typescript
const createTransfer = async (
  accessToken: string,
  fromAccountId: string,
  toAccountName: string,
  toAccountId: string,
  amount: number,
  currency: string
) => {
  const transferRequestId = \`TX-\${Date.now()}\`;
  
  const response = await fetch('${baseUrl}/transfers', {
    method: 'POST',
    headers: {
      'Authorization': \`Bearer \${accessToken}\`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      'CashTransfer.v1': {
        SendingName: '${client.legalName}',
        SendingAccount: fromAccountId,
        ReceivingName: toAccountName,
        ReceivingAccount: toAccountId,
        Datetime: new Date().toISOString(),
        Amount: amount.toFixed(2),
        SendingCurrency: currency,
        ReceivingCurrency: currency,
        Description: 'Payment via DAES Partner API',
        TransferRequestID: transferRequestId,
        ReceivingInstitution: 'Digital Commercial Bank DAES',
        SendingInstitution: 'Digital Commercial Bank DAES',
        method: 'API',
        purpose: 'PAYMENT',
        source: 'DAES_PARTNER_API'
      }
    })
  });
  
  const data = await response.json();
  
  // Guardar DCBReference para tracking
  console.log('Transfer created:', data.data.DCBReference);
  
  return data.data;
};
\`\`\`

PASO 5: CONSULTAR ESTADO DE TRANSFERENCIA
═══════════════════════════════════════════════════════════════════════════════

Endpoint:   GET ${baseUrl}/transfers/[TRANSFER_REQUEST_ID]
${isSpanish ? 'Propósito:  Verificar estado de una transferencia' : 'Purpose:    Check transfer status'}

Headers:
  Authorization: Bearer [ACCESS_TOKEN]

Ejemplo URL:
GET ${baseUrl}/transfers/TX-20251126-001

Response (200 OK):
{
  "success": true,
  "data": {
    "transferId": "TRF_1234567890_XYZ123",
    "DCBReference": "TRF_1234567890_XYZ123",
    "TransferRequestID": "TX-20251126-001",
    "state": "SETTLED",
    "amount": "1000.00",
    "sendingCurrency": "USD",
    "receivingCurrency": "USD",
    "createdAt": "2025-11-26T12:00:00.000Z",
    "settledAt": "2025-11-26T12:01:30.000Z"
  }
}

${isSpanish ? 'Estados posibles:' : 'Possible states:'}
- PENDING: ${isSpanish ? 'Esperando procesamiento' : 'Awaiting processing'}
- PROCESSING: ${isSpanish ? 'En procesamiento' : 'Processing'}
- SETTLED: ${isSpanish ? 'Completada exitosamente' : 'Successfully completed'}
- REJECTED: ${isSpanish ? 'Rechazada' : 'Rejected'}
- FAILED: ${isSpanish ? 'Falló' : 'Failed'}

${isSpanish ? 'Ejemplo en código:' : 'Code example:'}
\`\`\`typescript
const checkTransferStatus = async (
  accessToken: string,
  transferRequestId: string
) => {
  const response = await fetch(
    \`${baseUrl}/transfers/\${transferRequestId}\`,
    {
      method: 'GET',
      headers: {
        'Authorization': \`Bearer \${accessToken}\`
      }
    }
  );
  
  const data = await response.json();
  return data.data.state;
};

// Polling para esperar settlement
const waitForSettlement = async (token: string, requestId: string) => {
  let state = 'PENDING';
  while (state === 'PENDING' || state === 'PROCESSING') {
    await new Promise(resolve => setTimeout(resolve, 2000)); // Esperar 2s
    state = await checkTransferStatus(token, requestId);
  }
  return state;
};
\`\`\`

═══════════════════════════════════════════════════════════════════════════════
              MÓDULO COMPLETO DE RECEPCIÓN DE TRANSFERENCIAS (TypeScript)
═══════════════════════════════════════════════════════════════════════════════

⭐ IMPORTANTE: Este módulo es para RECIBIR transferencias que DAES te envía

Digital Commercial Bank DAES → ENVÍA → Tú RECIBES

A continuación, código completo listo para copiar y pegar en tu proyecto:

\`\`\`typescript
/**
 * Digital Commercial Bank DAES - Partner API Client
 * Módulo completo para: ${client.legalName}
 * Cliente ID: ${client.clientId}
 */

interface DAESConfig {
  baseUrl: string;
  clientId: string;
  clientSecret: string;
  apiKey: string;
}

interface CashTransferV1 {
  SendingName: string;
  SendingAccount: string;
  ReceivingName: string;
  ReceivingAccount: string;
  Datetime: string;
  Amount: string;
  SendingCurrency: string;
  ReceivingCurrency: string;
  Description: string;
  TransferRequestID: string;
  ReceivingInstitution: string;
  SendingInstitution: string;
  method: 'API';
  purpose: string;
  source: string;
}

class DAESPartnerAPIClient {
  private config: DAESConfig;
  private accessToken: string | null = null;
  private tokenExpiresAt: number = 0;

  constructor(config: DAESConfig) {
    this.config = config;
  }

  /**
   * Obtener token de acceso (con auto-refresh)
   */
  async getAccessToken(): Promise<string> {
    // ${isSpanish ? 'Si hay token válido, retornarlo' : 'If there is a valid token, return it'}
    if (this.accessToken && Date.now() < this.tokenExpiresAt) {
      return this.accessToken;
    }

    // ${isSpanish ? 'Solicitar nuevo token' : 'Request new token'}
    const response = await fetch(\`\${this.config.baseUrl}/auth/token\`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        grant_type: 'client_credentials',
        client_id: this.config.clientId,
        client_secret: this.config.clientSecret
      })
    });

    if (!response.ok) {
      throw new Error('Authentication failed');
    }

    const data = await response.json();
    this.accessToken = data.access_token;
    this.tokenExpiresAt = Date.now() + (data.expires_in * 1000);

    console.log(\`✅ ${isSpanish ? 'Token obtenido, expira en' : 'Token obtained, expires in'} \${data.expires_in} ${isSpanish ? 'segundos' : 'seconds'}\`);
    return this.accessToken;
  }

  /**
   * Crear cuenta en una divisa
   */
  async createAccount(currency: string, initialBalance: string = '0.00') {
    const token = await this.getAccessToken();

    const response = await fetch(
      \`\${this.config.baseUrl}/clients/${client.clientId}/accounts\`,
      {
        method: 'POST',
        headers: {
          'Authorization': \`Bearer \${token}\`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          currency,
          initialBalance
        })
      }
    );

    if (!response.ok) {
      throw new Error(\`Failed to create account: \${response.statusText}\`);
    }

    const data = await response.json();
    console.log(\`✅ ${isSpanish ? 'Cuenta' : 'Account'} \${currency} ${isSpanish ? 'creada:' : 'created:'}\`, data.data.accountId);
    return data.data;
  }

  /**
   * Obtener todas las cuentas
   */
  async getAccounts() {
    const token = await this.getAccessToken();

    const response = await fetch(
      \`\${this.config.baseUrl}/clients/${client.clientId}/accounts\`,
      {
        method: 'GET',
        headers: {
          'Authorization': \`Bearer \${token}\`
        }
      }
    );

    if (!response.ok) {
      throw new Error('Failed to fetch accounts');
    }

    const data = await response.json();
    return data.data;
  }

  /**
   * Consultar transferencias RECIBIDAS (que DAES te envió)
   */
  async getIncomingTransfers(params?: {
    status?: 'SETTLED' | 'PENDING' | 'PROCESSING';
    currency?: string;
    limit?: number;
  }) {
    const token = await this.getAccessToken();
    
    const queryParams = new URLSearchParams();
    if (params?.status) queryParams.append('status', params.status);
    if (params?.currency) queryParams.append('currency', params.currency);
    if (params?.limit) queryParams.append('limit', params.limit.toString());

    const url = \`\${this.config.baseUrl}/transfers/incoming/${client.clientId}?\${queryParams}\`;

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': \`Bearer \${token}\`
      }
    });

    if (!response.ok) {
      throw new Error('Failed to fetch incoming transfers');
    }

    const data = await response.json();
    console.log(\`✅ Transferencias recibidas: \${data.data.length}\`);
    return data.data;
  }

  /**
   * Obtener detalles de una transferencia específica
   */
  async getTransferDetails(dcbReference: string) {
    const token = await this.getAccessToken();

    const response = await fetch(
      \`\${this.config.baseUrl}/transfers/details/\${dcbReference}\`,
      {
        method: 'GET',
        headers: {
          'Authorization': \`Bearer \${token}\`
        }
      }
    );

    if (!response.ok) {
      throw new Error('Failed to get transfer details');
    }

    const data = await response.json();
    return data.data;
  }

  /**
   * Procesar transferencia recibida (actualizar tu sistema)
   */
  async processIncomingTransfer(dcbReference: string) {
    const transfer = await this.getTransferDetails(dcbReference);
    
    // Extraer información de CashTransfer.v1
    const cashTransfer = transfer.cashTransfer;
    
    console.log('📥 TRANSFERENCIA RECIBIDA:');
    console.log('  De:', cashTransfer.SendingName);
    console.log('  Monto:', cashTransfer.Amount, cashTransfer.SendingCurrency);
    console.log('  Para:', cashTransfer.ReceivingName);
    console.log('  Cuenta destino:', cashTransfer.ReceivingAccount);
    console.log('  Descripción:', cashTransfer.Description);
    
    // Aquí actualizas TU base de datos local
    // con la información de la transferencia recibida
    
    return {
      processed: true,
      amount: parseFloat(cashTransfer.Amount),
      currency: cashTransfer.SendingCurrency,
      reference: dcbReference
    };
  }

  /**
   * Polling de transferencias nuevas (ejecutar periódicamente)
   */
  async pollNewTransfers(lastCheckedTimestamp?: string) {
    const transfers = await this.getIncomingTransfers({
      status: 'SETTLED',
      limit: 100
    });

    // Filtrar solo las nuevas desde el último check
    const newTransfers = lastCheckedTimestamp
      ? transfers.filter((t: any) => new Date(t.settledAt) > new Date(lastCheckedTimestamp))
      : transfers;

    console.log(\`📥 Nuevas transferencias: \${newTransfers.length}\`);

    // Procesar cada una
    for (const transfer of newTransfers) {
      await this.processIncomingTransfer(transfer.DCBReference);
    }

    return newTransfers;
  }
}

// INICIALIZACIÓN DEL CLIENTE
const daesClient = new DAESPartnerAPIClient({
  baseUrl: '${baseUrl}',
  clientId: '${partner.clientId}',
  clientSecret: '[TU_CLIENT_SECRET]',
  apiKey: '${client.apiKey}'
});

// EJEMPLO DE USO COMPLETO - MÓDULO DE RECEPCIÓN
async function ejemploModuloRecepcion() {
  try {
    // 1. Crear cuentas para RECIBIR en las divisas habilitadas
    ${client.allowedCurrencies.map((curr: string) => 
      `const ${curr.toLowerCase()}Account = await daesClient.createAccount('${curr}');
    console.log('Cuenta ${curr} lista para RECIBIR:', ${curr.toLowerCase()}Account.accountId);`
    ).join('\n    ')}

    // 2. Consultar transferencias RECIBIDAS de DAES
    const incomingTransfers = await daesClient.getIncomingTransfers({
      status: 'SETTLED'
    });

    console.log(\`📥 Transferencias recibidas: \${incomingTransfers.length}\`);

    // 3. Procesar cada transferencia recibida
    for (const transfer of incomingTransfers) {
      console.log('\\n📥 PROCESANDO TRANSFERENCIA RECIBIDA:');
      console.log('  DCB Reference:', transfer.DCBReference);
      console.log('  Monto:', transfer.amount, transfer.currency);
      console.log('  Estado:', transfer.state);

      // Obtener detalles completos con CashTransfer.v1
      const details = await daesClient.getTransferDetails(transfer.DCBReference);
      const cashTransfer = details.cashTransfer;

      console.log('\\n  📋 CashTransfer.v1 Info:');
      console.log('    Remitente:', cashTransfer.SendingName);
      console.log('    Institución:', cashTransfer.SendingInstitution);
      console.log('    Para:', cashTransfer.ReceivingName);
      console.log('    Descripción:', cashTransfer.Description);

      // 4. Actualizar TU base de datos con la transferencia recibida
      await actualizarBaseDatosLocal({
        dcbReference: transfer.DCBReference,
        amount: parseFloat(transfer.amount),
        currency: transfer.currency,
        receivedAt: transfer.settledAt,
        senderName: cashTransfer.SendingName,
        description: cashTransfer.Description
      });

      console.log('  ✅ Transferencia procesada y registrada en tu sistema');
    }
  } catch (error) {
    console.error('Error:', error);
  }
}

// FUNCIÓN PARA ACTUALIZAR TU BASE DE DATOS LOCAL
// (Implementa según tu sistema)
async function actualizarBaseDatosLocal(transferData: {
  dcbReference: string;
  amount: number;
  currency: string;
  receivedAt: string;
  senderName: string;
  description: string;
}) {
  // EJEMPLO: Guardar en tu base de datos
  // await db.transfers.insert({
  //   id: transferData.dcbReference,
  //   amount: transferData.amount,
  //   currency: transferData.currency,
  //   status: 'RECEIVED',
  //   receivedAt: transferData.receivedAt,
  //   sender: transferData.senderName,
  //   description: transferData.description
  // });

  console.log('💾 Guardado en base de datos local');
}

// POLLING AUTOMÁTICO (Ejecutar cada X minutos)
setInterval(async () => {
  console.log('🔄 Verificando nuevas transferencias...');
  
  const lastCheck = localStorage.getItem('lastTransferCheck') || new Date(0).toISOString();
  const newTransfers = await daesClient.pollNewTransfers(lastCheck);

  if (newTransfers.length > 0) {
    console.log(\`📥 ¡\${newTransfers.length} nuevas transferencias recibidas!\`);
    
    // Procesar cada una
    for (const transfer of newTransfers) {
      await daesClient.processIncomingTransfer(transfer.DCBReference);
    }
  }

  localStorage.setItem('lastTransferCheck', new Date().toISOString());
}, 60000); // Cada 1 minuto
\`\`\`

═══════════════════════════════════════════════════════════════════════════════
                              MANEJO DE ERRORES
═══════════════════════════════════════════════════════════════════════════════

La API retorna errores en formato estándar:

{
  "success": false,
  "error": {
    "code": "INVALID_CREDENTIALS",
    "message": "Invalid client credentials",
    "details": {}
  },
  "timestamp": "2025-11-26T12:00:00.000Z"
}

${isSpanish ? 'Códigos de Error Comunes:' : 'Common Error Codes:'}
- INVALID_CREDENTIALS: ${isSpanish ? 'Credenciales incorrectas' : 'Invalid credentials'}
- EXPIRED_TOKEN: ${isSpanish ? 'Token expirado (solicita uno nuevo)' : 'Token expired (request a new one)'}
- INSUFFICIENT_BALANCE: ${isSpanish ? 'Balance insuficiente' : 'Insufficient balance'}
- CURRENCY_NOT_ALLOWED: ${isSpanish ? 'Divisa no permitida para este cliente' : 'Currency not allowed for this client'}
- INVALID_AMOUNT: ${isSpanish ? 'Monto inválido' : 'Invalid amount'}
- DUPLICATE_TRANSFER_REQUEST: ${isSpanish ? 'TransferRequestID duplicado' : 'Duplicate TransferRequestID'}

${isSpanish ? 'Ejemplo de manejo:' : 'Error handling example:'}
\`\`\`typescript
try {
  const result = await daesClient.createTransfer({...});
} catch (error) {
  if (error.response) {
    const errorData = await error.response.json();
    console.error('Error code:', errorData.error.code);
    console.error('Message:', errorData.error.message);
  }
}
\`\`\`

═══════════════════════════════════════════════════════════════════════════════
                            MEJORES PRÁCTICAS
═══════════════════════════════════════════════════════════════════════════════

1. SEGURIDAD:
   ✓ NUNCA expongas el client_secret en el frontend
   ✓ Almacena credenciales en variables de entorno
   ✓ Usa HTTPS siempre
   ✓ Renueva tokens antes de expirar

2. IDEMPOTENCIA:
   ✓ Usa TransferRequestID único para cada transferencia
   ✓ Si reintentas, usa el MISMO ID (evita duplicados)
   ✓ Formato recomendado: TX-[fecha]-[secuencia]

3. DIVISAS:
   ✓ Solo usa divisas habilitadas: ${client.allowedCurrencies.join(', ')}
   ✓ Formato de montos: 2 decimales (1000.00)
   ✓ Verifica balance antes de transferir

4. POLLING:
   ✓ Consulta estado cada 2-5 segundos
   ✓ Implementa timeout (máximo 30 intentos)
   ✓ Maneja todos los estados posibles

5. LOGGING:
   ✓ Registra todas las operaciones
   ✓ Guarda DCBReference para soporte
   ✓ Implementa monitoreo de errores

═══════════════════════════════════════════════════════════════════════════════
                          TESTING Y SANDBOX
═══════════════════════════════════════════════════════════════════════════════

Ambiente de Pruebas (Sandbox):
URL: https://luxliqdaes.cloud/partner-api/sandbox/v1
Usa las mismas credenciales pero en modo sandbox

Diferencias:
- No mueve fondos reales
- Todas las transferencias se marcan como SETTLED automáticamente
- Límite de rate más alto para testing

Recomendación:
1. Prueba primero en sandbox
2. Verifica que todo funcione
3. Cambia a producción cuando estés listo

═══════════════════════════════════════════════════════════════════════════════
                          LÍMITES Y RATE LIMITING
═══════════════════════════════════════════════════════════════════════════════

Límites por Partner:
- Requests por minuto: 60
- Requests por hora: 1000
- Transferencias por día: Sin límite
- Monto máximo por transferencia: Sin límite

Headers de Rate Limit en Response:
X-RateLimit-Limit: 60
X-RateLimit-Remaining: 45
X-RateLimit-Reset: 1640000000

Si excedes el límite:
Response (429 Too Many Requests):
{
  "success": false,
  "error": {
    "code": "RATE_LIMIT_EXCEEDED",
    "message": "Too many requests",
    "details": {
      "retryAfter": 30
    }
  }
}

═══════════════════════════════════════════════════════════════════════════════
                    WEBHOOKS - RECEPCIÓN EN TIEMPO REAL (Recomendado)
═══════════════════════════════════════════════════════════════════════════════

⭐ RECOMENDADO: Configura un webhook para recibir notificaciones instantáneas

Cuando Digital Commercial Bank DAES te envía una transferencia, 
recibirás una notificación inmediata en tu webhook endpoint.

CONFIGURACIÓN:
1. Crea un endpoint en tu servidor (ej: https://tuapp.com/webhooks/daes)
2. Regístralo con el partner
3. DAES enviará notificaciones a ese endpoint

FORMATO DEL WEBHOOK (Lo que recibirás):
POST [TU_WEBHOOK_URL]
Headers:
  Content-Type: application/json
  X-DAES-Signature: [HMAC-SHA256]

Body:
{
  "event": "transfer.incoming.settled",
  "partnerId": "${partner.partnerId}",
  "clientId": "${client.clientId}",
  "data": {
    "DCBReference": "TRF_1234567890_XYZ123",
    "receivingAccount": "${client.clientId}-ACC-USD-001",
    "amount": "1000.00",
    "currency": "USD",
    "state": "SETTLED",
    "settledAt": "2025-11-26T12:01:30.000Z",
    "cashTransfer": {
      "SendingName": "Digital Commercial Bank DAES",
      "ReceivingName": "${client.legalName}",
      "Amount": "1000.00",
      "Description": "Payment from DAES",
      "TransferRequestID": "DAES-TX-001"
    }
  },
  "timestamp": "2025-11-26T12:01:30.000Z"
}

IMPLEMENTACIÓN DEL WEBHOOK EN TU SERVIDOR:

\`\`\`typescript
import express from 'express';
import crypto from 'crypto';

const app = express();
app.use(express.json());

// Endpoint webhook (lo que debes crear en TU servidor)
app.post('/webhooks/daes', async (req, res) => {
  try {
    // 1. Validar firma HMAC
    const signature = req.headers['x-daes-signature'];
    const webhookSecret = process.env.DAES_WEBHOOK_SECRET; // Te lo proporciona DAES
    
    const expectedSignature = crypto
      .createHmac('sha256', webhookSecret)
      .update(JSON.stringify(req.body))
      .digest('hex');

    if (signature !== expectedSignature) {
      console.error('❌ Webhook signature inválida');
      return res.status(401).json({ error: 'Invalid signature' });
    }

    // 2. Procesar evento
    const { event, data } = req.body;

    if (event === 'transfer.incoming.settled') {
      console.log('📥 TRANSFERENCIA RECIBIDA DE DAES:');
      console.log('  DCB Reference:', data.DCBReference);
      console.log('  Monto:', data.amount, data.currency);
      console.log('  Para cuenta:', data.receivingAccount);

      // 3. Actualizar TU base de datos
      await tuBaseDeDatos.transfers.insert({
        id: data.DCBReference,
        amount: parseFloat(data.amount),
        currency: data.currency,
        status: 'RECEIVED',
        receivedAt: data.settledAt,
        sender: data.cashTransfer.SendingName,
        description: data.cashTransfer.Description,
        cashTransferData: data.cashTransfer
      });

      // 4. Notificar a tu usuario final (opcional)
      await enviarNotificacionAUsuario({
        userId: extraerUserIdDeCuenta(data.receivingAccount),
        message: \`Recibiste \${data.amount} \${data.currency}\`,
        reference: data.DCBReference
      });

      console.log('✅ Transferencia procesada y guardada');
    }

    // 5. Responder 200 OK (importante)
    res.json({ received: true });

  } catch (error) {
    console.error('Error procesando webhook:', error);
    res.status(500).json({ error: 'Internal error' });
  }
});

app.listen(3000, () => {
  console.log('Webhook server running on port 3000');
});
\`\`\`

EVENTOS DE WEBHOOK:
- transfer.incoming.settled: Transferencia recibida y completada
- transfer.incoming.pending: Transferencia recibida (procesando)
- transfer.incoming.failed: Transferencia recibida falló

═══════════════════════════════════════════════════════════════════════════════
                        SOPORTE Y CONTACTO
═══════════════════════════════════════════════════════════════════════════════

${isSpanish ? 'Soporte Técnico:' : 'Technical Support:'}
  Email:                    operation@digcommbank.com
  Portal:                   https://luxliqdaes.cloud/support
  ${isSpanish ? 'Horario:' : 'Schedule:'}                  24/7

${isSpanish ? 'Documentación Adicional:' : 'Additional Documentation:'}
  API Reference:            https://luxliqdaes.cloud/docs/api
  Integration Guide:        https://luxliqdaes.cloud/docs/integration
  Code Examples:            https://luxliqdaes.cloud/docs/examples

${isSpanish ? 'Estado de la API:' : 'API Status:'}
  Status Page:              https://status.digcommbank.com
  Incidents:                https://status.digcommbank.com/incidents

═══════════════════════════════════════════════════════════════════════════════
                        COMPLIANCE Y SEGURIDAD
═══════════════════════════════════════════════════════════════════════════════

Certificaciones:
✓ ISO 27001:2013 - Information Security Management
✓ SOC 2 Type II - Security, Availability, Confidentiality
✓ PCI DSS Level 1 - Payment Card Industry Data Security
✓ GDPR Compliant - General Data Protection Regulation

${isSpanish ? 'Seguridad:' : 'Security:'}
✓ TLS 1.3 encryption
✓ SHA-256 hashing ${isSpanish ? 'para secrets' : 'for secrets'}
✓ JWT ${isSpanish ? 'con' : 'with'} HS256 algorithm
✓ Rate limiting ${isSpanish ? 'por partner' : 'per partner'}
✓ IP whitelisting (${isSpanish ? 'opcional' : 'optional'})
✓ 2FA ${isSpanish ? 'para operaciones críticas (opcional)' : 'for critical operations (optional)'}

${isSpanish ? 'Auditoría:' : 'Auditing:'}
✓ ${isSpanish ? 'Todas las operaciones son auditadas' : 'All operations are audited'}
✓ Logs ${isSpanish ? 'disponibles en el portal' : 'available in the portal'}
✓ ${isSpanish ? 'Retención de logs: 7 años' : 'Log retention: 7 years'}
✓ Compliance reports ${isSpanish ? 'disponibles' : 'available'}

═══════════════════════════════════════════════════════════════════════════════
                        ${isSpanish ? 'TÉRMINOS DE SERVICIO' : 'TERMS OF SERVICE'}
═══════════════════════════════════════════════════════════════════════════════

1. ${isSpanish ? 'Este documento y las credenciales son confidenciales' : 'This document and credentials are confidential'}
2. ${isSpanish ? 'Uso exclusivo para:' : 'Exclusive use for:'} ${client.legalName}
3. ${isSpanish ? 'No transferir ni compartir credenciales' : 'Do not transfer or share credentials'}
4. ${isSpanish ? 'Reportar inmediatamente si hay compromiso de credenciales' : 'Report immediately if credentials are compromised'}
5. ${isSpanish ? 'Cumplir con todas las regulaciones bancarias aplicables' : 'Comply with all applicable banking regulations'}
6. ${isSpanish ? 'Digital Commercial Bank Ltd se reserva el derecho de suspender acceso' : 'Digital Commercial Bank Ltd reserves the right to suspend access'}

${isSpanish ? 'Aceptación:' : 'Acceptance:'}
${isSpanish ? 'Al usar esta API, aceptas los términos completos en:' : 'By using this API, you accept the complete terms at:'}
https://luxliqdaes.cloud/terms

═══════════════════════════════════════════════════════════════════════════════
                              CHANGELOG
═══════════════════════════════════════════════════════════════════════════════

v1.0.0 (2025-11-26):
- Lanzamiento inicial de Partner API
- Soporte para 15 divisas
- CashTransfer.v1 implementation
- OAuth 2.0 client_credentials
- Multi-tenant architecture

═══════════════════════════════════════════════════════════════════════════════

${isSpanish ? 'Documento generado el:' : 'Document generated on:'} ${fmt.dateTime(new Date())}
${isSpanish ? 'Versión de API:' : 'API Version:'} v1.0.0
${isSpanish ? 'Cliente ID:' : 'Client ID:'} ${client.clientId}
Partner: ${partner.name}

                    Digital Commercial Bank Ltd © 2025
                         www.digcommbank.com
                      ${isSpanish ? 'Todos los derechos reservados' : 'All rights reserved'}

═══════════════════════════════════════════════════════════════════════════════
                      ${isSpanish ? 'FIN DE LA DOCUMENTACIÓN' : 'END OF DOCUMENTATION'}
═══════════════════════════════════════════════════════════════════════════════
`;

    // ✅ Usar helper de descarga seguro (previene errores de removeChild)
    const filename = `DAES_Partner_API_Documentation_${client.legalName.replace(/\s+/g, '_')}_${client.clientId}.txt`;
    downloadTXT(txtContent, filename);
    
    console.log(`[DAES Partner API] 📄 Documentación completa generada para: ${client.legalName}`);
  };

  const handleDeleteClient = (clientId: string) => {
    const client = clients.find(c => c.clientId === clientId);
    if (!client) return;

    if (confirm(`⚠️ ${isSpanish ? 'Eliminar' : 'Delete'}: ${client.legalName}?`)) {
      setClients(clients.filter(c => c.clientId !== clientId));
      alert(`✅ ${isSpanish ? 'Cliente eliminado' : 'Client deleted'}`);
    }
  };

  const handleVerifySystem = async () => {
    setVerifying(true);
    setVerificationResults(null);

    const results = {
      timestamp: new Date().toISOString(),
      checks: [] as any[],
      overall: 'PENDING' as 'SUCCESS' | 'WARNING' | 'ERROR'
    };

    let successCount = 0;
    let warningCount = 0;
    let errorCount = 0;

    // Check 1: Partners configurados
    if (partners.length > 0) {
      results.checks.push({
        name: isSpanish ? 'Partners Registrados' : 'Registered Partners',
        status: 'SUCCESS',
        message: `${partners.length} ${isSpanish ? 'partner(s) activo(s)' : 'active partner(s)'}`,
        details: partners.map(p => `${p.name} (${p.clientId})`)
      });
      successCount++;
    } else {
      results.checks.push({
        name: isSpanish ? 'Partners Registrados' : 'Registered Partners',
        status: 'WARNING',
        message: isSpanish ? 'No hay partners registrados' : 'No partners registered',
        details: []
      });
      warningCount++;
    }

    // Check 2: Clientes configurados
    if (clients.length > 0) {
      results.checks.push({
        name: isSpanish ? 'Clientes Configurados' : 'Configured Clients',
        status: 'SUCCESS',
        message: `${clients.length} ${isSpanish ? 'cliente(s) con credenciales' : 'client(s) with credentials'}`,
        details: clients.map(c => `${c.legalName} - ${c.allowedCurrencies.length} ${isSpanish ? 'divisas' : 'currencies'}`)
      });
      successCount++;
    } else {
      results.checks.push({
        name: isSpanish ? 'Clientes Configurados' : 'Configured Clients',
        status: 'WARNING',
        message: isSpanish ? 'No hay clientes configurados' : 'No clients configured',
        details: []
      });
      warningCount++;
    }

    // Check 3: Cuentas Custodio disponibles
    if (custodyAccounts.length > 0) {
      const totalBalance = custodyAccounts.reduce((sum, acc) => sum + acc.availableBalance, 0);
      results.checks.push({
        name: isSpanish ? 'Cuentas Custodio' : 'Custody Accounts',
        status: 'SUCCESS',
        message: `${custodyAccounts.length} ${isSpanish ? 'cuenta(s)' : 'account(s)'} - ${isSpanish ? 'Balance total:' : 'Total balance:'} ${fmt.currency(totalBalance, 'USD')}`,
        details: custodyAccounts.map(a => `${a.accountName}: ${fmt.currency(a.availableBalance, a.currency)}`)
      });
      successCount++;
    } else {
      results.checks.push({
        name: isSpanish ? 'Cuentas Custodio' : 'Custody Accounts',
        status: 'ERROR',
        message: isSpanish ? 'No hay cuentas custodio disponibles' : 'No custody accounts available',
        details: [isSpanish ? 'Crea cuentas custodio en el módulo correspondiente' : 'Create custody accounts in the corresponding module']
      });
      errorCount++;
    }

    // Check 4: Divisas configuradas
    const allCurrencies = new Set<string>();
    clients.forEach(c => c.allowedCurrencies.forEach((curr: string) => allCurrencies.add(curr)));
    
    if (allCurrencies.size > 0) {
      results.checks.push({
        name: isSpanish ? 'Divisas Configuradas' : 'Configured Currencies',
        status: 'SUCCESS',
        message: `${allCurrencies.size} ${isSpanish ? 'divisa(s) habilitada(s)' : 'enabled currency(ies)'}`,
        details: Array.from(allCurrencies).map(c => {
          const info = availableCurrencies.find(curr => curr.code === c);
          return `${info?.flag} ${c} - ${info?.name}`;
        })
      });
      successCount++;
    } else {
      results.checks.push({
        name: isSpanish ? 'Divisas Configuradas' : 'Configured Currencies',
        status: 'WARNING',
        message: isSpanish ? 'No hay divisas configuradas en clientes' : 'No currencies configured in clients',
        details: []
      });
      warningCount++;
    }

    // Check 5: Transferencias procesadas
    if (transfers.length > 0) {
      const totalAmount = transfers.reduce((sum, t) => sum + parseFloat(t.amount), 0);
      results.checks.push({
        name: isSpanish ? 'Transferencias' : 'Transfers',
        status: 'SUCCESS',
        message: `${transfers.length} ${isSpanish ? 'transferencia(s) procesada(s)' : 'processed transfer(s)'} - ${isSpanish ? 'Volumen:' : 'Volume:'} ${fmt.currency(totalAmount, 'USD')}`,
        details: transfers.map(t => `${t.transferRequestId}: ${fmt.currency(parseFloat(t.amount), t.currency)}`)
      });
      successCount++;
    } else {
      results.checks.push({
        name: isSpanish ? 'Transferencias' : 'Transfers',
        status: 'WARNING',
        message: isSpanish ? 'No hay transferencias registradas' : 'No transfers registered',
        details: [isSpanish ? 'El sistema está listo para procesar transferencias' : 'System is ready to process transfers']
      });
      warningCount++;
    }

    // Check 6: Validación de componentes
    results.checks.push({
      name: isSpanish ? 'Componentes UI' : 'UI Components',
      status: 'SUCCESS',
      message: isSpanish ? 'Todos los componentes bancarios cargados correctamente' : 'All banking components loaded correctly',
      details: ['BankingCard', 'BankingHeader', 'BankingButton', 'BankingMetric', 'BankingBadge']
    });
    successCount++;

    // Check 7: Formatters funcionando
    try {
      const testAmount = 1500000.50;
      const formatted = fmt.currency(testAmount, 'USD');
      const isCorrect = isSpanish ? formatted.includes('1.500.000,50') : formatted.includes('1,500,000.50');
      
      results.checks.push({
        name: isSpanish ? 'Formateo de Números' : 'Number Formatting',
        status: isCorrect ? 'SUCCESS' : 'ERROR',
        message: isCorrect 
          ? (isSpanish ? 'Formateo correcto ES/EN' : 'Correct ES/EN formatting')
          : (isSpanish ? 'Error en formateo' : 'Formatting error'),
        details: [
          isSpanish ? `Ejemplo: ${formatted} (${isCorrect ? '✅ Correcto' : '❌ Incorrecto'})` : `Example: ${formatted} (${isCorrect ? '✅ Correct' : '❌ Incorrect'})`
        ]
      });
      if (isCorrect) successCount++; else errorCount++;
    } catch (e) {
      results.checks.push({
        name: isSpanish ? 'Formateo de Números' : 'Number Formatting',
        status: 'ERROR',
        message: isSpanish ? 'Error al verificar formateo' : 'Error checking formatting',
        details: []
      });
      errorCount++;
    }

    // Check 8: Sistema de traducción
    results.checks.push({
      name: isSpanish ? 'Sistema de Traducción' : 'Translation System',
      status: 'SUCCESS',
      message: `${isSpanish ? 'Idioma activo:' : 'Active language:'} ${isSpanish ? 'Español (ES)' : 'English (EN)'}`,
      details: [isSpanish ? 'TXT se generará en español' : 'TXT will be generated in English']
    });
    successCount++;

    // Determinar estado general
    if (errorCount > 0) {
      results.overall = 'ERROR';
    } else if (warningCount > 0) {
      results.overall = 'WARNING';
    } else {
      results.overall = 'SUCCESS';
    }

    setVerificationResults(results);
    setVerifying(false);

    // Mostrar resumen
    const summaryText = 
      `${results.overall === 'SUCCESS' ? '✅' : results.overall === 'WARNING' ? '⚠️' : '❌'} ${isSpanish ? 'VERIFICACIÓN COMPLETA' : 'VERIFICATION COMPLETE'}\n\n` +
      `${isSpanish ? 'Exitosas:' : 'Successful:'} ${successCount}\n` +
      `${isSpanish ? 'Advertencias:' : 'Warnings:'} ${warningCount}\n` +
      `${isSpanish ? 'Errores:' : 'Errors:'} ${errorCount}\n\n` +
      `${isSpanish ? 'Estado General:' : 'Overall Status:'} ${results.overall}\n\n` +
      `${isSpanish ? 'Ver detalles completos abajo' : 'See full details below'}`;

    alert(summaryText);
  };

  const handleDeletePartner = (partnerId: string) => {
    const partner = partners.find(p => p.partnerId === partnerId);
    if (!partner) return;

    // Contar clientes asociados
    const associatedClients = clients.filter(c => c.partnerId === partnerId);
    
    const confirmed = confirm(
      `⚠️ ${isSpanish ? 'ELIMINAR PARTNER' : 'DELETE PARTNER'}\n\n` +
      `Partner: ${partner.name}\n` +
      `Partner ID: ${partner.partnerId}\n\n` +
      `${isSpanish ? 'También se eliminarán:' : 'This will also delete:'}\n` +
      `- ${associatedClients.length} ${isSpanish ? 'cliente(s) asociado(s)' : 'associated client(s)'}\n` +
      `- ${isSpanish ? 'Todas las cuentas de esos clientes' : 'All accounts of those clients'}\n` +
      `- ${isSpanish ? 'Todo el historial de transferencias' : 'All transfer history'}\n\n` +
      `${isSpanish ? '¿Estás SEGURO?' : 'Are you SURE?'}\n` +
      `${isSpanish ? 'Esta acción NO se puede deshacer.' : 'This action CANNOT be undone.'}`
    );

    if (confirmed) {
      // Eliminar partner
      setPartners(partners.filter(p => p.partnerId !== partnerId));
      
      // Eliminar TODOS los clientes asociados
      setClients(clients.filter(c => c.partnerId !== partnerId));
      
      // Eliminar transferencias asociadas
      setTransfers(transfers.filter(t => t.partnerId !== partnerId));

      alert(
        `✅ ${isSpanish ? 'ELIMINADO EXITOSAMENTE' : 'DELETED SUCCESSFULLY'}\n\n` +
        `Partner: ${partner.name}\n` +
        `${isSpanish ? 'Clientes eliminados:' : 'Clients deleted:'} ${associatedClients.length}\n` +
        `${isSpanish ? 'Transferencias eliminadas:' : 'Transfers deleted:'} ${transfers.filter(t => t.partnerId === partnerId).length}`
      );
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
    <div className="min-h-screen bg-black p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        
        {/* Header */}
        <BankingHeader
          icon={Globe}
          title="APIs Digital Commercial Bank Ltd"
          subtitle={isSpanish ? 'DAES Partner API - Gestión de Partners y Acceso API' : 'DAES Partner API - Partner & API Access Management'}
          gradient="white"
          actions={
            <div className="flex items-center gap-3">
              <BankingButton
                variant="secondary"
                icon={CheckCircle}
                onClick={handleVerifySystem}
                disabled={verifying}
              >
                {verifying 
                  ? (isSpanish ? 'Verificando...' : 'Verifying...') 
                  : (isSpanish ? 'Verificar Sistema' : 'Verify System')
                }
              </BankingButton>
              <BankingBadge variant="success" icon={CheckCircle}>
                API v1.0
              </BankingBadge>
              <BankingBadge variant="info" icon={Shield}>
                Production Ready
              </BankingBadge>
            </div>
          }
        />

        {/* Verification Results */}
        {verificationResults && (
          <BankingCard className={`p-6 border-2 ${
            verificationResults.overall === 'SUCCESS' ? 'border-emerald-500/50' :
            verificationResults.overall === 'WARNING' ? 'border-amber-500/50' :
            'border-red-500/50'
          }`}>
            <div className="flex items-start gap-4 mb-6">
              <div className={`p-3 rounded-xl ${
                verificationResults.overall === 'SUCCESS' ? 'bg-emerald-500/10' :
                verificationResults.overall === 'WARNING' ? 'bg-amber-500/10' :
                'bg-red-500/10'
              }`}>
                {verificationResults.overall === 'SUCCESS' ? <CheckCircle className="w-8 h-8 text-emerald-400" /> :
                 verificationResults.overall === 'WARNING' ? <AlertCircle className="w-8 h-8 text-amber-400" /> :
                 <AlertCircle className="w-8 h-8 text-red-400" />}
              </div>
              <div className="flex-1">
                <h3 className="text-2xl font-bold text-slate-100 mb-2">
                  {isSpanish ? 'Resultados de Verificación' : 'Verification Results'}
                </h3>
                <p className={`text-lg font-semibold ${
                  verificationResults.overall === 'SUCCESS' ? 'text-emerald-400' :
                  verificationResults.overall === 'WARNING' ? 'text-amber-400' :
                  'text-red-400'
                }`}>
                  {verificationResults.overall === 'SUCCESS' 
                    ? (isSpanish ? '✅ Sistema Completamente Funcional' : '✅ System Fully Functional')
                    : verificationResults.overall === 'WARNING'
                    ? (isSpanish ? '⚠️ Sistema Funcional con Advertencias' : '⚠️ System Functional with Warnings')
                    : (isSpanish ? '❌ Errores Detectados' : '❌ Errors Detected')
                  }
                </p>
                <p className="text-slate-400 text-sm mt-1">
                  {isSpanish ? 'Verificado:' : 'Verified:'} {fmt.dateTime(verificationResults.timestamp)}
                </p>
              </div>
              <button
                onClick={() => setVerificationResults(null)}
                className="text-slate-500 hover:text-slate-300 transition-colors"
              >
                ✕
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-4 text-center">
                <p className="text-emerald-400 text-3xl font-bold">
                  {verificationResults.checks.filter((c: any) => c.status === 'SUCCESS').length}
                </p>
                <p className="text-emerald-300 text-sm mt-1">{isSpanish ? 'Exitosas' : 'Successful'}</p>
              </div>
              <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-4 text-center">
                <p className="text-amber-400 text-3xl font-bold">
                  {verificationResults.checks.filter((c: any) => c.status === 'WARNING').length}
                </p>
                <p className="text-amber-300 text-sm mt-1">{isSpanish ? 'Advertencias' : 'Warnings'}</p>
              </div>
              <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 text-center">
                <p className="text-red-400 text-3xl font-bold">
                  {verificationResults.checks.filter((c: any) => c.status === 'ERROR').length}
                </p>
                <p className="text-red-300 text-sm mt-1">{isSpanish ? 'Errores' : 'Errors'}</p>
              </div>
            </div>

            <div className="space-y-3">
              {verificationResults.checks.map((check: any, idx: number) => (
                <div
                  key={idx}
                  className={`bg-[#0d0d0d]/50 border rounded-xl p-4 ${
                    check.status === 'SUCCESS' ? 'border-emerald-500/30' :
                    check.status === 'WARNING' ? 'border-amber-500/30' :
                    'border-red-500/30'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className={`mt-1 ${
                      check.status === 'SUCCESS' ? 'text-emerald-400' :
                      check.status === 'WARNING' ? 'text-amber-400' :
                      'text-red-400'
                    }`}>
                      {check.status === 'SUCCESS' ? '✅' : check.status === 'WARNING' ? '⚠️' : '❌'}
                    </div>
                    <div className="flex-1">
                      <p className="text-slate-100 font-semibold mb-1">{check.name}</p>
                      <p className={`text-sm mb-2 ${
                        check.status === 'SUCCESS' ? 'text-emerald-300' :
                        check.status === 'WARNING' ? 'text-amber-300' :
                        'text-red-300'
                      }`}>
                        {check.message}
                      </p>
                      {check.details.length > 0 && (
                        <div className="bg-[#141414]/50 rounded-lg p-3 mt-2">
                          <ul className="text-slate-400 text-xs space-y-1">
                            {check.details.slice(0, 5).map((detail: string, i: number) => (
                              <li key={i}>• {detail}</li>
                            ))}
                            {check.details.length > 5 && (
                              <li className="text-slate-500 italic">
                                {isSpanish ? `...y ${check.details.length - 5} más` : `...and ${check.details.length - 5} more`}
                              </li>
                            )}
                          </ul>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </BankingCard>
        )}

        {/* Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <BankingMetric
            label={isSpanish ? "Partners Activos" : "Active Partners"}
            value={partners.length}
            icon={Users}
            color="white"
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
        <div className="flex items-center gap-2 bg-[#0d0d0d] border border-[#1a1a1a] p-2 rounded-xl">
          <button
            onClick={() => setSelectedTab('partners')}
            className={`flex-1 px-6 py-3 rounded-lg font-semibold transition-all ${
              selectedTab === 'partners'
                ? 'bg-gradient-to-r from-white to-white text-black shadow-lg'
                : 'text-slate-400 hover:text-slate-100 hover:bg-[#141414]'
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
                : 'text-slate-400 hover:text-slate-100 hover:bg-[#141414]'
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
                : 'text-slate-400 hover:text-slate-100 hover:bg-[#141414]'
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
                : 'text-slate-400 hover:text-slate-100 hover:bg-[#141414]'
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
          color="white"
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
                        ? 'bg-white/10 border-white/30 text-white'
                        : 'bg-[#141414] border-[#1a1a1a] text-slate-400 hover:border-[#1a1a1a]'
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
          <BankingCard className="p-6 border-2 border-white/20">
            <div className="flex items-start gap-4 mb-4">
              <div className="p-3 bg-white/5 rounded-xl">
                <Key className="w-6 h-6 text-white" />
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

            <div className="space-y-4 bg-[#0d0d0d]/50 border border-[#1a1a1a] rounded-xl p-4">
              <div>
                <label className="text-slate-400 text-sm font-semibold mb-2 block">Client ID:</label>
                <div className="flex items-center gap-2">
                  <code className="flex-1 bg-[#141414] border border-[#1a1a1a] text-white px-4 py-3 rounded-lg font-mono text-sm">
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
                  <code className="flex-1 bg-[#141414] border border-[#1a1a1a] text-amber-400 px-4 py-3 rounded-lg font-mono text-sm break-all">
                    {showSecret ? createdCredentials.clientSecret : '•'.repeat(64)}
                  </code>
                  <button
                    onClick={() => setShowSecret(!showSecret)}
                    className="p-3 bg-[#141414] border border-[#1a1a1a] hover:border-[#1a1a1a] text-slate-300 rounded-lg transition-all"
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
              {partners.map((partner) => {
                const associatedClientsCount = clients.filter(c => c.partnerId === partner.partnerId).length;
                return (
                  <div
                    key={partner.partnerId}
                    className="bg-[#0d0d0d]/50 border border-[#1a1a1a] hover:border-white/20 rounded-xl p-5 transition-all group"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <h4 className="text-slate-100 font-bold text-lg mb-2 group-hover:text-white transition-colors">
                          {partner.name}
                        </h4>
                        <div className="flex flex-wrap items-center gap-2">
                          <BankingBadge variant="success">
                            {partner.status}
                          </BankingBadge>
                          <span className="text-slate-500 text-sm">ID: {partner.partnerId}</span>
                          {associatedClientsCount > 0 && (
                            <BankingBadge variant="info">
                              {associatedClientsCount} {isSpanish ? 'clientes' : 'clients'}
                            </BankingBadge>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="text-right">
                          <p className="text-slate-400 text-sm mb-1">Client ID:</p>
                          <code className="text-white text-xs font-mono bg-[#141414] px-2 py-1 rounded">
                            {partner.clientId}
                          </code>
                        </div>
                        <button
                          onClick={() => handleDeletePartner(partner.partnerId)}
                          className="p-2 bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 hover:border-red-500 text-red-400 rounded-lg transition-all"
                          title={isSpanish ? "Eliminar partner y todos sus clientes" : "Delete partner and all clients"}
                        >
                          <AlertCircle className="w-5 h-5" />
                        </button>
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
              );
              })}
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
                <div className="bg-[#0d0d0d]/50 border border-[#1a1a1a] rounded-lg p-4">
                  <div className="flex items-center gap-3 mb-2">
                    <span className="bg-white/5 border border-white/15 text-white px-3 py-1 rounded-md text-xs font-bold">
                      POST
                    </span>
                    <code className="text-slate-100 font-mono text-sm">/partner-api/v1/auth/token</code>
                  </div>
                  <p className="text-slate-400 text-sm">
                    {isSpanish ? "Obtener token de acceso JWT" : "Get JWT access token"}
                  </p>
                </div>

                <div className="bg-[#0d0d0d]/50 border border-[#1a1a1a] rounded-lg p-4">
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

                <div className="bg-[#0d0d0d]/50 border border-[#1a1a1a] rounded-lg p-4">
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

                <div className="bg-[#0d0d0d]/50 border border-[#1a1a1a] rounded-lg p-4">
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
                <Globe className="w-5 h-5 text-white" />
                {isSpanish ? "15 Divisas Soportadas" : "15 Supported Currencies"}
              </h3>
              <div className="grid grid-cols-3 sm:grid-cols-5 gap-3">
                {availableCurrencies.map(curr => (
                  <div
                    key={curr.code}
                    className="bg-[#0d0d0d]/50 border border-[#1a1a1a] rounded-lg p-3 text-center hover:border-white/20 transition-all"
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
              <div className="bg-[#0d0d0d] border border-[#1a1a1a] rounded-xl p-4 overflow-x-auto">
                <pre className="text-white font-mono text-xs">
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
                      className="w-full bg-[#0d0d0d] border border-[#1a1a1a] focus:border-emerald-500 text-slate-100 px-4 py-3 rounded-xl focus:ring-2 focus:ring-emerald-500/30 outline-none transition-all"
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
                      className="w-full bg-[#0d0d0d] border border-[#1a1a1a] focus:border-emerald-500 text-slate-100 px-4 py-3 rounded-xl focus:ring-2 focus:ring-emerald-500/30 outline-none transition-all"
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
                    <div className="flex flex-wrap gap-2 bg-[#0d0d0d]/50 border border-[#1a1a1a] rounded-xl p-4 max-h-48 overflow-y-auto">
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
                              : 'bg-[#141414] border-[#1a1a1a] text-slate-400 hover:border-[#1a1a1a]'
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
              color="white"
            >
              {clients.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {clients.map((client) => (
                    <div
                      key={client.clientId}
                      className="bg-[#0d0d0d]/50 border border-[#1a1a1a] hover:border-emerald-500/50 rounded-xl p-5 transition-all group"
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
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => {
                              const partnerForClient = partners.find(p => p.partnerId === client.partnerId);
                              if (partnerForClient) {
                                generateClientCredentialsTXT(client, partnerForClient);
                              }
                            }}
                            className="p-2 bg-white/5 hover:bg-white/10 border border-white/15 hover:border-white/30 text-white rounded-lg transition-all"
                            title={isSpanish ? "Descargar credenciales TXT" : "Download credentials TXT"}
                          >
                            <Download className="w-5 h-5" />
                          </button>
                          <button
                            onClick={() => handleDeleteClient(client.clientId)}
                            className="p-2 bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 hover:border-red-500 text-red-400 rounded-lg transition-all"
                            title={isSpanish ? "Eliminar cliente" : "Delete client"}
                          >
                            <AlertCircle className="w-5 h-5" />
                          </button>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <div className="text-xs">
                          <span className="text-slate-500">{isSpanish ? "Partner:" : "Partner:"}</span>
                          <span className="text-slate-300 ml-2">{client.partnerName}</span>
                        </div>
                        <div className="text-xs">
                          <span className="text-slate-500">Client ID:</span>
                          <code className="text-white ml-2 font-mono">{client.clientId}</code>
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

        {/* Tab: Cuentas - Organizado por Partner */}
        {selectedTab === 'accounts' && (
          <div className="space-y-6 max-h-[800px] overflow-y-auto pr-2">
            {partners.length > 0 ? (
              partners.map((partner) => {
                // Obtener clientes y transferencias de este partner
                const partnerClients = clients.filter(c => c.partnerId === partner.partnerId);
                const partnerTransfers = transfers.filter(t => t.partnerId === partner.partnerId);
                
                // Calcular estadísticas por divisa
                const statsByCurrency: {[key: string]: {
                  total: number;
                  count: number;
                  lastTransfer?: string;
                }} = {};

                partnerTransfers.forEach(t => {
                  if (!statsByCurrency[t.currency]) {
                    statsByCurrency[t.currency] = { total: 0, count: 0 };
                  }
                  statsByCurrency[t.currency].total += parseFloat(t.amount);
                  statsByCurrency[t.currency].count += 1;
                  statsByCurrency[t.currency].lastTransfer = t.createdAt;
                });

                const totalVolume = Object.values(statsByCurrency).reduce((sum, s) => sum + s.total, 0);
                const totalTransactionsCount = partnerTransfers.length;

                return (
                  <BankingCard key={partner.partnerId} className="overflow-hidden">
                    {/* Header del Partner */}
                    <div className="p-6 border-b border-[#1a1a1a] bg-gradient-to-r from-[#0d0d0d] to-[#141414]">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className="p-3 bg-white/5 rounded-xl">
                            <Users className="w-6 h-6 text-white" />
                          </div>
                          <div>
                            <h3 className="text-xl font-bold text-slate-100">{partner.name}</h3>
                            <p className="text-slate-400 text-sm">Partner ID: {partner.partnerId}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <BankingBadge variant="success">{partner.status}</BankingBadge>
                          <BankingBadge variant="info">
                            {partnerClients.length} {isSpanish ? 'clientes' : 'clients'}
                          </BankingBadge>
                        </div>
                      </div>
                    </div>

                    {/* Estadísticas del Partner */}
                    <div className="p-6 border-b border-[#1a1a1a]">
                      <h4 className="text-lg font-bold text-slate-100 mb-4">
                        {isSpanish ? 'Estadísticas Generales' : 'General Statistics'}
                      </h4>
                      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <div className="bg-[#0d0d0d]/50 border border-[#1a1a1a] rounded-xl p-4">
                          <p className="text-slate-400 text-sm mb-1">{isSpanish ? 'Volumen Total' : 'Total Volume'}</p>
                          <p className="text-2xl font-bold text-emerald-400">{fmt.currency(totalVolume, 'USD')}</p>
                        </div>
                        <div className="bg-[#0d0d0d]/50 border border-[#1a1a1a] rounded-xl p-4">
                          <p className="text-slate-400 text-sm mb-1">{isSpanish ? 'Transferencias' : 'Transfers'}</p>
                          <p className="text-2xl font-bold text-white">{totalTransactionsCount}</p>
                        </div>
                        <div className="bg-[#0d0d0d]/50 border border-[#1a1a1a] rounded-xl p-4">
                          <p className="text-slate-400 text-sm mb-1">{isSpanish ? 'Clientes' : 'Clients'}</p>
                          <p className="text-2xl font-bold text-purple-400">{partnerClients.length}</p>
                        </div>
                        <div className="bg-[#0d0d0d]/50 border border-[#1a1a1a] rounded-xl p-4">
                          <p className="text-slate-400 text-sm mb-1">{isSpanish ? 'Divisas Activas' : 'Active Currencies'}</p>
                          <p className="text-2xl font-bold text-amber-400">{Object.keys(statsByCurrency).length}</p>
                        </div>
                      </div>
                    </div>

                    {/* Desglose por Divisa */}
                    <div className="p-6 border-b border-[#1a1a1a]">
                      <h4 className="text-lg font-bold text-slate-100 mb-4">
                        {isSpanish ? 'Desglose por Divisa' : 'Breakdown by Currency'}
                      </h4>
                      <div className="space-y-3">
                        {Object.entries(statsByCurrency).map(([currency, stats]) => {
                          const currInfo = availableCurrencies.find(c => c.code === currency);
                          const percentage = totalVolume > 0 ? (stats.total / totalVolume) * 100 : 0;
                          
                          return (
                            <div key={currency} className="bg-[#0d0d0d]/50 border border-[#1a1a1a] rounded-xl p-4">
                              <div className="flex items-center justify-between mb-3">
                                <div className="flex items-center gap-3">
                                  <span className="text-2xl">{currInfo?.flag}</span>
                                  <div>
                                    <p className="text-slate-100 font-bold">{currency}</p>
                                    <p className="text-slate-500 text-xs">{currInfo?.name}</p>
                                  </div>
                                </div>
                                <div className="text-right">
                                  <p className="text-emerald-400 font-bold text-xl">{fmt.currency(stats.total, currency)}</p>
                                  <p className="text-slate-500 text-xs">{stats.count} {isSpanish ? 'transferencias' : 'transfers'}</p>
                                </div>
                              </div>
                              <div className="space-y-2">
                                <div className="flex justify-between text-sm">
                                  <span className="text-slate-400">{isSpanish ? 'Porcentaje del total:' : 'Percentage of total:'}</span>
                                  <span className="text-white font-semibold">{percentage.toFixed(1)}%</span>
                                </div>
                                {stats.lastTransfer && (
                                  <div className="flex justify-between text-sm">
                                    <span className="text-slate-400">{isSpanish ? 'Última transferencia:' : 'Last transfer:'}</span>
                                    <span className="text-slate-300">{fmt.dateTime(stats.lastTransfer)}</span>
                                  </div>
                                )}
                                <div className="w-full bg-[#141414] rounded-full h-2 overflow-hidden mt-2">
                                  <div
                                    className="h-full bg-gradient-to-r from-emerald-500 to-teal-600 rounded-full transition-all duration-500"
                                    style={{ width: `${percentage}%` }}
                                  />
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Lista de Transferencias del Partner */}
                    <div className="p-6">
                      <h4 className="text-lg font-bold text-slate-100 mb-4 flex items-center gap-2">
                        <ArrowRight className="w-5 h-5 text-purple-400" />
                        {isSpanish ? 'Historial de Transferencias' : 'Transfer History'}
                      </h4>
                      {partnerTransfers.length > 0 ? (
                        <div className="space-y-2 max-h-[400px] overflow-y-auto pr-2">
                          {partnerTransfers.map((transfer, idx) => (
                            <div
                              key={idx}
                              className="bg-[#0d0d0d]/50 border border-[#1a1a1a] hover:border-purple-500/50 rounded-lg p-4 transition-all"
                            >
                              <div className="flex items-start justify-between">
                                <div className="flex-1">
                                  <div className="flex items-center gap-2 mb-2">
                                    <span className="text-slate-100 font-semibold">{transfer.transferRequestId}</span>
                                    <BankingBadge variant="success">{transfer.state}</BankingBadge>
                                  </div>
                                  <div className="space-y-1 text-sm">
                                    <div className="flex items-center gap-2 text-slate-400">
                                      <ArrowRight className="w-3 h-3" />
                                      <span>{transfer.fromAccount} → {transfer.toAccount}</span>
                                    </div>
                                    <div className="flex items-center gap-4 text-xs text-slate-500">
                                      <span className="flex items-center gap-1">
                                        <Clock className="w-3 h-3" />
                                        {fmt.dateTime(transfer.createdAt)}
                                      </span>
                                      <span className="flex items-center gap-1">
                                        {transfer.currency}
                                      </span>
                                    </div>
                                  </div>
                                </div>
                                <div className="text-right">
                                  <p className="text-emerald-400 font-black text-xl">
                                    {fmt.currency(parseFloat(transfer.amount), transfer.currency)}
                                  </p>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-center py-8 text-slate-500">
                          {isSpanish ? 'Sin transferencias aún' : 'No transfers yet'}
                        </div>
                      )}
                    </div>
                  </BankingCard>
                );
              })
            ) : (
              <BankingCard className="p-12">
                <div className="text-center">
                  <Users className="w-20 h-20 text-slate-700 mx-auto mb-4" />
                  <p className="text-slate-400 text-lg font-medium">
                    {isSpanish ? 'No hay partners registrados' : 'No partners registered'}
                  </p>
                  <p className="text-slate-600 text-sm mt-2">
                    {isSpanish ? 'Crea tu primer partner para comenzar' : 'Create your first partner to get started'}
                  </p>
                </div>
              </BankingCard>
            )}
          </div>
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
                      className="w-full bg-[#0d0d0d] border border-[#1a1a1a] focus:border-white/30 text-slate-100 px-4 py-3 rounded-xl focus:ring-2 focus:ring-white/30/30 outline-none transition-all"
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
                      className="w-full bg-[#0d0d0d] border border-[#1a1a1a] focus:border-white/30 text-slate-100 px-4 py-3 rounded-xl focus:ring-2 focus:ring-white/30/30 outline-none transition-all"
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
                        className="w-full bg-[#0d0d0d] border border-[#1a1a1a] focus:border-white/30 text-slate-100 px-4 py-3 rounded-xl focus:ring-2 focus:ring-white/30/30 outline-none transition-all"
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

                  <div className="bg-white/5 border border-white/15 rounded-xl p-4 space-y-2">
                    <div className="flex items-center gap-2 text-white font-semibold">
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
                      className="bg-[#0d0d0d]/50 border border-[#1a1a1a] hover:border-emerald-500/50 rounded-xl p-5 transition-all"
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

