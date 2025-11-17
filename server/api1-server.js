/**
 * DAES API1 Server - Compatible con Anchor VUSD
 * API institucional para Proof-of-Reserves, Pledges, Payouts y Reconciliation
 * Compatible con https://anchor.vergy.world
 */

import express from 'express';
import cors from 'cors';
import crypto from 'crypto';
import fetch from 'node-fetch';

const PORT = process.env.PORT || 8788;
const app = express();

app.use(cors());
app.use(express.json({ limit: '5mb' }));

// Credenciales desde variables de entorno
const DAES_API_KEY = process.env.DAES_API_KEY || 'por_dev_key';
const DAES_SECRET_KEY = process.env.DAES_SECRET_KEY || 'sk_dev_secret';
const DAES_POR_ID = process.env.DAES_POR_ID || 'por_dev_id';
const DAES_WEBHOOK_SECRET = process.env.DAES_WEBHOOK_SECRET || 'whsec_dev_secret';

// Anchor webhook URLs
const ANCHOR_WEBHOOK_PLEDGES = 'https://anchor.vergy.world/daes/webhooks/pledges';
const ANCHOR_WEBHOOK_PAYOUTS = 'https://anchor.vergy.world/daes/webhooks/payouts';

// In-memory storage (en producción usar PostgreSQL)
let pledgesDB = [];
let payoutsDB = [];
let idempotencyKeys = new Map();

// ==========================================
// MIDDLEWARE: Autenticación
// ==========================================

function requireAuth(req, res, next) {
  const auth = req.headers['authorization'] || '';
  const secret = req.headers['x-secret-key'] || '';
  const bearer = auth.startsWith('Bearer ') ? auth.slice(7) : '';
  
  if (!bearer) {
    console.log('[API1] 401 - Missing Authorization header');
    return res.status(401).json({ 
      error: 'UNAUTHORIZED', 
      message: 'Missing Authorization header' 
    });
  }
  
  if (bearer !== DAES_API_KEY) {
    console.log('[API1] 403 - Invalid API key');
    return res.status(403).json({ 
      error: 'FORBIDDEN', 
      message: 'Invalid API key' 
    });
  }
  
  if (!secret || secret !== DAES_SECRET_KEY) {
    console.log('[API1] 403 - Invalid Secret Key');
    return res.status(403).json({ 
      error: 'FORBIDDEN', 
      message: 'Invalid Secret Key' 
    });
  }
  
  req.authenticated = true;
  next();
}

// ==========================================
// MIDDLEWARE: Idempotencia
// ==========================================

function handleIdempotency(req, res, next) {
  const idempotencyKey = req.headers['idempotency-key'];
  
  if (!idempotencyKey) {
    return next(); // Opcional, continuar sin idempotencia
  }
  
  // Verificar si ya se procesó esta key
  if (idempotencyKeys.has(idempotencyKey)) {
    const cached = idempotencyKeys.get(idempotencyKey);
    console.log('[API1] 💾 Idempotency hit:', idempotencyKey);
    return res.status(cached.status).json(cached.response);
  }
  
  // Guardar función para cachear respuesta
  req.cacheIdempotentResponse = (status, response) => {
    idempotencyKeys.set(idempotencyKey, { status, response, timestamp: Date.now() });
    // Limpiar después de 24 horas
    setTimeout(() => idempotencyKeys.delete(idempotencyKey), 24 * 60 * 60 * 1000);
  };
  
  next();
}

// ==========================================
// UTILIDADES: HMAC Webhooks
// ==========================================

