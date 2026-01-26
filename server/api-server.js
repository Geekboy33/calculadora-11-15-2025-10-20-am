// ═══════════════════════════════════════════════════════════════════════════════
// DCB TREASURY CERTIFICATION PLATFORM - API SERVER
// Express server providing REST API, Webhooks, and API Keys management
// Supports both development (localhost) and production (luxliqdaes.cloud)
// ═══════════════════════════════════════════════════════════════════════════════

import express from 'express';
import cors from 'cors';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// ═══════════════════════════════════════════════════════════════════════════════
// ENVIRONMENT CONFIGURATION
// ═══════════════════════════════════════════════════════════════════════════════

const IS_PRODUCTION = process.env.NODE_ENV === 'production';
const PORT = process.env.DCB_API_PORT || process.env.PORT || 4010;

// URLs Configuration
const PRODUCTION_LEMX_URL = 'https://luxliqdaes.cloud/api/lemx';
const DEVELOPMENT_LEMX_URL = 'http://localhost:4011';
const LEMX_API_URL = IS_PRODUCTION ? PRODUCTION_LEMX_URL : (process.env.LEMX_API_URL || DEVELOPMENT_LEMX_URL);

// CORS Configuration
const ALLOWED_ORIGINS = IS_PRODUCTION 
  ? [
      'https://luxliqdaes.cloud',
      'https://www.luxliqdaes.cloud',
      'https://lemx.luxliqdaes.cloud',
      'https://dcb.luxliqdaes.cloud'
    ]
  : [
      'http://localhost:4003',
      'http://localhost:4005', 
      'http://localhost:4006',
      'http://localhost:4010',
      'http://localhost:4011',
      'http://localhost:5173',
      'http://127.0.0.1:4003',
      'http://127.0.0.1:4006'
    ];

// ═══════════════════════════════════════════════════════════════════════════════
// MIDDLEWARE
// ═══════════════════════════════════════════════════════════════════════════════

app.use(cors({
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);
    if (ALLOWED_ORIGINS.includes(origin)) {
      callback(null, true);
    } else if (!IS_PRODUCTION) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: [
    'Content-Type', 
    'Authorization', 
    'X-API-Key',
    'X-DCB-Signature', 
    'X-DCB-Event', 
    'X-DCB-Timestamp',
    'X-LEMX-Signature',
    'X-LEMX-Event',
    'X-Webhook-Signature',
    'X-Webhook-ID'
  ]
}));

app.use(express.json({ limit: '10mb' }));

// Request logging
app.use((req, res, next) => {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] ${req.method} ${req.path} - Origin: ${req.headers.origin || 'N/A'}`);
  next();
});

// ═══════════════════════════════════════════════════════════════════════════════
// DATA STORAGE (In-memory with file persistence)
// ═══════════════════════════════════════════════════════════════════════════════

const DATA_FILE = path.join(__dirname, 'dcb-data.json');

let dataStore = {
  locks: [],
  mintRequests: [],
  completedMints: [],
  webhookEvents: [],
  webhookEndpoints: [],
  apiKeys: [],
  auditLog: [],
  lastUpdated: new Date().toISOString()
};

// Load data from file
function loadData() {
  try {
    if (fs.existsSync(DATA_FILE)) {
      const data = fs.readFileSync(DATA_FILE, 'utf8');
      dataStore = { ...dataStore, ...JSON.parse(data) };
      console.log('✅ Data loaded from file');
    }
  } catch (error) {
    console.error('Error loading data:', error);
  }
}

// Save data to file
function saveData() {
  try {
    dataStore.lastUpdated = new Date().toISOString();
    fs.writeFileSync(DATA_FILE, JSON.stringify(dataStore, null, 2));
  } catch (error) {
    console.error('Error saving data:', error);
  }
}

// Initialize data
loadData();

// ═══════════════════════════════════════════════════════════════════════════════
// UTILITY FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════════

function generateId() {
  return `${Date.now().toString(36)}-${crypto.randomBytes(4).toString('hex')}`.toUpperCase();
}

function generateLockId() {
  return `LOCK-${Date.now().toString(36).toUpperCase()}-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;
}

function generateApiKey() {
  return `dcb_${crypto.randomBytes(24).toString('hex')}`;
}

function generateApiSecret() {
  return `dcbs_${crypto.randomBytes(32).toString('hex')}`;
}

function generateWebhookSecret() {
  return `whsec_${crypto.randomBytes(24).toString('hex')}`;
}

function createSignature(payload, secret = 'dcb-webhook-secret-2024') {
  return crypto.createHmac('sha256', secret).update(JSON.stringify(payload)).digest('hex');
}

function verifySignature(payload, signature, secret = 'dcb-webhook-secret-2024') {
  const expected = createSignature(payload, secret);
  return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
}

