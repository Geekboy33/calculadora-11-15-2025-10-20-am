// ═══════════════════════════════════════════════════════════════════════════════
// LEMONMINTED SECURITY SERVICE - ENTERPRISE GRADE ENCRYPTION & PROTECTION
// Anti-Hacker Protection Layer with AES-256-GCM Encryption
// ═══════════════════════════════════════════════════════════════════════════════

// Environment detection
const isProduction = !import.meta.env.DEV && 
  !['localhost', '127.0.0.1'].includes(window?.location?.hostname || '');

// ═══════════════════════════════════════════════════════════════════════════════
// SECURE LOGGER - Prevents sensitive data exposure in production
// ═══════════════════════════════════════════════════════════════════════════════

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  data?: Record<string, unknown>;
}

// Patterns to detect and redact sensitive data
const SENSITIVE_PATTERNS = [
  /\b(password|passwd|pwd)\s*[=:]\s*["']?[^"'\s]+["']?/gi,
  /\b(secret|api[_-]?key|apikey|token|bearer)\s*[=:]\s*["']?[^"'\s]+["']?/gi,
  /\b(private[_-]?key|privatekey)\s*[=:]\s*["']?[^"'\s]+["']?/gi,
  /\b[0-9a-fA-F]{64}\b/g, // Private keys (64 hex chars)
  /\b0x[0-9a-fA-F]{40}\b/g, // Ethereum addresses (redact partially)
  /\b(Authorization|Bearer)\s*:?\s*[^\s]+/gi,
  /eyJ[a-zA-Z0-9_-]*\.eyJ[a-zA-Z0-9_-]*\.[a-zA-Z0-9_-]*/g, // JWT tokens
  /\b[A-Za-z0-9+/]{40,}={0,2}\b/g, // Base64 encoded secrets
];

// Redact sensitive data from strings
const redactSensitiveData = (input: unknown): unknown => {
  if (typeof input === 'string') {
    let redacted = input;
    SENSITIVE_PATTERNS.forEach(pattern => {
      redacted = redacted.replace(pattern, (match) => {
        if (match.length > 12) {
          return match.substring(0, 6) + '***REDACTED***' + match.substring(match.length - 4);
        }
        return '***REDACTED***';
      });
    });
    return redacted;
  }
  
  if (Array.isArray(input)) {
    return input.map(redactSensitiveData);
  }
  
  if (input && typeof input === 'object') {
    const redactedObj: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(input)) {
      // Redact entire value for sensitive keys
      const lowerKey = key.toLowerCase();
      if (['password', 'secret', 'token', 'apikey', 'api_key', 'privatekey', 'private_key', 'authorization', 'bearer'].some(s => lowerKey.includes(s))) {
        redactedObj[key] = '***REDACTED***';
      } else {
        redactedObj[key] = redactSensitiveData(value);
      }
    }
    return redactedObj;
  }
  
  return input;
};

// Secure logging function
class SecureLogger {
  private logs: LogEntry[] = [];
  private maxLogs = 1000;
  private enabled: boolean;

  constructor() {
    this.enabled = !isProduction || import.meta.env.VITE_DEBUG === 'true';
  }

  private createEntry(level: LogLevel, message: string, data?: Record<string, unknown>): LogEntry {
    return {
      timestamp: new Date().toISOString(),
      level,
      message: String(redactSensitiveData(message)),
      data: data ? redactSensitiveData(data) as Record<string, unknown> : undefined
    };
  }

  private addLog(entry: LogEntry) {
    this.logs.push(entry);
    if (this.logs.length > this.maxLogs) {
      this.logs.shift();
    }
  }

  debug(message: string, data?: Record<string, unknown>) {
    if (!this.enabled) return;
    const entry = this.createEntry('debug', message, data);
    this.addLog(entry);
    if (!isProduction) {
      console.debug(`🔍 [DEBUG] ${entry.message}`, entry.data || '');
    }
  }

