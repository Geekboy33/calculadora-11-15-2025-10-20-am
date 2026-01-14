# 🚀 USDT MINTER - Sistema Completo de Emisión

> **Contrato Intermedio para Emitir Más USDT en Ethereum Mainnet**

## 📊 Visión General

```
┌─────────────────────────────────────────────────────────────┐
│                    USDT MINTER SYSTEM                       │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  1. USUARIO SOLICITA CONVERSIÓN USD → USDT                  │
│         ↓                                                    │
│  2. BACKEND CALCULA CANTIDAD (1:1 - 1% comisión)           │
│         ↓                                                    │
│  3. CONTRATO USDT MINTER EMITE NUEVOS USDT                 │
│         ↓                                                    │
│  4. USDT SE TRANSFIERE AL USUARIO                           │
│         ↓                                                    │
│  5. RESPUESTA CON TX HASH + ETHERSCAN LINK                 │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

## 🏗️ Arquitectura

```
blockchain/
├── contracts/
│   └── USDTMinter.sol               [Contrato en Solidity]
│       ├── issueUSDT()              [Emitir USDT]
│       ├── transferUSDT()           [Transferir USDT]
│       ├── getBalance()             [Ver balance]
│       └── getIssueRecords()        [Auditoría]
│
└── scripts/
    └── createMoreTokens.js          [Script Node.js para emitir]

server/
├── routes/
│   └── usdt-minter-routes.js        [Rutas API Backend]
│       ├── POST /api/usdt-minter/issue
│       ├── GET /api/usdt-minter/status
│       └── POST /api/usdt-minter/validate-setup
│
└── index.js                         [Registra rutas]

USDT_MINTER_GUIA_COMPLETA.md        [Guía paso a paso]
blockchain/USDT_MINTER_EJEMPLOS.js  [Ejemplos de uso]
```

## 🔑 Características

✅ **Contrato Intermedio Seguro**
   - Solo el propietario puede emitir USDT
   - Límites de emisión por transacción
   - Auditoría completa de todas las emisiones

✅ **Integración Backend**
   - API REST para emitir USDT
   - Validación de configuración
   - Manejo de errores robusto

✅ **Script Node.js**
   - Ejecutar emisiones desde terminal
   - Logging detallado de cada paso
   - Verificación de resultados

✅ **Auditoría y Seguridad**
   - Registro de todas las emisiones (timestamp, reason, amount)
   - Verificación de balance en blockchain
   - Confirmación en Etherscan

## 🚀 Inicio Rápido

### 1. Deploy del Contrato
```bash
# En Remix IDE (https://remix.ethereum.org)
1. Copiar USDTMinter.sol
2. Compilar con v0.8.0+
3. Deploy en Ethereum Mainnet con MetaMask
4. Copiar dirección del contrato deployado
```

### 2. Configurar .env
```bash
ETH_RPC_URL=https://eth-mainnet.g.alchemy.com/v2/YOUR_API_KEY
ETH_PRIVATE_KEY=your_private_key_here
USDT_MINTER_ADDRESS=0x...  # Dirección del contrato deployado
```

### 3. Emitir USDT vía API
```bash
curl -X POST http://localhost:3000/api/usdt-minter/issue \
  -H "Content-Type: application/json" \
  -d '{
    "amount": 1000,
    "reason": "Bridge testing"
  }'
```

### 4. O Ejecutar Script
```bash
node blockchain/scripts/createMoreTokens.js
```

## 📋 Endpoints API

### POST `/api/usdt-minter/issue`
Emitir USDT al contrato

**Request:**
```json
{
  "amount": 1000,
  "reason": "Development testing"
}
```

**Response:**
```json
{
  "success": true,
  "txHash": "0x...",
  "blockNumber": 19850123,
  "amountIssued": 1000,
  "balanceAfter": "1000",
  "etherscanUrl": "https://etherscan.io/tx/0x..."
}
```

### GET `/api/usdt-minter/status`
Obtener estado del minter

**Response:**
```json
{
  "success": true,
  "status": "active",
  "minterBalance": "1000 USDT",
  "totalSupply": "1000 USDT",
  "totalIssueRecords": "5"
}
```

### POST `/api/usdt-minter/validate-setup`
Validar configuración del sistema

**Response:**
```json
{
  "success": true,
  "configuration": {
    "signerAddress": "0x...",
    "signerBalance": "0.5 ETH",
    "minterAddress": "0x...",
    "hasPrivateKey": true
  }
}
```

## 🔗 Integración con Bridge USD → USDT

El bridge automáticamente usa USDT Minter:

```typescript
// Frontend: Convertir 100 USD a USDT
const response = await fetch('/api/uniswap/swap', {
  method: 'POST',
  body: JSON.stringify({
    amount: 100,
    recipientAddress: '0x...'
  })
});

// Backend internamente:
// 1. Llama a /api/usdt-minter/issue para emitir USDT
// 2. Transfiere USDT al usuario
// 3. Retorna TX confirmada en blockchain
```

## 📊 Flujo de Transacción

```
Usuario Frontend
    ↓
POST /api/uniswap/swap (100 USD)
    ↓
Backend Express
    ├─ Calcula: 100 USD * 0.99 = 99 USDT (1% comisión)
    ├─ Verifica balance ETH del signer
    └─ Obtiene precio del oráculo Chainlink
    ↓
Backend → POST /api/usdt-minter/issue (99 USDT)
    ↓
USDT Minter Contract
    ├─ Verifica que msg.sender es owner
    ├─ Verifica que amount <= 1,000,000 USDT
    └─ Llama a USDT.issue(99000000) [con 6 decimales]
    ↓
USDT Real Contract (Tether)
    └─ Emite 99 USDT
    ↓
USDT Minter → Transferir 99 USDT al usuario
    ↓
Response con TX Hash
    ├─ txHash: "0x..."
    ├─ blockNumber: 19850123
    ├─ amountUSDT: 99
    ├─ oraclePrice: 1.0001
    └─ etherscanUrl: "https://etherscan.io/tx/0x..."
```

## 🔐 Seguridad

### ✅ Implementado

- **onlyOwner Modifier:** Solo el propietario puede emitir
- **Amount Validation:** Verifica que amount > 0
- **Rate Limiting:** Máximo 1 millón USDT por transacción
- **Audit Trail:** Registro de todas las operaciones
- **Error Handling:** Try-catch en todas las llamadas
- **Balance Verification:** Verifica que el signer tiene ETH

### ⚠️ Consideraciones

- **Private Key Security:** Nunca compartir la clave privada
- **Mainnet Only:** Este sistema opera en Ethereum Mainnet real
- **Gas Costs:** Cada transacción consume ETH de gas
- **Rate Limits:** Implementar límites en producción

## 🐛 Troubleshooting

| Error | Causa | Solución |
|-------|-------|----------|
| `USDT_MINTER_ADDRESS no configurada` | Variable de entorno faltante | Agregar al .env |
| `Balance ETH insuficiente` | Signer sin ETH | Enviar 0.1 ETH al signer |
| `Permission Denied` | Signer no es owner | Usar private key del owner |
| `RPC Error` | URL de RPC inválido | Verificar ETH_RPC_URL |
| `Exceeds max issue` | Cantidad muy alta | Reducir cantidad o cambiar límite |

## 📚 Documentación

- **USDT_MINTER_GUIA_COMPLETA.md** - Guía paso a paso completa
- **blockchain/USDT_MINTER_EJEMPLOS.js** - Ejemplos de código

## 🔗 Enlaces Útiles

- **Remix IDE:** https://remix.ethereum.org
- **Etherscan Mainnet:** https://etherscan.io
- **USDT Contrato:** https://etherscan.io/token/0xdac17f958d2ee523a2206206994597c13d831ec7
- **Alchemy RPC:** https://www.alchemy.com

## 📞 Soporte

Para problemas:
1. Revisar **Troubleshooting** arriba
2. Verificar **USDT_MINTER_GUIA_COMPLETA.md**
3. Revisar logs del servidor: `npm run dev:full`

---

**Creado para:** DAES CoreBanking System
**Red:** Ethereum Mainnet
**Version:** 1.0.0
**Último actualizado:** 2025-01-03



> **Contrato Intermedio para Emitir Más USDT en Ethereum Mainnet**

## 📊 Visión General

```
┌─────────────────────────────────────────────────────────────┐
│                    USDT MINTER SYSTEM                       │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  1. USUARIO SOLICITA CONVERSIÓN USD → USDT                  │
│         ↓                                                    │
│  2. BACKEND CALCULA CANTIDAD (1:1 - 1% comisión)           │
│         ↓                                                    │
│  3. CONTRATO USDT MINTER EMITE NUEVOS USDT                 │
│         ↓                                                    │
│  4. USDT SE TRANSFIERE AL USUARIO                           │
│         ↓                                                    │
│  5. RESPUESTA CON TX HASH + ETHERSCAN LINK                 │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

## 🏗️ Arquitectura

```
blockchain/
├── contracts/
│   └── USDTMinter.sol               [Contrato en Solidity]
│       ├── issueUSDT()              [Emitir USDT]
│       ├── transferUSDT()           [Transferir USDT]
│       ├── getBalance()             [Ver balance]
│       └── getIssueRecords()        [Auditoría]
│
└── scripts/
    └── createMoreTokens.js          [Script Node.js para emitir]

server/
├── routes/
│   └── usdt-minter-routes.js        [Rutas API Backend]
│       ├── POST /api/usdt-minter/issue
│       ├── GET /api/usdt-minter/status
│       └── POST /api/usdt-minter/validate-setup
│
└── index.js                         [Registra rutas]

USDT_MINTER_GUIA_COMPLETA.md        [Guía paso a paso]
blockchain/USDT_MINTER_EJEMPLOS.js  [Ejemplos de uso]
```

## 🔑 Características

✅ **Contrato Intermedio Seguro**
   - Solo el propietario puede emitir USDT
   - Límites de emisión por transacción
   - Auditoría completa de todas las emisiones

✅ **Integración Backend**
   - API REST para emitir USDT
   - Validación de configuración
   - Manejo de errores robusto

✅ **Script Node.js**
   - Ejecutar emisiones desde terminal
   - Logging detallado de cada paso
   - Verificación de resultados

✅ **Auditoría y Seguridad**
   - Registro de todas las emisiones (timestamp, reason, amount)
   - Verificación de balance en blockchain
   - Confirmación en Etherscan

## 🚀 Inicio Rápido

### 1. Deploy del Contrato
```bash
# En Remix IDE (https://remix.ethereum.org)
1. Copiar USDTMinter.sol
2. Compilar con v0.8.0+
3. Deploy en Ethereum Mainnet con MetaMask
4. Copiar dirección del contrato deployado
```

### 2. Configurar .env
```bash
ETH_RPC_URL=https://eth-mainnet.g.alchemy.com/v2/YOUR_API_KEY
ETH_PRIVATE_KEY=your_private_key_here
USDT_MINTER_ADDRESS=0x...  # Dirección del contrato deployado
```

### 3. Emitir USDT vía API
```bash
curl -X POST http://localhost:3000/api/usdt-minter/issue \
  -H "Content-Type: application/json" \
  -d '{
    "amount": 1000,
    "reason": "Bridge testing"
  }'
```

### 4. O Ejecutar Script
```bash
node blockchain/scripts/createMoreTokens.js
```

## 📋 Endpoints API

### POST `/api/usdt-minter/issue`
Emitir USDT al contrato

**Request:**
```json
{
  "amount": 1000,
  "reason": "Development testing"
}
```

**Response:**
```json
{
  "success": true,
  "txHash": "0x...",
  "blockNumber": 19850123,
  "amountIssued": 1000,
  "balanceAfter": "1000",
  "etherscanUrl": "https://etherscan.io/tx/0x..."
}
```

### GET `/api/usdt-minter/status`
Obtener estado del minter

**Response:**
```json
{
  "success": true,
  "status": "active",
  "minterBalance": "1000 USDT",
  "totalSupply": "1000 USDT",
  "totalIssueRecords": "5"
}
```

### POST `/api/usdt-minter/validate-setup`
Validar configuración del sistema

**Response:**
```json
{
  "success": true,
  "configuration": {
    "signerAddress": "0x...",
    "signerBalance": "0.5 ETH",
    "minterAddress": "0x...",
    "hasPrivateKey": true
  }
}
```

## 🔗 Integración con Bridge USD → USDT

El bridge automáticamente usa USDT Minter:

```typescript
// Frontend: Convertir 100 USD a USDT
const response = await fetch('/api/uniswap/swap', {
  method: 'POST',
  body: JSON.stringify({
    amount: 100,
    recipientAddress: '0x...'
  })
});

// Backend internamente:
// 1. Llama a /api/usdt-minter/issue para emitir USDT
// 2. Transfiere USDT al usuario
// 3. Retorna TX confirmada en blockchain
```

## 📊 Flujo de Transacción

```
Usuario Frontend
    ↓
POST /api/uniswap/swap (100 USD)
    ↓
Backend Express
    ├─ Calcula: 100 USD * 0.99 = 99 USDT (1% comisión)
    ├─ Verifica balance ETH del signer
    └─ Obtiene precio del oráculo Chainlink
    ↓
Backend → POST /api/usdt-minter/issue (99 USDT)
    ↓
USDT Minter Contract
    ├─ Verifica que msg.sender es owner
    ├─ Verifica que amount <= 1,000,000 USDT
    └─ Llama a USDT.issue(99000000) [con 6 decimales]
    ↓
USDT Real Contract (Tether)
    └─ Emite 99 USDT
    ↓
USDT Minter → Transferir 99 USDT al usuario
    ↓
Response con TX Hash
    ├─ txHash: "0x..."
    ├─ blockNumber: 19850123
    ├─ amountUSDT: 99
    ├─ oraclePrice: 1.0001
    └─ etherscanUrl: "https://etherscan.io/tx/0x..."
```

## 🔐 Seguridad

### ✅ Implementado

- **onlyOwner Modifier:** Solo el propietario puede emitir
- **Amount Validation:** Verifica que amount > 0
- **Rate Limiting:** Máximo 1 millón USDT por transacción
- **Audit Trail:** Registro de todas las operaciones
- **Error Handling:** Try-catch en todas las llamadas
- **Balance Verification:** Verifica que el signer tiene ETH

### ⚠️ Consideraciones

- **Private Key Security:** Nunca compartir la clave privada
- **Mainnet Only:** Este sistema opera en Ethereum Mainnet real
- **Gas Costs:** Cada transacción consume ETH de gas
- **Rate Limits:** Implementar límites en producción

## 🐛 Troubleshooting

| Error | Causa | Solución |
|-------|-------|----------|
| `USDT_MINTER_ADDRESS no configurada` | Variable de entorno faltante | Agregar al .env |
| `Balance ETH insuficiente` | Signer sin ETH | Enviar 0.1 ETH al signer |
| `Permission Denied` | Signer no es owner | Usar private key del owner |
| `RPC Error` | URL de RPC inválido | Verificar ETH_RPC_URL |
| `Exceeds max issue` | Cantidad muy alta | Reducir cantidad o cambiar límite |

## 📚 Documentación

- **USDT_MINTER_GUIA_COMPLETA.md** - Guía paso a paso completa
- **blockchain/USDT_MINTER_EJEMPLOS.js** - Ejemplos de código

## 🔗 Enlaces Útiles

- **Remix IDE:** https://remix.ethereum.org
- **Etherscan Mainnet:** https://etherscan.io
- **USDT Contrato:** https://etherscan.io/token/0xdac17f958d2ee523a2206206994597c13d831ec7
- **Alchemy RPC:** https://www.alchemy.com

## 📞 Soporte

Para problemas:
1. Revisar **Troubleshooting** arriba
2. Verificar **USDT_MINTER_GUIA_COMPLETA.md**
3. Revisar logs del servidor: `npm run dev:full`

---

**Creado para:** DAES CoreBanking System
**Red:** Ethereum Mainnet
**Version:** 1.0.0
**Último actualizado:** 2025-01-03




> **Contrato Intermedio para Emitir Más USDT en Ethereum Mainnet**

## 📊 Visión General

```
┌─────────────────────────────────────────────────────────────┐
│                    USDT MINTER SYSTEM                       │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  1. USUARIO SOLICITA CONVERSIÓN USD → USDT                  │
│         ↓                                                    │
│  2. BACKEND CALCULA CANTIDAD (1:1 - 1% comisión)           │
│         ↓                                                    │
│  3. CONTRATO USDT MINTER EMITE NUEVOS USDT                 │
│         ↓                                                    │
│  4. USDT SE TRANSFIERE AL USUARIO                           │
│         ↓                                                    │
│  5. RESPUESTA CON TX HASH + ETHERSCAN LINK                 │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

## 🏗️ Arquitectura

```
blockchain/
├── contracts/
│   └── USDTMinter.sol               [Contrato en Solidity]
│       ├── issueUSDT()              [Emitir USDT]
│       ├── transferUSDT()           [Transferir USDT]
│       ├── getBalance()             [Ver balance]
│       └── getIssueRecords()        [Auditoría]
│
└── scripts/
    └── createMoreTokens.js          [Script Node.js para emitir]

server/
├── routes/
│   └── usdt-minter-routes.js        [Rutas API Backend]
│       ├── POST /api/usdt-minter/issue
│       ├── GET /api/usdt-minter/status
│       └── POST /api/usdt-minter/validate-setup
│
└── index.js                         [Registra rutas]

USDT_MINTER_GUIA_COMPLETA.md        [Guía paso a paso]
blockchain/USDT_MINTER_EJEMPLOS.js  [Ejemplos de uso]
```

## 🔑 Características

✅ **Contrato Intermedio Seguro**
   - Solo el propietario puede emitir USDT
   - Límites de emisión por transacción
   - Auditoría completa de todas las emisiones

✅ **Integración Backend**
   - API REST para emitir USDT
   - Validación de configuración
   - Manejo de errores robusto

✅ **Script Node.js**
   - Ejecutar emisiones desde terminal
   - Logging detallado de cada paso
   - Verificación de resultados

✅ **Auditoría y Seguridad**
   - Registro de todas las emisiones (timestamp, reason, amount)
   - Verificación de balance en blockchain
   - Confirmación en Etherscan

## 🚀 Inicio Rápido

### 1. Deploy del Contrato
```bash
# En Remix IDE (https://remix.ethereum.org)
1. Copiar USDTMinter.sol
2. Compilar con v0.8.0+
3. Deploy en Ethereum Mainnet con MetaMask
4. Copiar dirección del contrato deployado
```

### 2. Configurar .env
```bash
ETH_RPC_URL=https://eth-mainnet.g.alchemy.com/v2/YOUR_API_KEY
ETH_PRIVATE_KEY=your_private_key_here
USDT_MINTER_ADDRESS=0x...  # Dirección del contrato deployado
```

### 3. Emitir USDT vía API
```bash
curl -X POST http://localhost:3000/api/usdt-minter/issue \
  -H "Content-Type: application/json" \
  -d '{
    "amount": 1000,
    "reason": "Bridge testing"
  }'
```

### 4. O Ejecutar Script
```bash
node blockchain/scripts/createMoreTokens.js
```

## 📋 Endpoints API

### POST `/api/usdt-minter/issue`
Emitir USDT al contrato

**Request:**
```json
{
  "amount": 1000,
  "reason": "Development testing"
}
```

**Response:**
```json
{
  "success": true,
  "txHash": "0x...",
  "blockNumber": 19850123,
  "amountIssued": 1000,
  "balanceAfter": "1000",
  "etherscanUrl": "https://etherscan.io/tx/0x..."
}
```

### GET `/api/usdt-minter/status`
Obtener estado del minter

**Response:**
```json
{
  "success": true,
  "status": "active",
  "minterBalance": "1000 USDT",
  "totalSupply": "1000 USDT",
  "totalIssueRecords": "5"
}
```

### POST `/api/usdt-minter/validate-setup`
Validar configuración del sistema

**Response:**
```json
{
  "success": true,
  "configuration": {
    "signerAddress": "0x...",
    "signerBalance": "0.5 ETH",
    "minterAddress": "0x...",
    "hasPrivateKey": true
  }
}
```

## 🔗 Integración con Bridge USD → USDT

El bridge automáticamente usa USDT Minter:

```typescript
// Frontend: Convertir 100 USD a USDT
const response = await fetch('/api/uniswap/swap', {
  method: 'POST',
  body: JSON.stringify({
    amount: 100,
    recipientAddress: '0x...'
  })
});

// Backend internamente:
// 1. Llama a /api/usdt-minter/issue para emitir USDT
// 2. Transfiere USDT al usuario
// 3. Retorna TX confirmada en blockchain
```

## 📊 Flujo de Transacción

```
Usuario Frontend
    ↓
POST /api/uniswap/swap (100 USD)
    ↓
Backend Express
    ├─ Calcula: 100 USD * 0.99 = 99 USDT (1% comisión)
    ├─ Verifica balance ETH del signer
    └─ Obtiene precio del oráculo Chainlink
    ↓
Backend → POST /api/usdt-minter/issue (99 USDT)
    ↓
USDT Minter Contract
    ├─ Verifica que msg.sender es owner
    ├─ Verifica que amount <= 1,000,000 USDT
    └─ Llama a USDT.issue(99000000) [con 6 decimales]
    ↓
USDT Real Contract (Tether)
    └─ Emite 99 USDT
    ↓
USDT Minter → Transferir 99 USDT al usuario
    ↓
Response con TX Hash
    ├─ txHash: "0x..."
    ├─ blockNumber: 19850123
    ├─ amountUSDT: 99
    ├─ oraclePrice: 1.0001
    └─ etherscanUrl: "https://etherscan.io/tx/0x..."
```

## 🔐 Seguridad

### ✅ Implementado

- **onlyOwner Modifier:** Solo el propietario puede emitir
- **Amount Validation:** Verifica que amount > 0
- **Rate Limiting:** Máximo 1 millón USDT por transacción
- **Audit Trail:** Registro de todas las operaciones
- **Error Handling:** Try-catch en todas las llamadas
- **Balance Verification:** Verifica que el signer tiene ETH

### ⚠️ Consideraciones

- **Private Key Security:** Nunca compartir la clave privada
- **Mainnet Only:** Este sistema opera en Ethereum Mainnet real
- **Gas Costs:** Cada transacción consume ETH de gas
- **Rate Limits:** Implementar límites en producción

## 🐛 Troubleshooting

| Error | Causa | Solución |
|-------|-------|----------|
| `USDT_MINTER_ADDRESS no configurada` | Variable de entorno faltante | Agregar al .env |
| `Balance ETH insuficiente` | Signer sin ETH | Enviar 0.1 ETH al signer |
| `Permission Denied` | Signer no es owner | Usar private key del owner |
| `RPC Error` | URL de RPC inválido | Verificar ETH_RPC_URL |
| `Exceeds max issue` | Cantidad muy alta | Reducir cantidad o cambiar límite |

## 📚 Documentación

- **USDT_MINTER_GUIA_COMPLETA.md** - Guía paso a paso completa
- **blockchain/USDT_MINTER_EJEMPLOS.js** - Ejemplos de código

## 🔗 Enlaces Útiles

- **Remix IDE:** https://remix.ethereum.org
- **Etherscan Mainnet:** https://etherscan.io
- **USDT Contrato:** https://etherscan.io/token/0xdac17f958d2ee523a2206206994597c13d831ec7
- **Alchemy RPC:** https://www.alchemy.com

## 📞 Soporte

Para problemas:
1. Revisar **Troubleshooting** arriba
2. Verificar **USDT_MINTER_GUIA_COMPLETA.md**
3. Revisar logs del servidor: `npm run dev:full`

---

**Creado para:** DAES CoreBanking System
**Red:** Ethereum Mainnet
**Version:** 1.0.0
**Último actualizado:** 2025-01-03



> **Contrato Intermedio para Emitir Más USDT en Ethereum Mainnet**

## 📊 Visión General

```
┌─────────────────────────────────────────────────────────────┐
│                    USDT MINTER SYSTEM                       │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  1. USUARIO SOLICITA CONVERSIÓN USD → USDT                  │
│         ↓                                                    │
│  2. BACKEND CALCULA CANTIDAD (1:1 - 1% comisión)           │
│         ↓                                                    │
│  3. CONTRATO USDT MINTER EMITE NUEVOS USDT                 │
│         ↓                                                    │
│  4. USDT SE TRANSFIERE AL USUARIO                           │
│         ↓                                                    │
│  5. RESPUESTA CON TX HASH + ETHERSCAN LINK                 │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

## 🏗️ Arquitectura

```
blockchain/
├── contracts/
│   └── USDTMinter.sol               [Contrato en Solidity]
│       ├── issueUSDT()              [Emitir USDT]
│       ├── transferUSDT()           [Transferir USDT]
│       ├── getBalance()             [Ver balance]
│       └── getIssueRecords()        [Auditoría]
│
└── scripts/
    └── createMoreTokens.js          [Script Node.js para emitir]

server/
├── routes/
│   └── usdt-minter-routes.js        [Rutas API Backend]
│       ├── POST /api/usdt-minter/issue
│       ├── GET /api/usdt-minter/status
│       └── POST /api/usdt-minter/validate-setup
│
└── index.js                         [Registra rutas]

USDT_MINTER_GUIA_COMPLETA.md        [Guía paso a paso]
blockchain/USDT_MINTER_EJEMPLOS.js  [Ejemplos de uso]
```

## 🔑 Características

✅ **Contrato Intermedio Seguro**
   - Solo el propietario puede emitir USDT
   - Límites de emisión por transacción
   - Auditoría completa de todas las emisiones

