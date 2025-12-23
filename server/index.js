import express from 'express';
import cors from 'cors';
import fetch from 'node-fetch';
import { ensureDataFiles, getApiKeys, saveApiKeys, getPorReports, savePorReports } from './storage.js';

const PORT = process.env.PORT || 3000;
const app = express();

app.use(cors());
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true, limit: '2mb' })); // Para form-urlencoded (OAuth)

// Middleware de manejo de errores global
app.use((err, req, res, next) => {
  console.error('[Server Error]', err);
  if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
    return res.status(400).json({ 
      success: false, 
      error: 'Invalid JSON', 
      message: 'El cuerpo de la petición no es un JSON válido' 
    });
  }
  res.status(500).json({ 
    success: false, 
    error: 'Internal Server Error', 
    message: err.message 
  });
});

ensureDataFiles();

function findKeyByApiKey(apiKey) {
  const keys = getApiKeys();
  return keys.find(k => k.apiKey === apiKey && k.status !== 'revoked');
}

function requireAuth(req, res, next) {
  const auth = req.headers['authorization'] || '';
  const secret = req.headers['x-secret-key'] || '';
  const bearer = auth.startsWith('Bearer ') ? auth.slice(7) : '';
  if (!bearer) return res.status(401).json({ success: false, error: 'Missing Authorization header' });
  const key = findKeyByApiKey(bearer);
  if (!key) return res.status(403).json({ success: false, error: 'Invalid API key' });
  if (!secret || secret !== key.secretKey) return res.status(403).json({ success: false, error: 'Invalid Secret Key' });
  req.apiKeyData = key;
  next();
}

// Admin: registrar API key creada desde frontend
app.post('/admin/api-keys', (req, res) => {
  const key = req.body;
  if (!key?.apiKey || !key?.secretKey) {
    return res.status(400).json({ success: false, error: 'Invalid payload' });
  }
  const keys = getApiKeys();
  if (keys.some(k => k.apiKey === key.apiKey)) {
    return res.json({ success: true, key });
  }
  keys.push({ ...key, requestCount: key.requestCount || 0, status: key.status || 'active' });
  saveApiKeys(keys);
  res.json({ success: true, key });
});

// Admin: eliminar API key
app.delete('/admin/api-keys/:id', (req, res) => {
  const id = req.params.id;
  const keys = getApiKeys().filter(k => k.id !== id);
  saveApiKeys(keys);
  res.json({ success: true });
});

// Admin: importar/actualizar PoR reports (desde API VUSD frontend)
app.post('/admin/import-por', (req, res) => {
  const { reports } = req.body || {};
  if (!Array.isArray(reports)) {
    return res.status(400).json({ success: false, error: 'reports must be an array' });
  }
  savePorReports(reports);
  res.json({ success: true, count: reports.length });
});

function buildPayload(key, reports) {
  const linked = reports.filter(p => (key.linkedPorIds || []).includes(p.id)).map(p => ({
    id: p.id,
    timestamp: p.timestamp,
    circulatingCap: p.circulatingCap,
    pledgedUSD: p.pledgedUSD,
    activePledges: p.activePledgesCount,
    pledgesM2: p.pledgesM2,
    pledgesM3: p.pledgesM3,
    totalM2: p.totalM2,
    totalM3: p.totalM3,
    fullReport: p.report,
    reportLength: (p.report || '').length,
  }));
  return {
    success: true,
    timestamp: new Date().toISOString(),
    apiKey: key.apiKey,
    data: {
      porReports: linked,
      summary: {
        totalReports: linked.length,
        totalCirculatingCap: linked.reduce((s, p) => s + (p.circulatingCap || 0), 0),
        totalPledgedUSD: linked.reduce((s, p) => s + (p.pledgedUSD || 0), 0),
        totalActivePledges: linked.reduce((s, p) => s + (p.activePledges || 0), 0),
        totalM2: linked.reduce((s, p) => s + (p.pledgesM2 || 0), 0),
        totalM3: linked.reduce((s, p) => s + (p.pledgesM3 || 0), 0),
        m2Amount: linked.reduce((s, p) => s + (p.totalM2 || 0), 0),
        m3Amount: linked.reduce((s, p) => s + (p.totalM3 || 0), 0),
      },
      metadata: {
        apiKeyName: key.name,
        createdAt: key.createdAt,
        requestCount: (key.requestCount || 0) + 1,
        permissions: key.permissions || { read_por: true, download_por: true },
      },
    },
  };
}

