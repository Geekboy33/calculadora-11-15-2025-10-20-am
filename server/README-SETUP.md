# 🚀 DAES dUSD Bridge - Setup Rápido

## Paso 1: Configurar .env

```bash
cd server
cp env.example.txt .env
```

Edita `server/.env` con tus valores reales:

```env
# ⚠️ ROTA TU ALCHEMY KEY si fue expuesta
ARBITRUM_RPC_HTTPS=https://arb-mainnet.g.alchemy.com/v2/TU_NUEVA_KEY
ARBITRUM_RPC_WSS=wss://arb-mainnet.g.alchemy.com/v2/TU_NUEVA_KEY

# Private key del DAES Signer (la que autoriza mints)
DAES_SIGNER_PRIVATE_KEY=0x...tu_private_key...

# Private key del Operator (paga gas)
OPERATOR_PRIVATE_KEY=0x...tu_operator_pk...

# Beneficiary temporal (puede ser tu operator para testing)
DEFAULT_BENEFICIARY=0x...tu_treasury_o_operator...
```

## Paso 2: Instalar dependencias

```bash
cd server
npm install
```

## Paso 3: Ejecutar servidor

```bash
npm run dev
```

Deberías ver:
```
============================================================
  DAES dUSD Bridge - Backend Server
============================================================
✅ Server running on http://localhost:3000

📋 Endpoints:
   POST http://localhost:3000/api/dusd/mint-request
   GET  http://localhost:3000/api/dusd/hold/:daes_ref
   GET  http://localhost:3000/api/dusd/holds
   GET  http://localhost:3000/api/dusd/stats
   GET  http://localhost:3000/api/dusd/health
============================================================
```

## Paso 4: Test de salud

```bash
curl http://localhost:3000/health
# {"ok":true,"service":"DAES dUSD Bridge"}

curl http://localhost:3000/api/dusd/health
# {"success":true,"status":"healthy","blockNumber":...,"chainId":42161,...}
```

## Paso 5: Test de mint

```bash
curl -X POST http://localhost:3000/api/dusd/mint-request \
  -H "content-type: application/json" \
  -d '{
    "amount_usd": 1,
    "wallet_destino": "0x05316B102FE62574b9cBd45709f8F1B6C00beC8a",
    "expiry_seconds": 600
  }'
```

Respuesta exitosa:
```json
{
  "success": true,
  "daes_ref": "DAES-...",
  "hold_id": "HOLD-...",
  "tx_hash": "0x...",
  "status": "CAPTURED",
  "minted_to": "0x..."
}
```

---

## 🔐 Checklist de Seguridad

- [ ] `.env` NO subido a git
- [ ] Alchemy key ROTADA
- [ ] `DAES_SIGNER_PRIVATE_KEY` corresponde a address autorizada en BridgeMinter
- [ ] `DEFAULT_BENEFICIARY` es una address que controlas

---

## 📋 Comandos desde raíz del proyecto

```bash
# Ejecutar solo el backend dUSD
npm run server:dusd

# Ejecutar frontend + backend dUSD juntos
npm run dev:dusd
```


## Paso 1: Configurar .env

```bash
cd server
cp env.example.txt .env
```

Edita `server/.env` con tus valores reales:

```env
# ⚠️ ROTA TU ALCHEMY KEY si fue expuesta
ARBITRUM_RPC_HTTPS=https://arb-mainnet.g.alchemy.com/v2/TU_NUEVA_KEY
ARBITRUM_RPC_WSS=wss://arb-mainnet.g.alchemy.com/v2/TU_NUEVA_KEY

# Private key del DAES Signer (la que autoriza mints)
DAES_SIGNER_PRIVATE_KEY=0x...tu_private_key...

# Private key del Operator (paga gas)
OPERATOR_PRIVATE_KEY=0x...tu_operator_pk...

# Beneficiary temporal (puede ser tu operator para testing)
DEFAULT_BENEFICIARY=0x...tu_treasury_o_operator...
```

## Paso 2: Instalar dependencias

```bash
cd server
npm install
```

## Paso 3: Ejecutar servidor

```bash
npm run dev
```

Deberías ver:
```
============================================================
  DAES dUSD Bridge - Backend Server
============================================================
✅ Server running on http://localhost:3000

📋 Endpoints:
   POST http://localhost:3000/api/dusd/mint-request
   GET  http://localhost:3000/api/dusd/hold/:daes_ref
   GET  http://localhost:3000/api/dusd/holds
   GET  http://localhost:3000/api/dusd/stats
   GET  http://localhost:3000/api/dusd/health
============================================================
```

## Paso 4: Test de salud

```bash
curl http://localhost:3000/health
# {"ok":true,"service":"DAES dUSD Bridge"}

curl http://localhost:3000/api/dusd/health
# {"success":true,"status":"healthy","blockNumber":...,"chainId":42161,...}
```

## Paso 5: Test de mint

```bash
curl -X POST http://localhost:3000/api/dusd/mint-request \
  -H "content-type: application/json" \
  -d '{
    "amount_usd": 1,
    "wallet_destino": "0x05316B102FE62574b9cBd45709f8F1B6C00beC8a",
    "expiry_seconds": 600
  }'
```