  info(message: string, data?: Record<string, unknown>) {
    if (!this.enabled) return;
    const entry = this.createEntry('info', message, data);
    this.addLog(entry);
    if (!isProduction) {
      console.info(`ℹ️ [INFO] ${entry.message}`, entry.data || '');
    }
  }

  warn(message: string, data?: Record<string, unknown>) {
    const entry = this.createEntry('warn', message, data);
    this.addLog(entry);
    if (!isProduction) {
      console.warn(`⚠️ [WARN] ${entry.message}`, entry.data || '');
    }
  }

  error(message: string, data?: Record<string, unknown>) {
    const entry = this.createEntry('error', message, data);
    this.addLog(entry);
    // Always log errors, but redacted in production
    console.error(`❌ [ERROR] ${entry.message}`, entry.data || '');
  }

  getLogs(): LogEntry[] {
    return [...this.logs];
  }

  clearLogs() {
    this.logs = [];
  }
}

export const secureLog = new SecureLogger();

// ═══════════════════════════════════════════════════════════════════════════════
// AES-256-GCM ENCRYPTION SERVICE
// ═══════════════════════════════════════════════════════════════════════════════

class EncryptionService {
  private encoder = new TextEncoder();
  private decoder = new TextDecoder();
  private keyCache: Map<string, CryptoKey> = new Map();

  // Derive key from password using PBKDF2
  private async deriveKey(password: string, salt: Uint8Array): Promise<CryptoKey> {
    const cacheKey = password + Array.from(salt).join(',');
    
    if (this.keyCache.has(cacheKey)) {
      return this.keyCache.get(cacheKey)!;
    }

    const keyMaterial = await crypto.subtle.importKey(
      'raw',
      this.encoder.encode(password),
      'PBKDF2',
      false,
      ['deriveBits', 'deriveKey']
    );

    const key = await crypto.subtle.deriveKey(
      {
        name: 'PBKDF2',
        salt,
        iterations: 310000, // OWASP recommended minimum
        hash: 'SHA-256'
      },
      keyMaterial,
      { name: 'AES-GCM', length: 256 },
      false,
      ['encrypt', 'decrypt']
    );

    this.keyCache.set(cacheKey, key);
    return key;
  }

  // Generate cryptographically secure random bytes
  private generateRandomBytes(length: number): Uint8Array {
    return crypto.getRandomValues(new Uint8Array(length));
  }

  // Encrypt data using AES-256-GCM
  async encrypt(data: string, masterKey?: string): Promise<string> {
    try {
      const key = masterKey || this.getMasterKey();
      const salt = this.generateRandomBytes(16);
      const iv = this.generateRandomBytes(12); // 96-bit IV for GCM
      const derivedKey = await this.deriveKey(key, salt);

      const encrypted = await crypto.subtle.encrypt(
        { name: 'AES-GCM', iv },
        derivedKey,
        this.encoder.encode(data)
      );

      // Combine salt + iv + ciphertext
      const combined = new Uint8Array(salt.length + iv.length + encrypted.byteLength);
      combined.set(salt, 0);
      combined.set(iv, salt.length);
      combined.set(new Uint8Array(encrypted), salt.length + iv.length);

      // Return as base64
      return btoa(String.fromCharCode(...combined));
    } catch (error) {
      secureLog.error('Encryption failed', { error: String(error) });
      throw new Error('Encryption failed');
    }
  }

  // Decrypt data using AES-256-GCM
  async decrypt(encryptedData: string, masterKey?: string): Promise<string> {
    try {
      const key = masterKey || this.getMasterKey();
      
      // Decode from base64
      const combined = new Uint8Array(
        atob(encryptedData).split('').map(c => c.charCodeAt(0))
      );

      // Extract salt, iv, and ciphertext
      const salt = combined.slice(0, 16);
      const iv = combined.slice(16, 28);
      const ciphertext = combined.slice(28);

      const derivedKey = await this.deriveKey(key, salt);

      const decrypted = await crypto.subtle.decrypt(
        { name: 'AES-GCM', iv },
        derivedKey,
        ciphertext
      );

      return this.decoder.decode(decrypted);
    } catch (error) {
      secureLog.error('Decryption failed', { error: String(error) });
      throw new Error('Decryption failed - data may be corrupted or key is invalid');
    }
  }

