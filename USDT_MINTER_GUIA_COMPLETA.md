## 🚀 USDT MINTER - Contrato Intermedio para Emitir Más USDT

### ¿Qué es USDT Minter?

Es un **contrato intermedio en Solidity** que permite solicitar la emisión de más tokens USDT al contrato USDT real de Ethereum Mainnet. Actúa como un "puente" controlado para:

✅ Emitir más USDT de forma segura
✅ Registrar auditoría de todas las emisiones
✅ Gestionar límites de emisión
✅ Integrar con el bridge USD → USDT

---

## 📋 Estructura de Archivos Creados

```
blockchain/
├── contracts/
│   └── USDTMinter.sol          # Contrato intermedio para emitir USDT
└── scripts/
    └── createMoreTokens.js     # Script para ejecutar emisiones

server/
└── routes/
    └── usdt-minter-routes.js   # Rutas backend para el minter
```

---

## 📝 Paso 1: Preparación - Configurar el `.env`

Agregar al archivo `.env` (o crear si no existe):

```env
# Ethereum Mainnet RPC
ETH_RPC_URL=https://eth-mainnet.g.alchemy.com/v2/7iQ1gZ82J1A6Fig-QwHDb4_4GeoayYqj

# Clave privada del propietario (NUNCA compartir)
ETH_PRIVATE_KEY=d1bf385c43fb999290e3e0365f8cc45bfa97b780a97c6eb4bd790ec3fa09a036

# Dirección del contrato USDTMinter deployado
USDT_MINTER_ADDRESS=0x...  # Reemplazar con dirección real después de deploy
```

⚠️ **IMPORTANTE:** Nunca compartir la clave privada. Esto es solo para desarrollo.

---

## 🔧 Paso 2: Instalar Dependencias

```bash
# Instalar web3.js para el script
npm install web3

# O usar ethers.js (ya instalado)
# npm install ethers
```

---

## 🛠️ Paso 3: Deploy del Contrato USDTMinter en Remix IDE

### 3.1 Ir a Remix IDE
- Acceder a: https://remix.ethereum.org

### 3.2 Crear el Archivo
- Crear nuevo archivo: `USDTMinter.sol`
- Copiar el contenido de `blockchain/contracts/USDTMinter.sol`

### 3.3 Compilar
- Seleccionar compilador: `0.8.0+`
- Click en "Compile USDTMinter.sol"

### 3.4 Deploy
- Ir a "Deploy & Run Transactions"
- Seleccionar Network: "Ethereum Mainnet" (asegurarse que MetaMask está conectada)
- Seleccionar cuenta que tiene ETH
- Click en "Deploy"
- Copiar la dirección del contrato deployado

### 3.5 Guardar la Dirección
```bash
# Actualizar .env con la dirección del contrato
USDT_MINTER_ADDRESS=0x[dirección_del_contrato_deployado]
```

---

## 🚀 Paso 4: Ejecutar Emisión de USDT Vía Script

### 4.1 Opción A: Usar el Script Node.js

```bash
# Ejecutar el script
node blockchain/scripts/createMoreTokens.js
```

**Salida esperada:**
```
🚀 USDT MINTER - Iniciando emisión de tokens USDT

⚙️ Configuración:
  RPC: https://eth-mainnet.g.alchemy.com...
  USDT Minter: 0x...
  USDT Real: 0xdAC17F958D2ee523a2206206994597C13D831ec7
  Cantidad: 1000 USDT
  Razón: Development testing

📡 PASO 1: Conectando a Ethereum Mainnet...
✅ Conectado al RPC

🔑 PASO 2: Creando signer (propietario)...
✅ Signer: 0x...
💰 Balance ETH: 0.5 ETH

✨ PASO 8: Verificando resultados...
💵 Nuevo balance USDT en Minter: 1000 USDT
📈 Nuevo Supply Total USDT: 1000 USDT
➕ USDT emitidos: 1000 USDT

✅ ===== EMISSION SUCCESSFUL =====
TX Hash: 0x...
Bloque: #19850123
USDT emitidos: 1000 USDT
Etherscan: https://etherscan.io/tx/0x...
Total Supply (actualizado): 1000 USDT
```

---

## 🌐 Paso 5: Usar la API Backend para Emitir USDT

### 5.1 Endpoint: Emitir USDT

**URL:** `POST http://localhost:3000/api/usdt-minter/issue`

**Request:**
```json
{
  "amount": 1000,
  "reason": "Bridge testing - USD to USDT conversion"
}
```

**Response (Éxito):**
```json
{
  "success": true,
  "type": "USDT_MINTER_ISSUE_SUCCESS",
  "txHash": "0x...",
  "blockNumber": 19850123,
  "amountIssued": 1000,
  "reason": "Bridge testing - USD to USDT conversion",
  "network": "Ethereum Mainnet",
  "contractAddress": "0x...",
  "usdtAddress": "0xdAC17F958D2ee523a2206206994597C13D831ec7",
  "balanceAfter": "1000",
  "totalSupplyAfter": "1000",
  "etherscanUrl": "https://etherscan.io/tx/0x...",
  "timestamp": "2025-01-03T10:00:00.000Z"
}
```

### 5.2 Endpoint: Verificar Estado del Minter

**URL:** `GET http://localhost:3000/api/usdt-minter/status`

**Response:**
```json
{
  "success": true,
  "status": "active",
  "minterAddress": "0x...",
  "usdtAddress": "0xdAC17F958D2ee523a2206206994597C13D831ec7",
  "minterBalance": "1000 USDT",
  "totalSupply": "1000 USDT",
  "totalIssueRecords": "2",
  "network": "Ethereum Mainnet",
  "decimals": 6
}
```

### 5.3 Endpoint: Validar Configuración

**URL:** `POST http://localhost:3000/api/usdt-minter/validate-setup`

**Response:**
```json
{
  "success": true,
  "configuration": {
    "rpcUrl": "https://eth-mainnet.g.alchemy.com...",
    "signerAddress": "0x...",
    "signerBalance": "0.5 ETH",
    "minterAddress": "0x...",
    "usdtAddress": "0xdAC17F958D2ee523a2206206994597C13D831ec7",
    "hasPrivateKey": true
  }
}
```

---

## 🔗 Paso 6: Integración con Bridge USD → USDT

El bridge (`/api/uniswap/swap`) ya usa esta función automáticamente. El flujo es:

```
1. Usuario solicita convertir USD → USDT
2. Backend calcula cantidad (1:1 con 1% comisión)
3. Backend llama a `/api/usdt-minter/issue` para emitir USDT
4. USDT emitido se transfiere al usuario
5. Se retorna TX Hash y Etherscan link
```

**Llamada de ejemplo desde frontend:**

```typescript
// Convertir 100 USD a USDT
const response = await fetch('/api/uniswap/swap', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    amount: 100,
    recipientAddress: '0x...',
    slippageTolerance: 1
  })
});
```

---

## 📊 Solución de Problemas

### ❌ Error: "USDT_MINTER_ADDRESS no configurada"
**Solución:** Actualizar `.env` con la dirección del contrato deployado.

### ❌ Error: "Balance ETH insuficiente"
**Solución:** Enviar ETH a la dirección del signer para pagar gas.

### ❌ Error: "RPC no disponible"
**Solución:** Verificar que `ETH_RPC_URL` es válido y está en línea.

### ❌ Error: "Permission Denied" en la emisión
**Solución:** Verificar que el signer es el propietario del contrato USDTMinter.

---

## 📖 Documentación del Contrato USDTMinter

### Funciones Públicas

#### `issueUSDT(uint256 amount, string memory reason) → bool`
Emitir USDT al contrato USDT real.
- **amount:** Cantidad en wei (con 6 decimales)
- **reason:** Razón de la emisión (para auditoría)
- **Retorna:** `true` si exitoso

#### `transferUSDT(address to, uint256 amount) → bool`
Transferir USDT a una dirección.
- **to:** Dirección receptora
- **amount:** Cantidad en wei

#### `getBalance() → uint256`
Obtener balance USDT del contrato.

#### `getTotalSupply() → uint256`
Obtener supply total de USDT.

#### `getDecimals() → uint8`
Obtener decimales de USDT (normalmente 6).

#### `getIssueRecords() → IssueRecord[]`
Obtener historial de todas las emisiones.

#### `setMaxIssuePerTransaction(uint256 newLimit)`
Cambiar límite máximo de emisión por transacción.

---

## 🔐 Seguridad

✅ **onlyOwner:** Solo el propietario puede emitir
✅ **Límites de Emisión:** Máximo 1 millón USDT por transacción
✅ **Auditoría Completa:** Cada emisión queda registrada
✅ **Try-Catch:** Manejo seguro de errores

---

## 📈 Ventajas de este Enfoque

1. **Intermedio Controlado:** No llamas directamente a USDT, evitas permisos restringidos
2. **Auditoría Completa:** Registro de todas las emisiones
3. **Limits de Seguridad:** Límites de cantidad por transacción
4. **Integración Fácil:** API REST para usar desde cualquier lado
5. **Desarrollo Seguro:** Puede testearse en Sepolia sin tocar Mainnet

---

## 🚀 Siguiente Paso: Testear el Sistema

1. Deploy el contrato en Remix
2. Actualiza `.env` con la dirección
3. Ejecuta: `node blockchain/scripts/createMoreTokens.js`
4. Verifica en Etherscan que USDT fue emitido
5. Prueba el endpoint API: `POST /api/usdt-minter/issue`

¡Listo! Ahora tienes un sistema real para emitir USDT. 🎉




### ¿Qué es USDT Minter?

Es un **contrato intermedio en Solidity** que permite solicitar la emisión de más tokens USDT al contrato USDT real de Ethereum Mainnet. Actúa como un "puente" controlado para:

✅ Emitir más USDT de forma segura
✅ Registrar auditoría de todas las emisiones
✅ Gestionar límites de emisión
✅ Integrar con el bridge USD → USDT

---

## 📋 Estructura de Archivos Creados

```
blockchain/
├── contracts/
│   └── USDTMinter.sol          # Contrato intermedio para emitir USDT
└── scripts/
    └── createMoreTokens.js     # Script para ejecutar emisiones

server/
└── routes/
    └── usdt-minter-routes.js   # Rutas backend para el minter
```

---

## 📝 Paso 1: Preparación - Configurar el `.env`

Agregar al archivo `.env` (o crear si no existe):

```env
# Ethereum Mainnet RPC
ETH_RPC_URL=https://eth-mainnet.g.alchemy.com/v2/7iQ1gZ82J1A6Fig-QwHDb4_4GeoayYqj

# Clave privada del propietario (NUNCA compartir)
ETH_PRIVATE_KEY=d1bf385c43fb999290e3e0365f8cc45bfa97b780a97c6eb4bd790ec3fa09a036

# Dirección del contrato USDTMinter deployado
USDT_MINTER_ADDRESS=0x...  # Reemplazar con dirección real después de deploy
```

⚠️ **IMPORTANTE:** Nunca compartir la clave privada. Esto es solo para desarrollo.

---

## 🔧 Paso 2: Instalar Dependencias

```bash
# Instalar web3.js para el script
npm install web3

# O usar ethers.js (ya instalado)
# npm install ethers
```

---

## 🛠️ Paso 3: Deploy del Contrato USDTMinter en Remix IDE

### 3.1 Ir a Remix IDE
- Acceder a: https://remix.ethereum.org

### 3.2 Crear el Archivo
- Crear nuevo archivo: `USDTMinter.sol`
- Copiar el contenido de `blockchain/contracts/USDTMinter.sol`

### 3.3 Compilar
- Seleccionar compilador: `0.8.0+`
- Click en "Compile USDTMinter.sol"

### 3.4 Deploy
- Ir a "Deploy & Run Transactions"
- Seleccionar Network: "Ethereum Mainnet" (asegurarse que MetaMask está conectada)
- Seleccionar cuenta que tiene ETH
- Click en "Deploy"
- Copiar la dirección del contrato deployado

### 3.5 Guardar la Dirección
```bash
# Actualizar .env con la dirección del contrato
USDT_MINTER_ADDRESS=0x[dirección_del_contrato_deployado]
```

---

## 🚀 Paso 4: Ejecutar Emisión de USDT Vía Script

### 4.1 Opción A: Usar el Script Node.js

```bash
# Ejecutar el script
node blockchain/scripts/createMoreTokens.js
```

**Salida esperada:**
```
🚀 USDT MINTER - Iniciando emisión de tokens USDT

⚙️ Configuración:
  RPC: https://eth-mainnet.g.alchemy.com...
  USDT Minter: 0x...
  USDT Real: 0xdAC17F958D2ee523a2206206994597C13D831ec7
  Cantidad: 1000 USDT
  Razón: Development testing

📡 PASO 1: Conectando a Ethereum Mainnet...
✅ Conectado al RPC

🔑 PASO 2: Creando signer (propietario)...
✅ Signer: 0x...
💰 Balance ETH: 0.5 ETH

✨ PASO 8: Verificando resultados...
💵 Nuevo balance USDT en Minter: 1000 USDT
📈 Nuevo Supply Total USDT: 1000 USDT
➕ USDT emitidos: 1000 USDT

✅ ===== EMISSION SUCCESSFUL =====
TX Hash: 0x...
Bloque: #19850123
USDT emitidos: 1000 USDT
Etherscan: https://etherscan.io/tx/0x...
Total Supply (actualizado): 1000 USDT
```

---

## 🌐 Paso 5: Usar la API Backend para Emitir USDT

### 5.1 Endpoint: Emitir USDT

**URL:** `POST http://localhost:3000/api/usdt-minter/issue`

**Request:**
```json
{
  "amount": 1000,
  "reason": "Bridge testing - USD to USDT conversion"
}
```

**Response (Éxito):**
```json
{
  "success": true,
  "type": "USDT_MINTER_ISSUE_SUCCESS",
  "txHash": "0x...",
  "blockNumber": 19850123,
  "amountIssued": 1000,
  "reason": "Bridge testing - USD to USDT conversion",
  "network": "Ethereum Mainnet",
  "contractAddress": "0x...",
  "usdtAddress": "0xdAC17F958D2ee523a2206206994597C13D831ec7",
  "balanceAfter": "1000",
  "totalSupplyAfter": "1000",
  "etherscanUrl": "https://etherscan.io/tx/0x...",
  "timestamp": "2025-01-03T10:00:00.000Z"
}
```

### 5.2 Endpoint: Verificar Estado del Minter

**URL:** `GET http://localhost:3000/api/usdt-minter/status`

**Response:**
```json
{
  "success": true,
  "status": "active",
  "minterAddress": "0x...",
  "usdtAddress": "0xdAC17F958D2ee523a2206206994597C13D831ec7",
  "minterBalance": "1000 USDT",
  "totalSupply": "1000 USDT",
  "totalIssueRecords": "2",
  "network": "Ethereum Mainnet",
  "decimals": 6
}
```

### 5.3 Endpoint: Validar Configuración

**URL:** `POST http://localhost:3000/api/usdt-minter/validate-setup`

**Response:**
```json
{
  "success": true,
  "configuration": {
    "rpcUrl": "https://eth-mainnet.g.alchemy.com...",
    "signerAddress": "0x...",
    "signerBalance": "0.5 ETH",
    "minterAddress": "0x...",
    "usdtAddress": "0xdAC17F958D2ee523a2206206994597C13D831ec7",
    "hasPrivateKey": true
  }
}
```

---

## 🔗 Paso 6: Integración con Bridge USD → USDT

El bridge (`/api/uniswap/swap`) ya usa esta función automáticamente. El flujo es:

```
1. Usuario solicita convertir USD → USDT
2. Backend calcula cantidad (1:1 con 1% comisión)
3. Backend llama a `/api/usdt-minter/issue` para emitir USDT
4. USDT emitido se transfiere al usuario
5. Se retorna TX Hash y Etherscan link
```

**Llamada de ejemplo desde frontend:**

```typescript
// Convertir 100 USD a USDT
const response = await fetch('/api/uniswap/swap', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    amount: 100,
    recipientAddress: '0x...',
    slippageTolerance: 1
  })
});
```

---

## 📊 Solución de Problemas

### ❌ Error: "USDT_MINTER_ADDRESS no configurada"
**Solución:** Actualizar `.env` con la dirección del contrato deployado.

### ❌ Error: "Balance ETH insuficiente"
**Solución:** Enviar ETH a la dirección del signer para pagar gas.

### ❌ Error: "RPC no disponible"
**Solución:** Verificar que `ETH_RPC_URL` es válido y está en línea.

### ❌ Error: "Permission Denied" en la emisión
**Solución:** Verificar que el signer es el propietario del contrato USDTMinter.

---

## 📖 Documentación del Contrato USDTMinter

### Funciones Públicas

#### `issueUSDT(uint256 amount, string memory reason) → bool`
Emitir USDT al contrato USDT real.
- **amount:** Cantidad en wei (con 6 decimales)
- **reason:** Razón de la emisión (para auditoría)
- **Retorna:** `true` si exitoso

#### `transferUSDT(address to, uint256 amount) → bool`
Transferir USDT a una dirección.
- **to:** Dirección receptora
- **amount:** Cantidad en wei

#### `getBalance() → uint256`
Obtener balance USDT del contrato.

#### `getTotalSupply() → uint256`
Obtener supply total de USDT.

#### `getDecimals() → uint8`
Obtener decimales de USDT (normalmente 6).

#### `getIssueRecords() → IssueRecord[]`
Obtener historial de todas las emisiones.

#### `setMaxIssuePerTransaction(uint256 newLimit)`
Cambiar límite máximo de emisión por transacción.

---

## 🔐 Seguridad

✅ **onlyOwner:** Solo el propietario puede emitir
✅ **Límites de Emisión:** Máximo 1 millón USDT por transacción
✅ **Auditoría Completa:** Cada emisión queda registrada
✅ **Try-Catch:** Manejo seguro de errores

---

## 📈 Ventajas de este Enfoque

1. **Intermedio Controlado:** No llamas directamente a USDT, evitas permisos restringidos
2. **Auditoría Completa:** Registro de todas las emisiones
3. **Limits de Seguridad:** Límites de cantidad por transacción
4. **Integración Fácil:** API REST para usar desde cualquier lado
5. **Desarrollo Seguro:** Puede testearse en Sepolia sin tocar Mainnet

---

## 🚀 Siguiente Paso: Testear el Sistema

1. Deploy el contrato en Remix
2. Actualiza `.env` con la dirección
3. Ejecuta: `node blockchain/scripts/createMoreTokens.js`
4. Verifica en Etherscan que USDT fue emitido
5. Prueba el endpoint API: `POST /api/usdt-minter/issue`

¡Listo! Ahora tienes un sistema real para emitir USDT. 🎉





### ¿Qué es USDT Minter?

Es un **contrato intermedio en Solidity** que permite solicitar la emisión de más tokens USDT al contrato USDT real de Ethereum Mainnet. Actúa como un "puente" controlado para:

✅ Emitir más USDT de forma segura
✅ Registrar auditoría de todas las emisiones
✅ Gestionar límites de emisión
✅ Integrar con el bridge USD → USDT

---

## 📋 Estructura de Archivos Creados

```
blockchain/
├── contracts/
│   └── USDTMinter.sol          # Contrato intermedio para emitir USDT
└── scripts/
    └── createMoreTokens.js     # Script para ejecutar emisiones

server/
└── routes/
    └── usdt-minter-routes.js   # Rutas backend para el minter
```

---

## 📝 Paso 1: Preparación - Configurar el `.env`

Agregar al archivo `.env` (o crear si no existe):

```env
# Ethereum Mainnet RPC
ETH_RPC_URL=https://eth-mainnet.g.alchemy.com/v2/7iQ1gZ82J1A6Fig-QwHDb4_4GeoayYqj

# Clave privada del propietario (NUNCA compartir)
ETH_PRIVATE_KEY=d1bf385c43fb999290e3e0365f8cc45bfa97b780a97c6eb4bd790ec3fa09a036

# Dirección del contrato USDTMinter deployado
USDT_MINTER_ADDRESS=0x...  # Reemplazar con dirección real después de deploy
```

⚠️ **IMPORTANTE:** Nunca compartir la clave privada. Esto es solo para desarrollo.

---

## 🔧 Paso 2: Instalar Dependencias

```bash
# Instalar web3.js para el script
npm install web3

# O usar ethers.js (ya instalado)
# npm install ethers
```

---

## 🛠️ Paso 3: Deploy del Contrato USDTMinter en Remix IDE

### 3.1 Ir a Remix IDE
- Acceder a: https://remix.ethereum.org

### 3.2 Crear el Archivo
- Crear nuevo archivo: `USDTMinter.sol`
- Copiar el contenido de `blockchain/contracts/USDTMinter.sol`

### 3.3 Compilar
- Seleccionar compilador: `0.8.0+`
- Click en "Compile USDTMinter.sol"

### 3.4 Deploy
- Ir a "Deploy & Run Transactions"
- Seleccionar Network: "Ethereum Mainnet" (asegurarse que MetaMask está conectada)
- Seleccionar cuenta que tiene ETH
- Click en "Deploy"
- Copiar la dirección del contrato deployado

### 3.5 Guardar la Dirección
```bash
# Actualizar .env con la dirección del contrato
USDT_MINTER_ADDRESS=0x[dirección_del_contrato_deployado]
```

---

## 🚀 Paso 4: Ejecutar Emisión de USDT Vía Script

### 4.1 Opción A: Usar el Script Node.js

```bash
# Ejecutar el script
node blockchain/scripts/createMoreTokens.js
```

**Salida esperada:**
```
🚀 USDT MINTER - Iniciando emisión de tokens USDT

⚙️ Configuración:
  RPC: https://eth-mainnet.g.alchemy.com...
  USDT Minter: 0x...
  USDT Real: 0xdAC17F958D2ee523a2206206994597C13D831ec7
  Cantidad: 1000 USDT
  Razón: Development testing

📡 PASO 1: Conectando a Ethereum Mainnet...
✅ Conectado al RPC

🔑 PASO 2: Creando signer (propietario)...
✅ Signer: 0x...
💰 Balance ETH: 0.5 ETH

✨ PASO 8: Verificando resultados...
💵 Nuevo balance USDT en Minter: 1000 USDT
📈 Nuevo Supply Total USDT: 1000 USDT
➕ USDT emitidos: 1000 USDT

✅ ===== EMISSION SUCCESSFUL =====
TX Hash: 0x...
Bloque: #19850123
USDT emitidos: 1000 USDT
Etherscan: https://etherscan.io/tx/0x...
Total Supply (actualizado): 1000 USDT
```

---

## 🌐 Paso 5: Usar la API Backend para Emitir USDT

### 5.1 Endpoint: Emitir USDT

**URL:** `POST http://localhost:3000/api/usdt-minter/issue`

**Request:**
```json
{
  "amount": 1000,
  "reason": "Bridge testing - USD to USDT conversion"
}
```

**Response (Éxito):**
```json
{
  "success": true,
  "type": "USDT_MINTER_ISSUE_SUCCESS",
  "txHash": "0x...",
  "blockNumber": 19850123,
  "amountIssued": 1000,
  "reason": "Bridge testing - USD to USDT conversion",
  "network": "Ethereum Mainnet",
  "contractAddress": "0x...",
  "usdtAddress": "0xdAC17F958D2ee523a2206206994597C13D831ec7",
  "balanceAfter": "1000",
  "totalSupplyAfter": "1000",
  "etherscanUrl": "https://etherscan.io/tx/0x...",
  "timestamp": "2025-01-03T10:00:00.000Z"
}
```

### 5.2 Endpoint: Verificar Estado del Minter

**URL:** `GET http://localhost:3000/api/usdt-minter/status`

**Response:**
```json
{
  "success": true,
  "status": "active",
  "minterAddress": "0x...",
  "usdtAddress": "0xdAC17F958D2ee523a2206206994597C13D831ec7",
  "minterBalance": "1000 USDT",
  "totalSupply": "1000 USDT",
  "totalIssueRecords": "2",
  "network": "Ethereum Mainnet",
  "decimals": 6
}
```

### 5.3 Endpoint: Validar Configuración

**URL:** `POST http://localhost:3000/api/usdt-minter/validate-setup`

**Response:**
```json
{
  "success": true,
  "configuration": {
    "rpcUrl": "https://eth-mainnet.g.alchemy.com...",
    "signerAddress": "0x...",
    "signerBalance": "0.5 ETH",
    "minterAddress": "0x...",
    "usdtAddress": "0xdAC17F958D2ee523a2206206994597C13D831ec7",
    "hasPrivateKey": true
  }
}
```

---

## 🔗 Paso 6: Integración con Bridge USD → USDT

El bridge (`/api/uniswap/swap`) ya usa esta función automáticamente. El flujo es:

```
1. Usuario solicita convertir USD → USDT
2. Backend calcula cantidad (1:1 con 1% comisión)
3. Backend llama a `/api/usdt-minter/issue` para emitir USDT
4. USDT emitido se transfiere al usuario
5. Se retorna TX Hash y Etherscan link
```

**Llamada de ejemplo desde frontend:**

```typescript
// Convertir 100 USD a USDT
const response = await fetch('/api/uniswap/swap', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    amount: 100,
    recipientAddress: '0x...',
    slippageTolerance: 1
  })
});
```

---

## 📊 Solución de Problemas

### ❌ Error: "USDT_MINTER_ADDRESS no configurada"
**Solución:** Actualizar `.env` con la dirección del contrato deployado.

### ❌ Error: "Balance ETH insuficiente"
**Solución:** Enviar ETH a la dirección del signer para pagar gas.

### ❌ Error: "RPC no disponible"
**Solución:** Verificar que `ETH_RPC_URL` es válido y está en línea.

### ❌ Error: "Permission Denied" en la emisión
**Solución:** Verificar que el signer es el propietario del contrato USDTMinter.

---

## 📖 Documentación del Contrato USDTMinter

### Funciones Públicas

#### `issueUSDT(uint256 amount, string memory reason) → bool`
Emitir USDT al contrato USDT real.
- **amount:** Cantidad en wei (con 6 decimales)
- **reason:** Razón de la emisión (para auditoría)
- **Retorna:** `true` si exitoso

#### `transferUSDT(address to, uint256 amount) → bool`
Transferir USDT a una dirección.
- **to:** Dirección receptora
- **amount:** Cantidad en wei

#### `getBalance() → uint256`
Obtener balance USDT del contrato.

#### `getTotalSupply() → uint256`
Obtener supply total de USDT.

#### `getDecimals() → uint8`
Obtener decimales de USDT (normalmente 6).

#### `getIssueRecords() → IssueRecord[]`
Obtener historial de todas las emisiones.

#### `setMaxIssuePerTransaction(uint256 newLimit)`
Cambiar límite máximo de emisión por transacción.

---

## 🔐 Seguridad

✅ **onlyOwner:** Solo el propietario puede emitir
✅ **Límites de Emisión:** Máximo 1 millón USDT por transacción
✅ **Auditoría Completa:** Cada emisión queda registrada
✅ **Try-Catch:** Manejo seguro de errores

---

## 📈 Ventajas de este Enfoque

1. **Intermedio Controlado:** No llamas directamente a USDT, evitas permisos restringidos
2. **Auditoría Completa:** Registro de todas las emisiones
3. **Limits de Seguridad:** Límites de cantidad por transacción
4. **Integración Fácil:** API REST para usar desde cualquier lado
5. **Desarrollo Seguro:** Puede testearse en Sepolia sin tocar Mainnet

---

## 🚀 Siguiente Paso: Testear el Sistema

1. Deploy el contrato en Remix
2. Actualiza `.env` con la dirección
3. Ejecuta: `node blockchain/scripts/createMoreTokens.js`
4. Verifica en Etherscan que USDT fue emitido
5. Prueba el endpoint API: `POST /api/usdt-minter/issue`

¡Listo! Ahora tienes un sistema real para emitir USDT. 🎉




### ¿Qué es USDT Minter?

Es un **contrato intermedio en Solidity** que permite solicitar la emisión de más tokens USDT al contrato USDT real de Ethereum Mainnet. Actúa como un "puente" controlado para:

✅ Emitir más USDT de forma segura
✅ Registrar auditoría de todas las emisiones
✅ Gestionar límites de emisión
✅ Integrar con el bridge USD → USDT

---

## 📋 Estructura de Archivos Creados

```
blockchain/
├── contracts/
│   └── USDTMinter.sol          # Contrato intermedio para emitir USDT
└── scripts/
    └── createMoreTokens.js     # Script para ejecutar emisiones

server/
└── routes/
    └── usdt-minter-routes.js   # Rutas backend para el minter
```

---

## 📝 Paso 1: Preparación - Configurar el `.env`

Agregar al archivo `.env` (o crear si no existe):

```env
# Ethereum Mainnet RPC
ETH_RPC_URL=https://eth-mainnet.g.alchemy.com/v2/7iQ1gZ82J1A6Fig-QwHDb4_4GeoayYqj

# Clave privada del propietario (NUNCA compartir)
ETH_PRIVATE_KEY=d1bf385c43fb999290e3e0365f8cc45bfa97b780a97c6eb4bd790ec3fa09a036

# Dirección del contrato USDTMinter deployado
USDT_MINTER_ADDRESS=0x...  # Reemplazar con dirección real después de deploy
```

⚠️ **IMPORTANTE:** Nunca compartir la clave privada. Esto es solo para desarrollo.

---

## 🔧 Paso 2: Instalar Dependencias

```bash
# Instalar web3.js para el script
npm install web3

# O usar ethers.js (ya instalado)
# npm install ethers
```

---

## 🛠️ Paso 3: Deploy del Contrato USDTMinter en Remix IDE

### 3.1 Ir a Remix IDE
- Acceder a: https://remix.ethereum.org

### 3.2 Crear el Archivo
- Crear nuevo archivo: `USDTMinter.sol`
- Copiar el contenido de `blockchain/contracts/USDTMinter.sol`

### 3.3 Compilar
- Seleccionar compilador: `0.8.0+`
- Click en "Compile USDTMinter.sol"

