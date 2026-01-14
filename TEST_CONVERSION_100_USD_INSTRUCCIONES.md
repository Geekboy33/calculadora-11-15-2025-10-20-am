# 🧪 TEST REAL: Conversión 100 USD a USDT

## 📋 Pasos para Ejecutar el Test

### Paso 1: Iniciar el Servidor (en una terminal)
```bash
npm run dev:full
```

Esperar a que aparezca:
```
📍 Escuchando en http://localhost:3000
```

### Paso 2: En otra terminal, Ejecutar el Test (en otra terminal)

#### Opción A: Usando PowerShell (Windows)
```powershell
# Test simple
$response = curl.exe -s -X POST http://localhost:3000/api/uniswap/swap `
  -H "Content-Type: application/json" `
  -d '{
    "amount": 100,
    "recipientAddress": "0x05316B102FE62574b9cBd45709f8F1B6C00beC8a",
    "slippageTolerance": 1
  }'

$response
```

#### Opción B: Usando curl directo
```bash
curl -X POST http://localhost:3000/api/uniswap/swap \
  -H "Content-Type: application/json" \
  -d '{
    "amount": 100,
    "recipientAddress": "0x05316B102FE62574b9cBd45709f8F1B6C00beC8a",
    "slippageTolerance": 1
  }'
```

## 📊 Respuesta Esperada

### Éxito (200 OK):
```json
{
  "success": true,
  "type": "USD_USDT_BRIDGE_REAL_MAINNET",
  "network": "Ethereum Mainnet",
  "txHash": "0x...",
  "blockNumber": 19850123,
  "blockHash": "0x...",
  "gasUsed": "65000",
  "status": "SUCCESS",
  "amountUSD": 100,
  "amountUSDT": 99,
  "commission": 1,
  "recipient": "0x05316B102FE62574b9cBd45709f8F1B6C00beC8a",
  "decimals": 6,
  "contractAddress": "0xdAC17F958D2ee523a2206206994597C13D831ec7",
  "oraclePrice": 1.0001,
  "chainlinkFeed": "0x3E7d1eAB13ad0104d2750B8863b489D65364e32D",
  "etherscanUrl": "https://etherscan.io/tx/0x...",
  "timestamp": "2025-01-03T15:30:45.123Z",
  "real": true,
  "bridge_function": "transfer(address,uint256)",
  "message": "✅ BRIDGE REAL 100% COMPLETADO EN MAINNET: 100 USD → 99 USDT (Precio Oráculo: 1.0001)"
}
```

### Error (500 Internal Server Error):
```json
{
  "success": false,
  "type": "USD_USDT_BRIDGE_ERROR",
  "error": "Signer no tiene suficiente USDT",
  "details": {
    "signerAddress": "0x...",
    "balanceUSDAT": "0",
    "amountRequired": 99,
    "shortfall": 99
  }
}
```

## 🔍 Pasos del Test Detallados

### Lo que el Backend Hará:

```
1. Recibir: 100 USD
   ↓
2. Conectar a Ethereum Mainnet (Alchemy RPC)
   ↓
3. Obtener precio USD/USDT del Oráculo Chainlink
   ↓
4. Calcular: 100 * 0.99 = 99 USDT (1% comisión)
   ↓
5. Verificar balance USDT del signer
   ↓
6. Ejecutar transfer() en contrato USDT real
   ↓
7. Esperar confirmación en blockchain
   ↓
8. Retornar TX Hash + Etherscan Link
```

## ✅ Checklist

- [ ] Servidor iniciado en puerto 3000
- [ ] `.env` configurado con credenciales
- [ ] ETH_RPC_URL válido en `.env`
- [ ] ETH_PRIVATE_KEY válido en `.env`
- [ ] Signer tiene ETH para gas
- [ ] Signer tiene USDT (mínimo 99 USDT para 100 USD)

## 📊 Métricas del Test

| Métrica | Valor |
|---------|-------|
| Cantidad USD | 100 |
| Comisión | 1% |
| USDT Esperados | 99 |
| Red | Ethereum Mainnet |
| Confirmación | 1 bloque |
| Gas Fee | ~65,000 gas |
| Tiempo Esperado | 30-60 segundos |

## 🔍 Verificación en Blockchain

Después de obtener el TX Hash, verifica en:
```
https://etherscan.io/tx/[TX_HASH]
```

Deberías ver:
- Status: ✅ Success
- From: [Dirección del Signer]
- To: [Dirección del USDT Contract]
- Function: transfer()
- Value: 99,000,000 (99 USDT con 6 decimales)

## 📚 Documentación Relacionada

- `USDT_MINTER_GUIA_COMPLETA.md` - Guía del USDT Minter
- `server/routes/uniswap-routes.js` - Código del bridge
- `src/components/DeFiProtocolsModule.tsx` - Frontend del bridge

## 🚀 Siguiente Paso

Después de confirmar que el test es exitoso:
1. Verificar TX en Etherscan
2. Comprobar que USDT llegó a la dirección
3. Revisar balance actualizado

¡Test listo para ejecutar! 🎉



## 📋 Pasos para Ejecutar el Test

### Paso 1: Iniciar el Servidor (en una terminal)
```bash
npm run dev:full
```

Esperar a que aparezca:
```
📍 Escuchando en http://localhost:3000
```

### Paso 2: En otra terminal, Ejecutar el Test (en otra terminal)

#### Opción A: Usando PowerShell (Windows)
```powershell
# Test simple
$response = curl.exe -s -X POST http://localhost:3000/api/uniswap/swap `
  -H "Content-Type: application/json" `
  -d '{
    "amount": 100,
    "recipientAddress": "0x05316B102FE62574b9cBd45709f8F1B6C00beC8a",
    "slippageTolerance": 1
  }'

$response
```

#### Opción B: Usando curl directo
```bash
curl -X POST http://localhost:3000/api/uniswap/swap \
  -H "Content-Type: application/json" \
  -d '{
    "amount": 100,
    "recipientAddress": "0x05316B102FE62574b9cBd45709f8F1B6C00beC8a",
    "slippageTolerance": 1
  }'
```

## 📊 Respuesta Esperada

### Éxito (200 OK):
```json
{
  "success": true,
  "type": "USD_USDT_BRIDGE_REAL_MAINNET",
  "network": "Ethereum Mainnet",
  "txHash": "0x...",
  "blockNumber": 19850123,
  "blockHash": "0x...",
  "gasUsed": "65000",
  "status": "SUCCESS",
  "amountUSD": 100,
  "amountUSDT": 99,
  "commission": 1,
  "recipient": "0x05316B102FE62574b9cBd45709f8F1B6C00beC8a",
  "decimals": 6,
  "contractAddress": "0xdAC17F958D2ee523a2206206994597C13D831ec7",
  "oraclePrice": 1.0001,
  "chainlinkFeed": "0x3E7d1eAB13ad0104d2750B8863b489D65364e32D",
  "etherscanUrl": "https://etherscan.io/tx/0x...",
  "timestamp": "2025-01-03T15:30:45.123Z",
  "real": true,
  "bridge_function": "transfer(address,uint256)",
  "message": "✅ BRIDGE REAL 100% COMPLETADO EN MAINNET: 100 USD → 99 USDT (Precio Oráculo: 1.0001)"
}
```

### Error (500 Internal Server Error):
```json
{
  "success": false,
  "type": "USD_USDT_BRIDGE_ERROR",
  "error": "Signer no tiene suficiente USDT",
  "details": {
    "signerAddress": "0x...",
    "balanceUSDAT": "0",
    "amountRequired": 99,
    "shortfall": 99
  }
}
```

## 🔍 Pasos del Test Detallados

### Lo que el Backend Hará:

```
1. Recibir: 100 USD
   ↓
2. Conectar a Ethereum Mainnet (Alchemy RPC)
   ↓
3. Obtener precio USD/USDT del Oráculo Chainlink
   ↓
4. Calcular: 100 * 0.99 = 99 USDT (1% comisión)
   ↓
5. Verificar balance USDT del signer
   ↓
6. Ejecutar transfer() en contrato USDT real
   ↓
7. Esperar confirmación en blockchain
   ↓
8. Retornar TX Hash + Etherscan Link
```

## ✅ Checklist

- [ ] Servidor iniciado en puerto 3000
- [ ] `.env` configurado con credenciales
- [ ] ETH_RPC_URL válido en `.env`
- [ ] ETH_PRIVATE_KEY válido en `.env`
- [ ] Signer tiene ETH para gas
- [ ] Signer tiene USDT (mínimo 99 USDT para 100 USD)

## 📊 Métricas del Test

| Métrica | Valor |
|---------|-------|
| Cantidad USD | 100 |
| Comisión | 1% |
| USDT Esperados | 99 |
| Red | Ethereum Mainnet |
| Confirmación | 1 bloque |
| Gas Fee | ~65,000 gas |
| Tiempo Esperado | 30-60 segundos |

## 🔍 Verificación en Blockchain

Después de obtener el TX Hash, verifica en:
```
https://etherscan.io/tx/[TX_HASH]
```

Deberías ver:
- Status: ✅ Success
- From: [Dirección del Signer]
- To: [Dirección del USDT Contract]
- Function: transfer()
- Value: 99,000,000 (99 USDT con 6 decimales)

## 📚 Documentación Relacionada

- `USDT_MINTER_GUIA_COMPLETA.md` - Guía del USDT Minter
- `server/routes/uniswap-routes.js` - Código del bridge
- `src/components/DeFiProtocolsModule.tsx` - Frontend del bridge

## 🚀 Siguiente Paso

Después de confirmar que el test es exitoso:
1. Verificar TX en Etherscan
2. Comprobar que USDT llegó a la dirección
3. Revisar balance actualizado

¡Test listo para ejecutar! 🎉




## 📋 Pasos para Ejecutar el Test

### Paso 1: Iniciar el Servidor (en una terminal)
```bash
npm run dev:full
```

Esperar a que aparezca:
```
📍 Escuchando en http://localhost:3000
```

### Paso 2: En otra terminal, Ejecutar el Test (en otra terminal)

#### Opción A: Usando PowerShell (Windows)
```powershell
# Test simple
$response = curl.exe -s -X POST http://localhost:3000/api/uniswap/swap `
  -H "Content-Type: application/json" `
  -d '{
    "amount": 100,
    "recipientAddress": "0x05316B102FE62574b9cBd45709f8F1B6C00beC8a",
    "slippageTolerance": 1
  }'

$response
```

#### Opción B: Usando curl directo
```bash
curl -X POST http://localhost:3000/api/uniswap/swap \
  -H "Content-Type: application/json" \
  -d '{
    "amount": 100,
    "recipientAddress": "0x05316B102FE62574b9cBd45709f8F1B6C00beC8a",
    "slippageTolerance": 1
  }'
```

## 📊 Respuesta Esperada

### Éxito (200 OK):
```json
{
  "success": true,
  "type": "USD_USDT_BRIDGE_REAL_MAINNET",
  "network": "Ethereum Mainnet",
  "txHash": "0x...",
  "blockNumber": 19850123,
  "blockHash": "0x...",
  "gasUsed": "65000",
  "status": "SUCCESS",
  "amountUSD": 100,
  "amountUSDT": 99,
  "commission": 1,
  "recipient": "0x05316B102FE62574b9cBd45709f8F1B6C00beC8a",
  "decimals": 6,
  "contractAddress": "0xdAC17F958D2ee523a2206206994597C13D831ec7",
  "oraclePrice": 1.0001,
  "chainlinkFeed": "0x3E7d1eAB13ad0104d2750B8863b489D65364e32D",
  "etherscanUrl": "https://etherscan.io/tx/0x...",
  "timestamp": "2025-01-03T15:30:45.123Z",
  "real": true,
  "bridge_function": "transfer(address,uint256)",
  "message": "✅ BRIDGE REAL 100% COMPLETADO EN MAINNET: 100 USD → 99 USDT (Precio Oráculo: 1.0001)"
}
```

### Error (500 Internal Server Error):
```json
{
  "success": false,
  "type": "USD_USDT_BRIDGE_ERROR",
  "error": "Signer no tiene suficiente USDT",
  "details": {
    "signerAddress": "0x...",
    "balanceUSDAT": "0",
    "amountRequired": 99,
    "shortfall": 99
  }
}
```

## 🔍 Pasos del Test Detallados

### Lo que el Backend Hará:

```
1. Recibir: 100 USD
   ↓
2. Conectar a Ethereum Mainnet (Alchemy RPC)
   ↓
3. Obtener precio USD/USDT del Oráculo Chainlink
   ↓
4. Calcular: 100 * 0.99 = 99 USDT (1% comisión)
   ↓
5. Verificar balance USDT del signer
   ↓
6. Ejecutar transfer() en contrato USDT real
   ↓
7. Esperar confirmación en blockchain
   ↓
8. Retornar TX Hash + Etherscan Link
```

## ✅ Checklist

- [ ] Servidor iniciado en puerto 3000
- [ ] `.env` configurado con credenciales
- [ ] ETH_RPC_URL válido en `.env`
- [ ] ETH_PRIVATE_KEY válido en `.env`
- [ ] Signer tiene ETH para gas
- [ ] Signer tiene USDT (mínimo 99 USDT para 100 USD)

## 📊 Métricas del Test

| Métrica | Valor |
|---------|-------|
| Cantidad USD | 100 |
| Comisión | 1% |
| USDT Esperados | 99 |
| Red | Ethereum Mainnet |
| Confirmación | 1 bloque |
| Gas Fee | ~65,000 gas |
| Tiempo Esperado | 30-60 segundos |

## 🔍 Verificación en Blockchain

Después de obtener el TX Hash, verifica en:
```
https://etherscan.io/tx/[TX_HASH]
```

Deberías ver:
- Status: ✅ Success
- From: [Dirección del Signer]
- To: [Dirección del USDT Contract]
- Function: transfer()
- Value: 99,000,000 (99 USDT con 6 decimales)

## 📚 Documentación Relacionada

- `USDT_MINTER_GUIA_COMPLETA.md` - Guía del USDT Minter
- `server/routes/uniswap-routes.js` - Código del bridge
- `src/components/DeFiProtocolsModule.tsx` - Frontend del bridge

## 🚀 Siguiente Paso

Después de confirmar que el test es exitoso:
1. Verificar TX en Etherscan
2. Comprobar que USDT llegó a la dirección
3. Revisar balance actualizado

¡Test listo para ejecutar! 🎉



## 📋 Pasos para Ejecutar el Test

### Paso 1: Iniciar el Servidor (en una terminal)
```bash
npm run dev:full
```

Esperar a que aparezca:
```
📍 Escuchando en http://localhost:3000
```

### Paso 2: En otra terminal, Ejecutar el Test (en otra terminal)

#### Opción A: Usando PowerShell (Windows)
```powershell
# Test simple
$response = curl.exe -s -X POST http://localhost:3000/api/uniswap/swap `
  -H "Content-Type: application/json" `
  -d '{
    "amount": 100,
    "recipientAddress": "0x05316B102FE62574b9cBd45709f8F1B6C00beC8a",
    "slippageTolerance": 1
  }'

$response
```

#### Opción B: Usando curl directo
```bash
curl -X POST http://localhost:3000/api/uniswap/swap \
  -H "Content-Type: application/json" \
  -d '{
    "amount": 100,
    "recipientAddress": "0x05316B102FE62574b9cBd45709f8F1B6C00beC8a",
    "slippageTolerance": 1
  }'
```

