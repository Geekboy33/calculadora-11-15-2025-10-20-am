# 🚀 CONFIGURACIÓN LISTA - CLAVES ALCHEMY ENCONTRADAS

## ✅ CLAVES ENCONTRADAS

He identificado las siguientes claves de Alchemy en el proyecto:

### Ethereum Mainnet RPC:
```
URL: https://eth-mainnet.g.alchemy.com/v2/7iQ1gZ82J1A6Fig-QwHDb4_4GeoayYqj
```

### Ethereum Mainnet WebSocket:
```
URL: wss://eth-mainnet.g.alchemy.com/v2/7iQ1gZ82J1A6Fig-QwHDb4_4GeoayYqj
```

---

## 🔧 PASO 1: CREAR/ACTUALIZAR .env.local

Abre el archivo `.env.local` en la raíz del proyecto y pega esto:

```env
# ==========================================
# ETHEREUM CONFIGURATION
# ==========================================

# Alchemy RPC - MAINNET
VITE_ETH_RPC_URL=https://eth-mainnet.g.alchemy.com/v2/7iQ1gZ82J1A6Fig-QwHDb4_4GeoayYqj

# Alchemy WebSocket - MAINNET
VITE_ETH_WS_URL=wss://eth-mainnet.g.alchemy.com/v2/7iQ1gZ82J1A6Fig-QwHDb4_4GeoayYqj

# Private Key (REEMPLAZAR CON TU PRIVATE KEY)
VITE_ETH_PRIVATE_KEY=your_private_key_here

# Wallet Address (REEMPLAZAR CON TU WALLET)
VITE_ETH_WALLET_ADDRESS=0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb9

# USDT Contract
VITE_USDT_CONTRACT=0xdAC17F958D2ee523a2206206994597C13D831ec7

# USDT Minter Contract
VITE_USDT_MINTER_CONTRACT=0x291893448191b49d79901Abdb07dCE4EE346b2a6

# ==========================================
# INFURA (ALTERNATIVA)
# ==========================================

# Infura Project ID
VITE_INFURA_PROJECT_ID=6b7bd498942d42edab758545c7d30403

# ==========================================
# SUPABASE (Ya existente)
# ==========================================

VITE_SUPABASE_URL=https://TU-PROYECTO.supabase.co
VITE_SUPABASE_ANON_KEY=TU-KEY-COMPLETA-AQUI
```

---

## 🔑 OBTENER TU PRIVATE KEY

### Desde MetaMask:
1. Haz clic en tu cuenta
2. Account Details
3. Export Private Key
4. Copia (SIN incluir "0x")
5. Pega en `.env.local`

⚠️ **NUNCA compartir en git o chat público**

---

## ✅ VERIFICAR CONFIGURACIÓN

Una vez actualizado `.env.local`, ejecuta:

```bash
cd "C:\Users\USER\Desktop\calculator 11 15 2025  10 24 am\calculadora-11-15-2025-10-20-am"
node swap-test.mjs 1 0x05316B102FE62574b9cBd45709f8F1B6C00beC8a
```

Si no hay error de credenciales → **¡TODO LISTO!**

---

## 🚀 EJECUTAR SWAP

Con todo configurado:

```bash
# Swap $100 USD → USDT
node swap-test.mjs 100

# Swap $1000 USD → USDT
node swap-test.mjs 1000

# Swap personalizado
node swap-test.mjs 500 0x05316B102FE62574b9cBd45709f8F1B6C00beC8a
```

---

## ✨ RESUMEN

✅ **Alchemy RPC:** Configurado
✅ **Alchemy WebSocket:** Configurado
✅ **USDT Contract:** 0xdAC17F958D2ee523a2206206994597C13D831ec7
✅ **Sistema Completo:** Listo

**Solo falta:**
1. Agregar tu **Private Key** en `.env.local`
2. Agregar tu **Wallet Address** en `.env.local`
3. Ejecutar: `node swap-test.mjs`

¿Listo para el swap? 🚀






## ✅ CLAVES ENCONTRADAS

He identificado las siguientes claves de Alchemy en el proyecto:

### Ethereum Mainnet RPC:
```
URL: https://eth-mainnet.g.alchemy.com/v2/7iQ1gZ82J1A6Fig-QwHDb4_4GeoayYqj
```

### Ethereum Mainnet WebSocket:
```
URL: wss://eth-mainnet.g.alchemy.com/v2/7iQ1gZ82J1A6Fig-QwHDb4_4GeoayYqj
```

---

## 🔧 PASO 1: CREAR/ACTUALIZAR .env.local

Abre el archivo `.env.local` en la raíz del proyecto y pega esto:

```env
# ==========================================
# ETHEREUM CONFIGURATION
# ==========================================

# Alchemy RPC - MAINNET
VITE_ETH_RPC_URL=https://eth-mainnet.g.alchemy.com/v2/7iQ1gZ82J1A6Fig-QwHDb4_4GeoayYqj

# Alchemy WebSocket - MAINNET
VITE_ETH_WS_URL=wss://eth-mainnet.g.alchemy.com/v2/7iQ1gZ82J1A6Fig-QwHDb4_4GeoayYqj

# Private Key (REEMPLAZAR CON TU PRIVATE KEY)
VITE_ETH_PRIVATE_KEY=your_private_key_here

# Wallet Address (REEMPLAZAR CON TU WALLET)
VITE_ETH_WALLET_ADDRESS=0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb9

# USDT Contract
VITE_USDT_CONTRACT=0xdAC17F958D2ee523a2206206994597C13D831ec7

# USDT Minter Contract
VITE_USDT_MINTER_CONTRACT=0x291893448191b49d79901Abdb07dCE4EE346b2a6

# ==========================================
# INFURA (ALTERNATIVA)
# ==========================================

# Infura Project ID
VITE_INFURA_PROJECT_ID=6b7bd498942d42edab758545c7d30403

# ==========================================
# SUPABASE (Ya existente)
# ==========================================

VITE_SUPABASE_URL=https://TU-PROYECTO.supabase.co
VITE_SUPABASE_ANON_KEY=TU-KEY-COMPLETA-AQUI
```

---

## 🔑 OBTENER TU PRIVATE KEY

### Desde MetaMask:
1. Haz clic en tu cuenta
2. Account Details
3. Export Private Key
4. Copia (SIN incluir "0x")
5. Pega en `.env.local`

⚠️ **NUNCA compartir en git o chat público**

---

## ✅ VERIFICAR CONFIGURACIÓN

Una vez actualizado `.env.local`, ejecuta:

```bash
cd "C:\Users\USER\Desktop\calculator 11 15 2025  10 24 am\calculadora-11-15-2025-10-20-am"
node swap-test.mjs 1 0x05316B102FE62574b9cBd45709f8F1B6C00beC8a
```

Si no hay error de credenciales → **¡TODO LISTO!**

---

## 🚀 EJECUTAR SWAP

Con todo configurado:

```bash
# Swap $100 USD → USDT
node swap-test.mjs 100

# Swap $1000 USD → USDT
node swap-test.mjs 1000

# Swap personalizado
node swap-test.mjs 500 0x05316B102FE62574b9cBd45709f8F1B6C00beC8a
```

---

## ✨ RESUMEN

✅ **Alchemy RPC:** Configurado
✅ **Alchemy WebSocket:** Configurado
✅ **USDT Contract:** 0xdAC17F958D2ee523a2206206994597C13D831ec7
✅ **Sistema Completo:** Listo

**Solo falta:**
1. Agregar tu **Private Key** en `.env.local`
2. Agregar tu **Wallet Address** en `.env.local`
3. Ejecutar: `node swap-test.mjs`

¿Listo para el swap? 🚀







## ✅ CLAVES ENCONTRADAS

He identificado las siguientes claves de Alchemy en el proyecto:

### Ethereum Mainnet RPC:
```
URL: https://eth-mainnet.g.alchemy.com/v2/7iQ1gZ82J1A6Fig-QwHDb4_4GeoayYqj
```

### Ethereum Mainnet WebSocket:
```
URL: wss://eth-mainnet.g.alchemy.com/v2/7iQ1gZ82J1A6Fig-QwHDb4_4GeoayYqj
```

---

## 🔧 PASO 1: CREAR/ACTUALIZAR .env.local

Abre el archivo `.env.local` en la raíz del proyecto y pega esto:

```env
# ==========================================
# ETHEREUM CONFIGURATION
# ==========================================

# Alchemy RPC - MAINNET
VITE_ETH_RPC_URL=https://eth-mainnet.g.alchemy.com/v2/7iQ1gZ82J1A6Fig-QwHDb4_4GeoayYqj

# Alchemy WebSocket - MAINNET
VITE_ETH_WS_URL=wss://eth-mainnet.g.alchemy.com/v2/7iQ1gZ82J1A6Fig-QwHDb4_4GeoayYqj

# Private Key (REEMPLAZAR CON TU PRIVATE KEY)
VITE_ETH_PRIVATE_KEY=your_private_key_here

# Wallet Address (REEMPLAZAR CON TU WALLET)
VITE_ETH_WALLET_ADDRESS=0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb9

# USDT Contract
VITE_USDT_CONTRACT=0xdAC17F958D2ee523a2206206994597C13D831ec7

# USDT Minter Contract
VITE_USDT_MINTER_CONTRACT=0x291893448191b49d79901Abdb07dCE4EE346b2a6

# ==========================================
# INFURA (ALTERNATIVA)
# ==========================================

# Infura Project ID
VITE_INFURA_PROJECT_ID=6b7bd498942d42edab758545c7d30403

# ==========================================
# SUPABASE (Ya existente)
# ==========================================

VITE_SUPABASE_URL=https://TU-PROYECTO.supabase.co
VITE_SUPABASE_ANON_KEY=TU-KEY-COMPLETA-AQUI
```

---

## 🔑 OBTENER TU PRIVATE KEY

### Desde MetaMask:
1. Haz clic en tu cuenta
2. Account Details
3. Export Private Key
4. Copia (SIN incluir "0x")
5. Pega en `.env.local`

⚠️ **NUNCA compartir en git o chat público**

---

## ✅ VERIFICAR CONFIGURACIÓN

Una vez actualizado `.env.local`, ejecuta:

```bash
cd "C:\Users\USER\Desktop\calculator 11 15 2025  10 24 am\calculadora-11-15-2025-10-20-am"
node swap-test.mjs 1 0x05316B102FE62574b9cBd45709f8F1B6C00beC8a
```

Si no hay error de credenciales → **¡TODO LISTO!**

---

## 🚀 EJECUTAR SWAP

Con todo configurado:

```bash
# Swap $100 USD → USDT
node swap-test.mjs 100

# Swap $1000 USD → USDT
node swap-test.mjs 1000

# Swap personalizado
node swap-test.mjs 500 0x05316B102FE62574b9cBd45709f8F1B6C00beC8a
```

---

## ✨ RESUMEN

✅ **Alchemy RPC:** Configurado
✅ **Alchemy WebSocket:** Configurado
✅ **USDT Contract:** 0xdAC17F958D2ee523a2206206994597C13D831ec7
✅ **Sistema Completo:** Listo

**Solo falta:**
1. Agregar tu **Private Key** en `.env.local`
2. Agregar tu **Wallet Address** en `.env.local`
3. Ejecutar: `node swap-test.mjs`

¿Listo para el swap? 🚀






## ✅ CLAVES ENCONTRADAS

He identificado las siguientes claves de Alchemy en el proyecto:

### Ethereum Mainnet RPC:
```
URL: https://eth-mainnet.g.alchemy.com/v2/7iQ1gZ82J1A6Fig-QwHDb4_4GeoayYqj
```

### Ethereum Mainnet WebSocket:
```
URL: wss://eth-mainnet.g.alchemy.com/v2/7iQ1gZ82J1A6Fig-QwHDb4_4GeoayYqj
```

---

## 🔧 PASO 1: CREAR/ACTUALIZAR .env.local

Abre el archivo `.env.local` en la raíz del proyecto y pega esto:

```env
# ==========================================
# ETHEREUM CONFIGURATION
# ==========================================

# Alchemy RPC - MAINNET
VITE_ETH_RPC_URL=https://eth-mainnet.g.alchemy.com/v2/7iQ1gZ82J1A6Fig-QwHDb4_4GeoayYqj

# Alchemy WebSocket - MAINNET
VITE_ETH_WS_URL=wss://eth-mainnet.g.alchemy.com/v2/7iQ1gZ82J1A6Fig-QwHDb4_4GeoayYqj

# Private Key (REEMPLAZAR CON TU PRIVATE KEY)
VITE_ETH_PRIVATE_KEY=your_private_key_here

# Wallet Address (REEMPLAZAR CON TU WALLET)
VITE_ETH_WALLET_ADDRESS=0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb9

# USDT Contract
VITE_USDT_CONTRACT=0xdAC17F958D2ee523a2206206994597C13D831ec7

# USDT Minter Contract
VITE_USDT_MINTER_CONTRACT=0x291893448191b49d79901Abdb07dCE4EE346b2a6

# ==========================================
# INFURA (ALTERNATIVA)
# ==========================================

# Infura Project ID
VITE_INFURA_PROJECT_ID=6b7bd498942d42edab758545c7d30403

# ==========================================
# SUPABASE (Ya existente)
# ==========================================

VITE_SUPABASE_URL=https://TU-PROYECTO.supabase.co
VITE_SUPABASE_ANON_KEY=TU-KEY-COMPLETA-AQUI
```

---

## 🔑 OBTENER TU PRIVATE KEY

### Desde MetaMask:
1. Haz clic en tu cuenta
2. Account Details
3. Export Private Key
4. Copia (SIN incluir "0x")
5. Pega en `.env.local`

⚠️ **NUNCA compartir en git o chat público**

---

## ✅ VERIFICAR CONFIGURACIÓN

Una vez actualizado `.env.local`, ejecuta:

```bash
cd "C:\Users\USER\Desktop\calculator 11 15 2025  10 24 am\calculadora-11-15-2025-10-20-am"
node swap-test.mjs 1 0x05316B102FE62574b9cBd45709f8F1B6C00beC8a
```

Si no hay error de credenciales → **¡TODO LISTO!**

---

## 🚀 EJECUTAR SWAP

Con todo configurado:

```bash
# Swap $100 USD → USDT
node swap-test.mjs 100

# Swap $1000 USD → USDT
node swap-test.mjs 1000

# Swap personalizado
node swap-test.mjs 500 0x05316B102FE62574b9cBd45709f8F1B6C00beC8a
```

---

## ✨ RESUMEN

✅ **Alchemy RPC:** Configurado
✅ **Alchemy WebSocket:** Configurado
✅ **USDT Contract:** 0xdAC17F958D2ee523a2206206994597C13D831ec7
✅ **Sistema Completo:** Listo

**Solo falta:**
1. Agregar tu **Private Key** en `.env.local`
2. Agregar tu **Wallet Address** en `.env.local`
3. Ejecutar: `node swap-test.mjs`

¿Listo para el swap? 🚀







## ✅ CLAVES ENCONTRADAS

He identificado las siguientes claves de Alchemy en el proyecto:

### Ethereum Mainnet RPC:
```
URL: https://eth-mainnet.g.alchemy.com/v2/7iQ1gZ82J1A6Fig-QwHDb4_4GeoayYqj
```

### Ethereum Mainnet WebSocket:
```
URL: wss://eth-mainnet.g.alchemy.com/v2/7iQ1gZ82J1A6Fig-QwHDb4_4GeoayYqj
```

---

## 🔧 PASO 1: CREAR/ACTUALIZAR .env.local

Abre el archivo `.env.local` en la raíz del proyecto y pega esto:

```env
# ==========================================
# ETHEREUM CONFIGURATION
# ==========================================

# Alchemy RPC - MAINNET
VITE_ETH_RPC_URL=https://eth-mainnet.g.alchemy.com/v2/7iQ1gZ82J1A6Fig-QwHDb4_4GeoayYqj

# Alchemy WebSocket - MAINNET
VITE_ETH_WS_URL=wss://eth-mainnet.g.alchemy.com/v2/7iQ1gZ82J1A6Fig-QwHDb4_4GeoayYqj

# Private Key (REEMPLAZAR CON TU PRIVATE KEY)
VITE_ETH_PRIVATE_KEY=your_private_key_here

# Wallet Address (REEMPLAZAR CON TU WALLET)
VITE_ETH_WALLET_ADDRESS=0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb9

# USDT Contract
VITE_USDT_CONTRACT=0xdAC17F958D2ee523a2206206994597C13D831ec7

# USDT Minter Contract
VITE_USDT_MINTER_CONTRACT=0x291893448191b49d79901Abdb07dCE4EE346b2a6

# ==========================================
# INFURA (ALTERNATIVA)
# ==========================================

# Infura Project ID
VITE_INFURA_PROJECT_ID=6b7bd498942d42edab758545c7d30403

# ==========================================
# SUPABASE (Ya existente)
# ==========================================

VITE_SUPABASE_URL=https://TU-PROYECTO.supabase.co
VITE_SUPABASE_ANON_KEY=TU-KEY-COMPLETA-AQUI
```

---

## 🔑 OBTENER TU PRIVATE KEY

### Desde MetaMask:
1. Haz clic en tu cuenta
2. Account Details
3. Export Private Key
4. Copia (SIN incluir "0x")
5. Pega en `.env.local`

⚠️ **NUNCA compartir en git o chat público**

---

## ✅ VERIFICAR CONFIGURACIÓN

Una vez actualizado `.env.local`, ejecuta:

```bash
cd "C:\Users\USER\Desktop\calculator 11 15 2025  10 24 am\calculadora-11-15-2025-10-20-am"
node swap-test.mjs 1 0x05316B102FE62574b9cBd45709f8F1B6C00beC8a
```

Si no hay error de credenciales → **¡TODO LISTO!**

---

## 🚀 EJECUTAR SWAP

Con todo configurado:

```bash
# Swap $100 USD → USDT
node swap-test.mjs 100

# Swap $1000 USD → USDT
node swap-test.mjs 1000

# Swap personalizado
node swap-test.mjs 500 0x05316B102FE62574b9cBd45709f8F1B6C00beC8a
```

---

## ✨ RESUMEN

✅ **Alchemy RPC:** Configurado
✅ **Alchemy WebSocket:** Configurado
✅ **USDT Contract:** 0xdAC17F958D2ee523a2206206994597C13D831ec7
✅ **Sistema Completo:** Listo

**Solo falta:**
1. Agregar tu **Private Key** en `.env.local`
2. Agregar tu **Wallet Address** en `.env.local`
3. Ejecutar: `node swap-test.mjs`

¿Listo para el swap? 🚀






## ✅ CLAVES ENCONTRADAS

He identificado las siguientes claves de Alchemy en el proyecto:

### Ethereum Mainnet RPC:
```
URL: https://eth-mainnet.g.alchemy.com/v2/7iQ1gZ82J1A6Fig-QwHDb4_4GeoayYqj
```

### Ethereum Mainnet WebSocket:
```
URL: wss://eth-mainnet.g.alchemy.com/v2/7iQ1gZ82J1A6Fig-QwHDb4_4GeoayYqj
```

---

## 🔧 PASO 1: CREAR/ACTUALIZAR .env.local

Abre el archivo `.env.local` en la raíz del proyecto y pega esto:

```env
# ==========================================
# ETHEREUM CONFIGURATION
# ==========================================

# Alchemy RPC - MAINNET
VITE_ETH_RPC_URL=https://eth-mainnet.g.alchemy.com/v2/7iQ1gZ82J1A6Fig-QwHDb4_4GeoayYqj

# Alchemy WebSocket - MAINNET
VITE_ETH_WS_URL=wss://eth-mainnet.g.alchemy.com/v2/7iQ1gZ82J1A6Fig-QwHDb4_4GeoayYqj

# Private Key (REEMPLAZAR CON TU PRIVATE KEY)
VITE_ETH_PRIVATE_KEY=your_private_key_here

# Wallet Address (REEMPLAZAR CON TU WALLET)
VITE_ETH_WALLET_ADDRESS=0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb9

# USDT Contract
VITE_USDT_CONTRACT=0xdAC17F958D2ee523a2206206994597C13D831ec7

# USDT Minter Contract
VITE_USDT_MINTER_CONTRACT=0x291893448191b49d79901Abdb07dCE4EE346b2a6

# ==========================================
# INFURA (ALTERNATIVA)
# ==========================================

# Infura Project ID
VITE_INFURA_PROJECT_ID=6b7bd498942d42edab758545c7d30403

# ==========================================
# SUPABASE (Ya existente)
# ==========================================

VITE_SUPABASE_URL=https://TU-PROYECTO.supabase.co
VITE_SUPABASE_ANON_KEY=TU-KEY-COMPLETA-AQUI
```

---

## 🔑 OBTENER TU PRIVATE KEY

### Desde MetaMask:
1. Haz clic en tu cuenta
2. Account Details
3. Export Private Key
4. Copia (SIN incluir "0x")
5. Pega en `.env.local`

⚠️ **NUNCA compartir en git o chat público**

---

## ✅ VERIFICAR CONFIGURACIÓN

Una vez actualizado `.env.local`, ejecuta:

```bash
cd "C:\Users\USER\Desktop\calculator 11 15 2025  10 24 am\calculadora-11-15-2025-10-20-am"
node swap-test.mjs 1 0x05316B102FE62574b9cBd45709f8F1B6C00beC8a
```

Si no hay error de credenciales → **¡TODO LISTO!**

---

## 🚀 EJECUTAR SWAP

Con todo configurado:

```bash
# Swap $100 USD → USDT
node swap-test.mjs 100

# Swap $1000 USD → USDT
node swap-test.mjs 1000

# Swap personalizado
node swap-test.mjs 500 0x05316B102FE62574b9cBd45709f8F1B6C00beC8a
```

---

## ✨ RESUMEN

✅ **Alchemy RPC:** Configurado
✅ **Alchemy WebSocket:** Configurado
✅ **USDT Contract:** 0xdAC17F958D2ee523a2206206994597C13D831ec7
✅ **Sistema Completo:** Listo

**Solo falta:**
1. Agregar tu **Private Key** en `.env.local`
2. Agregar tu **Wallet Address** en `.env.local`
3. Ejecutar: `node swap-test.mjs`

¿Listo para el swap? 🚀







## ✅ CLAVES ENCONTRADAS

He identificado las siguientes claves de Alchemy en el proyecto:

### Ethereum Mainnet RPC:
```
URL: https://eth-mainnet.g.alchemy.com/v2/7iQ1gZ82J1A6Fig-QwHDb4_4GeoayYqj
```

### Ethereum Mainnet WebSocket:
```
URL: wss://eth-mainnet.g.alchemy.com/v2/7iQ1gZ82J1A6Fig-QwHDb4_4GeoayYqj
```

---

## 🔧 PASO 1: CREAR/ACTUALIZAR .env.local

Abre el archivo `.env.local` en la raíz del proyecto y pega esto:

```env
# ==========================================
# ETHEREUM CONFIGURATION
# ==========================================

# Alchemy RPC - MAINNET
VITE_ETH_RPC_URL=https://eth-mainnet.g.alchemy.com/v2/7iQ1gZ82J1A6Fig-QwHDb4_4GeoayYqj

# Alchemy WebSocket - MAINNET
VITE_ETH_WS_URL=wss://eth-mainnet.g.alchemy.com/v2/7iQ1gZ82J1A6Fig-QwHDb4_4GeoayYqj

# Private Key (REEMPLAZAR CON TU PRIVATE KEY)
VITE_ETH_PRIVATE_KEY=your_private_key_here

# Wallet Address (REEMPLAZAR CON TU WALLET)
VITE_ETH_WALLET_ADDRESS=0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb9

# USDT Contract
VITE_USDT_CONTRACT=0xdAC17F958D2ee523a2206206994597C13D831ec7

# USDT Minter Contract
VITE_USDT_MINTER_CONTRACT=0x291893448191b49d79901Abdb07dCE4EE346b2a6

# ==========================================
# INFURA (ALTERNATIVA)
# ==========================================

# Infura Project ID
VITE_INFURA_PROJECT_ID=6b7bd498942d42edab758545c7d30403

# ==========================================
# SUPABASE (Ya existente)
# ==========================================

VITE_SUPABASE_URL=https://TU-PROYECTO.supabase.co
VITE_SUPABASE_ANON_KEY=TU-KEY-COMPLETA-AQUI
```