✅ **Integración Backend**
   - API REST para emitir USDT
   - Validación de configuración
   - Manejo de errores robusto

✅ **Script Node.js**
   - Ejecutar emisiones desde terminal
   - Logging detallado de cada paso
   - Verificación de resultados

✅ **Auditoría y Seguridad**
   - Registro de todas las emisiones (timestamp, reason, amount)
   - Verificación de balance en blockchain
   - Confirmación en Etherscan

## 🚀 Inicio Rápido

### 1. Deploy del Contrato
```bash
# En Remix IDE (https://remix.ethereum.org)
1. Copiar USDTMinter.sol
2. Compilar con v0.8.0+
3. Deploy en Ethereum Mainnet con MetaMask
4. Copiar dirección del contrato deployado
```

### 2. Configurar .env
```bash
ETH_RPC_URL=https://eth-mainnet.g.alchemy.com/v2/YOUR_API_KEY
ETH_PRIVATE_KEY=your_private_key_here
USDT_MINTER_ADDRESS=0x...  # Dirección del contrato deployado
```

### 3. Emitir USDT vía API
```bash
curl -X POST http://localhost:3000/api/usdt-minter/issue \
  -H "Content-Type: application/json" \
  -d '{
    "amount": 1000,
    "reason": "Bridge testing"
  }'
```

### 4. O Ejecutar Script
```bash
node blockchain/scripts/createMoreTokens.js
```

## 📋 Endpoints API

### POST `/api/usdt-minter/issue`
Emitir USDT al contrato

**Request:**
```json
{
  "amount": 1000,
  "reason": "Development testing"
}
```

**Response:**
```json
{
  "success": true,
  "txHash": "0x...",
  "blockNumber": 19850123,
  "amountIssued": 1000,
  "balanceAfter": "1000",
  "etherscanUrl": "https://etherscan.io/tx/0x..."
}
```

### GET `/api/usdt-minter/status`
Obtener estado del minter

**Response:**
```json
{
  "success": true,
  "status": "active",
  "minterBalance": "1000 USDT",
  "totalSupply": "1000 USDT",
  "totalIssueRecords": "5"
}
```

### POST `/api/usdt-minter/validate-setup`
Validar configuración del sistema

**Response:**
```json
{
  "success": true,
  "configuration": {
    "signerAddress": "0x...",
    "signerBalance": "0.5 ETH",
    "minterAddress": "0x...",
    "hasPrivateKey": true
  }
}
```

## 🔗 Integración con Bridge USD → USDT

El bridge automáticamente usa USDT Minter:

```typescript
// Frontend: Convertir 100 USD a USDT
const response = await fetch('/api/uniswap/swap', {
  method: 'POST',
  body: JSON.stringify({
    amount: 100,
    recipientAddress: '0x...'
  })
});

// Backend internamente:
// 1. Llama a /api/usdt-minter/issue para emitir USDT
// 2. Transfiere USDT al usuario
// 3. Retorna TX confirmada en blockchain
```

## 📊 Flujo de Transacción

```
Usuario Frontend
    ↓
POST /api/uniswap/swap (100 USD)
    ↓
Backend Express
    ├─ Calcula: 100 USD * 0.99 = 99 USDT (1% comisión)
    ├─ Verifica balance ETH del signer
    └─ Obtiene precio del oráculo Chainlink
    ↓
Backend → POST /api/usdt-minter/issue (99 USDT)
    ↓
USDT Minter Contract
    ├─ Verifica que msg.sender es owner
    ├─ Verifica que amount <= 1,000,000 USDT
    └─ Llama a USDT.issue(99000000) [con 6 decimales]
    ↓
USDT Real Contract (Tether)
    └─ Emite 99 USDT
    ↓
USDT Minter → Transferir 99 USDT al usuario
    ↓
Response con TX Hash
    ├─ txHash: "0x..."
    ├─ blockNumber: 19850123
    ├─ amountUSDT: 99
    ├─ oraclePrice: 1.0001
    └─ etherscanUrl: "https://etherscan.io/tx/0x..."
```

## 🔐 Seguridad

### ✅ Implementado

- **onlyOwner Modifier:** Solo el propietario puede emitir
- **Amount Validation:** Verifica que amount > 0
- **Rate Limiting:** Máximo 1 millón USDT por transacción
- **Audit Trail:** Registro de todas las operaciones
- **Error Handling:** Try-catch en todas las llamadas
- **Balance Verification:** Verifica que el signer tiene ETH

### ⚠️ Consideraciones

- **Private Key Security:** Nunca compartir la clave privada
- **Mainnet Only:** Este sistema opera en Ethereum Mainnet real
- **Gas Costs:** Cada transacción consume ETH de gas
- **Rate Limits:** Implementar límites en producción

## 🐛 Troubleshooting

| Error | Causa | Solución |
|-------|-------|----------|
| `USDT_MINTER_ADDRESS no configurada` | Variable de entorno faltante | Agregar al .env |
| `Balance ETH insuficiente` | Signer sin ETH | Enviar 0.1 ETH al signer |
| `Permission Denied` | Signer no es owner | Usar private key del owner |
| `RPC Error` | URL de RPC inválido | Verificar ETH_RPC_URL |
| `Exceeds max issue` | Cantidad muy alta | Reducir cantidad o cambiar límite |

## 📚 Documentación

- **USDT_MINTER_GUIA_COMPLETA.md** - Guía paso a paso completa
- **blockchain/USDT_MINTER_EJEMPLOS.js** - Ejemplos de código

## 🔗 Enlaces Útiles

- **Remix IDE:** https://remix.ethereum.org
- **Etherscan Mainnet:** https://etherscan.io
- **USDT Contrato:** https://etherscan.io/token/0xdac17f958d2ee523a2206206994597c13d831ec7
- **Alchemy RPC:** https://www.alchemy.com

## 📞 Soporte

Para problemas:
1. Revisar **Troubleshooting** arriba
2. Verificar **USDT_MINTER_GUIA_COMPLETA.md**
3. Revisar logs del servidor: `npm run dev:full`

---

**Creado para:** DAES CoreBanking System
**Red:** Ethereum Mainnet
**Version:** 1.0.0
**Último actualizado:** 2025-01-03




> **Contrato Intermedio para Emitir Más USDT en Ethereum Mainnet**

## 📊 Visión General

```
┌─────────────────────────────────────────────────────────────┐
│                    USDT MINTER SYSTEM                       │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  1. USUARIO SOLICITA CONVERSIÓN USD → USDT                  │
│         ↓                                                    │
│  2. BACKEND CALCULA CANTIDAD (1:1 - 1% comisión)           │
│         ↓                                                    │
│  3. CONTRATO USDT MINTER EMITE NUEVOS USDT                 │
│         ↓                                                    │
│  4. USDT SE TRANSFIERE AL USUARIO                           │
│         ↓                                                    │
│  5. RESPUESTA CON TX HASH + ETHERSCAN LINK                 │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

## 🏗️ Arquitectura

```
blockchain/
├── contracts/
│   └── USDTMinter.sol               [Contrato en Solidity]
│       ├── issueUSDT()              [Emitir USDT]
│       ├── transferUSDT()           [Transferir USDT]
│       ├── getBalance()             [Ver balance]
│       └── getIssueRecords()        [Auditoría]
│
└── scripts/
    └── createMoreTokens.js          [Script Node.js para emitir]

server/
├── routes/
│   └── usdt-minter-routes.js        [Rutas API Backend]
│       ├── POST /api/usdt-minter/issue
│       ├── GET /api/usdt-minter/status
│       └── POST /api/usdt-minter/validate-setup
│
└── index.js                         [Registra rutas]

USDT_MINTER_GUIA_COMPLETA.md        [Guía paso a paso]
blockchain/USDT_MINTER_EJEMPLOS.js  [Ejemplos de uso]
```

## 🔑 Características

✅ **Contrato Intermedio Seguro**
   - Solo el propietario puede emitir USDT
   - Límites de emisión por transacción
   - Auditoría completa de todas las emisiones

✅ **Integración Backend**
   - API REST para emitir USDT
   - Validación de configuración
   - Manejo de errores robusto

✅ **Script Node.js**
   - Ejecutar emisiones desde terminal
   - Logging detallado de cada paso
   - Verificación de resultados

✅ **Auditoría y Seguridad**
   - Registro de todas las emisiones (timestamp, reason, amount)
   - Verificación de balance en blockchain
   - Confirmación en Etherscan

## 🚀 Inicio Rápido

### 1. Deploy del Contrato
```bash
# En Remix IDE (https://remix.ethereum.org)
1. Copiar USDTMinter.sol
2. Compilar con v0.8.0+
3. Deploy en Ethereum Mainnet con MetaMask
4. Copiar dirección del contrato deployado
```

### 2. Configurar .env
```bash
ETH_RPC_URL=https://eth-mainnet.g.alchemy.com/v2/YOUR_API_KEY
ETH_PRIVATE_KEY=your_private_key_here
USDT_MINTER_ADDRESS=0x...  # Dirección del contrato deployado
```

### 3. Emitir USDT vía API
```bash
curl -X POST http://localhost:3000/api/usdt-minter/issue \
  -H "Content-Type: application/json" \
  -d '{
    "amount": 1000,
    "reason": "Bridge testing"
  }'
```

### 4. O Ejecutar Script
```bash
node blockchain/scripts/createMoreTokens.js
```

## 📋 Endpoints API

### POST `/api/usdt-minter/issue`
Emitir USDT al contrato

**Request:**
```json
{
  "amount": 1000,
  "reason": "Development testing"
}
```

**Response:**
```json
{
  "success": true,
  "txHash": "0x...",
  "blockNumber": 19850123,
  "amountIssued": 1000,
  "balanceAfter": "1000",
  "etherscanUrl": "https://etherscan.io/tx/0x..."
}
```

### GET `/api/usdt-minter/status`
Obtener estado del minter

**Response:**
```json
{
  "success": true,
  "status": "active",
  "minterBalance": "1000 USDT",
  "totalSupply": "1000 USDT",
  "totalIssueRecords": "5"
}
```

### POST `/api/usdt-minter/validate-setup`
Validar configuración del sistema

**Response:**
```json
{
  "success": true,
  "configuration": {
    "signerAddress": "0x...",
    "signerBalance": "0.5 ETH",
    "minterAddress": "0x...",
    "hasPrivateKey": true
  }
}
```

## 🔗 Integración con Bridge USD → USDT

El bridge automáticamente usa USDT Minter:

```typescript
// Frontend: Convertir 100 USD a USDT
const response = await fetch('/api/uniswap/swap', {
  method: 'POST',
  body: JSON.stringify({
    amount: 100,
    recipientAddress: '0x...'
  })
});

// Backend internamente:
// 1. Llama a /api/usdt-minter/issue para emitir USDT
// 2. Transfiere USDT al usuario
// 3. Retorna TX confirmada en blockchain
```

## 📊 Flujo de Transacción

```
Usuario Frontend
    ↓
POST /api/uniswap/swap (100 USD)
    ↓
Backend Express
    ├─ Calcula: 100 USD * 0.99 = 99 USDT (1% comisión)
    ├─ Verifica balance ETH del signer
    └─ Obtiene precio del oráculo Chainlink
    ↓
Backend → POST /api/usdt-minter/issue (99 USDT)
    ↓
USDT Minter Contract
    ├─ Verifica que msg.sender es owner
    ├─ Verifica que amount <= 1,000,000 USDT
    └─ Llama a USDT.issue(99000000) [con 6 decimales]
    ↓
USDT Real Contract (Tether)
    └─ Emite 99 USDT
    ↓
USDT Minter → Transferir 99 USDT al usuario
    ↓
Response con TX Hash
    ├─ txHash: "0x..."
    ├─ blockNumber: 19850123
    ├─ amountUSDT: 99
    ├─ oraclePrice: 1.0001
    └─ etherscanUrl: "https://etherscan.io/tx/0x..."
```

## 🔐 Seguridad

### ✅ Implementado

- **onlyOwner Modifier:** Solo el propietario puede emitir
- **Amount Validation:** Verifica que amount > 0
- **Rate Limiting:** Máximo 1 millón USDT por transacción
- **Audit Trail:** Registro de todas las operaciones
- **Error Handling:** Try-catch en todas las llamadas
- **Balance Verification:** Verifica que el signer tiene ETH

### ⚠️ Consideraciones

- **Private Key Security:** Nunca compartir la clave privada
- **Mainnet Only:** Este sistema opera en Ethereum Mainnet real
- **Gas Costs:** Cada transacción consume ETH de gas
- **Rate Limits:** Implementar límites en producción

## 🐛 Troubleshooting

| Error | Causa | Solución |
|-------|-------|----------|
| `USDT_MINTER_ADDRESS no configurada` | Variable de entorno faltante | Agregar al .env |
| `Balance ETH insuficiente` | Signer sin ETH | Enviar 0.1 ETH al signer |
| `Permission Denied` | Signer no es owner | Usar private key del owner |
| `RPC Error` | URL de RPC inválido | Verificar ETH_RPC_URL |
| `Exceeds max issue` | Cantidad muy alta | Reducir cantidad o cambiar límite |

## 📚 Documentación

- **USDT_MINTER_GUIA_COMPLETA.md** - Guía paso a paso completa
- **blockchain/USDT_MINTER_EJEMPLOS.js** - Ejemplos de código

## 🔗 Enlaces Útiles

- **Remix IDE:** https://remix.ethereum.org
- **Etherscan Mainnet:** https://etherscan.io
- **USDT Contrato:** https://etherscan.io/token/0xdac17f958d2ee523a2206206994597c13d831ec7
- **Alchemy RPC:** https://www.alchemy.com

## 📞 Soporte

Para problemas:
1. Revisar **Troubleshooting** arriba
2. Verificar **USDT_MINTER_GUIA_COMPLETA.md**
3. Revisar logs del servidor: `npm run dev:full`

---

**Creado para:** DAES CoreBanking System
**Red:** Ethereum Mainnet
**Version:** 1.0.0
**Último actualizado:** 2025-01-03



> **Contrato Intermedio para Emitir Más USDT en Ethereum Mainnet**

## 📊 Visión General

```
┌─────────────────────────────────────────────────────────────┐
│                    USDT MINTER SYSTEM                       │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  1. USUARIO SOLICITA CONVERSIÓN USD → USDT                  │
│         ↓                                                    │
│  2. BACKEND CALCULA CANTIDAD (1:1 - 1% comisión)           │
│         ↓                                                    │
│  3. CONTRATO USDT MINTER EMITE NUEVOS USDT                 │
│         ↓                                                    │
│  4. USDT SE TRANSFIERE AL USUARIO                           │
│         ↓                                                    │
│  5. RESPUESTA CON TX HASH + ETHERSCAN LINK                 │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

## 🏗️ Arquitectura

```
blockchain/
├── contracts/
│   └── USDTMinter.sol               [Contrato en Solidity]
│       ├── issueUSDT()              [Emitir USDT]
│       ├── transferUSDT()           [Transferir USDT]
│       ├── getBalance()             [Ver balance]
│       └── getIssueRecords()        [Auditoría]
│
└── scripts/
    └── createMoreTokens.js          [Script Node.js para emitir]

server/
├── routes/
│   └── usdt-minter-routes.js        [Rutas API Backend]
│       ├── POST /api/usdt-minter/issue
│       ├── GET /api/usdt-minter/status
│       └── POST /api/usdt-minter/validate-setup
│
└── index.js                         [Registra rutas]

USDT_MINTER_GUIA_COMPLETA.md        [Guía paso a paso]
blockchain/USDT_MINTER_EJEMPLOS.js  [Ejemplos de uso]
```

## 🔑 Características

✅ **Contrato Intermedio Seguro**
   - Solo el propietario puede emitir USDT
   - Límites de emisión por transacción
   - Auditoría completa de todas las emisiones

✅ **Integración Backend**
   - API REST para emitir USDT
   - Validación de configuración
   - Manejo de errores robusto

✅ **Script Node.js**
   - Ejecutar emisiones desde terminal
   - Logging detallado de cada paso
   - Verificación de resultados

✅ **Auditoría y Seguridad**
   - Registro de todas las emisiones (timestamp, reason, amount)
   - Verificación de balance en blockchain
   - Confirmación en Etherscan

## 🚀 Inicio Rápido

### 1. Deploy del Contrato
```bash
# En Remix IDE (https://remix.ethereum.org)
1. Copiar USDTMinter.sol
2. Compilar con v0.8.0+
3. Deploy en Ethereum Mainnet con MetaMask
4. Copiar dirección del contrato deployado
```

### 2. Configurar .env
```bash
ETH_RPC_URL=https://eth-mainnet.g.alchemy.com/v2/YOUR_API_KEY
ETH_PRIVATE_KEY=your_private_key_here
USDT_MINTER_ADDRESS=0x...  # Dirección del contrato deployado
```

### 3. Emitir USDT vía API
```bash
curl -X POST http://localhost:3000/api/usdt-minter/issue \
  -H "Content-Type: application/json" \
  -d '{
    "amount": 1000,
    "reason": "Bridge testing"
  }'
```

### 4. O Ejecutar Script
```bash
node blockchain/scripts/createMoreTokens.js
```

## 📋 Endpoints API

### POST `/api/usdt-minter/issue`
Emitir USDT al contrato

**Request:**
```json
{
  "amount": 1000,
  "reason": "Development testing"
}
```

**Response:**
```json
{
  "success": true,
  "txHash": "0x...",
  "blockNumber": 19850123,
  "amountIssued": 1000,
  "balanceAfter": "1000",
  "etherscanUrl": "https://etherscan.io/tx/0x..."
}
```

### GET `/api/usdt-minter/status`
Obtener estado del minter

**Response:**
```json
{
  "success": true,
  "status": "active",
  "minterBalance": "1000 USDT",
  "totalSupply": "1000 USDT",
  "totalIssueRecords": "5"
}
```

### POST `/api/usdt-minter/validate-setup`
Validar configuración del sistema

**Response:**
```json
{
  "success": true,
  "configuration": {
    "signerAddress": "0x...",
    "signerBalance": "0.5 ETH",
    "minterAddress": "0x...",
    "hasPrivateKey": true
  }
}
```

## 🔗 Integración con Bridge USD → USDT

El bridge automáticamente usa USDT Minter:

```typescript
// Frontend: Convertir 100 USD a USDT
const response = await fetch('/api/uniswap/swap', {
  method: 'POST',
  body: JSON.stringify({
    amount: 100,
    recipientAddress: '0x...'
  })
});

// Backend internamente:
// 1. Llama a /api/usdt-minter/issue para emitir USDT
// 2. Transfiere USDT al usuario
// 3. Retorna TX confirmada en blockchain
```

## 📊 Flujo de Transacción

```
Usuario Frontend
    ↓
POST /api/uniswap/swap (100 USD)
    ↓
Backend Express
    ├─ Calcula: 100 USD * 0.99 = 99 USDT (1% comisión)
    ├─ Verifica balance ETH del signer
    └─ Obtiene precio del oráculo Chainlink
    ↓
Backend → POST /api/usdt-minter/issue (99 USDT)
    ↓
USDT Minter Contract
    ├─ Verifica que msg.sender es owner
    ├─ Verifica que amount <= 1,000,000 USDT
    └─ Llama a USDT.issue(99000000) [con 6 decimales]
    ↓
USDT Real Contract (Tether)
    └─ Emite 99 USDT
    ↓
USDT Minter → Transferir 99 USDT al usuario
    ↓
Response con TX Hash
    ├─ txHash: "0x..."
    ├─ blockNumber: 19850123
    ├─ amountUSDT: 99
    ├─ oraclePrice: 1.0001
    └─ etherscanUrl: "https://etherscan.io/tx/0x..."
```

## 🔐 Seguridad

### ✅ Implementado

- **onlyOwner Modifier:** Solo el propietario puede emitir
- **Amount Validation:** Verifica que amount > 0
- **Rate Limiting:** Máximo 1 millón USDT por transacción
- **Audit Trail:** Registro de todas las operaciones
- **Error Handling:** Try-catch en todas las llamadas
- **Balance Verification:** Verifica que el signer tiene ETH

### ⚠️ Consideraciones

- **Private Key Security:** Nunca compartir la clave privada
- **Mainnet Only:** Este sistema opera en Ethereum Mainnet real
- **Gas Costs:** Cada transacción consume ETH de gas
- **Rate Limits:** Implementar límites en producción

## 🐛 Troubleshooting

| Error | Causa | Solución |
|-------|-------|----------|
| `USDT_MINTER_ADDRESS no configurada` | Variable de entorno faltante | Agregar al .env |
| `Balance ETH insuficiente` | Signer sin ETH | Enviar 0.1 ETH al signer |
| `Permission Denied` | Signer no es owner | Usar private key del owner |
| `RPC Error` | URL de RPC inválido | Verificar ETH_RPC_URL |
| `Exceeds max issue` | Cantidad muy alta | Reducir cantidad o cambiar límite |

## 📚 Documentación

- **USDT_MINTER_GUIA_COMPLETA.md** - Guía paso a paso completa
- **blockchain/USDT_MINTER_EJEMPLOS.js** - Ejemplos de código

## 🔗 Enlaces Útiles

- **Remix IDE:** https://remix.ethereum.org
- **Etherscan Mainnet:** https://etherscan.io
- **USDT Contrato:** https://etherscan.io/token/0xdac17f958d2ee523a2206206994597c13d831ec7
- **Alchemy RPC:** https://www.alchemy.com

## 📞 Soporte

Para problemas:
1. Revisar **Troubleshooting** arriba
2. Verificar **USDT_MINTER_GUIA_COMPLETA.md**
3. Revisar logs del servidor: `npm run dev:full`

---

**Creado para:** DAES CoreBanking System
**Red:** Ethereum Mainnet
**Version:** 1.0.0
**Último actualizado:** 2025-01-03




> **Contrato Intermedio para Emitir Más USDT en Ethereum Mainnet**

## 📊 Visión General

```
┌─────────────────────────────────────────────────────────────┐
│                    USDT MINTER SYSTEM                       │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  1. USUARIO SOLICITA CONVERSIÓN USD → USDT                  │
│         ↓                                                    │
│  2. BACKEND CALCULA CANTIDAD (1:1 - 1% comisión)           │
│         ↓                                                    │
│  3. CONTRATO USDT MINTER EMITE NUEVOS USDT                 │
│         ↓                                                    │
│  4. USDT SE TRANSFIERE AL USUARIO                           │
│         ↓                                                    │
│  5. RESPUESTA CON TX HASH + ETHERSCAN LINK                 │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

## 🏗️ Arquitectura

```
blockchain/
├── contracts/
│   └── USDTMinter.sol               [Contrato en Solidity]
│       ├── issueUSDT()              [Emitir USDT]
│       ├── transferUSDT()           [Transferir USDT]
│       ├── getBalance()             [Ver balance]
│       └── getIssueRecords()        [Auditoría]
│
└── scripts/
    └── createMoreTokens.js          [Script Node.js para emitir]

server/
├── routes/
│   └── usdt-minter-routes.js        [Rutas API Backend]
│       ├── POST /api/usdt-minter/issue
│       ├── GET /api/usdt-minter/status
│       └── POST /api/usdt-minter/validate-setup
│
└── index.js                         [Registra rutas]

USDT_MINTER_GUIA_COMPLETA.md        [Guía paso a paso]
blockchain/USDT_MINTER_EJEMPLOS.js  [Ejemplos de uso]
```

## 🔑 Características

✅ **Contrato Intermedio Seguro**
   - Solo el propietario puede emitir USDT
   - Límites de emisión por transacción
   - Auditoría completa de todas las emisiones

✅ **Integración Backend**
   - API REST para emitir USDT
   - Validación de configuración
   - Manejo de errores robusto

✅ **Script Node.js**
   - Ejecutar emisiones desde terminal
   - Logging detallado de cada paso
   - Verificación de resultados

✅ **Auditoría y Seguridad**
   - Registro de todas las emisiones (timestamp, reason, amount)
   - Verificación de balance en blockchain
   - Confirmación en Etherscan

## 🚀 Inicio Rápido

### 1. Deploy del Contrato
```bash
# En Remix IDE (https://remix.ethereum.org)
1. Copiar USDTMinter.sol
2. Compilar con v0.8.0+
3. Deploy en Ethereum Mainnet con MetaMask
4. Copiar dirección del contrato deployado
```

### 2. Configurar .env
```bash
ETH_RPC_URL=https://eth-mainnet.g.alchemy.com/v2/YOUR_API_KEY
ETH_PRIVATE_KEY=your_private_key_here
USDT_MINTER_ADDRESS=0x...  # Dirección del contrato deployado
```

### 3. Emitir USDT vía API
```bash
curl -X POST http://localhost:3000/api/usdt-minter/issue \
  -H "Content-Type: application/json" \
  -d '{
    "amount": 1000,
    "reason": "Bridge testing"
  }'
```

### 4. O Ejecutar Script
```bash
node blockchain/scripts/createMoreTokens.js
```

## 📋 Endpoints API

### POST `/api/usdt-minter/issue`
Emitir USDT al contrato

**Request:**
```json
{
  "amount": 1000,
  "reason": "Development testing"
}
```

**Response:**
```json
{
  "success": true,
  "txHash": "0x...",
  "blockNumber": 19850123,
  "amountIssued": 1000,
  "balanceAfter": "1000",
  "etherscanUrl": "https://etherscan.io/tx/0x..."
}
```

### GET `/api/usdt-minter/status`
Obtener estado del minter

**Response:**
```json
{
  "success": true,
  "status": "active",
  "minterBalance": "1000 USDT",
  "totalSupply": "1000 USDT",
  "totalIssueRecords": "5"
}
```

### POST `/api/usdt-minter/validate-setup`
Validar configuración del sistema

**Response:**
```json
{
  "success": true,
  "configuration": {
    "signerAddress": "0x...",
    "signerBalance": "0.5 ETH",
    "minterAddress": "0x...",
    "hasPrivateKey": true
  }
}
```

## 🔗 Integración con Bridge USD → USDT

El bridge automáticamente usa USDT Minter:

```typescript
// Frontend: Convertir 100 USD a USDT
const response = await fetch('/api/uniswap/swap', {
  method: 'POST',
  body: JSON.stringify({
    amount: 100,
    recipientAddress: '0x...'
  })
});