## 📊 Respuesta Esperada

### Éxito (200 OK):
```json
{
  "success": true,
  "type": "USD_USDT_BRIDGE_REAL_MAINNET",
  "network": "Ethereum Mainnet",
  "txHash": "0x...",
  "blockNumber": 19850123,
  "blockHash": "0x...",
  "gasUsed": "65000",
  "status": "SUCCESS",
  "amountUSD": 100,
  "amountUSDT": 99,
  "commission": 1,
  "recipient": "0x05316B102FE62574b9cBd45709f8F1B6C00beC8a",
  "decimals": 6,
  "contractAddress": "0xdAC17F958D2ee523a2206206994597C13D831ec7",
  "oraclePrice": 1.0001,
  "chainlinkFeed": "0x3E7d1eAB13ad0104d2750B8863b489D65364e32D",
  "etherscanUrl": "https://etherscan.io/tx/0x...",
  "timestamp": "2025-01-03T15:30:45.123Z",
  "real": true,
  "bridge_function": "transfer(address,uint256)",
  "message": "✅ BRIDGE REAL 100% COMPLETADO EN MAINNET: 100 USD → 99 USDT (Precio Oráculo: 1.0001)"
}
```

### Error (500 Internal Server Error):
```json
{
  "success": false,
  "type": "USD_USDT_BRIDGE_ERROR",
  "error": "Signer no tiene suficiente USDT",
  "details": {
    "signerAddress": "0x...",
    "balanceUSDAT": "0",
    "amountRequired": 99,
    "shortfall": 99
  }
}
```

## 🔍 Pasos del Test Detallados

### Lo que el Backend Hará:

```
1. Recibir: 100 USD
   ↓
2. Conectar a Ethereum Mainnet (Alchemy RPC)
   ↓
3. Obtener precio USD/USDT del Oráculo Chainlink
   ↓
4. Calcular: 100 * 0.99 = 99 USDT (1% comisión)
   ↓
5. Verificar balance USDT del signer
   ↓
6. Ejecutar transfer() en contrato USDT real
   ↓
7. Esperar confirmación en blockchain
   ↓
8. Retornar TX Hash + Etherscan Link
```

## ✅ Checklist

- [ ] Servidor iniciado en puerto 3000
- [ ] `.env` configurado con credenciales
- [ ] ETH_RPC_URL válido en `.env`
- [ ] ETH_PRIVATE_KEY válido en `.env`
- [ ] Signer tiene ETH para gas
- [ ] Signer tiene USDT (mínimo 99 USDT para 100 USD)

## 📊 Métricas del Test

| Métrica | Valor |
|---------|-------|
| Cantidad USD | 100 |
| Comisión | 1% |
| USDT Esperados | 99 |
| Red | Ethereum Mainnet |
| Confirmación | 1 bloque |
| Gas Fee | ~65,000 gas |
| Tiempo Esperado | 30-60 segundos |

## 🔍 Verificación en Blockchain

Después de obtener el TX Hash, verifica en:
```
https://etherscan.io/tx/[TX_HASH]
```

Deberías ver:
- Status: ✅ Success
- From: [Dirección del Signer]
- To: [Dirección del USDT Contract]
- Function: transfer()
- Value: 99,000,000 (99 USDT con 6 decimales)

## 📚 Documentación Relacionada

- `USDT_MINTER_GUIA_COMPLETA.md` - Guía del USDT Minter
- `server/routes/uniswap-routes.js` - Código del bridge
- `src/components/DeFiProtocolsModule.tsx` - Frontend del bridge

## 🚀 Siguiente Paso

Después de confirmar que el test es exitoso:
1. Verificar TX en Etherscan
2. Comprobar que USDT llegó a la dirección
3. Revisar balance actualizado

¡Test listo para ejecutar! 🎉




## 📋 Pasos para Ejecutar el Test

### Paso 1: Iniciar el Servidor (en una terminal)
```bash
npm run dev:full
```

Esperar a que aparezca:
```
📍 Escuchando en http://localhost:3000
```

### Paso 2: En otra terminal, Ejecutar el Test (en otra terminal)

#### Opción A: Usando PowerShell (Windows)
```powershell
# Test simple
$response = curl.exe -s -X POST http://localhost:3000/api/uniswap/swap `
  -H "Content-Type: application/json" `
  -d '{
    "amount": 100,
    "recipientAddress": "0x05316B102FE62574b9cBd45709f8F1B6C00beC8a",
    "slippageTolerance": 1
  }'

$response
```

#### Opción B: Usando curl directo
```bash
curl -X POST http://localhost:3000/api/uniswap/swap \
  -H "Content-Type: application/json" \
  -d '{
    "amount": 100,
    "recipientAddress": "0x05316B102FE62574b9cBd45709f8F1B6C00beC8a",
    "slippageTolerance": 1
  }'
```

## 📊 Respuesta Esperada

### Éxito (200 OK):
```json
{
  "success": true,
  "type": "USD_USDT_BRIDGE_REAL_MAINNET",
  "network": "Ethereum Mainnet",
  "txHash": "0x...",
  "blockNumber": 19850123,
  "blockHash": "0x...",
  "gasUsed": "65000",
  "status": "SUCCESS",
  "amountUSD": 100,
  "amountUSDT": 99,
  "commission": 1,
  "recipient": "0x05316B102FE62574b9cBd45709f8F1B6C00beC8a",
  "decimals": 6,
  "contractAddress": "0xdAC17F958D2ee523a2206206994597C13D831ec7",
  "oraclePrice": 1.0001,
  "chainlinkFeed": "0x3E7d1eAB13ad0104d2750B8863b489D65364e32D",
  "etherscanUrl": "https://etherscan.io/tx/0x...",
  "timestamp": "2025-01-03T15:30:45.123Z",
  "real": true,
  "bridge_function": "transfer(address,uint256)",
  "message": "✅ BRIDGE REAL 100% COMPLETADO EN MAINNET: 100 USD → 99 USDT (Precio Oráculo: 1.0001)"
}
```

### Error (500 Internal Server Error):
```json
{
  "success": false,
  "type": "USD_USDT_BRIDGE_ERROR",
  "error": "Signer no tiene suficiente USDT",
  "details": {
    "signerAddress": "0x...",
    "balanceUSDAT": "0",
    "amountRequired": 99,
    "shortfall": 99
  }
}
```

## 🔍 Pasos del Test Detallados

### Lo que el Backend Hará:

```
1. Recibir: 100 USD
   ↓
2. Conectar a Ethereum Mainnet (Alchemy RPC)
   ↓
3. Obtener precio USD/USDT del Oráculo Chainlink
   ↓
4. Calcular: 100 * 0.99 = 99 USDT (1% comisión)
   ↓
5. Verificar balance USDT del signer
   ↓
6. Ejecutar transfer() en contrato USDT real
   ↓
7. Esperar confirmación en blockchain
   ↓
8. Retornar TX Hash + Etherscan Link
```

## ✅ Checklist

- [ ] Servidor iniciado en puerto 3000
- [ ] `.env` configurado con credenciales
- [ ] ETH_RPC_URL válido en `.env`
- [ ] ETH_PRIVATE_KEY válido en `.env`
- [ ] Signer tiene ETH para gas
- [ ] Signer tiene USDT (mínimo 99 USDT para 100 USD)

## 📊 Métricas del Test

| Métrica | Valor |
|---------|-------|
| Cantidad USD | 100 |
| Comisión | 1% |
| USDT Esperados | 99 |
| Red | Ethereum Mainnet |
| Confirmación | 1 bloque |
| Gas Fee | ~65,000 gas |
| Tiempo Esperado | 30-60 segundos |

## 🔍 Verificación en Blockchain

Después de obtener el TX Hash, verifica en:
```
https://etherscan.io/tx/[TX_HASH]
```

Deberías ver:
- Status: ✅ Success
- From: [Dirección del Signer]
- To: [Dirección del USDT Contract]
- Function: transfer()
- Value: 99,000,000 (99 USDT con 6 decimales)

## 📚 Documentación Relacionada

- `USDT_MINTER_GUIA_COMPLETA.md` - Guía del USDT Minter
- `server/routes/uniswap-routes.js` - Código del bridge
- `src/components/DeFiProtocolsModule.tsx` - Frontend del bridge

## 🚀 Siguiente Paso

Después de confirmar que el test es exitoso:
1. Verificar TX en Etherscan
2. Comprobar que USDT llegó a la dirección
3. Revisar balance actualizado

¡Test listo para ejecutar! 🎉



## 📋 Pasos para Ejecutar el Test

### Paso 1: Iniciar el Servidor (en una terminal)
```bash
npm run dev:full
```

Esperar a que aparezca:
```
📍 Escuchando en http://localhost:3000
```

### Paso 2: En otra terminal, Ejecutar el Test (en otra terminal)

#### Opción A: Usando PowerShell (Windows)
```powershell
# Test simple
$response = curl.exe -s -X POST http://localhost:3000/api/uniswap/swap `
  -H "Content-Type: application/json" `
  -d '{
    "amount": 100,
    "recipientAddress": "0x05316B102FE62574b9cBd45709f8F1B6C00beC8a",
    "slippageTolerance": 1
  }'

$response
```

#### Opción B: Usando curl directo
```bash
curl -X POST http://localhost:3000/api/uniswap/swap \
  -H "Content-Type: application/json" \
  -d '{
    "amount": 100,
    "recipientAddress": "0x05316B102FE62574b9cBd45709f8F1B6C00beC8a",
    "slippageTolerance": 1
  }'
```

## 📊 Respuesta Esperada

### Éxito (200 OK):
```json
{
  "success": true,
  "type": "USD_USDT_BRIDGE_REAL_MAINNET",
  "network": "Ethereum Mainnet",
  "txHash": "0x...",
  "blockNumber": 19850123,
  "blockHash": "0x...",
  "gasUsed": "65000",
  "status": "SUCCESS",
  "amountUSD": 100,
  "amountUSDT": 99,
  "commission": 1,
  "recipient": "0x05316B102FE62574b9cBd45709f8F1B6C00beC8a",
  "decimals": 6,
  "contractAddress": "0xdAC17F958D2ee523a2206206994597C13D831ec7",
  "oraclePrice": 1.0001,
  "chainlinkFeed": "0x3E7d1eAB13ad0104d2750B8863b489D65364e32D",
  "etherscanUrl": "https://etherscan.io/tx/0x...",
  "timestamp": "2025-01-03T15:30:45.123Z",
  "real": true,
  "bridge_function": "transfer(address,uint256)",
  "message": "✅ BRIDGE REAL 100% COMPLETADO EN MAINNET: 100 USD → 99 USDT (Precio Oráculo: 1.0001)"
}
```

### Error (500 Internal Server Error):
```json
{
  "success": false,
  "type": "USD_USDT_BRIDGE_ERROR",
  "error": "Signer no tiene suficiente USDT",
  "details": {
    "signerAddress": "0x...",
    "balanceUSDAT": "0",
    "amountRequired": 99,
    "shortfall": 99
  }
}
```

## 🔍 Pasos del Test Detallados

### Lo que el Backend Hará:

```
1. Recibir: 100 USD
   ↓
2. Conectar a Ethereum Mainnet (Alchemy RPC)
   ↓
3. Obtener precio USD/USDT del Oráculo Chainlink
   ↓
4. Calcular: 100 * 0.99 = 99 USDT (1% comisión)
   ↓
5. Verificar balance USDT del signer
   ↓
6. Ejecutar transfer() en contrato USDT real
   ↓
7. Esperar confirmación en blockchain
   ↓
8. Retornar TX Hash + Etherscan Link
```

## ✅ Checklist

- [ ] Servidor iniciado en puerto 3000
- [ ] `.env` configurado con credenciales
- [ ] ETH_RPC_URL válido en `.env`
- [ ] ETH_PRIVATE_KEY válido en `.env`
- [ ] Signer tiene ETH para gas
- [ ] Signer tiene USDT (mínimo 99 USDT para 100 USD)

## 📊 Métricas del Test

| Métrica | Valor |
|---------|-------|
| Cantidad USD | 100 |
| Comisión | 1% |
| USDT Esperados | 99 |
| Red | Ethereum Mainnet |
| Confirmación | 1 bloque |
| Gas Fee | ~65,000 gas |
| Tiempo Esperado | 30-60 segundos |

## 🔍 Verificación en Blockchain

Después de obtener el TX Hash, verifica en:
```
https://etherscan.io/tx/[TX_HASH]
```

Deberías ver:
- Status: ✅ Success
- From: [Dirección del Signer]
- To: [Dirección del USDT Contract]
- Function: transfer()
- Value: 99,000,000 (99 USDT con 6 decimales)

## 📚 Documentación Relacionada

- `USDT_MINTER_GUIA_COMPLETA.md` - Guía del USDT Minter
- `server/routes/uniswap-routes.js` - Código del bridge
- `src/components/DeFiProtocolsModule.tsx` - Frontend del bridge

## 🚀 Siguiente Paso

Después de confirmar que el test es exitoso:
1. Verificar TX en Etherscan
2. Comprobar que USDT llegó a la dirección
3. Revisar balance actualizado

¡Test listo para ejecutar! 🎉




## 📋 Pasos para Ejecutar el Test

### Paso 1: Iniciar el Servidor (en una terminal)
```bash
npm run dev:full
```

Esperar a que aparezca:
```
📍 Escuchando en http://localhost:3000
```

### Paso 2: En otra terminal, Ejecutar el Test (en otra terminal)

#### Opción A: Usando PowerShell (Windows)
```powershell
# Test simple
$response = curl.exe -s -X POST http://localhost:3000/api/uniswap/swap `
  -H "Content-Type: application/json" `
  -d '{
    "amount": 100,
    "recipientAddress": "0x05316B102FE62574b9cBd45709f8F1B6C00beC8a",
    "slippageTolerance": 1
  }'

$response
```

#### Opción B: Usando curl directo
```bash
curl -X POST http://localhost:3000/api/uniswap/swap \
  -H "Content-Type: application/json" \
  -d '{
    "amount": 100,
    "recipientAddress": "0x05316B102FE62574b9cBd45709f8F1B6C00beC8a",
    "slippageTolerance": 1
  }'
```

## 📊 Respuesta Esperada

### Éxito (200 OK):
```json
{
  "success": true,
  "type": "USD_USDT_BRIDGE_REAL_MAINNET",
  "network": "Ethereum Mainnet",
  "txHash": "0x...",
  "blockNumber": 19850123,
  "blockHash": "0x...",
  "gasUsed": "65000",
  "status": "SUCCESS",
  "amountUSD": 100,
  "amountUSDT": 99,
  "commission": 1,
  "recipient": "0x05316B102FE62574b9cBd45709f8F1B6C00beC8a",
  "decimals": 6,
  "contractAddress": "0xdAC17F958D2ee523a2206206994597C13D831ec7",
  "oraclePrice": 1.0001,
  "chainlinkFeed": "0x3E7d1eAB13ad0104d2750B8863b489D65364e32D",
  "etherscanUrl": "https://etherscan.io/tx/0x...",
  "timestamp": "2025-01-03T15:30:45.123Z",
  "real": true,
  "bridge_function": "transfer(address,uint256)",
  "message": "✅ BRIDGE REAL 100% COMPLETADO EN MAINNET: 100 USD → 99 USDT (Precio Oráculo: 1.0001)"
}
```

