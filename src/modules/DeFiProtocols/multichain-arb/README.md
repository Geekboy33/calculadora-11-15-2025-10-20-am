# 🤖 Multi-Chain Micro Arbitrage Bot

## Sistema de Arbitraje Multi-Cadena con IA

Un bot de arbitraje profesional que opera en múltiples cadenas L2 (Base, Arbitrum, Optimism, Polygon) utilizando inteligencia artificial para optimizar la selección de cadenas.

---

## 📋 Características

### ✅ Implementado (Lo que hice yo)

- **🧠 AI Bandit (Thompson Sampling)** - Algoritmo de aprendizaje que decide en qué cadena operar
- **📊 Base de Datos SQLite** - Almacenamiento de métricas y estadísticas
- **🔮 Oracle Chainlink** - Conversión precisa de gas a USD
- **💱 Integración Uniswap V3** - Quoter y Router para swaps
- **🔄 Simulador** - Validación de trades antes de ejecución
- **⚡ Worker Multi-Cadena** - Ejecutores independientes por cadena
- **🎮 Controller Principal** - Orquestación con rotación IA
- **📜 Contrato ArbExecutor** - Ejecución atómica de arbitrajes
- **🛠️ Configuración Completa** - Variables de entorno y tipos TypeScript

### ⏳ Lo que TÚ debes hacer

1. **Configurar RPCs privados** (Alchemy/Infura/propios)
2. **Compilar y desplegar ArbExecutor.sol** en cada cadena
3. **Fondear la wallet** con tokens estables (USDC) y gas (ETH/MATIC)
4. **Ajustar rutas** según liquidez actual del mercado
5. **Monitorear y ajustar** parámetros de ganancia mínima

---

## 🏗️ Arquitectura

```
┌─────────────────────────────────────────────────────────────────┐
│                     CONTROLLER (AI Rotator)                      │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  Thompson Sampling Bandit                                │   │
│  │  • Aprende qué cadena es más rentable                   │   │
│  │  • Rota automáticamente cada DECISION_MS                │   │
│  └─────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
                              │
        ┌─────────────────────┼─────────────────────┐
        ▼                     ▼                     ▼
┌───────────────┐    ┌───────────────┐    ┌───────────────┐
│  WORKER BASE  │    │ WORKER ARBITRUM│   │ WORKER OPTIMISM│
├───────────────┤    ├───────────────┤    ├───────────────┤
│ • Quote       │    │ • Quote       │    │ • Quote       │
│ • Simulate    │    │ • Simulate    │    │ • Simulate    │
│ • Gate (gas+) │    │ • Gate (gas+) │    │ • Gate (gas+) │
│ • Execute     │    │ • Execute     │    │ • Execute     │
└───────────────┘    └───────────────┘    └───────────────┘
        │                     │                     │
        ▼                     ▼                     ▼
┌───────────────┐    ┌───────────────┐    ┌───────────────┐
│ Chainlink     │    │ Chainlink     │    │ Chainlink     │
│ ETH/USD       │    │ ETH/USD       │    │ ETH/USD       │
└───────────────┘    └───────────────┘    └───────────────┘
```

---

## 📁 Estructura de Archivos

```
multichain-arb/
├── package.json
├── tsconfig.json
├── README.md
├── contracts/
│   └── ArbExecutor.sol          # Contrato de ejecución atómica
├── scripts/
│   └── deploy.ts                # Script de despliegue
└── src/
    ├── index.ts                 # Controller principal
    ├── config.ts                # Configuración y variables
    ├── logger.ts                # Sistema de logging
    ├── db.ts                    # Base de datos SQLite
    ├── ai/
    │   └── bandit.ts            # IA Thompson Sampling
    ├── oracle/
    │   ├── chainlink.ts         # Integración Chainlink
    │   └── price.ts             # Utilidades de precio
    ├── dex/
    │   ├── univ3.ts             # Integración Uniswap V3
    │   └── routes.ts            # Configuración de rutas
    └── worker/
        ├── worker.ts            # Worker por cadena
        ├── strategy.ts          # Estrategia de búsqueda
        ├── simulator.ts         # Simulador de trades
        └── executor.ts          # Ejecutor de transacciones
```

---

## 🚀 Instalación

### 1. Instalar dependencias

```bash
cd src/modules/DeFiProtocols/multichain-arb
npm install
```

### 2. Configurar variables de entorno

Crea un archivo `.env` basado en `.env.example`:

```env
# Wallet
PRIVATE_KEY=0x...

# Timing
TICK_MS=700
DECISION_MS=5000

# Trading
MIN_PROFIT_USD=0.50
GAS_MULT=1.7

# Chains
CHAINS=base,arbitrum,optimism,polygon

# RPCs (usa tus propios endpoints)
BASE_RPC_READ=https://...
BASE_RPC_SIM=https://...
BASE_RPC_SEND=https://...
BASE_RPC_WS=wss://...

ARB_RPC_READ=https://...
# ... etc
```

### 3. Compilar el contrato

```bash
# Instalar Hardhat si no lo tienes
npm install --save-dev hardhat @nomicfoundation/hardhat-toolbox

# Compilar
npx hardhat compile
```

### 4. Desplegar el contrato

```bash
npx tsx scripts/deploy.ts base arbitrum optimism polygon
```

### 5. Ejecutar el bot

```bash
# Desarrollo (con hot reload)
npm run dev

# Producción
npm run build
npm start
```

---

## ⚙️ Configuración

### Variables de Entorno

| Variable | Descripción | Default |
|----------|-------------|---------|
| `PRIVATE_KEY` | Clave privada de la wallet | (requerido) |
| `TICK_MS` | Intervalo entre scans (ms) | 700 |
| `DECISION_MS` | Intervalo de rotación IA (ms) | 5000 |
| `MIN_PROFIT_USD` | Ganancia mínima en USD | 0.50 |
| `GAS_MULT` | Multiplicador de gas mínimo | 1.7 |
| `MAX_SLIPPAGE_BPS` | Slippage máximo (bps) | 10 |
| `CHAINS` | Cadenas habilitadas | base,arbitrum |
| `DRY_RUN` | Modo simulación | false |

### Rutas de Arbitraje

Edita `src/dex/routes.ts` para agregar/modificar rutas:

```typescript
{
  name: "USDC→WETH→USDT (500/500)",
  tokenIn: TOKENS.arbitrum.USDC,
  tokenMid: TOKENS.arbitrum.WETH,
  tokenOut: TOKENS.arbitrum.USDT,
  fee1: FEE_TIERS.LOW,
  fee2: FEE_TIERS.LOW,
  quoterV2: DEX_ADDRESSES.arbitrum.quoterV2,
  router: DEX_ADDRESSES.arbitrum.swapRouter,
  stableDecimals: 6
}
```

---

## 🧠 IA: Thompson Sampling Bandit

El bot usa un algoritmo Multi-Armed Bandit con Thompson Sampling para decidir en qué cadena operar:

### Cómo funciona

1. **Cada cadena es un "brazo"** con parámetros α (éxitos) y β (fracasos)
2. **Antes de cada decisión**, se muestrea de una distribución Beta(α, β)
3. **Se elige la cadena** con el valor muestreado más alto
4. **Después de cada trade**, se actualiza α o β según el resultado

### Ventajas

- ✅ Balance automático entre exploración y explotación
- ✅ Aprende de la experiencia real
- ✅ Se adapta a cambios en el mercado
- ✅ No requiere datos históricos para empezar

---

## 📊 Métricas y Estadísticas

El bot almacena métricas en SQLite:

```sql
-- Métricas por operación
SELECT * FROM chain_metrics ORDER BY ts DESC LIMIT 100;

-- Estadísticas por cadena
SELECT 
  chain,
  COUNT(*) as trades,
  SUM(profit_usd) as total_profit,
  AVG(latency_ms) as avg_latency
FROM chain_metrics
GROUP BY chain;

-- Estado del Bandit
SELECT * FROM bandit_state;
```

---

## 🔧 Lo que TÚ debes configurar

### 1. RPCs Privados

Los RPCs públicos son lentos y tienen límites. Necesitas:

- **Alchemy** o **Infura** para cada cadena
- O **nodos propios** para latencia mínima

### 2. Desplegar Contratos

```bash
# Compilar
npx hardhat compile

# Desplegar (actualiza el bytecode en deploy.ts)
npx tsx scripts/deploy.ts base arbitrum
```

### 3. Fondear Wallet

Necesitas en cada cadena:
- **Gas**: ~0.01 ETH (o MATIC en Polygon)
- **Capital**: USDC/USDT para operar (mínimo $100 recomendado)

### 4. Aprobar Tokens

El contrato ArbExecutor necesita aprobación para gastar tus tokens:

```javascript
// Ejemplo con ethers.js
const usdc = new Contract(USDC_ADDRESS, ERC20_ABI, signer);
await usdc.approve(EXECUTOR_ADDRESS, ethers.MaxUint256);
```

### 5. Ajustar Parámetros

Monitorea y ajusta según resultados:
- `MIN_PROFIT_USD`: Aumentar si hay muchos trades fallidos
- `GAS_MULT`: Aumentar en períodos de alta volatilidad de gas
- `TICK_MS`: Reducir para más velocidad (más consumo de RPC)

---

## ⚠️ Consideraciones Importantes

### Seguridad

- 🔐 **NUNCA** compartas tu `PRIVATE_KEY`
- 🔐 Usa una wallet dedicada para el bot
- 🔐 Empieza con capital pequeño

### Riesgos

- 💸 **Pérdida de gas** si los trades fallan
- 💸 **Slippage** si el mercado se mueve rápido
- 💸 **Front-running** por MEV bots

### Optimizaciones Futuras

- [ ] Flashbots/MEV protection
- [ ] WebSocket para actualizaciones en tiempo real
- [ ] Multicall para reducir latencia
- [ ] Más DEXs (Curve, Balancer, SushiSwap)

---

## 📞 Soporte

Para agregar nuevas cadenas o DEXs, modifica:
1. `config.ts` - Agregar configuración de la cadena
2. `routes.ts` - Agregar direcciones de tokens y DEX
3. `chainlink.ts` - Agregar feed de precio

---

## 📄 Licencia

MIT License - Uso bajo tu propio riesgo.



## Sistema de Arbitraje Multi-Cadena con IA

Un bot de arbitraje profesional que opera en múltiples cadenas L2 (Base, Arbitrum, Optimism, Polygon) utilizando inteligencia artificial para optimizar la selección de cadenas.

---

## 📋 Características

### ✅ Implementado (Lo que hice yo)

- **🧠 AI Bandit (Thompson Sampling)** - Algoritmo de aprendizaje que decide en qué cadena operar
- **📊 Base de Datos SQLite** - Almacenamiento de métricas y estadísticas
- **🔮 Oracle Chainlink** - Conversión precisa de gas a USD
- **💱 Integración Uniswap V3** - Quoter y Router para swaps
- **🔄 Simulador** - Validación de trades antes de ejecución
- **⚡ Worker Multi-Cadena** - Ejecutores independientes por cadena
- **🎮 Controller Principal** - Orquestación con rotación IA
- **📜 Contrato ArbExecutor** - Ejecución atómica de arbitrajes
- **🛠️ Configuración Completa** - Variables de entorno y tipos TypeScript

### ⏳ Lo que TÚ debes hacer

1. **Configurar RPCs privados** (Alchemy/Infura/propios)
2. **Compilar y desplegar ArbExecutor.sol** en cada cadena
3. **Fondear la wallet** con tokens estables (USDC) y gas (ETH/MATIC)
4. **Ajustar rutas** según liquidez actual del mercado
5. **Monitorear y ajustar** parámetros de ganancia mínima

---

## 🏗️ Arquitectura

```
┌─────────────────────────────────────────────────────────────────┐
│                     CONTROLLER (AI Rotator)                      │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  Thompson Sampling Bandit                                │   │
│  │  • Aprende qué cadena es más rentable                   │   │
│  │  • Rota automáticamente cada DECISION_MS                │   │
│  └─────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
                              │
        ┌─────────────────────┼─────────────────────┐
        ▼                     ▼                     ▼
┌───────────────┐    ┌───────────────┐    ┌───────────────┐
│  WORKER BASE  │    │ WORKER ARBITRUM│   │ WORKER OPTIMISM│
├───────────────┤    ├───────────────┤    ├───────────────┤
│ • Quote       │    │ • Quote       │    │ • Quote       │
│ • Simulate    │    │ • Simulate    │    │ • Simulate    │
│ • Gate (gas+) │    │ • Gate (gas+) │    │ • Gate (gas+) │
│ • Execute     │    │ • Execute     │    │ • Execute     │
└───────────────┘    └───────────────┘    └───────────────┘
        │                     │                     │
        ▼                     ▼                     ▼
┌───────────────┐    ┌───────────────┐    ┌───────────────┐
│ Chainlink     │    │ Chainlink     │    │ Chainlink     │
│ ETH/USD       │    │ ETH/USD       │    │ ETH/USD       │
└───────────────┘    └───────────────┘    └───────────────┘
```

---

## 📁 Estructura de Archivos

```
multichain-arb/
├── package.json
├── tsconfig.json
├── README.md
├── contracts/
│   └── ArbExecutor.sol          # Contrato de ejecución atómica
├── scripts/
│   └── deploy.ts                # Script de despliegue
└── src/
    ├── index.ts                 # Controller principal
    ├── config.ts                # Configuración y variables
    ├── logger.ts                # Sistema de logging
    ├── db.ts                    # Base de datos SQLite
    ├── ai/
    │   └── bandit.ts            # IA Thompson Sampling
    ├── oracle/
    │   ├── chainlink.ts         # Integración Chainlink
    │   └── price.ts             # Utilidades de precio
    ├── dex/
    │   ├── univ3.ts             # Integración Uniswap V3
    │   └── routes.ts            # Configuración de rutas
    └── worker/
        ├── worker.ts            # Worker por cadena
        ├── strategy.ts          # Estrategia de búsqueda
        ├── simulator.ts         # Simulador de trades
        └── executor.ts          # Ejecutor de transacciones
```

---

## 🚀 Instalación

### 1. Instalar dependencias

```bash
cd src/modules/DeFiProtocols/multichain-arb
npm install
```

### 2. Configurar variables de entorno

Crea un archivo `.env` basado en `.env.example`:

```env
# Wallet
PRIVATE_KEY=0x...

# Timing
TICK_MS=700
DECISION_MS=5000

# Trading
MIN_PROFIT_USD=0.50
GAS_MULT=1.7

# Chains
CHAINS=base,arbitrum,optimism,polygon

# RPCs (usa tus propios endpoints)
BASE_RPC_READ=https://...
BASE_RPC_SIM=https://...
BASE_RPC_SEND=https://...
BASE_RPC_WS=wss://...

ARB_RPC_READ=https://...
# ... etc
```

### 3. Compilar el contrato

```bash
# Instalar Hardhat si no lo tienes
npm install --save-dev hardhat @nomicfoundation/hardhat-toolbox

# Compilar
npx hardhat compile
```

### 4. Desplegar el contrato

```bash
npx tsx scripts/deploy.ts base arbitrum optimism polygon
```

### 5. Ejecutar el bot

```bash
# Desarrollo (con hot reload)
npm run dev

# Producción
npm run build
npm start
```

---

## ⚙️ Configuración

### Variables de Entorno

| Variable | Descripción | Default |
|----------|-------------|---------|
| `PRIVATE_KEY` | Clave privada de la wallet | (requerido) |
| `TICK_MS` | Intervalo entre scans (ms) | 700 |
| `DECISION_MS` | Intervalo de rotación IA (ms) | 5000 |
| `MIN_PROFIT_USD` | Ganancia mínima en USD | 0.50 |
| `GAS_MULT` | Multiplicador de gas mínimo | 1.7 |
| `MAX_SLIPPAGE_BPS` | Slippage máximo (bps) | 10 |
| `CHAINS` | Cadenas habilitadas | base,arbitrum |
| `DRY_RUN` | Modo simulación | false |

### Rutas de Arbitraje

Edita `src/dex/routes.ts` para agregar/modificar rutas:

```typescript
{
  name: "USDC→WETH→USDT (500/500)",
  tokenIn: TOKENS.arbitrum.USDC,
  tokenMid: TOKENS.arbitrum.WETH,
  tokenOut: TOKENS.arbitrum.USDT,
  fee1: FEE_TIERS.LOW,
  fee2: FEE_TIERS.LOW,
  quoterV2: DEX_ADDRESSES.arbitrum.quoterV2,
  router: DEX_ADDRESSES.arbitrum.swapRouter,
  stableDecimals: 6
}
```

---

## 🧠 IA: Thompson Sampling Bandit

El bot usa un algoritmo Multi-Armed Bandit con Thompson Sampling para decidir en qué cadena operar:

### Cómo funciona

1. **Cada cadena es un "brazo"** con parámetros α (éxitos) y β (fracasos)
2. **Antes de cada decisión**, se muestrea de una distribución Beta(α, β)
3. **Se elige la cadena** con el valor muestreado más alto
4. **Después de cada trade**, se actualiza α o β según el resultado

### Ventajas

- ✅ Balance automático entre exploración y explotación
- ✅ Aprende de la experiencia real
- ✅ Se adapta a cambios en el mercado
- ✅ No requiere datos históricos para empezar

---

## 📊 Métricas y Estadísticas

El bot almacena métricas en SQLite:

```sql
-- Métricas por operación
SELECT * FROM chain_metrics ORDER BY ts DESC LIMIT 100;

-- Estadísticas por cadena
SELECT 
  chain,
  COUNT(*) as trades,
  SUM(profit_usd) as total_profit,
  AVG(latency_ms) as avg_latency
FROM chain_metrics
GROUP BY chain;

-- Estado del Bandit
SELECT * FROM bandit_state;
```

---

## 🔧 Lo que TÚ debes configurar

### 1. RPCs Privados

Los RPCs públicos son lentos y tienen límites. Necesitas:

- **Alchemy** o **Infura** para cada cadena
- O **nodos propios** para latencia mínima

### 2. Desplegar Contratos

```bash
# Compilar
npx hardhat compile

# Desplegar (actualiza el bytecode en deploy.ts)
npx tsx scripts/deploy.ts base arbitrum
```

### 3. Fondear Wallet

Necesitas en cada cadena:
- **Gas**: ~0.01 ETH (o MATIC en Polygon)
- **Capital**: USDC/USDT para operar (mínimo $100 recomendado)

### 4. Aprobar Tokens

El contrato ArbExecutor necesita aprobación para gastar tus tokens:

```javascript
// Ejemplo con ethers.js
const usdc = new Contract(USDC_ADDRESS, ERC20_ABI, signer);
await usdc.approve(EXECUTOR_ADDRESS, ethers.MaxUint256);
```

### 5. Ajustar Parámetros

Monitorea y ajusta según resultados:
- `MIN_PROFIT_USD`: Aumentar si hay muchos trades fallidos
- `GAS_MULT`: Aumentar en períodos de alta volatilidad de gas
- `TICK_MS`: Reducir para más velocidad (más consumo de RPC)

---

## ⚠️ Consideraciones Importantes

### Seguridad

- 🔐 **NUNCA** compartas tu `PRIVATE_KEY`
- 🔐 Usa una wallet dedicada para el bot
- 🔐 Empieza con capital pequeño

### Riesgos

- 💸 **Pérdida de gas** si los trades fallan
- 💸 **Slippage** si el mercado se mueve rápido
- 💸 **Front-running** por MEV bots

### Optimizaciones Futuras

- [ ] Flashbots/MEV protection
- [ ] WebSocket para actualizaciones en tiempo real
- [ ] Multicall para reducir latencia
- [ ] Más DEXs (Curve, Balancer, SushiSwap)

---

## 📞 Soporte

Para agregar nuevas cadenas o DEXs, modifica:
1. `config.ts` - Agregar configuración de la cadena
2. `routes.ts` - Agregar direcciones de tokens y DEX
3. `chainlink.ts` - Agregar feed de precio

---

## 📄 Licencia

MIT License - Uso bajo tu propio riesgo.




## Sistema de Arbitraje Multi-Cadena con IA

Un bot de arbitraje profesional que opera en múltiples cadenas L2 (Base, Arbitrum, Optimism, Polygon) utilizando inteligencia artificial para optimizar la selección de cadenas.

---

## 📋 Características

### ✅ Implementado (Lo que hice yo)

- **🧠 AI Bandit (Thompson Sampling)** - Algoritmo de aprendizaje que decide en qué cadena operar
- **📊 Base de Datos SQLite** - Almacenamiento de métricas y estadísticas
- **🔮 Oracle Chainlink** - Conversión precisa de gas a USD
- **💱 Integración Uniswap V3** - Quoter y Router para swaps
- **🔄 Simulador** - Validación de trades antes de ejecución
- **⚡ Worker Multi-Cadena** - Ejecutores independientes por cadena
- **🎮 Controller Principal** - Orquestación con rotación IA
- **📜 Contrato ArbExecutor** - Ejecución atómica de arbitrajes
- **🛠️ Configuración Completa** - Variables de entorno y tipos TypeScript

### ⏳ Lo que TÚ debes hacer

1. **Configurar RPCs privados** (Alchemy/Infura/propios)
2. **Compilar y desplegar ArbExecutor.sol** en cada cadena
3. **Fondear la wallet** con tokens estables (USDC) y gas (ETH/MATIC)
4. **Ajustar rutas** según liquidez actual del mercado
5. **Monitorear y ajustar** parámetros de ganancia mínima

---

## 🏗️ Arquitectura

```
┌─────────────────────────────────────────────────────────────────┐
│                     CONTROLLER (AI Rotator)                      │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  Thompson Sampling Bandit                                │   │
│  │  • Aprende qué cadena es más rentable                   │   │
│  │  • Rota automáticamente cada DECISION_MS                │   │
│  └─────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
                              │
        ┌─────────────────────┼─────────────────────┐
        ▼                     ▼                     ▼
┌───────────────┐    ┌───────────────┐    ┌───────────────┐
│  WORKER BASE  │    │ WORKER ARBITRUM│   │ WORKER OPTIMISM│
├───────────────┤    ├───────────────┤    ├───────────────┤
│ • Quote       │    │ • Quote       │    │ • Quote       │
│ • Simulate    │    │ • Simulate    │    │ • Simulate    │
│ • Gate (gas+) │    │ • Gate (gas+) │    │ • Gate (gas+) │
│ • Execute     │    │ • Execute     │    │ • Execute     │
└───────────────┘    └───────────────┘    └───────────────┘
        │                     │                     │
        ▼                     ▼                     ▼
┌───────────────┐    ┌───────────────┐    ┌───────────────┐
│ Chainlink     │    │ Chainlink     │    │ Chainlink     │
│ ETH/USD       │    │ ETH/USD       │    │ ETH/USD       │
└───────────────┘    └───────────────┘    └───────────────┘
```

---

## 📁 Estructura de Archivos

```
multichain-arb/
├── package.json
├── tsconfig.json
├── README.md
├── contracts/
│   └── ArbExecutor.sol          # Contrato de ejecución atómica
├── scripts/
│   └── deploy.ts                # Script de despliegue
└── src/
    ├── index.ts                 # Controller principal
    ├── config.ts                # Configuración y variables
    ├── logger.ts                # Sistema de logging
    ├── db.ts                    # Base de datos SQLite
    ├── ai/
    │   └── bandit.ts            # IA Thompson Sampling
    ├── oracle/
    │   ├── chainlink.ts         # Integración Chainlink
    │   └── price.ts             # Utilidades de precio
    ├── dex/
    │   ├── univ3.ts             # Integración Uniswap V3
    │   └── routes.ts            # Configuración de rutas
    └── worker/
        ├── worker.ts            # Worker por cadena
        ├── strategy.ts          # Estrategia de búsqueda
        ├── simulator.ts         # Simulador de trades
        └── executor.ts          # Ejecutor de transacciones
```

---

## 🚀 Instalación

### 1. Instalar dependencias

```bash
cd src/modules/DeFiProtocols/multichain-arb
npm install
```

### 2. Configurar variables de entorno

Crea un archivo `.env` basado en `.env.example`:

```env
# Wallet
PRIVATE_KEY=0x...

# Timing
TICK_MS=700
DECISION_MS=5000

# Trading
MIN_PROFIT_USD=0.50
GAS_MULT=1.7

# Chains
CHAINS=base,arbitrum,optimism,polygon

# RPCs (usa tus propios endpoints)
BASE_RPC_READ=https://...
BASE_RPC_SIM=https://...
BASE_RPC_SEND=https://...
BASE_RPC_WS=wss://...

ARB_RPC_READ=https://...
# ... etc
```

### 3. Compilar el contrato

```bash
# Instalar Hardhat si no lo tienes
npm install --save-dev hardhat @nomicfoundation/hardhat-toolbox

# Compilar
npx hardhat compile
```

### 4. Desplegar el contrato

```bash
npx tsx scripts/deploy.ts base arbitrum optimism polygon
```

### 5. Ejecutar el bot

```bash
# Desarrollo (con hot reload)
npm run dev

# Producción
npm run build
npm start
```

---

## ⚙️ Configuración

### Variables de Entorno

| Variable | Descripción | Default |
|----------|-------------|---------|
| `PRIVATE_KEY` | Clave privada de la wallet | (requerido) |
| `TICK_MS` | Intervalo entre scans (ms) | 700 |
| `DECISION_MS` | Intervalo de rotación IA (ms) | 5000 |
| `MIN_PROFIT_USD` | Ganancia mínima en USD | 0.50 |
| `GAS_MULT` | Multiplicador de gas mínimo | 1.7 |
| `MAX_SLIPPAGE_BPS` | Slippage máximo (bps) | 10 |
| `CHAINS` | Cadenas habilitadas | base,arbitrum |
| `DRY_RUN` | Modo simulación | false |

### Rutas de Arbitraje

Edita `src/dex/routes.ts` para agregar/modificar rutas:

```typescript
{
  name: "USDC→WETH→USDT (500/500)",
  tokenIn: TOKENS.arbitrum.USDC,
  tokenMid: TOKENS.arbitrum.WETH,
  tokenOut: TOKENS.arbitrum.USDT,
  fee1: FEE_TIERS.LOW,
  fee2: FEE_TIERS.LOW,
  quoterV2: DEX_ADDRESSES.arbitrum.quoterV2,
  router: DEX_ADDRESSES.arbitrum.swapRouter,
  stableDecimals: 6
}
```

---

## 🧠 IA: Thompson Sampling Bandit

El bot usa un algoritmo Multi-Armed Bandit con Thompson Sampling para decidir en qué cadena operar:

### Cómo funciona

1. **Cada cadena es un "brazo"** con parámetros α (éxitos) y β (fracasos)
2. **Antes de cada decisión**, se muestrea de una distribución Beta(α, β)
3. **Se elige la cadena** con el valor muestreado más alto
4. **Después de cada trade**, se actualiza α o β según el resultado

### Ventajas

- ✅ Balance automático entre exploración y explotación
- ✅ Aprende de la experiencia real
- ✅ Se adapta a cambios en el mercado
- ✅ No requiere datos históricos para empezar

---

## 📊 Métricas y Estadísticas

El bot almacena métricas en SQLite:

```sql
-- Métricas por operación
SELECT * FROM chain_metrics ORDER BY ts DESC LIMIT 100;

-- Estadísticas por cadena
SELECT 
  chain,
  COUNT(*) as trades,
  SUM(profit_usd) as total_profit,
  AVG(latency_ms) as avg_latency
FROM chain_metrics
GROUP BY chain;

-- Estado del Bandit
SELECT * FROM bandit_state;
```

---

## 🔧 Lo que TÚ debes configurar

### 1. RPCs Privados

Los RPCs públicos son lentos y tienen límites. Necesitas:

- **Alchemy** o **Infura** para cada cadena
- O **nodos propios** para latencia mínima

### 2. Desplegar Contratos

```bash
# Compilar
npx hardhat compile

# Desplegar (actualiza el bytecode en deploy.ts)
npx tsx scripts/deploy.ts base arbitrum
```

### 3. Fondear Wallet

Necesitas en cada cadena:
- **Gas**: ~0.01 ETH (o MATIC en Polygon)
- **Capital**: USDC/USDT para operar (mínimo $100 recomendado)

### 4. Aprobar Tokens

El contrato ArbExecutor necesita aprobación para gastar tus tokens:

```javascript
// Ejemplo con ethers.js
const usdc = new Contract(USDC_ADDRESS, ERC20_ABI, signer);
await usdc.approve(EXECUTOR_ADDRESS, ethers.MaxUint256);
```

### 5. Ajustar Parámetros

Monitorea y ajusta según resultados:
- `MIN_PROFIT_USD`: Aumentar si hay muchos trades fallidos
- `GAS_MULT`: Aumentar en períodos de alta volatilidad de gas
- `TICK_MS`: Reducir para más velocidad (más consumo de RPC)

---

## ⚠️ Consideraciones Importantes

### Seguridad

- 🔐 **NUNCA** compartas tu `PRIVATE_KEY`
- 🔐 Usa una wallet dedicada para el bot
- 🔐 Empieza con capital pequeño

### Riesgos

- 💸 **Pérdida de gas** si los trades fallan
- 💸 **Slippage** si el mercado se mueve rápido
- 💸 **Front-running** por MEV bots

### Optimizaciones Futuras

- [ ] Flashbots/MEV protection
- [ ] WebSocket para actualizaciones en tiempo real
- [ ] Multicall para reducir latencia
- [ ] Más DEXs (Curve, Balancer, SushiSwap)

---

## 📞 Soporte

Para agregar nuevas cadenas o DEXs, modifica:
1. `config.ts` - Agregar configuración de la cadena
2. `routes.ts` - Agregar direcciones de tokens y DEX
3. `chainlink.ts` - Agregar feed de precio

---

## 📄 Licencia

MIT License - Uso bajo tu propio riesgo.



## Sistema de Arbitraje Multi-Cadena con IA

Un bot de arbitraje profesional que opera en múltiples cadenas L2 (Base, Arbitrum, Optimism, Polygon) utilizando inteligencia artificial para optimizar la selección de cadenas.

---

## 📋 Características

### ✅ Implementado (Lo que hice yo)

- **🧠 AI Bandit (Thompson Sampling)** - Algoritmo de aprendizaje que decide en qué cadena operar
- **📊 Base de Datos SQLite** - Almacenamiento de métricas y estadísticas
- **🔮 Oracle Chainlink** - Conversión precisa de gas a USD
- **💱 Integración Uniswap V3** - Quoter y Router para swaps
- **🔄 Simulador** - Validación de trades antes de ejecución
- **⚡ Worker Multi-Cadena** - Ejecutores independientes por cadena
- **🎮 Controller Principal** - Orquestación con rotación IA
- **📜 Contrato ArbExecutor** - Ejecución atómica de arbitrajes
- **🛠️ Configuración Completa** - Variables de entorno y tipos TypeScript

### ⏳ Lo que TÚ debes hacer

1. **Configurar RPCs privados** (Alchemy/Infura/propios)
2. **Compilar y desplegar ArbExecutor.sol** en cada cadena
3. **Fondear la wallet** con tokens estables (USDC) y gas (ETH/MATIC)
4. **Ajustar rutas** según liquidez actual del mercado
5. **Monitorear y ajustar** parámetros de ganancia mínima

---

## 🏗️ Arquitectura

```
┌─────────────────────────────────────────────────────────────────┐
│                     CONTROLLER (AI Rotator)                      │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  Thompson Sampling Bandit                                │   │
│  │  • Aprende qué cadena es más rentable                   │   │
│  │  • Rota automáticamente cada DECISION_MS                │   │
│  └─────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
                              │
        ┌─────────────────────┼─────────────────────┐
        ▼                     ▼                     ▼
┌───────────────┐    ┌───────────────┐    ┌───────────────┐
│  WORKER BASE  │    │ WORKER ARBITRUM│   │ WORKER OPTIMISM│
├───────────────┤    ├───────────────┤    ├───────────────┤
│ • Quote       │    │ • Quote       │    │ • Quote       │
│ • Simulate    │    │ • Simulate    │    │ • Simulate    │
│ • Gate (gas+) │    │ • Gate (gas+) │    │ • Gate (gas+) │
│ • Execute     │    │ • Execute     │    │ • Execute     │
└───────────────┘    └───────────────┘    └───────────────┘
        │                     │                     │
        ▼                     ▼                     ▼
┌───────────────┐    ┌───────────────┐    ┌───────────────┐
│ Chainlink     │    │ Chainlink     │    │ Chainlink     │
│ ETH/USD       │    │ ETH/USD       │    │ ETH/USD       │
└───────────────┘    └───────────────┘    └───────────────┘
```

