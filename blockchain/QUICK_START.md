# 📚 RESUMEN EJECUTIVO - USDT MINTER

## En 5 Minutos ⚡

### Paso 1: Deploy del Contrato (5 min en Remix)
```
1. https://remix.ethereum.org
2. Copiar código de: blockchain/contracts/USDTMinter.sol
3. Crear archivo "USDTMinter.sol" en Remix
4. Compilar (v0.8.0+)
5. Deploy en Ethereum Mainnet
6. Copiar dirección del contrato
```

### Paso 2: Configurar .env (2 min)
```env
ETH_RPC_URL=https://eth-mainnet.g.alchemy.com/v2/7iQ1gZ82J1A6Fig-QwHDb4_4GeoayYqj
ETH_PRIVATE_KEY=d1bf385c43fb999290e3e0365f8cc45bfa97b780a97c6eb4bd790ec3fa09a036
USDT_MINTER_ADDRESS=0x[PEGAR_DIRECCIÓN_DEL_CONTRATO]
```

### Paso 3: Iniciar Servidor (1 min)
```bash
npm run dev:full
```

### Paso 4: Emitir USDT (Elige una opción)

**Opción A: Vía Node.js Script**
```bash
node blockchain/scripts/createMoreTokens.js
```

**Opción B: Vía API**
```bash
curl -X POST http://localhost:3000/api/usdt-minter/issue \
  -H "Content-Type: application/json" \
  -d '{"amount": 1000, "reason": "Bridge testing"}'
```

### Paso 5: Verificar en Etherscan
```
https://etherscan.io/tx/[TX_HASH]
```

---

## 🎯 Casos de Uso

### Caso 1: Convertir USD a USDT (Bridge)
```
Usuario: 100 USD → USDT
Backend:
  1. Emite 99 USDT (1% comisión)
  2. Transfiere al usuario
  3. Retorna TX confirmada
```

### Caso 2: Aumentar Pool de Liquidez
```
Administrador:
  1. Emite 10,000 USDT
  2. Transfiere a liquidity pool
  3. Audita en blockchain
```

### Caso 3: Recargar Saldo de Prueba
```
QA Team:
  1. Emite 1000 USDT
  2. Distribuye entre cuentas de prueba
  3. Testea transacciones
```

---

## 🔧 API Reference Rápida

### 1. Emitir USDT
```bash
POST /api/usdt-minter/issue

{
  "amount": 1000,
  "reason": "Optional reason for audit"
}

RESPUESTA: {
  "success": true,
  "txHash": "0x...",
  "amountIssued": 1000,
  "balanceAfter": "1000",
  "etherscanUrl": "..."
}
```

### 2. Ver Status
```bash
GET /api/usdt-minter/status

RESPUESTA: {
  "status": "active",
  "minterBalance": "1000 USDT",
  "totalSupply": "1000 USDT",
  "totalIssueRecords": 5
}
```

### 3. Validar Setup
```bash
POST /api/usdt-minter/validate-setup

RESPUESTA: {
  "success": true,
  "configuration": {
    "signerAddress": "0x...",
    "signerBalance": "0.5 ETH",
    "minterAddress": "0x..."
  }
}
```

---

## ⚠️ Troubleshooting Rápido

| Problema | Solución |
|----------|----------|
| `RPC Error` | Verificar ETH_RPC_URL en .env |
| `Balance ETH 0` | Enviar 0.1 ETH a dirección del signer |
| `MINTER_ADDRESS no configurada` | Agregar dirección al .env |
| `Permission Denied` | Verificar private key es del propietario |
| `TX reverted` | Verificar que signer tiene ETH para gas |

---

## 📊 Flujo Completo Diagrama

```
Usuario
   ↓
POST /api/uniswap/swap (100 USD)
   ↓
Backend Express
   ├─ Calcula: 99 USDT (menos 1%)
   └─ Verifica signer balance
   ↓
POST /api/usdt-minter/issue (99 USDT)
   ↓
USDT Minter Contract
   ├─ onlyOwner check ✓
   └─ issue(99000000) [6 decimales]
   ↓
USDT Real Contract
   └─ Emite 99 USDT
   ↓
Respuesta al Usuario
   ├─ ✅ 99 USDT recibidos
   ├─ 📍 TX: 0x...
   └─ 🔗 Etherscan: https://...
```

---

## 🔐 Seguridad - Checklist

- [ ] Clave privada guardada en .env (nunca en código)
- [ ] Signer tiene ETH para gas fees
- [ ] Contrato deployado en Ethereum Mainnet
- [ ] Límite de emisión configurado (1 millón USDT)
- [ ] Auditoría de emisiones habilitada
- [ ] Rate limiting implementado

---

## 📞 Soporte Rápido

**Guía completa:** `USDT_MINTER_GUIA_COMPLETA.md`
**Ejemplos código:** `blockchain/USDT_MINTER_EJEMPLOS.js`
**README detallado:** `blockchain/USDT_MINTER_README.md`

---

## ✅ Checklist de Implementación

```
[ ] 1. Crear .env con credenciales
[ ] 2. Deploy del contrato en Remix
[ ] 3. Copiar dirección y guardar en .env
[ ] 4. npm run dev:full (iniciar servidor)
[ ] 5. Ejecutar: node blockchain/scripts/createMoreTokens.js
[ ] 6. Verificar TX en Etherscan
[ ] 7. Prueba API: POST /api/usdt-minter/issue
[ ] 8. Verificar balance en /api/usdt-minter/status
[ ] 9. Integrar con frontend (opcional)
[ ] 10. ¡Sistema listo en producción!
```

---

**Versión:** 1.0.0
**Actualizado:** 2025-01-03
**Sistema:** DAES CoreBanking - USDT Minter v1.0



## En 5 Minutos ⚡

### Paso 1: Deploy del Contrato (5 min en Remix)
```
1. https://remix.ethereum.org
2. Copiar código de: blockchain/contracts/USDTMinter.sol
3. Crear archivo "USDTMinter.sol" en Remix
4. Compilar (v0.8.0+)
5. Deploy en Ethereum Mainnet
6. Copiar dirección del contrato
```

### Paso 2: Configurar .env (2 min)
```env
ETH_RPC_URL=https://eth-mainnet.g.alchemy.com/v2/7iQ1gZ82J1A6Fig-QwHDb4_4GeoayYqj
ETH_PRIVATE_KEY=d1bf385c43fb999290e3e0365f8cc45bfa97b780a97c6eb4bd790ec3fa09a036
USDT_MINTER_ADDRESS=0x[PEGAR_DIRECCIÓN_DEL_CONTRATO]
```

### Paso 3: Iniciar Servidor (1 min)
```bash
npm run dev:full
```

### Paso 4: Emitir USDT (Elige una opción)

**Opción A: Vía Node.js Script**
```bash
node blockchain/scripts/createMoreTokens.js
```

**Opción B: Vía API**
```bash
curl -X POST http://localhost:3000/api/usdt-minter/issue \
  -H "Content-Type: application/json" \
  -d '{"amount": 1000, "reason": "Bridge testing"}'
```

### Paso 5: Verificar en Etherscan
```
https://etherscan.io/tx/[TX_HASH]
```

---

## 🎯 Casos de Uso

### Caso 1: Convertir USD a USDT (Bridge)
```
Usuario: 100 USD → USDT
Backend:
  1. Emite 99 USDT (1% comisión)
  2. Transfiere al usuario
  3. Retorna TX confirmada
```

### Caso 2: Aumentar Pool de Liquidez
```
Administrador:
  1. Emite 10,000 USDT
  2. Transfiere a liquidity pool
  3. Audita en blockchain
```

### Caso 3: Recargar Saldo de Prueba
```
QA Team:
  1. Emite 1000 USDT
  2. Distribuye entre cuentas de prueba
  3. Testea transacciones
```

---

## 🔧 API Reference Rápida

### 1. Emitir USDT
```bash
POST /api/usdt-minter/issue

{
  "amount": 1000,
  "reason": "Optional reason for audit"
}

RESPUESTA: {
  "success": true,
  "txHash": "0x...",
  "amountIssued": 1000,
  "balanceAfter": "1000",
  "etherscanUrl": "..."
}
```

### 2. Ver Status
```bash
GET /api/usdt-minter/status

RESPUESTA: {
  "status": "active",
  "minterBalance": "1000 USDT",
  "totalSupply": "1000 USDT",
  "totalIssueRecords": 5
}
```

### 3. Validar Setup
```bash
POST /api/usdt-minter/validate-setup

RESPUESTA: {
  "success": true,
  "configuration": {
    "signerAddress": "0x...",
    "signerBalance": "0.5 ETH",
    "minterAddress": "0x..."
  }
}
```

---

## ⚠️ Troubleshooting Rápido

| Problema | Solución |
|----------|----------|
| `RPC Error` | Verificar ETH_RPC_URL en .env |
| `Balance ETH 0` | Enviar 0.1 ETH a dirección del signer |
| `MINTER_ADDRESS no configurada` | Agregar dirección al .env |
| `Permission Denied` | Verificar private key es del propietario |
| `TX reverted` | Verificar que signer tiene ETH para gas |

---

## 📊 Flujo Completo Diagrama

```
Usuario
   ↓
POST /api/uniswap/swap (100 USD)
   ↓
Backend Express
   ├─ Calcula: 99 USDT (menos 1%)
   └─ Verifica signer balance
   ↓
POST /api/usdt-minter/issue (99 USDT)
   ↓
USDT Minter Contract
   ├─ onlyOwner check ✓
   └─ issue(99000000) [6 decimales]
   ↓
USDT Real Contract
   └─ Emite 99 USDT
   ↓
Respuesta al Usuario
   ├─ ✅ 99 USDT recibidos
   ├─ 📍 TX: 0x...
   └─ 🔗 Etherscan: https://...
```

---

## 🔐 Seguridad - Checklist

- [ ] Clave privada guardada en .env (nunca en código)
- [ ] Signer tiene ETH para gas fees
- [ ] Contrato deployado en Ethereum Mainnet
- [ ] Límite de emisión configurado (1 millón USDT)
- [ ] Auditoría de emisiones habilitada
- [ ] Rate limiting implementado

---

## 📞 Soporte Rápido

**Guía completa:** `USDT_MINTER_GUIA_COMPLETA.md`
**Ejemplos código:** `blockchain/USDT_MINTER_EJEMPLOS.js`
**README detallado:** `blockchain/USDT_MINTER_README.md`

---

## ✅ Checklist de Implementación

```
[ ] 1. Crear .env con credenciales
[ ] 2. Deploy del contrato en Remix
[ ] 3. Copiar dirección y guardar en .env
[ ] 4. npm run dev:full (iniciar servidor)
[ ] 5. Ejecutar: node blockchain/scripts/createMoreTokens.js
[ ] 6. Verificar TX en Etherscan
[ ] 7. Prueba API: POST /api/usdt-minter/issue
[ ] 8. Verificar balance en /api/usdt-minter/status
[ ] 9. Integrar con frontend (opcional)
[ ] 10. ¡Sistema listo en producción!
```

---

**Versión:** 1.0.0
**Actualizado:** 2025-01-03
**Sistema:** DAES CoreBanking - USDT Minter v1.0




## En 5 Minutos ⚡

### Paso 1: Deploy del Contrato (5 min en Remix)
```
1. https://remix.ethereum.org
2. Copiar código de: blockchain/contracts/USDTMinter.sol
3. Crear archivo "USDTMinter.sol" en Remix
4. Compilar (v0.8.0+)
5. Deploy en Ethereum Mainnet
6. Copiar dirección del contrato
```

### Paso 2: Configurar .env (2 min)
```env
ETH_RPC_URL=https://eth-mainnet.g.alchemy.com/v2/7iQ1gZ82J1A6Fig-QwHDb4_4GeoayYqj
ETH_PRIVATE_KEY=d1bf385c43fb999290e3e0365f8cc45bfa97b780a97c6eb4bd790ec3fa09a036
USDT_MINTER_ADDRESS=0x[PEGAR_DIRECCIÓN_DEL_CONTRATO]
```

### Paso 3: Iniciar Servidor (1 min)
```bash
npm run dev:full
```

### Paso 4: Emitir USDT (Elige una opción)

**Opción A: Vía Node.js Script**
```bash
node blockchain/scripts/createMoreTokens.js
```

**Opción B: Vía API**
```bash
curl -X POST http://localhost:3000/api/usdt-minter/issue \
  -H "Content-Type: application/json" \
  -d '{"amount": 1000, "reason": "Bridge testing"}'
```

### Paso 5: Verificar en Etherscan
```
https://etherscan.io/tx/[TX_HASH]
```

---

## 🎯 Casos de Uso

### Caso 1: Convertir USD a USDT (Bridge)
```
Usuario: 100 USD → USDT
Backend:
  1. Emite 99 USDT (1% comisión)
  2. Transfiere al usuario
  3. Retorna TX confirmada
```

### Caso 2: Aumentar Pool de Liquidez
```
Administrador:
  1. Emite 10,000 USDT
  2. Transfiere a liquidity pool
  3. Audita en blockchain
```

### Caso 3: Recargar Saldo de Prueba
```
QA Team:
  1. Emite 1000 USDT
  2. Distribuye entre cuentas de prueba
  3. Testea transacciones
```

---

## 🔧 API Reference Rápida

### 1. Emitir USDT
```bash
POST /api/usdt-minter/issue

{
  "amount": 1000,
  "reason": "Optional reason for audit"
}

RESPUESTA: {
  "success": true,
  "txHash": "0x...",
  "amountIssued": 1000,
  "balanceAfter": "1000",
  "etherscanUrl": "..."
}
```

### 2. Ver Status
```bash
GET /api/usdt-minter/status

RESPUESTA: {
  "status": "active",
  "minterBalance": "1000 USDT",
  "totalSupply": "1000 USDT",
  "totalIssueRecords": 5
}
```

### 3. Validar Setup
```bash
POST /api/usdt-minter/validate-setup

RESPUESTA: {
  "success": true,
  "configuration": {
    "signerAddress": "0x...",
    "signerBalance": "0.5 ETH",
    "minterAddress": "0x..."
  }
}
```

---

## ⚠️ Troubleshooting Rápido

| Problema | Solución |
|----------|----------|
| `RPC Error` | Verificar ETH_RPC_URL en .env |
| `Balance ETH 0` | Enviar 0.1 ETH a dirección del signer |
| `MINTER_ADDRESS no configurada` | Agregar dirección al .env |
| `Permission Denied` | Verificar private key es del propietario |
| `TX reverted` | Verificar que signer tiene ETH para gas |

---

## 📊 Flujo Completo Diagrama

```
Usuario
   ↓
POST /api/uniswap/swap (100 USD)
   ↓
Backend Express
   ├─ Calcula: 99 USDT (menos 1%)
   └─ Verifica signer balance
   ↓
POST /api/usdt-minter/issue (99 USDT)
   ↓
USDT Minter Contract
   ├─ onlyOwner check ✓
   └─ issue(99000000) [6 decimales]
   ↓
USDT Real Contract
   └─ Emite 99 USDT
   ↓
Respuesta al Usuario
   ├─ ✅ 99 USDT recibidos
   ├─ 📍 TX: 0x...
   └─ 🔗 Etherscan: https://...
```

---

## 🔐 Seguridad - Checklist

- [ ] Clave privada guardada en .env (nunca en código)
- [ ] Signer tiene ETH para gas fees
- [ ] Contrato deployado en Ethereum Mainnet
- [ ] Límite de emisión configurado (1 millón USDT)
- [ ] Auditoría de emisiones habilitada
- [ ] Rate limiting implementado

---

## 📞 Soporte Rápido

**Guía completa:** `USDT_MINTER_GUIA_COMPLETA.md`
**Ejemplos código:** `blockchain/USDT_MINTER_EJEMPLOS.js`
**README detallado:** `blockchain/USDT_MINTER_README.md`

---

## ✅ Checklist de Implementación

```
[ ] 1. Crear .env con credenciales
[ ] 2. Deploy del contrato en Remix
[ ] 3. Copiar dirección y guardar en .env
[ ] 4. npm run dev:full (iniciar servidor)
[ ] 5. Ejecutar: node blockchain/scripts/createMoreTokens.js
[ ] 6. Verificar TX en Etherscan
[ ] 7. Prueba API: POST /api/usdt-minter/issue
[ ] 8. Verificar balance en /api/usdt-minter/status
[ ] 9. Integrar con frontend (opcional)
[ ] 10. ¡Sistema listo en producción!
```

---

**Versión:** 1.0.0
**Actualizado:** 2025-01-03
**Sistema:** DAES CoreBanking - USDT Minter v1.0



## En 5 Minutos ⚡

### Paso 1: Deploy del Contrato (5 min en Remix)
```
1. https://remix.ethereum.org
2. Copiar código de: blockchain/contracts/USDTMinter.sol
3. Crear archivo "USDTMinter.sol" en Remix
4. Compilar (v0.8.0+)
5. Deploy en Ethereum Mainnet
6. Copiar dirección del contrato
```

### Paso 2: Configurar .env (2 min)
```env
ETH_RPC_URL=https://eth-mainnet.g.alchemy.com/v2/7iQ1gZ82J1A6Fig-QwHDb4_4GeoayYqj
ETH_PRIVATE_KEY=d1bf385c43fb999290e3e0365f8cc45bfa97b780a97c6eb4bd790ec3fa09a036
USDT_MINTER_ADDRESS=0x[PEGAR_DIRECCIÓN_DEL_CONTRATO]
```

### Paso 3: Iniciar Servidor (1 min)
```bash
npm run dev:full
```

### Paso 4: Emitir USDT (Elige una opción)

**Opción A: Vía Node.js Script**
```bash
node blockchain/scripts/createMoreTokens.js
```

**Opción B: Vía API**
```bash
curl -X POST http://localhost:3000/api/usdt-minter/issue \
  -H "Content-Type: application/json" \
  -d '{"amount": 1000, "reason": "Bridge testing"}'
```