### Error (500 Internal Server Error):
```json
{
  "success": false,
  "type": "USD_USDT_BRIDGE_ERROR",
  "error": "Signer no tiene suficiente USDT",
  "details": {
    "signerAddress": "0x...",
    "balanceUSDAT": "0",
    "amountRequired": 99,
    "shortfall": 99
  }
}
```

## 🔍 Pasos del Test Detallados

### Lo que el Backend Hará:

```
1. Recibir: 100 USD
   ↓
2. Conectar a Ethereum Mainnet (Alchemy RPC)
   ↓
3. Obtener precio USD/USDT del Oráculo Chainlink
   ↓
4. Calcular: 100 * 0.99 = 99 USDT (1% comisión)
   ↓
5. Verificar balance USDT del signer
   ↓
6. Ejecutar transfer() en contrato USDT real
   ↓
7. Esperar confirmación en blockchain
   ↓
8. Retornar TX Hash + Etherscan Link
```

## ✅ Checklist

- [ ] Servidor iniciado en puerto 3000
- [ ] `.env` configurado con credenciales
- [ ] ETH_RPC_URL válido en `.env`
- [ ] ETH_PRIVATE_KEY válido en `.env`
- [ ] Signer tiene ETH para gas
- [ ] Signer tiene USDT (mínimo 99 USDT para 100 USD)

## 📊 Métricas del Test

| Métrica | Valor |
|---------|-------|
| Cantidad USD | 100 |
| Comisión | 1% |
| USDT Esperados | 99 |
| Red | Ethereum Mainnet |
| Confirmación | 1 bloque |
| Gas Fee | ~65,000 gas |
| Tiempo Esperado | 30-60 segundos |

## 🔍 Verificación en Blockchain

Después de obtener el TX Hash, verifica en:
```
https://etherscan.io/tx/[TX_HASH]
```

Deberías ver:
- Status: ✅ Success
- From: [Dirección del Signer]
- To: [Dirección del USDT Contract]
- Function: transfer()
- Value: 99,000,000 (99 USDT con 6 decimales)

## 📚 Documentación Relacionada

- `USDT_MINTER_GUIA_COMPLETA.md` - Guía del USDT Minter
- `server/routes/uniswap-routes.js` - Código del bridge
- `src/components/DeFiProtocolsModule.tsx` - Frontend del bridge

## 🚀 Siguiente Paso

Después de confirmar que el test es exitoso:
1. Verificar TX en Etherscan
2. Comprobar que USDT llegó a la dirección
3. Revisar balance actualizado

¡Test listo para ejecutar! 🎉



## 📋 Pasos para Ejecutar el Test

### Paso 1: Iniciar el Servidor (en una terminal)
```bash
npm run dev:full
```

Esperar a que aparezca:
```
📍 Escuchando en http://localhost:3000
```

### Paso 2: En otra terminal, Ejecutar el Test (en otra terminal)

#### Opción A: Usando PowerShell (Windows)
```powershell
# Test simple
$response = curl.exe -s -X POST http://localhost:3000/api/uniswap/swap `
  -H "Content-Type: application/json" `
  -d '{
    "amount": 100,
    "recipientAddress": "0x05316B102FE62574b9cBd45709f8F1B6C00beC8a",
    "slippageTolerance": 1
  }'

$response
```

#### Opción B: Usando curl directo
```bash
curl -X POST http://localhost:3000/api/uniswap/swap \
  -H "Content-Type: application/json" \
  -d '{
    "amount": 100,
    "recipientAddress": "0x05316B102FE62574b9cBd45709f8F1B6C00beC8a",
    "slippageTolerance": 1
  }'
```

## 📊 Respuesta Esperada

### Éxito (200 OK):
```json
{
  "success": true,
  "type": "USD_USDT_BRIDGE_REAL_MAINNET",
  "network": "Ethereum Mainnet",
  "txHash": "0x...",
  "blockNumber": 19850123,
  "blockHash": "0x...",
  "gasUsed": "65000",
  "status": "SUCCESS",
  "amountUSD": 100,
  "amountUSDT": 99,
  "commission": 1,
  "recipient": "0x05316B102FE62574b9cBd45709f8F1B6C00beC8a",
  "decimals": 6,
  "contractAddress": "0xdAC17F958D2ee523a2206206994597C13D831ec7",
  "oraclePrice": 1.0001,
  "chainlinkFeed": "0x3E7d1eAB13ad0104d2750B8863b489D65364e32D",
  "etherscanUrl": "https://etherscan.io/tx/0x...",
  "timestamp": "2025-01-03T15:30:45.123Z",
  "real": true,
  "bridge_function": "transfer(address,uint256)",
  "message": "✅ BRIDGE REAL 100% COMPLETADO EN MAINNET: 100 USD → 99 USDT (Precio Oráculo: 1.0001)"
}
```

### Error (500 Internal Server Error):
```json
{
  "success": false,
  "type": "USD_USDT_BRIDGE_ERROR",
  "error": "Signer no tiene suficiente USDT",
  "details": {
    "signerAddress": "0x...",
    "balanceUSDAT": "0",
    "amountRequired": 99,
    "shortfall": 99
  }
}
```

## 🔍 Pasos del Test Detallados

### Lo que el Backend Hará:

```
1. Recibir: 100 USD
   ↓
2. Conectar a Ethereum Mainnet (Alchemy RPC)
   ↓
3. Obtener precio USD/USDT del Oráculo Chainlink
   ↓
4. Calcular: 100 * 0.99 = 99 USDT (1% comisión)
   ↓
5. Verificar balance USDT del signer
   ↓
6. Ejecutar transfer() en contrato USDT real
   ↓
7. Esperar confirmación en blockchain
   ↓
8. Retornar TX Hash + Etherscan Link
```

## ✅ Checklist

- [ ] Servidor iniciado en puerto 3000
- [ ] `.env` configurado con credenciales
- [ ] ETH_RPC_URL válido en `.env`
- [ ] ETH_PRIVATE_KEY válido en `.env`
- [ ] Signer tiene ETH para gas
- [ ] Signer tiene USDT (mínimo 99 USDT para 100 USD)

## 📊 Métricas del Test

| Métrica | Valor |
|---------|-------|
| Cantidad USD | 100 |
| Comisión | 1% |
| USDT Esperados | 99 |
| Red | Ethereum Mainnet |
| Confirmación | 1 bloque |
| Gas Fee | ~65,000 gas |
| Tiempo Esperado | 30-60 segundos |

## 🔍 Verificación en Blockchain

Después de obtener el TX Hash, verifica en:
```
https://etherscan.io/tx/[TX_HASH]
```

Deberías ver:
- Status: ✅ Success
- From: [Dirección del Signer]
- To: [Dirección del USDT Contract]
- Function: transfer()
- Value: 99,000,000 (99 USDT con 6 decimales)

## 📚 Documentación Relacionada

- `USDT_MINTER_GUIA_COMPLETA.md` - Guía del USDT Minter
- `server/routes/uniswap-routes.js` - Código del bridge
- `src/components/DeFiProtocolsModule.tsx` - Frontend del bridge

## 🚀 Siguiente Paso

Después de confirmar que el test es exitoso:
1. Verificar TX en Etherscan
2. Comprobar que USDT llegó a la dirección
3. Revisar balance actualizado

¡Test listo para ejecutar! 🎉



## 📋 Pasos para Ejecutar el Test

### Paso 1: Iniciar el Servidor (en una terminal)
```bash
npm run dev:full
```

Esperar a que aparezca:
```
📍 Escuchando en http://localhost:3000
```

### Paso 2: En otra terminal, Ejecutar el Test (en otra terminal)

#### Opción A: Usando PowerShell (Windows)
```powershell
# Test simple
$response = curl.exe -s -X POST http://localhost:3000/api/uniswap/swap `
  -H "Content-Type: application/json" `
  -d '{
    "amount": 100,
    "recipientAddress": "0x05316B102FE62574b9cBd45709f8F1B6C00beC8a",
    "slippageTolerance": 1
  }'

$response
```

#### Opción B: Usando curl directo
```bash
curl -X POST http://localhost:3000/api/uniswap/swap \
  -H "Content-Type: application/json" \
  -d '{
    "amount": 100,
    "recipientAddress": "0x05316B102FE62574b9cBd45709f8F1B6C00beC8a",
    "slippageTolerance": 1
  }'
```

## 📊 Respuesta Esperada

### Éxito (200 OK):
```json
{
  "success": true,
  "type": "USD_USDT_BRIDGE_REAL_MAINNET",
  "network": "Ethereum Mainnet",
  "txHash": "0x...",
  "blockNumber": 19850123,
  "blockHash": "0x...",
  "gasUsed": "65000",
  "status": "SUCCESS",
  "amountUSD": 100,
  "amountUSDT": 99,
  "commission": 1,
  "recipient": "0x05316B102FE62574b9cBd45709f8F1B6C00beC8a",
  "decimals": 6,
  "contractAddress": "0xdAC17F958D2ee523a2206206994597C13D831ec7",
  "oraclePrice": 1.0001,
  "chainlinkFeed": "0x3E7d1eAB13ad0104d2750B8863b489D65364e32D",
  "etherscanUrl": "https://etherscan.io/tx/0x...",
  "timestamp": "2025-01-03T15:30:45.123Z",
  "real": true,
  "bridge_function": "transfer(address,uint256)",
  "message": "✅ BRIDGE REAL 100% COMPLETADO EN MAINNET: 100 USD → 99 USDT (Precio Oráculo: 1.0001)"
}
```

### Error (500 Internal Server Error):
```json
{
  "success": false,
  "type": "USD_USDT_BRIDGE_ERROR",
  "error": "Signer no tiene suficiente USDT",
  "details": {
    "signerAddress": "0x...",
    "balanceUSDAT": "0",
    "amountRequired": 99,
    "shortfall": 99
  }
}
```

## 🔍 Pasos del Test Detallados

### Lo que el Backend Hará:

```
1. Recibir: 100 USD
   ↓
2. Conectar a Ethereum Mainnet (Alchemy RPC)
   ↓
3. Obtener precio USD/USDT del Oráculo Chainlink
   ↓
4. Calcular: 100 * 0.99 = 99 USDT (1% comisión)
   ↓
5. Verificar balance USDT del signer
   ↓
6. Ejecutar transfer() en contrato USDT real
   ↓
7. Esperar confirmación en blockchain
   ↓
8. Retornar TX Hash + Etherscan Link
```

## ✅ Checklist

- [ ] Servidor iniciado en puerto 3000
- [ ] `.env` configurado con credenciales
- [ ] ETH_RPC_URL válido en `.env`
- [ ] ETH_PRIVATE_KEY válido en `.env`
- [ ] Signer tiene ETH para gas
- [ ] Signer tiene USDT (mínimo 99 USDT para 100 USD)

## 📊 Métricas del Test

| Métrica | Valor |
|---------|-------|
| Cantidad USD | 100 |
| Comisión | 1% |
| USDT Esperados | 99 |
| Red | Ethereum Mainnet |
| Confirmación | 1 bloque |
| Gas Fee | ~65,000 gas |
| Tiempo Esperado | 30-60 segundos |

## 🔍 Verificación en Blockchain

Después de obtener el TX Hash, verifica en:
```
https://etherscan.io/tx/[TX_HASH]
```

Deberías ver:
- Status: ✅ Success
- From: [Dirección del Signer]
- To: [Dirección del USDT Contract]
- Function: transfer()
- Value: 99,000,000 (99 USDT con 6 decimales)

## 📚 Documentación Relacionada

- `USDT_MINTER_GUIA_COMPLETA.md` - Guía del USDT Minter
- `server/routes/uniswap-routes.js` - Código del bridge
- `src/components/DeFiProtocolsModule.tsx` - Frontend del bridge

## 🚀 Siguiente Paso

Después de confirmar que el test es exitoso:
1. Verificar TX en Etherscan
2. Comprobar que USDT llegó a la dirección
3. Revisar balance actualizado

¡Test listo para ejecutar! 🎉



## 📋 Pasos para Ejecutar el Test

### Paso 1: Iniciar el Servidor (en una terminal)
```bash
npm run dev:full
```

Esperar a que aparezca:
```
📍 Escuchando en http://localhost:3000
```

### Paso 2: En otra terminal, Ejecutar el Test (en otra terminal)

#### Opción A: Usando PowerShell (Windows)
```powershell
# Test simple
$response = curl.exe -s -X POST http://localhost:3000/api/uniswap/swap `
  -H "Content-Type: application/json" `
  -d '{
    "amount": 100,
    "recipientAddress": "0x05316B102FE62574b9cBd45709f8F1B6C00beC8a",
    "slippageTolerance": 1
  }'

$response
```

#### Opción B: Usando curl directo
```bash
curl -X POST http://localhost:3000/api/uniswap/swap \
  -H "Content-Type: application/json" \
  -d '{
    "amount": 100,
    "recipientAddress": "0x05316B102FE62574b9cBd45709f8F1B6C00beC8a",
    "slippageTolerance": 1
  }'
```

## 📊 Respuesta Esperada

### Éxito (200 OK):
```json
{
  "success": true,
  "type": "USD_USDT_BRIDGE_REAL_MAINNET",
  "network": "Ethereum Mainnet",
  "txHash": "0x...",
  "blockNumber": 19850123,
  "blockHash": "0x...",
  "gasUsed": "65000",
  "status": "SUCCESS",
  "amountUSD": 100,
  "amountUSDT": 99,
  "commission": 1,
  "recipient": "0x05316B102FE62574b9cBd45709f8F1B6C00beC8a",
  "decimals": 6,
  "contractAddress": "0xdAC17F958D2ee523a2206206994597C13D831ec7",
  "oraclePrice": 1.0001,
  "chainlinkFeed": "0x3E7d1eAB13ad0104d2750B8863b489D65364e32D",
  "etherscanUrl": "https://etherscan.io/tx/0x...",
  "timestamp": "2025-01-03T15:30:45.123Z",
  "real": true,
  "bridge_function": "transfer(address,uint256)",
  "message": "✅ BRIDGE REAL 100% COMPLETADO EN MAINNET: 100 USD → 99 USDT (Precio Oráculo: 1.0001)"
}
```

### Error (500 Internal Server Error):
```json
{
  "success": false,
  "type": "USD_USDT_BRIDGE_ERROR",
  "error": "Signer no tiene suficiente USDT",
  "details": {
    "signerAddress": "0x...",
    "balanceUSDAT": "0",
    "amountRequired": 99,
    "shortfall": 99
  }
}
```

## 🔍 Pasos del Test Detallados

### Lo que el Backend Hará:

```
1. Recibir: 100 USD
   ↓
2. Conectar a Ethereum Mainnet (Alchemy RPC)
   ↓
3. Obtener precio USD/USDT del Oráculo Chainlink
   ↓
4. Calcular: 100 * 0.99 = 99 USDT (1% comisión)
   ↓
5. Verificar balance USDT del signer
   ↓
6. Ejecutar transfer() en contrato USDT real
   ↓
7. Esperar confirmación en blockchain
   ↓
8. Retornar TX Hash + Etherscan Link
```

## ✅ Checklist

- [ ] Servidor iniciado en puerto 3000
- [ ] `.env` configurado con credenciales
- [ ] ETH_RPC_URL válido en `.env`
- [ ] ETH_PRIVATE_KEY válido en `.env`
- [ ] Signer tiene ETH para gas
- [ ] Signer tiene USDT (mínimo 99 USDT para 100 USD)

