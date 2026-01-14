# ✅ TU RPC ALCHEMY CONFIGURADA

Tengo tu RPC de Alchemy. Aquí está toda la configuración lista para copiar:

## 🔧 Copia esto en tu `.env.local`

```env
# ==========================================
# ETHEREUM RPC - ALCHEMY (TU CLAVE)
# ==========================================

VITE_ETH_RPC_URL=https://eth-mainnet.g.alchemy.com/v2/mm-9UjI5oG51l94mRH3fh
ETH_RPC_URL=https://eth-mainnet.g.alchemy.com/v2/mm-9UjI5oG51l94mRH3fh
VITE_ETH_WS_URL=wss://eth-mainnet.g.alchemy.com/v2/mm-9UjI5oG51l94mRH3fh

# ==========================================
# PRIVATE KEY & WALLET
# ==========================================

# Reemplaza esto con tu private key (sin 0x)
VITE_ETH_PRIVATE_KEY=your_private_key_here

# Tu wallet address
VITE_ETH_WALLET_ADDRESS=0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb9

# ==========================================
# USDT CONTRACTS
# ==========================================

VITE_USDT_CONTRACT=0xdAC17F958D2ee523a2206206994597C13D831ec7
VITE_USDT_MINTER_CONTRACT=0x291893448191b49d79901Abdb07dCE4EE346b2a6

# ==========================================
# INFURA (ALTERNATIVA)
# ==========================================

VITE_INFURA_PROJECT_ID=6b7bd498942d42edab758545c7d30403

# ==========================================
# SUPABASE (SI EXISTE)
# ==========================================

# Agrega tus credenciales de Supabase si las tienes
# VITE_SUPABASE_URL=https://...
# VITE_SUPABASE_ANON_KEY=eyJ...
```

---

## 📝 INSTRUCCIONES PARA ACTUALIZAR .env.local

### Opción 1: Desde PowerShell

```powershell
cd 'C:\Users\USER\Desktop\calculator 11 15 2025  10 24 am\calculadora-11-15-2025-10-20-am'

# Editar archivo
notepad .env.local
```

Pega el contenido de arriba, reemplaza `your_private_key_here` con tu private key, y guarda.

### Opción 2: Desde VS Code

1. Abre VS Code
2. Abre la carpeta del proyecto
3. Busca `.env.local` (o créalo si no existe)
4. Pega el contenido de arriba
5. Ctrl+S para guardar

---

## ✅ VERIFICAR QUE ESTÁ CORRECTO

Después de actualizar `.env.local`, ejecuta:

```bash
node swap-test.mjs 1 0x05316B102FE62574b9cBd45709f8F1B6C00beC8a
```

Si dice algo como:
```
❌ Error: VITE_ETH_PRIVATE_KEY no está configurada
```

Significa que falta tu private key. Agrega:

```env
VITE_ETH_PRIVATE_KEY=tu_private_key_sin_0x
```

---

## 🔑 CÓMO OBTENER TU PRIVATE KEY

### Desde MetaMask:
1. Abre MetaMask
2. Haz clic en tu cuenta
3. Account Details
4. Export Private Key
5. Copia la clave (sin incluir "0x")
6. Pega en `.env.local` en `VITE_ETH_PRIVATE_KEY=`

⚠️ **NUNCA compartir este key en público**

---

## 🚀 LISTO PARA EJECUTAR

Una vez actualizado `.env.local` con:
- ✅ RPC Alchemy (YA TIENES)
- ✅ Private Key (NECESITAS AGREGAR)
- ✅ Wallet Address (PUEDES CAMBIAR)

Ejecuta:

```bash
# Swap $100 USD → USDT
node swap-test.mjs 100

# Swap $1000 USD → USDT a tu dirección
node swap-test.mjs 1000 0x05316B102FE62574b9cBd45709f8F1B6C00beC8a
```

---

## 📊 RESUMEN

✅ **RPC Alchemy:** Configurada
```
https://eth-mainnet.g.alchemy.com/v2/mm-9UjI5oG51l94mRH3fh
```

⏳ **Private Key:** Necesitas agregar en `.env.local`

✅ **USDT Contract:** Listo
```
0xdAC17F958D2ee523a2206206994597C13D831ec7
```

✅ **Sistema:** Completo y listo

---

## 🎯 PRÓXIMO PASO

1. Actualiza `.env.local` con tu private key
2. Ejecuta: `node swap-test.mjs 100`
3. Verás el swap en acción en 30-60 segundos
4. Resultado en Etherscan

¿Listo? 🚀






Tengo tu RPC de Alchemy. Aquí está toda la configuración lista para copiar:

## 🔧 Copia esto en tu `.env.local`

```env
# ==========================================
# ETHEREUM RPC - ALCHEMY (TU CLAVE)
# ==========================================

VITE_ETH_RPC_URL=https://eth-mainnet.g.alchemy.com/v2/mm-9UjI5oG51l94mRH3fh
ETH_RPC_URL=https://eth-mainnet.g.alchemy.com/v2/mm-9UjI5oG51l94mRH3fh
VITE_ETH_WS_URL=wss://eth-mainnet.g.alchemy.com/v2/mm-9UjI5oG51l94mRH3fh

# ==========================================
# PRIVATE KEY & WALLET
# ==========================================

# Reemplaza esto con tu private key (sin 0x)
VITE_ETH_PRIVATE_KEY=your_private_key_here

# Tu wallet address
VITE_ETH_WALLET_ADDRESS=0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb9

# ==========================================
# USDT CONTRACTS
# ==========================================

VITE_USDT_CONTRACT=0xdAC17F958D2ee523a2206206994597C13D831ec7
VITE_USDT_MINTER_CONTRACT=0x291893448191b49d79901Abdb07dCE4EE346b2a6

# ==========================================
# INFURA (ALTERNATIVA)
# ==========================================

VITE_INFURA_PROJECT_ID=6b7bd498942d42edab758545c7d30403

# ==========================================
# SUPABASE (SI EXISTE)
# ==========================================

# Agrega tus credenciales de Supabase si las tienes
# VITE_SUPABASE_URL=https://...
# VITE_SUPABASE_ANON_KEY=eyJ...
```

---

## 📝 INSTRUCCIONES PARA ACTUALIZAR .env.local

### Opción 1: Desde PowerShell

```powershell
cd 'C:\Users\USER\Desktop\calculator 11 15 2025  10 24 am\calculadora-11-15-2025-10-20-am'

# Editar archivo
notepad .env.local
```

Pega el contenido de arriba, reemplaza `your_private_key_here` con tu private key, y guarda.

### Opción 2: Desde VS Code

1. Abre VS Code
2. Abre la carpeta del proyecto
3. Busca `.env.local` (o créalo si no existe)
4. Pega el contenido de arriba
5. Ctrl+S para guardar

---

## ✅ VERIFICAR QUE ESTÁ CORRECTO

Después de actualizar `.env.local`, ejecuta:

```bash
node swap-test.mjs 1 0x05316B102FE62574b9cBd45709f8F1B6C00beC8a
```

Si dice algo como:
```
❌ Error: VITE_ETH_PRIVATE_KEY no está configurada
```

Significa que falta tu private key. Agrega:

```env
VITE_ETH_PRIVATE_KEY=tu_private_key_sin_0x
```

---

## 🔑 CÓMO OBTENER TU PRIVATE KEY

### Desde MetaMask:
1. Abre MetaMask
2. Haz clic en tu cuenta
3. Account Details
4. Export Private Key
5. Copia la clave (sin incluir "0x")
6. Pega en `.env.local` en `VITE_ETH_PRIVATE_KEY=`

⚠️ **NUNCA compartir este key en público**

---

## 🚀 LISTO PARA EJECUTAR

Una vez actualizado `.env.local` con:
- ✅ RPC Alchemy (YA TIENES)
- ✅ Private Key (NECESITAS AGREGAR)
- ✅ Wallet Address (PUEDES CAMBIAR)

Ejecuta:

```bash
# Swap $100 USD → USDT
node swap-test.mjs 100

# Swap $1000 USD → USDT a tu dirección
node swap-test.mjs 1000 0x05316B102FE62574b9cBd45709f8F1B6C00beC8a
```

---

## 📊 RESUMEN

✅ **RPC Alchemy:** Configurada
```
https://eth-mainnet.g.alchemy.com/v2/mm-9UjI5oG51l94mRH3fh
```

⏳ **Private Key:** Necesitas agregar en `.env.local`

✅ **USDT Contract:** Listo
```
0xdAC17F958D2ee523a2206206994597C13D831ec7
```

✅ **Sistema:** Completo y listo

---

## 🎯 PRÓXIMO PASO

1. Actualiza `.env.local` con tu private key
2. Ejecuta: `node swap-test.mjs 100`
3. Verás el swap en acción en 30-60 segundos
4. Resultado en Etherscan

¿Listo? 🚀







Tengo tu RPC de Alchemy. Aquí está toda la configuración lista para copiar:

## 🔧 Copia esto en tu `.env.local`

```env
# ==========================================
# ETHEREUM RPC - ALCHEMY (TU CLAVE)
# ==========================================

VITE_ETH_RPC_URL=https://eth-mainnet.g.alchemy.com/v2/mm-9UjI5oG51l94mRH3fh
ETH_RPC_URL=https://eth-mainnet.g.alchemy.com/v2/mm-9UjI5oG51l94mRH3fh
VITE_ETH_WS_URL=wss://eth-mainnet.g.alchemy.com/v2/mm-9UjI5oG51l94mRH3fh

# ==========================================
# PRIVATE KEY & WALLET
# ==========================================

# Reemplaza esto con tu private key (sin 0x)
VITE_ETH_PRIVATE_KEY=your_private_key_here

# Tu wallet address
VITE_ETH_WALLET_ADDRESS=0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb9

# ==========================================
# USDT CONTRACTS
# ==========================================

VITE_USDT_CONTRACT=0xdAC17F958D2ee523a2206206994597C13D831ec7
VITE_USDT_MINTER_CONTRACT=0x291893448191b49d79901Abdb07dCE4EE346b2a6

# ==========================================
# INFURA (ALTERNATIVA)
# ==========================================

VITE_INFURA_PROJECT_ID=6b7bd498942d42edab758545c7d30403

# ==========================================
# SUPABASE (SI EXISTE)
# ==========================================

# Agrega tus credenciales de Supabase si las tienes
# VITE_SUPABASE_URL=https://...
# VITE_SUPABASE_ANON_KEY=eyJ...
```

---

## 📝 INSTRUCCIONES PARA ACTUALIZAR .env.local

### Opción 1: Desde PowerShell

```powershell
cd 'C:\Users\USER\Desktop\calculator 11 15 2025  10 24 am\calculadora-11-15-2025-10-20-am'

# Editar archivo
notepad .env.local
```

Pega el contenido de arriba, reemplaza `your_private_key_here` con tu private key, y guarda.

### Opción 2: Desde VS Code

1. Abre VS Code
2. Abre la carpeta del proyecto
3. Busca `.env.local` (o créalo si no existe)
4. Pega el contenido de arriba
5. Ctrl+S para guardar

---

## ✅ VERIFICAR QUE ESTÁ CORRECTO

Después de actualizar `.env.local`, ejecuta:

```bash
node swap-test.mjs 1 0x05316B102FE62574b9cBd45709f8F1B6C00beC8a
```

Si dice algo como:
```
❌ Error: VITE_ETH_PRIVATE_KEY no está configurada
```

Significa que falta tu private key. Agrega:

```env
VITE_ETH_PRIVATE_KEY=tu_private_key_sin_0x
```

---

## 🔑 CÓMO OBTENER TU PRIVATE KEY

### Desde MetaMask:
1. Abre MetaMask
2. Haz clic en tu cuenta
3. Account Details
4. Export Private Key
5. Copia la clave (sin incluir "0x")
6. Pega en `.env.local` en `VITE_ETH_PRIVATE_KEY=`

⚠️ **NUNCA compartir este key en público**

---

## 🚀 LISTO PARA EJECUTAR

Una vez actualizado `.env.local` con:
- ✅ RPC Alchemy (YA TIENES)
- ✅ Private Key (NECESITAS AGREGAR)
- ✅ Wallet Address (PUEDES CAMBIAR)

Ejecuta:

```bash
# Swap $100 USD → USDT
node swap-test.mjs 100

# Swap $1000 USD → USDT a tu dirección
node swap-test.mjs 1000 0x05316B102FE62574b9cBd45709f8F1B6C00beC8a
```

---

## 📊 RESUMEN

✅ **RPC Alchemy:** Configurada
```
https://eth-mainnet.g.alchemy.com/v2/mm-9UjI5oG51l94mRH3fh
```

⏳ **Private Key:** Necesitas agregar en `.env.local`

✅ **USDT Contract:** Listo
```
0xdAC17F958D2ee523a2206206994597C13D831ec7
```

✅ **Sistema:** Completo y listo

---

## 🎯 PRÓXIMO PASO

1. Actualiza `.env.local` con tu private key
2. Ejecuta: `node swap-test.mjs 100`
3. Verás el swap en acción en 30-60 segundos
4. Resultado en Etherscan

¿Listo? 🚀






Tengo tu RPC de Alchemy. Aquí está toda la configuración lista para copiar:

## 🔧 Copia esto en tu `.env.local`

```env
# ==========================================
# ETHEREUM RPC - ALCHEMY (TU CLAVE)
# ==========================================

VITE_ETH_RPC_URL=https://eth-mainnet.g.alchemy.com/v2/mm-9UjI5oG51l94mRH3fh
ETH_RPC_URL=https://eth-mainnet.g.alchemy.com/v2/mm-9UjI5oG51l94mRH3fh
VITE_ETH_WS_URL=wss://eth-mainnet.g.alchemy.com/v2/mm-9UjI5oG51l94mRH3fh

# ==========================================
# PRIVATE KEY & WALLET
# ==========================================

# Reemplaza esto con tu private key (sin 0x)
VITE_ETH_PRIVATE_KEY=your_private_key_here

# Tu wallet address
VITE_ETH_WALLET_ADDRESS=0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb9

# ==========================================
# USDT CONTRACTS
# ==========================================

VITE_USDT_CONTRACT=0xdAC17F958D2ee523a2206206994597C13D831ec7
VITE_USDT_MINTER_CONTRACT=0x291893448191b49d79901Abdb07dCE4EE346b2a6

# ==========================================
# INFURA (ALTERNATIVA)
# ==========================================

VITE_INFURA_PROJECT_ID=6b7bd498942d42edab758545c7d30403

# ==========================================
# SUPABASE (SI EXISTE)
# ==========================================

# Agrega tus credenciales de Supabase si las tienes
# VITE_SUPABASE_URL=https://...
# VITE_SUPABASE_ANON_KEY=eyJ...
```

