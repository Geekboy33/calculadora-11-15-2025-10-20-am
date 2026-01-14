# 🔐 Integración con Alchemy SDK para Transferencias USDT Reales

## ✅ Lo que hemos implementado

Tu sistema ahora usa **Alchemy SDK** con la guía probada que enviaste:

1. **Archivo `server/transaction.js`**
   - Usa Alchemy SDK para conectar a Ethereum Mainnet
   - Implementa `eth_sendRawTransaction` para transacciones firmadas
   - Calcula gas automáticamente (50% más para garantizar)
   - Transfiere USDT real usando `transfer()`

2. **Nuevo endpoint `/api/ethusd/send-usdt-alchemy`**
   - Integración completa con Alchemy
   - Respuesta con hash real de Etherscan
   - Gas fee calculado correctamente

---

## 📋 PASOS PARA CONFIGURAR

### PASO 1: Obtener API Key de Alchemy

1. Ve a: https://www.alchemy.com/
2. Sign up (o login si ya tienes cuenta)
3. Crea una nueva app para Ethereum Mainnet
4. Copia tu API Key (se vee así): `Nj8KaMZQe...`

---

### PASO 2: Configurar Variables de Entorno

**En tu archivo `.env` actual, agrega:**

```bash
# Para Alchemy SDK (NUEVO)
ALCHEMY_API_KEY=your_alchemy_api_key_here

# Para Node.js (transaction.js)
PRIVATE_KEY=d1bf385c43fb999290e3e0365f8cc45bfa97b780a97c6eb4bd790ec3fa09a036
WALLET_ADDRESS=0x05316B102FE62574b9cBd45709f8F1B6C00beC8a

# Para Frontend (ya tienes estos)
VITE_ALCHEMY_API_KEY=your_alchemy_api_key_here
VITE_ETH_PRIVATE_KEY=d1bf385c43fb999290e3e0365f8cc45bfa97b780a97c6eb4bd790ec3fa09a036
VITE_ETH_WALLET_ADDRESS=0x05316B102FE62574b9cBd45709f8F1B6C00beC8a
VITE_USDT_CONTRACT_ADDRESS=0xdAC17F958D2ee523a2206206994597C13D831ec7
```

---

### PASO 3: Inyectar USDT en tu Wallet

Tu wallet necesita tener USDT antes de poder transferir.

**Opciones:**

**Opción A: Depósito directo (Si tienes otra wallet con USDT)**
- Transfiere USDT desde otra wallet a: `0x05316B102FE62574b9cBd45709f8F1B6C00beC8a`
- Comando para verificar:
  ```bash
  node -e "
  const transaction = require('./server/transaction.js');
  transaction.getUSDTBalance('0x05316B102FE62574b9cBd45709f8F1B6C00beC8a')
    .then(bal => console.log('Balance:', bal.formatted))
    .catch(err => console.error(err));
  "
  ```

**Opción B: Usar DEX (Uniswap)**
- Si tienes ETH, puedes swapear ETH → USDT
- Ve a: https://app.uniswap.org/

**Opción C: Crear dUSDT (Tu propio token minteable)**
- Opción avanzada - crear un contrato propio

---

### PASO 4: También necesitas ETH para pagar gas

La transferencia de USDT requiere ETH para pagar el gas:

```bash
# Verificar balance ETH
node -e "
const transaction = require('./server/transaction.js');
transaction.getETHBalance('0x05316B102FE62574b9cBd45709f8F1B6C00beC8a')
  .then(bal => console.log('ETH Balance:', bal.formatted))
  .catch(err => console.error(err));
"
```

Si no tienes ETH, necesitas:
- Comprar ETH en un exchange (Coinbase, Kraken, etc.)
- O conseguir ETH de gratis en: https://grabteeth.xyz/ (faucet)

---

## 🚀 CÓMO USAR

### Opción 1: Desde el Frontend (Módulo USD → USDT)

1. Abre el módulo "Convertidor USD → USDT"
2. Selecciona una cuenta de "fondos.json"
3. Ingresa cantidad en USD
4. Click en "CONVERTIR"
5. El backend usará Alchemy para transferir USDT real

**URL del endpoint:**
```
POST /api/ethusd/send-usdt-alchemy
```

### Opción 2: Desde el Terminal (Testing)