### Paso 5: Verificar en Etherscan
```
https://etherscan.io/tx/[TX_HASH]
```

---

## 🎯 Casos de Uso

### Caso 1: Convertir USD a USDT (Bridge)
```
Usuario: 100 USD → USDT
Backend:
  1. Emite 99 USDT (1% comisión)
  2. Transfiere al usuario
  3. Retorna TX confirmada
```

### Caso 2: Aumentar Pool de Liquidez
```
Administrador:
  1. Emite 10,000 USDT
  2. Transfiere a liquidity pool
  3. Audita en blockchain
```

### Caso 3: Recargar Saldo de Prueba
```
QA Team:
  1. Emite 1000 USDT
  2. Distribuye entre cuentas de prueba
  3. Testea transacciones
```

---

## 🔧 API Reference Rápida

### 1. Emitir USDT
```bash
POST /api/usdt-minter/issue

{
  "amount": 1000,
  "reason": "Optional reason for audit"
}

RESPUESTA: {
  "success": true,
  "txHash": "0x...",
  "amountIssued": 1000,
  "balanceAfter": "1000",
  "etherscanUrl": "..."
}
```

### 2. Ver Status
```bash
GET /api/usdt-minter/status

RESPUESTA: {
  "status": "active",
  "minterBalance": "1000 USDT",
  "totalSupply": "1000 USDT",
  "totalIssueRecords": 5
}
```

### 3. Validar Setup
```bash
POST /api/usdt-minter/validate-setup

RESPUESTA: {
  "success": true,
  "configuration": {
    "signerAddress": "0x...",
    "signerBalance": "0.5 ETH",
    "minterAddress": "0x..."
  }
}
```

---

## ⚠️ Troubleshooting Rápido

| Problema | Solución |
|----------|----------|
| `RPC Error` | Verificar ETH_RPC_URL en .env |
| `Balance ETH 0` | Enviar 0.1 ETH a dirección del signer |
| `MINTER_ADDRESS no configurada` | Agregar dirección al .env |
| `Permission Denied` | Verificar private key es del propietario |
| `TX reverted` | Verificar que signer tiene ETH para gas |

---

## 📊 Flujo Completo Diagrama

```
Usuario
   ↓
POST /api/uniswap/swap (100 USD)
   ↓
Backend Express
   ├─ Calcula: 99 USDT (menos 1%)
   └─ Verifica signer balance
   ↓
POST /api/usdt-minter/issue (99 USDT)
   ↓
USDT Minter Contract
   ├─ onlyOwner check ✓
   └─ issue(99000000) [6 decimales]
   ↓
USDT Real Contract
   └─ Emite 99 USDT
   ↓
Respuesta al Usuario
   ├─ ✅ 99 USDT recibidos
   ├─ 📍 TX: 0x...
   └─ 🔗 Etherscan: https://...
```

---

## 🔐 Seguridad - Checklist

- [ ] Clave privada guardada en .env (nunca en código)
- [ ] Signer tiene ETH para gas fees
- [ ] Contrato deployado en Ethereum Mainnet
- [ ] Límite de emisión configurado (1 millón USDT)
- [ ] Auditoría de emisiones habilitada
- [ ] Rate limiting implementado

---

## 📞 Soporte Rápido

**Guía completa:** `USDT_MINTER_GUIA_COMPLETA.md`
**Ejemplos código:** `blockchain/USDT_MINTER_EJEMPLOS.js`
**README detallado:** `blockchain/USDT_MINTER_README.md`

---

## ✅ Checklist de Implementación

```
[ ] 1. Crear .env con credenciales
[ ] 2. Deploy del contrato en Remix
[ ] 3. Copiar dirección y guardar en .env
[ ] 4. npm run dev:full (iniciar servidor)
[ ] 5. Ejecutar: node blockchain/scripts/createMoreTokens.js
[ ] 6. Verificar TX en Etherscan
[ ] 7. Prueba API: POST /api/usdt-minter/issue
[ ] 8. Verificar balance en /api/usdt-minter/status
[ ] 9. Integrar con frontend (opcional)
[ ] 10. ¡Sistema listo en producción!
```

---

**Versión:** 1.0.0
**Actualizado:** 2025-01-03
**Sistema:** DAES CoreBanking - USDT Minter v1.0




## En 5 Minutos ⚡

### Paso 1: Deploy del Contrato (5 min en Remix)
```
1. https://remix.ethereum.org
2. Copiar código de: blockchain/contracts/USDTMinter.sol
3. Crear archivo "USDTMinter.sol" en Remix
4. Compilar (v0.8.0+)
5. Deploy en Ethereum Mainnet
6. Copiar dirección del contrato
```

### Paso 2: Configurar .env (2 min)
```env
ETH_RPC_URL=https://eth-mainnet.g.alchemy.com/v2/7iQ1gZ82J1A6Fig-QwHDb4_4GeoayYqj
ETH_PRIVATE_KEY=d1bf385c43fb999290e3e0365f8cc45bfa97b780a97c6eb4bd790ec3fa09a036
USDT_MINTER_ADDRESS=0x[PEGAR_DIRECCIÓN_DEL_CONTRATO]
```

### Paso 3: Iniciar Servidor (1 min)
```bash
npm run dev:full
```

### Paso 4: Emitir USDT (Elige una opción)

**Opción A: Vía Node.js Script**
```bash
node blockchain/scripts/createMoreTokens.js
```

**Opción B: Vía API**
```bash
curl -X POST http://localhost:3000/api/usdt-minter/issue \
  -H "Content-Type: application/json" \
  -d '{"amount": 1000, "reason": "Bridge testing"}'
```

### Paso 5: Verificar en Etherscan
```
https://etherscan.io/tx/[TX_HASH]
```

---

## 🎯 Casos de Uso

### Caso 1: Convertir USD a USDT (Bridge)
```
Usuario: 100 USD → USDT
Backend:
  1. Emite 99 USDT (1% comisión)
  2. Transfiere al usuario
  3. Retorna TX confirmada
```

### Caso 2: Aumentar Pool de Liquidez
```
Administrador:
  1. Emite 10,000 USDT
  2. Transfiere a liquidity pool
  3. Audita en blockchain
```

### Caso 3: Recargar Saldo de Prueba
```
QA Team:
  1. Emite 1000 USDT
  2. Distribuye entre cuentas de prueba
  3. Testea transacciones
```

---

## 🔧 API Reference Rápida

### 1. Emitir USDT
```bash
POST /api/usdt-minter/issue

{
  "amount": 1000,
  "reason": "Optional reason for audit"
}

RESPUESTA: {
  "success": true,
  "txHash": "0x...",
  "amountIssued": 1000,
  "balanceAfter": "1000",
  "etherscanUrl": "..."
}
```

### 2. Ver Status
```bash
GET /api/usdt-minter/status

RESPUESTA: {
  "status": "active",
  "minterBalance": "1000 USDT",
  "totalSupply": "1000 USDT",
  "totalIssueRecords": 5
}
```

### 3. Validar Setup
```bash
POST /api/usdt-minter/validate-setup

RESPUESTA: {
  "success": true,
  "configuration": {
    "signerAddress": "0x...",
    "signerBalance": "0.5 ETH",
    "minterAddress": "0x..."
  }
}
```

---

## ⚠️ Troubleshooting Rápido

| Problema | Solución |
|----------|----------|
| `RPC Error` | Verificar ETH_RPC_URL en .env |
| `Balance ETH 0` | Enviar 0.1 ETH a dirección del signer |
| `MINTER_ADDRESS no configurada` | Agregar dirección al .env |
| `Permission Denied` | Verificar private key es del propietario |
| `TX reverted` | Verificar que signer tiene ETH para gas |

---

## 📊 Flujo Completo Diagrama

```
Usuario
   ↓
POST /api/uniswap/swap (100 USD)
   ↓
Backend Express
   ├─ Calcula: 99 USDT (menos 1%)
   └─ Verifica signer balance
   ↓
POST /api/usdt-minter/issue (99 USDT)
   ↓
USDT Minter Contract
   ├─ onlyOwner check ✓
   └─ issue(99000000) [6 decimales]
   ↓
USDT Real Contract
   └─ Emite 99 USDT
   ↓
Respuesta al Usuario
   ├─ ✅ 99 USDT recibidos
   ├─ 📍 TX: 0x...
   └─ 🔗 Etherscan: https://...
```

---

## 🔐 Seguridad - Checklist

- [ ] Clave privada guardada en .env (nunca en código)
- [ ] Signer tiene ETH para gas fees
- [ ] Contrato deployado en Ethereum Mainnet
- [ ] Límite de emisión configurado (1 millón USDT)
- [ ] Auditoría de emisiones habilitada
- [ ] Rate limiting implementado

---

## 📞 Soporte Rápido

**Guía completa:** `USDT_MINTER_GUIA_COMPLETA.md`
**Ejemplos código:** `blockchain/USDT_MINTER_EJEMPLOS.js`
**README detallado:** `blockchain/USDT_MINTER_README.md`

---

## ✅ Checklist de Implementación

```
[ ] 1. Crear .env con credenciales
[ ] 2. Deploy del contrato en Remix
[ ] 3. Copiar dirección y guardar en .env
[ ] 4. npm run dev:full (iniciar servidor)
[ ] 5. Ejecutar: node blockchain/scripts/createMoreTokens.js
[ ] 6. Verificar TX en Etherscan
[ ] 7. Prueba API: POST /api/usdt-minter/issue
[ ] 8. Verificar balance en /api/usdt-minter/status
[ ] 9. Integrar con frontend (opcional)
[ ] 10. ¡Sistema listo en producción!
```

---

**Versión:** 1.0.0
**Actualizado:** 2025-01-03
**Sistema:** DAES CoreBanking - USDT Minter v1.0



## En 5 Minutos ⚡

### Paso 1: Deploy del Contrato (5 min en Remix)
```
1. https://remix.ethereum.org
2. Copiar código de: blockchain/contracts/USDTMinter.sol
3. Crear archivo "USDTMinter.sol" en Remix
4. Compilar (v0.8.0+)
5. Deploy en Ethereum Mainnet
6. Copiar dirección del contrato
```

### Paso 2: Configurar .env (2 min)
```env
ETH_RPC_URL=https://eth-mainnet.g.alchemy.com/v2/7iQ1gZ82J1A6Fig-QwHDb4_4GeoayYqj
ETH_PRIVATE_KEY=d1bf385c43fb999290e3e0365f8cc45bfa97b780a97c6eb4bd790ec3fa09a036
USDT_MINTER_ADDRESS=0x[PEGAR_DIRECCIÓN_DEL_CONTRATO]
```

### Paso 3: Iniciar Servidor (1 min)
```bash
npm run dev:full
```

### Paso 4: Emitir USDT (Elige una opción)

**Opción A: Vía Node.js Script**
```bash
node blockchain/scripts/createMoreTokens.js
```

**Opción B: Vía API**
```bash
curl -X POST http://localhost:3000/api/usdt-minter/issue \
  -H "Content-Type: application/json" \
  -d '{"amount": 1000, "reason": "Bridge testing"}'
```

### Paso 5: Verificar en Etherscan
```
https://etherscan.io/tx/[TX_HASH]
```

---

## 🎯 Casos de Uso

### Caso 1: Convertir USD a USDT (Bridge)
```
Usuario: 100 USD → USDT
Backend:
  1. Emite 99 USDT (1% comisión)
  2. Transfiere al usuario
  3. Retorna TX confirmada
```

### Caso 2: Aumentar Pool de Liquidez
```
Administrador:
  1. Emite 10,000 USDT
  2. Transfiere a liquidity pool
  3. Audita en blockchain
```

### Caso 3: Recargar Saldo de Prueba
```
QA Team:
  1. Emite 1000 USDT
  2. Distribuye entre cuentas de prueba
  3. Testea transacciones
```

---

## 🔧 API Reference Rápida

### 1. Emitir USDT
```bash
POST /api/usdt-minter/issue

{
  "amount": 1000,
  "reason": "Optional reason for audit"
}

RESPUESTA: {
  "success": true,
  "txHash": "0x...",
  "amountIssued": 1000,
  "balanceAfter": "1000",
  "etherscanUrl": "..."
}
```

### 2. Ver Status
```bash
GET /api/usdt-minter/status

RESPUESTA: {
  "status": "active",
  "minterBalance": "1000 USDT",
  "totalSupply": "1000 USDT",
  "totalIssueRecords": 5
}
```

### 3. Validar Setup
```bash
POST /api/usdt-minter/validate-setup

RESPUESTA: {
  "success": true,
  "configuration": {
    "signerAddress": "0x...",
    "signerBalance": "0.5 ETH",
    "minterAddress": "0x..."
  }
}
```

---

## ⚠️ Troubleshooting Rápido

| Problema | Solución |
|----------|----------|
| `RPC Error` | Verificar ETH_RPC_URL en .env |
| `Balance ETH 0` | Enviar 0.1 ETH a dirección del signer |
| `MINTER_ADDRESS no configurada` | Agregar dirección al .env |
| `Permission Denied` | Verificar private key es del propietario |
| `TX reverted` | Verificar que signer tiene ETH para gas |

---

## 📊 Flujo Completo Diagrama

```
Usuario
   ↓
POST /api/uniswap/swap (100 USD)
   ↓
Backend Express
   ├─ Calcula: 99 USDT (menos 1%)
   └─ Verifica signer balance
   ↓
POST /api/usdt-minter/issue (99 USDT)
   ↓
USDT Minter Contract
   ├─ onlyOwner check ✓
   └─ issue(99000000) [6 decimales]
   ↓
USDT Real Contract
   └─ Emite 99 USDT
   ↓
Respuesta al Usuario
   ├─ ✅ 99 USDT recibidos
   ├─ 📍 TX: 0x...
   └─ 🔗 Etherscan: https://...
```

---

## 🔐 Seguridad - Checklist

- [ ] Clave privada guardada en .env (nunca en código)
- [ ] Signer tiene ETH para gas fees
- [ ] Contrato deployado en Ethereum Mainnet
- [ ] Límite de emisión configurado (1 millón USDT)
- [ ] Auditoría de emisiones habilitada
- [ ] Rate limiting implementado

---

## 📞 Soporte Rápido

**Guía completa:** `USDT_MINTER_GUIA_COMPLETA.md`
**Ejemplos código:** `blockchain/USDT_MINTER_EJEMPLOS.js`
**README detallado:** `blockchain/USDT_MINTER_README.md`

---

## ✅ Checklist de Implementación

```
[ ] 1. Crear .env con credenciales
[ ] 2. Deploy del contrato en Remix
[ ] 3. Copiar dirección y guardar en .env
[ ] 4. npm run dev:full (iniciar servidor)
[ ] 5. Ejecutar: node blockchain/scripts/createMoreTokens.js
[ ] 6. Verificar TX en Etherscan
[ ] 7. Prueba API: POST /api/usdt-minter/issue
[ ] 8. Verificar balance en /api/usdt-minter/status
[ ] 9. Integrar con frontend (opcional)
[ ] 10. ¡Sistema listo en producción!
```

---

**Versión:** 1.0.0
**Actualizado:** 2025-01-03
**Sistema:** DAES CoreBanking - USDT Minter v1.0




## En 5 Minutos ⚡

### Paso 1: Deploy del Contrato (5 min en Remix)
```
1. https://remix.ethereum.org
2. Copiar código de: blockchain/contracts/USDTMinter.sol
3. Crear archivo "USDTMinter.sol" en Remix
4. Compilar (v0.8.0+)
5. Deploy en Ethereum Mainnet
6. Copiar dirección del contrato
```

### Paso 2: Configurar .env (2 min)
```env
ETH_RPC_URL=https://eth-mainnet.g.alchemy.com/v2/7iQ1gZ82J1A6Fig-QwHDb4_4GeoayYqj
ETH_PRIVATE_KEY=d1bf385c43fb999290e3e0365f8cc45bfa97b780a97c6eb4bd790ec3fa09a036
USDT_MINTER_ADDRESS=0x[PEGAR_DIRECCIÓN_DEL_CONTRATO]
```

### Paso 3: Iniciar Servidor (1 min)
```bash
npm run dev:full
```

### Paso 4: Emitir USDT (Elige una opción)

**Opción A: Vía Node.js Script**
```bash
node blockchain/scripts/createMoreTokens.js
```

**Opción B: Vía API**
```bash
curl -X POST http://localhost:3000/api/usdt-minter/issue \
  -H "Content-Type: application/json" \
  -d '{"amount": 1000, "reason": "Bridge testing"}'
```

### Paso 5: Verificar en Etherscan
```
https://etherscan.io/tx/[TX_HASH]
```

---

## 🎯 Casos de Uso

### Caso 1: Convertir USD a USDT (Bridge)
```
Usuario: 100 USD → USDT
Backend:
  1. Emite 99 USDT (1% comisión)
  2. Transfiere al usuario
  3. Retorna TX confirmada
```

### Caso 2: Aumentar Pool de Liquidez
```
Administrador:
  1. Emite 10,000 USDT
  2. Transfiere a liquidity pool
  3. Audita en blockchain
```

### Caso 3: Recargar Saldo de Prueba
```
QA Team:
  1. Emite 1000 USDT
  2. Distribuye entre cuentas de prueba
  3. Testea transacciones
```

---

## 🔧 API Reference Rápida

### 1. Emitir USDT
```bash
POST /api/usdt-minter/issue

{
  "amount": 1000,
  "reason": "Optional reason for audit"
}

RESPUESTA: {
  "success": true,
  "txHash": "0x...",
  "amountIssued": 1000,
  "balanceAfter": "1000",
  "etherscanUrl": "..."
}
```

### 2. Ver Status
```bash
GET /api/usdt-minter/status

RESPUESTA: {
  "status": "active",
  "minterBalance": "1000 USDT",
  "totalSupply": "1000 USDT",
  "totalIssueRecords": 5
}
```

