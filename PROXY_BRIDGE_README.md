# 🌉 USDT Proxy Bridge - Guía Completa

## Overview

El **USDT Proxy Bridge** es un contrato inteligente desplegado en Ethereum Mainnet que actúa como intermediario para ejecutar operaciones de bridge USD → USDT de forma segura y confiable.

El proxy clona la funcionalidad del contrato USDT real y ejecuta órdenes bridge contra el contrato original de USDT en `0xdAC17F958D2ee523a2206206994597C13D831ec7`.

---

## Estructura del Proyecto

```
server/
├── contracts/
│   └── USDTProxyBridge.sol          # Smart Contract del Proxy
├── scripts/
│   ├── deployUSDTProxy.js            # Script de deployment
│   └── deploymentInfo.json           # Info del deployment
├── routes/
│   ├── uniswap-routes.js             # Rutas originales USD → USDT
│   └── proxy-bridge-routes.js        # Rutas del Proxy Bridge
└── index.js                          # Servidor registra las rutas
```

---

## 🚀 Deployment del Contrato Proxy

### Paso 1: Ejecutar el Script de Deployment

```bash
cd server/scripts
node deployUSDTProxy.js
```

**Output esperado:**
```
🚀 [DEPLOYMENT] Iniciando deployment del USDT Proxy Bridge...
📍 Wallet: 0x05316B102FE62574b9cBd45709f8F1B6C00beC8a
🔗 Red: Ethereum Mainnet
⛽ Gas Price: 45.5 gwei
💰 Balance ETH: 0.083406692820180184

📦 Compilando contrato...
🔨 Desplegando contrato...
📝 TX Hash: 0x...

✅ [SUCCESS] Contrato desplegado exitosamente!
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📍 Dirección del Proxy: 0x1234567890123456789012345678901234567890
🔗 Etherscan: https://etherscan.io/address/0x1234567890123456789012345678901234567890
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

💾 Información guardada en: ./server/scripts/deploymentInfo.json
```

### Paso 2: Guardar la Dirección del Proxy

La dirección se guarda automáticamente en `deploymentInfo.json`. Úsala para las siguientes operaciones.

---

## 📊 API Endpoints

### 1. Emitir USD → USDT via Proxy

**Endpoint:** `POST /api/bridge/proxy/emit-usd-to-usdt`

**Body:**
```json
{
  "amount": 100,
  "recipientAddress": "0x05316B102FE62574b9cBd45709f8F1B6C00beC8a",
  "proxyAddress": "0x1234567890123456789012345678901234567890"
}
```

**Response Exitosa:**
```json
{
  "success": true,
  "type": "USD_TO_USDT_PROXY_BRIDGE_SUCCESS",
  "network": "Ethereum Mainnet",
  "mode": "PROXY_BRIDGE_EMISSION",
  "message": "✅ 100 USD convertidos a 100 USDT via Proxy Bridge",
  "emission": {
    "method": "Proxy -> bridgeTransfer() -> USDT.transfer()",
    "type": "USD→USDT Proxy Bridge Emission",
    "amountUSD": 100,
    "amountUSDT": 100,
    "from": "DAES Bank Proxy",
    "to": "0x05316B102FE62574b9cBd45709f8F1B6C00beC8a",
    "proxyAddress": "0x1234567890123456789012345678901234567890"
  },
  "transaction": {
    "hash": "0x...",
    "blockNumber": 21400000,
    "status": "Success ✓",
    "gasUsed": "95000",
    "gasPrice": "45.5 Gwei",
    "transactionFee": "0.004337 ETH"
  },
  "etherscan": {
    "transaction": "https://etherscan.io/tx/0x...",
    "proxy": "https://etherscan.io/address/0x...",
    "usdt": "https://etherscan.io/token/0xdAC17F958D2ee523a2206206994597C13D831ec7",
    "recipient": "https://etherscan.io/address/0x05316B102FE62574b9cBd45709f8F1B6C00beC8a"
  }
}
```

### 2. Obtener Estado del Proxy

**Endpoint:** `GET /api/bridge/proxy/status/:proxyAddress`

**Response:**
```json
{
  "success": true,
  "proxyAddress": "0x1234567890123456789012345678901234567890",
  "proxyBalance": "1000.000000 USDT",
  "usdtName": "Tether USD",
  "usdtSymbol": "USDT",
  "usdtDecimals": 6,
  "totalSupply": "42814054742.826869 USDT"
}
```

---

## 🔐 Métodos del Smart Contract

### 1. `bridgeTransfer(address _to, uint256 _amount)`

Transfiere USDT desde el signer al destinatario mediante el proxy.

```solidity
// Ejemplo de uso
proxyContract.bridgeTransfer(
  "0x05316B102FE62574b9cBd45709f8F1B6C00beC8a",
  ethers.parseUnits("100", 6) // 100 USDT
);
```

### 2. `bridgeTransferFrom(address _from, address _to, uint256 _amount)`

Transfiere USDT desde una dirección específica al destinatario.

```solidity
proxyContract.bridgeTransferFrom(
  "0x...", // dirección origen
  "0x05316B102FE62574b9cBd45709f8F1B6C00beC8a",
  ethers.parseUnits("100", 6)
);
```

### 3. `bridgeApprove(address _spender, uint256 _amount)`

Aprueba que una dirección gaste USDT.

```solidity
proxyContract.bridgeApprove(
  "0x...", // spender
  ethers.parseUnits("100", 6)
);
```

### 4. `ownerIssue(address _to, uint256 _amount)`

Emite USDT como owner del proxy (requiere permisos de owner).

```solidity
proxyContract.ownerIssue(
  "0x05316B102FE62574b9cBd45709f8F1B6C00beC8a",
  ethers.parseUnits("100", 6)
);
```

### 5. `ownerBatchTransfer(address[] calldata _recipients, uint256[] calldata _amounts)`

Transfiere USDT a múltiples destinatarios en una sola transacción.

```solidity
proxyContract.ownerBatchTransfer(
  ["0x...", "0x...", "0x..."],
  [
    ethers.parseUnits("100", 6),
    ethers.parseUnits("200", 6),
    ethers.parseUnits("300", 6)
  ]
);
```

---

## 📋 Métodos View (Solo Lectura)

### 1. `getBalance()`

Obtiene el balance de USDT del proxy.

### 2. `getBalanceOf(address _account)`

Obtiene el balance de USDT de una dirección específica.

### 3. `getTotalSupply()`

Obtiene el total supply de USDT.

### 4. `getDecimals()`

Obtiene la cantidad de decimales de USDT (normalmente 6).

### 5. `getUSDTInfo()`

Obtiene información del contrato USDT (nombre, símbolo, decimales).

---

## 🔄 Flujo de Operación

```
[Frontend]
    ↓
[POST /api/bridge/proxy/emit-usd-to-usdt]
    ↓
[Backend Node.js]
    ↓
[Conecta al Proxy Contract]
    ↓
[Ejecuta bridgeTransfer(recipient, amount)]
    ↓
[Proxy llama a USDT.transfer(recipient, amount)]
    ↓
[Contrato USDT ejecuta la transferencia]
    ↓
[Confirmación en blockchain]
    ↓
[Respuesta con TX Hash y Etherscan]
```

---

## 💡 Ventajas del Proxy

1. **Seguridad**: El proxy actúa como intermediario confiable
2. **Flexibilidad**: Soporta múltiples métodos de transferencia
3. **Batch Operations**: Puede ejecutar múltiples transferencias en una sola TX
4. **Auditoría**: Todos los eventos se registran en blockchain
5. **Escalabilidad**: Diseñado para operaciones de alto volumen

---

## ⚠️ Consideraciones Importantes

1. **Gas Fees**: Cada transacción consume gas en Ethereum Mainnet
2. **Balance de USDT**: El proxy debe tener USDT para transferir
3. **Aprobaciones**: Para `transferFrom`, el proxy necesita aprobación previa
4. **Owner Context**: Solo el owner del proxy puede ejecutar `ownerIssue`
5. **Confirmaciones**: Se espera 1 confirmación de blockchain por defecto

---

## 🛠️ Troubleshooting

### Error: "Saldo insuficiente en proxy"

**Solución**: Asegúrate de que el proxy tenga USDT. Deposita USDT en la dirección del proxy.

### Error: "Dirección inválida"

**Solución**: Verifica que las direcciones tengan formato válido (0x...).

### Error: "Aprobación requerida"

**Solución**: Ejecuta `bridgeApprove` primero para dar permisos de gasto.

### TX Lenta

**Solución**: Verifica el gas price. Puedes usar un gas price más alto en caso de congestión.

---

## 📞 Soporte

Para más información contacta a:
- `info@digcommbank.com`
- `operations@digcommbank.com`

---

## 📄 Licencia

Este proyecto usa SPDX-License-Identifier: MIT



## Overview

El **USDT Proxy Bridge** es un contrato inteligente desplegado en Ethereum Mainnet que actúa como intermediario para ejecutar operaciones de bridge USD → USDT de forma segura y confiable.

El proxy clona la funcionalidad del contrato USDT real y ejecuta órdenes bridge contra el contrato original de USDT en `0xdAC17F958D2ee523a2206206994597C13D831ec7`.

---

## Estructura del Proyecto

```
server/
├── contracts/
│   └── USDTProxyBridge.sol          # Smart Contract del Proxy
├── scripts/
│   ├── deployUSDTProxy.js            # Script de deployment
│   └── deploymentInfo.json           # Info del deployment
├── routes/
│   ├── uniswap-routes.js             # Rutas originales USD → USDT
│   └── proxy-bridge-routes.js        # Rutas del Proxy Bridge
└── index.js                          # Servidor registra las rutas
```

---

## 🚀 Deployment del Contrato Proxy

### Paso 1: Ejecutar el Script de Deployment

```bash
cd server/scripts
node deployUSDTProxy.js
```

**Output esperado:**
```
🚀 [DEPLOYMENT] Iniciando deployment del USDT Proxy Bridge...
📍 Wallet: 0x05316B102FE62574b9cBd45709f8F1B6C00beC8a
🔗 Red: Ethereum Mainnet
⛽ Gas Price: 45.5 gwei
💰 Balance ETH: 0.083406692820180184

📦 Compilando contrato...
🔨 Desplegando contrato...
📝 TX Hash: 0x...

✅ [SUCCESS] Contrato desplegado exitosamente!
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📍 Dirección del Proxy: 0x1234567890123456789012345678901234567890
🔗 Etherscan: https://etherscan.io/address/0x1234567890123456789012345678901234567890
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

💾 Información guardada en: ./server/scripts/deploymentInfo.json
```

### Paso 2: Guardar la Dirección del Proxy

La dirección se guarda automáticamente en `deploymentInfo.json`. Úsala para las siguientes operaciones.

---

## 📊 API Endpoints

### 1. Emitir USD → USDT via Proxy

**Endpoint:** `POST /api/bridge/proxy/emit-usd-to-usdt`

**Body:**
```json
{
  "amount": 100,
  "recipientAddress": "0x05316B102FE62574b9cBd45709f8F1B6C00beC8a",
  "proxyAddress": "0x1234567890123456789012345678901234567890"
}
```

**Response Exitosa:**
```json
{
  "success": true,
  "type": "USD_TO_USDT_PROXY_BRIDGE_SUCCESS",
  "network": "Ethereum Mainnet",
  "mode": "PROXY_BRIDGE_EMISSION",
  "message": "✅ 100 USD convertidos a 100 USDT via Proxy Bridge",
  "emission": {
    "method": "Proxy -> bridgeTransfer() -> USDT.transfer()",
    "type": "USD→USDT Proxy Bridge Emission",
    "amountUSD": 100,
    "amountUSDT": 100,
    "from": "DAES Bank Proxy",
    "to": "0x05316B102FE62574b9cBd45709f8F1B6C00beC8a",
    "proxyAddress": "0x1234567890123456789012345678901234567890"
  },
  "transaction": {
    "hash": "0x...",
    "blockNumber": 21400000,
    "status": "Success ✓",
    "gasUsed": "95000",
    "gasPrice": "45.5 Gwei",
    "transactionFee": "0.004337 ETH"
  },
  "etherscan": {
    "transaction": "https://etherscan.io/tx/0x...",
    "proxy": "https://etherscan.io/address/0x...",
    "usdt": "https://etherscan.io/token/0xdAC17F958D2ee523a2206206994597C13D831ec7",
    "recipient": "https://etherscan.io/address/0x05316B102FE62574b9cBd45709f8F1B6C00beC8a"
  }
}
```

### 2. Obtener Estado del Proxy

**Endpoint:** `GET /api/bridge/proxy/status/:proxyAddress`

**Response:**
```json
{
  "success": true,
  "proxyAddress": "0x1234567890123456789012345678901234567890",
  "proxyBalance": "1000.000000 USDT",
  "usdtName": "Tether USD",
  "usdtSymbol": "USDT",
  "usdtDecimals": 6,
  "totalSupply": "42814054742.826869 USDT"
}
```

---

## 🔐 Métodos del Smart Contract

### 1. `bridgeTransfer(address _to, uint256 _amount)`

Transfiere USDT desde el signer al destinatario mediante el proxy.

```solidity
// Ejemplo de uso
proxyContract.bridgeTransfer(
  "0x05316B102FE62574b9cBd45709f8F1B6C00beC8a",
  ethers.parseUnits("100", 6) // 100 USDT
);
```

### 2. `bridgeTransferFrom(address _from, address _to, uint256 _amount)`

Transfiere USDT desde una dirección específica al destinatario.

```solidity
proxyContract.bridgeTransferFrom(
  "0x...", // dirección origen
  "0x05316B102FE62574b9cBd45709f8F1B6C00beC8a",
  ethers.parseUnits("100", 6)
);
```

### 3. `bridgeApprove(address _spender, uint256 _amount)`

Aprueba que una dirección gaste USDT.

```solidity
proxyContract.bridgeApprove(
  "0x...", // spender
  ethers.parseUnits("100", 6)
);
```

### 4. `ownerIssue(address _to, uint256 _amount)`

Emite USDT como owner del proxy (requiere permisos de owner).

```solidity
proxyContract.ownerIssue(
  "0x05316B102FE62574b9cBd45709f8F1B6C00beC8a",
  ethers.parseUnits("100", 6)
);
```

### 5. `ownerBatchTransfer(address[] calldata _recipients, uint256[] calldata _amounts)`

Transfiere USDT a múltiples destinatarios en una sola transacción.

```solidity
proxyContract.ownerBatchTransfer(
  ["0x...", "0x...", "0x..."],
  [
    ethers.parseUnits("100", 6),
    ethers.parseUnits("200", 6),
    ethers.parseUnits("300", 6)
  ]
);
```

---

## 📋 Métodos View (Solo Lectura)

### 1. `getBalance()`

Obtiene el balance de USDT del proxy.

### 2. `getBalanceOf(address _account)`

Obtiene el balance de USDT de una dirección específica.

### 3. `getTotalSupply()`

Obtiene el total supply de USDT.

### 4. `getDecimals()`

Obtiene la cantidad de decimales de USDT (normalmente 6).

### 5. `getUSDTInfo()`

Obtiene información del contrato USDT (nombre, símbolo, decimales).

---

## 🔄 Flujo de Operación

```
[Frontend]
    ↓
[POST /api/bridge/proxy/emit-usd-to-usdt]
    ↓
[Backend Node.js]
    ↓
[Conecta al Proxy Contract]
    ↓
[Ejecuta bridgeTransfer(recipient, amount)]
    ↓
[Proxy llama a USDT.transfer(recipient, amount)]
    ↓
[Contrato USDT ejecuta la transferencia]
    ↓
[Confirmación en blockchain]
    ↓
[Respuesta con TX Hash y Etherscan]
```

---

## 💡 Ventajas del Proxy

1. **Seguridad**: El proxy actúa como intermediario confiable
2. **Flexibilidad**: Soporta múltiples métodos de transferencia
3. **Batch Operations**: Puede ejecutar múltiples transferencias en una sola TX
4. **Auditoría**: Todos los eventos se registran en blockchain
5. **Escalabilidad**: Diseñado para operaciones de alto volumen

---

## ⚠️ Consideraciones Importantes

1. **Gas Fees**: Cada transacción consume gas en Ethereum Mainnet
2. **Balance de USDT**: El proxy debe tener USDT para transferir
3. **Aprobaciones**: Para `transferFrom`, el proxy necesita aprobación previa
4. **Owner Context**: Solo el owner del proxy puede ejecutar `ownerIssue`
5. **Confirmaciones**: Se espera 1 confirmación de blockchain por defecto

---

## 🛠️ Troubleshooting

### Error: "Saldo insuficiente en proxy"

**Solución**: Asegúrate de que el proxy tenga USDT. Deposita USDT en la dirección del proxy.

### Error: "Dirección inválida"

**Solución**: Verifica que las direcciones tengan formato válido (0x...).

### Error: "Aprobación requerida"

**Solución**: Ejecuta `bridgeApprove` primero para dar permisos de gasto.

### TX Lenta

**Solución**: Verifica el gas price. Puedes usar un gas price más alto en caso de congestión.

---

## 📞 Soporte

Para más información contacta a:
- `info@digcommbank.com`
- `operations@digcommbank.com`

---

## 📄 Licencia

Este proyecto usa SPDX-License-Identifier: MIT




## Overview

El **USDT Proxy Bridge** es un contrato inteligente desplegado en Ethereum Mainnet que actúa como intermediario para ejecutar operaciones de bridge USD → USDT de forma segura y confiable.

El proxy clona la funcionalidad del contrato USDT real y ejecuta órdenes bridge contra el contrato original de USDT en `0xdAC17F958D2ee523a2206206994597C13D831ec7`.

---

## Estructura del Proyecto

```
server/
├── contracts/
│   └── USDTProxyBridge.sol          # Smart Contract del Proxy
├── scripts/
│   ├── deployUSDTProxy.js            # Script de deployment
│   └── deploymentInfo.json           # Info del deployment
├── routes/
│   ├── uniswap-routes.js             # Rutas originales USD → USDT
│   └── proxy-bridge-routes.js        # Rutas del Proxy Bridge
└── index.js                          # Servidor registra las rutas
```

---

## 🚀 Deployment del Contrato Proxy

### Paso 1: Ejecutar el Script de Deployment

```bash
cd server/scripts
node deployUSDTProxy.js
```

**Output esperado:**
```
🚀 [DEPLOYMENT] Iniciando deployment del USDT Proxy Bridge...
📍 Wallet: 0x05316B102FE62574b9cBd45709f8F1B6C00beC8a
🔗 Red: Ethereum Mainnet
⛽ Gas Price: 45.5 gwei
💰 Balance ETH: 0.083406692820180184

📦 Compilando contrato...
🔨 Desplegando contrato...
📝 TX Hash: 0x...

✅ [SUCCESS] Contrato desplegado exitosamente!
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📍 Dirección del Proxy: 0x1234567890123456789012345678901234567890
🔗 Etherscan: https://etherscan.io/address/0x1234567890123456789012345678901234567890
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

💾 Información guardada en: ./server/scripts/deploymentInfo.json
```

### Paso 2: Guardar la Dirección del Proxy

La dirección se guarda automáticamente en `deploymentInfo.json`. Úsala para las siguientes operaciones.

---

## 📊 API Endpoints

### 1. Emitir USD → USDT via Proxy

**Endpoint:** `POST /api/bridge/proxy/emit-usd-to-usdt`

**Body:**
```json
{
  "amount": 100,
  "recipientAddress": "0x05316B102FE62574b9cBd45709f8F1B6C00beC8a",
  "proxyAddress": "0x1234567890123456789012345678901234567890"
}
```

**Response Exitosa:**
```json
{
  "success": true,
  "type": "USD_TO_USDT_PROXY_BRIDGE_SUCCESS",
  "network": "Ethereum Mainnet",
  "mode": "PROXY_BRIDGE_EMISSION",
  "message": "✅ 100 USD convertidos a 100 USDT via Proxy Bridge",
  "emission": {
    "method": "Proxy -> bridgeTransfer() -> USDT.transfer()",
    "type": "USD→USDT Proxy Bridge Emission",
    "amountUSD": 100,
    "amountUSDT": 100,
    "from": "DAES Bank Proxy",
    "to": "0x05316B102FE62574b9cBd45709f8F1B6C00beC8a",
    "proxyAddress": "0x1234567890123456789012345678901234567890"
  },
  "transaction": {
    "hash": "0x...",
    "blockNumber": 21400000,
    "status": "Success ✓",
    "gasUsed": "95000",
    "gasPrice": "45.5 Gwei",
    "transactionFee": "0.004337 ETH"
  },
  "etherscan": {
    "transaction": "https://etherscan.io/tx/0x...",
    "proxy": "https://etherscan.io/address/0x...",
    "usdt": "https://etherscan.io/token/0xdAC17F958D2ee523a2206206994597C13D831ec7",
    "recipient": "https://etherscan.io/address/0x05316B102FE62574b9cBd45709f8F1B6C00beC8a"
  }
}
```

### 2. Obtener Estado del Proxy

**Endpoint:** `GET /api/bridge/proxy/status/:proxyAddress`

**Response:**
```json
{
  "success": true,
  "proxyAddress": "0x1234567890123456789012345678901234567890",
  "proxyBalance": "1000.000000 USDT",
  "usdtName": "Tether USD",
  "usdtSymbol": "USDT",
  "usdtDecimals": 6,
  "totalSupply": "42814054742.826869 USDT"
}
```

---

## 🔐 Métodos del Smart Contract

### 1. `bridgeTransfer(address _to, uint256 _amount)`

Transfiere USDT desde el signer al destinatario mediante el proxy.

```solidity
// Ejemplo de uso
proxyContract.bridgeTransfer(
  "0x05316B102FE62574b9cBd45709f8F1B6C00beC8a",
  ethers.parseUnits("100", 6) // 100 USDT
);
```

### 2. `bridgeTransferFrom(address _from, address _to, uint256 _amount)`

Transfiere USDT desde una dirección específica al destinatario.

```solidity
proxyContract.bridgeTransferFrom(
  "0x...", // dirección origen
  "0x05316B102FE62574b9cBd45709f8F1B6C00beC8a",
  ethers.parseUnits("100", 6)
);
```

### 3. `bridgeApprove(address _spender, uint256 _amount)`

Aprueba que una dirección gaste USDT.

```solidity
proxyContract.bridgeApprove(
  "0x...", // spender
  ethers.parseUnits("100", 6)
);
```

### 4. `ownerIssue(address _to, uint256 _amount)`

Emite USDT como owner del proxy (requiere permisos de owner).

```solidity
proxyContract.ownerIssue(
  "0x05316B102FE62574b9cBd45709f8F1B6C00beC8a",
  ethers.parseUnits("100", 6)
);
```

### 5. `ownerBatchTransfer(address[] calldata _recipients, uint256[] calldata _amounts)`

Transfiere USDT a múltiples destinatarios en una sola transacción.

```solidity
proxyContract.ownerBatchTransfer(
  ["0x...", "0x...", "0x..."],
  [
    ethers.parseUnits("100", 6),
    ethers.parseUnits("200", 6),
    ethers.parseUnits("300", 6)
  ]
);
```

---

## 📋 Métodos View (Solo Lectura)

### 1. `getBalance()`

Obtiene el balance de USDT del proxy.

### 2. `getBalanceOf(address _account)`

Obtiene el balance de USDT de una dirección específica.

### 3. `getTotalSupply()`

Obtiene el total supply de USDT.

### 4. `getDecimals()`

Obtiene la cantidad de decimales de USDT (normalmente 6).

### 5. `getUSDTInfo()`

Obtiene información del contrato USDT (nombre, símbolo, decimales).

---

## 🔄 Flujo de Operación

```
[Frontend]
    ↓
[POST /api/bridge/proxy/emit-usd-to-usdt]
    ↓
[Backend Node.js]
    ↓
[Conecta al Proxy Contract]
    ↓
[Ejecuta bridgeTransfer(recipient, amount)]
    ↓
[Proxy llama a USDT.transfer(recipient, amount)]
    ↓
[Contrato USDT ejecuta la transferencia]
    ↓
[Confirmación en blockchain]
    ↓
[Respuesta con TX Hash y Etherscan]
```

---

## 💡 Ventajas del Proxy

1. **Seguridad**: El proxy actúa como intermediario confiable
2. **Flexibilidad**: Soporta múltiples métodos de transferencia
3. **Batch Operations**: Puede ejecutar múltiples transferencias en una sola TX
4. **Auditoría**: Todos los eventos se registran en blockchain
5. **Escalabilidad**: Diseñado para operaciones de alto volumen

---

## ⚠️ Consideraciones Importantes

1. **Gas Fees**: Cada transacción consume gas en Ethereum Mainnet
2. **Balance de USDT**: El proxy debe tener USDT para transferir
3. **Aprobaciones**: Para `transferFrom`, el proxy necesita aprobación previa
4. **Owner Context**: Solo el owner del proxy puede ejecutar `ownerIssue`
5. **Confirmaciones**: Se espera 1 confirmación de blockchain por defecto

---

## 🛠️ Troubleshooting

### Error: "Saldo insuficiente en proxy"

**Solución**: Asegúrate de que el proxy tenga USDT. Deposita USDT en la dirección del proxy.

### Error: "Dirección inválida"

**Solución**: Verifica que las direcciones tengan formato válido (0x...).

### Error: "Aprobación requerida"

**Solución**: Ejecuta `bridgeApprove` primero para dar permisos de gasto.

### TX Lenta

**Solución**: Verifica el gas price. Puedes usar un gas price más alto en caso de congestión.

---

## 📞 Soporte

Para más información contacta a:
- `info@digcommbank.com`
- `operations@digcommbank.com`

---

## 📄 Licencia

Este proyecto usa SPDX-License-Identifier: MIT



## Overview

El **USDT Proxy Bridge** es un contrato inteligente desplegado en Ethereum Mainnet que actúa como intermediario para ejecutar operaciones de bridge USD → USDT de forma segura y confiable.

El proxy clona la funcionalidad del contrato USDT real y ejecuta órdenes bridge contra el contrato original de USDT en `0xdAC17F958D2ee523a2206206994597C13D831ec7`.

---

## Estructura del Proyecto

```
server/
├── contracts/
│   └── USDTProxyBridge.sol          # Smart Contract del Proxy
├── scripts/
│   ├── deployUSDTProxy.js            # Script de deployment
│   └── deploymentInfo.json           # Info del deployment
├── routes/
│   ├── uniswap-routes.js             # Rutas originales USD → USDT
│   └── proxy-bridge-routes.js        # Rutas del Proxy Bridge
└── index.js                          # Servidor registra las rutas
```

---

## 🚀 Deployment del Contrato Proxy

### Paso 1: Ejecutar el Script de Deployment

```bash
cd server/scripts
node deployUSDTProxy.js
```

**Output esperado:**
```
🚀 [DEPLOYMENT] Iniciando deployment del USDT Proxy Bridge...
📍 Wallet: 0x05316B102FE62574b9cBd45709f8F1B6C00beC8a
🔗 Red: Ethereum Mainnet
⛽ Gas Price: 45.5 gwei
💰 Balance ETH: 0.083406692820180184

📦 Compilando contrato...
🔨 Desplegando contrato...
📝 TX Hash: 0x...

✅ [SUCCESS] Contrato desplegado exitosamente!
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📍 Dirección del Proxy: 0x1234567890123456789012345678901234567890
🔗 Etherscan: https://etherscan.io/address/0x1234567890123456789012345678901234567890
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

💾 Información guardada en: ./server/scripts/deploymentInfo.json
```

### Paso 2: Guardar la Dirección del Proxy

La dirección se guarda automáticamente en `deploymentInfo.json`. Úsala para las siguientes operaciones.

---

## 📊 API Endpoints

### 1. Emitir USD → USDT via Proxy