---

## 📁 Estructura de Archivos

```
multichain-arb/
├── package.json
├── tsconfig.json
├── README.md
├── contracts/
│   └── ArbExecutor.sol          # Contrato de ejecución atómica
├── scripts/
│   └── deploy.ts                # Script de despliegue
└── src/
    ├── index.ts                 # Controller principal
    ├── config.ts                # Configuración y variables
    ├── logger.ts                # Sistema de logging
    ├── db.ts                    # Base de datos SQLite
    ├── ai/
    │   └── bandit.ts            # IA Thompson Sampling
    ├── oracle/
    │   ├── chainlink.ts         # Integración Chainlink
    │   └── price.ts             # Utilidades de precio
    ├── dex/
    │   ├── univ3.ts             # Integración Uniswap V3
    │   └── routes.ts            # Configuración de rutas
    └── worker/
        ├── worker.ts            # Worker por cadena
        ├── strategy.ts          # Estrategia de búsqueda
        ├── simulator.ts         # Simulador de trades
        └── executor.ts          # Ejecutor de transacciones
```

---

## 🚀 Instalación

### 1. Instalar dependencias

```bash
cd src/modules/DeFiProtocols/multichain-arb
npm install
```

### 2. Configurar variables de entorno

Crea un archivo `.env` basado en `.env.example`:

```env
# Wallet
PRIVATE_KEY=0x...

# Timing
TICK_MS=700
DECISION_MS=5000

# Trading
MIN_PROFIT_USD=0.50
GAS_MULT=1.7

# Chains
CHAINS=base,arbitrum,optimism,polygon

# RPCs (usa tus propios endpoints)
BASE_RPC_READ=https://...
BASE_RPC_SIM=https://...
BASE_RPC_SEND=https://...
BASE_RPC_WS=wss://...

ARB_RPC_READ=https://...
# ... etc
```

### 3. Compilar el contrato

```bash
# Instalar Hardhat si no lo tienes
npm install --save-dev hardhat @nomicfoundation/hardhat-toolbox

# Compilar
npx hardhat compile
```

### 4. Desplegar el contrato

```bash
npx tsx scripts/deploy.ts base arbitrum optimism polygon
```

### 5. Ejecutar el bot

```bash
# Desarrollo (con hot reload)
npm run dev

# Producción
npm run build
npm start
```

---

## ⚙️ Configuración

### Variables de Entorno

| Variable | Descripción | Default |
|----------|-------------|---------|
| `PRIVATE_KEY` | Clave privada de la wallet | (requerido) |
| `TICK_MS` | Intervalo entre scans (ms) | 700 |
| `DECISION_MS` | Intervalo de rotación IA (ms) | 5000 |
| `MIN_PROFIT_USD` | Ganancia mínima en USD | 0.50 |
| `GAS_MULT` | Multiplicador de gas mínimo | 1.7 |
| `MAX_SLIPPAGE_BPS` | Slippage máximo (bps) | 10 |
| `CHAINS` | Cadenas habilitadas | base,arbitrum |
| `DRY_RUN` | Modo simulación | false |

### Rutas de Arbitraje

Edita `src/dex/routes.ts` para agregar/modificar rutas:

```typescript
{
  name: "USDC→WETH→USDT (500/500)",
  tokenIn: TOKENS.arbitrum.USDC,
  tokenMid: TOKENS.arbitrum.WETH,
  tokenOut: TOKENS.arbitrum.USDT,
  fee1: FEE_TIERS.LOW,
  fee2: FEE_TIERS.LOW,
  quoterV2: DEX_ADDRESSES.arbitrum.quoterV2,
  router: DEX_ADDRESSES.arbitrum.swapRouter,
  stableDecimals: 6
}
```

---

## 🧠 IA: Thompson Sampling Bandit

El bot usa un algoritmo Multi-Armed Bandit con Thompson Sampling para decidir en qué cadena operar:

### Cómo funciona

1. **Cada cadena es un "brazo"** con parámetros α (éxitos) y β (fracasos)
2. **Antes de cada decisión**, se muestrea de una distribución Beta(α, β)
3. **Se elige la cadena** con el valor muestreado más alto
4. **Después de cada trade**, se actualiza α o β según el resultado

### Ventajas

- ✅ Balance automático entre exploración y explotación
- ✅ Aprende de la experiencia real
- ✅ Se adapta a cambios en el mercado
- ✅ No requiere datos históricos para empezar

---

## 📊 Métricas y Estadísticas

El bot almacena métricas en SQLite:

```sql
-- Métricas por operación
SELECT * FROM chain_metrics ORDER BY ts DESC LIMIT 100;

-- Estadísticas por cadena
SELECT 
  chain,
  COUNT(*) as trades,
  SUM(profit_usd) as total_profit,
  AVG(latency_ms) as avg_latency
FROM chain_metrics
GROUP BY chain;

-- Estado del Bandit
SELECT * FROM bandit_state;
```

---

## 🔧 Lo que TÚ debes configurar

### 1. RPCs Privados

Los RPCs públicos son lentos y tienen límites. Necesitas:

- **Alchemy** o **Infura** para cada cadena
- O **nodos propios** para latencia mínima

### 2. Desplegar Contratos

```bash
# Compilar
npx hardhat compile

# Desplegar (actualiza el bytecode en deploy.ts)
npx tsx scripts/deploy.ts base arbitrum
```

### 3. Fondear Wallet

Necesitas en cada cadena:
- **Gas**: ~0.01 ETH (o MATIC en Polygon)
- **Capital**: USDC/USDT para operar (mínimo $100 recomendado)

### 4. Aprobar Tokens

El contrato ArbExecutor necesita aprobación para gastar tus tokens:

```javascript
// Ejemplo con ethers.js
const usdc = new Contract(USDC_ADDRESS, ERC20_ABI, signer);
await usdc.approve(EXECUTOR_ADDRESS, ethers.MaxUint256);
```

### 5. Ajustar Parámetros

Monitorea y ajusta según resultados:
- `MIN_PROFIT_USD`: Aumentar si hay muchos trades fallidos
- `GAS_MULT`: Aumentar en períodos de alta volatilidad de gas
- `TICK_MS`: Reducir para más velocidad (más consumo de RPC)

---

## ⚠️ Consideraciones Importantes

### Seguridad

- 🔐 **NUNCA** compartas tu `PRIVATE_KEY`
- 🔐 Usa una wallet dedicada para el bot
- 🔐 Empieza con capital pequeño

### Riesgos

- 💸 **Pérdida de gas** si los trades fallan
- 💸 **Slippage** si el mercado se mueve rápido
- 💸 **Front-running** por MEV bots

### Optimizaciones Futuras

- [ ] Flashbots/MEV protection
- [ ] WebSocket para actualizaciones en tiempo real
- [ ] Multicall para reducir latencia
- [ ] Más DEXs (Curve, Balancer, SushiSwap)

---

## 📞 Soporte

Para agregar nuevas cadenas o DEXs, modifica:
1. `config.ts` - Agregar configuración de la cadena
2. `routes.ts` - Agregar direcciones de tokens y DEX
3. `chainlink.ts` - Agregar feed de precio

---

## 📄 Licencia

MIT License - Uso bajo tu propio riesgo.




## Sistema de Arbitraje Multi-Cadena con IA

Un bot de arbitraje profesional que opera en múltiples cadenas L2 (Base, Arbitrum, Optimism, Polygon) utilizando inteligencia artificial para optimizar la selección de cadenas.

---

## 📋 Características

### ✅ Implementado (Lo que hice yo)

- **🧠 AI Bandit (Thompson Sampling)** - Algoritmo de aprendizaje que decide en qué cadena operar
- **📊 Base de Datos SQLite** - Almacenamiento de métricas y estadísticas
- **🔮 Oracle Chainlink** - Conversión precisa de gas a USD
- **💱 Integración Uniswap V3** - Quoter y Router para swaps
- **🔄 Simulador** - Validación de trades antes de ejecución
- **⚡ Worker Multi-Cadena** - Ejecutores independientes por cadena
- **🎮 Controller Principal** - Orquestación con rotación IA
- **📜 Contrato ArbExecutor** - Ejecución atómica de arbitrajes
- **🛠️ Configuración Completa** - Variables de entorno y tipos TypeScript

### ⏳ Lo que TÚ debes hacer

1. **Configurar RPCs privados** (Alchemy/Infura/propios)
2. **Compilar y desplegar ArbExecutor.sol** en cada cadena
3. **Fondear la wallet** con tokens estables (USDC) y gas (ETH/MATIC)
4. **Ajustar rutas** según liquidez actual del mercado
5. **Monitorear y ajustar** parámetros de ganancia mínima

---

## 🏗️ Arquitectura

```
┌─────────────────────────────────────────────────────────────────┐
│                     CONTROLLER (AI Rotator)                      │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  Thompson Sampling Bandit                                │   │
│  │  • Aprende qué cadena es más rentable                   │   │
│  │  • Rota automáticamente cada DECISION_MS                │   │
│  └─────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
                              │
        ┌─────────────────────┼─────────────────────┐
        ▼                     ▼                     ▼
┌───────────────┐    ┌───────────────┐    ┌───────────────┐
│  WORKER BASE  │    │ WORKER ARBITRUM│   │ WORKER OPTIMISM│
├───────────────┤    ├───────────────┤    ├───────────────┤
│ • Quote       │    │ • Quote       │    │ • Quote       │
│ • Simulate    │    │ • Simulate    │    │ • Simulate    │
│ • Gate (gas+) │    │ • Gate (gas+) │    │ • Gate (gas+) │
│ • Execute     │    │ • Execute     │    │ • Execute     │
└───────────────┘    └───────────────┘    └───────────────┘
        │                     │                     │
        ▼                     ▼                     ▼
┌───────────────┐    ┌───────────────┐    ┌───────────────┐
│ Chainlink     │    │ Chainlink     │    │ Chainlink     │
│ ETH/USD       │    │ ETH/USD       │    │ ETH/USD       │
└───────────────┘    └───────────────┘    └───────────────┘
```

---

## 📁 Estructura de Archivos

```
multichain-arb/
├── package.json
├── tsconfig.json
├── README.md
├── contracts/
│   └── ArbExecutor.sol          # Contrato de ejecución atómica
├── scripts/
│   └── deploy.ts                # Script de despliegue
└── src/
    ├── index.ts                 # Controller principal
    ├── config.ts                # Configuración y variables
    ├── logger.ts                # Sistema de logging
    ├── db.ts                    # Base de datos SQLite
    ├── ai/
    │   └── bandit.ts            # IA Thompson Sampling
    ├── oracle/
    │   ├── chainlink.ts         # Integración Chainlink
    │   └── price.ts             # Utilidades de precio
    ├── dex/
    │   ├── univ3.ts             # Integración Uniswap V3
    │   └── routes.ts            # Configuración de rutas
    └── worker/
        ├── worker.ts            # Worker por cadena
        ├── strategy.ts          # Estrategia de búsqueda
        ├── simulator.ts         # Simulador de trades
        └── executor.ts          # Ejecutor de transacciones
```

---

## 🚀 Instalación

### 1. Instalar dependencias

```bash
cd src/modules/DeFiProtocols/multichain-arb
npm install
```

### 2. Configurar variables de entorno

Crea un archivo `.env` basado en `.env.example`:

```env
# Wallet
PRIVATE_KEY=0x...

# Timing
TICK_MS=700
DECISION_MS=5000

# Trading
MIN_PROFIT_USD=0.50
GAS_MULT=1.7

# Chains
CHAINS=base,arbitrum,optimism,polygon

# RPCs (usa tus propios endpoints)
BASE_RPC_READ=https://...
BASE_RPC_SIM=https://...
BASE_RPC_SEND=https://...
BASE_RPC_WS=wss://...

ARB_RPC_READ=https://...
# ... etc
```

### 3. Compilar el contrato

```bash
# Instalar Hardhat si no lo tienes
npm install --save-dev hardhat @nomicfoundation/hardhat-toolbox

# Compilar
npx hardhat compile
```

### 4. Desplegar el contrato

```bash
npx tsx scripts/deploy.ts base arbitrum optimism polygon
```

### 5. Ejecutar el bot

```bash
# Desarrollo (con hot reload)
npm run dev

# Producción
npm run build
npm start
```

---

## ⚙️ Configuración

### Variables de Entorno

| Variable | Descripción | Default |
|----------|-------------|---------|
| `PRIVATE_KEY` | Clave privada de la wallet | (requerido) |
| `TICK_MS` | Intervalo entre scans (ms) | 700 |
| `DECISION_MS` | Intervalo de rotación IA (ms) | 5000 |
| `MIN_PROFIT_USD` | Ganancia mínima en USD | 0.50 |
| `GAS_MULT` | Multiplicador de gas mínimo | 1.7 |
| `MAX_SLIPPAGE_BPS` | Slippage máximo (bps) | 10 |
| `CHAINS` | Cadenas habilitadas | base,arbitrum |
| `DRY_RUN` | Modo simulación | false |

### Rutas de Arbitraje

Edita `src/dex/routes.ts` para agregar/modificar rutas:

```typescript
{
  name: "USDC→WETH→USDT (500/500)",
  tokenIn: TOKENS.arbitrum.USDC,
  tokenMid: TOKENS.arbitrum.WETH,
  tokenOut: TOKENS.arbitrum.USDT,
  fee1: FEE_TIERS.LOW,
  fee2: FEE_TIERS.LOW,
  quoterV2: DEX_ADDRESSES.arbitrum.quoterV2,
  router: DEX_ADDRESSES.arbitrum.swapRouter,
  stableDecimals: 6
}
```

---

## 🧠 IA: Thompson Sampling Bandit

El bot usa un algoritmo Multi-Armed Bandit con Thompson Sampling para decidir en qué cadena operar:

### Cómo funciona

1. **Cada cadena es un "brazo"** con parámetros α (éxitos) y β (fracasos)
2. **Antes de cada decisión**, se muestrea de una distribución Beta(α, β)
3. **Se elige la cadena** con el valor muestreado más alto
4. **Después de cada trade**, se actualiza α o β según el resultado

### Ventajas

- ✅ Balance automático entre exploración y explotación
- ✅ Aprende de la experiencia real
- ✅ Se adapta a cambios en el mercado
- ✅ No requiere datos históricos para empezar

---

## 📊 Métricas y Estadísticas

El bot almacena métricas en SQLite:

```sql
-- Métricas por operación
SELECT * FROM chain_metrics ORDER BY ts DESC LIMIT 100;

-- Estadísticas por cadena
SELECT 
  chain,
  COUNT(*) as trades,
  SUM(profit_usd) as total_profit,
  AVG(latency_ms) as avg_latency
FROM chain_metrics
GROUP BY chain;

-- Estado del Bandit
SELECT * FROM bandit_state;
```

---

## 🔧 Lo que TÚ debes configurar

### 1. RPCs Privados

Los RPCs públicos son lentos y tienen límites. Necesitas:

- **Alchemy** o **Infura** para cada cadena
- O **nodos propios** para latencia mínima

### 2. Desplegar Contratos

```bash
# Compilar
npx hardhat compile

# Desplegar (actualiza el bytecode en deploy.ts)
npx tsx scripts/deploy.ts base arbitrum
```

### 3. Fondear Wallet

Necesitas en cada cadena:
- **Gas**: ~0.01 ETH (o MATIC en Polygon)
- **Capital**: USDC/USDT para operar (mínimo $100 recomendado)

### 4. Aprobar Tokens

El contrato ArbExecutor necesita aprobación para gastar tus tokens:

```javascript
// Ejemplo con ethers.js
const usdc = new Contract(USDC_ADDRESS, ERC20_ABI, signer);
await usdc.approve(EXECUTOR_ADDRESS, ethers.MaxUint256);
```

### 5. Ajustar Parámetros

Monitorea y ajusta según resultados:
- `MIN_PROFIT_USD`: Aumentar si hay muchos trades fallidos
- `GAS_MULT`: Aumentar en períodos de alta volatilidad de gas
- `TICK_MS`: Reducir para más velocidad (más consumo de RPC)

---

## ⚠️ Consideraciones Importantes

### Seguridad

- 🔐 **NUNCA** compartas tu `PRIVATE_KEY`
- 🔐 Usa una wallet dedicada para el bot
- 🔐 Empieza con capital pequeño

### Riesgos

- 💸 **Pérdida de gas** si los trades fallan
- 💸 **Slippage** si el mercado se mueve rápido
- 💸 **Front-running** por MEV bots

### Optimizaciones Futuras

- [ ] Flashbots/MEV protection
- [ ] WebSocket para actualizaciones en tiempo real
- [ ] Multicall para reducir latencia
- [ ] Más DEXs (Curve, Balancer, SushiSwap)

---

## 📞 Soporte

Para agregar nuevas cadenas o DEXs, modifica:
1. `config.ts` - Agregar configuración de la cadena
2. `routes.ts` - Agregar direcciones de tokens y DEX
3. `chainlink.ts` - Agregar feed de precio

---

## 📄 Licencia

MIT License - Uso bajo tu propio riesgo.



## Sistema de Arbitraje Multi-Cadena con IA

Un bot de arbitraje profesional que opera en múltiples cadenas L2 (Base, Arbitrum, Optimism, Polygon) utilizando inteligencia artificial para optimizar la selección de cadenas.

---

## 📋 Características

### ✅ Implementado (Lo que hice yo)

- **🧠 AI Bandit (Thompson Sampling)** - Algoritmo de aprendizaje que decide en qué cadena operar
- **📊 Base de Datos SQLite** - Almacenamiento de métricas y estadísticas
- **🔮 Oracle Chainlink** - Conversión precisa de gas a USD
- **💱 Integración Uniswap V3** - Quoter y Router para swaps
- **🔄 Simulador** - Validación de trades antes de ejecución
- **⚡ Worker Multi-Cadena** - Ejecutores independientes por cadena
- **🎮 Controller Principal** - Orquestación con rotación IA
- **📜 Contrato ArbExecutor** - Ejecución atómica de arbitrajes
- **🛠️ Configuración Completa** - Variables de entorno y tipos TypeScript

### ⏳ Lo que TÚ debes hacer

1. **Configurar RPCs privados** (Alchemy/Infura/propios)
2. **Compilar y desplegar ArbExecutor.sol** en cada cadena
3. **Fondear la wallet** con tokens estables (USDC) y gas (ETH/MATIC)
4. **Ajustar rutas** según liquidez actual del mercado
5. **Monitorear y ajustar** parámetros de ganancia mínima

---

## 🏗️ Arquitectura

```
┌─────────────────────────────────────────────────────────────────┐
│                     CONTROLLER (AI Rotator)                      │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  Thompson Sampling Bandit                                │   │
│  │  • Aprende qué cadena es más rentable                   │   │
│  │  • Rota automáticamente cada DECISION_MS                │   │
│  └─────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
                              │
        ┌─────────────────────┼─────────────────────┐
        ▼                     ▼                     ▼
┌───────────────┐    ┌───────────────┐    ┌───────────────┐
│  WORKER BASE  │    │ WORKER ARBITRUM│   │ WORKER OPTIMISM│
├───────────────┤    ├───────────────┤    ├───────────────┤
│ • Quote       │    │ • Quote       │    │ • Quote       │
│ • Simulate    │    │ • Simulate    │    │ • Simulate    │
│ • Gate (gas+) │    │ • Gate (gas+) │    │ • Gate (gas+) │
│ • Execute     │    │ • Execute     │    │ • Execute     │
└───────────────┘    └───────────────┘    └───────────────┘
        │                     │                     │
        ▼                     ▼                     ▼
┌───────────────┐    ┌───────────────┐    ┌───────────────┐
│ Chainlink     │    │ Chainlink     │    │ Chainlink     │
│ ETH/USD       │    │ ETH/USD       │    │ ETH/USD       │
└───────────────┘    └───────────────┘    └───────────────┘
```

---

## 📁 Estructura de Archivos

```
multichain-arb/
├── package.json
├── tsconfig.json
├── README.md
├── contracts/
│   └── ArbExecutor.sol          # Contrato de ejecución atómica
├── scripts/
│   └── deploy.ts                # Script de despliegue
└── src/
    ├── index.ts                 # Controller principal
    ├── config.ts                # Configuración y variables
    ├── logger.ts                # Sistema de logging
    ├── db.ts                    # Base de datos SQLite
    ├── ai/
    │   └── bandit.ts            # IA Thompson Sampling
    ├── oracle/
    │   ├── chainlink.ts         # Integración Chainlink
    │   └── price.ts             # Utilidades de precio
    ├── dex/
    │   ├── univ3.ts             # Integración Uniswap V3
    │   └── routes.ts            # Configuración de rutas
    └── worker/
        ├── worker.ts            # Worker por cadena
        ├── strategy.ts          # Estrategia de búsqueda
        ├── simulator.ts         # Simulador de trades
        └── executor.ts          # Ejecutor de transacciones
```

---

## 🚀 Instalación

### 1. Instalar dependencias

```bash
cd src/modules/DeFiProtocols/multichain-arb
npm install
```

### 2. Configurar variables de entorno

Crea un archivo `.env` basado en `.env.example`:

```env
# Wallet
PRIVATE_KEY=0x...

# Timing
TICK_MS=700
DECISION_MS=5000

# Trading
MIN_PROFIT_USD=0.50
GAS_MULT=1.7

# Chains
CHAINS=base,arbitrum,optimism,polygon

# RPCs (usa tus propios endpoints)
BASE_RPC_READ=https://...
BASE_RPC_SIM=https://...
BASE_RPC_SEND=https://...
BASE_RPC_WS=wss://...

ARB_RPC_READ=https://...
# ... etc
```

### 3. Compilar el contrato

```bash
# Instalar Hardhat si no lo tienes
npm install --save-dev hardhat @nomicfoundation/hardhat-toolbox

# Compilar
npx hardhat compile
```

### 4. Desplegar el contrato

```bash
npx tsx scripts/deploy.ts base arbitrum optimism polygon
```

### 5. Ejecutar el bot

```bash
# Desarrollo (con hot reload)
npm run dev

# Producción
npm run build
npm start
```

---

## ⚙️ Configuración

### Variables de Entorno

| Variable | Descripción | Default |
|----------|-------------|---------|
| `PRIVATE_KEY` | Clave privada de la wallet | (requerido) |
| `TICK_MS` | Intervalo entre scans (ms) | 700 |
| `DECISION_MS` | Intervalo de rotación IA (ms) | 5000 |
| `MIN_PROFIT_USD` | Ganancia mínima en USD | 0.50 |
| `GAS_MULT` | Multiplicador de gas mínimo | 1.7 |
| `MAX_SLIPPAGE_BPS` | Slippage máximo (bps) | 10 |
| `CHAINS` | Cadenas habilitadas | base,arbitrum |
| `DRY_RUN` | Modo simulación | false |

### Rutas de Arbitraje

Edita `src/dex/routes.ts` para agregar/modificar rutas:

```typescript
{
  name: "USDC→WETH→USDT (500/500)",
  tokenIn: TOKENS.arbitrum.USDC,
  tokenMid: TOKENS.arbitrum.WETH,
  tokenOut: TOKENS.arbitrum.USDT,
  fee1: FEE_TIERS.LOW,
  fee2: FEE_TIERS.LOW,
  quoterV2: DEX_ADDRESSES.arbitrum.quoterV2,
  router: DEX_ADDRESSES.arbitrum.swapRouter,
  stableDecimals: 6
}
```

---

## 🧠 IA: Thompson Sampling Bandit

El bot usa un algoritmo Multi-Armed Bandit con Thompson Sampling para decidir en qué cadena operar:

### Cómo funciona

1. **Cada cadena es un "brazo"** con parámetros α (éxitos) y β (fracasos)
2. **Antes de cada decisión**, se muestrea de una distribución Beta(α, β)
3. **Se elige la cadena** con el valor muestreado más alto
4. **Después de cada trade**, se actualiza α o β según el resultado

### Ventajas

- ✅ Balance automático entre exploración y explotación
- ✅ Aprende de la experiencia real
- ✅ Se adapta a cambios en el mercado
- ✅ No requiere datos históricos para empezar

---

## 📊 Métricas y Estadísticas

El bot almacena métricas en SQLite:

```sql
-- Métricas por operación
SELECT * FROM chain_metrics ORDER BY ts DESC LIMIT 100;

-- Estadísticas por cadena
SELECT 
  chain,
  COUNT(*) as trades,
  SUM(profit_usd) as total_profit,
  AVG(latency_ms) as avg_latency
FROM chain_metrics
GROUP BY chain;

-- Estado del Bandit
SELECT * FROM bandit_state;
```

---

## 🔧 Lo que TÚ debes configurar

### 1. RPCs Privados

Los RPCs públicos son lentos y tienen límites. Necesitas:

- **Alchemy** o **Infura** para cada cadena
- O **nodos propios** para latencia mínima

### 2. Desplegar Contratos

```bash
# Compilar
npx hardhat compile

# Desplegar (actualiza el bytecode en deploy.ts)
npx tsx scripts/deploy.ts base arbitrum
```

### 3. Fondear Wallet

Necesitas en cada cadena:
- **Gas**: ~0.01 ETH (o MATIC en Polygon)
- **Capital**: USDC/USDT para operar (mínimo $100 recomendado)

### 4. Aprobar Tokens

El contrato ArbExecutor necesita aprobación para gastar tus tokens:

```javascript
// Ejemplo con ethers.js
const usdc = new Contract(USDC_ADDRESS, ERC20_ABI, signer);
await usdc.approve(EXECUTOR_ADDRESS, ethers.MaxUint256);
```

### 5. Ajustar Parámetros

Monitorea y ajusta según resultados:
- `MIN_PROFIT_USD`: Aumentar si hay muchos trades fallidos
- `GAS_MULT`: Aumentar en períodos de alta volatilidad de gas
- `TICK_MS`: Reducir para más velocidad (más consumo de RPC)

---

## ⚠️ Consideraciones Importantes

### Seguridad

- 🔐 **NUNCA** compartas tu `PRIVATE_KEY`
- 🔐 Usa una wallet dedicada para el bot
- 🔐 Empieza con capital pequeño

### Riesgos

- 💸 **Pérdida de gas** si los trades fallan
- 💸 **Slippage** si el mercado se mueve rápido
- 💸 **Front-running** por MEV bots

### Optimizaciones Futuras

- [ ] Flashbots/MEV protection
- [ ] WebSocket para actualizaciones en tiempo real
- [ ] Multicall para reducir latencia
- [ ] Más DEXs (Curve, Balancer, SushiSwap)

---

## 📞 Soporte

Para agregar nuevas cadenas o DEXs, modifica:
1. `config.ts` - Agregar configuración de la cadena
2. `routes.ts` - Agregar direcciones de tokens y DEX
3. `chainlink.ts` - Agregar feed de precio

---

## 📄 Licencia

MIT License - Uso bajo tu propio riesgo.




## Sistema de Arbitraje Multi-Cadena con IA

Un bot de arbitraje profesional que opera en múltiples cadenas L2 (Base, Arbitrum, Optimism, Polygon) utilizando inteligencia artificial para optimizar la selección de cadenas.

---

## 📋 Características

### ✅ Implementado (Lo que hice yo)

- **🧠 AI Bandit (Thompson Sampling)** - Algoritmo de aprendizaje que decide en qué cadena operar
- **📊 Base de Datos SQLite** - Almacenamiento de métricas y estadísticas
- **🔮 Oracle Chainlink** - Conversión precisa de gas a USD
- **💱 Integración Uniswap V3** - Quoter y Router para swaps
- **🔄 Simulador** - Validación de trades antes de ejecución
- **⚡ Worker Multi-Cadena** - Ejecutores independientes por cadena
- **🎮 Controller Principal** - Orquestación con rotación IA
- **📜 Contrato ArbExecutor** - Ejecución atómica de arbitrajes
- **🛠️ Configuración Completa** - Variables de entorno y tipos TypeScript

### ⏳ Lo que TÚ debes hacer

1. **Configurar RPCs privados** (Alchemy/Infura/propios)
2. **Compilar y desplegar ArbExecutor.sol** en cada cadena
3. **Fondear la wallet** con tokens estables (USDC) y gas (ETH/MATIC)
4. **Ajustar rutas** según liquidez actual del mercado
5. **Monitorear y ajustar** parámetros de ganancia mínima

---

## 🏗️ Arquitectura

```
┌─────────────────────────────────────────────────────────────────┐
│                     CONTROLLER (AI Rotator)                      │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  Thompson Sampling Bandit                                │   │
│  │  • Aprende qué cadena es más rentable                   │   │
│  │  • Rota automáticamente cada DECISION_MS                │   │
│  └─────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
                              │
        ┌─────────────────────┼─────────────────────┐
        ▼                     ▼                     ▼
┌───────────────┐    ┌───────────────┐    ┌───────────────┐
│  WORKER BASE  │    │ WORKER ARBITRUM│   │ WORKER OPTIMISM│
├───────────────┤    ├───────────────┤    ├───────────────┤
│ • Quote       │    │ • Quote       │    │ • Quote       │
│ • Simulate    │    │ • Simulate    │    │ • Simulate    │
│ • Gate (gas+) │    │ • Gate (gas+) │    │ • Gate (gas+) │
│ • Execute     │    │ • Execute     │    │ • Execute     │
└───────────────┘    └───────────────┘    └───────────────┘
        │                     │                     │
        ▼                     ▼                     ▼
┌───────────────┐    ┌───────────────┐    ┌───────────────┐
│ Chainlink     │    │ Chainlink     │    │ Chainlink     │
│ ETH/USD       │    │ ETH/USD       │    │ ETH/USD       │
└───────────────┘    └───────────────┘    └───────────────┘
```

---

## 📁 Estructura de Archivos

```
multichain-arb/
├── package.json
├── tsconfig.json
├── README.md
├── contracts/
│   └── ArbExecutor.sol          # Contrato de ejecución atómica
├── scripts/
│   └── deploy.ts                # Script de despliegue
└── src/
    ├── index.ts                 # Controller principal
    ├── config.ts                # Configuración y variables
    ├── logger.ts                # Sistema de logging
    ├── db.ts                    # Base de datos SQLite
    ├── ai/
    │   └── bandit.ts            # IA Thompson Sampling
    ├── oracle/
    │   ├── chainlink.ts         # Integración Chainlink
    │   └── price.ts             # Utilidades de precio
    ├── dex/
    │   ├── univ3.ts             # Integración Uniswap V3
    │   └── routes.ts            # Configuración de rutas
    └── worker/
        ├── worker.ts            # Worker por cadena
        ├── strategy.ts          # Estrategia de búsqueda
        ├── simulator.ts         # Simulador de trades
        └── executor.ts          # Ejecutor de transacciones
```

---

## 🚀 Instalación

### 1. Instalar dependencias

```bash
cd src/modules/DeFiProtocols/multichain-arb
npm install
```

### 2. Configurar variables de entorno

Crea un archivo `.env` basado en `.env.example`:

```env
# Wallet
PRIVATE_KEY=0x...

# Timing
TICK_MS=700
DECISION_MS=5000

# Trading
MIN_PROFIT_USD=0.50
GAS_MULT=1.7

# Chains
CHAINS=base,arbitrum,optimism,polygon

# RPCs (usa tus propios endpoints)
BASE_RPC_READ=https://...
BASE_RPC_SIM=https://...
BASE_RPC_SEND=https://...
BASE_RPC_WS=wss://...

ARB_RPC_READ=https://...
# ... etc
```

### 3. Compilar el contrato

```bash
# Instalar Hardhat si no lo tienes
npm install --save-dev hardhat @nomicfoundation/hardhat-toolbox

# Compilar
npx hardhat compile
```