async function sendHMACWebhook(url, event, payload) {
  try {
    const timestamp = new Date().toISOString();
    const body = JSON.stringify(payload);
    const signaturePayload = timestamp + body;
    const signature = crypto
      .createHmac('sha256', DAES_WEBHOOK_SECRET)
      .update(signaturePayload)
      .digest('base64');
    
    console.log('[API1] 📤 Enviando webhook:', event, 'a', url);
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-DAES-Timestamp': timestamp,
        'X-DAES-Signature': signature,
        'X-DAES-Event': event
      },
      body
    });
    
    console.log('[API1] 📥 Webhook respuesta:', response.status, response.statusText);
    
    // Reintentos si 5xx
    if (response.status >= 500 && response.status < 600) {
      console.log('[API1] ⚠️ Server error, reintentando en 5s...');
      setTimeout(() => sendHMACWebhook(url, event, payload), 5000);
    }
    
  } catch (err) {
    console.error('[API1] ❌ Error enviando webhook:', err.message);
  }
}

// ==========================================
// MÓDULO 1: Proof of Reserves (mantener compatibilidad)
// ==========================================

// GET PoR Summary
app.get('/api/v1/proof-of-reserves/:porId', requireAuth, (req, res) => {
  const { porId } = req.params;
  
  if (porId !== DAES_POR_ID) {
    return res.status(404).json({ error: 'NOT_FOUND', message: 'PoR ID not found' });
  }
  
  // Calcular desde pledges activos
  const activePledges = pledgesDB.filter(p => p.status === 'ACTIVE');
  const totalPledges = activePledges.reduce((sum, p) => sum + parseFloat(p.amountUsd), 0);
  const totalAvailable = activePledges.reduce((sum, p) => sum + parseFloat(p.available), 0);
  
  // Reservas totales (hardcoded por ahora, en producción desde DB)
  const totalReserves = 100000000;
  
  res.json({
    porId: DAES_POR_ID,
    asOf: new Date().toISOString(),
    totalUsdReserves: totalReserves.toFixed(2),
    totalUsdPledges: totalPledges.toFixed(2),
    available: totalAvailable.toFixed(2),
    circulatingCap: totalAvailable.toFixed(2),
    coverageRatio: totalPledges > 0 ? (totalReserves / totalPledges).toFixed(4) : '0.0000'
  });
});

// GET PoR Data (detalle)
app.get('/api/v1/proof-of-reserves/:porId/data', requireAuth, (req, res) => {
  const { porId } = req.params;
  
  if (porId !== DAES_POR_ID) {
    return res.status(404).json({ error: 'NOT_FOUND', message: 'PoR ID not found' });
  }
  
  res.json({
    porId: DAES_POR_ID,
    schemaVersion: '1.0.0',
    asOf: new Date().toISOString(),
    reserves: {
      m2_banking: 40000000,
      m3_blockchain: 60000000,
      total: 100000000
    },
    pledges: pledgesDB.filter(p => p.status === 'ACTIVE'),
    metadata: {
      compliance: ['ISO_27001', 'ISO_20022', 'FATF_AML'],
      auditor: 'DAES Internal',
      lastAudit: new Date().toISOString()
    }
  });
});

// ==========================================
// MÓDULO 2: Pledges / Lockbox
// ==========================================

// POST Crear pledge
app.post('/api/v1/pledges', requireAuth, handleIdempotency, (req, res) => {
  const { porId, amountUsd, currency, termDays, beneficiary, notes } = req.body;
  
  // Validaciones
  if (!amountUsd || amountUsd <= 0) {
    return res.status(400).json({ error: 'INVALID_AMOUNT', message: 'Amount must be > 0' });
  }
  
  if (!beneficiary) {
    return res.status(400).json({ error: 'INVALID_BENEFICIARY', message: 'Beneficiary required' });
  }
  
  const pledgeId = `PL-${Date.now()}`;
  const lockedAt = new Date().toISOString();
  const expiresAt = termDays ? new Date(Date.now() + termDays * 24 * 60 * 60 * 1000).toISOString() : undefined;
  
  const pledge = {
    pledgeId,
    porId: porId || DAES_POR_ID,
    status: 'ACTIVE',
    amountUsd: parseFloat(amountUsd).toFixed(2),
    available: parseFloat(amountUsd).toFixed(2),
    currency: currency || 'USD',
    beneficiary,
    notes: notes || '',
    lockedAt,
    expiresAt,
    termDays: termDays || null
  };
  
  pledgesDB.push(pledge);
  
  // Cachear respuesta idempotente
  if (req.cacheIdempotentResponse) {
    req.cacheIdempotentResponse(200, pledge);
  }
  
  console.log('[API1] ✅ Pledge creado:', pledgeId, amountUsd, beneficiary);
  
  // Enviar webhook al Anchor
  sendHMACWebhook(ANCHOR_WEBHOOK_PLEDGES, 'PLEDGE_CREATED', {
    event: 'PLEDGE_CREATED',
    pledgeId,
    porId: pledge.porId,
    amountUsd: pledge.amountUsd,
    available: pledge.available,
    asOf: lockedAt
  });
  
  res.json(pledge);
});