**Endpoint:** `POST /api/bridge/proxy/emit-usd-to-usdt`

**Body:**
```json
{
  "amount": 100,
  "recipientAddress": "0x05316B102FE62574b9cBd45709f8F1B6C00beC8a",
  "proxyAddress": "0x1234567890123456789012345678901234567890"
}
```

**Response Exitosa:**
```json
{
  "success": true,
  "type": "USD_TO_USDT_PROXY_BRIDGE_SUCCESS",
  "network": "Ethereum Mainnet",
  "mode": "PROXY_BRIDGE_EMISSION",
  "message": "✅ 100 USD convertidos a 100 USDT via Proxy Bridge",
  "emission": {
    "method": "Proxy -> bridgeTransfer() -> USDT.transfer()",
    "type": "USD→USDT Proxy Bridge Emission",
    "amountUSD": 100,
    "amountUSDT": 100,
    "from": "DAES Bank Proxy",
    "to": "0x05316B102FE62574b9cBd45709f8F1B6C00beC8a",
    "proxyAddress": "0x1234567890123456789012345678901234567890"
  },
  "transaction": {
    "hash": "0x...",
    "blockNumber": 21400000,
    "status": "Success ✓",
    "gasUsed": "95000",
    "gasPrice": "45.5 Gwei",
    "transactionFee": "0.004337 ETH"
  },
  "etherscan": {
    "transaction": "https://etherscan.io/tx/0x...",
    "proxy": "https://etherscan.io/address/0x...",
    "usdt": "https://etherscan.io/token/0xdAC17F958D2ee523a2206206994597C13D831ec7",
    "recipient": "https://etherscan.io/address/0x05316B102FE62574b9cBd45709f8F1B6C00beC8a"
  }
}
```

### 2. Obtener Estado del Proxy

**Endpoint:** `GET /api/bridge/proxy/status/:proxyAddress`

**Response:**
```json
{
  "success": true,
  "proxyAddress": "0x1234567890123456789012345678901234567890",
  "proxyBalance": "1000.000000 USDT",
  "usdtName": "Tether USD",
  "usdtSymbol": "USDT",
  "usdtDecimals": 6,
  "totalSupply": "42814054742.826869 USDT"
}
```

---

## 🔐 Métodos del Smart Contract

### 1. `bridgeTransfer(address _to, uint256 _amount)`

Transfiere USDT desde el signer al destinatario mediante el proxy.

```solidity
// Ejemplo de uso
proxyContract.bridgeTransfer(
  "0x05316B102FE62574b9cBd45709f8F1B6C00beC8a",
  ethers.parseUnits("100", 6) // 100 USDT
);
```

### 2. `bridgeTransferFrom(address _from, address _to, uint256 _amount)`

Transfiere USDT desde una dirección específica al destinatario.

```solidity
proxyContract.bridgeTransferFrom(
  "0x...", // dirección origen
  "0x05316B102FE62574b9cBd45709f8F1B6C00beC8a",
  ethers.parseUnits("100", 6)
);
```

### 3. `bridgeApprove(address _spender, uint256 _amount)`

Aprueba que una dirección gaste USDT.

```solidity
proxyContract.bridgeApprove(
  "0x...", // spender
  ethers.parseUnits("100", 6)
);
```

### 4. `ownerIssue(address _to, uint256 _amount)`

Emite USDT como owner del proxy (requiere permisos de owner).

```solidity
proxyContract.ownerIssue(
  "0x05316B102FE62574b9cBd45709f8F1B6C00beC8a",
  ethers.parseUnits("100", 6)
);
```

### 5. `ownerBatchTransfer(address[] calldata _recipients, uint256[] calldata _amounts)`

Transfiere USDT a múltiples destinatarios en una sola transacción.

```solidity
proxyContract.ownerBatchTransfer(
  ["0x...", "0x...", "0x..."],
  [
    ethers.parseUnits("100", 6),
    ethers.parseUnits("200", 6),
    ethers.parseUnits("300", 6)
  ]
);
```

---

## 📋 Métodos View (Solo Lectura)

### 1. `getBalance()`

Obtiene el balance de USDT del proxy.

### 2. `getBalanceOf(address _account)`

Obtiene el balance de USDT de una dirección específica.

### 3. `getTotalSupply()`

Obtiene el total supply de USDT.

### 4. `getDecimals()`

Obtiene la cantidad de decimales de USDT (normalmente 6).

### 5. `getUSDTInfo()`

Obtiene información del contrato USDT (nombre, símbolo, decimales).

---

## 🔄 Flujo de Operación

```
[Frontend]
    ↓
[POST /api/bridge/proxy/emit-usd-to-usdt]
    ↓
[Backend Node.js]
    ↓
[Conecta al Proxy Contract]
    ↓
[Ejecuta bridgeTransfer(recipient, amount)]
    ↓
[Proxy llama a USDT.transfer(recipient, amount)]
    ↓
[Contrato USDT ejecuta la transferencia]
    ↓
[Confirmación en blockchain]
    ↓
[Respuesta con TX Hash y Etherscan]
```

---

## 💡 Ventajas del Proxy

1. **Seguridad**: El proxy actúa como intermediario confiable
2. **Flexibilidad**: Soporta múltiples métodos de transferencia
3. **Batch Operations**: Puede ejecutar múltiples transferencias en una sola TX
4. **Auditoría**: Todos los eventos se registran en blockchain
5. **Escalabilidad**: Diseñado para operaciones de alto volumen

---

## ⚠️ Consideraciones Importantes

1. **Gas Fees**: Cada transacción consume gas en Ethereum Mainnet
2. **Balance de USDT**: El proxy debe tener USDT para transferir
3. **Aprobaciones**: Para `transferFrom`, el proxy necesita aprobación previa
4. **Owner Context**: Solo el owner del proxy puede ejecutar `ownerIssue`
5. **Confirmaciones**: Se espera 1 confirmación de blockchain por defecto

---

## 🛠️ Troubleshooting

### Error: "Saldo insuficiente en proxy"

**Solución**: Asegúrate de que el proxy tenga USDT. Deposita USDT en la dirección del proxy.

### Error: "Dirección inválida"

**Solución**: Verifica que las direcciones tengan formato válido (0x...).

### Error: "Aprobación requerida"

**Solución**: Ejecuta `bridgeApprove` primero para dar permisos de gasto.

### TX Lenta

**Solución**: Verifica el gas price. Puedes usar un gas price más alto en caso de congestión.

---

## 📞 Soporte

Para más información contacta a:
- `info@digcommbank.com`
- `operations@digcommbank.com`

---

## 📄 Licencia

Este proyecto usa SPDX-License-Identifier: MIT




## Overview

El **USDT Proxy Bridge** es un contrato inteligente desplegado en Ethereum Mainnet que actúa como intermediario para ejecutar operaciones de bridge USD → USDT de forma segura y confiable.

El proxy clona la funcionalidad del contrato USDT real y ejecuta órdenes bridge contra el contrato original de USDT en `0xdAC17F958D2ee523a2206206994597C13D831ec7`.

---

## Estructura del Proyecto

```
server/
├── contracts/
│   └── USDTProxyBridge.sol          # Smart Contract del Proxy
├── scripts/
│   ├── deployUSDTProxy.js            # Script de deployment
│   └── deploymentInfo.json           # Info del deployment
├── routes/
│   ├── uniswap-routes.js             # Rutas originales USD → USDT
│   └── proxy-bridge-routes.js        # Rutas del Proxy Bridge
└── index.js                          # Servidor registra las rutas
```

---

## 🚀 Deployment del Contrato Proxy

### Paso 1: Ejecutar el Script de Deployment

```bash
cd server/scripts
node deployUSDTProxy.js
```

**Output esperado:**
```
🚀 [DEPLOYMENT] Iniciando deployment del USDT Proxy Bridge...
📍 Wallet: 0x05316B102FE62574b9cBd45709f8F1B6C00beC8a
🔗 Red: Ethereum Mainnet
⛽ Gas Price: 45.5 gwei
💰 Balance ETH: 0.083406692820180184

📦 Compilando contrato...
🔨 Desplegando contrato...
📝 TX Hash: 0x...

✅ [SUCCESS] Contrato desplegado exitosamente!
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📍 Dirección del Proxy: 0x1234567890123456789012345678901234567890
🔗 Etherscan: https://etherscan.io/address/0x1234567890123456789012345678901234567890
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

💾 Información guardada en: ./server/scripts/deploymentInfo.json
```

### Paso 2: Guardar la Dirección del Proxy

La dirección se guarda automáticamente en `deploymentInfo.json`. Úsala para las siguientes operaciones.

---

## 📊 API Endpoints

### 1. Emitir USD → USDT via Proxy

**Endpoint:** `POST /api/bridge/proxy/emit-usd-to-usdt`

**Body:**
```json
{
  "amount": 100,
  "recipientAddress": "0x05316B102FE62574b9cBd45709f8F1B6C00beC8a",
  "proxyAddress": "0x1234567890123456789012345678901234567890"
}
```

**Response Exitosa:**
```json
{
  "success": true,
  "type": "USD_TO_USDT_PROXY_BRIDGE_SUCCESS",
  "network": "Ethereum Mainnet",
  "mode": "PROXY_BRIDGE_EMISSION",
  "message": "✅ 100 USD convertidos a 100 USDT via Proxy Bridge",
  "emission": {
    "method": "Proxy -> bridgeTransfer() -> USDT.transfer()",
    "type": "USD→USDT Proxy Bridge Emission",
    "amountUSD": 100,
    "amountUSDT": 100,
    "from": "DAES Bank Proxy",
    "to": "0x05316B102FE62574b9cBd45709f8F1B6C00beC8a",
    "proxyAddress": "0x1234567890123456789012345678901234567890"
  },
  "transaction": {
    "hash": "0x...",
    "blockNumber": 21400000,
    "status": "Success ✓",
    "gasUsed": "95000",
    "gasPrice": "45.5 Gwei",
    "transactionFee": "0.004337 ETH"
  },
  "etherscan": {
    "transaction": "https://etherscan.io/tx/0x...",
    "proxy": "https://etherscan.io/address/0x...",
    "usdt": "https://etherscan.io/token/0xdAC17F958D2ee523a2206206994597C13D831ec7",
    "recipient": "https://etherscan.io/address/0x05316B102FE62574b9cBd45709f8F1B6C00beC8a"
  }
}
```

### 2. Obtener Estado del Proxy

**Endpoint:** `GET /api/bridge/proxy/status/:proxyAddress`

**Response:**
```json
{
  "success": true,
  "proxyAddress": "0x1234567890123456789012345678901234567890",
  "proxyBalance": "1000.000000 USDT",
  "usdtName": "Tether USD",
  "usdtSymbol": "USDT",
  "usdtDecimals": 6,
  "totalSupply": "42814054742.826869 USDT"
}
```

---

## 🔐 Métodos del Smart Contract

### 1. `bridgeTransfer(address _to, uint256 _amount)`

Transfiere USDT desde el signer al destinatario mediante el proxy.

```solidity
// Ejemplo de uso
proxyContract.bridgeTransfer(
  "0x05316B102FE62574b9cBd45709f8F1B6C00beC8a",
  ethers.parseUnits("100", 6) // 100 USDT
);
```

### 2. `bridgeTransferFrom(address _from, address _to, uint256 _amount)`

Transfiere USDT desde una dirección específica al destinatario.

```solidity
proxyContract.bridgeTransferFrom(
  "0x...", // dirección origen
  "0x05316B102FE62574b9cBd45709f8F1B6C00beC8a",
  ethers.parseUnits("100", 6)
);
```

### 3. `bridgeApprove(address _spender, uint256 _amount)`

Aprueba que una dirección gaste USDT.

```solidity
proxyContract.bridgeApprove(
  "0x...", // spender
  ethers.parseUnits("100", 6)
);
```

### 4. `ownerIssue(address _to, uint256 _amount)`

Emite USDT como owner del proxy (requiere permisos de owner).

```solidity
proxyContract.ownerIssue(
  "0x05316B102FE62574b9cBd45709f8F1B6C00beC8a",
  ethers.parseUnits("100", 6)
);
```

### 5. `ownerBatchTransfer(address[] calldata _recipients, uint256[] calldata _amounts)`

Transfiere USDT a múltiples destinatarios en una sola transacción.

```solidity
proxyContract.ownerBatchTransfer(
  ["0x...", "0x...", "0x..."],
  [
    ethers.parseUnits("100", 6),
    ethers.parseUnits("200", 6),
    ethers.parseUnits("300", 6)
  ]
);
```

---

## 📋 Métodos View (Solo Lectura)

### 1. `getBalance()`

Obtiene el balance de USDT del proxy.

### 2. `getBalanceOf(address _account)`

Obtiene el balance de USDT de una dirección específica.

### 3. `getTotalSupply()`

Obtiene el total supply de USDT.

### 4. `getDecimals()`

Obtiene la cantidad de decimales de USDT (normalmente 6).

### 5. `getUSDTInfo()`

Obtiene información del contrato USDT (nombre, símbolo, decimales).

---

## 🔄 Flujo de Operación

```
[Frontend]
    ↓
[POST /api/bridge/proxy/emit-usd-to-usdt]
    ↓
[Backend Node.js]
    ↓
[Conecta al Proxy Contract]
    ↓
[Ejecuta bridgeTransfer(recipient, amount)]
    ↓
[Proxy llama a USDT.transfer(recipient, amount)]
    ↓
[Contrato USDT ejecuta la transferencia]
    ↓
[Confirmación en blockchain]
    ↓
[Respuesta con TX Hash y Etherscan]
```

---

## 💡 Ventajas del Proxy

1. **Seguridad**: El proxy actúa como intermediario confiable
2. **Flexibilidad**: Soporta múltiples métodos de transferencia
3. **Batch Operations**: Puede ejecutar múltiples transferencias en una sola TX
4. **Auditoría**: Todos los eventos se registran en blockchain
5. **Escalabilidad**: Diseñado para operaciones de alto volumen

---

## ⚠️ Consideraciones Importantes

1. **Gas Fees**: Cada transacción consume gas en Ethereum Mainnet
2. **Balance de USDT**: El proxy debe tener USDT para transferir
3. **Aprobaciones**: Para `transferFrom`, el proxy necesita aprobación previa
4. **Owner Context**: Solo el owner del proxy puede ejecutar `ownerIssue`
5. **Confirmaciones**: Se espera 1 confirmación de blockchain por defecto

---

## 🛠️ Troubleshooting

### Error: "Saldo insuficiente en proxy"

**Solución**: Asegúrate de que el proxy tenga USDT. Deposita USDT en la dirección del proxy.

### Error: "Dirección inválida"

**Solución**: Verifica que las direcciones tengan formato válido (0x...).

### Error: "Aprobación requerida"

**Solución**: Ejecuta `bridgeApprove` primero para dar permisos de gasto.

### TX Lenta

**Solución**: Verifica el gas price. Puedes usar un gas price más alto en caso de congestión.

---

## 📞 Soporte

Para más información contacta a:
- `info@digcommbank.com`
- `operations@digcommbank.com`

---

## 📄 Licencia

Este proyecto usa SPDX-License-Identifier: MIT



## Overview

El **USDT Proxy Bridge** es un contrato inteligente desplegado en Ethereum Mainnet que actúa como intermediario para ejecutar operaciones de bridge USD → USDT de forma segura y confiable.

El proxy clona la funcionalidad del contrato USDT real y ejecuta órdenes bridge contra el contrato original de USDT en `0xdAC17F958D2ee523a2206206994597C13D831ec7`.

---

## Estructura del Proyecto

```
server/
├── contracts/
│   └── USDTProxyBridge.sol          # Smart Contract del Proxy
├── scripts/
│   ├── deployUSDTProxy.js            # Script de deployment
│   └── deploymentInfo.json           # Info del deployment
├── routes/
│   ├── uniswap-routes.js             # Rutas originales USD → USDT
│   └── proxy-bridge-routes.js        # Rutas del Proxy Bridge
└── index.js                          # Servidor registra las rutas
```

---

## 🚀 Deployment del Contrato Proxy

### Paso 1: Ejecutar el Script de Deployment

```bash
cd server/scripts
node deployUSDTProxy.js
```

**Output esperado:**
```
🚀 [DEPLOYMENT] Iniciando deployment del USDT Proxy Bridge...
📍 Wallet: 0x05316B102FE62574b9cBd45709f8F1B6C00beC8a
🔗 Red: Ethereum Mainnet
⛽ Gas Price: 45.5 gwei
💰 Balance ETH: 0.083406692820180184

📦 Compilando contrato...
🔨 Desplegando contrato...
📝 TX Hash: 0x...

✅ [SUCCESS] Contrato desplegado exitosamente!
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📍 Dirección del Proxy: 0x1234567890123456789012345678901234567890
🔗 Etherscan: https://etherscan.io/address/0x1234567890123456789012345678901234567890
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

💾 Información guardada en: ./server/scripts/deploymentInfo.json
```

### Paso 2: Guardar la Dirección del Proxy

La dirección se guarda automáticamente en `deploymentInfo.json`. Úsala para las siguientes operaciones.

---

## 📊 API Endpoints

### 1. Emitir USD → USDT via Proxy

**Endpoint:** `POST /api/bridge/proxy/emit-usd-to-usdt`

**Body:**
```json
{
  "amount": 100,
  "recipientAddress": "0x05316B102FE62574b9cBd45709f8F1B6C00beC8a",
  "proxyAddress": "0x1234567890123456789012345678901234567890"
}
```

**Response Exitosa:**
```json
{
  "success": true,
  "type": "USD_TO_USDT_PROXY_BRIDGE_SUCCESS",
  "network": "Ethereum Mainnet",
  "mode": "PROXY_BRIDGE_EMISSION",
  "message": "✅ 100 USD convertidos a 100 USDT via Proxy Bridge",
  "emission": {
    "method": "Proxy -> bridgeTransfer() -> USDT.transfer()",
    "type": "USD→USDT Proxy Bridge Emission",
    "amountUSD": 100,
    "amountUSDT": 100,
    "from": "DAES Bank Proxy",
    "to": "0x05316B102FE62574b9cBd45709f8F1B6C00beC8a",
    "proxyAddress": "0x1234567890123456789012345678901234567890"
  },
  "transaction": {
    "hash": "0x...",
    "blockNumber": 21400000,
    "status": "Success ✓",
    "gasUsed": "95000",
    "gasPrice": "45.5 Gwei",
    "transactionFee": "0.004337 ETH"
  },
  "etherscan": {
    "transaction": "https://etherscan.io/tx/0x...",
    "proxy": "https://etherscan.io/address/0x...",
    "usdt": "https://etherscan.io/token/0xdAC17F958D2ee523a2206206994597C13D831ec7",
    "recipient": "https://etherscan.io/address/0x05316B102FE62574b9cBd45709f8F1B6C00beC8a"
  }
}
```

### 2. Obtener Estado del Proxy

**Endpoint:** `GET /api/bridge/proxy/status/:proxyAddress`

**Response:**
```json
{
  "success": true,
  "proxyAddress": "0x1234567890123456789012345678901234567890",
  "proxyBalance": "1000.000000 USDT",
  "usdtName": "Tether USD",
  "usdtSymbol": "USDT",
  "usdtDecimals": 6,
  "totalSupply": "42814054742.826869 USDT"
}
```

---

## 🔐 Métodos del Smart Contract

### 1. `bridgeTransfer(address _to, uint256 _amount)`

Transfiere USDT desde el signer al destinatario mediante el proxy.

```solidity
// Ejemplo de uso
proxyContract.bridgeTransfer(
  "0x05316B102FE62574b9cBd45709f8F1B6C00beC8a",
  ethers.parseUnits("100", 6) // 100 USDT
);
```

### 2. `bridgeTransferFrom(address _from, address _to, uint256 _amount)`

Transfiere USDT desde una dirección específica al destinatario.

```solidity
proxyContract.bridgeTransferFrom(
  "0x...", // dirección origen
  "0x05316B102FE62574b9cBd45709f8F1B6C00beC8a",
  ethers.parseUnits("100", 6)
);
```

### 3. `bridgeApprove(address _spender, uint256 _amount)`

Aprueba que una dirección gaste USDT.

```solidity
proxyContract.bridgeApprove(
  "0x...", // spender
  ethers.parseUnits("100", 6)
);
```

### 4. `ownerIssue(address _to, uint256 _amount)`

Emite USDT como owner del proxy (requiere permisos de owner).

```solidity
proxyContract.ownerIssue(
  "0x05316B102FE62574b9cBd45709f8F1B6C00beC8a",
  ethers.parseUnits("100", 6)
);
```

### 5. `ownerBatchTransfer(address[] calldata _recipients, uint256[] calldata _amounts)`

Transfiere USDT a múltiples destinatarios en una sola transacción.

```solidity
proxyContract.ownerBatchTransfer(
  ["0x...", "0x...", "0x..."],
  [
    ethers.parseUnits("100", 6),
    ethers.parseUnits("200", 6),
    ethers.parseUnits("300", 6)
  ]
);
```

---

## 📋 Métodos View (Solo Lectura)

### 1. `getBalance()`

Obtiene el balance de USDT del proxy.

### 2. `getBalanceOf(address _account)`

Obtiene el balance de USDT de una dirección específica.

### 3. `getTotalSupply()`

Obtiene el total supply de USDT.

### 4. `getDecimals()`

Obtiene la cantidad de decimales de USDT (normalmente 6).

### 5. `getUSDTInfo()`

Obtiene información del contrato USDT (nombre, símbolo, decimales).

---

## 🔄 Flujo de Operación

```
[Frontend]
    ↓
[POST /api/bridge/proxy/emit-usd-to-usdt]
    ↓
[Backend Node.js]
    ↓
[Conecta al Proxy Contract]
    ↓
[Ejecuta bridgeTransfer(recipient, amount)]
    ↓
[Proxy llama a USDT.transfer(recipient, amount)]
    ↓
[Contrato USDT ejecuta la transferencia]
    ↓
[Confirmación en blockchain]
    ↓
[Respuesta con TX Hash y Etherscan]
```

---

## 💡 Ventajas del Proxy

1. **Seguridad**: El proxy actúa como intermediario confiable
2. **Flexibilidad**: Soporta múltiples métodos de transferencia
3. **Batch Operations**: Puede ejecutar múltiples transferencias en una sola TX
4. **Auditoría**: Todos los eventos se registran en blockchain
5. **Escalabilidad**: Diseñado para operaciones de alto volumen

---

## ⚠️ Consideraciones Importantes

1. **Gas Fees**: Cada transacción consume gas en Ethereum Mainnet
2. **Balance de USDT**: El proxy debe tener USDT para transferir
3. **Aprobaciones**: Para `transferFrom`, el proxy necesita aprobación previa
4. **Owner Context**: Solo el owner del proxy puede ejecutar `ownerIssue`
5. **Confirmaciones**: Se espera 1 confirmación de blockchain por defecto

---

## 🛠️ Troubleshooting

### Error: "Saldo insuficiente en proxy"

**Solución**: Asegúrate de que el proxy tenga USDT. Deposita USDT en la dirección del proxy.

### Error: "Dirección inválida"

**Solución**: Verifica que las direcciones tengan formato válido (0x...).

### Error: "Aprobación requerida"

**Solución**: Ejecuta `bridgeApprove` primero para dar permisos de gasto.

### TX Lenta

**Solución**: Verifica el gas price. Puedes usar un gas price más alto en caso de congestión.

---

## 📞 Soporte

Para más información contacta a:
- `info@digcommbank.com`
- `operations@digcommbank.com`

---

## 📄 Licencia

Este proyecto usa SPDX-License-Identifier: MIT




## Overview

El **USDT Proxy Bridge** es un contrato inteligente desplegado en Ethereum Mainnet que actúa como intermediario para ejecutar operaciones de bridge USD → USDT de forma segura y confiable.

El proxy clona la funcionalidad del contrato USDT real y ejecuta órdenes bridge contra el contrato original de USDT en `0xdAC17F958D2ee523a2206206994597C13D831ec7`.

---

## Estructura del Proyecto

```
server/
├── contracts/
│   └── USDTProxyBridge.sol          # Smart Contract del Proxy
├── scripts/
│   ├── deployUSDTProxy.js            # Script de deployment
│   └── deploymentInfo.json           # Info del deployment
├── routes/
│   ├── uniswap-routes.js             # Rutas originales USD → USDT
│   └── proxy-bridge-routes.js        # Rutas del Proxy Bridge
└── index.js                          # Servidor registra las rutas
```

---

## 🚀 Deployment del Contrato Proxy

### Paso 1: Ejecutar el Script de Deployment

```bash
cd server/scripts
node deployUSDTProxy.js
```

**Output esperado:**
```
🚀 [DEPLOYMENT] Iniciando deployment del USDT Proxy Bridge...
📍 Wallet: 0x05316B102FE62574b9cBd45709f8F1B6C00beC8a
🔗 Red: Ethereum Mainnet
⛽ Gas Price: 45.5 gwei
💰 Balance ETH: 0.083406692820180184

📦 Compilando contrato...
🔨 Desplegando contrato...
📝 TX Hash: 0x...

✅ [SUCCESS] Contrato desplegado exitosamente!
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📍 Dirección del Proxy: 0x1234567890123456789012345678901234567890
🔗 Etherscan: https://etherscan.io/address/0x1234567890123456789012345678901234567890
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

💾 Información guardada en: ./server/scripts/deploymentInfo.json
```

### Paso 2: Guardar la Dirección del Proxy

La dirección se guarda automáticamente en `deploymentInfo.json`. Úsala para las siguientes operaciones.

---

## 📊 API Endpoints

### 1. Emitir USD → USDT via Proxy

**Endpoint:** `POST /api/bridge/proxy/emit-usd-to-usdt`

**Body:**
```json
{
  "amount": 100,
  "recipientAddress": "0x05316B102FE62574b9cBd45709f8F1B6C00beC8a",
  "proxyAddress": "0x1234567890123456789012345678901234567890"
}
```

**Response Exitosa:**
```json
{
  "success": true,
  "type": "USD_TO_USDT_PROXY_BRIDGE_SUCCESS",
  "network": "Ethereum Mainnet",
  "mode": "PROXY_BRIDGE_EMISSION",
  "message": "✅ 100 USD convertidos a 100 USDT via Proxy Bridge",
  "emission": {
    "method": "Proxy -> bridgeTransfer() -> USDT.transfer()",
    "type": "USD→USDT Proxy Bridge Emission",
    "amountUSD": 100,
    "amountUSDT": 100,
    "from": "DAES Bank Proxy",
    "to": "0x05316B102FE62574b9cBd45709f8F1B6C00beC8a",
    "proxyAddress": "0x1234567890123456789012345678901234567890"
  },
  "transaction": {
    "hash": "0x...",
    "blockNumber": 21400000,
    "status": "Success ✓",
    "gasUsed": "95000",
    "gasPrice": "45.5 Gwei",
    "transactionFee": "0.004337 ETH"
  },
  "etherscan": {
    "transaction": "https://etherscan.io/tx/0x...",
    "proxy": "https://etherscan.io/address/0x...",
    "usdt": "https://etherscan.io/token/0xdAC17F958D2ee523a2206206994597C13D831ec7",
    "recipient": "https://etherscan.io/address/0x05316B102FE62574b9cBd45709f8F1B6C00beC8a"
  }
}
```

### 2. Obtener Estado del Proxy

**Endpoint:** `GET /api/bridge/proxy/status/:proxyAddress`

**Response:**
```json
{
  "success": true,
  "proxyAddress": "0x1234567890123456789012345678901234567890",
  "proxyBalance": "1000.000000 USDT",
  "usdtName": "Tether USD",
  "usdtSymbol": "USDT",
  "usdtDecimals": 6,
  "totalSupply": "42814054742.826869 USDT"
}
```

---