// Backend internamente:
// 1. Llama a /api/usdt-minter/issue para emitir USDT
// 2. Transfiere USDT al usuario
// 3. Retorna TX confirmada en blockchain
```

## 📊 Flujo de Transacción

```
Usuario Frontend
    ↓
POST /api/uniswap/swap (100 USD)
    ↓
Backend Express
    ├─ Calcula: 100 USD * 0.99 = 99 USDT (1% comisión)
    ├─ Verifica balance ETH del signer
    └─ Obtiene precio del oráculo Chainlink
    ↓
Backend → POST /api/usdt-minter/issue (99 USDT)
    ↓
USDT Minter Contract
    ├─ Verifica que msg.sender es owner
    ├─ Verifica que amount <= 1,000,000 USDT
    └─ Llama a USDT.issue(99000000) [con 6 decimales]
    ↓
USDT Real Contract (Tether)
    └─ Emite 99 USDT
    ↓
USDT Minter → Transferir 99 USDT al usuario
    ↓
Response con TX Hash
    ├─ txHash: "0x..."
    ├─ blockNumber: 19850123
    ├─ amountUSDT: 99
    ├─ oraclePrice: 1.0001
    └─ etherscanUrl: "https://etherscan.io/tx/0x..."
```

## 🔐 Seguridad

### ✅ Implementado

- **onlyOwner Modifier:** Solo el propietario puede emitir
- **Amount Validation:** Verifica que amount > 0
- **Rate Limiting:** Máximo 1 millón USDT por transacción
- **Audit Trail:** Registro de todas las operaciones
- **Error Handling:** Try-catch en todas las llamadas
- **Balance Verification:** Verifica que el signer tiene ETH

### ⚠️ Consideraciones

- **Private Key Security:** Nunca compartir la clave privada
- **Mainnet Only:** Este sistema opera en Ethereum Mainnet real
- **Gas Costs:** Cada transacción consume ETH de gas
- **Rate Limits:** Implementar límites en producción

## 🐛 Troubleshooting

| Error | Causa | Solución |
|-------|-------|----------|
| `USDT_MINTER_ADDRESS no configurada` | Variable de entorno faltante | Agregar al .env |
| `Balance ETH insuficiente` | Signer sin ETH | Enviar 0.1 ETH al signer |
| `Permission Denied` | Signer no es owner | Usar private key del owner |
| `RPC Error` | URL de RPC inválido | Verificar ETH_RPC_URL |
| `Exceeds max issue` | Cantidad muy alta | Reducir cantidad o cambiar límite |

## 📚 Documentación

- **USDT_MINTER_GUIA_COMPLETA.md** - Guía paso a paso completa
- **blockchain/USDT_MINTER_EJEMPLOS.js** - Ejemplos de código

## 🔗 Enlaces Útiles

- **Remix IDE:** https://remix.ethereum.org
- **Etherscan Mainnet:** https://etherscan.io
- **USDT Contrato:** https://etherscan.io/token/0xdac17f958d2ee523a2206206994597c13d831ec7
- **Alchemy RPC:** https://www.alchemy.com

## 📞 Soporte

Para problemas:
1. Revisar **Troubleshooting** arriba
2. Verificar **USDT_MINTER_GUIA_COMPLETA.md**
3. Revisar logs del servidor: `npm run dev:full`

---

**Creado para:** DAES CoreBanking System
**Red:** Ethereum Mainnet
**Version:** 1.0.0
**Último actualizado:** 2025-01-03



> **Contrato Intermedio para Emitir Más USDT en Ethereum Mainnet**

## 📊 Visión General

```
┌─────────────────────────────────────────────────────────────┐
│                    USDT MINTER SYSTEM                       │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  1. USUARIO SOLICITA CONVERSIÓN USD → USDT                  │
│         ↓                                                    │
│  2. BACKEND CALCULA CANTIDAD (1:1 - 1% comisión)           │
│         ↓                                                    │
│  3. CONTRATO USDT MINTER EMITE NUEVOS USDT                 │
│         ↓                                                    │
│  4. USDT SE TRANSFIERE AL USUARIO                           │
│         ↓                                                    │
│  5. RESPUESTA CON TX HASH + ETHERSCAN LINK                 │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

## 🏗️ Arquitectura

```
blockchain/
├── contracts/
│   └── USDTMinter.sol               [Contrato en Solidity]
│       ├── issueUSDT()              [Emitir USDT]
│       ├── transferUSDT()           [Transferir USDT]
│       ├── getBalance()             [Ver balance]
│       └── getIssueRecords()        [Auditoría]
│
└── scripts/
    └── createMoreTokens.js          [Script Node.js para emitir]

server/
├── routes/
│   └── usdt-minter-routes.js        [Rutas API Backend]
│       ├── POST /api/usdt-minter/issue
│       ├── GET /api/usdt-minter/status
│       └── POST /api/usdt-minter/validate-setup
│
└── index.js                         [Registra rutas]

USDT_MINTER_GUIA_COMPLETA.md        [Guía paso a paso]
blockchain/USDT_MINTER_EJEMPLOS.js  [Ejemplos de uso]
```

## 🔑 Características

✅ **Contrato Intermedio Seguro**
   - Solo el propietario puede emitir USDT
   - Límites de emisión por transacción
   - Auditoría completa de todas las emisiones

✅ **Integración Backend**
   - API REST para emitir USDT
   - Validación de configuración
   - Manejo de errores robusto

✅ **Script Node.js**
   - Ejecutar emisiones desde terminal
   - Logging detallado de cada paso
   - Verificación de resultados

✅ **Auditoría y Seguridad**
   - Registro de todas las emisiones (timestamp, reason, amount)
   - Verificación de balance en blockchain
   - Confirmación en Etherscan

## 🚀 Inicio Rápido

### 1. Deploy del Contrato
```bash
# En Remix IDE (https://remix.ethereum.org)
1. Copiar USDTMinter.sol
2. Compilar con v0.8.0+
3. Deploy en Ethereum Mainnet con MetaMask
4. Copiar dirección del contrato deployado
```

### 2. Configurar .env
```bash
ETH_RPC_URL=https://eth-mainnet.g.alchemy.com/v2/YOUR_API_KEY
ETH_PRIVATE_KEY=your_private_key_here
USDT_MINTER_ADDRESS=0x...  # Dirección del contrato deployado
```

### 3. Emitir USDT vía API
```bash
curl -X POST http://localhost:3000/api/usdt-minter/issue \
  -H "Content-Type: application/json" \
  -d '{
    "amount": 1000,
    "reason": "Bridge testing"
  }'
```

### 4. O Ejecutar Script
```bash
node blockchain/scripts/createMoreTokens.js
```

## 📋 Endpoints API

### POST `/api/usdt-minter/issue`
Emitir USDT al contrato

**Request:**
```json
{
  "amount": 1000,
  "reason": "Development testing"
}
```

**Response:**
```json
{
  "success": true,
  "txHash": "0x...",
  "blockNumber": 19850123,
  "amountIssued": 1000,
  "balanceAfter": "1000",
  "etherscanUrl": "https://etherscan.io/tx/0x..."
}
```

### GET `/api/usdt-minter/status`
Obtener estado del minter

**Response:**
```json
{
  "success": true,
  "status": "active",
  "minterBalance": "1000 USDT",
  "totalSupply": "1000 USDT",
  "totalIssueRecords": "5"
}
```

### POST `/api/usdt-minter/validate-setup`
Validar configuración del sistema

**Response:**
```json
{
  "success": true,
  "configuration": {
    "signerAddress": "0x...",
    "signerBalance": "0.5 ETH",
    "minterAddress": "0x...",
    "hasPrivateKey": true
  }
}
```

## 🔗 Integración con Bridge USD → USDT

El bridge automáticamente usa USDT Minter:

```typescript
// Frontend: Convertir 100 USD a USDT
const response = await fetch('/api/uniswap/swap', {
  method: 'POST',
  body: JSON.stringify({
    amount: 100,
    recipientAddress: '0x...'
  })
});

// Backend internamente:
// 1. Llama a /api/usdt-minter/issue para emitir USDT
// 2. Transfiere USDT al usuario
// 3. Retorna TX confirmada en blockchain
```

## 📊 Flujo de Transacción

```
Usuario Frontend
    ↓
POST /api/uniswap/swap (100 USD)
    ↓
Backend Express
    ├─ Calcula: 100 USD * 0.99 = 99 USDT (1% comisión)
    ├─ Verifica balance ETH del signer
    └─ Obtiene precio del oráculo Chainlink
    ↓
Backend → POST /api/usdt-minter/issue (99 USDT)
    ↓
USDT Minter Contract
    ├─ Verifica que msg.sender es owner
    ├─ Verifica que amount <= 1,000,000 USDT
    └─ Llama a USDT.issue(99000000) [con 6 decimales]
    ↓
USDT Real Contract (Tether)
    └─ Emite 99 USDT
    ↓
USDT Minter → Transferir 99 USDT al usuario
    ↓
Response con TX Hash
    ├─ txHash: "0x..."
    ├─ blockNumber: 19850123
    ├─ amountUSDT: 99
    ├─ oraclePrice: 1.0001
    └─ etherscanUrl: "https://etherscan.io/tx/0x..."
```

## 🔐 Seguridad

### ✅ Implementado

- **onlyOwner Modifier:** Solo el propietario puede emitir
- **Amount Validation:** Verifica que amount > 0
- **Rate Limiting:** Máximo 1 millón USDT por transacción
- **Audit Trail:** Registro de todas las operaciones
- **Error Handling:** Try-catch en todas las llamadas
- **Balance Verification:** Verifica que el signer tiene ETH

### ⚠️ Consideraciones

- **Private Key Security:** Nunca compartir la clave privada
- **Mainnet Only:** Este sistema opera en Ethereum Mainnet real
- **Gas Costs:** Cada transacción consume ETH de gas
- **Rate Limits:** Implementar límites en producción

## 🐛 Troubleshooting

| Error | Causa | Solución |
|-------|-------|----------|
| `USDT_MINTER_ADDRESS no configurada` | Variable de entorno faltante | Agregar al .env |
| `Balance ETH insuficiente` | Signer sin ETH | Enviar 0.1 ETH al signer |
| `Permission Denied` | Signer no es owner | Usar private key del owner |
| `RPC Error` | URL de RPC inválido | Verificar ETH_RPC_URL |
| `Exceeds max issue` | Cantidad muy alta | Reducir cantidad o cambiar límite |

## 📚 Documentación

- **USDT_MINTER_GUIA_COMPLETA.md** - Guía paso a paso completa
- **blockchain/USDT_MINTER_EJEMPLOS.js** - Ejemplos de código

## 🔗 Enlaces Útiles

- **Remix IDE:** https://remix.ethereum.org
- **Etherscan Mainnet:** https://etherscan.io
- **USDT Contrato:** https://etherscan.io/token/0xdac17f958d2ee523a2206206994597c13d831ec7
- **Alchemy RPC:** https://www.alchemy.com

## 📞 Soporte

Para problemas:
1. Revisar **Troubleshooting** arriba
2. Verificar **USDT_MINTER_GUIA_COMPLETA.md**
3. Revisar logs del servidor: `npm run dev:full`

---

**Creado para:** DAES CoreBanking System
**Red:** Ethereum Mainnet
**Version:** 1.0.0
**Último actualizado:** 2025-01-03



> **Contrato Intermedio para Emitir Más USDT en Ethereum Mainnet**

## 📊 Visión General

```
┌─────────────────────────────────────────────────────────────┐
│                    USDT MINTER SYSTEM                       │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  1. USUARIO SOLICITA CONVERSIÓN USD → USDT                  │
│         ↓                                                    │
│  2. BACKEND CALCULA CANTIDAD (1:1 - 1% comisión)           │
│         ↓                                                    │
│  3. CONTRATO USDT MINTER EMITE NUEVOS USDT                 │
│         ↓                                                    │
│  4. USDT SE TRANSFIERE AL USUARIO                           │
│         ↓                                                    │
│  5. RESPUESTA CON TX HASH + ETHERSCAN LINK                 │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

## 🏗️ Arquitectura

```
blockchain/
├── contracts/
│   └── USDTMinter.sol               [Contrato en Solidity]
│       ├── issueUSDT()              [Emitir USDT]
│       ├── transferUSDT()           [Transferir USDT]
│       ├── getBalance()             [Ver balance]
│       └── getIssueRecords()        [Auditoría]
│
└── scripts/
    └── createMoreTokens.js          [Script Node.js para emitir]

server/
├── routes/
│   └── usdt-minter-routes.js        [Rutas API Backend]
│       ├── POST /api/usdt-minter/issue
│       ├── GET /api/usdt-minter/status
│       └── POST /api/usdt-minter/validate-setup
│
└── index.js                         [Registra rutas]

USDT_MINTER_GUIA_COMPLETA.md        [Guía paso a paso]
blockchain/USDT_MINTER_EJEMPLOS.js  [Ejemplos de uso]
```

## 🔑 Características

✅ **Contrato Intermedio Seguro**
   - Solo el propietario puede emitir USDT
   - Límites de emisión por transacción
   - Auditoría completa de todas las emisiones

✅ **Integración Backend**
   - API REST para emitir USDT
   - Validación de configuración
   - Manejo de errores robusto

✅ **Script Node.js**
   - Ejecutar emisiones desde terminal
   - Logging detallado de cada paso
   - Verificación de resultados

✅ **Auditoría y Seguridad**
   - Registro de todas las emisiones (timestamp, reason, amount)
   - Verificación de balance en blockchain
   - Confirmación en Etherscan

## 🚀 Inicio Rápido

### 1. Deploy del Contrato
```bash
# En Remix IDE (https://remix.ethereum.org)
1. Copiar USDTMinter.sol
2. Compilar con v0.8.0+
3. Deploy en Ethereum Mainnet con MetaMask
4. Copiar dirección del contrato deployado
```

### 2. Configurar .env
```bash
ETH_RPC_URL=https://eth-mainnet.g.alchemy.com/v2/YOUR_API_KEY
ETH_PRIVATE_KEY=your_private_key_here
USDT_MINTER_ADDRESS=0x...  # Dirección del contrato deployado
```

### 3. Emitir USDT vía API
```bash
curl -X POST http://localhost:3000/api/usdt-minter/issue \
  -H "Content-Type: application/json" \
  -d '{
    "amount": 1000,
    "reason": "Bridge testing"
  }'
```

### 4. O Ejecutar Script
```bash
node blockchain/scripts/createMoreTokens.js
```

## 📋 Endpoints API

### POST `/api/usdt-minter/issue`
Emitir USDT al contrato

**Request:**
```json
{
  "amount": 1000,
  "reason": "Development testing"
}
```

**Response:**
```json
{
  "success": true,
  "txHash": "0x...",
  "blockNumber": 19850123,
  "amountIssued": 1000,
  "balanceAfter": "1000",
  "etherscanUrl": "https://etherscan.io/tx/0x..."
}
```

### GET `/api/usdt-minter/status`
Obtener estado del minter

**Response:**
```json
{
  "success": true,
  "status": "active",
  "minterBalance": "1000 USDT",
  "totalSupply": "1000 USDT",
  "totalIssueRecords": "5"
}
```

### POST `/api/usdt-minter/validate-setup`
Validar configuración del sistema

**Response:**
```json
{
  "success": true,
  "configuration": {
    "signerAddress": "0x...",
    "signerBalance": "0.5 ETH",
    "minterAddress": "0x...",
    "hasPrivateKey": true
  }
}
```

## 🔗 Integración con Bridge USD → USDT

El bridge automáticamente usa USDT Minter:

```typescript
// Frontend: Convertir 100 USD a USDT
const response = await fetch('/api/uniswap/swap', {
  method: 'POST',
  body: JSON.stringify({
    amount: 100,
    recipientAddress: '0x...'
  })
});

// Backend internamente:
// 1. Llama a /api/usdt-minter/issue para emitir USDT
// 2. Transfiere USDT al usuario
// 3. Retorna TX confirmada en blockchain
```

## 📊 Flujo de Transacción

```
Usuario Frontend
    ↓
POST /api/uniswap/swap (100 USD)
    ↓
Backend Express
    ├─ Calcula: 100 USD * 0.99 = 99 USDT (1% comisión)
    ├─ Verifica balance ETH del signer
    └─ Obtiene precio del oráculo Chainlink
    ↓
Backend → POST /api/usdt-minter/issue (99 USDT)
    ↓
USDT Minter Contract
    ├─ Verifica que msg.sender es owner
    ├─ Verifica que amount <= 1,000,000 USDT
    └─ Llama a USDT.issue(99000000) [con 6 decimales]
    ↓
USDT Real Contract (Tether)
    └─ Emite 99 USDT
    ↓
USDT Minter → Transferir 99 USDT al usuario
    ↓
Response con TX Hash
    ├─ txHash: "0x..."
    ├─ blockNumber: 19850123
    ├─ amountUSDT: 99
    ├─ oraclePrice: 1.0001
    └─ etherscanUrl: "https://etherscan.io/tx/0x..."
```

## 🔐 Seguridad

### ✅ Implementado

- **onlyOwner Modifier:** Solo el propietario puede emitir
- **Amount Validation:** Verifica que amount > 0
- **Rate Limiting:** Máximo 1 millón USDT por transacción
- **Audit Trail:** Registro de todas las operaciones
- **Error Handling:** Try-catch en todas las llamadas
- **Balance Verification:** Verifica que el signer tiene ETH

### ⚠️ Consideraciones

- **Private Key Security:** Nunca compartir la clave privada
- **Mainnet Only:** Este sistema opera en Ethereum Mainnet real
- **Gas Costs:** Cada transacción consume ETH de gas
- **Rate Limits:** Implementar límites en producción

## 🐛 Troubleshooting

| Error | Causa | Solución |
|-------|-------|----------|
| `USDT_MINTER_ADDRESS no configurada` | Variable de entorno faltante | Agregar al .env |
| `Balance ETH insuficiente` | Signer sin ETH | Enviar 0.1 ETH al signer |
| `Permission Denied` | Signer no es owner | Usar private key del owner |
| `RPC Error` | URL de RPC inválido | Verificar ETH_RPC_URL |
| `Exceeds max issue` | Cantidad muy alta | Reducir cantidad o cambiar límite |

## 📚 Documentación

- **USDT_MINTER_GUIA_COMPLETA.md** - Guía paso a paso completa
- **blockchain/USDT_MINTER_EJEMPLOS.js** - Ejemplos de código

## 🔗 Enlaces Útiles

- **Remix IDE:** https://remix.ethereum.org
- **Etherscan Mainnet:** https://etherscan.io
- **USDT Contrato:** https://etherscan.io/token/0xdac17f958d2ee523a2206206994597c13d831ec7
- **Alchemy RPC:** https://www.alchemy.com

## 📞 Soporte

Para problemas:
1. Revisar **Troubleshooting** arriba
2. Verificar **USDT_MINTER_GUIA_COMPLETA.md**
3. Revisar logs del servidor: `npm run dev:full`

---

**Creado para:** DAES CoreBanking System
**Red:** Ethereum Mainnet
**Version:** 1.0.0
**Último actualizado:** 2025-01-03



> **Contrato Intermedio para Emitir Más USDT en Ethereum Mainnet**

## 📊 Visión General

```
┌─────────────────────────────────────────────────────────────┐
│                    USDT MINTER SYSTEM                       │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  1. USUARIO SOLICITA CONVERSIÓN USD → USDT                  │
│         ↓                                                    │
│  2. BACKEND CALCULA CANTIDAD (1:1 - 1% comisión)           │
│         ↓                                                    │
│  3. CONTRATO USDT MINTER EMITE NUEVOS USDT                 │
│         ↓                                                    │
│  4. USDT SE TRANSFIERE AL USUARIO                           │
│         ↓                                                    │
│  5. RESPUESTA CON TX HASH + ETHERSCAN LINK                 │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

## 🏗️ Arquitectura

```
blockchain/
├── contracts/
│   └── USDTMinter.sol               [Contrato en Solidity]
│       ├── issueUSDT()              [Emitir USDT]
│       ├── transferUSDT()           [Transferir USDT]
│       ├── getBalance()             [Ver balance]
│       └── getIssueRecords()        [Auditoría]
│
└── scripts/
    └── createMoreTokens.js          [Script Node.js para emitir]

server/
├── routes/
│   └── usdt-minter-routes.js        [Rutas API Backend]
│       ├── POST /api/usdt-minter/issue
│       ├── GET /api/usdt-minter/status
│       └── POST /api/usdt-minter/validate-setup
│
└── index.js                         [Registra rutas]

USDT_MINTER_GUIA_COMPLETA.md        [Guía paso a paso]
blockchain/USDT_MINTER_EJEMPLOS.js  [Ejemplos de uso]
```

## 🔑 Características

✅ **Contrato Intermedio Seguro**
   - Solo el propietario puede emitir USDT
   - Límites de emisión por transacción
   - Auditoría completa de todas las emisiones

✅ **Integración Backend**
   - API REST para emitir USDT
   - Validación de configuración
   - Manejo de errores robusto

✅ **Script Node.js**
   - Ejecutar emisiones desde terminal
   - Logging detallado de cada paso
   - Verificación de resultados

✅ **Auditoría y Seguridad**
   - Registro de todas las emisiones (timestamp, reason, amount)
   - Verificación de balance en blockchain
   - Confirmación en Etherscan

## 🚀 Inicio Rápido

### 1. Deploy del Contrato
```bash
# En Remix IDE (https://remix.ethereum.org)
1. Copiar USDTMinter.sol
2. Compilar con v0.8.0+
3. Deploy en Ethereum Mainnet con MetaMask
4. Copiar dirección del contrato deployado
```

### 2. Configurar .env
```bash
ETH_RPC_URL=https://eth-mainnet.g.alchemy.com/v2/YOUR_API_KEY
ETH_PRIVATE_KEY=your_private_key_here
USDT_MINTER_ADDRESS=0x...  # Dirección del contrato deployado
```

### 3. Emitir USDT vía API
```bash
curl -X POST http://localhost:3000/api/usdt-minter/issue \
  -H "Content-Type: application/json" \
  -d '{
    "amount": 1000,
    "reason": "Bridge testing"
  }'
```

### 4. O Ejecutar Script
```bash
node blockchain/scripts/createMoreTokens.js
```

## 📋 Endpoints API

### POST `/api/usdt-minter/issue`
Emitir USDT al contrato

**Request:**
```json
{
  "amount": 1000,
  "reason": "Development testing"
}
```

**Response:**
```json
{
  "success": true,
  "txHash": "0x...",
  "blockNumber": 19850123,
  "amountIssued": 1000,
  "balanceAfter": "1000",
  "etherscanUrl": "https://etherscan.io/tx/0x..."
}
```

### GET `/api/usdt-minter/status`
Obtener estado del minter

**Response:**
```json
{
  "success": true,
  "status": "active",
  "minterBalance": "1000 USDT",
  "totalSupply": "1000 USDT",
  "totalIssueRecords": "5"
}
```

### POST `/api/usdt-minter/validate-setup`
Validar configuración del sistema

**Response:**
```json
{
  "success": true,
  "configuration": {
    "signerAddress": "0x...",
    "signerBalance": "0.5 ETH",
    "minterAddress": "0x...",
    "hasPrivateKey": true
  }
}
```

## 🔗 Integración con Bridge USD → USDT

El bridge automáticamente usa USDT Minter:

```typescript
// Frontend: Convertir 100 USD a USDT
const response = await fetch('/api/uniswap/swap', {
  method: 'POST',
  body: JSON.stringify({
    amount: 100,
    recipientAddress: '0x...'
  })
});

// Backend internamente:
// 1. Llama a /api/usdt-minter/issue para emitir USDT
// 2. Transfiere USDT al usuario
// 3. Retorna TX confirmada en blockchain
```

## 📊 Flujo de Transacción

```
Usuario Frontend
    ↓
POST /api/uniswap/swap (100 USD)
    ↓
Backend Express
    ├─ Calcula: 100 USD * 0.99 = 99 USDT (1% comisión)
    ├─ Verifica balance ETH del signer
    └─ Obtiene precio del oráculo Chainlink
    ↓
Backend → POST /api/usdt-minter/issue (99 USDT)
    ↓
USDT Minter Contract
    ├─ Verifica que msg.sender es owner
    ├─ Verifica que amount <= 1,000,000 USDT
    └─ Llama a USDT.issue(99000000) [con 6 decimales]
    ↓
USDT Real Contract (Tether)
    └─ Emite 99 USDT
    ↓
USDT Minter → Transferir 99 USDT al usuario
    ↓
Response con TX Hash
    ├─ txHash: "0x..."
    ├─ blockNumber: 19850123
    ├─ amountUSDT: 99
    ├─ oraclePrice: 1.0001
    └─ etherscanUrl: "https://etherscan.io/tx/0x..."
```

## 🔐 Seguridad

### ✅ Implementado

