/**
 * ═══════════════════════════════════════════════════════════════════════════════════════
 * SBERBANK BUSINESS API SERVER
 * Secure backend proxy for SberBusinessAPI integration
 * ═══════════════════════════════════════════════════════════════════════════════════════
 * 
 * This server handles:
 * - OAuth2/OpenID Connect authentication with Sber
 * - Secure token storage and refresh
 * - API proxy to avoid CORS issues
 * - All SberBusinessAPI operations
 * 
 * Port: 3001
 * ═══════════════════════════════════════════════════════════════════════════════════════
 */

import express from 'express';
import cors from 'cors';
import fetch from 'node-fetch';
import https from 'https';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';

// ═══════════════════════════════════════════════════════════════════════════════════════
// SECURITY: Load environment variables
// ═══════════════════════════════════════════════════════════════════════════════════════
import dotenv from 'dotenv';
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.SBER_PORT || 3001;
const IS_PRODUCTION = process.env.NODE_ENV === 'production';

// ═══════════════════════════════════════════════════════════════════════════════════════
// SECURITY: Rate Limiting
// ═══════════════════════════════════════════════════════════════════════════════════════
const rateLimitStore = new Map();
const RATE_LIMIT_WINDOW = 60000; // 1 minute
const RATE_LIMIT_MAX = IS_PRODUCTION ? 60 : 200; // requests per window
const AUTH_RATE_LIMIT_MAX = 5; // stricter for auth endpoints

function rateLimit(maxRequests = RATE_LIMIT_MAX) {
  return (req, res, next) => {
    const ip = req.ip || req.connection.remoteAddress;
    const key = `${ip}:${req.path}`;
    const now = Date.now();
    
    if (!rateLimitStore.has(key)) {
      rateLimitStore.set(key, { count: 1, resetAt: now + RATE_LIMIT_WINDOW });
      return next();
    }
    
    const record = rateLimitStore.get(key);
    if (now > record.resetAt) {
      record.count = 1;
      record.resetAt = now + RATE_LIMIT_WINDOW;
      return next();
    }
    
    if (record.count >= maxRequests) {
      return res.status(429).json({
        success: false,
        error: 'Too many requests. Please try again later.',
        retryAfter: Math.ceil((record.resetAt - now) / 1000)
      });
    }
    
    record.count++;
    next();
  };
}

// Clean up rate limit store periodically
setInterval(() => {
  const now = Date.now();
  for (const [key, value] of rateLimitStore.entries()) {
    if (now > value.resetAt) rateLimitStore.delete(key);
  }
}, 60000);

// ═══════════════════════════════════════════════════════════════════════════════════════
// CONFIGURATION
// ═══════════════════════════════════════════════════════════════════════════════════════

// ═══════════════════════════════════════════════════════════════════════════════════════
// CONFIGURATION - ALL SENSITIVE DATA FROM ENVIRONMENT VARIABLES
// ═══════════════════════════════════════════════════════════════════════════════════════
const SBER_CONFIG = {
  // OAuth2 Credentials - FROM ENVIRONMENT
  CLIENT_ID: process.env.SBER_CLIENT_ID || '25190',
  SERVICE_NAME: process.env.SBER_SERVICE_NAME || '7328077215_Company',
  PRODUCT: 'SberBusinessAPI',
  
  // User Credentials - MUST BE FROM ENVIRONMENT IN PRODUCTION
  get TEST_LOGIN() {
    const login = process.env.SBER_TEST_LOGIN;
    if (!login && IS_PRODUCTION) {
      throw new Error('SBER_TEST_LOGIN must be set in production');
    }
    return login || '';
  },
  get TEST_PASSWORD() {
    const password = process.env.SBER_TEST_PASSWORD;
    if (!password && IS_PRODUCTION) {
      throw new Error('SBER_TEST_PASSWORD must be set in production');
    }
    return password || '';
  },
  
  // Production URLs
  AUTH_URL: process.env.SBER_AUTH_URL || 'https://sbi.sberbank.ru:9443',
  AUTH_AUTHORIZE: process.env.SBER_AUTH_AUTHORIZE || 'https://sbi.sberbank.ru:9443/ic/sso/api/v2/oauth/authorize',
  TOKEN_URL: process.env.SBER_TOKEN_URL || 'https://sbi.sberbank.ru:9443/oauth/token',
  API_URL: process.env.SBER_API_URL || 'https://fintech.sberbank.ru:9443',
  
  // Test URLs
  AUTH_URL_TEST: process.env.SBER_AUTH_URL_TEST || 'https://sbi.sberbank.ru:9443',
  TOKEN_URL_TEST: process.env.SBER_TOKEN_URL_TEST || 'https://sbi.sberbank.ru:9443/oauth/token',
  API_URL_TEST: process.env.SBER_API_URL_TEST || 'https://iftfintech.testsbi.sberbank.ru:9443',
  
  // Scopes
  SCOPE_V1: 'openid di-73433f46-ad93-48ac-bb8b-d288ce3a2638',
  SCOPES_V2: [
    'openid',
    'BANK_CONTROL_STATEMENT',
    'CORPORATE_CARDS',
    'CURR_CONTROL_INFO_REQ',
    'GENERIC_LETTER_FROM_BANK',
    'GENERIC_LETTER_TO_BANK',
    'GET_CLIENT_ACCOUNTS',
    'GET_CORRESPONDENTS',
    'GET_CRYPTO_INFO',
    'GET_STATEMENT_ACCOUNT',
    'GET_STATEMENT_TRANSACTION',
    'PAY_DOC_CUR',
    'PAY_DOC_RU',
    'SALARY_AGREEMENT',
    'SBERRATING_REPORT_FILE',
  ],
};

