# 🔐 DAES API1 - Anchor VUSD Integration

## 📋 Descripción

API institucional de **Proof-of-Reserves** 100% compatible con el backend Anchor de VUSD instalado en `https://anchor.vergy.world`.

Implementa protocolo completo para:
- ✅ Proof of Reserves (PoR)
- ✅ Pledges/Lockbox (bloqueo de reservas)
- ✅ Payouts (retiros VUSD → USD)
- ✅ Reconciliation (conciliación diaria)
- ✅ Webhooks HMAC firmados

---

## 🚀 Inicio Rápido

### Levantar servidor API1:

```bash
node server/api1-server.js
```

**Puerto:** `8788`  
**Base URL:** `http://localhost:8788`

### Credenciales (las mismas que usa Anchor):

```bash
DAES_API_KEY=por_1763215039421_v9p76zcxqxd
DAES_SECRET_KEY=sk_AsWH12YRHFo9BG9DRYGtJFWDumr4lps2ne6vywfKpWc8Hm3p3wrhPa7IxkagWbvs
DAES_POR_ID=por_1763215039421_v9p76zcxqxd
```

---

## 🔒 Autenticación

**Todos los endpoints protegidos requieren:**

```http
Authorization: Bearer por_1763215039421_v9p76zcxqxd
X-Secret-Key: sk_AsWH12YRHFo9BG9DRYGtJFWDumr4lps2ne6vywfKpWc8Hm3p3wrhPa7IxkagWbvs
```

**Códigos de error:**
- `401 UNAUTHORIZED` - Falta header Authorization
- `403 FORBIDDEN` - API Key o Secret Key inválidos

---

## 📡 MÓDULO 1: Proof of Reserves (PoR)

### 1.1 GET PoR Summary

**Endpoint:** `GET /api/v1/proof-of-reserves/{porId}`

**Ejemplo cURL:**

```bash
curl -X GET \
  'http://localhost:8788/api/v1/proof-of-reserves/por_1763215039421_v9p76zcxqxd' \
  -H 'Authorization: Bearer por_1763215039421_v9p76zcxqxd' \
  -H 'X-Secret-Key: sk_AsWH12YRHFo9BG9DRYGtJFWDumr4lps2ne6vywfKpWc8Hm3p3wrhPa7IxkagWbvs' \
  -H 'Accept: application/json'
```

**Respuesta exitosa (200):**

```json
{
  "porId": "por_1763215039421_v9p76zcxqxd",
  "asOf": "2025-11-16T22:00:00.000Z",
  "totalUsdReserves": "100000000.00",
  "totalUsdPledges": "5000000.00",
  "available": "4500000.00",
  "circulatingCap": "4500000.00",
  "coverageRatio": "20.0000"
}
```

**Campos clave para Anchor:**
- `totalUsdPledges` - Total comprometido
- `available` - Disponible para circulación
- `circulatingCap` - Cap máximo on-chain
- `coverageRatio` - Ratio reservas/pledges

---

### 1.2 GET PoR Data (Detalle)

**Endpoint:** `GET /api/v1/proof-of-reserves/{porId}/data`

**Ejemplo cURL:**

```bash
curl -X GET \
  'http://localhost:8788/api/v1/proof-of-reserves/por_1763215039421_v9p76zcxqxd/data' \
  -H 'Authorization: Bearer por_1763215039421_v9p76zcxqxd' \
  -H 'X-Secret-Key: sk_AsWH12YRHFo9BG9DRYGtJFWDumr4lps2ne6vywfKpWc8Hm3p3wrhPa7IxkagWbvs'
```

**Respuesta:**

```json
{
  "porId": "por_1763215039421_v9p76zcxqxd",
  "schemaVersion": "1.0.0",
  "asOf": "2025-11-16T22:00:00.000Z",
  "reserves": {
    "m2_banking": 40000000,
    "m3_blockchain": 60000000,
    "total": 100000000
  },
  "pledges": [...],
  "metadata": {
    "compliance": ["ISO_27001", "ISO_20022", "FATF_AML"],
    "auditor": "DAES Internal",
    "lastAudit": "2025-11-16T22:00:00.000Z"
  }
}
```

---

## 🔒 MÓDULO 2: Pledges / Lockbox

### 2.1 POST Crear Pledge

**Endpoint:** `POST /api/v1/pledges`

**Headers:**
```http
Authorization: Bearer por_1763215039421_v9p76zcxqxd
X-Secret-Key: sk_AsWH12YRHFo9BG9DRYGtJFWDumr4lps2ne6vywfKpWc8Hm3p3wrhPa7IxkagWbvs
Idempotency-Key: uuid-12345678 (opcional)
Content-Type: application/json
```