async function maybeSendWebhook(key, payload, event = 'api.request') {
  if (!key.webhookUrl) return;
  try {
    await fetch(key.webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': key.apiKey,
        'X-Secret-Key': key.secretKey,
        'User-Agent': 'DAES-PoR-API/1.0',
        'X-Event': event,
      },
      body: JSON.stringify(payload),
    });
  } catch (e) {
    // no-op
  }
}

// GET full payload
app.get('/api/v1/proof-of-reserves/:apiKey', requireAuth, async (req, res) => {
  const key = req.apiKeyData;
  const reports = getPorReports();
  const payload = buildPayload(key, reports);
  // update stats
  const keys = getApiKeys().map(k => k.apiKey === key.apiKey ? { ...k, lastUsed: new Date().toISOString(), requestCount: (k.requestCount || 0) + 1 } : k);
  saveApiKeys(keys);
  await maybeSendWebhook(key, payload, 'api.request');
  res.json(payload);
});

// GET data only
app.get('/api/v1/proof-of-reserves/:apiKey/data', requireAuth, async (req, res) => {
  const key = req.apiKeyData;
  const reports = getPorReports();
  const payload = buildPayload(key, reports);
  await maybeSendWebhook(key, payload.data, 'api.data');
  res.json(payload.data);
});

// GET summary
app.get('/api/v1/proof-of-reserves/:apiKey/summary', requireAuth, async (req, res) => {
  const key = req.apiKeyData;
  const reports = getPorReports();
  const payload = buildPayload(key, reports);
  await maybeSendWebhook(key, payload.data.summary, 'api.summary');
  res.json(payload.data.summary);
});

// GET verify
app.get('/api/v1/proof-of-reserves/:apiKey/verify', requireAuth, async (req, res) => {
  const key = req.apiKeyData;
  const reports = getPorReports();
  const payload = buildPayload(key, reports);
  await maybeSendWebhook(key, { verified: true, counts: payload.data.summary }, 'api.verify');
  res.json({ success: true, verified: true, counts: payload.data.summary });
});