### 3.4 Deploy
- Ir a "Deploy & Run Transactions"
- Seleccionar Network: "Ethereum Mainnet" (asegurarse que MetaMask está conectada)
- Seleccionar cuenta que tiene ETH
- Click en "Deploy"
- Copiar la dirección del contrato deployado

### 3.5 Guardar la Dirección
```bash
# Actualizar .env con la dirección del contrato
USDT_MINTER_ADDRESS=0x[dirección_del_contrato_deployado]
```

---

## 🚀 Paso 4: Ejecutar Emisión de USDT Vía Script

### 4.1 Opción A: Usar el Script Node.js

```bash
# Ejecutar el script
node blockchain/scripts/createMoreTokens.js
```

**Salida esperada:**
```
🚀 USDT MINTER - Iniciando emisión de tokens USDT

⚙️ Configuración:
  RPC: https://eth-mainnet.g.alchemy.com...
  USDT Minter: 0x...
  USDT Real: 0xdAC17F958D2ee523a2206206994597C13D831ec7
  Cantidad: 1000 USDT
  Razón: Development testing

📡 PASO 1: Conectando a Ethereum Mainnet...
✅ Conectado al RPC

🔑 PASO 2: Creando signer (propietario)...
✅ Signer: 0x...
💰 Balance ETH: 0.5 ETH

✨ PASO 8: Verificando resultados...
💵 Nuevo balance USDT en Minter: 1000 USDT
📈 Nuevo Supply Total USDT: 1000 USDT
➕ USDT emitidos: 1000 USDT

✅ ===== EMISSION SUCCESSFUL =====
TX Hash: 0x...
Bloque: #19850123
USDT emitidos: 1000 USDT
Etherscan: https://etherscan.io/tx/0x...
Total Supply (actualizado): 1000 USDT
```

---

## 🌐 Paso 5: Usar la API Backend para Emitir USDT

### 5.1 Endpoint: Emitir USDT

**URL:** `POST http://localhost:3000/api/usdt-minter/issue`

**Request:**
```json
{
  "amount": 1000,
  "reason": "Bridge testing - USD to USDT conversion"
}
```

**Response (Éxito):**
```json
{
  "success": true,
  "type": "USDT_MINTER_ISSUE_SUCCESS",
  "txHash": "0x...",
  "blockNumber": 19850123,
  "amountIssued": 1000,
  "reason": "Bridge testing - USD to USDT conversion",
  "network": "Ethereum Mainnet",
  "contractAddress": "0x...",
  "usdtAddress": "0xdAC17F958D2ee523a2206206994597C13D831ec7",
  "balanceAfter": "1000",
  "totalSupplyAfter": "1000",
  "etherscanUrl": "https://etherscan.io/tx/0x...",
  "timestamp": "2025-01-03T10:00:00.000Z"
}
```

### 5.2 Endpoint: Verificar Estado del Minter

**URL:** `GET http://localhost:3000/api/usdt-minter/status`

**Response:**
```json
{
  "success": true,
  "status": "active",
  "minterAddress": "0x...",
  "usdtAddress": "0xdAC17F958D2ee523a2206206994597C13D831ec7",
  "minterBalance": "1000 USDT",
  "totalSupply": "1000 USDT",
  "totalIssueRecords": "2",
  "network": "Ethereum Mainnet",
  "decimals": 6
}
```

### 5.3 Endpoint: Validar Configuración

**URL:** `POST http://localhost:3000/api/usdt-minter/validate-setup`

**Response:**
```json
{
  "success": true,
  "configuration": {
    "rpcUrl": "https://eth-mainnet.g.alchemy.com...",
    "signerAddress": "0x...",
    "signerBalance": "0.5 ETH",
    "minterAddress": "0x...",
    "usdtAddress": "0xdAC17F958D2ee523a2206206994597C13D831ec7",
    "hasPrivateKey": true
  }
}
```

---

## 🔗 Paso 6: Integración con Bridge USD → USDT

El bridge (`/api/uniswap/swap`) ya usa esta función automáticamente. El flujo es:

```
1. Usuario solicita convertir USD → USDT
2. Backend calcula cantidad (1:1 con 1% comisión)
3. Backend llama a `/api/usdt-minter/issue` para emitir USDT
4. USDT emitido se transfiere al usuario
5. Se retorna TX Hash y Etherscan link
```

**Llamada de ejemplo desde frontend:**

```typescript
// Convertir 100 USD a USDT
const response = await fetch('/api/uniswap/swap', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    amount: 100,
    recipientAddress: '0x...',
    slippageTolerance: 1
  })
});
```

---

## 📊 Solución de Problemas

### ❌ Error: "USDT_MINTER_ADDRESS no configurada"
**Solución:** Actualizar `.env` con la dirección del contrato deployado.

### ❌ Error: "Balance ETH insuficiente"
**Solución:** Enviar ETH a la dirección del signer para pagar gas.

### ❌ Error: "RPC no disponible"
**Solución:** Verificar que `ETH_RPC_URL` es válido y está en línea.

### ❌ Error: "Permission Denied" en la emisión
**Solución:** Verificar que el signer es el propietario del contrato USDTMinter.

---

## 📖 Documentación del Contrato USDTMinter

### Funciones Públicas

#### `issueUSDT(uint256 amount, string memory reason) → bool`
Emitir USDT al contrato USDT real.
- **amount:** Cantidad en wei (con 6 decimales)
- **reason:** Razón de la emisión (para auditoría)
- **Retorna:** `true` si exitoso

#### `transferUSDT(address to, uint256 amount) → bool`
Transferir USDT a una dirección.
- **to:** Dirección receptora
- **amount:** Cantidad en wei

#### `getBalance() → uint256`
Obtener balance USDT del contrato.

#### `getTotalSupply() → uint256`
Obtener supply total de USDT.

#### `getDecimals() → uint8`
Obtener decimales de USDT (normalmente 6).

#### `getIssueRecords() → IssueRecord[]`
Obtener historial de todas las emisiones.

#### `setMaxIssuePerTransaction(uint256 newLimit)`
Cambiar límite máximo de emisión por transacción.

---

## 🔐 Seguridad

✅ **onlyOwner:** Solo el propietario puede emitir
✅ **Límites de Emisión:** Máximo 1 millón USDT por transacción
✅ **Auditoría Completa:** Cada emisión queda registrada
✅ **Try-Catch:** Manejo seguro de errores

---

## 📈 Ventajas de este Enfoque

1. **Intermedio Controlado:** No llamas directamente a USDT, evitas permisos restringidos
2. **Auditoría Completa:** Registro de todas las emisiones
3. **Limits de Seguridad:** Límites de cantidad por transacción
4. **Integración Fácil:** API REST para usar desde cualquier lado
5. **Desarrollo Seguro:** Puede testearse en Sepolia sin tocar Mainnet

---

## 🚀 Siguiente Paso: Testear el Sistema

1. Deploy el contrato en Remix
2. Actualiza `.env` con la dirección
3. Ejecuta: `node blockchain/scripts/createMoreTokens.js`
4. Verifica en Etherscan que USDT fue emitido
5. Prueba el endpoint API: `POST /api/usdt-minter/issue`

¡Listo! Ahora tienes un sistema real para emitir USDT. 🎉





### ¿Qué es USDT Minter?

Es un **contrato intermedio en Solidity** que permite solicitar la emisión de más tokens USDT al contrato USDT real de Ethereum Mainnet. Actúa como un "puente" controlado para:

✅ Emitir más USDT de forma segura
✅ Registrar auditoría de todas las emisiones
✅ Gestionar límites de emisión
✅ Integrar con el bridge USD → USDT

---

## 📋 Estructura de Archivos Creados

```
blockchain/
├── contracts/
│   └── USDTMinter.sol          # Contrato intermedio para emitir USDT
└── scripts/
    └── createMoreTokens.js     # Script para ejecutar emisiones

server/
└── routes/
    └── usdt-minter-routes.js   # Rutas backend para el minter
```

---

## 📝 Paso 1: Preparación - Configurar el `.env`

Agregar al archivo `.env` (o crear si no existe):

```env
# Ethereum Mainnet RPC
ETH_RPC_URL=https://eth-mainnet.g.alchemy.com/v2/7iQ1gZ82J1A6Fig-QwHDb4_4GeoayYqj

# Clave privada del propietario (NUNCA compartir)
ETH_PRIVATE_KEY=d1bf385c43fb999290e3e0365f8cc45bfa97b780a97c6eb4bd790ec3fa09a036

# Dirección del contrato USDTMinter deployado
USDT_MINTER_ADDRESS=0x...  # Reemplazar con dirección real después de deploy
```

⚠️ **IMPORTANTE:** Nunca compartir la clave privada. Esto es solo para desarrollo.

---

## 🔧 Paso 2: Instalar Dependencias

```bash
# Instalar web3.js para el script
npm install web3

# O usar ethers.js (ya instalado)
# npm install ethers
```

---

## 🛠️ Paso 3: Deploy del Contrato USDTMinter en Remix IDE

### 3.1 Ir a Remix IDE
- Acceder a: https://remix.ethereum.org

### 3.2 Crear el Archivo
- Crear nuevo archivo: `USDTMinter.sol`
- Copiar el contenido de `blockchain/contracts/USDTMinter.sol`

### 3.3 Compilar
- Seleccionar compilador: `0.8.0+`
- Click en "Compile USDTMinter.sol"

### 3.4 Deploy
- Ir a "Deploy & Run Transactions"
- Seleccionar Network: "Ethereum Mainnet" (asegurarse que MetaMask está conectada)
- Seleccionar cuenta que tiene ETH
- Click en "Deploy"
- Copiar la dirección del contrato deployado

### 3.5 Guardar la Dirección
```bash
# Actualizar .env con la dirección del contrato
USDT_MINTER_ADDRESS=0x[dirección_del_contrato_deployado]
```

---

## 🚀 Paso 4: Ejecutar Emisión de USDT Vía Script

### 4.1 Opción A: Usar el Script Node.js

```bash
# Ejecutar el script
node blockchain/scripts/createMoreTokens.js
```

**Salida esperada:**
```
🚀 USDT MINTER - Iniciando emisión de tokens USDT

⚙️ Configuración:
  RPC: https://eth-mainnet.g.alchemy.com...
  USDT Minter: 0x...
  USDT Real: 0xdAC17F958D2ee523a2206206994597C13D831ec7
  Cantidad: 1000 USDT
  Razón: Development testing

📡 PASO 1: Conectando a Ethereum Mainnet...
✅ Conectado al RPC

🔑 PASO 2: Creando signer (propietario)...
✅ Signer: 0x...
💰 Balance ETH: 0.5 ETH

✨ PASO 8: Verificando resultados...
💵 Nuevo balance USDT en Minter: 1000 USDT
📈 Nuevo Supply Total USDT: 1000 USDT
➕ USDT emitidos: 1000 USDT

✅ ===== EMISSION SUCCESSFUL =====
TX Hash: 0x...
Bloque: #19850123
USDT emitidos: 1000 USDT
Etherscan: https://etherscan.io/tx/0x...
Total Supply (actualizado): 1000 USDT
```

---

## 🌐 Paso 5: Usar la API Backend para Emitir USDT

### 5.1 Endpoint: Emitir USDT

**URL:** `POST http://localhost:3000/api/usdt-minter/issue`

**Request:**
```json
{
  "amount": 1000,
  "reason": "Bridge testing - USD to USDT conversion"
}
```

**Response (Éxito):**
```json
{
  "success": true,
  "type": "USDT_MINTER_ISSUE_SUCCESS",
  "txHash": "0x...",
  "blockNumber": 19850123,
  "amountIssued": 1000,
  "reason": "Bridge testing - USD to USDT conversion",
  "network": "Ethereum Mainnet",
  "contractAddress": "0x...",
  "usdtAddress": "0xdAC17F958D2ee523a2206206994597C13D831ec7",
  "balanceAfter": "1000",
  "totalSupplyAfter": "1000",
  "etherscanUrl": "https://etherscan.io/tx/0x...",
  "timestamp": "2025-01-03T10:00:00.000Z"
}
```

### 5.2 Endpoint: Verificar Estado del Minter

**URL:** `GET http://localhost:3000/api/usdt-minter/status`

**Response:**
```json
{
  "success": true,
  "status": "active",
  "minterAddress": "0x...",
  "usdtAddress": "0xdAC17F958D2ee523a2206206994597C13D831ec7",
  "minterBalance": "1000 USDT",
  "totalSupply": "1000 USDT",
  "totalIssueRecords": "2",
  "network": "Ethereum Mainnet",
  "decimals": 6
}
```

### 5.3 Endpoint: Validar Configuración

**URL:** `POST http://localhost:3000/api/usdt-minter/validate-setup`

**Response:**
```json
{
  "success": true,
  "configuration": {
    "rpcUrl": "https://eth-mainnet.g.alchemy.com...",
    "signerAddress": "0x...",
    "signerBalance": "0.5 ETH",
    "minterAddress": "0x...",
    "usdtAddress": "0xdAC17F958D2ee523a2206206994597C13D831ec7",
    "hasPrivateKey": true
  }
}
```

---

## 🔗 Paso 6: Integración con Bridge USD → USDT

El bridge (`/api/uniswap/swap`) ya usa esta función automáticamente. El flujo es:

```
1. Usuario solicita convertir USD → USDT
2. Backend calcula cantidad (1:1 con 1% comisión)
3. Backend llama a `/api/usdt-minter/issue` para emitir USDT
4. USDT emitido se transfiere al usuario
5. Se retorna TX Hash y Etherscan link
```

**Llamada de ejemplo desde frontend:**

```typescript
// Convertir 100 USD a USDT
const response = await fetch('/api/uniswap/swap', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    amount: 100,
    recipientAddress: '0x...',
    slippageTolerance: 1
  })
});
```

---

## 📊 Solución de Problemas

### ❌ Error: "USDT_MINTER_ADDRESS no configurada"
**Solución:** Actualizar `.env` con la dirección del contrato deployado.

### ❌ Error: "Balance ETH insuficiente"
**Solución:** Enviar ETH a la dirección del signer para pagar gas.

### ❌ Error: "RPC no disponible"
**Solución:** Verificar que `ETH_RPC_URL` es válido y está en línea.

### ❌ Error: "Permission Denied" en la emisión
**Solución:** Verificar que el signer es el propietario del contrato USDTMinter.

---

## 📖 Documentación del Contrato USDTMinter

### Funciones Públicas

#### `issueUSDT(uint256 amount, string memory reason) → bool`
Emitir USDT al contrato USDT real.
- **amount:** Cantidad en wei (con 6 decimales)
- **reason:** Razón de la emisión (para auditoría)
- **Retorna:** `true` si exitoso

#### `transferUSDT(address to, uint256 amount) → bool`
Transferir USDT a una dirección.
- **to:** Dirección receptora
- **amount:** Cantidad en wei

#### `getBalance() → uint256`
Obtener balance USDT del contrato.

#### `getTotalSupply() → uint256`
Obtener supply total de USDT.

#### `getDecimals() → uint8`
Obtener decimales de USDT (normalmente 6).

#### `getIssueRecords() → IssueRecord[]`
Obtener historial de todas las emisiones.

#### `setMaxIssuePerTransaction(uint256 newLimit)`
Cambiar límite máximo de emisión por transacción.

---

## 🔐 Seguridad

✅ **onlyOwner:** Solo el propietario puede emitir
✅ **Límites de Emisión:** Máximo 1 millón USDT por transacción
✅ **Auditoría Completa:** Cada emisión queda registrada
✅ **Try-Catch:** Manejo seguro de errores

---

## 📈 Ventajas de este Enfoque

1. **Intermedio Controlado:** No llamas directamente a USDT, evitas permisos restringidos
2. **Auditoría Completa:** Registro de todas las emisiones
3. **Limits de Seguridad:** Límites de cantidad por transacción
4. **Integración Fácil:** API REST para usar desde cualquier lado
5. **Desarrollo Seguro:** Puede testearse en Sepolia sin tocar Mainnet

---

## 🚀 Siguiente Paso: Testear el Sistema

1. Deploy el contrato en Remix
2. Actualiza `.env` con la dirección
3. Ejecuta: `node blockchain/scripts/createMoreTokens.js`
4. Verifica en Etherscan que USDT fue emitido
5. Prueba el endpoint API: `POST /api/usdt-minter/issue`

¡Listo! Ahora tienes un sistema real para emitir USDT. 🎉




### ¿Qué es USDT Minter?

Es un **contrato intermedio en Solidity** que permite solicitar la emisión de más tokens USDT al contrato USDT real de Ethereum Mainnet. Actúa como un "puente" controlado para:

✅ Emitir más USDT de forma segura
✅ Registrar auditoría de todas las emisiones
✅ Gestionar límites de emisión
✅ Integrar con el bridge USD → USDT

---

## 📋 Estructura de Archivos Creados

```
blockchain/
├── contracts/
│   └── USDTMinter.sol          # Contrato intermedio para emitir USDT
└── scripts/
    └── createMoreTokens.js     # Script para ejecutar emisiones

server/
└── routes/
    └── usdt-minter-routes.js   # Rutas backend para el minter
```

---

## 📝 Paso 1: Preparación - Configurar el `.env`

Agregar al archivo `.env` (o crear si no existe):

```env
# Ethereum Mainnet RPC
ETH_RPC_URL=https://eth-mainnet.g.alchemy.com/v2/7iQ1gZ82J1A6Fig-QwHDb4_4GeoayYqj

# Clave privada del propietario (NUNCA compartir)
ETH_PRIVATE_KEY=d1bf385c43fb999290e3e0365f8cc45bfa97b780a97c6eb4bd790ec3fa09a036

# Dirección del contrato USDTMinter deployado
USDT_MINTER_ADDRESS=0x...  # Reemplazar con dirección real después de deploy
```

⚠️ **IMPORTANTE:** Nunca compartir la clave privada. Esto es solo para desarrollo.

---

## 🔧 Paso 2: Instalar Dependencias

```bash
# Instalar web3.js para el script
npm install web3

# O usar ethers.js (ya instalado)
# npm install ethers
```

---

## 🛠️ Paso 3: Deploy del Contrato USDTMinter en Remix IDE

### 3.1 Ir a Remix IDE
- Acceder a: https://remix.ethereum.org

### 3.2 Crear el Archivo
- Crear nuevo archivo: `USDTMinter.sol`
- Copiar el contenido de `blockchain/contracts/USDTMinter.sol`

### 3.3 Compilar
- Seleccionar compilador: `0.8.0+`
- Click en "Compile USDTMinter.sol"

### 3.4 Deploy
- Ir a "Deploy & Run Transactions"
- Seleccionar Network: "Ethereum Mainnet" (asegurarse que MetaMask está conectada)
- Seleccionar cuenta que tiene ETH
- Click en "Deploy"
- Copiar la dirección del contrato deployado

### 3.5 Guardar la Dirección
```bash
# Actualizar .env con la dirección del contrato
USDT_MINTER_ADDRESS=0x[dirección_del_contrato_deployado]
```

---

## 🚀 Paso 4: Ejecutar Emisión de USDT Vía Script

### 4.1 Opción A: Usar el Script Node.js

```bash
# Ejecutar el script
node blockchain/scripts/createMoreTokens.js
```

**Salida esperada:**
```
🚀 USDT MINTER - Iniciando emisión de tokens USDT

⚙️ Configuración:
  RPC: https://eth-mainnet.g.alchemy.com...
  USDT Minter: 0x...
  USDT Real: 0xdAC17F958D2ee523a2206206994597C13D831ec7
  Cantidad: 1000 USDT
  Razón: Development testing

📡 PASO 1: Conectando a Ethereum Mainnet...
✅ Conectado al RPC

🔑 PASO 2: Creando signer (propietario)...
✅ Signer: 0x...
💰 Balance ETH: 0.5 ETH

✨ PASO 8: Verificando resultados...
💵 Nuevo balance USDT en Minter: 1000 USDT
📈 Nuevo Supply Total USDT: 1000 USDT
➕ USDT emitidos: 1000 USDT

✅ ===== EMISSION SUCCESSFUL =====
TX Hash: 0x...
Bloque: #19850123
USDT emitidos: 1000 USDT
Etherscan: https://etherscan.io/tx/0x...
Total Supply (actualizado): 1000 USDT
```

---

## 🌐 Paso 5: Usar la API Backend para Emitir USDT

### 5.1 Endpoint: Emitir USDT

**URL:** `POST http://localhost:3000/api/usdt-minter/issue`

**Request:**
```json
{
  "amount": 1000,
  "reason": "Bridge testing - USD to USDT conversion"
}
```

**Response (Éxito):**
```json
{
  "success": true,
  "type": "USDT_MINTER_ISSUE_SUCCESS",
  "txHash": "0x...",
  "blockNumber": 19850123,
  "amountIssued": 1000,
  "reason": "Bridge testing - USD to USDT conversion",
  "network": "Ethereum Mainnet",
  "contractAddress": "0x...",
  "usdtAddress": "0xdAC17F958D2ee523a2206206994597C13D831ec7",
  "balanceAfter": "1000",
  "totalSupplyAfter": "1000",
  "etherscanUrl": "https://etherscan.io/tx/0x...",
  "timestamp": "2025-01-03T10:00:00.000Z"
}
```

### 5.2 Endpoint: Verificar Estado del Minter

**URL:** `GET http://localhost:3000/api/usdt-minter/status`

**Response:**
```json
{
  "success": true,
  "status": "active",
  "minterAddress": "0x...",
  "usdtAddress": "0xdAC17F958D2ee523a2206206994597C13D831ec7",
  "minterBalance": "1000 USDT",
  "totalSupply": "1000 USDT",
  "totalIssueRecords": "2",
  "network": "Ethereum Mainnet",
  "decimals": 6
}
```

### 5.3 Endpoint: Validar Configuración

**URL:** `POST http://localhost:3000/api/usdt-minter/validate-setup`

**Response:**
```json
{
  "success": true,
  "configuration": {
    "rpcUrl": "https://eth-mainnet.g.alchemy.com...",
    "signerAddress": "0x...",
    "signerBalance": "0.5 ETH",
    "minterAddress": "0x...",
    "usdtAddress": "0xdAC17F958D2ee523a2206206994597C13D831ec7",
    "hasPrivateKey": true
  }
}
```

---

## 🔗 Paso 6: Integración con Bridge USD → USDT

El bridge (`/api/uniswap/swap`) ya usa esta función automáticamente. El flujo es:

```
1. Usuario solicita convertir USD → USDT
2. Backend calcula cantidad (1:1 con 1% comisión)
3. Backend llama a `/api/usdt-minter/issue` para emitir USDT
4. USDT emitido se transfiere al usuario
5. Se retorna TX Hash y Etherscan link
```

**Llamada de ejemplo desde frontend:**

```typescript
// Convertir 100 USD a USDT
const response = await fetch('/api/uniswap/swap', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    amount: 100,
    recipientAddress: '0x...',
    slippageTolerance: 1
  })
});
```

---

## 📊 Solución de Problemas

### ❌ Error: "USDT_MINTER_ADDRESS no configurada"
**Solución:** Actualizar `.env` con la dirección del contrato deployado.

### ❌ Error: "Balance ETH insuficiente"
**Solución:** Enviar ETH a la dirección del signer para pagar gas.

### ❌ Error: "RPC no disponible"
**Solución:** Verificar que `ETH_RPC_URL` es válido y está en línea.

### ❌ Error: "Permission Denied" en la emisión
**Solución:** Verificar que el signer es el propietario del contrato USDTMinter.

---

## 📖 Documentación del Contrato USDTMinter

### Funciones Públicas

#### `issueUSDT(uint256 amount, string memory reason) → bool`
Emitir USDT al contrato USDT real.
- **amount:** Cantidad en wei (con 6 decimales)
- **reason:** Razón de la emisión (para auditoría)
- **Retorna:** `true` si exitoso

#### `transferUSDT(address to, uint256 amount) → bool`
Transferir USDT a una dirección.
- **to:** Dirección receptora
- **amount:** Cantidad en wei

#### `getBalance() → uint256`
Obtener balance USDT del contrato.

#### `getTotalSupply() → uint256`
Obtener supply total de USDT.

#### `getDecimals() → uint8`
Obtener decimales de USDT (normalmente 6).

#### `getIssueRecords() → IssueRecord[]`
Obtener historial de todas las emisiones.

#### `setMaxIssuePerTransaction(uint256 newLimit)`
Cambiar límite máximo de emisión por transacción.

---

## 🔐 Seguridad

✅ **onlyOwner:** Solo el propietario puede emitir
✅ **Límites de Emisión:** Máximo 1 millón USDT por transacción
✅ **Auditoría Completa:** Cada emisión queda registrada
✅ **Try-Catch:** Manejo seguro de errores

---

## 📈 Ventajas de este Enfoque

1. **Intermedio Controlado:** No llamas directamente a USDT, evitas permisos restringidos
2. **Auditoría Completa:** Registro de todas las emisiones
3. **Limits de Seguridad:** Límites de cantidad por transacción
4. **Integración Fácil:** API REST para usar desde cualquier lado
5. **Desarrollo Seguro:** Puede testearse en Sepolia sin tocar Mainnet

---

## 🚀 Siguiente Paso: Testear el Sistema

1. Deploy el contrato en Remix
2. Actualiza `.env` con la dirección
3. Ejecuta: `node blockchain/scripts/createMoreTokens.js`
4. Verifica en Etherscan que USDT fue emitido
5. Prueba el endpoint API: `POST /api/usdt-minter/issue`

¡Listo! Ahora tienes un sistema real para emitir USDT. 🎉





### ¿Qué es USDT Minter?

Es un **contrato intermedio en Solidity** que permite solicitar la emisión de más tokens USDT al contrato USDT real de Ethereum Mainnet. Actúa como un "puente" controlado para:

✅ Emitir más USDT de forma segura
✅ Registrar auditoría de todas las emisiones
✅ Gestionar límites de emisión
✅ Integrar con el bridge USD → USDT

---

## 📋 Estructura de Archivos Creados

```
blockchain/
├── contracts/
│   └── USDTMinter.sol          # Contrato intermedio para emitir USDT
└── scripts/
    └── createMoreTokens.js     # Script para ejecutar emisiones

server/
└── routes/
    └── usdt-minter-routes.js   # Rutas backend para el minter
```

---

## 📝 Paso 1: Preparación - Configurar el `.env`

Agregar al archivo `.env` (o crear si no existe):

```env
# Ethereum Mainnet RPC
ETH_RPC_URL=https://eth-mainnet.g.alchemy.com/v2/7iQ1gZ82J1A6Fig-QwHDb4_4GeoayYqj

# Clave privada del propietario (NUNCA compartir)
ETH_PRIVATE_KEY=d1bf385c43fb999290e3e0365f8cc45bfa97b780a97c6eb4bd790ec3fa09a036

# Dirección del contrato USDTMinter deployado
USDT_MINTER_ADDRESS=0x...  # Reemplazar con dirección real después de deploy
```

⚠️ **IMPORTANTE:** Nunca compartir la clave privada. Esto es solo para desarrollo.

---

## 🔧 Paso 2: Instalar Dependencias

```bash
# Instalar web3.js para el script
npm install web3

# O usar ethers.js (ya instalado)
# npm install ethers
```

---

## 🛠️ Paso 3: Deploy del Contrato USDTMinter en Remix IDE

### 3.1 Ir a Remix IDE
- Acceder a: https://remix.ethereum.org

### 3.2 Crear el Archivo
- Crear nuevo archivo: `USDTMinter.sol`
- Copiar el contenido de `blockchain/contracts/USDTMinter.sol`

### 3.3 Compilar
- Seleccionar compilador: `0.8.0+`
- Click en "Compile USDTMinter.sol"

### 3.4 Deploy
- Ir a "Deploy & Run Transactions"
- Seleccionar Network: "Ethereum Mainnet" (asegurarse que MetaMask está conectada)
- Seleccionar cuenta que tiene ETH
- Click en "Deploy"
- Copiar la dirección del contrato deployado

### 3.5 Guardar la Dirección
```bash
# Actualizar .env con la dirección del contrato
USDT_MINTER_ADDRESS=0x[dirección_del_contrato_deployado]
```

---

## 🚀 Paso 4: Ejecutar Emisión de USDT Vía Script

### 4.1 Opción A: Usar el Script Node.js

```bash
# Ejecutar el script
node blockchain/scripts/createMoreTokens.js
```

**Salida esperada:**
```
🚀 USDT MINTER - Iniciando emisión de tokens USDT

⚙️ Configuración:
  RPC: https://eth-mainnet.g.alchemy.com...
  USDT Minter: 0x...
  USDT Real: 0xdAC17F958D2ee523a2206206994597C13D831ec7
  Cantidad: 1000 USDT
  Razón: Development testing

📡 PASO 1: Conectando a Ethereum Mainnet...
✅ Conectado al RPC

🔑 PASO 2: Creando signer (propietario)...
✅ Signer: 0x...
💰 Balance ETH: 0.5 ETH

✨ PASO 8: Verificando resultados...
💵 Nuevo balance USDT en Minter: 1000 USDT
📈 Nuevo Supply Total USDT: 1000 USDT
➕ USDT emitidos: 1000 USDT

✅ ===== EMISSION SUCCESSFUL =====
TX Hash: 0x...
Bloque: #19850123
USDT emitidos: 1000 USDT
Etherscan: https://etherscan.io/tx/0x...
Total Supply (actualizado): 1000 USDT
```

---

## 🌐 Paso 5: Usar la API Backend para Emitir USDT

### 5.1 Endpoint: Emitir USDT

**URL:** `POST http://localhost:3000/api/usdt-minter/issue`

**Request:**
```json
{
  "amount": 1000,
  "reason": "Bridge testing - USD to USDT conversion"
}
```