// GET Listar pledges
app.get('/api/v1/pledges', requireAuth, (req, res) => {
  const { status, porId } = req.query;
  
  let filtered = pledgesDB;
  
  if (status) {
    filtered = filtered.filter(p => p.status === status);
  }
  
  if (porId) {
    filtered = filtered.filter(p => p.porId === porId);
  }
  
  res.json({
    items: filtered,
    total: filtered.length,
    asOf: new Date().toISOString()
  });
});

// POST Ajustar pledge
app.post('/api/v1/pledges/:pledgeId/adjust', requireAuth, handleIdempotency, (req, res) => {
  const { pledgeId } = req.params;
  const { deltaUsd, reason } = req.body;
  
  const pledge = pledgesDB.find(p => p.pledgeId === pledgeId);
  
  if (!pledge) {
    return res.status(404).json({ error: 'NOT_FOUND', message: 'Pledge not found' });
  }
  
  if (pledge.status !== 'ACTIVE') {
    return res.status(400).json({ error: 'INVALID_STATUS', message: 'Only ACTIVE pledges can be adjusted' });
  }
  
  const delta = parseFloat(deltaUsd);
  const newAvailable = parseFloat(pledge.available) + delta;
  
  if (newAvailable < 0) {
    return res.status(400).json({ error: 'INSUFFICIENT_FUNDS', message: 'Adjustment would result in negative available' });
  }
  
  pledge.available = newAvailable.toFixed(2);
  pledge.lastAdjustedAt = new Date().toISOString();
  pledge.adjustmentReason = reason;
  
  const response = {
    pledgeId: pledge.pledgeId,
    status: pledge.status,
    amountUsd: pledge.amountUsd,
    available: pledge.available,
    asOf: pledge.lastAdjustedAt
  };
  
  if (req.cacheIdempotentResponse) {
    req.cacheIdempotentResponse(200, response);
  }
  
  console.log('[API1] ✅ Pledge ajustado:', pledgeId, 'delta:', deltaUsd);
  
  // Webhook
  sendHMACWebhook(ANCHOR_WEBHOOK_PLEDGES, 'PLEDGE_ADJUSTED', {
    event: 'PLEDGE_ADJUSTED',
    pledgeId,
    deltaUsd: delta.toFixed(2),
    available: pledge.available,
    reason,
    asOf: pledge.lastAdjustedAt
  });
  
  res.json(response);
});

// POST Liberar pledge
app.post('/api/v1/pledges/:pledgeId/release', requireAuth, handleIdempotency, (req, res) => {
  const { pledgeId } = req.params;
  const { reason } = req.body;
  
  const pledge = pledgesDB.find(p => p.pledgeId === pledgeId);
  
  if (!pledge) {
    return res.status(404).json({ error: 'NOT_FOUND', message: 'Pledge not found' });
  }
  
  pledge.status = 'RELEASED';
  pledge.releasedAt = new Date().toISOString();
  pledge.releaseReason = reason;
  
  const response = {
    pledgeId: pledge.pledgeId,
    status: 'RELEASED',
    releasedAt: pledge.releasedAt,
    reason
  };
  
  if (req.cacheIdempotentResponse) {
    req.cacheIdempotentResponse(200, response);
  }
  
  console.log('[API1] ✅ Pledge liberado:', pledgeId);
  
  // Webhook
  sendHMACWebhook(ANCHOR_WEBHOOK_PLEDGES, 'PLEDGE_RELEASED', {
    event: 'PLEDGE_RELEASED',
    pledgeId,
    amountUsd: pledge.amountUsd,
    asOf: pledge.releasedAt,
    reason
  });
  
  res.json(response);
});