Respuesta exitosa:
```json
{
  "success": true,
  "daes_ref": "DAES-...",
  "hold_id": "HOLD-...",
  "tx_hash": "0x...",
  "status": "CAPTURED",
  "minted_to": "0x..."
}
```

---

## 🔐 Checklist de Seguridad

- [ ] `.env` NO subido a git
- [ ] Alchemy key ROTADA
- [ ] `DAES_SIGNER_PRIVATE_KEY` corresponde a address autorizada en BridgeMinter
- [ ] `DEFAULT_BENEFICIARY` es una address que controlas

---

## 📋 Comandos desde raíz del proyecto

```bash
# Ejecutar solo el backend dUSD
npm run server:dusd

# Ejecutar frontend + backend dUSD juntos
npm run dev:dusd
```


## Paso 1: Configurar .env

```bash
cd server
cp env.example.txt .env
```

Edita `server/.env` con tus valores reales:

```env
# ⚠️ ROTA TU ALCHEMY KEY si fue expuesta
ARBITRUM_RPC_HTTPS=https://arb-mainnet.g.alchemy.com/v2/TU_NUEVA_KEY
ARBITRUM_RPC_WSS=wss://arb-mainnet.g.alchemy.com/v2/TU_NUEVA_KEY

# Private key del DAES Signer (la que autoriza mints)
DAES_SIGNER_PRIVATE_KEY=0x...tu_private_key...

# Private key del Operator (paga gas)
OPERATOR_PRIVATE_KEY=0x...tu_operator_pk...

# Beneficiary temporal (puede ser tu operator para testing)
DEFAULT_BENEFICIARY=0x...tu_treasury_o_operator...
```

## Paso 2: Instalar dependencias

```bash
cd server
npm install
```

## Paso 3: Ejecutar servidor

```bash
npm run dev
```

Deberías ver:
```
============================================================
  DAES dUSD Bridge - Backend Server
============================================================
✅ Server running on http://localhost:3000

📋 Endpoints:
   POST http://localhost:3000/api/dusd/mint-request
   GET  http://localhost:3000/api/dusd/hold/:daes_ref
   GET  http://localhost:3000/api/dusd/holds
   GET  http://localhost:3000/api/dusd/stats
   GET  http://localhost:3000/api/dusd/health
============================================================
```

## Paso 4: Test de salud

```bash
curl http://localhost:3000/health
# {"ok":true,"service":"DAES dUSD Bridge"}

curl http://localhost:3000/api/dusd/health
# {"success":true,"status":"healthy","blockNumber":...,"chainId":42161,...}
```

## Paso 5: Test de mint

```bash
curl -X POST http://localhost:3000/api/dusd/mint-request \
  -H "content-type: application/json" \
  -d '{
    "amount_usd": 1,
    "wallet_destino": "0x05316B102FE62574b9cBd45709f8F1B6C00beC8a",
    "expiry_seconds": 600
  }'
```

Respuesta exitosa:
```json
{
  "success": true,
  "daes_ref": "DAES-...",
  "hold_id": "HOLD-...",
  "tx_hash": "0x...",
  "status": "CAPTURED",
  "minted_to": "0x..."
}
```

---

## 🔐 Checklist de Seguridad

- [ ] `.env` NO subido a git
- [ ] Alchemy key ROTADA
- [ ] `DAES_SIGNER_PRIVATE_KEY` corresponde a address autorizada en BridgeMinter
- [ ] `DEFAULT_BENEFICIARY` es una address que controlas

---

## 📋 Comandos desde raíz del proyecto

```bash
# Ejecutar solo el backend dUSD
npm run server:dusd

# Ejecutar frontend + backend dUSD juntos
npm run dev:dusd
```


## Paso 1: Configurar .env

```bash
cd server
cp env.example.txt .env
```

Edita `server/.env` con tus valores reales:

```env
# ⚠️ ROTA TU ALCHEMY KEY si fue expuesta
ARBITRUM_RPC_HTTPS=https://arb-mainnet.g.alchemy.com/v2/TU_NUEVA_KEY
ARBITRUM_RPC_WSS=wss://arb-mainnet.g.alchemy.com/v2/TU_NUEVA_KEY

# Private key del DAES Signer (la que autoriza mints)
DAES_SIGNER_PRIVATE_KEY=0x...tu_private_key...

# Private key del Operator (paga gas)
OPERATOR_PRIVATE_KEY=0x...tu_operator_pk...

# Beneficiary temporal (puede ser tu operator para testing)
DEFAULT_BENEFICIARY=0x...tu_treasury_o_operator...
```

## Paso 2: Instalar dependencias

```bash
cd server
npm install
```

## Paso 3: Ejecutar servidor

```bash
npm run dev
```

Deberías ver:
```
============================================================
  DAES dUSD Bridge - Backend Server
============================================================
✅ Server running on http://localhost:3000

📋 Endpoints:
   POST http://localhost:3000/api/dusd/mint-request
   GET  http://localhost:3000/api/dusd/hold/:daes_ref
   GET  http://localhost:3000/api/dusd/holds
   GET  http://localhost:3000/api/dusd/stats
   GET  http://localhost:3000/api/dusd/health
============================================================
```