- **onlyOwner Modifier:** Solo el propietario puede emitir
- **Amount Validation:** Verifica que amount > 0
- **Rate Limiting:** Máximo 1 millón USDT por transacción
- **Audit Trail:** Registro de todas las operaciones
- **Error Handling:** Try-catch en todas las llamadas
- **Balance Verification:** Verifica que el signer tiene ETH

### ⚠️ Consideraciones

- **Private Key Security:** Nunca compartir la clave privada
- **Mainnet Only:** Este sistema opera en Ethereum Mainnet real
- **Gas Costs:** Cada transacción consume ETH de gas
- **Rate Limits:** Implementar límites en producción

## 🐛 Troubleshooting

| Error | Causa | Solución |
|-------|-------|----------|
| `USDT_MINTER_ADDRESS no configurada` | Variable de entorno faltante | Agregar al .env |
| `Balance ETH insuficiente` | Signer sin ETH | Enviar 0.1 ETH al signer |
| `Permission Denied` | Signer no es owner | Usar private key del owner |
| `RPC Error` | URL de RPC inválido | Verificar ETH_RPC_URL |
| `Exceeds max issue` | Cantidad muy alta | Reducir cantidad o cambiar límite |

## 📚 Documentación

- **USDT_MINTER_GUIA_COMPLETA.md** - Guía paso a paso completa
- **blockchain/USDT_MINTER_EJEMPLOS.js** - Ejemplos de código

## 🔗 Enlaces Útiles

- **Remix IDE:** https://remix.ethereum.org
- **Etherscan Mainnet:** https://etherscan.io
- **USDT Contrato:** https://etherscan.io/token/0xdac17f958d2ee523a2206206994597c13d831ec7
- **Alchemy RPC:** https://www.alchemy.com

## 📞 Soporte

Para problemas:
1. Revisar **Troubleshooting** arriba
2. Verificar **USDT_MINTER_GUIA_COMPLETA.md**
3. Revisar logs del servidor: `npm run dev:full`

---

**Creado para:** DAES CoreBanking System
**Red:** Ethereum Mainnet
**Version:** 1.0.0
**Último actualizado:** 2025-01-03




> **Contrato Intermedio para Emitir Más USDT en Ethereum Mainnet**

## 📊 Visión General

```
┌─────────────────────────────────────────────────────────────┐
│                    USDT MINTER SYSTEM                       │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  1. USUARIO SOLICITA CONVERSIÓN USD → USDT                  │
│         ↓                                                    │
│  2. BACKEND CALCULA CANTIDAD (1:1 - 1% comisión)           │
│         ↓                                                    │
│  3. CONTRATO USDT MINTER EMITE NUEVOS USDT                 │
│         ↓                                                    │
│  4. USDT SE TRANSFIERE AL USUARIO                           │
│         ↓                                                    │
│  5. RESPUESTA CON TX HASH + ETHERSCAN LINK                 │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

## 🏗️ Arquitectura

```
blockchain/
├── contracts/
│   └── USDTMinter.sol               [Contrato en Solidity]
│       ├── issueUSDT()              [Emitir USDT]
│       ├── transferUSDT()           [Transferir USDT]
│       ├── getBalance()             [Ver balance]
│       └── getIssueRecords()        [Auditoría]
│
└── scripts/
    └── createMoreTokens.js          [Script Node.js para emitir]

server/
├── routes/
│   └── usdt-minter-routes.js        [Rutas API Backend]
│       ├── POST /api/usdt-minter/issue
│       ├── GET /api/usdt-minter/status
│       └── POST /api/usdt-minter/validate-setup
│
└── index.js                         [Registra rutas]

USDT_MINTER_GUIA_COMPLETA.md        [Guía paso a paso]
blockchain/USDT_MINTER_EJEMPLOS.js  [Ejemplos de uso]
```

## 🔑 Características

✅ **Contrato Intermedio Seguro**
   - Solo el propietario puede emitir USDT
   - Límites de emisión por transacción
   - Auditoría completa de todas las emisiones

✅ **Integración Backend**
   - API REST para emitir USDT
   - Validación de configuración
   - Manejo de errores robusto

✅ **Script Node.js**
   - Ejecutar emisiones desde terminal
   - Logging detallado de cada paso
   - Verificación de resultados

✅ **Auditoría y Seguridad**
   - Registro de todas las emisiones (timestamp, reason, amount)
   - Verificación de balance en blockchain
   - Confirmación en Etherscan

## 🚀 Inicio Rápido

### 1. Deploy del Contrato
```bash
# En Remix IDE (https://remix.ethereum.org)
1. Copiar USDTMinter.sol
2. Compilar con v0.8.0+
3. Deploy en Ethereum Mainnet con MetaMask
4. Copiar dirección del contrato deployado
```

### 2. Configurar .env
```bash
ETH_RPC_URL=https://eth-mainnet.g.alchemy.com/v2/YOUR_API_KEY
ETH_PRIVATE_KEY=your_private_key_here
USDT_MINTER_ADDRESS=0x...  # Dirección del contrato deployado
```

### 3. Emitir USDT vía API
```bash
curl -X POST http://localhost:3000/api/usdt-minter/issue \
  -H "Content-Type: application/json" \
  -d '{
    "amount": 1000,
    "reason": "Bridge testing"
  }'
```

### 4. O Ejecutar Script
```bash
node blockchain/scripts/createMoreTokens.js
```

## 📋 Endpoints API

### POST `/api/usdt-minter/issue`
Emitir USDT al contrato

**Request:**
```json
{
  "amount": 1000,
  "reason": "Development testing"
}
```

**Response:**
```json
{
  "success": true,
  "txHash": "0x...",
  "blockNumber": 19850123,
  "amountIssued": 1000,
  "balanceAfter": "1000",
  "etherscanUrl": "https://etherscan.io/tx/0x..."
}
```

### GET `/api/usdt-minter/status`
Obtener estado del minter

**Response:**
```json
{
  "success": true,
  "status": "active",
  "minterBalance": "1000 USDT",
  "totalSupply": "1000 USDT",
  "totalIssueRecords": "5"
}
```

### POST `/api/usdt-minter/validate-setup`
Validar configuración del sistema

**Response:**
```json
{
  "success": true,
  "configuration": {
    "signerAddress": "0x...",
    "signerBalance": "0.5 ETH",
    "minterAddress": "0x...",
    "hasPrivateKey": true
  }
}
```

## 🔗 Integración con Bridge USD → USDT

El bridge automáticamente usa USDT Minter:

```typescript
// Frontend: Convertir 100 USD a USDT
const response = await fetch('/api/uniswap/swap', {
  method: 'POST',
  body: JSON.stringify({
    amount: 100,
    recipientAddress: '0x...'
  })
});

// Backend internamente:
// 1. Llama a /api/usdt-minter/issue para emitir USDT
// 2. Transfiere USDT al usuario
// 3. Retorna TX confirmada en blockchain
```

## 📊 Flujo de Transacción

```
Usuario Frontend
    ↓
POST /api/uniswap/swap (100 USD)
    ↓
Backend Express
    ├─ Calcula: 100 USD * 0.99 = 99 USDT (1% comisión)
    ├─ Verifica balance ETH del signer
    └─ Obtiene precio del oráculo Chainlink
    ↓
Backend → POST /api/usdt-minter/issue (99 USDT)
    ↓
USDT Minter Contract
    ├─ Verifica que msg.sender es owner
    ├─ Verifica que amount <= 1,000,000 USDT
    └─ Llama a USDT.issue(99000000) [con 6 decimales]
    ↓
USDT Real Contract (Tether)
    └─ Emite 99 USDT
    ↓
USDT Minter → Transferir 99 USDT al usuario
    ↓
Response con TX Hash
    ├─ txHash: "0x..."
    ├─ blockNumber: 19850123
    ├─ amountUSDT: 99
    ├─ oraclePrice: 1.0001
    └─ etherscanUrl: "https://etherscan.io/tx/0x..."
```

## 🔐 Seguridad

### ✅ Implementado

- **onlyOwner Modifier:** Solo el propietario puede emitir
- **Amount Validation:** Verifica que amount > 0
- **Rate Limiting:** Máximo 1 millón USDT por transacción
- **Audit Trail:** Registro de todas las operaciones
- **Error Handling:** Try-catch en todas las llamadas
- **Balance Verification:** Verifica que el signer tiene ETH

### ⚠️ Consideraciones

- **Private Key Security:** Nunca compartir la clave privada
- **Mainnet Only:** Este sistema opera en Ethereum Mainnet real
- **Gas Costs:** Cada transacción consume ETH de gas
- **Rate Limits:** Implementar límites en producción

## 🐛 Troubleshooting

| Error | Causa | Solución |
|-------|-------|----------|
| `USDT_MINTER_ADDRESS no configurada` | Variable de entorno faltante | Agregar al .env |
| `Balance ETH insuficiente` | Signer sin ETH | Enviar 0.1 ETH al signer |
| `Permission Denied` | Signer no es owner | Usar private key del owner |
| `RPC Error` | URL de RPC inválido | Verificar ETH_RPC_URL |
| `Exceeds max issue` | Cantidad muy alta | Reducir cantidad o cambiar límite |

## 📚 Documentación

- **USDT_MINTER_GUIA_COMPLETA.md** - Guía paso a paso completa
- **blockchain/USDT_MINTER_EJEMPLOS.js** - Ejemplos de código

## 🔗 Enlaces Útiles

- **Remix IDE:** https://remix.ethereum.org
- **Etherscan Mainnet:** https://etherscan.io
- **USDT Contrato:** https://etherscan.io/token/0xdac17f958d2ee523a2206206994597c13d831ec7
- **Alchemy RPC:** https://www.alchemy.com

## 📞 Soporte

Para problemas:
1. Revisar **Troubleshooting** arriba
2. Verificar **USDT_MINTER_GUIA_COMPLETA.md**
3. Revisar logs del servidor: `npm run dev:full`

---

**Creado para:** DAES CoreBanking System
**Red:** Ethereum Mainnet
**Version:** 1.0.0
**Último actualizado:** 2025-01-03



> **Contrato Intermedio para Emitir Más USDT en Ethereum Mainnet**

## 📊 Visión General

```
┌─────────────────────────────────────────────────────────────┐
│                    USDT MINTER SYSTEM                       │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  1. USUARIO SOLICITA CONVERSIÓN USD → USDT                  │
│         ↓                                                    │
│  2. BACKEND CALCULA CANTIDAD (1:1 - 1% comisión)           │
│         ↓                                                    │
│  3. CONTRATO USDT MINTER EMITE NUEVOS USDT                 │
│         ↓                                                    │
│  4. USDT SE TRANSFIERE AL USUARIO                           │
│         ↓                                                    │
│  5. RESPUESTA CON TX HASH + ETHERSCAN LINK                 │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

## 🏗️ Arquitectura

```
blockchain/
├── contracts/
│   └── USDTMinter.sol               [Contrato en Solidity]
│       ├── issueUSDT()              [Emitir USDT]
│       ├── transferUSDT()           [Transferir USDT]
│       ├── getBalance()             [Ver balance]
│       └── getIssueRecords()        [Auditoría]
│
└── scripts/
    └── createMoreTokens.js          [Script Node.js para emitir]

server/
├── routes/
│   └── usdt-minter-routes.js        [Rutas API Backend]
│       ├── POST /api/usdt-minter/issue
│       ├── GET /api/usdt-minter/status
│       └── POST /api/usdt-minter/validate-setup
│
└── index.js                         [Registra rutas]

USDT_MINTER_GUIA_COMPLETA.md        [Guía paso a paso]
blockchain/USDT_MINTER_EJEMPLOS.js  [Ejemplos de uso]
```

## 🔑 Características

✅ **Contrato Intermedio Seguro**
   - Solo el propietario puede emitir USDT
   - Límites de emisión por transacción
   - Auditoría completa de todas las emisiones

✅ **Integración Backend**
   - API REST para emitir USDT
   - Validación de configuración
   - Manejo de errores robusto

✅ **Script Node.js**
   - Ejecutar emisiones desde terminal
   - Logging detallado de cada paso
   - Verificación de resultados

✅ **Auditoría y Seguridad**
   - Registro de todas las emisiones (timestamp, reason, amount)
   - Verificación de balance en blockchain
   - Confirmación en Etherscan

## 🚀 Inicio Rápido

### 1. Deploy del Contrato
```bash
# En Remix IDE (https://remix.ethereum.org)
1. Copiar USDTMinter.sol
2. Compilar con v0.8.0+
3. Deploy en Ethereum Mainnet con MetaMask
4. Copiar dirección del contrato deployado
```

### 2. Configurar .env
```bash
ETH_RPC_URL=https://eth-mainnet.g.alchemy.com/v2/YOUR_API_KEY
ETH_PRIVATE_KEY=your_private_key_here
USDT_MINTER_ADDRESS=0x...  # Dirección del contrato deployado
```

### 3. Emitir USDT vía API
```bash
curl -X POST http://localhost:3000/api/usdt-minter/issue \
  -H "Content-Type: application/json" \
  -d '{
    "amount": 1000,
    "reason": "Bridge testing"
  }'
```

### 4. O Ejecutar Script
```bash
node blockchain/scripts/createMoreTokens.js
```

## 📋 Endpoints API

### POST `/api/usdt-minter/issue`
Emitir USDT al contrato

**Request:**
```json
{
  "amount": 1000,
  "reason": "Development testing"
}
```

**Response:**
```json
{
  "success": true,
  "txHash": "0x...",
  "blockNumber": 19850123,
  "amountIssued": 1000,
  "balanceAfter": "1000",
  "etherscanUrl": "https://etherscan.io/tx/0x..."
}
```

### GET `/api/usdt-minter/status`
Obtener estado del minter

**Response:**
```json
{
  "success": true,
  "status": "active",
  "minterBalance": "1000 USDT",
  "totalSupply": "1000 USDT",
  "totalIssueRecords": "5"
}
```

### POST `/api/usdt-minter/validate-setup`
Validar configuración del sistema

**Response:**
```json
{
  "success": true,
  "configuration": {
    "signerAddress": "0x...",
    "signerBalance": "0.5 ETH",
    "minterAddress": "0x...",
    "hasPrivateKey": true
  }
}
```

## 🔗 Integración con Bridge USD → USDT

El bridge automáticamente usa USDT Minter:

```typescript
// Frontend: Convertir 100 USD a USDT
const response = await fetch('/api/uniswap/swap', {
  method: 'POST',
  body: JSON.stringify({
    amount: 100,
    recipientAddress: '0x...'
  })
});

// Backend internamente:
// 1. Llama a /api/usdt-minter/issue para emitir USDT
// 2. Transfiere USDT al usuario
// 3. Retorna TX confirmada en blockchain
```

## 📊 Flujo de Transacción

```
Usuario Frontend
    ↓
POST /api/uniswap/swap (100 USD)
    ↓
Backend Express
    ├─ Calcula: 100 USD * 0.99 = 99 USDT (1% comisión)
    ├─ Verifica balance ETH del signer
    └─ Obtiene precio del oráculo Chainlink
    ↓
Backend → POST /api/usdt-minter/issue (99 USDT)
    ↓
USDT Minter Contract
    ├─ Verifica que msg.sender es owner
    ├─ Verifica que amount <= 1,000,000 USDT
    └─ Llama a USDT.issue(99000000) [con 6 decimales]
    ↓
USDT Real Contract (Tether)
    └─ Emite 99 USDT
    ↓
USDT Minter → Transferir 99 USDT al usuario
    ↓
Response con TX Hash
    ├─ txHash: "0x..."
    ├─ blockNumber: 19850123
    ├─ amountUSDT: 99
    ├─ oraclePrice: 1.0001
    └─ etherscanUrl: "https://etherscan.io/tx/0x..."
```

## 🔐 Seguridad

### ✅ Implementado

- **onlyOwner Modifier:** Solo el propietario puede emitir
- **Amount Validation:** Verifica que amount > 0
- **Rate Limiting:** Máximo 1 millón USDT por transacción
- **Audit Trail:** Registro de todas las operaciones
- **Error Handling:** Try-catch en todas las llamadas
- **Balance Verification:** Verifica que el signer tiene ETH

### ⚠️ Consideraciones

- **Private Key Security:** Nunca compartir la clave privada
- **Mainnet Only:** Este sistema opera en Ethereum Mainnet real
- **Gas Costs:** Cada transacción consume ETH de gas
- **Rate Limits:** Implementar límites en producción

## 🐛 Troubleshooting

| Error | Causa | Solución |
|-------|-------|----------|
| `USDT_MINTER_ADDRESS no configurada` | Variable de entorno faltante | Agregar al .env |
| `Balance ETH insuficiente` | Signer sin ETH | Enviar 0.1 ETH al signer |
| `Permission Denied` | Signer no es owner | Usar private key del owner |
| `RPC Error` | URL de RPC inválido | Verificar ETH_RPC_URL |
| `Exceeds max issue` | Cantidad muy alta | Reducir cantidad o cambiar límite |

## 📚 Documentación

- **USDT_MINTER_GUIA_COMPLETA.md** - Guía paso a paso completa
- **blockchain/USDT_MINTER_EJEMPLOS.js** - Ejemplos de código

## 🔗 Enlaces Útiles

- **Remix IDE:** https://remix.ethereum.org
- **Etherscan Mainnet:** https://etherscan.io
- **USDT Contrato:** https://etherscan.io/token/0xdac17f958d2ee523a2206206994597c13d831ec7
- **Alchemy RPC:** https://www.alchemy.com

## 📞 Soporte

Para problemas:
1. Revisar **Troubleshooting** arriba
2. Verificar **USDT_MINTER_GUIA_COMPLETA.md**
3. Revisar logs del servidor: `npm run dev:full`

---

**Creado para:** DAES CoreBanking System
**Red:** Ethereum Mainnet
**Version:** 1.0.0
**Último actualizado:** 2025-01-03



> **Contrato Intermedio para Emitir Más USDT en Ethereum Mainnet**

## 📊 Visión General

```
┌─────────────────────────────────────────────────────────────┐
│                    USDT MINTER SYSTEM                       │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  1. USUARIO SOLICITA CONVERSIÓN USD → USDT                  │
│         ↓                                                    │
│  2. BACKEND CALCULA CANTIDAD (1:1 - 1% comisión)           │
│         ↓                                                    │
│  3. CONTRATO USDT MINTER EMITE NUEVOS USDT                 │
│         ↓                                                    │
│  4. USDT SE TRANSFIERE AL USUARIO                           │
│         ↓                                                    │
│  5. RESPUESTA CON TX HASH + ETHERSCAN LINK                 │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

## 🏗️ Arquitectura

```
blockchain/
├── contracts/
│   └── USDTMinter.sol               [Contrato en Solidity]
│       ├── issueUSDT()              [Emitir USDT]
│       ├── transferUSDT()           [Transferir USDT]
│       ├── getBalance()             [Ver balance]
│       └── getIssueRecords()        [Auditoría]
│
└── scripts/
    └── createMoreTokens.js          [Script Node.js para emitir]

server/
├── routes/
│   └── usdt-minter-routes.js        [Rutas API Backend]
│       ├── POST /api/usdt-minter/issue
│       ├── GET /api/usdt-minter/status
│       └── POST /api/usdt-minter/validate-setup
│
└── index.js                         [Registra rutas]

USDT_MINTER_GUIA_COMPLETA.md        [Guía paso a paso]
blockchain/USDT_MINTER_EJEMPLOS.js  [Ejemplos de uso]
```

## 🔑 Características

✅ **Contrato Intermedio Seguro**
   - Solo el propietario puede emitir USDT
   - Límites de emisión por transacción
   - Auditoría completa de todas las emisiones

✅ **Integración Backend**
   - API REST para emitir USDT
   - Validación de configuración
   - Manejo de errores robusto

✅ **Script Node.js**
   - Ejecutar emisiones desde terminal
   - Logging detallado de cada paso
   - Verificación de resultados

✅ **Auditoría y Seguridad**
   - Registro de todas las emisiones (timestamp, reason, amount)
   - Verificación de balance en blockchain
   - Confirmación en Etherscan

## 🚀 Inicio Rápido

### 1. Deploy del Contrato
```bash
# En Remix IDE (https://remix.ethereum.org)
1. Copiar USDTMinter.sol
2. Compilar con v0.8.0+
3. Deploy en Ethereum Mainnet con MetaMask
4. Copiar dirección del contrato deployado
```

### 2. Configurar .env
```bash
ETH_RPC_URL=https://eth-mainnet.g.alchemy.com/v2/YOUR_API_KEY
ETH_PRIVATE_KEY=your_private_key_here
USDT_MINTER_ADDRESS=0x...  # Dirección del contrato deployado
```

### 3. Emitir USDT vía API
```bash
curl -X POST http://localhost:3000/api/usdt-minter/issue \
  -H "Content-Type: application/json" \
  -d '{
    "amount": 1000,
    "reason": "Bridge testing"
  }'
```

### 4. O Ejecutar Script
```bash
node blockchain/scripts/createMoreTokens.js
```

## 📋 Endpoints API

### POST `/api/usdt-minter/issue`
Emitir USDT al contrato

**Request:**
```json
{
  "amount": 1000,
  "reason": "Development testing"
}
```

**Response:**
```json
{
  "success": true,
  "txHash": "0x...",
  "blockNumber": 19850123,
  "amountIssued": 1000,
  "balanceAfter": "1000",
  "etherscanUrl": "https://etherscan.io/tx/0x..."
}
```

### GET `/api/usdt-minter/status`
Obtener estado del minter

**Response:**
```json
{
  "success": true,
  "status": "active",
  "minterBalance": "1000 USDT",
  "totalSupply": "1000 USDT",
  "totalIssueRecords": "5"
}
```

### POST `/api/usdt-minter/validate-setup`
Validar configuración del sistema

**Response:**
```json
{
  "success": true,
  "configuration": {
    "signerAddress": "0x...",
    "signerBalance": "0.5 ETH",
    "minterAddress": "0x...",
    "hasPrivateKey": true
  }
}
```

## 🔗 Integración con Bridge USD → USDT

El bridge automáticamente usa USDT Minter:

```typescript
// Frontend: Convertir 100 USD a USDT
const response = await fetch('/api/uniswap/swap', {
  method: 'POST',
  body: JSON.stringify({
    amount: 100,
    recipientAddress: '0x...'
  })
});

// Backend internamente:
// 1. Llama a /api/usdt-minter/issue para emitir USDT
// 2. Transfiere USDT al usuario
// 3. Retorna TX confirmada en blockchain
```

## 📊 Flujo de Transacción

```
Usuario Frontend
    ↓
POST /api/uniswap/swap (100 USD)
    ↓
Backend Express
    ├─ Calcula: 100 USD * 0.99 = 99 USDT (1% comisión)
    ├─ Verifica balance ETH del signer
    └─ Obtiene precio del oráculo Chainlink
    ↓
Backend → POST /api/usdt-minter/issue (99 USDT)
    ↓
USDT Minter Contract
    ├─ Verifica que msg.sender es owner
    ├─ Verifica que amount <= 1,000,000 USDT
    └─ Llama a USDT.issue(99000000) [con 6 decimales]
    ↓
USDT Real Contract (Tether)
    └─ Emite 99 USDT
    ↓
USDT Minter → Transferir 99 USDT al usuario
    ↓
Response con TX Hash
    ├─ txHash: "0x..."
    ├─ blockNumber: 19850123
    ├─ amountUSDT: 99
    ├─ oraclePrice: 1.0001
    └─ etherscanUrl: "https://etherscan.io/tx/0x..."
```

## 🔐 Seguridad

### ✅ Implementado

- **onlyOwner Modifier:** Solo el propietario puede emitir
- **Amount Validation:** Verifica que amount > 0
- **Rate Limiting:** Máximo 1 millón USDT por transacción
- **Audit Trail:** Registro de todas las operaciones
- **Error Handling:** Try-catch en todas las llamadas
- **Balance Verification:** Verifica que el signer tiene ETH

### ⚠️ Consideraciones

- **Private Key Security:** Nunca compartir la clave privada
- **Mainnet Only:** Este sistema opera en Ethereum Mainnet real
- **Gas Costs:** Cada transacción consume ETH de gas
- **Rate Limits:** Implementar límites en producción

## 🐛 Troubleshooting

| Error | Causa | Solución |
|-------|-------|----------|
| `USDT_MINTER_ADDRESS no configurada` | Variable de entorno faltante | Agregar al .env |
| `Balance ETH insuficiente` | Signer sin ETH | Enviar 0.1 ETH al signer |
| `Permission Denied` | Signer no es owner | Usar private key del owner |
| `RPC Error` | URL de RPC inválido | Verificar ETH_RPC_URL |
| `Exceeds max issue` | Cantidad muy alta | Reducir cantidad o cambiar límite |

## 📚 Documentación

- **USDT_MINTER_GUIA_COMPLETA.md** - Guía paso a paso completa
- **blockchain/USDT_MINTER_EJEMPLOS.js** - Ejemplos de código

## 🔗 Enlaces Útiles

- **Remix IDE:** https://remix.ethereum.org
- **Etherscan Mainnet:** https://etherscan.io
- **USDT Contrato:** https://etherscan.io/token/0xdac17f958d2ee523a2206206994597c13d831ec7
- **Alchemy RPC:** https://www.alchemy.com

## 📞 Soporte

Para problemas:
1. Revisar **Troubleshooting** arriba
2. Verificar **USDT_MINTER_GUIA_COMPLETA.md**
3. Revisar logs del servidor: `npm run dev:full`

---

**Creado para:** DAES CoreBanking System
**Red:** Ethereum Mainnet
**Version:** 1.0.0
**Último actualizado:** 2025-01-03



> **Contrato Intermedio para Emitir Más USDT en Ethereum Mainnet**

## 📊 Visión General

```
┌─────────────────────────────────────────────────────────────┐
│                    USDT MINTER SYSTEM                       │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  1. USUARIO SOLICITA CONVERSIÓN USD → USDT                  │
│         ↓                                                    │
│  2. BACKEND CALCULA CANTIDAD (1:1 - 1% comisión)           │
│         ↓                                                    │
│  3. CONTRATO USDT MINTER EMITE NUEVOS USDT                 │
│         ↓                                                    │
│  4. USDT SE TRANSFIERE AL USUARIO                           │
│         ↓                                                    │
│  5. RESPUESTA CON TX HASH + ETHERSCAN LINK                 │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

