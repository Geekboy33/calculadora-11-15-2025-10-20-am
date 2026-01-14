# 🔀 YEX API Module - Documentación Completa

## 📋 Índice

1. [Descripción](#descripción)
2. [Instalación](#instalación)
3. [Configuración](#configuración)
4. [Autenticación](#autenticación)
5. [Endpoints](#endpoints)
6. [Ejemplos](#ejemplos)
7. [Rate Limiting](#rate-limiting)
8. [Errores](#errores)

---

## 📝 Descripción

**YEX API Module** es una integración completa con la API de YEX.io para:

- ✅ Obtener datos de mercado en tiempo real
- ✅ Crear y cancelar órdenes
- ✅ Consultar balance de cuenta
- ✅ Ver historial de transacciones
- ✅ Gestión de órdenes de margen
- ✅ Historial de retiros

**Documentación oficial:** https://docs.yex.io/

---

## 🚀 Instalación

### 1. Instalar dependencias

```bash
npm install axios dotenv
```

### 2. Importar módulo

**Backend:**
```javascript
const yexAPI = require('./server/yex-api');
```

**Frontend:**
```typescript
import YexApiModule from '@/components/YexApiModule';
```

### 3. Integrar rutas

```javascript
// En tu archivo principal del servidor
const yexRoutes = require('./server/routes/yex-api-routes');
app.use('/api/yex', yexRoutes);
```

---

## ⚙️ Configuración

### Variables de entorno (.env)

```env
# YEX API Credentials
VITE_YEX_API_KEY=tu_api_key_aqui
VITE_YEX_SECRET_KEY=tu_secret_key_aqui
VITE_YEX_API_BASE=https://openapi.yex.io
```

### Obtener credenciales YEX

1. Ir a https://www.yex.io/
2. Registrarse o iniciar sesión
3. Ir a API Management
4. Crear nueva API Key
5. Copiar API Key y Secret Key
6. Guardar en `.env`

---

## 🔐 Autenticación

### Generación de firma HMAC SHA256

```javascript
// Fórmula: timestamp + method + requestPath + body
const signature = HMAC_SHA256(
  '1588591856950' +          // timestamp
  'POST' +                   // método HTTP
  '/sapi/v1/order' +        // ruta
  '{"symbol":"BTCUSDT"...}' // body (solo en POST)
);
```

### Headers requeridos

```javascript
{
  'X-CH-APIKEY': 'tu_api_key',
  'X-CH-SIGN': 'firma_generada',
  'X-CH-TS': '1588591856950',  // timestamp actual
  'Content-Type': 'application/json'
}
```

---

## 📡 Endpoints

### Mercado

#### Obtener Precio

```
POST /api/yex/price
```

**Request:**
```json
{
  "symbol": "BTCUSDT"
}
```

**Response:**
```json
{
  "symbol": "BTCUSDT",
  "price": "43500.50"
}
```

---

#### Obtener Ticker (24h)

```
POST /api/yex/ticker
```

**Request:**
```json
{
  "symbol": "BTCUSDT"
}
```

**Response:**
```json
{
  "symbol": "BTCUSDT",
  "lastPrice": "43500.50",
  "highPrice": "44000.00",
  "lowPrice": "42500.00",
  "priceChangePercent": "2.45",
  "volume": "1234567.89"
}
```

---

### Trading

#### Crear Orden

```
POST /api/yex/order
```

**Request:**
```json
{
  "symbol": "BTCUSDT",
  "side": "BUY",
  "type": "LIMIT",
  "quantity": 1,
  "price": 43500
}
```

**Response:**
```json
{
  "orderId": "12345678",
  "symbol": "BTCUSDT",
  "side": "BUY",
  "type": "LIMIT",
  "quantity": 1,
  "price": 43500,
  "status": "NEW"
}
```

---

#### Obtener Órdenes Abiertas

```
POST /api/yex/orders
```

**Request:**
```json
{
  "symbol": "BTCUSDT"
}
```

**Response:**
```json
[
  {
    "orderId": "12345678",
    "symbol": "BTCUSDT",
    "side": "BUY",
    "type": "LIMIT",
    "quantity": 1,
    "price": 43500,
    "status": "NEW"
  }
]
```

---

#### Cancelar Orden

```
POST /api/yex/order/cancel
```

**Request:**
```json
{
  "symbol": "BTCUSDT",
  "orderId": "12345678"
}
```

**Response:**
```json
{
  "orderId": "12345678",
  "status": "CANCELLED"
}
```

---

### Cuenta

#### Obtener Balance

```
POST /api/yex/balance
```

**Request:**
```json
{}
```

**Response:**
```json
{
  "totalWalletBalance": "10000.50",
  "balances": [
    {
      "asset": "BTC",
      "free": "0.5",
      "locked": "0.1"
    },
    {
      "asset": "USDT",
      "free": "5000.00",
      "locked": "2000.00"
    }
  ]
}
```

---

#### Obtener Información de Usuario

```
POST /api/yex/user
```

**Response:**
```json
{
  "uid": "123456789",
  "email": "usuario@ejemplo.com",
  "status": "ACTIVE",
  "makerCommission": "0.1",
  "takerCommission": "0.1"
}
```

---

## 💻 Ejemplos

### Ejemplo 1: Obtener precio en tiempo real

```javascript
const yexAPI = require('./server/yex-api');

async function obtenerPrecio() {
  try {
    const price = await yexAPI.getPrice('BTCUSDT');
    console.log(`Precio BTC: $${price.price}`);
  } catch (error) {
    console.error('Error:', error.message);
  }
}
```

---

### Ejemplo 2: Crear orden de compra

```javascript
const yexAPI = require('./server/yex-api');

async function crearOrdenCompra() {
  try {
    const order = await yexAPI.createOrder({
      symbol: 'BTCUSDT',
      side: 'BUY',
      type: 'LIMIT',
      quantity: 0.5,
      price: 43000
    });
    
    console.log('Orden creada:', order.orderId);
  } catch (error) {
    console.error('Error:', error.message);
  }
}
```

---

### Ejemplo 3: Obtener balance

```javascript
const yexAPI = require('./server/yex-api');

async function obtenerBalance() {
  try {
    const balance = await yexAPI.getAccountBalance();
    console.log('Balance total:', balance.totalWalletBalance);
    
    balance.balances.forEach(asset => {
      console.log(`${asset.asset}: ${asset.free}`);
    });
  } catch (error) {
    console.error('Error:', error.message);
  }
}
```

---

## 🚦 Rate Limiting

**Límites de YEX:**

| Métrica | Límite |
|---------|--------|
| Por IP | 12,000 / minuto |
| Por UID | 60,000 / minuto |
| Peso promedio endpoint | 1-100 |

**Manejo de errores:**

```javascript
// HTTP 429 = Rate limit alcanzado
if (response.status === 429) {
  console.log('Rate limit excedido. Espera 1 minuto...');
}

// HTTP 418 = IP bloqueada
if (response.status === 418) {
  console.log('IP bloqueada temporalmente');
}
```

---

## ❌ Errores Comunes

| Código | Significado | Solución |
|--------|------------|----------|
| -1121 | Símbolo inválido | Verificar símbolo (ej: BTCUSDT) |
| -2015 | Credenciales inválidas | Revisar API Key y Secret |
| 429 | Rate limit | Esperar antes de reintentar |
| 418 | IP bloqueada | Esperar 2-3 días |
| -1001 | Desconexión | Reintentar conexión |

---

## 📱 Integración Frontend

### Usar en React

```typescript
import YexApiModule from '@/components/YexApiModule';

export default function Dashboard() {
  return (
    <div>
      <YexApiModule />
    </div>
  );
}
```

### Enviar request al backend

```typescript
const handleGetPrice = async (symbol: string) => {
  try {
    const response = await fetch('/api/yex/price', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ symbol })
    });
    
    const data = await response.json();
    console.log(`Precio de ${symbol}: $${data.price}`);
  } catch (error) {
    console.error('Error:', error);
  }
};
```

---

## 🔗 Enlaces Útiles

- **Documentación YEX:** https://docs.yex.io/
- **OpenAPI Base:** https://openapi.yex.io
- **API Key Management:** https://www.yex.io/api-management
- **Status:** https://yex.statuspage.io/

---

## ✅ Checklist de Setup

- [ ] Instalar dependencias (`npm install`)
- [ ] Crear cuenta en YEX.io
- [ ] Generar API Key y Secret Key
- [ ] Agregar variables a `.env`
- [ ] Validar autenticación
- [ ] Probar endpoints en Postman
- [ ] Integrar en frontend
- [ ] Probar en producción

---

**¡Módulo YEX API completamente funcional! 🚀**