### 3. Validar Setup
```bash
POST /api/usdt-minter/validate-setup

RESPUESTA: {
  "success": true,
  "configuration": {
    "signerAddress": "0x...",
    "signerBalance": "0.5 ETH",
    "minterAddress": "0x..."
  }
}
```

---

## ⚠️ Troubleshooting Rápido

| Problema | Solución |
|----------|----------|
| `RPC Error` | Verificar ETH_RPC_URL en .env |
| `Balance ETH 0` | Enviar 0.1 ETH a dirección del signer |
| `MINTER_ADDRESS no configurada` | Agregar dirección al .env |
| `Permission Denied` | Verificar private key es del propietario |
| `TX reverted` | Verificar que signer tiene ETH para gas |

---

## 📊 Flujo Completo Diagrama

```
Usuario
   ↓
POST /api/uniswap/swap (100 USD)
   ↓
Backend Express
   ├─ Calcula: 99 USDT (menos 1%)
   └─ Verifica signer balance
   ↓
POST /api/usdt-minter/issue (99 USDT)
   ↓
USDT Minter Contract
   ├─ onlyOwner check ✓
   └─ issue(99000000) [6 decimales]
   ↓
USDT Real Contract
   └─ Emite 99 USDT
   ↓
Respuesta al Usuario
   ├─ ✅ 99 USDT recibidos
   ├─ 📍 TX: 0x...
   └─ 🔗 Etherscan: https://...
```

---

## 🔐 Seguridad - Checklist

- [ ] Clave privada guardada en .env (nunca en código)
- [ ] Signer tiene ETH para gas fees
- [ ] Contrato deployado en Ethereum Mainnet
- [ ] Límite de emisión configurado (1 millón USDT)
- [ ] Auditoría de emisiones habilitada
- [ ] Rate limiting implementado

---

## 📞 Soporte Rápido

**Guía completa:** `USDT_MINTER_GUIA_COMPLETA.md`
**Ejemplos código:** `blockchain/USDT_MINTER_EJEMPLOS.js`
**README detallado:** `blockchain/USDT_MINTER_README.md`

---

## ✅ Checklist de Implementación

```
[ ] 1. Crear .env con credenciales
[ ] 2. Deploy del contrato en Remix
[ ] 3. Copiar dirección y guardar en .env
[ ] 4. npm run dev:full (iniciar servidor)
[ ] 5. Ejecutar: node blockchain/scripts/createMoreTokens.js
[ ] 6. Verificar TX en Etherscan
[ ] 7. Prueba API: POST /api/usdt-minter/issue
[ ] 8. Verificar balance en /api/usdt-minter/status
[ ] 9. Integrar con frontend (opcional)
[ ] 10. ¡Sistema listo en producción!
```

---

**Versión:** 1.0.0
**Actualizado:** 2025-01-03
**Sistema:** DAES CoreBanking - USDT Minter v1.0



## En 5 Minutos ⚡

### Paso 1: Deploy del Contrato (5 min en Remix)
```
1. https://remix.ethereum.org
2. Copiar código de: blockchain/contracts/USDTMinter.sol
3. Crear archivo "USDTMinter.sol" en Remix
4. Compilar (v0.8.0+)
5. Deploy en Ethereum Mainnet
6. Copiar dirección del contrato
```

### Paso 2: Configurar .env (2 min)
```env
ETH_RPC_URL=https://eth-mainnet.g.alchemy.com/v2/7iQ1gZ82J1A6Fig-QwHDb4_4GeoayYqj
ETH_PRIVATE_KEY=d1bf385c43fb999290e3e0365f8cc45bfa97b780a97c6eb4bd790ec3fa09a036
USDT_MINTER_ADDRESS=0x[PEGAR_DIRECCIÓN_DEL_CONTRATO]
```

### Paso 3: Iniciar Servidor (1 min)
```bash
npm run dev:full
```

### Paso 4: Emitir USDT (Elige una opción)

**Opción A: Vía Node.js Script**
```bash
node blockchain/scripts/createMoreTokens.js
```

**Opción B: Vía API**
```bash
curl -X POST http://localhost:3000/api/usdt-minter/issue \
  -H "Content-Type: application/json" \
  -d '{"amount": 1000, "reason": "Bridge testing"}'
```

### Paso 5: Verificar en Etherscan
```
https://etherscan.io/tx/[TX_HASH]
```

---

## 🎯 Casos de Uso

### Caso 1: Convertir USD a USDT (Bridge)
```
Usuario: 100 USD → USDT
Backend:
  1. Emite 99 USDT (1% comisión)
  2. Transfiere al usuario
  3. Retorna TX confirmada
```

### Caso 2: Aumentar Pool de Liquidez
```
Administrador:
  1. Emite 10,000 USDT
  2. Transfiere a liquidity pool
  3. Audita en blockchain
```

### Caso 3: Recargar Saldo de Prueba
```
QA Team:
  1. Emite 1000 USDT
  2. Distribuye entre cuentas de prueba
  3. Testea transacciones
```

---

## 🔧 API Reference Rápida

### 1. Emitir USDT
```bash
POST /api/usdt-minter/issue

{
  "amount": 1000,
  "reason": "Optional reason for audit"
}

RESPUESTA: {
  "success": true,
  "txHash": "0x...",
  "amountIssued": 1000,
  "balanceAfter": "1000",
  "etherscanUrl": "..."
}
```

### 2. Ver Status
```bash
GET /api/usdt-minter/status

RESPUESTA: {
  "status": "active",
  "minterBalance": "1000 USDT",
  "totalSupply": "1000 USDT",
  "totalIssueRecords": 5
}
```

### 3. Validar Setup
```bash
POST /api/usdt-minter/validate-setup

RESPUESTA: {
  "success": true,
  "configuration": {
    "signerAddress": "0x...",
    "signerBalance": "0.5 ETH",
    "minterAddress": "0x..."
  }
}
```

---

## ⚠️ Troubleshooting Rápido

| Problema | Solución |
|----------|----------|
| `RPC Error` | Verificar ETH_RPC_URL en .env |
| `Balance ETH 0` | Enviar 0.1 ETH a dirección del signer |
| `MINTER_ADDRESS no configurada` | Agregar dirección al .env |
| `Permission Denied` | Verificar private key es del propietario |
| `TX reverted` | Verificar que signer tiene ETH para gas |

---

## 📊 Flujo Completo Diagrama

```
Usuario
   ↓
POST /api/uniswap/swap (100 USD)
   ↓
Backend Express
   ├─ Calcula: 99 USDT (menos 1%)
   └─ Verifica signer balance
   ↓
POST /api/usdt-minter/issue (99 USDT)
   ↓
USDT Minter Contract
   ├─ onlyOwner check ✓
   └─ issue(99000000) [6 decimales]
   ↓
USDT Real Contract
   └─ Emite 99 USDT
   ↓
Respuesta al Usuario
   ├─ ✅ 99 USDT recibidos
   ├─ 📍 TX: 0x...
   └─ 🔗 Etherscan: https://...
```

---

## 🔐 Seguridad - Checklist

- [ ] Clave privada guardada en .env (nunca en código)
- [ ] Signer tiene ETH para gas fees
- [ ] Contrato deployado en Ethereum Mainnet
- [ ] Límite de emisión configurado (1 millón USDT)
- [ ] Auditoría de emisiones habilitada
- [ ] Rate limiting implementado

---

## 📞 Soporte Rápido

**Guía completa:** `USDT_MINTER_GUIA_COMPLETA.md`
**Ejemplos código:** `blockchain/USDT_MINTER_EJEMPLOS.js`
**README detallado:** `blockchain/USDT_MINTER_README.md`

---

## ✅ Checklist de Implementación

```
[ ] 1. Crear .env con credenciales
[ ] 2. Deploy del contrato en Remix
[ ] 3. Copiar dirección y guardar en .env
[ ] 4. npm run dev:full (iniciar servidor)
[ ] 5. Ejecutar: node blockchain/scripts/createMoreTokens.js
[ ] 6. Verificar TX en Etherscan
[ ] 7. Prueba API: POST /api/usdt-minter/issue
[ ] 8. Verificar balance en /api/usdt-minter/status
[ ] 9. Integrar con frontend (opcional)
[ ] 10. ¡Sistema listo en producción!
```

---

**Versión:** 1.0.0
**Actualizado:** 2025-01-03
**Sistema:** DAES CoreBanking - USDT Minter v1.0



## En 5 Minutos ⚡

### Paso 1: Deploy del Contrato (5 min en Remix)
```
1. https://remix.ethereum.org
2. Copiar código de: blockchain/contracts/USDTMinter.sol
3. Crear archivo "USDTMinter.sol" en Remix
4. Compilar (v0.8.0+)
5. Deploy en Ethereum Mainnet
6. Copiar dirección del contrato
```

### Paso 2: Configurar .env (2 min)
```env
ETH_RPC_URL=https://eth-mainnet.g.alchemy.com/v2/7iQ1gZ82J1A6Fig-QwHDb4_4GeoayYqj
ETH_PRIVATE_KEY=d1bf385c43fb999290e3e0365f8cc45bfa97b780a97c6eb4bd790ec3fa09a036
USDT_MINTER_ADDRESS=0x[PEGAR_DIRECCIÓN_DEL_CONTRATO]
```

### Paso 3: Iniciar Servidor (1 min)
```bash
npm run dev:full
```

### Paso 4: Emitir USDT (Elige una opción)

**Opción A: Vía Node.js Script**
```bash
node blockchain/scripts/createMoreTokens.js
```

**Opción B: Vía API**
```bash
curl -X POST http://localhost:3000/api/usdt-minter/issue \
  -H "Content-Type: application/json" \
  -d '{"amount": 1000, "reason": "Bridge testing"}'
```

### Paso 5: Verificar en Etherscan
```
https://etherscan.io/tx/[TX_HASH]
```

---

## 🎯 Casos de Uso

### Caso 1: Convertir USD a USDT (Bridge)
```
Usuario: 100 USD → USDT
Backend:
  1. Emite 99 USDT (1% comisión)
  2. Transfiere al usuario
  3. Retorna TX confirmada
```

### Caso 2: Aumentar Pool de Liquidez
```
Administrador:
  1. Emite 10,000 USDT
  2. Transfiere a liquidity pool
  3. Audita en blockchain
```

### Caso 3: Recargar Saldo de Prueba
```
QA Team:
  1. Emite 1000 USDT
  2. Distribuye entre cuentas de prueba
  3. Testea transacciones
```

---

## 🔧 API Reference Rápida

### 1. Emitir USDT
```bash
POST /api/usdt-minter/issue

{
  "amount": 1000,
  "reason": "Optional reason for audit"
}

RESPUESTA: {
  "success": true,
  "txHash": "0x...",
  "amountIssued": 1000,
  "balanceAfter": "1000",
  "etherscanUrl": "..."
}
```

### 2. Ver Status
```bash
GET /api/usdt-minter/status

RESPUESTA: {
  "status": "active",
  "minterBalance": "1000 USDT",
  "totalSupply": "1000 USDT",
  "totalIssueRecords": 5
}
```

### 3. Validar Setup
```bash
POST /api/usdt-minter/validate-setup

RESPUESTA: {
  "success": true,
  "configuration": {
    "signerAddress": "0x...",
    "signerBalance": "0.5 ETH",
    "minterAddress": "0x..."
  }
}
```

---

## ⚠️ Troubleshooting Rápido

| Problema | Solución |
|----------|----------|
| `RPC Error` | Verificar ETH_RPC_URL en .env |
| `Balance ETH 0` | Enviar 0.1 ETH a dirección del signer |
| `MINTER_ADDRESS no configurada` | Agregar dirección al .env |
| `Permission Denied` | Verificar private key es del propietario |
| `TX reverted` | Verificar que signer tiene ETH para gas |

---

## 📊 Flujo Completo Diagrama

```
Usuario
   ↓
POST /api/uniswap/swap (100 USD)
   ↓
Backend Express
   ├─ Calcula: 99 USDT (menos 1%)
   └─ Verifica signer balance
   ↓
POST /api/usdt-minter/issue (99 USDT)
   ↓
USDT Minter Contract
   ├─ onlyOwner check ✓
   └─ issue(99000000) [6 decimales]
   ↓
USDT Real Contract
   └─ Emite 99 USDT
   ↓
Respuesta al Usuario
   ├─ ✅ 99 USDT recibidos
   ├─ 📍 TX: 0x...
   └─ 🔗 Etherscan: https://...
```

---

## 🔐 Seguridad - Checklist

- [ ] Clave privada guardada en .env (nunca en código)
- [ ] Signer tiene ETH para gas fees
- [ ] Contrato deployado en Ethereum Mainnet
- [ ] Límite de emisión configurado (1 millón USDT)
- [ ] Auditoría de emisiones habilitada
- [ ] Rate limiting implementado

---

## 📞 Soporte Rápido

**Guía completa:** `USDT_MINTER_GUIA_COMPLETA.md`
**Ejemplos código:** `blockchain/USDT_MINTER_EJEMPLOS.js`
**README detallado:** `blockchain/USDT_MINTER_README.md`

---

## ✅ Checklist de Implementación

```
[ ] 1. Crear .env con credenciales
[ ] 2. Deploy del contrato en Remix
[ ] 3. Copiar dirección y guardar en .env
[ ] 4. npm run dev:full (iniciar servidor)
[ ] 5. Ejecutar: node blockchain/scripts/createMoreTokens.js
[ ] 6. Verificar TX en Etherscan
[ ] 7. Prueba API: POST /api/usdt-minter/issue
[ ] 8. Verificar balance en /api/usdt-minter/status
[ ] 9. Integrar con frontend (opcional)
[ ] 10. ¡Sistema listo en producción!
```

---

**Versión:** 1.0.0
**Actualizado:** 2025-01-03
**Sistema:** DAES CoreBanking - USDT Minter v1.0



## En 5 Minutos ⚡

### Paso 1: Deploy del Contrato (5 min en Remix)
```
1. https://remix.ethereum.org
2. Copiar código de: blockchain/contracts/USDTMinter.sol
3. Crear archivo "USDTMinter.sol" en Remix
4. Compilar (v0.8.0+)
5. Deploy en Ethereum Mainnet
6. Copiar dirección del contrato
```

### Paso 2: Configurar .env (2 min)
```env
ETH_RPC_URL=https://eth-mainnet.g.alchemy.com/v2/7iQ1gZ82J1A6Fig-QwHDb4_4GeoayYqj
ETH_PRIVATE_KEY=d1bf385c43fb999290e3e0365f8cc45bfa97b780a97c6eb4bd790ec3fa09a036
USDT_MINTER_ADDRESS=0x[PEGAR_DIRECCIÓN_DEL_CONTRATO]
```

### Paso 3: Iniciar Servidor (1 min)
```bash
npm run dev:full
```

### Paso 4: Emitir USDT (Elige una opción)

**Opción A: Vía Node.js Script**
```bash
node blockchain/scripts/createMoreTokens.js
```

**Opción B: Vía API**
```bash
curl -X POST http://localhost:3000/api/usdt-minter/issue \
  -H "Content-Type: application/json" \
  -d '{"amount": 1000, "reason": "Bridge testing"}'
```

### Paso 5: Verificar en Etherscan
```
https://etherscan.io/tx/[TX_HASH]
```

---

## 🎯 Casos de Uso

### Caso 1: Convertir USD a USDT (Bridge)
```
Usuario: 100 USD → USDT
Backend:
  1. Emite 99 USDT (1% comisión)
  2. Transfiere al usuario
  3. Retorna TX confirmada
```

### Caso 2: Aumentar Pool de Liquidez
```
Administrador:
  1. Emite 10,000 USDT
  2. Transfiere a liquidity pool
  3. Audita en blockchain
```

### Caso 3: Recargar Saldo de Prueba
```
QA Team:
  1. Emite 1000 USDT
  2. Distribuye entre cuentas de prueba
  3. Testea transacciones
```

---

## 🔧 API Reference Rápida

### 1. Emitir USDT
```bash
POST /api/usdt-minter/issue

{
  "amount": 1000,
  "reason": "Optional reason for audit"
}

RESPUESTA: {
  "success": true,
  "txHash": "0x...",
  "amountIssued": 1000,
  "balanceAfter": "1000",
  "etherscanUrl": "..."
}
```

### 2. Ver Status
```bash
GET /api/usdt-minter/status

RESPUESTA: {
  "status": "active",
  "minterBalance": "1000 USDT",
  "totalSupply": "1000 USDT",
  "totalIssueRecords": 5
}
```

### 3. Validar Setup
```bash
POST /api/usdt-minter/validate-setup

RESPUESTA: {
  "success": true,
  "configuration": {
    "signerAddress": "0x...",
    "signerBalance": "0.5 ETH",
    "minterAddress": "0x..."
  }
}
```

---

## ⚠️ Troubleshooting Rápido

| Problema | Solución |
|----------|----------|
| `RPC Error` | Verificar ETH_RPC_URL en .env |
| `Balance ETH 0` | Enviar 0.1 ETH a dirección del signer |
| `MINTER_ADDRESS no configurada` | Agregar dirección al .env |
| `Permission Denied` | Verificar private key es del propietario |
| `TX reverted` | Verificar que signer tiene ETH para gas |

---

## 📊 Flujo Completo Diagrama

```
Usuario
   ↓
POST /api/uniswap/swap (100 USD)
   ↓
Backend Express
   ├─ Calcula: 99 USDT (menos 1%)
   └─ Verifica signer balance
   ↓
POST /api/usdt-minter/issue (99 USDT)
   ↓
USDT Minter Contract
   ├─ onlyOwner check ✓
   └─ issue(99000000) [6 decimales]
   ↓
USDT Real Contract
   └─ Emite 99 USDT
   ↓
Respuesta al Usuario
   ├─ ✅ 99 USDT recibidos
   ├─ 📍 TX: 0x...
   └─ 🔗 Etherscan: https://...
```