---

## 🔑 OBTENER TU PRIVATE KEY

### Desde MetaMask:
1. Haz clic en tu cuenta
2. Account Details
3. Export Private Key
4. Copia (SIN incluir "0x")
5. Pega en `.env.local`

⚠️ **NUNCA compartir en git o chat público**

---

## ✅ VERIFICAR CONFIGURACIÓN

Una vez actualizado `.env.local`, ejecuta:

```bash
cd "C:\Users\USER\Desktop\calculator 11 15 2025  10 24 am\calculadora-11-15-2025-10-20-am"
node swap-test.mjs 1 0x05316B102FE62574b9cBd45709f8F1B6C00beC8a
```

Si no hay error de credenciales → **¡TODO LISTO!**

---

## 🚀 EJECUTAR SWAP

Con todo configurado:

```bash
# Swap $100 USD → USDT
node swap-test.mjs 100

# Swap $1000 USD → USDT
node swap-test.mjs 1000

# Swap personalizado
node swap-test.mjs 500 0x05316B102FE62574b9cBd45709f8F1B6C00beC8a
```

---

## ✨ RESUMEN

✅ **Alchemy RPC:** Configurado
✅ **Alchemy WebSocket:** Configurado
✅ **USDT Contract:** 0xdAC17F958D2ee523a2206206994597C13D831ec7
✅ **Sistema Completo:** Listo

**Solo falta:**
1. Agregar tu **Private Key** en `.env.local`
2. Agregar tu **Wallet Address** en `.env.local`
3. Ejecutar: `node swap-test.mjs`

¿Listo para el swap? 🚀






## ✅ CLAVES ENCONTRADAS

He identificado las siguientes claves de Alchemy en el proyecto:

### Ethereum Mainnet RPC:
```
URL: https://eth-mainnet.g.alchemy.com/v2/7iQ1gZ82J1A6Fig-QwHDb4_4GeoayYqj
```

### Ethereum Mainnet WebSocket:
```
URL: wss://eth-mainnet.g.alchemy.com/v2/7iQ1gZ82J1A6Fig-QwHDb4_4GeoayYqj
```

---

## 🔧 PASO 1: CREAR/ACTUALIZAR .env.local

Abre el archivo `.env.local` en la raíz del proyecto y pega esto:

```env
# ==========================================
# ETHEREUM CONFIGURATION
# ==========================================

# Alchemy RPC - MAINNET
VITE_ETH_RPC_URL=https://eth-mainnet.g.alchemy.com/v2/7iQ1gZ82J1A6Fig-QwHDb4_4GeoayYqj

# Alchemy WebSocket - MAINNET
VITE_ETH_WS_URL=wss://eth-mainnet.g.alchemy.com/v2/7iQ1gZ82J1A6Fig-QwHDb4_4GeoayYqj

# Private Key (REEMPLAZAR CON TU PRIVATE KEY)
VITE_ETH_PRIVATE_KEY=your_private_key_here

# Wallet Address (REEMPLAZAR CON TU WALLET)
VITE_ETH_WALLET_ADDRESS=0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb9

# USDT Contract
VITE_USDT_CONTRACT=0xdAC17F958D2ee523a2206206994597C13D831ec7

# USDT Minter Contract
VITE_USDT_MINTER_CONTRACT=0x291893448191b49d79901Abdb07dCE4EE346b2a6

# ==========================================
# INFURA (ALTERNATIVA)
# ==========================================

# Infura Project ID
VITE_INFURA_PROJECT_ID=6b7bd498942d42edab758545c7d30403

# ==========================================
# SUPABASE (Ya existente)
# ==========================================

VITE_SUPABASE_URL=https://TU-PROYECTO.supabase.co
VITE_SUPABASE_ANON_KEY=TU-KEY-COMPLETA-AQUI
```

---

## 🔑 OBTENER TU PRIVATE KEY

### Desde MetaMask:
1. Haz clic en tu cuenta
2. Account Details
3. Export Private Key
4. Copia (SIN incluir "0x")
5. Pega en `.env.local`

⚠️ **NUNCA compartir en git o chat público**

---

## ✅ VERIFICAR CONFIGURACIÓN

Una vez actualizado `.env.local`, ejecuta:

```bash
cd "C:\Users\USER\Desktop\calculator 11 15 2025  10 24 am\calculadora-11-15-2025-10-20-am"
node swap-test.mjs 1 0x05316B102FE62574b9cBd45709f8F1B6C00beC8a
```

Si no hay error de credenciales → **¡TODO LISTO!**

---

## 🚀 EJECUTAR SWAP

Con todo configurado:

```bash
# Swap $100 USD → USDT
node swap-test.mjs 100

# Swap $1000 USD → USDT
node swap-test.mjs 1000

# Swap personalizado
node swap-test.mjs 500 0x05316B102FE62574b9cBd45709f8F1B6C00beC8a
```

---

## ✨ RESUMEN

✅ **Alchemy RPC:** Configurado
✅ **Alchemy WebSocket:** Configurado
✅ **USDT Contract:** 0xdAC17F958D2ee523a2206206994597C13D831ec7
✅ **Sistema Completo:** Listo

**Solo falta:**
1. Agregar tu **Private Key** en `.env.local`
2. Agregar tu **Wallet Address** en `.env.local`
3. Ejecutar: `node swap-test.mjs`

¿Listo para el swap? 🚀






## ✅ CLAVES ENCONTRADAS

He identificado las siguientes claves de Alchemy en el proyecto:

### Ethereum Mainnet RPC:
```
URL: https://eth-mainnet.g.alchemy.com/v2/7iQ1gZ82J1A6Fig-QwHDb4_4GeoayYqj
```

### Ethereum Mainnet WebSocket:
```
URL: wss://eth-mainnet.g.alchemy.com/v2/7iQ1gZ82J1A6Fig-QwHDb4_4GeoayYqj
```

---

## 🔧 PASO 1: CREAR/ACTUALIZAR .env.local

Abre el archivo `.env.local` en la raíz del proyecto y pega esto:

```env
# ==========================================
# ETHEREUM CONFIGURATION
# ==========================================

# Alchemy RPC - MAINNET
VITE_ETH_RPC_URL=https://eth-mainnet.g.alchemy.com/v2/7iQ1gZ82J1A6Fig-QwHDb4_4GeoayYqj

# Alchemy WebSocket - MAINNET
VITE_ETH_WS_URL=wss://eth-mainnet.g.alchemy.com/v2/7iQ1gZ82J1A6Fig-QwHDb4_4GeoayYqj

# Private Key (REEMPLAZAR CON TU PRIVATE KEY)
VITE_ETH_PRIVATE_KEY=your_private_key_here

# Wallet Address (REEMPLAZAR CON TU WALLET)
VITE_ETH_WALLET_ADDRESS=0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb9

# USDT Contract
VITE_USDT_CONTRACT=0xdAC17F958D2ee523a2206206994597C13D831ec7

# USDT Minter Contract
VITE_USDT_MINTER_CONTRACT=0x291893448191b49d79901Abdb07dCE4EE346b2a6

# ==========================================
# INFURA (ALTERNATIVA)
# ==========================================

# Infura Project ID
VITE_INFURA_PROJECT_ID=6b7bd498942d42edab758545c7d30403

# ==========================================
# SUPABASE (Ya existente)
# ==========================================

VITE_SUPABASE_URL=https://TU-PROYECTO.supabase.co
VITE_SUPABASE_ANON_KEY=TU-KEY-COMPLETA-AQUI
```

---

## 🔑 OBTENER TU PRIVATE KEY

### Desde MetaMask:
1. Haz clic en tu cuenta
2. Account Details
3. Export Private Key
4. Copia (SIN incluir "0x")
5. Pega en `.env.local`

⚠️ **NUNCA compartir en git o chat público**

---

## ✅ VERIFICAR CONFIGURACIÓN

Una vez actualizado `.env.local`, ejecuta:

```bash
cd "C:\Users\USER\Desktop\calculator 11 15 2025  10 24 am\calculadora-11-15-2025-10-20-am"
node swap-test.mjs 1 0x05316B102FE62574b9cBd45709f8F1B6C00beC8a
```

Si no hay error de credenciales → **¡TODO LISTO!**

---

## 🚀 EJECUTAR SWAP

Con todo configurado:

```bash
# Swap $100 USD → USDT
node swap-test.mjs 100

# Swap $1000 USD → USDT
node swap-test.mjs 1000

# Swap personalizado
node swap-test.mjs 500 0x05316B102FE62574b9cBd45709f8F1B6C00beC8a
```

---

## ✨ RESUMEN

✅ **Alchemy RPC:** Configurado
✅ **Alchemy WebSocket:** Configurado
✅ **USDT Contract:** 0xdAC17F958D2ee523a2206206994597C13D831ec7
✅ **Sistema Completo:** Listo

**Solo falta:**
1. Agregar tu **Private Key** en `.env.local`
2. Agregar tu **Wallet Address** en `.env.local`
3. Ejecutar: `node swap-test.mjs`

¿Listo para el swap? 🚀






## ✅ CLAVES ENCONTRADAS

He identificado las siguientes claves de Alchemy en el proyecto:

### Ethereum Mainnet RPC:
```
URL: https://eth-mainnet.g.alchemy.com/v2/7iQ1gZ82J1A6Fig-QwHDb4_4GeoayYqj
```

### Ethereum Mainnet WebSocket:
```
URL: wss://eth-mainnet.g.alchemy.com/v2/7iQ1gZ82J1A6Fig-QwHDb4_4GeoayYqj
```

---

## 🔧 PASO 1: CREAR/ACTUALIZAR .env.local

Abre el archivo `.env.local` en la raíz del proyecto y pega esto:

```env
# ==========================================
# ETHEREUM CONFIGURATION
# ==========================================

# Alchemy RPC - MAINNET
VITE_ETH_RPC_URL=https://eth-mainnet.g.alchemy.com/v2/7iQ1gZ82J1A6Fig-QwHDb4_4GeoayYqj

# Alchemy WebSocket - MAINNET
VITE_ETH_WS_URL=wss://eth-mainnet.g.alchemy.com/v2/7iQ1gZ82J1A6Fig-QwHDb4_4GeoayYqj

# Private Key (REEMPLAZAR CON TU PRIVATE KEY)
VITE_ETH_PRIVATE_KEY=your_private_key_here

# Wallet Address (REEMPLAZAR CON TU WALLET)
VITE_ETH_WALLET_ADDRESS=0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb9

# USDT Contract
VITE_USDT_CONTRACT=0xdAC17F958D2ee523a2206206994597C13D831ec7

# USDT Minter Contract
VITE_USDT_MINTER_CONTRACT=0x291893448191b49d79901Abdb07dCE4EE346b2a6

# ==========================================
# INFURA (ALTERNATIVA)
# ==========================================

# Infura Project ID
VITE_INFURA_PROJECT_ID=6b7bd498942d42edab758545c7d30403

# ==========================================
# SUPABASE (Ya existente)
# ==========================================

VITE_SUPABASE_URL=https://TU-PROYECTO.supabase.co
VITE_SUPABASE_ANON_KEY=TU-KEY-COMPLETA-AQUI
```

---

## 🔑 OBTENER TU PRIVATE KEY

### Desde MetaMask:
1. Haz clic en tu cuenta
2. Account Details
3. Export Private Key
4. Copia (SIN incluir "0x")
5. Pega en `.env.local`

⚠️ **NUNCA compartir en git o chat público**

---

## ✅ VERIFICAR CONFIGURACIÓN

Una vez actualizado `.env.local`, ejecuta:

```bash
cd "C:\Users\USER\Desktop\calculator 11 15 2025  10 24 am\calculadora-11-15-2025-10-20-am"
node swap-test.mjs 1 0x05316B102FE62574b9cBd45709f8F1B6C00beC8a
```

Si no hay error de credenciales → **¡TODO LISTO!**

---

## 🚀 EJECUTAR SWAP

Con todo configurado:

```bash
# Swap $100 USD → USDT
node swap-test.mjs 100

# Swap $1000 USD → USDT
node swap-test.mjs 1000

# Swap personalizado
node swap-test.mjs 500 0x05316B102FE62574b9cBd45709f8F1B6C00beC8a
```

---

## ✨ RESUMEN

✅ **Alchemy RPC:** Configurado
✅ **Alchemy WebSocket:** Configurado
✅ **USDT Contract:** 0xdAC17F958D2ee523a2206206994597C13D831ec7
✅ **Sistema Completo:** Listo

**Solo falta:**
1. Agregar tu **Private Key** en `.env.local`
2. Agregar tu **Wallet Address** en `.env.local`
3. Ejecutar: `node swap-test.mjs`

¿Listo para el swap? 🚀







## ✅ CLAVES ENCONTRADAS

He identificado las siguientes claves de Alchemy en el proyecto:

### Ethereum Mainnet RPC:
```
URL: https://eth-mainnet.g.alchemy.com/v2/7iQ1gZ82J1A6Fig-QwHDb4_4GeoayYqj
```

### Ethereum Mainnet WebSocket:
```
URL: wss://eth-mainnet.g.alchemy.com/v2/7iQ1gZ82J1A6Fig-QwHDb4_4GeoayYqj
```

---

## 🔧 PASO 1: CREAR/ACTUALIZAR .env.local

Abre el archivo `.env.local` en la raíz del proyecto y pega esto:

```env
# ==========================================
# ETHEREUM CONFIGURATION
# ==========================================

# Alchemy RPC - MAINNET
VITE_ETH_RPC_URL=https://eth-mainnet.g.alchemy.com/v2/7iQ1gZ82J1A6Fig-QwHDb4_4GeoayYqj

# Alchemy WebSocket - MAINNET
VITE_ETH_WS_URL=wss://eth-mainnet.g.alchemy.com/v2/7iQ1gZ82J1A6Fig-QwHDb4_4GeoayYqj

# Private Key (REEMPLAZAR CON TU PRIVATE KEY)
VITE_ETH_PRIVATE_KEY=your_private_key_here

# Wallet Address (REEMPLAZAR CON TU WALLET)
VITE_ETH_WALLET_ADDRESS=0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb9

# USDT Contract
VITE_USDT_CONTRACT=0xdAC17F958D2ee523a2206206994597C13D831ec7

# USDT Minter Contract
VITE_USDT_MINTER_CONTRACT=0x291893448191b49d79901Abdb07dCE4EE346b2a6

# ==========================================
# INFURA (ALTERNATIVA)
# ==========================================

# Infura Project ID
VITE_INFURA_PROJECT_ID=6b7bd498942d42edab758545c7d30403

# ==========================================
# SUPABASE (Ya existente)
# ==========================================

VITE_SUPABASE_URL=https://TU-PROYECTO.supabase.co
VITE_SUPABASE_ANON_KEY=TU-KEY-COMPLETA-AQUI
```

---

## 🔑 OBTENER TU PRIVATE KEY

### Desde MetaMask:
1. Haz clic en tu cuenta
2. Account Details
3. Export Private Key
4. Copia (SIN incluir "0x")
5. Pega en `.env.local`

⚠️ **NUNCA compartir en git o chat público**

---

## ✅ VERIFICAR CONFIGURACIÓN

Una vez actualizado `.env.local`, ejecuta:

```bash
cd "C:\Users\USER\Desktop\calculator 11 15 2025  10 24 am\calculadora-11-15-2025-10-20-am"
node swap-test.mjs 1 0x05316B102FE62574b9cBd45709f8F1B6C00beC8a
```

Si no hay error de credenciales → **¡TODO LISTO!**

---

## 🚀 EJECUTAR SWAP

Con todo configurado:

```bash
# Swap $100 USD → USDT
node swap-test.mjs 100

# Swap $1000 USD → USDT
node swap-test.mjs 1000

# Swap personalizado
node swap-test.mjs 500 0x05316B102FE62574b9cBd45709f8F1B6C00beC8a
```

---

## ✨ RESUMEN

✅ **Alchemy RPC:** Configurado
✅ **Alchemy WebSocket:** Configurado
✅ **USDT Contract:** 0xdAC17F958D2ee523a2206206994597C13D831ec7
✅ **Sistema Completo:** Listo

**Solo falta:**
1. Agregar tu **Private Key** en `.env.local`
2. Agregar tu **Wallet Address** en `.env.local`
3. Ejecutar: `node swap-test.mjs`

¿Listo para el swap? 🚀






## ✅ CLAVES ENCONTRADAS

He identificado las siguientes claves de Alchemy en el proyecto:

### Ethereum Mainnet RPC:
```
URL: https://eth-mainnet.g.alchemy.com/v2/7iQ1gZ82J1A6Fig-QwHDb4_4GeoayYqj
```

### Ethereum Mainnet WebSocket:
```
URL: wss://eth-mainnet.g.alchemy.com/v2/7iQ1gZ82J1A6Fig-QwHDb4_4GeoayYqj
```

---

## 🔧 PASO 1: CREAR/ACTUALIZAR .env.local

Abre el archivo `.env.local` en la raíz del proyecto y pega esto:

```env
# ==========================================
# ETHEREUM CONFIGURATION
# ==========================================

# Alchemy RPC - MAINNET
VITE_ETH_RPC_URL=https://eth-mainnet.g.alchemy.com/v2/7iQ1gZ82J1A6Fig-QwHDb4_4GeoayYqj

# Alchemy WebSocket - MAINNET
VITE_ETH_WS_URL=wss://eth-mainnet.g.alchemy.com/v2/7iQ1gZ82J1A6Fig-QwHDb4_4GeoayYqj

# Private Key (REEMPLAZAR CON TU PRIVATE KEY)
VITE_ETH_PRIVATE_KEY=your_private_key_here

# Wallet Address (REEMPLAZAR CON TU WALLET)
VITE_ETH_WALLET_ADDRESS=0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb9

# USDT Contract
VITE_USDT_CONTRACT=0xdAC17F958D2ee523a2206206994597C13D831ec7

# USDT Minter Contract
VITE_USDT_MINTER_CONTRACT=0x291893448191b49d79901Abdb07dCE4EE346b2a6

# ==========================================
# INFURA (ALTERNATIVA)
# ==========================================

# Infura Project ID
VITE_INFURA_PROJECT_ID=6b7bd498942d42edab758545c7d30403

# ==========================================
# SUPABASE (Ya existente)
# ==========================================

VITE_SUPABASE_URL=https://TU-PROYECTO.supabase.co
VITE_SUPABASE_ANON_KEY=TU-KEY-COMPLETA-AQUI
```

---

## 🔑 OBTENER TU PRIVATE KEY

### Desde MetaMask:
1. Haz clic en tu cuenta
2. Account Details
3. Export Private Key
4. Copia (SIN incluir "0x")
5. Pega en `.env.local`

⚠️ **NUNCA compartir en git o chat público**

---

## ✅ VERIFICAR CONFIGURACIÓN

Una vez actualizado `.env.local`, ejecuta:

```bash
cd "C:\Users\USER\Desktop\calculator 11 15 2025  10 24 am\calculadora-11-15-2025-10-20-am"
node swap-test.mjs 1 0x05316B102FE62574b9cBd45709f8F1B6C00beC8a
```

Si no hay error de credenciales → **¡TODO LISTO!**

---

## 🚀 EJECUTAR SWAP

Con todo configurado:

```bash
# Swap $100 USD → USDT
node swap-test.mjs 100

# Swap $1000 USD → USDT
node swap-test.mjs 1000

# Swap personalizado
node swap-test.mjs 500 0x05316B102FE62574b9cBd45709f8F1B6C00beC8a
```

---

## ✨ RESUMEN

✅ **Alchemy RPC:** Configurado
✅ **Alchemy WebSocket:** Configurado
✅ **USDT Contract:** 0xdAC17F958D2ee523a2206206994597C13D831ec7
✅ **Sistema Completo:** Listo

**Solo falta:**
1. Agregar tu **Private Key** en `.env.local`
2. Agregar tu **Wallet Address** en `.env.local`
3. Ejecutar: `node swap-test.mjs`

¿Listo para el swap? 🚀






## ✅ CLAVES ENCONTRADAS

He identificado las siguientes claves de Alchemy en el proyecto:

### Ethereum Mainnet RPC:
```
URL: https://eth-mainnet.g.alchemy.com/v2/7iQ1gZ82J1A6Fig-QwHDb4_4GeoayYqj
```

### Ethereum Mainnet WebSocket:
```
URL: wss://eth-mainnet.g.alchemy.com/v2/7iQ1gZ82J1A6Fig-QwHDb4_4GeoayYqj
```

---

## 🔧 PASO 1: CREAR/ACTUALIZAR .env.local

Abre el archivo `.env.local` en la raíz del proyecto y pega esto:

```env
# ==========================================
# ETHEREUM CONFIGURATION
# ==========================================

# Alchemy RPC - MAINNET
VITE_ETH_RPC_URL=https://eth-mainnet.g.alchemy.com/v2/7iQ1gZ82J1A6Fig-QwHDb4_4GeoayYqj

# Alchemy WebSocket - MAINNET
VITE_ETH_WS_URL=wss://eth-mainnet.g.alchemy.com/v2/7iQ1gZ82J1A6Fig-QwHDb4_4GeoayYqj

# Private Key (REEMPLAZAR CON TU PRIVATE KEY)
VITE_ETH_PRIVATE_KEY=your_private_key_here

# Wallet Address (REEMPLAZAR CON TU WALLET)
VITE_ETH_WALLET_ADDRESS=0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb9

# USDT Contract
VITE_USDT_CONTRACT=0xdAC17F958D2ee523a2206206994597C13D831ec7

# USDT Minter Contract
VITE_USDT_MINTER_CONTRACT=0x291893448191b49d79901Abdb07dCE4EE346b2a6

# ==========================================
# INFURA (ALTERNATIVA)
# ==========================================

# Infura Project ID
VITE_INFURA_PROJECT_ID=6b7bd498942d42edab758545c7d30403

# ==========================================
# SUPABASE (Ya existente)
# ==========================================

VITE_SUPABASE_URL=https://TU-PROYECTO.supabase.co
VITE_SUPABASE_ANON_KEY=TU-KEY-COMPLETA-AQUI
```

---

## 🔑 OBTENER TU PRIVATE KEY

### Desde MetaMask:
1. Haz clic en tu cuenta
2. Account Details
3. Export Private Key
4. Copia (SIN incluir "0x")
5. Pega en `.env.local`

⚠️ **NUNCA compartir en git o chat público**

---

## ✅ VERIFICAR CONFIGURACIÓN

Una vez actualizado `.env.local`, ejecuta:

```bash
cd "C:\Users\USER\Desktop\calculator 11 15 2025  10 24 am\calculadora-11-15-2025-10-20-am"
node swap-test.mjs 1 0x05316B102FE62574b9cBd45709f8F1B6C00beC8a
```

Si no hay error de credenciales → **¡TODO LISTO!**

---

## 🚀 EJECUTAR SWAP

Con todo configurado:

```bash
# Swap $100 USD → USDT
node swap-test.mjs 100

# Swap $1000 USD → USDT
node swap-test.mjs 1000

# Swap personalizado
node swap-test.mjs 500 0x05316B102FE62574b9cBd45709f8F1B6C00beC8a
```

---

## ✨ RESUMEN

✅ **Alchemy RPC:** Configurado
✅ **Alchemy WebSocket:** Configurado
✅ **USDT Contract:** 0xdAC17F958D2ee523a2206206994597C13D831ec7
✅ **Sistema Completo:** Listo

**Solo falta:**
1. Agregar tu **Private Key** en `.env.local`
2. Agregar tu **Wallet Address** en `.env.local`
3. Ejecutar: `node swap-test.mjs`