### 4. Desplegar el contrato

```bash
npx tsx scripts/deploy.ts base arbitrum optimism polygon
```

### 5. Ejecutar el bot

```bash
# Desarrollo (con hot reload)
npm run dev

# Producción
npm run build
npm start
```

---

## ⚙️ Configuración

### Variables de Entorno

| Variable | Descripción | Default |
|----------|-------------|---------|
| `PRIVATE_KEY` | Clave privada de la wallet | (requerido) |
| `TICK_MS` | Intervalo entre scans (ms) | 700 |
| `DECISION_MS` | Intervalo de rotación IA (ms) | 5000 |
| `MIN_PROFIT_USD` | Ganancia mínima en USD | 0.50 |
| `GAS_MULT` | Multiplicador de gas mínimo | 1.7 |
| `MAX_SLIPPAGE_BPS` | Slippage máximo (bps) | 10 |
| `CHAINS` | Cadenas habilitadas | base,arbitrum |
| `DRY_RUN` | Modo simulación | false |

### Rutas de Arbitraje

Edita `src/dex/routes.ts` para agregar/modificar rutas:

```typescript
{
  name: "USDC→WETH→USDT (500/500)",
  tokenIn: TOKENS.arbitrum.USDC,
  tokenMid: TOKENS.arbitrum.WETH,
  tokenOut: TOKENS.arbitrum.USDT,
  fee1: FEE_TIERS.LOW,
  fee2: FEE_TIERS.LOW,
  quoterV2: DEX_ADDRESSES.arbitrum.quoterV2,
  router: DEX_ADDRESSES.arbitrum.swapRouter,
  stableDecimals: 6
}
```

---

## 🧠 IA: Thompson Sampling Bandit

El bot usa un algoritmo Multi-Armed Bandit con Thompson Sampling para decidir en qué cadena operar:

### Cómo funciona

1. **Cada cadena es un "brazo"** con parámetros α (éxitos) y β (fracasos)
2. **Antes de cada decisión**, se muestrea de una distribución Beta(α, β)
3. **Se elige la cadena** con el valor muestreado más alto
4. **Después de cada trade**, se actualiza α o β según el resultado

### Ventajas

- ✅ Balance automático entre exploración y explotación
- ✅ Aprende de la experiencia real
- ✅ Se adapta a cambios en el mercado
- ✅ No requiere datos históricos para empezar

---

## 📊 Métricas y Estadísticas

El bot almacena métricas en SQLite:

```sql
-- Métricas por operación
SELECT * FROM chain_metrics ORDER BY ts DESC LIMIT 100;

-- Estadísticas por cadena
SELECT 
  chain,
  COUNT(*) as trades,
  SUM(profit_usd) as total_profit,
  AVG(latency_ms) as avg_latency
FROM chain_metrics
GROUP BY chain;

-- Estado del Bandit
SELECT * FROM bandit_state;
```

---

## 🔧 Lo que TÚ debes configurar

### 1. RPCs Privados

Los RPCs públicos son lentos y tienen límites. Necesitas:

- **Alchemy** o **Infura** para cada cadena
- O **nodos propios** para latencia mínima

### 2. Desplegar Contratos

```bash
# Compilar
npx hardhat compile

# Desplegar (actualiza el bytecode en deploy.ts)
npx tsx scripts/deploy.ts base arbitrum
```

### 3. Fondear Wallet

Necesitas en cada cadena:
- **Gas**: ~0.01 ETH (o MATIC en Polygon)
- **Capital**: USDC/USDT para operar (mínimo $100 recomendado)

### 4. Aprobar Tokens

El contrato ArbExecutor necesita aprobación para gastar tus tokens:

```javascript
// Ejemplo con ethers.js
const usdc = new Contract(USDC_ADDRESS, ERC20_ABI, signer);
await usdc.approve(EXECUTOR_ADDRESS, ethers.MaxUint256);
```

### 5. Ajustar Parámetros

Monitorea y ajusta según resultados:
- `MIN_PROFIT_USD`: Aumentar si hay muchos trades fallidos
- `GAS_MULT`: Aumentar en períodos de alta volatilidad de gas
- `TICK_MS`: Reducir para más velocidad (más consumo de RPC)

---

## ⚠️ Consideraciones Importantes

### Seguridad

- 🔐 **NUNCA** compartas tu `PRIVATE_KEY`
- 🔐 Usa una wallet dedicada para el bot
- 🔐 Empieza con capital pequeño

### Riesgos

- 💸 **Pérdida de gas** si los trades fallan
- 💸 **Slippage** si el mercado se mueve rápido
- 💸 **Front-running** por MEV bots

### Optimizaciones Futuras

- [ ] Flashbots/MEV protection
- [ ] WebSocket para actualizaciones en tiempo real
- [ ] Multicall para reducir latencia
- [ ] Más DEXs (Curve, Balancer, SushiSwap)

---

## 📞 Soporte

Para agregar nuevas cadenas o DEXs, modifica:
1. `config.ts` - Agregar configuración de la cadena
2. `routes.ts` - Agregar direcciones de tokens y DEX
3. `chainlink.ts` - Agregar feed de precio

---

## 📄 Licencia

MIT License - Uso bajo tu propio riesgo.



## Sistema de Arbitraje Multi-Cadena con IA

Un bot de arbitraje profesional que opera en múltiples cadenas L2 (Base, Arbitrum, Optimism, Polygon) utilizando inteligencia artificial para optimizar la selección de cadenas.

---

## 📋 Características

### ✅ Implementado (Lo que hice yo)

- **🧠 AI Bandit (Thompson Sampling)** - Algoritmo de aprendizaje que decide en qué cadena operar
- **📊 Base de Datos SQLite** - Almacenamiento de métricas y estadísticas
- **🔮 Oracle Chainlink** - Conversión precisa de gas a USD
- **💱 Integración Uniswap V3** - Quoter y Router para swaps
- **🔄 Simulador** - Validación de trades antes de ejecución
- **⚡ Worker Multi-Cadena** - Ejecutores independientes por cadena
- **🎮 Controller Principal** - Orquestación con rotación IA
- **📜 Contrato ArbExecutor** - Ejecución atómica de arbitrajes
- **🛠️ Configuración Completa** - Variables de entorno y tipos TypeScript

### ⏳ Lo que TÚ debes hacer

1. **Configurar RPCs privados** (Alchemy/Infura/propios)
2. **Compilar y desplegar ArbExecutor.sol** en cada cadena
3. **Fondear la wallet** con tokens estables (USDC) y gas (ETH/MATIC)
4. **Ajustar rutas** según liquidez actual del mercado
5. **Monitorear y ajustar** parámetros de ganancia mínima

---

## 🏗️ Arquitectura

```
┌─────────────────────────────────────────────────────────────────┐
│                     CONTROLLER (AI Rotator)                      │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  Thompson Sampling Bandit                                │   │
│  │  • Aprende qué cadena es más rentable                   │   │
│  │  • Rota automáticamente cada DECISION_MS                │   │
│  └─────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
                              │
        ┌─────────────────────┼─────────────────────┐
        ▼                     ▼                     ▼
┌───────────────┐    ┌───────────────┐    ┌───────────────┐
│  WORKER BASE  │    │ WORKER ARBITRUM│   │ WORKER OPTIMISM│
├───────────────┤    ├───────────────┤    ├───────────────┤
│ • Quote       │    │ • Quote       │    │ • Quote       │
│ • Simulate    │    │ • Simulate    │    │ • Simulate    │
│ • Gate (gas+) │    │ • Gate (gas+) │    │ • Gate (gas+) │
│ • Execute     │    │ • Execute     │    │ • Execute     │
└───────────────┘    └───────────────┘    └───────────────┘
        │                     │                     │
        ▼                     ▼                     ▼
┌───────────────┐    ┌───────────────┐    ┌───────────────┐
│ Chainlink     │    │ Chainlink     │    │ Chainlink     │
│ ETH/USD       │    │ ETH/USD       │    │ ETH/USD       │
└───────────────┘    └───────────────┘    └───────────────┘
```

---

## 📁 Estructura de Archivos

```
multichain-arb/
├── package.json
├── tsconfig.json
├── README.md
├── contracts/
│   └── ArbExecutor.sol          # Contrato de ejecución atómica
├── scripts/
│   └── deploy.ts                # Script de despliegue
└── src/
    ├── index.ts                 # Controller principal
    ├── config.ts                # Configuración y variables
    ├── logger.ts                # Sistema de logging
    ├── db.ts                    # Base de datos SQLite
    ├── ai/
    │   └── bandit.ts            # IA Thompson Sampling
    ├── oracle/
    │   ├── chainlink.ts         # Integración Chainlink
    │   └── price.ts             # Utilidades de precio
    ├── dex/
    │   ├── univ3.ts             # Integración Uniswap V3
    │   └── routes.ts            # Configuración de rutas
    └── worker/
        ├── worker.ts            # Worker por cadena
        ├── strategy.ts          # Estrategia de búsqueda
        ├── simulator.ts         # Simulador de trades
        └── executor.ts          # Ejecutor de transacciones
```

---

## 🚀 Instalación

### 1. Instalar dependencias

```bash
cd src/modules/DeFiProtocols/multichain-arb
npm install
```

### 2. Configurar variables de entorno

Crea un archivo `.env` basado en `.env.example`:

```env
# Wallet
PRIVATE_KEY=0x...

# Timing
TICK_MS=700
DECISION_MS=5000

# Trading
MIN_PROFIT_USD=0.50
GAS_MULT=1.7

# Chains
CHAINS=base,arbitrum,optimism,polygon

# RPCs (usa tus propios endpoints)
BASE_RPC_READ=https://...
BASE_RPC_SIM=https://...
BASE_RPC_SEND=https://...
BASE_RPC_WS=wss://...

ARB_RPC_READ=https://...
# ... etc
```

### 3. Compilar el contrato

```bash
# Instalar Hardhat si no lo tienes
npm install --save-dev hardhat @nomicfoundation/hardhat-toolbox

# Compilar
npx hardhat compile
```

### 4. Desplegar el contrato

```bash
npx tsx scripts/deploy.ts base arbitrum optimism polygon
```

### 5. Ejecutar el bot

```bash
# Desarrollo (con hot reload)
npm run dev

# Producción
npm run build
npm start
```

---

## ⚙️ Configuración

### Variables de Entorno

| Variable | Descripción | Default |
|----------|-------------|---------|
| `PRIVATE_KEY` | Clave privada de la wallet | (requerido) |
| `TICK_MS` | Intervalo entre scans (ms) | 700 |
| `DECISION_MS` | Intervalo de rotación IA (ms) | 5000 |
| `MIN_PROFIT_USD` | Ganancia mínima en USD | 0.50 |
| `GAS_MULT` | Multiplicador de gas mínimo | 1.7 |
| `MAX_SLIPPAGE_BPS` | Slippage máximo (bps) | 10 |
| `CHAINS` | Cadenas habilitadas | base,arbitrum |
| `DRY_RUN` | Modo simulación | false |

### Rutas de Arbitraje

Edita `src/dex/routes.ts` para agregar/modificar rutas:

```typescript
{
  name: "USDC→WETH→USDT (500/500)",
  tokenIn: TOKENS.arbitrum.USDC,
  tokenMid: TOKENS.arbitrum.WETH,
  tokenOut: TOKENS.arbitrum.USDT,
  fee1: FEE_TIERS.LOW,
  fee2: FEE_TIERS.LOW,
  quoterV2: DEX_ADDRESSES.arbitrum.quoterV2,
  router: DEX_ADDRESSES.arbitrum.swapRouter,
  stableDecimals: 6
}
```

---

## 🧠 IA: Thompson Sampling Bandit

El bot usa un algoritmo Multi-Armed Bandit con Thompson Sampling para decidir en qué cadena operar:

### Cómo funciona

1. **Cada cadena es un "brazo"** con parámetros α (éxitos) y β (fracasos)
2. **Antes de cada decisión**, se muestrea de una distribución Beta(α, β)
3. **Se elige la cadena** con el valor muestreado más alto
4. **Después de cada trade**, se actualiza α o β según el resultado

### Ventajas

- ✅ Balance automático entre exploración y explotación
- ✅ Aprende de la experiencia real
- ✅ Se adapta a cambios en el mercado
- ✅ No requiere datos históricos para empezar

---

## 📊 Métricas y Estadísticas

El bot almacena métricas en SQLite:

```sql
-- Métricas por operación
SELECT * FROM chain_metrics ORDER BY ts DESC LIMIT 100;

-- Estadísticas por cadena
SELECT 
  chain,
  COUNT(*) as trades,
  SUM(profit_usd) as total_profit,
  AVG(latency_ms) as avg_latency
FROM chain_metrics
GROUP BY chain;

-- Estado del Bandit
SELECT * FROM bandit_state;
```

---

## 🔧 Lo que TÚ debes configurar

### 1. RPCs Privados

Los RPCs públicos son lentos y tienen límites. Necesitas:

- **Alchemy** o **Infura** para cada cadena
- O **nodos propios** para latencia mínima

### 2. Desplegar Contratos

```bash
# Compilar
npx hardhat compile

# Desplegar (actualiza el bytecode en deploy.ts)
npx tsx scripts/deploy.ts base arbitrum
```

### 3. Fondear Wallet

Necesitas en cada cadena:
- **Gas**: ~0.01 ETH (o MATIC en Polygon)
- **Capital**: USDC/USDT para operar (mínimo $100 recomendado)

### 4. Aprobar Tokens

El contrato ArbExecutor necesita aprobación para gastar tus tokens:

```javascript
// Ejemplo con ethers.js
const usdc = new Contract(USDC_ADDRESS, ERC20_ABI, signer);
await usdc.approve(EXECUTOR_ADDRESS, ethers.MaxUint256);
```

### 5. Ajustar Parámetros

Monitorea y ajusta según resultados:
- `MIN_PROFIT_USD`: Aumentar si hay muchos trades fallidos
- `GAS_MULT`: Aumentar en períodos de alta volatilidad de gas
- `TICK_MS`: Reducir para más velocidad (más consumo de RPC)

---

## ⚠️ Consideraciones Importantes

### Seguridad

- 🔐 **NUNCA** compartas tu `PRIVATE_KEY`
- 🔐 Usa una wallet dedicada para el bot
- 🔐 Empieza con capital pequeño

### Riesgos

- 💸 **Pérdida de gas** si los trades fallan
- 💸 **Slippage** si el mercado se mueve rápido
- 💸 **Front-running** por MEV bots

### Optimizaciones Futuras

- [ ] Flashbots/MEV protection
- [ ] WebSocket para actualizaciones en tiempo real
- [ ] Multicall para reducir latencia
- [ ] Más DEXs (Curve, Balancer, SushiSwap)

---

## 📞 Soporte

Para agregar nuevas cadenas o DEXs, modifica:
1. `config.ts` - Agregar configuración de la cadena
2. `routes.ts` - Agregar direcciones de tokens y DEX
3. `chainlink.ts` - Agregar feed de precio

---

## 📄 Licencia

MIT License - Uso bajo tu propio riesgo.



## Sistema de Arbitraje Multi-Cadena con IA

Un bot de arbitraje profesional que opera en múltiples cadenas L2 (Base, Arbitrum, Optimism, Polygon) utilizando inteligencia artificial para optimizar la selección de cadenas.

---

## 📋 Características

### ✅ Implementado (Lo que hice yo)

- **🧠 AI Bandit (Thompson Sampling)** - Algoritmo de aprendizaje que decide en qué cadena operar
- **📊 Base de Datos SQLite** - Almacenamiento de métricas y estadísticas
- **🔮 Oracle Chainlink** - Conversión precisa de gas a USD
- **💱 Integración Uniswap V3** - Quoter y Router para swaps
- **🔄 Simulador** - Validación de trades antes de ejecución
- **⚡ Worker Multi-Cadena** - Ejecutores independientes por cadena
- **🎮 Controller Principal** - Orquestación con rotación IA
- **📜 Contrato ArbExecutor** - Ejecución atómica de arbitrajes
- **🛠️ Configuración Completa** - Variables de entorno y tipos TypeScript

### ⏳ Lo que TÚ debes hacer

1. **Configurar RPCs privados** (Alchemy/Infura/propios)
2. **Compilar y desplegar ArbExecutor.sol** en cada cadena
3. **Fondear la wallet** con tokens estables (USDC) y gas (ETH/MATIC)
4. **Ajustar rutas** según liquidez actual del mercado
5. **Monitorear y ajustar** parámetros de ganancia mínima

---

## 🏗️ Arquitectura

```
┌─────────────────────────────────────────────────────────────────┐
│                     CONTROLLER (AI Rotator)                      │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  Thompson Sampling Bandit                                │   │
│  │  • Aprende qué cadena es más rentable                   │   │
│  │  • Rota automáticamente cada DECISION_MS                │   │
│  └─────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
                              │
        ┌─────────────────────┼─────────────────────┐
        ▼                     ▼                     ▼
┌───────────────┐    ┌───────────────┐    ┌───────────────┐
│  WORKER BASE  │    │ WORKER ARBITRUM│   │ WORKER OPTIMISM│
├───────────────┤    ├───────────────┤    ├───────────────┤
│ • Quote       │    │ • Quote       │    │ • Quote       │
│ • Simulate    │    │ • Simulate    │    │ • Simulate    │
│ • Gate (gas+) │    │ • Gate (gas+) │    │ • Gate (gas+) │
│ • Execute     │    │ • Execute     │    │ • Execute     │
└───────────────┘    └───────────────┘    └───────────────┘
        │                     │                     │
        ▼                     ▼                     ▼
┌───────────────┐    ┌───────────────┐    ┌───────────────┐
│ Chainlink     │    │ Chainlink     │    │ Chainlink     │
│ ETH/USD       │    │ ETH/USD       │    │ ETH/USD       │
└───────────────┘    └───────────────┘    └───────────────┘
```

---

## 📁 Estructura de Archivos

```
multichain-arb/
├── package.json
├── tsconfig.json
├── README.md
├── contracts/
│   └── ArbExecutor.sol          # Contrato de ejecución atómica
├── scripts/
│   └── deploy.ts                # Script de despliegue
└── src/
    ├── index.ts                 # Controller principal
    ├── config.ts                # Configuración y variables
    ├── logger.ts                # Sistema de logging
    ├── db.ts                    # Base de datos SQLite
    ├── ai/
    │   └── bandit.ts            # IA Thompson Sampling
    ├── oracle/
    │   ├── chainlink.ts         # Integración Chainlink
    │   └── price.ts             # Utilidades de precio
    ├── dex/
    │   ├── univ3.ts             # Integración Uniswap V3
    │   └── routes.ts            # Configuración de rutas
    └── worker/
        ├── worker.ts            # Worker por cadena
        ├── strategy.ts          # Estrategia de búsqueda
        ├── simulator.ts         # Simulador de trades
        └── executor.ts          # Ejecutor de transacciones
```

---

## 🚀 Instalación

### 1. Instalar dependencias

```bash
cd src/modules/DeFiProtocols/multichain-arb
npm install
```

### 2. Configurar variables de entorno

Crea un archivo `.env` basado en `.env.example`:

```env
# Wallet
PRIVATE_KEY=0x...

# Timing
TICK_MS=700
DECISION_MS=5000

# Trading
MIN_PROFIT_USD=0.50
GAS_MULT=1.7

# Chains
CHAINS=base,arbitrum,optimism,polygon

# RPCs (usa tus propios endpoints)
BASE_RPC_READ=https://...
BASE_RPC_SIM=https://...
BASE_RPC_SEND=https://...
BASE_RPC_WS=wss://...

ARB_RPC_READ=https://...
# ... etc
```

### 3. Compilar el contrato

```bash
# Instalar Hardhat si no lo tienes
npm install --save-dev hardhat @nomicfoundation/hardhat-toolbox

# Compilar
npx hardhat compile
```

### 4. Desplegar el contrato

```bash
npx tsx scripts/deploy.ts base arbitrum optimism polygon
```

### 5. Ejecutar el bot

```bash
# Desarrollo (con hot reload)
npm run dev

# Producción
npm run build
npm start
```

---

## ⚙️ Configuración

### Variables de Entorno

| Variable | Descripción | Default |
|----------|-------------|---------|
| `PRIVATE_KEY` | Clave privada de la wallet | (requerido) |
| `TICK_MS` | Intervalo entre scans (ms) | 700 |
| `DECISION_MS` | Intervalo de rotación IA (ms) | 5000 |
| `MIN_PROFIT_USD` | Ganancia mínima en USD | 0.50 |
| `GAS_MULT` | Multiplicador de gas mínimo | 1.7 |
| `MAX_SLIPPAGE_BPS` | Slippage máximo (bps) | 10 |
| `CHAINS` | Cadenas habilitadas | base,arbitrum |
| `DRY_RUN` | Modo simulación | false |

### Rutas de Arbitraje

Edita `src/dex/routes.ts` para agregar/modificar rutas:

```typescript
{
  name: "USDC→WETH→USDT (500/500)",
  tokenIn: TOKENS.arbitrum.USDC,
  tokenMid: TOKENS.arbitrum.WETH,
  tokenOut: TOKENS.arbitrum.USDT,
  fee1: FEE_TIERS.LOW,
  fee2: FEE_TIERS.LOW,
  quoterV2: DEX_ADDRESSES.arbitrum.quoterV2,
  router: DEX_ADDRESSES.arbitrum.swapRouter,
  stableDecimals: 6
}
```

---

## 🧠 IA: Thompson Sampling Bandit

El bot usa un algoritmo Multi-Armed Bandit con Thompson Sampling para decidir en qué cadena operar:

### Cómo funciona

1. **Cada cadena es un "brazo"** con parámetros α (éxitos) y β (fracasos)
2. **Antes de cada decisión**, se muestrea de una distribución Beta(α, β)
3. **Se elige la cadena** con el valor muestreado más alto
4. **Después de cada trade**, se actualiza α o β según el resultado

### Ventajas

- ✅ Balance automático entre exploración y explotación
- ✅ Aprende de la experiencia real
- ✅ Se adapta a cambios en el mercado
- ✅ No requiere datos históricos para empezar

---

## 📊 Métricas y Estadísticas

El bot almacena métricas en SQLite:

```sql
-- Métricas por operación
SELECT * FROM chain_metrics ORDER BY ts DESC LIMIT 100;

-- Estadísticas por cadena
SELECT 
  chain,
  COUNT(*) as trades,
  SUM(profit_usd) as total_profit,
  AVG(latency_ms) as avg_latency
FROM chain_metrics
GROUP BY chain;

-- Estado del Bandit
SELECT * FROM bandit_state;
```

---

## 🔧 Lo que TÚ debes configurar

### 1. RPCs Privados

Los RPCs públicos son lentos y tienen límites. Necesitas:

- **Alchemy** o **Infura** para cada cadena
- O **nodos propios** para latencia mínima

### 2. Desplegar Contratos

```bash
# Compilar
npx hardhat compile

# Desplegar (actualiza el bytecode en deploy.ts)
npx tsx scripts/deploy.ts base arbitrum
```

### 3. Fondear Wallet

Necesitas en cada cadena:
- **Gas**: ~0.01 ETH (o MATIC en Polygon)
- **Capital**: USDC/USDT para operar (mínimo $100 recomendado)

### 4. Aprobar Tokens

El contrato ArbExecutor necesita aprobación para gastar tus tokens:

```javascript
// Ejemplo con ethers.js
const usdc = new Contract(USDC_ADDRESS, ERC20_ABI, signer);
await usdc.approve(EXECUTOR_ADDRESS, ethers.MaxUint256);
```

### 5. Ajustar Parámetros

Monitorea y ajusta según resultados:
- `MIN_PROFIT_USD`: Aumentar si hay muchos trades fallidos
- `GAS_MULT`: Aumentar en períodos de alta volatilidad de gas
- `TICK_MS`: Reducir para más velocidad (más consumo de RPC)

---

## ⚠️ Consideraciones Importantes

### Seguridad

- 🔐 **NUNCA** compartas tu `PRIVATE_KEY`
- 🔐 Usa una wallet dedicada para el bot
- 🔐 Empieza con capital pequeño

### Riesgos

- 💸 **Pérdida de gas** si los trades fallan
- 💸 **Slippage** si el mercado se mueve rápido
- 💸 **Front-running** por MEV bots

### Optimizaciones Futuras

- [ ] Flashbots/MEV protection
- [ ] WebSocket para actualizaciones en tiempo real
- [ ] Multicall para reducir latencia
- [ ] Más DEXs (Curve, Balancer, SushiSwap)

---

## 📞 Soporte

Para agregar nuevas cadenas o DEXs, modifica:
1. `config.ts` - Agregar configuración de la cadena
2. `routes.ts` - Agregar direcciones de tokens y DEX
3. `chainlink.ts` - Agregar feed de precio

---

## 📄 Licencia

MIT License - Uso bajo tu propio riesgo.



## Sistema de Arbitraje Multi-Cadena con IA

Un bot de arbitraje profesional que opera en múltiples cadenas L2 (Base, Arbitrum, Optimism, Polygon) utilizando inteligencia artificial para optimizar la selección de cadenas.

---

## 📋 Características

### ✅ Implementado (Lo que hice yo)

- **🧠 AI Bandit (Thompson Sampling)** - Algoritmo de aprendizaje que decide en qué cadena operar
- **📊 Base de Datos SQLite** - Almacenamiento de métricas y estadísticas
- **🔮 Oracle Chainlink** - Conversión precisa de gas a USD
- **💱 Integración Uniswap V3** - Quoter y Router para swaps
- **🔄 Simulador** - Validación de trades antes de ejecución
- **⚡ Worker Multi-Cadena** - Ejecutores independientes por cadena
- **🎮 Controller Principal** - Orquestación con rotación IA
- **📜 Contrato ArbExecutor** - Ejecución atómica de arbitrajes
- **🛠️ Configuración Completa** - Variables de entorno y tipos TypeScript

### ⏳ Lo que TÚ debes hacer

1. **Configurar RPCs privados** (Alchemy/Infura/propios)
2. **Compilar y desplegar ArbExecutor.sol** en cada cadena
3. **Fondear la wallet** con tokens estables (USDC) y gas (ETH/MATIC)
4. **Ajustar rutas** según liquidez actual del mercado
5. **Monitorear y ajustar** parámetros de ganancia mínima

---

## 🏗️ Arquitectura

```
┌─────────────────────────────────────────────────────────────────┐
│                     CONTROLLER (AI Rotator)                      │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  Thompson Sampling Bandit                                │   │
│  │  • Aprende qué cadena es más rentable                   │   │
│  │  • Rota automáticamente cada DECISION_MS                │   │
│  └─────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
                              │
        ┌─────────────────────┼─────────────────────┐
        ▼                     ▼                     ▼
┌───────────────┐    ┌───────────────┐    ┌───────────────┐
│  WORKER BASE  │    │ WORKER ARBITRUM│   │ WORKER OPTIMISM│
├───────────────┤    ├───────────────┤    ├───────────────┤
│ • Quote       │    │ • Quote       │    │ • Quote       │
│ • Simulate    │    │ • Simulate    │    │ • Simulate    │
│ • Gate (gas+) │    │ • Gate (gas+) │    │ • Gate (gas+) │
│ • Execute     │    │ • Execute     │    │ • Execute     │
└───────────────┘    └───────────────┘    └───────────────┘
        │                     │                     │
        ▼                     ▼                     ▼
┌───────────────┐    ┌───────────────┐    ┌───────────────┐
│ Chainlink     │    │ Chainlink     │    │ Chainlink     │
│ ETH/USD       │    │ ETH/USD       │    │ ETH/USD       │
└───────────────┘    └───────────────┘    └───────────────┘
```

---

## 📁 Estructura de Archivos

```
multichain-arb/
├── package.json
├── tsconfig.json
├── README.md
├── contracts/
│   └── ArbExecutor.sol          # Contrato de ejecución atómica
├── scripts/
│   └── deploy.ts                # Script de despliegue
└── src/
    ├── index.ts                 # Controller principal
    ├── config.ts                # Configuración y variables
    ├── logger.ts                # Sistema de logging
    ├── db.ts                    # Base de datos SQLite
    ├── ai/
    │   └── bandit.ts            # IA Thompson Sampling
    ├── oracle/
    │   ├── chainlink.ts         # Integración Chainlink
    │   └── price.ts             # Utilidades de precio
    ├── dex/
    │   ├── univ3.ts             # Integración Uniswap V3
    │   └── routes.ts            # Configuración de rutas
    └── worker/
        ├── worker.ts            # Worker por cadena
        ├── strategy.ts          # Estrategia de búsqueda
        ├── simulator.ts         # Simulador de trades
        └── executor.ts          # Ejecutor de transacciones
```

---

## 🚀 Instalación

### 1. Instalar dependencias

```bash
cd src/modules/DeFiProtocols/multichain-arb
npm install
```

### 2. Configurar variables de entorno

Crea un archivo `.env` basado en `.env.example`:

```env
# Wallet
PRIVATE_KEY=0x...

# Timing
TICK_MS=700
DECISION_MS=5000

# Trading
MIN_PROFIT_USD=0.50
GAS_MULT=1.7

# Chains
CHAINS=base,arbitrum,optimism,polygon

# RPCs (usa tus propios endpoints)
BASE_RPC_READ=https://...
BASE_RPC_SIM=https://...
BASE_RPC_SEND=https://...
BASE_RPC_WS=wss://...

ARB_RPC_READ=https://...
# ... etc
```

### 3. Compilar el contrato

```bash
# Instalar Hardhat si no lo tienes
npm install --save-dev hardhat @nomicfoundation/hardhat-toolbox

# Compilar
npx hardhat compile
```

### 4. Desplegar el contrato

```bash
npx tsx scripts/deploy.ts base arbitrum optimism polygon
```

### 5. Ejecutar el bot

```bash
# Desarrollo (con hot reload)
npm run dev

# Producción
npm run build
npm start
```

---

## ⚙️ Configuración

### Variables de Entorno

| Variable | Descripción | Default |
|----------|-------------|---------|
| `PRIVATE_KEY` | Clave privada de la wallet | (requerido) |
| `TICK_MS` | Intervalo entre scans (ms) | 700 |
| `DECISION_MS` | Intervalo de rotación IA (ms) | 5000 |
| `MIN_PROFIT_USD` | Ganancia mínima en USD | 0.50 |
| `GAS_MULT` | Multiplicador de gas mínimo | 1.7 |
| `MAX_SLIPPAGE_BPS` | Slippage máximo (bps) | 10 |
| `CHAINS` | Cadenas habilitadas | base,arbitrum |
| `DRY_RUN` | Modo simulación | false |

### Rutas de Arbitraje

Edita `src/dex/routes.ts` para agregar/modificar rutas:

```typescript
{
  name: "USDC→WETH→USDT (500/500)",
  tokenIn: TOKENS.arbitrum.USDC,
  tokenMid: TOKENS.arbitrum.WETH,
  tokenOut: TOKENS.arbitrum.USDT,
  fee1: FEE_TIERS.LOW,
  fee2: FEE_TIERS.LOW,
  quoterV2: DEX_ADDRESSES.arbitrum.quoterV2,
  router: DEX_ADDRESSES.arbitrum.swapRouter,
  stableDecimals: 6
}
```

---

## 🧠 IA: Thompson Sampling Bandit

El bot usa un algoritmo Multi-Armed Bandit con Thompson Sampling para decidir en qué cadena operar:

### Cómo funciona

1. **Cada cadena es un "brazo"** con parámetros α (éxitos) y β (fracasos)
2. **Antes de cada decisión**, se muestrea de una distribución Beta(α, β)
3. **Se elige la cadena** con el valor muestreado más alto
4. **Después de cada trade**, se actualiza α o β según el resultado

### Ventajas

- ✅ Balance automático entre exploración y explotación
- ✅ Aprende de la experiencia real
- ✅ Se adapta a cambios en el mercado
- ✅ No requiere datos históricos para empezar

---

## 📊 Métricas y Estadísticas

El bot almacena métricas en SQLite:

```sql
-- Métricas por operación
SELECT * FROM chain_metrics ORDER BY ts DESC LIMIT 100;

-- Estadísticas por cadena
SELECT 
  chain,
  COUNT(*) as trades,
  SUM(profit_usd) as total_profit,
  AVG(latency_ms) as avg_latency
FROM chain_metrics
GROUP BY chain;

-- Estado del Bandit
SELECT * FROM bandit_state;
```

---

## 🔧 Lo que TÚ debes configurar

### 1. RPCs Privados

Los RPCs públicos son lentos y tienen límites. Necesitas:

- **Alchemy** o **Infura** para cada cadena
- O **nodos propios** para latencia mínima

### 2. Desplegar Contratos

```bash
# Compilar
npx hardhat compile

# Desplegar (actualiza el bytecode en deploy.ts)
npx tsx scripts/deploy.ts base arbitrum
```

### 3. Fondear Wallet

Necesitas en cada cadena:
- **Gas**: ~0.01 ETH (o MATIC en Polygon)
- **Capital**: USDC/USDT para operar (mínimo $100 recomendado)

### 4. Aprobar Tokens

El contrato ArbExecutor necesita aprobación para gastar tus tokens:

```javascript
// Ejemplo con ethers.js
const usdc = new Contract(USDC_ADDRESS, ERC20_ABI, signer);
await usdc.approve(EXECUTOR_ADDRESS, ethers.MaxUint256);
```

### 5. Ajustar Parámetros

Monitorea y ajusta según resultados:
- `MIN_PROFIT_USD`: Aumentar si hay muchos trades fallidos
- `GAS_MULT`: Aumentar en períodos de alta volatilidad de gas
- `TICK_MS`: Reducir para más velocidad (más consumo de RPC)

---

## ⚠️ Consideraciones Importantes

### Seguridad

- 🔐 **NUNCA** compartas tu `PRIVATE_KEY`
- 🔐 Usa una wallet dedicada para el bot
- 🔐 Empieza con capital pequeño

### Riesgos

- 💸 **Pérdida de gas** si los trades fallan
- 💸 **Slippage** si el mercado se mueve rápido
- 💸 **Front-running** por MEV bots

### Optimizaciones Futuras

- [ ] Flashbots/MEV protection
- [ ] WebSocket para actualizaciones en tiempo real
- [ ] Multicall para reducir latencia
- [ ] Más DEXs (Curve, Balancer, SushiSwap)

---

## 📞 Soporte

Para agregar nuevas cadenas o DEXs, modifica:
1. `config.ts` - Agregar configuración de la cadena
2. `routes.ts` - Agregar direcciones de tokens y DEX
3. `chainlink.ts` - Agregar feed de precio

---

## 📄 Licencia

MIT License - Uso bajo tu propio riesgo.




## Sistema de Arbitraje Multi-Cadena con IA

Un bot de arbitraje profesional que opera en múltiples cadenas L2 (Base, Arbitrum, Optimism, Polygon) utilizando inteligencia artificial para optimizar la selección de cadenas.

---

## 📋 Características

### ✅ Implementado (Lo que hice yo)

- **🧠 AI Bandit (Thompson Sampling)** - Algoritmo de aprendizaje que decide en qué cadena operar
- **📊 Base de Datos SQLite** - Almacenamiento de métricas y estadísticas
- **🔮 Oracle Chainlink** - Conversión precisa de gas a USD
- **💱 Integración Uniswap V3** - Quoter y Router para swaps
- **🔄 Simulador** - Validación de trades antes de ejecución
- **⚡ Worker Multi-Cadena** - Ejecutores independientes por cadena
- **🎮 Controller Principal** - Orquestación con rotación IA
- **📜 Contrato ArbExecutor** - Ejecución atómica de arbitrajes
- **🛠️ Configuración Completa** - Variables de entorno y tipos TypeScript

### ⏳ Lo que TÚ debes hacer

1. **Configurar RPCs privados** (Alchemy/Infura/propios)
2. **Compilar y desplegar ArbExecutor.sol** en cada cadena
3. **Fondear la wallet** con tokens estables (USDC) y gas (ETH/MATIC)
4. **Ajustar rutas** según liquidez actual del mercado
5. **Monitorear y ajustar** parámetros de ganancia mínima

---

## 🏗️ Arquitectura

```
┌─────────────────────────────────────────────────────────────────┐
│                     CONTROLLER (AI Rotator)                      │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  Thompson Sampling Bandit                                │   │
│  │  • Aprende qué cadena es más rentable                   │   │
│  │  • Rota automáticamente cada DECISION_MS                │   │
│  └─────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
                              │
        ┌─────────────────────┼─────────────────────┐
        ▼                     ▼                     ▼
┌───────────────┐    ┌───────────────┐    ┌───────────────┐
│  WORKER BASE  │    │ WORKER ARBITRUM│   │ WORKER OPTIMISM│
├───────────────┤    ├───────────────┤    ├───────────────┤
│ • Quote       │    │ • Quote       │    │ • Quote       │
│ • Simulate    │    │ • Simulate    │    │ • Simulate    │
│ • Gate (gas+) │    │ • Gate (gas+) │    │ • Gate (gas+) │
│ • Execute     │    │ • Execute     │    │ • Execute     │
└───────────────┘    └───────────────┘    └───────────────┘
        │                     │                     │
        ▼                     ▼                     ▼
┌───────────────┐    ┌───────────────┐    ┌───────────────┐
│ Chainlink     │    │ Chainlink     │    │ Chainlink     │
│ ETH/USD       │    │ ETH/USD       │    │ ETH/USD       │
└───────────────┘    └───────────────┘    └───────────────┘
```

---

## 📁 Estructura de Archivos

```
multichain-arb/
├── package.json
├── tsconfig.json
├── README.md
├── contracts/
│   └── ArbExecutor.sol          # Contrato de ejecución atómica
├── scripts/
│   └── deploy.ts                # Script de despliegue
└── src/
    ├── index.ts                 # Controller principal
    ├── config.ts                # Configuración y variables
    ├── logger.ts                # Sistema de logging
    ├── db.ts                    # Base de datos SQLite
    ├── ai/
    │   └── bandit.ts            # IA Thompson Sampling
    ├── oracle/
    │   ├── chainlink.ts         # Integración Chainlink
    │   └── price.ts             # Utilidades de precio
    ├── dex/
    │   ├── univ3.ts             # Integración Uniswap V3
    │   └── routes.ts            # Configuración de rutas
    └── worker/
        ├── worker.ts            # Worker por cadena
        ├── strategy.ts          # Estrategia de búsqueda
        ├── simulator.ts         # Simulador de trades
        └── executor.ts          # Ejecutor de transacciones
```

---

## 🚀 Instalación

### 1. Instalar dependencias

```bash
cd src/modules/DeFiProtocols/multichain-arb
npm install
```

### 2. Configurar variables de entorno

Crea un archivo `.env` basado en `.env.example`:

```env
# Wallet
PRIVATE_KEY=0x...

# Timing
TICK_MS=700
DECISION_MS=5000

# Trading
MIN_PROFIT_USD=0.50
GAS_MULT=1.7

# Chains
CHAINS=base,arbitrum,optimism,polygon

# RPCs (usa tus propios endpoints)
BASE_RPC_READ=https://...
BASE_RPC_SIM=https://...
BASE_RPC_SEND=https://...
BASE_RPC_WS=wss://...

ARB_RPC_READ=https://...
# ... etc
```

### 3. Compilar el contrato

```bash
# Instalar Hardhat si no lo tienes
npm install --save-dev hardhat @nomicfoundation/hardhat-toolbox

# Compilar
npx hardhat compile
```

### 4. Desplegar el contrato

```bash
npx tsx scripts/deploy.ts base arbitrum optimism polygon
```

### 5. Ejecutar el bot

```bash
# Desarrollo (con hot reload)
npm run dev

# Producción
npm run build
npm start
```

---

## ⚙️ Configuración

### Variables de Entorno

| Variable | Descripción | Default |
|----------|-------------|---------|
| `PRIVATE_KEY` | Clave privada de la wallet | (requerido) |
| `TICK_MS` | Intervalo entre scans (ms) | 700 |
| `DECISION_MS` | Intervalo de rotación IA (ms) | 5000 |
| `MIN_PROFIT_USD` | Ganancia mínima en USD | 0.50 |
| `GAS_MULT` | Multiplicador de gas mínimo | 1.7 |
| `MAX_SLIPPAGE_BPS` | Slippage máximo (bps) | 10 |
| `CHAINS` | Cadenas habilitadas | base,arbitrum |
| `DRY_RUN` | Modo simulación | false |

### Rutas de Arbitraje

Edita `src/dex/routes.ts` para agregar/modificar rutas:

```typescript
{
  name: "USDC→WETH→USDT (500/500)",
  tokenIn: TOKENS.arbitrum.USDC,
  tokenMid: TOKENS.arbitrum.WETH,
  tokenOut: TOKENS.arbitrum.USDT,
  fee1: FEE_TIERS.LOW,
  fee2: FEE_TIERS.LOW,
  quoterV2: DEX_ADDRESSES.arbitrum.quoterV2,
  router: DEX_ADDRESSES.arbitrum.swapRouter,
  stableDecimals: 6
}
```

---

## 🧠 IA: Thompson Sampling Bandit

El bot usa un algoritmo Multi-Armed Bandit con Thompson Sampling para decidir en qué cadena operar:

### Cómo funciona

1. **Cada cadena es un "brazo"** con parámetros α (éxitos) y β (fracasos)
2. **Antes de cada decisión**, se muestrea de una distribución Beta(α, β)
3. **Se elige la cadena** con el valor muestreado más alto
4. **Después de cada trade**, se actualiza α o β según el resultado

### Ventajas

- ✅ Balance automático entre exploración y explotación
- ✅ Aprende de la experiencia real
- ✅ Se adapta a cambios en el mercado
- ✅ No requiere datos históricos para empezar

---

## 📊 Métricas y Estadísticas

El bot almacena métricas en SQLite:

```sql
-- Métricas por operación
SELECT * FROM chain_metrics ORDER BY ts DESC LIMIT 100;

-- Estadísticas por cadena
SELECT 
  chain,
  COUNT(*) as trades,
  SUM(profit_usd) as total_profit,
  AVG(latency_ms) as avg_latency
FROM chain_metrics
GROUP BY chain;

-- Estado del Bandit
SELECT * FROM bandit_state;
```

---

## 🔧 Lo que TÚ debes configurar

### 1. RPCs Privados

Los RPCs públicos son lentos y tienen límites. Necesitas:

- **Alchemy** o **Infura** para cada cadena
- O **nodos propios** para latencia mínima

### 2. Desplegar Contratos

```bash
# Compilar
npx hardhat compile

# Desplegar (actualiza el bytecode en deploy.ts)
npx tsx scripts/deploy.ts base arbitrum
```

### 3. Fondear Wallet

Necesitas en cada cadena:
- **Gas**: ~0.01 ETH (o MATIC en Polygon)
- **Capital**: USDC/USDT para operar (mínimo $100 recomendado)

### 4. Aprobar Tokens

El contrato ArbExecutor necesita aprobación para gastar tus tokens:

```javascript
// Ejemplo con ethers.js
const usdc = new Contract(USDC_ADDRESS, ERC20_ABI, signer);
await usdc.approve(EXECUTOR_ADDRESS, ethers.MaxUint256);
```

### 5. Ajustar Parámetros

Monitorea y ajusta según resultados:
- `MIN_PROFIT_USD`: Aumentar si hay muchos trades fallidos
- `GAS_MULT`: Aumentar en períodos de alta volatilidad de gas
- `TICK_MS`: Reducir para más velocidad (más consumo de RPC)

---

## ⚠️ Consideraciones Importantes

### Seguridad

- 🔐 **NUNCA** compartas tu `PRIVATE_KEY`
- 🔐 Usa una wallet dedicada para el bot
- 🔐 Empieza con capital pequeño

### Riesgos

- 💸 **Pérdida de gas** si los trades fallan
- 💸 **Slippage** si el mercado se mueve rápido
- 💸 **Front-running** por MEV bots

### Optimizaciones Futuras

- [ ] Flashbots/MEV protection
- [ ] WebSocket para actualizaciones en tiempo real
- [ ] Multicall para reducir latencia
- [ ] Más DEXs (Curve, Balancer, SushiSwap)

---

## 📞 Soporte

Para agregar nuevas cadenas o DEXs, modifica:
1. `config.ts` - Agregar configuración de la cadena
2. `routes.ts` - Agregar direcciones de tokens y DEX
3. `chainlink.ts` - Agregar feed de precio

---

## 📄 Licencia

MIT License - Uso bajo tu propio riesgo.



## Sistema de Arbitraje Multi-Cadena con IA

Un bot de arbitraje profesional que opera en múltiples cadenas L2 (Base, Arbitrum, Optimism, Polygon) utilizando inteligencia artificial para optimizar la selección de cadenas.

---

## 📋 Características

### ✅ Implementado (Lo que hice yo)

- **🧠 AI Bandit (Thompson Sampling)** - Algoritmo de aprendizaje que decide en qué cadena operar
- **📊 Base de Datos SQLite** - Almacenamiento de métricas y estadísticas
- **🔮 Oracle Chainlink** - Conversión precisa de gas a USD
- **💱 Integración Uniswap V3** - Quoter y Router para swaps
- **🔄 Simulador** - Validación de trades antes de ejecución
- **⚡ Worker Multi-Cadena** - Ejecutores independientes por cadena
- **🎮 Controller Principal** - Orquestación con rotación IA
- **📜 Contrato ArbExecutor** - Ejecución atómica de arbitrajes
- **🛠️ Configuración Completa** - Variables de entorno y tipos TypeScript

### ⏳ Lo que TÚ debes hacer

1. **Configurar RPCs privados** (Alchemy/Infura/propios)
2. **Compilar y desplegar ArbExecutor.sol** en cada cadena
3. **Fondear la wallet** con tokens estables (USDC) y gas (ETH/MATIC)
4. **Ajustar rutas** según liquidez actual del mercado
5. **Monitorear y ajustar** parámetros de ganancia mínima

---

## 🏗️ Arquitectura

```
┌─────────────────────────────────────────────────────────────────┐
│                     CONTROLLER (AI Rotator)                      │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  Thompson Sampling Bandit                                │   │
│  │  • Aprende qué cadena es más rentable                   │   │
│  │  • Rota automáticamente cada DECISION_MS                │   │
│  └─────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
                              │
        ┌─────────────────────┼─────────────────────┐
        ▼                     ▼                     ▼
┌───────────────┐    ┌───────────────┐    ┌───────────────┐
│  WORKER BASE  │    │ WORKER ARBITRUM│   │ WORKER OPTIMISM│
├───────────────┤    ├───────────────┤    ├───────────────┤
│ • Quote       │    │ • Quote       │    │ • Quote       │
│ • Simulate    │    │ • Simulate    │    │ • Simulate    │
│ • Gate (gas+) │    │ • Gate (gas+) │    │ • Gate (gas+) │
│ • Execute     │    │ • Execute     │    │ • Execute     │
└───────────────┘    └───────────────┘    └───────────────┘
        │                     │                     │
        ▼                     ▼                     ▼
┌───────────────┐    ┌───────────────┐    ┌───────────────┐
│ Chainlink     │    │ Chainlink     │    │ Chainlink     │
│ ETH/USD       │    │ ETH/USD       │    │ ETH/USD       │
└───────────────┘    └───────────────┘    └───────────────┘
```

---

## 📁 Estructura de Archivos

```
multichain-arb/
├── package.json
├── tsconfig.json
├── README.md
├── contracts/
│   └── ArbExecutor.sol          # Contrato de ejecución atómica
├── scripts/
│   └── deploy.ts                # Script de despliegue
└── src/
    ├── index.ts                 # Controller principal
    ├── config.ts                # Configuración y variables
    ├── logger.ts                # Sistema de logging
    ├── db.ts                    # Base de datos SQLite
    ├── ai/
    │   └── bandit.ts            # IA Thompson Sampling
    ├── oracle/
    │   ├── chainlink.ts         # Integración Chainlink
    │   └── price.ts             # Utilidades de precio
    ├── dex/
    │   ├── univ3.ts             # Integración Uniswap V3
    │   └── routes.ts            # Configuración de rutas
    └── worker/
        ├── worker.ts            # Worker por cadena
        ├── strategy.ts          # Estrategia de búsqueda
        ├── simulator.ts         # Simulador de trades
        └── executor.ts          # Ejecutor de transacciones
```

---

## 🚀 Instalación

### 1. Instalar dependencias

```bash
cd src/modules/DeFiProtocols/multichain-arb
npm install
```

### 2. Configurar variables de entorno

Crea un archivo `.env` basado en `.env.example`:

```env
# Wallet
PRIVATE_KEY=0x...

# Timing
TICK_MS=700
DECISION_MS=5000

# Trading
MIN_PROFIT_USD=0.50
GAS_MULT=1.7

# Chains
CHAINS=base,arbitrum,optimism,polygon

# RPCs (usa tus propios endpoints)
BASE_RPC_READ=https://...
BASE_RPC_SIM=https://...
BASE_RPC_SEND=https://...
BASE_RPC_WS=wss://...

ARB_RPC_READ=https://...
# ... etc
```

### 3. Compilar el contrato

```bash
# Instalar Hardhat si no lo tienes
npm install --save-dev hardhat @nomicfoundation/hardhat-toolbox

# Compilar
npx hardhat compile
```

### 4. Desplegar el contrato

```bash
npx tsx scripts/deploy.ts base arbitrum optimism polygon
```

### 5. Ejecutar el bot

```bash
# Desarrollo (con hot reload)
npm run dev

# Producción
npm run build
npm start
```

---

## ⚙️ Configuración

### Variables de Entorno

| Variable | Descripción | Default |
|----------|-------------|---------|
| `PRIVATE_KEY` | Clave privada de la wallet | (requerido) |
| `TICK_MS` | Intervalo entre scans (ms) | 700 |
| `DECISION_MS` | Intervalo de rotación IA (ms) | 5000 |
| `MIN_PROFIT_USD` | Ganancia mínima en USD | 0.50 |
| `GAS_MULT` | Multiplicador de gas mínimo | 1.7 |
| `MAX_SLIPPAGE_BPS` | Slippage máximo (bps) | 10 |
| `CHAINS` | Cadenas habilitadas | base,arbitrum |
| `DRY_RUN` | Modo simulación | false |

### Rutas de Arbitraje

Edita `src/dex/routes.ts` para agregar/modificar rutas:

```typescript
{
  name: "USDC→WETH→USDT (500/500)",
  tokenIn: TOKENS.arbitrum.USDC,
  tokenMid: TOKENS.arbitrum.WETH,
  tokenOut: TOKENS.arbitrum.USDT,
  fee1: FEE_TIERS.LOW,
  fee2: FEE_TIERS.LOW,
  quoterV2: DEX_ADDRESSES.arbitrum.quoterV2,
  router: DEX_ADDRESSES.arbitrum.swapRouter,
  stableDecimals: 6
}
```

---

## 🧠 IA: Thompson Sampling Bandit

El bot usa un algoritmo Multi-Armed Bandit con Thompson Sampling para decidir en qué cadena operar:

### Cómo funciona

1. **Cada cadena es un "brazo"** con parámetros α (éxitos) y β (fracasos)
2. **Antes de cada decisión**, se muestrea de una distribución Beta(α, β)
3. **Se elige la cadena** con el valor muestreado más alto
4. **Después de cada trade**, se actualiza α o β según el resultado

### Ventajas

- ✅ Balance automático entre exploración y explotación
- ✅ Aprende de la experiencia real
- ✅ Se adapta a cambios en el mercado
- ✅ No requiere datos históricos para empezar

---

## 📊 Métricas y Estadísticas

El bot almacena métricas en SQLite:

```sql
-- Métricas por operación
SELECT * FROM chain_metrics ORDER BY ts DESC LIMIT 100;

-- Estadísticas por cadena
SELECT 
  chain,
  COUNT(*) as trades,
  SUM(profit_usd) as total_profit,
  AVG(latency_ms) as avg_latency
FROM chain_metrics
GROUP BY chain;

-- Estado del Bandit
SELECT * FROM bandit_state;
```

---

## 🔧 Lo que TÚ debes configurar

### 1. RPCs Privados

Los RPCs públicos son lentos y tienen límites. Necesitas:

- **Alchemy** o **Infura** para cada cadena
- O **nodos propios** para latencia mínima

### 2. Desplegar Contratos

```bash
# Compilar
npx hardhat compile

# Desplegar (actualiza el bytecode en deploy.ts)
npx tsx scripts/deploy.ts base arbitrum
```

### 3. Fondear Wallet

Necesitas en cada cadena:
- **Gas**: ~0.01 ETH (o MATIC en Polygon)
- **Capital**: USDC/USDT para operar (mínimo $100 recomendado)

### 4. Aprobar Tokens

El contrato ArbExecutor necesita aprobación para gastar tus tokens:

```javascript
// Ejemplo con ethers.js
const usdc = new Contract(USDC_ADDRESS, ERC20_ABI, signer);
await usdc.approve(EXECUTOR_ADDRESS, ethers.MaxUint256);
```

### 5. Ajustar Parámetros

Monitorea y ajusta según resultados:
- `MIN_PROFIT_USD`: Aumentar si hay muchos trades fallidos
- `GAS_MULT`: Aumentar en períodos de alta volatilidad de gas
- `TICK_MS`: Reducir para más velocidad (más consumo de RPC)

---

## ⚠️ Consideraciones Importantes

### Seguridad

- 🔐 **NUNCA** compartas tu `PRIVATE_KEY`
- 🔐 Usa una wallet dedicada para el bot
- 🔐 Empieza con capital pequeño

### Riesgos

- 💸 **Pérdida de gas** si los trades fallan
- 💸 **Slippage** si el mercado se mueve rápido
- 💸 **Front-running** por MEV bots

### Optimizaciones Futuras

- [ ] Flashbots/MEV protection
- [ ] WebSocket para actualizaciones en tiempo real
- [ ] Multicall para reducir latencia
- [ ] Más DEXs (Curve, Balancer, SushiSwap)

---

## 📞 Soporte

Para agregar nuevas cadenas o DEXs, modifica:
1. `config.ts` - Agregar configuración de la cadena
2. `routes.ts` - Agregar direcciones de tokens y DEX
3. `chainlink.ts` - Agregar feed de precio

---

## 📄 Licencia

MIT License - Uso bajo tu propio riesgo.



## Sistema de Arbitraje Multi-Cadena con IA

Un bot de arbitraje profesional que opera en múltiples cadenas L2 (Base, Arbitrum, Optimism, Polygon) utilizando inteligencia artificial para optimizar la selección de cadenas.

---

## 📋 Características

### ✅ Implementado (Lo que hice yo)

- **🧠 AI Bandit (Thompson Sampling)** - Algoritmo de aprendizaje que decide en qué cadena operar
- **📊 Base de Datos SQLite** - Almacenamiento de métricas y estadísticas
- **🔮 Oracle Chainlink** - Conversión precisa de gas a USD
- **💱 Integración Uniswap V3** - Quoter y Router para swaps
- **🔄 Simulador** - Validación de trades antes de ejecución
- **⚡ Worker Multi-Cadena** - Ejecutores independientes por cadena
- **🎮 Controller Principal** - Orquestación con rotación IA
- **📜 Contrato ArbExecutor** - Ejecución atómica de arbitrajes
- **🛠️ Configuración Completa** - Variables de entorno y tipos TypeScript

### ⏳ Lo que TÚ debes hacer

1. **Configurar RPCs privados** (Alchemy/Infura/propios)
2. **Compilar y desplegar ArbExecutor.sol** en cada cadena
3. **Fondear la wallet** con tokens estables (USDC) y gas (ETH/MATIC)
4. **Ajustar rutas** según liquidez actual del mercado
5. **Monitorear y ajustar** parámetros de ganancia mínima

---

## 🏗️ Arquitectura

```
┌─────────────────────────────────────────────────────────────────┐
│                     CONTROLLER (AI Rotator)                      │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  Thompson Sampling Bandit                                │   │
│  │  • Aprende qué cadena es más rentable                   │   │
│  │  • Rota automáticamente cada DECISION_MS                │   │
│  └─────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
                              │
        ┌─────────────────────┼─────────────────────┐
        ▼                     ▼                     ▼
┌───────────────┐    ┌───────────────┐    ┌───────────────┐
│  WORKER BASE  │    │ WORKER ARBITRUM│   │ WORKER OPTIMISM│
├───────────────┤    ├───────────────┤    ├───────────────┤
│ • Quote       │    │ • Quote       │    │ • Quote       │
│ • Simulate    │    │ • Simulate    │    │ • Simulate    │
│ • Gate (gas+) │    │ • Gate (gas+) │    │ • Gate (gas+) │
│ • Execute     │    │ • Execute     │    │ • Execute     │
└───────────────┘    └───────────────┘    └───────────────┘
        │                     │                     │
        ▼                     ▼                     ▼
┌───────────────┐    ┌───────────────┐    ┌───────────────┐
│ Chainlink     │    │ Chainlink     │    │ Chainlink     │
│ ETH/USD       │    │ ETH/USD       │    │ ETH/USD       │
└───────────────┘    └───────────────┘    └───────────────┘
```

---

## 📁 Estructura de Archivos

```
multichain-arb/
├── package.json
├── tsconfig.json
├── README.md
├── contracts/
│   └── ArbExecutor.sol          # Contrato de ejecución atómica
├── scripts/
│   └── deploy.ts                # Script de despliegue
└── src/
    ├── index.ts                 # Controller principal
    ├── config.ts                # Configuración y variables
    ├── logger.ts                # Sistema de logging
    ├── db.ts                    # Base de datos SQLite
    ├── ai/
    │   └── bandit.ts            # IA Thompson Sampling
    ├── oracle/
    │   ├── chainlink.ts         # Integración Chainlink
    │   └── price.ts             # Utilidades de precio
    ├── dex/
    │   ├── univ3.ts             # Integración Uniswap V3
    │   └── routes.ts            # Configuración de rutas
    └── worker/
        ├── worker.ts            # Worker por cadena
        ├── strategy.ts          # Estrategia de búsqueda
        ├── simulator.ts         # Simulador de trades
        └── executor.ts          # Ejecutor de transacciones
```

---

## 🚀 Instalación

### 1. Instalar dependencias

```bash
cd src/modules/DeFiProtocols/multichain-arb
npm install
```

### 2. Configurar variables de entorno

Crea un archivo `.env` basado en `.env.example`:

```env
# Wallet
PRIVATE_KEY=0x...

# Timing
TICK_MS=700
DECISION_MS=5000

# Trading
MIN_PROFIT_USD=0.50
GAS_MULT=1.7

# Chains
CHAINS=base,arbitrum,optimism,polygon

# RPCs (usa tus propios endpoints)
BASE_RPC_READ=https://...
BASE_RPC_SIM=https://...
BASE_RPC_SEND=https://...
BASE_RPC_WS=wss://...

ARB_RPC_READ=https://...
# ... etc
```

### 3. Compilar el contrato

```bash
# Instalar Hardhat si no lo tienes
npm install --save-dev hardhat @nomicfoundation/hardhat-toolbox

# Compilar
npx hardhat compile
```

### 4. Desplegar el contrato

```bash
npx tsx scripts/deploy.ts base arbitrum optimism polygon
```

### 5. Ejecutar el bot

```bash
# Desarrollo (con hot reload)
npm run dev

# Producción
npm run build
npm start
```

---

## ⚙️ Configuración

### Variables de Entorno

| Variable | Descripción | Default |
|----------|-------------|---------|
| `PRIVATE_KEY` | Clave privada de la wallet | (requerido) |
| `TICK_MS` | Intervalo entre scans (ms) | 700 |
| `DECISION_MS` | Intervalo de rotación IA (ms) | 5000 |
| `MIN_PROFIT_USD` | Ganancia mínima en USD | 0.50 |
| `GAS_MULT` | Multiplicador de gas mínimo | 1.7 |
| `MAX_SLIPPAGE_BPS` | Slippage máximo (bps) | 10 |
| `CHAINS` | Cadenas habilitadas | base,arbitrum |
| `DRY_RUN` | Modo simulación | false |

### Rutas de Arbitraje

Edita `src/dex/routes.ts` para agregar/modificar rutas:

```typescript
{
  name: "USDC→WETH→USDT (500/500)",
  tokenIn: TOKENS.arbitrum.USDC,
  tokenMid: TOKENS.arbitrum.WETH,
  tokenOut: TOKENS.arbitrum.USDT,
  fee1: FEE_TIERS.LOW,
  fee2: FEE_TIERS.LOW,
  quoterV2: DEX_ADDRESSES.arbitrum.quoterV2,
  router: DEX_ADDRESSES.arbitrum.swapRouter,
  stableDecimals: 6
}
```

---

## 🧠 IA: Thompson Sampling Bandit

El bot usa un algoritmo Multi-Armed Bandit con Thompson Sampling para decidir en qué cadena operar:

### Cómo funciona

1. **Cada cadena es un "brazo"** con parámetros α (éxitos) y β (fracasos)
2. **Antes de cada decisión**, se muestrea de una distribución Beta(α, β)
3. **Se elige la cadena** con el valor muestreado más alto
4. **Después de cada trade**, se actualiza α o β según el resultado

### Ventajas

- ✅ Balance automático entre exploración y explotación
- ✅ Aprende de la experiencia real
- ✅ Se adapta a cambios en el mercado
- ✅ No requiere datos históricos para empezar

---

## 📊 Métricas y Estadísticas

El bot almacena métricas en SQLite:

```sql
-- Métricas por operación
SELECT * FROM chain_metrics ORDER BY ts DESC LIMIT 100;

-- Estadísticas por cadena
SELECT 
  chain,
  COUNT(*) as trades,
  SUM(profit_usd) as total_profit,
  AVG(latency_ms) as avg_latency
FROM chain_metrics
GROUP BY chain;

-- Estado del Bandit
SELECT * FROM bandit_state;
```

---

## 🔧 Lo que TÚ debes configurar

### 1. RPCs Privados

Los RPCs públicos son lentos y tienen límites. Necesitas:

- **Alchemy** o **Infura** para cada cadena
- O **nodos propios** para latencia mínima

### 2. Desplegar Contratos

```bash
# Compilar
npx hardhat compile

# Desplegar (actualiza el bytecode en deploy.ts)
npx tsx scripts/deploy.ts base arbitrum
```

### 3. Fondear Wallet

Necesitas en cada cadena:
- **Gas**: ~0.01 ETH (o MATIC en Polygon)
- **Capital**: USDC/USDT para operar (mínimo $100 recomendado)

### 4. Aprobar Tokens

El contrato ArbExecutor necesita aprobación para gastar tus tokens:

```javascript
// Ejemplo con ethers.js
const usdc = new Contract(USDC_ADDRESS, ERC20_ABI, signer);
await usdc.approve(EXECUTOR_ADDRESS, ethers.MaxUint256);
```

### 5. Ajustar Parámetros

Monitorea y ajusta según resultados:
- `MIN_PROFIT_USD`: Aumentar si hay muchos trades fallidos
- `GAS_MULT`: Aumentar en períodos de alta volatilidad de gas
- `TICK_MS`: Reducir para más velocidad (más consumo de RPC)

---

## ⚠️ Consideraciones Importantes

### Seguridad

- 🔐 **NUNCA** compartas tu `PRIVATE_KEY`
- 🔐 Usa una wallet dedicada para el bot
- 🔐 Empieza con capital pequeño

### Riesgos

- 💸 **Pérdida de gas** si los trades fallan
- 💸 **Slippage** si el mercado se mueve rápido
- 💸 **Front-running** por MEV bots

### Optimizaciones Futuras

- [ ] Flashbots/MEV protection
- [ ] WebSocket para actualizaciones en tiempo real
- [ ] Multicall para reducir latencia
- [ ] Más DEXs (Curve, Balancer, SushiSwap)

---

## 📞 Soporte

Para agregar nuevas cadenas o DEXs, modifica:
1. `config.ts` - Agregar configuración de la cadena
2. `routes.ts` - Agregar direcciones de tokens y DEX
3. `chainlink.ts` - Agregar feed de precio

