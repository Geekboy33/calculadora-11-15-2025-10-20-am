// ═══════════════════════════════════════════════════════════════════════════════
// LEMONMINTED PLATFORM - SECURE API CONFIGURATION
// All sensitive data loaded from environment variables only
// ⚠️ SECURITY: Never hardcode secrets - always use .env
// ═══════════════════════════════════════════════════════════════════════════════

// Detect environment
const isDevelopment = import.meta.env.DEV || 
  window.location.hostname === 'localhost' || 
  window.location.hostname === '127.0.0.1';

const isProduction = !isDevelopment;

// ═══════════════════════════════════════════════════════════════════════════════
// SECURITY: Validate required environment variables in production
// ═══════════════════════════════════════════════════════════════════════════════
const validateProductionEnv = () => {
  if (!isProduction) return;
  
  const requiredVars = [
    'VITE_ENCRYPTION_KEY',
    'VITE_HMAC_SECRET',
    'VITE_ADMIN_ADDRESS',
    'VITE_ADMIN_PRIVATE_KEY'
  ];
  
  const missing = requiredVars.filter(v => !import.meta.env[v]);
  
  if (missing.length > 0) {
    console.error('🔴 CRITICAL: Missing required environment variables for production:', missing.join(', '));
  }
};

// Run validation on load
validateProductionEnv();

// Get base URL from environment or detect from window location
const getBaseUrl = () => {
  // Check for environment variables first
  if (import.meta.env.VITE_API_BASE_URL) {
    return import.meta.env.VITE_API_BASE_URL;
  }
  
  // In production, use same origin or configured domain
  if (isProduction) {
    const protocol = window.location.protocol;
    const host = window.location.hostname;
    
    // If deployed on luxliqdaes.cloud
    if (host.includes('luxliqdaes.cloud')) {
      return `${protocol}//api.luxliqdaes.cloud`;
    }
    
    // Default to same origin
    return `${protocol}//${host}`;
  }
  
  // Development defaults
  return 'http://localhost';
};

const BASE_URL = getBaseUrl();

// ═══════════════════════════════════════════════════════════════════════════════
// API ENDPOINTS CONFIGURATION
// ═══════════════════════════════════════════════════════════════════════════════

export const API_CONFIG = {
  // DCB Treasury API
  DCB_TREASURY_URL: import.meta.env.VITE_DCB_API_URL || 
    (isDevelopment ? 'http://localhost:4010' : `${BASE_URL}:4010`),
  
  // LEMX Minting Platform API
  LEMX_PLATFORM_URL: import.meta.env.VITE_LEMX_API_URL || 
    (isDevelopment ? 'http://localhost:4011' : `${BASE_URL}:4011`),
  
  // WebSocket URL
  WS_URL: import.meta.env.VITE_WS_URL || 
    (isDevelopment ? 'ws://localhost:4012' : `${BASE_URL.replace('http', 'ws')}:4012`),
  
  // API Version
  API_VERSION: 'v2',
  
  // Request timeout (ms)
  TIMEOUT: 30000,
  
  // Retry attempts
  RETRY_ATTEMPTS: 3,
  
  // Webhook secret - MUST be from environment in production
  get WEBHOOK_SECRET(): string {
    const secret = import.meta.env.VITE_WEBHOOK_SECRET;
    if (!secret && isProduction) {
      console.error('🔴 CRITICAL: VITE_WEBHOOK_SECRET must be set in production!');
      throw new Error('Webhook secret not configured for production.');
    }
    if (!secret && isDevelopment) {
      console.warn('⚠️ Using default webhook secret for development. Set VITE_WEBHOOK_SECRET for production.');
      return 'DEV_WEBHOOK_SECRET_' + Date.now().toString(36);
    }
    return secret || '';
  }
};

// ═══════════════════════════════════════════════════════════════════════════════
// LEMONCHAIN CONFIGURATION
// ═══════════════════════════════════════════════════════════════════════════════

export const LEMON_CHAIN = {
  chainId: 1006,
  name: 'LemonChain',
  rpc: import.meta.env.VITE_LEMON_RPC_URL || 'https://rpc.lemonchain.io',
  wss: import.meta.env.VITE_LEMON_WSS_URL || 'wss://ws.lemonchain.io',
  explorer: import.meta.env.VITE_LEMON_EXPLORER_URL || 'https://explorer.lemonchain.io',
  symbol: 'LEMX',
  lusdContract: import.meta.env.VITE_VUSD_CONTRACT || '0x0bF07709c94D32c9F000c51D4Ee0BCFfEeb1011b',
  lockBoxContract: import.meta.env.VITE_LOCKBOX_CONTRACT || '0x742d35Cc6634C0532925a3b844Bc9e7595f8fE00',
  consensus: 'Proof of Authority',
  blockTime: '3 seconds'
};

// ═══════════════════════════════════════════════════════════════════════════════
// ADMIN WALLET CONFIGURATION (for Production Mode)
// ⚠️ SECURITY: Private keys MUST be set via environment variables in production
// ═══════════════════════════════════════════════════════════════════════════════

// Cache to avoid repeated warnings
let privateKeyWarningShown = false;
let addressWarningShown = false;