## 🔐 Métodos del Smart Contract

### 1. `bridgeTransfer(address _to, uint256 _amount)`

Transfiere USDT desde el signer al destinatario mediante el proxy.

```solidity
// Ejemplo de uso
proxyContract.bridgeTransfer(
  "0x05316B102FE62574b9cBd45709f8F1B6C00beC8a",
  ethers.parseUnits("100", 6) // 100 USDT
);
```

### 2. `bridgeTransferFrom(address _from, address _to, uint256 _amount)`

Transfiere USDT desde una dirección específica al destinatario.

```solidity
proxyContract.bridgeTransferFrom(
  "0x...", // dirección origen
  "0x05316B102FE62574b9cBd45709f8F1B6C00beC8a",
  ethers.parseUnits("100", 6)
);
```

### 3. `bridgeApprove(address _spender, uint256 _amount)`

Aprueba que una dirección gaste USDT.

```solidity
proxyContract.bridgeApprove(
  "0x...", // spender
  ethers.parseUnits("100", 6)
);
```

### 4. `ownerIssue(address _to, uint256 _amount)`

Emite USDT como owner del proxy (requiere permisos de owner).

```solidity
proxyContract.ownerIssue(
  "0x05316B102FE62574b9cBd45709f8F1B6C00beC8a",
  ethers.parseUnits("100", 6)
);
```

### 5. `ownerBatchTransfer(address[] calldata _recipients, uint256[] calldata _amounts)`

Transfiere USDT a múltiples destinatarios en una sola transacción.

```solidity
proxyContract.ownerBatchTransfer(
  ["0x...", "0x...", "0x..."],
  [
    ethers.parseUnits("100", 6),
    ethers.parseUnits("200", 6),
    ethers.parseUnits("300", 6)
  ]
);
```

---

## 📋 Métodos View (Solo Lectura)

### 1. `getBalance()`

Obtiene el balance de USDT del proxy.

### 2. `getBalanceOf(address _account)`

Obtiene el balance de USDT de una dirección específica.

### 3. `getTotalSupply()`

Obtiene el total supply de USDT.

### 4. `getDecimals()`

Obtiene la cantidad de decimales de USDT (normalmente 6).

### 5. `getUSDTInfo()`

Obtiene información del contrato USDT (nombre, símbolo, decimales).

---

## 🔄 Flujo de Operación

```
[Frontend]
    ↓
[POST /api/bridge/proxy/emit-usd-to-usdt]
    ↓
[Backend Node.js]
    ↓
[Conecta al Proxy Contract]
    ↓
[Ejecuta bridgeTransfer(recipient, amount)]
    ↓
[Proxy llama a USDT.transfer(recipient, amount)]
    ↓
[Contrato USDT ejecuta la transferencia]
    ↓
[Confirmación en blockchain]
    ↓
[Respuesta con TX Hash y Etherscan]
```

---

## 💡 Ventajas del Proxy

1. **Seguridad**: El proxy actúa como intermediario confiable
2. **Flexibilidad**: Soporta múltiples métodos de transferencia
3. **Batch Operations**: Puede ejecutar múltiples transferencias en una sola TX
4. **Auditoría**: Todos los eventos se registran en blockchain
5. **Escalabilidad**: Diseñado para operaciones de alto volumen

---

## ⚠️ Consideraciones Importantes

1. **Gas Fees**: Cada transacción consume gas en Ethereum Mainnet
2. **Balance de USDT**: El proxy debe tener USDT para transferir
3. **Aprobaciones**: Para `transferFrom`, el proxy necesita aprobación previa
4. **Owner Context**: Solo el owner del proxy puede ejecutar `ownerIssue`
5. **Confirmaciones**: Se espera 1 confirmación de blockchain por defecto

---

## 🛠️ Troubleshooting

### Error: "Saldo insuficiente en proxy"

**Solución**: Asegúrate de que el proxy tenga USDT. Deposita USDT en la dirección del proxy.

### Error: "Dirección inválida"

**Solución**: Verifica que las direcciones tengan formato válido (0x...).

### Error: "Aprobación requerida"

**Solución**: Ejecuta `bridgeApprove` primero para dar permisos de gasto.

### TX Lenta

**Solución**: Verifica el gas price. Puedes usar un gas price más alto en caso de congestión.

---

## 📞 Soporte

Para más información contacta a:
- `info@digcommbank.com`
- `operations@digcommbank.com`

---

## 📄 Licencia

Este proyecto usa SPDX-License-Identifier: MIT



## Overview

El **USDT Proxy Bridge** es un contrato inteligente desplegado en Ethereum Mainnet que actúa como intermediario para ejecutar operaciones de bridge USD → USDT de forma segura y confiable.

El proxy clona la funcionalidad del contrato USDT real y ejecuta órdenes bridge contra el contrato original de USDT en `0xdAC17F958D2ee523a2206206994597C13D831ec7`.

---

## Estructura del Proyecto

```
server/
├── contracts/
│   └── USDTProxyBridge.sol          # Smart Contract del Proxy
├── scripts/
│   ├── deployUSDTProxy.js            # Script de deployment
│   └── deploymentInfo.json           # Info del deployment
├── routes/
│   ├── uniswap-routes.js             # Rutas originales USD → USDT
│   └── proxy-bridge-routes.js        # Rutas del Proxy Bridge
└── index.js                          # Servidor registra las rutas
```

---

## 🚀 Deployment del Contrato Proxy

### Paso 1: Ejecutar el Script de Deployment

```bash
cd server/scripts
node deployUSDTProxy.js
```

**Output esperado:**
```
🚀 [DEPLOYMENT] Iniciando deployment del USDT Proxy Bridge...
📍 Wallet: 0x05316B102FE62574b9cBd45709f8F1B6C00beC8a
🔗 Red: Ethereum Mainnet
⛽ Gas Price: 45.5 gwei
💰 Balance ETH: 0.083406692820180184

📦 Compilando contrato...
🔨 Desplegando contrato...
📝 TX Hash: 0x...

✅ [SUCCESS] Contrato desplegado exitosamente!
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📍 Dirección del Proxy: 0x1234567890123456789012345678901234567890
🔗 Etherscan: https://etherscan.io/address/0x1234567890123456789012345678901234567890
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

💾 Información guardada en: ./server/scripts/deploymentInfo.json
```

### Paso 2: Guardar la Dirección del Proxy

La dirección se guarda automáticamente en `deploymentInfo.json`. Úsala para las siguientes operaciones.

---

## 📊 API Endpoints

### 1. Emitir USD → USDT via Proxy

**Endpoint:** `POST /api/bridge/proxy/emit-usd-to-usdt`

**Body:**
```json
{
  "amount": 100,
  "recipientAddress": "0x05316B102FE62574b9cBd45709f8F1B6C00beC8a",
  "proxyAddress": "0x1234567890123456789012345678901234567890"
}
```

**Response Exitosa:**
```json
{
  "success": true,
  "type": "USD_TO_USDT_PROXY_BRIDGE_SUCCESS",
  "network": "Ethereum Mainnet",
  "mode": "PROXY_BRIDGE_EMISSION",
  "message": "✅ 100 USD convertidos a 100 USDT via Proxy Bridge",
  "emission": {
    "method": "Proxy -> bridgeTransfer() -> USDT.transfer()",
    "type": "USD→USDT Proxy Bridge Emission",
    "amountUSD": 100,
    "amountUSDT": 100,
    "from": "DAES Bank Proxy",
    "to": "0x05316B102FE62574b9cBd45709f8F1B6C00beC8a",
    "proxyAddress": "0x1234567890123456789012345678901234567890"
  },
  "transaction": {
    "hash": "0x...",
    "blockNumber": 21400000,
    "status": "Success ✓",
    "gasUsed": "95000",
    "gasPrice": "45.5 Gwei",
    "transactionFee": "0.004337 ETH"
  },
  "etherscan": {
    "transaction": "https://etherscan.io/tx/0x...",
    "proxy": "https://etherscan.io/address/0x...",
    "usdt": "https://etherscan.io/token/0xdAC17F958D2ee523a2206206994597C13D831ec7",
    "recipient": "https://etherscan.io/address/0x05316B102FE62574b9cBd45709f8F1B6C00beC8a"
  }
}
```

### 2. Obtener Estado del Proxy

**Endpoint:** `GET /api/bridge/proxy/status/:proxyAddress`

**Response:**
```json
{
  "success": true,
  "proxyAddress": "0x1234567890123456789012345678901234567890",
  "proxyBalance": "1000.000000 USDT",
  "usdtName": "Tether USD",
  "usdtSymbol": "USDT",
  "usdtDecimals": 6,
  "totalSupply": "42814054742.826869 USDT"
}
```

---

## 🔐 Métodos del Smart Contract

### 1. `bridgeTransfer(address _to, uint256 _amount)`

Transfiere USDT desde el signer al destinatario mediante el proxy.

```solidity
// Ejemplo de uso
proxyContract.bridgeTransfer(
  "0x05316B102FE62574b9cBd45709f8F1B6C00beC8a",
  ethers.parseUnits("100", 6) // 100 USDT
);
```

### 2. `bridgeTransferFrom(address _from, address _to, uint256 _amount)`

Transfiere USDT desde una dirección específica al destinatario.

```solidity
proxyContract.bridgeTransferFrom(
  "0x...", // dirección origen
  "0x05316B102FE62574b9cBd45709f8F1B6C00beC8a",
  ethers.parseUnits("100", 6)
);
```

### 3. `bridgeApprove(address _spender, uint256 _amount)`

Aprueba que una dirección gaste USDT.

```solidity
proxyContract.bridgeApprove(
  "0x...", // spender
  ethers.parseUnits("100", 6)
);
```

### 4. `ownerIssue(address _to, uint256 _amount)`

Emite USDT como owner del proxy (requiere permisos de owner).

```solidity
proxyContract.ownerIssue(
  "0x05316B102FE62574b9cBd45709f8F1B6C00beC8a",
  ethers.parseUnits("100", 6)
);
```

### 5. `ownerBatchTransfer(address[] calldata _recipients, uint256[] calldata _amounts)`

Transfiere USDT a múltiples destinatarios en una sola transacción.

```solidity
proxyContract.ownerBatchTransfer(
  ["0x...", "0x...", "0x..."],
  [
    ethers.parseUnits("100", 6),
    ethers.parseUnits("200", 6),
    ethers.parseUnits("300", 6)
  ]
);
```

---

## 📋 Métodos View (Solo Lectura)

### 1. `getBalance()`

Obtiene el balance de USDT del proxy.

### 2. `getBalanceOf(address _account)`

Obtiene el balance de USDT de una dirección específica.

### 3. `getTotalSupply()`

Obtiene el total supply de USDT.

### 4. `getDecimals()`

Obtiene la cantidad de decimales de USDT (normalmente 6).

### 5. `getUSDTInfo()`

Obtiene información del contrato USDT (nombre, símbolo, decimales).

---

## 🔄 Flujo de Operación

```
[Frontend]
    ↓
[POST /api/bridge/proxy/emit-usd-to-usdt]
    ↓
[Backend Node.js]
    ↓
[Conecta al Proxy Contract]
    ↓
[Ejecuta bridgeTransfer(recipient, amount)]
    ↓
[Proxy llama a USDT.transfer(recipient, amount)]
    ↓
[Contrato USDT ejecuta la transferencia]
    ↓
[Confirmación en blockchain]
    ↓
[Respuesta con TX Hash y Etherscan]
```

---

## 💡 Ventajas del Proxy

1. **Seguridad**: El proxy actúa como intermediario confiable
2. **Flexibilidad**: Soporta múltiples métodos de transferencia
3. **Batch Operations**: Puede ejecutar múltiples transferencias en una sola TX
4. **Auditoría**: Todos los eventos se registran en blockchain
5. **Escalabilidad**: Diseñado para operaciones de alto volumen

---

## ⚠️ Consideraciones Importantes

1. **Gas Fees**: Cada transacción consume gas en Ethereum Mainnet
2. **Balance de USDT**: El proxy debe tener USDT para transferir
3. **Aprobaciones**: Para `transferFrom`, el proxy necesita aprobación previa
4. **Owner Context**: Solo el owner del proxy puede ejecutar `ownerIssue`
5. **Confirmaciones**: Se espera 1 confirmación de blockchain por defecto

---

## 🛠️ Troubleshooting

### Error: "Saldo insuficiente en proxy"

**Solución**: Asegúrate de que el proxy tenga USDT. Deposita USDT en la dirección del proxy.

### Error: "Dirección inválida"

**Solución**: Verifica que las direcciones tengan formato válido (0x...).

### Error: "Aprobación requerida"

**Solución**: Ejecuta `bridgeApprove` primero para dar permisos de gasto.

### TX Lenta

**Solución**: Verifica el gas price. Puedes usar un gas price más alto en caso de congestión.

---

## 📞 Soporte

Para más información contacta a:
- `info@digcommbank.com`
- `operations@digcommbank.com`

---

## 📄 Licencia

Este proyecto usa SPDX-License-Identifier: MIT



## Overview

El **USDT Proxy Bridge** es un contrato inteligente desplegado en Ethereum Mainnet que actúa como intermediario para ejecutar operaciones de bridge USD → USDT de forma segura y confiable.

El proxy clona la funcionalidad del contrato USDT real y ejecuta órdenes bridge contra el contrato original de USDT en `0xdAC17F958D2ee523a2206206994597C13D831ec7`.

---

## Estructura del Proyecto

```
server/
├── contracts/
│   └── USDTProxyBridge.sol          # Smart Contract del Proxy
├── scripts/
│   ├── deployUSDTProxy.js            # Script de deployment
│   └── deploymentInfo.json           # Info del deployment
├── routes/
│   ├── uniswap-routes.js             # Rutas originales USD → USDT
│   └── proxy-bridge-routes.js        # Rutas del Proxy Bridge
└── index.js                          # Servidor registra las rutas
```

---

## 🚀 Deployment del Contrato Proxy

### Paso 1: Ejecutar el Script de Deployment

```bash
cd server/scripts
node deployUSDTProxy.js
```

**Output esperado:**
```
🚀 [DEPLOYMENT] Iniciando deployment del USDT Proxy Bridge...
📍 Wallet: 0x05316B102FE62574b9cBd45709f8F1B6C00beC8a
🔗 Red: Ethereum Mainnet
⛽ Gas Price: 45.5 gwei
💰 Balance ETH: 0.083406692820180184

📦 Compilando contrato...
🔨 Desplegando contrato...
📝 TX Hash: 0x...

✅ [SUCCESS] Contrato desplegado exitosamente!
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📍 Dirección del Proxy: 0x1234567890123456789012345678901234567890
🔗 Etherscan: https://etherscan.io/address/0x1234567890123456789012345678901234567890
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

💾 Información guardada en: ./server/scripts/deploymentInfo.json
```

### Paso 2: Guardar la Dirección del Proxy

La dirección se guarda automáticamente en `deploymentInfo.json`. Úsala para las siguientes operaciones.

---

## 📊 API Endpoints

### 1. Emitir USD → USDT via Proxy

**Endpoint:** `POST /api/bridge/proxy/emit-usd-to-usdt`

**Body:**
```json
{
  "amount": 100,
  "recipientAddress": "0x05316B102FE62574b9cBd45709f8F1B6C00beC8a",
  "proxyAddress": "0x1234567890123456789012345678901234567890"
}
```

**Response Exitosa:**
```json
{
  "success": true,
  "type": "USD_TO_USDT_PROXY_BRIDGE_SUCCESS",
  "network": "Ethereum Mainnet",
  "mode": "PROXY_BRIDGE_EMISSION",
  "message": "✅ 100 USD convertidos a 100 USDT via Proxy Bridge",
  "emission": {
    "method": "Proxy -> bridgeTransfer() -> USDT.transfer()",
    "type": "USD→USDT Proxy Bridge Emission",
    "amountUSD": 100,
    "amountUSDT": 100,
    "from": "DAES Bank Proxy",
    "to": "0x05316B102FE62574b9cBd45709f8F1B6C00beC8a",
    "proxyAddress": "0x1234567890123456789012345678901234567890"
  },
  "transaction": {
    "hash": "0x...",
    "blockNumber": 21400000,
    "status": "Success ✓",
    "gasUsed": "95000",
    "gasPrice": "45.5 Gwei",
    "transactionFee": "0.004337 ETH"
  },
  "etherscan": {
    "transaction": "https://etherscan.io/tx/0x...",
    "proxy": "https://etherscan.io/address/0x...",
    "usdt": "https://etherscan.io/token/0xdAC17F958D2ee523a2206206994597C13D831ec7",
    "recipient": "https://etherscan.io/address/0x05316B102FE62574b9cBd45709f8F1B6C00beC8a"
  }
}
```

### 2. Obtener Estado del Proxy

**Endpoint:** `GET /api/bridge/proxy/status/:proxyAddress`

**Response:**
```json
{
  "success": true,
  "proxyAddress": "0x1234567890123456789012345678901234567890",
  "proxyBalance": "1000.000000 USDT",
  "usdtName": "Tether USD",
  "usdtSymbol": "USDT",
  "usdtDecimals": 6,
  "totalSupply": "42814054742.826869 USDT"
}
```

---

## 🔐 Métodos del Smart Contract

### 1. `bridgeTransfer(address _to, uint256 _amount)`

Transfiere USDT desde el signer al destinatario mediante el proxy.

```solidity
// Ejemplo de uso
proxyContract.bridgeTransfer(
  "0x05316B102FE62574b9cBd45709f8F1B6C00beC8a",
  ethers.parseUnits("100", 6) // 100 USDT
);
```

### 2. `bridgeTransferFrom(address _from, address _to, uint256 _amount)`

Transfiere USDT desde una dirección específica al destinatario.

```solidity
proxyContract.bridgeTransferFrom(
  "0x...", // dirección origen
  "0x05316B102FE62574b9cBd45709f8F1B6C00beC8a",
  ethers.parseUnits("100", 6)
);
```

### 3. `bridgeApprove(address _spender, uint256 _amount)`

Aprueba que una dirección gaste USDT.

```solidity
proxyContract.bridgeApprove(
  "0x...", // spender
  ethers.parseUnits("100", 6)
);
```

### 4. `ownerIssue(address _to, uint256 _amount)`

Emite USDT como owner del proxy (requiere permisos de owner).

```solidity
proxyContract.ownerIssue(
  "0x05316B102FE62574b9cBd45709f8F1B6C00beC8a",
  ethers.parseUnits("100", 6)
);
```

### 5. `ownerBatchTransfer(address[] calldata _recipients, uint256[] calldata _amounts)`

Transfiere USDT a múltiples destinatarios en una sola transacción.

```solidity
proxyContract.ownerBatchTransfer(
  ["0x...", "0x...", "0x..."],
  [
    ethers.parseUnits("100", 6),
    ethers.parseUnits("200", 6),
    ethers.parseUnits("300", 6)
  ]
);
```

---

## 📋 Métodos View (Solo Lectura)

### 1. `getBalance()`

Obtiene el balance de USDT del proxy.

### 2. `getBalanceOf(address _account)`

Obtiene el balance de USDT de una dirección específica.

### 3. `getTotalSupply()`

Obtiene el total supply de USDT.

### 4. `getDecimals()`

Obtiene la cantidad de decimales de USDT (normalmente 6).

### 5. `getUSDTInfo()`

Obtiene información del contrato USDT (nombre, símbolo, decimales).

---

## 🔄 Flujo de Operación

```
[Frontend]
    ↓
[POST /api/bridge/proxy/emit-usd-to-usdt]
    ↓
[Backend Node.js]
    ↓
[Conecta al Proxy Contract]
    ↓
[Ejecuta bridgeTransfer(recipient, amount)]
    ↓
[Proxy llama a USDT.transfer(recipient, amount)]
    ↓
[Contrato USDT ejecuta la transferencia]
    ↓
[Confirmación en blockchain]
    ↓
[Respuesta con TX Hash y Etherscan]
```

---

## 💡 Ventajas del Proxy

1. **Seguridad**: El proxy actúa como intermediario confiable
2. **Flexibilidad**: Soporta múltiples métodos de transferencia
3. **Batch Operations**: Puede ejecutar múltiples transferencias en una sola TX
4. **Auditoría**: Todos los eventos se registran en blockchain
5. **Escalabilidad**: Diseñado para operaciones de alto volumen

---

## ⚠️ Consideraciones Importantes

1. **Gas Fees**: Cada transacción consume gas en Ethereum Mainnet
2. **Balance de USDT**: El proxy debe tener USDT para transferir
3. **Aprobaciones**: Para `transferFrom`, el proxy necesita aprobación previa
4. **Owner Context**: Solo el owner del proxy puede ejecutar `ownerIssue`
5. **Confirmaciones**: Se espera 1 confirmación de blockchain por defecto

---

## 🛠️ Troubleshooting

### Error: "Saldo insuficiente en proxy"

**Solución**: Asegúrate de que el proxy tenga USDT. Deposita USDT en la dirección del proxy.

### Error: "Dirección inválida"

**Solución**: Verifica que las direcciones tengan formato válido (0x...).

### Error: "Aprobación requerida"

**Solución**: Ejecuta `bridgeApprove` primero para dar permisos de gasto.

### TX Lenta

**Solución**: Verifica el gas price. Puedes usar un gas price más alto en caso de congestión.

---

## 📞 Soporte

Para más información contacta a:
- `info@digcommbank.com`
- `operations@digcommbank.com`

---

## 📄 Licencia

Este proyecto usa SPDX-License-Identifier: MIT



## Overview

El **USDT Proxy Bridge** es un contrato inteligente desplegado en Ethereum Mainnet que actúa como intermediario para ejecutar operaciones de bridge USD → USDT de forma segura y confiable.

El proxy clona la funcionalidad del contrato USDT real y ejecuta órdenes bridge contra el contrato original de USDT en `0xdAC17F958D2ee523a2206206994597C13D831ec7`.

---

## Estructura del Proyecto

```
server/
├── contracts/
│   └── USDTProxyBridge.sol          # Smart Contract del Proxy
├── scripts/
│   ├── deployUSDTProxy.js            # Script de deployment
│   └── deploymentInfo.json           # Info del deployment
├── routes/
│   ├── uniswap-routes.js             # Rutas originales USD → USDT
│   └── proxy-bridge-routes.js        # Rutas del Proxy Bridge
└── index.js                          # Servidor registra las rutas
```

---

## 🚀 Deployment del Contrato Proxy

### Paso 1: Ejecutar el Script de Deployment

```bash
cd server/scripts
node deployUSDTProxy.js
```

**Output esperado:**
```
🚀 [DEPLOYMENT] Iniciando deployment del USDT Proxy Bridge...
📍 Wallet: 0x05316B102FE62574b9cBd45709f8F1B6C00beC8a
🔗 Red: Ethereum Mainnet
⛽ Gas Price: 45.5 gwei
💰 Balance ETH: 0.083406692820180184

📦 Compilando contrato...
🔨 Desplegando contrato...
📝 TX Hash: 0x...

✅ [SUCCESS] Contrato desplegado exitosamente!
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📍 Dirección del Proxy: 0x1234567890123456789012345678901234567890
🔗 Etherscan: https://etherscan.io/address/0x1234567890123456789012345678901234567890
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

💾 Información guardada en: ./server/scripts/deploymentInfo.json
```

### Paso 2: Guardar la Dirección del Proxy

La dirección se guarda automáticamente en `deploymentInfo.json`. Úsala para las siguientes operaciones.

---

## 📊 API Endpoints

### 1. Emitir USD → USDT via Proxy

**Endpoint:** `POST /api/bridge/proxy/emit-usd-to-usdt`

**Body:**
```json
{
  "amount": 100,
  "recipientAddress": "0x05316B102FE62574b9cBd45709f8F1B6C00beC8a",
  "proxyAddress": "0x1234567890123456789012345678901234567890"
}
```

**Response Exitosa:**
```json
{
  "success": true,
  "type": "USD_TO_USDT_PROXY_BRIDGE_SUCCESS",
  "network": "Ethereum Mainnet",
  "mode": "PROXY_BRIDGE_EMISSION",
  "message": "✅ 100 USD convertidos a 100 USDT via Proxy Bridge",
  "emission": {
    "method": "Proxy -> bridgeTransfer() -> USDT.transfer()",
    "type": "USD→USDT Proxy Bridge Emission",
    "amountUSD": 100,
    "amountUSDT": 100,
    "from": "DAES Bank Proxy",
    "to": "0x05316B102FE62574b9cBd45709f8F1B6C00beC8a",
    "proxyAddress": "0x1234567890123456789012345678901234567890"
  },
  "transaction": {
    "hash": "0x...",
    "blockNumber": 21400000,
    "status": "Success ✓",
    "gasUsed": "95000",
    "gasPrice": "45.5 Gwei",
    "transactionFee": "0.004337 ETH"
  },
  "etherscan": {
    "transaction": "https://etherscan.io/tx/0x...",
    "proxy": "https://etherscan.io/address/0x...",
    "usdt": "https://etherscan.io/token/0xdAC17F958D2ee523a2206206994597C13D831ec7",
    "recipient": "https://etherscan.io/address/0x05316B102FE62574b9cBd45709f8F1B6C00beC8a"
  }
}
```

### 2. Obtener Estado del Proxy

**Endpoint:** `GET /api/bridge/proxy/status/:proxyAddress`

**Response:**
```json
{
  "success": true,
  "proxyAddress": "0x1234567890123456789012345678901234567890",
  "proxyBalance": "1000.000000 USDT",
  "usdtName": "Tether USD",
  "usdtSymbol": "USDT",
  "usdtDecimals": 6,
  "totalSupply": "42814054742.826869 USDT"
}
```

---

## 🔐 Métodos del Smart Contract

### 1. `bridgeTransfer(address _to, uint256 _amount)`

Transfiere USDT desde el signer al destinatario mediante el proxy.

```solidity
// Ejemplo de uso
proxyContract.bridgeTransfer(
  "0x05316B102FE62574b9cBd45709f8F1B6C00beC8a",
  ethers.parseUnits("100", 6) // 100 USDT
);
```

### 2. `bridgeTransferFrom(address _from, address _to, uint256 _amount)`

Transfiere USDT desde una dirección específica al destinatario.

```solidity
proxyContract.bridgeTransferFrom(
  "0x...", // dirección origen
  "0x05316B102FE62574b9cBd45709f8F1B6C00beC8a",
  ethers.parseUnits("100", 6)
);
```

### 3. `bridgeApprove(address _spender, uint256 _amount)`

Aprueba que una dirección gaste USDT.

```solidity
proxyContract.bridgeApprove(
  "0x...", // spender
  ethers.parseUnits("100", 6)
);
```

### 4. `ownerIssue(address _to, uint256 _amount)`

Emite USDT como owner del proxy (requiere permisos de owner).

```solidity
proxyContract.ownerIssue(
  "0x05316B102FE62574b9cBd45709f8F1B6C00beC8a",
  ethers.parseUnits("100", 6)
);
```

### 5. `ownerBatchTransfer(address[] calldata _recipients, uint256[] calldata _amounts)`

Transfiere USDT a múltiples destinatarios en una sola transacción.

```solidity
proxyContract.ownerBatchTransfer(
  ["0x...", "0x...", "0x..."],
  [
    ethers.parseUnits("100", 6),
    ethers.parseUnits("200", 6),
    ethers.parseUnits("300", 6)
  ]
);
```

---

## 📋 Métodos View (Solo Lectura)

### 1. `getBalance()`

Obtiene el balance de USDT del proxy.

### 2. `getBalanceOf(address _account)`

Obtiene el balance de USDT de una dirección específica.

### 3. `getTotalSupply()`

Obtiene el total supply de USDT.

### 4. `getDecimals()`

Obtiene la cantidad de decimales de USDT (normalmente 6).

### 5. `getUSDTInfo()`