## Paso 4: Test de salud

```bash
curl http://localhost:3000/health
# {"ok":true,"service":"DAES dUSD Bridge"}

curl http://localhost:3000/api/dusd/health
# {"success":true,"status":"healthy","blockNumber":...,"chainId":42161,...}
```

## Paso 5: Test de mint

```bash
curl -X POST http://localhost:3000/api/dusd/mint-request \
  -H "content-type: application/json" \
  -d '{
    "amount_usd": 1,
    "wallet_destino": "0x05316B102FE62574b9cBd45709f8F1B6C00beC8a",
    "expiry_seconds": 600
  }'
```

Respuesta exitosa:
```json
{
  "success": true,
  "daes_ref": "DAES-...",
  "hold_id": "HOLD-...",
  "tx_hash": "0x...",
  "status": "CAPTURED",
  "minted_to": "0x..."
}
```

---

## 🔐 Checklist de Seguridad

- [ ] `.env` NO subido a git
- [ ] Alchemy key ROTADA
- [ ] `DAES_SIGNER_PRIVATE_KEY` corresponde a address autorizada en BridgeMinter
- [ ] `DEFAULT_BENEFICIARY` es una address que controlas

---

## 📋 Comandos desde raíz del proyecto

```bash
# Ejecutar solo el backend dUSD
npm run server:dusd

# Ejecutar frontend + backend dUSD juntos
npm run dev:dusd
```


## Paso 1: Configurar .env

```bash
cd server
cp env.example.txt .env
```

Edita `server/.env` con tus valores reales:

```env
# ⚠️ ROTA TU ALCHEMY KEY si fue expuesta
ARBITRUM_RPC_HTTPS=https://arb-mainnet.g.alchemy.com/v2/TU_NUEVA_KEY
ARBITRUM_RPC_WSS=wss://arb-mainnet.g.alchemy.com/v2/TU_NUEVA_KEY

# Private key del DAES Signer (la que autoriza mints)
DAES_SIGNER_PRIVATE_KEY=0x...tu_private_key...

# Private key del Operator (paga gas)
OPERATOR_PRIVATE_KEY=0x...tu_operator_pk...

# Beneficiary temporal (puede ser tu operator para testing)
DEFAULT_BENEFICIARY=0x...tu_treasury_o_operator...
```

## Paso 2: Instalar dependencias

```bash
cd server
npm install
```

## Paso 3: Ejecutar servidor

```bash
npm run dev
```

Deberías ver:
```
============================================================
  DAES dUSD Bridge - Backend Server
============================================================
✅ Server running on http://localhost:3000

📋 Endpoints:
   POST http://localhost:3000/api/dusd/mint-request
   GET  http://localhost:3000/api/dusd/hold/:daes_ref
   GET  http://localhost:3000/api/dusd/holds
   GET  http://localhost:3000/api/dusd/stats
   GET  http://localhost:3000/api/dusd/health
============================================================
```

## Paso 4: Test de salud

```bash
curl http://localhost:3000/health
# {"ok":true,"service":"DAES dUSD Bridge"}

curl http://localhost:3000/api/dusd/health
# {"success":true,"status":"healthy","blockNumber":...,"chainId":42161,...}
```

## Paso 5: Test de mint

```bash
curl -X POST http://localhost:3000/api/dusd/mint-request \
  -H "content-type: application/json" \
  -d '{
    "amount_usd": 1,
    "wallet_destino": "0x05316B102FE62574b9cBd45709f8F1B6C00beC8a",
    "expiry_seconds": 600
  }'
```

Respuesta exitosa:
```json
{
  "success": true,
  "daes_ref": "DAES-...",
  "hold_id": "HOLD-...",
  "tx_hash": "0x...",
  "status": "CAPTURED",
  "minted_to": "0x..."
}
```

---

## 🔐 Checklist de Seguridad

- [ ] `.env` NO subido a git
- [ ] Alchemy key ROTADA
- [ ] `DAES_SIGNER_PRIVATE_KEY` corresponde a address autorizada en BridgeMinter
- [ ] `DEFAULT_BENEFICIARY` es una address que controlas

---

## 📋 Comandos desde raíz del proyecto

```bash
# Ejecutar solo el backend dUSD
npm run server:dusd

# Ejecutar frontend + backend dUSD juntos
npm run dev:dusd
```


## Paso 1: Configurar .env

```bash
cd server
cp env.example.txt .env
```

Edita `server/.env` con tus valores reales:

```env
# ⚠️ ROTA TU ALCHEMY KEY si fue expuesta
ARBITRUM_RPC_HTTPS=https://arb-mainnet.g.alchemy.com/v2/TU_NUEVA_KEY
ARBITRUM_RPC_WSS=wss://arb-mainnet.g.alchemy.com/v2/TU_NUEVA_KEY

# Private key del DAES Signer (la que autoriza mints)
DAES_SIGNER_PRIVATE_KEY=0x...tu_private_key...

# Private key del Operator (paga gas)
OPERATOR_PRIVATE_KEY=0x...tu_operator_pk...

# Beneficiary temporal (puede ser tu operator para testing)
DEFAULT_BENEFICIARY=0x...tu_treasury_o_operator...
```