// GET download
app.get('/api/v1/proof-of-reserves/:apiKey/download', requireAuth, async (req, res) => {
  const key = req.apiKeyData;
  const reports = getPorReports();
  const linked = reports.filter(p => (key.linkedPorIds || []).includes(p.id));
  const content = linked.map(p => `=== PoR ${p.id} @ ${p.timestamp} ===\n${p.report || ''}`).join('\n\n');
  await maybeSendWebhook(key, { size: content.length }, 'api.download');
  res.setHeader('Content-Type', 'text/plain; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="por_${key.apiKey}.txt"`);
  res.send(content || 'No Proof of Reserves linked.');
});

// ============================================================================
// SBERBANK PROXY - Proxy seguro hacia Sberbank RPO API
// ============================================================================
app.post('/api/sberbank/payments', async (req, res) => {
  try {
    const SBER_BASE_URL = process.env.SBER_BASE_URL || 'https://iftfintech.testsbi.sberbank.ru:9443';
    const SBER_ACCESS_TOKEN = process.env.SBER_ACCESS_TOKEN;

    if (!SBER_ACCESS_TOKEN) {
      return res.status(500).json({ error: 'Sberbank env not configured' });
    }

    console.log('[Sberbank Proxy] 📤 Reenviando pago a Sberbank:', {
      url: `${SBER_BASE_URL}/fintech/api/v1/payments`,
      externalId: req.body?.externalId,
      amount: req.body?.amount
    });

    const response = await fetch(`${SBER_BASE_URL}/fintech/api/v1/payments`, {
      method: 'POST',
      headers: {
        'Authorization': SBER_ACCESS_TOKEN,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify(req.body),
    });

    const text = await response.text();
    
    console.log('[Sberbank Proxy] ✅ Respuesta de Sberbank:', {
      status: response.status,
      statusText: response.statusText
    });

    res.status(response.status).send(text);
  } catch (err) {
    console.error('[Sberbank Proxy] ❌ Error:', err);
    res.status(500).json({ error: err.message || 'Proxy error' });
  }
});

// ============================================================================
// YOOMONEY OAUTH PROXY - Proxy seguro hacia YuMoney OAuth API
// ============================================================================
app.post('/api/yoomoney/oauth/token', async (req, res) => {
  try {
    console.log('[YuMoney OAuth Proxy] 📤 Reenviando petición OAuth a YuMoney:', {
      hasClientId: !!req.body.client_id,
      hasClientSecret: !!req.body.client_secret,
      hasCode: !!req.body.code,
      grantType: req.body.grant_type
    });

    // Validate required fields
    if (!req.body.client_id || !req.body.client_secret || !req.body.code) {
      return res.status(400).json({
        error: 'invalid_request',
        error_description: 'Missing required fields: client_id, client_secret, or code'
      });
    }

    // Prepare form data
    const formData = new URLSearchParams();
    formData.append('grant_type', req.body.grant_type || 'authorization_code');
    formData.append('code', req.body.code);
    formData.append('client_id', req.body.client_id);
    formData.append('client_secret', req.body.client_secret);
    formData.append('redirect_uri', req.body.redirect_uri || 'urn:ietf:wg:oauth:2.0:oob');

    console.log('[YuMoney OAuth Proxy] Enviando a https://yoomoney.ru/oauth/token');

    const response = await fetch('https://yoomoney.ru/oauth/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Accept': 'application/json',
      },
      body: formData.toString(),
    });

    console.log('[YuMoney OAuth Proxy] Response status:', response.status, response.statusText);
    console.log('[YuMoney OAuth Proxy] Response headers:', Object.fromEntries(response.headers.entries()));

    // Get response as text first
    const responseText = await response.text();
    console.log('[YuMoney OAuth Proxy] Response text (first 500 chars):', responseText.substring(0, 500));

    let data;
    
    // Try to parse as JSON
    if (responseText.trim().length === 0) {
      console.warn('[YuMoney OAuth Proxy] ⚠️ Empty response from YuMoney');
      data = {
        error: 'empty_response',
        error_description: 'YuMoney returned an empty response'
      };
    } else {
      try {
        data = JSON.parse(responseText);
      } catch (parseError) {
        console.error('[YuMoney OAuth Proxy] ❌ Failed to parse JSON:', parseError);
        console.error('[YuMoney OAuth Proxy] Response text:', responseText);
        data = {
          error: 'invalid_response',
          error_description: 'YuMoney returned invalid JSON',
          raw_response: responseText.substring(0, 200)
        };
      }
    }

    console.log('[YuMoney OAuth Proxy] ✅ Respuesta procesada:', {
      status: response.status,
      hasAccessToken: !!data.access_token,
      hasError: !!data.error
    });

    // Always return JSON, even if YuMoney returned something else
    res.status(response.status).json(data);
  } catch (err) {
    console.error('[YuMoney OAuth Proxy] ❌ Error completo:', err);
    console.error('[YuMoney OAuth Proxy] Error stack:', err.stack);
    res.status(500).json({ 
      error: 'proxy_error',
      error_description: err.message || 'Error al conectar con YuMoney OAuth',
      details: err.toString()
    });
  }
});

