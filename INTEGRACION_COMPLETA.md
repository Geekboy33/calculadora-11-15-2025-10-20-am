# 🔗 INTEGRACIÓN COMPLETA: JSON Transacciones + Convertidor USD → USDT

## ✅ CÓMO FUNCIONAN JUNTOS

### **1. FLUJO DE DATOS**

```
┌─────────────────────────────────────────────────────────────┐
│                    USUARIO INICIA                           │
└────────────┬────────────────────────────────────────────────┘
             │
     ┌───────▼────────────┐
     │ Convertidor USD →  │
     │      USDT          │
     └───────┬────────────┘
             │
     ┌───────▼────────────────────────────────────┐
     │ 1. Carga fondos.json desde servidor       │
     │ 2. Selecciona cuenta bancaria             │
     │ 3. Ingresa monto en USD                   │
     │ 4. Valida configuración                   │
     └───────┬────────────────────────────────────┘
             │
     ┌───────▼────────────────────────────────────┐
     │ OPCIÓN A: Una transacción (Normal)        │
     │ OPCIÓN B: Lotes JSON (Masivo)             │
     └───────┬────────────────────────────────────┘
             │
    ┌────────┴────────┐
    │                 │
    │                 │
┌───▼───┐      ┌─────▼──────────┐
│  USD  │      │ JSON Trans.    │
│→USDT  │      │  Conversiones  │
│(1)    │      │  Masivas       │
└───┬───┘      └────┬───────────┘
    │               │
    │        ┌──────▼─────────────┐
    │        │ Lee todas las      │
    │        │ cuentas del JSON   │
    │        │ (batch processing) │
    │        └──────┬─────────────┘
    │               │
    └───────┬───────┘
            │
    ┌───────▼────────────────────────────┐
    │ BACKEND: json-usdt-converter.js    │
    │ - Oracle CoinGecko (tasa real)     │
    │ - Conversión USD → USDT             │
    │ - Firma transacción (Web3)         │
    │ - Envío a blockchain               │
    └───────┬────────────────────────────┘
            │
    ┌───────▼────────────────────────────┐
    │ RESULTADO:                         │
    │ - TX Hash en Ethereum              │
    │ - Actualiza balances               │
    │ - Guarda historial                 │
    └────────────────────────────────────┘
```

---

## 📁 ESTRUCTURA DE ARCHIVOS COMPARTIDOS

### **ARCHIVOS QUE COMPARTEN DATOS**

```
server/
├── index.js                          # Backend Express
│   ├── GET  /api/ethusd/fondos      ← USD → USDT lo usa
│   ├── POST /api/ethusd/send-usdt   ← USD → USDT lo usa
│   ├── GET  /api/json/oracle        ← JSON Transacciones lo usa
│   ├── GET  /api/json/fondos        ← JSON Transacciones lo usa
│   ├── POST /api/json/convertir     ← JSON Transacciones lo usa
│   └── POST /api/json/procesar-lotes← JSON Transacciones lo usa
│
├── json-usdt-converter.js           # Módulo compartido
│   ├── getPriceOracle()             ← AMBOS LO USAN
│   ├── readFondosJSON()             ← AMBOS LO USAN
│   ├── convertUSDToUSDT()           ← AMBOS LO USAN
│   └── processTransaction()         ← AMBOS LO USAN
│
└── data/
    └── fondos.json                  # Base de datos compartida
        ├── Cuentas bancarias USD
        └── Historial de conversiones

src/
├── components/
│   ├── USDTConverterModule.tsx      # UI: Una conversión
│   ├── JSONTransactionsModule.tsx   # UI: Lotes (Masivo)
│   └── Comparten: custodyStore
│
└── lib/
    ├── web3-transaction.ts          # Lógica Web3 compartida
    └── custody-store.ts             # Datos de cuentas
```

---

## 🔄 FLUJO INTEGRADO PASO A PASO

### **ESCENARIO 1: Convertidor USD → USDT (Una transacción)**

