# 🤖 Bot de Arbitraje Multi-Chain - Guía de Ejecución en Tiempo Real

## 📋 Resumen Ejecutivo

Este bot ejecuta arbitraje DEX-to-DEX automático en las mejores L2s de Ethereum:
- **Base** - 0.01 gwei promedio
- **Arbitrum** - 0.01 gwei promedio  
- **Optimism** - 0.001 gwei promedio

**Características:**
- ✅ IA con Thompson Sampling para rotación de chains
- ✅ Análisis de múltiples fee tiers (0.01%, 0.05%, 0.3%, 1%)
- ✅ Integración Uniswap V3 + SushiSwap
- ✅ Gas-positivo (solo trades con ganancia neta)
- ✅ Frontend en tiempo real en módulo DeFi Protocols
- ✅ Control start/stop desde UI

---

## 🚀 Pasos para Ejecutar en REAL

### 1️⃣ Verificar Configuración `.env`

Asegúrate que tu archivo `.env` tenga:

```env
# REQUIRED - Tus credenciales
VITE_ETH_PRIVATE_KEY=0x...tu_private_key_aqui...
VITE_ETH_WALLET_ADDRESS=0x...tu_wallet_address...

# OPTIONAL - RPCs (usa los defaults si no los defines)
RPC_BASE=https://base-mainnet.g.alchemy.com/v2/tu_api_key
RPC_ARBITRUM=https://arb1.arbitrum.io/rpc
RPC_OPTIMISM=https://mainnet.optimism.io

# OPTIONAL - Modo
DRY_RUN=false  # IMPORTANTE: false para modo LIVE
```

### 2️⃣ Verificar Fondos en las Chains

El bot necesita ETH en cada chain para:
- Gas de transacciones
- Capital para arbitraje

Mínimo recomendado: **0.01 ETH por chain**

Para verificar balances:
```bash
npm run bot:test  # Primero en DRY_RUN para ver balances
```

### 3️⃣ OPCIÓN A: Ejecutar Bot + API + Frontend (Recomendado)

```bash
# Terminal 1: Iniciar todo (bot + API + frontend)
npm run bot:live
```

Esto inicia:
- ✅ API Server (puerto 3100) - comunicación con frontend
- ✅ Bot de Arbitraje (LIVE MODE)
- ✅ Frontend Vite (puerto 4000)

Luego abre en el navegador:
```
http://localhost:4000
```

Ve a: **DeFi Protocols** → **Multi-Chain Arbitrage Bot** → Presiona **Iniciar Bot**

### 4️⃣ OPCIÓN B: Ejecutar Solo el Bot (Línea de Comandos)

```bash
# Ejecutar bot directamente
node src/modules/DeFiProtocols/multichain-arb/scripts/liveArbBot.js
```

O con npm:
```bash
npm run bot:live  # En terminal
```

### 5️⃣ OPCIÓN C: Ejecutar en Modo Prueba (DRY RUN)

Para probar sin riesgo real:

```bash
npm run bot:test  # Modo simulación
```

---

## 📊 Monitoreo en Tiempo Real

### Desde el Frontend (Recomendado)

1. Abre http://localhost:4000
2. Ve a **DeFi Protocols**
3. Selecciona **Multi-Chain Arbitrage Bot**
4. Presiona **Iniciar Bot** (cambia DRY RUN si quieres real)
5. Observa en tiempo real:
   - 📊 **Overview**: Stats generales (profit, ticks, win rate)
   - ⛓️ **Chains**: Balances y estado de cada chain
   - 🧠 **AI Bandit**: Thompson Sampling stats
   - 📜 **Trades**: Historial de operaciones ejecutadas

### Desde Terminal

Verás output como:

```
📍 Iteration 1/5
   🧠 AI selected: Base
   🔍 Scanning for arbitrage...
   ✅ Found 3 opportunities!
   📈 Best: ETH->0.05%->USDC->0.3%->ETH | Profit: $0.1234 (0.5%)
   💰 Profit threshold met, executing trade...
   🚀 EXECUTING TRADE on Base
   🔄 Swap 1: WETH -> USDC...
   ✅ Swap 1 complete: 0x...
   🔄 Swap 2: USDC -> WETH...
   ✅ Swap 2 complete: 0x...
   📊 TRADE RESULT:
   Profit: 0.00123 ETH (~$3.94)
```

---

## ⚙️ Configuración Avanzada

### Modificar Parámetros del Bot

Abre `src/modules/DeFiProtocols/multichain-arb/src/config.ts`:

```typescript
export const CFG = {
  // Timing
  TICK_MS: 700,                    // ms entre scans (más bajo = más rápido)
  DECISION_MS: 5000,               // ms entre cambios de chain por IA
  
  // Trading
  MIN_PROFIT_USD: 0.50,            // Mínimo profit en USD para ejecutar
  GAS_MULT: 1.7,                   // Multiplicador de gas para seguridad
  MAX_SLIPPAGE_BPS: 50,            // 0.5% slippage máximo
  DEADLINE_SECONDS: 60,            // Timeout para transacciones
  
  // Chains Habilitados
  CHAINS: ["base", "arbitrum", "optimism"],  // Que chains analizar
  
  // Trade Sizes (en USD)
  TRADE_SIZES_USD: [25, 50, 100, 250, 500, 1000],
};
```

### Cambiar Log Level

```bash
LOG_LEVEL=debug npm run bot:live
```

Niveles: `trace`, `debug`, `info`, `warn`, `error`

---

## 🔍 Solución de Problemas

### ❌ Error: "Private key not found"

```
Solución:
1. Verifica que VITE_ETH_PRIVATE_KEY esté en .env
2. Verifica que NO tenga comillas: `VITE_ETH_PRIVATE_KEY=0x1234...` (sin comillas)
3. Reinicia la terminal para que cargue el .env
```

### ❌ Error: "No workers initialized"

```
Solución:
1. Verifica que las RPCs funcionen
2. Intenta con `npm run bot:test` para debug
3. Verifica: curl https://arb1.arbitrum.io/rpc -d '{"jsonrpc":"2.0","method":"eth_blockNumber"}'
```

### ❌ Bot no encuentra oportunidades

```
Posibles razones:
1. Los spreads son muy pequeños (< $0.50)
2. El MIN_PROFIT_USD es muy alto - baja a 0.25
3. Las pools no tienen liquidez - cambia fee tiers
```

### ❌ Transacciones fallan ("amountOutMinimum")

```
Solución:
1. Sube MAX_SLIPPAGE_BPS: 50 → 75 (0.75%)
2. Incrementa DEADLINE_SECONDS: 60 → 90
3. Verifica el precio del gas en cada chain
```

---

## 📈 Optimizaciones para Máxima Rentabilidad

### 1. Aumentar Velocidad de Escaneo
```typescript
TICK_MS: 300,        // Cada 300ms en lugar de 700ms
DECISION_MS: 3000,   // Cambiar chain cada 3s
```

### 2. Ajustar Tamaños de Trade
```typescript
// Más pequeños = más oportunidades pero menos profit
TRADE_SIZES_USD: [10, 25, 50, 100],

// O más grandes = menos oportunidades pero más profit
TRADE_SIZES_USD: [100, 250, 500, 1000, 2500],
```

### 3. Usar Solo Chains con Mejores Spreads

```typescript
// Si Optimism tiene muchas oportunidades:
CHAINS: ["optimism", "base", "arbitrum"],

// El AI las rotará automáticamente
```

### 4. Bajar Min Profit en Horas con Bajo Gas

```typescript
// En horarios pico de uso:
MIN_PROFIT_USD: 0.25,  // Más agresivo

// En horas valle:
MIN_PROFIT_USD: 1.00,  // Esperar lo mejor
```

---

## 🎯 Métricas Clave a Monitorear

| Métrica | Objetivo | Acción |
|---------|----------|--------|
| **Win Rate** | >60% | Muy bien, dejar así |
| **Net Profit USD** | >$5/min | Aumentar TRADE_SIZES o bajar MIN_PROFIT |
| **Latency** | <500ms | Acercarse a RPC o cambiar |
| **Gas Cost %** | <30% del profit | Normal en L2s |
| **Opportunities Found** | >10 por scan | Chain tiene liquidez |

---

## 🔐 Seguridad

### ✅ Medidas Implementadas

- ✅ No guarda private key en memoria más de lo necesario
- ✅ Todas las transacciones son simuladas primero (eth_call)
- ✅ Slippage máximo limitado (0.5%)
- ✅ Timeout en todas las transacciones
- ✅ Pausable en cualquier momento

### ⚠️ Recomendaciones

1. **Usa billetera dedicada** - No mezcles con fondos principales
2. **Comienza pequeño** - Prueba con $100-500 primero
3. **Monitorea activamente** - No dejes corriendo sin vigilar
4. **Haz backup de .env** - Guarda tu private key en lugar seguro
5. **Retira ganancias regularmente** - No dejes acumular en la wallet

---

## 📞 Soporte

Si tienes problemas:

1. Revisa los logs: Busca `[ERROR]` o `[FATAL]`
2. Activa debug: `LOG_LEVEL=debug npm run bot:live`
3. Prueba RPC directamente:
   ```bash
   curl https://arb1.arbitrum.io/rpc -X POST \
     -d '{"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":1}' \
     -H "Content-Type: application/json"
   ```
4. Verifica balances: El bot imprime al inicio de cada run

---

## 📚 Más Información

- **Uniswap V3**: Documentación en https://docs.uniswap.org/
- **Arbitraje**: Guía en https://docs.arbitrum.io/
- **Gas Optimization**: https://www.alchemy.com/layer2/

---

**Última actualización**: Enero 2026  
**Versión**: 1.0.0  
**Status**: Listo para Producción ✅




## 📋 Resumen Ejecutivo

Este bot ejecuta arbitraje DEX-to-DEX automático en las mejores L2s de Ethereum:
- **Base** - 0.01 gwei promedio
- **Arbitrum** - 0.01 gwei promedio  
- **Optimism** - 0.001 gwei promedio

**Características:**
- ✅ IA con Thompson Sampling para rotación de chains
- ✅ Análisis de múltiples fee tiers (0.01%, 0.05%, 0.3%, 1%)
- ✅ Integración Uniswap V3 + SushiSwap
- ✅ Gas-positivo (solo trades con ganancia neta)
- ✅ Frontend en tiempo real en módulo DeFi Protocols
- ✅ Control start/stop desde UI

---

## 🚀 Pasos para Ejecutar en REAL

### 1️⃣ Verificar Configuración `.env`

Asegúrate que tu archivo `.env` tenga:

```env
# REQUIRED - Tus credenciales
VITE_ETH_PRIVATE_KEY=0x...tu_private_key_aqui...
VITE_ETH_WALLET_ADDRESS=0x...tu_wallet_address...

# OPTIONAL - RPCs (usa los defaults si no los defines)
RPC_BASE=https://base-mainnet.g.alchemy.com/v2/tu_api_key
RPC_ARBITRUM=https://arb1.arbitrum.io/rpc
RPC_OPTIMISM=https://mainnet.optimism.io

# OPTIONAL - Modo
DRY_RUN=false  # IMPORTANTE: false para modo LIVE
```

### 2️⃣ Verificar Fondos en las Chains

El bot necesita ETH en cada chain para:
- Gas de transacciones
- Capital para arbitraje

Mínimo recomendado: **0.01 ETH por chain**

Para verificar balances:
```bash
npm run bot:test  # Primero en DRY_RUN para ver balances
```

### 3️⃣ OPCIÓN A: Ejecutar Bot + API + Frontend (Recomendado)

```bash
# Terminal 1: Iniciar todo (bot + API + frontend)
npm run bot:live
```

Esto inicia:
- ✅ API Server (puerto 3100) - comunicación con frontend
- ✅ Bot de Arbitraje (LIVE MODE)
- ✅ Frontend Vite (puerto 4000)

Luego abre en el navegador:
```
http://localhost:4000
```

Ve a: **DeFi Protocols** → **Multi-Chain Arbitrage Bot** → Presiona **Iniciar Bot**

### 4️⃣ OPCIÓN B: Ejecutar Solo el Bot (Línea de Comandos)

```bash
# Ejecutar bot directamente
node src/modules/DeFiProtocols/multichain-arb/scripts/liveArbBot.js
```

O con npm:
```bash
npm run bot:live  # En terminal
```

### 5️⃣ OPCIÓN C: Ejecutar en Modo Prueba (DRY RUN)

Para probar sin riesgo real:

```bash
npm run bot:test  # Modo simulación
```

---

## 📊 Monitoreo en Tiempo Real

### Desde el Frontend (Recomendado)

1. Abre http://localhost:4000
2. Ve a **DeFi Protocols**
3. Selecciona **Multi-Chain Arbitrage Bot**
4. Presiona **Iniciar Bot** (cambia DRY RUN si quieres real)
5. Observa en tiempo real:
   - 📊 **Overview**: Stats generales (profit, ticks, win rate)
   - ⛓️ **Chains**: Balances y estado de cada chain
   - 🧠 **AI Bandit**: Thompson Sampling stats
   - 📜 **Trades**: Historial de operaciones ejecutadas

### Desde Terminal

Verás output como:

```
📍 Iteration 1/5
   🧠 AI selected: Base
   🔍 Scanning for arbitrage...
   ✅ Found 3 opportunities!
   📈 Best: ETH->0.05%->USDC->0.3%->ETH | Profit: $0.1234 (0.5%)
   💰 Profit threshold met, executing trade...
   🚀 EXECUTING TRADE on Base
   🔄 Swap 1: WETH -> USDC...
   ✅ Swap 1 complete: 0x...
   🔄 Swap 2: USDC -> WETH...
   ✅ Swap 2 complete: 0x...
   📊 TRADE RESULT:
   Profit: 0.00123 ETH (~$3.94)
```

---

## ⚙️ Configuración Avanzada

### Modificar Parámetros del Bot

Abre `src/modules/DeFiProtocols/multichain-arb/src/config.ts`:

```typescript
export const CFG = {
  // Timing
  TICK_MS: 700,                    // ms entre scans (más bajo = más rápido)
  DECISION_MS: 5000,               // ms entre cambios de chain por IA
  
  // Trading
  MIN_PROFIT_USD: 0.50,            // Mínimo profit en USD para ejecutar
  GAS_MULT: 1.7,                   // Multiplicador de gas para seguridad
  MAX_SLIPPAGE_BPS: 50,            // 0.5% slippage máximo
  DEADLINE_SECONDS: 60,            // Timeout para transacciones
  
  // Chains Habilitados
  CHAINS: ["base", "arbitrum", "optimism"],  // Que chains analizar
  
  // Trade Sizes (en USD)
  TRADE_SIZES_USD: [25, 50, 100, 250, 500, 1000],
};
```

### Cambiar Log Level

```bash
LOG_LEVEL=debug npm run bot:live
```

Niveles: `trace`, `debug`, `info`, `warn`, `error`

---

## 🔍 Solución de Problemas

### ❌ Error: "Private key not found"

```
Solución:
1. Verifica que VITE_ETH_PRIVATE_KEY esté en .env
2. Verifica que NO tenga comillas: `VITE_ETH_PRIVATE_KEY=0x1234...` (sin comillas)
3. Reinicia la terminal para que cargue el .env
```

### ❌ Error: "No workers initialized"

```
Solución:
1. Verifica que las RPCs funcionen
2. Intenta con `npm run bot:test` para debug
3. Verifica: curl https://arb1.arbitrum.io/rpc -d '{"jsonrpc":"2.0","method":"eth_blockNumber"}'
```

