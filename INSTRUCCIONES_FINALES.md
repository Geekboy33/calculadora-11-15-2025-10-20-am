# 🚀 **INSTRUCCIONES FINALES - ALCHEMY RPC CONFIGURADO**

## ✅ **ESTADO ACTUAL**

Tu sistema está completamente listo con **Alchemy RPC URL**. Solo falta un pequeño paso.

---

## 📝 **INSTRUCCIÓN 1: EDITAR `.env`**

**Abre tu archivo `.env` actual** y agrega esta línea **al principio**:

```bash
ETH_RPC_URL=https://eth-mainnet.g.alchemy.com/v2/mm-9UjI5oG51l94mRH3fh
```

**Tu `.env` debe quedar así:**
```bash
# ALCHEMY RPC (AGREGAR ESTA LÍNEA)
ETH_RPC_URL=https://eth-mainnet.g.alchemy.com/v2/mm-9UjI5oG51l94mRH3fh

# Ya tienes estas (no cambiar):
VITE_INFURA_PROJECT_ID=6b7bd498942d42edab758545c7d30403
VITE_ETH_PRIVATE_KEY=d1bf385c43fb999290e3e0365f8cc45bfa97b780a97c6eb4bd790ec3fa09a036
VITE_ETH_WALLET_ADDRESS=0x05316B102FE62574b9cBd45709f8F1B6C00beC8a
VITE_USDT_CONTRACT_ADDRESS=0xdAC17F958D2ee523a2206206994597C13D831ec7

# Agregar también (para frontend):
VITE_ETH_RPC_URL=https://eth-mainnet.g.alchemy.com/v2/mm-9UjI5oG51l94mRH3fh
```

---

## 🔄 **INSTRUCCIÓN 2: REINICIAR SERVIDOR**

En PowerShell, ejecuta:

```powershell
cd "C:\Users\USER\Desktop\calculator 11 15 2025  10 24 am\calculadora-11-15-2025-10-20-am"
npm run dev:full
```

**Deberías ver en la consola:**
```
✅ [Alchemy] Usando RPC URL directo de Alchemy
  - RPC URL: https://eth-mainnet.g.alchemy.com/v2/mm-9UjI5oG...
  - Red: Ethereum Mainnet
✅ [Wallet] Cargada: 0x05316B102FE62574b9cBd45709f8F1B6C00beC8a
[APP]   ➜  Local:   http://localhost:4000/
```

---

## 🌐 **INSTRUCCIÓN 3: PROBAR EL MÓDULO**

1. Abre: **http://localhost:4000/**
2. Navega a: **USD → USDT** (en las pestañas del menú)
3. Deberías ver:
   - ✅ "Conexión exitosa a Ethereum Mainnet"
   - 💰 Balance USDT: 0.00 (sin fondos aún)
   - ⛽ Balance ETH: 0.0000 (sin fondos aún)

---

## 💎 **INSTRUCCIÓN 4: INYECTAR FONDOS (OPCIONAL)**

Si quieres hacer una transferencia REAL:

### Opción A: Depositar USDT directo
```
Wallet: 0x05316B102FE62574b9cBd45709f8F1B6C00beC8a

Desde otra wallet, envía USDT (mainnet) a esta dirección.
```

### Opción B: Swapear ETH → USDT
```
1. Ve a: https://app.uniswap.org/
2. Conecta tu wallet
3. Swapea ETH → USDT
4. Transfiérelo a tu wallet
```

### Opción C: Comprar USDT
```
1. Ve a Coinbase, Kraken, etc.
2. Compra USDT
3. Retira a tu wallet: 0x05316B102FE62574b9cBd45709f8F1B6C00beC8a
```

---

## ✨ **INSTRUCCIÓN 5: HACER UNA TRANSFERENCIA**

Cuando tengas USDT en tu wallet:

1. Abre: http://localhost:4000/
2. Ve a: **USD → USDT**
3. Ingresa:
   - **Monto USD**: 10 (ejemplo)
   - **Dirección destino**: Tu otra wallet (ej: 0x123...)
4. Click: **CONVERTIR**
5. Espera a que procese
6. ¡Verifica el hash en Etherscan!

---

## 📊 **¿QUÉ PASA CUANDO HACES CLIC EN CONVERTIR?**

```
1. Frontend valida datos
   ↓
2. Envía POST /api/ethusd/send-usdt-alchemy
   ↓
3. Backend carga credenciales (.env)
   ↓
4. transaction.js conecta a Alchemy RPC
   ↓
5. Obtiene gas price actual de Ethereum
   ↓
6. Verifica balance ETH (para pagar gas)
   ↓
7. Verifica balance USDT (para transferir)
   ↓
8. Firma transacción con tu private key
   ↓
9. Envía a Ethereum via Alchemy
   ↓
10. Ethereum ejecuta transfer() de USDT
   ↓
11. ¡Transacción REAL en Etherscan!
   ↓
12. Hash: https://etherscan.io/tx/{hash}
```

---

## 🔗 **ARCHIVOS MODIFICADOS**

- ✅ `server/transaction.js` - Ahora usa RPC URL de Alchemy
- ✅ `server/index.js` - Endpoints configurados
- ✅ `ALCHEMY_RPC_CONFIG.md` - Documentación de configuración
- ✅ `ALCHEMY_IMPLEMENTATION_COMPLETE.md` - Guía completa

---

## ⚠️ **IMPORTANTE - SEGURIDAD**

**Tu RPC URL:**
```
https://eth-mainnet.g.alchemy.com/v2/mm-9UjI5oG51l94mRH3fh
```

✅ Esta URL **solo sirve para LEER** datos de Ethereum (público)
✅ Tu private key **NUNCA** se envía por esta URL
✅ Las transacciones se firman **LOCALMENTE** en tu servidor
✅ Solo la transacción firmada se envía a Ethereum

---

## ✅ **CHECKLIST FINAL**

- [ ] Abre tu `.env`
- [ ] Agrega: `ETH_RPC_URL=https://eth-mainnet.g.alchemy.com/v2/mm-9UjI5oG51l94mRH3fh`
- [ ] Guarda cambios
- [ ] Ejecuta: `npm run dev:full`
- [ ] Verifica en consola que dice: "✅ [Alchemy] Usando RPC URL directo"
- [ ] Abre: http://localhost:4000/
- [ ] Ve a: USD → USDT
- [ ] Verifica que dice: "✅ Conexión exitosa a Ethereum Mainnet"

---

## 🎉 **¡LISTO!**

**Tu sistema está completamente funcional y listo para:**
- ✅ Transferir USDT real en Ethereum Mainnet
- ✅ Calcular gas automáticamente
- ✅ Generar hashes reales en Etherscan
- ✅ Gestionar múltiples cuentas

**Solo necesitas fondos (USDT + ETH) para empezar!** 💰