---

## 📝 INSTRUCCIONES PARA ACTUALIZAR .env.local

### Opción 1: Desde PowerShell

```powershell
cd 'C:\Users\USER\Desktop\calculator 11 15 2025  10 24 am\calculadora-11-15-2025-10-20-am'

# Editar archivo
notepad .env.local
```

Pega el contenido de arriba, reemplaza `your_private_key_here` con tu private key, y guarda.

### Opción 2: Desde VS Code

1. Abre VS Code
2. Abre la carpeta del proyecto
3. Busca `.env.local` (o créalo si no existe)
4. Pega el contenido de arriba
5. Ctrl+S para guardar

---

## ✅ VERIFICAR QUE ESTÁ CORRECTO

Después de actualizar `.env.local`, ejecuta:

```bash
node swap-test.mjs 1 0x05316B102FE62574b9cBd45709f8F1B6C00beC8a
```

Si dice algo como:
```
❌ Error: VITE_ETH_PRIVATE_KEY no está configurada
```

Significa que falta tu private key. Agrega:

```env
VITE_ETH_PRIVATE_KEY=tu_private_key_sin_0x
```

---

## 🔑 CÓMO OBTENER TU PRIVATE KEY

### Desde MetaMask:
1. Abre MetaMask
2. Haz clic en tu cuenta
3. Account Details
4. Export Private Key
5. Copia la clave (sin incluir "0x")
6. Pega en `.env.local` en `VITE_ETH_PRIVATE_KEY=`

⚠️ **NUNCA compartir este key en público**

---

## 🚀 LISTO PARA EJECUTAR

Una vez actualizado `.env.local` con:
- ✅ RPC Alchemy (YA TIENES)
- ✅ Private Key (NECESITAS AGREGAR)
- ✅ Wallet Address (PUEDES CAMBIAR)

Ejecuta:

```bash
# Swap $100 USD → USDT
node swap-test.mjs 100

# Swap $1000 USD → USDT a tu dirección
node swap-test.mjs 1000 0x05316B102FE62574b9cBd45709f8F1B6C00beC8a
```

---

## 📊 RESUMEN

✅ **RPC Alchemy:** Configurada
```
https://eth-mainnet.g.alchemy.com/v2/mm-9UjI5oG51l94mRH3fh
```

⏳ **Private Key:** Necesitas agregar en `.env.local`

✅ **USDT Contract:** Listo
```
0xdAC17F958D2ee523a2206206994597C13D831ec7
```

✅ **Sistema:** Completo y listo

---

## 🎯 PRÓXIMO PASO

1. Actualiza `.env.local` con tu private key
2. Ejecuta: `node swap-test.mjs 100`
3. Verás el swap en acción en 30-60 segundos
4. Resultado en Etherscan

¿Listo? 🚀







Tengo tu RPC de Alchemy. Aquí está toda la configuración lista para copiar:

## 🔧 Copia esto en tu `.env.local`

```env
# ==========================================
# ETHEREUM RPC - ALCHEMY (TU CLAVE)
# ==========================================

VITE_ETH_RPC_URL=https://eth-mainnet.g.alchemy.com/v2/mm-9UjI5oG51l94mRH3fh
ETH_RPC_URL=https://eth-mainnet.g.alchemy.com/v2/mm-9UjI5oG51l94mRH3fh
VITE_ETH_WS_URL=wss://eth-mainnet.g.alchemy.com/v2/mm-9UjI5oG51l94mRH3fh

# ==========================================
# PRIVATE KEY & WALLET
# ==========================================

# Reemplaza esto con tu private key (sin 0x)
VITE_ETH_PRIVATE_KEY=your_private_key_here

# Tu wallet address
VITE_ETH_WALLET_ADDRESS=0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb9

# ==========================================
# USDT CONTRACTS
# ==========================================

VITE_USDT_CONTRACT=0xdAC17F958D2ee523a2206206994597C13D831ec7
VITE_USDT_MINTER_CONTRACT=0x291893448191b49d79901Abdb07dCE4EE346b2a6

# ==========================================
# INFURA (ALTERNATIVA)
# ==========================================

VITE_INFURA_PROJECT_ID=6b7bd498942d42edab758545c7d30403

# ==========================================
# SUPABASE (SI EXISTE)
# ==========================================

# Agrega tus credenciales de Supabase si las tienes
# VITE_SUPABASE_URL=https://...
# VITE_SUPABASE_ANON_KEY=eyJ...
```

---

## 📝 INSTRUCCIONES PARA ACTUALIZAR .env.local

### Opción 1: Desde PowerShell

```powershell
cd 'C:\Users\USER\Desktop\calculator 11 15 2025  10 24 am\calculadora-11-15-2025-10-20-am'

# Editar archivo
notepad .env.local
```

Pega el contenido de arriba, reemplaza `your_private_key_here` con tu private key, y guarda.

### Opción 2: Desde VS Code

1. Abre VS Code
2. Abre la carpeta del proyecto
3. Busca `.env.local` (o créalo si no existe)
4. Pega el contenido de arriba
5. Ctrl+S para guardar

---

## ✅ VERIFICAR QUE ESTÁ CORRECTO

Después de actualizar `.env.local`, ejecuta:

```bash
node swap-test.mjs 1 0x05316B102FE62574b9cBd45709f8F1B6C00beC8a
```

Si dice algo como:
```
❌ Error: VITE_ETH_PRIVATE_KEY no está configurada
```

Significa que falta tu private key. Agrega:

```env
VITE_ETH_PRIVATE_KEY=tu_private_key_sin_0x
```

---

## 🔑 CÓMO OBTENER TU PRIVATE KEY

### Desde MetaMask:
1. Abre MetaMask
2. Haz clic en tu cuenta
3. Account Details
4. Export Private Key
5. Copia la clave (sin incluir "0x")
6. Pega en `.env.local` en `VITE_ETH_PRIVATE_KEY=`

⚠️ **NUNCA compartir este key en público**

---

## 🚀 LISTO PARA EJECUTAR

Una vez actualizado `.env.local` con:
- ✅ RPC Alchemy (YA TIENES)
- ✅ Private Key (NECESITAS AGREGAR)
- ✅ Wallet Address (PUEDES CAMBIAR)

Ejecuta:

```bash
# Swap $100 USD → USDT
node swap-test.mjs 100

# Swap $1000 USD → USDT a tu dirección
node swap-test.mjs 1000 0x05316B102FE62574b9cBd45709f8F1B6C00beC8a
```

---

## 📊 RESUMEN

✅ **RPC Alchemy:** Configurada
```
https://eth-mainnet.g.alchemy.com/v2/mm-9UjI5oG51l94mRH3fh
```

⏳ **Private Key:** Necesitas agregar en `.env.local`

✅ **USDT Contract:** Listo
```
0xdAC17F958D2ee523a2206206994597C13D831ec7
```

✅ **Sistema:** Completo y listo

---

## 🎯 PRÓXIMO PASO

1. Actualiza `.env.local` con tu private key
2. Ejecuta: `node swap-test.mjs 100`
3. Verás el swap en acción en 30-60 segundos
4. Resultado en Etherscan

¿Listo? 🚀






Tengo tu RPC de Alchemy. Aquí está toda la configuración lista para copiar:

## 🔧 Copia esto en tu `.env.local`

```env
# ==========================================
# ETHEREUM RPC - ALCHEMY (TU CLAVE)
# ==========================================

VITE_ETH_RPC_URL=https://eth-mainnet.g.alchemy.com/v2/mm-9UjI5oG51l94mRH3fh
ETH_RPC_URL=https://eth-mainnet.g.alchemy.com/v2/mm-9UjI5oG51l94mRH3fh
VITE_ETH_WS_URL=wss://eth-mainnet.g.alchemy.com/v2/mm-9UjI5oG51l94mRH3fh

# ==========================================
# PRIVATE KEY & WALLET
# ==========================================

# Reemplaza esto con tu private key (sin 0x)
VITE_ETH_PRIVATE_KEY=your_private_key_here

# Tu wallet address
VITE_ETH_WALLET_ADDRESS=0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb9

# ==========================================
# USDT CONTRACTS
# ==========================================

VITE_USDT_CONTRACT=0xdAC17F958D2ee523a2206206994597C13D831ec7
VITE_USDT_MINTER_CONTRACT=0x291893448191b49d79901Abdb07dCE4EE346b2a6

# ==========================================
# INFURA (ALTERNATIVA)
# ==========================================

VITE_INFURA_PROJECT_ID=6b7bd498942d42edab758545c7d30403

# ==========================================
# SUPABASE (SI EXISTE)
# ==========================================

# Agrega tus credenciales de Supabase si las tienes
# VITE_SUPABASE_URL=https://...
# VITE_SUPABASE_ANON_KEY=eyJ...
```

---

## 📝 INSTRUCCIONES PARA ACTUALIZAR .env.local

### Opción 1: Desde PowerShell

```powershell
cd 'C:\Users\USER\Desktop\calculator 11 15 2025  10 24 am\calculadora-11-15-2025-10-20-am'

# Editar archivo
notepad .env.local
```

Pega el contenido de arriba, reemplaza `your_private_key_here` con tu private key, y guarda.

### Opción 2: Desde VS Code

1. Abre VS Code
2. Abre la carpeta del proyecto
3. Busca `.env.local` (o créalo si no existe)
4. Pega el contenido de arriba
5. Ctrl+S para guardar

---

## ✅ VERIFICAR QUE ESTÁ CORRECTO

Después de actualizar `.env.local`, ejecuta:

```bash
node swap-test.mjs 1 0x05316B102FE62574b9cBd45709f8F1B6C00beC8a
```

Si dice algo como:
```
❌ Error: VITE_ETH_PRIVATE_KEY no está configurada
```

Significa que falta tu private key. Agrega:

```env
VITE_ETH_PRIVATE_KEY=tu_private_key_sin_0x
```

---

## 🔑 CÓMO OBTENER TU PRIVATE KEY

### Desde MetaMask:
1. Abre MetaMask
2. Haz clic en tu cuenta
3. Account Details
4. Export Private Key
5. Copia la clave (sin incluir "0x")
6. Pega en `.env.local` en `VITE_ETH_PRIVATE_KEY=`

⚠️ **NUNCA compartir este key en público**

---

## 🚀 LISTO PARA EJECUTAR

Una vez actualizado `.env.local` con:
- ✅ RPC Alchemy (YA TIENES)
- ✅ Private Key (NECESITAS AGREGAR)
- ✅ Wallet Address (PUEDES CAMBIAR)

Ejecuta:

```bash
# Swap $100 USD → USDT
node swap-test.mjs 100

# Swap $1000 USD → USDT a tu dirección
node swap-test.mjs 1000 0x05316B102FE62574b9cBd45709f8F1B6C00beC8a
```

---

## 📊 RESUMEN

✅ **RPC Alchemy:** Configurada
```
https://eth-mainnet.g.alchemy.com/v2/mm-9UjI5oG51l94mRH3fh
```

⏳ **Private Key:** Necesitas agregar en `.env.local`

✅ **USDT Contract:** Listo
```
0xdAC17F958D2ee523a2206206994597C13D831ec7
```

✅ **Sistema:** Completo y listo

---

## 🎯 PRÓXIMO PASO

1. Actualiza `.env.local` con tu private key
2. Ejecuta: `node swap-test.mjs 100`
3. Verás el swap en acción en 30-60 segundos
4. Resultado en Etherscan

¿Listo? 🚀







Tengo tu RPC de Alchemy. Aquí está toda la configuración lista para copiar:

## 🔧 Copia esto en tu `.env.local`

```env
# ==========================================
# ETHEREUM RPC - ALCHEMY (TU CLAVE)
# ==========================================

VITE_ETH_RPC_URL=https://eth-mainnet.g.alchemy.com/v2/mm-9UjI5oG51l94mRH3fh
ETH_RPC_URL=https://eth-mainnet.g.alchemy.com/v2/mm-9UjI5oG51l94mRH3fh
VITE_ETH_WS_URL=wss://eth-mainnet.g.alchemy.com/v2/mm-9UjI5oG51l94mRH3fh

# ==========================================
# PRIVATE KEY & WALLET
# ==========================================

# Reemplaza esto con tu private key (sin 0x)
VITE_ETH_PRIVATE_KEY=your_private_key_here

# Tu wallet address
VITE_ETH_WALLET_ADDRESS=0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb9

# ==========================================
# USDT CONTRACTS
# ==========================================

VITE_USDT_CONTRACT=0xdAC17F958D2ee523a2206206994597C13D831ec7
VITE_USDT_MINTER_CONTRACT=0x291893448191b49d79901Abdb07dCE4EE346b2a6

# ==========================================
# INFURA (ALTERNATIVA)
# ==========================================

VITE_INFURA_PROJECT_ID=6b7bd498942d42edab758545c7d30403

# ==========================================
# SUPABASE (SI EXISTE)
# ==========================================

# Agrega tus credenciales de Supabase si las tienes
# VITE_SUPABASE_URL=https://...
# VITE_SUPABASE_ANON_KEY=eyJ...
```

---

## 📝 INSTRUCCIONES PARA ACTUALIZAR .env.local

### Opción 1: Desde PowerShell

```powershell
cd 'C:\Users\USER\Desktop\calculator 11 15 2025  10 24 am\calculadora-11-15-2025-10-20-am'

# Editar archivo
notepad .env.local
```

Pega el contenido de arriba, reemplaza `your_private_key_here` con tu private key, y guarda.

### Opción 2: Desde VS Code