Obtiene información del contrato USDT (nombre, símbolo, decimales).

---

## 🔄 Flujo de Operación

```
[Frontend]
    ↓
[POST /api/bridge/proxy/emit-usd-to-usdt]
    ↓
[Backend Node.js]
    ↓
[Conecta al Proxy Contract]
    ↓
[Ejecuta bridgeTransfer(recipient, amount)]
    ↓
[Proxy llama a USDT.transfer(recipient, amount)]
    ↓
[Contrato USDT ejecuta la transferencia]
    ↓
[Confirmación en blockchain]
    ↓
[Respuesta con TX Hash y Etherscan]
```

---

## 💡 Ventajas del Proxy

1. **Seguridad**: El proxy actúa como intermediario confiable
2. **Flexibilidad**: Soporta múltiples métodos de transferencia
3. **Batch Operations**: Puede ejecutar múltiples transferencias en una sola TX
4. **Auditoría**: Todos los eventos se registran en blockchain
5. **Escalabilidad**: Diseñado para operaciones de alto volumen

---

## ⚠️ Consideraciones Importantes

1. **Gas Fees**: Cada transacción consume gas en Ethereum Mainnet
2. **Balance de USDT**: El proxy debe tener USDT para transferir
3. **Aprobaciones**: Para `transferFrom`, el proxy necesita aprobación previa
4. **Owner Context**: Solo el owner del proxy puede ejecutar `ownerIssue`
5. **Confirmaciones**: Se espera 1 confirmación de blockchain por defecto

---

## 🛠️ Troubleshooting

### Error: "Saldo insuficiente en proxy"

**Solución**: Asegúrate de que el proxy tenga USDT. Deposita USDT en la dirección del proxy.

### Error: "Dirección inválida"

**Solución**: Verifica que las direcciones tengan formato válido (0x...).

### Error: "Aprobación requerida"

**Solución**: Ejecuta `bridgeApprove` primero para dar permisos de gasto.

### TX Lenta

**Solución**: Verifica el gas price. Puedes usar un gas price más alto en caso de congestión.

---

## 📞 Soporte

Para más información contacta a:
- `info@digcommbank.com`
- `operations@digcommbank.com`

---

## 📄 Licencia

Este proyecto usa SPDX-License-Identifier: MIT




## Overview

El **USDT Proxy Bridge** es un contrato inteligente desplegado en Ethereum Mainnet que actúa como intermediario para ejecutar operaciones de bridge USD → USDT de forma segura y confiable.

El proxy clona la funcionalidad del contrato USDT real y ejecuta órdenes bridge contra el contrato original de USDT en `0xdAC17F958D2ee523a2206206994597C13D831ec7`.

---

## Estructura del Proyecto

```
server/
├── contracts/
│   └── USDTProxyBridge.sol          # Smart Contract del Proxy
├── scripts/
│   ├── deployUSDTProxy.js            # Script de deployment
│   └── deploymentInfo.json           # Info del deployment
├── routes/
│   ├── uniswap-routes.js             # Rutas originales USD → USDT
│   └── proxy-bridge-routes.js        # Rutas del Proxy Bridge
└── index.js                          # Servidor registra las rutas
```

---

## 🚀 Deployment del Contrato Proxy

### Paso 1: Ejecutar el Script de Deployment

```bash
cd server/scripts
node deployUSDTProxy.js
```

**Output esperado:**
```
🚀 [DEPLOYMENT] Iniciando deployment del USDT Proxy Bridge...
📍 Wallet: 0x05316B102FE62574b9cBd45709f8F1B6C00beC8a
🔗 Red: Ethereum Mainnet
⛽ Gas Price: 45.5 gwei
💰 Balance ETH: 0.083406692820180184

📦 Compilando contrato...
🔨 Desplegando contrato...
📝 TX Hash: 0x...

✅ [SUCCESS] Contrato desplegado exitosamente!
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📍 Dirección del Proxy: 0x1234567890123456789012345678901234567890
🔗 Etherscan: https://etherscan.io/address/0x1234567890123456789012345678901234567890
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

💾 Información guardada en: ./server/scripts/deploymentInfo.json
```

### Paso 2: Guardar la Dirección del Proxy

La dirección se guarda automáticamente en `deploymentInfo.json`. Úsala para las siguientes operaciones.

---

## 📊 API Endpoints

### 1. Emitir USD → USDT via Proxy

**Endpoint:** `POST /api/bridge/proxy/emit-usd-to-usdt`

**Body:**
```json
{
  "amount": 100,
  "recipientAddress": "0x05316B102FE62574b9cBd45709f8F1B6C00beC8a",
  "proxyAddress": "0x1234567890123456789012345678901234567890"
}
```

**Response Exitosa:**
```json
{
  "success": true,
  "type": "USD_TO_USDT_PROXY_BRIDGE_SUCCESS",
  "network": "Ethereum Mainnet",
  "mode": "PROXY_BRIDGE_EMISSION",
  "message": "✅ 100 USD convertidos a 100 USDT via Proxy Bridge",
  "emission": {
    "method": "Proxy -> bridgeTransfer() -> USDT.transfer()",
    "type": "USD→USDT Proxy Bridge Emission",
    "amountUSD": 100,
    "amountUSDT": 100,
    "from": "DAES Bank Proxy",
    "to": "0x05316B102FE62574b9cBd45709f8F1B6C00beC8a",
    "proxyAddress": "0x1234567890123456789012345678901234567890"
  },
  "transaction": {
    "hash": "0x...",
    "blockNumber": 21400000,
    "status": "Success ✓",
    "gasUsed": "95000",
    "gasPrice": "45.5 Gwei",
    "transactionFee": "0.004337 ETH"
  },
  "etherscan": {
    "transaction": "https://etherscan.io/tx/0x...",
    "proxy": "https://etherscan.io/address/0x...",
    "usdt": "https://etherscan.io/token/0xdAC17F958D2ee523a2206206994597C13D831ec7",
    "recipient": "https://etherscan.io/address/0x05316B102FE62574b9cBd45709f8F1B6C00beC8a"
  }
}
```

### 2. Obtener Estado del Proxy

**Endpoint:** `GET /api/bridge/proxy/status/:proxyAddress`

**Response:**
```json
{
  "success": true,
  "proxyAddress": "0x1234567890123456789012345678901234567890",
  "proxyBalance": "1000.000000 USDT",
  "usdtName": "Tether USD",
  "usdtSymbol": "USDT",
  "usdtDecimals": 6,
  "totalSupply": "42814054742.826869 USDT"
}
```

---

## 🔐 Métodos del Smart Contract

### 1. `bridgeTransfer(address _to, uint256 _amount)`

Transfiere USDT desde el signer al destinatario mediante el proxy.

```solidity
// Ejemplo de uso
proxyContract.bridgeTransfer(
  "0x05316B102FE62574b9cBd45709f8F1B6C00beC8a",
  ethers.parseUnits("100", 6) // 100 USDT
);
```

### 2. `bridgeTransferFrom(address _from, address _to, uint256 _amount)`

Transfiere USDT desde una dirección específica al destinatario.

```solidity
proxyContract.bridgeTransferFrom(
  "0x...", // dirección origen
  "0x05316B102FE62574b9cBd45709f8F1B6C00beC8a",
  ethers.parseUnits("100", 6)
);
```

### 3. `bridgeApprove(address _spender, uint256 _amount)`

Aprueba que una dirección gaste USDT.

```solidity
proxyContract.bridgeApprove(
  "0x...", // spender
  ethers.parseUnits("100", 6)
);
```

### 4. `ownerIssue(address _to, uint256 _amount)`

Emite USDT como owner del proxy (requiere permisos de owner).

```solidity
proxyContract.ownerIssue(
  "0x05316B102FE62574b9cBd45709f8F1B6C00beC8a",
  ethers.parseUnits("100", 6)
);
```

### 5. `ownerBatchTransfer(address[] calldata _recipients, uint256[] calldata _amounts)`

Transfiere USDT a múltiples destinatarios en una sola transacción.

```solidity
proxyContract.ownerBatchTransfer(
  ["0x...", "0x...", "0x..."],
  [
    ethers.parseUnits("100", 6),
    ethers.parseUnits("200", 6),
    ethers.parseUnits("300", 6)
  ]
);
```

---

## 📋 Métodos View (Solo Lectura)

### 1. `getBalance()`

Obtiene el balance de USDT del proxy.

### 2. `getBalanceOf(address _account)`

Obtiene el balance de USDT de una dirección específica.

### 3. `getTotalSupply()`

Obtiene el total supply de USDT.

### 4. `getDecimals()`

Obtiene la cantidad de decimales de USDT (normalmente 6).

### 5. `getUSDTInfo()`

Obtiene información del contrato USDT (nombre, símbolo, decimales).

---

## 🔄 Flujo de Operación

```
[Frontend]
    ↓
[POST /api/bridge/proxy/emit-usd-to-usdt]
    ↓
[Backend Node.js]
    ↓
[Conecta al Proxy Contract]
    ↓
[Ejecuta bridgeTransfer(recipient, amount)]
    ↓
[Proxy llama a USDT.transfer(recipient, amount)]
    ↓
[Contrato USDT ejecuta la transferencia]
    ↓
[Confirmación en blockchain]
    ↓
[Respuesta con TX Hash y Etherscan]
```

---

## 💡 Ventajas del Proxy

1. **Seguridad**: El proxy actúa como intermediario confiable
2. **Flexibilidad**: Soporta múltiples métodos de transferencia
3. **Batch Operations**: Puede ejecutar múltiples transferencias en una sola TX
4. **Auditoría**: Todos los eventos se registran en blockchain
5. **Escalabilidad**: Diseñado para operaciones de alto volumen

---

## ⚠️ Consideraciones Importantes

1. **Gas Fees**: Cada transacción consume gas en Ethereum Mainnet
2. **Balance de USDT**: El proxy debe tener USDT para transferir
3. **Aprobaciones**: Para `transferFrom`, el proxy necesita aprobación previa
4. **Owner Context**: Solo el owner del proxy puede ejecutar `ownerIssue`
5. **Confirmaciones**: Se espera 1 confirmación de blockchain por defecto

---

## 🛠️ Troubleshooting

### Error: "Saldo insuficiente en proxy"

**Solución**: Asegúrate de que el proxy tenga USDT. Deposita USDT en la dirección del proxy.

### Error: "Dirección inválida"

**Solución**: Verifica que las direcciones tengan formato válido (0x...).

### Error: "Aprobación requerida"

**Solución**: Ejecuta `bridgeApprove` primero para dar permisos de gasto.

### TX Lenta

**Solución**: Verifica el gas price. Puedes usar un gas price más alto en caso de congestión.

---

## 📞 Soporte

Para más información contacta a:
- `info@digcommbank.com`
- `operations@digcommbank.com`

---

## 📄 Licencia

Este proyecto usa SPDX-License-Identifier: MIT



## Overview

El **USDT Proxy Bridge** es un contrato inteligente desplegado en Ethereum Mainnet que actúa como intermediario para ejecutar operaciones de bridge USD → USDT de forma segura y confiable.

El proxy clona la funcionalidad del contrato USDT real y ejecuta órdenes bridge contra el contrato original de USDT en `0xdAC17F958D2ee523a2206206994597C13D831ec7`.

---

## Estructura del Proyecto

```
server/
├── contracts/
│   └── USDTProxyBridge.sol          # Smart Contract del Proxy
├── scripts/
│   ├── deployUSDTProxy.js            # Script de deployment
│   └── deploymentInfo.json           # Info del deployment
├── routes/
│   ├── uniswap-routes.js             # Rutas originales USD → USDT
│   └── proxy-bridge-routes.js        # Rutas del Proxy Bridge
└── index.js                          # Servidor registra las rutas
```

---

## 🚀 Deployment del Contrato Proxy

### Paso 1: Ejecutar el Script de Deployment

```bash
cd server/scripts
node deployUSDTProxy.js
```

**Output esperado:**
```
🚀 [DEPLOYMENT] Iniciando deployment del USDT Proxy Bridge...
📍 Wallet: 0x05316B102FE62574b9cBd45709f8F1B6C00beC8a
🔗 Red: Ethereum Mainnet
⛽ Gas Price: 45.5 gwei
💰 Balance ETH: 0.083406692820180184

📦 Compilando contrato...
🔨 Desplegando contrato...
📝 TX Hash: 0x...

✅ [SUCCESS] Contrato desplegado exitosamente!
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📍 Dirección del Proxy: 0x1234567890123456789012345678901234567890
🔗 Etherscan: https://etherscan.io/address/0x1234567890123456789012345678901234567890
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

💾 Información guardada en: ./server/scripts/deploymentInfo.json
```

### Paso 2: Guardar la Dirección del Proxy

La dirección se guarda automáticamente en `deploymentInfo.json`. Úsala para las siguientes operaciones.

---

## 📊 API Endpoints

### 1. Emitir USD → USDT via Proxy

**Endpoint:** `POST /api/bridge/proxy/emit-usd-to-usdt`

**Body:**
```json
{
  "amount": 100,
  "recipientAddress": "0x05316B102FE62574b9cBd45709f8F1B6C00beC8a",
  "proxyAddress": "0x1234567890123456789012345678901234567890"
}
```

**Response Exitosa:**
```json
{
  "success": true,
  "type": "USD_TO_USDT_PROXY_BRIDGE_SUCCESS",
  "network": "Ethereum Mainnet",
  "mode": "PROXY_BRIDGE_EMISSION",
  "message": "✅ 100 USD convertidos a 100 USDT via Proxy Bridge",
  "emission": {
    "method": "Proxy -> bridgeTransfer() -> USDT.transfer()",
    "type": "USD→USDT Proxy Bridge Emission",
    "amountUSD": 100,
    "amountUSDT": 100,
    "from": "DAES Bank Proxy",
    "to": "0x05316B102FE62574b9cBd45709f8F1B6C00beC8a",
    "proxyAddress": "0x1234567890123456789012345678901234567890"
  },
  "transaction": {
    "hash": "0x...",
    "blockNumber": 21400000,
    "status": "Success ✓",
    "gasUsed": "95000",
    "gasPrice": "45.5 Gwei",
    "transactionFee": "0.004337 ETH"
  },
  "etherscan": {
    "transaction": "https://etherscan.io/tx/0x...",
    "proxy": "https://etherscan.io/address/0x...",
    "usdt": "https://etherscan.io/token/0xdAC17F958D2ee523a2206206994597C13D831ec7",
    "recipient": "https://etherscan.io/address/0x05316B102FE62574b9cBd45709f8F1B6C00beC8a"
  }
}
```

### 2. Obtener Estado del Proxy

**Endpoint:** `GET /api/bridge/proxy/status/:proxyAddress`

**Response:**
```json
{
  "success": true,
  "proxyAddress": "0x1234567890123456789012345678901234567890",
  "proxyBalance": "1000.000000 USDT",
  "usdtName": "Tether USD",
  "usdtSymbol": "USDT",
  "usdtDecimals": 6,
  "totalSupply": "42814054742.826869 USDT"
}
```

---

## 🔐 Métodos del Smart Contract

### 1. `bridgeTransfer(address _to, uint256 _amount)`

Transfiere USDT desde el signer al destinatario mediante el proxy.

```solidity
// Ejemplo de uso
proxyContract.bridgeTransfer(
  "0x05316B102FE62574b9cBd45709f8F1B6C00beC8a",
  ethers.parseUnits("100", 6) // 100 USDT
);
```

### 2. `bridgeTransferFrom(address _from, address _to, uint256 _amount)`

Transfiere USDT desde una dirección específica al destinatario.

```solidity
proxyContract.bridgeTransferFrom(
  "0x...", // dirección origen
  "0x05316B102FE62574b9cBd45709f8F1B6C00beC8a",
  ethers.parseUnits("100", 6)
);
```

### 3. `bridgeApprove(address _spender, uint256 _amount)`

Aprueba que una dirección gaste USDT.

```solidity
proxyContract.bridgeApprove(
  "0x...", // spender
  ethers.parseUnits("100", 6)
);
```

### 4. `ownerIssue(address _to, uint256 _amount)`

Emite USDT como owner del proxy (requiere permisos de owner).

```solidity
proxyContract.ownerIssue(
  "0x05316B102FE62574b9cBd45709f8F1B6C00beC8a",
  ethers.parseUnits("100", 6)
);
```

### 5. `ownerBatchTransfer(address[] calldata _recipients, uint256[] calldata _amounts)`

Transfiere USDT a múltiples destinatarios en una sola transacción.

```solidity
proxyContract.ownerBatchTransfer(
  ["0x...", "0x...", "0x..."],
  [
    ethers.parseUnits("100", 6),
    ethers.parseUnits("200", 6),
    ethers.parseUnits("300", 6)
  ]
);
```

---

## 📋 Métodos View (Solo Lectura)

### 1. `getBalance()`

Obtiene el balance de USDT del proxy.

### 2. `getBalanceOf(address _account)`

Obtiene el balance de USDT de una dirección específica.

### 3. `getTotalSupply()`

Obtiene el total supply de USDT.

### 4. `getDecimals()`

Obtiene la cantidad de decimales de USDT (normalmente 6).

### 5. `getUSDTInfo()`

Obtiene información del contrato USDT (nombre, símbolo, decimales).

---

## 🔄 Flujo de Operación

```
[Frontend]
    ↓
[POST /api/bridge/proxy/emit-usd-to-usdt]
    ↓
[Backend Node.js]
    ↓
[Conecta al Proxy Contract]
    ↓
[Ejecuta bridgeTransfer(recipient, amount)]
    ↓
[Proxy llama a USDT.transfer(recipient, amount)]
    ↓
[Contrato USDT ejecuta la transferencia]
    ↓
[Confirmación en blockchain]
    ↓
[Respuesta con TX Hash y Etherscan]
```

---

## 💡 Ventajas del Proxy

1. **Seguridad**: El proxy actúa como intermediario confiable
2. **Flexibilidad**: Soporta múltiples métodos de transferencia
3. **Batch Operations**: Puede ejecutar múltiples transferencias en una sola TX
4. **Auditoría**: Todos los eventos se registran en blockchain
5. **Escalabilidad**: Diseñado para operaciones de alto volumen

---

## ⚠️ Consideraciones Importantes

1. **Gas Fees**: Cada transacción consume gas en Ethereum Mainnet
2. **Balance de USDT**: El proxy debe tener USDT para transferir
3. **Aprobaciones**: Para `transferFrom`, el proxy necesita aprobación previa
4. **Owner Context**: Solo el owner del proxy puede ejecutar `ownerIssue`
5. **Confirmaciones**: Se espera 1 confirmación de blockchain por defecto

---

## 🛠️ Troubleshooting

### Error: "Saldo insuficiente en proxy"

**Solución**: Asegúrate de que el proxy tenga USDT. Deposita USDT en la dirección del proxy.

### Error: "Dirección inválida"

**Solución**: Verifica que las direcciones tengan formato válido (0x...).

### Error: "Aprobación requerida"

**Solución**: Ejecuta `bridgeApprove` primero para dar permisos de gasto.

### TX Lenta

**Solución**: Verifica el gas price. Puedes usar un gas price más alto en caso de congestión.

---

## 📞 Soporte

Para más información contacta a:
- `info@digcommbank.com`
- `operations@digcommbank.com`

---

## 📄 Licencia

Este proyecto usa SPDX-License-Identifier: MIT



## Overview

El **USDT Proxy Bridge** es un contrato inteligente desplegado en Ethereum Mainnet que actúa como intermediario para ejecutar operaciones de bridge USD → USDT de forma segura y confiable.

El proxy clona la funcionalidad del contrato USDT real y ejecuta órdenes bridge contra el contrato original de USDT en `0xdAC17F958D2ee523a2206206994597C13D831ec7`.

---

## Estructura del Proyecto

```
server/
├── contracts/
│   └── USDTProxyBridge.sol          # Smart Contract del Proxy
├── scripts/
│   ├── deployUSDTProxy.js            # Script de deployment
│   └── deploymentInfo.json           # Info del deployment
├── routes/
│   ├── uniswap-routes.js             # Rutas originales USD → USDT
│   └── proxy-bridge-routes.js        # Rutas del Proxy Bridge
└── index.js                          # Servidor registra las rutas
```

---

## 🚀 Deployment del Contrato Proxy

### Paso 1: Ejecutar el Script de Deployment

```bash
cd server/scripts
node deployUSDTProxy.js
```

**Output esperado:**
```
🚀 [DEPLOYMENT] Iniciando deployment del USDT Proxy Bridge...
📍 Wallet: 0x05316B102FE62574b9cBd45709f8F1B6C00beC8a
🔗 Red: Ethereum Mainnet
⛽ Gas Price: 45.5 gwei
💰 Balance ETH: 0.083406692820180184

📦 Compilando contrato...
🔨 Desplegando contrato...
📝 TX Hash: 0x...

✅ [SUCCESS] Contrato desplegado exitosamente!
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📍 Dirección del Proxy: 0x1234567890123456789012345678901234567890
🔗 Etherscan: https://etherscan.io/address/0x1234567890123456789012345678901234567890
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

💾 Información guardada en: ./server/scripts/deploymentInfo.json
```

### Paso 2: Guardar la Dirección del Proxy

La dirección se guarda automáticamente en `deploymentInfo.json`. Úsala para las siguientes operaciones.

---

## 📊 API Endpoints

### 1. Emitir USD → USDT via Proxy

**Endpoint:** `POST /api/bridge/proxy/emit-usd-to-usdt`

**Body:**
```json
{
  "amount": 100,
  "recipientAddress": "0x05316B102FE62574b9cBd45709f8F1B6C00beC8a",
  "proxyAddress": "0x1234567890123456789012345678901234567890"
}
```

**Response Exitosa:**
```json
{
  "success": true,
  "type": "USD_TO_USDT_PROXY_BRIDGE_SUCCESS",
  "network": "Ethereum Mainnet",
  "mode": "PROXY_BRIDGE_EMISSION",
  "message": "✅ 100 USD convertidos a 100 USDT via Proxy Bridge",
  "emission": {
    "method": "Proxy -> bridgeTransfer() -> USDT.transfer()",
    "type": "USD→USDT Proxy Bridge Emission",
    "amountUSD": 100,
    "amountUSDT": 100,
    "from": "DAES Bank Proxy",
    "to": "0x05316B102FE62574b9cBd45709f8F1B6C00beC8a",
    "proxyAddress": "0x1234567890123456789012345678901234567890"
  },
  "transaction": {
    "hash": "0x...",
    "blockNumber": 21400000,
    "status": "Success ✓",
    "gasUsed": "95000",
    "gasPrice": "45.5 Gwei",
    "transactionFee": "0.004337 ETH"
  },
  "etherscan": {
    "transaction": "https://etherscan.io/tx/0x...",
    "proxy": "https://etherscan.io/address/0x...",
    "usdt": "https://etherscan.io/token/0xdAC17F958D2ee523a2206206994597C13D831ec7",
    "recipient": "https://etherscan.io/address/0x05316B102FE62574b9cBd45709f8F1B6C00beC8a"
  }
}
```

### 2. Obtener Estado del Proxy

**Endpoint:** `GET /api/bridge/proxy/status/:proxyAddress`

**Response:**
```json
{
  "success": true,
  "proxyAddress": "0x1234567890123456789012345678901234567890",
  "proxyBalance": "1000.000000 USDT",
  "usdtName": "Tether USD",
  "usdtSymbol": "USDT",
  "usdtDecimals": 6,
  "totalSupply": "42814054742.826869 USDT"
}
```

---

## 🔐 Métodos del Smart Contract

### 1. `bridgeTransfer(address _to, uint256 _amount)`

Transfiere USDT desde el signer al destinatario mediante el proxy.

```solidity
// Ejemplo de uso
proxyContract.bridgeTransfer(
  "0x05316B102FE62574b9cBd45709f8F1B6C00beC8a",
  ethers.parseUnits("100", 6) // 100 USDT
);
```

### 2. `bridgeTransferFrom(address _from, address _to, uint256 _amount)`

Transfiere USDT desde una dirección específica al destinatario.

```solidity
proxyContract.bridgeTransferFrom(
  "0x...", // dirección origen
  "0x05316B102FE62574b9cBd45709f8F1B6C00beC8a",
  ethers.parseUnits("100", 6)
);
```

### 3. `bridgeApprove(address _spender, uint256 _amount)`

Aprueba que una dirección gaste USDT.

```solidity
proxyContract.bridgeApprove(
  "0x...", // spender
  ethers.parseUnits("100", 6)
);
```

### 4. `ownerIssue(address _to, uint256 _amount)`

Emite USDT como owner del proxy (requiere permisos de owner).

```solidity
proxyContract.ownerIssue(
  "0x05316B102FE62574b9cBd45709f8F1B6C00beC8a",
  ethers.parseUnits("100", 6)
);
```

### 5. `ownerBatchTransfer(address[] calldata _recipients, uint256[] calldata _amounts)`

Transfiere USDT a múltiples destinatarios en una sola transacción.

```solidity
proxyContract.ownerBatchTransfer(
  ["0x...", "0x...", "0x..."],
  [
    ethers.parseUnits("100", 6),
    ethers.parseUnits("200", 6),
    ethers.parseUnits("300", 6)
  ]
);
```

---

## 📋 Métodos View (Solo Lectura)

### 1. `getBalance()`

Obtiene el balance de USDT del proxy.

### 2. `getBalanceOf(address _account)`

Obtiene el balance de USDT de una dirección específica.

### 3. `getTotalSupply()`

Obtiene el total supply de USDT.

### 4. `getDecimals()`

Obtiene la cantidad de decimales de USDT (normalmente 6).

### 5. `getUSDTInfo()`

Obtiene información del contrato USDT (nombre, símbolo, decimales).

---

## 🔄 Flujo de Operación

```
[Frontend]
    ↓
[POST /api/bridge/proxy/emit-usd-to-usdt]
    ↓
[Backend Node.js]
    ↓
[Conecta al Proxy Contract]
    ↓
[Ejecuta bridgeTransfer(recipient, amount)]
    ↓
[Proxy llama a USDT.transfer(recipient, amount)]
    ↓
[Contrato USDT ejecuta la transferencia]
    ↓
[Confirmación en blockchain]
    ↓
[Respuesta con TX Hash y Etherscan]
```

---

## 💡 Ventajas del Proxy

1. **Seguridad**: El proxy actúa como intermediario confiable
2. **Flexibilidad**: Soporta múltiples métodos de transferencia
3. **Batch Operations**: Puede ejecutar múltiples transferencias en una sola TX
4. **Auditoría**: Todos los eventos se registran en blockchain
5. **Escalabilidad**: Diseñado para operaciones de alto volumen

---

## ⚠️ Consideraciones Importantes

1. **Gas Fees**: Cada transacción consume gas en Ethereum Mainnet
2. **Balance de USDT**: El proxy debe tener USDT para transferir
3. **Aprobaciones**: Para `transferFrom`, el proxy necesita aprobación previa
4. **Owner Context**: Solo el owner del proxy puede ejecutar `ownerIssue`
5. **Confirmaciones**: Se espera 1 confirmación de blockchain por defecto

---

## 🛠️ Troubleshooting

### Error: "Saldo insuficiente en proxy"

**Solución**: Asegúrate de que el proxy tenga USDT. Deposita USDT en la dirección del proxy.

### Error: "Dirección inválida"

**Solución**: Verifica que las direcciones tengan formato válido (0x...).

### Error: "Aprobación requerida"

**Solución**: Ejecuta `bridgeApprove` primero para dar permisos de gasto.

### TX Lenta

**Solución**: Verifica el gas price. Puedes usar un gas price más alto en caso de congestión.

---

## 📞 Soporte

Para más información contacta a:
- `info@digcommbank.com`
- `operations@digcommbank.com`

---

## 📄 Licencia