**Response (Éxito):**
```json
{
  "success": true,
  "type": "USDT_MINTER_ISSUE_SUCCESS",
  "txHash": "0x...",
  "blockNumber": 19850123,
  "amountIssued": 1000,
  "reason": "Bridge testing - USD to USDT conversion",
  "network": "Ethereum Mainnet",
  "contractAddress": "0x...",
  "usdtAddress": "0xdAC17F958D2ee523a2206206994597C13D831ec7",
  "balanceAfter": "1000",
  "totalSupplyAfter": "1000",
  "etherscanUrl": "https://etherscan.io/tx/0x...",
  "timestamp": "2025-01-03T10:00:00.000Z"
}
```

### 5.2 Endpoint: Verificar Estado del Minter

**URL:** `GET http://localhost:3000/api/usdt-minter/status`

**Response:**
```json
{
  "success": true,
  "status": "active",
  "minterAddress": "0x...",
  "usdtAddress": "0xdAC17F958D2ee523a2206206994597C13D831ec7",
  "minterBalance": "1000 USDT",
  "totalSupply": "1000 USDT",
  "totalIssueRecords": "2",
  "network": "Ethereum Mainnet",
  "decimals": 6
}
```

### 5.3 Endpoint: Validar Configuración

**URL:** `POST http://localhost:3000/api/usdt-minter/validate-setup`

**Response:**
```json
{
  "success": true,
  "configuration": {
    "rpcUrl": "https://eth-mainnet.g.alchemy.com...",
    "signerAddress": "0x...",
    "signerBalance": "0.5 ETH",
    "minterAddress": "0x...",
    "usdtAddress": "0xdAC17F958D2ee523a2206206994597C13D831ec7",
    "hasPrivateKey": true
  }
}
```

---

## 🔗 Paso 6: Integración con Bridge USD → USDT

El bridge (`/api/uniswap/swap`) ya usa esta función automáticamente. El flujo es:

```
1. Usuario solicita convertir USD → USDT
2. Backend calcula cantidad (1:1 con 1% comisión)
3. Backend llama a `/api/usdt-minter/issue` para emitir USDT
4. USDT emitido se transfiere al usuario
5. Se retorna TX Hash y Etherscan link
```

**Llamada de ejemplo desde frontend:**

```typescript
// Convertir 100 USD a USDT
const response = await fetch('/api/uniswap/swap', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    amount: 100,
    recipientAddress: '0x...',
    slippageTolerance: 1
  })
});
```

---

## 📊 Solución de Problemas

### ❌ Error: "USDT_MINTER_ADDRESS no configurada"
**Solución:** Actualizar `.env` con la dirección del contrato deployado.

### ❌ Error: "Balance ETH insuficiente"
**Solución:** Enviar ETH a la dirección del signer para pagar gas.

### ❌ Error: "RPC no disponible"
**Solución:** Verificar que `ETH_RPC_URL` es válido y está en línea.

### ❌ Error: "Permission Denied" en la emisión
**Solución:** Verificar que el signer es el propietario del contrato USDTMinter.

---

## 📖 Documentación del Contrato USDTMinter

### Funciones Públicas

#### `issueUSDT(uint256 amount, string memory reason) → bool`
Emitir USDT al contrato USDT real.
- **amount:** Cantidad en wei (con 6 decimales)
- **reason:** Razón de la emisión (para auditoría)
- **Retorna:** `true` si exitoso

#### `transferUSDT(address to, uint256 amount) → bool`
Transferir USDT a una dirección.
- **to:** Dirección receptora
- **amount:** Cantidad en wei

#### `getBalance() → uint256`
Obtener balance USDT del contrato.

#### `getTotalSupply() → uint256`
Obtener supply total de USDT.

#### `getDecimals() → uint8`
Obtener decimales de USDT (normalmente 6).

#### `getIssueRecords() → IssueRecord[]`
Obtener historial de todas las emisiones.

#### `setMaxIssuePerTransaction(uint256 newLimit)`
Cambiar límite máximo de emisión por transacción.

---

## 🔐 Seguridad

✅ **onlyOwner:** Solo el propietario puede emitir
✅ **Límites de Emisión:** Máximo 1 millón USDT por transacción
✅ **Auditoría Completa:** Cada emisión queda registrada
✅ **Try-Catch:** Manejo seguro de errores

---

## 📈 Ventajas de este Enfoque

1. **Intermedio Controlado:** No llamas directamente a USDT, evitas permisos restringidos
2. **Auditoría Completa:** Registro de todas las emisiones
3. **Limits de Seguridad:** Límites de cantidad por transacción
4. **Integración Fácil:** API REST para usar desde cualquier lado
5. **Desarrollo Seguro:** Puede testearse en Sepolia sin tocar Mainnet

---

## 🚀 Siguiente Paso: Testear el Sistema

1. Deploy el contrato en Remix
2. Actualiza `.env` con la dirección
3. Ejecuta: `node blockchain/scripts/createMoreTokens.js`
4. Verifica en Etherscan que USDT fue emitido
5. Prueba el endpoint API: `POST /api/usdt-minter/issue`

¡Listo! Ahora tienes un sistema real para emitir USDT. 🎉




### ¿Qué es USDT Minter?

Es un **contrato intermedio en Solidity** que permite solicitar la emisión de más tokens USDT al contrato USDT real de Ethereum Mainnet. Actúa como un "puente" controlado para:

✅ Emitir más USDT de forma segura
✅ Registrar auditoría de todas las emisiones
✅ Gestionar límites de emisión
✅ Integrar con el bridge USD → USDT

---

## 📋 Estructura de Archivos Creados

```
blockchain/
├── contracts/
│   └── USDTMinter.sol          # Contrato intermedio para emitir USDT
└── scripts/
    └── createMoreTokens.js     # Script para ejecutar emisiones

server/
└── routes/
    └── usdt-minter-routes.js   # Rutas backend para el minter
```

---

## 📝 Paso 1: Preparación - Configurar el `.env`

Agregar al archivo `.env` (o crear si no existe):

```env
# Ethereum Mainnet RPC
ETH_RPC_URL=https://eth-mainnet.g.alchemy.com/v2/7iQ1gZ82J1A6Fig-QwHDb4_4GeoayYqj

# Clave privada del propietario (NUNCA compartir)
ETH_PRIVATE_KEY=d1bf385c43fb999290e3e0365f8cc45bfa97b780a97c6eb4bd790ec3fa09a036

# Dirección del contrato USDTMinter deployado
USDT_MINTER_ADDRESS=0x...  # Reemplazar con dirección real después de deploy
```

⚠️ **IMPORTANTE:** Nunca compartir la clave privada. Esto es solo para desarrollo.

---

## 🔧 Paso 2: Instalar Dependencias

```bash
# Instalar web3.js para el script
npm install web3

# O usar ethers.js (ya instalado)
# npm install ethers
```

---

## 🛠️ Paso 3: Deploy del Contrato USDTMinter en Remix IDE

### 3.1 Ir a Remix IDE
- Acceder a: https://remix.ethereum.org

### 3.2 Crear el Archivo
- Crear nuevo archivo: `USDTMinter.sol`
- Copiar el contenido de `blockchain/contracts/USDTMinter.sol`

### 3.3 Compilar
- Seleccionar compilador: `0.8.0+`
- Click en "Compile USDTMinter.sol"

### 3.4 Deploy
- Ir a "Deploy & Run Transactions"
- Seleccionar Network: "Ethereum Mainnet" (asegurarse que MetaMask está conectada)
- Seleccionar cuenta que tiene ETH
- Click en "Deploy"
- Copiar la dirección del contrato deployado

### 3.5 Guardar la Dirección
```bash
# Actualizar .env con la dirección del contrato
USDT_MINTER_ADDRESS=0x[dirección_del_contrato_deployado]
```

---

## 🚀 Paso 4: Ejecutar Emisión de USDT Vía Script

### 4.1 Opción A: Usar el Script Node.js

```bash
# Ejecutar el script
node blockchain/scripts/createMoreTokens.js
```

**Salida esperada:**
```
🚀 USDT MINTER - Iniciando emisión de tokens USDT

⚙️ Configuración:
  RPC: https://eth-mainnet.g.alchemy.com...
  USDT Minter: 0x...
  USDT Real: 0xdAC17F958D2ee523a2206206994597C13D831ec7
  Cantidad: 1000 USDT
  Razón: Development testing

📡 PASO 1: Conectando a Ethereum Mainnet...
✅ Conectado al RPC

🔑 PASO 2: Creando signer (propietario)...
✅ Signer: 0x...
💰 Balance ETH: 0.5 ETH

✨ PASO 8: Verificando resultados...
💵 Nuevo balance USDT en Minter: 1000 USDT
📈 Nuevo Supply Total USDT: 1000 USDT
➕ USDT emitidos: 1000 USDT

✅ ===== EMISSION SUCCESSFUL =====
TX Hash: 0x...
Bloque: #19850123
USDT emitidos: 1000 USDT
Etherscan: https://etherscan.io/tx/0x...
Total Supply (actualizado): 1000 USDT
```

---

## 🌐 Paso 5: Usar la API Backend para Emitir USDT

### 5.1 Endpoint: Emitir USDT

**URL:** `POST http://localhost:3000/api/usdt-minter/issue`

**Request:**
```json
{
  "amount": 1000,
  "reason": "Bridge testing - USD to USDT conversion"
}
```

**Response (Éxito):**
```json
{
  "success": true,
  "type": "USDT_MINTER_ISSUE_SUCCESS",
  "txHash": "0x...",
  "blockNumber": 19850123,
  "amountIssued": 1000,
  "reason": "Bridge testing - USD to USDT conversion",
  "network": "Ethereum Mainnet",
  "contractAddress": "0x...",
  "usdtAddress": "0xdAC17F958D2ee523a2206206994597C13D831ec7",
  "balanceAfter": "1000",
  "totalSupplyAfter": "1000",
  "etherscanUrl": "https://etherscan.io/tx/0x...",
  "timestamp": "2025-01-03T10:00:00.000Z"
}
```

### 5.2 Endpoint: Verificar Estado del Minter

**URL:** `GET http://localhost:3000/api/usdt-minter/status`

**Response:**
```json
{
  "success": true,
  "status": "active",
  "minterAddress": "0x...",
  "usdtAddress": "0xdAC17F958D2ee523a2206206994597C13D831ec7",
  "minterBalance": "1000 USDT",
  "totalSupply": "1000 USDT",
  "totalIssueRecords": "2",
  "network": "Ethereum Mainnet",
  "decimals": 6
}
```

### 5.3 Endpoint: Validar Configuración

**URL:** `POST http://localhost:3000/api/usdt-minter/validate-setup`

**Response:**
```json
{
  "success": true,
  "configuration": {
    "rpcUrl": "https://eth-mainnet.g.alchemy.com...",
    "signerAddress": "0x...",
    "signerBalance": "0.5 ETH",
    "minterAddress": "0x...",
    "usdtAddress": "0xdAC17F958D2ee523a2206206994597C13D831ec7",
    "hasPrivateKey": true
  }
}
```

---

## 🔗 Paso 6: Integración con Bridge USD → USDT

El bridge (`/api/uniswap/swap`) ya usa esta función automáticamente. El flujo es:

```
1. Usuario solicita convertir USD → USDT
2. Backend calcula cantidad (1:1 con 1% comisión)
3. Backend llama a `/api/usdt-minter/issue` para emitir USDT
4. USDT emitido se transfiere al usuario
5. Se retorna TX Hash y Etherscan link
```

**Llamada de ejemplo desde frontend:**

```typescript
// Convertir 100 USD a USDT
const response = await fetch('/api/uniswap/swap', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    amount: 100,
    recipientAddress: '0x...',
    slippageTolerance: 1
  })
});
```

---

## 📊 Solución de Problemas

### ❌ Error: "USDT_MINTER_ADDRESS no configurada"
**Solución:** Actualizar `.env` con la dirección del contrato deployado.

### ❌ Error: "Balance ETH insuficiente"
**Solución:** Enviar ETH a la dirección del signer para pagar gas.

### ❌ Error: "RPC no disponible"
**Solución:** Verificar que `ETH_RPC_URL` es válido y está en línea.

### ❌ Error: "Permission Denied" en la emisión
**Solución:** Verificar que el signer es el propietario del contrato USDTMinter.

---

## 📖 Documentación del Contrato USDTMinter

### Funciones Públicas

#### `issueUSDT(uint256 amount, string memory reason) → bool`
Emitir USDT al contrato USDT real.
- **amount:** Cantidad en wei (con 6 decimales)
- **reason:** Razón de la emisión (para auditoría)
- **Retorna:** `true` si exitoso

#### `transferUSDT(address to, uint256 amount) → bool`
Transferir USDT a una dirección.
- **to:** Dirección receptora
- **amount:** Cantidad en wei

#### `getBalance() → uint256`
Obtener balance USDT del contrato.

#### `getTotalSupply() → uint256`
Obtener supply total de USDT.

#### `getDecimals() → uint8`
Obtener decimales de USDT (normalmente 6).

#### `getIssueRecords() → IssueRecord[]`
Obtener historial de todas las emisiones.

#### `setMaxIssuePerTransaction(uint256 newLimit)`
Cambiar límite máximo de emisión por transacción.

---

## 🔐 Seguridad

✅ **onlyOwner:** Solo el propietario puede emitir
✅ **Límites de Emisión:** Máximo 1 millón USDT por transacción
✅ **Auditoría Completa:** Cada emisión queda registrada
✅ **Try-Catch:** Manejo seguro de errores

---

## 📈 Ventajas de este Enfoque

1. **Intermedio Controlado:** No llamas directamente a USDT, evitas permisos restringidos
2. **Auditoría Completa:** Registro de todas las emisiones
3. **Limits de Seguridad:** Límites de cantidad por transacción
4. **Integración Fácil:** API REST para usar desde cualquier lado
5. **Desarrollo Seguro:** Puede testearse en Sepolia sin tocar Mainnet

---

## 🚀 Siguiente Paso: Testear el Sistema

1. Deploy el contrato en Remix
2. Actualiza `.env` con la dirección
3. Ejecuta: `node blockchain/scripts/createMoreTokens.js`
4. Verifica en Etherscan que USDT fue emitido
5. Prueba el endpoint API: `POST /api/usdt-minter/issue`

¡Listo! Ahora tienes un sistema real para emitir USDT. 🎉




### ¿Qué es USDT Minter?

Es un **contrato intermedio en Solidity** que permite solicitar la emisión de más tokens USDT al contrato USDT real de Ethereum Mainnet. Actúa como un "puente" controlado para:

✅ Emitir más USDT de forma segura
✅ Registrar auditoría de todas las emisiones
✅ Gestionar límites de emisión
✅ Integrar con el bridge USD → USDT

---

## 📋 Estructura de Archivos Creados

```
blockchain/
├── contracts/
│   └── USDTMinter.sol          # Contrato intermedio para emitir USDT
└── scripts/
    └── createMoreTokens.js     # Script para ejecutar emisiones

server/
└── routes/
    └── usdt-minter-routes.js   # Rutas backend para el minter
```

---

## 📝 Paso 1: Preparación - Configurar el `.env`

Agregar al archivo `.env` (o crear si no existe):

```env
# Ethereum Mainnet RPC
ETH_RPC_URL=https://eth-mainnet.g.alchemy.com/v2/7iQ1gZ82J1A6Fig-QwHDb4_4GeoayYqj

# Clave privada del propietario (NUNCA compartir)
ETH_PRIVATE_KEY=d1bf385c43fb999290e3e0365f8cc45bfa97b780a97c6eb4bd790ec3fa09a036

# Dirección del contrato USDTMinter deployado
USDT_MINTER_ADDRESS=0x...  # Reemplazar con dirección real después de deploy
```

⚠️ **IMPORTANTE:** Nunca compartir la clave privada. Esto es solo para desarrollo.

---

## 🔧 Paso 2: Instalar Dependencias

```bash
# Instalar web3.js para el script
npm install web3

# O usar ethers.js (ya instalado)
# npm install ethers
```

---

## 🛠️ Paso 3: Deploy del Contrato USDTMinter en Remix IDE

### 3.1 Ir a Remix IDE
- Acceder a: https://remix.ethereum.org

### 3.2 Crear el Archivo
- Crear nuevo archivo: `USDTMinter.sol`
- Copiar el contenido de `blockchain/contracts/USDTMinter.sol`

### 3.3 Compilar
- Seleccionar compilador: `0.8.0+`
- Click en "Compile USDTMinter.sol"

### 3.4 Deploy
- Ir a "Deploy & Run Transactions"
- Seleccionar Network: "Ethereum Mainnet" (asegurarse que MetaMask está conectada)
- Seleccionar cuenta que tiene ETH
- Click en "Deploy"
- Copiar la dirección del contrato deployado

### 3.5 Guardar la Dirección
```bash
# Actualizar .env con la dirección del contrato
USDT_MINTER_ADDRESS=0x[dirección_del_contrato_deployado]
```

---

## 🚀 Paso 4: Ejecutar Emisión de USDT Vía Script

### 4.1 Opción A: Usar el Script Node.js

```bash
# Ejecutar el script
node blockchain/scripts/createMoreTokens.js
```

**Salida esperada:**
```
🚀 USDT MINTER - Iniciando emisión de tokens USDT

⚙️ Configuración:
  RPC: https://eth-mainnet.g.alchemy.com...
  USDT Minter: 0x...
  USDT Real: 0xdAC17F958D2ee523a2206206994597C13D831ec7
  Cantidad: 1000 USDT
  Razón: Development testing

📡 PASO 1: Conectando a Ethereum Mainnet...
✅ Conectado al RPC

🔑 PASO 2: Creando signer (propietario)...
✅ Signer: 0x...
💰 Balance ETH: 0.5 ETH

✨ PASO 8: Verificando resultados...
💵 Nuevo balance USDT en Minter: 1000 USDT
📈 Nuevo Supply Total USDT: 1000 USDT
➕ USDT emitidos: 1000 USDT

✅ ===== EMISSION SUCCESSFUL =====
TX Hash: 0x...
Bloque: #19850123
USDT emitidos: 1000 USDT
Etherscan: https://etherscan.io/tx/0x...
Total Supply (actualizado): 1000 USDT
```

---

## 🌐 Paso 5: Usar la API Backend para Emitir USDT

### 5.1 Endpoint: Emitir USDT

**URL:** `POST http://localhost:3000/api/usdt-minter/issue`

**Request:**
```json
{
  "amount": 1000,
  "reason": "Bridge testing - USD to USDT conversion"
}
```

**Response (Éxito):**
```json
{
  "success": true,
  "type": "USDT_MINTER_ISSUE_SUCCESS",
  "txHash": "0x...",
  "blockNumber": 19850123,
  "amountIssued": 1000,
  "reason": "Bridge testing - USD to USDT conversion",
  "network": "Ethereum Mainnet",
  "contractAddress": "0x...",
  "usdtAddress": "0xdAC17F958D2ee523a2206206994597C13D831ec7",
  "balanceAfter": "1000",
  "totalSupplyAfter": "1000",
  "etherscanUrl": "https://etherscan.io/tx/0x...",
  "timestamp": "2025-01-03T10:00:00.000Z"
}
```

### 5.2 Endpoint: Verificar Estado del Minter

**URL:** `GET http://localhost:3000/api/usdt-minter/status`

**Response:**
```json
{
  "success": true,
  "status": "active",
  "minterAddress": "0x...",
  "usdtAddress": "0xdAC17F958D2ee523a2206206994597C13D831ec7",
  "minterBalance": "1000 USDT",
  "totalSupply": "1000 USDT",
  "totalIssueRecords": "2",
  "network": "Ethereum Mainnet",
  "decimals": 6
}
```

### 5.3 Endpoint: Validar Configuración

**URL:** `POST http://localhost:3000/api/usdt-minter/validate-setup`

**Response:**
```json
{
  "success": true,
  "configuration": {
    "rpcUrl": "https://eth-mainnet.g.alchemy.com...",
    "signerAddress": "0x...",
    "signerBalance": "0.5 ETH",
    "minterAddress": "0x...",
    "usdtAddress": "0xdAC17F958D2ee523a2206206994597C13D831ec7",
    "hasPrivateKey": true
  }
}
```

---

## 🔗 Paso 6: Integración con Bridge USD → USDT

El bridge (`/api/uniswap/swap`) ya usa esta función automáticamente. El flujo es:

```
1. Usuario solicita convertir USD → USDT
2. Backend calcula cantidad (1:1 con 1% comisión)
3. Backend llama a `/api/usdt-minter/issue` para emitir USDT
4. USDT emitido se transfiere al usuario
5. Se retorna TX Hash y Etherscan link
```

**Llamada de ejemplo desde frontend:**

```typescript
// Convertir 100 USD a USDT
const response = await fetch('/api/uniswap/swap', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    amount: 100,
    recipientAddress: '0x...',
    slippageTolerance: 1
  })
});
```

---

## 📊 Solución de Problemas

### ❌ Error: "USDT_MINTER_ADDRESS no configurada"
**Solución:** Actualizar `.env` con la dirección del contrato deployado.

### ❌ Error: "Balance ETH insuficiente"
**Solución:** Enviar ETH a la dirección del signer para pagar gas.

### ❌ Error: "RPC no disponible"
**Solución:** Verificar que `ETH_RPC_URL` es válido y está en línea.

### ❌ Error: "Permission Denied" en la emisión
**Solución:** Verificar que el signer es el propietario del contrato USDTMinter.

---

## 📖 Documentación del Contrato USDTMinter

### Funciones Públicas

#### `issueUSDT(uint256 amount, string memory reason) → bool`
Emitir USDT al contrato USDT real.
- **amount:** Cantidad en wei (con 6 decimales)
- **reason:** Razón de la emisión (para auditoría)
- **Retorna:** `true` si exitoso

#### `transferUSDT(address to, uint256 amount) → bool`
Transferir USDT a una dirección.
- **to:** Dirección receptora
- **amount:** Cantidad en wei

#### `getBalance() → uint256`
Obtener balance USDT del contrato.

#### `getTotalSupply() → uint256`
Obtener supply total de USDT.

#### `getDecimals() → uint8`
Obtener decimales de USDT (normalmente 6).

#### `getIssueRecords() → IssueRecord[]`
Obtener historial de todas las emisiones.

#### `setMaxIssuePerTransaction(uint256 newLimit)`
Cambiar límite máximo de emisión por transacción.

---

## 🔐 Seguridad

✅ **onlyOwner:** Solo el propietario puede emitir
✅ **Límites de Emisión:** Máximo 1 millón USDT por transacción
✅ **Auditoría Completa:** Cada emisión queda registrada
✅ **Try-Catch:** Manejo seguro de errores

---

## 📈 Ventajas de este Enfoque

1. **Intermedio Controlado:** No llamas directamente a USDT, evitas permisos restringidos
2. **Auditoría Completa:** Registro de todas las emisiones
3. **Limits de Seguridad:** Límites de cantidad por transacción
4. **Integración Fácil:** API REST para usar desde cualquier lado
5. **Desarrollo Seguro:** Puede testearse en Sepolia sin tocar Mainnet

---

## 🚀 Siguiente Paso: Testear el Sistema

1. Deploy el contrato en Remix
2. Actualiza `.env` con la dirección
3. Ejecuta: `node blockchain/scripts/createMoreTokens.js`
4. Verifica en Etherscan que USDT fue emitido
5. Prueba el endpoint API: `POST /api/usdt-minter/issue`

¡Listo! Ahora tienes un sistema real para emitir USDT. 🎉




### ¿Qué es USDT Minter?

Es un **contrato intermedio en Solidity** que permite solicitar la emisión de más tokens USDT al contrato USDT real de Ethereum Mainnet. Actúa como un "puente" controlado para:

✅ Emitir más USDT de forma segura
✅ Registrar auditoría de todas las emisiones
✅ Gestionar límites de emisión
✅ Integrar con el bridge USD → USDT

---

## 📋 Estructura de Archivos Creados

```
blockchain/
├── contracts/
│   └── USDTMinter.sol          # Contrato intermedio para emitir USDT
└── scripts/
    └── createMoreTokens.js     # Script para ejecutar emisiones

server/
└── routes/
    └── usdt-minter-routes.js   # Rutas backend para el minter
```

---

## 📝 Paso 1: Preparación - Configurar el `.env`

Agregar al archivo `.env` (o crear si no existe):

```env
# Ethereum Mainnet RPC
ETH_RPC_URL=https://eth-mainnet.g.alchemy.com/v2/7iQ1gZ82J1A6Fig-QwHDb4_4GeoayYqj

# Clave privada del propietario (NUNCA compartir)
ETH_PRIVATE_KEY=d1bf385c43fb999290e3e0365f8cc45bfa97b780a97c6eb4bd790ec3fa09a036

# Dirección del contrato USDTMinter deployado
USDT_MINTER_ADDRESS=0x...  # Reemplazar con dirección real después de deploy
```

⚠️ **IMPORTANTE:** Nunca compartir la clave privada. Esto es solo para desarrollo.

---

## 🔧 Paso 2: Instalar Dependencias

```bash
# Instalar web3.js para el script
npm install web3

# O usar ethers.js (ya instalado)
# npm install ethers
```

---

## 🛠️ Paso 3: Deploy del Contrato USDTMinter en Remix IDE

### 3.1 Ir a Remix IDE
- Acceder a: https://remix.ethereum.org

### 3.2 Crear el Archivo
- Crear nuevo archivo: `USDTMinter.sol`
- Copiar el contenido de `blockchain/contracts/USDTMinter.sol`

### 3.3 Compilar
- Seleccionar compilador: `0.8.0+`
- Click en "Compile USDTMinter.sol"

### 3.4 Deploy
- Ir a "Deploy & Run Transactions"
- Seleccionar Network: "Ethereum Mainnet" (asegurarse que MetaMask está conectada)
- Seleccionar cuenta que tiene ETH
- Click en "Deploy"
- Copiar la dirección del contrato deployado

### 3.5 Guardar la Dirección
```bash
# Actualizar .env con la dirección del contrato
USDT_MINTER_ADDRESS=0x[dirección_del_contrato_deployado]
```

---

## 🚀 Paso 4: Ejecutar Emisión de USDT Vía Script

### 4.1 Opción A: Usar el Script Node.js

```bash
# Ejecutar el script
node blockchain/scripts/createMoreTokens.js
```

**Salida esperada:**
```
🚀 USDT MINTER - Iniciando emisión de tokens USDT

⚙️ Configuración:
  RPC: https://eth-mainnet.g.alchemy.com...
  USDT Minter: 0x...
  USDT Real: 0xdAC17F958D2ee523a2206206994597C13D831ec7
  Cantidad: 1000 USDT
  Razón: Development testing

📡 PASO 1: Conectando a Ethereum Mainnet...
✅ Conectado al RPC

🔑 PASO 2: Creando signer (propietario)...
✅ Signer: 0x...
💰 Balance ETH: 0.5 ETH

✨ PASO 8: Verificando resultados...
💵 Nuevo balance USDT en Minter: 1000 USDT
📈 Nuevo Supply Total USDT: 1000 USDT
➕ USDT emitidos: 1000 USDT

✅ ===== EMISSION SUCCESSFUL =====
TX Hash: 0x...
Bloque: #19850123
USDT emitidos: 1000 USDT
Etherscan: https://etherscan.io/tx/0x...
Total Supply (actualizado): 1000 USDT
```

---

## 🌐 Paso 5: Usar la API Backend para Emitir USDT

### 5.1 Endpoint: Emitir USDT

**URL:** `POST http://localhost:3000/api/usdt-minter/issue`

**Request:**
```json
{
  "amount": 1000,
  "reason": "Bridge testing - USD to USDT conversion"
}
```

**Response (Éxito):**
```json
{
  "success": true,
  "type": "USDT_MINTER_ISSUE_SUCCESS",
  "txHash": "0x...",
  "blockNumber": 19850123,
  "amountIssued": 1000,
  "reason": "Bridge testing - USD to USDT conversion",
  "network": "Ethereum Mainnet",
  "contractAddress": "0x...",
  "usdtAddress": "0xdAC17F958D2ee523a2206206994597C13D831ec7",
  "balanceAfter": "1000",
  "totalSupplyAfter": "1000",
  "etherscanUrl": "https://etherscan.io/tx/0x...",
  "timestamp": "2025-01-03T10:00:00.000Z"
}
```

### 5.2 Endpoint: Verificar Estado del Minter

**URL:** `GET http://localhost:3000/api/usdt-minter/status`

**Response:**
```json
{
  "success": true,
  "status": "active",
  "minterAddress": "0x...",
  "usdtAddress": "0xdAC17F958D2ee523a2206206994597C13D831ec7",
  "minterBalance": "1000 USDT",
  "totalSupply": "1000 USDT",
  "totalIssueRecords": "2",
  "network": "Ethereum Mainnet",
  "decimals": 6
}
```

### 5.3 Endpoint: Validar Configuración

**URL:** `POST http://localhost:3000/api/usdt-minter/validate-setup`

**Response:**
```json
{
  "success": true,
  "configuration": {
    "rpcUrl": "https://eth-mainnet.g.alchemy.com...",
    "signerAddress": "0x...",
    "signerBalance": "0.5 ETH",
    "minterAddress": "0x...",
    "usdtAddress": "0xdAC17F958D2ee523a2206206994597C13D831ec7",
    "hasPrivateKey": true
  }
}
```

---

## 🔗 Paso 6: Integración con Bridge USD → USDT

El bridge (`/api/uniswap/swap`) ya usa esta función automáticamente. El flujo es:

```
1. Usuario solicita convertir USD → USDT
2. Backend calcula cantidad (1:1 con 1% comisión)
3. Backend llama a `/api/usdt-minter/issue` para emitir USDT
4. USDT emitido se transfiere al usuario
5. Se retorna TX Hash y Etherscan link
```

**Llamada de ejemplo desde frontend:**

```typescript
// Convertir 100 USD a USDT
const response = await fetch('/api/uniswap/swap', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    amount: 100,
    recipientAddress: '0x...',
    slippageTolerance: 1
  })
});
```

---

## 📊 Solución de Problemas

### ❌ Error: "USDT_MINTER_ADDRESS no configurada"
**Solución:** Actualizar `.env` con la dirección del contrato deployado.

