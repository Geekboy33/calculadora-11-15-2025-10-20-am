/**
 * ═══════════════════════════════════════════════════════════════════════════════════════
 * SBERBANK 2 API - SberBusinessAPI (Enterprise)
 * Complete implementation of Sber Business API with OAuth2/OpenID Connect
 * ═══════════════════════════════════════════════════════════════════════════════════════
 * 
 * Service: Sber API: 7328077215_Company
 * Product: SberBusinessAPI
 * Client ID: 25190
 * 
 * Features:
 * - OAuth2 / OpenID Connect Authentication
 * - Account Management (GET_CLIENT_ACCOUNTS)
 * - Statement & Transactions (GET_STATEMENT_ACCOUNT, GET_STATEMENT_TRANSACTION)
 * - Payment Documents (PAY_DOC_RU, PAY_DOC_CUR)
 * - Currency Control (CURR_CONTROL_*)
 * - Corporate Cards (CORPORATE_CARDS)
 * - Crypto Operations (GET_CRYPTO_INFO)
 * - Bank Communications (GENERIC_LETTER_TO_BANK, GENERIC_LETTER_FROM_BANK)
 * 
 * Documentation: https://developers.sber.ru/docs/ru/sber-api/overview
 * Support: supportdbo2@sberbank.ru
 * 
 * ═══════════════════════════════════════════════════════════════════════════════════════
 */

import React, { useState, useEffect } from 'react';
import {
  Building2, Send, History, Settings, CheckCircle, AlertCircle,
  RefreshCw, Wifi, WifiOff, Copy, Eye, EyeOff, Plus,
  FileText, Clock, DollarSign, Users, Shield, Search,
  Download, ExternalLink, Key, Lock, Unlock, Globe,
  CreditCard, Banknote, Receipt, Mail, Phone, MapPin,
  ChevronRight, ChevronDown, Info, AlertTriangle, Loader2,
  Database, Server, Link2, Zap, BookOpen, HelpCircle,
  ArrowLeftRight, List, Hash, Calendar, User, Building, Repeat,
  PenTool as FileSignature, Trash2, Edit3, Save, X, Wallet, LinkIcon
} from 'lucide-react';
import { custodyStore, type CustodyAccount } from '../lib/custody-store';
import { useLanguage } from '../lib/i18n';
import { quickGenerateReceipt, generateSberbankPaymentReceipt } from '../lib/dcb-transfer-receipt';

// ═══════════════════════════════════════════════════════════════════════════════════════
// TRANSLATIONS - ES/EN
// ═══════════════════════════════════════════════════════════════════════════════════════
const sberTranslations = {
  es: {
    // Header & Navigation
    title: 'Sberbank 2 API',
    subtitle: 'SberBusinessAPI Enterprise',
    connected: 'Conectado',
    disconnected: 'Desconectado',
    
    // Tabs
    tabConnection: 'Conexión',
    tabAccounts: 'Cuentas',
    tabPayments: 'Pagos',
    tabPayments2: 'Pagos 2 (Real)',
    tabStatements: 'Extractos',
    tabSignature: 'Firma Digital',
    
    // Connection
    connectionStatus: 'Estado de Conexión',
    apiConfig: 'Configuración API',
    environment: 'Entorno',
    production: 'Producción',
    sandbox: 'Sandbox',
    clientId: 'Client ID',
    accessToken: 'Access Token',
    refreshToken: 'Refresh Token',
    tokenExpires: 'Token expira',
    connect: 'Conectar',
    disconnect: 'Desconectar',
    testConnection: 'Probar Conexión',
    
    // Accounts
    clientAccounts: 'Cuentas del Cliente',
    accountNumber: 'Número de Cuenta',
    balance: 'Balance',
    currency: 'Divisa',
    status: 'Estado',
    loadAccounts: 'Cargar Cuentas',
    noAccounts: 'No hay cuentas cargadas',
    
    // Payments
    createPayment: 'Crear Documento de Pago',
    payerAccount: 'Cuenta Pagador',
    selectPayerAccount: 'Seleccionar Cuenta Pagador',
    selectConfiguredAccount: 'Seleccionar cuenta configurada',
    configuredAccounts: 'Cuentas configuradas en la pestaña "Cuentas"',
    onlyActiveAccounts: 'Solo cuentas activas',
    orSelectApiAccount: 'O seleccionar cuenta API',
    selectApiAccount: 'Seleccionar cuenta API...',
    selectedAccount: 'Cuenta seleccionada',
    
    beneficiaryAccount: 'Cuenta Beneficiario',
    beneficiaryBic: 'BIC Beneficiario',
    beneficiaryName: 'Nombre Beneficiario',
    beneficiaryInn: 'INN Beneficiario',
    beneficiaryKpp: 'KPP Beneficiario',
    
    selectBeneficiary: 'Seleccionar Beneficiario (Guardados)',
    selectBeneficiaryPlaceholder: 'Seleccionar beneficiario',
    savedBeneficiaries: 'Beneficiarios guardados con datos verificados',
    
    amount: 'Monto',
    urgency: 'Urgencia',
    normal: 'Normal',
    urgent: 'Urgente',
    purpose: 'Propósito del Pago',
    
    // Payment 2 (Real)
    payment2Title: 'Crear Pago Real - Sberbank API',
    documentInfo: 'Información del Documento',
    documentNumber: 'Número de Documento',
    documentDate: 'Fecha del Documento',
    externalId: 'ID Externo',
    
    payerInfo: 'Información del Pagador',
    payerName: 'Nombre del Pagador',
    payerInn: 'INN del Pagador',
    payerKpp: 'KPP del Pagador',
    
    beneficiaryInfo: 'Información del Beneficiario',
    bankBic: 'BIC del Banco',
    corrAccount: 'Cuenta Corresponsal',
    
    paymentDetails: 'Detalles del Pago',
    paymentPriority: 'Prioridad de Pago',
    urgencyCode: 'Código de Urgencia',
    
    processingMode: 'Modo de Procesamiento',
    immediateProcessing: 'Procesamiento Inmediato',
    draftMode: 'Modo Borrador',
    
    createPaymentBtn: 'Crear Documento de Pago',
    createPaymentWithSignature: 'Crear Pago con Firma Digital',
    
    // History
    paymentHistory: 'Historial de Pagos',
    noPayments: 'No hay pagos registrados',
    
    // Information panel
    information: 'Información',
    payDocRu: 'Pagos nacionales en rublos',
    payDocCur: 'Pagos internacionales en divisas',
    digitalSignature: 'Firma digital habilitada según estándar Sber (RSA-SHA256 / GOST)',
    
    // Digital Signature
    signatureSystem: 'Sistema de Firma Digital - Estándar Sberbank',
    signatureAlgorithm: 'Algoritmo de Firma',
    signatureFormat: 'Formato de Firma',
    hashAlgorithm: 'Algoritmo Hash',
    
    // Errors & Success
    error: 'Error',
    success: 'Éxito',
    selectPayerError: 'Seleccione una cuenta pagador',
    completeBeneficiaryError: 'Complete la información del beneficiario',
    amountError: 'El monto debe ser mayor a 0.01',
    purposeError: 'El propósito del pago es requerido',
    paymentCreated: 'Pago creado exitosamente',
    signedDigitally: 'Firmado digitalmente',
    
    // Configure Payer Accounts
    configurePayerAccounts: 'Configurar Cuentas Pagador (RUB)',
    addNewAccount: 'Agregar Nueva Cuenta',
    accountName: 'Nombre de la Cuenta',
    bankName: 'Nombre del Banco',
    inn: 'INN',
    kpp: 'KPP',
    saveAccount: 'Guardar Cuenta',
    cancel: 'Cancelar',
    active: 'Activo',
    inactive: 'Inactivo',
    linkedCustody: 'Custodio Vinculado',
    availableBalance: 'Balance Disponible',
    noLinkedAccount: 'Sin cuenta vinculada',
    linkCustodyAccount: 'Vincular Cuenta Custodio',
    selectCustodyAccount: 'Seleccionar cuenta custodio',
    
    // Workflow
    workflowInfo: 'Flujo de Trabajo',
    step1: 'Seleccionar cuenta pagador',
    step2: 'Completar datos del beneficiario',
    step3: 'Especificar monto y propósito',
    step4: 'El sistema firma digitalmente',
    step5: 'Enviar a Sberbank API',
  },
  en: {
    // Header & Navigation
    title: 'Sberbank 2 API',
    subtitle: 'SberBusinessAPI Enterprise',
    connected: 'Connected',
    disconnected: 'Disconnected',
    
    // Tabs
    tabConnection: 'Connection',
    tabAccounts: 'Accounts',
    tabPayments: 'Payments',
    tabPayments2: 'Payments 2 (Real)',
    tabStatements: 'Statements',
    tabSignature: 'Digital Signature',
    
    // Connection
    connectionStatus: 'Connection Status',
    apiConfig: 'API Configuration',
    environment: 'Environment',
    production: 'Production',
    sandbox: 'Sandbox',
    clientId: 'Client ID',
    accessToken: 'Access Token',
    refreshToken: 'Refresh Token',
    tokenExpires: 'Token expires',
    connect: 'Connect',
    disconnect: 'Disconnect',
    testConnection: 'Test Connection',
    
    // Accounts
    clientAccounts: 'Client Accounts',
    accountNumber: 'Account Number',
    balance: 'Balance',
    currency: 'Currency',
    status: 'Status',
    loadAccounts: 'Load Accounts',
    noAccounts: 'No accounts loaded',
    
    // Payments
    createPayment: 'Create Payment Document',
    payerAccount: 'Payer Account',
    selectPayerAccount: 'Select Payer Account',
    selectConfiguredAccount: 'Select configured account',
    configuredAccounts: 'Accounts configured in "Accounts" tab',
    onlyActiveAccounts: 'Only active accounts',
    orSelectApiAccount: 'Or select API account',
    selectApiAccount: 'Select API account...',
    selectedAccount: 'Selected account',
    
    beneficiaryAccount: 'Beneficiary Account',
    beneficiaryBic: 'Beneficiary BIC',
    beneficiaryName: 'Beneficiary Name',
    beneficiaryInn: 'Beneficiary INN',
    beneficiaryKpp: 'Beneficiary KPP',
    
    selectBeneficiary: 'Select Beneficiary (Saved)',
    selectBeneficiaryPlaceholder: 'Select beneficiary',
    savedBeneficiaries: 'Saved beneficiaries with verified data',
    
    amount: 'Amount',
    urgency: 'Urgency',
    normal: 'Normal',
    urgent: 'Urgent',
    purpose: 'Payment Purpose',
    
    // Payment 2 (Real)
    payment2Title: 'Create Real Payment - Sberbank API',
    documentInfo: 'Document Information',
    documentNumber: 'Document Number',
    documentDate: 'Document Date',
    externalId: 'External ID',
    
    payerInfo: 'Payer Information',
    payerName: 'Payer Name',
    payerInn: 'Payer INN',
    payerKpp: 'Payer KPP',
    
    beneficiaryInfo: 'Beneficiary Information',
    bankBic: 'Bank BIC',
    corrAccount: 'Correspondent Account',
    
    paymentDetails: 'Payment Details',
    paymentPriority: 'Payment Priority',
    urgencyCode: 'Urgency Code',
    
    processingMode: 'Processing Mode',
    immediateProcessing: 'Immediate Processing',
    draftMode: 'Draft Mode',
    
    createPaymentBtn: 'Create Payment Document',
    createPaymentWithSignature: 'Create Payment with Digital Signature',
    
    // History
    paymentHistory: 'Payment History',
    noPayments: 'No payments recorded',
    
    // Information panel
    information: 'Information',
    payDocRu: 'National payments in rubles',
    payDocCur: 'International payments in currencies',
    digitalSignature: 'Digital signature enabled per Sber standard (RSA-SHA256 / GOST)',
    
    // Digital Signature
    signatureSystem: 'Digital Signature System - Sberbank Standard',
    signatureAlgorithm: 'Signature Algorithm',
    signatureFormat: 'Signature Format',
    hashAlgorithm: 'Hash Algorithm',
    
    // Errors & Success
    error: 'Error',
    success: 'Success',
    selectPayerError: 'Select a payer account',
    completeBeneficiaryError: 'Complete beneficiary information',
    amountError: 'Amount must be greater than 0.01',
    purposeError: 'Payment purpose is required',
    paymentCreated: 'Payment created successfully',
    signedDigitally: 'Digitally signed',
    
    // Configure Payer Accounts
    configurePayerAccounts: 'Configure Payer Accounts (RUB)',
    addNewAccount: 'Add New Account',
    accountName: 'Account Name',
    bankName: 'Bank Name',
    inn: 'INN',
    kpp: 'KPP',
    saveAccount: 'Save Account',
    cancel: 'Cancel',
    active: 'Active',
    inactive: 'Inactive',
    linkedCustody: 'Linked Custody',
    availableBalance: 'Available Balance',
    noLinkedAccount: 'No linked account',
    linkCustodyAccount: 'Link Custody Account',
    selectCustodyAccount: 'Select custody account',
    
    // Workflow
    workflowInfo: 'Workflow',
    step1: 'Select payer account',
    step2: 'Complete beneficiary data',
    step3: 'Specify amount and purpose',
    step4: 'System signs digitally',
    step5: 'Send to Sberbank API',
  }
};

// ═══════════════════════════════════════════════════════════════════════════════════════
// SBER API CONFIGURATION
// ═══════════════════════════════════════════════════════════════════════════════════════

const SBER_CONFIG = {
  // Connection Parameters - From Official Sber API Documentation
  // https://developers.sber.ru/docs/ru/sber-api/overview
  CLIENT_ID: '25190',
  SERVICE_NAME: '7328077215_Company',
  PRODUCT: 'SberBusinessAPI',
  
  // ═══════════════════════════════════════════════════════════════════════════════
  // PRODUCTION ENVIRONMENT - Промышленная интеграция (Industrial Integration)
  // Source: https://developers.sber.ru/docs/ru/sber-api/overview
  // Updated: 29 октября 2025 (October 29, 2025)
  // ═══════════════════════════════════════════════════════════════════════════════
  
  // Для ссылки авторизации через СберБизнес ID (Authorization via SberBusiness ID)
  AUTH_URL: 'https://sbi.sberbank.ru:9443',
  AUTH_AUTHORIZE_URL: 'https://sbi.sberbank.ru:9443/ic/sso/api/v2/oauth/authorize',
  TOKEN_URL: 'https://sbi.sberbank.ru:9443/oauth/token',
  
  // Вход в тестовую версию СберБизнес (Test version login)
  AUTH_LOGIN_URL: 'https://sbi.sberbank.ru:9443/ic/ufs/login.html',
  
  // Для отправки API запросов (API Requests)
  API_BASE_URL: 'https://fintech.sberbank.ru:9443',
  
  // ═══════════════════════════════════════════════════════════════════════════════
  // TEST ENVIRONMENT - Тестовая среда (Test Environment)
  // ═══════════════════════════════════════════════════════════════════════════════
  AUTH_URL_TEST: 'https://sbi.sberbank.ru:9443',
  TOKEN_URL_TEST: 'https://sbi.sberbank.ru:9443/oauth/token',
  API_BASE_URL_TEST: 'https://iftfintech.testsbi.sberbank.ru:9443',
  
  // ═══════════════════════════════════════════════════════════════════════════════
  // SPECIFIC API ENDPOINTS (Production)
  // ═══════════════════════════════════════════════════════════════════════════════
  
  // Payment Requests API
  PAYMENT_REQUESTS_URL: 'https://fintech.sberbank.ru:9443/v1/payment-requests',
  
  // Statement API
  STATEMENT_URL: 'https://fintech.sberbank.ru:9443/v1/statement',
  
  // Dictionaries API
  DICTS_URL: 'https://fintech.sberbank.ru:9443/fintech/api/v1/dicts',
  
  // Scopes v1
  SCOPE_V1: 'openid di-73433f46-ad93-48ac-bb8b-d288ce3a2638',
  
  // Scopes v2 (Full list)
  SCOPES_V2: [
    'openid', 'acr', 'amr', 'aud', 'auth_time', 'azp', 'exp', 'iat', 'iss', 'nonce', 'sid2', 'sub',
    'BANK_CONTROL_STATEMENT',
    'BB_CREATE_LINK_APP',
    'BUSINESS_CARDS_TRANSFER',
    'CARD_ISSUE_CERTIFICATE_REQUEST',
    'CONFIRMATORY_DOCUMENTS_INQUIRY',
    'CORPORATE_CARDS',
    'CRYPTO_CERT_REQUEST_EIO',
    'CURRENCY_OPERATION_DETAILS',
    'CURR_CONTROL_INFO_REQ',
    'CURR_CONTROL_MESSAGE_FROM_BANK',
    'CURR_CONTROL_MESSAGE_TO_BANK',
    'DEPOSIT_REQUEST_DICT',
    'ENCASHMENTS_REQUEST_FILES',
    'GENERIC_LETTER_FROM_BANK',
    'GENERIC_LETTER_TO_BANK',
    'GET_CLIENT_ACCOUNTS',
    'GET_CORRESPONDENTS',
    'GET_CRYPTO_INFO',
    'GET_CRYPTO_INFO_EIO',
    'GET_STATEMENT_ACCOUNT',
    'GET_STATEMENT_TRANSACTION',
    'MINIMUMBALANCE_REQUEST',
    'NOMINAL_ACCOUNTS_ORGNAME_PAYROLL',
    'PAY_DOC_CUR',
    'PAY_DOC_RU',
    'SALARY_AGREEMENT',
    'SBERRATING_REPORT_FILE',
    'SBERRATING_REPORT_LINK',
    'SBERRATING_TRAFFIC_LIGHT'
  ],
  
  // Available Methods/Endpoints - Based on Official Sber API Documentation
  // https://developers.sber.ru/docs/ru/sber-api/overview
  METHODS: [
    // Accounts & Statements
    { id: 'GET_CLIENT_ACCOUNTS', name: 'Obtener Cuentas', category: 'accounts', icon: 'CreditCard', endpoint: '/accounts' },
    { id: 'GET_STATEMENT_SUMMARY', name: 'Resumen de Cuenta', category: 'statements', icon: 'FileText', endpoint: '/statement/summary' },
    { id: 'GET_STATEMENT_TRANSACTIONS', name: 'Transacciones', category: 'statements', icon: 'List', endpoint: '/v2/statement/transactions' },
    { id: 'GET_CORRESPONDENTS', name: 'Corresponsales', category: 'accounts', icon: 'Users', endpoint: '/correspondents' },
    
    // Payment Requests - Моментальные платежи (Instant Payments)
    { id: 'PAYMENT_REQUEST_OUTGOING', name: 'Requerimiento Pago Saliente', category: 'payments', icon: 'Send', endpoint: '/v1/payment-requests/outgoing' },
    { id: 'PAYMENT_REQUEST_STATE', name: 'Estado Requerimiento', category: 'payments', icon: 'Search', endpoint: '/v1/payment-requests/outgoing/{externalId}/state' },
    { id: 'PAY_DOC_RU', name: 'Pago Nacional (RUB)', category: 'payments', icon: 'Send', endpoint: '/pay-doc-ru' },
    { id: 'PAY_DOC_CUR', name: 'Pago Internacional', category: 'payments', icon: 'Globe', endpoint: '/pay-doc-cur' },
    
    // Corporate Subscriptions - Корпоративные подписки
    { id: 'SUBSCRIPTION_CREATE', name: 'Crear Suscripción', category: 'subscriptions', icon: 'Repeat', endpoint: '/subscriptions' },
    { id: 'SUBSCRIPTION_STATUS', name: 'Estado Suscripción', category: 'subscriptions', icon: 'Search', endpoint: '/subscriptions/{id}/status' },
    
    // Deposits - Депозиты
    { id: 'DEPOSIT_OFFERS', name: 'Ofertas de Depósito', category: 'deposits', icon: 'Banknote', endpoint: '/deposits/offers' },
    { id: 'DEPOSIT_OPEN', name: 'Abrir Depósito', category: 'deposits', icon: 'Plus', endpoint: '/deposits' },
    { id: 'DEPOSIT_STATUS', name: 'Estado Depósito', category: 'deposits', icon: 'Search', endpoint: '/deposits/{id}' },
    
    // Dictionaries
    { id: 'GET_DICTS', name: 'Diccionarios', category: 'dicts', icon: 'Database', endpoint: '/dicts' },
    { id: 'GET_DICT_BIC', name: 'Diccionario BIC', category: 'dicts', icon: 'Database', endpoint: '/dicts?name=bic' },
    
    // Cards
    { id: 'CORPORATE_CARDS', name: 'Tarjetas Corporativas', category: 'cards', icon: 'CreditCard', endpoint: '/corporate-cards' },
    { id: 'BUSINESS_CARDS_TRANSFER', name: 'Transferencia Tarjetas', category: 'cards', icon: 'ArrowLeftRight', endpoint: '/cards/transfer' },
    
    // Currency Control
    { id: 'CURR_CONTROL_INFO_REQ', name: 'Control Divisas Info', category: 'currency', icon: 'DollarSign', endpoint: '/currency-control/info' },
    { id: 'CURR_CONTROL_MESSAGE_TO_BANK', name: 'Mensaje Control Divisas', category: 'currency', icon: 'Send', endpoint: '/currency-control/message' },
    
    // Crypto & Security
    { id: 'GET_CRYPTO_INFO', name: 'Info Crypto', category: 'crypto', icon: 'Key', endpoint: '/crypto/info' },
    { id: 'CRYPTO_CERT_REQUEST_EIO', name: 'Certificado Crypto EIO', category: 'crypto', icon: 'Shield', endpoint: '/crypto/cert-request' },
    
    // Communications
    { id: 'GENERIC_LETTER_TO_BANK', name: 'Carta al Banco', category: 'communications', icon: 'Mail', endpoint: '/letters/to-bank' },
    { id: 'GENERIC_LETTER_FROM_BANK', name: 'Carta del Banco', category: 'communications', icon: 'Mail', endpoint: '/letters/from-bank' },
    
    // Payroll
    { id: 'SALARY_AGREEMENT', name: 'Acuerdo Nómina', category: 'payroll', icon: 'Users', endpoint: '/salary/agreement' },
    
    // Reports
    { id: 'SBERRATING_REPORT', name: 'Reporte SberRating', category: 'reports', icon: 'FileText', endpoint: '/sberrating/report' },
    
    // Integration
    { id: 'BB_CREATE_LINK_APP', name: 'Crear Link App', category: 'integration', icon: 'Link2', endpoint: '/link-app' },
  ],
  
  // Request Fields
  REQUEST_FIELDS: [
    'accounts', 'aud', 'email', 'individualExecutiveAgencyInn', 'iss', 'name',
    'offerExpirationDate', 'orgActualAddress', 'orgFullName', 'orgJuridicalAddress',
    'orgKpp', 'orgLawForm', 'orgLawFormShort', 'orgOgrn', 'orgOktmo',
    'phone_number', 'sub', 'terBank', 'userPosition', 'userSignatureType'
  ],
  
  // Colors
  SBER_GREEN: '#21a038',
  SBER_DARK: '#1a8a30',
};