## Paso 2: Instalar dependencias

```bash
cd server
npm install
```

## Paso 3: Ejecutar servidor

```bash
npm run dev
```

Deberías ver:
```
============================================================
  DAES dUSD Bridge - Backend Server
============================================================
✅ Server running on http://localhost:3000

📋 Endpoints:
   POST http://localhost:3000/api/dusd/mint-request
   GET  http://localhost:3000/api/dusd/hold/:daes_ref
   GET  http://localhost:3000/api/dusd/holds
   GET  http://localhost:3000/api/dusd/stats
   GET  http://localhost:3000/api/dusd/health
============================================================
```

## Paso 4: Test de salud

```bash
curl http://localhost:3000/health
# {"ok":true,"service":"DAES dUSD Bridge"}

curl http://localhost:3000/api/dusd/health
# {"success":true,"status":"healthy","blockNumber":...,"chainId":42161,...}
```

## Paso 5: Test de mint

```bash
curl -X POST http://localhost:3000/api/dusd/mint-request \
  -H "content-type: application/json" \
  -d '{
    "amount_usd": 1,
    "wallet_destino": "0x05316B102FE62574b9cBd45709f8F1B6C00beC8a",
    "expiry_seconds": 600
  }'
```

Respuesta exitosa:
```json
{
  "success": true,
  "daes_ref": "DAES-...",
  "hold_id": "HOLD-...",
  "tx_hash": "0x...",
  "status": "CAPTURED",
  "minted_to": "0x..."
}
```

---

## 🔐 Checklist de Seguridad

- [ ] `.env` NO subido a git
- [ ] Alchemy key ROTADA
- [ ] `DAES_SIGNER_PRIVATE_KEY` corresponde a address autorizada en BridgeMinter
- [ ] `DEFAULT_BENEFICIARY` es una address que controlas

---

## 📋 Comandos desde raíz del proyecto

```bash
# Ejecutar solo el backend dUSD
npm run server:dusd

# Ejecutar frontend + backend dUSD juntos
npm run dev:dusd
```


## Paso 1: Configurar .env

```bash
cd server
cp env.example.txt .env
```

Edita `server/.env` con tus valores reales:

```env
# ⚠️ ROTA TU ALCHEMY KEY si fue expuesta
ARBITRUM_RPC_HTTPS=https://arb-mainnet.g.alchemy.com/v2/TU_NUEVA_KEY
ARBITRUM_RPC_WSS=wss://arb-mainnet.g.alchemy.com/v2/TU_NUEVA_KEY

# Private key del DAES Signer (la que autoriza mints)
DAES_SIGNER_PRIVATE_KEY=0x...tu_private_key...

# Private key del Operator (paga gas)
OPERATOR_PRIVATE_KEY=0x...tu_operator_pk...

# Beneficiary temporal (puede ser tu operator para testing)
DEFAULT_BENEFICIARY=0x...tu_treasury_o_operator...
```

## Paso 2: Instalar dependencias

```bash
cd server
npm install
```

## Paso 3: Ejecutar servidor

```bash
npm run dev
```

Deberías ver:
```
============================================================
  DAES dUSD Bridge - Backend Server
============================================================
✅ Server running on http://localhost:3000

📋 Endpoints:
   POST http://localhost:3000/api/dusd/mint-request
   GET  http://localhost:3000/api/dusd/hold/:daes_ref
   GET  http://localhost:3000/api/dusd/holds
   GET  http://localhost:3000/api/dusd/stats
   GET  http://localhost:3000/api/dusd/health
============================================================
```

## Paso 4: Test de salud

```bash
curl http://localhost:3000/health
# {"ok":true,"service":"DAES dUSD Bridge"}

curl http://localhost:3000/api/dusd/health
# {"success":true,"status":"healthy","blockNumber":...,"chainId":42161,...}
```

## Paso 5: Test de mint

```bash
curl -X POST http://localhost:3000/api/dusd/mint-request \
  -H "content-type: application/json" \
  -d '{
    "amount_usd": 1,
    "wallet_destino": "0x05316B102FE62574b9cBd45709f8F1B6C00beC8a",
    "expiry_seconds": 600
  }'
```

Respuesta exitosa:
```json
{
  "success": true,
  "daes_ref": "DAES-...",
  "hold_id": "HOLD-...",
  "tx_hash": "0x...",
  "status": "CAPTURED",
  "minted_to": "0x..."
}
```

---

## 🔐 Checklist de Seguridad

- [ ] `.env` NO subido a git
- [ ] Alchemy key ROTADA
- [ ] `DAES_SIGNER_PRIVATE_KEY` corresponde a address autorizada en BridgeMinter
- [ ] `DEFAULT_BENEFICIARY` es una address que controlas

---

## 📋 Comandos desde raíz del proyecto