### ❌ Bot no encuentra oportunidades

```
Posibles razones:
1. Los spreads son muy pequeños (< $0.50)
2. El MIN_PROFIT_USD es muy alto - baja a 0.25
3. Las pools no tienen liquidez - cambia fee tiers
```

### ❌ Transacciones fallan ("amountOutMinimum")

```
Solución:
1. Sube MAX_SLIPPAGE_BPS: 50 → 75 (0.75%)
2. Incrementa DEADLINE_SECONDS: 60 → 90
3. Verifica el precio del gas en cada chain
```

---

## 📈 Optimizaciones para Máxima Rentabilidad

### 1. Aumentar Velocidad de Escaneo
```typescript
TICK_MS: 300,        // Cada 300ms en lugar de 700ms
DECISION_MS: 3000,   // Cambiar chain cada 3s
```

### 2. Ajustar Tamaños de Trade
```typescript
// Más pequeños = más oportunidades pero menos profit
TRADE_SIZES_USD: [10, 25, 50, 100],

// O más grandes = menos oportunidades pero más profit
TRADE_SIZES_USD: [100, 250, 500, 1000, 2500],
```

### 3. Usar Solo Chains con Mejores Spreads

```typescript
// Si Optimism tiene muchas oportunidades:
CHAINS: ["optimism", "base", "arbitrum"],

// El AI las rotará automáticamente
```

### 4. Bajar Min Profit en Horas con Bajo Gas

```typescript
// En horarios pico de uso:
MIN_PROFIT_USD: 0.25,  // Más agresivo

// En horas valle:
MIN_PROFIT_USD: 1.00,  // Esperar lo mejor
```

---

## 🎯 Métricas Clave a Monitorear

| Métrica | Objetivo | Acción |
|---------|----------|--------|
| **Win Rate** | >60% | Muy bien, dejar así |
| **Net Profit USD** | >$5/min | Aumentar TRADE_SIZES o bajar MIN_PROFIT |
| **Latency** | <500ms | Acercarse a RPC o cambiar |
| **Gas Cost %** | <30% del profit | Normal en L2s |
| **Opportunities Found** | >10 por scan | Chain tiene liquidez |

---

## 🔐 Seguridad

### ✅ Medidas Implementadas

- ✅ No guarda private key en memoria más de lo necesario
- ✅ Todas las transacciones son simuladas primero (eth_call)
- ✅ Slippage máximo limitado (0.5%)
- ✅ Timeout en todas las transacciones
- ✅ Pausable en cualquier momento

### ⚠️ Recomendaciones

1. **Usa billetera dedicada** - No mezcles con fondos principales
2. **Comienza pequeño** - Prueba con $100-500 primero
3. **Monitorea activamente** - No dejes corriendo sin vigilar
4. **Haz backup de .env** - Guarda tu private key en lugar seguro
5. **Retira ganancias regularmente** - No dejes acumular en la wallet

---

## 📞 Soporte

Si tienes problemas:

1. Revisa los logs: Busca `[ERROR]` o `[FATAL]`
2. Activa debug: `LOG_LEVEL=debug npm run bot:live`
3. Prueba RPC directamente:
   ```bash
   curl https://arb1.arbitrum.io/rpc -X POST \
     -d '{"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":1}' \
     -H "Content-Type: application/json"
   ```
4. Verifica balances: El bot imprime al inicio de cada run

---

## 📚 Más Información

- **Uniswap V3**: Documentación en https://docs.uniswap.org/
- **Arbitraje**: Guía en https://docs.arbitrum.io/
- **Gas Optimization**: https://www.alchemy.com/layer2/

---

**Última actualización**: Enero 2026  
**Versión**: 1.0.0  
**Status**: Listo para Producción ✅




## 📋 Resumen Ejecutivo

Este bot ejecuta arbitraje DEX-to-DEX automático en las mejores L2s de Ethereum:
- **Base** - 0.01 gwei promedio
- **Arbitrum** - 0.01 gwei promedio  
- **Optimism** - 0.001 gwei promedio

**Características:**
- ✅ IA con Thompson Sampling para rotación de chains
- ✅ Análisis de múltiples fee tiers (0.01%, 0.05%, 0.3%, 1%)
- ✅ Integración Uniswap V3 + SushiSwap
- ✅ Gas-positivo (solo trades con ganancia neta)
- ✅ Frontend en tiempo real en módulo DeFi Protocols
- ✅ Control start/stop desde UI

---

## 🚀 Pasos para Ejecutar en REAL

### 1️⃣ Verificar Configuración `.env`

Asegúrate que tu archivo `.env` tenga:

```env
# REQUIRED - Tus credenciales
VITE_ETH_PRIVATE_KEY=0x...tu_private_key_aqui...
VITE_ETH_WALLET_ADDRESS=0x...tu_wallet_address...

# OPTIONAL - RPCs (usa los defaults si no los defines)
RPC_BASE=https://base-mainnet.g.alchemy.com/v2/tu_api_key
RPC_ARBITRUM=https://arb1.arbitrum.io/rpc
RPC_OPTIMISM=https://mainnet.optimism.io

# OPTIONAL - Modo
DRY_RUN=false  # IMPORTANTE: false para modo LIVE
```

### 2️⃣ Verificar Fondos en las Chains

El bot necesita ETH en cada chain para:
- Gas de transacciones
- Capital para arbitraje

Mínimo recomendado: **0.01 ETH por chain**

Para verificar balances:
```bash
npm run bot:test  # Primero en DRY_RUN para ver balances
```

### 3️⃣ OPCIÓN A: Ejecutar Bot + API + Frontend (Recomendado)

```bash
# Terminal 1: Iniciar todo (bot + API + frontend)
npm run bot:live
```

Esto inicia:
- ✅ API Server (puerto 3100) - comunicación con frontend
- ✅ Bot de Arbitraje (LIVE MODE)
- ✅ Frontend Vite (puerto 4000)

Luego abre en el navegador:
```
http://localhost:4000
```

Ve a: **DeFi Protocols** → **Multi-Chain Arbitrage Bot** → Presiona **Iniciar Bot**

### 4️⃣ OPCIÓN B: Ejecutar Solo el Bot (Línea de Comandos)

```bash
# Ejecutar bot directamente
node src/modules/DeFiProtocols/multichain-arb/scripts/liveArbBot.js
```

O con npm:
```bash
npm run bot:live  # En terminal
```

### 5️⃣ OPCIÓN C: Ejecutar en Modo Prueba (DRY RUN)

Para probar sin riesgo real:

```bash
npm run bot:test  # Modo simulación
```

---

## 📊 Monitoreo en Tiempo Real

### Desde el Frontend (Recomendado)

1. Abre http://localhost:4000
2. Ve a **DeFi Protocols**
3. Selecciona **Multi-Chain Arbitrage Bot**
4. Presiona **Iniciar Bot** (cambia DRY RUN si quieres real)
5. Observa en tiempo real:
   - 📊 **Overview**: Stats generales (profit, ticks, win rate)
   - ⛓️ **Chains**: Balances y estado de cada chain
   - 🧠 **AI Bandit**: Thompson Sampling stats
   - 📜 **Trades**: Historial de operaciones ejecutadas

### Desde Terminal

Verás output como:

```
📍 Iteration 1/5
   🧠 AI selected: Base
   🔍 Scanning for arbitrage...
   ✅ Found 3 opportunities!
   📈 Best: ETH->0.05%->USDC->0.3%->ETH | Profit: $0.1234 (0.5%)
   💰 Profit threshold met, executing trade...
   🚀 EXECUTING TRADE on Base
   🔄 Swap 1: WETH -> USDC...
   ✅ Swap 1 complete: 0x...
   🔄 Swap 2: USDC -> WETH...
   ✅ Swap 2 complete: 0x...
   📊 TRADE RESULT:
   Profit: 0.00123 ETH (~$3.94)
```

---

## ⚙️ Configuración Avanzada

### Modificar Parámetros del Bot

Abre `src/modules/DeFiProtocols/multichain-arb/src/config.ts`:

```typescript
export const CFG = {
  // Timing
  TICK_MS: 700,                    // ms entre scans (más bajo = más rápido)
  DECISION_MS: 5000,               // ms entre cambios de chain por IA
  
  // Trading
  MIN_PROFIT_USD: 0.50,            // Mínimo profit en USD para ejecutar
  GAS_MULT: 1.7,                   // Multiplicador de gas para seguridad
  MAX_SLIPPAGE_BPS: 50,            // 0.5% slippage máximo
  DEADLINE_SECONDS: 60,            // Timeout para transacciones
  
  // Chains Habilitados
  CHAINS: ["base", "arbitrum", "optimism"],  // Que chains analizar
  
  // Trade Sizes (en USD)
  TRADE_SIZES_USD: [25, 50, 100, 250, 500, 1000],
};
```

### Cambiar Log Level

```bash
LOG_LEVEL=debug npm run bot:live
```

Niveles: `trace`, `debug`, `info`, `warn`, `error`

---

## 🔍 Solución de Problemas

### ❌ Error: "Private key not found"

```
Solución:
1. Verifica que VITE_ETH_PRIVATE_KEY esté en .env
2. Verifica que NO tenga comillas: `VITE_ETH_PRIVATE_KEY=0x1234...` (sin comillas)
3. Reinicia la terminal para que cargue el .env
```

### ❌ Error: "No workers initialized"

```
Solución:
1. Verifica que las RPCs funcionen
2. Intenta con `npm run bot:test` para debug
3. Verifica: curl https://arb1.arbitrum.io/rpc -d '{"jsonrpc":"2.0","method":"eth_blockNumber"}'
```

### ❌ Bot no encuentra oportunidades

```
Posibles razones:
1. Los spreads son muy pequeños (< $0.50)
2. El MIN_PROFIT_USD es muy alto - baja a 0.25
3. Las pools no tienen liquidez - cambia fee tiers
```

### ❌ Transacciones fallan ("amountOutMinimum")

```
Solución:
1. Sube MAX_SLIPPAGE_BPS: 50 → 75 (0.75%)
2. Incrementa DEADLINE_SECONDS: 60 → 90
3. Verifica el precio del gas en cada chain
```

---

## 📈 Optimizaciones para Máxima Rentabilidad

### 1. Aumentar Velocidad de Escaneo
```typescript
TICK_MS: 300,        // Cada 300ms en lugar de 700ms
DECISION_MS: 3000,   // Cambiar chain cada 3s
```

### 2. Ajustar Tamaños de Trade
```typescript
// Más pequeños = más oportunidades pero menos profit
TRADE_SIZES_USD: [10, 25, 50, 100],

// O más grandes = menos oportunidades pero más profit
TRADE_SIZES_USD: [100, 250, 500, 1000, 2500],
```

### 3. Usar Solo Chains con Mejores Spreads

```typescript
// Si Optimism tiene muchas oportunidades:
CHAINS: ["optimism", "base", "arbitrum"],

// El AI las rotará automáticamente
```

### 4. Bajar Min Profit en Horas con Bajo Gas

```typescript
// En horarios pico de uso:
MIN_PROFIT_USD: 0.25,  // Más agresivo

// En horas valle:
MIN_PROFIT_USD: 1.00,  // Esperar lo mejor
```

---

## 🎯 Métricas Clave a Monitorear

| Métrica | Objetivo | Acción |
|---------|----------|--------|
| **Win Rate** | >60% | Muy bien, dejar así |
| **Net Profit USD** | >$5/min | Aumentar TRADE_SIZES o bajar MIN_PROFIT |
| **Latency** | <500ms | Acercarse a RPC o cambiar |
| **Gas Cost %** | <30% del profit | Normal en L2s |
| **Opportunities Found** | >10 por scan | Chain tiene liquidez |

---

## 🔐 Seguridad

### ✅ Medidas Implementadas

- ✅ No guarda private key en memoria más de lo necesario
- ✅ Todas las transacciones son simuladas primero (eth_call)
- ✅ Slippage máximo limitado (0.5%)
- ✅ Timeout en todas las transacciones
- ✅ Pausable en cualquier momento

### ⚠️ Recomendaciones

1. **Usa billetera dedicada** - No mezcles con fondos principales
2. **Comienza pequeño** - Prueba con $100-500 primero
3. **Monitorea activamente** - No dejes corriendo sin vigilar
4. **Haz backup de .env** - Guarda tu private key en lugar seguro
5. **Retira ganancias regularmente** - No dejes acumular en la wallet

---

## 📞 Soporte

Si tienes problemas:

1. Revisa los logs: Busca `[ERROR]` o `[FATAL]`
2. Activa debug: `LOG_LEVEL=debug npm run bot:live`
3. Prueba RPC directamente:
   ```bash
   curl https://arb1.arbitrum.io/rpc -X POST \
     -d '{"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":1}' \
     -H "Content-Type: application/json"
   ```
4. Verifica balances: El bot imprime al inicio de cada run

---

## 📚 Más Información

- **Uniswap V3**: Documentación en https://docs.uniswap.org/
- **Arbitraje**: Guía en https://docs.arbitrum.io/
- **Gas Optimization**: https://www.alchemy.com/layer2/

---

**Última actualización**: Enero 2026  
**Versión**: 1.0.0  
**Status**: Listo para Producción ✅




## 📋 Resumen Ejecutivo

Este bot ejecuta arbitraje DEX-to-DEX automático en las mejores L2s de Ethereum:
- **Base** - 0.01 gwei promedio
- **Arbitrum** - 0.01 gwei promedio  
- **Optimism** - 0.001 gwei promedio

**Características:**
- ✅ IA con Thompson Sampling para rotación de chains
- ✅ Análisis de múltiples fee tiers (0.01%, 0.05%, 0.3%, 1%)
- ✅ Integración Uniswap V3 + SushiSwap
- ✅ Gas-positivo (solo trades con ganancia neta)
- ✅ Frontend en tiempo real en módulo DeFi Protocols
- ✅ Control start/stop desde UI

---

## 🚀 Pasos para Ejecutar en REAL

### 1️⃣ Verificar Configuración `.env`

Asegúrate que tu archivo `.env` tenga:

```env
# REQUIRED - Tus credenciales
VITE_ETH_PRIVATE_KEY=0x...tu_private_key_aqui...
VITE_ETH_WALLET_ADDRESS=0x...tu_wallet_address...

# OPTIONAL - RPCs (usa los defaults si no los defines)
RPC_BASE=https://base-mainnet.g.alchemy.com/v2/tu_api_key
RPC_ARBITRUM=https://arb1.arbitrum.io/rpc
RPC_OPTIMISM=https://mainnet.optimism.io

# OPTIONAL - Modo
DRY_RUN=false  # IMPORTANTE: false para modo LIVE
```

### 2️⃣ Verificar Fondos en las Chains

El bot necesita ETH en cada chain para:
- Gas de transacciones
- Capital para arbitraje

Mínimo recomendado: **0.01 ETH por chain**

Para verificar balances:
```bash
npm run bot:test  # Primero en DRY_RUN para ver balances
```

### 3️⃣ OPCIÓN A: Ejecutar Bot + API + Frontend (Recomendado)

```bash
# Terminal 1: Iniciar todo (bot + API + frontend)
npm run bot:live
```

Esto inicia:
- ✅ API Server (puerto 3100) - comunicación con frontend
- ✅ Bot de Arbitraje (LIVE MODE)
- ✅ Frontend Vite (puerto 4000)

Luego abre en el navegador:
```
http://localhost:4000
```

Ve a: **DeFi Protocols** → **Multi-Chain Arbitrage Bot** → Presiona **Iniciar Bot**

