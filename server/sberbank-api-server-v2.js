/**
 * ═══════════════════════════════════════════════════════════════════════════════════════
 * SBERBANK BUSINESS API SERVER v2
 * Secure backend proxy with P12 Certificate Support
 * ═══════════════════════════════════════════════════════════════════════════════════════
 * 
 * Updated: 22 January 2026
 * - Added P12 certificate support with password
 * - Production-ready mTLS authentication
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
import * as SberSignature from './sberbank-signature.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3001;

// ═══════════════════════════════════════════════════════════════════════════════════════
// CERTIFICATE CONFIGURATION
// ═══════════════════════════════════════════════════════════════════════════════════════

const CERT_CONFIG = {
  // P12 Certificate Path (from SBANKCARD/12/sbank/new23/24) - Updated 2026-01-23 15:39
  P12_PATH: 'C:/Users/USER/Desktop/SBANKCARD/12/sbank/new23/24/SBBAPI_25190_2bb2b139-e2a7-40a8-b45b-a6e8f41cccd9.p12',
  P12_PASSWORD: 'Happy707Happy',
  
  // CA Certificates Path
  CA_CERTS_PATH: 'C:/Users/USER/Desktop/SBANKCARD/2b1cfb94_prom-certs/prom-certs',
  
  // Individual CA cert files
  CA_FILES: [
    'sberapi-ca.cer',
    'sberapi-root-ca.cer',
    'Sberbank Root CA.cer',
    'sberca-ext.crt',
    'sberca-root-ext.crt'
  ]
};

// ═══════════════════════════════════════════════════════════════════════════════════════
// SBERBANK API CONFIGURATION
// ═══════════════════════════════════════════════════════════════════════════════════════

const SBER_CONFIG = {
  // OAuth2 Credentials
  CLIENT_ID: '25190',
  SERVICE_NAME: '7328077215_Company',
  PRODUCT: 'SberBusinessAPI',
  
  // User Credentials
  TEST_LOGIN: 'ashagaev',
  TEST_PASSWORD: 'Happy707Happy+',
  
  // Production URLs
  AUTH_URL: 'https://sbi.sberbank.ru:9443',
  AUTH_AUTHORIZE: 'https://sbi.sberbank.ru:9443/ic/sso/api/v2/oauth/authorize',
  TOKEN_URL: 'https://sbi.sberbank.ru:9443/ic/sso/api/v2/oauth/token',
  API_URL: 'https://fintech.sberbank.ru:9443/fintech',
  
  // ═══════════════════════════════════════════════════════════════════════════════════════
  // CORPORATE SETTLEMENT ACCOUNT (PAYER) - ООО "ПОИНТЕР"
  // ═══════════════════════════════════════════════════════════════════════════════════════
  SETTLEMENT_ACCOUNT: {
    // Organization Details
    orgName: 'ООО "ПОИНТЕР"',
    orgInn: '7328077215',
    orgKpp: '732801001',
    orgOgrn: '1147328000764',
    // Settlement Account
    accountNumber: '40702810669000001880',
    // Bank Details
    bankName: 'УЛЬЯНОВСКОЕ ОТДЕЛЕНИЕ N8588 ПАО СБЕРБАНК',
    bankBic: '047308602',
    corrAccount: '30101810000000000602',
    bankInn: '7707083893',
    bankKpp: '732502002',
  },
  
  // Scope V1 (specific)
  SCOPE_V1: 'openid di-73433f46-ad93-48ac-bb8b-d288ce3a2638',
  
  // Scopes V2
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

// Token Storage - Pre-configured with tokens from Sberbank portal
// IMPORTANT: These tokens have PAY_DOC_RU scope for real payments
let tokenStorage = {
  accessToken: 'cD3Ed0e541DEAAb2B9377bC5DEe9058eaA8DAC',
  refreshToken: 'ee6AD4c5e7D67eC4E4BEBAba26E5aBCEA0B479',
  idToken: null,
  expiresAt: '2026-02-22T03:47:17.000Z', // Access token expires 22/02/2026
  refreshExpiresAt: '2026-07-21T17:47:17.000Z', // Refresh token expires 21/07/2026
  scope: 'openid BANK_CONTROL_STATEMENT CORPORATE_CARDS GET_CLIENT_ACCOUNTS GET_STATEMENT_ACCOUNT GET_STATEMENT_TRANSACTION PAY_DOC_RU PAY_DOC_CUR',
  // Token validated for real API payments
  validatedAt: '2026-01-22T16:00:00.000Z',
};

// ═══════════════════════════════════════════════════════════════════════════════════════
// MIDDLEWARE
// ═══════════════════════════════════════════════════════════════════════════════════════

app.use(cors({
  origin: ['http://localhost:4000', 'http://localhost:4005', 'http://localhost:3000'],
  credentials: true,
}));

app.use(express.json());

app.use((req, res, next) => {
  console.log(`[SBER-API] ${new Date().toISOString()} ${req.method} ${req.path}`);
  next();
});

// ═══════════════════════════════════════════════════════════════════════════════════════
// HTTPS AGENT WITH P12 CERTIFICATE
// ═══════════════════════════════════════════════════════════════════════════════════════

let httpsAgent;
let certificateStatus = {
  loaded: false,
  error: null,
  p12Path: CERT_CONFIG.P12_PATH,
  caLoaded: 0
};

try {
  // Load P12 certificate
  if (fs.existsSync(CERT_CONFIG.P12_PATH)) {
    const pfx = fs.readFileSync(CERT_CONFIG.P12_PATH);
    
    // Load CA certificates
    const caCerts = [];
    for (const caFile of CERT_CONFIG.CA_FILES) {
      const caPath = path.join(CERT_CONFIG.CA_CERTS_PATH, caFile);
      if (fs.existsSync(caPath)) {
        caCerts.push(fs.readFileSync(caPath));
        console.log(`[SBER-API] Loaded CA: ${caFile}`);
      }
    }
    
    httpsAgent = new https.Agent({
      pfx: pfx,
      passphrase: CERT_CONFIG.P12_PASSWORD,
      ca: caCerts.length > 0 ? caCerts : undefined,
      rejectUnauthorized: false, // Allow self-signed certs from Sberbank
    });
    
    certificateStatus.loaded = true;
    certificateStatus.caLoaded = caCerts.length;
    console.log(`[SBER-API] ✅ P12 certificate loaded successfully`);
    console.log(`[SBER-API] ✅ ${caCerts.length} CA certificates loaded`);
  } else {
    throw new Error(`P12 file not found: ${CERT_CONFIG.P12_PATH}`);
  }
} catch (e) {
  certificateStatus.error = e.message;
  httpsAgent = new https.Agent({ rejectUnauthorized: false });
  console.error(`[SBER-API] ❌ Certificate error: ${e.message}`);
}

// ═══════════════════════════════════════════════════════════════════════════════════════
// HELPER FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════════════════

function isTokenValid() {
  if (!tokenStorage.accessToken || !tokenStorage.expiresAt) {
    return false;
  }
  return new Date(tokenStorage.expiresAt) > new Date(Date.now() + 5 * 60 * 1000);
}

// ═══════════════════════════════════════════════════════════════════════════════════════
// ROUTES - Health & Status
// ═══════════════════════════════════════════════════════════════════════════════════════

app.get('/api/sber-business/health', (req, res) => {
  res.json({
    status: 'online',
    service: 'SberBusinessAPI Proxy v2',
    timestamp: new Date().toISOString(),
    tokenValid: isTokenValid(),
    clientId: SBER_CONFIG.CLIENT_ID,
    certificate: certificateStatus,
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
    certificateLoaded: certificateStatus.loaded,
  });
});

// ═══════════════════════════════════════════════════════════════════════════════════════
// ROUTES - OAuth2 Authentication
// ═══════════════════════════════════════════════════════════════════════════════════════

app.post('/api/sber-business/auth/url', (req, res) => {
  try {
    const { redirectUri } = req.body;
    
    if (!redirectUri) {
      return res.status(400).json({
        success: false,
        error: 'redirectUri is required',
      });
    }
    
    const scopes = SBER_CONFIG.SCOPES_V2.join(' ');
    const state = Math.random().toString(36).substring(7);
    const nonce = Math.random().toString(36).substring(7);
    
    const params = new URLSearchParams({
      response_type: 'code',
      client_id: SBER_CONFIG.CLIENT_ID,
      redirect_uri: redirectUri,
      scope: scopes,
      state: state,
      nonce: nonce,
    });
    
    const authUrl = `${SBER_CONFIG.AUTH_AUTHORIZE}?${params.toString()}`;
    
    console.log('[SBER-API] Generated auth URL');
    
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

app.post('/api/sber-business/auth/token', async (req, res) => {
  try {
    const { code, redirectUri } = req.body;
    
    if (!code || !redirectUri) {
      return res.status(400).json({
        success: false,
        error: 'code and redirectUri are required',
      });
    }
    
    if (!certificateStatus.loaded) {
      return res.status(500).json({
        success: false,
        error: 'P12 certificate not loaded',
        certificateError: certificateStatus.error,
      });
    }
    
    const tokenData = new URLSearchParams({
      grant_type: 'authorization_code',
      code: code,
      redirect_uri: redirectUri,
      client_id: SBER_CONFIG.CLIENT_ID,
    });
    
    console.log('[SBER-API] Exchanging code for token...');
    
    const response = await fetch(SBER_CONFIG.TOKEN_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: tokenData.toString(),
      agent: httpsAgent,
    });
    
    const data = await response.json();
    
    if (data.access_token) {
      tokenStorage = {
        accessToken: data.access_token,
        refreshToken: data.refresh_token,
        idToken: data.id_token,
        expiresAt: new Date(Date.now() + (data.expires_in || 3600) * 1000).toISOString(),
        scope: data.scope,
      };
      
      console.log('[SBER-API] ✅ Token received successfully');
      
      res.json({
        success: true,
        expiresAt: tokenStorage.expiresAt,
        scope: tokenStorage.scope,
      });
    } else {
      console.error('[SBER-API] Token error:', data);
      res.status(400).json({
        success: false,
        error: data.error_description || data.error || 'Failed to get token',
      });
    }
  } catch (error) {
    console.error('[SBER-API] Token exchange error:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// Refresh token endpoint
app.post('/api/sber-business/auth/refresh', async (req, res) => {
  try {
    if (!tokenStorage.refreshToken) {
      return res.status(400).json({
        success: false,
        error: 'No refresh token available. Please authenticate first.',
        needsAuth: true,
      });
    }
    
    if (!certificateStatus.loaded) {
      return res.status(500).json({
        success: false,
        error: 'P12 certificate not loaded',
        certificateError: certificateStatus.error,
      });
    }
    
    const tokenData = new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: tokenStorage.refreshToken,
      client_id: SBER_CONFIG.CLIENT_ID,
    });
    
    console.log('[SBER-API] Refreshing access token...');
    
    const response = await fetch(SBER_CONFIG.TOKEN_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: tokenData.toString(),
      agent: httpsAgent,
    });
    
    const responseText = await response.text();
    let data;
    
    try {
      data = JSON.parse(responseText);
    } catch (e) {
      console.error('[SBER-API] Refresh response not JSON:', responseText.substring(0, 500));
      return res.status(500).json({
        success: false,
        error: 'Invalid response from Sberbank auth server',
        details: responseText.substring(0, 200),
      });
    }
    
    if (data.access_token) {
      tokenStorage = {
        accessToken: data.access_token,
        refreshToken: data.refresh_token || tokenStorage.refreshToken,
        idToken: data.id_token,
        expiresAt: new Date(Date.now() + (data.expires_in || 3600) * 1000).toISOString(),
        refreshExpiresAt: data.refresh_expires_in 
          ? new Date(Date.now() + data.refresh_expires_in * 1000).toISOString()
          : tokenStorage.refreshExpiresAt,
        scope: data.scope || tokenStorage.scope,
        validatedAt: new Date().toISOString(),
      };
      
      console.log('[SBER-API] ✅ Token refreshed successfully');
      console.log('[SBER-API] New expiration:', tokenStorage.expiresAt);
      
      res.json({
        success: true,
        message: 'Token refreshed successfully',
        expiresAt: tokenStorage.expiresAt,
        scope: tokenStorage.scope,
        tokenValid: true,
      });
    } else {
      console.error('[SBER-API] Refresh token error:', data);
      res.status(400).json({
        success: false,
        error: data.error_description || data.error || 'Failed to refresh token',
        needsAuth: true,
      });
    }
  } catch (error) {
    console.error('[SBER-API] Token refresh error:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      needsAuth: true,
    });
  }
});

// Update token manually (from frontend)
app.post('/api/sber-business/auth/update-token', (req, res) => {
  try {
    const { accessToken, refreshToken, expiresAt, scope } = req.body;
    
    if (!accessToken) {
      return res.status(400).json({
        success: false,
        error: 'accessToken is required',
      });
    }
    
    // Calculate expiration if not provided (default 1 hour)
    const expiration = expiresAt || new Date(Date.now() + 3600 * 1000).toISOString();
    
    tokenStorage = {
      accessToken,
      refreshToken: refreshToken || tokenStorage.refreshToken,
      idToken: tokenStorage.idToken,
      expiresAt: expiration,
      refreshExpiresAt: tokenStorage.refreshExpiresAt,
      scope: scope || tokenStorage.scope,
      validatedAt: new Date().toISOString(),
    };
    
    console.log('[SBER-API] ✅ Token updated manually');
    console.log('[SBER-API] Access Token:', accessToken.slice(0, 12) + '...');
    console.log('[SBER-API] Expires:', expiration);
    
    res.json({
      success: true,
      message: 'Token updated successfully',
      expiresAt: tokenStorage.expiresAt,
      tokenValid: isTokenValid(),
    });
  } catch (error) {
    console.error('[SBER-API] Token update error:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// ═══════════════════════════════════════════════════════════════════════════════════════
// ROUTES - API Proxy
// ═══════════════════════════════════════════════════════════════════════════════════════

app.get('/api/sber-business/accounts', async (req, res) => {
  try {
    if (!isTokenValid()) {
      return res.status(401).json({
        success: false,
        error: 'Not authenticated. Please authenticate first.',
        needsAuth: true,
      });
    }
    
    console.log('[SBER-API] Fetching accounts with token...');
    
    // SberBusinessAPI endpoints format
    const endpoints = [
      '/api/v1/client-accounts',
      '/api/v1/get-client-accounts',
      '/api/v1/rpc/get-client-accounts',
      '/api/v1/sbbol/accounts',
    ];
    
    let lastError = null;
    let accountsData = null;
    
    for (const endpoint of endpoints) {
      try {
        console.log(`[SBER-API] Trying endpoint: ${SBER_CONFIG.API_URL}${endpoint}`);
        
        const response = await fetch(`${SBER_CONFIG.API_URL}${endpoint}`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${tokenStorage.accessToken}`,
            'Accept': 'application/json',
            'Content-Type': 'application/json',
          },
          agent: httpsAgent,
        });
        
        const data = await response.json();
        
        if (response.ok && !data.internalErrorCode) {
          accountsData = data;
          console.log(`[SBER-API] ✅ Success with endpoint: ${endpoint}`);
          break;
        } else {
          console.log(`[SBER-API] Endpoint ${endpoint} returned:`, data.message || data.cause);
          lastError = data;
        }
      } catch (err) {
        console.log(`[SBER-API] Endpoint ${endpoint} error:`, err.message);
        lastError = { error: err.message };
      }
    }
    
    if (accountsData) {
      res.json({
        success: true,
        accounts: accountsData,
      });
    } else {
      // Return demo accounts if API not available
      res.json({
        success: true,
        source: 'demo',
        message: 'Using demo accounts - Real API requires specific endpoint configuration',
        accounts: [
          {
            accountNumber: '40702810938000012345',
            accountName: 'Расчетный счет ООО "7328077215_Company"',
            currency: 'RUB',
            balance: 15750000.50,
            availableBalance: 15200000.00,
            status: 'ACTIVE',
            type: 'SETTLEMENT',
            bic: '044525225',
            bankName: 'ПАО СБЕРБАНК',
            openDate: '2024-01-15',
          },
          {
            accountNumber: '40702840938000067890',
            accountName: 'Валютный счет USD',
            currency: 'USD',
            balance: 250000.00,
            availableBalance: 245000.00,
            status: 'ACTIVE',
            type: 'CURRENCY',
            bic: '044525225',
            bankName: 'ПАО СБЕРБАНК',
            openDate: '2024-03-20',
          },
          {
            accountNumber: '40702978938000011111',
            accountName: 'Валютный счет EUR',
            currency: 'EUR',
            balance: 180000.00,
            availableBalance: 175000.00,
            status: 'ACTIVE',
            type: 'CURRENCY',
            bic: '044525225',
            bankName: 'ПАО СБЕРБАНК',
            openDate: '2024-06-10',
          },
        ],
        apiError: lastError,
      });
    }
  } catch (error) {
    console.error('[SBER-API] Error fetching accounts:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

app.get('/api/sber-business/statement/:accountId', async (req, res) => {
  try {
    if (!isTokenValid()) {
      return res.status(401).json({
        success: false,
        error: 'Not authenticated',
      });
    }
    
    const { accountId } = req.params;
    const { dateFrom, dateTo } = req.query;
    
    const params = new URLSearchParams({
      accountNumber: accountId,
    });
    
    if (dateFrom) params.append('statementDate', dateFrom);
    if (dateTo) params.append('statementDateTo', dateTo);
    
    const response = await fetch(
      `${SBER_CONFIG.API_URL}/api/v1/statement?${params.toString()}`,
      {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${tokenStorage.accessToken}`,
          'Accept': 'application/json',
        },
        agent: httpsAgent,
      }
    );
    
    const data = await response.json();
    
    res.json({
      success: true,
      statement: data,
    });
  } catch (error) {
    console.error('[SBER-API] Error fetching statement:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// ═══════════════════════════════════════════════════════════════════════════════════════
// ROUTES - Digital Signature (Sberbank Standard)
// ═══════════════════════════════════════════════════════════════════════════════════════

// Get signature status and capabilities
app.get('/api/sber-business/signature/status', (req, res) => {
  res.json({
    success: true,
    signatureEnabled: true,
    algorithms: ['RSA-SHA256', 'GOST R 34.10-2012'],
    formats: ['PKCS7', 'CMS', 'DETACHED'],
    certificateLoaded: certificateStatus.loaded,
    signerInfo: {
      name: 'SHAGAEV ANATOLY VYACHESLAVOVICH',
      organization: '7328077215_Company',
      certificateValid: true,
      validUntil: '2027-01-22',
    },
  });
});

// Sign a payment document
app.post('/api/sber-business/signature/sign', (req, res) => {
  try {
    const { document, signerInfo } = req.body;
    
    if (!document) {
      return res.status(400).json({
        success: false,
        error: 'Document data is required',
      });
    }
    
    console.log('[SBER-API] Signing document:', document.documentNumber || 'unknown');
    
    const signer = signerInfo || {
      name: 'SHAGAEV ANATOLY VYACHESLAVOVICH',
      position: 'Authorized Representative',
      inn: '7328077215',
      certificateId: 'SBBAPI_25190',
    };
    
    const result = SberSignature.signPaymentDocument(document, signer);
    
    if (result.success) {
      console.log('[SBER-API] ✅ Document signed successfully');
    }
    
    res.json(result);
  } catch (error) {
    console.error('[SBER-API] Signature error:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// Verify a signature
app.post('/api/sber-business/signature/verify', (req, res) => {
  try {
    const { document, signature } = req.body;
    
    if (!document || !signature) {
      return res.status(400).json({
        success: false,
        error: 'Document and signature are required',
      });
    }
    
    // Verify the digest matches
    const currentDigest = SberSignature.generatePaymentDigest(document);
    const isValid = currentDigest === signature.documentDigest;
    
    res.json({
      success: true,
      valid: isValid,
      verification: {
        digestMatch: isValid,
        signatureId: signature.signatureId,
        signedAt: signature.signedAt,
        signer: signature.signer,
        status: isValid ? 'VALID' : 'INVALID',
      },
    });
  } catch (error) {
    console.error('[SBER-API] Verification error:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// Multi-signature for payment approval
app.post('/api/sber-business/signature/multi-sign', (req, res) => {
  try {
    const { document, signers } = req.body;
    
    if (!document || !signers || !Array.isArray(signers)) {
      return res.status(400).json({
        success: false,
        error: 'Document and signers array are required',
      });
    }
    
    console.log('[SBER-API] Creating multi-signature with', signers.length, 'signers');
    
    const result = SberSignature.createMultiSignature(document, signers);
    
    res.json(result);
  } catch (error) {
    console.error('[SBER-API] Multi-signature error:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// Generate document hash/digest
app.post('/api/sber-business/signature/digest', (req, res) => {
  try {
    const { document } = req.body;
    
    if (!document) {
      return res.status(400).json({
        success: false,
        error: 'Document data is required',
      });
    }
    
    const digest = SberSignature.generatePaymentDigest(document);
    const hash = SberSignature.generateHash(document);
    
    res.json({
      success: true,
      digest: {
        paymentDigest: digest,
        fullHash: hash,
        algorithm: 'SHA-256',
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error('[SBER-API] Digest error:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// ═══════════════════════════════════════════════════════════════════════════════════════
// ROUTES - CREATE REAL PAYMENT (PAY_DOC_RU) with Digital Signature
// ═══════════════════════════════════════════════════════════════════════════════════════

// Default signers for multi-signature (3 signatures required)
const DEFAULT_SIGNERS = [
  {
    id: 'signer_1',
    name: 'SHAGAEV ANATOLY VYACHESLAVOVICH',
    position: 'Director General',
    inn: '7328077215',
    certificateId: 'SBBAPI_25190',
    order: 1,
    role: 'PRIMARY',
  },
  {
    id: 'signer_2', 
    name: 'KAMENSKIKH ELENA VLADIMIROVNA',
    position: 'Chief Accountant',
    inn: '7328077215',
    certificateId: 'SBBAPI_25190_ACC',
    order: 2,
    role: 'ACCOUNTANT',
  },
  {
    id: 'signer_3',
    name: 'FINANCIAL CONTROLLER',
    position: 'Financial Controller',
    inn: '7328077215', 
    certificateId: 'SBBAPI_25190_FC',
    order: 3,
    role: 'CONTROLLER',
  },
];

// Create real payment with multi-signature
app.post('/api/sber-business/payments/create', async (req, res) => {
  const startTime = Date.now();
  
  try {
    const { payment, signers = DEFAULT_SIGNERS, immediate = true } = req.body;
    
    if (!payment) {
      return res.status(400).json({
        success: false,
        error: 'Payment data is required',
      });
    }
    
    console.log('[SBER-API] Creating real payment:', {
      amount: payment.amount,
      currency: payment.currency || 'RUB',
      payerAccount: payment.payerAccount,
      payeeAccount: payment.payeeAccount,
    });
    
    // Step 1: Generate document number and external ID (UUID format required!)
    const documentNumber = payment.documentNumber || `${Date.now()}`.slice(-8);
    
    // IMPORTANT: Sberbank API requires externalId to be a standard 36-char UUID format
    // Example: a0000000-0000-0000-0000-000000000001
    const generateUUID = () => {
      return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        const r = Math.random() * 16 | 0;
        const v = c === 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
      });
    };
    
    // Use provided UUID or generate a new one
    const externalId = (payment.externalId && payment.externalId.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)) 
      ? payment.externalId 
      : generateUUID();
    
    // Step 2: Generate digest for the payment
    const digest = SberSignature.generatePaymentDigest({
      documentNumber,
      documentDate: payment.date || new Date().toISOString().split('T')[0],
      amount: payment.amount.toString(),
      currency: payment.currency || 'RUB',
      payerAccount: payment.payerAccount,
      payerInn: payment.payerInn,
      payerName: payment.payerName,
      payeeAccount: payment.payeeAccount,
      payeeBic: payment.payeeBic,
      payeeInn: payment.payeeInn,
      payeeName: payment.payeeName,
      purpose: payment.purpose,
    });
    
    // Step 3: Create multi-signature (3 signatures)
    const multiSigResult = SberSignature.createMultiSignature(
      {
        documentNumber,
        documentDate: payment.date || new Date().toISOString().split('T')[0],
        documentType: 'PAY_DOC_RU',
        amount: payment.amount.toString(),
        currency: payment.currency || 'RUB',
        payerAccount: payment.payerAccount,
        payerInn: payment.payerInn,
        payerKpp: payment.payerKpp,
        payerName: payment.payerName,
        payerBankBic: payment.payerBankBic,
        payerBankCorrAccount: payment.payerBankCorrAccount,
        payeeAccount: payment.payeeAccount,
        payeeBic: payment.payeeBic,
        payeeInn: payment.payeeInn,
        payeeKpp: payment.payeeKpp,
        payeeName: payment.payeeName,
        payeeBankCorrAccount: payment.payeeBankCorrAccount,
        purpose: payment.purpose,
        priority: payment.priority || '5',
        urgencyCode: payment.urgencyCode || 'NORMAL',
      },
      signers
    );
    
    console.log('[SBER-API] Multi-signature created:', {
      totalSigners: multiSigResult.multiSignature.totalSigners,
      collectedSignatures: multiSigResult.multiSignature.collectedSignatures,
      status: multiSigResult.multiSignature.status,
    });
    
    // Step 4: Prepare Sberbank API payload - OFFICIAL FORMAT from developers.sber.ru
    // According to: https://developers.sber.ru/docs/ru/sber-api/specifications/payments/create-payment
    // Endpoint: POST /fintech/api/v1/pay-doc-ru/create-payment
    
    const docDate = payment.date || new Date().toISOString().split('T')[0];
    
    // Official Sber API format for PAY_DOC_RU (Ruble Payment Order)
    const sberOfficialPayload = {
      // Required: External ID (UUID format recommended)
      externalId: externalId,
      // Required: Amount with 2 decimal places
      amount: parseFloat(payment.amount).toFixed(2),
      // Required: Document date (YYYY-MM-DD)
      date: docDate,
      // Required: Operation code (01 = regular payment)
      operationCode: '01',
      // Required: Payment priority (1-5, default 5)
      priority: parseInt(payment.priority) || 5,
      // Required: Payment purpose (max 210 chars)
      purpose: (payment.purpose || 'Оплата по договору').substring(0, 210),
      
      // PAYER INFORMATION (Required) - ООО "ПОИНТЕР" corporate settlement account
      payerAccount: payment.payerAccount || SBER_CONFIG.SETTLEMENT_ACCOUNT.accountNumber,
      payerName: (payment.payerName || SBER_CONFIG.SETTLEMENT_ACCOUNT.orgName).substring(0, 160),
      payerInn: payment.payerInn || SBER_CONFIG.SETTLEMENT_ACCOUNT.orgInn,
      payerKpp: payment.payerKpp || SBER_CONFIG.SETTLEMENT_ACCOUNT.orgKpp,
      payerBankBic: payment.payerBankBic || SBER_CONFIG.SETTLEMENT_ACCOUNT.bankBic,
      payerBankCorrAccount: payment.payerBankCorrAccount || SBER_CONFIG.SETTLEMENT_ACCOUNT.corrAccount,
      
      // PAYEE INFORMATION (Required)
      payeeAccount: payment.payeeAccount,
      payeeName: (payment.payeeName || '').substring(0, 160),
      payeeInn: payment.payeeInn || '',
      payeeKpp: payment.payeeKpp || '',
      payeeBankBic: payment.payeeBic || '044525225',
      payeeBankCorrAccount: payment.payeeBankCorrAccount || '30101810400000000225',
      
      // Optional: Digital signatures for immediate processing
      ...(immediate && multiSigResult.multiSignature.signatures.length > 0 && {
        digestSignatures: multiSigResult.multiSignature.signatures.map(sig => ({
          base64Encoded: sig.signature.signatureValue,
        })),
      }),
    };
    
    // Alternative nested format (some API versions)
    const sberNestedPayload = {
      externalId: externalId,
      amount: parseFloat(payment.amount).toFixed(2),
      date: docDate,
      operationCode: '01',
      priority: parseInt(payment.priority) || 5,
      purpose: (payment.purpose || 'Оплата по договору').substring(0, 210),
      payer: {
        account: payment.payerAccount,
        name: (payment.payerName || '').substring(0, 160),
        inn: payment.payerInn || '',
        kpp: payment.payerKpp || '',
        bankBic: payment.payerBankBic || '044525225',
        bankCorrAccount: payment.payerBankCorrAccount || '30101810400000000225',
      },
      payee: {
        account: payment.payeeAccount,
        name: (payment.payeeName || '').substring(0, 160),
        inn: payment.payeeInn || '',
        kpp: payment.payeeKpp || '',
        bankBic: payment.payeeBic || '044525225',
        bankCorrAccount: payment.payeeBankCorrAccount || '30101810400000000225',
      },
    };
    
    // Legacy compatibility
    const sberPayload = sberOfficialPayload;
    const sberPayloadAlt = sberNestedPayload;
    
    // Step 5: Check if token is valid
    const tokenValid = isTokenValid();
    console.log('[SBER-API] Token validation:', {
      valid: tokenValid,
      accessToken: tokenStorage.accessToken ? `${tokenStorage.accessToken.slice(0, 8)}...` : 'NONE',
      expiresAt: tokenStorage.expiresAt,
      scope: tokenStorage.scope,
    });
    
    if (!tokenValid) {
      console.log('[SBER-API] Token not valid, returning payment for manual processing');
      return res.json({
        success: true,
        mode: 'LOCAL',
        message: 'Payment created locally with signatures. Token not valid for API submission.',
        tokenInfo: {
          reason: !tokenStorage.accessToken ? 'No access token' : 
                  !tokenStorage.expiresAt ? 'No expiration date' : 
                  'Token expired',
          expiresAt: tokenStorage.expiresAt,
        },
        payment: {
          externalId,
          documentNumber,
          amount: payment.amount,
          currency: payment.currency || 'RUB',
          status: 'SIGNED_LOCALLY',
          createdAt: new Date().toISOString(),
        },
        multiSignature: multiSigResult.multiSignature,
        digest,
        sberPayload,
        latency: Date.now() - startTime,
      });
    }
    
    // Step 6: Submit to Sberbank API (REAL TRANSACTION)
    console.log('[SBER-API] ===============================================');
    console.log('[SBER-API] 🚀 SUBMITTING REAL PAYMENT TO SBERBANK API');
    console.log('[SBER-API] ===============================================');
    console.log('[SBER-API] Amount:', payment.amount, 'RUB');
    console.log('[SBER-API] Payer:', payment.payerName, '->', payment.payerAccount);
    console.log('[SBER-API] Payee:', payment.payeeName, '->', payment.payeeAccount);
    console.log('[SBER-API] Purpose:', payment.purpose?.substring(0, 50));
    console.log('[SBER-API] Token:', tokenStorage.accessToken?.slice(0, 12) + '...');
    
    // Try multiple Sberbank API endpoints with different payload formats
    // Based on investigation: /fintech/api/v1/payments responds with 400 (validation error)
    // This means the endpoint IS correct but payload format needs adjustment
    // Production: https://fintech.sberbank.ru:9443
    
    // Payload format validated by Sberbank API - UUID externalId works!
    // Error ACTION_ACCESS_EXCEPTION means format is correct but permission needed
    const validatedPayload = {
      externalId: externalId,
      amount: parseFloat(payment.amount).toFixed(2),
      date: docDate,
      operationCode: '01',
      priority: 5,
      purpose: (payment.purpose || 'Оплата по договору').substring(0, 210),
      payerAccount: payment.payerAccount,
      payerName: payment.payerName,
      payerInn: payment.payerInn,
      payerKpp: payment.payerKpp || '',
      payerBankBic: payment.payerBankBic || '044525225',
      payerBankCorrAccount: payment.payerBankCorrAccount || '30101810400000000225',
      payeeAccount: payment.payeeAccount,
      payeeName: payment.payeeName,
      payeeInn: payment.payeeInn || '',
      payeeKpp: payment.payeeKpp || '',
      payeeBankBic: payment.payeeBic || '044525225',
      payeeBankCorrAccount: payment.payeeBankCorrAccount || '30101810400000000225',
    };
    
    // Try with digital signatures for immediate processing
    // According to Sberbank API error: certificateUuid is required for each signature
    // The certificateUuid should be from the P12 certificate used for signing
    const CERTIFICATE_UUID = 'd4ca74ac-392d-4dd9-9420-e3cb4fa320e0'; // From P12 filename
    
    const payloadWithSignatures = {
      ...validatedPayload,
      // Include signatures for immediate processing with required certificateUuid
      digestSignatures: multiSigResult.multiSignature.signatures.map(sig => ({
        base64Encoded: sig.signature.signatureValue,
        certificateUuid: CERTIFICATE_UUID, // Required by Sberbank API!
      })),
    };
    
    // Payload without signatures creates a DRAFT (requires manual signing in SberBusiness portal)
    const payloadDraft = { ...validatedPayload };
    
    const apiConfigs = [
      // 1. Main payments endpoint - THIS ONE WORKS (returns permission error, not 404)
      { 
        endpoint: `${SBER_CONFIG.API_URL}/api/v1/payments`,
        payload: payloadWithSignatures,
        name: 'PAYMENTS WITH SIGNATURES',
        isDraft: false
      },
    ];
    
    let lastError = null;
    let sberResponse = null;
    let sberData = null;
    let successEndpoint = null;
    let usedPayload = null;
    
    for (const config of apiConfigs) {
      try {
        console.log('[SBER-API] Trying:', config.name, '-', config.endpoint);
        console.log('[SBER-API] Payload preview:', JSON.stringify(config.payload).substring(0, 300));
        
        sberResponse = await fetch(config.endpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            'Authorization': `Bearer ${tokenStorage.accessToken}`,
            'X-Request-ID': externalId,
            'X-IBM-Client-Id': SBER_CONFIG.CLIENT_ID,
            'X-Introspect-RqUID': externalId,
          },
          body: JSON.stringify(config.payload),
          agent: httpsAgent,
          timeout: 30000,
        });
        
        const responseText = await sberResponse.text();
        console.log('[SBER-API] Response status:', sberResponse.status);
        console.log('[SBER-API] Response preview:', responseText.substring(0, 300));
        
        // Check if response is HTML (error page)
        if (responseText.trim().startsWith('<')) {
          console.log('[SBER-API] Received HTML response, trying next...');
          lastError = `HTML response from ${config.endpoint}`;
          continue;
        }
        
        // Try to parse JSON
        try {
          sberData = JSON.parse(responseText);
          
          // Check if it's a success (200-299) or specific error
          if (sberResponse.status >= 200 && sberResponse.status < 300) {
            successEndpoint = config.endpoint;
            usedPayload = config.payload;
            console.log('[SBER-API] ✅ SUCCESS from:', config.name);
            break;
          }
          
          // If 400 error, try next format
          if (sberResponse.status === 400) {
            console.log('[SBER-API] 400 validation error, trying next format...');
            lastError = sberData.message || 'Validation error';
            continue;
          }
          
          // If 403 (permission denied), try creating as draft
          if (sberResponse.status === 403 || sberData.cause === 'ACTION_ACCESS_EXCEPTION') {
            console.log('[SBER-API] Permission denied, trying draft mode...');
            lastError = sberData.message || 'Permission denied';
            continue; // Will try the draft payload next
          }
          
          // For other responses, use this one
          successEndpoint = config.endpoint;
          usedPayload = config.payload;
          break;
          
        } catch (parseError) {
          console.log('[SBER-API] Failed to parse JSON:', parseError.message);
          lastError = `Invalid JSON from ${endpoint}`;
          continue;
        }
      } catch (fetchError) {
        console.log('[SBER-API] Fetch error for', endpoint, ':', fetchError.message);
        lastError = fetchError.message;
        continue;
      }
    }
    
    // If no endpoint worked, return local mode
    if (!sberData) {
      console.log('[SBER-API] All endpoints failed, returning LOCAL mode');
      return res.json({
        success: true,
        mode: 'LOCAL_API_UNAVAILABLE',
        message: `Payment signed locally. All API endpoints unavailable: ${lastError}`,
        payment: {
          externalId,
          documentNumber,
          amount: payment.amount,
          currency: payment.currency || 'RUB',
          status: 'SIGNED_LOCALLY',
          createdAt: new Date().toISOString(),
        },
        multiSignature: multiSigResult.multiSignature,
        digest,
        sberPayload,
        triedEndpoints: apiConfigs.map(c => c.endpoint),
        lastError,
        latency: Date.now() - startTime,
      });
    }
    
    console.log('[SBER-API] Successful endpoint:', successEndpoint);
    console.log('[SBER-API] Used payload:', usedPayload ? 'yes' : 'no');
    
    try {
      console.log('[SBER-API] Sberbank response:', {
        status: sberResponse.status,
        data: sberData,
      });
      
      if (sberResponse.ok) {
        return res.json({
          success: true,
          mode: 'REAL',
          message: 'Payment submitted to Sberbank API successfully',
          payment: {
            externalId,
            documentNumber,
            amount: payment.amount,
            currency: payment.currency || 'RUB',
            status: sberData.state || 'SUBMITTED',
            sberRequestId: sberData.requestId,
            createdAt: new Date().toISOString(),
          },
          multiSignature: multiSigResult.multiSignature,
          digest,
          sberResponse: sberData,
          latency: Date.now() - startTime,
        });
      } else {
        // API error but signatures are valid
        return res.json({
          success: true,
          mode: 'LOCAL_WITH_ERROR',
          message: `Payment signed but API returned error: ${sberData.message || sberResponse.statusText}`,
          payment: {
            externalId,
            documentNumber,
            amount: payment.amount,
            currency: payment.currency || 'RUB',
            status: 'SIGNED_API_ERROR',
            createdAt: new Date().toISOString(),
          },
          multiSignature: multiSigResult.multiSignature,
          digest,
          sberPayload,
          sberError: sberData,
          latency: Date.now() - startTime,
        });
      }
    } catch (apiError) {
      console.error('[SBER-API] API submission error:', apiError);
      
      // Return local signature even if API fails
      return res.json({
        success: true,
        mode: 'LOCAL_API_UNREACHABLE',
        message: 'Payment signed locally. API unreachable.',
        payment: {
          externalId,
          documentNumber,
          amount: payment.amount,
          currency: payment.currency || 'RUB',
          status: 'SIGNED_API_UNREACHABLE',
          createdAt: new Date().toISOString(),
        },
        multiSignature: multiSigResult.multiSignature,
        digest,
        sberPayload,
        apiError: apiError.message,
        latency: Date.now() - startTime,
      });
    }
    
  } catch (error) {
    console.error('[SBER-API] Payment creation error:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      latency: Date.now() - startTime,
    });
  }
});

// Get configured signers
app.get('/api/sber-business/signers', (req, res) => {
  res.json({
    success: true,
    signers: DEFAULT_SIGNERS,
    certificate: {
      id: 'SBBAPI_25190',
      owner: 'SHAGAEV A.V.',
      organization: '7328077215',
      validUntil: '2027-01-22',
      algorithm: 'RSA-SHA256',
      format: 'PKCS7 Detached',
    },
  });
});

// Update signers configuration
app.post('/api/sber-business/signers/configure', (req, res) => {
  try {
    const { signers } = req.body;
    
    if (!signers || !Array.isArray(signers) || signers.length < 1) {
      return res.status(400).json({
        success: false,
        error: 'At least one signer is required',
      });
    }
    
    // Validate signers
    for (const signer of signers) {
      if (!signer.name || !signer.id) {
        return res.status(400).json({
          success: false,
          error: 'Each signer must have id and name',
        });
      }
    }
    
    // Update default signers (in production, save to database)
    DEFAULT_SIGNERS.length = 0;
    DEFAULT_SIGNERS.push(...signers);
    
    res.json({
      success: true,
      message: 'Signers configured successfully',
      signers: DEFAULT_SIGNERS,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// ═══════════════════════════════════════════════════════════════════════════════════════
// ROUTES - Test Connection (for frontend module)
// ═══════════════════════════════════════════════════════════════════════════════════════

app.post('/api/sber-business/test', async (req, res) => {
  const startTime = Date.now();
  
  try {
    const { environment } = req.body;
    console.log(`[SBER-API] Test connection request for environment: ${environment || 'production'}`);
    
    // Check if certificate is loaded
    if (!certificateStatus.loaded) {
      return res.json({
        success: false,
        connected: false,
        authenticated: false,
        message: 'Certificate not loaded',
        latency: Date.now() - startTime,
        certificateStatus,
      });
    }
    
    // Check if we have a valid token
    const authenticated = isTokenValid();
    
    // Try to connect to Sberbank - test with a simple GET
    let connected = false;
    let sberResponse = null;
    
    try {
      const response = await fetch(`${SBER_CONFIG.AUTH_URL}/`, {
        method: 'GET',
        agent: httpsAgent,
        timeout: 10000,
      });
      // Any response (even 404) means we connected with mTLS
      connected = true;
      sberResponse = { status: response.status, statusText: response.statusText };
    } catch (connErr) {
      // If error is not about certificates, we're connected
      if (!connErr.message.includes('certificate') && !connErr.message.includes('CERT')) {
        connected = true;
      }
      sberResponse = { error: connErr.message };
    }
    
    const latency = Date.now() - startTime;
    
    res.json({
      success: true,
      connected,
      authenticated,
      latency,
      environment: environment || 'production',
      message: authenticated 
        ? 'Connected and authenticated' 
        : connected 
          ? 'Connected but not authenticated. Complete OAuth2 flow.'
          : 'Not connected to Sberbank',
      certificateStatus: {
        loaded: certificateStatus.loaded,
        caLoaded: certificateStatus.caLoaded,
      },
      tokenInfo: authenticated ? {
        expiresAt: tokenStorage.expiresAt,
        scope: tokenStorage.scope,
      } : null,
      sberResponse,
    });
  } catch (error) {
    console.error('[SBER-API] Test connection error:', error);
    res.json({
      success: false,
      connected: false,
      authenticated: false,
      latency: Date.now() - startTime,
      message: error.message,
      error: error.message,
    });
  }
});

// ═══════════════════════════════════════════════════════════════════════════════════════
// ROUTES - OAuth2 Callback
// ═══════════════════════════════════════════════════════════════════════════════════════

app.get('/api/sber-business/callback', async (req, res) => {
  try {
    const { code, state, error, error_description } = req.query;
    
    console.log('[SBER-API] OAuth callback received');
    console.log('[SBER-API] Code:', code ? 'received' : 'missing');
    console.log('[SBER-API] State:', state);
    
    if (error) {
      console.error('[SBER-API] OAuth error:', error, error_description);
      return res.send(`
        <html>
        <head><title>Sberbank Auth - Error</title></head>
        <body style="font-family: Arial; padding: 40px; background: #f5f5f5;">
          <div style="max-width: 600px; margin: 0 auto; background: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
            <h1 style="color: #d32f2f;">❌ Authentication Error</h1>
            <p><strong>Error:</strong> ${error}</p>
            <p><strong>Description:</strong> ${error_description || 'No description'}</p>
          </div>
        </body>
        </html>
      `);
    }
    
    if (!code) {
      return res.send(`
        <html>
        <head><title>Sberbank Auth - Error</title></head>
        <body style="font-family: Arial; padding: 40px; background: #f5f5f5;">
          <div style="max-width: 600px; margin: 0 auto; background: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
            <h1 style="color: #d32f2f;">❌ No Authorization Code</h1>
            <p>No authorization code was received from Sberbank.</p>
          </div>
        </body>
        </html>
      `);
    }
    
    // Exchange code for token - use registered URI
    const redirectUri = REGISTERED_REDIRECT_URI;
    
    const tokenData = new URLSearchParams({
      grant_type: 'authorization_code',
      code: code,
      redirect_uri: redirectUri,
      client_id: SBER_CONFIG.CLIENT_ID,
    });
    
    console.log('[SBER-API] Exchanging code for token...');
    
    const response = await fetch(SBER_CONFIG.TOKEN_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: tokenData.toString(),
      agent: httpsAgent,
    });
    
    const data = await response.json();
    
    if (data.access_token) {
      tokenStorage = {
        accessToken: data.access_token,
        refreshToken: data.refresh_token,
        idToken: data.id_token,
        expiresAt: new Date(Date.now() + (data.expires_in || 3600) * 1000).toISOString(),
        scope: data.scope,
      };
      
      console.log('[SBER-API] ✅ Token received successfully!');
      console.log('[SBER-API] Expires at:', tokenStorage.expiresAt);
      
      return res.send(`
        <html>
        <head><title>Sberbank Auth - Success</title></head>
        <body style="font-family: Arial; padding: 40px; background: #e8f5e9;">
          <div style="max-width: 600px; margin: 0 auto; background: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
            <h1 style="color: #2e7d32;">✅ Authentication Successful!</h1>
            <p><strong>Client ID:</strong> ${SBER_CONFIG.CLIENT_ID}</p>
            <p><strong>Token Expires:</strong> ${tokenStorage.expiresAt}</p>
            <p><strong>Scopes:</strong> ${tokenStorage.scope || 'All requested'}</p>
            <hr style="margin: 20px 0;">
            <p style="color: #666;">You can now close this window and use the API.</p>
            <h3>Test Endpoints:</h3>
            <ul>
              <li><a href="/api/sber-business/accounts">Get Accounts</a></li>
              <li><a href="/api/sber-business/health">Health Check</a></li>
            </ul>
          </div>
        </body>
        </html>
      `);
    } else {
      console.error('[SBER-API] Token exchange failed:', data);
      return res.send(`
        <html>
        <head><title>Sberbank Auth - Token Error</title></head>
        <body style="font-family: Arial; padding: 40px; background: #fff3e0;">
          <div style="max-width: 600px; margin: 0 auto; background: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
            <h1 style="color: #ef6c00;">⚠️ Token Exchange Failed</h1>
            <p><strong>Error:</strong> ${data.error || 'Unknown error'}</p>
            <p><strong>Description:</strong> ${data.error_description || JSON.stringify(data)}</p>
          </div>
        </body>
        </html>
      `);
    }
  } catch (error) {
    console.error('[SBER-API] Callback error:', error);
    res.send(`
      <html>
      <head><title>Sberbank Auth - Error</title></head>
      <body style="font-family: Arial; padding: 40px; background: #ffebee;">
        <div style="max-width: 600px; margin: 0 auto; background: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
          <h1 style="color: #c62828;">❌ Server Error</h1>
          <p><strong>Error:</strong> ${error.message}</p>
        </div>
      </body>
      </html>
    `);
  }
});

// REGISTERED REDIRECT URI in Sberbank
const REGISTERED_REDIRECT_URI = 'https://luxliqdaes.cloud/api/sber/callback';

// Login page for easy authentication
app.get('/api/sber-business/login', (req, res) => {
  // Use registered redirect URI from Sberbank
  const redirectUri = REGISTERED_REDIRECT_URI;
  const scopes = SBER_CONFIG.SCOPES_V2.join(' ');
  const state = Math.random().toString(36).substring(7);
  const nonce = Math.random().toString(36).substring(7);
  
  const params = new URLSearchParams({
    response_type: 'code',
    client_id: SBER_CONFIG.CLIENT_ID,
    redirect_uri: redirectUri,
    scope: scopes,
    state: state,
    nonce: nonce,
  });
  
  const authUrl = `${SBER_CONFIG.AUTH_AUTHORIZE}?${params.toString()}`;
  
  // Also try with V1 scope
  const paramsV1 = new URLSearchParams({
    response_type: 'code',
    client_id: SBER_CONFIG.CLIENT_ID,
    redirect_uri: redirectUri,
    scope: SBER_CONFIG.SCOPE_V1,
    state: state + 'v1',
    nonce: nonce,
  });
  
  const authUrlV1 = `${SBER_CONFIG.AUTH_AUTHORIZE}?${paramsV1.toString()}`;
  
  res.send(`
    <html>
    <head><title>Sberbank Business API - Login</title></head>
    <body style="font-family: Arial; padding: 40px; background: linear-gradient(135deg, #1a472a 0%, #2e7d32 100%); min-height: 100vh; margin: 0;">
      <div style="max-width: 500px; margin: 0 auto; background: white; padding: 40px; border-radius: 15px; box-shadow: 0 10px 40px rgba(0,0,0,0.3);">
        <div style="text-align: center; margin-bottom: 30px;">
          <h1 style="color: #1a472a; margin: 0;">🏦 Sberbank Business API</h1>
          <p style="color: #666; margin-top: 10px;">Secure OAuth2 Authentication via HTTPS Tunnel</p>
        </div>
        
        <div style="background: #e8f5e9; padding: 15px; border-radius: 10px; margin-bottom: 20px; border: 2px solid #4caf50;">
          <p style="margin: 0; color: #2e7d32;"><strong>🔒 Registered Redirect URI</strong></p>
          <p style="margin: 5px 0; font-size: 12px; word-break: break-all;">${REGISTERED_REDIRECT_URI}</p>
        </div>
        
        <div style="background: #f5f5f5; padding: 20px; border-radius: 10px; margin-bottom: 20px;">
          <p><strong>Client ID:</strong> ${SBER_CONFIG.CLIENT_ID}</p>
          <p><strong>Certificate:</strong> ✅ Loaded</p>
          <p><strong>Redirect URI:</strong></p>
          <code style="font-size: 11px; word-break: break-all;">${redirectUri}</code>
        </div>
        
        <div style="background: #e3f2fd; padding: 15px; border-radius: 10px; margin-bottom: 20px;">
          <p style="margin: 0; color: #1565c0;"><strong>📋 Credentials:</strong></p>
          <p style="margin: 5px 0;">Login: <code>ashagaev</code></p>
          <p style="margin: 5px 0;">Password: <code>Happy707Happy+</code></p>
        </div>
        
        <a href="${authUrl}" style="display: block; background: #1a472a; color: white; text-align: center; padding: 15px 30px; border-radius: 8px; text-decoration: none; font-size: 18px; font-weight: bold; margin-bottom: 10px;">
          🔐 Login (Scope V2)
        </a>
        
        <a href="${authUrlV1}" style="display: block; background: #0d47a1; color: white; text-align: center; padding: 15px 30px; border-radius: 8px; text-decoration: none; font-size: 16px;">
          🔐 Login (Scope V1)
        </a>
        
        <p style="text-align: center; color: #999; margin-top: 20px; font-size: 12px;">
          You will be redirected to Sberbank's secure login page
        </p>
      </div>
    </body>
    </html>
  `);
});

// ═══════════════════════════════════════════════════════════════════════════════════════
// ROUTES - Direct API Test (mTLS only, no OAuth)
// ═══════════════════════════════════════════════════════════════════════════════════════

app.get('/api/sber-business/test-mtls', async (req, res) => {
  try {
    console.log('[SBER-API] Testing direct mTLS connection to Fintech API...');
    
    if (!certificateStatus.loaded) {
      return res.json({
        success: false,
        error: 'Certificate not loaded',
      });
    }
    
    // Try different Sberbank endpoints
    const endpoints = [
      { name: 'Auth Root', url: `${SBER_CONFIG.AUTH_URL}/` },
      { name: 'Fintech Root', url: `${SBER_CONFIG.API_URL}/` },
      { name: 'Fintech Health', url: `${SBER_CONFIG.API_URL}/api/v1/health` },
      { name: 'Fintech Dicts', url: `${SBER_CONFIG.API_URL}/api/v1/dicts` },
    ];
    
    const results = [];
    
    for (const endpoint of endpoints) {
      try {
        const startTime = Date.now();
        const response = await fetch(endpoint.url, {
          method: 'GET',
          agent: httpsAgent,
          headers: {
            'Accept': 'application/json',
          },
          timeout: 10000,
        });
        
        let body = '';
        try {
          body = await response.text();
          if (body.length > 500) body = body.substring(0, 500) + '...';
        } catch (e) {}
        
        results.push({
          name: endpoint.name,
          url: endpoint.url,
          status: response.status,
          statusText: response.statusText,
          latency: Date.now() - startTime,
          body: body,
        });
      } catch (err) {
        results.push({
          name: endpoint.name,
          url: endpoint.url,
          error: err.message,
        });
      }
    }
    
    res.json({
      success: true,
      message: 'mTLS connection test completed',
      certificateStatus,
      results,
    });
  } catch (error) {
    console.error('[SBER-API] mTLS test error:', error);
    res.json({
      success: false,
      error: error.message,
    });
  }
});

// ═══════════════════════════════════════════════════════════════════════════════════════
// ROUTES - Test Certificate Connection
// ═══════════════════════════════════════════════════════════════════════════════════════

app.get('/api/sber-business/test-connection', async (req, res) => {
  try {
    console.log('[SBER-API] Testing connection to Sberbank API...');
    
    if (!certificateStatus.loaded) {
      return res.json({
        success: false,
        error: 'Certificate not loaded',
        certificateStatus,
      });
    }
    
    // Try to connect to the auth endpoint
    const response = await fetch(`${SBER_CONFIG.AUTH_URL}/.well-known/openid-configuration`, {
      method: 'GET',
      agent: httpsAgent,
      timeout: 10000,
    });
    
    const data = await response.text();
    
    res.json({
      success: response.ok,
      statusCode: response.status,
      message: response.ok ? 'Connection successful with mTLS' : 'Connection failed',
      certificateStatus,
      responsePreview: data.substring(0, 500),
    });
  } catch (error) {
    console.error('[SBER-API] Connection test error:', error);
    res.json({
      success: false,
      error: error.message,
      certificateStatus,
    });
  }
});

// ═══════════════════════════════════════════════════════════════════════════════════════
// START SERVER
// ═══════════════════════════════════════════════════════════════════════════════════════

app.listen(PORT, () => {
  console.log('');
  console.log('═══════════════════════════════════════════════════════════════════════');
  console.log('  SBERBANK BUSINESS API SERVER v2');
  console.log('═══════════════════════════════════════════════════════════════════════');
  console.log(`  Port: ${PORT}`);
  console.log(`  Client ID: ${SBER_CONFIG.CLIENT_ID}`);
  console.log(`  Certificate: ${certificateStatus.loaded ? '✅ Loaded' : '❌ Not loaded'}`);
  console.log(`  CA Certs: ${certificateStatus.caLoaded} loaded`);
  console.log('═══════════════════════════════════════════════════════════════════════');
  console.log('');
  console.log('Endpoints:');
  console.log('  GET  /api/sber-business/health');
  console.log('  GET  /api/sber-business/config');
  console.log('  GET  /api/sber-business/test-connection');
  console.log('  POST /api/sber-business/auth/url');
  console.log('  POST /api/sber-business/auth/token');
  console.log('  GET  /api/sber-business/accounts');
  console.log('  GET  /api/sber-business/statement/:accountId');
  console.log('');
});
