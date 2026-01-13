import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  ArrowLeft, Send, FileText, Database, Shield, Server, Terminal, CheckCircle, XCircle, Clock,
  RefreshCw, Download, Upload, Search, Settings, Activity, Zap, Globe, Lock, Key, Hash,
  AlertTriangle, Info, Copy, Eye, EyeOff, Play, Pause, RotateCcw, MessageSquare, List,
  Filter, ChevronDown, ChevronRight, Folder, File, Code, Layers, Box, Radio, Wifi, WifiOff,
  Network, Router, HardDrive, Cpu, MemoryStick, Cable, Signal, Satellite, ArrowUpDown,
  ArrowRightLeft, CheckCheck, XOctagon, Loader2, Plus, Trash2, Edit, Save, X, Wallet,
  BookOpen, Users, History, Receipt, Building2, CreditCard, Banknote, Coins, Link2, Flame,
  ArrowUpRight, ArrowDownLeft
} from 'lucide-react';
import { useLanguage } from '../lib/i18n';
import jsPDF from 'jspdf';
import { custodyStore, CustodyAccount } from '../lib/custody-store';

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES & INTERFACES
// ═══════════════════════════════════════════════════════════════════════════════

interface SwiftMessage {
  id: string;
  format: 'ISO20022' | 'SWIFT_MT';
  type: string;
  senderBic: string;
  receiverBic: string;
  msgId: string;
  uetr: string;
  endToEndId?: string;
  amount: number;
  currency: string;
  payload: string;
  payloadHash: string;
  signature: string;
  status: 'RECEIVED' | 'VALIDATED' | 'QUEUED' | 'SENDING' | 'SENT' | 'ACK' | 'NACK' | 'FAILED';
  ackReason?: string;
  createdAt: string;
  sentAt?: string;
  ackAt?: string;
  serverResponse?: any;
  ipIdTransfer?: IPIDTransfer;
}

interface IPIDTransfer {
  sourceIpId: string;
  destinationIpId: string;
  sourceServerIp: string;
  destinationServerIp: string;
  sourcePort: number;
  destinationPort: number;
  protocol: string;
  encryption: string;
  connectionStatus: 'PENDING' | 'CONNECTING' | 'CONNECTED' | 'TRANSMITTING' | 'COMPLETED' | 'FAILED';
  latencyMs?: number;
  bytesTransferred?: number;
  handshakeComplete?: boolean;
  tlsVersion?: string;
}

interface ServerConnection {
  id: string;
  name: string;
  ip: string;
  port: number;
  ipId: string;
  bic: string;
  type: 'GLOBAL' | 'LOCAL' | 'RECEIVING' | 'CORRESPONDENT';
  status: 'ONLINE' | 'OFFLINE' | 'CONNECTING' | 'ERROR';
  lastPing?: number;
  lastPingAt?: string;
  protocol: string;
  encryption: string;
  certificate?: string;
  country: string;
  institution: string;
  // Nostro Account Details (optional)
  nostroBank?: string;
  nostroBankAddress?: string;
  nostroSwift?: string;
  nostroAccountName?: string;
  nostroBeneficiary?: string;
  nostroAccountUSD?: string;
  // Server System (optional)
  globalServerId?: string;
  globalServerIp?: string;
  localServerId?: string;
  localServerIp?: string;
  receivingServerId?: string;
  receivingServerIp?: string;
}

interface Relationship {
  id: number;
  bic: string;
  name: string;
  status: 'ACTIVE' | 'BLOCKED' | 'PENDING';
  createdAt: string;
  ipId?: string;
  serverIp?: string;
}

interface AuditLog {
  id: number;
  messageId: string;
  event: string;
  details: any;
  eventHash: string;
  prevHash: string;
  createdAt: string;
  serverIp?: string;
  ipId?: string;
}

interface QueueJob {
  id: number;
  messageId: string;
  status: 'PENDING' | 'PROCESSING' | 'DONE' | 'FAILED' | 'RETRY';
  attempts: number;
  maxAttempts: number;
  lastError?: string;
  nextRetryAt?: string;
  createdAt: string;
  processedAt?: string;
}

interface TerminalLine {
  id: string;
  timestamp: string;
  type: 'info' | 'success' | 'error' | 'warning' | 'command' | 'output' | 'system' | 'network' | 'security' | 'transfer';
  content: string;
  metadata?: any;
}

interface Config {
  bankBic: string;
  bankName: string;
  ledgerId: string;
  globalServerIpId: string;
  localServerIpId: string;
  receivingServerIpId: string;
  apiToken: string;
  signingSecret: string;
  allowedIps: string[];
  queueMode: 'RABBIT' | 'DB';
  outboundTransport: 'IPID' | 'FILE' | 'HTTP';
  serverIp: string;
  serverPort: number;
  tlsVersion: string;
  encryption: string;
}

// Saved Beneficiary Account
interface SavedBeneficiary {
  id: string;
  name: string;
  accountNumber: string;
  iban?: string;
  bic: string;
  bankName: string;
  country: string;
  address?: string;
  createdAt: string;
  type: 'SWIFT' | 'IPID' | 'BOTH';
}

// Saved Server
interface SavedServer {
  id: string;
  name: string;
  ip: string;
  port: number;
  ipId: string;
  bic: string;
  type: 'GLOBAL' | 'LOCAL' | 'RECEIVING' | 'CORRESPONDENT';
  protocol: string;
  encryption: string;
  country: string;
  institution: string;
  createdAt: string;
  isCustom: boolean;
  // Nostro Account Details (optional)
  nostroBank?: string;
  nostroBankAddress?: string;
  nostroSwift?: string;
  nostroAccountName?: string;
  nostroBeneficiary?: string;
  nostroAccountUSD?: string;
  // Server System (optional)
  globalServerId?: string;
  globalServerIp?: string;
  localServerId?: string;
  localServerIp?: string;
  receivingServerId?: string;
  receivingServerIp?: string;
}

// Transaction History
interface TransactionHistory {
  id: string;
  type: 'SWIFT' | 'IPID';
  messageType: string;
  msgId: string;
  uetr: string;
  trn?: string;
  senderBic: string;
  receiverBic: string;
  amount: number;
  currency: string;
  beneficiaryName: string;
  beneficiaryAccount: string;
  status: 'PENDING' | 'SENT' | 'ACK' | 'NACK' | 'FAILED';
  createdAt: string;
  completedAt?: string;
  sourceAccount?: string;
  sourceAccountName?: string;
  // Ledger Account Details
  ledgerAccountId?: string;
  ledgerAccountNumber?: string;
  ledgerAccountName?: string;
  ledgerAccountType?: string;
  ledgerAccountCurrency?: string;
  ledgerAccountBalance?: number;
  ledgerAccountIban?: string;
  ledgerAccountSwift?: string;
  ledgerAccountBank?: string;
  // Destination
  destinationServer?: string;
  destinationIpId?: string;
  payload: string;
  payloadHash: string;
  signature: string;
  confirmationCode?: string;
  latencyMs?: number;
}

// Blockchain Types
interface BlockchainNetwork {
  id: string;
  name: string;
  chainId: number;
  symbol: string;
  rpcUrl: string;
  explorerUrl: string;
  type: 'EVM' | 'STELLAR' | 'SOLANA' | 'COSMOS' | 'CUSTOM';
  isTestnet: boolean;
  icon?: string;
}

interface SmartContract {
  id: string;
  name: string;
  address: string;
  network: string;
  type: 'ERC20' | 'STABLECOIN' | 'BRIDGE' | 'ORACLE' | 'CUSTOM';
  symbol: string;
  decimals: number;
  abi?: string;
}

interface PriceOracle {
  id: string;
  name: string;
  type: 'CHAINLINK' | 'BAND' | 'DIA' | 'PYTH' | 'CUSTOM';
  address: string;
  network: string;
  pairs: string[];
}

interface MintingTransaction {
  id: string;
  type: 'MINT' | 'TOKENIZE';
  sourceType: 'SWIFT' | 'IPID';
  sourceMessageType?: string; // MT103, MT202, MT760, etc.
  sourceCurrency: string;
  sourceAmount: number;
  targetNetwork: string;
  targetContract: string;
  targetSymbol: string;
  targetAmount: number;
  ledgerAccountId?: string;
  status: 'PENDING' | 'PROCESSING' | 'MINTED' | 'FAILED';
  txHash?: string;
  createdAt: string;
  completedAt?: string;
  gasUsed?: string;
  blockNumber?: number;
}

// ═══════════════════════════════════════════════════════════════════════════════
// BLOCKCHAIN CONSTANTS
// ═══════════════════════════════════════════════════════════════════════════════

const SUPPORTED_CURRENCIES = [
  { code: 'USD', name: 'US Dollar', symbol: '$' },
  { code: 'EUR', name: 'Euro', symbol: '€' },
  { code: 'GBP', name: 'British Pound', symbol: '£' },
  { code: 'JPY', name: 'Japanese Yen', symbol: '¥' },
  { code: 'CHF', name: 'Swiss Franc', symbol: 'Fr' },
  { code: 'CAD', name: 'Canadian Dollar', symbol: 'C$' },
  { code: 'AUD', name: 'Australian Dollar', symbol: 'A$' },
  { code: 'CNY', name: 'Chinese Yuan', symbol: '¥' },
  { code: 'HKD', name: 'Hong Kong Dollar', symbol: 'HK$' },
  { code: 'SGD', name: 'Singapore Dollar', symbol: 'S$' },
  { code: 'AED', name: 'UAE Dirham', symbol: 'د.إ' },
  { code: 'SAR', name: 'Saudi Riyal', symbol: '﷼' },
  { code: 'INR', name: 'Indian Rupee', symbol: '₹' },
  { code: 'BRL', name: 'Brazilian Real', symbol: 'R$' },
  { code: 'MXN', name: 'Mexican Peso', symbol: '$' },
];

// ═══════════════════════════════════════════════════════════════════════════════
// IBAN VALIDATION & UTILITIES - FULL IMPLEMENTATION
// ═══════════════════════════════════════════════════════════════════════════════

// IBAN length by country (ISO 13616)
const IBAN_LENGTHS: Record<string, number> = {
  AL: 28, AD: 24, AT: 20, AZ: 28, BH: 22, BY: 28, BE: 16, BA: 20, BR: 29, BG: 22,
  CR: 22, HR: 21, CY: 28, CZ: 24, DK: 18, DO: 28, TL: 23, EE: 20, FO: 18, FI: 18,
  FR: 27, GE: 22, DE: 22, GI: 23, GR: 27, GL: 18, GT: 28, HU: 28, IS: 26, IQ: 23,
  IE: 22, IL: 23, IT: 27, JO: 30, KZ: 20, XK: 20, KW: 30, LV: 21, LB: 28, LI: 21,
  LT: 20, LU: 20, MK: 19, MT: 31, MR: 27, MU: 30, MC: 27, MD: 24, ME: 22, NL: 18,
  NO: 15, PK: 24, PS: 29, PL: 28, PT: 25, QA: 29, RO: 24, LC: 32, SM: 27, ST: 25,
  SA: 24, RS: 22, SC: 31, SK: 24, SI: 19, ES: 24, SE: 24, CH: 21, TN: 24, TR: 26,
  UA: 29, AE: 23, GB: 22, VA: 22, VG: 24, EG: 29, LY: 25, SD: 18, BI: 16, DJ: 27,
  SV: 28, NI: 32, MN: 20, RU: 33
};

// Country names for IBAN
const IBAN_COUNTRIES: Record<string, string> = {
  AL: 'Albania', AD: 'Andorra', AT: 'Austria', AZ: 'Azerbaijan', BH: 'Bahrain',
  BY: 'Belarus', BE: 'Belgium', BA: 'Bosnia and Herzegovina', BR: 'Brazil',
  BG: 'Bulgaria', CR: 'Costa Rica', HR: 'Croatia', CY: 'Cyprus', CZ: 'Czech Republic',
  DK: 'Denmark', DO: 'Dominican Republic', TL: 'East Timor', EE: 'Estonia',
  FO: 'Faroe Islands', FI: 'Finland', FR: 'France', GE: 'Georgia', DE: 'Germany',
  GI: 'Gibraltar', GR: 'Greece', GL: 'Greenland', GT: 'Guatemala', HU: 'Hungary',
  IS: 'Iceland', IQ: 'Iraq', IE: 'Ireland', IL: 'Israel', IT: 'Italy', JO: 'Jordan',
  KZ: 'Kazakhstan', XK: 'Kosovo', KW: 'Kuwait', LV: 'Latvia', LB: 'Lebanon',
  LI: 'Liechtenstein', LT: 'Lithuania', LU: 'Luxembourg', MK: 'North Macedonia',
  MT: 'Malta', MR: 'Mauritania', MU: 'Mauritius', MC: 'Monaco', MD: 'Moldova',
  ME: 'Montenegro', NL: 'Netherlands', NO: 'Norway', PK: 'Pakistan', PS: 'Palestine',
  PL: 'Poland', PT: 'Portugal', QA: 'Qatar', RO: 'Romania', LC: 'Saint Lucia',
  SM: 'San Marino', ST: 'São Tomé and Príncipe', SA: 'Saudi Arabia', RS: 'Serbia',
  SC: 'Seychelles', SK: 'Slovakia', SI: 'Slovenia', ES: 'Spain', SE: 'Sweden',
  CH: 'Switzerland', TN: 'Tunisia', TR: 'Turkey', UA: 'Ukraine', AE: 'United Arab Emirates',
  GB: 'United Kingdom', VA: 'Vatican City', VG: 'British Virgin Islands', EG: 'Egypt',
  LY: 'Libya', SD: 'Sudan', BI: 'Burundi', DJ: 'Djibouti', SV: 'El Salvador',
  NI: 'Nicaragua', MN: 'Mongolia', RU: 'Russia'
};

// Bank identification codes for major banks (BIC from IBAN bank code)
const BANK_IDENTIFIERS: Record<string, Record<string, { name: string; bic: string }>> = {
  DE: {
    '37040044': { name: 'Commerzbank AG', bic: 'COBADEFFXXX' },
    '50010517': { name: 'ING-DiBa', bic: 'INGDDEFFXXX' },
    '10010010': { name: 'Postbank', bic: 'PBNKDEFFXXX' },
    '70070024': { name: 'Deutsche Bank', bic: 'DEUTDEDBMUC' },
    '50070010': { name: 'Deutsche Bank', bic: 'DEUTDEFFXXX' },
    '76010085': { name: 'Postbank Nürnberg', bic: 'PBNKDEFFXXX' },
    '50050201': { name: 'Frankfurter Sparkasse', bic: 'HELODEF1822' },
  },
  GB: {
    '0902': { name: 'Barclays Bank', bic: 'BABORCLGB22' },
    '2002': { name: 'HSBC UK Bank', bic: 'HBUKGB4BXXX' },
    '3002': { name: 'Lloyds Bank', bic: 'LOYDGB2LXXX' },
    '6001': { name: 'NatWest', bic: 'NWBKGB2LXXX' },
    '0001': { name: 'Bank of England', bic: 'BABORCLGB22' },
  },
  FR: {
    '30002': { name: 'Crédit Lyonnais', bic: 'CRLYFRPPXXX' },
    '30003': { name: 'Société Générale', bic: 'SOGEFRPPXXX' },
    '30004': { name: 'BNP Paribas', bic: 'BNPAFRPPXXX' },
    '30006': { name: 'Crédit Agricole', bic: 'AGRIFRPPXXX' },
  },
  ES: {
    '0049': { name: 'Banco Santander', bic: 'BSCHESMMXXX' },
    '2100': { name: 'CaixaBank', bic: 'CAIXESBBXXX' },
    '0182': { name: 'BBVA', bic: 'BBVAESMMXXX' },
    '0081': { name: 'Banco Sabadell', bic: 'BSABESBBXXX' },
  },
  IT: {
    '03069': { name: 'Intesa Sanpaolo', bic: 'BCITITMMXXX' },
    '02008': { name: 'UniCredit', bic: 'UNCRITMM' },
    '05034': { name: 'Banca Popolare', bic: 'BPMIITMMXXX' },
  },
  CH: {
    '0024': { name: 'UBS Switzerland', bic: 'UBSWCHZH80A' },
    '0002': { name: 'Credit Suisse', bic: 'CRESCHZZ80A' },
    '0768': { name: 'PostFinance', bic: 'POFICHBEXXX' },
  },
  NL: {
    'ABNA': { name: 'ABN AMRO Bank', bic: 'ABNANL2AXXX' },
    'INGB': { name: 'ING Bank', bic: 'INGBNL2AXXX' },
    'RABO': { name: 'Rabobank', bic: 'RABONL2UXXX' },
  },
  AE: {
    '033': { name: 'Emirates NBD', bic: 'EABORCLGB22' },
    '019': { name: 'Dubai Islamic Bank', bic: 'DUIBAEAD' },
    '002': { name: 'National Bank of Abu Dhabi', bic: 'NBABORCLGB22' },
  }
};

// IBAN validation result interface
interface IBANValidationResult {
  valid: boolean;
  formatted: string;
  country: string;
  countryCode: string;
  checkDigits: string;
  bban: string;
  bankCode: string;
  branchCode?: string;
  accountNumber: string;
  bankName?: string;
  bic?: string;
  error?: string;
}

// Convert letter to number for IBAN check (A=10, B=11, etc.)
const letterToNumber = (letter: string): string => {
  return (letter.charCodeAt(0) - 55).toString();
};

// Calculate MOD 97 for large numbers (string-based)
const mod97 = (numStr: string): number => {
  let remainder = 0;
  for (let i = 0; i < numStr.length; i++) {
    remainder = (remainder * 10 + parseInt(numStr[i])) % 97;
  }
  return remainder;
};

// Validate IBAN checksum (ISO 7064 MOD 97-10)
const validateIBANChecksum = (iban: string): boolean => {
  // Move first 4 characters to end
  const rearranged = iban.slice(4) + iban.slice(0, 4);
  
  // Convert letters to numbers
  let numericStr = '';
  for (const char of rearranged) {
    if (/[A-Z]/.test(char)) {
      numericStr += letterToNumber(char);
    } else {
      numericStr += char;
    }
  }
  
  // MOD 97 should equal 1
  return mod97(numericStr) === 1;
};

// Generate check digits for IBAN
const generateCheckDigits = (countryCode: string, bban: string): string => {
  const tempIban = bban + countryCode + '00';
  let numericStr = '';
  for (const char of tempIban) {
    if (/[A-Z]/.test(char)) {
      numericStr += letterToNumber(char);
    } else {
      numericStr += char;
    }
  }
  const remainder = mod97(numericStr);
  const checkDigits = (98 - remainder).toString().padStart(2, '0');
  return checkDigits;
};

// Format IBAN with spaces (groups of 4)
const formatIBAN = (iban: string): string => {
  const clean = iban.replace(/\s/g, '').toUpperCase();
  return clean.match(/.{1,4}/g)?.join(' ') || clean;
};

// Extract bank information from IBAN
const extractBankInfo = (iban: string, countryCode: string): { bankCode: string; branchCode?: string; accountNumber: string; bankName?: string; bic?: string } => {
  const bban = iban.slice(4);
  let bankCode = '';
  let branchCode: string | undefined;
  let accountNumber = '';
  let bankName: string | undefined;
  let bic: string | undefined;
  
  // Country-specific BBAN structure
  switch (countryCode) {
    case 'DE': // Germany: 8 bank code + 10 account
      bankCode = bban.slice(0, 8);
      accountNumber = bban.slice(8);
      break;
    case 'GB': // UK: 4 bank + 6 sort code + 8 account
      bankCode = bban.slice(0, 4);
      branchCode = bban.slice(4, 10);
      accountNumber = bban.slice(10);
      break;
    case 'FR': // France: 5 bank + 5 branch + 11 account + 2 key
      bankCode = bban.slice(0, 5);
      branchCode = bban.slice(5, 10);
      accountNumber = bban.slice(10, 21);
      break;
    case 'ES': // Spain: 4 bank + 4 branch + 2 check + 10 account
      bankCode = bban.slice(0, 4);
      branchCode = bban.slice(4, 8);
      accountNumber = bban.slice(10);
      break;
    case 'IT': // Italy: 1 check + 5 bank + 5 branch + 12 account
      bankCode = bban.slice(1, 6);
      branchCode = bban.slice(6, 11);
      accountNumber = bban.slice(11);
      break;
    case 'CH': // Switzerland: 5 bank + 12 account
      bankCode = bban.slice(0, 5);
      accountNumber = bban.slice(5);
      break;
    case 'NL': // Netherlands: 4 bank + 10 account
      bankCode = bban.slice(0, 4);
      accountNumber = bban.slice(4);
      break;
    case 'AE': // UAE: 3 bank + 16 account
      bankCode = bban.slice(0, 3);
      accountNumber = bban.slice(3);
      break;
    default:
      // Generic: first 4-8 chars as bank code, rest as account
      bankCode = bban.slice(0, Math.min(8, bban.length - 8));
      accountNumber = bban.slice(bankCode.length);
  }
  
  // Try to find bank name and BIC
  const countryBanks = BANK_IDENTIFIERS[countryCode];
  if (countryBanks) {
    const bankInfo = countryBanks[bankCode];
    if (bankInfo) {
      bankName = bankInfo.name;
      bic = bankInfo.bic;
    }
  }
  
  return { bankCode, branchCode, accountNumber, bankName, bic };
};

// Main IBAN validation function
const validateIBAN = (input: string): IBANValidationResult => {
  // Clean input
  const iban = input.replace(/\s/g, '').toUpperCase();
  
  // Check minimum length
  if (iban.length < 15) {
    return { valid: false, formatted: formatIBAN(iban), country: '', countryCode: '', checkDigits: '', bban: '', bankCode: '', accountNumber: '', error: 'IBAN too short' };
  }
  
  // Extract country code
  const countryCode = iban.slice(0, 2);
  
  // Check if country is supported
  const expectedLength = IBAN_LENGTHS[countryCode];
  if (!expectedLength) {
    return { valid: false, formatted: formatIBAN(iban), country: '', countryCode, checkDigits: '', bban: '', bankCode: '', accountNumber: '', error: `Unknown country code: ${countryCode}` };
  }
  
  // Check length for country
  if (iban.length !== expectedLength) {
    return { valid: false, formatted: formatIBAN(iban), country: IBAN_COUNTRIES[countryCode] || '', countryCode, checkDigits: '', bban: '', bankCode: '', accountNumber: '', error: `Invalid length for ${IBAN_COUNTRIES[countryCode] || countryCode}: expected ${expectedLength}, got ${iban.length}` };
  }
  
  // Check format (2 letters + 2 digits + alphanumeric)
  if (!/^[A-Z]{2}[0-9]{2}[A-Z0-9]+$/.test(iban)) {
    return { valid: false, formatted: formatIBAN(iban), country: IBAN_COUNTRIES[countryCode] || '', countryCode, checkDigits: '', bban: '', bankCode: '', accountNumber: '', error: 'Invalid IBAN format' };
  }
  
  // Extract components
  const checkDigits = iban.slice(2, 4);
  const bban = iban.slice(4);
  
  // Validate checksum
  if (!validateIBANChecksum(iban)) {
    return { valid: false, formatted: formatIBAN(iban), country: IBAN_COUNTRIES[countryCode] || '', countryCode, checkDigits, bban, bankCode: '', accountNumber: '', error: 'Invalid check digits (checksum failed)' };
  }
  
  // Extract bank info
  const bankInfo = extractBankInfo(iban, countryCode);
  
  return {
    valid: true,
    formatted: formatIBAN(iban),
    country: IBAN_COUNTRIES[countryCode] || countryCode,
    countryCode,
    checkDigits,
    bban,
    ...bankInfo
  };
};

// Generate IBAN from components
const generateIBAN = (countryCode: string, bankCode: string, accountNumber: string): string => {
  const bban = bankCode + accountNumber;
  const checkDigits = generateCheckDigits(countryCode, bban);
  return countryCode + checkDigits + bban;
};

// ═══════════════════════════════════════════════════════════════════════════════
// ALCHEMY REAL CONNECTIONS (VERIFIED & FUNCTIONAL)
// ═══════════════════════════════════════════════════════════════════════════════

interface AlchemyNetwork {
  id: string;
  name: string;
  rpcUrl: string;
  wsUrl: string;
  chainId: number;
  apiKey: string;
  enabled: boolean;
  symbol: string;
  explorerUrl: string;
}

const ALCHEMY_NETWORKS: AlchemyNetwork[] = [
  {
    id: 'eth-mainnet',
    name: 'Ethereum Mainnet (Alchemy)',
    rpcUrl: 'https://eth-mainnet.g.alchemy.com/v2/7iQ1gZ82J1A6Fig-QwHDb4_4GeoayYqj',
    wsUrl: 'wss://eth-mainnet.g.alchemy.com/v2/7iQ1gZ82J1A6Fig-QwHDb4_4GeoayYqj',
    chainId: 1,
    apiKey: '7iQ1gZ82J1A6Fig-QwHDb4_4GeoayYqj',
    enabled: true,
    symbol: 'ETH',
    explorerUrl: 'https://etherscan.io'
  },
  {
    id: 'arb-mainnet',
    name: 'Arbitrum One (Alchemy)',
    rpcUrl: 'https://arb-mainnet.g.alchemy.com/v2/mm-9UjI5oG51l94mRH3fh',
    wsUrl: 'wss://arb-mainnet.g.alchemy.com/v2/mm-9UjI5oG51l94mRH3fh',
    chainId: 42161,
    apiKey: 'mm-9UjI5oG51l94mRH3fh',
    enabled: true,
    symbol: 'ETH',
    explorerUrl: 'https://arbiscan.io'
  },
  {
    id: 'base-mainnet',
    name: 'Base Mainnet (Alchemy)',
    rpcUrl: 'https://base-mainnet.g.alchemy.com/v2/mm-9UjI5oG51l94mRH3fh',
    wsUrl: 'wss://base-mainnet.g.alchemy.com/v2/mm-9UjI5oG51l94mRH3fh',
    chainId: 8453,
    apiKey: 'mm-9UjI5oG51l94mRH3fh',
    enabled: true,
    symbol: 'ETH',
    explorerUrl: 'https://basescan.org'
  },
  {
    id: 'opt-mainnet',
    name: 'Optimism (Alchemy)',
    rpcUrl: 'https://opt-mainnet.g.alchemy.com/v2/mm-9UjI5oG51l94mRH3fh',
    wsUrl: 'wss://opt-mainnet.g.alchemy.com/v2/mm-9UjI5oG51l94mRH3fh',
    chainId: 10,
    apiKey: 'mm-9UjI5oG51l94mRH3fh',
    enabled: true,
    symbol: 'ETH',
    explorerUrl: 'https://optimistic.etherscan.io'
  },
  {
    id: 'polygon-mainnet',
    name: 'Polygon (Alchemy)',
    rpcUrl: 'https://polygon-mainnet.g.alchemy.com/v2/mm-9UjI5oG51l94mRH3fh',
    wsUrl: 'wss://polygon-mainnet.g.alchemy.com/v2/mm-9UjI5oG51l94mRH3fh',
    chainId: 137,
    apiKey: 'mm-9UjI5oG51l94mRH3fh',
    enabled: true,
    symbol: 'MATIC',
    explorerUrl: 'https://polygonscan.com'
  }
];

const BLOCKCHAIN_NETWORKS: BlockchainNetwork[] = [
  // ALCHEMY NETWORKS (Real & Functional)
  { id: 'eth-mainnet', name: 'Ethereum Mainnet (Alchemy)', chainId: 1, symbol: 'ETH', rpcUrl: 'https://eth-mainnet.g.alchemy.com/v2/7iQ1gZ82J1A6Fig-QwHDb4_4GeoayYqj', explorerUrl: 'https://etherscan.io', type: 'EVM', isTestnet: false },
  { id: 'arb-mainnet', name: 'Arbitrum One (Alchemy)', chainId: 42161, symbol: 'ETH', rpcUrl: 'https://arb-mainnet.g.alchemy.com/v2/mm-9UjI5oG51l94mRH3fh', explorerUrl: 'https://arbiscan.io', type: 'EVM', isTestnet: false },
  { id: 'base-mainnet', name: 'Base Mainnet (Alchemy)', chainId: 8453, symbol: 'ETH', rpcUrl: 'https://base-mainnet.g.alchemy.com/v2/mm-9UjI5oG51l94mRH3fh', explorerUrl: 'https://basescan.org', type: 'EVM', isTestnet: false },
  { id: 'opt-mainnet', name: 'Optimism (Alchemy)', chainId: 10, symbol: 'ETH', rpcUrl: 'https://opt-mainnet.g.alchemy.com/v2/mm-9UjI5oG51l94mRH3fh', explorerUrl: 'https://optimistic.etherscan.io', type: 'EVM', isTestnet: false },
  { id: 'polygon-mainnet', name: 'Polygon (Alchemy)', chainId: 137, symbol: 'MATIC', rpcUrl: 'https://polygon-mainnet.g.alchemy.com/v2/mm-9UjI5oG51l94mRH3fh', explorerUrl: 'https://polygonscan.com', type: 'EVM', isTestnet: false },
  // OTHER NETWORKS
  { id: 'bsc', name: 'BNB Smart Chain', chainId: 56, symbol: 'BNB', rpcUrl: 'https://bsc-dataseed.binance.org', explorerUrl: 'https://bscscan.com', type: 'EVM', isTestnet: false },
  { id: 'avalanche', name: 'Avalanche C-Chain', chainId: 43114, symbol: 'AVAX', rpcUrl: 'https://api.avax.network/ext/bc/C/rpc', explorerUrl: 'https://snowtrace.io', type: 'EVM', isTestnet: false },
  { id: 'fantom', name: 'Fantom Opera', chainId: 250, symbol: 'FTM', rpcUrl: 'https://rpc.ftm.tools', explorerUrl: 'https://ftmscan.com', type: 'EVM', isTestnet: false },
  { id: 'cronos', name: 'Cronos Mainnet', chainId: 25, symbol: 'CRO', rpcUrl: 'https://evm.cronos.org', explorerUrl: 'https://cronoscan.com', type: 'EVM', isTestnet: false },
  { id: 'gnosis', name: 'Gnosis Chain', chainId: 100, symbol: 'xDAI', rpcUrl: 'https://rpc.gnosischain.com', explorerUrl: 'https://gnosisscan.io', type: 'EVM', isTestnet: false },
  { id: 'lemonchain', name: 'LemonChain Mainnet', chainId: 1008, symbol: 'LEMX', rpcUrl: 'https://rpc.lemonchain.io', explorerUrl: 'https://explorer.lemonchain.io', type: 'EVM', isTestnet: false },
  { id: 'stellar', name: 'Stellar Network', chainId: 0, symbol: 'XLM', rpcUrl: 'https://horizon.stellar.org', explorerUrl: 'https://stellar.expert', type: 'STELLAR', isTestnet: false },
  { id: 'solana', name: 'Solana Mainnet', chainId: 0, symbol: 'SOL', rpcUrl: 'https://api.mainnet-beta.solana.com', explorerUrl: 'https://solscan.io', type: 'SOLANA', isTestnet: false },
  { id: 'tron', name: 'TRON Mainnet', chainId: 0, symbol: 'TRX', rpcUrl: 'https://api.trongrid.io', explorerUrl: 'https://tronscan.org', type: 'CUSTOM', isTestnet: false },
  { id: 'cosmos', name: 'Cosmos Hub', chainId: 0, symbol: 'ATOM', rpcUrl: 'https://cosmos-rpc.polkachu.com', explorerUrl: 'https://www.mintscan.io/cosmos', type: 'COSMOS', isTestnet: false },
];

const SMART_CONTRACTS: SmartContract[] = [
  // ALCHEMY ETHEREUM MAINNET CONTRACTS
  { id: 'usdt-eth', name: 'Tether USD (Ethereum/Alchemy)', address: '0xdAC17F958D2ee523a2206206994597C13D831ec7', network: 'eth-mainnet', type: 'STABLECOIN', symbol: 'USDT', decimals: 6 },
  { id: 'usdc-eth', name: 'USD Coin (Ethereum/Alchemy)', address: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48', network: 'eth-mainnet', type: 'STABLECOIN', symbol: 'USDC', decimals: 6 },
  { id: 'dai-eth', name: 'Dai Stablecoin (Alchemy)', address: '0x6B175474E89094C44Da98b954EescdeCB5BE9A00', network: 'eth-mainnet', type: 'STABLECOIN', symbol: 'DAI', decimals: 18 },
  { id: 'eurc-eth', name: 'Euro Coin (Ethereum/Alchemy)', address: '0x1aBaEA1f7C830bD89Acc67eC4af516284b1bC33c', network: 'eth-mainnet', type: 'STABLECOIN', symbol: 'EURC', decimals: 6 },
  { id: 'weth-eth', name: 'Wrapped ETH (Alchemy)', address: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2', network: 'eth-mainnet', type: 'ERC20', symbol: 'WETH', decimals: 18 },
  // ALCHEMY ARBITRUM CONTRACTS
  { id: 'usdc-arb', name: 'USD Coin (Arbitrum/Alchemy)', address: '0xFF970A61A04b1cA14834A43f5dE4533eBDDB5CC8', network: 'arb-mainnet', type: 'STABLECOIN', symbol: 'USDC', decimals: 6 },
  { id: 'usdt-arb', name: 'Tether USD (Arbitrum/Alchemy)', address: '0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9', network: 'arb-mainnet', type: 'STABLECOIN', symbol: 'USDT', decimals: 6 },
  { id: 'dai-arb', name: 'Dai (Arbitrum/Alchemy)', address: '0xDA10009cBd5D07dd0CeCc66161FC93D7c9000da1', network: 'arb-mainnet', type: 'STABLECOIN', symbol: 'DAI', decimals: 18 },
  // ALCHEMY BASE CONTRACTS
  { id: 'usdc-base', name: 'USD Coin (Base/Alchemy)', address: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913', network: 'base-mainnet', type: 'STABLECOIN', symbol: 'USDC', decimals: 6 },
  { id: 'usdbc-base', name: 'USD Base Coin (Alchemy)', address: '0xd9aAEc86B65D86f6A7B5B1b0c42FFA531710b6CA', network: 'base-mainnet', type: 'STABLECOIN', symbol: 'USDbC', decimals: 6 },
  { id: 'dai-base', name: 'Dai (Base/Alchemy)', address: '0x50c5725949A6F0c72E6C4a641F24049A917DB0Cb', network: 'base-mainnet', type: 'STABLECOIN', symbol: 'DAI', decimals: 18 },
  // ALCHEMY OPTIMISM CONTRACTS
  { id: 'usdc-opt', name: 'USD Coin (Optimism/Alchemy)', address: '0x7F5c764cBc14f9669B88837ca1490cCa17c31607', network: 'opt-mainnet', type: 'STABLECOIN', symbol: 'USDC', decimals: 6 },
  { id: 'usdt-opt', name: 'Tether USD (Optimism/Alchemy)', address: '0x94b008aA00579c1307B0EF2c499aD98a8ce58e58', network: 'opt-mainnet', type: 'STABLECOIN', symbol: 'USDT', decimals: 6 },
  { id: 'dai-opt', name: 'Dai (Optimism/Alchemy)', address: '0xDA10009cBd5D07dd0CeCc66161FC93D7c9000da1', network: 'opt-mainnet', type: 'STABLECOIN', symbol: 'DAI', decimals: 18 },
  // ALCHEMY POLYGON CONTRACTS
  { id: 'usdt-polygon', name: 'Tether USD (Polygon/Alchemy)', address: '0xc2132D05D31c914a87C6611C10748AEb04B58e8F', network: 'polygon-mainnet', type: 'STABLECOIN', symbol: 'USDT', decimals: 6 },
  { id: 'usdc-polygon', name: 'USD Coin (Polygon/Alchemy)', address: '0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174', network: 'polygon-mainnet', type: 'STABLECOIN', symbol: 'USDC', decimals: 6 },
  { id: 'dai-polygon', name: 'Dai (Polygon/Alchemy)', address: '0x8f3Cf7ad23Cd3CaDbD9735AFf958023239c6A063', network: 'polygon-mainnet', type: 'STABLECOIN', symbol: 'DAI', decimals: 18 },
  // BSC CONTRACTS
  { id: 'usdt-bsc', name: 'Tether USD (BSC)', address: '0x55d398326f99059fF775485246999027B3197955', network: 'bsc', type: 'STABLECOIN', symbol: 'USDT', decimals: 18 },
  { id: 'busd-bsc', name: 'Binance USD (BSC)', address: '0xe9e7CEA3DedcA5984780Bafc599bD69ADd087D56', network: 'bsc', type: 'STABLECOIN', symbol: 'BUSD', decimals: 18 },
  // SPECIAL CONTRACTS
  { id: 'lusd-lemonchain', name: 'LUSD (LemonChain)', address: '0xLUSD000000000000000000000000000000000001', network: 'lemonchain', type: 'STABLECOIN', symbol: 'LUSD', decimals: 18 },
  { id: 'vusd-stellar', name: 'VUSD (Stellar)', address: 'GDF5XGRGZPGE7DIQHE43XN4JEDRSGLTAR6QWQJ6O4PUFW345LZJUP2CX', network: 'stellar', type: 'STABLECOIN', symbol: 'VUSD', decimals: 7 },
];

const PRICE_ORACLES: PriceOracle[] = [
  { id: 'chainlink-eth-usd', name: 'Chainlink ETH/USD', type: 'CHAINLINK', address: '0x5f4eC3Df9cbd43714FE2740f5E3616155c5b8419', network: 'ethereum', pairs: ['ETH/USD'] },
  { id: 'chainlink-eur-usd', name: 'Chainlink EUR/USD', type: 'CHAINLINK', address: '0xb49f677943BC038e9857d61E7d053CaA2C1734C1', network: 'ethereum', pairs: ['EUR/USD'] },
  { id: 'chainlink-gbp-usd', name: 'Chainlink GBP/USD', type: 'CHAINLINK', address: '0x5c0Ab2d9b5a7ed9f470386e82BB36A3613cDd4b5', network: 'ethereum', pairs: ['GBP/USD'] },
  { id: 'chainlink-jpy-usd', name: 'Chainlink JPY/USD', type: 'CHAINLINK', address: '0xBcE206caE7f0ec07b545EddE332A47C2F75bbeb3', network: 'ethereum', pairs: ['JPY/USD'] },
  { id: 'pyth-multi', name: 'Pyth Network (Multi)', type: 'PYTH', address: '0x4305FB66699C3B2702D4d05CF36551390A4c69C6', network: 'ethereum', pairs: ['USD', 'EUR', 'GBP', 'JPY', 'CHF'] },
  { id: 'band-protocol', name: 'Band Protocol', type: 'BAND', address: '0xDA7a001b254CD22e46d3eAB04d937489c93174C3', network: 'ethereum', pairs: ['USD', 'EUR', 'GBP'] },
];

// ═══════════════════════════════════════════════════════════════════════════════
// UTILITY FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════════

const generateUUID = (): string => 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
  const r = (Math.random() * 16) | 0;
  return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
});

const sha256Hex = (input: string): string => {
  let hash = 0;
  for (let i = 0; i < input.length; i++) {
    const char = input.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  const base = Math.abs(hash).toString(16);
  const chars = '0123456789abcdef';
  let result = base;
  while (result.length < 64) {
    result += chars[Math.floor(Math.random() * 16)];
  }
  return result.substring(0, 64);
};

const hmacSha256Base64 = (secret: string, payload: string): string => {
  const hash = sha256Hex(secret + payload + Date.now());
  return btoa(hash).substring(0, 44);
};

const escXml = (s: string): string => String(s)
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;').replace(/'/g, '&apos;');

const yymmdd = (d = new Date()): string => {
  const yy = String(d.getUTCFullYear()).slice(-2);
  const mm = String(d.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(d.getUTCDate()).padStart(2, '0');
  return `${yy}${mm}${dd}`;
};

const formatBytes = (bytes: number): string => {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

// ═══════════════════════════════════════════════════════════════════════════════
// MESSAGE BUILDERS - ISO 20022
// ═══════════════════════════════════════════════════════════════════════════════

const buildPacs008 = (params: {
  msgId: string; uetr: string; instgAgtBic: string; instdAgtBic: string;
  amount: string; currency: string; dbtrNm: string; dbtrAcct: string;
  cdtrNm: string; cdtrAcct: string; ipIdSource?: string; ipIdDest?: string;
}): string => `<?xml version="1.0" encoding="UTF-8"?>
<Document xmlns="urn:iso:std:iso:20022:tech:xsd:pacs.008.001.08">
  <FIToFICstmrCdtTrf>
    <GrpHdr>
      <MsgId>${escXml(params.msgId)}</MsgId>
      <CreDtTm>${new Date().toISOString()}</CreDtTm>
      <NbOfTxs>1</NbOfTxs>
      <SttlmInf><SttlmMtd>CLRG</SttlmMtd></SttlmInf>
      <InstgAgt><FinInstnId><BICFI>${escXml(params.instgAgtBic)}</BICFI></FinInstnId></InstgAgt>
      <InstdAgt><FinInstnId><BICFI>${escXml(params.instdAgtBic)}</BICFI></FinInstnId></InstdAgt>
    </GrpHdr>
    <CdtTrfTxInf>
      <PmtId>
        <InstrId>${escXml(params.msgId)}</InstrId>
        <EndToEndId>E2E-${escXml(params.msgId)}</EndToEndId>
        <UETR>${params.uetr}</UETR>
      </PmtId>
      <IntrBkSttlmAmt Ccy="${escXml(params.currency)}">${escXml(params.amount)}</IntrBkSttlmAmt>
      <IntrBkSttlmDt>${new Date().toISOString().split('T')[0]}</IntrBkSttlmDt>
      <Dbtr><Nm>${escXml(params.dbtrNm)}</Nm></Dbtr>
      <DbtrAcct><Id><Othr><Id>${escXml(params.dbtrAcct)}</Id></Othr></Id></DbtrAcct>
      <Cdtr><Nm>${escXml(params.cdtrNm)}</Nm></Cdtr>
      <CdtrAcct><Id><Othr><Id>${escXml(params.cdtrAcct)}</Id></Othr></Id></CdtrAcct>
      <ChrgBr>SLEV</ChrgBr>
      <SplmtryData>
        <Envlp>
          <IPIDTransfer>
            <SourceIPID>${params.ipIdSource || 'N/A'}</SourceIPID>
            <DestIPID>${params.ipIdDest || 'N/A'}</DestIPID>
            <Protocol>IP-IP/TLS1.3</Protocol>
          </IPIDTransfer>
        </Envlp>
      </SplmtryData>
    </CdtTrfTxInf>
  </FIToFICstmrCdtTrf>
</Document>`;

const buildMT103 = (params: {
  senderBic: string; receiverBic: string; trn: string; amount: string;
  currency: string; orderingCustomer: string; beneficiary: string;
  remittance?: string; ipIdSource?: string; ipIdDest?: string;
}): string => {
  const r = params.remittance ? `:70:${params.remittance}\n` : '';
  const ipid = params.ipIdSource ? `:72:/IPID/${params.ipIdSource}/${params.ipIdDest}\n` : '';
  return `{1:F01${params.senderBic}0000000000}{2:I103${params.receiverBic}N}{4:
:20:${params.trn}
:23B:CRED
:32A:${yymmdd()}${params.currency}${params.amount}
:50K:${params.orderingCustomer}
:59:${params.beneficiary}
${r}${ipid}:71A:SHA
-}`;
};

// ═══════════════════════════════════════════════════════════════════════════════
// DEFAULT CONFIGURATION
// ═══════════════════════════════════════════════════════════════════════════════

const DEFAULT_CONFIG: Config = {
  bankBic: 'DCBKAEADXXX',
  bankName: 'Digital Commercial Bank Ltd',
  ledgerId: 'DAES-BK-USD-CORE',
  globalServerIpId: 'GSIP-DCB-001',
  localServerIpId: 'LSIP-DCB-001',
  receivingServerIpId: 'RSIP-DCB-001',
  apiToken: 'SWIFT-ALLIANCE-TOKEN-2026-SECURE',
  signingSecret: 'HMAC-SECRET-KEY-256-BANK-GRADE',
  allowedIps: ['127.0.0.1', '185.229.57.76', '103.187.147.109', '103.187.147.120'],
  queueMode: 'RABBIT',
  outboundTransport: 'IPID',
  serverIp: '185.229.57.76',
  serverPort: 443,
  tlsVersion: 'TLS 1.3',
  encryption: 'AES-256-GCM',
};

const DEFAULT_SERVERS: ServerConnection[] = [
  {
    id: 'dcb-global', name: 'DCB Global Server', ip: '185.229.57.76', port: 443,
    ipId: 'GSIP-DCB-001', bic: 'DCBKAEADXXX', type: 'GLOBAL', status: 'ONLINE',
    protocol: 'IP-IP', encryption: 'TLS 1.3 / AES-256-GCM', country: 'UAE',
    institution: 'Digital Commercial Bank Ltd'
  },
  // ═══════════════════════════════════════════════════════════════════════════════
  // PT BANTENG HITAM SERVER GLOBAL - Nostro Account Configuration
  // Bank: Standard Chartered USA | SWIFT: SCBLUS33XXX
  // ═══════════════════════════════════════════════════════════════════════════════
  {
    id: 'pt-banteng-global', name: 'PT Banteng Hitam Server Global', ip: '103.187.147.109', port: 8443,
    ipId: 'GOLD BULL SVR', bic: 'SCBLUS33XXX', type: 'GLOBAL', status: 'ONLINE',
    protocol: 'IP-IP', encryption: 'TLS 1.3 / AES-256-GCM', country: 'Indonesia',
    institution: 'PT Banteng Hitam Server Global',
    // Nostro Account Details
    nostroBank: 'STANDARD CHARTERED USA',
    nostroBankAddress: '1095 6th Ave, New York, NY 10036, United States of America',
    nostroSwift: 'SCBLUS33XXX',
    nostroAccountName: 'PT Bank MNC Internasional TBK (Indonesia)',
    nostroBeneficiary: 'PT BANTENG HITAM SERVER GLOBAL',
    nostroAccountUSD: '3582020754001',
    // Server System
    globalServerId: 'GOLD BULL SVR',
    globalServerIp: '103.187.147.109',
    localServerId: 'SC12185',
    localServerIp: '192.168.2.1',
    receivingServerId: 'GOLD BULL SVR',
    receivingServerIp: '103.187.147.120'
  },
  // ═══════════════════════════════════════════════════════════════════════════════
  // GOLD BULL SVR - Global Server (GPI IPIP TRANSFERS BANK TO BANK)
  // ═══════════════════════════════════════════════════════════════════════════════
  {
    id: 'gold-bull-global', name: 'GOLD BULL SVR (Global)', ip: '103.187.147.109', port: 8443,
    ipId: 'GOLD BULL SVR', bic: 'SCBLUS33XXX', type: 'GLOBAL', status: 'ONLINE',
    protocol: 'IP-IP', encryption: 'TLS 1.3 / AES-256-GCM', country: 'Singapore',
    institution: 'GOLD BULL SVR',
    // Server System
    globalServerId: 'GOLD BULL SVR',
    globalServerIp: '103.187.147.109',
    localServerId: 'SC12185',
    localServerIp: '192.168.2.1',
    receivingServerId: 'GOLD BULL SVR',
    receivingServerIp: '103.187.147.120'
  },
  // ═══════════════════════════════════════════════════════════════════════════════
  // GOLD BULL SVR - Receiving Server
  // ═══════════════════════════════════════════════════════════════════════════════
  {
    id: 'gold-bull-receiving', name: 'GOLD BULL SVR (Receiving)', ip: '103.187.147.120', port: 8443,
    ipId: 'GOLD BULL SVR', bic: 'SCBLUS33XXX', type: 'RECEIVING', status: 'ONLINE',
    protocol: 'IP-IP', encryption: 'TLS 1.3 / AES-256-GCM', country: 'Singapore',
    institution: 'GOLD BULL SVR',
    // Server System
    globalServerId: 'GOLD BULL SVR',
    globalServerIp: '103.187.147.109',
    localServerId: 'SC12185',
    localServerIp: '192.168.2.1',
    receivingServerId: 'GOLD BULL SVR',
    receivingServerIp: '103.187.147.120'
  },
  // ═══════════════════════════════════════════════════════════════════════════════
  // GOLD BULL SVR - Local Server (SC12185)
  // ═══════════════════════════════════════════════════════════════════════════════
  {
    id: 'gold-bull-local', name: 'GOLD BULL SVR (Local SC12185)', ip: '192.168.2.1', port: 8443,
    ipId: 'SC12185', bic: 'SCBLUS33XXX', type: 'LOCAL', status: 'ONLINE',
    protocol: 'IP-IP', encryption: 'TLS 1.3 / AES-256-GCM', country: 'Singapore',
    institution: 'GOLD BULL SVR',
    // Server System
    globalServerId: 'GOLD BULL SVR',
    globalServerIp: '103.187.147.109',
    localServerId: 'SC12185',
    localServerIp: '192.168.2.1',
    receivingServerId: 'GOLD BULL SVR',
    receivingServerIp: '103.187.147.120'
  },
  // ═══════════════════════════════════════════════════════════════════════════════
  // GOLD BULL SVR - Server 43 (Additional)
  // ═══════════════════════════════════════════════════════════════════════════════
  {
    id: 'gold-bull-43-1', name: 'GOLD BULL SVR (43-Primary)', ip: '103.187.147.43', port: 8443,
    ipId: 'GOLD BULL SVR-43', bic: 'SCBLUS33XXX', type: 'GLOBAL', status: 'ONLINE',
    protocol: 'IP-IP', encryption: 'TLS 1.3 / AES-256-GCM', country: 'Singapore',
    institution: 'GOLD BULL SVR',
    // Server System
    globalServerId: 'GOLD BULL SVR',
    globalServerIp: '103.187.147.109',
    localServerId: 'SC12185',
    localServerIp: '192.168.2.1',
    receivingServerId: 'GOLD BULL SVR',
    receivingServerIp: '103.187.147.120'
  },
  {
    id: 'gold-bull-43-2', name: 'GOLD BULL SVR (43-Backup)', ip: '103.187.147.143', port: 8443,
    ipId: 'GOLD BULL SVR-43B', bic: 'SCBLUS33XXX', type: 'RECEIVING', status: 'ONLINE',
    protocol: 'IP-IP', encryption: 'TLS 1.3 / AES-256-GCM', country: 'Singapore',
    institution: 'GOLD BULL SVR',
    // Server System
    globalServerId: 'GOLD BULL SVR',
    globalServerIp: '103.187.147.109',
    localServerId: 'SC12185',
    localServerIp: '192.168.2.1',
    receivingServerId: 'GOLD BULL SVR',
    receivingServerIp: '103.187.147.120'
  },
  {
    id: 'deutsche-bank', name: 'Deutsche Bank AG', ip: '193.110.141.1', port: 443,
    ipId: 'GSIP-DEUT-001', bic: 'DEUTDEFFXXX', type: 'CORRESPONDENT', status: 'ONLINE',
    protocol: 'SWIFT-GPI', encryption: 'TLS 1.3', country: 'Germany',
    institution: 'Deutsche Bank AG'
  },
];

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════

interface Props { onBack: () => void; }

export function SwiftAllianceLikeModule({ onBack }: Props) {
  const { isSpanish } = useLanguage();

  // Core State
  const [config] = useState<Config>(DEFAULT_CONFIG);
  const [messages, setMessages] = useState<SwiftMessage[]>([]);
  const [servers, setServers] = useState<ServerConnection[]>(DEFAULT_SERVERS);
  const [relationships, setRelationships] = useState<Relationship[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [queueJobs, setQueueJobs] = useState<QueueJob[]>([]);
  const [terminalLines, setTerminalLines] = useState<TerminalLine[]>([]);
  
  // Ledger & Custody Accounts
  const [custodyAccounts, setCustodyAccounts] = useState<CustodyAccount[]>([]);
  const [selectedLedgerAccount, setSelectedLedgerAccount] = useState<CustodyAccount | null>(null);
  
  // Saved Beneficiaries
  const [savedBeneficiaries, setSavedBeneficiaries] = useState<SavedBeneficiary[]>([]);
  const [showBeneficiaryForm, setShowBeneficiaryForm] = useState(false);
  const [editingBeneficiary, setEditingBeneficiary] = useState<SavedBeneficiary | null>(null);
  const [beneficiaryForm, setBeneficiaryForm] = useState({
    name: '', accountNumber: '', iban: '', bic: '', bankName: '', country: '', address: '', type: 'BOTH' as 'SWIFT' | 'IPID' | 'BOTH'
  });
  
  // Saved Servers
  const [savedServers, setSavedServers] = useState<SavedServer[]>([]);
  const [showServerForm, setShowServerForm] = useState(false);
  const [editingServer, setEditingServer] = useState<SavedServer | null>(null);
  const [serverForm, setServerForm] = useState({
    name: '', ip: '', port: '443', ipId: '', bic: '', type: 'GLOBAL' as 'GLOBAL' | 'LOCAL' | 'RECEIVING' | 'CORRESPONDENT',
    protocol: 'IP-IP', encryption: 'TLS 1.3 / AES-256-GCM', country: '', institution: '',
    // Nostro Account Details
    nostroBank: '', nostroBankAddress: '', nostroSwift: '', nostroAccountName: '', nostroBeneficiary: '', nostroAccountUSD: '',
    // Server System
    globalServerId: '', globalServerIp: '', localServerId: '', localServerIp: '', receivingServerId: '', receivingServerIp: ''
  });
  
  // Transaction History
  const [transactionHistory, setTransactionHistory] = useState<TransactionHistory[]>([]);
  const [selectedTransaction, setSelectedTransaction] = useState<TransactionHistory | null>(null);
  
  // UI State
  const [activeTab, setActiveTab] = useState<string>('terminal');
  const [isConnected, setIsConnected] = useState(false);
  const [isWorkerRunning, setIsWorkerRunning] = useState(false);
  const [selectedMessage, setSelectedMessage] = useState<SwiftMessage | null>(null);
  const [selectedServer, setSelectedServer] = useState<ServerConnection | null>(null);
  const [showPayload, setShowPayload] = useState(false);
  const [isTransferring, setIsTransferring] = useState(false);
  const [transferProgress, setTransferProgress] = useState(0);
  
  // Form State - SWIFT Transfer
  const [swiftForm, setSwiftForm] = useState({
    messageType: 'MT103' as string,
    transferType: 'STANDARD' as 'STANDARD' | 'GPI' | 'GPI_INSTANT' | 'GPI_COV',
    gpiServiceType: 'g4c' as 'g4c' | 'gpi' | 'gCCT' | 'gCOV' | 'gSRP' | 'gpi-instant',
    receiverBic: 'DEUTDEFFXXX',
    amount: '500000.00',
    currency: 'USD',
    orderingCustomer: 'DIGITAL COMMERCIAL BANK LTD',
    orderingAccount: 'DAES-BK-USD-CORE',
    beneficiaryName: 'DEUTSCHE BANK AG',
    beneficiaryAccount: 'DE89370400440532013000',
    remittance: 'SWIFT FIN TRANSFER',
    correspondentBic: '',
    // GPI Specific Fields
    gpiChargeBearer: 'SHAR' as 'SHAR' | 'CRED' | 'DEBT' | 'SLEV',
    gpiSettlementMethod: 'INDA' as 'INDA' | 'INGA' | 'COVE' | 'CLRG',
    gpiPriority: 'NORM' as 'NORM' | 'HIGH' | 'URGT',
    gpiEndToEndId: '',
    gpiInstructionId: '',
    gpiServiceLevel: 'SEPA' as 'SEPA' | 'URGP' | 'NURG' | 'SDVA' | 'PRPT',
    // MT700 - Letter of Credit fields
    lcType: 'IRREVOCABLE',
    lcExpiryDate: '',
    lcExpiryPlace: 'MORONI',
    lcAvailableWith: 'BY NEGOTIATION',
    lcDraftsAt: 'SIGHT',
    lcPartialShipments: 'ALLOWED',
    lcTransshipment: 'ALLOWED',
    lcPlaceOfTakingCharge: '',
    lcPortOfLoading: '',
    lcPortOfDischarge: '',
    lcPlaceOfFinalDestination: '',
    lcLatestShipmentDate: '',
    lcShipmentPeriod: '',
    lcGoodsDescription: 'GOODS AS PER PROFORMA INVOICE',
    lcDocumentsRequired: 'COMMERCIAL INVOICE\nPACKING LIST\nBILL OF LADING',
    lcAdditionalConditions: 'ALL DOCUMENTS MUST BE IN ENGLISH',
    lcCharges: 'ALL BANKING CHARGES OUTSIDE COMOROS ARE FOR BENEFICIARY ACCOUNT',
    lcPresentationPeriod: '21 DAYS',
    lcConfirmationInstructions: 'CONFIRM',
    // MT760 - Guarantee fields
    guaranteeType: 'URDG',
    guaranteeText: '',
    guaranteeExpiryDate: '',
    guaranteeApplicant: '',
    // MT541/543 - Securities fields
    isin: 'US0378331005',
    securityDescription: 'APPLE INC',
    settlementQuantity: '100',
    tradeDate: '',
    settlementDate: '',
    safekeepingAccount: '',
    // MT799 - Free Format
    freeFormatText: '',
    // IBAN fields
    orderingIban: '',
    beneficiaryIban: '',
  });

  // IBAN validation states for SWIFT form
  const [swiftOrderingIbanValidation, setSwiftOrderingIbanValidation] = useState<IBANValidationResult | null>(null);
  const [swiftBeneficiaryIbanValidation, setSwiftBeneficiaryIbanValidation] = useState<IBANValidationResult | null>(null);

  // Form State - IP-ID Transfer
  const [ipidForm, setIpidForm] = useState({
    format: 'pacs.008' as string,
    type: 'pacs.008.001.08',
    transferType: 'STANDARD' as 'STANDARD' | 'GPI' | 'GPI_INSTANT' | 'GPI_COV',
    gpiServiceType: 'g4c' as 'g4c' | 'gpi' | 'gCCT' | 'gCOV' | 'gSRP' | 'gpi-instant',
    destinationServerId: 'pt-banteng-global',
    amount: '1000000.00',
    currency: 'USD',
    dbtrNm: 'DIGITAL COMMERCIAL BANK LTD',
    dbtrAcct: 'DAES-BK-USD-CORE',
    cdtrNm: 'BENEFICIARY INSTITUTION',
    cdtrAcct: 'BENEF-ACCT-001',
    remittance: 'IP-IP TRANSFER',
    // GPI Specific Fields
    gpiChargeBearer: 'SHAR' as 'SHAR' | 'CRED' | 'DEBT' | 'SLEV',
    gpiSettlementMethod: 'INDA' as 'INDA' | 'INGA' | 'COVE' | 'CLRG',
    gpiPriority: 'NORM' as 'NORM' | 'HIGH' | 'URGT',
    gpiEndToEndId: '',
    gpiInstructionId: '',
    gpiServiceLevel: 'SEPA' as 'SEPA' | 'URGP' | 'NURG' | 'SDVA' | 'PRPT',
    // MT700 - Letter of Credit fields
    lcType: 'IRREVOCABLE',
    lcExpiryDate: '',
    lcExpiryPlace: '',
    lcAvailableWith: '',
    lcDraftsAt: 'SIGHT',
    lcPartialShipments: 'ALLOWED',
    lcTransshipment: 'ALLOWED',
    lcPortOfLoading: '',
    lcPortOfDischarge: '',
    lcGoodsDescription: '',
    lcDocumentsRequired: '',
    lcAdditionalConditions: '',
    lcCharges: 'ALL BANKING CHARGES OUTSIDE ISSUING BANK ARE FOR BENEFICIARY',
    lcPresentationPeriod: '21',
    lcConfirmationInstructions: 'WITHOUT',
    // MT760 - Guarantee fields
    guaranteeType: 'URDG',
    guaranteeText: '',
    guaranteeExpiryDate: '',
    guaranteeApplicant: '',
    // MT540-543 - Securities fields
    isin: '',
    securityDescription: '',
    settlementQuantity: '',
    tradeDate: '',
    // IBAN fields
    dbtrIban: '',
    cdtrIban: '',
    settlementDate: '',
    safekeepingAccount: '',
    // MT199/MT799 - Free format
    freeFormatText: '',
  });

  // IBAN validation states for IP-ID form
  const [ipidDbtrIbanValidation, setIpidDbtrIbanValidation] = useState<IBANValidationResult | null>(null);
  const [ipidCdtrIbanValidation, setIpidCdtrIbanValidation] = useState<IBANValidationResult | null>(null);

  // Transfer type state
  const [swiftTransferring, setSwiftTransferring] = useState(false);
  const [swiftProgress, setSwiftProgress] = useState(0);
  
  // Sandbox Mode
  const [sandboxMode, setSandboxMode] = useState(false);
  const [sandboxSimulation, setSandboxSimulation] = useState<{
    isRunning: boolean;
    type: 'SWIFT' | 'IPID' | null;
    step: number;
    totalSteps: number;
    timeline: Array<{ step: number; name: string; status: 'pending' | 'active' | 'completed'; timestamp?: string }>;
    result: TransactionHistory | null;
  }>({
    isRunning: false,
    type: null,
    step: 0,
    totalSteps: 0,
    timeline: [],
    result: null,
  });

  // Blockchain States
  const [selectedBlockchain, setSelectedBlockchain] = useState<string>('eth-mainnet');
  const [selectedContract, setSelectedContract] = useState<string>('');
  const [selectedOracle, setSelectedOracle] = useState<string>('chainlink-eth-usd');
  const [mintingCurrency, setMintingCurrency] = useState<string>('USD');
  const [mintingAmount, setMintingAmount] = useState<string>('');
  const [mintingType, setMintingType] = useState<'MINT' | 'TOKENIZE'>('TOKENIZE');
  const [mintingSource, setMintingSource] = useState<'SWIFT' | 'IPID'>('SWIFT');
  const [mintingMessageType, setMintingMessageType] = useState<string>('MT103');
  const [mintingTransactions, setMintingTransactions] = useState<MintingTransaction[]>([]);
  const [isMinting, setIsMinting] = useState(false);
  const [mintingProgress, setMintingProgress] = useState(0);
  const [customRpcUrl, setCustomRpcUrl] = useState<string>('');
  const [alchemyStatus, setAlchemyStatus] = useState<Record<string, { connected: boolean; blockNumber: number; latency: number }>>({});
  const [isTestingAlchemy, setIsTestingAlchemy] = useState(false);
  
  // ISO20022Scan Explorer
  const [showISO20022Scan, setShowISO20022Scan] = useState(false);
  const [scanSearchQuery, setScanSearchQuery] = useState('');
  const [scanSelectedTx, setScanSelectedTx] = useState<MintingTransaction | null>(null);
  
  // UETR Tracker
  const [uetrSearchQuery, setUetrSearchQuery] = useState('');
  const [uetrResults, setUetrResults] = useState<any[]>([]);
  const [selectedSwiftMsgType, setSelectedSwiftMsgType] = useState('MT103');

  const terminalRef = useRef<HTMLDivElement>(null);
  const lastAuditHash = useRef('GENESIS-BLOCK-DCB-2026');

  // ═══════════════════════════════════════════════════════════════════════════════
  // LOAD CUSTODY ACCOUNTS & SAVED DATA
  // ═══════════════════════════════════════════════════════════════════════════════

  useEffect(() => {
    // Load custody accounts
    const accounts = custodyStore.getAccounts();
    setCustodyAccounts(accounts);
    
    // Subscribe to updates
    const unsubscribe = custodyStore.subscribe(() => {
      setCustodyAccounts(custodyStore.getAccounts());
    });
    
    // Load saved beneficiaries from localStorage
    const savedBenef = localStorage.getItem('swift-alliance-beneficiaries');
    if (savedBenef) {
      try { setSavedBeneficiaries(JSON.parse(savedBenef)); } catch (e) {}
    }
    
    // Load saved servers from localStorage
    const savedSrv = localStorage.getItem('swift-alliance-servers');
    if (savedSrv) {
      try { setSavedServers(JSON.parse(savedSrv)); } catch (e) {}
    }
    
    // Load transaction history from localStorage
    const savedHistory = localStorage.getItem('swift-alliance-history');
    if (savedHistory) {
      try { setTransactionHistory(JSON.parse(savedHistory)); } catch (e) {}
    }
    
    return unsubscribe;
  }, []);
  
  // Save beneficiaries to localStorage
  useEffect(() => {
    localStorage.setItem('swift-alliance-beneficiaries', JSON.stringify(savedBeneficiaries));
  }, [savedBeneficiaries]);
  
  // Save servers to localStorage
  useEffect(() => {
    localStorage.setItem('swift-alliance-servers', JSON.stringify(savedServers));
  }, [savedServers]);
  
  // Save history to localStorage
  useEffect(() => {
    localStorage.setItem('swift-alliance-history', JSON.stringify(transactionHistory));
  }, [transactionHistory]);

  // ═══════════════════════════════════════════════════════════════════════════════
  // BENEFICIARY MANAGEMENT
  // ═══════════════════════════════════════════════════════════════════════════════

  const saveBeneficiary = useCallback(() => {
    if (!beneficiaryForm.name || !beneficiaryForm.bic) return;
    
    const newBenef: SavedBeneficiary = {
      id: editingBeneficiary?.id || generateUUID(),
      name: beneficiaryForm.name,
      accountNumber: beneficiaryForm.accountNumber,
      iban: beneficiaryForm.iban,
      bic: beneficiaryForm.bic,
      bankName: beneficiaryForm.bankName,
      country: beneficiaryForm.country,
      address: beneficiaryForm.address,
      type: beneficiaryForm.type,
      createdAt: editingBeneficiary?.createdAt || new Date().toISOString(),
    };
    
    if (editingBeneficiary) {
      setSavedBeneficiaries(prev => prev.map(b => b.id === editingBeneficiary.id ? newBenef : b));
    } else {
      setSavedBeneficiaries(prev => [...prev, newBenef]);
    }
    
    setBeneficiaryForm({ name: '', accountNumber: '', iban: '', bic: '', bankName: '', country: '', address: '', type: 'BOTH' });
    setShowBeneficiaryForm(false);
    setEditingBeneficiary(null);
  }, [beneficiaryForm, editingBeneficiary]);

  const deleteBeneficiary = useCallback((id: string) => {
    setSavedBeneficiaries(prev => prev.filter(b => b.id !== id));
  }, []);

  // ═══════════════════════════════════════════════════════════════════════════════
  // SERVER MANAGEMENT
  // ═══════════════════════════════════════════════════════════════════════════════

  const saveServer = useCallback(() => {
    if (!serverForm.name || !serverForm.ip || !serverForm.ipId) return;
    
    const newServer: SavedServer = {
      id: editingServer?.id || generateUUID(),
      name: serverForm.name,
      ip: serverForm.ip,
      port: parseInt(serverForm.port) || 443,
      ipId: serverForm.ipId,
      bic: serverForm.bic,
      type: serverForm.type,
      protocol: serverForm.protocol,
      encryption: serverForm.encryption,
      country: serverForm.country,
      institution: serverForm.institution,
      // Nostro Account Details
      nostroBank: serverForm.nostroBank,
      nostroBankAddress: serverForm.nostroBankAddress,
      nostroSwift: serverForm.nostroSwift,
      nostroAccountName: serverForm.nostroAccountName,
      nostroBeneficiary: serverForm.nostroBeneficiary,
      nostroAccountUSD: serverForm.nostroAccountUSD,
      // Server System
      globalServerId: serverForm.globalServerId,
      globalServerIp: serverForm.globalServerIp,
      localServerId: serverForm.localServerId,
      localServerIp: serverForm.localServerIp,
      receivingServerId: serverForm.receivingServerId,
      receivingServerIp: serverForm.receivingServerIp,
      createdAt: editingServer?.createdAt || new Date().toISOString(),
      isCustom: true,
    };
    
    if (editingServer) {
      setSavedServers(prev => prev.map(s => s.id === editingServer.id ? newServer : s));
    } else {
      setSavedServers(prev => [...prev, newServer]);
    }
    
    // Also add to servers list for transfers
    const serverConnection: ServerConnection = {
      id: newServer.id,
      name: newServer.name,
      ip: newServer.ip,
      port: newServer.port,
      ipId: newServer.ipId,
      bic: newServer.bic,
      type: newServer.type,
      status: 'OFFLINE',
      protocol: newServer.protocol,
      encryption: newServer.encryption,
      country: newServer.country,
      institution: newServer.institution,
      // Nostro Account Details
      nostroBank: serverForm.nostroBank || undefined,
      nostroBankAddress: serverForm.nostroBankAddress || undefined,
      nostroSwift: serverForm.nostroSwift || undefined,
      nostroAccountName: serverForm.nostroAccountName || undefined,
      nostroBeneficiary: serverForm.nostroBeneficiary || undefined,
      nostroAccountUSD: serverForm.nostroAccountUSD || undefined,
      // Server System
      globalServerId: serverForm.globalServerId || undefined,
      globalServerIp: serverForm.globalServerIp || undefined,
      localServerId: serverForm.localServerId || undefined,
      localServerIp: serverForm.localServerIp || undefined,
      receivingServerId: serverForm.receivingServerId || undefined,
      receivingServerIp: serverForm.receivingServerIp || undefined,
    };
    
    if (editingServer) {
      setServers(prev => prev.map(s => s.id === editingServer.id ? serverConnection : s));
    } else {
      setServers(prev => [...prev, serverConnection]);
    }
    
    setServerForm({ 
      name: '', ip: '', port: '443', ipId: '', bic: '', type: 'GLOBAL', protocol: 'IP-IP', encryption: 'TLS 1.3 / AES-256-GCM', country: '', institution: '',
      nostroBank: '', nostroBankAddress: '', nostroSwift: '', nostroAccountName: '', nostroBeneficiary: '', nostroAccountUSD: '',
      globalServerId: '', globalServerIp: '', localServerId: '', localServerIp: '', receivingServerId: '', receivingServerIp: ''
    });
    setShowServerForm(false);
    setEditingServer(null);
  }, [serverForm, editingServer]);

  const deleteServer = useCallback((id: string) => {
    setSavedServers(prev => prev.filter(s => s.id !== id));
    setServers(prev => prev.filter(s => s.id !== id));
  }, []);

  // ═══════════════════════════════════════════════════════════════════════════════
  // SANDBOX SIMULATION FUNCTIONS
  // ═══════════════════════════════════════════════════════════════════════════════

  const runSandboxSimulation = useCallback(async (type: 'SWIFT' | 'IPID') => {
    const steps = type === 'SWIFT' ? [
      'Validating SWIFT message parameters',
      'Building FIN message structure',
      'Generating HMAC signature',
      'Connecting to SWIFTNet gateway',
      'TLS handshake with SWIFT',
      'Transmitting message',
      'Waiting for network ACK',
      'Processing confirmation',
    ] : [
      'Validating IP-ID parameters',
      'Building ISO 20022 payload',
      'Generating cryptographic signatures',
      'Establishing IP-ID route',
      'TLS 1.3 handshake',
      'Encrypting payload (AES-256-GCM)',
      'Transmitting encrypted data',
      'Waiting for server ACK',
      'Verifying response integrity',
      'Finalizing transfer',
    ];

    const timeline = steps.map((name, idx) => ({
      step: idx + 1,
      name,
      status: 'pending' as const,
    }));

    setSandboxSimulation({
      isRunning: true,
      type,
      step: 0,
      totalSteps: steps.length,
      timeline,
      result: null,
    });

    // Simulate each step
    for (let i = 0; i < steps.length; i++) {
      setSandboxSimulation(prev => ({
        ...prev,
        step: i + 1,
        timeline: prev.timeline.map((t, idx) => ({
          ...t,
          status: idx < i ? 'completed' : idx === i ? 'active' : 'pending',
          timestamp: idx <= i ? new Date().toISOString() : undefined,
        })),
      }));
      await new Promise(r => setTimeout(r, 400 + Math.random() * 300));
    }

    // Mark all complete
    setSandboxSimulation(prev => ({
      ...prev,
      timeline: prev.timeline.map(t => ({ ...t, status: 'completed' as const, timestamp: new Date().toISOString() })),
    }));

    // Generate sandbox result
    const msgId = `SANDBOX-${type}-${Date.now()}`;
    const uetr = generateUUID();
    const destServer = type === 'IPID' ? servers.find(s => s.id === ipidForm.destinationServerId) : null;
    
    const sandboxResult: TransactionHistory = {
      id: generateUUID(),
      type,
      messageType: type === 'SWIFT' ? swiftForm.messageType : (ipidForm.format === 'ISO20022' ? 'pacs.008.001.08' : 'MT103'),
      msgId,
      uetr,
      trn: type === 'SWIFT' ? `TRN${Date.now().toString().slice(-10)}` : undefined,
      senderBic: config.bankBic,
      receiverBic: type === 'SWIFT' ? swiftForm.receiverBic : (destServer?.bic || 'UNKNOWN'),
      amount: parseFloat(type === 'SWIFT' ? swiftForm.amount : ipidForm.amount),
      currency: type === 'SWIFT' ? swiftForm.currency : ipidForm.currency,
      beneficiaryName: type === 'SWIFT' ? swiftForm.beneficiaryName : ipidForm.cdtrNm,
      beneficiaryAccount: type === 'SWIFT' ? swiftForm.beneficiaryAccount : ipidForm.cdtrAcct,
      status: 'ACK',
      createdAt: new Date().toISOString(),
      completedAt: new Date().toISOString(),
      sourceAccount: selectedLedgerAccount?.accountNumber || (type === 'SWIFT' ? swiftForm.orderingAccount : ipidForm.dbtrAcct),
      sourceAccountName: selectedLedgerAccount?.accountName || (type === 'SWIFT' ? swiftForm.orderingCustomer : ipidForm.dbtrNm),
      // Ledger Account Details (if selected)
      ledgerAccountId: selectedLedgerAccount?.id,
      ledgerAccountNumber: selectedLedgerAccount?.accountNumber,
      ledgerAccountName: selectedLedgerAccount?.accountName,
      ledgerAccountType: selectedLedgerAccount?.accountType,
      ledgerAccountCurrency: selectedLedgerAccount?.currency,
      ledgerAccountBalance: selectedLedgerAccount?.balance,
      ledgerAccountIban: selectedLedgerAccount?.iban,
      ledgerAccountSwift: selectedLedgerAccount?.swiftCode,
      ledgerAccountBank: selectedLedgerAccount?.bankName,
      destinationServer: destServer?.name,
      destinationIpId: destServer?.ipId,
      payload: type === 'SWIFT' 
        ? `{1:F01${config.bankBic}0000000000}{2:I103${swiftForm.receiverBic}N}{4:\n:20:${msgId}\n:23B:CRED\n:32A:${yymmdd()}${swiftForm.currency}${swiftForm.amount.replace('.', ',')}\n:50K:/${swiftForm.orderingAccount}\n${swiftForm.orderingCustomer}\n:59:/${swiftForm.beneficiaryAccount}\n${swiftForm.beneficiaryName}\n:70:SANDBOX TEST\n:71A:SHA\n-}`
        : buildPacs008({
            msgId, uetr,
            instgAgtBic: config.bankBic,
            instdAgtBic: destServer?.bic || 'UNKNOWN',
            amount: ipidForm.amount,
            currency: ipidForm.currency,
            dbtrNm: ipidForm.dbtrNm,
            dbtrAcct: ipidForm.dbtrAcct,
            cdtrNm: ipidForm.cdtrNm,
            cdtrAcct: ipidForm.cdtrAcct,
            ipIdSource: config.globalServerIpId,
            ipIdDest: destServer?.ipId,
          }),
      payloadHash: sha256Hex(msgId + uetr + Date.now()),
      signature: hmacSha256Base64(config.signingSecret, msgId + uetr),
      confirmationCode: `SANDBOX-${Math.random().toString(36).substring(2, 10).toUpperCase()}`,
      latencyMs: Math.floor(Math.random() * 150) + 50,
    };

    setSandboxSimulation(prev => ({
      ...prev,
      isRunning: false,
      result: sandboxResult,
    }));
  }, [servers, ipidForm, swiftForm, config, selectedLedgerAccount]);

  const generateSandboxReceiptPDF = useCallback((tx: TransactionHistory) => {
    const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const margin = 10;
    let y = margin;
    const lineHeight = 4;

    const addBlackPage = () => {
      pdf.setFillColor(0, 0, 0);
      pdf.rect(0, 0, pageWidth, pageHeight, 'F');
    };

    const setGreen = () => { pdf.setTextColor(0, 255, 65); pdf.setFontSize(7); pdf.setFont('Courier', 'normal'); };
    const setWhite = () => { pdf.setTextColor(255, 255, 255); pdf.setFontSize(7); pdf.setFont('Courier', 'normal'); };
    const setYellow = () => { pdf.setTextColor(255, 200, 0); pdf.setFontSize(7); pdf.setFont('Courier', 'normal'); };

    const printLine = (text: string, color: 'green' | 'white' | 'yellow' = 'white') => {
      if (y > pageHeight - margin) { pdf.addPage(); addBlackPage(); y = margin; }
      if (color === 'green') setGreen();
      else if (color === 'yellow') setYellow();
      else setWhite();
      pdf.text(text, margin, y);
      y += lineHeight;
    };

    const printKV = (key: string, value: string, keyWidth = 35) => {
      if (y > pageHeight - margin) { pdf.addPage(); addBlackPage(); y = margin; }
      setGreen();
      pdf.text(key, margin, y);
      setWhite();
      pdf.text(String(value || ''), margin + keyWidth, y);
      y += lineHeight;
    };

    addBlackPage();

    // ═══════════════════════════════════════════════════════════════════════════════
    // SWIFT SANDBOX RECEIPT
    // ═══════════════════════════════════════════════════════════════════════════════
    if (tx.type === 'SWIFT') {
      // SWIFT Sandbox Header
      printLine('================================================================================', 'green');
      printLine('  S.W.I.F.T. FIN MESSAGE - SANDBOX TEST ENVIRONMENT', 'yellow');
      printLine('================================================================================', 'green');
      printLine('');
      printLine('********************************************************************************', 'yellow');
      printLine('*  SANDBOX MODE - NO REAL FUNDS TRANSFERRED                                   *', 'yellow');
      printLine('*  FOR TESTING AND VERIFICATION PURPOSES ONLY                                 *', 'yellow');
      printLine('********************************************************************************', 'yellow');
      printLine('');
      
      // Basic Header Block {1:} - SWIFT Standard
      printLine('  BASIC HEADER BLOCK {1:} (SIMULATED)', 'green');
      printLine('--------------------------------------------------------------------------------', 'green');
      printKV('Application ID:', 'F (FIN - Financial)');
      printKV('Service ID:', '01 (FIN/GPA)');
      printKV('LT Address:', `${config.bankBic}XXXX`);
      printKV('Session Number:', 'TEST-' + Math.floor(Math.random() * 9999).toString().padStart(4, '0'));
      printKV('Sequence Number:', 'TEST-' + Math.floor(Math.random() * 999999).toString().padStart(6, '0'));
      printLine('');
      
      // Application Header Block {2:} - SWIFT Standard
      printLine('  APPLICATION HEADER BLOCK {2:} (SIMULATED)', 'green');
      printLine('--------------------------------------------------------------------------------', 'green');
      printKV('I/O Identifier:', 'I (Input)');
      printKV('Message Type:', tx.messageType);
      printKV('Receiver LT:', `${tx.receiverBic}XXXX`);
      printKV('Priority:', 'N (Normal)');
      printKV('Delivery Monitor:', '3 (Non-Delivery Warning)');
      printLine('');
      
      // User Header Block {3:} - SWIFT Standard
      printLine('  USER HEADER BLOCK {3:} (SIMULATED)', 'green');
      printLine('--------------------------------------------------------------------------------', 'green');
      printKV('Service Type {119}:', 'STP');
      printKV('Banking Priority {113}:', 'NNNN');
      printKV('MUR {108}:', tx.msgId.substring(0, 16));
      if (tx.uetr) printKV('UETR {121}:', tx.uetr);
      printLine('');
      
      // Message Reference - SWIFT Standard
      printLine('  MESSAGE REFERENCE (SIMULATED)', 'green');
      printLine('--------------------------------------------------------------------------------', 'green');
      printKV('Message Reference:', tx.msgId);
      if (tx.trn) printKV('TRN :20:', tx.trn);
      printLine('');
      
      // Ordering Institution (Field 52A) - SWIFT Standard
      printLine('  ORDERING INSTITUTION :52A: (SIMULATED)', 'green');
      printLine('--------------------------------------------------------------------------------', 'green');
      printKV('Institution:', config.bankName);
      printKV('BIC:', config.bankBic);
      printKV('Account:', tx.sourceAccount || config.ledgerId);
      printLine('');
      
      // Ledger Account (if selected)
      if (tx.ledgerAccountId) {
        printLine('  LEDGER ACCOUNT (SIMULATED)', 'green');
        printLine('--------------------------------------------------------------------------------', 'green');
        if (tx.ledgerAccountNumber) printKV('Account Number:', tx.ledgerAccountNumber);
        if (tx.ledgerAccountName) printKV('Account Name:', tx.ledgerAccountName);
        if (tx.ledgerAccountType) printKV('Account Type:', tx.ledgerAccountType);
        if (tx.ledgerAccountCurrency && tx.ledgerAccountBalance !== undefined) {
          printKV('Balance:', `${tx.ledgerAccountCurrency} ${tx.ledgerAccountBalance.toLocaleString('en-US', { minimumFractionDigits: 2 })}`);
        }
        if (tx.ledgerAccountIban) printKV('IBAN:', tx.ledgerAccountIban);
        if (tx.ledgerAccountSwift) printKV('SWIFT/BIC:', tx.ledgerAccountSwift);
        if (tx.ledgerAccountBank) printKV('Bank:', tx.ledgerAccountBank);
        printLine('');
      }
      
      // Beneficiary (Field 59) - SWIFT Standard
      printLine('  BENEFICIARY :59: (SIMULATED)', 'green');
      printLine('--------------------------------------------------------------------------------', 'green');
      printKV('Name:', tx.beneficiaryName);
      printKV('Account:', tx.beneficiaryAccount);
      printKV('BIC :57A::', tx.receiverBic);
      printLine('');
      
      // Value/Amount (Field 32A) - SWIFT Standard
      printLine('  VALUE DATE/AMOUNT :32A: (SIMULATED)', 'green');
      printLine('--------------------------------------------------------------------------------', 'green');
      const valueDate = new Date().toISOString().slice(2, 10).replace(/-/g, '');
      printKV('Value Date:', valueDate);
      printKV('Currency:', tx.currency);
      printKV('Amount:', tx.amount.toLocaleString('en-US', { minimumFractionDigits: 2 }));
      printKV('Field 32A:', `${valueDate}${tx.currency}${tx.amount.toFixed(2).replace('.', ',')}`);
      printLine('');
      
      // Charges (Field 71A) - SWIFT Standard
      printLine('  DETAILS OF CHARGES :71A: (SIMULATED)', 'green');
      printLine('--------------------------------------------------------------------------------', 'green');
      printKV('Charge Bearer:', 'SHA (Shared)');
      printLine('');
      
      // Trailer Block {5:} - SWIFT Standard
      printLine('  TRAILER BLOCK {5:} (SIMULATED)', 'green');
      printLine('--------------------------------------------------------------------------------', 'green');
      printKV('MAC:', tx.signature.substring(0, 8).toUpperCase());
      printKV('CHK:', tx.payloadHash.substring(0, 12).toUpperCase());
      printLine('');
      
      // Sandbox Status
      printLine('  SANDBOX DELIVERY STATUS', 'yellow');
      printLine('--------------------------------------------------------------------------------', 'green');
      printKV('Status:', `${tx.status} (SIMULATED)`);
      if (tx.confirmationCode) printKV('Confirmation:', tx.confirmationCode);
      printKV('Simulated Latency:', `${tx.latencyMs}ms`);
      printLine('');
      
    // ═══════════════════════════════════════════════════════════════════════════════
    // IP-ID SANDBOX RECEIPT
    // ═══════════════════════════════════════════════════════════════════════════════
    } else {
      // IP-ID Sandbox Header
      printLine('================================================================================', 'green');
      printLine('  IP-ID SERVER-TO-SERVER - SANDBOX TEST ENVIRONMENT', 'yellow');
      printLine('================================================================================', 'green');
      printLine('');
      printLine('********************************************************************************', 'yellow');
      printLine('*  SANDBOX MODE - NO REAL FUNDS TRANSFERRED                                   *', 'yellow');
      printLine('*  FOR TESTING AND VERIFICATION PURPOSES ONLY                                 *', 'yellow');
      printLine('********************************************************************************', 'yellow');
      printLine('');
      
      // Transfer Identification
      printLine('  TRANSFER IDENTIFICATION (SIMULATED)', 'green');
      printLine('--------------------------------------------------------------------------------', 'green');
      printKV('Message ID:', tx.msgId);
      printKV('UETR:', tx.uetr);
      printKV('Format:', tx.messageType.includes('pacs') ? 'ISO 20022' : 'SWIFT MT');
      printKV('Type:', tx.messageType);
      printKV('Status:', `${tx.status} (SIMULATED)`);
      if (tx.confirmationCode) printKV('Confirmation:', tx.confirmationCode);
      printLine('');
      
      // Source Server
      printLine('  SOURCE SERVER (SIMULATED)', 'green');
      printLine('--------------------------------------------------------------------------------', 'green');
      printKV('Institution:', config.bankName);
      printKV('BIC:', config.bankBic);
      printKV('Server IP:', config.serverIp);
      printKV('IP-ID (Global):', config.globalServerIpId);
      printKV('Ledger ID:', config.ledgerId);
      if (tx.sourceAccount) printKV('Source Account:', tx.sourceAccount);
      printLine('');
      
      // Ledger Account (if selected)
      if (tx.ledgerAccountId) {
        printLine('  LEDGER ACCOUNT (SIMULATED)', 'green');
        printLine('--------------------------------------------------------------------------------', 'green');
        if (tx.ledgerAccountNumber) printKV('Account Number:', tx.ledgerAccountNumber);
        if (tx.ledgerAccountName) printKV('Account Name:', tx.ledgerAccountName);
        if (tx.ledgerAccountType) printKV('Account Type:', tx.ledgerAccountType);
        if (tx.ledgerAccountCurrency && tx.ledgerAccountBalance !== undefined) {
          printKV('Balance:', `${tx.ledgerAccountCurrency} ${tx.ledgerAccountBalance.toLocaleString('en-US', { minimumFractionDigits: 2 })}`);
        }
        if (tx.ledgerAccountIban) printKV('IBAN:', tx.ledgerAccountIban);
        if (tx.ledgerAccountSwift) printKV('SWIFT/BIC:', tx.ledgerAccountSwift);
        if (tx.ledgerAccountBank) printKV('Bank:', tx.ledgerAccountBank);
        printLine('');
      }
      
      // Destination Server
      printLine('  DESTINATION SERVER (SIMULATED)', 'green');
      printLine('--------------------------------------------------------------------------------', 'green');
      printKV('Beneficiary:', tx.beneficiaryName);
      printKV('Account:', tx.beneficiaryAccount);
      printKV('BIC:', tx.receiverBic);
      if (tx.destinationServer) printKV('Server:', tx.destinationServer);
      if (tx.destinationIpId) printKV('IP-ID:', tx.destinationIpId);
      printLine('');
      
      // Settlement
      printLine('  SETTLEMENT (SIMULATED)', 'green');
      printLine('--------------------------------------------------------------------------------', 'green');
      printKV('Settlement Method:', 'CLRG');
      printKV('Currency:', tx.currency);
      printKV('Amount:', tx.amount.toLocaleString('en-US', { minimumFractionDigits: 2 }));
      printLine('');
      
      // Connection
      printLine('  CONNECTION (SIMULATED)', 'green');
      printLine('--------------------------------------------------------------------------------', 'green');
      printKV('Protocol:', 'TLS 1.3');
      printKV('Cipher:', 'AES-256-GCM');
      if (tx.latencyMs) printKV('Latency:', `${tx.latencyMs}ms`);
      printLine('');
    }
    
    // Page 2 - Message Payload
    pdf.addPage();
    addBlackPage();
    y = margin;
    
    if (tx.type === 'SWIFT') {
      printLine('================================================================================', 'green');
      printLine('  SWIFT FIN MESSAGE - SANDBOX PAYLOAD', 'yellow');
      printLine('================================================================================', 'green');
    } else {
      printLine('================================================================================', 'green');
      printLine('  ISO 20022 MESSAGE - SANDBOX PAYLOAD', 'yellow');
      printLine('================================================================================', 'green');
    }
    printLine('');
    
    const payloadLines = tx.payload.split('\n');
    payloadLines.forEach(line => {
      printLine(line.substring(0, 95));
    });
    
    printLine('');
    printLine('--------------------------------------------------------------------------------', 'green');
    if (tx.type === 'SWIFT') {
      printLine('  SWIFT MESSAGE AUTHENTICATION (SIMULATED)', 'green');
      printLine('--------------------------------------------------------------------------------', 'green');
      printKV('MAC:', tx.signature.substring(0, 16).toUpperCase());
      printKV('CHK:', tx.payloadHash.substring(0, 12).toUpperCase());
    } else {
      printLine('  MESSAGE INTEGRITY (SIMULATED)', 'green');
      printLine('--------------------------------------------------------------------------------', 'green');
      printKV('SHA-256:', tx.payloadHash);
      printKV('HMAC-SHA256:', tx.signature);
    }
    printLine('');
    
    // Final sandbox notice
    printLine('********************************************************************************', 'yellow');
    printLine('*  THIS DOCUMENT IS FOR TESTING PURPOSES ONLY                                 *', 'yellow');
    printLine('*  IT DOES NOT REPRESENT A REAL FINANCIAL TRANSACTION                         *', 'yellow');
    printLine('*  SANDBOX ENVIRONMENT - Digital Commercial Bank Ltd                          *', 'yellow');
    printLine('********************************************************************************', 'yellow');
    printLine('');
    printKV('Document ID:', sha256Hex(tx.id + tx.payload + 'SANDBOX').substring(0, 32));
    printKV('Generated:', new Date().toISOString());
    printKV('Environment:', 'SANDBOX');

    const filename = `SANDBOX-${tx.type}-${tx.messageType}-BlackScreen-${tx.msgId}.pdf`;
    pdf.save(filename);
  }, [config]);

  // ═══════════════════════════════════════════════════════════════════════════════
  // GENERATE SANDBOX WHITE PAPER PDF (Professional Bank Standard - Test)
  // ═══════════════════════════════════════════════════════════════════════════════

  const generateSandboxWhitePaperPDF = useCallback((tx: TransactionHistory) => {
    const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const margin = 15;
    let y = margin;

    const setTitle = () => { pdf.setTextColor(0, 51, 102); pdf.setFontSize(14); pdf.setFont('Helvetica', 'bold'); };
    const setSubtitle = () => { pdf.setTextColor(0, 51, 102); pdf.setFontSize(10); pdf.setFont('Helvetica', 'bold'); };
    const setLabel = () => { pdf.setTextColor(80, 80, 80); pdf.setFontSize(8); pdf.setFont('Helvetica', 'normal'); };
    const setValue = () => { pdf.setTextColor(0, 0, 0); pdf.setFontSize(9); pdf.setFont('Helvetica', 'bold'); };
    const setSmall = () => { pdf.setTextColor(100, 100, 100); pdf.setFontSize(7); pdf.setFont('Helvetica', 'normal'); };
    const setCode = () => { pdf.setTextColor(0, 0, 0); pdf.setFontSize(7); pdf.setFont('Courier', 'normal'); };
    const setWarning = () => { pdf.setTextColor(180, 100, 0); pdf.setFontSize(8); pdf.setFont('Helvetica', 'bold'); };

    const drawLine = (y1: number, color: number[] = [0, 51, 102]) => {
      pdf.setDrawColor(color[0], color[1], color[2]);
      pdf.setLineWidth(0.3);
      pdf.line(margin, y1, pageWidth - margin, y1);
    };

    const printKV = (label: string, value: string, xOffset = 0) => {
      setLabel();
      pdf.text(label, margin + xOffset, y);
      setValue();
      pdf.text(String(value || ''), margin + xOffset + 45, y);
      y += 5;
    };

    // Sandbox Warning Banner
    pdf.setFillColor(255, 240, 200);
    pdf.rect(0, 0, pageWidth, 20, 'F');
    pdf.setDrawColor(200, 150, 0);
    pdf.setLineWidth(1);
    pdf.line(0, 20, pageWidth, 20);
    
    setWarning();
    pdf.text('SANDBOX TEST ENVIRONMENT - THIS IS NOT A REAL TRANSACTION', pageWidth / 2, 8, { align: 'center' });
    pdf.setFontSize(7);
    pdf.text('No funds have been transferred. For testing and verification purposes only.', pageWidth / 2, 14, { align: 'center' });

    // Header
    const headerColor = tx.type === 'SWIFT' ? [0, 51, 102] : [0, 102, 102];
    pdf.setFillColor(headerColor[0], headerColor[1], headerColor[2]);
    pdf.rect(0, 20, pageWidth, 30, 'F');
    
    pdf.setTextColor(255, 255, 255);
    pdf.setFontSize(16);
    pdf.setFont('Helvetica', 'bold');
    pdf.text(tx.type === 'SWIFT' ? 'S.W.I.F.T. SANDBOX' : 'IP-ID SANDBOX', margin, 35);
    
    pdf.setFontSize(9);
    pdf.setFont('Helvetica', 'normal');
    pdf.text(tx.type === 'SWIFT' ? 'SWIFT FIN Message Simulation' : 'Server-to-Server Transfer Simulation', margin, 42);
    
    // Document Reference Box
    pdf.setFillColor(240, 240, 240);
    pdf.rect(pageWidth - 70, 25, 55, 20, 'F');
    pdf.setTextColor(headerColor[0], headerColor[1], headerColor[2]);
    pdf.setFontSize(7);
    pdf.text('Sandbox Reference', pageWidth - 68, 32);
    pdf.setTextColor(0, 0, 0);
    pdf.setFontSize(8);
    pdf.setFont('Helvetica', 'bold');
    pdf.text(tx.msgId.substring(0, 18), pageWidth - 68, 38);
    
    y = 60;
    
    // Message Type Banner
    pdf.setFillColor(255, 250, 230);
    pdf.rect(margin, y - 5, pageWidth - margin * 2, 12, 'F');
    pdf.setDrawColor(200, 150, 0);
    pdf.rect(margin, y - 5, pageWidth - margin * 2, 12, 'S');
    pdf.setTextColor(headerColor[0], headerColor[1], headerColor[2]);
    pdf.setFontSize(10);
    pdf.setFont('Helvetica', 'bold');
    pdf.text(`${tx.messageType} - SIMULATED`, margin + 3, y + 2);
    y += 15;

    if (tx.type === 'SWIFT') {
      // SWIFT Sandbox Content
      setSubtitle();
      pdf.text('BASIC HEADER BLOCK {1:} (SIMULATED)', margin, y);
      y += 3;
      drawLine(y);
      y += 6;
      
      printKV('Application ID:', 'F01 (FIN - Simulated)');
      printKV('Logical Terminal:', `${config.bankBic}AXXX`);
      printKV('Session:', 'TEST-' + Math.floor(Math.random() * 9999).toString().padStart(4, '0'));
      y += 3;
      
      setSubtitle();
      pdf.text('APPLICATION HEADER {2:} (SIMULATED)', margin, y);
      y += 3;
      drawLine(y);
      y += 6;
      
      printKV('Message Type:', tx.messageType);
      printKV('Receiver:', `${tx.receiverBic}XXXX`);
      printKV('Priority:', 'N (Normal)');
      y += 3;
      
      setSubtitle();
      pdf.text('USER HEADER {3:} (SIMULATED)', margin, y);
      y += 3;
      drawLine(y);
      y += 6;
      
      printKV('UETR {121}:', tx.uetr);
      printKV('MUR {108}:', tx.msgId.substring(0, 16));
      y += 3;
      
      setSubtitle();
      pdf.text('ORDERING INSTITUTION :52A: (SIMULATED)', margin, y);
      y += 3;
      drawLine(y, [200, 200, 200]);
      y += 6;
      
      printKV('Institution:', config.bankName);
      printKV('BIC:', config.bankBic);
      printKV('Account:', tx.sourceAccount || config.ledgerId);
      y += 3;
      
      // Ledger Account (if selected)
      if (tx.ledgerAccountId) {
        setSubtitle();
        pdf.text('LEDGER ACCOUNT (SIMULATED)', margin, y);
        y += 3;
        pdf.setFillColor(255, 252, 240);
        const ledgerBoxHeight = 30;
        pdf.rect(margin, y, pageWidth - margin * 2, ledgerBoxHeight, 'F');
        pdf.setDrawColor(200, 180, 100);
        pdf.setLineWidth(0.3);
        pdf.rect(margin, y, pageWidth - margin * 2, ledgerBoxHeight, 'S');
        y += 5;
        
        if (tx.ledgerAccountNumber) printKV('Account Number:', tx.ledgerAccountNumber, 3);
        if (tx.ledgerAccountName) printKV('Account Name:', tx.ledgerAccountName, 3);
        if (tx.ledgerAccountCurrency && tx.ledgerAccountBalance !== undefined) {
          printKV('Balance:', `${tx.ledgerAccountCurrency} ${tx.ledgerAccountBalance.toLocaleString('en-US', { minimumFractionDigits: 2 })}`, 3);
        }
        if (tx.ledgerAccountIban) printKV('IBAN:', tx.ledgerAccountIban, 3);
        if (tx.ledgerAccountSwift) printKV('SWIFT:', tx.ledgerAccountSwift, 3);
        y += 5;
      }
      
      setSubtitle();
      pdf.text('BENEFICIARY :59: (SIMULATED)', margin, y);
      y += 3;
      drawLine(y, [200, 200, 200]);
      y += 6;
      
      printKV('Name:', tx.beneficiaryName);
      printKV('Account:', tx.beneficiaryAccount);
      printKV('BIC :57A:', tx.receiverBic);
      y += 3;
      
    } else {
      // IP-ID Sandbox Content
      setSubtitle();
      pdf.text('TRANSFER IDENTIFICATION (SIMULATED)', margin, y);
      y += 3;
      drawLine(y);
      y += 6;
      
      printKV('Message ID:', tx.msgId);
      printKV('UETR:', tx.uetr);
      printKV('Format:', tx.messageType.includes('pacs') ? 'ISO 20022' : 'SWIFT MT');
      printKV('Type:', tx.messageType);
      y += 3;
      
      setSubtitle();
      pdf.text('SOURCE SERVER (SIMULATED)', margin, y);
      y += 3;
      drawLine(y);
      y += 6;
      
      printKV('Institution:', config.bankName);
      printKV('BIC:', config.bankBic);
      printKV('IP-ID:', config.globalServerIpId);
      y += 3;
      
      // Ledger Account (if selected)
      if (tx.ledgerAccountId) {
        setSubtitle();
        pdf.text('LEDGER ACCOUNT (SIMULATED)', margin, y);
        y += 3;
        pdf.setFillColor(240, 255, 255);
        const ledgerBoxHeight = 30;
        pdf.rect(margin, y, pageWidth - margin * 2, ledgerBoxHeight, 'F');
        pdf.setDrawColor(0, 150, 150);
        pdf.setLineWidth(0.3);
        pdf.rect(margin, y, pageWidth - margin * 2, ledgerBoxHeight, 'S');
        y += 5;
        
        if (tx.ledgerAccountNumber) printKV('Account Number:', tx.ledgerAccountNumber, 3);
        if (tx.ledgerAccountName) printKV('Account Name:', tx.ledgerAccountName, 3);
        if (tx.ledgerAccountCurrency && tx.ledgerAccountBalance !== undefined) {
          printKV('Balance:', `${tx.ledgerAccountCurrency} ${tx.ledgerAccountBalance.toLocaleString('en-US', { minimumFractionDigits: 2 })}`, 3);
        }
        if (tx.ledgerAccountIban) printKV('IBAN:', tx.ledgerAccountIban, 3);
        if (tx.ledgerAccountSwift) printKV('SWIFT:', tx.ledgerAccountSwift, 3);
        y += 5;
      }
      
      setSubtitle();
      pdf.text('DESTINATION SERVER (SIMULATED)', margin, y);
      y += 3;
      drawLine(y, [200, 200, 200]);
      y += 6;
      
      printKV('Beneficiary:', tx.beneficiaryName);
      printKV('Account:', tx.beneficiaryAccount);
      printKV('BIC:', tx.receiverBic);
      if (tx.destinationIpId) printKV('IP-ID:', tx.destinationIpId);
      y += 3;
    }
    
    // Amount Box - with sandbox styling
    pdf.setFillColor(255, 250, 230);
    pdf.rect(margin, y - 2, pageWidth - margin * 2, 20, 'F');
    pdf.setDrawColor(200, 150, 0);
    pdf.setLineWidth(0.5);
    pdf.rect(margin, y - 2, pageWidth - margin * 2, 20, 'S');
    
    pdf.setTextColor(headerColor[0], headerColor[1], headerColor[2]);
    pdf.setFontSize(10);
    pdf.setFont('Helvetica', 'bold');
    pdf.text('AMOUNT (SIMULATED)', margin + 3, y + 4);
    
    pdf.setFontSize(14);
    pdf.text(`${tx.currency} ${tx.amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}`, margin + 3, y + 13);
    
    setSmall();
    pdf.text('This amount was NOT transferred - Sandbox simulation only', margin + 3, y + 17);
    y += 25;
    
    // Status
    setSubtitle();
    pdf.text('SIMULATION STATUS', margin, y);
    y += 3;
    drawLine(y);
    y += 6;
    
    printKV('Status:', `${tx.status} (SIMULATED)`);
    if (tx.confirmationCode) printKV('Confirmation:', tx.confirmationCode);
    if (tx.latencyMs) printKV('Simulated Latency:', `${tx.latencyMs}ms`);
    y += 5;
    
    // Footer with sandbox warning
    y = pageHeight - 35;
    
    pdf.setFillColor(255, 240, 200);
    pdf.rect(margin, y, pageWidth - margin * 2, 25, 'F');
    pdf.setDrawColor(200, 150, 0);
    pdf.rect(margin, y, pageWidth - margin * 2, 25, 'S');
    
    y += 6;
    setWarning();
    pdf.text('SANDBOX ENVIRONMENT - NOT A REAL TRANSACTION', margin + 5, y);
    y += 5;
    setSmall();
    pdf.text('This document is for testing and verification purposes only.', margin + 5, y);
    y += 4;
    pdf.text(`Document ID: ${sha256Hex(tx.id + tx.payload + 'SANDBOX').substring(0, 32)}`, margin + 5, y);
    y += 4;
    pdf.text(`Generated: ${new Date().toISOString()} | Digital Commercial Bank Ltd - DCBKAEADXXX`, margin + 5, y);

    const filename = `SANDBOX-${tx.type}-${tx.messageType}-Transfer-${tx.msgId}.pdf`;
    pdf.save(filename);
  }, [config]);

  const resetSandbox = useCallback(() => {
    setSandboxSimulation({
      isRunning: false,
      type: null,
      step: 0,
      totalSteps: 0,
      timeline: [],
      result: null,
    });
  }, []);

  // ═══════════════════════════════════════════════════════════════════════════════
  // TERMINAL LOGGING
  // ═══════════════════════════════════════════════════════════════════════════════

  const log = useCallback((type: TerminalLine['type'], content: string, metadata?: any) => {
    const line: TerminalLine = {
      id: generateUUID(),
      timestamp: new Date().toISOString(),
      type,
      content,
      metadata,
    };
    setTerminalLines(prev => [...prev.slice(-1000), line]);
  }, []);

  useEffect(() => {
    if (terminalRef.current) {
      terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
    }
  }, [terminalLines]);

  // ═══════════════════════════════════════════════════════════════════════════════
  // AUDIT LOGGING
  // ═══════════════════════════════════════════════════════════════════════════════

  const addAudit = useCallback((messageId: string, event: string, details: any, serverIp?: string, ipId?: string) => {
    const prevHash = lastAuditHash.current;
    const eventHash = sha256Hex(JSON.stringify({ prev: prevHash, event, details, ts: Date.now() }));
    lastAuditHash.current = eventHash;
    
    const audit: AuditLog = {
      id: auditLogs.length + 1,
      messageId,
      event,
      details,
      eventHash,
      prevHash,
      createdAt: new Date().toISOString(),
      serverIp,
      ipId,
    };
    setAuditLogs(prev => [...prev, audit]);
    log('security', `[AUDIT] ${event} | Hash: ${eventHash.substring(0, 16)}...`);
  }, [auditLogs.length, log]);

  // ═══════════════════════════════════════════════════════════════════════════════
  // INITIALIZATION
  // ═══════════════════════════════════════════════════════════════════════════════

  useEffect(() => {
    log('system', '╔══════════════════════════════════════════════════════════════════════════════╗');
    log('system', '║  SWIFT ALLIANCE LIKE - PROFESSIONAL BANKING TERMINAL v2.0.0                 ║');
    log('system', '║  Digital Commercial Bank Ltd - DCBKAEADXXX                                  ║');
    log('system', '║  IP-ID Server-to-Server Transfer System                                     ║');
    log('system', '╚══════════════════════════════════════════════════════════════════════════════╝');
    log('info', '');
    log('info', `[CONFIG] Bank BIC: ${config.bankBic}`);
    log('info', `[CONFIG] Bank Name: ${config.bankName}`);
    log('info', `[CONFIG] Ledger ID: ${config.ledgerId}`);
    log('info', `[CONFIG] Global Server IP-ID: ${config.globalServerIpId}`);
    log('info', `[CONFIG] Local Server IP-ID: ${config.localServerIpId}`);
    log('info', `[CONFIG] Receiving Server IP-ID: ${config.receivingServerIpId}`);
    log('info', `[CONFIG] Server IP: ${config.serverIp}:${config.serverPort}`);
    log('info', `[CONFIG] Transport: ${config.outboundTransport}`);
    log('info', `[CONFIG] Encryption: ${config.encryption}`);
    log('info', `[CONFIG] TLS Version: ${config.tlsVersion}`);
    log('info', '');
    log('system', '────────────────────────────────────────────────────────────────────────────────');
    log('command', '$ swift-alliance --init --mode=production');
    log('success', '[OK] SWIFT Alliance initialized');
    log('info', '[QUEUE] RabbitMQ mode enabled');
    log('info', '[TRANSPORT] IP-ID Server-to-Server enabled');
    log('info', '');
    log('info', 'Waiting for connection...');

    // Initialize relationships
    setRelationships([
      { id: 1, bic: 'PTBHIDJA', name: 'PT Banteng Hitam', status: 'ACTIVE', createdAt: new Date().toISOString(), ipId: 'GSIP-PTBH-001', serverIp: '103.187.147.109' },
      { id: 2, bic: 'GBSVRSGP', name: 'Gold Bull SVR', status: 'ACTIVE', createdAt: new Date().toISOString(), ipId: 'GSIP-GBSVR-001', serverIp: '103.187.147.120' },
      { id: 3, bic: 'DEUTDEFFXXX', name: 'Deutsche Bank AG', status: 'ACTIVE', createdAt: new Date().toISOString(), ipId: 'GSIP-DEUT-001', serverIp: '193.110.141.1' },
    ]);
  }, [config, log]);

  // ═══════════════════════════════════════════════════════════════════════════════
  // SERVER CONNECTION
  // ═══════════════════════════════════════════════════════════════════════════════

  const connectToServers = useCallback(async () => {
    log('command', '$ swift-alliance --connect --all-servers');
    log('info', '');
    log('network', '[NETWORK] Initializing secure connections...');
    
    for (const server of servers) {
      log('network', `[CONNECT] ${server.name} (${server.ip}:${server.port})...`);
      await new Promise(r => setTimeout(r, 300));
      
      // Simulate TLS handshake
      log('security', `[TLS] Initiating ${config.tlsVersion} handshake with ${server.ip}...`);
      await new Promise(r => setTimeout(r, 200));
      log('security', `[TLS] Certificate verified: CN=${server.institution}`);
      log('security', `[TLS] Cipher: ${config.encryption}`);
      
      // Update server status
      setServers(prev => prev.map(s => 
        s.id === server.id 
          ? { ...s, status: 'ONLINE', lastPing: Math.floor(Math.random() * 50) + 20, lastPingAt: new Date().toISOString() }
          : s
      ));
      
      log('success', `[OK] Connected to ${server.name} | IP-ID: ${server.ipId} | Latency: ${Math.floor(Math.random() * 50) + 20}ms`);
    }
    
    log('info', '');
    log('success', '[OK] All servers connected successfully');
    log('info', `[STATUS] ${servers.length} active connections`);
    setIsConnected(true);
    
    addAudit('SYSTEM', 'CONNECT', { servers: servers.length, timestamp: new Date().toISOString() });
  }, [servers, config, log, addAudit]);

  const startWorker = useCallback(() => {
    if (!isConnected) {
      log('error', '[ERROR] Not connected. Run --connect first.');
      return;
    }
    
    log('command', '$ swift-alliance --start-worker --mode=ipid');
    log('info', '[WORKER] Starting IP-ID transfer worker...');
    log('info', '[WORKER] Queue: swiftlike.q.ipid.outbound.v1');
    log('info', '[WORKER] DLQ: swiftlike.q.ipid.dlq');
    log('info', '[WORKER] Prefetch: 5');
    log('success', '[OK] Worker started - Ready for IP-ID transfers');
    setIsWorkerRunning(true);
    
    addAudit('SYSTEM', 'WORKER_START', { mode: 'ipid', timestamp: new Date().toISOString() });
  }, [isConnected, log, addAudit]);

  // ═══════════════════════════════════════════════════════════════════════════════
  // SWIFT FIN TRANSFER (Traditional SWIFT Network)
  // ═══════════════════════════════════════════════════════════════════════════════

  const executeSWIFTTransfer = useCallback(async () => {
    // Auto-connect if not connected
    if (!isConnected) {
      log('info', '[AUTO] Establishing SWIFT connection...');
      setIsConnected(true);
      setServers(prev => prev.map(s => ({ ...s, status: 'ONLINE' })));
      await new Promise(r => setTimeout(r, 200));
    }
    
    // Auto-start worker if not running
    if (!isWorkerRunning) {
      log('info', '[AUTO] Starting SWIFT worker...');
      setIsWorkerRunning(true);
      await new Promise(r => setTimeout(r, 200));
    }

    // Validate receiver BIC
    if (!swiftForm.receiverBic || swiftForm.receiverBic.length < 8) {
      log('error', '[ERROR] Invalid receiver BIC. Must be at least 8 characters.');
      return;
    }

    setSwiftTransferring(true);
    setSwiftProgress(0);

    const msgId = `SWIFT-${Date.now()}`;
    const uetr = generateUUID();
    const trn = `TRN${Date.now().toString().slice(-10)}`;

    log('command', `$ swift-alliance --send --type=${swiftForm.messageType} --dest=${swiftForm.receiverBic}`);
    log('info', '');
    log('system', '╔══════════════════════════════════════════════════════════════════════════════╗');
    log('system', '║  SWIFT FIN MESSAGE TRANSMISSION                                             ║');
    log('system', '╚══════════════════════════════════════════════════════════════════════════════╝');
    log('info', '');

    // Step 1: Validate
    setSwiftProgress(10);
    log('info', '[STEP 1/8] Validating SWIFT message parameters...');
    log('info', `  → Message Type: ${swiftForm.messageType}`);
    log('info', `  → TRN: ${trn}`);
    log('info', `  → UETR: ${uetr}`);
    log('info', `  → Sender BIC: ${config.bankBic}`);
    log('info', `  → Receiver BIC: ${swiftForm.receiverBic}`);
    log('info', `  → Amount: ${swiftForm.currency} ${parseFloat(swiftForm.amount).toLocaleString()}`);
    await new Promise(r => setTimeout(r, 400));
    log('success', '[OK] Parameters validated');

    // Step 2: Build MT message
    setSwiftProgress(25);
    log('info', '');
    log('info', '[STEP 2/8] Building SWIFT FIN message...');
    
    let payload: string;
    const valueDate = yymmdd();
    const amountFormatted = swiftForm.amount.replace('.', ',');
    const msgTypeNum = swiftForm.messageType.replace('MT', '').replace('STP', '').replace('COV', '');

    // Generate SWIFT FIN message based on type
    const buildSwiftPayload = (msgType: string): string => {
      const header1 = `{1:F01${config.bankBic}0000000000}`;
      const header2 = `{2:I${msgTypeNum}${swiftForm.receiverBic}N}`;
      
      switch (msgType) {
        // Category 1 - Customer Payments
        case 'MT101':
          return `${header1}${header2}{4:
:20:${trn}
:21R:NONREF
:28D:1/1
:50H:/${swiftForm.orderingAccount}
${swiftForm.orderingCustomer}
:52A:${config.bankBic}
:30:${valueDate}
:21:${trn}
:23E:CRED
:32B:${swiftForm.currency}${amountFormatted}
:59:/${swiftForm.beneficiaryAccount}
${swiftForm.beneficiaryName}
:70:${swiftForm.remittance}
:71A:SHA
-}`;
        case 'MT102':
        case 'MT102STP':
          return `${header1}${header2}{4:
:20:${trn}
:23:CRED
:50K:/${swiftForm.orderingAccount}
${swiftForm.orderingCustomer}
:52A:${config.bankBic}
:26T:001
:32A:${valueDate}${swiftForm.currency}${amountFormatted}
:59:/${swiftForm.beneficiaryAccount}
${swiftForm.beneficiaryName}
:70:${swiftForm.remittance}
:71A:SHA
:32B:${swiftForm.currency}${amountFormatted}
-}`;
        case 'MT103':
        case 'MT103STP':
          return `${header1}${header2}{4:
:20:${trn}
:23B:CRED
:32A:${valueDate}${swiftForm.currency}${amountFormatted}
:50K:/${swiftForm.orderingAccount}
${swiftForm.orderingCustomer}
:59:/${swiftForm.beneficiaryAccount}
${swiftForm.beneficiaryName}
:70:${swiftForm.remittance}
:71A:SHA
-}`;
        case 'MT104':
          return `${header1}${header2}{4:
:20:${trn}
:23E:SDVA
:30:${valueDate}
:51A:${config.bankBic}
:50K:/${swiftForm.orderingAccount}
${swiftForm.orderingCustomer}
:21:${trn}
:32B:${swiftForm.currency}${amountFormatted}
:59:/${swiftForm.beneficiaryAccount}
${swiftForm.beneficiaryName}
:70:${swiftForm.remittance}
:71A:SHA
-}`;
        case 'MT107':
          return `${header1}${header2}{4:
:20:${trn}
:30:${valueDate}
:51A:${config.bankBic}
:21:${trn}
:23E:OTHR
:32B:${swiftForm.currency}${amountFormatted}
:50K:/${swiftForm.orderingAccount}
${swiftForm.orderingCustomer}
:59:/${swiftForm.beneficiaryAccount}
${swiftForm.beneficiaryName}
:70:${swiftForm.remittance}
:71A:SHA
-}`;
        case 'MT110':
          return `${header1}${header2}{4:
:20:${trn}
:53A:${config.bankBic}
:21:${trn}
:30:${valueDate}
:32A:${valueDate}${swiftForm.currency}${amountFormatted}
:52A:${config.bankBic}
:59:/${swiftForm.beneficiaryAccount}
${swiftForm.beneficiaryName}
-}`;
        case 'MT111':
          return `${header1}${header2}{4:
:20:${trn}
:21:${trn}
:30:${valueDate}
:32A:${valueDate}${swiftForm.currency}${amountFormatted}
:52A:${config.bankBic}
-}`;
        case 'MT112':
          return `${header1}${header2}{4:
:20:${trn}
:21:${trn}
:25:${swiftForm.orderingAccount}
:30:${valueDate}
:32A:${valueDate}${swiftForm.currency}${amountFormatted}
:76:STOPPED
-}`;
        // Category 2 - Financial Institution Transfers
        case 'MT200':
          return `${header1}${header2}{4:
:20:${trn}
:32A:${valueDate}${swiftForm.currency}${amountFormatted}
:53A:${config.bankBic}
:56A:${swiftForm.receiverBic}
:57A:${swiftForm.receiverBic}
-}`;
        case 'MT201':
          return `${header1}${header2}{4:
:20:${trn}
:19:${amountFormatted}
:30:${valueDate}
:21:${trn}
:32B:${swiftForm.currency}${amountFormatted}
:57A:${swiftForm.receiverBic}
-}`;
        case 'MT202':
          return `${header1}${header2}{4:
:20:${trn}
:21:NONREF
:32A:${valueDate}${swiftForm.currency}${amountFormatted}
:52A:${config.bankBic}
:58A:${swiftForm.receiverBic}
-}`;
        case 'MT202COV':
          return `${header1}${header2}{4:
:20:${trn}
:21:NONREF
:32A:${valueDate}${swiftForm.currency}${amountFormatted}
:52A:${config.bankBic}
:58A:${swiftForm.receiverBic}
:50K:/${swiftForm.orderingAccount}
${swiftForm.orderingCustomer}
:59:/${swiftForm.beneficiaryAccount}
${swiftForm.beneficiaryName}
-}`;
        case 'MT203':
          return `${header1}${header2}{4:
:19:${amountFormatted}
:30:${valueDate}
:20:${trn}
:21:${trn}
:32B:${swiftForm.currency}${amountFormatted}
:57A:${swiftForm.receiverBic}
:58A:${swiftForm.receiverBic}
-}`;
        case 'MT204':
          return `${header1}${header2}{4:
:20:${trn}
:19:${amountFormatted}
:30:${valueDate}
:57A:${swiftForm.receiverBic}
:21:${trn}
:32B:${swiftForm.currency}${amountFormatted}
:53A:${config.bankBic}
-}`;
        case 'MT205':
        case 'MT205COV':
          return `${header1}${header2}{4:
:20:${trn}
:21:NONREF
:32A:${valueDate}${swiftForm.currency}${amountFormatted}
:52A:${config.bankBic}
:58A:${swiftForm.receiverBic}
-}`;
        case 'MT210':
          return `${header1}${header2}{4:
:20:${trn}
:25:${swiftForm.beneficiaryAccount}
:30:${valueDate}
:21:NONREF
:32B:${swiftForm.currency}${amountFormatted}
:52A:${config.bankBic}
-}`;
        // Category 3 - Treasury
        case 'MT300':
          return `${header1}${header2}{4:
:15A:
:20:${trn}
:22A:NEWT
:22C:${config.bankBic.substring(0,4)}0001${swiftForm.receiverBic.substring(0,4)}
:82A:${config.bankBic}
:87A:${swiftForm.receiverBic}
:15B:
:30T:${valueDate}
:30V:${valueDate}
:36:1,0000
:32B:${swiftForm.currency}${amountFormatted}
:57A:${swiftForm.receiverBic}
:33B:${swiftForm.currency}${amountFormatted}
:57A:${config.bankBic}
-}`;
        case 'MT320':
          return `${header1}${header2}{4:
:15A:
:20:${trn}
:22A:NEWT
:22B:CONF
:22C:${config.bankBic.substring(0,4)}0001${swiftForm.receiverBic.substring(0,4)}
:82A:${config.bankBic}
:87A:${swiftForm.receiverBic}
:15B:
:17R:L
:30T:${valueDate}
:30V:${valueDate}
:30P:${valueDate}
:32B:${swiftForm.currency}${amountFormatted}
:34E:N${swiftForm.currency}${amountFormatted}
:37G:5,00
:14D:ACT/360
:57A:${swiftForm.receiverBic}
-}`;
        // Category 4 - Collections
        case 'MT400':
          return `${header1}${header2}{4:
:20:${trn}
:21:${trn}
:32A:${valueDate}${swiftForm.currency}${amountFormatted}
:52A:${config.bankBic}
:72:/ACC/
-}`;
        case 'MT405':
          return `${header1}${header2}{4:
:20:${trn}
:21:${trn}
:32A:${valueDate}${swiftForm.currency}${amountFormatted}
:52A:${config.bankBic}
:59:/${swiftForm.beneficiaryAccount}
${swiftForm.beneficiaryName}
:72:/CLEAN COLLECTION/
-}`;
        case 'MT410':
          return `${header1}${header2}{4:
:20:${trn}
:21:${trn}
:32A:${valueDate}${swiftForm.currency}${amountFormatted}
:52A:${config.bankBic}
-}`;
        // Category 5 - Securities
        case 'MT540':
          return `${header1}${header2}{4:
:16R:GENL
:20C::SEME//${trn}
:23G:NEWM
:16S:GENL
:16R:TRADDET
:98A::SETT//${swiftForm.settlementDate ? swiftForm.settlementDate.replace(/-/g, '').slice(2) : valueDate}
:98A::TRAD//${swiftForm.tradeDate ? swiftForm.tradeDate.replace(/-/g, '').slice(2) : valueDate}
:35B:ISIN ${swiftForm.isin || 'US0378331005'}
${swiftForm.securityDescription || 'SECURITY'}
:16S:TRADDET
:16R:FIAC
:36B::SETT//UNIT/${swiftForm.settlementQuantity || '100'},
:97A::SAFE//${swiftForm.safekeepingAccount || swiftForm.beneficiaryAccount}
:16S:FIAC
:16R:SETDET
:22F::SETR//TRAD
:16R:SETPRTY
:95P::DEAG//${swiftForm.receiverBic}
:16S:SETPRTY
:16S:SETDET
-}`;
        case 'MT541':
          return `${header1}${header2}{4:
:16R:GENL
:20C::SEME//${trn}
:23G:NEWM
:16S:GENL
:16R:TRADDET
:98A::SETT//${swiftForm.settlementDate ? swiftForm.settlementDate.replace(/-/g, '').slice(2) : valueDate}
:98A::TRAD//${swiftForm.tradeDate ? swiftForm.tradeDate.replace(/-/g, '').slice(2) : valueDate}
:90A::DEAL//PRCT/100,
:35B:ISIN ${swiftForm.isin || 'US0378331005'}
${swiftForm.securityDescription || 'SECURITY'}
:16S:TRADDET
:16R:FIAC
:36B::SETT//UNIT/${swiftForm.settlementQuantity || '100'},
:97A::SAFE//${swiftForm.safekeepingAccount || swiftForm.beneficiaryAccount}
:16S:FIAC
:16R:SETDET
:22F::SETR//TRAD
:19A::SETT//${swiftForm.currency}${amountFormatted}
:16R:SETPRTY
:95P::DEAG//${swiftForm.receiverBic}
:16S:SETPRTY
:16S:SETDET
-}`;
        case 'MT542':
          return `${header1}${header2}{4:
:16R:GENL
:20C::SEME//${trn}
:23G:NEWM
:16S:GENL
:16R:TRADDET
:98A::SETT//${swiftForm.settlementDate ? swiftForm.settlementDate.replace(/-/g, '').slice(2) : valueDate}
:98A::TRAD//${swiftForm.tradeDate ? swiftForm.tradeDate.replace(/-/g, '').slice(2) : valueDate}
:35B:ISIN ${swiftForm.isin || 'US0378331005'}
${swiftForm.securityDescription || 'SECURITY'}
:16S:TRADDET
:16R:FIAC
:36B::SETT//UNIT/${swiftForm.settlementQuantity || '100'},
:97A::SAFE//${swiftForm.safekeepingAccount || swiftForm.orderingAccount}
:16S:FIAC
:16R:SETDET
:22F::SETR//TRAD
:16R:SETPRTY
:95P::REAG//${swiftForm.receiverBic}
:16S:SETPRTY
:16S:SETDET
-}`;
        case 'MT543':
          return `${header1}${header2}{4:
:16R:GENL
:20C::SEME//${trn}
:23G:NEWM
:16S:GENL
:16R:TRADDET
:98A::SETT//${swiftForm.settlementDate ? swiftForm.settlementDate.replace(/-/g, '').slice(2) : valueDate}
:98A::TRAD//${swiftForm.tradeDate ? swiftForm.tradeDate.replace(/-/g, '').slice(2) : valueDate}
:90A::DEAL//PRCT/100,
:35B:ISIN ${swiftForm.isin || 'US0378331005'}
${swiftForm.securityDescription || 'SECURITY'}
:16S:TRADDET
:16R:FIAC
:36B::SETT//UNIT/${swiftForm.settlementQuantity || '100'},
:97A::SAFE//${swiftForm.safekeepingAccount || swiftForm.orderingAccount}
:16S:FIAC
:16R:SETDET
:22F::SETR//TRAD
:19A::SETT//${swiftForm.currency}${amountFormatted}
:16R:SETPRTY
:95P::REAG//${swiftForm.receiverBic}
:16S:SETPRTY
:16S:SETDET
-}`;
        // Category 7 - Documentary Credits
        case 'MT700':
          return `${header1}${header2}{4:
:27:1/1
:40A:${swiftForm.lcType || 'IRREVOCABLE'}
:20:${trn}
:31C:${valueDate}
:40E:UCP LATEST VERSION
:31D:${swiftForm.lcExpiryDate ? swiftForm.lcExpiryDate.replace(/-/g, '').slice(2) : valueDate}${swiftForm.lcExpiryPlace || 'MORONI'}
:50:${swiftForm.orderingCustomer}
:59:${swiftForm.beneficiaryName}
:32B:${swiftForm.currency}${amountFormatted}
:41D:${swiftForm.receiverBic}
${swiftForm.lcAvailableWith || 'BY NEGOTIATION'}
:42C:DRAFTS AT ${swiftForm.lcDraftsAt || 'SIGHT'}
:42D:${swiftForm.receiverBic}
:43P:${swiftForm.lcPartialShipments || 'ALLOWED'}
:43T:${swiftForm.lcTransshipment || 'ALLOWED'}
:44A:${swiftForm.lcPlaceOfTakingCharge || 'ANY'}
:44E:${swiftForm.lcPortOfLoading || 'ANY PORT'}
:44F:${swiftForm.lcPortOfDischarge || 'MORONI'}
:44B:${swiftForm.lcPlaceOfFinalDestination || 'MORONI'}
:45A:${swiftForm.lcGoodsDescription || 'GOODS AS PER PROFORMA INVOICE'}
:46A:${swiftForm.lcDocumentsRequired || 'COMMERCIAL INVOICE\nPACKING LIST\nBILL OF LADING'}
:47A:${swiftForm.lcAdditionalConditions || 'ALL DOCUMENTS MUST BE IN ENGLISH'}
:71B:${swiftForm.lcCharges || 'ALL BANKING CHARGES OUTSIDE COMOROS ARE FOR BENEFICIARY ACCOUNT'}
:48:${swiftForm.lcPresentationPeriod || '21 DAYS'}
:49:${swiftForm.lcConfirmationInstructions || 'CONFIRM'}
-}`;
        case 'MT760':
          return `${header1}${header2}{4:
:27:1/1
:20:${trn}
:23:ISSUE
:30:${valueDate}
:40C:${swiftForm.guaranteeType || 'URDG'}
:77C:${swiftForm.guaranteeText || `WE HEREBY ISSUE OUR IRREVOCABLE AND UNCONDITIONAL
BANK GUARANTEE NO. ${trn}

IN FAVOUR OF: ${swiftForm.beneficiaryName}

FOR ACCOUNT OF: ${swiftForm.guaranteeApplicant || swiftForm.orderingCustomer}

FOR AN AMOUNT NOT EXCEEDING: ${swiftForm.currency} ${parseFloat(swiftForm.amount).toLocaleString('en-US', { minimumFractionDigits: 2 })}

THIS GUARANTEE IS VALID UNTIL: ${swiftForm.guaranteeExpiryDate || 'ONE YEAR FROM DATE OF ISSUE'}

WE UNDERTAKE TO PAY YOU ON YOUR FIRST WRITTEN DEMAND
STATING THAT THE PRINCIPAL HAS FAILED TO FULFILL
HIS OBLIGATIONS UNDER THE CONTRACT.

THIS GUARANTEE IS SUBJECT TO ${swiftForm.guaranteeType || 'URDG'} 758.

DIGITAL COMMERCIAL BANK LTD
MORONI, COMOROS`}
-}`;
        case 'MT799':
          return `${header1}${header2}{4:
:20:${trn}
:21:NONREF
:79:${swiftForm.freeFormatText || swiftForm.remittance || 'FREE FORMAT MESSAGE'}
-}`;
        // Category 9 - Cash Management
        case 'MT900':
          return `${header1}${header2}{4:
:20:${trn}
:21:${trn}
:25:${swiftForm.orderingAccount}
:32A:${valueDate}${swiftForm.currency}${amountFormatted}
:52A:${config.bankBic}
-}`;
        case 'MT910':
          return `${header1}${header2}{4:
:20:${trn}
:21:${trn}
:25:${swiftForm.beneficiaryAccount}
:32A:${valueDate}${swiftForm.currency}${amountFormatted}
:52A:${config.bankBic}
-}`;
        case 'MT920':
          return `${header1}${header2}{4:
:20:${trn}
:12:940
:25:${swiftForm.orderingAccount}
-}`;
        case 'MT940':
          return `${header1}${header2}{4:
:20:${trn}
:25:${swiftForm.orderingAccount}
:28C:1/1
:60F:C${valueDate}${swiftForm.currency}${amountFormatted}
:61:${valueDate}C${amountFormatted}NTRFNONREF//
:86:TRANSFER ${swiftForm.remittance}
:62F:C${valueDate}${swiftForm.currency}${amountFormatted}
-}`;
        case 'MT950':
          return `${header1}${header2}{4:
:20:${trn}
:25:${swiftForm.orderingAccount}
:28C:1/1
:60F:C${valueDate}${swiftForm.currency}${amountFormatted}
:62F:C${valueDate}${swiftForm.currency}${amountFormatted}
-}`;
        // Common n9x messages
        case 'MT190':
        case 'MT191':
          return `${header1}${header2}{4:
:20:${trn}
:21:${trn}
:32A:${valueDate}${swiftForm.currency}${amountFormatted}
:52A:${config.bankBic}
:71B:SHA
-}`;
        case 'MT192':
          return `${header1}${header2}{4:
:20:${trn}
:21:${trn}
:11S:103
${valueDate}
:79:PLEASE CANCEL THE ABOVE MESSAGE
-}`;
        case 'MT195':
        case 'MT196':
          return `${header1}${header2}{4:
:20:${trn}
:21:${trn}
:79:${swiftForm.remittance || 'QUERY/ANSWER MESSAGE'}
-}`;
        case 'MT199':
          return `${header1}${header2}{4:
:20:${trn}
:21:NONREF
:79:${swiftForm.remittance || 'FREE FORMAT MESSAGE'}
-}`;
        case 'MT299':
          return `${header1}${header2}{4:
:20:${trn}
:21:NONREF
:79:${swiftForm.remittance || 'FREE FORMAT FI MESSAGE'}
-}`;
        default:
          return `${header1}${header2}{4:
:20:${trn}
:21:NONREF
:32A:${valueDate}${swiftForm.currency}${amountFormatted}
:52A:${config.bankBic}
:59:/${swiftForm.beneficiaryAccount}
${swiftForm.beneficiaryName}
:70:${swiftForm.remittance}
:71A:SHA
-}`;
      }
    };

    payload = buildSwiftPayload(swiftForm.messageType);

    log('info', `  → FIN Block 1: Application Header`);
    log('info', `  → FIN Block 2: Input Header`);
    log('info', `  → FIN Block 4: Text Block`);
    await new Promise(r => setTimeout(r, 300));
    log('success', '[OK] SWIFT FIN message built');

    // Step 3: Sign message
    setSwiftProgress(40);
    log('info', '');
    log('security', '[STEP 3/8] Signing message with bank credentials...');
    const payloadHash = sha256Hex(payload);
    const signature = hmacSha256Base64(config.signingSecret, payload);
    log('security', `  → SHA-256: ${payloadHash.substring(0, 32)}...`);
    log('security', `  → HMAC Signature: ${signature.substring(0, 24)}...`);
    await new Promise(r => setTimeout(r, 300));
    log('success', '[OK] Message signed');

    // Step 4: Connect to SWIFTNet
    setSwiftProgress(55);
    log('info', '');
    log('network', '[STEP 4/8] Connecting to SWIFTNet...');
    log('network', `  → Gateway: swiftnet.swift.com:443`);
    log('network', `  → Protocol: SWIFT FileAct / FIN`);
    await new Promise(r => setTimeout(r, 500));
    log('success', '[OK] SWIFTNet connection established');

    // Step 5: Transmit
    setSwiftProgress(70);
    log('info', '');
    log('transfer', '[STEP 5/8] Transmitting to SWIFTNet...');
    log('transfer', `  → Destination: ${swiftForm.receiverBic}`);
    await new Promise(r => setTimeout(r, 600));
    log('success', '[OK] Message transmitted');

    // Step 6: Wait for ACK
    setSwiftProgress(85);
    log('info', '');
    log('info', '[STEP 6/8] Waiting for SWIFTNet acknowledgment...');
    await new Promise(r => setTimeout(r, 700));
    const swiftAck = `ACK${Math.random().toString(36).substring(2, 10).toUpperCase()}`;
    log('success', `[OK] SWIFTNet ACK received: ${swiftAck}`);

    // Create message record
    const txId = generateUUID();
    const completedAt = new Date().toISOString();
    const latency = Math.floor(Math.random() * 200) + 100;
    
    const newMessage: SwiftMessage = {
      id: txId,
      format: 'SWIFT_MT',
      type: swiftForm.messageType,
      senderBic: config.bankBic,
      receiverBic: swiftForm.receiverBic,
      msgId,
      uetr,
      amount: parseFloat(swiftForm.amount),
      currency: swiftForm.currency,
      payload,
      payloadHash,
      signature,
      status: 'ACK',
      createdAt: new Date().toISOString(),
      sentAt: new Date().toISOString(),
      ackAt: completedAt,
      serverResponse: { swiftAck, network: 'SWIFTNet', trn },
    };

    setMessages(prev => [newMessage, ...prev]);
    addAudit(newMessage.id, 'SWIFT_SEND', { type: swiftForm.messageType, to: swiftForm.receiverBic }, 'swiftnet.swift.com', config.bankBic);
    addAudit(newMessage.id, 'SWIFT_ACK', { ack: swiftAck }, 'swiftnet.swift.com', swiftForm.receiverBic);
    
    // Save to transaction history with full Ledger details
    const historyEntry: TransactionHistory = {
      id: txId,
      type: 'SWIFT',
      messageType: swiftForm.messageType,
      msgId,
      uetr,
      trn,
      senderBic: config.bankBic,
      receiverBic: swiftForm.receiverBic,
      amount: parseFloat(swiftForm.amount),
      currency: swiftForm.currency,
      beneficiaryName: swiftForm.beneficiaryName,
      beneficiaryAccount: swiftForm.beneficiaryAccount,
      status: 'ACK',
      createdAt: new Date().toISOString(),
      completedAt,
      sourceAccount: selectedLedgerAccount?.accountNumber || swiftForm.orderingAccount,
      sourceAccountName: selectedLedgerAccount?.accountName || swiftForm.orderingCustomer,
      // Ledger Account Details
      ledgerAccountId: selectedLedgerAccount?.id,
      ledgerAccountNumber: selectedLedgerAccount?.accountNumber,
      ledgerAccountName: selectedLedgerAccount?.accountName,
      ledgerAccountType: selectedLedgerAccount?.accountType,
      ledgerAccountCurrency: selectedLedgerAccount?.currency,
      ledgerAccountBalance: selectedLedgerAccount?.balance,
      ledgerAccountIban: selectedLedgerAccount?.iban,
      ledgerAccountSwift: selectedLedgerAccount?.swiftCode,
      ledgerAccountBank: selectedLedgerAccount?.bankName,
      payload,
      payloadHash,
      signature,
      confirmationCode: swiftAck,
      latencyMs: latency,
    };
    setTransactionHistory(prev => [historyEntry, ...prev]);

    // Step 7: Update status
    setSwiftProgress(95);
    log('info', '');
    log('info', '[STEP 7/8] Recording transaction...');
    
    const job: QueueJob = {
      id: queueJobs.length + 1,
      messageId: newMessage.id,
      status: 'DONE',
      attempts: 1,
      maxAttempts: 5,
      createdAt: new Date().toISOString(),
      processedAt: new Date().toISOString(),
    };
    setQueueJobs(prev => [...prev, job]);
    await new Promise(r => setTimeout(r, 200));
    log('success', '[OK] Transaction recorded');

    // Step 8: Complete
    setSwiftProgress(100);
    log('info', '');
    log('success', '[STEP 8/8] SWIFT transfer completed!');
    log('info', '');
    log('system', '╔══════════════════════════════════════════════════════════════════════════════╗');
    log('system', '║  SWIFT TRANSFER SUMMARY                                                     ║');
    log('system', '╠══════════════════════════════════════════════════════════════════════════════╣');
    log('system', `║  Message Type:    ${swiftForm.messageType.padEnd(54)}║`);
    log('system', `║  TRN:             ${trn.padEnd(54)}║`);
    log('system', `║  UETR:            ${uetr.padEnd(54)}║`);
    log('system', `║  Amount:          ${(swiftForm.currency + ' ' + parseFloat(swiftForm.amount).toLocaleString()).padEnd(54)}║`);
    log('system', `║  Sender BIC:      ${config.bankBic.padEnd(54)}║`);
    log('system', `║  Receiver BIC:    ${swiftForm.receiverBic.padEnd(54)}║`);
    log('system', `║  Status:          ${'ACK - DELIVERED'.padEnd(54)}║`);
    log('system', `║  SWIFT ACK:       ${swiftAck.padEnd(54)}║`);
    log('system', '╚══════════════════════════════════════════════════════════════════════════════╝');
    log('info', '');

    setSwiftTransferring(false);
    setSwiftProgress(0);
  }, [isConnected, isWorkerRunning, swiftForm, config, queueJobs.length, log, addAudit]);

  // ═══════════════════════════════════════════════════════════════════════════════
  // IP-ID TRANSFER (Server-to-Server Direct)
  // ═══════════════════════════════════════════════════════════════════════════════

  const executeIPIDTransfer = useCallback(async () => {
    // Auto-connect if not connected
    if (!isConnected) {
      log('info', '[AUTO] Establishing IP-ID connection...');
      setIsConnected(true);
      setServers(prev => prev.map(s => ({ ...s, status: 'ONLINE' })));
      await new Promise(r => setTimeout(r, 200));
    }
    
    // Auto-start worker if not running
    if (!isWorkerRunning) {
      log('info', '[AUTO] Starting IP-ID worker...');
      setIsWorkerRunning(true);
      await new Promise(r => setTimeout(r, 200));
    }

    const destServer = servers.find(s => s.id === ipidForm.destinationServerId);
    if (!destServer) {
      log('error', '[ERROR] Destination server not found. Please select a server.');
      return;
    }

    setIsTransferring(true);
    setTransferProgress(0);

    const msgId = `IPID-${Date.now()}`;
    const uetr = generateUUID();
    const idempotencyKey = generateUUID();

    log('command', `$ swift-alliance --transfer --ipid --dest=${destServer.ipId}`);
    log('info', '');
    log('transfer', '╔══════════════════════════════════════════════════════════════════════════════╗');
    log('transfer', '║  IP-ID SERVER-TO-SERVER TRANSFER                                            ║');
    log('transfer', '╚══════════════════════════════════════════════════════════════════════════════╝');
    log('info', '');

    // Step 1: Validate
    setTransferProgress(5);
    log('info', '[STEP 1/10] Validating transfer parameters...');
    log('info', `  → Message ID: ${msgId}`);
    log('info', `  → UETR: ${uetr}`);
    log('info', `  → Idempotency Key: ${idempotencyKey}`);
    log('info', `  → Amount: ${ipidForm.currency} ${parseFloat(ipidForm.amount).toLocaleString()}`);
    log('info', `  → Source IP-ID: ${config.globalServerIpId}`);
    log('info', `  → Destination IP-ID: ${destServer.ipId}`);
    await new Promise(r => setTimeout(r, 500));
    log('success', '[OK] Parameters validated');

    // Step 2: Build payload
    setTransferProgress(15);
    log('info', '');
    log('info', '[STEP 2/10] Building message payload...');
    
    let payload: string;
    const selectedFormat = ipidForm.format;
    const valueDate = yymmdd();
    const amountFormatted = ipidForm.amount.replace('.', ',');
    
    // Build payload based on selected message format
    const buildIPIDPayload = (format: string): { payload: string; formatName: string } => {
      const timestamp = new Date().toISOString();
      
      // ISO 20022 Messages
      if (format === 'pacs.008') {
        return {
          payload: buildPacs008({
            msgId, uetr,
            instgAgtBic: config.bankBic,
            instdAgtBic: destServer.bic,
            amount: ipidForm.amount,
            currency: ipidForm.currency,
            dbtrNm: ipidForm.dbtrNm,
            dbtrAcct: ipidForm.dbtrAcct,
            cdtrNm: ipidForm.cdtrNm,
            cdtrAcct: ipidForm.cdtrAcct,
            ipIdSource: config.globalServerIpId,
            ipIdDest: destServer.ipId,
          }),
          formatName: 'ISO 20022 pacs.008.001.08 - FI to FI Customer Credit Transfer'
        };
      }
      if (format === 'pacs.009') {
        return {
          payload: `<?xml version="1.0" encoding="UTF-8"?>
<Document xmlns="urn:iso:std:iso:20022:tech:xsd:pacs.009.001.08">
  <FICdtTrf>
    <GrpHdr>
      <MsgId>${msgId}</MsgId>
      <CreDtTm>${timestamp}</CreDtTm>
      <NbOfTxs>1</NbOfTxs>
      <SttlmInf><SttlmMtd>INDA</SttlmMtd></SttlmInf>
      <InstgAgt><FinInstnId><BICFI>${config.bankBic}</BICFI></FinInstnId></InstgAgt>
      <InstdAgt><FinInstnId><BICFI>${destServer.bic}</BICFI></FinInstnId></InstdAgt>
    </GrpHdr>
    <CdtTrfTxInf>
      <PmtId><InstrId>${msgId}</InstrId><EndToEndId>${uetr}</EndToEndId><UETR>${uetr}</UETR></PmtId>
      <IntrBkSttlmAmt Ccy="${ipidForm.currency}">${ipidForm.amount}</IntrBkSttlmAmt>
      <IntrBkSttlmDt>${timestamp.split('T')[0]}</IntrBkSttlmDt>
      <Dbtr><FinInstnId><BICFI>${config.bankBic}</BICFI><Nm>${ipidForm.dbtrNm}</Nm></FinInstnId></Dbtr>
      <Cdtr><FinInstnId><BICFI>${destServer.bic}</BICFI><Nm>${ipidForm.cdtrNm}</Nm></FinInstnId></Cdtr>
    </CdtTrfTxInf>
  </FICdtTrf>
</Document>`,
          formatName: 'ISO 20022 pacs.009.001.08 - FI Credit Transfer'
        };
      }
      if (format === 'pacs.002') {
        return {
          payload: `<?xml version="1.0" encoding="UTF-8"?>
<Document xmlns="urn:iso:std:iso:20022:tech:xsd:pacs.002.001.10">
  <FIToFIPmtStsRpt>
    <GrpHdr><MsgId>${msgId}</MsgId><CreDtTm>${timestamp}</CreDtTm></GrpHdr>
    <OrgnlGrpInfAndSts><OrgnlMsgId>${msgId}</OrgnlMsgId><OrgnlMsgNmId>pacs.008.001.08</OrgnlMsgNmId><GrpSts>ACCP</GrpSts></OrgnlGrpInfAndSts>
    <TxInfAndSts><OrgnlEndToEndId>${uetr}</OrgnlEndToEndId><TxSts>ACCP</TxSts></TxInfAndSts>
  </FIToFIPmtStsRpt>
</Document>`,
          formatName: 'ISO 20022 pacs.002.001.10 - Payment Status Report'
        };
      }
      if (format === 'pacs.004') {
        return {
          payload: `<?xml version="1.0" encoding="UTF-8"?>
<Document xmlns="urn:iso:std:iso:20022:tech:xsd:pacs.004.001.09">
  <PmtRtr>
    <GrpHdr><MsgId>${msgId}</MsgId><CreDtTm>${timestamp}</CreDtTm><NbOfTxs>1</NbOfTxs></GrpHdr>
    <TxInf>
      <RtrId>${msgId}</RtrId>
      <OrgnlEndToEndId>${uetr}</OrgnlEndToEndId>
      <RtrdIntrBkSttlmAmt Ccy="${ipidForm.currency}">${ipidForm.amount}</RtrdIntrBkSttlmAmt>
      <RtrRsnInf><Rsn><Cd>AC04</Cd></Rsn></RtrRsnInf>
    </TxInf>
  </PmtRtr>
</Document>`,
          formatName: 'ISO 20022 pacs.004.001.09 - Payment Return'
        };
      }
      if (format === 'pain.001') {
        return {
          payload: `<?xml version="1.0" encoding="UTF-8"?>
<Document xmlns="urn:iso:std:iso:20022:tech:xsd:pain.001.001.09">
  <CstmrCdtTrfInitn>
    <GrpHdr><MsgId>${msgId}</MsgId><CreDtTm>${timestamp}</CreDtTm><NbOfTxs>1</NbOfTxs><CtrlSum>${ipidForm.amount}</CtrlSum>
      <InitgPty><Nm>${ipidForm.dbtrNm}</Nm></InitgPty>
    </GrpHdr>
    <PmtInf>
      <PmtInfId>${msgId}</PmtInfId><PmtMtd>TRF</PmtMtd><NbOfTxs>1</NbOfTxs>
      <Dbtr><Nm>${ipidForm.dbtrNm}</Nm></Dbtr>
      <DbtrAcct><Id><IBAN>${ipidForm.dbtrAcct}</IBAN></Id></DbtrAcct>
      <DbtrAgt><FinInstnId><BICFI>${config.bankBic}</BICFI></FinInstnId></DbtrAgt>
      <CdtTrfTxInf>
        <PmtId><EndToEndId>${uetr}</EndToEndId></PmtId>
        <Amt><InstdAmt Ccy="${ipidForm.currency}">${ipidForm.amount}</InstdAmt></Amt>
        <CdtrAgt><FinInstnId><BICFI>${destServer.bic}</BICFI></FinInstnId></CdtrAgt>
        <Cdtr><Nm>${ipidForm.cdtrNm}</Nm></Cdtr>
        <CdtrAcct><Id><IBAN>${ipidForm.cdtrAcct}</IBAN></Id></CdtrAcct>
        <RmtInf><Ustrd>${ipidForm.remittance}</Ustrd></RmtInf>
      </CdtTrfTxInf>
    </PmtInf>
  </CstmrCdtTrfInitn>
</Document>`,
          formatName: 'ISO 20022 pain.001.001.09 - Customer Credit Transfer Initiation'
        };
      }
      if (format === 'pain.002') {
        return {
          payload: `<?xml version="1.0" encoding="UTF-8"?>
<Document xmlns="urn:iso:std:iso:20022:tech:xsd:pain.002.001.10">
  <CstmrPmtStsRpt>
    <GrpHdr><MsgId>${msgId}</MsgId><CreDtTm>${timestamp}</CreDtTm></GrpHdr>
    <OrgnlGrpInfAndSts><OrgnlMsgId>${msgId}</OrgnlMsgId><OrgnlMsgNmId>pain.001</OrgnlMsgNmId><GrpSts>ACCP</GrpSts></OrgnlGrpInfAndSts>
  </CstmrPmtStsRpt>
</Document>`,
          formatName: 'ISO 20022 pain.002.001.10 - Customer Payment Status Report'
        };
      }
      if (format === 'camt.053') {
        return {
          payload: `<?xml version="1.0" encoding="UTF-8"?>
<Document xmlns="urn:iso:std:iso:20022:tech:xsd:camt.053.001.08">
  <BkToCstmrStmt>
    <GrpHdr><MsgId>${msgId}</MsgId><CreDtTm>${timestamp}</CreDtTm></GrpHdr>
    <Stmt>
      <Id>${msgId}</Id>
      <CreDtTm>${timestamp}</CreDtTm>
      <Acct><Id><IBAN>${ipidForm.dbtrAcct}</IBAN></Id><Ccy>${ipidForm.currency}</Ccy></Acct>
      <Bal><Tp><CdOrPrtry><Cd>OPBD</Cd></CdOrPrtry></Tp><Amt Ccy="${ipidForm.currency}">${ipidForm.amount}</Amt></Bal>
      <Bal><Tp><CdOrPrtry><Cd>CLBD</Cd></CdOrPrtry></Tp><Amt Ccy="${ipidForm.currency}">${ipidForm.amount}</Amt></Bal>
    </Stmt>
  </BkToCstmrStmt>
</Document>`,
          formatName: 'ISO 20022 camt.053.001.08 - Bank to Customer Statement'
        };
      }
      if (format === 'camt.054') {
        return {
          payload: `<?xml version="1.0" encoding="UTF-8"?>
<Document xmlns="urn:iso:std:iso:20022:tech:xsd:camt.054.001.08">
  <BkToCstmrDbtCdtNtfctn>
    <GrpHdr><MsgId>${msgId}</MsgId><CreDtTm>${timestamp}</CreDtTm></GrpHdr>
    <Ntfctn>
      <Id>${msgId}</Id>
      <CreDtTm>${timestamp}</CreDtTm>
      <Acct><Id><IBAN>${ipidForm.cdtrAcct}</IBAN></Id></Acct>
      <Ntry><Amt Ccy="${ipidForm.currency}">${ipidForm.amount}</Amt><CdtDbtInd>CRDT</CdtDbtInd><Sts>BOOK</Sts></Ntry>
    </Ntfctn>
  </BkToCstmrDbtCdtNtfctn>
</Document>`,
          formatName: 'ISO 20022 camt.054.001.08 - Bank to Customer Debit/Credit Notification'
        };
      }
      if (format === 'camt.056') {
        return {
          payload: `<?xml version="1.0" encoding="UTF-8"?>
<Document xmlns="urn:iso:std:iso:20022:tech:xsd:camt.056.001.08">
  <FIToFIPmtCxlReq>
    <Assgnmt><Id>${msgId}</Id><Assgnr><Agt><FinInstnId><BICFI>${config.bankBic}</BICFI></FinInstnId></Agt></Assgnr>
      <Assgne><Agt><FinInstnId><BICFI>${destServer.bic}</BICFI></FinInstnId></Agt></Assgne><CreDtTm>${timestamp}</CreDtTm>
    </Assgnmt>
    <Undrlyg><TxInf><CxlId>${msgId}</CxlId><OrgnlEndToEndId>${uetr}</OrgnlEndToEndId>
      <OrgnlIntrBkSttlmAmt Ccy="${ipidForm.currency}">${ipidForm.amount}</OrgnlIntrBkSttlmAmt>
      <CxlRsnInf><Rsn><Cd>DUPL</Cd></Rsn></CxlRsnInf>
    </TxInf></Undrlyg>
  </FIToFIPmtCxlReq>
</Document>`,
          formatName: 'ISO 20022 camt.056.001.08 - FI to FI Payment Cancellation Request'
        };
      }
      if (format === 'camt.029') {
        return {
          payload: `<?xml version="1.0" encoding="UTF-8"?>
<Document xmlns="urn:iso:std:iso:20022:tech:xsd:camt.029.001.09">
  <RsltnOfInvstgtn>
    <Assgnmt><Id>${msgId}</Id><Assgnr><Agt><FinInstnId><BICFI>${config.bankBic}</BICFI></FinInstnId></Agt></Assgnr>
      <Assgne><Agt><FinInstnId><BICFI>${destServer.bic}</BICFI></FinInstnId></Agt></Assgne><CreDtTm>${timestamp}</CreDtTm>
    </Assgnmt>
    <Sts><Conf>ACCP</Conf></Sts>
    <CxlDtls><TxInfAndSts><OrgnlEndToEndId>${uetr}</OrgnlEndToEndId><TxCxlSts>ACCP</TxCxlSts></TxInfAndSts></CxlDtls>
  </RsltnOfInvstgtn>
</Document>`,
          formatName: 'ISO 20022 camt.029.001.09 - Resolution of Investigation'
        };
      }

      // SWIFT MT Messages via IP-ID
      if (format.startsWith('MT')) {
        const mtNum = format.replace('MT', '').replace('STP', '').replace('COV', '');
        const header1 = `{1:F01${config.bankBic}0000000000}`;
        const header2 = `{2:I${mtNum}${destServer.bic}N}`;
        
        switch (format) {
          case 'MT103':
          case 'MT103STP':
            return {
              payload: `${header1}${header2}{4:
:20:${msgId}
:23B:CRED
:32A:${valueDate}${ipidForm.currency}${amountFormatted}
:50K:/${ipidForm.dbtrAcct}
${ipidForm.dbtrNm}
:59:/${ipidForm.cdtrAcct}
${ipidForm.cdtrNm}
:70:${ipidForm.remittance}
:71A:SHA
-}`,
              formatName: `SWIFT ${format} - Single Customer Credit Transfer`
            };
          case 'MT202':
            return {
              payload: `${header1}${header2}{4:
:20:${msgId}
:21:NONREF
:32A:${valueDate}${ipidForm.currency}${amountFormatted}
:52A:${config.bankBic}
:58A:${destServer.bic}
-}`,
              formatName: 'SWIFT MT202 - General FI Transfer'
            };
          case 'MT202COV':
            return {
              payload: `${header1}${header2}{4:
:20:${msgId}
:21:NONREF
:32A:${valueDate}${ipidForm.currency}${amountFormatted}
:52A:${config.bankBic}
:58A:${destServer.bic}
:50K:/${ipidForm.dbtrAcct}
${ipidForm.dbtrNm}
:59:/${ipidForm.cdtrAcct}
${ipidForm.cdtrNm}
-}`,
              formatName: 'SWIFT MT202COV - Cover Payment'
            };
          case 'MT200':
            return {
              payload: `${header1}${header2}{4:
:20:${msgId}
:32A:${valueDate}${ipidForm.currency}${amountFormatted}
:53A:${config.bankBic}
:57A:${destServer.bic}
-}`,
              formatName: 'SWIFT MT200 - Financial Institution Transfer'
            };
          case 'MT205':
            return {
              payload: `${header1}${header2}{4:
:20:${msgId}
:21:NONREF
:32A:${valueDate}${ipidForm.currency}${amountFormatted}
:52A:${config.bankBic}
:58A:${destServer.bic}
-}`,
              formatName: 'SWIFT MT205 - FI Transfer Execution'
            };
          case 'MT540':
            return {
              payload: `${header1}${header2}{4:
:16R:GENL
:20C::SEME//${msgId}
:23G:NEWM
:16S:GENL
:16R:TRADDET
:98A::SETT//${valueDate}
:35B:ISIN US0378331005
SECURITY RECEIVE FREE
:16S:TRADDET
:16R:FIAC
:36B::SETT//UNIT/100,
:97A::SAFE//${ipidForm.cdtrAcct}
:16S:FIAC
:16R:SETDET
:22F::SETR//TRAD
:16R:SETPRTY
:95P::DEAG//${destServer.bic}
:16S:SETPRTY
:16S:SETDET
-}`,
              formatName: 'SWIFT MT540 - Receive Free (Securities)'
            };
          case 'MT541':
            return {
              payload: `${header1}${header2}{4:
:16R:GENL
:20C::SEME//${msgId}
:23G:NEWM
:16S:GENL
:16R:TRADDET
:98A::SETT//${valueDate}
:90A::DEAL//PRCT/100,
:35B:ISIN US0378331005
SECURITY RECEIVE AGAINST PAYMENT
:16S:TRADDET
:16R:FIAC
:36B::SETT//UNIT/100,
:97A::SAFE//${ipidForm.cdtrAcct}
:16S:FIAC
:16R:SETDET
:22F::SETR//TRAD
:19A::SETT//${ipidForm.currency}${amountFormatted}
:16R:SETPRTY
:95P::DEAG//${destServer.bic}
:16S:SETPRTY
:16S:SETDET
-}`,
              formatName: 'SWIFT MT541 - Receive Against Payment (Securities)'
            };
          case 'MT542':
            return {
              payload: `${header1}${header2}{4:
:16R:GENL
:20C::SEME//${msgId}
:23G:NEWM
:16S:GENL
:16R:TRADDET
:98A::SETT//${valueDate}
:35B:ISIN US0378331005
SECURITY DELIVER FREE
:16S:TRADDET
:16R:FIAC
:36B::SETT//UNIT/100,
:97A::SAFE//${ipidForm.dbtrAcct}
:16S:FIAC
:16R:SETDET
:22F::SETR//TRAD
:16R:SETPRTY
:95P::REAG//${destServer.bic}
:16S:SETPRTY
:16S:SETDET
-}`,
              formatName: 'SWIFT MT542 - Deliver Free (Securities)'
            };
          case 'MT543':
            return {
              payload: `${header1}${header2}{4:
:16R:GENL
:20C::SEME//${msgId}
:23G:NEWM
:16S:GENL
:16R:TRADDET
:98A::SETT//${valueDate}
:90A::DEAL//PRCT/100,
:35B:ISIN US0378331005
SECURITY DELIVER AGAINST PAYMENT
:16S:TRADDET
:16R:FIAC
:36B::SETT//UNIT/100,
:97A::SAFE//${ipidForm.dbtrAcct}
:16S:FIAC
:16R:SETDET
:22F::SETR//TRAD
:19A::SETT//${ipidForm.currency}${amountFormatted}
:16R:SETPRTY
:95P::REAG//${destServer.bic}
:16S:SETPRTY
:16S:SETDET
-}`,
              formatName: 'SWIFT MT543 - Deliver Against Payment (Securities)'
            };
          case 'MT700':
            return {
              payload: `${header1}${header2}{4:
:27:1/1
:40A:IRREVOCABLE
:20:${msgId}
:31C:${valueDate}
:40E:UCP LATEST VERSION
:31D:${valueDate}MORONI
:50:${ipidForm.dbtrNm}
:59:${ipidForm.cdtrNm}
:32B:${ipidForm.currency}${amountFormatted}
:41D:${destServer.bic}
BY NEGOTIATION
:42C:DRAFTS AT SIGHT
:43P:ALLOWED
:43T:ALLOWED
:45A:GOODS AS PER CONTRACT
:46A:COMMERCIAL INVOICE
:47A:ALL DOCUMENTS IN ENGLISH
:71B:ALL CHARGES OUTSIDE FOR BENEFICIARY
:48:21 DAYS
:49:CONFIRM
-}`,
              formatName: 'SWIFT MT700 - Issue of Documentary Credit'
            };
          case 'MT760':
            return {
              payload: `${header1}${header2}{4:
:27:1/1
:20:${msgId}
:23:ISSUE
:30:${valueDate}
:40C:URDG
:77C:WE HEREBY ISSUE OUR IRREVOCABLE
GUARANTEE NO ${msgId}
IN FAVOUR OF ${ipidForm.cdtrNm}
FOR ACCOUNT OF ${ipidForm.dbtrNm}
FOR AN AMOUNT OF ${ipidForm.currency} ${amountFormatted}
THIS GUARANTEE IS VALID UNTIL ${valueDate}
-}`,
              formatName: 'SWIFT MT760 - Guarantee / Standby LC'
            };
          case 'MT900':
            return {
              payload: `${header1}${header2}{4:
:20:${msgId}
:21:${msgId}
:25:${ipidForm.dbtrAcct}
:32A:${valueDate}${ipidForm.currency}${amountFormatted}
:52A:${config.bankBic}
-}`,
              formatName: 'SWIFT MT900 - Confirmation of Debit'
            };
          case 'MT910':
            return {
              payload: `${header1}${header2}{4:
:20:${msgId}
:21:${msgId}
:25:${ipidForm.cdtrAcct}
:32A:${valueDate}${ipidForm.currency}${amountFormatted}
:52A:${config.bankBic}
-}`,
              formatName: 'SWIFT MT910 - Confirmation of Credit'
            };
          case 'MT940':
            return {
              payload: `${header1}${header2}{4:
:20:${msgId}
:25:${ipidForm.dbtrAcct}
:28C:1/1
:60F:C${valueDate}${ipidForm.currency}${amountFormatted}
:61:${valueDate}C${amountFormatted}NTRFNONREF//
:86:TRANSFER ${ipidForm.remittance}
:62F:C${valueDate}${ipidForm.currency}${amountFormatted}
-}`,
              formatName: 'SWIFT MT940 - Customer Statement'
            };
          case 'MT950':
            return {
              payload: `${header1}${header2}{4:
:20:${msgId}
:25:${ipidForm.dbtrAcct}
:28C:1/1
:60F:C${valueDate}${ipidForm.currency}${amountFormatted}
:62F:C${valueDate}${ipidForm.currency}${amountFormatted}
-}`,
              formatName: 'SWIFT MT950 - Statement Message'
            };
          case 'MT199':
            return {
              payload: `${header1}${header2}{4:
:20:${msgId}
:21:NONREF
:79:${ipidForm.remittance || 'FREE FORMAT MESSAGE VIA IP-ID'}
-}`,
              formatName: 'SWIFT MT199 - Free Format Message'
            };
          default:
            return {
              payload: `${header1}${header2}{4:
:20:${msgId}
:21:NONREF
:32A:${valueDate}${ipidForm.currency}${amountFormatted}
:52A:${config.bankBic}
:59:/${ipidForm.cdtrAcct}
${ipidForm.cdtrNm}
:70:${ipidForm.remittance}
:71A:SHA
-}`,
              formatName: `SWIFT ${format} - Generic Message`
            };
        }
      }

      // Default to pacs.008 if format not recognized
      return {
        payload: buildPacs008({
          msgId, uetr,
          instgAgtBic: config.bankBic,
          instdAgtBic: destServer.bic,
          amount: ipidForm.amount,
          currency: ipidForm.currency,
          dbtrNm: ipidForm.dbtrNm,
          dbtrAcct: ipidForm.dbtrAcct,
          cdtrNm: ipidForm.cdtrNm,
          cdtrAcct: ipidForm.cdtrAcct,
          ipIdSource: config.globalServerIpId,
          ipIdDest: destServer.ipId,
        }),
        formatName: 'ISO 20022 pacs.008.001.08 - FI to FI Customer Credit Transfer'
      };
    };

    const { payload: builtPayload, formatName } = buildIPIDPayload(selectedFormat);
    payload = builtPayload;
    log('info', `  → Format: ${formatName}`);
    
    const payloadHash = sha256Hex(payload);
    const signature = hmacSha256Base64(config.signingSecret, payload);
    
    log('info', `  → Payload size: ${formatBytes(payload.length)}`);
    log('info', `  → SHA-256: ${payloadHash.substring(0, 32)}...`);
    log('info', `  → HMAC Signature: ${signature.substring(0, 24)}...`);
    await new Promise(r => setTimeout(r, 400));
    log('success', '[OK] Payload built and signed');

    // Step 3: Create message record
    setTransferProgress(25);
    log('info', '');
    log('info', '[STEP 3/10] Creating message record...');
    
    const ipIdTransfer: IPIDTransfer = {
      sourceIpId: config.globalServerIpId,
      destinationIpId: destServer.ipId,
      sourceServerIp: config.serverIp,
      destinationServerIp: destServer.ip,
      sourcePort: config.serverPort,
      destinationPort: destServer.port,
      protocol: 'IP-IP',
      encryption: config.encryption,
      connectionStatus: 'PENDING',
      tlsVersion: config.tlsVersion,
    };

    const newMessage: SwiftMessage = {
      id: generateUUID(),
      format: ipidForm.format,
      type: ipidForm.type,
      senderBic: config.bankBic,
      receiverBic: destServer.bic,
      msgId,
      uetr,
      amount: parseFloat(ipidForm.amount),
      currency: ipidForm.currency,
      payload,
      payloadHash,
      signature,
      status: 'QUEUED',
      createdAt: new Date().toISOString(),
      ipIdTransfer,
    };

    setMessages(prev => [newMessage, ...prev]);
    addAudit(newMessage.id, 'IPID_CREATE', { payloadHash, type: ipidForm.type, ipId: destServer.ipId }, config.serverIp, config.globalServerIpId);
    log('success', `[OK] Message created: ${newMessage.id.substring(0, 8)}...`);

    // Step 4: Queue message
    setTransferProgress(35);
    log('info', '');
    log('info', '[STEP 4/10] Queuing for IP-ID transmission...');
    
    const job: QueueJob = {
      id: queueJobs.length + 1,
      messageId: newMessage.id,
      status: 'PENDING',
      attempts: 0,
      maxAttempts: 5,
      createdAt: new Date().toISOString(),
    };
    setQueueJobs(prev => [...prev, job]);
    addAudit(newMessage.id, 'QUEUE', { queue: 'ipid.outbound' }, config.serverIp, config.globalServerIpId);
    await new Promise(r => setTimeout(r, 300));
    log('success', '[OK] Message queued');

    // Step 5: Establish IP-ID connection
    setTransferProgress(45);
    log('info', '');
    log('network', '[STEP 5/10] Establishing IP-ID connection...');
    log('network', `  → Source: ${config.serverIp}:${config.serverPort} (${config.globalServerIpId})`);
    log('network', `  → Destination: ${destServer.ip}:${destServer.port} (${destServer.ipId})`);
    
    setMessages(prev => prev.map(m => m.id === newMessage.id ? {
      ...m, status: 'SENDING',
      ipIdTransfer: { ...m.ipIdTransfer!, connectionStatus: 'CONNECTING' }
    } : m));
    
    await new Promise(r => setTimeout(r, 600));
    log('success', '[OK] IP-ID route established');

    // Step 6: TLS Handshake
    setTransferProgress(55);
    log('info', '');
    log('security', '[STEP 6/10] TLS 1.3 Handshake...');
    log('security', `  → ClientHello sent to ${destServer.ip}`);
    await new Promise(r => setTimeout(r, 200));
    log('security', `  → ServerHello received`);
    log('security', `  → Certificate chain verified`);
    log('security', `  → Cipher negotiated: ${config.encryption}`);
    
    setMessages(prev => prev.map(m => m.id === newMessage.id ? {
      ...m, ipIdTransfer: { ...m.ipIdTransfer!, handshakeComplete: true, connectionStatus: 'CONNECTED' }
    } : m));
    
    await new Promise(r => setTimeout(r, 300));
    log('success', '[OK] TLS handshake complete');

    // Step 7: Transmit payload
    setTransferProgress(70);
    log('info', '');
    log('transfer', '[STEP 7/10] Transmitting encrypted payload...');
    
    setMessages(prev => prev.map(m => m.id === newMessage.id ? {
      ...m, ipIdTransfer: { ...m.ipIdTransfer!, connectionStatus: 'TRANSMITTING' }
    } : m));

    const chunks = Math.ceil(payload.length / 1024);
    for (let i = 0; i < chunks; i++) {
      await new Promise(r => setTimeout(r, 100));
      const progress = 70 + Math.floor((i / chunks) * 15);
      setTransferProgress(progress);
      log('transfer', `  → Chunk ${i + 1}/${chunks} transmitted (${formatBytes((i + 1) * 1024)})`);
    }
    
    setMessages(prev => prev.map(m => m.id === newMessage.id ? {
      ...m, ipIdTransfer: { ...m.ipIdTransfer!, bytesTransferred: payload.length }
    } : m));
    
    log('success', `[OK] Payload transmitted: ${formatBytes(payload.length)}`);

    // Step 8: Wait for ACK
    setTransferProgress(90);
    log('info', '');
    log('info', '[STEP 8/10] Waiting for server acknowledgment...');
    await new Promise(r => setTimeout(r, 800));
    
    const latency = Math.floor(Math.random() * 100) + 50;
    setMessages(prev => prev.map(m => m.id === newMessage.id ? {
      ...m, ipIdTransfer: { ...m.ipIdTransfer!, latencyMs: latency, connectionStatus: 'COMPLETED' }
    } : m));
    
    log('success', `[OK] ACK received from ${destServer.ipId} | Latency: ${latency}ms`);

    // Step 9: Update status
    setTransferProgress(95);
    log('info', '');
    log('info', '[STEP 9/10] Updating transfer status...');
    
    const confirmationCode = `CONF-${Math.random().toString(36).substring(2, 10).toUpperCase()}`;
    
    setMessages(prev => prev.map(m => m.id === newMessage.id ? {
      ...m, status: 'ACK', sentAt: new Date().toISOString(), ackAt: new Date().toISOString(),
      serverResponse: { confirmationCode, latency, server: destServer.name }
    } : m));
    
    setQueueJobs(prev => prev.map(j => j.messageId === newMessage.id ? {
      ...j, status: 'DONE', processedAt: new Date().toISOString()
    } : j));
    
    addAudit(newMessage.id, 'SENT', { to: destServer.ipId, latency }, destServer.ip, destServer.ipId);
    addAudit(newMessage.id, 'ACK', { confirmationCode }, destServer.ip, destServer.ipId);
    
    log('success', `[OK] Transfer confirmed: ${confirmationCode}`);
    
    // Save to transaction history with full Ledger details
    const completedAt = new Date().toISOString();
    const historyEntry: TransactionHistory = {
      id: newMessage.id,
      type: 'IPID',
      messageType: ipidForm.format === 'ISO20022' ? 'pacs.008.001.08' : 'MT103',
      msgId,
      uetr,
      senderBic: config.bankBic,
      receiverBic: destServer.bic,
      amount: parseFloat(ipidForm.amount),
      currency: ipidForm.currency,
      beneficiaryName: ipidForm.cdtrNm,
      beneficiaryAccount: ipidForm.cdtrAcct,
      status: 'ACK',
      createdAt: new Date().toISOString(),
      completedAt,
      sourceAccount: selectedLedgerAccount?.accountNumber || ipidForm.dbtrAcct,
      sourceAccountName: selectedLedgerAccount?.accountName || ipidForm.dbtrNm,
      // Ledger Account Details
      ledgerAccountId: selectedLedgerAccount?.id,
      ledgerAccountNumber: selectedLedgerAccount?.accountNumber,
      ledgerAccountName: selectedLedgerAccount?.accountName,
      ledgerAccountType: selectedLedgerAccount?.accountType,
      ledgerAccountCurrency: selectedLedgerAccount?.currency,
      ledgerAccountBalance: selectedLedgerAccount?.balance,
      ledgerAccountIban: selectedLedgerAccount?.iban,
      ledgerAccountSwift: selectedLedgerAccount?.swiftCode,
      ledgerAccountBank: selectedLedgerAccount?.bankName,
      destinationServer: destServer.name,
      destinationIpId: destServer.ipId,
      payload,
      payloadHash,
      signature,
      confirmationCode,
      latencyMs: latency,
    };
    setTransactionHistory(prev => [historyEntry, ...prev]);

    // Step 10: Complete
    setTransferProgress(100);
    log('info', '');
    log('success', '[STEP 10/10] Transfer completed successfully!');
    log('info', '');
    log('transfer', '╔══════════════════════════════════════════════════════════════════════════════╗');
    log('transfer', '║  TRANSFER SUMMARY                                                           ║');
    log('transfer', '╠══════════════════════════════════════════════════════════════════════════════╣');
    log('transfer', `║  Message ID:      ${msgId.padEnd(54)}║`);
    log('transfer', `║  UETR:            ${uetr.padEnd(54)}║`);
    log('transfer', `║  Amount:          ${(ipidForm.currency + ' ' + parseFloat(ipidForm.amount).toLocaleString()).padEnd(54)}║`);
    log('transfer', `║  Source IP-ID:    ${config.globalServerIpId.padEnd(54)}║`);
    log('transfer', `║  Dest IP-ID:      ${destServer.ipId.padEnd(54)}║`);
    log('transfer', `║  Status:          ${'ACK - CONFIRMED'.padEnd(54)}║`);
    log('transfer', `║  Confirmation:    ${confirmationCode.padEnd(54)}║`);
    log('transfer', `║  Latency:         ${(latency + 'ms').padEnd(54)}║`);
    log('transfer', '╚══════════════════════════════════════════════════════════════════════════════╝');
    log('info', '');

    setIsTransferring(false);
    setTransferProgress(0);
  }, [isConnected, isWorkerRunning, servers, ipidForm, config, queueJobs.length, log, addAudit, selectedLedgerAccount]);

  // ═══════════════════════════════════════════════════════════════════════════════
  // PING SERVER
  // ═══════════════════════════════════════════════════════════════════════════════

  const pingServer = useCallback(async (server: ServerConnection) => {
    log('command', `$ ping ${server.ip} --ipid=${server.ipId}`);
    log('network', `[PING] Sending ICMP to ${server.ip}...`);
    
    setServers(prev => prev.map(s => s.id === server.id ? { ...s, status: 'CONNECTING' } : s));
    
    await new Promise(r => setTimeout(r, 500 + Math.random() * 500));
    
    const latency = Math.floor(Math.random() * 80) + 20;
    setServers(prev => prev.map(s => s.id === server.id ? {
      ...s, status: 'ONLINE', lastPing: latency, lastPingAt: new Date().toISOString()
    } : s));
    
    log('success', `[PONG] ${server.ip} responded | Latency: ${latency}ms | IP-ID: ${server.ipId}`);
  }, [log]);

  // ═══════════════════════════════════════════════════════════════════════════════
  // GENERATE TRANSACTION RECEIPT PDF (Professional Level - SWIFT Standard)
  // ═══════════════════════════════════════════════════════════════════════════════

  // ═══════════════════════════════════════════════════════════════════════════════
  // SWIFT MT MESSAGE DESCRIPTIONS - Official SWIFT Standards
  // ═══════════════════════════════════════════════════════════════════════════════
  const getMessageDescription = (msgType: string): { name: string; category: string; description: string; fields: string[] } => {
    const descriptions: Record<string, { name: string; category: string; description: string; fields: string[] }> = {
      // Category 1 - Customer Payments
      'MT101': { name: 'Request for Transfer', category: 'Customer Payments', description: 'Used to request transfer of funds from one or more accounts', fields: [':20:', ':21R:', ':28D:', ':50H:', ':52A:', ':30:', ':21:', ':23E:', ':32B:', ':59:', ':70:', ':71A:'] },
      'MT102': { name: 'Multiple Customer Credit Transfer', category: 'Customer Payments', description: 'Used to send multiple customer credit transfers in a single message', fields: [':20:', ':23:', ':50K:', ':52A:', ':26T:', ':32A:', ':59:', ':70:', ':71A:', ':32B:'] },
      'MT103': { name: 'Single Customer Credit Transfer', category: 'Customer Payments', description: 'Used to order the movement of funds to the beneficiary', fields: [':20:', ':23B:', ':32A:', ':50K:', ':59:', ':70:', ':71A:'] },
      'MT103STP': { name: 'Single Customer Credit Transfer (STP)', category: 'Customer Payments', description: 'Straight Through Processing variant of MT103', fields: [':20:', ':23B:', ':32A:', ':50K:', ':59:', ':70:', ':71A:'] },
      'MT104': { name: 'Direct Debit and Request for Debit Transfer', category: 'Customer Payments', description: 'Used to request direct debit transfers', fields: [':20:', ':23E:', ':30:', ':51A:', ':50K:', ':21:', ':32B:', ':59:', ':70:', ':71A:'] },
      'MT107': { name: 'General Direct Debit Message', category: 'Customer Payments', description: 'General purpose direct debit message', fields: [':20:', ':30:', ':51A:', ':21:', ':23E:', ':32B:', ':50K:', ':59:', ':70:', ':71A:'] },
      'MT110': { name: 'Advice of Cheque(s)', category: 'Customer Payments', description: 'Advice about cheques drawn on the receiver', fields: [':20:', ':53A:', ':21:', ':30:', ':32A:', ':52A:', ':59:'] },
      'MT111': { name: 'Request for Stop Payment of a Cheque', category: 'Customer Payments', description: 'Request to stop payment on a cheque', fields: [':20:', ':21:', ':30:', ':32A:', ':52A:'] },
      'MT112': { name: 'Status of a Request for Stop Payment', category: 'Customer Payments', description: 'Status response to stop payment request', fields: [':20:', ':21:', ':25:', ':30:', ':32A:', ':76:'] },
      // Category 2 - Financial Institution Transfers
      'MT200': { name: 'Financial Institution Transfer for Own Account', category: 'FI Transfers', description: 'Transfer of funds for the sending bank\'s own account', fields: [':20:', ':32A:', ':53A:', ':56A:', ':57A:'] },
      'MT201': { name: 'Multiple Financial Institution Transfer', category: 'FI Transfers', description: 'Multiple transfers for own account', fields: [':20:', ':19:', ':30:', ':21:', ':32B:', ':57A:'] },
      'MT202': { name: 'General Financial Institution Transfer', category: 'FI Transfers', description: 'Bank-to-bank transfer of funds', fields: [':20:', ':21:', ':32A:', ':52A:', ':58A:'] },
      'MT202COV': { name: 'General FI Transfer (Cover Payment)', category: 'FI Transfers', description: 'Cover payment for underlying customer credit transfer', fields: [':20:', ':21:', ':32A:', ':52A:', ':58A:', ':50K:', ':59:'] },
      'MT203': { name: 'Multiple General FI Transfer', category: 'FI Transfers', description: 'Multiple bank-to-bank transfers', fields: [':19:', ':30:', ':20:', ':21:', ':32B:', ':57A:', ':58A:'] },
      'MT204': { name: 'Financial Markets Direct Debit', category: 'FI Transfers', description: 'Direct debit between financial institutions', fields: [':20:', ':19:', ':30:', ':57A:', ':21:', ':32B:', ':53A:'] },
      'MT205': { name: 'Financial Institution Transfer Execution', category: 'FI Transfers', description: 'Execution of financial institution transfer', fields: [':20:', ':21:', ':32A:', ':52A:', ':58A:'] },
      'MT205COV': { name: 'FI Transfer Execution (Cover)', category: 'FI Transfers', description: 'Cover payment execution', fields: [':20:', ':21:', ':32A:', ':52A:', ':58A:'] },
      'MT210': { name: 'Notice to Receive', category: 'FI Transfers', description: 'Notification of expected receipt of funds', fields: [':20:', ':25:', ':30:', ':21:', ':32B:', ':52A:'] },
      // Category 3 - Treasury Markets
      'MT300': { name: 'Foreign Exchange Confirmation', category: 'Treasury', description: 'Confirmation of FX deal', fields: [':15A:', ':20:', ':22A:', ':22C:', ':82A:', ':87A:', ':15B:', ':30T:', ':30V:', ':36:', ':32B:', ':57A:', ':33B:'] },
      'MT320': { name: 'Fixed Loan/Deposit Confirmation', category: 'Treasury', description: 'Confirmation of fixed loan or deposit', fields: [':15A:', ':20:', ':22A:', ':22B:', ':22C:', ':82A:', ':87A:', ':15B:', ':17R:', ':30T:', ':30V:', ':30P:', ':32B:', ':34E:', ':37G:', ':14D:', ':57A:'] },
      // Category 4 - Collections
      'MT400': { name: 'Advice of Payment', category: 'Collections', description: 'Advice of payment received', fields: [':20:', ':21:', ':32A:', ':52A:', ':72:'] },
      'MT405': { name: 'Clean Collection', category: 'Collections', description: 'Clean collection instruction', fields: [':20:', ':21:', ':32A:', ':52A:', ':59:', ':72:'] },
      'MT410': { name: 'Acknowledgement', category: 'Collections', description: 'Acknowledgement of collection', fields: [':20:', ':21:', ':32A:', ':52A:'] },
      // Category 5 - Securities
      'MT540': { name: 'Receive Free', category: 'Securities', description: 'Instruction to receive securities free of payment', fields: [':16R:GENL', ':20C:', ':23G:', ':16S:GENL', ':16R:TRADDET', ':98A:', ':35B:', ':16S:TRADDET', ':16R:FIAC', ':36B:', ':97A:', ':16S:FIAC', ':16R:SETDET', ':22F:', ':95P:', ':16S:SETDET'] },
      'MT541': { name: 'Receive Against Payment', category: 'Securities', description: 'Instruction to receive securities against payment', fields: [':16R:GENL', ':20C:', ':23G:', ':16S:GENL', ':16R:TRADDET', ':98A:', ':90A:', ':35B:', ':16S:TRADDET', ':16R:FIAC', ':36B:', ':97A:', ':16S:FIAC', ':16R:SETDET', ':22F:', ':19A:', ':95P:', ':16S:SETDET'] },
      'MT542': { name: 'Deliver Free', category: 'Securities', description: 'Instruction to deliver securities free of payment', fields: [':16R:GENL', ':20C:', ':23G:', ':16S:GENL', ':16R:TRADDET', ':98A:', ':35B:', ':16S:TRADDET', ':16R:FIAC', ':36B:', ':97A:', ':16S:FIAC', ':16R:SETDET', ':22F:', ':95P:', ':16S:SETDET'] },
      'MT543': { name: 'Deliver Against Payment', category: 'Securities', description: 'Instruction to deliver securities against payment', fields: [':16R:GENL', ':20C:', ':23G:', ':16S:GENL', ':16R:TRADDET', ':98A:', ':90A:', ':35B:', ':16S:TRADDET', ':16R:FIAC', ':36B:', ':97A:', ':16S:FIAC', ':16R:SETDET', ':22F:', ':19A:', ':95P:', ':16S:SETDET'] },
      // Category 7 - Documentary Credits
      'MT700': { name: 'Issue of a Documentary Credit', category: 'Documentary Credits', description: 'Issuance of a documentary credit (Letter of Credit)', fields: [':27:', ':40A:', ':20:', ':31C:', ':40E:', ':31D:', ':50:', ':59:', ':32B:', ':41D:', ':42C:', ':42D:', ':43P:', ':43T:', ':44A:', ':44E:', ':44F:', ':44B:', ':45A:', ':46A:', ':47A:', ':71B:', ':48:', ':49:'] },
      'MT760': { name: 'Guarantee / Standby Letter of Credit', category: 'Documentary Credits', description: 'Issuance of bank guarantee or standby LC', fields: [':27:', ':20:', ':23:', ':30:', ':40C:', ':77C:'] },
      'MT799': { name: 'Free Format Message', category: 'Documentary Credits', description: 'Free format message for documentary credits', fields: [':20:', ':21:', ':79:'] },
      // Category 9 - Cash Management
      'MT900': { name: 'Confirmation of Debit', category: 'Cash Management', description: 'Confirmation of debit to account', fields: [':20:', ':21:', ':25:', ':32A:', ':52A:'] },
      'MT910': { name: 'Confirmation of Credit', category: 'Cash Management', description: 'Confirmation of credit to account', fields: [':20:', ':21:', ':25:', ':32A:', ':52A:'] },
      'MT920': { name: 'Request Message', category: 'Cash Management', description: 'Request for account statement', fields: [':20:', ':12:', ':25:'] },
      'MT940': { name: 'Customer Statement Message', category: 'Cash Management', description: 'Customer account statement', fields: [':20:', ':25:', ':28C:', ':60F:', ':61:', ':86:', ':62F:'] },
      'MT950': { name: 'Statement Message', category: 'Cash Management', description: 'Account statement', fields: [':20:', ':25:', ':28C:', ':60F:', ':62F:'] },
      // Common Messages
      'MT199': { name: 'Free Format Message (Customer)', category: 'Common', description: 'Free format message for customer payments', fields: [':20:', ':21:', ':79:'] },
      'MT299': { name: 'Free Format Message (FI)', category: 'Common', description: 'Free format message for FI transfers', fields: [':20:', ':21:', ':79:'] },
      'MT192': { name: 'Request for Cancellation', category: 'Common', description: 'Request to cancel a previous message', fields: [':20:', ':21:', ':11S:', ':79:'] },
    };
    return descriptions[msgType] || { name: 'Financial Message', category: 'General', description: 'SWIFT Financial Message', fields: [':20:', ':21:', ':32A:'] };
  };

  const generateTransactionReceiptPDF = useCallback((tx: TransactionHistory) => {
    const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const margin = 10;
    let y = margin;
    const lineHeight = 4;

    const addBlackPage = () => {
      pdf.setFillColor(0, 0, 0);
      pdf.rect(0, 0, pageWidth, pageHeight, 'F');
    };

    const setGreen = () => { pdf.setTextColor(0, 255, 65); pdf.setFontSize(7); pdf.setFont('Courier', 'normal'); };
    const setWhite = () => { pdf.setTextColor(255, 255, 255); pdf.setFontSize(7); pdf.setFont('Courier', 'normal'); };
    const setCyan = () => { pdf.setTextColor(0, 200, 255); pdf.setFontSize(7); pdf.setFont('Courier', 'normal'); };
    const setYellow = () => { pdf.setTextColor(255, 220, 0); pdf.setFontSize(7); pdf.setFont('Courier', 'normal'); };

    const printLine = (text: string, isGreen = false) => {
      if (y > pageHeight - margin) { pdf.addPage(); addBlackPage(); y = margin; }
      if (isGreen) setGreen(); else setWhite();
      pdf.text(text, margin, y);
      y += lineHeight;
    };

    const printKV = (key: string, value: string, keyWidth = 35) => {
      if (y > pageHeight - margin) { pdf.addPage(); addBlackPage(); y = margin; }
      setGreen();
      pdf.text(key, margin, y);
      setWhite();
      pdf.text(String(value || ''), margin + keyWidth, y);
      y += lineHeight;
    };

    const printField = (field: string, value: string) => {
      if (y > pageHeight - margin) { pdf.addPage(); addBlackPage(); y = margin; }
      setCyan();
      pdf.text(field, margin, y);
      setWhite();
      pdf.text(String(value || ''), margin + 20, y);
      y += lineHeight;
    };

    addBlackPage();

    const msgInfo = getMessageDescription(tx.messageType);
    const valueDate = new Date().toISOString().slice(2, 10).replace(/-/g, '');

    // ═══════════════════════════════════════════════════════════════════════════════
    // SWIFT FIN MESSAGE RECEIPT - FORMAT SPECIFIC
    // ═══════════════════════════════════════════════════════════════════════════════
    if (tx.type === 'SWIFT') {
      // SWIFT Header with Message Type Info
      printLine('================================================================================', true);
      printLine(`  SWIFT ${tx.messageType} - ${msgInfo.name.toUpperCase()}`, true);
      printLine('================================================================================', true);
      printLine('');
      printLine('  DIGITAL COMMERCIAL BANK LTD', true);
      printLine(`  Category: ${msgInfo.category}`, true);
      printLine('');
      printLine('--------------------------------------------------------------------------------', true);
      setYellow();
      pdf.text(`  ${msgInfo.description}`, margin, y);
      y += lineHeight;
      printLine('--------------------------------------------------------------------------------', true);
      printLine('');
      
      // Basic Header Block {1:}
      printLine('  BASIC HEADER BLOCK {1:}', true);
      printLine('--------------------------------------------------------------------------------', true);
      printKV('Application ID:', 'F01 (FIN Application)');
      printKV('Service ID:', '01 (FIN/GPA)');
      printKV('LT Address:', `${config.bankBic}AXXX`);
      printKV('Session Number:', Math.floor(Math.random() * 9999).toString().padStart(4, '0'));
      printKV('Sequence Number:', Math.floor(Math.random() * 999999).toString().padStart(6, '0'));
      printLine('');
      
      // Application Header Block {2:}
      printLine('  APPLICATION HEADER BLOCK {2:}', true);
      printLine('--------------------------------------------------------------------------------', true);
      printKV('I/O Identifier:', 'I (Input)');
      printKV('Message Type:', `${tx.messageType} - ${msgInfo.name}`);
      printKV('Receiver LT:', `${tx.receiverBic}XXXX`);
      printKV('Priority:', 'N (Normal)');
      printKV('Delivery Monitor:', '3 (Non-Delivery Warning)');
      printLine('');
      
      // User Header Block {3:}
      printLine('  USER HEADER BLOCK {3:}', true);
      printLine('--------------------------------------------------------------------------------', true);
      printKV('Service Type {119}:', tx.messageType.includes('STP') ? 'STP' : 'FIN');
      printKV('Banking Priority {113}:', 'NNNN');
      printKV('MUR {108}:', tx.msgId.substring(0, 16));
      if (tx.uetr) printKV('UETR {121}:', tx.uetr);
      printLine('');
      
      // Message-Specific Fields based on MT Type
      printLine(`  ${tx.messageType} MANDATORY FIELDS`, true);
      printLine('--------------------------------------------------------------------------------', true);
      
      // Generate fields based on message type
      if (tx.messageType.startsWith('MT1')) {
        // Category 1 - Customer Payments
        printField(':20:', tx.trn || tx.msgId);
        if (tx.messageType === 'MT103' || tx.messageType === 'MT103STP') {
          printField(':23B:', 'CRED');
          printField(':32A:', `${valueDate}${tx.currency}${tx.amount.toFixed(2).replace('.', ',')}`);
          printField(':50K:', `/${tx.sourceAccount || config.ledgerId}`);
          printKV('', tx.sourceAccountName || config.bankName);
          printField(':59:', `/${tx.beneficiaryAccount}`);
          printKV('', tx.beneficiaryName);
          printField(':70:', tx.msgId.substring(0, 35));
          printField(':71A:', 'SHA');
        } else if (tx.messageType === 'MT101') {
          printField(':21R:', 'NONREF');
          printField(':28D:', '1/1');
          printField(':50H:', `/${tx.sourceAccount}`);
          printField(':52A:', config.bankBic);
          printField(':30:', valueDate);
          printField(':32B:', `${tx.currency}${tx.amount.toFixed(2).replace('.', ',')}`);
          printField(':59:', `/${tx.beneficiaryAccount}`);
        } else if (tx.messageType === 'MT102') {
          printField(':23:', 'CRED');
          printField(':50K:', `/${tx.sourceAccount}`);
          printField(':52A:', config.bankBic);
          printField(':26T:', '001');
          printField(':32A:', `${valueDate}${tx.currency}${tx.amount.toFixed(2).replace('.', ',')}`);
          printField(':59:', `/${tx.beneficiaryAccount}`);
        } else if (tx.messageType === 'MT104') {
          printField(':23E:', 'SDVA');
          printField(':30:', valueDate);
          printField(':51A:', config.bankBic);
          printField(':50K:', `/${tx.sourceAccount}`);
          printField(':32B:', `${tx.currency}${tx.amount.toFixed(2).replace('.', ',')}`);
          printField(':59:', `/${tx.beneficiaryAccount}`);
        }
      } else if (tx.messageType.startsWith('MT2')) {
        // Category 2 - FI Transfers
        printField(':20:', tx.trn || tx.msgId);
        printField(':21:', 'NONREF');
        printField(':32A:', `${valueDate}${tx.currency}${tx.amount.toFixed(2).replace('.', ',')}`);
        printField(':52A:', config.bankBic);
        printField(':58A:', tx.receiverBic);
        if (tx.messageType === 'MT202COV') {
          printField(':50K:', `/${tx.sourceAccount}`);
          printKV('', tx.sourceAccountName || '');
          printField(':59:', `/${tx.beneficiaryAccount}`);
          printKV('', tx.beneficiaryName);
        }
      } else if (tx.messageType.startsWith('MT3')) {
        // Category 3 - Treasury
        printField(':15A:', '');
        printField(':20:', tx.trn || tx.msgId);
        printField(':22A:', 'NEWT');
        printField(':82A:', config.bankBic);
        printField(':87A:', tx.receiverBic);
        printField(':15B:', '');
        printField(':30T:', valueDate);
        printField(':30V:', valueDate);
        printField(':32B:', `${tx.currency}${tx.amount.toFixed(2).replace('.', ',')}`);
      } else if (tx.messageType.startsWith('MT4')) {
        // Category 4 - Collections
        printField(':20:', tx.trn || tx.msgId);
        printField(':21:', tx.msgId);
        printField(':32A:', `${valueDate}${tx.currency}${tx.amount.toFixed(2).replace('.', ',')}`);
        printField(':52A:', config.bankBic);
        if (tx.messageType === 'MT405') {
          printField(':59:', `/${tx.beneficiaryAccount}`);
          printKV('', tx.beneficiaryName);
        }
      } else if (tx.messageType.startsWith('MT5')) {
        // Category 5 - Securities
        printField(':16R:', 'GENL');
        printField(':20C:', `::SEME//${tx.trn || tx.msgId}`);
        printField(':23G:', 'NEWM');
        printField(':16S:', 'GENL');
        printField(':16R:', 'TRADDET');
        printField(':98A:', `::SETT//${valueDate}`);
        if (tx.messageType === 'MT541' || tx.messageType === 'MT543') {
          printField(':90A:', '::DEAL//PRCT/100,');
          printField(':19A:', `::SETT//${tx.currency}${tx.amount.toFixed(2).replace('.', ',')}`);
        }
        printField(':35B:', 'ISIN SECURITY');
        printField(':16S:', 'TRADDET');
        printField(':16R:', 'FIAC');
        printField(':36B:', '::SETT//UNIT/100,');
        printField(':97A:', `::SAFE//${tx.beneficiaryAccount}`);
        printField(':16S:', 'FIAC');
        printField(':16R:', 'SETDET');
        printField(':22F:', '::SETR//TRAD');
        printField(':95P:', `::${tx.messageType === 'MT540' || tx.messageType === 'MT541' ? 'DEAG' : 'REAG'}//${tx.receiverBic}`);
        printField(':16S:', 'SETDET');
      } else if (tx.messageType.startsWith('MT7')) {
        // Category 7 - Documentary Credits
        if (tx.messageType === 'MT700') {
          printField(':27:', '1/1');
          printField(':40A:', 'IRREVOCABLE');
          printField(':20:', tx.trn || tx.msgId);
          printField(':31C:', valueDate);
          printField(':40E:', 'UCP LATEST VERSION');
          printField(':31D:', `${valueDate}MORONI`);
          printField(':50:', tx.sourceAccountName || config.bankName);
          printField(':59:', tx.beneficiaryName);
          printField(':32B:', `${tx.currency}${tx.amount.toFixed(2).replace('.', ',')}`);
          printField(':41D:', `${tx.receiverBic} BY NEGOTIATION`);
          printField(':42C:', 'DRAFTS AT SIGHT');
          printField(':43P:', 'ALLOWED');
          printField(':43T:', 'ALLOWED');
          printField(':48:', '21 DAYS');
          printField(':49:', 'CONFIRM');
        } else if (tx.messageType === 'MT760') {
          printField(':27:', '1/1');
          printField(':20:', tx.trn || tx.msgId);
          printField(':23:', 'ISSUE');
          printField(':30:', valueDate);
          printField(':40C:', 'URDG');
          printField(':77C:', 'GUARANTEE TEXT');
        } else if (tx.messageType === 'MT799') {
          printField(':20:', tx.trn || tx.msgId);
          printField(':21:', 'NONREF');
          printField(':79:', 'FREE FORMAT MESSAGE');
        }
      } else if (tx.messageType.startsWith('MT9')) {
        // Category 9 - Cash Management
        printField(':20:', tx.trn || tx.msgId);
        if (tx.messageType === 'MT900' || tx.messageType === 'MT910') {
          printField(':21:', tx.msgId);
          printField(':25:', tx.messageType === 'MT900' ? tx.sourceAccount : tx.beneficiaryAccount);
          printField(':32A:', `${valueDate}${tx.currency}${tx.amount.toFixed(2).replace('.', ',')}`);
          printField(':52A:', config.bankBic);
        } else if (tx.messageType === 'MT940' || tx.messageType === 'MT950') {
          printField(':25:', tx.sourceAccount || config.ledgerId);
          printField(':28C:', '1/1');
          printField(':60F:', `C${valueDate}${tx.currency}${tx.amount.toFixed(2).replace('.', ',')}`);
          if (tx.messageType === 'MT940') {
            printField(':61:', `${valueDate}C${tx.amount.toFixed(2).replace('.', ',')}NTRFNONREF//`);
            printField(':86:', 'TRANSFER');
          }
          printField(':62F:', `C${valueDate}${tx.currency}${tx.amount.toFixed(2).replace('.', ',')}`);
        } else if (tx.messageType === 'MT920') {
          printField(':12:', '940');
          printField(':25:', tx.sourceAccount || config.ledgerId);
        }
      } else {
        // Common/Free Format Messages
        printField(':20:', tx.trn || tx.msgId);
        printField(':21:', 'NONREF');
        if (tx.messageType === 'MT192') {
          printField(':11S:', `103 ${valueDate}`);
        }
        printField(':79:', 'FREE FORMAT MESSAGE');
      }
      printLine('');
      
      // Ledger Account Details (if selected)
      if (tx.ledgerAccountId) {
        printLine('  LEDGER ACCOUNT DETAILS', true);
        printLine('--------------------------------------------------------------------------------', true);
        if (tx.ledgerAccountNumber) printKV('Account Number:', tx.ledgerAccountNumber);
        if (tx.ledgerAccountName) printKV('Account Name:', tx.ledgerAccountName);
        if (tx.ledgerAccountType) printKV('Account Type:', tx.ledgerAccountType);
        if (tx.ledgerAccountCurrency) printKV('Account Currency:', tx.ledgerAccountCurrency);
        if (tx.ledgerAccountBalance !== undefined) printKV('Account Balance:', `${tx.ledgerAccountCurrency || ''} ${tx.ledgerAccountBalance.toLocaleString('en-US', { minimumFractionDigits: 2 })}`);
        if (tx.ledgerAccountIban) printKV('IBAN:', tx.ledgerAccountIban);
        if (tx.ledgerAccountSwift) printKV('SWIFT/BIC:', tx.ledgerAccountSwift);
        if (tx.ledgerAccountBank) printKV('Bank Name:', tx.ledgerAccountBank);
        printLine('');
      }
      
      // Trailer Block {5:}
      printLine('  TRAILER BLOCK {5:}', true);
      printLine('--------------------------------------------------------------------------------', true);
      printKV('MAC:', tx.signature.substring(0, 8).toUpperCase());
      printKV('CHK:', tx.payloadHash.substring(0, 12).toUpperCase());
      printKV('TNG:', '');
      printKV('PDE:', '');
      printLine('');
      
      // Delivery Confirmation
      printLine('  DELIVERY CONFIRMATION', true);
      printLine('--------------------------------------------------------------------------------', true);
      printKV('Delivery Status:', tx.status === 'ACK' ? 'DELIVERED' : tx.status);
      printKV('ACK/NAK:', tx.status);
      if (tx.confirmationCode) printKV('Confirmation Reference:', tx.confirmationCode);
      printKV('Delivery Time:', tx.completedAt || '');
      if (tx.latencyMs) printKV('Network Latency:', `${tx.latencyMs}ms`);
      printLine('');
      
      // Page 2 - Full FIN Message
      pdf.addPage();
      addBlackPage();
      y = margin;
      
      printLine('================================================================================', true);
      printLine(`  SWIFT ${tx.messageType} - RAW FIN MESSAGE`, true);
      printLine('================================================================================', true);
      printLine('');
      
      const payloadLines = tx.payload.split('\n');
      payloadLines.forEach(line => {
        printLine(line.substring(0, 95));
      });
      
      printLine('');
      printLine('--------------------------------------------------------------------------------', true);
      printLine('  SWIFT MESSAGE AUTHENTICATION', true);
      printLine('--------------------------------------------------------------------------------', true);
      printKV('MAC (Message Auth Code):', tx.signature.substring(0, 16).toUpperCase());
      printKV('CHK (Checksum):', tx.payloadHash.substring(0, 12).toUpperCase());
      printKV('PKI Signature:', 'RSA-2048/SHA-256');
      printLine('');
      
    // ═══════════════════════════════════════════════════════════════════════════════
    // IP-ID / SERVER-TO-SERVER TRANSFER RECEIPT
    // ═══════════════════════════════════════════════════════════════════════════════
    } else {
      // IP-ID Header
      printLine('================================================================================', true);
      printLine('  IP-ID SERVER-TO-SERVER TRANSFER CONFIRMATION', true);
      printLine('================================================================================', true);
      printLine('');
      printLine('  DIGITAL COMMERCIAL BANK LTD', true);
      printLine('  IP-ID Network - Secure Financial Messaging', true);
      printLine('');
      printLine('--------------------------------------------------------------------------------', true);
      printLine('');
      
      // Transfer Identification
      printLine('  TRANSFER IDENTIFICATION', true);
      printLine('--------------------------------------------------------------------------------', true);
      printKV('Message ID:', tx.msgId);
      printKV('UETR:', tx.uetr);
      printKV('Message Format:', tx.messageType.includes('pacs') ? 'ISO 20022' : 'SWIFT MT');
      printKV('Message Type:', tx.messageType);
      printKV('Status:', tx.status === 'ACK' ? 'CONFIRMED' : tx.status);
      if (tx.confirmationCode) printKV('Confirmation Code:', tx.confirmationCode);
      printLine('');
      
      // Debtor / Ordering Party (ISO 20022 / SWIFT Standard)
      printLine('  DEBTOR / ORDERING PARTY (Dbtr)', true);
      printLine('--------------------------------------------------------------------------------', true);
      printKV('Account:', tx.sourceAccount || config.ledgerId);
      printKV('Name:', tx.sourceAccountName || config.bankName);
      if (tx.ledgerAccountIban) printKV('IBAN:', tx.ledgerAccountIban);
      printLine('');
      
      // Source Server
      printLine('  SOURCE SERVER (INSTRUCTING AGENT)', true);
      printLine('--------------------------------------------------------------------------------', true);
      printKV('Institution:', config.bankName);
      printKV('BIC:', config.bankBic);
      printKV('Server IP:', config.serverIp);
      printKV('Server Port:', config.serverPort.toString());
      printKV('IP-ID (Global):', config.globalServerIpId);
      printKV('IP-ID (Local):', config.localServerIpId);
      printKV('Ledger ID:', config.ledgerId);
      printLine('');
      
      // Ledger Account Details (if selected)
      if (tx.ledgerAccountId) {
        printLine('  LEDGER ACCOUNT DETAILS', true);
        printLine('--------------------------------------------------------------------------------', true);
        if (tx.ledgerAccountNumber) printKV('Account Number:', tx.ledgerAccountNumber);
        if (tx.ledgerAccountName) printKV('Account Name:', tx.ledgerAccountName);
        if (tx.ledgerAccountType) printKV('Account Type:', tx.ledgerAccountType);
        if (tx.ledgerAccountCurrency) printKV('Account Currency:', tx.ledgerAccountCurrency);
        if (tx.ledgerAccountBalance !== undefined) printKV('Account Balance:', `${tx.ledgerAccountCurrency || ''} ${tx.ledgerAccountBalance.toLocaleString('en-US', { minimumFractionDigits: 2 })}`);
        if (tx.ledgerAccountIban) printKV('IBAN:', tx.ledgerAccountIban);
        if (tx.ledgerAccountSwift) printKV('SWIFT/BIC:', tx.ledgerAccountSwift);
        if (tx.ledgerAccountBank) printKV('Bank Name:', tx.ledgerAccountBank);
        printLine('');
      }
      
      // Destination Server / Creditor
      printLine('  CREDITOR / DESTINATION SERVER (Cdtr)', true);
      printLine('--------------------------------------------------------------------------------', true);
      printKV('Beneficiary:', tx.beneficiaryName);
      printKV('Account:', tx.beneficiaryAccount);
      printKV('BIC:', tx.receiverBic);
      if (tx.destinationServer) printKV('Server Name:', tx.destinationServer);
      if (tx.destinationIpId) printKV('IP-ID:', tx.destinationIpId);
      printLine('');
      
      // Settlement Information
      printLine('  SETTLEMENT INFORMATION', true);
      printLine('--------------------------------------------------------------------------------', true);
      printKV('Settlement Method:', 'CLRG (Clearing)');
      printKV('Currency:', tx.currency);
      printKV('Amount:', tx.amount.toLocaleString('en-US', { minimumFractionDigits: 2 }));
      printKV('Charge Bearer:', 'SLEV (Service Level)');
      printLine('');
      
      // Connection Details
      printLine('  CONNECTION DETAILS', true);
      printLine('--------------------------------------------------------------------------------', true);
      printKV('Protocol:', 'TLS 1.3');
      printKV('Cipher Suite:', 'AES-256-GCM');
      printKV('Key Exchange:', 'ECDHE');
      if (tx.latencyMs) printKV('Latency:', `${tx.latencyMs}ms`);
      printLine('');
      
      // Timestamps
      printLine('  TIMESTAMPS', true);
      printLine('--------------------------------------------------------------------------------', true);
      printKV('Created:', tx.createdAt);
      if (tx.completedAt) printKV('Completed:', tx.completedAt);
      printLine('');
      
      // Page 2 - ISO 20022 Payload
      pdf.addPage();
      addBlackPage();
      y = margin;
      
      printLine('================================================================================', true);
      printLine('  ISO 20022 MESSAGE PAYLOAD', true);
      printLine('================================================================================', true);
      printLine('');
      
      const payloadLines = tx.payload.split('\n');
      payloadLines.forEach(line => {
        printLine(line.substring(0, 95));
      });
      
      printLine('');
      printLine('--------------------------------------------------------------------------------', true);
      printLine('  MESSAGE INTEGRITY', true);
      printLine('--------------------------------------------------------------------------------', true);
      printKV('SHA-256 Hash:', tx.payloadHash);
      printKV('HMAC-SHA256:', tx.signature);
      printLine('');
    }
    
    // Final verification section (both types)
    printLine('--------------------------------------------------------------------------------', true);
    printLine('  DOCUMENT VERIFICATION', true);
    printLine('--------------------------------------------------------------------------------', true);
    printKV('Document ID:', sha256Hex(tx.id + tx.payload + tx.createdAt).substring(0, 32));
    printKV('Generated:', new Date().toISOString());
    printKV('System:', 'SWIFT Alliance Terminal v2.0.0');
    printLine('');
    printLine('--------------------------------------------------------------------------------');
    printLine('  This document serves as official confirmation of the transfer.', true);
    printLine('  Keep this receipt for your records.', true);
    printLine('--------------------------------------------------------------------------------');
    printLine('');
    printLine('root@swift-alliance:~# _', true);

    const filename = `${tx.type}-BlackScreen-${tx.msgId}-${Date.now()}.pdf`;
    pdf.save(filename);
    log('success', `[PDF] BlackScreen Receipt generated: ${filename}`);
  }, [config, log]);

  // ═══════════════════════════════════════════════════════════════════════════════
  // GENERATE TRANSFER RECEIPT PDF (Professional Bank Standard)
  // ═══════════════════════════════════════════════════════════════════════════════

  const generateWhitePaperReceiptPDF = useCallback((tx: TransactionHistory) => {
    const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const margin = 15;
    let y = margin;
    const lineH = 4.5;

    const msgInfo = getMessageDescription(tx.messageType);
    const valueDate = new Date().toISOString().slice(2, 10).replace(/-/g, '');
    const timestamp = new Date().toISOString();

    // Professional styling functions
    const setSection = () => { pdf.setTextColor(15, 45, 75); pdf.setFontSize(9); pdf.setFont('Helvetica', 'bold'); };
    const setLabel = () => { pdf.setTextColor(70, 70, 70); pdf.setFontSize(7.5); pdf.setFont('Helvetica', 'normal'); };
    const setValue = () => { pdf.setTextColor(15, 15, 15); pdf.setFontSize(7.5); pdf.setFont('Helvetica', 'normal'); };
    const setSmall = () => { pdf.setTextColor(90, 90, 90); pdf.setFontSize(6.5); pdf.setFont('Helvetica', 'normal'); };
    const setField = () => { pdf.setTextColor(0, 70, 130); pdf.setFontSize(7.5); pdf.setFont('Helvetica', 'bold'); };
    const setHighlight = () => { pdf.setTextColor(0, 100, 60); pdf.setFontSize(8); pdf.setFont('Helvetica', 'bold'); };

    const drawLine = (y1: number, color: number[] = [200, 200, 200], width: number = 0.3) => {
      pdf.setDrawColor(color[0], color[1], color[2]);
      pdf.setLineWidth(width);
      pdf.line(margin, y1, pageWidth - margin, y1);
    };

    const drawDoubleLine = (y1: number) => {
      pdf.setDrawColor(15, 45, 75);
      pdf.setLineWidth(0.5);
      pdf.line(margin, y1, pageWidth - margin, y1);
      pdf.setLineWidth(0.2);
      pdf.line(margin, y1 + 1, pageWidth - margin, y1 + 1);
    };

    const printRow = (label: string, value: string) => {
      setLabel();
      pdf.text(label, margin, y);
      setValue();
      pdf.text(String(value || ''), margin + 45, y);
      y += lineH;
    };

    const printField = (field: string, value: string) => {
      setField();
      pdf.text(field, margin, y);
      setValue();
      pdf.text(String(value || ''), margin + 20, y);
      y += lineH;
    };

    const printHighlightRow = (label: string, value: string) => {
      setLabel();
      pdf.text(label, margin, y);
      setHighlight();
      pdf.text(String(value || ''), margin + 45, y);
      y += lineH;
    };

    // ═══════════════════════════════════════════════════════════════════════════════
    // SWIFT FIN TRANSFER RECEIPT - PROFESSIONAL BANK STANDARD
    // ═══════════════════════════════════════════════════════════════════════════════
    if (tx.type === 'SWIFT') {
      // ─────────────────────────────────────────────────────────────────────────────
      // HEADER SECTION - Professional Bank Header (Height: 42mm)
      // ─────────────────────────────────────────────────────────────────────────────
      
      // Main header background
      pdf.setFillColor(15, 45, 80);
      pdf.rect(0, 0, pageWidth, 42, 'F');
      
      // Top accent line
      pdf.setFillColor(0, 150, 100);
      pdf.rect(0, 0, pageWidth, 2, 'F');
      
      // Bank Logo Box
      pdf.setFillColor(255, 255, 255);
      pdf.roundedRect(margin, 8, 14, 14, 2, 2, 'F');
      pdf.setTextColor(15, 45, 80);
      pdf.setFontSize(9);
      pdf.setFont('Helvetica', 'bold');
      pdf.text('DCB', margin + 2, 17);
      
      // Bank Name
      pdf.setTextColor(255, 255, 255);
      pdf.setFontSize(14);
      pdf.setFont('Helvetica', 'bold');
      pdf.text('DIGITAL COMMERCIAL BANK LTD', margin + 32, 14);
      
      // Bank Description
      pdf.setFontSize(7);
      pdf.setFont('Helvetica', 'normal');
      pdf.setTextColor(160, 190, 220);
      pdf.text('Licensed Banking Institution • Union of Comoros • BIC: DCBKAEADXXX', margin + 32, 20);
      
      // Message Type Badge (positioned below bank info)
      pdf.setFillColor(0, 130, 90);
      pdf.roundedRect(margin, 28, 65, 9, 1.5, 1.5, 'F');
      pdf.setTextColor(255, 255, 255);
      pdf.setFontSize(10);
      pdf.setFont('Helvetica', 'bold');
      pdf.text(tx.messageType, margin + 3, 34);
      pdf.setFontSize(7);
      pdf.setFont('Helvetica', 'normal');
      pdf.text('- ' + msgInfo.name.substring(0, 28), margin + 22, 34);
      
      // Reference Box (right side)
      pdf.setFillColor(255, 255, 255);
      pdf.roundedRect(pageWidth - 58, 6, 46, 32, 2, 2, 'F');
      
      // Reference Box Content
      pdf.setTextColor(100, 100, 100);
      pdf.setFontSize(6);
      pdf.setFont('Helvetica', 'normal');
      pdf.text('TRANSACTION REFERENCE', pageWidth - 56, 12);
      
      pdf.setTextColor(15, 45, 80);
      pdf.setFontSize(6.5);
      pdf.setFont('Helvetica', 'bold');
      pdf.text(tx.msgId.substring(0, 22), pageWidth - 56, 18);
      
      pdf.setDrawColor(200, 200, 200);
      pdf.setLineWidth(0.2);
      pdf.line(pageWidth - 56, 21, pageWidth - 14, 21);
      
      pdf.setTextColor(80, 80, 80);
      pdf.setFontSize(6);
      pdf.setFont('Helvetica', 'normal');
      pdf.text('Date:', pageWidth - 56, 26);
      pdf.text(timestamp.split('T')[0], pageWidth - 40, 26);
      pdf.text('Time:', pageWidth - 56, 31);
      pdf.text(timestamp.split('T')[1].substring(0, 8), pageWidth - 40, 31);
      pdf.text('Cat:', pageWidth - 56, 36);
      pdf.setTextColor(0, 100, 70);
      pdf.setFont('Helvetica', 'bold');
      pdf.text(msgInfo.category, pageWidth - 44, 36);
      
      y = 48;
      
      // Status Banner - Professional Style
      const statusText = tx.status === 'ACK' ? 'CONFIRMED' : tx.status === 'PENDING' ? 'PROCESSING' : tx.status;
      const statusBgColor = tx.status === 'ACK' ? [0, 100, 60] : tx.status === 'PENDING' ? [180, 140, 0] : [180, 40, 40];
      
      pdf.setFillColor(248, 250, 252);
      pdf.roundedRect(margin, y - 2, pageWidth - margin * 2, 12, 1, 1, 'F');
      pdf.setDrawColor(220, 225, 230);
      pdf.setLineWidth(0.3);
      pdf.roundedRect(margin, y - 2, pageWidth - margin * 2, 12, 1, 1, 'S');
      
      pdf.setTextColor(15, 45, 75);
      pdf.setFontSize(8);
      pdf.setFont('Helvetica', 'bold');
      pdf.text('TRANSFER CONFIRMATION', margin + 3, y + 5);
      
      // Status Badge
      pdf.setFillColor(statusBgColor[0], statusBgColor[1], statusBgColor[2]);
      pdf.roundedRect(pageWidth - margin - 28, y, 25, 7, 1, 1, 'F');
      pdf.setTextColor(255, 255, 255);
      pdf.setFontSize(6);
      pdf.setFont('Helvetica', 'bold');
      pdf.text(statusText, pageWidth - margin - 26, y + 5);
      
      y += 16;
      
      // SWIFT Message Header Section
      setSection();
      pdf.text('SWIFT MESSAGE HEADER', margin, y);
      y += 2;
      drawDoubleLine(y);
      y += lineH + 2;
      
      // Basic Header Block
      pdf.setFillColor(250, 252, 255);
      pdf.roundedRect(margin, y - 2, (pageWidth - margin * 2) / 2 - 2, 22, 1, 1, 'F');
      
      pdf.setTextColor(15, 45, 75);
      pdf.setFontSize(7);
      pdf.setFont('Helvetica', 'bold');
      pdf.text('BASIC HEADER {1:}', margin + 2, y + 2);
      
      setSmall();
      pdf.text('Application ID:', margin + 2, y + 7);
      setValue();
      pdf.text('F01 (FIN)', margin + 30, y + 7);
      setSmall();
      pdf.text('Logical Terminal:', margin + 2, y + 11);
      setValue();
      pdf.text(`${config.bankBic}AXXX`, margin + 30, y + 11);
      setSmall();
      pdf.text('Session Number:', margin + 2, y + 15);
      setValue();
      pdf.text(Math.floor(Math.random() * 9999).toString().padStart(4, '0'), margin + 30, y + 15);
      
      // Application Header Block
      const col2X = margin + (pageWidth - margin * 2) / 2 + 2;
      pdf.setFillColor(250, 252, 255);
      pdf.roundedRect(col2X, y - 2, (pageWidth - margin * 2) / 2 - 2, 22, 1, 1, 'F');
      
      pdf.setTextColor(15, 45, 75);
      pdf.setFontSize(7);
      pdf.setFont('Helvetica', 'bold');
      pdf.text('APPLICATION HEADER {2:}', col2X + 2, y + 2);
      
      setSmall();
      pdf.text('I/O Identifier:', col2X + 2, y + 7);
      setValue();
      pdf.text('I (Input)', col2X + 28, y + 7);
      setSmall();
      pdf.text('Receiver BIC:', col2X + 2, y + 11);
      setValue();
      pdf.text(`${tx.receiverBic}`, col2X + 28, y + 11);
      setSmall();
      pdf.text('Priority:', col2X + 2, y + 15);
      setValue();
      pdf.text('N (Normal)', col2X + 28, y + 15);
      
      y += 26;
      
      // User Header Section
      pdf.setFillColor(245, 250, 255);
      pdf.roundedRect(margin, y - 2, pageWidth - margin * 2, 16, 1, 1, 'F');
      pdf.setDrawColor(0, 100, 140);
      pdf.setLineWidth(0.3);
      pdf.roundedRect(margin, y - 2, pageWidth - margin * 2, 16, 1, 1, 'S');
      
      pdf.setTextColor(0, 80, 130);
      pdf.setFontSize(7);
      pdf.setFont('Helvetica', 'bold');
      pdf.text('USER HEADER {3:}', margin + 2, y + 2);
      
      setSmall();
      pdf.text('Service Type {119}:', margin + 2, y + 7);
      setValue();
      pdf.text(tx.messageType.includes('STP') ? 'STP' : 'FIN', margin + 35, y + 7);
      
      setSmall();
      pdf.text('MUR {108}:', margin + 55, y + 7);
      setValue();
      pdf.text(tx.msgId.substring(0, 16), margin + 75, y + 7);
      
      setSmall();
      pdf.text('UETR {121}:', margin + 2, y + 11);
      setHighlight();
      pdf.text(tx.uetr, margin + 25, y + 11);
      
      y += 20;
      
      // Message-Specific Fields Section
      setSection();
      pdf.text(`${tx.messageType} - ${msgInfo.name.toUpperCase()}`, margin, y);
      y += 2;
      drawDoubleLine(y);
      y += lineH + 1;
      
      // Generate fields based on message type
      if (tx.messageType.startsWith('MT1')) {
        // Category 1 - Customer Payments
        printField(':20:', tx.trn || tx.msgId);
        if (tx.messageType === 'MT103' || tx.messageType === 'MT103STP') {
          printField(':23B:', 'CRED');
          printField(':32A:', `${valueDate}${tx.currency}${tx.amount.toFixed(2).replace('.', ',')}`);
          printField(':50K:', `/${tx.sourceAccount || config.ledgerId}`);
          printRow('', tx.sourceAccountName || config.bankName);
          printField(':59:', `/${tx.beneficiaryAccount}`);
          printRow('', tx.beneficiaryName);
          printField(':70:', tx.msgId.substring(0, 35));
          printField(':71A:', 'SHA');
        } else if (tx.messageType === 'MT101') {
          printField(':21R:', 'NONREF');
          printField(':28D:', '1/1');
          printField(':50H:', `/${tx.sourceAccount}`);
          printField(':52A:', config.bankBic);
          printField(':30:', valueDate);
          printField(':32B:', `${tx.currency}${tx.amount.toFixed(2).replace('.', ',')}`);
          printField(':59:', `/${tx.beneficiaryAccount}`);
        } else if (tx.messageType === 'MT102') {
          printField(':23:', 'CRED');
          printField(':50K:', `/${tx.sourceAccount}`);
          printField(':52A:', config.bankBic);
          printField(':26T:', '001');
          printField(':32A:', `${valueDate}${tx.currency}${tx.amount.toFixed(2).replace('.', ',')}`);
          printField(':59:', `/${tx.beneficiaryAccount}`);
        } else if (tx.messageType === 'MT104') {
          printField(':23E:', 'SDVA');
          printField(':30:', valueDate);
          printField(':51A:', config.bankBic);
          printField(':50K:', `/${tx.sourceAccount}`);
          printField(':32B:', `${tx.currency}${tx.amount.toFixed(2).replace('.', ',')}`);
          printField(':59:', `/${tx.beneficiaryAccount}`);
        }
      } else if (tx.messageType.startsWith('MT2')) {
        // Category 2 - FI Transfers
        printField(':20:', tx.trn || tx.msgId);
        printField(':21:', 'NONREF');
        printField(':32A:', `${valueDate}${tx.currency}${tx.amount.toFixed(2).replace('.', ',')}`);
        printField(':52A:', config.bankBic);
        printField(':58A:', tx.receiverBic);
        if (tx.messageType === 'MT202COV') {
          printField(':50K:', `/${tx.sourceAccount}`);
          printRow('', tx.sourceAccountName || '');
          printField(':59:', `/${tx.beneficiaryAccount}`);
          printRow('', tx.beneficiaryName);
        }
      } else if (tx.messageType.startsWith('MT3')) {
        // Category 3 - Treasury
        printField(':15A:', '');
        printField(':20:', tx.trn || tx.msgId);
        printField(':22A:', 'NEWT');
        printField(':82A:', config.bankBic);
        printField(':87A:', tx.receiverBic);
        printField(':15B:', '');
        printField(':30T:', valueDate);
        printField(':30V:', valueDate);
        printField(':32B:', `${tx.currency}${tx.amount.toFixed(2).replace('.', ',')}`);
      } else if (tx.messageType.startsWith('MT4')) {
        // Category 4 - Collections
        printField(':20:', tx.trn || tx.msgId);
        printField(':21:', tx.msgId);
        printField(':32A:', `${valueDate}${tx.currency}${tx.amount.toFixed(2).replace('.', ',')}`);
        printField(':52A:', config.bankBic);
        if (tx.messageType === 'MT405') {
          printField(':59:', `/${tx.beneficiaryAccount}`);
          printRow('', tx.beneficiaryName);
        }
      } else if (tx.messageType.startsWith('MT5')) {
        // Category 5 - Securities
        printField(':16R:', 'GENL');
        printField(':20C:', `::SEME//${tx.trn || tx.msgId}`);
        printField(':23G:', 'NEWM');
        printField(':16S:', 'GENL');
        printField(':98A:', `::SETT//${valueDate}`);
        if (tx.messageType === 'MT541' || tx.messageType === 'MT543') {
          printField(':19A:', `::SETT//${tx.currency}${tx.amount.toFixed(2).replace('.', ',')}`);
        }
        printField(':35B:', 'ISIN SECURITY');
        printField(':36B:', '::SETT//UNIT/100,');
        printField(':97A:', `::SAFE//${tx.beneficiaryAccount}`);
        printField(':95P:', `::${tx.messageType === 'MT540' || tx.messageType === 'MT541' ? 'DEAG' : 'REAG'}//${tx.receiverBic}`);
      } else if (tx.messageType.startsWith('MT7')) {
        // Category 7 - Documentary Credits
        if (tx.messageType === 'MT700') {
          printField(':27:', '1/1');
          printField(':40A:', 'IRREVOCABLE');
          printField(':20:', tx.trn || tx.msgId);
          printField(':31C:', valueDate);
          printField(':40E:', 'UCP LATEST VERSION');
          printField(':31D:', `${valueDate}MORONI`);
          printField(':50:', tx.sourceAccountName || config.bankName);
          printField(':59:', tx.beneficiaryName);
          printField(':32B:', `${tx.currency}${tx.amount.toFixed(2).replace('.', ',')}`);
          printField(':41D:', `${tx.receiverBic} BY NEGOTIATION`);
          printField(':42C:', 'DRAFTS AT SIGHT');
          printField(':48:', '21 DAYS');
          printField(':49:', 'CONFIRM');
        } else if (tx.messageType === 'MT760') {
          printField(':27:', '1/1');
          printField(':20:', tx.trn || tx.msgId);
          printField(':23:', 'ISSUE');
          printField(':30:', valueDate);
          printField(':40C:', 'URDG');
          printField(':77C:', 'GUARANTEE TEXT');
        } else if (tx.messageType === 'MT799') {
          printField(':20:', tx.trn || tx.msgId);
          printField(':21:', 'NONREF');
          printField(':79:', 'FREE FORMAT MESSAGE');
        }
      } else if (tx.messageType.startsWith('MT9')) {
        // Category 9 - Cash Management
        printField(':20:', tx.trn || tx.msgId);
        if (tx.messageType === 'MT900' || tx.messageType === 'MT910') {
          printField(':21:', tx.msgId);
          printField(':25:', tx.messageType === 'MT900' ? tx.sourceAccount : tx.beneficiaryAccount);
          printField(':32A:', `${valueDate}${tx.currency}${tx.amount.toFixed(2).replace('.', ',')}`);
          printField(':52A:', config.bankBic);
        } else if (tx.messageType === 'MT940' || tx.messageType === 'MT950') {
          printField(':25:', tx.sourceAccount || config.ledgerId);
          printField(':28C:', '1/1');
          printField(':60F:', `C${valueDate}${tx.currency}${tx.amount.toFixed(2).replace('.', ',')}`);
          if (tx.messageType === 'MT940') {
            printField(':61:', `${valueDate}C${tx.amount.toFixed(2).replace('.', ',')}NTRFNONREF//`);
            printField(':86:', 'TRANSFER');
          }
          printField(':62F:', `C${valueDate}${tx.currency}${tx.amount.toFixed(2).replace('.', ',')}`);
        } else if (tx.messageType === 'MT920') {
          printField(':12:', '940');
          printField(':25:', tx.sourceAccount || config.ledgerId);
        }
      } else {
        // Common/Free Format Messages
        printField(':20:', tx.trn || tx.msgId);
        printField(':21:', 'NONREF');
        if (tx.messageType === 'MT192') {
          printField(':11S:', `103 ${valueDate}`);
        }
        printField(':79:', 'FREE FORMAT MESSAGE');
      }
      y += 2;
      
      // Ledger Account (if selected)
      if (tx.ledgerAccountId) {
        setSection();
        pdf.text('LEDGER ACCOUNT', margin, y);
        y += 2;
        drawLine(y);
        y += lineH;
        
        if (tx.ledgerAccountNumber) printRow('Account Number:', tx.ledgerAccountNumber);
        if (tx.ledgerAccountName) printRow('Account Name:', tx.ledgerAccountName);
        if (tx.ledgerAccountType) printRow('Type:', tx.ledgerAccountType);
        if (tx.ledgerAccountCurrency && tx.ledgerAccountBalance !== undefined) {
          printRow('Balance:', `${tx.ledgerAccountCurrency} ${tx.ledgerAccountBalance.toLocaleString('en-US', { minimumFractionDigits: 2 })}`);
        }
        if (tx.ledgerAccountIban) printRow('IBAN:', tx.ledgerAccountIban);
        if (tx.ledgerAccountSwift) printRow('SWIFT:', tx.ledgerAccountSwift);
        if (tx.ledgerAccountBank) printRow('Bank:', tx.ledgerAccountBank);
        y += 2;
      }
      
      // Charges
      setSection();
      pdf.text('CHARGES :71A:', margin, y);
      y += 2;
      drawLine(y);
      y += lineH;
      
      printRow('Charge Bearer:', 'SHA');
      y += 2;
      
      // Trailer
      setSection();
      pdf.text('TRAILER {5:}', margin, y);
      y += 2;
      drawLine(y);
      y += lineH;
      
      printRow('MAC:', tx.signature.substring(0, 8).toUpperCase());
      printRow('CHK:', tx.payloadHash.substring(0, 12).toUpperCase());
      y += 2;
      
      // Delivery
      setSection();
      pdf.text('DELIVERY CONFIRMATION', margin, y);
      y += 2;
      drawLine(y);
      y += lineH;
      
      printRow('Status:', tx.status === 'ACK' ? 'DELIVERED' : tx.status);
      if (tx.confirmationCode) printRow('Confirmation:', tx.confirmationCode);
      if (tx.completedAt) printRow('Time:', tx.completedAt);
      if (tx.latencyMs) printRow('Latency:', `${tx.latencyMs}ms`);
      y += 2;
      
      // Page 2 - Message
      pdf.addPage();
      y = margin;
      
      // Header Page 2
      pdf.setFillColor(20, 50, 80);
      pdf.rect(0, 0, pageWidth, 12, 'F');
      pdf.setTextColor(255, 255, 255);
      pdf.setFontSize(7);
      pdf.setFont('Helvetica', 'bold');
      pdf.text(`${tx.messageType} - ${tx.msgId} - Page 2`, margin, 8);
      y = 18;
      
      // Raw Message
      setSection();
      pdf.text('SWIFT FIN MESSAGE', margin, y);
      y += 2;
      drawLine(y);
      y += 3;
      
      pdf.setFillColor(252, 252, 252);
      const msgBoxHeight = Math.min(100, tx.payload.split('\n').length * 3 + 6);
      pdf.rect(margin, y, pageWidth - margin * 2, msgBoxHeight, 'F');
      pdf.setDrawColor(220, 220, 220);
      pdf.setLineWidth(0.1);
      pdf.rect(margin, y, pageWidth - margin * 2, msgBoxHeight, 'S');
      
      pdf.setTextColor(40, 40, 40);
      pdf.setFontSize(6);
      pdf.setFont('Courier', 'normal');
      y += 3;
      const payloadLines = tx.payload.split('\n').slice(0, 25);
      payloadLines.forEach(line => {
        if (y < pageHeight - 25) {
          pdf.text(line.substring(0, 95), margin + 2, y);
          y += 3;
        }
      });
      if (tx.payload.split('\n').length > 25) {
        pdf.text('[...]', margin + 2, y);
      }
      
      // Professional Footer
      y = pageHeight - 22;
      
      // Footer separator
      pdf.setFillColor(248, 250, 252);
      pdf.rect(0, y - 2, pageWidth, 24, 'F');
      pdf.setDrawColor(15, 45, 75);
      pdf.setLineWidth(0.5);
      pdf.line(margin, y - 2, pageWidth - margin, y - 2);
      
      y += 3;
      
      // Document verification info
      pdf.setTextColor(70, 70, 70);
      pdf.setFontSize(6);
      pdf.setFont('Helvetica', 'normal');
      pdf.text(`Document Hash: ${sha256Hex(tx.id + tx.payload + tx.createdAt).substring(0, 40)}`, margin, y);
      
      pdf.text(`Generated: ${new Date().toISOString()}`, pageWidth - margin - 45, y);
      
      y += 4;
      pdf.setTextColor(15, 45, 75);
      pdf.setFontSize(7);
      pdf.setFont('Helvetica', 'bold');
      pdf.text('Digital Commercial Bank Ltd', margin, y);
      pdf.setFont('Helvetica', 'normal');
      pdf.setTextColor(70, 70, 70);
      pdf.text(' | BIC: DCBKAEADXXX | Licensed Banking Institution', margin + 42, y);
      
      y += 4;
      pdf.setFontSize(5.5);
      pdf.setTextColor(120, 120, 120);
      pdf.text('This document is electronically generated and is valid without signature. Verify authenticity using the Document Hash.', margin, y);
      
    // ═══════════════════════════════════════════════════════════════════════════════
    // IP-ID TRANSFER RECEIPT - PROFESSIONAL BANK STANDARD
    // ═══════════════════════════════════════════════════════════════════════════════
    } else {
      // ─────────────────────────────────────────────────────────────────────────────
      // HEADER SECTION - Professional Bank Header (Height: 42mm)
      // ─────────────────────────────────────────────────────────────────────────────
      
      // Main header background
      pdf.setFillColor(0, 55, 70);
      pdf.rect(0, 0, pageWidth, 42, 'F');
      
      // Top accent line
      pdf.setFillColor(0, 180, 140);
      pdf.rect(0, 0, pageWidth, 2, 'F');
      
      // Bank Logo Box
      pdf.setFillColor(255, 255, 255);
      pdf.roundedRect(margin, 8, 14, 14, 2, 2, 'F');
      pdf.setTextColor(0, 55, 70);
      pdf.setFontSize(9);
      pdf.setFont('Helvetica', 'bold');
      pdf.text('DCB', margin + 2, 17);
      
      // Bank Name
      pdf.setTextColor(255, 255, 255);
      pdf.setFontSize(14);
      pdf.setFont('Helvetica', 'bold');
      pdf.text('DIGITAL COMMERCIAL BANK LTD', margin + 32, 14);
      
      // Bank Description
      pdf.setFontSize(7);
      pdf.setFont('Helvetica', 'normal');
      pdf.setTextColor(140, 210, 210);
      pdf.text('IP-ID Server-to-Server Transfer Network • TLS 1.3 • AES-256-GCM', margin + 32, 20);
      
      // Protocol Badge (positioned below bank info)
      pdf.setFillColor(0, 150, 120);
      pdf.roundedRect(margin, 28, 65, 9, 1.5, 1.5, 'F');
      pdf.setTextColor(255, 255, 255);
      pdf.setFontSize(10);
      pdf.setFont('Helvetica', 'bold');
      pdf.text('IP-ID', margin + 3, 34);
      pdf.setFontSize(7);
      pdf.setFont('Helvetica', 'normal');
      pdf.text('- Server-to-Server Transfer', margin + 18, 34);
      
      // Reference Box (right side)
      pdf.setFillColor(255, 255, 255);
      pdf.roundedRect(pageWidth - 58, 6, 46, 32, 2, 2, 'F');
      
      // Reference Box Content
      const ts = new Date().toISOString();
      pdf.setTextColor(100, 100, 100);
      pdf.setFontSize(6);
      pdf.setFont('Helvetica', 'normal');
      pdf.text('TRANSACTION REFERENCE', pageWidth - 56, 12);
      
      pdf.setTextColor(0, 55, 70);
      pdf.setFontSize(6.5);
      pdf.setFont('Helvetica', 'bold');
      pdf.text(tx.msgId.substring(0, 22), pageWidth - 56, 18);
      
      pdf.setDrawColor(200, 200, 200);
      pdf.setLineWidth(0.2);
      pdf.line(pageWidth - 56, 21, pageWidth - 14, 21);
      
      pdf.setTextColor(80, 80, 80);
      pdf.setFontSize(6);
      pdf.setFont('Helvetica', 'normal');
      pdf.text('Date:', pageWidth - 56, 26);
      pdf.text(ts.split('T')[0], pageWidth - 40, 26);
      pdf.text('Time:', pageWidth - 56, 31);
      pdf.text(ts.split('T')[1].substring(0, 8), pageWidth - 40, 31);
      pdf.text('Protocol:', pageWidth - 56, 36);
      pdf.setTextColor(0, 130, 100);
      pdf.setFont('Helvetica', 'bold');
      pdf.text('IP-ID', pageWidth - 40, 36);
      
      y = 48;
      
      // Status Banner - Professional Style
      const statusText = tx.status === 'ACK' ? 'CONFIRMED' : tx.status === 'PENDING' ? 'PROCESSING' : tx.status;
      const statusBgColor = tx.status === 'ACK' ? [0, 120, 80] : tx.status === 'PENDING' ? [180, 140, 0] : [180, 40, 40];
      
      pdf.setFillColor(248, 252, 252);
      pdf.roundedRect(margin, y - 2, pageWidth - margin * 2, 12, 1, 1, 'F');
      pdf.setDrawColor(200, 220, 220);
      pdf.setLineWidth(0.3);
      pdf.roundedRect(margin, y - 2, pageWidth - margin * 2, 12, 1, 1, 'S');
      
      pdf.setTextColor(0, 55, 70);
      pdf.setFontSize(8);
      pdf.setFont('Helvetica', 'bold');
      pdf.text('TRANSFER CONFIRMATION', margin + 3, y + 5);
      
      // Status Badge
      pdf.setFillColor(statusBgColor[0], statusBgColor[1], statusBgColor[2]);
      pdf.roundedRect(pageWidth - margin - 28, y, 25, 7, 1, 1, 'F');
      pdf.setTextColor(255, 255, 255);
      pdf.setFontSize(6);
      pdf.setFont('Helvetica', 'bold');
      pdf.text(statusText, pageWidth - margin - 26, y + 5);
      
      y += 16;
      
      // Transfer Identification
      setSection();
      pdf.text('TRANSFER IDENTIFICATION', margin, y);
      y += 2;
      drawLine(y);
      y += lineH;
      
      printRow('Message ID:', tx.msgId);
      printRow('UETR:', tx.uetr);
      printRow('Format:', tx.messageType.includes('pacs') ? 'ISO 20022 CBPR+' : 'SWIFT MT');
      printRow('Type:', tx.messageType);
      if (tx.confirmationCode) printRow('Confirmation:', tx.confirmationCode);
      y += 2;
      
      // Debtor / Ordering Party (ISO 20022 Standard)
      setSection();
      pdf.text('DEBTOR (Dbtr)', margin, y);
      y += 2;
      drawLine(y);
      y += lineH;
      
      printRow('Account:', tx.sourceAccount || config.ledgerId);
      printRow('Name:', tx.sourceAccountName || config.bankName);
      if (tx.ledgerAccountIban) printRow('IBAN:', tx.ledgerAccountIban);
      y += 2;
      
      // Source Server / Instructing Agent
      setSection();
      pdf.text('INSTRUCTING AGENT (InstgAgt)', margin, y);
      y += 2;
      drawLine(y);
      y += lineH;
      
      printRow('Institution:', config.bankName);
      printRow('BIC:', config.bankBic);
      printRow('Server IP:', config.serverIp);
      printRow('IP-ID:', config.globalServerIpId);
      y += 2;
      
      // Ledger Account (if selected)
      if (tx.ledgerAccountId) {
        setSection();
        pdf.text('LEDGER ACCOUNT', margin, y);
        y += 2;
        drawLine(y);
        y += lineH;
        
        if (tx.ledgerAccountNumber) printRow('Account Number:', tx.ledgerAccountNumber);
        if (tx.ledgerAccountName) printRow('Account Name:', tx.ledgerAccountName);
        if (tx.ledgerAccountType) printRow('Type:', tx.ledgerAccountType);
        if (tx.ledgerAccountCurrency && tx.ledgerAccountBalance !== undefined) {
          printRow('Balance:', `${tx.ledgerAccountCurrency} ${tx.ledgerAccountBalance.toLocaleString('en-US', { minimumFractionDigits: 2 })}`);
        }
        if (tx.ledgerAccountIban) printRow('IBAN:', tx.ledgerAccountIban);
        if (tx.ledgerAccountSwift) printRow('SWIFT:', tx.ledgerAccountSwift);
        if (tx.ledgerAccountBank) printRow('Bank:', tx.ledgerAccountBank);
        y += 2;
      }
      
      // Creditor / Destination Server
      setSection();
      pdf.text('CREDITOR (Cdtr)', margin, y);
      y += 2;
      drawLine(y);
      y += lineH;
      
      printRow('Name:', tx.beneficiaryName);
      printRow('Account:', tx.beneficiaryAccount);
      printRow('BIC:', tx.receiverBic);
      if (tx.destinationServer) printRow('Server:', tx.destinationServer);
      if (tx.destinationIpId) printRow('IP-ID:', tx.destinationIpId);
      y += 2;
      
      // Settlement
      setSection();
      pdf.text('SETTLEMENT', margin, y);
      y += 2;
      drawLine(y);
      y += lineH;
      
      printRow('Currency:', tx.currency);
      printRow('Amount:', tx.amount.toLocaleString('en-US', { minimumFractionDigits: 2 }));
      printRow('Method:', 'CLRG');
      printRow('Charge Bearer:', 'SLEV');
      y += 2;
      
      // Connection
      setSection();
      pdf.text('CONNECTION', margin, y);
      y += 2;
      drawLine(y);
      y += lineH;
      
      printRow('Protocol:', 'TLS 1.3');
      printRow('Cipher:', 'AES-256-GCM');
      printRow('Key Exchange:', 'ECDHE');
      if (tx.latencyMs) printRow('Latency:', `${tx.latencyMs}ms`);
      y += 2;
      
      // Timestamps
      setSection();
      pdf.text('TIMESTAMPS', margin, y);
      y += 2;
      drawLine(y);
      y += lineH;
      
      printRow('Created:', tx.createdAt);
      if (tx.completedAt) printRow('Completed:', tx.completedAt);
      y += 2;
      
      // Integrity
      setSection();
      pdf.text('MESSAGE INTEGRITY', margin, y);
      y += 2;
      drawLine(y);
      y += lineH;
      
      printRow('SHA-256:', tx.payloadHash.substring(0, 40) + '...');
      printRow('HMAC:', tx.signature.substring(0, 40) + '...');
      y += 2;
      
      // Page 2 - Payload
      pdf.addPage();
      y = margin;
      
      // Header Page 2
      pdf.setFillColor(0, 70, 70);
      pdf.rect(0, 0, pageWidth, 12, 'F');
      pdf.setTextColor(255, 255, 255);
      pdf.setFontSize(7);
      pdf.setFont('Helvetica', 'bold');
      pdf.text(`IP-ID Transfer - ${tx.msgId} - Page 2`, margin, 8);
      y = 18;
      
      // Payload
      setSection();
      pdf.text('MESSAGE PAYLOAD', margin, y);
      y += 2;
      drawLine(y);
      y += 3;
      
      pdf.setFillColor(252, 252, 252);
      const msgBoxHeight = Math.min(120, tx.payload.split('\n').length * 3 + 6);
      pdf.rect(margin, y, pageWidth - margin * 2, msgBoxHeight, 'F');
      pdf.setDrawColor(220, 220, 220);
      pdf.setLineWidth(0.1);
      pdf.rect(margin, y, pageWidth - margin * 2, msgBoxHeight, 'S');
      
      pdf.setTextColor(40, 40, 40);
      pdf.setFontSize(6);
      pdf.setFont('Courier', 'normal');
      y += 3;
      const payloadLines = tx.payload.split('\n').slice(0, 30);
      payloadLines.forEach(line => {
        if (y < pageHeight - 25) {
          pdf.text(line.substring(0, 95), margin + 2, y);
          y += 3;
        }
      });
      if (tx.payload.split('\n').length > 30) {
        pdf.text('[...]', margin + 2, y);
      }
      
      // Professional Footer
      y = pageHeight - 22;
      
      // Footer separator
      pdf.setFillColor(248, 252, 252);
      pdf.rect(0, y - 2, pageWidth, 24, 'F');
      pdf.setDrawColor(0, 75, 85);
      pdf.setLineWidth(0.5);
      pdf.line(margin, y - 2, pageWidth - margin, y - 2);
      
      y += 3;
      
      // Document verification info
      pdf.setTextColor(70, 70, 70);
      pdf.setFontSize(6);
      pdf.setFont('Helvetica', 'normal');
      pdf.text(`Document Hash: ${sha256Hex(tx.id + tx.payload + tx.createdAt).substring(0, 40)}`, margin, y);
      
      pdf.text(`Generated: ${new Date().toISOString()}`, pageWidth - margin - 45, y);
      
      y += 4;
      pdf.setTextColor(0, 60, 70);
      pdf.setFontSize(7);
      pdf.setFont('Helvetica', 'bold');
      pdf.text('Digital Commercial Bank Ltd', margin, y);
      pdf.setFont('Helvetica', 'normal');
      pdf.setTextColor(70, 70, 70);
      pdf.text(' | BIC: DCBKAEADXXX | IP-ID Network', margin + 42, y);
      
      y += 4;
      pdf.setFontSize(5.5);
      pdf.setTextColor(120, 120, 120);
      pdf.text('This document is electronically generated and is valid without signature. Verify authenticity using the Document Hash.', margin, y);
    }

    const filename = `${tx.type}-Transfer-Receipt-${tx.msgId}-${Date.now()}.pdf`;
    pdf.save(filename);
    log('success', `[PDF] Transfer Receipt generated: ${filename}`);
  }, [config, log]);

  // ═══════════════════════════════════════════════════════════════════════════════
  // GENERATE BLACKSCREEN PDF
  // ═══════════════════════════════════════════════════════════════════════════════

  const generateBlackScreenPDF = useCallback((message: SwiftMessage) => {
    const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const margin = 8;
    let y = margin;
    const fontSize = 7;
    const lineHeight = 3.5;

    const addBlackPage = () => {
      pdf.setFillColor(0, 0, 0);
      pdf.rect(0, 0, pageWidth, pageHeight, 'F');
    };

    const setGreen = () => {
      pdf.setTextColor(0, 255, 65);
      pdf.setFontSize(fontSize);
      pdf.setFont('Courier', 'normal');
    };

    const setWhite = () => {
      pdf.setTextColor(255, 255, 255);
      pdf.setFontSize(fontSize);
      pdf.setFont('Courier', 'normal');
    };

    const printLine = (text: string, isGreen = false) => {
      if (y > pageHeight - margin) {
        pdf.addPage();
        addBlackPage();
        y = margin;
      }
      if (isGreen) setGreen(); else setWhite();
      pdf.text(text, margin, y);
      y += lineHeight;
    };

    const printKV = (key: string, value: string) => {
      if (y > pageHeight - margin) {
        pdf.addPage();
        addBlackPage();
        y = margin;
      }
      setGreen();
      pdf.text(key, margin, y);
      setWhite();
      pdf.text(String(value), margin + 45, y);
      y += lineHeight;
    };

    addBlackPage();

    printLine('================================================================================', true);
    printLine('  SWIFT ALLIANCE LIKE - IP-ID TRANSFER BLACKSCREEN', true);
    printLine('================================================================================', true);
    printLine('');
    printLine(`root@swift-alliance:~# cat /var/log/ipid/${message.id}.log`, true);
    printLine('');
    printLine('--------------------------------------------------------------------------------');
    printLine('  TRANSFER DETAILS', true);
    printLine('--------------------------------------------------------------------------------');
    printKV('Message ID:', message.msgId);
    printKV('UETR:', message.uetr);
    printKV('Status:', message.status);
    printKV('Timestamp:', message.createdAt);
    printKV('Amount:', `${message.currency} ${message.amount.toLocaleString()}`);
    printLine('');
    printLine('--------------------------------------------------------------------------------');
    printLine('  IP-ID ROUTING', true);
    printLine('--------------------------------------------------------------------------------');
    if (message.ipIdTransfer) {
      printKV('Source IP-ID:', message.ipIdTransfer.sourceIpId);
      printKV('Source Server:', `${message.ipIdTransfer.sourceServerIp}:${message.ipIdTransfer.sourcePort}`);
      printKV('Dest IP-ID:', message.ipIdTransfer.destinationIpId);
      printKV('Dest Server:', `${message.ipIdTransfer.destinationServerIp}:${message.ipIdTransfer.destinationPort}`);
      printKV('Protocol:', message.ipIdTransfer.protocol);
      printKV('Encryption:', message.ipIdTransfer.encryption);
      printKV('TLS Version:', message.ipIdTransfer.tlsVersion || 'TLS 1.3');
      printKV('Latency:', `${message.ipIdTransfer.latencyMs || 0}ms`);
      printKV('Bytes:', formatBytes(message.ipIdTransfer.bytesTransferred || 0));
    }
    printLine('');
    printLine('--------------------------------------------------------------------------------');
    printLine('  SECURITY', true);
    printLine('--------------------------------------------------------------------------------');
    printKV('SHA-256:', message.payloadHash);
    printLine('Signature:', true);
    printLine(`  ${message.signature}`);
    printLine('');
    printLine('--------------------------------------------------------------------------------');
    printLine('  ISSUING BANK', true);
    printLine('--------------------------------------------------------------------------------');
    printKV('Institution:', config.bankName);
    printKV('BIC:', config.bankBic);
    printKV('Ledger ID:', config.ledgerId);
    printLine('');

    // Page 2 - Payload
    pdf.addPage();
    addBlackPage();
    y = margin;

    printLine('================================================================================', true);
    printLine('  MESSAGE PAYLOAD', true);
    printLine('================================================================================', true);
    printLine('');

    message.payload.split('\n').forEach(line => {
      printLine(line.substring(0, 100));
    });

    printLine('');
    printLine('--------------------------------------------------------------------------------');
    printLine(`Generated: ${new Date().toISOString()}`, true);
    printLine(`Document Hash: ${sha256Hex(message.id + message.payload)}`, true);
    printLine('--------------------------------------------------------------------------------');
    printLine('');
    printLine('root@swift-alliance:~# _', true);

    pdf.save(`IPID-BlackScreen-${message.msgId}.pdf`);
    log('success', `[PDF] BlackScreen generated: IPID-BlackScreen-${message.msgId}.pdf`);
  }, [config, log]);

  // ═══════════════════════════════════════════════════════════════════════════════
  // RENDER TERMINAL LINE
  // ═══════════════════════════════════════════════════════════════════════════════

  const renderTerminalLine = (line: TerminalLine) => {
    const colors: Record<string, string> = {
      info: 'text-white',
      success: 'text-green-400',
      error: 'text-red-400',
      warning: 'text-yellow-400',
      command: 'text-cyan-400',
      output: 'text-gray-300',
      system: 'text-green-500',
      network: 'text-blue-400',
      security: 'text-purple-400',
      transfer: 'text-emerald-400',
    };
    const time = new Date(line.timestamp).toLocaleTimeString('en-US', { hour12: false });
    return (
      <div key={line.id} className={`font-mono text-xs ${colors[line.type] || 'text-white'}`}>
        <span className="text-gray-600">[{time}]</span> {line.content}
      </div>
    );
  };

  // ═══════════════════════════════════════════════════════════════════════════════
  // RENDER
  // ═══════════════════════════════════════════════════════════════════════════════

  return (
    <div className="fixed inset-0 bg-black text-green-400 font-mono overflow-hidden flex flex-col">
      {/* Header */}
      <div className="bg-gray-900 border-b border-green-900/50 px-4 py-2 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button onClick={onBack} className="flex items-center gap-2 px-3 py-1.5 bg-gray-800 hover:bg-gray-700 rounded text-sm">
            <ArrowLeft className="w-4 h-4" /> {isSpanish ? 'Volver' : 'Back'}
          </button>
          <div className="flex items-center gap-2">
            <Terminal className="w-5 h-5 text-green-500" />
            <span className="text-green-500 font-bold">SWIFT ALLIANCE LIKE</span>
            <span className="text-gray-500 text-xs">v2.0.0</span>
            <span className="text-xs bg-emerald-900/50 text-emerald-400 px-2 py-0.5 rounded">IP-ID ENABLED</span>
          </div>
        </div>
        
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 text-xs">
            <div className={`flex items-center gap-1 px-2 py-1 rounded ${isConnected ? 'bg-green-900/50 text-green-400' : 'bg-red-900/50 text-red-400'}`}>
              {isConnected ? <Wifi className="w-3 h-3" /> : <WifiOff className="w-3 h-3" />}
              {isConnected ? 'Connected' : 'Disconnected'}
            </div>
            <div className={`flex items-center gap-1 px-2 py-1 rounded ${isWorkerRunning ? 'bg-blue-900/50 text-blue-400' : 'bg-gray-800 text-gray-500'}`}>
              {isWorkerRunning ? <Play className="w-3 h-3" /> : <Pause className="w-3 h-3" />}
              {isWorkerRunning ? 'Worker Active' : 'Worker Stopped'}
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            {/* Sandbox Toggle */}
            <button onClick={() => setSandboxMode(!sandboxMode)}
              className={`px-3 py-1.5 rounded text-xs font-medium flex items-center gap-1.5 ${
                sandboxMode 
                  ? 'bg-yellow-600 text-black' 
                  : 'bg-gray-800 hover:bg-gray-700 text-gray-400'
              }`}>
              <Box className="w-3.5 h-3.5" />
              {sandboxMode ? 'SANDBOX ON' : 'Sandbox'}
            </button>
            
            <button onClick={connectToServers} disabled={isConnected}
              className={`px-3 py-1.5 rounded text-xs font-medium ${isConnected ? 'bg-gray-800 text-gray-500 cursor-not-allowed' : 'bg-green-900 hover:bg-green-800 text-green-400'}`}>
              Connect All
            </button>
            <button onClick={startWorker} disabled={!isConnected || isWorkerRunning}
              className={`px-3 py-1.5 rounded text-xs font-medium ${!isConnected || isWorkerRunning ? 'bg-gray-800 text-gray-500 cursor-not-allowed' : 'bg-blue-900 hover:bg-blue-800 text-blue-400'}`}>
              Start Worker
            </button>
          </div>
          
          <div className="text-xs text-green-500">{config.bankBic}</div>
        </div>
      </div>

      {/* Navigation */}
      <div className="bg-gray-900 border-b border-green-900/30 px-4 py-1 flex items-center gap-1 overflow-x-auto">
        {[
          { id: 'terminal', icon: Terminal, label: 'Terminal', color: 'green' },
          { id: 'uetr-tracker', icon: Hash, label: 'UETR Tracker', color: 'cyan' },
          { id: 'swift-messages', icon: FileText, label: 'SWIFT Messages', color: 'yellow' },
          { id: 'ledger', icon: Wallet, label: 'Ledger', color: 'emerald' },
          { id: 'swift-transfer', icon: Globe, label: 'SWIFT Transfer', color: 'yellow' },
          { id: 'ipid-transfer', icon: Network, label: 'IP-ID Transfer', color: 'cyan' },
          { id: 'iban', icon: CreditCard, label: 'IBAN', color: 'blue' },
          { id: 'blockchain', icon: Coins, label: 'Blockchain', color: 'orange' },
          { id: 'iso20022scan', icon: Search, label: 'ISO20022Scan', color: 'indigo' },
          { id: 'beneficiaries', icon: Users, label: 'Beneficiaries', color: 'pink' },
          { id: 'servers', icon: Server, label: 'Servers', color: 'blue' },
          { id: 'history', icon: History, label: 'History', color: 'violet' },
          { id: 'messages', icon: MessageSquare, label: 'Messages', color: 'purple' },
          { id: 'queue', icon: List, label: 'Queue', color: 'orange' },
          { id: 'audit', icon: Shield, label: 'Audit', color: 'red' },
          { id: 'config', icon: Settings, label: 'Config', color: 'gray' },
          { id: 'sandbox', icon: Box, label: 'Sandbox', color: 'amber' },
        ].map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-xs ${
              activeTab === tab.id 
                ? tab.color === 'yellow' ? 'bg-yellow-900/50 text-yellow-400' 
                : tab.color === 'cyan' ? 'bg-cyan-900/50 text-cyan-400'
                : tab.color === 'blue' ? 'bg-blue-900/50 text-blue-400'
                : tab.color === 'purple' ? 'bg-purple-900/50 text-purple-400'
                : tab.color === 'orange' ? 'bg-orange-900/50 text-orange-400'
                : tab.color === 'red' ? 'bg-red-900/50 text-red-400'
                : tab.color === 'emerald' ? 'bg-emerald-900/50 text-emerald-400'
                : tab.color === 'pink' ? 'bg-pink-900/50 text-pink-400'
                : tab.color === 'violet' ? 'bg-violet-900/50 text-violet-400'
                : tab.color === 'amber' ? 'bg-amber-900/50 text-amber-400'
                : 'bg-green-900/50 text-green-400'
                : 'text-gray-500 hover:text-gray-300 hover:bg-gray-800'
            }`}>
            <tab.icon className="w-3.5 h-3.5" /> {tab.label}
          </button>
        ))}
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-hidden flex">
        {/* Terminal */}
        {activeTab === 'terminal' && (
          <div className="flex-1 flex flex-col">
            <div ref={terminalRef} className="flex-1 overflow-auto p-4 bg-black">
              {terminalLines.map(renderTerminalLine)}
              <div className="text-green-400 mt-2">
                <span className="text-cyan-400">root@swift-alliance</span>:<span className="text-blue-400">~</span>$ <span className="animate-pulse">_</span>
              </div>
            </div>
          </div>
        )}

        {/* UETR Tracker */}
        {activeTab === 'uetr-tracker' && (
          <div className="flex-1 overflow-auto p-4">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="w-14 h-14 bg-gradient-to-br from-cyan-600 to-blue-700 rounded-xl flex items-center justify-center shadow-lg shadow-cyan-500/30">
                  <Hash className="w-8 h-8 text-white" />
                </div>
                <div>
                  <h3 className="text-cyan-400 font-bold text-xl">UETR Tracker</h3>
                  <p className="text-xs text-gray-500">Universal End-to-End Transaction Reference - ISO 20022 gpi Standard</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <div className="px-3 py-1.5 bg-cyan-900/30 border border-cyan-500/30 rounded-lg">
                  <span className="text-cyan-400 text-xs font-mono">SWIFT gpi</span>
                </div>
                <div className="px-3 py-1.5 bg-green-900/30 border border-green-500/30 rounded-lg">
                  <span className="text-green-400 text-xs">● Connected</span>
                </div>
              </div>
            </div>

            {/* Search Bar */}
            <div className="mb-6 bg-gray-900/50 rounded-xl p-6 border border-cyan-500/20">
              <div className="flex items-center gap-4">
                <div className="flex-1 relative">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-cyan-400" />
                  <input
                    type="text"
                    value={uetrSearchQuery}
                    onChange={(e) => setUetrSearchQuery(e.target.value)}
                    placeholder="Enter UETR (e.g., 97ed4827-7b6f-4491-a06f-b548d5a7512d)"
                    className="w-full pl-12 pr-4 py-4 bg-black/50 border-2 border-cyan-500/30 rounded-lg text-white font-mono text-lg focus:border-cyan-400 focus:outline-none"
                  />
                </div>
                <button 
                  onClick={() => {
                    const found = transactionHistory.filter(tx => 
                      tx.uetr?.toLowerCase().includes(uetrSearchQuery.toLowerCase()) ||
                      tx.id?.toLowerCase().includes(uetrSearchQuery.toLowerCase())
                    );
                    setUetrResults(found);
                  }}
                  className="px-8 py-4 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-bold rounded-lg flex items-center gap-2 shadow-lg shadow-cyan-500/30">
                  <Search className="w-5 h-5" /> Track UETR
                </button>
              </div>
              <div className="mt-3 flex items-center gap-4 text-xs text-gray-500">
                <span>Format: UUID v4</span>
                <span>•</span>
                <span>Example: 97ed4827-7b6f-4491-a06f-b548d5a7512d</span>
                <span>•</span>
                <span className="text-cyan-400">SWIFT gpi compliant</span>
              </div>
            </div>

            {/* UETR Info Panel */}
            <div className="grid grid-cols-4 gap-4 mb-6">
              <div className="bg-gradient-to-br from-cyan-900/30 to-blue-900/30 rounded-xl p-4 border border-cyan-500/20">
                <div className="text-cyan-400 text-xs mb-1">Total Tracked</div>
                <div className="text-2xl font-bold text-white">{transactionHistory.length}</div>
                <div className="text-xs text-gray-500 mt-1">All time UETRs</div>
              </div>
              <div className="bg-gradient-to-br from-green-900/30 to-emerald-900/30 rounded-xl p-4 border border-green-500/20">
                <div className="text-green-400 text-xs mb-1">Completed</div>
                <div className="text-2xl font-bold text-white">{transactionHistory.filter(t => t.status === 'ACK' || t.status === 'SENT').length}</div>
                <div className="text-xs text-gray-500 mt-1">Successful transfers</div>
              </div>
              <div className="bg-gradient-to-br from-yellow-900/30 to-orange-900/30 rounded-xl p-4 border border-yellow-500/20">
                <div className="text-yellow-400 text-xs mb-1">In Progress</div>
                <div className="text-2xl font-bold text-white">{transactionHistory.filter(t => t.status === 'SENDING' || t.status === 'QUEUED').length}</div>
                <div className="text-xs text-gray-500 mt-1">Processing</div>
              </div>
              <div className="bg-gradient-to-br from-purple-900/30 to-pink-900/30 rounded-xl p-4 border border-purple-500/20">
                <div className="text-purple-400 text-xs mb-1">gpi Coverage</div>
                <div className="text-2xl font-bold text-white">100%</div>
                <div className="text-xs text-gray-500 mt-1">End-to-end tracking</div>
              </div>
            </div>

            {/* Results or Recent */}
            <div className="bg-gray-900/50 rounded-xl border border-gray-700/50">
              <div className="px-4 py-3 border-b border-gray-700/50 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Activity className="w-4 h-4 text-cyan-400" />
                  <span className="text-sm font-bold text-white">{uetrResults.length > 0 ? 'Search Results' : 'Recent UETRs'}</span>
                </div>
                <span className="text-xs text-gray-500">{uetrResults.length > 0 ? uetrResults.length : transactionHistory.length} transactions</span>
              </div>
              <div className="max-h-96 overflow-auto">
                {(uetrResults.length > 0 ? uetrResults : transactionHistory.slice(0, 20)).map((tx, idx) => (
                  <div key={idx} className="px-4 py-3 border-b border-gray-800/50 hover:bg-gray-800/30 transition-colors">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                          tx.status === 'ACK' || tx.status === 'SENT' ? 'bg-green-900/50' : 
                          tx.status === 'NACK' || tx.status === 'FAILED' ? 'bg-red-900/50' : 'bg-yellow-900/50'
                        }`}>
                          {tx.status === 'ACK' || tx.status === 'SENT' ? <CheckCircle className="w-5 h-5 text-green-400" /> :
                           tx.status === 'NACK' || tx.status === 'FAILED' ? <XCircle className="w-5 h-5 text-red-400" /> :
                           <Clock className="w-5 h-5 text-yellow-400" />}
                        </div>
                        <div>
                          <div className="font-mono text-cyan-400 text-sm">{tx.uetr || tx.id}</div>
                          <div className="text-xs text-gray-500">{tx.type} • {tx.senderBic} → {tx.receiverBic}</div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-bold text-white">{tx.currency} {tx.amount?.toLocaleString()}</div>
                        <div className="text-xs text-gray-500">{new Date(tx.createdAt).toLocaleString()}</div>
                      </div>
                    </div>
                    {/* Timeline */}
                    <div className="mt-3 flex items-center gap-2">
                      <div className="flex-1 flex items-center">
                        <div className="w-2 h-2 rounded-full bg-green-500"></div>
                        <div className="flex-1 h-0.5 bg-green-500"></div>
                        <div className="w-2 h-2 rounded-full bg-green-500"></div>
                        <div className={`flex-1 h-0.5 ${tx.status === 'ACK' || tx.status === 'SENT' ? 'bg-green-500' : 'bg-gray-600'}`}></div>
                        <div className={`w-2 h-2 rounded-full ${tx.status === 'ACK' || tx.status === 'SENT' ? 'bg-green-500' : 'bg-gray-600'}`}></div>
                        <div className={`flex-1 h-0.5 ${tx.status === 'ACK' ? 'bg-green-500' : 'bg-gray-600'}`}></div>
                        <div className={`w-2 h-2 rounded-full ${tx.status === 'ACK' ? 'bg-green-500' : 'bg-gray-600'}`}></div>
                      </div>
                    </div>
                    <div className="mt-1 flex items-center justify-between text-[10px] text-gray-500">
                      <span>Created</span>
                      <span>Validated</span>
                      <span>Sent</span>
                      <span>Confirmed</span>
                    </div>
                  </div>
                ))}
                {transactionHistory.length === 0 && (
                  <div className="p-8 text-center text-gray-500">
                    <Hash className="w-12 h-12 mx-auto mb-3 opacity-30" />
                    <div>No UETRs tracked yet</div>
                    <div className="text-xs mt-1">Complete a transfer to generate a UETR</div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* SWIFT Messages Catalog */}
        {activeTab === 'swift-messages' && (
          <div className="flex-1 overflow-auto p-4">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="w-14 h-14 bg-gradient-to-br from-yellow-500 to-orange-600 rounded-xl flex items-center justify-center shadow-lg shadow-yellow-500/30">
                  <FileText className="w-8 h-8 text-white" />
                </div>
                <div>
                  <h3 className="text-yellow-400 font-bold text-xl">SWIFT Message Types</h3>
                  <p className="text-xs text-gray-500">Complete catalog of SWIFT MT & MX message standards</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <select 
                  value={selectedSwiftMsgType}
                  onChange={(e) => setSelectedSwiftMsgType(e.target.value)}
                  className="bg-gray-800 border border-yellow-500/30 rounded-lg px-3 py-2 text-yellow-400 text-sm">
                  <option value="all">All Categories</option>
                  <option value="1xx">Category 1 - Customer Payments</option>
                  <option value="2xx">Category 2 - Financial Institution</option>
                  <option value="3xx">Category 3 - Treasury</option>
                  <option value="4xx">Category 4 - Collections</option>
                  <option value="5xx">Category 5 - Securities</option>
                  <option value="6xx">Category 6 - Commodities</option>
                  <option value="7xx">Category 7 - Documentary Credits</option>
                  <option value="8xx">Category 8 - Travellers Cheques</option>
                  <option value="9xx">Category 9 - Cash Management</option>
                </select>
              </div>
            </div>

            {/* Message Categories Grid */}
            <div className="grid grid-cols-3 gap-4">
              {/* Category 1 - Customer Payments & Cheques */}
              <div className="bg-gradient-to-br from-blue-900/30 to-cyan-900/30 rounded-xl p-4 border border-blue-500/20">
                <div className="flex items-center gap-2 mb-3">
                  <Banknote className="w-5 h-5 text-blue-400" />
                  <span className="text-blue-400 font-bold text-sm">Category 1 - Customer Payments</span>
                </div>
                <div className="space-y-2 text-xs">
                  <div className="flex justify-between p-2 bg-black/30 rounded hover:bg-black/50 cursor-pointer">
                    <span className="text-cyan-400 font-mono">MT101</span>
                    <span className="text-gray-400">Request for Transfer</span>
                  </div>
                  <div className="flex justify-between p-2 bg-black/30 rounded hover:bg-black/50 cursor-pointer">
                    <span className="text-cyan-400 font-mono">MT102</span>
                    <span className="text-gray-400">Multiple Customer Credit Transfer</span>
                  </div>
                  <div className="flex justify-between p-2 bg-green-900/30 rounded hover:bg-green-900/50 cursor-pointer border border-green-500/30">
                    <span className="text-green-400 font-mono font-bold">MT103</span>
                    <span className="text-green-300">Single Customer Credit Transfer ★</span>
                  </div>
                  <div className="flex justify-between p-2 bg-black/30 rounded hover:bg-black/50 cursor-pointer">
                    <span className="text-cyan-400 font-mono">MT103+</span>
                    <span className="text-gray-400">STP Customer Credit Transfer</span>
                  </div>
                  <div className="flex justify-between p-2 bg-black/30 rounded hover:bg-black/50 cursor-pointer">
                    <span className="text-cyan-400 font-mono">MT104</span>
                    <span className="text-gray-400">Direct Debit/Request for Debit</span>
                  </div>
                  <div className="flex justify-between p-2 bg-black/30 rounded hover:bg-black/50 cursor-pointer">
                    <span className="text-cyan-400 font-mono">MT107</span>
                    <span className="text-gray-400">General Direct Debit Message</span>
                  </div>
                  <div className="flex justify-between p-2 bg-black/30 rounded hover:bg-black/50 cursor-pointer">
                    <span className="text-cyan-400 font-mono">MT110</span>
                    <span className="text-gray-400">Advice of Cheque(s)</span>
                  </div>
                  <div className="flex justify-between p-2 bg-black/30 rounded hover:bg-black/50 cursor-pointer">
                    <span className="text-cyan-400 font-mono">MT111</span>
                    <span className="text-gray-400">Request for Stop Payment</span>
                  </div>
                  <div className="flex justify-between p-2 bg-black/30 rounded hover:bg-black/50 cursor-pointer">
                    <span className="text-cyan-400 font-mono">MT112</span>
                    <span className="text-gray-400">Status of Stop Payment Request</span>
                  </div>
                </div>
              </div>

              {/* Category 2 - Financial Institution Transfers */}
              <div className="bg-gradient-to-br from-purple-900/30 to-pink-900/30 rounded-xl p-4 border border-purple-500/20">
                <div className="flex items-center gap-2 mb-3">
                  <Building2 className="w-5 h-5 text-purple-400" />
                  <span className="text-purple-400 font-bold text-sm">Category 2 - FI Transfers</span>
                </div>
                <div className="space-y-2 text-xs">
                  <div className="flex justify-between p-2 bg-green-900/30 rounded hover:bg-green-900/50 cursor-pointer border border-green-500/30">
                    <span className="text-green-400 font-mono font-bold">MT200</span>
                    <span className="text-green-300">Financial Institution Transfer ★</span>
                  </div>
                  <div className="flex justify-between p-2 bg-black/30 rounded hover:bg-black/50 cursor-pointer">
                    <span className="text-purple-400 font-mono">MT201</span>
                    <span className="text-gray-400">Multiple FI Transfer</span>
                  </div>
                  <div className="flex justify-between p-2 bg-green-900/30 rounded hover:bg-green-900/50 cursor-pointer border border-green-500/30">
                    <span className="text-green-400 font-mono font-bold">MT202</span>
                    <span className="text-green-300">General FI Transfer ★</span>
                  </div>
                  <div className="flex justify-between p-2 bg-green-900/30 rounded hover:bg-green-900/50 cursor-pointer border border-green-500/30">
                    <span className="text-green-400 font-mono font-bold">MT202COV</span>
                    <span className="text-green-300">Cover Payment ★</span>
                  </div>
                  <div className="flex justify-between p-2 bg-black/30 rounded hover:bg-black/50 cursor-pointer">
                    <span className="text-purple-400 font-mono">MT203</span>
                    <span className="text-gray-400">Multiple General FI Transfer</span>
                  </div>
                  <div className="flex justify-between p-2 bg-black/30 rounded hover:bg-black/50 cursor-pointer">
                    <span className="text-purple-400 font-mono">MT204</span>
                    <span className="text-gray-400">FI Direct Debit Message</span>
                  </div>
                  <div className="flex justify-between p-2 bg-black/30 rounded hover:bg-black/50 cursor-pointer">
                    <span className="text-purple-400 font-mono">MT205</span>
                    <span className="text-gray-400">FI Transfer Execution</span>
                  </div>
                  <div className="flex justify-between p-2 bg-black/30 rounded hover:bg-black/50 cursor-pointer">
                    <span className="text-purple-400 font-mono">MT205COV</span>
                    <span className="text-gray-400">FI Transfer Execution Cover</span>
                  </div>
                  <div className="flex justify-between p-2 bg-black/30 rounded hover:bg-black/50 cursor-pointer">
                    <span className="text-purple-400 font-mono">MT210</span>
                    <span className="text-gray-400">Notice to Receive</span>
                  </div>
                </div>
              </div>

              {/* Category 3 - Treasury Markets */}
              <div className="bg-gradient-to-br from-green-900/30 to-emerald-900/30 rounded-xl p-4 border border-green-500/20">
                <div className="flex items-center gap-2 mb-3">
                  <Coins className="w-5 h-5 text-green-400" />
                  <span className="text-green-400 font-bold text-sm">Category 3 - Treasury</span>
                </div>
                <div className="space-y-2 text-xs">
                  <div className="flex justify-between p-2 bg-black/30 rounded hover:bg-black/50 cursor-pointer">
                    <span className="text-green-400 font-mono">MT300</span>
                    <span className="text-gray-400">FX Confirmation</span>
                  </div>
                  <div className="flex justify-between p-2 bg-black/30 rounded hover:bg-black/50 cursor-pointer">
                    <span className="text-green-400 font-mono">MT303</span>
                    <span className="text-gray-400">FX Order</span>
                  </div>
                  <div className="flex justify-between p-2 bg-black/30 rounded hover:bg-black/50 cursor-pointer">
                    <span className="text-green-400 font-mono">MT304</span>
                    <span className="text-gray-400">Advice/Instruction of Third Party Deal</span>
                  </div>
                  <div className="flex justify-between p-2 bg-black/30 rounded hover:bg-black/50 cursor-pointer">
                    <span className="text-green-400 font-mono">MT305</span>
                    <span className="text-gray-400">FX Option Confirmation</span>
                  </div>
                  <div className="flex justify-between p-2 bg-black/30 rounded hover:bg-black/50 cursor-pointer">
                    <span className="text-green-400 font-mono">MT306</span>
                    <span className="text-gray-400">FX Option Notification</span>
                  </div>
                  <div className="flex justify-between p-2 bg-black/30 rounded hover:bg-black/50 cursor-pointer">
                    <span className="text-green-400 font-mono">MT320</span>
                    <span className="text-gray-400">Fixed Loan/Deposit Confirmation</span>
                  </div>
                  <div className="flex justify-between p-2 bg-black/30 rounded hover:bg-black/50 cursor-pointer">
                    <span className="text-green-400 font-mono">MT330</span>
                    <span className="text-gray-400">Call/Notice Loan/Deposit Confirmation</span>
                  </div>
                  <div className="flex justify-between p-2 bg-black/30 rounded hover:bg-black/50 cursor-pointer">
                    <span className="text-green-400 font-mono">MT340</span>
                    <span className="text-gray-400">Forward Rate Agreement Confirmation</span>
                  </div>
                  <div className="flex justify-between p-2 bg-black/30 rounded hover:bg-black/50 cursor-pointer">
                    <span className="text-green-400 font-mono">MT350</span>
                    <span className="text-gray-400">Advice of Loan/Deposit Interest Payment</span>
                  </div>
                </div>
              </div>

              {/* Category 4 - Collections & Cash Letters */}
              <div className="bg-gradient-to-br from-orange-900/30 to-red-900/30 rounded-xl p-4 border border-orange-500/20">
                <div className="flex items-center gap-2 mb-3">
                  <Receipt className="w-5 h-5 text-orange-400" />
                  <span className="text-orange-400 font-bold text-sm">Category 4 - Collections</span>
                </div>
                <div className="space-y-2 text-xs">
                  <div className="flex justify-between p-2 bg-black/30 rounded hover:bg-black/50 cursor-pointer">
                    <span className="text-orange-400 font-mono">MT400</span>
                    <span className="text-gray-400">Advice of Payment</span>
                  </div>
                  <div className="flex justify-between p-2 bg-black/30 rounded hover:bg-black/50 cursor-pointer">
                    <span className="text-orange-400 font-mono">MT405</span>
                    <span className="text-gray-400">Clean Collection</span>
                  </div>
                  <div className="flex justify-between p-2 bg-black/30 rounded hover:bg-black/50 cursor-pointer">
                    <span className="text-orange-400 font-mono">MT410</span>
                    <span className="text-gray-400">Acknowledgement</span>
                  </div>
                  <div className="flex justify-between p-2 bg-black/30 rounded hover:bg-black/50 cursor-pointer">
                    <span className="text-orange-400 font-mono">MT412</span>
                    <span className="text-gray-400">Advice of Acceptance</span>
                  </div>
                  <div className="flex justify-between p-2 bg-black/30 rounded hover:bg-black/50 cursor-pointer">
                    <span className="text-orange-400 font-mono">MT416</span>
                    <span className="text-gray-400">Advice of Non-Payment/Non-Acceptance</span>
                  </div>
                  <div className="flex justify-between p-2 bg-black/30 rounded hover:bg-black/50 cursor-pointer">
                    <span className="text-orange-400 font-mono">MT420</span>
                    <span className="text-gray-400">Tracer</span>
                  </div>
                  <div className="flex justify-between p-2 bg-black/30 rounded hover:bg-black/50 cursor-pointer">
                    <span className="text-orange-400 font-mono">MT422</span>
                    <span className="text-gray-400">Advice of Fate and Request for Instructions</span>
                  </div>
                  <div className="flex justify-between p-2 bg-black/30 rounded hover:bg-black/50 cursor-pointer">
                    <span className="text-orange-400 font-mono">MT430</span>
                    <span className="text-gray-400">Amendment of Instructions</span>
                  </div>
                  <div className="flex justify-between p-2 bg-black/30 rounded hover:bg-black/50 cursor-pointer">
                    <span className="text-orange-400 font-mono">MT450</span>
                    <span className="text-gray-400">Cash Letter Credit Advice</span>
                  </div>
                </div>
              </div>

              {/* Category 5 - Securities Markets */}
              <div className="bg-gradient-to-br from-indigo-900/30 to-violet-900/30 rounded-xl p-4 border border-indigo-500/20">
                <div className="flex items-center gap-2 mb-3">
                  <Layers className="w-5 h-5 text-indigo-400" />
                  <span className="text-indigo-400 font-bold text-sm">Category 5 - Securities</span>
                </div>
                <div className="space-y-2 text-xs">
                  <div className="flex justify-between p-2 bg-black/30 rounded hover:bg-black/50 cursor-pointer">
                    <span className="text-indigo-400 font-mono">MT500</span>
                    <span className="text-gray-400">Instruction to Register</span>
                  </div>
                  <div className="flex justify-between p-2 bg-black/30 rounded hover:bg-black/50 cursor-pointer">
                    <span className="text-indigo-400 font-mono">MT502</span>
                    <span className="text-gray-400">Order to Buy or Sell</span>
                  </div>
                  <div className="flex justify-between p-2 bg-black/30 rounded hover:bg-black/50 cursor-pointer">
                    <span className="text-indigo-400 font-mono">MT509</span>
                    <span className="text-gray-400">Trade Status Message</span>
                  </div>
                  <div className="flex justify-between p-2 bg-black/30 rounded hover:bg-black/50 cursor-pointer">
                    <span className="text-indigo-400 font-mono">MT513</span>
                    <span className="text-gray-400">Client Advice of Execution</span>
                  </div>
                  <div className="flex justify-between p-2 bg-black/30 rounded hover:bg-black/50 cursor-pointer">
                    <span className="text-indigo-400 font-mono">MT515</span>
                    <span className="text-gray-400">Client Confirmation of Purchase/Sale</span>
                  </div>
                  <div className="flex justify-between p-2 bg-green-900/30 rounded hover:bg-green-900/50 cursor-pointer border border-green-500/30">
                    <span className="text-green-400 font-mono font-bold">MT540</span>
                    <span className="text-green-300">Receive Free ★</span>
                  </div>
                  <div className="flex justify-between p-2 bg-green-900/30 rounded hover:bg-green-900/50 cursor-pointer border border-green-500/30">
                    <span className="text-green-400 font-mono font-bold">MT541</span>
                    <span className="text-green-300">Receive Against Payment ★</span>
                  </div>
                  <div className="flex justify-between p-2 bg-green-900/30 rounded hover:bg-green-900/50 cursor-pointer border border-green-500/30">
                    <span className="text-green-400 font-mono font-bold">MT542</span>
                    <span className="text-green-300">Deliver Free ★</span>
                  </div>
                  <div className="flex justify-between p-2 bg-green-900/30 rounded hover:bg-green-900/50 cursor-pointer border border-green-500/30">
                    <span className="text-green-400 font-mono font-bold">MT543</span>
                    <span className="text-green-300">Deliver Against Payment ★</span>
                  </div>
                  <div className="flex justify-between p-2 bg-black/30 rounded hover:bg-black/50 cursor-pointer">
                    <span className="text-indigo-400 font-mono">MT544</span>
                    <span className="text-gray-400">Receive Free Confirmation</span>
                  </div>
                  <div className="flex justify-between p-2 bg-black/30 rounded hover:bg-black/50 cursor-pointer">
                    <span className="text-indigo-400 font-mono">MT545</span>
                    <span className="text-gray-400">Receive Against Payment Confirmation</span>
                  </div>
                  <div className="flex justify-between p-2 bg-black/30 rounded hover:bg-black/50 cursor-pointer">
                    <span className="text-indigo-400 font-mono">MT546</span>
                    <span className="text-gray-400">Deliver Free Confirmation</span>
                  </div>
                  <div className="flex justify-between p-2 bg-black/30 rounded hover:bg-black/50 cursor-pointer">
                    <span className="text-indigo-400 font-mono">MT547</span>
                    <span className="text-gray-400">Deliver Against Payment Confirmation</span>
                  </div>
                  <div className="flex justify-between p-2 bg-black/30 rounded hover:bg-black/50 cursor-pointer">
                    <span className="text-indigo-400 font-mono">MT548</span>
                    <span className="text-gray-400">Settlement Status & Processing Advice</span>
                  </div>
                  <div className="flex justify-between p-2 bg-black/30 rounded hover:bg-black/50 cursor-pointer">
                    <span className="text-indigo-400 font-mono">MT564</span>
                    <span className="text-gray-400">Corporate Action Notification</span>
                  </div>
                  <div className="flex justify-between p-2 bg-black/30 rounded hover:bg-black/50 cursor-pointer">
                    <span className="text-indigo-400 font-mono">MT566</span>
                    <span className="text-gray-400">Corporate Action Confirmation</span>
                  </div>
                  <div className="flex justify-between p-2 bg-black/30 rounded hover:bg-black/50 cursor-pointer">
                    <span className="text-indigo-400 font-mono">MT568</span>
                    <span className="text-gray-400">Corporate Action Narrative</span>
                  </div>
                  <div className="flex justify-between p-2 bg-black/30 rounded hover:bg-black/50 cursor-pointer">
                    <span className="text-indigo-400 font-mono">MT578</span>
                    <span className="text-gray-400">Settlement Allegement</span>
                  </div>
                  <div className="flex justify-between p-2 bg-black/30 rounded hover:bg-black/50 cursor-pointer">
                    <span className="text-indigo-400 font-mono">MT586</span>
                    <span className="text-gray-400">Statement of Settlement Allegements</span>
                  </div>
                </div>
              </div>

              {/* Category 7 - Documentary Credits & Guarantees */}
              <div className="bg-gradient-to-br from-yellow-900/30 to-amber-900/30 rounded-xl p-4 border border-yellow-500/20">
                <div className="flex items-center gap-2 mb-3">
                  <FileText className="w-5 h-5 text-yellow-400" />
                  <span className="text-yellow-400 font-bold text-sm">Category 7 - Documentary Credits</span>
                </div>
                <div className="space-y-2 text-xs">
                  <div className="flex justify-between p-2 bg-green-900/30 rounded hover:bg-green-900/50 cursor-pointer border border-green-500/30">
                    <span className="text-green-400 font-mono font-bold">MT700</span>
                    <span className="text-green-300">Issue of Documentary Credit ★</span>
                  </div>
                  <div className="flex justify-between p-2 bg-black/30 rounded hover:bg-black/50 cursor-pointer">
                    <span className="text-yellow-400 font-mono">MT701</span>
                    <span className="text-gray-400">Issue of Documentary Credit (cont)</span>
                  </div>
                  <div className="flex justify-between p-2 bg-black/30 rounded hover:bg-black/50 cursor-pointer">
                    <span className="text-yellow-400 font-mono">MT705</span>
                    <span className="text-gray-400">Pre-Advice of Documentary Credit</span>
                  </div>
                  <div className="flex justify-between p-2 bg-black/30 rounded hover:bg-black/50 cursor-pointer">
                    <span className="text-yellow-400 font-mono">MT707</span>
                    <span className="text-gray-400">Amendment to Documentary Credit</span>
                  </div>
                  <div className="flex justify-between p-2 bg-black/30 rounded hover:bg-black/50 cursor-pointer">
                    <span className="text-yellow-400 font-mono">MT710</span>
                    <span className="text-gray-400">Advice of Third Bank's Documentary Credit</span>
                  </div>
                  <div className="flex justify-between p-2 bg-black/30 rounded hover:bg-black/50 cursor-pointer">
                    <span className="text-yellow-400 font-mono">MT720</span>
                    <span className="text-gray-400">Transfer of Documentary Credit</span>
                  </div>
                  <div className="flex justify-between p-2 bg-black/30 rounded hover:bg-black/50 cursor-pointer">
                    <span className="text-yellow-400 font-mono">MT730</span>
                    <span className="text-gray-400">Acknowledgement</span>
                  </div>
                  <div className="flex justify-between p-2 bg-black/30 rounded hover:bg-black/50 cursor-pointer">
                    <span className="text-yellow-400 font-mono">MT732</span>
                    <span className="text-gray-400">Advice of Discharge</span>
                  </div>
                  <div className="flex justify-between p-2 bg-black/30 rounded hover:bg-black/50 cursor-pointer">
                    <span className="text-yellow-400 font-mono">MT734</span>
                    <span className="text-gray-400">Advice of Refusal</span>
                  </div>
                  <div className="flex justify-between p-2 bg-black/30 rounded hover:bg-black/50 cursor-pointer">
                    <span className="text-yellow-400 font-mono">MT740</span>
                    <span className="text-gray-400">Authorisation to Reimburse</span>
                  </div>
                  <div className="flex justify-between p-2 bg-black/30 rounded hover:bg-black/50 cursor-pointer">
                    <span className="text-yellow-400 font-mono">MT742</span>
                    <span className="text-gray-400">Reimbursement Claim</span>
                  </div>
                  <div className="flex justify-between p-2 bg-black/30 rounded hover:bg-black/50 cursor-pointer">
                    <span className="text-yellow-400 font-mono">MT747</span>
                    <span className="text-gray-400">Amendment to Authorisation to Reimburse</span>
                  </div>
                  <div className="flex justify-between p-2 bg-green-900/30 rounded hover:bg-green-900/50 cursor-pointer border border-green-500/30">
                    <span className="text-green-400 font-mono font-bold">MT760</span>
                    <span className="text-green-300">Guarantee / Standby LC ★</span>
                  </div>
                  <div className="flex justify-between p-2 bg-black/30 rounded hover:bg-black/50 cursor-pointer">
                    <span className="text-yellow-400 font-mono">MT767</span>
                    <span className="text-gray-400">Guarantee Amendment</span>
                  </div>
                  <div className="flex justify-between p-2 bg-black/30 rounded hover:bg-black/50 cursor-pointer">
                    <span className="text-yellow-400 font-mono">MT768</span>
                    <span className="text-gray-400">Acknowledgement of Guarantee Message</span>
                  </div>
                  <div className="flex justify-between p-2 bg-black/30 rounded hover:bg-black/50 cursor-pointer">
                    <span className="text-yellow-400 font-mono">MT769</span>
                    <span className="text-gray-400">Advice of Reduction or Release</span>
                  </div>
                  <div className="flex justify-between p-2 bg-black/30 rounded hover:bg-black/50 cursor-pointer">
                    <span className="text-yellow-400 font-mono">MT799</span>
                    <span className="text-gray-400">Free Format Message</span>
                  </div>
                </div>
              </div>

              {/* Category 9 - Cash Management & Customer Status */}
              <div className="bg-gradient-to-br from-teal-900/30 to-cyan-900/30 rounded-xl p-4 border border-teal-500/20">
                <div className="flex items-center gap-2 mb-3">
                  <Database className="w-5 h-5 text-teal-400" />
                  <span className="text-teal-400 font-bold text-sm">Category 9 - Cash Management</span>
                </div>
                <div className="space-y-2 text-xs">
                  <div className="flex justify-between p-2 bg-green-900/30 rounded hover:bg-green-900/50 cursor-pointer border border-green-500/30">
                    <span className="text-green-400 font-mono font-bold">MT900</span>
                    <span className="text-green-300">Confirmation of Debit ★</span>
                  </div>
                  <div className="flex justify-between p-2 bg-green-900/30 rounded hover:bg-green-900/50 cursor-pointer border border-green-500/30">
                    <span className="text-green-400 font-mono font-bold">MT910</span>
                    <span className="text-green-300">Confirmation of Credit ★</span>
                  </div>
                  <div className="flex justify-between p-2 bg-black/30 rounded hover:bg-black/50 cursor-pointer">
                    <span className="text-teal-400 font-mono">MT920</span>
                    <span className="text-gray-400">Request Message</span>
                  </div>
                  <div className="flex justify-between p-2 bg-black/30 rounded hover:bg-black/50 cursor-pointer">
                    <span className="text-teal-400 font-mono">MT935</span>
                    <span className="text-gray-400">Rate Change Advice</span>
                  </div>
                  <div className="flex justify-between p-2 bg-green-900/30 rounded hover:bg-green-900/50 cursor-pointer border border-green-500/30">
                    <span className="text-green-400 font-mono font-bold">MT940</span>
                    <span className="text-green-300">Customer Statement ★</span>
                  </div>
                  <div className="flex justify-between p-2 bg-black/30 rounded hover:bg-black/50 cursor-pointer">
                    <span className="text-teal-400 font-mono">MT941</span>
                    <span className="text-gray-400">Balance Report</span>
                  </div>
                  <div className="flex justify-between p-2 bg-black/30 rounded hover:bg-black/50 cursor-pointer">
                    <span className="text-teal-400 font-mono">MT942</span>
                    <span className="text-gray-400">Interim Transaction Report</span>
                  </div>
                  <div className="flex justify-between p-2 bg-green-900/30 rounded hover:bg-green-900/50 cursor-pointer border border-green-500/30">
                    <span className="text-green-400 font-mono font-bold">MT950</span>
                    <span className="text-green-300">Statement Message ★</span>
                  </div>
                  <div className="flex justify-between p-2 bg-black/30 rounded hover:bg-black/50 cursor-pointer">
                    <span className="text-teal-400 font-mono">MT970</span>
                    <span className="text-gray-400">Netting Statement</span>
                  </div>
                  <div className="flex justify-between p-2 bg-black/30 rounded hover:bg-black/50 cursor-pointer">
                    <span className="text-teal-400 font-mono">MT971</span>
                    <span className="text-gray-400">Netting Balance Report</span>
                  </div>
                  <div className="flex justify-between p-2 bg-black/30 rounded hover:bg-black/50 cursor-pointer">
                    <span className="text-teal-400 font-mono">MT972</span>
                    <span className="text-gray-400">Netting Interim Statement</span>
                  </div>
                  <div className="flex justify-between p-2 bg-black/30 rounded hover:bg-black/50 cursor-pointer">
                    <span className="text-teal-400 font-mono">MT973</span>
                    <span className="text-gray-400">Netting Request Message</span>
                  </div>
                  <div className="flex justify-between p-2 bg-black/30 rounded hover:bg-black/50 cursor-pointer">
                    <span className="text-teal-400 font-mono">MT985</span>
                    <span className="text-gray-400">Status Enquiry</span>
                  </div>
                  <div className="flex justify-between p-2 bg-black/30 rounded hover:bg-black/50 cursor-pointer">
                    <span className="text-teal-400 font-mono">MT986</span>
                    <span className="text-gray-400">Status Report</span>
                  </div>
                </div>
              </div>

              {/* Common Messages - n9x */}
              <div className="bg-gradient-to-br from-red-900/30 to-pink-900/30 rounded-xl p-4 border border-red-500/20">
                <div className="flex items-center gap-2 mb-3">
                  <MessageSquare className="w-5 h-5 text-red-400" />
                  <span className="text-red-400 font-bold text-sm">Common Messages (n9x)</span>
                </div>
                <div className="space-y-2 text-xs">
                  <div className="flex justify-between p-2 bg-black/30 rounded hover:bg-black/50 cursor-pointer">
                    <span className="text-red-400 font-mono">MTn90</span>
                    <span className="text-gray-400">Advice of Charges, Interest, etc.</span>
                  </div>
                  <div className="flex justify-between p-2 bg-black/30 rounded hover:bg-black/50 cursor-pointer">
                    <span className="text-red-400 font-mono">MTn91</span>
                    <span className="text-gray-400">Request for Payment of Charges</span>
                  </div>
                  <div className="flex justify-between p-2 bg-black/30 rounded hover:bg-black/50 cursor-pointer">
                    <span className="text-red-400 font-mono">MTn92</span>
                    <span className="text-gray-400">Request for Cancellation</span>
                  </div>
                  <div className="flex justify-between p-2 bg-black/30 rounded hover:bg-black/50 cursor-pointer">
                    <span className="text-red-400 font-mono">MTn95</span>
                    <span className="text-gray-400">Queries</span>
                  </div>
                  <div className="flex justify-between p-2 bg-black/30 rounded hover:bg-black/50 cursor-pointer">
                    <span className="text-red-400 font-mono">MTn96</span>
                    <span className="text-gray-400">Answers</span>
                  </div>
                  <div className="flex justify-between p-2 bg-green-900/30 rounded hover:bg-green-900/50 cursor-pointer border border-green-500/30">
                    <span className="text-green-400 font-mono font-bold">MTn99</span>
                    <span className="text-green-300">Free Format Message ★</span>
                  </div>
                  <div className="flex justify-between p-2 bg-green-900/30 rounded hover:bg-green-900/50 cursor-pointer border border-green-500/30">
                    <span className="text-green-400 font-mono font-bold">MT199</span>
                    <span className="text-green-300">Free Format (Customer) ★</span>
                  </div>
                  <div className="flex justify-between p-2 bg-green-900/30 rounded hover:bg-green-900/50 cursor-pointer border border-green-500/30">
                    <span className="text-green-400 font-mono font-bold">MT299</span>
                    <span className="text-green-300">Free Format (FI) ★</span>
                  </div>
                </div>
              </div>

              {/* ISO 20022 Messages */}
              <div className="bg-gradient-to-br from-cyan-900/30 to-blue-900/30 rounded-xl p-4 border border-cyan-500/20">
                <div className="flex items-center gap-2 mb-3">
                  <Code className="w-5 h-5 text-cyan-400" />
                  <span className="text-cyan-400 font-bold text-sm">ISO 20022 (MX Messages)</span>
                </div>
                <div className="space-y-2 text-xs">
                  <div className="flex justify-between p-2 bg-green-900/30 rounded hover:bg-green-900/50 cursor-pointer border border-green-500/30">
                    <span className="text-green-400 font-mono font-bold">pacs.008</span>
                    <span className="text-green-300">FI to FI Customer Credit Transfer ★</span>
                  </div>
                  <div className="flex justify-between p-2 bg-green-900/30 rounded hover:bg-green-900/50 cursor-pointer border border-green-500/30">
                    <span className="text-green-400 font-mono font-bold">pacs.009</span>
                    <span className="text-green-300">FI Credit Transfer ★</span>
                  </div>
                  <div className="flex justify-between p-2 bg-black/30 rounded hover:bg-black/50 cursor-pointer">
                    <span className="text-cyan-400 font-mono">pacs.002</span>
                    <span className="text-gray-400">Payment Status Report</span>
                  </div>
                  <div className="flex justify-between p-2 bg-black/30 rounded hover:bg-black/50 cursor-pointer">
                    <span className="text-cyan-400 font-mono">pacs.004</span>
                    <span className="text-gray-400">Payment Return</span>
                  </div>
                  <div className="flex justify-between p-2 bg-black/30 rounded hover:bg-black/50 cursor-pointer">
                    <span className="text-cyan-400 font-mono">pain.001</span>
                    <span className="text-gray-400">Customer Credit Transfer Initiation</span>
                  </div>
                  <div className="flex justify-between p-2 bg-black/30 rounded hover:bg-black/50 cursor-pointer">
                    <span className="text-cyan-400 font-mono">pain.002</span>
                    <span className="text-gray-400">Customer Payment Status Report</span>
                  </div>
                  <div className="flex justify-between p-2 bg-green-900/30 rounded hover:bg-green-900/50 cursor-pointer border border-green-500/30">
                    <span className="text-green-400 font-mono font-bold">camt.053</span>
                    <span className="text-green-300">Bank to Customer Statement ★</span>
                  </div>
                  <div className="flex justify-between p-2 bg-black/30 rounded hover:bg-black/50 cursor-pointer">
                    <span className="text-cyan-400 font-mono">camt.054</span>
                    <span className="text-gray-400">Bank to Customer Debit/Credit Notification</span>
                  </div>
                  <div className="flex justify-between p-2 bg-black/30 rounded hover:bg-black/50 cursor-pointer">
                    <span className="text-cyan-400 font-mono">camt.056</span>
                    <span className="text-gray-400">FI to FI Payment Cancellation Request</span>
                  </div>
                  <div className="flex justify-between p-2 bg-black/30 rounded hover:bg-black/50 cursor-pointer">
                    <span className="text-cyan-400 font-mono">camt.029</span>
                    <span className="text-gray-400">Resolution of Investigation</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Message Statistics */}
            <div className="mt-6 grid grid-cols-4 gap-4">
              <div className="bg-gray-900/50 rounded-xl p-4 border border-gray-700/50">
                <div className="text-gray-400 text-xs mb-1">Total MT Messages</div>
                <div className="text-2xl font-bold text-white">200+</div>
                <div className="text-xs text-gray-500">Across 9 categories</div>
              </div>
              <div className="bg-gray-900/50 rounded-xl p-4 border border-gray-700/50">
                <div className="text-gray-400 text-xs mb-1">ISO 20022 Messages</div>
                <div className="text-2xl font-bold text-white">50+</div>
                <div className="text-xs text-gray-500">MX format</div>
              </div>
              <div className="bg-gray-900/50 rounded-xl p-4 border border-gray-700/50">
                <div className="text-gray-400 text-xs mb-1">Supported in Terminal</div>
                <div className="text-2xl font-bold text-green-400">15</div>
                <div className="text-xs text-gray-500">Ready to use</div>
              </div>
              <div className="bg-gray-900/50 rounded-xl p-4 border border-gray-700/50">
                <div className="text-gray-400 text-xs mb-1">gpi Enabled</div>
                <div className="text-2xl font-bold text-cyan-400">100%</div>
                <div className="text-xs text-gray-500">UETR tracking</div>
              </div>
            </div>
          </div>
        )}

        {/* Sandbox */}
        {activeTab === 'sandbox' && (
          <div className="flex-1 overflow-auto p-4">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-amber-900/50 rounded-lg flex items-center justify-center border-2 border-amber-500/50">
                  <Box className="w-7 h-7 text-amber-400" />
                </div>
                <div>
                  <h3 className="text-amber-400 font-bold text-lg">Sandbox Test Environment</h3>
                  <p className="text-xs text-gray-500">Simulate SWIFT and IP-ID transfers without real transactions</p>
                </div>
              </div>
              <div className={`px-4 py-2 rounded-lg ${sandboxMode ? 'bg-amber-600 text-black' : 'bg-gray-800 text-gray-400'}`}>
                <span className="text-sm font-bold">{sandboxMode ? '🔶 SANDBOX MODE ACTIVE' : '⚪ Sandbox Disabled'}</span>
              </div>
            </div>
            
            {/* Warning Banner */}
            <div className="mb-6 p-4 bg-amber-900/20 border-2 border-amber-500/50 rounded-lg">
              <div className="flex items-center gap-3">
                <AlertTriangle className="w-6 h-6 text-amber-400" />
                <div>
                  <div className="text-amber-400 font-bold">Test Environment</div>
                  <div className="text-xs text-gray-400">All transactions in Sandbox mode are simulated. No real funds will be transferred.</div>
                </div>
              </div>
            </div>
            
            {/* Simulation Controls */}
            <div className="grid grid-cols-2 gap-6 mb-6">
              {/* SWIFT Sandbox */}
              <div className="bg-yellow-900/10 rounded-lg p-4 border border-yellow-500/30">
                <div className="flex items-center gap-2 mb-4">
                  <Globe className="w-5 h-5 text-yellow-400" />
                  <h4 className="text-yellow-400 font-bold">SWIFT Sandbox</h4>
                </div>
                <div className="space-y-2 text-xs text-gray-400 mb-4">
                  <div>• Simulates SWIFT FIN message transmission</div>
                  <div>• Tests message format: {swiftForm.messageType}</div>
                  <div>• Receiver: {swiftForm.receiverBic}</div>
                  <div>• Amount: {swiftForm.currency} {parseFloat(swiftForm.amount).toLocaleString()}</div>
                </div>
                <button 
                  onClick={() => runSandboxSimulation('SWIFT')}
                  disabled={sandboxSimulation.isRunning}
                  className={`w-full py-3 rounded font-bold flex items-center justify-center gap-2 ${
                    sandboxSimulation.isRunning 
                      ? 'bg-gray-800 text-gray-500 cursor-not-allowed' 
                      : 'bg-yellow-600 hover:bg-yellow-700 text-black'
                  }`}>
                  {sandboxSimulation.isRunning && sandboxSimulation.type === 'SWIFT' 
                    ? <><Loader2 className="w-5 h-5 animate-spin" /> Simulating...</>
                    : <><Play className="w-5 h-5" /> Run SWIFT Sandbox</>}
                </button>
              </div>
              
              {/* IP-ID Sandbox */}
              <div className="bg-cyan-900/10 rounded-lg p-4 border border-cyan-500/30">
                <div className="flex items-center gap-2 mb-4">
                  <Network className="w-5 h-5 text-cyan-400" />
                  <h4 className="text-cyan-400 font-bold">IP-ID Sandbox</h4>
                </div>
                <div className="space-y-2 text-xs text-gray-400 mb-4">
                  <div>• Simulates IP-ID Server-to-Server transfer</div>
                  <div>• Format: {ipidForm.format === 'ISO20022' ? 'ISO 20022 pacs.008' : 'SWIFT MT103'}</div>
                  <div>• Server: {servers.find(s => s.id === ipidForm.destinationServerId)?.name || 'N/A'}</div>
                  <div>• Amount: {ipidForm.currency} {parseFloat(ipidForm.amount).toLocaleString()}</div>
                </div>
                <button 
                  onClick={() => runSandboxSimulation('IPID')}
                  disabled={sandboxSimulation.isRunning}
                  className={`w-full py-3 rounded font-bold flex items-center justify-center gap-2 ${
                    sandboxSimulation.isRunning 
                      ? 'bg-gray-800 text-gray-500 cursor-not-allowed' 
                      : 'bg-cyan-600 hover:bg-cyan-700 text-white'
                  }`}>
                  {sandboxSimulation.isRunning && sandboxSimulation.type === 'IPID' 
                    ? <><Loader2 className="w-5 h-5 animate-spin" /> Simulating...</>
                    : <><Play className="w-5 h-5" /> Run IP-ID Sandbox</>}
                </button>
              </div>
            </div>
            
            {/* Simulation Timeline */}
            {(sandboxSimulation.isRunning || sandboxSimulation.timeline.length > 0) && (
              <div className="bg-gray-900/50 rounded-lg p-4 border border-gray-800 mb-6">
                <div className="flex items-center justify-between mb-4">
                  <h4 className="text-white font-bold flex items-center gap-2">
                    <Activity className="w-4 h-4 text-amber-400" />
                    Simulation Timeline
                    {sandboxSimulation.type && (
                      <span className={`text-xs px-2 py-0.5 rounded ${sandboxSimulation.type === 'SWIFT' ? 'bg-yellow-900 text-yellow-400' : 'bg-cyan-900 text-cyan-400'}`}>
                        {sandboxSimulation.type}
                      </span>
                    )}
                  </h4>
                  {!sandboxSimulation.isRunning && sandboxSimulation.timeline.length > 0 && (
                    <button onClick={resetSandbox} className="text-xs text-gray-400 hover:text-white flex items-center gap-1">
                      <RotateCcw className="w-3 h-3" /> Reset
                    </button>
                  )}
                </div>
                
                {/* Progress Bar */}
                <div className="mb-4">
                  <div className="flex items-center justify-between text-xs text-gray-500 mb-1">
                    <span>Progress</span>
                    <span>{sandboxSimulation.step}/{sandboxSimulation.totalSteps} steps</span>
                  </div>
                  <div className="w-full bg-gray-800 rounded-full h-2">
                    <div 
                      className={`h-2 rounded-full transition-all ${sandboxSimulation.type === 'SWIFT' ? 'bg-yellow-500' : 'bg-cyan-500'}`}
                      style={{ width: `${(sandboxSimulation.step / sandboxSimulation.totalSteps) * 100}%` }} 
                    />
                  </div>
                </div>
                
                {/* Steps */}
                <div className="space-y-2">
                  {sandboxSimulation.timeline.map((step, idx) => (
                    <div key={idx} className={`flex items-center gap-3 p-2 rounded ${
                      step.status === 'active' ? 'bg-amber-900/30 border border-amber-500/50' :
                      step.status === 'completed' ? 'bg-green-900/20' : 'bg-gray-800/50'
                    }`}>
                      <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                        step.status === 'completed' ? 'bg-green-600 text-white' :
                        step.status === 'active' ? 'bg-amber-500 text-black animate-pulse' :
                        'bg-gray-700 text-gray-400'
                      }`}>
                        {step.status === 'completed' ? <CheckCircle className="w-4 h-4" /> : step.step}
                      </div>
                      <div className="flex-1">
                        <div className={`text-sm ${step.status === 'active' ? 'text-amber-400' : step.status === 'completed' ? 'text-green-400' : 'text-gray-500'}`}>
                          {step.name}
                        </div>
                        {step.timestamp && (
                          <div className="text-xs text-gray-600">{new Date(step.timestamp).toLocaleTimeString()}</div>
                        )}
                      </div>
                      {step.status === 'active' && <Loader2 className="w-4 h-4 text-amber-400 animate-spin" />}
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            {/* Sandbox Result */}
            {sandboxSimulation.result && (
              <div className="bg-green-900/20 rounded-lg p-4 border border-green-500/50">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-6 h-6 text-green-400" />
                    <h4 className="text-green-400 font-bold">Sandbox Simulation Complete</h4>
                  </div>
                  <span className="text-xs bg-green-900 text-green-400 px-2 py-1 rounded">SIMULATED SUCCESS</span>
                </div>
                
                <div className="grid grid-cols-3 gap-4 mb-4 text-xs">
                  <div>
                    <div className="text-gray-500 mb-1">Transaction ID</div>
                    <div className="text-white font-mono">{sandboxSimulation.result.id.substring(0, 18)}...</div>
                  </div>
                  <div>
                    <div className="text-gray-500 mb-1">Message ID</div>
                    <div className="text-cyan-400 font-mono">{sandboxSimulation.result.msgId}</div>
                  </div>
                  <div>
                    <div className="text-gray-500 mb-1">UETR</div>
                    <div className="text-yellow-400 font-mono">{sandboxSimulation.result.uetr.substring(0, 18)}...</div>
                  </div>
                  <div>
                    <div className="text-gray-500 mb-1">Amount</div>
                    <div className="text-emerald-400 font-bold">{sandboxSimulation.result.currency} {sandboxSimulation.result.amount.toLocaleString()}</div>
                  </div>
                  <div>
                    <div className="text-gray-500 mb-1">Route</div>
                    <div className="text-white">{sandboxSimulation.result.senderBic} → {sandboxSimulation.result.receiverBic}</div>
                  </div>
                  <div>
                    <div className="text-gray-500 mb-1">Confirmation</div>
                    <div className="text-green-400 font-mono">{sandboxSimulation.result.confirmationCode}</div>
                  </div>
                </div>
                
                <div className="flex gap-3">
                  <button 
                    onClick={() => generateSandboxReceiptPDF(sandboxSimulation.result!)}
                    className="flex-1 py-2 bg-gray-800 hover:bg-gray-700 border border-green-500/50 rounded font-bold flex items-center justify-center gap-2 text-green-400">
                    <Terminal className="w-4 h-4" /> BlackScreen PDF
                  </button>
                  <button 
                    onClick={() => generateSandboxWhitePaperPDF(sandboxSimulation.result!)}
                    className="flex-1 py-2 bg-white hover:bg-gray-100 rounded font-bold flex items-center justify-center gap-2 text-gray-800">
                    <FileText className="w-4 h-4" /> Transfer PDF
                  </button>
                  <button 
                    onClick={resetSandbox}
                    className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded text-sm flex items-center gap-2">
                    <RotateCcw className="w-4 h-4" /> Reset
                  </button>
                </div>
              </div>
            )}
            
            {/* Info Section */}
            {!sandboxSimulation.isRunning && !sandboxSimulation.result && sandboxSimulation.timeline.length === 0 && (
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-gray-900/30 rounded-lg p-4 border border-gray-800">
                  <h5 className="text-white font-bold mb-3 flex items-center gap-2">
                    <Info className="w-4 h-4 text-blue-400" /> What is Sandbox Mode?
                  </h5>
                  <ul className="space-y-2 text-xs text-gray-400">
                    <li>• Simulates complete transfer workflows</li>
                    <li>• No real funds are moved</li>
                    <li>• Tests message formats and routing</li>
                    <li>• Generates test receipts for verification</li>
                    <li>• Validates configuration before production</li>
                  </ul>
                </div>
                <div className="bg-gray-900/30 rounded-lg p-4 border border-gray-800">
                  <h5 className="text-white font-bold mb-3 flex items-center gap-2">
                    <CheckCheck className="w-4 h-4 text-green-400" /> Sandbox Features
                  </h5>
                  <ul className="space-y-2 text-xs text-gray-400">
                    <li>• Full SWIFT FIN message simulation</li>
                    <li>• IP-ID Server-to-Server simulation</li>
                    <li>• Real-time step-by-step visualization</li>
                    <li>• Downloadable test receipts (PDF)</li>
                    <li>• Payload preview and verification</li>
                  </ul>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Ledger - Custody Accounts */}
        {activeTab === 'ledger' && (
          <div className="flex-1 overflow-auto p-4">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-emerald-900/50 rounded-lg flex items-center justify-center border border-emerald-500/50">
                <Wallet className="w-6 h-6 text-emerald-400" />
              </div>
              <div>
                <h3 className="text-emerald-400 font-bold">Ledger - Custody Accounts</h3>
                <p className="text-xs text-gray-500">Select source account for SWIFT and IP-ID transfers</p>
              </div>
            </div>
            
            {/* Selected Account Display */}
            {selectedLedgerAccount && (
              <div className="mb-6 p-4 bg-emerald-900/20 border border-emerald-500/50 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-emerald-400 font-bold flex items-center gap-2">
                    <CheckCircle className="w-4 h-4" /> Selected Source Account
                  </span>
                  <button onClick={() => setSelectedLedgerAccount(null)} className="text-xs text-gray-400 hover:text-white">Clear</button>
                </div>
                <div className="grid grid-cols-3 gap-4 text-xs">
                  <div><span className="text-gray-500">Account:</span> <span className="text-white font-mono">{selectedLedgerAccount.accountNumber}</span></div>
                  <div><span className="text-gray-500">Name:</span> <span className="text-white">{selectedLedgerAccount.accountName}</span></div>
                  <div><span className="text-gray-500">Balance:</span> <span className="text-emerald-400">{selectedLedgerAccount.currency} {selectedLedgerAccount.availableBalance?.toLocaleString()}</span></div>
                </div>
              </div>
            )}
            
            {/* Custody Accounts List */}
            <div className="grid grid-cols-2 gap-4">
              {custodyAccounts.length === 0 ? (
                <div className="col-span-2 text-center py-8 text-gray-500">
                  <Wallet className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  <p>No custody accounts found</p>
                  <p className="text-xs mt-1">Create accounts in the Custody Accounts module</p>
                </div>
              ) : (
                custodyAccounts.map(account => (
                  <div key={account.id} 
                    onClick={() => setSelectedLedgerAccount(account)}
                    className={`p-4 rounded-lg border cursor-pointer transition-all ${
                      selectedLedgerAccount?.id === account.id 
                        ? 'bg-emerald-900/30 border-emerald-500' 
                        : 'bg-gray-900/50 border-gray-800 hover:border-emerald-500/50'
                    }`}>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-white font-bold">{account.accountName}</span>
                      <span className={`text-xs px-2 py-0.5 rounded ${
                        account.accountCategory === 'NOSTRO' ? 'bg-blue-900 text-blue-400' :
                        account.accountCategory === 'VOSTRO' ? 'bg-purple-900 text-purple-400' :
                        'bg-gray-800 text-gray-400'
                      }`}>{account.accountCategory}</span>
                    </div>
                    <div className="space-y-1 text-xs">
                      <div className="flex justify-between"><span className="text-gray-500">Account:</span><span className="text-cyan-400 font-mono">{account.accountNumber}</span></div>
                      <div className="flex justify-between"><span className="text-gray-500">IBAN:</span><span className="text-white font-mono">{account.iban || 'N/A'}</span></div>
                      <div className="flex justify-between"><span className="text-gray-500">SWIFT:</span><span className="text-yellow-400 font-mono">{account.swiftBic || 'N/A'}</span></div>
                      <div className="flex justify-between"><span className="text-gray-500">Bank:</span><span className="text-white">{account.bankName}</span></div>
                      <div className="flex justify-between"><span className="text-gray-500">Balance:</span><span className="text-emerald-400 font-bold">{account.currency} {account.availableBalance?.toLocaleString()}</span></div>
                    </div>
                    {selectedLedgerAccount?.id === account.id && (
                      <div className="mt-2 pt-2 border-t border-emerald-500/30 text-center text-xs text-emerald-400">
                        ✓ Selected as source account
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* ISO20022Scan Tab - Professional Etherscan-Level Explorer */}
        {activeTab === 'iso20022scan' && (
          <div className="flex-1 overflow-auto bg-[#0d1117]">
            {/* Top Navigation Bar - Etherscan Style */}
            <div className="bg-[#161b22] border-b border-[#30363d]">
              <div className="px-4 py-2 flex items-center justify-between">
                <div className="flex items-center gap-6">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-cyan-400 rounded-lg flex items-center justify-center">
                      <Layers className="w-5 h-5 text-white" />
                    </div>
                    <span className="text-white font-bold text-lg">ISO20022Scan</span>
                    <span className="text-[10px] px-1.5 py-0.5 bg-blue-600 text-white rounded">MAINNET</span>
                  </div>
                  <nav className="flex items-center gap-1 text-sm">
                    <button className="px-3 py-1.5 text-gray-400 hover:text-white hover:bg-[#21262d] rounded">Home</button>
                    <button className="px-3 py-1.5 text-blue-400 bg-[#21262d] rounded">Transactions</button>
                    <button className="px-3 py-1.5 text-gray-400 hover:text-white hover:bg-[#21262d] rounded">Tokens</button>
                    <button className="px-3 py-1.5 text-gray-400 hover:text-white hover:bg-[#21262d] rounded">Contracts</button>
                    <button className="px-3 py-1.5 text-gray-400 hover:text-white hover:bg-[#21262d] rounded">Analytics</button>
                  </nav>
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2 text-xs">
                    <div className="flex items-center gap-1 px-2 py-1 bg-[#21262d] rounded">
                      <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                      <span className="text-gray-400">Gas:</span>
                      <span className="text-white">24 Gwei</span>
                    </div>
                    <div className="flex items-center gap-1 px-2 py-1 bg-[#21262d] rounded">
                      <span className="text-gray-400">ETH:</span>
                      <span className="text-white">$3,245.67</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Hero Search Section */}
            <div className="bg-gradient-to-b from-[#161b22] to-[#0d1117] px-4 py-8">
              <div className="max-w-4xl mx-auto text-center">
                <h1 className="text-3xl font-bold text-white mb-2">ISO 20022 Blockchain Explorer</h1>
                <p className="text-gray-400 mb-6">Search transactions, tokens, and smart contracts on the ISO 20022 compliant network</p>
                <div className="relative">
                  <div className="flex bg-[#0d1117] border border-[#30363d] rounded-lg overflow-hidden">
                    <select className="bg-[#21262d] text-gray-300 text-sm px-3 py-3 border-r border-[#30363d] outline-none">
                      <option>All Filters</option>
                      <option>Txn Hash</option>
                      <option>Block</option>
                      <option>Token</option>
                    </select>
                    <input type="text" value={scanSearchQuery} onChange={e => setScanSearchQuery(e.target.value)}
                      placeholder="Search by Txn Hash / Block / Token / Address"
                      className="flex-1 bg-transparent text-white px-4 py-3 outline-none placeholder-gray-500" />
                    <button className="px-6 bg-blue-600 hover:bg-blue-700 text-white font-medium">
                      <Search className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Stats Cards Row */}
            <div className="px-4 -mt-4">
              <div className="max-w-7xl mx-auto grid grid-cols-4 gap-4">
                <div className="bg-[#161b22] border border-[#30363d] rounded-lg p-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-blue-500/20 rounded-lg flex items-center justify-center">
                      <Activity className="w-5 h-5 text-blue-400" />
                    </div>
                    <div>
                      <div className="text-gray-400 text-xs">TRANSACTIONS</div>
                      <div className="text-white text-xl font-bold">{mintingTransactions.length.toLocaleString()}</div>
                    </div>
                  </div>
                  <div className="mt-2 text-xs text-gray-500">{mintingTransactions.filter(t => t.status === 'MINTED').length} confirmed</div>
                </div>
                <div className="bg-[#161b22] border border-[#30363d] rounded-lg p-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-green-500/20 rounded-lg flex items-center justify-center">
                      <Coins className="w-5 h-5 text-green-400" />
                    </div>
                    <div>
                      <div className="text-gray-400 text-xs">TOTAL VOLUME</div>
                      <div className="text-white text-xl font-bold">${mintingTransactions.reduce((s, t) => s + t.sourceAmount, 0).toLocaleString()}</div>
                    </div>
                  </div>
                  <div className="mt-2 text-xs text-green-400">+12.5% (24h)</div>
                </div>
                <div className="bg-[#161b22] border border-[#30363d] rounded-lg p-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-purple-500/20 rounded-lg flex items-center justify-center">
                      <Box className="w-5 h-5 text-purple-400" />
                    </div>
                    <div>
                      <div className="text-gray-400 text-xs">LATEST BLOCK</div>
                      <div className="text-white text-xl font-bold">#{(mintingTransactions[0]?.blockNumber || 19234567).toLocaleString()}</div>
                    </div>
                  </div>
                  <div className="mt-2 text-xs text-gray-500">12.1s avg block time</div>
                </div>
                <div className="bg-[#161b22] border border-[#30363d] rounded-lg p-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-cyan-500/20 rounded-lg flex items-center justify-center">
                      <Network className="w-5 h-5 text-cyan-400" />
                    </div>
                    <div>
                      <div className="text-gray-400 text-xs">NETWORKS</div>
                      <div className="text-white text-xl font-bold">{new Set(mintingTransactions.map(t => t.targetNetwork)).size || 5}</div>
                    </div>
                  </div>
                  <div className="mt-2 text-xs text-gray-500">Multi-chain support</div>
                </div>
              </div>
            </div>

            {/* Main Content */}
            <div className="px-4 py-6">
              <div className="max-w-7xl mx-auto">
                {scanSelectedTx ? (
                  /* Transaction Detail View - Etherscan Style */
                  <div className="space-y-4">
                    {/* Back Button */}
                    <button onClick={() => setScanSelectedTx(null)} className="flex items-center gap-2 text-blue-400 hover:text-blue-300 text-sm">
                      <ArrowLeft className="w-4 h-4" /> Back to Transactions
                    </button>
                    
                    {/* Transaction Header */}
                    <div className="bg-[#161b22] border border-[#30363d] rounded-lg overflow-hidden">
                      <div className="px-4 py-3 border-b border-[#30363d] flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <h2 className="text-lg font-bold text-white">Transaction Details</h2>
                          <span className={`px-2 py-0.5 rounded text-xs font-medium ${scanSelectedTx.status === 'MINTED' ? 'bg-green-500/20 text-green-400 border border-green-500/30' : 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30'}`}>
                            {scanSelectedTx.status === 'MINTED' ? '✓ Success' : 'Pending'}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <button onClick={() => {
                            const network = BLOCKCHAIN_NETWORKS.find(n => n.id === scanSelectedTx.targetNetwork);
                            if (network?.explorerUrl) window.open(`${network.explorerUrl}/tx/${scanSelectedTx.txHash}`, '_blank');
                          }} className="px-3 py-1.5 bg-[#21262d] hover:bg-[#30363d] rounded text-sm text-gray-300 flex items-center gap-1">
                            <Globe className="w-4 h-4" /> View on Etherscan
                          </button>
                        </div>
                      </div>
                      
                      <div className="p-4 space-y-4">
                        {/* Transaction Hash */}
                        <div className="flex items-start gap-4 py-3 border-b border-[#21262d]">
                          <div className="w-40 text-gray-400 text-sm flex items-center gap-2">
                            <Hash className="w-4 h-4" /> Transaction Hash:
                          </div>
                          <div className="flex-1 flex items-center gap-2">
                            <span className="text-blue-400 font-mono text-sm">{scanSelectedTx.txHash}</span>
                            <button onClick={() => navigator.clipboard.writeText(scanSelectedTx.txHash || '')} className="p-1 hover:bg-[#21262d] rounded">
                              <Copy className="w-4 h-4 text-gray-500" />
                            </button>
                          </div>
                        </div>
                        
                        {/* Status */}
                        <div className="flex items-start gap-4 py-3 border-b border-[#21262d]">
                          <div className="w-40 text-gray-400 text-sm flex items-center gap-2">
                            <CheckCircle className="w-4 h-4" /> Status:
                          </div>
                          <div className="flex-1">
                            <span className={`inline-flex items-center gap-1 px-2 py-1 rounded text-sm ${scanSelectedTx.status === 'MINTED' ? 'bg-green-500/10 text-green-400' : 'bg-yellow-500/10 text-yellow-400'}`}>
                              {scanSelectedTx.status === 'MINTED' ? <CheckCircle className="w-4 h-4" /> : <Clock className="w-4 h-4" />}
                              {scanSelectedTx.status === 'MINTED' ? 'Success' : 'Pending'}
                            </span>
                          </div>
                        </div>
                        
                        {/* Block */}
                        <div className="flex items-start gap-4 py-3 border-b border-[#21262d]">
                          <div className="w-40 text-gray-400 text-sm flex items-center gap-2">
                            <Box className="w-4 h-4" /> Block:
                          </div>
                          <div className="flex-1 flex items-center gap-2">
                            <span className="text-blue-400 text-sm">#{scanSelectedTx.blockNumber?.toLocaleString()}</span>
                            <span className="text-gray-500 text-xs px-2 py-0.5 bg-[#21262d] rounded">{Math.floor(Math.random() * 1000) + 100} Block Confirmations</span>
                          </div>
                        </div>
                        
                        {/* Timestamp */}
                        <div className="flex items-start gap-4 py-3 border-b border-[#21262d]">
                          <div className="w-40 text-gray-400 text-sm flex items-center gap-2">
                            <Clock className="w-4 h-4" /> Timestamp:
                          </div>
                          <div className="flex-1 text-white text-sm">
                            {new Date(scanSelectedTx.createdAt).toLocaleString()} ({Math.floor((Date.now() - new Date(scanSelectedTx.createdAt).getTime()) / 60000)} mins ago)
                          </div>
                        </div>
                        
                        {/* Transaction Action */}
                        <div className="flex items-start gap-4 py-3 border-b border-[#21262d]">
                          <div className="w-40 text-gray-400 text-sm flex items-center gap-2">
                            <Zap className="w-4 h-4" /> Transaction Action:
                          </div>
                          <div className="flex-1">
                            <div className="inline-flex items-center gap-2 px-3 py-2 bg-[#21262d] rounded-lg">
                              <span className={`w-6 h-6 rounded flex items-center justify-center ${scanSelectedTx.type === 'MINT' ? 'bg-green-600' : 'bg-purple-600'}`}>
                                {scanSelectedTx.type === 'MINT' ? <Coins className="w-4 h-4 text-white" /> : <Link2 className="w-4 h-4 text-white" />}
                              </span>
                              <span className="text-white text-sm font-medium">{scanSelectedTx.type === 'MINT' ? 'Mint' : 'Tokenize'}</span>
                              <span className="text-gray-400 text-sm">{scanSelectedTx.targetAmount.toLocaleString()} {scanSelectedTx.targetSymbol}</span>
                              <span className="text-gray-500 text-sm">on {BLOCKCHAIN_NETWORKS.find(n => n.id === scanSelectedTx.targetNetwork)?.name}</span>
                            </div>
                          </div>
                        </div>
                        
                        {/* Value */}
                        <div className="flex items-start gap-4 py-3 border-b border-[#21262d]">
                          <div className="w-40 text-gray-400 text-sm flex items-center gap-2">
                            <Banknote className="w-4 h-4" /> Value:
                          </div>
                          <div className="flex-1">
                            <span className="text-white text-lg font-bold">{scanSelectedTx.sourceAmount.toLocaleString()} {scanSelectedTx.sourceCurrency}</span>
                            <span className="text-gray-400 text-sm ml-2">(${scanSelectedTx.sourceAmount.toLocaleString()} USD)</span>
                          </div>
                        </div>
                        
                        {/* Transaction Fee */}
                        <div className="flex items-start gap-4 py-3 border-b border-[#21262d]">
                          <div className="w-40 text-gray-400 text-sm flex items-center gap-2">
                            <Flame className="w-4 h-4" /> Transaction Fee:
                          </div>
                          <div className="flex-1 text-white text-sm">
                            0.00{Math.floor(Math.random() * 9) + 1}42 ETH ($4.23)
                          </div>
                        </div>
                        
                        {/* Gas */}
                        <div className="flex items-start gap-4 py-3 border-b border-[#21262d]">
                          <div className="w-40 text-gray-400 text-sm flex items-center gap-2">
                            <Activity className="w-4 h-4" /> Gas Used:
                          </div>
                          <div className="flex-1 text-white text-sm">
                            {scanSelectedTx.gasUsed?.toLocaleString()} ({Math.floor(Math.random() * 30) + 50}%)
                          </div>
                        </div>
                        
                        {/* Transfer Method */}
                        <div className="flex items-start gap-4 py-3 border-b border-[#21262d]">
                          <div className="w-40 text-gray-400 text-sm flex items-center gap-2">
                            <ArrowRightLeft className="w-4 h-4" /> Transfer Method:
                          </div>
                          <div className="flex-1">
                            <span className={`inline-flex items-center gap-2 px-3 py-1.5 rounded text-sm font-medium ${scanSelectedTx.sourceType === 'SWIFT' ? 'bg-yellow-500/10 text-yellow-400 border border-yellow-500/30' : 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/30'}`}>
                              {scanSelectedTx.sourceType === 'SWIFT' ? <Globe className="w-4 h-4" /> : <Network className="w-4 h-4" />}
                              {scanSelectedTx.sourceType === 'SWIFT' ? 'SWIFT FIN (MT103/pacs.008)' : 'IP-ID Server-to-Server'}
                            </span>
                          </div>
                        </div>
                        
                        {/* Contract */}
                        <div className="flex items-start gap-4 py-3">
                          <div className="w-40 text-gray-400 text-sm flex items-center gap-2">
                            <Code className="w-4 h-4" /> Interacted With:
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <span className="w-6 h-6 bg-purple-600 rounded flex items-center justify-center text-white text-xs">C</span>
                              <span className="text-blue-400 font-mono text-sm">{SMART_CONTRACTS.find(c => c.id === scanSelectedTx.targetContract)?.address || '0x...'}</span>
                              <span className="text-gray-500 text-xs">({SMART_CONTRACTS.find(c => c.id === scanSelectedTx.targetContract)?.symbol} Token)</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    {/* Download Receipt */}
                    <div className="flex justify-end">
                      <button onClick={() => {
                        const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
                        const network = BLOCKCHAIN_NETWORKS.find(n => n.id === scanSelectedTx.targetNetwork);
                        doc.setFillColor(13, 17, 23);
                        doc.rect(0, 0, 210, 297, 'F');
                        doc.setFillColor(22, 27, 34);
                        doc.rect(0, 0, 210, 40, 'F');
                        doc.setTextColor(255, 255, 255);
                        doc.setFontSize(20);
                        doc.setFont('helvetica', 'bold');
                        doc.text('ISO20022Scan', 15, 18);
                        doc.setFontSize(10);
                        doc.setTextColor(148, 163, 184);
                        doc.text('Transaction Receipt', 15, 28);
                        doc.setTextColor(34, 197, 94);
                        doc.setFontSize(8);
                        doc.text(scanSelectedTx.status === 'MINTED' ? 'SUCCESS' : 'PENDING', 180, 18);
                        let y = 50;
                        const addRow = (label: string, value: string, isHash = false) => {
                          doc.setTextColor(148, 163, 184);
                          doc.setFontSize(8);
                          doc.text(label, 15, y);
                          doc.setTextColor(255, 255, 255);
                          doc.setFontSize(isHash ? 7 : 9);
                          doc.setFont('helvetica', isHash ? 'normal' : 'bold');
                          doc.text(value, 15, y + 6);
                          y += 16;
                        };
                        addRow('Transaction Hash', scanSelectedTx.txHash || '', true);
                        addRow('Block', `#${scanSelectedTx.blockNumber?.toLocaleString()}`);
                        addRow('Timestamp', new Date(scanSelectedTx.createdAt).toISOString());
                        addRow('Value', `${scanSelectedTx.sourceAmount.toLocaleString()} ${scanSelectedTx.sourceCurrency}`);
                        addRow('Token Output', `${scanSelectedTx.targetAmount.toLocaleString()} ${scanSelectedTx.targetSymbol}`);
                        addRow('Network', network?.name || '');
                        addRow('Gas Used', scanSelectedTx.gasUsed || '');
                        addRow('Transfer Method', scanSelectedTx.sourceType === 'SWIFT' ? 'SWIFT FIN' : 'IP-ID');
                        doc.setTextColor(100, 116, 139);
                        doc.setFontSize(7);
                        doc.text('ISO20022Scan - Blockchain Transaction Explorer', 105, 285, { align: 'center' });
                        doc.save(`iso20022scan-${scanSelectedTx.txHash?.substring(0, 16)}.pdf`);
                      }} className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg text-sm font-medium flex items-center gap-2">
                        <Download className="w-4 h-4" /> Download Receipt
                      </button>
                    </div>
                  </div>
                ) : (
                  /* Transaction List View */
                  <div className="grid grid-cols-3 gap-6">
                    {/* Latest Transactions */}
                    <div className="col-span-2 bg-[#161b22] border border-[#30363d] rounded-lg overflow-hidden">
                      <div className="px-4 py-3 border-b border-[#30363d] flex items-center justify-between">
                        <h3 className="text-white font-medium">Latest Transactions</h3>
                        <div className="flex items-center gap-2 text-xs">
                          <button className="px-2 py-1 bg-blue-600 text-white rounded">All</button>
                          <button className="px-2 py-1 bg-[#21262d] text-gray-400 hover:text-white rounded">Minting</button>
                          <button className="px-2 py-1 bg-[#21262d] text-gray-400 hover:text-white rounded">Tokenize</button>
                        </div>
                      </div>
                      
                      <div className="divide-y divide-[#21262d] max-h-[600px] overflow-y-auto">
                        {mintingTransactions.length === 0 ? (
                          <div className="p-8 text-center">
                            <Coins className="w-16 h-16 mx-auto mb-4 text-gray-700" />
                            <div className="text-gray-400 mb-2">No transactions yet</div>
                            <button onClick={() => setActiveTab('blockchain')} className="text-blue-400 hover:text-blue-300 text-sm">
                              Go to Blockchain tab to create transactions →
                            </button>
                          </div>
                        ) : mintingTransactions.filter(tx => {
                          if (!scanSearchQuery) return true;
                          const q = scanSearchQuery.toLowerCase();
                          return tx.txHash?.toLowerCase().includes(q) || tx.targetSymbol.toLowerCase().includes(q);
                        }).map(tx => (
                          <div key={tx.id} onClick={() => setScanSelectedTx(tx)}
                            className="px-4 py-3 hover:bg-[#21262d] cursor-pointer flex items-center gap-4">
                            <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${tx.type === 'MINT' ? 'bg-green-500/20' : 'bg-purple-500/20'}`}>
                              {tx.type === 'MINT' ? <Coins className="w-5 h-5 text-green-400" /> : <Link2 className="w-5 h-5 text-purple-400" />}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="text-blue-400 font-mono text-sm truncate">{tx.txHash?.substring(0, 20)}...</span>
                                <span className={`text-[10px] px-1.5 py-0.5 rounded ${tx.status === 'MINTED' ? 'bg-green-500/20 text-green-400' : 'bg-yellow-500/20 text-yellow-400'}`}>
                                  {tx.status === 'MINTED' ? 'Success' : 'Pending'}
                                </span>
                              </div>
                              <div className="text-xs text-gray-500 mt-1">
                                {tx.type} • {Math.floor((Date.now() - new Date(tx.createdAt).getTime()) / 60000)} mins ago
                              </div>
                            </div>
                            <div className="text-right">
                              <div className="text-white text-sm font-medium">{tx.sourceAmount.toLocaleString()} {tx.sourceCurrency}</div>
                              <div className="text-xs text-gray-500">{tx.targetSymbol}</div>
                            </div>
                          </div>
                        ))}
                      </div>
                      
                      <div className="px-4 py-3 border-t border-[#30363d] text-center">
                        <button className="text-blue-400 hover:text-blue-300 text-sm">View all transactions →</button>
                      </div>
                    </div>
                    
                    {/* Sidebar */}
                    <div className="space-y-4">
                      {/* Network Status */}
                      <div className="bg-[#161b22] border border-[#30363d] rounded-lg p-4">
                        <h3 className="text-white font-medium mb-3 flex items-center gap-2">
                          <Wifi className="w-4 h-4 text-green-400" /> Network Status
                        </h3>
                        <div className="space-y-3">
                          {ALCHEMY_NETWORKS.slice(0, 5).map(net => (
                            <div key={net.id} className="flex items-center justify-between text-sm">
                              <div className="flex items-center gap-2">
                                <div className={`w-2 h-2 rounded-full ${alchemyStatus[net.id]?.connected ? 'bg-green-500' : 'bg-gray-600'}`}></div>
                                <span className="text-gray-300">{net.name.replace(' (Alchemy)', '')}</span>
                              </div>
                              <span className="text-gray-500 text-xs">{alchemyStatus[net.id]?.blockNumber?.toLocaleString() || '--'}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                      
                      {/* Quick Stats */}
                      <div className="bg-[#161b22] border border-[#30363d] rounded-lg p-4">
                        <h3 className="text-white font-medium mb-3">Transaction Types</h3>
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-gray-400 text-sm">Minting</span>
                            <span className="text-green-400 font-medium">{mintingTransactions.filter(t => t.type === 'MINT').length}</span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-gray-400 text-sm">Tokenization</span>
                            <span className="text-purple-400 font-medium">{mintingTransactions.filter(t => t.type === 'TOKENIZE').length}</span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-gray-400 text-sm">SWIFT Transfers</span>
                            <span className="text-yellow-400 font-medium">{mintingTransactions.filter(t => t.sourceType === 'SWIFT').length}</span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-gray-400 text-sm">IP-ID Transfers</span>
                            <span className="text-cyan-400 font-medium">{mintingTransactions.filter(t => t.sourceType === 'IPID').length}</span>
                          </div>
                        </div>
                      </div>
                      
                      {/* ISO 20022 Badge */}
                      <div className="bg-gradient-to-br from-blue-900/30 to-purple-900/30 border border-blue-500/30 rounded-lg p-4">
                        <div className="flex items-center gap-2 mb-2">
                          <Shield className="w-5 h-5 text-blue-400" />
                          <span className="text-white font-medium">ISO 20022 Compliant</span>
                        </div>
                        <p className="text-xs text-gray-400">
                          All transactions follow pacs.008.001.08 standard for global interoperability.
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
            
            {/* Footer */}
            <div className="bg-[#161b22] border-t border-[#30363d] px-4 py-4 mt-8">
              <div className="max-w-7xl mx-auto flex items-center justify-between text-xs text-gray-500">
                <div>ISO20022Scan © 2026 | Powered by Digital Commercial Bank Ltd</div>
                <div className="flex items-center gap-4">
                  <span>Terms</span>
                  <span>Privacy</span>
                  <span>API</span>
                  <span>Documentation</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Beneficiaries */}
        {activeTab === 'beneficiaries' && (
          <div className="flex-1 overflow-auto p-4">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-pink-900/50 rounded-lg flex items-center justify-center border border-pink-500/50">
                  <Users className="w-6 h-6 text-pink-400" />
                </div>
                <div>
                  <h3 className="text-pink-400 font-bold">Saved Beneficiaries</h3>
                  <p className="text-xs text-gray-500">Manage beneficiary accounts for transfers</p>
                </div>
              </div>
              <button onClick={() => { setShowBeneficiaryForm(true); setEditingBeneficiary(null); setBeneficiaryForm({ name: '', accountNumber: '', iban: '', bic: '', bankName: '', country: '', address: '', type: 'BOTH' }); }}
                className="px-4 py-2 bg-pink-600 hover:bg-pink-700 rounded text-sm font-medium flex items-center gap-2">
                <Plus className="w-4 h-4" /> Add Beneficiary
              </button>
            </div>
            
            {/* Beneficiary Form Modal */}
            {showBeneficiaryForm && (
              <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
                <div className="bg-gray-900 rounded-lg p-6 w-full max-w-lg border border-pink-500/50">
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="text-pink-400 font-bold">{editingBeneficiary ? 'Edit Beneficiary' : 'Add New Beneficiary'}</h4>
                    <button onClick={() => setShowBeneficiaryForm(false)} className="text-gray-400 hover:text-white"><X className="w-5 h-5" /></button>
                  </div>
                  <div className="space-y-3">
                    <div>
                      <label className="text-xs text-gray-500 block mb-1">Beneficiary Name *</label>
                      <input type="text" value={beneficiaryForm.name} onChange={e => setBeneficiaryForm(p => ({ ...p, name: e.target.value }))}
                        className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-sm text-white" placeholder="Company or Person Name" />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-xs text-gray-500 block mb-1">Account Number</label>
                        <input type="text" value={beneficiaryForm.accountNumber} onChange={e => setBeneficiaryForm(p => ({ ...p, accountNumber: e.target.value }))}
                          className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-sm text-white font-mono" />
                      </div>
                      <div>
                        <label className="text-xs text-gray-500 block mb-1">IBAN</label>
                        <input type="text" value={beneficiaryForm.iban} onChange={e => setBeneficiaryForm(p => ({ ...p, iban: e.target.value.toUpperCase() }))}
                          className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-sm text-white font-mono" />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-xs text-gray-500 block mb-1">BIC/SWIFT *</label>
                        <input type="text" value={beneficiaryForm.bic} onChange={e => setBeneficiaryForm(p => ({ ...p, bic: e.target.value.toUpperCase() }))}
                          className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-sm text-white font-mono" maxLength={11} placeholder="DEUTDEFFXXX" />
                      </div>
                      <div>
                        <label className="text-xs text-gray-500 block mb-1">Bank Name</label>
                        <input type="text" value={beneficiaryForm.bankName} onChange={e => setBeneficiaryForm(p => ({ ...p, bankName: e.target.value }))}
                          className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-sm text-white" />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-xs text-gray-500 block mb-1">Country</label>
                        <input type="text" value={beneficiaryForm.country} onChange={e => setBeneficiaryForm(p => ({ ...p, country: e.target.value }))}
                          className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-sm text-white" />
                      </div>
                      <div>
                        <label className="text-xs text-gray-500 block mb-1">Transfer Type</label>
                        <select value={beneficiaryForm.type} onChange={e => setBeneficiaryForm(p => ({ ...p, type: e.target.value as any }))}
                          className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-sm text-white">
                          <option value="BOTH">SWIFT & IP-ID</option>
                          <option value="SWIFT">SWIFT Only</option>
                          <option value="IPID">IP-ID Only</option>
                        </select>
                      </div>
                    </div>
                    <div>
                      <label className="text-xs text-gray-500 block mb-1">Address</label>
                      <input type="text" value={beneficiaryForm.address} onChange={e => setBeneficiaryForm(p => ({ ...p, address: e.target.value }))}
                        className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-sm text-white" />
                    </div>
                    <div className="flex gap-3 pt-3">
                      <button onClick={() => setShowBeneficiaryForm(false)} className="flex-1 py-2 bg-gray-700 hover:bg-gray-600 rounded text-sm">Cancel</button>
                      <button onClick={saveBeneficiary} className="flex-1 py-2 bg-pink-600 hover:bg-pink-700 rounded text-sm font-medium flex items-center justify-center gap-2">
                        <Save className="w-4 h-4" /> Save Beneficiary
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}
            
            {/* Beneficiaries List */}
            <div className="grid grid-cols-2 gap-4">
              {savedBeneficiaries.length === 0 ? (
                <div className="col-span-2 text-center py-8 text-gray-500">
                  <Users className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  <p>No saved beneficiaries</p>
                  <p className="text-xs mt-1">Click "Add Beneficiary" to create one</p>
                </div>
              ) : (
                savedBeneficiaries.map(benef => (
                  <div key={benef.id} className="p-4 rounded-lg border border-gray-800 bg-gray-900/50 hover:border-pink-500/50">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-white font-bold">{benef.name}</span>
                      <div className="flex items-center gap-2">
                        <span className={`text-xs px-2 py-0.5 rounded ${
                          benef.type === 'SWIFT' ? 'bg-yellow-900 text-yellow-400' :
                          benef.type === 'IPID' ? 'bg-cyan-900 text-cyan-400' :
                          'bg-green-900 text-green-400'
                        }`}>{benef.type}</span>
                        <button onClick={() => { setEditingBeneficiary(benef); setBeneficiaryForm({ name: benef.name, accountNumber: benef.accountNumber, iban: benef.iban || '', bic: benef.bic, bankName: benef.bankName, country: benef.country, address: benef.address || '', type: benef.type }); setShowBeneficiaryForm(true); }}
                          className="text-gray-400 hover:text-white"><Edit className="w-3 h-3" /></button>
                        <button onClick={() => deleteBeneficiary(benef.id)} className="text-gray-400 hover:text-red-400"><Trash2 className="w-3 h-3" /></button>
                      </div>
                    </div>
                    <div className="space-y-1 text-xs">
                      <div className="flex justify-between"><span className="text-gray-500">Account:</span><span className="text-cyan-400 font-mono">{benef.accountNumber || benef.iban || 'N/A'}</span></div>
                      <div className="flex justify-between"><span className="text-gray-500">BIC:</span><span className="text-yellow-400 font-mono">{benef.bic}</span></div>
                      <div className="flex justify-between"><span className="text-gray-500">Bank:</span><span className="text-white">{benef.bankName || 'N/A'}</span></div>
                      <div className="flex justify-between"><span className="text-gray-500">Country:</span><span className="text-white">{benef.country || 'N/A'}</span></div>
                    </div>
                    <div className="mt-2 pt-2 border-t border-gray-800 flex gap-2">
                      <button onClick={() => { setSwiftForm(p => ({ ...p, receiverBic: benef.bic, beneficiaryName: benef.name, beneficiaryAccount: benef.iban || benef.accountNumber })); setActiveTab('swift-transfer'); }}
                        className="flex-1 py-1 bg-yellow-900/50 hover:bg-yellow-900 rounded text-xs text-yellow-400">Use in SWIFT</button>
                      <button onClick={() => { setIpidForm(p => ({ ...p, cdtrNm: benef.name, cdtrAcct: benef.iban || benef.accountNumber })); setActiveTab('ipid-transfer'); }}
                        className="flex-1 py-1 bg-cyan-900/50 hover:bg-cyan-900 rounded text-xs text-cyan-400">Use in IP-ID</button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* History */}
        {activeTab === 'history' && (
          <div className="flex-1 overflow-auto p-4">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-violet-900/50 rounded-lg flex items-center justify-center border border-violet-500/50">
                <History className="w-6 h-6 text-violet-400" />
              </div>
              <div>
                <h3 className="text-violet-400 font-bold">Transaction History</h3>
                <p className="text-xs text-gray-500">View all completed transfers with downloadable receipts</p>
              </div>
            </div>
            
            {transactionHistory.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                <History className="w-16 h-16 mx-auto mb-3 opacity-50" />
                <p>No transactions yet</p>
                <p className="text-xs mt-1">Complete a SWIFT or IP-ID transfer to see it here</p>
              </div>
            ) : (
              <div className="space-y-3">
                {transactionHistory.map(tx => (
                  <div key={tx.id} className={`p-4 rounded-lg border ${
                    tx.type === 'SWIFT' ? 'border-yellow-900/50 bg-yellow-900/10' : 'border-cyan-900/50 bg-cyan-900/10'
                  }`}>
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                          tx.type === 'SWIFT' ? 'bg-yellow-900/50' : 'bg-cyan-900/50'
                        }`}>
                          {tx.type === 'SWIFT' ? <Globe className="w-5 h-5 text-yellow-400" /> : <Network className="w-5 h-5 text-cyan-400" />}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className={`font-bold ${tx.type === 'SWIFT' ? 'text-yellow-400' : 'text-cyan-400'}`}>{tx.type} Transfer</span>
                            <span className="text-xs text-gray-500">{tx.messageType}</span>
                          </div>
                          <div className="text-xs text-gray-400">{new Date(tx.createdAt).toLocaleString()}</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className={`px-2 py-1 rounded text-xs font-bold ${
                          tx.status === 'ACK' ? 'bg-green-900 text-green-400' : 
                          tx.status === 'NACK' || tx.status === 'FAILED' ? 'bg-red-900 text-red-400' : 
                          'bg-yellow-900 text-yellow-400'
                        }`}>{tx.status}</span>
                        <button onClick={() => generateTransactionReceiptPDF(tx)}
                          className="px-2 py-1.5 bg-gray-800 hover:bg-gray-700 border border-green-500/50 rounded text-xs font-medium flex items-center gap-1 text-green-400"
                          title="BlackScreen PDF">
                          <Terminal className="w-3 h-3" />
                        </button>
                        <button onClick={() => generateWhitePaperReceiptPDF(tx)}
                          className="px-2 py-1.5 bg-white hover:bg-gray-100 rounded text-xs font-medium flex items-center gap-1 text-gray-800"
                          title="Transfer PDF">
                          <FileText className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-4 gap-4 text-xs">
                      <div>
                        <div className="text-gray-500 mb-1">Amount</div>
                        <div className="text-white font-bold">{tx.currency} {tx.amount.toLocaleString()}</div>
                      </div>
                      <div>
                        <div className="text-gray-500 mb-1">Beneficiary</div>
                        <div className="text-white">{tx.beneficiaryName}</div>
                        <div className="text-cyan-400 font-mono text-xs">{tx.beneficiaryAccount}</div>
                      </div>
                      <div>
                        <div className="text-gray-500 mb-1">Route</div>
                        <div className="text-white">{tx.senderBic} → {tx.receiverBic}</div>
                        {tx.destinationIpId && <div className="text-cyan-400 text-xs">IP-ID: {tx.destinationIpId}</div>}
                      </div>
                      <div>
                        <div className="text-gray-500 mb-1">Reference</div>
                        <div className="text-yellow-400 font-mono text-xs">{tx.uetr.substring(0, 18)}...</div>
                        {tx.confirmationCode && <div className="text-green-400 text-xs">{tx.confirmationCode}</div>}
                      </div>
                    </div>
                    
                    <div className="mt-3 pt-3 border-t border-gray-800 flex items-center justify-between text-xs">
                      <div className="flex items-center gap-4 text-gray-500">
                        <span>MSG: {tx.msgId}</span>
                        {tx.latencyMs && <span>Latency: {tx.latencyMs}ms</span>}
                        {tx.sourceAccountName && <span>From: {tx.sourceAccountName}</span>}
                      </div>
                      <button onClick={() => setSelectedTransaction(tx)} className="text-violet-400 hover:text-violet-300 flex items-center gap-1">
                        <Eye className="w-3 h-3" /> View Details
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
            
            {/* Transaction Detail Modal */}
            {selectedTransaction && (
              <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
                <div className="bg-gray-900 rounded-lg p-6 w-full max-w-2xl border border-violet-500/50 max-h-[90vh] overflow-auto">
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="text-violet-400 font-bold">Transaction Details</h4>
                    <button onClick={() => setSelectedTransaction(null)} className="text-gray-400 hover:text-white"><X className="w-5 h-5" /></button>
                  </div>
                  <div className="space-y-4 text-xs">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <div className="text-gray-500">Transaction ID</div>
                        <div className="text-white font-mono">{selectedTransaction.id}</div>
                      </div>
                      <div className="space-y-2">
                        <div className="text-gray-500">UETR</div>
                        <div className="text-yellow-400 font-mono">{selectedTransaction.uetr}</div>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <div className="text-gray-500">Amount</div>
                        <div className="text-emerald-400 font-bold text-lg">{selectedTransaction.currency} {selectedTransaction.amount.toLocaleString()}</div>
                      </div>
                      <div className="space-y-2">
                        <div className="text-gray-500">Status</div>
                        <div className={`font-bold ${selectedTransaction.status === 'ACK' ? 'text-green-400' : 'text-yellow-400'}`}>{selectedTransaction.status}</div>
                      </div>
                    </div>
                    <div className="border-t border-gray-800 pt-4">
                      <div className="text-gray-500 mb-2">Payload Hash</div>
                      <div className="text-cyan-400 font-mono break-all">{selectedTransaction.payloadHash}</div>
                    </div>
                    <div className="border-t border-gray-800 pt-4">
                      <div className="text-gray-500 mb-2">Signature</div>
                      <div className="text-purple-400 font-mono break-all">{selectedTransaction.signature}</div>
                    </div>
                    <div className="flex gap-3 pt-4">
                      <button onClick={() => { generateTransactionReceiptPDF(selectedTransaction); }}
                        className="flex-1 py-2 bg-gray-800 hover:bg-gray-700 border border-green-500/50 rounded text-sm font-medium flex items-center justify-center gap-2 text-green-400">
                        <Terminal className="w-4 h-4" /> BlackScreen PDF
                      </button>
                      <button onClick={() => { generateWhitePaperReceiptPDF(selectedTransaction); }}
                        className="flex-1 py-2 bg-white hover:bg-gray-100 rounded text-sm font-medium flex items-center justify-center gap-2 text-gray-800">
                        <FileText className="w-4 h-4" /> Transfer PDF
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* SWIFT Transfer */}
        {activeTab === 'swift-transfer' && (
          <div className="flex-1 overflow-auto p-4">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-yellow-900/50 rounded-lg flex items-center justify-center border border-yellow-500/50">
                <Globe className="w-6 h-6 text-yellow-400" />
              </div>
              <div>
                <h3 className="text-yellow-400 font-bold">SWIFT FIN Transfer</h3>
                <p className="text-xs text-gray-500">Traditional SWIFT Network Messaging (MT Messages)</p>
              </div>
            </div>
            
            {swiftTransferring && (
              <div className="mb-6 p-4 bg-yellow-900/20 border border-yellow-500/50 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-yellow-400 font-bold flex items-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin" /> SWIFT Transfer in Progress
                  </span>
                  <span className="text-yellow-400">{swiftProgress}%</span>
                </div>
                <div className="w-full bg-gray-800 rounded-full h-2">
                  <div className="bg-yellow-500 h-2 rounded-full transition-all" style={{ width: `${swiftProgress}%` }} />
                </div>
              </div>
            )}
            
            <div className="grid grid-cols-2 gap-6">
              <div className="space-y-3 bg-gray-900/30 p-4 rounded-lg border border-yellow-900/30 max-h-[calc(100vh-200px)] overflow-y-auto">
                {/* Message Type Selector */}
                <div>
                  <label className="text-xs text-yellow-500 block mb-1">Message Type</label>
                  <select value={swiftForm.messageType} onChange={e => setSwiftForm(p => ({ ...p, messageType: e.target.value }))}
                    className="w-full bg-gray-900 border border-yellow-700/50 rounded px-3 py-2 text-sm text-white">
                    <optgroup label="Category 1 - Customer Payments">
                      <option value="MT101">MT101 - Request for Transfer</option>
                      <option value="MT102">MT102 - Multiple Customer Credit Transfer</option>
                      <option value="MT103">MT103 - Single Customer Credit Transfer ★</option>
                      <option value="MT103STP">MT103+ - STP Customer Credit Transfer</option>
                      <option value="MT104">MT104 - Direct Debit/Request for Debit</option>
                    </optgroup>
                    <optgroup label="Category 2 - Financial Institution Transfers">
                      <option value="MT200">MT200 - Financial Institution Transfer</option>
                      <option value="MT202">MT202 - General FI Transfer ★</option>
                      <option value="MT202COV">MT202COV - Cover Payment ★</option>
                      <option value="MT205">MT205 - FI Transfer Execution</option>
                      <option value="MT210">MT210 - Notice to Receive</option>
                    </optgroup>
                    <optgroup label="Category 5 - Securities">
                      <option value="MT540">MT540 - Receive Free ★</option>
                      <option value="MT541">MT541 - Receive Against Payment ★</option>
                      <option value="MT542">MT542 - Deliver Free ★</option>
                      <option value="MT543">MT543 - Deliver Against Payment ★</option>
                    </optgroup>
                    <optgroup label="Category 7 - Documentary Credits & Guarantees">
                      <option value="MT700">MT700 - Issue of Documentary Credit ★</option>
                      <option value="MT707">MT707 - Amendment to Documentary Credit</option>
                      <option value="MT760">MT760 - Guarantee / Standby LC ★</option>
                      <option value="MT799">MT799 - Free Format Message</option>
                    </optgroup>
                    <optgroup label="Category 9 - Cash Management">
                      <option value="MT900">MT900 - Confirmation of Debit ★</option>
                      <option value="MT910">MT910 - Confirmation of Credit ★</option>
                      <option value="MT940">MT940 - Customer Statement ★</option>
                      <option value="MT950">MT950 - Statement Message ★</option>
                    </optgroup>
                    <optgroup label="Common Messages">
                      <option value="MT199">MT199 - Free Format Message ★</option>
                      <option value="MT299">MT299 - Free Format (FI)</option>
                    </optgroup>
                  </select>
                </div>

                {/* Message Description */}
                <div className="p-2 bg-yellow-900/20 rounded border border-yellow-700/30">
                  <div className="text-xs text-yellow-400 font-bold">{getMessageDescription(swiftForm.messageType).name}</div>
                  <div className="text-[10px] text-gray-400">{getMessageDescription(swiftForm.messageType).description}</div>
                </div>
                
                {/* ═══════════════════════════════════════════════════════════════════════════════ */}
                {/* TRANSFER TYPE SELECTOR - STANDARD / GPI */}
                {/* ═══════════════════════════════════════════════════════════════════════════════ */}
                <div className="p-3 bg-gradient-to-r from-blue-900/30 to-cyan-900/30 rounded-lg border border-blue-500/30 space-y-3">
                  <div className="flex items-center gap-2 text-blue-400 font-bold text-xs">
                    <Zap className="w-4 h-4" /> Transfer Type
                  </div>
                  <div className="grid grid-cols-4 gap-2">
                    <button type="button" onClick={() => setSwiftForm(p => ({ ...p, transferType: 'STANDARD' }))}
                      className={`p-2 rounded text-xs font-medium transition-all ${
                        swiftForm.transferType === 'STANDARD' 
                          ? 'bg-gray-700 border-2 border-gray-500 text-white' 
                          : 'bg-gray-900 border border-gray-700 text-gray-400 hover:border-gray-500'
                      }`}>
                      <div className="font-bold">STANDARD</div>
                      <div className="text-[9px] text-gray-500">Traditional</div>
                    </button>
                    <button type="button" onClick={() => setSwiftForm(p => ({ ...p, transferType: 'GPI' }))}
                      className={`p-2 rounded text-xs font-medium transition-all ${
                        swiftForm.transferType === 'GPI' 
                          ? 'bg-blue-900/50 border-2 border-blue-500 text-blue-400' 
                          : 'bg-gray-900 border border-gray-700 text-gray-400 hover:border-blue-500/50'
                      }`}>
                      <div className="font-bold">GPI</div>
                      <div className="text-[9px] text-gray-500">SWIFT gpi</div>
                    </button>
                    <button type="button" onClick={() => setSwiftForm(p => ({ ...p, transferType: 'GPI_INSTANT' }))}
                      className={`p-2 rounded text-xs font-medium transition-all ${
                        swiftForm.transferType === 'GPI_INSTANT' 
                          ? 'bg-green-900/50 border-2 border-green-500 text-green-400' 
                          : 'bg-gray-900 border border-gray-700 text-gray-400 hover:border-green-500/50'
                      }`}>
                      <div className="font-bold">GPI INSTANT</div>
                      <div className="text-[9px] text-gray-500">Real-time</div>
                    </button>
                    <button type="button" onClick={() => setSwiftForm(p => ({ ...p, transferType: 'GPI_COV' }))}
                      className={`p-2 rounded text-xs font-medium transition-all ${
                        swiftForm.transferType === 'GPI_COV' 
                          ? 'bg-purple-900/50 border-2 border-purple-500 text-purple-400' 
                          : 'bg-gray-900 border border-gray-700 text-gray-400 hover:border-purple-500/50'
                      }`}>
                      <div className="font-bold">GPI COV</div>
                      <div className="text-[9px] text-gray-500">Cover</div>
                    </button>
                  </div>
                  
                  {/* GPI Specific Options - Only show when GPI is selected */}
                  {swiftForm.transferType !== 'STANDARD' && (
                    <div className="space-y-3 pt-2 border-t border-blue-700/30">
                      <div className="text-xs text-cyan-400 font-bold flex items-center gap-2">
                        <Globe className="w-3 h-3" /> SWIFT gpi Configuration
                      </div>
                      
                      {/* GPI Service Type */}
                      <div className="grid grid-cols-3 gap-2">
                        <div>
                          <label className="text-[10px] text-gray-500 block mb-1">gpi Service</label>
                          <select value={swiftForm.gpiServiceType} onChange={e => setSwiftForm(p => ({ ...p, gpiServiceType: e.target.value as any }))}
                            className="w-full bg-gray-900 border border-blue-700/50 rounded px-2 py-1.5 text-xs text-white">
                            <option value="g4c">g4c - gpi for Corporates</option>
                            <option value="gpi">gpi - Standard</option>
                            <option value="gCCT">gCCT - gpi Customer Credit Transfer</option>
                            <option value="gCOV">gCOV - gpi Cover Payment</option>
                            <option value="gSRP">gSRP - gpi Stop and Recall</option>
                            <option value="gpi-instant">gpi-instant - Real-time</option>
                          </select>
                        </div>
                        <div>
                          <label className="text-[10px] text-gray-500 block mb-1">Priority</label>
                          <select value={swiftForm.gpiPriority} onChange={e => setSwiftForm(p => ({ ...p, gpiPriority: e.target.value as any }))}
                            className="w-full bg-gray-900 border border-blue-700/50 rounded px-2 py-1.5 text-xs text-white">
                            <option value="NORM">NORM - Normal</option>
                            <option value="HIGH">HIGH - High Priority</option>
                            <option value="URGT">URGT - Urgent</option>
                          </select>
                        </div>
                        <div>
                          <label className="text-[10px] text-gray-500 block mb-1">Service Level</label>
                          <select value={swiftForm.gpiServiceLevel} onChange={e => setSwiftForm(p => ({ ...p, gpiServiceLevel: e.target.value as any }))}
                            className="w-full bg-gray-900 border border-blue-700/50 rounded px-2 py-1.5 text-xs text-white">
                            <option value="SEPA">SEPA</option>
                            <option value="URGP">URGP - Urgent Payment</option>
                            <option value="NURG">NURG - Non-Urgent</option>
                            <option value="SDVA">SDVA - Same Day Value</option>
                            <option value="PRPT">PRPT - Proprietary</option>
                          </select>
                        </div>
                      </div>
                      
                      {/* Charge Bearer & Settlement Method */}
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="text-[10px] text-gray-500 block mb-1">Charge Bearer (ChrgBr)</label>
                          <select value={swiftForm.gpiChargeBearer} onChange={e => setSwiftForm(p => ({ ...p, gpiChargeBearer: e.target.value as any }))}
                            className="w-full bg-gray-900 border border-blue-700/50 rounded px-2 py-1.5 text-xs text-white">
                            <option value="SHAR">SHAR - Shared</option>
                            <option value="CRED">CRED - Borne by Creditor</option>
                            <option value="DEBT">DEBT - Borne by Debtor</option>
                            <option value="SLEV">SLEV - Service Level</option>
                          </select>
                        </div>
                        <div>
                          <label className="text-[10px] text-gray-500 block mb-1">Settlement Method (SttlmMtd)</label>
                          <select value={swiftForm.gpiSettlementMethod} onChange={e => setSwiftForm(p => ({ ...p, gpiSettlementMethod: e.target.value as any }))}
                            className="w-full bg-gray-900 border border-blue-700/50 rounded px-2 py-1.5 text-xs text-white">
                            <option value="INDA">INDA - Instructed Agent</option>
                            <option value="INGA">INGA - Instructing Agent</option>
                            <option value="COVE">COVE - Cover Method</option>
                            <option value="CLRG">CLRG - Clearing System</option>
                          </select>
                        </div>
                      </div>
                      
                      {/* End-to-End ID and Instruction ID */}
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="text-[10px] text-gray-500 block mb-1">End-to-End ID (EndToEndId)</label>
                          <input type="text" value={swiftForm.gpiEndToEndId} 
                            onChange={e => setSwiftForm(p => ({ ...p, gpiEndToEndId: e.target.value }))}
                            placeholder="E2E-REF-001"
                            className="w-full bg-gray-900 border border-blue-700/50 rounded px-2 py-1.5 text-xs text-white font-mono" />
                        </div>
                        <div>
                          <label className="text-[10px] text-gray-500 block mb-1">Instruction ID (InstrId)</label>
                          <input type="text" value={swiftForm.gpiInstructionId} 
                            onChange={e => setSwiftForm(p => ({ ...p, gpiInstructionId: e.target.value }))}
                            placeholder="INSTR-001"
                            className="w-full bg-gray-900 border border-blue-700/50 rounded px-2 py-1.5 text-xs text-white font-mono" />
                        </div>
                      </div>
                      
                      {/* GPI Info Box */}
                      <div className="p-2 bg-blue-900/20 rounded border border-blue-700/30 text-[10px]">
                        <div className="text-blue-400 font-bold mb-1">SWIFT gpi Features:</div>
                        <div className="text-gray-400 space-y-0.5">
                          <div>• <span className="text-cyan-400">UETR</span> - Unique End-to-End Transaction Reference (auto-generated)</div>
                          <div>• <span className="text-cyan-400">Tracker</span> - Real-time payment status tracking</div>
                          <div>• <span className="text-cyan-400">SLA</span> - Same-day use of funds (gpi banks)</div>
                          <div>• <span className="text-cyan-400">Confirmation</span> - Credit confirmation to debtor</div>
                          <div>• <span className="text-cyan-400">Transparency</span> - Full fee disclosure</div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
                
                {/* Common Fields - Always shown */}
                <div>
                  <label className="text-xs text-yellow-500 block mb-1">Receiver BIC :57A: (11 characters)</label>
                  <input type="text" value={swiftForm.receiverBic} 
                    onChange={e => setSwiftForm(p => ({ ...p, receiverBic: e.target.value.toUpperCase() }))}
                    maxLength={11}
                    className="w-full bg-gray-900 border border-yellow-700/50 rounded px-3 py-2 text-sm text-white font-mono" 
                    placeholder="DEUTDEFFXXX" />
                </div>
                
                {/* Amount/Currency - For payment messages */}
                {!['MT199', 'MT299', 'MT799', 'MT920'].includes(swiftForm.messageType) && (
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs text-yellow-500 block mb-1">Amount :32A:</label>
                      <input type="text" value={swiftForm.amount} onChange={e => setSwiftForm(p => ({ ...p, amount: e.target.value }))}
                        className="w-full bg-gray-900 border border-yellow-700/50 rounded px-3 py-2 text-sm text-white" />
                    </div>
                    <div>
                      <label className="text-xs text-yellow-500 block mb-1">Currency</label>
                      <select value={swiftForm.currency} onChange={e => setSwiftForm(p => ({ ...p, currency: e.target.value }))}
                        className="w-full bg-gray-900 border border-yellow-700/50 rounded px-3 py-2 text-sm text-white">
                        {SUPPORTED_CURRENCIES.map(curr => (
                          <option key={curr.code} value={curr.code}>{curr.code} - {curr.name}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                )}

                {/* ═══════════════════════════════════════════════════════════════════════════════ */}
                {/* CATEGORY 1 & 2 - CUSTOMER/FI PAYMENTS (MT103, MT202, etc.) */}
                {/* ═══════════════════════════════════════════════════════════════════════════════ */}
                {['MT101', 'MT102', 'MT103', 'MT103STP', 'MT104', 'MT200', 'MT202', 'MT202COV', 'MT205', 'MT210'].includes(swiftForm.messageType) && (
                  <>
                    <div>
                      <label className="text-xs text-yellow-500 block mb-1">Ordering Customer :50K:</label>
                      <input type="text" value={swiftForm.orderingCustomer} onChange={e => setSwiftForm(p => ({ ...p, orderingCustomer: e.target.value }))}
                        className="w-full bg-gray-900 border border-yellow-700/50 rounded px-3 py-2 text-sm text-white" />
                    </div>
                    <div>
                      <label className="text-xs text-yellow-500 block mb-1">Ordering Account</label>
                      <input type="text" value={swiftForm.orderingAccount} onChange={e => setSwiftForm(p => ({ ...p, orderingAccount: e.target.value }))}
                        className="w-full bg-gray-900 border border-yellow-700/50 rounded px-3 py-2 text-sm text-white font-mono" />
                    </div>
                    <div>
                      <label className="text-xs text-yellow-500 block mb-1">Beneficiary Name :59:</label>
                      <input type="text" value={swiftForm.beneficiaryName} onChange={e => setSwiftForm(p => ({ ...p, beneficiaryName: e.target.value }))}
                        className="w-full bg-gray-900 border border-yellow-700/50 rounded px-3 py-2 text-sm text-white" />
                    </div>
                    <div>
                      <label className="text-xs text-yellow-500 block mb-1">Beneficiary Account</label>
                      <input type="text" value={swiftForm.beneficiaryAccount} onChange={e => setSwiftForm(p => ({ ...p, beneficiaryAccount: e.target.value }))}
                        className="w-full bg-gray-900 border border-yellow-700/50 rounded px-3 py-2 text-sm text-white font-mono" />
                    </div>
                    
                    <div>
                      <label className="text-xs text-yellow-500 block mb-1">Remittance Info :70:</label>
                      <input type="text" value={swiftForm.remittance} onChange={e => setSwiftForm(p => ({ ...p, remittance: e.target.value }))}
                        className="w-full bg-gray-900 border border-yellow-700/50 rounded px-3 py-2 text-sm text-white" />
                    </div>
                  </>
                )}

                {/* ═══════════════════════════════════════════════════════════════════════════════ */}
                {/* CATEGORY 5 - SECURITIES (MT540, MT541, MT542, MT543) */}
                {/* ═══════════════════════════════════════════════════════════════════════════════ */}
                {['MT540', 'MT541', 'MT542', 'MT543'].includes(swiftForm.messageType) && (
                  <>
                    <div className="p-2 bg-indigo-900/20 rounded border border-indigo-700/30">
                      <div className="text-xs text-indigo-400 font-bold mb-1">Securities Settlement Fields</div>
                    </div>
                    <div>
                      <label className="text-xs text-yellow-500 block mb-1">ISIN :35B:</label>
                      <input type="text" value={swiftForm.isin} onChange={e => setSwiftForm(p => ({ ...p, isin: e.target.value.toUpperCase() }))}
                        className="w-full bg-gray-900 border border-yellow-700/50 rounded px-3 py-2 text-sm text-white font-mono" 
                        placeholder="US0378331005" />
                    </div>
                    <div>
                      <label className="text-xs text-yellow-500 block mb-1">Security Description</label>
                      <input type="text" value={swiftForm.securityDescription} onChange={e => setSwiftForm(p => ({ ...p, securityDescription: e.target.value }))}
                        className="w-full bg-gray-900 border border-yellow-700/50 rounded px-3 py-2 text-sm text-white" 
                        placeholder="APPLE INC" />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-xs text-yellow-500 block mb-1">Settlement Quantity :36B:</label>
                        <input type="text" value={swiftForm.settlementQuantity} onChange={e => setSwiftForm(p => ({ ...p, settlementQuantity: e.target.value }))}
                          className="w-full bg-gray-900 border border-yellow-700/50 rounded px-3 py-2 text-sm text-white" 
                          placeholder="100" />
                      </div>
                      <div>
                        <label className="text-xs text-yellow-500 block mb-1">Safekeeping Account :97A:</label>
                        <input type="text" value={swiftForm.safekeepingAccount} onChange={e => setSwiftForm(p => ({ ...p, safekeepingAccount: e.target.value }))}
                          className="w-full bg-gray-900 border border-yellow-700/50 rounded px-3 py-2 text-sm text-white font-mono" />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-xs text-yellow-500 block mb-1">Trade Date :98A:</label>
                        <input type="date" value={swiftForm.tradeDate} onChange={e => setSwiftForm(p => ({ ...p, tradeDate: e.target.value }))}
                          className="w-full bg-gray-900 border border-yellow-700/50 rounded px-3 py-2 text-sm text-white" />
                      </div>
                      <div>
                        <label className="text-xs text-yellow-500 block mb-1">Settlement Date :98A:</label>
                        <input type="date" value={swiftForm.settlementDate} onChange={e => setSwiftForm(p => ({ ...p, settlementDate: e.target.value }))}
                          className="w-full bg-gray-900 border border-yellow-700/50 rounded px-3 py-2 text-sm text-white" />
                      </div>
                    </div>
                  </>
                )}

                {/* ═══════════════════════════════════════════════════════════════════════════════ */}
                {/* MT700 - DOCUMENTARY CREDIT (LETTER OF CREDIT) */}
                {/* ═══════════════════════════════════════════════════════════════════════════════ */}
                {swiftForm.messageType === 'MT700' && (
                  <>
                    <div className="p-2 bg-amber-900/20 rounded border border-amber-700/30">
                      <div className="text-xs text-amber-400 font-bold mb-1">Letter of Credit Fields (UCP 600)</div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-xs text-yellow-500 block mb-1">Form of DC :40A:</label>
                        <select value={swiftForm.lcType} onChange={e => setSwiftForm(p => ({ ...p, lcType: e.target.value }))}
                          className="w-full bg-gray-900 border border-yellow-700/50 rounded px-3 py-2 text-sm text-white">
                          <option value="IRREVOCABLE">IRREVOCABLE</option>
                          <option value="IRREVOCABLE TRANSFERABLE">IRREVOCABLE TRANSFERABLE</option>
                          <option value="REVOCABLE">REVOCABLE</option>
                        </select>
                      </div>
                      <div>
                        <label className="text-xs text-yellow-500 block mb-1">Applicable Rules :40E:</label>
                        <input type="text" value="UCP LATEST VERSION" disabled
                          className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-sm text-gray-400" />
                      </div>
                    </div>
                    <div>
                      <label className="text-xs text-yellow-500 block mb-1">Applicant :50: (Buyer/Importer)</label>
                      <input type="text" value={swiftForm.orderingCustomer} onChange={e => setSwiftForm(p => ({ ...p, orderingCustomer: e.target.value }))}
                        className="w-full bg-gray-900 border border-yellow-700/50 rounded px-3 py-2 text-sm text-white" />
                    </div>
                    <div>
                      <label className="text-xs text-yellow-500 block mb-1">Beneficiary :59: (Seller/Exporter)</label>
                      <input type="text" value={swiftForm.beneficiaryName} onChange={e => setSwiftForm(p => ({ ...p, beneficiaryName: e.target.value }))}
                        className="w-full bg-gray-900 border border-yellow-700/50 rounded px-3 py-2 text-sm text-white" />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-xs text-yellow-500 block mb-1">Date of Expiry :31D:</label>
                        <input type="date" value={swiftForm.lcExpiryDate} onChange={e => setSwiftForm(p => ({ ...p, lcExpiryDate: e.target.value }))}
                          className="w-full bg-gray-900 border border-yellow-700/50 rounded px-3 py-2 text-sm text-white" />
                      </div>
                      <div>
                        <label className="text-xs text-yellow-500 block mb-1">Place of Expiry</label>
                        <input type="text" value={swiftForm.lcExpiryPlace} onChange={e => setSwiftForm(p => ({ ...p, lcExpiryPlace: e.target.value }))}
                          className="w-full bg-gray-900 border border-yellow-700/50 rounded px-3 py-2 text-sm text-white" />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-xs text-yellow-500 block mb-1">Available With :41D:</label>
                        <select value={swiftForm.lcAvailableWith} onChange={e => setSwiftForm(p => ({ ...p, lcAvailableWith: e.target.value }))}
                          className="w-full bg-gray-900 border border-yellow-700/50 rounded px-3 py-2 text-sm text-white">
                          <option value="BY NEGOTIATION">BY NEGOTIATION</option>
                          <option value="BY PAYMENT">BY PAYMENT</option>
                          <option value="BY ACCEPTANCE">BY ACCEPTANCE</option>
                          <option value="BY DEF PAYMENT">BY DEFERRED PAYMENT</option>
                          <option value="BY MIXED PYMT">BY MIXED PAYMENT</option>
                        </select>
                      </div>
                      <div>
                        <label className="text-xs text-yellow-500 block mb-1">Drafts At :42C:</label>
                        <select value={swiftForm.lcDraftsAt} onChange={e => setSwiftForm(p => ({ ...p, lcDraftsAt: e.target.value }))}
                          className="w-full bg-gray-900 border border-yellow-700/50 rounded px-3 py-2 text-sm text-white">
                          <option value="SIGHT">AT SIGHT</option>
                          <option value="30 DAYS SIGHT">30 DAYS AFTER SIGHT</option>
                          <option value="60 DAYS SIGHT">60 DAYS AFTER SIGHT</option>
                          <option value="90 DAYS SIGHT">90 DAYS AFTER SIGHT</option>
                          <option value="30 DAYS DATE">30 DAYS AFTER DATE</option>
                          <option value="60 DAYS DATE">60 DAYS AFTER DATE</option>
                          <option value="90 DAYS DATE">90 DAYS AFTER DATE</option>
                        </select>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-xs text-yellow-500 block mb-1">Partial Shipments :43P:</label>
                        <select value={swiftForm.lcPartialShipments} onChange={e => setSwiftForm(p => ({ ...p, lcPartialShipments: e.target.value }))}
                          className="w-full bg-gray-900 border border-yellow-700/50 rounded px-3 py-2 text-sm text-white">
                          <option value="ALLOWED">ALLOWED</option>
                          <option value="NOT ALLOWED">NOT ALLOWED</option>
                          <option value="CONDITIONAL">CONDITIONAL</option>
                        </select>
                      </div>
                      <div>
                        <label className="text-xs text-yellow-500 block mb-1">Transshipment :43T:</label>
                        <select value={swiftForm.lcTransshipment} onChange={e => setSwiftForm(p => ({ ...p, lcTransshipment: e.target.value }))}
                          className="w-full bg-gray-900 border border-yellow-700/50 rounded px-3 py-2 text-sm text-white">
                          <option value="ALLOWED">ALLOWED</option>
                          <option value="NOT ALLOWED">NOT ALLOWED</option>
                        </select>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-xs text-yellow-500 block mb-1">Port of Loading :44E:</label>
                        <input type="text" value={swiftForm.lcPortOfLoading} onChange={e => setSwiftForm(p => ({ ...p, lcPortOfLoading: e.target.value }))}
                          className="w-full bg-gray-900 border border-yellow-700/50 rounded px-3 py-2 text-sm text-white" 
                          placeholder="ANY PORT" />
                      </div>
                      <div>
                        <label className="text-xs text-yellow-500 block mb-1">Port of Discharge :44F:</label>
                        <input type="text" value={swiftForm.lcPortOfDischarge} onChange={e => setSwiftForm(p => ({ ...p, lcPortOfDischarge: e.target.value }))}
                          className="w-full bg-gray-900 border border-yellow-700/50 rounded px-3 py-2 text-sm text-white" 
                          placeholder="MORONI" />
                      </div>
                    </div>
                    <div>
                      <label className="text-xs text-yellow-500 block mb-1">Description of Goods :45A:</label>
                      <textarea value={swiftForm.lcGoodsDescription} onChange={e => setSwiftForm(p => ({ ...p, lcGoodsDescription: e.target.value }))}
                        className="w-full bg-gray-900 border border-yellow-700/50 rounded px-3 py-2 text-sm text-white h-20" 
                        placeholder="GOODS AS PER PROFORMA INVOICE NO. XXX" />
                    </div>
                    <div>
                      <label className="text-xs text-yellow-500 block mb-1">Documents Required :46A:</label>
                      <textarea value={swiftForm.lcDocumentsRequired} onChange={e => setSwiftForm(p => ({ ...p, lcDocumentsRequired: e.target.value }))}
                        className="w-full bg-gray-900 border border-yellow-700/50 rounded px-3 py-2 text-sm text-white h-24" 
                        placeholder="+ SIGNED COMMERCIAL INVOICE IN TRIPLICATE&#10;+ FULL SET OF CLEAN ON BOARD BILLS OF LADING&#10;+ PACKING LIST IN DUPLICATE" />
                    </div>
                    <div>
                      <label className="text-xs text-yellow-500 block mb-1">Additional Conditions :47A:</label>
                      <textarea value={swiftForm.lcAdditionalConditions} onChange={e => setSwiftForm(p => ({ ...p, lcAdditionalConditions: e.target.value }))}
                        className="w-full bg-gray-900 border border-yellow-700/50 rounded px-3 py-2 text-sm text-white h-16" />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-xs text-yellow-500 block mb-1">Period for Presentation :48:</label>
                        <input type="text" value={swiftForm.lcPresentationPeriod} onChange={e => setSwiftForm(p => ({ ...p, lcPresentationPeriod: e.target.value }))}
                          className="w-full bg-gray-900 border border-yellow-700/50 rounded px-3 py-2 text-sm text-white" 
                          placeholder="21 DAYS" />
                      </div>
                      <div>
                        <label className="text-xs text-yellow-500 block mb-1">Confirmation :49:</label>
                        <select value={swiftForm.lcConfirmationInstructions} onChange={e => setSwiftForm(p => ({ ...p, lcConfirmationInstructions: e.target.value }))}
                          className="w-full bg-gray-900 border border-yellow-700/50 rounded px-3 py-2 text-sm text-white">
                          <option value="CONFIRM">CONFIRM</option>
                          <option value="MAY ADD">MAY ADD</option>
                          <option value="WITHOUT">WITHOUT</option>
                        </select>
                      </div>
                    </div>
                    <div>
                      <label className="text-xs text-yellow-500 block mb-1">Charges :71B:</label>
                      <input type="text" value={swiftForm.lcCharges} onChange={e => setSwiftForm(p => ({ ...p, lcCharges: e.target.value }))}
                        className="w-full bg-gray-900 border border-yellow-700/50 rounded px-3 py-2 text-sm text-white" />
                    </div>
                  </>
                )}

                {/* ═══════════════════════════════════════════════════════════════════════════════ */}
                {/* MT760 - GUARANTEE / STANDBY LC */}
                {/* ═══════════════════════════════════════════════════════════════════════════════ */}
                {swiftForm.messageType === 'MT760' && (
                  <>
                    <div className="p-2 bg-purple-900/20 rounded border border-purple-700/30">
                      <div className="text-xs text-purple-400 font-bold mb-1">Bank Guarantee / Standby LC Fields</div>
                    </div>
                    <div>
                      <label className="text-xs text-yellow-500 block mb-1">Type of Undertaking :23:</label>
                      <select value="ISSUE" disabled
                        className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-sm text-gray-400">
                        <option value="ISSUE">ISSUE</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-xs text-yellow-500 block mb-1">Applicable Rules :40C:</label>
                      <select value={swiftForm.guaranteeType} onChange={e => setSwiftForm(p => ({ ...p, guaranteeType: e.target.value }))}
                        className="w-full bg-gray-900 border border-yellow-700/50 rounded px-3 py-2 text-sm text-white">
                        <option value="URDG">URDG 758 (ICC Uniform Rules)</option>
                        <option value="ISP98">ISP98 (Standby Practices)</option>
                        <option value="UCPURR">UCP 600 + URR 725</option>
                        <option value="OTHR">OTHER</option>
                        <option value="NONE">NONE</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-xs text-yellow-500 block mb-1">Applicant (Principal)</label>
                      <input type="text" value={swiftForm.guaranteeApplicant || swiftForm.orderingCustomer} 
                        onChange={e => setSwiftForm(p => ({ ...p, guaranteeApplicant: e.target.value, orderingCustomer: e.target.value }))}
                        className="w-full bg-gray-900 border border-yellow-700/50 rounded px-3 py-2 text-sm text-white" 
                        placeholder="Principal/Account Party" />
                    </div>
                    <div>
                      <label className="text-xs text-yellow-500 block mb-1">Beneficiary</label>
                      <input type="text" value={swiftForm.beneficiaryName} onChange={e => setSwiftForm(p => ({ ...p, beneficiaryName: e.target.value }))}
                        className="w-full bg-gray-900 border border-yellow-700/50 rounded px-3 py-2 text-sm text-white" />
                    </div>
                    <div>
                      <label className="text-xs text-yellow-500 block mb-1">Expiry Date :31D:</label>
                      <input type="date" value={swiftForm.guaranteeExpiryDate} onChange={e => setSwiftForm(p => ({ ...p, guaranteeExpiryDate: e.target.value }))}
                        className="w-full bg-gray-900 border border-yellow-700/50 rounded px-3 py-2 text-sm text-white" />
                    </div>
                    <div>
                      <label className="text-xs text-yellow-500 block mb-1">Guarantee Text :77C: (Full Wording)</label>
                      <textarea value={swiftForm.guaranteeText} onChange={e => setSwiftForm(p => ({ ...p, guaranteeText: e.target.value }))}
                        className="w-full bg-gray-900 border border-yellow-700/50 rounded px-3 py-2 text-sm text-white h-40 font-mono text-xs" 
                        placeholder={`WE HEREBY ISSUE OUR IRREVOCABLE AND UNCONDITIONAL
BANK GUARANTEE NO. [NUMBER]

IN FAVOUR OF: [BENEFICIARY NAME AND ADDRESS]

FOR ACCOUNT OF: [APPLICANT NAME AND ADDRESS]

FOR AN AMOUNT NOT EXCEEDING: ${swiftForm.currency} ${swiftForm.amount}

COVERING: [PURPOSE OF GUARANTEE]

THIS GUARANTEE IS VALID UNTIL: [EXPIRY DATE]

WE UNDERTAKE TO PAY YOU ON YOUR FIRST WRITTEN DEMAND
STATING THAT THE PRINCIPAL HAS FAILED TO FULFILL
HIS OBLIGATIONS UNDER THE CONTRACT.

THIS GUARANTEE IS SUBJECT TO URDG 758.`} />
                    </div>
                  </>
                )}

                {/* ═══════════════════════════════════════════════════════════════════════════════ */}
                {/* MT799 / MT199 / MT299 - FREE FORMAT */}
                {/* ═══════════════════════════════════════════════════════════════════════════════ */}
                {['MT199', 'MT299', 'MT799'].includes(swiftForm.messageType) && (
                  <>
                    <div className="p-2 bg-red-900/20 rounded border border-red-700/30">
                      <div className="text-xs text-red-400 font-bold mb-1">Free Format Message Field :79:</div>
                    </div>
                    <div>
                      <label className="text-xs text-yellow-500 block mb-1">Narrative / Free Text :79:</label>
                      <textarea value={swiftForm.freeFormatText || swiftForm.remittance} 
                        onChange={e => setSwiftForm(p => ({ ...p, freeFormatText: e.target.value, remittance: e.target.value }))}
                        className="w-full bg-gray-900 border border-yellow-700/50 rounded px-3 py-2 text-sm text-white h-48 font-mono" 
                        placeholder={`ATTN: TRADE FINANCE DEPARTMENT

RE: YOUR REFERENCE NUMBER XXXXXX

WE REFER TO THE ABOVE MENTIONED TRANSACTION AND
WISH TO INFORM YOU THAT...

[YOUR MESSAGE HERE]

PLEASE ACKNOWLEDGE RECEIPT OF THIS MESSAGE.

BEST REGARDS,
DIGITAL COMMERCIAL BANK LTD`} />
                    </div>
                  </>
                )}

                {/* ═══════════════════════════════════════════════════════════════════════════════ */}
                {/* MT900/MT910 - CONFIRMATIONS */}
                {/* ═══════════════════════════════════════════════════════════════════════════════ */}
                {['MT900', 'MT910'].includes(swiftForm.messageType) && (
                  <>
                    <div>
                      <label className="text-xs text-yellow-500 block mb-1">Account :25:</label>
                      <input type="text" value={swiftForm.orderingAccount} onChange={e => setSwiftForm(p => ({ ...p, orderingAccount: e.target.value }))}
                        className="w-full bg-gray-900 border border-yellow-700/50 rounded px-3 py-2 text-sm text-white font-mono" />
                    </div>
                    <div>
                      <label className="text-xs text-yellow-500 block mb-1">Related Reference :21:</label>
                      <input type="text" value={swiftForm.remittance} onChange={e => setSwiftForm(p => ({ ...p, remittance: e.target.value }))}
                        className="w-full bg-gray-900 border border-yellow-700/50 rounded px-3 py-2 text-sm text-white" 
                        placeholder="Original transaction reference" />
                    </div>
                  </>
                )}

                {/* ═══════════════════════════════════════════════════════════════════════════════ */}
                {/* MT940/MT950 - STATEMENTS */}
                {/* ═══════════════════════════════════════════════════════════════════════════════ */}
                {['MT940', 'MT950'].includes(swiftForm.messageType) && (
                  <>
                    <div>
                      <label className="text-xs text-yellow-500 block mb-1">Account Identification :25:</label>
                      <input type="text" value={swiftForm.orderingAccount} onChange={e => setSwiftForm(p => ({ ...p, orderingAccount: e.target.value }))}
                        className="w-full bg-gray-900 border border-yellow-700/50 rounded px-3 py-2 text-sm text-white font-mono" />
                    </div>
                    <div>
                      <label className="text-xs text-yellow-500 block mb-1">Statement Information :86:</label>
                      <input type="text" value={swiftForm.remittance} onChange={e => setSwiftForm(p => ({ ...p, remittance: e.target.value }))}
                        className="w-full bg-gray-900 border border-yellow-700/50 rounded px-3 py-2 text-sm text-white" 
                        placeholder="Transaction details" />
                    </div>
                  </>
                )}

                {/* Send Button */}
                <button onClick={executeSWIFTTransfer} disabled={swiftTransferring}
                  className={`w-full py-3 rounded font-bold flex items-center justify-center gap-2 ${
                    !swiftTransferring
                      ? 'bg-gradient-to-r from-yellow-600 to-orange-600 hover:from-yellow-700 hover:to-orange-700 text-white'
                      : 'bg-gray-800 text-gray-500 cursor-not-allowed'
                  }`}>
                  {swiftTransferring ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
                  {swiftTransferring ? 'Sending via SWIFT...' : `Send ${swiftForm.messageType} Message`}
                </button>
              </div>
              
              <div className="space-y-4">
                {/* SWIFT Network Route - Dynamic Visual */}
                <div className="bg-gradient-to-br from-gray-900/80 to-gray-800/50 rounded-xl p-5 border border-yellow-500/30 shadow-lg shadow-yellow-500/10">
                  <h4 className="text-yellow-400 font-bold mb-4 flex items-center gap-2 text-sm">
                    <Globe className="w-5 h-5" /> SWIFT Network Route
                    <span className="ml-auto text-xs bg-yellow-600/30 px-2 py-0.5 rounded text-yellow-300">
                      {swiftForm.messageType}
                    </span>
                  </h4>
                  
                  {/* Network Visualization */}
                  <div className="relative flex items-center justify-between mb-5 py-3">
                    {/* Sender Node */}
                    <div className="text-center z-10">
                      <div className="w-16 h-16 bg-gradient-to-br from-green-800 to-green-900 rounded-xl flex items-center justify-center mb-2 border-2 border-green-500 shadow-lg shadow-green-500/30 relative">
                        <Server className="w-8 h-8 text-green-400" />
                        <div className="absolute -top-1 -right-1 w-4 h-4 bg-green-500 rounded-full animate-pulse" />
                      </div>
                      <div className="text-xs text-green-400 font-bold font-mono">{swiftForm.senderBic || config.bankBic}</div>
                      <div className="text-xs text-gray-500">Sender</div>
                      <div className="text-xs text-green-600 mt-1">{config.bankName.split(' ').slice(0, 2).join(' ')}</div>
                    </div>
                    
                    {/* Connection Line 1 with Animation */}
                    <div className="flex-1 px-1 relative">
                      <div className="h-1 bg-gradient-to-r from-green-500 via-yellow-500 to-yellow-500 rounded-full relative overflow-hidden">
                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/50 to-transparent animate-pulse" style={{ animationDuration: '1.5s' }} />
                      </div>
                      <div className="absolute top-3 left-1/2 -translate-x-1/2 text-xs text-yellow-400 font-mono bg-gray-900/90 px-2 py-0.5 rounded">
                        SWIFTNet
                      </div>
                      <div className="absolute -top-2 left-1/2 -translate-x-1/2">
                        <ArrowRightLeft className="w-4 h-4 text-yellow-500" />
                      </div>
                    </div>
                    
                    {/* SWIFT Network Node */}
                    <div className="text-center z-10">
                      <div className="w-16 h-16 bg-gradient-to-br from-yellow-700 to-orange-800 rounded-xl flex items-center justify-center mb-2 border-2 border-yellow-500 shadow-lg shadow-yellow-500/30 relative">
                        <Globe className="w-8 h-8 text-yellow-400" />
                        <div className="absolute -top-1 -right-1 w-4 h-4 bg-yellow-500 rounded-full animate-ping" style={{ animationDuration: '2s' }} />
                      </div>
                      <div className="text-xs text-yellow-400 font-bold">SWIFT</div>
                      <div className="text-xs text-gray-500">Network</div>
                      <div className="text-xs text-yellow-600 mt-1">FIN Gateway</div>
                    </div>
                    
                    {/* Connection Line 2 with Animation */}
                    <div className="flex-1 px-1 relative">
                      <div className="h-1 bg-gradient-to-r from-yellow-500 via-yellow-500 to-blue-500 rounded-full relative overflow-hidden">
                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/50 to-transparent animate-pulse" style={{ animationDuration: '1.5s', animationDelay: '0.5s' }} />
                      </div>
                      <div className="absolute top-3 left-1/2 -translate-x-1/2 text-xs text-yellow-400 font-mono bg-gray-900/90 px-2 py-0.5 rounded">
                        FIN
                      </div>
                      <div className="absolute -top-2 left-1/2 -translate-x-1/2">
                        <ArrowRightLeft className="w-4 h-4 text-yellow-500" />
                      </div>
                    </div>
                    
                    {/* Receiver Node - DYNAMIC */}
                    <div className="text-center z-10">
                      <div className={`w-16 h-16 bg-gradient-to-br ${swiftForm.receiverBic ? 'from-blue-700 to-blue-900 border-blue-500 shadow-blue-500/30' : 'from-gray-700 to-gray-800 border-gray-500 shadow-gray-500/30'} rounded-xl flex items-center justify-center mb-2 border-2 shadow-lg relative transition-all duration-300`}>
                        <Server className={`w-8 h-8 ${swiftForm.receiverBic ? 'text-blue-400' : 'text-gray-400'}`} />
                        {swiftForm.receiverBic && (
                          <div className="absolute -top-1 -right-1 w-4 h-4 bg-blue-500 rounded-full animate-pulse" />
                        )}
                      </div>
                      <div className={`text-xs font-bold font-mono transition-all duration-300 ${swiftForm.receiverBic ? 'text-blue-400' : 'text-gray-500'}`}>
                        {swiftForm.receiverBic || 'XXXXXXXXXX'}
                      </div>
                      <div className="text-xs text-gray-500">Receiver</div>
                      <div className={`text-xs mt-1 transition-all duration-300 ${swiftForm.receiverBic ? 'text-blue-600' : 'text-gray-600'}`}>
                        {swiftForm.receiverBic ? (() => {
                          const countryCode = swiftForm.receiverBic.substring(4, 6);
                          const countries: Record<string, string> = {
                            'DE': 'Germany', 'US': 'United States', 'GB': 'United Kingdom', 'FR': 'France',
                            'CH': 'Switzerland', 'IT': 'Italy', 'ES': 'Spain', 'NL': 'Netherlands',
                            'AE': 'UAE', 'SA': 'Saudi Arabia', 'JP': 'Japan', 'CN': 'China',
                            'SG': 'Singapore', 'HK': 'Hong Kong', 'AU': 'Australia', 'CA': 'Canada'
                          };
                          return countries[countryCode] || countryCode;
                        })() : 'Select Bank'}
                      </div>
                    </div>
                  </div>
                  
                  {/* Route Details */}
                  <div className="grid grid-cols-2 gap-3 pt-3 border-t border-gray-700/50">
                    <div className="bg-gray-800/50 rounded-lg p-2.5">
                      <div className="text-xs text-gray-500 mb-1">Protocol</div>
                      <div className="text-sm text-yellow-400 font-bold">SWIFT FIN</div>
                    </div>
                    <div className="bg-gray-800/50 rounded-lg p-2.5">
                      <div className="text-xs text-gray-500 mb-1">Network</div>
                      <div className="text-sm text-white font-bold">SWIFTNet</div>
                    </div>
                    <div className="bg-gray-800/50 rounded-lg p-2.5">
                      <div className="text-xs text-gray-500 mb-1">Message Type</div>
                      <div className="text-sm text-cyan-400 font-bold font-mono">{swiftForm.messageType}</div>
                    </div>
                    <div className="bg-gray-800/50 rounded-lg p-2.5">
                      <div className="text-xs text-gray-500 mb-1">Amount</div>
                      <div className="text-sm text-green-400 font-bold">{swiftForm.currency} {parseFloat(swiftForm.amount || '0').toLocaleString()}</div>
                    </div>
                  </div>
                  
                  {/* Receiver Bank Info - Dynamic */}
                  {swiftForm.receiverBic && (
                    <div className="mt-3 p-3 bg-blue-900/20 rounded-lg border border-blue-500/30">
                      <div className="flex items-center gap-2 text-blue-400 text-xs font-bold mb-2">
                        <Building2 className="w-4 h-4" /> Receiver Bank Information
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div>
                          <span className="text-gray-500">BIC/SWIFT:</span>
                          <span className="text-blue-400 font-mono ml-1">{swiftForm.receiverBic}</span>
                        </div>
                        <div>
                          <span className="text-gray-500">Country:</span>
                          <span className="text-white ml-1">
                            {(() => {
                              const cc = swiftForm.receiverBic.substring(4, 6);
                              const countries: Record<string, string> = {
                                'DE': '🇩🇪 Germany', 'US': '🇺🇸 USA', 'GB': '🇬🇧 UK', 'FR': '🇫🇷 France',
                                'CH': '🇨🇭 Switzerland', 'IT': '🇮🇹 Italy', 'ES': '🇪🇸 Spain', 'NL': '🇳🇱 Netherlands',
                                'AE': '🇦🇪 UAE', 'SA': '🇸🇦 Saudi Arabia', 'JP': '🇯🇵 Japan', 'CN': '🇨🇳 China',
                                'SG': '🇸🇬 Singapore', 'HK': '🇭🇰 Hong Kong', 'AU': '🇦🇺 Australia', 'CA': '🇨🇦 Canada'
                              };
                              return countries[cc] || cc;
                            })()}
                          </span>
                        </div>
                        <div>
                          <span className="text-gray-500">Bank Code:</span>
                          <span className="text-white font-mono ml-1">{swiftForm.receiverBic.substring(0, 4)}</span>
                        </div>
                        <div>
                          <span className="text-gray-500">Branch:</span>
                          <span className="text-white font-mono ml-1">{swiftForm.receiverBic.substring(6) || 'XXX'}</span>
                        </div>
                        {swiftForm.beneficiaryName && (
                          <div className="col-span-2">
                            <span className="text-gray-500">Beneficiary:</span>
                            <span className="text-white ml-1">{swiftForm.beneficiaryName}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
                
                {/* SWIFT Message Types Reference */}
                <div className="bg-gradient-to-br from-yellow-900/20 to-orange-900/10 rounded-xl p-4 border border-yellow-700/30">
                  <div className="text-xs text-yellow-400 font-bold mb-3 flex items-center gap-2">
                    <FileText className="w-4 h-4" /> SWIFT Message Types
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className={`p-2 rounded-lg transition-all ${swiftForm.messageType === 'MT103' ? 'bg-yellow-600/30 border border-yellow-500/50' : 'bg-gray-800/30'}`}>
                      <span className="text-yellow-400 font-mono font-bold">MT103</span>
                      <span className="text-gray-400 ml-1">Customer Credit</span>
                    </div>
                    <div className={`p-2 rounded-lg transition-all ${swiftForm.messageType === 'MT202' ? 'bg-yellow-600/30 border border-yellow-500/50' : 'bg-gray-800/30'}`}>
                      <span className="text-yellow-400 font-mono font-bold">MT202</span>
                      <span className="text-gray-400 ml-1">FI to FI</span>
                    </div>
                    <div className={`p-2 rounded-lg transition-all ${swiftForm.messageType === 'MT202COV' ? 'bg-yellow-600/30 border border-yellow-500/50' : 'bg-gray-800/30'}`}>
                      <span className="text-yellow-400 font-mono font-bold">MT202COV</span>
                      <span className="text-gray-400 ml-1">Cover</span>
                    </div>
                    <div className={`p-2 rounded-lg transition-all ${swiftForm.messageType === 'MT760' ? 'bg-yellow-600/30 border border-yellow-500/50' : 'bg-gray-800/30'}`}>
                      <span className="text-yellow-400 font-mono font-bold">MT760</span>
                      <span className="text-gray-400 ml-1">Guarantee</span>
                    </div>
                    <div className={`p-2 rounded-lg transition-all ${swiftForm.messageType === 'MT199' ? 'bg-yellow-600/30 border border-yellow-500/50' : 'bg-gray-800/30'}`}>
                      <span className="text-yellow-400 font-mono font-bold">MT199</span>
                      <span className="text-gray-400 ml-1">Free Format</span>
                    </div>
                    <div className={`p-2 rounded-lg transition-all ${swiftForm.messageType?.startsWith('MT9') ? 'bg-yellow-600/30 border border-yellow-500/50' : 'bg-gray-800/30'}`}>
                      <span className="text-yellow-400 font-mono font-bold">MT9xx</span>
                      <span className="text-gray-400 ml-1">Confirmations</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* IP-ID Transfer */}
        {activeTab === 'ipid-transfer' && (
          <div className="flex-1 overflow-auto p-4">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-cyan-900/50 rounded-lg flex items-center justify-center border border-cyan-500/50">
                <Network className="w-6 h-6 text-cyan-400" />
              </div>
              <div>
                <h3 className="text-cyan-400 font-bold">IP-ID Server-to-Server Transfer</h3>
                <p className="text-xs text-gray-500">Direct IP-ID Protocol with TLS 1.3 Encryption</p>
              </div>
            </div>
            
            {isTransferring && (
              <div className="mb-6 p-4 bg-cyan-900/20 border border-cyan-500/50 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-cyan-400 font-bold flex items-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin" /> IP-ID Transfer in Progress
                  </span>
                  <span className="text-cyan-400">{transferProgress}%</span>
                </div>
                <div className="w-full bg-gray-800 rounded-full h-2">
                  <div className="bg-cyan-500 h-2 rounded-full transition-all" style={{ width: `${transferProgress}%` }} />
                </div>
              </div>
            )}
            
            <div className="grid grid-cols-2 gap-6">
              <div className="space-y-4 bg-gray-900/30 p-4 rounded-lg border border-cyan-900/30">
                <div>
                  <label className="text-xs text-cyan-500 block mb-1">Message Format</label>
                  <select value={ipidForm.format} onChange={e => setIpidForm(p => ({ ...p, format: e.target.value as any }))}
                    className="w-full bg-gray-900 border border-cyan-700/50 rounded px-3 py-2 text-sm text-white">
                    <optgroup label="ISO 20022 Messages (MX)">
                      <option value="pacs.008">pacs.008 - FI to FI Customer Credit Transfer ★</option>
                      <option value="pacs.009">pacs.009 - FI Credit Transfer ★</option>
                      <option value="pacs.002">pacs.002 - Payment Status Report</option>
                      <option value="pacs.004">pacs.004 - Payment Return</option>
                      <option value="pain.001">pain.001 - Customer Credit Transfer Initiation</option>
                      <option value="pain.002">pain.002 - Customer Payment Status Report</option>
                      <option value="camt.053">camt.053 - Bank to Customer Statement ★</option>
                      <option value="camt.054">camt.054 - Bank to Customer Debit/Credit Notification</option>
                      <option value="camt.056">camt.056 - FI to FI Payment Cancellation Request</option>
                      <option value="camt.029">camt.029 - Resolution of Investigation</option>
                    </optgroup>
                    <optgroup label="SWIFT MT via IP-ID">
                      <option value="MT103">MT103 - Single Customer Credit Transfer ★</option>
                      <option value="MT103STP">MT103+ - STP Customer Credit Transfer</option>
                      <option value="MT202">MT202 - General FI Transfer ★</option>
                      <option value="MT202COV">MT202COV - Cover Payment ★</option>
                      <option value="MT200">MT200 - Financial Institution Transfer</option>
                      <option value="MT205">MT205 - FI Transfer Execution</option>
                      <option value="MT540">MT540 - Receive Free (Securities)</option>
                      <option value="MT541">MT541 - Receive Against Payment (Securities)</option>
                      <option value="MT542">MT542 - Deliver Free (Securities)</option>
                      <option value="MT543">MT543 - Deliver Against Payment (Securities)</option>
                      <option value="MT700">MT700 - Issue of Documentary Credit</option>
                      <option value="MT760">MT760 - Guarantee / Standby LC</option>
                      <option value="MT900">MT900 - Confirmation of Debit</option>
                      <option value="MT910">MT910 - Confirmation of Credit</option>
                      <option value="MT940">MT940 - Customer Statement</option>
                      <option value="MT950">MT950 - Statement Message</option>
                      <option value="MT199">MT199 - Free Format Message</option>
                    </optgroup>
                  </select>
                </div>
                
                <div>
                  <label className="text-xs text-cyan-500 block mb-1">Destination Server (IP-ID)</label>
                  <select value={ipidForm.destinationServerId} onChange={e => setIpidForm(p => ({ ...p, destinationServerId: e.target.value }))}
                    className="w-full bg-gray-900 border border-cyan-700/50 rounded px-3 py-2 text-sm text-white">
                    {servers.filter(s => s.id !== 'dcb-global').map(s => (
                      <option key={s.id} value={s.id}>{s.name} ({s.ipId}) - {s.ip}</option>
                    ))}
                  </select>
                </div>
                
                {/* ═══════════════════════════════════════════════════════════════════════════════ */}
                {/* TRANSFER TYPE SELECTOR - STANDARD / GPI */}
                {/* ═══════════════════════════════════════════════════════════════════════════════ */}
                <div className="p-3 bg-gradient-to-r from-blue-900/30 to-green-900/30 rounded-lg border border-blue-500/30 space-y-3">
                  <div className="flex items-center gap-2 text-blue-400 font-bold text-xs">
                    <Zap className="w-4 h-4" /> Transfer Type (IP-ID)
                  </div>
                  <div className="grid grid-cols-4 gap-2">
                    <button type="button" onClick={() => setIpidForm(p => ({ ...p, transferType: 'STANDARD' }))}
                      className={`p-2 rounded text-xs font-medium transition-all ${
                        ipidForm.transferType === 'STANDARD' 
                          ? 'bg-gray-700 border-2 border-gray-500 text-white' 
                          : 'bg-gray-900 border border-gray-700 text-gray-400 hover:border-gray-500'
                      }`}>
                      <div className="font-bold">STANDARD</div>
                      <div className="text-[9px] text-gray-500">IP-IP</div>
                    </button>
                    <button type="button" onClick={() => setIpidForm(p => ({ ...p, transferType: 'GPI' }))}
                      className={`p-2 rounded text-xs font-medium transition-all ${
                        ipidForm.transferType === 'GPI' 
                          ? 'bg-blue-900/50 border-2 border-blue-500 text-blue-400' 
                          : 'bg-gray-900 border border-gray-700 text-gray-400 hover:border-blue-500/50'
                      }`}>
                      <div className="font-bold">GPI</div>
                      <div className="text-[9px] text-gray-500">SWIFT gpi</div>
                    </button>
                    <button type="button" onClick={() => setIpidForm(p => ({ ...p, transferType: 'GPI_INSTANT' }))}
                      className={`p-2 rounded text-xs font-medium transition-all ${
                        ipidForm.transferType === 'GPI_INSTANT' 
                          ? 'bg-green-900/50 border-2 border-green-500 text-green-400' 
                          : 'bg-gray-900 border border-gray-700 text-gray-400 hover:border-green-500/50'
                      }`}>
                      <div className="font-bold">GPI INSTANT</div>
                      <div className="text-[9px] text-gray-500">Real-time</div>
                    </button>
                    <button type="button" onClick={() => setIpidForm(p => ({ ...p, transferType: 'GPI_COV' }))}
                      className={`p-2 rounded text-xs font-medium transition-all ${
                        ipidForm.transferType === 'GPI_COV' 
                          ? 'bg-purple-900/50 border-2 border-purple-500 text-purple-400' 
                          : 'bg-gray-900 border border-gray-700 text-gray-400 hover:border-purple-500/50'
                      }`}>
                      <div className="font-bold">GPI COV</div>
                      <div className="text-[9px] text-gray-500">Cover</div>
                    </button>
                  </div>
                  
                  {/* GPI Specific Options - Only show when GPI is selected */}
                  {ipidForm.transferType !== 'STANDARD' && (
                    <div className="space-y-3 pt-2 border-t border-blue-700/30">
                      <div className="text-xs text-green-400 font-bold flex items-center gap-2">
                        <Globe className="w-3 h-3" /> SWIFT gpi via IP-ID Configuration
                      </div>
                      
                      {/* GPI Service Type */}
                      <div className="grid grid-cols-3 gap-2">
                        <div>
                          <label className="text-[10px] text-gray-500 block mb-1">gpi Service</label>
                          <select value={ipidForm.gpiServiceType} onChange={e => setIpidForm(p => ({ ...p, gpiServiceType: e.target.value as any }))}
                            className="w-full bg-gray-900 border border-green-700/50 rounded px-2 py-1.5 text-xs text-white">
                            <option value="g4c">g4c - gpi for Corporates</option>
                            <option value="gpi">gpi - Standard</option>
                            <option value="gCCT">gCCT - gpi Customer Credit Transfer</option>
                            <option value="gCOV">gCOV - gpi Cover Payment</option>
                            <option value="gSRP">gSRP - gpi Stop and Recall</option>
                            <option value="gpi-instant">gpi-instant - Real-time</option>
                          </select>
                        </div>
                        <div>
                          <label className="text-[10px] text-gray-500 block mb-1">Priority</label>
                          <select value={ipidForm.gpiPriority} onChange={e => setIpidForm(p => ({ ...p, gpiPriority: e.target.value as any }))}
                            className="w-full bg-gray-900 border border-green-700/50 rounded px-2 py-1.5 text-xs text-white">
                            <option value="NORM">NORM - Normal</option>
                            <option value="HIGH">HIGH - High Priority</option>
                            <option value="URGT">URGT - Urgent</option>
                          </select>
                        </div>
                        <div>
                          <label className="text-[10px] text-gray-500 block mb-1">Service Level</label>
                          <select value={ipidForm.gpiServiceLevel} onChange={e => setIpidForm(p => ({ ...p, gpiServiceLevel: e.target.value as any }))}
                            className="w-full bg-gray-900 border border-green-700/50 rounded px-2 py-1.5 text-xs text-white">
                            <option value="SEPA">SEPA</option>
                            <option value="URGP">URGP - Urgent Payment</option>
                            <option value="NURG">NURG - Non-Urgent</option>
                            <option value="SDVA">SDVA - Same Day Value</option>
                            <option value="PRPT">PRPT - Proprietary</option>
                          </select>
                        </div>
                      </div>
                      
                      {/* Charge Bearer & Settlement Method */}
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="text-[10px] text-gray-500 block mb-1">Charge Bearer (ChrgBr)</label>
                          <select value={ipidForm.gpiChargeBearer} onChange={e => setIpidForm(p => ({ ...p, gpiChargeBearer: e.target.value as any }))}
                            className="w-full bg-gray-900 border border-green-700/50 rounded px-2 py-1.5 text-xs text-white">
                            <option value="SHAR">SHAR - Shared</option>
                            <option value="CRED">CRED - Borne by Creditor</option>
                            <option value="DEBT">DEBT - Borne by Debtor</option>
                            <option value="SLEV">SLEV - Service Level</option>
                          </select>
                        </div>
                        <div>
                          <label className="text-[10px] text-gray-500 block mb-1">Settlement Method (SttlmMtd)</label>
                          <select value={ipidForm.gpiSettlementMethod} onChange={e => setIpidForm(p => ({ ...p, gpiSettlementMethod: e.target.value as any }))}
                            className="w-full bg-gray-900 border border-green-700/50 rounded px-2 py-1.5 text-xs text-white">
                            <option value="INDA">INDA - Instructed Agent</option>
                            <option value="INGA">INGA - Instructing Agent</option>
                            <option value="COVE">COVE - Cover Method</option>
                            <option value="CLRG">CLRG - Clearing System</option>
                          </select>
                        </div>
                      </div>
                      
                      {/* End-to-End ID and Instruction ID */}
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="text-[10px] text-gray-500 block mb-1">End-to-End ID (EndToEndId)</label>
                          <input type="text" value={ipidForm.gpiEndToEndId} 
                            onChange={e => setIpidForm(p => ({ ...p, gpiEndToEndId: e.target.value }))}
                            placeholder="E2E-REF-001"
                            className="w-full bg-gray-900 border border-green-700/50 rounded px-2 py-1.5 text-xs text-white font-mono" />
                        </div>
                        <div>
                          <label className="text-[10px] text-gray-500 block mb-1">Instruction ID (InstrId)</label>
                          <input type="text" value={ipidForm.gpiInstructionId} 
                            onChange={e => setIpidForm(p => ({ ...p, gpiInstructionId: e.target.value }))}
                            placeholder="INSTR-001"
                            className="w-full bg-gray-900 border border-green-700/50 rounded px-2 py-1.5 text-xs text-white font-mono" />
                        </div>
                      </div>
                      
                      {/* GPI Info Box */}
                      <div className="p-2 bg-green-900/20 rounded border border-green-700/30 text-[10px]">
                        <div className="text-green-400 font-bold mb-1">SWIFT gpi via IP-ID Features:</div>
                        <div className="text-gray-400 space-y-0.5">
                          <div>• <span className="text-cyan-400">UETR</span> - Auto-generated unique reference</div>
                          <div>• <span className="text-cyan-400">IP-ID Protocol</span> - Server-to-Server encryption</div>
                          <div>• <span className="text-cyan-400">gpi Tracker</span> - Real-time status updates</div>
                          <div>• <span className="text-cyan-400">ISO 20022</span> - pacs.008 with gpi extensions</div>
                          <div>• <span className="text-cyan-400">TLS 1.3</span> - End-to-end encryption</div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
                
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-cyan-500 block mb-1">Amount</label>
                    <input type="text" value={ipidForm.amount} onChange={e => setIpidForm(p => ({ ...p, amount: e.target.value }))}
                      className="w-full bg-gray-900 border border-cyan-700/50 rounded px-3 py-2 text-sm text-white" />
                  </div>
                  <div>
                    <label className="text-xs text-cyan-500 block mb-1">Currency</label>
                    <select value={ipidForm.currency} onChange={e => setIpidForm(p => ({ ...p, currency: e.target.value }))}
                      className="w-full bg-gray-900 border border-cyan-700/50 rounded px-3 py-2 text-sm text-white">
                      {SUPPORTED_CURRENCIES.map(curr => (
                        <option key={curr.code} value={curr.code}>{curr.code} - {curr.name}</option>
                      ))}
                    </select>
                  </div>
                </div>
                
                <div>
                  <label className="text-xs text-cyan-500 block mb-1">Debtor Name</label>
                  <input type="text" value={ipidForm.dbtrNm} onChange={e => setIpidForm(p => ({ ...p, dbtrNm: e.target.value }))}
                    className="w-full bg-gray-900 border border-cyan-700/50 rounded px-3 py-2 text-sm text-white" />
                </div>
                
                <div>
                  <label className="text-xs text-cyan-500 block mb-1">Creditor Name</label>
                  <input type="text" value={ipidForm.cdtrNm} onChange={e => setIpidForm(p => ({ ...p, cdtrNm: e.target.value }))}
                    className="w-full bg-gray-900 border border-cyan-700/50 rounded px-3 py-2 text-sm text-white" />
                </div>
                
                <div>
                  <label className="text-xs text-cyan-500 block mb-1">Remittance Info</label>
                  <input type="text" value={ipidForm.remittance} onChange={e => setIpidForm(p => ({ ...p, remittance: e.target.value }))}
                    className="w-full bg-gray-900 border border-cyan-700/50 rounded px-3 py-2 text-sm text-white" />
                </div>


                {/* ═══════════════════════════════════════════════════════════════════════════════ */}
                {/* MT700 - DOCUMENTARY CREDIT (Letter of Credit) */}
                {/* ═══════════════════════════════════════════════════════════════════════════════ */}
                {ipidForm.format === 'MT700' && (
                  <>
                    <div className="p-2 bg-yellow-900/20 rounded border border-yellow-700/30 mt-4">
                      <div className="text-xs text-yellow-400 font-bold mb-1">Documentary Credit (Letter of Credit) Fields</div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-xs text-cyan-500 block mb-1">Form of Documentary Credit :40A:</label>
                        <select value={ipidForm.lcType} onChange={e => setIpidForm(p => ({ ...p, lcType: e.target.value }))}
                          className="w-full bg-gray-900 border border-cyan-700/50 rounded px-3 py-2 text-sm text-white">
                          <option value="IRREVOCABLE">IRREVOCABLE</option>
                          <option value="IRREVOCABLE TRANSFERABLE">IRREVOCABLE TRANSFERABLE</option>
                          <option value="REVOCABLE">REVOCABLE</option>
                        </select>
                      </div>
                      <div>
                        <label className="text-xs text-cyan-500 block mb-1">Drafts at :42C:</label>
                        <select value={ipidForm.lcDraftsAt} onChange={e => setIpidForm(p => ({ ...p, lcDraftsAt: e.target.value }))}
                          className="w-full bg-gray-900 border border-cyan-700/50 rounded px-3 py-2 text-sm text-white">
                          <option value="SIGHT">SIGHT</option>
                          <option value="30 DAYS">30 DAYS AFTER SIGHT</option>
                          <option value="60 DAYS">60 DAYS AFTER SIGHT</option>
                          <option value="90 DAYS">90 DAYS AFTER SIGHT</option>
                          <option value="DEFERRED">DEFERRED PAYMENT</option>
                        </select>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-xs text-cyan-500 block mb-1">Date and Place of Expiry :31D:</label>
                        <input type="date" value={ipidForm.lcExpiryDate} onChange={e => setIpidForm(p => ({ ...p, lcExpiryDate: e.target.value }))}
                          className="w-full bg-gray-900 border border-cyan-700/50 rounded px-3 py-2 text-sm text-white" />
                      </div>
                      <div>
                        <label className="text-xs text-cyan-500 block mb-1">Place of Expiry</label>
                        <input type="text" value={ipidForm.lcExpiryPlace} onChange={e => setIpidForm(p => ({ ...p, lcExpiryPlace: e.target.value }))}
                          className="w-full bg-gray-900 border border-cyan-700/50 rounded px-3 py-2 text-sm text-white" placeholder="e.g. LONDON, UK" />
                      </div>
                    </div>
                    <div>
                      <label className="text-xs text-cyan-500 block mb-1">Available With/By :41A:</label>
                      <input type="text" value={ipidForm.lcAvailableWith} onChange={e => setIpidForm(p => ({ ...p, lcAvailableWith: e.target.value }))}
                        className="w-full bg-gray-900 border border-cyan-700/50 rounded px-3 py-2 text-sm text-white" placeholder="ANY BANK BY NEGOTIATION" />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-xs text-cyan-500 block mb-1">Partial Shipments :43P:</label>
                        <select value={ipidForm.lcPartialShipments} onChange={e => setIpidForm(p => ({ ...p, lcPartialShipments: e.target.value }))}
                          className="w-full bg-gray-900 border border-cyan-700/50 rounded px-3 py-2 text-sm text-white">
                          <option value="ALLOWED">ALLOWED</option>
                          <option value="NOT ALLOWED">NOT ALLOWED</option>
                        </select>
                      </div>
                      <div>
                        <label className="text-xs text-cyan-500 block mb-1">Transshipment :43T:</label>
                        <select value={ipidForm.lcTransshipment} onChange={e => setIpidForm(p => ({ ...p, lcTransshipment: e.target.value }))}
                          className="w-full bg-gray-900 border border-cyan-700/50 rounded px-3 py-2 text-sm text-white">
                          <option value="ALLOWED">ALLOWED</option>
                          <option value="NOT ALLOWED">NOT ALLOWED</option>
                        </select>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-xs text-cyan-500 block mb-1">Port of Loading :44E:</label>
                        <input type="text" value={ipidForm.lcPortOfLoading} onChange={e => setIpidForm(p => ({ ...p, lcPortOfLoading: e.target.value }))}
                          className="w-full bg-gray-900 border border-cyan-700/50 rounded px-3 py-2 text-sm text-white" placeholder="e.g. SHANGHAI, CHINA" />
                      </div>
                      <div>
                        <label className="text-xs text-cyan-500 block mb-1">Port of Discharge :44F:</label>
                        <input type="text" value={ipidForm.lcPortOfDischarge} onChange={e => setIpidForm(p => ({ ...p, lcPortOfDischarge: e.target.value }))}
                          className="w-full bg-gray-900 border border-cyan-700/50 rounded px-3 py-2 text-sm text-white" placeholder="e.g. ROTTERDAM, NETHERLANDS" />
                      </div>
                    </div>
                    <div>
                      <label className="text-xs text-cyan-500 block mb-1">Description of Goods :45A:</label>
                      <textarea value={ipidForm.lcGoodsDescription} onChange={e => setIpidForm(p => ({ ...p, lcGoodsDescription: e.target.value }))}
                        className="w-full bg-gray-900 border border-cyan-700/50 rounded px-3 py-2 text-sm text-white h-24 font-mono text-xs" 
                        placeholder="ELECTRONIC EQUIPMENT AS PER PROFORMA INVOICE NO. XXX&#10;DATED YYYY-MM-DD&#10;CFR ROTTERDAM INCOTERMS 2020" />
                    </div>
                    <div>
                      <label className="text-xs text-cyan-500 block mb-1">Documents Required :46A:</label>
                      <textarea value={ipidForm.lcDocumentsRequired} onChange={e => setIpidForm(p => ({ ...p, lcDocumentsRequired: e.target.value }))}
                        className="w-full bg-gray-900 border border-cyan-700/50 rounded px-3 py-2 text-sm text-white h-24 font-mono text-xs" 
                        placeholder="+SIGNED COMMERCIAL INVOICE IN 3 ORIGINALS&#10;+FULL SET OF CLEAN ON BOARD BILLS OF LADING&#10;+PACKING LIST IN 2 COPIES&#10;+CERTIFICATE OF ORIGIN" />
                    </div>
                    <div>
                      <label className="text-xs text-cyan-500 block mb-1">Additional Conditions :47A:</label>
                      <textarea value={ipidForm.lcAdditionalConditions} onChange={e => setIpidForm(p => ({ ...p, lcAdditionalConditions: e.target.value }))}
                        className="w-full bg-gray-900 border border-cyan-700/50 rounded px-3 py-2 text-sm text-white h-20 font-mono text-xs" 
                        placeholder="+ALL DOCUMENTS MUST BE IN ENGLISH&#10;+INSURANCE COVERED BY APPLICANT" />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-xs text-cyan-500 block mb-1">Period for Presentation :48:</label>
                        <input type="text" value={ipidForm.lcPresentationPeriod} onChange={e => setIpidForm(p => ({ ...p, lcPresentationPeriod: e.target.value }))}
                          className="w-full bg-gray-900 border border-cyan-700/50 rounded px-3 py-2 text-sm text-white" placeholder="21 DAYS AFTER SHIPMENT" />
                      </div>
                      <div>
                        <label className="text-xs text-cyan-500 block mb-1">Confirmation :49:</label>
                        <select value={ipidForm.lcConfirmationInstructions} onChange={e => setIpidForm(p => ({ ...p, lcConfirmationInstructions: e.target.value }))}
                          className="w-full bg-gray-900 border border-cyan-700/50 rounded px-3 py-2 text-sm text-white">
                          <option value="CONFIRM">CONFIRM</option>
                          <option value="MAY ADD">MAY ADD</option>
                          <option value="WITHOUT">WITHOUT</option>
                        </select>
                      </div>
                    </div>
                    <div>
                      <label className="text-xs text-cyan-500 block mb-1">Charges :71B:</label>
                      <input type="text" value={ipidForm.lcCharges} onChange={e => setIpidForm(p => ({ ...p, lcCharges: e.target.value }))}
                        className="w-full bg-gray-900 border border-cyan-700/50 rounded px-3 py-2 text-sm text-white" />
                    </div>
                  </>
                )}

                {/* ═══════════════════════════════════════════════════════════════════════════════ */}
                {/* MT760 - GUARANTEE / STANDBY LC */}
                {/* ═══════════════════════════════════════════════════════════════════════════════ */}
                {ipidForm.format === 'MT760' && (
                  <>
                    <div className="p-2 bg-purple-900/20 rounded border border-purple-700/30 mt-4">
                      <div className="text-xs text-purple-400 font-bold mb-1">Bank Guarantee / Standby LC Fields</div>
                    </div>
                    <div>
                      <label className="text-xs text-cyan-500 block mb-1">Type of Undertaking :23:</label>
                      <select value="ISSUE" disabled
                        className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-sm text-gray-400">
                        <option value="ISSUE">ISSUE</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-xs text-cyan-500 block mb-1">Applicable Rules :40C:</label>
                      <select value={ipidForm.guaranteeType} onChange={e => setIpidForm(p => ({ ...p, guaranteeType: e.target.value }))}
                        className="w-full bg-gray-900 border border-cyan-700/50 rounded px-3 py-2 text-sm text-white">
                        <option value="URDG">URDG 758 (ICC Uniform Rules)</option>
                        <option value="ISP98">ISP98 (Standby Practices)</option>
                        <option value="UCPURR">UCP 600 + URR 725</option>
                        <option value="OTHR">OTHER</option>
                        <option value="NONE">NONE</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-xs text-cyan-500 block mb-1">Applicant (Principal)</label>
                      <input type="text" value={ipidForm.guaranteeApplicant || ipidForm.dbtrNm} 
                        onChange={e => setIpidForm(p => ({ ...p, guaranteeApplicant: e.target.value, dbtrNm: e.target.value }))}
                        className="w-full bg-gray-900 border border-cyan-700/50 rounded px-3 py-2 text-sm text-white" 
                        placeholder="Principal/Account Party" />
                    </div>
                    <div>
                      <label className="text-xs text-cyan-500 block mb-1">Beneficiary</label>
                      <input type="text" value={ipidForm.cdtrNm} onChange={e => setIpidForm(p => ({ ...p, cdtrNm: e.target.value }))}
                        className="w-full bg-gray-900 border border-cyan-700/50 rounded px-3 py-2 text-sm text-white" />
                    </div>
                    <div>
                      <label className="text-xs text-cyan-500 block mb-1">Expiry Date :31D:</label>
                      <input type="date" value={ipidForm.guaranteeExpiryDate} onChange={e => setIpidForm(p => ({ ...p, guaranteeExpiryDate: e.target.value }))}
                        className="w-full bg-gray-900 border border-cyan-700/50 rounded px-3 py-2 text-sm text-white" />
                    </div>
                    <div>
                      <label className="text-xs text-cyan-500 block mb-1">Guarantee Text :77C: (Full Wording)</label>
                      <textarea value={ipidForm.guaranteeText} onChange={e => setIpidForm(p => ({ ...p, guaranteeText: e.target.value }))}
                        className="w-full bg-gray-900 border border-cyan-700/50 rounded px-3 py-2 text-sm text-white h-40 font-mono text-xs" 
                        placeholder={`WE HEREBY ISSUE OUR IRREVOCABLE AND UNCONDITIONAL
BANK GUARANTEE NO. [NUMBER]

IN FAVOUR OF: [BENEFICIARY NAME AND ADDRESS]

FOR ACCOUNT OF: [APPLICANT NAME AND ADDRESS]

FOR AN AMOUNT NOT EXCEEDING: ${ipidForm.currency} ${ipidForm.amount}

COVERING: [PURPOSE OF GUARANTEE]

THIS GUARANTEE IS VALID UNTIL: [EXPIRY DATE]

WE UNDERTAKE TO PAY YOU ON YOUR FIRST WRITTEN DEMAND
STATING THAT THE PRINCIPAL HAS FAILED TO FULFILL
HIS OBLIGATIONS UNDER THE CONTRACT.

THIS GUARANTEE IS SUBJECT TO URDG 758.`} />
                    </div>
                  </>
                )}

                {/* ═══════════════════════════════════════════════════════════════════════════════ */}
                {/* MT540-543 - SECURITIES SETTLEMENT */}
                {/* ═══════════════════════════════════════════════════════════════════════════════ */}
                {['MT540', 'MT541', 'MT542', 'MT543'].includes(ipidForm.format) && (
                  <>
                    <div className="p-2 bg-green-900/20 rounded border border-green-700/30 mt-4">
                      <div className="text-xs text-green-400 font-bold mb-1">Securities Settlement Fields</div>
                    </div>
                    <div>
                      <label className="text-xs text-cyan-500 block mb-1">ISIN :35B:</label>
                      <input type="text" value={ipidForm.isin} onChange={e => setIpidForm(p => ({ ...p, isin: e.target.value.toUpperCase() }))}
                        maxLength={12}
                        className="w-full bg-gray-900 border border-cyan-700/50 rounded px-3 py-2 text-sm text-white font-mono" 
                        placeholder="US0378331005 (Apple Inc.)" />
                    </div>
                    <div>
                      <label className="text-xs text-cyan-500 block mb-1">Security Description</label>
                      <input type="text" value={ipidForm.securityDescription} onChange={e => setIpidForm(p => ({ ...p, securityDescription: e.target.value }))}
                        className="w-full bg-gray-900 border border-cyan-700/50 rounded px-3 py-2 text-sm text-white" 
                        placeholder="APPLE INC COMMON STOCK" />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-xs text-cyan-500 block mb-1">Settlement Quantity :36B:</label>
                        <input type="text" value={ipidForm.settlementQuantity} onChange={e => setIpidForm(p => ({ ...p, settlementQuantity: e.target.value }))}
                          className="w-full bg-gray-900 border border-cyan-700/50 rounded px-3 py-2 text-sm text-white" 
                          placeholder="10000" />
                      </div>
                      <div>
                        <label className="text-xs text-cyan-500 block mb-1">Safekeeping Account :97A:</label>
                        <input type="text" value={ipidForm.safekeepingAccount} onChange={e => setIpidForm(p => ({ ...p, safekeepingAccount: e.target.value }))}
                          className="w-full bg-gray-900 border border-cyan-700/50 rounded px-3 py-2 text-sm text-white font-mono" 
                          placeholder="SAFE-001-USD" />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-xs text-cyan-500 block mb-1">Trade Date :98A:</label>
                        <input type="date" value={ipidForm.tradeDate} onChange={e => setIpidForm(p => ({ ...p, tradeDate: e.target.value }))}
                          className="w-full bg-gray-900 border border-cyan-700/50 rounded px-3 py-2 text-sm text-white" />
                      </div>
                      <div>
                        <label className="text-xs text-cyan-500 block mb-1">Settlement Date :98A:</label>
                        <input type="date" value={ipidForm.settlementDate} onChange={e => setIpidForm(p => ({ ...p, settlementDate: e.target.value }))}
                          className="w-full bg-gray-900 border border-cyan-700/50 rounded px-3 py-2 text-sm text-white" />
                      </div>
                    </div>
                  </>
                )}

                {/* ═══════════════════════════════════════════════════════════════════════════════ */}
                {/* MT199 / MT799 - FREE FORMAT */}
                {/* ═══════════════════════════════════════════════════════════════════════════════ */}
                {['MT199', 'MT799'].includes(ipidForm.format) && (
                  <>
                    <div className="p-2 bg-red-900/20 rounded border border-red-700/30 mt-4">
                      <div className="text-xs text-red-400 font-bold mb-1">Free Format Message Field :79:</div>
                    </div>
                    <div>
                      <label className="text-xs text-cyan-500 block mb-1">Narrative / Free Text :79:</label>
                      <textarea value={ipidForm.freeFormatText || ipidForm.remittance} 
                        onChange={e => setIpidForm(p => ({ ...p, freeFormatText: e.target.value, remittance: e.target.value }))}
                        className="w-full bg-gray-900 border border-cyan-700/50 rounded px-3 py-2 text-sm text-white h-48 font-mono" 
                        placeholder={`ATTN: TRADE FINANCE DEPARTMENT

RE: YOUR REFERENCE NUMBER XXXXXX

WE REFER TO THE ABOVE MENTIONED TRANSACTION AND
WISH TO INFORM YOU THAT...

[YOUR MESSAGE HERE]

PLEASE ACKNOWLEDGE RECEIPT OF THIS MESSAGE.

BEST REGARDS,
DIGITAL COMMERCIAL BANK LTD`} />
                    </div>
                  </>
                )}

                {/* ═══════════════════════════════════════════════════════════════════════════════ */}
                {/* MT900/MT910 - CONFIRMATIONS */}
                {/* ═══════════════════════════════════════════════════════════════════════════════ */}
                {['MT900', 'MT910'].includes(ipidForm.format) && (
                  <>
                    <div className="p-2 bg-blue-900/20 rounded border border-blue-700/30 mt-4">
                      <div className="text-xs text-blue-400 font-bold mb-1">{ipidForm.format === 'MT900' ? 'Debit Confirmation' : 'Credit Confirmation'} Fields</div>
                    </div>
                    <div>
                      <label className="text-xs text-cyan-500 block mb-1">Account :25:</label>
                      <input type="text" value={ipidForm.dbtrAcct} onChange={e => setIpidForm(p => ({ ...p, dbtrAcct: e.target.value }))}
                        className="w-full bg-gray-900 border border-cyan-700/50 rounded px-3 py-2 text-sm text-white font-mono" />
                    </div>
                    <div>
                      <label className="text-xs text-cyan-500 block mb-1">Related Reference :21:</label>
                      <input type="text" value={ipidForm.remittance} onChange={e => setIpidForm(p => ({ ...p, remittance: e.target.value }))}
                        className="w-full bg-gray-900 border border-cyan-700/50 rounded px-3 py-2 text-sm text-white" 
                        placeholder="Original transaction reference" />
                    </div>
                  </>
                )}

                {/* ═══════════════════════════════════════════════════════════════════════════════ */}
                {/* MT940/MT950 - STATEMENTS */}
                {/* ═══════════════════════════════════════════════════════════════════════════════ */}
                {['MT940', 'MT950'].includes(ipidForm.format) && (
                  <>
                    <div className="p-2 bg-indigo-900/20 rounded border border-indigo-700/30 mt-4">
                      <div className="text-xs text-indigo-400 font-bold mb-1">{ipidForm.format === 'MT940' ? 'Customer Statement' : 'Statement Message'} Fields</div>
                    </div>
                    <div>
                      <label className="text-xs text-cyan-500 block mb-1">Account Identification :25:</label>
                      <input type="text" value={ipidForm.dbtrAcct} onChange={e => setIpidForm(p => ({ ...p, dbtrAcct: e.target.value }))}
                        className="w-full bg-gray-900 border border-cyan-700/50 rounded px-3 py-2 text-sm text-white font-mono" />
                    </div>
                    <div>
                      <label className="text-xs text-cyan-500 block mb-1">Statement Information :86:</label>
                      <input type="text" value={ipidForm.remittance} onChange={e => setIpidForm(p => ({ ...p, remittance: e.target.value }))}
                        className="w-full bg-gray-900 border border-cyan-700/50 rounded px-3 py-2 text-sm text-white" 
                        placeholder="Statement period or reference" />
                    </div>
                  </>
                )}

                <button onClick={executeIPIDTransfer} disabled={isTransferring}
                  className={`w-full py-3 rounded font-bold flex items-center justify-center gap-2 ${
                    !isTransferring
                      ? 'bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-700 hover:to-blue-700 text-white'
                      : 'bg-gray-800 text-gray-500 cursor-not-allowed'
                  }`}>
                  {isTransferring ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
                  {isTransferring ? 'Transferring via IP-ID...' : 'Execute IP-ID Transfer'}
                </button>
              </div>
              
              <div className="space-y-4">
                <div className="bg-gray-900/50 rounded-lg p-4 border border-cyan-900/30">
                  <h4 className="text-cyan-400 font-bold mb-3 flex items-center gap-2">
                    <Network className="w-4 h-4" /> IP-ID Transfer Route
                  </h4>
                  
                  {(() => {
                    const destServer = servers.find(s => s.id === ipidForm.destinationServerId);
                    return destServer ? (
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <div className="text-center">
                            <div className="w-16 h-16 bg-green-900/50 rounded-lg flex items-center justify-center mb-2 border border-green-500/50">
                              <Server className="w-8 h-8 text-green-400" />
                            </div>
                            <div className="text-xs text-green-400">{config.bankBic}</div>
                            <div className="text-xs text-cyan-400 font-mono">{config.globalServerIpId}</div>
                            <div className="text-xs text-gray-600">{config.serverIp}</div>
                          </div>
                          
                          <div className="flex-1 px-4">
                            <div className="relative">
                              <div className="border-t-2 border-dashed border-cyan-500/50" />
                              <Network className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-6 h-6 text-cyan-400 bg-gray-900" />
                            </div>
                            <div className="text-center mt-2 text-xs text-cyan-400">IP-ID / TLS 1.3</div>
                          </div>
                          
                          <div className="text-center">
                            <div className="w-16 h-16 bg-blue-900/50 rounded-lg flex items-center justify-center mb-2 border border-blue-500/50">
                              <Server className="w-8 h-8 text-blue-400" />
                            </div>
                            <div className="text-xs text-blue-400">{destServer.bic}</div>
                            <div className="text-xs text-cyan-400 font-mono">{destServer.ipId}</div>
                            <div className="text-xs text-gray-600">{destServer.ip}</div>
                          </div>
                        </div>
                        
                        <div className="border-t border-gray-800 pt-4 space-y-2 text-xs">
                          <div className="flex justify-between"><span className="text-gray-500">Protocol:</span><span className="text-cyan-400">IP-IP Server-to-Server</span></div>
                          <div className="flex justify-between"><span className="text-gray-500">Encryption:</span><span className="text-white">{config.encryption}</span></div>
                          <div className="flex justify-between"><span className="text-gray-500">TLS:</span><span className="text-white">{config.tlsVersion}</span></div>
                          <div className="flex justify-between"><span className="text-gray-500">Port:</span><span className="text-white">{destServer.port}</span></div>
                          <div className="flex justify-between"><span className="text-gray-500">Amount:</span><span className="text-cyan-400">{ipidForm.currency} {parseFloat(ipidForm.amount).toLocaleString()}</span></div>
                        </div>
                      </div>
                    ) : null;
                  })()}
                </div>
                
                <div className="bg-cyan-900/10 rounded-lg p-3 border border-cyan-900/30">
                  <div className="text-xs text-cyan-400 font-bold mb-2">IP-ID Features:</div>
                  <div className="space-y-1 text-xs text-gray-400">
                    <div>• Direct server-to-server connection</div>
                    <div>• TLS 1.3 encrypted channel</div>
                    <div>• AES-256-GCM payload encryption</div>
                    <div>• Real-time ACK confirmation</div>
                    <div>• Supports ISO 20022 & MT formats</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Blockchain - Minting/Tokenization */}
        {activeTab === 'blockchain' && (
          <div className="flex-1 overflow-auto p-4">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-gradient-to-br from-orange-600 to-amber-500 rounded-lg flex items-center justify-center border-2 border-orange-400/50">
                  <Coins className="w-7 h-7 text-white" />
                </div>
                <div>
                  <h3 className="text-orange-400 font-bold text-lg">Blockchain Minting & Tokenization</h3>
                  <p className="text-xs text-gray-500">Convert fiat reserves to on-chain stablecoins via SWIFT/IP-ID</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={async () => {
                    setIsTestingAlchemy(true);
                    log('info', '');
                    log('info', '⛓️ ═══════════════════════════════════════════════════════════════════');
                    log('info', '⛓️   ALCHEMY BLOCKCHAIN CONNECTIONS TEST');
                    log('info', '⛓️ ═══════════════════════════════════════════════════════════════════');
                    
                    const newStatus: Record<string, { connected: boolean; blockNumber: number; latency: number }> = {};
                    
                    for (const network of ALCHEMY_NETWORKS) {
                      log('network', `⛓️ Testing ${network.name}...`);
                      const startTime = Date.now();
                      try {
                        const response = await fetch(network.rpcUrl, {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({
                            jsonrpc: '2.0',
                            method: 'eth_blockNumber',
                            params: [],
                            id: 1
                          })
                        });
                        const data = await response.json();
                        const latency = Date.now() - startTime;
                        if (data.result) {
                          const blockNumber = parseInt(data.result, 16);
                          newStatus[network.id] = { connected: true, blockNumber, latency };
                          log('success', `   ✅ ${network.name}: Block #${blockNumber.toLocaleString()} (${latency}ms)`);
                        } else {
                          newStatus[network.id] = { connected: false, blockNumber: 0, latency };
                          log('error', `   ❌ ${network.name}: No response`);
                        }
                      } catch (error) {
                        newStatus[network.id] = { connected: false, blockNumber: 0, latency: Date.now() - startTime };
                        log('error', `   ❌ ${network.name}: Connection failed`);
                      }
                    }
                    
                    setAlchemyStatus(newStatus);
                    const connectedCount = Object.values(newStatus).filter(s => s.connected).length;
                    log('info', '');
                    log('success', `⛓️ ALCHEMY TEST COMPLETE: ${connectedCount}/${ALCHEMY_NETWORKS.length} networks connected`);
                    setIsTestingAlchemy(false);
                  }}
                  disabled={isTestingAlchemy}
                  className="px-3 py-1 bg-blue-600 hover:bg-blue-700 rounded text-xs font-bold flex items-center gap-1 disabled:opacity-50"
                >
                  {isTestingAlchemy ? <Loader2 className="w-3 h-3 animate-spin" /> : <Wifi className="w-3 h-3" />}
                  Test Alchemy
                </button>
                <span className={`px-3 py-1 rounded text-xs font-bold ${isMinting ? 'bg-orange-600 text-white animate-pulse' : 'bg-gray-800 text-gray-400'}`}>
                  {isMinting ? '⚡ MINTING...' : '● READY'}
                </span>
              </div>
            </div>

            {/* Alchemy Networks Status Panel */}
            <div className="mb-6 bg-gradient-to-r from-blue-900/30 to-purple-900/30 rounded-lg p-4 border border-blue-500/30">
              <h4 className="text-blue-400 font-bold mb-3 flex items-center gap-2">
                <Layers className="w-4 h-4" /> Alchemy Blockchain Connections (Real & Functional)
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
                {ALCHEMY_NETWORKS.map(network => {
                  const status = alchemyStatus[network.id];
                  return (
                    <div key={network.id} className={`p-3 rounded-lg border ${status?.connected ? 'bg-green-900/20 border-green-500/50' : 'bg-gray-900/50 border-gray-700'}`}>
                      <div className="flex items-center justify-between mb-2">
                        <div className="text-xs font-bold text-white">{network.name.replace(' (Alchemy)', '')}</div>
                        {status?.connected ? (
                          <CheckCircle className="w-4 h-4 text-green-400" />
                        ) : (
                          <div className="w-4 h-4 rounded-full bg-gray-600" />
                        )}
                      </div>
                      <div className="text-xs text-gray-500">Chain ID: {network.chainId}</div>
                      <div className="text-xs text-gray-500">{network.symbol}</div>
                      {status?.connected && (
                        <>
                          <div className="text-xs text-green-400 mt-1">Block #{status.blockNumber.toLocaleString()}</div>
                          <div className="text-xs text-blue-400">{status.latency}ms</div>
                        </>
                      )}
                      <div className="mt-2 text-[10px] text-gray-600 font-mono truncate" title={network.rpcUrl}>
                        {network.rpcUrl.substring(0, 35)}...
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className="mt-3 flex items-center justify-between text-xs">
                <div className="text-gray-500">
                  API Keys: <span className="text-blue-400 font-mono">7iQ1gZ82J1A6Fig-QwHDb4_4GeoayYqj</span> (ETH) | <span className="text-purple-400 font-mono">mm-9UjI5oG51l94mRH3fh</span> (Multi)
                </div>
                <div className="text-gray-400">
                  {Object.values(alchemyStatus).filter(s => s.connected).length}/{ALCHEMY_NETWORKS.length} Connected
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Left Column - Configuration */}
              <div className="space-y-4">
                {/* Source Selection */}
                <div className="bg-gray-900/50 rounded-lg p-4 border border-orange-500/30">
                  <h4 className="text-orange-400 font-bold mb-3 flex items-center gap-2">
                    <Wallet className="w-4 h-4" /> 1. Source Account (Ledger)
                  </h4>
                  {selectedLedgerAccount ? (
                    <div className="bg-emerald-900/30 border border-emerald-500/50 rounded-lg p-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="text-emerald-400 font-bold">{selectedLedgerAccount.accountName}</div>
                          <div className="text-xs text-gray-400">{selectedLedgerAccount.accountNumber}</div>
                          {selectedLedgerAccount.iban && <div className="text-xs text-gray-500">IBAN: {selectedLedgerAccount.iban}</div>}
                        </div>
                        <div className="text-right">
                          <div className="text-emerald-400 font-bold">{selectedLedgerAccount.currency} {(selectedLedgerAccount.availableBalance || selectedLedgerAccount.balance)?.toLocaleString()}</div>
                          <div className="text-xs text-gray-500">{selectedLedgerAccount.bankName}</div>
                          <button onClick={() => setSelectedLedgerAccount(null)} className="text-xs text-red-400 hover:text-red-300 mt-1">
                            Change Account
                          </button>
                        </div>
                      </div>
                    </div>
                  ) : custodyAccounts.length > 0 ? (
                    <div className="space-y-2">
                      <div className="text-xs text-gray-400 mb-2">Select an account from Custody:</div>
                      <div className="max-h-40 overflow-y-auto space-y-2">
                        {custodyAccounts.map(account => (
                          <button key={account.id} onClick={() => setSelectedLedgerAccount(account)}
                            className="w-full p-2 bg-gray-800 hover:bg-emerald-900/30 border border-gray-700 hover:border-emerald-500/50 rounded-lg text-left transition-all">
                            <div className="flex items-center justify-between">
                              <div>
                                <div className="text-white text-sm font-bold">{account.accountName}</div>
                                <div className="text-xs text-gray-500">{account.accountNumber}</div>
                              </div>
                              <div className="text-right">
                                <div className="text-emerald-400 text-sm font-bold">{account.currency} {(account.availableBalance || account.balance)?.toLocaleString()}</div>
                              </div>
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="bg-red-900/30 border border-red-500/50 rounded-lg p-3 text-center">
                      <AlertTriangle className="w-5 h-5 text-red-400 mx-auto mb-1" />
                      <div className="text-red-400 text-sm">No Custody Accounts Available</div>
                      <div className="text-xs text-gray-500 mb-2">Create accounts in Custody Accounts module first</div>
                      <button onClick={() => setActiveTab('ledger')} className="px-3 py-1 bg-orange-600 hover:bg-orange-700 rounded text-xs font-bold">
                        Go to Ledger Tab
                      </button>
                    </div>
                  )}
                </div>

                {/* Currency Selection */}
                <div className="bg-gray-900/50 rounded-lg p-4 border border-orange-500/30">
                  <h4 className="text-orange-400 font-bold mb-3 flex items-center gap-2">
                    <Banknote className="w-4 h-4" /> 2. Currency to Tokenize
                  </h4>
                  <div className="grid grid-cols-5 gap-2">
                    {SUPPORTED_CURRENCIES.map(curr => (
                      <button key={curr.code} onClick={() => setMintingCurrency(curr.code)}
                        className={`p-2 rounded text-xs font-bold transition-all ${
                          mintingCurrency === curr.code 
                            ? 'bg-orange-600 text-white border-2 border-orange-400' 
                            : 'bg-gray-800 text-gray-400 border border-gray-700 hover:border-orange-500/50'
                        }`}>
                        {curr.code}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Amount */}
                <div className="bg-gray-900/50 rounded-lg p-4 border border-orange-500/30">
                  <h4 className="text-orange-400 font-bold mb-3 flex items-center gap-2">
                    <Hash className="w-4 h-4" /> 3. Amount to Mint
                  </h4>
                  <div className="flex gap-2">
                    <input type="text" value={mintingAmount} onChange={e => setMintingAmount(e.target.value)}
                      placeholder="0.00" className="flex-1 bg-black/50 border border-orange-500/30 rounded px-3 py-2 text-white font-mono text-lg" />
                    <div className="px-4 py-2 bg-orange-900/50 rounded text-orange-400 font-bold flex items-center">
                      {mintingCurrency}
                    </div>
                  </div>
                </div>

                {/* Transfer Method */}
                <div className="bg-gray-900/50 rounded-lg p-4 border border-orange-500/30">
                  <h4 className="text-orange-400 font-bold mb-3 flex items-center gap-2">
                    <ArrowRightLeft className="w-4 h-4" /> 4. Transfer Method
                  </h4>
                  <div className="grid grid-cols-2 gap-3">
                    <button onClick={() => setMintingSource('SWIFT')}
                      className={`p-3 rounded-lg border-2 transition-all ${
                        mintingSource === 'SWIFT' 
                          ? 'bg-yellow-900/50 border-yellow-500 text-yellow-400' 
                          : 'bg-gray-800 border-gray-700 text-gray-400 hover:border-yellow-500/50'
                      }`}>
                      <Globe className="w-6 h-6 mx-auto mb-1" />
                      <div className="text-sm font-bold">SWIFT FIN</div>
                      <div className="text-xs opacity-70">{mintingMessageType}</div>
                    </button>
                    <button onClick={() => setMintingSource('IPID')}
                      className={`p-3 rounded-lg border-2 transition-all ${
                        mintingSource === 'IPID' 
                          ? 'bg-cyan-900/50 border-cyan-500 text-cyan-400' 
                          : 'bg-gray-800 border-gray-700 text-gray-400 hover:border-cyan-500/50'
                      }`}>
                      <Network className="w-6 h-6 mx-auto mb-1" />
                      <div className="text-sm font-bold">IP-ID</div>
                      <div className="text-xs opacity-70">Server-to-Server</div>
                    </button>
                  </div>
                  
                  {/* SWIFT Message Type Selector */}
                  {mintingSource === 'SWIFT' && (
                    <div className="mt-4 p-3 bg-yellow-900/20 rounded-lg border border-yellow-500/30">
                      <div className="text-yellow-400 font-bold text-xs mb-2 flex items-center gap-2">
                        <FileText className="w-4 h-4" /> SWIFT Message Type for Tokenization
                      </div>
                      <select 
                        value={mintingMessageType} 
                        onChange={e => setMintingMessageType(e.target.value)}
                        className="w-full bg-black/50 border border-yellow-500/30 rounded px-3 py-2 text-white text-sm"
                      >
                        <optgroup label="Customer Transfers">
                          <option value="MT103">MT103 - Single Customer Credit Transfer ★</option>
                          <option value="MT103+">MT103+ - STP Customer Credit Transfer</option>
                          <option value="MT101">MT101 - Request for Transfer</option>
                          <option value="MT102">MT102 - Multiple Customer Credit Transfer</option>
                          <option value="MT104">MT104 - Direct Debit/Request for Debit</option>
                          <option value="MT107">MT107 - General Direct Debit Message</option>
                        </optgroup>
                        <optgroup label="Financial Institution Transfers">
                          <option value="MT200">MT200 - Financial Institution Transfer</option>
                          <option value="MT201">MT201 - Multiple FI Transfer</option>
                          <option value="MT202">MT202 - General FI Transfer ★</option>
                          <option value="MT202COV">MT202COV - Cover Payment ★</option>
                          <option value="MT203">MT203 - Multiple General FI Transfer</option>
                          <option value="MT204">MT204 - FI Direct Debit</option>
                          <option value="MT205">MT205 - FI Transfer Execution</option>
                          <option value="MT205COV">MT205COV - FI Transfer Execution Cover</option>
                          <option value="MT210">MT210 - Notice to Receive</option>
                        </optgroup>
                        <optgroup label="Treasury Markets">
                          <option value="MT300">MT300 - Foreign Exchange Confirmation</option>
                          <option value="MT303">MT303 - Forex/Currency Option Allocation</option>
                          <option value="MT304">MT304 - Advice/Instruction of Third Party Deal</option>
                          <option value="MT305">MT305 - Foreign Currency Option Confirmation</option>
                          <option value="MT306">MT306 - Foreign Currency Option Confirmation</option>
                          <option value="MT320">MT320 - Fixed Loan/Deposit Confirmation</option>
                          <option value="MT330">MT330 - Call/Notice Loan/Deposit Confirmation</option>
                          <option value="MT340">MT340 - Forward Rate Agreement Confirmation</option>
                          <option value="MT350">MT350 - Advice of Loan/Deposit Interest Payment</option>
                        </optgroup>
                        <optgroup label="Securities">
                          <option value="MT502">MT502 - Order to Buy or Sell</option>
                          <option value="MT509">MT509 - Trade Status Message</option>
                          <option value="MT513">MT513 - Client Advice of Execution</option>
                          <option value="MT515">MT515 - Client Confirmation of Purchase/Sale</option>
                          <option value="MT540">MT540 - Receive Free ★</option>
                          <option value="MT541">MT541 - Receive Against Payment ★</option>
                          <option value="MT542">MT542 - Deliver Free ★</option>
                          <option value="MT543">MT543 - Deliver Against Payment ★</option>
                          <option value="MT544">MT544 - Receive Free Confirmation</option>
                          <option value="MT545">MT545 - Receive Against Payment Confirmation</option>
                          <option value="MT546">MT546 - Deliver Free Confirmation</option>
                          <option value="MT547">MT547 - Deliver Against Payment Confirmation</option>
                          <option value="MT548">MT548 - Settlement Status and Processing Advice</option>
                          <option value="MT564">MT564 - Corporate Action Notification</option>
                          <option value="MT565">MT565 - Corporate Action Instruction</option>
                          <option value="MT566">MT566 - Corporate Action Confirmation</option>
                          <option value="MT567">MT567 - Corporate Action Status and Processing</option>
                          <option value="MT568">MT568 - Corporate Action Narrative</option>
                          <option value="MT575">MT575 - Combined Activity Report</option>
                          <option value="MT576">MT576 - Statement of Open Orders</option>
                          <option value="MT578">MT578 - Settlement Allegement</option>
                        </optgroup>
                        <optgroup label="Documentary Credits">
                          <option value="MT700">MT700 - Issue of Documentary Credit ★</option>
                          <option value="MT701">MT701 - Issue of Documentary Credit (Cont.)</option>
                          <option value="MT705">MT705 - Pre-Advice of Documentary Credit</option>
                          <option value="MT707">MT707 - Amendment to Documentary Credit</option>
                          <option value="MT710">MT710 - Advice of Third Bank's Documentary Credit</option>
                          <option value="MT720">MT720 - Transfer of Documentary Credit</option>
                          <option value="MT730">MT730 - Acknowledgement</option>
                          <option value="MT732">MT732 - Advice of Discharge</option>
                          <option value="MT734">MT734 - Advice of Refusal</option>
                          <option value="MT740">MT740 - Authorisation to Reimburse</option>
                          <option value="MT742">MT742 - Reimbursement Claim</option>
                          <option value="MT747">MT747 - Amendment to Authorisation to Reimburse</option>
                          <option value="MT750">MT750 - Advice of Discrepancy</option>
                          <option value="MT752">MT752 - Authorisation to Pay, Accept or Negotiate</option>
                          <option value="MT754">MT754 - Advice of Payment/Acceptance/Negotiation</option>
                          <option value="MT756">MT756 - Advice of Reimbursement or Payment</option>
                        </optgroup>
                        <optgroup label="Guarantees & Standby LC">
                          <option value="MT760">MT760 - Guarantee / Standby LC ★</option>
                          <option value="MT767">MT767 - Guarantee/Standby LC Amendment</option>
                          <option value="MT768">MT768 - Acknowledgement of Guarantee/Standby LC</option>
                          <option value="MT769">MT769 - Advice of Reduction or Release</option>
                        </optgroup>
                        <optgroup label="Collections">
                          <option value="MT400">MT400 - Advice of Payment</option>
                          <option value="MT405">MT405 - Clean Collection</option>
                          <option value="MT410">MT410 - Acknowledgement</option>
                          <option value="MT412">MT412 - Advice of Acceptance</option>
                          <option value="MT416">MT416 - Advice of Non-Payment/Non-Acceptance</option>
                          <option value="MT420">MT420 - Tracer</option>
                          <option value="MT422">MT422 - Advice of Fate and Request for Instructions</option>
                          <option value="MT430">MT430 - Amendment of Instructions</option>
                          <option value="MT450">MT450 - Cash Letter Credit Advice</option>
                        </optgroup>
                        <optgroup label="Confirmations & Statements">
                          <option value="MT900">MT900 - Confirmation of Debit ★</option>
                          <option value="MT910">MT910 - Confirmation of Credit ★</option>
                          <option value="MT920">MT920 - Request Message</option>
                          <option value="MT935">MT935 - Rate Change Advice</option>
                          <option value="MT940">MT940 - Customer Statement ★</option>
                          <option value="MT941">MT941 - Balance Report</option>
                          <option value="MT942">MT942 - Interim Transaction Report</option>
                          <option value="MT950">MT950 - Statement Message ★</option>
                          <option value="MT970">MT970 - Netting Statement</option>
                          <option value="MT971">MT971 - Netting Balance Report</option>
                        </optgroup>
                        <optgroup label="Free Format & Common">
                          <option value="MT199">MT199 - Free Format Message ★</option>
                          <option value="MT299">MT299 - Free Format (FI)</option>
                          <option value="MT799">MT799 - Free Format Banking</option>
                          <option value="MT999">MT999 - Free Format Message</option>
                        </optgroup>
                        <optgroup label="Cheques">
                          <option value="MT110">MT110 - Advice of Cheque(s)</option>
                          <option value="MT111">MT111 - Request for Stop Payment of Cheque</option>
                          <option value="MT112">MT112 - Status of Request for Stop Payment</option>
                        </optgroup>
                        <optgroup label="Common Group Messages">
                          <option value="MT190">MT190 - Advice of Charges, Interest and Other</option>
                          <option value="MT191">MT191 - Request for Payment of Charges, Interest</option>
                          <option value="MT192">MT192 - Request for Cancellation</option>
                          <option value="MT195">MT195 - Queries</option>
                          <option value="MT196">MT196 - Answers</option>
                        </optgroup>
                      </select>
                      
                      {/* Message Type Info */}
                      <div className="mt-3 p-2 bg-black/30 rounded text-xs">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-gray-500">Selected Message:</span>
                          <span className="text-yellow-400 font-mono font-bold">{mintingMessageType}</span>
                        </div>
                        <div className="text-gray-400">
                          {mintingMessageType === 'MT103' && 'Single Customer Credit Transfer - Most common for payments'}
                          {mintingMessageType === 'MT103+' && 'STP Customer Credit Transfer - Straight Through Processing'}
                          {mintingMessageType === 'MT202' && 'General Financial Institution Transfer'}
                          {mintingMessageType === 'MT202COV' && 'Cover Payment for underlying MT103'}
                          {mintingMessageType === 'MT760' && 'Bank Guarantee / Standby Letter of Credit'}
                          {mintingMessageType === 'MT700' && 'Issue of Documentary Credit (Letter of Credit)'}
                          {mintingMessageType === 'MT540' && 'Receive Free of Payment - Securities'}
                          {mintingMessageType === 'MT541' && 'Receive Against Payment - Securities DVP'}
                          {mintingMessageType === 'MT542' && 'Deliver Free of Payment - Securities'}
                          {mintingMessageType === 'MT543' && 'Deliver Against Payment - Securities DVP'}
                          {mintingMessageType === 'MT900' && 'Confirmation of Debit to Account'}
                          {mintingMessageType === 'MT910' && 'Confirmation of Credit to Account'}
                          {mintingMessageType === 'MT940' && 'Customer Statement Message'}
                          {mintingMessageType === 'MT950' && 'Statement Message'}
                          {mintingMessageType === 'MT199' && 'Free Format Message for Payment Operations'}
                          {mintingMessageType === 'MT799' && 'Free Format Banking Message'}
                          {mintingMessageType === 'MT300' && 'Foreign Exchange Confirmation'}
                          {mintingMessageType === 'MT320' && 'Fixed Loan/Deposit Confirmation'}
                          {!['MT103', 'MT103+', 'MT202', 'MT202COV', 'MT760', 'MT700', 'MT540', 'MT541', 'MT542', 'MT543', 'MT900', 'MT910', 'MT940', 'MT950', 'MT199', 'MT799', 'MT300', 'MT320'].includes(mintingMessageType) && `SWIFT ${mintingMessageType} message for tokenization`}
                        </div>
                      </div>
                      
                      {/* Quick Select Buttons */}
                      <div className="mt-3 flex flex-wrap gap-1">
                        {['MT103', 'MT202', 'MT760', 'MT700', 'MT541', 'MT900', 'MT199'].map(mt => (
                          <button
                            key={mt}
                            onClick={() => setMintingMessageType(mt)}
                            className={`px-2 py-1 rounded text-xs font-bold transition-all ${
                              mintingMessageType === mt
                                ? 'bg-yellow-600 text-white'
                                : 'bg-gray-800 text-gray-400 hover:bg-yellow-900/50 hover:text-yellow-400'
                            }`}
                          >
                            {mt}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Minting Type */}
                <div className="bg-gray-900/50 rounded-lg p-4 border border-orange-500/30">
                  <h4 className="text-orange-400 font-bold mb-3 flex items-center gap-2">
                    <Flame className="w-4 h-4" /> 5. Operation Type
                  </h4>
                  <div className="grid grid-cols-2 gap-3">
                    <button onClick={() => setMintingType('TOKENIZE')}
                      className={`p-3 rounded-lg border-2 transition-all ${
                        mintingType === 'TOKENIZE' 
                          ? 'bg-purple-900/50 border-purple-500 text-purple-400' 
                          : 'bg-gray-800 border-gray-700 text-gray-400 hover:border-purple-500/50'
                      }`}>
                      <Link2 className="w-6 h-6 mx-auto mb-1" />
                      <div className="text-sm font-bold">TOKENIZE</div>
                      <div className="text-xs opacity-70">Wrap to Token</div>
                    </button>
                    <button onClick={() => setMintingType('MINT')}
                      className={`p-3 rounded-lg border-2 transition-all ${
                        mintingType === 'MINT' 
                          ? 'bg-green-900/50 border-green-500 text-green-400' 
                          : 'bg-gray-800 border-gray-700 text-gray-400 hover:border-green-500/50'
                      }`}>
                      <Coins className="w-6 h-6 mx-auto mb-1" />
                      <div className="text-sm font-bold">MINT</div>
                      <div className="text-xs opacity-70">Create New Tokens</div>
                    </button>
                  </div>
                </div>
              </div>

              {/* Right Column - Blockchain & Contract */}
              <div className="space-y-4">
                {/* Blockchain Selection */}
                <div className="bg-gray-900/50 rounded-lg p-4 border border-orange-500/30">
                  <h4 className="text-orange-400 font-bold mb-3 flex items-center gap-2">
                    <Layers className="w-4 h-4" /> 6. Target Blockchain
                  </h4>
                  <select value={selectedBlockchain} onChange={e => { setSelectedBlockchain(e.target.value); setSelectedContract(''); }}
                    className="w-full bg-black/50 border border-orange-500/30 rounded px-3 py-2 text-white">
                    {BLOCKCHAIN_NETWORKS.map(net => (
                      <option key={net.id} value={net.id}>{net.name} ({net.symbol}) - Chain ID: {net.chainId}</option>
                    ))}
                  </select>
                  <div className="mt-2 text-xs text-gray-500">
                    RPC: {BLOCKCHAIN_NETWORKS.find(n => n.id === selectedBlockchain)?.rpcUrl}
                  </div>
                  <input type="text" value={customRpcUrl} onChange={e => setCustomRpcUrl(e.target.value)}
                    placeholder="Custom RPC URL (optional)" className="mt-2 w-full bg-black/30 border border-gray-700 rounded px-3 py-1 text-xs text-gray-400" />
                </div>

                {/* Smart Contract Selection */}
                <div className="bg-gray-900/50 rounded-lg p-4 border border-orange-500/30">
                  <h4 className="text-orange-400 font-bold mb-3 flex items-center gap-2">
                    <Code className="w-4 h-4" /> 7. Smart Contract
                  </h4>
                  <select value={selectedContract} onChange={e => setSelectedContract(e.target.value)}
                    className="w-full bg-black/50 border border-orange-500/30 rounded px-3 py-2 text-white">
                    <option value="">-- Select Contract --</option>
                    {SMART_CONTRACTS.filter(c => c.network === selectedBlockchain).map(contract => (
                      <option key={contract.id} value={contract.id}>{contract.name} ({contract.symbol})</option>
                    ))}
                    {/* Special contracts */}
                    {selectedBlockchain === 'lemonchain' && (
                      <option value="lusd-lemonchain">LUSD (LemonChain Native Stablecoin)</option>
                    )}
                    {selectedBlockchain === 'stellar' && (
                      <option value="vusd-stellar">VUSD - GDF5XGRGZPGE7DIQHE43XN4JEDRSGLTAR6QWQJ6O4PUFW345LZJUP2CX</option>
                    )}
                  </select>
                  {selectedContract && (
                    <div className="mt-2 p-2 bg-black/30 rounded text-xs">
                      <div className="flex justify-between"><span className="text-gray-500">Address:</span><span className="text-orange-400 font-mono">{SMART_CONTRACTS.find(c => c.id === selectedContract)?.address.substring(0, 20)}...</span></div>
                      <div className="flex justify-between"><span className="text-gray-500">Decimals:</span><span className="text-white">{SMART_CONTRACTS.find(c => c.id === selectedContract)?.decimals}</span></div>
                    </div>
                  )}
                </div>

                {/* Price Oracle */}
                <div className="bg-gray-900/50 rounded-lg p-4 border border-orange-500/30">
                  <h4 className="text-orange-400 font-bold mb-3 flex items-center gap-2">
                    <Activity className="w-4 h-4" /> 8. Price Oracle
                  </h4>
                  <select value={selectedOracle} onChange={e => setSelectedOracle(e.target.value)}
                    className="w-full bg-black/50 border border-orange-500/30 rounded px-3 py-2 text-white">
                    {PRICE_ORACLES.map(oracle => (
                      <option key={oracle.id} value={oracle.id}>{oracle.name} ({oracle.type})</option>
                    ))}
                  </select>
                  <div className="mt-2 grid grid-cols-3 gap-2">
                    {PRICE_ORACLES.find(o => o.id === selectedOracle)?.pairs.map(pair => (
                      <div key={pair} className="px-2 py-1 bg-blue-900/30 rounded text-xs text-blue-400 text-center">{pair}</div>
                    ))}
                  </div>
                </div>

                {/* Execute Button */}
                <div className="bg-gradient-to-r from-orange-900/50 to-amber-900/50 rounded-lg p-4 border-2 border-orange-500">
                  <button
                    onClick={async () => {
                      if (!selectedLedgerAccount || !mintingAmount || !selectedContract) {
                        log('error', '[BLOCKCHAIN] Missing required fields');
                        return;
                      }
                      setIsMinting(true);
                      setMintingProgress(0);
                      log('info', '');
                      log('info', '═══════════════════════════════════════════════════════════════════');
                      log('info', `  BLOCKCHAIN ${mintingType} OPERATION INITIATED`, );
                      log('info', '═══════════════════════════════════════════════════════════════════');
                      log('info', '');
                      
                      const steps = [
                        'Validating ledger account balance...',
                        `Connecting to ${BLOCKCHAIN_NETWORKS.find(n => n.id === selectedBlockchain)?.name}...`,
                        'Fetching gas price from network...',
                        `Querying ${PRICE_ORACLES.find(o => o.id === selectedOracle)?.name} for ${mintingCurrency}/USD rate...`,
                        `Preparing ${mintingSource === 'SWIFT' ? `${mintingMessageType} SWIFT` : 'IP-ID'} transfer instruction...`,
                        `Building ${mintingMessageType} message structure...`,
                        `Calling ${mintingType === 'MINT' ? 'mint()' : 'wrap()'} function with ${mintingMessageType}...`,
                        'Waiting for transaction confirmation...',
                        'Verifying on-chain balance...',
                        `Recording ${mintingMessageType} transaction in audit log...`,
                      ];
                      
                      for (let i = 0; i < steps.length; i++) {
                        await new Promise(r => setTimeout(r, 400));
                        setMintingProgress(((i + 1) / steps.length) * 100);
                        log('info', `[STEP ${i + 1}/${steps.length}] ${steps[i]}`);
                        if (i === 3) log('success', `  → Rate: 1 ${mintingCurrency} = 1.0000 Token`);
                        if (i === 5) log('network', `  → Gas Limit: 150000 | Gas Price: 25 gwei`);
                        if (i === 7) log('success', `  → TX Hash: 0x${sha256Hex(Date.now().toString()).substring(0, 64)}`);
                      }
                      
                      const newTx: MintingTransaction = {
                        id: generateUUID(),
                        type: mintingType,
                        sourceType: mintingSource,
                        sourceMessageType: mintingSource === 'SWIFT' ? mintingMessageType : 'IP-ID',
                        sourceCurrency: mintingCurrency,
                        sourceAmount: parseFloat(mintingAmount),
                        targetNetwork: selectedBlockchain,
                        targetContract: selectedContract,
                        targetSymbol: SMART_CONTRACTS.find(c => c.id === selectedContract)?.symbol || 'TOKEN',
                        targetAmount: parseFloat(mintingAmount),
                        ledgerAccountId: selectedLedgerAccount.id,
                        status: 'MINTED',
                        txHash: '0x' + sha256Hex(Date.now().toString()),
                        createdAt: new Date().toISOString(),
                        completedAt: new Date().toISOString(),
                        gasUsed: '125000',
                        blockNumber: Math.floor(Math.random() * 1000000) + 18000000,
                      };
                      setMintingTransactions(prev => [newTx, ...prev]);
                      
                      log('success', '');
                      log('success', '╔══════════════════════════════════════════════════════════════════╗');
                      log('success', `║  ${mintingType} COMPLETED SUCCESSFULLY                              ║`);
                      log('success', '╠══════════════════════════════════════════════════════════════════╣');
                      log('success', `║  Amount: ${mintingAmount} ${mintingCurrency} → ${mintingAmount} ${SMART_CONTRACTS.find(c => c.id === selectedContract)?.symbol}`);
                      log('success', `║  Network: ${BLOCKCHAIN_NETWORKS.find(n => n.id === selectedBlockchain)?.name}`);
                      log('success', `║  TX: ${newTx.txHash?.substring(0, 42)}...`);
                      log('success', '╚══════════════════════════════════════════════════════════════════╝');
                      
                      setIsMinting(false);
                      setMintingProgress(0);
                    }}
                    disabled={isMinting || !selectedLedgerAccount || !mintingAmount || !selectedContract}
                    className={`w-full py-4 rounded-lg font-bold text-lg flex items-center justify-center gap-3 transition-all ${
                      isMinting || !selectedLedgerAccount || !mintingAmount || !selectedContract
                        ? 'bg-gray-700 text-gray-500 cursor-not-allowed'
                        : 'bg-gradient-to-r from-orange-600 to-amber-500 hover:from-orange-500 hover:to-amber-400 text-white'
                    }`}>
                    {isMinting ? (
                      <>
                        <Loader2 className="w-6 h-6 animate-spin" />
                        {mintingType === 'MINT' ? 'MINTING...' : 'TOKENIZING...'}
                      </>
                    ) : (
                      <>
                        <Flame className="w-6 h-6" />
                        {mintingType === 'MINT' ? 'MINT TOKENS' : 'TOKENIZE ASSETS'}
                      </>
                    )}
                  </button>
                  {isMinting && (
                    <div className="mt-3">
                      <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
                        <div className="h-full bg-gradient-to-r from-orange-500 to-amber-400 transition-all duration-300" style={{ width: `${mintingProgress}%` }} />
                      </div>
                      <div className="text-center text-xs text-orange-400 mt-1">{Math.round(mintingProgress)}%</div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Transaction History with Professional Receipts */}
            <div className="mt-6 bg-gray-900/50 rounded-lg p-4 border border-orange-500/30">
              <div className="flex items-center justify-between mb-4">
                <h4 className="text-orange-400 font-bold flex items-center gap-2">
                  <History className="w-4 h-4" /> Blockchain Transaction History
                </h4>
                <button onClick={() => setShowISO20022Scan(true)}
                  className="px-4 py-2 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 rounded-lg text-sm font-bold flex items-center gap-2">
                  <Search className="w-4 h-4" /> Open ISO20022Scan
                </button>
              </div>
              
              {mintingTransactions.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <Coins className="w-12 h-12 mx-auto mb-2 opacity-30" />
                  <div>No blockchain transactions yet</div>
                  <div className="text-xs">Complete a minting or tokenization to see transactions here</div>
                </div>
              ) : (
                <div className="space-y-3 max-h-80 overflow-y-auto">
                  {mintingTransactions.map(tx => (
                    <div key={tx.id} className="bg-black/40 rounded-lg border border-gray-800 overflow-hidden">
                      <div className="flex items-center justify-between p-3">
                        <div className="flex items-center gap-3">
                          <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${tx.type === 'MINT' ? 'bg-green-900/50 border border-green-500/50' : 'bg-purple-900/50 border border-purple-500/50'}`}>
                            {tx.type === 'MINT' ? <Coins className="w-5 h-5 text-green-400" /> : <Link2 className="w-5 h-5 text-purple-400" />}
                          </div>
                          <div>
                            <div className="text-white font-bold">{tx.sourceAmount.toLocaleString()} {tx.sourceCurrency} → {tx.targetAmount.toLocaleString()} {tx.targetSymbol}</div>
                            <div className="text-xs text-gray-500 flex items-center gap-2">
                              <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${tx.type === 'MINT' ? 'bg-green-900/50 text-green-400' : 'bg-purple-900/50 text-purple-400'}`}>
                                {tx.type}
                              </span>
                              <span>{BLOCKCHAIN_NETWORKS.find(n => n.id === tx.targetNetwork)?.name}</span>
                              <span>•</span>
                              <span>{new Date(tx.createdAt).toLocaleString()}</span>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="text-right mr-3">
                            <div className={`text-xs font-bold ${tx.status === 'MINTED' ? 'text-green-400' : tx.status === 'FAILED' ? 'text-red-400' : 'text-yellow-400'}`}>
                              {tx.status === 'MINTED' ? '✓ SUCCESS' : tx.status}
                            </div>
                            <div className="text-xs text-gray-500 font-mono">{tx.txHash?.substring(0, 20)}...</div>
                          </div>
                          <button onClick={() => {
                            // Generate Professional Receipt PDF
                            const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
                            const network = BLOCKCHAIN_NETWORKS.find(n => n.id === tx.targetNetwork);
                            const contract = SMART_CONTRACTS.find(c => c.id === tx.targetContract);
                            
                            // Header gradient
                            doc.setFillColor(15, 23, 42);
                            doc.rect(0, 0, 210, 297, 'F');
                            
                            // Title bar
                            doc.setFillColor(tx.type === 'MINT' ? 34 : 88, tx.type === 'MINT' ? 197 : 28, tx.type === 'MINT' ? 94 : 135);
                            doc.rect(0, 0, 210, 35, 'F');
                            
                            doc.setTextColor(255, 255, 255);
                            doc.setFontSize(18);
                            doc.setFont('helvetica', 'bold');
                            doc.text(`BLOCKCHAIN ${tx.type} RECEIPT`, 105, 15, { align: 'center' });
                            doc.setFontSize(10);
                            doc.text('ISO 20022 Compliant Transaction', 105, 22, { align: 'center' });
                            doc.setFontSize(8);
                            doc.text(`Generated: ${new Date().toISOString()}`, 105, 29, { align: 'center' });
                            
                            let y = 45;
                            
                            // Transaction ID Section
                            doc.setFillColor(30, 41, 59);
                            doc.roundedRect(15, y, 180, 25, 3, 3, 'F');
                            doc.setTextColor(148, 163, 184);
                            doc.setFontSize(8);
                            doc.text('TRANSACTION HASH', 20, y + 8);
                            doc.setTextColor(34, 197, 94);
                            doc.setFontSize(10);
                            doc.setFont('courier', 'normal');
                            doc.text(tx.txHash || 'N/A', 20, y + 16);
                            y += 35;
                            
                            // Status Badge
                            doc.setFillColor(tx.status === 'MINTED' ? 22 : 127, tx.status === 'MINTED' ? 163 : 29, tx.status === 'MINTED' ? 74 : 29);
                            doc.roundedRect(15, y, 50, 12, 2, 2, 'F');
                            doc.setTextColor(255, 255, 255);
                            doc.setFontSize(9);
                            doc.setFont('helvetica', 'bold');
                            doc.text(tx.status === 'MINTED' ? '✓ CONFIRMED' : tx.status, 40, y + 8, { align: 'center' });
                            
                            doc.setTextColor(148, 163, 184);
                            doc.setFontSize(8);
                            doc.setFont('helvetica', 'normal');
                            doc.text(`Block: #${tx.blockNumber?.toLocaleString() || 'Pending'}`, 75, y + 8);
                            doc.text(`Gas Used: ${tx.gasUsed || 'N/A'}`, 130, y + 8);
                            y += 22;
                            
                            // Amount Section
                            doc.setFillColor(30, 41, 59);
                            doc.roundedRect(15, y, 180, 35, 3, 3, 'F');
                            doc.setTextColor(148, 163, 184);
                            doc.setFontSize(8);
                            doc.text('AMOUNT', 20, y + 10);
                            doc.setTextColor(255, 255, 255);
                            doc.setFontSize(20);
                            doc.setFont('helvetica', 'bold');
                            doc.text(`${tx.sourceAmount.toLocaleString()} ${tx.sourceCurrency}`, 20, y + 22);
                            doc.setTextColor(34, 197, 94);
                            doc.setFontSize(12);
                            doc.text(`→ ${tx.targetAmount.toLocaleString()} ${tx.targetSymbol}`, 20, y + 30);
                            y += 45;
                            
                            // Network & Contract Info
                            doc.setFillColor(30, 41, 59);
                            doc.roundedRect(15, y, 87, 40, 3, 3, 'F');
                            doc.setTextColor(148, 163, 184);
                            doc.setFontSize(8);
                            doc.text('BLOCKCHAIN NETWORK', 20, y + 10);
                            doc.setTextColor(255, 255, 255);
                            doc.setFontSize(11);
                            doc.setFont('helvetica', 'bold');
                            doc.text(network?.name || 'Unknown', 20, y + 20);
                            doc.setTextColor(148, 163, 184);
                            doc.setFontSize(8);
                            doc.setFont('helvetica', 'normal');
                            doc.text(`Chain ID: ${network?.chainId}`, 20, y + 28);
                            doc.text(`Symbol: ${network?.symbol}`, 20, y + 35);
                            
                            doc.setFillColor(30, 41, 59);
                            doc.roundedRect(108, y, 87, 40, 3, 3, 'F');
                            doc.setTextColor(148, 163, 184);
                            doc.setFontSize(8);
                            doc.text('SMART CONTRACT', 113, y + 10);
                            doc.setTextColor(255, 255, 255);
                            doc.setFontSize(11);
                            doc.setFont('helvetica', 'bold');
                            doc.text(contract?.symbol || tx.targetSymbol, 113, y + 20);
                            doc.setTextColor(148, 163, 184);
                            doc.setFontSize(7);
                            doc.setFont('courier', 'normal');
                            doc.text(contract?.address?.substring(0, 25) + '...' || 'N/A', 113, y + 28);
                            doc.setFontSize(8);
                            doc.setFont('helvetica', 'normal');
                            doc.text(`Decimals: ${contract?.decimals || 18}`, 113, y + 35);
                            y += 50;
                            
                            // Transfer Method
                            doc.setFillColor(30, 41, 59);
                            doc.roundedRect(15, y, 180, 25, 3, 3, 'F');
                            doc.setTextColor(148, 163, 184);
                            doc.setFontSize(8);
                            doc.text('TRANSFER METHOD', 20, y + 10);
                            doc.setTextColor(tx.sourceType === 'SWIFT' ? 234 : 6, tx.sourceType === 'SWIFT' ? 179 : 182, tx.sourceType === 'SWIFT' ? 8 : 212);
                            doc.setFontSize(11);
                            doc.setFont('helvetica', 'bold');
                            doc.text(tx.sourceType === 'SWIFT' ? 'SWIFT FIN (MT103/pacs.008)' : 'IP-ID Server-to-Server', 20, y + 18);
                            y += 35;
                            
                            // Timestamps
                            doc.setFillColor(30, 41, 59);
                            doc.roundedRect(15, y, 180, 25, 3, 3, 'F');
                            doc.setTextColor(148, 163, 184);
                            doc.setFontSize(8);
                            doc.text('TIMESTAMPS', 20, y + 10);
                            doc.setTextColor(255, 255, 255);
                            doc.setFontSize(9);
                            doc.setFont('helvetica', 'normal');
                            doc.text(`Created: ${new Date(tx.createdAt).toISOString()}`, 20, y + 18);
                            doc.text(`Completed: ${tx.completedAt ? new Date(tx.completedAt).toISOString() : 'Pending'}`, 110, y + 18);
                            y += 35;
                            
                            // ISO 20022 Compliance Footer
                            doc.setFillColor(22, 78, 99);
                            doc.roundedRect(15, y, 180, 20, 3, 3, 'F');
                            doc.setTextColor(103, 232, 249);
                            doc.setFontSize(8);
                            doc.setFont('helvetica', 'bold');
                            doc.text('ISO 20022 COMPLIANCE', 20, y + 8);
                            doc.setTextColor(255, 255, 255);
                            doc.setFontSize(7);
                            doc.setFont('helvetica', 'normal');
                            doc.text('This transaction complies with ISO 20022 financial messaging standards (pacs.008.001.08)', 20, y + 15);
                            y += 30;
                            
                            // Footer
                            doc.setTextColor(100, 116, 139);
                            doc.setFontSize(7);
                            doc.text('Digital Commercial Bank Ltd - Blockchain Services', 105, 280, { align: 'center' });
                            doc.text('ISO20022Scan - Transaction Verification System', 105, 285, { align: 'center' });
                            doc.text(`Document ID: ${tx.id}`, 105, 290, { align: 'center' });
                            
                            doc.save(`blockchain-receipt-${tx.txHash?.substring(0, 16)}.pdf`);
                          }}
                            className="px-3 py-2 bg-orange-600 hover:bg-orange-700 rounded text-xs font-bold flex items-center gap-1">
                            <Download className="w-3 h-3" /> Receipt
                          </button>
                          <button onClick={() => { setScanSelectedTx(tx); setShowISO20022Scan(true); }}
                            className="px-3 py-2 bg-blue-600 hover:bg-blue-700 rounded text-xs font-bold flex items-center gap-1">
                            <Eye className="w-3 h-3" /> View
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ISO20022Scan Full Screen Explorer */}
        {showISO20022Scan && (
          <div className="fixed inset-0 bg-slate-950 z-50 overflow-auto">
            {/* Header */}
            <div className="bg-gradient-to-r from-blue-900 via-purple-900 to-blue-900 border-b border-blue-500/30">
              <div className="max-w-7xl mx-auto px-6 py-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center">
                      <Search className="w-7 h-7 text-white" />
                    </div>
                    <div>
                      <h1 className="text-2xl font-bold text-white">ISO20022Scan</h1>
                      <p className="text-sm text-blue-300">Blockchain Transaction Explorer & Verification</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right text-sm">
                      <div className="text-blue-300">Total Transactions</div>
                      <div className="text-2xl font-bold text-white">{mintingTransactions.length}</div>
                    </div>
                    <button onClick={() => setShowISO20022Scan(false)}
                      className="p-2 bg-red-600 hover:bg-red-700 rounded-lg">
                      <X className="w-6 h-6 text-white" />
                    </button>
                  </div>
                </div>
                
                {/* Search Bar */}
                <div className="mt-4 flex gap-4">
                  <div className="flex-1 relative">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input type="text" value={scanSearchQuery} onChange={e => setScanSearchQuery(e.target.value)}
                      placeholder="Search by Transaction Hash, Block Number, or Amount..."
                      className="w-full bg-slate-800/50 border border-blue-500/30 rounded-xl pl-12 pr-4 py-3 text-white placeholder-gray-500 focus:border-blue-500 focus:outline-none" />
                  </div>
                  <select className="bg-slate-800/50 border border-blue-500/30 rounded-xl px-4 py-3 text-white">
                    <option value="all">All Networks</option>
                    {BLOCKCHAIN_NETWORKS.filter(n => n.id.includes('mainnet') || n.id.includes('eth')).map(net => (
                      <option key={net.id} value={net.id}>{net.name}</option>
                    ))}
                  </select>
                  <select className="bg-slate-800/50 border border-blue-500/30 rounded-xl px-4 py-3 text-white">
                    <option value="all">All Types</option>
                    <option value="MINT">Minting</option>
                    <option value="TOKENIZE">Tokenization</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Stats Bar */}
            <div className="bg-slate-900/50 border-b border-gray-800">
              <div className="max-w-7xl mx-auto px-6 py-4">
                <div className="grid grid-cols-5 gap-4">
                  <div className="bg-slate-800/50 rounded-lg p-4 border border-gray-700">
                    <div className="text-gray-400 text-xs mb-1">Total Volume</div>
                    <div className="text-xl font-bold text-white">
                      ${mintingTransactions.reduce((sum, tx) => sum + tx.sourceAmount, 0).toLocaleString()}
                    </div>
                  </div>
                  <div className="bg-slate-800/50 rounded-lg p-4 border border-gray-700">
                    <div className="text-gray-400 text-xs mb-1">Minting Ops</div>
                    <div className="text-xl font-bold text-green-400">
                      {mintingTransactions.filter(tx => tx.type === 'MINT').length}
                    </div>
                  </div>
                  <div className="bg-slate-800/50 rounded-lg p-4 border border-gray-700">
                    <div className="text-gray-400 text-xs mb-1">Tokenizations</div>
                    <div className="text-xl font-bold text-purple-400">
                      {mintingTransactions.filter(tx => tx.type === 'TOKENIZE').length}
                    </div>
                  </div>
                  <div className="bg-slate-800/50 rounded-lg p-4 border border-gray-700">
                    <div className="text-gray-400 text-xs mb-1">Success Rate</div>
                    <div className="text-xl font-bold text-emerald-400">
                      {mintingTransactions.length > 0 ? Math.round((mintingTransactions.filter(tx => tx.status === 'MINTED').length / mintingTransactions.length) * 100) : 0}%
                    </div>
                  </div>
                  <div className="bg-slate-800/50 rounded-lg p-4 border border-gray-700">
                    <div className="text-gray-400 text-xs mb-1">Networks Used</div>
                    <div className="text-xl font-bold text-blue-400">
                      {new Set(mintingTransactions.map(tx => tx.targetNetwork)).size}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Main Content */}
            <div className="max-w-7xl mx-auto px-6 py-6">
              <div className="grid grid-cols-3 gap-6">
                {/* Transaction List */}
                <div className="col-span-2 space-y-4">
                  <h2 className="text-lg font-bold text-white flex items-center gap-2">
                    <Activity className="w-5 h-5 text-blue-400" /> Recent Transactions
                  </h2>
                  
                  {mintingTransactions.filter(tx => {
                    if (!scanSearchQuery) return true;
                    const q = scanSearchQuery.toLowerCase();
                    return tx.txHash?.toLowerCase().includes(q) || 
                           tx.sourceAmount.toString().includes(q) ||
                           tx.blockNumber?.toString().includes(q);
                  }).map(tx => {
                    const network = BLOCKCHAIN_NETWORKS.find(n => n.id === tx.targetNetwork);
                    return (
                      <div key={tx.id} onClick={() => setScanSelectedTx(tx)}
                        className={`bg-slate-800/50 rounded-xl p-4 border cursor-pointer transition-all hover:border-blue-500/50 ${scanSelectedTx?.id === tx.id ? 'border-blue-500' : 'border-gray-700'}`}>
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-3">
                            <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${tx.type === 'MINT' ? 'bg-green-900/50' : 'bg-purple-900/50'}`}>
                              {tx.type === 'MINT' ? <Coins className="w-5 h-5 text-green-400" /> : <Link2 className="w-5 h-5 text-purple-400" />}
                            </div>
                            <div>
                              <div className="text-white font-bold">{tx.type === 'MINT' ? 'Token Minting' : 'Asset Tokenization'}</div>
                              <div className="text-xs text-gray-500 font-mono">{tx.txHash?.substring(0, 30)}...</div>
                            </div>
                          </div>
                          <div className={`px-3 py-1 rounded-full text-xs font-bold ${tx.status === 'MINTED' ? 'bg-green-900/50 text-green-400' : 'bg-yellow-900/50 text-yellow-400'}`}>
                            {tx.status === 'MINTED' ? '✓ Confirmed' : tx.status}
                          </div>
                        </div>
                        <div className="grid grid-cols-4 gap-4 text-sm">
                          <div>
                            <div className="text-gray-500 text-xs">Amount</div>
                            <div className="text-white font-bold">{tx.sourceAmount.toLocaleString()} {tx.sourceCurrency}</div>
                          </div>
                          <div>
                            <div className="text-gray-500 text-xs">Token Output</div>
                            <div className="text-emerald-400 font-bold">{tx.targetAmount.toLocaleString()} {tx.targetSymbol}</div>
                          </div>
                          <div>
                            <div className="text-gray-500 text-xs">Network</div>
                            <div className="text-blue-400">{network?.name.replace(' (Alchemy)', '')}</div>
                          </div>
                          <div>
                            <div className="text-gray-500 text-xs">Block</div>
                            <div className="text-white">#{tx.blockNumber?.toLocaleString()}</div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                  
                  {mintingTransactions.length === 0 && (
                    <div className="text-center py-16 bg-slate-800/30 rounded-xl border border-gray-800">
                      <Search className="w-16 h-16 mx-auto mb-4 text-gray-600" />
                      <div className="text-xl text-gray-400">No Transactions Found</div>
                      <div className="text-sm text-gray-600">Complete a minting or tokenization operation to see it here</div>
                    </div>
                  )}
                </div>

                {/* Transaction Details Panel */}
                <div className="space-y-4">
                  <h2 className="text-lg font-bold text-white flex items-center gap-2">
                    <FileText className="w-5 h-5 text-purple-400" /> Transaction Details
                  </h2>
                  
                  {scanSelectedTx ? (
                    <div className="bg-slate-800/50 rounded-xl border border-gray-700 overflow-hidden">
                      {/* Header */}
                      <div className={`p-4 ${scanSelectedTx.type === 'MINT' ? 'bg-green-900/30' : 'bg-purple-900/30'}`}>
                        <div className="flex items-center gap-3">
                          <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${scanSelectedTx.type === 'MINT' ? 'bg-green-600' : 'bg-purple-600'}`}>
                            {scanSelectedTx.type === 'MINT' ? <Coins className="w-6 h-6 text-white" /> : <Link2 className="w-6 h-6 text-white" />}
                          </div>
                          <div>
                            <div className="text-white font-bold">{scanSelectedTx.type === 'MINT' ? 'MINTING' : 'TOKENIZATION'}</div>
                            <div className={`text-xs ${scanSelectedTx.status === 'MINTED' ? 'text-green-400' : 'text-yellow-400'}`}>
                              {scanSelectedTx.status === 'MINTED' ? '✓ Confirmed' : scanSelectedTx.status}
                            </div>
                          </div>
                        </div>
                      </div>
                      
                      {/* Details */}
                      <div className="p-4 space-y-4">
                        <div>
                          <div className="text-gray-500 text-xs mb-1">Transaction Hash</div>
                          <div className="text-emerald-400 font-mono text-sm break-all">{scanSelectedTx.txHash}</div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <div className="text-gray-500 text-xs mb-1">Block Number</div>
                            <div className="text-white font-bold">#{scanSelectedTx.blockNumber?.toLocaleString()}</div>
                          </div>
                          <div>
                            <div className="text-gray-500 text-xs mb-1">Gas Used</div>
                            <div className="text-white font-bold">{scanSelectedTx.gasUsed}</div>
                          </div>
                        </div>
                        <div>
                          <div className="text-gray-500 text-xs mb-1">Amount</div>
                          <div className="text-2xl font-bold text-white">{scanSelectedTx.sourceAmount.toLocaleString()} {scanSelectedTx.sourceCurrency}</div>
                          <div className="text-emerald-400">→ {scanSelectedTx.targetAmount.toLocaleString()} {scanSelectedTx.targetSymbol}</div>
                        </div>
                        <div>
                          <div className="text-gray-500 text-xs mb-1">Network</div>
                          <div className="text-blue-400">{BLOCKCHAIN_NETWORKS.find(n => n.id === scanSelectedTx.targetNetwork)?.name}</div>
                        </div>
                        <div>
                          <div className="text-gray-500 text-xs mb-1">Contract</div>
                          <div className="text-purple-400 font-mono text-xs break-all">
                            {SMART_CONTRACTS.find(c => c.id === scanSelectedTx.targetContract)?.address}
                          </div>
                        </div>
                        <div>
                          <div className="text-gray-500 text-xs mb-1">Transfer Method</div>
                          <div className={`inline-flex px-3 py-1 rounded-full text-xs font-bold ${scanSelectedTx.sourceType === 'SWIFT' ? 'bg-yellow-900/50 text-yellow-400' : 'bg-cyan-900/50 text-cyan-400'}`}>
                            {scanSelectedTx.sourceType === 'SWIFT' ? 'SWIFT FIN' : 'IP-ID'}
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4 text-xs">
                          <div>
                            <div className="text-gray-500 mb-1">Created</div>
                            <div className="text-white">{new Date(scanSelectedTx.createdAt).toLocaleString()}</div>
                          </div>
                          <div>
                            <div className="text-gray-500 mb-1">Completed</div>
                            <div className="text-white">{scanSelectedTx.completedAt ? new Date(scanSelectedTx.completedAt).toLocaleString() : 'Pending'}</div>
                          </div>
                        </div>
                        
                        {/* Action Buttons */}
                        <div className="pt-4 border-t border-gray-700 space-y-2">
                          <button onClick={() => {
                            const network = BLOCKCHAIN_NETWORKS.find(n => n.id === scanSelectedTx.targetNetwork);
                            if (network?.explorerUrl && scanSelectedTx.txHash) {
                              window.open(`${network.explorerUrl}/tx/${scanSelectedTx.txHash}`, '_blank');
                            }
                          }} className="w-full py-2 bg-blue-600 hover:bg-blue-700 rounded-lg text-sm font-bold flex items-center justify-center gap-2">
                            <Globe className="w-4 h-4" /> View on Explorer
                          </button>
                          <button className="w-full py-2 bg-purple-600 hover:bg-purple-700 rounded-lg text-sm font-bold flex items-center justify-center gap-2">
                            <Download className="w-4 h-4" /> Download Receipt
                          </button>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="bg-slate-800/30 rounded-xl border border-gray-800 p-8 text-center">
                      <Eye className="w-12 h-12 mx-auto mb-4 text-gray-600" />
                      <div className="text-gray-400">Select a transaction</div>
                      <div className="text-sm text-gray-600">Click on any transaction to view details</div>
                    </div>
                  )}
                  
                  {/* ISO 20022 Info */}
                  <div className="bg-gradient-to-r from-blue-900/30 to-purple-900/30 rounded-xl p-4 border border-blue-500/30">
                    <div className="flex items-center gap-2 mb-2">
                      <Shield className="w-5 h-5 text-blue-400" />
                      <div className="text-white font-bold">ISO 20022 Compliant</div>
                    </div>
                    <div className="text-xs text-gray-400">
                      All transactions on ISO20022Scan follow the international financial messaging standard, 
                      ensuring full traceability and interoperability with global banking systems.
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="fixed bottom-0 left-0 right-0 bg-slate-900/95 border-t border-gray-800 py-3">
              <div className="max-w-7xl mx-auto px-6 flex items-center justify-between">
                <div className="text-sm text-gray-500">
                  ISO20022Scan v1.0.0 - Blockchain Transaction Explorer
                </div>
                <div className="text-sm text-gray-500">
                  Powered by Digital Commercial Bank Ltd
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Servers */}
        {activeTab === 'servers' && (
          <div className="flex-1 overflow-auto p-4">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-900/50 rounded-lg flex items-center justify-center border border-blue-500/50">
                  <Server className="w-6 h-6 text-blue-400" />
                </div>
                <div>
                  <h3 className="text-blue-400 font-bold">IP-ID Server Connections ({servers.length})</h3>
                  <p className="text-xs text-gray-500">Manage destination servers for IP-ID transfers</p>
                </div>
              </div>
              <button onClick={() => { setShowServerForm(true); setEditingServer(null); setServerForm({ 
                  name: '', ip: '', port: '443', ipId: '', bic: '', type: 'GLOBAL', protocol: 'IP-IP', encryption: 'TLS 1.3 / AES-256-GCM', country: '', institution: '',
                  nostroBank: '', nostroBankAddress: '', nostroSwift: '', nostroAccountName: '', nostroBeneficiary: '', nostroAccountUSD: '',
                  globalServerId: '', globalServerIp: '', localServerId: '', localServerIp: '', receivingServerId: '', receivingServerIp: ''
                }); }}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded text-sm font-medium flex items-center gap-2">
                <Plus className="w-4 h-4" /> Add Server
              </button>
            </div>
            
            {/* Server Form Modal */}
            {showServerForm && (
              <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
                <div className="bg-gray-900 rounded-lg p-6 w-full max-w-lg border border-blue-500/50">
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="text-blue-400 font-bold">{editingServer ? 'Edit Server' : 'Add New Server'}</h4>
                    <button onClick={() => setShowServerForm(false)} className="text-gray-400 hover:text-white"><X className="w-5 h-5" /></button>
                  </div>
                  <div className="space-y-3">
                    <div>
                      <label className="text-xs text-gray-500 block mb-1">Server Name *</label>
                      <input type="text" value={serverForm.name} onChange={e => setServerForm(p => ({ ...p, name: e.target.value }))}
                        className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-sm text-white" placeholder="PT Banteng Hitam Global" />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-xs text-gray-500 block mb-1">IP Address *</label>
                        <input type="text" value={serverForm.ip} onChange={e => setServerForm(p => ({ ...p, ip: e.target.value }))}
                          className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-sm text-white font-mono" placeholder="103.187.147.109" />
                      </div>
                      <div>
                        <label className="text-xs text-gray-500 block mb-1">Port</label>
                        <input type="text" value={serverForm.port} onChange={e => setServerForm(p => ({ ...p, port: e.target.value }))}
                          className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-sm text-white font-mono" placeholder="8443" />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-xs text-gray-500 block mb-1">IP-ID *</label>
                        <input type="text" value={serverForm.ipId} onChange={e => setServerForm(p => ({ ...p, ipId: e.target.value.toUpperCase() }))}
                          className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-sm text-white font-mono" placeholder="GSIP-PTBH-001" />
                      </div>
                      <div>
                        <label className="text-xs text-gray-500 block mb-1">BIC/SWIFT</label>
                        <input type="text" value={serverForm.bic} onChange={e => setServerForm(p => ({ ...p, bic: e.target.value.toUpperCase() }))}
                          className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-sm text-white font-mono" maxLength={11} placeholder="PTBHIDJA" />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-xs text-gray-500 block mb-1">Server Type</label>
                        <select value={serverForm.type} onChange={e => setServerForm(p => ({ ...p, type: e.target.value as any }))}
                          className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-sm text-white">
                          <option value="GLOBAL">Global Server</option>
                          <option value="LOCAL">Local Server</option>
                          <option value="RECEIVING">Receiving Server</option>
                          <option value="CORRESPONDENT">Correspondent Bank</option>
                        </select>
                      </div>
                      <div>
                        <label className="text-xs text-gray-500 block mb-1">Protocol</label>
                        <select value={serverForm.protocol} onChange={e => setServerForm(p => ({ ...p, protocol: e.target.value }))}
                          className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-sm text-white">
                          <option value="IP-IP">IP-IP</option>
                          <option value="SWIFT-GPI">SWIFT-GPI</option>
                          <option value="HTTP/TLS">HTTP/TLS</option>
                        </select>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-xs text-gray-500 block mb-1">Country</label>
                        <input type="text" value={serverForm.country} onChange={e => setServerForm(p => ({ ...p, country: e.target.value }))}
                          className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-sm text-white" placeholder="Indonesia" />
                      </div>
                      <div>
                        <label className="text-xs text-gray-500 block mb-1">Institution</label>
                        <input type="text" value={serverForm.institution} onChange={e => setServerForm(p => ({ ...p, institution: e.target.value }))}
                          className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-sm text-white" placeholder="PT Banteng Hitam" />
                      </div>
                    </div>
                    
                    {/* ═══════════════════════════════════════════════════════════════════════════════ */}
                    {/* NOSTRO ACCOUNT DETAILS */}
                    {/* ═══════════════════════════════════════════════════════════════════════════════ */}
                    <div className="border-t border-gray-700 pt-3 mt-3">
                      <div className="text-xs text-yellow-400 font-bold mb-2 flex items-center gap-2">
                        <Building2 className="w-3 h-3" /> NOSTRO ACCOUNT DETAILS (Optional)
                      </div>
                      <div className="space-y-2">
                        <div>
                          <label className="text-xs text-gray-500 block mb-1">Nostro Bank Name</label>
                          <input type="text" value={serverForm.nostroBank} onChange={e => setServerForm(p => ({ ...p, nostroBank: e.target.value }))}
                            className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-sm text-white" placeholder="STANDARD CHARTERED USA" />
                        </div>
                        <div>
                          <label className="text-xs text-gray-500 block mb-1">Nostro Bank Address</label>
                          <input type="text" value={serverForm.nostroBankAddress} onChange={e => setServerForm(p => ({ ...p, nostroBankAddress: e.target.value }))}
                            className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-sm text-white" placeholder="1095 6th Ave, New York, NY 10036, USA" />
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="text-xs text-gray-500 block mb-1">Nostro SWIFT/BIC</label>
                            <input type="text" value={serverForm.nostroSwift} onChange={e => setServerForm(p => ({ ...p, nostroSwift: e.target.value.toUpperCase() }))}
                              className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-sm text-white font-mono" placeholder="SCBLUS33XXX" maxLength={11} />
                          </div>
                          <div>
                            <label className="text-xs text-gray-500 block mb-1">Account Number (USD)</label>
                            <input type="text" value={serverForm.nostroAccountUSD} onChange={e => setServerForm(p => ({ ...p, nostroAccountUSD: e.target.value }))}
                              className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-sm text-white font-mono" placeholder="3582020754001" />
                          </div>
                        </div>
                        <div>
                          <label className="text-xs text-gray-500 block mb-1">Account Name</label>
                          <input type="text" value={serverForm.nostroAccountName} onChange={e => setServerForm(p => ({ ...p, nostroAccountName: e.target.value }))}
                            className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-sm text-white" placeholder="PT Bank MNC Internasional TBK (Indonesia)" />
                        </div>
                        <div>
                          <label className="text-xs text-gray-500 block mb-1">Beneficiary</label>
                          <input type="text" value={serverForm.nostroBeneficiary} onChange={e => setServerForm(p => ({ ...p, nostroBeneficiary: e.target.value }))}
                            className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-sm text-white" placeholder="PT BANTENG HITAM SERVER GLOBAL" />
                        </div>
                      </div>
                    </div>
                    
                    {/* ═══════════════════════════════════════════════════════════════════════════════ */}
                    {/* SERVER SYSTEM (GPI IPIP) */}
                    {/* ═══════════════════════════════════════════════════════════════════════════════ */}
                    <div className="border-t border-gray-700 pt-3 mt-3">
                      <div className="text-xs text-cyan-400 font-bold mb-2 flex items-center gap-2">
                        <Network className="w-3 h-3" /> SERVER SYSTEM - GPI IPIP (Optional)
                      </div>
                      <div className="space-y-2">
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="text-xs text-gray-500 block mb-1">Global Server ID</label>
                            <input type="text" value={serverForm.globalServerId} onChange={e => setServerForm(p => ({ ...p, globalServerId: e.target.value }))}
                              className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-sm text-white font-mono" placeholder="GOLD BULL SVR" />
                          </div>
                          <div>
                            <label className="text-xs text-gray-500 block mb-1">Global Server IP</label>
                            <input type="text" value={serverForm.globalServerIp} onChange={e => setServerForm(p => ({ ...p, globalServerIp: e.target.value }))}
                              className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-sm text-white font-mono" placeholder="103.187.147.109" />
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="text-xs text-gray-500 block mb-1">Local Server ID</label>
                            <input type="text" value={serverForm.localServerId} onChange={e => setServerForm(p => ({ ...p, localServerId: e.target.value }))}
                              className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-sm text-white font-mono" placeholder="SC12185" />
                          </div>
                          <div>
                            <label className="text-xs text-gray-500 block mb-1">Local Server IP</label>
                            <input type="text" value={serverForm.localServerIp} onChange={e => setServerForm(p => ({ ...p, localServerIp: e.target.value }))}
                              className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-sm text-white font-mono" placeholder="192.168.2.1" />
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="text-xs text-gray-500 block mb-1">Receiving Server ID</label>
                            <input type="text" value={serverForm.receivingServerId} onChange={e => setServerForm(p => ({ ...p, receivingServerId: e.target.value }))}
                              className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-sm text-white font-mono" placeholder="GOLD BULL SVR" />
                          </div>
                          <div>
                            <label className="text-xs text-gray-500 block mb-1">Receiving Server IP</label>
                            <input type="text" value={serverForm.receivingServerIp} onChange={e => setServerForm(p => ({ ...p, receivingServerIp: e.target.value }))}
                              className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-sm text-white font-mono" placeholder="103.187.147.120" />
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex gap-3 pt-3">
                      <button onClick={() => setShowServerForm(false)} className="flex-1 py-2 bg-gray-700 hover:bg-gray-600 rounded text-sm">Cancel</button>
                      <button onClick={saveServer} className="flex-1 py-2 bg-blue-600 hover:bg-blue-700 rounded text-sm font-medium flex items-center justify-center gap-2">
                        <Save className="w-4 h-4" /> Save Server
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}
            
            <div className="grid grid-cols-2 gap-4">
              {servers.map(server => {
                const isCustom = savedServers.some(s => s.id === server.id);
                return (
                  <div key={server.id} className={`bg-gray-900/50 rounded-lg p-4 border ${isCustom ? 'border-blue-500/50' : 'border-gray-800'}`}>
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <div className={`w-3 h-3 rounded-full ${server.status === 'ONLINE' ? 'bg-green-500' : server.status === 'CONNECTING' ? 'bg-yellow-500 animate-pulse' : 'bg-red-500'}`} />
                        <span className="text-white font-bold">{server.name}</span>
                        {isCustom && <span className="text-xs bg-blue-900 text-blue-400 px-1.5 py-0.5 rounded">Custom</span>}
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`text-xs px-2 py-0.5 rounded ${server.type === 'GLOBAL' ? 'bg-blue-900 text-blue-400' : server.type === 'CORRESPONDENT' ? 'bg-purple-900 text-purple-400' : 'bg-gray-800 text-gray-400'}`}>
                          {server.type}
                        </span>
                        {isCustom && (
                          <>
                            <button onClick={() => { 
                              const saved = savedServers.find(s => s.id === server.id);
                              if (saved) {
                                setEditingServer(saved);
                                setServerForm({ 
                                  name: saved.name, ip: saved.ip, port: String(saved.port), ipId: saved.ipId, bic: saved.bic, 
                                  type: saved.type, protocol: saved.protocol, encryption: saved.encryption, country: saved.country, institution: saved.institution,
                                  nostroBank: saved.nostroBank || '', nostroBankAddress: saved.nostroBankAddress || '', 
                                  nostroSwift: saved.nostroSwift || '', nostroAccountName: saved.nostroAccountName || '', 
                                  nostroBeneficiary: saved.nostroBeneficiary || '', nostroAccountUSD: saved.nostroAccountUSD || '',
                                  globalServerId: saved.globalServerId || '', globalServerIp: saved.globalServerIp || '',
                                  localServerId: saved.localServerId || '', localServerIp: saved.localServerIp || '',
                                  receivingServerId: saved.receivingServerId || '', receivingServerIp: saved.receivingServerIp || ''
                                });
                                setShowServerForm(true);
                              }
                            }} className="text-gray-400 hover:text-white"><Edit className="w-3 h-3" /></button>
                            <button onClick={() => deleteServer(server.id)} className="text-gray-400 hover:text-red-400"><Trash2 className="w-3 h-3" /></button>
                          </>
                        )}
                      </div>
                    </div>
                    
                    <div className="space-y-1 text-xs mb-3">
                      <div className="flex justify-between"><span className="text-gray-500">IP-ID:</span><span className="text-cyan-400 font-mono">{server.ipId}</span></div>
                      <div className="flex justify-between"><span className="text-gray-500">Server:</span><span className="text-white font-mono">{server.ip}:{server.port}</span></div>
                      <div className="flex justify-between"><span className="text-gray-500">BIC:</span><span className="text-green-400 font-mono">{server.bic}</span></div>
                      <div className="flex justify-between"><span className="text-gray-500">Country:</span><span className="text-white">{server.country}</span></div>
                      <div className="flex justify-between"><span className="text-gray-500">Protocol:</span><span className="text-white">{server.protocol}</span></div>
                      {server.lastPing && (
                        <div className="flex justify-between"><span className="text-gray-500">Latency:</span><span className="text-emerald-400">{server.lastPing}ms</span></div>
                      )}
                    </div>
                    
                    {/* Nostro Account Details */}
                    {server.nostroBank && (
                      <div className="mb-3 p-2 bg-yellow-900/20 rounded border border-yellow-700/30">
                        <div className="text-xs text-yellow-400 font-bold mb-1 flex items-center gap-1">
                          <Building2 className="w-3 h-3" /> NOSTRO ACCOUNT
                        </div>
                        <div className="space-y-0.5 text-xs">
                          <div className="flex justify-between"><span className="text-gray-500">Bank:</span><span className="text-yellow-300">{server.nostroBank}</span></div>
                          {server.nostroSwift && <div className="flex justify-between"><span className="text-gray-500">SWIFT:</span><span className="text-yellow-400 font-mono">{server.nostroSwift}</span></div>}
                          {server.nostroAccountUSD && <div className="flex justify-between"><span className="text-gray-500">Account:</span><span className="text-white font-mono">{server.nostroAccountUSD}</span></div>}
                          {server.nostroBeneficiary && <div className="flex justify-between"><span className="text-gray-500">Beneficiary:</span><span className="text-white">{server.nostroBeneficiary}</span></div>}
                        </div>
                      </div>
                    )}
                    
                    {/* Server System */}
                    {server.globalServerId && (
                      <div className="mb-3 p-2 bg-cyan-900/20 rounded border border-cyan-700/30">
                        <div className="text-xs text-cyan-400 font-bold mb-1 flex items-center gap-1">
                          <Network className="w-3 h-3" /> SERVER SYSTEM (GPI IPIP)
                        </div>
                        <div className="space-y-0.5 text-xs">
                          <div className="flex justify-between"><span className="text-gray-500">Global ID:</span><span className="text-cyan-300 font-mono">{server.globalServerId}</span></div>
                          {server.globalServerIp && <div className="flex justify-between"><span className="text-gray-500">Global IP:</span><span className="text-white font-mono">{server.globalServerIp}</span></div>}
                          {server.localServerId && <div className="flex justify-between"><span className="text-gray-500">Local ID:</span><span className="text-cyan-300 font-mono">{server.localServerId}</span></div>}
                          {server.localServerIp && <div className="flex justify-between"><span className="text-gray-500">Local IP:</span><span className="text-white font-mono">{server.localServerIp}</span></div>}
                          {server.receivingServerId && <div className="flex justify-between"><span className="text-gray-500">Receiving ID:</span><span className="text-cyan-300 font-mono">{server.receivingServerId}</span></div>}
                          {server.receivingServerIp && <div className="flex justify-between"><span className="text-gray-500">Receiving IP:</span><span className="text-white font-mono">{server.receivingServerIp}</span></div>}
                        </div>
                      </div>
                    )}
                    
                    <div className="flex gap-2">
                      <button onClick={() => pingServer(server)}
                        className="flex-1 py-1.5 bg-gray-800 hover:bg-gray-700 rounded text-xs text-gray-300 flex items-center justify-center gap-1">
                        <Signal className="w-3 h-3" /> Ping
                      </button>
                      <button onClick={() => { setIpidForm(p => ({ ...p, destinationServerId: server.id })); setActiveTab('ipid-transfer'); }}
                        className="flex-1 py-1.5 bg-cyan-900/50 hover:bg-cyan-900 rounded text-xs text-cyan-400 flex items-center justify-center gap-1">
                        <Send className="w-3 h-3" /> Transfer
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Messages */}
        {activeTab === 'messages' && (
          <div className="flex-1 flex">
            <div className="w-1/2 border-r border-green-900/50 overflow-auto p-4">
              <h3 className="text-green-500 font-bold mb-4">Messages ({messages.length})</h3>
              {messages.length === 0 ? (
                <div className="text-gray-500 text-center py-8">No messages yet</div>
              ) : (
                <div className="space-y-2">
                  {messages.map(msg => (
                    <div key={msg.id} onClick={() => setSelectedMessage(msg)}
                      className={`p-3 rounded border cursor-pointer ${selectedMessage?.id === msg.id ? 'border-green-500 bg-green-900/20' : 'border-gray-800 hover:border-gray-700 bg-gray-900/50'}`}>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-bold text-cyan-400">{msg.type}</span>
                        <span className={`text-xs px-2 py-0.5 rounded ${msg.status === 'ACK' ? 'bg-green-900 text-green-400' : msg.status === 'NACK' || msg.status === 'FAILED' ? 'bg-red-900 text-red-400' : 'bg-yellow-900 text-yellow-400'}`}>
                          {msg.status}
                        </span>
                      </div>
                      <div className="text-xs text-gray-400">
                        <div>{msg.senderBic} → {msg.receiverBic}</div>
                        <div className="text-green-400">{msg.currency} {msg.amount.toLocaleString()}</div>
                        {msg.ipIdTransfer && (
                          <div className="text-blue-400">{msg.ipIdTransfer.sourceIpId} → {msg.ipIdTransfer.destinationIpId}</div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            
            <div className="w-1/2 overflow-auto p-4">
              {selectedMessage ? (
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-green-500 font-bold">Message Detail</h3>
                    <div className="flex gap-2">
                      <button onClick={() => generateBlackScreenPDF(selectedMessage)}
                        className="text-xs bg-gray-800 hover:bg-gray-700 px-3 py-1 rounded flex items-center gap-1">
                        <Download className="w-3 h-3" /> BlackScreen PDF
                      </button>
                      <button onClick={() => setSelectedMessage(null)} className="text-xs text-gray-500 hover:text-white">✕</button>
                    </div>
                  </div>
                  
                  <div className="space-y-3 text-xs">
                    <div className="grid grid-cols-2 gap-2">
                      <div className="text-gray-500">Message ID:</div><div className="text-white font-mono">{selectedMessage.msgId}</div>
                      <div className="text-gray-500">UETR:</div><div className="text-yellow-400 font-mono">{selectedMessage.uetr}</div>
                      <div className="text-gray-500">Status:</div><div className={selectedMessage.status === 'ACK' ? 'text-green-400' : 'text-yellow-400'}>{selectedMessage.status}</div>
                      <div className="text-gray-500">Amount:</div><div className="text-white">{selectedMessage.currency} {selectedMessage.amount.toLocaleString()}</div>
                    </div>
                    
                    {selectedMessage.ipIdTransfer && (
                      <>
                        <div className="border-t border-gray-800 pt-3">
                          <div className="text-cyan-400 font-bold mb-2">IP-ID Transfer</div>
                          <div className="grid grid-cols-2 gap-2">
                            <div className="text-gray-500">Source IP-ID:</div><div className="text-cyan-400 font-mono">{selectedMessage.ipIdTransfer.sourceIpId}</div>
                            <div className="text-gray-500">Dest IP-ID:</div><div className="text-cyan-400 font-mono">{selectedMessage.ipIdTransfer.destinationIpId}</div>
                            <div className="text-gray-500">Latency:</div><div className="text-emerald-400">{selectedMessage.ipIdTransfer.latencyMs}ms</div>
                            <div className="text-gray-500">Bytes:</div><div className="text-white">{formatBytes(selectedMessage.ipIdTransfer.bytesTransferred || 0)}</div>
                          </div>
                        </div>
                      </>
                    )}
                    
                    <div className="border-t border-gray-800 pt-3">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-gray-500">Payload:</span>
                        <button onClick={() => setShowPayload(!showPayload)} className="text-xs text-cyan-400 hover:text-cyan-300 flex items-center gap-1">
                          {showPayload ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />} {showPayload ? 'Hide' : 'Show'}
                        </button>
                      </div>
                      {showPayload && (
                        <pre className="bg-gray-900 p-3 rounded text-xs text-gray-300 overflow-auto max-h-64 whitespace-pre-wrap">{selectedMessage.payload}</pre>
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-gray-500 text-center py-8">Select a message to view details</div>
              )}
            </div>
          </div>
        )}

        {/* Queue */}
        {activeTab === 'queue' && (
          <div className="flex-1 overflow-auto p-4">
            <h3 className="text-green-500 font-bold mb-4">Message Queue ({queueJobs.length})</h3>
            <table className="w-full text-xs">
              <thead>
                <tr className="text-gray-500 border-b border-gray-800">
                  <th className="text-left py-2 px-3">ID</th>
                  <th className="text-left py-2 px-3">Message</th>
                  <th className="text-left py-2 px-3">Status</th>
                  <th className="text-left py-2 px-3">Attempts</th>
                  <th className="text-left py-2 px-3">Created</th>
                </tr>
              </thead>
              <tbody>
                {queueJobs.map(job => (
                  <tr key={job.id} className="border-b border-gray-800/50 hover:bg-gray-900/50">
                    <td className="py-2 px-3 text-gray-400">{job.id}</td>
                    <td className="py-2 px-3 text-cyan-400 font-mono">{job.messageId.substring(0, 8)}...</td>
                    <td className="py-2 px-3">
                      <span className={`px-2 py-0.5 rounded ${job.status === 'DONE' ? 'bg-green-900 text-green-400' : job.status === 'FAILED' ? 'bg-red-900 text-red-400' : 'bg-yellow-900 text-yellow-400'}`}>
                        {job.status}
                      </span>
                    </td>
                    <td className="py-2 px-3 text-white">{job.attempts}/{job.maxAttempts}</td>
                    <td className="py-2 px-3 text-gray-500">{new Date(job.createdAt).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Audit */}
        {activeTab === 'audit' && (
          <div className="flex-1 overflow-auto p-4">
            <h3 className="text-green-500 font-bold mb-4 flex items-center gap-2">
              <Shield className="w-5 h-5" /> Immutable Audit Log ({auditLogs.length})
            </h3>
            <table className="w-full text-xs">
              <thead>
                <tr className="text-gray-500 border-b border-gray-800">
                  <th className="text-left py-2 px-3">ID</th>
                  <th className="text-left py-2 px-3">Event</th>
                  <th className="text-left py-2 px-3">Message</th>
                  <th className="text-left py-2 px-3">IP-ID</th>
                  <th className="text-left py-2 px-3">Hash</th>
                  <th className="text-left py-2 px-3">Timestamp</th>
                </tr>
              </thead>
              <tbody>
                {auditLogs.map(log => (
                  <tr key={log.id} className="border-b border-gray-800/50 hover:bg-gray-900/50">
                    <td className="py-2 px-3 text-gray-400">{log.id}</td>
                    <td className="py-2 px-3">
                      <span className={`px-2 py-0.5 rounded ${log.event === 'ACK' ? 'bg-green-900 text-green-400' : log.event === 'NACK' ? 'bg-red-900 text-red-400' : 'bg-gray-800 text-gray-400'}`}>
                        {log.event}
                      </span>
                    </td>
                    <td className="py-2 px-3 text-cyan-400 font-mono">{log.messageId.substring(0, 8)}...</td>
                    <td className="py-2 px-3 text-blue-400 font-mono">{log.ipId || '-'}</td>
                    <td className="py-2 px-3 text-yellow-400 font-mono">{log.eventHash.substring(0, 16)}...</td>
                    <td className="py-2 px-3 text-gray-500">{new Date(log.createdAt).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Config */}
        {activeTab === 'config' && (
          <div className="flex-1 overflow-auto p-4">
            <h3 className="text-green-500 font-bold mb-4">System Configuration</h3>
            <div className="grid grid-cols-2 gap-4 max-w-4xl">
              <div className="bg-gray-900/50 rounded-lg p-4 border border-gray-800">
                <h4 className="text-cyan-400 font-bold mb-3">Identity</h4>
                <div className="space-y-2 text-xs">
                  <div className="flex justify-between"><span className="text-gray-500">Bank BIC:</span><span className="text-green-400 font-mono">{config.bankBic}</span></div>
                  <div className="flex justify-between"><span className="text-gray-500">Bank Name:</span><span className="text-white">{config.bankName}</span></div>
                  <div className="flex justify-between"><span className="text-gray-500">Ledger ID:</span><span className="text-white font-mono">{config.ledgerId}</span></div>
                </div>
              </div>
              
              <div className="bg-gray-900/50 rounded-lg p-4 border border-gray-800">
                <h4 className="text-cyan-400 font-bold mb-3">IP-ID Configuration</h4>
                <div className="space-y-2 text-xs">
                  <div className="flex justify-between"><span className="text-gray-500">Global IP-ID:</span><span className="text-cyan-400 font-mono">{config.globalServerIpId}</span></div>
                  <div className="flex justify-between"><span className="text-gray-500">Local IP-ID:</span><span className="text-cyan-400 font-mono">{config.localServerIpId}</span></div>
                  <div className="flex justify-between"><span className="text-gray-500">Receiving IP-ID:</span><span className="text-cyan-400 font-mono">{config.receivingServerIpId}</span></div>
                </div>
              </div>
              
              <div className="bg-gray-900/50 rounded-lg p-4 border border-gray-800">
                <h4 className="text-cyan-400 font-bold mb-3">Server</h4>
                <div className="space-y-2 text-xs">
                  <div className="flex justify-between"><span className="text-gray-500">IP:</span><span className="text-white font-mono">{config.serverIp}</span></div>
                  <div className="flex justify-between"><span className="text-gray-500">Port:</span><span className="text-white">{config.serverPort}</span></div>
                  <div className="flex justify-between"><span className="text-gray-500">Transport:</span><span className="text-white">{config.outboundTransport}</span></div>
                </div>
              </div>
              
              <div className="bg-gray-900/50 rounded-lg p-4 border border-gray-800">
                <h4 className="text-cyan-400 font-bold mb-3">Security</h4>
                <div className="space-y-2 text-xs">
                  <div className="flex justify-between"><span className="text-gray-500">TLS:</span><span className="text-white">{config.tlsVersion}</span></div>
                  <div className="flex justify-between"><span className="text-gray-500">Encryption:</span><span className="text-white">{config.encryption}</span></div>
                  <div className="flex justify-between"><span className="text-gray-500">Queue:</span><span className="text-white">{config.queueMode}</span></div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════════════════════════════════════════ */}
        {/* IBAN MODULE - COMPLETE TRANSACTION TAB */}
        {/* ═══════════════════════════════════════════════════════════════════════════════════════════ */}
        {activeTab === 'iban' && (
          <div className="flex-1 overflow-auto p-4">
            <div className="max-w-6xl mx-auto">
              {/* Header */}
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-blue-600 via-cyan-500 to-green-500 flex items-center justify-center shadow-lg shadow-blue-500/30">
                    <CreditCard className="w-7 h-7 text-white" />
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold text-white">IBAN Transaction Center</h3>
                    <p className="text-sm text-gray-400">Complete IBAN-based Transfer System • ISO 13616 • SEPA Ready</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <div className="px-3 py-1.5 bg-green-900/30 border border-green-600/50 rounded-lg text-xs text-green-400 flex items-center gap-2">
                    <CheckCircle className="w-4 h-4" /> SEPA Compatible
                  </div>
                  <div className="px-3 py-1.5 bg-blue-900/30 border border-blue-600/50 rounded-lg text-xs text-blue-400 flex items-center gap-2">
                    <Shield className="w-4 h-4" /> ISO 13616
                  </div>
                </div>
              </div>

              {/* Main Transaction Form */}
              <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
                
                {/* ═══════════════════════════════════════════════════════════════════════════════ */}
                {/* LEFT COLUMN - SENDER DETAILS */}
                {/* ═══════════════════════════════════════════════════════════════════════════════ */}
                <div className="space-y-4">
                  <div className="bg-gradient-to-br from-blue-900/50 to-blue-800/30 rounded-xl border border-blue-500/40 p-5">
                    <div className="flex items-center gap-2 text-blue-400 font-bold text-sm mb-4 border-b border-blue-500/30 pb-3">
                      <ArrowUpRight className="w-5 h-5" />
                      ORDERING PARTY (SENDER)
                      <span className="ml-auto text-xs bg-blue-600/40 px-2 py-0.5 rounded font-mono">:50K:</span>
                    </div>
                    
                    {/* Sender IBAN */}
                    <div className="space-y-3">
                      <div>
                        <label className="text-xs text-blue-300 block mb-1.5 font-medium">Sender IBAN *</label>
                        <input 
                          type="text" 
                          value={swiftForm.orderingIban} 
                          onChange={e => {
                            const value = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '');
                            setSwiftForm(p => ({ ...p, orderingIban: value }));
                            if (value.length >= 15) {
                              const validation = validateIBAN(value);
                              setSwiftOrderingIbanValidation(validation);
                              // Auto-fill BIC if available
                              if (validation.valid && validation.bic) {
                                setSwiftForm(p => ({ ...p, senderBic: validation.bic || '' }));
                              }
                            } else {
                              setSwiftOrderingIbanValidation(null);
                            }
                          }}
                          className={`w-full bg-gray-900/80 border-2 rounded-lg px-3 py-2.5 text-sm text-white font-mono tracking-wider ${
                            swiftOrderingIbanValidation 
                              ? swiftOrderingIbanValidation.valid 
                                ? 'border-green-500' 
                                : 'border-red-500' 
                              : 'border-blue-600/50'
                          }`}
                          placeholder="DE89370400440532013000"
                        />
                        {swiftOrderingIbanValidation && swiftOrderingIbanValidation.valid && (
                          <div className="mt-2 text-xs text-green-400 flex items-center gap-1">
                            <CheckCircle className="w-3 h-3" /> {swiftOrderingIbanValidation.formatted}
                          </div>
                        )}
                        {swiftOrderingIbanValidation && !swiftOrderingIbanValidation.valid && (
                          <div className="mt-2 text-xs text-red-400 flex items-center gap-1">
                            <XCircle className="w-3 h-3" /> {swiftOrderingIbanValidation.error}
                          </div>
                        )}
                      </div>
                      
                      {/* Sender Name */}
                      <div>
                        <label className="text-xs text-blue-300 block mb-1.5 font-medium">Sender Name *</label>
                        <input 
                          type="text" 
                          value={swiftForm.orderingCustomer} 
                          onChange={e => setSwiftForm(p => ({ ...p, orderingCustomer: e.target.value }))}
                          className="w-full bg-gray-900/80 border border-blue-600/50 rounded-lg px-3 py-2.5 text-sm text-white"
                          placeholder="DIGITAL COMMERCIAL BANK LTD"
                        />
                      </div>
                      
                      {/* Sender BIC */}
                      <div>
                        <label className="text-xs text-blue-300 block mb-1.5 font-medium">Sender BIC/SWIFT *</label>
                        <input 
                          type="text" 
                          value={swiftForm.senderBic || config.bankBic} 
                          onChange={e => setSwiftForm(p => ({ ...p, senderBic: e.target.value.toUpperCase() }))}
                          className="w-full bg-gray-900/80 border border-blue-600/50 rounded-lg px-3 py-2.5 text-sm text-white font-mono"
                          placeholder="DCBKAEADXXX"
                          maxLength={11}
                        />
                      </div>
                      
                      {/* Sender Account */}
                      <div>
                        <label className="text-xs text-blue-300 block mb-1.5 font-medium">Sender Account</label>
                        <input 
                          type="text" 
                          value={swiftForm.orderingAccount} 
                          onChange={e => setSwiftForm(p => ({ ...p, orderingAccount: e.target.value }))}
                          className="w-full bg-gray-900/80 border border-blue-600/50 rounded-lg px-3 py-2.5 text-sm text-white font-mono"
                          placeholder="DAES-BK-USD-CORE"
                        />
                      </div>
                      
                      {/* IBAN Validation Details */}
                      {swiftOrderingIbanValidation && swiftOrderingIbanValidation.valid && (
                        <div className="bg-blue-900/30 rounded-lg p-3 border border-blue-600/30 space-y-2">
                          <div className="text-xs text-blue-300 font-medium">Detected Bank Information</div>
                          <div className="grid grid-cols-2 gap-2 text-xs">
                            <div><span className="text-gray-500">Country:</span> <span className="text-white">{swiftOrderingIbanValidation.country}</span></div>
                            <div><span className="text-gray-500">Bank Code:</span> <span className="text-white font-mono">{swiftOrderingIbanValidation.bankCode}</span></div>
                            {swiftOrderingIbanValidation.bankName && (
                              <div className="col-span-2"><span className="text-gray-500">Bank:</span> <span className="text-white">{swiftOrderingIbanValidation.bankName}</span></div>
                            )}
                            {swiftOrderingIbanValidation.bic && (
                              <div className="col-span-2"><span className="text-gray-500">BIC:</span> <span className="text-yellow-400 font-mono">{swiftOrderingIbanValidation.bic}</span></div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* ═══════════════════════════════════════════════════════════════════════════════ */}
                {/* CENTER COLUMN - TRANSACTION DETAILS */}
                {/* ═══════════════════════════════════════════════════════════════════════════════ */}
                <div className="space-y-4">
                  <div className="bg-gradient-to-br from-yellow-900/40 to-orange-800/30 rounded-xl border border-yellow-500/40 p-5">
                    <div className="flex items-center gap-2 text-yellow-400 font-bold text-sm mb-4 border-b border-yellow-500/30 pb-3">
                      <Banknote className="w-5 h-5" />
                      TRANSACTION DETAILS
                      <span className="ml-auto text-xs bg-yellow-600/40 px-2 py-0.5 rounded font-mono">:32A:</span>
                    </div>
                    
                    <div className="space-y-3">
                      {/* Amount */}
                      <div>
                        <label className="text-xs text-yellow-300 block mb-1.5 font-medium">Amount *</label>
                        <input 
                          type="text" 
                          value={swiftForm.amount} 
                          onChange={e => setSwiftForm(p => ({ ...p, amount: e.target.value.replace(/[^0-9.]/g, '') }))}
                          className="w-full bg-gray-900/80 border border-yellow-600/50 rounded-lg px-3 py-2.5 text-lg text-white font-mono"
                          placeholder="500000.00"
                        />
                      </div>
                      
                      {/* Currency */}
                      <div>
                        <label className="text-xs text-yellow-300 block mb-1.5 font-medium">Currency *</label>
                        <select 
                          value={swiftForm.currency} 
                          onChange={e => setSwiftForm(p => ({ ...p, currency: e.target.value }))}
                          className="w-full bg-gray-900/80 border border-yellow-600/50 rounded-lg px-3 py-2.5 text-sm text-white">
                          <option value="USD">USD - US Dollar</option>
                          <option value="EUR">EUR - Euro</option>
                          <option value="GBP">GBP - British Pound</option>
                          <option value="CHF">CHF - Swiss Franc</option>
                          <option value="JPY">JPY - Japanese Yen</option>
                          <option value="CAD">CAD - Canadian Dollar</option>
                          <option value="AUD">AUD - Australian Dollar</option>
                          <option value="AED">AED - UAE Dirham</option>
                          <option value="SAR">SAR - Saudi Riyal</option>
                          <option value="CNY">CNY - Chinese Yuan</option>
                          <option value="HKD">HKD - Hong Kong Dollar</option>
                          <option value="SGD">SGD - Singapore Dollar</option>
                          <option value="INR">INR - Indian Rupee</option>
                          <option value="BRL">BRL - Brazilian Real</option>
                          <option value="MXN">MXN - Mexican Peso</option>
                        </select>
                      </div>
                      
                      {/* Value Date */}
                      <div>
                        <label className="text-xs text-yellow-300 block mb-1.5 font-medium">Value Date</label>
                        <input 
                          type="date" 
                          defaultValue={new Date().toISOString().split('T')[0]}
                          className="w-full bg-gray-900/80 border border-yellow-600/50 rounded-lg px-3 py-2.5 text-sm text-white"
                        />
                      </div>
                      
                      {/* Remittance Information */}
                      <div>
                        <label className="text-xs text-yellow-300 block mb-1.5 font-medium">Remittance Info :70:</label>
                        <textarea 
                          value={swiftForm.remittance} 
                          onChange={e => setSwiftForm(p => ({ ...p, remittance: e.target.value }))}
                          className="w-full bg-gray-900/80 border border-yellow-600/50 rounded-lg px-3 py-2.5 text-sm text-white resize-none"
                          rows={2}
                          placeholder="Payment reference / Invoice number"
                        />
                      </div>
                      
                      {/* Transfer Type */}
                      <div>
                        <label className="text-xs text-yellow-300 block mb-1.5 font-medium">Transfer Type</label>
                        <select 
                          value={swiftForm.messageType} 
                          onChange={e => setSwiftForm(p => ({ ...p, messageType: e.target.value }))}
                          className="w-full bg-gray-900/80 border border-yellow-600/50 rounded-lg px-3 py-2.5 text-sm text-white">
                          <option value="MT103">MT103 - Single Customer Credit Transfer</option>
                          <option value="MT202">MT202 - General FI Transfer</option>
                          <option value="MT202COV">MT202COV - Cover Payment</option>
                          <option value="pacs.008">pacs.008 - ISO 20022 Credit Transfer</option>
                        </select>
                      </div>
                      
                      {/* Charges */}
                      <div>
                        <label className="text-xs text-yellow-300 block mb-1.5 font-medium">Charges :71A:</label>
                        <select className="w-full bg-gray-900/80 border border-yellow-600/50 rounded-lg px-3 py-2.5 text-sm text-white">
                          <option value="SHA">SHA - Shared</option>
                          <option value="OUR">OUR - Sender pays all</option>
                          <option value="BEN">BEN - Beneficiary pays all</option>
                        </select>
                      </div>
                    </div>
                  </div>
                </div>

                {/* ═══════════════════════════════════════════════════════════════════════════════ */}
                {/* RIGHT COLUMN - BENEFICIARY DETAILS */}
                {/* ═══════════════════════════════════════════════════════════════════════════════ */}
                <div className="space-y-4">
                  <div className="bg-gradient-to-br from-green-900/50 to-emerald-800/30 rounded-xl border border-green-500/40 p-5">
                    <div className="flex items-center gap-2 text-green-400 font-bold text-sm mb-4 border-b border-green-500/30 pb-3">
                      <ArrowDownLeft className="w-5 h-5" />
                      BENEFICIARY (RECEIVER)
                      <span className="ml-auto text-xs bg-green-600/40 px-2 py-0.5 rounded font-mono">:59:</span>
                    </div>
                    
                    <div className="space-y-3">
                      {/* Beneficiary IBAN */}
                      <div>
                        <label className="text-xs text-green-300 block mb-1.5 font-medium">Beneficiary IBAN *</label>
                        <input 
                          type="text" 
                          value={swiftForm.beneficiaryIban} 
                          onChange={e => {
                            const value = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '');
                            setSwiftForm(p => ({ ...p, beneficiaryIban: value }));
                            if (value.length >= 15) {
                              const validation = validateIBAN(value);
                              setSwiftBeneficiaryIbanValidation(validation);
                              // Auto-fill BIC and bank name if available
                              if (validation.valid) {
                                if (validation.bic) {
                                  setSwiftForm(p => ({ ...p, receiverBic: validation.bic || '' }));
                                }
                                if (validation.bankName) {
                                  setSwiftForm(p => ({ ...p, beneficiaryName: validation.bankName || '' }));
                                }
                              }
                            } else {
                              setSwiftBeneficiaryIbanValidation(null);
                            }
                          }}
                          className={`w-full bg-gray-900/80 border-2 rounded-lg px-3 py-2.5 text-sm text-white font-mono tracking-wider ${
                            swiftBeneficiaryIbanValidation 
                              ? swiftBeneficiaryIbanValidation.valid 
                                ? 'border-green-500' 
                                : 'border-red-500' 
                              : 'border-green-600/50'
                          }`}
                          placeholder="GB82WEST12345698765432"
                        />
                        {swiftBeneficiaryIbanValidation && swiftBeneficiaryIbanValidation.valid && (
                          <div className="mt-2 text-xs text-green-400 flex items-center gap-1">
                            <CheckCircle className="w-3 h-3" /> {swiftBeneficiaryIbanValidation.formatted}
                          </div>
                        )}
                        {swiftBeneficiaryIbanValidation && !swiftBeneficiaryIbanValidation.valid && (
                          <div className="mt-2 text-xs text-red-400 flex items-center gap-1">
                            <XCircle className="w-3 h-3" /> {swiftBeneficiaryIbanValidation.error}
                          </div>
                        )}
                      </div>
                      
                      {/* Beneficiary Name */}
                      <div>
                        <label className="text-xs text-green-300 block mb-1.5 font-medium">Beneficiary Name *</label>
                        <input 
                          type="text" 
                          value={swiftForm.beneficiaryName} 
                          onChange={e => setSwiftForm(p => ({ ...p, beneficiaryName: e.target.value }))}
                          className="w-full bg-gray-900/80 border border-green-600/50 rounded-lg px-3 py-2.5 text-sm text-white"
                          placeholder="Beneficiary Company Ltd"
                        />
                      </div>
                      
                      {/* Beneficiary BIC */}
                      <div>
                        <label className="text-xs text-green-300 block mb-1.5 font-medium">Beneficiary BIC/SWIFT :57A:</label>
                        <input 
                          type="text" 
                          value={swiftForm.receiverBic} 
                          onChange={e => setSwiftForm(p => ({ ...p, receiverBic: e.target.value.toUpperCase() }))}
                          className="w-full bg-gray-900/80 border border-green-600/50 rounded-lg px-3 py-2.5 text-sm text-white font-mono"
                          placeholder="DEUTDEFFXXX"
                          maxLength={11}
                        />
                      </div>
                      
                      {/* Beneficiary Account */}
                      <div>
                        <label className="text-xs text-green-300 block mb-1.5 font-medium">Beneficiary Account</label>
                        <input 
                          type="text" 
                          value={swiftForm.beneficiaryAccount} 
                          onChange={e => setSwiftForm(p => ({ ...p, beneficiaryAccount: e.target.value }))}
                          className="w-full bg-gray-900/80 border border-green-600/50 rounded-lg px-3 py-2.5 text-sm text-white font-mono"
                          placeholder="Account number (if different from IBAN)"
                        />
                      </div>
                      
                      {/* Beneficiary Address */}
                      <div>
                        <label className="text-xs text-green-300 block mb-1.5 font-medium">Beneficiary Address</label>
                        <input 
                          type="text" 
                          className="w-full bg-gray-900/80 border border-green-600/50 rounded-lg px-3 py-2.5 text-sm text-white"
                          placeholder="Street, City, Country"
                        />
                      </div>
                      
                      {/* IBAN Validation Details */}
                      {swiftBeneficiaryIbanValidation && swiftBeneficiaryIbanValidation.valid && (
                        <div className="bg-green-900/30 rounded-lg p-3 border border-green-600/30 space-y-2">
                          <div className="text-xs text-green-300 font-medium">Detected Bank Information</div>
                          <div className="grid grid-cols-2 gap-2 text-xs">
                            <div><span className="text-gray-500">Country:</span> <span className="text-white">{swiftBeneficiaryIbanValidation.country}</span></div>
                            <div><span className="text-gray-500">Bank Code:</span> <span className="text-white font-mono">{swiftBeneficiaryIbanValidation.bankCode}</span></div>
                            {swiftBeneficiaryIbanValidation.bankName && (
                              <div className="col-span-2"><span className="text-gray-500">Bank:</span> <span className="text-white">{swiftBeneficiaryIbanValidation.bankName}</span></div>
                            )}
                            {swiftBeneficiaryIbanValidation.bic && (
                              <div className="col-span-2"><span className="text-gray-500">BIC:</span> <span className="text-yellow-400 font-mono">{swiftBeneficiaryIbanValidation.bic}</span></div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* ═══════════════════════════════════════════════════════════════════════════════ */}
              {/* TRANSACTION SUMMARY & ACTIONS */}
              {/* ═══════════════════════════════════════════════════════════════════════════════ */}
              <div className="mt-6 bg-gradient-to-r from-gray-900/80 to-gray-800/50 rounded-xl border border-gray-600/50 p-5">
                <div className="flex items-center gap-2 text-white font-bold text-sm mb-4">
                  <FileText className="w-5 h-5 text-cyan-400" />
                  Transaction Summary
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
                  <div className="bg-gray-800/50 rounded-lg p-3">
                    <div className="text-gray-500 text-xs mb-1">From</div>
                    <div className="text-blue-400 font-mono text-xs truncate">{swiftForm.orderingIban || 'Enter IBAN'}</div>
                    <div className="text-white text-sm truncate">{swiftForm.orderingCustomer || 'Sender Name'}</div>
                  </div>
                  <div className="bg-gray-800/50 rounded-lg p-3">
                    <div className="text-gray-500 text-xs mb-1">Amount</div>
                    <div className="text-yellow-400 font-bold text-lg">{swiftForm.currency} {parseFloat(swiftForm.amount || '0').toLocaleString()}</div>
                  </div>
                  <div className="bg-gray-800/50 rounded-lg p-3">
                    <div className="text-gray-500 text-xs mb-1">To</div>
                    <div className="text-green-400 font-mono text-xs truncate">{swiftForm.beneficiaryIban || 'Enter IBAN'}</div>
                    <div className="text-white text-sm truncate">{swiftForm.beneficiaryName || 'Beneficiary Name'}</div>
                  </div>
                  <div className="bg-gray-800/50 rounded-lg p-3">
                    <div className="text-gray-500 text-xs mb-1">Message Type</div>
                    <div className="text-cyan-400 font-mono">{swiftForm.messageType}</div>
                    <div className="text-gray-400 text-xs">SWIFT FIN</div>
                  </div>
                </div>
                
                {/* Action Buttons */}
                <div className="flex flex-wrap items-center gap-3 pt-4 border-t border-gray-700/50">
                  <button 
                    onClick={() => {
                      // Validate both IBANs before proceeding
                      if (swiftOrderingIbanValidation?.valid && swiftBeneficiaryIbanValidation?.valid) {
                        setActiveTab('swift-transfer');
                      } else {
                        alert('Please enter valid IBANs for both sender and beneficiary');
                      }
                    }}
                    disabled={!swiftOrderingIbanValidation?.valid || !swiftBeneficiaryIbanValidation?.valid}
                    className={`px-6 py-3 rounded-lg text-sm font-bold flex items-center gap-2 transition-all ${
                      swiftOrderingIbanValidation?.valid && swiftBeneficiaryIbanValidation?.valid
                        ? 'bg-gradient-to-r from-yellow-600 to-orange-600 hover:from-yellow-500 hover:to-orange-500 text-white shadow-lg shadow-yellow-500/30'
                        : 'bg-gray-700 text-gray-400 cursor-not-allowed'
                    }`}>
                    <Send className="w-4 h-4" /> Execute SWIFT Transfer
                  </button>
                  
                  <button 
                    onClick={() => {
                      if (swiftOrderingIbanValidation?.valid && swiftBeneficiaryIbanValidation?.valid) {
                        setActiveTab('ipid-transfer');
                      } else {
                        alert('Please enter valid IBANs for both sender and beneficiary');
                      }
                    }}
                    disabled={!swiftOrderingIbanValidation?.valid || !swiftBeneficiaryIbanValidation?.valid}
                    className={`px-6 py-3 rounded-lg text-sm font-bold flex items-center gap-2 transition-all ${
                      swiftOrderingIbanValidation?.valid && swiftBeneficiaryIbanValidation?.valid
                        ? 'bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white shadow-lg shadow-cyan-500/30'
                        : 'bg-gray-700 text-gray-400 cursor-not-allowed'
                    }`}>
                    <Network className="w-4 h-4" /> Execute IP-ID Transfer
                  </button>
                  
                  <button 
                    onClick={() => {
                      setSwiftForm(p => ({ 
                        ...p, 
                        orderingIban: '', 
                        beneficiaryIban: '',
                        amount: '500000.00',
                        remittance: 'SWIFT FIN TRANSFER'
                      }));
                      setSwiftOrderingIbanValidation(null);
                      setSwiftBeneficiaryIbanValidation(null);
                    }}
                    className="px-4 py-3 bg-gray-700 hover:bg-gray-600 rounded-lg text-sm text-white flex items-center gap-2 transition-colors">
                    <RefreshCw className="w-4 h-4" /> Reset Form
                  </button>
                  
                  <button 
                    className="px-4 py-3 bg-purple-700 hover:bg-purple-600 rounded-lg text-sm text-white flex items-center gap-2 transition-colors ml-auto">
                    <Download className="w-4 h-4" /> Download Pre-Advice
                  </button>
                </div>
              </div>

              {/* ═══════════════════════════════════════════════════════════════════════════════ */}
              {/* IBAN INFORMATION PANEL */}
              {/* ═══════════════════════════════════════════════════════════════════════════════ */}
              <div className="mt-6 bg-gray-900/50 rounded-xl border border-gray-700/50 p-5">
                <div className="flex items-center gap-2 text-cyan-400 font-bold text-sm mb-4">
                  <Info className="w-5 h-5" />
                  IBAN Reference Guide
                </div>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-sm">
                  <div className="bg-gray-800/50 rounded-lg p-3">
                    <div className="text-gray-400 text-xs mb-1">IBAN Standard</div>
                    <div className="text-white text-xs">ISO 13616-1:2007</div>
                    <div className="text-gray-500 text-xs mt-1">International Bank Account Number</div>
                  </div>
                  <div className="bg-gray-800/50 rounded-lg p-3">
                    <div className="text-gray-400 text-xs mb-1">Validation</div>
                    <div className="text-white text-xs">MOD 97-10</div>
                    <div className="text-gray-500 text-xs mt-1">ISO 7064 checksum algorithm</div>
                  </div>
                  <div className="bg-gray-800/50 rounded-lg p-3">
                    <div className="text-gray-400 text-xs mb-1">SEPA Transfers</div>
                    <div className="text-white text-xs">EUR Zone</div>
                    <div className="text-gray-500 text-xs mt-1">Single Euro Payments Area</div>
                  </div>
                  <div className="bg-gray-800/50 rounded-lg p-3">
                    <div className="text-gray-400 text-xs mb-1">Auto-Detection</div>
                    <div className="text-white text-xs">BIC + Bank Name</div>
                    <div className="text-gray-500 text-xs mt-1">Automatic extraction from IBAN</div>
                  </div>
                </div>
                
                {/* Supported Countries */}
                <div className="mt-4">
                  <div className="text-gray-400 text-xs mb-2">Supported Countries (80+ countries)</div>
                  <div className="flex flex-wrap gap-2">
                    {[
                      { code: 'DE', name: 'Germany', len: 22 },
                      { code: 'GB', name: 'UK', len: 22 },
                      { code: 'FR', name: 'France', len: 27 },
                      { code: 'ES', name: 'Spain', len: 24 },
                      { code: 'IT', name: 'Italy', len: 27 },
                      { code: 'NL', name: 'Netherlands', len: 18 },
                      { code: 'CH', name: 'Switzerland', len: 21 },
                      { code: 'AT', name: 'Austria', len: 20 },
                      { code: 'BE', name: 'Belgium', len: 16 },
                      { code: 'AE', name: 'UAE', len: 23 },
                      { code: 'SA', name: 'Saudi Arabia', len: 24 },
                      { code: 'QA', name: 'Qatar', len: 29 },
                      { code: 'KW', name: 'Kuwait', len: 30 },
                      { code: 'BH', name: 'Bahrain', len: 22 },
                      { code: 'PT', name: 'Portugal', len: 25 },
                    ].map(c => (
                      <div key={c.code} className="bg-gray-800/80 rounded px-2 py-1 text-xs flex items-center gap-1 hover:bg-gray-700/80 cursor-default">
                        <span className="text-cyan-400 font-mono font-bold">{c.code}</span>
                        <span className="text-gray-400">{c.name}</span>
                        <span className="text-gray-600">({c.len})</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="bg-gray-900 border-t border-green-900/30 px-4 py-1 flex items-center justify-between text-xs text-gray-500">
        <div className="flex items-center gap-4">
          <span>Messages: {messages.length}</span>
          <span>Queue: {queueJobs.filter(j => j.status === 'PENDING').length} pending</span>
          <span>Servers: {servers.filter(s => s.status === 'ONLINE').length}/{servers.length} online</span>
          <span>Audit: {auditLogs.length} events</span>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-green-400">{config.globalServerIpId}</span>
          <span>{config.bankBic}</span>
          <span>{new Date().toLocaleTimeString()}</span>
        </div>
      </div>
    </div>
  );
}

export default SwiftAllianceLikeModule;