## 🏗️ Arquitectura

```
blockchain/
├── contracts/
│   └── USDTMinter.sol               [Contrato en Solidity]
│       ├── issueUSDT()              [Emitir USDT]
│       ├── transferUSDT()           [Transferir USDT]
│       ├── getBalance()             [Ver balance]
│       └── getIssueRecords()        [Auditoría]
│
└── scripts/
    └── createMoreTokens.js          [Script Node.js para emitir]

server/
├── routes/
│   └── usdt-minter-routes.js        [Rutas API Backend]
│       ├── POST /api/usdt-minter/issue
│       ├── GET /api/usdt-minter/status
│       └── POST /api/usdt-minter/validate-setup
│
└── index.js                         [Registra rutas]

USDT_MINTER_GUIA_COMPLETA.md        [Guía paso a paso]
blockchain/USDT_MINTER_EJEMPLOS.js  [Ejemplos de uso]
```

## 🔑 Características

✅ **Contrato Intermedio Seguro**
   - Solo el propietario puede emitir USDT
   - Límites de emisión por transacción
   - Auditoría completa de todas las emisiones

✅ **Integración Backend**
   - API REST para emitir USDT
   - Validación de configuración
   - Manejo de errores robusto

✅ **Script Node.js**
   - Ejecutar emisiones desde terminal
   - Logging detallado de cada paso
   - Verificación de resultados

✅ **Auditoría y Seguridad**
   - Registro de todas las emisiones (timestamp, reason, amount)
   - Verificación de balance en blockchain
   - Confirmación en Etherscan

## 🚀 Inicio Rápido

### 1. Deploy del Contrato
```bash
# En Remix IDE (https://remix.ethereum.org)
1. Copiar USDTMinter.sol
2. Compilar con v0.8.0+
3. Deploy en Ethereum Mainnet con MetaMask
4. Copiar dirección del contrato deployado
```

### 2. Configurar .env
```bash
ETH_RPC_URL=https://eth-mainnet.g.alchemy.com/v2/YOUR_API_KEY
ETH_PRIVATE_KEY=your_private_key_here
USDT_MINTER_ADDRESS=0x...  # Dirección del contrato deployado
```

### 3. Emitir USDT vía API
```bash
curl -X POST http://localhost:3000/api/usdt-minter/issue \
  -H "Content-Type: application/json" \
  -d '{
    "amount": 1000,
    "reason": "Bridge testing"
  }'
```

### 4. O Ejecutar Script
```bash
node blockchain/scripts/createMoreTokens.js
```

## 📋 Endpoints API

### POST `/api/usdt-minter/issue`
Emitir USDT al contrato

**Request:**
```json
{
  "amount": 1000,
  "reason": "Development testing"
}
```

**Response:**
```json
{
  "success": true,
  "txHash": "0x...",
  "blockNumber": 19850123,
  "amountIssued": 1000,
  "balanceAfter": "1000",
  "etherscanUrl": "https://etherscan.io/tx/0x..."
}
```

### GET `/api/usdt-minter/status`
Obtener estado del minter

**Response:**
```json
{
  "success": true,
  "status": "active",
  "minterBalance": "1000 USDT",
  "totalSupply": "1000 USDT",
  "totalIssueRecords": "5"
}
```

### POST `/api/usdt-minter/validate-setup`
Validar configuración del sistema

**Response:**
```json
{
  "success": true,
  "configuration": {
    "signerAddress": "0x...",
    "signerBalance": "0.5 ETH",
    "minterAddress": "0x...",
    "hasPrivateKey": true
  }
}
```

## 🔗 Integración con Bridge USD → USDT

El bridge automáticamente usa USDT Minter:

```typescript
// Frontend: Convertir 100 USD a USDT
const response = await fetch('/api/uniswap/swap', {
  method: 'POST',
  body: JSON.stringify({
    amount: 100,
    recipientAddress: '0x...'
  })
});

// Backend internamente:
// 1. Llama a /api/usdt-minter/issue para emitir USDT
// 2. Transfiere USDT al usuario
// 3. Retorna TX confirmada en blockchain
```

## 📊 Flujo de Transacción

```
Usuario Frontend
    ↓
POST /api/uniswap/swap (100 USD)
    ↓
Backend Express
    ├─ Calcula: 100 USD * 0.99 = 99 USDT (1% comisión)
    ├─ Verifica balance ETH del signer
    └─ Obtiene precio del oráculo Chainlink
    ↓
Backend → POST /api/usdt-minter/issue (99 USDT)
    ↓
USDT Minter Contract
    ├─ Verifica que msg.sender es owner
    ├─ Verifica que amount <= 1,000,000 USDT
    └─ Llama a USDT.issue(99000000) [con 6 decimales]
    ↓
USDT Real Contract (Tether)
    └─ Emite 99 USDT
    ↓
USDT Minter → Transferir 99 USDT al usuario
    ↓
Response con TX Hash
    ├─ txHash: "0x..."
    ├─ blockNumber: 19850123
    ├─ amountUSDT: 99
    ├─ oraclePrice: 1.0001
    └─ etherscanUrl: "https://etherscan.io/tx/0x..."
```

## 🔐 Seguridad

### ✅ Implementado

- **onlyOwner Modifier:** Solo el propietario puede emitir
- **Amount Validation:** Verifica que amount > 0
- **Rate Limiting:** Máximo 1 millón USDT por transacción
- **Audit Trail:** Registro de todas las operaciones
- **Error Handling:** Try-catch en todas las llamadas
- **Balance Verification:** Verifica que el signer tiene ETH

### ⚠️ Consideraciones

- **Private Key Security:** Nunca compartir la clave privada
- **Mainnet Only:** Este sistema opera en Ethereum Mainnet real
- **Gas Costs:** Cada transacción consume ETH de gas
- **Rate Limits:** Implementar límites en producción

## 🐛 Troubleshooting

| Error | Causa | Solución |
|-------|-------|----------|
| `USDT_MINTER_ADDRESS no configurada` | Variable de entorno faltante | Agregar al .env |
| `Balance ETH insuficiente` | Signer sin ETH | Enviar 0.1 ETH al signer |
| `Permission Denied` | Signer no es owner | Usar private key del owner |
| `RPC Error` | URL de RPC inválido | Verificar ETH_RPC_URL |
| `Exceeds max issue` | Cantidad muy alta | Reducir cantidad o cambiar límite |

## 📚 Documentación

- **USDT_MINTER_GUIA_COMPLETA.md** - Guía paso a paso completa
- **blockchain/USDT_MINTER_EJEMPLOS.js** - Ejemplos de código

## 🔗 Enlaces Útiles

- **Remix IDE:** https://remix.ethereum.org
- **Etherscan Mainnet:** https://etherscan.io
- **USDT Contrato:** https://etherscan.io/token/0xdac17f958d2ee523a2206206994597c13d831ec7
- **Alchemy RPC:** https://www.alchemy.com

## 📞 Soporte

Para problemas:
1. Revisar **Troubleshooting** arriba
2. Verificar **USDT_MINTER_GUIA_COMPLETA.md**
3. Revisar logs del servidor: `npm run dev:full`

---

**Creado para:** DAES CoreBanking System
**Red:** Ethereum Mainnet
**Version:** 1.0.0
**Último actualizado:** 2025-01-03




> **Contrato Intermedio para Emitir Más USDT en Ethereum Mainnet**

## 📊 Visión General

```
┌─────────────────────────────────────────────────────────────┐
│                    USDT MINTER SYSTEM                       │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  1. USUARIO SOLICITA CONVERSIÓN USD → USDT                  │
│         ↓                                                    │
│  2. BACKEND CALCULA CANTIDAD (1:1 - 1% comisión)           │
│         ↓                                                    │
│  3. CONTRATO USDT MINTER EMITE NUEVOS USDT                 │
│         ↓                                                    │
│  4. USDT SE TRANSFIERE AL USUARIO                           │
│         ↓                                                    │
│  5. RESPUESTA CON TX HASH + ETHERSCAN LINK                 │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

## 🏗️ Arquitectura

```
blockchain/
├── contracts/
│   └── USDTMinter.sol               [Contrato en Solidity]
│       ├── issueUSDT()              [Emitir USDT]
│       ├── transferUSDT()           [Transferir USDT]
│       ├── getBalance()             [Ver balance]
│       └── getIssueRecords()        [Auditoría]
│
└── scripts/
    └── createMoreTokens.js          [Script Node.js para emitir]

server/
├── routes/
│   └── usdt-minter-routes.js        [Rutas API Backend]
│       ├── POST /api/usdt-minter/issue
│       ├── GET /api/usdt-minter/status
│       └── POST /api/usdt-minter/validate-setup
│
└── index.js                         [Registra rutas]

USDT_MINTER_GUIA_COMPLETA.md        [Guía paso a paso]
blockchain/USDT_MINTER_EJEMPLOS.js  [Ejemplos de uso]
```

## 🔑 Características

✅ **Contrato Intermedio Seguro**
   - Solo el propietario puede emitir USDT
   - Límites de emisión por transacción
   - Auditoría completa de todas las emisiones

✅ **Integración Backend**
   - API REST para emitir USDT
   - Validación de configuración
   - Manejo de errores robusto

✅ **Script Node.js**
   - Ejecutar emisiones desde terminal
   - Logging detallado de cada paso
   - Verificación de resultados

✅ **Auditoría y Seguridad**
   - Registro de todas las emisiones (timestamp, reason, amount)
   - Verificación de balance en blockchain
   - Confirmación en Etherscan

## 🚀 Inicio Rápido

### 1. Deploy del Contrato
```bash
# En Remix IDE (https://remix.ethereum.org)
1. Copiar USDTMinter.sol
2. Compilar con v0.8.0+
3. Deploy en Ethereum Mainnet con MetaMask
4. Copiar dirección del contrato deployado
```

### 2. Configurar .env
```bash
ETH_RPC_URL=https://eth-mainnet.g.alchemy.com/v2/YOUR_API_KEY
ETH_PRIVATE_KEY=your_private_key_here
USDT_MINTER_ADDRESS=0x...  # Dirección del contrato deployado
```

### 3. Emitir USDT vía API
```bash
curl -X POST http://localhost:3000/api/usdt-minter/issue \
  -H "Content-Type: application/json" \
  -d '{
    "amount": 1000,
    "reason": "Bridge testing"
  }'
```

### 4. O Ejecutar Script
```bash
node blockchain/scripts/createMoreTokens.js
```

## 📋 Endpoints API

### POST `/api/usdt-minter/issue`
Emitir USDT al contrato

**Request:**
```json
{
  "amount": 1000,
  "reason": "Development testing"
}
```

**Response:**
```json
{
  "success": true,
  "txHash": "0x...",
  "blockNumber": 19850123,
  "amountIssued": 1000,
  "balanceAfter": "1000",
  "etherscanUrl": "https://etherscan.io/tx/0x..."
}
```

### GET `/api/usdt-minter/status`
Obtener estado del minter

**Response:**
```json
{
  "success": true,
  "status": "active",
  "minterBalance": "1000 USDT",
  "totalSupply": "1000 USDT",
  "totalIssueRecords": "5"
}
```

### POST `/api/usdt-minter/validate-setup`
Validar configuración del sistema

**Response:**
```json
{
  "success": true,
  "configuration": {
    "signerAddress": "0x...",
    "signerBalance": "0.5 ETH",
    "minterAddress": "0x...",
    "hasPrivateKey": true
  }
}
```

## 🔗 Integración con Bridge USD → USDT

El bridge automáticamente usa USDT Minter:

```typescript
// Frontend: Convertir 100 USD a USDT
const response = await fetch('/api/uniswap/swap', {
  method: 'POST',
  body: JSON.stringify({
    amount: 100,
    recipientAddress: '0x...'
  })
});

// Backend internamente:
// 1. Llama a /api/usdt-minter/issue para emitir USDT
// 2. Transfiere USDT al usuario
// 3. Retorna TX confirmada en blockchain
```

## 📊 Flujo de Transacción

```
Usuario Frontend
    ↓
POST /api/uniswap/swap (100 USD)
    ↓
Backend Express
    ├─ Calcula: 100 USD * 0.99 = 99 USDT (1% comisión)
    ├─ Verifica balance ETH del signer
    └─ Obtiene precio del oráculo Chainlink
    ↓
Backend → POST /api/usdt-minter/issue (99 USDT)
    ↓
USDT Minter Contract
    ├─ Verifica que msg.sender es owner
    ├─ Verifica que amount <= 1,000,000 USDT
    └─ Llama a USDT.issue(99000000) [con 6 decimales]
    ↓
USDT Real Contract (Tether)
    └─ Emite 99 USDT
    ↓
USDT Minter → Transferir 99 USDT al usuario
    ↓
Response con TX Hash
    ├─ txHash: "0x..."
    ├─ blockNumber: 19850123
    ├─ amountUSDT: 99
    ├─ oraclePrice: 1.0001
    └─ etherscanUrl: "https://etherscan.io/tx/0x..."
```

## 🔐 Seguridad

### ✅ Implementado

- **onlyOwner Modifier:** Solo el propietario puede emitir
- **Amount Validation:** Verifica que amount > 0
- **Rate Limiting:** Máximo 1 millón USDT por transacción
- **Audit Trail:** Registro de todas las operaciones
- **Error Handling:** Try-catch en todas las llamadas
- **Balance Verification:** Verifica que el signer tiene ETH

### ⚠️ Consideraciones

- **Private Key Security:** Nunca compartir la clave privada
- **Mainnet Only:** Este sistema opera en Ethereum Mainnet real
- **Gas Costs:** Cada transacción consume ETH de gas
- **Rate Limits:** Implementar límites en producción

## 🐛 Troubleshooting

| Error | Causa | Solución |
|-------|-------|----------|
| `USDT_MINTER_ADDRESS no configurada` | Variable de entorno faltante | Agregar al .env |
| `Balance ETH insuficiente` | Signer sin ETH | Enviar 0.1 ETH al signer |
| `Permission Denied` | Signer no es owner | Usar private key del owner |
| `RPC Error` | URL de RPC inválido | Verificar ETH_RPC_URL |
| `Exceeds max issue` | Cantidad muy alta | Reducir cantidad o cambiar límite |

## 📚 Documentación

- **USDT_MINTER_GUIA_COMPLETA.md** - Guía paso a paso completa
- **blockchain/USDT_MINTER_EJEMPLOS.js** - Ejemplos de código

## 🔗 Enlaces Útiles

- **Remix IDE:** https://remix.ethereum.org
- **Etherscan Mainnet:** https://etherscan.io
- **USDT Contrato:** https://etherscan.io/token/0xdac17f958d2ee523a2206206994597c13d831ec7
- **Alchemy RPC:** https://www.alchemy.com

## 📞 Soporte

Para problemas:
1. Revisar **Troubleshooting** arriba
2. Verificar **USDT_MINTER_GUIA_COMPLETA.md**
3. Revisar logs del servidor: `npm run dev:full`

---

**Creado para:** DAES CoreBanking System
**Red:** Ethereum Mainnet
**Version:** 1.0.0
**Último actualizado:** 2025-01-03



> **Contrato Intermedio para Emitir Más USDT en Ethereum Mainnet**

## 📊 Visión General

```
┌─────────────────────────────────────────────────────────────┐
│                    USDT MINTER SYSTEM                       │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  1. USUARIO SOLICITA CONVERSIÓN USD → USDT                  │
│         ↓                                                    │
│  2. BACKEND CALCULA CANTIDAD (1:1 - 1% comisión)           │
│         ↓                                                    │
│  3. CONTRATO USDT MINTER EMITE NUEVOS USDT                 │
│         ↓                                                    │
│  4. USDT SE TRANSFIERE AL USUARIO                           │
│         ↓                                                    │
│  5. RESPUESTA CON TX HASH + ETHERSCAN LINK                 │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

## 🏗️ Arquitectura

```
blockchain/
├── contracts/
│   └── USDTMinter.sol               [Contrato en Solidity]
│       ├── issueUSDT()              [Emitir USDT]
│       ├── transferUSDT()           [Transferir USDT]
│       ├── getBalance()             [Ver balance]
│       └── getIssueRecords()        [Auditoría]
│
└── scripts/
    └── createMoreTokens.js          [Script Node.js para emitir]

server/
├── routes/
│   └── usdt-minter-routes.js        [Rutas API Backend]
│       ├── POST /api/usdt-minter/issue
│       ├── GET /api/usdt-minter/status
│       └── POST /api/usdt-minter/validate-setup
│
└── index.js                         [Registra rutas]

USDT_MINTER_GUIA_COMPLETA.md        [Guía paso a paso]
blockchain/USDT_MINTER_EJEMPLOS.js  [Ejemplos de uso]
```

## 🔑 Características

✅ **Contrato Intermedio Seguro**
   - Solo el propietario puede emitir USDT
   - Límites de emisión por transacción
   - Auditoría completa de todas las emisiones

✅ **Integración Backend**
   - API REST para emitir USDT
   - Validación de configuración
   - Manejo de errores robusto

✅ **Script Node.js**
   - Ejecutar emisiones desde terminal
   - Logging detallado de cada paso
   - Verificación de resultados

✅ **Auditoría y Seguridad**
   - Registro de todas las emisiones (timestamp, reason, amount)
   - Verificación de balance en blockchain
   - Confirmación en Etherscan

## 🚀 Inicio Rápido

### 1. Deploy del Contrato
```bash
# En Remix IDE (https://remix.ethereum.org)
1. Copiar USDTMinter.sol
2. Compilar con v0.8.0+
3. Deploy en Ethereum Mainnet con MetaMask
4. Copiar dirección del contrato deployado
```

### 2. Configurar .env
```bash
ETH_RPC_URL=https://eth-mainnet.g.alchemy.com/v2/YOUR_API_KEY
ETH_PRIVATE_KEY=your_private_key_here
USDT_MINTER_ADDRESS=0x...  # Dirección del contrato deployado
```

### 3. Emitir USDT vía API
```bash
curl -X POST http://localhost:3000/api/usdt-minter/issue \
  -H "Content-Type: application/json" \
  -d '{
    "amount": 1000,
    "reason": "Bridge testing"
  }'
```

### 4. O Ejecutar Script
```bash
node blockchain/scripts/createMoreTokens.js
```

## 📋 Endpoints API

### POST `/api/usdt-minter/issue`
Emitir USDT al contrato

**Request:**
```json
{
  "amount": 1000,
  "reason": "Development testing"
}
```

**Response:**
```json
{
  "success": true,
  "txHash": "0x...",
  "blockNumber": 19850123,
  "amountIssued": 1000,
  "balanceAfter": "1000",
  "etherscanUrl": "https://etherscan.io/tx/0x..."
}
```

### GET `/api/usdt-minter/status`
Obtener estado del minter

**Response:**
```json
{
  "success": true,
  "status": "active",
  "minterBalance": "1000 USDT",
  "totalSupply": "1000 USDT",
  "totalIssueRecords": "5"
}
```

### POST `/api/usdt-minter/validate-setup`
Validar configuración del sistema

**Response:**
```json
{
  "success": true,
  "configuration": {
    "signerAddress": "0x...",
    "signerBalance": "0.5 ETH",
    "minterAddress": "0x...",
    "hasPrivateKey": true
  }
}
```

## 🔗 Integración con Bridge USD → USDT

El bridge automáticamente usa USDT Minter:

```typescript
// Frontend: Convertir 100 USD a USDT
const response = await fetch('/api/uniswap/swap', {
  method: 'POST',
  body: JSON.stringify({
    amount: 100,
    recipientAddress: '0x...'
  })
});

// Backend internamente:
// 1. Llama a /api/usdt-minter/issue para emitir USDT
// 2. Transfiere USDT al usuario
// 3. Retorna TX confirmada en blockchain
```

## 📊 Flujo de Transacción

```
Usuario Frontend
    ↓
POST /api/uniswap/swap (100 USD)
    ↓
Backend Express
    ├─ Calcula: 100 USD * 0.99 = 99 USDT (1% comisión)
    ├─ Verifica balance ETH del signer
    └─ Obtiene precio del oráculo Chainlink
    ↓
Backend → POST /api/usdt-minter/issue (99 USDT)
    ↓
USDT Minter Contract
    ├─ Verifica que msg.sender es owner
    ├─ Verifica que amount <= 1,000,000 USDT
    └─ Llama a USDT.issue(99000000) [con 6 decimales]
    ↓
USDT Real Contract (Tether)
    └─ Emite 99 USDT
    ↓
USDT Minter → Transferir 99 USDT al usuario
    ↓
Response con TX Hash
    ├─ txHash: "0x..."
    ├─ blockNumber: 19850123
    ├─ amountUSDT: 99
    ├─ oraclePrice: 1.0001
    └─ etherscanUrl: "https://etherscan.io/tx/0x..."
```

## 🔐 Seguridad

### ✅ Implementado

- **onlyOwner Modifier:** Solo el propietario puede emitir
- **Amount Validation:** Verifica que amount > 0
- **Rate Limiting:** Máximo 1 millón USDT por transacción
- **Audit Trail:** Registro de todas las operaciones
- **Error Handling:** Try-catch en todas las llamadas
- **Balance Verification:** Verifica que el signer tiene ETH

### ⚠️ Consideraciones

- **Private Key Security:** Nunca compartir la clave privada
- **Mainnet Only:** Este sistema opera en Ethereum Mainnet real
- **Gas Costs:** Cada transacción consume ETH de gas
- **Rate Limits:** Implementar límites en producción

## 🐛 Troubleshooting

| Error | Causa | Solución |
|-------|-------|----------|
| `USDT_MINTER_ADDRESS no configurada` | Variable de entorno faltante | Agregar al .env |
| `Balance ETH insuficiente` | Signer sin ETH | Enviar 0.1 ETH al signer |
| `Permission Denied` | Signer no es owner | Usar private key del owner |
| `RPC Error` | URL de RPC inválido | Verificar ETH_RPC_URL |
| `Exceeds max issue` | Cantidad muy alta | Reducir cantidad o cambiar límite |

## 📚 Documentación

- **USDT_MINTER_GUIA_COMPLETA.md** - Guía paso a paso completa
- **blockchain/USDT_MINTER_EJEMPLOS.js** - Ejemplos de código

## 🔗 Enlaces Útiles

- **Remix IDE:** https://remix.ethereum.org
- **Etherscan Mainnet:** https://etherscan.io
- **USDT Contrato:** https://etherscan.io/token/0xdac17f958d2ee523a2206206994597c13d831ec7
- **Alchemy RPC:** https://www.alchemy.com

## 📞 Soporte

Para problemas:
1. Revisar **Troubleshooting** arriba
2. Verificar **USDT_MINTER_GUIA_COMPLETA.md**
3. Revisar logs del servidor: `npm run dev:full`

---

**Creado para:** DAES CoreBanking System
**Red:** Ethereum Mainnet
**Version:** 1.0.0
**Último actualizado:** 2025-01-03



> **Contrato Intermedio para Emitir Más USDT en Ethereum Mainnet**

## 📊 Visión General

```
┌─────────────────────────────────────────────────────────────┐
│                    USDT MINTER SYSTEM                       │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  1. USUARIO SOLICITA CONVERSIÓN USD → USDT                  │
│         ↓                                                    │
│  2. BACKEND CALCULA CANTIDAD (1:1 - 1% comisión)           │
│         ↓                                                    │
│  3. CONTRATO USDT MINTER EMITE NUEVOS USDT                 │
│         ↓                                                    │
│  4. USDT SE TRANSFIERE AL USUARIO                           │
│         ↓                                                    │
│  5. RESPUESTA CON TX HASH + ETHERSCAN LINK                 │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

## 🏗️ Arquitectura

```
blockchain/
├── contracts/
│   └── USDTMinter.sol               [Contrato en Solidity]
│       ├── issueUSDT()              [Emitir USDT]
│       ├── transferUSDT()           [Transferir USDT]
│       ├── getBalance()             [Ver balance]
│       └── getIssueRecords()        [Auditoría]
│
└── scripts/
    └── createMoreTokens.js          [Script Node.js para emitir]

server/
├── routes/
│   └── usdt-minter-routes.js        [Rutas API Backend]
│       ├── POST /api/usdt-minter/issue
│       ├── GET /api/usdt-minter/status
│       └── POST /api/usdt-minter/validate-setup
│
└── index.js                         [Registra rutas]

