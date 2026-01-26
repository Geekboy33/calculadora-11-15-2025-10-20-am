# 🏦 GUÍA COMPLETA: Sberbank E-Commerce API - Conexión en Producción

## 📋 ÍNDICE
1. [Requisitos Previos](#1-requisitos-previos)
2. [Obtener Credenciales](#2-obtener-credenciales)
3. [URLs y Entornos](#3-urls-y-entornos)
4. [Configuración del Sistema](#4-configuración-del-sistema)
5. [Autenticación](#5-autenticación)
6. [Endpoints Disponibles](#6-endpoints-disponibles)
7. [Flujo de Pagos](#7-flujo-de-pagos)
8. [Webhooks y Callbacks](#8-webhooks-y-callbacks)
9. [Seguridad](#9-seguridad)
10. [Checklist de Producción](#10-checklist-de-producción)

---

## 1. REQUISITOS PREVIOS

### Documentos Necesarios (Persona Jurídica):
- ✅ Registro de empresa en Rusia (ОГРН/ОГРНИП)
- ✅ Número de identificación fiscal (ИНН)
- ✅ Datos del representante legal
- ✅ Cuenta bancaria en Sberbank (preferible) o cualquier banco ruso
- ✅ Contrato de adquisición con Sberbank

### Requisitos Técnicos:
- ✅ Servidor con HTTPS (certificado SSL válido)
- ✅ IP fija para whitelist
- ✅ Dominio verificado
- ✅ Página de política de privacidad
- ✅ Página de términos y condiciones

---

## 2. OBTENER CREDENCIALES

### Paso 1: Registro en Sberbank Business Online
1. Accede a: https://sberbank.ru/ru/s_m_business/bankingservice/acquiring
2. Solicita el servicio de "Internet-acquiring" (интернет-эквайринг)
3. Completa el formulario de solicitud

### Paso 2: Contactar con Sberbank
- **Teléfono:** 8-800-555-55-50 (gratuito en Rusia)
- **Email:** sberbank@sberbank.ru
- **Portal de Desarrolladores:** https://developers.sber.ru

### Paso 3: Recibir Credenciales
Después de aprobar tu solicitud, recibirás:

```
┌─────────────────────────────────────────────────────────────────┐
│  CREDENCIALES DE PRODUCCIÓN                                     │
├─────────────────────────────────────────────────────────────────┤
│  Merchant Login:    tu_merchant_login                           │
│  Password:          tu_password_seguro                          │
│  Terminal ID:       XXXXXXXX                                    │
│  Merchant ID:       XXXXXXXXXXXXXXXX                            │
│  Secret Key:        XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX (HMAC)     │
└─────────────────────────────────────────────────────────────────┘
```

### Alternativa: Token de Acceso (OAuth 2.0)
```
┌─────────────────────────────────────────────────────────────────┐
│  TOKEN DE ACCESO                                                │
├─────────────────────────────────────────────────────────────────┤
│  Token:    eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...             │
│  Expires:  2025-12-31T23:59:59Z                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## 3. URLS Y ENTORNOS

### Entorno de PRUEBAS (TEST)
```
Base URL:     https://ecomtest.sberbank.ru
3DS Testing:  https://3dsec.sberbank.ru
API Path:     /ecomm/gw/partner/api/v1
P2P Path:     /ecomm/gw/partner/api/p2p/v1
```

### Entorno de PRODUCCIÓN
```
Base URL:     https://securepayments.sberbank.ru
Alternative:  https://ecommerce.sberbank.ru
API Path:     /ecomm/gw/partner/api/v1
P2P Path:     /ecomm/gw/partner/api/p2p/v1
```

### URLs Completas de Producción
```
Registro:           https://securepayments.sberbank.ru/ecomm/gw/partner/api/v1/register.do
Pre-autorización:   https://securepayments.sberbank.ru/ecomm/gw/partner/api/v1/registerPreAuth.do
Estado de orden:    https://securepayments.sberbank.ru/ecomm/gw/partner/api/v1/getOrderStatusExtended.do
Reembolso:          https://securepayments.sberbank.ru/ecomm/gw/partner/api/v1/refund.do
```

---

## 4. CONFIGURACIÓN DEL SISTEMA

### En tu aplicación (Sberbank 2 API Module):

```typescript
// Configuración para PRODUCCIÓN
const config = {
  baseUrl: 'https://securepayments.sberbank.ru',
  userName: 'TU_MERCHANT_LOGIN',      // Proporcionado por Sberbank
  password: 'TU_PASSWORD_SEGURO',     // Proporcionado por Sberbank
  environment: 'PRODUCTION',
  merchantLogin: 'TU_MERCHANT_LOGIN',
  useProxy: true,                      // Usar proxy del servidor
  proxyUrl: 'http://localhost:3000/api/sberbank'
};
```

### O usando Token:
```typescript
const config = {
  baseUrl: 'https://securepayments.sberbank.ru',
  token: 'TU_TOKEN_DE_ACCESO',        // Token OAuth 2.0
  environment: 'PRODUCTION',
  useProxy: true,
  proxyUrl: 'http://localhost:3000/api/sberbank'
};
```

---

## 5. AUTENTICACIÓN

### Método 1: Usuario y Contraseña (Recomendado para Server-to-Server)
```http
POST /ecomm/gw/partner/api/v1/register.do HTTP/1.1
Host: securepayments.sberbank.ru
Content-Type: application/x-www-form-urlencoded

userName=tu_merchant_login&password=tu_password&orderNumber=ORD-001&amount=100000&returnUrl=https://tudominio.com/success
```

### Método 2: Token Bearer (OAuth 2.0)
```http
POST /ecomm/gw/partner/api/v1/register.do HTTP/1.1
Host: securepayments.sberbank.ru
Content-Type: application/x-www-form-urlencoded
Authorization: Bearer tu_token_de_acceso

orderNumber=ORD-001&amount=100000&returnUrl=https://tudominio.com/success
```

---

## 6. ENDPOINTS DISPONIBLES

### 📝 REGISTRO DE ÓRDENES
| Endpoint | Descripción |
|----------|-------------|
| `/register.do` | Pago en una etapa (cargo inmediato) |
| `/registerPreAuth.do` | Pago en dos etapas (pre-autorización) |

### 💳 PROCESAMIENTO DE PAGOS
| Endpoint | Descripción |
|----------|-------------|
| `/deposit.do` | Confirmar pre-autorización |
| `/reverse.do` | Cancelar/anular antes de liquidación |
| `/refund.do` | Reembolso después de liquidación |
| `/decline.do` | Rechazar pago pendiente |
| `/autoRefund` | Reembolso automático |

### 📊 ESTADO DE ÓRDENES
| Endpoint | Descripción |
|----------|-------------|
| `/getOrderStatus.do` | Estado básico |
| `/getOrderStatusExtended.do` | Estado extendido con datos de tarjeta |
| `/getLastOrdersForMerchants.do` | Historial de órdenes |

### 💾 TARJETAS GUARDADAS (Bindings)
| Endpoint | Descripción |
|----------|-------------|
| `/getBindings.do` | Obtener tarjetas guardadas |
| `/bindCard.do` | Guardar tarjeta |
| `/unBindCard.do` | Eliminar tarjeta guardada |
| `/extendBinding.do` | Extender vigencia |
| `/paymentOrderBinding.do` | Pagar con tarjeta guardada |

### 🔄 PAGOS RECURRENTES
| Endpoint | Descripción |
|----------|-------------|
| `/recurrentPayment.do` | Procesar pago recurrente |

### 📱 PAGOS MÓVILES
| Endpoint | Descripción |
|----------|-------------|
| `/paymentSberPay.do` | SberPay (app Sberbank) |
| `/payment.do` | Apple Pay / Google Pay / Samsung Pay |
| `/paymentMirPay.do` | MIR Pay |

### 🔐 3D SECURE
| Endpoint | Descripción |
|----------|-------------|
| `/verifyEnrollment.do` | Verificar inscripción 3DS |
| `/finish3dsPayment.do` | Completar autenticación 3DS |

### 🧾 FISCALIZACIÓN (OFD)
| Endpoint | Descripción |
|----------|-------------|
| `/sendReceipt.do` | Enviar recibo fiscal |
| `/getReceiptStatus.do` | Estado del recibo |

### 🎁 PROGRAMA DE LEALTAD (SberSpasibo)
| Endpoint | Descripción |
|----------|-------------|
| `/getLoyaltyBalance.do` | Consultar saldo de bonos |
| `/payWithLoyalty.do` | Pagar con bonos |

### 💸 TRANSFERENCIAS P2P
| Endpoint | Descripción |
|----------|-------------|
| `/p2p/register` | Registrar transferencia P2P |
| `/p2p/perform` | Ejecutar transferencia P2P |

---

## 7. FLUJO DE PAGOS

### Flujo de Pago Simple (Una Etapa)

```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│   Cliente    │     │  Tu Sistema  │     │   Sberbank   │     │    Banco     │
│              │     │              │     │     API      │     │   Emisor     │
└──────┬───────┘     └──────┬───────┘     └──────┬───────┘     └──────┬───────┘
       │                    │                    │                    │
       │  1. Iniciar pago   │                    │                    │
       │───────────────────>│                    │                    │
       │                    │                    │                    │
       │                    │  2. register.do    │                    │
       │                    │───────────────────>│                    │
       │                    │                    │                    │
       │                    │  3. orderId +      │                    │
       │                    │     formUrl        │                    │
       │                    │<───────────────────│                    │
       │                    │                    │                    │
       │  4. Redirect a     │                    │                    │
       │     formUrl        │                    │                    │
       │<───────────────────│                    │                    │
       │                    │                    │                    │
       │  5. Ingresa datos  │                    │                    │
       │     de tarjeta     │                    │                    │
       │───────────────────────────────────────>│                    │
       │                    │                    │                    │
       │                    │                    │  6. Autorización   │
       │                    │                    │───────────────────>│
       │                    │                    │                    │
       │                    │                    │  7. Respuesta      │
       │                    │                    │<───────────────────│
       │                    │                    │                    │
       │  8. Redirect a     │                    │                    │
       │     returnUrl      │                    │                    │
       │<───────────────────────────────────────│                    │
       │                    │                    │                    │
       │                    │  9. getOrderStatus │                    │
       │                    │───────────────────>│                    │
       │                    │                    │                    │
       │                    │  10. Estado final  │                    │
       │                    │<───────────────────│                    │
       │                    │                    │                    │
       │  11. Confirmar     │                    │                    │
       │      pago exitoso  │                    │                    │
       │<───────────────────│                    │                    │
       │                    │                    │                    │
```

### Ejemplo de Código - Registro de Pago

```typescript
// 1. Registrar orden
const response = await client.registerOrder({
  orderNumber: 'ORD-2025-001',
  amount: 100000,              // 1000.00 RUB (en kopeks)
  currency: 643,               // RUB
  returnUrl: 'https://tudominio.com/payment/success',
  failUrl: 'https://tudominio.com/payment/failed',
  description: 'Compra en tienda online',
  clientId: 'CLIENT-12345',    // Para guardar tarjeta
  email: 'cliente@email.com',
  phone: '+79001234567',
});

if (response.orderId && response.formUrl) {
  // 2. Redirigir al cliente a formUrl
  window.location.href = response.formUrl;
}
```

### Ejemplo de Código - Verificar Estado

```typescript
// Después del redirect, verificar estado
const status = await client.getOrderStatusExtended({
  orderId: 'abc123-order-id'
});

if (status.orderStatus === 2) {
  console.log('✅ Pago exitoso');
  console.log('Tarjeta:', status.cardAuthInfo?.maskedPan);
  console.log('Monto:', status.amount / 100, 'RUB');
} else {
  console.log('❌ Pago fallido:', status.actionCodeDescription);
}
```

---

## 8. WEBHOOKS Y CALLBACKS

### Configurar Callback URL
En tu panel de merchant de Sberbank, configura:
- **Callback URL:** `https://tudominio.com/api/sberbank/callback`

### Estructura del Callback

```typescript
interface CallbackNotification {
  mdOrder: string;           // ID de orden Sberbank
  orderNumber: string;       // Tu número de orden
  operation: 'deposited' | 'reversed' | 'refunded' | 'approved' | 'declinedByTimeout';
  status: number;            // Estado de la orden
  amount?: number;           // Monto en kopeks
  currency?: number;         // Código de moneda
  cardholderName?: string;
  pan?: string;              // Número de tarjeta enmascarado
  expiration?: string;       // Vencimiento de tarjeta
  ip?: string;
  bindingId?: string;
  clientId?: string;
  checksum?: string;         // HMAC para verificación
}
```

### Implementar Handler de Callback

```typescript
// server/routes/sberbank-callback.js
app.post('/api/sberbank/callback', async (req, res) => {
  const notification = req.body;
  
  // 1. Verificar checksum (IMPORTANTE para seguridad)
  const isValid = SberbankEcomClient.verifyCallbackChecksum(
    notification,
    process.env.SBERBANK_SECRET_KEY
  );
  
  if (!isValid) {
    console.error('❌ Callback checksum inválido');
    return res.status(400).send('Invalid checksum');
  }
  
  // 2. Procesar según operación
  switch (notification.operation) {
    case 'deposited':
      await handlePaymentSuccess(notification);
      break;
    case 'reversed':
      await handlePaymentReversed(notification);
      break;
    case 'refunded':
      await handlePaymentRefunded(notification);
      break;
    case 'declinedByTimeout':
      await handlePaymentTimeout(notification);
      break;
  }
  
  // 3. Responder OK
  res.status(200).send('OK');
});
```

---

## 9. SEGURIDAD

### ⚠️ REQUISITOS OBLIGATORIOS

1. **HTTPS Obligatorio**
   - Todas las URLs (returnUrl, failUrl, callback) DEBEN ser HTTPS
   - Certificado SSL válido (no auto-firmado)

2. **IP Whitelist**
   - Registra las IPs de tu servidor en Sberbank
   - Solo IPs autorizadas pueden hacer llamadas a la API

3. **Verificación de Checksum**
   - SIEMPRE verifica el checksum en callbacks
   - Usa HMAC-SHA256 con tu Secret Key

4. **Almacenamiento de Credenciales**
   ```typescript
   // ❌ NUNCA hagas esto
   const password = 'mi_password_en_codigo';
   
   // ✅ Usa variables de entorno
   const password = process.env.SBERBANK_PASSWORD;
   ```

5. **Logs y Auditoría**
   - Registra todas las transacciones
   - NO guardes datos de tarjeta completos
   - Cumple con PCI-DSS

### Ejemplo de Variables de Entorno (.env)

```bash
# Sberbank E-Commerce API - PRODUCCIÓN
SBERBANK_ENVIRONMENT=PRODUCTION
SBERBANK_BASE_URL=https://securepayments.sberbank.ru
SBERBANK_USERNAME=tu_merchant_login
SBERBANK_PASSWORD=tu_password_seguro
SBERBANK_SECRET_KEY=tu_clave_secreta_para_hmac
SBERBANK_TERMINAL_ID=XXXXXXXX
SBERBANK_MERCHANT_ID=XXXXXXXXXXXXXXXX

# URLs de callback
SBERBANK_RETURN_URL=https://tudominio.com/payment/success
SBERBANK_FAIL_URL=https://tudominio.com/payment/failed
SBERBANK_CALLBACK_URL=https://tudominio.com/api/sberbank/callback
```

---

## 10. CHECKLIST DE PRODUCCIÓN

### ✅ Antes de Ir a Producción

#### Seguridad
- [ ] Credenciales de producción configuradas
- [ ] Variables de entorno (no hardcoded)
- [ ] HTTPS habilitado en todas las URLs
- [ ] Validación de checksum implementada
- [ ] IP whitelist configurada en Sberbank
- [ ] Logs de auditoría activos

#### Configuración
- [ ] Entorno PRODUCTION seleccionado
- [ ] Merchant login correcto
- [ ] Callback URL configurado en panel Sberbank
- [ ] returnUrl y failUrl apuntan a tu dominio de producción
- [ ] Fiscalización OFD configurada (si aplica en Rusia)

#### Testing
- [ ] Pruebas completas en entorno TEST
- [ ] Flujos de error validados
- [ ] Reembolsos probados
- [ ] 3D Secure verificado
- [ ] Pagos recurrentes probados (si aplica)
- [ ] SberPay probado (si aplica)

#### Documentación
- [ ] Política de privacidad publicada
- [ ] Términos y condiciones publicados
- [ ] Información de contacto visible

---

## 📞 SOPORTE DE SBERBANK

### Contactos Oficiales
- **Soporte Técnico:** tech@sberbank.ru
- **Teléfono:** 8-800-555-55-50 (Rusia, gratuito)
- **Portal de Desarrolladores:** https://developers.sber.ru
- **Documentación:** https://securepayments.sberbank.ru/wiki/doku.php/integration:api:start

### Horario de Soporte
- Lunes a Viernes: 9:00 - 18:00 (hora de Moscú)
- Soporte técnico 24/7 para incidentes críticos

---

## 🔗 RECURSOS ADICIONALES

- [Documentación Oficial API](https://securepayments.sberbank.ru/wiki/doku.php/integration:api:start)
- [Portal de Desarrolladores Sber](https://developers.sber.ru)
- [Sandbox de Pruebas](https://ecomtest.sberbank.ru)
- [Guía de Integración SberPay](https://developers.sber.ru/docs/ru/sberpay)

---

## 📝 CÓDIGOS DE ESTADO DE ORDEN

| Código | Descripción |
|--------|-------------|
| 0 | Orden registrada, no pagada |
| 1 | Monto pre-autorizado (dos etapas) |
| 2 | ✅ Autorización completada (éxito) |
| 3 | Autorización cancelada/revertida |
| 4 | Operación de reembolso realizada |
| 5 | Autorización iniciada vía ACS (3DS) |
| 6 | ❌ Autorización rechazada |

---

## 📝 CÓDIGOS DE ERROR COMUNES

| Código | Descripción | Solución |
|--------|-------------|----------|
| 0 | Éxito | - |
| 1 | Número de orden ya registrado | Usa un número de orden único |
| 5 | Credenciales inválidas | Verifica userName/password |
| 6 | Orden no encontrada | Verifica orderId |
| 7 | Error del sistema | Reintenta o contacta soporte |
| 201 | Fondos insuficientes | Informa al cliente |
| 202 | Tarjeta vencida | Solicita otra tarjeta |
| 203 | Tarjeta bloqueada | Contactar banco emisor |

---

**Última actualización:** Enero 2026
**Versión de API:** v1
**Compatible con:** Sberbank E-Commerce Payment Gateway