// ═══════════════════════════════════════════════════════════════════════════════════════
// TYPES & INTERFACES
// ═══════════════════════════════════════════════════════════════════════════════════════

interface SberConfig {
  clientId: string;
  redirectUri: string;
  scopeVersion: 'v1' | 'v2';
  selectedScopes: string[];
  accessToken: string;
  refreshToken: string;
  tokenExpiry: string;
  idToken: string;
  environment: 'sandbox' | 'production';
}

interface TokenResponse {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  token_type: string;
  id_token: string;
  scope: string;
}

interface Account {
  accountNumber: string;
  accountName: string;
  currency: string;
  balance: number;
  availableBalance: number;
  status: string;
  type: string;
  bic: string;
  correspondentAccount: string;
}

interface Transaction {
  id: string;
  date: string;
  amount: number;
  currency: string;
  description: string;
  counterparty: string;
  type: 'credit' | 'debit';
  status: string;
  reference: string;
}

interface ApiLog {
  id: string;
  timestamp: string;
  method: string;
  endpoint: string;
  status: 'success' | 'error' | 'pending';
  responseTime: number;
  request?: any;
  response?: any;
}

interface OrganizationInfo {
  orgFullName: string;
  orgJuridicalAddress: string;
  orgActualAddress: string;
  orgKpp: string;
  orgOgrn: string;
  orgOktmo: string;
  orgLawForm: string;
  orgLawFormShort: string;
  terBank: string;
  individualExecutiveAgencyInn: string;
}

// ═══════════════════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════════════