```bash
# Ejecutar solo el backend dUSD
npm run server:dusd

# Ejecutar frontend + backend dUSD juntos
npm run dev:dusd
```


## Paso 1: Configurar .env

```bash
cd server
cp env.example.txt .env
```

Edita `server/.env` con tus valores reales:

```env
# ⚠️ ROTA TU ALCHEMY KEY si fue expuesta
ARBITRUM_RPC_HTTPS=https://arb-mainnet.g.alchemy.com/v2/TU_NUEVA_KEY
ARBITRUM_RPC_WSS=wss://arb-mainnet.g.alchemy.com/v2/TU_NUEVA_KEY

# Private key del DAES Signer (la que autoriza mints)
DAES_SIGNER_PRIVATE_KEY=0x...tu_private_key...

# Private key del Operator (paga gas)
OPERATOR_PRIVATE_KEY=0x...tu_operator_pk...

# Beneficiary temporal (puede ser tu operator para testing)
DEFAULT_BENEFICIARY=0x...tu_treasury_o_operator...
```

## Paso 2: Instalar dependencias

```bash
cd server
npm install
```

## Paso 3: Ejecutar servidor

```bash
npm run dev
```

Deberías ver:
```
============================================================
  DAES dUSD Bridge - Backend Server
============================================================
✅ Server running on http://localhost:3000

📋 Endpoints:
   POST http://localhost:3000/api/dusd/mint-request
   GET  http://localhost:3000/api/dusd/hold/:daes_ref
   GET  http://localhost:3000/api/dusd/holds
   GET  http://localhost:3000/api/dusd/stats
   GET  http://localhost:3000/api/dusd/health
============================================================
```

## Paso 4: Test de salud

```bash
curl http://localhost:3000/health
# {"ok":true,"service":"DAES dUSD Bridge"}

curl http://localhost:3000/api/dusd/health
# {"success":true,"status":"healthy","blockNumber":...,"chainId":42161,...}
```

## Paso 5: Test de mint

```bash
curl -X POST http://localhost:3000/api/dusd/mint-request \
  -H "content-type: application/json" \
  -d '{
    "amount_usd": 1,
    "wallet_destino": "0x05316B102FE62574b9cBd45709f8F1B6C00beC8a",
    "expiry_seconds": 600
  }'
```

Respuesta exitosa:
```json
{
  "success": true,
  "daes_ref": "DAES-...",
  "hold_id": "HOLD-...",
  "tx_hash": "0x...",
  "status": "CAPTURED",
  "minted_to": "0x..."
}
```

---

## 🔐 Checklist de Seguridad

- [ ] `.env` NO subido a git
- [ ] Alchemy key ROTADA
- [ ] `DAES_SIGNER_PRIVATE_KEY` corresponde a address autorizada en BridgeMinter
- [ ] `DEFAULT_BENEFICIARY` es una address que controlas

---

## 📋 Comandos desde raíz del proyecto

```bash
# Ejecutar solo el backend dUSD
npm run server:dusd

# Ejecutar frontend + backend dUSD juntos
npm run dev:dusd
```


## Paso 1: Configurar .env

```bash
cd server
cp env.example.txt .env
```

Edita `server/.env` con tus valores reales:

```env
# ⚠️ ROTA TU ALCHEMY KEY si fue expuesta
ARBITRUM_RPC_HTTPS=https://arb-mainnet.g.alchemy.com/v2/TU_NUEVA_KEY
ARBITRUM_RPC_WSS=wss://arb-mainnet.g.alchemy.com/v2/TU_NUEVA_KEY

# Private key del DAES Signer (la que autoriza mints)
DAES_SIGNER_PRIVATE_KEY=0x...tu_private_key...

# Private key del Operator (paga gas)
OPERATOR_PRIVATE_KEY=0x...tu_operator_pk...

# Beneficiary temporal (puede ser tu operator para testing)
DEFAULT_BENEFICIARY=0x...tu_treasury_o_operator...
```

## Paso 2: Instalar dependencias

```bash
cd server
npm install
```

## Paso 3: Ejecutar servidor

```bash
npm run dev
```

Deberías ver:
```
============================================================
  DAES dUSD Bridge - Backend Server
============================================================
✅ Server running on http://localhost:3000

📋 Endpoints:
   POST http://localhost:3000/api/dusd/mint-request
   GET  http://localhost:3000/api/dusd/hold/:daes_ref
   GET  http://localhost:3000/api/dusd/holds
   GET  http://localhost:3000/api/dusd/stats
   GET  http://localhost:3000/api/dusd/health
============================================================
```

## Paso 4: Test de salud

```bash
curl http://localhost:3000/health
# {"ok":true,"service":"DAES dUSD Bridge"}

curl http://localhost:3000/api/dusd/health
# {"success":true,"status":"healthy","blockNumber":...,"chainId":42161,...}
```

## Paso 5: Test de mint

```bash
curl -X POST http://localhost:3000/api/dusd/mint-request \
  -H "content-type: application/json" \
  -d '{
    "amount_usd": 1,
    "wallet_destino": "0x05316B102FE62574b9cBd45709f8F1B6C00beC8a",
    "expiry_seconds": 600
  }'
```