### 4️⃣ OPCIÓN B: Ejecutar Solo el Bot (Línea de Comandos)

```bash
# Ejecutar bot directamente
node src/modules/DeFiProtocols/multichain-arb/scripts/liveArbBot.js
```

O con npm:
```bash
npm run bot:live  # En terminal
```

### 5️⃣ OPCIÓN C: Ejecutar en Modo Prueba (DRY RUN)

Para probar sin riesgo real:

```bash
npm run bot:test  # Modo simulación
```

---

## 📊 Monitoreo en Tiempo Real

### Desde el Frontend (Recomendado)

1. Abre http://localhost:4000
2. Ve a **DeFi Protocols**
3. Selecciona **Multi-Chain Arbitrage Bot**
4. Presiona **Iniciar Bot** (cambia DRY RUN si quieres real)
5. Observa en tiempo real:
   - 📊 **Overview**: Stats generales (profit, ticks, win rate)
   - ⛓️ **Chains**: Balances y estado de cada chain
   - 🧠 **AI Bandit**: Thompson Sampling stats
   - 📜 **Trades**: Historial de operaciones ejecutadas

### Desde Terminal

Verás output como:

```
📍 Iteration 1/5
   🧠 AI selected: Base
   🔍 Scanning for arbitrage...
   ✅ Found 3 opportunities!
   📈 Best: ETH->0.05%->USDC->0.3%->ETH | Profit: $0.1234 (0.5%)
   💰 Profit threshold met, executing trade...
   🚀 EXECUTING TRADE on Base
   🔄 Swap 1: WETH -> USDC...
   ✅ Swap 1 complete: 0x...
   🔄 Swap 2: USDC -> WETH...
   ✅ Swap 2 complete: 0x...
   📊 TRADE RESULT:
   Profit: 0.00123 ETH (~$3.94)
```

---

## ⚙️ Configuración Avanzada

### Modificar Parámetros del Bot

Abre `src/modules/DeFiProtocols/multichain-arb/src/config.ts`:

```typescript
export const CFG = {
  // Timing
  TICK_MS: 700,                    // ms entre scans (más bajo = más rápido)
  DECISION_MS: 5000,               // ms entre cambios de chain por IA
  
  // Trading
  MIN_PROFIT_USD: 0.50,            // Mínimo profit en USD para ejecutar
  GAS_MULT: 1.7,                   // Multiplicador de gas para seguridad
  MAX_SLIPPAGE_BPS: 50,            // 0.5% slippage máximo
  DEADLINE_SECONDS: 60,            // Timeout para transacciones
  
  // Chains Habilitados
  CHAINS: ["base", "arbitrum", "optimism"],  // Que chains analizar
  
  // Trade Sizes (en USD)
  TRADE_SIZES_USD: [25, 50, 100, 250, 500, 1000],
};
```

### Cambiar Log Level

```bash
LOG_LEVEL=debug npm run bot:live
```

Niveles: `trace`, `debug`, `info`, `warn`, `error`

---

## 🔍 Solución de Problemas

### ❌ Error: "Private key not found"

```
Solución:
1. Verifica que VITE_ETH_PRIVATE_KEY esté en .env
2. Verifica que NO tenga comillas: `VITE_ETH_PRIVATE_KEY=0x1234...` (sin comillas)
3. Reinicia la terminal para que cargue el .env
```

### ❌ Error: "No workers initialized"

```
Solución:
1. Verifica que las RPCs funcionen
2. Intenta con `npm run bot:test` para debug
3. Verifica: curl https://arb1.arbitrum.io/rpc -d '{"jsonrpc":"2.0","method":"eth_blockNumber"}'
```

### ❌ Bot no encuentra oportunidades

```
Posibles razones:
1. Los spreads son muy pequeños (< $0.50)
2. El MIN_PROFIT_USD es muy alto - baja a 0.25
3. Las pools no tienen liquidez - cambia fee tiers
```

### ❌ Transacciones fallan ("amountOutMinimum")

```
Solución:
1. Sube MAX_SLIPPAGE_BPS: 50 → 75 (0.75%)
2. Incrementa DEADLINE_SECONDS: 60 → 90
3. Verifica el precio del gas en cada chain
```

---

## 📈 Optimizaciones para Máxima Rentabilidad

### 1. Aumentar Velocidad de Escaneo
```typescript
TICK_MS: 300,        // Cada 300ms en lugar de 700ms
DECISION_MS: 3000,   // Cambiar chain cada 3s
```

### 2. Ajustar Tamaños de Trade
```typescript
// Más pequeños = más oportunidades pero menos profit
TRADE_SIZES_USD: [10, 25, 50, 100],

// O más grandes = menos oportunidades pero más profit
TRADE_SIZES_USD: [100, 250, 500, 1000, 2500],
```

### 3. Usar Solo Chains con Mejores Spreads

```typescript
// Si Optimism tiene muchas oportunidades:
CHAINS: ["optimism", "base", "arbitrum"],

// El AI las rotará automáticamente
```

### 4. Bajar Min Profit en Horas con Bajo Gas

```typescript
// En horarios pico de uso:
MIN_PROFIT_USD: 0.25,  // Más agresivo

// En horas valle:
MIN_PROFIT_USD: 1.00,  // Esperar lo mejor
```

---

## 🎯 Métricas Clave a Monitorear

| Métrica | Objetivo | Acción |
|---------|----------|--------|
| **Win Rate** | >60% | Muy bien, dejar así |
| **Net Profit USD** | >$5/min | Aumentar TRADE_SIZES o bajar MIN_PROFIT |
| **Latency** | <500ms | Acercarse a RPC o cambiar |
| **Gas Cost %** | <30% del profit | Normal en L2s |
| **Opportunities Found** | >10 por scan | Chain tiene liquidez |

---

## 🔐 Seguridad

### ✅ Medidas Implementadas

- ✅ No guarda private key en memoria más de lo necesario
- ✅ Todas las transacciones son simuladas primero (eth_call)
- ✅ Slippage máximo limitado (0.5%)
- ✅ Timeout en todas las transacciones
- ✅ Pausable en cualquier momento

### ⚠️ Recomendaciones

1. **Usa billetera dedicada** - No mezcles con fondos principales
2. **Comienza pequeño** - Prueba con $100-500 primero
3. **Monitorea activamente** - No dejes corriendo sin vigilar
4. **Haz backup de .env** - Guarda tu private key en lugar seguro
5. **Retira ganancias regularmente** - No dejes acumular en la wallet

---

## 📞 Soporte

Si tienes problemas:

1. Revisa los logs: Busca `[ERROR]` o `[FATAL]`
2. Activa debug: `LOG_LEVEL=debug npm run bot:live`
3. Prueba RPC directamente:
   ```bash
   curl https://arb1.arbitrum.io/rpc -X POST \
     -d '{"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":1}' \
     -H "Content-Type: application/json"
   ```
4. Verifica balances: El bot imprime al inicio de cada run

---

## 📚 Más Información

- **Uniswap V3**: Documentación en https://docs.uniswap.org/
- **Arbitraje**: Guía en https://docs.arbitrum.io/
- **Gas Optimization**: https://www.alchemy.com/layer2/

---

**Última actualización**: Enero 2026  
**Versión**: 1.0.0  
**Status**: Listo para Producción ✅



## 📋 Resumen Ejecutivo

Este bot ejecuta arbitraje DEX-to-DEX automático en las mejores L2s de Ethereum:
- **Base** - 0.01 gwei promedio
- **Arbitrum** - 0.01 gwei promedio  
- **Optimism** - 0.001 gwei promedio

**Características:**
- ✅ IA con Thompson Sampling para rotación de chains
- ✅ Análisis de múltiples fee tiers (0.01%, 0.05%, 0.3%, 1%)
- ✅ Integración Uniswap V3 + SushiSwap
- ✅ Gas-positivo (solo trades con ganancia neta)
- ✅ Frontend en tiempo real en módulo DeFi Protocols
- ✅ Control start/stop desde UI

---

## 🚀 Pasos para Ejecutar en REAL

### 1️⃣ Verificar Configuración `.env`

Asegúrate que tu archivo `.env` tenga:

```env
# REQUIRED - Tus credenciales
VITE_ETH_PRIVATE_KEY=0x...tu_private_key_aqui...
VITE_ETH_WALLET_ADDRESS=0x...tu_wallet_address...

# OPTIONAL - RPCs (usa los defaults si no los defines)
RPC_BASE=https://base-mainnet.g.alchemy.com/v2/tu_api_key
RPC_ARBITRUM=https://arb1.arbitrum.io/rpc
RPC_OPTIMISM=https://mainnet.optimism.io

# OPTIONAL - Modo
DRY_RUN=false  # IMPORTANTE: false para modo LIVE
```

### 2️⃣ Verificar Fondos en las Chains

El bot necesita ETH en cada chain para:
- Gas de transacciones
- Capital para arbitraje

Mínimo recomendado: **0.01 ETH por chain**

Para verificar balances:
```bash
npm run bot:test  # Primero en DRY_RUN para ver balances
```

### 3️⃣ OPCIÓN A: Ejecutar Bot + API + Frontend (Recomendado)

```bash
# Terminal 1: Iniciar todo (bot + API + frontend)
npm run bot:live
```

Esto inicia:
- ✅ API Server (puerto 3100) - comunicación con frontend
- ✅ Bot de Arbitraje (LIVE MODE)
- ✅ Frontend Vite (puerto 4000)

Luego abre en el navegador:
```
http://localhost:4000
```

Ve a: **DeFi Protocols** → **Multi-Chain Arbitrage Bot** → Presiona **Iniciar Bot**

### 4️⃣ OPCIÓN B: Ejecutar Solo el Bot (Línea de Comandos)

```bash
# Ejecutar bot directamente
node src/modules/DeFiProtocols/multichain-arb/scripts/liveArbBot.js
```

O con npm:
```bash
npm run bot:live  # En terminal
```

### 5️⃣ OPCIÓN C: Ejecutar en Modo Prueba (DRY RUN)

Para probar sin riesgo real:

```bash
npm run bot:test  # Modo simulación
```

---

## 📊 Monitoreo en Tiempo Real

### Desde el Frontend (Recomendado)

1. Abre http://localhost:4000
2. Ve a **DeFi Protocols**
3. Selecciona **Multi-Chain Arbitrage Bot**
4. Presiona **Iniciar Bot** (cambia DRY RUN si quieres real)
5. Observa en tiempo real:
   - 📊 **Overview**: Stats generales (profit, ticks, win rate)
   - ⛓️ **Chains**: Balances y estado de cada chain
   - 🧠 **AI Bandit**: Thompson Sampling stats
   - 📜 **Trades**: Historial de operaciones ejecutadas

### Desde Terminal

Verás output como:

```
📍 Iteration 1/5
   🧠 AI selected: Base
   🔍 Scanning for arbitrage...
   ✅ Found 3 opportunities!
   📈 Best: ETH->0.05%->USDC->0.3%->ETH | Profit: $0.1234 (0.5%)
   💰 Profit threshold met, executing trade...
   🚀 EXECUTING TRADE on Base
   🔄 Swap 1: WETH -> USDC...
   ✅ Swap 1 complete: 0x...
   🔄 Swap 2: USDC -> WETH...
   ✅ Swap 2 complete: 0x...
   📊 TRADE RESULT:
   Profit: 0.00123 ETH (~$3.94)
```

---

## ⚙️ Configuración Avanzada

### Modificar Parámetros del Bot

Abre `src/modules/DeFiProtocols/multichain-arb/src/config.ts`:

```typescript
export const CFG = {
  // Timing
  TICK_MS: 700,                    // ms entre scans (más bajo = más rápido)
  DECISION_MS: 5000,               // ms entre cambios de chain por IA
  
  // Trading
  MIN_PROFIT_USD: 0.50,            // Mínimo profit en USD para ejecutar
  GAS_MULT: 1.7,                   // Multiplicador de gas para seguridad
  MAX_SLIPPAGE_BPS: 50,            // 0.5% slippage máximo
  DEADLINE_SECONDS: 60,            // Timeout para transacciones
  
  // Chains Habilitados
  CHAINS: ["base", "arbitrum", "optimism"],  // Que chains analizar
  
  // Trade Sizes (en USD)
  TRADE_SIZES_USD: [25, 50, 100, 250, 500, 1000],
};
```

### Cambiar Log Level

```bash
LOG_LEVEL=debug npm run bot:live
```

Niveles: `trace`, `debug`, `info`, `warn`, `error`

---

## 🔍 Solución de Problemas

### ❌ Error: "Private key not found"

```
Solución:
1. Verifica que VITE_ETH_PRIVATE_KEY esté en .env
2. Verifica que NO tenga comillas: `VITE_ETH_PRIVATE_KEY=0x1234...` (sin comillas)
3. Reinicia la terminal para que cargue el .env
```

### ❌ Error: "No workers initialized"

```
Solución:
1. Verifica que las RPCs funcionen
2. Intenta con `npm run bot:test` para debug
3. Verifica: curl https://arb1.arbitrum.io/rpc -d '{"jsonrpc":"2.0","method":"eth_blockNumber"}'
```

### ❌ Bot no encuentra oportunidades

```
Posibles razones:
1. Los spreads son muy pequeños (< $0.50)
2. El MIN_PROFIT_USD es muy alto - baja a 0.25
3. Las pools no tienen liquidez - cambia fee tiers
```

### ❌ Transacciones fallan ("amountOutMinimum")

```
Solución:
1. Sube MAX_SLIPPAGE_BPS: 50 → 75 (0.75%)
2. Incrementa DEADLINE_SECONDS: 60 → 90
3. Verifica el precio del gas en cada chain
```

---

## 📈 Optimizaciones para Máxima Rentabilidad

### 1. Aumentar Velocidad de Escaneo
```typescript
TICK_MS: 300,        // Cada 300ms en lugar de 700ms
DECISION_MS: 3000,   // Cambiar chain cada 3s
```

### 2. Ajustar Tamaños de Trade
```typescript
// Más pequeños = más oportunidades pero menos profit
TRADE_SIZES_USD: [10, 25, 50, 100],

// O más grandes = menos oportunidades pero más profit
TRADE_SIZES_USD: [100, 250, 500, 1000, 2500],
```

### 3. Usar Solo Chains con Mejores Spreads

```typescript
// Si Optimism tiene muchas oportunidades:
CHAINS: ["optimism", "base", "arbitrum"],

// El AI las rotará automáticamente
```

### 4. Bajar Min Profit en Horas con Bajo Gas

```typescript
// En horarios pico de uso:
MIN_PROFIT_USD: 0.25,  // Más agresivo

// En horas valle:
MIN_PROFIT_USD: 1.00,  // Esperar lo mejor
```

---

## 🎯 Métricas Clave a Monitorear

| Métrica | Objetivo | Acción |
|---------|----------|--------|
| **Win Rate** | >60% | Muy bien, dejar así |
| **Net Profit USD** | >$5/min | Aumentar TRADE_SIZES o bajar MIN_PROFIT |
| **Latency** | <500ms | Acercarse a RPC o cambiar |
| **Gas Cost %** | <30% del profit | Normal en L2s |
| **Opportunities Found** | >10 por scan | Chain tiene liquidez |

---

## 🔐 Seguridad

### ✅ Medidas Implementadas

- ✅ No guarda private key en memoria más de lo necesario
- ✅ Todas las transacciones son simuladas primero (eth_call)
- ✅ Slippage máximo limitado (0.5%)
- ✅ Timeout en todas las transacciones
- ✅ Pausable en cualquier momento