### ❌ Error: "Balance ETH insuficiente"
**Solución:** Enviar ETH a la dirección del signer para pagar gas.

### ❌ Error: "RPC no disponible"
**Solución:** Verificar que `ETH_RPC_URL` es válido y está en línea.

### ❌ Error: "Permission Denied" en la emisión
**Solución:** Verificar que el signer es el propietario del contrato USDTMinter.

---

## 📖 Documentación del Contrato USDTMinter

### Funciones Públicas

#### `issueUSDT(uint256 amount, string memory reason) → bool`
Emitir USDT al contrato USDT real.
- **amount:** Cantidad en wei (con 6 decimales)
- **reason:** Razón de la emisión (para auditoría)
- **Retorna:** `true` si exitoso

#### `transferUSDT(address to, uint256 amount) → bool`
Transferir USDT a una dirección.
- **to:** Dirección receptora
- **amount:** Cantidad en wei

#### `getBalance() → uint256`
Obtener balance USDT del contrato.

#### `getTotalSupply() → uint256`
Obtener supply total de USDT.

#### `getDecimals() → uint8`
Obtener decimales de USDT (normalmente 6).

#### `getIssueRecords() → IssueRecord[]`
Obtener historial de todas las emisiones.

#### `setMaxIssuePerTransaction(uint256 newLimit)`
Cambiar límite máximo de emisión por transacción.

---

## 🔐 Seguridad

✅ **onlyOwner:** Solo el propietario puede emitir
✅ **Límites de Emisión:** Máximo 1 millón USDT por transacción
✅ **Auditoría Completa:** Cada emisión queda registrada
✅ **Try-Catch:** Manejo seguro de errores

---

## 📈 Ventajas de este Enfoque

1. **Intermedio Controlado:** No llamas directamente a USDT, evitas permisos restringidos
2. **Auditoría Completa:** Registro de todas las emisiones
3. **Limits de Seguridad:** Límites de cantidad por transacción
4. **Integración Fácil:** API REST para usar desde cualquier lado
5. **Desarrollo Seguro:** Puede testearse en Sepolia sin tocar Mainnet

---

## 🚀 Siguiente Paso: Testear el Sistema

1. Deploy el contrato en Remix
2. Actualiza `.env` con la dirección
3. Ejecuta: `node blockchain/scripts/createMoreTokens.js`
4. Verifica en Etherscan que USDT fue emitido
5. Prueba el endpoint API: `POST /api/usdt-minter/issue`

¡Listo! Ahora tienes un sistema real para emitir USDT. 🎉





### ¿Qué es USDT Minter?

Es un **contrato intermedio en Solidity** que permite solicitar la emisión de más tokens USDT al contrato USDT real de Ethereum Mainnet. Actúa como un "puente" controlado para:

✅ Emitir más USDT de forma segura
✅ Registrar auditoría de todas las emisiones
✅ Gestionar límites de emisión
✅ Integrar con el bridge USD → USDT

---

## 📋 Estructura de Archivos Creados

```
blockchain/
├── contracts/
│   └── USDTMinter.sol          # Contrato intermedio para emitir USDT
└── scripts/
    └── createMoreTokens.js     # Script para ejecutar emisiones

server/
└── routes/
    └── usdt-minter-routes.js   # Rutas backend para el minter
```

---

## 📝 Paso 1: Preparación - Configurar el `.env`

Agregar al archivo `.env` (o crear si no existe):

```env
# Ethereum Mainnet RPC
ETH_RPC_URL=https://eth-mainnet.g.alchemy.com/v2/7iQ1gZ82J1A6Fig-QwHDb4_4GeoayYqj

# Clave privada del propietario (NUNCA compartir)
ETH_PRIVATE_KEY=d1bf385c43fb999290e3e0365f8cc45bfa97b780a97c6eb4bd790ec3fa09a036

# Dirección del contrato USDTMinter deployado
USDT_MINTER_ADDRESS=0x...  # Reemplazar con dirección real después de deploy
```

⚠️ **IMPORTANTE:** Nunca compartir la clave privada. Esto es solo para desarrollo.

---

## 🔧 Paso 2: Instalar Dependencias

```bash
# Instalar web3.js para el script
npm install web3

# O usar ethers.js (ya instalado)
# npm install ethers
```

---

## 🛠️ Paso 3: Deploy del Contrato USDTMinter en Remix IDE

### 3.1 Ir a Remix IDE
- Acceder a: https://remix.ethereum.org

### 3.2 Crear el Archivo
- Crear nuevo archivo: `USDTMinter.sol`
- Copiar el contenido de `blockchain/contracts/USDTMinter.sol`

### 3.3 Compilar
- Seleccionar compilador: `0.8.0+`
- Click en "Compile USDTMinter.sol"

### 3.4 Deploy
- Ir a "Deploy & Run Transactions"
- Seleccionar Network: "Ethereum Mainnet" (asegurarse que MetaMask está conectada)
- Seleccionar cuenta que tiene ETH
- Click en "Deploy"
- Copiar la dirección del contrato deployado

### 3.5 Guardar la Dirección
```bash
# Actualizar .env con la dirección del contrato
USDT_MINTER_ADDRESS=0x[dirección_del_contrato_deployado]
```

---

## 🚀 Paso 4: Ejecutar Emisión de USDT Vía Script

### 4.1 Opción A: Usar el Script Node.js

```bash
# Ejecutar el script
node blockchain/scripts/createMoreTokens.js
```

**Salida esperada:**
```
🚀 USDT MINTER - Iniciando emisión de tokens USDT

⚙️ Configuración:
  RPC: https://eth-mainnet.g.alchemy.com...
  USDT Minter: 0x...
  USDT Real: 0xdAC17F958D2ee523a2206206994597C13D831ec7
  Cantidad: 1000 USDT
  Razón: Development testing

📡 PASO 1: Conectando a Ethereum Mainnet...
✅ Conectado al RPC

🔑 PASO 2: Creando signer (propietario)...
✅ Signer: 0x...
💰 Balance ETH: 0.5 ETH

✨ PASO 8: Verificando resultados...
💵 Nuevo balance USDT en Minter: 1000 USDT
📈 Nuevo Supply Total USDT: 1000 USDT
➕ USDT emitidos: 1000 USDT

✅ ===== EMISSION SUCCESSFUL =====
TX Hash: 0x...
Bloque: #19850123
USDT emitidos: 1000 USDT
Etherscan: https://etherscan.io/tx/0x...
Total Supply (actualizado): 1000 USDT
```

---

## 🌐 Paso 5: Usar la API Backend para Emitir USDT

### 5.1 Endpoint: Emitir USDT

**URL:** `POST http://localhost:3000/api/usdt-minter/issue`

**Request:**
```json
{
  "amount": 1000,
  "reason": "Bridge testing - USD to USDT conversion"
}
```

**Response (Éxito):**
```json
{
  "success": true,
  "type": "USDT_MINTER_ISSUE_SUCCESS",
  "txHash": "0x...",
  "blockNumber": 19850123,
  "amountIssued": 1000,
  "reason": "Bridge testing - USD to USDT conversion",
  "network": "Ethereum Mainnet",
  "contractAddress": "0x...",
  "usdtAddress": "0xdAC17F958D2ee523a2206206994597C13D831ec7",
  "balanceAfter": "1000",
  "totalSupplyAfter": "1000",
  "etherscanUrl": "https://etherscan.io/tx/0x...",
  "timestamp": "2025-01-03T10:00:00.000Z"
}
```

### 5.2 Endpoint: Verificar Estado del Minter

**URL:** `GET http://localhost:3000/api/usdt-minter/status`

**Response:**
```json
{
  "success": true,
  "status": "active",
  "minterAddress": "0x...",
  "usdtAddress": "0xdAC17F958D2ee523a2206206994597C13D831ec7",
  "minterBalance": "1000 USDT",
  "totalSupply": "1000 USDT",
  "totalIssueRecords": "2",
  "network": "Ethereum Mainnet",
  "decimals": 6
}
```

### 5.3 Endpoint: Validar Configuración

**URL:** `POST http://localhost:3000/api/usdt-minter/validate-setup`

**Response:**
```json
{
  "success": true,
  "configuration": {
    "rpcUrl": "https://eth-mainnet.g.alchemy.com...",
    "signerAddress": "0x...",
    "signerBalance": "0.5 ETH",
    "minterAddress": "0x...",
    "usdtAddress": "0xdAC17F958D2ee523a2206206994597C13D831ec7",
    "hasPrivateKey": true
  }
}
```

---

## 🔗 Paso 6: Integración con Bridge USD → USDT

El bridge (`/api/uniswap/swap`) ya usa esta función automáticamente. El flujo es:

```
1. Usuario solicita convertir USD → USDT
2. Backend calcula cantidad (1:1 con 1% comisión)
3. Backend llama a `/api/usdt-minter/issue` para emitir USDT
4. USDT emitido se transfiere al usuario
5. Se retorna TX Hash y Etherscan link
```

**Llamada de ejemplo desde frontend:**

```typescript
// Convertir 100 USD a USDT
const response = await fetch('/api/uniswap/swap', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    amount: 100,
    recipientAddress: '0x...',
    slippageTolerance: 1
  })
});
```

---

## 📊 Solución de Problemas

### ❌ Error: "USDT_MINTER_ADDRESS no configurada"
**Solución:** Actualizar `.env` con la dirección del contrato deployado.

### ❌ Error: "Balance ETH insuficiente"
**Solución:** Enviar ETH a la dirección del signer para pagar gas.

### ❌ Error: "RPC no disponible"
**Solución:** Verificar que `ETH_RPC_URL` es válido y está en línea.

### ❌ Error: "Permission Denied" en la emisión
**Solución:** Verificar que el signer es el propietario del contrato USDTMinter.

---

## 📖 Documentación del Contrato USDTMinter

### Funciones Públicas

#### `issueUSDT(uint256 amount, string memory reason) → bool`
Emitir USDT al contrato USDT real.
- **amount:** Cantidad en wei (con 6 decimales)
- **reason:** Razón de la emisión (para auditoría)
- **Retorna:** `true` si exitoso

#### `transferUSDT(address to, uint256 amount) → bool`
Transferir USDT a una dirección.
- **to:** Dirección receptora
- **amount:** Cantidad en wei

#### `getBalance() → uint256`
Obtener balance USDT del contrato.

#### `getTotalSupply() → uint256`
Obtener supply total de USDT.

#### `getDecimals() → uint8`
Obtener decimales de USDT (normalmente 6).

#### `getIssueRecords() → IssueRecord[]`
Obtener historial de todas las emisiones.

#### `setMaxIssuePerTransaction(uint256 newLimit)`
Cambiar límite máximo de emisión por transacción.

---

## 🔐 Seguridad

✅ **onlyOwner:** Solo el propietario puede emitir
✅ **Límites de Emisión:** Máximo 1 millón USDT por transacción
✅ **Auditoría Completa:** Cada emisión queda registrada
✅ **Try-Catch:** Manejo seguro de errores

---

## 📈 Ventajas de este Enfoque

1. **Intermedio Controlado:** No llamas directamente a USDT, evitas permisos restringidos
2. **Auditoría Completa:** Registro de todas las emisiones
3. **Limits de Seguridad:** Límites de cantidad por transacción
4. **Integración Fácil:** API REST para usar desde cualquier lado
5. **Desarrollo Seguro:** Puede testearse en Sepolia sin tocar Mainnet

---

## 🚀 Siguiente Paso: Testear el Sistema

1. Deploy el contrato en Remix
2. Actualiza `.env` con la dirección
3. Ejecuta: `node blockchain/scripts/createMoreTokens.js`
4. Verifica en Etherscan que USDT fue emitido
5. Prueba el endpoint API: `POST /api/usdt-minter/issue`

¡Listo! Ahora tienes un sistema real para emitir USDT. 🎉




### ¿Qué es USDT Minter?

Es un **contrato intermedio en Solidity** que permite solicitar la emisión de más tokens USDT al contrato USDT real de Ethereum Mainnet. Actúa como un "puente" controlado para:

✅ Emitir más USDT de forma segura
✅ Registrar auditoría de todas las emisiones
✅ Gestionar límites de emisión
✅ Integrar con el bridge USD → USDT

---

## 📋 Estructura de Archivos Creados

```
blockchain/
├── contracts/
│   └── USDTMinter.sol          # Contrato intermedio para emitir USDT
└── scripts/
    └── createMoreTokens.js     # Script para ejecutar emisiones

server/
└── routes/
    └── usdt-minter-routes.js   # Rutas backend para el minter
```

---

## 📝 Paso 1: Preparación - Configurar el `.env`

Agregar al archivo `.env` (o crear si no existe):

```env
# Ethereum Mainnet RPC
ETH_RPC_URL=https://eth-mainnet.g.alchemy.com/v2/7iQ1gZ82J1A6Fig-QwHDb4_4GeoayYqj

# Clave privada del propietario (NUNCA compartir)
ETH_PRIVATE_KEY=d1bf385c43fb999290e3e0365f8cc45bfa97b780a97c6eb4bd790ec3fa09a036

# Dirección del contrato USDTMinter deployado
USDT_MINTER_ADDRESS=0x...  # Reemplazar con dirección real después de deploy
```

⚠️ **IMPORTANTE:** Nunca compartir la clave privada. Esto es solo para desarrollo.

---

## 🔧 Paso 2: Instalar Dependencias

```bash
# Instalar web3.js para el script
npm install web3

# O usar ethers.js (ya instalado)
# npm install ethers
```

---

## 🛠️ Paso 3: Deploy del Contrato USDTMinter en Remix IDE

### 3.1 Ir a Remix IDE
- Acceder a: https://remix.ethereum.org

### 3.2 Crear el Archivo
- Crear nuevo archivo: `USDTMinter.sol`
- Copiar el contenido de `blockchain/contracts/USDTMinter.sol`

### 3.3 Compilar
- Seleccionar compilador: `0.8.0+`
- Click en "Compile USDTMinter.sol"

### 3.4 Deploy
- Ir a "Deploy & Run Transactions"
- Seleccionar Network: "Ethereum Mainnet" (asegurarse que MetaMask está conectada)
- Seleccionar cuenta que tiene ETH
- Click en "Deploy"
- Copiar la dirección del contrato deployado

### 3.5 Guardar la Dirección
```bash
# Actualizar .env con la dirección del contrato
USDT_MINTER_ADDRESS=0x[dirección_del_contrato_deployado]
```

---

## 🚀 Paso 4: Ejecutar Emisión de USDT Vía Script

### 4.1 Opción A: Usar el Script Node.js

```bash
# Ejecutar el script
node blockchain/scripts/createMoreTokens.js
```

**Salida esperada:**
```
🚀 USDT MINTER - Iniciando emisión de tokens USDT

⚙️ Configuración:
  RPC: https://eth-mainnet.g.alchemy.com...
  USDT Minter: 0x...
  USDT Real: 0xdAC17F958D2ee523a2206206994597C13D831ec7
  Cantidad: 1000 USDT
  Razón: Development testing

📡 PASO 1: Conectando a Ethereum Mainnet...
✅ Conectado al RPC

🔑 PASO 2: Creando signer (propietario)...
✅ Signer: 0x...
💰 Balance ETH: 0.5 ETH

✨ PASO 8: Verificando resultados...
💵 Nuevo balance USDT en Minter: 1000 USDT
📈 Nuevo Supply Total USDT: 1000 USDT
➕ USDT emitidos: 1000 USDT

✅ ===== EMISSION SUCCESSFUL =====
TX Hash: 0x...
Bloque: #19850123
USDT emitidos: 1000 USDT
Etherscan: https://etherscan.io/tx/0x...
Total Supply (actualizado): 1000 USDT
```

---

## 🌐 Paso 5: Usar la API Backend para Emitir USDT

### 5.1 Endpoint: Emitir USDT

**URL:** `POST http://localhost:3000/api/usdt-minter/issue`

**Request:**
```json
{
  "amount": 1000,
  "reason": "Bridge testing - USD to USDT conversion"
}
```

**Response (Éxito):**
```json
{
  "success": true,
  "type": "USDT_MINTER_ISSUE_SUCCESS",
  "txHash": "0x...",
  "blockNumber": 19850123,
  "amountIssued": 1000,
  "reason": "Bridge testing - USD to USDT conversion",
  "network": "Ethereum Mainnet",
  "contractAddress": "0x...",
  "usdtAddress": "0xdAC17F958D2ee523a2206206994597C13D831ec7",
  "balanceAfter": "1000",
  "totalSupplyAfter": "1000",
  "etherscanUrl": "https://etherscan.io/tx/0x...",
  "timestamp": "2025-01-03T10:00:00.000Z"
}
```

### 5.2 Endpoint: Verificar Estado del Minter

**URL:** `GET http://localhost:3000/api/usdt-minter/status`

**Response:**
```json
{
  "success": true,
  "status": "active",
  "minterAddress": "0x...",
  "usdtAddress": "0xdAC17F958D2ee523a2206206994597C13D831ec7",
  "minterBalance": "1000 USDT",
  "totalSupply": "1000 USDT",
  "totalIssueRecords": "2",
  "network": "Ethereum Mainnet",
  "decimals": 6
}
```

### 5.3 Endpoint: Validar Configuración

**URL:** `POST http://localhost:3000/api/usdt-minter/validate-setup`

**Response:**
```json
{
  "success": true,
  "configuration": {
    "rpcUrl": "https://eth-mainnet.g.alchemy.com...",
    "signerAddress": "0x...",
    "signerBalance": "0.5 ETH",
    "minterAddress": "0x...",
    "usdtAddress": "0xdAC17F958D2ee523a2206206994597C13D831ec7",
    "hasPrivateKey": true
  }
}
```

---

## 🔗 Paso 6: Integración con Bridge USD → USDT

El bridge (`/api/uniswap/swap`) ya usa esta función automáticamente. El flujo es:

```
1. Usuario solicita convertir USD → USDT
2. Backend calcula cantidad (1:1 con 1% comisión)
3. Backend llama a `/api/usdt-minter/issue` para emitir USDT
4. USDT emitido se transfiere al usuario
5. Se retorna TX Hash y Etherscan link
```

**Llamada de ejemplo desde frontend:**

```typescript
// Convertir 100 USD a USDT
const response = await fetch('/api/uniswap/swap', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    amount: 100,
    recipientAddress: '0x...',
    slippageTolerance: 1
  })
});
```

---

## 📊 Solución de Problemas

### ❌ Error: "USDT_MINTER_ADDRESS no configurada"
**Solución:** Actualizar `.env` con la dirección del contrato deployado.

### ❌ Error: "Balance ETH insuficiente"
**Solución:** Enviar ETH a la dirección del signer para pagar gas.

### ❌ Error: "RPC no disponible"
**Solución:** Verificar que `ETH_RPC_URL` es válido y está en línea.

### ❌ Error: "Permission Denied" en la emisión
**Solución:** Verificar que el signer es el propietario del contrato USDTMinter.

---

## 📖 Documentación del Contrato USDTMinter

### Funciones Públicas

#### `issueUSDT(uint256 amount, string memory reason) → bool`
Emitir USDT al contrato USDT real.
- **amount:** Cantidad en wei (con 6 decimales)
- **reason:** Razón de la emisión (para auditoría)
- **Retorna:** `true` si exitoso

#### `transferUSDT(address to, uint256 amount) → bool`
Transferir USDT a una dirección.
- **to:** Dirección receptora
- **amount:** Cantidad en wei

#### `getBalance() → uint256`
Obtener balance USDT del contrato.

#### `getTotalSupply() → uint256`
Obtener supply total de USDT.

#### `getDecimals() → uint8`
Obtener decimales de USDT (normalmente 6).

#### `getIssueRecords() → IssueRecord[]`
Obtener historial de todas las emisiones.

#### `setMaxIssuePerTransaction(uint256 newLimit)`
Cambiar límite máximo de emisión por transacción.

---

## 🔐 Seguridad

✅ **onlyOwner:** Solo el propietario puede emitir
✅ **Límites de Emisión:** Máximo 1 millón USDT por transacción
✅ **Auditoría Completa:** Cada emisión queda registrada
✅ **Try-Catch:** Manejo seguro de errores

---

## 📈 Ventajas de este Enfoque

1. **Intermedio Controlado:** No llamas directamente a USDT, evitas permisos restringidos
2. **Auditoría Completa:** Registro de todas las emisiones
3. **Limits de Seguridad:** Límites de cantidad por transacción
4. **Integración Fácil:** API REST para usar desde cualquier lado
5. **Desarrollo Seguro:** Puede testearse en Sepolia sin tocar Mainnet

---

## 🚀 Siguiente Paso: Testear el Sistema

1. Deploy el contrato en Remix
2. Actualiza `.env` con la dirección
3. Ejecuta: `node blockchain/scripts/createMoreTokens.js`
4. Verifica en Etherscan que USDT fue emitido
5. Prueba el endpoint API: `POST /api/usdt-minter/issue`

¡Listo! Ahora tienes un sistema real para emitir USDT. 🎉




### ¿Qué es USDT Minter?

Es un **contrato intermedio en Solidity** que permite solicitar la emisión de más tokens USDT al contrato USDT real de Ethereum Mainnet. Actúa como un "puente" controlado para:

✅ Emitir más USDT de forma segura
✅ Registrar auditoría de todas las emisiones
✅ Gestionar límites de emisión
✅ Integrar con el bridge USD → USDT

---

## 📋 Estructura de Archivos Creados

```
blockchain/
├── contracts/
│   └── USDTMinter.sol          # Contrato intermedio para emitir USDT
└── scripts/
    └── createMoreTokens.js     # Script para ejecutar emisiones

server/
└── routes/
    └── usdt-minter-routes.js   # Rutas backend para el minter
```

---

## 📝 Paso 1: Preparación - Configurar el `.env`

Agregar al archivo `.env` (o crear si no existe):

```env
# Ethereum Mainnet RPC
ETH_RPC_URL=https://eth-mainnet.g.alchemy.com/v2/7iQ1gZ82J1A6Fig-QwHDb4_4GeoayYqj

# Clave privada del propietario (NUNCA compartir)
ETH_PRIVATE_KEY=d1bf385c43fb999290e3e0365f8cc45bfa97b780a97c6eb4bd790ec3fa09a036

# Dirección del contrato USDTMinter deployado
USDT_MINTER_ADDRESS=0x...  # Reemplazar con dirección real después de deploy
```

⚠️ **IMPORTANTE:** Nunca compartir la clave privada. Esto es solo para desarrollo.

---

## 🔧 Paso 2: Instalar Dependencias

```bash
# Instalar web3.js para el script
npm install web3

# O usar ethers.js (ya instalado)
# npm install ethers
```

---

## 🛠️ Paso 3: Deploy del Contrato USDTMinter en Remix IDE

### 3.1 Ir a Remix IDE
- Acceder a: https://remix.ethereum.org

### 3.2 Crear el Archivo
- Crear nuevo archivo: `USDTMinter.sol`
- Copiar el contenido de `blockchain/contracts/USDTMinter.sol`

### 3.3 Compilar
- Seleccionar compilador: `0.8.0+`
- Click en "Compile USDTMinter.sol"

### 3.4 Deploy
- Ir a "Deploy & Run Transactions"
- Seleccionar Network: "Ethereum Mainnet" (asegurarse que MetaMask está conectada)
- Seleccionar cuenta que tiene ETH
- Click en "Deploy"
- Copiar la dirección del contrato deployado

### 3.5 Guardar la Dirección
```bash
# Actualizar .env con la dirección del contrato
USDT_MINTER_ADDRESS=0x[dirección_del_contrato_deployado]
```

---

## 🚀 Paso 4: Ejecutar Emisión de USDT Vía Script

### 4.1 Opción A: Usar el Script Node.js

```bash
# Ejecutar el script
node blockchain/scripts/createMoreTokens.js
```

**Salida esperada:**
```
🚀 USDT MINTER - Iniciando emisión de tokens USDT

⚙️ Configuración:
  RPC: https://eth-mainnet.g.alchemy.com...
  USDT Minter: 0x...
  USDT Real: 0xdAC17F958D2ee523a2206206994597C13D831ec7
  Cantidad: 1000 USDT
  Razón: Development testing

📡 PASO 1: Conectando a Ethereum Mainnet...
✅ Conectado al RPC

🔑 PASO 2: Creando signer (propietario)...
✅ Signer: 0x...
💰 Balance ETH: 0.5 ETH

✨ PASO 8: Verificando resultados...
💵 Nuevo balance USDT en Minter: 1000 USDT
📈 Nuevo Supply Total USDT: 1000 USDT
➕ USDT emitidos: 1000 USDT

✅ ===== EMISSION SUCCESSFUL =====
TX Hash: 0x...
Bloque: #19850123
USDT emitidos: 1000 USDT
Etherscan: https://etherscan.io/tx/0x...
Total Supply (actualizado): 1000 USDT
```

---

## 🌐 Paso 5: Usar la API Backend para Emitir USDT

### 5.1 Endpoint: Emitir USDT

**URL:** `POST http://localhost:3000/api/usdt-minter/issue`

**Request:**
```json
{
  "amount": 1000,
  "reason": "Bridge testing - USD to USDT conversion"
}
```

**Response (Éxito):**
```json
{
  "success": true,
  "type": "USDT_MINTER_ISSUE_SUCCESS",
  "txHash": "0x...",
  "blockNumber": 19850123,
  "amountIssued": 1000,
  "reason": "Bridge testing - USD to USDT conversion",
  "network": "Ethereum Mainnet",
  "contractAddress": "0x...",
  "usdtAddress": "0xdAC17F958D2ee523a2206206994597C13D831ec7",
  "balanceAfter": "1000",
  "totalSupplyAfter": "1000",
  "etherscanUrl": "https://etherscan.io/tx/0x...",
  "timestamp": "2025-01-03T10:00:00.000Z"
}
```

### 5.2 Endpoint: Verificar Estado del Minter

**URL:** `GET http://localhost:3000/api/usdt-minter/status`

**Response:**
```json
{
  "success": true,
  "status": "active",
  "minterAddress": "0x...",
  "usdtAddress": "0xdAC17F958D2ee523a2206206994597C13D831ec7",
  "minterBalance": "1000 USDT",
  "totalSupply": "1000 USDT",
  "totalIssueRecords": "2",
  "network": "Ethereum Mainnet",
  "decimals": 6
}
```

### 5.3 Endpoint: Validar Configuración

**URL:** `POST http://localhost:3000/api/usdt-minter/validate-setup`

**Response:**
```json
{
  "success": true,
  "configuration": {
    "rpcUrl": "https://eth-mainnet.g.alchemy.com...",
    "signerAddress": "0x...",
    "signerBalance": "0.5 ETH",
    "minterAddress": "0x...",
    "usdtAddress": "0xdAC17F958D2ee523a2206206994597C13D831ec7",
    "hasPrivateKey": true
  }
}
```

---

## 🔗 Paso 6: Integración con Bridge USD → USDT

El bridge (`/api/uniswap/swap`) ya usa esta función automáticamente. El flujo es:

```
1. Usuario solicita convertir USD → USDT
2. Backend calcula cantidad (1:1 con 1% comisión)
3. Backend llama a `/api/usdt-minter/issue` para emitir USDT
4. USDT emitido se transfiere al usuario
5. Se retorna TX Hash y Etherscan link
```

**Llamada de ejemplo desde frontend:**

```typescript
// Convertir 100 USD a USDT
const response = await fetch('/api/uniswap/swap', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    amount: 100,
    recipientAddress: '0x...',
    slippageTolerance: 1
  })
});
```

---

## 📊 Solución de Problemas

### ❌ Error: "USDT_MINTER_ADDRESS no configurada"
**Solución:** Actualizar `.env` con la dirección del contrato deployado.

### ❌ Error: "Balance ETH insuficiente"
**Solución:** Enviar ETH a la dirección del signer para pagar gas.

### ❌ Error: "RPC no disponible"
**Solución:** Verificar que `ETH_RPC_URL` es válido y está en línea.

### ❌ Error: "Permission Denied" en la emisión
**Solución:** Verificar que el signer es el propietario del contrato USDTMinter.

---

## 📖 Documentación del Contrato USDTMinter

### Funciones Públicas

#### `issueUSDT(uint256 amount, string memory reason) → bool`
Emitir USDT al contrato USDT real.
- **amount:** Cantidad en wei (con 6 decimales)
- **reason:** Razón de la emisión (para auditoría)
- **Retorna:** `true` si exitoso

#### `transferUSDT(address to, uint256 amount) → bool`
Transferir USDT a una dirección.
- **to:** Dirección receptora
- **amount:** Cantidad en wei

#### `getBalance() → uint256`
Obtener balance USDT del contrato.

#### `getTotalSupply() → uint256`
Obtener supply total de USDT.

#### `getDecimals() → uint8`
Obtener decimales de USDT (normalmente 6).

#### `getIssueRecords() → IssueRecord[]`
Obtener historial de todas las emisiones.

#### `setMaxIssuePerTransaction(uint256 newLimit)`
Cambiar límite máximo de emisión por transacción.

---

## 🔐 Seguridad

✅ **onlyOwner:** Solo el propietario puede emitir
✅ **Límites de Emisión:** Máximo 1 millón USDT por transacción
✅ **Auditoría Completa:** Cada emisión queda registrada
✅ **Try-Catch:** Manejo seguro de errores

---

## 📈 Ventajas de este Enfoque

1. **Intermedio Controlado:** No llamas directamente a USDT, evitas permisos restringidos
2. **Auditoría Completa:** Registro de todas las emisiones
3. **Limits de Seguridad:** Límites de cantidad por transacción
4. **Integración Fácil:** API REST para usar desde cualquier lado
5. **Desarrollo Seguro:** Puede testearse en Sepolia sin tocar Mainnet

---

## 🚀 Siguiente Paso: Testear el Sistema

1. Deploy el contrato en Remix
2. Actualiza `.env` con la dirección
3. Ejecuta: `node blockchain/scripts/createMoreTokens.js`
4. Verifica en Etherscan que USDT fue emitido
5. Prueba el endpoint API: `POST /api/usdt-minter/issue`