---

## 📄 Licencia

MIT License - Uso bajo tu propio riesgo.



## Sistema de Arbitraje Multi-Cadena con IA

Un bot de arbitraje profesional que opera en múltiples cadenas L2 (Base, Arbitrum, Optimism, Polygon) utilizando inteligencia artificial para optimizar la selección de cadenas.

---

## 📋 Características

### ✅ Implementado (Lo que hice yo)

- **🧠 AI Bandit (Thompson Sampling)** - Algoritmo de aprendizaje que decide en qué cadena operar
- **📊 Base de Datos SQLite** - Almacenamiento de métricas y estadísticas
- **🔮 Oracle Chainlink** - Conversión precisa de gas a USD
- **💱 Integración Uniswap V3** - Quoter y Router para swaps
- **🔄 Simulador** - Validación de trades antes de ejecución
- **⚡ Worker Multi-Cadena** - Ejecutores independientes por cadena
- **🎮 Controller Principal** - Orquestación con rotación IA
- **📜 Contrato ArbExecutor** - Ejecución atómica de arbitrajes
- **🛠️ Configuración Completa** - Variables de entorno y tipos TypeScript

### ⏳ Lo que TÚ debes hacer

1. **Configurar RPCs privados** (Alchemy/Infura/propios)
2. **Compilar y desplegar ArbExecutor.sol** en cada cadena
3. **Fondear la wallet** con tokens estables (USDC) y gas (ETH/MATIC)
4. **Ajustar rutas** según liquidez actual del mercado
5. **Monitorear y ajustar** parámetros de ganancia mínima

---

## 🏗️ Arquitectura

```
┌─────────────────────────────────────────────────────────────────┐
│                     CONTROLLER (AI Rotator)                      │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  Thompson Sampling Bandit                                │   │
│  │  • Aprende qué cadena es más rentable                   │   │
│  │  • Rota automáticamente cada DECISION_MS                │   │
│  └─────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
                              │
        ┌─────────────────────┼─────────────────────┐
        ▼                     ▼                     ▼
┌───────────────┐    ┌───────────────┐    ┌───────────────┐
│  WORKER BASE  │    │ WORKER ARBITRUM│   │ WORKER OPTIMISM│
├───────────────┤    ├───────────────┤    ├───────────────┤
│ • Quote       │    │ • Quote       │    │ • Quote       │
│ • Simulate    │    │ • Simulate    │    │ • Simulate    │
│ • Gate (gas+) │    │ • Gate (gas+) │    │ • Gate (gas+) │
│ • Execute     │    │ • Execute     │    │ • Execute     │
└───────────────┘    └───────────────┘    └───────────────┘
        │                     │                     │
        ▼                     ▼                     ▼
┌───────────────┐    ┌───────────────┐    ┌───────────────┐
│ Chainlink     │    │ Chainlink     │    │ Chainlink     │
│ ETH/USD       │    │ ETH/USD       │    │ ETH/USD       │
└───────────────┘    └───────────────┘    └───────────────┘
```

---

## 📁 Estructura de Archivos

```
multichain-arb/
├── package.json
├── tsconfig.json
├── README.md
├── contracts/
│   └── ArbExecutor.sol          # Contrato de ejecución atómica
├── scripts/
│   └── deploy.ts                # Script de despliegue
└── src/
    ├── index.ts                 # Controller principal
    ├── config.ts                # Configuración y variables
    ├── logger.ts                # Sistema de logging
    ├── db.ts                    # Base de datos SQLite
    ├── ai/
    │   └── bandit.ts            # IA Thompson Sampling
    ├── oracle/
    │   ├── chainlink.ts         # Integración Chainlink
    │   └── price.ts             # Utilidades de precio
    ├── dex/
    │   ├── univ3.ts             # Integración Uniswap V3
    │   └── routes.ts            # Configuración de rutas
    └── worker/
        ├── worker.ts            # Worker por cadena
        ├── strategy.ts          # Estrategia de búsqueda
        ├── simulator.ts         # Simulador de trades
        └── executor.ts          # Ejecutor de transacciones
```

---

## 🚀 Instalación

### 1. Instalar dependencias

```bash
cd src/modules/DeFiProtocols/multichain-arb
npm install
```

### 2. Configurar variables de entorno

Crea un archivo `.env` basado en `.env.example`:

```env
# Wallet
PRIVATE_KEY=0x...

# Timing
TICK_MS=700
DECISION_MS=5000

# Trading
MIN_PROFIT_USD=0.50
GAS_MULT=1.7

# Chains
CHAINS=base,arbitrum,optimism,polygon

# RPCs (usa tus propios endpoints)
BASE_RPC_READ=https://...
BASE_RPC_SIM=https://...
BASE_RPC_SEND=https://...
BASE_RPC_WS=wss://...

ARB_RPC_READ=https://...
# ... etc
```

### 3. Compilar el contrato

```bash
# Instalar Hardhat si no lo tienes
npm install --save-dev hardhat @nomicfoundation/hardhat-toolbox

# Compilar
npx hardhat compile
```

### 4. Desplegar el contrato

```bash
npx tsx scripts/deploy.ts base arbitrum optimism polygon
```

### 5. Ejecutar el bot

```bash
# Desarrollo (con hot reload)
npm run dev

# Producción
npm run build
npm start
```

---

## ⚙️ Configuración

### Variables de Entorno

| Variable | Descripción | Default |
|----------|-------------|---------|
| `PRIVATE_KEY` | Clave privada de la wallet | (requerido) |
| `TICK_MS` | Intervalo entre scans (ms) | 700 |
| `DECISION_MS` | Intervalo de rotación IA (ms) | 5000 |
| `MIN_PROFIT_USD` | Ganancia mínima en USD | 0.50 |
| `GAS_MULT` | Multiplicador de gas mínimo | 1.7 |
| `MAX_SLIPPAGE_BPS` | Slippage máximo (bps) | 10 |
| `CHAINS` | Cadenas habilitadas | base,arbitrum |
| `DRY_RUN` | Modo simulación | false |

### Rutas de Arbitraje

Edita `src/dex/routes.ts` para agregar/modificar rutas:

```typescript
{
  name: "USDC→WETH→USDT (500/500)",
  tokenIn: TOKENS.arbitrum.USDC,
  tokenMid: TOKENS.arbitrum.WETH,
  tokenOut: TOKENS.arbitrum.USDT,
  fee1: FEE_TIERS.LOW,
  fee2: FEE_TIERS.LOW,
  quoterV2: DEX_ADDRESSES.arbitrum.quoterV2,
  router: DEX_ADDRESSES.arbitrum.swapRouter,
  stableDecimals: 6
}
```

---

## 🧠 IA: Thompson Sampling Bandit

El bot usa un algoritmo Multi-Armed Bandit con Thompson Sampling para decidir en qué cadena operar:

### Cómo funciona

1. **Cada cadena es un "brazo"** con parámetros α (éxitos) y β (fracasos)
2. **Antes de cada decisión**, se muestrea de una distribución Beta(α, β)
3. **Se elige la cadena** con el valor muestreado más alto
4. **Después de cada trade**, se actualiza α o β según el resultado

### Ventajas

- ✅ Balance automático entre exploración y explotación
- ✅ Aprende de la experiencia real
- ✅ Se adapta a cambios en el mercado
- ✅ No requiere datos históricos para empezar

---

## 📊 Métricas y Estadísticas

El bot almacena métricas en SQLite:

```sql
-- Métricas por operación
SELECT * FROM chain_metrics ORDER BY ts DESC LIMIT 100;

-- Estadísticas por cadena
SELECT 
  chain,
  COUNT(*) as trades,
  SUM(profit_usd) as total_profit,
  AVG(latency_ms) as avg_latency
FROM chain_metrics
GROUP BY chain;

-- Estado del Bandit
SELECT * FROM bandit_state;
```

---

## 🔧 Lo que TÚ debes configurar

### 1. RPCs Privados

Los RPCs públicos son lentos y tienen límites. Necesitas:

- **Alchemy** o **Infura** para cada cadena
- O **nodos propios** para latencia mínima

### 2. Desplegar Contratos

```bash
# Compilar
npx hardhat compile

# Desplegar (actualiza el bytecode en deploy.ts)
npx tsx scripts/deploy.ts base arbitrum
```

### 3. Fondear Wallet

Necesitas en cada cadena:
- **Gas**: ~0.01 ETH (o MATIC en Polygon)
- **Capital**: USDC/USDT para operar (mínimo $100 recomendado)

### 4. Aprobar Tokens

El contrato ArbExecutor necesita aprobación para gastar tus tokens:

```javascript
// Ejemplo con ethers.js
const usdc = new Contract(USDC_ADDRESS, ERC20_ABI, signer);
await usdc.approve(EXECUTOR_ADDRESS, ethers.MaxUint256);
```

### 5. Ajustar Parámetros

Monitorea y ajusta según resultados:
- `MIN_PROFIT_USD`: Aumentar si hay muchos trades fallidos
- `GAS_MULT`: Aumentar en períodos de alta volatilidad de gas
- `TICK_MS`: Reducir para más velocidad (más consumo de RPC)

---

## ⚠️ Consideraciones Importantes

### Seguridad

- 🔐 **NUNCA** compartas tu `PRIVATE_KEY`
- 🔐 Usa una wallet dedicada para el bot
- 🔐 Empieza con capital pequeño

### Riesgos

- 💸 **Pérdida de gas** si los trades fallan
- 💸 **Slippage** si el mercado se mueve rápido
- 💸 **Front-running** por MEV bots

### Optimizaciones Futuras

- [ ] Flashbots/MEV protection
- [ ] WebSocket para actualizaciones en tiempo real
- [ ] Multicall para reducir latencia
- [ ] Más DEXs (Curve, Balancer, SushiSwap)

---

## 📞 Soporte

Para agregar nuevas cadenas o DEXs, modifica:
1. `config.ts` - Agregar configuración de la cadena
2. `routes.ts` - Agregar direcciones de tokens y DEX
3. `chainlink.ts` - Agregar feed de precio

---

## 📄 Licencia

MIT License - Uso bajo tu propio riesgo.




## Sistema de Arbitraje Multi-Cadena con IA

Un bot de arbitraje profesional que opera en múltiples cadenas L2 (Base, Arbitrum, Optimism, Polygon) utilizando inteligencia artificial para optimizar la selección de cadenas.

---

## 📋 Características

### ✅ Implementado (Lo que hice yo)

- **🧠 AI Bandit (Thompson Sampling)** - Algoritmo de aprendizaje que decide en qué cadena operar
- **📊 Base de Datos SQLite** - Almacenamiento de métricas y estadísticas
- **🔮 Oracle Chainlink** - Conversión precisa de gas a USD
- **💱 Integración Uniswap V3** - Quoter y Router para swaps
- **🔄 Simulador** - Validación de trades antes de ejecución
- **⚡ Worker Multi-Cadena** - Ejecutores independientes por cadena
- **🎮 Controller Principal** - Orquestación con rotación IA
- **📜 Contrato ArbExecutor** - Ejecución atómica de arbitrajes
- **🛠️ Configuración Completa** - Variables de entorno y tipos TypeScript

### ⏳ Lo que TÚ debes hacer

1. **Configurar RPCs privados** (Alchemy/Infura/propios)
2. **Compilar y desplegar ArbExecutor.sol** en cada cadena
3. **Fondear la wallet** con tokens estables (USDC) y gas (ETH/MATIC)
4. **Ajustar rutas** según liquidez actual del mercado
5. **Monitorear y ajustar** parámetros de ganancia mínima

---

## 🏗️ Arquitectura

```
┌─────────────────────────────────────────────────────────────────┐
│                     CONTROLLER (AI Rotator)                      │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  Thompson Sampling Bandit                                │   │
│  │  • Aprende qué cadena es más rentable                   │   │
│  │  • Rota automáticamente cada DECISION_MS                │   │
│  └─────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
                              │
        ┌─────────────────────┼─────────────────────┐
        ▼                     ▼                     ▼
┌───────────────┐    ┌───────────────┐    ┌───────────────┐
│  WORKER BASE  │    │ WORKER ARBITRUM│   │ WORKER OPTIMISM│
├───────────────┤    ├───────────────┤    ├───────────────┤
│ • Quote       │    │ • Quote       │    │ • Quote       │
│ • Simulate    │    │ • Simulate    │    │ • Simulate    │
│ • Gate (gas+) │    │ • Gate (gas+) │    │ • Gate (gas+) │
│ • Execute     │    │ • Execute     │    │ • Execute     │
└───────────────┘    └───────────────┘    └───────────────┘
        │                     │                     │
        ▼                     ▼                     ▼
┌───────────────┐    ┌───────────────┐    ┌───────────────┐
│ Chainlink     │    │ Chainlink     │    │ Chainlink     │
│ ETH/USD       │    │ ETH/USD       │    │ ETH/USD       │
└───────────────┘    └───────────────┘    └───────────────┘
```

---

## 📁 Estructura de Archivos

```
multichain-arb/
├── package.json
├── tsconfig.json
├── README.md
├── contracts/
│   └── ArbExecutor.sol          # Contrato de ejecución atómica
├── scripts/
│   └── deploy.ts                # Script de despliegue
└── src/
    ├── index.ts                 # Controller principal
    ├── config.ts                # Configuración y variables
    ├── logger.ts                # Sistema de logging
    ├── db.ts                    # Base de datos SQLite
    ├── ai/
    │   └── bandit.ts            # IA Thompson Sampling
    ├── oracle/
    │   ├── chainlink.ts         # Integración Chainlink
    │   └── price.ts             # Utilidades de precio
    ├── dex/
    │   ├── univ3.ts             # Integración Uniswap V3
    │   └── routes.ts            # Configuración de rutas
    └── worker/
        ├── worker.ts            # Worker por cadena
        ├── strategy.ts          # Estrategia de búsqueda
        ├── simulator.ts         # Simulador de trades
        └── executor.ts          # Ejecutor de transacciones
```

---

## 🚀 Instalación

### 1. Instalar dependencias

```bash
cd src/modules/DeFiProtocols/multichain-arb
npm install
```

### 2. Configurar variables de entorno

Crea un archivo `.env` basado en `.env.example`:

```env
# Wallet
PRIVATE_KEY=0x...

# Timing
TICK_MS=700
DECISION_MS=5000

# Trading
MIN_PROFIT_USD=0.50
GAS_MULT=1.7

# Chains
CHAINS=base,arbitrum,optimism,polygon

# RPCs (usa tus propios endpoints)
BASE_RPC_READ=https://...
BASE_RPC_SIM=https://...
BASE_RPC_SEND=https://...
BASE_RPC_WS=wss://...

ARB_RPC_READ=https://...
# ... etc
```

### 3. Compilar el contrato

```bash
# Instalar Hardhat si no lo tienes
npm install --save-dev hardhat @nomicfoundation/hardhat-toolbox

# Compilar
npx hardhat compile
```

### 4. Desplegar el contrato

```bash
npx tsx scripts/deploy.ts base arbitrum optimism polygon
```

### 5. Ejecutar el bot

```bash
# Desarrollo (con hot reload)
npm run dev

# Producción
npm run build
npm start
```

---

## ⚙️ Configuración

### Variables de Entorno

| Variable | Descripción | Default |
|----------|-------------|---------|
| `PRIVATE_KEY` | Clave privada de la wallet | (requerido) |
| `TICK_MS` | Intervalo entre scans (ms) | 700 |
| `DECISION_MS` | Intervalo de rotación IA (ms) | 5000 |
| `MIN_PROFIT_USD` | Ganancia mínima en USD | 0.50 |
| `GAS_MULT` | Multiplicador de gas mínimo | 1.7 |
| `MAX_SLIPPAGE_BPS` | Slippage máximo (bps) | 10 |
| `CHAINS` | Cadenas habilitadas | base,arbitrum |
| `DRY_RUN` | Modo simulación | false |

### Rutas de Arbitraje

Edita `src/dex/routes.ts` para agregar/modificar rutas:

```typescript
{
  name: "USDC→WETH→USDT (500/500)",
  tokenIn: TOKENS.arbitrum.USDC,
  tokenMid: TOKENS.arbitrum.WETH,
  tokenOut: TOKENS.arbitrum.USDT,
  fee1: FEE_TIERS.LOW,
  fee2: FEE_TIERS.LOW,
  quoterV2: DEX_ADDRESSES.arbitrum.quoterV2,
  router: DEX_ADDRESSES.arbitrum.swapRouter,
  stableDecimals: 6
}
```

---

## 🧠 IA: Thompson Sampling Bandit

El bot usa un algoritmo Multi-Armed Bandit con Thompson Sampling para decidir en qué cadena operar:

### Cómo funciona

1. **Cada cadena es un "brazo"** con parámetros α (éxitos) y β (fracasos)
2. **Antes de cada decisión**, se muestrea de una distribución Beta(α, β)
3. **Se elige la cadena** con el valor muestreado más alto
4. **Después de cada trade**, se actualiza α o β según el resultado

### Ventajas

- ✅ Balance automático entre exploración y explotación
- ✅ Aprende de la experiencia real
- ✅ Se adapta a cambios en el mercado
- ✅ No requiere datos históricos para empezar

---

## 📊 Métricas y Estadísticas

El bot almacena métricas en SQLite:

```sql
-- Métricas por operación
SELECT * FROM chain_metrics ORDER BY ts DESC LIMIT 100;

-- Estadísticas por cadena
SELECT 
  chain,
  COUNT(*) as trades,
  SUM(profit_usd) as total_profit,
  AVG(latency_ms) as avg_latency
FROM chain_metrics
GROUP BY chain;

-- Estado del Bandit
SELECT * FROM bandit_state;
```

---

## 🔧 Lo que TÚ debes configurar

### 1. RPCs Privados

Los RPCs públicos son lentos y tienen límites. Necesitas:

- **Alchemy** o **Infura** para cada cadena
- O **nodos propios** para latencia mínima

### 2. Desplegar Contratos

```bash
# Compilar
npx hardhat compile

# Desplegar (actualiza el bytecode en deploy.ts)
npx tsx scripts/deploy.ts base arbitrum
```

### 3. Fondear Wallet

Necesitas en cada cadena:
- **Gas**: ~0.01 ETH (o MATIC en Polygon)
- **Capital**: USDC/USDT para operar (mínimo $100 recomendado)

### 4. Aprobar Tokens

El contrato ArbExecutor necesita aprobación para gastar tus tokens:

```javascript
// Ejemplo con ethers.js
const usdc = new Contract(USDC_ADDRESS, ERC20_ABI, signer);
await usdc.approve(EXECUTOR_ADDRESS, ethers.MaxUint256);
```

### 5. Ajustar Parámetros

Monitorea y ajusta según resultados:
- `MIN_PROFIT_USD`: Aumentar si hay muchos trades fallidos
- `GAS_MULT`: Aumentar en períodos de alta volatilidad de gas
- `TICK_MS`: Reducir para más velocidad (más consumo de RPC)

---

## ⚠️ Consideraciones Importantes

### Seguridad

- 🔐 **NUNCA** compartas tu `PRIVATE_KEY`
- 🔐 Usa una wallet dedicada para el bot
- 🔐 Empieza con capital pequeño

### Riesgos

- 💸 **Pérdida de gas** si los trades fallan
- 💸 **Slippage** si el mercado se mueve rápido
- 💸 **Front-running** por MEV bots

### Optimizaciones Futuras

- [ ] Flashbots/MEV protection
- [ ] WebSocket para actualizaciones en tiempo real
- [ ] Multicall para reducir latencia
- [ ] Más DEXs (Curve, Balancer, SushiSwap)

---

## 📞 Soporte

Para agregar nuevas cadenas o DEXs, modifica:
1. `config.ts` - Agregar configuración de la cadena
2. `routes.ts` - Agregar direcciones de tokens y DEX
3. `chainlink.ts` - Agregar feed de precio

---

## 📄 Licencia

MIT License - Uso bajo tu propio riesgo.



## Sistema de Arbitraje Multi-Cadena con IA

Un bot de arbitraje profesional que opera en múltiples cadenas L2 (Base, Arbitrum, Optimism, Polygon) utilizando inteligencia artificial para optimizar la selección de cadenas.

---

## 📋 Características

### ✅ Implementado (Lo que hice yo)

- **🧠 AI Bandit (Thompson Sampling)** - Algoritmo de aprendizaje que decide en qué cadena operar
- **📊 Base de Datos SQLite** - Almacenamiento de métricas y estadísticas
- **🔮 Oracle Chainlink** - Conversión precisa de gas a USD
- **💱 Integración Uniswap V3** - Quoter y Router para swaps
- **🔄 Simulador** - Validación de trades antes de ejecución
- **⚡ Worker Multi-Cadena** - Ejecutores independientes por cadena
- **🎮 Controller Principal** - Orquestación con rotación IA
- **📜 Contrato ArbExecutor** - Ejecución atómica de arbitrajes
- **🛠️ Configuración Completa** - Variables de entorno y tipos TypeScript

### ⏳ Lo que TÚ debes hacer

1. **Configurar RPCs privados** (Alchemy/Infura/propios)
2. **Compilar y desplegar ArbExecutor.sol** en cada cadena
3. **Fondear la wallet** con tokens estables (USDC) y gas (ETH/MATIC)
4. **Ajustar rutas** según liquidez actual del mercado
5. **Monitorear y ajustar** parámetros de ganancia mínima

---

## 🏗️ Arquitectura

```
┌─────────────────────────────────────────────────────────────────┐
│                     CONTROLLER (AI Rotator)                      │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  Thompson Sampling Bandit                                │   │
│  │  • Aprende qué cadena es más rentable                   │   │
│  │  • Rota automáticamente cada DECISION_MS                │   │
│  └─────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
                              │
        ┌─────────────────────┼─────────────────────┐
        ▼                     ▼                     ▼
┌───────────────┐    ┌───────────────┐    ┌───────────────┐
│  WORKER BASE  │    │ WORKER ARBITRUM│   │ WORKER OPTIMISM│
├───────────────┤    ├───────────────┤    ├───────────────┤
│ • Quote       │    │ • Quote       │    │ • Quote       │
│ • Simulate    │    │ • Simulate    │    │ • Simulate    │
│ • Gate (gas+) │    │ • Gate (gas+) │    │ • Gate (gas+) │
│ • Execute     │    │ • Execute     │    │ • Execute     │
└───────────────┘    └───────────────┘    └───────────────┘
        │                     │                     │
        ▼                     ▼                     ▼
┌───────────────┐    ┌───────────────┐    ┌───────────────┐
│ Chainlink     │    │ Chainlink     │    │ Chainlink     │
│ ETH/USD       │    │ ETH/USD       │    │ ETH/USD       │
└───────────────┘    └───────────────┘    └───────────────┘
```

---

## 📁 Estructura de Archivos

```
multichain-arb/
├── package.json
├── tsconfig.json
├── README.md
├── contracts/
│   └── ArbExecutor.sol          # Contrato de ejecución atómica
├── scripts/
│   └── deploy.ts                # Script de despliegue
└── src/
    ├── index.ts                 # Controller principal
    ├── config.ts                # Configuración y variables
    ├── logger.ts                # Sistema de logging
    ├── db.ts                    # Base de datos SQLite
    ├── ai/
    │   └── bandit.ts            # IA Thompson Sampling
    ├── oracle/
    │   ├── chainlink.ts         # Integración Chainlink
    │   └── price.ts             # Utilidades de precio
    ├── dex/
    │   ├── univ3.ts             # Integración Uniswap V3
    │   └── routes.ts            # Configuración de rutas
    └── worker/
        ├── worker.ts            # Worker por cadena
        ├── strategy.ts          # Estrategia de búsqueda
        ├── simulator.ts         # Simulador de trades
        └── executor.ts          # Ejecutor de transacciones
```

---

## 🚀 Instalación

### 1. Instalar dependencias

```bash
cd src/modules/DeFiProtocols/multichain-arb
npm install
```

### 2. Configurar variables de entorno

Crea un archivo `.env` basado en `.env.example`:

```env
# Wallet
PRIVATE_KEY=0x...

# Timing
TICK_MS=700
DECISION_MS=5000

# Trading
MIN_PROFIT_USD=0.50
GAS_MULT=1.7

# Chains
CHAINS=base,arbitrum,optimism,polygon

# RPCs (usa tus propios endpoints)
BASE_RPC_READ=https://...
BASE_RPC_SIM=https://...
BASE_RPC_SEND=https://...
BASE_RPC_WS=wss://...

ARB_RPC_READ=https://...
# ... etc
```

### 3. Compilar el contrato

```bash
# Instalar Hardhat si no lo tienes
npm install --save-dev hardhat @nomicfoundation/hardhat-toolbox

# Compilar
npx hardhat compile
```

### 4. Desplegar el contrato

```bash
npx tsx scripts/deploy.ts base arbitrum optimism polygon
```

### 5. Ejecutar el bot

```bash
# Desarrollo (con hot reload)
npm run dev

# Producción
npm run build
npm start
```

---

## ⚙️ Configuración

### Variables de Entorno

| Variable | Descripción | Default |
|----------|-------------|---------|
| `PRIVATE_KEY` | Clave privada de la wallet | (requerido) |
| `TICK_MS` | Intervalo entre scans (ms) | 700 |
| `DECISION_MS` | Intervalo de rotación IA (ms) | 5000 |
| `MIN_PROFIT_USD` | Ganancia mínima en USD | 0.50 |
| `GAS_MULT` | Multiplicador de gas mínimo | 1.7 |
| `MAX_SLIPPAGE_BPS` | Slippage máximo (bps) | 10 |
| `CHAINS` | Cadenas habilitadas | base,arbitrum |
| `DRY_RUN` | Modo simulación | false |

### Rutas de Arbitraje

Edita `src/dex/routes.ts` para agregar/modificar rutas:

```typescript
{
  name: "USDC→WETH→USDT (500/500)",
  tokenIn: TOKENS.arbitrum.USDC,
  tokenMid: TOKENS.arbitrum.WETH,
  tokenOut: TOKENS.arbitrum.USDT,
  fee1: FEE_TIERS.LOW,
  fee2: FEE_TIERS.LOW,
  quoterV2: DEX_ADDRESSES.arbitrum.quoterV2,
  router: DEX_ADDRESSES.arbitrum.swapRouter,
  stableDecimals: 6
}
```

---

## 🧠 IA: Thompson Sampling Bandit

El bot usa un algoritmo Multi-Armed Bandit con Thompson Sampling para decidir en qué cadena operar:

### Cómo funciona

1. **Cada cadena es un "brazo"** con parámetros α (éxitos) y β (fracasos)
2. **Antes de cada decisión**, se muestrea de una distribución Beta(α, β)
3. **Se elige la cadena** con el valor muestreado más alto
4. **Después de cada trade**, se actualiza α o β según el resultado

### Ventajas

- ✅ Balance automático entre exploración y explotación
- ✅ Aprende de la experiencia real
- ✅ Se adapta a cambios en el mercado
- ✅ No requiere datos históricos para empezar

---

## 📊 Métricas y Estadísticas

El bot almacena métricas en SQLite:

```sql
-- Métricas por operación
SELECT * FROM chain_metrics ORDER BY ts DESC LIMIT 100;

-- Estadísticas por cadena
SELECT 
  chain,
  COUNT(*) as trades,
  SUM(profit_usd) as total_profit,
  AVG(latency_ms) as avg_latency
FROM chain_metrics
GROUP BY chain;

-- Estado del Bandit
SELECT * FROM bandit_state;
```

---

## 🔧 Lo que TÚ debes configurar

### 1. RPCs Privados

Los RPCs públicos son lentos y tienen límites. Necesitas:

- **Alchemy** o **Infura** para cada cadena
- O **nodos propios** para latencia mínima

### 2. Desplegar Contratos

```bash
# Compilar
npx hardhat compile

# Desplegar (actualiza el bytecode en deploy.ts)
npx tsx scripts/deploy.ts base arbitrum
```

### 3. Fondear Wallet

Necesitas en cada cadena:
- **Gas**: ~0.01 ETH (o MATIC en Polygon)
- **Capital**: USDC/USDT para operar (mínimo $100 recomendado)

### 4. Aprobar Tokens

El contrato ArbExecutor necesita aprobación para gastar tus tokens:

```javascript
// Ejemplo con ethers.js
const usdc = new Contract(USDC_ADDRESS, ERC20_ABI, signer);
await usdc.approve(EXECUTOR_ADDRESS, ethers.MaxUint256);
```

### 5. Ajustar Parámetros

Monitorea y ajusta según resultados:
- `MIN_PROFIT_USD`: Aumentar si hay muchos trades fallidos
- `GAS_MULT`: Aumentar en períodos de alta volatilidad de gas
- `TICK_MS`: Reducir para más velocidad (más consumo de RPC)

---

## ⚠️ Consideraciones Importantes

### Seguridad

- 🔐 **NUNCA** compartas tu `PRIVATE_KEY`
- 🔐 Usa una wallet dedicada para el bot
- 🔐 Empieza con capital pequeño

### Riesgos

- 💸 **Pérdida de gas** si los trades fallan
- 💸 **Slippage** si el mercado se mueve rápido
- 💸 **Front-running** por MEV bots

### Optimizaciones Futuras

- [ ] Flashbots/MEV protection
- [ ] WebSocket para actualizaciones en tiempo real
- [ ] Multicall para reducir latencia
- [ ] Más DEXs (Curve, Balancer, SushiSwap)

---

## 📞 Soporte

Para agregar nuevas cadenas o DEXs, modifica:
1. `config.ts` - Agregar configuración de la cadena
2. `routes.ts` - Agregar direcciones de tokens y DEX
3. `chainlink.ts` - Agregar feed de precio

---

## 📄 Licencia

MIT License - Uso bajo tu propio riesgo.



## Sistema de Arbitraje Multi-Cadena con IA

Un bot de arbitraje profesional que opera en múltiples cadenas L2 (Base, Arbitrum, Optimism, Polygon) utilizando inteligencia artificial para optimizar la selección de cadenas.

---

## 📋 Características

### ✅ Implementado (Lo que hice yo)

- **🧠 AI Bandit (Thompson Sampling)** - Algoritmo de aprendizaje que decide en qué cadena operar
- **📊 Base de Datos SQLite** - Almacenamiento de métricas y estadísticas
- **🔮 Oracle Chainlink** - Conversión precisa de gas a USD
- **💱 Integración Uniswap V3** - Quoter y Router para swaps
- **🔄 Simulador** - Validación de trades antes de ejecución
- **⚡ Worker Multi-Cadena** - Ejecutores independientes por cadena
- **🎮 Controller Principal** - Orquestación con rotación IA
- **📜 Contrato ArbExecutor** - Ejecución atómica de arbitrajes
- **🛠️ Configuración Completa** - Variables de entorno y tipos TypeScript

### ⏳ Lo que TÚ debes hacer

1. **Configurar RPCs privados** (Alchemy/Infura/propios)
2. **Compilar y desplegar ArbExecutor.sol** en cada cadena
3. **Fondear la wallet** con tokens estables (USDC) y gas (ETH/MATIC)
4. **Ajustar rutas** según liquidez actual del mercado
5. **Monitorear y ajustar** parámetros de ganancia mínima

---

## 🏗️ Arquitectura

```
┌─────────────────────────────────────────────────────────────────┐
│                     CONTROLLER (AI Rotator)                      │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  Thompson Sampling Bandit                                │   │
│  │  • Aprende qué cadena es más rentable                   │   │
│  │  • Rota automáticamente cada DECISION_MS                │   │
│  └─────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
                              │
        ┌─────────────────────┼─────────────────────┐
        ▼                     ▼                     ▼
┌───────────────┐    ┌───────────────┐    ┌───────────────┐
│  WORKER BASE  │    │ WORKER ARBITRUM│   │ WORKER OPTIMISM│
├───────────────┤    ├───────────────┤    ├───────────────┤
│ • Quote       │    │ • Quote       │    │ • Quote       │
│ • Simulate    │    │ • Simulate    │    │ • Simulate    │
│ • Gate (gas+) │    │ • Gate (gas+) │    │ • Gate (gas+) │
│ • Execute     │    │ • Execute     │    │ • Execute     │
└───────────────┘    └───────────────┘    └───────────────┘
        │                     │                     │
        ▼                     ▼                     ▼
┌───────────────┐    ┌───────────────┐    ┌───────────────┐
│ Chainlink     │    │ Chainlink     │    │ Chainlink     │
│ ETH/USD       │    │ ETH/USD       │    │ ETH/USD       │
└───────────────┘    └───────────────┘    └───────────────┘
```