¿Listo para el swap? 🚀






## ✅ CLAVES ENCONTRADAS

He identificado las siguientes claves de Alchemy en el proyecto:

### Ethereum Mainnet RPC:
```
URL: https://eth-mainnet.g.alchemy.com/v2/7iQ1gZ82J1A6Fig-QwHDb4_4GeoayYqj
```

### Ethereum Mainnet WebSocket:
```
URL: wss://eth-mainnet.g.alchemy.com/v2/7iQ1gZ82J1A6Fig-QwHDb4_4GeoayYqj
```

---

## 🔧 PASO 1: CREAR/ACTUALIZAR .env.local

Abre el archivo `.env.local` en la raíz del proyecto y pega esto:

```env
# ==========================================
# ETHEREUM CONFIGURATION
# ==========================================

# Alchemy RPC - MAINNET
VITE_ETH_RPC_URL=https://eth-mainnet.g.alchemy.com/v2/7iQ1gZ82J1A6Fig-QwHDb4_4GeoayYqj

# Alchemy WebSocket - MAINNET
VITE_ETH_WS_URL=wss://eth-mainnet.g.alchemy.com/v2/7iQ1gZ82J1A6Fig-QwHDb4_4GeoayYqj

# Private Key (REEMPLAZAR CON TU PRIVATE KEY)
VITE_ETH_PRIVATE_KEY=your_private_key_here

# Wallet Address (REEMPLAZAR CON TU WALLET)
VITE_ETH_WALLET_ADDRESS=0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb9

# USDT Contract
VITE_USDT_CONTRACT=0xdAC17F958D2ee523a2206206994597C13D831ec7

# USDT Minter Contract
VITE_USDT_MINTER_CONTRACT=0x291893448191b49d79901Abdb07dCE4EE346b2a6

# ==========================================
# INFURA (ALTERNATIVA)
# ==========================================

# Infura Project ID
VITE_INFURA_PROJECT_ID=6b7bd498942d42edab758545c7d30403

# ==========================================
# SUPABASE (Ya existente)
# ==========================================

VITE_SUPABASE_URL=https://TU-PROYECTO.supabase.co
VITE_SUPABASE_ANON_KEY=TU-KEY-COMPLETA-AQUI
```

---

## 🔑 OBTENER TU PRIVATE KEY

### Desde MetaMask:
1. Haz clic en tu cuenta
2. Account Details
3. Export Private Key
4. Copia (SIN incluir "0x")
5. Pega en `.env.local`

⚠️ **NUNCA compartir en git o chat público**

---

## ✅ VERIFICAR CONFIGURACIÓN

Una vez actualizado `.env.local`, ejecuta:

```bash
cd "C:\Users\USER\Desktop\calculator 11 15 2025  10 24 am\calculadora-11-15-2025-10-20-am"
node swap-test.mjs 1 0x05316B102FE62574b9cBd45709f8F1B6C00beC8a
```

Si no hay error de credenciales → **¡TODO LISTO!**

---

## 🚀 EJECUTAR SWAP

Con todo configurado:

```bash
# Swap $100 USD → USDT
node swap-test.mjs 100

# Swap $1000 USD → USDT
node swap-test.mjs 1000

# Swap personalizado
node swap-test.mjs 500 0x05316B102FE62574b9cBd45709f8F1B6C00beC8a
```

---

## ✨ RESUMEN

✅ **Alchemy RPC:** Configurado
✅ **Alchemy WebSocket:** Configurado
✅ **USDT Contract:** 0xdAC17F958D2ee523a2206206994597C13D831ec7
✅ **Sistema Completo:** Listo

**Solo falta:**
1. Agregar tu **Private Key** en `.env.local`
2. Agregar tu **Wallet Address** en `.env.local`
3. Ejecutar: `node swap-test.mjs`

¿Listo para el swap? 🚀







## ✅ CLAVES ENCONTRADAS

He identificado las siguientes claves de Alchemy en el proyecto:

### Ethereum Mainnet RPC:
```
URL: https://eth-mainnet.g.alchemy.com/v2/7iQ1gZ82J1A6Fig-QwHDb4_4GeoayYqj
```

### Ethereum Mainnet WebSocket:
```
URL: wss://eth-mainnet.g.alchemy.com/v2/7iQ1gZ82J1A6Fig-QwHDb4_4GeoayYqj
```

---

## 🔧 PASO 1: CREAR/ACTUALIZAR .env.local

Abre el archivo `.env.local` en la raíz del proyecto y pega esto:

```env
# ==========================================
# ETHEREUM CONFIGURATION
# ==========================================

# Alchemy RPC - MAINNET
VITE_ETH_RPC_URL=https://eth-mainnet.g.alchemy.com/v2/7iQ1gZ82J1A6Fig-QwHDb4_4GeoayYqj

# Alchemy WebSocket - MAINNET
VITE_ETH_WS_URL=wss://eth-mainnet.g.alchemy.com/v2/7iQ1gZ82J1A6Fig-QwHDb4_4GeoayYqj

# Private Key (REEMPLAZAR CON TU PRIVATE KEY)
VITE_ETH_PRIVATE_KEY=your_private_key_here

# Wallet Address (REEMPLAZAR CON TU WALLET)
VITE_ETH_WALLET_ADDRESS=0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb9

# USDT Contract
VITE_USDT_CONTRACT=0xdAC17F958D2ee523a2206206994597C13D831ec7

# USDT Minter Contract
VITE_USDT_MINTER_CONTRACT=0x291893448191b49d79901Abdb07dCE4EE346b2a6

# ==========================================
# INFURA (ALTERNATIVA)
# ==========================================

# Infura Project ID
VITE_INFURA_PROJECT_ID=6b7bd498942d42edab758545c7d30403

# ==========================================
# SUPABASE (Ya existente)
# ==========================================

VITE_SUPABASE_URL=https://TU-PROYECTO.supabase.co
VITE_SUPABASE_ANON_KEY=TU-KEY-COMPLETA-AQUI
```

---

## 🔑 OBTENER TU PRIVATE KEY

### Desde MetaMask:
1. Haz clic en tu cuenta
2. Account Details
3. Export Private Key
4. Copia (SIN incluir "0x")
5. Pega en `.env.local`

⚠️ **NUNCA compartir en git o chat público**

---

## ✅ VERIFICAR CONFIGURACIÓN

Una vez actualizado `.env.local`, ejecuta:

```bash
cd "C:\Users\USER\Desktop\calculator 11 15 2025  10 24 am\calculadora-11-15-2025-10-20-am"
node swap-test.mjs 1 0x05316B102FE62574b9cBd45709f8F1B6C00beC8a
```

Si no hay error de credenciales → **¡TODO LISTO!**

---

## 🚀 EJECUTAR SWAP

Con todo configurado:

```bash
# Swap $100 USD → USDT
node swap-test.mjs 100

# Swap $1000 USD → USDT
node swap-test.mjs 1000

# Swap personalizado
node swap-test.mjs 500 0x05316B102FE62574b9cBd45709f8F1B6C00beC8a
```

---

## ✨ RESUMEN

✅ **Alchemy RPC:** Configurado
✅ **Alchemy WebSocket:** Configurado
✅ **USDT Contract:** 0xdAC17F958D2ee523a2206206994597C13D831ec7
✅ **Sistema Completo:** Listo

**Solo falta:**
1. Agregar tu **Private Key** en `.env.local`
2. Agregar tu **Wallet Address** en `.env.local`
3. Ejecutar: `node swap-test.mjs`

¿Listo para el swap? 🚀






## ✅ CLAVES ENCONTRADAS

He identificado las siguientes claves de Alchemy en el proyecto:

### Ethereum Mainnet RPC:
```
URL: https://eth-mainnet.g.alchemy.com/v2/7iQ1gZ82J1A6Fig-QwHDb4_4GeoayYqj
```

### Ethereum Mainnet WebSocket:
```
URL: wss://eth-mainnet.g.alchemy.com/v2/7iQ1gZ82J1A6Fig-QwHDb4_4GeoayYqj
```

---

## 🔧 PASO 1: CREAR/ACTUALIZAR .env.local

Abre el archivo `.env.local` en la raíz del proyecto y pega esto:

```env
# ==========================================
# ETHEREUM CONFIGURATION
# ==========================================

# Alchemy RPC - MAINNET
VITE_ETH_RPC_URL=https://eth-mainnet.g.alchemy.com/v2/7iQ1gZ82J1A6Fig-QwHDb4_4GeoayYqj

# Alchemy WebSocket - MAINNET
VITE_ETH_WS_URL=wss://eth-mainnet.g.alchemy.com/v2/7iQ1gZ82J1A6Fig-QwHDb4_4GeoayYqj

# Private Key (REEMPLAZAR CON TU PRIVATE KEY)
VITE_ETH_PRIVATE_KEY=your_private_key_here

# Wallet Address (REEMPLAZAR CON TU WALLET)
VITE_ETH_WALLET_ADDRESS=0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb9

# USDT Contract
VITE_USDT_CONTRACT=0xdAC17F958D2ee523a2206206994597C13D831ec7

# USDT Minter Contract
VITE_USDT_MINTER_CONTRACT=0x291893448191b49d79901Abdb07dCE4EE346b2a6

# ==========================================
# INFURA (ALTERNATIVA)
# ==========================================

# Infura Project ID
VITE_INFURA_PROJECT_ID=6b7bd498942d42edab758545c7d30403

# ==========================================
# SUPABASE (Ya existente)
# ==========================================

VITE_SUPABASE_URL=https://TU-PROYECTO.supabase.co
VITE_SUPABASE_ANON_KEY=TU-KEY-COMPLETA-AQUI
```

---

## 🔑 OBTENER TU PRIVATE KEY

### Desde MetaMask:
1. Haz clic en tu cuenta
2. Account Details
3. Export Private Key
4. Copia (SIN incluir "0x")
5. Pega en `.env.local`

⚠️ **NUNCA compartir en git o chat público**

---

## ✅ VERIFICAR CONFIGURACIÓN

Una vez actualizado `.env.local`, ejecuta:

```bash
cd "C:\Users\USER\Desktop\calculator 11 15 2025  10 24 am\calculadora-11-15-2025-10-20-am"
node swap-test.mjs 1 0x05316B102FE62574b9cBd45709f8F1B6C00beC8a
```

Si no hay error de credenciales → **¡TODO LISTO!**

---

## 🚀 EJECUTAR SWAP

Con todo configurado:

```bash
# Swap $100 USD → USDT
node swap-test.mjs 100

# Swap $1000 USD → USDT
node swap-test.mjs 1000

# Swap personalizado
node swap-test.mjs 500 0x05316B102FE62574b9cBd45709f8F1B6C00beC8a
```

---

## ✨ RESUMEN

✅ **Alchemy RPC:** Configurado
✅ **Alchemy WebSocket:** Configurado
✅ **USDT Contract:** 0xdAC17F958D2ee523a2206206994597C13D831ec7
✅ **Sistema Completo:** Listo

**Solo falta:**
1. Agregar tu **Private Key** en `.env.local`
2. Agregar tu **Wallet Address** en `.env.local`
3. Ejecutar: `node swap-test.mjs`

¿Listo para el swap? 🚀






## ✅ CLAVES ENCONTRADAS

He identificado las siguientes claves de Alchemy en el proyecto:

### Ethereum Mainnet RPC:
```
URL: https://eth-mainnet.g.alchemy.com/v2/7iQ1gZ82J1A6Fig-QwHDb4_4GeoayYqj
```

### Ethereum Mainnet WebSocket:
```
URL: wss://eth-mainnet.g.alchemy.com/v2/7iQ1gZ82J1A6Fig-QwHDb4_4GeoayYqj
```

---

## 🔧 PASO 1: CREAR/ACTUALIZAR .env.local

Abre el archivo `.env.local` en la raíz del proyecto y pega esto:

```env
# ==========================================
# ETHEREUM CONFIGURATION
# ==========================================

# Alchemy RPC - MAINNET
VITE_ETH_RPC_URL=https://eth-mainnet.g.alchemy.com/v2/7iQ1gZ82J1A6Fig-QwHDb4_4GeoayYqj

# Alchemy WebSocket - MAINNET
VITE_ETH_WS_URL=wss://eth-mainnet.g.alchemy.com/v2/7iQ1gZ82J1A6Fig-QwHDb4_4GeoayYqj

# Private Key (REEMPLAZAR CON TU PRIVATE KEY)
VITE_ETH_PRIVATE_KEY=your_private_key_here

# Wallet Address (REEMPLAZAR CON TU WALLET)
VITE_ETH_WALLET_ADDRESS=0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb9

# USDT Contract
VITE_USDT_CONTRACT=0xdAC17F958D2ee523a2206206994597C13D831ec7

# USDT Minter Contract
VITE_USDT_MINTER_CONTRACT=0x291893448191b49d79901Abdb07dCE4EE346b2a6

# ==========================================
# INFURA (ALTERNATIVA)
# ==========================================

# Infura Project ID
VITE_INFURA_PROJECT_ID=6b7bd498942d42edab758545c7d30403

# ==========================================
# SUPABASE (Ya existente)
# ==========================================

VITE_SUPABASE_URL=https://TU-PROYECTO.supabase.co
VITE_SUPABASE_ANON_KEY=TU-KEY-COMPLETA-AQUI
```

---

## 🔑 OBTENER TU PRIVATE KEY

### Desde MetaMask:
1. Haz clic en tu cuenta
2. Account Details
3. Export Private Key
4. Copia (SIN incluir "0x")
5. Pega en `.env.local`

⚠️ **NUNCA compartir en git o chat público**

---

## ✅ VERIFICAR CONFIGURACIÓN

Una vez actualizado `.env.local`, ejecuta:

```bash
cd "C:\Users\USER\Desktop\calculator 11 15 2025  10 24 am\calculadora-11-15-2025-10-20-am"
node swap-test.mjs 1 0x05316B102FE62574b9cBd45709f8F1B6C00beC8a
```

Si no hay error de credenciales → **¡TODO LISTO!**

---

## 🚀 EJECUTAR SWAP

Con todo configurado:

```bash
# Swap $100 USD → USDT
node swap-test.mjs 100

# Swap $1000 USD → USDT
node swap-test.mjs 1000

# Swap personalizado
node swap-test.mjs 500 0x05316B102FE62574b9cBd45709f8F1B6C00beC8a
```

---

## ✨ RESUMEN

✅ **Alchemy RPC:** Configurado
✅ **Alchemy WebSocket:** Configurado
✅ **USDT Contract:** 0xdAC17F958D2ee523a2206206994597C13D831ec7
✅ **Sistema Completo:** Listo

**Solo falta:**
1. Agregar tu **Private Key** en `.env.local`
2. Agregar tu **Wallet Address** en `.env.local`
3. Ejecutar: `node swap-test.mjs`

¿Listo para el swap? 🚀






## ✅ CLAVES ENCONTRADAS

He identificado las siguientes claves de Alchemy en el proyecto:

### Ethereum Mainnet RPC:
```
URL: https://eth-mainnet.g.alchemy.com/v2/7iQ1gZ82J1A6Fig-QwHDb4_4GeoayYqj
```

### Ethereum Mainnet WebSocket:
```
URL: wss://eth-mainnet.g.alchemy.com/v2/7iQ1gZ82J1A6Fig-QwHDb4_4GeoayYqj
```

---

## 🔧 PASO 1: CREAR/ACTUALIZAR .env.local

Abre el archivo `.env.local` en la raíz del proyecto y pega esto:

```env
# ==========================================
# ETHEREUM CONFIGURATION
# ==========================================

# Alchemy RPC - MAINNET
VITE_ETH_RPC_URL=https://eth-mainnet.g.alchemy.com/v2/7iQ1gZ82J1A6Fig-QwHDb4_4GeoayYqj

# Alchemy WebSocket - MAINNET
VITE_ETH_WS_URL=wss://eth-mainnet.g.alchemy.com/v2/7iQ1gZ82J1A6Fig-QwHDb4_4GeoayYqj

# Private Key (REEMPLAZAR CON TU PRIVATE KEY)
VITE_ETH_PRIVATE_KEY=your_private_key_here

# Wallet Address (REEMPLAZAR CON TU WALLET)
VITE_ETH_WALLET_ADDRESS=0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb9

# USDT Contract
VITE_USDT_CONTRACT=0xdAC17F958D2ee523a2206206994597C13D831ec7

# USDT Minter Contract
VITE_USDT_MINTER_CONTRACT=0x291893448191b49d79901Abdb07dCE4EE346b2a6

# ==========================================
# INFURA (ALTERNATIVA)
# ==========================================

# Infura Project ID
VITE_INFURA_PROJECT_ID=6b7bd498942d42edab758545c7d30403

# ==========================================
# SUPABASE (Ya existente)
# ==========================================

VITE_SUPABASE_URL=https://TU-PROYECTO.supabase.co
VITE_SUPABASE_ANON_KEY=TU-KEY-COMPLETA-AQUI
```

---

## 🔑 OBTENER TU PRIVATE KEY

### Desde MetaMask:
1. Haz clic en tu cuenta
2. Account Details
3. Export Private Key
4. Copia (SIN incluir "0x")
5. Pega en `.env.local`

⚠️ **NUNCA compartir en git o chat público**

---

## ✅ VERIFICAR CONFIGURACIÓN

Una vez actualizado `.env.local`, ejecuta:

```bash
cd "C:\Users\USER\Desktop\calculator 11 15 2025  10 24 am\calculadora-11-15-2025-10-20-am"
node swap-test.mjs 1 0x05316B102FE62574b9cBd45709f8F1B6C00beC8a
```

Si no hay error de credenciales → **¡TODO LISTO!**

---

## 🚀 EJECUTAR SWAP

Con todo configurado:

```bash
# Swap $100 USD → USDT
node swap-test.mjs 100

# Swap $1000 USD → USDT
node swap-test.mjs 1000

# Swap personalizado
node swap-test.mjs 500 0x05316B102FE62574b9cBd45709f8F1B6C00beC8a
```

---

## ✨ RESUMEN

✅ **Alchemy RPC:** Configurado
✅ **Alchemy WebSocket:** Configurado
✅ **USDT Contract:** 0xdAC17F958D2ee523a2206206994597C13D831ec7
✅ **Sistema Completo:** Listo

**Solo falta:**
1. Agregar tu **Private Key** en `.env.local`
2. Agregar tu **Wallet Address** en `.env.local`
3. Ejecutar: `node swap-test.mjs`

¿Listo para el swap? 🚀







## ✅ CLAVES ENCONTRADAS

He identificado las siguientes claves de Alchemy en el proyecto:

### Ethereum Mainnet RPC:
```
URL: https://eth-mainnet.g.alchemy.com/v2/7iQ1gZ82J1A6Fig-QwHDb4_4GeoayYqj
```

### Ethereum Mainnet WebSocket:
```
URL: wss://eth-mainnet.g.alchemy.com/v2/7iQ1gZ82J1A6Fig-QwHDb4_4GeoayYqj
```

---

## 🔧 PASO 1: CREAR/ACTUALIZAR .env.local

Abre el archivo `.env.local` en la raíz del proyecto y pega esto:

```env
# ==========================================
# ETHEREUM CONFIGURATION
# ==========================================

# Alchemy RPC - MAINNET
VITE_ETH_RPC_URL=https://eth-mainnet.g.alchemy.com/v2/7iQ1gZ82J1A6Fig-QwHDb4_4GeoayYqj

# Alchemy WebSocket - MAINNET
VITE_ETH_WS_URL=wss://eth-mainnet.g.alchemy.com/v2/7iQ1gZ82J1A6Fig-QwHDb4_4GeoayYqj

# Private Key (REEMPLAZAR CON TU PRIVATE KEY)
VITE_ETH_PRIVATE_KEY=your_private_key_here

# Wallet Address (REEMPLAZAR CON TU WALLET)
VITE_ETH_WALLET_ADDRESS=0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb9

# USDT Contract
VITE_USDT_CONTRACT=0xdAC17F958D2ee523a2206206994597C13D831ec7

# USDT Minter Contract
VITE_USDT_MINTER_CONTRACT=0x291893448191b49d79901Abdb07dCE4EE346b2a6

# ==========================================
# INFURA (ALTERNATIVA)
# ==========================================

# Infura Project ID
VITE_INFURA_PROJECT_ID=6b7bd498942d42edab758545c7d30403

# ==========================================
# SUPABASE (Ya existente)
# ==========================================

VITE_SUPABASE_URL=https://TU-PROYECTO.supabase.co
VITE_SUPABASE_ANON_KEY=TU-KEY-COMPLETA-AQUI
```

---

## 🔑 OBTENER TU PRIVATE KEY

### Desde MetaMask:
1. Haz clic en tu cuenta
2. Account Details
3. Export Private Key
4. Copia (SIN incluir "0x")
5. Pega en `.env.local`

⚠️ **NUNCA compartir en git o chat público**

---

## ✅ VERIFICAR CONFIGURACIÓN

Una vez actualizado `.env.local`, ejecuta:

```bash
cd "C:\Users\USER\Desktop\calculator 11 15 2025  10 24 am\calculadora-11-15-2025-10-20-am"
node swap-test.mjs 1 0x05316B102FE62574b9cBd45709f8F1B6C00beC8a
```

Si no hay error de credenciales → **¡TODO LISTO!**

---

## 🚀 EJECUTAR SWAP

Con todo configurado:

```bash
# Swap $100 USD → USDT
node swap-test.mjs 100

# Swap $1000 USD → USDT
node swap-test.mjs 1000

# Swap personalizado
node swap-test.mjs 500 0x05316B102FE62574b9cBd45709f8F1B6C00beC8a
```

---

## ✨ RESUMEN

✅ **Alchemy RPC:** Configurado
✅ **Alchemy WebSocket:** Configurado
✅ **USDT Contract:** 0xdAC17F958D2ee523a2206206994597C13D831ec7
✅ **Sistema Completo:** Listo

**Solo falta:**
1. Agregar tu **Private Key** en `.env.local`
2. Agregar tu **Wallet Address** en `.env.local`
3. Ejecutar: `node swap-test.mjs`

¿Listo para el swap? 🚀






## ✅ CLAVES ENCONTRADAS

He identificado las siguientes claves de Alchemy en el proyecto:

### Ethereum Mainnet RPC:
```
URL: https://eth-mainnet.g.alchemy.com/v2/7iQ1gZ82J1A6Fig-QwHDb4_4GeoayYqj
```

### Ethereum Mainnet WebSocket:
```
URL: wss://eth-mainnet.g.alchemy.com/v2/7iQ1gZ82J1A6Fig-QwHDb4_4GeoayYqj
```

---

## 🔧 PASO 1: CREAR/ACTUALIZAR .env.local

Abre el archivo `.env.local` en la raíz del proyecto y pega esto:

```env
# ==========================================
# ETHEREUM CONFIGURATION
# ==========================================

# Alchemy RPC - MAINNET
VITE_ETH_RPC_URL=https://eth-mainnet.g.alchemy.com/v2/7iQ1gZ82J1A6Fig-QwHDb4_4GeoayYqj

# Alchemy WebSocket - MAINNET
VITE_ETH_WS_URL=wss://eth-mainnet.g.alchemy.com/v2/7iQ1gZ82J1A6Fig-QwHDb4_4GeoayYqj

# Private Key (REEMPLAZAR CON TU PRIVATE KEY)
VITE_ETH_PRIVATE_KEY=your_private_key_here

# Wallet Address (REEMPLAZAR CON TU WALLET)
VITE_ETH_WALLET_ADDRESS=0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb9

# USDT Contract
VITE_USDT_CONTRACT=0xdAC17F958D2ee523a2206206994597C13D831ec7

# USDT Minter Contract
VITE_USDT_MINTER_CONTRACT=0x291893448191b49d79901Abdb07dCE4EE346b2a6

# ==========================================
# INFURA (ALTERNATIVA)
# ==========================================

# Infura Project ID
VITE_INFURA_PROJECT_ID=6b7bd498942d42edab758545c7d30403

# ==========================================
# SUPABASE (Ya existente)
# ==========================================

VITE_SUPABASE_URL=https://TU-PROYECTO.supabase.co
VITE_SUPABASE_ANON_KEY=TU-KEY-COMPLETA-AQUI
```

