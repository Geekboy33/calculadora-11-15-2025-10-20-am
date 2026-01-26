# 🏦 DCB Treasury ↔ LEMX Minting - Arquitectura de Webhook Seguro

## ✅ Estado: CONECTADO Y FUNCIONANDO

---

## 📊 Resumen de la Arquitectura

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        DCB TREASURY (EMISOR)                                 │
│                     Puerto: 4010 (dev) | luxliqdaes.cloud (prod)            │
│                                                                              │
│  • Crea Locks con fondos de custodia                                        │
│  • Envía órdenes de minting a LEMX                                          │
│  • Recibe códigos de autorización de LEMX                                   │
│  • Recibe confirmaciones de minting completado                              │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    │ WEBHOOK SEGURO
                                    │ HMAC-SHA256
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                       LEMX MINTING (RECEPTOR/EJECUTOR)                       │
│                     Puerto: 4011 (dev) | luxliqdaes.cloud/lemx (prod)       │
│                                                                              │
│  • Recibe Locks de DCB Treasury                                             │
│  • Genera códigos de autorización (MINT-XXXX-XXXX)                          │
│  • Ejecuta el minting de LUSD en LemonChain                                 │
│  • Envía confirmaciones a DCB Treasury                                      │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 🔐 Configuración de Seguridad del Webhook

### Secreto Compartido (HMAC-SHA256)
```javascript
const WEBHOOK_CONFIG = {
  webhookId: 'DCB-LEMX-WEBHOOK-001',
  sharedSecret: 'dcb-lemx-secure-webhook-secret-2024-v1',
  protocolVersion: '1.0.0',
  signatureExpiryMs: 5 * 60 * 1000  // 5 minutos
};
```

### URLs Fijas
| Entorno | DCB Treasury | LEMX Minting |
|---------|--------------|--------------|
| **Desarrollo** | `http://localhost:4010/api/webhooks/receive` | `http://localhost:4011/api/webhooks/receive` |
| **Producción** | `https://luxliqdaes.cloud/api/webhooks/receive` | `https://luxliqdaes.cloud/api/lemx/webhooks/receive` |

---

## 📡 Tipos de Eventos de Webhook

### DCB Treasury → LEMX Minting
| Evento | Descripción |
|--------|-------------|
| `lock.created` | Nuevo lock creado - LEMX debe procesarlo |
| `lock.cancelled` | Lock cancelado por DCB |
| `mint.request.created` | DCB solicita minting con código autorizado |

### LEMX Minting → DCB Treasury
| Evento | Descripción |
|--------|-------------|
| `authorization.generated` | LEMX generó código de autorización |
| `mint.started` | LEMX comenzó el proceso de minting |
| `mint.completed` | LEMX completó el minting - incluye txHash |
| `mint.failed` | LEMX falló en el minting |

---

## 🔄 Flujo de Comunicación

### 1. Creación de Lock (DCB → LEMX)
```
DCB Treasury                                    LEMX Minting
     │                                               │
     │  POST /api/locks                              │
     │  (Crea lock con fondos de custodia)          │
     │                                               │
     │  ─────────── lock.created ──────────────────► │
     │              (Webhook firmado)                │
     │                                               │
     │                                    Registra lock
     │                                    status: pending_authorization
```

### 2. Generación de Autorización (LEMX → DCB)
```
LEMX Minting                                    DCB Treasury
     │                                               │
     │  POST /api/locks/:id/consume                  │
     │  (Operador LEMX autoriza)                     │
     │                                               │
     │  ◄────── authorization.generated ───────────  │
     │              (Webhook firmado)                │
     │                                               │
     │                                    Actualiza lock
     │                                    status: authorized
     │                                    authorizationCode: MINT-XXXX
```

### 3. Confirmación de Minting (LEMX → DCB)
```
LEMX Minting                                    DCB Treasury
     │                                               │
     │  POST /api/mint-requests/:id/complete         │
     │  (Minting ejecutado en LemonChain)           │
     │                                               │
     │  ◄────────── mint.completed ─────────────────  │
     │              (Webhook firmado)                │
     │                                               │
     │                                    Actualiza lock
     │                                    status: minted
     │                                    txHash: 0x...
```

---

## 🧪 Prueba del Flujo Completo

### Paso 1: Crear Lock en DCB Treasury
```bash
curl -X POST http://localhost:4010/api/locks \
  -H "Content-Type: application/json" \
  -d '{
    "lockId": "LOCK-TEST-001",
    "lockDetails": {
      "amount": "50000",
      "currency": "USD",
      "beneficiary": "0x1234..."
    },
    "bankInfo": {
      "bankId": "DCB-001",
      "bankName": "Digital Commercial Bank Ltd."
    }
  }'
```

### Paso 2: Verificar que llegó a LEMX
```bash
curl http://localhost:4011/api/locks
```

### Paso 3: Generar Código de Autorización en LEMX
```bash
curl -X POST http://localhost:4011/api/locks/LOCK-TEST-001/consume \
  -H "Content-Type: application/json" \
  -d '{"authorizedBy": "LEMX_OPERATOR"}'
```

### Paso 4: Verificar que DCB recibió la autorización
```bash
curl http://localhost:4010/api/locks/LOCK-TEST-001
```

---

## 📁 Archivos de Configuración

### DCB Treasury
- `server/api-server.js` - Servidor API con webhook dispatcher
- `src/lib/webhook-config.ts` - Configuración de webhook (frontend)
- `src/lib/lemx-bridge.ts` - Bridge de comunicación con LEMX

### LEMX Minting
- `server/api-server.js` - Servidor API con webhook receiver
- `src/lib/webhook-config.ts` - Configuración de webhook (frontend)
- `src/lib/api-bridge.ts` - Bridge de comunicación con DCB

---

## 🔒 Verificación de Firma

Cada webhook incluye:
- `X-DCB-Signature` o `X-LEMX-Signature` - Firma HMAC-SHA256
- `X-DCB-Event` o `X-LEMX-Event` - Tipo de evento
- `X-DCB-Timestamp` o `X-LEMX-Timestamp` - Timestamp del evento
- `X-Webhook-ID` - ID único del evento
- `X-Webhook-Version` - Versión del protocolo

La firma se verifica en producción para garantizar la autenticidad del mensaje.

---

## 📈 Estado Actual de los Servidores

| Servidor | Puerto | Estado | Locks | Mints |
|----------|--------|--------|-------|-------|
| DCB Treasury API | 4010 | ✅ Online | 6 | 0 |
| LEMX Minting API | 4011 | ✅ Online | 6 | 1 |

---

## 🚀 Próximos Pasos

1. ✅ Configuración de webhook seguro completada
2. ✅ Flujo DCB → LEMX verificado
3. ✅ Flujo LEMX → DCB verificado
4. 🔄 Implementar verificación de firma en producción
5. 🔄 Agregar logs de auditoría detallados
6. 🔄 Implementar reintentos automáticos de webhook

---

*Última actualización: 2026-01-17*
*Versión del protocolo: 1.0.0*