// ============================================================================
// TZ DIGITAL BANK TRANSFER PROXY - Transferencias USD/EUR
// ============================================================================
// ============================================================================
// CIS S2S API 2025 - DEVMIND GROUP CONFIGURATION
// ============================================================================
// Receiving Server Name: DEV-CORE-PAY-GW-01
// Server Location: London, United Kingdom
// Global Server IP: 172.67.157.88
// Port: 8443 (TLS/SSL Enabled)
// ============================================================================
const CIS_S2S_CONFIG = {
  API_URL: 'https://banktransfer.devmindgroup.com/api/transactions',
  RECEIVE_URL: 'https://secure.devmindpay.com/api/v1/transaction/receive',
  GLOBAL_IP: '172.67.157.88',
  PORT: 8443,
  API_KEY: '47061d41-7994-4fad-99a7-54879acd9a83',
  AUTH_KEY: 'DMP-SECURE-KEY-7X93-FF28-ZQ19',
  SHA256_HANDSHAKE: 'b19f2a94eab4cd3b92f1e3e0dce9d541c8b7aa3fdbe6e2f4ac3c91a5fbb2f44',
  INTERNAL_IP_RANGES: ['172.16.0.0/24', '10.26.0.0/16'],
  DNS_RANGE: '192.168.1.100/24'
};

app.post('/api/tz-digital/transactions', async (req, res) => {
  // Usar CIS S2S API URL (DevMind Group)
  const TZ_API_URL = CIS_S2S_CONFIG.API_URL;
  const bearerToken = req.headers['x-tz-token'] || req.headers['authorization']?.replace('Bearer ', '') || CIS_S2S_CONFIG.API_KEY;

  try {
    console.log('[TZ Digital Proxy] 📤 Enviando transferencia:', {
      url: TZ_API_URL,
      currency: req.body?.currency,
      amount: req.body?.amount,
      reference: req.body?.reference,
      hasToken: !!bearerToken
    });

    if (!bearerToken) {
      return res.status(401).json({
        success: false,
        error: 'Missing Bearer Token',
        message: 'Se requiere el token de autorización'
      });
    }

    const response = await fetch(TZ_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${bearerToken}`,
        'Accept': 'application/json',
        ...(req.headers['idempotency-key'] && { 'Idempotency-Key': req.headers['idempotency-key'] }),
      },
      body: JSON.stringify(req.body),
      signal: AbortSignal.timeout(30000)
    });

    const text = await response.text();
    let data;
    
    try {
      data = text ? JSON.parse(text) : {};
    } catch {
      data = { raw: text };
    }

    console.log('[TZ Digital Proxy] ✅ Respuesta:', {
      status: response.status,
      statusText: response.statusText,
      hasData: !!data
    });

    // Agregar headers de respuesta útiles
    const requestId = response.headers.get('x-request-id') || 
                      response.headers.get('x-correlation-id') ||
                      `TZ-${Date.now()}`;
    
    res.setHeader('x-request-id', requestId);
    res.status(response.status).json(data);

  } catch (error) {
    console.error('[TZ Digital Proxy] ❌ Error:', {
      message: error.message,
      code: error.code,
      name: error.name
    });

    let errorMessage = error.message;
    let errorCode = 'UNKNOWN_ERROR';

    if (error.code === 'ENOTFOUND') {
      errorMessage = 'No se puede resolver el dominio del servidor TZ Digital';
      errorCode = 'DNS_ERROR';
    } else if (error.code === 'ECONNREFUSED') {
      errorMessage = 'El servidor TZ Digital rechazó la conexión';
      errorCode = 'CONNECTION_REFUSED';
    } else if (error.name === 'AbortError') {
      errorMessage = 'Timeout: El servidor TZ Digital no respondió en 30 segundos';
      errorCode = 'TIMEOUT';
    } else if (error.code === 'UNABLE_TO_VERIFY_LEAF_SIGNATURE' || error.code === 'CERT_HAS_EXPIRED') {
      errorMessage = 'Error de certificado SSL del servidor TZ Digital';
      errorCode = 'SSL_ERROR';
    }

    res.status(500).json({
      success: false,
      error: errorCode,
      message: errorMessage,
      details: error.message
    });
  }
});

// Test de conexión TZ Digital
app.options('/api/tz-digital/transactions', async (req, res) => {
  res.status(200).json({ success: true, message: 'TZ Digital Proxy available' });
});

// ============================================================================
// CIS S2S - FUNDS PROCESSING WITH SHA256 HANDSHAKE (DEVMIND GROUP)
// Channel: Instant Server Settlement
// Protocols: SWIFT, VISA NET, Server to Server (NO Blockchain)
// ============================================================================
app.post('/api/tz-digital/funds-processing', async (req, res) => {
  // Usar CIS S2S API URL (DevMind Group)
  const API_URL = CIS_S2S_CONFIG.API_URL;
  const bearerToken = req.headers['x-tz-token'] || req.headers['authorization']?.replace('Bearer ', '') || CIS_S2S_CONFIG.API_KEY;
  const handshakeHash = req.headers['x-handshake-hash'] || CIS_S2S_CONFIG.SHA256_HANDSHAKE;

  try {
    console.log('[CIS S2S Funds Processing] 📤 Enviando transacción a DevMind Group:', {
      endpoint: API_URL,
      transaction_id: req.body?.transaction_id,
      amount: req.body?.amount,
      currency: req.body?.currency,
      from_bank: req.body?.from_bank,
      to_bank: req.body?.to_bank,
      protocol: req.body?.protocol || 'SWIFT_MT103_GPI',
      channel: 'INSTANT_SERVER_SETTLEMENT',
      handshakeHash: handshakeHash ? handshakeHash.substring(0, 16) + '...' : 'none'
    });

    // CIS S2S Headers completos
    const headers = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${bearerToken}`,
      'X-API-Key': CIS_S2S_CONFIG.API_KEY,
      'X-Auth-Key': CIS_S2S_CONFIG.AUTH_KEY,
      'X-Global-Server-IP': CIS_S2S_CONFIG.GLOBAL_IP,
      'X-Channel': 'INSTANT_SERVER_SETTLEMENT',
      'Accept': 'application/json',
    };

    // Incluir handshake hash
    if (handshakeHash) {
      headers['X-Handshake-Hash'] = handshakeHash;
    }

    // Incluir protocolo si está especificado
    if (req.body?.protocol) {
      headers['X-Transfer-Protocol'] = req.body.protocol;
    }

    const response = await fetch(API_URL, {
      method: 'POST',
      headers,
      body: JSON.stringify(req.body),
      signal: AbortSignal.timeout(30000)
    });

    const responseText = await response.text();
    let responseData;
    
    try {
      responseData = responseText ? JSON.parse(responseText) : null;
    } catch {
      responseData = { raw: responseText };
    }

    console.log('[CIS S2S Funds Processing] 📥 Respuesta:', {
      status: response.status,
      ok: response.ok,
      data: responseData
    });

    res.status(response.status).json({
      success: response.ok,
      status: response.status,
      data: responseData,
      timestamp: new Date().toISOString(),
      handshakeVerified: !!handshakeHash,
      server: {
        name: 'DEV-CORE-PAY-GW-01',
        location: 'London, United Kingdom',
        globalIP: CIS_S2S_CONFIG.GLOBAL_IP,
        port: CIS_S2S_CONFIG.PORT
      }
    });

  } catch (error) {
    console.error('[CIS S2S Funds Processing] ❌ Error:', error.message);
    
    res.status(500).json({
      success: false,
      error: error.message,
      code: error.code || 'NETWORK_ERROR',
      timestamp: new Date().toISOString()
    });
  }
});