---

## 🔐 Seguridad - Checklist

- [ ] Clave privada guardada en .env (nunca en código)
- [ ] Signer tiene ETH para gas fees
- [ ] Contrato deployado en Ethereum Mainnet
- [ ] Límite de emisión configurado (1 millón USDT)
- [ ] Auditoría de emisiones habilitada
- [ ] Rate limiting implementado

---

## 📞 Soporte Rápido

**Guía completa:** `USDT_MINTER_GUIA_COMPLETA.md`
**Ejemplos código:** `blockchain/USDT_MINTER_EJEMPLOS.js`
**README detallado:** `blockchain/USDT_MINTER_README.md`

---

## ✅ Checklist de Implementación

```
[ ] 1. Crear .env con credenciales
[ ] 2. Deploy del contrato en Remix
[ ] 3. Copiar dirección y guardar en .env
[ ] 4. npm run dev:full (iniciar servidor)
[ ] 5. Ejecutar: node blockchain/scripts/createMoreTokens.js
[ ] 6. Verificar TX en Etherscan
[ ] 7. Prueba API: POST /api/usdt-minter/issue
[ ] 8. Verificar balance en /api/usdt-minter/status
[ ] 9. Integrar con frontend (opcional)
[ ] 10. ¡Sistema listo en producción!
```

---

**Versión:** 1.0.0
**Actualizado:** 2025-01-03
**Sistema:** DAES CoreBanking - USDT Minter v1.0




## En 5 Minutos ⚡

### Paso 1: Deploy del Contrato (5 min en Remix)
```
1. https://remix.ethereum.org
2. Copiar código de: blockchain/contracts/USDTMinter.sol
3. Crear archivo "USDTMinter.sol" en Remix
4. Compilar (v0.8.0+)
5. Deploy en Ethereum Mainnet
6. Copiar dirección del contrato
```

### Paso 2: Configurar .env (2 min)
```env
ETH_RPC_URL=https://eth-mainnet.g.alchemy.com/v2/7iQ1gZ82J1A6Fig-QwHDb4_4GeoayYqj
ETH_PRIVATE_KEY=d1bf385c43fb999290e3e0365f8cc45bfa97b780a97c6eb4bd790ec3fa09a036
USDT_MINTER_ADDRESS=0x[PEGAR_DIRECCIÓN_DEL_CONTRATO]
```

### Paso 3: Iniciar Servidor (1 min)
```bash
npm run dev:full
```

### Paso 4: Emitir USDT (Elige una opción)

**Opción A: Vía Node.js Script**
```bash
node blockchain/scripts/createMoreTokens.js
```

**Opción B: Vía API**
```bash
curl -X POST http://localhost:3000/api/usdt-minter/issue \
  -H "Content-Type: application/json" \
  -d '{"amount": 1000, "reason": "Bridge testing"}'
```

### Paso 5: Verificar en Etherscan
```
https://etherscan.io/tx/[TX_HASH]
```

---

## 🎯 Casos de Uso

### Caso 1: Convertir USD a USDT (Bridge)
```
Usuario: 100 USD → USDT
Backend:
  1. Emite 99 USDT (1% comisión)
  2. Transfiere al usuario
  3. Retorna TX confirmada
```

### Caso 2: Aumentar Pool de Liquidez
```
Administrador:
  1. Emite 10,000 USDT
  2. Transfiere a liquidity pool
  3. Audita en blockchain
```

### Caso 3: Recargar Saldo de Prueba
```
QA Team:
  1. Emite 1000 USDT
  2. Distribuye entre cuentas de prueba
  3. Testea transacciones
```

---

## 🔧 API Reference Rápida

### 1. Emitir USDT
```bash
POST /api/usdt-minter/issue

{
  "amount": 1000,
  "reason": "Optional reason for audit"
}

RESPUESTA: {
  "success": true,
  "txHash": "0x...",
  "amountIssued": 1000,
  "balanceAfter": "1000",
  "etherscanUrl": "..."
}
```

### 2. Ver Status
```bash
GET /api/usdt-minter/status

RESPUESTA: {
  "status": "active",
  "minterBalance": "1000 USDT",
  "totalSupply": "1000 USDT",
  "totalIssueRecords": 5
}
```

### 3. Validar Setup
```bash
POST /api/usdt-minter/validate-setup

RESPUESTA: {
  "success": true,
  "configuration": {
    "signerAddress": "0x...",
    "signerBalance": "0.5 ETH",
    "minterAddress": "0x..."
  }
}
```

---

## ⚠️ Troubleshooting Rápido

| Problema | Solución |
|----------|----------|
| `RPC Error` | Verificar ETH_RPC_URL en .env |
| `Balance ETH 0` | Enviar 0.1 ETH a dirección del signer |
| `MINTER_ADDRESS no configurada` | Agregar dirección al .env |
| `Permission Denied` | Verificar private key es del propietario |
| `TX reverted` | Verificar que signer tiene ETH para gas |

---

## 📊 Flujo Completo Diagrama

```
Usuario
   ↓
POST /api/uniswap/swap (100 USD)
   ↓
Backend Express
   ├─ Calcula: 99 USDT (menos 1%)
   └─ Verifica signer balance
   ↓
POST /api/usdt-minter/issue (99 USDT)
   ↓
USDT Minter Contract
   ├─ onlyOwner check ✓
   └─ issue(99000000) [6 decimales]
   ↓
USDT Real Contract
   └─ Emite 99 USDT
   ↓
Respuesta al Usuario
   ├─ ✅ 99 USDT recibidos
   ├─ 📍 TX: 0x...
   └─ 🔗 Etherscan: https://...
```

---

## 🔐 Seguridad - Checklist

- [ ] Clave privada guardada en .env (nunca en código)
- [ ] Signer tiene ETH para gas fees
- [ ] Contrato deployado en Ethereum Mainnet
- [ ] Límite de emisión configurado (1 millón USDT)
- [ ] Auditoría de emisiones habilitada
- [ ] Rate limiting implementado

---

## 📞 Soporte Rápido

**Guía completa:** `USDT_MINTER_GUIA_COMPLETA.md`
**Ejemplos código:** `blockchain/USDT_MINTER_EJEMPLOS.js`
**README detallado:** `blockchain/USDT_MINTER_README.md`

---

## ✅ Checklist de Implementación

```
[ ] 1. Crear .env con credenciales
[ ] 2. Deploy del contrato en Remix
[ ] 3. Copiar dirección y guardar en .env
[ ] 4. npm run dev:full (iniciar servidor)
[ ] 5. Ejecutar: node blockchain/scripts/createMoreTokens.js
[ ] 6. Verificar TX en Etherscan
[ ] 7. Prueba API: POST /api/usdt-minter/issue
[ ] 8. Verificar balance en /api/usdt-minter/status
[ ] 9. Integrar con frontend (opcional)
[ ] 10. ¡Sistema listo en producción!
```

---

**Versión:** 1.0.0
**Actualizado:** 2025-01-03
**Sistema:** DAES CoreBanking - USDT Minter v1.0



## En 5 Minutos ⚡

### Paso 1: Deploy del Contrato (5 min en Remix)
```
1. https://remix.ethereum.org
2. Copiar código de: blockchain/contracts/USDTMinter.sol
3. Crear archivo "USDTMinter.sol" en Remix
4. Compilar (v0.8.0+)
5. Deploy en Ethereum Mainnet
6. Copiar dirección del contrato
```

### Paso 2: Configurar .env (2 min)
```env
ETH_RPC_URL=https://eth-mainnet.g.alchemy.com/v2/7iQ1gZ82J1A6Fig-QwHDb4_4GeoayYqj
ETH_PRIVATE_KEY=d1bf385c43fb999290e3e0365f8cc45bfa97b780a97c6eb4bd790ec3fa09a036
USDT_MINTER_ADDRESS=0x[PEGAR_DIRECCIÓN_DEL_CONTRATO]
```

### Paso 3: Iniciar Servidor (1 min)
```bash
npm run dev:full
```

### Paso 4: Emitir USDT (Elige una opción)

**Opción A: Vía Node.js Script**
```bash
node blockchain/scripts/createMoreTokens.js
```

**Opción B: Vía API**
```bash
curl -X POST http://localhost:3000/api/usdt-minter/issue \
  -H "Content-Type: application/json" \
  -d '{"amount": 1000, "reason": "Bridge testing"}'
```

### Paso 5: Verificar en Etherscan
```
https://etherscan.io/tx/[TX_HASH]
```

---

## 🎯 Casos de Uso

### Caso 1: Convertir USD a USDT (Bridge)
```
Usuario: 100 USD → USDT
Backend:
  1. Emite 99 USDT (1% comisión)
  2. Transfiere al usuario
  3. Retorna TX confirmada
```

### Caso 2: Aumentar Pool de Liquidez
```
Administrador:
  1. Emite 10,000 USDT
  2. Transfiere a liquidity pool
  3. Audita en blockchain
```

### Caso 3: Recargar Saldo de Prueba
```
QA Team:
  1. Emite 1000 USDT
  2. Distribuye entre cuentas de prueba
  3. Testea transacciones
```

---

## 🔧 API Reference Rápida

### 1. Emitir USDT
```bash
POST /api/usdt-minter/issue

{
  "amount": 1000,
  "reason": "Optional reason for audit"
}

RESPUESTA: {
  "success": true,
  "txHash": "0x...",
  "amountIssued": 1000,
  "balanceAfter": "1000",
  "etherscanUrl": "..."
}
```

### 2. Ver Status
```bash
GET /api/usdt-minter/status

RESPUESTA: {
  "status": "active",
  "minterBalance": "1000 USDT",
  "totalSupply": "1000 USDT",
  "totalIssueRecords": 5
}
```

### 3. Validar Setup
```bash
POST /api/usdt-minter/validate-setup

RESPUESTA: {
  "success": true,
  "configuration": {
    "signerAddress": "0x...",
    "signerBalance": "0.5 ETH",
    "minterAddress": "0x..."
  }
}
```

---

## ⚠️ Troubleshooting Rápido

| Problema | Solución |
|----------|----------|
| `RPC Error` | Verificar ETH_RPC_URL en .env |
| `Balance ETH 0` | Enviar 0.1 ETH a dirección del signer |
| `MINTER_ADDRESS no configurada` | Agregar dirección al .env |
| `Permission Denied` | Verificar private key es del propietario |
| `TX reverted` | Verificar que signer tiene ETH para gas |

---

## 📊 Flujo Completo Diagrama

```
Usuario
   ↓
POST /api/uniswap/swap (100 USD)
   ↓
Backend Express
   ├─ Calcula: 99 USDT (menos 1%)
   └─ Verifica signer balance
   ↓
POST /api/usdt-minter/issue (99 USDT)
   ↓
USDT Minter Contract
   ├─ onlyOwner check ✓
   └─ issue(99000000) [6 decimales]
   ↓
USDT Real Contract
   └─ Emite 99 USDT
   ↓
Respuesta al Usuario
   ├─ ✅ 99 USDT recibidos
   ├─ 📍 TX: 0x...
   └─ 🔗 Etherscan: https://...
```

---

## 🔐 Seguridad - Checklist

- [ ] Clave privada guardada en .env (nunca en código)
- [ ] Signer tiene ETH para gas fees
- [ ] Contrato deployado en Ethereum Mainnet
- [ ] Límite de emisión configurado (1 millón USDT)
- [ ] Auditoría de emisiones habilitada
- [ ] Rate limiting implementado

---

## 📞 Soporte Rápido

**Guía completa:** `USDT_MINTER_GUIA_COMPLETA.md`
**Ejemplos código:** `blockchain/USDT_MINTER_EJEMPLOS.js`
**README detallado:** `blockchain/USDT_MINTER_README.md`

---

## ✅ Checklist de Implementación

```
[ ] 1. Crear .env con credenciales
[ ] 2. Deploy del contrato en Remix
[ ] 3. Copiar dirección y guardar en .env
[ ] 4. npm run dev:full (iniciar servidor)
[ ] 5. Ejecutar: node blockchain/scripts/createMoreTokens.js
[ ] 6. Verificar TX en Etherscan
[ ] 7. Prueba API: POST /api/usdt-minter/issue
[ ] 8. Verificar balance en /api/usdt-minter/status
[ ] 9. Integrar con frontend (opcional)
[ ] 10. ¡Sistema listo en producción!
```

---

**Versión:** 1.0.0
**Actualizado:** 2025-01-03
**Sistema:** DAES CoreBanking - USDT Minter v1.0



## En 5 Minutos ⚡

### Paso 1: Deploy del Contrato (5 min en Remix)
```
1. https://remix.ethereum.org
2. Copiar código de: blockchain/contracts/USDTMinter.sol
3. Crear archivo "USDTMinter.sol" en Remix
4. Compilar (v0.8.0+)
5. Deploy en Ethereum Mainnet
6. Copiar dirección del contrato
```

### Paso 2: Configurar .env (2 min)
```env
ETH_RPC_URL=https://eth-mainnet.g.alchemy.com/v2/7iQ1gZ82J1A6Fig-QwHDb4_4GeoayYqj
ETH_PRIVATE_KEY=d1bf385c43fb999290e3e0365f8cc45bfa97b780a97c6eb4bd790ec3fa09a036
USDT_MINTER_ADDRESS=0x[PEGAR_DIRECCIÓN_DEL_CONTRATO]
```

### Paso 3: Iniciar Servidor (1 min)
```bash
npm run dev:full
```

### Paso 4: Emitir USDT (Elige una opción)

**Opción A: Vía Node.js Script**
```bash
node blockchain/scripts/createMoreTokens.js
```

**Opción B: Vía API**
```bash
curl -X POST http://localhost:3000/api/usdt-minter/issue \
  -H "Content-Type: application/json" \
  -d '{"amount": 1000, "reason": "Bridge testing"}'
```

### Paso 5: Verificar en Etherscan
```
https://etherscan.io/tx/[TX_HASH]
```

---

## 🎯 Casos de Uso

### Caso 1: Convertir USD a USDT (Bridge)
```
Usuario: 100 USD → USDT
Backend:
  1. Emite 99 USDT (1% comisión)
  2. Transfiere al usuario
  3. Retorna TX confirmada
```

### Caso 2: Aumentar Pool de Liquidez
```
Administrador:
  1. Emite 10,000 USDT
  2. Transfiere a liquidity pool
  3. Audita en blockchain
```

### Caso 3: Recargar Saldo de Prueba
```
QA Team:
  1. Emite 1000 USDT
  2. Distribuye entre cuentas de prueba
  3. Testea transacciones
```

---

## 🔧 API Reference Rápida

### 1. Emitir USDT
```bash
POST /api/usdt-minter/issue

{
  "amount": 1000,
  "reason": "Optional reason for audit"
}

RESPUESTA: {
  "success": true,
  "txHash": "0x...",
  "amountIssued": 1000,
  "balanceAfter": "1000",
  "etherscanUrl": "..."
}
```

### 2. Ver Status
```bash
GET /api/usdt-minter/status

RESPUESTA: {
  "status": "active",
  "minterBalance": "1000 USDT",
  "totalSupply": "1000 USDT",
  "totalIssueRecords": 5
}
```

### 3. Validar Setup
```bash
POST /api/usdt-minter/validate-setup

RESPUESTA: {
  "success": true,
  "configuration": {
    "signerAddress": "0x...",
    "signerBalance": "0.5 ETH",
    "minterAddress": "0x..."
  }
}
```

---

## ⚠️ Troubleshooting Rápido

| Problema | Solución |
|----------|----------|
| `RPC Error` | Verificar ETH_RPC_URL en .env |
| `Balance ETH 0` | Enviar 0.1 ETH a dirección del signer |
| `MINTER_ADDRESS no configurada` | Agregar dirección al .env |
| `Permission Denied` | Verificar private key es del propietario |
| `TX reverted` | Verificar que signer tiene ETH para gas |

---

## 📊 Flujo Completo Diagrama

```
Usuario
   ↓
POST /api/uniswap/swap (100 USD)
   ↓
Backend Express
   ├─ Calcula: 99 USDT (menos 1%)
   └─ Verifica signer balance
   ↓
POST /api/usdt-minter/issue (99 USDT)
   ↓
USDT Minter Contract
   ├─ onlyOwner check ✓
   └─ issue(99000000) [6 decimales]
   ↓
USDT Real Contract
   └─ Emite 99 USDT
   ↓
Respuesta al Usuario
   ├─ ✅ 99 USDT recibidos
   ├─ 📍 TX: 0x...
   └─ 🔗 Etherscan: https://...
```

---

## 🔐 Seguridad - Checklist

- [ ] Clave privada guardada en .env (nunca en código)
- [ ] Signer tiene ETH para gas fees
- [ ] Contrato deployado en Ethereum Mainnet
- [ ] Límite de emisión configurado (1 millón USDT)
- [ ] Auditoría de emisiones habilitada
- [ ] Rate limiting implementado

---

## 📞 Soporte Rápido

**Guía completa:** `USDT_MINTER_GUIA_COMPLETA.md`
**Ejemplos código:** `blockchain/USDT_MINTER_EJEMPLOS.js`
**README detallado:** `blockchain/USDT_MINTER_README.md`

---

## ✅ Checklist de Implementación

```
[ ] 1. Crear .env con credenciales
[ ] 2. Deploy del contrato en Remix
[ ] 3. Copiar dirección y guardar en .env
[ ] 4. npm run dev:full (iniciar servidor)
[ ] 5. Ejecutar: node blockchain/scripts/createMoreTokens.js
[ ] 6. Verificar TX en Etherscan
[ ] 7. Prueba API: POST /api/usdt-minter/issue
[ ] 8. Verificar balance en /api/usdt-minter/status
[ ] 9. Integrar con frontend (opcional)
[ ] 10. ¡Sistema listo en producción!
```

---

**Versión:** 1.0.0
**Actualizado:** 2025-01-03
**Sistema:** DAES CoreBanking - USDT Minter v1.0