// ==========================================
// MÓDULO 3: Reserves & Attestations
// ==========================================

// GET Resumen de reservas
app.get('/api/v1/reserves/summary', requireAuth, (req, res) => {
  const activePledges = pledgesDB.filter(p => p.status === 'ACTIVE');
  const totalPledges = activePledges.reduce((sum, p) => sum + parseFloat(p.amountUsd), 0);
  const totalReserves = 100000000; // Hardcoded, en producción desde DB
  const unpledged = totalReserves - totalPledges;
  
  res.json({
    asOf: new Date().toISOString(),
    totalUsdReserves: totalReserves.toFixed(2),
    totalUsdPledges: totalPledges.toFixed(2),
    unpledgedUsd: unpledged.toFixed(2),
    circulatingCap: activePledges.reduce((sum, p) => sum + parseFloat(p.available), 0).toFixed(2),
    coverageRatio: totalPledges > 0 ? (totalReserves / totalPledges).toFixed(4) : '0.0000'
  });
});

// GET Última attestation
app.get('/api/v1/attestations/latest', requireAuth, (req, res) => {
  const date = new Date().toISOString().split('T')[0];
  const hash = crypto.createHash('sha256').update(`attestation-${date}`).digest('hex');
  
  res.json({
    asOf: new Date().toISOString(),
    format: 'pdf',
    url: `https://luxliqdaes.cloud/attestations/${date}.pdf`,
    hash: `sha256:${hash}`,
    signingKeyId: 'daes-attestor-1',
    compliance: ['ISO_27001', 'ISO_20022', 'FATF_AML']
  });
});

// ==========================================
// MÓDULO 4: Payouts (VUSD → USD)
// ==========================================

// POST Crear payout
app.post('/api/v1/payouts', requireAuth, handleIdempotency, (req, res) => {
  const { externalRef, amountUsd, currency, pledgeId, beneficiary, callbackUrl } = req.body;
  
  // Validaciones
  if (!externalRef || !amountUsd || !pledgeId) {
    return res.status(400).json({ 
      error: 'INVALID_REQUEST', 
      message: 'externalRef, amountUsd, and pledgeId are required' 
    });
  }
  
  const pledge = pledgesDB.find(p => p.pledgeId === pledgeId && p.status === 'ACTIVE');
  
  if (!pledge) {
    return res.status(404).json({ error: 'PLEDGE_NOT_FOUND', message: 'Active pledge not found' });
  }
  
  const amount = parseFloat(amountUsd);
  const available = parseFloat(pledge.available);
  
  if (amount > available) {
    return res.status(400).json({ 
      error: 'INSUFFICIENT_FUNDS', 
      message: `Insufficient funds in pledge. Available: ${available}` 
    });
  }
  
  const payoutId = `PO-${Date.now()}`;
  
  const payout = {
    payoutId,
    externalRef,
    pledgeId,
    status: 'PENDING',
    amountUsd: amount.toFixed(2),
    currency: currency || 'USD',
    beneficiary: beneficiary || { name: 'Unknown', accountType: 'retail' },
    callbackUrl: callbackUrl || null,
    createdAt: new Date().toISOString(),
    completedAt: null
  };
  
  payoutsDB.push(payout);
  
  // Reducir available del pledge
  pledge.available = (available - amount).toFixed(2);
  
  const response = {
    payoutId,
    status: 'PENDING',
    createdAt: payout.createdAt
  };
  
  if (req.cacheIdempotentResponse) {
    req.cacheIdempotentResponse(200, response);
  }
  
  console.log('[API1] ✅ Payout creado:', payoutId, 'para', externalRef);
  
  // Simular procesamiento asíncrono
  setTimeout(() => {
    payout.status = 'COMPLETED';
    payout.completedAt = new Date().toISOString();
    
    // Webhook al callback del Anchor
    if (callbackUrl) {
      sendHMACWebhook(callbackUrl, 'PAYOUT_COMPLETED', {
        event: 'PAYOUT_COMPLETED',
        payoutId,
        externalRef,
        amountUsd: payout.amountUsd,
        status: 'COMPLETED',
        completedAt: payout.completedAt
      });
    }
    
    console.log('[API1] ✅ Payout completado:', payoutId);
  }, 2000);
  
  res.json(response);
});