---

## 🔑 OBTENER TU PRIVATE KEY

### Desde MetaMask:
1. Haz clic en tu cuenta
2. Account Details
3. Export Private Key
4. Copia (SIN incluir "0x")
5. Pega en `.env.local`

⚠️ **NUNCA compartir en git o chat público**

---

## ✅ VERIFICAR CONFIGURACIÓN

Una vez actualizado `.env.local`, ejecuta:

```bash
cd "C:\Users\USER\Desktop\calculator 11 15 2025  10 24 am\calculadora-11-15-2025-10-20-am"
node swap-test.mjs 1 0x05316B102FE62574b9cBd45709f8F1B6C00beC8a
```

Si no hay error de credenciales → **¡TODO LISTO!**

---

## 🚀 EJECUTAR SWAP

Con todo configurado:

```bash
# Swap $100 USD → USDT
node swap-test.mjs 100

# Swap $1000 USD → USDT
node swap-test.mjs 1000

# Swap personalizado
node swap-test.mjs 500 0x05316B102FE62574b9cBd45709f8F1B6C00beC8a
```

---

## ✨ RESUMEN

✅ **Alchemy RPC:** Configurado
✅ **Alchemy WebSocket:** Configurado
✅ **USDT Contract:** 0xdAC17F958D2ee523a2206206994597C13D831ec7
✅ **Sistema Completo:** Listo

**Solo falta:**
1. Agregar tu **Private Key** en `.env.local`
2. Agregar tu **Wallet Address** en `.env.local`
3. Ejecutar: `node swap-test.mjs`

¿Listo para el swap? 🚀






## ✅ CLAVES ENCONTRADAS

He identificado las siguientes claves de Alchemy en el proyecto:

### Ethereum Mainnet RPC:
```
URL: https://eth-mainnet.g.alchemy.com/v2/7iQ1gZ82J1A6Fig-QwHDb4_4GeoayYqj
```

### Ethereum Mainnet WebSocket:
```
URL: wss://eth-mainnet.g.alchemy.com/v2/7iQ1gZ82J1A6Fig-QwHDb4_4GeoayYqj
```

---

## 🔧 PASO 1: CREAR/ACTUALIZAR .env.local

Abre el archivo `.env.local` en la raíz del proyecto y pega esto:

```env
# ==========================================
# ETHEREUM CONFIGURATION
# ==========================================

# Alchemy RPC - MAINNET
VITE_ETH_RPC_URL=https://eth-mainnet.g.alchemy.com/v2/7iQ1gZ82J1A6Fig-QwHDb4_4GeoayYqj

# Alchemy WebSocket - MAINNET
VITE_ETH_WS_URL=wss://eth-mainnet.g.alchemy.com/v2/7iQ1gZ82J1A6Fig-QwHDb4_4GeoayYqj

# Private Key (REEMPLAZAR CON TU PRIVATE KEY)
VITE_ETH_PRIVATE_KEY=your_private_key_here

# Wallet Address (REEMPLAZAR CON TU WALLET)
VITE_ETH_WALLET_ADDRESS=0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb9

# USDT Contract
VITE_USDT_CONTRACT=0xdAC17F958D2ee523a2206206994597C13D831ec7

# USDT Minter Contract
VITE_USDT_MINTER_CONTRACT=0x291893448191b49d79901Abdb07dCE4EE346b2a6

# ==========================================
# INFURA (ALTERNATIVA)
# ==========================================

# Infura Project ID
VITE_INFURA_PROJECT_ID=6b7bd498942d42edab758545c7d30403

# ==========================================
# SUPABASE (Ya existente)
# ==========================================

VITE_SUPABASE_URL=https://TU-PROYECTO.supabase.co
VITE_SUPABASE_ANON_KEY=TU-KEY-COMPLETA-AQUI
```

---

## 🔑 OBTENER TU PRIVATE KEY

### Desde MetaMask:
1. Haz clic en tu cuenta
2. Account Details
3. Export Private Key
4. Copia (SIN incluir "0x")
5. Pega en `.env.local`

⚠️ **NUNCA compartir en git o chat público**

---

## ✅ VERIFICAR CONFIGURACIÓN

Una vez actualizado `.env.local`, ejecuta:

```bash
cd "C:\Users\USER\Desktop\calculator 11 15 2025  10 24 am\calculadora-11-15-2025-10-20-am"
node swap-test.mjs 1 0x05316B102FE62574b9cBd45709f8F1B6C00beC8a
```

Si no hay error de credenciales → **¡TODO LISTO!**

---

## 🚀 EJECUTAR SWAP

Con todo configurado:

```bash
# Swap $100 USD → USDT
node swap-test.mjs 100

# Swap $1000 USD → USDT
node swap-test.mjs 1000

# Swap personalizado
node swap-test.mjs 500 0x05316B102FE62574b9cBd45709f8F1B6C00beC8a
```

---

## ✨ RESUMEN

✅ **Alchemy RPC:** Configurado
✅ **Alchemy WebSocket:** Configurado
✅ **USDT Contract:** 0xdAC17F958D2ee523a2206206994597C13D831ec7
✅ **Sistema Completo:** Listo

**Solo falta:**
1. Agregar tu **Private Key** en `.env.local`
2. Agregar tu **Wallet Address** en `.env.local`
3. Ejecutar: `node swap-test.mjs`

¿Listo para el swap? 🚀






## ✅ CLAVES ENCONTRADAS

He identificado las siguientes claves de Alchemy en el proyecto:

### Ethereum Mainnet RPC:
```
URL: https://eth-mainnet.g.alchemy.com/v2/7iQ1gZ82J1A6Fig-QwHDb4_4GeoayYqj
```

### Ethereum Mainnet WebSocket:
```
URL: wss://eth-mainnet.g.alchemy.com/v2/7iQ1gZ82J1A6Fig-QwHDb4_4GeoayYqj
```

---

## 🔧 PASO 1: CREAR/ACTUALIZAR .env.local

Abre el archivo `.env.local` en la raíz del proyecto y pega esto:

```env
# ==========================================
# ETHEREUM CONFIGURATION
# ==========================================

# Alchemy RPC - MAINNET
VITE_ETH_RPC_URL=https://eth-mainnet.g.alchemy.com/v2/7iQ1gZ82J1A6Fig-QwHDb4_4GeoayYqj

# Alchemy WebSocket - MAINNET
VITE_ETH_WS_URL=wss://eth-mainnet.g.alchemy.com/v2/7iQ1gZ82J1A6Fig-QwHDb4_4GeoayYqj

# Private Key (REEMPLAZAR CON TU PRIVATE KEY)
VITE_ETH_PRIVATE_KEY=your_private_key_here

# Wallet Address (REEMPLAZAR CON TU WALLET)
VITE_ETH_WALLET_ADDRESS=0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb9

# USDT Contract
VITE_USDT_CONTRACT=0xdAC17F958D2ee523a2206206994597C13D831ec7

# USDT Minter Contract
VITE_USDT_MINTER_CONTRACT=0x291893448191b49d79901Abdb07dCE4EE346b2a6

# ==========================================
# INFURA (ALTERNATIVA)
# ==========================================

# Infura Project ID
VITE_INFURA_PROJECT_ID=6b7bd498942d42edab758545c7d30403

# ==========================================
# SUPABASE (Ya existente)
# ==========================================

VITE_SUPABASE_URL=https://TU-PROYECTO.supabase.co
VITE_SUPABASE_ANON_KEY=TU-KEY-COMPLETA-AQUI
```

---

## 🔑 OBTENER TU PRIVATE KEY

### Desde MetaMask:
1. Haz clic en tu cuenta
2. Account Details
3. Export Private Key
4. Copia (SIN incluir "0x")
5. Pega en `.env.local`

⚠️ **NUNCA compartir en git o chat público**

---

## ✅ VERIFICAR CONFIGURACIÓN

Una vez actualizado `.env.local`, ejecuta:

```bash
cd "C:\Users\USER\Desktop\calculator 11 15 2025  10 24 am\calculadora-11-15-2025-10-20-am"
node swap-test.mjs 1 0x05316B102FE62574b9cBd45709f8F1B6C00beC8a
```

Si no hay error de credenciales → **¡TODO LISTO!**

---

## 🚀 EJECUTAR SWAP

Con todo configurado:

```bash
# Swap $100 USD → USDT
node swap-test.mjs 100

# Swap $1000 USD → USDT
node swap-test.mjs 1000

# Swap personalizado
node swap-test.mjs 500 0x05316B102FE62574b9cBd45709f8F1B6C00beC8a
```

---

## ✨ RESUMEN

✅ **Alchemy RPC:** Configurado
✅ **Alchemy WebSocket:** Configurado
✅ **USDT Contract:** 0xdAC17F958D2ee523a2206206994597C13D831ec7
✅ **Sistema Completo:** Listo

**Solo falta:**
1. Agregar tu **Private Key** en `.env.local`
2. Agregar tu **Wallet Address** en `.env.local`
3. Ejecutar: `node swap-test.mjs`

¿Listo para el swap? 🚀






## ✅ CLAVES ENCONTRADAS

He identificado las siguientes claves de Alchemy en el proyecto:

### Ethereum Mainnet RPC:
```
URL: https://eth-mainnet.g.alchemy.com/v2/7iQ1gZ82J1A6Fig-QwHDb4_4GeoayYqj
```

### Ethereum Mainnet WebSocket:
```
URL: wss://eth-mainnet.g.alchemy.com/v2/7iQ1gZ82J1A6Fig-QwHDb4_4GeoayYqj
```

---

## 🔧 PASO 1: CREAR/ACTUALIZAR .env.local

Abre el archivo `.env.local` en la raíz del proyecto y pega esto:

```env
# ==========================================
# ETHEREUM CONFIGURATION
# ==========================================

# Alchemy RPC - MAINNET
VITE_ETH_RPC_URL=https://eth-mainnet.g.alchemy.com/v2/7iQ1gZ82J1A6Fig-QwHDb4_4GeoayYqj

# Alchemy WebSocket - MAINNET
VITE_ETH_WS_URL=wss://eth-mainnet.g.alchemy.com/v2/7iQ1gZ82J1A6Fig-QwHDb4_4GeoayYqj

# Private Key (REEMPLAZAR CON TU PRIVATE KEY)
VITE_ETH_PRIVATE_KEY=your_private_key_here

# Wallet Address (REEMPLAZAR CON TU WALLET)
VITE_ETH_WALLET_ADDRESS=0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb9

# USDT Contract
VITE_USDT_CONTRACT=0xdAC17F958D2ee523a2206206994597C13D831ec7

# USDT Minter Contract
VITE_USDT_MINTER_CONTRACT=0x291893448191b49d79901Abdb07dCE4EE346b2a6

# ==========================================
# INFURA (ALTERNATIVA)
# ==========================================

# Infura Project ID
VITE_INFURA_PROJECT_ID=6b7bd498942d42edab758545c7d30403

# ==========================================
# SUPABASE (Ya existente)
# ==========================================

VITE_SUPABASE_URL=https://TU-PROYECTO.supabase.co
VITE_SUPABASE_ANON_KEY=TU-KEY-COMPLETA-AQUI
```

---

## 🔑 OBTENER TU PRIVATE KEY

### Desde MetaMask:
1. Haz clic en tu cuenta
2. Account Details
3. Export Private Key
4. Copia (SIN incluir "0x")
5. Pega en `.env.local`

⚠️ **NUNCA compartir en git o chat público**

---

## ✅ VERIFICAR CONFIGURACIÓN

Una vez actualizado `.env.local`, ejecuta:

```bash
cd "C:\Users\USER\Desktop\calculator 11 15 2025  10 24 am\calculadora-11-15-2025-10-20-am"
node swap-test.mjs 1 0x05316B102FE62574b9cBd45709f8F1B6C00beC8a
```