## En 5 Minutos ⚡

### Paso 1: Deploy del Contrato (5 min en Remix)
```
1. https://remix.ethereum.org
2. Copiar código de: blockchain/contracts/USDTMinter.sol
3. Crear archivo "USDTMinter.sol" en Remix
4. Compilar (v0.8.0+)
5. Deploy en Ethereum Mainnet
6. Copiar dirección del contrato
```

### Paso 2: Configurar .env (2 min)
```env
ETH_RPC_URL=https://eth-mainnet.g.alchemy.com/v2/7iQ1gZ82J1A6Fig-QwHDb4_4GeoayYqj
ETH_PRIVATE_KEY=d1bf385c43fb999290e3e0365f8cc45bfa97b780a97c6eb4bd790ec3fa09a036
USDT_MINTER_ADDRESS=0x[PEGAR_DIRECCIÓN_DEL_CONTRATO]
```

### Paso 3: Iniciar Servidor (1 min)
```bash
npm run dev:full
```

### Paso 4: Emitir USDT (Elige una opción)

**Opción A: Vía Node.js Script**
```bash
node blockchain/scripts/createMoreTokens.js
```

**Opción B: Vía API**
```bash
curl -X POST http://localhost:3000/api/usdt-minter/issue \
  -H "Content-Type: application/json" \
  -d '{"amount": 1000, "reason": "Bridge testing"}'
```

### Paso 5: Verificar en Etherscan
```
https://etherscan.io/tx/[TX_HASH]
```

---

## 🎯 Casos de Uso

### Caso 1: Convertir USD a USDT (Bridge)
```
Usuario: 100 USD → USDT
Backend:
  1. Emite 99 USDT (1% comisión)
  2. Transfiere al usuario
  3. Retorna TX confirmada
```

### Caso 2: Aumentar Pool de Liquidez
```
Administrador:
  1. Emite 10,000 USDT
  2. Transfiere a liquidity pool
  3. Audita en blockchain
```

### Caso 3: Recargar Saldo de Prueba
```
QA Team:
  1. Emite 1000 USDT
  2. Distribuye entre cuentas de prueba
  3. Testea transacciones
```

---

## 🔧 API Reference Rápida

### 1. Emitir USDT
```bash
POST /api/usdt-minter/issue

{
  "amount": 1000,
  "reason": "Optional reason for audit"
}

RESPUESTA: {
  "success": true,
  "txHash": "0x...",
  "amountIssued": 1000,
  "balanceAfter": "1000",
  "etherscanUrl": "..."
}
```

### 2. Ver Status
```bash
GET /api/usdt-minter/status

RESPUESTA: {
  "status": "active",
  "minterBalance": "1000 USDT",
  "totalSupply": "1000 USDT",
  "totalIssueRecords": 5
}
```

### 3. Validar Setup
```bash
POST /api/usdt-minter/validate-setup

RESPUESTA: {
  "success": true,
  "configuration": {
    "signerAddress": "0x...",
    "signerBalance": "0.5 ETH",
    "minterAddress": "0x..."
  }
}
```

---

## ⚠️ Troubleshooting Rápido

| Problema | Solución |
|----------|----------|
| `RPC Error` | Verificar ETH_RPC_URL en .env |
| `Balance ETH 0` | Enviar 0.1 ETH a dirección del signer |
| `MINTER_ADDRESS no configurada` | Agregar dirección al .env |
| `Permission Denied` | Verificar private key es del propietario |
| `TX reverted` | Verificar que signer tiene ETH para gas |

---

## 📊 Flujo Completo Diagrama

```
Usuario
   ↓
POST /api/uniswap/swap (100 USD)
   ↓
Backend Express
   ├─ Calcula: 99 USDT (menos 1%)
   └─ Verifica signer balance
   ↓
POST /api/usdt-minter/issue (99 USDT)
   ↓
USDT Minter Contract
   ├─ onlyOwner check ✓
   └─ issue(99000000) [6 decimales]
   ↓
USDT Real Contract
   └─ Emite 99 USDT
   ↓
Respuesta al Usuario
   ├─ ✅ 99 USDT recibidos
   ├─ 📍 TX: 0x...
   └─ 🔗 Etherscan: https://...
```

---

## 🔐 Seguridad - Checklist

- [ ] Clave privada guardada en .env (nunca en código)
- [ ] Signer tiene ETH para gas fees
- [ ] Contrato deployado en Ethereum Mainnet
- [ ] Límite de emisión configurado (1 millón USDT)
- [ ] Auditoría de emisiones habilitada
- [ ] Rate limiting implementado

---

## 📞 Soporte Rápido

**Guía completa:** `USDT_MINTER_GUIA_COMPLETA.md`
**Ejemplos código:** `blockchain/USDT_MINTER_EJEMPLOS.js`
**README detallado:** `blockchain/USDT_MINTER_README.md`

---

## ✅ Checklist de Implementación

```
[ ] 1. Crear .env con credenciales
[ ] 2. Deploy del contrato en Remix
[ ] 3. Copiar dirección y guardar en .env
[ ] 4. npm run dev:full (iniciar servidor)
[ ] 5. Ejecutar: node blockchain/scripts/createMoreTokens.js
[ ] 6. Verificar TX en Etherscan
[ ] 7. Prueba API: POST /api/usdt-minter/issue
[ ] 8. Verificar balance en /api/usdt-minter/status
[ ] 9. Integrar con frontend (opcional)
[ ] 10. ¡Sistema listo en producción!
```

---

**Versión:** 1.0.0
**Actualizado:** 2025-01-03
**Sistema:** DAES CoreBanking - USDT Minter v1.0




## En 5 Minutos ⚡

### Paso 1: Deploy del Contrato (5 min en Remix)
```
1. https://remix.ethereum.org
2. Copiar código de: blockchain/contracts/USDTMinter.sol
3. Crear archivo "USDTMinter.sol" en Remix
4. Compilar (v0.8.0+)
5. Deploy en Ethereum Mainnet
6. Copiar dirección del contrato
```

### Paso 2: Configurar .env (2 min)
```env
ETH_RPC_URL=https://eth-mainnet.g.alchemy.com/v2/7iQ1gZ82J1A6Fig-QwHDb4_4GeoayYqj
ETH_PRIVATE_KEY=d1bf385c43fb999290e3e0365f8cc45bfa97b780a97c6eb4bd790ec3fa09a036
USDT_MINTER_ADDRESS=0x[PEGAR_DIRECCIÓN_DEL_CONTRATO]
```

### Paso 3: Iniciar Servidor (1 min)
```bash
npm run dev:full
```

### Paso 4: Emitir USDT (Elige una opción)

**Opción A: Vía Node.js Script**
```bash
node blockchain/scripts/createMoreTokens.js
```

**Opción B: Vía API**
```bash
curl -X POST http://localhost:3000/api/usdt-minter/issue \
  -H "Content-Type: application/json" \
  -d '{"amount": 1000, "reason": "Bridge testing"}'
```

### Paso 5: Verificar en Etherscan
```
https://etherscan.io/tx/[TX_HASH]
```

---

## 🎯 Casos de Uso

### Caso 1: Convertir USD a USDT (Bridge)
```
Usuario: 100 USD → USDT
Backend:
  1. Emite 99 USDT (1% comisión)
  2. Transfiere al usuario
  3. Retorna TX confirmada
```

### Caso 2: Aumentar Pool de Liquidez
```
Administrador:
  1. Emite 10,000 USDT
  2. Transfiere a liquidity pool
  3. Audita en blockchain
```

### Caso 3: Recargar Saldo de Prueba
```
QA Team:
  1. Emite 1000 USDT
  2. Distribuye entre cuentas de prueba
  3. Testea transacciones
```

---

## 🔧 API Reference Rápida

### 1. Emitir USDT
```bash
POST /api/usdt-minter/issue

{
  "amount": 1000,
  "reason": "Optional reason for audit"
}

RESPUESTA: {
  "success": true,
  "txHash": "0x...",
  "amountIssued": 1000,
  "balanceAfter": "1000",
  "etherscanUrl": "..."
}
```

### 2. Ver Status
```bash
GET /api/usdt-minter/status

RESPUESTA: {
  "status": "active",
  "minterBalance": "1000 USDT",
  "totalSupply": "1000 USDT",
  "totalIssueRecords": 5
}
```

### 3. Validar Setup
```bash
POST /api/usdt-minter/validate-setup

RESPUESTA: {
  "success": true,
  "configuration": {
    "signerAddress": "0x...",
    "signerBalance": "0.5 ETH",
    "minterAddress": "0x..."
  }
}
```

---

## ⚠️ Troubleshooting Rápido

| Problema | Solución |
|----------|----------|
| `RPC Error` | Verificar ETH_RPC_URL en .env |
| `Balance ETH 0` | Enviar 0.1 ETH a dirección del signer |
| `MINTER_ADDRESS no configurada` | Agregar dirección al .env |
| `Permission Denied` | Verificar private key es del propietario |
| `TX reverted` | Verificar que signer tiene ETH para gas |

---

## 📊 Flujo Completo Diagrama

```
Usuario
   ↓
POST /api/uniswap/swap (100 USD)
   ↓
Backend Express
   ├─ Calcula: 99 USDT (menos 1%)
   └─ Verifica signer balance
   ↓
POST /api/usdt-minter/issue (99 USDT)
   ↓
USDT Minter Contract
   ├─ onlyOwner check ✓
   └─ issue(99000000) [6 decimales]
   ↓
USDT Real Contract
   └─ Emite 99 USDT
   ↓
Respuesta al Usuario
   ├─ ✅ 99 USDT recibidos
   ├─ 📍 TX: 0x...
   └─ 🔗 Etherscan: https://...
```

---

## 🔐 Seguridad - Checklist

- [ ] Clave privada guardada en .env (nunca en código)
- [ ] Signer tiene ETH para gas fees
- [ ] Contrato deployado en Ethereum Mainnet
- [ ] Límite de emisión configurado (1 millón USDT)
- [ ] Auditoría de emisiones habilitada
- [ ] Rate limiting implementado

---

## 📞 Soporte Rápido

**Guía completa:** `USDT_MINTER_GUIA_COMPLETA.md`
**Ejemplos código:** `blockchain/USDT_MINTER_EJEMPLOS.js`
**README detallado:** `blockchain/USDT_MINTER_README.md`

---

## ✅ Checklist de Implementación

```
[ ] 1. Crear .env con credenciales
[ ] 2. Deploy del contrato en Remix
[ ] 3. Copiar dirección y guardar en .env
[ ] 4. npm run dev:full (iniciar servidor)
[ ] 5. Ejecutar: node blockchain/scripts/createMoreTokens.js
[ ] 6. Verificar TX en Etherscan
[ ] 7. Prueba API: POST /api/usdt-minter/issue
[ ] 8. Verificar balance en /api/usdt-minter/status
[ ] 9. Integrar con frontend (opcional)
[ ] 10. ¡Sistema listo en producción!
```

---

**Versión:** 1.0.0
**Actualizado:** 2025-01-03
**Sistema:** DAES CoreBanking - USDT Minter v1.0



## En 5 Minutos ⚡

### Paso 1: Deploy del Contrato (5 min en Remix)
```
1. https://remix.ethereum.org
2. Copiar código de: blockchain/contracts/USDTMinter.sol
3. Crear archivo "USDTMinter.sol" en Remix
4. Compilar (v0.8.0+)
5. Deploy en Ethereum Mainnet
6. Copiar dirección del contrato
```

### Paso 2: Configurar .env (2 min)
```env
ETH_RPC_URL=https://eth-mainnet.g.alchemy.com/v2/7iQ1gZ82J1A6Fig-QwHDb4_4GeoayYqj
ETH_PRIVATE_KEY=d1bf385c43fb999290e3e0365f8cc45bfa97b780a97c6eb4bd790ec3fa09a036
USDT_MINTER_ADDRESS=0x[PEGAR_DIRECCIÓN_DEL_CONTRATO]
```

### Paso 3: Iniciar Servidor (1 min)
```bash
npm run dev:full
```

### Paso 4: Emitir USDT (Elige una opción)

**Opción A: Vía Node.js Script**
```bash
node blockchain/scripts/createMoreTokens.js
```

**Opción B: Vía API**
```bash
curl -X POST http://localhost:3000/api/usdt-minter/issue \
  -H "Content-Type: application/json" \
  -d '{"amount": 1000, "reason": "Bridge testing"}'
```

### Paso 5: Verificar en Etherscan
```
https://etherscan.io/tx/[TX_HASH]
```

---

## 🎯 Casos de Uso

### Caso 1: Convertir USD a USDT (Bridge)
```
Usuario: 100 USD → USDT
Backend:
  1. Emite 99 USDT (1% comisión)
  2. Transfiere al usuario
  3. Retorna TX confirmada
```

### Caso 2: Aumentar Pool de Liquidez
```
Administrador:
  1. Emite 10,000 USDT
  2. Transfiere a liquidity pool
  3. Audita en blockchain
```

### Caso 3: Recargar Saldo de Prueba
```
QA Team:
  1. Emite 1000 USDT
  2. Distribuye entre cuentas de prueba
  3. Testea transacciones
```

---

## 🔧 API Reference Rápida

### 1. Emitir USDT
```bash
POST /api/usdt-minter/issue

{
  "amount": 1000,
  "reason": "Optional reason for audit"
}

RESPUESTA: {
  "success": true,
  "txHash": "0x...",
  "amountIssued": 1000,
  "balanceAfter": "1000",
  "etherscanUrl": "..."
}
```

### 2. Ver Status
```bash
GET /api/usdt-minter/status

RESPUESTA: {
  "status": "active",
  "minterBalance": "1000 USDT",
  "totalSupply": "1000 USDT",
  "totalIssueRecords": 5
}
```

### 3. Validar Setup
```bash
POST /api/usdt-minter/validate-setup

RESPUESTA: {
  "success": true,
  "configuration": {
    "signerAddress": "0x...",
    "signerBalance": "0.5 ETH",
    "minterAddress": "0x..."
  }
}
```

---

## ⚠️ Troubleshooting Rápido

| Problema | Solución |
|----------|----------|
| `RPC Error` | Verificar ETH_RPC_URL en .env |
| `Balance ETH 0` | Enviar 0.1 ETH a dirección del signer |
| `MINTER_ADDRESS no configurada` | Agregar dirección al .env |
| `Permission Denied` | Verificar private key es del propietario |
| `TX reverted` | Verificar que signer tiene ETH para gas |

---

## 📊 Flujo Completo Diagrama

```
Usuario
   ↓
POST /api/uniswap/swap (100 USD)
   ↓
Backend Express
   ├─ Calcula: 99 USDT (menos 1%)
   └─ Verifica signer balance
   ↓
POST /api/usdt-minter/issue (99 USDT)
   ↓
USDT Minter Contract
   ├─ onlyOwner check ✓
   └─ issue(99000000) [6 decimales]
   ↓
USDT Real Contract
   └─ Emite 99 USDT
   ↓
Respuesta al Usuario
   ├─ ✅ 99 USDT recibidos
   ├─ 📍 TX: 0x...
   └─ 🔗 Etherscan: https://...
```

---

## 🔐 Seguridad - Checklist

- [ ] Clave privada guardada en .env (nunca en código)
- [ ] Signer tiene ETH para gas fees
- [ ] Contrato deployado en Ethereum Mainnet
- [ ] Límite de emisión configurado (1 millón USDT)
- [ ] Auditoría de emisiones habilitada
- [ ] Rate limiting implementado

---

## 📞 Soporte Rápido

**Guía completa:** `USDT_MINTER_GUIA_COMPLETA.md`
**Ejemplos código:** `blockchain/USDT_MINTER_EJEMPLOS.js`
**README detallado:** `blockchain/USDT_MINTER_README.md`

---

## ✅ Checklist de Implementación

```
[ ] 1. Crear .env con credenciales
[ ] 2. Deploy del contrato en Remix
[ ] 3. Copiar dirección y guardar en .env
[ ] 4. npm run dev:full (iniciar servidor)
[ ] 5. Ejecutar: node blockchain/scripts/createMoreTokens.js
[ ] 6. Verificar TX en Etherscan
[ ] 7. Prueba API: POST /api/usdt-minter/issue
[ ] 8. Verificar balance en /api/usdt-minter/status
[ ] 9. Integrar con frontend (opcional)
[ ] 10. ¡Sistema listo en producción!
```

---

**Versión:** 1.0.0
**Actualizado:** 2025-01-03
**Sistema:** DAES CoreBanking - USDT Minter v1.0



## En 5 Minutos ⚡

### Paso 1: Deploy del Contrato (5 min en Remix)
```
1. https://remix.ethereum.org
2. Copiar código de: blockchain/contracts/USDTMinter.sol
3. Crear archivo "USDTMinter.sol" en Remix
4. Compilar (v0.8.0+)
5. Deploy en Ethereum Mainnet
6. Copiar dirección del contrato
```

### Paso 2: Configurar .env (2 min)
```env
ETH_RPC_URL=https://eth-mainnet.g.alchemy.com/v2/7iQ1gZ82J1A6Fig-QwHDb4_4GeoayYqj
ETH_PRIVATE_KEY=d1bf385c43fb999290e3e0365f8cc45bfa97b780a97c6eb4bd790ec3fa09a036
USDT_MINTER_ADDRESS=0x[PEGAR_DIRECCIÓN_DEL_CONTRATO]
```

### Paso 3: Iniciar Servidor (1 min)
```bash
npm run dev:full
```

### Paso 4: Emitir USDT (Elige una opción)

**Opción A: Vía Node.js Script**
```bash
node blockchain/scripts/createMoreTokens.js
```

**Opción B: Vía API**
```bash
curl -X POST http://localhost:3000/api/usdt-minter/issue \
  -H "Content-Type: application/json" \
  -d '{"amount": 1000, "reason": "Bridge testing"}'
```