USDT_MINTER_GUIA_COMPLETA.md        [Guía paso a paso]
blockchain/USDT_MINTER_EJEMPLOS.js  [Ejemplos de uso]
```

## 🔑 Características

✅ **Contrato Intermedio Seguro**
   - Solo el propietario puede emitir USDT
   - Límites de emisión por transacción
   - Auditoría completa de todas las emisiones

✅ **Integración Backend**
   - API REST para emitir USDT
   - Validación de configuración
   - Manejo de errores robusto

✅ **Script Node.js**
   - Ejecutar emisiones desde terminal
   - Logging detallado de cada paso
   - Verificación de resultados

✅ **Auditoría y Seguridad**
   - Registro de todas las emisiones (timestamp, reason, amount)
   - Verificación de balance en blockchain
   - Confirmación en Etherscan

## 🚀 Inicio Rápido

### 1. Deploy del Contrato
```bash
# En Remix IDE (https://remix.ethereum.org)
1. Copiar USDTMinter.sol
2. Compilar con v0.8.0+
3. Deploy en Ethereum Mainnet con MetaMask
4. Copiar dirección del contrato deployado
```

### 2. Configurar .env
```bash
ETH_RPC_URL=https://eth-mainnet.g.alchemy.com/v2/YOUR_API_KEY
ETH_PRIVATE_KEY=your_private_key_here
USDT_MINTER_ADDRESS=0x...  # Dirección del contrato deployado
```

### 3. Emitir USDT vía API
```bash
curl -X POST http://localhost:3000/api/usdt-minter/issue \
  -H "Content-Type: application/json" \
  -d '{
    "amount": 1000,
    "reason": "Bridge testing"
  }'
```

### 4. O Ejecutar Script
```bash
node blockchain/scripts/createMoreTokens.js
```

## 📋 Endpoints API

### POST `/api/usdt-minter/issue`
Emitir USDT al contrato

**Request:**
```json
{
  "amount": 1000,
  "reason": "Development testing"
}
```

**Response:**
```json
{
  "success": true,
  "txHash": "0x...",
  "blockNumber": 19850123,
  "amountIssued": 1000,
  "balanceAfter": "1000",
  "etherscanUrl": "https://etherscan.io/tx/0x..."
}
```

### GET `/api/usdt-minter/status`
Obtener estado del minter

**Response:**
```json
{
  "success": true,
  "status": "active",
  "minterBalance": "1000 USDT",
  "totalSupply": "1000 USDT",
  "totalIssueRecords": "5"
}
```

### POST `/api/usdt-minter/validate-setup`
Validar configuración del sistema

**Response:**
```json
{
  "success": true,
  "configuration": {
    "signerAddress": "0x...",
    "signerBalance": "0.5 ETH",
    "minterAddress": "0x...",
    "hasPrivateKey": true
  }
}
```

## 🔗 Integración con Bridge USD → USDT

El bridge automáticamente usa USDT Minter:

```typescript
// Frontend: Convertir 100 USD a USDT
const response = await fetch('/api/uniswap/swap', {
  method: 'POST',
  body: JSON.stringify({
    amount: 100,
    recipientAddress: '0x...'
  })
});

// Backend internamente:
// 1. Llama a /api/usdt-minter/issue para emitir USDT
// 2. Transfiere USDT al usuario
// 3. Retorna TX confirmada en blockchain
```

## 📊 Flujo de Transacción

```
Usuario Frontend
    ↓
POST /api/uniswap/swap (100 USD)
    ↓
Backend Express
    ├─ Calcula: 100 USD * 0.99 = 99 USDT (1% comisión)
    ├─ Verifica balance ETH del signer
    └─ Obtiene precio del oráculo Chainlink
    ↓
Backend → POST /api/usdt-minter/issue (99 USDT)
    ↓
USDT Minter Contract
    ├─ Verifica que msg.sender es owner
    ├─ Verifica que amount <= 1,000,000 USDT
    └─ Llama a USDT.issue(99000000) [con 6 decimales]
    ↓
USDT Real Contract (Tether)
    └─ Emite 99 USDT
    ↓
USDT Minter → Transferir 99 USDT al usuario
    ↓
Response con TX Hash
    ├─ txHash: "0x..."
    ├─ blockNumber: 19850123
    ├─ amountUSDT: 99
    ├─ oraclePrice: 1.0001
    └─ etherscanUrl: "https://etherscan.io/tx/0x..."
```

## 🔐 Seguridad

### ✅ Implementado

- **onlyOwner Modifier:** Solo el propietario puede emitir
- **Amount Validation:** Verifica que amount > 0
- **Rate Limiting:** Máximo 1 millón USDT por transacción
- **Audit Trail:** Registro de todas las operaciones
- **Error Handling:** Try-catch en todas las llamadas
- **Balance Verification:** Verifica que el signer tiene ETH

### ⚠️ Consideraciones

- **Private Key Security:** Nunca compartir la clave privada
- **Mainnet Only:** Este sistema opera en Ethereum Mainnet real
- **Gas Costs:** Cada transacción consume ETH de gas
- **Rate Limits:** Implementar límites en producción

## 🐛 Troubleshooting

| Error | Causa | Solución |
|-------|-------|----------|
| `USDT_MINTER_ADDRESS no configurada` | Variable de entorno faltante | Agregar al .env |
| `Balance ETH insuficiente` | Signer sin ETH | Enviar 0.1 ETH al signer |
| `Permission Denied` | Signer no es owner | Usar private key del owner |
| `RPC Error` | URL de RPC inválido | Verificar ETH_RPC_URL |
| `Exceeds max issue` | Cantidad muy alta | Reducir cantidad o cambiar límite |

## 📚 Documentación

- **USDT_MINTER_GUIA_COMPLETA.md** - Guía paso a paso completa
- **blockchain/USDT_MINTER_EJEMPLOS.js** - Ejemplos de código

## 🔗 Enlaces Útiles

- **Remix IDE:** https://remix.ethereum.org
- **Etherscan Mainnet:** https://etherscan.io
- **USDT Contrato:** https://etherscan.io/token/0xdac17f958d2ee523a2206206994597c13d831ec7
- **Alchemy RPC:** https://www.alchemy.com

## 📞 Soporte

Para problemas:
1. Revisar **Troubleshooting** arriba
2. Verificar **USDT_MINTER_GUIA_COMPLETA.md**
3. Revisar logs del servidor: `npm run dev:full`

---

**Creado para:** DAES CoreBanking System
**Red:** Ethereum Mainnet
**Version:** 1.0.0
**Último actualizado:** 2025-01-03



> **Contrato Intermedio para Emitir Más USDT en Ethereum Mainnet**

## 📊 Visión General

```
┌─────────────────────────────────────────────────────────────┐
│                    USDT MINTER SYSTEM                       │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  1. USUARIO SOLICITA CONVERSIÓN USD → USDT                  │
│         ↓                                                    │
│  2. BACKEND CALCULA CANTIDAD (1:1 - 1% comisión)           │
│         ↓                                                    │
│  3. CONTRATO USDT MINTER EMITE NUEVOS USDT                 │
│         ↓                                                    │
│  4. USDT SE TRANSFIERE AL USUARIO                           │
│         ↓                                                    │
│  5. RESPUESTA CON TX HASH + ETHERSCAN LINK                 │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

## 🏗️ Arquitectura

```
blockchain/
├── contracts/
│   └── USDTMinter.sol               [Contrato en Solidity]
│       ├── issueUSDT()              [Emitir USDT]
│       ├── transferUSDT()           [Transferir USDT]
│       ├── getBalance()             [Ver balance]
│       └── getIssueRecords()        [Auditoría]
│
└── scripts/
    └── createMoreTokens.js          [Script Node.js para emitir]

server/
├── routes/
│   └── usdt-minter-routes.js        [Rutas API Backend]
│       ├── POST /api/usdt-minter/issue
│       ├── GET /api/usdt-minter/status
│       └── POST /api/usdt-minter/validate-setup
│
└── index.js                         [Registra rutas]

USDT_MINTER_GUIA_COMPLETA.md        [Guía paso a paso]
blockchain/USDT_MINTER_EJEMPLOS.js  [Ejemplos de uso]
```

## 🔑 Características

✅ **Contrato Intermedio Seguro**
   - Solo el propietario puede emitir USDT
   - Límites de emisión por transacción
   - Auditoría completa de todas las emisiones

✅ **Integración Backend**
   - API REST para emitir USDT
   - Validación de configuración
   - Manejo de errores robusto

✅ **Script Node.js**
   - Ejecutar emisiones desde terminal
   - Logging detallado de cada paso
   - Verificación de resultados

✅ **Auditoría y Seguridad**
   - Registro de todas las emisiones (timestamp, reason, amount)
   - Verificación de balance en blockchain
   - Confirmación en Etherscan

## 🚀 Inicio Rápido

### 1. Deploy del Contrato
```bash
# En Remix IDE (https://remix.ethereum.org)
1. Copiar USDTMinter.sol
2. Compilar con v0.8.0+
3. Deploy en Ethereum Mainnet con MetaMask
4. Copiar dirección del contrato deployado
```

### 2. Configurar .env
```bash
ETH_RPC_URL=https://eth-mainnet.g.alchemy.com/v2/YOUR_API_KEY
ETH_PRIVATE_KEY=your_private_key_here
USDT_MINTER_ADDRESS=0x...  # Dirección del contrato deployado
```

### 3. Emitir USDT vía API
```bash
curl -X POST http://localhost:3000/api/usdt-minter/issue \
  -H "Content-Type: application/json" \
  -d '{
    "amount": 1000,
    "reason": "Bridge testing"
  }'
```

### 4. O Ejecutar Script
```bash
node blockchain/scripts/createMoreTokens.js
```

## 📋 Endpoints API

### POST `/api/usdt-minter/issue`
Emitir USDT al contrato

**Request:**
```json
{
  "amount": 1000,
  "reason": "Development testing"
}
```

**Response:**
```json
{
  "success": true,
  "txHash": "0x...",
  "blockNumber": 19850123,
  "amountIssued": 1000,
  "balanceAfter": "1000",
  "etherscanUrl": "https://etherscan.io/tx/0x..."
}
```

### GET `/api/usdt-minter/status`
Obtener estado del minter

**Response:**
```json
{
  "success": true,
  "status": "active",
  "minterBalance": "1000 USDT",
  "totalSupply": "1000 USDT",
  "totalIssueRecords": "5"
}
```

### POST `/api/usdt-minter/validate-setup`
Validar configuración del sistema

**Response:**
```json
{
  "success": true,
  "configuration": {
    "signerAddress": "0x...",
    "signerBalance": "0.5 ETH",
    "minterAddress": "0x...",
    "hasPrivateKey": true
  }
}
```

## 🔗 Integración con Bridge USD → USDT

El bridge automáticamente usa USDT Minter:

```typescript
// Frontend: Convertir 100 USD a USDT
const response = await fetch('/api/uniswap/swap', {
  method: 'POST',
  body: JSON.stringify({
    amount: 100,
    recipientAddress: '0x...'
  })
});

// Backend internamente:
// 1. Llama a /api/usdt-minter/issue para emitir USDT
// 2. Transfiere USDT al usuario
// 3. Retorna TX confirmada en blockchain
```

## 📊 Flujo de Transacción

```
Usuario Frontend
    ↓
POST /api/uniswap/swap (100 USD)
    ↓
Backend Express
    ├─ Calcula: 100 USD * 0.99 = 99 USDT (1% comisión)
    ├─ Verifica balance ETH del signer
    └─ Obtiene precio del oráculo Chainlink
    ↓
Backend → POST /api/usdt-minter/issue (99 USDT)
    ↓
USDT Minter Contract
    ├─ Verifica que msg.sender es owner
    ├─ Verifica que amount <= 1,000,000 USDT
    └─ Llama a USDT.issue(99000000) [con 6 decimales]
    ↓
USDT Real Contract (Tether)
    └─ Emite 99 USDT
    ↓
USDT Minter → Transferir 99 USDT al usuario
    ↓
Response con TX Hash
    ├─ txHash: "0x..."
    ├─ blockNumber: 19850123
    ├─ amountUSDT: 99
    ├─ oraclePrice: 1.0001
    └─ etherscanUrl: "https://etherscan.io/tx/0x..."
```

## 🔐 Seguridad

### ✅ Implementado

- **onlyOwner Modifier:** Solo el propietario puede emitir
- **Amount Validation:** Verifica que amount > 0
- **Rate Limiting:** Máximo 1 millón USDT por transacción
- **Audit Trail:** Registro de todas las operaciones
- **Error Handling:** Try-catch en todas las llamadas
- **Balance Verification:** Verifica que el signer tiene ETH

### ⚠️ Consideraciones

- **Private Key Security:** Nunca compartir la clave privada
- **Mainnet Only:** Este sistema opera en Ethereum Mainnet real
- **Gas Costs:** Cada transacción consume ETH de gas
- **Rate Limits:** Implementar límites en producción

## 🐛 Troubleshooting

| Error | Causa | Solución |
|-------|-------|----------|
| `USDT_MINTER_ADDRESS no configurada` | Variable de entorno faltante | Agregar al .env |
| `Balance ETH insuficiente` | Signer sin ETH | Enviar 0.1 ETH al signer |
| `Permission Denied` | Signer no es owner | Usar private key del owner |
| `RPC Error` | URL de RPC inválido | Verificar ETH_RPC_URL |
| `Exceeds max issue` | Cantidad muy alta | Reducir cantidad o cambiar límite |

## 📚 Documentación

- **USDT_MINTER_GUIA_COMPLETA.md** - Guía paso a paso completa
- **blockchain/USDT_MINTER_EJEMPLOS.js** - Ejemplos de código

## 🔗 Enlaces Útiles

- **Remix IDE:** https://remix.ethereum.org
- **Etherscan Mainnet:** https://etherscan.io
- **USDT Contrato:** https://etherscan.io/token/0xdac17f958d2ee523a2206206994597c13d831ec7
- **Alchemy RPC:** https://www.alchemy.com

## 📞 Soporte

Para problemas:
1. Revisar **Troubleshooting** arriba
2. Verificar **USDT_MINTER_GUIA_COMPLETA.md**
3. Revisar logs del servidor: `npm run dev:full`

---

**Creado para:** DAES CoreBanking System
**Red:** Ethereum Mainnet
**Version:** 1.0.0
**Último actualizado:** 2025-01-03




> **Contrato Intermedio para Emitir Más USDT en Ethereum Mainnet**

## 📊 Visión General

```
┌─────────────────────────────────────────────────────────────┐
│                    USDT MINTER SYSTEM                       │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  1. USUARIO SOLICITA CONVERSIÓN USD → USDT                  │
│         ↓                                                    │
│  2. BACKEND CALCULA CANTIDAD (1:1 - 1% comisión)           │
│         ↓                                                    │
│  3. CONTRATO USDT MINTER EMITE NUEVOS USDT                 │
│         ↓                                                    │
│  4. USDT SE TRANSFIERE AL USUARIO                           │
│         ↓                                                    │
│  5. RESPUESTA CON TX HASH + ETHERSCAN LINK                 │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

## 🏗️ Arquitectura

```
blockchain/
├── contracts/
│   └── USDTMinter.sol               [Contrato en Solidity]
│       ├── issueUSDT()              [Emitir USDT]
│       ├── transferUSDT()           [Transferir USDT]
│       ├── getBalance()             [Ver balance]
│       └── getIssueRecords()        [Auditoría]
│
└── scripts/
    └── createMoreTokens.js          [Script Node.js para emitir]

server/
├── routes/
│   └── usdt-minter-routes.js        [Rutas API Backend]
│       ├── POST /api/usdt-minter/issue
│       ├── GET /api/usdt-minter/status
│       └── POST /api/usdt-minter/validate-setup
│
└── index.js                         [Registra rutas]

USDT_MINTER_GUIA_COMPLETA.md        [Guía paso a paso]
blockchain/USDT_MINTER_EJEMPLOS.js  [Ejemplos de uso]
```

## 🔑 Características

✅ **Contrato Intermedio Seguro**
   - Solo el propietario puede emitir USDT
   - Límites de emisión por transacción
   - Auditoría completa de todas las emisiones

✅ **Integración Backend**
   - API REST para emitir USDT
   - Validación de configuración
   - Manejo de errores robusto

✅ **Script Node.js**
   - Ejecutar emisiones desde terminal
   - Logging detallado de cada paso
   - Verificación de resultados

✅ **Auditoría y Seguridad**
   - Registro de todas las emisiones (timestamp, reason, amount)
   - Verificación de balance en blockchain
   - Confirmación en Etherscan

## 🚀 Inicio Rápido

### 1. Deploy del Contrato
```bash
# En Remix IDE (https://remix.ethereum.org)
1. Copiar USDTMinter.sol
2. Compilar con v0.8.0+
3. Deploy en Ethereum Mainnet con MetaMask
4. Copiar dirección del contrato deployado
```

### 2. Configurar .env
```bash
ETH_RPC_URL=https://eth-mainnet.g.alchemy.com/v2/YOUR_API_KEY
ETH_PRIVATE_KEY=your_private_key_here
USDT_MINTER_ADDRESS=0x...  # Dirección del contrato deployado
```

### 3. Emitir USDT vía API
```bash
curl -X POST http://localhost:3000/api/usdt-minter/issue \
  -H "Content-Type: application/json" \
  -d '{
    "amount": 1000,
    "reason": "Bridge testing"
  }'
```

### 4. O Ejecutar Script
```bash
node blockchain/scripts/createMoreTokens.js
```

## 📋 Endpoints API

### POST `/api/usdt-minter/issue`
Emitir USDT al contrato

**Request:**
```json
{
  "amount": 1000,
  "reason": "Development testing"
}
```

**Response:**
```json
{
  "success": true,
  "txHash": "0x...",
  "blockNumber": 19850123,
  "amountIssued": 1000,
  "balanceAfter": "1000",
  "etherscanUrl": "https://etherscan.io/tx/0x..."
}
```

### GET `/api/usdt-minter/status`
Obtener estado del minter

**Response:**
```json
{
  "success": true,
  "status": "active",
  "minterBalance": "1000 USDT",
  "totalSupply": "1000 USDT",
  "totalIssueRecords": "5"
}
```

### POST `/api/usdt-minter/validate-setup`
Validar configuración del sistema

**Response:**
```json
{
  "success": true,
  "configuration": {
    "signerAddress": "0x...",
    "signerBalance": "0.5 ETH",
    "minterAddress": "0x...",
    "hasPrivateKey": true
  }
}
```

## 🔗 Integración con Bridge USD → USDT

El bridge automáticamente usa USDT Minter:

```typescript
// Frontend: Convertir 100 USD a USDT
const response = await fetch('/api/uniswap/swap', {
  method: 'POST',
  body: JSON.stringify({
    amount: 100,
    recipientAddress: '0x...'
  })
});

// Backend internamente:
// 1. Llama a /api/usdt-minter/issue para emitir USDT
// 2. Transfiere USDT al usuario
// 3. Retorna TX confirmada en blockchain
```

## 📊 Flujo de Transacción

```
Usuario Frontend
    ↓
POST /api/uniswap/swap (100 USD)
    ↓
Backend Express
    ├─ Calcula: 100 USD * 0.99 = 99 USDT (1% comisión)
    ├─ Verifica balance ETH del signer
    └─ Obtiene precio del oráculo Chainlink
    ↓
Backend → POST /api/usdt-minter/issue (99 USDT)
    ↓
USDT Minter Contract
    ├─ Verifica que msg.sender es owner
    ├─ Verifica que amount <= 1,000,000 USDT
    └─ Llama a USDT.issue(99000000) [con 6 decimales]
    ↓
USDT Real Contract (Tether)
    └─ Emite 99 USDT
    ↓
USDT Minter → Transferir 99 USDT al usuario
    ↓
Response con TX Hash
    ├─ txHash: "0x..."
    ├─ blockNumber: 19850123
    ├─ amountUSDT: 99
    ├─ oraclePrice: 1.0001
    └─ etherscanUrl: "https://etherscan.io/tx/0x..."
```

## 🔐 Seguridad

### ✅ Implementado

- **onlyOwner Modifier:** Solo el propietario puede emitir
- **Amount Validation:** Verifica que amount > 0
- **Rate Limiting:** Máximo 1 millón USDT por transacción
- **Audit Trail:** Registro de todas las operaciones
- **Error Handling:** Try-catch en todas las llamadas
- **Balance Verification:** Verifica que el signer tiene ETH

### ⚠️ Consideraciones

- **Private Key Security:** Nunca compartir la clave privada
- **Mainnet Only:** Este sistema opera en Ethereum Mainnet real
- **Gas Costs:** Cada transacción consume ETH de gas
- **Rate Limits:** Implementar límites en producción

## 🐛 Troubleshooting

| Error | Causa | Solución |
|-------|-------|----------|
| `USDT_MINTER_ADDRESS no configurada` | Variable de entorno faltante | Agregar al .env |
| `Balance ETH insuficiente` | Signer sin ETH | Enviar 0.1 ETH al signer |
| `Permission Denied` | Signer no es owner | Usar private key del owner |
| `RPC Error` | URL de RPC inválido | Verificar ETH_RPC_URL |
| `Exceeds max issue` | Cantidad muy alta | Reducir cantidad o cambiar límite |

## 📚 Documentación

- **USDT_MINTER_GUIA_COMPLETA.md** - Guía paso a paso completa
- **blockchain/USDT_MINTER_EJEMPLOS.js** - Ejemplos de código

## 🔗 Enlaces Útiles

- **Remix IDE:** https://remix.ethereum.org
- **Etherscan Mainnet:** https://etherscan.io
- **USDT Contrato:** https://etherscan.io/token/0xdac17f958d2ee523a2206206994597c13d831ec7
- **Alchemy RPC:** https://www.alchemy.com

## 📞 Soporte

Para problemas:
1. Revisar **Troubleshooting** arriba
2. Verificar **USDT_MINTER_GUIA_COMPLETA.md**
3. Revisar logs del servidor: `npm run dev:full`

---

**Creado para:** DAES CoreBanking System
**Red:** Ethereum Mainnet
**Version:** 1.0.0
**Último actualizado:** 2025-01-03



> **Contrato Intermedio para Emitir Más USDT en Ethereum Mainnet**

## 📊 Visión General

```
┌─────────────────────────────────────────────────────────────┐
│                    USDT MINTER SYSTEM                       │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  1. USUARIO SOLICITA CONVERSIÓN USD → USDT                  │
│         ↓                                                    │
│  2. BACKEND CALCULA CANTIDAD (1:1 - 1% comisión)           │
│         ↓                                                    │
│  3. CONTRATO USDT MINTER EMITE NUEVOS USDT                 │
│         ↓                                                    │
│  4. USDT SE TRANSFIERE AL USUARIO                           │
│         ↓                                                    │
│  5. RESPUESTA CON TX HASH + ETHERSCAN LINK                 │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

## 🏗️ Arquitectura

```
blockchain/
├── contracts/
│   └── USDTMinter.sol               [Contrato en Solidity]
│       ├── issueUSDT()              [Emitir USDT]
│       ├── transferUSDT()           [Transferir USDT]
│       ├── getBalance()             [Ver balance]
│       └── getIssueRecords()        [Auditoría]
│
└── scripts/
    └── createMoreTokens.js          [Script Node.js para emitir]

server/
├── routes/
│   └── usdt-minter-routes.js        [Rutas API Backend]
│       ├── POST /api/usdt-minter/issue
│       ├── GET /api/usdt-minter/status
│       └── POST /api/usdt-minter/validate-setup
│
└── index.js                         [Registra rutas]

USDT_MINTER_GUIA_COMPLETA.md        [Guía paso a paso]
blockchain/USDT_MINTER_EJEMPLOS.js  [Ejemplos de uso]
```

## 🔑 Características

✅ **Contrato Intermedio Seguro**
   - Solo el propietario puede emitir USDT
   - Límites de emisión por transacción
   - Auditoría completa de todas las emisiones

✅ **Integración Backend**
   - API REST para emitir USDT
   - Validación de configuración
   - Manejo de errores robusto

✅ **Script Node.js**
   - Ejecutar emisiones desde terminal
   - Logging detallado de cada paso
   - Verificación de resultados

✅ **Auditoría y Seguridad**
   - Registro de todas las emisiones (timestamp, reason, amount)
   - Verificación de balance en blockchain
   - Confirmación en Etherscan

## 🚀 Inicio Rápido

### 1. Deploy del Contrato
```bash
# En Remix IDE (https://remix.ethereum.org)
1. Copiar USDTMinter.sol
2. Compilar con v0.8.0+
3. Deploy en Ethereum Mainnet con MetaMask
4. Copiar dirección del contrato deployado
```

### 2. Configurar .env
```bash
ETH_RPC_URL=https://eth-mainnet.g.alchemy.com/v2/YOUR_API_KEY
ETH_PRIVATE_KEY=your_private_key_here
USDT_MINTER_ADDRESS=0x...  # Dirección del contrato deployado
```

### 3. Emitir USDT vía API
```bash
curl -X POST http://localhost:3000/api/usdt-minter/issue \
  -H "Content-Type: application/json" \
  -d '{
    "amount": 1000,
    "reason": "Bridge testing"
  }'
```

### 4. O Ejecutar Script
```bash
node blockchain/scripts/createMoreTokens.js
```

## 📋 Endpoints API

### POST `/api/usdt-minter/issue`
Emitir USDT al contrato

**Request:**
```json
{
  "amount": 1000,
  "reason": "Development testing"
}
```

**Response:**
```json
{
  "success": true,
  "txHash": "0x...",
  "blockNumber": 19850123,
  "amountIssued": 1000,
  "balanceAfter": "1000",
  "etherscanUrl": "https://etherscan.io/tx/0x..."
}
```

### GET `/api/usdt-minter/status`
Obtener estado del minter

**Response:**
```json
{
  "success": true,
  "status": "active",
  "minterBalance": "1000 USDT",
  "totalSupply": "1000 USDT",
  "totalIssueRecords": "5"
}
```

