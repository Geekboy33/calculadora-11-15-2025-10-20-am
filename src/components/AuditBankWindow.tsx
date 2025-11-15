/**
 * Audit Bank Panel - Digital Commercial Bank Ltd Financial Asset Detection
 * Extrae TODA la información interna del archivo Digital Commercial Bank Ltd
 * Persiste datos al cambiar de pestaña
 */

import { useState, useRef, useEffect } from 'react';
import { 
  FileSearch, 
  Play, 
  Download, 
  DollarSign,
  Building2,
  CreditCard,
  TrendingUp,
  File,
  Trash2,
  CheckCircle
} from 'lucide-react';
import { useLanguage } from '../lib/i18n';
import { balanceStore, type CurrencyBalance } from '../lib/balances-store';
import { auditStore, type AuditResults, type ExtractedBankData } from '../lib/audit-store';
import { processingStore } from '../lib/processing-store';
import { AuditBankReport } from './AuditBankReport';

// Tasas de cambio a USD (actualizadas)
const EXCHANGE_RATES: Record<string, number> = {
  'USD': 1.0, 'EUR': 1.05, 'GBP': 1.21, 'CHF': 1.09, 'CAD': 0.74, 'AUD': 0.65,
  'JPY': 0.0067, 'CNY': 0.14, 'INR': 0.012, 'MXN': 0.05, 'BRL': 0.19, 
  'RUB': 0.011, 'KRW': 0.00075, 'SGD': 0.74, 'HKD': 0.13, 'AED': 0.27,
};

const KNOWN_BANKS = [
  'BANCO DO BRASIL', 'EMIRATES NBD', 'HSBC', 'CITIBANK', 'JPMORGAN', 'WELLS FARGO',
  'BANK OF AMERICA', 'BARCLAYS', 'UBS', 'CREDIT SUISSE', 'DEUTSCHE BANK',
  'BNP PARIBAS', 'SANTANDER', 'BBVA', 'ING', 'GOLDMAN SACHS', 'MORGAN STANLEY',
  'FIRST NATIONAL BANK', 'FAB', 'STANDARD CHARTERED', 'CITI', 'CHASE'
];