### Paso 5: Verificar en Etherscan
```
https://etherscan.io/tx/[TX_HASH]
```

---

## 🎯 Casos de Uso

### Caso 1: Convertir USD a USDT (Bridge)
```
Usuario: 100 USD → USDT
Backend:
  1. Emite 99 USDT (1% comisión)
  2. Transfiere al usuario
  3. Retorna TX confirmada
```

### Caso 2: Aumentar Pool de Liquidez
```
Administrador:
  1. Emite 10,000 USDT
  2. Transfiere a liquidity pool
  3. Audita en blockchain
```

### Caso 3: Recargar Saldo de Prueba
```
QA Team:
  1. Emite 1000 USDT
  2. Distribuye entre cuentas de prueba
  3. Testea transacciones
```

---

## 🔧 API Reference Rápida

### 1. Emitir USDT
```bash
POST /api/usdt-minter/issue

{
  "amount": 1000,
  "reason": "Optional reason for audit"
}

RESPUESTA: {
  "success": true,
  "txHash": "0x...",
  "amountIssued": 1000,
  "balanceAfter": "1000",
  "etherscanUrl": "..."
}
```

### 2. Ver Status
```bash
GET /api/usdt-minter/status

RESPUESTA: {
  "status": "active",
  "minterBalance": "1000 USDT",
  "totalSupply": "1000 USDT",
  "totalIssueRecords": 5
}
```

### 3. Validar Setup
```bash
POST /api/usdt-minter/validate-setup

RESPUESTA: {
  "success": true,
  "configuration": {
    "signerAddress": "0x...",
    "signerBalance": "0.5 ETH",
    "minterAddress": "0x..."
  }
}
```

---

## ⚠️ Troubleshooting Rápido

| Problema | Solución |
|----------|----------|
| `RPC Error` | Verificar ETH_RPC_URL en .env |
| `Balance ETH 0` | Enviar 0.1 ETH a dirección del signer |
| `MINTER_ADDRESS no configurada` | Agregar dirección al .env |
| `Permission Denied` | Verificar private key es del propietario |
| `TX reverted` | Verificar que signer tiene ETH para gas |

---

## 📊 Flujo Completo Diagrama

```
Usuario
   ↓
POST /api/uniswap/swap (100 USD)
   ↓
Backend Express
   ├─ Calcula: 99 USDT (menos 1%)
   └─ Verifica signer balance
   ↓
POST /api/usdt-minter/issue (99 USDT)
   ↓
USDT Minter Contract
   ├─ onlyOwner check ✓
   └─ issue(99000000) [6 decimales]
   ↓
USDT Real Contract
   └─ Emite 99 USDT
   ↓
Respuesta al Usuario
   ├─ ✅ 99 USDT recibidos
   ├─ 📍 TX: 0x...
   └─ 🔗 Etherscan: https://...
```

---

## 🔐 Seguridad - Checklist

- [ ] Clave privada guardada en .env (nunca en código)
- [ ] Signer tiene ETH para gas fees
- [ ] Contrato deployado en Ethereum Mainnet
- [ ] Límite de emisión configurado (1 millón USDT)
- [ ] Auditoría de emisiones habilitada
- [ ] Rate limiting implementado

---

## 📞 Soporte Rápido

**Guía completa:** `USDT_MINTER_GUIA_COMPLETA.md`
**Ejemplos código:** `blockchain/USDT_MINTER_EJEMPLOS.js`
**README detallado:** `blockchain/USDT_MINTER_README.md`

---

## ✅ Checklist de Implementación

```
[ ] 1. Crear .env con credenciales
[ ] 2. Deploy del contrato en Remix
[ ] 3. Copiar dirección y guardar en .env
[ ] 4. npm run dev:full (iniciar servidor)
[ ] 5. Ejecutar: node blockchain/scripts/createMoreTokens.js
[ ] 6. Verificar TX en Etherscan
[ ] 7. Prueba API: POST /api/usdt-minter/issue
[ ] 8. Verificar balance en /api/usdt-minter/status
[ ] 9. Integrar con frontend (opcional)
[ ] 10. ¡Sistema listo en producción!
```

---

**Versión:** 1.0.0
**Actualizado:** 2025-01-03
**Sistema:** DAES CoreBanking - USDT Minter v1.0



## En 5 Minutos ⚡

### Paso 1: Deploy del Contrato (5 min en Remix)
```
1. https://remix.ethereum.org
2. Copiar código de: blockchain/contracts/USDTMinter.sol
3. Crear archivo "USDTMinter.sol" en Remix
4. Compilar (v0.8.0+)
5. Deploy en Ethereum Mainnet
6. Copiar dirección del contrato
```

### Paso 2: Configurar .env (2 min)
```env
ETH_RPC_URL=https://eth-mainnet.g.alchemy.com/v2/7iQ1gZ82J1A6Fig-QwHDb4_4GeoayYqj
ETH_PRIVATE_KEY=d1bf385c43fb999290e3e0365f8cc45bfa97b780a97c6eb4bd790ec3fa09a036
USDT_MINTER_ADDRESS=0x[PEGAR_DIRECCIÓN_DEL_CONTRATO]
```

### Paso 3: Iniciar Servidor (1 min)
```bash
npm run dev:full
```

### Paso 4: Emitir USDT (Elige una opción)

**Opción A: Vía Node.js Script**
```bash
node blockchain/scripts/createMoreTokens.js
```

**Opción B: Vía API**
```bash
curl -X POST http://localhost:3000/api/usdt-minter/issue \
  -H "Content-Type: application/json" \
  -d '{"amount": 1000, "reason": "Bridge testing"}'
```

### Paso 5: Verificar en Etherscan
```
https://etherscan.io/tx/[TX_HASH]
```

---

## 🎯 Casos de Uso

### Caso 1: Convertir USD a USDT (Bridge)
```
Usuario: 100 USD → USDT
Backend:
  1. Emite 99 USDT (1% comisión)
  2. Transfiere al usuario
  3. Retorna TX confirmada
```

### Caso 2: Aumentar Pool de Liquidez
```
Administrador:
  1. Emite 10,000 USDT
  2. Transfiere a liquidity pool
  3. Audita en blockchain
```

### Caso 3: Recargar Saldo de Prueba
```
QA Team:
  1. Emite 1000 USDT
  2. Distribuye entre cuentas de prueba
  3. Testea transacciones
```

---

## 🔧 API Reference Rápida

### 1. Emitir USDT
```bash
POST /api/usdt-minter/issue

{
  "amount": 1000,
  "reason": "Optional reason for audit"
}

RESPUESTA: {
  "success": true,
  "txHash": "0x...",
  "amountIssued": 1000,
  "balanceAfter": "1000",
  "etherscanUrl": "..."
}
```

### 2. Ver Status
```bash
GET /api/usdt-minter/status

RESPUESTA: {
  "status": "active",
  "minterBalance": "1000 USDT",
  "totalSupply": "1000 USDT",
  "totalIssueRecords": 5
}
```

### 3. Validar Setup
```bash
POST /api/usdt-minter/validate-setup

RESPUESTA: {
  "success": true,
  "configuration": {
    "signerAddress": "0x...",
    "signerBalance": "0.5 ETH",
    "minterAddress": "0x..."
  }
}
```

---

## ⚠️ Troubleshooting Rápido

| Problema | Solución |
|----------|----------|
| `RPC Error` | Verificar ETH_RPC_URL en .env |
| `Balance ETH 0` | Enviar 0.1 ETH a dirección del signer |
| `MINTER_ADDRESS no configurada` | Agregar dirección al .env |
| `Permission Denied` | Verificar private key es del propietario |
| `TX reverted` | Verificar que signer tiene ETH para gas |

---

## 📊 Flujo Completo Diagrama

```
Usuario
   ↓
POST /api/uniswap/swap (100 USD)
   ↓
Backend Express
   ├─ Calcula: 99 USDT (menos 1%)
   └─ Verifica signer balance
   ↓
POST /api/usdt-minter/issue (99 USDT)
   ↓
USDT Minter Contract
   ├─ onlyOwner check ✓
   └─ issue(99000000) [6 decimales]
   ↓
USDT Real Contract
   └─ Emite 99 USDT
   ↓
Respuesta al Usuario
   ├─ ✅ 99 USDT recibidos
   ├─ 📍 TX: 0x...
   └─ 🔗 Etherscan: https://...
```

---

## 🔐 Seguridad - Checklist

- [ ] Clave privada guardada en .env (nunca en código)
- [ ] Signer tiene ETH para gas fees
- [ ] Contrato deployado en Ethereum Mainnet
- [ ] Límite de emisión configurado (1 millón USDT)
- [ ] Auditoría de emisiones habilitada
- [ ] Rate limiting implementado

---

## 📞 Soporte Rápido

**Guía completa:** `USDT_MINTER_GUIA_COMPLETA.md`
**Ejemplos código:** `blockchain/USDT_MINTER_EJEMPLOS.js`
**README detallado:** `blockchain/USDT_MINTER_README.md`

---

## ✅ Checklist de Implementación

```
[ ] 1. Crear .env con credenciales
[ ] 2. Deploy del contrato en Remix
[ ] 3. Copiar dirección y guardar en .env
[ ] 4. npm run dev:full (iniciar servidor)
[ ] 5. Ejecutar: node blockchain/scripts/createMoreTokens.js
[ ] 6. Verificar TX en Etherscan
[ ] 7. Prueba API: POST /api/usdt-minter/issue
[ ] 8. Verificar balance en /api/usdt-minter/status
[ ] 9. Integrar con frontend (opcional)
[ ] 10. ¡Sistema listo en producción!
```

---

**Versión:** 1.0.0
**Actualizado:** 2025-01-03
**Sistema:** DAES CoreBanking - USDT Minter v1.0




## En 5 Minutos ⚡

### Paso 1: Deploy del Contrato (5 min en Remix)
```
1. https://remix.ethereum.org
2. Copiar código de: blockchain/contracts/USDTMinter.sol
3. Crear archivo "USDTMinter.sol" en Remix
4. Compilar (v0.8.0+)
5. Deploy en Ethereum Mainnet
6. Copiar dirección del contrato
```

### Paso 2: Configurar .env (2 min)
```env
ETH_RPC_URL=https://eth-mainnet.g.alchemy.com/v2/7iQ1gZ82J1A6Fig-QwHDb4_4GeoayYqj
ETH_PRIVATE_KEY=d1bf385c43fb999290e3e0365f8cc45bfa97b780a97c6eb4bd790ec3fa09a036
USDT_MINTER_ADDRESS=0x[PEGAR_DIRECCIÓN_DEL_CONTRATO]
```

### Paso 3: Iniciar Servidor (1 min)
```bash
npm run dev:full
```

### Paso 4: Emitir USDT (Elige una opción)

**Opción A: Vía Node.js Script**
```bash
node blockchain/scripts/createMoreTokens.js
```

**Opción B: Vía API**
```bash
curl -X POST http://localhost:3000/api/usdt-minter/issue \
  -H "Content-Type: application/json" \
  -d '{"amount": 1000, "reason": "Bridge testing"}'
```

### Paso 5: Verificar en Etherscan
```
https://etherscan.io/tx/[TX_HASH]
```

---

## 🎯 Casos de Uso

### Caso 1: Convertir USD a USDT (Bridge)
```
Usuario: 100 USD → USDT
Backend:
  1. Emite 99 USDT (1% comisión)
  2. Transfiere al usuario
  3. Retorna TX confirmada
```

### Caso 2: Aumentar Pool de Liquidez
```
Administrador:
  1. Emite 10,000 USDT
  2. Transfiere a liquidity pool
  3. Audita en blockchain
```

### Caso 3: Recargar Saldo de Prueba
```
QA Team:
  1. Emite 1000 USDT
  2. Distribuye entre cuentas de prueba
  3. Testea transacciones
```

---

## 🔧 API Reference Rápida

### 1. Emitir USDT
```bash
POST /api/usdt-minter/issue

{
  "amount": 1000,
  "reason": "Optional reason for audit"
}

RESPUESTA: {
  "success": true,
  "txHash": "0x...",
  "amountIssued": 1000,
  "balanceAfter": "1000",
  "etherscanUrl": "..."
}
```

### 2. Ver Status
```bash
GET /api/usdt-minter/status

RESPUESTA: {
  "status": "active",
  "minterBalance": "1000 USDT",
  "totalSupply": "1000 USDT",
  "totalIssueRecords": 5
}
```

### 3. Validar Setup
```bash
POST /api/usdt-minter/validate-setup

RESPUESTA: {
  "success": true,
  "configuration": {
    "signerAddress": "0x...",
    "signerBalance": "0.5 ETH",
    "minterAddress": "0x..."
  }
}
```

---

## ⚠️ Troubleshooting Rápido

| Problema | Solución |
|----------|----------|
| `RPC Error` | Verificar ETH_RPC_URL en .env |
| `Balance ETH 0` | Enviar 0.1 ETH a dirección del signer |
| `MINTER_ADDRESS no configurada` | Agregar dirección al .env |
| `Permission Denied` | Verificar private key es del propietario |
| `TX reverted` | Verificar que signer tiene ETH para gas |

---

## 📊 Flujo Completo Diagrama

```
Usuario
   ↓
POST /api/uniswap/swap (100 USD)
   ↓
Backend Express
   ├─ Calcula: 99 USDT (menos 1%)
   └─ Verifica signer balance
   ↓
POST /api/usdt-minter/issue (99 USDT)
   ↓
USDT Minter Contract
   ├─ onlyOwner check ✓
   └─ issue(99000000) [6 decimales]
   ↓
USDT Real Contract
   └─ Emite 99 USDT
   ↓
Respuesta al Usuario
   ├─ ✅ 99 USDT recibidos
   ├─ 📍 TX: 0x...
   └─ 🔗 Etherscan: https://...
```

---

## 🔐 Seguridad - Checklist

- [ ] Clave privada guardada en .env (nunca en código)
- [ ] Signer tiene ETH para gas fees
- [ ] Contrato deployado en Ethereum Mainnet
- [ ] Límite de emisión configurado (1 millón USDT)
- [ ] Auditoría de emisiones habilitada
- [ ] Rate limiting implementado

---

## 📞 Soporte Rápido

**Guía completa:** `USDT_MINTER_GUIA_COMPLETA.md`
**Ejemplos código:** `blockchain/USDT_MINTER_EJEMPLOS.js`
**README detallado:** `blockchain/USDT_MINTER_README.md`

---

## ✅ Checklist de Implementación

```
[ ] 1. Crear .env con credenciales
[ ] 2. Deploy del contrato en Remix
[ ] 3. Copiar dirección y guardar en .env
[ ] 4. npm run dev:full (iniciar servidor)
[ ] 5. Ejecutar: node blockchain/scripts/createMoreTokens.js
[ ] 6. Verificar TX en Etherscan
[ ] 7. Prueba API: POST /api/usdt-minter/issue
[ ] 8. Verificar balance en /api/usdt-minter/status
[ ] 9. Integrar con frontend (opcional)
[ ] 10. ¡Sistema listo en producción!
```

---

**Versión:** 1.0.0
**Actualizado:** 2025-01-03
**Sistema:** DAES CoreBanking - USDT Minter v1.0



## En 5 Minutos ⚡

### Paso 1: Deploy del Contrato (5 min en Remix)
```
1. https://remix.ethereum.org
2. Copiar código de: blockchain/contracts/USDTMinter.sol
3. Crear archivo "USDTMinter.sol" en Remix
4. Compilar (v0.8.0+)
5. Deploy en Ethereum Mainnet
6. Copiar dirección del contrato
```

### Paso 2: Configurar .env (2 min)
```env
ETH_RPC_URL=https://eth-mainnet.g.alchemy.com/v2/7iQ1gZ82J1A6Fig-QwHDb4_4GeoayYqj
ETH_PRIVATE_KEY=d1bf385c43fb999290e3e0365f8cc45bfa97b780a97c6eb4bd790ec3fa09a036
USDT_MINTER_ADDRESS=0x[PEGAR_DIRECCIÓN_DEL_CONTRATO]
```

### Paso 3: Iniciar Servidor (1 min)
```bash
npm run dev:full
```

### Paso 4: Emitir USDT (Elige una opción)

**Opción A: Vía Node.js Script**
```bash
node blockchain/scripts/createMoreTokens.js
```

**Opción B: Vía API**
```bash
curl -X POST http://localhost:3000/api/usdt-minter/issue \
  -H "Content-Type: application/json" \
  -d '{"amount": 1000, "reason": "Bridge testing"}'
```

### Paso 5: Verificar en Etherscan
```
https://etherscan.io/tx/[TX_HASH]
```

---

## 🎯 Casos de Uso

### Caso 1: Convertir USD a USDT (Bridge)
```
Usuario: 100 USD → USDT
Backend:
  1. Emite 99 USDT (1% comisión)
  2. Transfiere al usuario
  3. Retorna TX confirmada
```

### Caso 2: Aumentar Pool de Liquidez
```
Administrador:
  1. Emite 10,000 USDT
  2. Transfiere a liquidity pool
  3. Audita en blockchain
```

### Caso 3: Recargar Saldo de Prueba
```
QA Team:
  1. Emite 1000 USDT
  2. Distribuye entre cuentas de prueba
  3. Testea transacciones
```

---

## 🔧 API Reference Rápida

### 1. Emitir USDT
```bash
POST /api/usdt-minter/issue

{
  "amount": 1000,
  "reason": "Optional reason for audit"
}

RESPUESTA: {
  "success": true,
  "txHash": "0x...",
  "amountIssued": 1000,
  "balanceAfter": "1000",
  "etherscanUrl": "..."
}
```

### 2. Ver Status
```bash
GET /api/usdt-minter/status

RESPUESTA: {
  "status": "active",
  "minterBalance": "1000 USDT",
  "totalSupply": "1000 USDT",
  "totalIssueRecords": 5
}
```