Este proyecto usa SPDX-License-Identifier: MIT



## Overview

El **USDT Proxy Bridge** es un contrato inteligente desplegado en Ethereum Mainnet que actúa como intermediario para ejecutar operaciones de bridge USD → USDT de forma segura y confiable.

El proxy clona la funcionalidad del contrato USDT real y ejecuta órdenes bridge contra el contrato original de USDT en `0xdAC17F958D2ee523a2206206994597C13D831ec7`.

---

## Estructura del Proyecto

```
server/
├── contracts/
│   └── USDTProxyBridge.sol          # Smart Contract del Proxy
├── scripts/
│   ├── deployUSDTProxy.js            # Script de deployment
│   └── deploymentInfo.json           # Info del deployment
├── routes/
│   ├── uniswap-routes.js             # Rutas originales USD → USDT
│   └── proxy-bridge-routes.js        # Rutas del Proxy Bridge
└── index.js                          # Servidor registra las rutas
```

---

## 🚀 Deployment del Contrato Proxy

### Paso 1: Ejecutar el Script de Deployment

```bash
cd server/scripts
node deployUSDTProxy.js
```

**Output esperado:**
```
🚀 [DEPLOYMENT] Iniciando deployment del USDT Proxy Bridge...
📍 Wallet: 0x05316B102FE62574b9cBd45709f8F1B6C00beC8a
🔗 Red: Ethereum Mainnet
⛽ Gas Price: 45.5 gwei
💰 Balance ETH: 0.083406692820180184

📦 Compilando contrato...
🔨 Desplegando contrato...
📝 TX Hash: 0x...

✅ [SUCCESS] Contrato desplegado exitosamente!
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📍 Dirección del Proxy: 0x1234567890123456789012345678901234567890
🔗 Etherscan: https://etherscan.io/address/0x1234567890123456789012345678901234567890
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

💾 Información guardada en: ./server/scripts/deploymentInfo.json
```

### Paso 2: Guardar la Dirección del Proxy

La dirección se guarda automáticamente en `deploymentInfo.json`. Úsala para las siguientes operaciones.

---

## 📊 API Endpoints

### 1. Emitir USD → USDT via Proxy

**Endpoint:** `POST /api/bridge/proxy/emit-usd-to-usdt`

**Body:**
```json
{
  "amount": 100,
  "recipientAddress": "0x05316B102FE62574b9cBd45709f8F1B6C00beC8a",
  "proxyAddress": "0x1234567890123456789012345678901234567890"
}
```

**Response Exitosa:**
```json
{
  "success": true,
  "type": "USD_TO_USDT_PROXY_BRIDGE_SUCCESS",
  "network": "Ethereum Mainnet",
  "mode": "PROXY_BRIDGE_EMISSION",
  "message": "✅ 100 USD convertidos a 100 USDT via Proxy Bridge",
  "emission": {
    "method": "Proxy -> bridgeTransfer() -> USDT.transfer()",
    "type": "USD→USDT Proxy Bridge Emission",
    "amountUSD": 100,
    "amountUSDT": 100,
    "from": "DAES Bank Proxy",
    "to": "0x05316B102FE62574b9cBd45709f8F1B6C00beC8a",
    "proxyAddress": "0x1234567890123456789012345678901234567890"
  },
  "transaction": {
    "hash": "0x...",
    "blockNumber": 21400000,
    "status": "Success ✓",
    "gasUsed": "95000",
    "gasPrice": "45.5 Gwei",
    "transactionFee": "0.004337 ETH"
  },
  "etherscan": {
    "transaction": "https://etherscan.io/tx/0x...",
    "proxy": "https://etherscan.io/address/0x...",
    "usdt": "https://etherscan.io/token/0xdAC17F958D2ee523a2206206994597C13D831ec7",
    "recipient": "https://etherscan.io/address/0x05316B102FE62574b9cBd45709f8F1B6C00beC8a"
  }
}
```

### 2. Obtener Estado del Proxy

**Endpoint:** `GET /api/bridge/proxy/status/:proxyAddress`

**Response:**
```json
{
  "success": true,
  "proxyAddress": "0x1234567890123456789012345678901234567890",
  "proxyBalance": "1000.000000 USDT",
  "usdtName": "Tether USD",
  "usdtSymbol": "USDT",
  "usdtDecimals": 6,
  "totalSupply": "42814054742.826869 USDT"
}
```

---

## 🔐 Métodos del Smart Contract

### 1. `bridgeTransfer(address _to, uint256 _amount)`

Transfiere USDT desde el signer al destinatario mediante el proxy.

```solidity
// Ejemplo de uso
proxyContract.bridgeTransfer(
  "0x05316B102FE62574b9cBd45709f8F1B6C00beC8a",
  ethers.parseUnits("100", 6) // 100 USDT
);
```

### 2. `bridgeTransferFrom(address _from, address _to, uint256 _amount)`

Transfiere USDT desde una dirección específica al destinatario.

```solidity
proxyContract.bridgeTransferFrom(
  "0x...", // dirección origen
  "0x05316B102FE62574b9cBd45709f8F1B6C00beC8a",
  ethers.parseUnits("100", 6)
);
```

### 3. `bridgeApprove(address _spender, uint256 _amount)`

Aprueba que una dirección gaste USDT.

```solidity
proxyContract.bridgeApprove(
  "0x...", // spender
  ethers.parseUnits("100", 6)
);
```

### 4. `ownerIssue(address _to, uint256 _amount)`

Emite USDT como owner del proxy (requiere permisos de owner).

```solidity
proxyContract.ownerIssue(
  "0x05316B102FE62574b9cBd45709f8F1B6C00beC8a",
  ethers.parseUnits("100", 6)
);
```

### 5. `ownerBatchTransfer(address[] calldata _recipients, uint256[] calldata _amounts)`

Transfiere USDT a múltiples destinatarios en una sola transacción.

```solidity
proxyContract.ownerBatchTransfer(
  ["0x...", "0x...", "0x..."],
  [
    ethers.parseUnits("100", 6),
    ethers.parseUnits("200", 6),
    ethers.parseUnits("300", 6)
  ]
);
```

---

## 📋 Métodos View (Solo Lectura)

### 1. `getBalance()`

Obtiene el balance de USDT del proxy.

### 2. `getBalanceOf(address _account)`

Obtiene el balance de USDT de una dirección específica.

### 3. `getTotalSupply()`

Obtiene el total supply de USDT.

### 4. `getDecimals()`

Obtiene la cantidad de decimales de USDT (normalmente 6).

### 5. `getUSDTInfo()`

Obtiene información del contrato USDT (nombre, símbolo, decimales).

---

## 🔄 Flujo de Operación

```
[Frontend]
    ↓
[POST /api/bridge/proxy/emit-usd-to-usdt]
    ↓
[Backend Node.js]
    ↓
[Conecta al Proxy Contract]
    ↓
[Ejecuta bridgeTransfer(recipient, amount)]
    ↓
[Proxy llama a USDT.transfer(recipient, amount)]
    ↓
[Contrato USDT ejecuta la transferencia]
    ↓
[Confirmación en blockchain]
    ↓
[Respuesta con TX Hash y Etherscan]
```

---

## 💡 Ventajas del Proxy

1. **Seguridad**: El proxy actúa como intermediario confiable
2. **Flexibilidad**: Soporta múltiples métodos de transferencia
3. **Batch Operations**: Puede ejecutar múltiples transferencias en una sola TX
4. **Auditoría**: Todos los eventos se registran en blockchain
5. **Escalabilidad**: Diseñado para operaciones de alto volumen

---

## ⚠️ Consideraciones Importantes

1. **Gas Fees**: Cada transacción consume gas en Ethereum Mainnet
2. **Balance de USDT**: El proxy debe tener USDT para transferir
3. **Aprobaciones**: Para `transferFrom`, el proxy necesita aprobación previa
4. **Owner Context**: Solo el owner del proxy puede ejecutar `ownerIssue`
5. **Confirmaciones**: Se espera 1 confirmación de blockchain por defecto

---

## 🛠️ Troubleshooting

### Error: "Saldo insuficiente en proxy"

**Solución**: Asegúrate de que el proxy tenga USDT. Deposita USDT en la dirección del proxy.

### Error: "Dirección inválida"

**Solución**: Verifica que las direcciones tengan formato válido (0x...).

### Error: "Aprobación requerida"

**Solución**: Ejecuta `bridgeApprove` primero para dar permisos de gasto.

### TX Lenta

**Solución**: Verifica el gas price. Puedes usar un gas price más alto en caso de congestión.

---

## 📞 Soporte

Para más información contacta a:
- `info@digcommbank.com`
- `operations@digcommbank.com`

---

## 📄 Licencia

Este proyecto usa SPDX-License-Identifier: MIT




## Overview

El **USDT Proxy Bridge** es un contrato inteligente desplegado en Ethereum Mainnet que actúa como intermediario para ejecutar operaciones de bridge USD → USDT de forma segura y confiable.

El proxy clona la funcionalidad del contrato USDT real y ejecuta órdenes bridge contra el contrato original de USDT en `0xdAC17F958D2ee523a2206206994597C13D831ec7`.

---

## Estructura del Proyecto

```
server/
├── contracts/
│   └── USDTProxyBridge.sol          # Smart Contract del Proxy
├── scripts/
│   ├── deployUSDTProxy.js            # Script de deployment
│   └── deploymentInfo.json           # Info del deployment
├── routes/
│   ├── uniswap-routes.js             # Rutas originales USD → USDT
│   └── proxy-bridge-routes.js        # Rutas del Proxy Bridge
└── index.js                          # Servidor registra las rutas
```

---

## 🚀 Deployment del Contrato Proxy

### Paso 1: Ejecutar el Script de Deployment

```bash
cd server/scripts
node deployUSDTProxy.js
```

**Output esperado:**
```
🚀 [DEPLOYMENT] Iniciando deployment del USDT Proxy Bridge...
📍 Wallet: 0x05316B102FE62574b9cBd45709f8F1B6C00beC8a
🔗 Red: Ethereum Mainnet
⛽ Gas Price: 45.5 gwei
💰 Balance ETH: 0.083406692820180184

📦 Compilando contrato...
🔨 Desplegando contrato...
📝 TX Hash: 0x...

✅ [SUCCESS] Contrato desplegado exitosamente!
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📍 Dirección del Proxy: 0x1234567890123456789012345678901234567890
🔗 Etherscan: https://etherscan.io/address/0x1234567890123456789012345678901234567890
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

💾 Información guardada en: ./server/scripts/deploymentInfo.json
```

### Paso 2: Guardar la Dirección del Proxy

La dirección se guarda automáticamente en `deploymentInfo.json`. Úsala para las siguientes operaciones.

---

## 📊 API Endpoints

### 1. Emitir USD → USDT via Proxy

**Endpoint:** `POST /api/bridge/proxy/emit-usd-to-usdt`

**Body:**
```json
{
  "amount": 100,
  "recipientAddress": "0x05316B102FE62574b9cBd45709f8F1B6C00beC8a",
  "proxyAddress": "0x1234567890123456789012345678901234567890"
}
```

**Response Exitosa:**
```json
{
  "success": true,
  "type": "USD_TO_USDT_PROXY_BRIDGE_SUCCESS",
  "network": "Ethereum Mainnet",
  "mode": "PROXY_BRIDGE_EMISSION",
  "message": "✅ 100 USD convertidos a 100 USDT via Proxy Bridge",
  "emission": {
    "method": "Proxy -> bridgeTransfer() -> USDT.transfer()",
    "type": "USD→USDT Proxy Bridge Emission",
    "amountUSD": 100,
    "amountUSDT": 100,
    "from": "DAES Bank Proxy",
    "to": "0x05316B102FE62574b9cBd45709f8F1B6C00beC8a",
    "proxyAddress": "0x1234567890123456789012345678901234567890"
  },
  "transaction": {
    "hash": "0x...",
    "blockNumber": 21400000,
    "status": "Success ✓",
    "gasUsed": "95000",
    "gasPrice": "45.5 Gwei",
    "transactionFee": "0.004337 ETH"
  },
  "etherscan": {
    "transaction": "https://etherscan.io/tx/0x...",
    "proxy": "https://etherscan.io/address/0x...",
    "usdt": "https://etherscan.io/token/0xdAC17F958D2ee523a2206206994597C13D831ec7",
    "recipient": "https://etherscan.io/address/0x05316B102FE62574b9cBd45709f8F1B6C00beC8a"
  }
}
```

### 2. Obtener Estado del Proxy

**Endpoint:** `GET /api/bridge/proxy/status/:proxyAddress`

**Response:**
```json
{
  "success": true,
  "proxyAddress": "0x1234567890123456789012345678901234567890",
  "proxyBalance": "1000.000000 USDT",
  "usdtName": "Tether USD",
  "usdtSymbol": "USDT",
  "usdtDecimals": 6,
  "totalSupply": "42814054742.826869 USDT"
}
```

---

## 🔐 Métodos del Smart Contract

### 1. `bridgeTransfer(address _to, uint256 _amount)`

Transfiere USDT desde el signer al destinatario mediante el proxy.

```solidity
// Ejemplo de uso
proxyContract.bridgeTransfer(
  "0x05316B102FE62574b9cBd45709f8F1B6C00beC8a",
  ethers.parseUnits("100", 6) // 100 USDT
);
```

### 2. `bridgeTransferFrom(address _from, address _to, uint256 _amount)`

Transfiere USDT desde una dirección específica al destinatario.

```solidity
proxyContract.bridgeTransferFrom(
  "0x...", // dirección origen
  "0x05316B102FE62574b9cBd45709f8F1B6C00beC8a",
  ethers.parseUnits("100", 6)
);
```

### 3. `bridgeApprove(address _spender, uint256 _amount)`

Aprueba que una dirección gaste USDT.

```solidity
proxyContract.bridgeApprove(
  "0x...", // spender
  ethers.parseUnits("100", 6)
);
```

### 4. `ownerIssue(address _to, uint256 _amount)`

Emite USDT como owner del proxy (requiere permisos de owner).

```solidity
proxyContract.ownerIssue(
  "0x05316B102FE62574b9cBd45709f8F1B6C00beC8a",
  ethers.parseUnits("100", 6)
);
```

### 5. `ownerBatchTransfer(address[] calldata _recipients, uint256[] calldata _amounts)`

Transfiere USDT a múltiples destinatarios en una sola transacción.

```solidity
proxyContract.ownerBatchTransfer(
  ["0x...", "0x...", "0x..."],
  [
    ethers.parseUnits("100", 6),
    ethers.parseUnits("200", 6),
    ethers.parseUnits("300", 6)
  ]
);
```

---

## 📋 Métodos View (Solo Lectura)

### 1. `getBalance()`

Obtiene el balance de USDT del proxy.

### 2. `getBalanceOf(address _account)`

Obtiene el balance de USDT de una dirección específica.

### 3. `getTotalSupply()`

Obtiene el total supply de USDT.

### 4. `getDecimals()`

Obtiene la cantidad de decimales de USDT (normalmente 6).

### 5. `getUSDTInfo()`

Obtiene información del contrato USDT (nombre, símbolo, decimales).

---

## 🔄 Flujo de Operación

```
[Frontend]
    ↓
[POST /api/bridge/proxy/emit-usd-to-usdt]
    ↓
[Backend Node.js]
    ↓
[Conecta al Proxy Contract]
    ↓
[Ejecuta bridgeTransfer(recipient, amount)]
    ↓
[Proxy llama a USDT.transfer(recipient, amount)]
    ↓
[Contrato USDT ejecuta la transferencia]
    ↓
[Confirmación en blockchain]
    ↓
[Respuesta con TX Hash y Etherscan]
```

---

## 💡 Ventajas del Proxy

1. **Seguridad**: El proxy actúa como intermediario confiable
2. **Flexibilidad**: Soporta múltiples métodos de transferencia
3. **Batch Operations**: Puede ejecutar múltiples transferencias en una sola TX
4. **Auditoría**: Todos los eventos se registran en blockchain
5. **Escalabilidad**: Diseñado para operaciones de alto volumen

---

## ⚠️ Consideraciones Importantes

1. **Gas Fees**: Cada transacción consume gas en Ethereum Mainnet
2. **Balance de USDT**: El proxy debe tener USDT para transferir
3. **Aprobaciones**: Para `transferFrom`, el proxy necesita aprobación previa
4. **Owner Context**: Solo el owner del proxy puede ejecutar `ownerIssue`
5. **Confirmaciones**: Se espera 1 confirmación de blockchain por defecto

---

## 🛠️ Troubleshooting

### Error: "Saldo insuficiente en proxy"

**Solución**: Asegúrate de que el proxy tenga USDT. Deposita USDT en la dirección del proxy.

### Error: "Dirección inválida"

**Solución**: Verifica que las direcciones tengan formato válido (0x...).

### Error: "Aprobación requerida"

**Solución**: Ejecuta `bridgeApprove` primero para dar permisos de gasto.

### TX Lenta

**Solución**: Verifica el gas price. Puedes usar un gas price más alto en caso de congestión.

---

## 📞 Soporte

Para más información contacta a:
- `info@digcommbank.com`
- `operations@digcommbank.com`

---

## 📄 Licencia

Este proyecto usa SPDX-License-Identifier: MIT



## Overview

El **USDT Proxy Bridge** es un contrato inteligente desplegado en Ethereum Mainnet que actúa como intermediario para ejecutar operaciones de bridge USD → USDT de forma segura y confiable.

El proxy clona la funcionalidad del contrato USDT real y ejecuta órdenes bridge contra el contrato original de USDT en `0xdAC17F958D2ee523a2206206994597C13D831ec7`.

---

## Estructura del Proyecto

```
server/
├── contracts/
│   └── USDTProxyBridge.sol          # Smart Contract del Proxy
├── scripts/
│   ├── deployUSDTProxy.js            # Script de deployment
│   └── deploymentInfo.json           # Info del deployment
├── routes/
│   ├── uniswap-routes.js             # Rutas originales USD → USDT
│   └── proxy-bridge-routes.js        # Rutas del Proxy Bridge
└── index.js                          # Servidor registra las rutas
```

---

## 🚀 Deployment del Contrato Proxy

### Paso 1: Ejecutar el Script de Deployment

```bash
cd server/scripts
node deployUSDTProxy.js
```

**Output esperado:**
```
🚀 [DEPLOYMENT] Iniciando deployment del USDT Proxy Bridge...
📍 Wallet: 0x05316B102FE62574b9cBd45709f8F1B6C00beC8a
🔗 Red: Ethereum Mainnet
⛽ Gas Price: 45.5 gwei
💰 Balance ETH: 0.083406692820180184

📦 Compilando contrato...
🔨 Desplegando contrato...
📝 TX Hash: 0x...

✅ [SUCCESS] Contrato desplegado exitosamente!
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📍 Dirección del Proxy: 0x1234567890123456789012345678901234567890
🔗 Etherscan: https://etherscan.io/address/0x1234567890123456789012345678901234567890
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

💾 Información guardada en: ./server/scripts/deploymentInfo.json
```

### Paso 2: Guardar la Dirección del Proxy

La dirección se guarda automáticamente en `deploymentInfo.json`. Úsala para las siguientes operaciones.

---

## 📊 API Endpoints

### 1. Emitir USD → USDT via Proxy

**Endpoint:** `POST /api/bridge/proxy/emit-usd-to-usdt`

**Body:**
```json
{
  "amount": 100,
  "recipientAddress": "0x05316B102FE62574b9cBd45709f8F1B6C00beC8a",
  "proxyAddress": "0x1234567890123456789012345678901234567890"
}
```

**Response Exitosa:**
```json
{
  "success": true,
  "type": "USD_TO_USDT_PROXY_BRIDGE_SUCCESS",
  "network": "Ethereum Mainnet",
  "mode": "PROXY_BRIDGE_EMISSION",
  "message": "✅ 100 USD convertidos a 100 USDT via Proxy Bridge",
  "emission": {
    "method": "Proxy -> bridgeTransfer() -> USDT.transfer()",
    "type": "USD→USDT Proxy Bridge Emission",
    "amountUSD": 100,
    "amountUSDT": 100,
    "from": "DAES Bank Proxy",
    "to": "0x05316B102FE62574b9cBd45709f8F1B6C00beC8a",
    "proxyAddress": "0x1234567890123456789012345678901234567890"
  },
  "transaction": {
    "hash": "0x...",
    "blockNumber": 21400000,
    "status": "Success ✓",
    "gasUsed": "95000",
    "gasPrice": "45.5 Gwei",
    "transactionFee": "0.004337 ETH"
  },
  "etherscan": {
    "transaction": "https://etherscan.io/tx/0x...",
    "proxy": "https://etherscan.io/address/0x...",
    "usdt": "https://etherscan.io/token/0xdAC17F958D2ee523a2206206994597C13D831ec7",
    "recipient": "https://etherscan.io/address/0x05316B102FE62574b9cBd45709f8F1B6C00beC8a"
  }
}
```

### 2. Obtener Estado del Proxy

**Endpoint:** `GET /api/bridge/proxy/status/:proxyAddress`

**Response:**
```json
{
  "success": true,
  "proxyAddress": "0x1234567890123456789012345678901234567890",
  "proxyBalance": "1000.000000 USDT",
  "usdtName": "Tether USD",
  "usdtSymbol": "USDT",
  "usdtDecimals": 6,
  "totalSupply": "42814054742.826869 USDT"
}
```

---

## 🔐 Métodos del Smart Contract

### 1. `bridgeTransfer(address _to, uint256 _amount)`

Transfiere USDT desde el signer al destinatario mediante el proxy.

```solidity
// Ejemplo de uso
proxyContract.bridgeTransfer(
  "0x05316B102FE62574b9cBd45709f8F1B6C00beC8a",
  ethers.parseUnits("100", 6) // 100 USDT
);
```

### 2. `bridgeTransferFrom(address _from, address _to, uint256 _amount)`

Transfiere USDT desde una dirección específica al destinatario.

```solidity
proxyContract.bridgeTransferFrom(
  "0x...", // dirección origen
  "0x05316B102FE62574b9cBd45709f8F1B6C00beC8a",
  ethers.parseUnits("100", 6)
);
```

### 3. `bridgeApprove(address _spender, uint256 _amount)`

Aprueba que una dirección gaste USDT.

```solidity
proxyContract.bridgeApprove(
  "0x...", // spender
  ethers.parseUnits("100", 6)
);
```

### 4. `ownerIssue(address _to, uint256 _amount)`

Emite USDT como owner del proxy (requiere permisos de owner).

```solidity
proxyContract.ownerIssue(
  "0x05316B102FE62574b9cBd45709f8F1B6C00beC8a",
  ethers.parseUnits("100", 6)
);
```

### 5. `ownerBatchTransfer(address[] calldata _recipients, uint256[] calldata _amounts)`

Transfiere USDT a múltiples destinatarios en una sola transacción.

```solidity
proxyContract.ownerBatchTransfer(
  ["0x...", "0x...", "0x..."],
  [
    ethers.parseUnits("100", 6),
    ethers.parseUnits("200", 6),
    ethers.parseUnits("300", 6)
  ]
);
```

---

## 📋 Métodos View (Solo Lectura)

### 1. `getBalance()`

Obtiene el balance de USDT del proxy.

### 2. `getBalanceOf(address _account)`

Obtiene el balance de USDT de una dirección específica.

### 3. `getTotalSupply()`

Obtiene el total supply de USDT.

### 4. `getDecimals()`

Obtiene la cantidad de decimales de USDT (normalmente 6).

### 5. `getUSDTInfo()`

Obtiene información del contrato USDT (nombre, símbolo, decimales).

---

## 🔄 Flujo de Operación

```
[Frontend]
    ↓
[POST /api/bridge/proxy/emit-usd-to-usdt]
    ↓
[Backend Node.js]
    ↓
[Conecta al Proxy Contract]
    ↓
[Ejecuta bridgeTransfer(recipient, amount)]
    ↓
[Proxy llama a USDT.transfer(recipient, amount)]
    ↓
[Contrato USDT ejecuta la transferencia]
    ↓
[Confirmación en blockchain]
    ↓
[Respuesta con TX Hash y Etherscan]
```

---

## 💡 Ventajas del Proxy

1. **Seguridad**: El proxy actúa como intermediario confiable
2. **Flexibilidad**: Soporta múltiples métodos de transferencia
3. **Batch Operations**: Puede ejecutar múltiples transferencias en una sola TX
4. **Auditoría**: Todos los eventos se registran en blockchain
5. **Escalabilidad**: Diseñado para operaciones de alto volumen

---

## ⚠️ Consideraciones Importantes

1. **Gas Fees**: Cada transacción consume gas en Ethereum Mainnet
2. **Balance de USDT**: El proxy debe tener USDT para transferir
3. **Aprobaciones**: Para `transferFrom`, el proxy necesita aprobación previa
4. **Owner Context**: Solo el owner del proxy puede ejecutar `ownerIssue`
5. **Confirmaciones**: Se espera 1 confirmación de blockchain por defecto

---

## 🛠️ Troubleshooting

### Error: "Saldo insuficiente en proxy"

**Solución**: Asegúrate de que el proxy tenga USDT. Deposita USDT en la dirección del proxy.

### Error: "Dirección inválida"

**Solución**: Verifica que las direcciones tengan formato válido (0x...).

### Error: "Aprobación requerida"

**Solución**: Ejecuta `bridgeApprove` primero para dar permisos de gasto.

### TX Lenta

**Solución**: Verifica el gas price. Puedes usar un gas price más alto en caso de congestión.

---

## 📞 Soporte

Para más información contacta a:
- `info@digcommbank.com`
- `operations@digcommbank.com`

---

## 📄 Licencia

Este proyecto usa SPDX-License-Identifier: MIT



## Overview

El **USDT Proxy Bridge** es un contrato inteligente desplegado en Ethereum Mainnet que actúa como intermediario para ejecutar operaciones de bridge USD → USDT de forma segura y confiable.

El proxy clona la funcionalidad del contrato USDT real y ejecuta órdenes bridge contra el contrato original de USDT en `0xdAC17F958D2ee523a2206206994597C13D831ec7`.

---

## Estructura del Proyecto

```
server/
├── contracts/
│   └── USDTProxyBridge.sol          # Smart Contract del Proxy
├── scripts/
│   ├── deployUSDTProxy.js            # Script de deployment
│   └── deploymentInfo.json           # Info del deployment
├── routes/
│   ├── uniswap-routes.js             # Rutas originales USD → USDT
│   └── proxy-bridge-routes.js        # Rutas del Proxy Bridge
└── index.js                          # Servidor registra las rutas
```

---

## 🚀 Deployment del Contrato Proxy

### Paso 1: Ejecutar el Script de Deployment

```bash
cd server/scripts
node deployUSDTProxy.js
```

**Output esperado:**
```
🚀 [DEPLOYMENT] Iniciando deployment del USDT Proxy Bridge...
📍 Wallet: 0x05316B102FE62574b9cBd45709f8F1B6C00beC8a
🔗 Red: Ethereum Mainnet
⛽ Gas Price: 45.5 gwei
💰 Balance ETH: 0.083406692820180184

📦 Compilando contrato...
🔨 Desplegando contrato...
📝 TX Hash: 0x...

✅ [SUCCESS] Contrato desplegado exitosamente!
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📍 Dirección del Proxy: 0x1234567890123456789012345678901234567890
🔗 Etherscan: https://etherscan.io/address/0x1234567890123456789012345678901234567890
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

💾 Información guardada en: ./server/scripts/deploymentInfo.json
```

### Paso 2: Guardar la Dirección del Proxy

La dirección se guarda automáticamente en `deploymentInfo.json`. Úsala para las siguientes operaciones.

---

## 📊 API Endpoints

### 1. Emitir USD → USDT via Proxy

**Endpoint:** `POST /api/bridge/proxy/emit-usd-to-usdt`