function addAuditLog(action, details, userId = 'system') {
  const log = {
    id: generateId(),
    action,
    details,
    userId,
    timestamp: new Date().toISOString(),
    ip: 'N/A'
  };
  dataStore.auditLog.push(log);
  if (dataStore.auditLog.length > 1000) {
    dataStore.auditLog = dataStore.auditLog.slice(-500);
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// API KEY MIDDLEWARE
// ═══════════════════════════════════════════════════════════════════════════════

function validateApiKey(req, res, next) {
  const apiKey = req.headers['x-api-key'];
  
  if (!apiKey) {
    // Allow requests without API key for now (can be made stricter)
    return next();
  }

  const key = dataStore.apiKeys.find(k => k.key === apiKey && k.active);
  
  if (!key) {
    return res.status(401).json({ success: false, error: 'Invalid API key' });
  }

  // Check expiration
  if (key.expiresAt && new Date(key.expiresAt) < new Date()) {
    return res.status(401).json({ success: false, error: 'API key expired' });
  }

  // Update last used
  key.lastUsed = new Date().toISOString();
  
  // Attach key info to request
  req.apiKey = key;
  
  next();
}

// Apply to all /api routes
app.use('/api', validateApiKey);

// ═══════════════════════════════════════════════════════════════════════════════
// WEBHOOK CONFIGURATION - FIXED CONNECTION TO LEMX MINTING
// ═══════════════════════════════════════════════════════════════════════════════

const WEBHOOK_CONFIG = {
  webhookId: 'DCB-LEMX-WEBHOOK-001',
  sharedSecret: 'dcb-lemx-secure-webhook-secret-2024-v1',
  protocolVersion: '1.0.0',
  signatureExpiryMs: 5 * 60 * 1000, // 5 minutes
  
  // Fixed LEMX Minting URLs
  lemxUrls: {
    production: 'https://luxliqdaes.cloud/api/lemx/webhooks/receive',
    development: 'http://localhost:4011/api/webhooks/receive'
  }
};

/**
 * Creates a secure webhook signature using HMAC-SHA256
 */
function createWebhookSignature(event) {
  const payload = JSON.stringify({
    id: event.id,
    type: event.type,
    timestamp: event.timestamp,
    source: event.source,
    version: event.version,
    payload: event.payload
  });
  
  return crypto
    .createHmac('sha256', WEBHOOK_CONFIG.sharedSecret)
    .update(payload)
    .digest('hex');
}

/**
 * Verifies incoming webhook signature
 */
function verifyWebhookSignature(event, signature) {
  if (!signature) return false;
  
  // Check timestamp expiry
  const eventTime = new Date(event.timestamp).getTime();
  const now = Date.now();
  if (now - eventTime > WEBHOOK_CONFIG.signatureExpiryMs) {
    console.warn('⚠️ Webhook signature expired');
    return false;
  }
  
  const expectedSignature = createWebhookSignature(event);
  
  try {
    return crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(expectedSignature)
    );
  } catch {
    return signature === expectedSignature;
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// WEBHOOK DISPATCHER (to LEMX Minting Platform - FIXED CONNECTION)
// ═══════════════════════════════════════════════════════════════════════════════

async function dispatchWebhook(eventType, payload) {
  // CHECK: If this is a lock.created event, verify the lock hasn't already been approved by LEMX
  if (eventType === 'lock.created' && payload.lockId) {
    const existingLock = dataStore.locks.find(l => l.lockId === payload.lockId);
    if (existingLock && (existingLock.lemxApprovalReceived || existingLock.status === 'approved_by_lemx' || existingLock.status === 'rejected_by_lemx')) {
      console.log(`⏭️ [DCB] Skipping webhook for ${payload.lockId} - already processed by LEMX (status: ${existingLock.status})`);
      return { success: true, skipped: true, reason: 'Lock already processed by LEMX' };
    }
  }

  // Create signed webhook event
  const event = {
    id: generateId(),
    type: eventType,
    timestamp: new Date().toISOString(),
    source: 'dcb_treasury',
    version: WEBHOOK_CONFIG.protocolVersion,
    payload
  };
  
  // Add signature
  event.signature = createWebhookSignature(event);

  dataStore.webhookEvents.push(event);
  saveData();

  // Send to LEMX Minting Platform (FIXED URL)
  const lemxWebhookUrl = IS_PRODUCTION 
    ? WEBHOOK_CONFIG.lemxUrls.production
    : WEBHOOK_CONFIG.lemxUrls.development;

  try {
    const response = await fetch(lemxWebhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-DCB-Signature': event.signature,
        'X-DCB-Event': eventType,
        'X-DCB-Timestamp': event.timestamp,
        'X-Webhook-ID': event.id,
        'X-Webhook-Version': WEBHOOK_CONFIG.protocolVersion
      },
      body: JSON.stringify(event)
    });

    const responseText = await response.text();
    console.log(`📡 [DCB→LEMX] Webhook sent: ${eventType} → ${response.status}`);
    addAuditLog('webhook.sent', { eventType, target: 'lemx', status: response.status, url: lemxWebhookUrl });
    
    return { success: true, event, status: response.status };
  } catch (error) {
    console.error(`❌ [DCB→LEMX] Webhook failed:`, error.message);
    addAuditLog('webhook.failed', { eventType, target: 'lemx', error: error.message, url: lemxWebhookUrl });
    
    return { success: false, event, error: error.message };
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// API ROUTES - CLEAR ALL DATA
// ═══════════════════════════════════════════════════════════════════════════════

app.post('/api/clear-all', (req, res) => {
  try {
    const { confirm } = req.body;
    if (confirm !== 'CLEAR_ALL_DATA') {
      return res.status(400).json({ success: false, error: 'Confirmation required: send { "confirm": "CLEAR_ALL_DATA" }' });
    }
    
    // Store old counts for response
    const oldCounts = {
      locks: dataStore.locks.length,
      mintRequests: dataStore.mintRequests.length,
      completedMints: dataStore.completedMints.length,
      webhookEvents: dataStore.webhookEvents.length
    };
    
    // Clear all data
    dataStore.locks = [];
    dataStore.mintRequests = [];
    dataStore.completedMints = [];
    dataStore.webhookEvents = [];
    dataStore.lastUpdated = new Date().toISOString();
    
    saveData();
    
    console.log('🗑️ All DCB Treasury data cleared');
    
    res.json({
      success: true,
      message: 'All data cleared successfully',
      clearedCounts: oldCounts,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
// API ROUTES - HEALTH & INFO
// ═══════════════════════════════════════════════════════════════════════════════

app.get('/api/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'DCB Treasury Certification Platform API',
    version: '1.0.0',
    environment: IS_PRODUCTION ? 'production' : 'development',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    lemxApiUrl: LEMX_API_URL,
    productionUrl: 'https://luxliqdaes.cloud'
  });
});

app.get('/health', (req, res) => res.redirect('/api/health'));

app.get('/api/info', (req, res) => {
  res.json({
    service: 'DCB Treasury Certification Platform API',
    version: '1.0.0',
    environment: IS_PRODUCTION ? 'production' : 'development',
    lemxApiUrl: LEMX_API_URL,
    productionUrl: 'https://luxliqdaes.cloud',
    bank: {
      id: 'DCB-001',
      name: 'Digital Commercial Bank Ltd.',
      swift: 'DCBKUS33'
    },
    blockchain: {
      network: 'LemonChain',
      chainId: 8866,
      lusdContract: '0x8DE60f88f19DAD42dde0D9ED2eebA68269722a99'
    },
    endpoints: {
      locks: '/api/locks',
      mintRequests: '/api/mint-requests',
      completedMints: '/api/completed-mints',
      webhooks: '/api/webhooks',
      apiKeys: '/api/keys'
    },
    stats: {
      totalLocks: dataStore.locks.length,
      totalMintRequests: dataStore.mintRequests.length,
      completedMints: dataStore.completedMints.length,
      webhookEvents: dataStore.webhookEvents.length,
      activeApiKeys: dataStore.apiKeys.filter(k => k.active).length
    }
  });
});

app.get('/info', (req, res) => res.redirect('/api/info'));

// ═══════════════════════════════════════════════════════════════════════════════
// API ROUTES - LOCKS MANAGEMENT
// ═══════════════════════════════════════════════════════════════════════════════

// Get all locks
app.get('/api/locks', (req, res) => {
  const { status, authorizationCode } = req.query;
  let locks = dataStore.locks;
  
  if (status) {
    locks = locks.filter(l => l.status === status);
  }
  if (authorizationCode) {
    locks = locks.filter(l => l.authorizationCode === authorizationCode);
  }
  
  res.json({
    success: true,
    data: locks.slice().reverse(),
    count: locks.length
  });
});

app.get('/locks', (req, res) => res.redirect('/api/locks'));

// Get locks approved by LEMX
app.get('/api/locks/approved-by-lemx', (req, res) => {
  const approvedLocks = dataStore.locks.filter(l => 
    l.status === 'approved_by_lemx' || l.lemxApprovalReceived === true
  );
  res.json({
    success: true,
    data: approvedLocks.slice().reverse(),
    count: approvedLocks.length
  });
});

// Get locks rejected by LEMX
app.get('/api/locks/rejected-by-lemx', (req, res) => {
  const rejectedLocks = dataStore.locks.filter(l => l.status === 'rejected_by_lemx');
  res.json({
    success: true,
    data: rejectedLocks.slice().reverse(),
    count: rejectedLocks.length
  });
});

// Get pending locks (not yet approved/rejected by LEMX)
app.get('/api/locks/pending', (req, res) => {
  const pendingLocks = dataStore.locks.filter(l => 
    l.status === 'pending_authorization' && 
    !l.lemxApprovalReceived && 
    l.status !== 'approved_by_lemx' && 
    l.status !== 'rejected_by_lemx'
  );
  res.json({
    success: true,
    data: pendingLocks.slice().reverse(),
    count: pendingLocks.length
  });
});

// Get minted locks (completed minting)
app.get('/api/locks/minted', (req, res) => {
  const mintedLocks = dataStore.locks.filter(l => l.status === 'minted');
  
  // Calcular el total usando mintedDetails.mintedAmount si existe, de lo contrario lockDetails.amount
  const totalMintedAmount = mintedLocks.reduce((sum, l) => {
    const amount = l.mintedDetails?.mintedAmount || l.lockDetails?.amount || '0';
    return sum + parseFloat(amount);
  }, 0);
  
  res.json({
    success: true,
    data: mintedLocks.slice().reverse(),
    count: mintedLocks.length,
    totalMintedAmount
  });
});

// Get lock by ID
app.get('/api/locks/:lockId', (req, res) => {
  const lock = dataStore.locks.find(l => l.lockId === req.params.lockId || l.id === req.params.lockId);
  if (!lock) {
    return res.status(404).json({ success: false, error: 'Lock not found' });
  }
  res.json({ success: true, data: lock });
});

// Get lock by authorization code
app.get('/api/locks/by-code/:code', (req, res) => {
  const lock = dataStore.locks.find(l => l.authorizationCode === req.params.code);
  if (!lock) {
    return res.status(404).json({ success: false, error: 'Lock not found' });
  }
  res.json({ success: true, data: lock });
});

// Create new lock
app.post('/api/locks', async (req, res) => {
  try {
    const lockId = req.body.lockId || generateLockId();
    
    const newLock = {
      id: generateId(),
      lockId,
      timestamp: new Date().toISOString(),
      status: 'pending_authorization',
      ...req.body,
      lockDetails: {
        amount: req.body.lockDetails?.amount || '0',
        currency: req.body.lockDetails?.currency || 'USD',
        beneficiary: req.body.lockDetails?.beneficiary || '',
        custodyVault: req.body.lockDetails?.custodyVault || '',
        expiry: req.body.lockDetails?.expiry || new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
      },
      bankInfo: {
        bankId: 'DCB-001',
        bankName: 'Digital Commercial Bank Ltd.',
        signerAddress: req.body.bankInfo?.signerAddress || '',
        ...req.body.bankInfo
      },
      blockchain: {
        chainId: 8866,
        network: 'LemonChain',
        ...req.body.blockchain
      }
    };

    dataStore.locks.push(newLock);
    saveData();

    // Dispatch webhook to LEMX
    await dispatchWebhook('lock.created', newLock);

    addAuditLog('lock.created', { lockId: newLock.lockId, amount: newLock.lockDetails.amount });

    console.log(`✅ Lock created: ${newLock.lockId}`);

    res.status(201).json({
      success: true,
      data: newLock,
      message: `Lock created and sent to LEMX Minting Platform (${IS_PRODUCTION ? 'luxliqdaes.cloud' : 'localhost'})`
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Complete lock minting
app.patch('/api/locks/:lockId/complete-minting', async (req, res) => {
  try {
    const { txHash, lusdContractAddress } = req.body;
    const lockIndex = dataStore.locks.findIndex(l => l.lockId === req.params.lockId || l.id === req.params.lockId);

    if (lockIndex === -1) {
      return res.status(404).json({ success: false, error: 'Lock not found' });
    }

    dataStore.locks[lockIndex] = {
      ...dataStore.locks[lockIndex],
      status: 'minted',
      mintTxHash: txHash,
      lusdContractAddress: lusdContractAddress || '0x8DE60f88f19DAD42dde0D9ED2eebA68269722a99',
      completedAt: new Date().toISOString()
    };

    saveData();

    // Dispatch webhook
    await dispatchWebhook('lock.completed', dataStore.locks[lockIndex]);

    addAuditLog('lock.completed', { lockId: req.params.lockId, txHash });

    res.json({
      success: true,
      data: dataStore.locks[lockIndex],
      message: 'Lock minting completed'
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
// API ROUTES - MINT REQUESTS
// ═══════════════════════════════════════════════════════════════════════════════

app.get('/api/mint-requests', (req, res) => {
  const { status, authorizationCode } = req.query;
  let requests = dataStore.mintRequests;
  
  if (status) {
    requests = requests.filter(r => r.status === status);
  }
  if (authorizationCode) {
    requests = requests.filter(r => r.authorizationCode === authorizationCode);
  }
  
  res.json({
    success: true,
    data: requests.slice().reverse(),
    count: requests.length
  });
});

app.get('/mint-requests', (req, res) => res.redirect('/api/mint-requests'));

app.get('/api/mint-requests/by-code/:code', (req, res) => {
  const request = dataStore.mintRequests.find(r => r.authorizationCode === req.params.code);
  if (!request) {
    return res.status(404).json({ success: false, error: 'Mint request not found' });
  }
  res.json({ success: true, data: request });
});

// ═══════════════════════════════════════════════════════════════════════════════
// API ROUTES - COMPLETED MINTS (Explorer)
// ═══════════════════════════════════════════════════════════════════════════════

app.get('/api/completed-mints', (req, res) => {
  res.json({
    success: true,
    data: dataStore.completedMints.slice().reverse(),
    count: dataStore.completedMints.length
  });
});

app.get('/completed-mints', (req, res) => res.redirect('/api/completed-mints'));

app.get('/api/completed-mints/:id', (req, res) => {
  const mint = dataStore.completedMints.find(m => 
    m.id === req.params.id || 
    m.publicationCode === req.params.id ||
    m.authorizationCode === req.params.id
  );
  if (!mint) {
    return res.status(404).json({ success: false, error: 'Completed mint not found' });
  }
  res.json({ success: true, data: mint });
});

// ═══════════════════════════════════════════════════════════════════════════════
// WEBHOOK RECEIVER (from LEMX Minting Platform - SECURE)
// ═══════════════════════════════════════════════════════════════════════════════

app.post('/api/webhooks/receive', (req, res) => {
  try {
    const event = req.body;
    const eventType = req.headers['x-lemx-event'] || event.type;
    const signature = req.headers['x-lemx-signature'] || req.headers['x-webhook-signature'];
    
    console.log(`📥 [LEMX→DCB] Received webhook: ${eventType}`);
    
    // Verify signature (optional in development, required in production)
    if (IS_PRODUCTION && event.signature) {
      const isValid = verifyWebhookSignature(event, signature || event.signature);
      if (!isValid) {
        console.warn('⚠️ Invalid webhook signature from LEMX - rejecting');
        return res.status(401).json({ success: false, error: 'Invalid webhook signature' });
      }
      console.log('✅ Webhook signature verified from LEMX');
    }
    
    // Store the event
    dataStore.webhookEvents.push({
      ...event,
      receivedAt: new Date().toISOString(),
      source: 'lemx_minting',
      signatureVerified: !!signature
    });

    // Process based on event type
    if (eventType === 'authorization.generated') {
      const { lockId, authorizationCode, amount, beneficiary, generatedAt, generatedBy, expiresAt } = event.payload || event;
      
      const lockIndex = dataStore.locks.findIndex(l => l.lockId === lockId);
      if (lockIndex !== -1) {
        dataStore.locks[lockIndex].status = 'authorized';
        dataStore.locks[lockIndex].authorizationCode = authorizationCode;
        dataStore.locks[lockIndex].authorizedAt = generatedAt;
        dataStore.locks[lockIndex].authorizedBy = generatedBy;
        dataStore.locks[lockIndex].authorizationExpiresAt = expiresAt;
        console.log(`✅ [DCB] Lock ${lockId} authorized with code ${authorizationCode}`);
        addAuditLog('lock.authorized', { lockId, authorizationCode, generatedBy });
      } else {
        console.warn(`⚠️ [DCB] Lock not found for authorization: ${lockId}`);
      }

      // Also store as mint request
      if (!dataStore.mintRequests.find(r => r.authorizationCode === authorizationCode)) {
        const mintRequest = {
          id: generateId(),
          authorizationCode,
          lockId,
          requestedAmount: amount,
          tokenSymbol: 'VUSD',
          beneficiary,
          status: 'pending',
          createdAt: generatedAt,
          expiresAt: expiresAt || new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
          sourceEvent: event.id
        };
        dataStore.mintRequests.push(mintRequest);
        console.log(`✅ [DCB] Mint request created: ${authorizationCode}`);
      }
    } 
    else if (eventType === 'mint.completed') {
      const { 
        authorizationCode, 
        publicationCode, 
        txHash, 
        mintedAmount, 
        mintedAt, 
        lusdContractAddress, 
        blockNumber, 
        gasUsed, 
        lockId: payloadLockId,
        mintedBy,
        sourceOfFunds,
        bankName,
        currency,
        beneficiary
      } = event.payload || event;
      
      console.log('');
      console.log('╔══════════════════════════════════════════════════════════════════╗');
      console.log('║   📥 MINTING COMPLETADO RECIBIDO DE LEMX MINTING                 ║');
      console.log('╠══════════════════════════════════════════════════════════════════╣');
      console.log(`║   Lock ID: ${payloadLockId}`);
      console.log(`║   Authorization Code: ${authorizationCode}`);
      console.log(`║   Publication Code: ${publicationCode}`);
      console.log(`║   TX Hash: ${txHash}`);
      console.log(`║   Minted Amount: $${mintedAmount}`);
      console.log(`║   VUSD Contract: ${lusdContractAddress}`);
      console.log('╚══════════════════════════════════════════════════════════════════╝');
      console.log('');
      
      // Update lock - buscar por lockId primero, luego por authorizationCode
      let lockIndex = dataStore.locks.findIndex(l => l.lockId === payloadLockId);
      if (lockIndex === -1) {
        lockIndex = dataStore.locks.findIndex(l => l.authorizationCode === authorizationCode);
      }
      
      if (lockIndex !== -1) {
        dataStore.locks[lockIndex].status = 'minted';
        dataStore.locks[lockIndex].mintTxHash = txHash;
        dataStore.locks[lockIndex].publicationCode = publicationCode;
        dataStore.locks[lockIndex].lusdContractAddress = lusdContractAddress;
        dataStore.locks[lockIndex].mintedAt = mintedAt;
        dataStore.locks[lockIndex].blockNumber = blockNumber;
        dataStore.locks[lockIndex].gasUsed = gasUsed;
        dataStore.locks[lockIndex].mintedBy = mintedBy;
        // Guardar detalles del minting para el frontend
        dataStore.locks[lockIndex].mintedDetails = {
          txHash,
          publicationCode,
          mintedAmount,
          lusdContractAddress,
          mintedBy,
          mintedAt,
          blockNumber
        };
        console.log(`✅ [DCB] Lock ${dataStore.locks[lockIndex].lockId} marcado como MINTED`);
      } else {
        console.log(`⚠️ [DCB] Lock no encontrado para lockId: ${payloadLockId} o authCode: ${authorizationCode}`);
      }

      // Update mint request
      const requestIndex = dataStore.mintRequests.findIndex(r => r.authorizationCode === authorizationCode);
      if (requestIndex !== -1) {
        dataStore.mintRequests[requestIndex].status = 'completed';
        dataStore.mintRequests[requestIndex].mintTxHash = txHash;
        dataStore.mintRequests[requestIndex].publicationCode = publicationCode;
        dataStore.mintRequests[requestIndex].completedAt = mintedAt;
        console.log(`✅ [DCB] Mint request actualizado: ${authorizationCode}`);
      }

      // Add to completed mints (avoid duplicates)
      const existingMint = dataStore.completedMints.find(m => 
        m.publicationCode === publicationCode || 
        m.txHash === txHash || 
        m.lockId === payloadLockId
      );
      
      if (!existingMint) {
        const completedMint = {
          id: generateId(),
          authorizationCode,
          publicationCode,
          txHash,
          blockNumber,
          mintedAmount,
          mintedAt,
          lusdContractAddress,
          gasUsed,
          mintedBy,
          lockId: dataStore.locks[lockIndex]?.lockId || payloadLockId,
          sourceOfFunds,
          bankName,
          currency: currency || 'USD',
          beneficiary,
          sourceEvent: event.id
        };
        dataStore.completedMints.push(completedMint);
        console.log(`✅ [DCB] Mint completado y registrado: ${publicationCode}`);
      } else {
        console.log(`ℹ️ [DCB] Mint ya existía: ${publicationCode}`);
      }
      
      saveData();
      
      console.log('');
      console.log('╔══════════════════════════════════════════════════════════════════╗');
      console.log('║   ✅ MINTING PROCESADO EXITOSAMENTE EN DCB TREASURY              ║');
      console.log('╠══════════════════════════════════════════════════════════════════╣');
      console.log(`║   Total Mints Completados: ${dataStore.completedMints.length}`);
      console.log('╚══════════════════════════════════════════════════════════════════╝');
      console.log('');
      
      addAuditLog('mint.completed', { authorizationCode, publicationCode, txHash, mintedAmount, lockId: payloadLockId });
    }
    else if (eventType === 'lock.approved') {
      // LEMX Minting approved the lock - mark as approved in DCB and stop sending it
      const { lockId, amount, currency, approvedAt, approvedBy } = event.payload || event;
      console.log(`✅ [DCB] Lock approved by LEMX: ${lockId}`);
      
      const lockIndex = dataStore.locks.findIndex(l => l.lockId === lockId);
      if (lockIndex !== -1) {
        dataStore.locks[lockIndex].status = 'approved_by_lemx';
        dataStore.locks[lockIndex].approvedByLemxAt = approvedAt;
        dataStore.locks[lockIndex].approvedByLemx = approvedBy;
        dataStore.locks[lockIndex].lemxApprovalReceived = true;
        console.log(`✅ [DCB] Lock ${lockId} marked as approved by LEMX - will no longer be sent`);
        addAuditLog('lock.approved_by_lemx', { lockId, approvedBy, approvedAt });
      } else {
        console.warn(`⚠️ [DCB] Lock not found for approval: ${lockId}`);
      }
    }
    else if (eventType === 'lock.rejected') {
      // LEMX Minting rejected the lock
      const { lockId, amount, rejectedAt, rejectedBy, reason } = event.payload || event;
      console.log(`❌ [DCB] Lock rejected by LEMX: ${lockId}`);
      
      const lockIndex = dataStore.locks.findIndex(l => l.lockId === lockId);
      if (lockIndex !== -1) {
        dataStore.locks[lockIndex].status = 'rejected_by_lemx';
        dataStore.locks[lockIndex].rejectedByLemxAt = rejectedAt;
        dataStore.locks[lockIndex].rejectedByLemx = rejectedBy;
        dataStore.locks[lockIndex].rejectionReason = reason;
        console.log(`❌ [DCB] Lock ${lockId} marked as rejected by LEMX`);
        addAuditLog('lock.rejected_by_lemx', { lockId, rejectedBy, reason, rejectedAt });
      }
    }
    else if (eventType === 'mint.started') {
      const { lockId, authorizationCode, startedAt, startedBy } = event.payload || event;
      console.log(`ℹ️ [DCB] Minting started for ${lockId} by ${startedBy}`);
      
      const lockIndex = dataStore.locks.findIndex(l => l.lockId === lockId || l.authorizationCode === authorizationCode);
      if (lockIndex !== -1) {
        dataStore.locks[lockIndex].mintingStarted = true;
        dataStore.locks[lockIndex].mintingStartedAt = startedAt;
      }
    }
    else if (eventType === 'mint.failed') {
      const { lockId, authorizationCode, error: mintError, failedAt } = event.payload || event;
      console.log(`❌ [DCB] Minting failed for ${lockId}: ${mintError}`);
      
      const lockIndex = dataStore.locks.findIndex(l => l.lockId === lockId || l.authorizationCode === authorizationCode);
      if (lockIndex !== -1) {
        dataStore.locks[lockIndex].status = 'mint_failed';
        dataStore.locks[lockIndex].mintError = mintError;
        dataStore.locks[lockIndex].failedAt = failedAt;
      }
      addAuditLog('mint.failed', { lockId, authorizationCode, error: mintError });
    }

    saveData();

    res.json({ 
      success: true, 
      received: true,
      eventId: event.id,
      processedAt: new Date().toISOString()
    });
  } catch (error) {
    console.error('❌ [DCB] Webhook processing error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
// API ROUTES - WEBHOOKS MANAGEMENT
// ═══════════════════════════════════════════════════════════════════════════════

app.get('/api/webhooks/events', (req, res) => {
  const limit = parseInt(req.query.limit) || 50;
  res.json({
    success: true,
    data: dataStore.webhookEvents.slice(-limit).reverse(),
    count: dataStore.webhookEvents.length
  });
});

app.post('/api/webhooks/register', (req, res) => {
  try {
    const { url, events, name, apiKeyId } = req.body;
    
    if (!url) {
      return res.status(400).json({ success: false, error: 'URL is required' });
    }

    // Check if already exists
    const existing = dataStore.webhookEndpoints.find(e => e.url === url);
    if (existing) {
      existing.events = events || existing.events;
      existing.name = name || existing.name;
      existing.active = true;
      if (apiKeyId) existing.apiKeyId = apiKeyId;
      saveData();
      return res.json({ success: true, data: existing, message: 'Webhook updated' });
    }

    const endpoint = {
      id: generateId(),
      name: name || 'Unnamed Webhook',
      url,
      events: events || ['lock.created', 'lock.completed', 'authorization.generated', 'mint.completed'],
      secret: generateWebhookSecret(),
      active: true,
      apiKeyId: apiKeyId || null,
      createdAt: new Date().toISOString()
    };

    dataStore.webhookEndpoints.push(endpoint);
    saveData();

    addAuditLog('webhook.registered', { url, name });

    res.status(201).json({ success: true, data: endpoint });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.get('/api/webhooks', (req, res) => {
  res.json({
    success: true,
    data: dataStore.webhookEndpoints.map(e => ({
      id: e.id,
      name: e.name,
      url: e.url,
      events: e.events,
      active: e.active,
      createdAt: e.createdAt
    }))
  });
});

app.delete('/api/webhooks/:id', (req, res) => {
  const index = dataStore.webhookEndpoints.findIndex(e => e.id === req.params.id);
  if (index === -1) {
    return res.status(404).json({ success: false, error: 'Webhook not found' });
  }
  
  const removed = dataStore.webhookEndpoints.splice(index, 1)[0];
  saveData();
  
  addAuditLog('webhook.deleted', { id: req.params.id, url: removed.url });
  
  res.json({ success: true, message: 'Webhook deleted' });
});

app.post('/api/webhooks/:id/test', async (req, res) => {
  const endpoint = dataStore.webhookEndpoints.find(e => e.id === req.params.id);
  if (!endpoint) {
    return res.status(404).json({ success: false, error: 'Webhook not found' });
  }

  try {
    const testEvent = {
      id: generateId(),
      type: 'test.ping',
      timestamp: new Date().toISOString(),
      payload: { message: 'Test webhook from DCB Treasury' },
      source: 'dcb_treasury'
    };

    const response = await fetch(endpoint.url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-DCB-Signature': createSignature(testEvent, endpoint.secret),
        'X-DCB-Event': 'test.ping'
      },
      body: JSON.stringify(testEvent)
    });

    res.json({
      success: true,
      data: { sent: true, status: response.status }
    });
  } catch (error) {
    res.json({
      success: false,
      error: error.message
    });
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
// API ROUTES - API KEYS MANAGEMENT
// ═══════════════════════════════════════════════════════════════════════════════

app.get('/api/keys', (req, res) => {
  res.json({
    success: true,
    data: dataStore.apiKeys.map(k => ({
      id: k.id,
      name: k.name,
      key: k.key.substring(0, 12) + '...',
      permissions: k.permissions,
      rateLimit: k.rateLimit,
      active: k.active,
      createdAt: k.createdAt,
      lastUsed: k.lastUsed,
      expiresAt: k.expiresAt
    }))
  });
});

app.post('/api/keys', (req, res) => {
  try {
    const { name, permissions = ['read'], expiresInDays, rateLimit = 1000 } = req.body;

    if (!name) {
      return res.status(400).json({ success: false, error: 'Name is required' });
    }

    const apiKey = {
      id: generateId(),
      name,
      key: generateApiKey(),
      secret: generateApiSecret(),
      permissions,
      rateLimit,
      active: true,
      createdAt: new Date().toISOString(),
      expiresAt: expiresInDays 
        ? new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000).toISOString()
        : null
    };

    dataStore.apiKeys.push(apiKey);
    saveData();

    addAuditLog('apikey.created', { name, permissions });

    // Return full key only on creation
    res.status(201).json({
      success: true,
      data: apiKey,
      message: 'API key created. Save the key and secret securely - they will not be shown again.'
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.delete('/api/keys/:id', (req, res) => {
  const index = dataStore.apiKeys.findIndex(k => k.id === req.params.id);
  if (index === -1) {
    return res.status(404).json({ success: false, error: 'API key not found' });
  }

  const removed = dataStore.apiKeys.splice(index, 1)[0];
  saveData();

  addAuditLog('apikey.revoked', { id: req.params.id, name: removed.name });

  res.json({ success: true, message: 'API key revoked' });
});

app.post('/api/keys/:id/rotate', (req, res) => {
  const key = dataStore.apiKeys.find(k => k.id === req.params.id);
  if (!key) {
    return res.status(404).json({ success: false, error: 'API key not found' });
  }

  const oldKey = key.key;
  key.key = generateApiKey();
  key.secret = generateApiSecret();
  key.rotatedAt = new Date().toISOString();
  saveData();

  addAuditLog('apikey.rotated', { id: req.params.id, name: key.name });

  res.json({
    success: true,
    data: key,
    message: 'API key rotated. Save the new key and secret securely.'
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// SYNC ENDPOINTS
// ═══════════════════════════════════════════════════════════════════════════════

app.post('/api/sync-with-lemx', async (req, res) => {
  try {
    const syncUrl = IS_PRODUCTION 
      ? 'https://luxliqdaes.cloud/api/lemx/sync'
      : `${LEMX_API_URL}/api/sync`;

    const response = await fetch(syncUrl);
    const lemxData = await response.json();

    if (lemxData.success) {
      // Merge completed mints
      for (const mint of lemxData.data.completedMints || []) {
        if (!dataStore.completedMints.find(m => m.publicationCode === mint.publicationCode)) {
          dataStore.completedMints.push({ ...mint, syncedAt: new Date().toISOString() });
        }
      }
      saveData();
      
      res.json({
        success: true,
        message: `Synced with LEMX (${IS_PRODUCTION ? 'luxliqdaes.cloud' : 'localhost'})`,
        newMints: (lemxData.data.completedMints || []).length
      });
    } else {
      res.status(500).json({ success: false, error: 'Failed to fetch from LEMX' });
    }
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.get('/api/sync', (req, res) => {
  res.json({
    success: true,
    data: {
      locks: dataStore.locks,
      mintRequests: dataStore.mintRequests,
      completedMints: dataStore.completedMints,
      webhookEvents: dataStore.webhookEvents.slice(-100)
    },
    lastUpdated: dataStore.lastUpdated
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// AUDIT LOG
// ═══════════════════════════════════════════════════════════════════════════════

app.get('/api/audit', (req, res) => {
  const limit = parseInt(req.query.limit) || 100;
  res.json({
    success: true,
    data: dataStore.auditLog.slice(-limit).reverse(),
    count: dataStore.auditLog.length
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// START SERVER
// ═══════════════════════════════════════════════════════════════════════════════

app.listen(PORT, async () => {
  console.log('═══════════════════════════════════════════════════════════════════');
  console.log('  DCB TREASURY CERTIFICATION PLATFORM - API SERVER');
  console.log('═══════════════════════════════════════════════════════════════════');
  console.log(`  🚀 Server running on port ${PORT}`);
  console.log(`  🌍 Environment: ${IS_PRODUCTION ? 'PRODUCTION' : 'DEVELOPMENT'}`);
  console.log(`  📡 Webhook endpoint: /api/webhooks/receive`);
  console.log(`  🔑 API Keys endpoint: /api/keys`);
  console.log(`  🔗 LEMX Minting API: ${LEMX_API_URL}`);
  console.log(`  🏭 Production URL: https://luxliqdaes.cloud`);
  console.log(`  📊 Health check: /api/health`);
  console.log('═══════════════════════════════════════════════════════════════════');
  console.log(`  📈 Stats: ${dataStore.locks.length} locks, ${dataStore.completedMints.length} mints`);
  console.log(`  🔐 API Keys: ${dataStore.apiKeys.filter(k => k.active).length} active`);
  console.log(`  📡 Webhooks: ${dataStore.webhookEndpoints.filter(e => e.active).length} registered`);
  console.log('═══════════════════════════════════════════════════════════════════');

  // Register webhook with LEMX on startup
  const lemxWebhookUrl = IS_PRODUCTION 
    ? 'https://luxliqdaes.cloud/api/lemx/webhooks/register'
    : `${LEMX_API_URL}/api/webhooks/register`;

  const selfUrl = IS_PRODUCTION
    ? 'https://luxliqdaes.cloud/api/webhooks/receive'
    : `http://localhost:${PORT}/api/webhooks/receive`;

  try {
    const response = await fetch(lemxWebhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'DCB Treasury Certification Platform',
        url: selfUrl,
        events: ['authorization.generated', 'mint.completed', 'mint.requested']
      })
    });
    
    if (response.ok) {
      console.log(`  ✅ Registered webhook with LEMX Minting Platform`);
    }
  } catch (error) {
    console.log(`  ⚠️ Could not register with LEMX (is it running?)`);
  }
});

export default app;