### 3. Validar Setup
```bash
POST /api/usdt-minter/validate-setup

RESPUESTA: {
  "success": true,
  "configuration": {
    "signerAddress": "0x...",
    "signerBalance": "0.5 ETH",
    "minterAddress": "0x..."
  }
}
```

---

## ⚠️ Troubleshooting Rápido

| Problema | Solución |
|----------|----------|
| `RPC Error` | Verificar ETH_RPC_URL en .env |
| `Balance ETH 0` | Enviar 0.1 ETH a dirección del signer |
| `MINTER_ADDRESS no configurada` | Agregar dirección al .env |
| `Permission Denied` | Verificar private key es del propietario |
| `TX reverted` | Verificar que signer tiene ETH para gas |

---

## 📊 Flujo Completo Diagrama

```
Usuario
   ↓
POST /api/uniswap/swap (100 USD)
   ↓
Backend Express
   ├─ Calcula: 99 USDT (menos 1%)
   └─ Verifica signer balance
   ↓
POST /api/usdt-minter/issue (99 USDT)
   ↓
USDT Minter Contract
   ├─ onlyOwner check ✓
   └─ issue(99000000) [6 decimales]
   ↓
USDT Real Contract
   └─ Emite 99 USDT
   ↓
Respuesta al Usuario
   ├─ ✅ 99 USDT recibidos
   ├─ 📍 TX: 0x...
   └─ 🔗 Etherscan: https://...
```

---

## 🔐 Seguridad - Checklist

- [ ] Clave privada guardada en .env (nunca en código)
- [ ] Signer tiene ETH para gas fees
- [ ] Contrato deployado en Ethereum Mainnet
- [ ] Límite de emisión configurado (1 millón USDT)
- [ ] Auditoría de emisiones habilitada
- [ ] Rate limiting implementado

---

## 📞 Soporte Rápido

**Guía completa:** `USDT_MINTER_GUIA_COMPLETA.md`
**Ejemplos código:** `blockchain/USDT_MINTER_EJEMPLOS.js`
**README detallado:** `blockchain/USDT_MINTER_README.md`

---

## ✅ Checklist de Implementación

```
[ ] 1. Crear .env con credenciales
[ ] 2. Deploy del contrato en Remix
[ ] 3. Copiar dirección y guardar en .env
[ ] 4. npm run dev:full (iniciar servidor)
[ ] 5. Ejecutar: node blockchain/scripts/createMoreTokens.js
[ ] 6. Verificar TX en Etherscan
[ ] 7. Prueba API: POST /api/usdt-minter/issue
[ ] 8. Verificar balance en /api/usdt-minter/status
[ ] 9. Integrar con frontend (opcional)
[ ] 10. ¡Sistema listo en producción!
```

---

**Versión:** 1.0.0
**Actualizado:** 2025-01-03
**Sistema:** DAES CoreBanking - USDT Minter v1.0



## En 5 Minutos ⚡

### Paso 1: Deploy del Contrato (5 min en Remix)
```
1. https://remix.ethereum.org
2. Copiar código de: blockchain/contracts/USDTMinter.sol
3. Crear archivo "USDTMinter.sol" en Remix
4. Compilar (v0.8.0+)
5. Deploy en Ethereum Mainnet
6. Copiar dirección del contrato
```

### Paso 2: Configurar .env (2 min)
```env
ETH_RPC_URL=https://eth-mainnet.g.alchemy.com/v2/7iQ1gZ82J1A6Fig-QwHDb4_4GeoayYqj
ETH_PRIVATE_KEY=d1bf385c43fb999290e3e0365f8cc45bfa97b780a97c6eb4bd790ec3fa09a036
USDT_MINTER_ADDRESS=0x[PEGAR_DIRECCIÓN_DEL_CONTRATO]
```

### Paso 3: Iniciar Servidor (1 min)
```bash
npm run dev:full
```

### Paso 4: Emitir USDT (Elige una opción)

**Opción A: Vía Node.js Script**
```bash
node blockchain/scripts/createMoreTokens.js
```

**Opción B: Vía API**
```bash
curl -X POST http://localhost:3000/api/usdt-minter/issue \
  -H "Content-Type: application/json" \
  -d '{"amount": 1000, "reason": "Bridge testing"}'
```

### Paso 5: Verificar en Etherscan
```
https://etherscan.io/tx/[TX_HASH]
```

---

## 🎯 Casos de Uso

### Caso 1: Convertir USD a USDT (Bridge)
```
Usuario: 100 USD → USDT
Backend:
  1. Emite 99 USDT (1% comisión)
  2. Transfiere al usuario
  3. Retorna TX confirmada
```

### Caso 2: Aumentar Pool de Liquidez
```
Administrador:
  1. Emite 10,000 USDT
  2. Transfiere a liquidity pool
  3. Audita en blockchain
```

### Caso 3: Recargar Saldo de Prueba
```
QA Team:
  1. Emite 1000 USDT
  2. Distribuye entre cuentas de prueba
  3. Testea transacciones
```

---

## 🔧 API Reference Rápida

### 1. Emitir USDT
```bash
POST /api/usdt-minter/issue

{
  "amount": 1000,
  "reason": "Optional reason for audit"
}

RESPUESTA: {
  "success": true,
  "txHash": "0x...",
  "amountIssued": 1000,
  "balanceAfter": "1000",
  "etherscanUrl": "..."
}
```

### 2. Ver Status
```bash
GET /api/usdt-minter/status

RESPUESTA: {
  "status": "active",
  "minterBalance": "1000 USDT",
  "totalSupply": "1000 USDT",
  "totalIssueRecords": 5
}
```

### 3. Validar Setup
```bash
POST /api/usdt-minter/validate-setup

RESPUESTA: {
  "success": true,
  "configuration": {
    "signerAddress": "0x...",
    "signerBalance": "0.5 ETH",
    "minterAddress": "0x..."
  }
}
```

---

## ⚠️ Troubleshooting Rápido

| Problema | Solución |
|----------|----------|
| `RPC Error` | Verificar ETH_RPC_URL en .env |
| `Balance ETH 0` | Enviar 0.1 ETH a dirección del signer |
| `MINTER_ADDRESS no configurada` | Agregar dirección al .env |
| `Permission Denied` | Verificar private key es del propietario |
| `TX reverted` | Verificar que signer tiene ETH para gas |

---

## 📊 Flujo Completo Diagrama

```
Usuario
   ↓
POST /api/uniswap/swap (100 USD)
   ↓
Backend Express
   ├─ Calcula: 99 USDT (menos 1%)
   └─ Verifica signer balance
   ↓
POST /api/usdt-minter/issue (99 USDT)
   ↓
USDT Minter Contract
   ├─ onlyOwner check ✓
   └─ issue(99000000) [6 decimales]
   ↓
USDT Real Contract
   └─ Emite 99 USDT
   ↓
Respuesta al Usuario
   ├─ ✅ 99 USDT recibidos
   ├─ 📍 TX: 0x...
   └─ 🔗 Etherscan: https://...
```

---

## 🔐 Seguridad - Checklist

- [ ] Clave privada guardada en .env (nunca en código)
- [ ] Signer tiene ETH para gas fees
- [ ] Contrato deployado en Ethereum Mainnet
- [ ] Límite de emisión configurado (1 millón USDT)
- [ ] Auditoría de emisiones habilitada
- [ ] Rate limiting implementado

---

## 📞 Soporte Rápido

**Guía completa:** `USDT_MINTER_GUIA_COMPLETA.md`
**Ejemplos código:** `blockchain/USDT_MINTER_EJEMPLOS.js`
**README detallado:** `blockchain/USDT_MINTER_README.md`

---

## ✅ Checklist de Implementación

```
[ ] 1. Crear .env con credenciales
[ ] 2. Deploy del contrato en Remix
[ ] 3. Copiar dirección y guardar en .env
[ ] 4. npm run dev:full (iniciar servidor)
[ ] 5. Ejecutar: node blockchain/scripts/createMoreTokens.js
[ ] 6. Verificar TX en Etherscan
[ ] 7. Prueba API: POST /api/usdt-minter/issue
[ ] 8. Verificar balance en /api/usdt-minter/status
[ ] 9. Integrar con frontend (opcional)
[ ] 10. ¡Sistema listo en producción!
```

---

**Versión:** 1.0.0
**Actualizado:** 2025-01-03
**Sistema:** DAES CoreBanking - USDT Minter v1.0



## En 5 Minutos ⚡

### Paso 1: Deploy del Contrato (5 min en Remix)
```
1. https://remix.ethereum.org
2. Copiar código de: blockchain/contracts/USDTMinter.sol
3. Crear archivo "USDTMinter.sol" en Remix
4. Compilar (v0.8.0+)
5. Deploy en Ethereum Mainnet
6. Copiar dirección del contrato
```

### Paso 2: Configurar .env (2 min)
```env
ETH_RPC_URL=https://eth-mainnet.g.alchemy.com/v2/7iQ1gZ82J1A6Fig-QwHDb4_4GeoayYqj
ETH_PRIVATE_KEY=d1bf385c43fb999290e3e0365f8cc45bfa97b780a97c6eb4bd790ec3fa09a036
USDT_MINTER_ADDRESS=0x[PEGAR_DIRECCIÓN_DEL_CONTRATO]
```

### Paso 3: Iniciar Servidor (1 min)
```bash
npm run dev:full
```

### Paso 4: Emitir USDT (Elige una opción)

**Opción A: Vía Node.js Script**
```bash
node blockchain/scripts/createMoreTokens.js
```

**Opción B: Vía API**
```bash
curl -X POST http://localhost:3000/api/usdt-minter/issue \
  -H "Content-Type: application/json" \
  -d '{"amount": 1000, "reason": "Bridge testing"}'
```

### Paso 5: Verificar en Etherscan
```
https://etherscan.io/tx/[TX_HASH]
```

---

## 🎯 Casos de Uso

### Caso 1: Convertir USD a USDT (Bridge)
```
Usuario: 100 USD → USDT
Backend:
  1. Emite 99 USDT (1% comisión)
  2. Transfiere al usuario
  3. Retorna TX confirmada
```

### Caso 2: Aumentar Pool de Liquidez
```
Administrador:
  1. Emite 10,000 USDT
  2. Transfiere a liquidity pool
  3. Audita en blockchain
```

### Caso 3: Recargar Saldo de Prueba
```
QA Team:
  1. Emite 1000 USDT
  2. Distribuye entre cuentas de prueba
  3. Testea transacciones
```

---

## 🔧 API Reference Rápida

### 1. Emitir USDT
```bash
POST /api/usdt-minter/issue

{
  "amount": 1000,
  "reason": "Optional reason for audit"
}

RESPUESTA: {
  "success": true,
  "txHash": "0x...",
  "amountIssued": 1000,
  "balanceAfter": "1000",
  "etherscanUrl": "..."
}
```

### 2. Ver Status
```bash
GET /api/usdt-minter/status

RESPUESTA: {
  "status": "active",
  "minterBalance": "1000 USDT",
  "totalSupply": "1000 USDT",
  "totalIssueRecords": 5
}
```

### 3. Validar Setup
```bash
POST /api/usdt-minter/validate-setup

RESPUESTA: {
  "success": true,
  "configuration": {
    "signerAddress": "0x...",
    "signerBalance": "0.5 ETH",
    "minterAddress": "0x..."
  }
}
```

---

## ⚠️ Troubleshooting Rápido

| Problema | Solución |
|----------|----------|
| `RPC Error` | Verificar ETH_RPC_URL en .env |
| `Balance ETH 0` | Enviar 0.1 ETH a dirección del signer |
| `MINTER_ADDRESS no configurada` | Agregar dirección al .env |
| `Permission Denied` | Verificar private key es del propietario |
| `TX reverted` | Verificar que signer tiene ETH para gas |

---

## 📊 Flujo Completo Diagrama

```
Usuario
   ↓
POST /api/uniswap/swap (100 USD)
   ↓
Backend Express
   ├─ Calcula: 99 USDT (menos 1%)
   └─ Verifica signer balance
   ↓
POST /api/usdt-minter/issue (99 USDT)
   ↓
USDT Minter Contract
   ├─ onlyOwner check ✓
   └─ issue(99000000) [6 decimales]
   ↓
USDT Real Contract
   └─ Emite 99 USDT
   ↓
Respuesta al Usuario
   ├─ ✅ 99 USDT recibidos
   ├─ 📍 TX: 0x...
   └─ 🔗 Etherscan: https://...
```

---

## 🔐 Seguridad - Checklist

- [ ] Clave privada guardada en .env (nunca en código)
- [ ] Signer tiene ETH para gas fees
- [ ] Contrato deployado en Ethereum Mainnet
- [ ] Límite de emisión configurado (1 millón USDT)
- [ ] Auditoría de emisiones habilitada
- [ ] Rate limiting implementado

---

## 📞 Soporte Rápido

**Guía completa:** `USDT_MINTER_GUIA_COMPLETA.md`
**Ejemplos código:** `blockchain/USDT_MINTER_EJEMPLOS.js`
**README detallado:** `blockchain/USDT_MINTER_README.md`

---

## ✅ Checklist de Implementación

```
[ ] 1. Crear .env con credenciales
[ ] 2. Deploy del contrato en Remix
[ ] 3. Copiar dirección y guardar en .env
[ ] 4. npm run dev:full (iniciar servidor)
[ ] 5. Ejecutar: node blockchain/scripts/createMoreTokens.js
[ ] 6. Verificar TX en Etherscan
[ ] 7. Prueba API: POST /api/usdt-minter/issue
[ ] 8. Verificar balance en /api/usdt-minter/status
[ ] 9. Integrar con frontend (opcional)
[ ] 10. ¡Sistema listo en producción!
```

---

**Versión:** 1.0.0
**Actualizado:** 2025-01-03
**Sistema:** DAES CoreBanking - USDT Minter v1.0



## En 5 Minutos ⚡

### Paso 1: Deploy del Contrato (5 min en Remix)
```
1. https://remix.ethereum.org
2. Copiar código de: blockchain/contracts/USDTMinter.sol
3. Crear archivo "USDTMinter.sol" en Remix
4. Compilar (v0.8.0+)
5. Deploy en Ethereum Mainnet
6. Copiar dirección del contrato
```

### Paso 2: Configurar .env (2 min)
```env
ETH_RPC_URL=https://eth-mainnet.g.alchemy.com/v2/7iQ1gZ82J1A6Fig-QwHDb4_4GeoayYqj
ETH_PRIVATE_KEY=d1bf385c43fb999290e3e0365f8cc45bfa97b780a97c6eb4bd790ec3fa09a036
USDT_MINTER_ADDRESS=0x[PEGAR_DIRECCIÓN_DEL_CONTRATO]
```

### Paso 3: Iniciar Servidor (1 min)
```bash
npm run dev:full
```

### Paso 4: Emitir USDT (Elige una opción)

**Opción A: Vía Node.js Script**
```bash
node blockchain/scripts/createMoreTokens.js
```

**Opción B: Vía API**
```bash
curl -X POST http://localhost:3000/api/usdt-minter/issue \
  -H "Content-Type: application/json" \
  -d '{"amount": 1000, "reason": "Bridge testing"}'
```

### Paso 5: Verificar en Etherscan
```
https://etherscan.io/tx/[TX_HASH]
```

---

## 🎯 Casos de Uso

### Caso 1: Convertir USD a USDT (Bridge)
```
Usuario: 100 USD → USDT
Backend:
  1. Emite 99 USDT (1% comisión)
  2. Transfiere al usuario
  3. Retorna TX confirmada
```

### Caso 2: Aumentar Pool de Liquidez
```
Administrador:
  1. Emite 10,000 USDT
  2. Transfiere a liquidity pool
  3. Audita en blockchain
```

### Caso 3: Recargar Saldo de Prueba
```
QA Team:
  1. Emite 1000 USDT
  2. Distribuye entre cuentas de prueba
  3. Testea transacciones
```

---

## 🔧 API Reference Rápida

### 1. Emitir USDT
```bash
POST /api/usdt-minter/issue

{
  "amount": 1000,
  "reason": "Optional reason for audit"
}

RESPUESTA: {
  "success": true,
  "txHash": "0x...",
  "amountIssued": 1000,
  "balanceAfter": "1000",
  "etherscanUrl": "..."
}
```

### 2. Ver Status
```bash
GET /api/usdt-minter/status

RESPUESTA: {
  "status": "active",
  "minterBalance": "1000 USDT",
  "totalSupply": "1000 USDT",
  "totalIssueRecords": 5
}
```

### 3. Validar Setup
```bash
POST /api/usdt-minter/validate-setup

RESPUESTA: {
  "success": true,
  "configuration": {
    "signerAddress": "0x...",
    "signerBalance": "0.5 ETH",
    "minterAddress": "0x..."
  }
}
```

---

## ⚠️ Troubleshooting Rápido

| Problema | Solución |
|----------|----------|
| `RPC Error` | Verificar ETH_RPC_URL en .env |
| `Balance ETH 0` | Enviar 0.1 ETH a dirección del signer |
| `MINTER_ADDRESS no configurada` | Agregar dirección al .env |
| `Permission Denied` | Verificar private key es del propietario |
| `TX reverted` | Verificar que signer tiene ETH para gas |

---

## 📊 Flujo Completo Diagrama

```
Usuario
   ↓
POST /api/uniswap/swap (100 USD)
   ↓
Backend Express
   ├─ Calcula: 99 USDT (menos 1%)
   └─ Verifica signer balance
   ↓
POST /api/usdt-minter/issue (99 USDT)
   ↓
USDT Minter Contract
   ├─ onlyOwner check ✓
   └─ issue(99000000) [6 decimales]
   ↓
USDT Real Contract
   └─ Emite 99 USDT
   ↓
Respuesta al Usuario
   ├─ ✅ 99 USDT recibidos
   ├─ 📍 TX: 0x...
   └─ 🔗 Etherscan: https://...
```

---