// Validate that private key is set
const validatePrivateKey = (): string => {
  const privateKey = import.meta.env.VITE_ADMIN_PRIVATE_KEY;
  
  if (!privateKey) {
    if (isProduction) {
      console.error('🔴 CRITICAL SECURITY ERROR: VITE_ADMIN_PRIVATE_KEY must be set in production!');
      throw new Error('Private key not configured. Set VITE_ADMIN_PRIVATE_KEY environment variable.');
    }
    // In development, return empty string and show warning once
    if (!privateKeyWarningShown) {
      console.warn('⚠️ VITE_ADMIN_PRIVATE_KEY not set. Some features will be disabled.');
      privateKeyWarningShown = true;
    }
    return '';
  }
  
  // Validate format (should be 64 hex characters)
  if (!/^[0-9a-fA-F]{64}$/.test(privateKey)) {
    if (isProduction) {
      throw new Error('Invalid private key format. Must be 64 hexadecimal characters.');
    }
    console.warn('⚠️ Invalid private key format in .env');
    return '';
  }
  
  return privateKey;
};

// Validate admin address
const validateAdminAddress = (): string => {
  const address = import.meta.env.VITE_ADMIN_ADDRESS;
  
  if (!address) {
    if (isProduction) {
      console.error('🔴 CRITICAL: VITE_ADMIN_ADDRESS must be set in production!');
      throw new Error('Admin address not configured.');
    }
    // In development, return empty string and show warning once
    if (!addressWarningShown) {
      console.warn('⚠️ VITE_ADMIN_ADDRESS not set. Some features will be disabled.');
      addressWarningShown = true;
    }
    return '';
  }
  
  // Validate format (should be valid Ethereum address)
  if (!/^0x[0-9a-fA-F]{40}$/.test(address)) {
    if (isProduction) {
      throw new Error('Invalid admin address format. Must be valid Ethereum address.');
    }
    console.warn('⚠️ Invalid admin address format in .env');
    return '';
  }
  
  return address;
};

export const ADMIN_WALLET_CONFIG = {
  // Admin/Deployer wallet address
  get address(): string {
    return validateAdminAddress();
  },
  
  // Private key for signing transactions
  // ⚠️ In production, MUST be from environment variable!
  get privateKey(): string {
    return validatePrivateKey();
  },
  
  // Role
  role: 'ADMIN',
  
  // Display name
  name: 'Deployer/Admin',
  
  // Check if wallet is configured
  get isConfigured(): boolean {
    return !!(import.meta.env.VITE_ADMIN_PRIVATE_KEY && import.meta.env.VITE_ADMIN_ADDRESS);
  }
};

// Security: No sensitive data logging in production
// Wallet configuration is loaded from environment variables only

// ═══════════════════════════════════════════════════════════════════════════════
// SECURITY CONFIGURATION
// ⚠️ CRITICAL: All secrets MUST be set via environment variables in production
// ═══════════════════════════════════════════════════════════════════════════════

// Generate a random fallback key for development only (NOT secure for production)
const generateDevFallbackKey = (prefix: string): string => {
  if (isProduction) {
    console.error(`🔴 CRITICAL: ${prefix} must be set via environment variable in production!`);
    throw new Error(`Security key ${prefix} not configured for production.`);
  }
  // In development, generate a random key per session (not persisted)
  const randomPart = Math.random().toString(36).substring(2) + Date.now().toString(36);
  console.warn(`⚠️ Using temporary ${prefix} for development. Set environment variable for production.`);
  return `DEV_ONLY_${prefix}_${randomPart}`;
};

export const SECURITY_CONFIG = {
  // Encryption key - MUST be from environment in production
  get ENCRYPTION_KEY(): string {
    const key = import.meta.env.VITE_ENCRYPTION_KEY;
    if (!key) {
      return generateDevFallbackKey('ENCRYPTION_KEY');
    }
    return key;
  },
  
  // HMAC secret for webhooks - MUST be from environment in production
  get HMAC_SECRET(): string {
    const secret = import.meta.env.VITE_HMAC_SECRET;
    if (!secret) {
      return generateDevFallbackKey('HMAC_SECRET');
    }
    return secret;
  },
  
  // Session timeout (24 hours)
  SESSION_TIMEOUT: 24 * 60 * 60 * 1000,
  
  // Max login attempts
  MAX_LOGIN_ATTEMPTS: 5,
  
  // Lockout duration (30 minutes)
  LOCKOUT_DURATION: 30 * 60 * 1000,
  
  // Check if security is properly configured
  get isSecurelyConfigured(): boolean {
    return !!(import.meta.env.VITE_ENCRYPTION_KEY && import.meta.env.VITE_HMAC_SECRET);
  }
};

// ═══════════════════════════════════════════════════════════════════════════════
// FEATURE FLAGS
// ═══════════════════════════════════════════════════════════════════════════════

export const FEATURES = {
  // Enable sandbox mode
  SANDBOX_MODE: import.meta.env.VITE_SANDBOX_MODE !== 'false',
  
  // Enable debug logging
  DEBUG_LOGGING: isDevelopment || import.meta.env.VITE_DEBUG === 'true',
  
  // Enable WebSocket
  WEBSOCKET_ENABLED: true,
  
  // Enable polling fallback
  POLLING_ENABLED: true,
  
  // Polling interval (ms)
  POLLING_INTERVAL: 2000
};

// ═══════════════════════════════════════════════════════════════════════════════
// COMBINED CONFIG EXPORT
// ═══════════════════════════════════════════════════════════════════════════════

export const CONFIG = {
  ENV: isDevelopment ? 'development' : 'production',
  IS_DEVELOPMENT: isDevelopment,
  IS_PRODUCTION: isProduction,
  BASE_URL,
  ...API_CONFIG,
  LEMON_CHAIN,
  SECURITY: SECURITY_CONFIG,
  FEATURES
};

// Configuration loaded - no sensitive data exposed in logs

export default CONFIG;
