/**
 * Origen de Fondos Module - Digital Commercial Bank Ltd
 * Extracción de datos bancarios de Ledger1 con algoritmos profundos en múltiples capas
 * Similar a Treasury Reserve 1 pero optimizado para detección de cuentas bancarias
 */

import React, { useState, useRef, useEffect } from 'react';
import { 
  Building2, FileSearch, Download, RotateCcw, Upload, CheckCircle,
  Activity, TrendingUp, Database, CreditCard, Globe, Zap, Layers
} from 'lucide-react';
import { BankingCard, BankingHeader, BankingButton, BankingSection, BankingMetric, BankingBadge } from './ui/BankingComponents';
import { useBankingTheme } from '../hooks/useBankingTheme';
import { downloadTXT } from '../lib/download-helper';

interface BankAccount {
  bankName: string;
  accountNumber: string;
  accountType: string;
  currency: string;
  balance: number;
  iban?: string;
  swift?: string;
  routingNumber?: string;
  beneficiaryName?: string;
  beneficiaryAddress?: string;
  branchCode?: string;
  branchName?: string;
  countryCode?: string;
  bankAddress?: string;
  correspondentBank?: string;
  intermediaryBank?: string;
  reference?: string;
  extractedAt: string;
  confidence: number; // 0-100
  detectionLayer: number; // Capa que detectó la cuenta
}

// ✅ Lista expandida de bancos conocidos para detección
const KNOWN_BANKS_EXPANDED = [
  'HSBC', 'JPMORGAN', 'JPMORGAN CHASE', 'BANK OF AMERICA', 'CITIBANK', 'CITIGROUP',
  'WELLS FARGO', 'GOLDMAN SACHS', 'MORGAN STANLEY', 'DEUTSCHE BANK', 'BARCLAYS',
  'UBS', 'CREDIT SUISSE', 'BNP PARIBAS', 'STANDARD CHARTERED', 'SANTANDER', 'BBVA',
  'ROYAL BANK OF SCOTLAND', 'RBS', 'LLOYDS', 'NATWEST', 'BANK OF CHINA', 'ICBC',
  'EMIRATES NBD', 'ENBD', 'FIRST ABU DHABI BANK', 'FAB', 'MASHREQ BANK', 'DIB',
  'DUBAI ISLAMIC BANK', 'ADCB', 'ABU DHABI COMMERCIAL BANK', 'NBAD', 'RAK BANK',
  'BANCO DO BRASIL', 'ITAU', 'BRADESCO', 'CAIXA', 'BANRISUL', 'SANTANDER BRASIL',
  'SCOTIABANK', 'TD BANK', 'RBC', 'BMO', 'CIBC', 'NATIONAL BANK OF CANADA',
  'COMMERZBANK', 'UNICREDIT', 'SOCIETE GENERALE', 'CREDIT AGRICOLE', 'NATIXIS',
  'ING BANK', 'ABN AMRO', 'RABOBANK', 'KBC', 'BELFIUS', 'NORDEA', 'SEB', 'HANDELSBANKEN',
  'DANSKE BANK', 'DNB', 'SBERBANK', 'VTB', 'GAZPROMBANK', 'ALFA BANK',
  'MUFG', 'MIZUHO', 'SUMITOMO MITSUI', 'SMBC', 'NOMURA', 'DAIWA',
  'BANK OF COMMUNICATIONS', 'CHINA CONSTRUCTION BANK', 'AGRICULTURAL BANK OF CHINA',
  'CHINA MERCHANTS BANK', 'PING AN BANK', 'STATE BANK OF INDIA', 'HDFC BANK',
  'ICICI BANK', 'AXIS BANK', 'KOTAK MAHINDRA', 'BANCO CENTRAL', 'BANCO POPULAR',
  'DIGITAL COMMERCIAL BANK', 'DCB', 'DAES BANK', 'DAES', 'TREASURY RESERVE'
];

// ✅ CAPA 1: Patrones de bancos expandidos (múltiples formatos)
const BANK_PATTERNS_LAYER1 = [
  { name: 'HSBC', patterns: [/HSBC/i, /Hong Kong Shanghai/i, /HONGKONG.*SHANGHAI/i, /HSBC.*BANK/i] },
  { name: 'JPMorgan Chase', patterns: [/JPMORGAN/i, /JP\s*MORGAN/i, /CHASE/i, /J\.P\.\s*MORGAN/i] },
  { name: 'Bank of America', patterns: [/BANK\s*OF\s*AMERICA/i, /BOA/i, /BANK\s*AMERICA/i] },
  { name: 'Citibank', patterns: [/CITIBANK/i, /CITI/i, /CITIGROUP/i] },
  { name: 'Wells Fargo', patterns: [/WELLS\s*FARGO/i, /WELLSFARGO/i] },
  { name: 'Goldman Sachs', patterns: [/GOLDMAN\s*SACHS/i, /GOLDMANSACHS/i] },
  { name: 'Morgan Stanley', patterns: [/MORGAN\s*STANLEY/i, /MORGANSTANLEY/i] },
  { name: 'Deutsche Bank', patterns: [/DEUTSCHE\s*BANK/i, /DEUTSCHEBANK/i] },
  { name: 'Barclays', patterns: [/BARCLAYS/i, /BARCLAY/i] },
  { name: 'UBS', patterns: [/UBS/i, /UNITED\s*BANK\s*OF\s*SWITZERLAND/i] },
  { name: 'Credit Suisse', patterns: [/CREDIT\s*SUISSE/i, /CREDITSUISSE/i] },
  { name: 'BNP Paribas', patterns: [/BNP\s*PARIBAS/i, /BNPPARIBAS/i] },
  { name: 'Standard Chartered', patterns: [/STANDARD\s*CHARTERED/i, /STANDARDCHARTERED/i] },
  { name: 'Santander', patterns: [/SANTANDER/i, /BANCO\s*SANTANDER/i] },
  { name: 'BBVA', patterns: [/BBVA/i, /BANCO\s*BILBAO/i] },
  { name: 'Royal Bank of Scotland', patterns: [/RBS/i, /ROYAL\s*BANK\s*OF\s*SCOTLAND/i] },
  { name: 'Lloyds Bank', patterns: [/LLOYDS/i, /LLOYDS\s*BANK/i] },
  { name: 'NatWest', patterns: [/NATWEST/i, /NATIONAL\s*WESTMINSTER/i] },
  { name: 'Bank of China', patterns: [/BANK\s*OF\s*CHINA/i, /BOC/i] },
  { name: 'Industrial and Commercial Bank of China', patterns: [/ICBC/i, /INDUSTRIAL.*COMMERCIAL/i] }
];

// ✅ CAPA 2: Patrones de números de cuenta (múltiples formatos)
const ACCOUNT_PATTERNS = [
  /\b\d{8,16}\b/g, // 8-16 dígitos estándar
  /\b\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}\b/g, // Formato con guiones
  /\b[A-Z]{2}\d{2}[A-Z0-9]{4}\d{7}([A-Z0-9]?){0,16}\b/g, // IBAN
  /\b\d{10,12}\b/g, // 10-12 dígitos (formato común)
  /\b\d{6,8}[\s-]?\d{6,8}\b/g // Formato dividido
];

// ✅ CAPA 3: Patrones IBAN/SWIFT
const IBAN_PATTERN = /\b[A-Z]{2}\d{2}[A-Z0-9]{4}\d{7}([A-Z0-9]?){0,16}\b/g;
const SWIFT_PATTERN = /\b[A-Z]{4}[A-Z]{2}[A-Z0-9]{2}([A-Z0-9]{3})?\b/g;

// ✅ CAPA 4: Patrones de balances (múltiples formatos)
const BALANCE_PATTERNS = [
  /\b\d{8,15}\b/g, // 8-15 dígitos (balance grande)
  /\b\d{1,3}(?:,\d{3})*(?:\.\d{2})?\b/g, // Formato con comas
  /\b\d+\.\d{2}\b/g, // Decimal con 2 dígitos
  /balance[:\s]*(\d+(?:,\d{3})*(?:\.\d{2})?)/gi, // "Balance: 1,234,567.89"
  /amount[:\s]*(\d+(?:,\d{3})*(?:\.\d{2})?)/gi // "Amount: 1,234,567.89"
];

// ✅ Tamaño de chunk optimizado para no bloquear UI
const CHUNK_SIZE = 5 * 1024 * 1024; // 5MB (reducido para evitar bloqueo)
const YIELD_INTERVAL = 10; // Yield cada 10 chunks para no bloquear

type CipherSummary = {
  aes?: boolean;
  stream?: boolean;
  vigenere?: boolean;
  xorKeys?: number;
  base64Blobs?: number;
  rotHits?: number;
  aesDecrypted?: number;
};

type ReverseEngineeringInfo = {
  fileFormat?: string;
  encoding?: string;
  language?: string;
  magicNumber?: string;
  endianness?: string;
  dataTypes?: string[];
  detectedPatterns?: number;
  cipherSummary?: CipherSummary;
  lastChunk?: number;
  sections?: Array<{ name: string; start: number; end: number; type: string }>;
  entropy?: {
    highEntropyBlocks: number;
    avgEntropy: number;
  };
  compressed?: boolean;
  compressedFormat?: 'zip' | 'gzip' | 'unknown';
};

type ProcessingMetrics = {
  totalBytes: number;
  processedBytes: number;
  mbps: number;
  etaSeconds: number;
  currentChunk: number;
};

type LiveLogEntry = {
  ts: string;
  message: string;
  level?: 'info' | 'warn' | 'error';
  chunk?: number;
};

type AesConfig = {
  password: string;
  mode: 'CBC' | 'CTR' | 'GCM' | 'ECB';
  ivHex?: string;
  useFileHeadAsIV?: boolean;
};

// ✅ OPTIMIZACIÓN 1: Pre-compilar regex patterns (una sola vez al cargar)
const COMPILED_BANK_PATTERNS = BANK_PATTERNS_LAYER1.map(bank => ({
  name: bank.name,
  patterns: bank.patterns.map(p => {
    const regex = new RegExp(p.source, 'gi');
    Object.freeze(regex); // Prevenir modificaciones
    return regex;
  })
}));

// Mapa rápido de coincidencias literales para evitar escaneos byte a byte cuando ya hay texto decodificado
const escapeRegex = (str: string) => str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const BANK_NAME_QUICK_REGEX = new RegExp(
  BANK_PATTERNS_LAYER1.map(b => escapeRegex(b.name)).join('|'),
  'gi'
);

// ✅ OPTIMIZACIÓN 2: Función de detección de encoding eficiente
function detectEncoding(bytes: Uint8Array): string {
  if (bytes.length < 2) return 'utf-8';
  
  // Detectar BOM (Byte Order Mark)
  if (bytes.length >= 2 && bytes[0] === 0xFF && bytes[1] === 0xFE) return 'utf-16le';
  if (bytes.length >= 2 && bytes[0] === 0xFE && bytes[1] === 0xFF) return 'utf-16be';
  if (bytes.length >= 3 && bytes[0] === 0xEF && bytes[1] === 0xBB && bytes[2] === 0xBF) return 'utf-8';
  
  // Heurística: si >90% son ASCII válidos, es UTF-8
  let asciiCount = 0;
  const sampleSize = Math.min(1000, bytes.length);
  for (let i = 0; i < sampleSize; i++) {
    if (bytes[i] < 0x80) asciiCount++;
  }
  
  if (asciiCount / sampleSize > 0.9) return 'utf-8';
  
  // Default a UTF-8
  return 'utf-8';
}

// ✅ OPTIMIZACIÓN 5: Debounce para localStorage
let saveTimeout: NodeJS.Timeout | null = null;
const DEBOUNCE_SAVE_MS = 5000; // Guardar cada 5 segundos máximo
const DEFAULT_AES_PASSWORD = '1a2b3c4d5e'; // Proporcionado por el usuario

function debouncedSaveAccounts(accounts: BankAccount[]) {
  if (saveTimeout) clearTimeout(saveTimeout);
  saveTimeout = setTimeout(() => {
    try {
      localStorage.setItem('origen_fondos_accounts', JSON.stringify(accounts));
    } catch (error) {
      console.warn('[Origen Fondos] Error guardando en localStorage:', error);
    }
    saveTimeout = null;
  }, DEBOUNCE_SAVE_MS);
}

function downloadJSON(data: any, filename: string) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

async function tryAESDecrypt(
  data: Uint8Array,
  config: AesConfig
): Promise<{ bytes: Uint8Array; text: string } | null> {
  if (typeof window === 'undefined' || !window.crypto?.subtle) return null;
  try {
    const enc = new TextEncoder();
    const salt = enc.encode('origen-fondos-salt');
    const keyMaterial = await window.crypto.subtle.importKey(
      'raw',
      enc.encode(config.password),
      { name: 'PBKDF2' },
      false,
      ['deriveKey']
    );
    const key = await window.crypto.subtle.deriveKey(
      {
        name: 'PBKDF2',
        salt,
        iterations: 10000,
        hash: 'SHA-256'
      },
      keyMaterial,
      { name: 'AES-CBC', length: 256 },
      false,
      ['decrypt']
    );
    const ivCandidates: Uint8Array[] = [];
    if (config.ivHex && config.ivHex.trim().length >= 32) {
      const hex = config.ivHex.replace(/[^0-9a-fA-F]/g, '');
      const ivBytes = new Uint8Array(hex.match(/.{1,2}/g)!.map(b => parseInt(b, 16)));
      ivCandidates.push(ivBytes.slice(0, 16));
    }
    if (config.useFileHeadAsIV) ivCandidates.push(data.slice(0, 16));
    ivCandidates.push(new Uint8Array(16)); // IV cero como fallback

    const modes: Array<{ name: 'AES-CBC' | 'AES-CTR' | 'AES-GCM' | 'AES-ECB'; counter?: Uint8Array; length?: number }> = [
      { name: 'AES-CBC' },
      { name: 'AES-CTR', counter: new Uint8Array(16), length: 64 },
      { name: 'AES-GCM' },
      { name: 'AES-ECB' }
    ];

    for (const mode of modes) {
      if (config.mode !== mode.name.replace('AES-', '') as any && !(config.mode === 'ECB' && mode.name === 'AES-ECB')) continue;
      for (const iv of ivCandidates) {
        try {
          const algo =
            mode.name === 'AES-CBC'
              ? { name: 'AES-CBC', iv }
              : mode.name === 'AES-CTR'
              ? { name: 'AES-CTR', counter: mode.counter!, length: mode.length! }
              : mode.name === 'AES-GCM'
              ? { name: 'AES-GCM', iv }
              : { name: 'AES-ECB' };
          const decrypted = await window.crypto.subtle.decrypt(algo as any, key, data);
          const bytes = new Uint8Array(decrypted);
          const text = new TextDecoder('utf-8', { fatal: false }).decode(bytes);
          const readable = /[A-Za-z0-9]{4,}/.test(text);
          if (readable) {
            return { bytes, text };
          }
        } catch {
          // try next
        }
      }
    }
  } catch {
    return null;
  }
  return null;
}

async function attemptFullFileDecrypt(
  file: File,
  baseConfig: AesConfig,
  maxBytes = 64 * 1024 * 1024 // 64MB to probe legibility
): Promise<{ bytes: Uint8Array; text: string; config: AesConfig } | null> {
  try {
    const slice = file.slice(0, Math.min(file.size, maxBytes));
    const buf = new Uint8Array(await slice.arrayBuffer());
    const candidates: AesConfig[] = [
      baseConfig,
      { ...baseConfig, mode: 'CBC', useFileHeadAsIV: true },
      { ...baseConfig, mode: 'CBC', useFileHeadAsIV: false, ivHex: '' },
      { ...baseConfig, mode: 'CTR', useFileHeadAsIV: true },
      { ...baseConfig, mode: 'CTR', useFileHeadAsIV: false, ivHex: '' },
      { ...baseConfig, mode: 'ECB', useFileHeadAsIV: false, ivHex: '' }
    ];
    for (const cfg of candidates) {
      const res = await tryAESDecrypt(buf, cfg);
      if (res && /[A-Za-z0-9]{4,}/.test(res.text)) {
        return { ...res, config: cfg };
      }
    }
  } catch (err) {
    console.warn('[Origen Fondos] Error en attemptFullFileDecrypt:', err);
  }
  return null;
}