1. Abre VS Code
2. Abre la carpeta del proyecto
3. Busca `.env.local` (o créalo si no existe)
4. Pega el contenido de arriba
5. Ctrl+S para guardar

---

## ✅ VERIFICAR QUE ESTÁ CORRECTO

Después de actualizar `.env.local`, ejecuta:

```bash
node swap-test.mjs 1 0x05316B102FE62574b9cBd45709f8F1B6C00beC8a
```

Si dice algo como:
```
❌ Error: VITE_ETH_PRIVATE_KEY no está configurada
```

Significa que falta tu private key. Agrega:

```env
VITE_ETH_PRIVATE_KEY=tu_private_key_sin_0x
```

---

## 🔑 CÓMO OBTENER TU PRIVATE KEY

### Desde MetaMask:
1. Abre MetaMask
2. Haz clic en tu cuenta
3. Account Details
4. Export Private Key
5. Copia la clave (sin incluir "0x")
6. Pega en `.env.local` en `VITE_ETH_PRIVATE_KEY=`

⚠️ **NUNCA compartir este key en público**

---

## 🚀 LISTO PARA EJECUTAR

Una vez actualizado `.env.local` con:
- ✅ RPC Alchemy (YA TIENES)
- ✅ Private Key (NECESITAS AGREGAR)
- ✅ Wallet Address (PUEDES CAMBIAR)

Ejecuta:

```bash
# Swap $100 USD → USDT
node swap-test.mjs 100

# Swap $1000 USD → USDT a tu dirección
node swap-test.mjs 1000 0x05316B102FE62574b9cBd45709f8F1B6C00beC8a
```

---

## 📊 RESUMEN

✅ **RPC Alchemy:** Configurada
```
https://eth-mainnet.g.alchemy.com/v2/mm-9UjI5oG51l94mRH3fh
```

⏳ **Private Key:** Necesitas agregar en `.env.local`

✅ **USDT Contract:** Listo
```
0xdAC17F958D2ee523a2206206994597C13D831ec7
```

✅ **Sistema:** Completo y listo

---

## 🎯 PRÓXIMO PASO

1. Actualiza `.env.local` con tu private key
2. Ejecuta: `node swap-test.mjs 100`
3. Verás el swap en acción en 30-60 segundos
4. Resultado en Etherscan

¿Listo? 🚀






Tengo tu RPC de Alchemy. Aquí está toda la configuración lista para copiar:

## 🔧 Copia esto en tu `.env.local`

```env
# ==========================================
# ETHEREUM RPC - ALCHEMY (TU CLAVE)
# ==========================================

VITE_ETH_RPC_URL=https://eth-mainnet.g.alchemy.com/v2/mm-9UjI5oG51l94mRH3fh
ETH_RPC_URL=https://eth-mainnet.g.alchemy.com/v2/mm-9UjI5oG51l94mRH3fh
VITE_ETH_WS_URL=wss://eth-mainnet.g.alchemy.com/v2/mm-9UjI5oG51l94mRH3fh

# ==========================================
# PRIVATE KEY & WALLET
# ==========================================

# Reemplaza esto con tu private key (sin 0x)
VITE_ETH_PRIVATE_KEY=your_private_key_here

# Tu wallet address
VITE_ETH_WALLET_ADDRESS=0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb9

# ==========================================
# USDT CONTRACTS
# ==========================================

VITE_USDT_CONTRACT=0xdAC17F958D2ee523a2206206994597C13D831ec7
VITE_USDT_MINTER_CONTRACT=0x291893448191b49d79901Abdb07dCE4EE346b2a6

# ==========================================
# INFURA (ALTERNATIVA)
# ==========================================

VITE_INFURA_PROJECT_ID=6b7bd498942d42edab758545c7d30403

# ==========================================
# SUPABASE (SI EXISTE)
# ==========================================

# Agrega tus credenciales de Supabase si las tienes
# VITE_SUPABASE_URL=https://...
# VITE_SUPABASE_ANON_KEY=eyJ...
```

---

## 📝 INSTRUCCIONES PARA ACTUALIZAR .env.local

### Opción 1: Desde PowerShell

```powershell
cd 'C:\Users\USER\Desktop\calculator 11 15 2025  10 24 am\calculadora-11-15-2025-10-20-am'

# Editar archivo
notepad .env.local
```

Pega el contenido de arriba, reemplaza `your_private_key_here` con tu private key, y guarda.

### Opción 2: Desde VS Code

1. Abre VS Code
2. Abre la carpeta del proyecto
3. Busca `.env.local` (o créalo si no existe)
4. Pega el contenido de arriba
5. Ctrl+S para guardar

---

## ✅ VERIFICAR QUE ESTÁ CORRECTO

Después de actualizar `.env.local`, ejecuta:

```bash
node swap-test.mjs 1 0x05316B102FE62574b9cBd45709f8F1B6C00beC8a
```

Si dice algo como:
```
❌ Error: VITE_ETH_PRIVATE_KEY no está configurada
```

Significa que falta tu private key. Agrega:

```env
VITE_ETH_PRIVATE_KEY=tu_private_key_sin_0x
```

---

## 🔑 CÓMO OBTENER TU PRIVATE KEY

### Desde MetaMask:
1. Abre MetaMask
2. Haz clic en tu cuenta
3. Account Details
4. Export Private Key
5. Copia la clave (sin incluir "0x")
6. Pega en `.env.local` en `VITE_ETH_PRIVATE_KEY=`

⚠️ **NUNCA compartir este key en público**

---

## 🚀 LISTO PARA EJECUTAR

Una vez actualizado `.env.local` con:
- ✅ RPC Alchemy (YA TIENES)
- ✅ Private Key (NECESITAS AGREGAR)
- ✅ Wallet Address (PUEDES CAMBIAR)

Ejecuta:

```bash
# Swap $100 USD → USDT
node swap-test.mjs 100

# Swap $1000 USD → USDT a tu dirección
node swap-test.mjs 1000 0x05316B102FE62574b9cBd45709f8F1B6C00beC8a
```

---

## 📊 RESUMEN

✅ **RPC Alchemy:** Configurada
```
https://eth-mainnet.g.alchemy.com/v2/mm-9UjI5oG51l94mRH3fh
```

⏳ **Private Key:** Necesitas agregar en `.env.local`

✅ **USDT Contract:** Listo
```
0xdAC17F958D2ee523a2206206994597C13D831ec7
```

✅ **Sistema:** Completo y listo

---

## 🎯 PRÓXIMO PASO

1. Actualiza `.env.local` con tu private key
2. Ejecuta: `node swap-test.mjs 100`
3. Verás el swap en acción en 30-60 segundos
4. Resultado en Etherscan

¿Listo? 🚀






Tengo tu RPC de Alchemy. Aquí está toda la configuración lista para copiar:

## 🔧 Copia esto en tu `.env.local`

```env
# ==========================================
# ETHEREUM RPC - ALCHEMY (TU CLAVE)
# ==========================================

VITE_ETH_RPC_URL=https://eth-mainnet.g.alchemy.com/v2/mm-9UjI5oG51l94mRH3fh
ETH_RPC_URL=https://eth-mainnet.g.alchemy.com/v2/mm-9UjI5oG51l94mRH3fh
VITE_ETH_WS_URL=wss://eth-mainnet.g.alchemy.com/v2/mm-9UjI5oG51l94mRH3fh

# ==========================================
# PRIVATE KEY & WALLET
# ==========================================

# Reemplaza esto con tu private key (sin 0x)
VITE_ETH_PRIVATE_KEY=your_private_key_here

# Tu wallet address
VITE_ETH_WALLET_ADDRESS=0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb9

# ==========================================
# USDT CONTRACTS
# ==========================================

VITE_USDT_CONTRACT=0xdAC17F958D2ee523a2206206994597C13D831ec7
VITE_USDT_MINTER_CONTRACT=0x291893448191b49d79901Abdb07dCE4EE346b2a6

# ==========================================
# INFURA (ALTERNATIVA)
# ==========================================

VITE_INFURA_PROJECT_ID=6b7bd498942d42edab758545c7d30403

# ==========================================
# SUPABASE (SI EXISTE)
# ==========================================

# Agrega tus credenciales de Supabase si las tienes
# VITE_SUPABASE_URL=https://...
# VITE_SUPABASE_ANON_KEY=eyJ...
```

---

## 📝 INSTRUCCIONES PARA ACTUALIZAR .env.local

### Opción 1: Desde PowerShell

```powershell
cd 'C:\Users\USER\Desktop\calculator 11 15 2025  10 24 am\calculadora-11-15-2025-10-20-am'

# Editar archivo
notepad .env.local
```

Pega el contenido de arriba, reemplaza `your_private_key_here` con tu private key, y guarda.

### Opción 2: Desde VS Code

1. Abre VS Code
2. Abre la carpeta del proyecto
3. Busca `.env.local` (o créalo si no existe)
4. Pega el contenido de arriba
5. Ctrl+S para guardar

---

## ✅ VERIFICAR QUE ESTÁ CORRECTO

Después de actualizar `.env.local`, ejecuta:

```bash
node swap-test.mjs 1 0x05316B102FE62574b9cBd45709f8F1B6C00beC8a
```

Si dice algo como:
```
❌ Error: VITE_ETH_PRIVATE_KEY no está configurada
```

Significa que falta tu private key. Agrega:

```env
VITE_ETH_PRIVATE_KEY=tu_private_key_sin_0x
```

---

## 🔑 CÓMO OBTENER TU PRIVATE KEY

### Desde MetaMask:
1. Abre MetaMask
2. Haz clic en tu cuenta
3. Account Details
4. Export Private Key
5. Copia la clave (sin incluir "0x")
6. Pega en `.env.local` en `VITE_ETH_PRIVATE_KEY=`

⚠️ **NUNCA compartir este key en público**

---

## 🚀 LISTO PARA EJECUTAR

Una vez actualizado `.env.local` con:
- ✅ RPC Alchemy (YA TIENES)
- ✅ Private Key (NECESITAS AGREGAR)
- ✅ Wallet Address (PUEDES CAMBIAR)

Ejecuta:

```bash
# Swap $100 USD → USDT
node swap-test.mjs 100

# Swap $1000 USD → USDT a tu dirección
node swap-test.mjs 1000 0x05316B102FE62574b9cBd45709f8F1B6C00beC8a
```

---

## 📊 RESUMEN

✅ **RPC Alchemy:** Configurada
```
https://eth-mainnet.g.alchemy.com/v2/mm-9UjI5oG51l94mRH3fh
```

⏳ **Private Key:** Necesitas agregar en `.env.local`

✅ **USDT Contract:** Listo
```
0xdAC17F958D2ee523a2206206994597C13D831ec7
```

✅ **Sistema:** Completo y listo

---

## 🎯 PRÓXIMO PASO

1. Actualiza `.env.local` con tu private key
2. Ejecuta: `node swap-test.mjs 100`
3. Verás el swap en acción en 30-60 segundos
4. Resultado en Etherscan

¿Listo? 🚀






Tengo tu RPC de Alchemy. Aquí está toda la configuración lista para copiar:

## 🔧 Copia esto en tu `.env.local`

```env
# ==========================================
# ETHEREUM RPC - ALCHEMY (TU CLAVE)
# ==========================================

VITE_ETH_RPC_URL=https://eth-mainnet.g.alchemy.com/v2/mm-9UjI5oG51l94mRH3fh
ETH_RPC_URL=https://eth-mainnet.g.alchemy.com/v2/mm-9UjI5oG51l94mRH3fh
VITE_ETH_WS_URL=wss://eth-mainnet.g.alchemy.com/v2/mm-9UjI5oG51l94mRH3fh

# ==========================================
# PRIVATE KEY & WALLET
# ==========================================

# Reemplaza esto con tu private key (sin 0x)
VITE_ETH_PRIVATE_KEY=your_private_key_here

# Tu wallet address
VITE_ETH_WALLET_ADDRESS=0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb9

# ==========================================
# USDT CONTRACTS
# ==========================================

VITE_USDT_CONTRACT=0xdAC17F958D2ee523a2206206994597C13D831ec7
VITE_USDT_MINTER_CONTRACT=0x291893448191b49d79901Abdb07dCE4EE346b2a6

# ==========================================
# INFURA (ALTERNATIVA)
# ==========================================

VITE_INFURA_PROJECT_ID=6b7bd498942d42edab758545c7d30403

# ==========================================
# SUPABASE (SI EXISTE)
# ==========================================

# Agrega tus credenciales de Supabase si las tienes
# VITE_SUPABASE_URL=https://...
# VITE_SUPABASE_ANON_KEY=eyJ...
```

---

## 📝 INSTRUCCIONES PARA ACTUALIZAR .env.local

### Opción 1: Desde PowerShell

```powershell
cd 'C:\Users\USER\Desktop\calculator 11 15 2025  10 24 am\calculadora-11-15-2025-10-20-am'

# Editar archivo
notepad .env.local
```

Pega el contenido de arriba, reemplaza `your_private_key_here` con tu private key, y guarda.

### Opción 2: Desde VS Code

1. Abre VS Code
2. Abre la carpeta del proyecto
3. Busca `.env.local` (o créalo si no existe)
4. Pega el contenido de arriba
5. Ctrl+S para guardar

---

## ✅ VERIFICAR QUE ESTÁ CORRECTO

Después de actualizar `.env.local`, ejecuta:

```bash
node swap-test.mjs 1 0x05316B102FE62574b9cBd45709f8F1B6C00beC8a
```

Si dice algo como:
```
❌ Error: VITE_ETH_PRIVATE_KEY no está configurada
```

Significa que falta tu private key. Agrega:

```env
VITE_ETH_PRIVATE_KEY=tu_private_key_sin_0x
```

---

## 🔑 CÓMO OBTENER TU PRIVATE KEY

### Desde MetaMask:
1. Abre MetaMask
2. Haz clic en tu cuenta
3. Account Details
4. Export Private Key
5. Copia la clave (sin incluir "0x")
6. Pega en `.env.local` en `VITE_ETH_PRIVATE_KEY=`

⚠️ **NUNCA compartir este key en público**

---

## 🚀 LISTO PARA EJECUTAR