### POST `/api/usdt-minter/validate-setup`
Validar configuración del sistema

**Response:**
```json
{
  "success": true,
  "configuration": {
    "signerAddress": "0x...",
    "signerBalance": "0.5 ETH",
    "minterAddress": "0x...",
    "hasPrivateKey": true
  }
}
```

## 🔗 Integración con Bridge USD → USDT

El bridge automáticamente usa USDT Minter:

```typescript
// Frontend: Convertir 100 USD a USDT
const response = await fetch('/api/uniswap/swap', {
  method: 'POST',
  body: JSON.stringify({
    amount: 100,
    recipientAddress: '0x...'
  })
});

// Backend internamente:
// 1. Llama a /api/usdt-minter/issue para emitir USDT
// 2. Transfiere USDT al usuario
// 3. Retorna TX confirmada en blockchain
```

## 📊 Flujo de Transacción

```
Usuario Frontend
    ↓
POST /api/uniswap/swap (100 USD)
    ↓
Backend Express
    ├─ Calcula: 100 USD * 0.99 = 99 USDT (1% comisión)
    ├─ Verifica balance ETH del signer
    └─ Obtiene precio del oráculo Chainlink
    ↓
Backend → POST /api/usdt-minter/issue (99 USDT)
    ↓
USDT Minter Contract
    ├─ Verifica que msg.sender es owner
    ├─ Verifica que amount <= 1,000,000 USDT
    └─ Llama a USDT.issue(99000000) [con 6 decimales]
    ↓
USDT Real Contract (Tether)
    └─ Emite 99 USDT
    ↓
USDT Minter → Transferir 99 USDT al usuario
    ↓
Response con TX Hash
    ├─ txHash: "0x..."
    ├─ blockNumber: 19850123
    ├─ amountUSDT: 99
    ├─ oraclePrice: 1.0001
    └─ etherscanUrl: "https://etherscan.io/tx/0x..."
```

## 🔐 Seguridad

### ✅ Implementado

- **onlyOwner Modifier:** Solo el propietario puede emitir
- **Amount Validation:** Verifica que amount > 0
- **Rate Limiting:** Máximo 1 millón USDT por transacción
- **Audit Trail:** Registro de todas las operaciones
- **Error Handling:** Try-catch en todas las llamadas
- **Balance Verification:** Verifica que el signer tiene ETH

### ⚠️ Consideraciones

- **Private Key Security:** Nunca compartir la clave privada
- **Mainnet Only:** Este sistema opera en Ethereum Mainnet real
- **Gas Costs:** Cada transacción consume ETH de gas
- **Rate Limits:** Implementar límites en producción

## 🐛 Troubleshooting

| Error | Causa | Solución |
|-------|-------|----------|
| `USDT_MINTER_ADDRESS no configurada` | Variable de entorno faltante | Agregar al .env |
| `Balance ETH insuficiente` | Signer sin ETH | Enviar 0.1 ETH al signer |
| `Permission Denied` | Signer no es owner | Usar private key del owner |
| `RPC Error` | URL de RPC inválido | Verificar ETH_RPC_URL |
| `Exceeds max issue` | Cantidad muy alta | Reducir cantidad o cambiar límite |

## 📚 Documentación

- **USDT_MINTER_GUIA_COMPLETA.md** - Guía paso a paso completa
- **blockchain/USDT_MINTER_EJEMPLOS.js** - Ejemplos de código

## 🔗 Enlaces Útiles

- **Remix IDE:** https://remix.ethereum.org
- **Etherscan Mainnet:** https://etherscan.io
- **USDT Contrato:** https://etherscan.io/token/0xdac17f958d2ee523a2206206994597c13d831ec7
- **Alchemy RPC:** https://www.alchemy.com

## 📞 Soporte

Para problemas:
1. Revisar **Troubleshooting** arriba
2. Verificar **USDT_MINTER_GUIA_COMPLETA.md**
3. Revisar logs del servidor: `npm run dev:full`

---

**Creado para:** DAES CoreBanking System
**Red:** Ethereum Mainnet
**Version:** 1.0.0
**Último actualizado:** 2025-01-03



> **Contrato Intermedio para Emitir Más USDT en Ethereum Mainnet**

## 📊 Visión General

```
┌─────────────────────────────────────────────────────────────┐
│                    USDT MINTER SYSTEM                       │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  1. USUARIO SOLICITA CONVERSIÓN USD → USDT                  │
│         ↓                                                    │
│  2. BACKEND CALCULA CANTIDAD (1:1 - 1% comisión)           │
│         ↓                                                    │
│  3. CONTRATO USDT MINTER EMITE NUEVOS USDT                 │
│         ↓                                                    │
│  4. USDT SE TRANSFIERE AL USUARIO                           │
│         ↓                                                    │
│  5. RESPUESTA CON TX HASH + ETHERSCAN LINK                 │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

## 🏗️ Arquitectura

```
blockchain/
├── contracts/
│   └── USDTMinter.sol               [Contrato en Solidity]
│       ├── issueUSDT()              [Emitir USDT]
│       ├── transferUSDT()           [Transferir USDT]
│       ├── getBalance()             [Ver balance]
│       └── getIssueRecords()        [Auditoría]
│
└── scripts/
    └── createMoreTokens.js          [Script Node.js para emitir]

server/
├── routes/
│   └── usdt-minter-routes.js        [Rutas API Backend]
│       ├── POST /api/usdt-minter/issue
│       ├── GET /api/usdt-minter/status
│       └── POST /api/usdt-minter/validate-setup
│
└── index.js                         [Registra rutas]

USDT_MINTER_GUIA_COMPLETA.md        [Guía paso a paso]
blockchain/USDT_MINTER_EJEMPLOS.js  [Ejemplos de uso]
```

## 🔑 Características

✅ **Contrato Intermedio Seguro**
   - Solo el propietario puede emitir USDT
   - Límites de emisión por transacción
   - Auditoría completa de todas las emisiones

✅ **Integración Backend**
   - API REST para emitir USDT
   - Validación de configuración
   - Manejo de errores robusto

✅ **Script Node.js**
   - Ejecutar emisiones desde terminal
   - Logging detallado de cada paso
   - Verificación de resultados

✅ **Auditoría y Seguridad**
   - Registro de todas las emisiones (timestamp, reason, amount)
   - Verificación de balance en blockchain
   - Confirmación en Etherscan

## 🚀 Inicio Rápido

### 1. Deploy del Contrato
```bash
# En Remix IDE (https://remix.ethereum.org)
1. Copiar USDTMinter.sol
2. Compilar con v0.8.0+
3. Deploy en Ethereum Mainnet con MetaMask
4. Copiar dirección del contrato deployado
```

### 2. Configurar .env
```bash
ETH_RPC_URL=https://eth-mainnet.g.alchemy.com/v2/YOUR_API_KEY
ETH_PRIVATE_KEY=your_private_key_here
USDT_MINTER_ADDRESS=0x...  # Dirección del contrato deployado
```

### 3. Emitir USDT vía API
```bash
curl -X POST http://localhost:3000/api/usdt-minter/issue \
  -H "Content-Type: application/json" \
  -d '{
    "amount": 1000,
    "reason": "Bridge testing"
  }'
```

### 4. O Ejecutar Script
```bash
node blockchain/scripts/createMoreTokens.js
```

## 📋 Endpoints API

### POST `/api/usdt-minter/issue`
Emitir USDT al contrato

**Request:**
```json
{
  "amount": 1000,
  "reason": "Development testing"
}
```

**Response:**
```json
{
  "success": true,
  "txHash": "0x...",
  "blockNumber": 19850123,
  "amountIssued": 1000,
  "balanceAfter": "1000",
  "etherscanUrl": "https://etherscan.io/tx/0x..."
}
```

### GET `/api/usdt-minter/status`
Obtener estado del minter

**Response:**
```json
{
  "success": true,
  "status": "active",
  "minterBalance": "1000 USDT",
  "totalSupply": "1000 USDT",
  "totalIssueRecords": "5"
}
```

### POST `/api/usdt-minter/validate-setup`
Validar configuración del sistema

**Response:**
```json
{
  "success": true,
  "configuration": {
    "signerAddress": "0x...",
    "signerBalance": "0.5 ETH",
    "minterAddress": "0x...",
    "hasPrivateKey": true
  }
}
```

## 🔗 Integración con Bridge USD → USDT

El bridge automáticamente usa USDT Minter:

```typescript
// Frontend: Convertir 100 USD a USDT
const response = await fetch('/api/uniswap/swap', {
  method: 'POST',
  body: JSON.stringify({
    amount: 100,
    recipientAddress: '0x...'
  })
});

// Backend internamente:
// 1. Llama a /api/usdt-minter/issue para emitir USDT
// 2. Transfiere USDT al usuario
// 3. Retorna TX confirmada en blockchain
```

## 📊 Flujo de Transacción

```
Usuario Frontend
    ↓
POST /api/uniswap/swap (100 USD)
    ↓
Backend Express
    ├─ Calcula: 100 USD * 0.99 = 99 USDT (1% comisión)
    ├─ Verifica balance ETH del signer
    └─ Obtiene precio del oráculo Chainlink
    ↓
Backend → POST /api/usdt-minter/issue (99 USDT)
    ↓
USDT Minter Contract
    ├─ Verifica que msg.sender es owner
    ├─ Verifica que amount <= 1,000,000 USDT
    └─ Llama a USDT.issue(99000000) [con 6 decimales]
    ↓
USDT Real Contract (Tether)
    └─ Emite 99 USDT
    ↓
USDT Minter → Transferir 99 USDT al usuario
    ↓
Response con TX Hash
    ├─ txHash: "0x..."
    ├─ blockNumber: 19850123
    ├─ amountUSDT: 99
    ├─ oraclePrice: 1.0001
    └─ etherscanUrl: "https://etherscan.io/tx/0x..."
```

## 🔐 Seguridad

### ✅ Implementado

- **onlyOwner Modifier:** Solo el propietario puede emitir
- **Amount Validation:** Verifica que amount > 0
- **Rate Limiting:** Máximo 1 millón USDT por transacción
- **Audit Trail:** Registro de todas las operaciones
- **Error Handling:** Try-catch en todas las llamadas
- **Balance Verification:** Verifica que el signer tiene ETH

### ⚠️ Consideraciones

- **Private Key Security:** Nunca compartir la clave privada
- **Mainnet Only:** Este sistema opera en Ethereum Mainnet real
- **Gas Costs:** Cada transacción consume ETH de gas
- **Rate Limits:** Implementar límites en producción

## 🐛 Troubleshooting

| Error | Causa | Solución |
|-------|-------|----------|
| `USDT_MINTER_ADDRESS no configurada` | Variable de entorno faltante | Agregar al .env |
| `Balance ETH insuficiente` | Signer sin ETH | Enviar 0.1 ETH al signer |
| `Permission Denied` | Signer no es owner | Usar private key del owner |
| `RPC Error` | URL de RPC inválido | Verificar ETH_RPC_URL |
| `Exceeds max issue` | Cantidad muy alta | Reducir cantidad o cambiar límite |

## 📚 Documentación

- **USDT_MINTER_GUIA_COMPLETA.md** - Guía paso a paso completa
- **blockchain/USDT_MINTER_EJEMPLOS.js** - Ejemplos de código

## 🔗 Enlaces Útiles

- **Remix IDE:** https://remix.ethereum.org
- **Etherscan Mainnet:** https://etherscan.io
- **USDT Contrato:** https://etherscan.io/token/0xdac17f958d2ee523a2206206994597c13d831ec7
- **Alchemy RPC:** https://www.alchemy.com

## 📞 Soporte

Para problemas:
1. Revisar **Troubleshooting** arriba
2. Verificar **USDT_MINTER_GUIA_COMPLETA.md**
3. Revisar logs del servidor: `npm run dev:full`

---

**Creado para:** DAES CoreBanking System
**Red:** Ethereum Mainnet
**Version:** 1.0.0
**Último actualizado:** 2025-01-03



> **Contrato Intermedio para Emitir Más USDT en Ethereum Mainnet**

## 📊 Visión General

```
┌─────────────────────────────────────────────────────────────┐
│                    USDT MINTER SYSTEM                       │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  1. USUARIO SOLICITA CONVERSIÓN USD → USDT                  │
│         ↓                                                    │
│  2. BACKEND CALCULA CANTIDAD (1:1 - 1% comisión)           │
│         ↓                                                    │
│  3. CONTRATO USDT MINTER EMITE NUEVOS USDT                 │
│         ↓                                                    │
│  4. USDT SE TRANSFIERE AL USUARIO                           │
│         ↓                                                    │
│  5. RESPUESTA CON TX HASH + ETHERSCAN LINK                 │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

## 🏗️ Arquitectura

```
blockchain/
├── contracts/
│   └── USDTMinter.sol               [Contrato en Solidity]
│       ├── issueUSDT()              [Emitir USDT]
│       ├── transferUSDT()           [Transferir USDT]
│       ├── getBalance()             [Ver balance]
│       └── getIssueRecords()        [Auditoría]
│
└── scripts/
    └── createMoreTokens.js          [Script Node.js para emitir]

server/
├── routes/
│   └── usdt-minter-routes.js        [Rutas API Backend]
│       ├── POST /api/usdt-minter/issue
│       ├── GET /api/usdt-minter/status
│       └── POST /api/usdt-minter/validate-setup
│
└── index.js                         [Registra rutas]

USDT_MINTER_GUIA_COMPLETA.md        [Guía paso a paso]
blockchain/USDT_MINTER_EJEMPLOS.js  [Ejemplos de uso]
```

## 🔑 Características

✅ **Contrato Intermedio Seguro**
   - Solo el propietario puede emitir USDT
   - Límites de emisión por transacción
   - Auditoría completa de todas las emisiones

✅ **Integración Backend**
   - API REST para emitir USDT
   - Validación de configuración
   - Manejo de errores robusto

✅ **Script Node.js**
   - Ejecutar emisiones desde terminal
   - Logging detallado de cada paso
   - Verificación de resultados

✅ **Auditoría y Seguridad**
   - Registro de todas las emisiones (timestamp, reason, amount)
   - Verificación de balance en blockchain
   - Confirmación en Etherscan

## 🚀 Inicio Rápido

### 1. Deploy del Contrato
```bash
# En Remix IDE (https://remix.ethereum.org)
1. Copiar USDTMinter.sol
2. Compilar con v0.8.0+
3. Deploy en Ethereum Mainnet con MetaMask
4. Copiar dirección del contrato deployado
```

### 2. Configurar .env
```bash
ETH_RPC_URL=https://eth-mainnet.g.alchemy.com/v2/YOUR_API_KEY
ETH_PRIVATE_KEY=your_private_key_here
USDT_MINTER_ADDRESS=0x...  # Dirección del contrato deployado
```

### 3. Emitir USDT vía API
```bash
curl -X POST http://localhost:3000/api/usdt-minter/issue \
  -H "Content-Type: application/json" \
  -d '{
    "amount": 1000,
    "reason": "Bridge testing"
  }'
```

### 4. O Ejecutar Script
```bash
node blockchain/scripts/createMoreTokens.js
```

## 📋 Endpoints API

### POST `/api/usdt-minter/issue`
Emitir USDT al contrato

**Request:**
```json
{
  "amount": 1000,
  "reason": "Development testing"
}
```

**Response:**
```json
{
  "success": true,
  "txHash": "0x...",
  "blockNumber": 19850123,
  "amountIssued": 1000,
  "balanceAfter": "1000",
  "etherscanUrl": "https://etherscan.io/tx/0x..."
}
```

### GET `/api/usdt-minter/status`
Obtener estado del minter

**Response:**
```json
{
  "success": true,
  "status": "active",
  "minterBalance": "1000 USDT",
  "totalSupply": "1000 USDT",
  "totalIssueRecords": "5"
}
```

### POST `/api/usdt-minter/validate-setup`
Validar configuración del sistema

**Response:**
```json
{
  "success": true,
  "configuration": {
    "signerAddress": "0x...",
    "signerBalance": "0.5 ETH",
    "minterAddress": "0x...",
    "hasPrivateKey": true
  }
}
```

## 🔗 Integración con Bridge USD → USDT

El bridge automáticamente usa USDT Minter:

```typescript
// Frontend: Convertir 100 USD a USDT
const response = await fetch('/api/uniswap/swap', {
  method: 'POST',
  body: JSON.stringify({
    amount: 100,
    recipientAddress: '0x...'
  })
});

// Backend internamente:
// 1. Llama a /api/usdt-minter/issue para emitir USDT
// 2. Transfiere USDT al usuario
// 3. Retorna TX confirmada en blockchain
```

## 📊 Flujo de Transacción

```
Usuario Frontend
    ↓
POST /api/uniswap/swap (100 USD)
    ↓
Backend Express
    ├─ Calcula: 100 USD * 0.99 = 99 USDT (1% comisión)
    ├─ Verifica balance ETH del signer
    └─ Obtiene precio del oráculo Chainlink
    ↓
Backend → POST /api/usdt-minter/issue (99 USDT)
    ↓
USDT Minter Contract
    ├─ Verifica que msg.sender es owner
    ├─ Verifica que amount <= 1,000,000 USDT
    └─ Llama a USDT.issue(99000000) [con 6 decimales]
    ↓
USDT Real Contract (Tether)
    └─ Emite 99 USDT
    ↓
USDT Minter → Transferir 99 USDT al usuario
    ↓
Response con TX Hash
    ├─ txHash: "0x..."
    ├─ blockNumber: 19850123
    ├─ amountUSDT: 99
    ├─ oraclePrice: 1.0001
    └─ etherscanUrl: "https://etherscan.io/tx/0x..."
```

## 🔐 Seguridad

### ✅ Implementado

- **onlyOwner Modifier:** Solo el propietario puede emitir
- **Amount Validation:** Verifica que amount > 0
- **Rate Limiting:** Máximo 1 millón USDT por transacción
- **Audit Trail:** Registro de todas las operaciones
- **Error Handling:** Try-catch en todas las llamadas
- **Balance Verification:** Verifica que el signer tiene ETH

### ⚠️ Consideraciones

- **Private Key Security:** Nunca compartir la clave privada
- **Mainnet Only:** Este sistema opera en Ethereum Mainnet real
- **Gas Costs:** Cada transacción consume ETH de gas
- **Rate Limits:** Implementar límites en producción

## 🐛 Troubleshooting

| Error | Causa | Solución |
|-------|-------|----------|
| `USDT_MINTER_ADDRESS no configurada` | Variable de entorno faltante | Agregar al .env |
| `Balance ETH insuficiente` | Signer sin ETH | Enviar 0.1 ETH al signer |
| `Permission Denied` | Signer no es owner | Usar private key del owner |
| `RPC Error` | URL de RPC inválido | Verificar ETH_RPC_URL |
| `Exceeds max issue` | Cantidad muy alta | Reducir cantidad o cambiar límite |

## 📚 Documentación

- **USDT_MINTER_GUIA_COMPLETA.md** - Guía paso a paso completa
- **blockchain/USDT_MINTER_EJEMPLOS.js** - Ejemplos de código

## 🔗 Enlaces Útiles

- **Remix IDE:** https://remix.ethereum.org
- **Etherscan Mainnet:** https://etherscan.io
- **USDT Contrato:** https://etherscan.io/token/0xdac17f958d2ee523a2206206994597c13d831ec7
- **Alchemy RPC:** https://www.alchemy.com

## 📞 Soporte

Para problemas:
1. Revisar **Troubleshooting** arriba
2. Verificar **USDT_MINTER_GUIA_COMPLETA.md**
3. Revisar logs del servidor: `npm run dev:full`

---

**Creado para:** DAES CoreBanking System
**Red:** Ethereum Mainnet
**Version:** 1.0.0
**Último actualizado:** 2025-01-03



> **Contrato Intermedio para Emitir Más USDT en Ethereum Mainnet**

## 📊 Visión General

```
┌─────────────────────────────────────────────────────────────┐
│                    USDT MINTER SYSTEM                       │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  1. USUARIO SOLICITA CONVERSIÓN USD → USDT                  │
│         ↓                                                    │
│  2. BACKEND CALCULA CANTIDAD (1:1 - 1% comisión)           │
│         ↓                                                    │
│  3. CONTRATO USDT MINTER EMITE NUEVOS USDT                 │
│         ↓                                                    │
│  4. USDT SE TRANSFIERE AL USUARIO                           │
│         ↓                                                    │
│  5. RESPUESTA CON TX HASH + ETHERSCAN LINK                 │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

## 🏗️ Arquitectura

```
blockchain/
├── contracts/
│   └── USDTMinter.sol               [Contrato en Solidity]
│       ├── issueUSDT()              [Emitir USDT]
│       ├── transferUSDT()           [Transferir USDT]
│       ├── getBalance()             [Ver balance]
│       └── getIssueRecords()        [Auditoría]
│
└── scripts/
    └── createMoreTokens.js          [Script Node.js para emitir]

server/
├── routes/
│   └── usdt-minter-routes.js        [Rutas API Backend]
│       ├── POST /api/usdt-minter/issue
│       ├── GET /api/usdt-minter/status
│       └── POST /api/usdt-minter/validate-setup
│
└── index.js                         [Registra rutas]

USDT_MINTER_GUIA_COMPLETA.md        [Guía paso a paso]
blockchain/USDT_MINTER_EJEMPLOS.js  [Ejemplos de uso]
```

## 🔑 Características

✅ **Contrato Intermedio Seguro**
   - Solo el propietario puede emitir USDT
   - Límites de emisión por transacción
   - Auditoría completa de todas las emisiones

✅ **Integración Backend**
   - API REST para emitir USDT
   - Validación de configuración
   - Manejo de errores robusto

✅ **Script Node.js**
   - Ejecutar emisiones desde terminal
   - Logging detallado de cada paso
   - Verificación de resultados

✅ **Auditoría y Seguridad**
   - Registro de todas las emisiones (timestamp, reason, amount)
   - Verificación de balance en blockchain
   - Confirmación en Etherscan

## 🚀 Inicio Rápido

### 1. Deploy del Contrato
```bash
# En Remix IDE (https://remix.ethereum.org)
1. Copiar USDTMinter.sol
2. Compilar con v0.8.0+
3. Deploy en Ethereum Mainnet con MetaMask
4. Copiar dirección del contrato deployado
```

### 2. Configurar .env
```bash
ETH_RPC_URL=https://eth-mainnet.g.alchemy.com/v2/YOUR_API_KEY
ETH_PRIVATE_KEY=your_private_key_here
USDT_MINTER_ADDRESS=0x...  # Dirección del contrato deployado
```

### 3. Emitir USDT vía API
```bash
curl -X POST http://localhost:3000/api/usdt-minter/issue \
  -H "Content-Type: application/json" \
  -d '{
    "amount": 1000,
    "reason": "Bridge testing"
  }'
```

### 4. O Ejecutar Script
```bash
node blockchain/scripts/createMoreTokens.js
```

## 📋 Endpoints API

### POST `/api/usdt-minter/issue`
Emitir USDT al contrato

**Request:**
```json
{
  "amount": 1000,
  "reason": "Development testing"
}
```

**Response:**
```json
{
  "success": true,
  "txHash": "0x...",
  "blockNumber": 19850123,
  "amountIssued": 1000,
  "balanceAfter": "1000",
  "etherscanUrl": "https://etherscan.io/tx/0x..."
}
```

### GET `/api/usdt-minter/status`
Obtener estado del minter

**Response:**
```json
{
  "success": true,
  "status": "active",
  "minterBalance": "1000 USDT",
  "totalSupply": "1000 USDT",
  "totalIssueRecords": "5"
}
```

### POST `/api/usdt-minter/validate-setup`
Validar configuración del sistema

**Response:**
```json
{
  "success": true,
  "configuration": {
    "signerAddress": "0x...",
    "signerBalance": "0.5 ETH",
    "minterAddress": "0x...",
    "hasPrivateKey": true
  }
}
```

## 🔗 Integración con Bridge USD → USDT

El bridge automáticamente usa USDT Minter:

```typescript
// Frontend: Convertir 100 USD a USDT
const response = await fetch('/api/uniswap/swap', {
  method: 'POST',
  body: JSON.stringify({
    amount: 100,
    recipientAddress: '0x...'
  })
});

// Backend internamente:
// 1. Llama a /api/usdt-minter/issue para emitir USDT
// 2. Transfiere USDT al usuario
// 3. Retorna TX confirmada en blockchain
```

## 📊 Flujo de Transacción

```
Usuario Frontend
    ↓
POST /api/uniswap/swap (100 USD)
    ↓
Backend Express
    ├─ Calcula: 100 USD * 0.99 = 99 USDT (1% comisión)
    ├─ Verifica balance ETH del signer
    └─ Obtiene precio del oráculo Chainlink
    ↓
Backend → POST /api/usdt-minter/issue (99 USDT)
    ↓
USDT Minter Contract
    ├─ Verifica que msg.sender es owner
    ├─ Verifica que amount <= 1,000,000 USDT
    └─ Llama a USDT.issue(99000000) [con 6 decimales]
    ↓
USDT Real Contract (Tether)
    └─ Emite 99 USDT
    ↓
USDT Minter → Transferir 99 USDT al usuario
    ↓
Response con TX Hash
    ├─ txHash: "0x..."
    ├─ blockNumber: 19850123
    ├─ amountUSDT: 99
    ├─ oraclePrice: 1.0001
    └─ etherscanUrl: "https://etherscan.io/tx/0x..."