Respuesta exitosa:
```json
{
  "success": true,
  "daes_ref": "DAES-...",
  "hold_id": "HOLD-...",
  "tx_hash": "0x...",
  "status": "CAPTURED",
  "minted_to": "0x..."
}
```

---

## 🔐 Checklist de Seguridad

- [ ] `.env` NO subido a git
- [ ] Alchemy key ROTADA
- [ ] `DAES_SIGNER_PRIVATE_KEY` corresponde a address autorizada en BridgeMinter
- [ ] `DEFAULT_BENEFICIARY` es una address que controlas

---

## 📋 Comandos desde raíz del proyecto

```bash
# Ejecutar solo el backend dUSD
npm run server:dusd

# Ejecutar frontend + backend dUSD juntos
npm run dev:dusd
```


## Paso 1: Configurar .env

```bash
cd server
cp env.example.txt .env
```

Edita `server/.env` con tus valores reales:

```env
# ⚠️ ROTA TU ALCHEMY KEY si fue expuesta
ARBITRUM_RPC_HTTPS=https://arb-mainnet.g.alchemy.com/v2/TU_NUEVA_KEY
ARBITRUM_RPC_WSS=wss://arb-mainnet.g.alchemy.com/v2/TU_NUEVA_KEY

# Private key del DAES Signer (la que autoriza mints)
DAES_SIGNER_PRIVATE_KEY=0x...tu_private_key...

# Private key del Operator (paga gas)
OPERATOR_PRIVATE_KEY=0x...tu_operator_pk...

# Beneficiary temporal (puede ser tu operator para testing)
DEFAULT_BENEFICIARY=0x...tu_treasury_o_operator...
```

## Paso 2: Instalar dependencias

```bash
cd server
npm install
```

## Paso 3: Ejecutar servidor

```bash
npm run dev
```

Deberías ver:
```
============================================================
  DAES dUSD Bridge - Backend Server
============================================================
✅ Server running on http://localhost:3000

📋 Endpoints:
   POST http://localhost:3000/api/dusd/mint-request
   GET  http://localhost:3000/api/dusd/hold/:daes_ref
   GET  http://localhost:3000/api/dusd/holds
   GET  http://localhost:3000/api/dusd/stats
   GET  http://localhost:3000/api/dusd/health
============================================================
```

## Paso 4: Test de salud

```bash
curl http://localhost:3000/health
# {"ok":true,"service":"DAES dUSD Bridge"}

curl http://localhost:3000/api/dusd/health
# {"success":true,"status":"healthy","blockNumber":...,"chainId":42161,...}
```

## Paso 5: Test de mint

```bash
curl -X POST http://localhost:3000/api/dusd/mint-request \
  -H "content-type: application/json" \
  -d '{
    "amount_usd": 1,
    "wallet_destino": "0x05316B102FE62574b9cBd45709f8F1B6C00beC8a",
    "expiry_seconds": 600
  }'
```

Respuesta exitosa:
```json
{
  "success": true,
  "daes_ref": "DAES-...",
  "hold_id": "HOLD-...",
  "tx_hash": "0x...",
  "status": "CAPTURED",
  "minted_to": "0x..."
}
```

---

## 🔐 Checklist de Seguridad

- [ ] `.env` NO subido a git
- [ ] Alchemy key ROTADA
- [ ] `DAES_SIGNER_PRIVATE_KEY` corresponde a address autorizada en BridgeMinter
- [ ] `DEFAULT_BENEFICIARY` es una address que controlas

---

## 📋 Comandos desde raíz del proyecto

```bash
# Ejecutar solo el backend dUSD
npm run server:dusd

# Ejecutar frontend + backend dUSD juntos
npm run dev:dusd
```


## Paso 1: Configurar .env

```bash
cd server
cp env.example.txt .env
```

Edita `server/.env` con tus valores reales:

```env
# ⚠️ ROTA TU ALCHEMY KEY si fue expuesta
ARBITRUM_RPC_HTTPS=https://arb-mainnet.g.alchemy.com/v2/TU_NUEVA_KEY
ARBITRUM_RPC_WSS=wss://arb-mainnet.g.alchemy.com/v2/TU_NUEVA_KEY

# Private key del DAES Signer (la que autoriza mints)
DAES_SIGNER_PRIVATE_KEY=0x...tu_private_key...

# Private key del Operator (paga gas)
OPERATOR_PRIVATE_KEY=0x...tu_operator_pk...

# Beneficiary temporal (puede ser tu operator para testing)
DEFAULT_BENEFICIARY=0x...tu_treasury_o_operator...
```

## Paso 2: Instalar dependencias

```bash
cd server
npm install
```

## Paso 3: Ejecutar servidor

```bash
npm run dev
```

Deberías ver:
```
============================================================
  DAES dUSD Bridge - Backend Server
============================================================
✅ Server running on http://localhost:3000

📋 Endpoints:
   POST http://localhost:3000/api/dusd/mint-request
   GET  http://localhost:3000/api/dusd/hold/:daes_ref
   GET  http://localhost:3000/api/dusd/holds
   GET  http://localhost:3000/api/dusd/stats
   GET  http://localhost:3000/api/dusd/health
============================================================
```