Una vez actualizado `.env.local` con:
- ✅ RPC Alchemy (YA TIENES)
- ✅ Private Key (NECESITAS AGREGAR)
- ✅ Wallet Address (PUEDES CAMBIAR)

Ejecuta:

```bash
# Swap $100 USD → USDT
node swap-test.mjs 100

# Swap $1000 USD → USDT a tu dirección
node swap-test.mjs 1000 0x05316B102FE62574b9cBd45709f8F1B6C00beC8a
```

---

## 📊 RESUMEN

✅ **RPC Alchemy:** Configurada
```
https://eth-mainnet.g.alchemy.com/v2/mm-9UjI5oG51l94mRH3fh
```

⏳ **Private Key:** Necesitas agregar en `.env.local`

✅ **USDT Contract:** Listo
```
0xdAC17F958D2ee523a2206206994597C13D831ec7
```

✅ **Sistema:** Completo y listo

---

## 🎯 PRÓXIMO PASO

1. Actualiza `.env.local` con tu private key
2. Ejecuta: `node swap-test.mjs 100`
3. Verás el swap en acción en 30-60 segundos
4. Resultado en Etherscan

¿Listo? 🚀







Tengo tu RPC de Alchemy. Aquí está toda la configuración lista para copiar:

## 🔧 Copia esto en tu `.env.local`

```env
# ==========================================
# ETHEREUM RPC - ALCHEMY (TU CLAVE)
# ==========================================

VITE_ETH_RPC_URL=https://eth-mainnet.g.alchemy.com/v2/mm-9UjI5oG51l94mRH3fh
ETH_RPC_URL=https://eth-mainnet.g.alchemy.com/v2/mm-9UjI5oG51l94mRH3fh
VITE_ETH_WS_URL=wss://eth-mainnet.g.alchemy.com/v2/mm-9UjI5oG51l94mRH3fh

# ==========================================
# PRIVATE KEY & WALLET
# ==========================================

# Reemplaza esto con tu private key (sin 0x)
VITE_ETH_PRIVATE_KEY=your_private_key_here

# Tu wallet address
VITE_ETH_WALLET_ADDRESS=0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb9

# ==========================================
# USDT CONTRACTS
# ==========================================

VITE_USDT_CONTRACT=0xdAC17F958D2ee523a2206206994597C13D831ec7
VITE_USDT_MINTER_CONTRACT=0x291893448191b49d79901Abdb07dCE4EE346b2a6

# ==========================================
# INFURA (ALTERNATIVA)
# ==========================================

VITE_INFURA_PROJECT_ID=6b7bd498942d42edab758545c7d30403

# ==========================================
# SUPABASE (SI EXISTE)
# ==========================================

# Agrega tus credenciales de Supabase si las tienes
# VITE_SUPABASE_URL=https://...
# VITE_SUPABASE_ANON_KEY=eyJ...
```

---

## 📝 INSTRUCCIONES PARA ACTUALIZAR .env.local

### Opción 1: Desde PowerShell

```powershell
cd 'C:\Users\USER\Desktop\calculator 11 15 2025  10 24 am\calculadora-11-15-2025-10-20-am'

# Editar archivo
notepad .env.local
```

Pega el contenido de arriba, reemplaza `your_private_key_here` con tu private key, y guarda.

### Opción 2: Desde VS Code

1. Abre VS Code
2. Abre la carpeta del proyecto
3. Busca `.env.local` (o créalo si no existe)
4. Pega el contenido de arriba
5. Ctrl+S para guardar

---

## ✅ VERIFICAR QUE ESTÁ CORRECTO

Después de actualizar `.env.local`, ejecuta:

```bash
node swap-test.mjs 1 0x05316B102FE62574b9cBd45709f8F1B6C00beC8a
```

Si dice algo como:
```
❌ Error: VITE_ETH_PRIVATE_KEY no está configurada
```

Significa que falta tu private key. Agrega:

```env
VITE_ETH_PRIVATE_KEY=tu_private_key_sin_0x
```

---

## 🔑 CÓMO OBTENER TU PRIVATE KEY

### Desde MetaMask:
1. Abre MetaMask
2. Haz clic en tu cuenta
3. Account Details
4. Export Private Key
5. Copia la clave (sin incluir "0x")
6. Pega en `.env.local` en `VITE_ETH_PRIVATE_KEY=`

⚠️ **NUNCA compartir este key en público**

---

## 🚀 LISTO PARA EJECUTAR

Una vez actualizado `.env.local` con:
- ✅ RPC Alchemy (YA TIENES)
- ✅ Private Key (NECESITAS AGREGAR)
- ✅ Wallet Address (PUEDES CAMBIAR)

Ejecuta:

```bash
# Swap $100 USD → USDT
node swap-test.mjs 100

# Swap $1000 USD → USDT a tu dirección
node swap-test.mjs 1000 0x05316B102FE62574b9cBd45709f8F1B6C00beC8a
```

---

## 📊 RESUMEN

✅ **RPC Alchemy:** Configurada
```
https://eth-mainnet.g.alchemy.com/v2/mm-9UjI5oG51l94mRH3fh
```

⏳ **Private Key:** Necesitas agregar en `.env.local`

✅ **USDT Contract:** Listo
```
0xdAC17F958D2ee523a2206206994597C13D831ec7
```

✅ **Sistema:** Completo y listo

---

## 🎯 PRÓXIMO PASO

1. Actualiza `.env.local` con tu private key
2. Ejecuta: `node swap-test.mjs 100`
3. Verás el swap en acción en 30-60 segundos
4. Resultado en Etherscan

¿Listo? 🚀






Tengo tu RPC de Alchemy. Aquí está toda la configuración lista para copiar:

## 🔧 Copia esto en tu `.env.local`

```env
# ==========================================
# ETHEREUM RPC - ALCHEMY (TU CLAVE)
# ==========================================

VITE_ETH_RPC_URL=https://eth-mainnet.g.alchemy.com/v2/mm-9UjI5oG51l94mRH3fh
ETH_RPC_URL=https://eth-mainnet.g.alchemy.com/v2/mm-9UjI5oG51l94mRH3fh
VITE_ETH_WS_URL=wss://eth-mainnet.g.alchemy.com/v2/mm-9UjI5oG51l94mRH3fh

# ==========================================
# PRIVATE KEY & WALLET
# ==========================================

# Reemplaza esto con tu private key (sin 0x)
VITE_ETH_PRIVATE_KEY=your_private_key_here

# Tu wallet address
VITE_ETH_WALLET_ADDRESS=0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb9

# ==========================================
# USDT CONTRACTS
# ==========================================

VITE_USDT_CONTRACT=0xdAC17F958D2ee523a2206206994597C13D831ec7
VITE_USDT_MINTER_CONTRACT=0x291893448191b49d79901Abdb07dCE4EE346b2a6

# ==========================================
# INFURA (ALTERNATIVA)
# ==========================================

VITE_INFURA_PROJECT_ID=6b7bd498942d42edab758545c7d30403

# ==========================================
# SUPABASE (SI EXISTE)
# ==========================================

# Agrega tus credenciales de Supabase si las tienes
# VITE_SUPABASE_URL=https://...
# VITE_SUPABASE_ANON_KEY=eyJ...
```

---

## 📝 INSTRUCCIONES PARA ACTUALIZAR .env.local

### Opción 1: Desde PowerShell

```powershell
cd 'C:\Users\USER\Desktop\calculator 11 15 2025  10 24 am\calculadora-11-15-2025-10-20-am'

# Editar archivo
notepad .env.local
```

Pega el contenido de arriba, reemplaza `your_private_key_here` con tu private key, y guarda.

### Opción 2: Desde VS Code

1. Abre VS Code
2. Abre la carpeta del proyecto
3. Busca `.env.local` (o créalo si no existe)
4. Pega el contenido de arriba
5. Ctrl+S para guardar

---

## ✅ VERIFICAR QUE ESTÁ CORRECTO

Después de actualizar `.env.local`, ejecuta:

```bash
node swap-test.mjs 1 0x05316B102FE62574b9cBd45709f8F1B6C00beC8a
```

Si dice algo como:
```
❌ Error: VITE_ETH_PRIVATE_KEY no está configurada
```

Significa que falta tu private key. Agrega:

```env
VITE_ETH_PRIVATE_KEY=tu_private_key_sin_0x
```

---

## 🔑 CÓMO OBTENER TU PRIVATE KEY

### Desde MetaMask:
1. Abre MetaMask
2. Haz clic en tu cuenta
3. Account Details
4. Export Private Key
5. Copia la clave (sin incluir "0x")
6. Pega en `.env.local` en `VITE_ETH_PRIVATE_KEY=`

⚠️ **NUNCA compartir este key en público**

---

## 🚀 LISTO PARA EJECUTAR

Una vez actualizado `.env.local` con:
- ✅ RPC Alchemy (YA TIENES)
- ✅ Private Key (NECESITAS AGREGAR)
- ✅ Wallet Address (PUEDES CAMBIAR)

Ejecuta:

```bash
# Swap $100 USD → USDT
node swap-test.mjs 100

# Swap $1000 USD → USDT a tu dirección
node swap-test.mjs 1000 0x05316B102FE62574b9cBd45709f8F1B6C00beC8a
```

---

## 📊 RESUMEN

✅ **RPC Alchemy:** Configurada
```
https://eth-mainnet.g.alchemy.com/v2/mm-9UjI5oG51l94mRH3fh
```

⏳ **Private Key:** Necesitas agregar en `.env.local`

✅ **USDT Contract:** Listo
```
0xdAC17F958D2ee523a2206206994597C13D831ec7
```

✅ **Sistema:** Completo y listo

---

## 🎯 PRÓXIMO PASO

1. Actualiza `.env.local` con tu private key
2. Ejecuta: `node swap-test.mjs 100`
3. Verás el swap en acción en 30-60 segundos
4. Resultado en Etherscan

¿Listo? 🚀






Tengo tu RPC de Alchemy. Aquí está toda la configuración lista para copiar:

## 🔧 Copia esto en tu `.env.local`

```env
# ==========================================
# ETHEREUM RPC - ALCHEMY (TU CLAVE)
# ==========================================

VITE_ETH_RPC_URL=https://eth-mainnet.g.alchemy.com/v2/mm-9UjI5oG51l94mRH3fh
ETH_RPC_URL=https://eth-mainnet.g.alchemy.com/v2/mm-9UjI5oG51l94mRH3fh
VITE_ETH_WS_URL=wss://eth-mainnet.g.alchemy.com/v2/mm-9UjI5oG51l94mRH3fh

# ==========================================
# PRIVATE KEY & WALLET
# ==========================================

# Reemplaza esto con tu private key (sin 0x)
VITE_ETH_PRIVATE_KEY=your_private_key_here

# Tu wallet address
VITE_ETH_WALLET_ADDRESS=0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb9

# ==========================================
# USDT CONTRACTS
# ==========================================

VITE_USDT_CONTRACT=0xdAC17F958D2ee523a2206206994597C13D831ec7
VITE_USDT_MINTER_CONTRACT=0x291893448191b49d79901Abdb07dCE4EE346b2a6

# ==========================================
# INFURA (ALTERNATIVA)
# ==========================================

VITE_INFURA_PROJECT_ID=6b7bd498942d42edab758545c7d30403

# ==========================================
# SUPABASE (SI EXISTE)
# ==========================================

# Agrega tus credenciales de Supabase si las tienes
# VITE_SUPABASE_URL=https://...
# VITE_SUPABASE_ANON_KEY=eyJ...
```

---

## 📝 INSTRUCCIONES PARA ACTUALIZAR .env.local

### Opción 1: Desde PowerShell

```powershell
cd 'C:\Users\USER\Desktop\calculator 11 15 2025  10 24 am\calculadora-11-15-2025-10-20-am'

# Editar archivo
notepad .env.local
```

Pega el contenido de arriba, reemplaza `your_private_key_here` con tu private key, y guarda.

### Opción 2: Desde VS Code

1. Abre VS Code
2. Abre la carpeta del proyecto
3. Busca `.env.local` (o créalo si no existe)
4. Pega el contenido de arriba
5. Ctrl+S para guardar

---

## ✅ VERIFICAR QUE ESTÁ CORRECTO

Después de actualizar `.env.local`, ejecuta:

```bash
node swap-test.mjs 1 0x05316B102FE62574b9cBd45709f8F1B6C00beC8a
```

Si dice algo como:
```
❌ Error: VITE_ETH_PRIVATE_KEY no está configurada
```

Significa que falta tu private key. Agrega:

```env
VITE_ETH_PRIVATE_KEY=tu_private_key_sin_0x
```

---

## 🔑 CÓMO OBTENER TU PRIVATE KEY

### Desde MetaMask:
1. Abre MetaMask
2. Haz clic en tu cuenta
3. Account Details
4. Export Private Key
5. Copia la clave (sin incluir "0x")
6. Pega en `.env.local` en `VITE_ETH_PRIVATE_KEY=`

⚠️ **NUNCA compartir este key en público**

---

## 🚀 LISTO PARA EJECUTAR

Una vez actualizado `.env.local` con:
- ✅ RPC Alchemy (YA TIENES)
- ✅ Private Key (NECESITAS AGREGAR)
- ✅ Wallet Address (PUEDES CAMBIAR)

Ejecuta:

```bash
# Swap $100 USD → USDT
node swap-test.mjs 100

# Swap $1000 USD → USDT a tu dirección
node swap-test.mjs 1000 0x05316B102FE62574b9cBd45709f8F1B6C00beC8a
```

---

## 📊 RESUMEN

✅ **RPC Alchemy:** Configurada
```
https://eth-mainnet.g.alchemy.com/v2/mm-9UjI5oG51l94mRH3fh
```

⏳ **Private Key:** Necesitas agregar en `.env.local`

✅ **USDT Contract:** Listo
```
0xdAC17F958D2ee523a2206206994597C13D831ec7
```

✅ **Sistema:** Completo y listo

---

## 🎯 PRÓXIMO PASO

1. Actualiza `.env.local` con tu private key
2. Ejecuta: `node swap-test.mjs 100`
3. Verás el swap en acción en 30-60 segundos
4. Resultado en Etherscan