**Body:**

```json
{
  "porId": "por_1763215039421_v9p76zcxqxd",
  "amountUsd": "5000000.00",
  "currency": "USD",
  "termDays": 90,
  "beneficiary": "VUSD",
  "notes": "Initial pledge for VUSD"
}
```

**Ejemplo cURL:**

```bash
curl -X POST \
  'http://localhost:8788/api/v1/pledges' \
  -H 'Authorization: Bearer por_1763215039421_v9p76zcxqxd' \
  -H 'X-Secret-Key: sk_AsWH12YRHFo9BG9DRYGtJFWDumr4lps2ne6vywfKpWc8Hm3p3wrhPa7IxkagWbvs' \
  -H 'Idempotency-Key: pledge-001' \
  -H 'Content-Type: application/json' \
  -d '{
    "porId": "por_1763215039421_v9p76zcxqxd",
    "amountUsd": "5000000.00",
    "currency": "USD",
    "termDays": 90,
    "beneficiary": "VUSD",
    "notes": "Initial pledge for VUSD"
  }'
```

**Respuesta (200):**

```json
{
  "pledgeId": "PL-1731787200000",
  "porId": "por_1763215039421_v9p76zcxqxd",
  "status": "ACTIVE",
  "amountUsd": "5000000.00",
  "available": "5000000.00",
  "currency": "USD",
  "beneficiary": "VUSD",
  "notes": "Initial pledge for VUSD",
  "lockedAt": "2025-11-16T22:00:00.000Z",
  "expiresAt": "2026-02-14T22:00:00.000Z",
  "termDays": 90
}
```

---

### 2.2 GET Listar Pledges Activos

**Endpoint:** `GET /api/v1/pledges?status=ACTIVE&porId={porId}`

**Ejemplo cURL:**

```bash
curl -X GET \
  'http://localhost:8788/api/v1/pledges?status=ACTIVE&porId=por_1763215039421_v9p76zcxqxd' \
  -H 'Authorization: Bearer por_1763215039421_v9p76zcxqxd' \
  -H 'X-Secret-Key: sk_AsWH12YRHFo9BG9DRYGtJFWDumr4lps2ne6vywfKpWc8Hm3p3wrhPa7IxkagWbvs'
```

**Respuesta:**

```json
{
  "items": [
    {
      "pledgeId": "PL-1731787200000",
      "status": "ACTIVE",
      "amountUsd": "5000000.00",
      "available": "4500000.00",
      "lockedAt": "2025-11-16T22:00:00.000Z",
      "expiresAt": "2026-02-14T22:00:00.000Z"
    }
  ],
  "total": 1,
  "asOf": "2025-11-16T22:00:00.000Z"
}
```

**Uso por Anchor:**
- El Anchor suma `available` de todos los items para calcular `CIRC_CAP`
- Publica `CIRC_CAP` on-chain en Stellar (ManageData)

---

### 2.3 POST Ajustar Pledge

**Endpoint:** `POST /api/v1/pledges/{pledgeId}/adjust`

**Body:**

```json
{
  "deltaUsd": "-1000000.00",
  "reason": "support payouts"
}
```

**Ejemplo cURL:**

```bash
curl -X POST \
  'http://localhost:8788/api/v1/pledges/PL-1731787200000/adjust' \
  -H 'Authorization: Bearer por_1763215039421_v9p76zcxqxd' \
  -H 'X-Secret-Key: sk_AsWH12YRHFo9BG9DRYGtJFWDumr4lps2ne6vywfKpWc8Hm3p3wrhPa7IxkagWbvs' \
  -H 'Idempotency-Key: adjust-001' \
  -H 'Content-Type: application/json' \
  -d '{
    "deltaUsd": "-1000000.00",
    "reason": "support payouts"
  }'
```

**Respuesta:**

```json
{
  "pledgeId": "PL-1731787200000",
  "status": "ACTIVE",
  "amountUsd": "5000000.00",
  "available": "4000000.00",
  "asOf": "2025-11-16T22:05:00.000Z"
}
```

**Notas:**
- `deltaUsd` negativo = consumir/reducir available
- `deltaUsd` positivo = ampliar/aumentar available

---

### 2.4 POST Liberar Pledge

**Endpoint:** `POST /api/v1/pledges/{pledgeId}/release`

**Body:**

```json
{
  "reason": "end of program"
}
```

**Ejemplo cURL:**