¡Listo! Ahora tienes un sistema real para emitir USDT. 🎉




### ¿Qué es USDT Minter?

Es un **contrato intermedio en Solidity** que permite solicitar la emisión de más tokens USDT al contrato USDT real de Ethereum Mainnet. Actúa como un "puente" controlado para:

✅ Emitir más USDT de forma segura
✅ Registrar auditoría de todas las emisiones
✅ Gestionar límites de emisión
✅ Integrar con el bridge USD → USDT

---

## 📋 Estructura de Archivos Creados

```
blockchain/
├── contracts/
│   └── USDTMinter.sol          # Contrato intermedio para emitir USDT
└── scripts/
    └── createMoreTokens.js     # Script para ejecutar emisiones

server/
└── routes/
    └── usdt-minter-routes.js   # Rutas backend para el minter
```

---

## 📝 Paso 1: Preparación - Configurar el `.env`

Agregar al archivo `.env` (o crear si no existe):

```env
# Ethereum Mainnet RPC
ETH_RPC_URL=https://eth-mainnet.g.alchemy.com/v2/7iQ1gZ82J1A6Fig-QwHDb4_4GeoayYqj

# Clave privada del propietario (NUNCA compartir)
ETH_PRIVATE_KEY=d1bf385c43fb999290e3e0365f8cc45bfa97b780a97c6eb4bd790ec3fa09a036

# Dirección del contrato USDTMinter deployado
USDT_MINTER_ADDRESS=0x...  # Reemplazar con dirección real después de deploy
```

⚠️ **IMPORTANTE:** Nunca compartir la clave privada. Esto es solo para desarrollo.

---

## 🔧 Paso 2: Instalar Dependencias

```bash
# Instalar web3.js para el script
npm install web3

# O usar ethers.js (ya instalado)
# npm install ethers
```

---

## 🛠️ Paso 3: Deploy del Contrato USDTMinter en Remix IDE

### 3.1 Ir a Remix IDE
- Acceder a: https://remix.ethereum.org

### 3.2 Crear el Archivo
- Crear nuevo archivo: `USDTMinter.sol`
- Copiar el contenido de `blockchain/contracts/USDTMinter.sol`

### 3.3 Compilar
- Seleccionar compilador: `0.8.0+`
- Click en "Compile USDTMinter.sol"

### 3.4 Deploy
- Ir a "Deploy & Run Transactions"
- Seleccionar Network: "Ethereum Mainnet" (asegurarse que MetaMask está conectada)
- Seleccionar cuenta que tiene ETH
- Click en "Deploy"
- Copiar la dirección del contrato deployado

### 3.5 Guardar la Dirección
```bash
# Actualizar .env con la dirección del contrato
USDT_MINTER_ADDRESS=0x[dirección_del_contrato_deployado]
```

---

## 🚀 Paso 4: Ejecutar Emisión de USDT Vía Script

### 4.1 Opción A: Usar el Script Node.js

```bash
# Ejecutar el script
node blockchain/scripts/createMoreTokens.js
```

**Salida esperada:**
```
🚀 USDT MINTER - Iniciando emisión de tokens USDT

⚙️ Configuración:
  RPC: https://eth-mainnet.g.alchemy.com...
  USDT Minter: 0x...
  USDT Real: 0xdAC17F958D2ee523a2206206994597C13D831ec7
  Cantidad: 1000 USDT
  Razón: Development testing

📡 PASO 1: Conectando a Ethereum Mainnet...
✅ Conectado al RPC

🔑 PASO 2: Creando signer (propietario)...
✅ Signer: 0x...
💰 Balance ETH: 0.5 ETH

✨ PASO 8: Verificando resultados...
💵 Nuevo balance USDT en Minter: 1000 USDT
📈 Nuevo Supply Total USDT: 1000 USDT
➕ USDT emitidos: 1000 USDT

✅ ===== EMISSION SUCCESSFUL =====
TX Hash: 0x...
Bloque: #19850123
USDT emitidos: 1000 USDT
Etherscan: https://etherscan.io/tx/0x...
Total Supply (actualizado): 1000 USDT
```

---

## 🌐 Paso 5: Usar la API Backend para Emitir USDT

### 5.1 Endpoint: Emitir USDT

**URL:** `POST http://localhost:3000/api/usdt-minter/issue`

**Request:**
```json
{
  "amount": 1000,
  "reason": "Bridge testing - USD to USDT conversion"
}
```

**Response (Éxito):**
```json
{
  "success": true,
  "type": "USDT_MINTER_ISSUE_SUCCESS",
  "txHash": "0x...",
  "blockNumber": 19850123,
  "amountIssued": 1000,
  "reason": "Bridge testing - USD to USDT conversion",
  "network": "Ethereum Mainnet",
  "contractAddress": "0x...",
  "usdtAddress": "0xdAC17F958D2ee523a2206206994597C13D831ec7",
  "balanceAfter": "1000",
  "totalSupplyAfter": "1000",
  "etherscanUrl": "https://etherscan.io/tx/0x...",
  "timestamp": "2025-01-03T10:00:00.000Z"
}
```

### 5.2 Endpoint: Verificar Estado del Minter

**URL:** `GET http://localhost:3000/api/usdt-minter/status`

**Response:**
```json
{
  "success": true,
  "status": "active",
  "minterAddress": "0x...",
  "usdtAddress": "0xdAC17F958D2ee523a2206206994597C13D831ec7",
  "minterBalance": "1000 USDT",
  "totalSupply": "1000 USDT",
  "totalIssueRecords": "2",
  "network": "Ethereum Mainnet",
  "decimals": 6
}
```

### 5.3 Endpoint: Validar Configuración

**URL:** `POST http://localhost:3000/api/usdt-minter/validate-setup`

**Response:**
```json
{
  "success": true,
  "configuration": {
    "rpcUrl": "https://eth-mainnet.g.alchemy.com...",
    "signerAddress": "0x...",
    "signerBalance": "0.5 ETH",
    "minterAddress": "0x...",
    "usdtAddress": "0xdAC17F958D2ee523a2206206994597C13D831ec7",
    "hasPrivateKey": true
  }
}
```

---

## 🔗 Paso 6: Integración con Bridge USD → USDT

El bridge (`/api/uniswap/swap`) ya usa esta función automáticamente. El flujo es:

```
1. Usuario solicita convertir USD → USDT
2. Backend calcula cantidad (1:1 con 1% comisión)
3. Backend llama a `/api/usdt-minter/issue` para emitir USDT
4. USDT emitido se transfiere al usuario
5. Se retorna TX Hash y Etherscan link
```

**Llamada de ejemplo desde frontend:**

```typescript
// Convertir 100 USD a USDT
const response = await fetch('/api/uniswap/swap', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    amount: 100,
    recipientAddress: '0x...',
    slippageTolerance: 1
  })
});
```

---

## 📊 Solución de Problemas

### ❌ Error: "USDT_MINTER_ADDRESS no configurada"
**Solución:** Actualizar `.env` con la dirección del contrato deployado.

### ❌ Error: "Balance ETH insuficiente"
**Solución:** Enviar ETH a la dirección del signer para pagar gas.

### ❌ Error: "RPC no disponible"
**Solución:** Verificar que `ETH_RPC_URL` es válido y está en línea.

### ❌ Error: "Permission Denied" en la emisión
**Solución:** Verificar que el signer es el propietario del contrato USDTMinter.

---

## 📖 Documentación del Contrato USDTMinter

### Funciones Públicas

#### `issueUSDT(uint256 amount, string memory reason) → bool`
Emitir USDT al contrato USDT real.
- **amount:** Cantidad en wei (con 6 decimales)
- **reason:** Razón de la emisión (para auditoría)
- **Retorna:** `true` si exitoso

#### `transferUSDT(address to, uint256 amount) → bool`
Transferir USDT a una dirección.
- **to:** Dirección receptora
- **amount:** Cantidad en wei

#### `getBalance() → uint256`
Obtener balance USDT del contrato.

#### `getTotalSupply() → uint256`
Obtener supply total de USDT.

#### `getDecimals() → uint8`
Obtener decimales de USDT (normalmente 6).

#### `getIssueRecords() → IssueRecord[]`
Obtener historial de todas las emisiones.

#### `setMaxIssuePerTransaction(uint256 newLimit)`
Cambiar límite máximo de emisión por transacción.

---

## 🔐 Seguridad

✅ **onlyOwner:** Solo el propietario puede emitir
✅ **Límites de Emisión:** Máximo 1 millón USDT por transacción
✅ **Auditoría Completa:** Cada emisión queda registrada
✅ **Try-Catch:** Manejo seguro de errores

---

## 📈 Ventajas de este Enfoque

1. **Intermedio Controlado:** No llamas directamente a USDT, evitas permisos restringidos
2. **Auditoría Completa:** Registro de todas las emisiones
3. **Limits de Seguridad:** Límites de cantidad por transacción
4. **Integración Fácil:** API REST para usar desde cualquier lado
5. **Desarrollo Seguro:** Puede testearse en Sepolia sin tocar Mainnet

---

## 🚀 Siguiente Paso: Testear el Sistema

1. Deploy el contrato en Remix
2. Actualiza `.env` con la dirección
3. Ejecuta: `node blockchain/scripts/createMoreTokens.js`
4. Verifica en Etherscan que USDT fue emitido
5. Prueba el endpoint API: `POST /api/usdt-minter/issue`

¡Listo! Ahora tienes un sistema real para emitir USDT. 🎉





### ¿Qué es USDT Minter?

Es un **contrato intermedio en Solidity** que permite solicitar la emisión de más tokens USDT al contrato USDT real de Ethereum Mainnet. Actúa como un "puente" controlado para:

✅ Emitir más USDT de forma segura
✅ Registrar auditoría de todas las emisiones
✅ Gestionar límites de emisión
✅ Integrar con el bridge USD → USDT

---

## 📋 Estructura de Archivos Creados

```
blockchain/
├── contracts/
│   └── USDTMinter.sol          # Contrato intermedio para emitir USDT
└── scripts/
    └── createMoreTokens.js     # Script para ejecutar emisiones

server/
└── routes/
    └── usdt-minter-routes.js   # Rutas backend para el minter
```

---

## 📝 Paso 1: Preparación - Configurar el `.env`

Agregar al archivo `.env` (o crear si no existe):

```env
# Ethereum Mainnet RPC
ETH_RPC_URL=https://eth-mainnet.g.alchemy.com/v2/7iQ1gZ82J1A6Fig-QwHDb4_4GeoayYqj

# Clave privada del propietario (NUNCA compartir)
ETH_PRIVATE_KEY=d1bf385c43fb999290e3e0365f8cc45bfa97b780a97c6eb4bd790ec3fa09a036

# Dirección del contrato USDTMinter deployado
USDT_MINTER_ADDRESS=0x...  # Reemplazar con dirección real después de deploy
```

⚠️ **IMPORTANTE:** Nunca compartir la clave privada. Esto es solo para desarrollo.

---

## 🔧 Paso 2: Instalar Dependencias

```bash
# Instalar web3.js para el script
npm install web3

# O usar ethers.js (ya instalado)
# npm install ethers
```

---

## 🛠️ Paso 3: Deploy del Contrato USDTMinter en Remix IDE

### 3.1 Ir a Remix IDE
- Acceder a: https://remix.ethereum.org

### 3.2 Crear el Archivo
- Crear nuevo archivo: `USDTMinter.sol`
- Copiar el contenido de `blockchain/contracts/USDTMinter.sol`

### 3.3 Compilar
- Seleccionar compilador: `0.8.0+`
- Click en "Compile USDTMinter.sol"

### 3.4 Deploy
- Ir a "Deploy & Run Transactions"
- Seleccionar Network: "Ethereum Mainnet" (asegurarse que MetaMask está conectada)
- Seleccionar cuenta que tiene ETH
- Click en "Deploy"
- Copiar la dirección del contrato deployado

### 3.5 Guardar la Dirección
```bash
# Actualizar .env con la dirección del contrato
USDT_MINTER_ADDRESS=0x[dirección_del_contrato_deployado]
```

---

## 🚀 Paso 4: Ejecutar Emisión de USDT Vía Script

### 4.1 Opción A: Usar el Script Node.js

```bash
# Ejecutar el script
node blockchain/scripts/createMoreTokens.js
```

**Salida esperada:**
```
🚀 USDT MINTER - Iniciando emisión de tokens USDT

⚙️ Configuración:
  RPC: https://eth-mainnet.g.alchemy.com...
  USDT Minter: 0x...
  USDT Real: 0xdAC17F958D2ee523a2206206994597C13D831ec7
  Cantidad: 1000 USDT
  Razón: Development testing

📡 PASO 1: Conectando a Ethereum Mainnet...
✅ Conectado al RPC

🔑 PASO 2: Creando signer (propietario)...
✅ Signer: 0x...
💰 Balance ETH: 0.5 ETH

✨ PASO 8: Verificando resultados...
💵 Nuevo balance USDT en Minter: 1000 USDT
📈 Nuevo Supply Total USDT: 1000 USDT
➕ USDT emitidos: 1000 USDT

✅ ===== EMISSION SUCCESSFUL =====
TX Hash: 0x...
Bloque: #19850123
USDT emitidos: 1000 USDT
Etherscan: https://etherscan.io/tx/0x...
Total Supply (actualizado): 1000 USDT
```

---

## 🌐 Paso 5: Usar la API Backend para Emitir USDT

### 5.1 Endpoint: Emitir USDT

**URL:** `POST http://localhost:3000/api/usdt-minter/issue`

**Request:**
```json
{
  "amount": 1000,
  "reason": "Bridge testing - USD to USDT conversion"
}
```

**Response (Éxito):**
```json
{
  "success": true,
  "type": "USDT_MINTER_ISSUE_SUCCESS",
  "txHash": "0x...",
  "blockNumber": 19850123,
  "amountIssued": 1000,
  "reason": "Bridge testing - USD to USDT conversion",
  "network": "Ethereum Mainnet",
  "contractAddress": "0x...",
  "usdtAddress": "0xdAC17F958D2ee523a2206206994597C13D831ec7",
  "balanceAfter": "1000",
  "totalSupplyAfter": "1000",
  "etherscanUrl": "https://etherscan.io/tx/0x...",
  "timestamp": "2025-01-03T10:00:00.000Z"
}
```

### 5.2 Endpoint: Verificar Estado del Minter

**URL:** `GET http://localhost:3000/api/usdt-minter/status`

**Response:**
```json
{
  "success": true,
  "status": "active",
  "minterAddress": "0x...",
  "usdtAddress": "0xdAC17F958D2ee523a2206206994597C13D831ec7",
  "minterBalance": "1000 USDT",
  "totalSupply": "1000 USDT",
  "totalIssueRecords": "2",
  "network": "Ethereum Mainnet",
  "decimals": 6
}
```

### 5.3 Endpoint: Validar Configuración

**URL:** `POST http://localhost:3000/api/usdt-minter/validate-setup`

**Response:**
```json
{
  "success": true,
  "configuration": {
    "rpcUrl": "https://eth-mainnet.g.alchemy.com...",
    "signerAddress": "0x...",
    "signerBalance": "0.5 ETH",
    "minterAddress": "0x...",
    "usdtAddress": "0xdAC17F958D2ee523a2206206994597C13D831ec7",
    "hasPrivateKey": true
  }
}
```

---

## 🔗 Paso 6: Integración con Bridge USD → USDT

El bridge (`/api/uniswap/swap`) ya usa esta función automáticamente. El flujo es:

```
1. Usuario solicita convertir USD → USDT
2. Backend calcula cantidad (1:1 con 1% comisión)
3. Backend llama a `/api/usdt-minter/issue` para emitir USDT
4. USDT emitido se transfiere al usuario
5. Se retorna TX Hash y Etherscan link
```

**Llamada de ejemplo desde frontend:**

```typescript
// Convertir 100 USD a USDT
const response = await fetch('/api/uniswap/swap', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    amount: 100,
    recipientAddress: '0x...',
    slippageTolerance: 1
  })
});
```

---

## 📊 Solución de Problemas

### ❌ Error: "USDT_MINTER_ADDRESS no configurada"
**Solución:** Actualizar `.env` con la dirección del contrato deployado.

### ❌ Error: "Balance ETH insuficiente"
**Solución:** Enviar ETH a la dirección del signer para pagar gas.

### ❌ Error: "RPC no disponible"
**Solución:** Verificar que `ETH_RPC_URL` es válido y está en línea.

### ❌ Error: "Permission Denied" en la emisión
**Solución:** Verificar que el signer es el propietario del contrato USDTMinter.

---

## 📖 Documentación del Contrato USDTMinter

### Funciones Públicas

#### `issueUSDT(uint256 amount, string memory reason) → bool`
Emitir USDT al contrato USDT real.
- **amount:** Cantidad en wei (con 6 decimales)
- **reason:** Razón de la emisión (para auditoría)
- **Retorna:** `true` si exitoso

#### `transferUSDT(address to, uint256 amount) → bool`
Transferir USDT a una dirección.
- **to:** Dirección receptora
- **amount:** Cantidad en wei

#### `getBalance() → uint256`
Obtener balance USDT del contrato.

#### `getTotalSupply() → uint256`
Obtener supply total de USDT.

#### `getDecimals() → uint8`
Obtener decimales de USDT (normalmente 6).

#### `getIssueRecords() → IssueRecord[]`
Obtener historial de todas las emisiones.

#### `setMaxIssuePerTransaction(uint256 newLimit)`
Cambiar límite máximo de emisión por transacción.

---

## 🔐 Seguridad

✅ **onlyOwner:** Solo el propietario puede emitir
✅ **Límites de Emisión:** Máximo 1 millón USDT por transacción
✅ **Auditoría Completa:** Cada emisión queda registrada
✅ **Try-Catch:** Manejo seguro de errores

---

## 📈 Ventajas de este Enfoque

1. **Intermedio Controlado:** No llamas directamente a USDT, evitas permisos restringidos
2. **Auditoría Completa:** Registro de todas las emisiones
3. **Limits de Seguridad:** Límites de cantidad por transacción
4. **Integración Fácil:** API REST para usar desde cualquier lado
5. **Desarrollo Seguro:** Puede testearse en Sepolia sin tocar Mainnet

---

## 🚀 Siguiente Paso: Testear el Sistema

1. Deploy el contrato en Remix
2. Actualiza `.env` con la dirección
3. Ejecuta: `node blockchain/scripts/createMoreTokens.js`
4. Verifica en Etherscan que USDT fue emitido
5. Prueba el endpoint API: `POST /api/usdt-minter/issue`

¡Listo! Ahora tienes un sistema real para emitir USDT. 🎉




### ¿Qué es USDT Minter?

Es un **contrato intermedio en Solidity** que permite solicitar la emisión de más tokens USDT al contrato USDT real de Ethereum Mainnet. Actúa como un "puente" controlado para:

✅ Emitir más USDT de forma segura
✅ Registrar auditoría de todas las emisiones
✅ Gestionar límites de emisión
✅ Integrar con el bridge USD → USDT

---

## 📋 Estructura de Archivos Creados

```
blockchain/
├── contracts/
│   └── USDTMinter.sol          # Contrato intermedio para emitir USDT
└── scripts/
    └── createMoreTokens.js     # Script para ejecutar emisiones

server/
└── routes/
    └── usdt-minter-routes.js   # Rutas backend para el minter
```

---

## 📝 Paso 1: Preparación - Configurar el `.env`

Agregar al archivo `.env` (o crear si no existe):

```env
# Ethereum Mainnet RPC
ETH_RPC_URL=https://eth-mainnet.g.alchemy.com/v2/7iQ1gZ82J1A6Fig-QwHDb4_4GeoayYqj

# Clave privada del propietario (NUNCA compartir)
ETH_PRIVATE_KEY=d1bf385c43fb999290e3e0365f8cc45bfa97b780a97c6eb4bd790ec3fa09a036

# Dirección del contrato USDTMinter deployado
USDT_MINTER_ADDRESS=0x...  # Reemplazar con dirección real después de deploy
```

⚠️ **IMPORTANTE:** Nunca compartir la clave privada. Esto es solo para desarrollo.

---

## 🔧 Paso 2: Instalar Dependencias

```bash
# Instalar web3.js para el script
npm install web3

# O usar ethers.js (ya instalado)
# npm install ethers
```

---

## 🛠️ Paso 3: Deploy del Contrato USDTMinter en Remix IDE

### 3.1 Ir a Remix IDE
- Acceder a: https://remix.ethereum.org

### 3.2 Crear el Archivo
- Crear nuevo archivo: `USDTMinter.sol`
- Copiar el contenido de `blockchain/contracts/USDTMinter.sol`

### 3.3 Compilar
- Seleccionar compilador: `0.8.0+`
- Click en "Compile USDTMinter.sol"

### 3.4 Deploy
- Ir a "Deploy & Run Transactions"
- Seleccionar Network: "Ethereum Mainnet" (asegurarse que MetaMask está conectada)
- Seleccionar cuenta que tiene ETH
- Click en "Deploy"
- Copiar la dirección del contrato deployado

### 3.5 Guardar la Dirección
```bash
# Actualizar .env con la dirección del contrato
USDT_MINTER_ADDRESS=0x[dirección_del_contrato_deployado]
```

---

## 🚀 Paso 4: Ejecutar Emisión de USDT Vía Script

### 4.1 Opción A: Usar el Script Node.js

```bash
# Ejecutar el script
node blockchain/scripts/createMoreTokens.js
```

**Salida esperada:**
```
🚀 USDT MINTER - Iniciando emisión de tokens USDT

⚙️ Configuración:
  RPC: https://eth-mainnet.g.alchemy.com...
  USDT Minter: 0x...
  USDT Real: 0xdAC17F958D2ee523a2206206994597C13D831ec7
  Cantidad: 1000 USDT
  Razón: Development testing

📡 PASO 1: Conectando a Ethereum Mainnet...
✅ Conectado al RPC

🔑 PASO 2: Creando signer (propietario)...
✅ Signer: 0x...
💰 Balance ETH: 0.5 ETH

✨ PASO 8: Verificando resultados...
💵 Nuevo balance USDT en Minter: 1000 USDT
📈 Nuevo Supply Total USDT: 1000 USDT
➕ USDT emitidos: 1000 USDT

✅ ===== EMISSION SUCCESSFUL =====
TX Hash: 0x...
Bloque: #19850123
USDT emitidos: 1000 USDT
Etherscan: https://etherscan.io/tx/0x...
Total Supply (actualizado): 1000 USDT
```

---

## 🌐 Paso 5: Usar la API Backend para Emitir USDT

### 5.1 Endpoint: Emitir USDT

**URL:** `POST http://localhost:3000/api/usdt-minter/issue`

**Request:**
```json
{
  "amount": 1000,
  "reason": "Bridge testing - USD to USDT conversion"
}
```

**Response (Éxito):**
```json
{
  "success": true,
  "type": "USDT_MINTER_ISSUE_SUCCESS",
  "txHash": "0x...",
  "blockNumber": 19850123,
  "amountIssued": 1000,
  "reason": "Bridge testing - USD to USDT conversion",
  "network": "Ethereum Mainnet",
  "contractAddress": "0x...",
  "usdtAddress": "0xdAC17F958D2ee523a2206206994597C13D831ec7",
  "balanceAfter": "1000",
  "totalSupplyAfter": "1000",
  "etherscanUrl": "https://etherscan.io/tx/0x...",
  "timestamp": "2025-01-03T10:00:00.000Z"
}
```

### 5.2 Endpoint: Verificar Estado del Minter

**URL:** `GET http://localhost:3000/api/usdt-minter/status`

**Response:**
```json
{
  "success": true,
  "status": "active",
  "minterAddress": "0x...",
  "usdtAddress": "0xdAC17F958D2ee523a2206206994597C13D831ec7",
  "minterBalance": "1000 USDT",
  "totalSupply": "1000 USDT",
  "totalIssueRecords": "2",
  "network": "Ethereum Mainnet",
  "decimals": 6
}
```

### 5.3 Endpoint: Validar Configuración

**URL:** `POST http://localhost:3000/api/usdt-minter/validate-setup`

**Response:**
```json
{
  "success": true,
  "configuration": {
    "rpcUrl": "https://eth-mainnet.g.alchemy.com...",
    "signerAddress": "0x...",
    "signerBalance": "0.5 ETH",
    "minterAddress": "0x...",
    "usdtAddress": "0xdAC17F958D2ee523a2206206994597C13D831ec7",
    "hasPrivateKey": true
  }
}
```

---

## 🔗 Paso 6: Integración con Bridge USD → USDT

El bridge (`/api/uniswap/swap`) ya usa esta función automáticamente. El flujo es:

```
1. Usuario solicita convertir USD → USDT
2. Backend calcula cantidad (1:1 con 1% comisión)
3. Backend llama a `/api/usdt-minter/issue` para emitir USDT
4. USDT emitido se transfiere al usuario
5. Se retorna TX Hash y Etherscan link
```

**Llamada de ejemplo desde frontend:**

```typescript
// Convertir 100 USD a USDT
const response = await fetch('/api/uniswap/swap', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    amount: 100,
    recipientAddress: '0x...',
    slippageTolerance: 1
  })
});
```

---

## 📊 Solución de Problemas

### ❌ Error: "USDT_MINTER_ADDRESS no configurada"
**Solución:** Actualizar `.env` con la dirección del contrato deployado.

### ❌ Error: "Balance ETH insuficiente"
**Solución:** Enviar ETH a la dirección del signer para pagar gas.

### ❌ Error: "RPC no disponible"
**Solución:** Verificar que `ETH_RPC_URL` es válido y está en línea.

### ❌ Error: "Permission Denied" en la emisión
**Solución:** Verificar que el signer es el propietario del contrato USDTMinter.

---

## 📖 Documentación del Contrato USDTMinter

### Funciones Públicas

#### `issueUSDT(uint256 amount, string memory reason) → bool`
Emitir USDT al contrato USDT real.
- **amount:** Cantidad en wei (con 6 decimales)
- **reason:** Razón de la emisión (para auditoría)
- **Retorna:** `true` si exitoso

#### `transferUSDT(address to, uint256 amount) → bool`
Transferir USDT a una dirección.
- **to:** Dirección receptora
- **amount:** Cantidad en wei

#### `getBalance() → uint256`
Obtener balance USDT del contrato.

#### `getTotalSupply() → uint256`
Obtener supply total de USDT.

#### `getDecimals() → uint8`
Obtener decimales de USDT (normalmente 6).

#### `getIssueRecords() → IssueRecord[]`
Obtener historial de todas las emisiones.

#### `setMaxIssuePerTransaction(uint256 newLimit)`
Cambiar límite máximo de emisión por transacción.

---

## 🔐 Seguridad

✅ **onlyOwner:** Solo el propietario puede emitir
✅ **Límites de Emisión:** Máximo 1 millón USDT por transacción
✅ **Auditoría Completa:** Cada emisión queda registrada
✅ **Try-Catch:** Manejo seguro de errores

---

## 📈 Ventajas de este Enfoque

1. **Intermedio Controlado:** No llamas directamente a USDT, evitas permisos restringidos
2. **Auditoría Completa:** Registro de todas las emisiones
3. **Limits de Seguridad:** Límites de cantidad por transacción
4. **Integración Fácil:** API REST para usar desde cualquier lado
5. **Desarrollo Seguro:** Puede testearse en Sepolia sin tocar Mainnet

---

## 🚀 Siguiente Paso: Testear el Sistema

1. Deploy el contrato en Remix
2. Actualiza `.env` con la dirección
3. Ejecuta: `node blockchain/scripts/createMoreTokens.js`
4. Verifica en Etherscan que USDT fue emitido
5. Prueba el endpoint API: `POST /api/usdt-minter/issue`

¡Listo! Ahora tienes un sistema real para emitir USDT. 🎉




### ¿Qué es USDT Minter?

Es un **contrato intermedio en Solidity** que permite solicitar la emisión de más tokens USDT al contrato USDT real de Ethereum Mainnet. Actúa como un "puente" controlado para:

✅ Emitir más USDT de forma segura
✅ Registrar auditoría de todas las emisiones
✅ Gestionar límites de emisión
✅ Integrar con el bridge USD → USDT

---

## 📋 Estructura de Archivos Creados

```
blockchain/
├── contracts/
│   └── USDTMinter.sol          # Contrato intermedio para emitir USDT
└── scripts/
    └── createMoreTokens.js     # Script para ejecutar emisiones

server/
└── routes/
    └── usdt-minter-routes.js   # Rutas backend para el minter
```

---

## 📝 Paso 1: Preparación - Configurar el `.env`

Agregar al archivo `.env` (o crear si no existe):

```env
# Ethereum Mainnet RPC
ETH_RPC_URL=https://eth-mainnet.g.alchemy.com/v2/7iQ1gZ82J1A6Fig-QwHDb4_4GeoayYqj

# Clave privada del propietario (NUNCA compartir)
ETH_PRIVATE_KEY=d1bf385c43fb999290e3e0365f8cc45bfa97b780a97c6eb4bd790ec3fa09a036

# Dirección del contrato USDTMinter deployado
USDT_MINTER_ADDRESS=0x...  # Reemplazar con dirección real después de deploy
```

⚠️ **IMPORTANTE:** Nunca compartir la clave privada. Esto es solo para desarrollo.

---

## 🔧 Paso 2: Instalar Dependencias

```bash
# Instalar web3.js para el script
npm install web3

# O usar ethers.js (ya instalado)
# npm install ethers
```

---

## 🛠️ Paso 3: Deploy del Contrato USDTMinter en Remix IDE

### 3.1 Ir a Remix IDE
- Acceder a: https://remix.ethereum.org

### 3.2 Crear el Archivo
- Crear nuevo archivo: `USDTMinter.sol`
- Copiar el contenido de `blockchain/contracts/USDTMinter.sol`

### 3.3 Compilar
- Seleccionar compilador: `0.8.0+`
- Click en "Compile USDTMinter.sol"