## 📊 Métricas del Test

| Métrica | Valor |
|---------|-------|
| Cantidad USD | 100 |
| Comisión | 1% |
| USDT Esperados | 99 |
| Red | Ethereum Mainnet |
| Confirmación | 1 bloque |
| Gas Fee | ~65,000 gas |
| Tiempo Esperado | 30-60 segundos |

## 🔍 Verificación en Blockchain

Después de obtener el TX Hash, verifica en:
```
https://etherscan.io/tx/[TX_HASH]
```

Deberías ver:
- Status: ✅ Success
- From: [Dirección del Signer]
- To: [Dirección del USDT Contract]
- Function: transfer()
- Value: 99,000,000 (99 USDT con 6 decimales)

## 📚 Documentación Relacionada

- `USDT_MINTER_GUIA_COMPLETA.md` - Guía del USDT Minter
- `server/routes/uniswap-routes.js` - Código del bridge
- `src/components/DeFiProtocolsModule.tsx` - Frontend del bridge

## 🚀 Siguiente Paso

Después de confirmar que el test es exitoso:
1. Verificar TX en Etherscan
2. Comprobar que USDT llegó a la dirección
3. Revisar balance actualizado

¡Test listo para ejecutar! 🎉




## 📋 Pasos para Ejecutar el Test

### Paso 1: Iniciar el Servidor (en una terminal)
```bash
npm run dev:full
```

Esperar a que aparezca:
```
📍 Escuchando en http://localhost:3000
```

### Paso 2: En otra terminal, Ejecutar el Test (en otra terminal)

#### Opción A: Usando PowerShell (Windows)
```powershell
# Test simple
$response = curl.exe -s -X POST http://localhost:3000/api/uniswap/swap `
  -H "Content-Type: application/json" `
  -d '{
    "amount": 100,
    "recipientAddress": "0x05316B102FE62574b9cBd45709f8F1B6C00beC8a",
    "slippageTolerance": 1
  }'

$response
```

#### Opción B: Usando curl directo
```bash
curl -X POST http://localhost:3000/api/uniswap/swap \
  -H "Content-Type: application/json" \
  -d '{
    "amount": 100,
    "recipientAddress": "0x05316B102FE62574b9cBd45709f8F1B6C00beC8a",
    "slippageTolerance": 1
  }'
```

## 📊 Respuesta Esperada

### Éxito (200 OK):
```json
{
  "success": true,
  "type": "USD_USDT_BRIDGE_REAL_MAINNET",
  "network": "Ethereum Mainnet",
  "txHash": "0x...",
  "blockNumber": 19850123,
  "blockHash": "0x...",
  "gasUsed": "65000",
  "status": "SUCCESS",
  "amountUSD": 100,
  "amountUSDT": 99,
  "commission": 1,
  "recipient": "0x05316B102FE62574b9cBd45709f8F1B6C00beC8a",
  "decimals": 6,
  "contractAddress": "0xdAC17F958D2ee523a2206206994597C13D831ec7",
  "oraclePrice": 1.0001,
  "chainlinkFeed": "0x3E7d1eAB13ad0104d2750B8863b489D65364e32D",
  "etherscanUrl": "https://etherscan.io/tx/0x...",
  "timestamp": "2025-01-03T15:30:45.123Z",
  "real": true,
  "bridge_function": "transfer(address,uint256)",
  "message": "✅ BRIDGE REAL 100% COMPLETADO EN MAINNET: 100 USD → 99 USDT (Precio Oráculo: 1.0001)"
}
```

### Error (500 Internal Server Error):
```json
{
  "success": false,
  "type": "USD_USDT_BRIDGE_ERROR",
  "error": "Signer no tiene suficiente USDT",
  "details": {
    "signerAddress": "0x...",
    "balanceUSDAT": "0",
    "amountRequired": 99,
    "shortfall": 99
  }
}
```

## 🔍 Pasos del Test Detallados

### Lo que el Backend Hará:

```
1. Recibir: 100 USD
   ↓
2. Conectar a Ethereum Mainnet (Alchemy RPC)
   ↓
3. Obtener precio USD/USDT del Oráculo Chainlink
   ↓
4. Calcular: 100 * 0.99 = 99 USDT (1% comisión)
   ↓
5. Verificar balance USDT del signer
   ↓
6. Ejecutar transfer() en contrato USDT real
   ↓
7. Esperar confirmación en blockchain
   ↓
8. Retornar TX Hash + Etherscan Link
```

## ✅ Checklist

- [ ] Servidor iniciado en puerto 3000
- [ ] `.env` configurado con credenciales
- [ ] ETH_RPC_URL válido en `.env`
- [ ] ETH_PRIVATE_KEY válido en `.env`
- [ ] Signer tiene ETH para gas
- [ ] Signer tiene USDT (mínimo 99 USDT para 100 USD)

## 📊 Métricas del Test

| Métrica | Valor |
|---------|-------|
| Cantidad USD | 100 |
| Comisión | 1% |
| USDT Esperados | 99 |
| Red | Ethereum Mainnet |
| Confirmación | 1 bloque |
| Gas Fee | ~65,000 gas |
| Tiempo Esperado | 30-60 segundos |

## 🔍 Verificación en Blockchain

Después de obtener el TX Hash, verifica en:
```
https://etherscan.io/tx/[TX_HASH]
```

Deberías ver:
- Status: ✅ Success
- From: [Dirección del Signer]
- To: [Dirección del USDT Contract]
- Function: transfer()
- Value: 99,000,000 (99 USDT con 6 decimales)

## 📚 Documentación Relacionada

- `USDT_MINTER_GUIA_COMPLETA.md` - Guía del USDT Minter
- `server/routes/uniswap-routes.js` - Código del bridge
- `src/components/DeFiProtocolsModule.tsx` - Frontend del bridge

## 🚀 Siguiente Paso

Después de confirmar que el test es exitoso:
1. Verificar TX en Etherscan
2. Comprobar que USDT llegó a la dirección
3. Revisar balance actualizado

¡Test listo para ejecutar! 🎉



## 📋 Pasos para Ejecutar el Test

### Paso 1: Iniciar el Servidor (en una terminal)
```bash
npm run dev:full
```

Esperar a que aparezca:
```
📍 Escuchando en http://localhost:3000
```

### Paso 2: En otra terminal, Ejecutar el Test (en otra terminal)

#### Opción A: Usando PowerShell (Windows)
```powershell
# Test simple
$response = curl.exe -s -X POST http://localhost:3000/api/uniswap/swap `
  -H "Content-Type: application/json" `
  -d '{
    "amount": 100,
    "recipientAddress": "0x05316B102FE62574b9cBd45709f8F1B6C00beC8a",
    "slippageTolerance": 1
  }'

$response
```

#### Opción B: Usando curl directo
```bash
curl -X POST http://localhost:3000/api/uniswap/swap \
  -H "Content-Type: application/json" \
  -d '{
    "amount": 100,
    "recipientAddress": "0x05316B102FE62574b9cBd45709f8F1B6C00beC8a",
    "slippageTolerance": 1
  }'
```

## 📊 Respuesta Esperada

### Éxito (200 OK):
```json
{
  "success": true,
  "type": "USD_USDT_BRIDGE_REAL_MAINNET",
  "network": "Ethereum Mainnet",
  "txHash": "0x...",
  "blockNumber": 19850123,
  "blockHash": "0x...",
  "gasUsed": "65000",
  "status": "SUCCESS",
  "amountUSD": 100,
  "amountUSDT": 99,
  "commission": 1,
  "recipient": "0x05316B102FE62574b9cBd45709f8F1B6C00beC8a",
  "decimals": 6,
  "contractAddress": "0xdAC17F958D2ee523a2206206994597C13D831ec7",
  "oraclePrice": 1.0001,
  "chainlinkFeed": "0x3E7d1eAB13ad0104d2750B8863b489D65364e32D",
  "etherscanUrl": "https://etherscan.io/tx/0x...",
  "timestamp": "2025-01-03T15:30:45.123Z",
  "real": true,
  "bridge_function": "transfer(address,uint256)",
  "message": "✅ BRIDGE REAL 100% COMPLETADO EN MAINNET: 100 USD → 99 USDT (Precio Oráculo: 1.0001)"
}
```

### Error (500 Internal Server Error):
```json
{
  "success": false,
  "type": "USD_USDT_BRIDGE_ERROR",
  "error": "Signer no tiene suficiente USDT",
  "details": {
    "signerAddress": "0x...",
    "balanceUSDAT": "0",
    "amountRequired": 99,
    "shortfall": 99
  }
}
```

## 🔍 Pasos del Test Detallados

### Lo que el Backend Hará:

```
1. Recibir: 100 USD
   ↓
2. Conectar a Ethereum Mainnet (Alchemy RPC)
   ↓
3. Obtener precio USD/USDT del Oráculo Chainlink
   ↓
4. Calcular: 100 * 0.99 = 99 USDT (1% comisión)
   ↓
5. Verificar balance USDT del signer
   ↓
6. Ejecutar transfer() en contrato USDT real
   ↓
7. Esperar confirmación en blockchain
   ↓
8. Retornar TX Hash + Etherscan Link
```

## ✅ Checklist

- [ ] Servidor iniciado en puerto 3000
- [ ] `.env` configurado con credenciales
- [ ] ETH_RPC_URL válido en `.env`
- [ ] ETH_PRIVATE_KEY válido en `.env`
- [ ] Signer tiene ETH para gas
- [ ] Signer tiene USDT (mínimo 99 USDT para 100 USD)

## 📊 Métricas del Test

| Métrica | Valor |
|---------|-------|
| Cantidad USD | 100 |
| Comisión | 1% |
| USDT Esperados | 99 |
| Red | Ethereum Mainnet |
| Confirmación | 1 bloque |
| Gas Fee | ~65,000 gas |
| Tiempo Esperado | 30-60 segundos |

## 🔍 Verificación en Blockchain

Después de obtener el TX Hash, verifica en:
```
https://etherscan.io/tx/[TX_HASH]
```

Deberías ver:
- Status: ✅ Success
- From: [Dirección del Signer]
- To: [Dirección del USDT Contract]
- Function: transfer()
- Value: 99,000,000 (99 USDT con 6 decimales)

## 📚 Documentación Relacionada

- `USDT_MINTER_GUIA_COMPLETA.md` - Guía del USDT Minter
- `server/routes/uniswap-routes.js` - Código del bridge
- `src/components/DeFiProtocolsModule.tsx` - Frontend del bridge

## 🚀 Siguiente Paso

Después de confirmar que el test es exitoso:
1. Verificar TX en Etherscan
2. Comprobar que USDT llegó a la dirección
3. Revisar balance actualizado

¡Test listo para ejecutar! 🎉



## 📋 Pasos para Ejecutar el Test

### Paso 1: Iniciar el Servidor (en una terminal)
```bash
npm run dev:full
```

Esperar a que aparezca:
```
📍 Escuchando en http://localhost:3000
```

### Paso 2: En otra terminal, Ejecutar el Test (en otra terminal)

#### Opción A: Usando PowerShell (Windows)
```powershell
# Test simple
$response = curl.exe -s -X POST http://localhost:3000/api/uniswap/swap `
  -H "Content-Type: application/json" `
  -d '{
    "amount": 100,
    "recipientAddress": "0x05316B102FE62574b9cBd45709f8F1B6C00beC8a",
    "slippageTolerance": 1
  }'

$response
```

#### Opción B: Usando curl directo
```bash
curl -X POST http://localhost:3000/api/uniswap/swap \
  -H "Content-Type: application/json" \
  -d '{
    "amount": 100,
    "recipientAddress": "0x05316B102FE62574b9cBd45709f8F1B6C00beC8a",
    "slippageTolerance": 1
  }'
```

## 📊 Respuesta Esperada

### Éxito (200 OK):
```json
{
  "success": true,
  "type": "USD_USDT_BRIDGE_REAL_MAINNET",
  "network": "Ethereum Mainnet",
  "txHash": "0x...",
  "blockNumber": 19850123,
  "blockHash": "0x...",
  "gasUsed": "65000",
  "status": "SUCCESS",
  "amountUSD": 100,
  "amountUSDT": 99,
  "commission": 1,
  "recipient": "0x05316B102FE62574b9cBd45709f8F1B6C00beC8a",
  "decimals": 6,
  "contractAddress": "0xdAC17F958D2ee523a2206206994597C13D831ec7",
  "oraclePrice": 1.0001,
  "chainlinkFeed": "0x3E7d1eAB13ad0104d2750B8863b489D65364e32D",
  "etherscanUrl": "https://etherscan.io/tx/0x...",
  "timestamp": "2025-01-03T15:30:45.123Z",
  "real": true,
  "bridge_function": "transfer(address,uint256)",
  "message": "✅ BRIDGE REAL 100% COMPLETADO EN MAINNET: 100 USD → 99 USDT (Precio Oráculo: 1.0001)"
}
```

### Error (500 Internal Server Error):
```json
{
  "success": false,
  "type": "USD_USDT_BRIDGE_ERROR",
  "error": "Signer no tiene suficiente USDT",
  "details": {
    "signerAddress": "0x...",
    "balanceUSDAT": "0",
    "amountRequired": 99,
    "shortfall": 99
  }
}
```

## 🔍 Pasos del Test Detallados

### Lo que el Backend Hará:

```
1. Recibir: 100 USD
   ↓
2. Conectar a Ethereum Mainnet (Alchemy RPC)
   ↓
3. Obtener precio USD/USDT del Oráculo Chainlink
   ↓
4. Calcular: 100 * 0.99 = 99 USDT (1% comisión)
   ↓
5. Verificar balance USDT del signer
   ↓
6. Ejecutar transfer() en contrato USDT real
   ↓
7. Esperar confirmación en blockchain
   ↓
8. Retornar TX Hash + Etherscan Link
```

## ✅ Checklist

- [ ] Servidor iniciado en puerto 3000
- [ ] `.env` configurado con credenciales
- [ ] ETH_RPC_URL válido en `.env`
- [ ] ETH_PRIVATE_KEY válido en `.env`
- [ ] Signer tiene ETH para gas
- [ ] Signer tiene USDT (mínimo 99 USDT para 100 USD)

## 📊 Métricas del Test

| Métrica | Valor |
|---------|-------|
| Cantidad USD | 100 |
| Comisión | 1% |
| USDT Esperados | 99 |
| Red | Ethereum Mainnet |
| Confirmación | 1 bloque |
| Gas Fee | ~65,000 gas |
| Tiempo Esperado | 30-60 segundos |

## 🔍 Verificación en Blockchain

Después de obtener el TX Hash, verifica en:
```
https://etherscan.io/tx/[TX_HASH]
```

Deberías ver:
- Status: ✅ Success
- From: [Dirección del Signer]
- To: [Dirección del USDT Contract]
- Function: transfer()
- Value: 99,000,000 (99 USDT con 6 decimales)

## 📚 Documentación Relacionada

- `USDT_MINTER_GUIA_COMPLETA.md` - Guía del USDT Minter
- `server/routes/uniswap-routes.js` - Código del bridge
- `src/components/DeFiProtocolsModule.tsx` - Frontend del bridge

## 🚀 Siguiente Paso

Después de confirmar que el test es exitoso:
1. Verificar TX en Etherscan
2. Comprobar que USDT llegó a la dirección
3. Revisar balance actualizado

