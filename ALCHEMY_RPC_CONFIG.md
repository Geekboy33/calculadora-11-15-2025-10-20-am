# 🔐 CONFIGURACIÓN ALCHEMY RPC URL - INSTRUCCIONES

## ✅ TIENES TODO LO QUE NECESITAS

Tu RPC URL de Alchemy:
```
ETH_RPC_URL=https://eth-mainnet.g.alchemy.com/v2/mm-9UjI5oG51l94mRH3fh
```

---

## 📝 **PASO 1: Actualizar `.env`**

En tu archivo `.env` actual, **agrega esta línea**:

```bash
# Agregar esta línea al inicio:
ETH_RPC_URL=https://eth-mainnet.g.alchemy.com/v2/mm-9UjI5oG51l94mRH3fh

# Verifica que también tienes:
PRIVATE_KEY=d1bf385c43fb999290e3e0365f8cc45bfa97b780a97c6eb4bd790ec3fa09a036
WALLET_ADDRESS=0x05316B102FE62574b9cBd45709f8F1B6C00beC8a
USDT_CONTRACT_ADDRESS=0xdAC17F958D2ee523a2206206994597C13D831ec7

# Para Frontend (Vite):
VITE_ETH_RPC_URL=https://eth-mainnet.g.alchemy.com/v2/mm-9UjI5oG51l94mRH3fh
VITE_ETH_PRIVATE_KEY=d1bf385c43fb999290e3e0365f8cc45bfa97b780a97c6eb4bd790ec3fa09a036
VITE_ETH_WALLET_ADDRESS=0x05316B102FE62574b9cBd45709f8F1B6C00beC8a
VITE_USDT_CONTRACT_ADDRESS=0xdAC17F958D2ee523a2206206994597C13D831ec7
```

---

## 🚀 **PASO 2: Reiniciar el Servidor**

```bash
# Cierra el servidor actual (Ctrl+C)
# Luego ejecuta:

npm run dev:full
```

Deberías ver:
```
✅ [Alchemy] Usando RPC URL directo de Alchemy
  - RPC URL: https://eth-mainnet.g.alchemy.com/v2/mm-9UjI5oG...
  - Red: Ethereum Mainnet
✅ [Wallet] Cargada: 0x05316B102FE62574b9cBd45709f8F1B6C00beC8a
```

---

## 💰 **PASO 3: Verificar Balances**

Abre http://localhost:4000/ y ve a **USD → USDT**

Deberías ver:
- ✅ Conexión exitosa a Ethereum Mainnet
- 💰 Balance USDT actual
- ⛽ Balance ETH actual
- 📊 Precio USD/USDT

---

## 🧪 **PASO 4: Hacer Transferencia de Prueba**

### Opción A: Sin fondos (SOLO TESTING)
Si aún no tienes USDT:
1. Ingresa: **Monto USD = 0** (solo para ver que funciona)
2. Ingresa dirección destino
3. Click CONVERTIR
4. Deberías ver error: "Balance USDT insuficiente" ✓

### Opción B: Con fondos (TRANSFERENCIA REAL)
Si ya tienes USDT:
1. Ingresa: **Monto USD = 1** (1 USDT)
2. Ingresa dirección destino (wallet propia para testing)
3. Click CONVERTIR
4. Espera confirmación
5. Verifica en Etherscan: https://etherscan.io/tx/{hash}

---

## ✨ **¿QUÉ CAMBIÓ?**

### Antes (Con Infura + Web3.js)
- Usaba INFURA_PROJECT_ID
- Web3.js para raw transactions
- Más manual

### Ahora (Con Alchemy RPC + ethers.js)
- ✅ Usa ETH_RPC_URL directo
- ✅ ethers.js automático
- ✅ Más confiable
- ✅ Mejor manejo de errores
- ✅ **Exactamente como la guía que compartiste**

---

## 🔗 **FLUJO ACTUAL**

```
.env (ETH_RPC_URL)
    ↓
server/transaction.js (conecta via Alchemy)
    ↓
ethers.JsonRpcProvider (usa RPC URL)
    ↓
Ethereum Mainnet
    ↓
Transacción REAL firmada
    ↓
Etherscan (txHash real)
```

---

## 🐛 **TROUBLESHOOTING**

### Error: "Ni ETH_RPC_URL ni ALCHEMY_API_KEY configurados"
```bash
✓ Abre tu .env
✓ Busca la línea: ETH_RPC_URL=
✓ Si no existe, agrégala
✓ Reinicia: npm run dev:full
```

### Error: "Invalid Private Key"
```bash
✓ Private key debe tener 64 caracteres hex (sin 0x)
✓ Verificar que NO empieza con "0x"
✓ Verificar que solo tiene números y a-f
```

### Error: "Connection refused"
```bash
✓ RPC URL puede estar vencida
✓ Genera una nueva en https://www.alchemy.com/
✓ Actualiza en .env
```

### Error: "Balance ETH insuficiente"
```bash
✓ Necesitas ETH para pagar gas
✓ Envía ETH a: 0x05316B102FE62574b9cBd45709f8F1B6C00beC8a
✓ Mínimo: 0.01 ETH
```

---

## 📊 **ARCHIVO `.env.alchemy` (Referencia)**

Por si quieres ver la configuración completa:

```env
# ============================================================================
# ALCHEMY RPC URL (PRINCIPAL)
# ============================================================================
ETH_RPC_URL=https://eth-mainnet.g.alchemy.com/v2/mm-9UjI5oG51l94mRH3fh

# ============================================================================
# ETHEREUM WALLET
# ============================================================================
PRIVATE_KEY=d1bf385c43fb999290e3e0365f8cc45bfa97b780a97c6eb4bd790ec3fa09a036
WALLET_ADDRESS=0x05316B102FE62574b9cBd45709f8F1B6C00beC8a
USDT_CONTRACT_ADDRESS=0xdAC17F958D2ee523a2206206994597C13D831ec7

# ============================================================================
# FRONTEND (VITE)
# ============================================================================
VITE_ETH_RPC_URL=https://eth-mainnet.g.alchemy.com/v2/mm-9UjI5oG51l94mRH3fh
VITE_ETH_PRIVATE_KEY=d1bf385c43fb999290e3e0365f8cc45bfa97b780a97c6eb4bd790ec3fa09a036
VITE_ETH_WALLET_ADDRESS=0x05316B102FE62574b9cBd45709f8F1B6C00beC8a
VITE_USDT_CONTRACT_ADDRESS=0xdAC17F958D2ee523a2206206994597C13D831ec7
```

---

## ✅ **RESUMEN**

1. ✅ Tienes RPC URL de Alchemy
2. ✅ Sistema actualizado para usarlo
3. ✅ Solo falta: agregar `ETH_RPC_URL=...` en `.env`
4. ✅ Reiniciar servidor
5. ✅ ¡Listo para transacciones REALES!

**Próximo paso:** Actualizar `.env` con el RPC URL 🚀










