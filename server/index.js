import express from 'express';
import cors from 'cors';
import fetch from 'node-fetch';
import { ensureDataFiles, getApiKeys, saveApiKeys, getPorReports, savePorReports } from './storage.js';

const PORT = process.env.PORT || 8787;
const app = express();

app.use(cors());
app.use(express.json({ limit: '2mb' }));

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

app.listen(PORT, () => {
  console.log(`[PoR API] Server listening on http://localhost:${PORT}`);
});