¡Test listo para ejecutar! 🎉



## 📋 Pasos para Ejecutar el Test

### Paso 1: Iniciar el Servidor (en una terminal)
```bash
npm run dev:full
```

Esperar a que aparezca:
```
📍 Escuchando en http://localhost:3000
```

### Paso 2: En otra terminal, Ejecutar el Test (en otra terminal)

#### Opción A: Usando PowerShell (Windows)
```powershell
# Test simple
$response = curl.exe -s -X POST http://localhost:3000/api/uniswap/swap `
  -H "Content-Type: application/json" `
  -d '{
    "amount": 100,
    "recipientAddress": "0x05316B102FE62574b9cBd45709f8F1B6C00beC8a",
    "slippageTolerance": 1
  }'

$response
```

#### Opción B: Usando curl directo
```bash
curl -X POST http://localhost:3000/api/uniswap/swap \
  -H "Content-Type: application/json" \
  -d '{
    "amount": 100,
    "recipientAddress": "0x05316B102FE62574b9cBd45709f8F1B6C00beC8a",
    "slippageTolerance": 1
  }'
```

## 📊 Respuesta Esperada

### Éxito (200 OK):
```json
{
  "success": true,
  "type": "USD_USDT_BRIDGE_REAL_MAINNET",
  "network": "Ethereum Mainnet",
  "txHash": "0x...",
  "blockNumber": 19850123,
  "blockHash": "0x...",
  "gasUsed": "65000",
  "status": "SUCCESS",
  "amountUSD": 100,
  "amountUSDT": 99,
  "commission": 1,
  "recipient": "0x05316B102FE62574b9cBd45709f8F1B6C00beC8a",
  "decimals": 6,
  "contractAddress": "0xdAC17F958D2ee523a2206206994597C13D831ec7",
  "oraclePrice": 1.0001,
  "chainlinkFeed": "0x3E7d1eAB13ad0104d2750B8863b489D65364e32D",
  "etherscanUrl": "https://etherscan.io/tx/0x...",
  "timestamp": "2025-01-03T15:30:45.123Z",
  "real": true,
  "bridge_function": "transfer(address,uint256)",
  "message": "✅ BRIDGE REAL 100% COMPLETADO EN MAINNET: 100 USD → 99 USDT (Precio Oráculo: 1.0001)"
}
```

### Error (500 Internal Server Error):
```json
{
  "success": false,
  "type": "USD_USDT_BRIDGE_ERROR",
  "error": "Signer no tiene suficiente USDT",
  "details": {
    "signerAddress": "0x...",
    "balanceUSDAT": "0",
    "amountRequired": 99,
    "shortfall": 99
  }
}
```

## 🔍 Pasos del Test Detallados

### Lo que el Backend Hará:

```
1. Recibir: 100 USD
   ↓
2. Conectar a Ethereum Mainnet (Alchemy RPC)
   ↓
3. Obtener precio USD/USDT del Oráculo Chainlink
   ↓
4. Calcular: 100 * 0.99 = 99 USDT (1% comisión)
   ↓
5. Verificar balance USDT del signer
   ↓
6. Ejecutar transfer() en contrato USDT real
   ↓
7. Esperar confirmación en blockchain
   ↓
8. Retornar TX Hash + Etherscan Link
```

## ✅ Checklist

- [ ] Servidor iniciado en puerto 3000
- [ ] `.env` configurado con credenciales
- [ ] ETH_RPC_URL válido en `.env`
- [ ] ETH_PRIVATE_KEY válido en `.env`
- [ ] Signer tiene ETH para gas
- [ ] Signer tiene USDT (mínimo 99 USDT para 100 USD)

## 📊 Métricas del Test

| Métrica | Valor |
|---------|-------|
| Cantidad USD | 100 |
| Comisión | 1% |
| USDT Esperados | 99 |
| Red | Ethereum Mainnet |
| Confirmación | 1 bloque |
| Gas Fee | ~65,000 gas |
| Tiempo Esperado | 30-60 segundos |

## 🔍 Verificación en Blockchain

Después de obtener el TX Hash, verifica en:
```
https://etherscan.io/tx/[TX_HASH]
```

Deberías ver:
- Status: ✅ Success
- From: [Dirección del Signer]
- To: [Dirección del USDT Contract]
- Function: transfer()
- Value: 99,000,000 (99 USDT con 6 decimales)

## 📚 Documentación Relacionada

- `USDT_MINTER_GUIA_COMPLETA.md` - Guía del USDT Minter
- `server/routes/uniswap-routes.js` - Código del bridge
- `src/components/DeFiProtocolsModule.tsx` - Frontend del bridge

## 🚀 Siguiente Paso

Después de confirmar que el test es exitoso:
1. Verificar TX en Etherscan
2. Comprobar que USDT llegó a la dirección
3. Revisar balance actualizado

¡Test listo para ejecutar! 🎉




## 📋 Pasos para Ejecutar el Test

### Paso 1: Iniciar el Servidor (en una terminal)
```bash
npm run dev:full
```

Esperar a que aparezca:
```
📍 Escuchando en http://localhost:3000
```

### Paso 2: En otra terminal, Ejecutar el Test (en otra terminal)

#### Opción A: Usando PowerShell (Windows)
```powershell
# Test simple
$response = curl.exe -s -X POST http://localhost:3000/api/uniswap/swap `
  -H "Content-Type: application/json" `
  -d '{
    "amount": 100,
    "recipientAddress": "0x05316B102FE62574b9cBd45709f8F1B6C00beC8a",
    "slippageTolerance": 1
  }'

$response
```

#### Opción B: Usando curl directo
```bash
curl -X POST http://localhost:3000/api/uniswap/swap \
  -H "Content-Type: application/json" \
  -d '{
    "amount": 100,
    "recipientAddress": "0x05316B102FE62574b9cBd45709f8F1B6C00beC8a",
    "slippageTolerance": 1
  }'
```

## 📊 Respuesta Esperada

### Éxito (200 OK):
```json
{
  "success": true,
  "type": "USD_USDT_BRIDGE_REAL_MAINNET",
  "network": "Ethereum Mainnet",
  "txHash": "0x...",
  "blockNumber": 19850123,
  "blockHash": "0x...",
  "gasUsed": "65000",
  "status": "SUCCESS",
  "amountUSD": 100,
  "amountUSDT": 99,
  "commission": 1,
  "recipient": "0x05316B102FE62574b9cBd45709f8F1B6C00beC8a",
  "decimals": 6,
  "contractAddress": "0xdAC17F958D2ee523a2206206994597C13D831ec7",
  "oraclePrice": 1.0001,
  "chainlinkFeed": "0x3E7d1eAB13ad0104d2750B8863b489D65364e32D",
  "etherscanUrl": "https://etherscan.io/tx/0x...",
  "timestamp": "2025-01-03T15:30:45.123Z",
  "real": true,
  "bridge_function": "transfer(address,uint256)",
  "message": "✅ BRIDGE REAL 100% COMPLETADO EN MAINNET: 100 USD → 99 USDT (Precio Oráculo: 1.0001)"
}
```

### Error (500 Internal Server Error):
```json
{
  "success": false,
  "type": "USD_USDT_BRIDGE_ERROR",
  "error": "Signer no tiene suficiente USDT",
  "details": {
    "signerAddress": "0x...",
    "balanceUSDAT": "0",
    "amountRequired": 99,
    "shortfall": 99
  }
}
```

## 🔍 Pasos del Test Detallados

### Lo que el Backend Hará:

```
1. Recibir: 100 USD
   ↓
2. Conectar a Ethereum Mainnet (Alchemy RPC)
   ↓
3. Obtener precio USD/USDT del Oráculo Chainlink
   ↓
4. Calcular: 100 * 0.99 = 99 USDT (1% comisión)
   ↓
5. Verificar balance USDT del signer
   ↓
6. Ejecutar transfer() en contrato USDT real
   ↓
7. Esperar confirmación en blockchain
   ↓
8. Retornar TX Hash + Etherscan Link
```

## ✅ Checklist

- [ ] Servidor iniciado en puerto 3000
- [ ] `.env` configurado con credenciales
- [ ] ETH_RPC_URL válido en `.env`
- [ ] ETH_PRIVATE_KEY válido en `.env`
- [ ] Signer tiene ETH para gas
- [ ] Signer tiene USDT (mínimo 99 USDT para 100 USD)

## 📊 Métricas del Test

| Métrica | Valor |
|---------|-------|
| Cantidad USD | 100 |
| Comisión | 1% |
| USDT Esperados | 99 |
| Red | Ethereum Mainnet |
| Confirmación | 1 bloque |
| Gas Fee | ~65,000 gas |
| Tiempo Esperado | 30-60 segundos |

## 🔍 Verificación en Blockchain

Después de obtener el TX Hash, verifica en:
```
https://etherscan.io/tx/[TX_HASH]
```

Deberías ver:
- Status: ✅ Success
- From: [Dirección del Signer]
- To: [Dirección del USDT Contract]
- Function: transfer()
- Value: 99,000,000 (99 USDT con 6 decimales)

## 📚 Documentación Relacionada

- `USDT_MINTER_GUIA_COMPLETA.md` - Guía del USDT Minter
- `server/routes/uniswap-routes.js` - Código del bridge
- `src/components/DeFiProtocolsModule.tsx` - Frontend del bridge

## 🚀 Siguiente Paso

Después de confirmar que el test es exitoso:
1. Verificar TX en Etherscan
2. Comprobar que USDT llegó a la dirección
3. Revisar balance actualizado

¡Test listo para ejecutar! 🎉



## 📋 Pasos para Ejecutar el Test

### Paso 1: Iniciar el Servidor (en una terminal)
```bash
npm run dev:full
```

Esperar a que aparezca:
```
📍 Escuchando en http://localhost:3000
```

### Paso 2: En otra terminal, Ejecutar el Test (en otra terminal)

#### Opción A: Usando PowerShell (Windows)
```powershell
# Test simple
$response = curl.exe -s -X POST http://localhost:3000/api/uniswap/swap `
  -H "Content-Type: application/json" `
  -d '{
    "amount": 100,
    "recipientAddress": "0x05316B102FE62574b9cBd45709f8F1B6C00beC8a",
    "slippageTolerance": 1
  }'

$response
```

#### Opción B: Usando curl directo
```bash
curl -X POST http://localhost:3000/api/uniswap/swap \
  -H "Content-Type: application/json" \
  -d '{
    "amount": 100,
    "recipientAddress": "0x05316B102FE62574b9cBd45709f8F1B6C00beC8a",
    "slippageTolerance": 1
  }'
```

## 📊 Respuesta Esperada

### Éxito (200 OK):
```json
{
  "success": true,
  "type": "USD_USDT_BRIDGE_REAL_MAINNET",
  "network": "Ethereum Mainnet",
  "txHash": "0x...",
  "blockNumber": 19850123,
  "blockHash": "0x...",
  "gasUsed": "65000",
  "status": "SUCCESS",
  "amountUSD": 100,
  "amountUSDT": 99,
  "commission": 1,
  "recipient": "0x05316B102FE62574b9cBd45709f8F1B6C00beC8a",
  "decimals": 6,
  "contractAddress": "0xdAC17F958D2ee523a2206206994597C13D831ec7",
  "oraclePrice": 1.0001,
  "chainlinkFeed": "0x3E7d1eAB13ad0104d2750B8863b489D65364e32D",
  "etherscanUrl": "https://etherscan.io/tx/0x...",
  "timestamp": "2025-01-03T15:30:45.123Z",
  "real": true,
  "bridge_function": "transfer(address,uint256)",
  "message": "✅ BRIDGE REAL 100% COMPLETADO EN MAINNET: 100 USD → 99 USDT (Precio Oráculo: 1.0001)"
}
```

### Error (500 Internal Server Error):
```json
{
  "success": false,
  "type": "USD_USDT_BRIDGE_ERROR",
  "error": "Signer no tiene suficiente USDT",
  "details": {
    "signerAddress": "0x...",
    "balanceUSDAT": "0",
    "amountRequired": 99,
    "shortfall": 99
  }
}
```

## 🔍 Pasos del Test Detallados

### Lo que el Backend Hará:

```
1. Recibir: 100 USD
   ↓
2. Conectar a Ethereum Mainnet (Alchemy RPC)
   ↓
3. Obtener precio USD/USDT del Oráculo Chainlink
   ↓
4. Calcular: 100 * 0.99 = 99 USDT (1% comisión)
   ↓
5. Verificar balance USDT del signer
   ↓
6. Ejecutar transfer() en contrato USDT real
   ↓
7. Esperar confirmación en blockchain
   ↓
8. Retornar TX Hash + Etherscan Link
```

## ✅ Checklist

- [ ] Servidor iniciado en puerto 3000
- [ ] `.env` configurado con credenciales
- [ ] ETH_RPC_URL válido en `.env`
- [ ] ETH_PRIVATE_KEY válido en `.env`
- [ ] Signer tiene ETH para gas
- [ ] Signer tiene USDT (mínimo 99 USDT para 100 USD)

## 📊 Métricas del Test

| Métrica | Valor |
|---------|-------|
| Cantidad USD | 100 |
| Comisión | 1% |
| USDT Esperados | 99 |
| Red | Ethereum Mainnet |
| Confirmación | 1 bloque |
| Gas Fee | ~65,000 gas |
| Tiempo Esperado | 30-60 segundos |

## 🔍 Verificación en Blockchain

Después de obtener el TX Hash, verifica en:
```
https://etherscan.io/tx/[TX_HASH]
```

Deberías ver:
- Status: ✅ Success
- From: [Dirección del Signer]
- To: [Dirección del USDT Contract]
- Function: transfer()
- Value: 99,000,000 (99 USDT con 6 decimales)

## 📚 Documentación Relacionada

- `USDT_MINTER_GUIA_COMPLETA.md` - Guía del USDT Minter
- `server/routes/uniswap-routes.js` - Código del bridge
- `src/components/DeFiProtocolsModule.tsx` - Frontend del bridge

## 🚀 Siguiente Paso

Después de confirmar que el test es exitoso:
1. Verificar TX en Etherscan
2. Comprobar que USDT llegó a la dirección
3. Revisar balance actualizado

¡Test listo para ejecutar! 🎉



## 📋 Pasos para Ejecutar el Test

### Paso 1: Iniciar el Servidor (en una terminal)
```bash
npm run dev:full
```

Esperar a que aparezca:
```
📍 Escuchando en http://localhost:3000
```

### Paso 2: En otra terminal, Ejecutar el Test (en otra terminal)

#### Opción A: Usando PowerShell (Windows)
```powershell
# Test simple
$response = curl.exe -s -X POST http://localhost:3000/api/uniswap/swap `
  -H "Content-Type: application/json" `
  -d '{
    "amount": 100,
    "recipientAddress": "0x05316B102FE62574b9cBd45709f8F1B6C00beC8a",
    "slippageTolerance": 1
  }'

$response
```

#### Opción B: Usando curl directo
```bash
curl -X POST http://localhost:3000/api/uniswap/swap \
  -H "Content-Type: application/json" \
  -d '{
    "amount": 100,
    "recipientAddress": "0x05316B102FE62574b9cBd45709f8F1B6C00beC8a",
    "slippageTolerance": 1
  }'
```

## 📊 Respuesta Esperada