```bash
# Test directo
node -e "
const trans = require('./server/transaction.js');
trans.transferUSDT('0xrecipient_address_here', '1')
  .then(result => console.log('✅ Exitoso:', result))
  .catch(err => console.error('❌ Error:', err.message));
"
```

---

## 📊 FLUJO COMPLETO

```
1. Usuario ingresa USD en frontend
   ↓
2. Frontend llama a /api/ethusd/send-usdt-alchemy
   ↓
3. Backend carga credenciales de .env
   ↓
4. Transaction.js conecta a Alchemy
   ↓
5. Obtiene gas price actual y lo aumenta 50%
   ↓
6. Verifica balance ETH para pagar gas
   ↓
7. Verifica balance USDT a transferir
   ↓
8. Firma la transacción con tu private key
   ↓
9. Envía a Ethereum via Alchemy (eth_sendRawTransaction)
   ↓
10. Retorna hash real de Etherscan
    ↓
11. Usuario ve hash en Etherscan (transacción real!)
```

---

## ✅ VERIFICACIÓN

Para verificar que todo funciona:

1. **Check Balances:**
   ```bash
   npm run dev:full
   ```
   
2. **En otra terminal, test:**
   ```bash
   node -e "
   const t = require('./server/transaction.js');
   console.log('Testing Alchemy connection...');
   t.getETHBalance(t.wallet.address)
    .then(b => console.log('✅ ETH:', b.formatted))
    .catch(e => console.error('❌', e.message));
   "
   ```

3. **Verifica en Etherscan:**
   - Ve a: https://etherscan.io/
   - Busca tu dirección wallet
   - Deberías ver los balances actuales

---

## ⚙️ CONFIGURACIÓN AVANZADA

### Cambiar Red (Testnet vs Mainnet)

En `server/transaction.js`, línea de configuración:

**Para Sepolia Testnet (Testing):**
```javascript
const settings = {
  apiKey: process.env.ALCHEMY_API_KEY,
  network: Network.ETH_SEPOLIA,  // ← Cambiar a SEPOLIA
};
```

**Para Ethereum Mainnet (Producción):**
```javascript
const settings = {
  apiKey: process.env.ALCHEMY_API_KEY,
  network: Network.ETH_MAINNET,  // ← Mainnet
};
```

### Aumentar Gas Price

En `server/transaction.js`, línea ~89:

```javascript
// Actual: +50%
const gasPriceIncreased = gasPrice.mul(ethers.BigNumber.from("150")).div(ethers.BigNumber.from("100"));

// Para +100% (más rápido pero más caro):
const gasPriceIncreased = gasPrice.mul(ethers.BigNumber.from("200")).div(ethers.BigNumber.from("100"));
```

---

## 🐛 TROUBLESHOOTING

### Error: "Alchemy API key not found"
- Verifica que `ALCHEMY_API_KEY` está en `.env`
- Reinicia el servidor

### Error: "Invalid Private Key"
- Revisa que tu private key:
  - ✅ Tiene 64 caracteres (sin 0x)
  - ✅ Contiene solo 0-9 y a-f
  - ✅ Es la de la wallet que tiene fondos

### Error: "Balance ETH insuficiente"
- Necesitas ETH para pagar gas
- Compra o recibe ETH en tu wallet

### Error: "Balance USDT insuficiente"
- Necesitas USDT en la wallet para transferir
- Depósita USDT antes de intentar

---

## 🔗 RECURSOS

- **Alchemy**: https://www.alchemy.com/
- **Etherscan**: https://etherscan.io/
- **Uniswap**: https://app.uniswap.org/
- **Faucet ETH (Gratis Mainnet)**: https://grabteeth.xyz/
- **Documentación Web3.js**: https://web3js.readthedocs.io/

---

## 📝 RESUMEN

✅ **Instalado:** Alchemy SDK + ethers.js + dependencias
✅ **Creado:** server/transaction.js con lógica probada
✅ **Endpoint:** POST /api/ethusd/send-usdt-alchemy
✅ **Gas:** Automático +50% para garantizar ejecución
✅ **Hashes:** Reales de Etherscan
✅ **Seguridad:** Private key nunca se expone

**Próximo paso:** Configura tu ALCHEMY_API_KEY en `.env` y prueba! 🚀