---

## 📁 Estructura de Archivos

```
multichain-arb/
├── package.json
├── tsconfig.json
├── README.md
├── contracts/
│   └── ArbExecutor.sol          # Contrato de ejecución atómica
├── scripts/
│   └── deploy.ts                # Script de despliegue
└── src/
    ├── index.ts                 # Controller principal
    ├── config.ts                # Configuración y variables
    ├── logger.ts                # Sistema de logging
    ├── db.ts                    # Base de datos SQLite
    ├── ai/
    │   └── bandit.ts            # IA Thompson Sampling
    ├── oracle/
    │   ├── chainlink.ts         # Integración Chainlink
    │   └── price.ts             # Utilidades de precio
    ├── dex/
    │   ├── univ3.ts             # Integración Uniswap V3
    │   └── routes.ts            # Configuración de rutas
    └── worker/
        ├── worker.ts            # Worker por cadena
        ├── strategy.ts          # Estrategia de búsqueda
        ├── simulator.ts         # Simulador de trades
        └── executor.ts          # Ejecutor de transacciones
```

---

## 🚀 Instalación

### 1. Instalar dependencias

```bash
cd src/modules/DeFiProtocols/multichain-arb
npm install
```

### 2. Configurar variables de entorno

Crea un archivo `.env` basado en `.env.example`:

```env
# Wallet
PRIVATE_KEY=0x...

# Timing
TICK_MS=700
DECISION_MS=5000

# Trading
MIN_PROFIT_USD=0.50
GAS_MULT=1.7

# Chains
CHAINS=base,arbitrum,optimism,polygon

# RPCs (usa tus propios endpoints)
BASE_RPC_READ=https://...
BASE_RPC_SIM=https://...
BASE_RPC_SEND=https://...
BASE_RPC_WS=wss://...

ARB_RPC_READ=https://...
# ... etc
```

### 3. Compilar el contrato

```bash
# Instalar Hardhat si no lo tienes
npm install --save-dev hardhat @nomicfoundation/hardhat-toolbox

# Compilar
npx hardhat compile
```

### 4. Desplegar el contrato

```bash
npx tsx scripts/deploy.ts base arbitrum optimism polygon
```

### 5. Ejecutar el bot

```bash
# Desarrollo (con hot reload)
npm run dev

# Producción
npm run build
npm start
```

---

## ⚙️ Configuración

### Variables de Entorno

| Variable | Descripción | Default |
|----------|-------------|---------|
| `PRIVATE_KEY` | Clave privada de la wallet | (requerido) |
| `TICK_MS` | Intervalo entre scans (ms) | 700 |
| `DECISION_MS` | Intervalo de rotación IA (ms) | 5000 |
| `MIN_PROFIT_USD` | Ganancia mínima en USD | 0.50 |
| `GAS_MULT` | Multiplicador de gas mínimo | 1.7 |
| `MAX_SLIPPAGE_BPS` | Slippage máximo (bps) | 10 |
| `CHAINS` | Cadenas habilitadas | base,arbitrum |
| `DRY_RUN` | Modo simulación | false |

### Rutas de Arbitraje

Edita `src/dex/routes.ts` para agregar/modificar rutas:

```typescript
{
  name: "USDC→WETH→USDT (500/500)",
  tokenIn: TOKENS.arbitrum.USDC,
  tokenMid: TOKENS.arbitrum.WETH,
  tokenOut: TOKENS.arbitrum.USDT,
  fee1: FEE_TIERS.LOW,
  fee2: FEE_TIERS.LOW,
  quoterV2: DEX_ADDRESSES.arbitrum.quoterV2,
  router: DEX_ADDRESSES.arbitrum.swapRouter,
  stableDecimals: 6
}
```

---

## 🧠 IA: Thompson Sampling Bandit

El bot usa un algoritmo Multi-Armed Bandit con Thompson Sampling para decidir en qué cadena operar:

### Cómo funciona

1. **Cada cadena es un "brazo"** con parámetros α (éxitos) y β (fracasos)
2. **Antes de cada decisión**, se muestrea de una distribución Beta(α, β)
3. **Se elige la cadena** con el valor muestreado más alto
4. **Después de cada trade**, se actualiza α o β según el resultado

### Ventajas

- ✅ Balance automático entre exploración y explotación
- ✅ Aprende de la experiencia real
- ✅ Se adapta a cambios en el mercado
- ✅ No requiere datos históricos para empezar

---

## 📊 Métricas y Estadísticas

El bot almacena métricas en SQLite:

```sql
-- Métricas por operación
SELECT * FROM chain_metrics ORDER BY ts DESC LIMIT 100;

-- Estadísticas por cadena
SELECT 
  chain,
  COUNT(*) as trades,
  SUM(profit_usd) as total_profit,
  AVG(latency_ms) as avg_latency
FROM chain_metrics
GROUP BY chain;

-- Estado del Bandit
SELECT * FROM bandit_state;
```

---

## 🔧 Lo que TÚ debes configurar

### 1. RPCs Privados

Los RPCs públicos son lentos y tienen límites. Necesitas:

- **Alchemy** o **Infura** para cada cadena
- O **nodos propios** para latencia mínima

### 2. Desplegar Contratos

```bash
# Compilar
npx hardhat compile

# Desplegar (actualiza el bytecode en deploy.ts)
npx tsx scripts/deploy.ts base arbitrum
```

### 3. Fondear Wallet

Necesitas en cada cadena:
- **Gas**: ~0.01 ETH (o MATIC en Polygon)
- **Capital**: USDC/USDT para operar (mínimo $100 recomendado)

### 4. Aprobar Tokens

El contrato ArbExecutor necesita aprobación para gastar tus tokens:

```javascript
// Ejemplo con ethers.js
const usdc = new Contract(USDC_ADDRESS, ERC20_ABI, signer);
await usdc.approve(EXECUTOR_ADDRESS, ethers.MaxUint256);
```

### 5. Ajustar Parámetros

Monitorea y ajusta según resultados:
- `MIN_PROFIT_USD`: Aumentar si hay muchos trades fallidos
- `GAS_MULT`: Aumentar en períodos de alta volatilidad de gas
- `TICK_MS`: Reducir para más velocidad (más consumo de RPC)

---

## ⚠️ Consideraciones Importantes

### Seguridad

- 🔐 **NUNCA** compartas tu `PRIVATE_KEY`
- 🔐 Usa una wallet dedicada para el bot
- 🔐 Empieza con capital pequeño

### Riesgos

- 💸 **Pérdida de gas** si los trades fallan
- 💸 **Slippage** si el mercado se mueve rápido
- 💸 **Front-running** por MEV bots

### Optimizaciones Futuras

- [ ] Flashbots/MEV protection
- [ ] WebSocket para actualizaciones en tiempo real
- [ ] Multicall para reducir latencia
- [ ] Más DEXs (Curve, Balancer, SushiSwap)

---

## 📞 Soporte

Para agregar nuevas cadenas o DEXs, modifica:
1. `config.ts` - Agregar configuración de la cadena
2. `routes.ts` - Agregar direcciones de tokens y DEX
3. `chainlink.ts` - Agregar feed de precio

---

## 📄 Licencia

MIT License - Uso bajo tu propio riesgo.



## Sistema de Arbitraje Multi-Cadena con IA

Un bot de arbitraje profesional que opera en múltiples cadenas L2 (Base, Arbitrum, Optimism, Polygon) utilizando inteligencia artificial para optimizar la selección de cadenas.

---

## 📋 Características

### ✅ Implementado (Lo que hice yo)

- **🧠 AI Bandit (Thompson Sampling)** - Algoritmo de aprendizaje que decide en qué cadena operar
- **📊 Base de Datos SQLite** - Almacenamiento de métricas y estadísticas
- **🔮 Oracle Chainlink** - Conversión precisa de gas a USD
- **💱 Integración Uniswap V3** - Quoter y Router para swaps
- **🔄 Simulador** - Validación de trades antes de ejecución
- **⚡ Worker Multi-Cadena** - Ejecutores independientes por cadena
- **🎮 Controller Principal** - Orquestación con rotación IA
- **📜 Contrato ArbExecutor** - Ejecución atómica de arbitrajes
- **🛠️ Configuración Completa** - Variables de entorno y tipos TypeScript

### ⏳ Lo que TÚ debes hacer

1. **Configurar RPCs privados** (Alchemy/Infura/propios)
2. **Compilar y desplegar ArbExecutor.sol** en cada cadena
3. **Fondear la wallet** con tokens estables (USDC) y gas (ETH/MATIC)
4. **Ajustar rutas** según liquidez actual del mercado
5. **Monitorear y ajustar** parámetros de ganancia mínima

---

## 🏗️ Arquitectura

```
┌─────────────────────────────────────────────────────────────────┐
│                     CONTROLLER (AI Rotator)                      │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  Thompson Sampling Bandit                                │   │
│  │  • Aprende qué cadena es más rentable                   │   │
│  │  • Rota automáticamente cada DECISION_MS                │   │
│  └─────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
                              │
        ┌─────────────────────┼─────────────────────┐
        ▼                     ▼                     ▼
┌───────────────┐    ┌───────────────┐    ┌───────────────┐
│  WORKER BASE  │    │ WORKER ARBITRUM│   │ WORKER OPTIMISM│
├───────────────┤    ├───────────────┤    ├───────────────┤
│ • Quote       │    │ • Quote       │    │ • Quote       │
│ • Simulate    │    │ • Simulate    │    │ • Simulate    │
│ • Gate (gas+) │    │ • Gate (gas+) │    │ • Gate (gas+) │
│ • Execute     │    │ • Execute     │    │ • Execute     │
└───────────────┘    └───────────────┘    └───────────────┘
        │                     │                     │
        ▼                     ▼                     ▼
┌───────────────┐    ┌───────────────┐    ┌───────────────┐
│ Chainlink     │    │ Chainlink     │    │ Chainlink     │
│ ETH/USD       │    │ ETH/USD       │    │ ETH/USD       │
└───────────────┘    └───────────────┘    └───────────────┘
```

---

## 📁 Estructura de Archivos

```
multichain-arb/
├── package.json
├── tsconfig.json
├── README.md
├── contracts/
│   └── ArbExecutor.sol          # Contrato de ejecución atómica
├── scripts/
│   └── deploy.ts                # Script de despliegue
└── src/
    ├── index.ts                 # Controller principal
    ├── config.ts                # Configuración y variables
    ├── logger.ts                # Sistema de logging
    ├── db.ts                    # Base de datos SQLite
    ├── ai/
    │   └── bandit.ts            # IA Thompson Sampling
    ├── oracle/
    │   ├── chainlink.ts         # Integración Chainlink
    │   └── price.ts             # Utilidades de precio
    ├── dex/
    │   ├── univ3.ts             # Integración Uniswap V3
    │   └── routes.ts            # Configuración de rutas
    └── worker/
        ├── worker.ts            # Worker por cadena
        ├── strategy.ts          # Estrategia de búsqueda
        ├── simulator.ts         # Simulador de trades
        └── executor.ts          # Ejecutor de transacciones
```

---

## 🚀 Instalación

### 1. Instalar dependencias

```bash
cd src/modules/DeFiProtocols/multichain-arb
npm install
```

### 2. Configurar variables de entorno

Crea un archivo `.env` basado en `.env.example`:

```env
# Wallet
PRIVATE_KEY=0x...

# Timing
TICK_MS=700
DECISION_MS=5000

# Trading
MIN_PROFIT_USD=0.50
GAS_MULT=1.7

# Chains
CHAINS=base,arbitrum,optimism,polygon

# RPCs (usa tus propios endpoints)
BASE_RPC_READ=https://...
BASE_RPC_SIM=https://...
BASE_RPC_SEND=https://...
BASE_RPC_WS=wss://...

ARB_RPC_READ=https://...
# ... etc
```

### 3. Compilar el contrato

```bash
# Instalar Hardhat si no lo tienes
npm install --save-dev hardhat @nomicfoundation/hardhat-toolbox

# Compilar
npx hardhat compile
```

### 4. Desplegar el contrato

```bash
npx tsx scripts/deploy.ts base arbitrum optimism polygon
```

### 5. Ejecutar el bot

```bash
# Desarrollo (con hot reload)
npm run dev

# Producción
npm run build
npm start
```

---

## ⚙️ Configuración

### Variables de Entorno

| Variable | Descripción | Default |
|----------|-------------|---------|
| `PRIVATE_KEY` | Clave privada de la wallet | (requerido) |
| `TICK_MS` | Intervalo entre scans (ms) | 700 |
| `DECISION_MS` | Intervalo de rotación IA (ms) | 5000 |
| `MIN_PROFIT_USD` | Ganancia mínima en USD | 0.50 |
| `GAS_MULT` | Multiplicador de gas mínimo | 1.7 |
| `MAX_SLIPPAGE_BPS` | Slippage máximo (bps) | 10 |
| `CHAINS` | Cadenas habilitadas | base,arbitrum |
| `DRY_RUN` | Modo simulación | false |

### Rutas de Arbitraje

Edita `src/dex/routes.ts` para agregar/modificar rutas:

```typescript
{
  name: "USDC→WETH→USDT (500/500)",
  tokenIn: TOKENS.arbitrum.USDC,
  tokenMid: TOKENS.arbitrum.WETH,
  tokenOut: TOKENS.arbitrum.USDT,
  fee1: FEE_TIERS.LOW,
  fee2: FEE_TIERS.LOW,
  quoterV2: DEX_ADDRESSES.arbitrum.quoterV2,
  router: DEX_ADDRESSES.arbitrum.swapRouter,
  stableDecimals: 6
}
```

---

## 🧠 IA: Thompson Sampling Bandit

El bot usa un algoritmo Multi-Armed Bandit con Thompson Sampling para decidir en qué cadena operar:

### Cómo funciona

1. **Cada cadena es un "brazo"** con parámetros α (éxitos) y β (fracasos)
2. **Antes de cada decisión**, se muestrea de una distribución Beta(α, β)
3. **Se elige la cadena** con el valor muestreado más alto
4. **Después de cada trade**, se actualiza α o β según el resultado

### Ventajas

- ✅ Balance automático entre exploración y explotación
- ✅ Aprende de la experiencia real
- ✅ Se adapta a cambios en el mercado
- ✅ No requiere datos históricos para empezar

---

## 📊 Métricas y Estadísticas

El bot almacena métricas en SQLite:

```sql
-- Métricas por operación
SELECT * FROM chain_metrics ORDER BY ts DESC LIMIT 100;

-- Estadísticas por cadena
SELECT 
  chain,
  COUNT(*) as trades,
  SUM(profit_usd) as total_profit,
  AVG(latency_ms) as avg_latency
FROM chain_metrics
GROUP BY chain;

-- Estado del Bandit
SELECT * FROM bandit_state;
```

---

## 🔧 Lo que TÚ debes configurar

### 1. RPCs Privados

Los RPCs públicos son lentos y tienen límites. Necesitas:

- **Alchemy** o **Infura** para cada cadena
- O **nodos propios** para latencia mínima

### 2. Desplegar Contratos

```bash
# Compilar
npx hardhat compile

# Desplegar (actualiza el bytecode en deploy.ts)
npx tsx scripts/deploy.ts base arbitrum
```

### 3. Fondear Wallet

Necesitas en cada cadena:
- **Gas**: ~0.01 ETH (o MATIC en Polygon)
- **Capital**: USDC/USDT para operar (mínimo $100 recomendado)

### 4. Aprobar Tokens

El contrato ArbExecutor necesita aprobación para gastar tus tokens:

```javascript
// Ejemplo con ethers.js
const usdc = new Contract(USDC_ADDRESS, ERC20_ABI, signer);
await usdc.approve(EXECUTOR_ADDRESS, ethers.MaxUint256);
```

### 5. Ajustar Parámetros

Monitorea y ajusta según resultados:
- `MIN_PROFIT_USD`: Aumentar si hay muchos trades fallidos
- `GAS_MULT`: Aumentar en períodos de alta volatilidad de gas
- `TICK_MS`: Reducir para más velocidad (más consumo de RPC)

---

## ⚠️ Consideraciones Importantes

### Seguridad

- 🔐 **NUNCA** compartas tu `PRIVATE_KEY`
- 🔐 Usa una wallet dedicada para el bot
- 🔐 Empieza con capital pequeño

### Riesgos

- 💸 **Pérdida de gas** si los trades fallan
- 💸 **Slippage** si el mercado se mueve rápido
- 💸 **Front-running** por MEV bots

### Optimizaciones Futuras

- [ ] Flashbots/MEV protection
- [ ] WebSocket para actualizaciones en tiempo real
- [ ] Multicall para reducir latencia
- [ ] Más DEXs (Curve, Balancer, SushiSwap)

---

## 📞 Soporte

Para agregar nuevas cadenas o DEXs, modifica:
1. `config.ts` - Agregar configuración de la cadena
2. `routes.ts` - Agregar direcciones de tokens y DEX
3. `chainlink.ts` - Agregar feed de precio

---

## 📄 Licencia

MIT License - Uso bajo tu propio riesgo.




## Sistema de Arbitraje Multi-Cadena con IA

Un bot de arbitraje profesional que opera en múltiples cadenas L2 (Base, Arbitrum, Optimism, Polygon) utilizando inteligencia artificial para optimizar la selección de cadenas.

---

## 📋 Características

### ✅ Implementado (Lo que hice yo)

- **🧠 AI Bandit (Thompson Sampling)** - Algoritmo de aprendizaje que decide en qué cadena operar
- **📊 Base de Datos SQLite** - Almacenamiento de métricas y estadísticas
- **🔮 Oracle Chainlink** - Conversión precisa de gas a USD
- **💱 Integración Uniswap V3** - Quoter y Router para swaps
- **🔄 Simulador** - Validación de trades antes de ejecución
- **⚡ Worker Multi-Cadena** - Ejecutores independientes por cadena
- **🎮 Controller Principal** - Orquestación con rotación IA
- **📜 Contrato ArbExecutor** - Ejecución atómica de arbitrajes
- **🛠️ Configuración Completa** - Variables de entorno y tipos TypeScript

### ⏳ Lo que TÚ debes hacer

1. **Configurar RPCs privados** (Alchemy/Infura/propios)
2. **Compilar y desplegar ArbExecutor.sol** en cada cadena
3. **Fondear la wallet** con tokens estables (USDC) y gas (ETH/MATIC)
4. **Ajustar rutas** según liquidez actual del mercado
5. **Monitorear y ajustar** parámetros de ganancia mínima

---

## 🏗️ Arquitectura

```
┌─────────────────────────────────────────────────────────────────┐
│                     CONTROLLER (AI Rotator)                      │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  Thompson Sampling Bandit                                │   │
│  │  • Aprende qué cadena es más rentable                   │   │
│  │  • Rota automáticamente cada DECISION_MS                │   │
│  └─────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
                              │
        ┌─────────────────────┼─────────────────────┐
        ▼                     ▼                     ▼
┌───────────────┐    ┌───────────────┐    ┌───────────────┐
│  WORKER BASE  │    │ WORKER ARBITRUM│   │ WORKER OPTIMISM│
├───────────────┤    ├───────────────┤    ├───────────────┤
│ • Quote       │    │ • Quote       │    │ • Quote       │
│ • Simulate    │    │ • Simulate    │    │ • Simulate    │
│ • Gate (gas+) │    │ • Gate (gas+) │    │ • Gate (gas+) │
│ • Execute     │    │ • Execute     │    │ • Execute     │
└───────────────┘    └───────────────┘    └───────────────┘
        │                     │                     │
        ▼                     ▼                     ▼
┌───────────────┐    ┌───────────────┐    ┌───────────────┐
│ Chainlink     │    │ Chainlink     │    │ Chainlink     │
│ ETH/USD       │    │ ETH/USD       │    │ ETH/USD       │
└───────────────┘    └───────────────┘    └───────────────┘
```

---

## 📁 Estructura de Archivos

```
multichain-arb/
├── package.json
├── tsconfig.json
├── README.md
├── contracts/
│   └── ArbExecutor.sol          # Contrato de ejecución atómica
├── scripts/
│   └── deploy.ts                # Script de despliegue
└── src/
    ├── index.ts                 # Controller principal
    ├── config.ts                # Configuración y variables
    ├── logger.ts                # Sistema de logging
    ├── db.ts                    # Base de datos SQLite
    ├── ai/
    │   └── bandit.ts            # IA Thompson Sampling
    ├── oracle/
    │   ├── chainlink.ts         # Integración Chainlink
    │   └── price.ts             # Utilidades de precio
    ├── dex/
    │   ├── univ3.ts             # Integración Uniswap V3
    │   └── routes.ts            # Configuración de rutas
    └── worker/
        ├── worker.ts            # Worker por cadena
        ├── strategy.ts          # Estrategia de búsqueda
        ├── simulator.ts         # Simulador de trades
        └── executor.ts          # Ejecutor de transacciones
```

---

## 🚀 Instalación

### 1. Instalar dependencias

```bash
cd src/modules/DeFiProtocols/multichain-arb
npm install
```

### 2. Configurar variables de entorno

Crea un archivo `.env` basado en `.env.example`:

```env
# Wallet
PRIVATE_KEY=0x...

# Timing
TICK_MS=700
DECISION_MS=5000

# Trading
MIN_PROFIT_USD=0.50
GAS_MULT=1.7

# Chains
CHAINS=base,arbitrum,optimism,polygon

# RPCs (usa tus propios endpoints)
BASE_RPC_READ=https://...
BASE_RPC_SIM=https://...
BASE_RPC_SEND=https://...
BASE_RPC_WS=wss://...

ARB_RPC_READ=https://...
# ... etc
```

### 3. Compilar el contrato

```bash
# Instalar Hardhat si no lo tienes
npm install --save-dev hardhat @nomicfoundation/hardhat-toolbox

# Compilar
npx hardhat compile
```

### 4. Desplegar el contrato

```bash
npx tsx scripts/deploy.ts base arbitrum optimism polygon
```

### 5. Ejecutar el bot

```bash
# Desarrollo (con hot reload)
npm run dev

# Producción
npm run build
npm start
```

---

## ⚙️ Configuración

### Variables de Entorno

| Variable | Descripción | Default |
|----------|-------------|---------|
| `PRIVATE_KEY` | Clave privada de la wallet | (requerido) |
| `TICK_MS` | Intervalo entre scans (ms) | 700 |
| `DECISION_MS` | Intervalo de rotación IA (ms) | 5000 |
| `MIN_PROFIT_USD` | Ganancia mínima en USD | 0.50 |
| `GAS_MULT` | Multiplicador de gas mínimo | 1.7 |
| `MAX_SLIPPAGE_BPS` | Slippage máximo (bps) | 10 |
| `CHAINS` | Cadenas habilitadas | base,arbitrum |
| `DRY_RUN` | Modo simulación | false |

### Rutas de Arbitraje

Edita `src/dex/routes.ts` para agregar/modificar rutas:

```typescript
{
  name: "USDC→WETH→USDT (500/500)",
  tokenIn: TOKENS.arbitrum.USDC,
  tokenMid: TOKENS.arbitrum.WETH,
  tokenOut: TOKENS.arbitrum.USDT,
  fee1: FEE_TIERS.LOW,
  fee2: FEE_TIERS.LOW,
  quoterV2: DEX_ADDRESSES.arbitrum.quoterV2,
  router: DEX_ADDRESSES.arbitrum.swapRouter,
  stableDecimals: 6
}
```

---

## 🧠 IA: Thompson Sampling Bandit

El bot usa un algoritmo Multi-Armed Bandit con Thompson Sampling para decidir en qué cadena operar:

### Cómo funciona

1. **Cada cadena es un "brazo"** con parámetros α (éxitos) y β (fracasos)
2. **Antes de cada decisión**, se muestrea de una distribución Beta(α, β)
3. **Se elige la cadena** con el valor muestreado más alto
4. **Después de cada trade**, se actualiza α o β según el resultado

### Ventajas

- ✅ Balance automático entre exploración y explotación
- ✅ Aprende de la experiencia real
- ✅ Se adapta a cambios en el mercado
- ✅ No requiere datos históricos para empezar

---

## 📊 Métricas y Estadísticas

El bot almacena métricas en SQLite:

```sql
-- Métricas por operación
SELECT * FROM chain_metrics ORDER BY ts DESC LIMIT 100;

-- Estadísticas por cadena
SELECT 
  chain,
  COUNT(*) as trades,
  SUM(profit_usd) as total_profit,
  AVG(latency_ms) as avg_latency
FROM chain_metrics
GROUP BY chain;

-- Estado del Bandit
SELECT * FROM bandit_state;
```

---

## 🔧 Lo que TÚ debes configurar

### 1. RPCs Privados

Los RPCs públicos son lentos y tienen límites. Necesitas:

- **Alchemy** o **Infura** para cada cadena
- O **nodos propios** para latencia mínima

### 2. Desplegar Contratos

```bash
# Compilar
npx hardhat compile

# Desplegar (actualiza el bytecode en deploy.ts)
npx tsx scripts/deploy.ts base arbitrum
```

### 3. Fondear Wallet

Necesitas en cada cadena:
- **Gas**: ~0.01 ETH (o MATIC en Polygon)
- **Capital**: USDC/USDT para operar (mínimo $100 recomendado)

### 4. Aprobar Tokens

El contrato ArbExecutor necesita aprobación para gastar tus tokens:

```javascript
// Ejemplo con ethers.js
const usdc = new Contract(USDC_ADDRESS, ERC20_ABI, signer);
await usdc.approve(EXECUTOR_ADDRESS, ethers.MaxUint256);
```

### 5. Ajustar Parámetros

Monitorea y ajusta según resultados:
- `MIN_PROFIT_USD`: Aumentar si hay muchos trades fallidos
- `GAS_MULT`: Aumentar en períodos de alta volatilidad de gas
- `TICK_MS`: Reducir para más velocidad (más consumo de RPC)

---

## ⚠️ Consideraciones Importantes

### Seguridad

- 🔐 **NUNCA** compartas tu `PRIVATE_KEY`
- 🔐 Usa una wallet dedicada para el bot
- 🔐 Empieza con capital pequeño

### Riesgos

- 💸 **Pérdida de gas** si los trades fallan
- 💸 **Slippage** si el mercado se mueve rápido
- 💸 **Front-running** por MEV bots

### Optimizaciones Futuras

- [ ] Flashbots/MEV protection
- [ ] WebSocket para actualizaciones en tiempo real
- [ ] Multicall para reducir latencia
- [ ] Más DEXs (Curve, Balancer, SushiSwap)

---

## 📞 Soporte

Para agregar nuevas cadenas o DEXs, modifica:
1. `config.ts` - Agregar configuración de la cadena
2. `routes.ts` - Agregar direcciones de tokens y DEX
3. `chainlink.ts` - Agregar feed de precio

---

## 📄 Licencia

MIT License - Uso bajo tu propio riesgo.



## Sistema de Arbitraje Multi-Cadena con IA

Un bot de arbitraje profesional que opera en múltiples cadenas L2 (Base, Arbitrum, Optimism, Polygon) utilizando inteligencia artificial para optimizar la selección de cadenas.

---

## 📋 Características

### ✅ Implementado (Lo que hice yo)

- **🧠 AI Bandit (Thompson Sampling)** - Algoritmo de aprendizaje que decide en qué cadena operar
- **📊 Base de Datos SQLite** - Almacenamiento de métricas y estadísticas
- **🔮 Oracle Chainlink** - Conversión precisa de gas a USD
- **💱 Integración Uniswap V3** - Quoter y Router para swaps
- **🔄 Simulador** - Validación de trades antes de ejecución
- **⚡ Worker Multi-Cadena** - Ejecutores independientes por cadena
- **🎮 Controller Principal** - Orquestación con rotación IA
- **📜 Contrato ArbExecutor** - Ejecución atómica de arbitrajes
- **🛠️ Configuración Completa** - Variables de entorno y tipos TypeScript

### ⏳ Lo que TÚ debes hacer

1. **Configurar RPCs privados** (Alchemy/Infura/propios)
2. **Compilar y desplegar ArbExecutor.sol** en cada cadena
3. **Fondear la wallet** con tokens estables (USDC) y gas (ETH/MATIC)
4. **Ajustar rutas** según liquidez actual del mercado
5. **Monitorear y ajustar** parámetros de ganancia mínima

---

## 🏗️ Arquitectura

```
┌─────────────────────────────────────────────────────────────────┐
│                     CONTROLLER (AI Rotator)                      │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  Thompson Sampling Bandit                                │   │
│  │  • Aprende qué cadena es más rentable                   │   │
│  │  • Rota automáticamente cada DECISION_MS                │   │
│  └─────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
                              │
        ┌─────────────────────┼─────────────────────┐
        ▼                     ▼                     ▼
┌───────────────┐    ┌───────────────┐    ┌───────────────┐
│  WORKER BASE  │    │ WORKER ARBITRUM│   │ WORKER OPTIMISM│
├───────────────┤    ├───────────────┤    ├───────────────┤
│ • Quote       │    │ • Quote       │    │ • Quote       │
│ • Simulate    │    │ • Simulate    │    │ • Simulate    │
│ • Gate (gas+) │    │ • Gate (gas+) │    │ • Gate (gas+) │
│ • Execute     │    │ • Execute     │    │ • Execute     │
└───────────────┘    └───────────────┘    └───────────────┘
        │                     │                     │
        ▼                     ▼                     ▼
┌───────────────┐    ┌───────────────┐    ┌───────────────┐
│ Chainlink     │    │ Chainlink     │    │ Chainlink     │
│ ETH/USD       │    │ ETH/USD       │    │ ETH/USD       │
└───────────────┘    └───────────────┘    └───────────────┘
```

---

## 📁 Estructura de Archivos

```
multichain-arb/
├── package.json
├── tsconfig.json
├── README.md
├── contracts/
│   └── ArbExecutor.sol          # Contrato de ejecución atómica
├── scripts/
│   └── deploy.ts                # Script de despliegue
└── src/
    ├── index.ts                 # Controller principal
    ├── config.ts                # Configuración y variables
    ├── logger.ts                # Sistema de logging
    ├── db.ts                    # Base de datos SQLite
    ├── ai/
    │   └── bandit.ts            # IA Thompson Sampling
    ├── oracle/
    │   ├── chainlink.ts         # Integración Chainlink
    │   └── price.ts             # Utilidades de precio
    ├── dex/
    │   ├── univ3.ts             # Integración Uniswap V3
    │   └── routes.ts            # Configuración de rutas
    └── worker/
        ├── worker.ts            # Worker por cadena
        ├── strategy.ts          # Estrategia de búsqueda
        ├── simulator.ts         # Simulador de trades
        └── executor.ts          # Ejecutor de transacciones
```

---

## 🚀 Instalación

### 1. Instalar dependencias

```bash
cd src/modules/DeFiProtocols/multichain-arb
npm install
```

### 2. Configurar variables de entorno

Crea un archivo `.env` basado en `.env.example`:

```env
# Wallet
PRIVATE_KEY=0x...

# Timing
TICK_MS=700
DECISION_MS=5000

# Trading
MIN_PROFIT_USD=0.50
GAS_MULT=1.7

# Chains
CHAINS=base,arbitrum,optimism,polygon

# RPCs (usa tus propios endpoints)
BASE_RPC_READ=https://...
BASE_RPC_SIM=https://...
BASE_RPC_SEND=https://...
BASE_RPC_WS=wss://...

ARB_RPC_READ=https://...
# ... etc
```

### 3. Compilar el contrato

```bash
# Instalar Hardhat si no lo tienes
npm install --save-dev hardhat @nomicfoundation/hardhat-toolbox

# Compilar
npx hardhat compile
```

### 4. Desplegar el contrato

```bash
npx tsx scripts/deploy.ts base arbitrum optimism polygon
```