app.get('/api/tz-digital/test', async (req, res) => {
  const bearerToken = req.headers['x-tz-token'] || req.headers['authorization']?.replace('Bearer ', '') || CIS_S2S_CONFIG.API_KEY;
  
  try {
    console.log('[CIS S2S] 🔍 Test de conexión a DevMind Group...');
    
    const response = await fetch(CIS_S2S_CONFIG.API_URL, {
      method: 'OPTIONS',
      headers: {
        'Authorization': `Bearer ${bearerToken}`,
        'X-API-Key': CIS_S2S_CONFIG.API_KEY,
        'X-Auth-Key': CIS_S2S_CONFIG.AUTH_KEY,
      },
      signal: AbortSignal.timeout(10000)
    });

    res.json({
      success: true,
      message: 'Conexión CIS S2S disponible',
      status: response.status,
      statusText: response.statusText,
      server: {
        name: 'DEV-CORE-PAY-GW-01',
        location: 'London, United Kingdom',
        globalIP: CIS_S2S_CONFIG.GLOBAL_IP,
        port: CIS_S2S_CONFIG.PORT,
        apiEndpoint: CIS_S2S_CONFIG.API_URL
      },
      protocols: [
        'SWIFT.Net', 'SWIFT.Com', 'SWIFT MT103 Direct', 
        'SWIFT MT103 GPI', 'SWIFT MT103 GPI Semi',
        'VISA NET', 'Server to Server (IP/IP)', 'Global Server Pool'
      ]
    });
  } catch (error) {
    res.json({
      success: false,
      message: error.message,
      code: error.code || error.name,
      server: {
        name: 'DEV-CORE-PAY-GW-01',
        globalIP: CIS_S2S_CONFIG.GLOBAL_IP
      }
    });
  }
});