```bash
curl -X POST \
  'http://localhost:8788/api/v1/pledges/PL-1731787200000/release' \
  -H 'Authorization: Bearer por_1763215039421_v9p76zcxqxd' \
  -H 'X-Secret-Key: sk_AsWH12YRHFo9BG9DRYGtJFWDumr4lps2ne6vywfKpWc8Hm3p3wrhPa7IxkagWbvs' \
  -H 'Content-Type: application/json' \
  -d '{
    "reason": "end of program"
  }'
```

**Respuesta:**

```json
{
  "pledgeId": "PL-1731787200000",
  "status": "RELEASED",
  "releasedAt": "2025-11-16T22:10:00.000Z",
  "reason": "end of program"
}
```

---

## 💸 MÓDULO 4: Payouts (VUSD → USD)

### 4.1 POST Crear Payout

**Endpoint:** `POST /api/v1/payouts`

**Body:**

```json
{
  "externalRef": "SEP24-TRX-001",
  "amountUsd": "500.00",
  "currency": "USD",
  "pledgeId": "PL-1731787200000",
  "beneficiary": {
    "name": "John Doe",
    "accountType": "institutional"
  },
  "callbackUrl": "https://anchor.vergy.world/daes/webhooks/payouts"
}
```

**Ejemplo cURL:**

```bash
curl -X POST \
  'http://localhost:8788/api/v1/payouts' \
  -H 'Authorization: Bearer por_1763215039421_v9p76zcxqxd' \
  -H 'X-Secret-Key: sk_AsWH12YRHFo9BG9DRYGtJFWDumr4lps2ne6vywfKpWc8Hm3p3wrhPa7IxkagWbvs' \
  -H 'Idempotency-Key: payout-001' \
  -H 'Content-Type: application/json' \
  -d '{
    "externalRef": "SEP24-TRX-001",
    "amountUsd": "500.00",
    "currency": "USD",
    "pledgeId": "PL-1731787200000",
    "beneficiary": {
      "name": "John Doe",
      "accountType": "institutional"
    },
    "callbackUrl": "https://anchor.vergy.world/daes/webhooks/payouts"
  }'
```

**Respuesta inmediata:**

```json
{
  "payoutId": "PO-1731787400000",
  "status": "PENDING",
  "createdAt": "2025-11-16T22:30:00.000Z"
}
```

**Después de 2 segundos (webhook al callbackUrl):**

```json
{
  "event": "PAYOUT_COMPLETED",
  "payoutId": "PO-1731787400000",
  "externalRef": "SEP24-TRX-001",
  "amountUsd": "500.00",
  "status": "COMPLETED",
  "completedAt": "2025-11-16T22:30:02.000Z"
}
```

---

### 4.2 GET Consultar Transacción

**Endpoint:** `GET /api/v1/transactions/{externalRef}`

**Ejemplo cURL:**

```bash
curl -X GET \
  'http://localhost:8788/api/v1/transactions/SEP24-TRX-001' \
  -H 'Authorization: Bearer por_1763215039421_v9p76zcxqxd' \
  -H 'X-Secret-Key: sk_AsWH12YRHFo9BG9DRYGtJFWDumr4lps2ne6vywfKpWc8Hm3p3wrhPa7IxkagWbvs'
```

**Respuesta:**

```json
{
  "externalRef": "SEP24-TRX-001",
  "status": "COMPLETED",
  "payoutId": "PO-1731787400000",
  "amountUsd": "500.00",
  "createdAt": "2025-11-16T22:30:00.000Z",
  "completedAt": "2025-11-16T22:30:02.000Z"
}
```

---

## 📊 MÓDULO 3: Reserves Summary

### 3.1 GET Resumen de Reservas

**Endpoint:** `GET /api/v1/reserves/summary`

**Ejemplo cURL:**

```bash
curl -X GET \
  'http://localhost:8788/api/v1/reserves/summary' \
  -H 'Authorization: Bearer por_1763215039421_v9p76zcxqxd' \
  -H 'X-Secret-Key: sk_AsWH12YRHFo9BG9DRYGtJFWDumr4lps2ne6vywfKpWc8Hm3p3wrhPa7IxkagWbvs'
```

**Respuesta:**

```json
{
  "asOf": "2025-11-16T22:00:00.000Z",
  "totalUsdReserves": "100000000.00",
  "totalUsdPledges": "5000000.00",
  "unpledgedUsd": "95000000.00",
  "circulatingCap": "4500000.00",
  "coverageRatio": "20.0000"
}
```

---

### 3.2 GET Última Attestation

**Endpoint:** `GET /api/v1/attestations/latest`

**Ejemplo cURL:**

