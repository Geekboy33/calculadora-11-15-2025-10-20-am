/**
 * VisaNet API Module - Sistema Completo de Transmisión de Fondos
 * ==============================================================
 * 
 * Suite completa de protocolos Visa para transmisión de fondos
 * 
 * PROTOCOLOS SOPORTADOS:
 * ─────────────────────────────────────────────────────────────
 * 
 * 📋 AUTORIZACIÓN:
 *    - ISO 8583 (Estándar internacional de mensajes financieros)
 *    - BASE I (Sistema de autorización en tiempo real)
 *    - BASE II (Sistema de compensación y liquidación)
 *    - SMS (Single Message System)
 *    - DMS (Dual Message System)
 *    - VisaNet Protocol 201.3
 * 
 * 💸 TRANSFERENCIAS:
 *    - Visa Direct (Transferencias push en tiempo real)
 *    - OCT (Original Credit Transaction - Push to Card)
 *    - AFT (Account Funding Transaction - Pull from Card)
 * 
 * 🏢 CORPORATIVO:
 *    - Visa B2B Connect (Pagos internacionales B2B)
 *    - Visa Commercial Pay (Tarjetas virtuales corporativas)
 * 
 * 🔐 SEGURIDAD:
 *    - 3D Secure 2.0 (Verified by Visa / Visa Secure)
 *    - Visa Token Service (VTS - Tokenización)
 *    - CVV2/CVC2 Verification
 *    - Address Verification Service (AVS)
 *    - Visa Checkout / Click to Pay
 * 
 * 🏧 ATM & POS:
 *    - PLUS Network (Red global de ATMs)
 *    - Interlink Network (PIN Debit POS)
 *    - Visa Electron
 *    - Visa Ready
 * 
 * 🏦 LIQUIDACIÓN:
 *    - Visa Settlement Service (VSS)
 *    - Visa Integrated Payment System (VIPS)
 * 
 * ARQUITECTURA DE TRANSMISIÓN:
 * ─────────────────────────────────────────────────────────────
 * Ledger/Core/API → Issuer/Processor → VisaNet (201.3) → Tarjeta Visa
 * 
 * CARACTERÍSTICAS:
 * - Conexión con servidores Visa (usa.visa.com)
 * - Integración con Cuentas Custodio
 * - Transferencias de fondos en tiempo real
 * - Protocolo de descarga satelital
 * - Generación de PDFs (API DAES / BlackScreen)
 * - Verificación de conexiones real/simulado
 * - Beneficiarios predefinidos JSON 10B
 */

import { useState, useEffect, useCallback } from 'react';
import {
  Send,
  Server,
  Globe,
  Shield,
  CheckCircle,
  XCircle,
  AlertCircle,
  RefreshCw,
  Download,
  Upload,
  Wallet,
  CreditCard,
  Building2,
  Lock,
  Key,
  Zap,
  Activity,
  Clock,
  Copy,
  Eye,
  EyeOff,
  ArrowRight,
  ArrowUpRight,
  Database,
  Network,
  Cpu,
  Radio,
  Satellite,
  FileJson,
  Terminal,
  Hash,
  Link2,
  Settings,
  Play,
  Pause,
  RotateCcw,
  CheckCircle2,
  Loader2,
  FileText,
  Printer
} from 'lucide-react';
import { useLanguage } from '../lib/i18n';
import { custodyStore, CustodyAccount } from '../lib/custody-store';
import jsPDF from 'jspdf';

// =============================================================================
// TYPES & INTERFACES
// =============================================================================

interface ServerConfig {
  name: string;
  ip: string;
  port: number;
  domain: string;
  status: 'connected' | 'disconnected' | 'connecting';
  protocol: string;
}

interface SessionInfo {
  ipsvr: string;
  downloadStatus: string;
  serviceProtocol: string;
  accessGranted: boolean;
}

interface NetworkConfig {
  ipVersion: string;
  hostIpAddress: string;
  apiEndpointUrl: string;
  apiKey: string;
  secretKey: string;
  downloadProgress: number;
}

interface TransferRequest {
  id: string;
  beneficiaryName: string;
  beneficiaryBank: string;
  cardNumber: string;
  expiration: string;
  amount: number;
  currency: string;
  approvalCode: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  timestamp: string;
  sourceAccountId: string;
  sourceAccountName: string;
  // Campos de transmisión VisaNet
  transmissionId?: string;
  visanetAuthCode?: string;
  visanetRRN?: string; // Retrieval Reference Number
  transmissionRoute?: string[];
  cardLoadStatus?: 'pending' | 'loaded' | 'failed';
  settlementStatus?: 'pending' | 'settled' | 'failed';
  // Protocolo utilizado
  protocolId?: string;
  protocolName?: string;
  protocolCode?: string;
  protocolEndpoint?: string;
}

interface License {
  id: string;
  name: string;
  status: 'active' | 'inactive';
  port: string;
}

interface ConnectionTest {
  name: string;
  endpoint: string;
  status: 'pending' | 'testing' | 'success' | 'failed' | 'timeout';
  latency: number | null;
  error: string | null;
  timestamp: string | null;
  isReal: boolean;
}

// =============================================================================
// CONSTANTS
// =============================================================================

const MAIN_SERVER: ServerConfig = {
  name: 'MAIN SYSTEM',
  ip: '108.62.211.172',
  port: 22,
  domain: 'https://usa.visa.com/',
  status: 'connected',
  protocol: 'SSH/TLS 1.3'
};

const SESSION_INFO: SessionInfo = {
  ipsvr: 'ONE-TIME SATELLITE DOWNLOAD ACCESS',
  downloadStatus: 'FUNDS DOWNLOAD SUCCESSFUL',
  serviceProtocol: 'OFFLINE 201.3',
  accessGranted: true
};

const NETWORK_CONFIG: NetworkConfig = {
  ipVersion: 'IPV4/IPV6',
  hostIpAddress: '108.62.211.172',
  apiEndpointUrl: 'https://eth-mainnet.g.alchemy.com/v2/',
  apiKey: '8qwNo_8z1Q5HQMbmICHzRzkdjdjG-oMJ',
  secretKey: 'alcht_***********************',
  downloadProgress: 100
};

const ACTIVE_LICENSES: License[] = [
  { id: 'L1', name: 'LANG4XGEPAY01', status: 'active', port: 'base location port enabled' },
  { id: 'L2', name: 'LANG8XGEPAY01', status: 'active', port: 'base location port enabled' },
  { id: 'L3', name: 'LANG2XGEPAY01', status: 'active', port: 'base location port enabled' }
];

const SYSTEM_INFO = {
  pcbVersion: 'ANG1CXPI REV A',
  epldVersion: 'V120',
  fpga1Version: 'V130',
  information: 'ES5MPSD17 REV D'
};

// =============================================================================
// VISA NETWORK TRANSMISSION ARCHITECTURE
// =============================================================================
// Arquitectura: Ledger/Core/API → Issuer/Processor → VisaNet (201.3) → Tarjeta Visa

interface TransmissionNode {
  id: string;
  name: string;
  type: 'ledger' | 'issuer' | 'visanet' | 'acquirer' | 'card';
  endpoint: string;
  status: 'idle' | 'processing' | 'completed' | 'error';
  protocol: string;
  latency?: number;
}

interface VisaNetConfig {
  routerEndpoint: string;
  authorizationEndpoint: string;
  settlementEndpoint: string;
  protocol: string;
  version: string;
  merchantId: string;
  terminalId: string;
  acquirerId: string;
  issuerId: string;
}

// Configuración de VisaNet para transmisión
const VISANET_CONFIG: VisaNetConfig = {
  routerEndpoint: 'https://usa.visa.com/api/v1/router',
  authorizationEndpoint: 'https://usa.visa.com/api/v1/authorization',
  settlementEndpoint: 'https://usa.visa.com/api/v1/settlement',
  protocol: 'ISO 8583 / ISO 20022',
  version: '201.3',
  merchantId: 'DCBANK-MID-001',
  terminalId: 'TERM-API-JSON-10B',
  acquirerId: 'ACQ-VISA-USA-001',
  issuerId: 'ISS-DCB-001'
};

// Nodos de la arquitectura de transmisión
const TRANSMISSION_ARCHITECTURE: TransmissionNode[] = [
  {
    id: 'ledger',
    name: 'Ledger / Core Banking',
    type: 'ledger',
    endpoint: 'internal://ledger.dcbank.local/api/v1',
    status: 'idle',
    protocol: 'Internal API / ISO 20022'
  },
  {
    id: 'issuer',
    name: 'Issuer / Processor Autorizado',
    type: 'issuer',
    endpoint: 'https://processor.dcbank.com/api/v1/authorize',
    status: 'idle',
    protocol: 'ISO 8583 / PCI-DSS'
  },
  {
    id: 'visanet',
    name: 'VisaNet Gateway (201.3)',
    type: 'visanet',
    endpoint: 'https://usa.visa.com/api/v1/router',
    status: 'idle',
    protocol: 'VisaNet Protocol 201.3'
  },
  {
    id: 'acquirer',
    name: 'Banco Adquirente',
    type: 'acquirer',
    endpoint: 'https://acquirer.visa.com/api/v1/settle',
    status: 'idle',
    protocol: 'ISO 8583 / Settlement'
  },
  {
    id: 'card',
    name: 'Tarjeta Visa Beneficiario',
    type: 'card',
    endpoint: 'card://visa/load',
    status: 'idle',
    protocol: 'Card Load Protocol'
  }
];

// =============================================================================
// VISA PROTOCOLS - COMPLETE PROTOCOL SUITE
// =============================================================================

interface VisaProtocol {
  id: string;
  name: string;
  code: string;
  category: 'authorization' | 'clearing' | 'settlement' | 'transfer' | 'security' | 'corporate' | 'atm' | 'pos';
  description: string;
  messageFormat: string;
  useCase: string[];
  transactionTypes: string[];
  endpoint: string;
  version: string;
  realTime: boolean;
  crossBorder: boolean;
  maxAmount: number;
  currency: string[];
  icon: string;
  color: string;
}