### Éxito (200 OK):
```json
{
  "success": true,
  "type": "USD_USDT_BRIDGE_REAL_MAINNET",
  "network": "Ethereum Mainnet",
  "txHash": "0x...",
  "blockNumber": 19850123,
  "blockHash": "0x...",
  "gasUsed": "65000",
  "status": "SUCCESS",
  "amountUSD": 100,
  "amountUSDT": 99,
  "commission": 1,
  "recipient": "0x05316B102FE62574b9cBd45709f8F1B6C00beC8a",
  "decimals": 6,
  "contractAddress": "0xdAC17F958D2ee523a2206206994597C13D831ec7",
  "oraclePrice": 1.0001,
  "chainlinkFeed": "0x3E7d1eAB13ad0104d2750B8863b489D65364e32D",
  "etherscanUrl": "https://etherscan.io/tx/0x...",
  "timestamp": "2025-01-03T15:30:45.123Z",
  "real": true,
  "bridge_function": "transfer(address,uint256)",
  "message": "✅ BRIDGE REAL 100% COMPLETADO EN MAINNET: 100 USD → 99 USDT (Precio Oráculo: 1.0001)"
}
```

### Error (500 Internal Server Error):
```json
{
  "success": false,
  "type": "USD_USDT_BRIDGE_ERROR",
  "error": "Signer no tiene suficiente USDT",
  "details": {
    "signerAddress": "0x...",
    "balanceUSDAT": "0",
    "amountRequired": 99,
    "shortfall": 99
  }
}
```

## 🔍 Pasos del Test Detallados

### Lo que el Backend Hará:

```
1. Recibir: 100 USD
   ↓
2. Conectar a Ethereum Mainnet (Alchemy RPC)
   ↓
3. Obtener precio USD/USDT del Oráculo Chainlink
   ↓
4. Calcular: 100 * 0.99 = 99 USDT (1% comisión)
   ↓
5. Verificar balance USDT del signer
   ↓
6. Ejecutar transfer() en contrato USDT real
   ↓
7. Esperar confirmación en blockchain
   ↓
8. Retornar TX Hash + Etherscan Link
```

## ✅ Checklist

- [ ] Servidor iniciado en puerto 3000
- [ ] `.env` configurado con credenciales
- [ ] ETH_RPC_URL válido en `.env`
- [ ] ETH_PRIVATE_KEY válido en `.env`
- [ ] Signer tiene ETH para gas
- [ ] Signer tiene USDT (mínimo 99 USDT para 100 USD)

## 📊 Métricas del Test

| Métrica | Valor |
|---------|-------|
| Cantidad USD | 100 |
| Comisión | 1% |
| USDT Esperados | 99 |
| Red | Ethereum Mainnet |
| Confirmación | 1 bloque |
| Gas Fee | ~65,000 gas |
| Tiempo Esperado | 30-60 segundos |

## 🔍 Verificación en Blockchain

Después de obtener el TX Hash, verifica en:
```
https://etherscan.io/tx/[TX_HASH]
```

Deberías ver:
- Status: ✅ Success
- From: [Dirección del Signer]
- To: [Dirección del USDT Contract]
- Function: transfer()
- Value: 99,000,000 (99 USDT con 6 decimales)

## 📚 Documentación Relacionada

- `USDT_MINTER_GUIA_COMPLETA.md` - Guía del USDT Minter
- `server/routes/uniswap-routes.js` - Código del bridge
- `src/components/DeFiProtocolsModule.tsx` - Frontend del bridge

## 🚀 Siguiente Paso

Después de confirmar que el test es exitoso:
1. Verificar TX en Etherscan
2. Comprobar que USDT llegó a la dirección
3. Revisar balance actualizado

¡Test listo para ejecutar! 🎉



## 📋 Pasos para Ejecutar el Test

### Paso 1: Iniciar el Servidor (en una terminal)
```bash
npm run dev:full
```

Esperar a que aparezca:
```
📍 Escuchando en http://localhost:3000
```

### Paso 2: En otra terminal, Ejecutar el Test (en otra terminal)

#### Opción A: Usando PowerShell (Windows)
```powershell
# Test simple
$response = curl.exe -s -X POST http://localhost:3000/api/uniswap/swap `
  -H "Content-Type: application/json" `
  -d '{
    "amount": 100,
    "recipientAddress": "0x05316B102FE62574b9cBd45709f8F1B6C00beC8a",
    "slippageTolerance": 1
  }'

$response
```

#### Opción B: Usando curl directo
```bash
curl -X POST http://localhost:3000/api/uniswap/swap \
  -H "Content-Type: application/json" \
  -d '{
    "amount": 100,
    "recipientAddress": "0x05316B102FE62574b9cBd45709f8F1B6C00beC8a",
    "slippageTolerance": 1
  }'
```

## 📊 Respuesta Esperada

### Éxito (200 OK):
```json
{
  "success": true,
  "type": "USD_USDT_BRIDGE_REAL_MAINNET",
  "network": "Ethereum Mainnet",
  "txHash": "0x...",
  "blockNumber": 19850123,
  "blockHash": "0x...",
  "gasUsed": "65000",
  "status": "SUCCESS",
  "amountUSD": 100,
  "amountUSDT": 99,
  "commission": 1,
  "recipient": "0x05316B102FE62574b9cBd45709f8F1B6C00beC8a",
  "decimals": 6,
  "contractAddress": "0xdAC17F958D2ee523a2206206994597C13D831ec7",
  "oraclePrice": 1.0001,
  "chainlinkFeed": "0x3E7d1eAB13ad0104d2750B8863b489D65364e32D",
  "etherscanUrl": "https://etherscan.io/tx/0x...",
  "timestamp": "2025-01-03T15:30:45.123Z",
  "real": true,
  "bridge_function": "transfer(address,uint256)",
  "message": "✅ BRIDGE REAL 100% COMPLETADO EN MAINNET: 100 USD → 99 USDT (Precio Oráculo: 1.0001)"
}
```

### Error (500 Internal Server Error):
```json
{
  "success": false,
  "type": "USD_USDT_BRIDGE_ERROR",
  "error": "Signer no tiene suficiente USDT",
  "details": {
    "signerAddress": "0x...",
    "balanceUSDAT": "0",
    "amountRequired": 99,
    "shortfall": 99
  }
}
```

## 🔍 Pasos del Test Detallados

### Lo que el Backend Hará:

```
1. Recibir: 100 USD
   ↓
2. Conectar a Ethereum Mainnet (Alchemy RPC)
   ↓
3. Obtener precio USD/USDT del Oráculo Chainlink
   ↓
4. Calcular: 100 * 0.99 = 99 USDT (1% comisión)
   ↓
5. Verificar balance USDT del signer
   ↓
6. Ejecutar transfer() en contrato USDT real
   ↓
7. Esperar confirmación en blockchain
   ↓
8. Retornar TX Hash + Etherscan Link
```

## ✅ Checklist

- [ ] Servidor iniciado en puerto 3000
- [ ] `.env` configurado con credenciales
- [ ] ETH_RPC_URL válido en `.env`
- [ ] ETH_PRIVATE_KEY válido en `.env`
- [ ] Signer tiene ETH para gas
- [ ] Signer tiene USDT (mínimo 99 USDT para 100 USD)

## 📊 Métricas del Test

| Métrica | Valor |
|---------|-------|
| Cantidad USD | 100 |
| Comisión | 1% |
| USDT Esperados | 99 |
| Red | Ethereum Mainnet |
| Confirmación | 1 bloque |
| Gas Fee | ~65,000 gas |
| Tiempo Esperado | 30-60 segundos |

## 🔍 Verificación en Blockchain

Después de obtener el TX Hash, verifica en:
```
https://etherscan.io/tx/[TX_HASH]
```

Deberías ver:
- Status: ✅ Success
- From: [Dirección del Signer]
- To: [Dirección del USDT Contract]
- Function: transfer()
- Value: 99,000,000 (99 USDT con 6 decimales)

## 📚 Documentación Relacionada

- `USDT_MINTER_GUIA_COMPLETA.md` - Guía del USDT Minter
- `server/routes/uniswap-routes.js` - Código del bridge
- `src/components/DeFiProtocolsModule.tsx` - Frontend del bridge

## 🚀 Siguiente Paso

Después de confirmar que el test es exitoso:
1. Verificar TX en Etherscan
2. Comprobar que USDT llegó a la dirección
3. Revisar balance actualizado

¡Test listo para ejecutar! 🎉




## 📋 Pasos para Ejecutar el Test

### Paso 1: Iniciar el Servidor (en una terminal)
```bash
npm run dev:full
```

Esperar a que aparezca:
```
📍 Escuchando en http://localhost:3000
```

### Paso 2: En otra terminal, Ejecutar el Test (en otra terminal)

#### Opción A: Usando PowerShell (Windows)
```powershell
# Test simple
$response = curl.exe -s -X POST http://localhost:3000/api/uniswap/swap `
  -H "Content-Type: application/json" `
  -d '{
    "amount": 100,
    "recipientAddress": "0x05316B102FE62574b9cBd45709f8F1B6C00beC8a",
    "slippageTolerance": 1
  }'

$response
```

#### Opción B: Usando curl directo
```bash
curl -X POST http://localhost:3000/api/uniswap/swap \
  -H "Content-Type: application/json" \
  -d '{
    "amount": 100,
    "recipientAddress": "0x05316B102FE62574b9cBd45709f8F1B6C00beC8a",
    "slippageTolerance": 1
  }'
```

## 📊 Respuesta Esperada

### Éxito (200 OK):
```json
{
  "success": true,
  "type": "USD_USDT_BRIDGE_REAL_MAINNET",
  "network": "Ethereum Mainnet",
  "txHash": "0x...",
  "blockNumber": 19850123,
  "blockHash": "0x...",
  "gasUsed": "65000",
  "status": "SUCCESS",
  "amountUSD": 100,
  "amountUSDT": 99,
  "commission": 1,
  "recipient": "0x05316B102FE62574b9cBd45709f8F1B6C00beC8a",
  "decimals": 6,
  "contractAddress": "0xdAC17F958D2ee523a2206206994597C13D831ec7",
  "oraclePrice": 1.0001,
  "chainlinkFeed": "0x3E7d1eAB13ad0104d2750B8863b489D65364e32D",
  "etherscanUrl": "https://etherscan.io/tx/0x...",
  "timestamp": "2025-01-03T15:30:45.123Z",
  "real": true,
  "bridge_function": "transfer(address,uint256)",
  "message": "✅ BRIDGE REAL 100% COMPLETADO EN MAINNET: 100 USD → 99 USDT (Precio Oráculo: 1.0001)"
}
```

### Error (500 Internal Server Error):
```json
{
  "success": false,
  "type": "USD_USDT_BRIDGE_ERROR",
  "error": "Signer no tiene suficiente USDT",
  "details": {
    "signerAddress": "0x...",
    "balanceUSDAT": "0",
    "amountRequired": 99,
    "shortfall": 99
  }
}
```

## 🔍 Pasos del Test Detallados

### Lo que el Backend Hará:

```
1. Recibir: 100 USD
   ↓
2. Conectar a Ethereum Mainnet (Alchemy RPC)
   ↓
3. Obtener precio USD/USDT del Oráculo Chainlink
   ↓
4. Calcular: 100 * 0.99 = 99 USDT (1% comisión)
   ↓
5. Verificar balance USDT del signer
   ↓
6. Ejecutar transfer() en contrato USDT real
   ↓
7. Esperar confirmación en blockchain
   ↓
8. Retornar TX Hash + Etherscan Link
```

## ✅ Checklist

- [ ] Servidor iniciado en puerto 3000
- [ ] `.env` configurado con credenciales
- [ ] ETH_RPC_URL válido en `.env`
- [ ] ETH_PRIVATE_KEY válido en `.env`
- [ ] Signer tiene ETH para gas
- [ ] Signer tiene USDT (mínimo 99 USDT para 100 USD)

## 📊 Métricas del Test

| Métrica | Valor |
|---------|-------|
| Cantidad USD | 100 |
| Comisión | 1% |
| USDT Esperados | 99 |
| Red | Ethereum Mainnet |
| Confirmación | 1 bloque |
| Gas Fee | ~65,000 gas |
| Tiempo Esperado | 30-60 segundos |

## 🔍 Verificación en Blockchain

Después de obtener el TX Hash, verifica en:
```
https://etherscan.io/tx/[TX_HASH]
```

Deberías ver:
- Status: ✅ Success
- From: [Dirección del Signer]
- To: [Dirección del USDT Contract]
- Function: transfer()
- Value: 99,000,000 (99 USDT con 6 decimales)

## 📚 Documentación Relacionada

- `USDT_MINTER_GUIA_COMPLETA.md` - Guía del USDT Minter
- `server/routes/uniswap-routes.js` - Código del bridge
- `src/components/DeFiProtocolsModule.tsx` - Frontend del bridge

## 🚀 Siguiente Paso

Después de confirmar que el test es exitoso:
1. Verificar TX en Etherscan
2. Comprobar que USDT llegó a la dirección
3. Revisar balance actualizado

¡Test listo para ejecutar! 🎉



## 📋 Pasos para Ejecutar el Test

### Paso 1: Iniciar el Servidor (en una terminal)
```bash
npm run dev:full
```

Esperar a que aparezca:
```
📍 Escuchando en http://localhost:3000
```

### Paso 2: En otra terminal, Ejecutar el Test (en otra terminal)

#### Opción A: Usando PowerShell (Windows)
```powershell
# Test simple
$response = curl.exe -s -X POST http://localhost:3000/api/uniswap/swap `
  -H "Content-Type: application/json" `
  -d '{
    "amount": 100,
    "recipientAddress": "0x05316B102FE62574b9cBd45709f8F1B6C00beC8a",
    "slippageTolerance": 1
  }'

$response
```

#### Opción B: Usando curl directo
```bash
curl -X POST http://localhost:3000/api/uniswap/swap \
  -H "Content-Type: application/json" \
  -d '{
    "amount": 100,
    "recipientAddress": "0x05316B102FE62574b9cBd45709f8F1B6C00beC8a",
    "slippageTolerance": 1
  }'
```

## 📊 Respuesta Esperada

### Éxito (200 OK):
```json
{
  "success": true,
  "type": "USD_USDT_BRIDGE_REAL_MAINNET",
  "network": "Ethereum Mainnet",
  "txHash": "0x...",
  "blockNumber": 19850123,
  "blockHash": "0x...",
  "gasUsed": "65000",
  "status": "SUCCESS",
  "amountUSD": 100,
  "amountUSDT": 99,
  "commission": 1,
  "recipient": "0x05316B102FE62574b9cBd45709f8F1B6C00beC8a",
  "decimals": 6,
  "contractAddress": "0xdAC17F958D2ee523a2206206994597C13D831ec7",
  "oraclePrice": 1.0001,
  "chainlinkFeed": "0x3E7d1eAB13ad0104d2750B8863b489D65364e32D",
  "etherscanUrl": "https://etherscan.io/tx/0x...",
  "timestamp": "2025-01-03T15:30:45.123Z",
  "real": true,
  "bridge_function": "transfer(address,uint256)",
  "message": "✅ BRIDGE REAL 100% COMPLETADO EN MAINNET: 100 USD → 99 USDT (Precio Oráculo: 1.0001)"
}
```