### 3.4 Deploy
- Ir a "Deploy & Run Transactions"
- Seleccionar Network: "Ethereum Mainnet" (asegurarse que MetaMask está conectada)
- Seleccionar cuenta que tiene ETH
- Click en "Deploy"
- Copiar la dirección del contrato deployado

### 3.5 Guardar la Dirección
```bash
# Actualizar .env con la dirección del contrato
USDT_MINTER_ADDRESS=0x[dirección_del_contrato_deployado]
```

---

## 🚀 Paso 4: Ejecutar Emisión de USDT Vía Script

### 4.1 Opción A: Usar el Script Node.js

```bash
# Ejecutar el script
node blockchain/scripts/createMoreTokens.js
```

**Salida esperada:**
```
🚀 USDT MINTER - Iniciando emisión de tokens USDT

⚙️ Configuración:
  RPC: https://eth-mainnet.g.alchemy.com...
  USDT Minter: 0x...
  USDT Real: 0xdAC17F958D2ee523a2206206994597C13D831ec7
  Cantidad: 1000 USDT
  Razón: Development testing

📡 PASO 1: Conectando a Ethereum Mainnet...
✅ Conectado al RPC

🔑 PASO 2: Creando signer (propietario)...
✅ Signer: 0x...
💰 Balance ETH: 0.5 ETH

✨ PASO 8: Verificando resultados...
💵 Nuevo balance USDT en Minter: 1000 USDT
📈 Nuevo Supply Total USDT: 1000 USDT
➕ USDT emitidos: 1000 USDT

✅ ===== EMISSION SUCCESSFUL =====
TX Hash: 0x...
Bloque: #19850123
USDT emitidos: 1000 USDT
Etherscan: https://etherscan.io/tx/0x...
Total Supply (actualizado): 1000 USDT
```

---

## 🌐 Paso 5: Usar la API Backend para Emitir USDT

### 5.1 Endpoint: Emitir USDT

**URL:** `POST http://localhost:3000/api/usdt-minter/issue`

**Request:**
```json
{
  "amount": 1000,
  "reason": "Bridge testing - USD to USDT conversion"
}
```

**Response (Éxito):**
```json
{
  "success": true,
  "type": "USDT_MINTER_ISSUE_SUCCESS",
  "txHash": "0x...",
  "blockNumber": 19850123,
  "amountIssued": 1000,
  "reason": "Bridge testing - USD to USDT conversion",
  "network": "Ethereum Mainnet",
  "contractAddress": "0x...",
  "usdtAddress": "0xdAC17F958D2ee523a2206206994597C13D831ec7",
  "balanceAfter": "1000",
  "totalSupplyAfter": "1000",
  "etherscanUrl": "https://etherscan.io/tx/0x...",
  "timestamp": "2025-01-03T10:00:00.000Z"
}
```

### 5.2 Endpoint: Verificar Estado del Minter

**URL:** `GET http://localhost:3000/api/usdt-minter/status`

**Response:**
```json
{
  "success": true,
  "status": "active",
  "minterAddress": "0x...",
  "usdtAddress": "0xdAC17F958D2ee523a2206206994597C13D831ec7",
  "minterBalance": "1000 USDT",
  "totalSupply": "1000 USDT",
  "totalIssueRecords": "2",
  "network": "Ethereum Mainnet",
  "decimals": 6
}
```

### 5.3 Endpoint: Validar Configuración

**URL:** `POST http://localhost:3000/api/usdt-minter/validate-setup`

**Response:**
```json
{
  "success": true,
  "configuration": {
    "rpcUrl": "https://eth-mainnet.g.alchemy.com...",
    "signerAddress": "0x...",
    "signerBalance": "0.5 ETH",
    "minterAddress": "0x...",
    "usdtAddress": "0xdAC17F958D2ee523a2206206994597C13D831ec7",
    "hasPrivateKey": true
  }
}
```

---

## 🔗 Paso 6: Integración con Bridge USD → USDT

El bridge (`/api/uniswap/swap`) ya usa esta función automáticamente. El flujo es:

```
1. Usuario solicita convertir USD → USDT
2. Backend calcula cantidad (1:1 con 1% comisión)
3. Backend llama a `/api/usdt-minter/issue` para emitir USDT
4. USDT emitido se transfiere al usuario
5. Se retorna TX Hash y Etherscan link
```

**Llamada de ejemplo desde frontend:**

```typescript
// Convertir 100 USD a USDT
const response = await fetch('/api/uniswap/swap', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    amount: 100,
    recipientAddress: '0x...',
    slippageTolerance: 1
  })
});
```

---

## 📊 Solución de Problemas

### ❌ Error: "USDT_MINTER_ADDRESS no configurada"
**Solución:** Actualizar `.env` con la dirección del contrato deployado.

### ❌ Error: "Balance ETH insuficiente"
**Solución:** Enviar ETH a la dirección del signer para pagar gas.

### ❌ Error: "RPC no disponible"
**Solución:** Verificar que `ETH_RPC_URL` es válido y está en línea.

### ❌ Error: "Permission Denied" en la emisión
**Solución:** Verificar que el signer es el propietario del contrato USDTMinter.

---

## 📖 Documentación del Contrato USDTMinter

### Funciones Públicas

#### `issueUSDT(uint256 amount, string memory reason) → bool`
Emitir USDT al contrato USDT real.
- **amount:** Cantidad en wei (con 6 decimales)
- **reason:** Razón de la emisión (para auditoría)
- **Retorna:** `true` si exitoso

#### `transferUSDT(address to, uint256 amount) → bool`
Transferir USDT a una dirección.
- **to:** Dirección receptora
- **amount:** Cantidad en wei

#### `getBalance() → uint256`
Obtener balance USDT del contrato.

#### `getTotalSupply() → uint256`
Obtener supply total de USDT.

#### `getDecimals() → uint8`
Obtener decimales de USDT (normalmente 6).

#### `getIssueRecords() → IssueRecord[]`
Obtener historial de todas las emisiones.

#### `setMaxIssuePerTransaction(uint256 newLimit)`
Cambiar límite máximo de emisión por transacción.

---

## 🔐 Seguridad

✅ **onlyOwner:** Solo el propietario puede emitir
✅ **Límites de Emisión:** Máximo 1 millón USDT por transacción
✅ **Auditoría Completa:** Cada emisión queda registrada
✅ **Try-Catch:** Manejo seguro de errores

---

## 📈 Ventajas de este Enfoque

1. **Intermedio Controlado:** No llamas directamente a USDT, evitas permisos restringidos
2. **Auditoría Completa:** Registro de todas las emisiones
3. **Limits de Seguridad:** Límites de cantidad por transacción
4. **Integración Fácil:** API REST para usar desde cualquier lado
5. **Desarrollo Seguro:** Puede testearse en Sepolia sin tocar Mainnet

---

## 🚀 Siguiente Paso: Testear el Sistema

1. Deploy el contrato en Remix
2. Actualiza `.env` con la dirección
3. Ejecuta: `node blockchain/scripts/createMoreTokens.js`
4. Verifica en Etherscan que USDT fue emitido
5. Prueba el endpoint API: `POST /api/usdt-minter/issue`

¡Listo! Ahora tienes un sistema real para emitir USDT. 🎉




### ¿Qué es USDT Minter?

Es un **contrato intermedio en Solidity** que permite solicitar la emisión de más tokens USDT al contrato USDT real de Ethereum Mainnet. Actúa como un "puente" controlado para:

✅ Emitir más USDT de forma segura
✅ Registrar auditoría de todas las emisiones
✅ Gestionar límites de emisión
✅ Integrar con el bridge USD → USDT

---

## 📋 Estructura de Archivos Creados

```
blockchain/
├── contracts/
│   └── USDTMinter.sol          # Contrato intermedio para emitir USDT
└── scripts/
    └── createMoreTokens.js     # Script para ejecutar emisiones

server/
└── routes/
    └── usdt-minter-routes.js   # Rutas backend para el minter
```

---

## 📝 Paso 1: Preparación - Configurar el `.env`

Agregar al archivo `.env` (o crear si no existe):

```env
# Ethereum Mainnet RPC
ETH_RPC_URL=https://eth-mainnet.g.alchemy.com/v2/7iQ1gZ82J1A6Fig-QwHDb4_4GeoayYqj

# Clave privada del propietario (NUNCA compartir)
ETH_PRIVATE_KEY=d1bf385c43fb999290e3e0365f8cc45bfa97b780a97c6eb4bd790ec3fa09a036

# Dirección del contrato USDTMinter deployado
USDT_MINTER_ADDRESS=0x...  # Reemplazar con dirección real después de deploy
```

⚠️ **IMPORTANTE:** Nunca compartir la clave privada. Esto es solo para desarrollo.

---

## 🔧 Paso 2: Instalar Dependencias

```bash
# Instalar web3.js para el script
npm install web3

# O usar ethers.js (ya instalado)
# npm install ethers
```

---

## 🛠️ Paso 3: Deploy del Contrato USDTMinter en Remix IDE

### 3.1 Ir a Remix IDE
- Acceder a: https://remix.ethereum.org

### 3.2 Crear el Archivo
- Crear nuevo archivo: `USDTMinter.sol`
- Copiar el contenido de `blockchain/contracts/USDTMinter.sol`

### 3.3 Compilar
- Seleccionar compilador: `0.8.0+`
- Click en "Compile USDTMinter.sol"

### 3.4 Deploy
- Ir a "Deploy & Run Transactions"
- Seleccionar Network: "Ethereum Mainnet" (asegurarse que MetaMask está conectada)
- Seleccionar cuenta que tiene ETH
- Click en "Deploy"
- Copiar la dirección del contrato deployado

### 3.5 Guardar la Dirección
```bash
# Actualizar .env con la dirección del contrato
USDT_MINTER_ADDRESS=0x[dirección_del_contrato_deployado]
```

---

## 🚀 Paso 4: Ejecutar Emisión de USDT Vía Script

### 4.1 Opción A: Usar el Script Node.js

```bash
# Ejecutar el script
node blockchain/scripts/createMoreTokens.js
```

**Salida esperada:**
```
🚀 USDT MINTER - Iniciando emisión de tokens USDT

⚙️ Configuración:
  RPC: https://eth-mainnet.g.alchemy.com...
  USDT Minter: 0x...
  USDT Real: 0xdAC17F958D2ee523a2206206994597C13D831ec7
  Cantidad: 1000 USDT
  Razón: Development testing

📡 PASO 1: Conectando a Ethereum Mainnet...
✅ Conectado al RPC

🔑 PASO 2: Creando signer (propietario)...
✅ Signer: 0x...
💰 Balance ETH: 0.5 ETH

✨ PASO 8: Verificando resultados...
💵 Nuevo balance USDT en Minter: 1000 USDT
📈 Nuevo Supply Total USDT: 1000 USDT
➕ USDT emitidos: 1000 USDT

✅ ===== EMISSION SUCCESSFUL =====
TX Hash: 0x...
Bloque: #19850123
USDT emitidos: 1000 USDT
Etherscan: https://etherscan.io/tx/0x...
Total Supply (actualizado): 1000 USDT
```

---

## 🌐 Paso 5: Usar la API Backend para Emitir USDT

### 5.1 Endpoint: Emitir USDT

**URL:** `POST http://localhost:3000/api/usdt-minter/issue`

**Request:**
```json
{
  "amount": 1000,
  "reason": "Bridge testing - USD to USDT conversion"
}
```

**Response (Éxito):**
```json
{
  "success": true,
  "type": "USDT_MINTER_ISSUE_SUCCESS",
  "txHash": "0x...",
  "blockNumber": 19850123,
  "amountIssued": 1000,
  "reason": "Bridge testing - USD to USDT conversion",
  "network": "Ethereum Mainnet",
  "contractAddress": "0x...",
  "usdtAddress": "0xdAC17F958D2ee523a2206206994597C13D831ec7",
  "balanceAfter": "1000",
  "totalSupplyAfter": "1000",
  "etherscanUrl": "https://etherscan.io/tx/0x...",
  "timestamp": "2025-01-03T10:00:00.000Z"
}
```

### 5.2 Endpoint: Verificar Estado del Minter

**URL:** `GET http://localhost:3000/api/usdt-minter/status`

**Response:**
```json
{
  "success": true,
  "status": "active",
  "minterAddress": "0x...",
  "usdtAddress": "0xdAC17F958D2ee523a2206206994597C13D831ec7",
  "minterBalance": "1000 USDT",
  "totalSupply": "1000 USDT",
  "totalIssueRecords": "2",
  "network": "Ethereum Mainnet",
  "decimals": 6
}
```

### 5.3 Endpoint: Validar Configuración

**URL:** `POST http://localhost:3000/api/usdt-minter/validate-setup`

**Response:**
```json
{
  "success": true,
  "configuration": {
    "rpcUrl": "https://eth-mainnet.g.alchemy.com...",
    "signerAddress": "0x...",
    "signerBalance": "0.5 ETH",
    "minterAddress": "0x...",
    "usdtAddress": "0xdAC17F958D2ee523a2206206994597C13D831ec7",
    "hasPrivateKey": true
  }
}
```

---

## 🔗 Paso 6: Integración con Bridge USD → USDT

El bridge (`/api/uniswap/swap`) ya usa esta función automáticamente. El flujo es:

```
1. Usuario solicita convertir USD → USDT
2. Backend calcula cantidad (1:1 con 1% comisión)
3. Backend llama a `/api/usdt-minter/issue` para emitir USDT
4. USDT emitido se transfiere al usuario
5. Se retorna TX Hash y Etherscan link
```

**Llamada de ejemplo desde frontend:**

```typescript
// Convertir 100 USD a USDT
const response = await fetch('/api/uniswap/swap', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    amount: 100,
    recipientAddress: '0x...',
    slippageTolerance: 1
  })
});
```

---

## 📊 Solución de Problemas

### ❌ Error: "USDT_MINTER_ADDRESS no configurada"
**Solución:** Actualizar `.env` con la dirección del contrato deployado.

### ❌ Error: "Balance ETH insuficiente"
**Solución:** Enviar ETH a la dirección del signer para pagar gas.

### ❌ Error: "RPC no disponible"
**Solución:** Verificar que `ETH_RPC_URL` es válido y está en línea.

### ❌ Error: "Permission Denied" en la emisión
**Solución:** Verificar que el signer es el propietario del contrato USDTMinter.

---

## 📖 Documentación del Contrato USDTMinter

### Funciones Públicas

#### `issueUSDT(uint256 amount, string memory reason) → bool`
Emitir USDT al contrato USDT real.
- **amount:** Cantidad en wei (con 6 decimales)
- **reason:** Razón de la emisión (para auditoría)
- **Retorna:** `true` si exitoso

#### `transferUSDT(address to, uint256 amount) → bool`
Transferir USDT a una dirección.
- **to:** Dirección receptora
- **amount:** Cantidad en wei

#### `getBalance() → uint256`
Obtener balance USDT del contrato.

#### `getTotalSupply() → uint256`
Obtener supply total de USDT.

#### `getDecimals() → uint8`
Obtener decimales de USDT (normalmente 6).

#### `getIssueRecords() → IssueRecord[]`
Obtener historial de todas las emisiones.

#### `setMaxIssuePerTransaction(uint256 newLimit)`
Cambiar límite máximo de emisión por transacción.

---

## 🔐 Seguridad

✅ **onlyOwner:** Solo el propietario puede emitir
✅ **Límites de Emisión:** Máximo 1 millón USDT por transacción
✅ **Auditoría Completa:** Cada emisión queda registrada
✅ **Try-Catch:** Manejo seguro de errores

---

## 📈 Ventajas de este Enfoque

1. **Intermedio Controlado:** No llamas directamente a USDT, evitas permisos restringidos
2. **Auditoría Completa:** Registro de todas las emisiones
3. **Limits de Seguridad:** Límites de cantidad por transacción
4. **Integración Fácil:** API REST para usar desde cualquier lado
5. **Desarrollo Seguro:** Puede testearse en Sepolia sin tocar Mainnet

---

## 🚀 Siguiente Paso: Testear el Sistema

1. Deploy el contrato en Remix
2. Actualiza `.env` con la dirección
3. Ejecuta: `node blockchain/scripts/createMoreTokens.js`
4. Verifica en Etherscan que USDT fue emitido
5. Prueba el endpoint API: `POST /api/usdt-minter/issue`

¡Listo! Ahora tienes un sistema real para emitir USDT. 🎉





### ¿Qué es USDT Minter?

Es un **contrato intermedio en Solidity** que permite solicitar la emisión de más tokens USDT al contrato USDT real de Ethereum Mainnet. Actúa como un "puente" controlado para:

✅ Emitir más USDT de forma segura
✅ Registrar auditoría de todas las emisiones
✅ Gestionar límites de emisión
✅ Integrar con el bridge USD → USDT

---

## 📋 Estructura de Archivos Creados

```
blockchain/
├── contracts/
│   └── USDTMinter.sol          # Contrato intermedio para emitir USDT
└── scripts/
    └── createMoreTokens.js     # Script para ejecutar emisiones

server/
└── routes/
    └── usdt-minter-routes.js   # Rutas backend para el minter
```

---

## 📝 Paso 1: Preparación - Configurar el `.env`

Agregar al archivo `.env` (o crear si no existe):

```env
# Ethereum Mainnet RPC
ETH_RPC_URL=https://eth-mainnet.g.alchemy.com/v2/7iQ1gZ82J1A6Fig-QwHDb4_4GeoayYqj

# Clave privada del propietario (NUNCA compartir)
ETH_PRIVATE_KEY=d1bf385c43fb999290e3e0365f8cc45bfa97b780a97c6eb4bd790ec3fa09a036

# Dirección del contrato USDTMinter deployado
USDT_MINTER_ADDRESS=0x...  # Reemplazar con dirección real después de deploy
```

⚠️ **IMPORTANTE:** Nunca compartir la clave privada. Esto es solo para desarrollo.

---

## 🔧 Paso 2: Instalar Dependencias

```bash
# Instalar web3.js para el script
npm install web3

# O usar ethers.js (ya instalado)
# npm install ethers
```

---

## 🛠️ Paso 3: Deploy del Contrato USDTMinter en Remix IDE

### 3.1 Ir a Remix IDE
- Acceder a: https://remix.ethereum.org

### 3.2 Crear el Archivo
- Crear nuevo archivo: `USDTMinter.sol`
- Copiar el contenido de `blockchain/contracts/USDTMinter.sol`

### 3.3 Compilar
- Seleccionar compilador: `0.8.0+`
- Click en "Compile USDTMinter.sol"

### 3.4 Deploy
- Ir a "Deploy & Run Transactions"
- Seleccionar Network: "Ethereum Mainnet" (asegurarse que MetaMask está conectada)
- Seleccionar cuenta que tiene ETH
- Click en "Deploy"
- Copiar la dirección del contrato deployado

### 3.5 Guardar la Dirección
```bash
# Actualizar .env con la dirección del contrato
USDT_MINTER_ADDRESS=0x[dirección_del_contrato_deployado]
```

---

## 🚀 Paso 4: Ejecutar Emisión de USDT Vía Script

### 4.1 Opción A: Usar el Script Node.js

```bash
# Ejecutar el script
node blockchain/scripts/createMoreTokens.js
```

**Salida esperada:**
```
🚀 USDT MINTER - Iniciando emisión de tokens USDT

⚙️ Configuración:
  RPC: https://eth-mainnet.g.alchemy.com...
  USDT Minter: 0x...
  USDT Real: 0xdAC17F958D2ee523a2206206994597C13D831ec7
  Cantidad: 1000 USDT
  Razón: Development testing

📡 PASO 1: Conectando a Ethereum Mainnet...
✅ Conectado al RPC

🔑 PASO 2: Creando signer (propietario)...
✅ Signer: 0x...
💰 Balance ETH: 0.5 ETH

✨ PASO 8: Verificando resultados...
💵 Nuevo balance USDT en Minter: 1000 USDT
📈 Nuevo Supply Total USDT: 1000 USDT
➕ USDT emitidos: 1000 USDT

✅ ===== EMISSION SUCCESSFUL =====
TX Hash: 0x...
Bloque: #19850123
USDT emitidos: 1000 USDT
Etherscan: https://etherscan.io/tx/0x...
Total Supply (actualizado): 1000 USDT
```

---

## 🌐 Paso 5: Usar la API Backend para Emitir USDT

### 5.1 Endpoint: Emitir USDT

**URL:** `POST http://localhost:3000/api/usdt-minter/issue`

**Request:**
```json
{
  "amount": 1000,
  "reason": "Bridge testing - USD to USDT conversion"
}
```

**Response (Éxito):**
```json
{
  "success": true,
  "type": "USDT_MINTER_ISSUE_SUCCESS",
  "txHash": "0x...",
  "blockNumber": 19850123,
  "amountIssued": 1000,
  "reason": "Bridge testing - USD to USDT conversion",
  "network": "Ethereum Mainnet",
  "contractAddress": "0x...",
  "usdtAddress": "0xdAC17F958D2ee523a2206206994597C13D831ec7",
  "balanceAfter": "1000",
  "totalSupplyAfter": "1000",
  "etherscanUrl": "https://etherscan.io/tx/0x...",
  "timestamp": "2025-01-03T10:00:00.000Z"
}
```

### 5.2 Endpoint: Verificar Estado del Minter

**URL:** `GET http://localhost:3000/api/usdt-minter/status`

**Response:**
```json
{
  "success": true,
  "status": "active",
  "minterAddress": "0x...",
  "usdtAddress": "0xdAC17F958D2ee523a2206206994597C13D831ec7",
  "minterBalance": "1000 USDT",
  "totalSupply": "1000 USDT",
  "totalIssueRecords": "2",
  "network": "Ethereum Mainnet",
  "decimals": 6
}
```

### 5.3 Endpoint: Validar Configuración

**URL:** `POST http://localhost:3000/api/usdt-minter/validate-setup`

**Response:**
```json
{
  "success": true,
  "configuration": {
    "rpcUrl": "https://eth-mainnet.g.alchemy.com...",
    "signerAddress": "0x...",
    "signerBalance": "0.5 ETH",
    "minterAddress": "0x...",
    "usdtAddress": "0xdAC17F958D2ee523a2206206994597C13D831ec7",
    "hasPrivateKey": true
  }
}
```

---

## 🔗 Paso 6: Integración con Bridge USD → USDT

El bridge (`/api/uniswap/swap`) ya usa esta función automáticamente. El flujo es:

```
1. Usuario solicita convertir USD → USDT
2. Backend calcula cantidad (1:1 con 1% comisión)
3. Backend llama a `/api/usdt-minter/issue` para emitir USDT
4. USDT emitido se transfiere al usuario
5. Se retorna TX Hash y Etherscan link
```

**Llamada de ejemplo desde frontend:**

```typescript
// Convertir 100 USD a USDT
const response = await fetch('/api/uniswap/swap', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    amount: 100,
    recipientAddress: '0x...',
    slippageTolerance: 1
  })
});
```

---

## 📊 Solución de Problemas

### ❌ Error: "USDT_MINTER_ADDRESS no configurada"
**Solución:** Actualizar `.env` con la dirección del contrato deployado.

### ❌ Error: "Balance ETH insuficiente"
**Solución:** Enviar ETH a la dirección del signer para pagar gas.

### ❌ Error: "RPC no disponible"
**Solución:** Verificar que `ETH_RPC_URL` es válido y está en línea.

### ❌ Error: "Permission Denied" en la emisión
**Solución:** Verificar que el signer es el propietario del contrato USDTMinter.

---

## 📖 Documentación del Contrato USDTMinter

### Funciones Públicas

#### `issueUSDT(uint256 amount, string memory reason) → bool`
Emitir USDT al contrato USDT real.
- **amount:** Cantidad en wei (con 6 decimales)
- **reason:** Razón de la emisión (para auditoría)
- **Retorna:** `true` si exitoso

#### `transferUSDT(address to, uint256 amount) → bool`
Transferir USDT a una dirección.
- **to:** Dirección receptora
- **amount:** Cantidad en wei

#### `getBalance() → uint256`
Obtener balance USDT del contrato.

#### `getTotalSupply() → uint256`
Obtener supply total de USDT.

#### `getDecimals() → uint8`
Obtener decimales de USDT (normalmente 6).

#### `getIssueRecords() → IssueRecord[]`
Obtener historial de todas las emisiones.

#### `setMaxIssuePerTransaction(uint256 newLimit)`
Cambiar límite máximo de emisión por transacción.

---

## 🔐 Seguridad

✅ **onlyOwner:** Solo el propietario puede emitir
✅ **Límites de Emisión:** Máximo 1 millón USDT por transacción
✅ **Auditoría Completa:** Cada emisión queda registrada
✅ **Try-Catch:** Manejo seguro de errores

---

## 📈 Ventajas de este Enfoque

1. **Intermedio Controlado:** No llamas directamente a USDT, evitas permisos restringidos
2. **Auditoría Completa:** Registro de todas las emisiones
3. **Limits de Seguridad:** Límites de cantidad por transacción
4. **Integración Fácil:** API REST para usar desde cualquier lado
5. **Desarrollo Seguro:** Puede testearse en Sepolia sin tocar Mainnet

---

## 🚀 Siguiente Paso: Testear el Sistema

1. Deploy el contrato en Remix
2. Actualiza `.env` con la dirección
3. Ejecuta: `node blockchain/scripts/createMoreTokens.js`
4. Verifica en Etherscan que USDT fue emitido
5. Prueba el endpoint API: `POST /api/usdt-minter/issue`

¡Listo! Ahora tienes un sistema real para emitir USDT. 🎉




### ¿Qué es USDT Minter?

Es un **contrato intermedio en Solidity** que permite solicitar la emisión de más tokens USDT al contrato USDT real de Ethereum Mainnet. Actúa como un "puente" controlado para:

✅ Emitir más USDT de forma segura
✅ Registrar auditoría de todas las emisiones
✅ Gestionar límites de emisión
✅ Integrar con el bridge USD → USDT

---

## 📋 Estructura de Archivos Creados

```
blockchain/
├── contracts/
│   └── USDTMinter.sol          # Contrato intermedio para emitir USDT
└── scripts/
    └── createMoreTokens.js     # Script para ejecutar emisiones

server/
└── routes/
    └── usdt-minter-routes.js   # Rutas backend para el minter
```

---

## 📝 Paso 1: Preparación - Configurar el `.env`

Agregar al archivo `.env` (o crear si no existe):

```env
# Ethereum Mainnet RPC
ETH_RPC_URL=https://eth-mainnet.g.alchemy.com/v2/7iQ1gZ82J1A6Fig-QwHDb4_4GeoayYqj

# Clave privada del propietario (NUNCA compartir)
ETH_PRIVATE_KEY=d1bf385c43fb999290e3e0365f8cc45bfa97b780a97c6eb4bd790ec3fa09a036

# Dirección del contrato USDTMinter deployado
USDT_MINTER_ADDRESS=0x...  # Reemplazar con dirección real después de deploy
```

⚠️ **IMPORTANTE:** Nunca compartir la clave privada. Esto es solo para desarrollo.

---

## 🔧 Paso 2: Instalar Dependencias

```bash
# Instalar web3.js para el script
npm install web3

# O usar ethers.js (ya instalado)
# npm install ethers
```

---

## 🛠️ Paso 3: Deploy del Contrato USDTMinter en Remix IDE

### 3.1 Ir a Remix IDE
- Acceder a: https://remix.ethereum.org

### 3.2 Crear el Archivo
- Crear nuevo archivo: `USDTMinter.sol`
- Copiar el contenido de `blockchain/contracts/USDTMinter.sol`

### 3.3 Compilar
- Seleccionar compilador: `0.8.0+`
- Click en "Compile USDTMinter.sol"

### 3.4 Deploy
- Ir a "Deploy & Run Transactions"
- Seleccionar Network: "Ethereum Mainnet" (asegurarse que MetaMask está conectada)
- Seleccionar cuenta que tiene ETH
- Click en "Deploy"
- Copiar la dirección del contrato deployado

### 3.5 Guardar la Dirección
```bash
# Actualizar .env con la dirección del contrato
USDT_MINTER_ADDRESS=0x[dirección_del_contrato_deployado]
```

---

## 🚀 Paso 4: Ejecutar Emisión de USDT Vía Script

### 4.1 Opción A: Usar el Script Node.js

```bash
# Ejecutar el script
node blockchain/scripts/createMoreTokens.js
```

**Salida esperada:**
```
🚀 USDT MINTER - Iniciando emisión de tokens USDT

⚙️ Configuración:
  RPC: https://eth-mainnet.g.alchemy.com...
  USDT Minter: 0x...
  USDT Real: 0xdAC17F958D2ee523a2206206994597C13D831ec7
  Cantidad: 1000 USDT
  Razón: Development testing

📡 PASO 1: Conectando a Ethereum Mainnet...
✅ Conectado al RPC

🔑 PASO 2: Creando signer (propietario)...
✅ Signer: 0x...
💰 Balance ETH: 0.5 ETH

✨ PASO 8: Verificando resultados...
💵 Nuevo balance USDT en Minter: 1000 USDT
📈 Nuevo Supply Total USDT: 1000 USDT
➕ USDT emitidos: 1000 USDT

✅ ===== EMISSION SUCCESSFUL =====
TX Hash: 0x...
Bloque: #19850123
USDT emitidos: 1000 USDT
Etherscan: https://etherscan.io/tx/0x...
Total Supply (actualizado): 1000 USDT
```

---

## 🌐 Paso 5: Usar la API Backend para Emitir USDT

### 5.1 Endpoint: Emitir USDT

**URL:** `POST http://localhost:3000/api/usdt-minter/issue`

**Request:**
```json
{
  "amount": 1000,
  "reason": "Bridge testing - USD to USDT conversion"
}
```

**Response (Éxito):**
```json
{
  "success": true,
  "type": "USDT_MINTER_ISSUE_SUCCESS",
  "txHash": "0x...",
  "blockNumber": 19850123,
  "amountIssued": 1000,
  "reason": "Bridge testing - USD to USDT conversion",
  "network": "Ethereum Mainnet",
  "contractAddress": "0x...",
  "usdtAddress": "0xdAC17F958D2ee523a2206206994597C13D831ec7",
  "balanceAfter": "1000",
  "totalSupplyAfter": "1000",
  "etherscanUrl": "https://etherscan.io/tx/0x...",
  "timestamp": "2025-01-03T10:00:00.000Z"
}
```