## Paso 4: Test de salud

```bash
curl http://localhost:3000/health
# {"ok":true,"service":"DAES dUSD Bridge"}

curl http://localhost:3000/api/dusd/health
# {"success":true,"status":"healthy","blockNumber":...,"chainId":42161,...}
```

## Paso 5: Test de mint

```bash
curl -X POST http://localhost:3000/api/dusd/mint-request \
  -H "content-type: application/json" \
  -d '{
    "amount_usd": 1,
    "wallet_destino": "0x05316B102FE62574b9cBd45709f8F1B6C00beC8a",
    "expiry_seconds": 600
  }'
```

Respuesta exitosa:
```json
{
  "success": true,
  "daes_ref": "DAES-...",
  "hold_id": "HOLD-...",
  "tx_hash": "0x...",
  "status": "CAPTURED",
  "minted_to": "0x..."
}
```

---

## 🔐 Checklist de Seguridad

- [ ] `.env` NO subido a git
- [ ] Alchemy key ROTADA
- [ ] `DAES_SIGNER_PRIVATE_KEY` corresponde a address autorizada en BridgeMinter
- [ ] `DEFAULT_BENEFICIARY` es una address que controlas

---

## 📋 Comandos desde raíz del proyecto

```bash
# Ejecutar solo el backend dUSD
npm run server:dusd

# Ejecutar frontend + backend dUSD juntos
npm run dev:dusd
```


## Paso 1: Configurar .env

```bash
cd server
cp env.example.txt .env
```

Edita `server/.env` con tus valores reales:

```env
# ⚠️ ROTA TU ALCHEMY KEY si fue expuesta
ARBITRUM_RPC_HTTPS=https://arb-mainnet.g.alchemy.com/v2/TU_NUEVA_KEY
ARBITRUM_RPC_WSS=wss://arb-mainnet.g.alchemy.com/v2/TU_NUEVA_KEY

# Private key del DAES Signer (la que autoriza mints)
DAES_SIGNER_PRIVATE_KEY=0x...tu_private_key...

# Private key del Operator (paga gas)
OPERATOR_PRIVATE_KEY=0x...tu_operator_pk...

# Beneficiary temporal (puede ser tu operator para testing)
DEFAULT_BENEFICIARY=0x...tu_treasury_o_operator...
```

## Paso 2: Instalar dependencias

```bash
cd server
npm install
```

## Paso 3: Ejecutar servidor

```bash
npm run dev
```

Deberías ver:
```
============================================================
  DAES dUSD Bridge - Backend Server
============================================================
✅ Server running on http://localhost:3000

📋 Endpoints:
   POST http://localhost:3000/api/dusd/mint-request
   GET  http://localhost:3000/api/dusd/hold/:daes_ref
   GET  http://localhost:3000/api/dusd/holds
   GET  http://localhost:3000/api/dusd/stats
   GET  http://localhost:3000/api/dusd/health
============================================================
```

## Paso 4: Test de salud

```bash
curl http://localhost:3000/health
# {"ok":true,"service":"DAES dUSD Bridge"}

curl http://localhost:3000/api/dusd/health
# {"success":true,"status":"healthy","blockNumber":...,"chainId":42161,...}
```

## Paso 5: Test de mint

```bash
curl -X POST http://localhost:3000/api/dusd/mint-request \
  -H "content-type: application/json" \
  -d '{
    "amount_usd": 1,
    "wallet_destino": "0x05316B102FE62574b9cBd45709f8F1B6C00beC8a",
    "expiry_seconds": 600
  }'
```

Respuesta exitosa:
```json
{
  "success": true,
  "daes_ref": "DAES-...",
  "hold_id": "HOLD-...",
  "tx_hash": "0x...",
  "status": "CAPTURED",
  "minted_to": "0x..."
}
```

---

## 🔐 Checklist de Seguridad

- [ ] `.env` NO subido a git
- [ ] Alchemy key ROTADA
- [ ] `DAES_SIGNER_PRIVATE_KEY` corresponde a address autorizada en BridgeMinter
- [ ] `DEFAULT_BENEFICIARY` es una address que controlas

---

## 📋 Comandos desde raíz del proyecto

```bash
# Ejecutar solo el backend dUSD
npm run server:dusd

# Ejecutar frontend + backend dUSD juntos
npm run dev:dusd
```


## Paso 1: Configurar .env

```bash
cd server
cp env.example.txt .env
```

Edita `server/.env` con tus valores reales:

```env
# ⚠️ ROTA TU ALCHEMY KEY si fue expuesta
ARBITRUM_RPC_HTTPS=https://arb-mainnet.g.alchemy.com/v2/TU_NUEVA_KEY
ARBITRUM_RPC_WSS=wss://arb-mainnet.g.alchemy.com/v2/TU_NUEVA_KEY

# Private key del DAES Signer (la que autoriza mints)
DAES_SIGNER_PRIVATE_KEY=0x...tu_private_key...

# Private key del Operator (paga gas)
OPERATOR_PRIVATE_KEY=0x...tu_operator_pk...

# Beneficiary temporal (puede ser tu operator para testing)
DEFAULT_BENEFICIARY=0x...tu_treasury_o_operator...
```