```
USUARIO en USDTConverterModule:
│
├─ 1. Abre "Convertidor USD → USDT"
│
├─ 2. Selecciona cuenta de fondos.json
│     └─ GET /api/ethusd/fondos (carga cuentas)
│
├─ 3. Ingresa cantidad: 50 USD
│
├─ 4. Click "CONVERTIR"
│     ├─ Valida dirección Ethereum
│     ├─ Llama backend: /api/ethusd/send-usdt
│     ├─ Backend usa: json-usdt-converter.js
│     │   ├─ Obtiene tasa de Oracle (CoinGecko)
│     │   ├─ Calcula: 50 USD / 0.9989 = 50.055 USDT
│     │   ├─ Firma transacción Web3
│     │   └─ Envía a blockchain
│     └─ Retorna TX Hash
│
├─ 5. Muestra resultado
│     └─ "✅ Transacción exitosa: 0x..."
│
└─ 6. Guarda en historial

JSON en fondos.json se actualiza:
{
  "id": 1,
  "nombre": "Cuenta Principal",
  "monto_usd": 4950,  // ← Decrementado
  "last_conversion": {
    "usd_amount": 50,
    "usdt_amount": 50.055,
    "tx_hash": "0x...",
    "timestamp": "2025-01-02T..."
  }
}
```

### **ESCENARIO 2: JSON Transacciones (Lotes masivos)**

```
USUARIO en JSONTransactionsModule:
│
├─ 1. Tab "📊 Oracle de Precios"
│     └─ GET /api/json/oracle
│        └─ Muestra tasa USDT/USD en vivo
│
├─ 2. Tab "💰 Fondos JSON"
│     └─ GET /api/json/fondos
│        └─ Carga TODAS las cuentas del JSON
│
├─ 3. Tab "⚡ Procesar Lotes"
│     ├─ Click en "Iniciar Procesamiento"
│     └─ POST /api/json/procesar-lotes
│        ├─ Para CADA cuenta en fondos.json:
│        │   ├─ Obtiene tasa Oracle
│        │   ├─ Convierte USD → USDT
│        │   ├─ Valida dirección
│        │   ├─ Estima gas
│        │   ├─ Firma transacción
│        │   ├─ Envía a blockchain
│        │   └─ Espera 2 segundos (siguiente)
│        └─ Retorna array de resultados
│
├─ 4. Tab "✅ Resultados"
│     ├─ Muestra: Total procesadas
│     ├─ Muestra: Exitosas vs Fallidas
│     └─ Tabla con TX Hash de cada una
│
└─ 5. fondos.json actualizado para TODAS las cuentas

Ejemplo de actualización:
{
  "cuentas_bancarias": [
    {
      "id": 1,
      "nombre": "Ethereum Custody - USDT 5K",
      "monto_usd": 4950,     // ← Decrementado
      "last_conversion": {
        "usd_amount": 50,
        "usdt_amount": 50.055,
        "tx_hash": "0x...",
        "timestamp": "2025-01-02T..."
      }
    },
    {
      "id": 2,
      "nombre": "Ethereum Custody - USDT 10K",
      "monto_usd": 9900,     // ← Decrementado
      "last_conversion": {...}
    }
  ]
}
```

---

## 🔗 ENDPOINTS COMPARTIDOS

### **Endpoints que comparten datos:**

| Endpoint | Módulo | Uso |
|----------|--------|-----|
| `GET /api/ethusd/fondos` | USD → USDT | Cargar cuentas disponibles |
| `POST /api/ethusd/send-usdt` | USD → USDT | Enviar una transacción |
| `GET /api/json/oracle` | JSON Trans. | Consultar precio |
| `GET /api/json/fondos` | JSON Trans. | Cargar todas las cuentas |
| `POST /api/json/convertir` | JSON Trans. | Convertir monto USD |
| `POST /api/json/procesar-lotes` | JSON Trans. | Procesar todo |