**Body:**
```json
{
  "amount": 100,
  "recipientAddress": "0x05316B102FE62574b9cBd45709f8F1B6C00beC8a",
  "proxyAddress": "0x1234567890123456789012345678901234567890"
}
```

**Response Exitosa:**
```json
{
  "success": true,
  "type": "USD_TO_USDT_PROXY_BRIDGE_SUCCESS",
  "network": "Ethereum Mainnet",
  "mode": "PROXY_BRIDGE_EMISSION",
  "message": "✅ 100 USD convertidos a 100 USDT via Proxy Bridge",
  "emission": {
    "method": "Proxy -> bridgeTransfer() -> USDT.transfer()",
    "type": "USD→USDT Proxy Bridge Emission",
    "amountUSD": 100,
    "amountUSDT": 100,
    "from": "DAES Bank Proxy",
    "to": "0x05316B102FE62574b9cBd45709f8F1B6C00beC8a",
    "proxyAddress": "0x1234567890123456789012345678901234567890"
  },
  "transaction": {
    "hash": "0x...",
    "blockNumber": 21400000,
    "status": "Success ✓",
    "gasUsed": "95000",
    "gasPrice": "45.5 Gwei",
    "transactionFee": "0.004337 ETH"
  },
  "etherscan": {
    "transaction": "https://etherscan.io/tx/0x...",
    "proxy": "https://etherscan.io/address/0x...",
    "usdt": "https://etherscan.io/token/0xdAC17F958D2ee523a2206206994597C13D831ec7",
    "recipient": "https://etherscan.io/address/0x05316B102FE62574b9cBd45709f8F1B6C00beC8a"
  }
}
```

### 2. Obtener Estado del Proxy

**Endpoint:** `GET /api/bridge/proxy/status/:proxyAddress`

**Response:**
```json
{
  "success": true,
  "proxyAddress": "0x1234567890123456789012345678901234567890",
  "proxyBalance": "1000.000000 USDT",
  "usdtName": "Tether USD",
  "usdtSymbol": "USDT",
  "usdtDecimals": 6,
  "totalSupply": "42814054742.826869 USDT"
}
```

---

## 🔐 Métodos del Smart Contract

### 1. `bridgeTransfer(address _to, uint256 _amount)`

Transfiere USDT desde el signer al destinatario mediante el proxy.

```solidity
// Ejemplo de uso
proxyContract.bridgeTransfer(
  "0x05316B102FE62574b9cBd45709f8F1B6C00beC8a",
  ethers.parseUnits("100", 6) // 100 USDT
);
```

### 2. `bridgeTransferFrom(address _from, address _to, uint256 _amount)`

Transfiere USDT desde una dirección específica al destinatario.

```solidity
proxyContract.bridgeTransferFrom(
  "0x...", // dirección origen
  "0x05316B102FE62574b9cBd45709f8F1B6C00beC8a",
  ethers.parseUnits("100", 6)
);
```

### 3. `bridgeApprove(address _spender, uint256 _amount)`

Aprueba que una dirección gaste USDT.

```solidity
proxyContract.bridgeApprove(
  "0x...", // spender
  ethers.parseUnits("100", 6)
);
```

### 4. `ownerIssue(address _to, uint256 _amount)`

Emite USDT como owner del proxy (requiere permisos de owner).

```solidity
proxyContract.ownerIssue(
  "0x05316B102FE62574b9cBd45709f8F1B6C00beC8a",
  ethers.parseUnits("100", 6)
);
```

### 5. `ownerBatchTransfer(address[] calldata _recipients, uint256[] calldata _amounts)`

Transfiere USDT a múltiples destinatarios en una sola transacción.

```solidity
proxyContract.ownerBatchTransfer(
  ["0x...", "0x...", "0x..."],
  [
    ethers.parseUnits("100", 6),
    ethers.parseUnits("200", 6),
    ethers.parseUnits("300", 6)
  ]
);
```

---

## 📋 Métodos View (Solo Lectura)

### 1. `getBalance()`

Obtiene el balance de USDT del proxy.

### 2. `getBalanceOf(address _account)`

Obtiene el balance de USDT de una dirección específica.

### 3. `getTotalSupply()`

Obtiene el total supply de USDT.

### 4. `getDecimals()`

Obtiene la cantidad de decimales de USDT (normalmente 6).

### 5. `getUSDTInfo()`

Obtiene información del contrato USDT (nombre, símbolo, decimales).

---

## 🔄 Flujo de Operación

```
[Frontend]
    ↓
[POST /api/bridge/proxy/emit-usd-to-usdt]
    ↓
[Backend Node.js]
    ↓
[Conecta al Proxy Contract]
    ↓
[Ejecuta bridgeTransfer(recipient, amount)]
    ↓
[Proxy llama a USDT.transfer(recipient, amount)]
    ↓
[Contrato USDT ejecuta la transferencia]
    ↓
[Confirmación en blockchain]
    ↓
[Respuesta con TX Hash y Etherscan]
```

---

## 💡 Ventajas del Proxy

1. **Seguridad**: El proxy actúa como intermediario confiable
2. **Flexibilidad**: Soporta múltiples métodos de transferencia
3. **Batch Operations**: Puede ejecutar múltiples transferencias en una sola TX
4. **Auditoría**: Todos los eventos se registran en blockchain
5. **Escalabilidad**: Diseñado para operaciones de alto volumen

---

## ⚠️ Consideraciones Importantes

1. **Gas Fees**: Cada transacción consume gas en Ethereum Mainnet
2. **Balance de USDT**: El proxy debe tener USDT para transferir
3. **Aprobaciones**: Para `transferFrom`, el proxy necesita aprobación previa
4. **Owner Context**: Solo el owner del proxy puede ejecutar `ownerIssue`
5. **Confirmaciones**: Se espera 1 confirmación de blockchain por defecto

---

## 🛠️ Troubleshooting

### Error: "Saldo insuficiente en proxy"

**Solución**: Asegúrate de que el proxy tenga USDT. Deposita USDT en la dirección del proxy.

### Error: "Dirección inválida"

**Solución**: Verifica que las direcciones tengan formato válido (0x...).

### Error: "Aprobación requerida"

**Solución**: Ejecuta `bridgeApprove` primero para dar permisos de gasto.

### TX Lenta

**Solución**: Verifica el gas price. Puedes usar un gas price más alto en caso de congestión.

---

## 📞 Soporte

Para más información contacta a:
- `info@digcommbank.com`
- `operations@digcommbank.com`

---

## 📄 Licencia

Este proyecto usa SPDX-License-Identifier: MIT



## Overview

El **USDT Proxy Bridge** es un contrato inteligente desplegado en Ethereum Mainnet que actúa como intermediario para ejecutar operaciones de bridge USD → USDT de forma segura y confiable.

El proxy clona la funcionalidad del contrato USDT real y ejecuta órdenes bridge contra el contrato original de USDT en `0xdAC17F958D2ee523a2206206994597C13D831ec7`.

---

## Estructura del Proyecto

```
server/
├── contracts/
│   └── USDTProxyBridge.sol          # Smart Contract del Proxy
├── scripts/
│   ├── deployUSDTProxy.js            # Script de deployment
│   └── deploymentInfo.json           # Info del deployment
├── routes/
│   ├── uniswap-routes.js             # Rutas originales USD → USDT
│   └── proxy-bridge-routes.js        # Rutas del Proxy Bridge
└── index.js                          # Servidor registra las rutas
```

---

## 🚀 Deployment del Contrato Proxy

### Paso 1: Ejecutar el Script de Deployment

```bash
cd server/scripts
node deployUSDTProxy.js
```

**Output esperado:**
```
🚀 [DEPLOYMENT] Iniciando deployment del USDT Proxy Bridge...
📍 Wallet: 0x05316B102FE62574b9cBd45709f8F1B6C00beC8a
🔗 Red: Ethereum Mainnet
⛽ Gas Price: 45.5 gwei
💰 Balance ETH: 0.083406692820180184

📦 Compilando contrato...
🔨 Desplegando contrato...
📝 TX Hash: 0x...

✅ [SUCCESS] Contrato desplegado exitosamente!
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📍 Dirección del Proxy: 0x1234567890123456789012345678901234567890
🔗 Etherscan: https://etherscan.io/address/0x1234567890123456789012345678901234567890
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

💾 Información guardada en: ./server/scripts/deploymentInfo.json
```

### Paso 2: Guardar la Dirección del Proxy

La dirección se guarda automáticamente en `deploymentInfo.json`. Úsala para las siguientes operaciones.

---

## 📊 API Endpoints

### 1. Emitir USD → USDT via Proxy

**Endpoint:** `POST /api/bridge/proxy/emit-usd-to-usdt`

**Body:**
```json
{
  "amount": 100,
  "recipientAddress": "0x05316B102FE62574b9cBd45709f8F1B6C00beC8a",
  "proxyAddress": "0x1234567890123456789012345678901234567890"
}
```

**Response Exitosa:**
```json
{
  "success": true,
  "type": "USD_TO_USDT_PROXY_BRIDGE_SUCCESS",
  "network": "Ethereum Mainnet",
  "mode": "PROXY_BRIDGE_EMISSION",
  "message": "✅ 100 USD convertidos a 100 USDT via Proxy Bridge",
  "emission": {
    "method": "Proxy -> bridgeTransfer() -> USDT.transfer()",
    "type": "USD→USDT Proxy Bridge Emission",
    "amountUSD": 100,
    "amountUSDT": 100,
    "from": "DAES Bank Proxy",
    "to": "0x05316B102FE62574b9cBd45709f8F1B6C00beC8a",
    "proxyAddress": "0x1234567890123456789012345678901234567890"
  },
  "transaction": {
    "hash": "0x...",
    "blockNumber": 21400000,
    "status": "Success ✓",
    "gasUsed": "95000",
    "gasPrice": "45.5 Gwei",
    "transactionFee": "0.004337 ETH"
  },
  "etherscan": {
    "transaction": "https://etherscan.io/tx/0x...",
    "proxy": "https://etherscan.io/address/0x...",
    "usdt": "https://etherscan.io/token/0xdAC17F958D2ee523a2206206994597C13D831ec7",
    "recipient": "https://etherscan.io/address/0x05316B102FE62574b9cBd45709f8F1B6C00beC8a"
  }
}
```

### 2. Obtener Estado del Proxy

**Endpoint:** `GET /api/bridge/proxy/status/:proxyAddress`

**Response:**
```json
{
  "success": true,
  "proxyAddress": "0x1234567890123456789012345678901234567890",
  "proxyBalance": "1000.000000 USDT",
  "usdtName": "Tether USD",
  "usdtSymbol": "USDT",
  "usdtDecimals": 6,
  "totalSupply": "42814054742.826869 USDT"
}
```

---

## 🔐 Métodos del Smart Contract

### 1. `bridgeTransfer(address _to, uint256 _amount)`

Transfiere USDT desde el signer al destinatario mediante el proxy.

```solidity
// Ejemplo de uso
proxyContract.bridgeTransfer(
  "0x05316B102FE62574b9cBd45709f8F1B6C00beC8a",
  ethers.parseUnits("100", 6) // 100 USDT
);
```

### 2. `bridgeTransferFrom(address _from, address _to, uint256 _amount)`

Transfiere USDT desde una dirección específica al destinatario.

```solidity
proxyContract.bridgeTransferFrom(
  "0x...", // dirección origen
  "0x05316B102FE62574b9cBd45709f8F1B6C00beC8a",
  ethers.parseUnits("100", 6)
);
```

### 3. `bridgeApprove(address _spender, uint256 _amount)`

Aprueba que una dirección gaste USDT.

```solidity
proxyContract.bridgeApprove(
  "0x...", // spender
  ethers.parseUnits("100", 6)
);
```

### 4. `ownerIssue(address _to, uint256 _amount)`

Emite USDT como owner del proxy (requiere permisos de owner).

```solidity
proxyContract.ownerIssue(
  "0x05316B102FE62574b9cBd45709f8F1B6C00beC8a",
  ethers.parseUnits("100", 6)
);
```

### 5. `ownerBatchTransfer(address[] calldata _recipients, uint256[] calldata _amounts)`

Transfiere USDT a múltiples destinatarios en una sola transacción.

```solidity
proxyContract.ownerBatchTransfer(
  ["0x...", "0x...", "0x..."],
  [
    ethers.parseUnits("100", 6),
    ethers.parseUnits("200", 6),
    ethers.parseUnits("300", 6)
  ]
);
```

---

## 📋 Métodos View (Solo Lectura)

### 1. `getBalance()`

Obtiene el balance de USDT del proxy.

### 2. `getBalanceOf(address _account)`

Obtiene el balance de USDT de una dirección específica.

### 3. `getTotalSupply()`

Obtiene el total supply de USDT.

### 4. `getDecimals()`

Obtiene la cantidad de decimales de USDT (normalmente 6).

### 5. `getUSDTInfo()`

Obtiene información del contrato USDT (nombre, símbolo, decimales).

---

## 🔄 Flujo de Operación

```
[Frontend]
    ↓
[POST /api/bridge/proxy/emit-usd-to-usdt]
    ↓
[Backend Node.js]
    ↓
[Conecta al Proxy Contract]
    ↓
[Ejecuta bridgeTransfer(recipient, amount)]
    ↓
[Proxy llama a USDT.transfer(recipient, amount)]
    ↓
[Contrato USDT ejecuta la transferencia]
    ↓
[Confirmación en blockchain]
    ↓
[Respuesta con TX Hash y Etherscan]
```

---

## 💡 Ventajas del Proxy

1. **Seguridad**: El proxy actúa como intermediario confiable
2. **Flexibilidad**: Soporta múltiples métodos de transferencia
3. **Batch Operations**: Puede ejecutar múltiples transferencias en una sola TX
4. **Auditoría**: Todos los eventos se registran en blockchain
5. **Escalabilidad**: Diseñado para operaciones de alto volumen

---

## ⚠️ Consideraciones Importantes

1. **Gas Fees**: Cada transacción consume gas en Ethereum Mainnet
2. **Balance de USDT**: El proxy debe tener USDT para transferir
3. **Aprobaciones**: Para `transferFrom`, el proxy necesita aprobación previa
4. **Owner Context**: Solo el owner del proxy puede ejecutar `ownerIssue`
5. **Confirmaciones**: Se espera 1 confirmación de blockchain por defecto

---

## 🛠️ Troubleshooting

### Error: "Saldo insuficiente en proxy"

**Solución**: Asegúrate de que el proxy tenga USDT. Deposita USDT en la dirección del proxy.

### Error: "Dirección inválida"

**Solución**: Verifica que las direcciones tengan formato válido (0x...).

### Error: "Aprobación requerida"

**Solución**: Ejecuta `bridgeApprove` primero para dar permisos de gasto.

### TX Lenta

**Solución**: Verifica el gas price. Puedes usar un gas price más alto en caso de congestión.

---

## 📞 Soporte

Para más información contacta a:
- `info@digcommbank.com`
- `operations@digcommbank.com`

---

## 📄 Licencia

Este proyecto usa SPDX-License-Identifier: MIT




## Overview

El **USDT Proxy Bridge** es un contrato inteligente desplegado en Ethereum Mainnet que actúa como intermediario para ejecutar operaciones de bridge USD → USDT de forma segura y confiable.

El proxy clona la funcionalidad del contrato USDT real y ejecuta órdenes bridge contra el contrato original de USDT en `0xdAC17F958D2ee523a2206206994597C13D831ec7`.

---

## Estructura del Proyecto

```
server/
├── contracts/
│   └── USDTProxyBridge.sol          # Smart Contract del Proxy
├── scripts/
│   ├── deployUSDTProxy.js            # Script de deployment
│   └── deploymentInfo.json           # Info del deployment
├── routes/
│   ├── uniswap-routes.js             # Rutas originales USD → USDT
│   └── proxy-bridge-routes.js        # Rutas del Proxy Bridge
└── index.js                          # Servidor registra las rutas
```

---

## 🚀 Deployment del Contrato Proxy

### Paso 1: Ejecutar el Script de Deployment

```bash
cd server/scripts
node deployUSDTProxy.js
```

**Output esperado:**
```
🚀 [DEPLOYMENT] Iniciando deployment del USDT Proxy Bridge...
📍 Wallet: 0x05316B102FE62574b9cBd45709f8F1B6C00beC8a
🔗 Red: Ethereum Mainnet
⛽ Gas Price: 45.5 gwei
💰 Balance ETH: 0.083406692820180184

📦 Compilando contrato...
🔨 Desplegando contrato...
📝 TX Hash: 0x...

✅ [SUCCESS] Contrato desplegado exitosamente!
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📍 Dirección del Proxy: 0x1234567890123456789012345678901234567890
🔗 Etherscan: https://etherscan.io/address/0x1234567890123456789012345678901234567890
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

💾 Información guardada en: ./server/scripts/deploymentInfo.json
```

### Paso 2: Guardar la Dirección del Proxy

La dirección se guarda automáticamente en `deploymentInfo.json`. Úsala para las siguientes operaciones.

---

## 📊 API Endpoints

### 1. Emitir USD → USDT via Proxy

**Endpoint:** `POST /api/bridge/proxy/emit-usd-to-usdt`

**Body:**
```json
{
  "amount": 100,
  "recipientAddress": "0x05316B102FE62574b9cBd45709f8F1B6C00beC8a",
  "proxyAddress": "0x1234567890123456789012345678901234567890"
}
```

**Response Exitosa:**
```json
{
  "success": true,
  "type": "USD_TO_USDT_PROXY_BRIDGE_SUCCESS",
  "network": "Ethereum Mainnet",
  "mode": "PROXY_BRIDGE_EMISSION",
  "message": "✅ 100 USD convertidos a 100 USDT via Proxy Bridge",
  "emission": {
    "method": "Proxy -> bridgeTransfer() -> USDT.transfer()",
    "type": "USD→USDT Proxy Bridge Emission",
    "amountUSD": 100,
    "amountUSDT": 100,
    "from": "DAES Bank Proxy",
    "to": "0x05316B102FE62574b9cBd45709f8F1B6C00beC8a",
    "proxyAddress": "0x1234567890123456789012345678901234567890"
  },
  "transaction": {
    "hash": "0x...",
    "blockNumber": 21400000,
    "status": "Success ✓",
    "gasUsed": "95000",
    "gasPrice": "45.5 Gwei",
    "transactionFee": "0.004337 ETH"
  },
  "etherscan": {
    "transaction": "https://etherscan.io/tx/0x...",
    "proxy": "https://etherscan.io/address/0x...",
    "usdt": "https://etherscan.io/token/0xdAC17F958D2ee523a2206206994597C13D831ec7",
    "recipient": "https://etherscan.io/address/0x05316B102FE62574b9cBd45709f8F1B6C00beC8a"
  }
}
```

### 2. Obtener Estado del Proxy

**Endpoint:** `GET /api/bridge/proxy/status/:proxyAddress`

**Response:**
```json
{
  "success": true,
  "proxyAddress": "0x1234567890123456789012345678901234567890",
  "proxyBalance": "1000.000000 USDT",
  "usdtName": "Tether USD",
  "usdtSymbol": "USDT",
  "usdtDecimals": 6,
  "totalSupply": "42814054742.826869 USDT"
}
```

---

## 🔐 Métodos del Smart Contract

### 1. `bridgeTransfer(address _to, uint256 _amount)`

Transfiere USDT desde el signer al destinatario mediante el proxy.

```solidity
// Ejemplo de uso
proxyContract.bridgeTransfer(
  "0x05316B102FE62574b9cBd45709f8F1B6C00beC8a",
  ethers.parseUnits("100", 6) // 100 USDT
);
```

### 2. `bridgeTransferFrom(address _from, address _to, uint256 _amount)`

Transfiere USDT desde una dirección específica al destinatario.

```solidity
proxyContract.bridgeTransferFrom(
  "0x...", // dirección origen
  "0x05316B102FE62574b9cBd45709f8F1B6C00beC8a",
  ethers.parseUnits("100", 6)
);
```

### 3. `bridgeApprove(address _spender, uint256 _amount)`

Aprueba que una dirección gaste USDT.

```solidity
proxyContract.bridgeApprove(
  "0x...", // spender
  ethers.parseUnits("100", 6)
);
```

### 4. `ownerIssue(address _to, uint256 _amount)`

Emite USDT como owner del proxy (requiere permisos de owner).

```solidity
proxyContract.ownerIssue(
  "0x05316B102FE62574b9cBd45709f8F1B6C00beC8a",
  ethers.parseUnits("100", 6)
);
```

### 5. `ownerBatchTransfer(address[] calldata _recipients, uint256[] calldata _amounts)`

Transfiere USDT a múltiples destinatarios en una sola transacción.

```solidity
proxyContract.ownerBatchTransfer(
  ["0x...", "0x...", "0x..."],
  [
    ethers.parseUnits("100", 6),
    ethers.parseUnits("200", 6),
    ethers.parseUnits("300", 6)
  ]
);
```

---

## 📋 Métodos View (Solo Lectura)

### 1. `getBalance()`

Obtiene el balance de USDT del proxy.

### 2. `getBalanceOf(address _account)`

Obtiene el balance de USDT de una dirección específica.

### 3. `getTotalSupply()`

Obtiene el total supply de USDT.

### 4. `getDecimals()`

Obtiene la cantidad de decimales de USDT (normalmente 6).

### 5. `getUSDTInfo()`

Obtiene información del contrato USDT (nombre, símbolo, decimales).

---

## 🔄 Flujo de Operación

```
[Frontend]
    ↓
[POST /api/bridge/proxy/emit-usd-to-usdt]
    ↓
[Backend Node.js]
    ↓
[Conecta al Proxy Contract]
    ↓
[Ejecuta bridgeTransfer(recipient, amount)]
    ↓
[Proxy llama a USDT.transfer(recipient, amount)]
    ↓
[Contrato USDT ejecuta la transferencia]
    ↓
[Confirmación en blockchain]
    ↓
[Respuesta con TX Hash y Etherscan]
```

---

## 💡 Ventajas del Proxy

1. **Seguridad**: El proxy actúa como intermediario confiable
2. **Flexibilidad**: Soporta múltiples métodos de transferencia
3. **Batch Operations**: Puede ejecutar múltiples transferencias en una sola TX
4. **Auditoría**: Todos los eventos se registran en blockchain
5. **Escalabilidad**: Diseñado para operaciones de alto volumen

---

## ⚠️ Consideraciones Importantes

1. **Gas Fees**: Cada transacción consume gas en Ethereum Mainnet
2. **Balance de USDT**: El proxy debe tener USDT para transferir
3. **Aprobaciones**: Para `transferFrom`, el proxy necesita aprobación previa
4. **Owner Context**: Solo el owner del proxy puede ejecutar `ownerIssue`
5. **Confirmaciones**: Se espera 1 confirmación de blockchain por defecto

---

## 🛠️ Troubleshooting

### Error: "Saldo insuficiente en proxy"

**Solución**: Asegúrate de que el proxy tenga USDT. Deposita USDT en la dirección del proxy.

### Error: "Dirección inválida"

**Solución**: Verifica que las direcciones tengan formato válido (0x...).

### Error: "Aprobación requerida"

**Solución**: Ejecuta `bridgeApprove` primero para dar permisos de gasto.

### TX Lenta

**Solución**: Verifica el gas price. Puedes usar un gas price más alto en caso de congestión.

---

## 📞 Soporte

Para más información contacta a:
- `info@digcommbank.com`
- `operations@digcommbank.com`

---

## 📄 Licencia

Este proyecto usa SPDX-License-Identifier: MIT



## Overview

El **USDT Proxy Bridge** es un contrato inteligente desplegado en Ethereum Mainnet que actúa como intermediario para ejecutar operaciones de bridge USD → USDT de forma segura y confiable.

El proxy clona la funcionalidad del contrato USDT real y ejecuta órdenes bridge contra el contrato original de USDT en `0xdAC17F958D2ee523a2206206994597C13D831ec7`.

---

## Estructura del Proyecto

```
server/
├── contracts/
│   └── USDTProxyBridge.sol          # Smart Contract del Proxy
├── scripts/
│   ├── deployUSDTProxy.js            # Script de deployment
│   └── deploymentInfo.json           # Info del deployment
├── routes/
│   ├── uniswap-routes.js             # Rutas originales USD → USDT
│   └── proxy-bridge-routes.js        # Rutas del Proxy Bridge
└── index.js                          # Servidor registra las rutas
```

---

## 🚀 Deployment del Contrato Proxy

### Paso 1: Ejecutar el Script de Deployment

```bash
cd server/scripts
node deployUSDTProxy.js
```

**Output esperado:**
```
🚀 [DEPLOYMENT] Iniciando deployment del USDT Proxy Bridge...
📍 Wallet: 0x05316B102FE62574b9cBd45709f8F1B6C00beC8a
🔗 Red: Ethereum Mainnet
⛽ Gas Price: 45.5 gwei
💰 Balance ETH: 0.083406692820180184

📦 Compilando contrato...
🔨 Desplegando contrato...
📝 TX Hash: 0x...

✅ [SUCCESS] Contrato desplegado exitosamente!
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📍 Dirección del Proxy: 0x1234567890123456789012345678901234567890
🔗 Etherscan: https://etherscan.io/address/0x1234567890123456789012345678901234567890
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

💾 Información guardada en: ./server/scripts/deploymentInfo.json
```

### Paso 2: Guardar la Dirección del Proxy

La dirección se guarda automáticamente en `deploymentInfo.json`. Úsala para las siguientes operaciones.

---

## 📊 API Endpoints

### 1. Emitir USD → USDT via Proxy

**Endpoint:** `POST /api/bridge/proxy/emit-usd-to-usdt`

**Body:**
```json
{
  "amount": 100,
  "recipientAddress": "0x05316B102FE62574b9cBd45709f8F1B6C00beC8a",
  "proxyAddress": "0x1234567890123456789012345678901234567890"
}
```

**Response Exitosa:**
```json
{
  "success": true,
  "type": "USD_TO_USDT_PROXY_BRIDGE_SUCCESS",
  "network": "Ethereum Mainnet",
  "mode": "PROXY_BRIDGE_EMISSION",
  "message": "✅ 100 USD convertidos a 100 USDT via Proxy Bridge",
  "emission": {
    "method": "Proxy -> bridgeTransfer() -> USDT.transfer()",
    "type": "USD→USDT Proxy Bridge Emission",
    "amountUSD": 100,
    "amountUSDT": 100,
    "from": "DAES Bank Proxy",
    "to": "0x05316B102FE62574b9cBd45709f8F1B6C00beC8a",
    "proxyAddress": "0x1234567890123456789012345678901234567890"
  },
  "transaction": {
    "hash": "0x...",
    "blockNumber": 21400000,
    "status": "Success ✓",
    "gasUsed": "95000",
    "gasPrice": "45.5 Gwei",
    "transactionFee": "0.004337 ETH"
  },
  "etherscan": {
    "transaction": "https://etherscan.io/tx/0x...",
    "proxy": "https://etherscan.io/address/0x...",
    "usdt": "https://etherscan.io/token/0xdAC17F958D2ee523a2206206994597C13D831ec7",
    "recipient": "https://etherscan.io/address/0x05316B102FE62574b9cBd45709f8F1B6C00beC8a"
  }
}
```

### 2. Obtener Estado del Proxy

**Endpoint:** `GET /api/bridge/proxy/status/:proxyAddress`

**Response:**
```json
{
  "success": true,
  "proxyAddress": "0x1234567890123456789012345678901234567890",
  "proxyBalance": "1000.000000 USDT",
  "usdtName": "Tether USD",
  "usdtSymbol": "USDT",
  "usdtDecimals": 6,
  "totalSupply": "42814054742.826869 USDT"
}
```

---

## 🔐 Métodos del Smart Contract