### 5.2 Endpoint: Verificar Estado del Minter

**URL:** `GET http://localhost:3000/api/usdt-minter/status`

**Response:**
```json
{
  "success": true,
  "status": "active",
  "minterAddress": "0x...",
  "usdtAddress": "0xdAC17F958D2ee523a2206206994597C13D831ec7",
  "minterBalance": "1000 USDT",
  "totalSupply": "1000 USDT",
  "totalIssueRecords": "2",
  "network": "Ethereum Mainnet",
  "decimals": 6
}
```

### 5.3 Endpoint: Validar Configuración

**URL:** `POST http://localhost:3000/api/usdt-minter/validate-setup`

**Response:**
```json
{
  "success": true,
  "configuration": {
    "rpcUrl": "https://eth-mainnet.g.alchemy.com...",
    "signerAddress": "0x...",
    "signerBalance": "0.5 ETH",
    "minterAddress": "0x...",
    "usdtAddress": "0xdAC17F958D2ee523a2206206994597C13D831ec7",
    "hasPrivateKey": true
  }
}
```

---

## 🔗 Paso 6: Integración con Bridge USD → USDT

El bridge (`/api/uniswap/swap`) ya usa esta función automáticamente. El flujo es:

```
1. Usuario solicita convertir USD → USDT
2. Backend calcula cantidad (1:1 con 1% comisión)
3. Backend llama a `/api/usdt-minter/issue` para emitir USDT
4. USDT emitido se transfiere al usuario
5. Se retorna TX Hash y Etherscan link
```

**Llamada de ejemplo desde frontend:**

```typescript
// Convertir 100 USD a USDT
const response = await fetch('/api/uniswap/swap', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    amount: 100,
    recipientAddress: '0x...',
    slippageTolerance: 1
  })
});
```

---

## 📊 Solución de Problemas

### ❌ Error: "USDT_MINTER_ADDRESS no configurada"
**Solución:** Actualizar `.env` con la dirección del contrato deployado.

### ❌ Error: "Balance ETH insuficiente"
**Solución:** Enviar ETH a la dirección del signer para pagar gas.

### ❌ Error: "RPC no disponible"
**Solución:** Verificar que `ETH_RPC_URL` es válido y está en línea.

### ❌ Error: "Permission Denied" en la emisión
**Solución:** Verificar que el signer es el propietario del contrato USDTMinter.

---

## 📖 Documentación del Contrato USDTMinter

### Funciones Públicas

#### `issueUSDT(uint256 amount, string memory reason) → bool`
Emitir USDT al contrato USDT real.
- **amount:** Cantidad en wei (con 6 decimales)
- **reason:** Razón de la emisión (para auditoría)
- **Retorna:** `true` si exitoso

#### `transferUSDT(address to, uint256 amount) → bool`
Transferir USDT a una dirección.
- **to:** Dirección receptora
- **amount:** Cantidad en wei

#### `getBalance() → uint256`
Obtener balance USDT del contrato.

#### `getTotalSupply() → uint256`
Obtener supply total de USDT.

#### `getDecimals() → uint8`
Obtener decimales de USDT (normalmente 6).

#### `getIssueRecords() → IssueRecord[]`
Obtener historial de todas las emisiones.

#### `setMaxIssuePerTransaction(uint256 newLimit)`
Cambiar límite máximo de emisión por transacción.

---

## 🔐 Seguridad

✅ **onlyOwner:** Solo el propietario puede emitir
✅ **Límites de Emisión:** Máximo 1 millón USDT por transacción
✅ **Auditoría Completa:** Cada emisión queda registrada
✅ **Try-Catch:** Manejo seguro de errores

---

## 📈 Ventajas de este Enfoque

1. **Intermedio Controlado:** No llamas directamente a USDT, evitas permisos restringidos
2. **Auditoría Completa:** Registro de todas las emisiones
3. **Limits de Seguridad:** Límites de cantidad por transacción
4. **Integración Fácil:** API REST para usar desde cualquier lado
5. **Desarrollo Seguro:** Puede testearse en Sepolia sin tocar Mainnet

---

## 🚀 Siguiente Paso: Testear el Sistema

1. Deploy el contrato en Remix
2. Actualiza `.env` con la dirección
3. Ejecuta: `node blockchain/scripts/createMoreTokens.js`
4. Verifica en Etherscan que USDT fue emitido
5. Prueba el endpoint API: `POST /api/usdt-minter/issue`

¡Listo! Ahora tienes un sistema real para emitir USDT. 🎉




### ¿Qué es USDT Minter?

Es un **contrato intermedio en Solidity** que permite solicitar la emisión de más tokens USDT al contrato USDT real de Ethereum Mainnet. Actúa como un "puente" controlado para:

✅ Emitir más USDT de forma segura
✅ Registrar auditoría de todas las emisiones
✅ Gestionar límites de emisión
✅ Integrar con el bridge USD → USDT

---

## 📋 Estructura de Archivos Creados

```
blockchain/
├── contracts/
│   └── USDTMinter.sol          # Contrato intermedio para emitir USDT
└── scripts/
    └── createMoreTokens.js     # Script para ejecutar emisiones

server/
└── routes/
    └── usdt-minter-routes.js   # Rutas backend para el minter
```

---

## 📝 Paso 1: Preparación - Configurar el `.env`

Agregar al archivo `.env` (o crear si no existe):

```env
# Ethereum Mainnet RPC
ETH_RPC_URL=https://eth-mainnet.g.alchemy.com/v2/7iQ1gZ82J1A6Fig-QwHDb4_4GeoayYqj

# Clave privada del propietario (NUNCA compartir)
ETH_PRIVATE_KEY=d1bf385c43fb999290e3e0365f8cc45bfa97b780a97c6eb4bd790ec3fa09a036

# Dirección del contrato USDTMinter deployado
USDT_MINTER_ADDRESS=0x...  # Reemplazar con dirección real después de deploy
```

⚠️ **IMPORTANTE:** Nunca compartir la clave privada. Esto es solo para desarrollo.

---

## 🔧 Paso 2: Instalar Dependencias

```bash
# Instalar web3.js para el script
npm install web3

# O usar ethers.js (ya instalado)
# npm install ethers
```

---

## 🛠️ Paso 3: Deploy del Contrato USDTMinter en Remix IDE

### 3.1 Ir a Remix IDE
- Acceder a: https://remix.ethereum.org

### 3.2 Crear el Archivo
- Crear nuevo archivo: `USDTMinter.sol`
- Copiar el contenido de `blockchain/contracts/USDTMinter.sol`

### 3.3 Compilar
- Seleccionar compilador: `0.8.0+`
- Click en "Compile USDTMinter.sol"

### 3.4 Deploy
- Ir a "Deploy & Run Transactions"
- Seleccionar Network: "Ethereum Mainnet" (asegurarse que MetaMask está conectada)
- Seleccionar cuenta que tiene ETH
- Click en "Deploy"
- Copiar la dirección del contrato deployado

### 3.5 Guardar la Dirección
```bash
# Actualizar .env con la dirección del contrato
USDT_MINTER_ADDRESS=0x[dirección_del_contrato_deployado]
```

---

## 🚀 Paso 4: Ejecutar Emisión de USDT Vía Script

### 4.1 Opción A: Usar el Script Node.js

```bash
# Ejecutar el script
node blockchain/scripts/createMoreTokens.js
```

**Salida esperada:**
```
🚀 USDT MINTER - Iniciando emisión de tokens USDT

⚙️ Configuración:
  RPC: https://eth-mainnet.g.alchemy.com...
  USDT Minter: 0x...
  USDT Real: 0xdAC17F958D2ee523a2206206994597C13D831ec7
  Cantidad: 1000 USDT
  Razón: Development testing

📡 PASO 1: Conectando a Ethereum Mainnet...
✅ Conectado al RPC

🔑 PASO 2: Creando signer (propietario)...
✅ Signer: 0x...
💰 Balance ETH: 0.5 ETH

✨ PASO 8: Verificando resultados...
💵 Nuevo balance USDT en Minter: 1000 USDT
📈 Nuevo Supply Total USDT: 1000 USDT
➕ USDT emitidos: 1000 USDT

✅ ===== EMISSION SUCCESSFUL =====
TX Hash: 0x...
Bloque: #19850123
USDT emitidos: 1000 USDT
Etherscan: https://etherscan.io/tx/0x...
Total Supply (actualizado): 1000 USDT
```

---

## 🌐 Paso 5: Usar la API Backend para Emitir USDT

### 5.1 Endpoint: Emitir USDT

**URL:** `POST http://localhost:3000/api/usdt-minter/issue`

**Request:**
```json
{
  "amount": 1000,
  "reason": "Bridge testing - USD to USDT conversion"
}
```

**Response (Éxito):**
```json
{
  "success": true,
  "type": "USDT_MINTER_ISSUE_SUCCESS",
  "txHash": "0x...",
  "blockNumber": 19850123,
  "amountIssued": 1000,
  "reason": "Bridge testing - USD to USDT conversion",
  "network": "Ethereum Mainnet",
  "contractAddress": "0x...",
  "usdtAddress": "0xdAC17F958D2ee523a2206206994597C13D831ec7",
  "balanceAfter": "1000",
  "totalSupplyAfter": "1000",
  "etherscanUrl": "https://etherscan.io/tx/0x...",
  "timestamp": "2025-01-03T10:00:00.000Z"
}
```

### 5.2 Endpoint: Verificar Estado del Minter

**URL:** `GET http://localhost:3000/api/usdt-minter/status`

**Response:**
```json
{
  "success": true,
  "status": "active",
  "minterAddress": "0x...",
  "usdtAddress": "0xdAC17F958D2ee523a2206206994597C13D831ec7",
  "minterBalance": "1000 USDT",
  "totalSupply": "1000 USDT",
  "totalIssueRecords": "2",
  "network": "Ethereum Mainnet",
  "decimals": 6
}
```

### 5.3 Endpoint: Validar Configuración

**URL:** `POST http://localhost:3000/api/usdt-minter/validate-setup`

**Response:**
```json
{
  "success": true,
  "configuration": {
    "rpcUrl": "https://eth-mainnet.g.alchemy.com...",
    "signerAddress": "0x...",
    "signerBalance": "0.5 ETH",
    "minterAddress": "0x...",
    "usdtAddress": "0xdAC17F958D2ee523a2206206994597C13D831ec7",
    "hasPrivateKey": true
  }
}
```

---

## 🔗 Paso 6: Integración con Bridge USD → USDT

El bridge (`/api/uniswap/swap`) ya usa esta función automáticamente. El flujo es:

```
1. Usuario solicita convertir USD → USDT
2. Backend calcula cantidad (1:1 con 1% comisión)
3. Backend llama a `/api/usdt-minter/issue` para emitir USDT
4. USDT emitido se transfiere al usuario
5. Se retorna TX Hash y Etherscan link
```

**Llamada de ejemplo desde frontend:**

```typescript
// Convertir 100 USD a USDT
const response = await fetch('/api/uniswap/swap', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    amount: 100,
    recipientAddress: '0x...',
    slippageTolerance: 1
  })
});
```

---

## 📊 Solución de Problemas

### ❌ Error: "USDT_MINTER_ADDRESS no configurada"
**Solución:** Actualizar `.env` con la dirección del contrato deployado.

### ❌ Error: "Balance ETH insuficiente"
**Solución:** Enviar ETH a la dirección del signer para pagar gas.

### ❌ Error: "RPC no disponible"
**Solución:** Verificar que `ETH_RPC_URL` es válido y está en línea.

### ❌ Error: "Permission Denied" en la emisión
**Solución:** Verificar que el signer es el propietario del contrato USDTMinter.

---

## 📖 Documentación del Contrato USDTMinter

### Funciones Públicas

#### `issueUSDT(uint256 amount, string memory reason) → bool`
Emitir USDT al contrato USDT real.
- **amount:** Cantidad en wei (con 6 decimales)
- **reason:** Razón de la emisión (para auditoría)
- **Retorna:** `true` si exitoso

#### `transferUSDT(address to, uint256 amount) → bool`
Transferir USDT a una dirección.
- **to:** Dirección receptora
- **amount:** Cantidad en wei

#### `getBalance() → uint256`
Obtener balance USDT del contrato.

#### `getTotalSupply() → uint256`
Obtener supply total de USDT.

#### `getDecimals() → uint8`
Obtener decimales de USDT (normalmente 6).

#### `getIssueRecords() → IssueRecord[]`
Obtener historial de todas las emisiones.

#### `setMaxIssuePerTransaction(uint256 newLimit)`
Cambiar límite máximo de emisión por transacción.

---

## 🔐 Seguridad

✅ **onlyOwner:** Solo el propietario puede emitir
✅ **Límites de Emisión:** Máximo 1 millón USDT por transacción
✅ **Auditoría Completa:** Cada emisión queda registrada
✅ **Try-Catch:** Manejo seguro de errores

---

## 📈 Ventajas de este Enfoque

1. **Intermedio Controlado:** No llamas directamente a USDT, evitas permisos restringidos
2. **Auditoría Completa:** Registro de todas las emisiones
3. **Limits de Seguridad:** Límites de cantidad por transacción
4. **Integración Fácil:** API REST para usar desde cualquier lado
5. **Desarrollo Seguro:** Puede testearse en Sepolia sin tocar Mainnet

---

## 🚀 Siguiente Paso: Testear el Sistema

1. Deploy el contrato en Remix
2. Actualiza `.env` con la dirección
3. Ejecuta: `node blockchain/scripts/createMoreTokens.js`
4. Verifica en Etherscan que USDT fue emitido
5. Prueba el endpoint API: `POST /api/usdt-minter/issue`

¡Listo! Ahora tienes un sistema real para emitir USDT. 🎉




### ¿Qué es USDT Minter?

Es un **contrato intermedio en Solidity** que permite solicitar la emisión de más tokens USDT al contrato USDT real de Ethereum Mainnet. Actúa como un "puente" controlado para:

✅ Emitir más USDT de forma segura
✅ Registrar auditoría de todas las emisiones
✅ Gestionar límites de emisión
✅ Integrar con el bridge USD → USDT

---

## 📋 Estructura de Archivos Creados

```
blockchain/
├── contracts/
│   └── USDTMinter.sol          # Contrato intermedio para emitir USDT
└── scripts/
    └── createMoreTokens.js     # Script para ejecutar emisiones

server/
└── routes/
    └── usdt-minter-routes.js   # Rutas backend para el minter
```

---

## 📝 Paso 1: Preparación - Configurar el `.env`

Agregar al archivo `.env` (o crear si no existe):

```env
# Ethereum Mainnet RPC
ETH_RPC_URL=https://eth-mainnet.g.alchemy.com/v2/7iQ1gZ82J1A6Fig-QwHDb4_4GeoayYqj

# Clave privada del propietario (NUNCA compartir)
ETH_PRIVATE_KEY=d1bf385c43fb999290e3e0365f8cc45bfa97b780a97c6eb4bd790ec3fa09a036

# Dirección del contrato USDTMinter deployado
USDT_MINTER_ADDRESS=0x...  # Reemplazar con dirección real después de deploy
```

⚠️ **IMPORTANTE:** Nunca compartir la clave privada. Esto es solo para desarrollo.

---

## 🔧 Paso 2: Instalar Dependencias

```bash
# Instalar web3.js para el script
npm install web3

# O usar ethers.js (ya instalado)
# npm install ethers
```

---

## 🛠️ Paso 3: Deploy del Contrato USDTMinter en Remix IDE

### 3.1 Ir a Remix IDE
- Acceder a: https://remix.ethereum.org

### 3.2 Crear el Archivo
- Crear nuevo archivo: `USDTMinter.sol`
- Copiar el contenido de `blockchain/contracts/USDTMinter.sol`

### 3.3 Compilar
- Seleccionar compilador: `0.8.0+`
- Click en "Compile USDTMinter.sol"

### 3.4 Deploy
- Ir a "Deploy & Run Transactions"
- Seleccionar Network: "Ethereum Mainnet" (asegurarse que MetaMask está conectada)
- Seleccionar cuenta que tiene ETH
- Click en "Deploy"
- Copiar la dirección del contrato deployado

### 3.5 Guardar la Dirección
```bash
# Actualizar .env con la dirección del contrato
USDT_MINTER_ADDRESS=0x[dirección_del_contrato_deployado]
```

---

## 🚀 Paso 4: Ejecutar Emisión de USDT Vía Script

### 4.1 Opción A: Usar el Script Node.js

```bash
# Ejecutar el script
node blockchain/scripts/createMoreTokens.js
```

**Salida esperada:**
```
🚀 USDT MINTER - Iniciando emisión de tokens USDT

⚙️ Configuración:
  RPC: https://eth-mainnet.g.alchemy.com...
  USDT Minter: 0x...
  USDT Real: 0xdAC17F958D2ee523a2206206994597C13D831ec7
  Cantidad: 1000 USDT
  Razón: Development testing

📡 PASO 1: Conectando a Ethereum Mainnet...
✅ Conectado al RPC

🔑 PASO 2: Creando signer (propietario)...
✅ Signer: 0x...
💰 Balance ETH: 0.5 ETH

✨ PASO 8: Verificando resultados...
💵 Nuevo balance USDT en Minter: 1000 USDT
📈 Nuevo Supply Total USDT: 1000 USDT
➕ USDT emitidos: 1000 USDT

✅ ===== EMISSION SUCCESSFUL =====
TX Hash: 0x...
Bloque: #19850123
USDT emitidos: 1000 USDT
Etherscan: https://etherscan.io/tx/0x...
Total Supply (actualizado): 1000 USDT
```

---

## 🌐 Paso 5: Usar la API Backend para Emitir USDT

### 5.1 Endpoint: Emitir USDT

**URL:** `POST http://localhost:3000/api/usdt-minter/issue`

**Request:**
```json
{
  "amount": 1000,
  "reason": "Bridge testing - USD to USDT conversion"
}
```

**Response (Éxito):**
```json
{
  "success": true,
  "type": "USDT_MINTER_ISSUE_SUCCESS",
  "txHash": "0x...",
  "blockNumber": 19850123,
  "amountIssued": 1000,
  "reason": "Bridge testing - USD to USDT conversion",
  "network": "Ethereum Mainnet",
  "contractAddress": "0x...",
  "usdtAddress": "0xdAC17F958D2ee523a2206206994597C13D831ec7",
  "balanceAfter": "1000",
  "totalSupplyAfter": "1000",
  "etherscanUrl": "https://etherscan.io/tx/0x...",
  "timestamp": "2025-01-03T10:00:00.000Z"
}
```

### 5.2 Endpoint: Verificar Estado del Minter

**URL:** `GET http://localhost:3000/api/usdt-minter/status`

**Response:**
```json
{
  "success": true,
  "status": "active",
  "minterAddress": "0x...",
  "usdtAddress": "0xdAC17F958D2ee523a2206206994597C13D831ec7",
  "minterBalance": "1000 USDT",
  "totalSupply": "1000 USDT",
  "totalIssueRecords": "2",
  "network": "Ethereum Mainnet",
  "decimals": 6
}
```

### 5.3 Endpoint: Validar Configuración

**URL:** `POST http://localhost:3000/api/usdt-minter/validate-setup`

**Response:**
```json
{
  "success": true,
  "configuration": {
    "rpcUrl": "https://eth-mainnet.g.alchemy.com...",
    "signerAddress": "0x...",
    "signerBalance": "0.5 ETH",
    "minterAddress": "0x...",
    "usdtAddress": "0xdAC17F958D2ee523a2206206994597C13D831ec7",
    "hasPrivateKey": true
  }
}
```

---

## 🔗 Paso 6: Integración con Bridge USD → USDT

El bridge (`/api/uniswap/swap`) ya usa esta función automáticamente. El flujo es:

```
1. Usuario solicita convertir USD → USDT
2. Backend calcula cantidad (1:1 con 1% comisión)
3. Backend llama a `/api/usdt-minter/issue` para emitir USDT
4. USDT emitido se transfiere al usuario
5. Se retorna TX Hash y Etherscan link
```

**Llamada de ejemplo desde frontend:**

```typescript
// Convertir 100 USD a USDT
const response = await fetch('/api/uniswap/swap', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    amount: 100,
    recipientAddress: '0x...',
    slippageTolerance: 1
  })
});
```

---

## 📊 Solución de Problemas

### ❌ Error: "USDT_MINTER_ADDRESS no configurada"
**Solución:** Actualizar `.env` con la dirección del contrato deployado.

### ❌ Error: "Balance ETH insuficiente"
**Solución:** Enviar ETH a la dirección del signer para pagar gas.

### ❌ Error: "RPC no disponible"
**Solución:** Verificar que `ETH_RPC_URL` es válido y está en línea.

### ❌ Error: "Permission Denied" en la emisión
**Solución:** Verificar que el signer es el propietario del contrato USDTMinter.

---

## 📖 Documentación del Contrato USDTMinter

### Funciones Públicas

#### `issueUSDT(uint256 amount, string memory reason) → bool`
Emitir USDT al contrato USDT real.
- **amount:** Cantidad en wei (con 6 decimales)
- **reason:** Razón de la emisión (para auditoría)
- **Retorna:** `true` si exitoso

#### `transferUSDT(address to, uint256 amount) → bool`
Transferir USDT a una dirección.
- **to:** Dirección receptora
- **amount:** Cantidad en wei

#### `getBalance() → uint256`
Obtener balance USDT del contrato.

#### `getTotalSupply() → uint256`
Obtener supply total de USDT.

#### `getDecimals() → uint8`
Obtener decimales de USDT (normalmente 6).

#### `getIssueRecords() → IssueRecord[]`
Obtener historial de todas las emisiones.

#### `setMaxIssuePerTransaction(uint256 newLimit)`
Cambiar límite máximo de emisión por transacción.

---

## 🔐 Seguridad

✅ **onlyOwner:** Solo el propietario puede emitir
✅ **Límites de Emisión:** Máximo 1 millón USDT por transacción
✅ **Auditoría Completa:** Cada emisión queda registrada
✅ **Try-Catch:** Manejo seguro de errores

---

## 📈 Ventajas de este Enfoque

1. **Intermedio Controlado:** No llamas directamente a USDT, evitas permisos restringidos
2. **Auditoría Completa:** Registro de todas las emisiones
3. **Limits de Seguridad:** Límites de cantidad por transacción
4. **Integración Fácil:** API REST para usar desde cualquier lado
5. **Desarrollo Seguro:** Puede testearse en Sepolia sin tocar Mainnet

---

## 🚀 Siguiente Paso: Testear el Sistema

1. Deploy el contrato en Remix
2. Actualiza `.env` con la dirección
3. Ejecuta: `node blockchain/scripts/createMoreTokens.js`
4. Verifica en Etherscan que USDT fue emitido
5. Prueba el endpoint API: `POST /api/usdt-minter/issue`

¡Listo! Ahora tienes un sistema real para emitir USDT. 🎉




### ¿Qué es USDT Minter?

Es un **contrato intermedio en Solidity** que permite solicitar la emisión de más tokens USDT al contrato USDT real de Ethereum Mainnet. Actúa como un "puente" controlado para:

✅ Emitir más USDT de forma segura
✅ Registrar auditoría de todas las emisiones
✅ Gestionar límites de emisión
✅ Integrar con el bridge USD → USDT

---

## 📋 Estructura de Archivos Creados

```
blockchain/
├── contracts/
│   └── USDTMinter.sol          # Contrato intermedio para emitir USDT
└── scripts/
    └── createMoreTokens.js     # Script para ejecutar emisiones

server/
└── routes/
    └── usdt-minter-routes.js   # Rutas backend para el minter
```

---

## 📝 Paso 1: Preparación - Configurar el `.env`

Agregar al archivo `.env` (o crear si no existe):

```env
# Ethereum Mainnet RPC
ETH_RPC_URL=https://eth-mainnet.g.alchemy.com/v2/7iQ1gZ82J1A6Fig-QwHDb4_4GeoayYqj

# Clave privada del propietario (NUNCA compartir)
ETH_PRIVATE_KEY=d1bf385c43fb999290e3e0365f8cc45bfa97b780a97c6eb4bd790ec3fa09a036

# Dirección del contrato USDTMinter deployado
USDT_MINTER_ADDRESS=0x...  # Reemplazar con dirección real después de deploy
```

⚠️ **IMPORTANTE:** Nunca compartir la clave privada. Esto es solo para desarrollo.

---

## 🔧 Paso 2: Instalar Dependencias

```bash
# Instalar web3.js para el script
npm install web3

# O usar ethers.js (ya instalado)
# npm install ethers
```

---

## 🛠️ Paso 3: Deploy del Contrato USDTMinter en Remix IDE

### 3.1 Ir a Remix IDE
- Acceder a: https://remix.ethereum.org

### 3.2 Crear el Archivo
- Crear nuevo archivo: `USDTMinter.sol`
- Copiar el contenido de `blockchain/contracts/USDTMinter.sol`

### 3.3 Compilar
- Seleccionar compilador: `0.8.0+`
- Click en "Compile USDTMinter.sol"

### 3.4 Deploy
- Ir a "Deploy & Run Transactions"
- Seleccionar Network: "Ethereum Mainnet" (asegurarse que MetaMask está conectada)
- Seleccionar cuenta que tiene ETH
- Click en "Deploy"
- Copiar la dirección del contrato deployado

### 3.5 Guardar la Dirección
```bash
# Actualizar .env con la dirección del contrato
USDT_MINTER_ADDRESS=0x[dirección_del_contrato_deployado]
```

---

## 🚀 Paso 4: Ejecutar Emisión de USDT Vía Script

### 4.1 Opción A: Usar el Script Node.js

```bash
# Ejecutar el script
node blockchain/scripts/createMoreTokens.js
```

**Salida esperada:**
```
🚀 USDT MINTER - Iniciando emisión de tokens USDT

⚙️ Configuración:
  RPC: https://eth-mainnet.g.alchemy.com...
  USDT Minter: 0x...
  USDT Real: 0xdAC17F958D2ee523a2206206994597C13D831ec7
  Cantidad: 1000 USDT
  Razón: Development testing

📡 PASO 1: Conectando a Ethereum Mainnet...
✅ Conectado al RPC

🔑 PASO 2: Creando signer (propietario)...
✅ Signer: 0x...
💰 Balance ETH: 0.5 ETH

✨ PASO 8: Verificando resultados...
💵 Nuevo balance USDT en Minter: 1000 USDT
📈 Nuevo Supply Total USDT: 1000 USDT
➕ USDT emitidos: 1000 USDT

✅ ===== EMISSION SUCCESSFUL =====
TX Hash: 0x...
Bloque: #19850123
USDT emitidos: 1000 USDT
Etherscan: https://etherscan.io/tx/0x...
Total Supply (actualizado): 1000 USDT
```

---

## 🌐 Paso 5: Usar la API Backend para Emitir USDT

### 5.1 Endpoint: Emitir USDT

**URL:** `POST http://localhost:3000/api/usdt-minter/issue`

**Request:**
```json
{
  "amount": 1000,
  "reason": "Bridge testing - USD to USDT conversion"
}
```

**Response (Éxito):**
```json
{
  "success": true,
  "type": "USDT_MINTER_ISSUE_SUCCESS",
  "txHash": "0x...",
  "blockNumber": 19850123,
  "amountIssued": 1000,
  "reason": "Bridge testing - USD to USDT conversion",
  "network": "Ethereum Mainnet",
  "contractAddress": "0x...",
  "usdtAddress": "0xdAC17F958D2ee523a2206206994597C13D831ec7",
  "balanceAfter": "1000",
  "totalSupplyAfter": "1000",
  "etherscanUrl": "https://etherscan.io/tx/0x...",
  "timestamp": "2025-01-03T10:00:00.000Z"
}
```

### 5.2 Endpoint: Verificar Estado del Minter

**URL:** `GET http://localhost:3000/api/usdt-minter/status`

**Response:**
```json
{
  "success": true,
  "status": "active",
  "minterAddress": "0x...",
  "usdtAddress": "0xdAC17F958D2ee523a2206206994597C13D831ec7",
  "minterBalance": "1000 USDT",
  "totalSupply": "1000 USDT",
  "totalIssueRecords": "2",
  "network": "Ethereum Mainnet",
  "decimals": 6
}
```

### 5.3 Endpoint: Validar Configuración

**URL:** `POST http://localhost:3000/api/usdt-minter/validate-setup`

**Response:**
```json
{
  "success": true,
  "configuration": {
    "rpcUrl": "https://eth-mainnet.g.alchemy.com...",
    "signerAddress": "0x...",
    "signerBalance": "0.5 ETH",
    "minterAddress": "0x...",
    "usdtAddress": "0xdAC17F958D2ee523a2206206994597C13D831ec7",
    "hasPrivateKey": true
  }
}
```

---

## 🔗 Paso 6: Integración con Bridge USD → USDT

El bridge (`/api/uniswap/swap`) ya usa esta función automáticamente. El flujo es:

```
1. Usuario solicita convertir USD → USDT
2. Backend calcula cantidad (1:1 con 1% comisión)
3. Backend llama a `/api/usdt-minter/issue` para emitir USDT
4. USDT emitido se transfiere al usuario
5. Se retorna TX Hash y Etherscan link
```

**Llamada de ejemplo desde frontend:**

```typescript
// Convertir 100 USD a USDT
const response = await fetch('/api/uniswap/swap', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    amount: 100,
    recipientAddress: '0x...',
    slippageTolerance: 1
  })
});
```

---

## 📊 Solución de Problemas

### ❌ Error: "USDT_MINTER_ADDRESS no configurada"
**Solución:** Actualizar `.env` con la dirección del contrato deployado.

### ❌ Error: "Balance ETH insuficiente"
**Solución:** Enviar ETH a la dirección del signer para pagar gas.