```bash
curl -X GET \
  'http://localhost:8788/api/v1/attestations/latest' \
  -H 'Authorization: Bearer por_1763215039421_v9p76zcxqxd' \
  -H 'X-Secret-Key: sk_AsWH12YRHFo9BG9DRYGtJFWDumr4lps2ne6vywfKpWc8Hm3p3wrhPa7IxkagWbvs'
```

**Respuesta:**

```json
{
  "asOf": "2025-11-16T22:00:00.000Z",
  "format": "pdf",
  "url": "https://luxliqdaes.cloud/attestations/2025-11-16.pdf",
  "hash": "sha256:abc123...",
  "signingKeyId": "daes-attestor-1",
  "compliance": ["ISO_27001", "ISO_20022", "FATF_AML"]
}
```

---

## 📁 MÓDULO 6: Reconciliation

### 6.1 GET Reporte de Conciliación

**Endpoint:** `GET /api/v1/reconciliation?date=YYYY-MM-DD&format=json|csv`

**Ejemplo cURL (JSON):**

```bash
curl -X GET \
  'http://localhost:8788/api/v1/reconciliation?date=2025-11-16&format=json' \
  -H 'Authorization: Bearer por_1763215039421_v9p76zcxqxd' \
  -H 'X-Secret-Key: sk_AsWH12YRHFo9BG9DRYGtJFWDumr4lps2ne6vywfKpWc8Hm3p3wrhPa7IxkagWbvs'
```

**Respuesta (JSON):**

```json
{
  "date": "2025-11-16",
  "pledges": [...],
  "payouts": [...],
  "summary": {
    "totalPledges": 5,
    "totalPledgeAmount": "25000000.00",
    "totalPayouts": 10,
    "totalPayoutAmount": "500000.00"
  }
}
```

**Ejemplo cURL (CSV):**

```bash
curl -X GET \
  'http://localhost:8788/api/v1/reconciliation?date=2025-11-16&format=csv' \
  -H 'Authorization: Bearer por_1763215039421_v9p76zcxqxd' \
  -H 'X-Secret-Key: sk_AsWH12YRHFo9BG9DRYGtJFWDumr4lps2ne6vywfKpWc8Hm3p3wrhPa7IxkagWbvs' \
  --output reconciliation_2025-11-16.csv
```

---

## 🔔 MÓDULO 5: Webhooks HMAC

### Formato de Webhook

**Headers enviados al Anchor:**

```http
Content-Type: application/json
X-DAES-Timestamp: 2025-11-16T22:00:00Z
X-DAES-Signature: <base64_hmac_sha256>
X-DAES-Event: PLEDGE_CREATED|PLEDGE_ADJUSTED|PLEDGE_RELEASED|PAYOUT_COMPLETED
```

**Firma HMAC:**

```javascript
const timestamp = '2025-11-16T22:00:00Z';
const body = JSON.stringify(payload);
const signaturePayload = timestamp + body;
const signature = crypto
  .createHmac('sha256', DAES_WEBHOOK_SECRET)
  .update(signaturePayload)
  .digest('base64');
```

---

### Ejemplos de Payloads:

**PLEDGE_CREATED:**

```json
{
  "event": "PLEDGE_CREATED",
  "pledgeId": "PL-1731787200000",
  "porId": "por_1763215039421_v9p76zcxqxd",
  "amountUsd": "5000000.00",
  "available": "5000000.00",
  "asOf": "2025-11-16T22:00:00.000Z"
}
```

**PLEDGE_ADJUSTED:**

```json
{
  "event": "PLEDGE_ADJUSTED",
  "pledgeId": "PL-1731787200000",
  "deltaUsd": "-1000000.00",
  "available": "4000000.00",
  "reason": "support payouts",
  "asOf": "2025-11-16T22:05:00.000Z"
}
```

**PAYOUT_COMPLETED:**

```json
{
  "event": "PAYOUT_COMPLETED",
  "payoutId": "PO-1731787400000",
  "externalRef": "SEP24-TRX-001",
  "amountUsd": "500.00",
  "status": "COMPLETED",
  "completedAt": "2025-11-16T22:30:02.000Z"
}
```

---

## 🔐 Validación de Webhook en Anchor

**El Anchor debe validar así:**

```javascript
const receivedSignature = req.headers['x-daes-signature'];
const timestamp = req.headers['x-daes-timestamp'];
const body = req.body;

const expectedSignature = crypto
  .createHmac('sha256', DAES_WEBHOOK_SECRET)
  .update(timestamp + JSON.stringify(body))
  .digest('base64');

if (receivedSignature !== expectedSignature) {
  return res.status(403).json({ error: 'Invalid signature' });
}

// Verificar timestamp (no más de 5 minutos de diferencia)
const diff = Math.abs(Date.now() - new Date(timestamp).getTime());
if (diff > 5 * 60 * 1000) {
  return res.status(403).json({ error: 'Timestamp too old' });
}
```

