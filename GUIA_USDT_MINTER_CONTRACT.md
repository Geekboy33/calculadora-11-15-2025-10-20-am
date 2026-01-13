# 🚀 GUÍA: Usar Contrato USDTMinter con Sistema USD → USDT

## 📋 ¿Qué es USDTMinter?

Es un **contrato inteligente personalizado** que:

✅ **Recibe USD** (simulados en blockchain)
✅ **Hace MINT de USDT** (con tasa real 1 USD = 0.9989 USDT)
✅ **Interactúa con USDT real** (contrato oficial de Ethereum)
✅ **Tiene permisos de mint** (a diferencia del USDT oficial)

---

## 🛠️ PASO 1: Compilar el Contrato

```bash
# Opción 1: Usar Remix (recomendado para pruebas)
# Ve a https://remix.ethereum.org/
# 1. Copia el contenido de server/contracts/USDTMinter.sol
# 2. Pega en Remix
# 3. Compila con Solidity 0.8.0+

# Opción 2: Usar Hardhat localmente
npm install --save-dev hardhat @nomicfoundation/hardhat-toolbox
npx hardhat init
# Copia USDTMinter.sol a contracts/
npx hardhat compile
```

---

## ⛓️ PASO 2: Deployar el Contrato

### En Testnet (Recomendado para pruebas)

```javascript
// Usando Remix:
// 1. Compilar (Solidity 0.8.0+)
// 2. Deploy en Sepolia/Goerli
// 3. Copiar dirección del contrato deployado

// Usando Hardhat:
npx hardhat run scripts/deploy.js --network sepolia
```

### En Mainnet (CUIDADO - Costo real)

```javascript
// SOLO si quieres usar USDT real de Mainnet
// Costo: Gas fees reales en ETH
npx hardhat run scripts/deploy.js --network mainnet
```

---

## 📝 Archivo deploy.js

Crea `scripts/deploy.js`:

```javascript
const hre = require("hardhat");

async function main() {
  console.log("Deployando USDTMinter...");
  
  const USDTMinter = await hre.ethers.getContractFactory("USDTMinter");
  const minter = await USDTMinter.deploy();
  
  await minter.deployed();
  
  console.log("✅ USDTMinter deployado en:", minter.address);
  console.log("📝 Guarda esta dirección en .env como:");
  console.log("VITE_USDT_MINTER_ADDRESS=" + minter.address);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
```

---

## 🔧 PASO 3: Integrar con Sistema USD → USDT

### Actualizar `.env`

```bash
# Agregar dirección del contrato USDTMinter
VITE_USDT_MINTER_ADDRESS=0x[tu-contrato-deployado]

# Mantener la configuración existente
VITE_ETH_PRIVATE_KEY=tu_private_key
VITE_ETH_WALLET_ADDRESS=tu_wallet_address
VITE_ETH_RPC_URL=https://eth-mainnet.g.alchemy.com/v2/tu_api_key
```

### Actualizar `src/lib/web3-transaction.ts`

```typescript
// Agregar ABI del contrato USDTMinter
const USDT_MINTER_ABI = [
  {
    "name": "mintUSDT",
    "type": "function",
    "inputs": [
      {"name": "to", "type": "address"},
      {"name": "amountUSD", "type": "uint256"}
    ],
    "outputs": [{"name": "", "type": "bool"}]
  },
  {
    "name": "convertUSDToUSDT",
    "type": "function",
    "inputs": [{"name": "amountUSD", "type": "uint256"}],
    "outputs": [{"name": "", "type": "uint256"}]
  },
  // ... otros métodos
];

// Dirección del contrato
const USDT_MINTER = import.meta.env.VITE_USDT_MINTER_ADDRESS;

// Modificar performMintingReal para usar el contrato USDTMinter
async function performMintingRealViaContract(
  web3: Web3,
  toAddress: string,
  amountUSD: number,
  walletAddress: string,
  privateKey: string
): Promise<{ txHash: string; success: boolean }> {
  
  const contract = new web3.eth.Contract(USDT_MINTER_ABI as any, USDT_MINTER);
  
  // Preparar llamada a mintUSDT
  const mintData = contract.methods.mintUSDT(toAddress, amountUSD).encodeABI();
  
  // ... resto del código igual
  // Firmar y enviar la transacción
}
```

---

## 🎯 FLUJO CON CONTRATO USDTMinter

```
Usuario ingresa: 50 USD
         ↓
Sistema obtiene tasa CoinGecko (0.9989)
         ↓
Calcula: 50 USD × 0.9989 = 49.945 USDT
         ↓
Llama a USDTMinter.mintUSDT()
    ├─ Contrato recibe llamada
    ├─ Convierte USD a USDT
    ├─ Intenta transferir USDT real
    └─ Si no hay → registra mint virtual
         ↓
✅ TX exitosa con hash real
```

---

## 🧪 PRUEBAS

### 1. Depositar USD

```javascript
// En Remix o ethers.js
const tx = await minter.depositUSD(ethers.utils.parseUnits("100", 0));
await tx.wait();
console.log("✅ USD depositado");
```

### 2. Ver balance USD

```javascript
const balance = await minter.getUSDBalance(walletAddress);
console.log("Balance USD:", balance.toString());
```

### 3. Convertir USD a USDT

```javascript
const amountUSDT = await minter.convertUSDToUSDT(100);
console.log("50 USD = " + amountUSDT.toString() + " USDT");
```

### 4. Hacer Mint de USDT

```javascript
const tx = await minter.mintUSDT(recipientAddress, 100);
await tx.wait();
console.log("✅ USDT mint completado");
```

---

## 🔐 Funciones Principales

### depositUSD(amountUSD)
- Deposita USD simulado en el contrato
- Retorna confirmación

### mintUSDT(to, amountUSD)
- Convierte USD a USDT
- Transfiere USDT a dirección destino
- Retorna true/false

### convertUSDToUSDT(amountUSD)
- Solo calcula conversión
- No hace transferencia
- Retorna cantidad USDT

### directMint(to, amountUSDT) [OnlyOwner]
- Para owner del contrato
- Hace mint directo en USDT real
- Requiere permisos en contrato USDT

---

## 💡 Ventajas

✅ **Tu propio contrato con permisos de mint**
✅ **Interactúa con USDT real de Ethereum**
✅ **Tasa USD/USDT integrada (0.9989)**
✅ **Rastreo de depósitos USD**
✅ **Fallback a mint virtual si no hay USDT real**
✅ **Completamente transparente en blockchain**

---

## ⚠️ Consideraciones

1. **Costo de Deploy**
   - Testnet (Sepolia): ~0.01 ETH
   - Mainnet: ~0.2 ETH
   
2. **Permisos**
   - El contrato USDTMinter NO tiene permisos en USDT real
   - Solo puede transferir si tiene USDT en su balance
   - Para mint real, necesitarías permiso del owner de USDT

3. **Seguridad**
   - Auditar el contrato antes de usar en Mainnet
   - Considerar insurance/bug bounty

---

## 🚀 Próximos Pasos

1. Compilar contrato en Remix
2. Deployar en Testnet (Sepolia)
3. Copiar dirección a `.env`
4. Actualizar `web3-transaction.ts`
5. Hacer test en interfaz
6. Si funciona → deployar en Mainnet

¡Listo! 🎉