// GET Consultar transacción por externalRef
app.get('/api/v1/transactions/:externalRef', requireAuth, (req, res) => {
  const { externalRef } = req.params;
  
  const payout = payoutsDB.find(p => p.externalRef === externalRef);
  
  if (!payout) {
    return res.status(404).json({ error: 'NOT_FOUND', message: 'Transaction not found' });
  }
  
  res.json({
    externalRef: payout.externalRef,
    status: payout.status,
    payoutId: payout.payoutId,
    amountUsd: payout.amountUsd,
    createdAt: payout.createdAt,
    completedAt: payout.completedAt
  });
});

// ==========================================
// MÓDULO 6: Reconciliation
// ==========================================

// GET Reporte de conciliación
app.get('/api/v1/reconciliation', requireAuth, (req, res) => {
  const { date, format } = req.query;
  const targetDate = date || new Date().toISOString().split('T')[0];
  
  const pledgesOnDate = pledgesDB.filter(p => p.lockedAt.startsWith(targetDate));
  const payoutsOnDate = payoutsDB.filter(p => p.createdAt.startsWith(targetDate));
  
  if (format === 'csv') {
    // CSV format
    let csv = 'Type,ID,Amount,Status,Timestamp\n';
    pledgesOnDate.forEach(p => {
      csv += `PLEDGE,${p.pledgeId},${p.amountUsd},${p.status},${p.lockedAt}\n`;
    });
    payoutsOnDate.forEach(p => {
      csv += `PAYOUT,${p.payoutId},${p.amountUsd},${p.status},${p.createdAt}\n`;
    });
    
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="reconciliation_${targetDate}.csv"`);
    return res.send(csv);
  }
  
  // JSON format (default)
  res.json({
    date: targetDate,
    pledges: pledgesOnDate,
    payouts: payoutsOnDate,
    summary: {
      totalPledges: pledgesOnDate.length,
      totalPledgeAmount: pledgesOnDate.reduce((s, p) => s + parseFloat(p.amountUsd), 0).toFixed(2),
      totalPayouts: payoutsOnDate.length,
      totalPayoutAmount: payoutsOnDate.reduce((s, p) => s + parseFloat(p.amountUsd), 0).toFixed(2)
    }
  });
});

// ==========================================
// Health Check
// ==========================================

app.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    service: 'DAES API1 - Anchor Compatible',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    endpoints: {
      por: '/api/v1/proof-of-reserves/:porId',
      pledges: '/api/v1/pledges',
      payouts: '/api/v1/payouts',
      reconciliation: '/api/v1/reconciliation'
    }
  });
});

app.listen(PORT, () => {
  console.log(`[API1] 🚀 Server listening on http://localhost:${PORT}`);
  console.log(`[API1] 🔗 Compatible with Anchor VUSD at https://anchor.vergy.world`);
  console.log(`[API1] 🔑 Auth: Bearer ${DAES_API_KEY}`);
  console.log(`[API1] 📊 PoR ID: ${DAES_POR_ID}`);
});