### ⚠️ Recomendaciones

1. **Usa billetera dedicada** - No mezcles con fondos principales
2. **Comienza pequeño** - Prueba con $100-500 primero
3. **Monitorea activamente** - No dejes corriendo sin vigilar
4. **Haz backup de .env** - Guarda tu private key en lugar seguro
5. **Retira ganancias regularmente** - No dejes acumular en la wallet

---

## 📞 Soporte

Si tienes problemas:

1. Revisa los logs: Busca `[ERROR]` o `[FATAL]`
2. Activa debug: `LOG_LEVEL=debug npm run bot:live`
3. Prueba RPC directamente:
   ```bash
   curl https://arb1.arbitrum.io/rpc -X POST \
     -d '{"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":1}' \
     -H "Content-Type: application/json"
   ```
4. Verifica balances: El bot imprime al inicio de cada run

---

## 📚 Más Información

- **Uniswap V3**: Documentación en https://docs.uniswap.org/
- **Arbitraje**: Guía en https://docs.arbitrum.io/
- **Gas Optimization**: https://www.alchemy.com/layer2/

---

**Última actualización**: Enero 2026  
**Versión**: 1.0.0  
**Status**: Listo para Producción ✅




## 📋 Resumen Ejecutivo

Este bot ejecuta arbitraje DEX-to-DEX automático en las mejores L2s de Ethereum:
- **Base** - 0.01 gwei promedio
- **Arbitrum** - 0.01 gwei promedio  
- **Optimism** - 0.001 gwei promedio

**Características:**
- ✅ IA con Thompson Sampling para rotación de chains
- ✅ Análisis de múltiples fee tiers (0.01%, 0.05%, 0.3%, 1%)
- ✅ Integración Uniswap V3 + SushiSwap
- ✅ Gas-positivo (solo trades con ganancia neta)
- ✅ Frontend en tiempo real en módulo DeFi Protocols
- ✅ Control start/stop desde UI

---

## 🚀 Pasos para Ejecutar en REAL

### 1️⃣ Verificar Configuración `.env`

Asegúrate que tu archivo `.env` tenga:

```env
# REQUIRED - Tus credenciales
VITE_ETH_PRIVATE_KEY=0x...tu_private_key_aqui...
VITE_ETH_WALLET_ADDRESS=0x...tu_wallet_address...

# OPTIONAL - RPCs (usa los defaults si no los defines)
RPC_BASE=https://base-mainnet.g.alchemy.com/v2/tu_api_key
RPC_ARBITRUM=https://arb1.arbitrum.io/rpc
RPC_OPTIMISM=https://mainnet.optimism.io

# OPTIONAL - Modo
DRY_RUN=false  # IMPORTANTE: false para modo LIVE
```

### 2️⃣ Verificar Fondos en las Chains

El bot necesita ETH en cada chain para:
- Gas de transacciones
- Capital para arbitraje

Mínimo recomendado: **0.01 ETH por chain**

Para verificar balances:
```bash
npm run bot:test  # Primero en DRY_RUN para ver balances
```

### 3️⃣ OPCIÓN A: Ejecutar Bot + API + Frontend (Recomendado)

```bash
# Terminal 1: Iniciar todo (bot + API + frontend)
npm run bot:live
```

Esto inicia:
- ✅ API Server (puerto 3100) - comunicación con frontend
- ✅ Bot de Arbitraje (LIVE MODE)
- ✅ Frontend Vite (puerto 4000)

Luego abre en el navegador:
```
http://localhost:4000
```

Ve a: **DeFi Protocols** → **Multi-Chain Arbitrage Bot** → Presiona **Iniciar Bot**

### 4️⃣ OPCIÓN B: Ejecutar Solo el Bot (Línea de Comandos)

```bash
# Ejecutar bot directamente
node src/modules/DeFiProtocols/multichain-arb/scripts/liveArbBot.js
```

O con npm:
```bash
npm run bot:live  # En terminal
```

### 5️⃣ OPCIÓN C: Ejecutar en Modo Prueba (DRY RUN)

Para probar sin riesgo real:

```bash
npm run bot:test  # Modo simulación
```

---

## 📊 Monitoreo en Tiempo Real

### Desde el Frontend (Recomendado)

1. Abre http://localhost:4000
2. Ve a **DeFi Protocols**
3. Selecciona **Multi-Chain Arbitrage Bot**
4. Presiona **Iniciar Bot** (cambia DRY RUN si quieres real)
5. Observa en tiempo real:
   - 📊 **Overview**: Stats generales (profit, ticks, win rate)
   - ⛓️ **Chains**: Balances y estado de cada chain
   - 🧠 **AI Bandit**: Thompson Sampling stats
   - 📜 **Trades**: Historial de operaciones ejecutadas

### Desde Terminal

Verás output como:

```
📍 Iteration 1/5
   🧠 AI selected: Base
   🔍 Scanning for arbitrage...
   ✅ Found 3 opportunities!
   📈 Best: ETH->0.05%->USDC->0.3%->ETH | Profit: $0.1234 (0.5%)
   💰 Profit threshold met, executing trade...
   🚀 EXECUTING TRADE on Base
   🔄 Swap 1: WETH -> USDC...
   ✅ Swap 1 complete: 0x...
   🔄 Swap 2: USDC -> WETH...
   ✅ Swap 2 complete: 0x...
   📊 TRADE RESULT:
   Profit: 0.00123 ETH (~$3.94)
```

---

## ⚙️ Configuración Avanzada

### Modificar Parámetros del Bot

Abre `src/modules/DeFiProtocols/multichain-arb/src/config.ts`:

```typescript
export const CFG = {
  // Timing
  TICK_MS: 700,                    // ms entre scans (más bajo = más rápido)
  DECISION_MS: 5000,               // ms entre cambios de chain por IA
  
  // Trading
  MIN_PROFIT_USD: 0.50,            // Mínimo profit en USD para ejecutar
  GAS_MULT: 1.7,                   // Multiplicador de gas para seguridad
  MAX_SLIPPAGE_BPS: 50,            // 0.5% slippage máximo
  DEADLINE_SECONDS: 60,            // Timeout para transacciones
  
  // Chains Habilitados
  CHAINS: ["base", "arbitrum", "optimism"],  // Que chains analizar
  
  // Trade Sizes (en USD)
  TRADE_SIZES_USD: [25, 50, 100, 250, 500, 1000],
};
```

### Cambiar Log Level

```bash
LOG_LEVEL=debug npm run bot:live
```

Niveles: `trace`, `debug`, `info`, `warn`, `error`

---

## 🔍 Solución de Problemas

### ❌ Error: "Private key not found"

```
Solución:
1. Verifica que VITE_ETH_PRIVATE_KEY esté en .env
2. Verifica que NO tenga comillas: `VITE_ETH_PRIVATE_KEY=0x1234...` (sin comillas)
3. Reinicia la terminal para que cargue el .env
```

### ❌ Error: "No workers initialized"

```
Solución:
1. Verifica que las RPCs funcionen
2. Intenta con `npm run bot:test` para debug
3. Verifica: curl https://arb1.arbitrum.io/rpc -d '{"jsonrpc":"2.0","method":"eth_blockNumber"}'
```

### ❌ Bot no encuentra oportunidades

```
Posibles razones:
1. Los spreads son muy pequeños (< $0.50)
2. El MIN_PROFIT_USD es muy alto - baja a 0.25
3. Las pools no tienen liquidez - cambia fee tiers
```

### ❌ Transacciones fallan ("amountOutMinimum")

```
Solución:
1. Sube MAX_SLIPPAGE_BPS: 50 → 75 (0.75%)
2. Incrementa DEADLINE_SECONDS: 60 → 90
3. Verifica el precio del gas en cada chain
```

---

## 📈 Optimizaciones para Máxima Rentabilidad

### 1. Aumentar Velocidad de Escaneo
```typescript
TICK_MS: 300,        // Cada 300ms en lugar de 700ms
DECISION_MS: 3000,   // Cambiar chain cada 3s
```

### 2. Ajustar Tamaños de Trade
```typescript
// Más pequeños = más oportunidades pero menos profit
TRADE_SIZES_USD: [10, 25, 50, 100],

// O más grandes = menos oportunidades pero más profit
TRADE_SIZES_USD: [100, 250, 500, 1000, 2500],
```

### 3. Usar Solo Chains con Mejores Spreads

```typescript
// Si Optimism tiene muchas oportunidades:
CHAINS: ["optimism", "base", "arbitrum"],

// El AI las rotará automáticamente
```

### 4. Bajar Min Profit en Horas con Bajo Gas

```typescript
// En horarios pico de uso:
MIN_PROFIT_USD: 0.25,  // Más agresivo

// En horas valle:
MIN_PROFIT_USD: 1.00,  // Esperar lo mejor
```

---

## 🎯 Métricas Clave a Monitorear

| Métrica | Objetivo | Acción |
|---------|----------|--------|
| **Win Rate** | >60% | Muy bien, dejar así |
| **Net Profit USD** | >$5/min | Aumentar TRADE_SIZES o bajar MIN_PROFIT |
| **Latency** | <500ms | Acercarse a RPC o cambiar |
| **Gas Cost %** | <30% del profit | Normal en L2s |
| **Opportunities Found** | >10 por scan | Chain tiene liquidez |

---

## 🔐 Seguridad

### ✅ Medidas Implementadas

- ✅ No guarda private key en memoria más de lo necesario
- ✅ Todas las transacciones son simuladas primero (eth_call)
- ✅ Slippage máximo limitado (0.5%)
- ✅ Timeout en todas las transacciones
- ✅ Pausable en cualquier momento

### ⚠️ Recomendaciones

1. **Usa billetera dedicada** - No mezcles con fondos principales
2. **Comienza pequeño** - Prueba con $100-500 primero
3. **Monitorea activamente** - No dejes corriendo sin vigilar
4. **Haz backup de .env** - Guarda tu private key en lugar seguro
5. **Retira ganancias regularmente** - No dejes acumular en la wallet

---

## 📞 Soporte

Si tienes problemas:

1. Revisa los logs: Busca `[ERROR]` o `[FATAL]`
2. Activa debug: `LOG_LEVEL=debug npm run bot:live`
3. Prueba RPC directamente:
   ```bash
   curl https://arb1.arbitrum.io/rpc -X POST \
     -d '{"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":1}' \
     -H "Content-Type: application/json"
   ```
4. Verifica balances: El bot imprime al inicio de cada run

---

## 📚 Más Información

- **Uniswap V3**: Documentación en https://docs.uniswap.org/
- **Arbitraje**: Guía en https://docs.arbitrum.io/
- **Gas Optimization**: https://www.alchemy.com/layer2/

---

**Última actualización**: Enero 2026  
**Versión**: 1.0.0  
**Status**: Listo para Producción ✅



## 📋 Resumen Ejecutivo

Este bot ejecuta arbitraje DEX-to-DEX automático en las mejores L2s de Ethereum:
- **Base** - 0.01 gwei promedio
- **Arbitrum** - 0.01 gwei promedio  
- **Optimism** - 0.001 gwei promedio

**Características:**
- ✅ IA con Thompson Sampling para rotación de chains
- ✅ Análisis de múltiples fee tiers (0.01%, 0.05%, 0.3%, 1%)
- ✅ Integración Uniswap V3 + SushiSwap
- ✅ Gas-positivo (solo trades con ganancia neta)
- ✅ Frontend en tiempo real en módulo DeFi Protocols
- ✅ Control start/stop desde UI

---

## 🚀 Pasos para Ejecutar en REAL

### 1️⃣ Verificar Configuración `.env`

Asegúrate que tu archivo `.env` tenga:

```env
# REQUIRED - Tus credenciales
VITE_ETH_PRIVATE_KEY=0x...tu_private_key_aqui...
VITE_ETH_WALLET_ADDRESS=0x...tu_wallet_address...

# OPTIONAL - RPCs (usa los defaults si no los defines)
RPC_BASE=https://base-mainnet.g.alchemy.com/v2/tu_api_key
RPC_ARBITRUM=https://arb1.arbitrum.io/rpc
RPC_OPTIMISM=https://mainnet.optimism.io

# OPTIONAL - Modo
DRY_RUN=false  # IMPORTANTE: false para modo LIVE
```

### 2️⃣ Verificar Fondos en las Chains

El bot necesita ETH en cada chain para:
- Gas de transacciones
- Capital para arbitraje

Mínimo recomendado: **0.01 ETH por chain**

Para verificar balances:
```bash
npm run bot:test  # Primero en DRY_RUN para ver balances
```

### 3️⃣ OPCIÓN A: Ejecutar Bot + API + Frontend (Recomendado)

```bash
# Terminal 1: Iniciar todo (bot + API + frontend)
npm run bot:live
```

Esto inicia:
- ✅ API Server (puerto 3100) - comunicación con frontend
- ✅ Bot de Arbitraje (LIVE MODE)
- ✅ Frontend Vite (puerto 4000)

Luego abre en el navegador:
```
http://localhost:4000
```

Ve a: **DeFi Protocols** → **Multi-Chain Arbitrage Bot** → Presiona **Iniciar Bot**

### 4️⃣ OPCIÓN B: Ejecutar Solo el Bot (Línea de Comandos)

```bash
# Ejecutar bot directamente
node src/modules/DeFiProtocols/multichain-arb/scripts/liveArbBot.js
```

O con npm:
```bash
npm run bot:live  # En terminal
```

### 5️⃣ OPCIÓN C: Ejecutar en Modo Prueba (DRY RUN)

Para probar sin riesgo real:

```bash
npm run bot:test  # Modo simulación
```

---

## 📊 Monitoreo en Tiempo Real

### Desde el Frontend (Recomendado)

1. Abre http://localhost:4000
2. Ve a **DeFi Protocols**
3. Selecciona **Multi-Chain Arbitrage Bot**
4. Presiona **Iniciar Bot** (cambia DRY RUN si quieres real)
5. Observa en tiempo real:
   - 📊 **Overview**: Stats generales (profit, ticks, win rate)
   - ⛓️ **Chains**: Balances y estado de cada chain
   - 🧠 **AI Bandit**: Thompson Sampling stats
   - 📜 **Trades**: Historial de operaciones ejecutadas

### Desde Terminal

Verás output como:

```
📍 Iteration 1/5
   🧠 AI selected: Base
   🔍 Scanning for arbitrage...
   ✅ Found 3 opportunities!
   📈 Best: ETH->0.05%->USDC->0.3%->ETH | Profit: $0.1234 (0.5%)
   💰 Profit threshold met, executing trade...
   🚀 EXECUTING TRADE on Base
   🔄 Swap 1: WETH -> USDC...
   ✅ Swap 1 complete: 0x...
   🔄 Swap 2: USDC -> WETH...
   ✅ Swap 2 complete: 0x...
   📊 TRADE RESULT:
   Profit: 0.00123 ETH (~$3.94)
```

---

## ⚙️ Configuración Avanzada

### Modificar Parámetros del Bot

Abre `src/modules/DeFiProtocols/multichain-arb/src/config.ts`:

```typescript
export const CFG = {
  // Timing
  TICK_MS: 700,                    // ms entre scans (más bajo = más rápido)
  DECISION_MS: 5000,               // ms entre cambios de chain por IA
  
  // Trading
  MIN_PROFIT_USD: 0.50,            // Mínimo profit en USD para ejecutar
  GAS_MULT: 1.7,                   // Multiplicador de gas para seguridad
  MAX_SLIPPAGE_BPS: 50,            // 0.5% slippage máximo
  DEADLINE_SECONDS: 60,            // Timeout para transacciones
  
  // Chains Habilitados
  CHAINS: ["base", "arbitrum", "optimism"],  // Que chains analizar
  
  // Trade Sizes (en USD)
  TRADE_SIZES_USD: [25, 50, 100, 250, 500, 1000],
};
```