### Error (500 Internal Server Error):
```json
{
  "success": false,
  "type": "USD_USDT_BRIDGE_ERROR",
  "error": "Signer no tiene suficiente USDT",
  "details": {
    "signerAddress": "0x...",
    "balanceUSDAT": "0",
    "amountRequired": 99,
    "shortfall": 99
  }
}
```

## 🔍 Pasos del Test Detallados

### Lo que el Backend Hará:

```
1. Recibir: 100 USD
   ↓
2. Conectar a Ethereum Mainnet (Alchemy RPC)
   ↓
3. Obtener precio USD/USDT del Oráculo Chainlink
   ↓
4. Calcular: 100 * 0.99 = 99 USDT (1% comisión)
   ↓
5. Verificar balance USDT del signer
   ↓
6. Ejecutar transfer() en contrato USDT real
   ↓
7. Esperar confirmación en blockchain
   ↓
8. Retornar TX Hash + Etherscan Link
```

## ✅ Checklist

- [ ] Servidor iniciado en puerto 3000
- [ ] `.env` configurado con credenciales
- [ ] ETH_RPC_URL válido en `.env`
- [ ] ETH_PRIVATE_KEY válido en `.env`
- [ ] Signer tiene ETH para gas
- [ ] Signer tiene USDT (mínimo 99 USDT para 100 USD)

## 📊 Métricas del Test

| Métrica | Valor |
|---------|-------|
| Cantidad USD | 100 |
| Comisión | 1% |
| USDT Esperados | 99 |
| Red | Ethereum Mainnet |
| Confirmación | 1 bloque |
| Gas Fee | ~65,000 gas |
| Tiempo Esperado | 30-60 segundos |

## 🔍 Verificación en Blockchain

Después de obtener el TX Hash, verifica en:
```
https://etherscan.io/tx/[TX_HASH]
```

Deberías ver:
- Status: ✅ Success
- From: [Dirección del Signer]
- To: [Dirección del USDT Contract]
- Function: transfer()
- Value: 99,000,000 (99 USDT con 6 decimales)

## 📚 Documentación Relacionada

- `USDT_MINTER_GUIA_COMPLETA.md` - Guía del USDT Minter
- `server/routes/uniswap-routes.js` - Código del bridge
- `src/components/DeFiProtocolsModule.tsx` - Frontend del bridge

## 🚀 Siguiente Paso

Después de confirmar que el test es exitoso:
1. Verificar TX en Etherscan
2. Comprobar que USDT llegó a la dirección
3. Revisar balance actualizado

¡Test listo para ejecutar! 🎉



## 📋 Pasos para Ejecutar el Test

### Paso 1: Iniciar el Servidor (en una terminal)
```bash
npm run dev:full
```

Esperar a que aparezca:
```
📍 Escuchando en http://localhost:3000
```

### Paso 2: En otra terminal, Ejecutar el Test (en otra terminal)

#### Opción A: Usando PowerShell (Windows)
```powershell
# Test simple
$response = curl.exe -s -X POST http://localhost:3000/api/uniswap/swap `
  -H "Content-Type: application/json" `
  -d '{
    "amount": 100,
    "recipientAddress": "0x05316B102FE62574b9cBd45709f8F1B6C00beC8a",
    "slippageTolerance": 1
  }'

$response
```

#### Opción B: Usando curl directo
```bash
curl -X POST http://localhost:3000/api/uniswap/swap \
  -H "Content-Type: application/json" \
  -d '{
    "amount": 100,
    "recipientAddress": "0x05316B102FE62574b9cBd45709f8F1B6C00beC8a",
    "slippageTolerance": 1
  }'
```

## 📊 Respuesta Esperada

### Éxito (200 OK):
```json
{
  "success": true,
  "type": "USD_USDT_BRIDGE_REAL_MAINNET",
  "network": "Ethereum Mainnet",
  "txHash": "0x...",
  "blockNumber": 19850123,
  "blockHash": "0x...",
  "gasUsed": "65000",
  "status": "SUCCESS",
  "amountUSD": 100,
  "amountUSDT": 99,
  "commission": 1,
  "recipient": "0x05316B102FE62574b9cBd45709f8F1B6C00beC8a",
  "decimals": 6,
  "contractAddress": "0xdAC17F958D2ee523a2206206994597C13D831ec7",
  "oraclePrice": 1.0001,
  "chainlinkFeed": "0x3E7d1eAB13ad0104d2750B8863b489D65364e32D",
  "etherscanUrl": "https://etherscan.io/tx/0x...",
  "timestamp": "2025-01-03T15:30:45.123Z",
  "real": true,
  "bridge_function": "transfer(address,uint256)",
  "message": "✅ BRIDGE REAL 100% COMPLETADO EN MAINNET: 100 USD → 99 USDT (Precio Oráculo: 1.0001)"
}
```

### Error (500 Internal Server Error):
```json
{
  "success": false,
  "type": "USD_USDT_BRIDGE_ERROR",
  "error": "Signer no tiene suficiente USDT",
  "details": {
    "signerAddress": "0x...",
    "balanceUSDAT": "0",
    "amountRequired": 99,
    "shortfall": 99
  }
}
```

## 🔍 Pasos del Test Detallados

### Lo que el Backend Hará:

```
1. Recibir: 100 USD
   ↓
2. Conectar a Ethereum Mainnet (Alchemy RPC)
   ↓
3. Obtener precio USD/USDT del Oráculo Chainlink
   ↓
4. Calcular: 100 * 0.99 = 99 USDT (1% comisión)
   ↓
5. Verificar balance USDT del signer
   ↓
6. Ejecutar transfer() en contrato USDT real
   ↓
7. Esperar confirmación en blockchain
   ↓
8. Retornar TX Hash + Etherscan Link
```

## ✅ Checklist

- [ ] Servidor iniciado en puerto 3000
- [ ] `.env` configurado con credenciales
- [ ] ETH_RPC_URL válido en `.env`
- [ ] ETH_PRIVATE_KEY válido en `.env`
- [ ] Signer tiene ETH para gas
- [ ] Signer tiene USDT (mínimo 99 USDT para 100 USD)

## 📊 Métricas del Test

| Métrica | Valor |
|---------|-------|
| Cantidad USD | 100 |
| Comisión | 1% |
| USDT Esperados | 99 |
| Red | Ethereum Mainnet |
| Confirmación | 1 bloque |
| Gas Fee | ~65,000 gas |
| Tiempo Esperado | 30-60 segundos |

## 🔍 Verificación en Blockchain

Después de obtener el TX Hash, verifica en:
```
https://etherscan.io/tx/[TX_HASH]
```

Deberías ver:
- Status: ✅ Success
- From: [Dirección del Signer]
- To: [Dirección del USDT Contract]
- Function: transfer()
- Value: 99,000,000 (99 USDT con 6 decimales)

## 📚 Documentación Relacionada

- `USDT_MINTER_GUIA_COMPLETA.md` - Guía del USDT Minter
- `server/routes/uniswap-routes.js` - Código del bridge
- `src/components/DeFiProtocolsModule.tsx` - Frontend del bridge

## 🚀 Siguiente Paso

Después de confirmar que el test es exitoso:
1. Verificar TX en Etherscan
2. Comprobar que USDT llegó a la dirección
3. Revisar balance actualizado

¡Test listo para ejecutar! 🎉



## 📋 Pasos para Ejecutar el Test

### Paso 1: Iniciar el Servidor (en una terminal)
```bash
npm run dev:full
```

Esperar a que aparezca:
```
📍 Escuchando en http://localhost:3000
```

### Paso 2: En otra terminal, Ejecutar el Test (en otra terminal)

#### Opción A: Usando PowerShell (Windows)
```powershell
# Test simple
$response = curl.exe -s -X POST http://localhost:3000/api/uniswap/swap `
  -H "Content-Type: application/json" `
  -d '{
    "amount": 100,
    "recipientAddress": "0x05316B102FE62574b9cBd45709f8F1B6C00beC8a",
    "slippageTolerance": 1
  }'

$response
```

#### Opción B: Usando curl directo
```bash
curl -X POST http://localhost:3000/api/uniswap/swap \
  -H "Content-Type: application/json" \
  -d '{
    "amount": 100,
    "recipientAddress": "0x05316B102FE62574b9cBd45709f8F1B6C00beC8a",
    "slippageTolerance": 1
  }'
```

## 📊 Respuesta Esperada

### Éxito (200 OK):
```json
{
  "success": true,
  "type": "USD_USDT_BRIDGE_REAL_MAINNET",
  "network": "Ethereum Mainnet",
  "txHash": "0x...",
  "blockNumber": 19850123,
  "blockHash": "0x...",
  "gasUsed": "65000",
  "status": "SUCCESS",
  "amountUSD": 100,
  "amountUSDT": 99,
  "commission": 1,
  "recipient": "0x05316B102FE62574b9cBd45709f8F1B6C00beC8a",
  "decimals": 6,
  "contractAddress": "0xdAC17F958D2ee523a2206206994597C13D831ec7",
  "oraclePrice": 1.0001,
  "chainlinkFeed": "0x3E7d1eAB13ad0104d2750B8863b489D65364e32D",
  "etherscanUrl": "https://etherscan.io/tx/0x...",
  "timestamp": "2025-01-03T15:30:45.123Z",
  "real": true,
  "bridge_function": "transfer(address,uint256)",
  "message": "✅ BRIDGE REAL 100% COMPLETADO EN MAINNET: 100 USD → 99 USDT (Precio Oráculo: 1.0001)"
}
```

### Error (500 Internal Server Error):
```json
{
  "success": false,
  "type": "USD_USDT_BRIDGE_ERROR",
  "error": "Signer no tiene suficiente USDT",
  "details": {
    "signerAddress": "0x...",
    "balanceUSDAT": "0",
    "amountRequired": 99,
    "shortfall": 99
  }
}
```

## 🔍 Pasos del Test Detallados

### Lo que el Backend Hará:

```
1. Recibir: 100 USD
   ↓
2. Conectar a Ethereum Mainnet (Alchemy RPC)
   ↓
3. Obtener precio USD/USDT del Oráculo Chainlink
   ↓
4. Calcular: 100 * 0.99 = 99 USDT (1% comisión)
   ↓
5. Verificar balance USDT del signer
   ↓
6. Ejecutar transfer() en contrato USDT real
   ↓
7. Esperar confirmación en blockchain
   ↓
8. Retornar TX Hash + Etherscan Link
```

## ✅ Checklist

- [ ] Servidor iniciado en puerto 3000
- [ ] `.env` configurado con credenciales
- [ ] ETH_RPC_URL válido en `.env`
- [ ] ETH_PRIVATE_KEY válido en `.env`
- [ ] Signer tiene ETH para gas
- [ ] Signer tiene USDT (mínimo 99 USDT para 100 USD)

## 📊 Métricas del Test

| Métrica | Valor |
|---------|-------|
| Cantidad USD | 100 |
| Comisión | 1% |
| USDT Esperados | 99 |
| Red | Ethereum Mainnet |
| Confirmación | 1 bloque |
| Gas Fee | ~65,000 gas |
| Tiempo Esperado | 30-60 segundos |

## 🔍 Verificación en Blockchain

Después de obtener el TX Hash, verifica en:
```
https://etherscan.io/tx/[TX_HASH]
```

Deberías ver:
- Status: ✅ Success
- From: [Dirección del Signer]
- To: [Dirección del USDT Contract]
- Function: transfer()
- Value: 99,000,000 (99 USDT con 6 decimales)

## 📚 Documentación Relacionada

- `USDT_MINTER_GUIA_COMPLETA.md` - Guía del USDT Minter
- `server/routes/uniswap-routes.js` - Código del bridge
- `src/components/DeFiProtocolsModule.tsx` - Frontend del bridge

## 🚀 Siguiente Paso

Después de confirmar que el test es exitoso:
1. Verificar TX en Etherscan
2. Comprobar que USDT llegó a la dirección
3. Revisar balance actualizado

¡Test listo para ejecutar! 🎉



## 📋 Pasos para Ejecutar el Test

### Paso 1: Iniciar el Servidor (en una terminal)
```bash
npm run dev:full
```

Esperar a que aparezca:
```
📍 Escuchando en http://localhost:3000
```

### Paso 2: En otra terminal, Ejecutar el Test (en otra terminal)

#### Opción A: Usando PowerShell (Windows)
```powershell
# Test simple
$response = curl.exe -s -X POST http://localhost:3000/api/uniswap/swap `
  -H "Content-Type: application/json" `
  -d '{
    "amount": 100,
    "recipientAddress": "0x05316B102FE62574b9cBd45709f8F1B6C00beC8a",
    "slippageTolerance": 1
  }'

$response
```

#### Opción B: Usando curl directo
```bash
curl -X POST http://localhost:3000/api/uniswap/swap \
  -H "Content-Type: application/json" \
  -d '{
    "amount": 100,
    "recipientAddress": "0x05316B102FE62574b9cBd45709f8F1B6C00beC8a",
    "slippageTolerance": 1
  }'
```

## 📊 Respuesta Esperada

### Éxito (200 OK):
```json
{
  "success": true,
  "type": "USD_USDT_BRIDGE_REAL_MAINNET",
  "network": "Ethereum Mainnet",
  "txHash": "0x...",
  "blockNumber": 19850123,
  "blockHash": "0x...",
  "gasUsed": "65000",
  "status": "SUCCESS",
  "amountUSD": 100,
  "amountUSDT": 99,
  "commission": 1,
  "recipient": "0x05316B102FE62574b9cBd45709f8F1B6C00beC8a",
  "decimals": 6,
  "contractAddress": "0xdAC17F958D2ee523a2206206994597C13D831ec7",
  "oraclePrice": 1.0001,
  "chainlinkFeed": "0x3E7d1eAB13ad0104d2750B8863b489D65364e32D",
  "etherscanUrl": "https://etherscan.io/tx/0x...",
  "timestamp": "2025-01-03T15:30:45.123Z",
  "real": true,
  "bridge_function": "transfer(address,uint256)",
  "message": "✅ BRIDGE REAL 100% COMPLETADO EN MAINNET: 100 USD → 99 USDT (Precio Oráculo: 1.0001)"
}
```

### Error (500 Internal Server Error):
```json
{
  "success": false,
  "type": "USD_USDT_BRIDGE_ERROR",
  "error": "Signer no tiene suficiente USDT",
  "details": {
    "signerAddress": "0x...",
    "balanceUSDAT": "0",
    "amountRequired": 99,
    "shortfall": 99
  }
}
```

## 🔍 Pasos del Test Detallados

### Lo que el Backend Hará:

```
1. Recibir: 100 USD
   ↓
2. Conectar a Ethereum Mainnet (Alchemy RPC)
   ↓
3. Obtener precio USD/USDT del Oráculo Chainlink
   ↓
4. Calcular: 100 * 0.99 = 99 USDT (1% comisión)
   ↓
5. Verificar balance USDT del signer
   ↓
6. Ejecutar transfer() en contrato USDT real
   ↓
7. Esperar confirmación en blockchain
   ↓
8. Retornar TX Hash + Etherscan Link
```

## ✅ Checklist

- [ ] Servidor iniciado en puerto 3000
- [ ] `.env` configurado con credenciales
- [ ] ETH_RPC_URL válido en `.env`
- [ ] ETH_PRIVATE_KEY válido en `.env`
- [ ] Signer tiene ETH para gas
- [ ] Signer tiene USDT (mínimo 99 USDT para 100 USD)