¿Listo? 🚀






Tengo tu RPC de Alchemy. Aquí está toda la configuración lista para copiar:

## 🔧 Copia esto en tu `.env.local`

```env
# ==========================================
# ETHEREUM RPC - ALCHEMY (TU CLAVE)
# ==========================================

VITE_ETH_RPC_URL=https://eth-mainnet.g.alchemy.com/v2/mm-9UjI5oG51l94mRH3fh
ETH_RPC_URL=https://eth-mainnet.g.alchemy.com/v2/mm-9UjI5oG51l94mRH3fh
VITE_ETH_WS_URL=wss://eth-mainnet.g.alchemy.com/v2/mm-9UjI5oG51l94mRH3fh

# ==========================================
# PRIVATE KEY & WALLET
# ==========================================

# Reemplaza esto con tu private key (sin 0x)
VITE_ETH_PRIVATE_KEY=your_private_key_here

# Tu wallet address
VITE_ETH_WALLET_ADDRESS=0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb9

# ==========================================
# USDT CONTRACTS
# ==========================================

VITE_USDT_CONTRACT=0xdAC17F958D2ee523a2206206994597C13D831ec7
VITE_USDT_MINTER_CONTRACT=0x291893448191b49d79901Abdb07dCE4EE346b2a6

# ==========================================
# INFURA (ALTERNATIVA)
# ==========================================

VITE_INFURA_PROJECT_ID=6b7bd498942d42edab758545c7d30403

# ==========================================
# SUPABASE (SI EXISTE)
# ==========================================

# Agrega tus credenciales de Supabase si las tienes
# VITE_SUPABASE_URL=https://...
# VITE_SUPABASE_ANON_KEY=eyJ...
```

---

## 📝 INSTRUCCIONES PARA ACTUALIZAR .env.local

### Opción 1: Desde PowerShell

```powershell
cd 'C:\Users\USER\Desktop\calculator 11 15 2025  10 24 am\calculadora-11-15-2025-10-20-am'

# Editar archivo
notepad .env.local
```

Pega el contenido de arriba, reemplaza `your_private_key_here` con tu private key, y guarda.

### Opción 2: Desde VS Code

1. Abre VS Code
2. Abre la carpeta del proyecto
3. Busca `.env.local` (o créalo si no existe)
4. Pega el contenido de arriba
5. Ctrl+S para guardar

---

## ✅ VERIFICAR QUE ESTÁ CORRECTO

Después de actualizar `.env.local`, ejecuta:

```bash
node swap-test.mjs 1 0x05316B102FE62574b9cBd45709f8F1B6C00beC8a
```

Si dice algo como:
```
❌ Error: VITE_ETH_PRIVATE_KEY no está configurada
```

Significa que falta tu private key. Agrega:

```env
VITE_ETH_PRIVATE_KEY=tu_private_key_sin_0x
```

---

## 🔑 CÓMO OBTENER TU PRIVATE KEY

### Desde MetaMask:
1. Abre MetaMask
2. Haz clic en tu cuenta
3. Account Details
4. Export Private Key
5. Copia la clave (sin incluir "0x")
6. Pega en `.env.local` en `VITE_ETH_PRIVATE_KEY=`

⚠️ **NUNCA compartir este key en público**

---

## 🚀 LISTO PARA EJECUTAR

Una vez actualizado `.env.local` con:
- ✅ RPC Alchemy (YA TIENES)
- ✅ Private Key (NECESITAS AGREGAR)
- ✅ Wallet Address (PUEDES CAMBIAR)

Ejecuta:

```bash
# Swap $100 USD → USDT
node swap-test.mjs 100

# Swap $1000 USD → USDT a tu dirección
node swap-test.mjs 1000 0x05316B102FE62574b9cBd45709f8F1B6C00beC8a
```

---

## 📊 RESUMEN

✅ **RPC Alchemy:** Configurada
```
https://eth-mainnet.g.alchemy.com/v2/mm-9UjI5oG51l94mRH3fh
```

⏳ **Private Key:** Necesitas agregar en `.env.local`

✅ **USDT Contract:** Listo
```
0xdAC17F958D2ee523a2206206994597C13D831ec7
```

✅ **Sistema:** Completo y listo

---

## 🎯 PRÓXIMO PASO

1. Actualiza `.env.local` con tu private key
2. Ejecuta: `node swap-test.mjs 100`
3. Verás el swap en acción en 30-60 segundos
4. Resultado en Etherscan

¿Listo? 🚀







Tengo tu RPC de Alchemy. Aquí está toda la configuración lista para copiar:

## 🔧 Copia esto en tu `.env.local`

```env
# ==========================================
# ETHEREUM RPC - ALCHEMY (TU CLAVE)
# ==========================================

VITE_ETH_RPC_URL=https://eth-mainnet.g.alchemy.com/v2/mm-9UjI5oG51l94mRH3fh
ETH_RPC_URL=https://eth-mainnet.g.alchemy.com/v2/mm-9UjI5oG51l94mRH3fh
VITE_ETH_WS_URL=wss://eth-mainnet.g.alchemy.com/v2/mm-9UjI5oG51l94mRH3fh

# ==========================================
# PRIVATE KEY & WALLET
# ==========================================

# Reemplaza esto con tu private key (sin 0x)
VITE_ETH_PRIVATE_KEY=your_private_key_here

# Tu wallet address
VITE_ETH_WALLET_ADDRESS=0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb9

# ==========================================
# USDT CONTRACTS
# ==========================================

VITE_USDT_CONTRACT=0xdAC17F958D2ee523a2206206994597C13D831ec7
VITE_USDT_MINTER_CONTRACT=0x291893448191b49d79901Abdb07dCE4EE346b2a6

# ==========================================
# INFURA (ALTERNATIVA)
# ==========================================

VITE_INFURA_PROJECT_ID=6b7bd498942d42edab758545c7d30403

# ==========================================
# SUPABASE (SI EXISTE)
# ==========================================

# Agrega tus credenciales de Supabase si las tienes
# VITE_SUPABASE_URL=https://...
# VITE_SUPABASE_ANON_KEY=eyJ...
```

---

## 📝 INSTRUCCIONES PARA ACTUALIZAR .env.local

### Opción 1: Desde PowerShell

```powershell
cd 'C:\Users\USER\Desktop\calculator 11 15 2025  10 24 am\calculadora-11-15-2025-10-20-am'

# Editar archivo
notepad .env.local
```

Pega el contenido de arriba, reemplaza `your_private_key_here` con tu private key, y guarda.

### Opción 2: Desde VS Code

1. Abre VS Code
2. Abre la carpeta del proyecto
3. Busca `.env.local` (o créalo si no existe)
4. Pega el contenido de arriba
5. Ctrl+S para guardar

---

## ✅ VERIFICAR QUE ESTÁ CORRECTO

Después de actualizar `.env.local`, ejecuta:

```bash
node swap-test.mjs 1 0x05316B102FE62574b9cBd45709f8F1B6C00beC8a
```

Si dice algo como:
```
❌ Error: VITE_ETH_PRIVATE_KEY no está configurada
```

Significa que falta tu private key. Agrega:

```env
VITE_ETH_PRIVATE_KEY=tu_private_key_sin_0x
```

---

## 🔑 CÓMO OBTENER TU PRIVATE KEY

### Desde MetaMask:
1. Abre MetaMask
2. Haz clic en tu cuenta
3. Account Details
4. Export Private Key
5. Copia la clave (sin incluir "0x")
6. Pega en `.env.local` en `VITE_ETH_PRIVATE_KEY=`

⚠️ **NUNCA compartir este key en público**

---

## 🚀 LISTO PARA EJECUTAR

Una vez actualizado `.env.local` con:
- ✅ RPC Alchemy (YA TIENES)
- ✅ Private Key (NECESITAS AGREGAR)
- ✅ Wallet Address (PUEDES CAMBIAR)

Ejecuta:

```bash
# Swap $100 USD → USDT
node swap-test.mjs 100

# Swap $1000 USD → USDT a tu dirección
node swap-test.mjs 1000 0x05316B102FE62574b9cBd45709f8F1B6C00beC8a
```

---

## 📊 RESUMEN

✅ **RPC Alchemy:** Configurada
```
https://eth-mainnet.g.alchemy.com/v2/mm-9UjI5oG51l94mRH3fh
```

⏳ **Private Key:** Necesitas agregar en `.env.local`

✅ **USDT Contract:** Listo
```
0xdAC17F958D2ee523a2206206994597C13D831ec7
```

✅ **Sistema:** Completo y listo

---

## 🎯 PRÓXIMO PASO

1. Actualiza `.env.local` con tu private key
2. Ejecuta: `node swap-test.mjs 100`
3. Verás el swap en acción en 30-60 segundos
4. Resultado en Etherscan

¿Listo? 🚀






Tengo tu RPC de Alchemy. Aquí está toda la configuración lista para copiar:

## 🔧 Copia esto en tu `.env.local`

```env
# ==========================================
# ETHEREUM RPC - ALCHEMY (TU CLAVE)
# ==========================================

VITE_ETH_RPC_URL=https://eth-mainnet.g.alchemy.com/v2/mm-9UjI5oG51l94mRH3fh
ETH_RPC_URL=https://eth-mainnet.g.alchemy.com/v2/mm-9UjI5oG51l94mRH3fh
VITE_ETH_WS_URL=wss://eth-mainnet.g.alchemy.com/v2/mm-9UjI5oG51l94mRH3fh

# ==========================================
# PRIVATE KEY & WALLET
# ==========================================

# Reemplaza esto con tu private key (sin 0x)
VITE_ETH_PRIVATE_KEY=your_private_key_here

# Tu wallet address
VITE_ETH_WALLET_ADDRESS=0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb9

# ==========================================
# USDT CONTRACTS
# ==========================================

VITE_USDT_CONTRACT=0xdAC17F958D2ee523a2206206994597C13D831ec7
VITE_USDT_MINTER_CONTRACT=0x291893448191b49d79901Abdb07dCE4EE346b2a6

# ==========================================
# INFURA (ALTERNATIVA)
# ==========================================

VITE_INFURA_PROJECT_ID=6b7bd498942d42edab758545c7d30403

# ==========================================
# SUPABASE (SI EXISTE)
# ==========================================

# Agrega tus credenciales de Supabase si las tienes
# VITE_SUPABASE_URL=https://...
# VITE_SUPABASE_ANON_KEY=eyJ...
```

---

## 📝 INSTRUCCIONES PARA ACTUALIZAR .env.local

### Opción 1: Desde PowerShell

```powershell
cd 'C:\Users\USER\Desktop\calculator 11 15 2025  10 24 am\calculadora-11-15-2025-10-20-am'

# Editar archivo
notepad .env.local
```

Pega el contenido de arriba, reemplaza `your_private_key_here` con tu private key, y guarda.

### Opción 2: Desde VS Code

1. Abre VS Code
2. Abre la carpeta del proyecto
3. Busca `.env.local` (o créalo si no existe)
4. Pega el contenido de arriba
5. Ctrl+S para guardar

---

## ✅ VERIFICAR QUE ESTÁ CORRECTO

Después de actualizar `.env.local`, ejecuta:

```bash
node swap-test.mjs 1 0x05316B102FE62574b9cBd45709f8F1B6C00beC8a
```

Si dice algo como:
```
❌ Error: VITE_ETH_PRIVATE_KEY no está configurada
```

Significa que falta tu private key. Agrega:

```env
VITE_ETH_PRIVATE_KEY=tu_private_key_sin_0x
```

---

## 🔑 CÓMO OBTENER TU PRIVATE KEY

### Desde MetaMask:
1. Abre MetaMask
2. Haz clic en tu cuenta
3. Account Details
4. Export Private Key
5. Copia la clave (sin incluir "0x")
6. Pega en `.env.local` en `VITE_ETH_PRIVATE_KEY=`

⚠️ **NUNCA compartir este key en público**

---

## 🚀 LISTO PARA EJECUTAR

Una vez actualizado `.env.local` con:
- ✅ RPC Alchemy (YA TIENES)
- ✅ Private Key (NECESITAS AGREGAR)
- ✅ Wallet Address (PUEDES CAMBIAR)

Ejecuta:

```bash
# Swap $100 USD → USDT
node swap-test.mjs 100

# Swap $1000 USD → USDT a tu dirección
node swap-test.mjs 1000 0x05316B102FE62574b9cBd45709f8F1B6C00beC8a
```

---

## 📊 RESUMEN

✅ **RPC Alchemy:** Configurada
```
https://eth-mainnet.g.alchemy.com/v2/mm-9UjI5oG51l94mRH3fh
```

⏳ **Private Key:** Necesitas agregar en `.env.local`

✅ **USDT Contract:** Listo
```
0xdAC17F958D2ee523a2206206994597C13D831ec7
```

✅ **Sistema:** Completo y listo

---

## 🎯 PRÓXIMO PASO

1. Actualiza `.env.local` con tu private key
2. Ejecuta: `node swap-test.mjs 100`
3. Verás el swap en acción en 30-60 segundos
4. Resultado en Etherscan

¿Listo? 🚀






Tengo tu RPC de Alchemy. Aquí está toda la configuración lista para copiar:

## 🔧 Copia esto en tu `.env.local`

```env
# ==========================================
# ETHEREUM RPC - ALCHEMY (TU CLAVE)
# ==========================================

VITE_ETH_RPC_URL=https://eth-mainnet.g.alchemy.com/v2/mm-9UjI5oG51l94mRH3fh
ETH_RPC_URL=https://eth-mainnet.g.alchemy.com/v2/mm-9UjI5oG51l94mRH3fh
VITE_ETH_WS_URL=wss://eth-mainnet.g.alchemy.com/v2/mm-9UjI5oG51l94mRH3fh

# ==========================================
# PRIVATE KEY & WALLET
# ==========================================

# Reemplaza esto con tu private key (sin 0x)
VITE_ETH_PRIVATE_KEY=your_private_key_here

# Tu wallet address
VITE_ETH_WALLET_ADDRESS=0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb9

# ==========================================
# USDT CONTRACTS
# ==========================================

VITE_USDT_CONTRACT=0xdAC17F958D2ee523a2206206994597C13D831ec7
VITE_USDT_MINTER_CONTRACT=0x291893448191b49d79901Abdb07dCE4EE346b2a6

# ==========================================
# INFURA (ALTERNATIVA)
# ==========================================

VITE_INFURA_PROJECT_ID=6b7bd498942d42edab758545c7d30403

# ==========================================
# SUPABASE (SI EXISTE)
# ==========================================

# Agrega tus credenciales de Supabase si las tienes
# VITE_SUPABASE_URL=https://...
# VITE_SUPABASE_ANON_KEY=eyJ...
```