### **Funciones compartidas en `json-usdt-converter.js`:**

```javascript
✅ getPriceOracle()        // Obtiene tasa de CoinGecko
   ├─ Usado por: USD → USDT
   └─ Usado por: JSON Transacciones

✅ readFondosJSON()        // Lee fondos.json
   ├─ Usado por: USD → USDT
   └─ Usado por: JSON Transacciones

✅ convertUSDToUSDT()      // Convierte USD a USDT
   ├─ Usado por: USD → USDT
   └─ Usado por: JSON Transacciones

✅ processTransaction()    // Firma y envía a blockchain
   ├─ Usado por: USD → USDT
   └─ Usado por: JSON Transacciones
```

---

## 🎯 DIFERENCIAS CLAVE

| Característica | USD → USDT | JSON Transacciones |
|---|---|---|
| **UI** | 4 Pasos (Wizard) | 4 Tabs (Paneles) |
| **Operación** | Una transacción | Múltiples (lotes) |
| **Velocidad** | Rápida (1 tx) | Más lenta (batch) |
| **Casos de uso** | Transferencia simple | Conversión masiva |
| **Origen datos** | Selección manual | Lectura JSON |
| **Control** | Máximo (manual) | Automático (batch) |

---

## 📊 EJEMPLO REAL DE INTEGRACIÓN

### **Caso: Convertir 150 USD total**

**OPCIÓN A: Convertidor USD → USDT (3 operaciones separadas)**

```
Operación 1:
├─ Fecha: 14:00
├─ Monto: 50 USD
├─ TX: 0x1234...
└─ Estado: ✅ Exitosa

Operación 2:
├─ Fecha: 14:05
├─ Monto: 50 USD
├─ TX: 0x5678...
└─ Estado: ✅ Exitosa

Operación 3:
├─ Fecha: 14:10
├─ Monto: 50 USD
├─ TX: 0x9abc...
└─ Estado: ✅ Exitosa

Total: 3 transacciones en 10 minutos
```

**OPCIÓN B: JSON Transacciones (1 operación masiva)**

```
fondos.json tiene 3 cuentas de 50 USD cada una:

Batch Processing:
├─ Inicia: 14:00
├─ Procesa:
│  ├─ Cuenta 1: 50 USD → TX 0x1234... ✅ (segundos 1-3)
│  ├─ Cuenta 2: 50 USD → TX 0x5678... ✅ (segundos 3-5)
│  └─ Cuenta 3: 50 USD → TX 0x9abc... ✅ (segundos 5-7)
├─ Termina: 14:00
└─ Total: 3 transacciones en ~7 segundos

Resumen:
├─ Total procesadas: 3
├─ Exitosas: 3
├─ Fallidas: 0
└─ Tiempo total: 7 segundos
```

---

## ⚙️ CONFIGURACIÓN COMPARTIDA

Ambos módulos usan la misma configuración `.env`:

```bash
# Ethereum
VITE_ETH_RPC_URL=https://eth-mainnet.g.alchemy.com/v2/mm-9UjI5oG51l94mRH3fh
VITE_ETH_PRIVATE_KEY=d1bf385c43fb999290e3e0365f8cc45bfa97b780a97c6eb4bd790ec3fa09a036
VITE_ETH_WALLET_ADDRESS=0x05316B102FE62574b9cBd45709f8F1B6C00beC8a

# USDT Contract
VITE_USDT_CONTRACT_ADDRESS=0xdAC17F958D2ee523a2206206994597C13D831ec7
```

Ambos módulos leen de:

```bash
server/data/fondos.json  # Base de datos compartida
```

---

## 🔐 SINCRONIZACIÓN DE DATOS

### **Cómo se mantienen sincronizados:**