export function AuditBankWindow() {
  const { t } = useLanguage();
  const [isScanning, setIsScanning] = useState(false);
  const [results, setResults] = useState<AuditResults | null>(null);
  const [extractedData, setExtractedData] = useState<ExtractedBankData | null>(null);
  const [systemBalances, setSystemBalances] = useState<CurrencyBalance[]>([]);
  const [progress, setProgress] = useState(0);
  const [autoProcessed, setAutoProcessed] = useState(false);
  const [showScrollTop, setShowScrollTop] = useState(false);
  const [showFullData, setShowFullData] = useState(false); // Para mostrar datos completos sin enmascarar
  const [showReport, setShowReport] = useState(false); // Para mostrar informe Black Screen
  const [loadingProgress, setLoadingProgress] = useState(100); // Progreso del Analizador
  const fileInputRef = useRef<HTMLInputElement>(null);
  const processBalancesRef = useRef<((balances: CurrencyBalance[]) => void) | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Cargar datos persistidos al montar Y suscribirse a cambios del Analizador
  useEffect(() => {
    // Cargar datos persistidos de auditoría
    const auditData = auditStore.loadAuditData();
    if (auditData) {
      console.log('[AuditBank] 🔄 Restaurando datos persistidos');
      if (auditData.results) setResults(auditData.results);
      if (auditData.extractedData) setExtractedData(auditData.extractedData);
    }

    // Cargar balances iniciales
    const balances = balanceStore.getBalances();
    setSystemBalances(balances);
    
    // Si hay balances al inicio y no hay resultados, procesarlos
    if (balances.length > 0 && !auditData?.results) {
      console.log('[AuditBank] 🚀 Procesando balances existentes al inicio...');
      setTimeout(() => {
        if (processBalancesRef.current) {
          processBalancesRef.current(balances);
        }
      }, 500);
    }

    // 🔥 INTEGRACIÓN CON ANALIZADOR DE ARCHIVOS GRANDES 🔥
    // Suscribirse a cambios en tiempo real desde el Analizador
    console.log('[AuditBank] 🔗 Suscribiéndose a actualizaciones del Analizador de Archivos Grandes...');
    
    let lastBalanceCount = balances.length;
    
    const unsubscribe = balanceStore.subscribe((newBalances) => {
      console.log('[AuditBank] 📥 Recibidos datos del Analizador:', newBalances.length, 'divisas');
      setSystemBalances(newBalances);
      
      // Solo procesar si hay nuevos balances (cambió la cantidad)
      if (newBalances.length > 0 && newBalances.length !== lastBalanceCount) {
        console.log('[AuditBank] ⚡ Detectado cambio en balances, procesando automáticamente...');
        lastBalanceCount = newBalances.length;
        setTimeout(() => {
          if (processBalancesRef.current) {
            processBalancesRef.current(newBalances);
          }
        }, 300);
      }
    });

    // Cleanup: desuscribirse al desmontar
    return () => {
      unsubscribe();
    };
     
  }, []);

  // Suscribirse al progreso del Analizador de Archivos Grandes EN TIEMPO REAL
  useEffect(() => {
    const unsubscribe = processingStore.subscribe((state) => {
      if (state) {
        const newProgress = state.progress || 100;
        setLoadingProgress(newProgress);
        console.log('[AuditBank] 📊 Progreso del Analizador actualizado:', newProgress.toFixed(1) + '%');
        
        // Si hay resultados, RECALCULAR con el nuevo progreso
        if (results && results.agregados && newProgress < 100) {
          console.log('[AuditBank] 🔄 Recalculando balances con progreso:', newProgress.toFixed(1) + '%');
          // Los balances se recalcularán automáticamente en el informe con el nuevo progress
        }
      }
    });

    // Cargar estado inicial del procesamiento
    processingStore.loadState().then((state) => {
      if (state) {
        const initialProgress = state.status === 'completed' ? 100 : state.progress;
        setLoadingProgress(initialProgress);
        console.log('[AuditBank] 📊 Progreso inicial cargado:', initialProgress.toFixed(1) + '%');
      } else {
        setLoadingProgress(100); // Si no hay estado, asumir completo
      }
    });

    return unsubscribe;
  }, [results]);

  // === FUNCIONES DE INGENIERÍA INVERSA AVANZADA ===

  // Detectar firmas de archivo conocidas
  const detectFileSignatures = (data: Uint8Array): any => {
    const signatures: any = {
      DTC1B: false,
      encrypted: false,
      compressed: false,
      headerBytes: [],
      detectedTypes: []
    };

    // Primeros 16 bytes como firma
    signatures.headerBytes = Array.from(data.slice(0, 16));

    // Firmas conocidas
    const knownSignatures: Record<string, number[]> = {
      'Digital Commercial Bank Ltd': [0x44, 0x54, 0x43, 0x42],
      'BANK': [0x42, 0x41, 0x4E, 0x4B],
      'PDF': [0x25, 0x50, 0x44, 0x46],
      'ZIP': [0x50, 0x4B, 0x03, 0x04],
      'GZIP': [0x1F, 0x8B],
    };

    for (const [type, sig] of Object.entries(knownSignatures)) {
      let match = true;
      for (let i = 0; i < sig.length; i++) {
        if (data[i] !== sig[i]) {
          match = false;
          break;
        }
      }
      if (match) {
        signatures.detectedTypes.push(type);
      }
    }

    return signatures;
  };

  // Decompiler de campos estructurados (busca valores numéricos en formato binario)
  const decompileStructuredFields = (data: Uint8Array): any[] => {
    const fields: any[] = [];
    const view = new DataView(data.buffer, data.byteOffset, data.byteLength);

    // Buscar campos numéricos en diferentes formatos
    for (let i = 0; i < Math.min(data.length - 8, 10000); i += 4) {
      try {
        // Intentar leer como uint32
        const uint32Val = view.getUint32(i, true);
        if (uint32Val > 10000 && uint32Val < 9999999999) {
          fields.push({
            offset: i,
            type: 'uint32',
            value: uint32Val,
            interpretation: 'possible_amount'
          });
        }

        // Intentar leer como float
        if (i + 4 <= data.length) {
          const floatVal = view.getFloat32(i, true);
          if (floatVal > 1000 && floatVal < 9999999999 && !isNaN(floatVal) && isFinite(floatVal)) {
            fields.push({
              offset: i,
              type: 'float32',
              value: parseFloat(floatVal.toFixed(2)),
              interpretation: 'possible_decimal_amount'
            });
          }
        }

        // Intentar leer como double (cada 8 bytes)
        if (i % 8 === 0 && i + 8 <= data.length) {
          const doubleVal = view.getFloat64(i, true);
          if (doubleVal > 1000 && doubleVal < 9999999999 && !isNaN(doubleVal) && isFinite(doubleVal)) {
            fields.push({
              offset: i,
              type: 'float64',
              value: parseFloat(doubleVal.toFixed(2)),
              interpretation: 'possible_precise_amount'
            });
          }
        }
      } catch (e) {
        // Continuar si hay error
      }
    }

    // Limitar a los primeros 100 campos más relevantes
    return fields.slice(0, 100);
  };

  // Detectar patrones hexadecimales (hashes, claves)
  const detectHexPatterns = (text: string): any => {
    const patterns = {
      sha256: [] as string[],
      md5: [] as string[],
      apiKeys: [] as string[],
    };

    // SHA-256 (64 caracteres hex)
    const sha256Regex = /\b[a-fA-F0-9]{64}\b/g;
    let match;
    while ((match = sha256Regex.exec(text)) !== null) {
      if (patterns.sha256.length < 10) patterns.sha256.push(match[0]);
    }

    // MD5 (32 caracteres hex)
    const md5Regex = /\b[a-fA-F0-9]{32}\b/g;
    while ((match = md5Regex.exec(text)) !== null) {
      if (patterns.md5.length < 10) patterns.md5.push(match[0]);
    }

    // Posibles API keys (40+ caracteres alfanuméricos)
    const apiKeyRegex = /\b[A-Za-z0-9_\-]{40,}\b/g;
    while ((match = apiKeyRegex.exec(text)) !== null) {
      if (patterns.apiKeys.length < 5) patterns.apiKeys.push(match[0].substring(0, 20) + '...');
    }

    return patterns;
  };

  // Detectar estructuras de datos (JSON-like, XML-like)
  const detectDataStructures = (text: string): any => {
    const structures = {
      jsonLike: [] as string[],
      xmlTags: [] as string[],
      keyValuePairs: [] as string[],
    };

    // JSON-like structures
    const jsonRegex = /\{[^{}]{10,100}\}/g;
    let match;
    while ((match = jsonRegex.exec(text)) !== null && structures.jsonLike.length < 5) {
      structures.jsonLike.push(match[0].substring(0, 50) + '...');
    }

    // XML-like tags
    const xmlRegex = /<(\w+)>[^<]{5,50}<\/\1>/g;
    while ((match = xmlRegex.exec(text)) !== null && structures.xmlTags.length < 5) {
      structures.xmlTags.push(match[0]);
    }

    // Key-Value pairs
    const kvRegex = /(\w+)\s*[:=]\s*([A-Za-z0-9]{5,30})/g;
    while ((match = kvRegex.exec(text)) !== null && structures.keyValuePairs.length < 10) {
      structures.keyValuePairs.push(`${match[1]}=${match[2]}`);
    }

    return structures;
  };

  // Función de INGENIERÍA INVERSA AVANZADA
  const extractAllData = (data: Uint8Array, fileName: string): ExtractedBankData => {
    console.log('[AuditBank] 🔍 INGENIERÍA INVERSA PROFUNDA INICIADA');
    console.log('[AuditBank] 🧬 Decompilando estructuras binarias...');
    
    const textDecoder = new TextDecoder('utf-8', { fatal: false });
    const text = textDecoder.decode(data);
    const textUpper = text.toUpperCase();
    
    // Arrays para almacenar datos
    const accountNumbers: string[] = [];
    const ibanCodes: string[] = [];
    const swiftCodes: string[] = [];
    const bankNames: string[] = [];
    const routingNumbers: string[] = [];
    const amounts: { value: number; currency: string; offset: number }[] = [];
    const transactions: any[] = [];

    // === ANÁLISIS DE FIRMA BINARIA ===
    console.log('[AuditBank] 🔬 Analizando firma del archivo...');
    const fileSignatures = detectFileSignatures(data);
    console.log('[AuditBank] ✓ Firmas detectadas:', fileSignatures.detectedTypes.join(', ') || 'Formato personalizado');
    
    // === DECOMPILACIÓN DE CAMPOS ESTRUCTURADOS ===
    console.log('[AuditBank] 📊 Decompilando campos estructurados...');
    const structuredFields = decompileStructuredFields(data);
    console.log('[AuditBank] ✓ Campos binarios encontrados:', structuredFields.length);
    
    // === DETECCIÓN DE PATRONES HEXADECIMALES ===
    console.log('[AuditBank] 🔐 Detectando hashes y claves...');
    const hexPatterns = detectHexPatterns(text);
    console.log('[AuditBank] ✓ SHA-256:', hexPatterns.sha256.length, '| MD5:', hexPatterns.md5.length);
    
    // === DETECCIÓN DE ESTRUCTURAS DE DATOS ===
    console.log('[AuditBank] 🧩 Detectando estructuras de datos...');
    const dataStructures = detectDataStructures(text);
    console.log('[AuditBank] ✓ JSON-like:', dataStructures.jsonLike.length, '| XML:', dataStructures.xmlTags.length);
    
    // === DETECCIÓN DE PATRONES AVANZADA ===
    console.log('[AuditBank] 🎯 Detectando patrones financieros...');

    // === EXTRACCIÓN ULTRA ROBUSTA - MÚLTIPLES MÉTODOS AGRESIVOS ===
    
    console.log('[AuditBank] 🔎 Iniciando detección ROBUSTA de cuentas bancarias...');

    // 1. BUSCAR TODAS LAS SECUENCIAS DE 7+ DÍGITOS (MUY AGRESIVO)
    const allNumbersPattern = /\b\d{7,30}\b/g;
    const allNumbers: string[] = [];
    let match: RegExpExecArray | null;
    while ((match = allNumbersPattern.exec(text)) !== null) {
      allNumbers.push(match[0]);
    }
    console.log(`[AuditBank] ✓ Encontradas ${allNumbers.length} secuencias numéricas de 7+ dígitos`);
    
    // Filtrar y clasificar como cuentas (8-22 dígitos)
    allNumbers.forEach(num => {
      if (num.length >= 8 && num.length <= 22 && !accountNumbers.includes(num)) {
        // Excluir números que parecen fechas o años
        if (!/^(19|20)\d{2}$/.test(num) && !/^0{5,}/.test(num)) {
          accountNumbers.push(num);
        }
      }
    });
    
    // 2. Buscar EXPLÍCITAMENTE después de palabras clave
    const accountKeywords = [
      'account', 'cuenta', 'acc', 'acct', 'number', 'no', 'num', '#',
      'account number', 'account no', 'numero de cuenta', 'n°', 'nº',
      'routing', 'transit', 'sort code'
    ];
    
    accountKeywords.forEach(keyword => {
      // Patrón flexible: keyword seguido de : o espacio y luego dígitos
      const pattern = new RegExp(`${keyword}[:\\s-]*([0-9\\s-]{7,30})`, 'gi');
      while ((match = pattern.exec(text)) !== null) {
        const account = match[1].replace(/[\s-]/g, '');
        if (account.length >= 7 && account.length <= 22 && !accountNumbers.includes(account)) {
          accountNumbers.push(account);
        }
      }
    });
    
    console.log(`[AuditBank] ✓ Total cuentas detectadas: ${accountNumbers.length}`);

    console.log('[AuditBank] 🔎 Iniciando detección ROBUSTA de IBANs...');
    
    // 2. DETECTAR IBANS - ULTRA AGRESIVO
    
    // Patrón 1: IBAN estándar (sin espacios)
    const ibanPattern1 = /\b[A-Z]{2}\d{2}[A-Z0-9]{11,32}\b/g;
    while ((match = ibanPattern1.exec(text)) !== null) {
      const iban = match[0];
      if (iban.length >= 15 && iban.length <= 34 && !ibanCodes.includes(iban)) {
        ibanCodes.push(iban);
      }
    }
    
    // Patrón 2: IBAN con espacios (cualquier separación)
    const ibanPattern2 = /\b([A-Z]{2}\d{2}[\sA-Z0-9]{11,50})\b/g;
    while ((match = ibanPattern2.exec(text)) !== null) {
      const ibanWithSpaces = match[1];
      const iban = ibanWithSpaces.replace(/\s/g, '');
      // Validar que sea un IBAN válido: 2 letras + 2 dígitos + alfanumérico
      if (/^[A-Z]{2}\d{2}[A-Z0-9]{11,32}$/.test(iban) && !ibanCodes.includes(iban)) {
        ibanCodes.push(iban);
      }
    }
    
    // Patrón 3: IBAN después de palabra clave
    const ibanKeywords = ['iban', 'IBAN', 'iban:', 'IBAN:'];
    ibanKeywords.forEach(keyword => {
      const pattern = new RegExp(`${keyword}[:\\s]*([A-Z]{2}\\d{2}[A-Z0-9\\s]{11,50})`, 'g');
      while ((match = pattern.exec(text)) !== null) {
        const iban = match[1].replace(/\s/g, '').trim();
        if (iban.length >= 15 && iban.length <= 34 && !ibanCodes.includes(iban)) {
          ibanCodes.push(iban);
        }
      }
    });
    
    // Patrón 4: Buscar líneas que empiecen con código de país + números
    const lines = text.split('\n');
    lines.forEach(line => {
      const linePattern = /^[A-Z]{2}\d{2}[A-Z0-9\s]{11,50}/;
      const lineMatch = line.trim().match(linePattern);
      if (lineMatch) {
        const iban = lineMatch[0].replace(/\s/g, '');
        if (iban.length >= 15 && iban.length <= 34 && !ibanCodes.includes(iban)) {
          ibanCodes.push(iban);
        }
      }
    });
    
    console.log(`[AuditBank] ✓ Total IBANs detectados: ${ibanCodes.length}`);

    console.log('[AuditBank] 🔎 Iniciando detección ROBUSTA de SWIFT/BIC...');
    
    // 3. DETECTAR SWIFT/BIC - ULTRA ROBUSTO
    
    // Patrón 1: SWIFT estándar (8-11 caracteres)
    const swiftPattern1 = /\b[A-Z]{4}[A-Z]{2}[A-Z0-9]{2,5}\b/g;
    while ((match = swiftPattern1.exec(text)) !== null) {
      const swift = match[0];
      if (swift.length >= 8 && swift.length <= 11 && !swiftCodes.includes(swift)) {
        // Filtrar palabras comunes en inglés
        const commonWords = ['TRANSFER', 'ACCOUNT', 'PAYMENT', 'BALANCE', 'AMOUNT', 'NUMBER', 'STATUS'];
        if (!commonWords.includes(swift)) {
          swiftCodes.push(swift);
        }
      }
    }
    
    // Patrón 2: SWIFT después de palabras clave
    const swiftKeywords = ['swift', 'SWIFT', 'bic', 'BIC', 'swift:', 'SWIFT:', 'bic:', 'BIC:', 'bank code'];
    swiftKeywords.forEach(keyword => {
      const pattern = new RegExp(`${keyword}[:\\s]*([A-Z]{4}[A-Z]{2}[A-Z0-9]{2,5})`, 'gi');
      while ((match = pattern.exec(text)) !== null) {
        const swift = match[1].toUpperCase();
        if (swift.length >= 8 && swift.length <= 11 && !swiftCodes.includes(swift)) {
          swiftCodes.push(swift);
        }
      }
    });
    
    // Patrón 3: Buscar en líneas específicas
    lines.forEach(line => {
      if (line.toUpperCase().includes('SWIFT') || line.toUpperCase().includes('BIC')) {
        const swiftMatch = line.match(/[A-Z]{4}[A-Z]{2}[A-Z0-9]{2,5}/);
        if (swiftMatch && swiftMatch[0].length >= 8 && swiftMatch[0].length <= 11) {
          if (!swiftCodes.includes(swiftMatch[0])) {
            swiftCodes.push(swiftMatch[0]);
          }
        }
      }
    });
    
    console.log(`[AuditBank] ✓ Total SWIFT/BIC detectados: ${swiftCodes.length}`);

    // 4. Detectar bancos (mejorado - múltiples métodos)
    
    // Método 1: Bancos conocidos de la lista
    KNOWN_BANKS.forEach(bank => {
      if (textUpper.includes(bank.toUpperCase())) {
        if (!bankNames.includes(bank)) {
        bankNames.push(bank);
        }
      }
    });
    
    // Método 2: Patrón "Bank:" o "Banco:" seguido del nombre
    const bankPattern1 = /(?:Bank|Banco|Institution):\s*([A-Z][A-Za-z\s\.&]{3,50})/gi;
    while ((match = bankPattern1.exec(text)) !== null) {
      const bankName = match[1].trim();
      if (bankName.length > 3 && !bankNames.includes(bankName)) {
        bankNames.push(bankName);
      }
    }
    
    // Método 3: Patrón "[Nombre] BANK" o "BANK [Nombre]"
    const bankPattern2 = /\b([A-Z][A-Za-z\s&]{2,30})\s+(?:BANK|BANCO|NBD|FAB)\b/gi;
    while ((match = bankPattern2.exec(text)) !== null) {
      const bankName = (match[1].trim() + ' ' + match[0].split(/\s+/).pop()).trim();
      if (bankName.length > 3 && !bankNames.some(b => b.toUpperCase().includes(bankName.toUpperCase()))) {
        bankNames.push(bankName);
      }
    }
    
    // Método 4: Patrón "BANK OF [País/Ciudad]"
    const bankPattern3 = /\b(?:BANK|BANCO)\s+(?:OF|DO|DE|DA)\s+([A-Z][A-Za-z\s]{2,30})/gi;
    while ((match = bankPattern3.exec(text)) !== null) {
      const fullBankName = match[0].trim();
      if (!bankNames.some(b => b.toUpperCase() === fullBankName.toUpperCase())) {
        bankNames.push(fullBankName);
      }
    }
    
    // Método 5: Nombres antes de SWIFT codes
    const swiftWithBankPattern = /\b([A-Z][A-Za-z\s&]{3,50})\s*\n?\s*SWIFT:\s*([A-Z]{4}[A-Z]{2})/gi;
    while ((match = swiftWithBankPattern.exec(text)) !== null) {
      const bankName = match[1].trim();
      if (bankName.length > 3 && bankName.length < 50 && !bankNames.includes(bankName)) {
        bankNames.push(bankName);
      }
    }

    // 5. Detectar routing numbers (9 dígitos)
    const routingMatches = text.matchAll(/\b\d{9}\b/g);
    for (const match of routingMatches) {
      if (!routingNumbers.includes(match[0]) && !accountNumbers.includes(match[0])) {
        routingNumbers.push(match[0]);
      }
    }

    // 6. Detectar montos con divisas (MEJORADO - 15 divisas)
    const currencies = ['USD', 'EUR', 'GBP', 'CHF', 'CAD', 'AUD', 'JPY', 'CNY', 'INR', 'MXN', 'BRL', 'RUB', 'KRW', 'SGD', 'HKD', 'AED'];
    
    // Método 1: Con símbolo de divisa ($ € £ ¥) - CAPTURA TODO
    const currencySymbols: Record<string, string> = {
      '$': 'USD', '€': 'EUR', '£': 'GBP', '¥': 'JPY', 'R$': 'BRL'
    };
    
    for (const [symbol, curr] of Object.entries(currencySymbols)) {
      const symbolPattern = new RegExp(`\\${symbol}\\s*([0-9,]+\\.?\\d{0,2})`, 'g');
      while ((match = symbolPattern.exec(text)) !== null) {
        const valueStr = match[1].replace(/,/g, '');
        const value = parseFloat(valueStr);
        if (!isNaN(value) && value > 0) {  // ← CAPTURA TODO > 0, no solo > 100
          amounts.push({ value, currency: curr, offset: match.index });
        }
      }
    }
    
    // Método 2: Con código de divisa (USD 1000.00) - CAPTURA TODO
    currencies.forEach(currency => {
      const pattern1 = new RegExp(`${currency}\\s*([0-9,]+\\.?\\d{0,2})`, 'gi');
      while ((match = pattern1.exec(text)) !== null) {
        const valueStr = match[1].replace(/,/g, '');
        const value = parseFloat(valueStr);
        if (!isNaN(value) && value > 0) {  // ← CAPTURA TODO > 0
          const existing = amounts.find(a => Math.abs(a.value - value) < 0.01 && a.currency === currency.toUpperCase());
          if (!existing) {
            amounts.push({ value, currency: currency.toUpperCase(), offset: match.index });
          }
        }
      }
      
      // Método 3: Monto seguido de divisa (1000.00 USD) - CAPTURA TODO
      const pattern2 = new RegExp(`([0-9,]+\\.?\\d{0,2})\\s*${currency}`, 'gi');
      while ((match = pattern2.exec(text)) !== null) {
        const valueStr = match[1].replace(/,/g, '');
        const value = parseFloat(valueStr);
        if (!isNaN(value) && value > 0) {  // ← CAPTURA TODO > 0
          const existing = amounts.find(a => Math.abs(a.value - value) < 0.01 && a.currency === currency.toUpperCase());
          if (!existing) {
            amounts.push({ value, currency: currency.toUpperCase(), offset: match.index });
          }
        }
      }
    });
    
    // Método 4: Detectar montos en campos binarios (de los campos decompilados) - CAPTURA TODO
    structuredFields.forEach(field => {
      if (field.value && field.value > 0 && field.value < 999999999) {  // ← CAPTURA TODO > 0
        // Intentar asignar una divisa basándose en contexto
        const contextStart = Math.max(0, field.offset - 50);
        const contextEnd = Math.min(text.length, field.offset + 50);
        const context = text.substring(contextStart, contextEnd).toUpperCase();
        
        let detectedCurrency = 'USD'; // Default
        currencies.forEach(curr => {
          if (context.includes(curr)) {
            detectedCurrency = curr;
          }
        });
        
        // Evitar duplicados
        const existing = amounts.find(a => Math.abs(a.value - field.value) < 1 && a.currency === detectedCurrency);
        if (!existing) {
          amounts.push({ 
            value: field.value, 
            currency: detectedCurrency, 
            offset: field.offset 
          });
        }
      }
    });

    // 7. Calcular entropía
    const calculateEntropy = (d: Uint8Array): number => {
      const freq: Record<number, number> = {};
      for (const byte of d) {
        freq[byte] = (freq[byte] || 0) + 1;
      }
      let entropy = 0;
      for (const count of Object.values(freq)) {
        const p = count / d.length;
        entropy -= p * Math.log2(p);
      }
      return entropy;
    };

    const entropy = calculateEntropy(data);
    const hexSample = Array.from(data.slice(0, 128)).map(b => b.toString(16).padStart(2, '0')).join(' ');
    const binarySignature = Array.from(data.slice(0, 16)).map(b => b.toString(16).padStart(2, '0').toUpperCase()).join(' ');
    const textSample = text.slice(0, 500);

    const extracted: ExtractedBankData = {
      accountNumbers,
      ibanCodes,
      swiftCodes,
      bankNames,
      routingNumbers,
      amounts,
      transactions,
      metadata: {
        fileSize: data.length,
        fileName,
        blocksDetected: amounts.length,
        entropyLevel: entropy,
        hasEncryption: entropy > 7.5,
        totalAccounts: accountNumbers.length,
        totalBanks: bankNames.length,
        totalCurrencies: new Set(amounts.map(a => a.currency)).size,
      },
      rawData: {
        hexSample,
        textSample,
        binarySignature,
      },
      // === DATOS DE INGENIERÍA INVERSA ===
      reverseEngineering: {
        fileSignatures: fileSignatures.detectedTypes,
        headerBytes: fileSignatures.headerBytes,
        structuredFieldsCount: structuredFields.length,
        structuredFieldsSample: structuredFields.slice(0, 20),
        hexPatterns: {
          sha256Count: hexPatterns.sha256.length,
          md5Count: hexPatterns.md5.length,
          apiKeysCount: hexPatterns.apiKeys.length,
          sha256Samples: hexPatterns.sha256.slice(0, 3),
          md5Samples: hexPatterns.md5.slice(0, 3),
        },
        dataStructures: {
          jsonLikeCount: dataStructures.jsonLike.length,
          xmlTagsCount: dataStructures.xmlTags.length,
          keyValuePairsCount: dataStructures.keyValuePairs.length,
          jsonSamples: dataStructures.jsonLike,
          xmlSamples: dataStructures.xmlTags,
          kvSamples: dataStructures.keyValuePairs,
        },
        confidence: calculateReverseEngineeringConfidence(
          fileSignatures,
          structuredFields,
          hexPatterns,
          dataStructures,
          accountNumbers,
          ibanCodes
        ),
      }
    } as any;
    
    // Calcular nivel de confianza del análisis de ingeniería inversa
    function calculateReverseEngineeringConfidence(
      sigs: any, fields: any[], hex: any, structs: any, accounts: string[], ibans: string[]
    ): number {
      let score = 0;
      
      // +20 puntos por firmas detectadas
      if (sigs.detectedTypes.length > 0) score += 20;
      
      // +30 puntos por campos estructurados
      if (fields.length > 10) score += 30;
      else if (fields.length > 0) score += 15;
      
      // +20 puntos por hashes detectados
      if (hex.sha256.length > 0 || hex.md5.length > 0) score += 20;
      
      // +10 puntos por estructuras de datos
      if (structs.jsonLike.length > 0 || structs.xmlTags.length > 0) score += 10;
      
      // +20 puntos por datos bancarios
      if (accounts.length > 0 || ibans.length > 0) score += 20;
      
      return Math.min(score, 100);
    }

    console.log('[AuditBank] ✅ EXTRACCIÓN COMPLETADA:', {
      cuentas: accountNumbers.length,
      ibans: ibanCodes.length,
      swifts: swiftCodes.length,
      bancos: bankNames.length,
      routing: routingNumbers.length,
      montos: amounts.length,
      divisas: extracted.metadata.totalCurrencies,
      entropía: entropy.toFixed(2),
    });
      
      console.log('[AuditBank] 📋 DETALLE DE CUENTAS (REALES):');
      accountNumbers.forEach((acc, i) => {
        console.log(`  ${i + 1}. ${acc} (${acc.length} dígitos)`);
      });
      
      console.log('[AuditBank] 🌍 DETALLE DE IBANs (REALES):');
      ibanCodes.forEach((iban, i) => {
        console.log(`  ${i + 1}. ${iban} (País: ${iban.slice(0, 2)})`);
      });
      
      console.log('[AuditBank] 📡 DETALLE DE SWIFT (REALES):');
      swiftCodes.forEach((swift, i) => {
        console.log(`  ${i + 1}. ${swift} (País: ${swift.slice(4, 6)})`);
      });
      
      console.log('[AuditBank] 🏛️ DETALLE DE BANCOS (REALES):');
      bankNames.forEach((bank, i) => {
        console.log(`  ${i + 1}. ${bank}`);
      });
      
      console.log('[AuditBank] 💰 TODOS LOS MONTOS DETECTADOS (REALES):');
      console.log(`  Total de montos extraídos: ${amounts.length}`);
      
      // Agrupar por divisa para mostrar
      const montoPorDivisa = amounts.reduce((acc: any, amt) => {
        if (!acc[amt.currency]) acc[amt.currency] = [];
        acc[amt.currency].push(amt.value);
        return acc;
      }, {});
      
      console.log('[AuditBank] 📊 TOTALES REALES POR DIVISA:');
      Object.entries(montoPorDivisa).forEach(([currency, values]: [string, any]) => {
        const total = values.reduce((sum: number, v: number) => sum + v, 0);
        const totalUsd = total * (EXCHANGE_RATES[currency] || 1);
        console.log(`  ${currency}: ${values.length} montos | TOTAL: ${currency} ${total.toLocaleString()} = USD $${totalUsd.toLocaleString()}`);
        console.log(`    → TODOS los montos ${currency}:`, values.map((v: number) => v.toLocaleString()).join(', '));
      });
      
      console.log('[AuditBank] 📊 PRIMEROS 15 MONTOS CON OFFSET:');
      amounts.slice(0, 15).forEach((amt, i) => {
        const usdEquiv = amt.value * (EXCHANGE_RATES[amt.currency] || 1);
        console.log(`  ${i + 1}. ${amt.currency} ${amt.value.toLocaleString()} = USD ${usdEquiv.toLocaleString()} (Offset: ${amt.offset})`);
      });

    if (extracted.reverseEngineering) {
      console.log('[AuditBank] 🧬 INGENIERÍA INVERSA:', {
        firmas: extracted.reverseEngineering.fileSignatures.length,
        camposBinarios: extracted.reverseEngineering.structuredFieldsCount,
        hashes: {
          sha256: extracted.reverseEngineering.hexPatterns.sha256Count,
          md5: extracted.reverseEngineering.hexPatterns.md5Count,
        },
        estructuras: {
          json: extracted.reverseEngineering.dataStructures.jsonLikeCount,
          xml: extracted.reverseEngineering.dataStructures.xmlTagsCount,
          keyValue: extracted.reverseEngineering.dataStructures.keyValuePairsCount,
        },
        confianza: `${extracted.reverseEngineering.confidence}%`,
      });
    }

    return extracted;
  };

  // Función de clasificación M0-M4 mejorada
  const classifyAmount = (amountUsd: number, transactionCount: number): 'M0' | 'M1' | 'M2' | 'M3' | 'M4' => {
    // M0: Efectivo físico (< $10,000)
    if (amountUsd < 10000) return 'M0';
    
    // M4: Instrumentos financieros (> $5M y alta actividad)
    if (amountUsd > 5000000 && transactionCount > 50) return 'M4';
    
    // M3: Depósitos institucionales (> $1M)
    if (amountUsd >= 1000000) return 'M3';
    
    // M2: Ahorro y depósitos a plazo (entre $100K y $1M, baja actividad)
    if (amountUsd >= 100000 && transactionCount < 20) return 'M2';
    
    // M1: Depósitos a la vista (default para cuentas activas)
    return 'M1';
  };

  // Cargar y procesar archivo Digital Commercial Bank Ltd
  const handleFileLoad = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    console.log('[AuditBank] ═══════════════════════════════════════════');
    console.log('[AuditBank] 🚀 INICIANDO PROCESAMIENTO DE ARCHIVO Digital Commercial Bank Ltd');
    console.log('[AuditBank] ═══════════════════════════════════════════');

    setIsScanning(true);
    setProgress(0);

    try {
      const buffer = await file.arrayBuffer();
      const data = new Uint8Array(buffer);
      
      setProgress(20);
      console.log('[AuditBank] 📁 Archivo:', file.name);
      console.log('[AuditBank] 📊 Tamaño:', (data.length / 1024).toFixed(2), 'KB');
      console.log('[AuditBank] 📊 Bytes totales:', data.length.toLocaleString());
      
      // Mostrar muestra del contenido
      const textDecoder = new TextDecoder('utf-8', { fatal: false });
      const sampleText = textDecoder.decode(data.slice(0, 500));
      console.log('[AuditBank] 📄 Primeros 500 caracteres:');
      console.log(sampleText.substring(0, 200) + '...');
      console.log('[AuditBank] ─────────────────────────────────────────────');

      // Extraer todos los datos
      const extracted = extractAllData(data, file.name);
      setExtractedData(extracted);
      
      console.log('[AuditBank] ✅ DATOS EXTRAÍDOS:');
      console.log('  - Cuentas bancarias:', extracted.accountNumbers.length);
      console.log('  - Códigos IBAN:', extracted.ibanCodes.length);
      console.log('  - Códigos SWIFT:', extracted.swiftCodes.length);
      console.log('  - Bancos:', extracted.bankNames.length);
      console.log('  - Montos:', extracted.amounts.length);
      console.log('  - Divisas únicas:', extracted.metadata.totalCurrencies);
      
      setProgress(50);

      // 🔥 CLASIFICACIÓN MEJORADA - CADA MONTO INDIVIDUAL 🔥
      // Agrupar por divisa Y clasificar CADA MONTO
      const currencyData = new Map<string, { 
        total: number; 
        amounts: number[]; 
        count: number;
        M0: number;
        M1: number;
        M2: number;
        M3: number;
        M4: number;
      }>();
      
      console.log('[AuditBank] 🔍 DEPURACIÓN: Clasificando', extracted.amounts.length, 'montos...');
      
      // Clasificar CADA MONTO individual
      extracted.amounts.forEach((amt, index) => {
        if (!currencyData.has(amt.currency)) {
          currencyData.set(amt.currency, { 
            total: 0, 
            amounts: [], 
            count: 0,
            M0: 0,
            M1: 0,
            M2: 0,
            M3: 0,
            M4: 0
          });
        }
        
        const data = currencyData.get(amt.currency)!;
        data.total += amt.value;
        data.amounts.push(amt.value);
        data.count++;
        
        // Clasificar ESTE monto específico en USD
        const valueUsd = amt.value * (EXCHANGE_RATES[amt.currency] || 1.0);
        
        // Log para montos USD específicamente
        if (amt.currency === 'USD' && index < 20) {
          console.log(`[AuditBank] 🔍 USD Monto #${index + 1}: ${amt.currency} ${amt.value.toLocaleString()} = USD $${valueUsd.toLocaleString()}`);
        }
        
        // Asignar a la categoría correcta
        let categoria = '';
        if (valueUsd < 10000) {
          data.M0 += amt.value;
          categoria = 'M0';
        } else if (valueUsd < 100000) {
          data.M1 += amt.value;
          categoria = 'M1';
        } else if (valueUsd < 1000000) {
          data.M2 += amt.value;
          categoria = 'M2';
        } else if (valueUsd < 5000000) {
          data.M3 += amt.value;
          categoria = 'M3';
        } else {
          data.M4 += amt.value;
          categoria = 'M4';
        }
        
        // Log para montos USD en M1, M2, M3 específicamente
        if (amt.currency === 'USD' && (categoria === 'M1' || categoria === 'M2' || categoria === 'M3')) {
          console.log(`[AuditBank] ✅ ${categoria} DETECTADO: USD ${amt.value.toLocaleString()} (USD $${valueUsd.toLocaleString()}) → ${categoria}`);
        }
        
        // Log para TODOS los montos M3 (todas las divisas)
        if (categoria === 'M3') {
          console.log(`[AuditBank] 🟡 M3: ${amt.currency} ${amt.value.toLocaleString()} = USD $${valueUsd.toLocaleString()}`);
        }
      });
      
      console.log('[AuditBank] 🔍 DEPURACIÓN: Clasificación completada');
      console.log('\n[AuditBank] ═══════════════════════════════════════════════════════');
      console.log('[AuditBank] 📊 DISTRIBUCIÓN REAL DEL DINERO POR CATEGORÍA:');
      console.log('[AuditBank] ═══════════════════════════════════════════════════════');
      
      // Mostrar distribución para TODAS las divisas
      Array.from(currencyData.entries()).forEach(([currency, data]) => {
        console.log(`\n  💰 ${currency}:`);
        console.log(`     Total: ${currency} ${data.total.toLocaleString()}`);
        if (data.M0 > 0) console.log(`     M0 (<$10K): ${currency} ${data.M0.toLocaleString()} (${((data.M0/data.total)*100).toFixed(1)}%)`);
        if (data.M1 > 0) console.log(`     M1 ($10K-$100K): ${currency} ${data.M1.toLocaleString()} (${((data.M1/data.total)*100).toFixed(1)}%)`);
        if (data.M2 > 0) console.log(`     M2 ($100K-$1M): ${currency} ${data.M2.toLocaleString()} (${((data.M2/data.total)*100).toFixed(1)}%)`);
        if (data.M3 > 0) console.log(`     M3 ($1M-$5M): ${currency} ${data.M3.toLocaleString()} (${((data.M3/data.total)*100).toFixed(1)}%)`);
        if (data.M4 > 0) console.log(`     M4 (>$5M): ${currency} ${data.M4.toLocaleString()} (${((data.M4/data.total)*100).toFixed(1)}%)`);
      });
      
      console.log('\n[AuditBank] ═══════════════════════════════════════════════════════');

      setProgress(70);

      // Crear agregados con LOS VALORES REALES de cada categoría
      const agregados = Array.from(currencyData.entries()).map(([currency, data]) => {
        const equivUsd = data.total * (EXCHANGE_RATES[currency] || 1.0);
        
        const agregado = {
          currency,
          M0: data.M0,  // ← VALOR REAL
          M1: data.M1,  // ← VALOR REAL
          M2: data.M2,  // ← VALOR REAL
          M3: data.M3,  // ← VALOR REAL
          M4: data.M4,  // ← VALOR REAL
          equiv_usd: equivUsd,
        };
        
        // 🔥 LOG DETALLADO PARA CADA DIVISA 🔥
        console.log(`[AuditBank] ✅ Agregado creado para ${currency}:`, {
          M0: agregado.M0,
          M1: agregado.M1,
          M2: agregado.M2,
          M3: agregado.M3,
          M4: agregado.M4,
          total: agregado.M0 + agregado.M1 + agregado.M2 + agregado.M3 + agregado.M4,
          equiv_usd: agregado.equiv_usd
        });
        
        return agregado;
      });
      
      console.log('[AuditBank] 📊 AGREGADOS FINALES:', agregados.length, 'divisas');
      console.log('[AuditBank] 🔍 VERIFICACIÓN: Todos los agregados:', JSON.stringify(agregados, null, 2));

      setProgress(85);

      // 🔥 EXTRACCIÓN CONTEXTUAL REAL - DETECTAR BLOQUES DE INFORMACIÓN RELACIONADA 🔥
      const hallazgos: any[] = [];

      // Decodificar el texto completo para análisis contextual
      const fullTextDecoder = new TextDecoder('utf-8', { fatal: false });
      const fullText = fullTextDecoder.decode(data);

      // Función para extraer contexto REAL alrededor de un monto
      const extractRealContext = (offset: number, contextText: string, _amt: any) => {
        // Extraer 300 caracteres antes y después del monto
        const contextStart = Math.max(0, offset - 300);
        const contextEnd = Math.min(contextText.length, offset + 300);
        const context = contextText.substring(contextStart, contextEnd);
        
        // Buscar datos relacionados en el contexto
        let relatedAccount = null;
        let relatedIBAN = null;
        let relatedSWIFT = null;
        let relatedBank = null;
        
        // Buscar cuenta más cercana al monto
        const accountPattern = /(?:account|cuenta|acc|number|no)[:\s]*([0-9]{8,22})/gi;
        let accountMatch = accountPattern.exec(context);
        if (accountMatch) {
          relatedAccount = accountMatch[1];
        } else {
          // Buscar cualquier número largo cerca
          const anyAccountPattern = /\b(\d{10,22})\b/g;
          accountMatch = anyAccountPattern.exec(context);
          if (accountMatch) relatedAccount = accountMatch[1];
        }
        
        // Buscar IBAN en el contexto
        const ibanPattern = /\b([A-Z]{2}\d{2}[A-Z0-9]{11,30})\b/g;
        const ibanMatch = ibanPattern.exec(context);
        if (ibanMatch) relatedIBAN = ibanMatch[1];
        
        // Buscar SWIFT en el contexto
        const swiftPattern = /\b([A-Z]{4}[A-Z]{2}[A-Z0-9]{2,5})\b/g;
        const swiftMatch = swiftPattern.exec(context);
        if (swiftMatch && swiftMatch[1].length >= 8 && swiftMatch[1].length <= 11) {
          relatedSWIFT = swiftMatch[1];
        }
        
        // Buscar banco en el contexto
        const contextUpper = context.toUpperCase();
        for (const bank of KNOWN_BANKS) {
          if (contextUpper.includes(bank.toUpperCase())) {
            relatedBank = bank;
            break;
          }
        }
        
        // Si no encontró banco, buscar patrón "Bank of X" o "X Bank"
        if (!relatedBank) {
          const bankPattern = /\b([A-Z][A-Za-z\s&]{3,40}(?:BANK|BANCO|NBD|FAB|UBS))\b/i;
          const bankMatch = bankPattern.exec(context);
          if (bankMatch) relatedBank = bankMatch[1].trim();
        }

        return {
          account: relatedAccount,
          iban: relatedIBAN,
          swift: relatedSWIFT,
          bank: relatedBank,
          contextSnippet: context.substring(0, 200).replace(/\s+/g, ' ').trim()
        };
      };
      
      // Crear hallazgos con información REAL del contexto
      extracted.amounts.forEach((amt, index) => {
        const valueUsd = amt.value * (EXCHANGE_RATES[amt.currency] || 1.0);
        
        // Clasificar ESTE monto específico
        let classification: 'M0' | 'M1' | 'M2' | 'M3' | 'M4';
        if (valueUsd < 10000) {
          classification = 'M0';
        } else if (valueUsd < 100000) {
          classification = 'M1';
        } else if (valueUsd < 1000000) {
          classification = 'M2';
        } else if (valueUsd < 5000000) {
          classification = 'M3';
        } else {
          classification = 'M4';
        }
        
        // Extraer contexto REAL del archivo
        const realContext = extractRealContext(amt.offset, fullText, amt);
        
        // Construir evidencia con datos REALES (no simulados)
        let evidencia = `Monto: ${amt.currency} ${amt.value.toLocaleString()} (USD ${valueUsd.toLocaleString()})`;
        
        if (realContext.account) {
          evidencia += ` | Cuenta detectada: ${realContext.account}`;
        }
        if (realContext.iban) {
          evidencia += ` | IBAN: ${realContext.iban}`;
        }
        if (realContext.swift) {
          evidencia += ` | SWIFT: ${realContext.swift}`;
        }
        if (realContext.bank) {
          evidencia += ` | Banco: ${realContext.bank}`;
        }
        evidencia += ` | Contexto: ${realContext.contextSnippet.substring(0, 100)}...`;

        hallazgos.push({
          id_registro: `audit-real-${Date.now()}-${index}`,
          archivo: {
            ruta: file.name,
            hash_sha256: `sha256-${file.size}-${Date.now()}`,
            fecha_mod: new Date(file.lastModified).toISOString(),
          },
          banco_detectado: realContext.bank || 'Banco no identificado en contexto',
          numero_cuenta_full: realContext.account || realContext.iban || 'No detectada', // ← CUENTA COMPLETA
          numero_cuenta_mask: realContext.account 
            ? `******${realContext.account.slice(-4)}` 
            : (realContext.iban ? `${realContext.iban.slice(0, 4)}****` : 'Sin cuenta'),
          iban_full: realContext.iban || null, // ← IBAN COMPLETO
          swift_code: realContext.swift || null, // ← SWIFT COMPLETO
          money: { amount: amt.value, currency: amt.currency },
          classification,
          evidencia_fragmento: evidencia,
          score_confianza: 85 + (realContext.account ? 5 : 0) + (realContext.iban ? 5 : 0) + (realContext.swift ? 3 : 0) + (realContext.bank ? 2 : 0),
          timestamp_detectado: new Date().toISOString(),
        });
      });

      const resultados: AuditResults = {
        resumen: {
          total_hallazgos: hallazgos.length,
          fecha: new Date().toISOString(),
        },
        agregados,
        hallazgos,
      };

      setProgress(100);
      setResults(resultados);
      
      // GUARDAR PARA PERSISTENCIA
      auditStore.saveAuditData(resultados, extracted);
      
      console.log('[AuditBank] ✅ COMPLETADO Y GUARDADO');
      console.log('[AuditBank] 🔍 HALLAZGOS CREADOS CON CONTEXTO REAL:');
      console.log(`  Total de hallazgos: ${hallazgos.length}`);
      console.log(`  Hallazgos con cuenta identificada: ${hallazgos.filter(h => h.numero_cuenta_mask.includes('*')).length}`);
      console.log(`  Hallazgos con banco identificado: ${hallazgos.filter(h => h.banco_detectado !== 'Banco no identificado en contexto').length}`);
      
      console.log('\n[AuditBank] 📊 CLASIFICACIÓN M0-M4 DETALLADA POR DIVISA:');
      console.log('[AuditBank] ═══════════════════════════════════════════════════════');
      
      let totalM0 = 0, totalM1 = 0, totalM2 = 0, totalM3 = 0, totalM4 = 0;
      
      agregados.forEach(a => {
        const totalDivisa = a.M0 + a.M1 + a.M2 + a.M3 + a.M4;
        console.log(`\n  💰 ${a.currency}:`);
        console.log(`     TOTAL EN ${a.currency}: ${totalDivisa.toLocaleString()}`);
        console.log(`     TOTAL EN USD: $${a.equiv_usd.toLocaleString()}`);
        console.log(`     Distribución:`);
        
        const amountInCategory = [
          { cat: 'M0', val: a.M0, usd: a.M0 * (EXCHANGE_RATES[a.currency] || 1) },
          { cat: 'M1', val: a.M1, usd: a.M1 * (EXCHANGE_RATES[a.currency] || 1) },
          { cat: 'M2', val: a.M2, usd: a.M2 * (EXCHANGE_RATES[a.currency] || 1) },
          { cat: 'M3', val: a.M3, usd: a.M3 * (EXCHANGE_RATES[a.currency] || 1) },
          { cat: 'M4', val: a.M4, usd: a.M4 * (EXCHANGE_RATES[a.currency] || 1) },
        ];
        
        amountInCategory.forEach(x => {
          if (x.val > 0) {
            const percentage = totalDivisa > 0 ? ((x.val / totalDivisa) * 100).toFixed(1) : '0';
            console.log(`     ├─ ${x.cat}: ${a.currency} ${x.val.toLocaleString()} (${percentage}%) = USD $${x.usd.toLocaleString()}`);
          }
        });
        
        totalM0 += a.M0 * (EXCHANGE_RATES[a.currency] || 1);
        totalM1 += a.M1 * (EXCHANGE_RATES[a.currency] || 1);
        totalM2 += a.M2 * (EXCHANGE_RATES[a.currency] || 1);
        totalM3 += a.M3 * (EXCHANGE_RATES[a.currency] || 1);
        totalM4 += a.M4 * (EXCHANGE_RATES[a.currency] || 1);
      });
      
      console.log('\n[AuditBank] ═══════════════════════════════════════════════════════');
      
      console.log('[AuditBank] 💰 TOTALES POR CATEGORÍA (USD):');
      console.log(`  M0 (<$10K): $${totalM0.toLocaleString()} | ${hallazgos.filter(h => h.classification === 'M0').length} montos`);
      console.log(`  M1 ($10K-$100K): $${totalM1.toLocaleString()} | ${hallazgos.filter(h => h.classification === 'M1').length} montos`);
      console.log(`  M2 ($100K-$1M): $${totalM2.toLocaleString()} | ${hallazgos.filter(h => h.classification === 'M2').length} montos`);
      console.log(`  M3 ($1M-$5M): $${totalM3.toLocaleString()} | ${hallazgos.filter(h => h.classification === 'M3').length} montos`);
      console.log(`  M4 (>$5M): $${totalM4.toLocaleString()} | ${hallazgos.filter(h => h.classification === 'M4').length} montos`);
      console.log(`  TOTAL: $${(totalM0+totalM1+totalM2+totalM3+totalM4).toLocaleString()} | ${hallazgos.length} montos totales`);
      
      // 🔥 VERIFICAR TODOS LOS MONTOS M3 🔥
      const montosM3 = hallazgos.filter(h => h.classification === 'M3');
      if (montosM3.length > 0) {
        console.log('\n[AuditBank] 🟡🟡🟡 VERIFICACIÓN COMPLETA M3 ($1M-$5M) 🟡🟡🟡');
        console.log(`  Total de montos clasificados en M3: ${montosM3.length}`);
        console.log('  LISTADO COMPLETO:');
        montosM3.forEach((h, i) => {
          const usdEquiv = h.money.amount * (EXCHANGE_RATES[h.money.currency] || 1);
          console.log(`    ${(i + 1).toString().padStart(3, ' ')}. ${h.money.currency} ${h.money.amount.toLocaleString().padStart(15, ' ')} = USD $${usdEquiv.toLocaleString().padStart(15, ' ')}`);
        });
        console.log(`  ─────────────────────────────────────────────────`);
        console.log(`  SUMA TOTAL M3 (USD): $${totalM3.toLocaleString()}`);
        console.log(`  VERIFICACIÓN: ${montosM3.length} montos sumados`);
      }
      
      // Mostrar ejemplos de montos en cada categoría
      console.log('\n[AuditBank] 📋 EJEMPLOS POR CATEGORÍA:');
      if (hallazgos.filter(h => h.classification === 'M0').length > 0) {
        console.log('  M0:', hallazgos.filter(h => h.classification === 'M0').slice(0, 3).map(h => `${h.money.currency} ${h.money.amount.toLocaleString()}`).join(', '));
      }
      if (hallazgos.filter(h => h.classification === 'M1').length > 0) {
        console.log('  M1:', hallazgos.filter(h => h.classification === 'M1').slice(0, 3).map(h => `${h.money.currency} ${h.money.amount.toLocaleString()}`).join(', '));
      }
      if (hallazgos.filter(h => h.classification === 'M2').length > 0) {
        console.log('  M2:', hallazgos.filter(h => h.classification === 'M2').slice(0, 3).map(h => `${h.money.currency} ${h.money.amount.toLocaleString()}`).join(', '));
      }
      if (hallazgos.filter(h => h.classification === 'M3').length > 0) {
        console.log('  M3:', hallazgos.filter(h => h.classification === 'M3').slice(0, 3).map(h => `${h.money.currency} ${h.money.amount.toLocaleString()}`).join(', '));
      }
      if (hallazgos.filter(h => h.classification === 'M4').length > 0) {
        console.log('  M4:', hallazgos.filter(h => h.classification === 'M4').slice(0, 3).map(h => `${h.money.currency} ${h.money.amount.toLocaleString()}`).join(', '));
      }
      
      console.log('[AuditBank] 💾 Datos persistidos - permanecerán al cambiar de pestaña');
      
    } catch (error) {
      console.error('[AuditBank] ❌ Error:', error);
      alert('Error: ' + (error as Error).message);
    } finally {
      setIsScanning(false);
    }
  };

  // 🔥 FUNCIÓN PARA PROCESAR DATOS DEL ANALIZADOR AUTOMÁTICAMENTE 🔥
  const processBalancesFromAnalyzer = (balances: CurrencyBalance[]) => {
    console.log('[AuditBank] 🚀 Procesamiento automático iniciado desde Analizador de Archivos Grandes');
    console.log('[AuditBank] 📊 Balances recibidos:', balances.length, 'divisas');
    setAutoProcessed(true);

    setIsScanning(true);
    setProgress(0);
    
    setTimeout(() => {
      setProgress(30);
      
      // 🔥 CLASIFICAR CADA MONTO INDIVIDUAL (no solo el total) 🔥
      const agregados = balances.map(bal => {
        const equivUsd = bal.totalAmount * (EXCHANGE_RATES[bal.currency] || 1);
        
        // Inicializar categorías
        let M0 = 0, M1 = 0, M2 = 0, M3 = 0, M4 = 0;
        
        // Clasificar CADA monto individual del balance
        if (bal.amounts && bal.amounts.length > 0) {
          bal.amounts.forEach(amount => {
            const amountUsd = amount * (EXCHANGE_RATES[bal.currency] || 1);
            
            if (amountUsd < 10000) {
              M0 += amount;
            } else if (amountUsd < 100000) {
              M1 += amount;
            } else if (amountUsd < 1000000) {
              M2 += amount;
            } else if (amountUsd < 5000000) {
              M3 += amount;
            } else {
              M4 += amount;
            }
          });
        } else {
          // Si no hay amounts individuales, clasificar el total
          if (equivUsd < 10000) {
            M0 = bal.totalAmount;
          } else if (equivUsd < 100000) {
            M1 = bal.totalAmount;
          } else if (equivUsd < 1000000) {
            M2 = bal.totalAmount;
          } else if (equivUsd < 5000000) {
            M3 = bal.totalAmount;
          } else {
            M4 = bal.totalAmount;
          }
        }
        
        return {
          currency: bal.currency,
          M0,  // ← VALOR REAL de montos < $10K
          M1,  // ← VALOR REAL de montos $10K-$100K
          M2,  // ← VALOR REAL de montos $100K-$1M
          M3,  // ← VALOR REAL de montos $1M-$5M
          M4,  // ← VALOR REAL de montos > $5M
          equiv_usd: equivUsd,
        };
      });

      setProgress(60);

      // Crear hallazgos detallados con datos completos
      const hallazgos = balances.map((bal, i) => {
        const equivUsd = bal.totalAmount * (EXCHANGE_RATES[bal.currency] || 1);
        const classification = classifyAmount(equivUsd, bal.transactionCount);
        
        return {
          id_registro: `analyzer-${Date.now()}-${i}`,
          archivo: { 
            ruta: 'Analizador de Archivos Grandes → Bank Audit', 
            hash_sha256: `auto-${Date.now()}`, 
            fecha_mod: new Date(bal.lastUpdated).toISOString() 
          },
          banco_detectado: 'Digital Commercial Bank Ltd Analyzer',
          numero_cuenta_mask: `******${bal.accountName.slice(-4)}`,
          numero_cuenta_full: bal.accountName, // ← CUENTA COMPLETA del Analizador
          iban_full: null,
          swift_code: null,
          money: { amount: bal.totalAmount, currency: bal.currency },
          classification,
          evidencia_fragmento: `${bal.currency}: ${bal.totalAmount.toLocaleString()} | ${bal.transactionCount} transacciones | Mayor: ${bal.largestTransaction.toLocaleString()} | Menor: ${bal.smallestTransaction.toLocaleString()} | Promedio: ${bal.averageTransaction.toLocaleString()} | Clasificación: ${classification}`,
          score_confianza: 98,
          timestamp_detectado: new Date().toISOString(),
        };
      });

      setProgress(90);

      const resultados: AuditResults = {
        resumen: { 
          total_hallazgos: hallazgos.length, 
          fecha: new Date().toISOString() 
        },
        agregados,
        hallazgos,
      };

      setProgress(100);
      setResults(resultados);
      auditStore.saveAuditData(resultados, null);
      setIsScanning(false);
      
      console.log('[AuditBank] ✅ Procesamiento automático COMPLETADO');
      console.log('[AuditBank] 📊 CLASIFICACIÓN M0-M4 DETALLADA:');
      
      let totalM0 = 0, totalM1 = 0, totalM2 = 0, totalM3 = 0, totalM4 = 0;
      
      agregados.forEach(a => {
        const amountInCategory = [
          { cat: 'M0', val: a.M0, usd: a.M0 * (EXCHANGE_RATES[a.currency] || 1) },
          { cat: 'M1', val: a.M1, usd: a.M1 * (EXCHANGE_RATES[a.currency] || 1) },
          { cat: 'M2', val: a.M2, usd: a.M2 * (EXCHANGE_RATES[a.currency] || 1) },
          { cat: 'M3', val: a.M3, usd: a.M3 * (EXCHANGE_RATES[a.currency] || 1) },
          { cat: 'M4', val: a.M4, usd: a.M4 * (EXCHANGE_RATES[a.currency] || 1) },
        ].filter(x => x.val > 0);
        
        if (amountInCategory.length > 0) {
          console.log(`  ${a.currency}:`);
          amountInCategory.forEach(x => {
            console.log(`    ${x.cat}: ${a.currency} ${x.val.toLocaleString()} (USD $${x.usd.toLocaleString()})`);
          });
        }
        
        totalM0 += a.M0 * (EXCHANGE_RATES[a.currency] || 1);
        totalM1 += a.M1 * (EXCHANGE_RATES[a.currency] || 1);
        totalM2 += a.M2 * (EXCHANGE_RATES[a.currency] || 1);
        totalM3 += a.M3 * (EXCHANGE_RATES[a.currency] || 1);
        totalM4 += a.M4 * (EXCHANGE_RATES[a.currency] || 1);
      });
      
      console.log('[AuditBank] 💰 TOTALES POR CATEGORÍA (USD):');
      console.log(`  M0 (<$10K): $${totalM0.toLocaleString()} | ${hallazgos.filter(h => h.classification === 'M0').length} montos`);
      console.log(`  M1 ($10K-$100K): $${totalM1.toLocaleString()} | ${hallazgos.filter(h => h.classification === 'M1').length} montos`);
      console.log(`  M2 ($100K-$1M): $${totalM2.toLocaleString()} | ${hallazgos.filter(h => h.classification === 'M2').length} montos`);
      console.log(`  M3 ($1M-$5M): $${totalM3.toLocaleString()} | ${hallazgos.filter(h => h.classification === 'M3').length} montos`);
      console.log(`  M4 (>$5M): $${totalM4.toLocaleString()} | ${hallazgos.filter(h => h.classification === 'M4').length} montos`);
      console.log(`  TOTAL: $${(totalM0+totalM1+totalM2+totalM3+totalM4).toLocaleString()} | ${hallazgos.length} montos totales`);
      
      // Mostrar ejemplos
      console.log('[AuditBank] 📋 EJEMPLOS POR CATEGORÍA:');
      ['M0', 'M1', 'M2', 'M3', 'M4'].forEach(cat => {
        const montosEnCategoria = hallazgos.filter(h => h.classification === cat);
        if (montosEnCategoria.length > 0) {
          console.log(`  ${cat}:`, montosEnCategoria.slice(0, 3).map(h => `${h.money.currency} ${h.money.amount.toLocaleString()}`).join(', '));
        }
      });
      
      console.log('[AuditBank] 💾 Datos guardados y listos para visualizar');
    }, 800);
  };

  // Asignar la función a la referencia para uso en useEffect
  useEffect(() => {
    processBalancesRef.current = processBalancesFromAnalyzer;
  }, []);

  // Detectar scroll para mostrar botón "Ir al inicio"
  useEffect(() => {
    const handleScroll = () => {
      if (containerRef.current) {
        const scrollTop = containerRef.current.scrollTop;
        setShowScrollTop(scrollTop > 300);
      }
    };

    const container = containerRef.current;
    if (container) {
      container.addEventListener('scroll', handleScroll);
      return () => container.removeEventListener('scroll', handleScroll);
    }
  }, []);

  // Función para ir al inicio
  const scrollToTop = () => {
    if (containerRef.current) {
      containerRef.current.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  // Analizar balances del sistema (botón manual)
  const handleAnalyzeSystem = () => {
    const balances = balanceStore.getBalances();
    if (balances.length === 0) {
      alert('No hay balances en el sistema. Ve al "Analizador de Archivos Grandes" primero.');
      return;
    }

    console.log('[AuditBank] 📊 Análisis manual iniciado...');
    processBalancesFromAnalyzer(balances);
  };

  const handleClear = () => {
    if (confirm('¿Borrar todos los datos de auditoría?')) {
      auditStore.clearAuditData();
      setResults(null);
      setExtractedData(null);
    }
  };

  const handleExportJson = () => {
    if (!results) return;
    const blob = new Blob([JSON.stringify({ results, extractedData }, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `audit_${Date.now()}.json`;
    a.click();
  };

  const handleExportCsv = () => {
    if (!results) return;
    const headers = ['Divisa', 'M0', 'M1', 'M2', 'M3', 'M4', 'USD Equiv'];
    const rows = results.agregados.map(a => [a.currency, a.M0, a.M1, a.M2, a.M3, a.M4, a.equiv_usd].join(','));
    const csv = [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `audit_${Date.now()}.csv`;
    a.click();
  };

  // 🔥 EXPORTAR INFORME COMPLETO EN TEXTO 🔥
  const handleExportFullReport = () => {
    if (!results || !extractedData) {
      alert('No hay datos para exportar');
      return;
    }

    const timestamp = new Date().toISOString();
    const totalM0 = results.agregados.reduce((s, a) => s + a.M0 * (EXCHANGE_RATES[a.currency] || 1), 0);
    const totalM1 = results.agregados.reduce((s, a) => s + a.M1 * (EXCHANGE_RATES[a.currency] || 1), 0);
    const totalM2 = results.agregados.reduce((s, a) => s + a.M2 * (EXCHANGE_RATES[a.currency] || 1), 0);
    const totalM3 = results.agregados.reduce((s, a) => s + a.M3 * (EXCHANGE_RATES[a.currency] || 1), 0);
    const totalM4 = results.agregados.reduce((s, a) => s + a.M4 * (EXCHANGE_RATES[a.currency] || 1), 0);

    const report = `
╔═══════════════════════════════════════════════════════════════════════╗
║                   INFORME DE AUDITORÍA BANCARIA                      ║
║                     BANK AUDIT - Digital Commercial Bank Ltd ANALYZER                      ║
╚═══════════════════════════════════════════════════════════════════════╝

FECHA DEL INFORME: ${new Date(timestamp).toLocaleString('es-ES')}
ARCHIVO ANALIZADO: ${extractedData.metadata.fileName}
TAMAÑO DEL ARCHIVO: ${(extractedData.metadata.fileSize / 1024).toFixed(2)} KB

═══════════════════════════════════════════════════════════════════════
RESUMEN EJECUTIVO
═══════════════════════════════════════════════════════════════════════

Total de Hallazgos: ${results.resumen.total_hallazgos}
Total de Cuentas Bancarias: ${extractedData.accountNumbers.length}
Total de Códigos IBAN: ${extractedData.ibanCodes.length}
Total de Códigos SWIFT/BIC: ${extractedData.swiftCodes.length}
Total de Instituciones: ${extractedData.bankNames.length}
Total de Montos Detectados: ${extractedData.amounts.length}
Divisas Procesadas: ${extractedData.metadata.totalCurrencies}

═══════════════════════════════════════════════════════════════════════
CUENTAS BANCARIAS DETECTADAS (${extractedData.accountNumbers.length})
═══════════════════════════════════════════════════════════════════════

${extractedData.accountNumbers.map((acc, i) => 
  `${(i + 1).toString().padStart(3, ' ')}. ${showFullData ? acc : `******${acc.slice(-4)}`} (${acc.length} dígitos)`
).join('\n')}

═══════════════════════════════════════════════════════════════════════
CÓDIGOS IBAN INTERNACIONALES (${extractedData.ibanCodes.length})
═══════════════════════════════════════════════════════════════════════

${extractedData.ibanCodes.map((iban, i) => 
  `${(i + 1).toString().padStart(3, ' ')}. ${showFullData ? iban : `${iban.slice(0, 4)}****${iban.slice(-4)}`} (País: ${iban.slice(0, 2)})`
).join('\n')}

═══════════════════════════════════════════════════════════════════════
CÓDIGOS SWIFT/BIC (${extractedData.swiftCodes.length})
═══════════════════════════════════════════════════════════════════════

${extractedData.swiftCodes.map((swift, i) => 
  `${(i + 1).toString().padStart(3, ' ')}. ${swift} (País: ${swift.slice(4, 6)})`
).join('\n')}

═══════════════════════════════════════════════════════════════════════
INSTITUCIONES BANCARIAS IDENTIFICADAS (${extractedData.bankNames.length})
═══════════════════════════════════════════════════════════════════════

${extractedData.bankNames.map((bank, i) => 
  `${(i + 1).toString().padStart(3, ' ')}. ${bank}`
).join('\n')}

═══════════════════════════════════════════════════════════════════════
MONTOS DETECTADOS (${extractedData.amounts.length})
═══════════════════════════════════════════════════════════════════════

${extractedData.amounts.slice(0, 50).map((amt, i) => {
  const usdEquiv = amt.value * (EXCHANGE_RATES[amt.currency] || 1);
  return `${(i + 1).toString().padStart(3, ' ')}. ${amt.currency} ${amt.value.toLocaleString()} (USD $${usdEquiv.toLocaleString()})`;
}).join('\n')}
${extractedData.amounts.length > 50 ? `\n... y ${extractedData.amounts.length - 50} montos más` : ''}

═══════════════════════════════════════════════════════════════════════
CLASIFICACIÓN MONETARIA M0-M4
═══════════════════════════════════════════════════════════════════════

M0 - Efectivo Físico (< $10,000 USD):
  Total: $${totalM0.toLocaleString()}
  Montos: ${results.hallazgos.filter(h => h.classification === 'M0').length}
  
M1 - Depósitos a la Vista ($10,000 - $100,000 USD):
  Total: $${totalM1.toLocaleString()}
  Montos: ${results.hallazgos.filter(h => h.classification === 'M1').length}

M2 - Ahorro y Depósitos a Plazo ($100,000 - $1,000,000 USD):
  Total: $${totalM2.toLocaleString()}
  Montos: ${results.hallazgos.filter(h => h.classification === 'M2').length}

M3 - Depósitos Institucionales ($1,000,000 - $5,000,000 USD):
  Total: $${totalM3.toLocaleString()}
  Montos: ${results.hallazgos.filter(h => h.classification === 'M3').length}

M4 - Instrumentos Financieros (> $5,000,000 USD):
  Total: $${totalM4.toLocaleString()}
  Montos: ${results.hallazgos.filter(h => h.classification === 'M4').length}

TOTAL GENERAL: $${(totalM0 + totalM1 + totalM2 + totalM3 + totalM4).toLocaleString()}

═══════════════════════════════════════════════════════════════════════
TOTALES POR DIVISA
═══════════════════════════════════════════════════════════════════════

${results.agregados.map(a => {
  const total = a.M0 + a.M1 + a.M2 + a.M3 + a.M4;
  return `
${a.currency}:
  Total en ${a.currency}: ${total.toLocaleString()}
  M0: ${a.M0 > 0 ? a.M0.toLocaleString() : '-'}
  M1: ${a.M1 > 0 ? a.M1.toLocaleString() : '-'}
  M2: ${a.M2 > 0 ? a.M2.toLocaleString() : '-'}
  M3: ${a.M3 > 0 ? a.M3.toLocaleString() : '-'}
  M4: ${a.M4 > 0 ? a.M4.toLocaleString() : '-'}
  Equivalente USD: $${a.equiv_usd.toLocaleString()}`;
}).join('\n')}

═══════════════════════════════════════════════════════════════════════
HALLAZGOS DETALLADOS (${results.hallazgos.length})
═══════════════════════════════════════════════════════════════════════

${results.hallazgos.map((h, i) => `
HALLAZGO #${i + 1}:
  Monto: ${h.money.currency} ${h.money.amount.toLocaleString()}
  Clasificación: ${h.classification}
  Banco: ${h.banco_detectado}
  Cuenta: ${showFullData ? (h.numero_cuenta_full || h.numero_cuenta_mask) : h.numero_cuenta_mask}
  ${h.iban_full ? `IBAN: ${showFullData ? h.iban_full : h.iban_full.slice(0, 4) + '****' + h.iban_full.slice(-4)}` : ''}
  ${h.swift_code ? `SWIFT: ${h.swift_code}` : ''}
  USD Equivalente: $${(h.money.amount * (EXCHANGE_RATES[h.money.currency] || 1)).toLocaleString()}
  Confianza: ${h.score_confianza}%
  Evidencia: ${h.evidencia_fragmento}
  Timestamp: ${new Date(h.timestamp_detectado).toLocaleString('es-ES')}
`).join('\n' + '─'.repeat(75) + '\n')}

═══════════════════════════════════════════════════════════════════════
METADATOS DEL ANÁLISIS
═══════════════════════════════════════════════════════════════════════

Tamaño del Archivo: ${extractedData.metadata.fileSize.toLocaleString()} bytes
Bloques Detectados: ${extractedData.metadata.blocksDetected}
Nivel de Entropía: ${extractedData.metadata.entropyLevel.toFixed(2)} bits/byte
Archivo Encriptado: ${extractedData.metadata.hasEncryption ? 'SÍ' : 'NO'}
Total de Cuentas: ${extractedData.metadata.totalAccounts}
Total de Bancos: ${extractedData.metadata.totalBanks}
Total de Divisas: ${extractedData.metadata.totalCurrencies}

${extractedData.reverseEngineering ? `
═══════════════════════════════════════════════════════════════════════
ANÁLISIS DE INGENIERÍA INVERSA
═══════════════════════════════════════════════════════════════════════

Firmas Detectadas: ${extractedData.reverseEngineering.fileSignatures.join(', ') || 'Ninguna'}
Campos Binarios Decompilados: ${extractedData.reverseEngineering.structuredFieldsCount}
Hashes SHA-256: ${extractedData.reverseEngineering.hexPatterns.sha256Count}
Hashes MD5: ${extractedData.reverseEngineering.hexPatterns.md5Count}
Estructuras JSON: ${extractedData.reverseEngineering.dataStructures.jsonLikeCount}
Estructuras XML: ${extractedData.reverseEngineering.dataStructures.xmlTagsCount}
Key-Value Pairs: ${extractedData.reverseEngineering.dataStructures.keyValuePairsCount}
Nivel de Confianza: ${extractedData.reverseEngineering.confidence}%
` : ''}

═══════════════════════════════════════════════════════════════════════
FIN DEL INFORME
═══════════════════════════════════════════════════════════════════════

Generado por: DAES ULTIMATE - Bank Audit System
Fecha de generación: ${new Date().toLocaleString('es-ES')}
Versión: 5.0
`;

    const blob = new Blob([report], { type: 'text/plain; charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Informe_Auditoria_${Date.now()}.txt`;
    a.click();
    URL.revokeObjectURL(url);
    
    console.log('[AuditBank] 📄 Informe completo exportado en TXT');
  };

  const totalUsd = results?.agregados.reduce((sum, a) => sum + a.equiv_usd, 0) || 0;

  return (
    <div ref={containerRef} className="h-screen overflow-y-auto p-8 space-y-6 smooth-scroll">
      {/* Botón flotante "Ir al inicio" */}
      {showScrollTop && (
        <button
          onClick={scrollToTop}
          className="fixed bottom-8 right-8 z-50 p-4 bg-gradient-to-br from-[#00ff88] to-[#00cc6a] text-black font-bold rounded-full shadow-[0_0_30px_rgba(0,255,136,0.8)] hover:shadow-[0_0_50px_rgba(0,255,136,1)] transition-all hover:scale-110"
          title="Ir al inicio"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" />
          </svg>
        </button>
      )}

      {/* Header */}
      <div className="flex items-center justify-between sticky top-0 bg-[#000000] z-10 py-4 -mt-4 mb-4 border-b border-[#1a1a1a]">
        <div>
          <h1 className="text-3xl font-bold text-[#00ff88] flex items-center gap-3">
            <FileSearch className="w-8 h-8" />
            {t.auditTitle}
          </h1>
          <p className="text-[#4d7c4d] mt-2">{t.auditSubtitle}</p>
          {systemBalances.length > 0 && (
            <p className="text-xs text-[#80ff80] mt-1">✓ {systemBalances.length} divisas en el sistema</p>
          )}
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => fileInputRef.current?.click()}
            className="px-4 py-2 bg-gradient-to-br from-[#00ff88] to-[#00cc6a] text-black font-bold rounded-lg hover:shadow-[0_0_20px_rgba(0,255,136,0.6)] transition-all flex items-center gap-2"
          >
            <File className="w-4 h-4" />
            {t.auditLoadFile}
          </button>
          {(results || extractedData) && (
            <>
              <button 
                onClick={() => setShowFullData(!showFullData)} 
                className={`px-4 py-2 ${showFullData ? 'bg-cyan-500/30 border-cyan-400' : 'bg-[#1a1a1a] border-[#2a2a2a]'} border text-[#00ff88] rounded-lg hover:border-[#00ff88]/50 flex items-center gap-2 transition-all`}
                title={showFullData ? 'Ocultar datos completos' : 'Mostrar datos completos'}
              >
                {showFullData ? `👁️ ${t.auditCompleteView}` : `🔒 ${t.auditMaskedView}`}
              </button>
              <button onClick={handleExportJson} className="px-4 py-2 bg-[#1a1a1a] border border-[#2a2a2a] text-[#4d7c4d] rounded-lg hover:border-[#00ff88]/30 flex items-center gap-2">
                <Download className="w-4 h-4" /> JSON
              </button>
              <button onClick={handleExportCsv} className="px-4 py-2 bg-[#1a1a1a] border border-[#2a2a2a] text-[#4d7c4d] rounded-lg hover:border-[#00ff88]/30 flex items-center gap-2">
                <Download className="w-4 h-4" /> CSV
              </button>
              <button 
                onClick={() => setShowReport(true)} 
                className="px-4 py-2 bg-gradient-to-br from-cyan-500/20 to-blue-500/20 border-2 border-cyan-500/60 text-cyan-300 rounded-lg hover:border-cyan-400 hover:shadow-[0_0_25px_rgba(0,255,255,0.5)] flex items-center gap-2 transition-all font-bold"
              >
                <FileSearch className="w-4 h-4" /> 📊 {t.auditViewFullReport}
              </button>
              <button onClick={handleClear} className="px-4 py-2 bg-red-900/30 border border-red-700/50 text-red-400 rounded-lg hover:bg-red-900/50 flex items-center gap-2">
                <Trash2 className="w-4 h-4" /> {t.auditClearData}
              </button>
            </>
          )}
        </div>
      </div>

      {/* Banner de Vista Completa */}
      {showFullData && (results || extractedData) && (
        <div className="bg-gradient-to-r from-green-500/20 to-cyan-500/20 border-2 border-green-500/50 rounded-xl p-4 shadow-[0_0_30px_rgba(0,255,136,0.3)]">
          <div className="flex items-center gap-3">
            <div className="text-3xl">👁️</div>
            <div className="flex-1">
              <h3 className="text-lg font-bold text-green-400">
                Vista Completa Activada - Todos los Datos Visibles
              </h3>
              <p className="text-sm text-green-300/80 mt-1">
                Mostrando cuentas bancarias, IBANs y toda la información SIN ENMASCARAR. 
                Puedes ver TODOS los números completos para verificación.
              </p>
            </div>
            <button 
              onClick={() => setShowFullData(false)}
              className="px-4 py-2 bg-red-500/20 border border-red-500/40 text-red-400 rounded-lg hover:bg-red-500/30 transition-colors"
            >
              🔒 Enmascarar
            </button>
          </div>
        </div>
      )}

      {/* Panel de Control */}
      <div className="bg-[#0d0d0d] border border-[#1a1a1a] rounded-xl p-6">
        <h2 className="text-xl font-semibold text-[#00ff88] mb-4">{t.auditDataSources}</h2>
        
        {/* 🔥 INDICADOR DE INTEGRACIÓN ACTIVA 🔥 */}
        <div className="mb-4 bg-gradient-to-r from-cyan-500/10 to-green-500/10 border border-cyan-500/30 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-2 h-2 bg-cyan-400 rounded-full animate-pulse"></div>
            <h3 className="text-sm font-semibold text-cyan-400">🔗 {t.auditAnalyzerIntegration}</h3>
          </div>
          <p className="text-xs text-[#4d7c4d] mb-2">
            {t.auditAnalyzerDescription}
          </p>
          <div className="flex items-center gap-2 text-xs text-cyan-300">
            <CheckCircle className="w-4 h-4" />
            <span>{t.auditActiveSubscription} • {t.auditAutoSync}</span>
          </div>
        </div>
        
        {systemBalances.length > 0 ? (
          <div className="mb-4 bg-[#0a0a0a] border border-[#1a1a1a] rounded-lg p-4">
            <h3 className="text-sm font-semibold text-[#00ff88] mb-2">
              📊 {t.auditSystemBalances} ({systemBalances.length} divisas)
            </h3>
            <div className="flex flex-wrap gap-1 mb-3">
              {systemBalances.map(b => (
                <span key={b.currency} className="px-2 py-1 bg-[#1a1a1a] border border-[#00ff88]/30 rounded text-xs text-[#00ff88] font-mono">
                  {b.currency}: {b.totalAmount.toLocaleString()}
                </span>
              ))}
            </div>
            <button
              onClick={handleAnalyzeSystem}
              disabled={isScanning}
              className="w-full px-4 py-2 bg-gradient-to-br from-[#00ff88] to-[#00cc6a] text-black font-bold rounded-lg hover:shadow-[0_0_20px_rgba(0,255,136,0.6)] disabled:opacity-50"
            >
              <Play className="w-4 h-4 inline mr-2" />
              {isScanning ? `${t.auditProcessing}` : t.auditAnalyzeBalances}
            </button>
          </div>
        ) : (
          <div className="text-center py-4 text-[#4d7c4d] text-sm">
            No hay balances. Ve al "Analizador de Archivos Grandes" para procesar un archivo Digital Commercial Bank Ltd.
          </div>
        )}
        
        {isScanning && (
          <div className="mt-4">
            <div className="flex justify-between text-sm mb-2">
              <span className="text-[#4d7c4d]">Procesando...</span>
              <span className="text-[#00ff88] font-mono">{Math.round(progress)}%</span>
            </div>
            <div className="w-full h-2 bg-[#0a0a0a] rounded-full overflow-hidden">
              <div className="h-full bg-gradient-to-r from-[#00ff88] to-[#00cc6a] transition-all" style={{ width: `${progress}%` }} />
            </div>
          </div>
        )}
      </div>

      {/* Datos Extraídos - MEJORADO CON VISUALIZACIÓN COMPLETA */}
      {extractedData && (
        <div className="bg-[#0d0d0d] border border-[#1a1a1a] rounded-xl p-6">
          <h2 className="text-xl font-semibold text-[#00ff88] mb-6 flex items-center gap-2">
            <Building2 className="w-5 h-5" />
            📋 Información Completa Extraída del Digital Commercial Bank Ltd
          </h2>

          {/* Índice de navegación rápida */}
          <div className="mb-6 bg-gradient-to-r from-[#0a0a0a] to-[#0d0d0d] border border-[#00ff88]/20 rounded-lg p-4">
            <div className="text-xs font-semibold text-[#00ff88] mb-2">📑 Índice de Navegación Rápida:</div>
            <div className="flex flex-wrap gap-2">
              <button onClick={() => document.getElementById('section-accounts')?.scrollIntoView({ behavior: 'smooth' })} 
                className="px-3 py-1 bg-blue-500/20 border border-blue-500/40 text-blue-300 text-xs rounded hover:bg-blue-500/30 transition-colors">
                💳 Cuentas ({extractedData.accountNumbers.length})
              </button>
              <button onClick={() => document.getElementById('section-ibans')?.scrollIntoView({ behavior: 'smooth' })} 
                className="px-3 py-1 bg-purple-500/20 border border-purple-500/40 text-purple-300 text-xs rounded hover:bg-purple-500/30 transition-colors">
                🌍 IBANs ({extractedData.ibanCodes.length})
              </button>
              <button onClick={() => document.getElementById('section-swift')?.scrollIntoView({ behavior: 'smooth' })} 
                className="px-3 py-1 bg-green-500/20 border border-green-500/40 text-green-300 text-xs rounded hover:bg-green-500/30 transition-colors">
                📡 SWIFT ({extractedData.swiftCodes.length})
              </button>
              <button onClick={() => document.getElementById('section-banks')?.scrollIntoView({ behavior: 'smooth' })} 
                className="px-3 py-1 bg-yellow-500/20 border border-yellow-500/40 text-yellow-300 text-xs rounded hover:bg-yellow-500/30 transition-colors">
                🏛️ Bancos ({extractedData.bankNames.length})
              </button>
              <button onClick={() => document.getElementById('section-amounts')?.scrollIntoView({ behavior: 'smooth' })} 
                className="px-3 py-1 bg-cyan-500/20 border border-cyan-500/40 text-cyan-300 text-xs rounded hover:bg-cyan-500/30 transition-colors">
                💰 Montos ({extractedData.amounts.length})
              </button>
              <button onClick={() => document.getElementById('section-reverse')?.scrollIntoView({ behavior: 'smooth' })} 
                className="px-3 py-1 bg-orange-500/20 border border-orange-500/40 text-orange-300 text-xs rounded hover:bg-orange-500/30 transition-colors">
                🧬 Ingeniería Inversa
              </button>
              <button onClick={() => document.getElementById('section-m0m4')?.scrollIntoView({ behavior: 'smooth' })} 
                className="px-3 py-1 bg-pink-500/20 border border-pink-500/40 text-pink-300 text-xs rounded hover:bg-pink-500/30 transition-colors">
                📊 M0-M4
              </button>
            </div>
          </div>

          {/* RESUMEN VISUAL */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
            <div className="bg-gradient-to-br from-blue-500/20 to-blue-600/10 border border-blue-500/40 rounded-lg p-4">
              <CreditCard className="w-5 h-5 text-blue-400 mb-2" />
              <div className="text-sm text-blue-300">Cuentas</div>
              <div className="text-3xl font-bold text-blue-400">{extractedData.accountNumbers.length}</div>
            </div>

            <div className="bg-gradient-to-br from-purple-500/20 to-purple-600/10 border border-purple-500/40 rounded-lg p-4">
              <FileSearch className="w-5 h-5 text-purple-400 mb-2" />
              <div className="text-sm text-purple-300">IBANs</div>
              <div className="text-3xl font-bold text-purple-400">{extractedData.ibanCodes.length}</div>
            </div>

            <div className="bg-gradient-to-br from-green-500/20 to-green-600/10 border border-green-500/40 rounded-lg p-4">
              <TrendingUp className="w-5 h-5 text-green-400 mb-2" />
              <div className="text-sm text-green-300">SWIFT/BIC</div>
              <div className="text-3xl font-bold text-green-400">{extractedData.swiftCodes.length}</div>
            </div>

            <div className="bg-gradient-to-br from-yellow-500/20 to-yellow-600/10 border border-yellow-500/40 rounded-lg p-4">
              <Building2 className="w-5 h-5 text-yellow-400 mb-2" />
              <div className="text-sm text-yellow-300">Bancos</div>
              <div className="text-3xl font-bold text-yellow-400">{extractedData.bankNames.length}</div>
            </div>

            <div className="bg-gradient-to-br from-cyan-500/20 to-cyan-600/10 border border-cyan-500/40 rounded-lg p-4">
              <DollarSign className="w-5 h-5 text-cyan-400 mb-2" />
              <div className="text-sm text-cyan-300">Montos</div>
              <div className="text-3xl font-bold text-cyan-400">{extractedData.amounts.length}</div>
            </div>
          </div>

          {/* LISTA COMPLETA DE CUENTAS BANCARIAS */}
          {extractedData.accountNumbers.length > 0 && (
            <div id="section-accounts" className="mb-4 bg-[#0a0a0a] border border-blue-500/30 rounded-lg p-4 scroll-mt-20">
              <h3 className="text-lg font-bold text-blue-400 mb-3 flex items-center gap-2 sticky top-0 bg-[#0a0a0a] pb-2">
                <CreditCard className="w-5 h-5" />
                💳 Cuentas Bancarias Detectadas ({extractedData.accountNumbers.length})
                <span className="ml-auto text-xs text-blue-300 bg-blue-500/20 px-2 py-1 rounded">
                  Scroll para ver todas →
                </span>
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 max-h-[600px] overflow-y-auto pr-2 custom-scrollbar">
                {extractedData.accountNumbers.map((acc, i) => (
                  <div key={i} className="bg-[#000] border border-blue-500/20 rounded p-3 hover:border-blue-400/50 transition-colors">
                    <div className="text-xs text-[#4d7c4d] mb-1">Cuenta #{i + 1}</div>
                    <div className={`${showFullData ? 'text-sm' : 'text-xs'} text-blue-300 font-mono font-bold break-all`}>
                      {showFullData ? acc : (acc.length >= 10 ? `******${acc.slice(-4)}` : acc)}
                    </div>
                    <div className="text-xs text-[#4d7c4d] mt-1">{acc.length} dígitos</div>
                    {showFullData && (
                      <div className="mt-1 text-xs text-green-400">
                        ✓ Datos completos visibles
                      </div>
                    )}
                  </div>
              ))}
            </div>
              <div className="mt-2 text-xs text-[#4d7c4d] text-center">
                {extractedData.accountNumbers.length} cuentas detectadas • Scroll para ver todas
          </div>
            </div>
          )}

          {/* LISTA COMPLETA DE IBANs */}
          {extractedData.ibanCodes.length > 0 && (
            <div id="section-ibans" className="mb-4 bg-[#0a0a0a] border border-purple-500/30 rounded-lg p-4 scroll-mt-20">
              <h3 className="text-lg font-bold text-purple-400 mb-3 flex items-center gap-2">
                <FileSearch className="w-5 h-5" />
                🌍 Códigos IBAN Internacionales ({extractedData.ibanCodes.length})
                <span className="ml-auto text-xs text-purple-300 bg-purple-500/20 px-2 py-1 rounded">
                  Scroll para ver todos →
                </span>
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 max-h-[600px] overflow-y-auto pr-2 custom-scrollbar">
                {extractedData.ibanCodes.map((iban, i) => (
                  <div key={i} className="bg-[#000] border border-purple-500/20 rounded p-3 hover:border-purple-400/50 transition-colors">
                    <div className="text-xs text-[#4d7c4d] mb-1">IBAN #{i + 1}</div>
                    <div className={`${showFullData ? 'text-sm' : 'text-xs'} text-purple-300 font-mono font-bold break-all`}>
                      {showFullData ? iban : `${iban.slice(0, 4)}****${iban.slice(-4)}`}
                    </div>
                    <div className="text-xs text-[#4d7c4d] mt-1">
                      País: {iban.slice(0, 2)} | {iban.length} caracteres
                    </div>
                    {showFullData && (
                      <div className="mt-1 text-xs text-green-400">
                        ✓ IBAN completo visible
                      </div>
                    )}
                  </div>
                ))}
              </div>
              <div className="mt-2 text-xs text-[#4d7c4d] text-center">
                {extractedData.ibanCodes.length} códigos IBAN detectados • Scroll para ver todos
              </div>
            </div>
          )}

          {/* LISTA COMPLETA DE SWIFT CODES */}
          {extractedData.swiftCodes.length > 0 && (
            <div id="section-swift" className="mb-4 bg-[#0a0a0a] border border-green-500/30 rounded-lg p-4 scroll-mt-20">
              <h3 className="text-lg font-bold text-green-400 mb-3 flex items-center gap-2">
                <TrendingUp className="w-5 h-5" />
                📡 Códigos SWIFT/BIC ({extractedData.swiftCodes.length})
                <span className="ml-auto text-xs text-green-300 bg-green-500/20 px-2 py-1 rounded">
                  Scroll para ver todos →
                </span>
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
                {extractedData.swiftCodes.map((swift, i) => (
                  <div key={i} className="bg-[#000] border border-green-500/20 rounded p-2 text-center hover:border-green-400/50 transition-colors">
                    <div className="text-lg text-green-300 font-mono font-bold">{swift}</div>
                    <div className="text-xs text-[#4d7c4d]">País: {swift.slice(4, 6)} | #{i + 1}</div>
                  </div>
                ))}
              </div>
              <div className="mt-2 text-xs text-[#4d7c4d] text-center">
                {extractedData.swiftCodes.length} códigos SWIFT detectados • Scroll para ver todos
              </div>
            </div>
          )}

          {/* LISTA COMPLETA DE BANCOS */}
          {extractedData.bankNames.length > 0 && (
            <div id="section-banks" className="mb-4 bg-[#0a0a0a] border border-yellow-500/30 rounded-lg p-4 scroll-mt-20">
              <h3 className="text-lg font-bold text-yellow-400 mb-3 flex items-center gap-2">
                <Building2 className="w-5 h-5" />
                🏛️ Instituciones Bancarias Identificadas ({extractedData.bankNames.length})
                <span className="ml-auto text-xs text-yellow-300 bg-yellow-500/20 px-2 py-1 rounded">
                  Scroll para ver todas →
                </span>
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-2 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
                {extractedData.bankNames.map((bank, i) => (
                  <div key={i} className="bg-[#000] border border-yellow-500/20 rounded p-2 hover:border-yellow-400/50 transition-colors">
                    <div className="text-sm text-yellow-300 font-semibold">• {bank}</div>
                    <div className="text-xs text-[#4d7c4d]">Institución #{i + 1}</div>
                  </div>
                ))}
              </div>
              <div className="mt-2 text-xs text-[#4d7c4d] text-center">
                {extractedData.bankNames.length} instituciones identificadas • Scroll para ver todas
              </div>
            </div>
          )}

          {/* LISTA COMPLETA DE MONTOS */}
          {extractedData.amounts.length > 0 && (
            <div id="section-amounts" className="mb-4 bg-[#0a0a0a] border border-cyan-500/30 rounded-lg p-4 scroll-mt-20">
              <h3 className="text-lg font-bold text-cyan-400 mb-3 flex items-center gap-2">
                <DollarSign className="w-5 h-5" />
                💰 Montos Detectados ({extractedData.amounts.length})
                <span className="ml-auto text-xs text-cyan-300 bg-cyan-500/20 px-2 py-1 rounded">
                  Scroll para ver todos ({extractedData.amounts.length} montos) →
                </span>
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-2 max-h-[700px] overflow-y-auto pr-2 custom-scrollbar">
                {extractedData.amounts.map((amt, i) => (
                  <div key={i} className="bg-[#000] border border-cyan-500/20 rounded p-2 hover:border-cyan-400/50 transition-colors">
                    <div className="text-lg text-cyan-300 font-mono font-bold">{amt.currency} {amt.value.toLocaleString()}</div>
                    <div className="text-xs text-[#4d7c4d]">Offset: {amt.offset} | Monto #{i + 1}</div>
                  </div>
                ))}
              </div>
              <div className="mt-2 text-xs text-[#4d7c4d] text-center">
                {extractedData.amounts.length} montos detectados • Scroll para ver todos
              </div>
            </div>
          )}

          {/* Metadatos */}
          <div className="mt-6 bg-[#0a0a0a] border border-[#1a1a1a] rounded-lg p-4">
            <h3 className="text-sm font-semibold text-[#00ff88] mb-3">📊 Metadatos</h3>
            <div className="grid grid-cols-3 md:grid-cols-6 gap-4 text-sm">
              <div><div className="text-[#4d7c4d]">Tamaño</div><div className="text-[#80ff80] font-mono">{(extractedData.metadata.fileSize / 1024).toFixed(2)} KB</div></div>
              <div><div className="text-[#4d7c4d]">Bloques</div><div className="text-[#80ff80] font-mono">{extractedData.metadata.blocksDetected}</div></div>
              <div><div className="text-[#4d7c4d]">Cuentas</div><div className="text-[#80ff80] font-mono">{extractedData.metadata.totalAccounts}</div></div>
              <div><div className="text-[#4d7c4d]">Bancos</div><div className="text-[#80ff80] font-mono">{extractedData.metadata.totalBanks}</div></div>
              <div><div className="text-[#4d7c4d]">Divisas</div><div className="text-[#80ff80] font-mono">{extractedData.metadata.totalCurrencies}</div></div>
              <div>
                <div className="text-[#4d7c4d]">Entropía</div>
                <div className={`font-mono ${extractedData.metadata.hasEncryption ? 'text-red-400' : 'text-green-400'}`}>
                  {extractedData.metadata.entropyLevel.toFixed(2)}
                </div>
              </div>
            </div>
          </div>

          {/* Datos RAW */}
          <div className="mt-4 bg-[#0a0a0a] border border-[#1a1a1a] rounded-lg p-4">
            <h3 className="text-sm font-semibold text-[#00ff88] mb-3">🔬 Análisis Forense</h3>
            <div className="space-y-3">
              <div>
                <div className="text-xs text-[#4d7c4d] mb-1">Firma Binaria (16 bytes):</div>
                <div className="bg-[#000] border border-[#1a1a1a] rounded p-2">
                  <code className="text-xs text-cyan-400 font-mono">{extractedData.rawData.binarySignature}</code>
                </div>
              </div>
              <div>
                <div className="text-xs text-[#4d7c4d] mb-1">Muestra de Texto (500 caracteres):</div>
                <div className="bg-[#000] border border-[#1a1a1a] rounded p-2 max-h-32 overflow-y-auto">
                  <code className="text-xs text-green-400 font-mono whitespace-pre-wrap">{extractedData.rawData.textSample}</code>
                </div>
              </div>
            </div>
          </div>

          {/* === INGENIERÍA INVERSA AVANZADA === */}
          {extractedData.reverseEngineering && (
            <div id="section-reverse" className="mt-4 bg-gradient-to-br from-[#0d0d0d] to-[#1a0a0a] border-2 border-[#00ff88]/30 rounded-xl p-6 shadow-[0_0_20px_rgba(0,255,136,0.2)] scroll-mt-20">
              <h3 className="text-xl font-bold text-[#00ff88] mb-4 flex items-center gap-2">
                🧬 Ingeniería Inversa - Análisis Profundo
                <span className={`ml-auto px-3 py-1 rounded-full text-xs font-bold ${
                  extractedData.reverseEngineering.confidence >= 80 ? 'bg-green-500/20 text-green-400' :
                  extractedData.reverseEngineering.confidence >= 60 ? 'bg-yellow-500/20 text-yellow-400' :
                  'bg-red-500/20 text-red-400'
                }`}>
                  Confianza: {extractedData.reverseEngineering.confidence}%
                </span>
              </h3>

              {/* Firmas del Archivo */}
              {extractedData.reverseEngineering.fileSignatures && extractedData.reverseEngineering.fileSignatures.length > 0 && (
                <div className="mb-4 bg-[#0a0a0a] border border-[#00ff88]/20 rounded-lg p-4">
                  <div className="text-sm font-semibold text-cyan-400 mb-2">🔐 Firmas Detectadas:</div>
                  <div className="flex flex-wrap gap-2">
                    {extractedData.reverseEngineering.fileSignatures.map((sig: string, i: number) => (
                      <span key={i} className="px-3 py-1 bg-cyan-500/20 border border-cyan-500/40 rounded text-xs text-cyan-300 font-mono">
                        {sig}
                      </span>
                    ))}
                  </div>
                  <div className="mt-2 text-xs text-[#4d7c4d]">
                    Header Bytes: {extractedData.reverseEngineering.headerBytes?.slice(0, 8).map((b: number) => 
                      '0x' + b.toString(16).padStart(2, '0').toUpperCase()
                    ).join(' ')}
                  </div>
                </div>
              )}

              {/* Campos Estructurados Decompilados */}
              {extractedData.reverseEngineering.structuredFieldsCount > 0 && (
                <div className="mb-4 bg-[#0a0a0a] border border-[#00ff88]/20 rounded-lg p-4">
                  <div className="text-sm font-semibold text-purple-400 mb-2">
                    📊 Campos Binarios Decompilados: {extractedData.reverseEngineering.structuredFieldsCount}
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
                    {extractedData.reverseEngineering.structuredFieldsSample?.map((field: any, i: number) => (
                      <div key={i} className="bg-[#000] border border-[#1a1a1a] rounded p-2">
                        <div className="flex justify-between text-xs">
                          <span className="text-[#4d7c4d]">Offset: {field.offset}</span>
                          <span className="text-purple-400 font-mono">{field.type}</span>
                        </div>
                        <div className="text-sm text-[#00ff88] font-mono font-bold mt-1">
                          {typeof field.value === 'number' ? field.value.toLocaleString() : field.value}
                        </div>
                        <div className="text-xs text-[#4d7c4d] mt-1">{field.interpretation}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Patrones Hexadecimales */}
              {(extractedData.reverseEngineering.hexPatterns?.sha256Count > 0 || 
                extractedData.reverseEngineering.hexPatterns?.md5Count > 0) && (
                <div className="mb-4 bg-[#0a0a0a] border border-[#00ff88]/20 rounded-lg p-4">
                  <div className="text-sm font-semibold text-orange-400 mb-2">🔑 Hashes y Claves Detectadas:</div>
                  <div className="space-y-2">
                    {extractedData.reverseEngineering.hexPatterns.sha256Count > 0 && (
                      <div>
                        <div className="text-xs text-[#4d7c4d] mb-1">
                          SHA-256 ({extractedData.reverseEngineering.hexPatterns.sha256Count}):
                        </div>
                        {extractedData.reverseEngineering.hexPatterns.sha256Samples?.map((hash: string, i: number) => (
                          <div key={i} className="bg-[#000] border border-[#1a1a1a] rounded p-1 mb-1">
                            <code className="text-xs text-orange-400 font-mono break-all">{hash.substring(0, 40)}...</code>
                          </div>
                        ))}
                      </div>
                    )}
                    {extractedData.reverseEngineering.hexPatterns.md5Count > 0 && (
                      <div>
                        <div className="text-xs text-[#4d7c4d] mb-1">
                          MD5 ({extractedData.reverseEngineering.hexPatterns.md5Count}):
                        </div>
                        {extractedData.reverseEngineering.hexPatterns.md5Samples?.map((hash: string, i: number) => (
                          <div key={i} className="bg-[#000] border border-[#1a1a1a] rounded p-1 mb-1">
                            <code className="text-xs text-yellow-400 font-mono break-all">{hash}</code>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Estructuras de Datos */}
              {(extractedData.reverseEngineering.dataStructures?.jsonLikeCount > 0 || 
                extractedData.reverseEngineering.dataStructures?.xmlTagsCount > 0 ||
                extractedData.reverseEngineering.dataStructures?.keyValuePairsCount > 0) && (
                <div className="bg-[#0a0a0a] border border-[#00ff88]/20 rounded-lg p-4">
                  <div className="text-sm font-semibold text-blue-400 mb-2">🧩 Estructuras de Datos Detectadas:</div>
                  <div className="grid grid-cols-3 gap-4 mb-3">
                    {extractedData.reverseEngineering.dataStructures.jsonLikeCount > 0 && (
                      <div className="text-center">
                        <div className="text-2xl font-bold text-blue-400">
                          {extractedData.reverseEngineering.dataStructures.jsonLikeCount}
                        </div>
                        <div className="text-xs text-[#4d7c4d]">JSON-like</div>
                      </div>
                    )}
                    {extractedData.reverseEngineering.dataStructures.xmlTagsCount > 0 && (
                      <div className="text-center">
                        <div className="text-2xl font-bold text-green-400">
                          {extractedData.reverseEngineering.dataStructures.xmlTagsCount}
                        </div>
                        <div className="text-xs text-[#4d7c4d]">XML Tags</div>
                      </div>
                    )}
                    {extractedData.reverseEngineering.dataStructures.keyValuePairsCount > 0 && (
                      <div className="text-center">
                        <div className="text-2xl font-bold text-purple-400">
                          {extractedData.reverseEngineering.dataStructures.keyValuePairsCount}
                        </div>
                        <div className="text-xs text-[#4d7c4d]">Key-Value Pairs</div>
                      </div>
                    )}
                  </div>
                  <div className="max-h-[400px] overflow-y-auto space-y-1 pr-2 custom-scrollbar">
                    {extractedData.reverseEngineering.dataStructures.kvSamples?.map((kv: string, i: number) => (
                      <div key={i} className="bg-[#000] border border-[#1a1a1a] rounded p-1">
                        <code className="text-xs text-[#80ff80] font-mono">{kv}</code>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Banner de procesamiento automático */}
      {results && autoProcessed && (
        <div className="bg-gradient-to-r from-cyan-500/20 to-green-500/20 border-2 border-cyan-500/50 rounded-xl p-4 shadow-[0_0_30px_rgba(0,255,255,0.3)]">
          <div className="flex items-center gap-3">
            <div className="w-3 h-3 bg-cyan-400 rounded-full animate-pulse"></div>
            <div>
              <h3 className="text-lg font-bold text-cyan-400">
                ⚡ Datos Procesados Automáticamente desde el Analizador de Archivos Grandes
              </h3>
              <p className="text-sm text-cyan-300/80 mt-1">
                Los datos fueron extraídos, desencriptados y clasificados automáticamente. Sincronización en tiempo real activa.
              </p>
            </div>
            <CheckCircle className="w-8 h-8 text-green-400 ml-auto" />
          </div>
        </div>
      )}

      {/* Resultados */}
      {results && (
        <>
          {/* Clasificación M0-M4 */}
          <div id="section-m0m4" className="bg-[#0d0d0d] border border-[#1a1a1a] rounded-xl p-6 scroll-mt-20">
            <h2 className="text-xl font-semibold text-[#00ff88] mb-6 flex items-center gap-2">
              <TrendingUp className="w-5 h-5" />
              {t.auditMonetaryClassification}
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
              {(['M0', 'M1', 'M2', 'M3', 'M4'] as const).map((classification) => {
                const totalUsdForClass = results.agregados.reduce((sum, a) => {
                  if (a[classification] > 0) {
                    return sum + a[classification] * (EXCHANGE_RATES[a.currency] || 1);
                  }
                  return sum;
                }, 0);
                
                const colors = {
                  M0: { bg: 'bg-purple-500/20 border-purple-500/40', text: 'text-purple-400' },
                  M1: { bg: 'bg-blue-500/20 border-blue-500/40', text: 'text-blue-400' },
                  M2: { bg: 'bg-green-500/20 border-green-500/40', text: 'text-green-400' },
                  M3: { bg: 'bg-yellow-500/20 border-yellow-500/40', text: 'text-yellow-400' },
                  M4: { bg: 'bg-red-500/20 border-red-500/40', text: 'text-red-400' },
                };

                const descriptions = {
                  M0: t.auditM0Description,
                  M1: t.auditM1Description,
                  M2: t.auditM2Description,
                  M3: t.auditM3Description,
                  M4: t.auditM4Description,
                };

                return (
                  <div key={classification} className={`p-4 rounded-lg border ${colors[classification].bg}`}>
                    <div className={`text-sm font-bold mb-1 ${colors[classification].text}`}>
                      {classification}
                    </div>
                    <div className="text-xs text-[#4d7c4d] mb-2">{descriptions[classification]}</div>
                    <div className={`text-lg font-mono font-bold ${colors[classification].text}`}>
                      ${totalUsdForClass.toLocaleString()}
                    </div>
                    <div className="text-xs text-[#4d7c4d] mt-1">
                      {results.agregados.filter(a => a[classification] > 0).length} divisas
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Totales por Divisa */}
          <div className="bg-[#0d0d0d] border border-[#1a1a1a] rounded-xl p-6">
            <h2 className="text-xl font-semibold text-[#00ff88] mb-6 flex items-center gap-2">
              <DollarSign className="w-5 h-5" />
              Totales por Divisa
            </h2>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-[#1a1a1a]">
                    <th className="text-left py-3 px-4 text-[#4d7c4d]">Divisa</th>
                    <th className="text-right py-3 px-4 text-cyan-400">Total</th>
                    <th className="text-right py-3 px-4 text-purple-400">M0</th>
                    <th className="text-right py-3 px-4 text-blue-400">M1</th>
                    <th className="text-right py-3 px-4 text-green-400">M2</th>
                    <th className="text-right py-3 px-4 text-yellow-400">M3</th>
                    <th className="text-right py-3 px-4 text-red-400">M4</th>
                    <th className="text-right py-3 px-4 text-[#00ff88]">USD Equiv.</th>
                  </tr>
                </thead>
                <tbody>
                  {results.agregados.map(a => {
                    const total = a.M0 + a.M1 + a.M2 + a.M3 + a.M4;
                    const activeClass = a.M0 > 0 ? 'M0' : a.M1 > 0 ? 'M1' : a.M2 > 0 ? 'M2' : a.M3 > 0 ? 'M3' : a.M4 > 0 ? 'M4' : '';
                    return (
                      <tr key={a.currency} className="border-b border-[#1a1a1a] hover:bg-[#141414]">
                        <td className="py-3 px-4 text-[#80ff80] font-bold">{a.currency}</td>
                        <td className="py-3 px-4 text-right font-mono text-cyan-400 font-bold">
                          {total.toLocaleString()}
                        </td>
                        <td className={`py-3 px-4 text-right font-mono text-sm ${activeClass === 'M0' ? 'text-purple-400 font-bold' : 'text-[#4d7c4d]'}`}>
                          {a.M0 > 0 ? a.M0.toLocaleString() : '-'}
                        </td>
                        <td className={`py-3 px-4 text-right font-mono text-sm ${activeClass === 'M1' ? 'text-blue-400 font-bold' : 'text-[#4d7c4d]'}`}>
                          {a.M1 > 0 ? a.M1.toLocaleString() : '-'}
                        </td>
                        <td className={`py-3 px-4 text-right font-mono text-sm ${activeClass === 'M2' ? 'text-green-400 font-bold' : 'text-[#4d7c4d]'}`}>
                          {a.M2 > 0 ? a.M2.toLocaleString() : '-'}
                        </td>
                        <td className={`py-3 px-4 text-right font-mono text-sm ${activeClass === 'M3' ? 'text-yellow-400 font-bold' : 'text-[#4d7c4d]'}`}>
                          {a.M3 > 0 ? a.M3.toLocaleString() : '-'}
                        </td>
                        <td className={`py-3 px-4 text-right font-mono text-sm ${activeClass === 'M4' ? 'text-red-400 font-bold' : 'text-[#4d7c4d]'}`}>
                          {a.M4 > 0 ? a.M4.toLocaleString() : '-'}
                        </td>
                        <td className="py-3 px-4 text-right text-[#00ff88] font-mono font-bold">${a.equiv_usd.toLocaleString()}</td>
                      </tr>
                    );
                  })}
                  <tr className="bg-[#141414] font-bold border-t-2 border-[#00ff88]/30">
                    <td className="py-3 px-4 text-[#00ff88] text-lg">TOTAL USD</td>
                    <td className="py-3 px-4 text-right text-cyan-400 font-mono text-lg">-</td>
                    <td className="py-3 px-4 text-right text-purple-400 font-mono">${results.agregados.reduce((sum, a) => sum + a.M0 * (EXCHANGE_RATES[a.currency] || 1), 0).toLocaleString()}</td>
                    <td className="py-3 px-4 text-right text-blue-400 font-mono">${results.agregados.reduce((sum, a) => sum + a.M1 * (EXCHANGE_RATES[a.currency] || 1), 0).toLocaleString()}</td>
                    <td className="py-3 px-4 text-right text-green-400 font-mono">${results.agregados.reduce((sum, a) => sum + a.M2 * (EXCHANGE_RATES[a.currency] || 1), 0).toLocaleString()}</td>
                    <td className="py-3 px-4 text-right text-yellow-400 font-mono">${results.agregados.reduce((sum, a) => sum + a.M3 * (EXCHANGE_RATES[a.currency] || 1), 0).toLocaleString()}</td>
                    <td className="py-3 px-4 text-right text-red-400 font-mono">${results.agregados.reduce((sum, a) => sum + a.M4 * (EXCHANGE_RATES[a.currency] || 1), 0).toLocaleString()}</td>
                    <td className="py-3 px-4 text-right text-[#00ff88] font-mono text-lg">${totalUsd.toLocaleString()}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Hallazgos */}
          <div className="bg-[#0d0d0d] border border-[#1a1a1a] rounded-xl p-6">
            <h2 className="text-xl font-semibold text-[#00ff88] mb-6 flex items-center justify-between">
              <span>{t.auditDetailedFindings} ({results.hallazgos.length})</span>
              {showFullData && (
                <span className="text-xs text-green-400 bg-green-500/20 px-3 py-1 rounded">
                  👁️ Vista Completa Activa - Todos los datos visibles
                </span>
              )}
            </h2>
            <div className="space-y-3 max-h-[1200px] overflow-y-auto pr-2 custom-scrollbar">
              {results.hallazgos.map(h => {
                const classColors = {
                  M0: { bg: 'bg-purple-500/20 border-purple-500/40', text: 'text-purple-400' },
                  M1: { bg: 'bg-blue-500/20 border-blue-500/40', text: 'text-blue-400' },
                  M2: { bg: 'bg-green-500/20 border-green-500/40', text: 'text-green-400' },
                  M3: { bg: 'bg-yellow-500/20 border-yellow-500/40', text: 'text-yellow-400' },
                  M4: { bg: 'bg-red-500/20 border-red-500/40', text: 'text-red-400' },
                };
                const color = classColors[h.classification];

                return (
                  <div key={h.id_registro} className="bg-[#0a0a0a] border border-[#1a1a1a] rounded-lg p-4 hover:border-[#00ff88]/30 transition-colors">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-[#00ff88] font-bold text-lg">{h.money.currency} {h.money.amount.toLocaleString()}</span>
                      <span className={`px-3 py-1 rounded-full text-xs font-bold border ${color.bg} ${color.text}`}>
                        {h.classification}
                      </span>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm mb-3">
                      {/* Banco */}
                      <div className="bg-[#000] border border-yellow-500/20 rounded p-2">
                        <span className="text-[#4d7c4d] text-xs">🏛️ Banco:</span> 
                        <div className="text-yellow-300 font-semibold mt-1">{h.banco_detectado}</div>
                    </div>
                      
                      {/* Cuenta */}
                      <div className="bg-[#000] border border-blue-500/20 rounded p-2">
                        <span className="text-[#4d7c4d] text-xs">💳 Cuenta:</span> 
                        <div className={`text-blue-300 font-mono mt-1 ${showFullData ? 'text-sm font-bold' : 'text-xs'} break-all`}>
                          {showFullData ? (h.numero_cuenta_full || h.numero_cuenta_mask) : h.numero_cuenta_mask}
                        </div>
                        {showFullData && h.numero_cuenta_full && (
                          <div className="text-xs text-green-400 mt-1">✓ Completa</div>
                        )}
                      </div>
                      
                      {/* IBAN si existe */}
                      {h.iban_full && (
                        <div className="bg-[#000] border border-purple-500/20 rounded p-2">
                          <span className="text-[#4d7c4d] text-xs">🌍 IBAN:</span>
                          <div className={`text-purple-300 font-mono mt-1 ${showFullData ? 'text-sm font-bold' : 'text-xs'} break-all`}>
                            {showFullData ? h.iban_full : `${h.iban_full.slice(0,4)}****${h.iban_full.slice(-4)}`}
                          </div>
                          {showFullData && (
                            <div className="text-xs text-green-400 mt-1">✓ Completo</div>
                          )}
                        </div>
                      )}
                      
                      {/* SWIFT si existe */}
                      {h.swift_code && (
                        <div className="bg-[#000] border border-green-500/20 rounded p-2">
                          <span className="text-[#4d7c4d] text-xs">📡 SWIFT/BIC:</span>
                          <div className="text-green-300 font-mono font-bold mt-1">{h.swift_code}</div>
                          <div className="text-xs text-[#4d7c4d] mt-1">País: {h.swift_code.slice(4, 6)}</div>
                        </div>
                      )}
                      
                      {/* Confianza */}
                      <div className="bg-[#000] border border-cyan-500/20 rounded p-2">
                        <span className="text-[#4d7c4d] text-xs">✓ Confianza:</span> 
                        <div className="mt-1">
                          <span className={`font-bold text-lg ${h.score_confianza >= 95 ? 'text-green-400' : h.score_confianza >= 90 ? 'text-yellow-400' : 'text-orange-400'}`}>
                            {h.score_confianza}%
                          </span>
                          <div className="text-xs text-[#4d7c4d] mt-1">
                            {h.score_confianza >= 95 ? 'Alta' : h.score_confianza >= 90 ? 'Media-Alta' : 'Media'}
                          </div>
                        </div>
                      </div>
                      
                      {/* USD Equivalente */}
                      <div className="bg-[#000] border border-cyan-500/20 rounded p-2">
                        <span className="text-[#4d7c4d] text-xs">💵 USD Equivalente:</span> 
                        <div className="text-cyan-300 font-bold text-lg mt-1">
                          ${(h.money.amount * (EXCHANGE_RATES[h.money.currency] || 1)).toLocaleString()}
                        </div>
                      </div>
                    </div>
                    <div className="mt-3 bg-[#000] border border-[#1a1a1a] rounded p-3">
                      <div className="text-xs text-[#4d7c4d] mb-2 font-semibold">📋 Evidencia Completa:</div>
                      <div className={`${showFullData ? 'text-xs' : 'text-xs'} text-[#80ff80] whitespace-pre-wrap break-all`}>
                        {h.evidencia_fragmento}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="mt-4 text-center text-sm text-[#4d7c4d]">
              Total: {results.hallazgos.length} {t.auditFindings.toLowerCase()} • {t.auditScrollToSeeAll}
            </div>
          </div>
        </>
      )}

      {!results && !extractedData && (
        <div className="bg-[#0d0d0d] border border-[#1a1a1a] rounded-xl p-12 text-center">
          <FileSearch className="w-16 h-16 text-[#4d7c4d] mx-auto mb-4" />
          <h3 className="text-xl text-[#4d7c4d] mb-2">No hay datos de auditoría</h3>
          <p className="text-[#4d7c4d] text-sm">Carga un archivo Digital Commercial Bank Ltd para comenzar</p>
        </div>
      )}

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="*"
        onChange={handleFileLoad}
        className="hidden"
        aria-label="Cargar archivo Digital Commercial Bank Ltd para auditoría"
      />

      {/* Modal de Informe Completo (estilo Black Screen) */}
      {showReport && results && (
        <AuditBankReport
          results={results}
          extractedData={extractedData}
          systemBalances={systemBalances}
          progress={loadingProgress}
          onClose={() => setShowReport(false)}
        />
      )}
    </div>
  );
}