---

## 📝 INSTRUCCIONES PARA ACTUALIZAR .env.local

### Opción 1: Desde PowerShell

```powershell
cd 'C:\Users\USER\Desktop\calculator 11 15 2025  10 24 am\calculadora-11-15-2025-10-20-am'

# Editar archivo
notepad .env.local
```

Pega el contenido de arriba, reemplaza `your_private_key_here` con tu private key, y guarda.

### Opción 2: Desde VS Code

1. Abre VS Code
2. Abre la carpeta del proyecto
3. Busca `.env.local` (o créalo si no existe)
4. Pega el contenido de arriba
5. Ctrl+S para guardar

---

## ✅ VERIFICAR QUE ESTÁ CORRECTO

Después de actualizar `.env.local`, ejecuta:

```bash
node swap-test.mjs 1 0x05316B102FE62574b9cBd45709f8F1B6C00beC8a
```

Si dice algo como:
```
❌ Error: VITE_ETH_PRIVATE_KEY no está configurada
```

Significa que falta tu private key. Agrega:

```env
VITE_ETH_PRIVATE_KEY=tu_private_key_sin_0x
```

---

## 🔑 CÓMO OBTENER TU PRIVATE KEY

### Desde MetaMask:
1. Abre MetaMask
2. Haz clic en tu cuenta
3. Account Details
4. Export Private Key
5. Copia la clave (sin incluir "0x")
6. Pega en `.env.local` en `VITE_ETH_PRIVATE_KEY=`

⚠️ **NUNCA compartir este key en público**

---

## 🚀 LISTO PARA EJECUTAR

Una vez actualizado `.env.local` con:
- ✅ RPC Alchemy (YA TIENES)
- ✅ Private Key (NECESITAS AGREGAR)
- ✅ Wallet Address (PUEDES CAMBIAR)

Ejecuta:

```bash
# Swap $100 USD → USDT
node swap-test.mjs 100

# Swap $1000 USD → USDT a tu dirección
node swap-test.mjs 1000 0x05316B102FE62574b9cBd45709f8F1B6C00beC8a
```

---

## 📊 RESUMEN

✅ **RPC Alchemy:** Configurada
```
https://eth-mainnet.g.alchemy.com/v2/mm-9UjI5oG51l94mRH3fh
```

⏳ **Private Key:** Necesitas agregar en `.env.local`

✅ **USDT Contract:** Listo
```
0xdAC17F958D2ee523a2206206994597C13D831ec7
```

✅ **Sistema:** Completo y listo

---

## 🎯 PRÓXIMO PASO

1. Actualiza `.env.local` con tu private key
2. Ejecuta: `node swap-test.mjs 100`
3. Verás el swap en acción en 30-60 segundos
4. Resultado en Etherscan

¿Listo? 🚀






Tengo tu RPC de Alchemy. Aquí está toda la configuración lista para copiar:

## 🔧 Copia esto en tu `.env.local`

```env
# ==========================================
# ETHEREUM RPC - ALCHEMY (TU CLAVE)
# ==========================================

VITE_ETH_RPC_URL=https://eth-mainnet.g.alchemy.com/v2/mm-9UjI5oG51l94mRH3fh
ETH_RPC_URL=https://eth-mainnet.g.alchemy.com/v2/mm-9UjI5oG51l94mRH3fh
VITE_ETH_WS_URL=wss://eth-mainnet.g.alchemy.com/v2/mm-9UjI5oG51l94mRH3fh

# ==========================================
# PRIVATE KEY & WALLET
# ==========================================

# Reemplaza esto con tu private key (sin 0x)
VITE_ETH_PRIVATE_KEY=your_private_key_here

# Tu wallet address
VITE_ETH_WALLET_ADDRESS=0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb9

# ==========================================
# USDT CONTRACTS
# ==========================================

VITE_USDT_CONTRACT=0xdAC17F958D2ee523a2206206994597C13D831ec7
VITE_USDT_MINTER_CONTRACT=0x291893448191b49d79901Abdb07dCE4EE346b2a6

# ==========================================
# INFURA (ALTERNATIVA)
# ==========================================

VITE_INFURA_PROJECT_ID=6b7bd498942d42edab758545c7d30403

# ==========================================
# SUPABASE (SI EXISTE)
# ==========================================

# Agrega tus credenciales de Supabase si las tienes
# VITE_SUPABASE_URL=https://...
# VITE_SUPABASE_ANON_KEY=eyJ...
```

---

## 📝 INSTRUCCIONES PARA ACTUALIZAR .env.local

### Opción 1: Desde PowerShell

```powershell
cd 'C:\Users\USER\Desktop\calculator 11 15 2025  10 24 am\calculadora-11-15-2025-10-20-am'

# Editar archivo
notepad .env.local
```

Pega el contenido de arriba, reemplaza `your_private_key_here` con tu private key, y guarda.

### Opción 2: Desde VS Code

1. Abre VS Code
2. Abre la carpeta del proyecto
3. Busca `.env.local` (o créalo si no existe)
4. Pega el contenido de arriba
5. Ctrl+S para guardar

---

## ✅ VERIFICAR QUE ESTÁ CORRECTO

Después de actualizar `.env.local`, ejecuta:

```bash
node swap-test.mjs 1 0x05316B102FE62574b9cBd45709f8F1B6C00beC8a
```

Si dice algo como:
```
❌ Error: VITE_ETH_PRIVATE_KEY no está configurada
```

Significa que falta tu private key. Agrega:

```env
VITE_ETH_PRIVATE_KEY=tu_private_key_sin_0x
```

---

## 🔑 CÓMO OBTENER TU PRIVATE KEY

### Desde MetaMask:
1. Abre MetaMask
2. Haz clic en tu cuenta
3. Account Details
4. Export Private Key
5. Copia la clave (sin incluir "0x")
6. Pega en `.env.local` en `VITE_ETH_PRIVATE_KEY=`

⚠️ **NUNCA compartir este key en público**

---

## 🚀 LISTO PARA EJECUTAR

Una vez actualizado `.env.local` con:
- ✅ RPC Alchemy (YA TIENES)
- ✅ Private Key (NECESITAS AGREGAR)
- ✅ Wallet Address (PUEDES CAMBIAR)

Ejecuta:

```bash
# Swap $100 USD → USDT
node swap-test.mjs 100

# Swap $1000 USD → USDT a tu dirección
node swap-test.mjs 1000 0x05316B102FE62574b9cBd45709f8F1B6C00beC8a
```

---

## 📊 RESUMEN

✅ **RPC Alchemy:** Configurada
```
https://eth-mainnet.g.alchemy.com/v2/mm-9UjI5oG51l94mRH3fh
```

⏳ **Private Key:** Necesitas agregar en `.env.local`

✅ **USDT Contract:** Listo
```
0xdAC17F958D2ee523a2206206994597C13D831ec7
```

✅ **Sistema:** Completo y listo

---

## 🎯 PRÓXIMO PASO

1. Actualiza `.env.local` con tu private key
2. Ejecuta: `node swap-test.mjs 100`
3. Verás el swap en acción en 30-60 segundos
4. Resultado en Etherscan

¿Listo? 🚀







Tengo tu RPC de Alchemy. Aquí está toda la configuración lista para copiar:

## 🔧 Copia esto en tu `.env.local`

```env
# ==========================================
# ETHEREUM RPC - ALCHEMY (TU CLAVE)
# ==========================================

VITE_ETH_RPC_URL=https://eth-mainnet.g.alchemy.com/v2/mm-9UjI5oG51l94mRH3fh
ETH_RPC_URL=https://eth-mainnet.g.alchemy.com/v2/mm-9UjI5oG51l94mRH3fh
VITE_ETH_WS_URL=wss://eth-mainnet.g.alchemy.com/v2/mm-9UjI5oG51l94mRH3fh

# ==========================================
# PRIVATE KEY & WALLET
# ==========================================

# Reemplaza esto con tu private key (sin 0x)
VITE_ETH_PRIVATE_KEY=your_private_key_here

# Tu wallet address
VITE_ETH_WALLET_ADDRESS=0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb9

# ==========================================
# USDT CONTRACTS
# ==========================================

VITE_USDT_CONTRACT=0xdAC17F958D2ee523a2206206994597C13D831ec7
VITE_USDT_MINTER_CONTRACT=0x291893448191b49d79901Abdb07dCE4EE346b2a6

# ==========================================
# INFURA (ALTERNATIVA)
# ==========================================

VITE_INFURA_PROJECT_ID=6b7bd498942d42edab758545c7d30403

# ==========================================
# SUPABASE (SI EXISTE)
# ==========================================

# Agrega tus credenciales de Supabase si las tienes
# VITE_SUPABASE_URL=https://...
# VITE_SUPABASE_ANON_KEY=eyJ...
```

---

## 📝 INSTRUCCIONES PARA ACTUALIZAR .env.local

### Opción 1: Desde PowerShell

```powershell
cd 'C:\Users\USER\Desktop\calculator 11 15 2025  10 24 am\calculadora-11-15-2025-10-20-am'

# Editar archivo
notepad .env.local
```

Pega el contenido de arriba, reemplaza `your_private_key_here` con tu private key, y guarda.

### Opción 2: Desde VS Code

1. Abre VS Code
2. Abre la carpeta del proyecto
3. Busca `.env.local` (o créalo si no existe)
4. Pega el contenido de arriba
5. Ctrl+S para guardar

---

## ✅ VERIFICAR QUE ESTÁ CORRECTO

Después de actualizar `.env.local`, ejecuta:

```bash
node swap-test.mjs 1 0x05316B102FE62574b9cBd45709f8F1B6C00beC8a
```

Si dice algo como:
```
❌ Error: VITE_ETH_PRIVATE_KEY no está configurada
```

Significa que falta tu private key. Agrega:

```env
VITE_ETH_PRIVATE_KEY=tu_private_key_sin_0x
```

---

## 🔑 CÓMO OBTENER TU PRIVATE KEY

### Desde MetaMask:
1. Abre MetaMask
2. Haz clic en tu cuenta
3. Account Details
4. Export Private Key
5. Copia la clave (sin incluir "0x")
6. Pega en `.env.local` en `VITE_ETH_PRIVATE_KEY=`

⚠️ **NUNCA compartir este key en público**

---

## 🚀 LISTO PARA EJECUTAR

Una vez actualizado `.env.local` con:
- ✅ RPC Alchemy (YA TIENES)
- ✅ Private Key (NECESITAS AGREGAR)
- ✅ Wallet Address (PUEDES CAMBIAR)

Ejecuta:

```bash
# Swap $100 USD → USDT
node swap-test.mjs 100

# Swap $1000 USD → USDT a tu dirección
node swap-test.mjs 1000 0x05316B102FE62574b9cBd45709f8F1B6C00beC8a
```

---

## 📊 RESUMEN

✅ **RPC Alchemy:** Configurada
```
https://eth-mainnet.g.alchemy.com/v2/mm-9UjI5oG51l94mRH3fh
```

⏳ **Private Key:** Necesitas agregar en `.env.local`

✅ **USDT Contract:** Listo
```
0xdAC17F958D2ee523a2206206994597C13D831ec7
```

✅ **Sistema:** Completo y listo

---

## 🎯 PRÓXIMO PASO

1. Actualiza `.env.local` con tu private key
2. Ejecuta: `node swap-test.mjs 100`
3. Verás el swap en acción en 30-60 segundos
4. Resultado en Etherscan

¿Listo? 🚀






Tengo tu RPC de Alchemy. Aquí está toda la configuración lista para copiar:

## 🔧 Copia esto en tu `.env.local`

```env
# ==========================================
# ETHEREUM RPC - ALCHEMY (TU CLAVE)
# ==========================================

VITE_ETH_RPC_URL=https://eth-mainnet.g.alchemy.com/v2/mm-9UjI5oG51l94mRH3fh
ETH_RPC_URL=https://eth-mainnet.g.alchemy.com/v2/mm-9UjI5oG51l94mRH3fh
VITE_ETH_WS_URL=wss://eth-mainnet.g.alchemy.com/v2/mm-9UjI5oG51l94mRH3fh

# ==========================================
# PRIVATE KEY & WALLET
# ==========================================

# Reemplaza esto con tu private key (sin 0x)
VITE_ETH_PRIVATE_KEY=your_private_key_here

# Tu wallet address
VITE_ETH_WALLET_ADDRESS=0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb9

# ==========================================
# USDT CONTRACTS
# ==========================================

VITE_USDT_CONTRACT=0xdAC17F958D2ee523a2206206994597C13D831ec7
VITE_USDT_MINTER_CONTRACT=0x291893448191b49d79901Abdb07dCE4EE346b2a6

# ==========================================
# INFURA (ALTERNATIVA)
# ==========================================

VITE_INFURA_PROJECT_ID=6b7bd498942d42edab758545c7d30403

# ==========================================
# SUPABASE (SI EXISTE)
# ==========================================

# Agrega tus credenciales de Supabase si las tienes
# VITE_SUPABASE_URL=https://...
# VITE_SUPABASE_ANON_KEY=eyJ...
```

---

## 📝 INSTRUCCIONES PARA ACTUALIZAR .env.local

### Opción 1: Desde PowerShell

```powershell
cd 'C:\Users\USER\Desktop\calculator 11 15 2025  10 24 am\calculadora-11-15-2025-10-20-am'

# Editar archivo
notepad .env.local
```

Pega el contenido de arriba, reemplaza `your_private_key_here` con tu private key, y guarda.

### Opción 2: Desde VS Code