### 5. Ejecutar el bot

```bash
# Desarrollo (con hot reload)
npm run dev

# Producción
npm run build
npm start
```

---

## ⚙️ Configuración

### Variables de Entorno

| Variable | Descripción | Default |
|----------|-------------|---------|
| `PRIVATE_KEY` | Clave privada de la wallet | (requerido) |
| `TICK_MS` | Intervalo entre scans (ms) | 700 |
| `DECISION_MS` | Intervalo de rotación IA (ms) | 5000 |
| `MIN_PROFIT_USD` | Ganancia mínima en USD | 0.50 |
| `GAS_MULT` | Multiplicador de gas mínimo | 1.7 |
| `MAX_SLIPPAGE_BPS` | Slippage máximo (bps) | 10 |
| `CHAINS` | Cadenas habilitadas | base,arbitrum |
| `DRY_RUN` | Modo simulación | false |

### Rutas de Arbitraje

Edita `src/dex/routes.ts` para agregar/modificar rutas:

```typescript
{
  name: "USDC→WETH→USDT (500/500)",
  tokenIn: TOKENS.arbitrum.USDC,
  tokenMid: TOKENS.arbitrum.WETH,
  tokenOut: TOKENS.arbitrum.USDT,
  fee1: FEE_TIERS.LOW,
  fee2: FEE_TIERS.LOW,
  quoterV2: DEX_ADDRESSES.arbitrum.quoterV2,
  router: DEX_ADDRESSES.arbitrum.swapRouter,
  stableDecimals: 6
}
```

---

## 🧠 IA: Thompson Sampling Bandit

El bot usa un algoritmo Multi-Armed Bandit con Thompson Sampling para decidir en qué cadena operar:

### Cómo funciona

1. **Cada cadena es un "brazo"** con parámetros α (éxitos) y β (fracasos)
2. **Antes de cada decisión**, se muestrea de una distribución Beta(α, β)
3. **Se elige la cadena** con el valor muestreado más alto
4. **Después de cada trade**, se actualiza α o β según el resultado

### Ventajas

- ✅ Balance automático entre exploración y explotación
- ✅ Aprende de la experiencia real
- ✅ Se adapta a cambios en el mercado
- ✅ No requiere datos históricos para empezar

---

## 📊 Métricas y Estadísticas

El bot almacena métricas en SQLite:

```sql
-- Métricas por operación
SELECT * FROM chain_metrics ORDER BY ts DESC LIMIT 100;

-- Estadísticas por cadena
SELECT 
  chain,
  COUNT(*) as trades,
  SUM(profit_usd) as total_profit,
  AVG(latency_ms) as avg_latency
FROM chain_metrics
GROUP BY chain;

-- Estado del Bandit
SELECT * FROM bandit_state;
```

---

## 🔧 Lo que TÚ debes configurar

### 1. RPCs Privados

Los RPCs públicos son lentos y tienen límites. Necesitas:

- **Alchemy** o **Infura** para cada cadena
- O **nodos propios** para latencia mínima

### 2. Desplegar Contratos

```bash
# Compilar
npx hardhat compile

# Desplegar (actualiza el bytecode en deploy.ts)
npx tsx scripts/deploy.ts base arbitrum
```

### 3. Fondear Wallet

Necesitas en cada cadena:
- **Gas**: ~0.01 ETH (o MATIC en Polygon)
- **Capital**: USDC/USDT para operar (mínimo $100 recomendado)

### 4. Aprobar Tokens

El contrato ArbExecutor necesita aprobación para gastar tus tokens:

```javascript
// Ejemplo con ethers.js
const usdc = new Contract(USDC_ADDRESS, ERC20_ABI, signer);
await usdc.approve(EXECUTOR_ADDRESS, ethers.MaxUint256);
```

### 5. Ajustar Parámetros

Monitorea y ajusta según resultados:
- `MIN_PROFIT_USD`: Aumentar si hay muchos trades fallidos
- `GAS_MULT`: Aumentar en períodos de alta volatilidad de gas
- `TICK_MS`: Reducir para más velocidad (más consumo de RPC)

---

## ⚠️ Consideraciones Importantes

### Seguridad

- 🔐 **NUNCA** compartas tu `PRIVATE_KEY`
- 🔐 Usa una wallet dedicada para el bot
- 🔐 Empieza con capital pequeño

### Riesgos

- 💸 **Pérdida de gas** si los trades fallan
- 💸 **Slippage** si el mercado se mueve rápido
- 💸 **Front-running** por MEV bots

### Optimizaciones Futuras

- [ ] Flashbots/MEV protection
- [ ] WebSocket para actualizaciones en tiempo real
- [ ] Multicall para reducir latencia
- [ ] Más DEXs (Curve, Balancer, SushiSwap)

---

## 📞 Soporte

Para agregar nuevas cadenas o DEXs, modifica:
1. `config.ts` - Agregar configuración de la cadena
2. `routes.ts` - Agregar direcciones de tokens y DEX
3. `chainlink.ts` - Agregar feed de precio

---

## 📄 Licencia

MIT License - Uso bajo tu propio riesgo.



## Sistema de Arbitraje Multi-Cadena con IA

Un bot de arbitraje profesional que opera en múltiples cadenas L2 (Base, Arbitrum, Optimism, Polygon) utilizando inteligencia artificial para optimizar la selección de cadenas.

---

## 📋 Características

### ✅ Implementado (Lo que hice yo)

- **🧠 AI Bandit (Thompson Sampling)** - Algoritmo de aprendizaje que decide en qué cadena operar
- **📊 Base de Datos SQLite** - Almacenamiento de métricas y estadísticas
- **🔮 Oracle Chainlink** - Conversión precisa de gas a USD
- **💱 Integración Uniswap V3** - Quoter y Router para swaps
- **🔄 Simulador** - Validación de trades antes de ejecución
- **⚡ Worker Multi-Cadena** - Ejecutores independientes por cadena
- **🎮 Controller Principal** - Orquestación con rotación IA
- **📜 Contrato ArbExecutor** - Ejecución atómica de arbitrajes
- **🛠️ Configuración Completa** - Variables de entorno y tipos TypeScript

### ⏳ Lo que TÚ debes hacer

1. **Configurar RPCs privados** (Alchemy/Infura/propios)
2. **Compilar y desplegar ArbExecutor.sol** en cada cadena
3. **Fondear la wallet** con tokens estables (USDC) y gas (ETH/MATIC)
4. **Ajustar rutas** según liquidez actual del mercado
5. **Monitorear y ajustar** parámetros de ganancia mínima

---

## 🏗️ Arquitectura

```
┌─────────────────────────────────────────────────────────────────┐
│                     CONTROLLER (AI Rotator)                      │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  Thompson Sampling Bandit                                │   │
│  │  • Aprende qué cadena es más rentable                   │   │
│  │  • Rota automáticamente cada DECISION_MS                │   │
│  └─────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
                              │
        ┌─────────────────────┼─────────────────────┐
        ▼                     ▼                     ▼
┌───────────────┐    ┌───────────────┐    ┌───────────────┐
│  WORKER BASE  │    │ WORKER ARBITRUM│   │ WORKER OPTIMISM│
├───────────────┤    ├───────────────┤    ├───────────────┤
│ • Quote       │    │ • Quote       │    │ • Quote       │
│ • Simulate    │    │ • Simulate    │    │ • Simulate    │
│ • Gate (gas+) │    │ • Gate (gas+) │    │ • Gate (gas+) │
│ • Execute     │    │ • Execute     │    │ • Execute     │
└───────────────┘    └───────────────┘    └───────────────┘
        │                     │                     │
        ▼                     ▼                     ▼
┌───────────────┐    ┌───────────────┐    ┌───────────────┐
│ Chainlink     │    │ Chainlink     │    │ Chainlink     │
│ ETH/USD       │    │ ETH/USD       │    │ ETH/USD       │
└───────────────┘    └───────────────┘    └───────────────┘
```

---

## 📁 Estructura de Archivos

```
multichain-arb/
├── package.json
├── tsconfig.json
├── README.md
├── contracts/
│   └── ArbExecutor.sol          # Contrato de ejecución atómica
├── scripts/
│   └── deploy.ts                # Script de despliegue
└── src/
    ├── index.ts                 # Controller principal
    ├── config.ts                # Configuración y variables
    ├── logger.ts                # Sistema de logging
    ├── db.ts                    # Base de datos SQLite
    ├── ai/
    │   └── bandit.ts            # IA Thompson Sampling
    ├── oracle/
    │   ├── chainlink.ts         # Integración Chainlink
    │   └── price.ts             # Utilidades de precio
    ├── dex/
    │   ├── univ3.ts             # Integración Uniswap V3
    │   └── routes.ts            # Configuración de rutas
    └── worker/
        ├── worker.ts            # Worker por cadena
        ├── strategy.ts          # Estrategia de búsqueda
        ├── simulator.ts         # Simulador de trades
        └── executor.ts          # Ejecutor de transacciones
```

---

## 🚀 Instalación

### 1. Instalar dependencias

```bash
cd src/modules/DeFiProtocols/multichain-arb
npm install
```

### 2. Configurar variables de entorno

Crea un archivo `.env` basado en `.env.example`:

```env
# Wallet
PRIVATE_KEY=0x...

# Timing
TICK_MS=700
DECISION_MS=5000

# Trading
MIN_PROFIT_USD=0.50
GAS_MULT=1.7

# Chains
CHAINS=base,arbitrum,optimism,polygon

# RPCs (usa tus propios endpoints)
BASE_RPC_READ=https://...
BASE_RPC_SIM=https://...
BASE_RPC_SEND=https://...
BASE_RPC_WS=wss://...

ARB_RPC_READ=https://...
# ... etc
```

### 3. Compilar el contrato

```bash
# Instalar Hardhat si no lo tienes
npm install --save-dev hardhat @nomicfoundation/hardhat-toolbox

# Compilar
npx hardhat compile
```

### 4. Desplegar el contrato

```bash
npx tsx scripts/deploy.ts base arbitrum optimism polygon
```

### 5. Ejecutar el bot

```bash
# Desarrollo (con hot reload)
npm run dev

# Producción
npm run build
npm start
```

---

## ⚙️ Configuración

### Variables de Entorno

| Variable | Descripción | Default |
|----------|-------------|---------|
| `PRIVATE_KEY` | Clave privada de la wallet | (requerido) |
| `TICK_MS` | Intervalo entre scans (ms) | 700 |
| `DECISION_MS` | Intervalo de rotación IA (ms) | 5000 |
| `MIN_PROFIT_USD` | Ganancia mínima en USD | 0.50 |
| `GAS_MULT` | Multiplicador de gas mínimo | 1.7 |
| `MAX_SLIPPAGE_BPS` | Slippage máximo (bps) | 10 |
| `CHAINS` | Cadenas habilitadas | base,arbitrum |
| `DRY_RUN` | Modo simulación | false |

### Rutas de Arbitraje

Edita `src/dex/routes.ts` para agregar/modificar rutas:

```typescript
{
  name: "USDC→WETH→USDT (500/500)",
  tokenIn: TOKENS.arbitrum.USDC,
  tokenMid: TOKENS.arbitrum.WETH,
  tokenOut: TOKENS.arbitrum.USDT,
  fee1: FEE_TIERS.LOW,
  fee2: FEE_TIERS.LOW,
  quoterV2: DEX_ADDRESSES.arbitrum.quoterV2,
  router: DEX_ADDRESSES.arbitrum.swapRouter,
  stableDecimals: 6
}
```

---

## 🧠 IA: Thompson Sampling Bandit

El bot usa un algoritmo Multi-Armed Bandit con Thompson Sampling para decidir en qué cadena operar:

### Cómo funciona

1. **Cada cadena es un "brazo"** con parámetros α (éxitos) y β (fracasos)
2. **Antes de cada decisión**, se muestrea de una distribución Beta(α, β)
3. **Se elige la cadena** con el valor muestreado más alto
4. **Después de cada trade**, se actualiza α o β según el resultado

### Ventajas

- ✅ Balance automático entre exploración y explotación
- ✅ Aprende de la experiencia real
- ✅ Se adapta a cambios en el mercado
- ✅ No requiere datos históricos para empezar

---

## 📊 Métricas y Estadísticas

El bot almacena métricas en SQLite:

```sql
-- Métricas por operación
SELECT * FROM chain_metrics ORDER BY ts DESC LIMIT 100;

-- Estadísticas por cadena
SELECT 
  chain,
  COUNT(*) as trades,
  SUM(profit_usd) as total_profit,
  AVG(latency_ms) as avg_latency
FROM chain_metrics
GROUP BY chain;

-- Estado del Bandit
SELECT * FROM bandit_state;
```

---

## 🔧 Lo que TÚ debes configurar

### 1. RPCs Privados

Los RPCs públicos son lentos y tienen límites. Necesitas:

- **Alchemy** o **Infura** para cada cadena
- O **nodos propios** para latencia mínima

### 2. Desplegar Contratos

```bash
# Compilar
npx hardhat compile

# Desplegar (actualiza el bytecode en deploy.ts)
npx tsx scripts/deploy.ts base arbitrum
```

### 3. Fondear Wallet

Necesitas en cada cadena:
- **Gas**: ~0.01 ETH (o MATIC en Polygon)
- **Capital**: USDC/USDT para operar (mínimo $100 recomendado)

### 4. Aprobar Tokens

El contrato ArbExecutor necesita aprobación para gastar tus tokens:

```javascript
// Ejemplo con ethers.js
const usdc = new Contract(USDC_ADDRESS, ERC20_ABI, signer);
await usdc.approve(EXECUTOR_ADDRESS, ethers.MaxUint256);
```

### 5. Ajustar Parámetros

Monitorea y ajusta según resultados:
- `MIN_PROFIT_USD`: Aumentar si hay muchos trades fallidos
- `GAS_MULT`: Aumentar en períodos de alta volatilidad de gas
- `TICK_MS`: Reducir para más velocidad (más consumo de RPC)

---

## ⚠️ Consideraciones Importantes

### Seguridad

- 🔐 **NUNCA** compartas tu `PRIVATE_KEY`
- 🔐 Usa una wallet dedicada para el bot
- 🔐 Empieza con capital pequeño

### Riesgos

- 💸 **Pérdida de gas** si los trades fallan
- 💸 **Slippage** si el mercado se mueve rápido
- 💸 **Front-running** por MEV bots

### Optimizaciones Futuras

- [ ] Flashbots/MEV protection
- [ ] WebSocket para actualizaciones en tiempo real
- [ ] Multicall para reducir latencia
- [ ] Más DEXs (Curve, Balancer, SushiSwap)

---

## 📞 Soporte

Para agregar nuevas cadenas o DEXs, modifica:
1. `config.ts` - Agregar configuración de la cadena
2. `routes.ts` - Agregar direcciones de tokens y DEX
3. `chainlink.ts` - Agregar feed de precio

---

## 📄 Licencia

MIT License - Uso bajo tu propio riesgo.



## Sistema de Arbitraje Multi-Cadena con IA

Un bot de arbitraje profesional que opera en múltiples cadenas L2 (Base, Arbitrum, Optimism, Polygon) utilizando inteligencia artificial para optimizar la selección de cadenas.

---

## 📋 Características

### ✅ Implementado (Lo que hice yo)

- **🧠 AI Bandit (Thompson Sampling)** - Algoritmo de aprendizaje que decide en qué cadena operar
- **📊 Base de Datos SQLite** - Almacenamiento de métricas y estadísticas
- **🔮 Oracle Chainlink** - Conversión precisa de gas a USD
- **💱 Integración Uniswap V3** - Quoter y Router para swaps
- **🔄 Simulador** - Validación de trades antes de ejecución
- **⚡ Worker Multi-Cadena** - Ejecutores independientes por cadena
- **🎮 Controller Principal** - Orquestación con rotación IA
- **📜 Contrato ArbExecutor** - Ejecución atómica de arbitrajes
- **🛠️ Configuración Completa** - Variables de entorno y tipos TypeScript

### ⏳ Lo que TÚ debes hacer

1. **Configurar RPCs privados** (Alchemy/Infura/propios)
2. **Compilar y desplegar ArbExecutor.sol** en cada cadena
3. **Fondear la wallet** con tokens estables (USDC) y gas (ETH/MATIC)
4. **Ajustar rutas** según liquidez actual del mercado
5. **Monitorear y ajustar** parámetros de ganancia mínima

---

## 🏗️ Arquitectura

```
┌─────────────────────────────────────────────────────────────────┐
│                     CONTROLLER (AI Rotator)                      │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  Thompson Sampling Bandit                                │   │
│  │  • Aprende qué cadena es más rentable                   │   │
│  │  • Rota automáticamente cada DECISION_MS                │   │
│  └─────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
                              │
        ┌─────────────────────┼─────────────────────┐
        ▼                     ▼                     ▼
┌───────────────┐    ┌───────────────┐    ┌───────────────┐
│  WORKER BASE  │    │ WORKER ARBITRUM│   │ WORKER OPTIMISM│
├───────────────┤    ├───────────────┤    ├───────────────┤
│ • Quote       │    │ • Quote       │    │ • Quote       │
│ • Simulate    │    │ • Simulate    │    │ • Simulate    │
│ • Gate (gas+) │    │ • Gate (gas+) │    │ • Gate (gas+) │
│ • Execute     │    │ • Execute     │    │ • Execute     │
└───────────────┘    └───────────────┘    └───────────────┘
        │                     │                     │
        ▼                     ▼                     ▼
┌───────────────┐    ┌───────────────┐    ┌───────────────┐
│ Chainlink     │    │ Chainlink     │    │ Chainlink     │
│ ETH/USD       │    │ ETH/USD       │    │ ETH/USD       │
└───────────────┘    └───────────────┘    └───────────────┘
```

---

## 📁 Estructura de Archivos

```
multichain-arb/
├── package.json
├── tsconfig.json
├── README.md
├── contracts/
│   └── ArbExecutor.sol          # Contrato de ejecución atómica
├── scripts/
│   └── deploy.ts                # Script de despliegue
└── src/
    ├── index.ts                 # Controller principal
    ├── config.ts                # Configuración y variables
    ├── logger.ts                # Sistema de logging
    ├── db.ts                    # Base de datos SQLite
    ├── ai/
    │   └── bandit.ts            # IA Thompson Sampling
    ├── oracle/
    │   ├── chainlink.ts         # Integración Chainlink
    │   └── price.ts             # Utilidades de precio
    ├── dex/
    │   ├── univ3.ts             # Integración Uniswap V3
    │   └── routes.ts            # Configuración de rutas
    └── worker/
        ├── worker.ts            # Worker por cadena
        ├── strategy.ts          # Estrategia de búsqueda
        ├── simulator.ts         # Simulador de trades
        └── executor.ts          # Ejecutor de transacciones
```

---

## 🚀 Instalación

### 1. Instalar dependencias

```bash
cd src/modules/DeFiProtocols/multichain-arb
npm install
```

### 2. Configurar variables de entorno

Crea un archivo `.env` basado en `.env.example`:

```env
# Wallet
PRIVATE_KEY=0x...

# Timing
TICK_MS=700
DECISION_MS=5000

# Trading
MIN_PROFIT_USD=0.50
GAS_MULT=1.7

# Chains
CHAINS=base,arbitrum,optimism,polygon

# RPCs (usa tus propios endpoints)
BASE_RPC_READ=https://...
BASE_RPC_SIM=https://...
BASE_RPC_SEND=https://...
BASE_RPC_WS=wss://...

ARB_RPC_READ=https://...
# ... etc
```

### 3. Compilar el contrato

```bash
# Instalar Hardhat si no lo tienes
npm install --save-dev hardhat @nomicfoundation/hardhat-toolbox

# Compilar
npx hardhat compile
```

### 4. Desplegar el contrato

```bash
npx tsx scripts/deploy.ts base arbitrum optimism polygon
```

### 5. Ejecutar el bot

```bash
# Desarrollo (con hot reload)
npm run dev

# Producción
npm run build
npm start
```

---

## ⚙️ Configuración

### Variables de Entorno

| Variable | Descripción | Default |
|----------|-------------|---------|
| `PRIVATE_KEY` | Clave privada de la wallet | (requerido) |
| `TICK_MS` | Intervalo entre scans (ms) | 700 |
| `DECISION_MS` | Intervalo de rotación IA (ms) | 5000 |
| `MIN_PROFIT_USD` | Ganancia mínima en USD | 0.50 |
| `GAS_MULT` | Multiplicador de gas mínimo | 1.7 |
| `MAX_SLIPPAGE_BPS` | Slippage máximo (bps) | 10 |
| `CHAINS` | Cadenas habilitadas | base,arbitrum |
| `DRY_RUN` | Modo simulación | false |

### Rutas de Arbitraje

Edita `src/dex/routes.ts` para agregar/modificar rutas:

```typescript
{
  name: "USDC→WETH→USDT (500/500)",
  tokenIn: TOKENS.arbitrum.USDC,
  tokenMid: TOKENS.arbitrum.WETH,
  tokenOut: TOKENS.arbitrum.USDT,
  fee1: FEE_TIERS.LOW,
  fee2: FEE_TIERS.LOW,
  quoterV2: DEX_ADDRESSES.arbitrum.quoterV2,
  router: DEX_ADDRESSES.arbitrum.swapRouter,
  stableDecimals: 6
}
```

---

## 🧠 IA: Thompson Sampling Bandit

El bot usa un algoritmo Multi-Armed Bandit con Thompson Sampling para decidir en qué cadena operar:

### Cómo funciona

1. **Cada cadena es un "brazo"** con parámetros α (éxitos) y β (fracasos)
2. **Antes de cada decisión**, se muestrea de una distribución Beta(α, β)
3. **Se elige la cadena** con el valor muestreado más alto
4. **Después de cada trade**, se actualiza α o β según el resultado

### Ventajas

- ✅ Balance automático entre exploración y explotación
- ✅ Aprende de la experiencia real
- ✅ Se adapta a cambios en el mercado
- ✅ No requiere datos históricos para empezar

---

## 📊 Métricas y Estadísticas

El bot almacena métricas en SQLite:

```sql
-- Métricas por operación
SELECT * FROM chain_metrics ORDER BY ts DESC LIMIT 100;

-- Estadísticas por cadena
SELECT 
  chain,
  COUNT(*) as trades,
  SUM(profit_usd) as total_profit,
  AVG(latency_ms) as avg_latency
FROM chain_metrics
GROUP BY chain;

-- Estado del Bandit
SELECT * FROM bandit_state;
```

---

## 🔧 Lo que TÚ debes configurar

### 1. RPCs Privados

Los RPCs públicos son lentos y tienen límites. Necesitas:

- **Alchemy** o **Infura** para cada cadena
- O **nodos propios** para latencia mínima

### 2. Desplegar Contratos

```bash
# Compilar
npx hardhat compile

# Desplegar (actualiza el bytecode en deploy.ts)
npx tsx scripts/deploy.ts base arbitrum
```

### 3. Fondear Wallet

Necesitas en cada cadena:
- **Gas**: ~0.01 ETH (o MATIC en Polygon)
- **Capital**: USDC/USDT para operar (mínimo $100 recomendado)

### 4. Aprobar Tokens

El contrato ArbExecutor necesita aprobación para gastar tus tokens:

```javascript
// Ejemplo con ethers.js
const usdc = new Contract(USDC_ADDRESS, ERC20_ABI, signer);
await usdc.approve(EXECUTOR_ADDRESS, ethers.MaxUint256);
```

### 5. Ajustar Parámetros

Monitorea y ajusta según resultados:
- `MIN_PROFIT_USD`: Aumentar si hay muchos trades fallidos
- `GAS_MULT`: Aumentar en períodos de alta volatilidad de gas
- `TICK_MS`: Reducir para más velocidad (más consumo de RPC)

---

## ⚠️ Consideraciones Importantes

### Seguridad

- 🔐 **NUNCA** compartas tu `PRIVATE_KEY`
- 🔐 Usa una wallet dedicada para el bot
- 🔐 Empieza con capital pequeño

### Riesgos

- 💸 **Pérdida de gas** si los trades fallan
- 💸 **Slippage** si el mercado se mueve rápido
- 💸 **Front-running** por MEV bots

### Optimizaciones Futuras

- [ ] Flashbots/MEV protection
- [ ] WebSocket para actualizaciones en tiempo real
- [ ] Multicall para reducir latencia
- [ ] Más DEXs (Curve, Balancer, SushiSwap)

---

## 📞 Soporte

Para agregar nuevas cadenas o DEXs, modifica:
1. `config.ts` - Agregar configuración de la cadena
2. `routes.ts` - Agregar direcciones de tokens y DEX
3. `chainlink.ts` - Agregar feed de precio

---

## 📄 Licencia

MIT License - Uso bajo tu propio riesgo.



## Sistema de Arbitraje Multi-Cadena con IA

Un bot de arbitraje profesional que opera en múltiples cadenas L2 (Base, Arbitrum, Optimism, Polygon) utilizando inteligencia artificial para optimizar la selección de cadenas.

---

## 📋 Características

### ✅ Implementado (Lo que hice yo)

- **🧠 AI Bandit (Thompson Sampling)** - Algoritmo de aprendizaje que decide en qué cadena operar
- **📊 Base de Datos SQLite** - Almacenamiento de métricas y estadísticas
- **🔮 Oracle Chainlink** - Conversión precisa de gas a USD
- **💱 Integración Uniswap V3** - Quoter y Router para swaps
- **🔄 Simulador** - Validación de trades antes de ejecución
- **⚡ Worker Multi-Cadena** - Ejecutores independientes por cadena
- **🎮 Controller Principal** - Orquestación con rotación IA
- **📜 Contrato ArbExecutor** - Ejecución atómica de arbitrajes
- **🛠️ Configuración Completa** - Variables de entorno y tipos TypeScript

### ⏳ Lo que TÚ debes hacer

1. **Configurar RPCs privados** (Alchemy/Infura/propios)
2. **Compilar y desplegar ArbExecutor.sol** en cada cadena
3. **Fondear la wallet** con tokens estables (USDC) y gas (ETH/MATIC)
4. **Ajustar rutas** según liquidez actual del mercado
5. **Monitorear y ajustar** parámetros de ganancia mínima

---

## 🏗️ Arquitectura

```
┌─────────────────────────────────────────────────────────────────┐
│                     CONTROLLER (AI Rotator)                      │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  Thompson Sampling Bandit                                │   │
│  │  • Aprende qué cadena es más rentable                   │   │
│  │  • Rota automáticamente cada DECISION_MS                │   │
│  └─────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
                              │
        ┌─────────────────────┼─────────────────────┐
        ▼                     ▼                     ▼
┌───────────────┐    ┌───────────────┐    ┌───────────────┐
│  WORKER BASE  │    │ WORKER ARBITRUM│   │ WORKER OPTIMISM│
├───────────────┤    ├───────────────┤    ├───────────────┤
│ • Quote       │    │ • Quote       │    │ • Quote       │
│ • Simulate    │    │ • Simulate    │    │ • Simulate    │
│ • Gate (gas+) │    │ • Gate (gas+) │    │ • Gate (gas+) │
│ • Execute     │    │ • Execute     │    │ • Execute     │
└───────────────┘    └───────────────┘    └───────────────┘
        │                     │                     │
        ▼                     ▼                     ▼
┌───────────────┐    ┌───────────────┐    ┌───────────────┐
│ Chainlink     │    │ Chainlink     │    │ Chainlink     │
│ ETH/USD       │    │ ETH/USD       │    │ ETH/USD       │
└───────────────┘    └───────────────┘    └───────────────┘
```

---

## 📁 Estructura de Archivos

```
multichain-arb/
├── package.json
├── tsconfig.json
├── README.md
├── contracts/
│   └── ArbExecutor.sol          # Contrato de ejecución atómica
├── scripts/
│   └── deploy.ts                # Script de despliegue
└── src/
    ├── index.ts                 # Controller principal
    ├── config.ts                # Configuración y variables
    ├── logger.ts                # Sistema de logging
    ├── db.ts                    # Base de datos SQLite
    ├── ai/
    │   └── bandit.ts            # IA Thompson Sampling
    ├── oracle/
    │   ├── chainlink.ts         # Integración Chainlink
    │   └── price.ts             # Utilidades de precio
    ├── dex/
    │   ├── univ3.ts             # Integración Uniswap V3
    │   └── routes.ts            # Configuración de rutas
    └── worker/
        ├── worker.ts            # Worker por cadena
        ├── strategy.ts          # Estrategia de búsqueda
        ├── simulator.ts         # Simulador de trades
        └── executor.ts          # Ejecutor de transacciones
```

---

## 🚀 Instalación

### 1. Instalar dependencias

```bash
cd src/modules/DeFiProtocols/multichain-arb
npm install
```

### 2. Configurar variables de entorno

Crea un archivo `.env` basado en `.env.example`:

```env
# Wallet
PRIVATE_KEY=0x...

# Timing
TICK_MS=700
DECISION_MS=5000

# Trading
MIN_PROFIT_USD=0.50
GAS_MULT=1.7

# Chains
CHAINS=base,arbitrum,optimism,polygon

# RPCs (usa tus propios endpoints)
BASE_RPC_READ=https://...
BASE_RPC_SIM=https://...
BASE_RPC_SEND=https://...
BASE_RPC_WS=wss://...

ARB_RPC_READ=https://...
# ... etc
```

### 3. Compilar el contrato

```bash
# Instalar Hardhat si no lo tienes
npm install --save-dev hardhat @nomicfoundation/hardhat-toolbox

# Compilar
npx hardhat compile
```

### 4. Desplegar el contrato

```bash
npx tsx scripts/deploy.ts base arbitrum optimism polygon
```

### 5. Ejecutar el bot

```bash
# Desarrollo (con hot reload)
npm run dev

# Producción
npm run build
npm start
```

---

## ⚙️ Configuración

### Variables de Entorno

| Variable | Descripción | Default |
|----------|-------------|---------|
| `PRIVATE_KEY` | Clave privada de la wallet | (requerido) |
| `TICK_MS` | Intervalo entre scans (ms) | 700 |
| `DECISION_MS` | Intervalo de rotación IA (ms) | 5000 |
| `MIN_PROFIT_USD` | Ganancia mínima en USD | 0.50 |
| `GAS_MULT` | Multiplicador de gas mínimo | 1.7 |
| `MAX_SLIPPAGE_BPS` | Slippage máximo (bps) | 10 |
| `CHAINS` | Cadenas habilitadas | base,arbitrum |
| `DRY_RUN` | Modo simulación | false |

### Rutas de Arbitraje

Edita `src/dex/routes.ts` para agregar/modificar rutas:

```typescript
{
  name: "USDC→WETH→USDT (500/500)",
  tokenIn: TOKENS.arbitrum.USDC,
  tokenMid: TOKENS.arbitrum.WETH,
  tokenOut: TOKENS.arbitrum.USDT,
  fee1: FEE_TIERS.LOW,
  fee2: FEE_TIERS.LOW,
  quoterV2: DEX_ADDRESSES.arbitrum.quoterV2,
  router: DEX_ADDRESSES.arbitrum.swapRouter,
  stableDecimals: 6
}
```

---

## 🧠 IA: Thompson Sampling Bandit

El bot usa un algoritmo Multi-Armed Bandit con Thompson Sampling para decidir en qué cadena operar:

### Cómo funciona

1. **Cada cadena es un "brazo"** con parámetros α (éxitos) y β (fracasos)
2. **Antes de cada decisión**, se muestrea de una distribución Beta(α, β)
3. **Se elige la cadena** con el valor muestreado más alto
4. **Después de cada trade**, se actualiza α o β según el resultado

### Ventajas

- ✅ Balance automático entre exploración y explotación
- ✅ Aprende de la experiencia real
- ✅ Se adapta a cambios en el mercado
- ✅ No requiere datos históricos para empezar

---

## 📊 Métricas y Estadísticas

El bot almacena métricas en SQLite:

```sql
-- Métricas por operación
SELECT * FROM chain_metrics ORDER BY ts DESC LIMIT 100;

-- Estadísticas por cadena
SELECT 
  chain,
  COUNT(*) as trades,
  SUM(profit_usd) as total_profit,
  AVG(latency_ms) as avg_latency
FROM chain_metrics
GROUP BY chain;

-- Estado del Bandit
SELECT * FROM bandit_state;
```

---

## 🔧 Lo que TÚ debes configurar

### 1. RPCs Privados

Los RPCs públicos son lentos y tienen límites. Necesitas:

- **Alchemy** o **Infura** para cada cadena
- O **nodos propios** para latencia mínima

### 2. Desplegar Contratos

```bash
# Compilar
npx hardhat compile

# Desplegar (actualiza el bytecode en deploy.ts)
npx tsx scripts/deploy.ts base arbitrum
```

### 3. Fondear Wallet

Necesitas en cada cadena:
- **Gas**: ~0.01 ETH (o MATIC en Polygon)
- **Capital**: USDC/USDT para operar (mínimo $100 recomendado)

### 4. Aprobar Tokens

El contrato ArbExecutor necesita aprobación para gastar tus tokens:

```javascript
// Ejemplo con ethers.js
const usdc = new Contract(USDC_ADDRESS, ERC20_ABI, signer);
await usdc.approve(EXECUTOR_ADDRESS, ethers.MaxUint256);
```

### 5. Ajustar Parámetros

Monitorea y ajusta según resultados:
- `MIN_PROFIT_USD`: Aumentar si hay muchos trades fallidos
- `GAS_MULT`: Aumentar en períodos de alta volatilidad de gas
- `TICK_MS`: Reducir para más velocidad (más consumo de RPC)

---

## ⚠️ Consideraciones Importantes

### Seguridad

- 🔐 **NUNCA** compartas tu `PRIVATE_KEY`
- 🔐 Usa una wallet dedicada para el bot
- 🔐 Empieza con capital pequeño

### Riesgos

- 💸 **Pérdida de gas** si los trades fallan
- 💸 **Slippage** si el mercado se mueve rápido
- 💸 **Front-running** por MEV bots

### Optimizaciones Futuras

- [ ] Flashbots/MEV protection
- [ ] WebSocket para actualizaciones en tiempo real
- [ ] Multicall para reducir latencia
- [ ] Más DEXs (Curve, Balancer, SushiSwap)

---

## 📞 Soporte

Para agregar nuevas cadenas o DEXs, modifica:
1. `config.ts` - Agregar configuración de la cadena
2. `routes.ts` - Agregar direcciones de tokens y DEX
3. `chainlink.ts` - Agregar feed de precio

---

## 📄 Licencia

MIT License - Uso bajo tu propio riesgo.



## Sistema de Arbitraje Multi-Cadena con IA

Un bot de arbitraje profesional que opera en múltiples cadenas L2 (Base, Arbitrum, Optimism, Polygon) utilizando inteligencia artificial para optimizar la selección de cadenas.

---

## 📋 Características

### ✅ Implementado (Lo que hice yo)

- **🧠 AI Bandit (Thompson Sampling)** - Algoritmo de aprendizaje que decide en qué cadena operar
- **📊 Base de Datos SQLite** - Almacenamiento de métricas y estadísticas
- **🔮 Oracle Chainlink** - Conversión precisa de gas a USD
- **💱 Integración Uniswap V3** - Quoter y Router para swaps
- **🔄 Simulador** - Validación de trades antes de ejecución
- **⚡ Worker Multi-Cadena** - Ejecutores independientes por cadena
- **🎮 Controller Principal** - Orquestación con rotación IA
- **📜 Contrato ArbExecutor** - Ejecución atómica de arbitrajes
- **🛠️ Configuración Completa** - Variables de entorno y tipos TypeScript

### ⏳ Lo que TÚ debes hacer

1. **Configurar RPCs privados** (Alchemy/Infura/propios)
2. **Compilar y desplegar ArbExecutor.sol** en cada cadena
3. **Fondear la wallet** con tokens estables (USDC) y gas (ETH/MATIC)
4. **Ajustar rutas** según liquidez actual del mercado
5. **Monitorear y ajustar** parámetros de ganancia mínima

---

## 🏗️ Arquitectura

```
┌─────────────────────────────────────────────────────────────────┐
│                     CONTROLLER (AI Rotator)                      │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  Thompson Sampling Bandit                                │   │
│  │  • Aprende qué cadena es más rentable                   │   │
│  │  • Rota automáticamente cada DECISION_MS                │   │
│  └─────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
                              │
        ┌─────────────────────┼─────────────────────┐
        ▼                     ▼                     ▼
┌───────────────┐    ┌───────────────┐    ┌───────────────┐
│  WORKER BASE  │    │ WORKER ARBITRUM│   │ WORKER OPTIMISM│
├───────────────┤    ├───────────────┤    ├───────────────┤
│ • Quote       │    │ • Quote       │    │ • Quote       │
│ • Simulate    │    │ • Simulate    │    │ • Simulate    │
│ • Gate (gas+) │    │ • Gate (gas+) │    │ • Gate (gas+) │
│ • Execute     │    │ • Execute     │    │ • Execute     │
└───────────────┘    └───────────────┘    └───────────────┘
        │                     │                     │
        ▼                     ▼                     ▼
┌───────────────┐    ┌───────────────┐    ┌───────────────┐
│ Chainlink     │    │ Chainlink     │    │ Chainlink     │
│ ETH/USD       │    │ ETH/USD       │    │ ETH/USD       │
└───────────────┘    └───────────────┘    └───────────────┘
```

---

## 📁 Estructura de Archivos

```
multichain-arb/
├── package.json
├── tsconfig.json
├── README.md
├── contracts/
│   └── ArbExecutor.sol          # Contrato de ejecución atómica
├── scripts/
│   └── deploy.ts                # Script de despliegue
└── src/
    ├── index.ts                 # Controller principal
    ├── config.ts                # Configuración y variables
    ├── logger.ts                # Sistema de logging
    ├── db.ts                    # Base de datos SQLite
    ├── ai/
    │   └── bandit.ts            # IA Thompson Sampling
    ├── oracle/
    │   ├── chainlink.ts         # Integración Chainlink
    │   └── price.ts             # Utilidades de precio
    ├── dex/
    │   ├── univ3.ts             # Integración Uniswap V3
    │   └── routes.ts            # Configuración de rutas
    └── worker/
        ├── worker.ts            # Worker por cadena
        ├── strategy.ts          # Estrategia de búsqueda
        ├── simulator.ts         # Simulador de trades
        └── executor.ts          # Ejecutor de transacciones
```

---

## 🚀 Instalación

### 1. Instalar dependencias

```bash
cd src/modules/DeFiProtocols/multichain-arb
npm install
```

### 2. Configurar variables de entorno

Crea un archivo `.env` basado en `.env.example`:

```env
# Wallet
PRIVATE_KEY=0x...

# Timing
TICK_MS=700
DECISION_MS=5000

# Trading
MIN_PROFIT_USD=0.50
GAS_MULT=1.7

# Chains
CHAINS=base,arbitrum,optimism,polygon

# RPCs (usa tus propios endpoints)
BASE_RPC_READ=https://...
BASE_RPC_SIM=https://...
BASE_RPC_SEND=https://...
BASE_RPC_WS=wss://...

ARB_RPC_READ=https://...
# ... etc
```

### 3. Compilar el contrato

```bash
# Instalar Hardhat si no lo tienes
npm install --save-dev hardhat @nomicfoundation/hardhat-toolbox

# Compilar
npx hardhat compile
```

### 4. Desplegar el contrato

```bash
npx tsx scripts/deploy.ts base arbitrum optimism polygon
```

### 5. Ejecutar el bot

```bash
# Desarrollo (con hot reload)
npm run dev

# Producción
npm run build
npm start
```

---

## ⚙️ Configuración

### Variables de Entorno

| Variable | Descripción | Default |
|----------|-------------|---------|
| `PRIVATE_KEY` | Clave privada de la wallet | (requerido) |
| `TICK_MS` | Intervalo entre scans (ms) | 700 |
| `DECISION_MS` | Intervalo de rotación IA (ms) | 5000 |
| `MIN_PROFIT_USD` | Ganancia mínima en USD | 0.50 |
| `GAS_MULT` | Multiplicador de gas mínimo | 1.7 |
| `MAX_SLIPPAGE_BPS` | Slippage máximo (bps) | 10 |
| `CHAINS` | Cadenas habilitadas | base,arbitrum |
| `DRY_RUN` | Modo simulación | false |

### Rutas de Arbitraje

Edita `src/dex/routes.ts` para agregar/modificar rutas:

```typescript
{
  name: "USDC→WETH→USDT (500/500)",
  tokenIn: TOKENS.arbitrum.USDC,
  tokenMid: TOKENS.arbitrum.WETH,
  tokenOut: TOKENS.arbitrum.USDT,
  fee1: FEE_TIERS.LOW,
  fee2: FEE_TIERS.LOW,
  quoterV2: DEX_ADDRESSES.arbitrum.quoterV2,
  router: DEX_ADDRESSES.arbitrum.swapRouter,
  stableDecimals: 6
}
```

---

## 🧠 IA: Thompson Sampling Bandit

El bot usa un algoritmo Multi-Armed Bandit con Thompson Sampling para decidir en qué cadena operar:

### Cómo funciona

1. **Cada cadena es un "brazo"** con parámetros α (éxitos) y β (fracasos)
2. **Antes de cada decisión**, se muestrea de una distribución Beta(α, β)
3. **Se elige la cadena** con el valor muestreado más alto
4. **Después de cada trade**, se actualiza α o β según el resultado

### Ventajas

- ✅ Balance automático entre exploración y explotación
- ✅ Aprende de la experiencia real
- ✅ Se adapta a cambios en el mercado
- ✅ No requiere datos históricos para empezar

---

## 📊 Métricas y Estadísticas

El bot almacena métricas en SQLite:

```sql
-- Métricas por operación
SELECT * FROM chain_metrics ORDER BY ts DESC LIMIT 100;

-- Estadísticas por cadena
SELECT 
  chain,
  COUNT(*) as trades,
  SUM(profit_usd) as total_profit,
  AVG(latency_ms) as avg_latency
FROM chain_metrics
GROUP BY chain;

-- Estado del Bandit
SELECT * FROM bandit_state;
```

---

## 🔧 Lo que TÚ debes configurar

### 1. RPCs Privados

Los RPCs públicos son lentos y tienen límites. Necesitas:

- **Alchemy** o **Infura** para cada cadena
- O **nodos propios** para latencia mínima

### 2. Desplegar Contratos

```bash
# Compilar
npx hardhat compile

# Desplegar (actualiza el bytecode en deploy.ts)
npx tsx scripts/deploy.ts base arbitrum
```

### 3. Fondear Wallet

Necesitas en cada cadena:
- **Gas**: ~0.01 ETH (o MATIC en Polygon)
- **Capital**: USDC/USDT para operar (mínimo $100 recomendado)

### 4. Aprobar Tokens

El contrato ArbExecutor necesita aprobación para gastar tus tokens:

```javascript
// Ejemplo con ethers.js
const usdc = new Contract(USDC_ADDRESS, ERC20_ABI, signer);
await usdc.approve(EXECUTOR_ADDRESS, ethers.MaxUint256);
```

### 5. Ajustar Parámetros

Monitorea y ajusta según resultados:
- `MIN_PROFIT_USD`: Aumentar si hay muchos trades fallidos
- `GAS_MULT`: Aumentar en períodos de alta volatilidad de gas
- `TICK_MS`: Reducir para más velocidad (más consumo de RPC)

---

## ⚠️ Consideraciones Importantes

### Seguridad

- 🔐 **NUNCA** compartas tu `PRIVATE_KEY`
- 🔐 Usa una wallet dedicada para el bot
- 🔐 Empieza con capital pequeño

### Riesgos

- 💸 **Pérdida de gas** si los trades fallan
- 💸 **Slippage** si el mercado se mueve rápido
- 💸 **Front-running** por MEV bots

### Optimizaciones Futuras

- [ ] Flashbots/MEV protection
- [ ] WebSocket para actualizaciones en tiempo real
- [ ] Multicall para reducir latencia
- [ ] Más DEXs (Curve, Balancer, SushiSwap)

---

## 📞 Soporte

Para agregar nuevas cadenas o DEXs, modifica:
1. `config.ts` - Agregar configuración de la cadena
2. `routes.ts` - Agregar direcciones de tokens y DEX
3. `chainlink.ts` - Agregar feed de precio

---

## 📄 Licencia

MIT License - Uso bajo tu propio riesgo.



## Sistema de Arbitraje Multi-Cadena con IA

Un bot de arbitraje profesional que opera en múltiples cadenas L2 (Base, Arbitrum, Optimism, Polygon) utilizando inteligencia artificial para optimizar la selección de cadenas.

---

## 📋 Características

### ✅ Implementado (Lo que hice yo)

- **🧠 AI Bandit (Thompson Sampling)** - Algoritmo de aprendizaje que decide en qué cadena operar
- **📊 Base de Datos SQLite** - Almacenamiento de métricas y estadísticas
- **🔮 Oracle Chainlink** - Conversión precisa de gas a USD
- **💱 Integración Uniswap V3** - Quoter y Router para swaps
- **🔄 Simulador** - Validación de trades antes de ejecución
- **⚡ Worker Multi-Cadena** - Ejecutores independientes por cadena
- **🎮 Controller Principal** - Orquestación con rotación IA
- **📜 Contrato ArbExecutor** - Ejecución atómica de arbitrajes
- **🛠️ Configuración Completa** - Variables de entorno y tipos TypeScript

### ⏳ Lo que TÚ debes hacer

1. **Configurar RPCs privados** (Alchemy/Infura/propios)
2. **Compilar y desplegar ArbExecutor.sol** en cada cadena
3. **Fondear la wallet** con tokens estables (USDC) y gas (ETH/MATIC)
4. **Ajustar rutas** según liquidez actual del mercado
5. **Monitorear y ajustar** parámetros de ganancia mínima

---

## 🏗️ Arquitectura

```
┌─────────────────────────────────────────────────────────────────┐
│                     CONTROLLER (AI Rotator)                      │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  Thompson Sampling Bandit                                │   │
│  │  • Aprende qué cadena es más rentable                   │   │
│  │  • Rota automáticamente cada DECISION_MS                │   │
│  └─────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
                              │
        ┌─────────────────────┼─────────────────────┐
        ▼                     ▼                     ▼
┌───────────────┐    ┌───────────────┐    ┌───────────────┐
│  WORKER BASE  │    │ WORKER ARBITRUM│   │ WORKER OPTIMISM│
├───────────────┤    ├───────────────┤    ├───────────────┤
│ • Quote       │    │ • Quote       │    │ • Quote       │
│ • Simulate    │    │ • Simulate    │    │ • Simulate    │
│ • Gate (gas+) │    │ • Gate (gas+) │    │ • Gate (gas+) │
│ • Execute     │    │ • Execute     │    │ • Execute     │
└───────────────┘    └───────────────┘    └───────────────┘
        │                     │                     │
        ▼                     ▼                     ▼
┌───────────────┐    ┌───────────────┐    ┌───────────────┐
│ Chainlink     │    │ Chainlink     │    │ Chainlink     │
│ ETH/USD       │    │ ETH/USD       │    │ ETH/USD       │
└───────────────┘    └───────────────┘    └───────────────┘
```

---

## 📁 Estructura de Archivos

```
multichain-arb/
├── package.json
├── tsconfig.json
├── README.md
├── contracts/
│   └── ArbExecutor.sol          # Contrato de ejecución atómica
├── scripts/
│   └── deploy.ts                # Script de despliegue
└── src/
    ├── index.ts                 # Controller principal
    ├── config.ts                # Configuración y variables
    ├── logger.ts                # Sistema de logging
    ├── db.ts                    # Base de datos SQLite
    ├── ai/
    │   └── bandit.ts            # IA Thompson Sampling
    ├── oracle/
    │   ├── chainlink.ts         # Integración Chainlink
    │   └── price.ts             # Utilidades de precio
    ├── dex/
    │   ├── univ3.ts             # Integración Uniswap V3
    │   └── routes.ts            # Configuración de rutas
    └── worker/
        ├── worker.ts            # Worker por cadena
        ├── strategy.ts          # Estrategia de búsqueda
        ├── simulator.ts         # Simulador de trades
        └── executor.ts          # Ejecutor de transacciones
```

---

## 🚀 Instalación

### 1. Instalar dependencias

```bash
cd src/modules/DeFiProtocols/multichain-arb
npm install
```

### 2. Configurar variables de entorno

Crea un archivo `.env` basado en `.env.example`:

```env
# Wallet
PRIVATE_KEY=0x...

# Timing
TICK_MS=700
DECISION_MS=5000

# Trading
MIN_PROFIT_USD=0.50
GAS_MULT=1.7

# Chains
CHAINS=base,arbitrum,optimism,polygon

# RPCs (usa tus propios endpoints)
BASE_RPC_READ=https://...
BASE_RPC_SIM=https://...
BASE_RPC_SEND=https://...
BASE_RPC_WS=wss://...

ARB_RPC_READ=https://...
# ... etc
```

### 3. Compilar el contrato

```bash
# Instalar Hardhat si no lo tienes
npm install --save-dev hardhat @nomicfoundation/hardhat-toolbox

# Compilar
npx hardhat compile
```

### 4. Desplegar el contrato

```bash
npx tsx scripts/deploy.ts base arbitrum optimism polygon
```

### 5. Ejecutar el bot

```bash
# Desarrollo (con hot reload)
npm run dev

# Producción
npm run build
npm start
```

---

## ⚙️ Configuración

### Variables de Entorno

| Variable | Descripción | Default |
|----------|-------------|---------|
| `PRIVATE_KEY` | Clave privada de la wallet | (requerido) |
| `TICK_MS` | Intervalo entre scans (ms) | 700 |
| `DECISION_MS` | Intervalo de rotación IA (ms) | 5000 |
| `MIN_PROFIT_USD` | Ganancia mínima en USD | 0.50 |
| `GAS_MULT` | Multiplicador de gas mínimo | 1.7 |
| `MAX_SLIPPAGE_BPS` | Slippage máximo (bps) | 10 |
| `CHAINS` | Cadenas habilitadas | base,arbitrum |
| `DRY_RUN` | Modo simulación | false |

### Rutas de Arbitraje

Edita `src/dex/routes.ts` para agregar/modificar rutas:

```typescript
{
  name: "USDC→WETH→USDT (500/500)",
  tokenIn: TOKENS.arbitrum.USDC,
  tokenMid: TOKENS.arbitrum.WETH,
  tokenOut: TOKENS.arbitrum.USDT,
  fee1: FEE_TIERS.LOW,
  fee2: FEE_TIERS.LOW,
  quoterV2: DEX_ADDRESSES.arbitrum.quoterV2,
  router: DEX_ADDRESSES.arbitrum.swapRouter,
  stableDecimals: 6
}
```

---

## 🧠 IA: Thompson Sampling Bandit

El bot usa un algoritmo Multi-Armed Bandit con Thompson Sampling para decidir en qué cadena operar:

### Cómo funciona

1. **Cada cadena es un "brazo"** con parámetros α (éxitos) y β (fracasos)
2. **Antes de cada decisión**, se muestrea de una distribución Beta(α, β)
3. **Se elige la cadena** con el valor muestreado más alto
4. **Después de cada trade**, se actualiza α o β según el resultado

### Ventajas

- ✅ Balance automático entre exploración y explotación
- ✅ Aprende de la experiencia real
- ✅ Se adapta a cambios en el mercado
- ✅ No requiere datos históricos para empezar

---

## 📊 Métricas y Estadísticas

El bot almacena métricas en SQLite:

```sql
-- Métricas por operación
SELECT * FROM chain_metrics ORDER BY ts DESC LIMIT 100;

-- Estadísticas por cadena
SELECT 
  chain,
  COUNT(*) as trades,
  SUM(profit_usd) as total_profit,
  AVG(latency_ms) as avg_latency
FROM chain_metrics
GROUP BY chain;

-- Estado del Bandit
SELECT * FROM bandit_state;
```

---

## 🔧 Lo que TÚ debes configurar

### 1. RPCs Privados

Los RPCs públicos son lentos y tienen límites. Necesitas:

- **Alchemy** o **Infura** para cada cadena
- O **nodos propios** para latencia mínima

### 2. Desplegar Contratos

```bash
# Compilar
npx hardhat compile

# Desplegar (actualiza el bytecode en deploy.ts)
npx tsx scripts/deploy.ts base arbitrum
```

### 3. Fondear Wallet

Necesitas en cada cadena:
- **Gas**: ~0.01 ETH (o MATIC en Polygon)
- **Capital**: USDC/USDT para operar (mínimo $100 recomendado)

### 4. Aprobar Tokens

El contrato ArbExecutor necesita aprobación para gastar tus tokens:

```javascript
// Ejemplo con ethers.js
const usdc = new Contract(USDC_ADDRESS, ERC20_ABI, signer);
await usdc.approve(EXECUTOR_ADDRESS, ethers.MaxUint256);
```

### 5. Ajustar Parámetros

Monitorea y ajusta según resultados:
- `MIN_PROFIT_USD`: Aumentar si hay muchos trades fallidos
- `GAS_MULT`: Aumentar en períodos de alta volatilidad de gas
- `TICK_MS`: Reducir para más velocidad (más consumo de RPC)

---

## ⚠️ Consideraciones Importantes

### Seguridad

- 🔐 **NUNCA** compartas tu `PRIVATE_KEY`
- 🔐 Usa una wallet dedicada para el bot
- 🔐 Empieza con capital pequeño

### Riesgos

- 💸 **Pérdida de gas** si los trades fallan
- 💸 **Slippage** si el mercado se mueve rápido
- 💸 **Front-running** por MEV bots

### Optimizaciones Futuras

- [ ] Flashbots/MEV protection
- [ ] WebSocket para actualizaciones en tiempo real
- [ ] Multicall para reducir latencia
- [ ] Más DEXs (Curve, Balancer, SushiSwap)

---

## 📞 Soporte

Para agregar nuevas cadenas o DEXs, modifica:
1. `config.ts` - Agregar configuración de la cadena
2. `routes.ts` - Agregar direcciones de tokens y DEX
3. `chainlink.ts` - Agregar feed de precio

---

## 📄 Licencia

MIT License - Uso bajo tu propio riesgo.



## Sistema de Arbitraje Multi-Cadena con IA

Un bot de arbitraje profesional que opera en múltiples cadenas L2 (Base, Arbitrum, Optimism, Polygon) utilizando inteligencia artificial para optimizar la selección de cadenas.

---

## 📋 Características

### ✅ Implementado (Lo que hice yo)

- **🧠 AI Bandit (Thompson Sampling)** - Algoritmo de aprendizaje que decide en qué cadena operar
- **📊 Base de Datos SQLite** - Almacenamiento de métricas y estadísticas
- **🔮 Oracle Chainlink** - Conversión precisa de gas a USD
- **💱 Integración Uniswap V3** - Quoter y Router para swaps
- **🔄 Simulador** - Validación de trades antes de ejecución
- **⚡ Worker Multi-Cadena** - Ejecutores independientes por cadena
- **🎮 Controller Principal** - Orquestación con rotación IA
- **📜 Contrato ArbExecutor** - Ejecución atómica de arbitrajes
- **🛠️ Configuración Completa** - Variables de entorno y tipos TypeScript

### ⏳ Lo que TÚ debes hacer

1. **Configurar RPCs privados** (Alchemy/Infura/propios)
2. **Compilar y desplegar ArbExecutor.sol** en cada cadena
3. **Fondear la wallet** con tokens estables (USDC) y gas (ETH/MATIC)
4. **Ajustar rutas** según liquidez actual del mercado
5. **Monitorear y ajustar** parámetros de ganancia mínima

---

## 🏗️ Arquitectura

```
┌─────────────────────────────────────────────────────────────────┐
│                     CONTROLLER (AI Rotator)                      │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  Thompson Sampling Bandit                                │   │
│  │  • Aprende qué cadena es más rentable                   │   │
│  │  • Rota automáticamente cada DECISION_MS                │   │
│  └─────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
                              │
        ┌─────────────────────┼─────────────────────┐
        ▼                     ▼                     ▼
┌───────────────┐    ┌───────────────┐    ┌───────────────┐
│  WORKER BASE  │    │ WORKER ARBITRUM│   │ WORKER OPTIMISM│
├───────────────┤    ├───────────────┤    ├───────────────┤
│ • Quote       │    │ • Quote       │    │ • Quote       │
│ • Simulate    │    │ • Simulate    │    │ • Simulate    │
│ • Gate (gas+) │    │ • Gate (gas+) │    │ • Gate (gas+) │
│ • Execute     │    │ • Execute     │    │ • Execute     │
└───────────────┘    └───────────────┘    └───────────────┘
        │                     │                     │
        ▼                     ▼                     ▼
┌───────────────┐    ┌───────────────┐    ┌───────────────┐
│ Chainlink     │    │ Chainlink     │    │ Chainlink     │
│ ETH/USD       │    │ ETH/USD       │    │ ETH/USD       │
└───────────────┘    └───────────────┘    └───────────────┘
```

---

## 📁 Estructura de Archivos

```
multichain-arb/
├── package.json
├── tsconfig.json
├── README.md
├── contracts/
│   └── ArbExecutor.sol          # Contrato de ejecución atómica
├── scripts/
│   └── deploy.ts                # Script de despliegue
└── src/
    ├── index.ts                 # Controller principal
    ├── config.ts                # Configuración y variables
    ├── logger.ts                # Sistema de logging
    ├── db.ts                    # Base de datos SQLite
    ├── ai/
    │   └── bandit.ts            # IA Thompson Sampling
    ├── oracle/
    │   ├── chainlink.ts         # Integración Chainlink
    │   └── price.ts             # Utilidades de precio
    ├── dex/
    │   ├── univ3.ts             # Integración Uniswap V3
    │   └── routes.ts            # Configuración de rutas
    └── worker/
        ├── worker.ts            # Worker por cadena
        ├── strategy.ts          # Estrategia de búsqueda
        ├── simulator.ts         # Simulador de trades
        └── executor.ts          # Ejecutor de transacciones
```

---

## 🚀 Instalación

### 1. Instalar dependencias

```bash
cd src/modules/DeFiProtocols/multichain-arb
npm install
```

### 2. Configurar variables de entorno

Crea un archivo `.env` basado en `.env.example`:

```env
# Wallet
PRIVATE_KEY=0x...

# Timing
TICK_MS=700
DECISION_MS=5000

# Trading
MIN_PROFIT_USD=0.50
GAS_MULT=1.7

# Chains
CHAINS=base,arbitrum,optimism,polygon

# RPCs (usa tus propios endpoints)
BASE_RPC_READ=https://...
BASE_RPC_SIM=https://...
BASE_RPC_SEND=https://...
BASE_RPC_WS=wss://...

ARB_RPC_READ=https://...
# ... etc
```

### 3. Compilar el contrato

```bash
# Instalar Hardhat si no lo tienes
npm install --save-dev hardhat @nomicfoundation/hardhat-toolbox

# Compilar
npx hardhat compile
```

### 4. Desplegar el contrato

```bash
npx tsx scripts/deploy.ts base arbitrum optimism polygon
```

### 5. Ejecutar el bot

```bash
# Desarrollo (con hot reload)
npm run dev

# Producción
npm run build
npm start
```

---

## ⚙️ Configuración

### Variables de Entorno

| Variable | Descripción | Default |
|----------|-------------|---------|
| `PRIVATE_KEY` | Clave privada de la wallet | (requerido) |
| `TICK_MS` | Intervalo entre scans (ms) | 700 |
| `DECISION_MS` | Intervalo de rotación IA (ms) | 5000 |
| `MIN_PROFIT_USD` | Ganancia mínima en USD | 0.50 |
| `GAS_MULT` | Multiplicador de gas mínimo | 1.7 |
| `MAX_SLIPPAGE_BPS` | Slippage máximo (bps) | 10 |
| `CHAINS` | Cadenas habilitadas | base,arbitrum |
| `DRY_RUN` | Modo simulación | false |

### Rutas de Arbitraje

Edita `src/dex/routes.ts` para agregar/modificar rutas:

```typescript
{
  name: "USDC→WETH→USDT (500/500)",
  tokenIn: TOKENS.arbitrum.USDC,
  tokenMid: TOKENS.arbitrum.WETH,
  tokenOut: TOKENS.arbitrum.USDT,
  fee1: FEE_TIERS.LOW,
  fee2: FEE_TIERS.LOW,
  quoterV2: DEX_ADDRESSES.arbitrum.quoterV2,
  router: DEX_ADDRESSES.arbitrum.swapRouter,
  stableDecimals: 6
}
```

---

## 🧠 IA: Thompson Sampling Bandit

El bot usa un algoritmo Multi-Armed Bandit con Thompson Sampling para decidir en qué cadena operar:

### Cómo funciona

1. **Cada cadena es un "brazo"** con parámetros α (éxitos) y β (fracasos)
2. **Antes de cada decisión**, se muestrea de una distribución Beta(α, β)
3. **Se elige la cadena** con el valor muestreado más alto
4. **Después de cada trade**, se actualiza α o β según el resultado

### Ventajas

- ✅ Balance automático entre exploración y explotación
- ✅ Aprende de la experiencia real
- ✅ Se adapta a cambios en el mercado
- ✅ No requiere datos históricos para empezar

---

## 📊 Métricas y Estadísticas

El bot almacena métricas en SQLite:

```sql
-- Métricas por operación
SELECT * FROM chain_metrics ORDER BY ts DESC LIMIT 100;

-- Estadísticas por cadena
SELECT 
  chain,
  COUNT(*) as trades,
  SUM(profit_usd) as total_profit,
  AVG(latency_ms) as avg_latency
FROM chain_metrics
GROUP BY chain;

-- Estado del Bandit
SELECT * FROM bandit_state;
```

---

## 🔧 Lo que TÚ debes configurar

### 1. RPCs Privados

Los RPCs públicos son lentos y tienen límites. Necesitas:

- **Alchemy** o **Infura** para cada cadena
- O **nodos propios** para latencia mínima

### 2. Desplegar Contratos

```bash
# Compilar
npx hardhat compile

# Desplegar (actualiza el bytecode en deploy.ts)
npx tsx scripts/deploy.ts base arbitrum
```

### 3. Fondear Wallet

Necesitas en cada cadena:
- **Gas**: ~0.01 ETH (o MATIC en Polygon)
- **Capital**: USDC/USDT para operar (mínimo $100 recomendado)

### 4. Aprobar Tokens

El contrato ArbExecutor necesita aprobación para gastar tus tokens:

```javascript
// Ejemplo con ethers.js
const usdc = new Contract(USDC_ADDRESS, ERC20_ABI, signer);
await usdc.approve(EXECUTOR_ADDRESS, ethers.MaxUint256);
```

### 5. Ajustar Parámetros

Monitorea y ajusta según resultados:
- `MIN_PROFIT_USD`: Aumentar si hay muchos trades fallidos
- `GAS_MULT`: Aumentar en períodos de alta volatilidad de gas
- `TICK_MS`: Reducir para más velocidad (más consumo de RPC)

---

## ⚠️ Consideraciones Importantes

### Seguridad

- 🔐 **NUNCA** compartas tu `PRIVATE_KEY`
- 🔐 Usa una wallet dedicada para el bot
- 🔐 Empieza con capital pequeño

### Riesgos

- 💸 **Pérdida de gas** si los trades fallan
- 💸 **Slippage** si el mercado se mueve rápido
- 💸 **Front-running** por MEV bots

### Optimizaciones Futuras

- [ ] Flashbots/MEV protection
- [ ] WebSocket para actualizaciones en tiempo real
- [ ] Multicall para reducir latencia
- [ ] Más DEXs (Curve, Balancer, SushiSwap)

---

## 📞 Soporte

Para agregar nuevas cadenas o DEXs, modifica:
1. `config.ts` - Agregar configuración de la cadena
2. `routes.ts` - Agregar direcciones de tokens y DEX
3. `chainlink.ts` - Agregar feed de precio

---

## 📄 Licencia

MIT License - Uso bajo tu propio riesgo.