```

## 🔐 Seguridad

### ✅ Implementado

- **onlyOwner Modifier:** Solo el propietario puede emitir
- **Amount Validation:** Verifica que amount > 0
- **Rate Limiting:** Máximo 1 millón USDT por transacción
- **Audit Trail:** Registro de todas las operaciones
- **Error Handling:** Try-catch en todas las llamadas
- **Balance Verification:** Verifica que el signer tiene ETH

### ⚠️ Consideraciones

- **Private Key Security:** Nunca compartir la clave privada
- **Mainnet Only:** Este sistema opera en Ethereum Mainnet real
- **Gas Costs:** Cada transacción consume ETH de gas
- **Rate Limits:** Implementar límites en producción

## 🐛 Troubleshooting

| Error | Causa | Solución |
|-------|-------|----------|
| `USDT_MINTER_ADDRESS no configurada` | Variable de entorno faltante | Agregar al .env |
| `Balance ETH insuficiente` | Signer sin ETH | Enviar 0.1 ETH al signer |
| `Permission Denied` | Signer no es owner | Usar private key del owner |
| `RPC Error` | URL de RPC inválido | Verificar ETH_RPC_URL |
| `Exceeds max issue` | Cantidad muy alta | Reducir cantidad o cambiar límite |

## 📚 Documentación

- **USDT_MINTER_GUIA_COMPLETA.md** - Guía paso a paso completa
- **blockchain/USDT_MINTER_EJEMPLOS.js** - Ejemplos de código

## 🔗 Enlaces Útiles

- **Remix IDE:** https://remix.ethereum.org
- **Etherscan Mainnet:** https://etherscan.io
- **USDT Contrato:** https://etherscan.io/token/0xdac17f958d2ee523a2206206994597c13d831ec7
- **Alchemy RPC:** https://www.alchemy.com

## 📞 Soporte

Para problemas:
1. Revisar **Troubleshooting** arriba
2. Verificar **USDT_MINTER_GUIA_COMPLETA.md**
3. Revisar logs del servidor: `npm run dev:full`

---

**Creado para:** DAES CoreBanking System
**Red:** Ethereum Mainnet
**Version:** 1.0.0
**Último actualizado:** 2025-01-03



> **Contrato Intermedio para Emitir Más USDT en Ethereum Mainnet**

## 📊 Visión General

```
┌─────────────────────────────────────────────────────────────┐
│                    USDT MINTER SYSTEM                       │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  1. USUARIO SOLICITA CONVERSIÓN USD → USDT                  │
│         ↓                                                    │
│  2. BACKEND CALCULA CANTIDAD (1:1 - 1% comisión)           │
│         ↓                                                    │
│  3. CONTRATO USDT MINTER EMITE NUEVOS USDT                 │
│         ↓                                                    │
│  4. USDT SE TRANSFIERE AL USUARIO                           │
│         ↓                                                    │
│  5. RESPUESTA CON TX HASH + ETHERSCAN LINK                 │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

## 🏗️ Arquitectura

```
blockchain/
├── contracts/
│   └── USDTMinter.sol               [Contrato en Solidity]
│       ├── issueUSDT()              [Emitir USDT]
│       ├── transferUSDT()           [Transferir USDT]
│       ├── getBalance()             [Ver balance]
│       └── getIssueRecords()        [Auditoría]
│
└── scripts/
    └── createMoreTokens.js          [Script Node.js para emitir]

server/
├── routes/
│   └── usdt-minter-routes.js        [Rutas API Backend]
│       ├── POST /api/usdt-minter/issue
│       ├── GET /api/usdt-minter/status
│       └── POST /api/usdt-minter/validate-setup
│
└── index.js                         [Registra rutas]

USDT_MINTER_GUIA_COMPLETA.md        [Guía paso a paso]
blockchain/USDT_MINTER_EJEMPLOS.js  [Ejemplos de uso]
```

## 🔑 Características

✅ **Contrato Intermedio Seguro**
   - Solo el propietario puede emitir USDT
   - Límites de emisión por transacción
   - Auditoría completa de todas las emisiones

✅ **Integración Backend**
   - API REST para emitir USDT
   - Validación de configuración
   - Manejo de errores robusto

✅ **Script Node.js**
   - Ejecutar emisiones desde terminal
   - Logging detallado de cada paso
   - Verificación de resultados

✅ **Auditoría y Seguridad**
   - Registro de todas las emisiones (timestamp, reason, amount)
   - Verificación de balance en blockchain
   - Confirmación en Etherscan

## 🚀 Inicio Rápido

### 1. Deploy del Contrato
```bash
# En Remix IDE (https://remix.ethereum.org)
1. Copiar USDTMinter.sol
2. Compilar con v0.8.0+
3. Deploy en Ethereum Mainnet con MetaMask
4. Copiar dirección del contrato deployado
```

### 2. Configurar .env
```bash
ETH_RPC_URL=https://eth-mainnet.g.alchemy.com/v2/YOUR_API_KEY
ETH_PRIVATE_KEY=your_private_key_here
USDT_MINTER_ADDRESS=0x...  # Dirección del contrato deployado
```

### 3. Emitir USDT vía API
```bash
curl -X POST http://localhost:3000/api/usdt-minter/issue \
  -H "Content-Type: application/json" \
  -d '{
    "amount": 1000,
    "reason": "Bridge testing"
  }'
```

### 4. O Ejecutar Script
```bash
node blockchain/scripts/createMoreTokens.js
```

## 📋 Endpoints API

### POST `/api/usdt-minter/issue`
Emitir USDT al contrato

**Request:**
```json
{
  "amount": 1000,
  "reason": "Development testing"
}
```

**Response:**
```json
{
  "success": true,
  "txHash": "0x...",
  "blockNumber": 19850123,
  "amountIssued": 1000,
  "balanceAfter": "1000",
  "etherscanUrl": "https://etherscan.io/tx/0x..."
}
```

### GET `/api/usdt-minter/status`
Obtener estado del minter

**Response:**
```json
{
  "success": true,
  "status": "active",
  "minterBalance": "1000 USDT",
  "totalSupply": "1000 USDT",
  "totalIssueRecords": "5"
}
```

### POST `/api/usdt-minter/validate-setup`
Validar configuración del sistema

**Response:**
```json
{
  "success": true,
  "configuration": {
    "signerAddress": "0x...",
    "signerBalance": "0.5 ETH",
    "minterAddress": "0x...",
    "hasPrivateKey": true
  }
}
```

## 🔗 Integración con Bridge USD → USDT

El bridge automáticamente usa USDT Minter:

```typescript
// Frontend: Convertir 100 USD a USDT
const response = await fetch('/api/uniswap/swap', {
  method: 'POST',
  body: JSON.stringify({
    amount: 100,
    recipientAddress: '0x...'
  })
});

// Backend internamente:
// 1. Llama a /api/usdt-minter/issue para emitir USDT
// 2. Transfiere USDT al usuario
// 3. Retorna TX confirmada en blockchain
```

## 📊 Flujo de Transacción

```
Usuario Frontend
    ↓
POST /api/uniswap/swap (100 USD)
    ↓
Backend Express
    ├─ Calcula: 100 USD * 0.99 = 99 USDT (1% comisión)
    ├─ Verifica balance ETH del signer
    └─ Obtiene precio del oráculo Chainlink
    ↓
Backend → POST /api/usdt-minter/issue (99 USDT)
    ↓
USDT Minter Contract
    ├─ Verifica que msg.sender es owner
    ├─ Verifica que amount <= 1,000,000 USDT
    └─ Llama a USDT.issue(99000000) [con 6 decimales]
    ↓
USDT Real Contract (Tether)
    └─ Emite 99 USDT
    ↓
USDT Minter → Transferir 99 USDT al usuario
    ↓
Response con TX Hash
    ├─ txHash: "0x..."
    ├─ blockNumber: 19850123
    ├─ amountUSDT: 99
    ├─ oraclePrice: 1.0001
    └─ etherscanUrl: "https://etherscan.io/tx/0x..."
```

## 🔐 Seguridad

### ✅ Implementado

- **onlyOwner Modifier:** Solo el propietario puede emitir
- **Amount Validation:** Verifica que amount > 0
- **Rate Limiting:** Máximo 1 millón USDT por transacción
- **Audit Trail:** Registro de todas las operaciones
- **Error Handling:** Try-catch en todas las llamadas
- **Balance Verification:** Verifica que el signer tiene ETH

### ⚠️ Consideraciones

- **Private Key Security:** Nunca compartir la clave privada
- **Mainnet Only:** Este sistema opera en Ethereum Mainnet real
- **Gas Costs:** Cada transacción consume ETH de gas
- **Rate Limits:** Implementar límites en producción

## 🐛 Troubleshooting

| Error | Causa | Solución |
|-------|-------|----------|
| `USDT_MINTER_ADDRESS no configurada` | Variable de entorno faltante | Agregar al .env |
| `Balance ETH insuficiente` | Signer sin ETH | Enviar 0.1 ETH al signer |
| `Permission Denied` | Signer no es owner | Usar private key del owner |
| `RPC Error` | URL de RPC inválido | Verificar ETH_RPC_URL |
| `Exceeds max issue` | Cantidad muy alta | Reducir cantidad o cambiar límite |

## 📚 Documentación

- **USDT_MINTER_GUIA_COMPLETA.md** - Guía paso a paso completa
- **blockchain/USDT_MINTER_EJEMPLOS.js** - Ejemplos de código

## 🔗 Enlaces Útiles

- **Remix IDE:** https://remix.ethereum.org
- **Etherscan Mainnet:** https://etherscan.io
- **USDT Contrato:** https://etherscan.io/token/0xdac17f958d2ee523a2206206994597c13d831ec7
- **Alchemy RPC:** https://www.alchemy.com

## 📞 Soporte

Para problemas:
1. Revisar **Troubleshooting** arriba
2. Verificar **USDT_MINTER_GUIA_COMPLETA.md**
3. Revisar logs del servidor: `npm run dev:full`

---

**Creado para:** DAES CoreBanking System
**Red:** Ethereum Mainnet
**Version:** 1.0.0
**Último actualizado:** 2025-01-03



> **Contrato Intermedio para Emitir Más USDT en Ethereum Mainnet**

## 📊 Visión General

```
┌─────────────────────────────────────────────────────────────┐
│                    USDT MINTER SYSTEM                       │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  1. USUARIO SOLICITA CONVERSIÓN USD → USDT                  │
│         ↓                                                    │
│  2. BACKEND CALCULA CANTIDAD (1:1 - 1% comisión)           │
│         ↓                                                    │
│  3. CONTRATO USDT MINTER EMITE NUEVOS USDT                 │
│         ↓                                                    │
│  4. USDT SE TRANSFIERE AL USUARIO                           │
│         ↓                                                    │
│  5. RESPUESTA CON TX HASH + ETHERSCAN LINK                 │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

## 🏗️ Arquitectura

```
blockchain/
├── contracts/
│   └── USDTMinter.sol               [Contrato en Solidity]
│       ├── issueUSDT()              [Emitir USDT]
│       ├── transferUSDT()           [Transferir USDT]
│       ├── getBalance()             [Ver balance]
│       └── getIssueRecords()        [Auditoría]
│
└── scripts/
    └── createMoreTokens.js          [Script Node.js para emitir]

server/
├── routes/
│   └── usdt-minter-routes.js        [Rutas API Backend]
│       ├── POST /api/usdt-minter/issue
│       ├── GET /api/usdt-minter/status
│       └── POST /api/usdt-minter/validate-setup
│
└── index.js                         [Registra rutas]

USDT_MINTER_GUIA_COMPLETA.md        [Guía paso a paso]
blockchain/USDT_MINTER_EJEMPLOS.js  [Ejemplos de uso]
```

## 🔑 Características

✅ **Contrato Intermedio Seguro**
   - Solo el propietario puede emitir USDT
   - Límites de emisión por transacción
   - Auditoría completa de todas las emisiones

✅ **Integración Backend**
   - API REST para emitir USDT
   - Validación de configuración
   - Manejo de errores robusto

✅ **Script Node.js**
   - Ejecutar emisiones desde terminal
   - Logging detallado de cada paso
   - Verificación de resultados

✅ **Auditoría y Seguridad**
   - Registro de todas las emisiones (timestamp, reason, amount)
   - Verificación de balance en blockchain
   - Confirmación en Etherscan

## 🚀 Inicio Rápido

### 1. Deploy del Contrato
```bash
# En Remix IDE (https://remix.ethereum.org)
1. Copiar USDTMinter.sol
2. Compilar con v0.8.0+
3. Deploy en Ethereum Mainnet con MetaMask
4. Copiar dirección del contrato deployado
```

### 2. Configurar .env
```bash
ETH_RPC_URL=https://eth-mainnet.g.alchemy.com/v2/YOUR_API_KEY
ETH_PRIVATE_KEY=your_private_key_here
USDT_MINTER_ADDRESS=0x...  # Dirección del contrato deployado
```

### 3. Emitir USDT vía API
```bash
curl -X POST http://localhost:3000/api/usdt-minter/issue \
  -H "Content-Type: application/json" \
  -d '{
    "amount": 1000,
    "reason": "Bridge testing"
  }'
```

### 4. O Ejecutar Script
```bash
node blockchain/scripts/createMoreTokens.js
```

## 📋 Endpoints API

### POST `/api/usdt-minter/issue`
Emitir USDT al contrato

**Request:**
```json
{
  "amount": 1000,
  "reason": "Development testing"
}
```

**Response:**
```json
{
  "success": true,
  "txHash": "0x...",
  "blockNumber": 19850123,
  "amountIssued": 1000,
  "balanceAfter": "1000",
  "etherscanUrl": "https://etherscan.io/tx/0x..."
}
```

### GET `/api/usdt-minter/status`
Obtener estado del minter

**Response:**
```json
{
  "success": true,
  "status": "active",
  "minterBalance": "1000 USDT",
  "totalSupply": "1000 USDT",
  "totalIssueRecords": "5"
}
```

### POST `/api/usdt-minter/validate-setup`
Validar configuración del sistema

**Response:**
```json
{
  "success": true,
  "configuration": {
    "signerAddress": "0x...",
    "signerBalance": "0.5 ETH",
    "minterAddress": "0x...",
    "hasPrivateKey": true
  }
}
```

## 🔗 Integración con Bridge USD → USDT

El bridge automáticamente usa USDT Minter:

```typescript
// Frontend: Convertir 100 USD a USDT
const response = await fetch('/api/uniswap/swap', {
  method: 'POST',
  body: JSON.stringify({
    amount: 100,
    recipientAddress: '0x...'
  })
});

// Backend internamente:
// 1. Llama a /api/usdt-minter/issue para emitir USDT
// 2. Transfiere USDT al usuario
// 3. Retorna TX confirmada en blockchain
```

## 📊 Flujo de Transacción

```
Usuario Frontend
    ↓
POST /api/uniswap/swap (100 USD)
    ↓
Backend Express
    ├─ Calcula: 100 USD * 0.99 = 99 USDT (1% comisión)
    ├─ Verifica balance ETH del signer
    └─ Obtiene precio del oráculo Chainlink
    ↓
Backend → POST /api/usdt-minter/issue (99 USDT)
    ↓
USDT Minter Contract
    ├─ Verifica que msg.sender es owner
    ├─ Verifica que amount <= 1,000,000 USDT
    └─ Llama a USDT.issue(99000000) [con 6 decimales]
    ↓
USDT Real Contract (Tether)
    └─ Emite 99 USDT
    ↓
USDT Minter → Transferir 99 USDT al usuario
    ↓
Response con TX Hash
    ├─ txHash: "0x..."
    ├─ blockNumber: 19850123
    ├─ amountUSDT: 99
    ├─ oraclePrice: 1.0001
    └─ etherscanUrl: "https://etherscan.io/tx/0x..."
```

## 🔐 Seguridad

### ✅ Implementado

- **onlyOwner Modifier:** Solo el propietario puede emitir
- **Amount Validation:** Verifica que amount > 0
- **Rate Limiting:** Máximo 1 millón USDT por transacción
- **Audit Trail:** Registro de todas las operaciones
- **Error Handling:** Try-catch en todas las llamadas
- **Balance Verification:** Verifica que el signer tiene ETH

### ⚠️ Consideraciones

- **Private Key Security:** Nunca compartir la clave privada
- **Mainnet Only:** Este sistema opera en Ethereum Mainnet real
- **Gas Costs:** Cada transacción consume ETH de gas
- **Rate Limits:** Implementar límites en producción

## 🐛 Troubleshooting

| Error | Causa | Solución |
|-------|-------|----------|
| `USDT_MINTER_ADDRESS no configurada` | Variable de entorno faltante | Agregar al .env |
| `Balance ETH insuficiente` | Signer sin ETH | Enviar 0.1 ETH al signer |
| `Permission Denied` | Signer no es owner | Usar private key del owner |
| `RPC Error` | URL de RPC inválido | Verificar ETH_RPC_URL |
| `Exceeds max issue` | Cantidad muy alta | Reducir cantidad o cambiar límite |

## 📚 Documentación

- **USDT_MINTER_GUIA_COMPLETA.md** - Guía paso a paso completa
- **blockchain/USDT_MINTER_EJEMPLOS.js** - Ejemplos de código

## 🔗 Enlaces Útiles

- **Remix IDE:** https://remix.ethereum.org
- **Etherscan Mainnet:** https://etherscan.io
- **USDT Contrato:** https://etherscan.io/token/0xdac17f958d2ee523a2206206994597c13d831ec7
- **Alchemy RPC:** https://www.alchemy.com

## 📞 Soporte

Para problemas:
1. Revisar **Troubleshooting** arriba
2. Verificar **USDT_MINTER_GUIA_COMPLETA.md**
3. Revisar logs del servidor: `npm run dev:full`

---

**Creado para:** DAES CoreBanking System
**Red:** Ethereum Mainnet
**Version:** 1.0.0
**Último actualizado:** 2025-01-03



> **Contrato Intermedio para Emitir Más USDT en Ethereum Mainnet**

## 📊 Visión General

```
┌─────────────────────────────────────────────────────────────┐
│                    USDT MINTER SYSTEM                       │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  1. USUARIO SOLICITA CONVERSIÓN USD → USDT                  │
│         ↓                                                    │
│  2. BACKEND CALCULA CANTIDAD (1:1 - 1% comisión)           │
│         ↓                                                    │
│  3. CONTRATO USDT MINTER EMITE NUEVOS USDT                 │
│         ↓                                                    │
│  4. USDT SE TRANSFIERE AL USUARIO                           │
│         ↓                                                    │
│  5. RESPUESTA CON TX HASH + ETHERSCAN LINK                 │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

## 🏗️ Arquitectura

```
blockchain/
├── contracts/
│   └── USDTMinter.sol               [Contrato en Solidity]
│       ├── issueUSDT()              [Emitir USDT]
│       ├── transferUSDT()           [Transferir USDT]
│       ├── getBalance()             [Ver balance]
│       └── getIssueRecords()        [Auditoría]
│
└── scripts/
    └── createMoreTokens.js          [Script Node.js para emitir]

server/
├── routes/
│   └── usdt-minter-routes.js        [Rutas API Backend]
│       ├── POST /api/usdt-minter/issue
│       ├── GET /api/usdt-minter/status
│       └── POST /api/usdt-minter/validate-setup
│
└── index.js                         [Registra rutas]

USDT_MINTER_GUIA_COMPLETA.md        [Guía paso a paso]
blockchain/USDT_MINTER_EJEMPLOS.js  [Ejemplos de uso]
```

## 🔑 Características

✅ **Contrato Intermedio Seguro**
   - Solo el propietario puede emitir USDT
   - Límites de emisión por transacción
   - Auditoría completa de todas las emisiones

✅ **Integración Backend**
   - API REST para emitir USDT
   - Validación de configuración
   - Manejo de errores robusto

✅ **Script Node.js**
   - Ejecutar emisiones desde terminal
   - Logging detallado de cada paso
   - Verificación de resultados

✅ **Auditoría y Seguridad**
   - Registro de todas las emisiones (timestamp, reason, amount)
   - Verificación de balance en blockchain
   - Confirmación en Etherscan

## 🚀 Inicio Rápido

### 1. Deploy del Contrato
```bash
# En Remix IDE (https://remix.ethereum.org)
1. Copiar USDTMinter.sol
2. Compilar con v0.8.0+
3. Deploy en Ethereum Mainnet con MetaMask
4. Copiar dirección del contrato deployado
```

### 2. Configurar .env
```bash
ETH_RPC_URL=https://eth-mainnet.g.alchemy.com/v2/YOUR_API_KEY
ETH_PRIVATE_KEY=your_private_key_here
USDT_MINTER_ADDRESS=0x...  # Dirección del contrato deployado
```

### 3. Emitir USDT vía API
```bash
curl -X POST http://localhost:3000/api/usdt-minter/issue \
  -H "Content-Type: application/json" \
  -d '{
    "amount": 1000,
    "reason": "Bridge testing"
  }'
```

### 4. O Ejecutar Script
```bash
node blockchain/scripts/createMoreTokens.js
```

## 📋 Endpoints API

### POST `/api/usdt-minter/issue`
Emitir USDT al contrato

**Request:**
```json
{
  "amount": 1000,
  "reason": "Development testing"
}
```

**Response:**
```json
{
  "success": true,
  "txHash": "0x...",
  "blockNumber": 19850123,
  "amountIssued": 1000,
  "balanceAfter": "1000",
  "etherscanUrl": "https://etherscan.io/tx/0x..."
}
```

### GET `/api/usdt-minter/status`
Obtener estado del minter

**Response:**
```json
{
  "success": true,
  "status": "active",
  "minterBalance": "1000 USDT",
  "totalSupply": "1000 USDT",
  "totalIssueRecords": "5"
}
```

### POST `/api/usdt-minter/validate-setup`
Validar configuración del sistema

**Response:**
```json
{
  "success": true,
  "configuration": {
    "signerAddress": "0x...",
    "signerBalance": "0.5 ETH",
    "minterAddress": "0x...",
    "hasPrivateKey": true
  }
}
```

## 🔗 Integración con Bridge USD → USDT

El bridge automáticamente usa USDT Minter:

```typescript
// Frontend: Convertir 100 USD a USDT
const response = await fetch('/api/uniswap/swap', {
  method: 'POST',
  body: JSON.stringify({
    amount: 100,
    recipientAddress: '0x...'
  })
});

// Backend internamente:
// 1. Llama a /api/usdt-minter/issue para emitir USDT
// 2. Transfiere USDT al usuario
// 3. Retorna TX confirmada en blockchain
```

## 📊 Flujo de Transacción

```
Usuario Frontend
    ↓
POST /api/uniswap/swap (100 USD)
    ↓
Backend Express
    ├─ Calcula: 100 USD * 0.99 = 99 USDT (1% comisión)
    ├─ Verifica balance ETH del signer
    └─ Obtiene precio del oráculo Chainlink
    ↓
Backend → POST /api/usdt-minter/issue (99 USDT)
    ↓
USDT Minter Contract
    ├─ Verifica que msg.sender es owner
    ├─ Verifica que amount <= 1,000,000 USDT
    └─ Llama a USDT.issue(99000000) [con 6 decimales]
    ↓
USDT Real Contract (Tether)
    └─ Emite 99 USDT
    ↓
USDT Minter → Transferir 99 USDT al usuario
    ↓
Response con TX Hash
    ├─ txHash: "0x..."
    ├─ blockNumber: 19850123
    ├─ amountUSDT: 99
    ├─ oraclePrice: 1.0001
    └─ etherscanUrl: "https://etherscan.io/tx/0x..."
```

## 🔐 Seguridad

### ✅ Implementado

- **onlyOwner Modifier:** Solo el propietario puede emitir
- **Amount Validation:** Verifica que amount > 0
- **Rate Limiting:** Máximo 1 millón USDT por transacción
- **Audit Trail:** Registro de todas las operaciones
- **Error Handling:** Try-catch en todas las llamadas
- **Balance Verification:** Verifica que el signer tiene ETH

### ⚠️ Consideraciones

- **Private Key Security:** Nunca compartir la clave privada
- **Mainnet Only:** Este sistema opera en Ethereum Mainnet real
- **Gas Costs:** Cada transacción consume ETH de gas
- **Rate Limits:** Implementar límites en producción

## 🐛 Troubleshooting

| Error | Causa | Solución |
|-------|-------|----------|
| `USDT_MINTER_ADDRESS no configurada` | Variable de entorno faltante | Agregar al .env |
| `Balance ETH insuficiente` | Signer sin ETH | Enviar 0.1 ETH al signer |
| `Permission Denied` | Signer no es owner | Usar private key del owner |
| `RPC Error` | URL de RPC inválido | Verificar ETH_RPC_URL |
| `Exceeds max issue` | Cantidad muy alta | Reducir cantidad o cambiar límite |

## 📚 Documentación

- **USDT_MINTER_GUIA_COMPLETA.md** - Guía paso a paso completa
- **blockchain/USDT_MINTER_EJEMPLOS.js** - Ejemplos de código

## 🔗 Enlaces Útiles

- **Remix IDE:** https://remix.ethereum.org
- **Etherscan Mainnet:** https://etherscan.io
- **USDT Contrato:** https://etherscan.io/token/0xdac17f958d2ee523a2206206994597c13d831ec7
- **Alchemy RPC:** https://www.alchemy.com

## 📞 Soporte

Para problemas:
1. Revisar **Troubleshooting** arriba
2. Verificar **USDT_MINTER_GUIA_COMPLETA.md**
3. Revisar logs del servidor: `npm run dev:full`

---

**Creado para:** DAES CoreBanking System
**Red:** Ethereum Mainnet
**Version:** 1.0.0
**Último actualizado:** 2025-01-03





