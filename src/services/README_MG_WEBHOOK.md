# Servicio MG Webhook - Documentación Completa

## 📋 Descripción

Servicio completo para enviar transferencias desde el sistema DAES (Digital Asset Exchange & Settlement) de Digital Commercial Bank Ltd hacia MG Productive Investments mediante webhook HTTP.

## 🏗️ Arquitectura

```
DAES CoreBanking
    │
    ├─ Validar Saldo
    ├─ Debitar Ledger Interno
    ├─ Generar TransferRequestID
    │
    └─ MG Webhook Service
        │
        └─ HTTP POST → https://api.mgproductiveinvestments.com/webhook/dcb/transfer
            │
            └─ MG Productive Investments
```

## 📁 Archivos del Módulo

- **`mgWebhookService.ts`** - Servicio principal con todas las funcionalidades
- **`mgWebhookService.example.ts`** - Ejemplos de uso prácticos
- **`mgWebhookService.config.md`** - Configuración de variables de entorno
- **`README_MG_WEBHOOK.md`** - Esta documentación

## 🚀 Inicio Rápido

### 1. Instalación

No requiere instalación adicional. El servicio usa `axios` que ya está instalado en el proyecto.

### 2. Configuración

Agrega la variable de entorno en tu archivo `.env`:

```env
VITE_MG_WEBHOOK_URL=https://api.mgproductiveinvestments.com/webhook/dcb/transfer
```

### 3. Uso Básico

```typescript
import { sendTransferToMG } from './services/mgWebhookService';

// Enviar transferencia
const response = await sendTransferToMG({
  transferRequestId: "TX-2025-00001",
  amount: "1000.00",
  receivingCurrency: "USD",
  receivingAccount: "MG-001",
  sendingName: "Digital Commercial Bank Ltd"
});
```

## 📖 API Reference

### `sendTransferToMG(params: MgTransferParams): Promise<MgWebhookResponse>`

Envía una transferencia a MG Productive Investments.

#### Parámetros

```typescript
interface MgTransferParams {
  transferRequestId: string;     // ID único de la transacción
  amount: string;                 // Monto (ej: "1000.00")
  receivingCurrency: string;       // Moneda (ej: "USD")
  receivingAccount: string;        // Cuenta receptora (ej: "MG-001")
  sendingName: string;             // Nombre del remitente
  dateTime?: string;               // Opcional, formato ISO 8601 UTC
}
```

#### Retorna

```typescript
Promise<MgWebhookResponse>
```

#### Lanza

- `Error` si los parámetros son inválidos
- `Error` si la petición HTTP falla

## 🔄 Flujo de Integración Recomendado

### Antes de Llamar al Servicio

1. **Validar Saldo**
   ```typescript
   const balance = await ledgerService.getBalance(accountId);
   if (balance < parseFloat(amount)) {
     throw new Error('Saldo insuficiente');
   }
   ```

2. **Debitar Ledger Interno**
   ```typescript
   const debitResult = await ledgerService.debit({
     accountId: accountId,
     amount: amount,
     currency: currency,
     reference: `MG-Transfer-${settlementId}`
   });
   ```

3. **Guardar TransferRequestID**
   ```typescript
   const transferRequestId = `MG-${settlementId}-${Date.now()}`;
   await settlementService.saveTransferRequestId(settlementId, transferRequestId);
   ```

### Después de Respuesta Exitosa (200 OK)

1. **Marcar Transacción como Enviada**
   ```typescript
   await settlementService.updateStatus(settlementId, 'SENT', {
     mgTransactionId: response.transactionId,
     sentAt: new Date().toISOString()
   });
   ```

2. **Actualizar Estado en Ledger**
   ```typescript
   await ledgerService.updateTransactionStatus(debitResult.id, 'SENT');
   ```

3. **Registrar en Audit Log**
   ```typescript
   await auditLogService.log({
     action: 'MG_TRANSFER_SENT',
     settlementId: settlementId,
     transferRequestId: transferRequestId,
     amount: amount,
     currency: currency
   });
   ```

### Manejo de Errores

Si la transferencia falla, debes:

1. **Revertir Débito del Ledger**
   ```typescript
   await ledgerService.credit({
     accountId: accountId,
     amount: amount,
     currency: currency,
     reference: `MG-Transfer-Rollback-${settlementId}`
   });
   ```

2. **Marcar como Fallida**
   ```typescript
   await settlementService.updateStatus(settlementId, 'FAILED', {
     error: error.message
   });
   ```

## 📝 Formato del Payload

El servicio construye automáticamente el payload en el formato exacto que MG espera:

```json
{
  "CashTransfer.v1": {
    "TransferRequestID": "TX-2025-00001",
    "Amount": "1000.00",
    "ReceivingCurrency": "USD",
    "ReceivingAccount": "MG-001",
    "SendingName": "Digital Commercial Bank Ltd",
    "DateTime": "2025-11-28T15:14:02.000Z"
  }
}
```

**IMPORTANTE**: El formato usa `CashTransfer.v1` (versión 1 del protocolo de MG)

## ⚙️ Configuración Avanzada

### Timeout

El timeout por defecto es de 15 segundos. Para cambiarlo, modifica la constante `REQUEST_TIMEOUT_MS` en el archivo del servicio.

### Logging

El servicio incluye logging detallado:
- Log antes de enviar (payload completo)
- Log de respuesta exitosa (status y data)
- Log de errores (detalles completos)

Los logs usan el prefijo `[MG Webhook]` para fácil identificación.

## 🔒 Seguridad

- ✅ Validación estricta de parámetros
- ✅ Timeout configurable para evitar cuelgues
- ✅ Manejo robusto de errores
- ✅ Logging seguro (sin exponer datos sensibles en logs)

## 🧪 Testing

Ver archivo `mgWebhookService.example.ts` para ejemplos de uso y testing.

### Ejemplo de Test Básico

```typescript
import { sendTransferToMG } from './mgWebhookService';
import axios from 'axios';

jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('MG Webhook Service', () => {
  it('debe construir el payload correctamente', async () => {
    mockedAxios.post.mockResolvedValue({
      status: 200,
      data: { success: true }
    });

    await sendTransferToMG({
      transferRequestId: "TX-001",
      amount: "100.00",
      receivingCurrency: "USD",
      receivingAccount: "MG-001",
      sendingName: "DCB"
    });

    expect(mockedAxios.post).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        CashTransfer: expect.objectContaining({
          TransferRequestID: "TX-001",
          Amount: "100.00"
        })
      }),
      expect.objectContaining({
        headers: { 'Content-Type': 'application/json' },
        timeout: 15000
      })
    );
  });
});
```

## 🔗 Integración con BankSettlementModule

Este servicio está diseñado para integrarse con el módulo de liquidación bancaria existente (`BankSettlementModule.tsx`).

### Puntos de Integración Sugeridos

1. **En la función de ejecución de liquidación:**
   ```typescript
   // Después de debitar el ledger
   const mgResponse = await sendTransferToMG({
     transferRequestId: settlement.daesReferenceId,
     amount: settlement.amount,
     receivingCurrency: settlement.currency,
     receivingAccount: settlement.beneficiaryIban,
     sendingName: "Digital Commercial Bank Ltd"
   });
   ```

2. **En el manejo de webhooks de respuesta:**
   ```typescript
   // Si MG envía confirmación vía webhook
   if (mgResponse.success) {
     await updateSettlementStatus(settlementId, 'COMPLETED');
   }
   ```

## 📊 Monitoreo

Recomendaciones para monitoreo en producción:

1. **Métricas a rastrear:**
   - Tasa de éxito de transferencias
   - Tiempo de respuesta promedio
   - Errores por tipo (timeout, red, servidor)

2. **Alertas:**
   - Tasa de error > 5%
   - Timeout frecuentes
   - Errores 500 del servidor MG

## 🐛 Troubleshooting

### Error: "MG webhook call failed: No response from server"

**Causa:** El servidor de MG no responde o hay problemas de red.

**Solución:**
- Verificar conectividad de red
- Verificar que la URL del webhook sea correcta
- Aumentar el timeout si es necesario

### Error: "Parámetros inválidos"

**Causa:** Faltan parámetros requeridos o están vacíos.

**Solución:**
- Verificar que todos los parámetros requeridos estén presentes
- Verificar que los valores no estén vacíos o sean null

### Error: "HTTP 400" o "HTTP 500"

**Causa:** El servidor de MG rechazó la petición.

**Solución:**
- Verificar el formato del payload
- Contactar con el equipo de MG para verificar la especificación
- Revisar los logs del servidor MG

## 📞 Soporte

Para problemas o preguntas sobre este servicio:
1. Revisar esta documentación
2. Revisar los ejemplos en `mgWebhookService.example.ts`
3. Verificar los logs con prefijo `[MG Webhook]`

## 📄 Licencia

Este módulo es parte del sistema DAES de Digital Commercial Bank Ltd.

---

**Versión:** 1.0.0  
**Última actualización:** 2025-11-28  
**Autor:** DAES Development Team