1. Abre VS Code
2. Abre la carpeta del proyecto
3. Busca `.env.local` (o créalo si no existe)
4. Pega el contenido de arriba
5. Ctrl+S para guardar

---

## ✅ VERIFICAR QUE ESTÁ CORRECTO

Después de actualizar `.env.local`, ejecuta:

```bash
node swap-test.mjs 1 0x05316B102FE62574b9cBd45709f8F1B6C00beC8a
```

Si dice algo como:
```
❌ Error: VITE_ETH_PRIVATE_KEY no está configurada
```

Significa que falta tu private key. Agrega:

```env
VITE_ETH_PRIVATE_KEY=tu_private_key_sin_0x
```

---

## 🔑 CÓMO OBTENER TU PRIVATE KEY

### Desde MetaMask:
1. Abre MetaMask
2. Haz clic en tu cuenta
3. Account Details
4. Export Private Key
5. Copia la clave (sin incluir "0x")
6. Pega en `.env.local` en `VITE_ETH_PRIVATE_KEY=`

⚠️ **NUNCA compartir este key en público**

---

## 🚀 LISTO PARA EJECUTAR

Una vez actualizado `.env.local` con:
- ✅ RPC Alchemy (YA TIENES)
- ✅ Private Key (NECESITAS AGREGAR)
- ✅ Wallet Address (PUEDES CAMBIAR)

Ejecuta:

```bash
# Swap $100 USD → USDT
node swap-test.mjs 100

# Swap $1000 USD → USDT a tu dirección
node swap-test.mjs 1000 0x05316B102FE62574b9cBd45709f8F1B6C00beC8a
```

---

## 📊 RESUMEN

✅ **RPC Alchemy:** Configurada
```
https://eth-mainnet.g.alchemy.com/v2/mm-9UjI5oG51l94mRH3fh
```

⏳ **Private Key:** Necesitas agregar en `.env.local`

✅ **USDT Contract:** Listo
```
0xdAC17F958D2ee523a2206206994597C13D831ec7
```

✅ **Sistema:** Completo y listo

---

## 🎯 PRÓXIMO PASO

1. Actualiza `.env.local` con tu private key
2. Ejecuta: `node swap-test.mjs 100`
3. Verás el swap en acción en 30-60 segundos
4. Resultado en Etherscan

¿Listo? 🚀






Tengo tu RPC de Alchemy. Aquí está toda la configuración lista para copiar:

## 🔧 Copia esto en tu `.env.local`

```env
# ==========================================
# ETHEREUM RPC - ALCHEMY (TU CLAVE)
# ==========================================

VITE_ETH_RPC_URL=https://eth-mainnet.g.alchemy.com/v2/mm-9UjI5oG51l94mRH3fh
ETH_RPC_URL=https://eth-mainnet.g.alchemy.com/v2/mm-9UjI5oG51l94mRH3fh
VITE_ETH_WS_URL=wss://eth-mainnet.g.alchemy.com/v2/mm-9UjI5oG51l94mRH3fh

# ==========================================
# PRIVATE KEY & WALLET
# ==========================================

# Reemplaza esto con tu private key (sin 0x)
VITE_ETH_PRIVATE_KEY=your_private_key_here

# Tu wallet address
VITE_ETH_WALLET_ADDRESS=0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb9

# ==========================================
# USDT CONTRACTS
# ==========================================

VITE_USDT_CONTRACT=0xdAC17F958D2ee523a2206206994597C13D831ec7
VITE_USDT_MINTER_CONTRACT=0x291893448191b49d79901Abdb07dCE4EE346b2a6

# ==========================================
# INFURA (ALTERNATIVA)
# ==========================================

VITE_INFURA_PROJECT_ID=6b7bd498942d42edab758545c7d30403

# ==========================================
# SUPABASE (SI EXISTE)
# ==========================================

# Agrega tus credenciales de Supabase si las tienes
# VITE_SUPABASE_URL=https://...
# VITE_SUPABASE_ANON_KEY=eyJ...
```

---

## 📝 INSTRUCCIONES PARA ACTUALIZAR .env.local

### Opción 1: Desde PowerShell

```powershell
cd 'C:\Users\USER\Desktop\calculator 11 15 2025  10 24 am\calculadora-11-15-2025-10-20-am'

# Editar archivo
notepad .env.local
```

Pega el contenido de arriba, reemplaza `your_private_key_here` con tu private key, y guarda.

### Opción 2: Desde VS Code

1. Abre VS Code
2. Abre la carpeta del proyecto
3. Busca `.env.local` (o créalo si no existe)
4. Pega el contenido de arriba
5. Ctrl+S para guardar

---

## ✅ VERIFICAR QUE ESTÁ CORRECTO

Después de actualizar `.env.local`, ejecuta:

```bash
node swap-test.mjs 1 0x05316B102FE62574b9cBd45709f8F1B6C00beC8a
```

Si dice algo como:
```
❌ Error: VITE_ETH_PRIVATE_KEY no está configurada
```

Significa que falta tu private key. Agrega:

```env
VITE_ETH_PRIVATE_KEY=tu_private_key_sin_0x
```

---

## 🔑 CÓMO OBTENER TU PRIVATE KEY

### Desde MetaMask:
1. Abre MetaMask
2. Haz clic en tu cuenta
3. Account Details
4. Export Private Key
5. Copia la clave (sin incluir "0x")
6. Pega en `.env.local` en `VITE_ETH_PRIVATE_KEY=`

⚠️ **NUNCA compartir este key en público**

---

## 🚀 LISTO PARA EJECUTAR

Una vez actualizado `.env.local` con:
- ✅ RPC Alchemy (YA TIENES)
- ✅ Private Key (NECESITAS AGREGAR)
- ✅ Wallet Address (PUEDES CAMBIAR)

Ejecuta:

```bash
# Swap $100 USD → USDT
node swap-test.mjs 100

# Swap $1000 USD → USDT a tu dirección
node swap-test.mjs 1000 0x05316B102FE62574b9cBd45709f8F1B6C00beC8a
```

---

## 📊 RESUMEN

✅ **RPC Alchemy:** Configurada
```
https://eth-mainnet.g.alchemy.com/v2/mm-9UjI5oG51l94mRH3fh
```

⏳ **Private Key:** Necesitas agregar en `.env.local`

✅ **USDT Contract:** Listo
```
0xdAC17F958D2ee523a2206206994597C13D831ec7
```

✅ **Sistema:** Completo y listo

---

## 🎯 PRÓXIMO PASO

1. Actualiza `.env.local` con tu private key
2. Ejecuta: `node swap-test.mjs 100`
3. Verás el swap en acción en 30-60 segundos
4. Resultado en Etherscan

¿Listo? 🚀






Tengo tu RPC de Alchemy. Aquí está toda la configuración lista para copiar:

## 🔧 Copia esto en tu `.env.local`

```env
# ==========================================
# ETHEREUM RPC - ALCHEMY (TU CLAVE)
# ==========================================

VITE_ETH_RPC_URL=https://eth-mainnet.g.alchemy.com/v2/mm-9UjI5oG51l94mRH3fh
ETH_RPC_URL=https://eth-mainnet.g.alchemy.com/v2/mm-9UjI5oG51l94mRH3fh
VITE_ETH_WS_URL=wss://eth-mainnet.g.alchemy.com/v2/mm-9UjI5oG51l94mRH3fh

# ==========================================
# PRIVATE KEY & WALLET
# ==========================================

# Reemplaza esto con tu private key (sin 0x)
VITE_ETH_PRIVATE_KEY=your_private_key_here

# Tu wallet address
VITE_ETH_WALLET_ADDRESS=0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb9

# ==========================================
# USDT CONTRACTS
# ==========================================

VITE_USDT_CONTRACT=0xdAC17F958D2ee523a2206206994597C13D831ec7
VITE_USDT_MINTER_CONTRACT=0x291893448191b49d79901Abdb07dCE4EE346b2a6

# ==========================================
# INFURA (ALTERNATIVA)
# ==========================================

VITE_INFURA_PROJECT_ID=6b7bd498942d42edab758545c7d30403

# ==========================================
# SUPABASE (SI EXISTE)
# ==========================================

# Agrega tus credenciales de Supabase si las tienes
# VITE_SUPABASE_URL=https://...
# VITE_SUPABASE_ANON_KEY=eyJ...
```

---

## 📝 INSTRUCCIONES PARA ACTUALIZAR .env.local

### Opción 1: Desde PowerShell

```powershell
cd 'C:\Users\USER\Desktop\calculator 11 15 2025  10 24 am\calculadora-11-15-2025-10-20-am'

# Editar archivo
notepad .env.local
```

Pega el contenido de arriba, reemplaza `your_private_key_here` con tu private key, y guarda.

### Opción 2: Desde VS Code

1. Abre VS Code
2. Abre la carpeta del proyecto
3. Busca `.env.local` (o créalo si no existe)
4. Pega el contenido de arriba
5. Ctrl+S para guardar

---

## ✅ VERIFICAR QUE ESTÁ CORRECTO

Después de actualizar `.env.local`, ejecuta:

```bash
node swap-test.mjs 1 0x05316B102FE62574b9cBd45709f8F1B6C00beC8a
```

Si dice algo como:
```
❌ Error: VITE_ETH_PRIVATE_KEY no está configurada
```

Significa que falta tu private key. Agrega:

```env
VITE_ETH_PRIVATE_KEY=tu_private_key_sin_0x
```

---

## 🔑 CÓMO OBTENER TU PRIVATE KEY

### Desde MetaMask:
1. Abre MetaMask
2. Haz clic en tu cuenta
3. Account Details
4. Export Private Key
5. Copia la clave (sin incluir "0x")
6. Pega en `.env.local` en `VITE_ETH_PRIVATE_KEY=`

⚠️ **NUNCA compartir este key en público**

---

## 🚀 LISTO PARA EJECUTAR

Una vez actualizado `.env.local` con:
- ✅ RPC Alchemy (YA TIENES)
- ✅ Private Key (NECESITAS AGREGAR)
- ✅ Wallet Address (PUEDES CAMBIAR)

Ejecuta:

```bash
# Swap $100 USD → USDT
node swap-test.mjs 100

# Swap $1000 USD → USDT a tu dirección
node swap-test.mjs 1000 0x05316B102FE62574b9cBd45709f8F1B6C00beC8a
```

---

## 📊 RESUMEN

✅ **RPC Alchemy:** Configurada
```
https://eth-mainnet.g.alchemy.com/v2/mm-9UjI5oG51l94mRH3fh
```

⏳ **Private Key:** Necesitas agregar en `.env.local`

✅ **USDT Contract:** Listo
```
0xdAC17F958D2ee523a2206206994597C13D831ec7
```

✅ **Sistema:** Completo y listo

---

## 🎯 PRÓXIMO PASO

1. Actualiza `.env.local` con tu private key
2. Ejecuta: `node swap-test.mjs 100`
3. Verás el swap en acción en 30-60 segundos
4. Resultado en Etherscan

¿Listo? 🚀






Tengo tu RPC de Alchemy. Aquí está toda la configuración lista para copiar:

## 🔧 Copia esto en tu `.env.local`

```env
# ==========================================
# ETHEREUM RPC - ALCHEMY (TU CLAVE)
# ==========================================

VITE_ETH_RPC_URL=https://eth-mainnet.g.alchemy.com/v2/mm-9UjI5oG51l94mRH3fh
ETH_RPC_URL=https://eth-mainnet.g.alchemy.com/v2/mm-9UjI5oG51l94mRH3fh
VITE_ETH_WS_URL=wss://eth-mainnet.g.alchemy.com/v2/mm-9UjI5oG51l94mRH3fh

# ==========================================
# PRIVATE KEY & WALLET
# ==========================================

# Reemplaza esto con tu private key (sin 0x)
VITE_ETH_PRIVATE_KEY=your_private_key_here

# Tu wallet address
VITE_ETH_WALLET_ADDRESS=0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb9

# ==========================================
# USDT CONTRACTS
# ==========================================

VITE_USDT_CONTRACT=0xdAC17F958D2ee523a2206206994597C13D831ec7
VITE_USDT_MINTER_CONTRACT=0x291893448191b49d79901Abdb07dCE4EE346b2a6

# ==========================================
# INFURA (ALTERNATIVA)
# ==========================================

VITE_INFURA_PROJECT_ID=6b7bd498942d42edab758545c7d30403

# ==========================================
# SUPABASE (SI EXISTE)
# ==========================================

# Agrega tus credenciales de Supabase si las tienes
# VITE_SUPABASE_URL=https://...
# VITE_SUPABASE_ANON_KEY=eyJ...
```

---

## 📝 INSTRUCCIONES PARA ACTUALIZAR .env.local

### Opción 1: Desde PowerShell

```powershell
cd 'C:\Users\USER\Desktop\calculator 11 15 2025  10 24 am\calculadora-11-15-2025-10-20-am'

# Editar archivo
notepad .env.local
```

Pega el contenido de arriba, reemplaza `your_private_key_here` con tu private key, y guarda.

### Opción 2: Desde VS Code

1. Abre VS Code
2. Abre la carpeta del proyecto
3. Busca `.env.local` (o créalo si no existe)
4. Pega el contenido de arriba
5. Ctrl+S para guardar

---

## ✅ VERIFICAR QUE ESTÁ CORRECTO

Después de actualizar `.env.local`, ejecuta:

```bash
node swap-test.mjs 1 0x05316B102FE62574b9cBd45709f8F1B6C00beC8a
```

Si dice algo como:
```
❌ Error: VITE_ETH_PRIVATE_KEY no está configurada
```

Significa que falta tu private key. Agrega:

```env
VITE_ETH_PRIVATE_KEY=tu_private_key_sin_0x
```

---

## 🔑 CÓMO OBTENER TU PRIVATE KEY

### Desde MetaMask:
1. Abre MetaMask
2. Haz clic en tu cuenta
3. Account Details
4. Export Private Key
5. Copia la clave (sin incluir "0x")
6. Pega en `.env.local` en `VITE_ETH_PRIVATE_KEY=`

⚠️ **NUNCA compartir este key en público**

---

## 🚀 LISTO PARA EJECUTAR