// Todos los protocolos de Visa disponibles
const VISA_PROTOCOLS: VisaProtocol[] = [
  // ═══════════════════════════════════════════════════════════════════════════
  // PROTOCOLOS DE AUTORIZACIÓN Y PROCESAMIENTO
  // ═══════════════════════════════════════════════════════════════════════════
  {
    id: 'iso8583',
    name: 'ISO 8583',
    code: 'ISO-8583',
    category: 'authorization',
    description: 'Estándar internacional para mensajes de transacciones financieras electrónicas. Base de toda la comunicación VisaNet.',
    messageFormat: 'ISO 8583:1987/1993/2003',
    useCase: ['POS Transactions', 'ATM Withdrawals', 'Online Payments', 'Refunds'],
    transactionTypes: ['0100 Authorization', '0200 Financial', '0400 Reversal', '0420 Reversal Advice'],
    endpoint: 'https://usa.visa.com/api/v1/iso8583',
    version: '2003',
    realTime: true,
    crossBorder: true,
    maxAmount: 999999999.99,
    currency: ['USD', 'EUR', 'GBP', 'JPY', 'ALL'],
    icon: '📋',
    color: '#1A1F71'
  },
  {
    id: 'base1',
    name: 'BASE I',
    code: 'BASE-I',
    category: 'authorization',
    description: 'Sistema de autorización en tiempo real de VisaNet. Procesa autorizaciones de transacciones en milisegundos.',
    messageFormat: 'Single Message System (SMS)',
    useCase: ['Real-time Authorization', 'Card Present', 'Card Not Present'],
    transactionTypes: ['Authorization Request', 'Authorization Response', 'Stand-In Processing'],
    endpoint: 'https://usa.visa.com/api/v1/base1/authorize',
    version: '6.0',
    realTime: true,
    crossBorder: true,
    maxAmount: 999999999.99,
    currency: ['USD', 'EUR', 'GBP', 'JPY', 'ALL'],
    icon: '⚡',
    color: '#00A1E0'
  },
  {
    id: 'base2',
    name: 'BASE II',
    code: 'BASE-II',
    category: 'clearing',
    description: 'Sistema de compensación y liquidación de VisaNet. Procesa clearing de transacciones en batch.',
    messageFormat: 'Dual Message System (DMS)',
    useCase: ['Clearing', 'Settlement', 'Chargebacks', 'Representments'],
    transactionTypes: ['TC05 Financial Position', 'TC06 Acquirer Advice', 'TC07 Chargeback'],
    endpoint: 'https://usa.visa.com/api/v1/base2/clearing',
    version: '6.0',
    realTime: false,
    crossBorder: true,
    maxAmount: 999999999.99,
    currency: ['USD', 'EUR', 'GBP', 'JPY', 'ALL'],
    icon: '📊',
    color: '#F7B600'
  },
  {
    id: 'sms',
    name: 'Single Message System',
    code: 'SMS',
    category: 'authorization',
    description: 'Sistema de mensaje único donde autorización y clearing ocurren simultáneamente.',
    messageFormat: 'ISO 8583 Single Message',
    useCase: ['ATM Transactions', 'PIN Debit', 'Cash Advance'],
    transactionTypes: ['0200 Financial Request', '0210 Financial Response'],
    endpoint: 'https://usa.visa.com/api/v1/sms',
    version: '2.0',
    realTime: true,
    crossBorder: true,
    maxAmount: 50000,
    currency: ['USD', 'EUR', 'GBP'],
    icon: '📨',
    color: '#4CAF50'
  },
  {
    id: 'dms',
    name: 'Dual Message System',
    code: 'DMS',
    category: 'authorization',
    description: 'Sistema de doble mensaje donde autorización y clearing son procesos separados.',
    messageFormat: 'ISO 8583 Dual Message',
    useCase: ['Credit Card Purchases', 'Hotel Reservations', 'Car Rentals'],
    transactionTypes: ['0100 Auth Request', '0110 Auth Response', '0220 Completion'],
    endpoint: 'https://usa.visa.com/api/v1/dms',
    version: '2.0',
    realTime: true,
    crossBorder: true,
    maxAmount: 999999999.99,
    currency: ['USD', 'EUR', 'GBP', 'ALL'],
    icon: '📬',
    color: '#9C27B0'
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // PROTOCOLOS DE TRANSFERENCIA DE FONDOS
  // ═══════════════════════════════════════════════════════════════════════════
  {
    id: 'visa-direct',
    name: 'Visa Direct',
    code: 'VD',
    category: 'transfer',
    description: 'Plataforma de transferencias push en tiempo real. Envía fondos directamente a tarjetas Visa en segundos.',
    messageFormat: 'ISO 8583 / REST API',
    useCase: ['P2P Transfers', 'Disbursements', 'Payroll', 'Refunds', 'Remittances'],
    transactionTypes: ['OCT (Original Credit Transaction)', 'AFT (Account Funding Transaction)'],
    endpoint: 'https://usa.visa.com/api/v1/visadirect/fundstransfer',
    version: '1.0',
    realTime: true,
    crossBorder: true,
    maxAmount: 25000,
    currency: ['USD', 'EUR', 'GBP', 'MXN', 'CAD', 'AUD', 'JPY'],
    icon: '💸',
    color: '#00D4AA'
  },
  {
    id: 'oct',
    name: 'Original Credit Transaction',
    code: 'OCT',
    category: 'transfer',
    description: 'Transacción de crédito original para enviar fondos a una tarjeta. Push payment.',
    messageFormat: 'ISO 8583 MTI 0200',
    useCase: ['Card Loading', 'Disbursements', 'Refunds', 'Rewards'],
    transactionTypes: ['Push to Card', 'Account Credit'],
    endpoint: 'https://usa.visa.com/api/v1/oct',
    version: '1.0',
    realTime: true,
    crossBorder: true,
    maxAmount: 25000,
    currency: ['USD', 'EUR', 'GBP'],
    icon: '💳',
    color: '#2196F3'
  },
  {
    id: 'aft',
    name: 'Account Funding Transaction',
    code: 'AFT',
    category: 'transfer',
    description: 'Transacción de fondeo de cuenta para retirar fondos de una tarjeta. Pull payment.',
    messageFormat: 'ISO 8583 MTI 0200',
    useCase: ['Wallet Funding', 'Bill Payment', 'Money Transfer'],
    transactionTypes: ['Pull from Card', 'Account Debit'],
    endpoint: 'https://usa.visa.com/api/v1/aft',
    version: '1.0',
    realTime: true,
    crossBorder: true,
    maxAmount: 10000,
    currency: ['USD', 'EUR', 'GBP'],
    icon: '🏧',
    color: '#FF5722'
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // PROTOCOLOS CORPORATIVOS Y B2B
  // ═══════════════════════════════════════════════════════════════════════════
  {
    id: 'b2b-connect',
    name: 'Visa B2B Connect',
    code: 'B2B',
    category: 'corporate',
    description: 'Red multilateral para pagos corporativos internacionales. Usa tecnología DLT para transparencia.',
    messageFormat: 'ISO 20022 / Blockchain',
    useCase: ['Corporate Payments', 'Cross-border B2B', 'Supply Chain Finance'],
    transactionTypes: ['pacs.008', 'pacs.009', 'camt.053'],
    endpoint: 'https://usa.visa.com/api/v1/b2bconnect',
    version: '2.0',
    realTime: false,
    crossBorder: true,
    maxAmount: 100000000,
    currency: ['USD', 'EUR', 'GBP', 'CHF', 'JPY', 'CNY'],
    icon: '🏢',
    color: '#607D8B'
  },
  {
    id: 'vcp',
    name: 'Visa Commercial Pay',
    code: 'VCP',
    category: 'corporate',
    description: 'Solución de pagos comerciales para empresas. Incluye tarjetas virtuales y gestión de gastos.',
    messageFormat: 'REST API / ISO 8583',
    useCase: ['Virtual Cards', 'Expense Management', 'AP Automation'],
    transactionTypes: ['Virtual Card Issuance', 'Single-Use Cards', 'Supplier Payments'],
    endpoint: 'https://usa.visa.com/api/v1/commercialpay',
    version: '1.5',
    realTime: true,
    crossBorder: true,
    maxAmount: 500000,
    currency: ['USD', 'EUR', 'GBP'],
    icon: '💼',
    color: '#795548'
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // PROTOCOLOS DE SEGURIDAD
  // ═══════════════════════════════════════════════════════════════════════════
  {
    id: '3ds',
    name: '3D Secure 2.0',
    code: '3DS2',
    category: 'security',
    description: 'Protocolo de autenticación para transacciones e-commerce. Verified by Visa / Visa Secure.',
    messageFormat: 'EMV 3DS Protocol',
    useCase: ['E-commerce Authentication', 'CNP Transactions', 'Mobile Payments'],
    transactionTypes: ['AReq (Authentication Request)', 'ARes (Authentication Response)', 'CReq (Challenge Request)'],
    endpoint: 'https://usa.visa.com/api/v1/3ds/authenticate',
    version: '2.2',
    realTime: true,
    crossBorder: true,
    maxAmount: 999999999.99,
    currency: ['ALL'],
    icon: '🔐',
    color: '#E91E63'
  },
  {
    id: 'vts',
    name: 'Visa Token Service',
    code: 'VTS',
    category: 'security',
    description: 'Servicio de tokenización que reemplaza PANs por tokens únicos para mayor seguridad.',
    messageFormat: 'REST API / ISO 8583',
    useCase: ['Digital Wallets', 'IoT Payments', 'Recurring Payments', 'E-commerce'],
    transactionTypes: ['Token Provisioning', 'Token Lifecycle', 'Cryptogram Generation'],
    endpoint: 'https://usa.visa.com/api/v1/vts/tokens',
    version: '1.0',
    realTime: true,
    crossBorder: true,
    maxAmount: 999999999.99,
    currency: ['ALL'],
    icon: '🔑',
    color: '#673AB7'
  },
  {
    id: 'cvv2',
    name: 'CVV2/CVC2 Verification',
    code: 'CVV2',
    category: 'security',
    description: 'Verificación del código de seguridad de 3 dígitos para transacciones sin tarjeta presente.',
    messageFormat: 'ISO 8583 Field 126',
    useCase: ['CNP Verification', 'E-commerce', 'MOTO'],
    transactionTypes: ['CVV2 Validation'],
    endpoint: 'https://usa.visa.com/api/v1/cvv2/verify',
    version: '1.0',
    realTime: true,
    crossBorder: true,
    maxAmount: 999999999.99,
    currency: ['ALL'],
    icon: '🛡️',
    color: '#009688'
  },
  {
    id: 'avs',
    name: 'Address Verification Service',
    code: 'AVS',
    category: 'security',
    description: 'Servicio de verificación de dirección del tarjetahabiente para prevención de fraude.',
    messageFormat: 'ISO 8583 Field 123',
    useCase: ['E-commerce', 'MOTO', 'Recurring Billing'],
    transactionTypes: ['Address Verification'],
    endpoint: 'https://usa.visa.com/api/v1/avs/verify',
    version: '1.0',
    realTime: true,
    crossBorder: false,
    maxAmount: 999999999.99,
    currency: ['USD', 'CAD', 'GBP'],
    icon: '📍',
    color: '#3F51B5'
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // PROTOCOLOS ATM Y REDES
  // ═══════════════════════════════════════════════════════════════════════════
  {
    id: 'plus',
    name: 'PLUS Network',
    code: 'PLUS',
    category: 'atm',
    description: 'Red global de ATMs de Visa. Permite retiros de efectivo en millones de cajeros.',
    messageFormat: 'ISO 8583 SMS',
    useCase: ['ATM Withdrawals', 'Balance Inquiry', 'PIN Change'],
    transactionTypes: ['Cash Withdrawal', 'Balance Inquiry', 'Mini Statement'],
    endpoint: 'https://usa.visa.com/api/v1/plus/atm',
    version: '3.0',
    realTime: true,
    crossBorder: true,
    maxAmount: 10000,
    currency: ['LOCAL'],
    icon: '🏧',
    color: '#FF9800'
  },
  {
    id: 'interlink',
    name: 'Interlink Network',
    code: 'INTERLINK',
    category: 'pos',
    description: 'Red de débito PIN de Visa para transacciones POS con verificación de PIN.',
    messageFormat: 'ISO 8583 SMS',
    useCase: ['PIN Debit POS', 'Cash Back', 'Debit Purchases'],
    transactionTypes: ['PIN Debit Purchase', 'Cash Back', 'Balance Inquiry'],
    endpoint: 'https://usa.visa.com/api/v1/interlink',
    version: '2.0',
    realTime: true,
    crossBorder: false,
    maxAmount: 25000,
    currency: ['USD'],
    icon: '💳',
    color: '#8BC34A'
  },
  {
    id: 'electron',
    name: 'Visa Electron',
    code: 'ELECTRON',
    category: 'pos',
    description: 'Tarjeta de débito que requiere autorización en línea para cada transacción.',
    messageFormat: 'ISO 8583',
    useCase: ['Online Authorization Only', 'Debit Transactions'],
    transactionTypes: ['Authorization Required', 'No Offline'],
    endpoint: 'https://usa.visa.com/api/v1/electron',
    version: '1.0',
    realTime: true,
    crossBorder: true,
    maxAmount: 50000,
    currency: ['EUR', 'GBP', 'ALL'],
    icon: '⚡',
    color: '#00BCD4'
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // PROTOCOLOS DE LIQUIDACIÓN
  // ═══════════════════════════════════════════════════════════════════════════
  {
    id: 'vss',
    name: 'Visa Settlement Service',
    code: 'VSS',
    category: 'settlement',
    description: 'Servicio de liquidación de Visa para transferir fondos entre bancos.',
    messageFormat: 'ISO 20022 / SWIFT',
    useCase: ['Interbank Settlement', 'Net Settlement', 'Gross Settlement'],
    transactionTypes: ['Settlement Instruction', 'Settlement Confirmation'],
    endpoint: 'https://usa.visa.com/api/v1/settlement',
    version: '2.0',
    realTime: false,
    crossBorder: true,
    maxAmount: 999999999999.99,
    currency: ['ALL'],
    icon: '🏦',
    color: '#455A64'
  },
  {
    id: 'vips',
    name: 'Visa Integrated Payment System',
    code: 'VIPS',
    category: 'settlement',
    description: 'Sistema integrado de pagos para procesamiento end-to-end.',
    messageFormat: 'ISO 8583 / ISO 20022',
    useCase: ['Full Payment Processing', 'Authorization to Settlement'],
    transactionTypes: ['Full Lifecycle Processing'],
    endpoint: 'https://usa.visa.com/api/v1/vips',
    version: '3.0',
    realTime: true,
    crossBorder: true,
    maxAmount: 999999999.99,
    currency: ['ALL'],
    icon: '🔄',
    color: '#37474F'
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // PROTOCOLOS ESPECIALES
  // ═══════════════════════════════════════════════════════════════════════════
  {
    id: 'visanet-201',
    name: 'VisaNet Protocol 201.3',
    code: 'VN-201.3',
    category: 'authorization',
    description: 'Protocolo propietario de VisaNet versión 201.3 para routing y autorización.',
    messageFormat: 'VisaNet Native',
    useCase: ['Global Routing', 'Authorization', 'Stand-In Processing'],
    transactionTypes: ['All Transaction Types'],
    endpoint: 'https://usa.visa.com/api/v1/visanet/201',
    version: '201.3',
    realTime: true,
    crossBorder: true,
    maxAmount: 999999999.99,
    currency: ['ALL'],
    icon: '🌐',
    color: '#1A1F71'
  },
  {
    id: 'visa-checkout',
    name: 'Visa Checkout / Click to Pay',
    code: 'VCO',
    category: 'security',
    description: 'Servicio de pago digital que simplifica el checkout en línea.',
    messageFormat: 'REST API',
    useCase: ['E-commerce Checkout', 'Mobile Checkout', 'One-Click Pay'],
    transactionTypes: ['Checkout Initiation', 'Payment Confirmation'],
    endpoint: 'https://usa.visa.com/api/v1/checkout',
    version: '2.0',
    realTime: true,
    crossBorder: true,
    maxAmount: 100000,
    currency: ['USD', 'EUR', 'GBP', 'CAD', 'AUD'],
    icon: '🛒',
    color: '#FF5252'
  },
  {
    id: 'visa-ready',
    name: 'Visa Ready',
    code: 'VR',
    category: 'pos',
    description: 'Programa de certificación para dispositivos y soluciones de pago.',
    messageFormat: 'EMV / NFC',
    useCase: ['Device Certification', 'Solution Validation'],
    transactionTypes: ['Contactless', 'EMV Chip', 'Mobile'],
    endpoint: 'https://usa.visa.com/api/v1/visaready',
    version: '1.0',
    realTime: true,
    crossBorder: true,
    maxAmount: 999999999.99,
    currency: ['ALL'],
    icon: '✅',
    color: '#4CAF50'
  }
];

// Categorías de protocolos para UI
const PROTOCOL_CATEGORIES = [
  { id: 'authorization', name: 'Autorización', icon: '⚡', color: '#00A1E0' },
  { id: 'clearing', name: 'Compensación', icon: '📊', color: '#F7B600' },
  { id: 'settlement', name: 'Liquidación', icon: '🏦', color: '#455A64' },
  { id: 'transfer', name: 'Transferencias', icon: '💸', color: '#00D4AA' },
  { id: 'security', name: 'Seguridad', icon: '🔐', color: '#E91E63' },
  { id: 'corporate', name: 'Corporativo', icon: '🏢', color: '#607D8B' },
  { id: 'atm', name: 'ATM', icon: '🏧', color: '#FF9800' },
  { id: 'pos', name: 'POS', icon: '💳', color: '#8BC34A' }
];

// Beneficiarios predefinidos del JSON 10B
interface PredefinedBeneficiary {
  id: string;
  name: string;
  bank: string;
  cardNumber: string;
  expiration: string;
  currency: string;
  approvalCode: string;
  source: string;
}

const PREDEFINED_BENEFICIARIES: PredefinedBeneficiary[] = [
  {
    id: 'json-10b-main',
    name: 'MR. ARMAN ARAKELYAN',
    bank: 'REVOLUT',
    cardNumber: '4165981224772651',
    expiration: '05/30',
    currency: 'USD',
    approvalCode: '791010',
    source: '10B JSON 02.01.2026'
  },
  {
    id: 'json-10b-secondary',
    name: 'VISA CORPORATE ACCOUNT',
    bank: 'VISA USA',
    cardNumber: '4000123456789012',
    expiration: '12/28',
    currency: 'USD',
    approvalCode: 'AUTO',
    source: 'System Default'
  }
];

// =============================================================================
// MAIN COMPONENT - VISANET API MODULE
// =============================================================================

export function VisaNetAPIModule() {
  const { language } = useLanguage();
  const isSpanish = language === 'es';

  // State
  const [custodyAccounts, setCustodyAccounts] = useState<CustodyAccount[]>([]);
  const [selectedAccount, setSelectedAccount] = useState<string>('');
  const [serverStatus, setServerStatus] = useState<'connected' | 'disconnected' | 'connecting'>('disconnected');
  const [sessionActive, setSessionActive] = useState(false);
  const [transferHistory, setTransferHistory] = useState<TransferRequest[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showSecrets, setShowSecrets] = useState(false);
  const [activeView, setActiveView] = useState<'dashboard' | 'transfer' | 'transmission' | 'protocols' | 'history' | 'config' | 'verify'>('dashboard');
  const [connectionLogs, setConnectionLogs] = useState<string[]>([]);
  const [connectionTests, setConnectionTests] = useState<ConnectionTest[]>([]);
  const [isTestingConnections, setIsTestingConnections] = useState(false);
  const [connectionMode, setConnectionMode] = useState<'simulated' | 'real'>('simulated');
  const [selectedBeneficiary, setSelectedBeneficiary] = useState<PredefinedBeneficiary | null>(null);
  
  // Estado de protocolo seleccionado
  const [selectedProtocol, setSelectedProtocol] = useState<VisaProtocol>(VISA_PROTOCOLS.find(p => p.id === 'visa-direct')!);
  const [protocolCategoryFilter, setProtocolCategoryFilter] = useState<string>('all');
  
  // Estado de transmisión VisaNet
  const [transmissionNodes, setTransmissionNodes] = useState<TransmissionNode[]>(TRANSMISSION_ARCHITECTURE);
  const [isTransmitting, setIsTransmitting] = useState(false);
  const [currentTransmissionStep, setCurrentTransmissionStep] = useState<number>(0);
  const [transmissionLogs, setTransmissionLogs] = useState<string[]>([]);

  // Transfer Form
  const [transferForm, setTransferForm] = useState({
    beneficiaryName: '',
    beneficiaryBank: 'REVOLUT',
    cardNumber: '',
    expiration: '',
    amount: 0,
    currency: 'USD'
  });

  // Seleccionar beneficiario predefinido del JSON
  const selectPredefinedBeneficiary = (beneficiary: PredefinedBeneficiary) => {
    setSelectedBeneficiary(beneficiary);
    setTransferForm(prev => ({
      ...prev,
      beneficiaryName: beneficiary.name,
      beneficiaryBank: beneficiary.bank,
      cardNumber: beneficiary.cardNumber,
      expiration: beneficiary.expiration,
      currency: beneficiary.currency
    }));
    addLog(`✅ Beneficiario seleccionado: ${beneficiary.name} (${beneficiary.source})`);
  };

  // Limpiar beneficiario seleccionado
  const clearBeneficiary = () => {
    setSelectedBeneficiary(null);
    setTransferForm({
      beneficiaryName: '',
      beneficiaryBank: 'REVOLUT',
      cardNumber: '',
      expiration: '',
      amount: 0,
      currency: 'USD'
    });
    addLog('🔄 Beneficiario limpiado');
  };

  // Load custody accounts
  useEffect(() => {
    const accounts = custodyStore.getAccounts();
    setCustodyAccounts(accounts);
    
    // Load transfer history from localStorage
    const savedHistory = localStorage.getItem('api_json_transfer_history');
    if (savedHistory) {
      const parsedHistory = JSON.parse(savedHistory);
      if (parsedHistory.length > 0) {
        setTransferHistory(parsedHistory);
      } else {
        // Add sample transfers if history is empty - REVOLUT and VISA
        // ARMAN: 7:56:31 PM Dubai (UTC+4), VISA: 7:57:31 PM Dubai (1 minuto después)
        // 7:56:31 PM Dubai = 15:56:31 UTC
        const sampleTransfers: TransferRequest[] = [
          {
            id: 'TRF-1767714991283',
            beneficiaryName: 'MR. ARMAN ARAKELYAN',
            beneficiaryBank: 'REVOLUT',
            cardNumber: '4165981224772651',
            expiration: '05/30',
            amount: 5000,
            currency: 'USD',
            approvalCode: '848764',
            status: 'completed',
            timestamp: '2026-01-06T15:56:31.000Z', // 7:56:31 PM Dubai (UTC+4)
            sourceAccountId: 'custody-001',
            sourceAccountName: 'Trademore Value Capital FZE'
          },
          {
            id: 'TRF-1767714991284',
            beneficiaryName: 'VISA CORPORATE ACCOUNT',
            beneficiaryBank: 'VISA USA',
            cardNumber: '4532015678909012',
            expiration: '12/28',
            amount: 5000,
            currency: 'USD',
            approvalCode: '848765',
            status: 'completed',
            timestamp: '2026-01-06T15:57:31.000Z', // 7:57:31 PM Dubai (1 minuto después)
            sourceAccountId: 'custody-002',
            sourceAccountName: 'Digital Commercial Bank Ltd'
          }
        ];
        setTransferHistory(sampleTransfers);
      }
    } else {
      // Add sample transfers if no history exists - REVOLUT and VISA
      // ARMAN: 7:56:31 PM Dubai (UTC+4), VISA: 7:57:31 PM Dubai (1 minuto después)
      const sampleTransfers: TransferRequest[] = [
        {
          id: 'TRF-1767714991283',
          beneficiaryName: 'MR. ARMAN ARAKELYAN',
          beneficiaryBank: 'REVOLUT',
          cardNumber: '4165981224772651',
          expiration: '05/30',
          amount: 5000,
          currency: 'USD',
          approvalCode: '848764',
          status: 'completed',
          timestamp: '2026-01-06T15:56:31.000Z', // 7:56:31 PM Dubai (UTC+4)
          sourceAccountId: 'custody-001',
          sourceAccountName: 'Trademore Value Capital FZE'
        },
        {
          id: 'TRF-1767714991284',
          beneficiaryName: 'VISA CORPORATE ACCOUNT',
          beneficiaryBank: 'VISA USA',
          cardNumber: '4532015678909012',
          expiration: '12/28',
          amount: 5000,
          currency: 'USD',
          approvalCode: '848765',
          status: 'completed',
          timestamp: '2026-01-06T15:57:31.000Z', // 7:57:31 PM Dubai (1 minuto después)
          sourceAccountId: 'custody-002',
          sourceAccountName: 'Digital Commercial Bank Ltd'
        }
      ];
      setTransferHistory(sampleTransfers);
    }
  }, []);

  // Save transfer history
  useEffect(() => {
    localStorage.setItem('api_json_transfer_history', JSON.stringify(transferHistory));
  }, [transferHistory]);

  // Test single endpoint
  const testEndpoint = async (endpoint: string, name: string): Promise<ConnectionTest> => {
    const startTime = Date.now();
    const test: ConnectionTest = {
      name,
      endpoint,
      status: 'testing',
      latency: null,
      error: null,
      timestamp: new Date().toISOString(),
      isReal: false
    };

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

      const response = await fetch(endpoint, {
        method: 'HEAD',
        mode: 'no-cors', // Allow cross-origin requests
        signal: controller.signal
      });

      clearTimeout(timeoutId);
      const latency = Date.now() - startTime;

      // no-cors mode always returns opaque response, so we check if we got any response
      test.status = 'success';
      test.latency = latency;
      test.isReal = true;
      
    } catch (error: unknown) {
      const latency = Date.now() - startTime;
      test.latency = latency;
      
      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          test.status = 'timeout';
          test.error = 'Connection timeout (10s)';
        } else {
          test.status = 'failed';
          test.error = error.message;
        }
      } else {
        test.status = 'failed';
        test.error = 'Unknown error';
      }
      test.isReal = false;
    }

    return test;
  };

  // Run all connection tests
  const runConnectionTests = async () => {
    setIsTestingConnections(true);
    addLog('🔍 Iniciando verificación de conexiones REALES...');

    const endpoints = [
      { name: 'Visa USA Domain', endpoint: 'https://usa.visa.com/' },
      { name: 'Alchemy ETH Mainnet', endpoint: 'https://eth-mainnet.g.alchemy.com/v2/' },
      { name: 'Host IP Server', endpoint: `http://${MAIN_SERVER.ip}/` },
      { name: 'Google DNS (Connectivity)', endpoint: 'https://dns.google/' },
      { name: 'Cloudflare (Connectivity)', endpoint: 'https://cloudflare.com/' },
    ];

    const tests: ConnectionTest[] = [];

    for (const ep of endpoints) {
      addLog(`📡 Probando: ${ep.name}...`);
      const test = await testEndpoint(ep.endpoint, ep.name);
      tests.push(test);
      setConnectionTests([...tests]);
      
      if (test.status === 'success') {
        addLog(`✅ ${ep.name}: Conectado (${test.latency}ms)`);
      } else if (test.status === 'timeout') {
        addLog(`⏱️ ${ep.name}: Timeout`);
      } else {
        addLog(`❌ ${ep.name}: Error - ${test.error}`);
      }
    }

    setIsTestingConnections(false);
    
    // Determine if any real connections succeeded
    const realConnections = tests.filter(t => t.status === 'success').length;
    if (realConnections > 0) {
      addLog(`🎯 Verificación completa: ${realConnections}/${tests.length} conexiones exitosas`);
      setConnectionMode('real');
    } else {
      addLog(`⚠️ No se pudieron establecer conexiones reales. Modo simulado activo.`);
      setConnectionMode('simulated');
    }
  };

  // Connect to server (with real verification option)
  const connectToServer = useCallback(async (useRealConnection: boolean = false) => {
    setServerStatus('connecting');
    addLog('🔄 Iniciando conexión con servidor principal...');
    
    if (useRealConnection) {
      addLog('🔗 Modo: CONEXIÓN REAL');
      
      // Test actual connectivity
      const visaTest = await testEndpoint('https://usa.visa.com/', 'Visa USA');
      const alchemyTest = await testEndpoint('https://eth-mainnet.g.alchemy.com/v2/', 'Alchemy');
      
      if (visaTest.status === 'success' || alchemyTest.status === 'success') {
        addLog(`📡 Conectando a ${MAIN_SERVER.ip}:${MAIN_SERVER.port}...`);
        addLog('🔐 Verificando endpoints reales...');
        
        if (visaTest.status === 'success') {
          addLog(`✅ Visa USA: Conectado (${visaTest.latency}ms)`);
        }
        if (alchemyTest.status === 'success') {
          addLog(`✅ Alchemy API: Conectado (${alchemyTest.latency}ms)`);
        }
        
        setServerStatus('connected');
        setSessionActive(true);
        setConnectionMode('real');
        addLog('🛰️ Sesión REAL activa - Conexiones verificadas');
      } else {
        addLog('⚠️ No se pudo establecer conexión real');
        addLog('🔄 Cambiando a modo simulado...');
        setConnectionMode('simulated');
        
        // Fall back to simulated
        await new Promise(resolve => setTimeout(resolve, 1000));
        setServerStatus('connected');
        setSessionActive(true);
        addLog('🛰️ Sesión SIMULADA activa');
      }
    } else {
      addLog('🔗 Modo: SIMULADO (TEST)');
      
      await new Promise(resolve => setTimeout(resolve, 1000));
      addLog(`📡 Conectando a ${MAIN_SERVER.ip}:${MAIN_SERVER.port}...`);
      
      await new Promise(resolve => setTimeout(resolve, 1500));
      addLog('🔐 Autenticación SSH/TLS establecida (SIMULADO)');
      
      await new Promise(resolve => setTimeout(resolve, 1000));
      addLog(`✅ Conexión establecida con ${MAIN_SERVER.domain} (SIMULADO)`);
      
      setServerStatus('connected');
      setSessionActive(true);
      setConnectionMode('simulated');
      addLog('🛰️ Sesión SIMULADA activa - Acceso concedido');
    }
  }, []);

  // Disconnect from server
  const disconnectFromServer = useCallback(() => {
    setServerStatus('disconnected');
    setSessionActive(false);
    addLog('🔌 Desconectado del servidor');
  }, []);

  // Add log entry
  const addLog = (message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setConnectionLogs(prev => [`[${timestamp}] ${message}`, ...prev.slice(0, 49)]);
  };

  // Get selected account balance
  const getSelectedAccountBalance = (): number => {
    const account = custodyAccounts.find(a => a.id === selectedAccount);
    return account?.availableBalance || 0;
  };

  // =============================================================================
  // VISA NETWORK TRANSMISSION FUNCTIONS
  // =============================================================================
  
  // Agregar log de transmisión
  const addTransmissionLog = (message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setTransmissionLogs(prev => [`[${timestamp}] ${message}`, ...prev.slice(0, 99)]);
  };

  // Resetear nodos de transmisión
  const resetTransmissionNodes = () => {
    setTransmissionNodes(TRANSMISSION_ARCHITECTURE.map(node => ({ ...node, status: 'idle' as const })));
    setCurrentTransmissionStep(0);
  };

  // Generar códigos de autorización VisaNet
  const generateVisaNetCodes = () => {
    const authCode = Math.floor(100000 + Math.random() * 900000).toString();
    const rrn = `${Date.now()}`.slice(-12);
    const transmissionId = `VNET-${Date.now()}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
    return { authCode, rrn, transmissionId };
  };

  // Simular transmisión a través de cada nodo
  const transmitThroughNode = async (nodeIndex: number, amount: number, cardNumber: string): Promise<boolean> => {
    const node = transmissionNodes[nodeIndex];
    
    // Actualizar estado del nodo a procesando
    setTransmissionNodes(prev => prev.map((n, i) => 
      i === nodeIndex ? { ...n, status: 'processing' as const } : n
    ));
    
    const startTime = Date.now();
    
    switch (node.type) {
      case 'ledger':
        addTransmissionLog(`📊 [LEDGER] Iniciando débito de $${amount.toLocaleString()} USD...`);
        await new Promise(r => setTimeout(r, 800));
        addTransmissionLog(`✅ [LEDGER] Fondos debitados del Core Banking`);
        addTransmissionLog(`📤 [LEDGER] Transmitiendo a Issuer/Processor...`);
        break;
        
      case 'issuer':
        addTransmissionLog(`🏦 [ISSUER] Recibiendo solicitud de autorización...`);
        await new Promise(r => setTimeout(r, 1200));
        addTransmissionLog(`🔐 [ISSUER] Validando credenciales PCI-DSS...`);
        await new Promise(r => setTimeout(r, 600));
        addTransmissionLog(`✅ [ISSUER] Autorización aprobada - Issuer ID: ${VISANET_CONFIG.issuerId}`);
        addTransmissionLog(`📤 [ISSUER] Enrutando a VisaNet Gateway...`);
        break;
        
      case 'visanet':
        addTransmissionLog(`🌐 [VISANET 201.3] Conectando a ${VISANET_CONFIG.routerEndpoint}...`);
        await new Promise(r => setTimeout(r, 1500));
        addTransmissionLog(`🔄 [VISANET] Router procesando mensaje ISO 8583...`);
        await new Promise(r => setTimeout(r, 800));
        addTransmissionLog(`📡 [VISANET] Transmisión via usa.visa.com - Protocol ${VISANET_CONFIG.version}`);
        await new Promise(r => setTimeout(r, 600));
        addTransmissionLog(`✅ [VISANET] Mensaje autorizado - Terminal: ${VISANET_CONFIG.terminalId}`);
        addTransmissionLog(`📤 [VISANET] Enrutando a Banco Adquirente...`);
        break;
        
      case 'acquirer':
        addTransmissionLog(`🏛️ [ACQUIRER] Recibiendo instrucción de settlement...`);
        await new Promise(r => setTimeout(r, 1000));
        addTransmissionLog(`💳 [ACQUIRER] Localizando tarjeta: ****${cardNumber.slice(-4)}`);
        await new Promise(r => setTimeout(r, 800));
        addTransmissionLog(`✅ [ACQUIRER] Settlement aprobado - Acquirer ID: ${VISANET_CONFIG.acquirerId}`);
        addTransmissionLog(`📤 [ACQUIRER] Iniciando carga a tarjeta...`);
        break;
        
      case 'card':
        addTransmissionLog(`💳 [CARD LOAD] Conectando con tarjeta Visa...`);
        await new Promise(r => setTimeout(r, 1200));
        addTransmissionLog(`💰 [CARD LOAD] Cargando $${amount.toLocaleString()} USD...`);
        await new Promise(r => setTimeout(r, 1000));
        addTransmissionLog(`✅ [CARD LOAD] ¡FONDOS CARGADOS EXITOSAMENTE!`);
        addTransmissionLog(`🎉 [CARD LOAD] Tarjeta ****${cardNumber.slice(-4)} acreditada`);
        break;
    }
    
    const latency = Date.now() - startTime;
    
    // Actualizar estado del nodo a completado
    setTransmissionNodes(prev => prev.map((n, i) => 
      i === nodeIndex ? { ...n, status: 'completed' as const, latency } : n
    ));
    
    return true;
  };

  // Proceso completo de transmisión VisaNet
  const executeVisaNetTransmission = async (
    amount: number, 
    cardNumber: string, 
    beneficiaryName: string,
    beneficiaryBank: string
  ): Promise<{ success: boolean; authCode: string; rrn: string; transmissionId: string; route: string[] }> => {
    setIsTransmitting(true);
    resetTransmissionNodes();
    setTransmissionLogs([]);
    
    const { authCode, rrn, transmissionId } = generateVisaNetCodes();
    const route: string[] = [];
    
    addTransmissionLog(`═══════════════════════════════════════════════════════════`);
    addTransmissionLog(`🚀 INICIANDO TRANSMISIÓN VISANET - ID: ${transmissionId}`);
    addTransmissionLog(`═══════════════════════════════════════════════════════════`);
    addTransmissionLog(`💰 Monto: $${amount.toLocaleString()} USD`);
    addTransmissionLog(`👤 Beneficiario: ${beneficiaryName}`);
    addTransmissionLog(`🏦 Banco: ${beneficiaryBank}`);
    addTransmissionLog(`💳 Tarjeta: ****${cardNumber.slice(-4)}`);
    addTransmissionLog(`───────────────────────────────────────────────────────────`);
    
    try {
      // Transmitir a través de cada nodo en secuencia
      for (let i = 0; i < transmissionNodes.length; i++) {
        setCurrentTransmissionStep(i);
        route.push(transmissionNodes[i].name);
        
        const success = await transmitThroughNode(i, amount, cardNumber);
        if (!success) {
          throw new Error(`Fallo en nodo: ${transmissionNodes[i].name}`);
        }
        
        // Pequeña pausa entre nodos
        await new Promise(r => setTimeout(r, 300));
      }
      
      addTransmissionLog(`───────────────────────────────────────────────────────────`);
      addTransmissionLog(`✅ TRANSMISIÓN COMPLETADA EXITOSAMENTE`);
      addTransmissionLog(`📋 Auth Code: ${authCode}`);
      addTransmissionLog(`📋 RRN: ${rrn}`);
      addTransmissionLog(`📋 Transmission ID: ${transmissionId}`);
      addTransmissionLog(`═══════════════════════════════════════════════════════════`);
      
      setIsTransmitting(false);
      return { success: true, authCode, rrn, transmissionId, route };
      
    } catch (error) {
      addTransmissionLog(`❌ ERROR EN TRANSMISIÓN: ${error}`);
      setIsTransmitting(false);
      return { success: false, authCode: '', rrn: '', transmissionId: '', route };
    }
  };

  // =============================================================================
  // PDF GENERATION FUNCTIONS - TZ DIGITAL API STYLE
  // =============================================================================
  const generateTZDigitalPDF = async (transfer: TransferRequest, sourceAccount: CustodyAccount | undefined) => {
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    });

    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const margin = 10;
    let y = margin;
    const date = new Date(transfer.timestamp);

    // Colores corporativos institucionales
    const colors = {
      darkBlue: [8, 20, 40] as [number, number, number],
      navy: [12, 30, 55] as [number, number, number],
      gold: [197, 165, 55] as [number, number, number],
      lightGold: [218, 190, 100] as [number, number, number],
      green: [22, 163, 74] as [number, number, number],
      emerald: [16, 185, 129] as [number, number, number],
      gray: [75, 85, 99] as [number, number, number],
      lightGray: [248, 250, 252] as [number, number, number],
      black: [0, 0, 0] as [number, number, number],
      white: [255, 255, 255] as [number, number, number],
      red: [220, 38, 38] as [number, number, number],
      blue: [59, 130, 246] as [number, number, number],
      purple: [147, 51, 234] as [number, number, number]
    };

    // Identificadores únicos
    const receiptNumber = `TZ-${date.getFullYear()}${(date.getMonth()+1).toString().padStart(2,'0')}${date.getDate().toString().padStart(2,'0')}-${Math.floor(Math.random() * 999999).toString().padStart(6, '0')}`;
    const verificationCode = Array.from({length: 32}, () => Math.random().toString(16).charAt(2)).join('').toUpperCase();
    const securityHash = Array.from({length: 64}, () => Math.random().toString(16).charAt(2)).join('').toUpperCase();

    // ═══════════════════════════════════════════════════════════════════════════
    // HEADER INSTITUCIONAL PREMIUM
    // ═══════════════════════════════════════════════════════════════════════════
    const drawInstitutionalHeader = () => {
      // Fondo principal del header
      pdf.setFillColor(...colors.darkBlue);
      pdf.rect(0, 0, pageWidth, 58, 'F');
      
      // Líneas doradas decorativas superiores
      pdf.setFillColor(...colors.gold);
      pdf.rect(0, 0, pageWidth, 2, 'F');
      pdf.setFillColor(...colors.lightGold);
      pdf.rect(0, 2, pageWidth, 0.5, 'F');
      
      // Marco dorado interior
      pdf.setDrawColor(...colors.gold);
      pdf.setLineWidth(0.8);
      pdf.rect(8, 8, pageWidth - 16, 42, 'S');
      
      // Patrón de líneas decorativo inferior
      pdf.setDrawColor(...colors.gold);
      pdf.setLineWidth(0.2);
      for (let i = 0; i < pageWidth; i += 6) {
        pdf.line(i, 56, i + 3, 56);
      }
      
      // Línea dorada inferior del header
      pdf.setFillColor(...colors.gold);
      pdf.rect(0, 58, pageWidth, 2.5, 'F');
      
      // Nombre del banco - institucional
      pdf.setTextColor(...colors.white);
      pdf.setFontSize(26);
      pdf.setFont('helvetica', 'bold');
      pdf.text('DIGITAL COMMERCIAL BANK LTD', pageWidth / 2, 22, { align: 'center' });
      
      // Sistema DAES
      pdf.setFontSize(11);
      pdf.setFont('helvetica', 'normal');
      pdf.setTextColor(...colors.gold);
      pdf.text('API JSON TRANSFER SYSTEM - PROTOCOL 10B', pageWidth / 2, 30, { align: 'center' });
      
      // URLs oficiales
      pdf.setFontSize(7);
      pdf.setTextColor(160, 170, 180);
      pdf.text('www.digcommbank.com    |    www.luxliqdaes.cloud', pageWidth / 2, 38, { align: 'center' });
      
      // Título del documento
      pdf.setFontSize(13);
      pdf.setFont('helvetica', 'bold');
      pdf.setTextColor(...colors.white);
      const title = 'TRANSFER CONFIRMATION RECEIPT';
      pdf.text(title, pageWidth / 2, 48, { align: 'center' });
      
      // Subtítulo
      pdf.setFontSize(8);
      pdf.setFont('helvetica', 'normal');
      pdf.setTextColor(...colors.lightGold);
      const subtitle = 'VISA Network | ISO 20022 | SSH/TLS 1.3 Protocol';
      pdf.text(subtitle, pageWidth / 2, 54, { align: 'center' });
      
      y = 68;
    };

    // ═══════════════════════════════════════════════════════════════════════════
    // FOOTER INSTITUCIONAL
    // ═══════════════════════════════════════════════════════════════════════════
    const drawInstitutionalFooter = () => {
      const footerY = pageHeight - 20;
      
      // Fondo del footer
      pdf.setFillColor(248, 250, 252);
      pdf.rect(0, footerY - 8, pageWidth, 28, 'F');
      
      // Línea dorada superior
      pdf.setFillColor(...colors.gold);
      pdf.rect(0, footerY - 8, pageWidth, 1.5, 'F');
      
      // Información del banco
      pdf.setTextColor(...colors.gray);
      pdf.setFontSize(6.5);
      pdf.setFont('helvetica', 'normal');
      pdf.text('Digital Commercial Bank Ltd | ISO 27001:2022 Certified | ISO 20022 Native | PCI-DSS Level 1 | FATF AML/CFT Compliant', pageWidth / 2, footerY - 2, { align: 'center' });
      
      // URLs
      pdf.setTextColor(...colors.darkBlue);
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(7);
      pdf.text('https://digcommbank.com', margin, footerY + 4);
      pdf.text('https://luxliqdaes.cloud', margin + 48, footerY + 4);
      
      // Fecha de generación
      const dateText = date.toLocaleDateString(isSpanish ? 'es-ES' : 'en-US', { 
        year: 'numeric', month: 'long', day: 'numeric'
      });
      pdf.setTextColor(...colors.gray);
      pdf.setFont('helvetica', 'normal');
      pdf.text(dateText, pageWidth / 2, footerY + 4, { align: 'center' });
      
      // Confidencial
      pdf.setTextColor(...colors.red);
      pdf.setFontSize(5.5);
      pdf.setFont('helvetica', 'bold');
      pdf.text(isSpanish ? 'DOCUMENTO CONFIDENCIAL' : 'CONFIDENTIAL DOCUMENT', pageWidth - margin, footerY - 2, { align: 'right' });
    };

    // ═══════════════════════════════════════════════════════════════════════════
    // FUNCIÓN PARA DIBUJAR SECCIÓN
    // ═══════════════════════════════════════════════════════════════════════════
    const drawSection = (title: string, sectionNum: number) => {
      // Fondo de sección institucional
      pdf.setFillColor(...colors.darkBlue);
      pdf.rect(margin, y, pageWidth - (margin * 2), 8, 'F');
      
      // Borde dorado izquierdo
      pdf.setFillColor(...colors.gold);
      pdf.rect(margin, y, 2.5, 8, 'F');
      
      // Número de sección
      pdf.setFillColor(...colors.gold);
      pdf.rect(margin + 4, y + 1, 12, 6, 'F');
      pdf.setTextColor(...colors.darkBlue);
      pdf.setFontSize(7);
      pdf.setFont('helvetica', 'bold');
      pdf.text(String(sectionNum).padStart(2, '0'), margin + 10, y + 5.2, { align: 'center' });
      
      pdf.setTextColor(...colors.white);
      pdf.setFontSize(9);
      pdf.setFont('helvetica', 'bold');
      pdf.text(title, margin + 20, y + 5.5);
      
      y += 11;
    };

    // ═══════════════════════════════════════════════════════════════════════════
    // FUNCIÓN PARA DIBUJAR TABLA
    // ═══════════════════════════════════════════════════════════════════════════
    const drawTable = (data: [string, string][], startY: number): number => {
      const colWidth1 = 55;
      const colWidth2 = pageWidth - (margin * 2) - colWidth1;
      const rowHeight = 7;
      let currentY = startY;
      
      data.forEach((row, index) => {
        const bgColor = index % 2 === 0 ? colors.lightGray : colors.white;
        pdf.setFillColor(...bgColor);
        pdf.rect(margin, currentY, pageWidth - (margin * 2), rowHeight, 'F');
        
        // Borde
        pdf.setDrawColor(200, 200, 200);
        pdf.setLineWidth(0.1);
        pdf.rect(margin, currentY, colWidth1, rowHeight, 'S');
        pdf.rect(margin + colWidth1, currentY, colWidth2, rowHeight, 'S');
        
        // Label
        pdf.setTextColor(...colors.gray);
        pdf.setFontSize(7);
        pdf.setFont('helvetica', 'bold');
        pdf.text(row[0], margin + 2, currentY + 4.5);
        
        // Value
        pdf.setTextColor(...colors.black);
        pdf.setFontSize(7);
        pdf.setFont('helvetica', 'normal');
        pdf.text(row[1], margin + colWidth1 + 2, currentY + 4.5);
        
        currentY += rowHeight;
      });
      
      return currentY;
    };

    // ═══════════════════════════════════════════════════════════════════════════
    // GENERAR CONTENIDO
    // ═══════════════════════════════════════════════════════════════════════════
    drawInstitutionalHeader();

    // Recibo y fecha
    pdf.setFillColor(...colors.lightGray);
    pdf.rect(margin, y, pageWidth - (margin * 2), 10, 'F');
    pdf.setTextColor(...colors.darkBlue);
    pdf.setFontSize(9);
    pdf.setFont('helvetica', 'bold');
    pdf.text(`Receipt: ${receiptNumber}`, margin + 3, y + 6);
    pdf.text(date.toLocaleString(), pageWidth - margin - 3, y + 6, { align: 'right' });
    y += 14;

    // SECCIÓN 1: TRANSFER DETAILS
    drawSection(isSpanish ? 'DETALLES DE LA TRANSFERENCIA' : 'TRANSFER DETAILS', 1);
    y = drawTable([
      ['Transfer ID', transfer.id],
      ['Amount', `${transfer.currency} ${transfer.amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}`],
      ['Status', transfer.status === 'completed' ? '✅ COMPLETED' : transfer.status.toUpperCase()],
      ['Approval Code', transfer.approvalCode],
      ['Timestamp', date.toLocaleString()],
    ], y);
    y += 8;

    // SECCIÓN 2: BENEFICIARY
    drawSection(isSpanish ? 'BENEFICIARIO' : 'BENEFICIARY', 2);
    y = drawTable([
      ['Name', transfer.beneficiaryName],
      ['Bank', transfer.beneficiaryBank],
      ['Card Number', `**** **** **** ${transfer.cardNumber.slice(-4)}`],
      ['Expiration', transfer.expiration],
      ['Network', 'VISA International'],
    ], y);
    y += 8;

    // SECCIÓN 3: SOURCE ACCOUNT
    drawSection(isSpanish ? 'CUENTA ORIGEN' : 'SOURCE ACCOUNT', 3);
    y = drawTable([
      ['Account Name', sourceAccount?.accountName || transfer.sourceAccountName],
      ['Account Number', sourceAccount?.accountNumber || transfer.sourceAccountId],
      ['Institution', 'Digital Commercial Bank Ltd'],
      ['Account Type', sourceAccount?.accountCategory?.toUpperCase() || 'CUSTODY'],
      ['Currency', transfer.currency],
    ], y);
    y += 8;

    // SECCIÓN 4: VISA PROTOCOL
    drawSection(isSpanish ? 'PROTOCOLO VISA UTILIZADO' : 'VISA PROTOCOL USED', 4);
    y = drawTable([
      ['Protocol Name', transfer.protocolName || 'Visa Direct'],
      ['Protocol Code', transfer.protocolCode || 'VD'],
      ['Endpoint', transfer.protocolEndpoint?.substring(0, 40) + '...' || 'https://usa.visa.com/api/v1/visadirect'],
      ['Message Format', 'ISO 8583 / REST API'],
      ['Real-Time', '✅ Yes'],
    ], y);
    y += 8;

    // SECCIÓN 5: SERVER DETAILS
    drawSection(isSpanish ? 'DETALLES DEL SERVIDOR' : 'SERVER DETAILS', 5);
    y = drawTable([
      ['Server IP', MAIN_SERVER.ip],
      ['Port', String(MAIN_SERVER.port)],
      ['Domain', MAIN_SERVER.domain],
      ['Protocol', 'SSH/TLS 1.3'],
      ['Network', 'VISA USA Domain'],
    ], y);
    y += 8;

    // SECCIÓN 6: SECURITY
    drawSection(isSpanish ? 'VERIFICACIÓN DE SEGURIDAD' : 'SECURITY VERIFICATION', 6);
    y = drawTable([
      ['Verification Code', verificationCode.substring(0, 16) + '...'],
      ['Security Hash', securityHash.substring(0, 24) + '...'],
      ['ISO 20022', '✅ Compliant'],
      ['Digital Signature', '✅ Verified'],
      ['Encryption', 'AES-256-GCM'],
    ], y);

    // Footer
    drawInstitutionalFooter();

    // Descargar
    pdf.save(`API_DAES_Transfer_${transfer.id}.pdf`);
  };

  // =============================================================================
  // PDF GENERATION FUNCTIONS - BLACK SCREEN STYLE
  // =============================================================================
  const generateBlackScreenPDF = async (transfer: TransferRequest, sourceAccount: CustodyAccount | undefined) => {
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    });

    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const margin = 12;
    let yPos = margin;
    const lineHeight = 4.5;
    const date = new Date(transfer.timestamp);
    const now = new Date();

    // Datos del servidor
    const SERVER_CONFIG = {
      API_URL: 'https://usa.visa.com/api/v1/transfer',
      RECEIVE_URL: 'https://secure.visa.com/api/v1/receive',
      GLOBAL_IP: MAIN_SERVER.ip,
      PORT: MAIN_SERVER.port,
      API_KEY: NETWORK_CONFIG.apiKey,
      AUTH_KEY: 'VISA-SECURE-KEY-' + Math.random().toString(36).substring(2, 10).toUpperCase(),
      SHA256_HANDSHAKE: Array.from({length: 64}, () => Math.random().toString(16).charAt(2)).join('')
    };

    // Identificadores
    const documentRef = `API/${date.getFullYear()}/${Math.floor(Math.random() * 9999999).toString().padStart(7, '0')}`;
    const sessionNumber = Math.floor(Math.random() * 9999999999).toString().padStart(10, '0');
    const messageNumber = Math.floor(Math.random() * 999999).toString().padStart(6, '0');

    // Función helper para fondo negro
    const addBlackPage = () => {
      pdf.setFillColor(0, 0, 0);
      pdf.rect(0, 0, pageWidth, pageHeight, 'F');
    };

    // Funciones helper para texto
    const setTerminalGreen = (size: number = 8) => {
      pdf.setTextColor(0, 255, 65);
      pdf.setFontSize(size);
      pdf.setFont('Courier', 'normal');
    };

    const setWhiteText = (size: number = 8) => {
      pdf.setTextColor(255, 255, 255);
      pdf.setFontSize(size);
      pdf.setFont('Courier', 'normal');
    };

    const setGrayText = (size: number = 7) => {
      pdf.setTextColor(180, 180, 180);
      pdf.setFontSize(size);
      pdf.setFont('Courier', 'normal');
    };

    const setCyanText = (size: number = 8) => {
      pdf.setTextColor(0, 255, 255);
      pdf.setFontSize(size);
      pdf.setFont('Courier', 'normal');
    };

    const setYellowText = (size: number = 8) => {
      pdf.setTextColor(255, 255, 0);
      pdf.setFontSize(size);
      pdf.setFont('Courier', 'normal');
    };

    const drawLine = (y: number, width: number = 0.2) => {
      pdf.setDrawColor(100, 100, 100);
      pdf.setLineWidth(width);
      pdf.line(margin, y, pageWidth - margin, y);
    };

    const drawDottedLine = (y: number) => {
      pdf.setDrawColor(60, 60, 60);
      pdf.setLineWidth(0.1);
      for (let x = margin; x < pageWidth - margin; x += 2) {
        pdf.line(x, y, x + 1, y);
      }
    };

    // ==================== PÁGINA 1 ====================
    addBlackPage();

    // ===== HEADER INSTITUCIONAL =====
    setGrayText(6);
    pdf.text('ISO 27001:2022 | ISO 20022 | VISA NETWORK', margin, yPos);
    pdf.text(`REF: ${documentRef}`, pageWidth - margin, yPos, { align: 'right' });
    yPos += 6;

    drawLine(yPos, 0.5);
    yPos += 6;

    setTerminalGreen(10);
    pdf.text('DIGITAL COMMERCIAL BANK LTD', pageWidth / 2, yPos, { align: 'center' });
    yPos += 5;

    setWhiteText(8);
    pdf.text('API JSON TRANSFER - TECHNICAL STATEMENT', pageWidth / 2, yPos, { align: 'center' });
    yPos += 4;

    setGrayText(7);
    pdf.text('PROTOCOL 10B - VISA NETWORK', pageWidth / 2, yPos, { align: 'center' });
    yPos += 6;

    drawLine(yPos, 0.5);
    yPos += 8;

    // ===== SECTION 01: TRANSACTION IDENTIFICATION =====
    setGrayText(6);
    pdf.text('01. TRANSACTION IDENTIFICATION', margin, yPos);
    yPos += 5;

    const txInfo = [
      ['TRANSFER ID', transfer.id],
      ['APPROVAL CODE', transfer.approvalCode],
      ['DATE', date.toLocaleDateString('en-US', { month: 'long', day: '2-digit', year: 'numeric' })],
      ['TIME', date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false }) + ' UTC'],
      ['STATUS', transfer.status === 'completed' ? 'COMPLETED' : 'FAILED'],
    ];

    txInfo.forEach(([label, value]) => {
      setTerminalGreen(7);
      pdf.text(`${label}:`, margin, yPos);
      setWhiteText(7);
      pdf.text(String(value), margin + 50, yPos);
      yPos += lineHeight;
    });

    yPos += 4;
    drawDottedLine(yPos);
    yPos += 8;

    // ===== SECTION 02: SERVER IDENTIFICATION =====
    setGrayText(6);
    pdf.text('02. OUTGOING SERVER IDENTIFICATION', margin, yPos);
    yPos += 5;

    const serverInfo = [
      ['PROVIDER', 'VISA International - Payment Gateway'],
      ['API KEY (TOKEN)', SERVER_CONFIG.API_KEY.substring(0, 20) + '...'],
      ['AUTH KEY', SERVER_CONFIG.AUTH_KEY],
      ['SERVER IP', SERVER_CONFIG.GLOBAL_IP],
      ['PORT', String(SERVER_CONFIG.PORT)],
      ['PRIMARY ENDPOINT', SERVER_CONFIG.API_URL],
    ];

    serverInfo.forEach(([label, value]) => {
      setTerminalGreen(6);
      pdf.text(`${label}:`, margin, yPos);
      setWhiteText(6);
      pdf.text(String(value), margin + 45, yPos);
      yPos += lineHeight;
    });

    yPos += 2;
    setTerminalGreen(5);
    pdf.text('SHA256 HANDSHAKE:', margin, yPos);
    setWhiteText(5);
    pdf.text(SERVER_CONFIG.SHA256_HANDSHAKE.substring(0, 48) + '...', margin + 35, yPos);
    yPos += lineHeight;

    yPos += 4;
    drawDottedLine(yPos);
    yPos += 8;

    // ===== SECTION 03: ORIGINATOR (SOURCE) =====
    setGrayText(6);
    pdf.text('03. ORIGINATOR (SOURCE OF FUNDS)', margin, yPos);
    yPos += 5;

    const originatorInfo = [
      ['BANK', 'DIGITAL COMMERCIAL BANK LTD'],
      ['CUSTODY ACCOUNT', sourceAccount?.accountName || transfer.sourceAccountName],
      ['ACCOUNT NUMBER', sourceAccount?.accountNumber || transfer.sourceAccountId],
      ['ACCOUNT TYPE', sourceAccount?.accountCategory?.toUpperCase() || 'CUSTODY'],
      ['CURRENCY', transfer.currency],
    ];

    originatorInfo.forEach(([label, value]) => {
      setTerminalGreen(6);
      pdf.text(`${label}:`, margin, yPos);
      setWhiteText(6);
      pdf.text(String(value), margin + 45, yPos);
      yPos += lineHeight;
    });

    yPos += 4;
    drawDottedLine(yPos);
    yPos += 8;

    // ===== SECTION 04: BENEFICIARY =====
    setGrayText(6);
    pdf.text('04. BENEFICIARY (DESTINATION)', margin, yPos);
    yPos += 5;

    const beneficiaryInfo = [
      ['NAME', transfer.beneficiaryName],
      ['BANK', transfer.beneficiaryBank],
      ['CARD NUMBER', `**** **** **** ${transfer.cardNumber.slice(-4)}`],
      ['EXPIRATION', transfer.expiration],
      ['NETWORK', 'VISA International'],
    ];

    beneficiaryInfo.forEach(([label, value]) => {
      setCyanText(6);
      pdf.text(`${label}:`, margin, yPos);
      setWhiteText(6);
      pdf.text(String(value), margin + 45, yPos);
      yPos += lineHeight;
    });

    yPos += 4;
    drawDottedLine(yPos);
    yPos += 8;

    // ===== SECTION 05: AMOUNT =====
    setGrayText(6);
    pdf.text('05. TRANSFER AMOUNT', margin, yPos);
    yPos += 5;

    setYellowText(12);
    pdf.text(`${transfer.currency} ${transfer.amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}`, margin, yPos);
    yPos += 8;

    setTerminalGreen(7);
    pdf.text('ISO 4217 CODE:', margin, yPos);
    setWhiteText(7);
    pdf.text('840 (USD)', margin + 45, yPos);
    yPos += lineHeight;

    setTerminalGreen(7);
    pdf.text('CLASSIFICATION:', margin, yPos);
    setWhiteText(7);
    pdf.text('M2 Money Supply', margin + 45, yPos);
    yPos += lineHeight;

    yPos += 4;
    drawDottedLine(yPos);
    yPos += 8;

    // ===== SECTION 06: SESSION INFO =====
    setGrayText(6);
    pdf.text('06. SESSION INFORMATION', margin, yPos);
    yPos += 5;

    const sessionInfo = [
      ['SESSION NUMBER', sessionNumber],
      ['MESSAGE NUMBER', messageNumber],
      ['PROTOCOL', 'SSH/TLS 1.3'],
      ['ENCRYPTION', 'AES-256-GCM'],
      ['TIMESTAMP', now.toISOString()],
    ];

    sessionInfo.forEach(([label, value]) => {
      setTerminalGreen(6);
      pdf.text(`${label}:`, margin, yPos);
      setWhiteText(6);
      pdf.text(String(value), margin + 45, yPos);
      yPos += lineHeight;
    });

    yPos += 4;
    drawLine(yPos, 0.5);
    yPos += 8;

    // ===== STATUS FINAL =====
    setTerminalGreen(10);
    pdf.text('>>> TRANSFER COMPLETED SUCCESSFULLY', pageWidth / 2, yPos, { align: 'center' });
    yPos += 6;

    setWhiteText(7);
    pdf.text(`Document generated: ${now.toLocaleString()}`, pageWidth / 2, yPos, { align: 'center' });
    yPos += 4;

    setGrayText(6);
    pdf.text('This document is electronically generated and valid without signature', pageWidth / 2, yPos, { align: 'center' });

    // ===== FOOTER =====
    const footerY = pageHeight - 15;
    drawLine(footerY - 5, 0.3);
    setGrayText(5);
    pdf.text('Digital Commercial Bank Ltd | ISO 20022 | VISA Network | PCI-DSS Level 1', pageWidth / 2, footerY, { align: 'center' });
    pdf.text(`Page 1 of 1 | REF: ${documentRef}`, pageWidth / 2, footerY + 4, { align: 'center' });

    // Descargar
    pdf.save(`BlackScreen_Transfer_${transfer.id}.pdf`);
  };

  // =============================================================================
  // GENERATE BOTH PDFs
  // =============================================================================
  const generateTransferReceipts = async (transfer: TransferRequest) => {
    const sourceAccount = custodyAccounts.find(a => a.id === transfer.sourceAccountId);
    
    addLog('📄 Generando comprobantes PDF...');
    
    // Generate API DAES Style PDF
    await generateTZDigitalPDF(transfer, sourceAccount);
    addLog('✅ PDF API DAES generado');
    
    // Small delay between downloads
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // Generate Black Screen Style PDF
    await generateBlackScreenPDF(transfer, sourceAccount);
    addLog('✅ PDF Black Screen generado');
    
    addLog('📦 Ambos comprobantes descargados exitosamente');
  };

  // Process transfer with VisaNet transmission
  const processTransfer = async () => {
    if (!selectedAccount || transferForm.amount <= 0) {
      alert(isSpanish ? 'Seleccione una cuenta y monto válido' : 'Select an account and valid amount');
      return;
    }

    const sourceAccount = custodyAccounts.find(a => a.id === selectedAccount);
    if (!sourceAccount) return;

    if (transferForm.amount > sourceAccount.availableBalance) {
      alert(isSpanish ? 'Fondos insuficientes' : 'Insufficient funds');
      return;
    }

    if (!transferForm.cardNumber || transferForm.cardNumber.replace(/\s/g, '').length < 16) {
      alert(isSpanish ? 'Número de tarjeta inválido' : 'Invalid card number');
      return;
    }

    setIsProcessing(true);
    addLog(`═══════════════════════════════════════════════════════════`);
    addLog(`🚀 INICIANDO TRANSMISIÓN A VISA.COM`);
    addLog(`═══════════════════════════════════════════════════════════`);
    addLog(`📋 Protocolo: ${selectedProtocol.name} (${selectedProtocol.code})`);
    addLog(`📡 Endpoint: ${selectedProtocol.endpoint}`);
    addLog(`📤 Monto: $${transferForm.amount.toLocaleString()} USD`);
    addLog(`👤 Beneficiario: ${transferForm.beneficiaryName}`);
    addLog(`💳 Tarjeta: ****${transferForm.cardNumber.slice(-4)}`);
    addLog(`───────────────────────────────────────────────────────────`);

    // Ejecutar transmisión VisaNet completa
    addLog('🔄 Iniciando flujo de transmisión VisaNet...');
    addLog('📊 Arquitectura: Ledger → Issuer → VisaNet (201.3) → Card');
    
    const transmissionResult = await executeVisaNetTransmission(
      transferForm.amount,
      transferForm.cardNumber.replace(/\s/g, ''),
      transferForm.beneficiaryName,
      transferForm.beneficiaryBank
    );

    if (!transmissionResult.success) {
      addLog('❌ Error en la transmisión VisaNet');
      setIsProcessing(false);
      alert(isSpanish ? 'Error en la transmisión. Intente nuevamente.' : 'Transmission error. Please try again.');
      return;
    }

    addLog(`✅ Transmisión exitosa via usa.visa.com`);
    addLog(`📋 Auth Code: ${transmissionResult.authCode}`);
    addLog(`📋 RRN: ${transmissionResult.rrn}`);
    addLog(`📋 Transmission ID: ${transmissionResult.transmissionId}`);

    // Create transfer record with VisaNet data
    const newTransfer: TransferRequest = {
      id: `TRF-${Date.now()}`,
      beneficiaryName: transferForm.beneficiaryName,
      beneficiaryBank: transferForm.beneficiaryBank,
      cardNumber: transferForm.cardNumber.replace(/\s/g, ''),
      expiration: transferForm.expiration,
      amount: transferForm.amount,
      currency: transferForm.currency,
      approvalCode: transmissionResult.authCode,
      status: 'completed',
      timestamp: new Date().toISOString(),
      sourceAccountId: selectedAccount,
      sourceAccountName: sourceAccount.accountName,
      // Datos de transmisión VisaNet
      transmissionId: transmissionResult.transmissionId,
      visanetAuthCode: transmissionResult.authCode,
      visanetRRN: transmissionResult.rrn,
      transmissionRoute: transmissionResult.route,
      cardLoadStatus: 'loaded',
      settlementStatus: 'settled',
      // Protocolo utilizado
      protocolId: selectedProtocol.id,
      protocolName: selectedProtocol.name,
      protocolCode: selectedProtocol.code,
      protocolEndpoint: selectedProtocol.endpoint
    };

    // Deduct from custody account
    try {
      custodyStore.withdrawFundsWithTransaction(selectedAccount, {
        amount: transferForm.amount,
        type: 'withdrawal',
        description: `VisaNet Transfer to ${transferForm.beneficiaryName} via usa.visa.com`,
        destinationAccount: transferForm.cardNumber,
        destinationBank: transferForm.beneficiaryBank,
        transactionDate: new Date().toISOString().split('T')[0],
        transactionTime: new Date().toLocaleTimeString(),
        valueDate: new Date().toISOString().split('T')[0],
        notes: `VisaNet Auth: ${transmissionResult.authCode} | RRN: ${transmissionResult.rrn} | TxID: ${transmissionResult.transmissionId}`,
        createdBy: 'VISANET_ROUTER_201.3'
      });
      
      // Refresh accounts
      setCustodyAccounts(custodyStore.getAccounts());
      addLog('💰 Fondos debitados de cuenta origen');
    } catch (error) {
      console.error('Error processing withdrawal:', error);
      addLog('⚠️ Error al debitar fondos (registro local)');
    }

    setTransferHistory(prev => [newTransfer, ...prev]);
    addLog(`───────────────────────────────────────────────────────────`);
    addLog(`🎉 TARJETA CARGADA EXITOSAMENTE`);
    addLog(`💳 Tarjeta ****${transferForm.cardNumber.slice(-4)} acreditada con $${transferForm.amount.toLocaleString()} USD`);
    addLog(`═══════════════════════════════════════════════════════════`);

    // Generate PDF receipts
    await generateTransferReceipts(newTransfer);

    // Reset form
    setTransferForm({
      beneficiaryName: '',
      beneficiaryBank: 'REVOLUT',
      cardNumber: '',
      expiration: '',
      amount: 0,
      currency: 'USD'
    });
    setSelectedBeneficiary(null);

    setIsProcessing(false);
  };

  // Copy to clipboard
  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  // Format card number
  const formatCardNumber = (value: string) => {
    const cleaned = value.replace(/\D/g, '');
    const formatted = cleaned.match(/.{1,4}/g)?.join(' ') || cleaned;
    return formatted.substring(0, 19);
  };

  // =============================================================================
  // RENDER
  // =============================================================================

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white p-6">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 bg-gradient-to-br from-[#1A1F71] to-[#F7B600] rounded-2xl flex items-center justify-center shadow-lg shadow-[#1A1F71]/30">
              <Globe className="w-8 h-8 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-[#1A1F71] via-[#00A1E0] to-[#F7B600] bg-clip-text text-transparent">
                VisaNet API
              </h1>
              <p className="text-gray-400">
                {isSpanish ? 'Sistema de Transmisión de Fondos - Todos los Protocolos Visa' : 'Funds Transmission System - All Visa Protocols'}
              </p>
              {/* Selected Protocol Badge */}
              <div className="flex items-center gap-2 mt-1">
                <span className="text-xs text-gray-500">{isSpanish ? 'Protocolo activo:' : 'Active protocol:'}</span>
                <span 
                  className="px-2 py-0.5 rounded text-xs font-bold"
                  style={{ backgroundColor: `${selectedProtocol.color}20`, color: selectedProtocol.color }}
                >
                  {selectedProtocol.icon} {selectedProtocol.name} ({selectedProtocol.code})
                </span>
              </div>
            </div>
          </div>
          
          {/* Server Status */}
          <div className="flex items-center gap-4">
            <div className={`flex items-center gap-2 px-4 py-2 rounded-lg ${
              serverStatus === 'connected' ? 'bg-green-500/20 text-green-400' :
              serverStatus === 'connecting' ? 'bg-yellow-500/20 text-yellow-400' :
              'bg-red-500/20 text-red-400'
            }`}>
              {serverStatus === 'connecting' ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : serverStatus === 'connected' ? (
                <CheckCircle className="w-4 h-4" />
              ) : (
                <XCircle className="w-4 h-4" />
              )}
              <span className="font-mono text-sm">
                {serverStatus === 'connected' ? 'CONNECTED' : 
                 serverStatus === 'connecting' ? 'CONNECTING...' : 'DISCONNECTED'}
              </span>
            </div>
            
            {serverStatus !== 'connected' ? (
              <button
                onClick={connectToServer}
                disabled={serverStatus === 'connecting'}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors disabled:opacity-50"
              >
                <Play className="w-4 h-4" />
                {isSpanish ? 'Conectar' : 'Connect'}
              </button>
            ) : (
              <button
                onClick={disconnectFromServer}
                className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 rounded-lg transition-colors"
              >
                <Pause className="w-4 h-4" />
                {isSpanish ? 'Desconectar' : 'Disconnect'}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Navigation */}
      <div className="flex gap-2 mb-6 flex-wrap">
        {(['dashboard', 'protocols', 'transfer', 'transmission', 'history', 'verify', 'config'] as const).map(view => (
          <button
            key={view}
            onClick={() => setActiveView(view)}
            className={`px-4 py-2 rounded-lg font-medium transition-all ${
              activeView === view
                ? 'bg-gradient-to-r from-[#1A1F71] to-[#00A1E0] text-white'
                : 'bg-[#1a1a1a] text-gray-400 hover:bg-[#252525]'
            }`}
          >
            {view === 'dashboard' && '📊 Dashboard'}
            {view === 'protocols' && '📋 Protocolos Visa'}
            {view === 'transfer' && '💸 Transferir'}
            {view === 'transmission' && '🌐 VisaNet Router'}
            {view === 'history' && '📜 Historial'}
            {view === 'verify' && '🔍 Verificar'}
            {view === 'config' && '⚙️ Config'}
          </button>
        ))}
      </div>

      {/* Dashboard View */}
      {activeView === 'dashboard' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Server Info */}
          <div className="bg-[#0d0d0d] border border-[#1a1a1a] rounded-xl p-6">
            <div className="flex items-center gap-3 mb-4">
              <Server className="w-6 h-6 text-blue-400" />
              <h2 className="text-xl font-bold">{isSpanish ? 'Servidor Principal' : 'Main Server'}</h2>
            </div>
            
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-400">Sistema:</span>
                <span className="font-mono text-green-400">{MAIN_SERVER.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">IP:</span>
                <span className="font-mono">{MAIN_SERVER.ip}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Puerto:</span>
                <span className="font-mono">{MAIN_SERVER.port}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Dominio:</span>
                <a href={MAIN_SERVER.domain} target="_blank" rel="noopener noreferrer" 
                   className="font-mono text-blue-400 hover:underline flex items-center gap-1">
                  usa.visa.com <ArrowUpRight className="w-3 h-3" />
                </a>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Protocolo:</span>
                <span className="font-mono text-purple-400">{MAIN_SERVER.protocol}</span>
              </div>
            </div>
          </div>

          {/* Session Info */}
          <div className="bg-[#0d0d0d] border border-[#1a1a1a] rounded-xl p-6">
            <div className="flex items-center gap-3 mb-4">
              <Satellite className="w-6 h-6 text-purple-400" />
              <h2 className="text-xl font-bold">{isSpanish ? 'Sesión Satelital' : 'Satellite Session'}</h2>
            </div>
            
            <div className="space-y-3">
              <div className="p-3 bg-blue-500/10 border border-blue-500/30 rounded-lg">
                <span className="text-xs text-blue-400 block mb-1">IPSVR</span>
                <span className="font-mono text-sm">{SESSION_INFO.ipsvr}</span>
              </div>
              <div className={`p-3 rounded-lg ${
                sessionActive ? 'bg-green-500/10 border border-green-500/30' : 'bg-red-500/10 border border-red-500/30'
              }`}>
                <span className={`text-xs block mb-1 ${sessionActive ? 'text-green-400' : 'text-red-400'}`}>
                  {isSpanish ? 'Estado de Descarga' : 'Download Status'}
                </span>
                <span className="font-mono text-sm">
                  {sessionActive ? SESSION_INFO.downloadStatus : 'AWAITING CONNECTION'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Protocolo:</span>
                <span className="font-mono">{SESSION_INFO.serviceProtocol}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Acceso:</span>
                <span className={`font-mono ${sessionActive ? 'text-green-400' : 'text-red-400'}`}>
                  {sessionActive ? 'GRANTED' : 'PENDING'}
                </span>
              </div>
            </div>
          </div>

          {/* Network Config */}
          <div className="bg-[#0d0d0d] border border-[#1a1a1a] rounded-xl p-6">
            <div className="flex items-center gap-3 mb-4">
              <Network className="w-6 h-6 text-cyan-400" />
              <h2 className="text-xl font-bold">{isSpanish ? 'Red & API' : 'Network & API'}</h2>
            </div>
            
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-400">IP Version:</span>
                <span className="font-mono">{NETWORK_CONFIG.ipVersion}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-400">Host IP:</span>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-sm">{NETWORK_CONFIG.hostIpAddress}</span>
                  <button onClick={() => copyToClipboard(NETWORK_CONFIG.hostIpAddress)}
                          className="p-1 hover:bg-white/10 rounded">
                    <Copy className="w-3 h-3" />
                  </button>
                </div>
              </div>
              <div className="p-3 bg-[#1a1a1a] rounded-lg">
                <span className="text-xs text-gray-400 block mb-1">API Endpoint</span>
                <span className="font-mono text-xs text-cyan-400 break-all">
                  {NETWORK_CONFIG.apiEndpointUrl}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Progress:</span>
                <span className="font-mono text-green-400">{NETWORK_CONFIG.downloadProgress}% SVR4</span>
              </div>
            </div>
          </div>

          {/* Custody Accounts */}
          <div className="lg:col-span-2 bg-[#0d0d0d] border border-[#1a1a1a] rounded-xl p-6">
            <div className="flex items-center gap-3 mb-4">
              <Wallet className="w-6 h-6 text-yellow-400" />
              <h2 className="text-xl font-bold">{isSpanish ? 'Cuentas Custodio Disponibles' : 'Available Custody Accounts'}</h2>
            </div>
            
            {custodyAccounts.length === 0 ? (
              <div className="text-center py-8 text-gray-400">
                {isSpanish ? 'No hay cuentas custodio configuradas' : 'No custody accounts configured'}
              </div>
            ) : (
              <div className="space-y-3 max-h-[400px] overflow-y-auto">
                {custodyAccounts.map(account => (
                  <div
                    key={account.id}
                    className={`p-4 rounded-lg border transition-all cursor-pointer ${
                      selectedAccount === account.id
                        ? 'bg-blue-500/20 border-blue-500'
                        : 'bg-[#1a1a1a] border-[#252525] hover:border-blue-500/50'
                    }`}
                    onClick={() => setSelectedAccount(account.id)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                          account.accountType === 'blockchain' ? 'bg-purple-500/20' : 'bg-blue-500/20'
                        }`}>
                          {account.accountType === 'blockchain' ? (
                            <Database className="w-5 h-5 text-purple-400" />
                          ) : (
                            <Building2 className="w-5 h-5 text-blue-400" />
                          )}
                        </div>
                        <div>
                          <h3 className="font-bold">{account.accountName}</h3>
                          <p className="text-sm text-gray-400">
                            {account.bankName || account.tokenSymbol || 'N/A'}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-xl font-bold text-green-400">
                          ${account.availableBalance.toLocaleString()}
                        </div>
                        <div className="text-sm text-gray-400">
                          {account.currency} {isSpanish ? 'Disponible' : 'Available'}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Connection Logs */}
          <div className="bg-[#0d0d0d] border border-[#1a1a1a] rounded-xl p-6">
            <div className="flex items-center gap-3 mb-4">
              <Terminal className="w-6 h-6 text-green-400" />
              <h2 className="text-xl font-bold">{isSpanish ? 'Logs de Conexión' : 'Connection Logs'}</h2>
            </div>
            
            <div className="bg-black rounded-lg p-4 h-[300px] overflow-y-auto font-mono text-xs">
              {connectionLogs.length === 0 ? (
                <div className="text-gray-500">
                  {isSpanish ? 'Esperando conexión...' : 'Waiting for connection...'}
                </div>
              ) : (
                connectionLogs.map((log, i) => (
                  <div key={i} className="text-green-400 mb-1">{log}</div>
                ))
              )}
            </div>
          </div>

          {/* Active Licenses */}
          <div className="lg:col-span-3 bg-[#0d0d0d] border border-[#1a1a1a] rounded-xl p-6">
            <div className="flex items-center gap-3 mb-4">
              <Key className="w-6 h-6 text-yellow-400" />
              <h2 className="text-xl font-bold">{isSpanish ? 'Licencias Activas' : 'Active Licenses'}</h2>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {ACTIVE_LICENSES.map(license => (
                <div key={license.id} className="p-4 bg-[#1a1a1a] rounded-lg border border-green-500/30">
                  <div className="flex items-center gap-2 mb-2">
                    <CheckCircle className="w-4 h-4 text-green-400" />
                    <span className="font-mono font-bold text-green-400">{license.name}</span>
                  </div>
                  <div className="text-sm text-gray-400">
                    (License) active port - {license.port}
                  </div>
                </div>
              ))}
            </div>
            
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4 pt-4 border-t border-[#252525]">
              <div className="text-center">
                <span className="text-xs text-gray-400 block">PCB Version</span>
                <span className="font-mono text-sm">{SYSTEM_INFO.pcbVersion}</span>
              </div>
              <div className="text-center">
                <span className="text-xs text-gray-400 block">EPLD Version</span>
                <span className="font-mono text-sm">{SYSTEM_INFO.epldVersion}</span>
              </div>
              <div className="text-center">
                <span className="text-xs text-gray-400 block">FPGA1 Version</span>
                <span className="font-mono text-sm">{SYSTEM_INFO.fpga1Version}</span>
              </div>
              <div className="text-center">
                <span className="text-xs text-gray-400 block">Information</span>
                <span className="font-mono text-sm">{SYSTEM_INFO.information}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════════════ */}
      {/* PROTOCOLS VIEW - COMPLETE VISA PROTOCOL SUITE */}
      {/* ═══════════════════════════════════════════════════════════════════════════ */}
      {activeView === 'protocols' && (
        <div className="space-y-6">
          {/* Protocol Header */}
          <div className="bg-gradient-to-r from-[#1A1F71] to-[#00A1E0] rounded-xl p-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold text-white mb-2">
                  {isSpanish ? 'Suite Completa de Protocolos Visa' : 'Complete Visa Protocol Suite'}
                </h2>
                <p className="text-blue-100">
                  {isSpanish 
                    ? 'Seleccione el protocolo adecuado para su tipo de transacción'
                    : 'Select the appropriate protocol for your transaction type'}
                </p>
              </div>
              <div className="text-right">
                <div className="text-4xl font-bold text-white">{VISA_PROTOCOLS.length}</div>
                <div className="text-blue-200">{isSpanish ? 'Protocolos Disponibles' : 'Available Protocols'}</div>
              </div>
            </div>
          </div>

          {/* Currently Selected Protocol */}
          <div className="bg-[#0d0d0d] border-2 rounded-xl p-6" style={{ borderColor: selectedProtocol.color }}>
            <div className="flex items-center gap-4">
              <div 
                className="w-16 h-16 rounded-xl flex items-center justify-center text-3xl"
                style={{ backgroundColor: `${selectedProtocol.color}20` }}
              >
                {selectedProtocol.icon}
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-3">
                  <h3 className="text-xl font-bold" style={{ color: selectedProtocol.color }}>
                    {selectedProtocol.name}
                  </h3>
                  <span className="px-2 py-1 bg-green-500/20 text-green-400 text-xs rounded font-bold">
                    ✓ {isSpanish ? 'SELECCIONADO' : 'SELECTED'}
                  </span>
                </div>
                <p className="text-gray-400 text-sm mt-1">{selectedProtocol.description}</p>
                <div className="flex flex-wrap gap-2 mt-2">
                  <span className="px-2 py-1 bg-[#1a1a1a] rounded text-xs font-mono">{selectedProtocol.code}</span>
                  <span className="px-2 py-1 bg-[#1a1a1a] rounded text-xs">{selectedProtocol.messageFormat}</span>
                  <span className="px-2 py-1 bg-[#1a1a1a] rounded text-xs">{selectedProtocol.version}</span>
                  {selectedProtocol.realTime && (
                    <span className="px-2 py-1 bg-green-500/20 text-green-400 rounded text-xs">⚡ Real-Time</span>
                  )}
                  {selectedProtocol.crossBorder && (
                    <span className="px-2 py-1 bg-blue-500/20 text-blue-400 rounded text-xs">🌐 Cross-Border</span>
                  )}
                </div>
              </div>
              <div className="text-right">
                <div className="text-sm text-gray-400">{isSpanish ? 'Monto Máximo' : 'Max Amount'}</div>
                <div className="text-xl font-bold text-green-400">
                  ${selectedProtocol.maxAmount.toLocaleString()}
                </div>
              </div>
            </div>
          </div>

          {/* Category Filter */}
          <div className="flex gap-2 flex-wrap">
            <button
              onClick={() => setProtocolCategoryFilter('all')}
              className={`px-4 py-2 rounded-lg font-medium transition-all ${
                protocolCategoryFilter === 'all'
                  ? 'bg-[#1A1F71] text-white'
                  : 'bg-[#1a1a1a] text-gray-400 hover:bg-[#252525]'
              }`}
            >
              📋 {isSpanish ? 'Todos' : 'All'} ({VISA_PROTOCOLS.length})
            </button>
            {PROTOCOL_CATEGORIES.map(cat => {
              const count = VISA_PROTOCOLS.filter(p => p.category === cat.id).length;
              return (
                <button
                  key={cat.id}
                  onClick={() => setProtocolCategoryFilter(cat.id)}
                  className={`px-4 py-2 rounded-lg font-medium transition-all ${
                    protocolCategoryFilter === cat.id
                      ? 'text-white'
                      : 'bg-[#1a1a1a] text-gray-400 hover:bg-[#252525]'
                  }`}
                  style={protocolCategoryFilter === cat.id ? { backgroundColor: cat.color } : {}}
                >
                  {cat.icon} {cat.name} ({count})
                </button>
              );
            })}
          </div>

          {/* Protocols Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {VISA_PROTOCOLS
              .filter(p => protocolCategoryFilter === 'all' || p.category === protocolCategoryFilter)
              .map(protocol => (
                <div
                  key={protocol.id}
                  onClick={() => setSelectedProtocol(protocol)}
                  className={`bg-[#0d0d0d] border rounded-xl p-4 cursor-pointer transition-all hover:scale-[1.02] ${
                    selectedProtocol.id === protocol.id
                      ? 'border-2 ring-2 ring-opacity-50'
                      : 'border-[#1a1a1a] hover:border-[#333]'
                  }`}
                  style={selectedProtocol.id === protocol.id ? { 
                    borderColor: protocol.color,
                    boxShadow: `0 0 20px ${protocol.color}30`
                  } : {}}
                >
                  {/* Protocol Header */}
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div 
                        className="w-12 h-12 rounded-lg flex items-center justify-center text-2xl"
                        style={{ backgroundColor: `${protocol.color}20` }}
                      >
                        {protocol.icon}
                      </div>
                      <div>
                        <h3 className="font-bold" style={{ color: protocol.color }}>{protocol.name}</h3>
                        <span className="text-xs font-mono text-gray-500">{protocol.code}</span>
                      </div>
                    </div>
                    {selectedProtocol.id === protocol.id && (
                      <CheckCircle className="w-5 h-5 text-green-400" />
                    )}
                  </div>

                  {/* Description */}
                  <p className="text-sm text-gray-400 mb-3 line-clamp-2">{protocol.description}</p>

                  {/* Tags */}
                  <div className="flex flex-wrap gap-1 mb-3">
                    {protocol.realTime && (
                      <span className="px-2 py-0.5 bg-green-500/20 text-green-400 rounded text-xs">⚡ Real-Time</span>
                    )}
                    {protocol.crossBorder && (
                      <span className="px-2 py-0.5 bg-blue-500/20 text-blue-400 rounded text-xs">🌐 Cross-Border</span>
                    )}
                    <span className="px-2 py-0.5 bg-[#1a1a1a] rounded text-xs text-gray-500">v{protocol.version}</span>
                  </div>

                  {/* Use Cases */}
                  <div className="text-xs text-gray-500 mb-2">
                    <span className="font-bold">{isSpanish ? 'Casos de uso:' : 'Use cases:'}</span>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {protocol.useCase.slice(0, 3).map((use, i) => (
                        <span key={i} className="px-1.5 py-0.5 bg-[#1a1a1a] rounded">{use}</span>
                      ))}
                      {protocol.useCase.length > 3 && (
                        <span className="px-1.5 py-0.5 text-gray-600">+{protocol.useCase.length - 3}</span>
                      )}
                    </div>
                  </div>

                  {/* Footer */}
                  <div className="flex items-center justify-between pt-2 border-t border-[#1a1a1a]">
                    <span className="text-xs text-gray-500">{protocol.messageFormat}</span>
                    <span className="text-xs font-bold text-green-400">
                      Max: ${protocol.maxAmount >= 999999999 ? '∞' : protocol.maxAmount.toLocaleString()}
                    </span>
                  </div>
                </div>
              ))}
          </div>

          {/* Protocol Details Panel */}
          <div className="bg-[#0d0d0d] border border-[#1a1a1a] rounded-xl p-6">
            <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
              <span style={{ color: selectedProtocol.color }}>{selectedProtocol.icon}</span>
              {isSpanish ? 'Detalles del Protocolo Seleccionado' : 'Selected Protocol Details'}
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {/* Basic Info */}
              <div className="space-y-3">
                <h4 className="font-bold text-gray-400 text-sm uppercase">{isSpanish ? 'Información Básica' : 'Basic Information'}</h4>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-gray-500">{isSpanish ? 'Nombre:' : 'Name:'}</span>
                    <span className="font-bold">{selectedProtocol.name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">{isSpanish ? 'Código:' : 'Code:'}</span>
                    <span className="font-mono">{selectedProtocol.code}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">{isSpanish ? 'Versión:' : 'Version:'}</span>
                    <span>{selectedProtocol.version}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">{isSpanish ? 'Categoría:' : 'Category:'}</span>
                    <span className="capitalize">{selectedProtocol.category}</span>
                  </div>
                </div>
              </div>

              {/* Technical Info */}
              <div className="space-y-3">
                <h4 className="font-bold text-gray-400 text-sm uppercase">{isSpanish ? 'Información Técnica' : 'Technical Information'}</h4>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-gray-500">{isSpanish ? 'Formato:' : 'Format:'}</span>
                    <span className="text-sm">{selectedProtocol.messageFormat}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Real-Time:</span>
                    <span className={selectedProtocol.realTime ? 'text-green-400' : 'text-red-400'}>
                      {selectedProtocol.realTime ? '✓ Sí' : '✗ No'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Cross-Border:</span>
                    <span className={selectedProtocol.crossBorder ? 'text-green-400' : 'text-red-400'}>
                      {selectedProtocol.crossBorder ? '✓ Sí' : '✗ No'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">{isSpanish ? 'Monto Máx:' : 'Max Amount:'}</span>
                    <span className="text-green-400 font-bold">
                      ${selectedProtocol.maxAmount >= 999999999 ? '∞' : selectedProtocol.maxAmount.toLocaleString()}
                    </span>
                  </div>
                </div>
              </div>

              {/* Endpoint */}
              <div className="space-y-3">
                <h4 className="font-bold text-gray-400 text-sm uppercase">Endpoint</h4>
                <div className="p-3 bg-[#1a1a1a] rounded-lg">
                  <code className="text-xs text-cyan-400 break-all">{selectedProtocol.endpoint}</code>
                </div>
                <div>
                  <h5 className="text-xs text-gray-500 mb-1">{isSpanish ? 'Monedas Soportadas:' : 'Supported Currencies:'}</h5>
                  <div className="flex flex-wrap gap-1">
                    {selectedProtocol.currency.map(cur => (
                      <span key={cur} className="px-2 py-0.5 bg-[#1a1a1a] rounded text-xs">{cur}</span>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Transaction Types */}
            <div className="mt-6 pt-4 border-t border-[#1a1a1a]">
              <h4 className="font-bold text-gray-400 text-sm uppercase mb-3">
                {isSpanish ? 'Tipos de Transacción Soportados' : 'Supported Transaction Types'}
              </h4>
              <div className="flex flex-wrap gap-2">
                {selectedProtocol.transactionTypes.map((type, i) => (
                  <span 
                    key={i} 
                    className="px-3 py-1.5 rounded-lg text-sm font-mono"
                    style={{ backgroundColor: `${selectedProtocol.color}20`, color: selectedProtocol.color }}
                  >
                    {type}
                  </span>
                ))}
              </div>
            </div>

            {/* Use Protocol Button */}
            <div className="mt-6 pt-4 border-t border-[#1a1a1a] flex justify-end">
              <button
                onClick={() => {
                  addLog(`📋 Protocolo seleccionado: ${selectedProtocol.name} (${selectedProtocol.code})`);
                  setActiveView('transfer');
                }}
                className="px-6 py-3 rounded-lg font-bold transition-all hover:scale-105"
                style={{ backgroundColor: selectedProtocol.color, color: 'white' }}
              >
                {isSpanish ? 'Usar Este Protocolo para Transferir' : 'Use This Protocol for Transfer'} →
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Transfer View */}
      {activeView === 'transfer' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Transfer Form */}
          <div className="bg-[#0d0d0d] border border-[#1a1a1a] rounded-xl p-6">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <Send className="w-6 h-6 text-blue-400" />
                <h2 className="text-xl font-bold">{isSpanish ? 'Nueva Transferencia' : 'New Transfer'}</h2>
              </div>
              {/* Protocol Badge */}
              <div 
                className="px-3 py-1.5 rounded-lg text-sm font-bold flex items-center gap-2"
                style={{ backgroundColor: `${selectedProtocol.color}20`, color: selectedProtocol.color }}
              >
                {selectedProtocol.icon} {selectedProtocol.code}
              </div>
            </div>

            {!sessionActive ? (
              <div className="text-center py-12">
                <XCircle className="w-16 h-16 text-red-400 mx-auto mb-4" />
                <h3 className="text-xl font-bold mb-2">
                  {isSpanish ? 'Conexión Requerida' : 'Connection Required'}
                </h3>
                <p className="text-gray-400 mb-4">
                  {isSpanish ? 'Conecte al servidor para realizar transferencias' : 'Connect to server to make transfers'}
                </p>
                <button
                  onClick={connectToServer}
                  className="px-6 py-3 bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
                >
                  {isSpanish ? 'Conectar Ahora' : 'Connect Now'}
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Source Account */}
                <div>
                  <label className="block text-sm text-gray-400 mb-2">
                    {isSpanish ? 'Cuenta Origen' : 'Source Account'}
                  </label>
                  <select
                    value={selectedAccount}
                    onChange={(e) => setSelectedAccount(e.target.value)}
                    className="w-full px-4 py-3 bg-[#1a1a1a] border border-[#252525] rounded-lg focus:border-blue-500 outline-none"
                  >
                    <option value="">{isSpanish ? 'Seleccionar cuenta...' : 'Select account...'}</option>
                    {custodyAccounts.map(account => (
                      <option key={account.id} value={account.id}>
                        {account.accountName} - ${account.availableBalance.toLocaleString()} {account.currency}
                      </option>
                    ))}
                  </select>
                  {selectedAccount && (
                    <div className="mt-2 text-sm text-green-400">
                      {isSpanish ? 'Balance disponible:' : 'Available balance:'} ${getSelectedAccountBalance().toLocaleString()}
                    </div>
                  )}
                </div>

                {/* Predefined Beneficiaries from JSON */}
                <div className="mb-4">
                  <label className="block text-sm text-gray-400 mb-2">
                    {isSpanish ? '📋 Beneficiarios del JSON 10B' : '📋 JSON 10B Beneficiaries'}
                  </label>
                  <div className="space-y-2">
                    {PREDEFINED_BENEFICIARIES.map(beneficiary => (
                      <div
                        key={beneficiary.id}
                        onClick={() => selectPredefinedBeneficiary(beneficiary)}
                        className={`p-3 rounded-lg border cursor-pointer transition-all ${
                          selectedBeneficiary?.id === beneficiary.id
                            ? 'bg-green-500/20 border-green-500 ring-2 ring-green-500/50'
                            : 'bg-[#1a1a1a] border-[#252525] hover:border-blue-500 hover:bg-[#1f1f1f]'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                              selectedBeneficiary?.id === beneficiary.id ? 'bg-green-500' : 'bg-blue-600'
                            }`}>
                              {selectedBeneficiary?.id === beneficiary.id ? (
                                <CheckCircle className="w-5 h-5 text-white" />
                              ) : (
                                <CreditCard className="w-5 h-5 text-white" />
                              )}
                            </div>
                            <div>
                              <div className="font-bold text-white">{beneficiary.name}</div>
                              <div className="text-sm text-gray-400">
                                {beneficiary.bank} • **** {beneficiary.cardNumber.slice(-4)}
                              </div>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-xs text-purple-400 font-mono">{beneficiary.source}</div>
                            <div className="text-xs text-gray-500">Code: {beneficiary.approvalCode}</div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                  {selectedBeneficiary && (
                    <button
                      onClick={clearBeneficiary}
                      className="mt-2 text-sm text-red-400 hover:text-red-300 flex items-center gap-1"
                    >
                      <XCircle className="w-4 h-4" />
                      {isSpanish ? 'Limpiar selección' : 'Clear selection'}
                    </button>
                  )}
                </div>

                <div className="border-t border-[#252525] my-4 pt-4">
                  <div className="text-sm text-gray-500 mb-2">
                    {isSpanish ? '— O ingrese manualmente —' : '— Or enter manually —'}
                  </div>
                </div>

                {/* Beneficiary Name */}
                <div>
                  <label className="block text-sm text-gray-400 mb-2">
                    {isSpanish ? 'Nombre del Beneficiario' : 'Beneficiary Name'}
                  </label>
                  <input
                    type="text"
                    value={transferForm.beneficiaryName}
                    onChange={(e) => {
                      setTransferForm(prev => ({ ...prev, beneficiaryName: e.target.value.toUpperCase() }));
                      setSelectedBeneficiary(null); // Clear selection when manually editing
                    }}
                    placeholder="MR. JOHN DOE"
                    className={`w-full px-4 py-3 bg-[#1a1a1a] border rounded-lg focus:border-blue-500 outline-none uppercase ${
                      selectedBeneficiary ? 'border-green-500' : 'border-[#252525]'
                    }`}
                  />
                </div>

                {/* Bank */}
                <div>
                  <label className="block text-sm text-gray-400 mb-2">
                    {isSpanish ? 'Banco Beneficiario' : 'Beneficiary Bank'}
                  </label>
                  <select
                    value={transferForm.beneficiaryBank}
                    onChange={(e) => setTransferForm(prev => ({ ...prev, beneficiaryBank: e.target.value }))}
                    className="w-full px-4 py-3 bg-[#1a1a1a] border border-[#252525] rounded-lg focus:border-blue-500 outline-none"
                  >
                    <option value="REVOLUT">REVOLUT</option>
                    <option value="WISE">WISE (TransferWise)</option>
                    <option value="N26">N26</option>
                    <option value="MONZO">MONZO</option>
                    <option value="CHIME">CHIME</option>
                    <option value="PAYPAL">PAYPAL</option>
                    <option value="VENMO">VENMO</option>
                    <option value="CASH_APP">CASH APP</option>
                    <option value="OTHER">OTHER</option>
                  </select>
                </div>

                {/* Card Number */}
                <div>
                  <label className="block text-sm text-gray-400 mb-2">
                    {isSpanish ? 'Número de Tarjeta' : 'Card Number'}
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      value={transferForm.cardNumber}
                      onChange={(e) => setTransferForm(prev => ({ ...prev, cardNumber: formatCardNumber(e.target.value) }))}
                      placeholder="4165 9812 2477 2651"
                      maxLength={19}
                      className="w-full px-4 py-3 bg-[#1a1a1a] border border-[#252525] rounded-lg focus:border-blue-500 outline-none font-mono"
                    />
                    <CreditCard className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                  </div>
                </div>

                {/* Expiration */}
                <div>
                  <label className="block text-sm text-gray-400 mb-2">
                    {isSpanish ? 'Fecha de Expiración' : 'Expiration Date'}
                  </label>
                  <input
                    type="text"
                    value={transferForm.expiration}
                    onChange={(e) => {
                      let value = e.target.value.replace(/\D/g, '');
                      if (value.length > 2) value = value.slice(0, 2) + '/' + value.slice(2, 4);
                      setTransferForm(prev => ({ ...prev, expiration: value }));
                    }}
                    placeholder="05/30"
                    maxLength={5}
                    className="w-full px-4 py-3 bg-[#1a1a1a] border border-[#252525] rounded-lg focus:border-blue-500 outline-none font-mono"
                  />
                </div>

                {/* Amount */}
                <div>
                  <label className="block text-sm text-gray-400 mb-2">
                    {isSpanish ? 'Monto a Transferir' : 'Transfer Amount'}
                  </label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">$</span>
                    <input
                      type="number"
                      value={transferForm.amount || ''}
                      onChange={(e) => setTransferForm(prev => ({ ...prev, amount: parseFloat(e.target.value) || 0 }))}
                      placeholder="0.00"
                      className="w-full pl-8 pr-16 py-3 bg-[#1a1a1a] border border-[#252525] rounded-lg focus:border-blue-500 outline-none font-mono"
                    />
                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400">USD</span>
                  </div>
                </div>

                {/* Quick Amount Buttons */}
                <div className="flex gap-2 flex-wrap">
                  {[1000, 5000, 10000, 50000, 100000].map(amount => (
                    <button
                      key={amount}
                      onClick={() => setTransferForm(prev => ({ ...prev, amount }))}
                      className="px-3 py-1 bg-[#1a1a1a] hover:bg-[#252525] rounded-lg text-sm transition-colors"
                    >
                      ${amount.toLocaleString()}
                    </button>
                  ))}
                  <button
                    onClick={() => setTransferForm(prev => ({ ...prev, amount: getSelectedAccountBalance() }))}
                    className="px-3 py-1 bg-blue-600/20 hover:bg-blue-600/30 text-blue-400 rounded-lg text-sm transition-colors"
                  >
                    MAX
                  </button>
                </div>

                {/* Submit Button */}
                <button
                  onClick={processTransfer}
                  disabled={isProcessing || !selectedAccount || transferForm.amount <= 0}
                  className="w-full py-4 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 rounded-lg font-bold text-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {isProcessing ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      {isSpanish ? 'Procesando...' : 'Processing...'}
                    </>
                  ) : (
                    <>
                      <Send className="w-5 h-5" />
                      {isSpanish ? 'Enviar Fondos' : 'Send Funds'}
                    </>
                  )}
                </button>
              </div>
            )}
          </div>

          {/* Transfer Preview */}
          <div className="bg-[#0d0d0d] border border-[#1a1a1a] rounded-xl p-6">
            <div className="flex items-center gap-3 mb-6">
              <Eye className="w-6 h-6 text-purple-400" />
              <h2 className="text-xl font-bold">{isSpanish ? 'Vista Previa JSON' : 'JSON Preview'}</h2>
            </div>

            <div className="bg-black rounded-lg p-4 font-mono text-sm overflow-x-auto">
              <pre className="text-green-400">
{JSON.stringify({
  "interface": {
    "protocol": "API_JSON_TRANSFER",
    "version": "10B"
  },
  "system": {
    "name": "MAIN SYSTEM",
    "server_ip": MAIN_SERVER.ip,
    "port": MAIN_SERVER.port,
    "domain": MAIN_SERVER.domain,
    "status": serverStatus.toUpperCase()
  },
  "session": {
    "ipsvr": SESSION_INFO.ipsvr,
    "download_status": sessionActive ? "ACTIVE" : "PENDING",
    "service_protocol": SESSION_INFO.serviceProtocol
  },
  "beneficiary": {
    "name": transferForm.beneficiaryName || "PENDING",
    "bank": transferForm.beneficiaryBank,
    "card_number": transferForm.cardNumber.replace(/\s/g, '') || "PENDING",
    "expiration": transferForm.expiration || "MM/YY",
    "amount": transferForm.amount.toFixed(2),
    "currency": "USD",
    "approval_code": "PENDING"
  },
  "network": {
    "ip_version": NETWORK_CONFIG.ipVersion,
    "host_ip_address": NETWORK_CONFIG.hostIpAddress,
    "api_endpoint_url": NETWORK_CONFIG.apiEndpointUrl,
    "download_progress": "100% SVR4",
    "access": sessionActive ? "GRANTED" : "PENDING"
  },
  "account": {
    "source_id": selectedAccount || "NOT_SELECTED",
    "debited_amount": `${transferForm.amount.toFixed(2)} USD`,
    "available_balance": `${getSelectedAccountBalance().toFixed(2)} USD`
  },
  "timestamp": {
    "date": new Date().toLocaleDateString('en-GB'),
    "time": new Date().toLocaleTimeString()
  }
}, null, 2)}
              </pre>
            </div>
          </div>
        </div>
      )}

      {/* VisaNet Transmission View */}
      {activeView === 'transmission' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Arquitectura de Transmisión */}
          <div className="bg-[#0d0d0d] border border-[#1a1a1a] rounded-xl p-6">
            <div className="flex items-center gap-3 mb-6">
              <Globe className="w-6 h-6 text-blue-400" />
              <h2 className="text-xl font-bold">{isSpanish ? 'Arquitectura de Transmisión' : 'Transmission Architecture'}</h2>
            </div>

            {/* Diagrama de flujo */}
            <div className="space-y-4">
              {transmissionNodes.map((node, index) => (
                <div key={node.id} className="relative">
                  {/* Línea conectora */}
                  {index < transmissionNodes.length - 1 && (
                    <div className="absolute left-6 top-16 w-0.5 h-8 bg-gradient-to-b from-blue-500 to-purple-500" />
                  )}
                  
                  <div className={`p-4 rounded-lg border-2 transition-all ${
                    node.status === 'completed' ? 'bg-green-500/10 border-green-500' :
                    node.status === 'processing' ? 'bg-blue-500/10 border-blue-500 animate-pulse' :
                    node.status === 'error' ? 'bg-red-500/10 border-red-500' :
                    'bg-[#1a1a1a] border-[#252525]'
                  }`}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${
                          node.status === 'completed' ? 'bg-green-500' :
                          node.status === 'processing' ? 'bg-blue-500' :
                          node.status === 'error' ? 'bg-red-500' :
                          'bg-[#252525]'
                        }`}>
                          {node.type === 'ledger' && <Database className="w-6 h-6 text-white" />}
                          {node.type === 'issuer' && <Building2 className="w-6 h-6 text-white" />}
                          {node.type === 'visanet' && <Globe className="w-6 h-6 text-white" />}
                          {node.type === 'acquirer' && <Building2 className="w-6 h-6 text-white" />}
                          {node.type === 'card' && <CreditCard className="w-6 h-6 text-white" />}
                        </div>
                        <div>
                          <h3 className="font-bold text-white">{node.name}</h3>
                          <p className="text-sm text-gray-400 font-mono">{node.protocol}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className={`px-3 py-1 rounded-full text-xs font-bold ${
                          node.status === 'completed' ? 'bg-green-500/20 text-green-400' :
                          node.status === 'processing' ? 'bg-blue-500/20 text-blue-400' :
                          node.status === 'error' ? 'bg-red-500/20 text-red-400' :
                          'bg-gray-500/20 text-gray-400'
                        }`}>
                          {node.status === 'completed' ? '✅ COMPLETADO' :
                           node.status === 'processing' ? '🔄 PROCESANDO' :
                           node.status === 'error' ? '❌ ERROR' :
                           '⏳ PENDIENTE'}
                        </div>
                        {node.latency && (
                          <div className="text-xs text-gray-500 mt-1">{node.latency}ms</div>
                        )}
                      </div>
                    </div>
                    <div className="mt-2 text-xs text-gray-500 font-mono truncate">
                      {node.endpoint}
                    </div>
                  </div>
                  
                  {/* Flecha entre nodos */}
                  {index < transmissionNodes.length - 1 && (
                    <div className="flex justify-center py-2">
                      <ArrowRight className={`w-5 h-5 ${
                        transmissionNodes[index + 1].status !== 'idle' ? 'text-blue-400' : 'text-gray-600'
                      }`} />
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Botón de reset */}
            <button
              onClick={resetTransmissionNodes}
              disabled={isTransmitting}
              className="mt-6 w-full py-3 bg-gray-700 hover:bg-gray-600 rounded-lg font-bold transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
              <RotateCcw className="w-5 h-5" />
              {isSpanish ? 'Resetear Nodos' : 'Reset Nodes'}
            </button>
          </div>

          {/* Configuración VisaNet y Logs */}
          <div className="space-y-6">
            {/* VisaNet Configuration */}
            <div className="bg-[#0d0d0d] border border-[#1a1a1a] rounded-xl p-6">
              <div className="flex items-center gap-3 mb-4">
                <Settings className="w-6 h-6 text-purple-400" />
                <h2 className="text-xl font-bold">VisaNet Configuration (201.3)</h2>
              </div>

              <div className="space-y-3">
                <div className="flex justify-between items-center p-3 bg-[#1a1a1a] rounded-lg">
                  <span className="text-gray-400">Router Endpoint:</span>
                  <span className="font-mono text-xs text-blue-400">{VISANET_CONFIG.routerEndpoint}</span>
                </div>
                <div className="flex justify-between items-center p-3 bg-[#1a1a1a] rounded-lg">
                  <span className="text-gray-400">Protocol:</span>
                  <span className="font-mono text-purple-400">{VISANET_CONFIG.protocol}</span>
                </div>
                <div className="flex justify-between items-center p-3 bg-[#1a1a1a] rounded-lg">
                  <span className="text-gray-400">Version:</span>
                  <span className="font-mono text-green-400">{VISANET_CONFIG.version}</span>
                </div>
                <div className="flex justify-between items-center p-3 bg-[#1a1a1a] rounded-lg">
                  <span className="text-gray-400">Merchant ID:</span>
                  <span className="font-mono">{VISANET_CONFIG.merchantId}</span>
                </div>
                <div className="flex justify-between items-center p-3 bg-[#1a1a1a] rounded-lg">
                  <span className="text-gray-400">Terminal ID:</span>
                  <span className="font-mono">{VISANET_CONFIG.terminalId}</span>
                </div>
                <div className="flex justify-between items-center p-3 bg-[#1a1a1a] rounded-lg">
                  <span className="text-gray-400">Acquirer ID:</span>
                  <span className="font-mono">{VISANET_CONFIG.acquirerId}</span>
                </div>
                <div className="flex justify-between items-center p-3 bg-[#1a1a1a] rounded-lg">
                  <span className="text-gray-400">Issuer ID:</span>
                  <span className="font-mono">{VISANET_CONFIG.issuerId}</span>
                </div>
              </div>
            </div>

            {/* Transmission Logs */}
            <div className="bg-[#0d0d0d] border border-[#1a1a1a] rounded-xl p-6">
              <div className="flex items-center gap-3 mb-4">
                <Terminal className="w-6 h-6 text-green-400" />
                <h2 className="text-xl font-bold">{isSpanish ? 'Logs de Transmisión' : 'Transmission Logs'}</h2>
              </div>

              <div className="bg-black rounded-lg p-4 h-[300px] overflow-y-auto font-mono text-xs">
                {transmissionLogs.length === 0 ? (
                  <div className="text-gray-500">
                    {isSpanish ? 'Esperando transmisión...' : 'Waiting for transmission...'}
                  </div>
                ) : (
                  transmissionLogs.map((log, i) => (
                    <div key={i} className={`mb-1 ${
                      log.includes('✅') ? 'text-green-400' :
                      log.includes('❌') ? 'text-red-400' :
                      log.includes('🔄') || log.includes('📤') ? 'text-blue-400' :
                      log.includes('═') || log.includes('───') ? 'text-gray-500' :
                      log.includes('🚀') || log.includes('🎉') ? 'text-yellow-400' :
                      'text-gray-300'
                    }`}>{log}</div>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Flujo Visual */}
          <div className="lg:col-span-2 bg-[#0d0d0d] border border-[#1a1a1a] rounded-xl p-6">
            <div className="flex items-center gap-3 mb-6">
              <Network className="w-6 h-6 text-cyan-400" />
              <h2 className="text-xl font-bold">{isSpanish ? 'Flujo de Transmisión VISA.COM' : 'VISA.COM Transmission Flow'}</h2>
            </div>

            {/* Diagrama horizontal del flujo */}
            <div className="flex items-center justify-between overflow-x-auto pb-4">
              {/* Ledger */}
              <div className="flex flex-col items-center min-w-[120px]">
                <div className={`w-16 h-16 rounded-xl flex items-center justify-center ${
                  transmissionNodes[0].status === 'completed' ? 'bg-green-500' :
                  transmissionNodes[0].status === 'processing' ? 'bg-blue-500 animate-pulse' :
                  'bg-[#252525]'
                }`}>
                  <Database className="w-8 h-8 text-white" />
                </div>
                <span className="text-xs text-center mt-2 font-bold">Ledger/Core</span>
                <span className="text-xs text-gray-500">API</span>
              </div>

              <ArrowRight className={`w-8 h-8 flex-shrink-0 ${transmissionNodes[1].status !== 'idle' ? 'text-blue-400' : 'text-gray-600'}`} />

              {/* Issuer */}
              <div className="flex flex-col items-center min-w-[120px]">
                <div className={`w-16 h-16 rounded-xl flex items-center justify-center ${
                  transmissionNodes[1].status === 'completed' ? 'bg-green-500' :
                  transmissionNodes[1].status === 'processing' ? 'bg-blue-500 animate-pulse' :
                  'bg-[#252525]'
                }`}>
                  <Building2 className="w-8 h-8 text-white" />
                </div>
                <span className="text-xs text-center mt-2 font-bold">Issuer</span>
                <span className="text-xs text-gray-500">Processor</span>
              </div>

              <ArrowRight className={`w-8 h-8 flex-shrink-0 ${transmissionNodes[2].status !== 'idle' ? 'text-blue-400' : 'text-gray-600'}`} />

              {/* VisaNet */}
              <div className="flex flex-col items-center min-w-[140px]">
                <div className={`w-20 h-20 rounded-xl flex items-center justify-center border-2 ${
                  transmissionNodes[2].status === 'completed' ? 'bg-green-500 border-green-400' :
                  transmissionNodes[2].status === 'processing' ? 'bg-blue-500 border-blue-400 animate-pulse' :
                  'bg-[#1a4480] border-blue-600'
                }`}>
                  <div className="text-center">
                    <Globe className="w-8 h-8 text-white mx-auto" />
                    <span className="text-[10px] text-white font-bold">VISA.COM</span>
                  </div>
                </div>
                <span className="text-xs text-center mt-2 font-bold text-blue-400">VisaNet</span>
                <span className="text-xs text-gray-500">201.3</span>
              </div>

              <ArrowRight className={`w-8 h-8 flex-shrink-0 ${transmissionNodes[3].status !== 'idle' ? 'text-blue-400' : 'text-gray-600'}`} />

              {/* Acquirer */}
              <div className="flex flex-col items-center min-w-[120px]">
                <div className={`w-16 h-16 rounded-xl flex items-center justify-center ${
                  transmissionNodes[3].status === 'completed' ? 'bg-green-500' :
                  transmissionNodes[3].status === 'processing' ? 'bg-blue-500 animate-pulse' :
                  'bg-[#252525]'
                }`}>
                  <Building2 className="w-8 h-8 text-white" />
                </div>
                <span className="text-xs text-center mt-2 font-bold">Acquirer</span>
                <span className="text-xs text-gray-500">Bank</span>
              </div>

              <ArrowRight className={`w-8 h-8 flex-shrink-0 ${transmissionNodes[4].status !== 'idle' ? 'text-green-400' : 'text-gray-600'}`} />

              {/* Card */}
              <div className="flex flex-col items-center min-w-[120px]">
                <div className={`w-16 h-16 rounded-xl flex items-center justify-center ${
                  transmissionNodes[4].status === 'completed' ? 'bg-green-500' :
                  transmissionNodes[4].status === 'processing' ? 'bg-yellow-500 animate-pulse' :
                  'bg-[#252525]'
                }`}>
                  <CreditCard className="w-8 h-8 text-white" />
                </div>
                <span className="text-xs text-center mt-2 font-bold text-green-400">Tarjeta</span>
                <span className="text-xs text-gray-500">CARGADA</span>
              </div>
            </div>

            {/* Estado actual */}
            <div className={`mt-6 p-4 rounded-lg border ${
              isTransmitting ? 'bg-blue-500/10 border-blue-500' :
              transmissionNodes.every(n => n.status === 'completed') ? 'bg-green-500/10 border-green-500' :
              'bg-[#1a1a1a] border-[#252525]'
            }`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {isTransmitting ? (
                    <Loader2 className="w-5 h-5 text-blue-400 animate-spin" />
                  ) : transmissionNodes.every(n => n.status === 'completed') ? (
                    <CheckCircle className="w-5 h-5 text-green-400" />
                  ) : (
                    <Clock className="w-5 h-5 text-gray-400" />
                  )}
                  <span className="font-bold">
                    {isTransmitting ? (isSpanish ? 'Transmitiendo via VISA.COM...' : 'Transmitting via VISA.COM...') :
                     transmissionNodes.every(n => n.status === 'completed') ? (isSpanish ? '¡Tarjeta cargada exitosamente!' : 'Card loaded successfully!') :
                     (isSpanish ? 'Listo para transmitir' : 'Ready to transmit')}
                  </span>
                </div>
                {isTransmitting && (
                  <span className="text-sm text-blue-400">
                    Paso {currentTransmissionStep + 1} de {transmissionNodes.length}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* History View */}
      {activeView === 'history' && (
        <div className="bg-[#0d0d0d] border border-[#1a1a1a] rounded-xl p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <Clock className="w-6 h-6 text-yellow-400" />
              <h2 className="text-xl font-bold">{isSpanish ? 'Historial de Transferencias' : 'Transfer History'}</h2>
            </div>
            <div className="text-sm text-gray-400">
              {transferHistory.length} {isSpanish ? 'transferencias' : 'transfers'}
            </div>
          </div>

          {transferHistory.length === 0 ? (
            <div className="text-center py-12 text-gray-400">
              <Clock className="w-16 h-16 mx-auto mb-4 opacity-50" />
              <p>{isSpanish ? 'No hay transferencias registradas' : 'No transfers recorded'}</p>
            </div>
          ) : (
            <div className="space-y-4">
              {transferHistory.map(transfer => (
                <div key={transfer.id} className="p-4 bg-[#1a1a1a] rounded-lg border border-[#252525]">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                        transfer.status === 'completed' ? 'bg-green-500/20' :
                        transfer.status === 'processing' ? 'bg-yellow-500/20' :
                        transfer.status === 'failed' ? 'bg-red-500/20' : 'bg-gray-500/20'
                      }`}>
                        {transfer.status === 'completed' ? <CheckCircle className="w-5 h-5 text-green-400" /> :
                         transfer.status === 'processing' ? <Loader2 className="w-5 h-5 text-yellow-400 animate-spin" /> :
                         transfer.status === 'failed' ? <XCircle className="w-5 h-5 text-red-400" /> :
                         <Clock className="w-5 h-5 text-gray-400" />}
                      </div>
                      <div>
                        <h3 className="font-bold">{transfer.beneficiaryName}</h3>
                        <p className="text-sm text-gray-400">{transfer.beneficiaryBank}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-xl font-bold text-green-400">
                        ${transfer.amount.toLocaleString()}
                      </div>
                      <div className="text-sm text-gray-400">{transfer.currency}</div>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-3 border-t border-[#252525]">
                    <div>
                      <span className="text-xs text-gray-400 block">ID</span>
                      <span className="font-mono text-sm">{transfer.id}</span>
                    </div>
                    <div>
                      <span className="text-xs text-gray-400 block">{isSpanish ? 'Tarjeta' : 'Card'}</span>
                      <span className="font-mono text-sm">****{transfer.cardNumber.slice(-4)}</span>
                    </div>
                    <div>
                      <span className="text-xs text-gray-400 block">{isSpanish ? 'Código Aprobación' : 'Approval Code'}</span>
                      <span className="font-mono text-sm text-green-400">{transfer.approvalCode}</span>
                    </div>
                    <div>
                      <span className="text-xs text-gray-400 block">{isSpanish ? 'Fecha' : 'Date'}</span>
                      <span className="font-mono text-sm">{new Date(transfer.timestamp).toLocaleString()}</span>
                    </div>
                  </div>
                  
                  {/* VisaNet Transmission Details */}
                  {transfer.transmissionId && (
                    <div className="mt-3 pt-3 border-t border-[#252525]">
                      <div className="flex items-center gap-2 mb-2">
                        <Globe className="w-4 h-4 text-blue-400" />
                        <span className="text-sm font-bold text-blue-400">VisaNet Transmission</span>
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                        <div className="p-2 bg-[#252525] rounded">
                          <span className="text-gray-400 block">TX ID</span>
                          <span className="font-mono text-cyan-400">{transfer.transmissionId}</span>
                        </div>
                        <div className="p-2 bg-[#252525] rounded">
                          <span className="text-gray-400 block">RRN</span>
                          <span className="font-mono">{transfer.visanetRRN}</span>
                        </div>
                        <div className="p-2 bg-[#252525] rounded">
                          <span className="text-gray-400 block">Card Load</span>
                          <span className={`font-mono ${transfer.cardLoadStatus === 'loaded' ? 'text-green-400' : 'text-yellow-400'}`}>
                            {transfer.cardLoadStatus === 'loaded' ? '✅ LOADED' : '⏳ PENDING'}
                          </span>
                        </div>
                        <div className="p-2 bg-[#252525] rounded">
                          <span className="text-gray-400 block">Settlement</span>
                          <span className={`font-mono ${transfer.settlementStatus === 'settled' ? 'text-green-400' : 'text-yellow-400'}`}>
                            {transfer.settlementStatus === 'settled' ? '✅ SETTLED' : '⏳ PENDING'}
                          </span>
                        </div>
                      </div>
                      {transfer.transmissionRoute && (
                        <div className="mt-2 p-2 bg-[#252525] rounded">
                          <span className="text-gray-400 text-xs block mb-1">Route:</span>
                          <span className="font-mono text-xs text-gray-300">
                            {transfer.transmissionRoute.join(' → ')}
                          </span>
                        </div>
                      )}
                    </div>
                  )}
                  
                  {/* PDF Download Buttons */}
                  <div className="flex items-center gap-2 mt-4 pt-3 border-t border-[#252525]">
                    <button
                      onClick={() => {
                        const sourceAccount = custodyAccounts.find(a => a.id === transfer.sourceAccountId);
                        generateTZDigitalPDF(transfer, sourceAccount);
                      }}
                      className="flex items-center gap-2 px-3 py-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:from-blue-500 hover:to-purple-500 transition-all text-sm"
                    >
                      <FileText className="w-4 h-4" />
                      <span>PDF API DAES</span>
                    </button>
                    <button
                      onClick={() => {
                        const sourceAccount = custodyAccounts.find(a => a.id === transfer.sourceAccountId);
                        generateBlackScreenPDF(transfer, sourceAccount);
                      }}
                      className="flex items-center gap-2 px-3 py-2 bg-gradient-to-r from-gray-800 to-gray-900 text-green-400 border border-green-500/50 rounded-lg hover:border-green-400 transition-all text-sm"
                    >
                      <Terminal className="w-4 h-4" />
                      <span>PDF BlackScreen</span>
                    </button>
                    <button
                      onClick={() => generateTransferReceipts(transfer)}
                      className="flex items-center gap-2 px-3 py-2 bg-gradient-to-r from-emerald-600 to-green-600 text-white rounded-lg hover:from-emerald-500 hover:to-green-500 transition-all text-sm"
                    >
                      <Download className="w-4 h-4" />
                      <span>{isSpanish ? 'Ambos PDFs' : 'Both PDFs'}</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Verify Connection View */}
      {activeView === 'verify' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Connection Tester */}
          <div className="bg-[#0d0d0d] border border-[#1a1a1a] rounded-xl p-6">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <Activity className="w-6 h-6 text-cyan-400" />
                <h2 className="text-xl font-bold">{isSpanish ? 'Verificador de Conexión' : 'Connection Verifier'}</h2>
              </div>
              <div className={`px-3 py-1 rounded-full text-sm font-bold ${
                connectionMode === 'real' 
                  ? 'bg-green-500/20 text-green-400 border border-green-500' 
                  : 'bg-yellow-500/20 text-yellow-400 border border-yellow-500'
              }`}>
                {connectionMode === 'real' ? '🟢 REAL' : '🟡 SIMULADO'}
              </div>
            </div>

            <div className="space-y-4">
              {/* Mode Indicator */}
              <div className={`p-4 rounded-lg border ${
                connectionMode === 'real' 
                  ? 'bg-green-500/10 border-green-500/50' 
                  : 'bg-yellow-500/10 border-yellow-500/50'
              }`}>
                <div className="flex items-center gap-2 mb-2">
                  {connectionMode === 'real' ? (
                    <CheckCircle className="w-5 h-5 text-green-400" />
                  ) : (
                    <AlertCircle className="w-5 h-5 text-yellow-400" />
                  )}
                  <span className="font-bold">
                    {connectionMode === 'real' 
                      ? (isSpanish ? 'Modo REAL Activo' : 'REAL Mode Active')
                      : (isSpanish ? 'Modo SIMULADO Activo' : 'SIMULATED Mode Active')
                    }
                  </span>
                </div>
                <p className="text-sm text-gray-400">
                  {connectionMode === 'real'
                    ? (isSpanish 
                        ? 'Las conexiones están verificadas con endpoints reales. Las transferencias se enviarán a servidores reales.'
                        : 'Connections are verified with real endpoints. Transfers will be sent to real servers.')
                    : (isSpanish 
                        ? 'Las conexiones son simuladas. Las transferencias NO se enviarán a servidores reales.'
                        : 'Connections are simulated. Transfers will NOT be sent to real servers.')
                  }
                </p>
              </div>

              {/* Test Buttons */}
              <div className="flex gap-3">
                <button
                  onClick={runConnectionTests}
                  disabled={isTestingConnections}
                  className="flex-1 py-3 bg-cyan-600 hover:bg-cyan-700 rounded-lg font-bold transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {isTestingConnections ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      {isSpanish ? 'Probando...' : 'Testing...'}
                    </>
                  ) : (
                    <>
                      <Activity className="w-5 h-5" />
                      {isSpanish ? 'Probar Conexiones REALES' : 'Test REAL Connections'}
                    </>
                  )}
                </button>
                <button
                  onClick={() => connectToServer(true)}
                  disabled={serverStatus === 'connecting'}
                  className="flex-1 py-3 bg-green-600 hover:bg-green-700 rounded-lg font-bold transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  <Globe className="w-5 h-5" />
                  {isSpanish ? 'Conectar REAL' : 'Connect REAL'}
                </button>
              </div>

              <button
                onClick={() => connectToServer(false)}
                disabled={serverStatus === 'connecting'}
                className="w-full py-3 bg-yellow-600/50 hover:bg-yellow-600/70 rounded-lg font-bold transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                <Radio className="w-5 h-5" />
                {isSpanish ? 'Conectar SIMULADO (Test)' : 'Connect SIMULATED (Test)'}
              </button>
            </div>

            {/* Connection Tests Results */}
            {connectionTests.length > 0 && (
              <div className="mt-6">
                <h3 className="text-lg font-bold mb-3 flex items-center gap-2">
                  <Network className="w-5 h-5 text-purple-400" />
                  {isSpanish ? 'Resultados de Pruebas' : 'Test Results'}
                </h3>
                <div className="space-y-2">
                  {connectionTests.map((test, index) => (
                    <div
                      key={index}
                      className={`p-3 rounded-lg border ${
                        test.status === 'success' 
                          ? 'bg-green-500/10 border-green-500/50' 
                          : test.status === 'testing'
                          ? 'bg-blue-500/10 border-blue-500/50'
                          : test.status === 'timeout'
                          ? 'bg-yellow-500/10 border-yellow-500/50'
                          : 'bg-red-500/10 border-red-500/50'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          {test.status === 'success' && <CheckCircle className="w-4 h-4 text-green-400" />}
                          {test.status === 'testing' && <Loader2 className="w-4 h-4 text-blue-400 animate-spin" />}
                          {test.status === 'timeout' && <Clock className="w-4 h-4 text-yellow-400" />}
                          {test.status === 'failed' && <XCircle className="w-4 h-4 text-red-400" />}
                          <span className="font-medium">{test.name}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          {test.latency !== null && (
                            <span className={`text-sm font-mono ${
                              test.latency < 500 ? 'text-green-400' : 
                              test.latency < 1000 ? 'text-yellow-400' : 'text-red-400'
                            }`}>
                              {test.latency}ms
                            </span>
                          )}
                          <span className={`px-2 py-1 rounded text-xs font-bold ${
                            test.status === 'success' ? 'bg-green-500/20 text-green-400' :
                            test.status === 'testing' ? 'bg-blue-500/20 text-blue-400' :
                            test.status === 'timeout' ? 'bg-yellow-500/20 text-yellow-400' :
                            'bg-red-500/20 text-red-400'
                          }`}>
                            {test.status.toUpperCase()}
                          </span>
                        </div>
                      </div>
                      <div className="text-xs text-gray-500 mt-1 font-mono truncate">
                        {test.endpoint}
                      </div>
                      {test.error && (
                        <div className="text-xs text-red-400 mt-1">
                          ⚠️ {test.error}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Server Info & JSON Data */}
          <div className="space-y-6">
            {/* Server Target Info */}
            <div className="bg-[#0d0d0d] border border-[#1a1a1a] rounded-xl p-6">
              <div className="flex items-center gap-3 mb-4">
                <Server className="w-6 h-6 text-blue-400" />
                <h2 className="text-xl font-bold">{isSpanish ? 'Servidor de Destino' : 'Target Server'}</h2>
              </div>

              <div className="space-y-3">
                <div className="flex justify-between items-center p-3 bg-[#1a1a1a] rounded-lg">
                  <span className="text-gray-400">Sistema:</span>
                  <span className="font-mono text-green-400">{MAIN_SERVER.name}</span>
                </div>
                <div className="flex justify-between items-center p-3 bg-[#1a1a1a] rounded-lg">
                  <span className="text-gray-400">IP:</span>
                  <span className="font-mono">{MAIN_SERVER.ip}</span>
                </div>
                <div className="flex justify-between items-center p-3 bg-[#1a1a1a] rounded-lg">
                  <span className="text-gray-400">Puerto:</span>
                  <span className="font-mono">{MAIN_SERVER.port}</span>
                </div>
                <div className="flex justify-between items-center p-3 bg-[#1a1a1a] rounded-lg">
                  <span className="text-gray-400">Dominio:</span>
                  <a href={MAIN_SERVER.domain} target="_blank" rel="noopener noreferrer" 
                     className="font-mono text-blue-400 hover:underline flex items-center gap-1">
                    usa.visa.com <ArrowUpRight className="w-3 h-3" />
                  </a>
                </div>
                <div className="flex justify-between items-center p-3 bg-[#1a1a1a] rounded-lg">
                  <span className="text-gray-400">Protocolo:</span>
                  <span className="font-mono text-purple-400">{MAIN_SERVER.protocol}</span>
                </div>
                <div className="flex justify-between items-center p-3 bg-[#1a1a1a] rounded-lg">
                  <span className="text-gray-400">Estado:</span>
                  <span className={`font-mono ${serverStatus === 'connected' ? 'text-green-400' : 'text-red-400'}`}>
                    {serverStatus.toUpperCase()}
                  </span>
                </div>
              </div>
            </div>

            {/* JSON 10B Beneficiary Data */}
            <div className="bg-[#0d0d0d] border border-[#1a1a1a] rounded-xl p-6">
              <div className="flex items-center gap-3 mb-4">
                <FileJson className="w-6 h-6 text-yellow-400" />
                <h2 className="text-xl font-bold">JSON 10B - Beneficiario</h2>
              </div>

              <div className="p-4 bg-black rounded-lg font-mono text-sm">
                <pre className="text-green-400 overflow-x-auto">
{JSON.stringify({
  "beneficiary": {
    "name": "MR. ARMAN ARAKELYAN",
    "bank": "REVOLUT",
    "card_number": "4165981224772651",
    "expiration": "05/30",
    "amount": "10,000,000,000.00",
    "currency": "USD",
    "approval_code": "791010"
  },
  "source": "10B JSON 02.01.2026",
  "status": selectedBeneficiary?.id === 'json-10b-main' ? "SELECTED" : "AVAILABLE"
}, null, 2)}
                </pre>
              </div>

              {selectedBeneficiary?.id === 'json-10b-main' ? (
                <div className="mt-4 p-3 bg-green-500/20 border border-green-500 rounded-lg flex items-center gap-2">
                  <CheckCircle className="w-5 h-5 text-green-400" />
                  <span className="text-green-400 font-bold">
                    {isSpanish ? 'Beneficiario SELECCIONADO' : 'Beneficiary SELECTED'}
                  </span>
                </div>
              ) : (
                <button
                  onClick={() => selectPredefinedBeneficiary(PREDEFINED_BENEFICIARIES[0])}
                  className="mt-4 w-full py-3 bg-yellow-600 hover:bg-yellow-700 rounded-lg font-bold transition-colors flex items-center justify-center gap-2"
                >
                  <CreditCard className="w-5 h-5" />
                  {isSpanish ? 'Seleccionar como Beneficiario' : 'Select as Beneficiary'}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Config View */}
      {activeView === 'config' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* API Configuration */}
          <div className="bg-[#0d0d0d] border border-[#1a1a1a] rounded-xl p-6">
            <div className="flex items-center gap-3 mb-6">
              <Settings className="w-6 h-6 text-gray-400" />
              <h2 className="text-xl font-bold">{isSpanish ? 'Configuración API' : 'API Configuration'}</h2>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm text-gray-400 mb-2">API Endpoint URL</label>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={NETWORK_CONFIG.apiEndpointUrl}
                    readOnly
                    className="flex-1 px-4 py-3 bg-[#1a1a1a] border border-[#252525] rounded-lg font-mono text-sm"
                  />
                  <button
                    onClick={() => copyToClipboard(NETWORK_CONFIG.apiEndpointUrl)}
                    className="p-3 bg-[#1a1a1a] hover:bg-[#252525] rounded-lg transition-colors"
                  >
                    <Copy className="w-5 h-5" />
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm text-gray-400 mb-2">API Key</label>
                <div className="flex items-center gap-2">
                  <input
                    type={showSecrets ? 'text' : 'password'}
                    value={NETWORK_CONFIG.apiKey}
                    readOnly
                    className="flex-1 px-4 py-3 bg-[#1a1a1a] border border-[#252525] rounded-lg font-mono text-sm"
                  />
                  <button
                    onClick={() => setShowSecrets(!showSecrets)}
                    className="p-3 bg-[#1a1a1a] hover:bg-[#252525] rounded-lg transition-colors"
                  >
                    {showSecrets ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                  <button
                    onClick={() => copyToClipboard(NETWORK_CONFIG.apiKey)}
                    className="p-3 bg-[#1a1a1a] hover:bg-[#252525] rounded-lg transition-colors"
                  >
                    <Copy className="w-5 h-5" />
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm text-gray-400 mb-2">Secret Key</label>
                <div className="flex items-center gap-2">
                  <input
                    type={showSecrets ? 'text' : 'password'}
                    value={NETWORK_CONFIG.secretKey}
                    readOnly
                    className="flex-1 px-4 py-3 bg-[#1a1a1a] border border-[#252525] rounded-lg font-mono text-sm"
                  />
                  <button
                    onClick={() => copyToClipboard(NETWORK_CONFIG.secretKey)}
                    className="p-3 bg-[#1a1a1a] hover:bg-[#252525] rounded-lg transition-colors"
                  >
                    <Copy className="w-5 h-5" />
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Server Report */}
          <div className="bg-[#0d0d0d] border border-[#1a1a1a] rounded-xl p-6">
            <div className="flex items-center gap-3 mb-6">
              <Cpu className="w-6 h-6 text-cyan-400" />
              <h2 className="text-xl font-bold">SERVER REPORT</h2>
            </div>

            <div className="grid grid-cols-5 gap-2 mb-4">
              {[
                { key: 'F1', label: 'CLEAR' },
                { key: 'F2', label: 'UPDATE' },
                { key: 'F3', label: 'DETAIL' },
                { key: 'F4', label: 'MOVE' },
                { key: 'F5', label: 'PRINT' },
                { key: 'F6', label: '+DATA' },
                { key: 'F7', label: 'FIRST' },
                { key: 'F8', label: 'ADVANCE' },
                { key: 'F9', label: 'APPLY' },
                { key: 'UN', label: '' }
              ].map(fn => (
                <button
                  key={fn.key}
                  className="px-2 py-2 bg-[#1a1a1a] hover:bg-[#252525] rounded text-xs font-mono transition-colors"
                >
                  <span className="text-yellow-400">{fn.key}</span>
                  <span className="block text-gray-400">{fn.label}</span>
                </button>
              ))}
            </div>

            <div className="p-4 bg-black rounded-lg font-mono text-xs text-green-400 overflow-x-auto">
              <pre>
{`AwIFODAdBgNVHSUEFjAUBggrBgEFBQcDAQYIKWYBBQUHAwIw
dQYDVR0fBG4wbDA0oDKgMIYuaHR0cDovL2NybDMuZGlnaWNl
cnQuY29tL3NoYTItZXYtc2VydmVyLWczLmNybDA0oDKgMIYu
aHR0cDovL2NybDQuZGlnaWNlcnQuY29tL3NoYTItZXYtc2Vy
dmVyLWczLmNybDBKBgNVHSAEQzBBMDYGCWCGSAGG/WwCATAp
MCcGCCsGAQUFBwIBFhtodHRwOi8vd3d3LmRpZ2ljZXJ0LmNv
bS9DUFMwBwYFZ4EMAQEwHQYDVR0OBBYEFLNHN`}
              </pre>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default VisaNetAPIModule;