---

## ⚙️ Idempotencia

**Header opcional pero recomendado:**

```http
Idempotency-Key: <uuid>
```

**Comportamiento:**
- Si se recibe la misma key dos veces, se devuelve la respuesta cacheada
- Cache dura 24 horas
- Evita duplicación de pledges/payouts

---

## 🔄 Flujo Completo: Anchor ↔ DAES

```
1. Anchor consulta PoR:
   GET /api/v1/proof-of-reserves/por_1763215039421_v9p76zcxqxd
   ← Recibe totalReserves, circulatingCap

2. Anchor consulta pledges:
   GET /api/v1/pledges?status=ACTIVE&porId=por_...
   ← Recibe lista de pledges
   ← Suma available = CIRC_CAP

3. Anchor publica on-chain (Stellar):
   ManageData(CIRC_CAP, <valor>)
   ManageData(PLEDGED_USD, <valor>)
   ManageData(POR_ASOF, <timestamp>)

4. Usuario solicita retiro VUSD → USD:
   Anchor → POST /api/v1/payouts
   {
     externalRef: "SEP24-TRX-001",
     amountUsd: "500",
     pledgeId: "PL-...",
     callbackUrl: "https://anchor.vergy.world/daes/webhooks/payouts"
   }

5. DAES procesa payout:
   - Valida pledge
   - Reduce available
   - Crea payout PENDING
   - Procesa (2s simulado)
   - Envía webhook HMAC al callbackUrl

6. Anchor recibe webhook:
   POST /daes/webhooks/payouts
   {
     event: "PAYOUT_COMPLETED",
     payoutId: "PO-...",
     externalRef: "SEP24-TRX-001",
     ...
   }
   - Valida firma HMAC
   - Actualiza estado en Anchor
   - Completa SEP-24 withdrawal
```

---

## 🛠️ Comandos

```bash
# Iniciar API1
node server/api1-server.js

# Health check
curl http://localhost:8788/health

# Test completo
npm run test:api1
```

---

## 📚 Endpoints Disponibles

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| GET | `/api/v1/proof-of-reserves/:porId` | PoR Summary |
| GET | `/api/v1/proof-of-reserves/:porId/data` | PoR Detalle |
| GET | `/api/v1/pledges` | Listar pledges |
| POST | `/api/v1/pledges` | Crear pledge |
| POST | `/api/v1/pledges/:id/adjust` | Ajustar pledge |
| POST | `/api/v1/pledges/:id/release` | Liberar pledge |
| POST | `/api/v1/payouts` | Crear payout |
| GET | `/api/v1/transactions/:ref` | Consultar payout |
| GET | `/api/v1/reserves/summary` | Resumen reservas |
| GET | `/api/v1/attestations/latest` | Última attestation |
| GET | `/api/v1/reconciliation` | Reporte diario |
| GET | `/health` | Health check |

---

## 🔐 Seguridad

- ✅ Autenticación Bearer + Secret Key obligatoria
- ✅ Webhooks firmados con HMAC-SHA256
- ✅ Idempotencia en POST críticos
- ✅ Validación de inputs
- ✅ No se loguean secretos completos
- ✅ TLS en producción

---

## 🎯 Integración con Anchor

**Variables de entorno en Anchor:**

```bash
DAES_API_BASE=https://luxliqdaes.cloud
DAES_POR_ID=por_1763215039421_v9p76zcxqxd
DAES_API_KEY=por_1763215039421_v9p76zcxqxd
DAES_SECRET_KEY=sk_AsWH12YRHFo9BG9DRYGtJFWDumr4lps2ne6vywfKpWc8Hm3p3wrhPa7IxkagWbvs
DAES_WEBHOOK_SECRET=whsec_daes_anchor_2025
```

**El Anchor ya está configurado para:**
1. Consumir PoR cada X minutos
2. Calcular CIRC_CAP desde pledges activos
3. Publicar on-chain en Stellar
4. En fase 2: procesar payouts vía SEP-24

---

## 🎉 ¡API Institucional Lista!

**Compatible 100% con:**
- ✅ Anchor VUSD (https://anchor.vergy.world)
- ✅ Protocolo SEP-24 (Stellar)
- ✅ Webhooks HMAC estándar
- ✅ Idempotencia para operaciones críticas

**¡Sistema de grado institucional!** 🚀