### Cambiar Log Level

```bash
LOG_LEVEL=debug npm run bot:live
```

Niveles: `trace`, `debug`, `info`, `warn`, `error`

---

## 🔍 Solución de Problemas

### ❌ Error: "Private key not found"

```
Solución:
1. Verifica que VITE_ETH_PRIVATE_KEY esté en .env
2. Verifica que NO tenga comillas: `VITE_ETH_PRIVATE_KEY=0x1234...` (sin comillas)
3. Reinicia la terminal para que cargue el .env
```

### ❌ Error: "No workers initialized"

```
Solución:
1. Verifica que las RPCs funcionen
2. Intenta con `npm run bot:test` para debug
3. Verifica: curl https://arb1.arbitrum.io/rpc -d '{"jsonrpc":"2.0","method":"eth_blockNumber"}'
```

### ❌ Bot no encuentra oportunidades

```
Posibles razones:
1. Los spreads son muy pequeños (< $0.50)
2. El MIN_PROFIT_USD es muy alto - baja a 0.25
3. Las pools no tienen liquidez - cambia fee tiers
```

### ❌ Transacciones fallan ("amountOutMinimum")

```
Solución:
1. Sube MAX_SLIPPAGE_BPS: 50 → 75 (0.75%)
2. Incrementa DEADLINE_SECONDS: 60 → 90
3. Verifica el precio del gas en cada chain
```

---

## 📈 Optimizaciones para Máxima Rentabilidad

### 1. Aumentar Velocidad de Escaneo
```typescript
TICK_MS: 300,        // Cada 300ms en lugar de 700ms
DECISION_MS: 3000,   // Cambiar chain cada 3s
```

### 2. Ajustar Tamaños de Trade
```typescript
// Más pequeños = más oportunidades pero menos profit
TRADE_SIZES_USD: [10, 25, 50, 100],

// O más grandes = menos oportunidades pero más profit
TRADE_SIZES_USD: [100, 250, 500, 1000, 2500],
```

### 3. Usar Solo Chains con Mejores Spreads

```typescript
// Si Optimism tiene muchas oportunidades:
CHAINS: ["optimism", "base", "arbitrum"],

// El AI las rotará automáticamente
```

### 4. Bajar Min Profit en Horas con Bajo Gas

```typescript
// En horarios pico de uso:
MIN_PROFIT_USD: 0.25,  // Más agresivo

// En horas valle:
MIN_PROFIT_USD: 1.00,  // Esperar lo mejor
```

---

## 🎯 Métricas Clave a Monitorear

| Métrica | Objetivo | Acción |
|---------|----------|--------|
| **Win Rate** | >60% | Muy bien, dejar así |
| **Net Profit USD** | >$5/min | Aumentar TRADE_SIZES o bajar MIN_PROFIT |
| **Latency** | <500ms | Acercarse a RPC o cambiar |
| **Gas Cost %** | <30% del profit | Normal en L2s |
| **Opportunities Found** | >10 por scan | Chain tiene liquidez |

---

## 🔐 Seguridad

### ✅ Medidas Implementadas

- ✅ No guarda private key en memoria más de lo necesario
- ✅ Todas las transacciones son simuladas primero (eth_call)
- ✅ Slippage máximo limitado (0.5%)
- ✅ Timeout en todas las transacciones
- ✅ Pausable en cualquier momento

### ⚠️ Recomendaciones

1. **Usa billetera dedicada** - No mezcles con fondos principales
2. **Comienza pequeño** - Prueba con $100-500 primero
3. **Monitorea activamente** - No dejes corriendo sin vigilar
4. **Haz backup de .env** - Guarda tu private key en lugar seguro
5. **Retira ganancias regularmente** - No dejes acumular en la wallet

---

## 📞 Soporte

Si tienes problemas:

1. Revisa los logs: Busca `[ERROR]` o `[FATAL]`
2. Activa debug: `LOG_LEVEL=debug npm run bot:live`
3. Prueba RPC directamente:
   ```bash
   curl https://arb1.arbitrum.io/rpc -X POST \
     -d '{"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":1}' \
     -H "Content-Type: application/json"
   ```
4. Verifica balances: El bot imprime al inicio de cada run

---

## 📚 Más Información

- **Uniswap V3**: Documentación en https://docs.uniswap.org/
- **Arbitraje**: Guía en https://docs.arbitrum.io/
- **Gas Optimization**: https://www.alchemy.com/layer2/

---

**Última actualización**: Enero 2026  
**Versión**: 1.0.0  
**Status**: Listo para Producción ✅




## 📋 Resumen Ejecutivo

Este bot ejecuta arbitraje DEX-to-DEX automático en las mejores L2s de Ethereum:
- **Base** - 0.01 gwei promedio
- **Arbitrum** - 0.01 gwei promedio  
- **Optimism** - 0.001 gwei promedio

**Características:**
- ✅ IA con Thompson Sampling para rotación de chains
- ✅ Análisis de múltiples fee tiers (0.01%, 0.05%, 0.3%, 1%)
- ✅ Integración Uniswap V3 + SushiSwap
- ✅ Gas-positivo (solo trades con ganancia neta)
- ✅ Frontend en tiempo real en módulo DeFi Protocols
- ✅ Control start/stop desde UI

---

## 🚀 Pasos para Ejecutar en REAL

### 1️⃣ Verificar Configuración `.env`

Asegúrate que tu archivo `.env` tenga:

```env
# REQUIRED - Tus credenciales
VITE_ETH_PRIVATE_KEY=0x...tu_private_key_aqui...
VITE_ETH_WALLET_ADDRESS=0x...tu_wallet_address...

# OPTIONAL - RPCs (usa los defaults si no los defines)
RPC_BASE=https://base-mainnet.g.alchemy.com/v2/tu_api_key
RPC_ARBITRUM=https://arb1.arbitrum.io/rpc
RPC_OPTIMISM=https://mainnet.optimism.io

# OPTIONAL - Modo
DRY_RUN=false  # IMPORTANTE: false para modo LIVE
```

### 2️⃣ Verificar Fondos en las Chains

El bot necesita ETH en cada chain para:
- Gas de transacciones
- Capital para arbitraje

Mínimo recomendado: **0.01 ETH por chain**

Para verificar balances:
```bash
npm run bot:test  # Primero en DRY_RUN para ver balances
```

### 3️⃣ OPCIÓN A: Ejecutar Bot + API + Frontend (Recomendado)

```bash
# Terminal 1: Iniciar todo (bot + API + frontend)
npm run bot:live
```

Esto inicia:
- ✅ API Server (puerto 3100) - comunicación con frontend
- ✅ Bot de Arbitraje (LIVE MODE)
- ✅ Frontend Vite (puerto 4000)

Luego abre en el navegador:
```
http://localhost:4000
```

Ve a: **DeFi Protocols** → **Multi-Chain Arbitrage Bot** → Presiona **Iniciar Bot**

### 4️⃣ OPCIÓN B: Ejecutar Solo el Bot (Línea de Comandos)

```bash
# Ejecutar bot directamente
node src/modules/DeFiProtocols/multichain-arb/scripts/liveArbBot.js
```

O con npm:
```bash
npm run bot:live  # En terminal
```

### 5️⃣ OPCIÓN C: Ejecutar en Modo Prueba (DRY RUN)

Para probar sin riesgo real:

```bash
npm run bot:test  # Modo simulación
```

---

## 📊 Monitoreo en Tiempo Real

### Desde el Frontend (Recomendado)

1. Abre http://localhost:4000
2. Ve a **DeFi Protocols**
3. Selecciona **Multi-Chain Arbitrage Bot**
4. Presiona **Iniciar Bot** (cambia DRY RUN si quieres real)
5. Observa en tiempo real:
   - 📊 **Overview**: Stats generales (profit, ticks, win rate)
   - ⛓️ **Chains**: Balances y estado de cada chain
   - 🧠 **AI Bandit**: Thompson Sampling stats
   - 📜 **Trades**: Historial de operaciones ejecutadas

### Desde Terminal

Verás output como:

```
📍 Iteration 1/5
   🧠 AI selected: Base
   🔍 Scanning for arbitrage...
   ✅ Found 3 opportunities!
   📈 Best: ETH->0.05%->USDC->0.3%->ETH | Profit: $0.1234 (0.5%)
   💰 Profit threshold met, executing trade...
   🚀 EXECUTING TRADE on Base
   🔄 Swap 1: WETH -> USDC...
   ✅ Swap 1 complete: 0x...
   🔄 Swap 2: USDC -> WETH...
   ✅ Swap 2 complete: 0x...
   📊 TRADE RESULT:
   Profit: 0.00123 ETH (~$3.94)
```

---

## ⚙️ Configuración Avanzada

### Modificar Parámetros del Bot

Abre `src/modules/DeFiProtocols/multichain-arb/src/config.ts`:

```typescript
export const CFG = {
  // Timing
  TICK_MS: 700,                    // ms entre scans (más bajo = más rápido)
  DECISION_MS: 5000,               // ms entre cambios de chain por IA
  
  // Trading
  MIN_PROFIT_USD: 0.50,            // Mínimo profit en USD para ejecutar
  GAS_MULT: 1.7,                   // Multiplicador de gas para seguridad
  MAX_SLIPPAGE_BPS: 50,            // 0.5% slippage máximo
  DEADLINE_SECONDS: 60,            // Timeout para transacciones
  
  // Chains Habilitados
  CHAINS: ["base", "arbitrum", "optimism"],  // Que chains analizar
  
  // Trade Sizes (en USD)
  TRADE_SIZES_USD: [25, 50, 100, 250, 500, 1000],
};
```

### Cambiar Log Level

```bash
LOG_LEVEL=debug npm run bot:live
```

Niveles: `trace`, `debug`, `info`, `warn`, `error`

---

## 🔍 Solución de Problemas

### ❌ Error: "Private key not found"

```
Solución:
1. Verifica que VITE_ETH_PRIVATE_KEY esté en .env
2. Verifica que NO tenga comillas: `VITE_ETH_PRIVATE_KEY=0x1234...` (sin comillas)
3. Reinicia la terminal para que cargue el .env
```

### ❌ Error: "No workers initialized"

```
Solución:
1. Verifica que las RPCs funcionen
2. Intenta con `npm run bot:test` para debug
3. Verifica: curl https://arb1.arbitrum.io/rpc -d '{"jsonrpc":"2.0","method":"eth_blockNumber"}'
```

### ❌ Bot no encuentra oportunidades

```
Posibles razones:
1. Los spreads son muy pequeños (< $0.50)
2. El MIN_PROFIT_USD es muy alto - baja a 0.25
3. Las pools no tienen liquidez - cambia fee tiers
```

### ❌ Transacciones fallan ("amountOutMinimum")

```
Solución:
1. Sube MAX_SLIPPAGE_BPS: 50 → 75 (0.75%)
2. Incrementa DEADLINE_SECONDS: 60 → 90
3. Verifica el precio del gas en cada chain
```

---

## 📈 Optimizaciones para Máxima Rentabilidad

### 1. Aumentar Velocidad de Escaneo
```typescript
TICK_MS: 300,        // Cada 300ms en lugar de 700ms
DECISION_MS: 3000,   // Cambiar chain cada 3s
```

### 2. Ajustar Tamaños de Trade
```typescript
// Más pequeños = más oportunidades pero menos profit
TRADE_SIZES_USD: [10, 25, 50, 100],

// O más grandes = menos oportunidades pero más profit
TRADE_SIZES_USD: [100, 250, 500, 1000, 2500],
```

### 3. Usar Solo Chains con Mejores Spreads

```typescript
// Si Optimism tiene muchas oportunidades:
CHAINS: ["optimism", "base", "arbitrum"],

// El AI las rotará automáticamente
```

### 4. Bajar Min Profit en Horas con Bajo Gas

```typescript
// En horarios pico de uso:
MIN_PROFIT_USD: 0.25,  // Más agresivo

// En horas valle:
MIN_PROFIT_USD: 1.00,  // Esperar lo mejor
```

---

## 🎯 Métricas Clave a Monitorear

| Métrica | Objetivo | Acción |
|---------|----------|--------|
| **Win Rate** | >60% | Muy bien, dejar así |
| **Net Profit USD** | >$5/min | Aumentar TRADE_SIZES o bajar MIN_PROFIT |
| **Latency** | <500ms | Acercarse a RPC o cambiar |
| **Gas Cost %** | <30% del profit | Normal en L2s |
| **Opportunities Found** | >10 por scan | Chain tiene liquidez |

---

## 🔐 Seguridad

### ✅ Medidas Implementadas

- ✅ No guarda private key en memoria más de lo necesario
- ✅ Todas las transacciones son simuladas primero (eth_call)
- ✅ Slippage máximo limitado (0.5%)
- ✅ Timeout en todas las transacciones
- ✅ Pausable en cualquier momento

### ⚠️ Recomendaciones

1. **Usa billetera dedicada** - No mezcles con fondos principales
2. **Comienza pequeño** - Prueba con $100-500 primero
3. **Monitorea activamente** - No dejes corriendo sin vigilar
4. **Haz backup de .env** - Guarda tu private key en lugar seguro
5. **Retira ganancias regularmente** - No dejes acumular en la wallet

---

## 📞 Soporte

Si tienes problemas:

1. Revisa los logs: Busca `[ERROR]` o `[FATAL]`
2. Activa debug: `LOG_LEVEL=debug npm run bot:live`
3. Prueba RPC directamente:
   ```bash
   curl https://arb1.arbitrum.io/rpc -X POST \
     -d '{"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":1}' \
     -H "Content-Type: application/json"
   ```
4. Verifica balances: El bot imprime al inicio de cada run

---

## 📚 Más Información

- **Uniswap V3**: Documentación en https://docs.uniswap.org/
- **Arbitraje**: Guía en https://docs.arbitrum.io/
- **Gas Optimization**: https://www.alchemy.com/layer2/

---

**Última actualización**: Enero 2026  
**Versión**: 1.0.0  
**Status**: Listo para Producción ✅



## 📋 Resumen Ejecutivo

Este bot ejecuta arbitraje DEX-to-DEX automático en las mejores L2s de Ethereum:
- **Base** - 0.01 gwei promedio
- **Arbitrum** - 0.01 gwei promedio  
- **Optimism** - 0.001 gwei promedio

**Características:**
- ✅ IA con Thompson Sampling para rotación de chains
- ✅ Análisis de múltiples fee tiers (0.01%, 0.05%, 0.3%, 1%)
- ✅ Integración Uniswap V3 + SushiSwap
- ✅ Gas-positivo (solo trades con ganancia neta)
- ✅ Frontend en tiempo real en módulo DeFi Protocols
- ✅ Control start/stop desde UI

---

## 🚀 Pasos para Ejecutar en REAL

### 1️⃣ Verificar Configuración `.env`

Asegúrate que tu archivo `.env` tenga:

```env
# REQUIRED - Tus credenciales
VITE_ETH_PRIVATE_KEY=0x...tu_private_key_aqui...
VITE_ETH_WALLET_ADDRESS=0x...tu_wallet_address...

# OPTIONAL - RPCs (usa los defaults si no los defines)
RPC_BASE=https://base-mainnet.g.alchemy.com/v2/tu_api_key
RPC_ARBITRUM=https://arb1.arbitrum.io/rpc
RPC_OPTIMISM=https://mainnet.optimism.io

# OPTIONAL - Modo
DRY_RUN=false  # IMPORTANTE: false para modo LIVE
```

### 2️⃣ Verificar Fondos en las Chains

El bot necesita ETH en cada chain para:
- Gas de transacciones
- Capital para arbitraje

Mínimo recomendado: **0.01 ETH por chain**

Para verificar balances:
```bash
npm run bot:test  # Primero en DRY_RUN para ver balances
```

### 3️⃣ OPCIÓN A: Ejecutar Bot + API + Frontend (Recomendado)

```bash
# Terminal 1: Iniciar todo (bot + API + frontend)
npm run bot:live
```

Esto inicia:
- ✅ API Server (puerto 3100) - comunicación con frontend
- ✅ Bot de Arbitraje (LIVE MODE)
- ✅ Frontend Vite (puerto 4000)

Luego abre en el navegador:
```
http://localhost:4000
```

Ve a: **DeFi Protocols** → **Multi-Chain Arbitrage Bot** → Presiona **Iniciar Bot**

### 4️⃣ OPCIÓN B: Ejecutar Solo el Bot (Línea de Comandos)

```bash
# Ejecutar bot directamente
node src/modules/DeFiProtocols/multichain-arb/scripts/liveArbBot.js
```

O con npm:
```bash
npm run bot:live  # En terminal
```

### 5️⃣ OPCIÓN C: Ejecutar en Modo Prueba (DRY RUN)

Para probar sin riesgo real:

```bash
npm run bot:test  # Modo simulación
```

---

## 📊 Monitoreo en Tiempo Real

### Desde el Frontend (Recomendado)

1. Abre http://localhost:4000
2. Ve a **DeFi Protocols**
3. Selecciona **Multi-Chain Arbitrage Bot**
4. Presiona **Iniciar Bot** (cambia DRY RUN si quieres real)
5. Observa en tiempo real:
   - 📊 **Overview**: Stats generales (profit, ticks, win rate)
   - ⛓️ **Chains**: Balances y estado de cada chain
   - 🧠 **AI Bandit**: Thompson Sampling stats
   - 📜 **Trades**: Historial de operaciones ejecutadas

### Desde Terminal

Verás output como:

```
📍 Iteration 1/5
   🧠 AI selected: Base
   🔍 Scanning for arbitrage...
   ✅ Found 3 opportunities!
   📈 Best: ETH->0.05%->USDC->0.3%->ETH | Profit: $0.1234 (0.5%)
   💰 Profit threshold met, executing trade...
   🚀 EXECUTING TRADE on Base
   🔄 Swap 1: WETH -> USDC...
   ✅ Swap 1 complete: 0x...
   🔄 Swap 2: USDC -> WETH...
   ✅ Swap 2 complete: 0x...
   📊 TRADE RESULT:
   Profit: 0.00123 ETH (~$3.94)
```

---

## ⚙️ Configuración Avanzada

### Modificar Parámetros del Bot

Abre `src/modules/DeFiProtocols/multichain-arb/src/config.ts`:

```typescript
export const CFG = {
  // Timing
  TICK_MS: 700,                    // ms entre scans (más bajo = más rápido)
  DECISION_MS: 5000,               // ms entre cambios de chain por IA
  
  // Trading
  MIN_PROFIT_USD: 0.50,            // Mínimo profit en USD para ejecutar
  GAS_MULT: 1.7,                   // Multiplicador de gas para seguridad
  MAX_SLIPPAGE_BPS: 50,            // 0.5% slippage máximo
  DEADLINE_SECONDS: 60,            // Timeout para transacciones
  
  // Chains Habilitados
  CHAINS: ["base", "arbitrum", "optimism"],  // Que chains analizar
  
  // Trade Sizes (en USD)
  TRADE_SIZES_USD: [25, 50, 100, 250, 500, 1000],
};
```

### Cambiar Log Level

```bash
LOG_LEVEL=debug npm run bot:live
```

Niveles: `trace`, `debug`, `info`, `warn`, `error`

---

## 🔍 Solución de Problemas

### ❌ Error: "Private key not found"

```
Solución:
1. Verifica que VITE_ETH_PRIVATE_KEY esté en .env
2. Verifica que NO tenga comillas: `VITE_ETH_PRIVATE_KEY=0x1234...` (sin comillas)
3. Reinicia la terminal para que cargue el .env
```

### ❌ Error: "No workers initialized"

```
Solución:
1. Verifica que las RPCs funcionen
2. Intenta con `npm run bot:test` para debug
3. Verifica: curl https://arb1.arbitrum.io/rpc -d '{"jsonrpc":"2.0","method":"eth_blockNumber"}'
```

### ❌ Bot no encuentra oportunidades

```
Posibles razones:
1. Los spreads son muy pequeños (< $0.50)
2. El MIN_PROFIT_USD es muy alto - baja a 0.25
3. Las pools no tienen liquidez - cambia fee tiers
```

### ❌ Transacciones fallan ("amountOutMinimum")

```
Solución:
1. Sube MAX_SLIPPAGE_BPS: 50 → 75 (0.75%)
2. Incrementa DEADLINE_SECONDS: 60 → 90
3. Verifica el precio del gas en cada chain
```

---

## 📈 Optimizaciones para Máxima Rentabilidad

### 1. Aumentar Velocidad de Escaneo
```typescript
TICK_MS: 300,        // Cada 300ms en lugar de 700ms
DECISION_MS: 3000,   // Cambiar chain cada 3s
```

### 2. Ajustar Tamaños de Trade
```typescript
// Más pequeños = más oportunidades pero menos profit
TRADE_SIZES_USD: [10, 25, 50, 100],

// O más grandes = menos oportunidades pero más profit
TRADE_SIZES_USD: [100, 250, 500, 1000, 2500],
```

### 3. Usar Solo Chains con Mejores Spreads

```typescript
// Si Optimism tiene muchas oportunidades:
CHAINS: ["optimism", "base", "arbitrum"],

// El AI las rotará automáticamente
```

### 4. Bajar Min Profit en Horas con Bajo Gas

```typescript
// En horarios pico de uso:
MIN_PROFIT_USD: 0.25,  // Más agresivo

// En horas valle:
MIN_PROFIT_USD: 1.00,  // Esperar lo mejor
```

---

## 🎯 Métricas Clave a Monitorear

| Métrica | Objetivo | Acción |
|---------|----------|--------|
| **Win Rate** | >60% | Muy bien, dejar así |
| **Net Profit USD** | >$5/min | Aumentar TRADE_SIZES o bajar MIN_PROFIT |
| **Latency** | <500ms | Acercarse a RPC o cambiar |
| **Gas Cost %** | <30% del profit | Normal en L2s |
| **Opportunities Found** | >10 por scan | Chain tiene liquidez |

---

## 🔐 Seguridad

### ✅ Medidas Implementadas

- ✅ No guarda private key en memoria más de lo necesario
- ✅ Todas las transacciones son simuladas primero (eth_call)
- ✅ Slippage máximo limitado (0.5%)
- ✅ Timeout en todas las transacciones
- ✅ Pausable en cualquier momento

### ⚠️ Recomendaciones

1. **Usa billetera dedicada** - No mezcles con fondos principales
2. **Comienza pequeño** - Prueba con $100-500 primero
3. **Monitorea activamente** - No dejes corriendo sin vigilar
4. **Haz backup de .env** - Guarda tu private key en lugar seguro
5. **Retira ganancias regularmente** - No dejes acumular en la wallet

---

## 📞 Soporte

Si tienes problemas:

1. Revisa los logs: Busca `[ERROR]` o `[FATAL]`
2. Activa debug: `LOG_LEVEL=debug npm run bot:live`
3. Prueba RPC directamente:
   ```bash
   curl https://arb1.arbitrum.io/rpc -X POST \
     -d '{"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":1}' \
     -H "Content-Type: application/json"
   ```
4. Verifica balances: El bot imprime al inicio de cada run

---

## 📚 Más Información

- **Uniswap V3**: Documentación en https://docs.uniswap.org/
- **Arbitraje**: Guía en https://docs.arbitrum.io/
- **Gas Optimization**: https://www.alchemy.com/layer2/

---

**Última actualización**: Enero 2026  
**Versión**: 1.0.0  
**Status**: Listo para Producción ✅




## 📋 Resumen Ejecutivo

Este bot ejecuta arbitraje DEX-to-DEX automático en las mejores L2s de Ethereum:
- **Base** - 0.01 gwei promedio
- **Arbitrum** - 0.01 gwei promedio  
- **Optimism** - 0.001 gwei promedio

**Características:**
- ✅ IA con Thompson Sampling para rotación de chains
- ✅ Análisis de múltiples fee tiers (0.01%, 0.05%, 0.3%, 1%)
- ✅ Integración Uniswap V3 + SushiSwap
- ✅ Gas-positivo (solo trades con ganancia neta)
- ✅ Frontend en tiempo real en módulo DeFi Protocols
- ✅ Control start/stop desde UI

---

## 🚀 Pasos para Ejecutar en REAL

### 1️⃣ Verificar Configuración `.env`

Asegúrate que tu archivo `.env` tenga:

```env
# REQUIRED - Tus credenciales
VITE_ETH_PRIVATE_KEY=0x...tu_private_key_aqui...
VITE_ETH_WALLET_ADDRESS=0x...tu_wallet_address...

# OPTIONAL - RPCs (usa los defaults si no los defines)
RPC_BASE=https://base-mainnet.g.alchemy.com/v2/tu_api_key
RPC_ARBITRUM=https://arb1.arbitrum.io/rpc
RPC_OPTIMISM=https://mainnet.optimism.io

# OPTIONAL - Modo
DRY_RUN=false  # IMPORTANTE: false para modo LIVE
```

### 2️⃣ Verificar Fondos en las Chains

El bot necesita ETH en cada chain para:
- Gas de transacciones
- Capital para arbitraje

Mínimo recomendado: **0.01 ETH por chain**

Para verificar balances:
```bash
npm run bot:test  # Primero en DRY_RUN para ver balances
```

### 3️⃣ OPCIÓN A: Ejecutar Bot + API + Frontend (Recomendado)

```bash
# Terminal 1: Iniciar todo (bot + API + frontend)
npm run bot:live
```

Esto inicia:
- ✅ API Server (puerto 3100) - comunicación con frontend
- ✅ Bot de Arbitraje (LIVE MODE)
- ✅ Frontend Vite (puerto 4000)

Luego abre en el navegador:
```
http://localhost:4000
```

Ve a: **DeFi Protocols** → **Multi-Chain Arbitrage Bot** → Presiona **Iniciar Bot**

### 4️⃣ OPCIÓN B: Ejecutar Solo el Bot (Línea de Comandos)

```bash
# Ejecutar bot directamente
node src/modules/DeFiProtocols/multichain-arb/scripts/liveArbBot.js
```

O con npm:
```bash
npm run bot:live  # En terminal
```

### 5️⃣ OPCIÓN C: Ejecutar en Modo Prueba (DRY RUN)

Para probar sin riesgo real:

```bash
npm run bot:test  # Modo simulación
```

---

## 📊 Monitoreo en Tiempo Real

### Desde el Frontend (Recomendado)

1. Abre http://localhost:4000
2. Ve a **DeFi Protocols**
3. Selecciona **Multi-Chain Arbitrage Bot**
4. Presiona **Iniciar Bot** (cambia DRY RUN si quieres real)
5. Observa en tiempo real:
   - 📊 **Overview**: Stats generales (profit, ticks, win rate)
   - ⛓️ **Chains**: Balances y estado de cada chain
   - 🧠 **AI Bandit**: Thompson Sampling stats
   - 📜 **Trades**: Historial de operaciones ejecutadas

### Desde Terminal

Verás output como:

```
📍 Iteration 1/5
   🧠 AI selected: Base
   🔍 Scanning for arbitrage...
   ✅ Found 3 opportunities!
   📈 Best: ETH->0.05%->USDC->0.3%->ETH | Profit: $0.1234 (0.5%)
   💰 Profit threshold met, executing trade...
   🚀 EXECUTING TRADE on Base
   🔄 Swap 1: WETH -> USDC...
   ✅ Swap 1 complete: 0x...
   🔄 Swap 2: USDC -> WETH...
   ✅ Swap 2 complete: 0x...
   📊 TRADE RESULT:
   Profit: 0.00123 ETH (~$3.94)
```

---

## ⚙️ Configuración Avanzada

### Modificar Parámetros del Bot

Abre `src/modules/DeFiProtocols/multichain-arb/src/config.ts`:

```typescript
export const CFG = {
  // Timing
  TICK_MS: 700,                    // ms entre scans (más bajo = más rápido)
  DECISION_MS: 5000,               // ms entre cambios de chain por IA
  
  // Trading
  MIN_PROFIT_USD: 0.50,            // Mínimo profit en USD para ejecutar
  GAS_MULT: 1.7,                   // Multiplicador de gas para seguridad
  MAX_SLIPPAGE_BPS: 50,            // 0.5% slippage máximo
  DEADLINE_SECONDS: 60,            // Timeout para transacciones
  
  // Chains Habilitados
  CHAINS: ["base", "arbitrum", "optimism"],  // Que chains analizar
  
  // Trade Sizes (en USD)
  TRADE_SIZES_USD: [25, 50, 100, 250, 500, 1000],
};
```

### Cambiar Log Level

```bash
LOG_LEVEL=debug npm run bot:live
```

Niveles: `trace`, `debug`, `info`, `warn`, `error`

---

## 🔍 Solución de Problemas

### ❌ Error: "Private key not found"

```
Solución:
1. Verifica que VITE_ETH_PRIVATE_KEY esté en .env
2. Verifica que NO tenga comillas: `VITE_ETH_PRIVATE_KEY=0x1234...` (sin comillas)
3. Reinicia la terminal para que cargue el .env
```

### ❌ Error: "No workers initialized"

```
Solución:
1. Verifica que las RPCs funcionen
2. Intenta con `npm run bot:test` para debug
3. Verifica: curl https://arb1.arbitrum.io/rpc -d '{"jsonrpc":"2.0","method":"eth_blockNumber"}'
```

### ❌ Bot no encuentra oportunidades

```
Posibles razones:
1. Los spreads son muy pequeños (< $0.50)
2. El MIN_PROFIT_USD es muy alto - baja a 0.25
3. Las pools no tienen liquidez - cambia fee tiers
```

### ❌ Transacciones fallan ("amountOutMinimum")

```
Solución:
1. Sube MAX_SLIPPAGE_BPS: 50 → 75 (0.75%)
2. Incrementa DEADLINE_SECONDS: 60 → 90
3. Verifica el precio del gas en cada chain
```

---

## 📈 Optimizaciones para Máxima Rentabilidad

### 1. Aumentar Velocidad de Escaneo
```typescript
TICK_MS: 300,        // Cada 300ms en lugar de 700ms
DECISION_MS: 3000,   // Cambiar chain cada 3s
```

### 2. Ajustar Tamaños de Trade
```typescript
// Más pequeños = más oportunidades pero menos profit
TRADE_SIZES_USD: [10, 25, 50, 100],

// O más grandes = menos oportunidades pero más profit
TRADE_SIZES_USD: [100, 250, 500, 1000, 2500],
```

### 3. Usar Solo Chains con Mejores Spreads