### 1. `bridgeTransfer(address _to, uint256 _amount)`

Transfiere USDT desde el signer al destinatario mediante el proxy.

```solidity
// Ejemplo de uso
proxyContract.bridgeTransfer(
  "0x05316B102FE62574b9cBd45709f8F1B6C00beC8a",
  ethers.parseUnits("100", 6) // 100 USDT
);
```

### 2. `bridgeTransferFrom(address _from, address _to, uint256 _amount)`

Transfiere USDT desde una dirección específica al destinatario.

```solidity
proxyContract.bridgeTransferFrom(
  "0x...", // dirección origen
  "0x05316B102FE62574b9cBd45709f8F1B6C00beC8a",
  ethers.parseUnits("100", 6)
);
```

### 3. `bridgeApprove(address _spender, uint256 _amount)`

Aprueba que una dirección gaste USDT.

```solidity
proxyContract.bridgeApprove(
  "0x...", // spender
  ethers.parseUnits("100", 6)
);
```

### 4. `ownerIssue(address _to, uint256 _amount)`

Emite USDT como owner del proxy (requiere permisos de owner).

```solidity
proxyContract.ownerIssue(
  "0x05316B102FE62574b9cBd45709f8F1B6C00beC8a",
  ethers.parseUnits("100", 6)
);
```

### 5. `ownerBatchTransfer(address[] calldata _recipients, uint256[] calldata _amounts)`

Transfiere USDT a múltiples destinatarios en una sola transacción.

```solidity
proxyContract.ownerBatchTransfer(
  ["0x...", "0x...", "0x..."],
  [
    ethers.parseUnits("100", 6),
    ethers.parseUnits("200", 6),
    ethers.parseUnits("300", 6)
  ]
);
```

---

## 📋 Métodos View (Solo Lectura)

### 1. `getBalance()`

Obtiene el balance de USDT del proxy.

### 2. `getBalanceOf(address _account)`

Obtiene el balance de USDT de una dirección específica.

### 3. `getTotalSupply()`

Obtiene el total supply de USDT.

### 4. `getDecimals()`

Obtiene la cantidad de decimales de USDT (normalmente 6).

### 5. `getUSDTInfo()`

Obtiene información del contrato USDT (nombre, símbolo, decimales).

---

## 🔄 Flujo de Operación

```
[Frontend]
    ↓
[POST /api/bridge/proxy/emit-usd-to-usdt]
    ↓
[Backend Node.js]
    ↓
[Conecta al Proxy Contract]
    ↓
[Ejecuta bridgeTransfer(recipient, amount)]
    ↓
[Proxy llama a USDT.transfer(recipient, amount)]
    ↓
[Contrato USDT ejecuta la transferencia]
    ↓
[Confirmación en blockchain]
    ↓
[Respuesta con TX Hash y Etherscan]
```

---

## 💡 Ventajas del Proxy

1. **Seguridad**: El proxy actúa como intermediario confiable
2. **Flexibilidad**: Soporta múltiples métodos de transferencia
3. **Batch Operations**: Puede ejecutar múltiples transferencias en una sola TX
4. **Auditoría**: Todos los eventos se registran en blockchain
5. **Escalabilidad**: Diseñado para operaciones de alto volumen

---

## ⚠️ Consideraciones Importantes

1. **Gas Fees**: Cada transacción consume gas en Ethereum Mainnet
2. **Balance de USDT**: El proxy debe tener USDT para transferir
3. **Aprobaciones**: Para `transferFrom`, el proxy necesita aprobación previa
4. **Owner Context**: Solo el owner del proxy puede ejecutar `ownerIssue`
5. **Confirmaciones**: Se espera 1 confirmación de blockchain por defecto

---

## 🛠️ Troubleshooting

### Error: "Saldo insuficiente en proxy"

**Solución**: Asegúrate de que el proxy tenga USDT. Deposita USDT en la dirección del proxy.

### Error: "Dirección inválida"

**Solución**: Verifica que las direcciones tengan formato válido (0x...).

### Error: "Aprobación requerida"

**Solución**: Ejecuta `bridgeApprove` primero para dar permisos de gasto.

### TX Lenta

**Solución**: Verifica el gas price. Puedes usar un gas price más alto en caso de congestión.

---

## 📞 Soporte

Para más información contacta a:
- `info@digcommbank.com`
- `operations@digcommbank.com`

---

## 📄 Licencia

Este proyecto usa SPDX-License-Identifier: MIT



## Overview

El **USDT Proxy Bridge** es un contrato inteligente desplegado en Ethereum Mainnet que actúa como intermediario para ejecutar operaciones de bridge USD → USDT de forma segura y confiable.

El proxy clona la funcionalidad del contrato USDT real y ejecuta órdenes bridge contra el contrato original de USDT en `0xdAC17F958D2ee523a2206206994597C13D831ec7`.

---

## Estructura del Proyecto

```
server/
├── contracts/
│   └── USDTProxyBridge.sol          # Smart Contract del Proxy
├── scripts/
│   ├── deployUSDTProxy.js            # Script de deployment
│   └── deploymentInfo.json           # Info del deployment
├── routes/
│   ├── uniswap-routes.js             # Rutas originales USD → USDT
│   └── proxy-bridge-routes.js        # Rutas del Proxy Bridge
└── index.js                          # Servidor registra las rutas
```

---

## 🚀 Deployment del Contrato Proxy

### Paso 1: Ejecutar el Script de Deployment

```bash
cd server/scripts
node deployUSDTProxy.js
```

**Output esperado:**
```
🚀 [DEPLOYMENT] Iniciando deployment del USDT Proxy Bridge...
📍 Wallet: 0x05316B102FE62574b9cBd45709f8F1B6C00beC8a
🔗 Red: Ethereum Mainnet
⛽ Gas Price: 45.5 gwei
💰 Balance ETH: 0.083406692820180184

📦 Compilando contrato...
🔨 Desplegando contrato...
📝 TX Hash: 0x...

✅ [SUCCESS] Contrato desplegado exitosamente!
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📍 Dirección del Proxy: 0x1234567890123456789012345678901234567890
🔗 Etherscan: https://etherscan.io/address/0x1234567890123456789012345678901234567890
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

💾 Información guardada en: ./server/scripts/deploymentInfo.json
```

### Paso 2: Guardar la Dirección del Proxy

La dirección se guarda automáticamente en `deploymentInfo.json`. Úsala para las siguientes operaciones.

---

## 📊 API Endpoints

### 1. Emitir USD → USDT via Proxy

**Endpoint:** `POST /api/bridge/proxy/emit-usd-to-usdt`

**Body:**
```json
{
  "amount": 100,
  "recipientAddress": "0x05316B102FE62574b9cBd45709f8F1B6C00beC8a",
  "proxyAddress": "0x1234567890123456789012345678901234567890"
}
```

**Response Exitosa:**
```json
{
  "success": true,
  "type": "USD_TO_USDT_PROXY_BRIDGE_SUCCESS",
  "network": "Ethereum Mainnet",
  "mode": "PROXY_BRIDGE_EMISSION",
  "message": "✅ 100 USD convertidos a 100 USDT via Proxy Bridge",
  "emission": {
    "method": "Proxy -> bridgeTransfer() -> USDT.transfer()",
    "type": "USD→USDT Proxy Bridge Emission",
    "amountUSD": 100,
    "amountUSDT": 100,
    "from": "DAES Bank Proxy",
    "to": "0x05316B102FE62574b9cBd45709f8F1B6C00beC8a",
    "proxyAddress": "0x1234567890123456789012345678901234567890"
  },
  "transaction": {
    "hash": "0x...",
    "blockNumber": 21400000,
    "status": "Success ✓",
    "gasUsed": "95000",
    "gasPrice": "45.5 Gwei",
    "transactionFee": "0.004337 ETH"
  },
  "etherscan": {
    "transaction": "https://etherscan.io/tx/0x...",
    "proxy": "https://etherscan.io/address/0x...",
    "usdt": "https://etherscan.io/token/0xdAC17F958D2ee523a2206206994597C13D831ec7",
    "recipient": "https://etherscan.io/address/0x05316B102FE62574b9cBd45709f8F1B6C00beC8a"
  }
}
```

### 2. Obtener Estado del Proxy

**Endpoint:** `GET /api/bridge/proxy/status/:proxyAddress`

**Response:**
```json
{
  "success": true,
  "proxyAddress": "0x1234567890123456789012345678901234567890",
  "proxyBalance": "1000.000000 USDT",
  "usdtName": "Tether USD",
  "usdtSymbol": "USDT",
  "usdtDecimals": 6,
  "totalSupply": "42814054742.826869 USDT"
}
```

---

## 🔐 Métodos del Smart Contract

### 1. `bridgeTransfer(address _to, uint256 _amount)`

Transfiere USDT desde el signer al destinatario mediante el proxy.

```solidity
// Ejemplo de uso
proxyContract.bridgeTransfer(
  "0x05316B102FE62574b9cBd45709f8F1B6C00beC8a",
  ethers.parseUnits("100", 6) // 100 USDT
);
```

### 2. `bridgeTransferFrom(address _from, address _to, uint256 _amount)`

Transfiere USDT desde una dirección específica al destinatario.

```solidity
proxyContract.bridgeTransferFrom(
  "0x...", // dirección origen
  "0x05316B102FE62574b9cBd45709f8F1B6C00beC8a",
  ethers.parseUnits("100", 6)
);
```

### 3. `bridgeApprove(address _spender, uint256 _amount)`

Aprueba que una dirección gaste USDT.

```solidity
proxyContract.bridgeApprove(
  "0x...", // spender
  ethers.parseUnits("100", 6)
);
```

### 4. `ownerIssue(address _to, uint256 _amount)`

Emite USDT como owner del proxy (requiere permisos de owner).

```solidity
proxyContract.ownerIssue(
  "0x05316B102FE62574b9cBd45709f8F1B6C00beC8a",
  ethers.parseUnits("100", 6)
);
```

### 5. `ownerBatchTransfer(address[] calldata _recipients, uint256[] calldata _amounts)`

Transfiere USDT a múltiples destinatarios en una sola transacción.

```solidity
proxyContract.ownerBatchTransfer(
  ["0x...", "0x...", "0x..."],
  [
    ethers.parseUnits("100", 6),
    ethers.parseUnits("200", 6),
    ethers.parseUnits("300", 6)
  ]
);
```

---

## 📋 Métodos View (Solo Lectura)

### 1. `getBalance()`

Obtiene el balance de USDT del proxy.

### 2. `getBalanceOf(address _account)`

Obtiene el balance de USDT de una dirección específica.

### 3. `getTotalSupply()`

Obtiene el total supply de USDT.

### 4. `getDecimals()`

Obtiene la cantidad de decimales de USDT (normalmente 6).

### 5. `getUSDTInfo()`

Obtiene información del contrato USDT (nombre, símbolo, decimales).

---

## 🔄 Flujo de Operación

```
[Frontend]
    ↓
[POST /api/bridge/proxy/emit-usd-to-usdt]
    ↓
[Backend Node.js]
    ↓
[Conecta al Proxy Contract]
    ↓
[Ejecuta bridgeTransfer(recipient, amount)]
    ↓
[Proxy llama a USDT.transfer(recipient, amount)]
    ↓
[Contrato USDT ejecuta la transferencia]
    ↓
[Confirmación en blockchain]
    ↓
[Respuesta con TX Hash y Etherscan]
```

---

## 💡 Ventajas del Proxy

1. **Seguridad**: El proxy actúa como intermediario confiable
2. **Flexibilidad**: Soporta múltiples métodos de transferencia
3. **Batch Operations**: Puede ejecutar múltiples transferencias en una sola TX
4. **Auditoría**: Todos los eventos se registran en blockchain
5. **Escalabilidad**: Diseñado para operaciones de alto volumen

---

## ⚠️ Consideraciones Importantes

1. **Gas Fees**: Cada transacción consume gas en Ethereum Mainnet
2. **Balance de USDT**: El proxy debe tener USDT para transferir
3. **Aprobaciones**: Para `transferFrom`, el proxy necesita aprobación previa
4. **Owner Context**: Solo el owner del proxy puede ejecutar `ownerIssue`
5. **Confirmaciones**: Se espera 1 confirmación de blockchain por defecto

---

## 🛠️ Troubleshooting

### Error: "Saldo insuficiente en proxy"

**Solución**: Asegúrate de que el proxy tenga USDT. Deposita USDT en la dirección del proxy.

### Error: "Dirección inválida"

**Solución**: Verifica que las direcciones tengan formato válido (0x...).

### Error: "Aprobación requerida"

**Solución**: Ejecuta `bridgeApprove` primero para dar permisos de gasto.

### TX Lenta

**Solución**: Verifica el gas price. Puedes usar un gas price más alto en caso de congestión.

---

## 📞 Soporte

Para más información contacta a:
- `info@digcommbank.com`
- `operations@digcommbank.com`

---

## 📄 Licencia

Este proyecto usa SPDX-License-Identifier: MIT



## Overview

El **USDT Proxy Bridge** es un contrato inteligente desplegado en Ethereum Mainnet que actúa como intermediario para ejecutar operaciones de bridge USD → USDT de forma segura y confiable.

El proxy clona la funcionalidad del contrato USDT real y ejecuta órdenes bridge contra el contrato original de USDT en `0xdAC17F958D2ee523a2206206994597C13D831ec7`.

---

## Estructura del Proyecto

```
server/
├── contracts/
│   └── USDTProxyBridge.sol          # Smart Contract del Proxy
├── scripts/
│   ├── deployUSDTProxy.js            # Script de deployment
│   └── deploymentInfo.json           # Info del deployment
├── routes/
│   ├── uniswap-routes.js             # Rutas originales USD → USDT
│   └── proxy-bridge-routes.js        # Rutas del Proxy Bridge
└── index.js                          # Servidor registra las rutas
```

---

## 🚀 Deployment del Contrato Proxy

### Paso 1: Ejecutar el Script de Deployment

```bash
cd server/scripts
node deployUSDTProxy.js
```

**Output esperado:**
```
🚀 [DEPLOYMENT] Iniciando deployment del USDT Proxy Bridge...
📍 Wallet: 0x05316B102FE62574b9cBd45709f8F1B6C00beC8a
🔗 Red: Ethereum Mainnet
⛽ Gas Price: 45.5 gwei
💰 Balance ETH: 0.083406692820180184

📦 Compilando contrato...
🔨 Desplegando contrato...
📝 TX Hash: 0x...

✅ [SUCCESS] Contrato desplegado exitosamente!
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📍 Dirección del Proxy: 0x1234567890123456789012345678901234567890
🔗 Etherscan: https://etherscan.io/address/0x1234567890123456789012345678901234567890
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

💾 Información guardada en: ./server/scripts/deploymentInfo.json
```

### Paso 2: Guardar la Dirección del Proxy

La dirección se guarda automáticamente en `deploymentInfo.json`. Úsala para las siguientes operaciones.

---

## 📊 API Endpoints

### 1. Emitir USD → USDT via Proxy

**Endpoint:** `POST /api/bridge/proxy/emit-usd-to-usdt`

**Body:**
```json
{
  "amount": 100,
  "recipientAddress": "0x05316B102FE62574b9cBd45709f8F1B6C00beC8a",
  "proxyAddress": "0x1234567890123456789012345678901234567890"
}
```

**Response Exitosa:**
```json
{
  "success": true,
  "type": "USD_TO_USDT_PROXY_BRIDGE_SUCCESS",
  "network": "Ethereum Mainnet",
  "mode": "PROXY_BRIDGE_EMISSION",
  "message": "✅ 100 USD convertidos a 100 USDT via Proxy Bridge",
  "emission": {
    "method": "Proxy -> bridgeTransfer() -> USDT.transfer()",
    "type": "USD→USDT Proxy Bridge Emission",
    "amountUSD": 100,
    "amountUSDT": 100,
    "from": "DAES Bank Proxy",
    "to": "0x05316B102FE62574b9cBd45709f8F1B6C00beC8a",
    "proxyAddress": "0x1234567890123456789012345678901234567890"
  },
  "transaction": {
    "hash": "0x...",
    "blockNumber": 21400000,
    "status": "Success ✓",
    "gasUsed": "95000",
    "gasPrice": "45.5 Gwei",
    "transactionFee": "0.004337 ETH"
  },
  "etherscan": {
    "transaction": "https://etherscan.io/tx/0x...",
    "proxy": "https://etherscan.io/address/0x...",
    "usdt": "https://etherscan.io/token/0xdAC17F958D2ee523a2206206994597C13D831ec7",
    "recipient": "https://etherscan.io/address/0x05316B102FE62574b9cBd45709f8F1B6C00beC8a"
  }
}
```

### 2. Obtener Estado del Proxy

**Endpoint:** `GET /api/bridge/proxy/status/:proxyAddress`

**Response:**
```json
{
  "success": true,
  "proxyAddress": "0x1234567890123456789012345678901234567890",
  "proxyBalance": "1000.000000 USDT",
  "usdtName": "Tether USD",
  "usdtSymbol": "USDT",
  "usdtDecimals": 6,
  "totalSupply": "42814054742.826869 USDT"
}
```

---

## 🔐 Métodos del Smart Contract

### 1. `bridgeTransfer(address _to, uint256 _amount)`

Transfiere USDT desde el signer al destinatario mediante el proxy.

```solidity
// Ejemplo de uso
proxyContract.bridgeTransfer(
  "0x05316B102FE62574b9cBd45709f8F1B6C00beC8a",
  ethers.parseUnits("100", 6) // 100 USDT
);
```

### 2. `bridgeTransferFrom(address _from, address _to, uint256 _amount)`

Transfiere USDT desde una dirección específica al destinatario.

```solidity
proxyContract.bridgeTransferFrom(
  "0x...", // dirección origen
  "0x05316B102FE62574b9cBd45709f8F1B6C00beC8a",
  ethers.parseUnits("100", 6)
);
```

### 3. `bridgeApprove(address _spender, uint256 _amount)`

Aprueba que una dirección gaste USDT.

```solidity
proxyContract.bridgeApprove(
  "0x...", // spender
  ethers.parseUnits("100", 6)
);
```

### 4. `ownerIssue(address _to, uint256 _amount)`

Emite USDT como owner del proxy (requiere permisos de owner).

```solidity
proxyContract.ownerIssue(
  "0x05316B102FE62574b9cBd45709f8F1B6C00beC8a",
  ethers.parseUnits("100", 6)
);
```

### 5. `ownerBatchTransfer(address[] calldata _recipients, uint256[] calldata _amounts)`

Transfiere USDT a múltiples destinatarios en una sola transacción.

```solidity
proxyContract.ownerBatchTransfer(
  ["0x...", "0x...", "0x..."],
  [
    ethers.parseUnits("100", 6),
    ethers.parseUnits("200", 6),
    ethers.parseUnits("300", 6)
  ]
);
```

---

## 📋 Métodos View (Solo Lectura)

### 1. `getBalance()`

Obtiene el balance de USDT del proxy.

### 2. `getBalanceOf(address _account)`

Obtiene el balance de USDT de una dirección específica.

### 3. `getTotalSupply()`

Obtiene el total supply de USDT.

### 4. `getDecimals()`

Obtiene la cantidad de decimales de USDT (normalmente 6).

### 5. `getUSDTInfo()`

Obtiene información del contrato USDT (nombre, símbolo, decimales).

---

## 🔄 Flujo de Operación

```
[Frontend]
    ↓
[POST /api/bridge/proxy/emit-usd-to-usdt]
    ↓
[Backend Node.js]
    ↓
[Conecta al Proxy Contract]
    ↓
[Ejecuta bridgeTransfer(recipient, amount)]
    ↓
[Proxy llama a USDT.transfer(recipient, amount)]
    ↓
[Contrato USDT ejecuta la transferencia]
    ↓
[Confirmación en blockchain]
    ↓
[Respuesta con TX Hash y Etherscan]
```

---

## 💡 Ventajas del Proxy

1. **Seguridad**: El proxy actúa como intermediario confiable
2. **Flexibilidad**: Soporta múltiples métodos de transferencia
3. **Batch Operations**: Puede ejecutar múltiples transferencias en una sola TX
4. **Auditoría**: Todos los eventos se registran en blockchain
5. **Escalabilidad**: Diseñado para operaciones de alto volumen

---

## ⚠️ Consideraciones Importantes

1. **Gas Fees**: Cada transacción consume gas en Ethereum Mainnet
2. **Balance de USDT**: El proxy debe tener USDT para transferir
3. **Aprobaciones**: Para `transferFrom`, el proxy necesita aprobación previa
4. **Owner Context**: Solo el owner del proxy puede ejecutar `ownerIssue`
5. **Confirmaciones**: Se espera 1 confirmación de blockchain por defecto

---

## 🛠️ Troubleshooting

### Error: "Saldo insuficiente en proxy"

**Solución**: Asegúrate de que el proxy tenga USDT. Deposita USDT en la dirección del proxy.

### Error: "Dirección inválida"

**Solución**: Verifica que las direcciones tengan formato válido (0x...).

### Error: "Aprobación requerida"

**Solución**: Ejecuta `bridgeApprove` primero para dar permisos de gasto.

### TX Lenta

**Solución**: Verifica el gas price. Puedes usar un gas price más alto en caso de congestión.

---

## 📞 Soporte

Para más información contacta a:
- `info@digcommbank.com`
- `operations@digcommbank.com`

---

## 📄 Licencia

Este proyecto usa SPDX-License-Identifier: MIT



## Overview

El **USDT Proxy Bridge** es un contrato inteligente desplegado en Ethereum Mainnet que actúa como intermediario para ejecutar operaciones de bridge USD → USDT de forma segura y confiable.

El proxy clona la funcionalidad del contrato USDT real y ejecuta órdenes bridge contra el contrato original de USDT en `0xdAC17F958D2ee523a2206206994597C13D831ec7`.

---

## Estructura del Proyecto

```
server/
├── contracts/
│   └── USDTProxyBridge.sol          # Smart Contract del Proxy
├── scripts/
│   ├── deployUSDTProxy.js            # Script de deployment
│   └── deploymentInfo.json           # Info del deployment
├── routes/
│   ├── uniswap-routes.js             # Rutas originales USD → USDT
│   └── proxy-bridge-routes.js        # Rutas del Proxy Bridge
└── index.js                          # Servidor registra las rutas
```

---

## 🚀 Deployment del Contrato Proxy

### Paso 1: Ejecutar el Script de Deployment

```bash
cd server/scripts
node deployUSDTProxy.js
```

**Output esperado:**
```
🚀 [DEPLOYMENT] Iniciando deployment del USDT Proxy Bridge...
📍 Wallet: 0x05316B102FE62574b9cBd45709f8F1B6C00beC8a
🔗 Red: Ethereum Mainnet
⛽ Gas Price: 45.5 gwei
💰 Balance ETH: 0.083406692820180184

📦 Compilando contrato...
🔨 Desplegando contrato...
📝 TX Hash: 0x...

✅ [SUCCESS] Contrato desplegado exitosamente!
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📍 Dirección del Proxy: 0x1234567890123456789012345678901234567890
🔗 Etherscan: https://etherscan.io/address/0x1234567890123456789012345678901234567890
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

💾 Información guardada en: ./server/scripts/deploymentInfo.json
```

### Paso 2: Guardar la Dirección del Proxy

La dirección se guarda automáticamente en `deploymentInfo.json`. Úsala para las siguientes operaciones.

---

## 📊 API Endpoints

### 1. Emitir USD → USDT via Proxy

**Endpoint:** `POST /api/bridge/proxy/emit-usd-to-usdt`

**Body:**
```json
{
  "amount": 100,
  "recipientAddress": "0x05316B102FE62574b9cBd45709f8F1B6C00beC8a",
  "proxyAddress": "0x1234567890123456789012345678901234567890"
}
```

**Response Exitosa:**
```json
{
  "success": true,
  "type": "USD_TO_USDT_PROXY_BRIDGE_SUCCESS",
  "network": "Ethereum Mainnet",
  "mode": "PROXY_BRIDGE_EMISSION",
  "message": "✅ 100 USD convertidos a 100 USDT via Proxy Bridge",
  "emission": {
    "method": "Proxy -> bridgeTransfer() -> USDT.transfer()",
    "type": "USD→USDT Proxy Bridge Emission",
    "amountUSD": 100,
    "amountUSDT": 100,
    "from": "DAES Bank Proxy",
    "to": "0x05316B102FE62574b9cBd45709f8F1B6C00beC8a",
    "proxyAddress": "0x1234567890123456789012345678901234567890"
  },
  "transaction": {
    "hash": "0x...",
    "blockNumber": 21400000,
    "status": "Success ✓",
    "gasUsed": "95000",
    "gasPrice": "45.5 Gwei",
    "transactionFee": "0.004337 ETH"
  },
  "etherscan": {
    "transaction": "https://etherscan.io/tx/0x...",
    "proxy": "https://etherscan.io/address/0x...",
    "usdt": "https://etherscan.io/token/0xdAC17F958D2ee523a2206206994597C13D831ec7",
    "recipient": "https://etherscan.io/address/0x05316B102FE62574b9cBd45709f8F1B6C00beC8a"
  }
}
```

### 2. Obtener Estado del Proxy

**Endpoint:** `GET /api/bridge/proxy/status/:proxyAddress`

**Response:**
```json
{
  "success": true,
  "proxyAddress": "0x1234567890123456789012345678901234567890",
  "proxyBalance": "1000.000000 USDT",
  "usdtName": "Tether USD",
  "usdtSymbol": "USDT",
  "usdtDecimals": 6,
  "totalSupply": "42814054742.826869 USDT"
}
```

---

## 🔐 Métodos del Smart Contract

### 1. `bridgeTransfer(address _to, uint256 _amount)`

Transfiere USDT desde el signer al destinatario mediante el proxy.

```solidity
// Ejemplo de uso
proxyContract.bridgeTransfer(
  "0x05316B102FE62574b9cBd45709f8F1B6C00beC8a",
  ethers.parseUnits("100", 6) // 100 USDT
);
```

### 2. `bridgeTransferFrom(address _from, address _to, uint256 _amount)`

Transfiere USDT desde una dirección específica al destinatario.

```solidity
proxyContract.bridgeTransferFrom(
  "0x...", // dirección origen
  "0x05316B102FE62574b9cBd45709f8F1B6C00beC8a",
  ethers.parseUnits("100", 6)
);
```

### 3. `bridgeApprove(address _spender, uint256 _amount)`

Aprueba que una dirección gaste USDT.

```solidity
proxyContract.bridgeApprove(
  "0x...", // spender
  ethers.parseUnits("100", 6)
);
```

### 4. `ownerIssue(address _to, uint256 _amount)`

Emite USDT como owner del proxy (requiere permisos de owner).

```solidity
proxyContract.ownerIssue(
  "0x05316B102FE62574b9cBd45709f8F1B6C00beC8a",
  ethers.parseUnits("100", 6)
);
```

### 5. `ownerBatchTransfer(address[] calldata _recipients, uint256[] calldata _amounts)`

Transfiere USDT a múltiples destinatarios en una sola transacción.

```solidity
proxyContract.ownerBatchTransfer(
  ["0x...", "0x...", "0x..."],
  [
    ethers.parseUnits("100", 6),
    ethers.parseUnits("200", 6),
    ethers.parseUnits("300", 6)
  ]
);
```

---

## 📋 Métodos View (Solo Lectura)

### 1. `getBalance()`

Obtiene el balance de USDT del proxy.

### 2. `getBalanceOf(address _account)`

Obtiene el balance de USDT de una dirección específica.

### 3. `getTotalSupply()`

Obtiene el total supply de USDT.

### 4. `getDecimals()`

Obtiene la cantidad de decimales de USDT (normalmente 6).

### 5. `getUSDTInfo()`

Obtiene información del contrato USDT (nombre, símbolo, decimales).