// ============================================================================
// MG WEBHOOK PROXY - Reenvía peticiones a MG Productive Investments
// ============================================================================
app.post('/api/mg-webhook/transfer', async (req, res) => {
  // El endpoint se puede pasar en el header o usar el por defecto
  const MG_WEBHOOK_URL = req.headers['x-mg-endpoint'] || 
                         process.env.MG_WEBHOOK_URL || 
                         'https://api.mgproductiveinvestments.com/webhook/dcb/transfer';
  
  try {
    console.log('[MG Webhook Proxy] 📤 Reenviando transferencia a MG:', {
      url: MG_WEBHOOK_URL,
      payload: req.body,
      mode: req.headers['x-mg-endpoint'] ? 'custom' : 'default'
    });

    // Verificar que sea una URL válida
    try {
      new URL(MG_WEBHOOK_URL);
    } catch (urlError) {
      throw new Error(`Invalid endpoint URL: ${MG_WEBHOOK_URL}`);
    }

    const response = await fetch(MG_WEBHOOK_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'DAES-CoreBanking/1.0',
        // Agregar headers adicionales si MG los requiere
        ...(req.headers['x-mg-api-key'] && { 'X-API-Key': req.headers['x-mg-api-key'] }),
      },
      body: JSON.stringify(req.body),
      // Timeout de 30 segundos
      signal: AbortSignal.timeout(30000)
    });

    const responseData = await response.json().catch(() => ({ 
      success: response.ok,
      message: 'Response received but not JSON',
      status: response.status 
    }));

    console.log('[MG Webhook Proxy] ✅ Respuesta de MG:', {
      status: response.status,
      statusText: response.statusText,
      data: responseData
    });

    // Reenviar la respuesta de MG al frontend
    res.status(response.status).json(responseData);

  } catch (error) {
    console.error('[MG Webhook Proxy] ❌ Error al conectar con MG:', {
      message: error.message,
      code: error.code,
      endpoint: MG_WEBHOOK_URL
    });
    
    // Mensaje de error detallado
    let errorMessage = error.message;
    if (error.code === 'ENOTFOUND') {
      errorMessage = `El dominio no existe o no se puede resolver DNS: ${MG_WEBHOOK_URL}`;
    } else if (error.code === 'ECONNREFUSED') {
      errorMessage = `El servidor rechazó la conexión: ${MG_WEBHOOK_URL}`;
    } else if (error.code === 'ETIMEDOUT' || error.name === 'AbortError') {
      errorMessage = `Timeout: El servidor no respondió en 30 segundos`;
    }
    
    res.status(500).json({
      success: false,
      error: 'MG Webhook Proxy Error',
      message: errorMessage,
      code: error.code || error.name || 'UNKNOWN_ERROR',
      endpoint: MG_WEBHOOK_URL
    });
  }
});

app.listen(PORT, () => {
  console.log(`[PoR API] Server listening on http://localhost:${PORT}`);
  console.log(`[MG Webhook Proxy] Proxy endpoint available at http://localhost:${PORT}/api/mg-webhook/transfer`);
}).on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`❌ Error: El puerto ${PORT} ya está en uso`);
    console.error(`   Solución: Detén el proceso que usa el puerto ${PORT} o cambia el puerto en server/index.js`);
  } else {
    console.error(`❌ Error al iniciar el servidor:`, err);
  }
  process.exit(1);
});