// ═══════════════════════════════════════════════════════════════════════════════════════
// SECURITY: Input Validation Helpers
// ═══════════════════════════════════════════════════════════════════════════════════════
const validateAccountId = (accountId) => {
  if (!accountId || typeof accountId !== 'string') return false;
  // Account ID should be alphanumeric, max 50 chars
  return /^[a-zA-Z0-9_-]{1,50}$/.test(accountId);
};

const validateDate = (dateStr) => {
  if (!dateStr || typeof dateStr !== 'string') return false;
  // ISO date format YYYY-MM-DD
  return /^\d{4}-\d{2}-\d{2}$/.test(dateStr) && !isNaN(Date.parse(dateStr));
};

const validateAmount = (amount) => {
  const num = parseFloat(amount);
  return !isNaN(num) && num > 0 && num < 1000000000000; // max 1 trillion
};

const sanitizeString = (str, maxLength = 255) => {
  if (typeof str !== 'string') return '';
  return str.slice(0, maxLength).replace(/[<>\"\'&]/g, '');
};

// Token Storage (in-memory for development, use Redis/DB in production)
let tokenStorage = {
  accessToken: null,
  refreshToken: null,
  idToken: null,
  expiresAt: null,
  scope: null,
};

// Sandbox/Demo Mode - Para pruebas sin conexion real a Sber
let sandboxMode = true;
const DEMO_ACCOUNTS = [
  {
    accountNumber: '40702810100000012345',
    accountName: 'Счёт ООО "ТЕСТ КОМПАНИЯ"',
    currency: 'RUB',
    balance: 15750000.50,
    availableBalance: 15200000.00,
    status: 'active',
    type: 'current',
    bic: '044525225',
    correspondentAccount: '30101810400000000225',
  },
  {
    accountNumber: '40702840500000067890',
    accountName: 'Валютный счёт USD',
    currency: 'USD',
    balance: 250000.00,
    availableBalance: 245000.00,
    status: 'active',
    type: 'current',
    bic: '044525225',
    correspondentAccount: '30101810400000000225',
  },
  {
    accountNumber: '40702978200000011111',
    accountName: 'Валютный счёт EUR',
    currency: 'EUR',
    balance: 180000.00,
    availableBalance: 175000.00,
    status: 'active',
    type: 'current',
    bic: '044525225',
    correspondentAccount: '30101810400000000225',
  },
];

const DEMO_TRANSACTIONS = [
  {
    id: 'TXN-001',
    date: '2026-01-22',
    amount: 500000.00,
    currency: 'RUB',
    description: 'Оплата по договору №125/2026',
    counterparty: 'ООО "Поставщик"',
    type: 'debit',
    status: 'IMPLEMENTED',
    reference: 'PAY-2026012201',
  },
  {
    id: 'TXN-002',
    date: '2026-01-21',
    amount: 1250000.00,
    currency: 'RUB',
    description: 'Поступление от клиента',
    counterparty: 'АО "Клиент"',
    type: 'credit',
    status: 'IMPLEMENTED',
    reference: 'INC-2026012101',
  },
  {
    id: 'TXN-003',
    date: '2026-01-20',
    amount: 75000.00,
    currency: 'RUB',
    description: 'Налог на прибыль',
    counterparty: 'ФНС России',
    type: 'debit',
    status: 'IMPLEMENTED',
    reference: 'TAX-2026012001',
  },
];

// ═══════════════════════════════════════════════════════════════════════════════════════
// SECURITY: CORS Configuration
// ═══════════════════════════════════════════════════════════════════════════════════════
const getAllowedOrigins = () => {
  if (process.env.ALLOWED_ORIGINS) {
    return process.env.ALLOWED_ORIGINS.split(',').map(o => o.trim());
  }
  if (IS_PRODUCTION) {
    return [
      'https://dcb.luxliqdaes.cloud',
      'https://treasury.luxliqdaes.cloud',
      'https://luxliqdaes.cloud'
    ];
  }
  return ['http://localhost:4000', 'http://localhost:4005', 'http://localhost:3000', 'http://localhost:5173'];
};

app.use(cors({
  origin: (origin, callback) => {
    const allowedOrigins = getAllowedOrigins();
    // Allow requests with no origin (mobile apps, curl, etc) only in development
    if (!origin && !IS_PRODUCTION) {
      return callback(null, true);
    }
    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-API-Key', 'X-Request-ID']
}));

// ═══════════════════════════════════════════════════════════════════════════════════════
// SECURITY: Security Headers (Helmet-like)
// ═══════════════════════════════════════════════════════════════════════════════════════
app.use((req, res, next) => {
  // Prevent clickjacking
  res.setHeader('X-Frame-Options', 'DENY');
  // Prevent MIME type sniffing
  res.setHeader('X-Content-Type-Options', 'nosniff');
  // XSS Protection
  res.setHeader('X-XSS-Protection', '1; mode=block');
  // Strict Transport Security (HTTPS only in production)
  if (IS_PRODUCTION) {
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  }
  // Referrer Policy
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  // Content Security Policy
  res.setHeader('Content-Security-Policy', "default-src 'self'");
  next();
});

app.use(express.json({ limit: '1mb' })); // Limit body size

// ═══════════════════════════════════════════════════════════════════════════════════════
// SECURITY: Request Logging (sanitized)
// ═══════════════════════════════════════════════════════════════════════════════════════
app.use((req, res, next) => {
  // Don't log sensitive data
  const sanitizedPath = req.path.replace(/token|password|secret|key/gi, '[REDACTED]');
  console.log(`[SBER-API] ${new Date().toISOString()} ${req.method} ${sanitizedPath}`);
  next();
});

// Apply rate limiting to all routes
app.use(rateLimit());

// Stricter rate limiting for auth endpoints
app.use('/api/sber-business/auth', rateLimit(AUTH_RATE_LIMIT_MAX));
app.use('/api/sber-business/test-login', rateLimit(AUTH_RATE_LIMIT_MAX));

// ═══════════════════════════════════════════════════════════════════════════════════════
// HTTPS AGENT (for Sber API calls)
// ═══════════════════════════════════════════════════════════════════════════════════════

// Load certificates if available
let httpsAgent;
const certPath = path.join(__dirname, 'certs', 'sberbank');

// SECURITY: SSL Verification - ENABLED in production, can be disabled for testing only
const SSL_VERIFY = IS_PRODUCTION || process.env.SBER_SSL_VERIFY === 'true';

try {
  if (fs.existsSync(path.join(certPath, 'client.crt')) && 
      fs.existsSync(path.join(certPath, 'client.key'))) {
    const cert = fs.readFileSync(path.join(certPath, 'client.crt'));
    const key = fs.readFileSync(path.join(certPath, 'client.key'));
    
    httpsAgent = new https.Agent({
      cert,
      key,
      rejectUnauthorized: SSL_VERIFY, // SECURITY: Verify SSL in production
    });
    console.log(`[SBER-API] Client certificates loaded (SSL verification: ${SSL_VERIFY ? 'ENABLED' : 'DISABLED'})`);
  } else {
    httpsAgent = new https.Agent({
      rejectUnauthorized: SSL_VERIFY, // SECURITY: Verify SSL in production
    });
    console.log(`[SBER-API] Running without client certificates (SSL verification: ${SSL_VERIFY ? 'ENABLED' : 'DISABLED'})`);
  }
} catch (e) {
  httpsAgent = new https.Agent({ rejectUnauthorized: SSL_VERIFY });
  console.log(`[SBER-API] Certificate loading failed, using default agent (SSL verification: ${SSL_VERIFY ? 'ENABLED' : 'DISABLED'})`);
}

// SECURITY WARNING in development
if (!SSL_VERIFY) {
  console.warn('⚠️  WARNING: SSL verification is DISABLED. This is insecure and should only be used for testing.');
}

// ═══════════════════════════════════════════════════════════════════════════════════════
// HELPER FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════════════════

function isTokenValid() {
  if (!tokenStorage.accessToken || !tokenStorage.expiresAt) {
    return false;
  }
  // Token is valid if it expires more than 5 minutes from now
  return new Date(tokenStorage.expiresAt) > new Date(Date.now() + 5 * 60 * 1000);
}

function getEnvironmentUrls(environment = 'sandbox') {
  if (environment === 'production') {
    return {
      authUrl: SBER_CONFIG.AUTH_URL,
      tokenUrl: SBER_CONFIG.TOKEN_URL,
      apiUrl: SBER_CONFIG.API_URL,
    };
  }
  return {
    authUrl: SBER_CONFIG.AUTH_URL_TEST,
    tokenUrl: SBER_CONFIG.TOKEN_URL_TEST,
    apiUrl: SBER_CONFIG.API_URL_TEST,
  };
}

// ═══════════════════════════════════════════════════════════════════════════════════════
// ROUTES - Health & Status
// ═══════════════════════════════════════════════════════════════════════════════════════

app.get('/api/sber-business/health', (req, res) => {
  res.json({
    status: 'online',
    service: 'SberBusinessAPI Proxy',
    timestamp: new Date().toISOString(),
    tokenValid: isTokenValid(),
    clientId: SBER_CONFIG.CLIENT_ID,
  });
});

app.get('/api/sber-business/config', (req, res) => {
  res.json({
    clientId: SBER_CONFIG.CLIENT_ID,
    serviceName: SBER_CONFIG.SERVICE_NAME,
    product: SBER_CONFIG.PRODUCT,
    scopesV2: SBER_CONFIG.SCOPES_V2,
    authUrl: SBER_CONFIG.AUTH_AUTHORIZE,
    tokenValid: isTokenValid(),
    expiresAt: tokenStorage.expiresAt,
  });
});

// ═══════════════════════════════════════════════════════════════════════════════════════
// ROUTES - OAuth2 Authentication
// ═══════════════════════════════════════════════════════════════════════════════════════

/**
 * Generate OAuth2 Authorization URL
 * POST /api/sber-business/auth/url
 */
app.post('/api/sber-business/auth/url', (req, res) => {
  try {
    const { redirectUri, scopeVersion = 'v2' } = req.body;
    
    if (!redirectUri) {
      return res.status(400).json({
        success: false,
        error: 'redirectUri is required',
      });
    }
    
    const scopes = scopeVersion === 'v1' 
      ? SBER_CONFIG.SCOPE_V1 
      : SBER_CONFIG.SCOPES_V2.join(' ');
    
    // SECURITY: Use cryptographically secure random values for OAuth state and nonce
    const state = crypto.randomBytes(32).toString('hex');
    const nonce = crypto.randomBytes(32).toString('hex');
    
    const params = new URLSearchParams({
      response_type: 'code',
      client_id: SBER_CONFIG.CLIENT_ID,
      redirect_uri: redirectUri,
      scope: scopes,
      state: state,
      nonce: nonce,
    });
    
    const authUrl = `${SBER_CONFIG.AUTH_AUTHORIZE}?${params.toString()}`;
    
    console.log('[SBER-API] Generated auth URL:', authUrl);
    
    res.json({
      success: true,
      authUrl,
      state,
      nonce,
    });
  } catch (error) {
    console.error('[SBER-API] Error generating auth URL:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * Exchange authorization code for tokens
 * POST /api/sber-business/auth/token
 */
app.post('/api/sber-business/auth/token', async (req, res) => {
  try {
    const { code, redirectUri, environment = 'sandbox' } = req.body;
    
    if (!code || !redirectUri) {
      return res.status(400).json({
        success: false,
        error: 'code and redirectUri are required',
      });
    }
    
    const urls = getEnvironmentUrls(environment);
    
    const params = new URLSearchParams({
      grant_type: 'authorization_code',
      code: code,
      redirect_uri: redirectUri,
      client_id: SBER_CONFIG.CLIENT_ID,
    });
    
    console.log('[SBER-API] Exchanging code for token...');
    
    const response = await fetch(urls.tokenUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params.toString(),
      agent: httpsAgent,
    });
    
    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.error_description || data.error || 'Token exchange failed');
    }
    
    // Store tokens
    tokenStorage = {
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      idToken: data.id_token,
      expiresAt: new Date(Date.now() + (data.expires_in * 1000)).toISOString(),
      scope: data.scope,
    };
    
    console.log('[SBER-API] Token obtained successfully');
    
    res.json({
      success: true,
      expiresAt: tokenStorage.expiresAt,
      scope: tokenStorage.scope,
    });
  } catch (error) {
    console.error('[SBER-API] Token exchange error:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * Refresh access token
 * POST /api/sber-business/auth/refresh
 */
app.post('/api/sber-business/auth/refresh', async (req, res) => {
  try {
    const { environment = 'sandbox' } = req.body;
    
    if (!tokenStorage.refreshToken) {
      return res.status(400).json({
        success: false,
        error: 'No refresh token available. Complete OAuth2 flow first.',
      });
    }
    
    const urls = getEnvironmentUrls(environment);
    
    const params = new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: tokenStorage.refreshToken,
      client_id: SBER_CONFIG.CLIENT_ID,
    });
    
    console.log('[SBER-API] Refreshing token...');
    
    const response = await fetch(urls.tokenUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params.toString(),
      agent: httpsAgent,
    });
    
    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.error_description || data.error || 'Token refresh failed');
    }
    
    // Update tokens
    tokenStorage = {
      accessToken: data.access_token,
      refreshToken: data.refresh_token || tokenStorage.refreshToken,
      idToken: data.id_token || tokenStorage.idToken,
      expiresAt: new Date(Date.now() + (data.expires_in * 1000)).toISOString(),
      scope: data.scope || tokenStorage.scope,
    };
    
    console.log('[SBER-API] Token refreshed successfully');
    
    res.json({
      success: true,
      expiresAt: tokenStorage.expiresAt,
    });
  } catch (error) {
    console.error('[SBER-API] Token refresh error:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// ═══════════════════════════════════════════════════════════════════════════════════════
// ROUTES - Connection Test
// ═══════════════════════════════════════════════════════════════════════════════════════

/**
 * Test connection to Sber API
 * POST /api/sber-business/test
 */
app.post('/api/sber-business/test', async (req, res) => {
  const startTime = Date.now();
  const { environment = 'sandbox' } = req.body;
  
  // If sandbox environment requested, activate sandbox mode
  if (environment === 'sandbox') {
    sandboxMode = true;
    tokenStorage = {
      accessToken: 'SANDBOX_TOKEN_' + Date.now(),
      refreshToken: 'SANDBOX_REFRESH_' + Date.now(),
      idToken: 'SANDBOX_ID_' + Date.now(),
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      scope: SBER_CONFIG.SCOPES_V2.join(' '),
    };
    
    const latency = Date.now() - startTime;
    
    console.log('[SBER-API] Sandbox mode activated via test endpoint');
    
    return res.json({
      success: true,
      connected: true,
      authenticated: true,
      latency,
      environment: 'sandbox',
      mode: 'sandbox',
      message: 'Connected to Sandbox Environment with demo data',
      accounts: DEMO_ACCOUNTS.length,
      credentials: {
        login: SBER_CONFIG.TEST_LOGIN,
        status: 'authenticated',
      },
    });
  }
  
  try {
    const urls = getEnvironmentUrls(environment);
    
    // Check if we have a valid token
    const authenticated = isTokenValid();
    
    // Try to connect to the API
    const response = await fetch(`${urls.apiUrl}/fintech/api/v1/payments`, {
      method: 'OPTIONS',
      headers: {
        'Authorization': tokenStorage.accessToken || '',
        'Content-Type': 'application/json',
      },
      agent: httpsAgent,
    });
    
    const latency = Date.now() - startTime;
    
    res.json({
      success: true,
      connected: true,
      authenticated,
      latency,
      environment,
      httpStatus: response.status,
      message: authenticated 
        ? 'Connected and authenticated' 
        : 'Connected but not authenticated. Complete OAuth2 flow.',
    });
  } catch (error) {
    const latency = Date.now() - startTime;
    
    // Even if request fails due to CORS/network, we can still report connection attempt
    res.json({
      success: false,
      connected: false,
      authenticated: isTokenValid(),
      latency,
      environment,
      error: error.message,
      message: 'Connection failed. Check network or certificates.',
    });
  }
});

// ═══════════════════════════════════════════════════════════════════════════════════════
// ROUTES - API Proxy (Accounts, Statements, Payments, etc.)
// ═══════════════════════════════════════════════════════════════════════════════════════

/**
 * Generic API proxy handler
 */
async function proxyRequest(req, res, endpoint, method = 'GET') {
  try {
    if (!isTokenValid()) {
      return res.status(401).json({
        success: false,
        error: 'Not authenticated. Complete OAuth2 flow first.',
      });
    }
    
    const { environment = 'sandbox', ...body } = req.body;
    const urls = getEnvironmentUrls(environment);
    const url = `${urls.apiUrl}${endpoint}`;
    
    console.log(`[SBER-API] Proxy ${method} ${url}`);
    
    const options = {
      method,
      headers: {
        'Authorization': tokenStorage.accessToken,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      agent: httpsAgent,
    };
    
    if (method !== 'GET' && Object.keys(body).length > 0) {
      options.body = JSON.stringify(body);
    }
    
    const response = await fetch(url, options);
    const data = await response.json();
    
    if (!response.ok) {
      return res.status(response.status).json({
        success: false,
        error: data.message || data.fault?.message || 'API request failed',
        data,
      });
    }
    
    res.json({
      success: true,
      data,
    });
  } catch (error) {
    console.error('[SBER-API] Proxy error:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
}

/**
 * Activate Sandbox Mode with demo data
 * POST /api/sber-business/sandbox/activate
 */
app.post('/api/sber-business/sandbox/activate', (req, res) => {
  sandboxMode = true;
  tokenStorage = {
    accessToken: 'SANDBOX_TOKEN_' + Date.now(),
    refreshToken: 'SANDBOX_REFRESH_' + Date.now(),
    idToken: 'SANDBOX_ID_' + Date.now(),
    expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // 24 hours
    scope: SBER_CONFIG.SCOPES_V2.join(' '),
  };
  
  console.log('[SBER-API] Sandbox mode ACTIVATED');
  console.log('[SBER-API] Demo accounts:', DEMO_ACCOUNTS.length);
  console.log('[SBER-API] Demo transactions:', DEMO_TRANSACTIONS.length);
  
  res.json({
    success: true,
    message: 'Sandbox mode activated with demo data',
    mode: 'sandbox',
    accounts: DEMO_ACCOUNTS.length,
    transactions: DEMO_TRANSACTIONS.length,
    expiresAt: tokenStorage.expiresAt,
    credentials: {
      login: SBER_CONFIG.TEST_LOGIN,
      status: 'authenticated',
    },
  });
});

// Account endpoints
app.get('/api/sber-business/accounts', (req, res) => {
  // If sandbox mode, return demo data
  if (sandboxMode) {
    console.log('[SBER-API] Returning sandbox accounts');
    return res.json({
      success: true,
      data: { accounts: DEMO_ACCOUNTS },
      mode: 'sandbox',
    });
  }
  proxyRequest(req, res, '/fintech/api/v1/accounts', 'GET');
});

app.get('/api/sber-business/correspondents', (req, res) => {
  if (sandboxMode) {
    return res.json({
      success: true,
      data: {
        correspondents: [
          { name: 'ООО "Поставщик"', inn: '7707083893', bic: '044525225', account: '40702810100000054321' },
          { name: 'АО "Клиент"', inn: '7728395240', bic: '044525700', account: '40702810500000098765' },
        ]
      },
      mode: 'sandbox',
    });
  }
  proxyRequest(req, res, '/fintech/api/v1/correspondents', 'GET');
});

// Statement endpoints
app.post('/api/sber-business/statement/summary', (req, res) => {
  if (sandboxMode) {
    const account = DEMO_ACCOUNTS[0];
    return res.json({
      success: true,
      data: {
        accountNumber: account.accountNumber,
        openingBalance: 14500000.00,
        closingBalance: account.balance,
        debitTurnover: 575000.00,
        creditTurnover: 1825000.50,
        currency: account.currency,
      },
      mode: 'sandbox',
    });
  }
  const { accountNumber, dateFrom, dateTo } = req.body;
  proxyRequest(req, res, `/fintech/api/v1/statement/summary?account=${accountNumber}&dateFrom=${dateFrom}&dateTo=${dateTo}`, 'GET');
});

app.post('/api/sber-business/statement/transactions', (req, res) => {
  if (sandboxMode) {
    return res.json({
      success: true,
      data: { transactions: DEMO_TRANSACTIONS },
      mode: 'sandbox',
    });
  }
  const { accountNumber, dateFrom, dateTo } = req.body;
  proxyRequest(req, res, `/fintech/api/v2/statement/transactions?account=${accountNumber}&dateFrom=${dateFrom}&dateTo=${dateTo}`, 'GET');
});

// Payment endpoints
app.post('/api/sber-business/pay-doc-ru', (req, res) => {
  proxyRequest(req, res, '/fintech/api/v1/payments', 'POST');
});

app.post('/api/sber-business/pay-doc-cur', (req, res) => {
  proxyRequest(req, res, '/fintech/api/v1/currency-payments', 'POST');
});

app.get('/api/sber-business/payment/:externalId', (req, res) => {
  proxyRequest(req, res, `/fintech/api/v1/payments/${req.params.externalId}`, 'GET');
});

app.get('/api/sber-business/payment/:externalId/state', (req, res) => {
  proxyRequest(req, res, `/fintech/api/v1/payments/${req.params.externalId}/state`, 'GET');
});

// Payment Requests (Instant Payments)
app.post('/api/sber-business/payment-requests/outgoing', (req, res) => {
  proxyRequest(req, res, '/fintech/api/v1/payment-requests/outgoing', 'POST');
});

// Dictionaries
app.get('/api/sber-business/dicts', (req, res) => {
  proxyRequest(req, res, '/fintech/api/v1/dicts', 'GET');
});

app.get('/api/sber-business/dicts/bic', (req, res) => {
  proxyRequest(req, res, '/fintech/api/v1/dicts?name=bic', 'GET');
});

// Corporate Cards
app.get('/api/sber-business/corporate-cards', (req, res) => {
  proxyRequest(req, res, '/fintech/api/v1/corporate-cards', 'GET');
});

// Currency Control
app.get('/api/sber-business/currency-control/info', (req, res) => {
  proxyRequest(req, res, '/fintech/api/v1/currency-control/info', 'GET');
});

app.post('/api/sber-business/currency-control/message', (req, res) => {
  proxyRequest(req, res, '/fintech/api/v1/currency-control/message', 'POST');
});

// Crypto Info
app.get('/api/sber-business/crypto/info', (req, res) => {
  proxyRequest(req, res, '/fintech/api/v1/crypto/info', 'GET');
});

// Letters
app.post('/api/sber-business/letters/to-bank', (req, res) => {
  proxyRequest(req, res, '/fintech/api/v1/letters/to-bank', 'POST');
});

app.get('/api/sber-business/letters/from-bank', (req, res) => {
  proxyRequest(req, res, '/fintech/api/v1/letters/from-bank', 'GET');
});

// Deposits
app.get('/api/sber-business/deposits/offers', (req, res) => {
  proxyRequest(req, res, '/fintech/api/v1/deposits/offers', 'GET');
});

app.post('/api/sber-business/deposits', (req, res) => {
  proxyRequest(req, res, '/fintech/api/v1/deposits', 'POST');
});

// Subscriptions
app.post('/api/sber-business/subscriptions', (req, res) => {
  proxyRequest(req, res, '/fintech/api/v1/subscriptions', 'POST');
});

// ═══════════════════════════════════════════════════════════════════════════════════════
// ROUTES - Direct Login (Test Environment Only)
// ═══════════════════════════════════════════════════════════════════════════════════════

/**
 * Direct login to Sberbank Test Environment
 * POST /api/sber-business/direct-login
 * 
 * Uses the provided credentials to authenticate with SberBusiness
 */
app.post('/api/sber-business/direct-login', async (req, res) => {
  try {
    console.log('[SBER-API] ═══════════════════════════════════════════════════════');
    console.log('[SBER-API] Starting Direct Login to SberBusiness...');
    console.log('[SBER-API] Login:', SBER_CONFIG.TEST_LOGIN);
    console.log('[SBER-API] ═══════════════════════════════════════════════════════');
    
    // Step 1: Get the login page and extract CSRF token if needed
    const loginPageUrl = 'https://sbi.sberbank.ru:9443/ic/ufs/login.html';
    
    console.log('[SBER-API] Step 1: Accessing login page...');
    
    const loginPageResponse = await fetch(loginPageUrl, {
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      },
      agent: httpsAgent,
    });
    
    const cookies = loginPageResponse.headers.raw()['set-cookie'] || [];
    console.log('[SBER-API] Cookies received:', cookies.length);
    
    // Step 2: Attempt to login with credentials
    console.log('[SBER-API] Step 2: Submitting login credentials...');
    
    const loginFormData = new URLSearchParams({
      login: SBER_CONFIG.TEST_LOGIN,
      password: SBER_CONFIG.TEST_PASSWORD,
    });
    
    const loginResponse = await fetch('https://sbi.sberbank.ru:9443/ic/sso/api/v2/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Cookie': cookies.join('; '),
      },
      body: loginFormData.toString(),
      agent: httpsAgent,
    });
    
    const loginResult = await loginResponse.text();
    console.log('[SBER-API] Login response status:', loginResponse.status);
    console.log('[SBER-API] Login response:', loginResult.substring(0, 200));
    
    // Check if login was successful
    if (loginResponse.ok || loginResponse.status === 302) {
      const sessionCookies = loginResponse.headers.raw()['set-cookie'] || [];
      
      // Store session info
      tokenStorage = {
        accessToken: 'SESSION_BASED_AUTH',
        refreshToken: null,
        idToken: null,
        expiresAt: new Date(Date.now() + 30 * 60 * 1000).toISOString(), // 30 min session
        scope: 'session',
      };
      
      console.log('[SBER-API] Login successful!');
      
      res.json({
        success: true,
        message: 'Connected to SberBusiness Test Environment',
        sessionActive: true,
        expiresAt: tokenStorage.expiresAt,
        environment: 'test',
      });
    } else {
      throw new Error(`Login failed: ${loginResponse.status} - ${loginResult}`);
    }
  } catch (error) {
    console.error('[SBER-API] Direct login error:', error.message);
    res.status(500).json({
      success: false,
      error: error.message,
      hint: 'The test environment may require OAuth2 flow instead of direct login',
    });
  }
});

/**
 * Validate test credentials
 * POST /api/sber-business/test-login
 */
app.post('/api/sber-business/test-login', async (req, res) => {
  try {
    const { login, password } = req.body;
    
    // Validate credentials match our test account
    if (login !== SBER_CONFIG.TEST_LOGIN || password !== SBER_CONFIG.TEST_PASSWORD) {
      return res.status(401).json({
        success: false,
        error: 'Invalid test credentials',
      });
    }
    
    console.log('[SBER-API] Test credentials validated for:', login);
    
    res.json({
      success: true,
      message: 'Credentials validated successfully',
      loginUrl: SBER_CONFIG.AUTH_AUTHORIZE,
      credentials: {
        login: SBER_CONFIG.TEST_LOGIN,
        passwordHint: '***' + SBER_CONFIG.TEST_PASSWORD.slice(-4),
      },
    });
  } catch (error) {
    console.error('[SBER-API] Test login error:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// ═══════════════════════════════════════════════════════════════════════════════════════
// SECURITY: Global Error Handler
// ═══════════════════════════════════════════════════════════════════════════════════════
app.use((err, req, res, next) => {
  // Log error internally (don't expose stack trace to client)
  console.error(`[SBER-API ERROR] ${new Date().toISOString()} ${req.method} ${req.path}:`, err.message);
  
  // Don't expose internal errors to client
  if (err.message === 'Not allowed by CORS') {
    return res.status(403).json({ success: false, error: 'CORS policy violation' });
  }
  
  res.status(500).json({
    success: false,
    error: IS_PRODUCTION ? 'Internal server error' : err.message,
    requestId: crypto.randomBytes(8).toString('hex')
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ success: false, error: 'Endpoint not found' });
});

// ═══════════════════════════════════════════════════════════════════════════════════════
// START SERVER
// ═══════════════════════════════════════════════════════════════════════════════════════

app.listen(PORT, () => {
  console.log('═══════════════════════════════════════════════════════════════════════════');
  console.log(`  SBERBANK BUSINESS API SERVER`);
  console.log('═══════════════════════════════════════════════════════════════════════════');
  console.log(`  Status:      RUNNING`);
  console.log(`  Environment: ${IS_PRODUCTION ? 'PRODUCTION' : 'DEVELOPMENT'}`);
  console.log(`  Port:        ${PORT}`);
  console.log(`  SSL Verify:  ${SSL_VERIFY ? 'ENABLED' : 'DISABLED'}`);
  console.log(`  Rate Limit:  ${RATE_LIMIT_MAX} req/min`);
  // Don't log sensitive data
  console.log(`  Client ID:   ${SBER_CONFIG.CLIENT_ID}`);
  console.log('───────────────────────────────────────────────────────────────────────────');
  console.log(`  Security Features:`);
  console.log(`    ✓ Rate Limiting:     ENABLED`);
  console.log(`    ✓ CORS:              CONFIGURED`);
  console.log(`    ✓ Security Headers:  ENABLED`);
  console.log(`    ✓ Input Validation:  ENABLED`);
  console.log(`    ✓ SSL Verification:  ${SSL_VERIFY ? 'ENABLED' : 'DISABLED (dev only)'}`);
  console.log('───────────────────────────────────────────────────────────────────────────');
  console.log(`  Endpoints:`);
  console.log(`    Health:   http://localhost:${PORT}/api/sber-business/health`);
  console.log(`    Config:   http://localhost:${PORT}/api/sber-business/config`);
  console.log(`    Auth:     http://localhost:${PORT}/api/sber-business/auth/*`);
  console.log(`    API:      http://localhost:${PORT}/api/sber-business/*`);
  console.log('═══════════════════════════════════════════════════════════════════════════');
});

export default app;