  // Get master encryption key from environment
  private getMasterKey(): string {
    const key = import.meta.env.VITE_ENCRYPTION_KEY;
    if (!key) {
      if (isProduction) {
        throw new Error('CRITICAL: VITE_ENCRYPTION_KEY must be set in production!');
      }
      // Development fallback (NOT secure for production)
      return 'DEV_ONLY_ENCRYPTION_KEY_' + window.location.hostname;
    }
    return key;
  }

  // Hash data using SHA-256
  async hash(data: string): Promise<string> {
    const hashBuffer = await crypto.subtle.digest(
      'SHA-256',
      this.encoder.encode(data)
    );
    return Array.from(new Uint8Array(hashBuffer))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
  }

  // Generate secure random token
  generateSecureToken(length: number = 32): string {
    const bytes = this.generateRandomBytes(length);
    return Array.from(bytes)
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
  }

  // HMAC signature for webhooks
  async createHMAC(data: string, secret?: string): Promise<string> {
    const key = secret || import.meta.env.VITE_HMAC_SECRET;
    if (!key) {
      throw new Error('HMAC secret not configured');
    }

    const cryptoKey = await crypto.subtle.importKey(
      'raw',
      this.encoder.encode(key),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    );

    const signature = await crypto.subtle.sign(
      'HMAC',
      cryptoKey,
      this.encoder.encode(data)
    );

    return Array.from(new Uint8Array(signature))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
  }

  // Verify HMAC signature
  async verifyHMAC(data: string, signature: string, secret?: string): Promise<boolean> {
    try {
      const expectedSignature = await this.createHMAC(data, secret);
      // Constant-time comparison to prevent timing attacks
      if (signature.length !== expectedSignature.length) {
        return false;
      }
      let result = 0;
      for (let i = 0; i < signature.length; i++) {
        result |= signature.charCodeAt(i) ^ expectedSignature.charCodeAt(i);
      }
      return result === 0;
    } catch {
      return false;
    }
  }
}

export const encryption = new EncryptionService();

// ═══════════════════════════════════════════════════════════════════════════════
// SECURE STORAGE - Encrypted localStorage wrapper
// ═══════════════════════════════════════════════════════════════════════════════

class SecureStorage {
  private prefix = 'lm_secure_';

  async setItem(key: string, value: unknown): Promise<void> {
    try {
      const serialized = JSON.stringify(value);
      const encrypted = await encryption.encrypt(serialized);
      localStorage.setItem(this.prefix + key, encrypted);
    } catch (error) {
      secureLog.error('SecureStorage setItem failed', { key, error: String(error) });
      throw error;
    }
  }

  async getItem<T>(key: string): Promise<T | null> {
    try {
      const encrypted = localStorage.getItem(this.prefix + key);
      if (!encrypted) return null;
      
      const decrypted = await encryption.decrypt(encrypted);
      return JSON.parse(decrypted) as T;
    } catch (error) {
      secureLog.warn('SecureStorage getItem failed, removing corrupted data', { key });
      localStorage.removeItem(this.prefix + key);
      return null;
    }
  }

  removeItem(key: string): void {
    localStorage.removeItem(this.prefix + key);
  }

  clear(): void {
    const keysToRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith(this.prefix)) {
        keysToRemove.push(key);
      }
    }
    keysToRemove.forEach(key => localStorage.removeItem(key));
  }
}

export const secureStorage = new SecureStorage();

// ═══════════════════════════════════════════════════════════════════════════════
// ANTI-TAMPERING & SECURITY CHECKS
// ═══════════════════════════════════════════════════════════════════════════════

class SecurityGuard {
  private integrityChecks: Map<string, string> = new Map();