## 🔐 Seguridad - Checklist

- [ ] Clave privada guardada en .env (nunca en código)
- [ ] Signer tiene ETH para gas fees
- [ ] Contrato deployado en Ethereum Mainnet
- [ ] Límite de emisión configurado (1 millón USDT)
- [ ] Auditoría de emisiones habilitada
- [ ] Rate limiting implementado

---

## 📞 Soporte Rápido

**Guía completa:** `USDT_MINTER_GUIA_COMPLETA.md`
**Ejemplos código:** `blockchain/USDT_MINTER_EJEMPLOS.js`
**README detallado:** `blockchain/USDT_MINTER_README.md`

---

## ✅ Checklist de Implementación

```
[ ] 1. Crear .env con credenciales
[ ] 2. Deploy del contrato en Remix
[ ] 3. Copiar dirección y guardar en .env
[ ] 4. npm run dev:full (iniciar servidor)
[ ] 5. Ejecutar: node blockchain/scripts/createMoreTokens.js
[ ] 6. Verificar TX en Etherscan
[ ] 7. Prueba API: POST /api/usdt-minter/issue
[ ] 8. Verificar balance en /api/usdt-minter/status
[ ] 9. Integrar con frontend (opcional)
[ ] 10. ¡Sistema listo en producción!
```

---

**Versión:** 1.0.0
**Actualizado:** 2025-01-03
**Sistema:** DAES CoreBanking - USDT Minter v1.0



## En 5 Minutos ⚡

### Paso 1: Deploy del Contrato (5 min en Remix)
```
1. https://remix.ethereum.org
2. Copiar código de: blockchain/contracts/USDTMinter.sol
3. Crear archivo "USDTMinter.sol" en Remix
4. Compilar (v0.8.0+)
5. Deploy en Ethereum Mainnet
6. Copiar dirección del contrato
```

### Paso 2: Configurar .env (2 min)
```env
ETH_RPC_URL=https://eth-mainnet.g.alchemy.com/v2/7iQ1gZ82J1A6Fig-QwHDb4_4GeoayYqj
ETH_PRIVATE_KEY=d1bf385c43fb999290e3e0365f8cc45bfa97b780a97c6eb4bd790ec3fa09a036
USDT_MINTER_ADDRESS=0x[PEGAR_DIRECCIÓN_DEL_CONTRATO]
```

### Paso 3: Iniciar Servidor (1 min)
```bash
npm run dev:full
```

### Paso 4: Emitir USDT (Elige una opción)

**Opción A: Vía Node.js Script**
```bash
node blockchain/scripts/createMoreTokens.js
```

**Opción B: Vía API**
```bash
curl -X POST http://localhost:3000/api/usdt-minter/issue \
  -H "Content-Type: application/json" \
  -d '{"amount": 1000, "reason": "Bridge testing"}'
```

### Paso 5: Verificar en Etherscan
```
https://etherscan.io/tx/[TX_HASH]
```

---

## 🎯 Casos de Uso

### Caso 1: Convertir USD a USDT (Bridge)
```
Usuario: 100 USD → USDT
Backend:
  1. Emite 99 USDT (1% comisión)
  2. Transfiere al usuario
  3. Retorna TX confirmada
```

### Caso 2: Aumentar Pool de Liquidez
```
Administrador:
  1. Emite 10,000 USDT
  2. Transfiere a liquidity pool
  3. Audita en blockchain
```

### Caso 3: Recargar Saldo de Prueba
```
QA Team:
  1. Emite 1000 USDT
  2. Distribuye entre cuentas de prueba
  3. Testea transacciones
```

---

## 🔧 API Reference Rápida

### 1. Emitir USDT
```bash
POST /api/usdt-minter/issue

{
  "amount": 1000,
  "reason": "Optional reason for audit"
}

RESPUESTA: {
  "success": true,
  "txHash": "0x...",
  "amountIssued": 1000,
  "balanceAfter": "1000",
  "etherscanUrl": "..."
}
```

### 2. Ver Status
```bash
GET /api/usdt-minter/status

RESPUESTA: {
  "status": "active",
  "minterBalance": "1000 USDT",
  "totalSupply": "1000 USDT",
  "totalIssueRecords": 5
}
```

### 3. Validar Setup
```bash
POST /api/usdt-minter/validate-setup

RESPUESTA: {
  "success": true,
  "configuration": {
    "signerAddress": "0x...",
    "signerBalance": "0.5 ETH",
    "minterAddress": "0x..."
  }
}
```

---

## ⚠️ Troubleshooting Rápido

| Problema | Solución |
|----------|----------|
| `RPC Error` | Verificar ETH_RPC_URL en .env |
| `Balance ETH 0` | Enviar 0.1 ETH a dirección del signer |
| `MINTER_ADDRESS no configurada` | Agregar dirección al .env |
| `Permission Denied` | Verificar private key es del propietario |
| `TX reverted` | Verificar que signer tiene ETH para gas |

---

## 📊 Flujo Completo Diagrama

```
Usuario
   ↓
POST /api/uniswap/swap (100 USD)
   ↓
Backend Express
   ├─ Calcula: 99 USDT (menos 1%)
   └─ Verifica signer balance
   ↓
POST /api/usdt-minter/issue (99 USDT)
   ↓
USDT Minter Contract
   ├─ onlyOwner check ✓
   └─ issue(99000000) [6 decimales]
   ↓
USDT Real Contract
   └─ Emite 99 USDT
   ↓
Respuesta al Usuario
   ├─ ✅ 99 USDT recibidos
   ├─ 📍 TX: 0x...
   └─ 🔗 Etherscan: https://...
```

---

## 🔐 Seguridad - Checklist

- [ ] Clave privada guardada en .env (nunca en código)
- [ ] Signer tiene ETH para gas fees
- [ ] Contrato deployado en Ethereum Mainnet
- [ ] Límite de emisión configurado (1 millón USDT)
- [ ] Auditoría de emisiones habilitada
- [ ] Rate limiting implementado

---

## 📞 Soporte Rápido

**Guía completa:** `USDT_MINTER_GUIA_COMPLETA.md`
**Ejemplos código:** `blockchain/USDT_MINTER_EJEMPLOS.js`
**README detallado:** `blockchain/USDT_MINTER_README.md`

---

## ✅ Checklist de Implementación

```
[ ] 1. Crear .env con credenciales
[ ] 2. Deploy del contrato en Remix
[ ] 3. Copiar dirección y guardar en .env
[ ] 4. npm run dev:full (iniciar servidor)
[ ] 5. Ejecutar: node blockchain/scripts/createMoreTokens.js
[ ] 6. Verificar TX en Etherscan
[ ] 7. Prueba API: POST /api/usdt-minter/issue
[ ] 8. Verificar balance en /api/usdt-minter/status
[ ] 9. Integrar con frontend (opcional)
[ ] 10. ¡Sistema listo en producción!
```

---

**Versión:** 1.0.0
**Actualizado:** 2025-01-03
**Sistema:** DAES CoreBanking - USDT Minter v1.0



## En 5 Minutos ⚡

### Paso 1: Deploy del Contrato (5 min en Remix)
```
1. https://remix.ethereum.org
2. Copiar código de: blockchain/contracts/USDTMinter.sol
3. Crear archivo "USDTMinter.sol" en Remix
4. Compilar (v0.8.0+)
5. Deploy en Ethereum Mainnet
6. Copiar dirección del contrato
```

### Paso 2: Configurar .env (2 min)
```env
ETH_RPC_URL=https://eth-mainnet.g.alchemy.com/v2/7iQ1gZ82J1A6Fig-QwHDb4_4GeoayYqj
ETH_PRIVATE_KEY=d1bf385c43fb999290e3e0365f8cc45bfa97b780a97c6eb4bd790ec3fa09a036
USDT_MINTER_ADDRESS=0x[PEGAR_DIRECCIÓN_DEL_CONTRATO]
```

### Paso 3: Iniciar Servidor (1 min)
```bash
npm run dev:full
```

### Paso 4: Emitir USDT (Elige una opción)

**Opción A: Vía Node.js Script**
```bash
node blockchain/scripts/createMoreTokens.js
```

**Opción B: Vía API**
```bash
curl -X POST http://localhost:3000/api/usdt-minter/issue \
  -H "Content-Type: application/json" \
  -d '{"amount": 1000, "reason": "Bridge testing"}'
```

### Paso 5: Verificar en Etherscan
```
https://etherscan.io/tx/[TX_HASH]
```

---

## 🎯 Casos de Uso

### Caso 1: Convertir USD a USDT (Bridge)
```
Usuario: 100 USD → USDT
Backend:
  1. Emite 99 USDT (1% comisión)
  2. Transfiere al usuario
  3. Retorna TX confirmada
```

### Caso 2: Aumentar Pool de Liquidez
```
Administrador:
  1. Emite 10,000 USDT
  2. Transfiere a liquidity pool
  3. Audita en blockchain
```

### Caso 3: Recargar Saldo de Prueba
```
QA Team:
  1. Emite 1000 USDT
  2. Distribuye entre cuentas de prueba
  3. Testea transacciones
```

---

## 🔧 API Reference Rápida

### 1. Emitir USDT
```bash
POST /api/usdt-minter/issue

{
  "amount": 1000,
  "reason": "Optional reason for audit"
}

RESPUESTA: {
  "success": true,
  "txHash": "0x...",
  "amountIssued": 1000,
  "balanceAfter": "1000",
  "etherscanUrl": "..."
}
```

### 2. Ver Status
```bash
GET /api/usdt-minter/status

RESPUESTA: {
  "status": "active",
  "minterBalance": "1000 USDT",
  "totalSupply": "1000 USDT",
  "totalIssueRecords": 5
}
```

### 3. Validar Setup
```bash
POST /api/usdt-minter/validate-setup

RESPUESTA: {
  "success": true,
  "configuration": {
    "signerAddress": "0x...",
    "signerBalance": "0.5 ETH",
    "minterAddress": "0x..."
  }
}
```

---

## ⚠️ Troubleshooting Rápido

| Problema | Solución |
|----------|----------|
| `RPC Error` | Verificar ETH_RPC_URL en .env |
| `Balance ETH 0` | Enviar 0.1 ETH a dirección del signer |
| `MINTER_ADDRESS no configurada` | Agregar dirección al .env |
| `Permission Denied` | Verificar private key es del propietario |
| `TX reverted` | Verificar que signer tiene ETH para gas |

---

## 📊 Flujo Completo Diagrama

```
Usuario
   ↓
POST /api/uniswap/swap (100 USD)
   ↓
Backend Express
   ├─ Calcula: 99 USDT (menos 1%)
   └─ Verifica signer balance
   ↓
POST /api/usdt-minter/issue (99 USDT)
   ↓
USDT Minter Contract
   ├─ onlyOwner check ✓
   └─ issue(99000000) [6 decimales]
   ↓
USDT Real Contract
   └─ Emite 99 USDT
   ↓
Respuesta al Usuario
   ├─ ✅ 99 USDT recibidos
   ├─ 📍 TX: 0x...
   └─ 🔗 Etherscan: https://...
```

---

## 🔐 Seguridad - Checklist

- [ ] Clave privada guardada en .env (nunca en código)
- [ ] Signer tiene ETH para gas fees
- [ ] Contrato deployado en Ethereum Mainnet
- [ ] Límite de emisión configurado (1 millón USDT)
- [ ] Auditoría de emisiones habilitada
- [ ] Rate limiting implementado

---

## 📞 Soporte Rápido

**Guía completa:** `USDT_MINTER_GUIA_COMPLETA.md`
**Ejemplos código:** `blockchain/USDT_MINTER_EJEMPLOS.js`
**README detallado:** `blockchain/USDT_MINTER_README.md`

---

## ✅ Checklist de Implementación

```
[ ] 1. Crear .env con credenciales
[ ] 2. Deploy del contrato en Remix
[ ] 3. Copiar dirección y guardar en .env
[ ] 4. npm run dev:full (iniciar servidor)
[ ] 5. Ejecutar: node blockchain/scripts/createMoreTokens.js
[ ] 6. Verificar TX en Etherscan
[ ] 7. Prueba API: POST /api/usdt-minter/issue
[ ] 8. Verificar balance en /api/usdt-minter/status
[ ] 9. Integrar con frontend (opcional)
[ ] 10. ¡Sistema listo en producción!
```

---

**Versión:** 1.0.0
**Actualizado:** 2025-01-03
**Sistema:** DAES CoreBanking - USDT Minter v1.0



## En 5 Minutos ⚡

### Paso 1: Deploy del Contrato (5 min en Remix)
```
1. https://remix.ethereum.org
2. Copiar código de: blockchain/contracts/USDTMinter.sol
3. Crear archivo "USDTMinter.sol" en Remix
4. Compilar (v0.8.0+)
5. Deploy en Ethereum Mainnet
6. Copiar dirección del contrato
```

### Paso 2: Configurar .env (2 min)
```env
ETH_RPC_URL=https://eth-mainnet.g.alchemy.com/v2/7iQ1gZ82J1A6Fig-QwHDb4_4GeoayYqj
ETH_PRIVATE_KEY=d1bf385c43fb999290e3e0365f8cc45bfa97b780a97c6eb4bd790ec3fa09a036
USDT_MINTER_ADDRESS=0x[PEGAR_DIRECCIÓN_DEL_CONTRATO]
```

### Paso 3: Iniciar Servidor (1 min)
```bash
npm run dev:full
```

### Paso 4: Emitir USDT (Elige una opción)

**Opción A: Vía Node.js Script**
```bash
node blockchain/scripts/createMoreTokens.js
```

**Opción B: Vía API**
```bash
curl -X POST http://localhost:3000/api/usdt-minter/issue \
  -H "Content-Type: application/json" \
  -d '{"amount": 1000, "reason": "Bridge testing"}'
```

### Paso 5: Verificar en Etherscan
```
https://etherscan.io/tx/[TX_HASH]
```

---

## 🎯 Casos de Uso

### Caso 1: Convertir USD a USDT (Bridge)
```
Usuario: 100 USD → USDT
Backend:
  1. Emite 99 USDT (1% comisión)
  2. Transfiere al usuario
  3. Retorna TX confirmada
```

### Caso 2: Aumentar Pool de Liquidez
```
Administrador:
  1. Emite 10,000 USDT
  2. Transfiere a liquidity pool
  3. Audita en blockchain
```

### Caso 3: Recargar Saldo de Prueba
```
QA Team:
  1. Emite 1000 USDT
  2. Distribuye entre cuentas de prueba
  3. Testea transacciones
```

---

## 🔧 API Reference Rápida

### 1. Emitir USDT
```bash
POST /api/usdt-minter/issue

{
  "amount": 1000,
  "reason": "Optional reason for audit"
}

RESPUESTA: {
  "success": true,
  "txHash": "0x...",
  "amountIssued": 1000,
  "balanceAfter": "1000",
  "etherscanUrl": "..."
}
```

### 2. Ver Status
```bash
GET /api/usdt-minter/status

RESPUESTA: {
  "status": "active",
  "minterBalance": "1000 USDT",
  "totalSupply": "1000 USDT",
  "totalIssueRecords": 5
}
```

### 3. Validar Setup
```bash
POST /api/usdt-minter/validate-setup

RESPUESTA: {
  "success": true,
  "configuration": {
    "signerAddress": "0x...",
    "signerBalance": "0.5 ETH",
    "minterAddress": "0x..."
  }
}
```

---

## ⚠️ Troubleshooting Rápido

| Problema | Solución |
|----------|----------|
| `RPC Error` | Verificar ETH_RPC_URL en .env |
| `Balance ETH 0` | Enviar 0.1 ETH a dirección del signer |
| `MINTER_ADDRESS no configurada` | Agregar dirección al .env |
| `Permission Denied` | Verificar private key es del propietario |
| `TX reverted` | Verificar que signer tiene ETH para gas |

---

## 📊 Flujo Completo Diagrama

```
Usuario
   ↓
POST /api/uniswap/swap (100 USD)
   ↓
Backend Express
   ├─ Calcula: 99 USDT (menos 1%)
   └─ Verifica signer balance
   ↓
POST /api/usdt-minter/issue (99 USDT)
   ↓
USDT Minter Contract
   ├─ onlyOwner check ✓
   └─ issue(99000000) [6 decimales]
   ↓
USDT Real Contract
   └─ Emite 99 USDT
   ↓
Respuesta al Usuario
   ├─ ✅ 99 USDT recibidos
   ├─ 📍 TX: 0x...
   └─ 🔗 Etherscan: https://...
```

---

## 🔐 Seguridad - Checklist

- [ ] Clave privada guardada en .env (nunca en código)
- [ ] Signer tiene ETH para gas fees
- [ ] Contrato deployado en Ethereum Mainnet
- [ ] Límite de emisión configurado (1 millón USDT)
- [ ] Auditoría de emisiones habilitada
- [ ] Rate limiting implementado

---

## 📞 Soporte Rápido

**Guía completa:** `USDT_MINTER_GUIA_COMPLETA.md`
**Ejemplos código:** `blockchain/USDT_MINTER_EJEMPLOS.js`
**README detallado:** `blockchain/USDT_MINTER_README.md`

---

## ✅ Checklist de Implementación

```
[ ] 1. Crear .env con credenciales
[ ] 2. Deploy del contrato en Remix
[ ] 3. Copiar dirección y guardar en .env
[ ] 4. npm run dev:full (iniciar servidor)
[ ] 5. Ejecutar: node blockchain/scripts/createMoreTokens.js
[ ] 6. Verificar TX en Etherscan
[ ] 7. Prueba API: POST /api/usdt-minter/issue
[ ] 8. Verificar balance en /api/usdt-minter/status
[ ] 9. Integrar con frontend (opcional)
[ ] 10. ¡Sistema listo en producción!
```

---

**Versión:** 1.0.0
**Actualizado:** 2025-01-03
**Sistema:** DAES CoreBanking - USDT Minter v1.0