export function Sberbank2ApiModule() {
  // ─────────────────────────────────────────────────────────────────────────────────────
  // LANGUAGE
  // ─────────────────────────────────────────────────────────────────────────────────────
  const { language } = useLanguage();
  const t = sberTranslations[language] || sberTranslations.en;
  
  // ─────────────────────────────────────────────────────────────────────────────────────
  // STATE
  // ─────────────────────────────────────────────────────────────────────────────────────
  
  const [config, setConfig] = useState<SberConfig>(() => {
    const saved = localStorage.getItem('sber_business_api_config');
    if (saved) {
      return JSON.parse(saved);
    }
    return {
      clientId: SBER_CONFIG.CLIENT_ID,
      redirectUri: '',
      scopeVersion: 'v2' as const,
      selectedScopes: [...SBER_CONFIG.SCOPES_V2],
      accessToken: '',
      refreshToken: '',
      tokenExpiry: '',
      idToken: '',
      environment: 'production' as const,
    };
  });

  const [connectionStatus, setConnectionStatus] = useState<'connected' | 'disconnected' | 'checking'>('disconnected');
  const [activeTab, setActiveTab] = useState<'dashboard' | 'accounts' | 'payments' | 'payments2' | 'statements' | 'methods' | 'oauth' | 'settings' | 'docs'>('dashboard');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [sandboxMode, setSandboxMode] = useState(false); // Disabled - using production
  
  // Data States
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [apiLogs, setApiLogs] = useState<ApiLog[]>(() => {
    const saved = localStorage.getItem('sber_api_logs');
    return saved ? JSON.parse(saved) : [];
  });
  
  // Organization Info
  const [orgInfo, setOrgInfo] = useState<OrganizationInfo>(() => {
    const saved = localStorage.getItem('sber_org_info');
    return saved ? JSON.parse(saved) : {
      orgFullName: '',
      orgJuridicalAddress: '',
      orgActualAddress: '',
      orgKpp: '',
      orgOgrn: '',
      orgOktmo: '',
      orgLawForm: '',
      orgLawFormShort: '',
      terBank: '',
      individualExecutiveAgencyInn: '',
    };
  });
  
  // Payment Form (Simple)
  const [paymentForm, setPaymentForm] = useState({
    payerAccount: '',
    payeeAccount: '',
    payeeName: '',
    payeeInn: '',
    payeeKpp: '',
    payeeBic: '',
    amount: 0,
    purpose: '',
    urgency: 'normal',
  });

  // ═══════════════════════════════════════════════════════════════════════════════════════
  // PAGOS 2 - Complete Payment Form (Real Sberbank Integration)
  // ═══════════════════════════════════════════════════════════════════════════════════════
  
  const [payment2Form, setPayment2Form] = useState({
    // Document Info
    number: '',
    date: new Date().toISOString().split('T')[0],
    externalId: `SBER-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    // Amount & Priority
    amount: 0,
    operationCode: '01',
    priority: '3',
    urgencyCode: 'NORMAL',
    purpose: '',
    // Payer
    payerName: '',
    payerInn: '',
    payerKpp: '',
    payerAccount: '',
    payerBankBic: '',
    payerBankCorrAccount: '',
    // Payee
    payeeName: '',
    payeeInn: '',
    payeeKpp: '',
    payeeAccount: '',
    payeeBankBic: '',
    payeeBankCorrAccount: '',
  });

  const [payment2History, setPayment2History] = useState<any[]>(() => {
    const saved = localStorage.getItem('sber2_payment_history');
    return saved ? JSON.parse(saved) : [];
  });

  // Payment history for simple payments (Pagos tab)
  const [simplePaymentHistory, setSimplePaymentHistory] = useState<any[]>(() => {
    const saved = localStorage.getItem('sberbank_payment_history');
    return saved ? JSON.parse(saved) : [];
  });

  const [immediateProcessing, setImmediateProcessing] = useState(true);

  // ═══════════════════════════════════════════════════════════════════════════════════════
  // CUENTAS PAGADOR RUB - Configurables (Guardadas en LocalStorage)
  // ═══════════════════════════════════════════════════════════════════════════════════════
  
  interface PayerAccountConfig {
    id: string;
    name: string;           // Nombre descriptivo de la cuenta
    payerName: string;      // Nombre legal del pagador (160 chars max)
    payerInn: string;       // INN del pagador (10-12 dígitos)
    payerKpp: string;       // KPP del pagador (9 dígitos)
    account: string;        // Número de cuenta (20 dígitos)
    bankBic: string;        // BIC del banco (9 dígitos)
    corrAccount: string;    // Cuenta corresponsal (20 dígitos)
    bankName: string;       // Nombre del banco
    currency: string;       // Moneda (RUB)
    isActive: boolean;      // Si la cuenta está activa
    createdAt: string;      // Fecha de creación
    // Vinculación con Cuenta Custodio
    linkedCustodyAccountId?: string;  // ID de cuenta custodio vinculada
    linkedCustodyAccountName?: string; // Nombre de la cuenta custodio
  }

  const defaultPayerAccounts: PayerAccountConfig[] = [
    // ═══════════════════════════════════════════════════════════════════════════════════════
    // PAYER ACCOUNTS - Cuentas Pagadoras (Solo ООО "ПОИНТЕР" como principal)
    // ═══════════════════════════════════════════════════════════════════════════════════════
    { 
      id: 'settlement-pointer', 
      name: '★ ООО "ПОИНТЕР" - Settlement Account (Corporate)', 
      payerName: 'ООО "ПОИНТЕР"', 
      payerInn: '7328077215', 
      payerKpp: '732801001', 
      account: '40702810669000001880', 
      bankBic: '047308602', 
      corrAccount: '30101810000000000602', 
      bankName: 'УЛЬЯНОВСКОЕ ОТДЕЛЕНИЕ N8588 ПАО СБЕРБАНК', 
      currency: 'RUB', 
      isActive: true, 
      createdAt: new Date().toISOString() 
    },
  ];

  const [payerAccountsConfig, setPayerAccountsConfig] = useState<PayerAccountConfig[]>(() => {
    const saved = localStorage.getItem('sber2_payer_accounts');
    if (saved) {
      const parsed = JSON.parse(saved);
      // Asegurar que la cuenta ООО "ПОИНТЕР" SIEMPRE exista como primera opción
      const pointerAccount = parsed.find((acc: PayerAccountConfig) => acc.account === '40702810669000001880');
      if (!pointerAccount) {
        // Agregar cuenta ООО "ПОИНТЕР" al principio
        return [defaultPayerAccounts[0], ...parsed];
      }
      // Asegurar que ООО "ПОИНТЕР" esté al principio
      const otherAccounts = parsed.filter((acc: PayerAccountConfig) => acc.account !== '40702810669000001880');
      return [pointerAccount, ...otherAccounts];
    }
    return defaultPayerAccounts;
  });
  
  // Forzar actualización de la cuenta ООО "ПОИНТЕР" si no está presente o tiene datos incorrectos
  useEffect(() => {
    const pointerAccount = payerAccountsConfig.find(acc => acc.account === '40702810669000001880');
    if (!pointerAccount || pointerAccount.payerName !== 'ООО "ПОИНТЕР"') {
      // Actualizar con datos correctos
      const updatedPointer = defaultPayerAccounts[0];
      const otherAccounts = payerAccountsConfig.filter(acc => acc.account !== '40702810669000001880');
      setPayerAccountsConfig([updatedPointer, ...otherAccounts]);
    }
  }, []);

  // Formulario para nueva cuenta pagador
  const [newPayerAccount, setNewPayerAccount] = useState<Omit<PayerAccountConfig, 'id' | 'createdAt'>>({
    name: '',
    payerName: '',
    payerInn: '',
    payerKpp: '',
    account: '',
    bankBic: '',
    corrAccount: '',
    bankName: '',
    currency: 'RUB',
    isActive: true,
    linkedCustodyAccountId: undefined,
    linkedCustodyAccountName: undefined,
  });

  const [editingPayerAccountId, setEditingPayerAccountId] = useState<string | null>(null);
  const [showPayerAccountForm, setShowPayerAccountForm] = useState(false);

  // Cuentas Custodio disponibles (desde custody-store)
  const [custodyAccounts, setCustodyAccounts] = useState<CustodyAccount[]>([]);

  // Cargar cuentas custodio
  useEffect(() => {
    const loadCustodyAccounts = () => {
      const allAccounts = custodyStore.getAccounts();
      // Filtrar solo cuentas con moneda RUB o que puedan usarse para RUB
      const rubAccounts = allAccounts.filter(acc => 
        acc.currency === 'RUB' || acc.currency === 'RUR' || acc.currency === 'USD' || acc.currency === 'EUR'
      );
      setCustodyAccounts(rubAccounts);
    };
    
    loadCustodyAccounts();
    // Escuchar cambios en custody store
    const unsubscribe = custodyStore.subscribe(loadCustodyAccounts);
    return () => unsubscribe();
  }, []);

  // Vincular cuenta pagador con cuenta custodio
  const handleLinkCustodyAccount = (payerAccountId: string, custodyAccountId: string) => {
    const custodyAccount = custodyAccounts.find(acc => acc.id === custodyAccountId);
    setPayerAccountsConfig(prev => prev.map(acc => 
      acc.id === payerAccountId 
        ? { 
            ...acc, 
            linkedCustodyAccountId: custodyAccountId,
            linkedCustodyAccountName: custodyAccount?.accountName || ''
          }
        : acc
    ));
    setSuccess(`✅ Cuenta custodio vinculada: ${custodyAccount?.accountName}`);
  };

  // Desvincular cuenta custodio
  const handleUnlinkCustodyAccount = (payerAccountId: string) => {
    setPayerAccountsConfig(prev => prev.map(acc => 
      acc.id === payerAccountId 
        ? { ...acc, linkedCustodyAccountId: undefined, linkedCustodyAccountName: undefined }
        : acc
    ));
    setSuccess('Cuenta custodio desvinculada');
  };

  // Obtener balance disponible de cuenta custodio vinculada
  const getLinkedCustodyBalance = (payerAccount: PayerAccountConfig): { balance: number; currency: string } | null => {
    if (!payerAccount.linkedCustodyAccountId) return null;
    const custodyAccount = custodyAccounts.find(acc => acc.id === payerAccount.linkedCustodyAccountId);
    if (!custodyAccount) return null;
    return { balance: custodyAccount.availableBalance, currency: custodyAccount.currency };
  };

  // Guardar cuentas pagador en localStorage
  useEffect(() => {
    localStorage.setItem('sber2_payer_accounts', JSON.stringify(payerAccountsConfig));
  }, [payerAccountsConfig]);

  // Agregar nueva cuenta pagador
  const handleAddPayerAccount = () => {
    if (!newPayerAccount.name || !newPayerAccount.payerName || !newPayerAccount.payerInn || !newPayerAccount.account || !newPayerAccount.bankBic) {
      setError('Complete todos los campos requeridos (*)');
      return;
    }
    if (newPayerAccount.payerInn.length < 10 || newPayerAccount.payerInn.length > 12) {
      setError('INN debe tener 10-12 dígitos');
      return;
    }
    if (newPayerAccount.account.length !== 20) {
      setError('Número de cuenta debe tener 20 dígitos');
      return;
    }
    if (newPayerAccount.bankBic.length !== 9) {
      setError('BIC debe tener 9 dígitos');
      return;
    }

    const newAccount: PayerAccountConfig = {
      ...newPayerAccount,
      id: `payer_${Date.now()}`,
      createdAt: new Date().toISOString(),
    };

    setPayerAccountsConfig(prev => [...prev, newAccount]);
    setNewPayerAccount({
      name: '', payerName: '', payerInn: '', payerKpp: '', account: '',
      bankBic: '', corrAccount: '', bankName: '', currency: 'RUB', isActive: true,
    });
    setShowPayerAccountForm(false);
    setSuccess('✅ Cuenta pagador agregada exitosamente');
  };

  // Editar cuenta pagador
  const handleEditPayerAccount = (account: PayerAccountConfig) => {
    setEditingPayerAccountId(account.id);
    setNewPayerAccount({
      name: account.name,
      payerName: account.payerName,
      payerInn: account.payerInn,
      payerKpp: account.payerKpp,
      account: account.account,
      bankBic: account.bankBic,
      corrAccount: account.corrAccount,
      bankName: account.bankName,
      currency: account.currency,
      isActive: account.isActive,
    });
    setShowPayerAccountForm(true);
  };

  // Actualizar cuenta pagador
  const handleUpdatePayerAccount = () => {
    if (!editingPayerAccountId) return;
    
    setPayerAccountsConfig(prev => prev.map(acc => 
      acc.id === editingPayerAccountId 
        ? { ...acc, ...newPayerAccount }
        : acc
    ));
    
    setEditingPayerAccountId(null);
    setNewPayerAccount({
      name: '', payerName: '', payerInn: '', payerKpp: '', account: '',
      bankBic: '', corrAccount: '', bankName: '', currency: 'RUB', isActive: true,
    });
    setShowPayerAccountForm(false);
    setSuccess('✅ Cuenta actualizada exitosamente');
  };

  // Eliminar cuenta pagador
  const handleDeletePayerAccount = (id: string) => {
    setPayerAccountsConfig(prev => prev.filter(acc => acc.id !== id));
    setSuccess('Cuenta eliminada');
  };

  // Toggle cuenta activa/inactiva
  const handleTogglePayerAccountActive = (id: string) => {
    setPayerAccountsConfig(prev => prev.map(acc => 
      acc.id === id ? { ...acc, isActive: !acc.isActive } : acc
    ));
  };

  // Usar cuentas configuradas como predefinidas (solo las activas)
  const predefinedPayerAccounts = payerAccountsConfig.filter(acc => acc.isActive);

  // ═══════════════════════════════════════════════════════════════════════════════════════
  // PAYEE/BENEFICIARY ACCOUNTS - Cuentas Receptoras (Beneficiarios)
  // ═══════════════════════════════════════════════════════════════════════════════════════
  const predefinedPayeeAccounts = [
    // ООО "ПОИНТЕР" (puede ser receptor también)
    { id: 'pointer', name: '★ ООО "ПОИНТЕР" - Settlement Account', payeeName: 'ООО "ПОИНТЕР"', payeeInn: '7328077215', payeeKpp: '732801001', account: '40702810669000001880', bankBic: '047308602', corrAccount: '30101810000000000602', bankName: 'УЛЬЯНОВСКОЕ ОТДЕЛЕНИЕ N8588 ПАО СБЕРБАНК' },
    
    // Cuentas anteriores movidas a receptores
    { id: 'elena', name: 'KAMENSKIKH ELENA VLADIMIROVNA - Personal', payeeName: 'KAMENSKIKH ELENA VLADIMIROVNA', payeeInn: '7707083893', payeeKpp: '183502001', account: '40817810268783338156', bankBic: '049401601', corrAccount: '30101810400000000601', bankName: 'UDMURTSKOE OTDELENIE N8618 PAO SBERBANK' },
    { id: 'sber-moscow', name: 'PAO SBERBANK - Moscow', payeeName: 'ПАО СБЕРБАНК', payeeInn: '7707083893', payeeKpp: '773601001', account: '40702810938000000001', bankBic: '044525225', corrAccount: '30101810400000000225', bankName: 'ПАО СБЕРБАНК (Москва)' },
    
    // Otros beneficiarios
    { id: 'p1', name: 'Empresa ABC LLC', payeeName: 'OOO "ABC COMPANY"', payeeInn: '7701234567', payeeKpp: '770101001', account: '40702810100000099999', bankBic: '044525225', corrAccount: '30101810400000000225', bankName: 'Sberbank' },
    { id: 'p2', name: 'Federal Tax Service (FNS)', payeeName: 'ФНС РОССИИ', payeeInn: '7707329152', payeeKpp: '', account: '40101810045250010041', bankBic: '044525000', corrAccount: '', bankName: 'Банк России' },
    { id: 'p3', name: 'Supplier XYZ', payeeName: 'OOO "XYZ SUPPLIER"', payeeInn: '7702987654', payeeKpp: '770201001', account: '40702810200000088888', bankBic: '044525187', corrAccount: '30101810700000000187', bankName: 'ВТБ' },
  ];

  // Generate new External ID for Payments 2
  const generatePayment2ExternalId = () => {
    setPayment2Form(prev => ({
      ...prev,
      externalId: `SBER-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    }));
  };

  // Select Payer Account for Payments 2
  const handleSelectPayerAccount2 = (accountId: string) => {
    const account = predefinedPayerAccounts.find(a => a.id === accountId);
    if (account) {
      setPayment2Form(prev => ({
        ...prev,
        payerName: account.payerName,
        payerInn: account.payerInn,
        payerKpp: account.payerKpp,
        payerAccount: account.account,
        payerBankBic: account.bankBic,
        payerBankCorrAccount: account.corrAccount,
      }));
    }
  };

  // Select Payee Account for Payments 2
  const handleSelectPayeeAccount2 = (accountId: string) => {
    const account = predefinedPayeeAccounts.find(a => a.id === accountId);
    if (account) {
      setPayment2Form(prev => ({
        ...prev,
        payeeName: account.payeeName,
        payeeInn: account.payeeInn,
        payeeKpp: account.payeeKpp,
        payeeAccount: account.account,
        payeeBankBic: account.bankBic,
        payeeBankCorrAccount: account.corrAccount,
      }));
    }
  };

  // Create Payment (Simple - Tab Pagos)
  const handleCreatePayment = async () => {
    // ═══════════════════════════════════════════════════════════════════════════════
    // REAL SBERBANK API PAYMENT - with Multi-Signature (3 signatures)
    // ═══════════════════════════════════════════════════════════════════════════════
    
    // Validate required fields
    if (!paymentForm.payerAccount) {
      setError(language === 'es' ? 'Seleccione una cuenta pagador' : 'Select a payer account');
      return;
    }
    if (!paymentForm.payeeAccount || !paymentForm.payeeBic) {
      setError(language === 'es' ? 'Complete la información del beneficiario (cuenta y BIC)' : 'Complete beneficiary information (account and BIC)');
      return;
    }
    if (!paymentForm.payeeName) {
      setError(language === 'es' ? 'Ingrese el nombre del beneficiario' : 'Enter beneficiary name');
      return;
    }
    if (!paymentForm.amount || paymentForm.amount < 0.01) {
      setError(language === 'es' ? 'El monto debe ser mayor a 0.01 RUB' : 'Amount must be greater than 0.01 RUB');
      return;
    }
    if (!paymentForm.purpose) {
      setError(language === 'es' ? 'El propósito del pago es requerido' : 'Payment purpose is required');
      return;
    }

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      console.log('[Sberbank] ═══════════════════════════════════════════════════════════');
      console.log('[Sberbank] 🚀 INITIATING REAL PAYMENT via Sberbank API');
      console.log('[Sberbank] ═══════════════════════════════════════════════════════════');
      console.log('[Sberbank] Amount:', paymentForm.amount, 'RUB');
      console.log('[Sberbank] Payer Account:', paymentForm.payerAccount);
      console.log('[Sberbank] Beneficiary:', paymentForm.payeeName);
      console.log('[Sberbank] Purpose:', paymentForm.purpose?.substring(0, 50));

      // Get payer account details from configured accounts
      const payerConfig = payerAccountsConfig.find(acc => acc.account === paymentForm.payerAccount);
      
      // Call the REAL payment creation endpoint with multi-signature
      const paymentResponse = await fetch(`${API_BASE}/api/sber-business/payments/create`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          payment: {
            // Document info
            documentNumber: `${Date.now()}`.slice(-8),
            externalId: `SBER-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            date: new Date().toISOString().split('T')[0],
            amount: paymentForm.amount,
            currency: 'RUB',
            operationCode: '01',
            priority: paymentForm.urgency === 'urgent' ? '1' : '5',
            urgencyCode: paymentForm.urgency === 'urgent' ? 'BESP' : 'NORMAL',
            purpose: paymentForm.purpose,
            // Payer (from configured account or defaults)
            payerName: payerConfig?.payerName || 'OOO Company',
            payerInn: payerConfig?.payerInn || '7328077215',
            payerKpp: payerConfig?.payerKpp || '732801001',
            payerAccount: paymentForm.payerAccount,
            payerBankBic: payerConfig?.bankBic || '044525225',
            payerBankCorrAccount: payerConfig?.corrAccount || '30101810400000000225',
            // Payee
            payeeName: paymentForm.payeeName,
            payeeInn: paymentForm.payeeInn || '',
            payeeKpp: paymentForm.payeeKpp || '',
            payeeAccount: paymentForm.payeeAccount,
            payeeBic: paymentForm.payeeBic,
            payeeBankCorrAccount: '',
          },
          immediate: true, // Process immediately with signatures
        }),
      });

      const paymentData = await paymentResponse.json();
      
      console.log('[Sberbank] API Response:', paymentData);

      if (!paymentData.success) {
        throw new Error(paymentData.error || (language === 'es' ? 'Error al crear el pago' : 'Error creating payment'));
      }

      // Create history entry with full details
      const historyEntry = {
        id: `pay_${Date.now()}`,
        externalId: paymentData.payment?.externalId || `SBER-${Date.now()}`,
        number: paymentData.payment?.documentNumber || `${Date.now()}`.slice(-8),
        date: new Date().toISOString().split('T')[0],
        amount: paymentForm.amount,
        status: paymentData.payment?.status || 'PENDING',
        mode: paymentData.mode, // REAL, LOCAL, LOCAL_WITH_ERROR, LOCAL_API_UNREACHABLE
        payerAccount: paymentForm.payerAccount,
        payerName: payerConfig?.payerName || 'OOO Company',
        payerInn: payerConfig?.payerInn,
        payeeName: paymentForm.payeeName,
        payeeInn: paymentForm.payeeInn,
        payeeAccount: paymentForm.payeeAccount,
        payeeBic: paymentForm.payeeBic,
        purpose: paymentForm.purpose,
        createdAt: new Date().toISOString(),
        // Multi-signature info
        multiSignature: paymentData.multiSignature,
        digest: paymentData.digest,
        sberRequestId: paymentData.payment?.sberRequestId,
        latency: paymentData.latency,
        signature: paymentData.digest || `MULTI-SIG-${Date.now()}`,
      };

      // Add to history (using React state for reactivity)
      const newHistory = [historyEntry, ...simplePaymentHistory];
      setSimplePaymentHistory(newHistory);
      localStorage.setItem('sberbank_payment_history', JSON.stringify(newHistory));

      // AUTO-GENERATE PROFESSIONAL PDF RECEIPT with Multi-Signature
      try {
        generateSberbankPaymentReceipt({
          id: historyEntry.id,
          externalId: historyEntry.externalId,
          amount: historyEntry.amount,
          currency: 'RUB',
          date: historyEntry.date,
          status: historyEntry.status,
          mode: historyEntry.mode,
          // Payer
          payerName: historyEntry.payerName,
          payerInn: historyEntry.payerInn,
          payerAccount: historyEntry.payerAccount,
          // Payee
          payeeName: historyEntry.payeeName,
          payeeInn: historyEntry.payeeInn,
          payeeAccount: historyEntry.payeeAccount,
          payeeBankBic: historyEntry.payeeBic,
          // Details
          purpose: historyEntry.purpose,
          // Multi-Signature
          multiSignature: historyEntry.multiSignature,
          digest: historyEntry.digest,
        });
        console.log('[Sberbank] Professional PDF Receipt generated:', historyEntry.externalId);
      } catch (pdfError) {
        console.warn('[Sberbank] Failed to generate PDF:', pdfError);
      }

      // Reset form
      setPaymentForm({
        payerAccount: '',
        payeeAccount: '',
        payeeName: '',
        payeeInn: '',
        payeeKpp: '',
        payeeBic: '',
        amount: 0,
        purpose: '',
        urgency: 'normal',
      });

      // Success message with mode and signature info
      const sigCount = paymentData.multiSignature?.collectedSignatures || 0;
      const modeLabel = paymentData.mode === 'REAL' 
        ? (language === 'es' ? '🌐 ENVIADO A SBERBANK API' : '🌐 SENT TO SBERBANK API')
        : (language === 'es' ? '📝 Firmado localmente' : '📝 Signed locally');
      
      const successMsg = language === 'es'
        ? `✅ PAGO REAL CREADO | ID: ${historyEntry.externalId.slice(0, 20)}... | ${sigCount}/3 firmas | ${modeLabel} | 📄 PDF descargado`
        : `✅ REAL PAYMENT CREATED | ID: ${historyEntry.externalId.slice(0, 20)}... | ${sigCount}/3 signatures | ${modeLabel} | 📄 PDF downloaded`;
      
      setSuccess(successMsg);
      
      addApiLog('PAY_DOC_RU_REAL', '/api/sber-business/payments/create', paymentData.mode === 'REAL' ? 'success' : 'pending', paymentData.latency || 0, paymentForm, paymentData);
      
    } catch (err: unknown) {
      console.error('[Sberbank] Error creating REAL payment:', err);
      const errorMsg = err instanceof Error ? err.message : (language === 'es' ? 'Error al crear el pago real' : 'Error creating real payment');
      setError(`❌ ${errorMsg}`);
      addApiLog('PAY_DOC_RU_REAL', '/api/sber-business/payments/create', 'error', 0, paymentForm, { error: errorMsg });
    } finally {
      setLoading(false);
    }
  };

  // Create Payment 2 (Real Sberbank with Multi-Signature) - Alternative Form
  const handleCreatePayment2 = async () => {
    // Validate
    if (!payment2Form.payerName || !payment2Form.payerInn || !payment2Form.payerAccount) {
      setError(language === 'es' ? 'Complete la información del pagador' : 'Complete payer information');
      return;
    }
    if (!payment2Form.payeeName || !payment2Form.payeeBankBic) {
      setError(language === 'es' ? 'Complete la información del beneficiario' : 'Complete beneficiary information');
      return;
    }
    if (!payment2Form.amount || payment2Form.amount < 0.01) {
      setError(language === 'es' ? 'El monto debe ser mayor a 0.01' : 'Amount must be greater than 0.01');
      return;
    }
    if (!payment2Form.purpose) {
      setError(language === 'es' ? 'El propósito del pago es requerido' : 'Payment purpose is required');
      return;
    }

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      // Call real payment endpoint with multi-signature
      const paymentResponse = await fetch(`${API_BASE}/api/sber-business/payments/create`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          payment: {
            documentNumber: payment2Form.number || `${Date.now()}`.slice(-8),
            externalId: payment2Form.externalId,
            date: payment2Form.date,
            amount: payment2Form.amount,
            currency: 'RUB',
            operationCode: payment2Form.operationCode || '01',
            priority: payment2Form.priority,
            urgencyCode: payment2Form.urgencyCode,
            purpose: payment2Form.purpose,
            // Payer
            payerName: payment2Form.payerName,
            payerInn: payment2Form.payerInn,
            payerKpp: payment2Form.payerKpp,
            payerAccount: payment2Form.payerAccount,
            payerBankBic: payment2Form.payerBankBic,
            payerBankCorrAccount: payment2Form.payerBankCorrAccount,
            // Payee
            payeeName: payment2Form.payeeName,
            payeeInn: payment2Form.payeeInn,
            payeeKpp: payment2Form.payeeKpp,
            payeeAccount: payment2Form.payeeAccount,
            payeeBic: payment2Form.payeeBankBic,
            payeeBankCorrAccount: payment2Form.payeeBankCorrAccount,
          },
          immediate: immediateProcessing,
        }),
      });

      const paymentData = await paymentResponse.json();

      if (!paymentData.success) {
        throw new Error(paymentData.error || 'Error creating payment');
      }

      // Create payment history entry with multi-signature info
      const historyEntry = {
        id: `sber2_${Date.now()}`,
        externalId: paymentData.payment?.externalId || payment2Form.externalId,
        number: paymentData.payment?.documentNumber || payment2Form.number || `RPO-${Date.now().toString().slice(-8)}`,
        date: payment2Form.date,
        amount: payment2Form.amount,
        status: paymentData.payment?.status || (immediateProcessing ? 'PENDING' : 'DRAFT'),
        mode: paymentData.mode, // REAL, LOCAL, LOCAL_WITH_ERROR, LOCAL_API_UNREACHABLE
        payerName: payment2Form.payerName,
        payerInn: payment2Form.payerInn,
        payerAccount: payment2Form.payerAccount,
        payeeName: payment2Form.payeeName,
        payeeInn: payment2Form.payeeInn,
        payeeAccount: payment2Form.payeeAccount,
        payeeBankBic: payment2Form.payeeBankBic,
        purpose: payment2Form.purpose,
        priority: payment2Form.priority,
        urgencyCode: payment2Form.urgencyCode,
        createdAt: new Date().toISOString(),
        // Multi-signature info
        multiSignature: paymentData.multiSignature,
        digest: paymentData.digest,
        sberRequestId: paymentData.payment?.sberRequestId,
        latency: paymentData.latency,
      };

      const newHistory = [historyEntry, ...payment2History];
      setPayment2History(newHistory);
      localStorage.setItem('sber2_payment_history', JSON.stringify(newHistory));

      // AUTO-GENERATE PROFESSIONAL PDF RECEIPT with Multi-Signature
      try {
        generateSberbankPaymentReceipt({
          id: historyEntry.id,
          externalId: historyEntry.externalId,
          amount: historyEntry.amount,
          currency: 'RUB',
          date: historyEntry.date,
          status: historyEntry.status,
          mode: historyEntry.mode,
          // Payer
          payerName: historyEntry.payerName,
          payerInn: historyEntry.payerInn,
          payerKpp: payment2Form.payerKpp,
          payerAccount: historyEntry.payerAccount,
          payerBankBic: payment2Form.payerBankBic,
          // Payee
          payeeName: historyEntry.payeeName,
          payeeInn: historyEntry.payeeInn,
          payeeKpp: payment2Form.payeeKpp,
          payeeAccount: historyEntry.payeeAccount,
          payeeBankBic: historyEntry.payeeBankBic,
          // Details
          purpose: historyEntry.purpose,
          // Multi-Signature
          multiSignature: historyEntry.multiSignature,
          digest: historyEntry.digest,
        });
        console.log('[Sberbank2] Professional PDF Receipt generated for payment:', historyEntry.externalId);
      } catch (pdfError) {
        console.warn('[Sberbank2] Failed to auto-generate PDF:', pdfError);
      }

      // Reset form
      setPayment2Form(prev => ({
        ...prev,
        number: '',
        externalId: `SBER-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        amount: 0,
        purpose: '',
        payeeName: '',
        payeeInn: '',
        payeeKpp: '',
        payeeAccount: '',
        payeeBankBic: '',
        payeeBankCorrAccount: '',
      }));

      // Success message with mode and signature info
      const sigCount = paymentData.multiSignature?.collectedSignatures || 0;
      const modeLabel = paymentData.mode === 'REAL' 
        ? (language === 'es' ? 'Enviado a Sberbank' : 'Sent to Sberbank')
        : (language === 'es' ? 'Firmado localmente' : 'Signed locally');
      
      const successMsg = language === 'es'
        ? `✅ Pago creado exitosamente. ID: ${historyEntry.externalId.slice(0, 20)}... | ${sigCount} firmas | ${modeLabel} | 📄 Recibo PDF descargado`
        : `✅ Payment created successfully. ID: ${historyEntry.externalId.slice(0, 20)}... | ${sigCount} signatures | ${modeLabel} | 📄 PDF Receipt downloaded`;
      
      setSuccess(successMsg);
      
      addApiLog('PAY_DOC_RU', '/api/sber-business/payments/create', 'success', paymentData.latency || 0, payment2Form, paymentData);

    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : (language === 'es' ? 'Error al crear el pago' : 'Error creating payment');
      setError(`Error: ${errorMsg}`);
      addApiLog('PAY_DOC_RU', '/api/sber-business/payments/create', 'error', 0, payment2Form, { error: errorMsg });
    } finally {
      setLoading(false);
    }
  };
  
  // Statement Request
  const [statementRequest, setStatementRequest] = useState({
    accountNumber: '',
    dateFrom: new Date().toISOString().split('T')[0],
    dateTo: new Date().toISOString().split('T')[0],
  });
  
  // Selected Method for API Testing
  const [selectedMethod, setSelectedMethod] = useState('');
  const [methodParams, setMethodParams] = useState<Record<string, string>>({});
  const [methodResponse, setMethodResponse] = useState<any>(null);

  // ─────────────────────────────────────────────────────────────────────────────────────
  // EFFECTS
  // ─────────────────────────────────────────────────────────────────────────────────────

  useEffect(() => {
    localStorage.setItem('sber_business_api_config', JSON.stringify(config));
  }, [config]);

  useEffect(() => {
    localStorage.setItem('sber_api_logs', JSON.stringify(apiLogs.slice(0, 100)));
  }, [apiLogs]);

  useEffect(() => {
    localStorage.setItem('sber_org_info', JSON.stringify(orgInfo));
  }, [orgInfo]);

  useEffect(() => {
    if (config.accessToken && config.tokenExpiry) {
      const expiry = new Date(config.tokenExpiry);
      if (expiry > new Date()) {
        setConnectionStatus('connected');
      } else {
        setConnectionStatus('disconnected');
      }
    }
  }, [config.accessToken, config.tokenExpiry]);

  // ─────────────────────────────────────────────────────────────────────────────────────
  // HANDLERS
  // ─────────────────────────────────────────────────────────────────────────────────────

  const generateAuthUrl = () => {
    const scopes = config.scopeVersion === 'v1' 
      ? SBER_CONFIG.SCOPE_V1 
      : config.selectedScopes.join(' ');
    
    const state = Math.random().toString(36).substring(7);
    const nonce = Math.random().toString(36).substring(7);
    
    const params = new URLSearchParams({
      response_type: 'code',
      client_id: config.clientId,
      redirect_uri: config.redirectUri,
      scope: scopes,
      state: state,
      nonce: nonce,
    });
    
    return `${SBER_CONFIG.AUTH_URL}?${params.toString()}`;
  };

  // Backend API URL - Sberbank API Server
  const API_BASE = 'http://localhost:3001';
  
  // Test credentials state
  const [testLogin, setTestLogin] = useState({
    login: '',
    password: '',
  });

  const handleInitiateOAuth = async () => {
    if (!config.redirectUri) {
      setError('Configure el Redirect URI primero');
      return;
    }
    
    setLoading(true);
    try {
      // Get auth URL from backend
      const response = await fetch(`${API_BASE}/api/sber-business/auth/url`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          redirectUri: config.redirectUri,
          scopeVersion: config.scopeVersion,
        }),
      });
      
      const data = await response.json();
      
      if (data.success && data.authUrl) {
        window.open(data.authUrl, '_blank');
        setSuccess('Ventana de autorización abierta. Complete el proceso en la nueva pestaña.');
        addApiLog('OAUTH_INIT', '/api/sber-business/auth/url', 'success', 0, { redirectUri: config.redirectUri }, data);
      } else {
        throw new Error(data.error || 'Error al generar URL de autorización');
      }
    } catch (err: any) {
      setError(err.message);
      addApiLog('OAUTH_INIT', '/api/sber-business/auth/url', 'error', 0, {}, { error: err.message });
    } finally {
      setLoading(false);
    }
  };

  const handleExchangeCode = async (authCode: string) => {
    setLoading(true);
    setError('');
    
    try {
      const response = await fetch(`${API_BASE}/api/sber-business/auth/token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: authCode,
          redirectUri: config.redirectUri,
        }),
      });
      
      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.error || 'Error al intercambiar código por token');
      }
      
      setConfig(prev => ({
        ...prev,
        accessToken: 'STORED_IN_BACKEND',
        tokenExpiry: data.expiresAt,
      }));
      
      setConnectionStatus('connected');
      setSuccess(`Token obtenido exitosamente. Expira: ${new Date(data.expiresAt).toLocaleString()}`);
      
      addApiLog('TOKEN_EXCHANGE', '/api/sber-business/auth/token', 'success', 0, { code: '***' }, data);
    } catch (err: any) {
      setError(err.message);
      addApiLog('TOKEN_EXCHANGE', '/api/sber-business/auth/token', 'error', 0, { code: '***' }, { error: err.message });
    } finally {
      setLoading(false);
    }
  };

  const handleRefreshToken = async () => {
    setLoading(true);
    setError('');
    
    try {
      const response = await fetch(`${API_BASE}/api/sber-business/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      
      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.error || 'Error al refrescar token');
      }
      
      setConfig(prev => ({
        ...prev,
        tokenExpiry: data.expiresAt,
      }));
      
      setConnectionStatus('connected');
      setSuccess('Token refrescado exitosamente');
    } catch (err: any) {
      setError(err.message);
      setConnectionStatus('disconnected');
    } finally {
      setLoading(false);
    }
  };
  
  // Test connection to backend
  const handleTestConnection = async () => {
    setLoading(true);
    setConnectionStatus('checking');
    setError('');
    
    try {
      // First check backend health
      const healthResponse = await fetch(`${API_BASE}/api/sber-business/health`);
      const healthData = await healthResponse.json();
      
      if (healthData.status !== 'online') {
        throw new Error('Backend no disponible');
      }
      
      // Then test Sber connection
      const testResponse = await fetch(`${API_BASE}/api/sber-business/test`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ environment: config.environment }),
      });
      
      const testData = await testResponse.json();
      
      if (testData.authenticated && testData.connected) {
        setConnectionStatus('connected');
        setSuccess(`Conectado a SberBusinessAPI (${config.environment}). Latencia: ${testData.latency}ms`);
      } else if (testData.connected && !testData.authenticated) {
        setConnectionStatus('disconnected');
        setError('Backend conectado pero no autenticado con Sber. Complete el flujo OAuth2.');
      } else {
        setConnectionStatus('disconnected');
        setError(testData.message || 'No se pudo conectar');
      }
      
      addApiLog('TEST_CONNECTION', '/api/sber-business/test', testData.success ? 'success' : 'error', testData.latency || 0, {}, testData);
    } catch (err: any) {
      setConnectionStatus('disconnected');
      setError(`Error de conexión: ${err.message}`);
      addApiLog('TEST_CONNECTION', '/api/sber-business/test', 'error', 0, {}, { error: err.message });
    } finally {
      setLoading(false);
    }
  };

  const addApiLog = (method: string, endpoint: string, status: 'success' | 'error' | 'pending', responseTime: number, request?: any, response?: any) => {
    const log: ApiLog = {
      id: `LOG-${Date.now()}`,
      timestamp: new Date().toISOString(),
      method,
      endpoint,
      status,
      responseTime,
      request,
      response,
    };
    setApiLogs(prev => [log, ...prev]);
  };

  const callSberApi = async (method: string, params: Record<string, any> = {}) => {
    setLoading(true);
    setError('');
    const startTime = Date.now();
    
    // Map method names to backend endpoints
    const endpointMap: Record<string, { path: string; httpMethod: string }> = {
      'GET_CLIENT_ACCOUNTS': { path: '/api/sber-business/accounts', httpMethod: 'GET' },
      'GET_CORRESPONDENTS': { path: '/api/sber-business/correspondents', httpMethod: 'GET' },
      'GET_STATEMENT_SUMMARY': { path: '/api/sber-business/statement/summary', httpMethod: 'POST' },
      'GET_STATEMENT_TRANSACTIONS': { path: '/api/sber-business/statement/transactions', httpMethod: 'POST' },
      'PAYMENT_REQUEST_OUTGOING': { path: '/api/sber-business/payment-requests/outgoing', httpMethod: 'POST' },
      'PAY_DOC_RU': { path: '/api/sber-business/pay-doc-ru', httpMethod: 'POST' },
      'PAY_DOC_CUR': { path: '/api/sber-business/pay-doc-cur', httpMethod: 'POST' },
      'SUBSCRIPTION_CREATE': { path: '/api/sber-business/subscriptions', httpMethod: 'POST' },
      'DEPOSIT_OFFERS': { path: '/api/sber-business/deposits/offers', httpMethod: 'GET' },
      'DEPOSIT_OPEN': { path: '/api/sber-business/deposits', httpMethod: 'POST' },
      'GET_DICTS': { path: '/api/sber-business/dicts', httpMethod: 'GET' },
      'GET_DICT_BIC': { path: '/api/sber-business/dicts/bic', httpMethod: 'GET' },
      'CORPORATE_CARDS': { path: '/api/sber-business/corporate-cards', httpMethod: 'GET' },
      'BUSINESS_CARDS_TRANSFER': { path: '/api/sber-business/cards/transfer', httpMethod: 'POST' },
      'CURR_CONTROL_INFO_REQ': { path: '/api/sber-business/currency-control/info', httpMethod: 'GET' },
      'CURR_CONTROL_MESSAGE_TO_BANK': { path: '/api/sber-business/currency-control/message', httpMethod: 'POST' },
      'GET_CRYPTO_INFO': { path: '/api/sber-business/crypto/info', httpMethod: 'GET' },
      'CRYPTO_CERT_REQUEST_EIO': { path: '/api/sber-business/crypto/cert-request', httpMethod: 'POST' },
      'GENERIC_LETTER_TO_BANK': { path: '/api/sber-business/letters/to-bank', httpMethod: 'POST' },
      'GENERIC_LETTER_FROM_BANK': { path: '/api/sber-business/letters/from-bank', httpMethod: 'GET' },
      'SALARY_AGREEMENT': { path: '/api/sber-business/salary/agreement', httpMethod: 'POST' },
      'SBERRATING_REPORT': { path: '/api/sber-business/sberrating/report', httpMethod: 'GET' },
      'BB_CREATE_LINK_APP': { path: '/api/sber-business/link-app', httpMethod: 'POST' },
    };
    
    const endpointInfo = endpointMap[method] || { path: `/api/sber-business/${method.toLowerCase()}`, httpMethod: 'POST' };
    
    try {
      const fetchOptions: RequestInit = {
        method: endpointInfo.httpMethod,
        headers: { 'Content-Type': 'application/json' },
      };
      
      if (endpointInfo.httpMethod !== 'GET') {
        fetchOptions.body = JSON.stringify({ ...params, environment: config.environment });
      }
      
      const response = await fetch(`${API_BASE}${endpointInfo.path}`, fetchOptions);
      const responseTime = Date.now() - startTime;
      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.error || 'Error en la API');
      }
      
      addApiLog(method, endpointInfo.path, 'success', responseTime, params, data);
      setSuccess(`${method} ejecutado exitosamente (${responseTime}ms)`);
      return data.data;
    } catch (err: any) {
      const responseTime = Date.now() - startTime;
      addApiLog(method, `${SBER_CONFIG.API_BASE_URL}/${method.toLowerCase()}`, 'error', responseTime, params, { error: err.message });
      setError(err.message);
      return null;
    } finally {
      setLoading(false);
    }
  };

  const handleGetAccounts = async () => {
    const data = await callSberApi('GET_CLIENT_ACCOUNTS');
    if (data && data.accounts) {
      setAccounts(data.accounts);
      setSuccess(`${data.accounts.length} cuentas encontradas`);
    }
  };

  const handleGetStatement = async () => {
    if (!statementRequest.accountNumber) {
      setError('Seleccione una cuenta');
      return;
    }
    
    const data = await callSberApi('GET_STATEMENT_TRANSACTION', {
      accountNumber: statementRequest.accountNumber,
      dateFrom: statementRequest.dateFrom,
      dateTo: statementRequest.dateTo,
    });
    
    if (data && data.transactions) {
      setTransactions(data.transactions);
      setSuccess(`${data.transactions.length} transacciones encontradas`);
    }
  };

  const handleExecuteMethod = async () => {
    if (!selectedMethod) {
      setError('Seleccione un método');
      return;
    }
    
    const data = await callSberApi(selectedMethod, methodParams);
    setMethodResponse(data);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setSuccess('Copiado al portapapeles');
    setTimeout(() => setSuccess(''), 2000);
  };

  const toggleScope = (scope: string) => {
    setConfig(prev => ({
      ...prev,
      selectedScopes: prev.selectedScopes.includes(scope)
        ? prev.selectedScopes.filter(s => s !== scope)
        : [...prev.selectedScopes, scope],
    }));
  };

  // ─────────────────────────────────────────────────────────────────────────────────────
  // RENDER HELPERS
  // ─────────────────────────────────────────────────────────────────────────────────────

  const renderMethodIcon = (iconName: string) => {
    const icons: Record<string, any> = {
      CreditCard, FileText, List, Users, Send, Globe, ArrowLeftRight,
      Key, Lock, Mail, DollarSign, Download, Database, Link2, Zap, Shield, Banknote
    };
    const Icon = icons[iconName] || FileText;
    return <Icon className="w-4 h-4" />;
  };

  const getMethodsByCategory = (category: string) => {
    return SBER_CONFIG.METHODS.filter(m => m.category === category);
  };

  const categories = [
    { id: 'accounts', name: 'Cuentas', icon: CreditCard },
    { id: 'statements', name: 'Estados', icon: FileText },
    { id: 'payments', name: 'Pagos Instantáneos', icon: Send, highlight: true }, // Моментальные платежи
    { id: 'subscriptions', name: 'Suscripciones Corp.', icon: Repeat, highlight: true }, // Корпоративные подписки
    { id: 'deposits', name: 'Depósitos', icon: Banknote, highlight: true }, // Депозиты
    { id: 'dicts', name: 'Diccionarios', icon: Database },
    { id: 'cards', name: 'Tarjetas', icon: CreditCard },
    { id: 'currency', name: 'Divisas', icon: DollarSign },
    { id: 'crypto', name: 'Crypto', icon: Key },
    { id: 'communications', name: 'Comunicaciones', icon: Mail },
    { id: 'payroll', name: 'Nómina', icon: Users },
    { id: 'reports', name: 'Reportes', icon: FileText },
    { id: 'integration', name: 'Integración', icon: Link2 },
  ];

  // ═══════════════════════════════════════════════════════════════════════════════════════
  // RENDER
  // ═══════════════════════════════════════════════════════════════════════════════════════

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 text-white p-6">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div 
              className="w-14 h-14 rounded-xl flex items-center justify-center"
              style={{ background: `linear-gradient(135deg, ${SBER_CONFIG.SBER_GREEN} 0%, ${SBER_CONFIG.SBER_DARK} 100%)` }}
            >
              <Building2 className="w-8 h-8 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">Sberbank Business API</h1>
              <p className="text-gray-400 text-sm">SberBusinessAPI • Client ID: {SBER_CONFIG.CLIENT_ID}</p>
            </div>
          </div>
          
          {/* Connection Status */}
          <div className="flex items-center gap-4">
            <div className={`flex items-center gap-2 px-4 py-2 rounded-lg border ${
              connectionStatus === 'connected' 
                ? 'bg-green-500/10 border-green-500/30 text-green-400'
                : connectionStatus === 'checking'
                ? 'bg-yellow-500/10 border-yellow-500/30 text-yellow-400'
                : 'bg-red-500/10 border-red-500/30 text-red-400'
            }`}>
              {connectionStatus === 'checking' ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : connectionStatus === 'connected' ? (
                <Wifi className="w-4 h-4" />
              ) : (
                <WifiOff className="w-4 h-4" />
              )}
              <span className="text-sm font-medium">
                {connectionStatus === 'checking' ? 'Verificando...' : connectionStatus === 'connected' ? 'Conectado' : 'Desconectado'}
              </span>
            </div>
            
            {/* Environment Toggle Switch */}
            <div className="flex items-center gap-2 bg-gray-800/80 rounded-xl p-1 border border-gray-700/50">
              <button
                onClick={() => {
                  setConfig(prev => ({ ...prev, environment: 'sandbox' }));
                  setConnectionStatus('disconnected');
                }}
                className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${
                  config.environment === 'sandbox'
                    ? 'bg-yellow-500 text-black shadow-lg shadow-yellow-500/30'
                    : 'text-gray-400 hover:text-yellow-400'
                }`}
              >
                🧪 SANDBOX
              </button>
              <button
                onClick={() => {
                  setConfig(prev => ({ ...prev, environment: 'production' }));
                  setConnectionStatus('disconnected');
                }}
                className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${
                  config.environment === 'production'
                    ? 'bg-green-500 text-black shadow-lg shadow-green-500/30'
                    : 'text-gray-400 hover:text-green-400'
                }`}
              >
                🚀 PRODUCTION
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Environment Banner */}
      <div className={`mb-4 p-3 rounded-lg flex items-center justify-between ${
        config.environment === 'production'
          ? 'bg-green-500/10 border border-green-500/30'
          : 'bg-yellow-500/10 border border-yellow-500/30'
      }`}>
        <div className="flex items-center gap-3">
          <span className="text-2xl">{config.environment === 'production' ? '🚀' : '🧪'}</span>
          <div>
            <p className={`font-bold ${config.environment === 'production' ? 'text-green-400' : 'text-yellow-400'}`}>
              Modo {config.environment === 'production' ? 'PRODUCCIÓN' : 'SANDBOX'}
            </p>
            <p className="text-xs text-gray-400">
              {config.environment === 'production' 
                ? 'Conectado a servidores reales de Sberbank - Transacciones reales'
                : 'Ambiente de pruebas - Sin afectar datos reales'}
            </p>
          </div>
        </div>
        <div className={`px-3 py-1 rounded-full text-xs font-bold ${
          connectionStatus === 'connected'
            ? 'bg-green-500/20 text-green-400'
            : 'bg-red-500/20 text-red-400'
        }`}>
          {connectionStatus === 'connected' ? '● CONECTADO' : '○ DESCONECTADO'}
        </div>
      </div>

      {/* Alerts */}
      {error && (
        <div className="mb-4 p-4 bg-red-500/10 border border-red-500/30 rounded-lg flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0" />
          <span className="text-red-400">{error}</span>
          <button onClick={() => setError('')} className="ml-auto text-red-400 hover:text-red-300">×</button>
        </div>
      )}
      
      {success && (
        <div className="mb-4 p-4 bg-green-500/10 border border-green-500/30 rounded-lg flex items-center gap-3">
          <CheckCircle className="w-5 h-5 text-green-400 flex-shrink-0" />
          <span className="text-green-400">{success}</span>
          <button onClick={() => setSuccess('')} className="ml-auto text-green-400 hover:text-green-300">×</button>
        </div>
      )}

      {/* Navigation Tabs */}
      <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
        {[
          { id: 'dashboard', label: 'Dashboard', icon: Building2 },
          { id: 'oauth', label: 'OAuth2', icon: Key },
          { id: 'accounts', label: t.tabAccounts, icon: CreditCard },
          { id: 'statements', label: t.tabStatements, icon: FileText },
          { id: 'payments', label: t.tabPayments, icon: Send },
          { id: 'payments2', label: t.tabPayments2, icon: Banknote },
          { id: 'methods', label: 'API Methods', icon: Server },
          { id: 'settings', label: language === 'es' ? 'Configuración' : 'Settings', icon: Settings },
          { id: 'docs', label: language === 'es' ? 'Documentación' : 'Documentation', icon: BookOpen },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all whitespace-nowrap ${
              activeTab === tab.id
                ? 'text-white'
                : 'bg-gray-800/50 text-gray-400 hover:bg-gray-700/50 hover:text-white'
            }`}
            style={activeTab === tab.id ? { background: `linear-gradient(135deg, ${SBER_CONFIG.SBER_GREEN} 0%, ${SBER_CONFIG.SBER_DARK} 100%)` } : {}}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* ═══════════════════════════════════════════════════════════════════════════════ */}
        {/* DASHBOARD TAB */}
        {/* ═══════════════════════════════════════════════════════════════════════════════ */}
        {activeTab === 'dashboard' && (
          <>
            {/* Quick Stats */}
            <div className="lg:col-span-3 grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="bg-gray-800/50 rounded-xl p-4 border border-gray-700/50">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-400 text-sm">{t.status}</p>
                    <p className="text-xl font-bold" style={{ color: connectionStatus === 'connected' ? SBER_CONFIG.SBER_GREEN : '#ef4444' }}>
                      {connectionStatus === 'connected' ? t.connected : t.disconnected}
                    </p>
                  </div>
                  <div className={`p-3 rounded-lg ${connectionStatus === 'connected' ? 'bg-green-500/20' : 'bg-red-500/20'}`}>
                    {connectionStatus === 'connected' ? <Wifi className="w-6 h-6 text-green-400" /> : <WifiOff className="w-6 h-6 text-red-400" />}
                  </div>
                </div>
              </div>
              
              <div className="bg-gray-800/50 rounded-xl p-4 border border-gray-700/50">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-400 text-sm">{t.tabAccounts}</p>
                    <p className="text-xl font-bold">{accounts.length}</p>
                  </div>
                  <div className="p-3 rounded-lg bg-blue-500/20">
                    <CreditCard className="w-6 h-6 text-blue-400" />
                  </div>
                </div>
              </div>
              
              <div className="bg-gray-800/50 rounded-xl p-4 border border-gray-700/50">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-400 text-sm">{language === 'es' ? 'Métodos Activos' : 'Active Methods'}</p>
                    <p className="text-xl font-bold">{config.selectedScopes.length}</p>
                  </div>
                  <div className="p-3 rounded-lg bg-purple-500/20">
                    <Server className="w-6 h-6 text-purple-400" />
                  </div>
                </div>
              </div>
              
              <div className="bg-gray-800/50 rounded-xl p-4 border border-gray-700/50">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-400 text-sm">API Calls</p>
                    <p className="text-xl font-bold">{apiLogs.length}</p>
                  </div>
                  <div className="p-3 rounded-lg bg-cyan-500/20">
                    <History className="w-6 h-6 text-cyan-400" />
                  </div>
                </div>
              </div>
            </div>

            {/* Service Info */}
            <div className="lg:col-span-2 bg-gray-800/50 rounded-xl p-6 border border-gray-700/50">
              <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
                <Building2 className="w-5 h-5" style={{ color: SBER_CONFIG.SBER_GREEN }} />
                {language === 'es' ? 'Información del Servicio' : 'Service Information'}
              </h2>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="p-3 bg-gray-900/50 rounded-lg">
                  <p className="text-gray-400 text-sm">{language === 'es' ? 'Servicio' : 'Service'}</p>
                  <p className="font-mono text-sm">{SBER_CONFIG.SERVICE_NAME}</p>
                </div>
                <div className="p-3 bg-gray-900/50 rounded-lg">
                  <p className="text-gray-400 text-sm">{language === 'es' ? 'Producto' : 'Product'}</p>
                  <p className="font-mono text-sm">{SBER_CONFIG.PRODUCT}</p>
                </div>
                <div className="p-3 bg-gray-900/50 rounded-lg">
                  <p className="text-gray-400 text-sm">{t.clientId}</p>
                  <div className="flex items-center gap-2">
                    <p className="font-mono text-sm">{SBER_CONFIG.CLIENT_ID}</p>
                    <button onClick={() => copyToClipboard(SBER_CONFIG.CLIENT_ID)} className="text-gray-400 hover:text-white">
                      <Copy className="w-3 h-3" />
                    </button>
                  </div>
                </div>
                <div className="p-3 bg-gray-900/50 rounded-lg">
                  <p className="text-gray-400 text-sm">Scope Version</p>
                  <p className="font-mono text-sm">{config.scopeVersion.toUpperCase()}</p>
                </div>
              </div>
              
              {config.tokenExpiry && (
                <div className="mt-4 p-3 bg-green-500/10 border border-green-500/30 rounded-lg">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-green-400 text-sm font-medium">{language === 'es' ? 'Token Activo' : 'Active Token'}</p>
                      <p className="text-xs text-gray-400">{language === 'es' ? 'Expira' : 'Expires'}: {new Date(config.tokenExpiry).toLocaleString()}</p>
                    </div>
                    <button
                      onClick={handleRefreshToken}
                      className="px-3 py-1 bg-green-600 hover:bg-green-500 rounded text-sm flex items-center gap-1"
                    >
                      <RefreshCw className="w-3 h-3" />
                      {language === 'es' ? 'Refrescar' : 'Refresh'}
                    </button>
                  </div>
                </div>
              )}
              
              {/* Test Connection Button */}
              <div className="mt-4 flex gap-2">
                <button
                  onClick={handleTestConnection}
                  disabled={loading}
                  className="flex-1 px-4 py-3 rounded-lg font-medium flex items-center justify-center gap-2 transition-all"
                  style={{ 
                    backgroundColor: connectionStatus === 'checking' ? '#6b7280' : SBER_CONFIG.SBER_GREEN,
                    color: '#fff'
                  }}
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Verificando...
                    </>
                  ) : (
                    <>
                      <RefreshCw className="w-4 h-4" />
                      Probar Conexión
                    </>
                  )}
                </button>
                <button
                  onClick={() => setActiveTab('oauth')}
                  className="px-4 py-3 bg-blue-600 hover:bg-blue-500 rounded-lg font-medium flex items-center gap-2 transition-all"
                >
                  <Key className="w-4 h-4" />
                  Configurar OAuth2
                </button>
              </div>
            </div>

            {/* Recent API Logs */}
            <div className="bg-gray-800/50 rounded-xl p-6 border border-gray-700/50">
              <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
                <History className="w-5 h-5" style={{ color: SBER_CONFIG.SBER_GREEN }} />
                Actividad Reciente
              </h2>
              
              {apiLogs.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <Server className="w-10 h-10 mx-auto mb-2 opacity-50" />
                  <p>Sin actividad reciente</p>
                </div>
              ) : (
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {apiLogs.slice(0, 10).map(log => (
                    <div key={log.id} className="p-2 bg-gray-900/50 rounded-lg text-sm">
                      <div className="flex items-center justify-between">
                        <span className="font-mono text-xs">{log.method}</span>
                        <span className={`px-2 py-0.5 rounded text-xs ${
                          log.status === 'success' ? 'bg-green-500/20 text-green-400' :
                          log.status === 'error' ? 'bg-red-500/20 text-red-400' :
                          'bg-yellow-500/20 text-yellow-400'
                        }`}>
                          {log.status}
                        </span>
                      </div>
                      <div className="text-xs text-gray-500 mt-1">
                        {new Date(log.timestamp).toLocaleTimeString()} • {log.responseTime}ms
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}

        {/* ═══════════════════════════════════════════════════════════════════════════════ */}
        {/* OAUTH TAB */}
        {/* ═══════════════════════════════════════════════════════════════════════════════ */}
        {activeTab === 'oauth' && (
          <>
            <div className="lg:col-span-2 bg-gray-800/50 rounded-xl p-6 border border-gray-700/50">
              <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
                <Key className="w-5 h-5" style={{ color: SBER_CONFIG.SBER_GREEN }} />
                OAuth2 / OpenID Connect
              </h2>
              
              {/* Test Environment Login */}
              <div className="mb-6 p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
                <h3 className="font-medium mb-3 flex items-center gap-2 text-yellow-400">
                  <AlertTriangle className="w-5 h-5" />
                  Acceso Test Environment (SberBusiness ID)
                </h3>
                <p className="text-xs text-gray-400 mb-3">
                  Use estas credenciales en la ventana de login de SberBusiness
                </p>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">Login</label>
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        value="ashagaev"
                        readOnly
                        className="flex-1 bg-gray-800 border border-gray-600 rounded px-2 py-1.5 text-sm font-mono text-cyan-400"
                      />
                      <button 
                        onClick={() => copyToClipboard('ashagaev')} 
                        className="p-1.5 bg-gray-700 hover:bg-gray-600 rounded"
                      >
                        <Copy className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">Password</label>
                    <div className="flex items-center gap-2">
                      <input
                        type="password"
                        value="Happy707Happy+"
                        readOnly
                        className="flex-1 bg-gray-800 border border-gray-600 rounded px-2 py-1.5 text-sm font-mono"
                      />
                      <button 
                        onClick={() => copyToClipboard('Happy707Happy+')} 
                        className="p-1.5 bg-gray-700 hover:bg-gray-600 rounded"
                      >
                        <Copy className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                </div>
                <a 
                  href="https://sbi.sberbank.ru:9443/ic/ufs/login.html"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-3 inline-flex items-center gap-2 px-3 py-2 bg-yellow-600 hover:bg-yellow-500 rounded text-sm font-medium"
                >
                  <ExternalLink className="w-4 h-4" />
                  Abrir Login SberBusiness Test
                </a>
              </div>
              
              {/* Step 1: Configure Redirect URI */}
              <div className="mb-6 p-4 bg-gray-900/50 rounded-lg border border-gray-700">
                <h3 className="font-medium mb-3 flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-blue-500 flex items-center justify-center text-xs">1</span>
                  Configurar Redirect URI
                </h3>
                <input
                  type="url"
                  value={config.redirectUri}
                  onChange={e => setConfig(prev => ({ ...prev, redirectUri: e.target.value }))}
                  className="w-full bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 text-white"
                  placeholder="https://your-domain.com/callback"
                />
                <p className="text-xs text-gray-500 mt-2">
                  Este URI debe estar registrado en Sber API Portal
                </p>
              </div>
              
              {/* Step 2: Select Scope Version */}
              <div className="mb-6 p-4 bg-gray-900/50 rounded-lg border border-gray-700">
                <h3 className="font-medium mb-3 flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-blue-500 flex items-center justify-center text-xs">2</span>
                  Seleccionar Versión de Scope
                </h3>
                <div className="flex gap-2">
                  <button
                    onClick={() => setConfig(prev => ({ ...prev, scopeVersion: 'v1' }))}
                    className={`flex-1 py-2 rounded-lg font-medium ${
                      config.scopeVersion === 'v1'
                        ? 'bg-blue-500 text-white'
                        : 'bg-gray-700 text-gray-400 hover:bg-gray-600'
                    }`}
                  >
                    Scope v1 (Básico)
                  </button>
                  <button
                    onClick={() => setConfig(prev => ({ ...prev, scopeVersion: 'v2' }))}
                    className={`flex-1 py-2 rounded-lg font-medium ${
                      config.scopeVersion === 'v2'
                        ? 'bg-blue-500 text-white'
                        : 'bg-gray-700 text-gray-400 hover:bg-gray-600'
                    }`}
                  >
                    Scope v2 (Completo)
                  </button>
                </div>
                
                {config.scopeVersion === 'v1' && (
                  <div className="mt-3 p-2 bg-gray-800 rounded text-xs font-mono text-cyan-400 break-all">
                    {SBER_CONFIG.SCOPE_V1}
                  </div>
                )}
              </div>
              
              {/* Step 3: Initiate OAuth */}
              <div className="mb-6 p-4 bg-gray-900/50 rounded-lg border border-gray-700">
                <h3 className="font-medium mb-3 flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-blue-500 flex items-center justify-center text-xs">3</span>
                  Iniciar Autorización
                </h3>
                <button
                  onClick={handleInitiateOAuth}
                  disabled={!config.redirectUri}
                  className="w-full py-3 rounded-lg font-bold text-white flex items-center justify-center gap-2 disabled:opacity-50"
                  style={{ background: `linear-gradient(135deg, ${SBER_CONFIG.SBER_GREEN} 0%, ${SBER_CONFIG.SBER_DARK} 100%)` }}
                >
                  <ExternalLink className="w-5 h-5" />
                  Abrir Autorización Sber
                </button>
              </div>
              
              {/* Step 4: Exchange Code */}
              <div className="p-4 bg-gray-900/50 rounded-lg border border-gray-700">
                <h3 className="font-medium mb-3 flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-blue-500 flex items-center justify-center text-xs">4</span>
                  Intercambiar Código por Token
                </h3>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Código de autorización"
                    className="flex-1 bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 text-white"
                    id="authCode"
                  />
                  <button
                    onClick={() => {
                      const code = (document.getElementById('authCode') as HTMLInputElement).value;
                      if (code) handleExchangeCode(code);
                    }}
                    disabled={loading}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-500 rounded-lg font-medium flex items-center gap-2"
                  >
                    {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Key className="w-4 h-4" />}
                    Intercambiar
                  </button>
                </div>
              </div>
            </div>

            {/* Scopes v2 Selection */}
            {config.scopeVersion === 'v2' && (
              <div className="bg-gray-800/50 rounded-xl p-6 border border-gray-700/50 max-h-[600px] overflow-y-auto">
                <h3 className="font-bold mb-4 flex items-center gap-2">
                  <Shield className="w-5 h-5" style={{ color: SBER_CONFIG.SBER_GREEN }} />
                  Scopes v2 ({config.selectedScopes.length} seleccionados)
                </h3>
                
                <div className="space-y-2">
                  {SBER_CONFIG.SCOPES_V2.map(scope => (
                    <label
                      key={scope}
                      className={`flex items-center gap-2 p-2 rounded cursor-pointer transition-colors ${
                        config.selectedScopes.includes(scope)
                          ? 'bg-green-500/10 border border-green-500/30'
                          : 'bg-gray-900/50 hover:bg-gray-700/50'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={config.selectedScopes.includes(scope)}
                        onChange={() => toggleScope(scope)}
                        className="rounded border-gray-600"
                      />
                      <span className="text-xs font-mono">{scope}</span>
                    </label>
                  ))}
                </div>
              </div>
            )}

            {/* Token Info */}
            {config.accessToken && (
              <div className="lg:col-span-3 bg-gray-800/50 rounded-xl p-6 border border-gray-700/50">
                <h3 className="font-bold mb-4 flex items-center gap-2">
                  <Lock className="w-5 h-5" style={{ color: SBER_CONFIG.SBER_GREEN }} />
                  Token Actual
                </h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-3 bg-gray-900/50 rounded-lg">
                    <p className="text-gray-400 text-sm mb-1">Access Token</p>
                    <div className="flex items-center gap-2">
                      <code className="text-xs text-green-400 truncate flex-1">{config.accessToken.slice(0, 50)}...</code>
                      <button onClick={() => copyToClipboard(config.accessToken)} className="text-gray-400 hover:text-white">
                        <Copy className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                  
                  <div className="p-3 bg-gray-900/50 rounded-lg">
                    <p className="text-gray-400 text-sm mb-1">Expira</p>
                    <code className="text-xs text-yellow-400">{config.tokenExpiry ? new Date(config.tokenExpiry).toLocaleString() : 'N/A'}</code>
                  </div>
                  
                  {config.refreshToken && (
                    <div className="p-3 bg-gray-900/50 rounded-lg md:col-span-2">
                      <p className="text-gray-400 text-sm mb-1">Refresh Token</p>
                      <div className="flex items-center gap-2">
                        <code className="text-xs text-cyan-400 truncate flex-1">{config.refreshToken.slice(0, 50)}...</code>
                        <button onClick={() => copyToClipboard(config.refreshToken)} className="text-gray-400 hover:text-white">
                          <Copy className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </>
        )}

        {/* ═══════════════════════════════════════════════════════════════════════════════ */}
        {/* ACCOUNTS TAB */}
        {/* ═══════════════════════════════════════════════════════════════════════════════ */}
        {activeTab === 'accounts' && (
          <>
            {/* ═══════════════════════════════════════════════════════════════════════════════ */}
            {/* SECCIÓN 1: Configurar Cuentas Pagador RUB */}
            {/* ═══════════════════════════════════════════════════════════════════════════════ */}
            <div className="lg:col-span-3 bg-gradient-to-r from-purple-900/30 to-indigo-900/30 rounded-xl p-6 border border-purple-500/30">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-purple-500/20 flex items-center justify-center">
                    <Banknote className="w-6 h-6 text-purple-400" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-white">{t.configurePayerAccounts}</h2>
                    <p className="text-purple-400/80 text-sm">{language === 'es' ? 'Cuentas para enviar dinero en rublos - Se usarán en Pagos 2' : 'Accounts to send money in rubles - Will be used in Payments 2'}</p>
                  </div>
                </div>
                <button
                  onClick={() => { setShowPayerAccountForm(true); setEditingPayerAccountId(null); setNewPayerAccount({ name: '', payerName: '', payerInn: '', payerKpp: '', account: '', bankBic: '', corrAccount: '', bankName: '', currency: 'RUB', isActive: true }); }}
                  className="px-4 py-2 rounded-lg font-medium text-white flex items-center gap-2"
                  style={{ background: `linear-gradient(135deg, ${SBER_CONFIG.SBER_GREEN} 0%, #1a8833 100%)` }}
                >
                  <Plus className="w-4 h-4" />
                  {language === 'es' ? 'Nueva Cuenta Pagador' : 'New Payer Account'}
                </button>
              </div>

              {/* Formulario Nueva/Editar Cuenta Pagador */}
              {showPayerAccountForm && (
                <div className="mb-6 p-6 bg-gray-900/80 rounded-xl border border-purple-500/50">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-bold text-lg text-purple-400 flex items-center gap-2">
                      {editingPayerAccountId ? <Edit3 className="w-5 h-5" /> : <Plus className="w-5 h-5" />}
                      {editingPayerAccountId 
                        ? (language === 'es' ? 'Editar Cuenta Pagador' : 'Edit Payer Account') 
                        : (language === 'es' ? 'Nueva Cuenta Pagador RUB' : 'New Payer Account RUB')}
                    </h3>
                    <button onClick={() => { setShowPayerAccountForm(false); setEditingPayerAccountId(null); }} className="text-gray-400 hover:text-white">
                      <X className="w-5 h-5" />
                    </button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                    {/* Nombre Descriptivo */}
                    <div className="md:col-span-3">
                      <label className="block text-sm text-purple-400 mb-1 font-medium">{language === 'es' ? 'Nombre Descriptivo' : 'Descriptive Name'} *</label>
                      <input
                        type="text"
                        value={newPayerAccount.name}
                        onChange={e => setNewPayerAccount(prev => ({ ...prev, name: e.target.value }))}
                        className="w-full bg-gray-800 border border-purple-500/30 rounded-lg px-4 py-3 text-white focus:border-purple-500 focus:outline-none"
                        placeholder={language === 'es' ? 'Ej: Mi cuenta principal Sberbank Moscow' : 'Ex: My main Sberbank Moscow account'}
                      />
                    </div>

                    {/* Nombre Legal */}
                    <div className="md:col-span-2">
                      <label className="block text-sm text-gray-400 mb-1">{language === 'es' ? 'Nombre Legal del Pagador' : 'Payer Legal Name'} * <span className="text-xs text-gray-500">(max 160)</span></label>
                      <input
                        type="text"
                        value={newPayerAccount.payerName}
                        onChange={e => setNewPayerAccount(prev => ({ ...prev, payerName: e.target.value.slice(0, 160) }))}
                        className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white"
                        placeholder="PAO SBERBANK"
                      />
                    </div>

                    {/* Banco */}
                    <div>
                      <label className="block text-sm text-gray-400 mb-1">{t.bankName}</label>
                      <input
                        type="text"
                        value={newPayerAccount.bankName}
                        onChange={e => setNewPayerAccount(prev => ({ ...prev, bankName: e.target.value }))}
                        className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white"
                        placeholder="Sberbank Moscow"
                      />
                    </div>

                    {/* INN */}
                    <div>
                      <label className="block text-sm text-gray-400 mb-1">{t.inn} * <span className="text-xs text-gray-500">(10-12 {language === 'es' ? 'dígitos' : 'digits'})</span></label>
                      <input
                        type="text"
                        value={newPayerAccount.payerInn}
                        onChange={e => setNewPayerAccount(prev => ({ ...prev, payerInn: e.target.value.replace(/\D/g, '').slice(0, 12) }))}
                        className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white font-mono"
                        placeholder="7707083893"
                      />
                      <span className="text-xs text-gray-500">{newPayerAccount.payerInn.length}/12</span>
                    </div>

                    {/* KPP */}
                    <div>
                      <label className="block text-sm text-gray-400 mb-1">{t.kpp} <span className="text-xs text-gray-500">(9 {language === 'es' ? 'dígitos' : 'digits'})</span></label>
                      <input
                        type="text"
                        value={newPayerAccount.payerKpp}
                        onChange={e => setNewPayerAccount(prev => ({ ...prev, payerKpp: e.target.value.replace(/\D/g, '').slice(0, 9) }))}
                        className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white font-mono"
                        placeholder="773601001"
                      />
                    </div>

                    {/* Cuenta */}
                    <div>
                      <label className="block text-sm text-gray-400 mb-1">{t.accountNumber} * <span className="text-xs text-gray-500">(20 {language === 'es' ? 'dígitos' : 'digits'})</span></label>
                      <input
                        type="text"
                        value={newPayerAccount.account}
                        onChange={e => setNewPayerAccount(prev => ({ ...prev, account: e.target.value.replace(/\D/g, '').slice(0, 20) }))}
                        className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white font-mono"
                        placeholder="40702810938000000001"
                      />
                      <span className={`text-xs ${newPayerAccount.account.length === 20 ? 'text-green-500' : 'text-gray-500'}`}>{newPayerAccount.account.length}/20</span>
                    </div>

                    {/* BIC */}
                    <div>
                      <label className="block text-sm text-gray-400 mb-1">BIC * <span className="text-xs text-gray-500">(9 {language === 'es' ? 'dígitos' : 'digits'})</span></label>
                      <input
                        type="text"
                        value={newPayerAccount.bankBic}
                        onChange={e => setNewPayerAccount(prev => ({ ...prev, bankBic: e.target.value.replace(/\D/g, '').slice(0, 9) }))}
                        className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white font-mono"
                        placeholder="044525225"
                      />
                      <span className={`text-xs ${newPayerAccount.bankBic.length === 9 ? 'text-green-500' : 'text-gray-500'}`}>{newPayerAccount.bankBic.length}/9</span>
                    </div>

                    {/* Cuenta Corresponsal */}
                    <div>
                      <label className="block text-sm text-gray-400 mb-1">{t.corrAccount} <span className="text-xs text-gray-500">(20 {language === 'es' ? 'dígitos' : 'digits'})</span></label>
                      <input
                        type="text"
                        value={newPayerAccount.corrAccount}
                        onChange={e => setNewPayerAccount(prev => ({ ...prev, corrAccount: e.target.value.replace(/\D/g, '').slice(0, 20) }))}
                        className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white font-mono"
                        placeholder="30101810400000000225"
                      />
                    </div>
                  </div>

                  {/* Botones */}
                  <div className="flex gap-3 justify-end">
                    <button
                      onClick={() => { setShowPayerAccountForm(false); setEditingPayerAccountId(null); }}
                      className="px-4 py-2 bg-gray-700 rounded-lg text-gray-300 hover:bg-gray-600"
                    >
                      {t.cancel}
                    </button>
                    <button
                      onClick={editingPayerAccountId ? handleUpdatePayerAccount : handleAddPayerAccount}
                      className="px-6 py-2 rounded-lg font-medium text-white flex items-center gap-2"
                      style={{ background: `linear-gradient(135deg, ${SBER_CONFIG.SBER_GREEN} 0%, #1a8833 100%)` }}
                    >
                      <Save className="w-4 h-4" />
                      {editingPayerAccountId ? (language === 'es' ? 'Actualizar' : 'Update') : t.saveAccount}
                    </button>
                  </div>
                </div>
              )}

              {/* Lista de Cuentas Pagador Configuradas */}
              <div className="space-y-4">
                {payerAccountsConfig.length === 0 ? (
                  <div className="text-center py-12 bg-gray-900/50 rounded-xl border border-gray-700/50">
                    <Banknote className="w-16 h-16 mx-auto mb-4 text-gray-700" />
                    <p className="text-gray-500 mb-2">{language === 'es' ? 'No hay cuentas pagador configuradas' : 'No payer accounts configured'}</p>
                    <p className="text-sm text-gray-600">{language === 'es' ? 'Agregue una cuenta para enviar dinero RUB' : 'Add an account to send RUB money'}</p>
                  </div>
                ) : (
                  payerAccountsConfig.map(account => {
                    const linkedBalance = getLinkedCustodyBalance(account);
                    return (
                      <div
                        key={account.id}
                        className={`p-4 rounded-xl border transition-all ${
                          account.isActive 
                            ? 'bg-gray-900/50 border-green-500/30 hover:border-green-500/50' 
                            : 'bg-gray-900/30 border-gray-700/30 opacity-60'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2 flex-wrap">
                              <h4 className="font-bold text-white">{account.name}</h4>
                              <span className={`px-2 py-0.5 rounded text-xs font-medium ${account.isActive ? 'bg-green-500/20 text-green-400' : 'bg-gray-500/20 text-gray-400'}`}>
                                {account.isActive ? (language === 'es' ? 'ACTIVA' : 'ACTIVE') : (language === 'es' ? 'INACTIVA' : 'INACTIVE')}
                              </span>
                              <span className="px-2 py-0.5 rounded text-xs bg-purple-500/20 text-purple-400">
                                {account.currency}
                              </span>
                              {account.linkedCustodyAccountId && (
                                <span className="px-2 py-0.5 rounded text-xs bg-cyan-500/20 text-cyan-400 flex items-center gap-1">
                                  <LinkIcon className="w-3 h-3" /> {t.linkedCustody}
                                </span>
                              )}
                            </div>
                            
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                              <div>
                                <span className="text-gray-500 text-xs">{language === 'es' ? 'Nombre Legal' : 'Legal Name'}:</span>
                                <p className="text-gray-300 truncate">{account.payerName}</p>
                              </div>
                              <div>
                                <span className="text-gray-500 text-xs">{language === 'es' ? 'Cuenta' : 'Account'}:</span>
                                <p className="text-green-400 font-mono text-xs">{account.account}</p>
                              </div>
                              <div>
                                <span className="text-gray-500 text-xs">{t.inn}:</span>
                                <p className="text-gray-300 font-mono">{account.payerInn}</p>
                              </div>
                              <div>
                                <span className="text-gray-500 text-xs">BIC:</span>
                                <p className="text-gray-300 font-mono">{account.bankBic}</p>
                              </div>
                            </div>
                            
                            <div className="mt-2 flex items-center gap-4 text-xs text-gray-500">
                              <span>{language === 'es' ? 'Banco' : 'Bank'}: {account.bankName || 'N/A'}</span>
                              <span>{t.kpp}: {account.payerKpp || 'N/A'}</span>
                              <span>Corr: {account.corrAccount || 'N/A'}</span>
                            </div>

                            {/* Vinculación con Cuenta Custodio */}
                            <div className="mt-4 p-3 bg-cyan-500/5 rounded-lg border border-cyan-500/20">
                              <div className="flex items-center gap-2 mb-2">
                                <Wallet className="w-4 h-4 text-cyan-400" />
                                <span className="text-sm font-medium text-cyan-400">{language === 'es' ? 'Cuenta Custodio (Liquidez)' : 'Custody Account (Liquidity)'}</span>
                              </div>
                              
                              {account.linkedCustodyAccountId ? (
                                <div className="flex items-center justify-between flex-wrap gap-2">
                                  <div>
                                    <p className="text-white font-medium">{account.linkedCustodyAccountName}</p>
                                    {linkedBalance && (
                                      <p className="text-cyan-400 text-lg font-bold">
                                        {linkedBalance.balance.toLocaleString()} {linkedBalance.currency}
                                        <span className="text-xs text-gray-500 ml-2">{language === 'es' ? 'disponible' : 'available'}</span>
                                      </p>
                                    )}
                                  </div>
                                  <button
                                    onClick={() => handleUnlinkCustodyAccount(account.id)}
                                    className="px-3 py-1 bg-red-500/10 text-red-400 rounded-lg text-sm hover:bg-red-500/20 flex items-center gap-1"
                                  >
                                    <X className="w-3 h-3" /> {language === 'es' ? 'Desvincular' : 'Unlink'}
                                  </button>
                                </div>
                              ) : (
                                <div>
                                  <select
                                    onChange={e => e.target.value && handleLinkCustodyAccount(account.id, e.target.value)}
                                    className="w-full bg-gray-800 border border-cyan-500/30 rounded-lg px-3 py-2 text-white text-sm"
                                    defaultValue=""
                                  >
                                    <option value="" disabled>-- {t.selectCustodyAccount} --</option>
                                    {custodyAccounts.map(custody => (
                                      <option key={custody.id} value={custody.id}>
                                        {custody.accountName} | {custody.availableBalance.toLocaleString()} {custody.currency}
                                      </option>
                                    ))}
                                  </select>
                                  {custodyAccounts.length === 0 && (
                                    <p className="text-xs text-gray-500 mt-1">{language === 'es' ? 'No hay cuentas custodio disponibles. Créelas en "Cuentas Custodio".' : 'No custody accounts available. Create them in "Custody Accounts".'}</p>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Actions */}
                          <div className="flex flex-col gap-2">
                            <button
                              onClick={() => handleTogglePayerAccountActive(account.id)}
                              className={`p-2 rounded-lg transition-all ${account.isActive ? 'bg-green-500/10 text-green-400 hover:bg-green-500/20' : 'bg-gray-700 text-gray-400 hover:bg-gray-600'}`}
                              title={account.isActive ? (language === 'es' ? 'Desactivar' : 'Deactivate') : (language === 'es' ? 'Activar' : 'Activate')}
                            >
                              {account.isActive ? <CheckCircle className="w-4 h-4" /> : <X className="w-4 h-4" />}
                            </button>
                            <button
                              onClick={() => handleEditPayerAccount(account)}
                              className="p-2 bg-blue-500/10 text-blue-400 rounded-lg hover:bg-blue-500/20 transition-all"
                              title="Editar"
                            >
                              <Edit3 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDeletePayerAccount(account.id)}
                              className="p-2 bg-red-500/10 text-red-400 rounded-lg hover:bg-red-500/20 transition-all"
                              title="Eliminar"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Info */}
              <div className="mt-6 p-4 bg-blue-500/10 border border-blue-500/30 rounded-xl">
                <div className="flex items-start gap-3">
                  <Info className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
                  <div className="text-sm">
                    <p className="font-medium text-blue-400 mb-1">Formato Sberbank para Cuentas RUB</p>
                    <ul className="text-blue-300/80 space-y-1">
                      <li>• <strong>Cuenta:</strong> 20 dígitos (ej: 40702810938000000001)</li>
                      <li>• <strong>INN:</strong> 10 dígitos (persona física) o 12 dígitos (empresa)</li>
                      <li>• <strong>KPP:</strong> 9 dígitos (código de razón fiscal)</li>
                      <li>• <strong>BIC:</strong> 9 dígitos (ej: 044525225 para Sberbank Moscow)</li>
                      <li>• <strong>Cuenta Corresponsal:</strong> 20 dígitos</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>

            {/* ═══════════════════════════════════════════════════════════════════════════════ */}
            {/* SECCIÓN 2: Cuentas del Cliente (API) */}
            {/* ═══════════════════════════════════════════════════════════════════════════════ */}
            <div className="lg:col-span-3 bg-gray-800/50 rounded-xl p-6 border border-gray-700/50 mt-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold flex items-center gap-2">
                  <CreditCard className="w-5 h-5" style={{ color: SBER_CONFIG.SBER_GREEN }} />
                  Cuentas del Cliente (API Sberbank)
                </h2>
                <button
                  onClick={handleGetAccounts}
                  disabled={loading || !config.accessToken}
                  className="px-4 py-2 rounded-lg font-medium text-white flex items-center gap-2 disabled:opacity-50"
                  style={{ background: SBER_CONFIG.SBER_GREEN }}
                >
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                  Obtener Cuentas
                </button>
              </div>
              
              {!config.accessToken && (
                <div className="p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-lg text-yellow-400 text-sm">
                  <AlertTriangle className="w-4 h-4 inline mr-2" />
                  Configure OAuth2 primero para obtener las cuentas
                </div>
              )}
              
              {accounts.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  <CreditCard className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p>No hay cuentas cargadas</p>
                  <p className="text-sm">Haga clic en "Obtener Cuentas" para cargar</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {accounts.map(account => (
                    <div
                      key={account.accountNumber}
                      className="p-4 bg-gray-900/50 rounded-lg border border-gray-700 hover:border-green-500/50 transition-colors"
                    >
                      <div className="flex items-center justify-between mb-3">
                        <span className="font-mono text-sm">{account.accountNumber}</span>
                        <span className={`px-2 py-1 rounded text-xs ${
                          account.status === 'active' ? 'bg-green-500/20 text-green-400' : 'bg-gray-500/20 text-gray-400'
                        }`}>
                          {account.status}
                        </span>
                      </div>
                      <p className="text-gray-400 text-sm mb-2">{account.accountName}</p>
                      <div className="flex items-center justify-between">
                        <span className="text-2xl font-bold">{account.balance.toLocaleString()}</span>
                        <span className="text-gray-400">{account.currency}</span>
                      </div>
                      <div className="mt-2 text-xs text-gray-500">
                        Disponible: {account.availableBalance.toLocaleString()} {account.currency}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}

        {/* ═══════════════════════════════════════════════════════════════════════════════ */}
        {/* STATEMENTS TAB */}
        {/* ═══════════════════════════════════════════════════════════════════════════════ */}
        {activeTab === 'statements' && (
          <>
            <div className="lg:col-span-2 bg-gray-800/50 rounded-xl p-6 border border-gray-700/50">
              <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
                <FileText className="w-5 h-5" style={{ color: SBER_CONFIG.SBER_GREEN }} />
                Consultar Estado de Cuenta
              </h2>
              
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div className="col-span-2">
                  <label className="block text-sm text-gray-400 mb-1">Cuenta</label>
                  <select
                    value={statementRequest.accountNumber}
                    onChange={e => setStatementRequest(prev => ({ ...prev, accountNumber: e.target.value }))}
                    className="w-full bg-gray-900/50 border border-gray-700 rounded-lg px-3 py-2 text-white"
                  >
                    <option value="">Seleccionar cuenta...</option>
                    {accounts.map(acc => (
                      <option key={acc.accountNumber} value={acc.accountNumber}>
                        {acc.accountNumber} - {acc.accountName} ({acc.currency})
                      </option>
                    ))}
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Fecha Desde</label>
                  <input
                    type="date"
                    value={statementRequest.dateFrom}
                    onChange={e => setStatementRequest(prev => ({ ...prev, dateFrom: e.target.value }))}
                    className="w-full bg-gray-900/50 border border-gray-700 rounded-lg px-3 py-2 text-white"
                  />
                </div>
                
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Fecha Hasta</label>
                  <input
                    type="date"
                    value={statementRequest.dateTo}
                    onChange={e => setStatementRequest(prev => ({ ...prev, dateTo: e.target.value }))}
                    className="w-full bg-gray-900/50 border border-gray-700 rounded-lg px-3 py-2 text-white"
                  />
                </div>
              </div>
              
              <button
                onClick={handleGetStatement}
                disabled={loading || !statementRequest.accountNumber}
                className="w-full py-3 rounded-lg font-bold text-white flex items-center justify-center gap-2 disabled:opacity-50"
                style={{ background: `linear-gradient(135deg, ${SBER_CONFIG.SBER_GREEN} 0%, ${SBER_CONFIG.SBER_DARK} 100%)` }}
              >
                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Search className="w-5 h-5" />}
                Consultar Transacciones
              </button>
            </div>

            {/* Transactions List */}
            <div className="bg-gray-800/50 rounded-xl p-6 border border-gray-700/50">
              <h3 className="font-bold mb-4 flex items-center gap-2">
                <List className="w-5 h-5" style={{ color: SBER_CONFIG.SBER_GREEN }} />
                Transacciones ({transactions.length})
              </h3>
              
              {transactions.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <Receipt className="w-10 h-10 mx-auto mb-2 opacity-50" />
                  <p>Sin transacciones</p>
                </div>
              ) : (
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {transactions.map(tx => (
                    <div key={tx.id} className="p-3 bg-gray-900/50 rounded-lg">
                      <div className="flex items-center justify-between">
                        <span className={`font-mono ${tx.type === 'credit' ? 'text-green-400' : 'text-red-400'}`}>
                          {tx.type === 'credit' ? '+' : '-'}{tx.amount.toLocaleString()} {tx.currency}
                        </span>
                        <span className="text-xs text-gray-500">{tx.date}</span>
                      </div>
                      <p className="text-sm text-gray-400 mt-1 truncate">{tx.description}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}

        {/* ═══════════════════════════════════════════════════════════════════════════════ */}
        {/* PAYMENTS TAB */}
        {/* ═══════════════════════════════════════════════════════════════════════════════ */}
        {activeTab === 'payments' && (
          <>
            <div className="lg:col-span-2 bg-gray-800/50 rounded-xl p-6 border border-gray-700/50">
              <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
                <Send className="w-5 h-5" style={{ color: SBER_CONFIG.SBER_GREEN }} />
                {t.createPayment} (PAY_DOC_RU)
              </h2>
              
              <div className="grid grid-cols-2 gap-4">
                {/* Selector de Cuentas Pagador Configuradas */}
                <div className="col-span-2 p-4 bg-purple-500/10 rounded-lg border border-purple-500/20">
                  <label className="block text-sm text-purple-400 mb-2 font-medium">{t.selectPayerAccount} ({language === 'es' ? 'Configuradas' : 'Configured'})</label>
                  <select
                    onChange={e => {
                      const account = predefinedPayerAccounts.find(a => a.id === e.target.value);
                      if (account) {
                        setPaymentForm(prev => ({ ...prev, payerAccount: account.account }));
                      }
                    }}
                    className="w-full bg-gray-900/50 border border-purple-500/30 rounded-lg px-3 py-3 text-white"
                    defaultValue=""
                  >
                    <option value="" disabled>-- {t.selectConfiguredAccount} --</option>
                    {predefinedPayerAccounts.map(acc => (
                      <option key={acc.id} value={acc.id}>
                        {acc.name} | {acc.account} | {acc.bankName}
                      </option>
                    ))}
                  </select>
                  <p className="text-xs text-purple-400/60 mt-2">
                    {t.configuredAccounts} → {t.onlyActiveAccounts}
                  </p>
                </div>

                {/* Selector alternativo de cuentas API (si hay) */}
                {accounts.length > 0 && (
                  <div className="col-span-2">
                    <label className="block text-sm text-gray-400 mb-1">{t.orSelectApiAccount}</label>
                    <select
                      value={paymentForm.payerAccount}
                      onChange={e => setPaymentForm(prev => ({ ...prev, payerAccount: e.target.value }))}
                      className="w-full bg-gray-900/50 border border-gray-700 rounded-lg px-3 py-2 text-white"
                    >
                      <option value="">{t.selectApiAccount}</option>
                      {accounts.map(acc => (
                        <option key={acc.accountNumber} value={acc.accountNumber}>
                          {acc.accountNumber} - {acc.balance.toLocaleString()} {acc.currency}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Mostrar cuenta seleccionada */}
                {paymentForm.payerAccount && (
                  <div className="col-span-2 p-3 bg-green-500/10 border border-green-500/30 rounded-lg">
                    <span className="text-green-400 text-sm font-medium">{t.selectedAccount}: </span>
                    <span className="text-green-300 font-mono">{paymentForm.payerAccount}</span>
                  </div>
                )}

                {/* Selector de Beneficiarios Predefinidos */}
                <div className="col-span-2 p-4 bg-cyan-500/10 rounded-lg border border-cyan-500/20">
                  <label className="block text-sm text-cyan-400 mb-2 font-medium">{t.selectBeneficiary}</label>
                  <select
                    onChange={e => {
                      const account = predefinedPayeeAccounts.find(a => a.id === e.target.value);
                      if (account) {
                        setPaymentForm(prev => ({ 
                          ...prev, 
                          payeeAccount: account.account,
                          payeeBic: account.bankBic,
                          payeeName: account.payeeName,
                          payeeInn: account.payeeInn,
                          payeeKpp: account.payeeKpp
                        }));
                      }
                    }}
                    className="w-full bg-gray-900/50 border border-cyan-500/30 rounded-lg px-3 py-3 text-white"
                    defaultValue=""
                  >
                    <option value="" disabled>-- {t.selectBeneficiaryPlaceholder} --</option>
                    {predefinedPayeeAccounts.map(acc => (
                      <option key={acc.id} value={acc.id}>
                        {acc.name} | {acc.account} | {acc.bankName}
                      </option>
                    ))}
                  </select>
                  <p className="text-xs text-cyan-400/60 mt-2">
                    {t.savedBeneficiaries}
                  </p>
                </div>
                
                <div>
                  <label className="block text-sm text-gray-400 mb-1">{t.beneficiaryAccount}</label>
                  <input
                    type="text"
                    value={paymentForm.payeeAccount}
                    onChange={e => setPaymentForm(prev => ({ ...prev, payeeAccount: e.target.value }))}
                    className="w-full bg-gray-900/50 border border-gray-700 rounded-lg px-3 py-2 text-white"
                    placeholder="40702810XXXXXXXXXX"
                  />
                </div>
                
                <div>
                  <label className="block text-sm text-gray-400 mb-1">{t.beneficiaryBic}</label>
                  <input
                    type="text"
                    value={paymentForm.payeeBic}
                    onChange={e => setPaymentForm(prev => ({ ...prev, payeeBic: e.target.value }))}
                    className="w-full bg-gray-900/50 border border-gray-700 rounded-lg px-3 py-2 text-white"
                    placeholder="044525225"
                  />
                </div>
                
                <div className="col-span-2">
                  <label className="block text-sm text-gray-400 mb-1">{t.beneficiaryName}</label>
                  <input
                    type="text"
                    value={paymentForm.payeeName}
                    onChange={e => setPaymentForm(prev => ({ ...prev, payeeName: e.target.value }))}
                    className="w-full bg-gray-900/50 border border-gray-700 rounded-lg px-3 py-2 text-white"
                    placeholder="ООО Компания"
                  />
                </div>
                
                <div>
                  <label className="block text-sm text-gray-400 mb-1">{t.beneficiaryInn}</label>
                  <input
                    type="text"
                    value={paymentForm.payeeInn}
                    onChange={e => setPaymentForm(prev => ({ ...prev, payeeInn: e.target.value }))}
                    className="w-full bg-gray-900/50 border border-gray-700 rounded-lg px-3 py-2 text-white"
                    placeholder="7707083893"
                  />
                </div>
                
                <div>
                  <label className="block text-sm text-gray-400 mb-1">{t.beneficiaryKpp}</label>
                  <input
                    type="text"
                    value={paymentForm.payeeKpp}
                    onChange={e => setPaymentForm(prev => ({ ...prev, payeeKpp: e.target.value }))}
                    className="w-full bg-gray-900/50 border border-gray-700 rounded-lg px-3 py-2 text-white"
                    placeholder="770701001"
                  />
                </div>
                
                <div>
                  <label className="block text-sm text-gray-400 mb-1">{t.amount} (RUB)</label>
                  <input
                    type="number"
                    value={paymentForm.amount || ''}
                    onChange={e => setPaymentForm(prev => ({ ...prev, amount: parseFloat(e.target.value) || 0 }))}
                    className="w-full bg-gray-900/50 border border-gray-700 rounded-lg px-3 py-2 text-white"
                    placeholder="0.00"
                  />
                </div>
                
                <div>
                  <label className="block text-sm text-gray-400 mb-1">{t.urgency}</label>
                  <select
                    value={paymentForm.urgency}
                    onChange={e => setPaymentForm(prev => ({ ...prev, urgency: e.target.value }))}
                    className="w-full bg-gray-900/50 border border-gray-700 rounded-lg px-3 py-2 text-white"
                  >
                    <option value="normal">{t.normal}</option>
                    <option value="urgent">{t.urgent}</option>
                  </select>
                </div>
                
                <div className="col-span-2">
                  <label className="block text-sm text-gray-400 mb-1">{t.purpose}</label>
                  <textarea
                    value={paymentForm.purpose}
                    onChange={e => setPaymentForm(prev => ({ ...prev, purpose: e.target.value }))}
                    className="w-full bg-gray-900/50 border border-gray-700 rounded-lg px-3 py-2 text-white"
                    rows={2}
                    placeholder="Оплата по договору №... от..."
                  />
                </div>
              </div>
              
              {/* REAL PAYMENT BUTTON */}
              <button
                onClick={handleCreatePayment}
                disabled={loading}
                className="w-full mt-6 py-4 rounded-lg font-bold text-white flex items-center justify-center gap-3 disabled:opacity-50 hover:scale-[1.02] transition-all cursor-pointer shadow-lg shadow-green-500/20"
                style={{ background: `linear-gradient(135deg, ${SBER_CONFIG.SBER_GREEN} 0%, #006400 100%)` }}
              >
                {loading ? (
                  <>
                    <Loader2 className="w-6 h-6 animate-spin" />
                    <span>{language === 'es' ? 'Procesando pago real...' : 'Processing real payment...'}</span>
                  </>
                ) : (
                  <>
                    <Send className="w-6 h-6" />
                    <span className="text-lg">{language === 'es' ? '🚀 CREAR PAGO REAL' : '🚀 CREATE REAL PAYMENT'}</span>
                  </>
                )}
              </button>
              <p className="text-center text-xs text-green-400 mt-2">
                {language === 'es' 
                  ? '⚡ Multi-firma (3) + Envío directo a Sberbank API' 
                  : '⚡ Multi-signature (3) + Direct submission to Sberbank API'}
              </p>
            </div>

            <div className="bg-gray-800/50 rounded-xl p-6 border border-gray-700/50">
              <h3 className="font-bold mb-4 flex items-center gap-2">
                <Info className="w-4 h-4" style={{ color: SBER_CONFIG.SBER_GREEN }} />
                {t.information}
              </h3>
              <div className="space-y-3 text-sm text-gray-400">
                <p><strong className="text-white">PAY_DOC_RU:</strong> {t.payDocRu}</p>
                <p><strong className="text-white">PAY_DOC_CUR:</strong> {t.payDocCur}</p>
                <div className="p-3 bg-green-500/10 border border-green-500/30 rounded-lg text-green-400 text-xs">
                  <Shield className="w-4 h-4 inline mr-1" />
                  {t.digitalSignature}
                </div>
              </div>
            </div>

            {/* Digital Signature Panel */}
            <div className="lg:col-span-3 bg-gray-800/50 rounded-xl p-6 border border-gray-700/50">
              <h3 className="font-bold mb-4 flex items-center gap-2">
                <Shield className="w-5 h-5" style={{ color: SBER_CONFIG.SBER_GREEN }} />
                🔐 Sistema de Firma Digital - Estándar Sberbank
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                {/* Signature Status */}
                <div className="bg-gray-900/50 rounded-xl p-4 border border-green-500/30">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 rounded-full bg-green-500/20 flex items-center justify-center">
                      <CheckCircle className="w-5 h-5 text-green-400" />
                    </div>
                    <div>
                      <p className="font-bold text-green-400">Firma Habilitada</p>
                      <p className="text-xs text-gray-400">Certificado válido</p>
                    </div>
                  </div>
                  <div className="space-y-1 text-xs">
                    <p className="text-gray-400">Algoritmo: <span className="text-white">RSA-SHA256</span></p>
                    <p className="text-gray-400">Formato: <span className="text-white">PKCS7 Detached</span></p>
                  </div>
                </div>

                {/* Signer Info */}
                <div className="bg-gray-900/50 rounded-xl p-4 border border-cyan-500/30">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 rounded-full bg-cyan-500/20 flex items-center justify-center">
                      <User className="w-5 h-5 text-cyan-400" />
                    </div>
                    <div>
                      <p className="font-bold text-cyan-400">Firmante</p>
                      <p className="text-xs text-gray-400">Autorizado</p>
                    </div>
                  </div>
                  <div className="space-y-1 text-xs">
                    <p className="text-gray-400">Nombre: <span className="text-white">SHAGAEV A.V.</span></p>
                    <p className="text-gray-400">Organización: <span className="text-white">7328077215</span></p>
                  </div>
                </div>

                {/* Certificate Info */}
                <div className="bg-gray-900/50 rounded-xl p-4 border border-purple-500/30">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 rounded-full bg-purple-500/20 flex items-center justify-center">
                      <Key className="w-5 h-5 text-purple-400" />
                    </div>
                    <div>
                      <p className="font-bold text-purple-400">Certificado</p>
                      <p className="text-xs text-gray-400">P12 cargado</p>
                    </div>
                  </div>
                  <div className="space-y-1 text-xs">
                    <p className="text-gray-400">ID: <span className="text-white">SBBAPI_25190</span></p>
                    <p className="text-gray-400">Válido hasta: <span className="text-white">22/01/2027</span></p>
                  </div>
                </div>
              </div>

              {/* Signature Actions */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                <button
                  onClick={async () => {
                    try {
                      setLoading(true);
                      const response = await fetch(`${API_BASE}/api/sber-business/signature/status`);
                      const data = await response.json();
                      setSuccess(`Firma digital: ${data.signatureEnabled ? 'ACTIVA' : 'INACTIVA'} - Algoritmos: ${data.algorithms?.join(', ')}`);
                    } catch (err: any) {
                      setError(`Error: ${err.message}`);
                    } finally {
                      setLoading(false);
                    }
                  }}
                  className="flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-medium transition-all bg-green-500/20 text-green-400 border border-green-500/30 hover:bg-green-500/30"
                >
                  <Shield className="w-4 h-4" />
                  Verificar Estado
                </button>

                <button
                  onClick={async () => {
                    try {
                      setLoading(true);
                      const testDocument = {
                        documentNumber: `PAY-${Date.now()}`,
                        documentDate: new Date().toISOString().split('T')[0],
                        documentType: 'PAY_DOC_RU',
                        amount: '100000.00',
                        currency: 'RUB',
                        payerAccount: '40702810100000012345',
                        payerInn: '7328077215',
                        payerName: 'Test Company LLC',
                        payeeAccount: '40702810200000067890',
                        payeeBic: '044525225',
                        payeeInn: '7707083893',
                        payeeName: 'Sberbank',
                        purpose: 'Test payment signature',
                      };
                      const response = await fetch(`${API_BASE}/api/sber-business/signature/sign`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ document: testDocument }),
                      });
                      const data = await response.json();
                      if (data.success) {
                        setSuccess(`✅ Documento firmado: ${data.signature?.signatureId}`);
                      } else {
                        setError(`Error: ${data.error}`);
                      }
                    } catch (err: any) {
                      setError(`Error: ${err.message}`);
                    } finally {
                      setLoading(false);
                    }
                  }}
                  className="flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-medium transition-all bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 hover:bg-cyan-500/30"
                >
                  <FileSignature className="w-4 h-4" />
                  Firmar Documento
                </button>

                <button
                  onClick={async () => {
                    try {
                      setLoading(true);
                      const testDocument = {
                        documentNumber: 'TEST-001',
                        amount: '50000.00',
                        payerInn: '7328077215',
                      };
                      const response = await fetch(`${API_BASE}/api/sber-business/signature/digest`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ document: testDocument }),
                      });
                      const data = await response.json();
                      if (data.success) {
                        setSuccess(`Hash generado: ${data.digest?.paymentDigest?.substring(0, 32)}...`);
                      }
                    } catch (err: any) {
                      setError(`Error: ${err.message}`);
                    } finally {
                      setLoading(false);
                    }
                  }}
                  className="flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-medium transition-all bg-purple-500/20 text-purple-400 border border-purple-500/30 hover:bg-purple-500/30"
                >
                  <Hash className="w-4 h-4" />
                  Generar Digest
                </button>

                <button
                  onClick={async () => {
                    try {
                      setLoading(true);
                      const testDocument = { documentNumber: 'MULTI-001', amount: '1000000.00' };
                      const signers = [
                        { id: 'S1', name: 'Director General', order: 1 },
                        { id: 'S2', name: 'Chief Accountant', order: 2 },
                        { id: 'S3', name: 'Financial Director', order: 3 },
                      ];
                      const response = await fetch(`${API_BASE}/api/sber-business/signature/multi-sign`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ document: testDocument, signers }),
                      });
                      const data = await response.json();
                      if (data.success) {
                        setSuccess(`Multi-firma: ${data.multiSignature?.collectedSignatures}/${data.multiSignature?.totalSigners} firmas - Estado: ${data.multiSignature?.status}`);
                      }
                    } catch (err: any) {
                      setError(`Error: ${err.message}`);
                    } finally {
                      setLoading(false);
                    }
                  }}
                  className="flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-medium transition-all bg-yellow-500/20 text-yellow-400 border border-yellow-500/30 hover:bg-yellow-500/30"
                >
                  <Users className="w-4 h-4" />
                  Multi-Firma (3)
                </button>
              </div>

              {/* Signature Standards Info */}
              <div className="mt-6 p-4 bg-gray-900/30 rounded-xl border border-gray-700/50">
                <h4 className="font-medium text-sm mb-3 text-gray-300">📋 Estándares de Firma Soportados</h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
                  <div className="space-y-1">
                    <p className="text-green-400 font-medium">RSA-SHA256</p>
                    <p className="text-gray-500">Estándar internacional</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-cyan-400 font-medium">GOST R 34.10-2012</p>
                    <p className="text-gray-500">Estándar ruso</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-purple-400 font-medium">PKCS#7 / CMS</p>
                    <p className="text-gray-500">Formato contenedor</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-yellow-400 font-medium">Detached Signature</p>
                    <p className="text-gray-500">Firma separada</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Payment History - Simple Payments */}
            <div className="lg:col-span-3 bg-gray-800/50 rounded-xl p-6 border border-gray-700/50">
              <h3 className="font-bold mb-4 flex items-center gap-2">
                <History className="w-5 h-5" style={{ color: SBER_CONFIG.SBER_GREEN }} />
                {language === 'es' ? 'Historial de Pagos' : 'Payment History'} ({simplePaymentHistory.length})
              </h3>
              
              {simplePaymentHistory.length > 0 ? (
                <div className="space-y-3 max-h-[400px] overflow-y-auto">
                  {simplePaymentHistory.map((payment: { id: string; externalId: string; amount: number; date: string; status: string; payerAccount: string; payeeName: string; payeeAccount: string; payeeBic: string; purpose: string; signature: string; createdAt: string; }) => (
                    <div key={payment.id} className="p-4 bg-gray-900/50 rounded-lg border border-gray-700/50 hover:border-green-500/30 transition-all">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2 flex-wrap">
                            <span className="text-xl font-bold text-green-400">₽{payment.amount?.toLocaleString()}</span>
                            <span className={`px-2 py-0.5 rounded text-xs font-bold ${
                              payment.status === 'COMPLETED' ? 'bg-green-500/20 text-green-400' :
                              payment.status === 'PENDING' ? 'bg-amber-500/20 text-amber-400' :
                              'bg-gray-500/20 text-gray-400'
                            }`}>
                              {payment.status}
                            </span>
                            <span className="text-xs text-gray-500">{payment.date}</span>
                          </div>
                          
                          <div className="grid grid-cols-2 gap-4 mb-2 text-sm">
                            <div>
                              <p className="text-gray-500 text-xs">{language === 'es' ? 'Cuenta Pagador' : 'Payer Account'}</p>
                              <p className="text-gray-300 font-mono text-xs">{payment.payerAccount}</p>
                            </div>
                            <div>
                              <p className="text-gray-500 text-xs">{language === 'es' ? 'Beneficiario' : 'Beneficiary'}</p>
                              <p className="text-white font-medium text-sm truncate">{payment.payeeName}</p>
                              <p className="text-gray-500 text-xs font-mono">{payment.payeeAccount}</p>
                            </div>
                          </div>
                          
                          <p className="text-gray-400 text-sm line-clamp-1">{payment.purpose}</p>
                          <p className="text-gray-500 text-xs mt-1">ID: {payment.externalId?.slice(0, 25)}...</p>
                        </div>
                        
                        <div className="flex flex-col gap-2">
                          {payment.signature && (
                            <span className="px-2 py-1 bg-green-500/10 text-green-400 text-xs rounded flex items-center gap-1">
                              <Shield className="w-3 h-3" /> {language === 'es' ? 'Firmado' : 'Signed'}
                            </span>
                          )}
                          
                          <button
                            onClick={() => {
                              quickGenerateReceipt(
                                payment.amount,
                                'RUB',
                                payment.payerAccount || 'N/A',
                                'DCB Custody Account - Sberbank',
                                'DCB-SBER-CUSTODY-001',
                                payment.payeeName,
                                payment.payeeAccount || 'N/A',
                                {
                                  payerName: 'Sberbank Corporate Account',
                                  payerBank: 'Sberbank Russia (PAO)',
                                  beneficiaryBank: 'Sberbank Russia (PAO)',
                                  beneficiaryBIC: payment.payeeBic,
                                  concept: payment.purpose,
                                  date: payment.date,
                                  time: payment.createdAt ? new Date(payment.createdAt).toTimeString().slice(0, 8) : undefined,
                                  reference: payment.externalId,
                                  status: (payment.status || 'SIGNED') as 'COMPLETED' | 'PENDING' | 'PROCESSING' | 'SIGNED' | 'SUBMITTED',
                                  mode: 'LOCAL' as const,
                                  signatureInfo: payment.signature ? {
                                    signerName: 'SHAGAEV A.V.',
                                    signatureId: payment.signature,
                                    algorithm: 'RSA-SHA256',
                                  } : undefined,
                                }
                              );
                            }}
                            className="px-3 py-1.5 bg-blue-500/10 text-blue-400 text-xs rounded hover:bg-blue-500/20 flex items-center gap-1 transition-all"
                            title={language === 'es' ? 'Descargar Recibo Profesional PDF' : 'Download Professional PDF Receipt'}
                          >
                            <Download className="w-3 h-3" />
                            PDF
                          </button>
                          
                          <button
                            onClick={() => {
                              if (confirm(language === 'es' ? '¿Eliminar este pago del historial?' : 'Delete this payment from history?')) {
                                const filtered = simplePaymentHistory.filter(p => p.id !== payment.id);
                                setSimplePaymentHistory(filtered);
                                localStorage.setItem('sberbank_payment_history', JSON.stringify(filtered));
                              }
                            }}
                            className="px-3 py-1.5 bg-red-500/10 text-red-400 text-xs rounded hover:bg-red-500/20 flex items-center gap-1 transition-all"
                            title={language === 'es' ? 'Eliminar' : 'Delete'}
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <History className="w-16 h-16 text-gray-700 mx-auto mb-4" />
                  <p className="text-gray-500">{language === 'es' ? 'No hay pagos en el historial' : 'No payments in history'}</p>
                  <p className="text-gray-600 text-sm mt-2">{language === 'es' ? 'Los pagos creados aparecerán aquí' : 'Created payments will appear here'}</p>
                </div>
              )}
            </div>
          </>
        )}

        {/* ═══════════════════════════════════════════════════════════════════════════════ */}
        {/* PAYMENTS 2 TAB - Full Real Integration */}
        {/* ═══════════════════════════════════════════════════════════════════════════════ */}
        {activeTab === 'payments2' && (
          <>
            {/* Header */}
            <div className="lg:col-span-3 bg-gradient-to-r from-green-900/50 to-emerald-900/50 rounded-xl p-6 border border-green-500/30">
              <div className="flex items-center justify-between flex-wrap gap-4">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-xl bg-green-500/20 flex items-center justify-center">
                    <Banknote className="w-7 h-7 text-green-400" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-white">{language === 'es' ? 'Pagos 2 - Integración Real Sberbank' : 'Payments 2 - Real Sberbank Integration'}</h2>
                    <p className="text-green-400/80 text-sm">{language === 'es' ? 'Órdenes de Pago en Rublos (RPO) con Firma Digital' : 'Ruble Payment Orders (RPO) with Digital Signature'}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`px-3 py-1 rounded-full text-xs font-bold ${connectionStatus === 'connected' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                    {connectionStatus === 'connected' ? (language === 'es' ? '● CONECTADO REAL' : '● CONNECTED REAL') : (language === 'es' ? '○ DESCONECTADO' : '○ DISCONNECTED')}
                  </span>
                </div>
              </div>
            </div>

            {/* Document Info */}
            <div className="lg:col-span-3 bg-gray-800/50 rounded-xl p-6 border border-gray-700/50">
              <h3 className="font-bold mb-4 flex items-center gap-2">
                <FileText className="w-5 h-5" style={{ color: SBER_CONFIG.SBER_GREEN }} />
                {language === 'es' ? 'Documento' : 'Document'}
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <label className="block text-sm text-gray-400 mb-1">{language === 'es' ? 'Número' : 'Number'}</label>
                  <input
                    type="text"
                    value={payment2Form.number}
                    onChange={e => setPayment2Form(prev => ({ ...prev, number: e.target.value.slice(0, 8) }))}
                    className="w-full bg-gray-900/50 border border-gray-700 rounded-lg px-3 py-2 text-white"
                    placeholder="1-8 chars"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-1">{language === 'es' ? 'Fecha' : 'Date'}</label>
                  <input
                    type="date"
                    value={payment2Form.date}
                    onChange={e => setPayment2Form(prev => ({ ...prev, date: e.target.value }))}
                    className="w-full bg-gray-900/50 border border-gray-700 rounded-lg px-3 py-2 text-white"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm text-gray-400 mb-1">{t.externalId}</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={payment2Form.externalId}
                      readOnly
                      className="flex-1 bg-gray-900/50 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm"
                    />
                    <button onClick={generatePayment2ExternalId} className="p-2 bg-gray-700 rounded-lg hover:bg-gray-600" title={language === 'es' ? 'Generar' : 'Generate'}>
                      <RefreshCw className="w-4 h-4 text-gray-300" />
                    </button>
                    <button onClick={() => { navigator.clipboard.writeText(payment2Form.externalId); setSuccess(language === 'es' ? 'ID copiado' : 'ID copied'); }} className="p-2 bg-gray-700 rounded-lg hover:bg-gray-600" title={language === 'es' ? 'Copiar' : 'Copy'}>
                      <Copy className="w-4 h-4 text-gray-300" />
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Payment Details */}
            <div className="lg:col-span-3 bg-gray-800/50 rounded-xl p-6 border border-gray-700/50">
              <h3 className="font-bold mb-4 flex items-center gap-2">
                <DollarSign className="w-5 h-5" style={{ color: SBER_CONFIG.SBER_GREEN }} />
                {t.paymentDetails}
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm text-gray-400 mb-1">{t.amount} (₽) *</label>
                  <input
                    type="number"
                    value={payment2Form.amount || ''}
                    onChange={e => setPayment2Form(prev => ({ ...prev, amount: parseFloat(e.target.value) || 0 }))}
                    className="w-full bg-gray-900/50 border border-gray-700 rounded-lg px-3 py-2 text-white text-lg font-bold"
                    placeholder="0.00"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-1">{language === 'es' ? 'Prioridad' : 'Priority'}</label>
                  <select
                    value={payment2Form.priority}
                    onChange={e => setPayment2Form(prev => ({ ...prev, priority: e.target.value }))}
                    className="w-full bg-gray-900/50 border border-gray-700 rounded-lg px-3 py-2 text-white"
                  >
                    <option value="1">1 - {language === 'es' ? 'Máxima' : 'Maximum'}</option>
                    <option value="2">2 - {language === 'es' ? 'Alta' : 'High'}</option>
                    <option value="3">3 - {language === 'es' ? 'Media' : 'Medium'}</option>
                    <option value="4">4 - {language === 'es' ? 'Baja' : 'Low'}</option>
                    <option value="5">5 - {t.normal}</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-1">{t.urgency}</label>
                  <select
                    value={payment2Form.urgencyCode}
                    onChange={e => setPayment2Form(prev => ({ ...prev, urgencyCode: e.target.value }))}
                    className="w-full bg-gray-900/50 border border-gray-700 rounded-lg px-3 py-2 text-white"
                  >
                    <option value="NORMAL">NORMAL</option>
                    <option value="INTERNAL">INTERNAL</option>
                    <option value="BESP">BESP ({t.urgent})</option>
                  </select>
                </div>
                <div className="md:col-span-3">
                  <label className="block text-sm text-gray-400 mb-1">{t.purpose} *</label>
                  <textarea
                    value={payment2Form.purpose}
                    onChange={e => setPayment2Form(prev => ({ ...prev, purpose: e.target.value.slice(0, 210) }))}
                    className="w-full bg-gray-900/50 border border-gray-700 rounded-lg px-3 py-2 text-white"
                    rows={2}
                    placeholder="Оплата по договору №... от... НДС не облагается"
                  />
                  <span className="text-xs text-gray-500">{payment2Form.purpose.length}/210</span>
                </div>
              </div>
            </div>

            {/* Payer Info */}
            <div className="lg:col-span-3 bg-gray-800/50 rounded-xl p-6 border border-purple-500/30">
              <h3 className="font-bold mb-4 flex items-center gap-2">
                <Building2 className="w-5 h-5 text-purple-400" />
                {language === 'es' ? 'Pagador (Payer)' : 'Payer'}
              </h3>
              
              {/* Selector */}
              <div className="mb-4 p-4 bg-purple-500/10 rounded-lg border border-purple-500/20">
                <label className="block text-sm text-purple-400 mb-2 font-medium">{t.selectPayerAccount}</label>
                <select
                  onChange={e => handleSelectPayerAccount2(e.target.value)}
                  className="w-full bg-gray-900/50 border border-purple-500/30 rounded-lg px-3 py-3 text-white"
                  defaultValue=""
                >
                  <option value="" disabled>-- {t.selectConfiguredAccount} --</option>
                  {predefinedPayerAccounts.map(acc => (
                    <option key={acc.id} value={acc.id}>{acc.name} | {acc.account}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-sm text-gray-400 mb-1">{language === 'es' ? 'Nombre' : 'Name'} *</label>
                  <input type="text" value={payment2Form.payerName} onChange={e => setPayment2Form(prev => ({ ...prev, payerName: e.target.value.slice(0, 160) }))} className="w-full bg-gray-900/50 border border-gray-700 rounded-lg px-3 py-2 text-white" />
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-1">INN *</label>
                  <input type="text" value={payment2Form.payerInn} onChange={e => setPayment2Form(prev => ({ ...prev, payerInn: e.target.value.replace(/\D/g, '').slice(0, 12) }))} className="w-full bg-gray-900/50 border border-gray-700 rounded-lg px-3 py-2 text-white" />
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-1">KPP</label>
                  <input type="text" value={payment2Form.payerKpp} onChange={e => setPayment2Form(prev => ({ ...prev, payerKpp: e.target.value.replace(/\D/g, '').slice(0, 9) }))} className="w-full bg-gray-900/50 border border-gray-700 rounded-lg px-3 py-2 text-white" />
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-1">{language === 'es' ? 'Cuenta' : 'Account'} *</label>
                  <input type="text" value={payment2Form.payerAccount} onChange={e => setPayment2Form(prev => ({ ...prev, payerAccount: e.target.value.replace(/\D/g, '').slice(0, 20) }))} className="w-full bg-gray-900/50 border border-gray-700 rounded-lg px-3 py-2 text-white" />
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-1">BIC *</label>
                  <input type="text" value={payment2Form.payerBankBic} onChange={e => setPayment2Form(prev => ({ ...prev, payerBankBic: e.target.value.replace(/\D/g, '').slice(0, 9) }))} className="w-full bg-gray-900/50 border border-gray-700 rounded-lg px-3 py-2 text-white" />
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-1">{t.corrAccount} *</label>
                  <input type="text" value={payment2Form.payerBankCorrAccount} onChange={e => setPayment2Form(prev => ({ ...prev, payerBankCorrAccount: e.target.value.replace(/\D/g, '').slice(0, 20) }))} className="w-full bg-gray-900/50 border border-gray-700 rounded-lg px-3 py-2 text-white" />
                </div>
              </div>
            </div>

            {/* Payee Info */}
            <div className="lg:col-span-3 bg-gray-800/50 rounded-xl p-6 border border-cyan-500/30">
              <h3 className="font-bold mb-4 flex items-center gap-2">
                <Send className="w-5 h-5 text-cyan-400" />
                {language === 'es' ? 'Beneficiario (Payee)' : 'Beneficiary'}
              </h3>
              
              {/* Selector */}
              <div className="mb-4 p-4 bg-cyan-500/10 rounded-lg border border-cyan-500/20">
                <label className="block text-sm text-cyan-400 mb-2 font-medium">{t.selectBeneficiary}</label>
                <select
                  onChange={e => handleSelectPayeeAccount2(e.target.value)}
                  className="w-full bg-gray-900/50 border border-cyan-500/30 rounded-lg px-3 py-3 text-white"
                  defaultValue=""
                >
                  <option value="" disabled>-- {t.selectBeneficiaryPlaceholder} --</option>
                  {predefinedPayeeAccounts.map(acc => (
                    <option key={acc.id} value={acc.id}>{acc.name} | {acc.account}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-sm text-gray-400 mb-1">{language === 'es' ? 'Nombre' : 'Name'} *</label>
                  <input type="text" value={payment2Form.payeeName} onChange={e => setPayment2Form(prev => ({ ...prev, payeeName: e.target.value.slice(0, 160) }))} className="w-full bg-gray-900/50 border border-gray-700 rounded-lg px-3 py-2 text-white" />
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-1">{t.inn}</label>
                  <input type="text" value={payment2Form.payeeInn} onChange={e => setPayment2Form(prev => ({ ...prev, payeeInn: e.target.value.replace(/\D/g, '').slice(0, 12) }))} className="w-full bg-gray-900/50 border border-gray-700 rounded-lg px-3 py-2 text-white" />
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-1">{t.kpp}</label>
                  <input type="text" value={payment2Form.payeeKpp} onChange={e => setPayment2Form(prev => ({ ...prev, payeeKpp: e.target.value.replace(/\D/g, '').slice(0, 9) }))} className="w-full bg-gray-900/50 border border-gray-700 rounded-lg px-3 py-2 text-white" />
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-1">{language === 'es' ? 'Cuenta' : 'Account'}</label>
                  <input type="text" value={payment2Form.payeeAccount} onChange={e => setPayment2Form(prev => ({ ...prev, payeeAccount: e.target.value.replace(/\D/g, '').slice(0, 20) }))} className="w-full bg-gray-900/50 border border-gray-700 rounded-lg px-3 py-2 text-white" />
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-1">BIC *</label>
                  <input type="text" value={payment2Form.payeeBankBic} onChange={e => setPayment2Form(prev => ({ ...prev, payeeBankBic: e.target.value.replace(/\D/g, '').slice(0, 9) }))} className="w-full bg-gray-900/50 border border-gray-700 rounded-lg px-3 py-2 text-white" />
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-1">{t.corrAccount}</label>
                  <input type="text" value={payment2Form.payeeBankCorrAccount} onChange={e => setPayment2Form(prev => ({ ...prev, payeeBankCorrAccount: e.target.value.replace(/\D/g, '').slice(0, 20) }))} className="w-full bg-gray-900/50 border border-gray-700 rounded-lg px-3 py-2 text-white" />
                </div>
              </div>
            </div>

            {/* Processing Mode */}
            <div className="lg:col-span-3 bg-gray-800/50 rounded-xl p-6 border border-gray-700/50">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${immediateProcessing ? 'bg-green-500/20' : 'bg-amber-500/20'}`}>
                    {immediateProcessing ? <Send className="w-6 h-6 text-green-400" /> : <Clock className="w-6 h-6 text-amber-400" />}
                  </div>
                  <div>
                    <p className="text-white font-bold text-lg">
                      {immediateProcessing 
                        ? (language === 'es' ? 'Procesamiento Inmediato' : 'Immediate Processing') 
                        : (language === 'es' ? 'Guardar como Borrador' : 'Save as Draft')}
                    </p>
                    <p className="text-gray-400 text-sm">
                      {immediateProcessing 
                        ? (language === 'es' ? 'digestSignatures incluido → Banco procesa inmediatamente' : 'digestSignatures included → Bank processes immediately')
                        : (language === 'es' ? 'Sin firma → Debe firmarse en SberBusiness UI' : 'No signature → Must be signed in SberBusiness UI')}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setImmediateProcessing(!immediateProcessing)}
                  className={`relative w-16 h-8 rounded-full transition-all ${immediateProcessing ? 'bg-green-500' : 'bg-gray-600'}`}
                >
                  <div className={`absolute top-1 w-6 h-6 rounded-full bg-white transition-all ${immediateProcessing ? 'left-9' : 'left-1'}`} />
                </button>
              </div>
            </div>

            {/* Submit Button */}
            <div className="lg:col-span-3">
              <button
                onClick={handleCreatePayment2}
                disabled={loading}
                className="w-full py-4 rounded-xl font-bold text-white text-lg flex items-center justify-center gap-3 disabled:opacity-50 transition-all hover:scale-[1.02]"
                style={{ background: `linear-gradient(135deg, ${SBER_CONFIG.SBER_GREEN} 0%, #1a8833 100%)` }}
              >
                {loading ? (
                  <><Loader2 className="w-6 h-6 animate-spin" /> {language === 'es' ? 'Procesando...' : 'Processing...'}</>
                ) : (
                  <><Shield className="w-6 h-6" /> {immediateProcessing 
                    ? (language === 'es' ? 'Crear, Firmar y Procesar' : 'Create, Sign & Process') 
                    : (language === 'es' ? 'Guardar Borrador' : 'Save Draft')}</>
                )}
              </button>
            </div>

            {/* Payment History */}
            <div className="lg:col-span-3 bg-gray-800/50 rounded-xl p-6 border border-gray-700/50">
              <h3 className="font-bold mb-4 flex items-center gap-2">
                <History className="w-5 h-5" style={{ color: SBER_CONFIG.SBER_GREEN }} />
                {t.paymentHistory} ({payment2History.length})
              </h3>
              
              {payment2History.length > 0 ? (
                <div className="space-y-3 max-h-[600px] overflow-y-auto">
                  {payment2History.map(payment => (
                    <div key={payment.id} className="p-4 bg-gray-900/50 rounded-lg border border-gray-700/50 hover:border-green-500/30 transition-all">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2 flex-wrap">
                            <span className="text-xl font-bold text-green-400">₽{payment.amount?.toLocaleString()}</span>
                            <span className={`px-2 py-0.5 rounded text-xs font-bold ${
                              payment.status === 'COMPLETED' || payment.status === 'SUBMITTED' ? 'bg-green-500/20 text-green-400' :
                              payment.status === 'PENDING' || payment.status === 'SIGNED_LOCALLY' ? 'bg-amber-500/20 text-amber-400' :
                              payment.status === 'DRAFT' ? 'bg-blue-500/20 text-blue-400' :
                              'bg-red-500/20 text-red-400'
                            }`}>
                              {payment.status}
                            </span>
                            {/* Mode badge */}
                            {payment.mode && (
                              <span className={`px-2 py-0.5 rounded text-xs font-bold ${
                                payment.mode === 'REAL' ? 'bg-green-500/30 text-green-300' :
                                payment.mode === 'LOCAL' ? 'bg-purple-500/20 text-purple-400' :
                                'bg-gray-500/20 text-gray-400'
                              }`}>
                                {payment.mode === 'REAL' ? '✓ REAL API' : payment.mode === 'LOCAL' ? '⚡ LOCAL' : payment.mode}
                              </span>
                            )}
                            {/* Multi-signature badge */}
                            {payment.multiSignature && (
                              <span className="px-2 py-0.5 rounded text-xs bg-cyan-500/20 text-cyan-400">
                                {payment.multiSignature.collectedSignatures}/{payment.multiSignature.totalSigners} {language === 'es' ? 'firmas' : 'signatures'}
                              </span>
                            )}
                            <span className="text-xs text-gray-500">{payment.date}</span>
                          </div>
                          
                          {/* Payer and Payee info */}
                          <div className="grid grid-cols-2 gap-4 mb-2">
                            <div>
                              <p className="text-gray-500 text-xs">{language === 'es' ? 'De (Pagador)' : 'From (Payer)'}</p>
                              <p className="text-gray-300 text-sm truncate">{payment.payerName}</p>
                              <p className="text-gray-500 text-xs font-mono">{payment.payerAccount}</p>
                            </div>
                            <div>
                              <p className="text-gray-500 text-xs">{language === 'es' ? 'Para (Beneficiario)' : 'To (Beneficiary)'}</p>
                              <p className="text-white font-medium text-sm truncate">{payment.payeeName}</p>
                              <p className="text-gray-500 text-xs font-mono">{payment.payeeAccount}</p>
                            </div>
                          </div>
                          
                          <p className="text-gray-400 text-sm mt-1 line-clamp-1">{payment.purpose}</p>
                          <p className="text-gray-500 text-xs mt-2">ID: {payment.externalId?.slice(0, 30)}...</p>
                          {payment.latency && (
                            <p className="text-gray-600 text-xs">Latency: {payment.latency}ms</p>
                          )}
                        </div>
                        
                        {/* Actions column */}
                        <div className="flex flex-col gap-2">
                          {/* Signature badge */}
                          {(payment.signature || payment.multiSignature) && (
                            <span className="px-2 py-1 bg-green-500/10 text-green-400 text-xs rounded flex items-center gap-1">
                              <Shield className="w-3 h-3" /> {language === 'es' ? 'Firmado' : 'Signed'}
                            </span>
                          )}
                          
                          {/* Download Professional PDF Receipt */}
                          <button
                            onClick={() => {
                              generateSberbankPaymentReceipt({
                                id: payment.id,
                                externalId: payment.externalId,
                                amount: payment.amount,
                                currency: 'RUB',
                                date: payment.date,
                                status: payment.status,
                                mode: payment.mode,
                                payerName: payment.payerName,
                                payerInn: payment.payerInn,
                                payerAccount: payment.payerAccount,
                                payeeName: payment.payeeName,
                                payeeInn: payment.payeeInn,
                                payeeAccount: payment.payeeAccount,
                                payeeBankBic: payment.payeeBankBic,
                                purpose: payment.purpose,
                                multiSignature: payment.multiSignature,
                                digest: payment.digest,
                              });
                            }}
                            className="px-3 py-1.5 bg-blue-500/10 text-blue-400 text-xs rounded hover:bg-blue-500/20 flex items-center gap-1 transition-all"
                            title={language === 'es' ? 'Descargar Recibo Profesional PDF' : 'Download Professional PDF Receipt'}
                          >
                            <Download className="w-3 h-3" />
                            PDF
                          </button>
                          
                          {/* Delete button */}
                          <button
                            onClick={() => {
                              if (confirm(language === 'es' ? '¿Eliminar este pago del historial?' : 'Delete this payment from history?')) {
                                const filtered = payment2History.filter(p => p.id !== payment.id);
                                setPayment2History(filtered);
                                localStorage.setItem('sber2_payment_history', JSON.stringify(filtered));
                              }
                            }}
                            className="px-3 py-1.5 bg-red-500/10 text-red-400 text-xs rounded hover:bg-red-500/20 flex items-center gap-1 transition-all"
                            title={language === 'es' ? 'Eliminar' : 'Delete'}
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <History className="w-16 h-16 text-gray-700 mx-auto mb-4" />
                  <p className="text-gray-500">{language === 'es' ? 'No hay pagos en el historial' : 'No payments in history'}</p>
                </div>
              )}
            </div>

            {/* Info Panel */}
            <div className="lg:col-span-3 bg-blue-500/10 border border-blue-500/30 rounded-xl p-6">
              <div className="flex items-start gap-4">
                <Info className="w-6 h-6 text-blue-400 flex-shrink-0 mt-1" />
                <div>
                  <h4 className="font-bold text-blue-400 mb-3">Flujo de Trabajo - Integración Real</h4>
                  <div className="text-blue-300/80 text-sm space-y-2">
                    <p>1. <strong>Documento:</strong> Completar información del pago</p>
                    <p>2. <strong>Firma Digital:</strong> RSA-SHA256 automática con certificado P12</p>
                    <p>3. <strong>Envío:</strong> POST /fintech/api/v1/payments → Sberbank Real</p>
                    <p>4. <strong>Estado:</strong> {immediateProcessing ? 'PENDING → Banco procesa' : 'DRAFT → Firmar en SberBusiness'}</p>
                    <p>5. <strong>Confirmación:</strong> IMPLEMENTED → Settlement final</p>
                  </div>
                </div>
              </div>
            </div>
          </>
        )}

        {/* ═══════════════════════════════════════════════════════════════════════════════ */}
        {/* METHODS TAB */}
        {/* ═══════════════════════════════════════════════════════════════════════════════ */}
        {activeTab === 'methods' && (
          <>
            <div className="lg:col-span-2 bg-gray-800/50 rounded-xl p-6 border border-gray-700/50">
              <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
                <Server className="w-5 h-5" style={{ color: SBER_CONFIG.SBER_GREEN }} />
                API Methods Testing
              </h2>
              
              <div className="mb-4">
                <label className="block text-sm text-gray-400 mb-1">Seleccionar Método</label>
                <select
                  value={selectedMethod}
                  onChange={e => {
                    setSelectedMethod(e.target.value);
                    setMethodParams({});
                    setMethodResponse(null);
                  }}
                  className="w-full bg-gray-900/50 border border-gray-700 rounded-lg px-3 py-2 text-white"
                >
                  <option value="">Seleccionar método...</option>
                  {categories.map(cat => (
                    <optgroup key={cat.id} label={cat.name}>
                      {getMethodsByCategory(cat.id).map(method => (
                        <option key={method.id} value={method.id}>{method.name}</option>
                      ))}
                    </optgroup>
                  ))}
                </select>
              </div>
              
              {selectedMethod && (
                <>
                  <div className="mb-4 p-3 bg-gray-900/50 rounded-lg">
                    <p className="text-sm text-gray-400">Endpoint:</p>
                    <code className="text-xs text-cyan-400">{SBER_CONFIG.API_BASE_URL}/{selectedMethod.toLowerCase()}</code>
                  </div>
                  
                  <div className="mb-4">
                    <label className="block text-sm text-gray-400 mb-1">Parámetros (JSON)</label>
                    <textarea
                      value={JSON.stringify(methodParams, null, 2)}
                      onChange={e => {
                        try {
                          setMethodParams(JSON.parse(e.target.value));
                        } catch {}
                      }}
                      className="w-full bg-gray-900/50 border border-gray-700 rounded-lg px-3 py-2 text-white font-mono text-sm"
                      rows={6}
                      placeholder="{}"
                    />
                  </div>
                  
                  <button
                    onClick={handleExecuteMethod}
                    disabled={loading || !config.accessToken}
                    className="w-full py-3 rounded-lg font-bold text-white flex items-center justify-center gap-2 disabled:opacity-50"
                    style={{ background: `linear-gradient(135deg, ${SBER_CONFIG.SBER_GREEN} 0%, ${SBER_CONFIG.SBER_DARK} 100%)` }}
                  >
                    {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Zap className="w-5 h-5" />}
                    Ejecutar Método
                  </button>
                  
                  {methodResponse && (
                    <div className="mt-4">
                      <label className="block text-sm text-gray-400 mb-1">Respuesta:</label>
                      <pre className="p-3 bg-gray-900 rounded-lg text-xs text-green-400 overflow-auto max-h-64">
                        {JSON.stringify(methodResponse, null, 2)}
                      </pre>
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Methods List */}
            <div className="bg-gray-800/50 rounded-xl p-6 border border-gray-700/50 max-h-[600px] overflow-y-auto">
              <h3 className="font-bold mb-4 flex items-center gap-2">
                <List className="w-5 h-5" style={{ color: SBER_CONFIG.SBER_GREEN }} />
                Métodos Disponibles ({SBER_CONFIG.METHODS.length})
              </h3>
              
              <div className="space-y-4">
                {categories.map(cat => {
                  const methods = getMethodsByCategory(cat.id);
                  if (methods.length === 0) return null;
                  
                  return (
                    <div key={cat.id}>
                      <div className="flex items-center gap-2 text-sm font-medium text-gray-400 mb-2">
                        <cat.icon className="w-4 h-4" />
                        {cat.name}
                      </div>
                      <div className="space-y-1">
                        {methods.map(method => (
                          <button
                            key={method.id}
                            onClick={() => {
                              setSelectedMethod(method.id);
                              setMethodParams({});
                              setMethodResponse(null);
                            }}
                            className={`w-full text-left p-2 rounded text-xs font-mono transition-colors ${
                              selectedMethod === method.id
                                ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                                : 'bg-gray-900/50 text-gray-400 hover:bg-gray-700/50'
                            }`}
                          >
                            {method.id}
                          </button>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </>
        )}

        {/* ═══════════════════════════════════════════════════════════════════════════════ */}
        {/* SETTINGS TAB */}
        {/* ═══════════════════════════════════════════════════════════════════════════════ */}
        {activeTab === 'settings' && (
          <>
            <div className="lg:col-span-2 bg-gray-800/50 rounded-xl p-6 border border-gray-700/50">
              <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
                <Settings className="w-5 h-5" style={{ color: SBER_CONFIG.SBER_GREEN }} />
                Configuración General
              </h2>
              
              <div className="space-y-4">
                {/* Environment Selection */}
                <div className="p-4 bg-gray-900/50 rounded-xl border border-gray-700/50">
                  <label className="block text-sm text-gray-400 mb-3">🌐 Entorno de Conexión</label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      onClick={() => {
                        setConfig(prev => ({ ...prev, environment: 'sandbox' }));
                        setConnectionStatus('disconnected');
                      }}
                      className={`p-4 rounded-xl font-medium transition-all ${
                        config.environment === 'sandbox'
                          ? 'bg-yellow-500/20 text-yellow-400 border-2 border-yellow-500 shadow-lg shadow-yellow-500/20'
                          : 'bg-gray-700/50 text-gray-400 border border-gray-600 hover:border-yellow-500/50'
                      }`}
                    >
                      <div className="text-2xl mb-2">🧪</div>
                      <div className="font-bold">SANDBOX</div>
                      <div className="text-xs mt-1 opacity-70">Ambiente de Pruebas</div>
                    </button>
                    <button
                      onClick={() => {
                        setConfig(prev => ({ ...prev, environment: 'production' }));
                        setConnectionStatus('disconnected');
                      }}
                      className={`p-4 rounded-xl font-medium transition-all ${
                        config.environment === 'production'
                          ? 'bg-green-500/20 text-green-400 border-2 border-green-500 shadow-lg shadow-green-500/20'
                          : 'bg-gray-700/50 text-gray-400 border border-gray-600 hover:border-green-500/50'
                      }`}
                    >
                      <div className="text-2xl mb-2">🚀</div>
                      <div className="font-bold">PRODUCTION</div>
                      <div className="text-xs mt-1 opacity-70">Servidor Real</div>
                    </button>
                  </div>
                  <p className="text-xs text-gray-500 mt-3 text-center">
                    {config.environment === 'production' 
                      ? '⚠️ Estás en modo producción - Las transacciones son reales'
                      : '✅ Modo sandbox - Pruebas sin afectar datos reales'}
                  </p>
                </div>
                
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Client ID</label>
                  <input
                    type="text"
                    value={config.clientId}
                    onChange={e => setConfig(prev => ({ ...prev, clientId: e.target.value }))}
                    className="w-full bg-gray-900/50 border border-gray-700 rounded-lg px-3 py-2 text-white"
                  />
                </div>
                
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Redirect URI</label>
                  <input
                    type="url"
                    value={config.redirectUri}
                    onChange={e => setConfig(prev => ({ ...prev, redirectUri: e.target.value }))}
                    className="w-full bg-gray-900/50 border border-gray-700 rounded-lg px-3 py-2 text-white"
                    placeholder="https://your-domain.com/callback"
                  />
                </div>
                
                <div className="border-t border-gray-700 pt-4">
                  <h3 className="font-medium mb-3">Información de la Organización</h3>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="col-span-2">
                      <label className="block text-sm text-gray-400 mb-1">Nombre Completo (orgFullName)</label>
                      <input
                        type="text"
                        value={orgInfo.orgFullName}
                        onChange={e => setOrgInfo(prev => ({ ...prev, orgFullName: e.target.value }))}
                        className="w-full bg-gray-900/50 border border-gray-700 rounded-lg px-3 py-2 text-white"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm text-gray-400 mb-1">OGRN</label>
                      <input
                        type="text"
                        value={orgInfo.orgOgrn}
                        onChange={e => setOrgInfo(prev => ({ ...prev, orgOgrn: e.target.value }))}
                        className="w-full bg-gray-900/50 border border-gray-700 rounded-lg px-3 py-2 text-white"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm text-gray-400 mb-1">KPP</label>
                      <input
                        type="text"
                        value={orgInfo.orgKpp}
                        onChange={e => setOrgInfo(prev => ({ ...prev, orgKpp: e.target.value }))}
                        className="w-full bg-gray-900/50 border border-gray-700 rounded-lg px-3 py-2 text-white"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm text-gray-400 mb-1">OKTMO</label>
                      <input
                        type="text"
                        value={orgInfo.orgOktmo}
                        onChange={e => setOrgInfo(prev => ({ ...prev, orgOktmo: e.target.value }))}
                        className="w-full bg-gray-900/50 border border-gray-700 rounded-lg px-3 py-2 text-white"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm text-gray-400 mb-1">Territorial Bank</label>
                      <input
                        type="text"
                        value={orgInfo.terBank}
                        onChange={e => setOrgInfo(prev => ({ ...prev, terBank: e.target.value }))}
                        className="w-full bg-gray-900/50 border border-gray-700 rounded-lg px-3 py-2 text-white"
                      />
                    </div>
                  </div>
                </div>
                
                <button
                  onClick={() => {
                    localStorage.removeItem('sber_business_api_config');
                    localStorage.removeItem('sber_api_logs');
                    localStorage.removeItem('sber_org_info');
                    window.location.reload();
                  }}
                  className="w-full py-2 bg-red-600 hover:bg-red-500 rounded-lg font-medium mt-4"
                >
                  Limpiar Configuración
                </button>
              </div>
            </div>

            {/* Request Fields Reference */}
            <div className="bg-gray-800/50 rounded-xl p-6 border border-gray-700/50">
              <h3 className="font-bold mb-4 flex items-center gap-2">
                <Database className="w-5 h-5" style={{ color: SBER_CONFIG.SBER_GREEN }} />
                Campos de Request
              </h3>
              <div className="space-y-1 max-h-64 overflow-y-auto">
                {SBER_CONFIG.REQUEST_FIELDS.map(field => (
                  <div key={field} className="p-2 bg-gray-900/50 rounded text-xs font-mono text-cyan-400">
                    {field}
                  </div>
                ))}
              </div>
            </div>
          </>
        )}

        {/* ═══════════════════════════════════════════════════════════════════════════════ */}
        {/* DOCS TAB */}
        {/* ═══════════════════════════════════════════════════════════════════════════════ */}
        {activeTab === 'docs' && (
          <>
            <div className="lg:col-span-3 bg-gray-800/50 rounded-xl p-6 border border-gray-700/50">
              <h2 className="text-lg font-bold mb-6 flex items-center gap-2">
                <BookOpen className="w-5 h-5" style={{ color: SBER_CONFIG.SBER_GREEN }} />
                Documentación y Recursos
              </h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {/* Official Docs */}
                <a
                  href="https://developers.sber.ru/docs/ru/sber-api/overview"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-4 bg-gray-900/50 rounded-lg border border-gray-700 hover:border-green-500/50 transition-colors"
                >
                  <div className="flex items-center gap-3 mb-2">
                    <div className="p-2 rounded-lg" style={{ background: SBER_CONFIG.SBER_GREEN }}>
                      <ExternalLink className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <p className="font-medium">Documentación Oficial</p>
                      <p className="text-xs text-gray-400">developers.sber.ru</p>
                    </div>
                  </div>
                  <p className="text-sm text-gray-400">Guía completa de integración con Sber API</p>
                </a>
                
                {/* Support */}
                <div className="p-4 bg-gray-900/50 rounded-lg border border-gray-700">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="p-2 rounded-lg bg-blue-500/20">
                      <Mail className="w-5 h-5 text-blue-400" />
                    </div>
                    <div>
                      <p className="font-medium">Soporte Técnico</p>
                      <p className="text-xs text-gray-400">1-3 días hábiles</p>
                    </div>
                  </div>
                  <a href="mailto:supportdbo2@sberbank.ru" className="text-sm text-cyan-400 hover:text-cyan-300">
                    supportdbo2@sberbank.ru
                  </a>
                </div>
                
                {/* Implementation Flow */}
                <div className="p-4 bg-gray-900/50 rounded-lg border border-gray-700">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="p-2 rounded-lg bg-purple-500/20">
                      <Zap className="w-5 h-5 text-purple-400" />
                    </div>
                    <div>
                      <p className="font-medium">Flujo de Implementación</p>
                      <p className="text-xs text-gray-400">8 pasos</p>
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Implementation Flow */}
              <div className="mt-6 p-4 bg-gray-900/50 rounded-lg border border-gray-700">
                <h3 className="font-medium mb-4">📋 Flujo Técnico de Implementación</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
                  {[
                    { step: 1, title: 'Registrar Redirect URI', desc: 'Configurar en Sber Portal' },
                    { step: 2, title: 'Implementar OAuth2', desc: 'OpenID Connect' },
                    { step: 3, title: 'Solicitar Token', desc: 'client_id = 25190' },
                    { step: 4, title: 'Consumir Endpoints', desc: 'Usar scopes habilitados' },
                    { step: 5, title: 'Firmar Solicitudes', desc: 'Estándar Sber' },
                    { step: 6, title: 'Validar Respuestas', desc: 'Verificar estados' },
                    { step: 7, title: 'Testing Completo', desc: 'Sandbox environment' },
                    { step: 8, title: 'Producción', desc: 'Tras validación' },
                  ].map(item => (
                    <div key={item.step} className="p-3 bg-gray-800 rounded-lg">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold" style={{ background: SBER_CONFIG.SBER_GREEN }}>
                          {item.step}
                        </span>
                        <span className="font-medium text-sm">{item.title}</span>
                      </div>
                      <p className="text-xs text-gray-400 ml-8">{item.desc}</p>
                    </div>
                  ))}
                </div>
              </div>
              
              {/* Security Notes */}
              <div className="mt-6 p-4 bg-red-500/10 border border-red-500/30 rounded-lg">
                <h3 className="font-medium text-red-400 mb-2 flex items-center gap-2">
                  <Shield className="w-5 h-5" />
                  Notas de Seguridad
                </h3>
                <ul className="space-y-1 text-sm text-gray-400">
                  <li>❌ No responder a correos automáticos generados</li>
                  <li>🔐 No reenviar información de conexión a terceros</li>
                  <li>📎 Los archivos adjuntos contienen información sensible</li>
                  <li>🔒 Almacenar tokens de forma segura (nunca en frontend)</li>
                </ul>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default Sberbank2ApiModule;