export function OrigenDeFondosModule() {
  const { fmt, isSpanish } = useBankingTheme();
  
  const [analyzing, setAnalyzing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [accounts, setAccounts] = useState<BankAccount[]>(() => {
    const saved = localStorage.getItem('origen_fondos_accounts');
    return saved ? JSON.parse(saved) : [];
  });
  const [selectedBank, setSelectedBank] = useState<string>('ALL');
  const [detectionStats, setDetectionStats] = useState({
    layer1: 0,
    layer2: 0,
    layer3: 0,
    layer4: 0,
    layer5: 0,
    layer6: 0
  });
  // ✅ Estado para progreso detallado de cada algoritmo
  const [algorithmProgress, setAlgorithmProgress] = useState<Record<string, {
    progress: number;
    accounts: number;
    method: string;
  }>>({});
  
  // ✅ Estado para mostrar resultados en tiempo real
  const [realtimeAccounts, setRealtimeAccounts] = useState<BankAccount[]>([]);
  const [realtimeStats, setRealtimeStats] = useState({
    totalFound: 0,
    lastUpdate: new Date().toISOString(),
    currentChunk: 0,
    accountsInChunk: 0
  });
  const [reverseInfo, setReverseInfo] = useState<ReverseEngineeringInfo | null>(null);
  const [processingMetrics, setProcessingMetrics] = useState<ProcessingMetrics>({
    totalBytes: 0,
    processedBytes: 0,
    mbps: 0,
    etaSeconds: 0,
    currentChunk: 0
  });
  const [liveLog, setLiveLog] = useState<LiveLogEntry[]>([]);
  const [isPaused, setIsPaused] = useState(false);
  const [lastReadableChunk, setLastReadableChunk] = useState<number | null>(null);
  const [aesConfig, setAesConfig] = useState<AesConfig>({
    password: '1a2b3c4d5e',
    mode: 'CBC',
    ivHex: '',
    useFileHeadAsIV: false
  });
  
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const processingRef = React.useRef(false);
  const abortControllerRef = useRef<AbortController | null>(null);
  const startTimeRef = useRef<number>(0);
  const currentFileRef = useRef<File | null>(null);
  const resumeFromPauseRef = useRef<boolean>(false);
  
  const [lastProcessedOffset, setLastProcessedOffset] = useState(() => {
    const saved = localStorage.getItem('origen_fondos_offset');
    return saved ? parseInt(saved) : 0;
  });
  const [currentFileName, setCurrentFileName] = useState(() => {
    return localStorage.getItem('origen_fondos_current_file') || '';
  });

  const MAX_LOG_ENTRIES = 50;

  const pushLog = (message: string, level: 'info' | 'warn' | 'error' = 'info', chunk?: number) => {
    setLiveLog(prev => {
      const entry: LiveLogEntry = { ts: new Date().toISOString(), message, level, chunk };
      const next = [entry, ...prev];
      return next.slice(0, MAX_LOG_ENTRIES);
    });
    // Persist log snapshot
    try {
      localStorage.setItem('origen_fondos_log', JSON.stringify(liveLog.slice(0, MAX_LOG_ENTRIES)));
    } catch {}
  };

  const updateProcessingMetrics = (processedBytes: number, totalBytes: number, chunk: number) => {
    const elapsedSeconds = Math.max(0.001, (performance.now() - startTimeRef.current) / 1000);
    const mbps = processedBytes / 1_000_000 / elapsedSeconds;
    const remainingBytes = Math.max(0, totalBytes - processedBytes);
    const etaSeconds = mbps > 0 ? remainingBytes / 1_000_000 / mbps : Infinity;
    const next = {
      totalBytes,
      processedBytes,
      mbps,
      etaSeconds,
      currentChunk: chunk
    };
    setProcessingMetrics(next);
    try {
      localStorage.setItem('origen_fondos_metrics', JSON.stringify(next));
    } catch {}
  };

  // ✅ Guardar cuentas cuando cambien
  useEffect(() => {
    if (accounts.length > 0) {
      localStorage.setItem('origen_fondos_accounts', JSON.stringify(accounts));
    }
  }, [accounts]);

  // ✅ Guardar progreso
  useEffect(() => {
    if (lastProcessedOffset > 0) {
      localStorage.setItem('origen_fondos_offset', lastProcessedOffset.toString());
    }
  }, [lastProcessedOffset]);

  // ✅ NO detener procesamiento al desmontar (background processing)
  useEffect(() => {
    return () => {
      console.log('[Origen Fondos] 💾 Componente desmontado, procesamiento continúa en background');
      if (processingRef.current) {
        localStorage.setItem('origen_fondos_processing', 'true');
      }
    };
  }, []);

  // Mantener feedback cuando la ventana pierde foco (sin pausar procesamiento)
  useEffect(() => {
    const onVisibility = () => {
      if (document.hidden) {
        pushLog('Ventana en segundo plano: UI puede ir más lenta, procesamiento continúa');
      } else {
        pushLog('Ventana activa: UI en modo completo');
      }
    };
    document.addEventListener('visibilitychange', onVisibility);
    return () => document.removeEventListener('visibilitychange', onVisibility);
  }, []);

  // Rehidratación de métricas, log y reverse info si existen en localStorage
  useEffect(() => {
    try {
      const storedMetrics = localStorage.getItem('origen_fondos_metrics');
      if (storedMetrics) {
        setProcessingMetrics(JSON.parse(storedMetrics));
      }
      const storedLog = localStorage.getItem('origen_fondos_log');
      if (storedLog) {
        setLiveLog(JSON.parse(storedLog));
      }
      const storedReverse = localStorage.getItem('origen_fondos_reverse');
      if (storedReverse) {
        setReverseInfo(JSON.parse(storedReverse));
      }
    } catch {
      // ignore
    }
  }, []);

  /**
   * 🔬 EXTRACTOR ULTRA-ROBUSTO DE DATOS BANCARIOS
   * Implementa múltiples estrategias de detección como Treasury Reserve y AuditBank
   */
  const extractAllBankingData = (text: string, data: Uint8Array): {
    accounts: string[];
    ibans: string[];
    swifts: string[];
    banks: string[];
    routings: string[];
    amounts: Array<{value: number; currency: string; offset: number}>;
    beneficiaries: string[];
    addresses: string[];
    references: string[];
  } => {
    const result = {
      accounts: [] as string[],
      ibans: [] as string[],
      swifts: [] as string[],
      banks: [] as string[],
      routings: [] as string[],
      amounts: [] as Array<{value: number; currency: string; offset: number}>,
      beneficiaries: [] as string[],
      addresses: [] as string[],
      references: [] as string[]
    };

    if (!text || text.length === 0) return result;

    const textUpper = text.toUpperCase();
    let match: RegExpExecArray | null;

    // ====== 1. DETECCIÓN DE CUENTAS BANCARIAS (ULTRA AGRESIVO) ======
    
    // 1.1 Todas las secuencias de 7-30 dígitos
    const allNumbersPattern = /\b\d{7,30}\b/g;
    while ((match = allNumbersPattern.exec(text)) !== null) {
      const num = match[0];
      if (num.length >= 8 && num.length <= 22) {
        // Excluir fechas y secuencias de ceros
        if (!/^(19|20)\d{2}$/.test(num) && !/^0{5,}/.test(num) && !result.accounts.includes(num)) {
          result.accounts.push(num);
        }
      }
    }

    // 1.2 Buscar después de palabras clave
    const accountKeywords = [
      'account', 'cuenta', 'acc', 'acct', 'number', 'no', 'num', '#',
      'account number', 'account no', 'numero de cuenta', 'n°', 'nº',
      'account#', 'acct#', 'acc no'
    ];
    accountKeywords.forEach(keyword => {
      const pattern = new RegExp(`${keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}[:\\s#-]*([0-9\\s\\-]{7,34})`, 'gi');
      while ((match = pattern.exec(text)) !== null) {
        const account = match[1].replace(/[\s-]/g, '');
        if (account.length >= 7 && account.length <= 26 && !result.accounts.includes(account)) {
          result.accounts.push(account);
        }
      }
    });

    // ====== 2. DETECCIÓN DE IBAN (MÚLTIPLES MÉTODOS) ======
    
    // 2.1 IBAN estándar sin espacios
    const ibanPattern1 = /\b[A-Z]{2}\d{2}[A-Z0-9]{11,32}\b/g;
    while ((match = ibanPattern1.exec(text)) !== null) {
      const iban = match[0];
      if (iban.length >= 15 && iban.length <= 34 && !result.ibans.includes(iban)) {
        result.ibans.push(iban);
      }
    }

    // 2.2 IBAN con espacios
    const ibanPattern2 = /\b([A-Z]{2}\d{2}[\sA-Z0-9]{11,50})\b/g;
    while ((match = ibanPattern2.exec(text)) !== null) {
      const iban = match[1].replace(/\s/g, '');
      if (/^[A-Z]{2}\d{2}[A-Z0-9]{11,32}$/.test(iban) && !result.ibans.includes(iban)) {
        result.ibans.push(iban);
      }
    }

    // 2.3 IBAN después de keyword
    ['iban', 'IBAN', 'iban:', 'IBAN:', 'iban code', 'IBAN CODE'].forEach(keyword => {
      const pattern = new RegExp(`${keyword}[:\\s]*([A-Z]{2}\\d{2}[A-Z0-9\\s]{11,50})`, 'gi');
      while ((match = pattern.exec(text)) !== null) {
        const iban = match[1].replace(/\s/g, '').trim();
        if (iban.length >= 15 && iban.length <= 34 && !result.ibans.includes(iban)) {
          result.ibans.push(iban);
        }
      }
    });

    // ====== 3. DETECCIÓN DE SWIFT/BIC ======
    
    // 3.1 SWIFT estándar (8-11 caracteres)
    const swiftPattern = /\b[A-Z]{4}[A-Z]{2}[A-Z0-9]{2,5}\b/g;
    const commonWords = ['TRANSFER', 'ACCOUNT', 'PAYMENT', 'BALANCE', 'AMOUNT', 'NUMBER', 'STATUS', 'PENDING', 'COMPLETE', 'SUCCESS'];
    while ((match = swiftPattern.exec(text)) !== null) {
      const swift = match[0];
      if (swift.length >= 8 && swift.length <= 11 && !commonWords.includes(swift) && !result.swifts.includes(swift)) {
        result.swifts.push(swift);
      }
    }

    // 3.2 SWIFT después de keywords
    ['swift', 'SWIFT', 'bic', 'BIC', 'swift:', 'SWIFT:', 'bic:', 'BIC:', 'swift code', 'bank code'].forEach(keyword => {
      const pattern = new RegExp(`${keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}[:\\s]*([A-Z]{4}[A-Z]{2}[A-Z0-9]{2,5})`, 'gi');
      while ((match = pattern.exec(text)) !== null) {
        const swift = match[1].toUpperCase();
        if (swift.length >= 8 && swift.length <= 11 && !result.swifts.includes(swift)) {
          result.swifts.push(swift);
        }
      }
    });

    // ====== 4. DETECCIÓN DE NOMBRES DE BANCOS ======
    
    // 4.1 Bancos conocidos
    KNOWN_BANKS_EXPANDED.forEach(bank => {
      if (textUpper.includes(bank.toUpperCase()) && !result.banks.includes(bank)) {
        result.banks.push(bank);
      }
    });

    // 4.2 Patrón "Bank:" seguido del nombre
    const bankPattern1 = /(?:Bank|Banco|Institution|Financial\s+Institution):\s*([A-Z][A-Za-z\s\.&]{3,50})/gi;
    while ((match = bankPattern1.exec(text)) !== null) {
      const bankName = match[1].trim();
      if (bankName.length > 3 && !result.banks.some(b => b.toUpperCase() === bankName.toUpperCase())) {
        result.banks.push(bankName);
      }
    }

    // 4.3 Patrón "[Nombre] BANK"
    const bankPattern2 = /\b([A-Z][A-Za-z\s&]{2,30})\s+(?:BANK|BANCO|NBD|FAB)\b/gi;
    while ((match = bankPattern2.exec(text)) !== null) {
      const bankName = match[0].trim();
      if (bankName.length > 3 && !result.banks.some(b => b.toUpperCase() === bankName.toUpperCase())) {
        result.banks.push(bankName);
      }
    }

    // ====== 5. ROUTING NUMBERS (9 dígitos) ======
    const routingPattern = /\b\d{9}\b/g;
    while ((match = routingPattern.exec(text)) !== null) {
      const routing = match[0];
      if (!result.routings.includes(routing) && !result.accounts.includes(routing)) {
        result.routings.push(routing);
      }
    }

    // ====== 6. DETECCIÓN DE MONTOS CON DIVISAS ======
    const currencies = ['USD', 'EUR', 'GBP', 'CHF', 'CAD', 'AUD', 'JPY', 'CNY', 'INR', 'MXN', 'BRL', 'RUB', 'KRW', 'SGD', 'HKD', 'AED'];
    const currencySymbols: Record<string, string> = { '$': 'USD', '€': 'EUR', '£': 'GBP', '¥': 'JPY', 'R$': 'BRL' };

    // 6.1 Símbolos de divisa
    for (const [symbol, curr] of Object.entries(currencySymbols)) {
      const symbolPattern = new RegExp(`\\${symbol}\\s*([0-9,]+\\.?\\d{0,2})`, 'g');
      while ((match = symbolPattern.exec(text)) !== null) {
        const valueStr = match[1].replace(/,/g, '');
        const value = parseFloat(valueStr);
        if (!isNaN(value) && value > 0) {
          result.amounts.push({ value, currency: curr, offset: match.index });
        }
      }
    }

    // 6.2 Código de divisa + monto
    currencies.forEach(currency => {
      const pattern1 = new RegExp(`${currency}\\s*([0-9,]+\\.?\\d{0,2})`, 'gi');
      while ((match = pattern1.exec(text)) !== null) {
        const valueStr = match[1].replace(/,/g, '');
        const value = parseFloat(valueStr);
        if (!isNaN(value) && value > 0) {
          const existing = result.amounts.find(a => Math.abs(a.value - value) < 0.01 && a.currency === currency);
          if (!existing) result.amounts.push({ value, currency, offset: match.index });
        }
      }

      // Monto + código de divisa
      const pattern2 = new RegExp(`([0-9,]+\\.?\\d{0,2})\\s*${currency}`, 'gi');
      while ((match = pattern2.exec(text)) !== null) {
        const valueStr = match[1].replace(/,/g, '');
        const value = parseFloat(valueStr);
        if (!isNaN(value) && value > 0) {
          const existing = result.amounts.find(a => Math.abs(a.value - value) < 0.01 && a.currency === currency);
          if (!existing) result.amounts.push({ value, currency, offset: match.index });
        }
      }
    });

    // ====== 7. BENEFICIARIOS ======
    const beneficiaryPatterns = [
      /(?:beneficiary|beneficiario|account\s+holder|titular|recipient|destinatario)[:\s]*([A-Z][A-Za-z\s\.&,]{5,80})/gi,
      /(?:name|nombre)[:\s]*([A-Z][A-Za-z\s\.&,]{5,60})/gi,
      /(?:payee|receiver)[:\s]*([A-Z][A-Za-z\s\.&,]{5,60})/gi
    ];
    beneficiaryPatterns.forEach(pattern => {
      while ((match = pattern.exec(text)) !== null) {
        const name = match[1].trim();
        if (name.length > 5 && name.length < 80 && !result.beneficiaries.includes(name)) {
          result.beneficiaries.push(name);
        }
      }
    });

    // ====== 8. DIRECCIONES ======
    const addressPatterns = [
      /(?:address|direccion|dirección)[:\s]*([A-Z0-9][A-Za-z0-9\s,\.#-]{10,150})/gi,
      /(?:street|calle|avenue|ave|blvd|road|rd)[:\s]*([A-Z0-9][A-Za-z0-9\s,\.#-]{10,100})/gi
    ];
    addressPatterns.forEach(pattern => {
      while ((match = pattern.exec(text)) !== null) {
        const addr = match[1].trim();
        if (addr.length > 10 && addr.length < 150 && !result.addresses.includes(addr)) {
          result.addresses.push(addr);
        }
      }
    });

    // ====== 9. REFERENCIAS ======
    const refPatterns = [
      /(?:reference|ref|referencia|transaction\s+id|tx\s+id)[:\s#]*([A-Z0-9\-]{6,30})/gi,
      /(?:order\s+id|confirmation|confirmación)[:\s#]*([A-Z0-9\-]{6,30})/gi
    ];
    refPatterns.forEach(pattern => {
      while ((match = pattern.exec(text)) !== null) {
        const ref = match[1].trim();
        if (ref.length >= 6 && ref.length <= 30 && !result.references.includes(ref)) {
          result.references.push(ref);
        }
      }
    });

    return result;
  };

  /**
   * ✅ PARSER ESPECÍFICO MEJORADO: Ledger1 Digital Commercial Bank DAES
   * Ingeniería inversa basada en estructura real del archivo
   * DETECCIÓN EN TIEMPO REAL MEJORADA
   */
  const parseLedger1StructuredFormat = (text: string, offset: number): BankAccount[] => {
    const accounts: BankAccount[] = [];
    
    // ✅ Validar entrada
    if (!text || text.length === 0) {
      return accounts;
    }

    // 🔍 Parser específico: formato "BANK SENDER" (capturas tipo HSBC que incluyen ACCOUNT NUMBER / CURRENCY / AMOUNT)
    const tryParseBankSender = () => {
      const bankNameMatch = text.match(/BANK\s+NAME\s*:\s*([A-Z0-9\s]+)/i);
      const accountMatch = text.match(/BANK\s+SENDER\s*:\s*ACCOUNT\s+NUMBER\s*[/\s]+([A-Z0-9\-]+)/i);
      const currencyMatch = text.match(/BANK\s+SENDER\s*:\s*CURRENCY\s*[/\s]+[\(\[]?\s*([A-Z]{3}|EURO|USD|GBP|JPY|CHF|CNY|EUR)/i);
      const amountMatch = text.match(/BANK\s+SENDER\s*:\s*AMOUNT\s*[/\s]+([\d\.\,]+)/i);
      const swiftMatch = text.match(/BANK\s+SENDER\s*:\s*SWIFT\s+CODE\s*[/\s]+([A-Z0-9]{8,11})/i);
      const ibanMatch = text.match(/BANK\s+SENDER\s*:\s*IBAN\s*CODE\s*[/\s]+([A-Z0-9]+)/i);

      const accountNumber = accountMatch ? accountMatch[1].trim() : '';
      if (!accountNumber) return;

      let currency = 'USD';
      if (currencyMatch) {
        const c = currencyMatch[1].toUpperCase();
        currency = c === 'EURO' ? 'EUR' : c;
      }

      let balance = 0;
      if (amountMatch) {
        const amt = amountMatch[1].replace(/\./g, '').replace(/,/g, '');
        balance = parseFloat(amt) || 0;
      }

      const bankName = (bankNameMatch ? bankNameMatch[1].trim() : 'Bank Sender') || 'Bank Sender';

      accounts.push({
        bankName,
        accountNumber,
        accountType: 'Account',
        currency,
        balance,
        iban: ibanMatch ? ibanMatch[1].trim() : undefined,
        swift: swiftMatch ? swiftMatch[1].trim() : undefined,
        extractedAt: new Date().toISOString(),
        confidence: 65,
        detectionLayer: 2
      });
    };

    if (/BANK\s+SENDER\s*:\s*ACCOUNT\s+NUMBER/i.test(text)) {
      tryParseBankSender();
    }
    
    // ✅ DETECCIÓN MEJORADA: Múltiples patrones de sección
    const sectionPatterns = [
      /SECTION\s+\d+:\s*([^\n]+)/gi,
      /════+[^\n]*SECTION[^\n]*════+/gi,
      /─{3,}[^\n]*SECTION[^\n]*─{3,}/gi,
      /╔[═]+╗[^\n]*SECTION[^\n]*╚[═]+╝/gi
    ];
    
    const sections: Array<{name: string, start: number, end: number}> = [];
    let lastSectionEnd = 0;
    
    // Buscar todas las secciones con múltiples patrones
    for (const pattern of sectionPatterns) {
      pattern.lastIndex = 0;
      let match;
      while ((match = pattern.exec(text)) !== null) {
        const sectionName = match[1] ? match[1].trim() : 'UNKNOWN SECTION';
        if (sections.length > 0) {
          sections[sections.length - 1].end = match.index;
        }
        sections.push({
          name: sectionName,
          start: match.index,
          end: text.length
        });
        lastSectionEnd = match.index;
      }
    }
    
    // Si no hay secciones, procesar todo el archivo
    if (sections.length === 0) {
      sections.push({ name: 'ALL ACCOUNTS', start: 0, end: text.length });
    }
    
    // ✅ Procesar cada sección
    for (const section of sections) {
      const sectionText = text.substring(section.start, section.end);
      
      // ✅ DETECCIÓN MEJORADA: Múltiples delimitadores de bloques
      const accountBlocks = sectionText.split(/\n\s*\n|\n─{3,}\n|\n═{3,}\n/);
      
      for (const block of accountBlocks) {
        if (block.trim().length < 15) continue; // Reducido de 20 a 15 para capturar más
        
        // ✅ DETECCIÓN MEJORADA: Patrones más flexibles para Bank
        const bankPatterns = [
          /Bank:\s*([^\n]+)/i,
          /Bank\s+Name:\s*([^\n]+)/i,
          /Institution:\s*([^\n]+)/i,
          /^([A-Z][A-Z\s&]+(?:BANK|BANCO|BANQUE|BANKING)[^\n]*)/m,
          /^([A-Z][A-Z\s&]+(?:NBD|CHASE|HSBC|CITI|WELLS|BOA|UBS|DEUTSCHE|BNP|BARCLAYS)[^\n]*)/m
        ];
        
        let bankMatch = null;
        for (const pattern of bankPatterns) {
          bankMatch = block.match(pattern);
          if (bankMatch) break;
        }
        
        // ✅ DETECCIÓN MEJORADA: Patrones más flexibles para SWIFT
        const swiftPatterns = [
          /SWIFT:\s*([A-Z0-9]{8,11})/i,
          /SWIFT\s+Code:\s*([A-Z0-9]{8,11})/i,
          /BIC:\s*([A-Z0-9]{8,11})/i,
          /\b([A-Z]{4}[A-Z]{2}[A-Z0-9]{2}(?:[A-Z0-9]{3})?)\b/
        ];
        
        let swiftMatch = null;
        for (const pattern of swiftPatterns) {
          swiftMatch = block.match(pattern);
          if (swiftMatch) break;
        }
        
        // ✅ DETECCIÓN MEJORADA: Patrones más flexibles para IBAN
        const ibanPatterns = [
          /IBAN:\s*([A-Z]{2}\d{2}[A-Z0-9]{4,30})/i,
          /IBAN\s+Code:\s*([A-Z]{2}\d{2}[A-Z0-9]{4,30})/i,
          /\b([A-Z]{2}\d{2}[A-Z0-9]{4,30})\b/
        ];
        
        let ibanMatch = null;
        for (const pattern of ibanPatterns) {
          ibanMatch = block.match(pattern);
          if (ibanMatch) break;
        }
        
        // ✅ DETECCIÓN MEJORADA: Patrones más flexibles para Account Number
        const accountNumberPatterns = [
          /(?:Account\s*(?:Number)?:\s*|Account:\s*|Account\s+No[.:]\s*)([A-Z0-9\-\s]{8,34})/i,
          /Account[#\s]+([A-Z0-9\-\s]{8,34})/i,
          /Acc[#\s]+([A-Z0-9\-\s]{8,34})/i
        ];
        
        let accountNumberMatch = null;
        for (const pattern of accountNumberPatterns) {
          accountNumberMatch = block.match(pattern);
          if (accountNumberMatch) break;
        }
        
        const accountTypeMatch = block.match(/Account\s+Type:\s*([^\n]+)/i);
        const currencyMatch = block.match(/Currency:\s*([A-Z]{3})/i);
        
        // ✅ DETECCIÓN MEJORADA: Patrones más flexibles para Balance
        const balancePatterns = [
          /Balance:\s*(?:[A-Z]{3}\s*)?([\d,]+\.?\d*)/i,
          /Balance:\s*[£$€¥]\s*([\d,]+\.?\d*)/i,
          /Balance:\s*([\d,]+\.?\d*)\s*(?:USD|EUR|GBP|CHF|AED|CAD|HKD|SGD|JPY|BRL|MXN|CNY)/i,
          /Balance[:\s]+([\d,]+\.?\d*)/i,
          /Bal[:\s]+([\d,]+\.?\d*)/i,
          /Amount:\s*([\d,]+\.?\d*)/i,
          /(?:USD|EUR|GBP|CHF|AED|CAD|HKD|SGD|JPY|BRL|MXN|CNY)\s*([\d,]+\.?\d*)/i,
          /[£$€¥]\s*([\d,]+\.?\d*)/i,
          /R\$\s*([\d,]+\.?\d*)/i,
          /¥\s*([\d,]+\.?\d*)/i
        ];
        
        let balanceMatch = null;
        for (const pattern of balancePatterns) {
          balanceMatch = block.match(pattern);
          if (balanceMatch) break;
        }
        
        const equivalentMatch = block.match(/Equivalent:\s*USD\s*([\d,]+\.?\d*)/i);
        const accountHolderMatch = block.match(/Account\s+Holder:\s*([^\n]+)/i);
        const statusMatch = block.match(/Status:\s*([^\n]+)/i);
        const countryMatch = block.match(/Country:\s*([^\n]+)/i);
        const classificationMatch = block.match(/Classification:\s*([^\n]+)/i);
        
        // ✅ DETECCIÓN MEJORADA: Buscar banco incluso si no está explícito
        let bankName = bankMatch ? bankMatch[1].trim() : '';
        
        // Si no hay banco explícito, buscar en el contexto
        if (!bankName) {
          // Buscar nombres de bancos conocidos en el bloque
          for (const bank of COMPILED_BANK_PATTERNS) {
            for (const regex of bank.patterns) {
              regex.lastIndex = 0;
              const match = regex.exec(block);
              if (match) {
                bankName = bank.name;
                break;
              }
            }
            if (bankName) break;
          }
        }
        
        // ✅ DETECCIÓN MEJORADA: Buscar cuenta incluso sin banco
        let accountNumber = accountNumberMatch ? accountNumberMatch[1].trim().replace(/[\s\-]/g, '') : '';
        
        // Si no hay account number pero hay IBAN, usar IBAN
        if (!accountNumber && ibanMatch) {
          accountNumber = ibanMatch[1].trim().replace(/\s/g, '');
        }
        
        // ✅ DETECCIÓN MEJORADA: Búsqueda más agresiva de números de cuenta
        if (!accountNumber) {
          // Buscar números de 8-34 dígitos que parezcan cuentas
          const accountCandidates = block.match(/\b(\d{8,34})\b/g);
          if (accountCandidates && accountCandidates.length > 0) {
            // Preferir números más largos (más probable que sean cuentas)
            accountNumber = accountCandidates.sort((a, b) => b.length - a.length)[0];
          }
        }
        
        // ✅ DETECCIÓN MEJORADA: Crear cuenta incluso sin banco si hay suficiente información
        if (accountNumber && accountNumber.length >= 8) {
          // Si no hay banco, usar genérico pero seguir procesando
          if (!bankName) {
            bankName = 'Bank Account';
          }
          
          const currency = currencyMatch ? currencyMatch[1].trim() : 'USD';
          let balance = 0;
          
          // Extraer balance con múltiples estrategias
          if (balanceMatch) {
            const balanceStr = balanceMatch[1].replace(/,/g, '');
            balance = parseFloat(balanceStr) || 0;
          } else if (equivalentMatch) {
            const equivStr = equivalentMatch[1].replace(/,/g, '');
            balance = parseFloat(equivStr) || 0;
          } else {
            // ✅ DETECCIÓN MEJORADA: Buscar números grandes que puedan ser balances
            const largeNumbers = block.match(/\b(\d{6,15})\b/g);
            if (largeNumbers && largeNumbers.length > 0) {
              // Tomar el número más grande que sea razonable
              const numbers = largeNumbers.map(n => parseFloat(n.replace(/,/g, ''))).filter(n => n > 1000 && n < 1e15);
              if (numbers.length > 0) {
                balance = Math.max(...numbers);
              }
            }
          }
          
          // Determinar tipo de cuenta
          let accountType = 'Checking';
          if (accountTypeMatch) {
            accountType = accountTypeMatch[1].trim();
          } else if (classificationMatch) {
            const classification = classificationMatch[1].trim();
            if (classification.includes('Savings') || classification.includes('M0')) accountType = 'Savings';
            else if (classification.includes('Investment') || classification.includes('M3') || classification.includes('M4')) accountType = 'Investment';
            else if (classification.includes('Business') || classification.includes('Corporate')) accountType = 'Business';
          } else {
            // Inferir del contexto
            const blockLower = block.toLowerCase();
            if (blockLower.includes('savings') || blockLower.includes('ahorro')) accountType = 'Savings';
            else if (blockLower.includes('investment') || blockLower.includes('inversión')) accountType = 'Investment';
            else if (blockLower.includes('business') || blockLower.includes('corporate')) accountType = 'Business';
          }
          
          // Calcular confianza basada en campos presentes
          let confidence = 50; // Base más baja para permitir más detecciones
          if (bankMatch) confidence += 20;
          if (swiftMatch) confidence += 15;
          if (ibanMatch) confidence += 15;
          if (balance > 0) confidence += 10;
          if (accountTypeMatch || classificationMatch) confidence += 10;
          confidence = Math.min(100, confidence);
          
          const account: BankAccount = {
            bankName: bankName,
            accountNumber: accountNumber,
            accountType: accountType,
            currency: currency,
            balance: balance,
            iban: ibanMatch ? ibanMatch[1].trim().replace(/\s/g, '') : undefined,
            swift: swiftMatch ? swiftMatch[1].trim() : undefined,
            extractedAt: new Date().toISOString(),
            confidence: confidence,
            detectionLayer: 1 // Detectado por parser estructurado
          };
          
          accounts.push(account);
        }
      }
    }
    
    return accounts;
  };

  /**
   * ✅ CAPA 1: Detección PROFUNDA de nombres de bancos
   * Búsqueda binaria directa + múltiples encodings + patrones comprimidos
   */
  const detectBanksLayer1 = (data: Uint8Array, text: string, offset: number): Array<{bankName: string, position: number}> => {
    const detections: Array<{bankName: string, position: number}> = [];
    const dataLength = data.length;
    
  // ✅ Priorizar texto ya decodificado: una sola pasada sobre el string y sin escaneo byte a byte
  if (text && text.length > 0) {
    const seen = new Set<string>();
    
    // 1) Patrones precompilados (cubre variaciones y alias)
    for (const bank of COMPILED_BANK_PATTERNS) {
      for (const regex of bank.patterns) {
        regex.lastIndex = 0;
        let match: RegExpExecArray | null;
        while ((match = regex.exec(text)) !== null) {
          const pos = match.index + offset;
          const key = `${bank.name}-${pos}`;
          if (!seen.has(key)) {
            detections.push({ bankName: bank.name, position: pos });
            seen.add(key);
          }
        }
      }
    }
    
    // 2) Búsqueda literal rápida para nombres exactos que no coincidan con patrones más flexibles
    BANK_NAME_QUICK_REGEX.lastIndex = 0;
    let quickMatch: RegExpExecArray | null;
    while ((quickMatch = BANK_NAME_QUICK_REGEX.exec(text)) !== null) {
      const pos = quickMatch.index + offset;
      const bankName = quickMatch[0];
      const key = `${bankName}-${pos}`;
      if (!seen.has(key)) {
        detections.push({ bankName, position: pos });
        seen.add(key);
      }
    }
    
    return detections;
  }
  
  // ✅ Fallback: solo si no hay texto decodificado, hacer escaneo binario acotado
  const MAX_BYTE_SCAN = 2 * 1024 * 1024; // Limitar a 2MB para evitar bloqueo
  const dataSlice = dataLength > MAX_BYTE_SCAN ? data.slice(0, MAX_BYTE_SCAN) : data;
  
  for (const bank of BANK_PATTERNS_LAYER1) {
    const bankNameUpper = bank.name.toUpperCase();
    const bankNameBytes = new TextEncoder().encode(bankNameUpper);
    
    for (let i = 0; i <= dataSlice.length - bankNameBytes.length; i++) {
      let match = true;
      for (let j = 0; j < bankNameBytes.length; j++) {
        const byte = dataSlice[i + j];
        const expectedByte = bankNameBytes[j];
        if (byte !== expectedByte && byte !== expectedByte + 32 && byte !== expectedByte - 32) {
          match = false;
          break;
        }
      }
      if (match) {
        detections.push({
          bankName: bank.name,
          position: i + offset
        });
      }
    }
  }
    
    return detections;
  };

  /**
   * ✅ CAPA 2: Detección ULTRA PROFUNDA de números de cuenta
   * Búsqueda binaria directa + múltiples formatos + patrones numéricos
   * VERSIÓN MEJORADA Y SIMPLIFICADA
   */
  const detectAccountNumbersLayer2 = (data: Uint8Array, text: string, contextStart: number, contextEnd: number, globalOffset: number): string[] => {
    const accountNumbers = new Set<string>();
    
    // ✅ Validar entradas
    if (!data || data.length === 0) {
      return Array.from(accountNumbers);
    }
    if (!text || text.length === 0) {
      return Array.from(accountNumbers);
    }
    
    // ✅ Usar TODO el texto, no solo el contexto
    const searchText = text;
    const dataSlice = data;
    
    // ✅ ESTRATEGIA 1 MEJORADA: Búsqueda binaria directa de secuencias numéricas
    let digitSequence = '';
    
    for (let i = 0; i < dataSlice.length; i++) {
      const byte = dataSlice[i];
      // Verificar si es dígito ASCII (0x30-0x39)
      if (byte >= 0x30 && byte <= 0x39) {
        digitSequence += String.fromCharCode(byte);
      } else {
        // Fin de secuencia numérica
        if (digitSequence.length >= 8 && digitSequence.length <= 34) { // Más permisivo: 8-34
          accountNumbers.add(digitSequence);
        }
        digitSequence = '';
      }
    }
    
    // Verificar última secuencia
    if (digitSequence.length >= 8 && digitSequence.length <= 34) {
      accountNumbers.add(digitSequence);
    }
    
    // ✅ ESTRATEGIA 2 MEJORADA: Búsqueda de números en formato texto (TODO el texto)
    for (const pattern of ACCOUNT_PATTERNS) {
      pattern.lastIndex = 0; // Reset
      let match;
      while ((match = pattern.exec(searchText)) !== null) {
        const cleaned = match[0].replace(/[\s-]/g, '');
        if (cleaned.length >= 8 && cleaned.length <= 34) {
          accountNumbers.add(cleaned);
        }
      }
    }
    
    // ✅ ESTRATEGIA 3 NUEVA: Búsqueda agresiva de cualquier número de 8+ dígitos
    const aggressivePattern = /\b(\d{8,34})\b/g;
    aggressivePattern.lastIndex = 0;
    let match;
    while ((match = aggressivePattern.exec(searchText)) !== null) {
      accountNumbers.add(match[1]);
    }
    
    // ✅ ESTRATEGIA 3: Búsqueda de patrones con separadores (espacios, guiones, puntos)
    const patternsWithSeparators = [
      /\b\d{4}[\s\-\.]\d{4}[\s\-\.]\d{4}[\s\-\.]\d{4}\b/g,
      /\b\d{3}[\s\-\.]\d{3}[\s\-\.]\d{4}[\s\-\.]\d{4}\b/g,
      /\b\d{2}[\s\-\.]\d{4}[\s\-\.]\d{4}[\s\-\.]\d{4}\b/g
    ];
    
    for (const pattern of patternsWithSeparators) {
      pattern.lastIndex = 0;
      let match;
      while ((match = pattern.exec(searchText)) !== null) {
        const cleaned = match[0].replace(/[\s\-\.]/g, '');
        if (cleaned.length >= 8 && cleaned.length <= 34) {
          accountNumbers.add(cleaned);
        }
      }
    }
    
    return Array.from(accountNumbers);
  };

  /**
   * ✅ CAPA 3: Detección de IBAN/SWIFT
   */
  const detectIBANSwiftLayer3 = (text: string, contextStart: number, contextEnd: number): {iban?: string, swift?: string} => {
    const context = text.substring(contextStart, contextEnd);
    const result: {iban?: string, swift?: string} = {};
    
    // Detectar IBAN
    const ibanMatch = context.match(IBAN_PATTERN);
    if (ibanMatch && ibanMatch[0]) {
      result.iban = ibanMatch[0].replace(/\s/g, '');
    }
    
    // Detectar SWIFT
    const swiftMatch = context.match(SWIFT_PATTERN);
    if (swiftMatch && swiftMatch[0]) {
      result.swift = swiftMatch[0];
    }
    
    return result;
  };

  /**
   * 🔬 SISTEMA DE INGENIERÍA INVERSA PROFUNDA - ANÁLISIS ESTRUCTURAL COMPLETO
   * Analiza la estructura, formato, encoding y binario del archivo Ledger1
   */
  
  interface FileStructureAnalysis {
    fileFormat: 'text' | 'binary' | 'structured' | 'encrypted' | 'compressed' | 'mixed';
    encoding: string;
    language: string;
    structure: {
      hasHeader: boolean;
      hasFooter: boolean;
      blockSize?: number;
      recordSize?: number;
      delimiter?: string;
      sections: Array<{name: string, start: number, end: number, type: string}>;
    };
    binaryAnalysis: {
      endianness: 'little' | 'big' | 'mixed' | 'unknown';
      dataTypes: string[];
      patterns: Array<{type: string, offset: number, value: any}>;
    };
    metadata: {
      magicNumber?: string;
      version?: string;
      checksum?: string;
    };
  }
  
  /**
   * 🔬 FASE 1: Análisis profundo de estructura del archivo
   */
  const performDeepFileStructureAnalysis = (
    bytes: Uint8Array, 
    text: string,
    onProgress?: (progress: number, method: string) => void
  ): FileStructureAnalysis => {
    const analysis: FileStructureAnalysis = {
      fileFormat: 'mixed',
      encoding: 'unknown',
      language: 'unknown',
      structure: {
        hasHeader: false,
        hasFooter: false,
        sections: []
      },
      binaryAnalysis: {
        endianness: 'unknown',
        dataTypes: [],
        patterns: []
      },
      metadata: {}
    };
    
    if (onProgress) onProgress(0, 'Iniciando análisis estructural profundo...');
    
    // ✅ DETECCIÓN DE MAGIC NUMBER / FIRMA
    if (bytes.length >= 4) {
      const magicBytes = Array.from(bytes.slice(0, 4))
        .map(b => b.toString(16).padStart(2, '0').toUpperCase())
        .join(' ');
      analysis.metadata.magicNumber = magicBytes;
      
      // Detectar firmas conocidas
      const signatures: Record<string, string> = {
        'B0 42 33 79': 'Digital Commercial Bank DAES',
        'EF BB BF': 'UTF-8 BOM',
        'FF FE': 'UTF-16 LE BOM',
        'FE FF': 'UTF-16 BE BOM',
        '00 00 FE FF': 'UTF-32 BE BOM',
        'FF FE 00 00': 'UTF-32 LE BOM',
        '25 50 44 46': 'PDF',
        '50 4B 03 04': 'ZIP',
        '1F 8B': 'GZIP',
        '7F 45 4C 46': 'ELF',
        '4D 5A': 'PE/EXE'
      };
      
      if (signatures[magicBytes]) {
        analysis.metadata.version = signatures[magicBytes];
        console.log(`[Ingeniería Inversa] 🔍 Magic Number detectado: ${magicBytes} (${signatures[magicBytes]})`);
      }
    }
    
    if (onProgress) onProgress(10, 'Analizando encoding...');
    
    // ✅ DETECCIÓN DE ENCODING PROFUNDA
    const encodingResults = detectEncodingDeep(bytes, text);
    analysis.encoding = encodingResults.encoding;
    analysis.language = encodingResults.language;
    
    if (onProgress) onProgress(20, `Encoding: ${encodingResults.encoding}, Idioma: ${encodingResults.language}`);
    
    // ✅ DETECCIÓN DE FORMATO DEL ARCHIVO
    if (onProgress) onProgress(30, 'Detectando formato del archivo...');
    
    const textRatio = (text.match(/[\x20-\x7E\n\r\t]/g) || []).length / Math.max(1, text.length);
    const binaryRatio = 1 - textRatio;
    
    if (textRatio > 0.8) {
      analysis.fileFormat = 'text';
    } else if (binaryRatio > 0.8) {
      analysis.fileFormat = 'binary';
    } else if (textRatio > 0.4 && binaryRatio > 0.4) {
      analysis.fileFormat = 'mixed';
    }
    
    // Verificar si está encriptado o comprimido
    const { entropy } = performFrequencyAnalysis(bytes);
    if (entropy > 7.5) {
      analysis.fileFormat = 'encrypted';
    } else if (bytes.length % 16 === 0 && entropy > 7.0) {
      analysis.fileFormat = 'encrypted';
    }
    
    if (onProgress) onProgress(40, `Formato: ${analysis.fileFormat}, Entropía: ${entropy.toFixed(2)}`);
    
    // ✅ DETECCIÓN DE HEADER Y FOOTER
    if (onProgress) onProgress(50, 'Detectando headers y footers...');
    
    const headerPatterns = [
      /^[A-Z\s]{10,}/m, // Títulos en mayúsculas
      /^[═─╔╗╚╝]{10,}/m, // Bordes decorativos
      /^SECTION\s+\d+/im, // Secciones numeradas
      /^Digital Commercial Bank/i, // Nombre del banco
      /^LEDGER/i, // Palabra LEDGER
      /^FILE\s+VERSION/i // Versión de archivo
    ];
    
    const footerPatterns = [
      /[═─╔╗╚╝]{10,}$/m, // Bordes al final
      /END\s+OF\s+FILE/i, // Fin de archivo
      /TOTAL\s+ACCOUNTS/i, // Total de cuentas
      /CHECKSUM/i // Checksum
    ];
    
    for (const pattern of headerPatterns) {
      if (pattern.test(text.substring(0, Math.min(1000, text.length)))) {
        analysis.structure.hasHeader = true;
        break;
      }
    }
    
    for (const pattern of footerPatterns) {
      if (pattern.test(text.substring(Math.max(0, text.length - 1000)))) {
        analysis.structure.hasFooter = true;
        break;
      }
    }
    
    if (onProgress) onProgress(60, `Header: ${analysis.structure.hasHeader}, Footer: ${analysis.structure.hasFooter}`);
    
    // ✅ DETECCIÓN DE TAMAÑO DE BLOQUE/RECORD
    if (onProgress) onProgress(70, 'Detectando tamaño de bloques...');
    
    const blockSizes = [16, 32, 64, 128, 256, 512, 1024];
    for (const size of blockSizes) {
      if (bytes.length % size === 0) {
        analysis.structure.blockSize = size;
        break;
      }
    }
    
    // Detectar tamaño de record (patrones repetitivos)
    const recordSize = detectRecordSize(bytes);
    if (recordSize) {
      analysis.structure.recordSize = recordSize;
    }
    
    if (onProgress) onProgress(80, `Block Size: ${analysis.structure.blockSize || 'N/A'}, Record Size: ${analysis.structure.recordSize || 'N/A'}`);
    
    // ✅ DETECCIÓN DE DELIMITADORES
    if (onProgress) onProgress(85, 'Detectando delimitadores...');
    
    const delimiters = ['\n\n', '\n---\n', '\n===\n', '\n|||\n', '\t', '|', ','];
    for (const delim of delimiters) {
      const count = (text.match(new RegExp(delim.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g')) || []).length;
      if (count > 10) {
        analysis.structure.delimiter = delim;
        break;
      }
    }
    
    // ✅ DETECCIÓN DE SECCIONES
    if (onProgress) onProgress(90, 'Detectando secciones...');
    
    const sectionPatterns = [
      /SECTION\s+(\d+)[:\s]+([^\n]+)/gi,
      /════+\s*([^\n]+)\s*════+/gi,
      /─{3,}\s*([^\n]+)\s*─{3,}/gi,
      /╔[═]+╗\s*([^\n]+)\s*╚[═]+╝/gi,
      /\[([^\]]+)\]/g
    ];
    
    for (const pattern of sectionPatterns) {
      pattern.lastIndex = 0;
      let match;
      while ((match = pattern.exec(text)) !== null) {
        analysis.structure.sections.push({
          name: match[1] || match[0],
          start: match.index,
          end: match.index + match[0].length,
          type: 'section'
        });
      }
    }
    
    // ✅ ANÁLISIS BINARIO PROFUNDO
    if (onProgress) onProgress(95, 'Análisis binario profundo...');
    
    const binaryAnalysis = performDeepBinaryStructureAnalysis(bytes);
    analysis.binaryAnalysis = binaryAnalysis;
    
    if (onProgress) onProgress(100, 'Análisis estructural completado');
    
    return analysis;
  };
  
  /**
   * 🔬 Detección profunda de encoding
   */
  const detectEncodingDeep = (bytes: Uint8Array, text: string): {encoding: string, language: string} => {
    // Detectar BOM
    if (bytes.length >= 2 && bytes[0] === 0xFF && bytes[1] === 0xFE) {
      return { encoding: 'UTF-16LE', language: 'unknown' };
    }
    if (bytes.length >= 2 && bytes[0] === 0xFE && bytes[1] === 0xFF) {
      return { encoding: 'UTF-16BE', language: 'unknown' };
    }
    if (bytes.length >= 3 && bytes[0] === 0xEF && bytes[1] === 0xBB && bytes[2] === 0xBF) {
      return { encoding: 'UTF-8', language: 'unknown' };
    }
    
    // Análisis de frecuencia de caracteres para detectar idioma
    const asciiCount = (text.match(/[\x20-\x7E]/g) || []).length;
    const asciiRatio = asciiCount / Math.max(1, text.length);
    
    if (asciiRatio > 0.95) {
      // Detectar idioma basado en palabras comunes
      const englishWords = ['the', 'and', 'bank', 'account', 'balance'];
      const spanishWords = ['el', 'la', 'banco', 'cuenta', 'saldo'];
      const portugueseWords = ['o', 'a', 'banco', 'conta', 'saldo'];
      
      const textLower = text.toLowerCase();
      let englishScore = 0, spanishScore = 0, portugueseScore = 0;
      
      for (const word of englishWords) {
        if (textLower.includes(word)) englishScore++;
      }
      for (const word of spanishWords) {
        if (textLower.includes(word)) spanishScore++;
      }
      for (const word of portugueseWords) {
        if (textLower.includes(word)) portugueseScore++;
      }
      
      let language = 'unknown';
      if (englishScore > spanishScore && englishScore > portugueseScore) {
        language = 'english';
      } else if (spanishScore > englishScore && spanishScore > portugueseScore) {
        language = 'spanish';
      } else if (portugueseScore > englishScore && portugueseScore > spanishScore) {
        language = 'portuguese';
      }
      
      return { encoding: 'UTF-8', language };
    }
    
    // Intentar diferentes encodings
    const encodings = ['UTF-8', 'Latin1', 'UTF-16LE', 'UTF-16BE', 'Windows-1252'];
    for (const enc of encodings) {
      try {
        const decoder = new TextDecoder(enc, { fatal: true });
        const decoded = decoder.decode(bytes.slice(0, Math.min(1000, bytes.length)));
        const readableRatio = (decoded.match(/[\x20-\x7E\n\r\t]/g) || []).length / decoded.length;
        if (readableRatio > 0.9) {
          return { encoding: enc, language: 'unknown' };
        }
      } catch {}
    }
    
    return { encoding: 'UTF-8', language: 'unknown' };
  };
  
  /**
   * 🔬 Detección de tamaño de record
   */
  const detectRecordSize = (bytes: Uint8Array): number | null => {
    // Buscar patrones repetitivos que indiquen tamaño de record
    const sizes = [32, 64, 128, 256, 512];
    
    for (const size of sizes) {
      if (bytes.length < size * 3) continue;
      
      // Comparar primeros 3 records
      const record1 = bytes.slice(0, size);
      const record2 = bytes.slice(size, size * 2);
      const record3 = bytes.slice(size * 2, size * 3);
      
      // Calcular similitud
      let similarity1 = 0, similarity2 = 0;
      for (let i = 0; i < size; i++) {
        if (record1[i] === record2[i]) similarity1++;
        if (record2[i] === record3[i]) similarity2++;
      }
      
      const similarity = (similarity1 + similarity2) / (size * 2);
      if (similarity > 0.3) { // Al menos 30% de similitud
        return size;
      }
    }
    
    return null;
  };
  
  /**
   * 🔬 Análisis binario profundo de estructura
   */
  const performDeepBinaryStructureAnalysis = (bytes: Uint8Array): {
    endianness: 'little' | 'big' | 'mixed' | 'unknown';
    dataTypes: string[];
    patterns: Array<{type: string, offset: number, value: any}>;
  } => {
    const result = {
      endianness: 'unknown' as 'little' | 'big' | 'mixed' | 'unknown',
      dataTypes: [] as string[],
      patterns: [] as Array<{type: string, offset: number, value: any}>
    };
    
    if (bytes.length < 8) return result;
    
    // Analizar primeros 1000 bytes para detectar endianness
    let littleEndianCount = 0, bigEndianCount = 0;
    const sampleSize = Math.min(1000, bytes.length - 8);
    
    for (let i = 0; i < sampleSize; i += 4) {
      if (i + 4 > bytes.length) break;
      
      const view = new DataView(bytes.buffer, bytes.byteOffset + i, 4);
      const le = view.getUint32(0, true);
      const be = view.getUint32(0, false);
      
      // Si el valor LE es más "razonable" (menor), probablemente es LE
      if (le < be && le < 0xFFFFFFFF / 2) {
        littleEndianCount++;
      } else if (be < le && be < 0xFFFFFFFF / 2) {
        bigEndianCount++;
      }
    }
    
    if (littleEndianCount > bigEndianCount * 1.5) {
      result.endianness = 'little';
    } else if (bigEndianCount > littleEndianCount * 1.5) {
      result.endianness = 'big';
    } else if (littleEndianCount > 0 || bigEndianCount > 0) {
      result.endianness = 'mixed';
    }
    
    // Detectar tipos de datos
    const dataTypes = new Set<string>();
    for (let i = 0; i < Math.min(1000, bytes.length - 8); i += 4) {
      if (i + 8 > bytes.length) break;
      
      const view = new DataView(bytes.buffer, bytes.byteOffset + i, 8);
      
      // Detectar uint32
      const u32 = view.getUint32(0, true);
      if (u32 > 0 && u32 < 0xFFFFFFFF) {
        dataTypes.add('uint32');
        result.patterns.push({ type: 'uint32', offset: i, value: u32 });
      }
      
      // Detectar float
      const f32 = view.getFloat32(0, true);
      if (!isNaN(f32) && isFinite(f32) && f32 !== 0) {
        dataTypes.add('float32');
        result.patterns.push({ type: 'float32', offset: i, value: f32 });
      }
      
      // Detectar double
      const f64 = view.getFloat64(0, true);
      if (!isNaN(f64) && isFinite(f64) && f64 !== 0 && Math.abs(f64) < 1e15) {
        dataTypes.add('float64');
        result.patterns.push({ type: 'float64', offset: i, value: f64 });
      }
    }
    
    result.dataTypes = Array.from(dataTypes);
    
    return result;
  };

  /**
   * 🔐 TÉCNICAS ULTRA AVANZADAS DE DESCRIFRAMIENTO - ÚLTIMA GENERACIÓN
   */
  
  // ✅ XOR Cipher Detection y Decryption
  const detectAndDecryptXOR = (data: Uint8Array, callback?: (progress: number, found: number) => void): {decrypted: Uint8Array[], keys: number[]} => {
    const decrypted: Uint8Array[] = [];
    const keys: number[] = [];
    const commonKeys = [0x00, 0xFF, 0xAA, 0x55, 0x42, 0x24, 0x12, 0x6A, 0x5A, 0x3C];
    
    for (let i = 0; i < commonKeys.length; i++) {
      const key = commonKeys[i];
      const decryptedData = new Uint8Array(data.length);
      
      for (let j = 0; j < data.length; j++) {
        decryptedData[j] = data[j] ^ key;
      }
      
      // Verificar si el resultado tiene texto legible
      const text = new TextDecoder('utf-8', { fatal: false }).decode(decryptedData);
      const readableRatio = (text.match(/[A-Za-z0-9\s]{10,}/g) || []).length / Math.max(1, text.length / 100);
      
      if (readableRatio > 0.1) {
        decrypted.push(decryptedData);
        keys.push(key);
        if (callback) callback((i + 1) / commonKeys.length * 100, decrypted.length);
      }
    }
    
    return { decrypted, keys };
  };
  
  // ✅ Base64/Base32 Detection y Decoding
  const detectAndDecodeBase64 = (text: string): {decoded: Uint8Array[], positions: number[]} => {
    const decoded: Uint8Array[] = [];
    const positions: number[] = [];
    const base64Pattern = /[A-Za-z0-9+/]{20,}={0,2}/g;
    
    let match;
    base64Pattern.lastIndex = 0;
    while ((match = base64Pattern.exec(text)) !== null) {
      try {
        const decodedData = atob(match[0]);
        const bytes = new Uint8Array(decodedData.length);
        for (let i = 0; i < decodedData.length; i++) {
          bytes[i] = decodedData.charCodeAt(i);
        }
        decoded.push(bytes);
        positions.push(match.index);
      } catch {}
    }
    
    return { decoded, positions };
  };
  
  // ✅ Frequency Analysis (Análisis de Frecuencia)
  const performFrequencyAnalysis = (data: Uint8Array): {entropy: number, chiSquare: number, likelyEncrypted: boolean} => {
    const freq = new Array(256).fill(0);
    for (let i = 0; i < data.length; i++) {
      freq[data[i]]++;
    }
    
    // Entropía de Shannon
    let entropy = 0;
    for (const f of freq) {
      if (f > 0) {
        const p = f / data.length;
        entropy -= p * Math.log2(p);
      }
    }
    
    // Chi-square test
    const expectedFreq = data.length / 256;
    let chiSquare = 0;
    for (const f of freq) {
      chiSquare += Math.pow(f - expectedFreq, 2) / expectedFreq;
    }
    
    const likelyEncrypted = entropy > 7.0 || chiSquare > 300;
    
    return { entropy, chiSquare, likelyEncrypted };
  };
  
  // ✅ AES Pattern Detection
  const detectAESPatterns = (data: Uint8Array): {isAES: boolean, blockSize: number, confidence: number} => {
    // AES usa bloques de 16 bytes
    const blockSize = 16;
    let aesIndicators = 0;
    
    // Verificar si la longitud es múltiplo de 16
    if (data.length % blockSize === 0) aesIndicators++;
    
    // Verificar entropía alta (característica de AES)
    const { entropy } = performFrequencyAnalysis(data);
    if (entropy > 7.5) aesIndicators++;
    
    // Verificar patrones de padding PKCS#7
    const lastBlock = data.slice(data.length - blockSize);
    const paddingValue = lastBlock[blockSize - 1];
    if (paddingValue > 0 && paddingValue <= blockSize) {
      let validPadding = true;
      for (let i = blockSize - paddingValue; i < blockSize; i++) {
        if (lastBlock[i] !== paddingValue) {
          validPadding = false;
          break;
        }
      }
      if (validPadding) aesIndicators++;
    }
    
    const confidence = (aesIndicators / 3) * 100;
    
    return {
      isAES: aesIndicators >= 2,
      blockSize: blockSize,
      confidence: confidence
    };
  };
  
  // ✅ Vigenère Cipher Detection
  const detectVigenereCipher = (text: string): {likelyVigenere: boolean, keyLength: number} => {
    // Kasiski examination para encontrar longitud de clave
    const trigrams = new Map<string, number[]>();
    
    for (let i = 0; i < text.length - 2; i++) {
      const trigram = text.substring(i, i + 3).toUpperCase();
      if (/[A-Z]{3}/.test(trigram)) {
        if (!trigrams.has(trigram)) {
          trigrams.set(trigram, []);
        }
        trigrams.get(trigram)!.push(i);
      }
    }
    
    // Encontrar distancias entre trigramas repetidos
    const distances: number[] = [];
    for (const [trigram, positions] of trigrams.entries()) {
      if (positions.length > 1) {
        for (let i = 1; i < positions.length; i++) {
          distances.push(positions[i] - positions[i - 1]);
        }
      }
    }
    
    // Calcular MCD de distancias para estimar longitud de clave
    const gcd = (a: number, b: number): number => b === 0 ? a : gcd(b, a % b);
    let keyLength = 0;
    if (distances.length > 0) {
      keyLength = distances.reduce((a, b) => gcd(a, b));
    }
    
    return {
      likelyVigenere: distances.length > 5 && keyLength > 0 && keyLength < 30,
      keyLength: keyLength
    };
  };
  
  // ✅ Stream Cipher Detection
  const detectStreamCipher = (data: Uint8Array): {isStreamCipher: boolean, confidence: number} => {
    // Los stream ciphers tienen alta entropía y distribución uniforme
    const { entropy, chiSquare } = performFrequencyAnalysis(data);
    
    // Verificar distribución uniforme (chi-square bajo)
    const isUniform = chiSquare < 300;
    const highEntropy = entropy > 7.0;
    
    const confidence = ((isUniform ? 50 : 0) + (highEntropy ? 50 : 0));
    
    return {
      isStreamCipher: isUniform && highEntropy,
      confidence: confidence
    };
  };
  
  // ✅ ROT Cipher Detection y Decryption
  const detectAndDecryptROT = (text: string): {decrypted: string[], shifts: number[]} => {
    const decrypted: string[] = [];
    const shifts: number[] = [];
    
    // Probar ROT1-ROT25
    for (let shift = 1; shift < 26; shift++) {
      let decryptedText = '';
      for (let i = 0; i < text.length; i++) {
        const char = text[i];
        if (/[A-Z]/.test(char)) {
          decryptedText += String.fromCharCode(((char.charCodeAt(0) - 65 - shift + 26) % 26) + 65);
        } else if (/[a-z]/.test(char)) {
          decryptedText += String.fromCharCode(((char.charCodeAt(0) - 97 - shift + 26) % 26) + 97);
        } else {
          decryptedText += char;
        }
      }
      
      // Verificar si tiene palabras bancarias
      const bankKeywords = ['bank', 'account', 'balance', 'iban', 'swift', 'routing'];
      const hasBankKeywords = bankKeywords.some(keyword => 
        decryptedText.toLowerCase().includes(keyword)
      );
      
      if (hasBankKeywords) {
        decrypted.push(decryptedText);
        shifts.push(shift);
      }
    }
    
    return { decrypted, shifts };
  };

  /**
   * ✅ ALGORITMO 2: Análisis binario profundo ULTRA AVANZADO con desciframiento
   * Similar a Treasury Reserve 1 pero optimizado para cuentas bancarias
   * Incluye técnicas de última generación de criptoanálisis
   */
  const performDeepBinaryAnalysis = async (
    bytes: Uint8Array, 
    text: string, 
    offset: number,
    onProgress?: (progress: number, accounts: number, method: string) => void
  ): Promise<{accounts: BankAccount[], stats: any}> => {
    const accounts: BankAccount[] = [];
    const stats = { 
      patterns32: 0, patterns64: 0, patternsFloat: 0, patternsLE: 0, patternsBE: 0,
      xorDecrypted: 0, base64Decoded: 0, rotDecrypted: 0, aesDetected: 0,
      vigenereDetected: 0, streamCipherDetected: 0,
      highEntropyBlocks: 0, avgEntropy: 0,
      compressed: false, compressedFormat: undefined as undefined | 'gzip' | 'zip'
    };
    
    try {
      // 🔐 FASE 1: Detección de cifrados avanzados
      if (onProgress) onProgress(10, accounts.length, 'Detección de cifrados avanzados...');
      
      // Detectar AES
      const aesDetection = detectAESPatterns(bytes);
      if (aesDetection.isAES) {
        stats.aesDetected++;
        console.log(`[Origen Fondos] 🔐 AES detectado (Confidence: ${aesDetection.confidence.toFixed(1)}%)`);
      }

      // Intentar descifrado AES con contraseña proporcionada
      try {
        const aesResult = await tryAESDecrypt(bytes, aesConfig);
        if (aesResult) {
          stats.aesDecrypted = (stats as any).aesDecrypted ? (stats as any).aesDecrypted + 1 : 1;
          const decryptedText = aesResult.text;
          const accountMatches = decryptedText.match(/\b(\d{8,20})\b/g);
          if (accountMatches) {
            for (const accountNum of accountMatches.slice(0, 10)) {
              accounts.push({
                bankName: 'Bank Account (AES)',
                accountNumber: accountNum,
                accountType: 'Checking',
                currency: 'USD',
                balance: 0,
                extractedAt: new Date().toISOString(),
                confidence: 65,
                detectionLayer: 2
              });
              if (onProgress) onProgress(18, accounts.length, `AES: Cuenta ${accountNum} encontrada`);
            }
          }
          // Reutilizar el texto descifrado para otras heurísticas (base64, ROT)
          const nestedBase64 = detectAndDecodeBase64(decryptedText);
          stats.base64Decoded += nestedBase64.decoded.length;
          for (const decodedData of nestedBase64.decoded) {
            const decodedText = new TextDecoder('utf-8', { fatal: false }).decode(decodedData);
            const accs = decodedText.match(/\b(\d{8,20})\b/g);
            if (accs) {
              for (const accountNum of accs.slice(0, 5)) {
                accounts.push({
                  bankName: 'Bank Account (AES+Base64)',
                  accountNumber: accountNum,
                  accountType: 'Checking',
                  currency: 'USD',
                  balance: 0,
                  extractedAt: new Date().toISOString(),
                  confidence: 60,
                  detectionLayer: 2
                });
              }
            }
          }
        }
      } catch (e) {
        console.warn('[Origen Fondos] AES decrypt fallback error:', e);
      }

      // Detectar compresión ZIP/GZIP
      if (bytes.length >= 4) {
        const sig0 = bytes[0], sig1 = bytes[1], sig2 = bytes[2], sig3 = bytes[3];
        if (sig0 === 0x50 && sig1 === 0x4B && sig2 === 0x03 && sig3 === 0x04) {
          stats.compressed = true;
          stats.compressedFormat = 'zip';
          console.log('[Origen Fondos] 📦 ZIP detectado');
        }
        if (sig0 === 0x1F && sig1 === 0x8B) {
          stats.compressed = true;
          stats.compressedFormat = 'gzip';
          console.log('[Origen Fondos] 📦 GZIP detectado');
        }
      }
      
      // Detectar Stream Cipher
      const streamDetection = detectStreamCipher(bytes);
      if (streamDetection.isStreamCipher) {
        stats.streamCipherDetected++;
        console.log(`[Origen Fondos] 🔐 Stream Cipher detectado (Confidence: ${streamDetection.confidence.toFixed(1)}%)`);
      }
      
      // Detectar Vigenère
      const vigenereDetection = detectVigenereCipher(text);
      if (vigenereDetection.likelyVigenere) {
        stats.vigenereDetected++;
        console.log(`[Origen Fondos] 🔐 Vigenère detectado (Key Length: ${vigenereDetection.keyLength})`);
      }
      
      // 🔐 FASE 2: Desciframiento XOR
      if (onProgress) onProgress(20, accounts.length, 'Desciframiento XOR...');
      const xorResults = detectAndDecryptXOR(bytes, (progress, found) => {
        if (onProgress) onProgress(20 + (progress * 0.1), accounts.length, `XOR: ${found} claves encontradas`);
      });
      stats.xorDecrypted = xorResults.decrypted.length;
      
      // Procesar datos descifrados con XOR
      for (const decryptedData of xorResults.decrypted) {
        const decryptedText = new TextDecoder('utf-8', { fatal: false }).decode(decryptedData);
        const accountMatches = decryptedText.match(/\b(\d{8,20})\b/g);
        if (accountMatches) {
          for (const accountNum of accountMatches.slice(0, 5)) {
            accounts.push({
              bankName: 'Bank Account',
              accountNumber: accountNum,
              accountType: 'Checking',
              currency: 'USD',
              balance: 0,
              extractedAt: new Date().toISOString(),
              confidence: 70,
              detectionLayer: 2
            });
            if (onProgress) onProgress(25, accounts.length, `XOR: Cuenta ${accountNum} encontrada`);
          }
        }
      }
      
      // 🔐 FASE 3: Decodificación Base64
      if (onProgress) onProgress(30, accounts.length, 'Decodificación Base64...');
      const base64Results = detectAndDecodeBase64(text);
      stats.base64Decoded = base64Results.decoded.length;

      // Intentar decodificación Base64 anidada (una pasada adicional)
      const nestedDecoded: Uint8Array[] = [];
      for (const decodedData of base64Results.decoded.slice(0, 3)) {
        const nestedText = new TextDecoder('utf-8', { fatal: false }).decode(decodedData);
        const nested = detectAndDecodeBase64(nestedText);
        nestedDecoded.push(...nested.decoded);
      }
      stats.base64Decoded += nestedDecoded.length;
      
      for (const decodedData of [...base64Results.decoded, ...nestedDecoded]) {
        const decodedText = new TextDecoder('utf-8', { fatal: false }).decode(decodedData);
        const accountMatches = decodedText.match(/\b(\d{8,20})\b/g);
        if (accountMatches) {
          for (const accountNum of accountMatches.slice(0, 5)) {
            accounts.push({
              bankName: 'Bank Account',
              accountNumber: accountNum,
              accountType: 'Checking',
              currency: 'USD',
              balance: 0,
              extractedAt: new Date().toISOString(),
              confidence: 65,
              detectionLayer: 2
            });
            if (onProgress) onProgress(35, accounts.length, `Base64: Cuenta ${accountNum} encontrada`);
          }
        }
      }
      
      // 🔐 FASE 4: Desciframiento ROT
      if (onProgress) onProgress(40, accounts.length, 'Desciframiento ROT...');
      const rotResults = detectAndDecryptROT(text);
      stats.rotDecrypted = rotResults.decrypted.length;
      
      for (const decryptedText of rotResults.decrypted) {
        const accountMatches = decryptedText.match(/\b(\d{8,20})\b/g);
        if (accountMatches) {
          for (const accountNum of accountMatches.slice(0, 5)) {
            accounts.push({
              bankName: 'Bank Account',
              accountNumber: accountNum,
              accountType: 'Checking',
              currency: 'USD',
              balance: 0,
              extractedAt: new Date().toISOString(),
              confidence: 60,
              detectionLayer: 2
            });
            if (onProgress) onProgress(45, accounts.length, `ROT: Cuenta ${accountNum} encontrada`);
          }
        }
      }
      
      // 🔐 FASE 5: Análisis binario tradicional mejorado
      if (onProgress) onProgress(50, accounts.length, 'Análisis binario profundo...');
      
      // Calcular entropía simple por ventana
      const windowSize = 4096;
      let entropySum = 0;
      let entropyCount = 0;
      for (let i = 0; i < bytes.length; i += windowSize) {
        const slice = bytes.slice(i, Math.min(i + windowSize, bytes.length));
        const freq = new Array(256).fill(0);
        for (let j = 0; j < slice.length; j++) freq[slice[j]]++;
        let ent = 0;
        for (let k = 0; k < 256; k++) {
          if (freq[k] === 0) continue;
          const p = freq[k] / slice.length;
          ent -= p * Math.log2(p);
        }
        entropySum += ent;
        entropyCount++;
        if (ent > 7.5) stats.highEntropyBlocks++;
      }
      stats.avgEntropy = entropyCount ? entropySum / entropyCount : 0;

      // Crear DataView para lectura binaria
      let view: DataView;
      try {
        view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
      } catch {
        const newBuffer = new ArrayBuffer(bytes.length);
        new Uint8Array(newBuffer).set(bytes);
        view = new DataView(newBuffer);
      }
      
      // ✅ ESTRATEGIA 1: Búsqueda de patrones 32-bit (Little-Endian y Big-Endian) - OPTIMIZADO
      const step32 = Math.max(1, Math.floor(bytes.length / 10000)); // Procesar cada N bytes para velocidad
      for (let i = 0; i <= bytes.length - 4; i += step32) {
        if (onProgress && i % 1000 === 0) {
          onProgress(50 + (i / bytes.length) * 20, accounts.length, `32-bit: ${i}/${bytes.length}`);
        }
        try {
          const num32LE = view.getUint32(i, true);
          const num32BE = view.getUint32(i, false);
          
          // Validar si parece número de cuenta (8-20 dígitos cuando se convierte a string)
          const str32LE = num32LE.toString();
          const str32BE = num32BE.toString();
          
          if (str32LE.length >= 8 && str32LE.length <= 20 && num32LE > 10000000) {
            stats.patterns32++;
            stats.patternsLE++;
            
            // Buscar contexto en texto
            const contextStart = Math.max(0, i - 500);
            const contextEnd = Math.min(text.length, i + 500);
            const context = text.substring(contextStart, contextEnd);
            
            // Buscar banco en contexto
            let foundBank = 'Bank Account';
            for (const bank of COMPILED_BANK_PATTERNS) {
              for (const regex of bank.patterns) {
                regex.lastIndex = 0;
                if (regex.test(context)) {
                  foundBank = bank.name;
                  break;
                }
              }
              if (foundBank !== 'Bank Account') break;
            }
            
            accounts.push({
              bankName: foundBank,
              accountNumber: str32LE,
              accountType: 'Checking',
              currency: 'USD',
              balance: 0,
              extractedAt: new Date().toISOString(),
              confidence: foundBank !== 'Bank Account' ? 65 : 55,
              detectionLayer: 2
            });
          }
        } catch {}
      }
      
      // ✅ ESTRATEGIA 2: Búsqueda de patrones 64-bit (Little-Endian y Big-Endian) - OPTIMIZADO
      const step64 = Math.max(1, Math.floor(bytes.length / 10000));
      for (let i = 0; i <= bytes.length - 8; i += step64) {
        if (onProgress && i % 1000 === 0) {
          onProgress(70 + (i / bytes.length) * 15, accounts.length, `64-bit: ${i}/${bytes.length}`);
        }
        try {
          const num64LE = view.getBigUint64(i, true);
          const num64BE = view.getBigUint64(i, false);
          
          const num64LEFloat = Number(num64LE);
          const num64BEFloat = Number(num64BE);
          
          // Validar si parece balance o número de cuenta grande
          if (num64LEFloat > 1000000 && num64LEFloat < 1e15) {
            stats.patterns64++;
            
            // Buscar código de moneda cerca
            const searchStart = Math.max(0, i - 50);
            const searchEnd = Math.min(bytes.length, i + 50);
            const searchArea = bytes.slice(searchStart, searchEnd);
            const searchText = new TextDecoder('utf-8', { fatal: false }).decode(searchArea);
            
            let currency = 'USD';
            const currencyMatch = searchText.match(/\b(USD|EUR|GBP|CHF|AED|CAD|HKD|SGD|JPY|BRL|MXN|CNY)\b/i);
            if (currencyMatch) {
              currency = currencyMatch[1].toUpperCase();
            }
            
            // Si el número es muy grande, probablemente es un balance
            if (num64LEFloat > 10000000) {
              accounts.push({
                bankName: 'Bank Account',
                accountNumber: `BIN-${(offset + i).toString(16)}`,
                accountType: 'Checking',
                currency: currency,
                balance: num64LEFloat,
                extractedAt: new Date().toISOString(),
                confidence: 60,
                detectionLayer: 2
              });
            }
          }
        } catch {}
      }
      
      // ✅ ESTRATEGIA 3: Búsqueda de números IEEE 754 (floating point) - OPTIMIZADO
      const stepFloat = Math.max(1, Math.floor(bytes.length / 10000));
      for (let i = 0; i <= bytes.length - 8; i += stepFloat) {
        if (onProgress && i % 1000 === 0) {
          onProgress(85 + (i / bytes.length) * 10, accounts.length, `IEEE 754: ${i}/${bytes.length}`);
        }
        try {
          const float64LE = view.getFloat64(i, true);
          const float64BE = view.getFloat64(i, false);
          
          // Validar si parece balance financiero
          if (!isNaN(float64LE) && isFinite(float64LE) && float64LE > 1000 && float64LE < 1e15) {
            stats.patternsFloat++;
            
            accounts.push({
              bankName: 'Bank Account',
              accountNumber: `FP-${(offset + i).toString(16)}`,
              accountType: 'Checking',
              currency: 'USD',
              balance: float64LE,
              extractedAt: new Date().toISOString(),
              confidence: 50,
              detectionLayer: 2
            });
          }
        } catch {}
      }
      
      
      if (onProgress) onProgress(100, accounts.length, 'Análisis binario completado');
      
    } catch (error) {
      console.error('[Origen Fondos] Error en análisis binario profundo:', error);
    }
    
    return { accounts, stats };
  };

  /**
   * ✅ ALGORITMO 3: Análisis de patrones múltiples simultáneos - OPTIMIZADO
   */
  const performMultiPatternAnalysis = (
    text: string, 
    bytes: Uint8Array, 
    offset: number,
    onProgress?: (progress: number, accounts: number, method: string) => void
  ): {accounts: BankAccount[], stats: any} => {
    const accounts: BankAccount[] = [];
    const stats = { patterns: 0, matches: 0 };
    
    if (onProgress) onProgress(0, accounts.length, 'Iniciando análisis multi-patrón...');
    
    // ✅ Patrones simultáneos para detectar estructuras bancarias - EXPANDIDOS
    const patterns = [
      // Patrón 1: "Bank: XXXX Account: YYYY Balance: ZZZZ"
      /Bank[:\s]+([A-Za-z\s]+?)\s+Account[:\s]+(\d{8,20})\s+Balance[:\s]+([\d,]+\.?\d*)/gi,
      // Patrón 2: "Account Number: XXXX"
      /Account\s+Number[:\s]+(\d{8,20})/gi,
      // Patrón 3: "IBAN: XXXX Balance: YYYY"
      /IBAN[:\s]+([A-Z]{2}\d{2}[A-Z0-9]{4,30})\s+Balance[:\s]+([\d,]+\.?\d*)/gi,
      // Patrón 4: "SWIFT: XXXX Account: YYYY"
      /SWIFT[:\s]+([A-Z]{4}[A-Z]{2}[A-Z0-9]{2}(?:[A-Z0-9]{3})?)\s+Account[:\s]+(\d{8,20})/gi,
      // Patrón 5: Números de cuenta con contexto bancario
      /(?:Bank|Banco|Banc)[:\s]+([A-Za-z\s]+?)[\s\S]{0,200}?(\d{8,20})/gi
    ];
    
    for (let pIdx = 0; pIdx < patterns.length; pIdx++) {
      const pattern = patterns[pIdx];
      pattern.lastIndex = 0;
      let match;
      let matchCount = 0;
      
      if (onProgress) onProgress((pIdx / patterns.length) * 100, accounts.length, `Patrón ${pIdx + 1}/${patterns.length}`);
      
      while ((match = pattern.exec(text)) !== null) {
        stats.patterns++;
        matchCount++;
        
        if (onProgress && matchCount % 10 === 0) {
          onProgress((pIdx / patterns.length) * 100 + (matchCount / 1000) * (100 / patterns.length), accounts.length, `Patrón ${pIdx + 1}: ${matchCount} coincidencias`);
        }
        
        const bankName = match[1] ? match[1].trim() : 'Bank Account';
        const accountNumber = match[2] || match[1]?.match(/\d{8,20}/)?.[0] || '';
        const balanceStr = match[3] || match[2]?.match(/[\d,]+\.?\d*/)?.[0] || '0';
        const balance = parseFloat(balanceStr.replace(/,/g, '')) || 0;
        
        if (accountNumber && accountNumber.length >= 8) {
          stats.matches++;
          
          // Buscar IBAN o SWIFT en el contexto
          const contextStart = Math.max(0, match.index - 300);
          const contextEnd = Math.min(text.length, match.index + match[0].length + 300);
          const context = text.substring(contextStart, contextEnd);
          
          const ibanMatch = context.match(IBAN_PATTERN);
          const swiftMatch = context.match(SWIFT_PATTERN);
          
          accounts.push({
            bankName: bankName,
            accountNumber: accountNumber,
            accountType: 'Checking',
            currency: 'USD',
            balance: balance,
            iban: ibanMatch ? ibanMatch[0].replace(/\s/g, '') : undefined,
            swift: swiftMatch ? swiftMatch[0] : undefined,
            extractedAt: new Date().toISOString(),
            confidence: (ibanMatch || swiftMatch) ? 75 : 65,
            detectionLayer: 3
          });
        }
      }
    }
    
    return { accounts, stats };
  };

  /**
   * ✅ ALGORITMO 4: Análisis de entropía y estructuras - ULTRA AVANZADO
   */
  const performEntropyStructureAnalysis = (
    bytes: Uint8Array, 
    text: string, 
    offset: number,
    onProgress?: (progress: number, accounts: number, method: string) => void
  ): {accounts: BankAccount[], stats: any} => {
    const accounts: BankAccount[] = [];
    const stats = { entropy: 0, structures: 0, chiSquare: 0, likelyEncrypted: false };
    
    if (onProgress) onProgress(0, accounts.length, 'Análisis de entropía avanzado...');
    
    // ✅ Análisis de frecuencia avanzado con Chi-square
    const freqAnalysis = performFrequencyAnalysis(bytes);
    stats.entropy = freqAnalysis.entropy;
    stats.chiSquare = freqAnalysis.chiSquare;
    stats.likelyEncrypted = freqAnalysis.likelyEncrypted;
    
    if (onProgress) onProgress(30, accounts.length, `Entropía: ${freqAnalysis.entropy.toFixed(2)}, Chi-square: ${freqAnalysis.chiSquare.toFixed(2)}`);
    
    // Si la entropía es baja (< 6), probablemente hay estructuras de texto
    // Si es alta (> 7.5), puede estar encriptado pero aún buscar patrones
    if (entropy < 7.5) {
      // Buscar estructuras JSON-like o XML-like
      const jsonLike = text.match(/\{[^}]{0,500}["']?(?:bank|account|balance)["']?[^}]{0,500}\}/gi);
      const xmlLike = text.match(/<[^>]+(?:bank|account|balance)[^>]*>[\s\S]{0,500}<\/[^>]+>/gi);
      
      if (jsonLike || xmlLike) {
        stats.structures = (jsonLike?.length || 0) + (xmlLike?.length || 0);
        
        // Intentar extraer cuentas de estructuras
        const structures = [...(jsonLike || []), ...(xmlLike || [])];
        for (const structure of structures.slice(0, 10)) {
          const accountMatch = structure.match(/(?:account|number)[":\s]+(\d{8,20})/i);
          const balanceMatch = structure.match(/(?:balance|amount)[":\s]+([\d,]+\.?\d*)/i);
          
          if (accountMatch) {
            accounts.push({
              bankName: 'Bank Account',
              accountNumber: accountMatch[1],
              accountType: 'Checking',
              currency: 'USD',
              balance: balanceMatch ? parseFloat(balanceMatch[1].replace(/,/g, '')) : 0,
              extractedAt: new Date().toISOString(),
              confidence: 60,
              detectionLayer: 4
            });
          }
        }
      }
    }
    
    return { accounts, stats };
  };

  /**
   * ✅ ALGORITMO 5: Análisis de contexto mejorado - OPTIMIZADO
   */
  const performEnhancedContextAnalysis = (
    text: string, 
    bytes: Uint8Array, 
    offset: number,
    onProgress?: (progress: number, accounts: number, method: string) => void
  ): {accounts: BankAccount[], stats: any} => {
    const accounts: BankAccount[] = [];
    const stats = { contexts: 0, validated: 0 };
    
    // Buscar palabras clave bancarias y extraer contexto ampliado
    const keywords = ['bank', 'account', 'balance', 'iban', 'swift', 'routing', 'bic', 'account number'];
    const keywordPositions: Array<{keyword: string, position: number}> = [];
    
    for (const keyword of keywords) {
      const regex = new RegExp(`\\b${keyword}\\b`, 'gi');
      let match;
      regex.lastIndex = 0;
      while ((match = regex.exec(text)) !== null) {
        keywordPositions.push({ keyword, position: match.index });
      }
    }
    
    if (onProgress) onProgress(0, accounts.length, `Analizando ${keywordPositions.length} palabras clave...`);
    
    // Para cada palabra clave, extraer contexto ampliado - PROCESAR TODAS
    const maxKeywords = Math.min(200, keywordPositions.length); // Aumentado a 200
    for (let kIdx = 0; kIdx < maxKeywords; kIdx++) {
      const { keyword, position } = keywordPositions[kIdx];
      stats.contexts++;
      
      if (onProgress && kIdx % 10 === 0) {
        onProgress((kIdx / maxKeywords) * 100, accounts.length, `Contexto ${kIdx + 1}/${maxKeywords}: ${keyword}`);
      }
      
      const contextStart = Math.max(0, position - 1000);
      const contextEnd = Math.min(text.length, position + 1000);
      const context = text.substring(contextStart, contextEnd);
      
      // Buscar número de cuenta en el contexto
      const accountMatch = context.match(/\b(\d{8,20})\b/);
      if (accountMatch) {
        const accountNumber = accountMatch[1];
        
        // Buscar banco
        let foundBank = 'Bank Account';
        for (const bank of COMPILED_BANK_PATTERNS) {
          for (const regex of bank.patterns) {
            regex.lastIndex = 0;
            if (regex.test(context)) {
              foundBank = bank.name;
              break;
            }
          }
          if (foundBank !== 'Bank Account') break;
        }
        
        // Buscar balance
        const balanceMatch = context.match(/(?:balance|amount)[:\s]+([\d,]+\.?\d*)/i);
        const balance = balanceMatch ? parseFloat(balanceMatch[1].replace(/,/g, '')) : 0;
        
        // Buscar IBAN/SWIFT
        const ibanMatch = context.match(IBAN_PATTERN);
        const swiftMatch = context.match(SWIFT_PATTERN);
        
        stats.validated++;
        
        accounts.push({
          bankName: foundBank,
          accountNumber: accountNumber,
          accountType: 'Checking',
          currency: 'USD',
          balance: balance,
          iban: ibanMatch ? ibanMatch[0].replace(/\s/g, '') : undefined,
          swift: swiftMatch ? swiftMatch[0] : undefined,
          extractedAt: new Date().toISOString(),
          confidence: (foundBank !== 'Bank Account' ? 10 : 0) + (ibanMatch ? 20 : 0) + (swiftMatch ? 15 : 0) + (balance > 0 ? 15 : 0) + 40,
          detectionLayer: 5
        });
      }
    }
    
    return { accounts, stats };
  };

  /**
   * ✅ CAPA 4: Detección profunda de balances
   * Múltiples formatos y validación
   */
  const detectBalanceLayer4 = (text: string, accountPosition: number, contextStart: number, contextEnd: number): number => {
    const context = text.substring(contextStart, contextEnd);
    let balance = 0;
    
    // Buscar balances cerca del número de cuenta
    const searchWindow = context.substring(
      Math.max(0, context.indexOf(text.substring(accountPosition, accountPosition + 10)) - 100),
      Math.min(context.length, context.indexOf(text.substring(accountPosition, accountPosition + 10)) + 100)
    );
    
    // Aplicar todos los patrones de balance
    for (const pattern of BALANCE_PATTERNS) {
      const matches = searchWindow.match(pattern);
      if (matches) {
        for (const match of matches) {
          const cleaned = match.replace(/,/g, '');
          const numValue = parseFloat(cleaned);
          if (numValue > balance && numValue < 1e15) { // Validar rango razonable
            balance = numValue;
          }
        }
      }
    }
    
    // Si no se encontró balance, usar heurística basada en posición
    if (balance === 0) {
      // Buscar números grandes cerca
      const largeNumbers = searchWindow.match(/\b\d{8,12}\b/g);
      if (largeNumbers && largeNumbers.length > 0) {
        balance = parseFloat(largeNumbers[0]) / 100; // Dividir para formato money
      }
    }
    
    return balance;
  };

  /**
   * ✅ CAPA 5: Análisis de contexto y relaciones
   * Determina tipo de cuenta, moneda, etc.
   */
  const analyzeContextLayer5 = (text: string, bankName: string, accountNumber: string, contextStart: number, contextEnd: number): {
    accountType: string;
    currency: string;
    confidence: number;
  } => {
    const context = text.substring(contextStart, contextEnd).toLowerCase();
    
    // Detectar tipo de cuenta
    let accountType = 'Checking';
    if (context.includes('savings') || context.includes('ahorro')) accountType = 'Savings';
    else if (context.includes('investment') || context.includes('inversión')) accountType = 'Investment';
    else if (context.includes('business') || context.includes('comercial')) accountType = 'Business';
    else if (context.includes('checking') || context.includes('corriente')) accountType = 'Checking';
    
    // Detectar moneda
    let currency = 'USD';
    const currencyPatterns = [
      { code: 'USD', patterns: ['usd', 'dollar', 'dólar'] },
      { code: 'EUR', patterns: ['eur', 'euro', 'euros'] },
      { code: 'GBP', patterns: ['gbp', 'pound', 'libra'] },
      { code: 'CHF', patterns: ['chf', 'franc', 'franco'] },
      { code: 'JPY', patterns: ['jpy', 'yen'] },
      { code: 'CNY', patterns: ['cny', 'yuan', 'renminbi'] }
    ];
    
    for (const curr of currencyPatterns) {
      if (curr.patterns.some(p => context.includes(p))) {
        currency = curr.code;
        break;
      }
    }
    
    // Calcular confianza basada en contexto
    let confidence = 60; // Base
    if (context.includes('account') || context.includes('cuenta')) confidence += 10;
    if (context.includes('number') || context.includes('número')) confidence += 10;
    if (context.includes('balance') || context.includes('saldo')) confidence += 10;
    if (accountNumber.length >= 10) confidence += 10;
    
    return {
      accountType,
      currency,
      confidence: Math.min(100, confidence)
    };
  };

  /**
   * ✅ CAPA 6: Validación y deduplicación inteligente
   */
  const validateAndDeduplicateLayer6 = (
    account: BankAccount,
    existingAccounts: Map<string, BankAccount>
  ): BankAccount | null => {
    const key = `${account.bankName}-${account.accountNumber}`;
    
    // Si ya existe, verificar si la nueva detección es mejor
    if (existingAccounts.has(key)) {
      const existing = existingAccounts.get(key)!;
      // Si la nueva tiene mayor confianza o más información, actualizar
      if (account.confidence > existing.confidence || 
          (account.iban && !existing.iban) ||
          (account.swift && !existing.swift)) {
        return account;
      }
      return null; // Mantener la existente
    }
    
    // Validar que tenga información mínima
    if (account.bankName && account.accountNumber && account.accountNumber.length >= 8) {
      return account;
    }
    
    return null;
  };

  /**
   * ✅ ALGORITMO PRINCIPAL: Procesamiento profundo en múltiples capas
   * Similar a Treasury Reserve 1 pero optimizado para cuentas bancarias
   * ACTUALIZACIÓN EN TIEMPO REAL OPTIMIZADA
   */
  const handleAnalyzeFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] ?? (e as any).target?.fileOverride;
    if (!file) return;
    currentFileRef.current = file;
    setIsPaused(false);
    resumeFromPauseRef.current = false;

    // Crear nuevo AbortController
    abortControllerRef.current = new AbortController();
    const signal = abortControllerRef.current.signal;

      processingRef.current = true;
      setAnalyzing(true);
      setProgress(0);
    setAlgorithmProgress({}); // Limpiar progreso detallado al iniciar un nuevo análisis
    setReverseInfo(null);
    setLiveLog([]);
    startTimeRef.current = performance.now();
      
      // ✅ INICIALIZAR ESTADO DE TIEMPO REAL
      setRealtimeAccounts([]);
      setRealtimeStats({
        totalFound: 0,
        lastUpdate: new Date().toISOString(),
        currentChunk: 0,
        accountsInChunk: 0
      });

    try {
      const fileIdentifier = `${file.name}_${file.size}_${file.lastModified}`;
      const isSameFile = currentFileName === fileIdentifier;

      console.log('[Origen Fondos] 📂 Iniciando análisis profundo optimizado:', file.name);
      console.log('[Origen Fondos] 📊 Tamaño:', (file.size / (1024 * 1024)).toFixed(2), 'MB');

      const totalSize = file.size;
      setProcessingMetrics({
        totalBytes: totalSize,
        processedBytes: 0,
        mbps: 0,
        etaSeconds: 0,
        currentChunk: 0
      });
      pushLog(`Inicio de análisis: ${file.name} (${(totalSize / 1_000_000).toFixed(2)} MB)`);
      
      // ✅ INGENIERÍA INVERSA PROFUNDA: Analizar estructura del archivo completo
      console.log('[Origen Fondos] 🔬 Iniciando ingeniería inversa profunda del archivo...');
      
      // Leer primeros 1MB para análisis estructural
      const analysisChunk = file.slice(0, Math.min(1024 * 1024, totalSize));
      const analysisBuffer = await analysisChunk.arrayBuffer();
      const analysisBytes = new Uint8Array(analysisBuffer);
      
      // Decodificar para análisis de texto
      let analysisText = '';
      try {
        analysisText = new TextDecoder('utf-8', { fatal: false }).decode(analysisBytes);
      } catch {
        try {
          analysisText = new TextDecoder('latin1', { fatal: false }).decode(analysisBytes);
        } catch {
          analysisText = Array.from(analysisBytes).map(b => String.fromCharCode(b)).join('');
        }
      }
      
      // Realizar análisis estructural profundo
      const fileStructure = performDeepFileStructureAnalysis(
        analysisBytes, 
        analysisText,
        (progress, method) => {
          console.log(`[Ingeniería Inversa] ${progress.toFixed(1)}% - ${method}`);
        }
      );
      
      console.log('[Origen Fondos] ✅ Análisis estructural completado:');
      console.log(`  - Formato: ${fileStructure.fileFormat}`);
      console.log(`  - Encoding: ${fileStructure.encoding}`);
      console.log(`  - Idioma: ${fileStructure.language}`);
      console.log(`  - Magic Number: ${fileStructure.metadata.magicNumber || 'N/A'}`);
      console.log(`  - Block Size: ${fileStructure.structure.blockSize || 'N/A'}`);
      console.log(`  - Record Size: ${fileStructure.structure.recordSize || 'N/A'}`);
      console.log(`  - Endianness: ${fileStructure.binaryAnalysis.endianness}`);
      console.log(`  - Data Types: ${fileStructure.binaryAnalysis.dataTypes.join(', ') || 'N/A'}`);
      console.log(`  - Secciones detectadas: ${fileStructure.structure.sections.length}`);
      pushLog(`Magic: ${fileStructure.metadata.magicNumber || 'N/A'} | Encoding: ${fileStructure.encoding} | Formato: ${fileStructure.fileFormat}`);
      
      // Guardar resumen inicial de ingeniería inversa
      setReverseInfo({
        fileFormat: fileStructure.fileFormat,
        encoding: fileStructure.encoding,
        language: fileStructure.language,
        magicNumber: fileStructure.metadata.magicNumber,
        endianness: fileStructure.binaryAnalysis.endianness,
        dataTypes: fileStructure.binaryAnalysis.dataTypes,
        detectedPatterns: fileStructure.binaryAnalysis.patterns.length,
        lastChunk: 0,
        sections: fileStructure.structure.sections,
        entropy: {
          highEntropyBlocks: fileStructure.binaryAnalysis.patterns.length,
          avgEntropy: 0
        },
        compressed: fileStructure.fileFormat === 'compressed',
        compressedFormat: fileStructure.metadata.magicNumber === '1F 8B' ? 'gzip'
          : fileStructure.metadata.magicNumber === '50 4B 03 04' ? 'zip'
          : undefined
      });
      try {
        localStorage.setItem('origen_fondos_reverse', JSON.stringify({
          fileFormat: fileStructure.fileFormat,
          encoding: fileStructure.encoding,
          language: fileStructure.language,
          magicNumber: fileStructure.metadata.magicNumber,
          endianness: fileStructure.binaryAnalysis.endianness,
          dataTypes: fileStructure.binaryAnalysis.dataTypes,
          detectedPatterns: fileStructure.binaryAnalysis.patterns.length,
          lastChunk: 0,
          sections: fileStructure.structure.sections
        }));
      } catch {}
      
      // ✅ CONTINUAR desde donde quedó si es el mismo archivo
      let offset = isSameFile ? lastProcessedOffset : 0;
      const accountsMap = new Map<string, BankAccount>();
      
      // Añadir cuentas existentes al Map
      accounts.forEach(acc => {
        accountsMap.set(`${acc.bankName}-${acc.accountNumber}`, acc);
      });

      if (isSameFile && offset > 0) {
        const savedProgress = (offset / totalSize) * 100;
        console.log(`[Origen Fondos] 🔄 Continuando desde ${savedProgress.toFixed(1)}%`);
        setProgress(savedProgress);
      } else {
        setCurrentFileName(fileIdentifier);
        localStorage.setItem('origen_fondos_current_file', fileIdentifier);
        setDetectionStats({ layer1: 0, layer2: 0, layer3: 0, layer4: 0, layer5: 0, layer6: 0 });
      }
      pushLog(isSameFile ? 'Reanudando desde progreso previo' : 'Nuevo archivo: reiniciando detecciones');

      let stats = { ...detectionStats };
      
      // ✅ SISTEMA DE ACTUALIZACIÓN EN TIEMPO REAL OPTIMIZADO
      let pendingUpdate = false;
      let lastUpdateTime = Date.now();
      const UPDATE_INTERVAL = 50; // Actualizar cada 50ms máximo
      let accountsToUpdate: BankAccount[] = [];
    let lastChunkNewAccounts = 0; // Mantener cuentas nuevas por chunk para UI
      let lastFlushTime = 0;
      const MIN_FLUSH_INTERVAL = 100; // ms, limitar FPS de UI
      
      const flushUpdates = () => {
        const now = Date.now();
        if (now - lastFlushTime < MIN_FLUSH_INTERVAL && !pendingUpdate) {
          return;
        }
      try {
        // ✅ SIEMPRE actualizar, incluso si no hay nuevas cuentas (para mostrar progreso)
        const accountsArray = Array.from(accountsMap.values());
        
        // ✅ ACTUALIZACIÓN EN TIEMPO REAL: Mostrar últimas cuentas encontradas (últimas 20)
        const newAccounts = accountsArray.slice(-20).reverse(); // Últimas 20, más recientes primero
        
        // ✅ Forzar actualización de UI usando requestAnimationFrame para asegurar renderizado
        requestAnimationFrame(() => {
          setAccounts([...accountsArray]); // Crear nueva referencia para forzar re-render
          setDetectionStats({ ...stats });
          
          // ✅ Actualizar estado de tiempo real INMEDIATAMENTE
          setRealtimeAccounts([...newAccounts]);
          setRealtimeStats({
            totalFound: accountsArray.length,
            lastUpdate: new Date().toISOString(),
            currentChunk: chunkCount,
            accountsInChunk: lastChunkNewAccounts
          });
        });
        
        accountsToUpdate = [];
        pendingUpdate = false;
        lastUpdateTime = Date.now();
        lastFlushTime = now;
        
        console.log(`[Origen Fondos] 🔄 UI Actualizada: ${accountsArray.length} cuentas totales (chunk +${lastChunkNewAccounts})`);
      } catch (flushError) {
        console.error('[Origen Fondos] ❌ Error actualizando UI en tiempo real:', flushError);
      }
      };

      // ✅ Guardar análisis estructural para uso en chunks
      const fileStructureAnalysis = fileStructure;
      
      // ✅ INTENTO DE DESCIFRADO COMPLETO (bloque de prueba hasta 64MB)
      const fullDecrypt = await attemptFullFileDecrypt(file, aesConfig);
      if (fullDecrypt) {
        pushLog(`AES descifrado con ${fullDecrypt.config.mode} ${fullDecrypt.config.useFileHeadAsIV ? 'IV=head' : 'IV=0/hex'}`);
        const decryptedText = fullDecrypt.text;
        const quickAccounts = parseLedger1StructuredFormat(decryptedText, 0);
        quickAccounts.forEach(acc => accountsMap.set(`${acc.bankName}-${acc.accountNumber}`, acc));
        if (quickAccounts.length > 0) {
          setAccounts(Array.from(accountsMap.values()));
          setRealtimeAccounts(quickAccounts.slice(-20));
          setDetectionStats({ ...detectionStats, layer1: detectionStats.layer1 + quickAccounts.length, layer6: detectionStats.layer6 + quickAccounts.length });
          pushLog(`👍 Descifrado produjo ${quickAccounts.length} cuentas preliminares`, 'info');
        } else {
          pushLog('Descifrado produjo texto pero sin cuentas estructuradas', 'warn');
        }
      }

      // ✅ PROCESAMIENTO ASÍNCRONO (no bloquea UI)
      let chunkCount = 0;
      
      const processNextChunk = async (): Promise<void> => {
        try {
          // ✅ Verificar si debe continuar
          if (offset >= totalSize || !processingRef.current || signal.aborted) {
            // ✅ Flush final de actualizaciones pendientes
            flushUpdates();
            
            if (processingRef.current && !signal.aborted) {
              setProgress(100);
              const finalAccounts = Array.from(accountsMap.values());
              setAccounts([...finalAccounts]);
              setDetectionStats({ ...stats });
              
              // ✅ Guardado final inmediato (no usar debounce)
              localStorage.setItem('origen_fondos_accounts', JSON.stringify(finalAccounts));
              localStorage.setItem('origen_fondos_offset', totalSize.toString());
              setLastProcessedOffset(totalSize);
              
              // Limpiar timeout de debounce si existe
              if (saveTimeout) {
                clearTimeout(saveTimeout);
                saveTimeout = null;
              }

              console.log('[Origen Fondos] ✅ ANÁLISIS PROFUNDO COMPLETADO AL 100%');
              console.log(`  Total cuentas: ${finalAccounts.length}`);
              console.log(`  Bancos: ${new Set(finalAccounts.map(a => a.bankName)).size}`);
              console.log(`  Estadísticas de capas:`, stats);

              alert(
                `✅ ${isSpanish ? 'ANÁLISIS PROFUNDO COMPLETADO' : 'DEEP ANALYSIS COMPLETED'}\n\n` +
                `${isSpanish ? 'Cuentas:' : 'Accounts:'} ${finalAccounts.length}\n` +
                `${isSpanish ? 'Bancos:' : 'Banks:'} ${new Set(finalAccounts.map(a => a.bankName)).size}\n\n` +
                `${isSpanish ? 'Detecciones por capa:' : 'Detections by layer:'}\n` +
                `L1: ${stats.layer1} | L2: ${stats.layer2} | L3: ${stats.layer3}\n` +
                `L4: ${stats.layer4} | L5: ${stats.layer5} | L6: ${stats.layer6}`
              );
            } else {
              console.log('[Origen Fondos] ⏸️ Procesamiento detenido');
              flushUpdates();
            }
            
            setAnalyzing(false);
            processingRef.current = false;
            return;
          }

        const chunkStartTime = performance.now();
        const chunkEnd = Math.min(offset + CHUNK_SIZE, totalSize);
        const chunk = file.slice(offset, chunkEnd);
        const buffer = await chunk.arrayBuffer();
        const bytes = new Uint8Array(buffer);
        updateProcessingMetrics(chunkEnd, totalSize, chunkCount);
        
        // ✅ OPTIMIZACIÓN 2: Usar encoding detectado en análisis estructural
        let text = '';
        try {
          // Usar encoding detectado en ingeniería inversa, o detectar si no está disponible
          const encodingToUse = fileStructureAnalysis.encoding !== 'unknown' 
            ? fileStructureAnalysis.encoding 
            : detectEncoding(bytes);
          text = new TextDecoder(encodingToUse, { fatal: false }).decode(bytes);
        } catch {
          // Fallback: intentar UTF-8
          try {
            text = new TextDecoder('utf-8', { fatal: false }).decode(bytes);
          } catch {
            // Último fallback: decodificación básica
            text = Array.from(bytes).map(b => String.fromCharCode(b)).join('');
          }
        }
        
        // ✅ Validar que se decodificó algo
        if (!text || text.length === 0) {
          console.warn('[Origen Fondos] ⚠️ No se pudo decodificar texto del chunk');
          offset = chunkEnd;
          chunkCount++;
          setProgress(Math.min((offset / totalSize) * 100, 100));
          setLastProcessedOffset(offset);
          // Continuar con siguiente chunk
          setTimeout(() => {
            processNextChunk();
          }, 0);
          return;
        }

        // ✅ Inicializar contador de nuevas cuentas en este chunk
        let newAccountsInChunk = 0;
        lastChunkNewAccounts = 0;
        
        // ✅ ACTUALIZAR PROGRESO INMEDIATAMENTE al iniciar chunk
        const currentProgress = Math.min((offset / totalSize) * 100, 100);
        setProgress(currentProgress);
        // ✅ Heartbeat de UI inmediato para mostrar avance aunque aún no haya cuentas
        setRealtimeStats({
          totalFound: accountsMap.size,
          lastUpdate: new Date().toISOString(),
          currentChunk: chunkCount,
          accountsInChunk: 0
        });
        setRealtimeAccounts([]); // Limpia “últimas cuentas” mientras se procesa el nuevo chunk
        
        // ✅ LOGGING DETALLADO PARA DEBUGGING
        console.log(`[Origen Fondos] 🔍 Procesando chunk:`);
        console.log(`  - Offset: ${offset} / ${totalSize} (${currentProgress.toFixed(2)}%)`);
        console.log(`  - Tamaño chunk: ${bytes.length} bytes`);
        console.log(`  - Texto decodificado: ${text.length} caracteres`);
        console.log(`  - Primeros 200 caracteres: ${text.substring(0, 200).replace(/\n/g, ' ')}`);
        pushLog(`Chunk ${chunkCount}: ${(chunkEnd/1_000_000).toFixed(2)} / ${(totalSize/1_000_000).toFixed(2)} MB`);
        
        // Verificar si hay texto legible
        const hasReadableText = /[A-Za-z]{3,}/.test(text);
        console.log(`  - Tiene texto legible: ${hasReadableText}`);
        if (hasReadableText) {
          setLastReadableChunk(chunkCount);
        } else {
          pushLog(`Chunk ${chunkCount} sin texto legible (posible cifrado/compresión)`, 'warn', chunkCount);
        }
        
        // Contar números en el chunk
        const numberCount = (text.match(/\d{8,}/g) || []).length;
        console.log(`  - Números de 8+ dígitos encontrados: ${numberCount}`);
        
        // ✅ ====================================================================
        // SISTEMA DE ANÁLISIS PARALELO MULTI-ALGORITMO PROFUNDO
        // ====================================================================
        // Ejecutar múltiples algoritmos simultáneamente para máxima detección
        console.log(`[Origen Fondos] 🚀 Iniciando análisis paralelo multi-algoritmo...`);
        
        // ✅ ALGORITMO 1: Parser estructurado Ledger1 (ingeniería inversa)
        const structuredAccounts = parseLedger1StructuredFormat(text, offset);
        console.log(`[Origen Fondos] 📋 Algoritmo 1 (Parser estructurado): ${structuredAccounts.length} cuentas`);
        
        // ✅ ALGORITMO 0: Extractor Ultra-Robusto de Datos Bancarios (previo a todo)
        const allBankingData = extractAllBankingData(text, bytes);
        console.log(`[Origen Fondos] 🏦 Extractor Ultra-Robusto:`, {
          cuentas: allBankingData.accounts.length,
          ibans: allBankingData.ibans.length,
          swifts: allBankingData.swifts.length,
          bancos: allBankingData.banks.length,
          routings: allBankingData.routings.length,
          montos: allBankingData.amounts.length,
          beneficiarios: allBankingData.beneficiaries.length
        });
        
        // ✅ Crear cuentas desde datos extraídos (IBAN + SWIFT + Bank)
        for (const ibanCode of allBankingData.ibans) {
          // Encontrar banco y balance más cercano
          const nearestBank = allBankingData.banks[0] || 'International Bank';
          const nearestAmount = allBankingData.amounts[0];
          
          const key = `IBAN-${ibanCode}`;
          if (!accountsMap.has(key)) {
            const ibanAccount: BankAccount = {
              bankName: nearestBank,
              accountNumber: ibanCode.substring(4), // Parte de cuenta del IBAN
              accountType: 'IBAN Account',
              currency: nearestAmount?.currency || ibanCode.substring(0, 2) === 'AE' ? 'AED' : 
                        ibanCode.substring(0, 2) === 'GB' ? 'GBP' : 
                        ibanCode.substring(0, 2) === 'DE' ? 'EUR' : 'USD',
              balance: nearestAmount?.value || 0,
              iban: ibanCode,
              swift: allBankingData.swifts[0],
              beneficiaryName: allBankingData.beneficiaries[0],
              beneficiaryAddress: allBankingData.addresses[0],
              reference: allBankingData.references[0],
              extractedAt: new Date().toISOString(),
              confidence: 85,
              detectionLayer: 3
            };
            accountsMap.set(key, ibanAccount);
            newAccountsInChunk++;
            accountsToUpdate.push(ibanAccount);
            pendingUpdate = true;
            stats.layer3++;
            stats.layer6++;
            console.log(`[Origen Fondos] ✅ IBAN detectado: ${ibanCode}`);
            lastChunkNewAccounts = newAccountsInChunk;
            flushUpdates();
          }
        }
        
        // ✅ Crear cuentas desde SWIFT codes encontrados
        for (const swiftCode of allBankingData.swifts) {
          // Buscar cuenta asociada
          const nearestAccount = allBankingData.accounts[0] || 'SWIFT-' + swiftCode;
          const nearestBank = allBankingData.banks[0] || swiftCode.substring(0, 4);
          const nearestAmount = allBankingData.amounts[0];
          
          const key = `SWIFT-${swiftCode}-${nearestAccount}`;
          if (!accountsMap.has(key)) {
            const swiftAccount: BankAccount = {
              bankName: nearestBank,
              accountNumber: nearestAccount,
              accountType: 'SWIFT Transfer',
              currency: nearestAmount?.currency || 'USD',
              balance: nearestAmount?.value || 0,
              swift: swiftCode,
              beneficiaryName: allBankingData.beneficiaries[0],
              beneficiaryAddress: allBankingData.addresses[0],
              reference: allBankingData.references[0],
              extractedAt: new Date().toISOString(),
              confidence: 80,
              detectionLayer: 3
            };
            accountsMap.set(key, swiftAccount);
            newAccountsInChunk++;
            accountsToUpdate.push(swiftAccount);
            pendingUpdate = true;
            stats.layer3++;
            stats.layer6++;
            console.log(`[Origen Fondos] ✅ SWIFT detectado: ${swiftCode}`);
            lastChunkNewAccounts = newAccountsInChunk;
            flushUpdates();
          }
        }
        
        // ✅ Crear cuentas desde números de cuenta detectados
        for (let i = 0; i < allBankingData.accounts.length; i++) {
          const accNum = allBankingData.accounts[i];
          const bankName = allBankingData.banks[i % allBankingData.banks.length] || 'Bank Account';
          const amount = allBankingData.amounts[i % allBankingData.amounts.length];
          
          const key = `ACC-${bankName}-${accNum}`;
          if (!accountsMap.has(key)) {
            const directAccount: BankAccount = {
              bankName,
              accountNumber: accNum,
              accountType: 'Checking',
              currency: amount?.currency || 'USD',
              balance: amount?.value || 0,
              routingNumber: allBankingData.routings[i % allBankingData.routings.length],
              beneficiaryName: allBankingData.beneficiaries[i % allBankingData.beneficiaries.length],
              beneficiaryAddress: allBankingData.addresses[i % allBankingData.addresses.length],
              reference: allBankingData.references[i % allBankingData.references.length],
              extractedAt: new Date().toISOString(),
              confidence: 70,
              detectionLayer: 2
            };
            accountsMap.set(key, directAccount);
            newAccountsInChunk++;
            accountsToUpdate.push(directAccount);
            pendingUpdate = true;
            stats.layer2++;
            stats.layer6++;
            if (i < 5) console.log(`[Origen Fondos] ✅ Cuenta directa: ${bankName} - ${accNum}`);
            lastChunkNewAccounts = newAccountsInChunk;
            if (i % 10 === 0) flushUpdates(); // Flush cada 10 cuentas
          }
        }
        
        // ✅ Procesar cuentas del parser estructurado (Algoritmo 1)
        for (const structuredAccount of structuredAccounts) {
          const key = `${structuredAccount.bankName}-${structuredAccount.accountNumber}`;
          if (!accountsMap.has(key)) {
            accountsMap.set(key, structuredAccount);
            newAccountsInChunk++;
            accountsToUpdate.push(structuredAccount);
            pendingUpdate = true;
            stats.layer1++;
            stats.layer6++;
            
            console.log(`[Origen Fondos] ✅ Cuenta estructurada: ${structuredAccount.bankName} - ${structuredAccount.accountNumber} - ${fmt.currency(structuredAccount.balance, structuredAccount.currency)}`);
            
            // ✅ ACTUALIZACIÓN INMEDIATA: Mostrar cuenta encontrada en tiempo real
            lastChunkNewAccounts = newAccountsInChunk;
            flushUpdates();
          } else {
            const existing = accountsMap.get(key)!;
            if (structuredAccount.confidence > existing.confidence ||
                (structuredAccount.iban && !existing.iban) ||
                (structuredAccount.swift && !existing.swift) ||
                (structuredAccount.balance > existing.balance)) {
              accountsMap.set(key, structuredAccount);
              accountsToUpdate.push(structuredAccount);
              pendingUpdate = true;
              console.log(`[Origen Fondos] 🔄 Cuenta actualizada: ${structuredAccount.bankName} - ${structuredAccount.accountNumber}`);
              // ✅ ACTUALIZACIÓN INMEDIATA: Mostrar actualización en tiempo real
              lastChunkNewAccounts = newAccountsInChunk;
              flushUpdates();
            }
          }
        }
        
        // ✅ EJECUTAR ALGORITMOS EN PARALELO con callbacks de progreso en tiempo real
        const createProgressCallback = (algorithmName: string) => {
          return (progress: number, accounts: number, method: string) => {
            console.log(`[Origen Fondos] ${algorithmName}: ${progress.toFixed(1)}% - ${method} - ${accounts} cuentas`);
            
            // Actualizar estado de progreso detallado
            setAlgorithmProgress(prev => ({
              ...prev,
              [algorithmName]: { progress, accounts, method }
            }));
            
            // Actualizar UI en tiempo real
            flushUpdates();
          };
        };
        
        const [deepBinaryAnalysis, patternAnalysis, entropyAnalysis, contextAnalysis] = await Promise.all([
          Promise.resolve(performDeepBinaryAnalysis(bytes, text, offset, createProgressCallback('🔬 Algoritmo 2'))),
          Promise.resolve(performMultiPatternAnalysis(text, bytes, offset, createProgressCallback('🎯 Algoritmo 3'))),
          Promise.resolve(performEntropyStructureAnalysis(bytes, text, offset, createProgressCallback('📊 Algoritmo 4'))),
          Promise.resolve(performEnhancedContextAnalysis(text, bytes, offset, createProgressCallback('🔍 Algoritmo 5')))
        ]);
        
        // Actualizar resumen de ingeniería inversa con heurísticas criptográficas y patrones binarios
        setReverseInfo(prev => ({
          ...(prev || {}),
          cipherSummary: {
            aes: (deepBinaryAnalysis.stats?.aesDetected || 0) > 0,
            stream: (deepBinaryAnalysis.stats?.streamCipherDetected || 0) > 0,
            vigenere: (deepBinaryAnalysis.stats?.vigenereDetected || 0) > 0,
            xorKeys: deepBinaryAnalysis.stats?.xorDecrypted || 0,
            base64Blobs: deepBinaryAnalysis.stats?.base64Decoded || 0,
            rotHits: deepBinaryAnalysis.stats?.rotDecrypted || 0,
            aesDecrypted: deepBinaryAnalysis.stats?.aesDecrypted || 0
          },
          detectedPatterns: (prev?.detectedPatterns || 0) +
            (deepBinaryAnalysis.stats?.patterns32 || 0) +
            (deepBinaryAnalysis.stats?.patterns64 || 0),
          entropy: {
            highEntropyBlocks: (deepBinaryAnalysis.stats?.highEntropyBlocks || 0),
            avgEntropy: deepBinaryAnalysis.stats?.avgEntropy || 0
          },
          compressed: prev?.compressed || deepBinaryAnalysis.stats?.compressed || false,
          compressedFormat: prev?.compressedFormat || deepBinaryAnalysis.stats?.compressedFormat,
          fileFormat: deepBinaryAnalysis.stats?.compressed ? 'compressed' : prev?.fileFormat,
          lastChunk: chunkCount
        }));
        try {
          localStorage.setItem('origen_fondos_reverse', JSON.stringify({
            ...(reverseInfo || {}),
            cipherSummary: {
              aes: (deepBinaryAnalysis.stats?.aesDetected || 0) > 0,
              stream: (deepBinaryAnalysis.stats?.streamCipherDetected || 0) > 0,
              vigenere: (deepBinaryAnalysis.stats?.vigenereDetected || 0) > 0,
              xorKeys: deepBinaryAnalysis.stats?.xorDecrypted || 0,
              base64Blobs: deepBinaryAnalysis.stats?.base64Decoded || 0,
              rotHits: deepBinaryAnalysis.stats?.rotDecrypted || 0
            },
            detectedPatterns: (reverseInfo?.detectedPatterns || 0) +
              (deepBinaryAnalysis.stats?.patterns32 || 0) +
              (deepBinaryAnalysis.stats?.patterns64 || 0),
            entropy: {
              highEntropyBlocks: (deepBinaryAnalysis.stats?.highEntropyBlocks || 0),
              avgEntropy: deepBinaryAnalysis.stats?.avgEntropy || 0
            },
            compressed: reverseInfo?.compressed || deepBinaryAnalysis.stats?.compressed || false,
            compressedFormat: reverseInfo?.compressedFormat || deepBinaryAnalysis.stats?.compressedFormat,
            lastChunk: chunkCount
          }));
        } catch {}
        pushLog(
          `Cifrados: AES ${deepBinaryAnalysis.stats?.aesDetected || 0}, Stream ${deepBinaryAnalysis.stats?.streamCipherDetected || 0}, XOR ${deepBinaryAnalysis.stats?.xorDecrypted || 0}, Base64 ${deepBinaryAnalysis.stats?.base64Decoded || 0}, ROT ${deepBinaryAnalysis.stats?.rotDecrypted || 0}`,
          'info',
          chunkCount
        );
        
        console.log(`[Origen Fondos] 🔬 Algoritmo 2 (Análisis binario profundo): ${deepBinaryAnalysis.accounts.length} cuentas`);
        console.log(`[Origen Fondos] 🎯 Algoritmo 3 (Análisis multi-patrón): ${patternAnalysis.accounts.length} cuentas`);
        console.log(`[Origen Fondos] 📊 Algoritmo 4 (Análisis de entropía): ${entropyAnalysis.accounts.length} cuentas`);
        console.log(`[Origen Fondos] 🔍 Algoritmo 5 (Análisis de contexto): ${contextAnalysis.accounts.length} cuentas`);
        
        // ✅ COMBINAR RESULTADOS DE TODOS LOS ALGORITMOS con validación cruzada
        const allAlgorithmAccounts = [
          ...structuredAccounts,
          ...deepBinaryAnalysis.accounts,
          ...patternAnalysis.accounts,
          ...entropyAnalysis.accounts,
          ...contextAnalysis.accounts
        ];
        
        // ✅ SISTEMA DE SCORING Y VALIDACIÓN CRUZADA
        // Agrupar cuentas similares y mejorar confidence basado en múltiples detecciones
        const accountGroups = new Map<string, BankAccount[]>();
        for (const account of allAlgorithmAccounts) {
          const key = account.accountNumber;
          if (!accountGroups.has(key)) {
            accountGroups.set(key, []);
          }
          accountGroups.get(key)!.push(account);
        }
        
        // Para cada grupo, crear cuenta consolidada con mayor confidence
        for (const [accountNum, group] of accountGroups.entries()) {
          if (group.length === 0) continue;
          
          // Calcular confidence basado en número de algoritmos que lo detectaron
          const detectionCount = group.length;
          const maxConfidence = Math.max(...group.map(a => a.confidence));
          const avgConfidence = group.reduce((sum, a) => sum + a.confidence, 0) / group.length;
          const finalConfidence = Math.min(100, maxConfidence + (detectionCount - 1) * 10);
          
          // Seleccionar mejor cuenta del grupo (mayor balance, más información)
          const bestAccount = group.reduce((best, current) => {
            if (current.balance > best.balance) return current;
            if (current.iban && !best.iban) return current;
            if (current.swift && !best.swift) return current;
            if (current.bankName !== 'Bank Account' && best.bankName === 'Bank Account') return current;
            return best;
          });
          
          const consolidatedAccount: BankAccount = {
            ...bestAccount,
            confidence: finalConfidence,
            detectionLayer: Math.min(...group.map(a => a.detectionLayer))
          };
          
          const key = `${consolidatedAccount.bankName}-${consolidatedAccount.accountNumber}`;
          if (!accountsMap.has(key) || consolidatedAccount.confidence > accountsMap.get(key)!.confidence) {
            accountsMap.set(key, consolidatedAccount);
            newAccountsInChunk++;
            accountsToUpdate.push(consolidatedAccount);
            pendingUpdate = true;
            stats.layer1 += detectionCount;
            stats.layer6++;
            
            console.log(`[Origen Fondos] ✅ Cuenta consolidada (${detectionCount} algoritmos): ${consolidatedAccount.bankName} - ${consolidatedAccount.accountNumber} - Confidence: ${finalConfidence}%`);
            
            // ✅ ACTUALIZACIÓN INMEDIATA: Mostrar cuenta consolidada en tiempo real
            lastChunkNewAccounts = newAccountsInChunk;
            flushUpdates();
          }
        }
        
        // ✅ ALGORITMO 6: Detección agresiva de IBANs en TODO el texto
        const ibanPattern = /\b([A-Z]{2}\d{2}[A-Z0-9]{4,30})\b/g;
        const allIBANs: string[] = [];
        let ibanMatch;
        ibanPattern.lastIndex = 0;
        while ((ibanMatch = ibanPattern.exec(text)) !== null) {
          allIBANs.push(ibanMatch[1]);
        }
        console.log(`[Origen Fondos] 🔍 Algoritmo 6 (IBANs): ${allIBANs.length} encontrados`);
        
        for (const ibanStr of allIBANs.slice(0, 20)) { // Aumentado a 20
          const ibanKey = `IBAN-${ibanStr}`;
          if (!accountsMap.has(ibanKey)) {
            const ibanIndex = text.indexOf(ibanStr);
            const contextStart = Math.max(0, ibanIndex - 500);
            const contextEnd = Math.min(text.length, ibanIndex + ibanStr.length + 500);
            const context = text.substring(contextStart, contextEnd);
            
            // Buscar banco en el contexto
            let foundBank = 'Bank Account';
            for (const bank of COMPILED_BANK_PATTERNS) {
              for (const regex of bank.patterns) {
                regex.lastIndex = 0;
                if (regex.test(context)) {
                  foundBank = bank.name;
                  break;
                }
              }
              if (foundBank !== 'Bank Account') break;
            }
            
            // Buscar balance en el contexto (más agresivo)
            let balance = 0;
            const balancePatterns = [
              /(?:USD|EUR|GBP|CHF|AED|CAD|HKD|SGD|JPY|BRL|MXN|CNY)\s*([\d,]+\.?\d*)/gi,
              /Balance[:\s]+([\d,]+\.?\d*)/gi,
              /Amount[:\s]+([\d,]+\.?\d*)/gi,
              /\b(\d{1,3}(?:,\d{3}){2,}(?:\.\d{2})?)\b/g
            ];
            
            for (const pattern of balancePatterns) {
              pattern.lastIndex = 0;
              const matches = context.match(pattern);
              if (matches) {
                for (const match of matches) {
                  const cleaned = match.replace(/[USD|EUR|GBP|CHF|AED|CAD|HKD|SGD|JPY|BRL|MXN|CNY|Balance|Amount|:|\s]/gi, '').replace(/,/g, '');
                  const numValue = parseFloat(cleaned);
                  if (numValue > balance && numValue > 100 && numValue < 1e15) {
                    balance = numValue;
                  }
                }
              }
            }
            
            // Determinar moneda del IBAN
            let currency = 'USD';
            const ibanCountry = ibanStr.substring(0, 2);
            if (ibanCountry === 'GB') currency = 'GBP';
            else if (ibanCountry === 'DE' || ibanCountry === 'FR' || ibanCountry === 'ES' || ibanCountry === 'IT') currency = 'EUR';
            else if (ibanCountry === 'CH') currency = 'CHF';
            else if (ibanCountry === 'AE') currency = 'AED';
            else if (ibanCountry === 'CA') currency = 'CAD';
            else if (ibanCountry === 'HK') currency = 'HKD';
            else if (ibanCountry === 'SG') currency = 'SGD';
            else if (ibanCountry === 'JP') currency = 'JPY';
            else if (ibanCountry === 'BR') currency = 'BRL';
            else if (ibanCountry === 'MX') currency = 'MXN';
            else if (ibanCountry === 'CN') currency = 'CNY';
            
            const ibanAccount: BankAccount = {
              bankName: foundBank,
              accountNumber: ibanStr,
              accountType: 'Checking',
              currency: currency,
              balance: balance,
              iban: ibanStr,
              extractedAt: new Date().toISOString(),
              confidence: foundBank !== 'Bank Account' ? 70 : 60,
              detectionLayer: 1
            };
            
              accountsMap.set(ibanKey, ibanAccount);
              newAccountsInChunk++;
              accountsToUpdate.push(ibanAccount);
              pendingUpdate = true;
              stats.layer1++;
              stats.layer3++;
              stats.layer6++;
              
              console.log(`[Origen Fondos] ✅ IBAN detectado: ${foundBank} - ${ibanStr} - ${fmt.currency(balance, currency)}`);
              
              // ✅ ACTUALIZACIÓN INMEDIATA: Forzar actualización cuando se detecta IBAN
              flushUpdates();
          }
        }
        
        // ✅ DETECCIÓN AGRESIVA: Buscar SWIFTs en TODO el texto
        const swiftPattern = /\b([A-Z]{4}[A-Z]{2}[A-Z0-9]{2}(?:[A-Z0-9]{3})?)\b/g;
        const allSWIFTs: string[] = [];
        let swiftMatch;
        swiftPattern.lastIndex = 0;
        while ((swiftMatch = swiftPattern.exec(text)) !== null) {
          allSWIFTs.push(swiftMatch[1]);
        }
        console.log(`[Origen Fondos] 🔍 SWIFTs encontrados en chunk: ${allSWIFTs.length}`);
        
        for (const swiftStr of allSWIFTs.slice(0, 20)) {
          const swiftKey = `SWIFT-${swiftStr}`;
          if (!accountsMap.has(swiftKey)) {
            const swiftIndex = text.indexOf(swiftStr);
            const contextStart = Math.max(0, swiftIndex - 500);
            const contextEnd = Math.min(text.length, swiftIndex + swiftStr.length + 500);
            const context = text.substring(contextStart, contextEnd);
            
            // Buscar banco en el contexto
            let foundBank = 'Bank Account';
            for (const bank of COMPILED_BANK_PATTERNS) {
              for (const regex of bank.patterns) {
                regex.lastIndex = 0;
                if (regex.test(context)) {
                  foundBank = bank.name;
                  break;
                }
              }
              if (foundBank !== 'Bank Account') break;
            }
            
            // Buscar número de cuenta cerca del SWIFT
            let accountNumber = '';
            const accountNearSwift = context.match(/\b(\d{8,20})\b/);
            if (accountNearSwift) {
              accountNumber = accountNearSwift[1];
            }
            
            // Buscar balance
            let balance = 0;
            const balancePatterns = [
              /(?:USD|EUR|GBP|CHF|AED|CAD|HKD|SGD|JPY|BRL|MXN|CNY)\s*([\d,]+\.?\d*)/gi,
              /Balance[:\s]+([\d,]+\.?\d*)/gi
            ];
            
            for (const pattern of balancePatterns) {
              pattern.lastIndex = 0;
              const matches = context.match(pattern);
              if (matches) {
                for (const match of matches) {
                  const cleaned = match.replace(/[USD|EUR|GBP|CHF|AED|CAD|HKD|SGD|JPY|BRL|MXN|CNY|Balance|:|\s]/gi, '').replace(/,/g, '');
                  const numValue = parseFloat(cleaned);
                  if (numValue > balance && numValue > 100 && numValue < 1e15) {
                    balance = numValue;
                  }
                }
              }
            }
            
            if (accountNumber || balance > 0) {
              const swiftAccount: BankAccount = {
                bankName: foundBank,
                accountNumber: accountNumber || swiftStr,
                accountType: 'Checking',
                currency: 'USD',
                balance: balance,
                swift: swiftStr,
                extractedAt: new Date().toISOString(),
                confidence: foundBank !== 'Bank Account' ? 65 : 55,
                detectionLayer: 1
              };
              
              accountsMap.set(swiftKey, swiftAccount);
              newAccountsInChunk++;
              accountsToUpdate.push(swiftAccount);
              pendingUpdate = true;
              stats.layer1++;
              stats.layer3++;
              stats.layer6++;
              
              console.log(`[Origen Fondos] ✅ SWIFT detectado: ${foundBank} - ${swiftStr} - ${accountNumber || 'N/A'} - ${fmt.currency(balance, 'USD')}`);
              
              // ✅ ACTUALIZACIÓN INMEDIATA: Forzar actualización cuando se detecta SWIFT
              flushUpdates();
            }
          }
        }

        // ✅ PRIORIDAD 2: Detectar bancos en TODO el texto
        const bankDetections: Array<{bankName: string, position: number}> = [];
        
        for (const bank of COMPILED_BANK_PATTERNS) {
          for (const regex of bank.patterns) {
            regex.lastIndex = 0;
            let match;
            while ((match = regex.exec(text)) !== null) {
              bankDetections.push({
                bankName: bank.name,
                position: match.index + offset
              });
            }
          }
        }
        
        stats.layer1 += bankDetections.length;
        console.log(`[Origen Fondos] 🏦 Bancos detectados en chunk: ${bankDetections.length}`);

        // ✅ DETECCIÓN AGRESIVA: Buscar números de cuenta en TODO el texto y binario
        const independentAccountNumbers = detectAccountNumbersLayer2(
          bytes,
          text,
          0,
          text.length,
          offset
        );
        
        console.log(`[Origen Fondos] 🔢 Números de cuenta detectados: ${independentAccountNumbers.length}`);
        
        // Procesar TODOS los números de cuenta encontrados (no limitar)
        for (const accountNum of independentAccountNumbers) {
          if (accountNum.length >= 8 && accountNum.length <= 34) { // Más permisivo: 8-34
            const key = `ACCOUNT-${accountNum}`;
            if (!accountsMap.has(key)) {
              // Buscar contexto alrededor del número de cuenta
              const accountIndex = text.indexOf(accountNum);
              if (accountIndex >= 0) {
                const contextStart = Math.max(0, accountIndex - 300);
                const contextEnd = Math.min(text.length, accountIndex + accountNum.length + 300);
                const context = text.substring(contextStart, contextEnd);
                
                // Buscar banco en el contexto
                let foundBank = 'Bank Account';
                for (const bank of COMPILED_BANK_PATTERNS) {
                  for (const regex of bank.patterns) {
                    regex.lastIndex = 0;
                    if (regex.test(context)) {
                      foundBank = bank.name;
                      break;
                    }
                  }
                  if (foundBank !== 'Bank Account') break;
                }
                
                // Buscar balance en el contexto
                let balance = 0;
                const balancePatterns = [
                  /(?:USD|EUR|GBP|CHF|AED|CAD|HKD|SGD|JPY|BRL|MXN|CNY)\s*([\d,]+\.?\d*)/gi,
                  /Balance[:\s]+([\d,]+\.?\d*)/gi,
                  /Amount[:\s]+([\d,]+\.?\d*)/gi,
                  /\b(\d{1,3}(?:,\d{3}){2,}(?:\.\d{2})?)\b/g
                ];
                
                for (const pattern of balancePatterns) {
                  pattern.lastIndex = 0;
                  const matches = context.match(pattern);
                  if (matches) {
                    for (const match of matches) {
                      const cleaned = match.replace(/[USD|EUR|GBP|CHF|AED|CAD|HKD|SGD|JPY|BRL|MXN|CNY|Balance|Amount|:|\s]/gi, '').replace(/,/g, '');
                      const numValue = parseFloat(cleaned);
                      if (numValue > balance && numValue > 100 && numValue < 1e15) {
                        balance = numValue;
                      }
                    }
                  }
                }
                
                // Buscar moneda en el contexto
                let currency = 'USD';
                const currencyMatch = context.match(/(?:Currency|Moneda)[:\s]+([A-Z]{3})/i) || 
                                     context.match(/\b(USD|EUR|GBP|CHF|AED|CAD|HKD|SGD|JPY|BRL|MXN|CNY)\b/i);
                if (currencyMatch) {
                  currency = currencyMatch[1].toUpperCase();
                }
                
                const independentAccount: BankAccount = {
                  bankName: foundBank,
                  accountNumber: accountNum,
                  accountType: 'Checking',
                  currency: currency,
                  balance: balance,
                  extractedAt: new Date().toISOString(),
                  confidence: foundBank !== 'Bank Account' ? 60 : 50,
                  detectionLayer: 2
                };
                
                accountsMap.set(key, independentAccount);
                newAccountsInChunk++;
                accountsToUpdate.push(independentAccount);
                pendingUpdate = true;
                stats.layer2++;
                stats.layer6++;
                
                console.log(`[Origen Fondos] ✅ Cuenta detectada: ${foundBank} - ${accountNum} - ${fmt.currency(balance, currency)}`);
                
                // ✅ ACTUALIZACIÓN INMEDIATA: Forzar actualización cuando se encuentra cuenta
                flushUpdates();
              }
            }
          }
        }
        
        // ✅ DETECCIÓN DIRECTA DE BALANCES DESDE BINARIO (similar a Treasury Reserve 1)
        // Buscar patrones de moneda seguidos de números grandes
        const currencyBytes = {
          'USD': [0x55, 0x53, 0x44],
          'EUR': [0x45, 0x55, 0x52],
          'GBP': [0x47, 0x42, 0x50],
          'CHF': [0x43, 0x48, 0x46],
          'AED': [0x41, 0x45, 0x44],
          'CAD': [0x43, 0x41, 0x44],
          'HKD': [0x48, 0x4B, 0x44],
          'SGD': [0x53, 0x47, 0x44],
          'JPY': [0x4A, 0x50, 0x59],
          'BRL': [0x42, 0x52, 0x4C],
          'MXN': [0x4D, 0x58, 0x4E],
          'CNY': [0x43, 0x4E, 0x59]
        };
        
        for (const [currency, currencyCode] of Object.entries(currencyBytes)) {
          for (let i = 0; i <= bytes.length - currencyCode.length - 8; i++) {
            let match = true;
            for (let j = 0; j < currencyCode.length; j++) {
              if (bytes[i + j] !== currencyCode[j]) {
                match = false;
                break;
              }
            }
            
            if (match) {
              // Leer 8 bytes después del código de moneda como BigInt
              try {
                const amountBytes = bytes.slice(i + currencyCode.length, i + currencyCode.length + 8);
                const view = new DataView(amountBytes.buffer, amountBytes.byteOffset, amountBytes.byteLength);
                const amountLE = view.getBigUint64(0, true);
                const amountBE = view.getBigUint64(0, false);
                
                const amountLEFloat = Number(amountLE);
                const amountBEFloat = Number(amountBE);
                
                // Si el número es razonable, crear cuenta
                if (amountLEFloat > 1000 && amountLEFloat < 1e15) {
                  const balanceKey = `BALANCE-${currency}-${i + offset}`;
                  if (!accountsMap.has(balanceKey)) {
                    const balanceAccount: BankAccount = {
                      bankName: 'Bank Account',
                      accountNumber: `ACC-${(i + offset).toString(16)}`,
                      accountType: 'Checking',
                      currency: currency,
                      balance: amountLEFloat,
                      extractedAt: new Date().toISOString(),
                      confidence: 55,
                      detectionLayer: 4
                    };
                    
                    accountsMap.set(balanceKey, balanceAccount);
                    newAccountsInChunk++;
                    accountsToUpdate.push(balanceAccount);
                    pendingUpdate = true;
                    stats.layer4++;
                    stats.layer6++;
                    
                    console.log(`[Origen Fondos] ✅ Balance binario detectado: ${currency} ${fmt.currency(amountLEFloat, currency)}`);
                    
                    // ✅ ACTUALIZACIÓN INMEDIATA: Forzar actualización cuando se detecta balance
                    flushUpdates();
                  }
                }
                
                if (amountBEFloat > 1000 && amountBEFloat < 1e15 && amountBEFloat !== amountLEFloat) {
                  const balanceKey = `BALANCE-BE-${currency}-${i + offset}`;
                  if (!accountsMap.has(balanceKey)) {
                    const balanceAccount: BankAccount = {
                      bankName: 'Bank Account',
                      accountNumber: `ACC-BE-${(i + offset).toString(16)}`,
                      accountType: 'Checking',
                      currency: currency,
                      balance: amountBEFloat,
                      extractedAt: new Date().toISOString(),
                      confidence: 55,
                      detectionLayer: 4
                    };
                    
                    accountsMap.set(balanceKey, balanceAccount);
                    newAccountsInChunk++;
                    accountsToUpdate.push(balanceAccount);
                    pendingUpdate = true;
                    stats.layer4++;
                    stats.layer6++;
                    
                    console.log(`[Origen Fondos] ✅ Balance binario (BE) detectado: ${currency} ${fmt.currency(amountBEFloat, currency)}`);
                    
                    // ✅ ACTUALIZACIÓN INMEDIATA: Forzar actualización cuando se detecta balance BE
                    flushUpdates();
                  }
                }
              } catch {}
            }
          }
        }
        
        for (const bankDetection of bankDetections) {
          try {
            const bankPosition = bankDetection.position - offset;
            
            // ✅ Validar posición
            if (bankPosition < 0 || bankPosition >= text.length) {
              continue;
            }
            
            // ✅ Área de contexto ampliada para capturar más información
            const contextStart = Math.max(0, bankPosition - 1000);
            const contextEnd = Math.min(text.length, bankPosition + 1000);
            const context = text.substring(contextStart, contextEnd);
            
            // ✅ También buscar en el binario
            const binaryContextStart = Math.max(0, bankPosition - 1000);
            const binaryContextEnd = Math.min(bytes.length, bankPosition + 1000);
            
            // ✅ Validar que el slice sea válido
            if (binaryContextStart >= binaryContextEnd || binaryContextStart < 0 || binaryContextEnd > bytes.length) {
              continue;
            }
            
            const binarySlice = bytes.slice(binaryContextStart, binaryContextEnd);
            const contextTextSlice = context;

            // CAPA 2: Detectar números de cuenta en el contexto del banco
            const accountNumbers = detectAccountNumbersLayer2(
              binarySlice, 
              contextTextSlice, 
              0,
              contextTextSlice.length,
              offset + binaryContextStart
            );
            stats.layer2 += accountNumbers.length;

          for (const accountNumber of accountNumbers) {
            // CAPA 3: Detectar IBAN/SWIFT (OPTIMIZADO)
            const ibanMatch = context.match(IBAN_PATTERN);
            const swiftMatch = context.match(SWIFT_PATTERN);
            const iban = ibanMatch ? ibanMatch[0].replace(/\s/g, '') : undefined;
            const swift = swiftMatch ? swiftMatch[0] : undefined;
            stats.layer3 += (iban ? 1 : 0) + (swift ? 1 : 0);

            // CAPA 4: Detectar balance (BÚSQUEDA BINARIA PROFUNDA)
            const accountPosInContext = context.indexOf(accountNumber);
            const balanceWindowStart = Math.max(0, accountPosInContext - 200);
            const balanceWindowEnd = Math.min(context.length, accountPosInContext + 200);
            const balanceWindow = context.substring(balanceWindowStart, balanceWindowEnd);
            
            // ✅ Calcular índices del balance en el slice binario
            const balanceDataStartInSlice = Math.max(0, balanceWindowStart);
            const balanceDataEndInSlice = Math.min(binarySlice.length, balanceWindowEnd);
            const balanceDataSlice = binarySlice.slice(balanceDataStartInSlice, balanceDataEndInSlice);
            
            let balance = 0;
            
            // ✅ ESTRATEGIA 1 MEJORADA: Búsqueda en texto (más agresiva)
            for (const pattern of BALANCE_PATTERNS) {
              pattern.lastIndex = 0; // Reset
              const matches = balanceWindow.match(pattern);
              if (matches) {
                for (const match of matches) {
                  const cleaned = match.replace(/,/g, '').replace(/[USD|EUR|GBP|CHF|AED|CAD|HKD|SGD|JPY|BRL|MXN|CNY|Balance|Amount|:|\s]/gi, '');
                  const numValue = parseFloat(cleaned);
                  if (numValue > balance && numValue > 100 && numValue < 1e15) {
                    balance = numValue;
                  }
                }
              }
            }
            
            // ✅ ESTRATEGIA 1B: Buscar números grandes directamente en el contexto
            if (balance === 0) {
              const largeNumbers = context.match(/\b(\d{6,15})\b/g);
              if (largeNumbers) {
                for (const numStr of largeNumbers) {
                  const numValue = parseFloat(numStr);
                  if (numValue > balance && numValue > 1000 && numValue < 1e15) {
                    balance = numValue;
                  }
                }
              }
            }
            
            // ✅ ESTRATEGIA 2: Búsqueda binaria directa de números grandes
            let balanceView: DataView;
            try {
              balanceView = new DataView(balanceDataSlice.buffer, balanceDataSlice.byteOffset, balanceDataSlice.byteLength);
            } catch {
              // Si falla, crear un nuevo buffer
              const newBuffer = new ArrayBuffer(balanceDataSlice.length);
              new Uint8Array(newBuffer).set(balanceDataSlice);
              balanceView = new DataView(newBuffer);
            }
            for (let i = 0; i <= balanceDataSlice.length - 8; i++) {
              try {
                // Leer como números de 64-bit (BigInt)
                const numLE = balanceView.getBigUint64(i, true);
                const numBE = balanceView.getBigUint64(i, false);
                
                // Convertir a número y validar rango
                const numLEFloat = Number(numLE);
                const numBEFloat = Number(numBE);
                
                if (numLEFloat > balance && numLEFloat < 1e15 && numLEFloat > 1000) {
                  balance = numLEFloat;
                }
                if (numBEFloat > balance && numBEFloat < 1e15 && numBEFloat > 1000) {
                  balance = numBEFloat;
                }
              } catch {}
              
              // Leer como números de 32-bit
              try {
                const numLE32 = balanceView.getUint32(i, true);
                const numBE32 = balanceView.getUint32(i, false);
                
                if (numLE32 > balance && numLE32 < 1e15 && numLE32 > 1000) {
                  balance = numLE32;
                }
                if (numBE32 > balance && numBE32 < 1e15 && numBE32 > 1000) {
                  balance = numBE32;
                }
              } catch {}
            }
            
            // ✅ ESTRATEGIA 3: Búsqueda de secuencias numéricas largas en binario
            let digitSeq = '';
            for (let i = 0; i < balanceDataSlice.length; i++) {
              const byte = balanceDataSlice[i];
              if (byte >= 0x30 && byte <= 0x39) {
                digitSeq += String.fromCharCode(byte);
              } else {
                if (digitSeq.length >= 8 && digitSeq.length <= 15) {
                  const numValue = parseFloat(digitSeq);
                  if (numValue > balance && numValue < 1e15 && numValue > 1000) {
                    balance = numValue;
                  }
                }
                digitSeq = '';
              }
            }
            
            // ✅ ESTRATEGIA 4 MEJORADA: Búsqueda más agresiva de números grandes
            if (balance === 0) {
              // Buscar números grandes con diferentes formatos
              const largeNumberPatterns = [
                /\b(\d{6,15})\b/g, // Números de 6-15 dígitos
                /(\d{1,3}(?:,\d{3}){2,}(?:\.\d{2})?)/g, // Formato con comas (1,234,567.89)
                /(\d{4,12}\.\d{2})/g, // Decimales con punto
                /(?:USD|EUR|GBP|CHF|AED|CAD|HKD|SGD|JPY|BRL|MXN|CNY)\s*([\d,]+\.?\d*)/gi // Con símbolo de moneda
              ];
              
              for (const pattern of largeNumberPatterns) {
                const matches = balanceWindow.match(pattern);
                if (matches) {
                  for (const match of matches) {
                    const cleaned = match.replace(/[USD|EUR|GBP|CHF|AED|CAD|HKD|SGD|JPY|BRL|MXN|CNY,]/gi, '').trim();
                    const numValue = parseFloat(cleaned);
                    if (numValue > balance && numValue > 1000 && numValue < 1e15) {
                      balance = numValue;
                    }
                  }
                }
              }
              
              // Si aún no hay balance, buscar cualquier número grande
              if (balance === 0) {
                const largeNumbers = balanceWindow.match(/\b\d{8,12}\b/g);
                if (largeNumbers && largeNumbers.length > 0) {
                  for (const numStr of largeNumbers) {
                    const numValue = parseFloat(numStr);
                    if (numValue > balance && numValue < 1e15) {
                      balance = numValue;
                    }
                  }
                  if (balance > 0 && balance < 1000000) {
                    balance = balance / 100; // Dividir para formato money solo si es pequeño
                  }
                }
              }
            }
            
            stats.layer4 += balance > 0 ? 1 : 0;

            // CAPA 5: Análisis de contexto (OPTIMIZADO)
            const contextLower = context.toLowerCase();
            let accountType = 'Checking';
            if (contextLower.includes('savings') || contextLower.includes('ahorro')) accountType = 'Savings';
            else if (contextLower.includes('investment') || contextLower.includes('inversión')) accountType = 'Investment';
            else if (contextLower.includes('business') || contextLower.includes('comercial')) accountType = 'Business';
            
            let currency = 'USD';
            if (contextLower.includes('eur') || contextLower.includes('euro')) currency = 'EUR';
            else if (contextLower.includes('gbp') || contextLower.includes('pound')) currency = 'GBP';
            else if (contextLower.includes('chf') || contextLower.includes('franc')) currency = 'CHF';
            else if (contextLower.includes('jpy') || contextLower.includes('yen')) currency = 'JPY';
            else if (contextLower.includes('cny') || contextLower.includes('yuan')) currency = 'CNY';
            
            let confidence = 60;
            if (contextLower.includes('account') || contextLower.includes('cuenta')) confidence += 10;
            if (contextLower.includes('number') || contextLower.includes('número')) confidence += 10;
            if (contextLower.includes('balance') || contextLower.includes('saldo')) confidence += 10;
            if (accountNumber.length >= 10) confidence += 10;
            confidence = Math.min(100, confidence);
            
            stats.layer5++;

            // Crear cuenta completa
            const newAccount: BankAccount = {
              bankName: bankDetection.bankName,
              accountNumber: accountNumber,
              accountType: accountType,
              currency: currency,
              balance: balance,
              iban: iban,
              swift: swift || `${bankDetection.bankName.substring(0, 4).toUpperCase().replace(/\s/g, '')}GBXX`,
              extractedAt: new Date().toISOString(),
              confidence: confidence,
              detectionLayer: 6
            };

            // CAPA 6: Validación y deduplicación
            const key = `${newAccount.bankName}-${newAccount.accountNumber}`;
            let shouldAdd = false;
            
            if (accountsMap.has(key)) {
              const existing = accountsMap.get(key)!;
              if (newAccount.confidence > existing.confidence || 
                  (newAccount.iban && !existing.iban) ||
                  (newAccount.swift && !existing.swift)) {
                accountsMap.set(key, newAccount);
                shouldAdd = true;
              }
            } else if (newAccount.bankName && newAccount.accountNumber && newAccount.accountNumber.length >= 8) {
              accountsMap.set(key, newAccount);
              shouldAdd = true;
            }
            
            if (shouldAdd) {
              stats.layer6++;
              newAccountsInChunk++;
              accountsToUpdate.push(newAccount);
              pendingUpdate = true;
              
              console.log(`[Origen Fondos] ✅ Cuenta detectada: ${newAccount.bankName} - ${newAccount.accountNumber} - ${fmt.currency(newAccount.balance, newAccount.currency)}`);
            }
          }
          } catch (bankError) {
            console.error(`[Origen Fondos] ❌ Error procesando banco ${bankDetection.bankName}:`, bankError);
            // Continuar con el siguiente banco
          }
        }

        offset = chunkEnd;
        chunkCount++;
        const progressPercent = Math.min((offset / totalSize) * 100, 100);
        
        // ✅ ACTUALIZACIÓN EN TIEMPO REAL FORZADA - Siempre actualizar progreso
        setProgress(progressPercent);
        setLastProcessedOffset(offset);
        
        // ✅ ACTUALIZACIÓN EN TIEMPO REAL - Forzar actualización SIEMPRE para mostrar progreso
        flushUpdates();
        
        // ✅ Forzar actualización de progreso en UI
        requestAnimationFrame(() => {
          setProgress(progressPercent);
        });
        
        // ✅ Guardar estado cada chunk (async para no bloquear)
        const accountsArray = Array.from(accountsMap.values());
        localStorage.setItem('origen_fondos_offset', offset.toString());
        // ✅ OPTIMIZACIÓN 5: Usar debounce para guardar cuentas (cada 5 segundos máximo)
        debouncedSaveAccounts(accountsArray);
        
        // Log cada 10% o cuando hay nuevas cuentas
        if (Math.floor(progressPercent) % 10 === 0 && Math.floor(progressPercent) !== Math.floor(((offset - CHUNK_SIZE) / totalSize) * 100)) {
          console.log(`[Origen Fondos] 📊 ${progressPercent.toFixed(0)}% - ${accountsMap.size} cuentas detectadas (+${newAccountsInChunk} en este chunk)`);
          console.log(`[Origen Fondos] 🔍 Capas: L1=${stats.layer1} L2=${stats.layer2} L3=${stats.layer3} L4=${stats.layer4} L5=${stats.layer5} L6=${stats.layer6}`);
        } else if (newAccountsInChunk > 0) {
          console.log(`[Origen Fondos] ⚡ ${newAccountsInChunk} nuevas cuentas detectadas - Total: ${accountsMap.size}`);
        }
        
        // ✅ YIELD FRECUENTE: No bloquear UI - yield después de cada chunk
        const chunkTime = performance.now() - chunkStartTime;
        
        // ✅ Forzar actualización final del chunk antes de continuar
        lastChunkNewAccounts = newAccountsInChunk;
        flushUpdates();
        // Actualizar métricas de procesamiento y log
        updateProcessingMetrics(chunkEnd, totalSize, chunkCount);
        pushLog(`Chunk ${chunkCount} completado (+${newAccountsInChunk} cuentas)`, 'info', chunkCount);
        
        // ✅ Usar requestAnimationFrame para asegurar que UI se actualice antes de continuar
        await new Promise(resolve => requestAnimationFrame(resolve));
        
        // ✅ Yield mínimo para dar tiempo al UI de renderizar
        const yieldTime = chunkTime > 50 ? 5 : 0;
        if (yieldTime > 0) {
          await new Promise(resolve => setTimeout(resolve, yieldTime));
        }
        
        // ✅ Continuar con siguiente chunk de forma asíncrona
        // Usar requestAnimationFrame para asegurar que UI se actualice
        requestAnimationFrame(() => {
          setTimeout(() => {
            processNextChunk();
          }, 0);
        });
        
        } catch (chunkError) {
          // ✅ Manejar errores en el procesamiento del chunk
          console.error('[Origen Fondos] ❌ Error procesando chunk:', chunkError);
          console.error('[Origen Fondos] Offset:', offset, 'Total:', totalSize);
          
          // ✅ Calcular chunkEnd si no está definido
          const errorChunkEnd = Math.min(offset + CHUNK_SIZE, totalSize);
          
          // ✅ Intentar continuar con el siguiente chunk si es posible
          if (offset < totalSize && processingRef.current && !signal.aborted) {
            offset = errorChunkEnd;
            chunkCount++;
            setProgress(Math.min((offset / totalSize) * 100, 100));
            setLastProcessedOffset(offset);
            
            // Continuar con siguiente chunk después de un breve delay
            setTimeout(() => {
              processNextChunk();
            }, 100);
          } else {
            // Si no se puede continuar, finalizar
            flushUpdates();
            setAnalyzing(false);
            processingRef.current = false;
            alert(`❌ ${isSpanish ? 'Error procesando archivo' : 'Error processing file'}: ${chunkError instanceof Error ? chunkError.message : 'Unknown error'}`);
          }
        }
      };
      
      // ✅ Iniciar procesamiento asíncrono
      processNextChunk().catch((error) => {
        console.error('[Origen Fondos] ❌ Error fatal en processNextChunk:', error);
        flushUpdates();
        setAnalyzing(false);
        processingRef.current = false;
        alert(`❌ ${isSpanish ? 'Error fatal procesando archivo' : 'Fatal error processing file'}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      });

    } catch (error) {
      console.error('[Origen Fondos] ❌ Error inicial:', error);
      setAnalyzing(false);
      processingRef.current = false;
      alert(`❌ ${isSpanish ? 'Error al iniciar procesamiento' : 'Error starting processing'}: ${error instanceof Error ? error.message : 'Unknown'}`);
    }
  };

  const handleDeleteAccount = (accountNumber: string) => {
    if (confirm(isSpanish ? '¿Eliminar esta cuenta?' : 'Delete this account?')) {
      const updated = accounts.filter(a => a.accountNumber !== accountNumber);
      setAccounts(updated);
      localStorage.setItem('origen_fondos_accounts', JSON.stringify(updated));
      console.log('[Origen Fondos] 🗑️ Cuenta eliminada:', accountNumber);
    }
  };

  const handleDownloadReport = () => {
    const reportContent = `
═══════════════════════════════════════════════════════════════════════════════
                      DIGITAL COMMERCIAL BANK LTD
                         ORIGEN DE FONDOS
                    DEEP SCAN BANK ACCOUNTS REPORT
═══════════════════════════════════════════════════════════════════════════════

${isSpanish ? 'Fecha de emisión:' : 'Issue date:'} ${new Date().toLocaleString(isSpanish ? 'es-ES' : 'en-US')}
${isSpanish ? 'Total de cuentas:' : 'Total accounts:'} ${accounts.length}
${isSpanish ? 'Bancos detectados:' : 'Banks detected:'} ${new Set(accounts.map(a => a.bankName)).size}

${isSpanish ? 'Estadísticas de detección por capa:' : 'Detection statistics by layer:'}
- ${isSpanish ? 'Capa 1 (Bancos):' : 'Layer 1 (Banks):'} ${detectionStats.layer1}
- ${isSpanish ? 'Capa 2 (Números de cuenta):' : 'Layer 2 (Account numbers):'} ${detectionStats.layer2}
- ${isSpanish ? 'Capa 3 (IBAN/SWIFT):' : 'Layer 3 (IBAN/SWIFT):'} ${detectionStats.layer3}
- ${isSpanish ? 'Capa 4 (Balances):' : 'Layer 4 (Balances):'} ${detectionStats.layer4}
- ${isSpanish ? 'Capa 5 (Contexto):' : 'Layer 5 (Context):'} ${detectionStats.layer5}
- ${isSpanish ? 'Capa 6 (Validación):' : 'Layer 6 (Validation):'} ${detectionStats.layer6}

═══════════════════════════════════════════════════════════════════════════════
                    ${isSpanish ? 'CUENTAS BANCARIAS DETECTADAS' : 'DETECTED BANK ACCOUNTS'}
═══════════════════════════════════════════════════════════════════════════════

${accounts.map((acc, idx) => `
${idx + 1}. ${acc.bankName}
   ${isSpanish ? 'Número de Cuenta:' : 'Account Number:'} ${acc.accountNumber}
   ${isSpanish ? 'Tipo:' : 'Type:'} ${acc.accountType}
   ${isSpanish ? 'Moneda:' : 'Currency:'} ${acc.currency}
   ${isSpanish ? 'Balance:' : 'Balance:'} ${fmt.currency(acc.balance, acc.currency)}
   ${isSpanish ? 'Confianza:' : 'Confidence:'} ${acc.confidence}%
   ${isSpanish ? 'Capa de detección:' : 'Detection layer:'} ${acc.detectionLayer}
   ${acc.iban ? `${isSpanish ? 'IBAN:' : 'IBAN:'} ${acc.iban}` : ''}
   ${acc.swift ? `${isSpanish ? 'SWIFT:' : 'SWIFT:'} ${acc.swift}` : ''}
   ${isSpanish ? 'Extraído:' : 'Extracted:'} ${fmt.dateTime(acc.extractedAt)}
   ───────────────────────────────────────────────────────────────────────────
`).join('\n')}

═══════════════════════════════════════════════════════════════════════════════
                    Digital Commercial Bank Ltd © 2025
═══════════════════════════════════════════════════════════════════════════════
`;

    downloadTXT(reportContent, `Origen_Fondos_DeepScan_${new Date().toISOString().split('T')[0]}.txt`);
    alert(`✅ ${isSpanish ? 'Reporte descargado' : 'Report downloaded'}`);
  };

  const handleExportJSON = () => {
    const data = {
      reverseInfo,
      detectionStats,
      processingMetrics,
      liveLog,
      accountsCount: accounts.length,
      timestamp: new Date().toISOString()
    };
    downloadJSON(data, `Origen_Fondos_Reporte_${new Date().toISOString()}.json`);
    alert(`✅ ${isSpanish ? 'Reporte JSON exportado' : 'JSON report exported'}`);
  };

  const handleExportTXT = () => {
    const info = reverseInfo;
    const content = `
========= ORIGEN DE FONDOS - REPORTE TXT =========
Fecha: ${new Date().toISOString()}
Formato: ${info?.fileFormat || 'N/A'}
Encoding: ${info?.encoding || 'N/A'}
Idioma: ${info?.language || 'N/A'}
Magic: ${info?.magicNumber || 'N/A'}
Endian: ${info?.endianness || 'N/A'}
Tipos: ${(info?.dataTypes || []).join(', ') || 'N/A'}
Patrones binarios: ${info?.detectedPatterns ?? 0}
Cifrados: ${
      info?.cipherSummary
        ? [
            info.cipherSummary.aes ? 'AES' : null,
            info.cipherSummary.stream ? 'Stream' : null,
            info.cipherSummary.vigenere ? 'Vigenère' : null,
            info.cipherSummary.xorKeys ? `XOR(${info.cipherSummary.xorKeys})` : null,
            info.cipherSummary.base64Blobs ? `Base64(${info.cipherSummary.base64Blobs})` : null,
            info.cipherSummary.rotHits ? `ROT(${info.cipherSummary.rotHits})` : null
          ].filter(Boolean).join(' • ')
        : 'N/A'
    }
Chunks procesados: ${processingMetrics.currentChunk}
Bytes: ${processingMetrics.processedBytes}/${processingMetrics.totalBytes}
MB/s: ${processingMetrics.mbps.toFixed(2)}
ETA: ${isFinite(processingMetrics.etaSeconds) ? `${processingMetrics.etaSeconds.toFixed(1)}s` : '∞'}
Secciones detectadas: ${(info?.sections || []).length}
${(info?.sections || []).slice(0, 10).map(s => `- ${s.name} (${s.start}-${s.end})`).join('\n')}

Log (últimas 20):
${liveLog.slice(0, 20).map(l => `[${l.ts}] ${l.level || 'info'} ${l.chunk !== undefined ? '#'+l.chunk+' ' : ''}${l.message}`).join('\n')}
==================================================
`;
    downloadTXT(content, `Origen_Fondos_Reporte_${new Date().toISOString()}.txt`);
    alert(`✅ ${isSpanish ? 'Reporte TXT exportado' : 'TXT report exported'}`);
  };

  const handleReset = () => {
    const message = accounts.length > 0
      ? `⚠️ ${isSpanish ? 'LIMPIAR TODO' : 'CLEAR ALL'}\n\n` +
        `${isSpanish ? '¿Eliminar todas las cuentas detectadas?' : 'Delete all detected accounts?'}\n\n` +
        `${isSpanish ? 'Total:' : 'Total:'} ${accounts.length} ${isSpanish ? 'cuentas' : 'accounts'}\n\n` +
        `${isSpanish ? 'Esta acción no se puede deshacer.' : 'This action cannot be undone.'}`
      : `⚠️ ${isSpanish ? 'RESETEAR A 0' : 'RESET TO 0'}\n\n` +
        `${isSpanish ? '¿Resetear todo el módulo a estado inicial?' : 'Reset entire module to initial state?'}\n\n` +
        `${isSpanish ? 'Esto limpiará:' : 'This will clear:'}\n` +
        `- ${isSpanish ? 'Progreso de escaneo' : 'Scan progress'}\n` +
        `- ${isSpanish ? 'Estadísticas de detección' : 'Detection statistics'}\n` +
        `- ${isSpanish ? 'Estado guardado' : 'Saved state'}`;
    
    const confirmed = confirm(message);
    
    if (confirmed) {
      try {
        // ✅ Detener procesamiento activo
        processingRef.current = false;
        setAnalyzing(false);
        
        if (abortControllerRef.current) {
          abortControllerRef.current.abort();
          abortControllerRef.current = null;
        }
        
        // ✅ Limpiar localStorage
        localStorage.removeItem('origen_fondos_accounts');
        localStorage.removeItem('origen_fondos_offset');
        localStorage.removeItem('origen_fondos_current_file');
        localStorage.removeItem('origen_fondos_processing');
        
        // ✅ Resetear todo a 0
        setAccounts([]);
        setProgress(0);
        setSelectedBank('ALL');
        setLastProcessedOffset(0);
        setCurrentFileName('');
        setDetectionStats({ layer1: 0, layer2: 0, layer3: 0, layer4: 0, layer5: 0, layer6: 0 });
        setReverseInfo(null);
        setProcessingMetrics({
          totalBytes: 0,
          processedBytes: 0,
          mbps: 0,
          etaSeconds: 0,
          currentChunk: 0
        });
        setLiveLog([]);
        setIsPaused(false);
        
        // ✅ Limpiar input de archivo
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
        
        console.log('[Origen Fondos] 🗑️ TODO reseteado a 0');
        alert(`✅ ${isSpanish ? 'Módulo reseteado a 0. Puede cargar un nuevo archivo.' : 'Module reset to 0. You can load a new file.'}`);
      } catch (error) {
        console.error('[Origen Fondos] Error en reset:', error);
        alert(`❌ ${isSpanish ? 'Error al resetear' : 'Error resetting'}: ${error instanceof Error ? error.message : 'Unknown'}`);
      }
    }
  };

  const handlePause = () => {
    if (!processingRef.current) return;
    setIsPaused(true);
    processingRef.current = false;
    setAnalyzing(false);
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    pushLog('⏸️ Pausado por el usuario');
  };

  const handleResume = () => {
    const file = currentFileRef.current;
    if (!file) {
      alert(isSpanish ? 'Seleccione el archivo nuevamente' : 'Please select the file again');
      return;
    }
    if (processingRef.current) return;
    resumeFromPauseRef.current = true;
    setIsPaused(false);
    pushLog('▶️ Reanudando desde offset guardado');
    handleAnalyzeFile({ target: { files: [file] } } as unknown as React.ChangeEvent<HTMLInputElement>);
  };

  const banks = Array.from(new Set(accounts.map(a => a.bankName)));
  const filteredAccounts = selectedBank === 'ALL' 
    ? accounts 
    : accounts.filter(a => a.bankName === selectedBank);

  return (
    <div className="min-h-screen bg-[var(--bg-main)] p-card">
      <div className="max-w-7xl mx-auto space-y-6">
        
        <BankingHeader
          icon={Layers}
          title={isSpanish ? "Origen de Fondos - Deep Scan" : "Source of Funds - Deep Scan"}
          subtitle={isSpanish 
            ? "Extracción profunda de datos bancarios con algoritmos en múltiples capas"
            : "Deep extraction of bank data with multi-layer algorithms"
          }
          gradient="white"
          actions={
            <div className="flex items-center gap-card">
              <input
                ref={fileInputRef}
                type="file"
                accept="*"
                onChange={handleAnalyzeFile}
                aria-label="Select file"
                className="hidden"
              />
              <BankingButton
                variant="primary"
                icon={Upload}
                onClick={() => fileInputRef.current?.click()}
                disabled={analyzing}
              >
                {analyzing ? (isSpanish ? 'Analizando...' : 'Analyzing...') : (isSpanish ? 'Cargar Ledger1' : 'Load Ledger1')}
              </BankingButton>
              {analyzing && (
                <BankingButton
                  variant="secondary"
                  icon={Activity}
                  onClick={handlePause}
                >
                  {isSpanish ? 'Pausar' : 'Pause'}
                </BankingButton>
              )}
              {!analyzing && isPaused && currentFileRef.current && (
                <BankingButton
                  variant="secondary"
                  icon={Activity}
                  onClick={handleResume}
                >
                  {isSpanish ? 'Continuar' : 'Resume'}
                </BankingButton>
              )}
              <BankingButton
                variant="ghost"
                icon={Download}
                onClick={handleExportTXT}
              >
                TXT
              </BankingButton>
              <BankingButton
                variant="ghost"
                icon={Download}
                onClick={handleExportJSON}
              >
                JSON
              </BankingButton>
              {analyzing && (
                <BankingButton
                  variant="secondary"
                  icon={Activity}
                  onClick={handlePause}
                >
                  {isSpanish ? 'Pausar' : 'Pause'}
                </BankingButton>
              )}
              {!analyzing && isPaused && currentFileRef.current && (
                <BankingButton
                  variant="secondary"
                  icon={Activity}
                  onClick={handleResume}
                >
                  {isSpanish ? 'Continuar' : 'Resume'}
                </BankingButton>
              )}
              {accounts.length > 0 && (
                <BankingButton
                  variant="secondary"
                  icon={Download}
                  onClick={handleDownloadReport}
                >
                  {isSpanish ? 'Descargar Reporte' : 'Download Report'}
                </BankingButton>
              )}
              <BankingButton
                variant="ghost"
                icon={RotateCcw}
                onClick={handleReset}
                disabled={analyzing}
                className="border border-red-500/30 text-red-400 hover:bg-red-500/10"
              >
                {isSpanish ? 'Reset a 0' : 'Reset to 0'}
              </BankingButton>
            </div>
          }
        />

        {/* Métricas */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-card">
          <BankingMetric
            label={isSpanish ? "Cuentas Detectadas" : "Detected Accounts"}
            value={accounts.length}
            icon={CreditCard}
            color="white"
          />
          <BankingMetric
            label={isSpanish ? "Bancos" : "Banks"}
            value={banks.length}
            icon={Building2}
            color="emerald"
          />
          <BankingMetric
            label={isSpanish ? "Monedas" : "Currencies"}
            value={new Set(accounts.map(a => a.currency)).size}
            icon={Globe}
            color="amber"
          />
          <BankingMetric
            label={isSpanish ? "Balance Total" : "Total Balance"}
            value={fmt.compact(accounts.reduce((sum, a) => sum + a.balance, 0))}
            icon={TrendingUp}
            color="purple"
          />
        </div>
        
        {/* Informe de Ingeniería Inversa (estructura y cifrados) */}
        {reverseInfo && (
          <BankingCard className="p-card border border-[var(--border-subtle)] bg-[var(--bg-card)]/60">
            <div className="flex items-center justify-between mb-card">
              <div className="flex items-center gap-card">
                <FileSearch className="w-5 h-5 text-[var(--text-primary)]" />
                <div>
                  <p className="text-[var(--text-primary)] font-bold">
                    {isSpanish ? 'Informe de Ingeniería Inversa' : 'Reverse Engineering Report'}
                  </p>
                  <p className="text-[var(--text-secondary)] text-xs">
                    {isSpanish ? 'Formato, encoding, endian y cifrados detectados' : 'Format, encoding, endian and detected ciphers'}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <BankingButton variant="ghost" icon={Download} onClick={handleExportTXT}>
                  TXT
                </BankingButton>
                <BankingButton variant="ghost" icon={Download} onClick={handleExportJSON}>
                  JSON
                </BankingButton>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-card-sm text-sm">
              <div className="space-y-1">
                <p className="text-[var(--text-secondary)]">{isSpanish ? 'Formato' : 'Format'}</p>
                <p className="text-white font-semibold">{reverseInfo.fileFormat || 'N/A'}</p>
                <p className="text-[var(--text-secondary)]">{isSpanish ? 'Encoding' : 'Encoding'}</p>
                <p className="text-white font-semibold">{reverseInfo.encoding || 'N/A'}</p>
                <p className="text-[var(--text-secondary)]">{isSpanish ? 'Idioma' : 'Language'}</p>
                <p className="text-white font-semibold">{reverseInfo.language || 'N/A'}</p>
              </div>
              <div className="space-y-1">
                <p className="text-[var(--text-secondary)]">{isSpanish ? 'Magic Number' : 'Magic Number'}</p>
                <p className="text-white font-semibold">{reverseInfo.magicNumber || 'N/A'}</p>
                <p className="text-[var(--text-secondary)]">{isSpanish ? 'Endian' : 'Endian'}</p>
                <p className="text-white font-semibold">{reverseInfo.endianness || 'N/A'}</p>
                <p className="text-[var(--text-secondary)]">{isSpanish ? 'Tipos de datos' : 'Data types'}</p>
                <p className="text-white font-semibold">
                  {(reverseInfo.dataTypes && reverseInfo.dataTypes.length > 0)
                    ? reverseInfo.dataTypes.join(', ')
                    : 'N/A'}
                </p>
              </div>
              <div className="space-y-1">
                <p className="text-[var(--text-secondary)]">{isSpanish ? 'Patrones binarios' : 'Binary patterns'}</p>
                <p className="text-white font-semibold">{reverseInfo.detectedPatterns ?? 0}</p>
                <p className="text-[var(--text-secondary)]">{isSpanish ? 'Cifrados detectados' : 'Detected ciphers'}</p>
                <p className="text-white font-semibold">
                  {reverseInfo.cipherSummary
                    ? [
                        reverseInfo.cipherSummary.aes ? 'AES' : null,
                        reverseInfo.cipherSummary.stream ? 'Stream' : null,
                        reverseInfo.cipherSummary.vigenere ? 'Vigenère' : null,
                        (reverseInfo.cipherSummary.xorKeys || 0) > 0 ? `XOR (${reverseInfo.cipherSummary.xorKeys})` : null,
                        (reverseInfo.cipherSummary.base64Blobs || 0) > 0 ? `Base64 (${reverseInfo.cipherSummary.base64Blobs})` : null,
                        (reverseInfo.cipherSummary.rotHits || 0) > 0 ? `ROT (${reverseInfo.cipherSummary.rotHits})` : null
                      ].filter(Boolean).join(' • ')
                    : 'N/A'}
                </p>
                <p className="text-[var(--text-secondary)]">{isSpanish ? 'Chunk analizado' : 'Analyzed chunk'}</p>
                <p className="text-white font-semibold">{reverseInfo.lastChunk ?? 0}</p>
              </div>
            </div>
          </BankingCard>
        )}

        {/* Estructura lógica de hallazgos (agrupado visual) */}
        {(analyzing || accounts.length > 0) && (
          <BankingCard className="p-card border border-[var(--border-subtle)] bg-[var(--bg-card)]/60">
            <div className="flex items-center gap-card mb-card">
              <Layers className="w-5 h-5 text-[var(--text-primary)]" />
              <div>
                <p className="text-[var(--text-primary)] font-bold">
                  {isSpanish ? 'Estructura lógica de hallazgos' : 'Logical structure of findings'}
                </p>
                <p className="text-[var(--text-secondary)] text-xs">
                  {isSpanish ? 'Agrupado por banco, moneda, capa y secciones detectadas' : 'Grouped by bank, currency, layer and detected sections'}
                </p>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-card-sm">
              <div className="space-y-2">
                <p className="text-[var(--text-secondary)] text-xs uppercase tracking-wide">{isSpanish ? 'Top Bancos' : 'Top Banks'}</p>
                <div className="space-y-1">
                  {accounts.length === 0 && (
                    <p className="text-[var(--text-secondary)] text-xs">
                      {isSpanish ? 'Esperando detecciones...' : 'Waiting for detections...'}
                    </p>
                  )}
                  {Array.from(new Set(accounts.map(a => a.bankName)))
                    .sort((a, b) => {
                      const ca = accounts.filter(x => x.bankName === a).length;
                      const cb = accounts.filter(x => x.bankName === b).length;
                      return cb - ca;
                    })
                    .slice(0, 5)
                    .map(bank => {
                      const bankAccounts = accounts.filter(a => a.bankName === bank);
                      const total = bankAccounts.reduce((s, a) => s + a.balance, 0);
                      return (
                        <div key={bank} className="flex justify-between text-sm border border-[var(--border-subtle)] rounded-lg px-3 py-2 bg-[var(--bg-elevated)]">
                          <span className="text-white font-semibold">{bank}</span>
                          <span className="text-[var(--text-secondary)] text-xs">{bankAccounts.length} • {fmt.compact(total)}</span>
                        </div>
                      );
                    })}
                </div>
              </div>
              <div className="space-y-2">
                <p className="text-[var(--text-secondary)] text-xs uppercase tracking-wide">{isSpanish ? 'Monedas' : 'Currencies'}</p>
                <div className="grid grid-cols-2 gap-2">
                  {accounts.length === 0 && (
                    <p className="text-[var(--text-secondary)] text-xs">
                      {isSpanish ? 'Sin cuentas aún' : 'No accounts yet'}
                    </p>
                  )}
                  {Array.from(new Set(accounts.map(a => a.currency))).map(cur => {
                    const curAccounts = accounts.filter(a => a.currency === cur);
                    const total = curAccounts.reduce((s, a) => s + a.balance, 0);
                    return (
                      <div key={cur} className="border border-[var(--border-subtle)] rounded-lg px-3 py-2 bg-[var(--bg-elevated)] text-sm">
                        <div className="flex justify-between">
                          <span className="text-white font-semibold">{cur}</span>
                          <span className="text-[var(--text-secondary)] text-xs">{curAccounts.length}</span>
                        </div>
                        <p className="text-[var(--text-secondary)] text-xs mt-1">{fmt.compact(total)}</p>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
            <div className="mt-card grid grid-cols-1 md:grid-cols-3 gap-card-sm text-sm">
              <div className="space-y-1">
                <p className="text-[var(--text-secondary)] text-xs uppercase">{isSpanish ? 'Capas de detección' : 'Detection layers'}</p>
                <div className="grid grid-cols-3 gap-2">
                  {[1,2,3,4,5,6].map(layer => (
                    <div key={layer} className="text-center border border-[var(--border-subtle)] rounded-lg px-2 py-2 bg-[var(--bg-elevated)]">
                      <p className="text-[var(--text-secondary)] text-[11px]">L{layer}</p>
                      <p className="text-white font-bold text-sm">{(detectionStats as any)[`layer${layer}`]}</p>
                    </div>
                  ))}
                </div>
              </div>
              <div className="space-y-1">
                <p className="text-[var(--text-secondary)] text-xs uppercase">{isSpanish ? 'Cifrados detectados' : 'Detected ciphers'}</p>
                <div className="border border-[var(--border-subtle)] rounded-lg px-3 py-2 bg-[var(--bg-elevated)]">
                  <p className="text-white text-sm font-semibold">
                    {reverseInfo?.cipherSummary
                      ? [
                          reverseInfo.cipherSummary.aes ? 'AES' : null,
                          reverseInfo.cipherSummary.stream ? 'Stream' : null,
                          reverseInfo.cipherSummary.vigenere ? 'Vigenère' : null,
                          (reverseInfo.cipherSummary.xorKeys || 0) > 0 ? `XOR (${reverseInfo.cipherSummary.xorKeys})` : null,
                          (reverseInfo.cipherSummary.base64Blobs || 0) > 0 ? `Base64 (${reverseInfo.cipherSummary.base64Blobs})` : null,
                          (reverseInfo.cipherSummary.rotHits || 0) > 0 ? `ROT (${reverseInfo.cipherSummary.rotHits})` : null
                        ].filter(Boolean).join(' • ')
                      : 'N/A'}
                  </p>
                  <p className="text-[var(--text-secondary)] text-xs mt-1">{isSpanish ? 'Fuente: análisis binario/cifrado' : 'Source: binary/cipher analysis'}</p>
                </div>
              </div>
              <div className="space-y-1">
                <p className="text-[var(--text-secondary)] text-xs uppercase">{isSpanish ? 'Secciones detectadas' : 'Detected sections'}</p>
                <div className="space-y-1 max-h-28 overflow-y-auto border border-[var(--border-subtle)] rounded-lg px-3 py-2 bg-[var(--bg-elevated)]">
                  {(reverseInfo?.sections || []).slice(0, 6).map((s, idx) => (
                    <div key={`${s.name}-${idx}`} className="text-xs text-white">
                      <span className="font-semibold">{s.name}</span>
                      <span className="text-[var(--text-secondary)]"> • {s.type || 'section'} • {s.start}-{s.end}</span>
                    </div>
                  ))}
                  {(reverseInfo?.sections || []).length === 0 && (
                    <p className="text-[var(--text-secondary)] text-xs">{isSpanish ? 'Sin secciones detectadas' : 'No sections detected'}</p>
                  )}
                  {reverseInfo?.compressed && (
                    <p className="text-amber-300 text-[11px] font-semibold">
                      {isSpanish ? `Archivo comprimido (${reverseInfo.compressedFormat || 'desconocido'})` : `Compressed file (${reverseInfo.compressedFormat || 'unknown'})`}
                    </p>
                  )}
                  {reverseInfo?.entropy && reverseInfo.entropy.avgEntropy > 7 && (
                    <p className="text-amber-300 text-[11px] font-semibold">
                      {isSpanish ? `Alta entropía: ${reverseInfo.entropy.avgEntropy.toFixed(2)}` : `High entropy: ${reverseInfo.entropy.avgEntropy.toFixed(2)}`}
                    </p>
                  )}
                </div>
              </div>
            </div>
          </BankingCard>
        )}

        {/* Estadísticas de capas */}
        {analyzing && (
          <BankingCard className="p-card">
            <div className="flex items-center gap-card mb-card">
              <Zap className="w-6 h-6 text-purple-400" />
              <h3 className="text-[var(--text-primary)] font-bold text-lg">
                {isSpanish ? 'Detecciones por Capa' : 'Detections by Layer'}
              </h3>
            </div>
            <div className="grid grid-cols-3 md:grid-cols-6 gap-card-sm">
              <div className="text-center">
                <p className="text-[var(--text-secondary)] text-xs mb-1">L1</p>
                <p className="text-white font-bold">{detectionStats.layer1}</p>
              </div>
              <div className="text-center">
                <p className="text-[var(--text-secondary)] text-xs mb-1">L2</p>
                <p className="text-white font-bold">{detectionStats.layer2}</p>
              </div>
              <div className="text-center">
                <p className="text-[var(--text-secondary)] text-xs mb-1">L3</p>
                <p className="text-white font-bold">{detectionStats.layer3}</p>
              </div>
              <div className="text-center">
                <p className="text-[var(--text-secondary)] text-xs mb-1">L4</p>
                <p className="text-white font-bold">{detectionStats.layer4}</p>
              </div>
              <div className="text-center">
                <p className="text-[var(--text-secondary)] text-xs mb-1">L5</p>
                <p className="text-white font-bold">{detectionStats.layer5}</p>
              </div>
              <div className="text-center">
                <p className="text-[var(--text-secondary)] text-xs mb-1">L6</p>
                <p className="text-white font-bold">{detectionStats.layer6}</p>
              </div>
            </div>
          </BankingCard>
        )}

        {/* Progreso */}
        {analyzing && (
          <BankingCard className="p-card">
            <div className="flex items-center justify-between mb-card">
              <div className="flex items-center gap-card">
                <Activity className="w-6 h-6 text-[var(--text-primary)] animate-spin" />
                <p className="text-[var(--text-primary)] font-bold text-lg">
                  {isSpanish ? 'Escaneo profundo en progreso...' : 'Deep scan in progress...'}
                </p>
              </div>
              <p className="text-[var(--text-primary)] font-bold text-2xl">{progress.toFixed(1)}%</p>
            </div>
            <div className="w-full bg-[var(--bg-elevated)] rounded-full h-4 overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-white to-white rounded-full transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
          <div className="mt-3 grid grid-cols-2 md:grid-cols-4 gap-2 text-xs text-[var(--text-secondary)]">
            <div>
              <p className="font-semibold text-white">{(processingMetrics.processedBytes / 1_000_000).toFixed(2)} / {(processingMetrics.totalBytes / 1_000_000).toFixed(2)} MB</p>
              <p>{isSpanish ? 'Procesado' : 'Processed'}</p>
            </div>
            <div>
              <p className="font-semibold text-white">{processingMetrics.mbps.toFixed(2)} MB/s</p>
              <p>Throughput</p>
            </div>
            <div>
              <p className="font-semibold text-white">
                {isFinite(processingMetrics.etaSeconds) ? `${Math.max(0, processingMetrics.etaSeconds).toFixed(1)}s` : '∞'}
              </p>
              <p>ETA</p>
            </div>
            <div>
              <p className="font-semibold text-white">#{processingMetrics.currentChunk}</p>
              <p>{isSpanish ? 'Chunk actual' : 'Current chunk'}</p>
            </div>
          </div>
          </BankingCard>
        )}

        {/* ✅ Progreso detallado de algoritmos en tiempo real */}
        {analyzing && Object.keys(algorithmProgress).length > 0 && (
          <BankingCard className="bg-[var(--bg-card)]/50 border border-[var(--border-subtle)]">
            <div className="flex items-center gap-card-sm mb-card">
              <Layers className="w-5 h-5 text-[var(--text-primary)]" />
              <h3 className="text-[var(--text-primary)] font-bold text-lg">
                {isSpanish ? 'Progreso de Algoritmos Ultra Avanzados' : 'Ultra Advanced Algorithms Progress'}
              </h3>
            </div>
            <div className="space-y-3">
              {Object.entries(algorithmProgress).map(([algorithmName, { progress, accounts, method }]) => (
                <div key={algorithmName} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-[var(--text-primary)] font-semibold text-sm">{algorithmName}</span>
                      <span className="text-[var(--text-secondary)] text-xs">({accounts} {isSpanish ? 'cuentas' : 'accounts'})</span>
                    </div>
                    <span className="text-[var(--text-primary)] font-bold text-sm">{progress.toFixed(1)}%</span>
                  </div>
                  <div className="w-full bg-[var(--bg-elevated)] rounded-full h-2 overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-blue-500 to-purple-500 rounded-full transition-all duration-200"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                  <p className="text-[var(--text-secondary)] text-xs italic">{method}</p>
                </div>
              ))}
            </div>
          </BankingCard>
        )}

        {/* Log en vivo */}
        {analyzing && (
          <BankingCard className="bg-[var(--bg-card)]/60 border border-[var(--border-subtle)]">
            <div className="flex items-center justify-between mb-card-sm">
              <div className="flex items-center gap-2">
                <Activity className="w-5 h-5 text-[var(--text-primary)]" />
                <h3 className="text-[var(--text-primary)] font-bold text-sm">
                  {isSpanish ? 'Log en vivo' : 'Live log'}
                </h3>
              </div>
              <span className="text-[var(--text-secondary)] text-xs">{isSpanish ? 'Máx 50 entradas' : 'Max 50 entries'}</span>
            </div>
            {liveLog.length === 0 ? (
              <p className="text-[var(--text-secondary)] text-sm">{isSpanish ? 'Esperando eventos...' : 'Waiting for events...'}</p>
            ) : (
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {liveLog.slice(0, 15).map((log, idx) => (
                  <div
                    key={`${log.ts}-${idx}`}
                    className={`text-xs rounded-lg px-3 py-2 border ${
                      log.level === 'error'
                        ? 'border-red-500/40 bg-red-500/10 text-red-200'
                        : log.level === 'warn'
                        ? 'border-amber-500/40 bg-amber-500/10 text-amber-100'
                        : 'border-[var(--border-subtle)] bg-[var(--bg-elevated)] text-[var(--text-primary)]'
                    }`}
                  >
                    <div className="flex justify-between">
                      <span className="font-mono text-[10px]">{new Date(log.ts).toLocaleTimeString()}</span>
                      {log.chunk !== undefined && (
                        <span className="text-[var(--text-secondary)]">#{log.chunk}</span>
                      )}
                    </div>
                    <p className="mt-1">{log.message}</p>
                  </div>
                ))}
              </div>
            )}
            <div className="mt-2 text-[var(--text-secondary)] text-xs">
              {lastReadableChunk === null
                ? (isSpanish ? 'Aún no se detecta texto legible (posible cifrado/compresión)' : 'No readable text yet (possible encryption/compression)')
                : `${isSpanish ? 'Último chunk con texto legible' : 'Last readable chunk'}: #${lastReadableChunk}`}
            </div>
          </BankingCard>
        )}

        {/* ✅ RESULTADOS EN TIEMPO REAL - Muestra lo que se va encontrando */}
        {analyzing && (
          <BankingCard className="bg-gradient-to-br from-emerald-500/10 to-blue-500/10 border-2 border-emerald-500/30">
            <div className="flex items-center justify-between mb-card">
              <div className="flex items-center gap-card">
                <Activity className="w-6 h-6 text-emerald-400 animate-pulse" />
                <h3 className="text-[var(--text-primary)] font-bold text-xl">
                  {isSpanish ? '🔍 ESCANEANDO EN TIEMPO REAL' : '🔍 SCANNING IN REAL-TIME'}
                </h3>
              </div>
              <div className="text-right">
                <p className="text-emerald-400 font-bold text-2xl">{realtimeStats.totalFound}</p>
                <p className="text-[var(--text-secondary)] text-xs">
                  {isSpanish ? 'Cuentas encontradas' : 'Accounts found'}
                </p>
              </div>
            </div>
            
            <div className="mb-card p-card-sm bg-[var(--bg-elevated)]/50 rounded-lg">
              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <p className="text-[var(--text-secondary)] text-xs mb-1">{isSpanish ? 'Chunk actual' : 'Current chunk'}</p>
                  <p className="text-white font-bold">{realtimeStats.currentChunk}</p>
                </div>
                <div>
                  <p className="text-[var(--text-secondary)] text-xs mb-1">{isSpanish ? 'En este chunk' : 'In this chunk'}</p>
                  <p className="text-emerald-400 font-bold">{realtimeStats.accountsInChunk}</p>
                </div>
                <div>
                  <p className="text-[var(--text-secondary)] text-xs mb-1">{isSpanish ? 'Última actualización' : 'Last update'}</p>
                  <p className="text-white font-bold text-xs">
                    {new Date(realtimeStats.lastUpdate).toLocaleTimeString()}
                  </p>
                </div>
              </div>
            </div>

            {/* Lista de últimas cuentas encontradas */}
            {realtimeAccounts.length > 0 ? (
              <div className="space-y-2 max-h-96 overflow-y-auto">
                <p className="text-[var(--text-secondary)] text-sm font-semibold mb-2">
                  {isSpanish ? '📋 Últimas cuentas encontradas:' : '📋 Latest accounts found:'}
                </p>
                {realtimeAccounts.map((account, idx) => (
                  <div
                    key={`${account.accountNumber}-${idx}`}
                    className="bg-[var(--bg-card)]/70 border border-emerald-500/20 hover:border-emerald-500/40 rounded-lg p-3 transition-all animate-fadeIn"
                    style={{ animationDelay: `${idx * 50}ms` }}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <Building2 className="w-4 h-4 text-emerald-400" />
                          <span className="text-white font-bold text-sm">{account.bankName}</span>
                          <span className="text-emerald-400 text-xs">•</span>
                          <span className="text-[var(--text-secondary)] text-xs">
                            {fmt.currency(account.balance, account.currency)}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <code className="text-emerald-300 text-xs font-mono bg-black/30 px-2 py-1 rounded">
                            {account.accountNumber}
                          </code>
                          {account.iban && (
                            <code className="text-purple-300 text-xs font-mono bg-black/30 px-2 py-1 rounded">
                              IBAN: {account.iban.substring(0, 12)}...
                            </code>
                          )}
                          {account.swift && (
                            <code className="text-amber-300 text-xs font-mono bg-black/30 px-2 py-1 rounded">
                              {account.swift}
                            </code>
                          )}
                          <span className="text-[var(--text-secondary)] text-xs">
                            {account.currency} • {account.confidence}%
                          </span>
                        </div>
                      </div>
                      <div className="ml-2">
                        <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <Activity className="w-12 h-12 text-[var(--text-secondary)] mx-auto mb-2 animate-spin" />
                <p className="text-[var(--text-secondary)] text-sm">
                  {isSpanish ? 'Escaneando... Esperando resultados...' : 'Scanning... Waiting for results...'}
                </p>
              </div>
            )}
          </BankingCard>
        )}

        {/* Filtro por banco */}
        {accounts.length > 0 && (
          <div className="flex flex-wrap gap-card-sm">
            <button
              onClick={() => setSelectedBank('ALL')}
              className={`px-card-sm py-card-sm rounded-lg font-semibold transition-all ${
                selectedBank === 'ALL'
                  ? 'bg-white text-black'
                  : 'bg-[var(--bg-elevated)] border border-[var(--border-subtle)] text-[var(--text-secondary)] hover:border-[var(--border-subtle)]'
              }`}
            >
              {isSpanish ? 'Todos' : 'All'} ({accounts.length})
            </button>
            {banks.map(bank => (
              <button
                key={bank}
                onClick={() => setSelectedBank(bank)}
                className={`px-card-sm py-card-sm rounded-lg font-semibold transition-all ${
                  selectedBank === bank
                    ? 'bg-white text-black'
                    : 'bg-[var(--bg-elevated)] border border-[var(--border-subtle)] text-[var(--text-secondary)] hover:border-[var(--border-subtle)]'
                }`}
              >
                {bank} ({accounts.filter(a => a.bankName === bank).length})
              </button>
            ))}
          </div>
        )}

        {/* Lista de cuentas */}
        {filteredAccounts.length > 0 ? (
          <BankingSection
            title={isSpanish ? "Cuentas Bancarias Detectadas" : "Detected Bank Accounts"}
            icon={CreditCard}
            color="emerald"
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-card">
              {filteredAccounts.map((account, idx) => (
                <div
                  key={idx}
                  className="bg-[var(--bg-card)]/50 border border-[var(--border-subtle)] hover:border-white/20 rounded-xl p-5 transition-all"
                >
                  <div className="flex items-start justify-between mb-card">
                    <div className="flex-1">
                      <div className="flex items-center gap-card-sm mb-card-sm">
                        <Building2 className="w-5 h-5 text-[var(--text-primary)]" />
                        <h4 className="text-[var(--text-primary)] font-bold text-lg">{account.bankName}</h4>
                      </div>
                      <div className="flex items-center gap-card-sm">
                        <BankingBadge variant="success">{account.accountType}</BankingBadge>
                        <BankingBadge variant="info">{account.currency}</BankingBadge>
                        <BankingBadge variant="warning">L{account.detectionLayer}</BankingBadge>
                        <BankingBadge variant="info">{account.confidence}%</BankingBadge>
                      </div>
                    </div>
                    <button
                      onClick={() => handleDeleteAccount(account.accountNumber)}
                      className="p-card-sm bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 hover:border-red-500 text-red-400 rounded-lg transition-all"
                      title={isSpanish ? "Eliminar cuenta" : "Delete account"}
                    >
                      <RotateCcw className="w-5 h-5" />
                    </button>
                  </div>

                  <div className="space-y-2 text-sm mb-card">
                    <div className="flex justify-between py-card-sm border-b border-[var(--border-subtle)]">
                      <span className="text-[var(--text-secondary)]">{isSpanish ? 'Número de Cuenta:' : 'Account Number:'}</span>
                      <code className="text-[var(--text-primary)] font-mono font-bold">{account.accountNumber}</code>
                    </div>
                    {account.iban && (
                      <div className="flex justify-between py-card-sm border-b border-[var(--border-subtle)]">
                        <span className="text-[var(--text-secondary)]">IBAN:</span>
                        <code className="text-purple-400 font-mono text-xs">{account.iban}</code>
                      </div>
                    )}
                    {account.swift && (
                      <div className="flex justify-between py-card-sm border-b border-[var(--border-subtle)]">
                        <span className="text-[var(--text-secondary)]">SWIFT/BIC:</span>
                        <code className="text-amber-400 font-mono">{account.swift}</code>
                      </div>
                    )}
                    {account.routingNumber && (
                      <div className="flex justify-between py-card-sm border-b border-[var(--border-subtle)]">
                        <span className="text-[var(--text-secondary)]">{isSpanish ? 'Routing Number:' : 'Routing Number:'}</span>
                        <code className="text-cyan-400 font-mono">{account.routingNumber}</code>
                      </div>
                    )}
                    {account.beneficiaryName && (
                      <div className="flex justify-between py-card-sm border-b border-[var(--border-subtle)]">
                        <span className="text-[var(--text-secondary)]">{isSpanish ? 'Beneficiario:' : 'Beneficiary:'}</span>
                        <span className="text-emerald-400 font-medium text-xs text-right max-w-[60%] truncate">{account.beneficiaryName}</span>
                      </div>
                    )}
                    {account.beneficiaryAddress && (
                      <div className="flex justify-between py-card-sm border-b border-[var(--border-subtle)]">
                        <span className="text-[var(--text-secondary)]">{isSpanish ? 'Dirección:' : 'Address:'}</span>
                        <span className="text-slate-400 text-xs text-right max-w-[60%] truncate">{account.beneficiaryAddress}</span>
                      </div>
                    )}
                    {account.branchCode && (
                      <div className="flex justify-between py-card-sm border-b border-[var(--border-subtle)]">
                        <span className="text-[var(--text-secondary)]">{isSpanish ? 'Código Sucursal:' : 'Branch Code:'}</span>
                        <code className="text-blue-400 font-mono">{account.branchCode}</code>
                      </div>
                    )}
                    {account.correspondentBank && (
                      <div className="flex justify-between py-card-sm border-b border-[var(--border-subtle)]">
                        <span className="text-[var(--text-secondary)]">{isSpanish ? 'Banco Corresponsal:' : 'Correspondent Bank:'}</span>
                        <span className="text-orange-400 text-xs text-right max-w-[60%] truncate">{account.correspondentBank}</span>
                      </div>
                    )}
                    {account.reference && (
                      <div className="flex justify-between py-card-sm border-b border-[var(--border-subtle)]">
                        <span className="text-[var(--text-secondary)]">{isSpanish ? 'Referencia:' : 'Reference:'}</span>
                        <code className="text-pink-400 font-mono text-xs">{account.reference}</code>
                      </div>
                    )}
                    <div className="flex justify-between py-card-sm">
                      <span className="text-[var(--text-secondary)]">{isSpanish ? 'Extraído:' : 'Extracted:'}</span>
                      <span className="text-[var(--text-secondary)] text-xs">{fmt.dateTime(account.extractedAt)}</span>
                    </div>
                  </div>

                  {/* Balance destacado */}
                  <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-lg p-card-sm text-center">
                    <p className="text-[var(--text-secondary)] text-xs mb-1">{isSpanish ? 'Balance' : 'Balance'}</p>
                    <p className="text-emerald-400 font-black text-2xl">
                      {fmt.currency(account.balance, account.currency)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </BankingSection>
        ) : !analyzing && (
          <BankingCard className="p-12">
            <div className="text-center">
              <FileSearch className="w-20 h-20 text-slate-700 mx-auto mb-card" />
              <p className="text-[var(--text-secondary)] text-lg font-medium mb-card-sm">
                {isSpanish ? 'No hay cuentas detectadas' : 'No accounts detected'}
              </p>
              <p className="text-[var(--text-muted)] text-sm">
                {isSpanish ? 'Carga un archivo Ledger1 para extraer datos bancarios con análisis profundo' : 'Load a Ledger1 file to extract bank data with deep analysis'}
              </p>
            </div>
          </BankingCard>
        )}

        {/* Footer */}
        <BankingCard className="p-card">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-card">
              <CheckCircle className="w-5 h-5 text-emerald-400" />
              <div>
                <p className="text-[var(--text-primary)] font-semibold">
                  {isSpanish ? 'Extracción Profunda Multi-Capa' : 'Multi-Layer Deep Extraction'}
                </p>
                <p className="text-[var(--text-secondary)] text-sm">
                  {isSpanish ? '6 capas de detección: Bancos → Cuentas → IBAN/SWIFT → Balances → Contexto → Validación' : '6 detection layers: Banks → Accounts → IBAN/SWIFT → Balances → Context → Validation'}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-card">
              <BankingBadge variant="success">Deep Scan</BankingBadge>
              <BankingBadge variant="info">Multi-Layer</BankingBadge>
            </div>
          </div>
        </BankingCard>
      </div>
    </div>
  );
}