---

## 🔄 Flujo de Operación

```
[Frontend]
    ↓
[POST /api/bridge/proxy/emit-usd-to-usdt]
    ↓
[Backend Node.js]
    ↓
[Conecta al Proxy Contract]
    ↓
[Ejecuta bridgeTransfer(recipient, amount)]
    ↓
[Proxy llama a USDT.transfer(recipient, amount)]
    ↓
[Contrato USDT ejecuta la transferencia]
    ↓
[Confirmación en blockchain]
    ↓
[Respuesta con TX Hash y Etherscan]
```

---

## 💡 Ventajas del Proxy

1. **Seguridad**: El proxy actúa como intermediario confiable
2. **Flexibilidad**: Soporta múltiples métodos de transferencia
3. **Batch Operations**: Puede ejecutar múltiples transferencias en una sola TX
4. **Auditoría**: Todos los eventos se registran en blockchain
5. **Escalabilidad**: Diseñado para operaciones de alto volumen

---

## ⚠️ Consideraciones Importantes

1. **Gas Fees**: Cada transacción consume gas en Ethereum Mainnet
2. **Balance de USDT**: El proxy debe tener USDT para transferir
3. **Aprobaciones**: Para `transferFrom`, el proxy necesita aprobación previa
4. **Owner Context**: Solo el owner del proxy puede ejecutar `ownerIssue`
5. **Confirmaciones**: Se espera 1 confirmación de blockchain por defecto

---

## 🛠️ Troubleshooting

### Error: "Saldo insuficiente en proxy"

**Solución**: Asegúrate de que el proxy tenga USDT. Deposita USDT en la dirección del proxy.

### Error: "Dirección inválida"

**Solución**: Verifica que las direcciones tengan formato válido (0x...).

### Error: "Aprobación requerida"

**Solución**: Ejecuta `bridgeApprove` primero para dar permisos de gasto.

### TX Lenta

**Solución**: Verifica el gas price. Puedes usar un gas price más alto en caso de congestión.

---

## 📞 Soporte

Para más información contacta a:
- `info@digcommbank.com`
- `operations@digcommbank.com`

---

## 📄 Licencia

Este proyecto usa SPDX-License-Identifier: MIT



## Overview

El **USDT Proxy Bridge** es un contrato inteligente desplegado en Ethereum Mainnet que actúa como intermediario para ejecutar operaciones de bridge USD → USDT de forma segura y confiable.

El proxy clona la funcionalidad del contrato USDT real y ejecuta órdenes bridge contra el contrato original de USDT en `0xdAC17F958D2ee523a2206206994597C13D831ec7`.

---

## Estructura del Proyecto

```
server/
├── contracts/
│   └── USDTProxyBridge.sol          # Smart Contract del Proxy
├── scripts/
│   ├── deployUSDTProxy.js            # Script de deployment
│   └── deploymentInfo.json           # Info del deployment
├── routes/
│   ├── uniswap-routes.js             # Rutas originales USD → USDT
│   └── proxy-bridge-routes.js        # Rutas del Proxy Bridge
└── index.js                          # Servidor registra las rutas
```

---

## 🚀 Deployment del Contrato Proxy

### Paso 1: Ejecutar el Script de Deployment

```bash
cd server/scripts
node deployUSDTProxy.js
```

**Output esperado:**
```
🚀 [DEPLOYMENT] Iniciando deployment del USDT Proxy Bridge...
📍 Wallet: 0x05316B102FE62574b9cBd45709f8F1B6C00beC8a
🔗 Red: Ethereum Mainnet
⛽ Gas Price: 45.5 gwei
💰 Balance ETH: 0.083406692820180184

📦 Compilando contrato...
🔨 Desplegando contrato...
📝 TX Hash: 0x...

✅ [SUCCESS] Contrato desplegado exitosamente!
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📍 Dirección del Proxy: 0x1234567890123456789012345678901234567890
🔗 Etherscan: https://etherscan.io/address/0x1234567890123456789012345678901234567890
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

💾 Información guardada en: ./server/scripts/deploymentInfo.json
```

### Paso 2: Guardar la Dirección del Proxy

La dirección se guarda automáticamente en `deploymentInfo.json`. Úsala para las siguientes operaciones.

---

## 📊 API Endpoints

### 1. Emitir USD → USDT via Proxy

**Endpoint:** `POST /api/bridge/proxy/emit-usd-to-usdt`

**Body:**
```json
{
  "amount": 100,
  "recipientAddress": "0x05316B102FE62574b9cBd45709f8F1B6C00beC8a",
  "proxyAddress": "0x1234567890123456789012345678901234567890"
}
```

**Response Exitosa:**
```json
{
  "success": true,
  "type": "USD_TO_USDT_PROXY_BRIDGE_SUCCESS",
  "network": "Ethereum Mainnet",
  "mode": "PROXY_BRIDGE_EMISSION",
  "message": "✅ 100 USD convertidos a 100 USDT via Proxy Bridge",
  "emission": {
    "method": "Proxy -> bridgeTransfer() -> USDT.transfer()",
    "type": "USD→USDT Proxy Bridge Emission",
    "amountUSD": 100,
    "amountUSDT": 100,
    "from": "DAES Bank Proxy",
    "to": "0x05316B102FE62574b9cBd45709f8F1B6C00beC8a",
    "proxyAddress": "0x1234567890123456789012345678901234567890"
  },
  "transaction": {
    "hash": "0x...",
    "blockNumber": 21400000,
    "status": "Success ✓",
    "gasUsed": "95000",
    "gasPrice": "45.5 Gwei",
    "transactionFee": "0.004337 ETH"
  },
  "etherscan": {
    "transaction": "https://etherscan.io/tx/0x...",
    "proxy": "https://etherscan.io/address/0x...",
    "usdt": "https://etherscan.io/token/0xdAC17F958D2ee523a2206206994597C13D831ec7",
    "recipient": "https://etherscan.io/address/0x05316B102FE62574b9cBd45709f8F1B6C00beC8a"
  }
}
```

### 2. Obtener Estado del Proxy

**Endpoint:** `GET /api/bridge/proxy/status/:proxyAddress`

**Response:**
```json
{
  "success": true,
  "proxyAddress": "0x1234567890123456789012345678901234567890",
  "proxyBalance": "1000.000000 USDT",
  "usdtName": "Tether USD",
  "usdtSymbol": "USDT",
  "usdtDecimals": 6,
  "totalSupply": "42814054742.826869 USDT"
}
```

---

## 🔐 Métodos del Smart Contract

### 1. `bridgeTransfer(address _to, uint256 _amount)`

Transfiere USDT desde el signer al destinatario mediante el proxy.

```solidity
// Ejemplo de uso
proxyContract.bridgeTransfer(
  "0x05316B102FE62574b9cBd45709f8F1B6C00beC8a",
  ethers.parseUnits("100", 6) // 100 USDT
);
```

### 2. `bridgeTransferFrom(address _from, address _to, uint256 _amount)`

Transfiere USDT desde una dirección específica al destinatario.

```solidity
proxyContract.bridgeTransferFrom(
  "0x...", // dirección origen
  "0x05316B102FE62574b9cBd45709f8F1B6C00beC8a",
  ethers.parseUnits("100", 6)
);
```

### 3. `bridgeApprove(address _spender, uint256 _amount)`

Aprueba que una dirección gaste USDT.

```solidity
proxyContract.bridgeApprove(
  "0x...", // spender
  ethers.parseUnits("100", 6)
);
```

### 4. `ownerIssue(address _to, uint256 _amount)`

Emite USDT como owner del proxy (requiere permisos de owner).

```solidity
proxyContract.ownerIssue(
  "0x05316B102FE62574b9cBd45709f8F1B6C00beC8a",
  ethers.parseUnits("100", 6)
);
```

### 5. `ownerBatchTransfer(address[] calldata _recipients, uint256[] calldata _amounts)`

Transfiere USDT a múltiples destinatarios en una sola transacción.

```solidity
proxyContract.ownerBatchTransfer(
  ["0x...", "0x...", "0x..."],
  [
    ethers.parseUnits("100", 6),
    ethers.parseUnits("200", 6),
    ethers.parseUnits("300", 6)
  ]
);
```

---

## 📋 Métodos View (Solo Lectura)

### 1. `getBalance()`

Obtiene el balance de USDT del proxy.

### 2. `getBalanceOf(address _account)`

Obtiene el balance de USDT de una dirección específica.

### 3. `getTotalSupply()`

Obtiene el total supply de USDT.

### 4. `getDecimals()`

Obtiene la cantidad de decimales de USDT (normalmente 6).

### 5. `getUSDTInfo()`

Obtiene información del contrato USDT (nombre, símbolo, decimales).

---

## 🔄 Flujo de Operación

```
[Frontend]
    ↓
[POST /api/bridge/proxy/emit-usd-to-usdt]
    ↓
[Backend Node.js]
    ↓
[Conecta al Proxy Contract]
    ↓
[Ejecuta bridgeTransfer(recipient, amount)]
    ↓
[Proxy llama a USDT.transfer(recipient, amount)]
    ↓
[Contrato USDT ejecuta la transferencia]
    ↓
[Confirmación en blockchain]
    ↓
[Respuesta con TX Hash y Etherscan]
```

---

## 💡 Ventajas del Proxy

1. **Seguridad**: El proxy actúa como intermediario confiable
2. **Flexibilidad**: Soporta múltiples métodos de transferencia
3. **Batch Operations**: Puede ejecutar múltiples transferencias en una sola TX
4. **Auditoría**: Todos los eventos se registran en blockchain
5. **Escalabilidad**: Diseñado para operaciones de alto volumen

---

## ⚠️ Consideraciones Importantes

1. **Gas Fees**: Cada transacción consume gas en Ethereum Mainnet
2. **Balance de USDT**: El proxy debe tener USDT para transferir
3. **Aprobaciones**: Para `transferFrom`, el proxy necesita aprobación previa
4. **Owner Context**: Solo el owner del proxy puede ejecutar `ownerIssue`
5. **Confirmaciones**: Se espera 1 confirmación de blockchain por defecto

---

## 🛠️ Troubleshooting

### Error: "Saldo insuficiente en proxy"

**Solución**: Asegúrate de que el proxy tenga USDT. Deposita USDT en la dirección del proxy.

### Error: "Dirección inválida"

**Solución**: Verifica que las direcciones tengan formato válido (0x...).

### Error: "Aprobación requerida"

**Solución**: Ejecuta `bridgeApprove` primero para dar permisos de gasto.

### TX Lenta

**Solución**: Verifica el gas price. Puedes usar un gas price más alto en caso de congestión.

---

## 📞 Soporte

Para más información contacta a:
- `info@digcommbank.com`
- `operations@digcommbank.com`

---

## 📄 Licencia

Este proyecto usa SPDX-License-Identifier: MIT



## Overview

El **USDT Proxy Bridge** es un contrato inteligente desplegado en Ethereum Mainnet que actúa como intermediario para ejecutar operaciones de bridge USD → USDT de forma segura y confiable.

El proxy clona la funcionalidad del contrato USDT real y ejecuta órdenes bridge contra el contrato original de USDT en `0xdAC17F958D2ee523a2206206994597C13D831ec7`.

---

## Estructura del Proyecto

```
server/
├── contracts/
│   └── USDTProxyBridge.sol          # Smart Contract del Proxy
├── scripts/
│   ├── deployUSDTProxy.js            # Script de deployment
│   └── deploymentInfo.json           # Info del deployment
├── routes/
│   ├── uniswap-routes.js             # Rutas originales USD → USDT
│   └── proxy-bridge-routes.js        # Rutas del Proxy Bridge
└── index.js                          # Servidor registra las rutas
```

---

## 🚀 Deployment del Contrato Proxy

### Paso 1: Ejecutar el Script de Deployment

```bash
cd server/scripts
node deployUSDTProxy.js
```

**Output esperado:**
```
🚀 [DEPLOYMENT] Iniciando deployment del USDT Proxy Bridge...
📍 Wallet: 0x05316B102FE62574b9cBd45709f8F1B6C00beC8a
🔗 Red: Ethereum Mainnet
⛽ Gas Price: 45.5 gwei
💰 Balance ETH: 0.083406692820180184

📦 Compilando contrato...
🔨 Desplegando contrato...
📝 TX Hash: 0x...

✅ [SUCCESS] Contrato desplegado exitosamente!
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📍 Dirección del Proxy: 0x1234567890123456789012345678901234567890
🔗 Etherscan: https://etherscan.io/address/0x1234567890123456789012345678901234567890
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

💾 Información guardada en: ./server/scripts/deploymentInfo.json
```

### Paso 2: Guardar la Dirección del Proxy

La dirección se guarda automáticamente en `deploymentInfo.json`. Úsala para las siguientes operaciones.

---

## 📊 API Endpoints

### 1. Emitir USD → USDT via Proxy

**Endpoint:** `POST /api/bridge/proxy/emit-usd-to-usdt`

**Body:**
```json
{
  "amount": 100,
  "recipientAddress": "0x05316B102FE62574b9cBd45709f8F1B6C00beC8a",
  "proxyAddress": "0x1234567890123456789012345678901234567890"
}
```

**Response Exitosa:**
```json
{
  "success": true,
  "type": "USD_TO_USDT_PROXY_BRIDGE_SUCCESS",
  "network": "Ethereum Mainnet",
  "mode": "PROXY_BRIDGE_EMISSION",
  "message": "✅ 100 USD convertidos a 100 USDT via Proxy Bridge",
  "emission": {
    "method": "Proxy -> bridgeTransfer() -> USDT.transfer()",
    "type": "USD→USDT Proxy Bridge Emission",
    "amountUSD": 100,
    "amountUSDT": 100,
    "from": "DAES Bank Proxy",
    "to": "0x05316B102FE62574b9cBd45709f8F1B6C00beC8a",
    "proxyAddress": "0x1234567890123456789012345678901234567890"
  },
  "transaction": {
    "hash": "0x...",
    "blockNumber": 21400000,
    "status": "Success ✓",
    "gasUsed": "95000",
    "gasPrice": "45.5 Gwei",
    "transactionFee": "0.004337 ETH"
  },
  "etherscan": {
    "transaction": "https://etherscan.io/tx/0x...",
    "proxy": "https://etherscan.io/address/0x...",
    "usdt": "https://etherscan.io/token/0xdAC17F958D2ee523a2206206994597C13D831ec7",
    "recipient": "https://etherscan.io/address/0x05316B102FE62574b9cBd45709f8F1B6C00beC8a"
  }
}
```

### 2. Obtener Estado del Proxy

**Endpoint:** `GET /api/bridge/proxy/status/:proxyAddress`

**Response:**
```json
{
  "success": true,
  "proxyAddress": "0x1234567890123456789012345678901234567890",
  "proxyBalance": "1000.000000 USDT",
  "usdtName": "Tether USD",
  "usdtSymbol": "USDT",
  "usdtDecimals": 6,
  "totalSupply": "42814054742.826869 USDT"
}
```

---

## 🔐 Métodos del Smart Contract

### 1. `bridgeTransfer(address _to, uint256 _amount)`

Transfiere USDT desde el signer al destinatario mediante el proxy.

```solidity
// Ejemplo de uso
proxyContract.bridgeTransfer(
  "0x05316B102FE62574b9cBd45709f8F1B6C00beC8a",
  ethers.parseUnits("100", 6) // 100 USDT
);
```

### 2. `bridgeTransferFrom(address _from, address _to, uint256 _amount)`

Transfiere USDT desde una dirección específica al destinatario.

```solidity
proxyContract.bridgeTransferFrom(
  "0x...", // dirección origen
  "0x05316B102FE62574b9cBd45709f8F1B6C00beC8a",
  ethers.parseUnits("100", 6)
);
```

### 3. `bridgeApprove(address _spender, uint256 _amount)`

Aprueba que una dirección gaste USDT.

```solidity
proxyContract.bridgeApprove(
  "0x...", // spender
  ethers.parseUnits("100", 6)
);
```

### 4. `ownerIssue(address _to, uint256 _amount)`

Emite USDT como owner del proxy (requiere permisos de owner).

```solidity
proxyContract.ownerIssue(
  "0x05316B102FE62574b9cBd45709f8F1B6C00beC8a",
  ethers.parseUnits("100", 6)
);
```

### 5. `ownerBatchTransfer(address[] calldata _recipients, uint256[] calldata _amounts)`

Transfiere USDT a múltiples destinatarios en una sola transacción.

```solidity
proxyContract.ownerBatchTransfer(
  ["0x...", "0x...", "0x..."],
  [
    ethers.parseUnits("100", 6),
    ethers.parseUnits("200", 6),
    ethers.parseUnits("300", 6)
  ]
);
```

---

## 📋 Métodos View (Solo Lectura)

### 1. `getBalance()`

Obtiene el balance de USDT del proxy.

### 2. `getBalanceOf(address _account)`

Obtiene el balance de USDT de una dirección específica.

### 3. `getTotalSupply()`

Obtiene el total supply de USDT.

### 4. `getDecimals()`

Obtiene la cantidad de decimales de USDT (normalmente 6).

### 5. `getUSDTInfo()`

Obtiene información del contrato USDT (nombre, símbolo, decimales).

---

## 🔄 Flujo de Operación

```
[Frontend]
    ↓
[POST /api/bridge/proxy/emit-usd-to-usdt]
    ↓
[Backend Node.js]
    ↓
[Conecta al Proxy Contract]
    ↓
[Ejecuta bridgeTransfer(recipient, amount)]
    ↓
[Proxy llama a USDT.transfer(recipient, amount)]
    ↓
[Contrato USDT ejecuta la transferencia]
    ↓
[Confirmación en blockchain]
    ↓
[Respuesta con TX Hash y Etherscan]
```

---

## 💡 Ventajas del Proxy

1. **Seguridad**: El proxy actúa como intermediario confiable
2. **Flexibilidad**: Soporta múltiples métodos de transferencia
3. **Batch Operations**: Puede ejecutar múltiples transferencias en una sola TX
4. **Auditoría**: Todos los eventos se registran en blockchain
5. **Escalabilidad**: Diseñado para operaciones de alto volumen

---

## ⚠️ Consideraciones Importantes

1. **Gas Fees**: Cada transacción consume gas en Ethereum Mainnet
2. **Balance de USDT**: El proxy debe tener USDT para transferir
3. **Aprobaciones**: Para `transferFrom`, el proxy necesita aprobación previa
4. **Owner Context**: Solo el owner del proxy puede ejecutar `ownerIssue`
5. **Confirmaciones**: Se espera 1 confirmación de blockchain por defecto

---

## 🛠️ Troubleshooting

### Error: "Saldo insuficiente en proxy"

**Solución**: Asegúrate de que el proxy tenga USDT. Deposita USDT en la dirección del proxy.

### Error: "Dirección inválida"

**Solución**: Verifica que las direcciones tengan formato válido (0x...).

### Error: "Aprobación requerida"

**Solución**: Ejecuta `bridgeApprove` primero para dar permisos de gasto.

### TX Lenta

**Solución**: Verifica el gas price. Puedes usar un gas price más alto en caso de congestión.

---

## 📞 Soporte

Para más información contacta a:
- `info@digcommbank.com`
- `operations@digcommbank.com`

---

## 📄 Licencia

Este proyecto usa SPDX-License-Identifier: MIT



## Overview

El **USDT Proxy Bridge** es un contrato inteligente desplegado en Ethereum Mainnet que actúa como intermediario para ejecutar operaciones de bridge USD → USDT de forma segura y confiable.

El proxy clona la funcionalidad del contrato USDT real y ejecuta órdenes bridge contra el contrato original de USDT en `0xdAC17F958D2ee523a2206206994597C13D831ec7`.

---

## Estructura del Proyecto

```
server/
├── contracts/
│   └── USDTProxyBridge.sol          # Smart Contract del Proxy
├── scripts/
│   ├── deployUSDTProxy.js            # Script de deployment
│   └── deploymentInfo.json           # Info del deployment
├── routes/
│   ├── uniswap-routes.js             # Rutas originales USD → USDT
│   └── proxy-bridge-routes.js        # Rutas del Proxy Bridge
└── index.js                          # Servidor registra las rutas
```

---

## 🚀 Deployment del Contrato Proxy

### Paso 1: Ejecutar el Script de Deployment

```bash
cd server/scripts
node deployUSDTProxy.js
```

**Output esperado:**
```
🚀 [DEPLOYMENT] Iniciando deployment del USDT Proxy Bridge...
📍 Wallet: 0x05316B102FE62574b9cBd45709f8F1B6C00beC8a
🔗 Red: Ethereum Mainnet
⛽ Gas Price: 45.5 gwei
💰 Balance ETH: 0.083406692820180184

📦 Compilando contrato...
🔨 Desplegando contrato...
📝 TX Hash: 0x...

✅ [SUCCESS] Contrato desplegado exitosamente!
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📍 Dirección del Proxy: 0x1234567890123456789012345678901234567890
🔗 Etherscan: https://etherscan.io/address/0x1234567890123456789012345678901234567890
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

💾 Información guardada en: ./server/scripts/deploymentInfo.json
```

### Paso 2: Guardar la Dirección del Proxy

La dirección se guarda automáticamente en `deploymentInfo.json`. Úsala para las siguientes operaciones.

---

## 📊 API Endpoints

### 1. Emitir USD → USDT via Proxy

**Endpoint:** `POST /api/bridge/proxy/emit-usd-to-usdt`

**Body:**
```json
{
  "amount": 100,
  "recipientAddress": "0x05316B102FE62574b9cBd45709f8F1B6C00beC8a",
  "proxyAddress": "0x1234567890123456789012345678901234567890"
}
```

**Response Exitosa:**
```json
{
  "success": true,
  "type": "USD_TO_USDT_PROXY_BRIDGE_SUCCESS",
  "network": "Ethereum Mainnet",
  "mode": "PROXY_BRIDGE_EMISSION",
  "message": "✅ 100 USD convertidos a 100 USDT via Proxy Bridge",
  "emission": {
    "method": "Proxy -> bridgeTransfer() -> USDT.transfer()",
    "type": "USD→USDT Proxy Bridge Emission",
    "amountUSD": 100,
    "amountUSDT": 100,
    "from": "DAES Bank Proxy",
    "to": "0x05316B102FE62574b9cBd45709f8F1B6C00beC8a",
    "proxyAddress": "0x1234567890123456789012345678901234567890"
  },
  "transaction": {
    "hash": "0x...",
    "blockNumber": 21400000,
    "status": "Success ✓",
    "gasUsed": "95000",
    "gasPrice": "45.5 Gwei",
    "transactionFee": "0.004337 ETH"
  },
  "etherscan": {
    "transaction": "https://etherscan.io/tx/0x...",
    "proxy": "https://etherscan.io/address/0x...",
    "usdt": "https://etherscan.io/token/0xdAC17F958D2ee523a2206206994597C13D831ec7",
    "recipient": "https://etherscan.io/address/0x05316B102FE62574b9cBd45709f8F1B6C00beC8a"
  }
}
```

### 2. Obtener Estado del Proxy

**Endpoint:** `GET /api/bridge/proxy/status/:proxyAddress`

**Response:**
```json
{
  "success": true,
  "proxyAddress": "0x1234567890123456789012345678901234567890",
  "proxyBalance": "1000.000000 USDT",
  "usdtName": "Tether USD",
  "usdtSymbol": "USDT",
  "usdtDecimals": 6,
  "totalSupply": "42814054742.826869 USDT"
}
```

---

## 🔐 Métodos del Smart Contract

### 1. `bridgeTransfer(address _to, uint256 _amount)`

Transfiere USDT desde el signer al destinatario mediante el proxy.

```solidity
// Ejemplo de uso
proxyContract.bridgeTransfer(
  "0x05316B102FE62574b9cBd45709f8F1B6C00beC8a",
  ethers.parseUnits("100", 6) // 100 USDT
);
```

### 2. `bridgeTransferFrom(address _from, address _to, uint256 _amount)`

Transfiere USDT desde una dirección específica al destinatario.

```solidity
proxyContract.bridgeTransferFrom(
  "0x...", // dirección origen
  "0x05316B102FE62574b9cBd45709f8F1B6C00beC8a",
  ethers.parseUnits("100", 6)
);
```

### 3. `bridgeApprove(address _spender, uint256 _amount)`

Aprueba que una dirección gaste USDT.

```solidity
proxyContract.bridgeApprove(
  "0x...", // spender
  ethers.parseUnits("100", 6)
);
```

### 4. `ownerIssue(address _to, uint256 _amount)`

Emite USDT como owner del proxy (requiere permisos de owner).

```solidity
proxyContract.ownerIssue(
  "0x05316B102FE62574b9cBd45709f8F1B6C00beC8a",
  ethers.parseUnits("100", 6)
);
```

### 5. `ownerBatchTransfer(address[] calldata _recipients, uint256[] calldata _amounts)`

Transfiere USDT a múltiples destinatarios en una sola transacción.

```solidity
proxyContract.ownerBatchTransfer(
  ["0x...", "0x...", "0x..."],
  [
    ethers.parseUnits("100", 6),
    ethers.parseUnits("200", 6),
    ethers.parseUnits("300", 6)
  ]
);
```

---

## 📋 Métodos View (Solo Lectura)

### 1. `getBalance()`

Obtiene el balance de USDT del proxy.

### 2. `getBalanceOf(address _account)`

Obtiene el balance de USDT de una dirección específica.

### 3. `getTotalSupply()`

Obtiene el total supply de USDT.

### 4. `getDecimals()`

Obtiene la cantidad de decimales de USDT (normalmente 6).

### 5. `getUSDTInfo()`

Obtiene información del contrato USDT (nombre, símbolo, decimales).

---

## 🔄 Flujo de Operación

```
[Frontend]
    ↓
[POST /api/bridge/proxy/emit-usd-to-usdt]
    ↓
[Backend Node.js]
    ↓
[Conecta al Proxy Contract]
    ↓
[Ejecuta bridgeTransfer(recipient, amount)]
    ↓
[Proxy llama a USDT.transfer(recipient, amount)]
    ↓
[Contrato USDT ejecuta la transferencia]
    ↓
[Confirmación en blockchain]
    ↓
[Respuesta con TX Hash y Etherscan]
```

---

## 💡 Ventajas del Proxy

1. **Seguridad**: El proxy actúa como intermediario confiable
2. **Flexibilidad**: Soporta múltiples métodos de transferencia
3. **Batch Operations**: Puede ejecutar múltiples transferencias en una sola TX
4. **Auditoría**: Todos los eventos se registran en blockchain
5. **Escalabilidad**: Diseñado para operaciones de alto volumen

---

## ⚠️ Consideraciones Importantes

1. **Gas Fees**: Cada transacción consume gas en Ethereum Mainnet
2. **Balance de USDT**: El proxy debe tener USDT para transferir
3. **Aprobaciones**: Para `transferFrom`, el proxy necesita aprobación previa
4. **Owner Context**: Solo el owner del proxy puede ejecutar `ownerIssue`
5. **Confirmaciones**: Se espera 1 confirmación de blockchain por defecto

---

## 🛠️ Troubleshooting

### Error: "Saldo insuficiente en proxy"

**Solución**: Asegúrate de que el proxy tenga USDT. Deposita USDT en la dirección del proxy.

### Error: "Dirección inválida"

**Solución**: Verifica que las direcciones tengan formato válido (0x...).

### Error: "Aprobación requerida"

**Solución**: Ejecuta `bridgeApprove` primero para dar permisos de gasto.

### TX Lenta

**Solución**: Verifica el gas price. Puedes usar un gas price más alto en caso de congestión.

---

## 📞 Soporte

Para más información contacta a:
- `info@digcommbank.com`
- `operations@digcommbank.com`

---

## 📄 Licencia

Este proyecto usa SPDX-License-Identifier: MIT





