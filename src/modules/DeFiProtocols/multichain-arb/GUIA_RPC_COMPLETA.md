# 🌐 GUÍA COMPLETA DE RPCs PARA MULTI-CHAIN ARBITRAGE BOT

## 📋 Índice
1. [Resumen de lo que necesitas](#resumen)
2. [Crear RPCs en Alchemy](#alchemy)
3. [Crear RPCs en Infura](#infura)
4. [RPCs Públicos (gratuitos)](#publicos)
5. [Configuración del .env](#configuracion)
6. [Verificar conexión](#verificar)

---

## 🎯 Resumen de lo que necesitas {#resumen}

Para cada cadena necesitas **4 tipos de RPC**:

| Tipo | Uso | Prioridad |
|------|-----|-----------|
| `READ` | Leer datos (balances, precios) | Alta |
| `SIM` | Simular transacciones (eth_call) | Alta |
| `SEND` | Enviar transacciones | Crítica |
| `WS` | WebSocket (tiempo real) | Media |

### Cadenas soportadas:
- ✅ **Base** (Chain ID: 8453)
- ✅ **Arbitrum One** (Chain ID: 42161)
- ✅ **Optimism** (Chain ID: 10)
- ✅ **Polygon** (Chain ID: 137)

---

## 🔷 Opción 1: Crear RPCs en Alchemy (RECOMENDADO) {#alchemy}

### Paso 1: Crear cuenta
1. Ve a https://www.alchemy.com/
2. Click en "Get started for free"
3. Registra tu cuenta con email

### Paso 2: Crear Apps para cada cadena

#### Para BASE:
1. Dashboard → Create new app
2. **Name**: `MultiChain-Arb-Base`
3. **Chain**: Base
4. **Network**: Base Mainnet
5. Click "Create app"
6. Copia el **HTTPS** y **WSS** endpoint

#### Para ARBITRUM:
1. Dashboard → Create new app
2. **Name**: `MultiChain-Arb-Arbitrum`
3. **Chain**: Arbitrum
4. **Network**: Arbitrum Mainnet
5. Click "Create app"
6. Copia el **HTTPS** y **WSS** endpoint

#### Para OPTIMISM:
1. Dashboard → Create new app
2. **Name**: `MultiChain-Arb-Optimism`
3. **Chain**: Optimism
4. **Network**: Optimism Mainnet
5. Click "Create app"
6. Copia el **HTTPS** y **WSS** endpoint

#### Para POLYGON:
1. Dashboard → Create new app
2. **Name**: `MultiChain-Arb-Polygon`
3. **Chain**: Polygon
4. **Network**: Polygon Mainnet
5. Click "Create app"
6. Copia el **HTTPS** y **WSS** endpoint

### Formato de URLs Alchemy:
```
HTTPS: https://{chain}-mainnet.g.alchemy.com/v2/{API_KEY}
WSS:   wss://{chain}-mainnet.g.alchemy.com/v2/{API_KEY}
```

### Ejemplo real:
```env
# Base
BASE_RPC_READ=https://base-mainnet.g.alchemy.com/v2/abc123xyz
BASE_RPC_SIM=https://base-mainnet.g.alchemy.com/v2/abc123xyz
BASE_RPC_SEND=https://base-mainnet.g.alchemy.com/v2/abc123xyz
BASE_RPC_WS=wss://base-mainnet.g.alchemy.com/v2/abc123xyz

# Arbitrum
ARB_RPC_READ=https://arb-mainnet.g.alchemy.com/v2/def456uvw
ARB_RPC_SIM=https://arb-mainnet.g.alchemy.com/v2/def456uvw
ARB_RPC_SEND=https://arb-mainnet.g.alchemy.com/v2/def456uvw
ARB_RPC_WS=wss://arb-mainnet.g.alchemy.com/v2/def456uvw

# Optimism
OP_RPC_READ=https://opt-mainnet.g.alchemy.com/v2/ghi789rst
OP_RPC_SIM=https://opt-mainnet.g.alchemy.com/v2/ghi789rst
OP_RPC_SEND=https://opt-mainnet.g.alchemy.com/v2/ghi789rst
OP_RPC_WS=wss://opt-mainnet.g.alchemy.com/v2/ghi789rst

# Polygon
POLY_RPC_READ=https://polygon-mainnet.g.alchemy.com/v2/jkl012mno
POLY_RPC_SIM=https://polygon-mainnet.g.alchemy.com/v2/jkl012mno
POLY_RPC_SEND=https://polygon-mainnet.g.alchemy.com/v2/jkl012mno
POLY_RPC_WS=wss://polygon-mainnet.g.alchemy.com/v2/jkl012mno
```

### Plan gratuito de Alchemy:
- ✅ 300M compute units/mes
- ✅ Suficiente para ~10,000 operaciones/día
- ✅ WebSocket incluido

---

## 🔶 Opción 2: Crear RPCs en Infura {#infura}

### Paso 1: Crear cuenta
1. Ve a https://www.infura.io/
2. Click en "Sign Up"
3. Registra tu cuenta

### Paso 2: Crear proyecto
1. Dashboard → Create new API key
2. **Name**: `MultiChain-Arb`
3. Selecciona las redes:
   - ✅ Arbitrum
   - ✅ Optimism
   - ✅ Polygon
   - ❌ Base (no soportado en Infura)

### Formato de URLs Infura:
```
HTTPS: https://{network}.infura.io/v3/{PROJECT_ID}
WSS:   wss://{network}.infura.io/ws/v3/{PROJECT_ID}
```

### Ejemplo:
```env
# Arbitrum (Infura)
ARB_RPC_READ=https://arbitrum-mainnet.infura.io/v3/abc123
ARB_RPC_WS=wss://arbitrum-mainnet.infura.io/ws/v3/abc123

# Optimism (Infura)
OP_RPC_READ=https://optimism-mainnet.infura.io/v3/abc123
OP_RPC_WS=wss://optimism-mainnet.infura.io/ws/v3/abc123

# Polygon (Infura)
POLY_RPC_READ=https://polygon-mainnet.infura.io/v3/abc123
POLY_RPC_WS=wss://polygon-mainnet.infura.io/ws/v3/abc123
```

---

## 🆓 Opción 3: RPCs Públicos (Gratuitos) {#publicos}

⚠️ **Advertencia**: Los RPCs públicos tienen límites de rate y pueden ser lentos.
Solo usar para pruebas, NO para producción.

```env
# ═══════════════════════════════════════════════════════════════════════════════
# BASE - RPCs Públicos
# ═══════════════════════════════════════════════════════════════════════════════
BASE_RPC_READ=https://mainnet.base.org
BASE_RPC_SIM=https://mainnet.base.org
BASE_RPC_SEND=https://mainnet.base.org
BASE_RPC_WS=wss://base-mainnet.publicnode.com

# ═══════════════════════════════════════════════════════════════════════════════
# ARBITRUM - RPCs Públicos
# ═══════════════════════════════════════════════════════════════════════════════
ARB_RPC_READ=https://arb1.arbitrum.io/rpc
ARB_RPC_SIM=https://arb1.arbitrum.io/rpc
ARB_RPC_SEND=https://arb1.arbitrum.io/rpc
ARB_RPC_WS=wss://arbitrum-one.publicnode.com

# ═══════════════════════════════════════════════════════════════════════════════
# OPTIMISM - RPCs Públicos
# ═══════════════════════════════════════════════════════════════════════════════
OP_RPC_READ=https://mainnet.optimism.io
OP_RPC_SIM=https://mainnet.optimism.io
OP_RPC_SEND=https://mainnet.optimism.io
OP_RPC_WS=wss://optimism.publicnode.com

# ═══════════════════════════════════════════════════════════════════════════════
# POLYGON - RPCs Públicos
# ═══════════════════════════════════════════════════════════════════════════════
POLY_RPC_READ=https://polygon-rpc.com
POLY_RPC_SIM=https://polygon-rpc.com
POLY_RPC_SEND=https://polygon-rpc.com
POLY_RPC_WS=wss://polygon-bor.publicnode.com
```

### Otros RPCs públicos alternativos:

| Cadena | RPC Alternativo |
|--------|-----------------|
| Base | `https://base.llamarpc.com` |
| Arbitrum | `https://arbitrum.llamarpc.com` |
| Optimism | `https://optimism.llamarpc.com` |
| Polygon | `https://polygon.llamarpc.com` |

---

## ⚙️ Configuración del .env {#configuracion}

Crea el archivo `.env` en la raíz del proyecto:

```env
# ═══════════════════════════════════════════════════════════════════════════════
# MULTI-CHAIN MICRO ARBITRAGE BOT - CONFIGURACIÓN
# ═══════════════════════════════════════════════════════════════════════════════

# ─────────────────────────────────────────────────────────────────────────────────
# WALLET (¡NUNCA COMPARTAS ESTA CLAVE!)
# ─────────────────────────────────────────────────────────────────────────────────
PRIVATE_KEY=0xTU_CLAVE_PRIVADA_AQUI

# ─────────────────────────────────────────────────────────────────────────────────
# TIMING
# ─────────────────────────────────────────────────────────────────────────────────
TICK_MS=700
DECISION_MS=5000

# ─────────────────────────────────────────────────────────────────────────────────
# TRADING
# ─────────────────────────────────────────────────────────────────────────────────
MIN_PROFIT_USD=0.50
GAS_MULT=1.7
MAX_SLIPPAGE_BPS=10
DEADLINE_SECONDS=20

# ─────────────────────────────────────────────────────────────────────────────────
# CHAINS HABILITADAS
# ─────────────────────────────────────────────────────────────────────────────────
CHAINS=base,arbitrum,optimism,polygon

# ─────────────────────────────────────────────────────────────────────────────────
# BASE RPCs (Alchemy recomendado)
# ─────────────────────────────────────────────────────────────────────────────────
BASE_RPC_READ=https://base-mainnet.g.alchemy.com/v2/TU_API_KEY
BASE_RPC_SIM=https://base-mainnet.g.alchemy.com/v2/TU_API_KEY
BASE_RPC_SEND=https://base-mainnet.g.alchemy.com/v2/TU_API_KEY
BASE_RPC_WS=wss://base-mainnet.g.alchemy.com/v2/TU_API_KEY

# ─────────────────────────────────────────────────────────────────────────────────
# ARBITRUM RPCs
# ─────────────────────────────────────────────────────────────────────────────────
ARB_RPC_READ=https://arb-mainnet.g.alchemy.com/v2/TU_API_KEY
ARB_RPC_SIM=https://arb-mainnet.g.alchemy.com/v2/TU_API_KEY
ARB_RPC_SEND=https://arb-mainnet.g.alchemy.com/v2/TU_API_KEY
ARB_RPC_WS=wss://arb-mainnet.g.alchemy.com/v2/TU_API_KEY

# ─────────────────────────────────────────────────────────────────────────────────
# OPTIMISM RPCs
# ─────────────────────────────────────────────────────────────────────────────────
OP_RPC_READ=https://opt-mainnet.g.alchemy.com/v2/TU_API_KEY
OP_RPC_SIM=https://opt-mainnet.g.alchemy.com/v2/TU_API_KEY
OP_RPC_SEND=https://opt-mainnet.g.alchemy.com/v2/TU_API_KEY
OP_RPC_WS=wss://opt-mainnet.g.alchemy.com/v2/TU_API_KEY

# ─────────────────────────────────────────────────────────────────────────────────
# POLYGON RPCs
# ─────────────────────────────────────────────────────────────────────────────────
POLY_RPC_READ=https://polygon-mainnet.g.alchemy.com/v2/TU_API_KEY
POLY_RPC_SIM=https://polygon-mainnet.g.alchemy.com/v2/TU_API_KEY
POLY_RPC_SEND=https://polygon-mainnet.g.alchemy.com/v2/TU_API_KEY
POLY_RPC_WS=wss://polygon-mainnet.g.alchemy.com/v2/TU_API_KEY

# ─────────────────────────────────────────────────────────────────────────────────
# BLOCK EXPLORER API KEYS (para verificar contratos)
# ─────────────────────────────────────────────────────────────────────────────────
BASESCAN_API_KEY=
ARBISCAN_API_KEY=
OPSCAN_API_KEY=
POLYGONSCAN_API_KEY=

# ─────────────────────────────────────────────────────────────────────────────────
# MODO
# ─────────────────────────────────────────────────────────────────────────────────
DRY_RUN=true
LOG_LEVEL=info
```

---

## ✅ Verificar conexión {#verificar}

Ejecuta este script para verificar que todos los RPCs funcionan:

```bash
npx tsx scripts/verify-rpcs.ts
```

O manualmente:

```javascript
// scripts/verify-rpcs.ts
import { ethers } from "ethers";
import "dotenv/config";

const chains = [
  { name: "Base", rpc: process.env.BASE_RPC_READ, chainId: 8453 },
  { name: "Arbitrum", rpc: process.env.ARB_RPC_READ, chainId: 42161 },
  { name: "Optimism", rpc: process.env.OP_RPC_READ, chainId: 10 },
  { name: "Polygon", rpc: process.env.POLY_RPC_READ, chainId: 137 }
];

async function verify() {
  console.log("🔍 Verificando RPCs...\n");
  
  for (const chain of chains) {
    try {
      const provider = new ethers.JsonRpcProvider(chain.rpc);
      const network = await provider.getNetwork();
      const block = await provider.getBlockNumber();
      
      if (Number(network.chainId) === chain.chainId) {
        console.log(`✅ ${chain.name}: OK (Block #${block})`);
      } else {
        console.log(`❌ ${chain.name}: Chain ID incorrecto`);
      }
    } catch (error: any) {
      console.log(`❌ ${chain.name}: ${error.message}`);
    }
  }
}

verify();
```

---

## 📊 Resumen de pasos

### Para empezar RÁPIDO (RPCs públicos):
1. Copia el bloque de "RPCs Públicos" al `.env`
2. Agrega tu `PRIVATE_KEY`
3. Ejecuta `npm run dev`

### Para PRODUCCIÓN (Alchemy):
1. Crea cuenta en Alchemy
2. Crea 4 apps (una por cadena)
3. Copia los endpoints al `.env`
4. Agrega tu `PRIVATE_KEY`
5. Ejecuta `npm run dev`

---

## ⚠️ Notas importantes

1. **Seguridad**: NUNCA compartas tu `PRIVATE_KEY`
2. **Rate Limits**: Los RPCs públicos tienen límites (~100 req/seg)
3. **Latencia**: Alchemy/Infura tienen ~50ms, públicos ~200ms
4. **Costo**: Alchemy free tier = 300M compute units/mes
5. **WebSocket**: Necesario para actualizaciones en tiempo real

---

## 🆘 Troubleshooting

### Error: "Rate limited"
- Usa RPCs privados (Alchemy/Infura)
- Aumenta `TICK_MS` a 1000+

### Error: "Connection refused"
- Verifica que el RPC esté activo
- Prueba con un RPC alternativo

### Error: "Chain ID mismatch"
- Verifica que usas el RPC correcto para cada cadena
- Base = 8453, Arbitrum = 42161, Optimism = 10, Polygon = 137

---

¡Listo! Con esta guía puedes configurar todos los RPCs necesarios. 🚀



## 📋 Índice
1. [Resumen de lo que necesitas](#resumen)
2. [Crear RPCs en Alchemy](#alchemy)
3. [Crear RPCs en Infura](#infura)
4. [RPCs Públicos (gratuitos)](#publicos)
5. [Configuración del .env](#configuracion)
6. [Verificar conexión](#verificar)

---

## 🎯 Resumen de lo que necesitas {#resumen}

Para cada cadena necesitas **4 tipos de RPC**:

| Tipo | Uso | Prioridad |
|------|-----|-----------|
| `READ` | Leer datos (balances, precios) | Alta |
| `SIM` | Simular transacciones (eth_call) | Alta |
| `SEND` | Enviar transacciones | Crítica |
| `WS` | WebSocket (tiempo real) | Media |

### Cadenas soportadas:
- ✅ **Base** (Chain ID: 8453)
- ✅ **Arbitrum One** (Chain ID: 42161)
- ✅ **Optimism** (Chain ID: 10)
- ✅ **Polygon** (Chain ID: 137)

---

## 🔷 Opción 1: Crear RPCs en Alchemy (RECOMENDADO) {#alchemy}

### Paso 1: Crear cuenta
1. Ve a https://www.alchemy.com/
2. Click en "Get started for free"
3. Registra tu cuenta con email

### Paso 2: Crear Apps para cada cadena

#### Para BASE:
1. Dashboard → Create new app
2. **Name**: `MultiChain-Arb-Base`
3. **Chain**: Base
4. **Network**: Base Mainnet
5. Click "Create app"
6. Copia el **HTTPS** y **WSS** endpoint

#### Para ARBITRUM:
1. Dashboard → Create new app
2. **Name**: `MultiChain-Arb-Arbitrum`
3. **Chain**: Arbitrum
4. **Network**: Arbitrum Mainnet
5. Click "Create app"
6. Copia el **HTTPS** y **WSS** endpoint

#### Para OPTIMISM:
1. Dashboard → Create new app
2. **Name**: `MultiChain-Arb-Optimism`
3. **Chain**: Optimism
4. **Network**: Optimism Mainnet
5. Click "Create app"
6. Copia el **HTTPS** y **WSS** endpoint

#### Para POLYGON:
1. Dashboard → Create new app
2. **Name**: `MultiChain-Arb-Polygon`
3. **Chain**: Polygon
4. **Network**: Polygon Mainnet
5. Click "Create app"
6. Copia el **HTTPS** y **WSS** endpoint

### Formato de URLs Alchemy:
```
HTTPS: https://{chain}-mainnet.g.alchemy.com/v2/{API_KEY}
WSS:   wss://{chain}-mainnet.g.alchemy.com/v2/{API_KEY}
```

### Ejemplo real:
```env
# Base
BASE_RPC_READ=https://base-mainnet.g.alchemy.com/v2/abc123xyz
BASE_RPC_SIM=https://base-mainnet.g.alchemy.com/v2/abc123xyz
BASE_RPC_SEND=https://base-mainnet.g.alchemy.com/v2/abc123xyz
BASE_RPC_WS=wss://base-mainnet.g.alchemy.com/v2/abc123xyz

# Arbitrum
ARB_RPC_READ=https://arb-mainnet.g.alchemy.com/v2/def456uvw
ARB_RPC_SIM=https://arb-mainnet.g.alchemy.com/v2/def456uvw
ARB_RPC_SEND=https://arb-mainnet.g.alchemy.com/v2/def456uvw
ARB_RPC_WS=wss://arb-mainnet.g.alchemy.com/v2/def456uvw

# Optimism
OP_RPC_READ=https://opt-mainnet.g.alchemy.com/v2/ghi789rst
OP_RPC_SIM=https://opt-mainnet.g.alchemy.com/v2/ghi789rst
OP_RPC_SEND=https://opt-mainnet.g.alchemy.com/v2/ghi789rst
OP_RPC_WS=wss://opt-mainnet.g.alchemy.com/v2/ghi789rst

# Polygon
POLY_RPC_READ=https://polygon-mainnet.g.alchemy.com/v2/jkl012mno
POLY_RPC_SIM=https://polygon-mainnet.g.alchemy.com/v2/jkl012mno
POLY_RPC_SEND=https://polygon-mainnet.g.alchemy.com/v2/jkl012mno
POLY_RPC_WS=wss://polygon-mainnet.g.alchemy.com/v2/jkl012mno
```

### Plan gratuito de Alchemy:
- ✅ 300M compute units/mes
- ✅ Suficiente para ~10,000 operaciones/día
- ✅ WebSocket incluido

---

## 🔶 Opción 2: Crear RPCs en Infura {#infura}

### Paso 1: Crear cuenta
1. Ve a https://www.infura.io/
2. Click en "Sign Up"
3. Registra tu cuenta

### Paso 2: Crear proyecto
1. Dashboard → Create new API key
2. **Name**: `MultiChain-Arb`
3. Selecciona las redes:
   - ✅ Arbitrum
   - ✅ Optimism
   - ✅ Polygon
   - ❌ Base (no soportado en Infura)

### Formato de URLs Infura:
```
HTTPS: https://{network}.infura.io/v3/{PROJECT_ID}
WSS:   wss://{network}.infura.io/ws/v3/{PROJECT_ID}
```

### Ejemplo:
```env
# Arbitrum (Infura)
ARB_RPC_READ=https://arbitrum-mainnet.infura.io/v3/abc123
ARB_RPC_WS=wss://arbitrum-mainnet.infura.io/ws/v3/abc123

# Optimism (Infura)
OP_RPC_READ=https://optimism-mainnet.infura.io/v3/abc123
OP_RPC_WS=wss://optimism-mainnet.infura.io/ws/v3/abc123

# Polygon (Infura)
POLY_RPC_READ=https://polygon-mainnet.infura.io/v3/abc123
POLY_RPC_WS=wss://polygon-mainnet.infura.io/ws/v3/abc123
```

---

## 🆓 Opción 3: RPCs Públicos (Gratuitos) {#publicos}

⚠️ **Advertencia**: Los RPCs públicos tienen límites de rate y pueden ser lentos.
Solo usar para pruebas, NO para producción.

```env
# ═══════════════════════════════════════════════════════════════════════════════
# BASE - RPCs Públicos
# ═══════════════════════════════════════════════════════════════════════════════
BASE_RPC_READ=https://mainnet.base.org
BASE_RPC_SIM=https://mainnet.base.org
BASE_RPC_SEND=https://mainnet.base.org
BASE_RPC_WS=wss://base-mainnet.publicnode.com

# ═══════════════════════════════════════════════════════════════════════════════
# ARBITRUM - RPCs Públicos
# ═══════════════════════════════════════════════════════════════════════════════
ARB_RPC_READ=https://arb1.arbitrum.io/rpc
ARB_RPC_SIM=https://arb1.arbitrum.io/rpc
ARB_RPC_SEND=https://arb1.arbitrum.io/rpc
ARB_RPC_WS=wss://arbitrum-one.publicnode.com

# ═══════════════════════════════════════════════════════════════════════════════
# OPTIMISM - RPCs Públicos
# ═══════════════════════════════════════════════════════════════════════════════
OP_RPC_READ=https://mainnet.optimism.io
OP_RPC_SIM=https://mainnet.optimism.io
OP_RPC_SEND=https://mainnet.optimism.io
OP_RPC_WS=wss://optimism.publicnode.com

# ═══════════════════════════════════════════════════════════════════════════════
# POLYGON - RPCs Públicos
# ═══════════════════════════════════════════════════════════════════════════════
POLY_RPC_READ=https://polygon-rpc.com
POLY_RPC_SIM=https://polygon-rpc.com
POLY_RPC_SEND=https://polygon-rpc.com
POLY_RPC_WS=wss://polygon-bor.publicnode.com
```

### Otros RPCs públicos alternativos:

| Cadena | RPC Alternativo |
|--------|-----------------|
| Base | `https://base.llamarpc.com` |
| Arbitrum | `https://arbitrum.llamarpc.com` |
| Optimism | `https://optimism.llamarpc.com` |
| Polygon | `https://polygon.llamarpc.com` |

---

## ⚙️ Configuración del .env {#configuracion}

Crea el archivo `.env` en la raíz del proyecto:

```env
# ═══════════════════════════════════════════════════════════════════════════════
# MULTI-CHAIN MICRO ARBITRAGE BOT - CONFIGURACIÓN
# ═══════════════════════════════════════════════════════════════════════════════

# ─────────────────────────────────────────────────────────────────────────────────
# WALLET (¡NUNCA COMPARTAS ESTA CLAVE!)
# ─────────────────────────────────────────────────────────────────────────────────
PRIVATE_KEY=0xTU_CLAVE_PRIVADA_AQUI

# ─────────────────────────────────────────────────────────────────────────────────
# TIMING
# ─────────────────────────────────────────────────────────────────────────────────
TICK_MS=700
DECISION_MS=5000

# ─────────────────────────────────────────────────────────────────────────────────
# TRADING
# ─────────────────────────────────────────────────────────────────────────────────
MIN_PROFIT_USD=0.50
GAS_MULT=1.7
MAX_SLIPPAGE_BPS=10
DEADLINE_SECONDS=20

# ─────────────────────────────────────────────────────────────────────────────────
# CHAINS HABILITADAS
# ─────────────────────────────────────────────────────────────────────────────────
CHAINS=base,arbitrum,optimism,polygon

# ─────────────────────────────────────────────────────────────────────────────────
# BASE RPCs (Alchemy recomendado)
# ─────────────────────────────────────────────────────────────────────────────────
BASE_RPC_READ=https://base-mainnet.g.alchemy.com/v2/TU_API_KEY
BASE_RPC_SIM=https://base-mainnet.g.alchemy.com/v2/TU_API_KEY
BASE_RPC_SEND=https://base-mainnet.g.alchemy.com/v2/TU_API_KEY
BASE_RPC_WS=wss://base-mainnet.g.alchemy.com/v2/TU_API_KEY

# ─────────────────────────────────────────────────────────────────────────────────
# ARBITRUM RPCs
# ─────────────────────────────────────────────────────────────────────────────────
ARB_RPC_READ=https://arb-mainnet.g.alchemy.com/v2/TU_API_KEY
ARB_RPC_SIM=https://arb-mainnet.g.alchemy.com/v2/TU_API_KEY
ARB_RPC_SEND=https://arb-mainnet.g.alchemy.com/v2/TU_API_KEY
ARB_RPC_WS=wss://arb-mainnet.g.alchemy.com/v2/TU_API_KEY

# ─────────────────────────────────────────────────────────────────────────────────
# OPTIMISM RPCs
# ─────────────────────────────────────────────────────────────────────────────────
OP_RPC_READ=https://opt-mainnet.g.alchemy.com/v2/TU_API_KEY
OP_RPC_SIM=https://opt-mainnet.g.alchemy.com/v2/TU_API_KEY
OP_RPC_SEND=https://opt-mainnet.g.alchemy.com/v2/TU_API_KEY
OP_RPC_WS=wss://opt-mainnet.g.alchemy.com/v2/TU_API_KEY

# ─────────────────────────────────────────────────────────────────────────────────
# POLYGON RPCs
# ─────────────────────────────────────────────────────────────────────────────────
POLY_RPC_READ=https://polygon-mainnet.g.alchemy.com/v2/TU_API_KEY
POLY_RPC_SIM=https://polygon-mainnet.g.alchemy.com/v2/TU_API_KEY
POLY_RPC_SEND=https://polygon-mainnet.g.alchemy.com/v2/TU_API_KEY
POLY_RPC_WS=wss://polygon-mainnet.g.alchemy.com/v2/TU_API_KEY

# ─────────────────────────────────────────────────────────────────────────────────
# BLOCK EXPLORER API KEYS (para verificar contratos)
# ─────────────────────────────────────────────────────────────────────────────────
BASESCAN_API_KEY=
ARBISCAN_API_KEY=
OPSCAN_API_KEY=
POLYGONSCAN_API_KEY=

# ─────────────────────────────────────────────────────────────────────────────────
# MODO
# ─────────────────────────────────────────────────────────────────────────────────
DRY_RUN=true
LOG_LEVEL=info
```

---

## ✅ Verificar conexión {#verificar}

Ejecuta este script para verificar que todos los RPCs funcionan:

```bash
npx tsx scripts/verify-rpcs.ts
```

O manualmente:

```javascript
// scripts/verify-rpcs.ts
import { ethers } from "ethers";
import "dotenv/config";

const chains = [
  { name: "Base", rpc: process.env.BASE_RPC_READ, chainId: 8453 },
  { name: "Arbitrum", rpc: process.env.ARB_RPC_READ, chainId: 42161 },
  { name: "Optimism", rpc: process.env.OP_RPC_READ, chainId: 10 },
  { name: "Polygon", rpc: process.env.POLY_RPC_READ, chainId: 137 }
];

async function verify() {
  console.log("🔍 Verificando RPCs...\n");
  
  for (const chain of chains) {
    try {
      const provider = new ethers.JsonRpcProvider(chain.rpc);
      const network = await provider.getNetwork();
      const block = await provider.getBlockNumber();
      
      if (Number(network.chainId) === chain.chainId) {
        console.log(`✅ ${chain.name}: OK (Block #${block})`);
      } else {
        console.log(`❌ ${chain.name}: Chain ID incorrecto`);
      }
    } catch (error: any) {
      console.log(`❌ ${chain.name}: ${error.message}`);
    }
  }
}

verify();
```

---

## 📊 Resumen de pasos

### Para empezar RÁPIDO (RPCs públicos):
1. Copia el bloque de "RPCs Públicos" al `.env`
2. Agrega tu `PRIVATE_KEY`
3. Ejecuta `npm run dev`

### Para PRODUCCIÓN (Alchemy):
1. Crea cuenta en Alchemy
2. Crea 4 apps (una por cadena)
3. Copia los endpoints al `.env`
4. Agrega tu `PRIVATE_KEY`
5. Ejecuta `npm run dev`

---

## ⚠️ Notas importantes

1. **Seguridad**: NUNCA compartas tu `PRIVATE_KEY`
2. **Rate Limits**: Los RPCs públicos tienen límites (~100 req/seg)
3. **Latencia**: Alchemy/Infura tienen ~50ms, públicos ~200ms
4. **Costo**: Alchemy free tier = 300M compute units/mes
5. **WebSocket**: Necesario para actualizaciones en tiempo real

---

## 🆘 Troubleshooting

### Error: "Rate limited"
- Usa RPCs privados (Alchemy/Infura)
- Aumenta `TICK_MS` a 1000+

### Error: "Connection refused"
- Verifica que el RPC esté activo
- Prueba con un RPC alternativo

### Error: "Chain ID mismatch"
- Verifica que usas el RPC correcto para cada cadena
- Base = 8453, Arbitrum = 42161, Optimism = 10, Polygon = 137

---

¡Listo! Con esta guía puedes configurar todos los RPCs necesarios. 🚀




## 📋 Índice
1. [Resumen de lo que necesitas](#resumen)
2. [Crear RPCs en Alchemy](#alchemy)
3. [Crear RPCs en Infura](#infura)
4. [RPCs Públicos (gratuitos)](#publicos)
5. [Configuración del .env](#configuracion)
6. [Verificar conexión](#verificar)

---

## 🎯 Resumen de lo que necesitas {#resumen}

Para cada cadena necesitas **4 tipos de RPC**:

| Tipo | Uso | Prioridad |
|------|-----|-----------|
| `READ` | Leer datos (balances, precios) | Alta |
| `SIM` | Simular transacciones (eth_call) | Alta |
| `SEND` | Enviar transacciones | Crítica |
| `WS` | WebSocket (tiempo real) | Media |

### Cadenas soportadas:
- ✅ **Base** (Chain ID: 8453)
- ✅ **Arbitrum One** (Chain ID: 42161)
- ✅ **Optimism** (Chain ID: 10)
- ✅ **Polygon** (Chain ID: 137)

---

## 🔷 Opción 1: Crear RPCs en Alchemy (RECOMENDADO) {#alchemy}

### Paso 1: Crear cuenta
1. Ve a https://www.alchemy.com/
2. Click en "Get started for free"
3. Registra tu cuenta con email

### Paso 2: Crear Apps para cada cadena

#### Para BASE:
1. Dashboard → Create new app
2. **Name**: `MultiChain-Arb-Base`
3. **Chain**: Base
4. **Network**: Base Mainnet
5. Click "Create app"
6. Copia el **HTTPS** y **WSS** endpoint

#### Para ARBITRUM:
1. Dashboard → Create new app
2. **Name**: `MultiChain-Arb-Arbitrum`
3. **Chain**: Arbitrum
4. **Network**: Arbitrum Mainnet
5. Click "Create app"
6. Copia el **HTTPS** y **WSS** endpoint

#### Para OPTIMISM:
1. Dashboard → Create new app
2. **Name**: `MultiChain-Arb-Optimism`
3. **Chain**: Optimism
4. **Network**: Optimism Mainnet
5. Click "Create app"
6. Copia el **HTTPS** y **WSS** endpoint

#### Para POLYGON:
1. Dashboard → Create new app
2. **Name**: `MultiChain-Arb-Polygon`
3. **Chain**: Polygon
4. **Network**: Polygon Mainnet
5. Click "Create app"
6. Copia el **HTTPS** y **WSS** endpoint

### Formato de URLs Alchemy:
```
HTTPS: https://{chain}-mainnet.g.alchemy.com/v2/{API_KEY}
WSS:   wss://{chain}-mainnet.g.alchemy.com/v2/{API_KEY}
```

### Ejemplo real:
```env
# Base
BASE_RPC_READ=https://base-mainnet.g.alchemy.com/v2/abc123xyz
BASE_RPC_SIM=https://base-mainnet.g.alchemy.com/v2/abc123xyz
BASE_RPC_SEND=https://base-mainnet.g.alchemy.com/v2/abc123xyz
BASE_RPC_WS=wss://base-mainnet.g.alchemy.com/v2/abc123xyz

# Arbitrum
ARB_RPC_READ=https://arb-mainnet.g.alchemy.com/v2/def456uvw
ARB_RPC_SIM=https://arb-mainnet.g.alchemy.com/v2/def456uvw
ARB_RPC_SEND=https://arb-mainnet.g.alchemy.com/v2/def456uvw
ARB_RPC_WS=wss://arb-mainnet.g.alchemy.com/v2/def456uvw

# Optimism
OP_RPC_READ=https://opt-mainnet.g.alchemy.com/v2/ghi789rst
OP_RPC_SIM=https://opt-mainnet.g.alchemy.com/v2/ghi789rst
OP_RPC_SEND=https://opt-mainnet.g.alchemy.com/v2/ghi789rst
OP_RPC_WS=wss://opt-mainnet.g.alchemy.com/v2/ghi789rst

# Polygon
POLY_RPC_READ=https://polygon-mainnet.g.alchemy.com/v2/jkl012mno
POLY_RPC_SIM=https://polygon-mainnet.g.alchemy.com/v2/jkl012mno
POLY_RPC_SEND=https://polygon-mainnet.g.alchemy.com/v2/jkl012mno
POLY_RPC_WS=wss://polygon-mainnet.g.alchemy.com/v2/jkl012mno
```

### Plan gratuito de Alchemy:
- ✅ 300M compute units/mes
- ✅ Suficiente para ~10,000 operaciones/día
- ✅ WebSocket incluido

---

## 🔶 Opción 2: Crear RPCs en Infura {#infura}

### Paso 1: Crear cuenta
1. Ve a https://www.infura.io/
2. Click en "Sign Up"
3. Registra tu cuenta

### Paso 2: Crear proyecto
1. Dashboard → Create new API key
2. **Name**: `MultiChain-Arb`
3. Selecciona las redes:
   - ✅ Arbitrum
   - ✅ Optimism
   - ✅ Polygon
   - ❌ Base (no soportado en Infura)

### Formato de URLs Infura:
```
HTTPS: https://{network}.infura.io/v3/{PROJECT_ID}
WSS:   wss://{network}.infura.io/ws/v3/{PROJECT_ID}
```

### Ejemplo:
```env
# Arbitrum (Infura)
ARB_RPC_READ=https://arbitrum-mainnet.infura.io/v3/abc123
ARB_RPC_WS=wss://arbitrum-mainnet.infura.io/ws/v3/abc123

# Optimism (Infura)
OP_RPC_READ=https://optimism-mainnet.infura.io/v3/abc123
OP_RPC_WS=wss://optimism-mainnet.infura.io/ws/v3/abc123

# Polygon (Infura)
POLY_RPC_READ=https://polygon-mainnet.infura.io/v3/abc123
POLY_RPC_WS=wss://polygon-mainnet.infura.io/ws/v3/abc123
```

---

## 🆓 Opción 3: RPCs Públicos (Gratuitos) {#publicos}

⚠️ **Advertencia**: Los RPCs públicos tienen límites de rate y pueden ser lentos.
Solo usar para pruebas, NO para producción.

```env
# ═══════════════════════════════════════════════════════════════════════════════
# BASE - RPCs Públicos
# ═══════════════════════════════════════════════════════════════════════════════
BASE_RPC_READ=https://mainnet.base.org
BASE_RPC_SIM=https://mainnet.base.org
BASE_RPC_SEND=https://mainnet.base.org
BASE_RPC_WS=wss://base-mainnet.publicnode.com

# ═══════════════════════════════════════════════════════════════════════════════
# ARBITRUM - RPCs Públicos
# ═══════════════════════════════════════════════════════════════════════════════
ARB_RPC_READ=https://arb1.arbitrum.io/rpc
ARB_RPC_SIM=https://arb1.arbitrum.io/rpc
ARB_RPC_SEND=https://arb1.arbitrum.io/rpc
ARB_RPC_WS=wss://arbitrum-one.publicnode.com

# ═══════════════════════════════════════════════════════════════════════════════
# OPTIMISM - RPCs Públicos
# ═══════════════════════════════════════════════════════════════════════════════
OP_RPC_READ=https://mainnet.optimism.io
OP_RPC_SIM=https://mainnet.optimism.io
OP_RPC_SEND=https://mainnet.optimism.io
OP_RPC_WS=wss://optimism.publicnode.com

# ═══════════════════════════════════════════════════════════════════════════════
# POLYGON - RPCs Públicos
# ═══════════════════════════════════════════════════════════════════════════════
POLY_RPC_READ=https://polygon-rpc.com
POLY_RPC_SIM=https://polygon-rpc.com
POLY_RPC_SEND=https://polygon-rpc.com
POLY_RPC_WS=wss://polygon-bor.publicnode.com
```

### Otros RPCs públicos alternativos:

| Cadena | RPC Alternativo |
|--------|-----------------|
| Base | `https://base.llamarpc.com` |
| Arbitrum | `https://arbitrum.llamarpc.com` |
| Optimism | `https://optimism.llamarpc.com` |
| Polygon | `https://polygon.llamarpc.com` |

---

## ⚙️ Configuración del .env {#configuracion}

Crea el archivo `.env` en la raíz del proyecto:

```env
# ═══════════════════════════════════════════════════════════════════════════════
# MULTI-CHAIN MICRO ARBITRAGE BOT - CONFIGURACIÓN
# ═══════════════════════════════════════════════════════════════════════════════

# ─────────────────────────────────────────────────────────────────────────────────
# WALLET (¡NUNCA COMPARTAS ESTA CLAVE!)
# ─────────────────────────────────────────────────────────────────────────────────
PRIVATE_KEY=0xTU_CLAVE_PRIVADA_AQUI

# ─────────────────────────────────────────────────────────────────────────────────
# TIMING
# ─────────────────────────────────────────────────────────────────────────────────
TICK_MS=700
DECISION_MS=5000

# ─────────────────────────────────────────────────────────────────────────────────
# TRADING
# ─────────────────────────────────────────────────────────────────────────────────
MIN_PROFIT_USD=0.50
GAS_MULT=1.7
MAX_SLIPPAGE_BPS=10
DEADLINE_SECONDS=20

# ─────────────────────────────────────────────────────────────────────────────────
# CHAINS HABILITADAS
# ─────────────────────────────────────────────────────────────────────────────────
CHAINS=base,arbitrum,optimism,polygon

# ─────────────────────────────────────────────────────────────────────────────────
# BASE RPCs (Alchemy recomendado)
# ─────────────────────────────────────────────────────────────────────────────────
BASE_RPC_READ=https://base-mainnet.g.alchemy.com/v2/TU_API_KEY
BASE_RPC_SIM=https://base-mainnet.g.alchemy.com/v2/TU_API_KEY
BASE_RPC_SEND=https://base-mainnet.g.alchemy.com/v2/TU_API_KEY
BASE_RPC_WS=wss://base-mainnet.g.alchemy.com/v2/TU_API_KEY

# ─────────────────────────────────────────────────────────────────────────────────
# ARBITRUM RPCs
# ─────────────────────────────────────────────────────────────────────────────────
ARB_RPC_READ=https://arb-mainnet.g.alchemy.com/v2/TU_API_KEY
ARB_RPC_SIM=https://arb-mainnet.g.alchemy.com/v2/TU_API_KEY
ARB_RPC_SEND=https://arb-mainnet.g.alchemy.com/v2/TU_API_KEY
ARB_RPC_WS=wss://arb-mainnet.g.alchemy.com/v2/TU_API_KEY

# ─────────────────────────────────────────────────────────────────────────────────
# OPTIMISM RPCs
# ─────────────────────────────────────────────────────────────────────────────────
OP_RPC_READ=https://opt-mainnet.g.alchemy.com/v2/TU_API_KEY
OP_RPC_SIM=https://opt-mainnet.g.alchemy.com/v2/TU_API_KEY
OP_RPC_SEND=https://opt-mainnet.g.alchemy.com/v2/TU_API_KEY
OP_RPC_WS=wss://opt-mainnet.g.alchemy.com/v2/TU_API_KEY

# ─────────────────────────────────────────────────────────────────────────────────
# POLYGON RPCs
# ─────────────────────────────────────────────────────────────────────────────────
POLY_RPC_READ=https://polygon-mainnet.g.alchemy.com/v2/TU_API_KEY
POLY_RPC_SIM=https://polygon-mainnet.g.alchemy.com/v2/TU_API_KEY
POLY_RPC_SEND=https://polygon-mainnet.g.alchemy.com/v2/TU_API_KEY
POLY_RPC_WS=wss://polygon-mainnet.g.alchemy.com/v2/TU_API_KEY

# ─────────────────────────────────────────────────────────────────────────────────
# BLOCK EXPLORER API KEYS (para verificar contratos)
# ─────────────────────────────────────────────────────────────────────────────────
BASESCAN_API_KEY=
ARBISCAN_API_KEY=
OPSCAN_API_KEY=
POLYGONSCAN_API_KEY=

# ─────────────────────────────────────────────────────────────────────────────────
# MODO
# ─────────────────────────────────────────────────────────────────────────────────
DRY_RUN=true
LOG_LEVEL=info
```

---

## ✅ Verificar conexión {#verificar}

Ejecuta este script para verificar que todos los RPCs funcionan:

```bash
npx tsx scripts/verify-rpcs.ts
```

O manualmente:

```javascript
// scripts/verify-rpcs.ts
import { ethers } from "ethers";
import "dotenv/config";

const chains = [
  { name: "Base", rpc: process.env.BASE_RPC_READ, chainId: 8453 },
  { name: "Arbitrum", rpc: process.env.ARB_RPC_READ, chainId: 42161 },
  { name: "Optimism", rpc: process.env.OP_RPC_READ, chainId: 10 },
  { name: "Polygon", rpc: process.env.POLY_RPC_READ, chainId: 137 }
];

async function verify() {
  console.log("🔍 Verificando RPCs...\n");
  
  for (const chain of chains) {
    try {
      const provider = new ethers.JsonRpcProvider(chain.rpc);
      const network = await provider.getNetwork();
      const block = await provider.getBlockNumber();
      
      if (Number(network.chainId) === chain.chainId) {
        console.log(`✅ ${chain.name}: OK (Block #${block})`);
      } else {
        console.log(`❌ ${chain.name}: Chain ID incorrecto`);
      }
    } catch (error: any) {
      console.log(`❌ ${chain.name}: ${error.message}`);
    }
  }
}

verify();
```

---

## 📊 Resumen de pasos

### Para empezar RÁPIDO (RPCs públicos):
1. Copia el bloque de "RPCs Públicos" al `.env`
2. Agrega tu `PRIVATE_KEY`
3. Ejecuta `npm run dev`

### Para PRODUCCIÓN (Alchemy):
1. Crea cuenta en Alchemy
2. Crea 4 apps (una por cadena)
3. Copia los endpoints al `.env`
4. Agrega tu `PRIVATE_KEY`
5. Ejecuta `npm run dev`

---

## ⚠️ Notas importantes

1. **Seguridad**: NUNCA compartas tu `PRIVATE_KEY`
2. **Rate Limits**: Los RPCs públicos tienen límites (~100 req/seg)
3. **Latencia**: Alchemy/Infura tienen ~50ms, públicos ~200ms
4. **Costo**: Alchemy free tier = 300M compute units/mes
5. **WebSocket**: Necesario para actualizaciones en tiempo real

---

## 🆘 Troubleshooting

### Error: "Rate limited"
- Usa RPCs privados (Alchemy/Infura)
- Aumenta `TICK_MS` a 1000+

### Error: "Connection refused"
- Verifica que el RPC esté activo
- Prueba con un RPC alternativo

### Error: "Chain ID mismatch"
- Verifica que usas el RPC correcto para cada cadena
- Base = 8453, Arbitrum = 42161, Optimism = 10, Polygon = 137

---

¡Listo! Con esta guía puedes configurar todos los RPCs necesarios. 🚀



## 📋 Índice
1. [Resumen de lo que necesitas](#resumen)
2. [Crear RPCs en Alchemy](#alchemy)
3. [Crear RPCs en Infura](#infura)
4. [RPCs Públicos (gratuitos)](#publicos)
5. [Configuración del .env](#configuracion)
6. [Verificar conexión](#verificar)

---

## 🎯 Resumen de lo que necesitas {#resumen}

Para cada cadena necesitas **4 tipos de RPC**:

| Tipo | Uso | Prioridad |
|------|-----|-----------|
| `READ` | Leer datos (balances, precios) | Alta |
| `SIM` | Simular transacciones (eth_call) | Alta |
| `SEND` | Enviar transacciones | Crítica |
| `WS` | WebSocket (tiempo real) | Media |

### Cadenas soportadas:
- ✅ **Base** (Chain ID: 8453)
- ✅ **Arbitrum One** (Chain ID: 42161)
- ✅ **Optimism** (Chain ID: 10)
- ✅ **Polygon** (Chain ID: 137)

---

## 🔷 Opción 1: Crear RPCs en Alchemy (RECOMENDADO) {#alchemy}

### Paso 1: Crear cuenta
1. Ve a https://www.alchemy.com/
2. Click en "Get started for free"
3. Registra tu cuenta con email

### Paso 2: Crear Apps para cada cadena

#### Para BASE:
1. Dashboard → Create new app
2. **Name**: `MultiChain-Arb-Base`
3. **Chain**: Base
4. **Network**: Base Mainnet
5. Click "Create app"
6. Copia el **HTTPS** y **WSS** endpoint

#### Para ARBITRUM:
1. Dashboard → Create new app
2. **Name**: `MultiChain-Arb-Arbitrum`
3. **Chain**: Arbitrum
4. **Network**: Arbitrum Mainnet
5. Click "Create app"
6. Copia el **HTTPS** y **WSS** endpoint

#### Para OPTIMISM:
1. Dashboard → Create new app
2. **Name**: `MultiChain-Arb-Optimism`
3. **Chain**: Optimism
4. **Network**: Optimism Mainnet
5. Click "Create app"
6. Copia el **HTTPS** y **WSS** endpoint

#### Para POLYGON:
1. Dashboard → Create new app
2. **Name**: `MultiChain-Arb-Polygon`
3. **Chain**: Polygon
4. **Network**: Polygon Mainnet
5. Click "Create app"
6. Copia el **HTTPS** y **WSS** endpoint

### Formato de URLs Alchemy:
```
HTTPS: https://{chain}-mainnet.g.alchemy.com/v2/{API_KEY}
WSS:   wss://{chain}-mainnet.g.alchemy.com/v2/{API_KEY}
```

### Ejemplo real:
```env
# Base
BASE_RPC_READ=https://base-mainnet.g.alchemy.com/v2/abc123xyz
BASE_RPC_SIM=https://base-mainnet.g.alchemy.com/v2/abc123xyz
BASE_RPC_SEND=https://base-mainnet.g.alchemy.com/v2/abc123xyz
BASE_RPC_WS=wss://base-mainnet.g.alchemy.com/v2/abc123xyz

# Arbitrum
ARB_RPC_READ=https://arb-mainnet.g.alchemy.com/v2/def456uvw
ARB_RPC_SIM=https://arb-mainnet.g.alchemy.com/v2/def456uvw
ARB_RPC_SEND=https://arb-mainnet.g.alchemy.com/v2/def456uvw
ARB_RPC_WS=wss://arb-mainnet.g.alchemy.com/v2/def456uvw

# Optimism
OP_RPC_READ=https://opt-mainnet.g.alchemy.com/v2/ghi789rst
OP_RPC_SIM=https://opt-mainnet.g.alchemy.com/v2/ghi789rst
OP_RPC_SEND=https://opt-mainnet.g.alchemy.com/v2/ghi789rst
OP_RPC_WS=wss://opt-mainnet.g.alchemy.com/v2/ghi789rst

# Polygon
POLY_RPC_READ=https://polygon-mainnet.g.alchemy.com/v2/jkl012mno
POLY_RPC_SIM=https://polygon-mainnet.g.alchemy.com/v2/jkl012mno
POLY_RPC_SEND=https://polygon-mainnet.g.alchemy.com/v2/jkl012mno
POLY_RPC_WS=wss://polygon-mainnet.g.alchemy.com/v2/jkl012mno
```

### Plan gratuito de Alchemy:
- ✅ 300M compute units/mes
- ✅ Suficiente para ~10,000 operaciones/día
- ✅ WebSocket incluido

---

## 🔶 Opción 2: Crear RPCs en Infura {#infura}

### Paso 1: Crear cuenta
1. Ve a https://www.infura.io/
2. Click en "Sign Up"
3. Registra tu cuenta

### Paso 2: Crear proyecto
1. Dashboard → Create new API key
2. **Name**: `MultiChain-Arb`
3. Selecciona las redes:
   - ✅ Arbitrum
   - ✅ Optimism
   - ✅ Polygon
   - ❌ Base (no soportado en Infura)

### Formato de URLs Infura:
```
HTTPS: https://{network}.infura.io/v3/{PROJECT_ID}
WSS:   wss://{network}.infura.io/ws/v3/{PROJECT_ID}
```

### Ejemplo:
```env
# Arbitrum (Infura)
ARB_RPC_READ=https://arbitrum-mainnet.infura.io/v3/abc123
ARB_RPC_WS=wss://arbitrum-mainnet.infura.io/ws/v3/abc123

# Optimism (Infura)
OP_RPC_READ=https://optimism-mainnet.infura.io/v3/abc123
OP_RPC_WS=wss://optimism-mainnet.infura.io/ws/v3/abc123

# Polygon (Infura)
POLY_RPC_READ=https://polygon-mainnet.infura.io/v3/abc123
POLY_RPC_WS=wss://polygon-mainnet.infura.io/ws/v3/abc123
```

---

## 🆓 Opción 3: RPCs Públicos (Gratuitos) {#publicos}

⚠️ **Advertencia**: Los RPCs públicos tienen límites de rate y pueden ser lentos.
Solo usar para pruebas, NO para producción.

```env
# ═══════════════════════════════════════════════════════════════════════════════
# BASE - RPCs Públicos
# ═══════════════════════════════════════════════════════════════════════════════
BASE_RPC_READ=https://mainnet.base.org
BASE_RPC_SIM=https://mainnet.base.org
BASE_RPC_SEND=https://mainnet.base.org
BASE_RPC_WS=wss://base-mainnet.publicnode.com

# ═══════════════════════════════════════════════════════════════════════════════
# ARBITRUM - RPCs Públicos
# ═══════════════════════════════════════════════════════════════════════════════
ARB_RPC_READ=https://arb1.arbitrum.io/rpc
ARB_RPC_SIM=https://arb1.arbitrum.io/rpc
ARB_RPC_SEND=https://arb1.arbitrum.io/rpc
ARB_RPC_WS=wss://arbitrum-one.publicnode.com

# ═══════════════════════════════════════════════════════════════════════════════
# OPTIMISM - RPCs Públicos
# ═══════════════════════════════════════════════════════════════════════════════
OP_RPC_READ=https://mainnet.optimism.io
OP_RPC_SIM=https://mainnet.optimism.io
OP_RPC_SEND=https://mainnet.optimism.io
OP_RPC_WS=wss://optimism.publicnode.com

# ═══════════════════════════════════════════════════════════════════════════════
# POLYGON - RPCs Públicos
# ═══════════════════════════════════════════════════════════════════════════════
POLY_RPC_READ=https://polygon-rpc.com
POLY_RPC_SIM=https://polygon-rpc.com
POLY_RPC_SEND=https://polygon-rpc.com
POLY_RPC_WS=wss://polygon-bor.publicnode.com
```

### Otros RPCs públicos alternativos:

| Cadena | RPC Alternativo |
|--------|-----------------|
| Base | `https://base.llamarpc.com` |
| Arbitrum | `https://arbitrum.llamarpc.com` |
| Optimism | `https://optimism.llamarpc.com` |
| Polygon | `https://polygon.llamarpc.com` |

---

## ⚙️ Configuración del .env {#configuracion}

Crea el archivo `.env` en la raíz del proyecto:

```env
# ═══════════════════════════════════════════════════════════════════════════════
# MULTI-CHAIN MICRO ARBITRAGE BOT - CONFIGURACIÓN
# ═══════════════════════════════════════════════════════════════════════════════

# ─────────────────────────────────────────────────────────────────────────────────
# WALLET (¡NUNCA COMPARTAS ESTA CLAVE!)
# ─────────────────────────────────────────────────────────────────────────────────
PRIVATE_KEY=0xTU_CLAVE_PRIVADA_AQUI

# ─────────────────────────────────────────────────────────────────────────────────
# TIMING
# ─────────────────────────────────────────────────────────────────────────────────
TICK_MS=700
DECISION_MS=5000

# ─────────────────────────────────────────────────────────────────────────────────
# TRADING
# ─────────────────────────────────────────────────────────────────────────────────
MIN_PROFIT_USD=0.50
GAS_MULT=1.7
MAX_SLIPPAGE_BPS=10
DEADLINE_SECONDS=20

# ─────────────────────────────────────────────────────────────────────────────────
# CHAINS HABILITADAS
# ─────────────────────────────────────────────────────────────────────────────────
CHAINS=base,arbitrum,optimism,polygon

# ─────────────────────────────────────────────────────────────────────────────────
# BASE RPCs (Alchemy recomendado)
# ─────────────────────────────────────────────────────────────────────────────────
BASE_RPC_READ=https://base-mainnet.g.alchemy.com/v2/TU_API_KEY
BASE_RPC_SIM=https://base-mainnet.g.alchemy.com/v2/TU_API_KEY
BASE_RPC_SEND=https://base-mainnet.g.alchemy.com/v2/TU_API_KEY
BASE_RPC_WS=wss://base-mainnet.g.alchemy.com/v2/TU_API_KEY

# ─────────────────────────────────────────────────────────────────────────────────
# ARBITRUM RPCs
# ─────────────────────────────────────────────────────────────────────────────────
ARB_RPC_READ=https://arb-mainnet.g.alchemy.com/v2/TU_API_KEY
ARB_RPC_SIM=https://arb-mainnet.g.alchemy.com/v2/TU_API_KEY
ARB_RPC_SEND=https://arb-mainnet.g.alchemy.com/v2/TU_API_KEY
ARB_RPC_WS=wss://arb-mainnet.g.alchemy.com/v2/TU_API_KEY

# ─────────────────────────────────────────────────────────────────────────────────
# OPTIMISM RPCs
# ─────────────────────────────────────────────────────────────────────────────────
OP_RPC_READ=https://opt-mainnet.g.alchemy.com/v2/TU_API_KEY
OP_RPC_SIM=https://opt-mainnet.g.alchemy.com/v2/TU_API_KEY
OP_RPC_SEND=https://opt-mainnet.g.alchemy.com/v2/TU_API_KEY
OP_RPC_WS=wss://opt-mainnet.g.alchemy.com/v2/TU_API_KEY

# ─────────────────────────────────────────────────────────────────────────────────
# POLYGON RPCs
# ─────────────────────────────────────────────────────────────────────────────────
POLY_RPC_READ=https://polygon-mainnet.g.alchemy.com/v2/TU_API_KEY
POLY_RPC_SIM=https://polygon-mainnet.g.alchemy.com/v2/TU_API_KEY
POLY_RPC_SEND=https://polygon-mainnet.g.alchemy.com/v2/TU_API_KEY
POLY_RPC_WS=wss://polygon-mainnet.g.alchemy.com/v2/TU_API_KEY

# ─────────────────────────────────────────────────────────────────────────────────
# BLOCK EXPLORER API KEYS (para verificar contratos)
# ─────────────────────────────────────────────────────────────────────────────────
BASESCAN_API_KEY=
ARBISCAN_API_KEY=
OPSCAN_API_KEY=
POLYGONSCAN_API_KEY=

# ─────────────────────────────────────────────────────────────────────────────────
# MODO
# ─────────────────────────────────────────────────────────────────────────────────
DRY_RUN=true
LOG_LEVEL=info
```

---

## ✅ Verificar conexión {#verificar}

Ejecuta este script para verificar que todos los RPCs funcionan:

```bash
npx tsx scripts/verify-rpcs.ts
```

O manualmente:

```javascript
// scripts/verify-rpcs.ts
import { ethers } from "ethers";
import "dotenv/config";

const chains = [
  { name: "Base", rpc: process.env.BASE_RPC_READ, chainId: 8453 },
  { name: "Arbitrum", rpc: process.env.ARB_RPC_READ, chainId: 42161 },
  { name: "Optimism", rpc: process.env.OP_RPC_READ, chainId: 10 },
  { name: "Polygon", rpc: process.env.POLY_RPC_READ, chainId: 137 }
];

async function verify() {
  console.log("🔍 Verificando RPCs...\n");
  
  for (const chain of chains) {
    try {
      const provider = new ethers.JsonRpcProvider(chain.rpc);
      const network = await provider.getNetwork();
      const block = await provider.getBlockNumber();
      
      if (Number(network.chainId) === chain.chainId) {
        console.log(`✅ ${chain.name}: OK (Block #${block})`);
      } else {
        console.log(`❌ ${chain.name}: Chain ID incorrecto`);
      }
    } catch (error: any) {
      console.log(`❌ ${chain.name}: ${error.message}`);
    }
  }
}

verify();
```

---

## 📊 Resumen de pasos

### Para empezar RÁPIDO (RPCs públicos):
1. Copia el bloque de "RPCs Públicos" al `.env`
2. Agrega tu `PRIVATE_KEY`
3. Ejecuta `npm run dev`

### Para PRODUCCIÓN (Alchemy):
1. Crea cuenta en Alchemy
2. Crea 4 apps (una por cadena)
3. Copia los endpoints al `.env`
4. Agrega tu `PRIVATE_KEY`
5. Ejecuta `npm run dev`

---

## ⚠️ Notas importantes

1. **Seguridad**: NUNCA compartas tu `PRIVATE_KEY`
2. **Rate Limits**: Los RPCs públicos tienen límites (~100 req/seg)
3. **Latencia**: Alchemy/Infura tienen ~50ms, públicos ~200ms
4. **Costo**: Alchemy free tier = 300M compute units/mes
5. **WebSocket**: Necesario para actualizaciones en tiempo real

---

## 🆘 Troubleshooting

### Error: "Rate limited"
- Usa RPCs privados (Alchemy/Infura)
- Aumenta `TICK_MS` a 1000+

### Error: "Connection refused"
- Verifica que el RPC esté activo
- Prueba con un RPC alternativo

### Error: "Chain ID mismatch"
- Verifica que usas el RPC correcto para cada cadena
- Base = 8453, Arbitrum = 42161, Optimism = 10, Polygon = 137

---

¡Listo! Con esta guía puedes configurar todos los RPCs necesarios. 🚀




## 📋 Índice
1. [Resumen de lo que necesitas](#resumen)
2. [Crear RPCs en Alchemy](#alchemy)
3. [Crear RPCs en Infura](#infura)
4. [RPCs Públicos (gratuitos)](#publicos)
5. [Configuración del .env](#configuracion)
6. [Verificar conexión](#verificar)

---

## 🎯 Resumen de lo que necesitas {#resumen}

Para cada cadena necesitas **4 tipos de RPC**:

| Tipo | Uso | Prioridad |
|------|-----|-----------|
| `READ` | Leer datos (balances, precios) | Alta |
| `SIM` | Simular transacciones (eth_call) | Alta |
| `SEND` | Enviar transacciones | Crítica |
| `WS` | WebSocket (tiempo real) | Media |

### Cadenas soportadas:
- ✅ **Base** (Chain ID: 8453)
- ✅ **Arbitrum One** (Chain ID: 42161)
- ✅ **Optimism** (Chain ID: 10)
- ✅ **Polygon** (Chain ID: 137)

---

## 🔷 Opción 1: Crear RPCs en Alchemy (RECOMENDADO) {#alchemy}

### Paso 1: Crear cuenta
1. Ve a https://www.alchemy.com/
2. Click en "Get started for free"
3. Registra tu cuenta con email

### Paso 2: Crear Apps para cada cadena

#### Para BASE:
1. Dashboard → Create new app
2. **Name**: `MultiChain-Arb-Base`
3. **Chain**: Base
4. **Network**: Base Mainnet
5. Click "Create app"
6. Copia el **HTTPS** y **WSS** endpoint

#### Para ARBITRUM:
1. Dashboard → Create new app
2. **Name**: `MultiChain-Arb-Arbitrum`
3. **Chain**: Arbitrum
4. **Network**: Arbitrum Mainnet
5. Click "Create app"
6. Copia el **HTTPS** y **WSS** endpoint

#### Para OPTIMISM:
1. Dashboard → Create new app
2. **Name**: `MultiChain-Arb-Optimism`
3. **Chain**: Optimism
4. **Network**: Optimism Mainnet
5. Click "Create app"
6. Copia el **HTTPS** y **WSS** endpoint

#### Para POLYGON:
1. Dashboard → Create new app
2. **Name**: `MultiChain-Arb-Polygon`
3. **Chain**: Polygon
4. **Network**: Polygon Mainnet
5. Click "Create app"
6. Copia el **HTTPS** y **WSS** endpoint

### Formato de URLs Alchemy:
```
HTTPS: https://{chain}-mainnet.g.alchemy.com/v2/{API_KEY}
WSS:   wss://{chain}-mainnet.g.alchemy.com/v2/{API_KEY}
```

### Ejemplo real:
```env
# Base
BASE_RPC_READ=https://base-mainnet.g.alchemy.com/v2/abc123xyz
BASE_RPC_SIM=https://base-mainnet.g.alchemy.com/v2/abc123xyz
BASE_RPC_SEND=https://base-mainnet.g.alchemy.com/v2/abc123xyz
BASE_RPC_WS=wss://base-mainnet.g.alchemy.com/v2/abc123xyz

# Arbitrum
ARB_RPC_READ=https://arb-mainnet.g.alchemy.com/v2/def456uvw
ARB_RPC_SIM=https://arb-mainnet.g.alchemy.com/v2/def456uvw
ARB_RPC_SEND=https://arb-mainnet.g.alchemy.com/v2/def456uvw
ARB_RPC_WS=wss://arb-mainnet.g.alchemy.com/v2/def456uvw

# Optimism
OP_RPC_READ=https://opt-mainnet.g.alchemy.com/v2/ghi789rst
OP_RPC_SIM=https://opt-mainnet.g.alchemy.com/v2/ghi789rst
OP_RPC_SEND=https://opt-mainnet.g.alchemy.com/v2/ghi789rst
OP_RPC_WS=wss://opt-mainnet.g.alchemy.com/v2/ghi789rst

# Polygon
POLY_RPC_READ=https://polygon-mainnet.g.alchemy.com/v2/jkl012mno
POLY_RPC_SIM=https://polygon-mainnet.g.alchemy.com/v2/jkl012mno
POLY_RPC_SEND=https://polygon-mainnet.g.alchemy.com/v2/jkl012mno
POLY_RPC_WS=wss://polygon-mainnet.g.alchemy.com/v2/jkl012mno
```

### Plan gratuito de Alchemy:
- ✅ 300M compute units/mes
- ✅ Suficiente para ~10,000 operaciones/día
- ✅ WebSocket incluido

---

## 🔶 Opción 2: Crear RPCs en Infura {#infura}

### Paso 1: Crear cuenta
1. Ve a https://www.infura.io/
2. Click en "Sign Up"
3. Registra tu cuenta

### Paso 2: Crear proyecto
1. Dashboard → Create new API key
2. **Name**: `MultiChain-Arb`
3. Selecciona las redes:
   - ✅ Arbitrum
   - ✅ Optimism
   - ✅ Polygon
   - ❌ Base (no soportado en Infura)

### Formato de URLs Infura:
```
HTTPS: https://{network}.infura.io/v3/{PROJECT_ID}
WSS:   wss://{network}.infura.io/ws/v3/{PROJECT_ID}
```

### Ejemplo:
```env
# Arbitrum (Infura)
ARB_RPC_READ=https://arbitrum-mainnet.infura.io/v3/abc123
ARB_RPC_WS=wss://arbitrum-mainnet.infura.io/ws/v3/abc123

# Optimism (Infura)
OP_RPC_READ=https://optimism-mainnet.infura.io/v3/abc123
OP_RPC_WS=wss://optimism-mainnet.infura.io/ws/v3/abc123

# Polygon (Infura)
POLY_RPC_READ=https://polygon-mainnet.infura.io/v3/abc123
POLY_RPC_WS=wss://polygon-mainnet.infura.io/ws/v3/abc123
```

---

## 🆓 Opción 3: RPCs Públicos (Gratuitos) {#publicos}

⚠️ **Advertencia**: Los RPCs públicos tienen límites de rate y pueden ser lentos.
Solo usar para pruebas, NO para producción.

```env
# ═══════════════════════════════════════════════════════════════════════════════
# BASE - RPCs Públicos
# ═══════════════════════════════════════════════════════════════════════════════
BASE_RPC_READ=https://mainnet.base.org
BASE_RPC_SIM=https://mainnet.base.org
BASE_RPC_SEND=https://mainnet.base.org
BASE_RPC_WS=wss://base-mainnet.publicnode.com

# ═══════════════════════════════════════════════════════════════════════════════
# ARBITRUM - RPCs Públicos
# ═══════════════════════════════════════════════════════════════════════════════
ARB_RPC_READ=https://arb1.arbitrum.io/rpc
ARB_RPC_SIM=https://arb1.arbitrum.io/rpc
ARB_RPC_SEND=https://arb1.arbitrum.io/rpc
ARB_RPC_WS=wss://arbitrum-one.publicnode.com

# ═══════════════════════════════════════════════════════════════════════════════
# OPTIMISM - RPCs Públicos
# ═══════════════════════════════════════════════════════════════════════════════
OP_RPC_READ=https://mainnet.optimism.io
OP_RPC_SIM=https://mainnet.optimism.io
OP_RPC_SEND=https://mainnet.optimism.io
OP_RPC_WS=wss://optimism.publicnode.com

# ═══════════════════════════════════════════════════════════════════════════════
# POLYGON - RPCs Públicos
# ═══════════════════════════════════════════════════════════════════════════════
POLY_RPC_READ=https://polygon-rpc.com
POLY_RPC_SIM=https://polygon-rpc.com
POLY_RPC_SEND=https://polygon-rpc.com
POLY_RPC_WS=wss://polygon-bor.publicnode.com
```

### Otros RPCs públicos alternativos:

| Cadena | RPC Alternativo |
|--------|-----------------|
| Base | `https://base.llamarpc.com` |
| Arbitrum | `https://arbitrum.llamarpc.com` |
| Optimism | `https://optimism.llamarpc.com` |
| Polygon | `https://polygon.llamarpc.com` |

---

## ⚙️ Configuración del .env {#configuracion}

Crea el archivo `.env` en la raíz del proyecto:

```env
# ═══════════════════════════════════════════════════════════════════════════════
# MULTI-CHAIN MICRO ARBITRAGE BOT - CONFIGURACIÓN
# ═══════════════════════════════════════════════════════════════════════════════

# ─────────────────────────────────────────────────────────────────────────────────
# WALLET (¡NUNCA COMPARTAS ESTA CLAVE!)
# ─────────────────────────────────────────────────────────────────────────────────
PRIVATE_KEY=0xTU_CLAVE_PRIVADA_AQUI

# ─────────────────────────────────────────────────────────────────────────────────
# TIMING
# ─────────────────────────────────────────────────────────────────────────────────
TICK_MS=700
DECISION_MS=5000

# ─────────────────────────────────────────────────────────────────────────────────
# TRADING
# ─────────────────────────────────────────────────────────────────────────────────
MIN_PROFIT_USD=0.50
GAS_MULT=1.7
MAX_SLIPPAGE_BPS=10
DEADLINE_SECONDS=20

# ─────────────────────────────────────────────────────────────────────────────────
# CHAINS HABILITADAS
# ─────────────────────────────────────────────────────────────────────────────────
CHAINS=base,arbitrum,optimism,polygon

# ─────────────────────────────────────────────────────────────────────────────────
# BASE RPCs (Alchemy recomendado)
# ─────────────────────────────────────────────────────────────────────────────────
BASE_RPC_READ=https://base-mainnet.g.alchemy.com/v2/TU_API_KEY
BASE_RPC_SIM=https://base-mainnet.g.alchemy.com/v2/TU_API_KEY
BASE_RPC_SEND=https://base-mainnet.g.alchemy.com/v2/TU_API_KEY
BASE_RPC_WS=wss://base-mainnet.g.alchemy.com/v2/TU_API_KEY

# ─────────────────────────────────────────────────────────────────────────────────
# ARBITRUM RPCs
# ─────────────────────────────────────────────────────────────────────────────────
ARB_RPC_READ=https://arb-mainnet.g.alchemy.com/v2/TU_API_KEY
ARB_RPC_SIM=https://arb-mainnet.g.alchemy.com/v2/TU_API_KEY
ARB_RPC_SEND=https://arb-mainnet.g.alchemy.com/v2/TU_API_KEY
ARB_RPC_WS=wss://arb-mainnet.g.alchemy.com/v2/TU_API_KEY

# ─────────────────────────────────────────────────────────────────────────────────
# OPTIMISM RPCs
# ─────────────────────────────────────────────────────────────────────────────────
OP_RPC_READ=https://opt-mainnet.g.alchemy.com/v2/TU_API_KEY
OP_RPC_SIM=https://opt-mainnet.g.alchemy.com/v2/TU_API_KEY
OP_RPC_SEND=https://opt-mainnet.g.alchemy.com/v2/TU_API_KEY
OP_RPC_WS=wss://opt-mainnet.g.alchemy.com/v2/TU_API_KEY

# ─────────────────────────────────────────────────────────────────────────────────
# POLYGON RPCs
# ─────────────────────────────────────────────────────────────────────────────────
POLY_RPC_READ=https://polygon-mainnet.g.alchemy.com/v2/TU_API_KEY
POLY_RPC_SIM=https://polygon-mainnet.g.alchemy.com/v2/TU_API_KEY
POLY_RPC_SEND=https://polygon-mainnet.g.alchemy.com/v2/TU_API_KEY
POLY_RPC_WS=wss://polygon-mainnet.g.alchemy.com/v2/TU_API_KEY

# ─────────────────────────────────────────────────────────────────────────────────
# BLOCK EXPLORER API KEYS (para verificar contratos)
# ─────────────────────────────────────────────────────────────────────────────────
BASESCAN_API_KEY=
ARBISCAN_API_KEY=
OPSCAN_API_KEY=
POLYGONSCAN_API_KEY=

# ─────────────────────────────────────────────────────────────────────────────────
# MODO
# ─────────────────────────────────────────────────────────────────────────────────
DRY_RUN=true
LOG_LEVEL=info
```

---

## ✅ Verificar conexión {#verificar}

Ejecuta este script para verificar que todos los RPCs funcionan:

```bash
npx tsx scripts/verify-rpcs.ts
```

O manualmente:

```javascript
// scripts/verify-rpcs.ts
import { ethers } from "ethers";
import "dotenv/config";

const chains = [
  { name: "Base", rpc: process.env.BASE_RPC_READ, chainId: 8453 },
  { name: "Arbitrum", rpc: process.env.ARB_RPC_READ, chainId: 42161 },
  { name: "Optimism", rpc: process.env.OP_RPC_READ, chainId: 10 },
  { name: "Polygon", rpc: process.env.POLY_RPC_READ, chainId: 137 }
];

async function verify() {
  console.log("🔍 Verificando RPCs...\n");
  
  for (const chain of chains) {
    try {
      const provider = new ethers.JsonRpcProvider(chain.rpc);
      const network = await provider.getNetwork();
      const block = await provider.getBlockNumber();
      
      if (Number(network.chainId) === chain.chainId) {
        console.log(`✅ ${chain.name}: OK (Block #${block})`);
      } else {
        console.log(`❌ ${chain.name}: Chain ID incorrecto`);
      }
    } catch (error: any) {
      console.log(`❌ ${chain.name}: ${error.message}`);
    }
  }
}

verify();
```

---

## 📊 Resumen de pasos

### Para empezar RÁPIDO (RPCs públicos):
1. Copia el bloque de "RPCs Públicos" al `.env`
2. Agrega tu `PRIVATE_KEY`
3. Ejecuta `npm run dev`

### Para PRODUCCIÓN (Alchemy):
1. Crea cuenta en Alchemy
2. Crea 4 apps (una por cadena)
3. Copia los endpoints al `.env`
4. Agrega tu `PRIVATE_KEY`
5. Ejecuta `npm run dev`

---

## ⚠️ Notas importantes

1. **Seguridad**: NUNCA compartas tu `PRIVATE_KEY`
2. **Rate Limits**: Los RPCs públicos tienen límites (~100 req/seg)
3. **Latencia**: Alchemy/Infura tienen ~50ms, públicos ~200ms
4. **Costo**: Alchemy free tier = 300M compute units/mes
5. **WebSocket**: Necesario para actualizaciones en tiempo real

---

## 🆘 Troubleshooting

### Error: "Rate limited"
- Usa RPCs privados (Alchemy/Infura)
- Aumenta `TICK_MS` a 1000+

### Error: "Connection refused"
- Verifica que el RPC esté activo
- Prueba con un RPC alternativo

### Error: "Chain ID mismatch"
- Verifica que usas el RPC correcto para cada cadena
- Base = 8453, Arbitrum = 42161, Optimism = 10, Polygon = 137

---

¡Listo! Con esta guía puedes configurar todos los RPCs necesarios. 🚀



## 📋 Índice
1. [Resumen de lo que necesitas](#resumen)
2. [Crear RPCs en Alchemy](#alchemy)
3. [Crear RPCs en Infura](#infura)
4. [RPCs Públicos (gratuitos)](#publicos)
5. [Configuración del .env](#configuracion)
6. [Verificar conexión](#verificar)

---

## 🎯 Resumen de lo que necesitas {#resumen}

Para cada cadena necesitas **4 tipos de RPC**:

| Tipo | Uso | Prioridad |
|------|-----|-----------|
| `READ` | Leer datos (balances, precios) | Alta |
| `SIM` | Simular transacciones (eth_call) | Alta |
| `SEND` | Enviar transacciones | Crítica |
| `WS` | WebSocket (tiempo real) | Media |

### Cadenas soportadas:
- ✅ **Base** (Chain ID: 8453)
- ✅ **Arbitrum One** (Chain ID: 42161)
- ✅ **Optimism** (Chain ID: 10)
- ✅ **Polygon** (Chain ID: 137)

---

## 🔷 Opción 1: Crear RPCs en Alchemy (RECOMENDADO) {#alchemy}

### Paso 1: Crear cuenta
1. Ve a https://www.alchemy.com/
2. Click en "Get started for free"
3. Registra tu cuenta con email

### Paso 2: Crear Apps para cada cadena

#### Para BASE:
1. Dashboard → Create new app
2. **Name**: `MultiChain-Arb-Base`
3. **Chain**: Base
4. **Network**: Base Mainnet
5. Click "Create app"
6. Copia el **HTTPS** y **WSS** endpoint

#### Para ARBITRUM:
1. Dashboard → Create new app
2. **Name**: `MultiChain-Arb-Arbitrum`
3. **Chain**: Arbitrum
4. **Network**: Arbitrum Mainnet
5. Click "Create app"
6. Copia el **HTTPS** y **WSS** endpoint

#### Para OPTIMISM:
1. Dashboard → Create new app
2. **Name**: `MultiChain-Arb-Optimism`
3. **Chain**: Optimism
4. **Network**: Optimism Mainnet
5. Click "Create app"
6. Copia el **HTTPS** y **WSS** endpoint

#### Para POLYGON:
1. Dashboard → Create new app
2. **Name**: `MultiChain-Arb-Polygon`
3. **Chain**: Polygon
4. **Network**: Polygon Mainnet
5. Click "Create app"
6. Copia el **HTTPS** y **WSS** endpoint

### Formato de URLs Alchemy:
```
HTTPS: https://{chain}-mainnet.g.alchemy.com/v2/{API_KEY}
WSS:   wss://{chain}-mainnet.g.alchemy.com/v2/{API_KEY}
```

### Ejemplo real:
```env
# Base
BASE_RPC_READ=https://base-mainnet.g.alchemy.com/v2/abc123xyz
BASE_RPC_SIM=https://base-mainnet.g.alchemy.com/v2/abc123xyz
BASE_RPC_SEND=https://base-mainnet.g.alchemy.com/v2/abc123xyz
BASE_RPC_WS=wss://base-mainnet.g.alchemy.com/v2/abc123xyz

# Arbitrum
ARB_RPC_READ=https://arb-mainnet.g.alchemy.com/v2/def456uvw
ARB_RPC_SIM=https://arb-mainnet.g.alchemy.com/v2/def456uvw
ARB_RPC_SEND=https://arb-mainnet.g.alchemy.com/v2/def456uvw
ARB_RPC_WS=wss://arb-mainnet.g.alchemy.com/v2/def456uvw

# Optimism
OP_RPC_READ=https://opt-mainnet.g.alchemy.com/v2/ghi789rst
OP_RPC_SIM=https://opt-mainnet.g.alchemy.com/v2/ghi789rst
OP_RPC_SEND=https://opt-mainnet.g.alchemy.com/v2/ghi789rst
OP_RPC_WS=wss://opt-mainnet.g.alchemy.com/v2/ghi789rst

# Polygon
POLY_RPC_READ=https://polygon-mainnet.g.alchemy.com/v2/jkl012mno
POLY_RPC_SIM=https://polygon-mainnet.g.alchemy.com/v2/jkl012mno
POLY_RPC_SEND=https://polygon-mainnet.g.alchemy.com/v2/jkl012mno
POLY_RPC_WS=wss://polygon-mainnet.g.alchemy.com/v2/jkl012mno
```

### Plan gratuito de Alchemy:
- ✅ 300M compute units/mes
- ✅ Suficiente para ~10,000 operaciones/día
- ✅ WebSocket incluido

---

## 🔶 Opción 2: Crear RPCs en Infura {#infura}

### Paso 1: Crear cuenta
1. Ve a https://www.infura.io/
2. Click en "Sign Up"
3. Registra tu cuenta

### Paso 2: Crear proyecto
1. Dashboard → Create new API key
2. **Name**: `MultiChain-Arb`
3. Selecciona las redes:
   - ✅ Arbitrum
   - ✅ Optimism
   - ✅ Polygon
   - ❌ Base (no soportado en Infura)

### Formato de URLs Infura:
```
HTTPS: https://{network}.infura.io/v3/{PROJECT_ID}
WSS:   wss://{network}.infura.io/ws/v3/{PROJECT_ID}
```

### Ejemplo:
```env
# Arbitrum (Infura)
ARB_RPC_READ=https://arbitrum-mainnet.infura.io/v3/abc123
ARB_RPC_WS=wss://arbitrum-mainnet.infura.io/ws/v3/abc123

# Optimism (Infura)
OP_RPC_READ=https://optimism-mainnet.infura.io/v3/abc123
OP_RPC_WS=wss://optimism-mainnet.infura.io/ws/v3/abc123

# Polygon (Infura)
POLY_RPC_READ=https://polygon-mainnet.infura.io/v3/abc123
POLY_RPC_WS=wss://polygon-mainnet.infura.io/ws/v3/abc123
```

---

## 🆓 Opción 3: RPCs Públicos (Gratuitos) {#publicos}

⚠️ **Advertencia**: Los RPCs públicos tienen límites de rate y pueden ser lentos.
Solo usar para pruebas, NO para producción.

```env
# ═══════════════════════════════════════════════════════════════════════════════
# BASE - RPCs Públicos
# ═══════════════════════════════════════════════════════════════════════════════
BASE_RPC_READ=https://mainnet.base.org
BASE_RPC_SIM=https://mainnet.base.org
BASE_RPC_SEND=https://mainnet.base.org
BASE_RPC_WS=wss://base-mainnet.publicnode.com

# ═══════════════════════════════════════════════════════════════════════════════
# ARBITRUM - RPCs Públicos
# ═══════════════════════════════════════════════════════════════════════════════
ARB_RPC_READ=https://arb1.arbitrum.io/rpc
ARB_RPC_SIM=https://arb1.arbitrum.io/rpc
ARB_RPC_SEND=https://arb1.arbitrum.io/rpc
ARB_RPC_WS=wss://arbitrum-one.publicnode.com

# ═══════════════════════════════════════════════════════════════════════════════
# OPTIMISM - RPCs Públicos
# ═══════════════════════════════════════════════════════════════════════════════
OP_RPC_READ=https://mainnet.optimism.io
OP_RPC_SIM=https://mainnet.optimism.io
OP_RPC_SEND=https://mainnet.optimism.io
OP_RPC_WS=wss://optimism.publicnode.com

# ═══════════════════════════════════════════════════════════════════════════════
# POLYGON - RPCs Públicos
# ═══════════════════════════════════════════════════════════════════════════════
POLY_RPC_READ=https://polygon-rpc.com
POLY_RPC_SIM=https://polygon-rpc.com
POLY_RPC_SEND=https://polygon-rpc.com
POLY_RPC_WS=wss://polygon-bor.publicnode.com
```

### Otros RPCs públicos alternativos:

| Cadena | RPC Alternativo |
|--------|-----------------|
| Base | `https://base.llamarpc.com` |
| Arbitrum | `https://arbitrum.llamarpc.com` |
| Optimism | `https://optimism.llamarpc.com` |
| Polygon | `https://polygon.llamarpc.com` |

---

## ⚙️ Configuración del .env {#configuracion}

Crea el archivo `.env` en la raíz del proyecto:

```env
# ═══════════════════════════════════════════════════════════════════════════════
# MULTI-CHAIN MICRO ARBITRAGE BOT - CONFIGURACIÓN
# ═══════════════════════════════════════════════════════════════════════════════

# ─────────────────────────────────────────────────────────────────────────────────
# WALLET (¡NUNCA COMPARTAS ESTA CLAVE!)
# ─────────────────────────────────────────────────────────────────────────────────
PRIVATE_KEY=0xTU_CLAVE_PRIVADA_AQUI

# ─────────────────────────────────────────────────────────────────────────────────
# TIMING
# ─────────────────────────────────────────────────────────────────────────────────
TICK_MS=700
DECISION_MS=5000

# ─────────────────────────────────────────────────────────────────────────────────
# TRADING
# ─────────────────────────────────────────────────────────────────────────────────
MIN_PROFIT_USD=0.50
GAS_MULT=1.7
MAX_SLIPPAGE_BPS=10
DEADLINE_SECONDS=20

# ─────────────────────────────────────────────────────────────────────────────────
# CHAINS HABILITADAS
# ─────────────────────────────────────────────────────────────────────────────────
CHAINS=base,arbitrum,optimism,polygon

# ─────────────────────────────────────────────────────────────────────────────────
# BASE RPCs (Alchemy recomendado)
# ─────────────────────────────────────────────────────────────────────────────────
BASE_RPC_READ=https://base-mainnet.g.alchemy.com/v2/TU_API_KEY
BASE_RPC_SIM=https://base-mainnet.g.alchemy.com/v2/TU_API_KEY
BASE_RPC_SEND=https://base-mainnet.g.alchemy.com/v2/TU_API_KEY
BASE_RPC_WS=wss://base-mainnet.g.alchemy.com/v2/TU_API_KEY

# ─────────────────────────────────────────────────────────────────────────────────
# ARBITRUM RPCs
# ─────────────────────────────────────────────────────────────────────────────────
ARB_RPC_READ=https://arb-mainnet.g.alchemy.com/v2/TU_API_KEY
ARB_RPC_SIM=https://arb-mainnet.g.alchemy.com/v2/TU_API_KEY
ARB_RPC_SEND=https://arb-mainnet.g.alchemy.com/v2/TU_API_KEY
ARB_RPC_WS=wss://arb-mainnet.g.alchemy.com/v2/TU_API_KEY

# ─────────────────────────────────────────────────────────────────────────────────
# OPTIMISM RPCs
# ─────────────────────────────────────────────────────────────────────────────────
OP_RPC_READ=https://opt-mainnet.g.alchemy.com/v2/TU_API_KEY
OP_RPC_SIM=https://opt-mainnet.g.alchemy.com/v2/TU_API_KEY
OP_RPC_SEND=https://opt-mainnet.g.alchemy.com/v2/TU_API_KEY
OP_RPC_WS=wss://opt-mainnet.g.alchemy.com/v2/TU_API_KEY

# ─────────────────────────────────────────────────────────────────────────────────
# POLYGON RPCs
# ─────────────────────────────────────────────────────────────────────────────────
POLY_RPC_READ=https://polygon-mainnet.g.alchemy.com/v2/TU_API_KEY
POLY_RPC_SIM=https://polygon-mainnet.g.alchemy.com/v2/TU_API_KEY
POLY_RPC_SEND=https://polygon-mainnet.g.alchemy.com/v2/TU_API_KEY
POLY_RPC_WS=wss://polygon-mainnet.g.alchemy.com/v2/TU_API_KEY

# ─────────────────────────────────────────────────────────────────────────────────
# BLOCK EXPLORER API KEYS (para verificar contratos)
# ─────────────────────────────────────────────────────────────────────────────────
BASESCAN_API_KEY=
ARBISCAN_API_KEY=
OPSCAN_API_KEY=
POLYGONSCAN_API_KEY=

# ─────────────────────────────────────────────────────────────────────────────────
# MODO
# ─────────────────────────────────────────────────────────────────────────────────
DRY_RUN=true
LOG_LEVEL=info
```

---

## ✅ Verificar conexión {#verificar}

Ejecuta este script para verificar que todos los RPCs funcionan:

```bash
npx tsx scripts/verify-rpcs.ts
```

O manualmente:

```javascript
// scripts/verify-rpcs.ts
import { ethers } from "ethers";
import "dotenv/config";

const chains = [
  { name: "Base", rpc: process.env.BASE_RPC_READ, chainId: 8453 },
  { name: "Arbitrum", rpc: process.env.ARB_RPC_READ, chainId: 42161 },
  { name: "Optimism", rpc: process.env.OP_RPC_READ, chainId: 10 },
  { name: "Polygon", rpc: process.env.POLY_RPC_READ, chainId: 137 }
];

async function verify() {
  console.log("🔍 Verificando RPCs...\n");
  
  for (const chain of chains) {
    try {
      const provider = new ethers.JsonRpcProvider(chain.rpc);
      const network = await provider.getNetwork();
      const block = await provider.getBlockNumber();
      
      if (Number(network.chainId) === chain.chainId) {
        console.log(`✅ ${chain.name}: OK (Block #${block})`);
      } else {
        console.log(`❌ ${chain.name}: Chain ID incorrecto`);
      }
    } catch (error: any) {
      console.log(`❌ ${chain.name}: ${error.message}`);
    }
  }
}

verify();
```

---

## 📊 Resumen de pasos

### Para empezar RÁPIDO (RPCs públicos):
1. Copia el bloque de "RPCs Públicos" al `.env`
2. Agrega tu `PRIVATE_KEY`
3. Ejecuta `npm run dev`

### Para PRODUCCIÓN (Alchemy):
1. Crea cuenta en Alchemy
2. Crea 4 apps (una por cadena)
3. Copia los endpoints al `.env`
4. Agrega tu `PRIVATE_KEY`
5. Ejecuta `npm run dev`

---

## ⚠️ Notas importantes

1. **Seguridad**: NUNCA compartas tu `PRIVATE_KEY`
2. **Rate Limits**: Los RPCs públicos tienen límites (~100 req/seg)
3. **Latencia**: Alchemy/Infura tienen ~50ms, públicos ~200ms
4. **Costo**: Alchemy free tier = 300M compute units/mes
5. **WebSocket**: Necesario para actualizaciones en tiempo real

---

## 🆘 Troubleshooting

### Error: "Rate limited"
- Usa RPCs privados (Alchemy/Infura)
- Aumenta `TICK_MS` a 1000+

### Error: "Connection refused"
- Verifica que el RPC esté activo
- Prueba con un RPC alternativo

### Error: "Chain ID mismatch"
- Verifica que usas el RPC correcto para cada cadena
- Base = 8453, Arbitrum = 42161, Optimism = 10, Polygon = 137

---

¡Listo! Con esta guía puedes configurar todos los RPCs necesarios. 🚀




## 📋 Índice
1. [Resumen de lo que necesitas](#resumen)
2. [Crear RPCs en Alchemy](#alchemy)
3. [Crear RPCs en Infura](#infura)
4. [RPCs Públicos (gratuitos)](#publicos)
5. [Configuración del .env](#configuracion)
6. [Verificar conexión](#verificar)

---

## 🎯 Resumen de lo que necesitas {#resumen}

Para cada cadena necesitas **4 tipos de RPC**:

| Tipo | Uso | Prioridad |
|------|-----|-----------|
| `READ` | Leer datos (balances, precios) | Alta |
| `SIM` | Simular transacciones (eth_call) | Alta |
| `SEND` | Enviar transacciones | Crítica |
| `WS` | WebSocket (tiempo real) | Media |

### Cadenas soportadas:
- ✅ **Base** (Chain ID: 8453)
- ✅ **Arbitrum One** (Chain ID: 42161)
- ✅ **Optimism** (Chain ID: 10)
- ✅ **Polygon** (Chain ID: 137)

---

## 🔷 Opción 1: Crear RPCs en Alchemy (RECOMENDADO) {#alchemy}

### Paso 1: Crear cuenta
1. Ve a https://www.alchemy.com/
2. Click en "Get started for free"
3. Registra tu cuenta con email

### Paso 2: Crear Apps para cada cadena

#### Para BASE:
1. Dashboard → Create new app
2. **Name**: `MultiChain-Arb-Base`
3. **Chain**: Base
4. **Network**: Base Mainnet
5. Click "Create app"
6. Copia el **HTTPS** y **WSS** endpoint

#### Para ARBITRUM:
1. Dashboard → Create new app
2. **Name**: `MultiChain-Arb-Arbitrum`
3. **Chain**: Arbitrum
4. **Network**: Arbitrum Mainnet
5. Click "Create app"
6. Copia el **HTTPS** y **WSS** endpoint

#### Para OPTIMISM:
1. Dashboard → Create new app
2. **Name**: `MultiChain-Arb-Optimism`
3. **Chain**: Optimism
4. **Network**: Optimism Mainnet
5. Click "Create app"
6. Copia el **HTTPS** y **WSS** endpoint

#### Para POLYGON:
1. Dashboard → Create new app
2. **Name**: `MultiChain-Arb-Polygon`
3. **Chain**: Polygon
4. **Network**: Polygon Mainnet
5. Click "Create app"
6. Copia el **HTTPS** y **WSS** endpoint

### Formato de URLs Alchemy:
```
HTTPS: https://{chain}-mainnet.g.alchemy.com/v2/{API_KEY}
WSS:   wss://{chain}-mainnet.g.alchemy.com/v2/{API_KEY}
```

### Ejemplo real:
```env
# Base
BASE_RPC_READ=https://base-mainnet.g.alchemy.com/v2/abc123xyz
BASE_RPC_SIM=https://base-mainnet.g.alchemy.com/v2/abc123xyz
BASE_RPC_SEND=https://base-mainnet.g.alchemy.com/v2/abc123xyz
BASE_RPC_WS=wss://base-mainnet.g.alchemy.com/v2/abc123xyz

# Arbitrum
ARB_RPC_READ=https://arb-mainnet.g.alchemy.com/v2/def456uvw
ARB_RPC_SIM=https://arb-mainnet.g.alchemy.com/v2/def456uvw
ARB_RPC_SEND=https://arb-mainnet.g.alchemy.com/v2/def456uvw
ARB_RPC_WS=wss://arb-mainnet.g.alchemy.com/v2/def456uvw

# Optimism
OP_RPC_READ=https://opt-mainnet.g.alchemy.com/v2/ghi789rst
OP_RPC_SIM=https://opt-mainnet.g.alchemy.com/v2/ghi789rst
OP_RPC_SEND=https://opt-mainnet.g.alchemy.com/v2/ghi789rst
OP_RPC_WS=wss://opt-mainnet.g.alchemy.com/v2/ghi789rst

# Polygon
POLY_RPC_READ=https://polygon-mainnet.g.alchemy.com/v2/jkl012mno
POLY_RPC_SIM=https://polygon-mainnet.g.alchemy.com/v2/jkl012mno
POLY_RPC_SEND=https://polygon-mainnet.g.alchemy.com/v2/jkl012mno
POLY_RPC_WS=wss://polygon-mainnet.g.alchemy.com/v2/jkl012mno
```

### Plan gratuito de Alchemy:
- ✅ 300M compute units/mes
- ✅ Suficiente para ~10,000 operaciones/día
- ✅ WebSocket incluido

---

## 🔶 Opción 2: Crear RPCs en Infura {#infura}

### Paso 1: Crear cuenta
1. Ve a https://www.infura.io/
2. Click en "Sign Up"
3. Registra tu cuenta

### Paso 2: Crear proyecto
1. Dashboard → Create new API key
2. **Name**: `MultiChain-Arb`
3. Selecciona las redes:
   - ✅ Arbitrum
   - ✅ Optimism
   - ✅ Polygon
   - ❌ Base (no soportado en Infura)

### Formato de URLs Infura:
```
HTTPS: https://{network}.infura.io/v3/{PROJECT_ID}
WSS:   wss://{network}.infura.io/ws/v3/{PROJECT_ID}
```

### Ejemplo:
```env
# Arbitrum (Infura)
ARB_RPC_READ=https://arbitrum-mainnet.infura.io/v3/abc123
ARB_RPC_WS=wss://arbitrum-mainnet.infura.io/ws/v3/abc123

# Optimism (Infura)
OP_RPC_READ=https://optimism-mainnet.infura.io/v3/abc123
OP_RPC_WS=wss://optimism-mainnet.infura.io/ws/v3/abc123

# Polygon (Infura)
POLY_RPC_READ=https://polygon-mainnet.infura.io/v3/abc123
POLY_RPC_WS=wss://polygon-mainnet.infura.io/ws/v3/abc123
```

---

## 🆓 Opción 3: RPCs Públicos (Gratuitos) {#publicos}

⚠️ **Advertencia**: Los RPCs públicos tienen límites de rate y pueden ser lentos.
Solo usar para pruebas, NO para producción.

```env
# ═══════════════════════════════════════════════════════════════════════════════
# BASE - RPCs Públicos
# ═══════════════════════════════════════════════════════════════════════════════
BASE_RPC_READ=https://mainnet.base.org
BASE_RPC_SIM=https://mainnet.base.org
BASE_RPC_SEND=https://mainnet.base.org
BASE_RPC_WS=wss://base-mainnet.publicnode.com

# ═══════════════════════════════════════════════════════════════════════════════
# ARBITRUM - RPCs Públicos
# ═══════════════════════════════════════════════════════════════════════════════
ARB_RPC_READ=https://arb1.arbitrum.io/rpc
ARB_RPC_SIM=https://arb1.arbitrum.io/rpc
ARB_RPC_SEND=https://arb1.arbitrum.io/rpc
ARB_RPC_WS=wss://arbitrum-one.publicnode.com

# ═══════════════════════════════════════════════════════════════════════════════
# OPTIMISM - RPCs Públicos
# ═══════════════════════════════════════════════════════════════════════════════
OP_RPC_READ=https://mainnet.optimism.io
OP_RPC_SIM=https://mainnet.optimism.io
OP_RPC_SEND=https://mainnet.optimism.io
OP_RPC_WS=wss://optimism.publicnode.com

# ═══════════════════════════════════════════════════════════════════════════════
# POLYGON - RPCs Públicos
# ═══════════════════════════════════════════════════════════════════════════════
POLY_RPC_READ=https://polygon-rpc.com
POLY_RPC_SIM=https://polygon-rpc.com
POLY_RPC_SEND=https://polygon-rpc.com
POLY_RPC_WS=wss://polygon-bor.publicnode.com
```

### Otros RPCs públicos alternativos:

| Cadena | RPC Alternativo |
|--------|-----------------|
| Base | `https://base.llamarpc.com` |
| Arbitrum | `https://arbitrum.llamarpc.com` |
| Optimism | `https://optimism.llamarpc.com` |
| Polygon | `https://polygon.llamarpc.com` |

---

## ⚙️ Configuración del .env {#configuracion}

Crea el archivo `.env` en la raíz del proyecto:

```env
# ═══════════════════════════════════════════════════════════════════════════════
# MULTI-CHAIN MICRO ARBITRAGE BOT - CONFIGURACIÓN
# ═══════════════════════════════════════════════════════════════════════════════

# ─────────────────────────────────────────────────────────────────────────────────
# WALLET (¡NUNCA COMPARTAS ESTA CLAVE!)
# ─────────────────────────────────────────────────────────────────────────────────
PRIVATE_KEY=0xTU_CLAVE_PRIVADA_AQUI

# ─────────────────────────────────────────────────────────────────────────────────
# TIMING
# ─────────────────────────────────────────────────────────────────────────────────
TICK_MS=700
DECISION_MS=5000

# ─────────────────────────────────────────────────────────────────────────────────
# TRADING
# ─────────────────────────────────────────────────────────────────────────────────
MIN_PROFIT_USD=0.50
GAS_MULT=1.7
MAX_SLIPPAGE_BPS=10
DEADLINE_SECONDS=20

# ─────────────────────────────────────────────────────────────────────────────────
# CHAINS HABILITADAS
# ─────────────────────────────────────────────────────────────────────────────────
CHAINS=base,arbitrum,optimism,polygon

# ─────────────────────────────────────────────────────────────────────────────────
# BASE RPCs (Alchemy recomendado)
# ─────────────────────────────────────────────────────────────────────────────────
BASE_RPC_READ=https://base-mainnet.g.alchemy.com/v2/TU_API_KEY
BASE_RPC_SIM=https://base-mainnet.g.alchemy.com/v2/TU_API_KEY
BASE_RPC_SEND=https://base-mainnet.g.alchemy.com/v2/TU_API_KEY
BASE_RPC_WS=wss://base-mainnet.g.alchemy.com/v2/TU_API_KEY

# ─────────────────────────────────────────────────────────────────────────────────
# ARBITRUM RPCs
# ─────────────────────────────────────────────────────────────────────────────────
ARB_RPC_READ=https://arb-mainnet.g.alchemy.com/v2/TU_API_KEY
ARB_RPC_SIM=https://arb-mainnet.g.alchemy.com/v2/TU_API_KEY
ARB_RPC_SEND=https://arb-mainnet.g.alchemy.com/v2/TU_API_KEY
ARB_RPC_WS=wss://arb-mainnet.g.alchemy.com/v2/TU_API_KEY

# ─────────────────────────────────────────────────────────────────────────────────
# OPTIMISM RPCs
# ─────────────────────────────────────────────────────────────────────────────────
OP_RPC_READ=https://opt-mainnet.g.alchemy.com/v2/TU_API_KEY
OP_RPC_SIM=https://opt-mainnet.g.alchemy.com/v2/TU_API_KEY
OP_RPC_SEND=https://opt-mainnet.g.alchemy.com/v2/TU_API_KEY
OP_RPC_WS=wss://opt-mainnet.g.alchemy.com/v2/TU_API_KEY

# ─────────────────────────────────────────────────────────────────────────────────
# POLYGON RPCs
# ─────────────────────────────────────────────────────────────────────────────────
POLY_RPC_READ=https://polygon-mainnet.g.alchemy.com/v2/TU_API_KEY
POLY_RPC_SIM=https://polygon-mainnet.g.alchemy.com/v2/TU_API_KEY
POLY_RPC_SEND=https://polygon-mainnet.g.alchemy.com/v2/TU_API_KEY
POLY_RPC_WS=wss://polygon-mainnet.g.alchemy.com/v2/TU_API_KEY

# ─────────────────────────────────────────────────────────────────────────────────
# BLOCK EXPLORER API KEYS (para verificar contratos)
# ─────────────────────────────────────────────────────────────────────────────────
BASESCAN_API_KEY=
ARBISCAN_API_KEY=
OPSCAN_API_KEY=
POLYGONSCAN_API_KEY=

# ─────────────────────────────────────────────────────────────────────────────────
# MODO
# ─────────────────────────────────────────────────────────────────────────────────
DRY_RUN=true
LOG_LEVEL=info
```

---

## ✅ Verificar conexión {#verificar}

Ejecuta este script para verificar que todos los RPCs funcionan:

```bash
npx tsx scripts/verify-rpcs.ts
```

O manualmente:

```javascript
// scripts/verify-rpcs.ts
import { ethers } from "ethers";
import "dotenv/config";

const chains = [
  { name: "Base", rpc: process.env.BASE_RPC_READ, chainId: 8453 },
  { name: "Arbitrum", rpc: process.env.ARB_RPC_READ, chainId: 42161 },
  { name: "Optimism", rpc: process.env.OP_RPC_READ, chainId: 10 },
  { name: "Polygon", rpc: process.env.POLY_RPC_READ, chainId: 137 }
];

async function verify() {
  console.log("🔍 Verificando RPCs...\n");
  
  for (const chain of chains) {
    try {
      const provider = new ethers.JsonRpcProvider(chain.rpc);
      const network = await provider.getNetwork();
      const block = await provider.getBlockNumber();
      
      if (Number(network.chainId) === chain.chainId) {
        console.log(`✅ ${chain.name}: OK (Block #${block})`);
      } else {
        console.log(`❌ ${chain.name}: Chain ID incorrecto`);
      }
    } catch (error: any) {
      console.log(`❌ ${chain.name}: ${error.message}`);
    }
  }
}

verify();
```

---

## 📊 Resumen de pasos

### Para empezar RÁPIDO (RPCs públicos):
1. Copia el bloque de "RPCs Públicos" al `.env`
2. Agrega tu `PRIVATE_KEY`
3. Ejecuta `npm run dev`

### Para PRODUCCIÓN (Alchemy):
1. Crea cuenta en Alchemy
2. Crea 4 apps (una por cadena)
3. Copia los endpoints al `.env`
4. Agrega tu `PRIVATE_KEY`
5. Ejecuta `npm run dev`

---

## ⚠️ Notas importantes

1. **Seguridad**: NUNCA compartas tu `PRIVATE_KEY`
2. **Rate Limits**: Los RPCs públicos tienen límites (~100 req/seg)
3. **Latencia**: Alchemy/Infura tienen ~50ms, públicos ~200ms
4. **Costo**: Alchemy free tier = 300M compute units/mes
5. **WebSocket**: Necesario para actualizaciones en tiempo real

---

## 🆘 Troubleshooting

### Error: "Rate limited"
- Usa RPCs privados (Alchemy/Infura)
- Aumenta `TICK_MS` a 1000+

### Error: "Connection refused"
- Verifica que el RPC esté activo
- Prueba con un RPC alternativo

### Error: "Chain ID mismatch"
- Verifica que usas el RPC correcto para cada cadena
- Base = 8453, Arbitrum = 42161, Optimism = 10, Polygon = 137

---

¡Listo! Con esta guía puedes configurar todos los RPCs necesarios. 🚀



## 📋 Índice
1. [Resumen de lo que necesitas](#resumen)
2. [Crear RPCs en Alchemy](#alchemy)
3. [Crear RPCs en Infura](#infura)
4. [RPCs Públicos (gratuitos)](#publicos)
5. [Configuración del .env](#configuracion)
6. [Verificar conexión](#verificar)

---

## 🎯 Resumen de lo que necesitas {#resumen}

Para cada cadena necesitas **4 tipos de RPC**:

| Tipo | Uso | Prioridad |
|------|-----|-----------|
| `READ` | Leer datos (balances, precios) | Alta |
| `SIM` | Simular transacciones (eth_call) | Alta |
| `SEND` | Enviar transacciones | Crítica |
| `WS` | WebSocket (tiempo real) | Media |

### Cadenas soportadas:
- ✅ **Base** (Chain ID: 8453)
- ✅ **Arbitrum One** (Chain ID: 42161)
- ✅ **Optimism** (Chain ID: 10)
- ✅ **Polygon** (Chain ID: 137)

---

## 🔷 Opción 1: Crear RPCs en Alchemy (RECOMENDADO) {#alchemy}

### Paso 1: Crear cuenta
1. Ve a https://www.alchemy.com/
2. Click en "Get started for free"
3. Registra tu cuenta con email

### Paso 2: Crear Apps para cada cadena

#### Para BASE:
1. Dashboard → Create new app
2. **Name**: `MultiChain-Arb-Base`
3. **Chain**: Base
4. **Network**: Base Mainnet
5. Click "Create app"
6. Copia el **HTTPS** y **WSS** endpoint

#### Para ARBITRUM:
1. Dashboard → Create new app
2. **Name**: `MultiChain-Arb-Arbitrum`
3. **Chain**: Arbitrum
4. **Network**: Arbitrum Mainnet
5. Click "Create app"
6. Copia el **HTTPS** y **WSS** endpoint

#### Para OPTIMISM:
1. Dashboard → Create new app
2. **Name**: `MultiChain-Arb-Optimism`
3. **Chain**: Optimism
4. **Network**: Optimism Mainnet
5. Click "Create app"
6. Copia el **HTTPS** y **WSS** endpoint

#### Para POLYGON:
1. Dashboard → Create new app
2. **Name**: `MultiChain-Arb-Polygon`
3. **Chain**: Polygon
4. **Network**: Polygon Mainnet
5. Click "Create app"
6. Copia el **HTTPS** y **WSS** endpoint

### Formato de URLs Alchemy:
```
HTTPS: https://{chain}-mainnet.g.alchemy.com/v2/{API_KEY}
WSS:   wss://{chain}-mainnet.g.alchemy.com/v2/{API_KEY}
```

### Ejemplo real:
```env
# Base
BASE_RPC_READ=https://base-mainnet.g.alchemy.com/v2/abc123xyz
BASE_RPC_SIM=https://base-mainnet.g.alchemy.com/v2/abc123xyz
BASE_RPC_SEND=https://base-mainnet.g.alchemy.com/v2/abc123xyz
BASE_RPC_WS=wss://base-mainnet.g.alchemy.com/v2/abc123xyz

# Arbitrum
ARB_RPC_READ=https://arb-mainnet.g.alchemy.com/v2/def456uvw
ARB_RPC_SIM=https://arb-mainnet.g.alchemy.com/v2/def456uvw
ARB_RPC_SEND=https://arb-mainnet.g.alchemy.com/v2/def456uvw
ARB_RPC_WS=wss://arb-mainnet.g.alchemy.com/v2/def456uvw

# Optimism
OP_RPC_READ=https://opt-mainnet.g.alchemy.com/v2/ghi789rst
OP_RPC_SIM=https://opt-mainnet.g.alchemy.com/v2/ghi789rst
OP_RPC_SEND=https://opt-mainnet.g.alchemy.com/v2/ghi789rst
OP_RPC_WS=wss://opt-mainnet.g.alchemy.com/v2/ghi789rst

# Polygon
POLY_RPC_READ=https://polygon-mainnet.g.alchemy.com/v2/jkl012mno
POLY_RPC_SIM=https://polygon-mainnet.g.alchemy.com/v2/jkl012mno
POLY_RPC_SEND=https://polygon-mainnet.g.alchemy.com/v2/jkl012mno
POLY_RPC_WS=wss://polygon-mainnet.g.alchemy.com/v2/jkl012mno
```

### Plan gratuito de Alchemy:
- ✅ 300M compute units/mes
- ✅ Suficiente para ~10,000 operaciones/día
- ✅ WebSocket incluido

---

## 🔶 Opción 2: Crear RPCs en Infura {#infura}

### Paso 1: Crear cuenta
1. Ve a https://www.infura.io/
2. Click en "Sign Up"
3. Registra tu cuenta

### Paso 2: Crear proyecto
1. Dashboard → Create new API key
2. **Name**: `MultiChain-Arb`
3. Selecciona las redes:
   - ✅ Arbitrum
   - ✅ Optimism
   - ✅ Polygon
   - ❌ Base (no soportado en Infura)

### Formato de URLs Infura:
```
HTTPS: https://{network}.infura.io/v3/{PROJECT_ID}
WSS:   wss://{network}.infura.io/ws/v3/{PROJECT_ID}
```

### Ejemplo:
```env
# Arbitrum (Infura)
ARB_RPC_READ=https://arbitrum-mainnet.infura.io/v3/abc123
ARB_RPC_WS=wss://arbitrum-mainnet.infura.io/ws/v3/abc123

# Optimism (Infura)
OP_RPC_READ=https://optimism-mainnet.infura.io/v3/abc123
OP_RPC_WS=wss://optimism-mainnet.infura.io/ws/v3/abc123

# Polygon (Infura)
POLY_RPC_READ=https://polygon-mainnet.infura.io/v3/abc123
POLY_RPC_WS=wss://polygon-mainnet.infura.io/ws/v3/abc123
```

---

## 🆓 Opción 3: RPCs Públicos (Gratuitos) {#publicos}

⚠️ **Advertencia**: Los RPCs públicos tienen límites de rate y pueden ser lentos.
Solo usar para pruebas, NO para producción.

```env
# ═══════════════════════════════════════════════════════════════════════════════
# BASE - RPCs Públicos
# ═══════════════════════════════════════════════════════════════════════════════
BASE_RPC_READ=https://mainnet.base.org
BASE_RPC_SIM=https://mainnet.base.org
BASE_RPC_SEND=https://mainnet.base.org
BASE_RPC_WS=wss://base-mainnet.publicnode.com

# ═══════════════════════════════════════════════════════════════════════════════
# ARBITRUM - RPCs Públicos
# ═══════════════════════════════════════════════════════════════════════════════
ARB_RPC_READ=https://arb1.arbitrum.io/rpc
ARB_RPC_SIM=https://arb1.arbitrum.io/rpc
ARB_RPC_SEND=https://arb1.arbitrum.io/rpc
ARB_RPC_WS=wss://arbitrum-one.publicnode.com

# ═══════════════════════════════════════════════════════════════════════════════
# OPTIMISM - RPCs Públicos
# ═══════════════════════════════════════════════════════════════════════════════
OP_RPC_READ=https://mainnet.optimism.io
OP_RPC_SIM=https://mainnet.optimism.io
OP_RPC_SEND=https://mainnet.optimism.io
OP_RPC_WS=wss://optimism.publicnode.com

# ═══════════════════════════════════════════════════════════════════════════════
# POLYGON - RPCs Públicos
# ═══════════════════════════════════════════════════════════════════════════════
POLY_RPC_READ=https://polygon-rpc.com
POLY_RPC_SIM=https://polygon-rpc.com
POLY_RPC_SEND=https://polygon-rpc.com
POLY_RPC_WS=wss://polygon-bor.publicnode.com
```

### Otros RPCs públicos alternativos:

| Cadena | RPC Alternativo |
|--------|-----------------|
| Base | `https://base.llamarpc.com` |
| Arbitrum | `https://arbitrum.llamarpc.com` |
| Optimism | `https://optimism.llamarpc.com` |
| Polygon | `https://polygon.llamarpc.com` |

---

## ⚙️ Configuración del .env {#configuracion}

Crea el archivo `.env` en la raíz del proyecto:

```env
# ═══════════════════════════════════════════════════════════════════════════════
# MULTI-CHAIN MICRO ARBITRAGE BOT - CONFIGURACIÓN
# ═══════════════════════════════════════════════════════════════════════════════

# ─────────────────────────────────────────────────────────────────────────────────
# WALLET (¡NUNCA COMPARTAS ESTA CLAVE!)
# ─────────────────────────────────────────────────────────────────────────────────
PRIVATE_KEY=0xTU_CLAVE_PRIVADA_AQUI

# ─────────────────────────────────────────────────────────────────────────────────
# TIMING
# ─────────────────────────────────────────────────────────────────────────────────
TICK_MS=700
DECISION_MS=5000

# ─────────────────────────────────────────────────────────────────────────────────
# TRADING
# ─────────────────────────────────────────────────────────────────────────────────
MIN_PROFIT_USD=0.50
GAS_MULT=1.7
MAX_SLIPPAGE_BPS=10
DEADLINE_SECONDS=20

# ─────────────────────────────────────────────────────────────────────────────────
# CHAINS HABILITADAS
# ─────────────────────────────────────────────────────────────────────────────────
CHAINS=base,arbitrum,optimism,polygon

# ─────────────────────────────────────────────────────────────────────────────────
# BASE RPCs (Alchemy recomendado)
# ─────────────────────────────────────────────────────────────────────────────────
BASE_RPC_READ=https://base-mainnet.g.alchemy.com/v2/TU_API_KEY
BASE_RPC_SIM=https://base-mainnet.g.alchemy.com/v2/TU_API_KEY
BASE_RPC_SEND=https://base-mainnet.g.alchemy.com/v2/TU_API_KEY
BASE_RPC_WS=wss://base-mainnet.g.alchemy.com/v2/TU_API_KEY

# ─────────────────────────────────────────────────────────────────────────────────
# ARBITRUM RPCs
# ─────────────────────────────────────────────────────────────────────────────────
ARB_RPC_READ=https://arb-mainnet.g.alchemy.com/v2/TU_API_KEY
ARB_RPC_SIM=https://arb-mainnet.g.alchemy.com/v2/TU_API_KEY
ARB_RPC_SEND=https://arb-mainnet.g.alchemy.com/v2/TU_API_KEY
ARB_RPC_WS=wss://arb-mainnet.g.alchemy.com/v2/TU_API_KEY

# ─────────────────────────────────────────────────────────────────────────────────
# OPTIMISM RPCs
# ─────────────────────────────────────────────────────────────────────────────────
OP_RPC_READ=https://opt-mainnet.g.alchemy.com/v2/TU_API_KEY
OP_RPC_SIM=https://opt-mainnet.g.alchemy.com/v2/TU_API_KEY
OP_RPC_SEND=https://opt-mainnet.g.alchemy.com/v2/TU_API_KEY
OP_RPC_WS=wss://opt-mainnet.g.alchemy.com/v2/TU_API_KEY

# ─────────────────────────────────────────────────────────────────────────────────
# POLYGON RPCs
# ─────────────────────────────────────────────────────────────────────────────────
POLY_RPC_READ=https://polygon-mainnet.g.alchemy.com/v2/TU_API_KEY
POLY_RPC_SIM=https://polygon-mainnet.g.alchemy.com/v2/TU_API_KEY
POLY_RPC_SEND=https://polygon-mainnet.g.alchemy.com/v2/TU_API_KEY
POLY_RPC_WS=wss://polygon-mainnet.g.alchemy.com/v2/TU_API_KEY

# ─────────────────────────────────────────────────────────────────────────────────
# BLOCK EXPLORER API KEYS (para verificar contratos)
# ─────────────────────────────────────────────────────────────────────────────────
BASESCAN_API_KEY=
ARBISCAN_API_KEY=
OPSCAN_API_KEY=
POLYGONSCAN_API_KEY=

# ─────────────────────────────────────────────────────────────────────────────────
# MODO
# ─────────────────────────────────────────────────────────────────────────────────
DRY_RUN=true
LOG_LEVEL=info
```

---

## ✅ Verificar conexión {#verificar}

Ejecuta este script para verificar que todos los RPCs funcionan:

```bash
npx tsx scripts/verify-rpcs.ts
```

O manualmente:

```javascript
// scripts/verify-rpcs.ts
import { ethers } from "ethers";
import "dotenv/config";

const chains = [
  { name: "Base", rpc: process.env.BASE_RPC_READ, chainId: 8453 },
  { name: "Arbitrum", rpc: process.env.ARB_RPC_READ, chainId: 42161 },
  { name: "Optimism", rpc: process.env.OP_RPC_READ, chainId: 10 },
  { name: "Polygon", rpc: process.env.POLY_RPC_READ, chainId: 137 }
];

async function verify() {
  console.log("🔍 Verificando RPCs...\n");
  
  for (const chain of chains) {
    try {
      const provider = new ethers.JsonRpcProvider(chain.rpc);
      const network = await provider.getNetwork();
      const block = await provider.getBlockNumber();
      
      if (Number(network.chainId) === chain.chainId) {
        console.log(`✅ ${chain.name}: OK (Block #${block})`);
      } else {
        console.log(`❌ ${chain.name}: Chain ID incorrecto`);
      }
    } catch (error: any) {
      console.log(`❌ ${chain.name}: ${error.message}`);
    }
  }
}

verify();
```

---

## 📊 Resumen de pasos

### Para empezar RÁPIDO (RPCs públicos):
1. Copia el bloque de "RPCs Públicos" al `.env`
2. Agrega tu `PRIVATE_KEY`
3. Ejecuta `npm run dev`

### Para PRODUCCIÓN (Alchemy):
1. Crea cuenta en Alchemy
2. Crea 4 apps (una por cadena)
3. Copia los endpoints al `.env`
4. Agrega tu `PRIVATE_KEY`
5. Ejecuta `npm run dev`

---

## ⚠️ Notas importantes

1. **Seguridad**: NUNCA compartas tu `PRIVATE_KEY`
2. **Rate Limits**: Los RPCs públicos tienen límites (~100 req/seg)
3. **Latencia**: Alchemy/Infura tienen ~50ms, públicos ~200ms
4. **Costo**: Alchemy free tier = 300M compute units/mes
5. **WebSocket**: Necesario para actualizaciones en tiempo real

---

## 🆘 Troubleshooting

### Error: "Rate limited"
- Usa RPCs privados (Alchemy/Infura)
- Aumenta `TICK_MS` a 1000+

### Error: "Connection refused"
- Verifica que el RPC esté activo
- Prueba con un RPC alternativo

### Error: "Chain ID mismatch"
- Verifica que usas el RPC correcto para cada cadena
- Base = 8453, Arbitrum = 42161, Optimism = 10, Polygon = 137

---

¡Listo! Con esta guía puedes configurar todos los RPCs necesarios. 🚀



## 📋 Índice
1. [Resumen de lo que necesitas](#resumen)
2. [Crear RPCs en Alchemy](#alchemy)
3. [Crear RPCs en Infura](#infura)
4. [RPCs Públicos (gratuitos)](#publicos)
5. [Configuración del .env](#configuracion)
6. [Verificar conexión](#verificar)

---

## 🎯 Resumen de lo que necesitas {#resumen}

Para cada cadena necesitas **4 tipos de RPC**:

| Tipo | Uso | Prioridad |
|------|-----|-----------|
| `READ` | Leer datos (balances, precios) | Alta |
| `SIM` | Simular transacciones (eth_call) | Alta |
| `SEND` | Enviar transacciones | Crítica |
| `WS` | WebSocket (tiempo real) | Media |

### Cadenas soportadas:
- ✅ **Base** (Chain ID: 8453)
- ✅ **Arbitrum One** (Chain ID: 42161)
- ✅ **Optimism** (Chain ID: 10)
- ✅ **Polygon** (Chain ID: 137)

---

## 🔷 Opción 1: Crear RPCs en Alchemy (RECOMENDADO) {#alchemy}

### Paso 1: Crear cuenta
1. Ve a https://www.alchemy.com/
2. Click en "Get started for free"
3. Registra tu cuenta con email

### Paso 2: Crear Apps para cada cadena

#### Para BASE:
1. Dashboard → Create new app
2. **Name**: `MultiChain-Arb-Base`
3. **Chain**: Base
4. **Network**: Base Mainnet
5. Click "Create app"
6. Copia el **HTTPS** y **WSS** endpoint

#### Para ARBITRUM:
1. Dashboard → Create new app
2. **Name**: `MultiChain-Arb-Arbitrum`
3. **Chain**: Arbitrum
4. **Network**: Arbitrum Mainnet
5. Click "Create app"
6. Copia el **HTTPS** y **WSS** endpoint

#### Para OPTIMISM:
1. Dashboard → Create new app
2. **Name**: `MultiChain-Arb-Optimism`
3. **Chain**: Optimism
4. **Network**: Optimism Mainnet
5. Click "Create app"
6. Copia el **HTTPS** y **WSS** endpoint

#### Para POLYGON:
1. Dashboard → Create new app
2. **Name**: `MultiChain-Arb-Polygon`
3. **Chain**: Polygon
4. **Network**: Polygon Mainnet
5. Click "Create app"
6. Copia el **HTTPS** y **WSS** endpoint

### Formato de URLs Alchemy:
```
HTTPS: https://{chain}-mainnet.g.alchemy.com/v2/{API_KEY}
WSS:   wss://{chain}-mainnet.g.alchemy.com/v2/{API_KEY}
```

### Ejemplo real:
```env
# Base
BASE_RPC_READ=https://base-mainnet.g.alchemy.com/v2/abc123xyz
BASE_RPC_SIM=https://base-mainnet.g.alchemy.com/v2/abc123xyz
BASE_RPC_SEND=https://base-mainnet.g.alchemy.com/v2/abc123xyz
BASE_RPC_WS=wss://base-mainnet.g.alchemy.com/v2/abc123xyz

# Arbitrum
ARB_RPC_READ=https://arb-mainnet.g.alchemy.com/v2/def456uvw
ARB_RPC_SIM=https://arb-mainnet.g.alchemy.com/v2/def456uvw
ARB_RPC_SEND=https://arb-mainnet.g.alchemy.com/v2/def456uvw
ARB_RPC_WS=wss://arb-mainnet.g.alchemy.com/v2/def456uvw

# Optimism
OP_RPC_READ=https://opt-mainnet.g.alchemy.com/v2/ghi789rst
OP_RPC_SIM=https://opt-mainnet.g.alchemy.com/v2/ghi789rst
OP_RPC_SEND=https://opt-mainnet.g.alchemy.com/v2/ghi789rst
OP_RPC_WS=wss://opt-mainnet.g.alchemy.com/v2/ghi789rst

# Polygon
POLY_RPC_READ=https://polygon-mainnet.g.alchemy.com/v2/jkl012mno
POLY_RPC_SIM=https://polygon-mainnet.g.alchemy.com/v2/jkl012mno
POLY_RPC_SEND=https://polygon-mainnet.g.alchemy.com/v2/jkl012mno
POLY_RPC_WS=wss://polygon-mainnet.g.alchemy.com/v2/jkl012mno
```

### Plan gratuito de Alchemy:
- ✅ 300M compute units/mes
- ✅ Suficiente para ~10,000 operaciones/día
- ✅ WebSocket incluido

---

## 🔶 Opción 2: Crear RPCs en Infura {#infura}

### Paso 1: Crear cuenta
1. Ve a https://www.infura.io/
2. Click en "Sign Up"
3. Registra tu cuenta

### Paso 2: Crear proyecto
1. Dashboard → Create new API key
2. **Name**: `MultiChain-Arb`
3. Selecciona las redes:
   - ✅ Arbitrum
   - ✅ Optimism
   - ✅ Polygon
   - ❌ Base (no soportado en Infura)

### Formato de URLs Infura:
```
HTTPS: https://{network}.infura.io/v3/{PROJECT_ID}
WSS:   wss://{network}.infura.io/ws/v3/{PROJECT_ID}
```

### Ejemplo:
```env
# Arbitrum (Infura)
ARB_RPC_READ=https://arbitrum-mainnet.infura.io/v3/abc123
ARB_RPC_WS=wss://arbitrum-mainnet.infura.io/ws/v3/abc123

# Optimism (Infura)
OP_RPC_READ=https://optimism-mainnet.infura.io/v3/abc123
OP_RPC_WS=wss://optimism-mainnet.infura.io/ws/v3/abc123

# Polygon (Infura)
POLY_RPC_READ=https://polygon-mainnet.infura.io/v3/abc123
POLY_RPC_WS=wss://polygon-mainnet.infura.io/ws/v3/abc123
```

---

## 🆓 Opción 3: RPCs Públicos (Gratuitos) {#publicos}

⚠️ **Advertencia**: Los RPCs públicos tienen límites de rate y pueden ser lentos.
Solo usar para pruebas, NO para producción.

```env
# ═══════════════════════════════════════════════════════════════════════════════
# BASE - RPCs Públicos
# ═══════════════════════════════════════════════════════════════════════════════
BASE_RPC_READ=https://mainnet.base.org
BASE_RPC_SIM=https://mainnet.base.org
BASE_RPC_SEND=https://mainnet.base.org
BASE_RPC_WS=wss://base-mainnet.publicnode.com

# ═══════════════════════════════════════════════════════════════════════════════
# ARBITRUM - RPCs Públicos
# ═══════════════════════════════════════════════════════════════════════════════
ARB_RPC_READ=https://arb1.arbitrum.io/rpc
ARB_RPC_SIM=https://arb1.arbitrum.io/rpc
ARB_RPC_SEND=https://arb1.arbitrum.io/rpc
ARB_RPC_WS=wss://arbitrum-one.publicnode.com

# ═══════════════════════════════════════════════════════════════════════════════
# OPTIMISM - RPCs Públicos
# ═══════════════════════════════════════════════════════════════════════════════
OP_RPC_READ=https://mainnet.optimism.io
OP_RPC_SIM=https://mainnet.optimism.io
OP_RPC_SEND=https://mainnet.optimism.io
OP_RPC_WS=wss://optimism.publicnode.com

# ═══════════════════════════════════════════════════════════════════════════════
# POLYGON - RPCs Públicos
# ═══════════════════════════════════════════════════════════════════════════════
POLY_RPC_READ=https://polygon-rpc.com
POLY_RPC_SIM=https://polygon-rpc.com
POLY_RPC_SEND=https://polygon-rpc.com
POLY_RPC_WS=wss://polygon-bor.publicnode.com
```

### Otros RPCs públicos alternativos:

| Cadena | RPC Alternativo |
|--------|-----------------|
| Base | `https://base.llamarpc.com` |
| Arbitrum | `https://arbitrum.llamarpc.com` |
| Optimism | `https://optimism.llamarpc.com` |
| Polygon | `https://polygon.llamarpc.com` |

---

## ⚙️ Configuración del .env {#configuracion}

Crea el archivo `.env` en la raíz del proyecto:

```env
# ═══════════════════════════════════════════════════════════════════════════════
# MULTI-CHAIN MICRO ARBITRAGE BOT - CONFIGURACIÓN
# ═══════════════════════════════════════════════════════════════════════════════

# ─────────────────────────────────────────────────────────────────────────────────
# WALLET (¡NUNCA COMPARTAS ESTA CLAVE!)
# ─────────────────────────────────────────────────────────────────────────────────
PRIVATE_KEY=0xTU_CLAVE_PRIVADA_AQUI

# ─────────────────────────────────────────────────────────────────────────────────
# TIMING
# ─────────────────────────────────────────────────────────────────────────────────
TICK_MS=700
DECISION_MS=5000

# ─────────────────────────────────────────────────────────────────────────────────
# TRADING
# ─────────────────────────────────────────────────────────────────────────────────
MIN_PROFIT_USD=0.50
GAS_MULT=1.7
MAX_SLIPPAGE_BPS=10
DEADLINE_SECONDS=20

# ─────────────────────────────────────────────────────────────────────────────────
# CHAINS HABILITADAS
# ─────────────────────────────────────────────────────────────────────────────────
CHAINS=base,arbitrum,optimism,polygon

# ─────────────────────────────────────────────────────────────────────────────────
# BASE RPCs (Alchemy recomendado)
# ─────────────────────────────────────────────────────────────────────────────────
BASE_RPC_READ=https://base-mainnet.g.alchemy.com/v2/TU_API_KEY
BASE_RPC_SIM=https://base-mainnet.g.alchemy.com/v2/TU_API_KEY
BASE_RPC_SEND=https://base-mainnet.g.alchemy.com/v2/TU_API_KEY
BASE_RPC_WS=wss://base-mainnet.g.alchemy.com/v2/TU_API_KEY

# ─────────────────────────────────────────────────────────────────────────────────
# ARBITRUM RPCs
# ─────────────────────────────────────────────────────────────────────────────────
ARB_RPC_READ=https://arb-mainnet.g.alchemy.com/v2/TU_API_KEY
ARB_RPC_SIM=https://arb-mainnet.g.alchemy.com/v2/TU_API_KEY
ARB_RPC_SEND=https://arb-mainnet.g.alchemy.com/v2/TU_API_KEY
ARB_RPC_WS=wss://arb-mainnet.g.alchemy.com/v2/TU_API_KEY

# ─────────────────────────────────────────────────────────────────────────────────
# OPTIMISM RPCs
# ─────────────────────────────────────────────────────────────────────────────────
OP_RPC_READ=https://opt-mainnet.g.alchemy.com/v2/TU_API_KEY
OP_RPC_SIM=https://opt-mainnet.g.alchemy.com/v2/TU_API_KEY
OP_RPC_SEND=https://opt-mainnet.g.alchemy.com/v2/TU_API_KEY
OP_RPC_WS=wss://opt-mainnet.g.alchemy.com/v2/TU_API_KEY

# ─────────────────────────────────────────────────────────────────────────────────
# POLYGON RPCs
# ─────────────────────────────────────────────────────────────────────────────────
POLY_RPC_READ=https://polygon-mainnet.g.alchemy.com/v2/TU_API_KEY
POLY_RPC_SIM=https://polygon-mainnet.g.alchemy.com/v2/TU_API_KEY
POLY_RPC_SEND=https://polygon-mainnet.g.alchemy.com/v2/TU_API_KEY
POLY_RPC_WS=wss://polygon-mainnet.g.alchemy.com/v2/TU_API_KEY

# ─────────────────────────────────────────────────────────────────────────────────
# BLOCK EXPLORER API KEYS (para verificar contratos)
# ─────────────────────────────────────────────────────────────────────────────────
BASESCAN_API_KEY=
ARBISCAN_API_KEY=
OPSCAN_API_KEY=
POLYGONSCAN_API_KEY=

# ─────────────────────────────────────────────────────────────────────────────────
# MODO
# ─────────────────────────────────────────────────────────────────────────────────
DRY_RUN=true
LOG_LEVEL=info
```

---

## ✅ Verificar conexión {#verificar}

Ejecuta este script para verificar que todos los RPCs funcionan:

```bash
npx tsx scripts/verify-rpcs.ts
```

O manualmente:

```javascript
// scripts/verify-rpcs.ts
import { ethers } from "ethers";
import "dotenv/config";

const chains = [
  { name: "Base", rpc: process.env.BASE_RPC_READ, chainId: 8453 },
  { name: "Arbitrum", rpc: process.env.ARB_RPC_READ, chainId: 42161 },
  { name: "Optimism", rpc: process.env.OP_RPC_READ, chainId: 10 },
  { name: "Polygon", rpc: process.env.POLY_RPC_READ, chainId: 137 }
];

async function verify() {
  console.log("🔍 Verificando RPCs...\n");
  
  for (const chain of chains) {
    try {
      const provider = new ethers.JsonRpcProvider(chain.rpc);
      const network = await provider.getNetwork();
      const block = await provider.getBlockNumber();
      
      if (Number(network.chainId) === chain.chainId) {
        console.log(`✅ ${chain.name}: OK (Block #${block})`);
      } else {
        console.log(`❌ ${chain.name}: Chain ID incorrecto`);
      }
    } catch (error: any) {
      console.log(`❌ ${chain.name}: ${error.message}`);
    }
  }
}

verify();
```

---

## 📊 Resumen de pasos

### Para empezar RÁPIDO (RPCs públicos):
1. Copia el bloque de "RPCs Públicos" al `.env`
2. Agrega tu `PRIVATE_KEY`
3. Ejecuta `npm run dev`

### Para PRODUCCIÓN (Alchemy):
1. Crea cuenta en Alchemy
2. Crea 4 apps (una por cadena)
3. Copia los endpoints al `.env`
4. Agrega tu `PRIVATE_KEY`
5. Ejecuta `npm run dev`

---

## ⚠️ Notas importantes

1. **Seguridad**: NUNCA compartas tu `PRIVATE_KEY`
2. **Rate Limits**: Los RPCs públicos tienen límites (~100 req/seg)
3. **Latencia**: Alchemy/Infura tienen ~50ms, públicos ~200ms
4. **Costo**: Alchemy free tier = 300M compute units/mes
5. **WebSocket**: Necesario para actualizaciones en tiempo real

---

## 🆘 Troubleshooting

### Error: "Rate limited"
- Usa RPCs privados (Alchemy/Infura)
- Aumenta `TICK_MS` a 1000+

### Error: "Connection refused"
- Verifica que el RPC esté activo
- Prueba con un RPC alternativo

### Error: "Chain ID mismatch"
- Verifica que usas el RPC correcto para cada cadena
- Base = 8453, Arbitrum = 42161, Optimism = 10, Polygon = 137

---

¡Listo! Con esta guía puedes configurar todos los RPCs necesarios. 🚀



## 📋 Índice
1. [Resumen de lo que necesitas](#resumen)
2. [Crear RPCs en Alchemy](#alchemy)
3. [Crear RPCs en Infura](#infura)
4. [RPCs Públicos (gratuitos)](#publicos)
5. [Configuración del .env](#configuracion)
6. [Verificar conexión](#verificar)

---

## 🎯 Resumen de lo que necesitas {#resumen}

Para cada cadena necesitas **4 tipos de RPC**:

| Tipo | Uso | Prioridad |
|------|-----|-----------|
| `READ` | Leer datos (balances, precios) | Alta |
| `SIM` | Simular transacciones (eth_call) | Alta |
| `SEND` | Enviar transacciones | Crítica |
| `WS` | WebSocket (tiempo real) | Media |

### Cadenas soportadas:
- ✅ **Base** (Chain ID: 8453)
- ✅ **Arbitrum One** (Chain ID: 42161)
- ✅ **Optimism** (Chain ID: 10)
- ✅ **Polygon** (Chain ID: 137)

---

## 🔷 Opción 1: Crear RPCs en Alchemy (RECOMENDADO) {#alchemy}

### Paso 1: Crear cuenta
1. Ve a https://www.alchemy.com/
2. Click en "Get started for free"
3. Registra tu cuenta con email

### Paso 2: Crear Apps para cada cadena

#### Para BASE:
1. Dashboard → Create new app
2. **Name**: `MultiChain-Arb-Base`
3. **Chain**: Base
4. **Network**: Base Mainnet
5. Click "Create app"
6. Copia el **HTTPS** y **WSS** endpoint

#### Para ARBITRUM:
1. Dashboard → Create new app
2. **Name**: `MultiChain-Arb-Arbitrum`
3. **Chain**: Arbitrum
4. **Network**: Arbitrum Mainnet
5. Click "Create app"
6. Copia el **HTTPS** y **WSS** endpoint

#### Para OPTIMISM:
1. Dashboard → Create new app
2. **Name**: `MultiChain-Arb-Optimism`
3. **Chain**: Optimism
4. **Network**: Optimism Mainnet
5. Click "Create app"
6. Copia el **HTTPS** y **WSS** endpoint

#### Para POLYGON:
1. Dashboard → Create new app
2. **Name**: `MultiChain-Arb-Polygon`
3. **Chain**: Polygon
4. **Network**: Polygon Mainnet
5. Click "Create app"
6. Copia el **HTTPS** y **WSS** endpoint

### Formato de URLs Alchemy:
```
HTTPS: https://{chain}-mainnet.g.alchemy.com/v2/{API_KEY}
WSS:   wss://{chain}-mainnet.g.alchemy.com/v2/{API_KEY}
```

### Ejemplo real:
```env
# Base
BASE_RPC_READ=https://base-mainnet.g.alchemy.com/v2/abc123xyz
BASE_RPC_SIM=https://base-mainnet.g.alchemy.com/v2/abc123xyz
BASE_RPC_SEND=https://base-mainnet.g.alchemy.com/v2/abc123xyz
BASE_RPC_WS=wss://base-mainnet.g.alchemy.com/v2/abc123xyz

# Arbitrum
ARB_RPC_READ=https://arb-mainnet.g.alchemy.com/v2/def456uvw
ARB_RPC_SIM=https://arb-mainnet.g.alchemy.com/v2/def456uvw
ARB_RPC_SEND=https://arb-mainnet.g.alchemy.com/v2/def456uvw
ARB_RPC_WS=wss://arb-mainnet.g.alchemy.com/v2/def456uvw

# Optimism
OP_RPC_READ=https://opt-mainnet.g.alchemy.com/v2/ghi789rst
OP_RPC_SIM=https://opt-mainnet.g.alchemy.com/v2/ghi789rst
OP_RPC_SEND=https://opt-mainnet.g.alchemy.com/v2/ghi789rst
OP_RPC_WS=wss://opt-mainnet.g.alchemy.com/v2/ghi789rst

# Polygon
POLY_RPC_READ=https://polygon-mainnet.g.alchemy.com/v2/jkl012mno
POLY_RPC_SIM=https://polygon-mainnet.g.alchemy.com/v2/jkl012mno
POLY_RPC_SEND=https://polygon-mainnet.g.alchemy.com/v2/jkl012mno
POLY_RPC_WS=wss://polygon-mainnet.g.alchemy.com/v2/jkl012mno
```

### Plan gratuito de Alchemy:
- ✅ 300M compute units/mes
- ✅ Suficiente para ~10,000 operaciones/día
- ✅ WebSocket incluido

---

## 🔶 Opción 2: Crear RPCs en Infura {#infura}

### Paso 1: Crear cuenta
1. Ve a https://www.infura.io/
2. Click en "Sign Up"
3. Registra tu cuenta

### Paso 2: Crear proyecto
1. Dashboard → Create new API key
2. **Name**: `MultiChain-Arb`
3. Selecciona las redes:
   - ✅ Arbitrum
   - ✅ Optimism
   - ✅ Polygon
   - ❌ Base (no soportado en Infura)

### Formato de URLs Infura:
```
HTTPS: https://{network}.infura.io/v3/{PROJECT_ID}
WSS:   wss://{network}.infura.io/ws/v3/{PROJECT_ID}
```

### Ejemplo:
```env
# Arbitrum (Infura)
ARB_RPC_READ=https://arbitrum-mainnet.infura.io/v3/abc123
ARB_RPC_WS=wss://arbitrum-mainnet.infura.io/ws/v3/abc123

# Optimism (Infura)
OP_RPC_READ=https://optimism-mainnet.infura.io/v3/abc123
OP_RPC_WS=wss://optimism-mainnet.infura.io/ws/v3/abc123

# Polygon (Infura)
POLY_RPC_READ=https://polygon-mainnet.infura.io/v3/abc123
POLY_RPC_WS=wss://polygon-mainnet.infura.io/ws/v3/abc123
```

---

## 🆓 Opción 3: RPCs Públicos (Gratuitos) {#publicos}

⚠️ **Advertencia**: Los RPCs públicos tienen límites de rate y pueden ser lentos.
Solo usar para pruebas, NO para producción.

```env
# ═══════════════════════════════════════════════════════════════════════════════
# BASE - RPCs Públicos
# ═══════════════════════════════════════════════════════════════════════════════
BASE_RPC_READ=https://mainnet.base.org
BASE_RPC_SIM=https://mainnet.base.org
BASE_RPC_SEND=https://mainnet.base.org
BASE_RPC_WS=wss://base-mainnet.publicnode.com

# ═══════════════════════════════════════════════════════════════════════════════
# ARBITRUM - RPCs Públicos
# ═══════════════════════════════════════════════════════════════════════════════
ARB_RPC_READ=https://arb1.arbitrum.io/rpc
ARB_RPC_SIM=https://arb1.arbitrum.io/rpc
ARB_RPC_SEND=https://arb1.arbitrum.io/rpc
ARB_RPC_WS=wss://arbitrum-one.publicnode.com

# ═══════════════════════════════════════════════════════════════════════════════
# OPTIMISM - RPCs Públicos
# ═══════════════════════════════════════════════════════════════════════════════
OP_RPC_READ=https://mainnet.optimism.io
OP_RPC_SIM=https://mainnet.optimism.io
OP_RPC_SEND=https://mainnet.optimism.io
OP_RPC_WS=wss://optimism.publicnode.com

# ═══════════════════════════════════════════════════════════════════════════════
# POLYGON - RPCs Públicos
# ═══════════════════════════════════════════════════════════════════════════════
POLY_RPC_READ=https://polygon-rpc.com
POLY_RPC_SIM=https://polygon-rpc.com
POLY_RPC_SEND=https://polygon-rpc.com
POLY_RPC_WS=wss://polygon-bor.publicnode.com
```

### Otros RPCs públicos alternativos:

| Cadena | RPC Alternativo |
|--------|-----------------|
| Base | `https://base.llamarpc.com` |
| Arbitrum | `https://arbitrum.llamarpc.com` |
| Optimism | `https://optimism.llamarpc.com` |
| Polygon | `https://polygon.llamarpc.com` |

---

## ⚙️ Configuración del .env {#configuracion}

Crea el archivo `.env` en la raíz del proyecto:

```env
# ═══════════════════════════════════════════════════════════════════════════════
# MULTI-CHAIN MICRO ARBITRAGE BOT - CONFIGURACIÓN
# ═══════════════════════════════════════════════════════════════════════════════

# ─────────────────────────────────────────────────────────────────────────────────
# WALLET (¡NUNCA COMPARTAS ESTA CLAVE!)
# ─────────────────────────────────────────────────────────────────────────────────
PRIVATE_KEY=0xTU_CLAVE_PRIVADA_AQUI

# ─────────────────────────────────────────────────────────────────────────────────
# TIMING
# ─────────────────────────────────────────────────────────────────────────────────
TICK_MS=700
DECISION_MS=5000

# ─────────────────────────────────────────────────────────────────────────────────
# TRADING
# ─────────────────────────────────────────────────────────────────────────────────
MIN_PROFIT_USD=0.50
GAS_MULT=1.7
MAX_SLIPPAGE_BPS=10
DEADLINE_SECONDS=20

# ─────────────────────────────────────────────────────────────────────────────────
# CHAINS HABILITADAS
# ─────────────────────────────────────────────────────────────────────────────────
CHAINS=base,arbitrum,optimism,polygon

# ─────────────────────────────────────────────────────────────────────────────────
# BASE RPCs (Alchemy recomendado)
# ─────────────────────────────────────────────────────────────────────────────────
BASE_RPC_READ=https://base-mainnet.g.alchemy.com/v2/TU_API_KEY
BASE_RPC_SIM=https://base-mainnet.g.alchemy.com/v2/TU_API_KEY
BASE_RPC_SEND=https://base-mainnet.g.alchemy.com/v2/TU_API_KEY
BASE_RPC_WS=wss://base-mainnet.g.alchemy.com/v2/TU_API_KEY

# ─────────────────────────────────────────────────────────────────────────────────
# ARBITRUM RPCs
# ─────────────────────────────────────────────────────────────────────────────────
ARB_RPC_READ=https://arb-mainnet.g.alchemy.com/v2/TU_API_KEY
ARB_RPC_SIM=https://arb-mainnet.g.alchemy.com/v2/TU_API_KEY
ARB_RPC_SEND=https://arb-mainnet.g.alchemy.com/v2/TU_API_KEY
ARB_RPC_WS=wss://arb-mainnet.g.alchemy.com/v2/TU_API_KEY

# ─────────────────────────────────────────────────────────────────────────────────
# OPTIMISM RPCs
# ─────────────────────────────────────────────────────────────────────────────────
OP_RPC_READ=https://opt-mainnet.g.alchemy.com/v2/TU_API_KEY
OP_RPC_SIM=https://opt-mainnet.g.alchemy.com/v2/TU_API_KEY
OP_RPC_SEND=https://opt-mainnet.g.alchemy.com/v2/TU_API_KEY
OP_RPC_WS=wss://opt-mainnet.g.alchemy.com/v2/TU_API_KEY

# ─────────────────────────────────────────────────────────────────────────────────
# POLYGON RPCs
# ─────────────────────────────────────────────────────────────────────────────────
POLY_RPC_READ=https://polygon-mainnet.g.alchemy.com/v2/TU_API_KEY
POLY_RPC_SIM=https://polygon-mainnet.g.alchemy.com/v2/TU_API_KEY
POLY_RPC_SEND=https://polygon-mainnet.g.alchemy.com/v2/TU_API_KEY
POLY_RPC_WS=wss://polygon-mainnet.g.alchemy.com/v2/TU_API_KEY

# ─────────────────────────────────────────────────────────────────────────────────
# BLOCK EXPLORER API KEYS (para verificar contratos)
# ─────────────────────────────────────────────────────────────────────────────────
BASESCAN_API_KEY=
ARBISCAN_API_KEY=
OPSCAN_API_KEY=
POLYGONSCAN_API_KEY=

# ─────────────────────────────────────────────────────────────────────────────────
# MODO
# ─────────────────────────────────────────────────────────────────────────────────
DRY_RUN=true
LOG_LEVEL=info
```

---

## ✅ Verificar conexión {#verificar}

Ejecuta este script para verificar que todos los RPCs funcionan:

```bash
npx tsx scripts/verify-rpcs.ts
```

O manualmente:

```javascript
// scripts/verify-rpcs.ts
import { ethers } from "ethers";
import "dotenv/config";

const chains = [
  { name: "Base", rpc: process.env.BASE_RPC_READ, chainId: 8453 },
  { name: "Arbitrum", rpc: process.env.ARB_RPC_READ, chainId: 42161 },
  { name: "Optimism", rpc: process.env.OP_RPC_READ, chainId: 10 },
  { name: "Polygon", rpc: process.env.POLY_RPC_READ, chainId: 137 }
];

async function verify() {
  console.log("🔍 Verificando RPCs...\n");
  
  for (const chain of chains) {
    try {
      const provider = new ethers.JsonRpcProvider(chain.rpc);
      const network = await provider.getNetwork();
      const block = await provider.getBlockNumber();
      
      if (Number(network.chainId) === chain.chainId) {
        console.log(`✅ ${chain.name}: OK (Block #${block})`);
      } else {
        console.log(`❌ ${chain.name}: Chain ID incorrecto`);
      }
    } catch (error: any) {
      console.log(`❌ ${chain.name}: ${error.message}`);
    }
  }
}

verify();
```

---

## 📊 Resumen de pasos

### Para empezar RÁPIDO (RPCs públicos):
1. Copia el bloque de "RPCs Públicos" al `.env`
2. Agrega tu `PRIVATE_KEY`
3. Ejecuta `npm run dev`

### Para PRODUCCIÓN (Alchemy):
1. Crea cuenta en Alchemy
2. Crea 4 apps (una por cadena)
3. Copia los endpoints al `.env`
4. Agrega tu `PRIVATE_KEY`
5. Ejecuta `npm run dev`

---

## ⚠️ Notas importantes

1. **Seguridad**: NUNCA compartas tu `PRIVATE_KEY`
2. **Rate Limits**: Los RPCs públicos tienen límites (~100 req/seg)
3. **Latencia**: Alchemy/Infura tienen ~50ms, públicos ~200ms
4. **Costo**: Alchemy free tier = 300M compute units/mes
5. **WebSocket**: Necesario para actualizaciones en tiempo real

---

## 🆘 Troubleshooting

### Error: "Rate limited"
- Usa RPCs privados (Alchemy/Infura)
- Aumenta `TICK_MS` a 1000+

### Error: "Connection refused"
- Verifica que el RPC esté activo
- Prueba con un RPC alternativo

### Error: "Chain ID mismatch"
- Verifica que usas el RPC correcto para cada cadena
- Base = 8453, Arbitrum = 42161, Optimism = 10, Polygon = 137

---

¡Listo! Con esta guía puedes configurar todos los RPCs necesarios. 🚀




## 📋 Índice
1. [Resumen de lo que necesitas](#resumen)
2. [Crear RPCs en Alchemy](#alchemy)
3. [Crear RPCs en Infura](#infura)
4. [RPCs Públicos (gratuitos)](#publicos)
5. [Configuración del .env](#configuracion)
6. [Verificar conexión](#verificar)

---

## 🎯 Resumen de lo que necesitas {#resumen}

Para cada cadena necesitas **4 tipos de RPC**:

| Tipo | Uso | Prioridad |
|------|-----|-----------|
| `READ` | Leer datos (balances, precios) | Alta |
| `SIM` | Simular transacciones (eth_call) | Alta |
| `SEND` | Enviar transacciones | Crítica |
| `WS` | WebSocket (tiempo real) | Media |

### Cadenas soportadas:
- ✅ **Base** (Chain ID: 8453)
- ✅ **Arbitrum One** (Chain ID: 42161)
- ✅ **Optimism** (Chain ID: 10)
- ✅ **Polygon** (Chain ID: 137)

---

## 🔷 Opción 1: Crear RPCs en Alchemy (RECOMENDADO) {#alchemy}

### Paso 1: Crear cuenta
1. Ve a https://www.alchemy.com/
2. Click en "Get started for free"
3. Registra tu cuenta con email

### Paso 2: Crear Apps para cada cadena

#### Para BASE:
1. Dashboard → Create new app
2. **Name**: `MultiChain-Arb-Base`
3. **Chain**: Base
4. **Network**: Base Mainnet
5. Click "Create app"
6. Copia el **HTTPS** y **WSS** endpoint

#### Para ARBITRUM:
1. Dashboard → Create new app
2. **Name**: `MultiChain-Arb-Arbitrum`
3. **Chain**: Arbitrum
4. **Network**: Arbitrum Mainnet
5. Click "Create app"
6. Copia el **HTTPS** y **WSS** endpoint

#### Para OPTIMISM:
1. Dashboard → Create new app
2. **Name**: `MultiChain-Arb-Optimism`
3. **Chain**: Optimism
4. **Network**: Optimism Mainnet
5. Click "Create app"
6. Copia el **HTTPS** y **WSS** endpoint

#### Para POLYGON:
1. Dashboard → Create new app
2. **Name**: `MultiChain-Arb-Polygon`
3. **Chain**: Polygon
4. **Network**: Polygon Mainnet
5. Click "Create app"
6. Copia el **HTTPS** y **WSS** endpoint

### Formato de URLs Alchemy:
```
HTTPS: https://{chain}-mainnet.g.alchemy.com/v2/{API_KEY}
WSS:   wss://{chain}-mainnet.g.alchemy.com/v2/{API_KEY}
```

### Ejemplo real:
```env
# Base
BASE_RPC_READ=https://base-mainnet.g.alchemy.com/v2/abc123xyz
BASE_RPC_SIM=https://base-mainnet.g.alchemy.com/v2/abc123xyz
BASE_RPC_SEND=https://base-mainnet.g.alchemy.com/v2/abc123xyz
BASE_RPC_WS=wss://base-mainnet.g.alchemy.com/v2/abc123xyz

# Arbitrum
ARB_RPC_READ=https://arb-mainnet.g.alchemy.com/v2/def456uvw
ARB_RPC_SIM=https://arb-mainnet.g.alchemy.com/v2/def456uvw
ARB_RPC_SEND=https://arb-mainnet.g.alchemy.com/v2/def456uvw
ARB_RPC_WS=wss://arb-mainnet.g.alchemy.com/v2/def456uvw

# Optimism
OP_RPC_READ=https://opt-mainnet.g.alchemy.com/v2/ghi789rst
OP_RPC_SIM=https://opt-mainnet.g.alchemy.com/v2/ghi789rst
OP_RPC_SEND=https://opt-mainnet.g.alchemy.com/v2/ghi789rst
OP_RPC_WS=wss://opt-mainnet.g.alchemy.com/v2/ghi789rst

# Polygon
POLY_RPC_READ=https://polygon-mainnet.g.alchemy.com/v2/jkl012mno
POLY_RPC_SIM=https://polygon-mainnet.g.alchemy.com/v2/jkl012mno
POLY_RPC_SEND=https://polygon-mainnet.g.alchemy.com/v2/jkl012mno
POLY_RPC_WS=wss://polygon-mainnet.g.alchemy.com/v2/jkl012mno
```

### Plan gratuito de Alchemy:
- ✅ 300M compute units/mes
- ✅ Suficiente para ~10,000 operaciones/día
- ✅ WebSocket incluido

---

## 🔶 Opción 2: Crear RPCs en Infura {#infura}

### Paso 1: Crear cuenta
1. Ve a https://www.infura.io/
2. Click en "Sign Up"
3. Registra tu cuenta

### Paso 2: Crear proyecto
1. Dashboard → Create new API key
2. **Name**: `MultiChain-Arb`
3. Selecciona las redes:
   - ✅ Arbitrum
   - ✅ Optimism
   - ✅ Polygon
   - ❌ Base (no soportado en Infura)

### Formato de URLs Infura:
```
HTTPS: https://{network}.infura.io/v3/{PROJECT_ID}
WSS:   wss://{network}.infura.io/ws/v3/{PROJECT_ID}
```

### Ejemplo:
```env
# Arbitrum (Infura)
ARB_RPC_READ=https://arbitrum-mainnet.infura.io/v3/abc123
ARB_RPC_WS=wss://arbitrum-mainnet.infura.io/ws/v3/abc123

# Optimism (Infura)
OP_RPC_READ=https://optimism-mainnet.infura.io/v3/abc123
OP_RPC_WS=wss://optimism-mainnet.infura.io/ws/v3/abc123

# Polygon (Infura)
POLY_RPC_READ=https://polygon-mainnet.infura.io/v3/abc123
POLY_RPC_WS=wss://polygon-mainnet.infura.io/ws/v3/abc123
```

---

## 🆓 Opción 3: RPCs Públicos (Gratuitos) {#publicos}

⚠️ **Advertencia**: Los RPCs públicos tienen límites de rate y pueden ser lentos.
Solo usar para pruebas, NO para producción.

```env
# ═══════════════════════════════════════════════════════════════════════════════
# BASE - RPCs Públicos
# ═══════════════════════════════════════════════════════════════════════════════
BASE_RPC_READ=https://mainnet.base.org
BASE_RPC_SIM=https://mainnet.base.org
BASE_RPC_SEND=https://mainnet.base.org
BASE_RPC_WS=wss://base-mainnet.publicnode.com

# ═══════════════════════════════════════════════════════════════════════════════
# ARBITRUM - RPCs Públicos
# ═══════════════════════════════════════════════════════════════════════════════
ARB_RPC_READ=https://arb1.arbitrum.io/rpc
ARB_RPC_SIM=https://arb1.arbitrum.io/rpc
ARB_RPC_SEND=https://arb1.arbitrum.io/rpc
ARB_RPC_WS=wss://arbitrum-one.publicnode.com

# ═══════════════════════════════════════════════════════════════════════════════
# OPTIMISM - RPCs Públicos
# ═══════════════════════════════════════════════════════════════════════════════
OP_RPC_READ=https://mainnet.optimism.io
OP_RPC_SIM=https://mainnet.optimism.io
OP_RPC_SEND=https://mainnet.optimism.io
OP_RPC_WS=wss://optimism.publicnode.com

# ═══════════════════════════════════════════════════════════════════════════════
# POLYGON - RPCs Públicos
# ═══════════════════════════════════════════════════════════════════════════════
POLY_RPC_READ=https://polygon-rpc.com
POLY_RPC_SIM=https://polygon-rpc.com
POLY_RPC_SEND=https://polygon-rpc.com
POLY_RPC_WS=wss://polygon-bor.publicnode.com
```

### Otros RPCs públicos alternativos:

| Cadena | RPC Alternativo |
|--------|-----------------|
| Base | `https://base.llamarpc.com` |
| Arbitrum | `https://arbitrum.llamarpc.com` |
| Optimism | `https://optimism.llamarpc.com` |
| Polygon | `https://polygon.llamarpc.com` |

---

## ⚙️ Configuración del .env {#configuracion}

Crea el archivo `.env` en la raíz del proyecto:

```env
# ═══════════════════════════════════════════════════════════════════════════════
# MULTI-CHAIN MICRO ARBITRAGE BOT - CONFIGURACIÓN
# ═══════════════════════════════════════════════════════════════════════════════

# ─────────────────────────────────────────────────────────────────────────────────
# WALLET (¡NUNCA COMPARTAS ESTA CLAVE!)
# ─────────────────────────────────────────────────────────────────────────────────
PRIVATE_KEY=0xTU_CLAVE_PRIVADA_AQUI

# ─────────────────────────────────────────────────────────────────────────────────
# TIMING
# ─────────────────────────────────────────────────────────────────────────────────
TICK_MS=700
DECISION_MS=5000

# ─────────────────────────────────────────────────────────────────────────────────
# TRADING
# ─────────────────────────────────────────────────────────────────────────────────
MIN_PROFIT_USD=0.50
GAS_MULT=1.7
MAX_SLIPPAGE_BPS=10
DEADLINE_SECONDS=20

# ─────────────────────────────────────────────────────────────────────────────────
# CHAINS HABILITADAS
# ─────────────────────────────────────────────────────────────────────────────────
CHAINS=base,arbitrum,optimism,polygon

# ─────────────────────────────────────────────────────────────────────────────────
# BASE RPCs (Alchemy recomendado)
# ─────────────────────────────────────────────────────────────────────────────────
BASE_RPC_READ=https://base-mainnet.g.alchemy.com/v2/TU_API_KEY
BASE_RPC_SIM=https://base-mainnet.g.alchemy.com/v2/TU_API_KEY
BASE_RPC_SEND=https://base-mainnet.g.alchemy.com/v2/TU_API_KEY
BASE_RPC_WS=wss://base-mainnet.g.alchemy.com/v2/TU_API_KEY

# ─────────────────────────────────────────────────────────────────────────────────
# ARBITRUM RPCs
# ─────────────────────────────────────────────────────────────────────────────────
ARB_RPC_READ=https://arb-mainnet.g.alchemy.com/v2/TU_API_KEY
ARB_RPC_SIM=https://arb-mainnet.g.alchemy.com/v2/TU_API_KEY
ARB_RPC_SEND=https://arb-mainnet.g.alchemy.com/v2/TU_API_KEY
ARB_RPC_WS=wss://arb-mainnet.g.alchemy.com/v2/TU_API_KEY

# ─────────────────────────────────────────────────────────────────────────────────
# OPTIMISM RPCs
# ─────────────────────────────────────────────────────────────────────────────────
OP_RPC_READ=https://opt-mainnet.g.alchemy.com/v2/TU_API_KEY
OP_RPC_SIM=https://opt-mainnet.g.alchemy.com/v2/TU_API_KEY
OP_RPC_SEND=https://opt-mainnet.g.alchemy.com/v2/TU_API_KEY
OP_RPC_WS=wss://opt-mainnet.g.alchemy.com/v2/TU_API_KEY

# ─────────────────────────────────────────────────────────────────────────────────
# POLYGON RPCs
# ─────────────────────────────────────────────────────────────────────────────────
POLY_RPC_READ=https://polygon-mainnet.g.alchemy.com/v2/TU_API_KEY
POLY_RPC_SIM=https://polygon-mainnet.g.alchemy.com/v2/TU_API_KEY
POLY_RPC_SEND=https://polygon-mainnet.g.alchemy.com/v2/TU_API_KEY
POLY_RPC_WS=wss://polygon-mainnet.g.alchemy.com/v2/TU_API_KEY

# ─────────────────────────────────────────────────────────────────────────────────
# BLOCK EXPLORER API KEYS (para verificar contratos)
# ─────────────────────────────────────────────────────────────────────────────────
BASESCAN_API_KEY=
ARBISCAN_API_KEY=
OPSCAN_API_KEY=
POLYGONSCAN_API_KEY=

# ─────────────────────────────────────────────────────────────────────────────────
# MODO
# ─────────────────────────────────────────────────────────────────────────────────
DRY_RUN=true
LOG_LEVEL=info
```

---

## ✅ Verificar conexión {#verificar}

Ejecuta este script para verificar que todos los RPCs funcionan:

```bash
npx tsx scripts/verify-rpcs.ts
```

O manualmente:

```javascript
// scripts/verify-rpcs.ts
import { ethers } from "ethers";
import "dotenv/config";

const chains = [
  { name: "Base", rpc: process.env.BASE_RPC_READ, chainId: 8453 },
  { name: "Arbitrum", rpc: process.env.ARB_RPC_READ, chainId: 42161 },
  { name: "Optimism", rpc: process.env.OP_RPC_READ, chainId: 10 },
  { name: "Polygon", rpc: process.env.POLY_RPC_READ, chainId: 137 }
];

async function verify() {
  console.log("🔍 Verificando RPCs...\n");
  
  for (const chain of chains) {
    try {
      const provider = new ethers.JsonRpcProvider(chain.rpc);
      const network = await provider.getNetwork();
      const block = await provider.getBlockNumber();
      
      if (Number(network.chainId) === chain.chainId) {
        console.log(`✅ ${chain.name}: OK (Block #${block})`);
      } else {
        console.log(`❌ ${chain.name}: Chain ID incorrecto`);
      }
    } catch (error: any) {
      console.log(`❌ ${chain.name}: ${error.message}`);
    }
  }
}

verify();
```

---

## 📊 Resumen de pasos

### Para empezar RÁPIDO (RPCs públicos):
1. Copia el bloque de "RPCs Públicos" al `.env`
2. Agrega tu `PRIVATE_KEY`
3. Ejecuta `npm run dev`

### Para PRODUCCIÓN (Alchemy):
1. Crea cuenta en Alchemy
2. Crea 4 apps (una por cadena)
3. Copia los endpoints al `.env`
4. Agrega tu `PRIVATE_KEY`
5. Ejecuta `npm run dev`

---

## ⚠️ Notas importantes

1. **Seguridad**: NUNCA compartas tu `PRIVATE_KEY`
2. **Rate Limits**: Los RPCs públicos tienen límites (~100 req/seg)
3. **Latencia**: Alchemy/Infura tienen ~50ms, públicos ~200ms
4. **Costo**: Alchemy free tier = 300M compute units/mes
5. **WebSocket**: Necesario para actualizaciones en tiempo real

---

## 🆘 Troubleshooting

### Error: "Rate limited"
- Usa RPCs privados (Alchemy/Infura)
- Aumenta `TICK_MS` a 1000+

### Error: "Connection refused"
- Verifica que el RPC esté activo
- Prueba con un RPC alternativo

### Error: "Chain ID mismatch"
- Verifica que usas el RPC correcto para cada cadena
- Base = 8453, Arbitrum = 42161, Optimism = 10, Polygon = 137

---

¡Listo! Con esta guía puedes configurar todos los RPCs necesarios. 🚀



## 📋 Índice
1. [Resumen de lo que necesitas](#resumen)
2. [Crear RPCs en Alchemy](#alchemy)
3. [Crear RPCs en Infura](#infura)
4. [RPCs Públicos (gratuitos)](#publicos)
5. [Configuración del .env](#configuracion)
6. [Verificar conexión](#verificar)

---

## 🎯 Resumen de lo que necesitas {#resumen}

Para cada cadena necesitas **4 tipos de RPC**:

| Tipo | Uso | Prioridad |
|------|-----|-----------|
| `READ` | Leer datos (balances, precios) | Alta |
| `SIM` | Simular transacciones (eth_call) | Alta |
| `SEND` | Enviar transacciones | Crítica |
| `WS` | WebSocket (tiempo real) | Media |

### Cadenas soportadas:
- ✅ **Base** (Chain ID: 8453)
- ✅ **Arbitrum One** (Chain ID: 42161)
- ✅ **Optimism** (Chain ID: 10)
- ✅ **Polygon** (Chain ID: 137)

---

## 🔷 Opción 1: Crear RPCs en Alchemy (RECOMENDADO) {#alchemy}

### Paso 1: Crear cuenta
1. Ve a https://www.alchemy.com/
2. Click en "Get started for free"
3. Registra tu cuenta con email

### Paso 2: Crear Apps para cada cadena

#### Para BASE:
1. Dashboard → Create new app
2. **Name**: `MultiChain-Arb-Base`
3. **Chain**: Base
4. **Network**: Base Mainnet
5. Click "Create app"
6. Copia el **HTTPS** y **WSS** endpoint

#### Para ARBITRUM:
1. Dashboard → Create new app
2. **Name**: `MultiChain-Arb-Arbitrum`
3. **Chain**: Arbitrum
4. **Network**: Arbitrum Mainnet
5. Click "Create app"
6. Copia el **HTTPS** y **WSS** endpoint

#### Para OPTIMISM:
1. Dashboard → Create new app
2. **Name**: `MultiChain-Arb-Optimism`
3. **Chain**: Optimism
4. **Network**: Optimism Mainnet
5. Click "Create app"
6. Copia el **HTTPS** y **WSS** endpoint

#### Para POLYGON:
1. Dashboard → Create new app
2. **Name**: `MultiChain-Arb-Polygon`
3. **Chain**: Polygon
4. **Network**: Polygon Mainnet
5. Click "Create app"
6. Copia el **HTTPS** y **WSS** endpoint

### Formato de URLs Alchemy:
```
HTTPS: https://{chain}-mainnet.g.alchemy.com/v2/{API_KEY}
WSS:   wss://{chain}-mainnet.g.alchemy.com/v2/{API_KEY}
```

### Ejemplo real:
```env
# Base
BASE_RPC_READ=https://base-mainnet.g.alchemy.com/v2/abc123xyz
BASE_RPC_SIM=https://base-mainnet.g.alchemy.com/v2/abc123xyz
BASE_RPC_SEND=https://base-mainnet.g.alchemy.com/v2/abc123xyz
BASE_RPC_WS=wss://base-mainnet.g.alchemy.com/v2/abc123xyz

# Arbitrum
ARB_RPC_READ=https://arb-mainnet.g.alchemy.com/v2/def456uvw
ARB_RPC_SIM=https://arb-mainnet.g.alchemy.com/v2/def456uvw
ARB_RPC_SEND=https://arb-mainnet.g.alchemy.com/v2/def456uvw
ARB_RPC_WS=wss://arb-mainnet.g.alchemy.com/v2/def456uvw

# Optimism
OP_RPC_READ=https://opt-mainnet.g.alchemy.com/v2/ghi789rst
OP_RPC_SIM=https://opt-mainnet.g.alchemy.com/v2/ghi789rst
OP_RPC_SEND=https://opt-mainnet.g.alchemy.com/v2/ghi789rst
OP_RPC_WS=wss://opt-mainnet.g.alchemy.com/v2/ghi789rst

# Polygon
POLY_RPC_READ=https://polygon-mainnet.g.alchemy.com/v2/jkl012mno
POLY_RPC_SIM=https://polygon-mainnet.g.alchemy.com/v2/jkl012mno
POLY_RPC_SEND=https://polygon-mainnet.g.alchemy.com/v2/jkl012mno
POLY_RPC_WS=wss://polygon-mainnet.g.alchemy.com/v2/jkl012mno
```

### Plan gratuito de Alchemy:
- ✅ 300M compute units/mes
- ✅ Suficiente para ~10,000 operaciones/día
- ✅ WebSocket incluido

---

## 🔶 Opción 2: Crear RPCs en Infura {#infura}

### Paso 1: Crear cuenta
1. Ve a https://www.infura.io/
2. Click en "Sign Up"
3. Registra tu cuenta

### Paso 2: Crear proyecto
1. Dashboard → Create new API key
2. **Name**: `MultiChain-Arb`
3. Selecciona las redes:
   - ✅ Arbitrum
   - ✅ Optimism
   - ✅ Polygon
   - ❌ Base (no soportado en Infura)

### Formato de URLs Infura:
```
HTTPS: https://{network}.infura.io/v3/{PROJECT_ID}
WSS:   wss://{network}.infura.io/ws/v3/{PROJECT_ID}
```

### Ejemplo:
```env
# Arbitrum (Infura)
ARB_RPC_READ=https://arbitrum-mainnet.infura.io/v3/abc123
ARB_RPC_WS=wss://arbitrum-mainnet.infura.io/ws/v3/abc123

# Optimism (Infura)
OP_RPC_READ=https://optimism-mainnet.infura.io/v3/abc123
OP_RPC_WS=wss://optimism-mainnet.infura.io/ws/v3/abc123

# Polygon (Infura)
POLY_RPC_READ=https://polygon-mainnet.infura.io/v3/abc123
POLY_RPC_WS=wss://polygon-mainnet.infura.io/ws/v3/abc123
```

---

## 🆓 Opción 3: RPCs Públicos (Gratuitos) {#publicos}

⚠️ **Advertencia**: Los RPCs públicos tienen límites de rate y pueden ser lentos.
Solo usar para pruebas, NO para producción.

```env
# ═══════════════════════════════════════════════════════════════════════════════
# BASE - RPCs Públicos
# ═══════════════════════════════════════════════════════════════════════════════
BASE_RPC_READ=https://mainnet.base.org
BASE_RPC_SIM=https://mainnet.base.org
BASE_RPC_SEND=https://mainnet.base.org
BASE_RPC_WS=wss://base-mainnet.publicnode.com

# ═══════════════════════════════════════════════════════════════════════════════
# ARBITRUM - RPCs Públicos
# ═══════════════════════════════════════════════════════════════════════════════
ARB_RPC_READ=https://arb1.arbitrum.io/rpc
ARB_RPC_SIM=https://arb1.arbitrum.io/rpc
ARB_RPC_SEND=https://arb1.arbitrum.io/rpc
ARB_RPC_WS=wss://arbitrum-one.publicnode.com

# ═══════════════════════════════════════════════════════════════════════════════
# OPTIMISM - RPCs Públicos
# ═══════════════════════════════════════════════════════════════════════════════
OP_RPC_READ=https://mainnet.optimism.io
OP_RPC_SIM=https://mainnet.optimism.io
OP_RPC_SEND=https://mainnet.optimism.io
OP_RPC_WS=wss://optimism.publicnode.com

# ═══════════════════════════════════════════════════════════════════════════════
# POLYGON - RPCs Públicos
# ═══════════════════════════════════════════════════════════════════════════════
POLY_RPC_READ=https://polygon-rpc.com
POLY_RPC_SIM=https://polygon-rpc.com
POLY_RPC_SEND=https://polygon-rpc.com
POLY_RPC_WS=wss://polygon-bor.publicnode.com
```

### Otros RPCs públicos alternativos:

| Cadena | RPC Alternativo |
|--------|-----------------|
| Base | `https://base.llamarpc.com` |
| Arbitrum | `https://arbitrum.llamarpc.com` |
| Optimism | `https://optimism.llamarpc.com` |
| Polygon | `https://polygon.llamarpc.com` |

---

## ⚙️ Configuración del .env {#configuracion}

Crea el archivo `.env` en la raíz del proyecto:

```env
# ═══════════════════════════════════════════════════════════════════════════════
# MULTI-CHAIN MICRO ARBITRAGE BOT - CONFIGURACIÓN
# ═══════════════════════════════════════════════════════════════════════════════

# ─────────────────────────────────────────────────────────────────────────────────
# WALLET (¡NUNCA COMPARTAS ESTA CLAVE!)
# ─────────────────────────────────────────────────────────────────────────────────
PRIVATE_KEY=0xTU_CLAVE_PRIVADA_AQUI

# ─────────────────────────────────────────────────────────────────────────────────
# TIMING
# ─────────────────────────────────────────────────────────────────────────────────
TICK_MS=700
DECISION_MS=5000

# ─────────────────────────────────────────────────────────────────────────────────
# TRADING
# ─────────────────────────────────────────────────────────────────────────────────
MIN_PROFIT_USD=0.50
GAS_MULT=1.7
MAX_SLIPPAGE_BPS=10
DEADLINE_SECONDS=20

# ─────────────────────────────────────────────────────────────────────────────────
# CHAINS HABILITADAS
# ─────────────────────────────────────────────────────────────────────────────────
CHAINS=base,arbitrum,optimism,polygon

# ─────────────────────────────────────────────────────────────────────────────────
# BASE RPCs (Alchemy recomendado)
# ─────────────────────────────────────────────────────────────────────────────────
BASE_RPC_READ=https://base-mainnet.g.alchemy.com/v2/TU_API_KEY
BASE_RPC_SIM=https://base-mainnet.g.alchemy.com/v2/TU_API_KEY
BASE_RPC_SEND=https://base-mainnet.g.alchemy.com/v2/TU_API_KEY
BASE_RPC_WS=wss://base-mainnet.g.alchemy.com/v2/TU_API_KEY

# ─────────────────────────────────────────────────────────────────────────────────
# ARBITRUM RPCs
# ─────────────────────────────────────────────────────────────────────────────────
ARB_RPC_READ=https://arb-mainnet.g.alchemy.com/v2/TU_API_KEY
ARB_RPC_SIM=https://arb-mainnet.g.alchemy.com/v2/TU_API_KEY
ARB_RPC_SEND=https://arb-mainnet.g.alchemy.com/v2/TU_API_KEY
ARB_RPC_WS=wss://arb-mainnet.g.alchemy.com/v2/TU_API_KEY

# ─────────────────────────────────────────────────────────────────────────────────
# OPTIMISM RPCs
# ─────────────────────────────────────────────────────────────────────────────────
OP_RPC_READ=https://opt-mainnet.g.alchemy.com/v2/TU_API_KEY
OP_RPC_SIM=https://opt-mainnet.g.alchemy.com/v2/TU_API_KEY
OP_RPC_SEND=https://opt-mainnet.g.alchemy.com/v2/TU_API_KEY
OP_RPC_WS=wss://opt-mainnet.g.alchemy.com/v2/TU_API_KEY

# ─────────────────────────────────────────────────────────────────────────────────
# POLYGON RPCs
# ─────────────────────────────────────────────────────────────────────────────────
POLY_RPC_READ=https://polygon-mainnet.g.alchemy.com/v2/TU_API_KEY
POLY_RPC_SIM=https://polygon-mainnet.g.alchemy.com/v2/TU_API_KEY
POLY_RPC_SEND=https://polygon-mainnet.g.alchemy.com/v2/TU_API_KEY
POLY_RPC_WS=wss://polygon-mainnet.g.alchemy.com/v2/TU_API_KEY

# ─────────────────────────────────────────────────────────────────────────────────
# BLOCK EXPLORER API KEYS (para verificar contratos)
# ─────────────────────────────────────────────────────────────────────────────────
BASESCAN_API_KEY=
ARBISCAN_API_KEY=
OPSCAN_API_KEY=
POLYGONSCAN_API_KEY=

# ─────────────────────────────────────────────────────────────────────────────────
# MODO
# ─────────────────────────────────────────────────────────────────────────────────
DRY_RUN=true
LOG_LEVEL=info
```

---

## ✅ Verificar conexión {#verificar}

Ejecuta este script para verificar que todos los RPCs funcionan:

```bash
npx tsx scripts/verify-rpcs.ts
```

O manualmente:

```javascript
// scripts/verify-rpcs.ts
import { ethers } from "ethers";
import "dotenv/config";

const chains = [
  { name: "Base", rpc: process.env.BASE_RPC_READ, chainId: 8453 },
  { name: "Arbitrum", rpc: process.env.ARB_RPC_READ, chainId: 42161 },
  { name: "Optimism", rpc: process.env.OP_RPC_READ, chainId: 10 },
  { name: "Polygon", rpc: process.env.POLY_RPC_READ, chainId: 137 }
];

async function verify() {
  console.log("🔍 Verificando RPCs...\n");
  
  for (const chain of chains) {
    try {
      const provider = new ethers.JsonRpcProvider(chain.rpc);
      const network = await provider.getNetwork();
      const block = await provider.getBlockNumber();
      
      if (Number(network.chainId) === chain.chainId) {
        console.log(`✅ ${chain.name}: OK (Block #${block})`);
      } else {
        console.log(`❌ ${chain.name}: Chain ID incorrecto`);
      }
    } catch (error: any) {
      console.log(`❌ ${chain.name}: ${error.message}`);
    }
  }
}

verify();
```

---

## 📊 Resumen de pasos

### Para empezar RÁPIDO (RPCs públicos):
1. Copia el bloque de "RPCs Públicos" al `.env`
2. Agrega tu `PRIVATE_KEY`
3. Ejecuta `npm run dev`

### Para PRODUCCIÓN (Alchemy):
1. Crea cuenta en Alchemy
2. Crea 4 apps (una por cadena)
3. Copia los endpoints al `.env`
4. Agrega tu `PRIVATE_KEY`
5. Ejecuta `npm run dev`

---

## ⚠️ Notas importantes

1. **Seguridad**: NUNCA compartas tu `PRIVATE_KEY`
2. **Rate Limits**: Los RPCs públicos tienen límites (~100 req/seg)
3. **Latencia**: Alchemy/Infura tienen ~50ms, públicos ~200ms
4. **Costo**: Alchemy free tier = 300M compute units/mes
5. **WebSocket**: Necesario para actualizaciones en tiempo real

---

## 🆘 Troubleshooting

### Error: "Rate limited"
- Usa RPCs privados (Alchemy/Infura)
- Aumenta `TICK_MS` a 1000+

### Error: "Connection refused"
- Verifica que el RPC esté activo
- Prueba con un RPC alternativo

### Error: "Chain ID mismatch"
- Verifica que usas el RPC correcto para cada cadena
- Base = 8453, Arbitrum = 42161, Optimism = 10, Polygon = 137

---

¡Listo! Con esta guía puedes configurar todos los RPCs necesarios. 🚀



## 📋 Índice
1. [Resumen de lo que necesitas](#resumen)
2. [Crear RPCs en Alchemy](#alchemy)
3. [Crear RPCs en Infura](#infura)
4. [RPCs Públicos (gratuitos)](#publicos)
5. [Configuración del .env](#configuracion)
6. [Verificar conexión](#verificar)

---

## 🎯 Resumen de lo que necesitas {#resumen}

Para cada cadena necesitas **4 tipos de RPC**:

| Tipo | Uso | Prioridad |
|------|-----|-----------|
| `READ` | Leer datos (balances, precios) | Alta |
| `SIM` | Simular transacciones (eth_call) | Alta |
| `SEND` | Enviar transacciones | Crítica |
| `WS` | WebSocket (tiempo real) | Media |

### Cadenas soportadas:
- ✅ **Base** (Chain ID: 8453)
- ✅ **Arbitrum One** (Chain ID: 42161)
- ✅ **Optimism** (Chain ID: 10)
- ✅ **Polygon** (Chain ID: 137)

---

## 🔷 Opción 1: Crear RPCs en Alchemy (RECOMENDADO) {#alchemy}

### Paso 1: Crear cuenta
1. Ve a https://www.alchemy.com/
2. Click en "Get started for free"
3. Registra tu cuenta con email

### Paso 2: Crear Apps para cada cadena

#### Para BASE:
1. Dashboard → Create new app
2. **Name**: `MultiChain-Arb-Base`
3. **Chain**: Base
4. **Network**: Base Mainnet
5. Click "Create app"
6. Copia el **HTTPS** y **WSS** endpoint

#### Para ARBITRUM:
1. Dashboard → Create new app
2. **Name**: `MultiChain-Arb-Arbitrum`
3. **Chain**: Arbitrum
4. **Network**: Arbitrum Mainnet
5. Click "Create app"
6. Copia el **HTTPS** y **WSS** endpoint

#### Para OPTIMISM:
1. Dashboard → Create new app
2. **Name**: `MultiChain-Arb-Optimism`
3. **Chain**: Optimism
4. **Network**: Optimism Mainnet
5. Click "Create app"
6. Copia el **HTTPS** y **WSS** endpoint

#### Para POLYGON:
1. Dashboard → Create new app
2. **Name**: `MultiChain-Arb-Polygon`
3. **Chain**: Polygon
4. **Network**: Polygon Mainnet
5. Click "Create app"
6. Copia el **HTTPS** y **WSS** endpoint

### Formato de URLs Alchemy:
```
HTTPS: https://{chain}-mainnet.g.alchemy.com/v2/{API_KEY}
WSS:   wss://{chain}-mainnet.g.alchemy.com/v2/{API_KEY}
```

### Ejemplo real:
```env
# Base
BASE_RPC_READ=https://base-mainnet.g.alchemy.com/v2/abc123xyz
BASE_RPC_SIM=https://base-mainnet.g.alchemy.com/v2/abc123xyz
BASE_RPC_SEND=https://base-mainnet.g.alchemy.com/v2/abc123xyz
BASE_RPC_WS=wss://base-mainnet.g.alchemy.com/v2/abc123xyz

# Arbitrum
ARB_RPC_READ=https://arb-mainnet.g.alchemy.com/v2/def456uvw
ARB_RPC_SIM=https://arb-mainnet.g.alchemy.com/v2/def456uvw
ARB_RPC_SEND=https://arb-mainnet.g.alchemy.com/v2/def456uvw
ARB_RPC_WS=wss://arb-mainnet.g.alchemy.com/v2/def456uvw

# Optimism
OP_RPC_READ=https://opt-mainnet.g.alchemy.com/v2/ghi789rst
OP_RPC_SIM=https://opt-mainnet.g.alchemy.com/v2/ghi789rst
OP_RPC_SEND=https://opt-mainnet.g.alchemy.com/v2/ghi789rst
OP_RPC_WS=wss://opt-mainnet.g.alchemy.com/v2/ghi789rst

# Polygon
POLY_RPC_READ=https://polygon-mainnet.g.alchemy.com/v2/jkl012mno
POLY_RPC_SIM=https://polygon-mainnet.g.alchemy.com/v2/jkl012mno
POLY_RPC_SEND=https://polygon-mainnet.g.alchemy.com/v2/jkl012mno
POLY_RPC_WS=wss://polygon-mainnet.g.alchemy.com/v2/jkl012mno
```

### Plan gratuito de Alchemy:
- ✅ 300M compute units/mes
- ✅ Suficiente para ~10,000 operaciones/día
- ✅ WebSocket incluido

---

## 🔶 Opción 2: Crear RPCs en Infura {#infura}

### Paso 1: Crear cuenta
1. Ve a https://www.infura.io/
2. Click en "Sign Up"
3. Registra tu cuenta

### Paso 2: Crear proyecto
1. Dashboard → Create new API key
2. **Name**: `MultiChain-Arb`
3. Selecciona las redes:
   - ✅ Arbitrum
   - ✅ Optimism
   - ✅ Polygon
   - ❌ Base (no soportado en Infura)

### Formato de URLs Infura:
```
HTTPS: https://{network}.infura.io/v3/{PROJECT_ID}
WSS:   wss://{network}.infura.io/ws/v3/{PROJECT_ID}
```

### Ejemplo:
```env
# Arbitrum (Infura)
ARB_RPC_READ=https://arbitrum-mainnet.infura.io/v3/abc123
ARB_RPC_WS=wss://arbitrum-mainnet.infura.io/ws/v3/abc123

# Optimism (Infura)
OP_RPC_READ=https://optimism-mainnet.infura.io/v3/abc123
OP_RPC_WS=wss://optimism-mainnet.infura.io/ws/v3/abc123

# Polygon (Infura)
POLY_RPC_READ=https://polygon-mainnet.infura.io/v3/abc123
POLY_RPC_WS=wss://polygon-mainnet.infura.io/ws/v3/abc123
```

---

## 🆓 Opción 3: RPCs Públicos (Gratuitos) {#publicos}

⚠️ **Advertencia**: Los RPCs públicos tienen límites de rate y pueden ser lentos.
Solo usar para pruebas, NO para producción.

```env
# ═══════════════════════════════════════════════════════════════════════════════
# BASE - RPCs Públicos
# ═══════════════════════════════════════════════════════════════════════════════
BASE_RPC_READ=https://mainnet.base.org
BASE_RPC_SIM=https://mainnet.base.org
BASE_RPC_SEND=https://mainnet.base.org
BASE_RPC_WS=wss://base-mainnet.publicnode.com

# ═══════════════════════════════════════════════════════════════════════════════
# ARBITRUM - RPCs Públicos
# ═══════════════════════════════════════════════════════════════════════════════
ARB_RPC_READ=https://arb1.arbitrum.io/rpc
ARB_RPC_SIM=https://arb1.arbitrum.io/rpc
ARB_RPC_SEND=https://arb1.arbitrum.io/rpc
ARB_RPC_WS=wss://arbitrum-one.publicnode.com

# ═══════════════════════════════════════════════════════════════════════════════
# OPTIMISM - RPCs Públicos
# ═══════════════════════════════════════════════════════════════════════════════
OP_RPC_READ=https://mainnet.optimism.io
OP_RPC_SIM=https://mainnet.optimism.io
OP_RPC_SEND=https://mainnet.optimism.io
OP_RPC_WS=wss://optimism.publicnode.com

# ═══════════════════════════════════════════════════════════════════════════════
# POLYGON - RPCs Públicos
# ═══════════════════════════════════════════════════════════════════════════════
POLY_RPC_READ=https://polygon-rpc.com
POLY_RPC_SIM=https://polygon-rpc.com
POLY_RPC_SEND=https://polygon-rpc.com
POLY_RPC_WS=wss://polygon-bor.publicnode.com
```

### Otros RPCs públicos alternativos:

| Cadena | RPC Alternativo |
|--------|-----------------|
| Base | `https://base.llamarpc.com` |
| Arbitrum | `https://arbitrum.llamarpc.com` |
| Optimism | `https://optimism.llamarpc.com` |
| Polygon | `https://polygon.llamarpc.com` |

---

## ⚙️ Configuración del .env {#configuracion}

Crea el archivo `.env` en la raíz del proyecto:

```env
# ═══════════════════════════════════════════════════════════════════════════════
# MULTI-CHAIN MICRO ARBITRAGE BOT - CONFIGURACIÓN
# ═══════════════════════════════════════════════════════════════════════════════

# ─────────────────────────────────────────────────────────────────────────────────
# WALLET (¡NUNCA COMPARTAS ESTA CLAVE!)
# ─────────────────────────────────────────────────────────────────────────────────
PRIVATE_KEY=0xTU_CLAVE_PRIVADA_AQUI

# ─────────────────────────────────────────────────────────────────────────────────
# TIMING
# ─────────────────────────────────────────────────────────────────────────────────
TICK_MS=700
DECISION_MS=5000

# ─────────────────────────────────────────────────────────────────────────────────
# TRADING
# ─────────────────────────────────────────────────────────────────────────────────
MIN_PROFIT_USD=0.50
GAS_MULT=1.7
MAX_SLIPPAGE_BPS=10
DEADLINE_SECONDS=20

# ─────────────────────────────────────────────────────────────────────────────────
# CHAINS HABILITADAS
# ─────────────────────────────────────────────────────────────────────────────────
CHAINS=base,arbitrum,optimism,polygon

# ─────────────────────────────────────────────────────────────────────────────────
# BASE RPCs (Alchemy recomendado)
# ─────────────────────────────────────────────────────────────────────────────────
BASE_RPC_READ=https://base-mainnet.g.alchemy.com/v2/TU_API_KEY
BASE_RPC_SIM=https://base-mainnet.g.alchemy.com/v2/TU_API_KEY
BASE_RPC_SEND=https://base-mainnet.g.alchemy.com/v2/TU_API_KEY
BASE_RPC_WS=wss://base-mainnet.g.alchemy.com/v2/TU_API_KEY

# ─────────────────────────────────────────────────────────────────────────────────
# ARBITRUM RPCs
# ─────────────────────────────────────────────────────────────────────────────────
ARB_RPC_READ=https://arb-mainnet.g.alchemy.com/v2/TU_API_KEY
ARB_RPC_SIM=https://arb-mainnet.g.alchemy.com/v2/TU_API_KEY
ARB_RPC_SEND=https://arb-mainnet.g.alchemy.com/v2/TU_API_KEY
ARB_RPC_WS=wss://arb-mainnet.g.alchemy.com/v2/TU_API_KEY

# ─────────────────────────────────────────────────────────────────────────────────
# OPTIMISM RPCs
# ─────────────────────────────────────────────────────────────────────────────────
OP_RPC_READ=https://opt-mainnet.g.alchemy.com/v2/TU_API_KEY
OP_RPC_SIM=https://opt-mainnet.g.alchemy.com/v2/TU_API_KEY
OP_RPC_SEND=https://opt-mainnet.g.alchemy.com/v2/TU_API_KEY
OP_RPC_WS=wss://opt-mainnet.g.alchemy.com/v2/TU_API_KEY

# ─────────────────────────────────────────────────────────────────────────────────
# POLYGON RPCs
# ─────────────────────────────────────────────────────────────────────────────────
POLY_RPC_READ=https://polygon-mainnet.g.alchemy.com/v2/TU_API_KEY
POLY_RPC_SIM=https://polygon-mainnet.g.alchemy.com/v2/TU_API_KEY
POLY_RPC_SEND=https://polygon-mainnet.g.alchemy.com/v2/TU_API_KEY
POLY_RPC_WS=wss://polygon-mainnet.g.alchemy.com/v2/TU_API_KEY

# ─────────────────────────────────────────────────────────────────────────────────
# BLOCK EXPLORER API KEYS (para verificar contratos)
# ─────────────────────────────────────────────────────────────────────────────────
BASESCAN_API_KEY=
ARBISCAN_API_KEY=
OPSCAN_API_KEY=
POLYGONSCAN_API_KEY=

# ─────────────────────────────────────────────────────────────────────────────────
# MODO
# ─────────────────────────────────────────────────────────────────────────────────
DRY_RUN=true
LOG_LEVEL=info
```

---

## ✅ Verificar conexión {#verificar}

Ejecuta este script para verificar que todos los RPCs funcionan:

```bash
npx tsx scripts/verify-rpcs.ts
```

O manualmente:

```javascript
// scripts/verify-rpcs.ts
import { ethers } from "ethers";
import "dotenv/config";

const chains = [
  { name: "Base", rpc: process.env.BASE_RPC_READ, chainId: 8453 },
  { name: "Arbitrum", rpc: process.env.ARB_RPC_READ, chainId: 42161 },
  { name: "Optimism", rpc: process.env.OP_RPC_READ, chainId: 10 },
  { name: "Polygon", rpc: process.env.POLY_RPC_READ, chainId: 137 }
];

async function verify() {
  console.log("🔍 Verificando RPCs...\n");
  
  for (const chain of chains) {
    try {
      const provider = new ethers.JsonRpcProvider(chain.rpc);
      const network = await provider.getNetwork();
      const block = await provider.getBlockNumber();
      
      if (Number(network.chainId) === chain.chainId) {
        console.log(`✅ ${chain.name}: OK (Block #${block})`);
      } else {
        console.log(`❌ ${chain.name}: Chain ID incorrecto`);
      }
    } catch (error: any) {
      console.log(`❌ ${chain.name}: ${error.message}`);
    }
  }
}

verify();
```

---

## 📊 Resumen de pasos

### Para empezar RÁPIDO (RPCs públicos):
1. Copia el bloque de "RPCs Públicos" al `.env`
2. Agrega tu `PRIVATE_KEY`
3. Ejecuta `npm run dev`

### Para PRODUCCIÓN (Alchemy):
1. Crea cuenta en Alchemy
2. Crea 4 apps (una por cadena)
3. Copia los endpoints al `.env`
4. Agrega tu `PRIVATE_KEY`
5. Ejecuta `npm run dev`

---

## ⚠️ Notas importantes

1. **Seguridad**: NUNCA compartas tu `PRIVATE_KEY`
2. **Rate Limits**: Los RPCs públicos tienen límites (~100 req/seg)
3. **Latencia**: Alchemy/Infura tienen ~50ms, públicos ~200ms
4. **Costo**: Alchemy free tier = 300M compute units/mes
5. **WebSocket**: Necesario para actualizaciones en tiempo real

---

## 🆘 Troubleshooting

### Error: "Rate limited"
- Usa RPCs privados (Alchemy/Infura)
- Aumenta `TICK_MS` a 1000+

### Error: "Connection refused"
- Verifica que el RPC esté activo
- Prueba con un RPC alternativo

### Error: "Chain ID mismatch"
- Verifica que usas el RPC correcto para cada cadena
- Base = 8453, Arbitrum = 42161, Optimism = 10, Polygon = 137

---

¡Listo! Con esta guía puedes configurar todos los RPCs necesarios. 🚀



## 📋 Índice
1. [Resumen de lo que necesitas](#resumen)
2. [Crear RPCs en Alchemy](#alchemy)
3. [Crear RPCs en Infura](#infura)
4. [RPCs Públicos (gratuitos)](#publicos)
5. [Configuración del .env](#configuracion)
6. [Verificar conexión](#verificar)

---

## 🎯 Resumen de lo que necesitas {#resumen}

Para cada cadena necesitas **4 tipos de RPC**:

| Tipo | Uso | Prioridad |
|------|-----|-----------|
| `READ` | Leer datos (balances, precios) | Alta |
| `SIM` | Simular transacciones (eth_call) | Alta |
| `SEND` | Enviar transacciones | Crítica |
| `WS` | WebSocket (tiempo real) | Media |

### Cadenas soportadas:
- ✅ **Base** (Chain ID: 8453)
- ✅ **Arbitrum One** (Chain ID: 42161)
- ✅ **Optimism** (Chain ID: 10)
- ✅ **Polygon** (Chain ID: 137)

---

## 🔷 Opción 1: Crear RPCs en Alchemy (RECOMENDADO) {#alchemy}

### Paso 1: Crear cuenta
1. Ve a https://www.alchemy.com/
2. Click en "Get started for free"
3. Registra tu cuenta con email

### Paso 2: Crear Apps para cada cadena

#### Para BASE:
1. Dashboard → Create new app
2. **Name**: `MultiChain-Arb-Base`
3. **Chain**: Base
4. **Network**: Base Mainnet
5. Click "Create app"
6. Copia el **HTTPS** y **WSS** endpoint

#### Para ARBITRUM:
1. Dashboard → Create new app
2. **Name**: `MultiChain-Arb-Arbitrum`
3. **Chain**: Arbitrum
4. **Network**: Arbitrum Mainnet
5. Click "Create app"
6. Copia el **HTTPS** y **WSS** endpoint

#### Para OPTIMISM:
1. Dashboard → Create new app
2. **Name**: `MultiChain-Arb-Optimism`
3. **Chain**: Optimism
4. **Network**: Optimism Mainnet
5. Click "Create app"
6. Copia el **HTTPS** y **WSS** endpoint

#### Para POLYGON:
1. Dashboard → Create new app
2. **Name**: `MultiChain-Arb-Polygon`
3. **Chain**: Polygon
4. **Network**: Polygon Mainnet
5. Click "Create app"
6. Copia el **HTTPS** y **WSS** endpoint

### Formato de URLs Alchemy:
```
HTTPS: https://{chain}-mainnet.g.alchemy.com/v2/{API_KEY}
WSS:   wss://{chain}-mainnet.g.alchemy.com/v2/{API_KEY}
```

### Ejemplo real:
```env
# Base
BASE_RPC_READ=https://base-mainnet.g.alchemy.com/v2/abc123xyz
BASE_RPC_SIM=https://base-mainnet.g.alchemy.com/v2/abc123xyz
BASE_RPC_SEND=https://base-mainnet.g.alchemy.com/v2/abc123xyz
BASE_RPC_WS=wss://base-mainnet.g.alchemy.com/v2/abc123xyz

# Arbitrum
ARB_RPC_READ=https://arb-mainnet.g.alchemy.com/v2/def456uvw
ARB_RPC_SIM=https://arb-mainnet.g.alchemy.com/v2/def456uvw
ARB_RPC_SEND=https://arb-mainnet.g.alchemy.com/v2/def456uvw
ARB_RPC_WS=wss://arb-mainnet.g.alchemy.com/v2/def456uvw

# Optimism
OP_RPC_READ=https://opt-mainnet.g.alchemy.com/v2/ghi789rst
OP_RPC_SIM=https://opt-mainnet.g.alchemy.com/v2/ghi789rst
OP_RPC_SEND=https://opt-mainnet.g.alchemy.com/v2/ghi789rst
OP_RPC_WS=wss://opt-mainnet.g.alchemy.com/v2/ghi789rst

# Polygon
POLY_RPC_READ=https://polygon-mainnet.g.alchemy.com/v2/jkl012mno
POLY_RPC_SIM=https://polygon-mainnet.g.alchemy.com/v2/jkl012mno
POLY_RPC_SEND=https://polygon-mainnet.g.alchemy.com/v2/jkl012mno
POLY_RPC_WS=wss://polygon-mainnet.g.alchemy.com/v2/jkl012mno
```

### Plan gratuito de Alchemy:
- ✅ 300M compute units/mes
- ✅ Suficiente para ~10,000 operaciones/día
- ✅ WebSocket incluido

---

## 🔶 Opción 2: Crear RPCs en Infura {#infura}

### Paso 1: Crear cuenta
1. Ve a https://www.infura.io/
2. Click en "Sign Up"
3. Registra tu cuenta

### Paso 2: Crear proyecto
1. Dashboard → Create new API key
2. **Name**: `MultiChain-Arb`
3. Selecciona las redes:
   - ✅ Arbitrum
   - ✅ Optimism
   - ✅ Polygon
   - ❌ Base (no soportado en Infura)

### Formato de URLs Infura:
```
HTTPS: https://{network}.infura.io/v3/{PROJECT_ID}
WSS:   wss://{network}.infura.io/ws/v3/{PROJECT_ID}
```

### Ejemplo:
```env
# Arbitrum (Infura)
ARB_RPC_READ=https://arbitrum-mainnet.infura.io/v3/abc123
ARB_RPC_WS=wss://arbitrum-mainnet.infura.io/ws/v3/abc123

# Optimism (Infura)
OP_RPC_READ=https://optimism-mainnet.infura.io/v3/abc123
OP_RPC_WS=wss://optimism-mainnet.infura.io/ws/v3/abc123

# Polygon (Infura)
POLY_RPC_READ=https://polygon-mainnet.infura.io/v3/abc123
POLY_RPC_WS=wss://polygon-mainnet.infura.io/ws/v3/abc123
```

---

## 🆓 Opción 3: RPCs Públicos (Gratuitos) {#publicos}

⚠️ **Advertencia**: Los RPCs públicos tienen límites de rate y pueden ser lentos.
Solo usar para pruebas, NO para producción.

```env
# ═══════════════════════════════════════════════════════════════════════════════
# BASE - RPCs Públicos
# ═══════════════════════════════════════════════════════════════════════════════
BASE_RPC_READ=https://mainnet.base.org
BASE_RPC_SIM=https://mainnet.base.org
BASE_RPC_SEND=https://mainnet.base.org
BASE_RPC_WS=wss://base-mainnet.publicnode.com

# ═══════════════════════════════════════════════════════════════════════════════
# ARBITRUM - RPCs Públicos
# ═══════════════════════════════════════════════════════════════════════════════
ARB_RPC_READ=https://arb1.arbitrum.io/rpc
ARB_RPC_SIM=https://arb1.arbitrum.io/rpc
ARB_RPC_SEND=https://arb1.arbitrum.io/rpc
ARB_RPC_WS=wss://arbitrum-one.publicnode.com

# ═══════════════════════════════════════════════════════════════════════════════
# OPTIMISM - RPCs Públicos
# ═══════════════════════════════════════════════════════════════════════════════
OP_RPC_READ=https://mainnet.optimism.io
OP_RPC_SIM=https://mainnet.optimism.io
OP_RPC_SEND=https://mainnet.optimism.io
OP_RPC_WS=wss://optimism.publicnode.com

# ═══════════════════════════════════════════════════════════════════════════════
# POLYGON - RPCs Públicos
# ═══════════════════════════════════════════════════════════════════════════════
POLY_RPC_READ=https://polygon-rpc.com
POLY_RPC_SIM=https://polygon-rpc.com
POLY_RPC_SEND=https://polygon-rpc.com
POLY_RPC_WS=wss://polygon-bor.publicnode.com
```

### Otros RPCs públicos alternativos:

| Cadena | RPC Alternativo |
|--------|-----------------|
| Base | `https://base.llamarpc.com` |
| Arbitrum | `https://arbitrum.llamarpc.com` |
| Optimism | `https://optimism.llamarpc.com` |
| Polygon | `https://polygon.llamarpc.com` |

---

## ⚙️ Configuración del .env {#configuracion}

Crea el archivo `.env` en la raíz del proyecto:

```env
# ═══════════════════════════════════════════════════════════════════════════════
# MULTI-CHAIN MICRO ARBITRAGE BOT - CONFIGURACIÓN
# ═══════════════════════════════════════════════════════════════════════════════

# ─────────────────────────────────────────────────────────────────────────────────
# WALLET (¡NUNCA COMPARTAS ESTA CLAVE!)
# ─────────────────────────────────────────────────────────────────────────────────
PRIVATE_KEY=0xTU_CLAVE_PRIVADA_AQUI

# ─────────────────────────────────────────────────────────────────────────────────
# TIMING
# ─────────────────────────────────────────────────────────────────────────────────
TICK_MS=700
DECISION_MS=5000

# ─────────────────────────────────────────────────────────────────────────────────
# TRADING
# ─────────────────────────────────────────────────────────────────────────────────
MIN_PROFIT_USD=0.50
GAS_MULT=1.7
MAX_SLIPPAGE_BPS=10
DEADLINE_SECONDS=20

# ─────────────────────────────────────────────────────────────────────────────────
# CHAINS HABILITADAS
# ─────────────────────────────────────────────────────────────────────────────────
CHAINS=base,arbitrum,optimism,polygon

# ─────────────────────────────────────────────────────────────────────────────────
# BASE RPCs (Alchemy recomendado)
# ─────────────────────────────────────────────────────────────────────────────────
BASE_RPC_READ=https://base-mainnet.g.alchemy.com/v2/TU_API_KEY
BASE_RPC_SIM=https://base-mainnet.g.alchemy.com/v2/TU_API_KEY
BASE_RPC_SEND=https://base-mainnet.g.alchemy.com/v2/TU_API_KEY
BASE_RPC_WS=wss://base-mainnet.g.alchemy.com/v2/TU_API_KEY

# ─────────────────────────────────────────────────────────────────────────────────
# ARBITRUM RPCs
# ─────────────────────────────────────────────────────────────────────────────────
ARB_RPC_READ=https://arb-mainnet.g.alchemy.com/v2/TU_API_KEY
ARB_RPC_SIM=https://arb-mainnet.g.alchemy.com/v2/TU_API_KEY
ARB_RPC_SEND=https://arb-mainnet.g.alchemy.com/v2/TU_API_KEY
ARB_RPC_WS=wss://arb-mainnet.g.alchemy.com/v2/TU_API_KEY

# ─────────────────────────────────────────────────────────────────────────────────
# OPTIMISM RPCs
# ─────────────────────────────────────────────────────────────────────────────────
OP_RPC_READ=https://opt-mainnet.g.alchemy.com/v2/TU_API_KEY
OP_RPC_SIM=https://opt-mainnet.g.alchemy.com/v2/TU_API_KEY
OP_RPC_SEND=https://opt-mainnet.g.alchemy.com/v2/TU_API_KEY
OP_RPC_WS=wss://opt-mainnet.g.alchemy.com/v2/TU_API_KEY

# ─────────────────────────────────────────────────────────────────────────────────
# POLYGON RPCs
# ─────────────────────────────────────────────────────────────────────────────────
POLY_RPC_READ=https://polygon-mainnet.g.alchemy.com/v2/TU_API_KEY
POLY_RPC_SIM=https://polygon-mainnet.g.alchemy.com/v2/TU_API_KEY
POLY_RPC_SEND=https://polygon-mainnet.g.alchemy.com/v2/TU_API_KEY
POLY_RPC_WS=wss://polygon-mainnet.g.alchemy.com/v2/TU_API_KEY

# ─────────────────────────────────────────────────────────────────────────────────
# BLOCK EXPLORER API KEYS (para verificar contratos)
# ─────────────────────────────────────────────────────────────────────────────────
BASESCAN_API_KEY=
ARBISCAN_API_KEY=
OPSCAN_API_KEY=
POLYGONSCAN_API_KEY=

# ─────────────────────────────────────────────────────────────────────────────────
# MODO
# ─────────────────────────────────────────────────────────────────────────────────
DRY_RUN=true
LOG_LEVEL=info
```

---

## ✅ Verificar conexión {#verificar}

Ejecuta este script para verificar que todos los RPCs funcionan:

```bash
npx tsx scripts/verify-rpcs.ts
```

O manualmente:

```javascript
// scripts/verify-rpcs.ts
import { ethers } from "ethers";
import "dotenv/config";

const chains = [
  { name: "Base", rpc: process.env.BASE_RPC_READ, chainId: 8453 },
  { name: "Arbitrum", rpc: process.env.ARB_RPC_READ, chainId: 42161 },
  { name: "Optimism", rpc: process.env.OP_RPC_READ, chainId: 10 },
  { name: "Polygon", rpc: process.env.POLY_RPC_READ, chainId: 137 }
];

async function verify() {
  console.log("🔍 Verificando RPCs...\n");
  
  for (const chain of chains) {
    try {
      const provider = new ethers.JsonRpcProvider(chain.rpc);
      const network = await provider.getNetwork();
      const block = await provider.getBlockNumber();
      
      if (Number(network.chainId) === chain.chainId) {
        console.log(`✅ ${chain.name}: OK (Block #${block})`);
      } else {
        console.log(`❌ ${chain.name}: Chain ID incorrecto`);
      }
    } catch (error: any) {
      console.log(`❌ ${chain.name}: ${error.message}`);
    }
  }
}

verify();
```

---

## 📊 Resumen de pasos

### Para empezar RÁPIDO (RPCs públicos):
1. Copia el bloque de "RPCs Públicos" al `.env`
2. Agrega tu `PRIVATE_KEY`
3. Ejecuta `npm run dev`

### Para PRODUCCIÓN (Alchemy):
1. Crea cuenta en Alchemy
2. Crea 4 apps (una por cadena)
3. Copia los endpoints al `.env`
4. Agrega tu `PRIVATE_KEY`
5. Ejecuta `npm run dev`

---

## ⚠️ Notas importantes

1. **Seguridad**: NUNCA compartas tu `PRIVATE_KEY`
2. **Rate Limits**: Los RPCs públicos tienen límites (~100 req/seg)
3. **Latencia**: Alchemy/Infura tienen ~50ms, públicos ~200ms
4. **Costo**: Alchemy free tier = 300M compute units/mes
5. **WebSocket**: Necesario para actualizaciones en tiempo real

---

## 🆘 Troubleshooting

### Error: "Rate limited"
- Usa RPCs privados (Alchemy/Infura)
- Aumenta `TICK_MS` a 1000+

### Error: "Connection refused"
- Verifica que el RPC esté activo
- Prueba con un RPC alternativo

### Error: "Chain ID mismatch"
- Verifica que usas el RPC correcto para cada cadena
- Base = 8453, Arbitrum = 42161, Optimism = 10, Polygon = 137

---

¡Listo! Con esta guía puedes configurar todos los RPCs necesarios. 🚀




## 📋 Índice
1. [Resumen de lo que necesitas](#resumen)
2. [Crear RPCs en Alchemy](#alchemy)
3. [Crear RPCs en Infura](#infura)
4. [RPCs Públicos (gratuitos)](#publicos)
5. [Configuración del .env](#configuracion)
6. [Verificar conexión](#verificar)

---

## 🎯 Resumen de lo que necesitas {#resumen}

Para cada cadena necesitas **4 tipos de RPC**:

| Tipo | Uso | Prioridad |
|------|-----|-----------|
| `READ` | Leer datos (balances, precios) | Alta |
| `SIM` | Simular transacciones (eth_call) | Alta |
| `SEND` | Enviar transacciones | Crítica |
| `WS` | WebSocket (tiempo real) | Media |

### Cadenas soportadas:
- ✅ **Base** (Chain ID: 8453)
- ✅ **Arbitrum One** (Chain ID: 42161)
- ✅ **Optimism** (Chain ID: 10)
- ✅ **Polygon** (Chain ID: 137)

---

## 🔷 Opción 1: Crear RPCs en Alchemy (RECOMENDADO) {#alchemy}

### Paso 1: Crear cuenta
1. Ve a https://www.alchemy.com/
2. Click en "Get started for free"
3. Registra tu cuenta con email

### Paso 2: Crear Apps para cada cadena

#### Para BASE:
1. Dashboard → Create new app
2. **Name**: `MultiChain-Arb-Base`
3. **Chain**: Base
4. **Network**: Base Mainnet
5. Click "Create app"
6. Copia el **HTTPS** y **WSS** endpoint

#### Para ARBITRUM:
1. Dashboard → Create new app
2. **Name**: `MultiChain-Arb-Arbitrum`
3. **Chain**: Arbitrum
4. **Network**: Arbitrum Mainnet
5. Click "Create app"
6. Copia el **HTTPS** y **WSS** endpoint

#### Para OPTIMISM:
1. Dashboard → Create new app
2. **Name**: `MultiChain-Arb-Optimism`
3. **Chain**: Optimism
4. **Network**: Optimism Mainnet
5. Click "Create app"
6. Copia el **HTTPS** y **WSS** endpoint

#### Para POLYGON:
1. Dashboard → Create new app
2. **Name**: `MultiChain-Arb-Polygon`
3. **Chain**: Polygon
4. **Network**: Polygon Mainnet
5. Click "Create app"
6. Copia el **HTTPS** y **WSS** endpoint

### Formato de URLs Alchemy:
```
HTTPS: https://{chain}-mainnet.g.alchemy.com/v2/{API_KEY}
WSS:   wss://{chain}-mainnet.g.alchemy.com/v2/{API_KEY}
```

### Ejemplo real:
```env
# Base
BASE_RPC_READ=https://base-mainnet.g.alchemy.com/v2/abc123xyz
BASE_RPC_SIM=https://base-mainnet.g.alchemy.com/v2/abc123xyz
BASE_RPC_SEND=https://base-mainnet.g.alchemy.com/v2/abc123xyz
BASE_RPC_WS=wss://base-mainnet.g.alchemy.com/v2/abc123xyz

# Arbitrum
ARB_RPC_READ=https://arb-mainnet.g.alchemy.com/v2/def456uvw
ARB_RPC_SIM=https://arb-mainnet.g.alchemy.com/v2/def456uvw
ARB_RPC_SEND=https://arb-mainnet.g.alchemy.com/v2/def456uvw
ARB_RPC_WS=wss://arb-mainnet.g.alchemy.com/v2/def456uvw

# Optimism
OP_RPC_READ=https://opt-mainnet.g.alchemy.com/v2/ghi789rst
OP_RPC_SIM=https://opt-mainnet.g.alchemy.com/v2/ghi789rst
OP_RPC_SEND=https://opt-mainnet.g.alchemy.com/v2/ghi789rst
OP_RPC_WS=wss://opt-mainnet.g.alchemy.com/v2/ghi789rst

# Polygon
POLY_RPC_READ=https://polygon-mainnet.g.alchemy.com/v2/jkl012mno
POLY_RPC_SIM=https://polygon-mainnet.g.alchemy.com/v2/jkl012mno
POLY_RPC_SEND=https://polygon-mainnet.g.alchemy.com/v2/jkl012mno
POLY_RPC_WS=wss://polygon-mainnet.g.alchemy.com/v2/jkl012mno
```

### Plan gratuito de Alchemy:
- ✅ 300M compute units/mes
- ✅ Suficiente para ~10,000 operaciones/día
- ✅ WebSocket incluido

---

## 🔶 Opción 2: Crear RPCs en Infura {#infura}

### Paso 1: Crear cuenta
1. Ve a https://www.infura.io/
2. Click en "Sign Up"
3. Registra tu cuenta

### Paso 2: Crear proyecto
1. Dashboard → Create new API key
2. **Name**: `MultiChain-Arb`
3. Selecciona las redes:
   - ✅ Arbitrum
   - ✅ Optimism
   - ✅ Polygon
   - ❌ Base (no soportado en Infura)

### Formato de URLs Infura:
```
HTTPS: https://{network}.infura.io/v3/{PROJECT_ID}
WSS:   wss://{network}.infura.io/ws/v3/{PROJECT_ID}
```

### Ejemplo:
```env
# Arbitrum (Infura)
ARB_RPC_READ=https://arbitrum-mainnet.infura.io/v3/abc123
ARB_RPC_WS=wss://arbitrum-mainnet.infura.io/ws/v3/abc123

# Optimism (Infura)
OP_RPC_READ=https://optimism-mainnet.infura.io/v3/abc123
OP_RPC_WS=wss://optimism-mainnet.infura.io/ws/v3/abc123

# Polygon (Infura)
POLY_RPC_READ=https://polygon-mainnet.infura.io/v3/abc123
POLY_RPC_WS=wss://polygon-mainnet.infura.io/ws/v3/abc123
```

---

## 🆓 Opción 3: RPCs Públicos (Gratuitos) {#publicos}

⚠️ **Advertencia**: Los RPCs públicos tienen límites de rate y pueden ser lentos.
Solo usar para pruebas, NO para producción.

```env
# ═══════════════════════════════════════════════════════════════════════════════
# BASE - RPCs Públicos
# ═══════════════════════════════════════════════════════════════════════════════
BASE_RPC_READ=https://mainnet.base.org
BASE_RPC_SIM=https://mainnet.base.org
BASE_RPC_SEND=https://mainnet.base.org
BASE_RPC_WS=wss://base-mainnet.publicnode.com

# ═══════════════════════════════════════════════════════════════════════════════
# ARBITRUM - RPCs Públicos
# ═══════════════════════════════════════════════════════════════════════════════
ARB_RPC_READ=https://arb1.arbitrum.io/rpc
ARB_RPC_SIM=https://arb1.arbitrum.io/rpc
ARB_RPC_SEND=https://arb1.arbitrum.io/rpc
ARB_RPC_WS=wss://arbitrum-one.publicnode.com

# ═══════════════════════════════════════════════════════════════════════════════
# OPTIMISM - RPCs Públicos
# ═══════════════════════════════════════════════════════════════════════════════
OP_RPC_READ=https://mainnet.optimism.io
OP_RPC_SIM=https://mainnet.optimism.io
OP_RPC_SEND=https://mainnet.optimism.io
OP_RPC_WS=wss://optimism.publicnode.com

# ═══════════════════════════════════════════════════════════════════════════════
# POLYGON - RPCs Públicos
# ═══════════════════════════════════════════════════════════════════════════════
POLY_RPC_READ=https://polygon-rpc.com
POLY_RPC_SIM=https://polygon-rpc.com
POLY_RPC_SEND=https://polygon-rpc.com
POLY_RPC_WS=wss://polygon-bor.publicnode.com
```

### Otros RPCs públicos alternativos:

| Cadena | RPC Alternativo |
|--------|-----------------|
| Base | `https://base.llamarpc.com` |
| Arbitrum | `https://arbitrum.llamarpc.com` |
| Optimism | `https://optimism.llamarpc.com` |
| Polygon | `https://polygon.llamarpc.com` |

---

## ⚙️ Configuración del .env {#configuracion}

Crea el archivo `.env` en la raíz del proyecto:

```env
# ═══════════════════════════════════════════════════════════════════════════════
# MULTI-CHAIN MICRO ARBITRAGE BOT - CONFIGURACIÓN
# ═══════════════════════════════════════════════════════════════════════════════

# ─────────────────────────────────────────────────────────────────────────────────
# WALLET (¡NUNCA COMPARTAS ESTA CLAVE!)
# ─────────────────────────────────────────────────────────────────────────────────
PRIVATE_KEY=0xTU_CLAVE_PRIVADA_AQUI

# ─────────────────────────────────────────────────────────────────────────────────
# TIMING
# ─────────────────────────────────────────────────────────────────────────────────
TICK_MS=700
DECISION_MS=5000

# ─────────────────────────────────────────────────────────────────────────────────
# TRADING
# ─────────────────────────────────────────────────────────────────────────────────
MIN_PROFIT_USD=0.50
GAS_MULT=1.7
MAX_SLIPPAGE_BPS=10
DEADLINE_SECONDS=20

# ─────────────────────────────────────────────────────────────────────────────────
# CHAINS HABILITADAS
# ─────────────────────────────────────────────────────────────────────────────────
CHAINS=base,arbitrum,optimism,polygon

# ─────────────────────────────────────────────────────────────────────────────────
# BASE RPCs (Alchemy recomendado)
# ─────────────────────────────────────────────────────────────────────────────────
BASE_RPC_READ=https://base-mainnet.g.alchemy.com/v2/TU_API_KEY
BASE_RPC_SIM=https://base-mainnet.g.alchemy.com/v2/TU_API_KEY
BASE_RPC_SEND=https://base-mainnet.g.alchemy.com/v2/TU_API_KEY
BASE_RPC_WS=wss://base-mainnet.g.alchemy.com/v2/TU_API_KEY

# ─────────────────────────────────────────────────────────────────────────────────
# ARBITRUM RPCs
# ─────────────────────────────────────────────────────────────────────────────────
ARB_RPC_READ=https://arb-mainnet.g.alchemy.com/v2/TU_API_KEY
ARB_RPC_SIM=https://arb-mainnet.g.alchemy.com/v2/TU_API_KEY
ARB_RPC_SEND=https://arb-mainnet.g.alchemy.com/v2/TU_API_KEY
ARB_RPC_WS=wss://arb-mainnet.g.alchemy.com/v2/TU_API_KEY

# ─────────────────────────────────────────────────────────────────────────────────
# OPTIMISM RPCs
# ─────────────────────────────────────────────────────────────────────────────────
OP_RPC_READ=https://opt-mainnet.g.alchemy.com/v2/TU_API_KEY
OP_RPC_SIM=https://opt-mainnet.g.alchemy.com/v2/TU_API_KEY
OP_RPC_SEND=https://opt-mainnet.g.alchemy.com/v2/TU_API_KEY
OP_RPC_WS=wss://opt-mainnet.g.alchemy.com/v2/TU_API_KEY

# ─────────────────────────────────────────────────────────────────────────────────
# POLYGON RPCs
# ─────────────────────────────────────────────────────────────────────────────────
POLY_RPC_READ=https://polygon-mainnet.g.alchemy.com/v2/TU_API_KEY
POLY_RPC_SIM=https://polygon-mainnet.g.alchemy.com/v2/TU_API_KEY
POLY_RPC_SEND=https://polygon-mainnet.g.alchemy.com/v2/TU_API_KEY
POLY_RPC_WS=wss://polygon-mainnet.g.alchemy.com/v2/TU_API_KEY

# ─────────────────────────────────────────────────────────────────────────────────
# BLOCK EXPLORER API KEYS (para verificar contratos)
# ─────────────────────────────────────────────────────────────────────────────────
BASESCAN_API_KEY=
ARBISCAN_API_KEY=
OPSCAN_API_KEY=
POLYGONSCAN_API_KEY=

# ─────────────────────────────────────────────────────────────────────────────────
# MODO
# ─────────────────────────────────────────────────────────────────────────────────
DRY_RUN=true
LOG_LEVEL=info
```

---

## ✅ Verificar conexión {#verificar}

Ejecuta este script para verificar que todos los RPCs funcionan:

```bash
npx tsx scripts/verify-rpcs.ts
```

O manualmente:

```javascript
// scripts/verify-rpcs.ts
import { ethers } from "ethers";
import "dotenv/config";

const chains = [
  { name: "Base", rpc: process.env.BASE_RPC_READ, chainId: 8453 },
  { name: "Arbitrum", rpc: process.env.ARB_RPC_READ, chainId: 42161 },
  { name: "Optimism", rpc: process.env.OP_RPC_READ, chainId: 10 },
  { name: "Polygon", rpc: process.env.POLY_RPC_READ, chainId: 137 }
];

async function verify() {
  console.log("🔍 Verificando RPCs...\n");
  
  for (const chain of chains) {
    try {
      const provider = new ethers.JsonRpcProvider(chain.rpc);
      const network = await provider.getNetwork();
      const block = await provider.getBlockNumber();
      
      if (Number(network.chainId) === chain.chainId) {
        console.log(`✅ ${chain.name}: OK (Block #${block})`);
      } else {
        console.log(`❌ ${chain.name}: Chain ID incorrecto`);
      }
    } catch (error: any) {
      console.log(`❌ ${chain.name}: ${error.message}`);
    }
  }
}

verify();
```

---

## 📊 Resumen de pasos

### Para empezar RÁPIDO (RPCs públicos):
1. Copia el bloque de "RPCs Públicos" al `.env`
2. Agrega tu `PRIVATE_KEY`
3. Ejecuta `npm run dev`

### Para PRODUCCIÓN (Alchemy):
1. Crea cuenta en Alchemy
2. Crea 4 apps (una por cadena)
3. Copia los endpoints al `.env`
4. Agrega tu `PRIVATE_KEY`
5. Ejecuta `npm run dev`

---

## ⚠️ Notas importantes

1. **Seguridad**: NUNCA compartas tu `PRIVATE_KEY`
2. **Rate Limits**: Los RPCs públicos tienen límites (~100 req/seg)
3. **Latencia**: Alchemy/Infura tienen ~50ms, públicos ~200ms
4. **Costo**: Alchemy free tier = 300M compute units/mes
5. **WebSocket**: Necesario para actualizaciones en tiempo real

---

## 🆘 Troubleshooting

### Error: "Rate limited"
- Usa RPCs privados (Alchemy/Infura)
- Aumenta `TICK_MS` a 1000+

### Error: "Connection refused"
- Verifica que el RPC esté activo
- Prueba con un RPC alternativo

### Error: "Chain ID mismatch"
- Verifica que usas el RPC correcto para cada cadena
- Base = 8453, Arbitrum = 42161, Optimism = 10, Polygon = 137

---

¡Listo! Con esta guía puedes configurar todos los RPCs necesarios. 🚀



## 📋 Índice
1. [Resumen de lo que necesitas](#resumen)
2. [Crear RPCs en Alchemy](#alchemy)
3. [Crear RPCs en Infura](#infura)
4. [RPCs Públicos (gratuitos)](#publicos)
5. [Configuración del .env](#configuracion)
6. [Verificar conexión](#verificar)

---

## 🎯 Resumen de lo que necesitas {#resumen}

Para cada cadena necesitas **4 tipos de RPC**:

| Tipo | Uso | Prioridad |
|------|-----|-----------|
| `READ` | Leer datos (balances, precios) | Alta |
| `SIM` | Simular transacciones (eth_call) | Alta |
| `SEND` | Enviar transacciones | Crítica |
| `WS` | WebSocket (tiempo real) | Media |

### Cadenas soportadas:
- ✅ **Base** (Chain ID: 8453)
- ✅ **Arbitrum One** (Chain ID: 42161)
- ✅ **Optimism** (Chain ID: 10)
- ✅ **Polygon** (Chain ID: 137)

---

## 🔷 Opción 1: Crear RPCs en Alchemy (RECOMENDADO) {#alchemy}

### Paso 1: Crear cuenta
1. Ve a https://www.alchemy.com/
2. Click en "Get started for free"
3. Registra tu cuenta con email

### Paso 2: Crear Apps para cada cadena

#### Para BASE:
1. Dashboard → Create new app
2. **Name**: `MultiChain-Arb-Base`
3. **Chain**: Base
4. **Network**: Base Mainnet
5. Click "Create app"
6. Copia el **HTTPS** y **WSS** endpoint

#### Para ARBITRUM:
1. Dashboard → Create new app
2. **Name**: `MultiChain-Arb-Arbitrum`
3. **Chain**: Arbitrum
4. **Network**: Arbitrum Mainnet
5. Click "Create app"
6. Copia el **HTTPS** y **WSS** endpoint

#### Para OPTIMISM:
1. Dashboard → Create new app
2. **Name**: `MultiChain-Arb-Optimism`
3. **Chain**: Optimism
4. **Network**: Optimism Mainnet
5. Click "Create app"
6. Copia el **HTTPS** y **WSS** endpoint

#### Para POLYGON:
1. Dashboard → Create new app
2. **Name**: `MultiChain-Arb-Polygon`
3. **Chain**: Polygon
4. **Network**: Polygon Mainnet
5. Click "Create app"
6. Copia el **HTTPS** y **WSS** endpoint

### Formato de URLs Alchemy:
```
HTTPS: https://{chain}-mainnet.g.alchemy.com/v2/{API_KEY}
WSS:   wss://{chain}-mainnet.g.alchemy.com/v2/{API_KEY}
```

### Ejemplo real:
```env
# Base
BASE_RPC_READ=https://base-mainnet.g.alchemy.com/v2/abc123xyz
BASE_RPC_SIM=https://base-mainnet.g.alchemy.com/v2/abc123xyz
BASE_RPC_SEND=https://base-mainnet.g.alchemy.com/v2/abc123xyz
BASE_RPC_WS=wss://base-mainnet.g.alchemy.com/v2/abc123xyz

# Arbitrum
ARB_RPC_READ=https://arb-mainnet.g.alchemy.com/v2/def456uvw
ARB_RPC_SIM=https://arb-mainnet.g.alchemy.com/v2/def456uvw
ARB_RPC_SEND=https://arb-mainnet.g.alchemy.com/v2/def456uvw
ARB_RPC_WS=wss://arb-mainnet.g.alchemy.com/v2/def456uvw

# Optimism
OP_RPC_READ=https://opt-mainnet.g.alchemy.com/v2/ghi789rst
OP_RPC_SIM=https://opt-mainnet.g.alchemy.com/v2/ghi789rst
OP_RPC_SEND=https://opt-mainnet.g.alchemy.com/v2/ghi789rst
OP_RPC_WS=wss://opt-mainnet.g.alchemy.com/v2/ghi789rst

# Polygon
POLY_RPC_READ=https://polygon-mainnet.g.alchemy.com/v2/jkl012mno
POLY_RPC_SIM=https://polygon-mainnet.g.alchemy.com/v2/jkl012mno
POLY_RPC_SEND=https://polygon-mainnet.g.alchemy.com/v2/jkl012mno
POLY_RPC_WS=wss://polygon-mainnet.g.alchemy.com/v2/jkl012mno
```

### Plan gratuito de Alchemy:
- ✅ 300M compute units/mes
- ✅ Suficiente para ~10,000 operaciones/día
- ✅ WebSocket incluido

---

## 🔶 Opción 2: Crear RPCs en Infura {#infura}

### Paso 1: Crear cuenta
1. Ve a https://www.infura.io/
2. Click en "Sign Up"
3. Registra tu cuenta

### Paso 2: Crear proyecto
1. Dashboard → Create new API key
2. **Name**: `MultiChain-Arb`
3. Selecciona las redes:
   - ✅ Arbitrum
   - ✅ Optimism
   - ✅ Polygon
   - ❌ Base (no soportado en Infura)

### Formato de URLs Infura:
```
HTTPS: https://{network}.infura.io/v3/{PROJECT_ID}
WSS:   wss://{network}.infura.io/ws/v3/{PROJECT_ID}
```

### Ejemplo:
```env
# Arbitrum (Infura)
ARB_RPC_READ=https://arbitrum-mainnet.infura.io/v3/abc123
ARB_RPC_WS=wss://arbitrum-mainnet.infura.io/ws/v3/abc123

# Optimism (Infura)
OP_RPC_READ=https://optimism-mainnet.infura.io/v3/abc123
OP_RPC_WS=wss://optimism-mainnet.infura.io/ws/v3/abc123

# Polygon (Infura)
POLY_RPC_READ=https://polygon-mainnet.infura.io/v3/abc123
POLY_RPC_WS=wss://polygon-mainnet.infura.io/ws/v3/abc123
```

---

## 🆓 Opción 3: RPCs Públicos (Gratuitos) {#publicos}

⚠️ **Advertencia**: Los RPCs públicos tienen límites de rate y pueden ser lentos.
Solo usar para pruebas, NO para producción.

```env
# ═══════════════════════════════════════════════════════════════════════════════
# BASE - RPCs Públicos
# ═══════════════════════════════════════════════════════════════════════════════
BASE_RPC_READ=https://mainnet.base.org
BASE_RPC_SIM=https://mainnet.base.org
BASE_RPC_SEND=https://mainnet.base.org
BASE_RPC_WS=wss://base-mainnet.publicnode.com

# ═══════════════════════════════════════════════════════════════════════════════
# ARBITRUM - RPCs Públicos
# ═══════════════════════════════════════════════════════════════════════════════
ARB_RPC_READ=https://arb1.arbitrum.io/rpc
ARB_RPC_SIM=https://arb1.arbitrum.io/rpc
ARB_RPC_SEND=https://arb1.arbitrum.io/rpc
ARB_RPC_WS=wss://arbitrum-one.publicnode.com

# ═══════════════════════════════════════════════════════════════════════════════
# OPTIMISM - RPCs Públicos
# ═══════════════════════════════════════════════════════════════════════════════
OP_RPC_READ=https://mainnet.optimism.io
OP_RPC_SIM=https://mainnet.optimism.io
OP_RPC_SEND=https://mainnet.optimism.io
OP_RPC_WS=wss://optimism.publicnode.com

# ═══════════════════════════════════════════════════════════════════════════════
# POLYGON - RPCs Públicos
# ═══════════════════════════════════════════════════════════════════════════════
POLY_RPC_READ=https://polygon-rpc.com
POLY_RPC_SIM=https://polygon-rpc.com
POLY_RPC_SEND=https://polygon-rpc.com
POLY_RPC_WS=wss://polygon-bor.publicnode.com
```

### Otros RPCs públicos alternativos:

| Cadena | RPC Alternativo |
|--------|-----------------|
| Base | `https://base.llamarpc.com` |
| Arbitrum | `https://arbitrum.llamarpc.com` |
| Optimism | `https://optimism.llamarpc.com` |
| Polygon | `https://polygon.llamarpc.com` |

---

## ⚙️ Configuración del .env {#configuracion}

Crea el archivo `.env` en la raíz del proyecto:

```env
# ═══════════════════════════════════════════════════════════════════════════════
# MULTI-CHAIN MICRO ARBITRAGE BOT - CONFIGURACIÓN
# ═══════════════════════════════════════════════════════════════════════════════

# ─────────────────────────────────────────────────────────────────────────────────
# WALLET (¡NUNCA COMPARTAS ESTA CLAVE!)
# ─────────────────────────────────────────────────────────────────────────────────
PRIVATE_KEY=0xTU_CLAVE_PRIVADA_AQUI

# ─────────────────────────────────────────────────────────────────────────────────
# TIMING
# ─────────────────────────────────────────────────────────────────────────────────
TICK_MS=700
DECISION_MS=5000

# ─────────────────────────────────────────────────────────────────────────────────
# TRADING
# ─────────────────────────────────────────────────────────────────────────────────
MIN_PROFIT_USD=0.50
GAS_MULT=1.7
MAX_SLIPPAGE_BPS=10
DEADLINE_SECONDS=20

# ─────────────────────────────────────────────────────────────────────────────────
# CHAINS HABILITADAS
# ─────────────────────────────────────────────────────────────────────────────────
CHAINS=base,arbitrum,optimism,polygon

# ─────────────────────────────────────────────────────────────────────────────────
# BASE RPCs (Alchemy recomendado)
# ─────────────────────────────────────────────────────────────────────────────────
BASE_RPC_READ=https://base-mainnet.g.alchemy.com/v2/TU_API_KEY
BASE_RPC_SIM=https://base-mainnet.g.alchemy.com/v2/TU_API_KEY
BASE_RPC_SEND=https://base-mainnet.g.alchemy.com/v2/TU_API_KEY
BASE_RPC_WS=wss://base-mainnet.g.alchemy.com/v2/TU_API_KEY

# ─────────────────────────────────────────────────────────────────────────────────
# ARBITRUM RPCs
# ─────────────────────────────────────────────────────────────────────────────────
ARB_RPC_READ=https://arb-mainnet.g.alchemy.com/v2/TU_API_KEY
ARB_RPC_SIM=https://arb-mainnet.g.alchemy.com/v2/TU_API_KEY
ARB_RPC_SEND=https://arb-mainnet.g.alchemy.com/v2/TU_API_KEY
ARB_RPC_WS=wss://arb-mainnet.g.alchemy.com/v2/TU_API_KEY

# ─────────────────────────────────────────────────────────────────────────────────
# OPTIMISM RPCs
# ─────────────────────────────────────────────────────────────────────────────────
OP_RPC_READ=https://opt-mainnet.g.alchemy.com/v2/TU_API_KEY
OP_RPC_SIM=https://opt-mainnet.g.alchemy.com/v2/TU_API_KEY
OP_RPC_SEND=https://opt-mainnet.g.alchemy.com/v2/TU_API_KEY
OP_RPC_WS=wss://opt-mainnet.g.alchemy.com/v2/TU_API_KEY

# ─────────────────────────────────────────────────────────────────────────────────
# POLYGON RPCs
# ─────────────────────────────────────────────────────────────────────────────────
POLY_RPC_READ=https://polygon-mainnet.g.alchemy.com/v2/TU_API_KEY
POLY_RPC_SIM=https://polygon-mainnet.g.alchemy.com/v2/TU_API_KEY
POLY_RPC_SEND=https://polygon-mainnet.g.alchemy.com/v2/TU_API_KEY
POLY_RPC_WS=wss://polygon-mainnet.g.alchemy.com/v2/TU_API_KEY

# ─────────────────────────────────────────────────────────────────────────────────
# BLOCK EXPLORER API KEYS (para verificar contratos)
# ─────────────────────────────────────────────────────────────────────────────────
BASESCAN_API_KEY=
ARBISCAN_API_KEY=
OPSCAN_API_KEY=
POLYGONSCAN_API_KEY=

# ─────────────────────────────────────────────────────────────────────────────────
# MODO
# ─────────────────────────────────────────────────────────────────────────────────
DRY_RUN=true
LOG_LEVEL=info
```

---

## ✅ Verificar conexión {#verificar}

Ejecuta este script para verificar que todos los RPCs funcionan:

```bash
npx tsx scripts/verify-rpcs.ts
```

O manualmente:

```javascript
// scripts/verify-rpcs.ts
import { ethers } from "ethers";
import "dotenv/config";

const chains = [
  { name: "Base", rpc: process.env.BASE_RPC_READ, chainId: 8453 },
  { name: "Arbitrum", rpc: process.env.ARB_RPC_READ, chainId: 42161 },
  { name: "Optimism", rpc: process.env.OP_RPC_READ, chainId: 10 },
  { name: "Polygon", rpc: process.env.POLY_RPC_READ, chainId: 137 }
];

async function verify() {
  console.log("🔍 Verificando RPCs...\n");
  
  for (const chain of chains) {
    try {
      const provider = new ethers.JsonRpcProvider(chain.rpc);
      const network = await provider.getNetwork();
      const block = await provider.getBlockNumber();
      
      if (Number(network.chainId) === chain.chainId) {
        console.log(`✅ ${chain.name}: OK (Block #${block})`);
      } else {
        console.log(`❌ ${chain.name}: Chain ID incorrecto`);
      }
    } catch (error: any) {
      console.log(`❌ ${chain.name}: ${error.message}`);
    }
  }
}

verify();
```

---

## 📊 Resumen de pasos

### Para empezar RÁPIDO (RPCs públicos):
1. Copia el bloque de "RPCs Públicos" al `.env`
2. Agrega tu `PRIVATE_KEY`
3. Ejecuta `npm run dev`

### Para PRODUCCIÓN (Alchemy):
1. Crea cuenta en Alchemy
2. Crea 4 apps (una por cadena)
3. Copia los endpoints al `.env`
4. Agrega tu `PRIVATE_KEY`
5. Ejecuta `npm run dev`

---

## ⚠️ Notas importantes

1. **Seguridad**: NUNCA compartas tu `PRIVATE_KEY`
2. **Rate Limits**: Los RPCs públicos tienen límites (~100 req/seg)
3. **Latencia**: Alchemy/Infura tienen ~50ms, públicos ~200ms
4. **Costo**: Alchemy free tier = 300M compute units/mes
5. **WebSocket**: Necesario para actualizaciones en tiempo real

---

## 🆘 Troubleshooting

### Error: "Rate limited"
- Usa RPCs privados (Alchemy/Infura)
- Aumenta `TICK_MS` a 1000+

### Error: "Connection refused"
- Verifica que el RPC esté activo
- Prueba con un RPC alternativo

### Error: "Chain ID mismatch"
- Verifica que usas el RPC correcto para cada cadena
- Base = 8453, Arbitrum = 42161, Optimism = 10, Polygon = 137

---

¡Listo! Con esta guía puedes configurar todos los RPCs necesarios. 🚀



## 📋 Índice
1. [Resumen de lo que necesitas](#resumen)
2. [Crear RPCs en Alchemy](#alchemy)
3. [Crear RPCs en Infura](#infura)
4. [RPCs Públicos (gratuitos)](#publicos)
5. [Configuración del .env](#configuracion)
6. [Verificar conexión](#verificar)

---

## 🎯 Resumen de lo que necesitas {#resumen}

Para cada cadena necesitas **4 tipos de RPC**:

| Tipo | Uso | Prioridad |
|------|-----|-----------|
| `READ` | Leer datos (balances, precios) | Alta |
| `SIM` | Simular transacciones (eth_call) | Alta |
| `SEND` | Enviar transacciones | Crítica |
| `WS` | WebSocket (tiempo real) | Media |

### Cadenas soportadas:
- ✅ **Base** (Chain ID: 8453)
- ✅ **Arbitrum One** (Chain ID: 42161)
- ✅ **Optimism** (Chain ID: 10)
- ✅ **Polygon** (Chain ID: 137)

---

## 🔷 Opción 1: Crear RPCs en Alchemy (RECOMENDADO) {#alchemy}

### Paso 1: Crear cuenta
1. Ve a https://www.alchemy.com/
2. Click en "Get started for free"
3. Registra tu cuenta con email

### Paso 2: Crear Apps para cada cadena

#### Para BASE:
1. Dashboard → Create new app
2. **Name**: `MultiChain-Arb-Base`
3. **Chain**: Base
4. **Network**: Base Mainnet
5. Click "Create app"
6. Copia el **HTTPS** y **WSS** endpoint

#### Para ARBITRUM:
1. Dashboard → Create new app
2. **Name**: `MultiChain-Arb-Arbitrum`
3. **Chain**: Arbitrum
4. **Network**: Arbitrum Mainnet
5. Click "Create app"
6. Copia el **HTTPS** y **WSS** endpoint

#### Para OPTIMISM:
1. Dashboard → Create new app
2. **Name**: `MultiChain-Arb-Optimism`
3. **Chain**: Optimism
4. **Network**: Optimism Mainnet
5. Click "Create app"
6. Copia el **HTTPS** y **WSS** endpoint

#### Para POLYGON:
1. Dashboard → Create new app
2. **Name**: `MultiChain-Arb-Polygon`
3. **Chain**: Polygon
4. **Network**: Polygon Mainnet
5. Click "Create app"
6. Copia el **HTTPS** y **WSS** endpoint

### Formato de URLs Alchemy:
```
HTTPS: https://{chain}-mainnet.g.alchemy.com/v2/{API_KEY}
WSS:   wss://{chain}-mainnet.g.alchemy.com/v2/{API_KEY}
```

### Ejemplo real:
```env
# Base
BASE_RPC_READ=https://base-mainnet.g.alchemy.com/v2/abc123xyz
BASE_RPC_SIM=https://base-mainnet.g.alchemy.com/v2/abc123xyz
BASE_RPC_SEND=https://base-mainnet.g.alchemy.com/v2/abc123xyz
BASE_RPC_WS=wss://base-mainnet.g.alchemy.com/v2/abc123xyz

# Arbitrum
ARB_RPC_READ=https://arb-mainnet.g.alchemy.com/v2/def456uvw
ARB_RPC_SIM=https://arb-mainnet.g.alchemy.com/v2/def456uvw
ARB_RPC_SEND=https://arb-mainnet.g.alchemy.com/v2/def456uvw
ARB_RPC_WS=wss://arb-mainnet.g.alchemy.com/v2/def456uvw

# Optimism
OP_RPC_READ=https://opt-mainnet.g.alchemy.com/v2/ghi789rst
OP_RPC_SIM=https://opt-mainnet.g.alchemy.com/v2/ghi789rst
OP_RPC_SEND=https://opt-mainnet.g.alchemy.com/v2/ghi789rst
OP_RPC_WS=wss://opt-mainnet.g.alchemy.com/v2/ghi789rst

# Polygon
POLY_RPC_READ=https://polygon-mainnet.g.alchemy.com/v2/jkl012mno
POLY_RPC_SIM=https://polygon-mainnet.g.alchemy.com/v2/jkl012mno
POLY_RPC_SEND=https://polygon-mainnet.g.alchemy.com/v2/jkl012mno
POLY_RPC_WS=wss://polygon-mainnet.g.alchemy.com/v2/jkl012mno
```

### Plan gratuito de Alchemy:
- ✅ 300M compute units/mes
- ✅ Suficiente para ~10,000 operaciones/día
- ✅ WebSocket incluido

---

## 🔶 Opción 2: Crear RPCs en Infura {#infura}

### Paso 1: Crear cuenta
1. Ve a https://www.infura.io/
2. Click en "Sign Up"
3. Registra tu cuenta

### Paso 2: Crear proyecto
1. Dashboard → Create new API key
2. **Name**: `MultiChain-Arb`
3. Selecciona las redes:
   - ✅ Arbitrum
   - ✅ Optimism
   - ✅ Polygon
   - ❌ Base (no soportado en Infura)

### Formato de URLs Infura:
```
HTTPS: https://{network}.infura.io/v3/{PROJECT_ID}
WSS:   wss://{network}.infura.io/ws/v3/{PROJECT_ID}
```

### Ejemplo:
```env
# Arbitrum (Infura)
ARB_RPC_READ=https://arbitrum-mainnet.infura.io/v3/abc123
ARB_RPC_WS=wss://arbitrum-mainnet.infura.io/ws/v3/abc123

# Optimism (Infura)
OP_RPC_READ=https://optimism-mainnet.infura.io/v3/abc123
OP_RPC_WS=wss://optimism-mainnet.infura.io/ws/v3/abc123

# Polygon (Infura)
POLY_RPC_READ=https://polygon-mainnet.infura.io/v3/abc123
POLY_RPC_WS=wss://polygon-mainnet.infura.io/ws/v3/abc123
```

---

## 🆓 Opción 3: RPCs Públicos (Gratuitos) {#publicos}

⚠️ **Advertencia**: Los RPCs públicos tienen límites de rate y pueden ser lentos.
Solo usar para pruebas, NO para producción.

```env
# ═══════════════════════════════════════════════════════════════════════════════
# BASE - RPCs Públicos
# ═══════════════════════════════════════════════════════════════════════════════
BASE_RPC_READ=https://mainnet.base.org
BASE_RPC_SIM=https://mainnet.base.org
BASE_RPC_SEND=https://mainnet.base.org
BASE_RPC_WS=wss://base-mainnet.publicnode.com

# ═══════════════════════════════════════════════════════════════════════════════
# ARBITRUM - RPCs Públicos
# ═══════════════════════════════════════════════════════════════════════════════
ARB_RPC_READ=https://arb1.arbitrum.io/rpc
ARB_RPC_SIM=https://arb1.arbitrum.io/rpc
ARB_RPC_SEND=https://arb1.arbitrum.io/rpc
ARB_RPC_WS=wss://arbitrum-one.publicnode.com

# ═══════════════════════════════════════════════════════════════════════════════
# OPTIMISM - RPCs Públicos
# ═══════════════════════════════════════════════════════════════════════════════
OP_RPC_READ=https://mainnet.optimism.io
OP_RPC_SIM=https://mainnet.optimism.io
OP_RPC_SEND=https://mainnet.optimism.io
OP_RPC_WS=wss://optimism.publicnode.com

# ═══════════════════════════════════════════════════════════════════════════════
# POLYGON - RPCs Públicos
# ═══════════════════════════════════════════════════════════════════════════════
POLY_RPC_READ=https://polygon-rpc.com
POLY_RPC_SIM=https://polygon-rpc.com
POLY_RPC_SEND=https://polygon-rpc.com
POLY_RPC_WS=wss://polygon-bor.publicnode.com
```

### Otros RPCs públicos alternativos:

| Cadena | RPC Alternativo |
|--------|-----------------|
| Base | `https://base.llamarpc.com` |
| Arbitrum | `https://arbitrum.llamarpc.com` |
| Optimism | `https://optimism.llamarpc.com` |
| Polygon | `https://polygon.llamarpc.com` |

---

## ⚙️ Configuración del .env {#configuracion}

Crea el archivo `.env` en la raíz del proyecto:

```env
# ═══════════════════════════════════════════════════════════════════════════════
# MULTI-CHAIN MICRO ARBITRAGE BOT - CONFIGURACIÓN
# ═══════════════════════════════════════════════════════════════════════════════

# ─────────────────────────────────────────────────────────────────────────────────
# WALLET (¡NUNCA COMPARTAS ESTA CLAVE!)
# ─────────────────────────────────────────────────────────────────────────────────
PRIVATE_KEY=0xTU_CLAVE_PRIVADA_AQUI

# ─────────────────────────────────────────────────────────────────────────────────
# TIMING
# ─────────────────────────────────────────────────────────────────────────────────
TICK_MS=700
DECISION_MS=5000

# ─────────────────────────────────────────────────────────────────────────────────
# TRADING
# ─────────────────────────────────────────────────────────────────────────────────
MIN_PROFIT_USD=0.50
GAS_MULT=1.7
MAX_SLIPPAGE_BPS=10
DEADLINE_SECONDS=20

# ─────────────────────────────────────────────────────────────────────────────────
# CHAINS HABILITADAS
# ─────────────────────────────────────────────────────────────────────────────────
CHAINS=base,arbitrum,optimism,polygon

# ─────────────────────────────────────────────────────────────────────────────────
# BASE RPCs (Alchemy recomendado)
# ─────────────────────────────────────────────────────────────────────────────────
BASE_RPC_READ=https://base-mainnet.g.alchemy.com/v2/TU_API_KEY
BASE_RPC_SIM=https://base-mainnet.g.alchemy.com/v2/TU_API_KEY
BASE_RPC_SEND=https://base-mainnet.g.alchemy.com/v2/TU_API_KEY
BASE_RPC_WS=wss://base-mainnet.g.alchemy.com/v2/TU_API_KEY

# ─────────────────────────────────────────────────────────────────────────────────
# ARBITRUM RPCs
# ─────────────────────────────────────────────────────────────────────────────────
ARB_RPC_READ=https://arb-mainnet.g.alchemy.com/v2/TU_API_KEY
ARB_RPC_SIM=https://arb-mainnet.g.alchemy.com/v2/TU_API_KEY
ARB_RPC_SEND=https://arb-mainnet.g.alchemy.com/v2/TU_API_KEY
ARB_RPC_WS=wss://arb-mainnet.g.alchemy.com/v2/TU_API_KEY

# ─────────────────────────────────────────────────────────────────────────────────
# OPTIMISM RPCs
# ─────────────────────────────────────────────────────────────────────────────────
OP_RPC_READ=https://opt-mainnet.g.alchemy.com/v2/TU_API_KEY
OP_RPC_SIM=https://opt-mainnet.g.alchemy.com/v2/TU_API_KEY
OP_RPC_SEND=https://opt-mainnet.g.alchemy.com/v2/TU_API_KEY
OP_RPC_WS=wss://opt-mainnet.g.alchemy.com/v2/TU_API_KEY

# ─────────────────────────────────────────────────────────────────────────────────
# POLYGON RPCs
# ─────────────────────────────────────────────────────────────────────────────────
POLY_RPC_READ=https://polygon-mainnet.g.alchemy.com/v2/TU_API_KEY
POLY_RPC_SIM=https://polygon-mainnet.g.alchemy.com/v2/TU_API_KEY
POLY_RPC_SEND=https://polygon-mainnet.g.alchemy.com/v2/TU_API_KEY
POLY_RPC_WS=wss://polygon-mainnet.g.alchemy.com/v2/TU_API_KEY

# ─────────────────────────────────────────────────────────────────────────────────
# BLOCK EXPLORER API KEYS (para verificar contratos)
# ─────────────────────────────────────────────────────────────────────────────────
BASESCAN_API_KEY=
ARBISCAN_API_KEY=
OPSCAN_API_KEY=
POLYGONSCAN_API_KEY=

# ─────────────────────────────────────────────────────────────────────────────────
# MODO
# ─────────────────────────────────────────────────────────────────────────────────
DRY_RUN=true
LOG_LEVEL=info
```

---

## ✅ Verificar conexión {#verificar}

Ejecuta este script para verificar que todos los RPCs funcionan:

```bash
npx tsx scripts/verify-rpcs.ts
```

O manualmente:

```javascript
// scripts/verify-rpcs.ts
import { ethers } from "ethers";
import "dotenv/config";

const chains = [
  { name: "Base", rpc: process.env.BASE_RPC_READ, chainId: 8453 },
  { name: "Arbitrum", rpc: process.env.ARB_RPC_READ, chainId: 42161 },
  { name: "Optimism", rpc: process.env.OP_RPC_READ, chainId: 10 },
  { name: "Polygon", rpc: process.env.POLY_RPC_READ, chainId: 137 }
];

async function verify() {
  console.log("🔍 Verificando RPCs...\n");
  
  for (const chain of chains) {
    try {
      const provider = new ethers.JsonRpcProvider(chain.rpc);
      const network = await provider.getNetwork();
      const block = await provider.getBlockNumber();
      
      if (Number(network.chainId) === chain.chainId) {
        console.log(`✅ ${chain.name}: OK (Block #${block})`);
      } else {
        console.log(`❌ ${chain.name}: Chain ID incorrecto`);
      }
    } catch (error: any) {
      console.log(`❌ ${chain.name}: ${error.message}`);
    }
  }
}

verify();
```

---

## 📊 Resumen de pasos

### Para empezar RÁPIDO (RPCs públicos):
1. Copia el bloque de "RPCs Públicos" al `.env`
2. Agrega tu `PRIVATE_KEY`
3. Ejecuta `npm run dev`

### Para PRODUCCIÓN (Alchemy):
1. Crea cuenta en Alchemy
2. Crea 4 apps (una por cadena)
3. Copia los endpoints al `.env`
4. Agrega tu `PRIVATE_KEY`
5. Ejecuta `npm run dev`

---

## ⚠️ Notas importantes

1. **Seguridad**: NUNCA compartas tu `PRIVATE_KEY`
2. **Rate Limits**: Los RPCs públicos tienen límites (~100 req/seg)
3. **Latencia**: Alchemy/Infura tienen ~50ms, públicos ~200ms
4. **Costo**: Alchemy free tier = 300M compute units/mes
5. **WebSocket**: Necesario para actualizaciones en tiempo real

---

## 🆘 Troubleshooting

### Error: "Rate limited"
- Usa RPCs privados (Alchemy/Infura)
- Aumenta `TICK_MS` a 1000+

### Error: "Connection refused"
- Verifica que el RPC esté activo
- Prueba con un RPC alternativo

### Error: "Chain ID mismatch"
- Verifica que usas el RPC correcto para cada cadena
- Base = 8453, Arbitrum = 42161, Optimism = 10, Polygon = 137

---

¡Listo! Con esta guía puedes configurar todos los RPCs necesarios. 🚀



## 📋 Índice
1. [Resumen de lo que necesitas](#resumen)
2. [Crear RPCs en Alchemy](#alchemy)
3. [Crear RPCs en Infura](#infura)
4. [RPCs Públicos (gratuitos)](#publicos)
5. [Configuración del .env](#configuracion)
6. [Verificar conexión](#verificar)

---

## 🎯 Resumen de lo que necesitas {#resumen}

Para cada cadena necesitas **4 tipos de RPC**:

| Tipo | Uso | Prioridad |
|------|-----|-----------|
| `READ` | Leer datos (balances, precios) | Alta |
| `SIM` | Simular transacciones (eth_call) | Alta |
| `SEND` | Enviar transacciones | Crítica |
| `WS` | WebSocket (tiempo real) | Media |

### Cadenas soportadas:
- ✅ **Base** (Chain ID: 8453)
- ✅ **Arbitrum One** (Chain ID: 42161)
- ✅ **Optimism** (Chain ID: 10)
- ✅ **Polygon** (Chain ID: 137)

---

## 🔷 Opción 1: Crear RPCs en Alchemy (RECOMENDADO) {#alchemy}

### Paso 1: Crear cuenta
1. Ve a https://www.alchemy.com/
2. Click en "Get started for free"
3. Registra tu cuenta con email

### Paso 2: Crear Apps para cada cadena

#### Para BASE:
1. Dashboard → Create new app
2. **Name**: `MultiChain-Arb-Base`
3. **Chain**: Base
4. **Network**: Base Mainnet
5. Click "Create app"
6. Copia el **HTTPS** y **WSS** endpoint

#### Para ARBITRUM:
1. Dashboard → Create new app
2. **Name**: `MultiChain-Arb-Arbitrum`
3. **Chain**: Arbitrum
4. **Network**: Arbitrum Mainnet
5. Click "Create app"
6. Copia el **HTTPS** y **WSS** endpoint

#### Para OPTIMISM:
1. Dashboard → Create new app
2. **Name**: `MultiChain-Arb-Optimism`
3. **Chain**: Optimism
4. **Network**: Optimism Mainnet
5. Click "Create app"
6. Copia el **HTTPS** y **WSS** endpoint

#### Para POLYGON:
1. Dashboard → Create new app
2. **Name**: `MultiChain-Arb-Polygon`
3. **Chain**: Polygon
4. **Network**: Polygon Mainnet
5. Click "Create app"
6. Copia el **HTTPS** y **WSS** endpoint

### Formato de URLs Alchemy:
```
HTTPS: https://{chain}-mainnet.g.alchemy.com/v2/{API_KEY}
WSS:   wss://{chain}-mainnet.g.alchemy.com/v2/{API_KEY}
```

### Ejemplo real:
```env
# Base
BASE_RPC_READ=https://base-mainnet.g.alchemy.com/v2/abc123xyz
BASE_RPC_SIM=https://base-mainnet.g.alchemy.com/v2/abc123xyz
BASE_RPC_SEND=https://base-mainnet.g.alchemy.com/v2/abc123xyz
BASE_RPC_WS=wss://base-mainnet.g.alchemy.com/v2/abc123xyz

# Arbitrum
ARB_RPC_READ=https://arb-mainnet.g.alchemy.com/v2/def456uvw
ARB_RPC_SIM=https://arb-mainnet.g.alchemy.com/v2/def456uvw
ARB_RPC_SEND=https://arb-mainnet.g.alchemy.com/v2/def456uvw
ARB_RPC_WS=wss://arb-mainnet.g.alchemy.com/v2/def456uvw

# Optimism
OP_RPC_READ=https://opt-mainnet.g.alchemy.com/v2/ghi789rst
OP_RPC_SIM=https://opt-mainnet.g.alchemy.com/v2/ghi789rst
OP_RPC_SEND=https://opt-mainnet.g.alchemy.com/v2/ghi789rst
OP_RPC_WS=wss://opt-mainnet.g.alchemy.com/v2/ghi789rst

# Polygon
POLY_RPC_READ=https://polygon-mainnet.g.alchemy.com/v2/jkl012mno
POLY_RPC_SIM=https://polygon-mainnet.g.alchemy.com/v2/jkl012mno
POLY_RPC_SEND=https://polygon-mainnet.g.alchemy.com/v2/jkl012mno
POLY_RPC_WS=wss://polygon-mainnet.g.alchemy.com/v2/jkl012mno
```

### Plan gratuito de Alchemy:
- ✅ 300M compute units/mes
- ✅ Suficiente para ~10,000 operaciones/día
- ✅ WebSocket incluido

---

## 🔶 Opción 2: Crear RPCs en Infura {#infura}

### Paso 1: Crear cuenta
1. Ve a https://www.infura.io/
2. Click en "Sign Up"
3. Registra tu cuenta

### Paso 2: Crear proyecto
1. Dashboard → Create new API key
2. **Name**: `MultiChain-Arb`
3. Selecciona las redes:
   - ✅ Arbitrum
   - ✅ Optimism
   - ✅ Polygon
   - ❌ Base (no soportado en Infura)

### Formato de URLs Infura:
```
HTTPS: https://{network}.infura.io/v3/{PROJECT_ID}
WSS:   wss://{network}.infura.io/ws/v3/{PROJECT_ID}
```

### Ejemplo:
```env
# Arbitrum (Infura)
ARB_RPC_READ=https://arbitrum-mainnet.infura.io/v3/abc123
ARB_RPC_WS=wss://arbitrum-mainnet.infura.io/ws/v3/abc123

# Optimism (Infura)
OP_RPC_READ=https://optimism-mainnet.infura.io/v3/abc123
OP_RPC_WS=wss://optimism-mainnet.infura.io/ws/v3/abc123

# Polygon (Infura)
POLY_RPC_READ=https://polygon-mainnet.infura.io/v3/abc123
POLY_RPC_WS=wss://polygon-mainnet.infura.io/ws/v3/abc123
```

---

## 🆓 Opción 3: RPCs Públicos (Gratuitos) {#publicos}

⚠️ **Advertencia**: Los RPCs públicos tienen límites de rate y pueden ser lentos.
Solo usar para pruebas, NO para producción.

```env
# ═══════════════════════════════════════════════════════════════════════════════
# BASE - RPCs Públicos
# ═══════════════════════════════════════════════════════════════════════════════
BASE_RPC_READ=https://mainnet.base.org
BASE_RPC_SIM=https://mainnet.base.org
BASE_RPC_SEND=https://mainnet.base.org
BASE_RPC_WS=wss://base-mainnet.publicnode.com

# ═══════════════════════════════════════════════════════════════════════════════
# ARBITRUM - RPCs Públicos
# ═══════════════════════════════════════════════════════════════════════════════
ARB_RPC_READ=https://arb1.arbitrum.io/rpc
ARB_RPC_SIM=https://arb1.arbitrum.io/rpc
ARB_RPC_SEND=https://arb1.arbitrum.io/rpc
ARB_RPC_WS=wss://arbitrum-one.publicnode.com

# ═══════════════════════════════════════════════════════════════════════════════
# OPTIMISM - RPCs Públicos
# ═══════════════════════════════════════════════════════════════════════════════
OP_RPC_READ=https://mainnet.optimism.io
OP_RPC_SIM=https://mainnet.optimism.io
OP_RPC_SEND=https://mainnet.optimism.io
OP_RPC_WS=wss://optimism.publicnode.com

# ═══════════════════════════════════════════════════════════════════════════════
# POLYGON - RPCs Públicos
# ═══════════════════════════════════════════════════════════════════════════════
POLY_RPC_READ=https://polygon-rpc.com
POLY_RPC_SIM=https://polygon-rpc.com
POLY_RPC_SEND=https://polygon-rpc.com
POLY_RPC_WS=wss://polygon-bor.publicnode.com
```

### Otros RPCs públicos alternativos:

| Cadena | RPC Alternativo |
|--------|-----------------|
| Base | `https://base.llamarpc.com` |
| Arbitrum | `https://arbitrum.llamarpc.com` |
| Optimism | `https://optimism.llamarpc.com` |
| Polygon | `https://polygon.llamarpc.com` |

---

## ⚙️ Configuración del .env {#configuracion}

Crea el archivo `.env` en la raíz del proyecto:

```env
# ═══════════════════════════════════════════════════════════════════════════════
# MULTI-CHAIN MICRO ARBITRAGE BOT - CONFIGURACIÓN
# ═══════════════════════════════════════════════════════════════════════════════

# ─────────────────────────────────────────────────────────────────────────────────
# WALLET (¡NUNCA COMPARTAS ESTA CLAVE!)
# ─────────────────────────────────────────────────────────────────────────────────
PRIVATE_KEY=0xTU_CLAVE_PRIVADA_AQUI

# ─────────────────────────────────────────────────────────────────────────────────
# TIMING
# ─────────────────────────────────────────────────────────────────────────────────
TICK_MS=700
DECISION_MS=5000

# ─────────────────────────────────────────────────────────────────────────────────
# TRADING
# ─────────────────────────────────────────────────────────────────────────────────
MIN_PROFIT_USD=0.50
GAS_MULT=1.7
MAX_SLIPPAGE_BPS=10
DEADLINE_SECONDS=20

# ─────────────────────────────────────────────────────────────────────────────────
# CHAINS HABILITADAS
# ─────────────────────────────────────────────────────────────────────────────────
CHAINS=base,arbitrum,optimism,polygon

# ─────────────────────────────────────────────────────────────────────────────────
# BASE RPCs (Alchemy recomendado)
# ─────────────────────────────────────────────────────────────────────────────────
BASE_RPC_READ=https://base-mainnet.g.alchemy.com/v2/TU_API_KEY
BASE_RPC_SIM=https://base-mainnet.g.alchemy.com/v2/TU_API_KEY
BASE_RPC_SEND=https://base-mainnet.g.alchemy.com/v2/TU_API_KEY
BASE_RPC_WS=wss://base-mainnet.g.alchemy.com/v2/TU_API_KEY

# ─────────────────────────────────────────────────────────────────────────────────
# ARBITRUM RPCs
# ─────────────────────────────────────────────────────────────────────────────────
ARB_RPC_READ=https://arb-mainnet.g.alchemy.com/v2/TU_API_KEY
ARB_RPC_SIM=https://arb-mainnet.g.alchemy.com/v2/TU_API_KEY
ARB_RPC_SEND=https://arb-mainnet.g.alchemy.com/v2/TU_API_KEY
ARB_RPC_WS=wss://arb-mainnet.g.alchemy.com/v2/TU_API_KEY

# ─────────────────────────────────────────────────────────────────────────────────
# OPTIMISM RPCs
# ─────────────────────────────────────────────────────────────────────────────────
OP_RPC_READ=https://opt-mainnet.g.alchemy.com/v2/TU_API_KEY
OP_RPC_SIM=https://opt-mainnet.g.alchemy.com/v2/TU_API_KEY
OP_RPC_SEND=https://opt-mainnet.g.alchemy.com/v2/TU_API_KEY
OP_RPC_WS=wss://opt-mainnet.g.alchemy.com/v2/TU_API_KEY

# ─────────────────────────────────────────────────────────────────────────────────
# POLYGON RPCs
# ─────────────────────────────────────────────────────────────────────────────────
POLY_RPC_READ=https://polygon-mainnet.g.alchemy.com/v2/TU_API_KEY
POLY_RPC_SIM=https://polygon-mainnet.g.alchemy.com/v2/TU_API_KEY
POLY_RPC_SEND=https://polygon-mainnet.g.alchemy.com/v2/TU_API_KEY
POLY_RPC_WS=wss://polygon-mainnet.g.alchemy.com/v2/TU_API_KEY

# ─────────────────────────────────────────────────────────────────────────────────
# BLOCK EXPLORER API KEYS (para verificar contratos)
# ─────────────────────────────────────────────────────────────────────────────────
BASESCAN_API_KEY=
ARBISCAN_API_KEY=
OPSCAN_API_KEY=
POLYGONSCAN_API_KEY=

# ─────────────────────────────────────────────────────────────────────────────────
# MODO
# ─────────────────────────────────────────────────────────────────────────────────
DRY_RUN=true
LOG_LEVEL=info
```

---

## ✅ Verificar conexión {#verificar}

Ejecuta este script para verificar que todos los RPCs funcionan:

```bash
npx tsx scripts/verify-rpcs.ts
```

O manualmente:

```javascript
// scripts/verify-rpcs.ts
import { ethers } from "ethers";
import "dotenv/config";

const chains = [
  { name: "Base", rpc: process.env.BASE_RPC_READ, chainId: 8453 },
  { name: "Arbitrum", rpc: process.env.ARB_RPC_READ, chainId: 42161 },
  { name: "Optimism", rpc: process.env.OP_RPC_READ, chainId: 10 },
  { name: "Polygon", rpc: process.env.POLY_RPC_READ, chainId: 137 }
];

async function verify() {
  console.log("🔍 Verificando RPCs...\n");
  
  for (const chain of chains) {
    try {
      const provider = new ethers.JsonRpcProvider(chain.rpc);
      const network = await provider.getNetwork();
      const block = await provider.getBlockNumber();
      
      if (Number(network.chainId) === chain.chainId) {
        console.log(`✅ ${chain.name}: OK (Block #${block})`);
      } else {
        console.log(`❌ ${chain.name}: Chain ID incorrecto`);
      }
    } catch (error: any) {
      console.log(`❌ ${chain.name}: ${error.message}`);
    }
  }
}

verify();
```

---

## 📊 Resumen de pasos

### Para empezar RÁPIDO (RPCs públicos):
1. Copia el bloque de "RPCs Públicos" al `.env`
2. Agrega tu `PRIVATE_KEY`
3. Ejecuta `npm run dev`

### Para PRODUCCIÓN (Alchemy):
1. Crea cuenta en Alchemy
2. Crea 4 apps (una por cadena)
3. Copia los endpoints al `.env`
4. Agrega tu `PRIVATE_KEY`
5. Ejecuta `npm run dev`

---

## ⚠️ Notas importantes

1. **Seguridad**: NUNCA compartas tu `PRIVATE_KEY`
2. **Rate Limits**: Los RPCs públicos tienen límites (~100 req/seg)
3. **Latencia**: Alchemy/Infura tienen ~50ms, públicos ~200ms
4. **Costo**: Alchemy free tier = 300M compute units/mes
5. **WebSocket**: Necesario para actualizaciones en tiempo real

---

## 🆘 Troubleshooting

### Error: "Rate limited"
- Usa RPCs privados (Alchemy/Infura)
- Aumenta `TICK_MS` a 1000+

### Error: "Connection refused"
- Verifica que el RPC esté activo
- Prueba con un RPC alternativo

### Error: "Chain ID mismatch"
- Verifica que usas el RPC correcto para cada cadena
- Base = 8453, Arbitrum = 42161, Optimism = 10, Polygon = 137

---

¡Listo! Con esta guía puedes configurar todos los RPCs necesarios. 🚀




## 📋 Índice
1. [Resumen de lo que necesitas](#resumen)
2. [Crear RPCs en Alchemy](#alchemy)
3. [Crear RPCs en Infura](#infura)
4. [RPCs Públicos (gratuitos)](#publicos)
5. [Configuración del .env](#configuracion)
6. [Verificar conexión](#verificar)

---

## 🎯 Resumen de lo que necesitas {#resumen}

Para cada cadena necesitas **4 tipos de RPC**:

| Tipo | Uso | Prioridad |
|------|-----|-----------|
| `READ` | Leer datos (balances, precios) | Alta |
| `SIM` | Simular transacciones (eth_call) | Alta |
| `SEND` | Enviar transacciones | Crítica |
| `WS` | WebSocket (tiempo real) | Media |

### Cadenas soportadas:
- ✅ **Base** (Chain ID: 8453)
- ✅ **Arbitrum One** (Chain ID: 42161)
- ✅ **Optimism** (Chain ID: 10)
- ✅ **Polygon** (Chain ID: 137)

---

## 🔷 Opción 1: Crear RPCs en Alchemy (RECOMENDADO) {#alchemy}

### Paso 1: Crear cuenta
1. Ve a https://www.alchemy.com/
2. Click en "Get started for free"
3. Registra tu cuenta con email

### Paso 2: Crear Apps para cada cadena

#### Para BASE:
1. Dashboard → Create new app
2. **Name**: `MultiChain-Arb-Base`
3. **Chain**: Base
4. **Network**: Base Mainnet
5. Click "Create app"
6. Copia el **HTTPS** y **WSS** endpoint

#### Para ARBITRUM:
1. Dashboard → Create new app
2. **Name**: `MultiChain-Arb-Arbitrum`
3. **Chain**: Arbitrum
4. **Network**: Arbitrum Mainnet
5. Click "Create app"
6. Copia el **HTTPS** y **WSS** endpoint

#### Para OPTIMISM:
1. Dashboard → Create new app
2. **Name**: `MultiChain-Arb-Optimism`
3. **Chain**: Optimism
4. **Network**: Optimism Mainnet
5. Click "Create app"
6. Copia el **HTTPS** y **WSS** endpoint

#### Para POLYGON:
1. Dashboard → Create new app
2. **Name**: `MultiChain-Arb-Polygon`
3. **Chain**: Polygon
4. **Network**: Polygon Mainnet
5. Click "Create app"
6. Copia el **HTTPS** y **WSS** endpoint

### Formato de URLs Alchemy:
```
HTTPS: https://{chain}-mainnet.g.alchemy.com/v2/{API_KEY}
WSS:   wss://{chain}-mainnet.g.alchemy.com/v2/{API_KEY}
```

### Ejemplo real:
```env
# Base
BASE_RPC_READ=https://base-mainnet.g.alchemy.com/v2/abc123xyz
BASE_RPC_SIM=https://base-mainnet.g.alchemy.com/v2/abc123xyz
BASE_RPC_SEND=https://base-mainnet.g.alchemy.com/v2/abc123xyz
BASE_RPC_WS=wss://base-mainnet.g.alchemy.com/v2/abc123xyz

# Arbitrum
ARB_RPC_READ=https://arb-mainnet.g.alchemy.com/v2/def456uvw
ARB_RPC_SIM=https://arb-mainnet.g.alchemy.com/v2/def456uvw
ARB_RPC_SEND=https://arb-mainnet.g.alchemy.com/v2/def456uvw
ARB_RPC_WS=wss://arb-mainnet.g.alchemy.com/v2/def456uvw

# Optimism
OP_RPC_READ=https://opt-mainnet.g.alchemy.com/v2/ghi789rst
OP_RPC_SIM=https://opt-mainnet.g.alchemy.com/v2/ghi789rst
OP_RPC_SEND=https://opt-mainnet.g.alchemy.com/v2/ghi789rst
OP_RPC_WS=wss://opt-mainnet.g.alchemy.com/v2/ghi789rst

# Polygon
POLY_RPC_READ=https://polygon-mainnet.g.alchemy.com/v2/jkl012mno
POLY_RPC_SIM=https://polygon-mainnet.g.alchemy.com/v2/jkl012mno
POLY_RPC_SEND=https://polygon-mainnet.g.alchemy.com/v2/jkl012mno
POLY_RPC_WS=wss://polygon-mainnet.g.alchemy.com/v2/jkl012mno
```

### Plan gratuito de Alchemy:
- ✅ 300M compute units/mes
- ✅ Suficiente para ~10,000 operaciones/día
- ✅ WebSocket incluido

---

## 🔶 Opción 2: Crear RPCs en Infura {#infura}

### Paso 1: Crear cuenta
1. Ve a https://www.infura.io/
2. Click en "Sign Up"
3. Registra tu cuenta

### Paso 2: Crear proyecto
1. Dashboard → Create new API key
2. **Name**: `MultiChain-Arb`
3. Selecciona las redes:
   - ✅ Arbitrum
   - ✅ Optimism
   - ✅ Polygon
   - ❌ Base (no soportado en Infura)

### Formato de URLs Infura:
```
HTTPS: https://{network}.infura.io/v3/{PROJECT_ID}
WSS:   wss://{network}.infura.io/ws/v3/{PROJECT_ID}
```

### Ejemplo:
```env
# Arbitrum (Infura)
ARB_RPC_READ=https://arbitrum-mainnet.infura.io/v3/abc123
ARB_RPC_WS=wss://arbitrum-mainnet.infura.io/ws/v3/abc123

# Optimism (Infura)
OP_RPC_READ=https://optimism-mainnet.infura.io/v3/abc123
OP_RPC_WS=wss://optimism-mainnet.infura.io/ws/v3/abc123

# Polygon (Infura)
POLY_RPC_READ=https://polygon-mainnet.infura.io/v3/abc123
POLY_RPC_WS=wss://polygon-mainnet.infura.io/ws/v3/abc123
```

---

## 🆓 Opción 3: RPCs Públicos (Gratuitos) {#publicos}

⚠️ **Advertencia**: Los RPCs públicos tienen límites de rate y pueden ser lentos.
Solo usar para pruebas, NO para producción.

```env
# ═══════════════════════════════════════════════════════════════════════════════
# BASE - RPCs Públicos
# ═══════════════════════════════════════════════════════════════════════════════
BASE_RPC_READ=https://mainnet.base.org
BASE_RPC_SIM=https://mainnet.base.org
BASE_RPC_SEND=https://mainnet.base.org
BASE_RPC_WS=wss://base-mainnet.publicnode.com

# ═══════════════════════════════════════════════════════════════════════════════
# ARBITRUM - RPCs Públicos
# ═══════════════════════════════════════════════════════════════════════════════
ARB_RPC_READ=https://arb1.arbitrum.io/rpc
ARB_RPC_SIM=https://arb1.arbitrum.io/rpc
ARB_RPC_SEND=https://arb1.arbitrum.io/rpc
ARB_RPC_WS=wss://arbitrum-one.publicnode.com

# ═══════════════════════════════════════════════════════════════════════════════
# OPTIMISM - RPCs Públicos
# ═══════════════════════════════════════════════════════════════════════════════
OP_RPC_READ=https://mainnet.optimism.io
OP_RPC_SIM=https://mainnet.optimism.io
OP_RPC_SEND=https://mainnet.optimism.io
OP_RPC_WS=wss://optimism.publicnode.com

# ═══════════════════════════════════════════════════════════════════════════════
# POLYGON - RPCs Públicos
# ═══════════════════════════════════════════════════════════════════════════════
POLY_RPC_READ=https://polygon-rpc.com
POLY_RPC_SIM=https://polygon-rpc.com
POLY_RPC_SEND=https://polygon-rpc.com
POLY_RPC_WS=wss://polygon-bor.publicnode.com
```

### Otros RPCs públicos alternativos:

| Cadena | RPC Alternativo |
|--------|-----------------|
| Base | `https://base.llamarpc.com` |
| Arbitrum | `https://arbitrum.llamarpc.com` |
| Optimism | `https://optimism.llamarpc.com` |
| Polygon | `https://polygon.llamarpc.com` |

---

## ⚙️ Configuración del .env {#configuracion}

Crea el archivo `.env` en la raíz del proyecto:

```env
# ═══════════════════════════════════════════════════════════════════════════════
# MULTI-CHAIN MICRO ARBITRAGE BOT - CONFIGURACIÓN
# ═══════════════════════════════════════════════════════════════════════════════

# ─────────────────────────────────────────────────────────────────────────────────
# WALLET (¡NUNCA COMPARTAS ESTA CLAVE!)
# ─────────────────────────────────────────────────────────────────────────────────
PRIVATE_KEY=0xTU_CLAVE_PRIVADA_AQUI

# ─────────────────────────────────────────────────────────────────────────────────
# TIMING
# ─────────────────────────────────────────────────────────────────────────────────
TICK_MS=700
DECISION_MS=5000

# ─────────────────────────────────────────────────────────────────────────────────
# TRADING
# ─────────────────────────────────────────────────────────────────────────────────
MIN_PROFIT_USD=0.50
GAS_MULT=1.7
MAX_SLIPPAGE_BPS=10
DEADLINE_SECONDS=20

# ─────────────────────────────────────────────────────────────────────────────────
# CHAINS HABILITADAS
# ─────────────────────────────────────────────────────────────────────────────────
CHAINS=base,arbitrum,optimism,polygon

# ─────────────────────────────────────────────────────────────────────────────────
# BASE RPCs (Alchemy recomendado)
# ─────────────────────────────────────────────────────────────────────────────────
BASE_RPC_READ=https://base-mainnet.g.alchemy.com/v2/TU_API_KEY
BASE_RPC_SIM=https://base-mainnet.g.alchemy.com/v2/TU_API_KEY
BASE_RPC_SEND=https://base-mainnet.g.alchemy.com/v2/TU_API_KEY
BASE_RPC_WS=wss://base-mainnet.g.alchemy.com/v2/TU_API_KEY

# ─────────────────────────────────────────────────────────────────────────────────
# ARBITRUM RPCs
# ─────────────────────────────────────────────────────────────────────────────────
ARB_RPC_READ=https://arb-mainnet.g.alchemy.com/v2/TU_API_KEY
ARB_RPC_SIM=https://arb-mainnet.g.alchemy.com/v2/TU_API_KEY
ARB_RPC_SEND=https://arb-mainnet.g.alchemy.com/v2/TU_API_KEY
ARB_RPC_WS=wss://arb-mainnet.g.alchemy.com/v2/TU_API_KEY

# ─────────────────────────────────────────────────────────────────────────────────
# OPTIMISM RPCs
# ─────────────────────────────────────────────────────────────────────────────────
OP_RPC_READ=https://opt-mainnet.g.alchemy.com/v2/TU_API_KEY
OP_RPC_SIM=https://opt-mainnet.g.alchemy.com/v2/TU_API_KEY
OP_RPC_SEND=https://opt-mainnet.g.alchemy.com/v2/TU_API_KEY
OP_RPC_WS=wss://opt-mainnet.g.alchemy.com/v2/TU_API_KEY

# ─────────────────────────────────────────────────────────────────────────────────
# POLYGON RPCs
# ─────────────────────────────────────────────────────────────────────────────────
POLY_RPC_READ=https://polygon-mainnet.g.alchemy.com/v2/TU_API_KEY
POLY_RPC_SIM=https://polygon-mainnet.g.alchemy.com/v2/TU_API_KEY
POLY_RPC_SEND=https://polygon-mainnet.g.alchemy.com/v2/TU_API_KEY
POLY_RPC_WS=wss://polygon-mainnet.g.alchemy.com/v2/TU_API_KEY

# ─────────────────────────────────────────────────────────────────────────────────
# BLOCK EXPLORER API KEYS (para verificar contratos)
# ─────────────────────────────────────────────────────────────────────────────────
BASESCAN_API_KEY=
ARBISCAN_API_KEY=
OPSCAN_API_KEY=
POLYGONSCAN_API_KEY=

# ─────────────────────────────────────────────────────────────────────────────────
# MODO
# ─────────────────────────────────────────────────────────────────────────────────
DRY_RUN=true
LOG_LEVEL=info
```

---

## ✅ Verificar conexión {#verificar}

Ejecuta este script para verificar que todos los RPCs funcionan:

```bash
npx tsx scripts/verify-rpcs.ts
```

O manualmente:

```javascript
// scripts/verify-rpcs.ts
import { ethers } from "ethers";
import "dotenv/config";

const chains = [
  { name: "Base", rpc: process.env.BASE_RPC_READ, chainId: 8453 },
  { name: "Arbitrum", rpc: process.env.ARB_RPC_READ, chainId: 42161 },
  { name: "Optimism", rpc: process.env.OP_RPC_READ, chainId: 10 },
  { name: "Polygon", rpc: process.env.POLY_RPC_READ, chainId: 137 }
];

async function verify() {
  console.log("🔍 Verificando RPCs...\n");
  
  for (const chain of chains) {
    try {
      const provider = new ethers.JsonRpcProvider(chain.rpc);
      const network = await provider.getNetwork();
      const block = await provider.getBlockNumber();
      
      if (Number(network.chainId) === chain.chainId) {
        console.log(`✅ ${chain.name}: OK (Block #${block})`);
      } else {
        console.log(`❌ ${chain.name}: Chain ID incorrecto`);
      }
    } catch (error: any) {
      console.log(`❌ ${chain.name}: ${error.message}`);
    }
  }
}

verify();
```

---

## 📊 Resumen de pasos

### Para empezar RÁPIDO (RPCs públicos):
1. Copia el bloque de "RPCs Públicos" al `.env`
2. Agrega tu `PRIVATE_KEY`
3. Ejecuta `npm run dev`

### Para PRODUCCIÓN (Alchemy):
1. Crea cuenta en Alchemy
2. Crea 4 apps (una por cadena)
3. Copia los endpoints al `.env`
4. Agrega tu `PRIVATE_KEY`
5. Ejecuta `npm run dev`

---

## ⚠️ Notas importantes

1. **Seguridad**: NUNCA compartas tu `PRIVATE_KEY`
2. **Rate Limits**: Los RPCs públicos tienen límites (~100 req/seg)
3. **Latencia**: Alchemy/Infura tienen ~50ms, públicos ~200ms
4. **Costo**: Alchemy free tier = 300M compute units/mes
5. **WebSocket**: Necesario para actualizaciones en tiempo real

---

## 🆘 Troubleshooting

### Error: "Rate limited"
- Usa RPCs privados (Alchemy/Infura)
- Aumenta `TICK_MS` a 1000+

### Error: "Connection refused"
- Verifica que el RPC esté activo
- Prueba con un RPC alternativo

### Error: "Chain ID mismatch"
- Verifica que usas el RPC correcto para cada cadena
- Base = 8453, Arbitrum = 42161, Optimism = 10, Polygon = 137

---

¡Listo! Con esta guía puedes configurar todos los RPCs necesarios. 🚀



## 📋 Índice
1. [Resumen de lo que necesitas](#resumen)
2. [Crear RPCs en Alchemy](#alchemy)
3. [Crear RPCs en Infura](#infura)
4. [RPCs Públicos (gratuitos)](#publicos)
5. [Configuración del .env](#configuracion)
6. [Verificar conexión](#verificar)

---

## 🎯 Resumen de lo que necesitas {#resumen}

Para cada cadena necesitas **4 tipos de RPC**:

| Tipo | Uso | Prioridad |
|------|-----|-----------|
| `READ` | Leer datos (balances, precios) | Alta |
| `SIM` | Simular transacciones (eth_call) | Alta |
| `SEND` | Enviar transacciones | Crítica |
| `WS` | WebSocket (tiempo real) | Media |

### Cadenas soportadas:
- ✅ **Base** (Chain ID: 8453)
- ✅ **Arbitrum One** (Chain ID: 42161)
- ✅ **Optimism** (Chain ID: 10)
- ✅ **Polygon** (Chain ID: 137)

---

## 🔷 Opción 1: Crear RPCs en Alchemy (RECOMENDADO) {#alchemy}

### Paso 1: Crear cuenta
1. Ve a https://www.alchemy.com/
2. Click en "Get started for free"
3. Registra tu cuenta con email

### Paso 2: Crear Apps para cada cadena

#### Para BASE:
1. Dashboard → Create new app
2. **Name**: `MultiChain-Arb-Base`
3. **Chain**: Base
4. **Network**: Base Mainnet
5. Click "Create app"
6. Copia el **HTTPS** y **WSS** endpoint

#### Para ARBITRUM:
1. Dashboard → Create new app
2. **Name**: `MultiChain-Arb-Arbitrum`
3. **Chain**: Arbitrum
4. **Network**: Arbitrum Mainnet
5. Click "Create app"
6. Copia el **HTTPS** y **WSS** endpoint

#### Para OPTIMISM:
1. Dashboard → Create new app
2. **Name**: `MultiChain-Arb-Optimism`
3. **Chain**: Optimism
4. **Network**: Optimism Mainnet
5. Click "Create app"
6. Copia el **HTTPS** y **WSS** endpoint

#### Para POLYGON:
1. Dashboard → Create new app
2. **Name**: `MultiChain-Arb-Polygon`
3. **Chain**: Polygon
4. **Network**: Polygon Mainnet
5. Click "Create app"
6. Copia el **HTTPS** y **WSS** endpoint

### Formato de URLs Alchemy:
```
HTTPS: https://{chain}-mainnet.g.alchemy.com/v2/{API_KEY}
WSS:   wss://{chain}-mainnet.g.alchemy.com/v2/{API_KEY}
```

### Ejemplo real:
```env
# Base
BASE_RPC_READ=https://base-mainnet.g.alchemy.com/v2/abc123xyz
BASE_RPC_SIM=https://base-mainnet.g.alchemy.com/v2/abc123xyz
BASE_RPC_SEND=https://base-mainnet.g.alchemy.com/v2/abc123xyz
BASE_RPC_WS=wss://base-mainnet.g.alchemy.com/v2/abc123xyz

# Arbitrum
ARB_RPC_READ=https://arb-mainnet.g.alchemy.com/v2/def456uvw
ARB_RPC_SIM=https://arb-mainnet.g.alchemy.com/v2/def456uvw
ARB_RPC_SEND=https://arb-mainnet.g.alchemy.com/v2/def456uvw
ARB_RPC_WS=wss://arb-mainnet.g.alchemy.com/v2/def456uvw

# Optimism
OP_RPC_READ=https://opt-mainnet.g.alchemy.com/v2/ghi789rst
OP_RPC_SIM=https://opt-mainnet.g.alchemy.com/v2/ghi789rst
OP_RPC_SEND=https://opt-mainnet.g.alchemy.com/v2/ghi789rst
OP_RPC_WS=wss://opt-mainnet.g.alchemy.com/v2/ghi789rst

# Polygon
POLY_RPC_READ=https://polygon-mainnet.g.alchemy.com/v2/jkl012mno
POLY_RPC_SIM=https://polygon-mainnet.g.alchemy.com/v2/jkl012mno
POLY_RPC_SEND=https://polygon-mainnet.g.alchemy.com/v2/jkl012mno
POLY_RPC_WS=wss://polygon-mainnet.g.alchemy.com/v2/jkl012mno
```

### Plan gratuito de Alchemy:
- ✅ 300M compute units/mes
- ✅ Suficiente para ~10,000 operaciones/día
- ✅ WebSocket incluido

---

## 🔶 Opción 2: Crear RPCs en Infura {#infura}

### Paso 1: Crear cuenta
1. Ve a https://www.infura.io/
2. Click en "Sign Up"
3. Registra tu cuenta

### Paso 2: Crear proyecto
1. Dashboard → Create new API key
2. **Name**: `MultiChain-Arb`
3. Selecciona las redes:
   - ✅ Arbitrum
   - ✅ Optimism
   - ✅ Polygon
   - ❌ Base (no soportado en Infura)

### Formato de URLs Infura:
```
HTTPS: https://{network}.infura.io/v3/{PROJECT_ID}
WSS:   wss://{network}.infura.io/ws/v3/{PROJECT_ID}
```

### Ejemplo:
```env
# Arbitrum (Infura)
ARB_RPC_READ=https://arbitrum-mainnet.infura.io/v3/abc123
ARB_RPC_WS=wss://arbitrum-mainnet.infura.io/ws/v3/abc123

# Optimism (Infura)
OP_RPC_READ=https://optimism-mainnet.infura.io/v3/abc123
OP_RPC_WS=wss://optimism-mainnet.infura.io/ws/v3/abc123

# Polygon (Infura)
POLY_RPC_READ=https://polygon-mainnet.infura.io/v3/abc123
POLY_RPC_WS=wss://polygon-mainnet.infura.io/ws/v3/abc123
```

---

## 🆓 Opción 3: RPCs Públicos (Gratuitos) {#publicos}

⚠️ **Advertencia**: Los RPCs públicos tienen límites de rate y pueden ser lentos.
Solo usar para pruebas, NO para producción.

```env
# ═══════════════════════════════════════════════════════════════════════════════
# BASE - RPCs Públicos
# ═══════════════════════════════════════════════════════════════════════════════
BASE_RPC_READ=https://mainnet.base.org
BASE_RPC_SIM=https://mainnet.base.org
BASE_RPC_SEND=https://mainnet.base.org
BASE_RPC_WS=wss://base-mainnet.publicnode.com

# ═══════════════════════════════════════════════════════════════════════════════
# ARBITRUM - RPCs Públicos
# ═══════════════════════════════════════════════════════════════════════════════
ARB_RPC_READ=https://arb1.arbitrum.io/rpc
ARB_RPC_SIM=https://arb1.arbitrum.io/rpc
ARB_RPC_SEND=https://arb1.arbitrum.io/rpc
ARB_RPC_WS=wss://arbitrum-one.publicnode.com

# ═══════════════════════════════════════════════════════════════════════════════
# OPTIMISM - RPCs Públicos
# ═══════════════════════════════════════════════════════════════════════════════
OP_RPC_READ=https://mainnet.optimism.io
OP_RPC_SIM=https://mainnet.optimism.io
OP_RPC_SEND=https://mainnet.optimism.io
OP_RPC_WS=wss://optimism.publicnode.com

# ═══════════════════════════════════════════════════════════════════════════════
# POLYGON - RPCs Públicos
# ═══════════════════════════════════════════════════════════════════════════════
POLY_RPC_READ=https://polygon-rpc.com
POLY_RPC_SIM=https://polygon-rpc.com
POLY_RPC_SEND=https://polygon-rpc.com
POLY_RPC_WS=wss://polygon-bor.publicnode.com
```

### Otros RPCs públicos alternativos:

| Cadena | RPC Alternativo |
|--------|-----------------|
| Base | `https://base.llamarpc.com` |
| Arbitrum | `https://arbitrum.llamarpc.com` |
| Optimism | `https://optimism.llamarpc.com` |
| Polygon | `https://polygon.llamarpc.com` |

---

## ⚙️ Configuración del .env {#configuracion}

Crea el archivo `.env` en la raíz del proyecto:

```env
# ═══════════════════════════════════════════════════════════════════════════════
# MULTI-CHAIN MICRO ARBITRAGE BOT - CONFIGURACIÓN
# ═══════════════════════════════════════════════════════════════════════════════

# ─────────────────────────────────────────────────────────────────────────────────
# WALLET (¡NUNCA COMPARTAS ESTA CLAVE!)
# ─────────────────────────────────────────────────────────────────────────────────
PRIVATE_KEY=0xTU_CLAVE_PRIVADA_AQUI

# ─────────────────────────────────────────────────────────────────────────────────
# TIMING
# ─────────────────────────────────────────────────────────────────────────────────
TICK_MS=700
DECISION_MS=5000

# ─────────────────────────────────────────────────────────────────────────────────
# TRADING
# ─────────────────────────────────────────────────────────────────────────────────
MIN_PROFIT_USD=0.50
GAS_MULT=1.7
MAX_SLIPPAGE_BPS=10
DEADLINE_SECONDS=20

# ─────────────────────────────────────────────────────────────────────────────────
# CHAINS HABILITADAS
# ─────────────────────────────────────────────────────────────────────────────────
CHAINS=base,arbitrum,optimism,polygon

# ─────────────────────────────────────────────────────────────────────────────────
# BASE RPCs (Alchemy recomendado)
# ─────────────────────────────────────────────────────────────────────────────────
BASE_RPC_READ=https://base-mainnet.g.alchemy.com/v2/TU_API_KEY
BASE_RPC_SIM=https://base-mainnet.g.alchemy.com/v2/TU_API_KEY
BASE_RPC_SEND=https://base-mainnet.g.alchemy.com/v2/TU_API_KEY
BASE_RPC_WS=wss://base-mainnet.g.alchemy.com/v2/TU_API_KEY

# ─────────────────────────────────────────────────────────────────────────────────
# ARBITRUM RPCs
# ─────────────────────────────────────────────────────────────────────────────────
ARB_RPC_READ=https://arb-mainnet.g.alchemy.com/v2/TU_API_KEY
ARB_RPC_SIM=https://arb-mainnet.g.alchemy.com/v2/TU_API_KEY
ARB_RPC_SEND=https://arb-mainnet.g.alchemy.com/v2/TU_API_KEY
ARB_RPC_WS=wss://arb-mainnet.g.alchemy.com/v2/TU_API_KEY

# ─────────────────────────────────────────────────────────────────────────────────
# OPTIMISM RPCs
# ─────────────────────────────────────────────────────────────────────────────────
OP_RPC_READ=https://opt-mainnet.g.alchemy.com/v2/TU_API_KEY
OP_RPC_SIM=https://opt-mainnet.g.alchemy.com/v2/TU_API_KEY
OP_RPC_SEND=https://opt-mainnet.g.alchemy.com/v2/TU_API_KEY
OP_RPC_WS=wss://opt-mainnet.g.alchemy.com/v2/TU_API_KEY

# ─────────────────────────────────────────────────────────────────────────────────
# POLYGON RPCs
# ─────────────────────────────────────────────────────────────────────────────────
POLY_RPC_READ=https://polygon-mainnet.g.alchemy.com/v2/TU_API_KEY
POLY_RPC_SIM=https://polygon-mainnet.g.alchemy.com/v2/TU_API_KEY
POLY_RPC_SEND=https://polygon-mainnet.g.alchemy.com/v2/TU_API_KEY
POLY_RPC_WS=wss://polygon-mainnet.g.alchemy.com/v2/TU_API_KEY

# ─────────────────────────────────────────────────────────────────────────────────
# BLOCK EXPLORER API KEYS (para verificar contratos)
# ─────────────────────────────────────────────────────────────────────────────────
BASESCAN_API_KEY=
ARBISCAN_API_KEY=
OPSCAN_API_KEY=
POLYGONSCAN_API_KEY=

# ─────────────────────────────────────────────────────────────────────────────────
# MODO
# ─────────────────────────────────────────────────────────────────────────────────
DRY_RUN=true
LOG_LEVEL=info
```

---

## ✅ Verificar conexión {#verificar}

Ejecuta este script para verificar que todos los RPCs funcionan:

```bash
npx tsx scripts/verify-rpcs.ts
```

O manualmente:

```javascript
// scripts/verify-rpcs.ts
import { ethers } from "ethers";
import "dotenv/config";

const chains = [
  { name: "Base", rpc: process.env.BASE_RPC_READ, chainId: 8453 },
  { name: "Arbitrum", rpc: process.env.ARB_RPC_READ, chainId: 42161 },
  { name: "Optimism", rpc: process.env.OP_RPC_READ, chainId: 10 },
  { name: "Polygon", rpc: process.env.POLY_RPC_READ, chainId: 137 }
];

async function verify() {
  console.log("🔍 Verificando RPCs...\n");
  
  for (const chain of chains) {
    try {
      const provider = new ethers.JsonRpcProvider(chain.rpc);
      const network = await provider.getNetwork();
      const block = await provider.getBlockNumber();
      
      if (Number(network.chainId) === chain.chainId) {
        console.log(`✅ ${chain.name}: OK (Block #${block})`);
      } else {
        console.log(`❌ ${chain.name}: Chain ID incorrecto`);
      }
    } catch (error: any) {
      console.log(`❌ ${chain.name}: ${error.message}`);
    }
  }
}

verify();
```

---

## 📊 Resumen de pasos

### Para empezar RÁPIDO (RPCs públicos):
1. Copia el bloque de "RPCs Públicos" al `.env`
2. Agrega tu `PRIVATE_KEY`
3. Ejecuta `npm run dev`

### Para PRODUCCIÓN (Alchemy):
1. Crea cuenta en Alchemy
2. Crea 4 apps (una por cadena)
3. Copia los endpoints al `.env`
4. Agrega tu `PRIVATE_KEY`
5. Ejecuta `npm run dev`

---

## ⚠️ Notas importantes

1. **Seguridad**: NUNCA compartas tu `PRIVATE_KEY`
2. **Rate Limits**: Los RPCs públicos tienen límites (~100 req/seg)
3. **Latencia**: Alchemy/Infura tienen ~50ms, públicos ~200ms
4. **Costo**: Alchemy free tier = 300M compute units/mes
5. **WebSocket**: Necesario para actualizaciones en tiempo real

---

## 🆘 Troubleshooting

### Error: "Rate limited"
- Usa RPCs privados (Alchemy/Infura)
- Aumenta `TICK_MS` a 1000+

### Error: "Connection refused"
- Verifica que el RPC esté activo
- Prueba con un RPC alternativo

### Error: "Chain ID mismatch"
- Verifica que usas el RPC correcto para cada cadena
- Base = 8453, Arbitrum = 42161, Optimism = 10, Polygon = 137

---

¡Listo! Con esta guía puedes configurar todos los RPCs necesarios. 🚀



## 📋 Índice
1. [Resumen de lo que necesitas](#resumen)
2. [Crear RPCs en Alchemy](#alchemy)
3. [Crear RPCs en Infura](#infura)
4. [RPCs Públicos (gratuitos)](#publicos)
5. [Configuración del .env](#configuracion)
6. [Verificar conexión](#verificar)

---

## 🎯 Resumen de lo que necesitas {#resumen}

Para cada cadena necesitas **4 tipos de RPC**:

| Tipo | Uso | Prioridad |
|------|-----|-----------|
| `READ` | Leer datos (balances, precios) | Alta |
| `SIM` | Simular transacciones (eth_call) | Alta |
| `SEND` | Enviar transacciones | Crítica |
| `WS` | WebSocket (tiempo real) | Media |

### Cadenas soportadas:
- ✅ **Base** (Chain ID: 8453)
- ✅ **Arbitrum One** (Chain ID: 42161)
- ✅ **Optimism** (Chain ID: 10)
- ✅ **Polygon** (Chain ID: 137)

---

## 🔷 Opción 1: Crear RPCs en Alchemy (RECOMENDADO) {#alchemy}

### Paso 1: Crear cuenta
1. Ve a https://www.alchemy.com/
2. Click en "Get started for free"
3. Registra tu cuenta con email

### Paso 2: Crear Apps para cada cadena

#### Para BASE:
1. Dashboard → Create new app
2. **Name**: `MultiChain-Arb-Base`
3. **Chain**: Base
4. **Network**: Base Mainnet
5. Click "Create app"
6. Copia el **HTTPS** y **WSS** endpoint

#### Para ARBITRUM:
1. Dashboard → Create new app
2. **Name**: `MultiChain-Arb-Arbitrum`
3. **Chain**: Arbitrum
4. **Network**: Arbitrum Mainnet
5. Click "Create app"
6. Copia el **HTTPS** y **WSS** endpoint

#### Para OPTIMISM:
1. Dashboard → Create new app
2. **Name**: `MultiChain-Arb-Optimism`
3. **Chain**: Optimism
4. **Network**: Optimism Mainnet
5. Click "Create app"
6. Copia el **HTTPS** y **WSS** endpoint

#### Para POLYGON:
1. Dashboard → Create new app
2. **Name**: `MultiChain-Arb-Polygon`
3. **Chain**: Polygon
4. **Network**: Polygon Mainnet
5. Click "Create app"
6. Copia el **HTTPS** y **WSS** endpoint

### Formato de URLs Alchemy:
```
HTTPS: https://{chain}-mainnet.g.alchemy.com/v2/{API_KEY}
WSS:   wss://{chain}-mainnet.g.alchemy.com/v2/{API_KEY}
```

### Ejemplo real:
```env
# Base
BASE_RPC_READ=https://base-mainnet.g.alchemy.com/v2/abc123xyz
BASE_RPC_SIM=https://base-mainnet.g.alchemy.com/v2/abc123xyz
BASE_RPC_SEND=https://base-mainnet.g.alchemy.com/v2/abc123xyz
BASE_RPC_WS=wss://base-mainnet.g.alchemy.com/v2/abc123xyz

# Arbitrum
ARB_RPC_READ=https://arb-mainnet.g.alchemy.com/v2/def456uvw
ARB_RPC_SIM=https://arb-mainnet.g.alchemy.com/v2/def456uvw
ARB_RPC_SEND=https://arb-mainnet.g.alchemy.com/v2/def456uvw
ARB_RPC_WS=wss://arb-mainnet.g.alchemy.com/v2/def456uvw

# Optimism
OP_RPC_READ=https://opt-mainnet.g.alchemy.com/v2/ghi789rst
OP_RPC_SIM=https://opt-mainnet.g.alchemy.com/v2/ghi789rst
OP_RPC_SEND=https://opt-mainnet.g.alchemy.com/v2/ghi789rst
OP_RPC_WS=wss://opt-mainnet.g.alchemy.com/v2/ghi789rst

# Polygon
POLY_RPC_READ=https://polygon-mainnet.g.alchemy.com/v2/jkl012mno
POLY_RPC_SIM=https://polygon-mainnet.g.alchemy.com/v2/jkl012mno
POLY_RPC_SEND=https://polygon-mainnet.g.alchemy.com/v2/jkl012mno
POLY_RPC_WS=wss://polygon-mainnet.g.alchemy.com/v2/jkl012mno
```

### Plan gratuito de Alchemy:
- ✅ 300M compute units/mes
- ✅ Suficiente para ~10,000 operaciones/día
- ✅ WebSocket incluido

---

## 🔶 Opción 2: Crear RPCs en Infura {#infura}

### Paso 1: Crear cuenta
1. Ve a https://www.infura.io/
2. Click en "Sign Up"
3. Registra tu cuenta

### Paso 2: Crear proyecto
1. Dashboard → Create new API key
2. **Name**: `MultiChain-Arb`
3. Selecciona las redes:
   - ✅ Arbitrum
   - ✅ Optimism
   - ✅ Polygon
   - ❌ Base (no soportado en Infura)

### Formato de URLs Infura:
```
HTTPS: https://{network}.infura.io/v3/{PROJECT_ID}
WSS:   wss://{network}.infura.io/ws/v3/{PROJECT_ID}
```

### Ejemplo:
```env
# Arbitrum (Infura)
ARB_RPC_READ=https://arbitrum-mainnet.infura.io/v3/abc123
ARB_RPC_WS=wss://arbitrum-mainnet.infura.io/ws/v3/abc123

# Optimism (Infura)
OP_RPC_READ=https://optimism-mainnet.infura.io/v3/abc123
OP_RPC_WS=wss://optimism-mainnet.infura.io/ws/v3/abc123

# Polygon (Infura)
POLY_RPC_READ=https://polygon-mainnet.infura.io/v3/abc123
POLY_RPC_WS=wss://polygon-mainnet.infura.io/ws/v3/abc123
```

---

## 🆓 Opción 3: RPCs Públicos (Gratuitos) {#publicos}

⚠️ **Advertencia**: Los RPCs públicos tienen límites de rate y pueden ser lentos.
Solo usar para pruebas, NO para producción.

```env
# ═══════════════════════════════════════════════════════════════════════════════
# BASE - RPCs Públicos
# ═══════════════════════════════════════════════════════════════════════════════
BASE_RPC_READ=https://mainnet.base.org
BASE_RPC_SIM=https://mainnet.base.org
BASE_RPC_SEND=https://mainnet.base.org
BASE_RPC_WS=wss://base-mainnet.publicnode.com

# ═══════════════════════════════════════════════════════════════════════════════
# ARBITRUM - RPCs Públicos
# ═══════════════════════════════════════════════════════════════════════════════
ARB_RPC_READ=https://arb1.arbitrum.io/rpc
ARB_RPC_SIM=https://arb1.arbitrum.io/rpc
ARB_RPC_SEND=https://arb1.arbitrum.io/rpc
ARB_RPC_WS=wss://arbitrum-one.publicnode.com

# ═══════════════════════════════════════════════════════════════════════════════
# OPTIMISM - RPCs Públicos
# ═══════════════════════════════════════════════════════════════════════════════
OP_RPC_READ=https://mainnet.optimism.io
OP_RPC_SIM=https://mainnet.optimism.io
OP_RPC_SEND=https://mainnet.optimism.io
OP_RPC_WS=wss://optimism.publicnode.com

# ═══════════════════════════════════════════════════════════════════════════════
# POLYGON - RPCs Públicos
# ═══════════════════════════════════════════════════════════════════════════════
POLY_RPC_READ=https://polygon-rpc.com
POLY_RPC_SIM=https://polygon-rpc.com
POLY_RPC_SEND=https://polygon-rpc.com
POLY_RPC_WS=wss://polygon-bor.publicnode.com
```

### Otros RPCs públicos alternativos:

| Cadena | RPC Alternativo |
|--------|-----------------|
| Base | `https://base.llamarpc.com` |
| Arbitrum | `https://arbitrum.llamarpc.com` |
| Optimism | `https://optimism.llamarpc.com` |
| Polygon | `https://polygon.llamarpc.com` |

---

## ⚙️ Configuración del .env {#configuracion}

Crea el archivo `.env` en la raíz del proyecto:

```env
# ═══════════════════════════════════════════════════════════════════════════════
# MULTI-CHAIN MICRO ARBITRAGE BOT - CONFIGURACIÓN
# ═══════════════════════════════════════════════════════════════════════════════

# ─────────────────────────────────────────────────────────────────────────────────
# WALLET (¡NUNCA COMPARTAS ESTA CLAVE!)
# ─────────────────────────────────────────────────────────────────────────────────
PRIVATE_KEY=0xTU_CLAVE_PRIVADA_AQUI

# ─────────────────────────────────────────────────────────────────────────────────
# TIMING
# ─────────────────────────────────────────────────────────────────────────────────
TICK_MS=700
DECISION_MS=5000

# ─────────────────────────────────────────────────────────────────────────────────
# TRADING
# ─────────────────────────────────────────────────────────────────────────────────
MIN_PROFIT_USD=0.50
GAS_MULT=1.7
MAX_SLIPPAGE_BPS=10
DEADLINE_SECONDS=20

# ─────────────────────────────────────────────────────────────────────────────────
# CHAINS HABILITADAS
# ─────────────────────────────────────────────────────────────────────────────────
CHAINS=base,arbitrum,optimism,polygon

# ─────────────────────────────────────────────────────────────────────────────────
# BASE RPCs (Alchemy recomendado)
# ─────────────────────────────────────────────────────────────────────────────────
BASE_RPC_READ=https://base-mainnet.g.alchemy.com/v2/TU_API_KEY
BASE_RPC_SIM=https://base-mainnet.g.alchemy.com/v2/TU_API_KEY
BASE_RPC_SEND=https://base-mainnet.g.alchemy.com/v2/TU_API_KEY
BASE_RPC_WS=wss://base-mainnet.g.alchemy.com/v2/TU_API_KEY

# ─────────────────────────────────────────────────────────────────────────────────
# ARBITRUM RPCs
# ─────────────────────────────────────────────────────────────────────────────────
ARB_RPC_READ=https://arb-mainnet.g.alchemy.com/v2/TU_API_KEY
ARB_RPC_SIM=https://arb-mainnet.g.alchemy.com/v2/TU_API_KEY
ARB_RPC_SEND=https://arb-mainnet.g.alchemy.com/v2/TU_API_KEY
ARB_RPC_WS=wss://arb-mainnet.g.alchemy.com/v2/TU_API_KEY

# ─────────────────────────────────────────────────────────────────────────────────
# OPTIMISM RPCs
# ─────────────────────────────────────────────────────────────────────────────────
OP_RPC_READ=https://opt-mainnet.g.alchemy.com/v2/TU_API_KEY
OP_RPC_SIM=https://opt-mainnet.g.alchemy.com/v2/TU_API_KEY
OP_RPC_SEND=https://opt-mainnet.g.alchemy.com/v2/TU_API_KEY
OP_RPC_WS=wss://opt-mainnet.g.alchemy.com/v2/TU_API_KEY

# ─────────────────────────────────────────────────────────────────────────────────
# POLYGON RPCs
# ─────────────────────────────────────────────────────────────────────────────────
POLY_RPC_READ=https://polygon-mainnet.g.alchemy.com/v2/TU_API_KEY
POLY_RPC_SIM=https://polygon-mainnet.g.alchemy.com/v2/TU_API_KEY
POLY_RPC_SEND=https://polygon-mainnet.g.alchemy.com/v2/TU_API_KEY
POLY_RPC_WS=wss://polygon-mainnet.g.alchemy.com/v2/TU_API_KEY

# ─────────────────────────────────────────────────────────────────────────────────
# BLOCK EXPLORER API KEYS (para verificar contratos)
# ─────────────────────────────────────────────────────────────────────────────────
BASESCAN_API_KEY=
ARBISCAN_API_KEY=
OPSCAN_API_KEY=
POLYGONSCAN_API_KEY=

# ─────────────────────────────────────────────────────────────────────────────────
# MODO
# ─────────────────────────────────────────────────────────────────────────────────
DRY_RUN=true
LOG_LEVEL=info
```

---

## ✅ Verificar conexión {#verificar}

Ejecuta este script para verificar que todos los RPCs funcionan:

```bash
npx tsx scripts/verify-rpcs.ts
```

O manualmente:

```javascript
// scripts/verify-rpcs.ts
import { ethers } from "ethers";
import "dotenv/config";

const chains = [
  { name: "Base", rpc: process.env.BASE_RPC_READ, chainId: 8453 },
  { name: "Arbitrum", rpc: process.env.ARB_RPC_READ, chainId: 42161 },
  { name: "Optimism", rpc: process.env.OP_RPC_READ, chainId: 10 },
  { name: "Polygon", rpc: process.env.POLY_RPC_READ, chainId: 137 }
];

async function verify() {
  console.log("🔍 Verificando RPCs...\n");
  
  for (const chain of chains) {
    try {
      const provider = new ethers.JsonRpcProvider(chain.rpc);
      const network = await provider.getNetwork();
      const block = await provider.getBlockNumber();
      
      if (Number(network.chainId) === chain.chainId) {
        console.log(`✅ ${chain.name}: OK (Block #${block})`);
      } else {
        console.log(`❌ ${chain.name}: Chain ID incorrecto`);
      }
    } catch (error: any) {
      console.log(`❌ ${chain.name}: ${error.message}`);
    }
  }
}

verify();
```

---

## 📊 Resumen de pasos

### Para empezar RÁPIDO (RPCs públicos):
1. Copia el bloque de "RPCs Públicos" al `.env`
2. Agrega tu `PRIVATE_KEY`
3. Ejecuta `npm run dev`

### Para PRODUCCIÓN (Alchemy):
1. Crea cuenta en Alchemy
2. Crea 4 apps (una por cadena)
3. Copia los endpoints al `.env`
4. Agrega tu `PRIVATE_KEY`
5. Ejecuta `npm run dev`

---

## ⚠️ Notas importantes

1. **Seguridad**: NUNCA compartas tu `PRIVATE_KEY`
2. **Rate Limits**: Los RPCs públicos tienen límites (~100 req/seg)
3. **Latencia**: Alchemy/Infura tienen ~50ms, públicos ~200ms
4. **Costo**: Alchemy free tier = 300M compute units/mes
5. **WebSocket**: Necesario para actualizaciones en tiempo real

---

## 🆘 Troubleshooting

### Error: "Rate limited"
- Usa RPCs privados (Alchemy/Infura)
- Aumenta `TICK_MS` a 1000+

### Error: "Connection refused"
- Verifica que el RPC esté activo
- Prueba con un RPC alternativo

### Error: "Chain ID mismatch"
- Verifica que usas el RPC correcto para cada cadena
- Base = 8453, Arbitrum = 42161, Optimism = 10, Polygon = 137

---

¡Listo! Con esta guía puedes configurar todos los RPCs necesarios. 🚀



## 📋 Índice
1. [Resumen de lo que necesitas](#resumen)
2. [Crear RPCs en Alchemy](#alchemy)
3. [Crear RPCs en Infura](#infura)
4. [RPCs Públicos (gratuitos)](#publicos)
5. [Configuración del .env](#configuracion)
6. [Verificar conexión](#verificar)

---

## 🎯 Resumen de lo que necesitas {#resumen}

Para cada cadena necesitas **4 tipos de RPC**:

| Tipo | Uso | Prioridad |
|------|-----|-----------|
| `READ` | Leer datos (balances, precios) | Alta |
| `SIM` | Simular transacciones (eth_call) | Alta |
| `SEND` | Enviar transacciones | Crítica |
| `WS` | WebSocket (tiempo real) | Media |

### Cadenas soportadas:
- ✅ **Base** (Chain ID: 8453)
- ✅ **Arbitrum One** (Chain ID: 42161)
- ✅ **Optimism** (Chain ID: 10)
- ✅ **Polygon** (Chain ID: 137)

---

## 🔷 Opción 1: Crear RPCs en Alchemy (RECOMENDADO) {#alchemy}

### Paso 1: Crear cuenta
1. Ve a https://www.alchemy.com/
2. Click en "Get started for free"
3. Registra tu cuenta con email

### Paso 2: Crear Apps para cada cadena

#### Para BASE:
1. Dashboard → Create new app
2. **Name**: `MultiChain-Arb-Base`
3. **Chain**: Base
4. **Network**: Base Mainnet
5. Click "Create app"
6. Copia el **HTTPS** y **WSS** endpoint

#### Para ARBITRUM:
1. Dashboard → Create new app
2. **Name**: `MultiChain-Arb-Arbitrum`
3. **Chain**: Arbitrum
4. **Network**: Arbitrum Mainnet
5. Click "Create app"
6. Copia el **HTTPS** y **WSS** endpoint

#### Para OPTIMISM:
1. Dashboard → Create new app
2. **Name**: `MultiChain-Arb-Optimism`
3. **Chain**: Optimism
4. **Network**: Optimism Mainnet
5. Click "Create app"
6. Copia el **HTTPS** y **WSS** endpoint

#### Para POLYGON:
1. Dashboard → Create new app
2. **Name**: `MultiChain-Arb-Polygon`
3. **Chain**: Polygon
4. **Network**: Polygon Mainnet
5. Click "Create app"
6. Copia el **HTTPS** y **WSS** endpoint

### Formato de URLs Alchemy:
```
HTTPS: https://{chain}-mainnet.g.alchemy.com/v2/{API_KEY}
WSS:   wss://{chain}-mainnet.g.alchemy.com/v2/{API_KEY}
```

### Ejemplo real:
```env
# Base
BASE_RPC_READ=https://base-mainnet.g.alchemy.com/v2/abc123xyz
BASE_RPC_SIM=https://base-mainnet.g.alchemy.com/v2/abc123xyz
BASE_RPC_SEND=https://base-mainnet.g.alchemy.com/v2/abc123xyz
BASE_RPC_WS=wss://base-mainnet.g.alchemy.com/v2/abc123xyz

# Arbitrum
ARB_RPC_READ=https://arb-mainnet.g.alchemy.com/v2/def456uvw
ARB_RPC_SIM=https://arb-mainnet.g.alchemy.com/v2/def456uvw
ARB_RPC_SEND=https://arb-mainnet.g.alchemy.com/v2/def456uvw
ARB_RPC_WS=wss://arb-mainnet.g.alchemy.com/v2/def456uvw

# Optimism
OP_RPC_READ=https://opt-mainnet.g.alchemy.com/v2/ghi789rst
OP_RPC_SIM=https://opt-mainnet.g.alchemy.com/v2/ghi789rst
OP_RPC_SEND=https://opt-mainnet.g.alchemy.com/v2/ghi789rst
OP_RPC_WS=wss://opt-mainnet.g.alchemy.com/v2/ghi789rst

# Polygon
POLY_RPC_READ=https://polygon-mainnet.g.alchemy.com/v2/jkl012mno
POLY_RPC_SIM=https://polygon-mainnet.g.alchemy.com/v2/jkl012mno
POLY_RPC_SEND=https://polygon-mainnet.g.alchemy.com/v2/jkl012mno
POLY_RPC_WS=wss://polygon-mainnet.g.alchemy.com/v2/jkl012mno
```

### Plan gratuito de Alchemy:
- ✅ 300M compute units/mes
- ✅ Suficiente para ~10,000 operaciones/día
- ✅ WebSocket incluido

---

## 🔶 Opción 2: Crear RPCs en Infura {#infura}

### Paso 1: Crear cuenta
1. Ve a https://www.infura.io/
2. Click en "Sign Up"
3. Registra tu cuenta

### Paso 2: Crear proyecto
1. Dashboard → Create new API key
2. **Name**: `MultiChain-Arb`
3. Selecciona las redes:
   - ✅ Arbitrum
   - ✅ Optimism
   - ✅ Polygon
   - ❌ Base (no soportado en Infura)

### Formato de URLs Infura:
```
HTTPS: https://{network}.infura.io/v3/{PROJECT_ID}
WSS:   wss://{network}.infura.io/ws/v3/{PROJECT_ID}
```

### Ejemplo:
```env
# Arbitrum (Infura)
ARB_RPC_READ=https://arbitrum-mainnet.infura.io/v3/abc123
ARB_RPC_WS=wss://arbitrum-mainnet.infura.io/ws/v3/abc123

# Optimism (Infura)
OP_RPC_READ=https://optimism-mainnet.infura.io/v3/abc123
OP_RPC_WS=wss://optimism-mainnet.infura.io/ws/v3/abc123

# Polygon (Infura)
POLY_RPC_READ=https://polygon-mainnet.infura.io/v3/abc123
POLY_RPC_WS=wss://polygon-mainnet.infura.io/ws/v3/abc123
```

---

## 🆓 Opción 3: RPCs Públicos (Gratuitos) {#publicos}

⚠️ **Advertencia**: Los RPCs públicos tienen límites de rate y pueden ser lentos.
Solo usar para pruebas, NO para producción.

```env
# ═══════════════════════════════════════════════════════════════════════════════
# BASE - RPCs Públicos
# ═══════════════════════════════════════════════════════════════════════════════
BASE_RPC_READ=https://mainnet.base.org
BASE_RPC_SIM=https://mainnet.base.org
BASE_RPC_SEND=https://mainnet.base.org
BASE_RPC_WS=wss://base-mainnet.publicnode.com

# ═══════════════════════════════════════════════════════════════════════════════
# ARBITRUM - RPCs Públicos
# ═══════════════════════════════════════════════════════════════════════════════
ARB_RPC_READ=https://arb1.arbitrum.io/rpc
ARB_RPC_SIM=https://arb1.arbitrum.io/rpc
ARB_RPC_SEND=https://arb1.arbitrum.io/rpc
ARB_RPC_WS=wss://arbitrum-one.publicnode.com

# ═══════════════════════════════════════════════════════════════════════════════
# OPTIMISM - RPCs Públicos
# ═══════════════════════════════════════════════════════════════════════════════
OP_RPC_READ=https://mainnet.optimism.io
OP_RPC_SIM=https://mainnet.optimism.io
OP_RPC_SEND=https://mainnet.optimism.io
OP_RPC_WS=wss://optimism.publicnode.com

# ═══════════════════════════════════════════════════════════════════════════════
# POLYGON - RPCs Públicos
# ═══════════════════════════════════════════════════════════════════════════════
POLY_RPC_READ=https://polygon-rpc.com
POLY_RPC_SIM=https://polygon-rpc.com
POLY_RPC_SEND=https://polygon-rpc.com
POLY_RPC_WS=wss://polygon-bor.publicnode.com
```

### Otros RPCs públicos alternativos:

| Cadena | RPC Alternativo |
|--------|-----------------|
| Base | `https://base.llamarpc.com` |
| Arbitrum | `https://arbitrum.llamarpc.com` |
| Optimism | `https://optimism.llamarpc.com` |
| Polygon | `https://polygon.llamarpc.com` |

---

## ⚙️ Configuración del .env {#configuracion}

Crea el archivo `.env` en la raíz del proyecto:

```env
# ═══════════════════════════════════════════════════════════════════════════════
# MULTI-CHAIN MICRO ARBITRAGE BOT - CONFIGURACIÓN
# ═══════════════════════════════════════════════════════════════════════════════

# ─────────────────────────────────────────────────────────────────────────────────
# WALLET (¡NUNCA COMPARTAS ESTA CLAVE!)
# ─────────────────────────────────────────────────────────────────────────────────
PRIVATE_KEY=0xTU_CLAVE_PRIVADA_AQUI

# ─────────────────────────────────────────────────────────────────────────────────
# TIMING
# ─────────────────────────────────────────────────────────────────────────────────
TICK_MS=700
DECISION_MS=5000

# ─────────────────────────────────────────────────────────────────────────────────
# TRADING
# ─────────────────────────────────────────────────────────────────────────────────
MIN_PROFIT_USD=0.50
GAS_MULT=1.7
MAX_SLIPPAGE_BPS=10
DEADLINE_SECONDS=20

# ─────────────────────────────────────────────────────────────────────────────────
# CHAINS HABILITADAS
# ─────────────────────────────────────────────────────────────────────────────────
CHAINS=base,arbitrum,optimism,polygon

# ─────────────────────────────────────────────────────────────────────────────────
# BASE RPCs (Alchemy recomendado)
# ─────────────────────────────────────────────────────────────────────────────────
BASE_RPC_READ=https://base-mainnet.g.alchemy.com/v2/TU_API_KEY
BASE_RPC_SIM=https://base-mainnet.g.alchemy.com/v2/TU_API_KEY
BASE_RPC_SEND=https://base-mainnet.g.alchemy.com/v2/TU_API_KEY
BASE_RPC_WS=wss://base-mainnet.g.alchemy.com/v2/TU_API_KEY

# ─────────────────────────────────────────────────────────────────────────────────
# ARBITRUM RPCs
# ─────────────────────────────────────────────────────────────────────────────────
ARB_RPC_READ=https://arb-mainnet.g.alchemy.com/v2/TU_API_KEY
ARB_RPC_SIM=https://arb-mainnet.g.alchemy.com/v2/TU_API_KEY
ARB_RPC_SEND=https://arb-mainnet.g.alchemy.com/v2/TU_API_KEY
ARB_RPC_WS=wss://arb-mainnet.g.alchemy.com/v2/TU_API_KEY

# ─────────────────────────────────────────────────────────────────────────────────
# OPTIMISM RPCs
# ─────────────────────────────────────────────────────────────────────────────────
OP_RPC_READ=https://opt-mainnet.g.alchemy.com/v2/TU_API_KEY
OP_RPC_SIM=https://opt-mainnet.g.alchemy.com/v2/TU_API_KEY
OP_RPC_SEND=https://opt-mainnet.g.alchemy.com/v2/TU_API_KEY
OP_RPC_WS=wss://opt-mainnet.g.alchemy.com/v2/TU_API_KEY

# ─────────────────────────────────────────────────────────────────────────────────
# POLYGON RPCs
# ─────────────────────────────────────────────────────────────────────────────────
POLY_RPC_READ=https://polygon-mainnet.g.alchemy.com/v2/TU_API_KEY
POLY_RPC_SIM=https://polygon-mainnet.g.alchemy.com/v2/TU_API_KEY
POLY_RPC_SEND=https://polygon-mainnet.g.alchemy.com/v2/TU_API_KEY
POLY_RPC_WS=wss://polygon-mainnet.g.alchemy.com/v2/TU_API_KEY

# ─────────────────────────────────────────────────────────────────────────────────
# BLOCK EXPLORER API KEYS (para verificar contratos)
# ─────────────────────────────────────────────────────────────────────────────────
BASESCAN_API_KEY=
ARBISCAN_API_KEY=
OPSCAN_API_KEY=
POLYGONSCAN_API_KEY=

# ─────────────────────────────────────────────────────────────────────────────────
# MODO
# ─────────────────────────────────────────────────────────────────────────────────
DRY_RUN=true
LOG_LEVEL=info
```

---

## ✅ Verificar conexión {#verificar}

Ejecuta este script para verificar que todos los RPCs funcionan:

```bash
npx tsx scripts/verify-rpcs.ts
```

O manualmente:

```javascript
// scripts/verify-rpcs.ts
import { ethers } from "ethers";
import "dotenv/config";

const chains = [
  { name: "Base", rpc: process.env.BASE_RPC_READ, chainId: 8453 },
  { name: "Arbitrum", rpc: process.env.ARB_RPC_READ, chainId: 42161 },
  { name: "Optimism", rpc: process.env.OP_RPC_READ, chainId: 10 },
  { name: "Polygon", rpc: process.env.POLY_RPC_READ, chainId: 137 }
];

async function verify() {
  console.log("🔍 Verificando RPCs...\n");
  
  for (const chain of chains) {
    try {
      const provider = new ethers.JsonRpcProvider(chain.rpc);
      const network = await provider.getNetwork();
      const block = await provider.getBlockNumber();
      
      if (Number(network.chainId) === chain.chainId) {
        console.log(`✅ ${chain.name}: OK (Block #${block})`);
      } else {
        console.log(`❌ ${chain.name}: Chain ID incorrecto`);
      }
    } catch (error: any) {
      console.log(`❌ ${chain.name}: ${error.message}`);
    }
  }
}

verify();
```

---

## 📊 Resumen de pasos

### Para empezar RÁPIDO (RPCs públicos):
1. Copia el bloque de "RPCs Públicos" al `.env`
2. Agrega tu `PRIVATE_KEY`
3. Ejecuta `npm run dev`

### Para PRODUCCIÓN (Alchemy):
1. Crea cuenta en Alchemy
2. Crea 4 apps (una por cadena)
3. Copia los endpoints al `.env`
4. Agrega tu `PRIVATE_KEY`
5. Ejecuta `npm run dev`

---

## ⚠️ Notas importantes

1. **Seguridad**: NUNCA compartas tu `PRIVATE_KEY`
2. **Rate Limits**: Los RPCs públicos tienen límites (~100 req/seg)
3. **Latencia**: Alchemy/Infura tienen ~50ms, públicos ~200ms
4. **Costo**: Alchemy free tier = 300M compute units/mes
5. **WebSocket**: Necesario para actualizaciones en tiempo real

---

## 🆘 Troubleshooting

### Error: "Rate limited"
- Usa RPCs privados (Alchemy/Infura)
- Aumenta `TICK_MS` a 1000+

### Error: "Connection refused"
- Verifica que el RPC esté activo
- Prueba con un RPC alternativo

### Error: "Chain ID mismatch"
- Verifica que usas el RPC correcto para cada cadena
- Base = 8453, Arbitrum = 42161, Optimism = 10, Polygon = 137

---

¡Listo! Con esta guía puedes configurar todos los RPCs necesarios. 🚀



## 📋 Índice
1. [Resumen de lo que necesitas](#resumen)
2. [Crear RPCs en Alchemy](#alchemy)
3. [Crear RPCs en Infura](#infura)
4. [RPCs Públicos (gratuitos)](#publicos)
5. [Configuración del .env](#configuracion)
6. [Verificar conexión](#verificar)

---

## 🎯 Resumen de lo que necesitas {#resumen}

Para cada cadena necesitas **4 tipos de RPC**:

| Tipo | Uso | Prioridad |
|------|-----|-----------|
| `READ` | Leer datos (balances, precios) | Alta |
| `SIM` | Simular transacciones (eth_call) | Alta |
| `SEND` | Enviar transacciones | Crítica |
| `WS` | WebSocket (tiempo real) | Media |

### Cadenas soportadas:
- ✅ **Base** (Chain ID: 8453)
- ✅ **Arbitrum One** (Chain ID: 42161)
- ✅ **Optimism** (Chain ID: 10)
- ✅ **Polygon** (Chain ID: 137)

---

## 🔷 Opción 1: Crear RPCs en Alchemy (RECOMENDADO) {#alchemy}

### Paso 1: Crear cuenta
1. Ve a https://www.alchemy.com/
2. Click en "Get started for free"
3. Registra tu cuenta con email

### Paso 2: Crear Apps para cada cadena

#### Para BASE:
1. Dashboard → Create new app
2. **Name**: `MultiChain-Arb-Base`
3. **Chain**: Base
4. **Network**: Base Mainnet
5. Click "Create app"
6. Copia el **HTTPS** y **WSS** endpoint

#### Para ARBITRUM:
1. Dashboard → Create new app
2. **Name**: `MultiChain-Arb-Arbitrum`
3. **Chain**: Arbitrum
4. **Network**: Arbitrum Mainnet
5. Click "Create app"
6. Copia el **HTTPS** y **WSS** endpoint

#### Para OPTIMISM:
1. Dashboard → Create new app
2. **Name**: `MultiChain-Arb-Optimism`
3. **Chain**: Optimism
4. **Network**: Optimism Mainnet
5. Click "Create app"
6. Copia el **HTTPS** y **WSS** endpoint

#### Para POLYGON:
1. Dashboard → Create new app
2. **Name**: `MultiChain-Arb-Polygon`
3. **Chain**: Polygon
4. **Network**: Polygon Mainnet
5. Click "Create app"
6. Copia el **HTTPS** y **WSS** endpoint

### Formato de URLs Alchemy:
```
HTTPS: https://{chain}-mainnet.g.alchemy.com/v2/{API_KEY}
WSS:   wss://{chain}-mainnet.g.alchemy.com/v2/{API_KEY}
```

### Ejemplo real:
```env
# Base
BASE_RPC_READ=https://base-mainnet.g.alchemy.com/v2/abc123xyz
BASE_RPC_SIM=https://base-mainnet.g.alchemy.com/v2/abc123xyz
BASE_RPC_SEND=https://base-mainnet.g.alchemy.com/v2/abc123xyz
BASE_RPC_WS=wss://base-mainnet.g.alchemy.com/v2/abc123xyz

# Arbitrum
ARB_RPC_READ=https://arb-mainnet.g.alchemy.com/v2/def456uvw
ARB_RPC_SIM=https://arb-mainnet.g.alchemy.com/v2/def456uvw
ARB_RPC_SEND=https://arb-mainnet.g.alchemy.com/v2/def456uvw
ARB_RPC_WS=wss://arb-mainnet.g.alchemy.com/v2/def456uvw

# Optimism
OP_RPC_READ=https://opt-mainnet.g.alchemy.com/v2/ghi789rst
OP_RPC_SIM=https://opt-mainnet.g.alchemy.com/v2/ghi789rst
OP_RPC_SEND=https://opt-mainnet.g.alchemy.com/v2/ghi789rst
OP_RPC_WS=wss://opt-mainnet.g.alchemy.com/v2/ghi789rst

# Polygon
POLY_RPC_READ=https://polygon-mainnet.g.alchemy.com/v2/jkl012mno
POLY_RPC_SIM=https://polygon-mainnet.g.alchemy.com/v2/jkl012mno
POLY_RPC_SEND=https://polygon-mainnet.g.alchemy.com/v2/jkl012mno
POLY_RPC_WS=wss://polygon-mainnet.g.alchemy.com/v2/jkl012mno
```

### Plan gratuito de Alchemy:
- ✅ 300M compute units/mes
- ✅ Suficiente para ~10,000 operaciones/día
- ✅ WebSocket incluido

---

## 🔶 Opción 2: Crear RPCs en Infura {#infura}

### Paso 1: Crear cuenta
1. Ve a https://www.infura.io/
2. Click en "Sign Up"
3. Registra tu cuenta

### Paso 2: Crear proyecto
1. Dashboard → Create new API key
2. **Name**: `MultiChain-Arb`
3. Selecciona las redes:
   - ✅ Arbitrum
   - ✅ Optimism
   - ✅ Polygon
   - ❌ Base (no soportado en Infura)

### Formato de URLs Infura:
```
HTTPS: https://{network}.infura.io/v3/{PROJECT_ID}
WSS:   wss://{network}.infura.io/ws/v3/{PROJECT_ID}
```

### Ejemplo:
```env
# Arbitrum (Infura)
ARB_RPC_READ=https://arbitrum-mainnet.infura.io/v3/abc123
ARB_RPC_WS=wss://arbitrum-mainnet.infura.io/ws/v3/abc123

# Optimism (Infura)
OP_RPC_READ=https://optimism-mainnet.infura.io/v3/abc123
OP_RPC_WS=wss://optimism-mainnet.infura.io/ws/v3/abc123

# Polygon (Infura)
POLY_RPC_READ=https://polygon-mainnet.infura.io/v3/abc123
POLY_RPC_WS=wss://polygon-mainnet.infura.io/ws/v3/abc123
```

---

## 🆓 Opción 3: RPCs Públicos (Gratuitos) {#publicos}

⚠️ **Advertencia**: Los RPCs públicos tienen límites de rate y pueden ser lentos.
Solo usar para pruebas, NO para producción.

```env
# ═══════════════════════════════════════════════════════════════════════════════
# BASE - RPCs Públicos
# ═══════════════════════════════════════════════════════════════════════════════
BASE_RPC_READ=https://mainnet.base.org
BASE_RPC_SIM=https://mainnet.base.org
BASE_RPC_SEND=https://mainnet.base.org
BASE_RPC_WS=wss://base-mainnet.publicnode.com

# ═══════════════════════════════════════════════════════════════════════════════
# ARBITRUM - RPCs Públicos
# ═══════════════════════════════════════════════════════════════════════════════
ARB_RPC_READ=https://arb1.arbitrum.io/rpc
ARB_RPC_SIM=https://arb1.arbitrum.io/rpc
ARB_RPC_SEND=https://arb1.arbitrum.io/rpc
ARB_RPC_WS=wss://arbitrum-one.publicnode.com

# ═══════════════════════════════════════════════════════════════════════════════
# OPTIMISM - RPCs Públicos
# ═══════════════════════════════════════════════════════════════════════════════
OP_RPC_READ=https://mainnet.optimism.io
OP_RPC_SIM=https://mainnet.optimism.io
OP_RPC_SEND=https://mainnet.optimism.io
OP_RPC_WS=wss://optimism.publicnode.com

# ═══════════════════════════════════════════════════════════════════════════════
# POLYGON - RPCs Públicos
# ═══════════════════════════════════════════════════════════════════════════════
POLY_RPC_READ=https://polygon-rpc.com
POLY_RPC_SIM=https://polygon-rpc.com
POLY_RPC_SEND=https://polygon-rpc.com
POLY_RPC_WS=wss://polygon-bor.publicnode.com
```

### Otros RPCs públicos alternativos:

| Cadena | RPC Alternativo |
|--------|-----------------|
| Base | `https://base.llamarpc.com` |
| Arbitrum | `https://arbitrum.llamarpc.com` |
| Optimism | `https://optimism.llamarpc.com` |
| Polygon | `https://polygon.llamarpc.com` |

---

## ⚙️ Configuración del .env {#configuracion}

Crea el archivo `.env` en la raíz del proyecto:

```env
# ═══════════════════════════════════════════════════════════════════════════════
# MULTI-CHAIN MICRO ARBITRAGE BOT - CONFIGURACIÓN
# ═══════════════════════════════════════════════════════════════════════════════

# ─────────────────────────────────────────────────────────────────────────────────
# WALLET (¡NUNCA COMPARTAS ESTA CLAVE!)
# ─────────────────────────────────────────────────────────────────────────────────
PRIVATE_KEY=0xTU_CLAVE_PRIVADA_AQUI

# ─────────────────────────────────────────────────────────────────────────────────
# TIMING
# ─────────────────────────────────────────────────────────────────────────────────
TICK_MS=700
DECISION_MS=5000

# ─────────────────────────────────────────────────────────────────────────────────
# TRADING
# ─────────────────────────────────────────────────────────────────────────────────
MIN_PROFIT_USD=0.50
GAS_MULT=1.7
MAX_SLIPPAGE_BPS=10
DEADLINE_SECONDS=20

# ─────────────────────────────────────────────────────────────────────────────────
# CHAINS HABILITADAS
# ─────────────────────────────────────────────────────────────────────────────────
CHAINS=base,arbitrum,optimism,polygon

# ─────────────────────────────────────────────────────────────────────────────────
# BASE RPCs (Alchemy recomendado)
# ─────────────────────────────────────────────────────────────────────────────────
BASE_RPC_READ=https://base-mainnet.g.alchemy.com/v2/TU_API_KEY
BASE_RPC_SIM=https://base-mainnet.g.alchemy.com/v2/TU_API_KEY
BASE_RPC_SEND=https://base-mainnet.g.alchemy.com/v2/TU_API_KEY
BASE_RPC_WS=wss://base-mainnet.g.alchemy.com/v2/TU_API_KEY

# ─────────────────────────────────────────────────────────────────────────────────
# ARBITRUM RPCs
# ─────────────────────────────────────────────────────────────────────────────────
ARB_RPC_READ=https://arb-mainnet.g.alchemy.com/v2/TU_API_KEY
ARB_RPC_SIM=https://arb-mainnet.g.alchemy.com/v2/TU_API_KEY
ARB_RPC_SEND=https://arb-mainnet.g.alchemy.com/v2/TU_API_KEY
ARB_RPC_WS=wss://arb-mainnet.g.alchemy.com/v2/TU_API_KEY

# ─────────────────────────────────────────────────────────────────────────────────
# OPTIMISM RPCs
# ─────────────────────────────────────────────────────────────────────────────────
OP_RPC_READ=https://opt-mainnet.g.alchemy.com/v2/TU_API_KEY
OP_RPC_SIM=https://opt-mainnet.g.alchemy.com/v2/TU_API_KEY
OP_RPC_SEND=https://opt-mainnet.g.alchemy.com/v2/TU_API_KEY
OP_RPC_WS=wss://opt-mainnet.g.alchemy.com/v2/TU_API_KEY

# ─────────────────────────────────────────────────────────────────────────────────
# POLYGON RPCs
# ─────────────────────────────────────────────────────────────────────────────────
POLY_RPC_READ=https://polygon-mainnet.g.alchemy.com/v2/TU_API_KEY
POLY_RPC_SIM=https://polygon-mainnet.g.alchemy.com/v2/TU_API_KEY
POLY_RPC_SEND=https://polygon-mainnet.g.alchemy.com/v2/TU_API_KEY
POLY_RPC_WS=wss://polygon-mainnet.g.alchemy.com/v2/TU_API_KEY

# ─────────────────────────────────────────────────────────────────────────────────
# BLOCK EXPLORER API KEYS (para verificar contratos)
# ─────────────────────────────────────────────────────────────────────────────────
BASESCAN_API_KEY=
ARBISCAN_API_KEY=
OPSCAN_API_KEY=
POLYGONSCAN_API_KEY=

# ─────────────────────────────────────────────────────────────────────────────────
# MODO
# ─────────────────────────────────────────────────────────────────────────────────
DRY_RUN=true
LOG_LEVEL=info
```

---

## ✅ Verificar conexión {#verificar}

Ejecuta este script para verificar que todos los RPCs funcionan:

```bash
npx tsx scripts/verify-rpcs.ts
```

O manualmente:

```javascript
// scripts/verify-rpcs.ts
import { ethers } from "ethers";
import "dotenv/config";

const chains = [
  { name: "Base", rpc: process.env.BASE_RPC_READ, chainId: 8453 },
  { name: "Arbitrum", rpc: process.env.ARB_RPC_READ, chainId: 42161 },
  { name: "Optimism", rpc: process.env.OP_RPC_READ, chainId: 10 },
  { name: "Polygon", rpc: process.env.POLY_RPC_READ, chainId: 137 }
];

async function verify() {
  console.log("🔍 Verificando RPCs...\n");
  
  for (const chain of chains) {
    try {
      const provider = new ethers.JsonRpcProvider(chain.rpc);
      const network = await provider.getNetwork();
      const block = await provider.getBlockNumber();
      
      if (Number(network.chainId) === chain.chainId) {
        console.log(`✅ ${chain.name}: OK (Block #${block})`);
      } else {
        console.log(`❌ ${chain.name}: Chain ID incorrecto`);
      }
    } catch (error: any) {
      console.log(`❌ ${chain.name}: ${error.message}`);
    }
  }
}

verify();
```

---

## 📊 Resumen de pasos

### Para empezar RÁPIDO (RPCs públicos):
1. Copia el bloque de "RPCs Públicos" al `.env`
2. Agrega tu `PRIVATE_KEY`
3. Ejecuta `npm run dev`

### Para PRODUCCIÓN (Alchemy):
1. Crea cuenta en Alchemy
2. Crea 4 apps (una por cadena)
3. Copia los endpoints al `.env`
4. Agrega tu `PRIVATE_KEY`
5. Ejecuta `npm run dev`

---

## ⚠️ Notas importantes

1. **Seguridad**: NUNCA compartas tu `PRIVATE_KEY`
2. **Rate Limits**: Los RPCs públicos tienen límites (~100 req/seg)
3. **Latencia**: Alchemy/Infura tienen ~50ms, públicos ~200ms
4. **Costo**: Alchemy free tier = 300M compute units/mes
5. **WebSocket**: Necesario para actualizaciones en tiempo real

---

## 🆘 Troubleshooting

### Error: "Rate limited"
- Usa RPCs privados (Alchemy/Infura)
- Aumenta `TICK_MS` a 1000+

### Error: "Connection refused"
- Verifica que el RPC esté activo
- Prueba con un RPC alternativo

### Error: "Chain ID mismatch"
- Verifica que usas el RPC correcto para cada cadena
- Base = 8453, Arbitrum = 42161, Optimism = 10, Polygon = 137

---

¡Listo! Con esta guía puedes configurar todos los RPCs necesarios. 🚀



## 📋 Índice
1. [Resumen de lo que necesitas](#resumen)
2. [Crear RPCs en Alchemy](#alchemy)
3. [Crear RPCs en Infura](#infura)
4. [RPCs Públicos (gratuitos)](#publicos)
5. [Configuración del .env](#configuracion)
6. [Verificar conexión](#verificar)

---

## 🎯 Resumen de lo que necesitas {#resumen}

Para cada cadena necesitas **4 tipos de RPC**:

| Tipo | Uso | Prioridad |
|------|-----|-----------|
| `READ` | Leer datos (balances, precios) | Alta |
| `SIM` | Simular transacciones (eth_call) | Alta |
| `SEND` | Enviar transacciones | Crítica |
| `WS` | WebSocket (tiempo real) | Media |

### Cadenas soportadas:
- ✅ **Base** (Chain ID: 8453)
- ✅ **Arbitrum One** (Chain ID: 42161)
- ✅ **Optimism** (Chain ID: 10)
- ✅ **Polygon** (Chain ID: 137)

---

## 🔷 Opción 1: Crear RPCs en Alchemy (RECOMENDADO) {#alchemy}

### Paso 1: Crear cuenta
1. Ve a https://www.alchemy.com/
2. Click en "Get started for free"
3. Registra tu cuenta con email

### Paso 2: Crear Apps para cada cadena

#### Para BASE:
1. Dashboard → Create new app
2. **Name**: `MultiChain-Arb-Base`
3. **Chain**: Base
4. **Network**: Base Mainnet
5. Click "Create app"
6. Copia el **HTTPS** y **WSS** endpoint

#### Para ARBITRUM:
1. Dashboard → Create new app
2. **Name**: `MultiChain-Arb-Arbitrum`
3. **Chain**: Arbitrum
4. **Network**: Arbitrum Mainnet
5. Click "Create app"
6. Copia el **HTTPS** y **WSS** endpoint

#### Para OPTIMISM:
1. Dashboard → Create new app
2. **Name**: `MultiChain-Arb-Optimism`
3. **Chain**: Optimism
4. **Network**: Optimism Mainnet
5. Click "Create app"
6. Copia el **HTTPS** y **WSS** endpoint

#### Para POLYGON:
1. Dashboard → Create new app
2. **Name**: `MultiChain-Arb-Polygon`
3. **Chain**: Polygon
4. **Network**: Polygon Mainnet
5. Click "Create app"
6. Copia el **HTTPS** y **WSS** endpoint

### Formato de URLs Alchemy:
```
HTTPS: https://{chain}-mainnet.g.alchemy.com/v2/{API_KEY}
WSS:   wss://{chain}-mainnet.g.alchemy.com/v2/{API_KEY}
```

### Ejemplo real:
```env
# Base
BASE_RPC_READ=https://base-mainnet.g.alchemy.com/v2/abc123xyz
BASE_RPC_SIM=https://base-mainnet.g.alchemy.com/v2/abc123xyz
BASE_RPC_SEND=https://base-mainnet.g.alchemy.com/v2/abc123xyz
BASE_RPC_WS=wss://base-mainnet.g.alchemy.com/v2/abc123xyz

# Arbitrum
ARB_RPC_READ=https://arb-mainnet.g.alchemy.com/v2/def456uvw
ARB_RPC_SIM=https://arb-mainnet.g.alchemy.com/v2/def456uvw
ARB_RPC_SEND=https://arb-mainnet.g.alchemy.com/v2/def456uvw
ARB_RPC_WS=wss://arb-mainnet.g.alchemy.com/v2/def456uvw

# Optimism
OP_RPC_READ=https://opt-mainnet.g.alchemy.com/v2/ghi789rst
OP_RPC_SIM=https://opt-mainnet.g.alchemy.com/v2/ghi789rst
OP_RPC_SEND=https://opt-mainnet.g.alchemy.com/v2/ghi789rst
OP_RPC_WS=wss://opt-mainnet.g.alchemy.com/v2/ghi789rst

# Polygon
POLY_RPC_READ=https://polygon-mainnet.g.alchemy.com/v2/jkl012mno
POLY_RPC_SIM=https://polygon-mainnet.g.alchemy.com/v2/jkl012mno
POLY_RPC_SEND=https://polygon-mainnet.g.alchemy.com/v2/jkl012mno
POLY_RPC_WS=wss://polygon-mainnet.g.alchemy.com/v2/jkl012mno
```

### Plan gratuito de Alchemy:
- ✅ 300M compute units/mes
- ✅ Suficiente para ~10,000 operaciones/día
- ✅ WebSocket incluido

---

## 🔶 Opción 2: Crear RPCs en Infura {#infura}

### Paso 1: Crear cuenta
1. Ve a https://www.infura.io/
2. Click en "Sign Up"
3. Registra tu cuenta

### Paso 2: Crear proyecto
1. Dashboard → Create new API key
2. **Name**: `MultiChain-Arb`
3. Selecciona las redes:
   - ✅ Arbitrum
   - ✅ Optimism
   - ✅ Polygon
   - ❌ Base (no soportado en Infura)

### Formato de URLs Infura:
```
HTTPS: https://{network}.infura.io/v3/{PROJECT_ID}
WSS:   wss://{network}.infura.io/ws/v3/{PROJECT_ID}
```

### Ejemplo:
```env
# Arbitrum (Infura)
ARB_RPC_READ=https://arbitrum-mainnet.infura.io/v3/abc123
ARB_RPC_WS=wss://arbitrum-mainnet.infura.io/ws/v3/abc123

# Optimism (Infura)
OP_RPC_READ=https://optimism-mainnet.infura.io/v3/abc123
OP_RPC_WS=wss://optimism-mainnet.infura.io/ws/v3/abc123

# Polygon (Infura)
POLY_RPC_READ=https://polygon-mainnet.infura.io/v3/abc123
POLY_RPC_WS=wss://polygon-mainnet.infura.io/ws/v3/abc123
```

---

## 🆓 Opción 3: RPCs Públicos (Gratuitos) {#publicos}

⚠️ **Advertencia**: Los RPCs públicos tienen límites de rate y pueden ser lentos.
Solo usar para pruebas, NO para producción.

```env
# ═══════════════════════════════════════════════════════════════════════════════
# BASE - RPCs Públicos
# ═══════════════════════════════════════════════════════════════════════════════
BASE_RPC_READ=https://mainnet.base.org
BASE_RPC_SIM=https://mainnet.base.org
BASE_RPC_SEND=https://mainnet.base.org
BASE_RPC_WS=wss://base-mainnet.publicnode.com

# ═══════════════════════════════════════════════════════════════════════════════
# ARBITRUM - RPCs Públicos
# ═══════════════════════════════════════════════════════════════════════════════
ARB_RPC_READ=https://arb1.arbitrum.io/rpc
ARB_RPC_SIM=https://arb1.arbitrum.io/rpc
ARB_RPC_SEND=https://arb1.arbitrum.io/rpc
ARB_RPC_WS=wss://arbitrum-one.publicnode.com

# ═══════════════════════════════════════════════════════════════════════════════
# OPTIMISM - RPCs Públicos
# ═══════════════════════════════════════════════════════════════════════════════
OP_RPC_READ=https://mainnet.optimism.io
OP_RPC_SIM=https://mainnet.optimism.io
OP_RPC_SEND=https://mainnet.optimism.io
OP_RPC_WS=wss://optimism.publicnode.com

# ═══════════════════════════════════════════════════════════════════════════════
# POLYGON - RPCs Públicos
# ═══════════════════════════════════════════════════════════════════════════════
POLY_RPC_READ=https://polygon-rpc.com
POLY_RPC_SIM=https://polygon-rpc.com
POLY_RPC_SEND=https://polygon-rpc.com
POLY_RPC_WS=wss://polygon-bor.publicnode.com
```

### Otros RPCs públicos alternativos:

| Cadena | RPC Alternativo |
|--------|-----------------|
| Base | `https://base.llamarpc.com` |
| Arbitrum | `https://arbitrum.llamarpc.com` |
| Optimism | `https://optimism.llamarpc.com` |
| Polygon | `https://polygon.llamarpc.com` |

---

## ⚙️ Configuración del .env {#configuracion}

Crea el archivo `.env` en la raíz del proyecto:

```env
# ═══════════════════════════════════════════════════════════════════════════════
# MULTI-CHAIN MICRO ARBITRAGE BOT - CONFIGURACIÓN
# ═══════════════════════════════════════════════════════════════════════════════

# ─────────────────────────────────────────────────────────────────────────────────
# WALLET (¡NUNCA COMPARTAS ESTA CLAVE!)
# ─────────────────────────────────────────────────────────────────────────────────
PRIVATE_KEY=0xTU_CLAVE_PRIVADA_AQUI

# ─────────────────────────────────────────────────────────────────────────────────
# TIMING
# ─────────────────────────────────────────────────────────────────────────────────
TICK_MS=700
DECISION_MS=5000

# ─────────────────────────────────────────────────────────────────────────────────
# TRADING
# ─────────────────────────────────────────────────────────────────────────────────
MIN_PROFIT_USD=0.50
GAS_MULT=1.7
MAX_SLIPPAGE_BPS=10
DEADLINE_SECONDS=20

# ─────────────────────────────────────────────────────────────────────────────────
# CHAINS HABILITADAS
# ─────────────────────────────────────────────────────────────────────────────────
CHAINS=base,arbitrum,optimism,polygon

# ─────────────────────────────────────────────────────────────────────────────────
# BASE RPCs (Alchemy recomendado)
# ─────────────────────────────────────────────────────────────────────────────────
BASE_RPC_READ=https://base-mainnet.g.alchemy.com/v2/TU_API_KEY
BASE_RPC_SIM=https://base-mainnet.g.alchemy.com/v2/TU_API_KEY
BASE_RPC_SEND=https://base-mainnet.g.alchemy.com/v2/TU_API_KEY
BASE_RPC_WS=wss://base-mainnet.g.alchemy.com/v2/TU_API_KEY

# ─────────────────────────────────────────────────────────────────────────────────
# ARBITRUM RPCs
# ─────────────────────────────────────────────────────────────────────────────────
ARB_RPC_READ=https://arb-mainnet.g.alchemy.com/v2/TU_API_KEY
ARB_RPC_SIM=https://arb-mainnet.g.alchemy.com/v2/TU_API_KEY
ARB_RPC_SEND=https://arb-mainnet.g.alchemy.com/v2/TU_API_KEY
ARB_RPC_WS=wss://arb-mainnet.g.alchemy.com/v2/TU_API_KEY

# ─────────────────────────────────────────────────────────────────────────────────
# OPTIMISM RPCs
# ─────────────────────────────────────────────────────────────────────────────────
OP_RPC_READ=https://opt-mainnet.g.alchemy.com/v2/TU_API_KEY
OP_RPC_SIM=https://opt-mainnet.g.alchemy.com/v2/TU_API_KEY
OP_RPC_SEND=https://opt-mainnet.g.alchemy.com/v2/TU_API_KEY
OP_RPC_WS=wss://opt-mainnet.g.alchemy.com/v2/TU_API_KEY

# ─────────────────────────────────────────────────────────────────────────────────
# POLYGON RPCs
# ─────────────────────────────────────────────────────────────────────────────────
POLY_RPC_READ=https://polygon-mainnet.g.alchemy.com/v2/TU_API_KEY
POLY_RPC_SIM=https://polygon-mainnet.g.alchemy.com/v2/TU_API_KEY
POLY_RPC_SEND=https://polygon-mainnet.g.alchemy.com/v2/TU_API_KEY
POLY_RPC_WS=wss://polygon-mainnet.g.alchemy.com/v2/TU_API_KEY

# ─────────────────────────────────────────────────────────────────────────────────
# BLOCK EXPLORER API KEYS (para verificar contratos)
# ─────────────────────────────────────────────────────────────────────────────────
BASESCAN_API_KEY=
ARBISCAN_API_KEY=
OPSCAN_API_KEY=
POLYGONSCAN_API_KEY=

# ─────────────────────────────────────────────────────────────────────────────────
# MODO
# ─────────────────────────────────────────────────────────────────────────────────
DRY_RUN=true
LOG_LEVEL=info
```

---

## ✅ Verificar conexión {#verificar}

Ejecuta este script para verificar que todos los RPCs funcionan:

```bash
npx tsx scripts/verify-rpcs.ts
```

O manualmente:

```javascript
// scripts/verify-rpcs.ts
import { ethers } from "ethers";
import "dotenv/config";

const chains = [
  { name: "Base", rpc: process.env.BASE_RPC_READ, chainId: 8453 },
  { name: "Arbitrum", rpc: process.env.ARB_RPC_READ, chainId: 42161 },
  { name: "Optimism", rpc: process.env.OP_RPC_READ, chainId: 10 },
  { name: "Polygon", rpc: process.env.POLY_RPC_READ, chainId: 137 }
];

async function verify() {
  console.log("🔍 Verificando RPCs...\n");
  
  for (const chain of chains) {
    try {
      const provider = new ethers.JsonRpcProvider(chain.rpc);
      const network = await provider.getNetwork();
      const block = await provider.getBlockNumber();
      
      if (Number(network.chainId) === chain.chainId) {
        console.log(`✅ ${chain.name}: OK (Block #${block})`);
      } else {
        console.log(`❌ ${chain.name}: Chain ID incorrecto`);
      }
    } catch (error: any) {
      console.log(`❌ ${chain.name}: ${error.message}`);
    }
  }
}

verify();
```

---

## 📊 Resumen de pasos

### Para empezar RÁPIDO (RPCs públicos):
1. Copia el bloque de "RPCs Públicos" al `.env`
2. Agrega tu `PRIVATE_KEY`
3. Ejecuta `npm run dev`

### Para PRODUCCIÓN (Alchemy):
1. Crea cuenta en Alchemy
2. Crea 4 apps (una por cadena)
3. Copia los endpoints al `.env`
4. Agrega tu `PRIVATE_KEY`
5. Ejecuta `npm run dev`

---

## ⚠️ Notas importantes

1. **Seguridad**: NUNCA compartas tu `PRIVATE_KEY`
2. **Rate Limits**: Los RPCs públicos tienen límites (~100 req/seg)
3. **Latencia**: Alchemy/Infura tienen ~50ms, públicos ~200ms
4. **Costo**: Alchemy free tier = 300M compute units/mes
5. **WebSocket**: Necesario para actualizaciones en tiempo real

---

## 🆘 Troubleshooting

### Error: "Rate limited"
- Usa RPCs privados (Alchemy/Infura)
- Aumenta `TICK_MS` a 1000+

### Error: "Connection refused"
- Verifica que el RPC esté activo
- Prueba con un RPC alternativo

### Error: "Chain ID mismatch"
- Verifica que usas el RPC correcto para cada cadena
- Base = 8453, Arbitrum = 42161, Optimism = 10, Polygon = 137

---

¡Listo! Con esta guía puedes configurar todos los RPCs necesarios. 🚀



## 📋 Índice
1. [Resumen de lo que necesitas](#resumen)
2. [Crear RPCs en Alchemy](#alchemy)
3. [Crear RPCs en Infura](#infura)
4. [RPCs Públicos (gratuitos)](#publicos)
5. [Configuración del .env](#configuracion)
6. [Verificar conexión](#verificar)

---

## 🎯 Resumen de lo que necesitas {#resumen}

Para cada cadena necesitas **4 tipos de RPC**:

| Tipo | Uso | Prioridad |
|------|-----|-----------|
| `READ` | Leer datos (balances, precios) | Alta |
| `SIM` | Simular transacciones (eth_call) | Alta |
| `SEND` | Enviar transacciones | Crítica |
| `WS` | WebSocket (tiempo real) | Media |

### Cadenas soportadas:
- ✅ **Base** (Chain ID: 8453)
- ✅ **Arbitrum One** (Chain ID: 42161)
- ✅ **Optimism** (Chain ID: 10)
- ✅ **Polygon** (Chain ID: 137)

---

## 🔷 Opción 1: Crear RPCs en Alchemy (RECOMENDADO) {#alchemy}

### Paso 1: Crear cuenta
1. Ve a https://www.alchemy.com/
2. Click en "Get started for free"
3. Registra tu cuenta con email

### Paso 2: Crear Apps para cada cadena

#### Para BASE:
1. Dashboard → Create new app
2. **Name**: `MultiChain-Arb-Base`
3. **Chain**: Base
4. **Network**: Base Mainnet
5. Click "Create app"
6. Copia el **HTTPS** y **WSS** endpoint

#### Para ARBITRUM:
1. Dashboard → Create new app
2. **Name**: `MultiChain-Arb-Arbitrum`
3. **Chain**: Arbitrum
4. **Network**: Arbitrum Mainnet
5. Click "Create app"
6. Copia el **HTTPS** y **WSS** endpoint

#### Para OPTIMISM:
1. Dashboard → Create new app
2. **Name**: `MultiChain-Arb-Optimism`
3. **Chain**: Optimism
4. **Network**: Optimism Mainnet
5. Click "Create app"
6. Copia el **HTTPS** y **WSS** endpoint

#### Para POLYGON:
1. Dashboard → Create new app
2. **Name**: `MultiChain-Arb-Polygon`
3. **Chain**: Polygon
4. **Network**: Polygon Mainnet
5. Click "Create app"
6. Copia el **HTTPS** y **WSS** endpoint

### Formato de URLs Alchemy:
```
HTTPS: https://{chain}-mainnet.g.alchemy.com/v2/{API_KEY}
WSS:   wss://{chain}-mainnet.g.alchemy.com/v2/{API_KEY}
```

### Ejemplo real:
```env
# Base
BASE_RPC_READ=https://base-mainnet.g.alchemy.com/v2/abc123xyz
BASE_RPC_SIM=https://base-mainnet.g.alchemy.com/v2/abc123xyz
BASE_RPC_SEND=https://base-mainnet.g.alchemy.com/v2/abc123xyz
BASE_RPC_WS=wss://base-mainnet.g.alchemy.com/v2/abc123xyz

# Arbitrum
ARB_RPC_READ=https://arb-mainnet.g.alchemy.com/v2/def456uvw
ARB_RPC_SIM=https://arb-mainnet.g.alchemy.com/v2/def456uvw
ARB_RPC_SEND=https://arb-mainnet.g.alchemy.com/v2/def456uvw
ARB_RPC_WS=wss://arb-mainnet.g.alchemy.com/v2/def456uvw

# Optimism
OP_RPC_READ=https://opt-mainnet.g.alchemy.com/v2/ghi789rst
OP_RPC_SIM=https://opt-mainnet.g.alchemy.com/v2/ghi789rst
OP_RPC_SEND=https://opt-mainnet.g.alchemy.com/v2/ghi789rst
OP_RPC_WS=wss://opt-mainnet.g.alchemy.com/v2/ghi789rst

# Polygon
POLY_RPC_READ=https://polygon-mainnet.g.alchemy.com/v2/jkl012mno
POLY_RPC_SIM=https://polygon-mainnet.g.alchemy.com/v2/jkl012mno
POLY_RPC_SEND=https://polygon-mainnet.g.alchemy.com/v2/jkl012mno
POLY_RPC_WS=wss://polygon-mainnet.g.alchemy.com/v2/jkl012mno
```

### Plan gratuito de Alchemy:
- ✅ 300M compute units/mes
- ✅ Suficiente para ~10,000 operaciones/día
- ✅ WebSocket incluido

---

## 🔶 Opción 2: Crear RPCs en Infura {#infura}

### Paso 1: Crear cuenta
1. Ve a https://www.infura.io/
2. Click en "Sign Up"
3. Registra tu cuenta

### Paso 2: Crear proyecto
1. Dashboard → Create new API key
2. **Name**: `MultiChain-Arb`
3. Selecciona las redes:
   - ✅ Arbitrum
   - ✅ Optimism
   - ✅ Polygon
   - ❌ Base (no soportado en Infura)

### Formato de URLs Infura:
```
HTTPS: https://{network}.infura.io/v3/{PROJECT_ID}
WSS:   wss://{network}.infura.io/ws/v3/{PROJECT_ID}
```

### Ejemplo:
```env
# Arbitrum (Infura)
ARB_RPC_READ=https://arbitrum-mainnet.infura.io/v3/abc123
ARB_RPC_WS=wss://arbitrum-mainnet.infura.io/ws/v3/abc123

# Optimism (Infura)
OP_RPC_READ=https://optimism-mainnet.infura.io/v3/abc123
OP_RPC_WS=wss://optimism-mainnet.infura.io/ws/v3/abc123

# Polygon (Infura)
POLY_RPC_READ=https://polygon-mainnet.infura.io/v3/abc123
POLY_RPC_WS=wss://polygon-mainnet.infura.io/ws/v3/abc123
```

---

## 🆓 Opción 3: RPCs Públicos (Gratuitos) {#publicos}

⚠️ **Advertencia**: Los RPCs públicos tienen límites de rate y pueden ser lentos.
Solo usar para pruebas, NO para producción.

```env
# ═══════════════════════════════════════════════════════════════════════════════
# BASE - RPCs Públicos
# ═══════════════════════════════════════════════════════════════════════════════
BASE_RPC_READ=https://mainnet.base.org
BASE_RPC_SIM=https://mainnet.base.org
BASE_RPC_SEND=https://mainnet.base.org
BASE_RPC_WS=wss://base-mainnet.publicnode.com

# ═══════════════════════════════════════════════════════════════════════════════
# ARBITRUM - RPCs Públicos
# ═══════════════════════════════════════════════════════════════════════════════
ARB_RPC_READ=https://arb1.arbitrum.io/rpc
ARB_RPC_SIM=https://arb1.arbitrum.io/rpc
ARB_RPC_SEND=https://arb1.arbitrum.io/rpc
ARB_RPC_WS=wss://arbitrum-one.publicnode.com

# ═══════════════════════════════════════════════════════════════════════════════
# OPTIMISM - RPCs Públicos
# ═══════════════════════════════════════════════════════════════════════════════
OP_RPC_READ=https://mainnet.optimism.io
OP_RPC_SIM=https://mainnet.optimism.io
OP_RPC_SEND=https://mainnet.optimism.io
OP_RPC_WS=wss://optimism.publicnode.com

# ═══════════════════════════════════════════════════════════════════════════════
# POLYGON - RPCs Públicos
# ═══════════════════════════════════════════════════════════════════════════════
POLY_RPC_READ=https://polygon-rpc.com
POLY_RPC_SIM=https://polygon-rpc.com
POLY_RPC_SEND=https://polygon-rpc.com
POLY_RPC_WS=wss://polygon-bor.publicnode.com
```

### Otros RPCs públicos alternativos:

| Cadena | RPC Alternativo |
|--------|-----------------|
| Base | `https://base.llamarpc.com` |
| Arbitrum | `https://arbitrum.llamarpc.com` |
| Optimism | `https://optimism.llamarpc.com` |
| Polygon | `https://polygon.llamarpc.com` |

---

## ⚙️ Configuración del .env {#configuracion}

Crea el archivo `.env` en la raíz del proyecto:

```env
# ═══════════════════════════════════════════════════════════════════════════════
# MULTI-CHAIN MICRO ARBITRAGE BOT - CONFIGURACIÓN
# ═══════════════════════════════════════════════════════════════════════════════

# ─────────────────────────────────────────────────────────────────────────────────
# WALLET (¡NUNCA COMPARTAS ESTA CLAVE!)
# ─────────────────────────────────────────────────────────────────────────────────
PRIVATE_KEY=0xTU_CLAVE_PRIVADA_AQUI

# ─────────────────────────────────────────────────────────────────────────────────
# TIMING
# ─────────────────────────────────────────────────────────────────────────────────
TICK_MS=700
DECISION_MS=5000

# ─────────────────────────────────────────────────────────────────────────────────
# TRADING
# ─────────────────────────────────────────────────────────────────────────────────
MIN_PROFIT_USD=0.50
GAS_MULT=1.7
MAX_SLIPPAGE_BPS=10
DEADLINE_SECONDS=20

# ─────────────────────────────────────────────────────────────────────────────────
# CHAINS HABILITADAS
# ─────────────────────────────────────────────────────────────────────────────────
CHAINS=base,arbitrum,optimism,polygon

# ─────────────────────────────────────────────────────────────────────────────────
# BASE RPCs (Alchemy recomendado)
# ─────────────────────────────────────────────────────────────────────────────────
BASE_RPC_READ=https://base-mainnet.g.alchemy.com/v2/TU_API_KEY
BASE_RPC_SIM=https://base-mainnet.g.alchemy.com/v2/TU_API_KEY
BASE_RPC_SEND=https://base-mainnet.g.alchemy.com/v2/TU_API_KEY
BASE_RPC_WS=wss://base-mainnet.g.alchemy.com/v2/TU_API_KEY

# ─────────────────────────────────────────────────────────────────────────────────
# ARBITRUM RPCs
# ─────────────────────────────────────────────────────────────────────────────────
ARB_RPC_READ=https://arb-mainnet.g.alchemy.com/v2/TU_API_KEY
ARB_RPC_SIM=https://arb-mainnet.g.alchemy.com/v2/TU_API_KEY
ARB_RPC_SEND=https://arb-mainnet.g.alchemy.com/v2/TU_API_KEY
ARB_RPC_WS=wss://arb-mainnet.g.alchemy.com/v2/TU_API_KEY

# ─────────────────────────────────────────────────────────────────────────────────
# OPTIMISM RPCs
# ─────────────────────────────────────────────────────────────────────────────────
OP_RPC_READ=https://opt-mainnet.g.alchemy.com/v2/TU_API_KEY
OP_RPC_SIM=https://opt-mainnet.g.alchemy.com/v2/TU_API_KEY
OP_RPC_SEND=https://opt-mainnet.g.alchemy.com/v2/TU_API_KEY
OP_RPC_WS=wss://opt-mainnet.g.alchemy.com/v2/TU_API_KEY

# ─────────────────────────────────────────────────────────────────────────────────
# POLYGON RPCs
# ─────────────────────────────────────────────────────────────────────────────────
POLY_RPC_READ=https://polygon-mainnet.g.alchemy.com/v2/TU_API_KEY
POLY_RPC_SIM=https://polygon-mainnet.g.alchemy.com/v2/TU_API_KEY
POLY_RPC_SEND=https://polygon-mainnet.g.alchemy.com/v2/TU_API_KEY
POLY_RPC_WS=wss://polygon-mainnet.g.alchemy.com/v2/TU_API_KEY

# ─────────────────────────────────────────────────────────────────────────────────
# BLOCK EXPLORER API KEYS (para verificar contratos)
# ─────────────────────────────────────────────────────────────────────────────────
BASESCAN_API_KEY=
ARBISCAN_API_KEY=
OPSCAN_API_KEY=
POLYGONSCAN_API_KEY=

# ─────────────────────────────────────────────────────────────────────────────────
# MODO
# ─────────────────────────────────────────────────────────────────────────────────
DRY_RUN=true
LOG_LEVEL=info
```

---

## ✅ Verificar conexión {#verificar}

Ejecuta este script para verificar que todos los RPCs funcionan:

```bash
npx tsx scripts/verify-rpcs.ts
```

O manualmente:

```javascript
// scripts/verify-rpcs.ts
import { ethers } from "ethers";
import "dotenv/config";

const chains = [
  { name: "Base", rpc: process.env.BASE_RPC_READ, chainId: 8453 },
  { name: "Arbitrum", rpc: process.env.ARB_RPC_READ, chainId: 42161 },
  { name: "Optimism", rpc: process.env.OP_RPC_READ, chainId: 10 },
  { name: "Polygon", rpc: process.env.POLY_RPC_READ, chainId: 137 }
];

async function verify() {
  console.log("🔍 Verificando RPCs...\n");
  
  for (const chain of chains) {
    try {
      const provider = new ethers.JsonRpcProvider(chain.rpc);
      const network = await provider.getNetwork();
      const block = await provider.getBlockNumber();
      
      if (Number(network.chainId) === chain.chainId) {
        console.log(`✅ ${chain.name}: OK (Block #${block})`);
      } else {
        console.log(`❌ ${chain.name}: Chain ID incorrecto`);
      }
    } catch (error: any) {
      console.log(`❌ ${chain.name}: ${error.message}`);
    }
  }
}

verify();
```

---

## 📊 Resumen de pasos

### Para empezar RÁPIDO (RPCs públicos):
1. Copia el bloque de "RPCs Públicos" al `.env`
2. Agrega tu `PRIVATE_KEY`
3. Ejecuta `npm run dev`

### Para PRODUCCIÓN (Alchemy):
1. Crea cuenta en Alchemy
2. Crea 4 apps (una por cadena)
3. Copia los endpoints al `.env`
4. Agrega tu `PRIVATE_KEY`
5. Ejecuta `npm run dev`

---

## ⚠️ Notas importantes

1. **Seguridad**: NUNCA compartas tu `PRIVATE_KEY`
2. **Rate Limits**: Los RPCs públicos tienen límites (~100 req/seg)
3. **Latencia**: Alchemy/Infura tienen ~50ms, públicos ~200ms
4. **Costo**: Alchemy free tier = 300M compute units/mes
5. **WebSocket**: Necesario para actualizaciones en tiempo real

---

## 🆘 Troubleshooting

### Error: "Rate limited"
- Usa RPCs privados (Alchemy/Infura)
- Aumenta `TICK_MS` a 1000+

### Error: "Connection refused"
- Verifica que el RPC esté activo
- Prueba con un RPC alternativo

### Error: "Chain ID mismatch"
- Verifica que usas el RPC correcto para cada cadena
- Base = 8453, Arbitrum = 42161, Optimism = 10, Polygon = 137

---

¡Listo! Con esta guía puedes configurar todos los RPCs necesarios. 🚀



## 📋 Índice
1. [Resumen de lo que necesitas](#resumen)
2. [Crear RPCs en Alchemy](#alchemy)
3. [Crear RPCs en Infura](#infura)
4. [RPCs Públicos (gratuitos)](#publicos)
5. [Configuración del .env](#configuracion)
6. [Verificar conexión](#verificar)

---

## 🎯 Resumen de lo que necesitas {#resumen}

Para cada cadena necesitas **4 tipos de RPC**:

| Tipo | Uso | Prioridad |
|------|-----|-----------|
| `READ` | Leer datos (balances, precios) | Alta |
| `SIM` | Simular transacciones (eth_call) | Alta |
| `SEND` | Enviar transacciones | Crítica |
| `WS` | WebSocket (tiempo real) | Media |

### Cadenas soportadas:
- ✅ **Base** (Chain ID: 8453)
- ✅ **Arbitrum One** (Chain ID: 42161)
- ✅ **Optimism** (Chain ID: 10)
- ✅ **Polygon** (Chain ID: 137)

---

## 🔷 Opción 1: Crear RPCs en Alchemy (RECOMENDADO) {#alchemy}

### Paso 1: Crear cuenta
1. Ve a https://www.alchemy.com/
2. Click en "Get started for free"
3. Registra tu cuenta con email

### Paso 2: Crear Apps para cada cadena

#### Para BASE:
1. Dashboard → Create new app
2. **Name**: `MultiChain-Arb-Base`
3. **Chain**: Base
4. **Network**: Base Mainnet
5. Click "Create app"
6. Copia el **HTTPS** y **WSS** endpoint

#### Para ARBITRUM:
1. Dashboard → Create new app
2. **Name**: `MultiChain-Arb-Arbitrum`
3. **Chain**: Arbitrum
4. **Network**: Arbitrum Mainnet
5. Click "Create app"
6. Copia el **HTTPS** y **WSS** endpoint

#### Para OPTIMISM:
1. Dashboard → Create new app
2. **Name**: `MultiChain-Arb-Optimism`
3. **Chain**: Optimism
4. **Network**: Optimism Mainnet
5. Click "Create app"
6. Copia el **HTTPS** y **WSS** endpoint

#### Para POLYGON:
1. Dashboard → Create new app
2. **Name**: `MultiChain-Arb-Polygon`
3. **Chain**: Polygon
4. **Network**: Polygon Mainnet
5. Click "Create app"
6. Copia el **HTTPS** y **WSS** endpoint

### Formato de URLs Alchemy:
```
HTTPS: https://{chain}-mainnet.g.alchemy.com/v2/{API_KEY}
WSS:   wss://{chain}-mainnet.g.alchemy.com/v2/{API_KEY}
```

### Ejemplo real:
```env
# Base
BASE_RPC_READ=https://base-mainnet.g.alchemy.com/v2/abc123xyz
BASE_RPC_SIM=https://base-mainnet.g.alchemy.com/v2/abc123xyz
BASE_RPC_SEND=https://base-mainnet.g.alchemy.com/v2/abc123xyz
BASE_RPC_WS=wss://base-mainnet.g.alchemy.com/v2/abc123xyz

# Arbitrum
ARB_RPC_READ=https://arb-mainnet.g.alchemy.com/v2/def456uvw
ARB_RPC_SIM=https://arb-mainnet.g.alchemy.com/v2/def456uvw
ARB_RPC_SEND=https://arb-mainnet.g.alchemy.com/v2/def456uvw
ARB_RPC_WS=wss://arb-mainnet.g.alchemy.com/v2/def456uvw

# Optimism
OP_RPC_READ=https://opt-mainnet.g.alchemy.com/v2/ghi789rst
OP_RPC_SIM=https://opt-mainnet.g.alchemy.com/v2/ghi789rst
OP_RPC_SEND=https://opt-mainnet.g.alchemy.com/v2/ghi789rst
OP_RPC_WS=wss://opt-mainnet.g.alchemy.com/v2/ghi789rst

# Polygon
POLY_RPC_READ=https://polygon-mainnet.g.alchemy.com/v2/jkl012mno
POLY_RPC_SIM=https://polygon-mainnet.g.alchemy.com/v2/jkl012mno
POLY_RPC_SEND=https://polygon-mainnet.g.alchemy.com/v2/jkl012mno
POLY_RPC_WS=wss://polygon-mainnet.g.alchemy.com/v2/jkl012mno
```

### Plan gratuito de Alchemy:
- ✅ 300M compute units/mes
- ✅ Suficiente para ~10,000 operaciones/día
- ✅ WebSocket incluido

---

## 🔶 Opción 2: Crear RPCs en Infura {#infura}

### Paso 1: Crear cuenta
1. Ve a https://www.infura.io/
2. Click en "Sign Up"
3. Registra tu cuenta

### Paso 2: Crear proyecto
1. Dashboard → Create new API key
2. **Name**: `MultiChain-Arb`
3. Selecciona las redes:
   - ✅ Arbitrum
   - ✅ Optimism
   - ✅ Polygon
   - ❌ Base (no soportado en Infura)

### Formato de URLs Infura:
```
HTTPS: https://{network}.infura.io/v3/{PROJECT_ID}
WSS:   wss://{network}.infura.io/ws/v3/{PROJECT_ID}
```

### Ejemplo:
```env
# Arbitrum (Infura)
ARB_RPC_READ=https://arbitrum-mainnet.infura.io/v3/abc123
ARB_RPC_WS=wss://arbitrum-mainnet.infura.io/ws/v3/abc123

# Optimism (Infura)
OP_RPC_READ=https://optimism-mainnet.infura.io/v3/abc123
OP_RPC_WS=wss://optimism-mainnet.infura.io/ws/v3/abc123

# Polygon (Infura)
POLY_RPC_READ=https://polygon-mainnet.infura.io/v3/abc123
POLY_RPC_WS=wss://polygon-mainnet.infura.io/ws/v3/abc123
```

---

## 🆓 Opción 3: RPCs Públicos (Gratuitos) {#publicos}

⚠️ **Advertencia**: Los RPCs públicos tienen límites de rate y pueden ser lentos.
Solo usar para pruebas, NO para producción.

```env
# ═══════════════════════════════════════════════════════════════════════════════
# BASE - RPCs Públicos
# ═══════════════════════════════════════════════════════════════════════════════
BASE_RPC_READ=https://mainnet.base.org
BASE_RPC_SIM=https://mainnet.base.org
BASE_RPC_SEND=https://mainnet.base.org
BASE_RPC_WS=wss://base-mainnet.publicnode.com

# ═══════════════════════════════════════════════════════════════════════════════
# ARBITRUM - RPCs Públicos
# ═══════════════════════════════════════════════════════════════════════════════
ARB_RPC_READ=https://arb1.arbitrum.io/rpc
ARB_RPC_SIM=https://arb1.arbitrum.io/rpc
ARB_RPC_SEND=https://arb1.arbitrum.io/rpc
ARB_RPC_WS=wss://arbitrum-one.publicnode.com

# ═══════════════════════════════════════════════════════════════════════════════
# OPTIMISM - RPCs Públicos
# ═══════════════════════════════════════════════════════════════════════════════
OP_RPC_READ=https://mainnet.optimism.io
OP_RPC_SIM=https://mainnet.optimism.io
OP_RPC_SEND=https://mainnet.optimism.io
OP_RPC_WS=wss://optimism.publicnode.com

# ═══════════════════════════════════════════════════════════════════════════════
# POLYGON - RPCs Públicos
# ═══════════════════════════════════════════════════════════════════════════════
POLY_RPC_READ=https://polygon-rpc.com
POLY_RPC_SIM=https://polygon-rpc.com
POLY_RPC_SEND=https://polygon-rpc.com
POLY_RPC_WS=wss://polygon-bor.publicnode.com
```

### Otros RPCs públicos alternativos:

| Cadena | RPC Alternativo |
|--------|-----------------|
| Base | `https://base.llamarpc.com` |
| Arbitrum | `https://arbitrum.llamarpc.com` |
| Optimism | `https://optimism.llamarpc.com` |
| Polygon | `https://polygon.llamarpc.com` |

---

## ⚙️ Configuración del .env {#configuracion}

Crea el archivo `.env` en la raíz del proyecto:

```env
# ═══════════════════════════════════════════════════════════════════════════════
# MULTI-CHAIN MICRO ARBITRAGE BOT - CONFIGURACIÓN
# ═══════════════════════════════════════════════════════════════════════════════

# ─────────────────────────────────────────────────────────────────────────────────
# WALLET (¡NUNCA COMPARTAS ESTA CLAVE!)
# ─────────────────────────────────────────────────────────────────────────────────
PRIVATE_KEY=0xTU_CLAVE_PRIVADA_AQUI

# ─────────────────────────────────────────────────────────────────────────────────
# TIMING
# ─────────────────────────────────────────────────────────────────────────────────
TICK_MS=700
DECISION_MS=5000

# ─────────────────────────────────────────────────────────────────────────────────
# TRADING
# ─────────────────────────────────────────────────────────────────────────────────
MIN_PROFIT_USD=0.50
GAS_MULT=1.7
MAX_SLIPPAGE_BPS=10
DEADLINE_SECONDS=20

# ─────────────────────────────────────────────────────────────────────────────────
# CHAINS HABILITADAS
# ─────────────────────────────────────────────────────────────────────────────────
CHAINS=base,arbitrum,optimism,polygon

# ─────────────────────────────────────────────────────────────────────────────────
# BASE RPCs (Alchemy recomendado)
# ─────────────────────────────────────────────────────────────────────────────────
BASE_RPC_READ=https://base-mainnet.g.alchemy.com/v2/TU_API_KEY
BASE_RPC_SIM=https://base-mainnet.g.alchemy.com/v2/TU_API_KEY
BASE_RPC_SEND=https://base-mainnet.g.alchemy.com/v2/TU_API_KEY
BASE_RPC_WS=wss://base-mainnet.g.alchemy.com/v2/TU_API_KEY

# ─────────────────────────────────────────────────────────────────────────────────
# ARBITRUM RPCs
# ─────────────────────────────────────────────────────────────────────────────────
ARB_RPC_READ=https://arb-mainnet.g.alchemy.com/v2/TU_API_KEY
ARB_RPC_SIM=https://arb-mainnet.g.alchemy.com/v2/TU_API_KEY
ARB_RPC_SEND=https://arb-mainnet.g.alchemy.com/v2/TU_API_KEY
ARB_RPC_WS=wss://arb-mainnet.g.alchemy.com/v2/TU_API_KEY

# ─────────────────────────────────────────────────────────────────────────────────
# OPTIMISM RPCs
# ─────────────────────────────────────────────────────────────────────────────────
OP_RPC_READ=https://opt-mainnet.g.alchemy.com/v2/TU_API_KEY
OP_RPC_SIM=https://opt-mainnet.g.alchemy.com/v2/TU_API_KEY
OP_RPC_SEND=https://opt-mainnet.g.alchemy.com/v2/TU_API_KEY
OP_RPC_WS=wss://opt-mainnet.g.alchemy.com/v2/TU_API_KEY

# ─────────────────────────────────────────────────────────────────────────────────
# POLYGON RPCs
# ─────────────────────────────────────────────────────────────────────────────────
POLY_RPC_READ=https://polygon-mainnet.g.alchemy.com/v2/TU_API_KEY
POLY_RPC_SIM=https://polygon-mainnet.g.alchemy.com/v2/TU_API_KEY
POLY_RPC_SEND=https://polygon-mainnet.g.alchemy.com/v2/TU_API_KEY
POLY_RPC_WS=wss://polygon-mainnet.g.alchemy.com/v2/TU_API_KEY

# ─────────────────────────────────────────────────────────────────────────────────
# BLOCK EXPLORER API KEYS (para verificar contratos)
# ─────────────────────────────────────────────────────────────────────────────────
BASESCAN_API_KEY=
ARBISCAN_API_KEY=
OPSCAN_API_KEY=
POLYGONSCAN_API_KEY=

# ─────────────────────────────────────────────────────────────────────────────────
# MODO
# ─────────────────────────────────────────────────────────────────────────────────
DRY_RUN=true
LOG_LEVEL=info
```

---

## ✅ Verificar conexión {#verificar}

Ejecuta este script para verificar que todos los RPCs funcionan:

```bash
npx tsx scripts/verify-rpcs.ts
```

O manualmente:

```javascript
// scripts/verify-rpcs.ts
import { ethers } from "ethers";
import "dotenv/config";

const chains = [
  { name: "Base", rpc: process.env.BASE_RPC_READ, chainId: 8453 },
  { name: "Arbitrum", rpc: process.env.ARB_RPC_READ, chainId: 42161 },
  { name: "Optimism", rpc: process.env.OP_RPC_READ, chainId: 10 },
  { name: "Polygon", rpc: process.env.POLY_RPC_READ, chainId: 137 }
];

async function verify() {
  console.log("🔍 Verificando RPCs...\n");
  
  for (const chain of chains) {
    try {
      const provider = new ethers.JsonRpcProvider(chain.rpc);
      const network = await provider.getNetwork();
      const block = await provider.getBlockNumber();
      
      if (Number(network.chainId) === chain.chainId) {
        console.log(`✅ ${chain.name}: OK (Block #${block})`);
      } else {
        console.log(`❌ ${chain.name}: Chain ID incorrecto`);
      }
    } catch (error: any) {
      console.log(`❌ ${chain.name}: ${error.message}`);
    }
  }
}

verify();
```

---

## 📊 Resumen de pasos

### Para empezar RÁPIDO (RPCs públicos):
1. Copia el bloque de "RPCs Públicos" al `.env`
2. Agrega tu `PRIVATE_KEY`
3. Ejecuta `npm run dev`

### Para PRODUCCIÓN (Alchemy):
1. Crea cuenta en Alchemy
2. Crea 4 apps (una por cadena)
3. Copia los endpoints al `.env`
4. Agrega tu `PRIVATE_KEY`
5. Ejecuta `npm run dev`

---

## ⚠️ Notas importantes

1. **Seguridad**: NUNCA compartas tu `PRIVATE_KEY`
2. **Rate Limits**: Los RPCs públicos tienen límites (~100 req/seg)
3. **Latencia**: Alchemy/Infura tienen ~50ms, públicos ~200ms
4. **Costo**: Alchemy free tier = 300M compute units/mes
5. **WebSocket**: Necesario para actualizaciones en tiempo real

---

## 🆘 Troubleshooting

### Error: "Rate limited"
- Usa RPCs privados (Alchemy/Infura)
- Aumenta `TICK_MS` a 1000+

### Error: "Connection refused"
- Verifica que el RPC esté activo
- Prueba con un RPC alternativo

### Error: "Chain ID mismatch"
- Verifica que usas el RPC correcto para cada cadena
- Base = 8453, Arbitrum = 42161, Optimism = 10, Polygon = 137

---

¡Listo! Con esta guía puedes configurar todos los RPCs necesarios. 🚀