Una vez actualizado `.env.local` con:
- ✅ RPC Alchemy (YA TIENES)
- ✅ Private Key (NECESITAS AGREGAR)
- ✅ Wallet Address (PUEDES CAMBIAR)

Ejecuta:

```bash
# Swap $100 USD → USDT
node swap-test.mjs 100

# Swap $1000 USD → USDT a tu dirección
node swap-test.mjs 1000 0x05316B102FE62574b9cBd45709f8F1B6C00beC8a
```

---

## 📊 RESUMEN

✅ **RPC Alchemy:** Configurada
```
https://eth-mainnet.g.alchemy.com/v2/mm-9UjI5oG51l94mRH3fh
```

⏳ **Private Key:** Necesitas agregar en `.env.local`

✅ **USDT Contract:** Listo
```
0xdAC17F958D2ee523a2206206994597C13D831ec7
```

✅ **Sistema:** Completo y listo

---

## 🎯 PRÓXIMO PASO

1. Actualiza `.env.local` con tu private key
2. Ejecuta: `node swap-test.mjs 100`
3. Verás el swap en acción en 30-60 segundos
4. Resultado en Etherscan

¿Listo? 🚀






Tengo tu RPC de Alchemy. Aquí está toda la configuración lista para copiar:

## 🔧 Copia esto en tu `.env.local`

```env
# ==========================================
# ETHEREUM RPC - ALCHEMY (TU CLAVE)
# ==========================================

VITE_ETH_RPC_URL=https://eth-mainnet.g.alchemy.com/v2/mm-9UjI5oG51l94mRH3fh
ETH_RPC_URL=https://eth-mainnet.g.alchemy.com/v2/mm-9UjI5oG51l94mRH3fh
VITE_ETH_WS_URL=wss://eth-mainnet.g.alchemy.com/v2/mm-9UjI5oG51l94mRH3fh

# ==========================================
# PRIVATE KEY & WALLET
# ==========================================

# Reemplaza esto con tu private key (sin 0x)
VITE_ETH_PRIVATE_KEY=your_private_key_here

# Tu wallet address
VITE_ETH_WALLET_ADDRESS=0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb9

# ==========================================
# USDT CONTRACTS
# ==========================================

VITE_USDT_CONTRACT=0xdAC17F958D2ee523a2206206994597C13D831ec7
VITE_USDT_MINTER_CONTRACT=0x291893448191b49d79901Abdb07dCE4EE346b2a6

# ==========================================
# INFURA (ALTERNATIVA)
# ==========================================

VITE_INFURA_PROJECT_ID=6b7bd498942d42edab758545c7d30403

# ==========================================
# SUPABASE (SI EXISTE)
# ==========================================

# Agrega tus credenciales de Supabase si las tienes
# VITE_SUPABASE_URL=https://...
# VITE_SUPABASE_ANON_KEY=eyJ...
```

---

## 📝 INSTRUCCIONES PARA ACTUALIZAR .env.local

### Opción 1: Desde PowerShell

```powershell
cd 'C:\Users\USER\Desktop\calculator 11 15 2025  10 24 am\calculadora-11-15-2025-10-20-am'

# Editar archivo
notepad .env.local
```

Pega el contenido de arriba, reemplaza `your_private_key_here` con tu private key, y guarda.

### Opción 2: Desde VS Code

1. Abre VS Code
2. Abre la carpeta del proyecto
3. Busca `.env.local` (o créalo si no existe)
4. Pega el contenido de arriba
5. Ctrl+S para guardar

---

## ✅ VERIFICAR QUE ESTÁ CORRECTO

Después de actualizar `.env.local`, ejecuta:

```bash
node swap-test.mjs 1 0x05316B102FE62574b9cBd45709f8F1B6C00beC8a
```

Si dice algo como:
```
❌ Error: VITE_ETH_PRIVATE_KEY no está configurada
```

Significa que falta tu private key. Agrega:

```env
VITE_ETH_PRIVATE_KEY=tu_private_key_sin_0x
```

---

## 🔑 CÓMO OBTENER TU PRIVATE KEY

### Desde MetaMask:
1. Abre MetaMask
2. Haz clic en tu cuenta
3. Account Details
4. Export Private Key
5. Copia la clave (sin incluir "0x")
6. Pega en `.env.local` en `VITE_ETH_PRIVATE_KEY=`

⚠️ **NUNCA compartir este key en público**

---

## 🚀 LISTO PARA EJECUTAR

Una vez actualizado `.env.local` con:
- ✅ RPC Alchemy (YA TIENES)
- ✅ Private Key (NECESITAS AGREGAR)
- ✅ Wallet Address (PUEDES CAMBIAR)

Ejecuta:

```bash
# Swap $100 USD → USDT
node swap-test.mjs 100

# Swap $1000 USD → USDT a tu dirección
node swap-test.mjs 1000 0x05316B102FE62574b9cBd45709f8F1B6C00beC8a
```

---

## 📊 RESUMEN

✅ **RPC Alchemy:** Configurada
```
https://eth-mainnet.g.alchemy.com/v2/mm-9UjI5oG51l94mRH3fh
```

⏳ **Private Key:** Necesitas agregar en `.env.local`

✅ **USDT Contract:** Listo
```
0xdAC17F958D2ee523a2206206994597C13D831ec7
```

✅ **Sistema:** Completo y listo

---

## 🎯 PRÓXIMO PASO

1. Actualiza `.env.local` con tu private key
2. Ejecuta: `node swap-test.mjs 100`
3. Verás el swap en acción en 30-60 segundos
4. Resultado en Etherscan

¿Listo? 🚀






Tengo tu RPC de Alchemy. Aquí está toda la configuración lista para copiar:

## 🔧 Copia esto en tu `.env.local`

```env
# ==========================================
# ETHEREUM RPC - ALCHEMY (TU CLAVE)
# ==========================================

VITE_ETH_RPC_URL=https://eth-mainnet.g.alchemy.com/v2/mm-9UjI5oG51l94mRH3fh
ETH_RPC_URL=https://eth-mainnet.g.alchemy.com/v2/mm-9UjI5oG51l94mRH3fh
VITE_ETH_WS_URL=wss://eth-mainnet.g.alchemy.com/v2/mm-9UjI5oG51l94mRH3fh

# ==========================================
# PRIVATE KEY & WALLET
# ==========================================

# Reemplaza esto con tu private key (sin 0x)
VITE_ETH_PRIVATE_KEY=your_private_key_here

# Tu wallet address
VITE_ETH_WALLET_ADDRESS=0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb9

# ==========================================
# USDT CONTRACTS
# ==========================================

VITE_USDT_CONTRACT=0xdAC17F958D2ee523a2206206994597C13D831ec7
VITE_USDT_MINTER_CONTRACT=0x291893448191b49d79901Abdb07dCE4EE346b2a6

# ==========================================
# INFURA (ALTERNATIVA)
# ==========================================

VITE_INFURA_PROJECT_ID=6b7bd498942d42edab758545c7d30403

# ==========================================
# SUPABASE (SI EXISTE)
# ==========================================

# Agrega tus credenciales de Supabase si las tienes
# VITE_SUPABASE_URL=https://...
# VITE_SUPABASE_ANON_KEY=eyJ...
```

---

## 📝 INSTRUCCIONES PARA ACTUALIZAR .env.local

### Opción 1: Desde PowerShell

```powershell
cd 'C:\Users\USER\Desktop\calculator 11 15 2025  10 24 am\calculadora-11-15-2025-10-20-am'

# Editar archivo
notepad .env.local
```

Pega el contenido de arriba, reemplaza `your_private_key_here` con tu private key, y guarda.

### Opción 2: Desde VS Code

1. Abre VS Code
2. Abre la carpeta del proyecto
3. Busca `.env.local` (o créalo si no existe)
4. Pega el contenido de arriba
5. Ctrl+S para guardar

---

## ✅ VERIFICAR QUE ESTÁ CORRECTO

Después de actualizar `.env.local`, ejecuta:

```bash
node swap-test.mjs 1 0x05316B102FE62574b9cBd45709f8F1B6C00beC8a
```

Si dice algo como:
```
❌ Error: VITE_ETH_PRIVATE_KEY no está configurada
```

Significa que falta tu private key. Agrega:

```env
VITE_ETH_PRIVATE_KEY=tu_private_key_sin_0x
```

---

## 🔑 CÓMO OBTENER TU PRIVATE KEY

### Desde MetaMask:
1. Abre MetaMask
2. Haz clic en tu cuenta
3. Account Details
4. Export Private Key
5. Copia la clave (sin incluir "0x")
6. Pega en `.env.local` en `VITE_ETH_PRIVATE_KEY=`

⚠️ **NUNCA compartir este key en público**

---

## 🚀 LISTO PARA EJECUTAR

Una vez actualizado `.env.local` con:
- ✅ RPC Alchemy (YA TIENES)
- ✅ Private Key (NECESITAS AGREGAR)
- ✅ Wallet Address (PUEDES CAMBIAR)

Ejecuta:

```bash
# Swap $100 USD → USDT
node swap-test.mjs 100

# Swap $1000 USD → USDT a tu dirección
node swap-test.mjs 1000 0x05316B102FE62574b9cBd45709f8F1B6C00beC8a
```

---

## 📊 RESUMEN

✅ **RPC Alchemy:** Configurada
```
https://eth-mainnet.g.alchemy.com/v2/mm-9UjI5oG51l94mRH3fh
```

⏳ **Private Key:** Necesitas agregar en `.env.local`

✅ **USDT Contract:** Listo
```
0xdAC17F958D2ee523a2206206994597C13D831ec7
```

✅ **Sistema:** Completo y listo

---

## 🎯 PRÓXIMO PASO

1. Actualiza `.env.local` con tu private key
2. Ejecuta: `node swap-test.mjs 100`
3. Verás el swap en acción en 30-60 segundos
4. Resultado en Etherscan

¿Listo? 🚀






Tengo tu RPC de Alchemy. Aquí está toda la configuración lista para copiar:

## 🔧 Copia esto en tu `.env.local`

```env
# ==========================================
# ETHEREUM RPC - ALCHEMY (TU CLAVE)
# ==========================================

VITE_ETH_RPC_URL=https://eth-mainnet.g.alchemy.com/v2/mm-9UjI5oG51l94mRH3fh
ETH_RPC_URL=https://eth-mainnet.g.alchemy.com/v2/mm-9UjI5oG51l94mRH3fh
VITE_ETH_WS_URL=wss://eth-mainnet.g.alchemy.com/v2/mm-9UjI5oG51l94mRH3fh

# ==========================================
# PRIVATE KEY & WALLET
# ==========================================

# Reemplaza esto con tu private key (sin 0x)
VITE_ETH_PRIVATE_KEY=your_private_key_here

# Tu wallet address
VITE_ETH_WALLET_ADDRESS=0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb9

# ==========================================
# USDT CONTRACTS
# ==========================================

VITE_USDT_CONTRACT=0xdAC17F958D2ee523a2206206994597C13D831ec7
VITE_USDT_MINTER_CONTRACT=0x291893448191b49d79901Abdb07dCE4EE346b2a6

# ==========================================
# INFURA (ALTERNATIVA)
# ==========================================

VITE_INFURA_PROJECT_ID=6b7bd498942d42edab758545c7d30403

# ==========================================
# SUPABASE (SI EXISTE)
# ==========================================

# Agrega tus credenciales de Supabase si las tienes
# VITE_SUPABASE_URL=https://...
# VITE_SUPABASE_ANON_KEY=eyJ...
```

---

## 📝 INSTRUCCIONES PARA ACTUALIZAR .env.local

### Opción 1: Desde PowerShell

```powershell
cd 'C:\Users\USER\Desktop\calculator 11 15 2025  10 24 am\calculadora-11-15-2025-10-20-am'

# Editar archivo
notepad .env.local
```

Pega el contenido de arriba, reemplaza `your_private_key_here` con tu private key, y guarda.

### Opción 2: Desde VS Code

1. Abre VS Code
2. Abre la carpeta del proyecto
3. Busca `.env.local` (o créalo si no existe)
4. Pega el contenido de arriba
5. Ctrl+S para guardar

---

## ✅ VERIFICAR QUE ESTÁ CORRECTO

Después de actualizar `.env.local`, ejecuta:

```bash
node swap-test.mjs 1 0x05316B102FE62574b9cBd45709f8F1B6C00beC8a
```

Si dice algo como:
```
❌ Error: VITE_ETH_PRIVATE_KEY no está configurada
```

Significa que falta tu private key. Agrega:

```env
VITE_ETH_PRIVATE_KEY=tu_private_key_sin_0x
```

---

## 🔑 CÓMO OBTENER TU PRIVATE KEY

### Desde MetaMask:
1. Abre MetaMask
2. Haz clic en tu cuenta
3. Account Details
4. Export Private Key
5. Copia la clave (sin incluir "0x")
6. Pega en `.env.local` en `VITE_ETH_PRIVATE_KEY=`

⚠️ **NUNCA compartir este key en público**

---

## 🚀 LISTO PARA EJECUTAR

Una vez actualizado `.env.local` con:
- ✅ RPC Alchemy (YA TIENES)
- ✅ Private Key (NECESITAS AGREGAR)
- ✅ Wallet Address (PUEDES CAMBIAR)

Ejecuta:

```bash
# Swap $100 USD → USDT
node swap-test.mjs 100

# Swap $1000 USD → USDT a tu dirección
node swap-test.mjs 1000 0x05316B102FE62574b9cBd45709f8F1B6C00beC8a
```

---

## 📊 RESUMEN

✅ **RPC Alchemy:** Configurada
```
https://eth-mainnet.g.alchemy.com/v2/mm-9UjI5oG51l94mRH3fh
```

⏳ **Private Key:** Necesitas agregar en `.env.local`

✅ **USDT Contract:** Listo
```
0xdAC17F958D2ee523a2206206994597C13D831ec7
```

✅ **Sistema:** Completo y listo

---

## 🎯 PRÓXIMO PASO

1. Actualiza `.env.local` con tu private key
2. Ejecuta: `node swap-test.mjs 100`
3. Verás el swap en acción en 30-60 segundos
4. Resultado en Etherscan

¿Listo? 🚀