  // Check for dev tools open (basic detection)
  isDevToolsOpen(): boolean {
    const threshold = 160;
    const widthThreshold = window.outerWidth - window.innerWidth > threshold;
    const heightThreshold = window.outerHeight - window.innerHeight > threshold;
    
    // Also check for debugger
    const start = performance.now();
    // eslint-disable-next-line no-debugger
    debugger;
    const end = performance.now();
    
    return widthThreshold || heightThreshold || (end - start > 100);
  }

  // Validate request origin
  isValidOrigin(origin: string): boolean {
    const allowedOrigins = [
      window.location.origin,
      'https://luxliqdaes.cloud',
      'https://api.luxliqdaes.cloud',
      'https://lemonchain.io'
    ];
    return allowedOrigins.includes(origin);
  }

  // Generate integrity hash for data
  async generateIntegrity(key: string, data: unknown): Promise<string> {
    const hash = await encryption.hash(JSON.stringify(data) + key);
    this.integrityChecks.set(key, hash);
    return hash;
  }

  // Verify data integrity
  async verifyIntegrity(key: string, data: unknown): Promise<boolean> {
    const storedHash = this.integrityChecks.get(key);
    if (!storedHash) return false;
    
    const currentHash = await encryption.hash(JSON.stringify(data) + key);
    return storedHash === currentHash;
  }

  // Sanitize user input
  sanitizeInput(input: string): string {
    return input
      .replace(/[<>]/g, '') // Remove potential HTML tags
      .replace(/javascript:/gi, '') // Remove javascript: protocol
      .replace(/on\w+=/gi, '') // Remove event handlers
      .replace(/data:/gi, '') // Remove data: protocol
      .trim();
  }

  // Validate Ethereum address
  isValidAddress(address: string): boolean {
    return /^0x[0-9a-fA-F]{40}$/.test(address);
  }

  // Validate transaction hash
  isValidTxHash(hash: string): boolean {
    return /^0x[0-9a-fA-F]{64}$/.test(hash);
  }

  // Rate limiting check
  private rateLimits: Map<string, { count: number; resetTime: number }> = new Map();
  
  checkRateLimit(key: string, maxRequests: number, windowMs: number): boolean {
    const now = Date.now();
    const limit = this.rateLimits.get(key);
    
    if (!limit || now > limit.resetTime) {
      this.rateLimits.set(key, { count: 1, resetTime: now + windowMs });
      return true;
    }
    
    if (limit.count >= maxRequests) {
      return false;
    }
    
    limit.count++;
    return true;
  }
}

export const securityGuard = new SecurityGuard();

// ═══════════════════════════════════════════════════════════════════════════════
// EXPORT SECURITY MODULE
// ═══════════════════════════════════════════════════════════════════════════════

export const SecurityService = {
  encryption,
  secureStorage,
  secureLog,
  securityGuard,
  isProduction,
  
  // Quick access methods
  encrypt: (data: string) => encryption.encrypt(data),
  decrypt: (data: string) => encryption.decrypt(data),
  hash: (data: string) => encryption.hash(data),
  generateToken: (length?: number) => encryption.generateSecureToken(length),
  log: secureLog,
  
  // Initialize security on app start
  async initialize(): Promise<void> {
    secureLog.info('Security Service initialized', {
      environment: isProduction ? 'production' : 'development',
      encryptionKeySet: !!import.meta.env.VITE_ENCRYPTION_KEY,
      hmacSecretSet: !!import.meta.env.VITE_HMAC_SECRET
    });
    
    if (isProduction) {
      // Disable console in production
      if (!import.meta.env.VITE_DEBUG) {
        console.log = () => {};
        console.debug = () => {};
        console.info = () => {};
        // Keep warn and error for critical issues
      }
      
      // Warn if security keys are not set
      if (!import.meta.env.VITE_ENCRYPTION_KEY) {
        console.error('🔴 SECURITY WARNING: VITE_ENCRYPTION_KEY not set in production!');
      }
      if (!import.meta.env.VITE_HMAC_SECRET) {
        console.error('🔴 SECURITY WARNING: VITE_HMAC_SECRET not set in production!');
      }
    }
  }
};

export default SecurityService;