```javascript
// Cuando USD → USDT procesa una transacción:
1. Lee fondos.json ← GET /api/ethusd/fondos
2. Decrementa monto USD de la cuenta
3. Guarda TX Hash y timestamp
4. Escribe fondos.json actualizado

// Cuando JSON Transacciones procesa lotes:
1. Lee fondos.json ← GET /api/json/fondos
2. Para cada cuenta:
   ├─ Decrementa monto USD
   ├─ Guarda TX Hash
   └─ Guarda timestamp
3. Escribe fondos.json actualizado

// El próximo usuario ve datos actualizados
```

---

## ✅ VERIFICACIÓN DE INTEGRACIÓN

### **Pruebas para confirmar que están integrados:**

**Prueba 1: Datos compartidos**
```bash
# Crear una transacción en USD → USDT
USD 50 de Cuenta 1

# Verificar en JSON Transacciones
GET /api/json/fondos
→ Debe mostrar Cuenta 1 con 50 USD menos
```

**Prueba 2: Oracle compartido**
```bash
# Obtener precio en USD → USDT
Tasa: 0.9989

# Obtener precio en JSON Transacciones
GET /api/json/oracle
→ Debe ser la MISMA tasa: 0.9989
```

**Prueba 3: Procesamiento masivo**
```bash
# Procesar lote de 3 cuentas en JSON Trans.
POST /api/json/procesar-lotes
→ 3 TX hashes diferentes

# Cada TX debe existir en blockchain
curl https://etherscan.io/tx/0x...
→ Status: Success
```

---

## 🎯 FLUJO COMPLETO DE USO

```
┌─────────────────────────────────────────────────┐
│  Usuario abre App                               │
│  http://localhost:4000                          │
└────────┬────────────────────────────────────────┘
         │
    ┌────▼─────────────────────────────┐
    │ ¿Qué necesita hacer?             │
    └────┬────────────────────────────┘
         │
    ┌────┴──────────────────────────────────┐
    │                                       │
┌───▼─────────────────┐    ┌──────────────▼──────┐
│ CONVERTIR 1 USDT    │    │ CONVERTIR LOTES     │
│ USD → USDT          │    │ JSON TRANSACCIONES  │
│                     │    │                     │
│ Paso a paso:        │    │ 4 Tabs:             │
│ 1. PASO 1           │    │ 1. Oracle           │
│ 2. PASO 2           │    │ 2. Fondos           │
│ 3. PASO 3           │    │ 3. Procesar         │
│ 4. PASO 4           │    │ 4. Resultados       │
│                     │    │                     │
│ Clic → CONVERTIR    │    │ Clic → Procesar     │
└───┬─────────────────┘    └──────────┬──────────┘
    │                                  │
    │ GET /api/ethusd/fondos          │ GET /api/json/fondos
    │ POST /api/ethusd/send-usdt      │ POST /api/json/procesar-lotes
    │                                  │
    └───┬──────────────────┬───────────┘
        │                  │
        └──────┬───────────┘
               │
        ┌──────▼──────────────┐
        │ Mismo Backend:      │
        │ json-usdt-conv.js   │
        │ - Oracle            │
        │ - Conversión        │
        │ - Web3/Blockchain   │
        └──────┬──────────────┘
               │
        ┌──────▼──────────────┐
        │ BLOCKCHAIN          │
        │ Ethereum Mainnet    │
        │ (Transacción real)  │
        └─────────────────────┘
```

---

## 🚀 INTEGRACIÓN COMPLETA - ¡LISTA!

**Ambos módulos están totalmente integrados:**

✅ Comparten archivo `fondos.json`  
✅ Usan la misma configuración `.env`  
✅ Consultan el mismo Oracle CoinGecko  
✅ Comparten funciones en `json-usdt-converter.js`  
✅ Escriben en el mismo blockchain  
✅ Actualizan datos sincronizados  

**Flujo de usuario:**
- **Rápido & Manual**: "Convertidor USD → USDT" (1 transacción)
- **Masivo & Automático**: "JSON Transacciones" (múltiples)

¡Ambos funcionan juntos de manera perfecta!