```typescript
// Si Optimism tiene muchas oportunidades:
CHAINS: ["optimism", "base", "arbitrum"],

// El AI las rotará automáticamente
```

### 4. Bajar Min Profit en Horas con Bajo Gas

```typescript
// En horarios pico de uso:
MIN_PROFIT_USD: 0.25,  // Más agresivo

// En horas valle:
MIN_PROFIT_USD: 1.00,  // Esperar lo mejor
```

---

## 🎯 Métricas Clave a Monitorear

| Métrica | Objetivo | Acción |
|---------|----------|--------|
| **Win Rate** | >60% | Muy bien, dejar así |
| **Net Profit USD** | >$5/min | Aumentar TRADE_SIZES o bajar MIN_PROFIT |
| **Latency** | <500ms | Acercarse a RPC o cambiar |
| **Gas Cost %** | <30% del profit | Normal en L2s |
| **Opportunities Found** | >10 por scan | Chain tiene liquidez |

---

## 🔐 Seguridad

### ✅ Medidas Implementadas

- ✅ No guarda private key en memoria más de lo necesario
- ✅ Todas las transacciones son simuladas primero (eth_call)
- ✅ Slippage máximo limitado (0.5%)
- ✅ Timeout en todas las transacciones
- ✅ Pausable en cualquier momento

### ⚠️ Recomendaciones

1. **Usa billetera dedicada** - No mezcles con fondos principales
2. **Comienza pequeño** - Prueba con $100-500 primero
3. **Monitorea activamente** - No dejes corriendo sin vigilar
4. **Haz backup de .env** - Guarda tu private key en lugar seguro
5. **Retira ganancias regularmente** - No dejes acumular en la wallet

---

## 📞 Soporte

Si tienes problemas:

1. Revisa los logs: Busca `[ERROR]` o `[FATAL]`
2. Activa debug: `LOG_LEVEL=debug npm run bot:live`
3. Prueba RPC directamente:
   ```bash
   curl https://arb1.arbitrum.io/rpc -X POST \
     -d '{"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":1}' \
     -H "Content-Type: application/json"
   ```
4. Verifica balances: El bot imprime al inicio de cada run

---

## 📚 Más Información

- **Uniswap V3**: Documentación en https://docs.uniswap.org/
- **Arbitraje**: Guía en https://docs.arbitrum.io/
- **Gas Optimization**: https://www.alchemy.com/layer2/

---

**Última actualización**: Enero 2026  
**Versión**: 1.0.0  
**Status**: Listo para Producción ✅



## 📋 Resumen Ejecutivo

Este bot ejecuta arbitraje DEX-to-DEX automático en las mejores L2s de Ethereum:
- **Base** - 0.01 gwei promedio
- **Arbitrum** - 0.01 gwei promedio  
- **Optimism** - 0.001 gwei promedio

**Características:**
- ✅ IA con Thompson Sampling para rotación de chains
- ✅ Análisis de múltiples fee tiers (0.01%, 0.05%, 0.3%, 1%)
- ✅ Integración Uniswap V3 + SushiSwap
- ✅ Gas-positivo (solo trades con ganancia neta)
- ✅ Frontend en tiempo real en módulo DeFi Protocols
- ✅ Control start/stop desde UI

---

## 🚀 Pasos para Ejecutar en REAL

### 1️⃣ Verificar Configuración `.env`

Asegúrate que tu archivo `.env` tenga:

```env
# REQUIRED - Tus credenciales
VITE_ETH_PRIVATE_KEY=0x...tu_private_key_aqui...
VITE_ETH_WALLET_ADDRESS=0x...tu_wallet_address...

# OPTIONAL - RPCs (usa los defaults si no los defines)
RPC_BASE=https://base-mainnet.g.alchemy.com/v2/tu_api_key
RPC_ARBITRUM=https://arb1.arbitrum.io/rpc
RPC_OPTIMISM=https://mainnet.optimism.io

# OPTIONAL - Modo
DRY_RUN=false  # IMPORTANTE: false para modo LIVE
```

### 2️⃣ Verificar Fondos en las Chains

El bot necesita ETH en cada chain para:
- Gas de transacciones
- Capital para arbitraje

Mínimo recomendado: **0.01 ETH por chain**

Para verificar balances:
```bash
npm run bot:test  # Primero en DRY_RUN para ver balances
```

### 3️⃣ OPCIÓN A: Ejecutar Bot + API + Frontend (Recomendado)

```bash
# Terminal 1: Iniciar todo (bot + API + frontend)
npm run bot:live
```

Esto inicia:
- ✅ API Server (puerto 3100) - comunicación con frontend
- ✅ Bot de Arbitraje (LIVE MODE)
- ✅ Frontend Vite (puerto 4000)

Luego abre en el navegador:
```
http://localhost:4000
```

Ve a: **DeFi Protocols** → **Multi-Chain Arbitrage Bot** → Presiona **Iniciar Bot**

### 4️⃣ OPCIÓN B: Ejecutar Solo el Bot (Línea de Comandos)

```bash
# Ejecutar bot directamente
node src/modules/DeFiProtocols/multichain-arb/scripts/liveArbBot.js
```

O con npm:
```bash
npm run bot:live  # En terminal
```

### 5️⃣ OPCIÓN C: Ejecutar en Modo Prueba (DRY RUN)

Para probar sin riesgo real:

```bash
npm run bot:test  # Modo simulación
```

---

## 📊 Monitoreo en Tiempo Real

### Desde el Frontend (Recomendado)

1. Abre http://localhost:4000
2. Ve a **DeFi Protocols**
3. Selecciona **Multi-Chain Arbitrage Bot**
4. Presiona **Iniciar Bot** (cambia DRY RUN si quieres real)
5. Observa en tiempo real:
   - 📊 **Overview**: Stats generales (profit, ticks, win rate)
   - ⛓️ **Chains**: Balances y estado de cada chain
   - 🧠 **AI Bandit**: Thompson Sampling stats
   - 📜 **Trades**: Historial de operaciones ejecutadas

### Desde Terminal

Verás output como:

```
📍 Iteration 1/5
   🧠 AI selected: Base
   🔍 Scanning for arbitrage...
   ✅ Found 3 opportunities!
   📈 Best: ETH->0.05%->USDC->0.3%->ETH | Profit: $0.1234 (0.5%)
   💰 Profit threshold met, executing trade...
   🚀 EXECUTING TRADE on Base
   🔄 Swap 1: WETH -> USDC...
   ✅ Swap 1 complete: 0x...
   🔄 Swap 2: USDC -> WETH...
   ✅ Swap 2 complete: 0x...
   📊 TRADE RESULT:
   Profit: 0.00123 ETH (~$3.94)
```

---

## ⚙️ Configuración Avanzada

### Modificar Parámetros del Bot

Abre `src/modules/DeFiProtocols/multichain-arb/src/config.ts`:

```typescript
export const CFG = {
  // Timing
  TICK_MS: 700,                    // ms entre scans (más bajo = más rápido)
  DECISION_MS: 5000,               // ms entre cambios de chain por IA
  
  // Trading
  MIN_PROFIT_USD: 0.50,            // Mínimo profit en USD para ejecutar
  GAS_MULT: 1.7,                   // Multiplicador de gas para seguridad
  MAX_SLIPPAGE_BPS: 50,            // 0.5% slippage máximo
  DEADLINE_SECONDS: 60,            // Timeout para transacciones
  
  // Chains Habilitados
  CHAINS: ["base", "arbitrum", "optimism"],  // Que chains analizar
  
  // Trade Sizes (en USD)
  TRADE_SIZES_USD: [25, 50, 100, 250, 500, 1000],
};
```

### Cambiar Log Level

```bash
LOG_LEVEL=debug npm run bot:live
```

Niveles: `trace`, `debug`, `info`, `warn`, `error`

---

## 🔍 Solución de Problemas

### ❌ Error: "Private key not found"

```
Solución:
1. Verifica que VITE_ETH_PRIVATE_KEY esté en .env
2. Verifica que NO tenga comillas: `VITE_ETH_PRIVATE_KEY=0x1234...` (sin comillas)
3. Reinicia la terminal para que cargue el .env
```

### ❌ Error: "No workers initialized"

```
Solución:
1. Verifica que las RPCs funcionen
2. Intenta con `npm run bot:test` para debug
3. Verifica: curl https://arb1.arbitrum.io/rpc -d '{"jsonrpc":"2.0","method":"eth_blockNumber"}'
```

### ❌ Bot no encuentra oportunidades

```
Posibles razones:
1. Los spreads son muy pequeños (< $0.50)
2. El MIN_PROFIT_USD es muy alto - baja a 0.25
3. Las pools no tienen liquidez - cambia fee tiers
```

### ❌ Transacciones fallan ("amountOutMinimum")

```
Solución:
1. Sube MAX_SLIPPAGE_BPS: 50 → 75 (0.75%)
2. Incrementa DEADLINE_SECONDS: 60 → 90
3. Verifica el precio del gas en cada chain
```

---

## 📈 Optimizaciones para Máxima Rentabilidad

### 1. Aumentar Velocidad de Escaneo
```typescript
TICK_MS: 300,        // Cada 300ms en lugar de 700ms
DECISION_MS: 3000,   // Cambiar chain cada 3s
```

### 2. Ajustar Tamaños de Trade
```typescript
// Más pequeños = más oportunidades pero menos profit
TRADE_SIZES_USD: [10, 25, 50, 100],

// O más grandes = menos oportunidades pero más profit
TRADE_SIZES_USD: [100, 250, 500, 1000, 2500],
```

### 3. Usar Solo Chains con Mejores Spreads

```typescript
// Si Optimism tiene muchas oportunidades:
CHAINS: ["optimism", "base", "arbitrum"],

// El AI las rotará automáticamente
```

### 4. Bajar Min Profit en Horas con Bajo Gas

```typescript
// En horarios pico de uso:
MIN_PROFIT_USD: 0.25,  // Más agresivo

// En horas valle:
MIN_PROFIT_USD: 1.00,  // Esperar lo mejor
```

---

## 🎯 Métricas Clave a Monitorear

| Métrica | Objetivo | Acción |
|---------|----------|--------|
| **Win Rate** | >60% | Muy bien, dejar así |
| **Net Profit USD** | >$5/min | Aumentar TRADE_SIZES o bajar MIN_PROFIT |
| **Latency** | <500ms | Acercarse a RPC o cambiar |
| **Gas Cost %** | <30% del profit | Normal en L2s |
| **Opportunities Found** | >10 por scan | Chain tiene liquidez |

---

## 🔐 Seguridad

### ✅ Medidas Implementadas

- ✅ No guarda private key en memoria más de lo necesario
- ✅ Todas las transacciones son simuladas primero (eth_call)
- ✅ Slippage máximo limitado (0.5%)
- ✅ Timeout en todas las transacciones
- ✅ Pausable en cualquier momento

### ⚠️ Recomendaciones

1. **Usa billetera dedicada** - No mezcles con fondos principales
2. **Comienza pequeño** - Prueba con $100-500 primero
3. **Monitorea activamente** - No dejes corriendo sin vigilar
4. **Haz backup de .env** - Guarda tu private key en lugar seguro
5. **Retira ganancias regularmente** - No dejes acumular en la wallet

---

## 📞 Soporte

Si tienes problemas:

1. Revisa los logs: Busca `[ERROR]` o `[FATAL]`
2. Activa debug: `LOG_LEVEL=debug npm run bot:live`
3. Prueba RPC directamente:
   ```bash
   curl https://arb1.arbitrum.io/rpc -X POST \
     -d '{"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":1}' \
     -H "Content-Type: application/json"
   ```
4. Verifica balances: El bot imprime al inicio de cada run

---

## 📚 Más Información

- **Uniswap V3**: Documentación en https://docs.uniswap.org/
- **Arbitraje**: Guía en https://docs.arbitrum.io/
- **Gas Optimization**: https://www.alchemy.com/layer2/

---

**Última actualización**: Enero 2026  
**Versión**: 1.0.0  
**Status**: Listo para Producción ✅



## 📋 Resumen Ejecutivo

Este bot ejecuta arbitraje DEX-to-DEX automático en las mejores L2s de Ethereum:
- **Base** - 0.01 gwei promedio
- **Arbitrum** - 0.01 gwei promedio  
- **Optimism** - 0.001 gwei promedio

**Características:**
- ✅ IA con Thompson Sampling para rotación de chains
- ✅ Análisis de múltiples fee tiers (0.01%, 0.05%, 0.3%, 1%)
- ✅ Integración Uniswap V3 + SushiSwap
- ✅ Gas-positivo (solo trades con ganancia neta)
- ✅ Frontend en tiempo real en módulo DeFi Protocols
- ✅ Control start/stop desde UI

---

## 🚀 Pasos para Ejecutar en REAL

### 1️⃣ Verificar Configuración `.env`

Asegúrate que tu archivo `.env` tenga:

```env
# REQUIRED - Tus credenciales
VITE_ETH_PRIVATE_KEY=0x...tu_private_key_aqui...
VITE_ETH_WALLET_ADDRESS=0x...tu_wallet_address...

# OPTIONAL - RPCs (usa los defaults si no los defines)
RPC_BASE=https://base-mainnet.g.alchemy.com/v2/tu_api_key
RPC_ARBITRUM=https://arb1.arbitrum.io/rpc
RPC_OPTIMISM=https://mainnet.optimism.io

# OPTIONAL - Modo
DRY_RUN=false  # IMPORTANTE: false para modo LIVE
```

### 2️⃣ Verificar Fondos en las Chains

El bot necesita ETH en cada chain para:
- Gas de transacciones
- Capital para arbitraje

Mínimo recomendado: **0.01 ETH por chain**

Para verificar balances:
```bash
npm run bot:test  # Primero en DRY_RUN para ver balances
```

### 3️⃣ OPCIÓN A: Ejecutar Bot + API + Frontend (Recomendado)

```bash
# Terminal 1: Iniciar todo (bot + API + frontend)
npm run bot:live
```

Esto inicia:
- ✅ API Server (puerto 3100) - comunicación con frontend
- ✅ Bot de Arbitraje (LIVE MODE)
- ✅ Frontend Vite (puerto 4000)

Luego abre en el navegador:
```
http://localhost:4000
```

Ve a: **DeFi Protocols** → **Multi-Chain Arbitrage Bot** → Presiona **Iniciar Bot**

### 4️⃣ OPCIÓN B: Ejecutar Solo el Bot (Línea de Comandos)

```bash
# Ejecutar bot directamente
node src/modules/DeFiProtocols/multichain-arb/scripts/liveArbBot.js
```

O con npm:
```bash
npm run bot:live  # En terminal
```

### 5️⃣ OPCIÓN C: Ejecutar en Modo Prueba (DRY RUN)

Para probar sin riesgo real:

```bash
npm run bot:test  # Modo simulación
```

---

## 📊 Monitoreo en Tiempo Real

### Desde el Frontend (Recomendado)

1. Abre http://localhost:4000
2. Ve a **DeFi Protocols**
3. Selecciona **Multi-Chain Arbitrage Bot**
4. Presiona **Iniciar Bot** (cambia DRY RUN si quieres real)
5. Observa en tiempo real:
   - 📊 **Overview**: Stats generales (profit, ticks, win rate)
   - ⛓️ **Chains**: Balances y estado de cada chain
   - 🧠 **AI Bandit**: Thompson Sampling stats
   - 📜 **Trades**: Historial de operaciones ejecutadas

### Desde Terminal

Verás output como:

```
📍 Iteration 1/5
   🧠 AI selected: Base
   🔍 Scanning for arbitrage...
   ✅ Found 3 opportunities!
   📈 Best: ETH->0.05%->USDC->0.3%->ETH | Profit: $0.1234 (0.5%)
   💰 Profit threshold met, executing trade...
   🚀 EXECUTING TRADE on Base
   🔄 Swap 1: WETH -> USDC...
   ✅ Swap 1 complete: 0x...
   🔄 Swap 2: USDC -> WETH...
   ✅ Swap 2 complete: 0x...
   📊 TRADE RESULT:
   Profit: 0.00123 ETH (~$3.94)
```

---

## ⚙️ Configuración Avanzada

### Modificar Parámetros del Bot

Abre `src/modules/DeFiProtocols/multichain-arb/src/config.ts`:

```typescript
export const CFG = {
  // Timing
  TICK_MS: 700,                    // ms entre scans (más bajo = más rápido)
  DECISION_MS: 5000,               // ms entre cambios de chain por IA
  
  // Trading
  MIN_PROFIT_USD: 0.50,            // Mínimo profit en USD para ejecutar
  GAS_MULT: 1.7,                   // Multiplicador de gas para seguridad
  MAX_SLIPPAGE_BPS: 50,            // 0.5% slippage máximo
  DEADLINE_SECONDS: 60,            // Timeout para transacciones
  
  // Chains Habilitados
  CHAINS: ["base", "arbitrum", "optimism"],  // Que chains analizar
  
  // Trade Sizes (en USD)
  TRADE_SIZES_USD: [25, 50, 100, 250, 500, 1000],
};
```

### Cambiar Log Level

```bash
LOG_LEVEL=debug npm run bot:live
```

Niveles: `trace`, `debug`, `info`, `warn`, `error`

---

## 🔍 Solución de Problemas

### ❌ Error: "Private key not found"

```
Solución:
1. Verifica que VITE_ETH_PRIVATE_KEY esté en .env
2. Verifica que NO tenga comillas: `VITE_ETH_PRIVATE_KEY=0x1234...` (sin comillas)
3. Reinicia la terminal para que cargue el .env
```

### ❌ Error: "No workers initialized"

```
Solución:
1. Verifica que las RPCs funcionen
2. Intenta con `npm run bot:test` para debug
3. Verifica: curl https://arb1.arbitrum.io/rpc -d '{"jsonrpc":"2.0","method":"eth_blockNumber"}'
```

### ❌ Bot no encuentra oportunidades

```
Posibles razones:
1. Los spreads son muy pequeños (< $0.50)
2. El MIN_PROFIT_USD es muy alto - baja a 0.25
3. Las pools no tienen liquidez - cambia fee tiers
```

### ❌ Transacciones fallan ("amountOutMinimum")

```
Solución:
1. Sube MAX_SLIPPAGE_BPS: 50 → 75 (0.75%)
2. Incrementa DEADLINE_SECONDS: 60 → 90
3. Verifica el precio del gas en cada chain
```

---

## 📈 Optimizaciones para Máxima Rentabilidad

### 1. Aumentar Velocidad de Escaneo
```typescript
TICK_MS: 300,        // Cada 300ms en lugar de 700ms
DECISION_MS: 3000,   // Cambiar chain cada 3s
```

### 2. Ajustar Tamaños de Trade
```typescript
// Más pequeños = más oportunidades pero menos profit
TRADE_SIZES_USD: [10, 25, 50, 100],

// O más grandes = menos oportunidades pero más profit
TRADE_SIZES_USD: [100, 250, 500, 1000, 2500],
```

### 3. Usar Solo Chains con Mejores Spreads

```typescript
// Si Optimism tiene muchas oportunidades:
CHAINS: ["optimism", "base", "arbitrum"],

// El AI las rotará automáticamente
```

### 4. Bajar Min Profit en Horas con Bajo Gas

```typescript
// En horarios pico de uso:
MIN_PROFIT_USD: 0.25,  // Más agresivo

// En horas valle:
MIN_PROFIT_USD: 1.00,  // Esperar lo mejor
```

---

## 🎯 Métricas Clave a Monitorear

| Métrica | Objetivo | Acción |
|---------|----------|--------|
| **Win Rate** | >60% | Muy bien, dejar así |
| **Net Profit USD** | >$5/min | Aumentar TRADE_SIZES o bajar MIN_PROFIT |
| **Latency** | <500ms | Acercarse a RPC o cambiar |
| **Gas Cost %** | <30% del profit | Normal en L2s |
| **Opportunities Found** | >10 por scan | Chain tiene liquidez |

---

## 🔐 Seguridad

### ✅ Medidas Implementadas

- ✅ No guarda private key en memoria más de lo necesario
- ✅ Todas las transacciones son simuladas primero (eth_call)
- ✅ Slippage máximo limitado (0.5%)
- ✅ Timeout en todas las transacciones
- ✅ Pausable en cualquier momento

### ⚠️ Recomendaciones

1. **Usa billetera dedicada** - No mezcles con fondos principales
2. **Comienza pequeño** - Prueba con $100-500 primero
3. **Monitorea activamente** - No dejes corriendo sin vigilar
4. **Haz backup de .env** - Guarda tu private key en lugar seguro
5. **Retira ganancias regularmente** - No dejes acumular en la wallet

---

## 📞 Soporte

Si tienes problemas:

1. Revisa los logs: Busca `[ERROR]` o `[FATAL]`
2. Activa debug: `LOG_LEVEL=debug npm run bot:live`
3. Prueba RPC directamente:
   ```bash
   curl https://arb1.arbitrum.io/rpc -X POST \
     -d '{"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":1}' \
     -H "Content-Type: application/json"
   ```
4. Verifica balances: El bot imprime al inicio de cada run

---

## 📚 Más Información

- **Uniswap V3**: Documentación en https://docs.uniswap.org/
- **Arbitraje**: Guía en https://docs.arbitrum.io/
- **Gas Optimization**: https://www.alchemy.com/layer2/

---

**Última actualización**: Enero 2026  
**Versión**: 1.0.0  
**Status**: Listo para Producción ✅



## 📋 Resumen Ejecutivo

Este bot ejecuta arbitraje DEX-to-DEX automático en las mejores L2s de Ethereum:
- **Base** - 0.01 gwei promedio
- **Arbitrum** - 0.01 gwei promedio  
- **Optimism** - 0.001 gwei promedio

**Características:**
- ✅ IA con Thompson Sampling para rotación de chains
- ✅ Análisis de múltiples fee tiers (0.01%, 0.05%, 0.3%, 1%)
- ✅ Integración Uniswap V3 + SushiSwap
- ✅ Gas-positivo (solo trades con ganancia neta)
- ✅ Frontend en tiempo real en módulo DeFi Protocols
- ✅ Control start/stop desde UI

---

## 🚀 Pasos para Ejecutar en REAL

### 1️⃣ Verificar Configuración `.env`

Asegúrate que tu archivo `.env` tenga:

```env
# REQUIRED - Tus credenciales
VITE_ETH_PRIVATE_KEY=0x...tu_private_key_aqui...
VITE_ETH_WALLET_ADDRESS=0x...tu_wallet_address...

# OPTIONAL - RPCs (usa los defaults si no los defines)
RPC_BASE=https://base-mainnet.g.alchemy.com/v2/tu_api_key
RPC_ARBITRUM=https://arb1.arbitrum.io/rpc
RPC_OPTIMISM=https://mainnet.optimism.io

# OPTIONAL - Modo
DRY_RUN=false  # IMPORTANTE: false para modo LIVE
```

### 2️⃣ Verificar Fondos en las Chains

El bot necesita ETH en cada chain para:
- Gas de transacciones
- Capital para arbitraje

Mínimo recomendado: **0.01 ETH por chain**

Para verificar balances:
```bash
npm run bot:test  # Primero en DRY_RUN para ver balances
```

### 3️⃣ OPCIÓN A: Ejecutar Bot + API + Frontend (Recomendado)

```bash
# Terminal 1: Iniciar todo (bot + API + frontend)
npm run bot:live
```

Esto inicia:
- ✅ API Server (puerto 3100) - comunicación con frontend
- ✅ Bot de Arbitraje (LIVE MODE)
- ✅ Frontend Vite (puerto 4000)

Luego abre en el navegador:
```
http://localhost:4000
```

Ve a: **DeFi Protocols** → **Multi-Chain Arbitrage Bot** → Presiona **Iniciar Bot**

### 4️⃣ OPCIÓN B: Ejecutar Solo el Bot (Línea de Comandos)

```bash
# Ejecutar bot directamente
node src/modules/DeFiProtocols/multichain-arb/scripts/liveArbBot.js
```

O con npm:
```bash
npm run bot:live  # En terminal
```

### 5️⃣ OPCIÓN C: Ejecutar en Modo Prueba (DRY RUN)

Para probar sin riesgo real:

```bash
npm run bot:test  # Modo simulación
```

---

## 📊 Monitoreo en Tiempo Real

### Desde el Frontend (Recomendado)

1. Abre http://localhost:4000
2. Ve a **DeFi Protocols**
3. Selecciona **Multi-Chain Arbitrage Bot**
4. Presiona **Iniciar Bot** (cambia DRY RUN si quieres real)
5. Observa en tiempo real:
   - 📊 **Overview**: Stats generales (profit, ticks, win rate)
   - ⛓️ **Chains**: Balances y estado de cada chain
   - 🧠 **AI Bandit**: Thompson Sampling stats
   - 📜 **Trades**: Historial de operaciones ejecutadas

### Desde Terminal

Verás output como:

```
📍 Iteration 1/5
   🧠 AI selected: Base
   🔍 Scanning for arbitrage...
   ✅ Found 3 opportunities!
   📈 Best: ETH->0.05%->USDC->0.3%->ETH | Profit: $0.1234 (0.5%)
   💰 Profit threshold met, executing trade...
   🚀 EXECUTING TRADE on Base
   🔄 Swap 1: WETH -> USDC...
   ✅ Swap 1 complete: 0x...
   🔄 Swap 2: USDC -> WETH...
   ✅ Swap 2 complete: 0x...
   📊 TRADE RESULT:
   Profit: 0.00123 ETH (~$3.94)
```

---

## ⚙️ Configuración Avanzada

### Modificar Parámetros del Bot

Abre `src/modules/DeFiProtocols/multichain-arb/src/config.ts`:

```typescript
export const CFG = {
  // Timing
  TICK_MS: 700,                    // ms entre scans (más bajo = más rápido)
  DECISION_MS: 5000,               // ms entre cambios de chain por IA
  
  // Trading
  MIN_PROFIT_USD: 0.50,            // Mínimo profit en USD para ejecutar
  GAS_MULT: 1.7,                   // Multiplicador de gas para seguridad
  MAX_SLIPPAGE_BPS: 50,            // 0.5% slippage máximo
  DEADLINE_SECONDS: 60,            // Timeout para transacciones
  
  // Chains Habilitados
  CHAINS: ["base", "arbitrum", "optimism"],  // Que chains analizar
  
  // Trade Sizes (en USD)
  TRADE_SIZES_USD: [25, 50, 100, 250, 500, 1000],
};
```

### Cambiar Log Level

```bash
LOG_LEVEL=debug npm run bot:live
```

Niveles: `trace`, `debug`, `info`, `warn`, `error`

---

## 🔍 Solución de Problemas

### ❌ Error: "Private key not found"

```
Solución:
1. Verifica que VITE_ETH_PRIVATE_KEY esté en .env
2. Verifica que NO tenga comillas: `VITE_ETH_PRIVATE_KEY=0x1234...` (sin comillas)
3. Reinicia la terminal para que cargue el .env
```

### ❌ Error: "No workers initialized"

```
Solución:
1. Verifica que las RPCs funcionen
2. Intenta con `npm run bot:test` para debug
3. Verifica: curl https://arb1.arbitrum.io/rpc -d '{"jsonrpc":"2.0","method":"eth_blockNumber"}'
```

### ❌ Bot no encuentra oportunidades

```
Posibles razones:
1. Los spreads son muy pequeños (< $0.50)
2. El MIN_PROFIT_USD es muy alto - baja a 0.25
3. Las pools no tienen liquidez - cambia fee tiers
```

### ❌ Transacciones fallan ("amountOutMinimum")

```
Solución:
1. Sube MAX_SLIPPAGE_BPS: 50 → 75 (0.75%)
2. Incrementa DEADLINE_SECONDS: 60 → 90
3. Verifica el precio del gas en cada chain
```

---

## 📈 Optimizaciones para Máxima Rentabilidad

### 1. Aumentar Velocidad de Escaneo
```typescript
TICK_MS: 300,        // Cada 300ms en lugar de 700ms
DECISION_MS: 3000,   // Cambiar chain cada 3s
```

### 2. Ajustar Tamaños de Trade
```typescript
// Más pequeños = más oportunidades pero menos profit
TRADE_SIZES_USD: [10, 25, 50, 100],

// O más grandes = menos oportunidades pero más profit
TRADE_SIZES_USD: [100, 250, 500, 1000, 2500],
```

### 3. Usar Solo Chains con Mejores Spreads

```typescript
// Si Optimism tiene muchas oportunidades:
CHAINS: ["optimism", "base", "arbitrum"],

// El AI las rotará automáticamente
```

### 4. Bajar Min Profit en Horas con Bajo Gas

```typescript
// En horarios pico de uso:
MIN_PROFIT_USD: 0.25,  // Más agresivo

// En horas valle:
MIN_PROFIT_USD: 1.00,  // Esperar lo mejor
```

---

## 🎯 Métricas Clave a Monitorear

| Métrica | Objetivo | Acción |
|---------|----------|--------|
| **Win Rate** | >60% | Muy bien, dejar así |
| **Net Profit USD** | >$5/min | Aumentar TRADE_SIZES o bajar MIN_PROFIT |
| **Latency** | <500ms | Acercarse a RPC o cambiar |
| **Gas Cost %** | <30% del profit | Normal en L2s |
| **Opportunities Found** | >10 por scan | Chain tiene liquidez |

---

## 🔐 Seguridad

### ✅ Medidas Implementadas

- ✅ No guarda private key en memoria más de lo necesario
- ✅ Todas las transacciones son simuladas primero (eth_call)
- ✅ Slippage máximo limitado (0.5%)
- ✅ Timeout en todas las transacciones
- ✅ Pausable en cualquier momento

### ⚠️ Recomendaciones

1. **Usa billetera dedicada** - No mezcles con fondos principales
2. **Comienza pequeño** - Prueba con $100-500 primero
3. **Monitorea activamente** - No dejes corriendo sin vigilar
4. **Haz backup de .env** - Guarda tu private key en lugar seguro
5. **Retira ganancias regularmente** - No dejes acumular en la wallet

---

## 📞 Soporte

Si tienes problemas:

1. Revisa los logs: Busca `[ERROR]` o `[FATAL]`
2. Activa debug: `LOG_LEVEL=debug npm run bot:live`
3. Prueba RPC directamente:
   ```bash
   curl https://arb1.arbitrum.io/rpc -X POST \
     -d '{"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":1}' \
     -H "Content-Type: application/json"
   ```
4. Verifica balances: El bot imprime al inicio de cada run

---

## 📚 Más Información

- **Uniswap V3**: Documentación en https://docs.uniswap.org/
- **Arbitraje**: Guía en https://docs.arbitrum.io/
- **Gas Optimization**: https://www.alchemy.com/layer2/

---

**Última actualización**: Enero 2026  
**Versión**: 1.0.0  
**Status**: Listo para Producción ✅