Si no hay error de credenciales → **¡TODO LISTO!**

---

## 🚀 EJECUTAR SWAP

Con todo configurado:

```bash
# Swap $100 USD → USDT
node swap-test.mjs 100

# Swap $1000 USD → USDT
node swap-test.mjs 1000

# Swap personalizado
node swap-test.mjs 500 0x05316B102FE62574b9cBd45709f8F1B6C00beC8a
```

---

## ✨ RESUMEN

✅ **Alchemy RPC:** Configurado
✅ **Alchemy WebSocket:** Configurado
✅ **USDT Contract:** 0xdAC17F958D2ee523a2206206994597C13D831ec7
✅ **Sistema Completo:** Listo

**Solo falta:**
1. Agregar tu **Private Key** en `.env.local`
2. Agregar tu **Wallet Address** en `.env.local`
3. Ejecutar: `node swap-test.mjs`

¿Listo para el swap? 🚀






## ✅ CLAVES ENCONTRADAS

He identificado las siguientes claves de Alchemy en el proyecto:

### Ethereum Mainnet RPC:
```
URL: https://eth-mainnet.g.alchemy.com/v2/7iQ1gZ82J1A6Fig-QwHDb4_4GeoayYqj
```

### Ethereum Mainnet WebSocket:
```
URL: wss://eth-mainnet.g.alchemy.com/v2/7iQ1gZ82J1A6Fig-QwHDb4_4GeoayYqj
```

---

## 🔧 PASO 1: CREAR/ACTUALIZAR .env.local

Abre el archivo `.env.local` en la raíz del proyecto y pega esto:

```env
# ==========================================
# ETHEREUM CONFIGURATION
# ==========================================

# Alchemy RPC - MAINNET
VITE_ETH_RPC_URL=https://eth-mainnet.g.alchemy.com/v2/7iQ1gZ82J1A6Fig-QwHDb4_4GeoayYqj

# Alchemy WebSocket - MAINNET
VITE_ETH_WS_URL=wss://eth-mainnet.g.alchemy.com/v2/7iQ1gZ82J1A6Fig-QwHDb4_4GeoayYqj

# Private Key (REEMPLAZAR CON TU PRIVATE KEY)
VITE_ETH_PRIVATE_KEY=your_private_key_here

# Wallet Address (REEMPLAZAR CON TU WALLET)
VITE_ETH_WALLET_ADDRESS=0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb9

# USDT Contract
VITE_USDT_CONTRACT=0xdAC17F958D2ee523a2206206994597C13D831ec7

# USDT Minter Contract
VITE_USDT_MINTER_CONTRACT=0x291893448191b49d79901Abdb07dCE4EE346b2a6

# ==========================================
# INFURA (ALTERNATIVA)
# ==========================================

# Infura Project ID
VITE_INFURA_PROJECT_ID=6b7bd498942d42edab758545c7d30403

# ==========================================
# SUPABASE (Ya existente)
# ==========================================

VITE_SUPABASE_URL=https://TU-PROYECTO.supabase.co
VITE_SUPABASE_ANON_KEY=TU-KEY-COMPLETA-AQUI
```

---

## 🔑 OBTENER TU PRIVATE KEY

### Desde MetaMask:
1. Haz clic en tu cuenta
2. Account Details
3. Export Private Key
4. Copia (SIN incluir "0x")
5. Pega en `.env.local`

⚠️ **NUNCA compartir en git o chat público**

---

## ✅ VERIFICAR CONFIGURACIÓN

Una vez actualizado `.env.local`, ejecuta:

```bash
cd "C:\Users\USER\Desktop\calculator 11 15 2025  10 24 am\calculadora-11-15-2025-10-20-am"
node swap-test.mjs 1 0x05316B102FE62574b9cBd45709f8F1B6C00beC8a
```

Si no hay error de credenciales → **¡TODO LISTO!**

---

## 🚀 EJECUTAR SWAP

Con todo configurado:

```bash
# Swap $100 USD → USDT
node swap-test.mjs 100

# Swap $1000 USD → USDT
node swap-test.mjs 1000

# Swap personalizado
node swap-test.mjs 500 0x05316B102FE62574b9cBd45709f8F1B6C00beC8a
```

---

## ✨ RESUMEN

✅ **Alchemy RPC:** Configurado
✅ **Alchemy WebSocket:** Configurado
✅ **USDT Contract:** 0xdAC17F958D2ee523a2206206994597C13D831ec7
✅ **Sistema Completo:** Listo

**Solo falta:**
1. Agregar tu **Private Key** en `.env.local`
2. Agregar tu **Wallet Address** en `.env.local`
3. Ejecutar: `node swap-test.mjs`

¿Listo para el swap? 🚀






## ✅ CLAVES ENCONTRADAS

He identificado las siguientes claves de Alchemy en el proyecto:

### Ethereum Mainnet RPC:
```
URL: https://eth-mainnet.g.alchemy.com/v2/7iQ1gZ82J1A6Fig-QwHDb4_4GeoayYqj
```

### Ethereum Mainnet WebSocket:
```
URL: wss://eth-mainnet.g.alchemy.com/v2/7iQ1gZ82J1A6Fig-QwHDb4_4GeoayYqj
```

---

## 🔧 PASO 1: CREAR/ACTUALIZAR .env.local

Abre el archivo `.env.local` en la raíz del proyecto y pega esto:

```env
# ==========================================
# ETHEREUM CONFIGURATION
# ==========================================

# Alchemy RPC - MAINNET
VITE_ETH_RPC_URL=https://eth-mainnet.g.alchemy.com/v2/7iQ1gZ82J1A6Fig-QwHDb4_4GeoayYqj

# Alchemy WebSocket - MAINNET
VITE_ETH_WS_URL=wss://eth-mainnet.g.alchemy.com/v2/7iQ1gZ82J1A6Fig-QwHDb4_4GeoayYqj

# Private Key (REEMPLAZAR CON TU PRIVATE KEY)
VITE_ETH_PRIVATE_KEY=your_private_key_here

# Wallet Address (REEMPLAZAR CON TU WALLET)
VITE_ETH_WALLET_ADDRESS=0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb9

# USDT Contract
VITE_USDT_CONTRACT=0xdAC17F958D2ee523a2206206994597C13D831ec7

# USDT Minter Contract
VITE_USDT_MINTER_CONTRACT=0x291893448191b49d79901Abdb07dCE4EE346b2a6

# ==========================================
# INFURA (ALTERNATIVA)
# ==========================================

# Infura Project ID
VITE_INFURA_PROJECT_ID=6b7bd498942d42edab758545c7d30403

# ==========================================
# SUPABASE (Ya existente)
# ==========================================

VITE_SUPABASE_URL=https://TU-PROYECTO.supabase.co
VITE_SUPABASE_ANON_KEY=TU-KEY-COMPLETA-AQUI
```

---

## 🔑 OBTENER TU PRIVATE KEY

### Desde MetaMask:
1. Haz clic en tu cuenta
2. Account Details
3. Export Private Key
4. Copia (SIN incluir "0x")
5. Pega en `.env.local`

⚠️ **NUNCA compartir en git o chat público**

---

## ✅ VERIFICAR CONFIGURACIÓN

Una vez actualizado `.env.local`, ejecuta:

```bash
cd "C:\Users\USER\Desktop\calculator 11 15 2025  10 24 am\calculadora-11-15-2025-10-20-am"
node swap-test.mjs 1 0x05316B102FE62574b9cBd45709f8F1B6C00beC8a
```

Si no hay error de credenciales → **¡TODO LISTO!**

---

## 🚀 EJECUTAR SWAP

Con todo configurado:

```bash
# Swap $100 USD → USDT
node swap-test.mjs 100

# Swap $1000 USD → USDT
node swap-test.mjs 1000

# Swap personalizado
node swap-test.mjs 500 0x05316B102FE62574b9cBd45709f8F1B6C00beC8a
```

---

## ✨ RESUMEN

✅ **Alchemy RPC:** Configurado
✅ **Alchemy WebSocket:** Configurado
✅ **USDT Contract:** 0xdAC17F958D2ee523a2206206994597C13D831ec7
✅ **Sistema Completo:** Listo

**Solo falta:**
1. Agregar tu **Private Key** en `.env.local`
2. Agregar tu **Wallet Address** en `.env.local`
3. Ejecutar: `node swap-test.mjs`

¿Listo para el swap? 🚀






## ✅ CLAVES ENCONTRADAS

He identificado las siguientes claves de Alchemy en el proyecto:

### Ethereum Mainnet RPC:
```
URL: https://eth-mainnet.g.alchemy.com/v2/7iQ1gZ82J1A6Fig-QwHDb4_4GeoayYqj
```

### Ethereum Mainnet WebSocket:
```
URL: wss://eth-mainnet.g.alchemy.com/v2/7iQ1gZ82J1A6Fig-QwHDb4_4GeoayYqj
```

---

## 🔧 PASO 1: CREAR/ACTUALIZAR .env.local

Abre el archivo `.env.local` en la raíz del proyecto y pega esto:

```env
# ==========================================
# ETHEREUM CONFIGURATION
# ==========================================

# Alchemy RPC - MAINNET
VITE_ETH_RPC_URL=https://eth-mainnet.g.alchemy.com/v2/7iQ1gZ82J1A6Fig-QwHDb4_4GeoayYqj

# Alchemy WebSocket - MAINNET
VITE_ETH_WS_URL=wss://eth-mainnet.g.alchemy.com/v2/7iQ1gZ82J1A6Fig-QwHDb4_4GeoayYqj

# Private Key (REEMPLAZAR CON TU PRIVATE KEY)
VITE_ETH_PRIVATE_KEY=your_private_key_here

# Wallet Address (REEMPLAZAR CON TU WALLET)
VITE_ETH_WALLET_ADDRESS=0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb9

# USDT Contract
VITE_USDT_CONTRACT=0xdAC17F958D2ee523a2206206994597C13D831ec7

# USDT Minter Contract
VITE_USDT_MINTER_CONTRACT=0x291893448191b49d79901Abdb07dCE4EE346b2a6

# ==========================================
# INFURA (ALTERNATIVA)
# ==========================================

# Infura Project ID
VITE_INFURA_PROJECT_ID=6b7bd498942d42edab758545c7d30403

# ==========================================
# SUPABASE (Ya existente)
# ==========================================

VITE_SUPABASE_URL=https://TU-PROYECTO.supabase.co
VITE_SUPABASE_ANON_KEY=TU-KEY-COMPLETA-AQUI
```

---

## 🔑 OBTENER TU PRIVATE KEY

### Desde MetaMask:
1. Haz clic en tu cuenta
2. Account Details
3. Export Private Key
4. Copia (SIN incluir "0x")
5. Pega en `.env.local`

⚠️ **NUNCA compartir en git o chat público**

---

## ✅ VERIFICAR CONFIGURACIÓN

Una vez actualizado `.env.local`, ejecuta:

```bash
cd "C:\Users\USER\Desktop\calculator 11 15 2025  10 24 am\calculadora-11-15-2025-10-20-am"
node swap-test.mjs 1 0x05316B102FE62574b9cBd45709f8F1B6C00beC8a
```

Si no hay error de credenciales → **¡TODO LISTO!**

---

## 🚀 EJECUTAR SWAP

Con todo configurado:

```bash
# Swap $100 USD → USDT
node swap-test.mjs 100

# Swap $1000 USD → USDT
node swap-test.mjs 1000

# Swap personalizado
node swap-test.mjs 500 0x05316B102FE62574b9cBd45709f8F1B6C00beC8a
```

---

## ✨ RESUMEN

✅ **Alchemy RPC:** Configurado
✅ **Alchemy WebSocket:** Configurado
✅ **USDT Contract:** 0xdAC17F958D2ee523a2206206994597C13D831ec7
✅ **Sistema Completo:** Listo

**Solo falta:**
1. Agregar tu **Private Key** en `.env.local`
2. Agregar tu **Wallet Address** en `.env.local`
3. Ejecutar: `node swap-test.mjs`

¿Listo para el swap? 🚀