## Paso 2: Instalar dependencias

```bash
cd server
npm install
```

## Paso 3: Ejecutar servidor

```bash
npm run dev
```

Deberías ver:
```
============================================================
  DAES dUSD Bridge - Backend Server
============================================================
✅ Server running on http://localhost:3000

📋 Endpoints:
   POST http://localhost:3000/api/dusd/mint-request
   GET  http://localhost:3000/api/dusd/hold/:daes_ref
   GET  http://localhost:3000/api/dusd/holds
   GET  http://localhost:3000/api/dusd/stats
   GET  http://localhost:3000/api/dusd/health
============================================================
```

## Paso 4: Test de salud

```bash
curl http://localhost:3000/health
# {"ok":true,"service":"DAES dUSD Bridge"}

curl http://localhost:3000/api/dusd/health
# {"success":true,"status":"healthy","blockNumber":...,"chainId":42161,...}
```

## Paso 5: Test de mint

```bash
curl -X POST http://localhost:3000/api/dusd/mint-request \
  -H "content-type: application/json" \
  -d '{
    "amount_usd": 1,
    "wallet_destino": "0x05316B102FE62574b9cBd45709f8F1B6C00beC8a",
    "expiry_seconds": 600
  }'
```

Respuesta exitosa:
```json
{
  "success": true,
  "daes_ref": "DAES-...",
  "hold_id": "HOLD-...",
  "tx_hash": "0x...",
  "status": "CAPTURED",
  "minted_to": "0x..."
}
```

---

## 🔐 Checklist de Seguridad

- [ ] `.env` NO subido a git
- [ ] Alchemy key ROTADA
- [ ] `DAES_SIGNER_PRIVATE_KEY` corresponde a address autorizada en BridgeMinter
- [ ] `DEFAULT_BENEFICIARY` es una address que controlas

---

## 📋 Comandos desde raíz del proyecto

```bash
# Ejecutar solo el backend dUSD
npm run server:dusd

# Ejecutar frontend + backend dUSD juntos
npm run dev:dusd
```


## Paso 1: Configurar .env

```bash
cd server
cp env.example.txt .env
```

Edita `server/.env` con tus valores reales:

```env
# ⚠️ ROTA TU ALCHEMY KEY si fue expuesta
ARBITRUM_RPC_HTTPS=https://arb-mainnet.g.alchemy.com/v2/TU_NUEVA_KEY
ARBITRUM_RPC_WSS=wss://arb-mainnet.g.alchemy.com/v2/TU_NUEVA_KEY

# Private key del DAES Signer (la que autoriza mints)
DAES_SIGNER_PRIVATE_KEY=0x...tu_private_key...

# Private key del Operator (paga gas)
OPERATOR_PRIVATE_KEY=0x...tu_operator_pk...

# Beneficiary temporal (puede ser tu operator para testing)
DEFAULT_BENEFICIARY=0x...tu_treasury_o_operator...
```

## Paso 2: Instalar dependencias

```bash
cd server
npm install
```

## Paso 3: Ejecutar servidor

```bash
npm run dev
```

Deberías ver:
```
============================================================
  DAES dUSD Bridge - Backend Server
============================================================
✅ Server running on http://localhost:3000

📋 Endpoints:
   POST http://localhost:3000/api/dusd/mint-request
   GET  http://localhost:3000/api/dusd/hold/:daes_ref
   GET  http://localhost:3000/api/dusd/holds
   GET  http://localhost:3000/api/dusd/stats
   GET  http://localhost:3000/api/dusd/health
============================================================
```

## Paso 4: Test de salud

```bash
curl http://localhost:3000/health
# {"ok":true,"service":"DAES dUSD Bridge"}

curl http://localhost:3000/api/dusd/health
# {"success":true,"status":"healthy","blockNumber":...,"chainId":42161,...}
```

## Paso 5: Test de mint

```bash
curl -X POST http://localhost:3000/api/dusd/mint-request \
  -H "content-type: application/json" \
  -d '{
    "amount_usd": 1,
    "wallet_destino": "0x05316B102FE62574b9cBd45709f8F1B6C00beC8a",
    "expiry_seconds": 600
  }'
```

Respuesta exitosa:
```json
{
  "success": true,
  "daes_ref": "DAES-...",
  "hold_id": "HOLD-...",
  "tx_hash": "0x...",
  "status": "CAPTURED",
  "minted_to": "0x..."
}
```

---

## 🔐 Checklist de Seguridad

- [ ] `.env` NO subido a git
- [ ] Alchemy key ROTADA
- [ ] `DAES_SIGNER_PRIVATE_KEY` corresponde a address autorizada en BridgeMinter
- [ ] `DEFAULT_BENEFICIARY` es una address que controlas

---

## 📋 Comandos desde raíz del proyecto

```bash
# Ejecutar solo el backend dUSD
npm run server:dusd

# Ejecutar frontend + backend dUSD juntos
npm run dev:dusd
```

