## 📊 Métricas del Test

| Métrica | Valor |
|---------|-------|
| Cantidad USD | 100 |
| Comisión | 1% |
| USDT Esperados | 99 |
| Red | Ethereum Mainnet |
| Confirmación | 1 bloque |
| Gas Fee | ~65,000 gas |
| Tiempo Esperado | 30-60 segundos |

## 🔍 Verificación en Blockchain

Después de obtener el TX Hash, verifica en:
```
https://etherscan.io/tx/[TX_HASH]
```

Deberías ver:
- Status: ✅ Success
- From: [Dirección del Signer]
- To: [Dirección del USDT Contract]
- Function: transfer()
- Value: 99,000,000 (99 USDT con 6 decimales)

## 📚 Documentación Relacionada

- `USDT_MINTER_GUIA_COMPLETA.md` - Guía del USDT Minter
- `server/routes/uniswap-routes.js` - Código del bridge
- `src/components/DeFiProtocolsModule.tsx` - Frontend del bridge

## 🚀 Siguiente Paso

Después de confirmar que el test es exitoso:
1. Verificar TX en Etherscan
2. Comprobar que USDT llegó a la dirección
3. Revisar balance actualizado

¡Test listo para ejecutar! 🎉



## 📋 Pasos para Ejecutar el Test

### Paso 1: Iniciar el Servidor (en una terminal)
```bash
npm run dev:full
```

Esperar a que aparezca:
```
📍 Escuchando en http://localhost:3000
```

### Paso 2: En otra terminal, Ejecutar el Test (en otra terminal)

#### Opción A: Usando PowerShell (Windows)
```powershell
# Test simple
$response = curl.exe -s -X POST http://localhost:3000/api/uniswap/swap `
  -H "Content-Type: application/json" `
  -d '{
    "amount": 100,
    "recipientAddress": "0x05316B102FE62574b9cBd45709f8F1B6C00beC8a",
    "slippageTolerance": 1
  }'

$response
```

#### Opción B: Usando curl directo
```bash
curl -X POST http://localhost:3000/api/uniswap/swap \
  -H "Content-Type: application/json" \
  -d '{
    "amount": 100,
    "recipientAddress": "0x05316B102FE62574b9cBd45709f8F1B6C00beC8a",
    "slippageTolerance": 1
  }'
```

## 📊 Respuesta Esperada

### Éxito (200 OK):
```json
{
  "success": true,
  "type": "USD_USDT_BRIDGE_REAL_MAINNET",
  "network": "Ethereum Mainnet",
  "txHash": "0x...",
  "blockNumber": 19850123,
  "blockHash": "0x...",
  "gasUsed": "65000",
  "status": "SUCCESS",
  "amountUSD": 100,
  "amountUSDT": 99,
  "commission": 1,
  "recipient": "0x05316B102FE62574b9cBd45709f8F1B6C00beC8a",
  "decimals": 6,
  "contractAddress": "0xdAC17F958D2ee523a2206206994597C13D831ec7",
  "oraclePrice": 1.0001,
  "chainlinkFeed": "0x3E7d1eAB13ad0104d2750B8863b489D65364e32D",
  "etherscanUrl": "https://etherscan.io/tx/0x...",
  "timestamp": "2025-01-03T15:30:45.123Z",
  "real": true,
  "bridge_function": "transfer(address,uint256)",
  "message": "✅ BRIDGE REAL 100% COMPLETADO EN MAINNET: 100 USD → 99 USDT (Precio Oráculo: 1.0001)"
}
```

### Error (500 Internal Server Error):
```json
{
  "success": false,
  "type": "USD_USDT_BRIDGE_ERROR",
  "error": "Signer no tiene suficiente USDT",
  "details": {
    "signerAddress": "0x...",
    "balanceUSDAT": "0",
    "amountRequired": 99,
    "shortfall": 99
  }
}
```

## 🔍 Pasos del Test Detallados

### Lo que el Backend Hará:

```
1. Recibir: 100 USD
   ↓
2. Conectar a Ethereum Mainnet (Alchemy RPC)
   ↓
3. Obtener precio USD/USDT del Oráculo Chainlink
   ↓
4. Calcular: 100 * 0.99 = 99 USDT (1% comisión)
   ↓
5. Verificar balance USDT del signer
   ↓
6. Ejecutar transfer() en contrato USDT real
   ↓
7. Esperar confirmación en blockchain
   ↓
8. Retornar TX Hash + Etherscan Link
```

## ✅ Checklist

- [ ] Servidor iniciado en puerto 3000
- [ ] `.env` configurado con credenciales
- [ ] ETH_RPC_URL válido en `.env`
- [ ] ETH_PRIVATE_KEY válido en `.env`
- [ ] Signer tiene ETH para gas
- [ ] Signer tiene USDT (mínimo 99 USDT para 100 USD)

## 📊 Métricas del Test

| Métrica | Valor |
|---------|-------|
| Cantidad USD | 100 |
| Comisión | 1% |
| USDT Esperados | 99 |
| Red | Ethereum Mainnet |
| Confirmación | 1 bloque |
| Gas Fee | ~65,000 gas |
| Tiempo Esperado | 30-60 segundos |

## 🔍 Verificación en Blockchain

Después de obtener el TX Hash, verifica en:
```
https://etherscan.io/tx/[TX_HASH]
```

Deberías ver:
- Status: ✅ Success
- From: [Dirección del Signer]
- To: [Dirección del USDT Contract]
- Function: transfer()
- Value: 99,000,000 (99 USDT con 6 decimales)

## 📚 Documentación Relacionada

- `USDT_MINTER_GUIA_COMPLETA.md` - Guía del USDT Minter
- `server/routes/uniswap-routes.js` - Código del bridge
- `src/components/DeFiProtocolsModule.tsx` - Frontend del bridge

## 🚀 Siguiente Paso

Después de confirmar que el test es exitoso:
1. Verificar TX en Etherscan
2. Comprobar que USDT llegó a la dirección
3. Revisar balance actualizado

¡Test listo para ejecutar! 🎉



## 📋 Pasos para Ejecutar el Test

### Paso 1: Iniciar el Servidor (en una terminal)
```bash
npm run dev:full
```

Esperar a que aparezca:
```
📍 Escuchando en http://localhost:3000
```

### Paso 2: En otra terminal, Ejecutar el Test (en otra terminal)

#### Opción A: Usando PowerShell (Windows)
```powershell
# Test simple
$response = curl.exe -s -X POST http://localhost:3000/api/uniswap/swap `
  -H "Content-Type: application/json" `
  -d '{
    "amount": 100,
    "recipientAddress": "0x05316B102FE62574b9cBd45709f8F1B6C00beC8a",
    "slippageTolerance": 1
  }'

$response
```

#### Opción B: Usando curl directo
```bash
curl -X POST http://localhost:3000/api/uniswap/swap \
  -H "Content-Type: application/json" \
  -d '{
    "amount": 100,
    "recipientAddress": "0x05316B102FE62574b9cBd45709f8F1B6C00beC8a",
    "slippageTolerance": 1
  }'
```

## 📊 Respuesta Esperada

### Éxito (200 OK):
```json
{
  "success": true,
  "type": "USD_USDT_BRIDGE_REAL_MAINNET",
  "network": "Ethereum Mainnet",
  "txHash": "0x...",
  "blockNumber": 19850123,
  "blockHash": "0x...",
  "gasUsed": "65000",
  "status": "SUCCESS",
  "amountUSD": 100,
  "amountUSDT": 99,
  "commission": 1,
  "recipient": "0x05316B102FE62574b9cBd45709f8F1B6C00beC8a",
  "decimals": 6,
  "contractAddress": "0xdAC17F958D2ee523a2206206994597C13D831ec7",
  "oraclePrice": 1.0001,
  "chainlinkFeed": "0x3E7d1eAB13ad0104d2750B8863b489D65364e32D",
  "etherscanUrl": "https://etherscan.io/tx/0x...",
  "timestamp": "2025-01-03T15:30:45.123Z",
  "real": true,
  "bridge_function": "transfer(address,uint256)",
  "message": "✅ BRIDGE REAL 100% COMPLETADO EN MAINNET: 100 USD → 99 USDT (Precio Oráculo: 1.0001)"
}
```

### Error (500 Internal Server Error):
```json
{
  "success": false,
  "type": "USD_USDT_BRIDGE_ERROR",
  "error": "Signer no tiene suficiente USDT",
  "details": {
    "signerAddress": "0x...",
    "balanceUSDAT": "0",
    "amountRequired": 99,
    "shortfall": 99
  }
}
```

## 🔍 Pasos del Test Detallados

### Lo que el Backend Hará:

```
1. Recibir: 100 USD
   ↓
2. Conectar a Ethereum Mainnet (Alchemy RPC)
   ↓
3. Obtener precio USD/USDT del Oráculo Chainlink
   ↓
4. Calcular: 100 * 0.99 = 99 USDT (1% comisión)
   ↓
5. Verificar balance USDT del signer
   ↓
6. Ejecutar transfer() en contrato USDT real
   ↓
7. Esperar confirmación en blockchain
   ↓
8. Retornar TX Hash + Etherscan Link
```

## ✅ Checklist

- [ ] Servidor iniciado en puerto 3000
- [ ] `.env` configurado con credenciales
- [ ] ETH_RPC_URL válido en `.env`
- [ ] ETH_PRIVATE_KEY válido en `.env`
- [ ] Signer tiene ETH para gas
- [ ] Signer tiene USDT (mínimo 99 USDT para 100 USD)

## 📊 Métricas del Test

| Métrica | Valor |
|---------|-------|
| Cantidad USD | 100 |
| Comisión | 1% |
| USDT Esperados | 99 |
| Red | Ethereum Mainnet |
| Confirmación | 1 bloque |
| Gas Fee | ~65,000 gas |
| Tiempo Esperado | 30-60 segundos |

## 🔍 Verificación en Blockchain

Después de obtener el TX Hash, verifica en:
```
https://etherscan.io/tx/[TX_HASH]
```

Deberías ver:
- Status: ✅ Success
- From: [Dirección del Signer]
- To: [Dirección del USDT Contract]
- Function: transfer()
- Value: 99,000,000 (99 USDT con 6 decimales)

## 📚 Documentación Relacionada

- `USDT_MINTER_GUIA_COMPLETA.md` - Guía del USDT Minter
- `server/routes/uniswap-routes.js` - Código del bridge
- `src/components/DeFiProtocolsModule.tsx` - Frontend del bridge

## 🚀 Siguiente Paso

Después de confirmar que el test es exitoso:
1. Verificar TX en Etherscan
2. Comprobar que USDT llegó a la dirección
3. Revisar balance actualizado

¡Test listo para ejecutar! 🎉



## 📋 Pasos para Ejecutar el Test

### Paso 1: Iniciar el Servidor (en una terminal)
```bash
npm run dev:full
```

Esperar a que aparezca:
```
📍 Escuchando en http://localhost:3000
```

### Paso 2: En otra terminal, Ejecutar el Test (en otra terminal)

#### Opción A: Usando PowerShell (Windows)
```powershell
# Test simple
$response = curl.exe -s -X POST http://localhost:3000/api/uniswap/swap `
  -H "Content-Type: application/json" `
  -d '{
    "amount": 100,
    "recipientAddress": "0x05316B102FE62574b9cBd45709f8F1B6C00beC8a",
    "slippageTolerance": 1
  }'

$response
```

#### Opción B: Usando curl directo
```bash
curl -X POST http://localhost:3000/api/uniswap/swap \
  -H "Content-Type: application/json" \
  -d '{
    "amount": 100,
    "recipientAddress": "0x05316B102FE62574b9cBd45709f8F1B6C00beC8a",
    "slippageTolerance": 1
  }'
```

## 📊 Respuesta Esperada

### Éxito (200 OK):
```json
{
  "success": true,
  "type": "USD_USDT_BRIDGE_REAL_MAINNET",
  "network": "Ethereum Mainnet",
  "txHash": "0x...",
  "blockNumber": 19850123,
  "blockHash": "0x...",
  "gasUsed": "65000",
  "status": "SUCCESS",
  "amountUSD": 100,
  "amountUSDT": 99,
  "commission": 1,
  "recipient": "0x05316B102FE62574b9cBd45709f8F1B6C00beC8a",
  "decimals": 6,
  "contractAddress": "0xdAC17F958D2ee523a2206206994597C13D831ec7",
  "oraclePrice": 1.0001,
  "chainlinkFeed": "0x3E7d1eAB13ad0104d2750B8863b489D65364e32D",
  "etherscanUrl": "https://etherscan.io/tx/0x...",
  "timestamp": "2025-01-03T15:30:45.123Z",
  "real": true,
  "bridge_function": "transfer(address,uint256)",
  "message": "✅ BRIDGE REAL 100% COMPLETADO EN MAINNET: 100 USD → 99 USDT (Precio Oráculo: 1.0001)"
}
```

### Error (500 Internal Server Error):
```json
{
  "success": false,
  "type": "USD_USDT_BRIDGE_ERROR",
  "error": "Signer no tiene suficiente USDT",
  "details": {
    "signerAddress": "0x...",
    "balanceUSDAT": "0",
    "amountRequired": 99,
    "shortfall": 99
  }
}
```

## 🔍 Pasos del Test Detallados

### Lo que el Backend Hará:

```
1. Recibir: 100 USD
   ↓
2. Conectar a Ethereum Mainnet (Alchemy RPC)
   ↓
3. Obtener precio USD/USDT del Oráculo Chainlink
   ↓
4. Calcular: 100 * 0.99 = 99 USDT (1% comisión)
   ↓
5. Verificar balance USDT del signer
   ↓
6. Ejecutar transfer() en contrato USDT real
   ↓
7. Esperar confirmación en blockchain
   ↓
8. Retornar TX Hash + Etherscan Link
```

## ✅ Checklist

- [ ] Servidor iniciado en puerto 3000
- [ ] `.env` configurado con credenciales
- [ ] ETH_RPC_URL válido en `.env`
- [ ] ETH_PRIVATE_KEY válido en `.env`
- [ ] Signer tiene ETH para gas
- [ ] Signer tiene USDT (mínimo 99 USDT para 100 USD)

## 📊 Métricas del Test

| Métrica | Valor |
|---------|-------|
| Cantidad USD | 100 |
| Comisión | 1% |
| USDT Esperados | 99 |
| Red | Ethereum Mainnet |
| Confirmación | 1 bloque |
| Gas Fee | ~65,000 gas |
| Tiempo Esperado | 30-60 segundos |

## 🔍 Verificación en Blockchain

Después de obtener el TX Hash, verifica en:
```
https://etherscan.io/tx/[TX_HASH]
```

Deberías ver:
- Status: ✅ Success
- From: [Dirección del Signer]
- To: [Dirección del USDT Contract]
- Function: transfer()
- Value: 99,000,000 (99 USDT con 6 decimales)

## 📚 Documentación Relacionada

- `USDT_MINTER_GUIA_COMPLETA.md` - Guía del USDT Minter
- `server/routes/uniswap-routes.js` - Código del bridge
- `src/components/DeFiProtocolsModule.tsx` - Frontend del bridge

## 🚀 Siguiente Paso

Después de confirmar que el test es exitoso:
1. Verificar TX en Etherscan
2. Comprobar que USDT llegó a la dirección
3. Revisar balance actualizado

¡Test listo para ejecutar! 🎉