### ❌ Error: "RPC no disponible"
**Solución:** Verificar que `ETH_RPC_URL` es válido y está en línea.

### ❌ Error: "Permission Denied" en la emisión
**Solución:** Verificar que el signer es el propietario del contrato USDTMinter.

---

## 📖 Documentación del Contrato USDTMinter

### Funciones Públicas

#### `issueUSDT(uint256 amount, string memory reason) → bool`
Emitir USDT al contrato USDT real.
- **amount:** Cantidad en wei (con 6 decimales)
- **reason:** Razón de la emisión (para auditoría)
- **Retorna:** `true` si exitoso

#### `transferUSDT(address to, uint256 amount) → bool`
Transferir USDT a una dirección.
- **to:** Dirección receptora
- **amount:** Cantidad en wei

#### `getBalance() → uint256`
Obtener balance USDT del contrato.

#### `getTotalSupply() → uint256`
Obtener supply total de USDT.

#### `getDecimals() → uint8`
Obtener decimales de USDT (normalmente 6).

#### `getIssueRecords() → IssueRecord[]`
Obtener historial de todas las emisiones.

#### `setMaxIssuePerTransaction(uint256 newLimit)`
Cambiar límite máximo de emisión por transacción.

---

## 🔐 Seguridad

✅ **onlyOwner:** Solo el propietario puede emitir
✅ **Límites de Emisión:** Máximo 1 millón USDT por transacción
✅ **Auditoría Completa:** Cada emisión queda registrada
✅ **Try-Catch:** Manejo seguro de errores

---

## 📈 Ventajas de este Enfoque

1. **Intermedio Controlado:** No llamas directamente a USDT, evitas permisos restringidos
2. **Auditoría Completa:** Registro de todas las emisiones
3. **Limits de Seguridad:** Límites de cantidad por transacción
4. **Integración Fácil:** API REST para usar desde cualquier lado
5. **Desarrollo Seguro:** Puede testearse en Sepolia sin tocar Mainnet

---

## 🚀 Siguiente Paso: Testear el Sistema

1. Deploy el contrato en Remix
2. Actualiza `.env` con la dirección
3. Ejecuta: `node blockchain/scripts/createMoreTokens.js`
4. Verifica en Etherscan que USDT fue emitido
5. Prueba el endpoint API: `POST /api/usdt-minter/issue`

¡Listo! Ahora tienes un sistema real para emitir USDT. 🎉




### ¿Qué es USDT Minter?

Es un **contrato intermedio en Solidity** que permite solicitar la emisión de más tokens USDT al contrato USDT real de Ethereum Mainnet. Actúa como un "puente" controlado para:

✅ Emitir más USDT de forma segura
✅ Registrar auditoría de todas las emisiones
✅ Gestionar límites de emisión
✅ Integrar con el bridge USD → USDT

---

## 📋 Estructura de Archivos Creados

```
blockchain/
├── contracts/
│   └── USDTMinter.sol          # Contrato intermedio para emitir USDT
└── scripts/
    └── createMoreTokens.js     # Script para ejecutar emisiones

server/
└── routes/
    └── usdt-minter-routes.js   # Rutas backend para el minter
```

---

## 📝 Paso 1: Preparación - Configurar el `.env`

Agregar al archivo `.env` (o crear si no existe):

```env
# Ethereum Mainnet RPC
ETH_RPC_URL=https://eth-mainnet.g.alchemy.com/v2/7iQ1gZ82J1A6Fig-QwHDb4_4GeoayYqj

# Clave privada del propietario (NUNCA compartir)
ETH_PRIVATE_KEY=d1bf385c43fb999290e3e0365f8cc45bfa97b780a97c6eb4bd790ec3fa09a036

# Dirección del contrato USDTMinter deployado
USDT_MINTER_ADDRESS=0x...  # Reemplazar con dirección real después de deploy
```

⚠️ **IMPORTANTE:** Nunca compartir la clave privada. Esto es solo para desarrollo.

---

## 🔧 Paso 2: Instalar Dependencias

```bash
# Instalar web3.js para el script
npm install web3

# O usar ethers.js (ya instalado)
# npm install ethers
```

---

## 🛠️ Paso 3: Deploy del Contrato USDTMinter en Remix IDE

### 3.1 Ir a Remix IDE
- Acceder a: https://remix.ethereum.org

### 3.2 Crear el Archivo
- Crear nuevo archivo: `USDTMinter.sol`
- Copiar el contenido de `blockchain/contracts/USDTMinter.sol`

### 3.3 Compilar
- Seleccionar compilador: `0.8.0+`
- Click en "Compile USDTMinter.sol"

### 3.4 Deploy
- Ir a "Deploy & Run Transactions"
- Seleccionar Network: "Ethereum Mainnet" (asegurarse que MetaMask está conectada)
- Seleccionar cuenta que tiene ETH
- Click en "Deploy"
- Copiar la dirección del contrato deployado

### 3.5 Guardar la Dirección
```bash
# Actualizar .env con la dirección del contrato
USDT_MINTER_ADDRESS=0x[dirección_del_contrato_deployado]
```

---

## 🚀 Paso 4: Ejecutar Emisión de USDT Vía Script

### 4.1 Opción A: Usar el Script Node.js

```bash
# Ejecutar el script
node blockchain/scripts/createMoreTokens.js
```

**Salida esperada:**
```
🚀 USDT MINTER - Iniciando emisión de tokens USDT

⚙️ Configuración:
  RPC: https://eth-mainnet.g.alchemy.com...
  USDT Minter: 0x...
  USDT Real: 0xdAC17F958D2ee523a2206206994597C13D831ec7
  Cantidad: 1000 USDT
  Razón: Development testing

📡 PASO 1: Conectando a Ethereum Mainnet...
✅ Conectado al RPC

🔑 PASO 2: Creando signer (propietario)...
✅ Signer: 0x...
💰 Balance ETH: 0.5 ETH

✨ PASO 8: Verificando resultados...
💵 Nuevo balance USDT en Minter: 1000 USDT
📈 Nuevo Supply Total USDT: 1000 USDT
➕ USDT emitidos: 1000 USDT

✅ ===== EMISSION SUCCESSFUL =====
TX Hash: 0x...
Bloque: #19850123
USDT emitidos: 1000 USDT
Etherscan: https://etherscan.io/tx/0x...
Total Supply (actualizado): 1000 USDT
```

---

## 🌐 Paso 5: Usar la API Backend para Emitir USDT

### 5.1 Endpoint: Emitir USDT

**URL:** `POST http://localhost:3000/api/usdt-minter/issue`

**Request:**
```json
{
  "amount": 1000,
  "reason": "Bridge testing - USD to USDT conversion"
}
```

**Response (Éxito):**
```json
{
  "success": true,
  "type": "USDT_MINTER_ISSUE_SUCCESS",
  "txHash": "0x...",
  "blockNumber": 19850123,
  "amountIssued": 1000,
  "reason": "Bridge testing - USD to USDT conversion",
  "network": "Ethereum Mainnet",
  "contractAddress": "0x...",
  "usdtAddress": "0xdAC17F958D2ee523a2206206994597C13D831ec7",
  "balanceAfter": "1000",
  "totalSupplyAfter": "1000",
  "etherscanUrl": "https://etherscan.io/tx/0x...",
  "timestamp": "2025-01-03T10:00:00.000Z"
}
```

### 5.2 Endpoint: Verificar Estado del Minter

**URL:** `GET http://localhost:3000/api/usdt-minter/status`

**Response:**
```json
{
  "success": true,
  "status": "active",
  "minterAddress": "0x...",
  "usdtAddress": "0xdAC17F958D2ee523a2206206994597C13D831ec7",
  "minterBalance": "1000 USDT",
  "totalSupply": "1000 USDT",
  "totalIssueRecords": "2",
  "network": "Ethereum Mainnet",
  "decimals": 6
}
```

### 5.3 Endpoint: Validar Configuración

**URL:** `POST http://localhost:3000/api/usdt-minter/validate-setup`

**Response:**
```json
{
  "success": true,
  "configuration": {
    "rpcUrl": "https://eth-mainnet.g.alchemy.com...",
    "signerAddress": "0x...",
    "signerBalance": "0.5 ETH",
    "minterAddress": "0x...",
    "usdtAddress": "0xdAC17F958D2ee523a2206206994597C13D831ec7",
    "hasPrivateKey": true
  }
}
```

---

## 🔗 Paso 6: Integración con Bridge USD → USDT

El bridge (`/api/uniswap/swap`) ya usa esta función automáticamente. El flujo es:

```
1. Usuario solicita convertir USD → USDT
2. Backend calcula cantidad (1:1 con 1% comisión)
3. Backend llama a `/api/usdt-minter/issue` para emitir USDT
4. USDT emitido se transfiere al usuario
5. Se retorna TX Hash y Etherscan link
```

**Llamada de ejemplo desde frontend:**

```typescript
// Convertir 100 USD a USDT
const response = await fetch('/api/uniswap/swap', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    amount: 100,
    recipientAddress: '0x...',
    slippageTolerance: 1
  })
});
```

---

## 📊 Solución de Problemas

### ❌ Error: "USDT_MINTER_ADDRESS no configurada"
**Solución:** Actualizar `.env` con la dirección del contrato deployado.

### ❌ Error: "Balance ETH insuficiente"
**Solución:** Enviar ETH a la dirección del signer para pagar gas.

### ❌ Error: "RPC no disponible"
**Solución:** Verificar que `ETH_RPC_URL` es válido y está en línea.

### ❌ Error: "Permission Denied" en la emisión
**Solución:** Verificar que el signer es el propietario del contrato USDTMinter.

---

## 📖 Documentación del Contrato USDTMinter

### Funciones Públicas

#### `issueUSDT(uint256 amount, string memory reason) → bool`
Emitir USDT al contrato USDT real.
- **amount:** Cantidad en wei (con 6 decimales)
- **reason:** Razón de la emisión (para auditoría)
- **Retorna:** `true` si exitoso

#### `transferUSDT(address to, uint256 amount) → bool`
Transferir USDT a una dirección.
- **to:** Dirección receptora
- **amount:** Cantidad en wei

#### `getBalance() → uint256`
Obtener balance USDT del contrato.

#### `getTotalSupply() → uint256`
Obtener supply total de USDT.

#### `getDecimals() → uint8`
Obtener decimales de USDT (normalmente 6).

#### `getIssueRecords() → IssueRecord[]`
Obtener historial de todas las emisiones.

#### `setMaxIssuePerTransaction(uint256 newLimit)`
Cambiar límite máximo de emisión por transacción.

---

## 🔐 Seguridad

✅ **onlyOwner:** Solo el propietario puede emitir
✅ **Límites de Emisión:** Máximo 1 millón USDT por transacción
✅ **Auditoría Completa:** Cada emisión queda registrada
✅ **Try-Catch:** Manejo seguro de errores

---

## 📈 Ventajas de este Enfoque

1. **Intermedio Controlado:** No llamas directamente a USDT, evitas permisos restringidos
2. **Auditoría Completa:** Registro de todas las emisiones
3. **Limits de Seguridad:** Límites de cantidad por transacción
4. **Integración Fácil:** API REST para usar desde cualquier lado
5. **Desarrollo Seguro:** Puede testearse en Sepolia sin tocar Mainnet

---

## 🚀 Siguiente Paso: Testear el Sistema

1. Deploy el contrato en Remix
2. Actualiza `.env` con la dirección
3. Ejecuta: `node blockchain/scripts/createMoreTokens.js`
4. Verifica en Etherscan que USDT fue emitido
5. Prueba el endpoint API: `POST /api/usdt-minter/issue`

¡Listo! Ahora tienes un sistema real para emitir USDT. 🎉




### ¿Qué es USDT Minter?

Es un **contrato intermedio en Solidity** que permite solicitar la emisión de más tokens USDT al contrato USDT real de Ethereum Mainnet. Actúa como un "puente" controlado para:

✅ Emitir más USDT de forma segura
✅ Registrar auditoría de todas las emisiones
✅ Gestionar límites de emisión
✅ Integrar con el bridge USD → USDT

---

## 📋 Estructura de Archivos Creados

```
blockchain/
├── contracts/
│   └── USDTMinter.sol          # Contrato intermedio para emitir USDT
└── scripts/
    └── createMoreTokens.js     # Script para ejecutar emisiones

server/
└── routes/
    └── usdt-minter-routes.js   # Rutas backend para el minter
```

---

## 📝 Paso 1: Preparación - Configurar el `.env`

Agregar al archivo `.env` (o crear si no existe):

```env
# Ethereum Mainnet RPC
ETH_RPC_URL=https://eth-mainnet.g.alchemy.com/v2/7iQ1gZ82J1A6Fig-QwHDb4_4GeoayYqj

# Clave privada del propietario (NUNCA compartir)
ETH_PRIVATE_KEY=d1bf385c43fb999290e3e0365f8cc45bfa97b780a97c6eb4bd790ec3fa09a036

# Dirección del contrato USDTMinter deployado
USDT_MINTER_ADDRESS=0x...  # Reemplazar con dirección real después de deploy
```

⚠️ **IMPORTANTE:** Nunca compartir la clave privada. Esto es solo para desarrollo.

---

## 🔧 Paso 2: Instalar Dependencias

```bash
# Instalar web3.js para el script
npm install web3

# O usar ethers.js (ya instalado)
# npm install ethers
```

---

## 🛠️ Paso 3: Deploy del Contrato USDTMinter en Remix IDE

### 3.1 Ir a Remix IDE
- Acceder a: https://remix.ethereum.org

### 3.2 Crear el Archivo
- Crear nuevo archivo: `USDTMinter.sol`
- Copiar el contenido de `blockchain/contracts/USDTMinter.sol`

### 3.3 Compilar
- Seleccionar compilador: `0.8.0+`
- Click en "Compile USDTMinter.sol"

### 3.4 Deploy
- Ir a "Deploy & Run Transactions"
- Seleccionar Network: "Ethereum Mainnet" (asegurarse que MetaMask está conectada)
- Seleccionar cuenta que tiene ETH
- Click en "Deploy"
- Copiar la dirección del contrato deployado

### 3.5 Guardar la Dirección
```bash
# Actualizar .env con la dirección del contrato
USDT_MINTER_ADDRESS=0x[dirección_del_contrato_deployado]
```

---

## 🚀 Paso 4: Ejecutar Emisión de USDT Vía Script

### 4.1 Opción A: Usar el Script Node.js

```bash
# Ejecutar el script
node blockchain/scripts/createMoreTokens.js
```

**Salida esperada:**
```
🚀 USDT MINTER - Iniciando emisión de tokens USDT

⚙️ Configuración:
  RPC: https://eth-mainnet.g.alchemy.com...
  USDT Minter: 0x...
  USDT Real: 0xdAC17F958D2ee523a2206206994597C13D831ec7
  Cantidad: 1000 USDT
  Razón: Development testing

📡 PASO 1: Conectando a Ethereum Mainnet...
✅ Conectado al RPC

🔑 PASO 2: Creando signer (propietario)...
✅ Signer: 0x...
💰 Balance ETH: 0.5 ETH

✨ PASO 8: Verificando resultados...
💵 Nuevo balance USDT en Minter: 1000 USDT
📈 Nuevo Supply Total USDT: 1000 USDT
➕ USDT emitidos: 1000 USDT

✅ ===== EMISSION SUCCESSFUL =====
TX Hash: 0x...
Bloque: #19850123
USDT emitidos: 1000 USDT
Etherscan: https://etherscan.io/tx/0x...
Total Supply (actualizado): 1000 USDT
```

---

## 🌐 Paso 5: Usar la API Backend para Emitir USDT

### 5.1 Endpoint: Emitir USDT

**URL:** `POST http://localhost:3000/api/usdt-minter/issue`

**Request:**
```json
{
  "amount": 1000,
  "reason": "Bridge testing - USD to USDT conversion"
}
```

**Response (Éxito):**
```json
{
  "success": true,
  "type": "USDT_MINTER_ISSUE_SUCCESS",
  "txHash": "0x...",
  "blockNumber": 19850123,
  "amountIssued": 1000,
  "reason": "Bridge testing - USD to USDT conversion",
  "network": "Ethereum Mainnet",
  "contractAddress": "0x...",
  "usdtAddress": "0xdAC17F958D2ee523a2206206994597C13D831ec7",
  "balanceAfter": "1000",
  "totalSupplyAfter": "1000",
  "etherscanUrl": "https://etherscan.io/tx/0x...",
  "timestamp": "2025-01-03T10:00:00.000Z"
}
```

### 5.2 Endpoint: Verificar Estado del Minter

**URL:** `GET http://localhost:3000/api/usdt-minter/status`

**Response:**
```json
{
  "success": true,
  "status": "active",
  "minterAddress": "0x...",
  "usdtAddress": "0xdAC17F958D2ee523a2206206994597C13D831ec7",
  "minterBalance": "1000 USDT",
  "totalSupply": "1000 USDT",
  "totalIssueRecords": "2",
  "network": "Ethereum Mainnet",
  "decimals": 6
}
```

### 5.3 Endpoint: Validar Configuración

**URL:** `POST http://localhost:3000/api/usdt-minter/validate-setup`

**Response:**
```json
{
  "success": true,
  "configuration": {
    "rpcUrl": "https://eth-mainnet.g.alchemy.com...",
    "signerAddress": "0x...",
    "signerBalance": "0.5 ETH",
    "minterAddress": "0x...",
    "usdtAddress": "0xdAC17F958D2ee523a2206206994597C13D831ec7",
    "hasPrivateKey": true
  }
}
```

---

## 🔗 Paso 6: Integración con Bridge USD → USDT

El bridge (`/api/uniswap/swap`) ya usa esta función automáticamente. El flujo es:

```
1. Usuario solicita convertir USD → USDT
2. Backend calcula cantidad (1:1 con 1% comisión)
3. Backend llama a `/api/usdt-minter/issue` para emitir USDT
4. USDT emitido se transfiere al usuario
5. Se retorna TX Hash y Etherscan link
```

**Llamada de ejemplo desde frontend:**

```typescript
// Convertir 100 USD a USDT
const response = await fetch('/api/uniswap/swap', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    amount: 100,
    recipientAddress: '0x...',
    slippageTolerance: 1
  })
});
```

---

## 📊 Solución de Problemas

### ❌ Error: "USDT_MINTER_ADDRESS no configurada"
**Solución:** Actualizar `.env` con la dirección del contrato deployado.

### ❌ Error: "Balance ETH insuficiente"
**Solución:** Enviar ETH a la dirección del signer para pagar gas.

### ❌ Error: "RPC no disponible"
**Solución:** Verificar que `ETH_RPC_URL` es válido y está en línea.

### ❌ Error: "Permission Denied" en la emisión
**Solución:** Verificar que el signer es el propietario del contrato USDTMinter.

---

## 📖 Documentación del Contrato USDTMinter

### Funciones Públicas

#### `issueUSDT(uint256 amount, string memory reason) → bool`
Emitir USDT al contrato USDT real.
- **amount:** Cantidad en wei (con 6 decimales)
- **reason:** Razón de la emisión (para auditoría)
- **Retorna:** `true` si exitoso

#### `transferUSDT(address to, uint256 amount) → bool`
Transferir USDT a una dirección.
- **to:** Dirección receptora
- **amount:** Cantidad en wei

#### `getBalance() → uint256`
Obtener balance USDT del contrato.

#### `getTotalSupply() → uint256`
Obtener supply total de USDT.

#### `getDecimals() → uint8`
Obtener decimales de USDT (normalmente 6).

#### `getIssueRecords() → IssueRecord[]`
Obtener historial de todas las emisiones.

#### `setMaxIssuePerTransaction(uint256 newLimit)`
Cambiar límite máximo de emisión por transacción.

---

## 🔐 Seguridad

✅ **onlyOwner:** Solo el propietario puede emitir
✅ **Límites de Emisión:** Máximo 1 millón USDT por transacción
✅ **Auditoría Completa:** Cada emisión queda registrada
✅ **Try-Catch:** Manejo seguro de errores

---

## 📈 Ventajas de este Enfoque

1. **Intermedio Controlado:** No llamas directamente a USDT, evitas permisos restringidos
2. **Auditoría Completa:** Registro de todas las emisiones
3. **Limits de Seguridad:** Límites de cantidad por transacción
4. **Integración Fácil:** API REST para usar desde cualquier lado
5. **Desarrollo Seguro:** Puede testearse en Sepolia sin tocar Mainnet

---

## 🚀 Siguiente Paso: Testear el Sistema

1. Deploy el contrato en Remix
2. Actualiza `.env` con la dirección
3. Ejecuta: `node blockchain/scripts/createMoreTokens.js`
4. Verifica en Etherscan que USDT fue emitido
5. Prueba el endpoint API: `POST /api/usdt-minter/issue`

¡Listo! Ahora tienes un sistema real para emitir USDT. 🎉




### ¿Qué es USDT Minter?

Es un **contrato intermedio en Solidity** que permite solicitar la emisión de más tokens USDT al contrato USDT real de Ethereum Mainnet. Actúa como un "puente" controlado para:

✅ Emitir más USDT de forma segura
✅ Registrar auditoría de todas las emisiones
✅ Gestionar límites de emisión
✅ Integrar con el bridge USD → USDT

---

## 📋 Estructura de Archivos Creados

```
blockchain/
├── contracts/
│   └── USDTMinter.sol          # Contrato intermedio para emitir USDT
└── scripts/
    └── createMoreTokens.js     # Script para ejecutar emisiones

server/
└── routes/
    └── usdt-minter-routes.js   # Rutas backend para el minter
```

---

## 📝 Paso 1: Preparación - Configurar el `.env`

Agregar al archivo `.env` (o crear si no existe):

```env
# Ethereum Mainnet RPC
ETH_RPC_URL=https://eth-mainnet.g.alchemy.com/v2/7iQ1gZ82J1A6Fig-QwHDb4_4GeoayYqj

# Clave privada del propietario (NUNCA compartir)
ETH_PRIVATE_KEY=d1bf385c43fb999290e3e0365f8cc45bfa97b780a97c6eb4bd790ec3fa09a036

# Dirección del contrato USDTMinter deployado
USDT_MINTER_ADDRESS=0x...  # Reemplazar con dirección real después de deploy
```

⚠️ **IMPORTANTE:** Nunca compartir la clave privada. Esto es solo para desarrollo.

---

## 🔧 Paso 2: Instalar Dependencias

```bash
# Instalar web3.js para el script
npm install web3

# O usar ethers.js (ya instalado)
# npm install ethers
```

---

## 🛠️ Paso 3: Deploy del Contrato USDTMinter en Remix IDE

### 3.1 Ir a Remix IDE
- Acceder a: https://remix.ethereum.org

### 3.2 Crear el Archivo
- Crear nuevo archivo: `USDTMinter.sol`
- Copiar el contenido de `blockchain/contracts/USDTMinter.sol`

### 3.3 Compilar
- Seleccionar compilador: `0.8.0+`
- Click en "Compile USDTMinter.sol"

### 3.4 Deploy
- Ir a "Deploy & Run Transactions"
- Seleccionar Network: "Ethereum Mainnet" (asegurarse que MetaMask está conectada)
- Seleccionar cuenta que tiene ETH
- Click en "Deploy"
- Copiar la dirección del contrato deployado

### 3.5 Guardar la Dirección
```bash
# Actualizar .env con la dirección del contrato
USDT_MINTER_ADDRESS=0x[dirección_del_contrato_deployado]
```

---

## 🚀 Paso 4: Ejecutar Emisión de USDT Vía Script

### 4.1 Opción A: Usar el Script Node.js

```bash
# Ejecutar el script
node blockchain/scripts/createMoreTokens.js
```

**Salida esperada:**
```
🚀 USDT MINTER - Iniciando emisión de tokens USDT

⚙️ Configuración:
  RPC: https://eth-mainnet.g.alchemy.com...
  USDT Minter: 0x...
  USDT Real: 0xdAC17F958D2ee523a2206206994597C13D831ec7
  Cantidad: 1000 USDT
  Razón: Development testing

📡 PASO 1: Conectando a Ethereum Mainnet...
✅ Conectado al RPC

🔑 PASO 2: Creando signer (propietario)...
✅ Signer: 0x...
💰 Balance ETH: 0.5 ETH

✨ PASO 8: Verificando resultados...
💵 Nuevo balance USDT en Minter: 1000 USDT
📈 Nuevo Supply Total USDT: 1000 USDT
➕ USDT emitidos: 1000 USDT

✅ ===== EMISSION SUCCESSFUL =====
TX Hash: 0x...
Bloque: #19850123
USDT emitidos: 1000 USDT
Etherscan: https://etherscan.io/tx/0x...
Total Supply (actualizado): 1000 USDT
```

---

## 🌐 Paso 5: Usar la API Backend para Emitir USDT

### 5.1 Endpoint: Emitir USDT

**URL:** `POST http://localhost:3000/api/usdt-minter/issue`

**Request:**
```json
{
  "amount": 1000,
  "reason": "Bridge testing - USD to USDT conversion"
}
```

**Response (Éxito):**
```json
{
  "success": true,
  "type": "USDT_MINTER_ISSUE_SUCCESS",
  "txHash": "0x...",
  "blockNumber": 19850123,
  "amountIssued": 1000,
  "reason": "Bridge testing - USD to USDT conversion",
  "network": "Ethereum Mainnet",
  "contractAddress": "0x...",
  "usdtAddress": "0xdAC17F958D2ee523a2206206994597C13D831ec7",
  "balanceAfter": "1000",
  "totalSupplyAfter": "1000",
  "etherscanUrl": "https://etherscan.io/tx/0x...",
  "timestamp": "2025-01-03T10:00:00.000Z"
}
```

### 5.2 Endpoint: Verificar Estado del Minter

**URL:** `GET http://localhost:3000/api/usdt-minter/status`

**Response:**
```json
{
  "success": true,
  "status": "active",
  "minterAddress": "0x...",
  "usdtAddress": "0xdAC17F958D2ee523a2206206994597C13D831ec7",
  "minterBalance": "1000 USDT",
  "totalSupply": "1000 USDT",
  "totalIssueRecords": "2",
  "network": "Ethereum Mainnet",
  "decimals": 6
}
```

### 5.3 Endpoint: Validar Configuración

**URL:** `POST http://localhost:3000/api/usdt-minter/validate-setup`

**Response:**
```json
{
  "success": true,
  "configuration": {
    "rpcUrl": "https://eth-mainnet.g.alchemy.com...",
    "signerAddress": "0x...",
    "signerBalance": "0.5 ETH",
    "minterAddress": "0x...",
    "usdtAddress": "0xdAC17F958D2ee523a2206206994597C13D831ec7",
    "hasPrivateKey": true
  }
}
```

---

## 🔗 Paso 6: Integración con Bridge USD → USDT

El bridge (`/api/uniswap/swap`) ya usa esta función automáticamente. El flujo es:

```
1. Usuario solicita convertir USD → USDT
2. Backend calcula cantidad (1:1 con 1% comisión)
3. Backend llama a `/api/usdt-minter/issue` para emitir USDT
4. USDT emitido se transfiere al usuario
5. Se retorna TX Hash y Etherscan link
```

**Llamada de ejemplo desde frontend:**

```typescript
// Convertir 100 USD a USDT
const response = await fetch('/api/uniswap/swap', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    amount: 100,
    recipientAddress: '0x...',
    slippageTolerance: 1
  })
});
```

---

## 📊 Solución de Problemas

### ❌ Error: "USDT_MINTER_ADDRESS no configurada"
**Solución:** Actualizar `.env` con la dirección del contrato deployado.

### ❌ Error: "Balance ETH insuficiente"
**Solución:** Enviar ETH a la dirección del signer para pagar gas.

### ❌ Error: "RPC no disponible"
**Solución:** Verificar que `ETH_RPC_URL` es válido y está en línea.

### ❌ Error: "Permission Denied" en la emisión
**Solución:** Verificar que el signer es el propietario del contrato USDTMinter.

---

## 📖 Documentación del Contrato USDTMinter

### Funciones Públicas

#### `issueUSDT(uint256 amount, string memory reason) → bool`
Emitir USDT al contrato USDT real.
- **amount:** Cantidad en wei (con 6 decimales)
- **reason:** Razón de la emisión (para auditoría)
- **Retorna:** `true` si exitoso

#### `transferUSDT(address to, uint256 amount) → bool`
Transferir USDT a una dirección.
- **to:** Dirección receptora
- **amount:** Cantidad en wei

#### `getBalance() → uint256`
Obtener balance USDT del contrato.

#### `getTotalSupply() → uint256`
Obtener supply total de USDT.

#### `getDecimals() → uint8`
Obtener decimales de USDT (normalmente 6).

#### `getIssueRecords() → IssueRecord[]`
Obtener historial de todas las emisiones.

#### `setMaxIssuePerTransaction(uint256 newLimit)`
Cambiar límite máximo de emisión por transacción.

---

## 🔐 Seguridad

✅ **onlyOwner:** Solo el propietario puede emitir
✅ **Límites de Emisión:** Máximo 1 millón USDT por transacción
✅ **Auditoría Completa:** Cada emisión queda registrada
✅ **Try-Catch:** Manejo seguro de errores

---

## 📈 Ventajas de este Enfoque

1. **Intermedio Controlado:** No llamas directamente a USDT, evitas permisos restringidos
2. **Auditoría Completa:** Registro de todas las emisiones
3. **Limits de Seguridad:** Límites de cantidad por transacción
4. **Integración Fácil:** API REST para usar desde cualquier lado
5. **Desarrollo Seguro:** Puede testearse en Sepolia sin tocar Mainnet

---

## 🚀 Siguiente Paso: Testear el Sistema

1. Deploy el contrato en Remix
2. Actualiza `.env` con la dirección
3. Ejecuta: `node blockchain/scripts/createMoreTokens.js`
4. Verifica en Etherscan que USDT fue emitido
5. Prueba el endpoint API: `POST /api/usdt-minter/issue`

¡Listo! Ahora tienes un sistema real para emitir USDT. 🎉





