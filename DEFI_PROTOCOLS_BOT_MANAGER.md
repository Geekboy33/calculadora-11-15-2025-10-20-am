# 🤖 DeFi Protocols Bot Manager - DOCUMENTACIÓN COMPLETA

## 📋 Índice
1. [Introducción](#introducción)
2. [Arquitectura](#arquitectura)
3. [Instalación](#instalación)
4. [Uso Rápido](#uso-rápido)
5. [Crear Bots](#crear-bots)
6. [API](#api)
7. [Ejemplos](#ejemplos)

---

## 🎯 Introducción

El **DeFi Protocols Bot Manager** es un módulo completo para crear, configurar y gestionar múltiples bots autónomos de trading en redes Layer 2 como Arbitrum One.

### Características Principales

✅ **Arquitectura Modular**: Agregar nuevos tipos de bots sin modificar el core  
✅ **Multi-Red**: Soporta Ethereum, Arbitrum, Optimism, Polygon, Base  
✅ **Gestión Centralizada**: Control de múltiples bots desde un panel  
✅ **Estadísticas en Tiempo Real**: Monitoreo de ganancias y operaciones  
✅ **Seguridad**: Stop loss, take profit, límites diarios  
✅ **Almacenamiento**: Exportar/importar configuraciones  

---

## 🏗️ Arquitectura

```
DeFiProtocolsModule
├── Types/
│   └── index.ts (BotConfig, BotType, NetworkType, etc)
├── Services/
│   └── BotManager.ts (Gestor central de bots)
├── Executors/
│   ├── ArbitrageExecutor.ts (Bot de arbitrage)
│   ├── LiquidityExecutor.ts (Bot de liquidez - próximo)
│   ├── YieldExecutor.ts (Bot de yield farming - próximo)
│   └── ... (más ejecutores)
├── Components/
│   └── DeFiProtocolsModule.tsx (UI React)
└── API/
    └── defi-routes.ts (Rutas del backend)
```

---

## 💿 Instalación

### Requisitos
- Node.js 18+
- ethers.js v6
- React 18+
- TypeScript

### Archivos Necesarios

1. **`src/modules/DeFiProtocols/types/index.ts`** - Definiciones de tipos
2. **`src/modules/DeFiProtocols/services/BotManager.ts`** - Gestor de bots
3. **`src/modules/DeFiProtocols/executors/ArbitrageExecutor.ts`** - Ejecutor de arbitrage
4. **`src/components/DeFiProtocolsModule.tsx`** - Componente React

---

## 🚀 Uso Rápido

### 1. Inicializar el Manager

```typescript
import { BotManager } from './services/BotManager';
import { ArbitrageExecutor } from './executors/ArbitrageExecutor';

const manager = new BotManager();
const executor = new ArbitrageExecutor(
  'https://arb1.arbitrum.io/rpc',
  'YOUR_PRIVATE_KEY'
);

manager.registerBotExecutor('arbitrage', executor);
```

### 2. Crear un Bot

```typescript
const botConfig = manager.createBot({
  id: 'bot-arbitrage-01',
  name: 'Arbitrage Bot #1',
  type: 'arbitrage',
  network: 'arbitrum',
  enabled: false,
  status: 'idle',
  capital: 10000,
  maxCapitalPerTrade: 1000,
  minProfitThreshold: 0.5,
  parameters: {
    pairs: [
      {
        tokenIn: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831', // USDC
        tokenOut: '0xfd086bc7cd5c481dcc9c85efe8c1cad8596992c9', // USDT
        dex1: 'uniswap',
        dex2: 'curve'
      }
    ],
    maxSlippage: 1.5,
    minProfit: 0.5
  },
  checkIntervalSeconds: 60,
  stopLoss: 5,
  takeProfit: 10,
  maxDailyLoss: 500
});
```

### 3. Activar el Bot

```typescript
await manager.activateBot('bot-arbitrage-01');
```

### 4. Obtener Estadísticas

```typescript
const stats = manager.getOverallStats();
console.log(`Ganancia total: $${stats.totalProfit.toFixed(2)}`);
console.log(`ROI promedio: ${stats.averageROI.toFixed(2)}%`);
```

---

## 🤖 Crear Nuevos Tipos de Bots

### Estructura de un Ejecutor

```typescript
import { BotConfig, BotExecutionResult } from '../types';
import { BotExecutor } from '../services/BotManager';

export class MyCustomExecutor implements BotExecutor {
  validate(config: BotConfig): boolean {
    // Validar configuración
    return true;
  }

  async execute(config: BotConfig): Promise<BotExecutionResult> {
    try {
      // Implementar lógica del bot
      return {
        success: true,
        trade: { /* trade details */ }
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message
      };
    }
  }
}
```

### Registrar el Nuevo Ejecutor

```typescript
const customExecutor = new MyCustomExecutor();
manager.registerBotExecutor('my-bot-type', customExecutor);
```

---

## 📡 API Backend

### Endpoints

#### GET `/api/defi/bots`
Obtener todos los bots y estadísticas generales
```json
{
  "bots": [...],
  "stats": {
    "totalBots": 5,
    "activeBots": 2,
    "totalProfit": 5000,
    "averageROI": 12.5
  }
}
```

#### POST `/api/defi/bots`
Crear un nuevo bot
```json
{
  "name": "Arbitrage Bot",
  "type": "arbitrage",
  "network": "arbitrum",
  "capital": 10000,
  ...
}
```

#### POST `/api/defi/bots/{botId}/activate`
Activar un bot

#### POST `/api/defi/bots/{botId}/pause`
Pausar un bot

#### GET `/api/defi/bots/{botId}/trades`
Obtener todas las operaciones de un bot

#### GET `/api/defi/bots/{botId}/stats`
Obtener estadísticas de un bot específico

---

## 📚 Ejemplos

### Ejemplo 1: Bot de Arbitrage en Arbitrum

```typescript
const arbitrageBot = manager.createBot({
  name: 'Arbitrage USDC-USDT',
  type: 'arbitrage',
  network: 'arbitrum',
  capital: 10000,
  maxCapitalPerTrade: 500,
  minProfitThreshold: 0.3,
  parameters: {
    pairs: [
      {
        tokenIn: USDC,
        tokenOut: USDT,
        dex1: 'uniswap',
        dex2: 'curve'
      },
      {
        tokenIn: USDC,
        tokenOut: DAI,
        dex1: 'uniswap',
        dex2: 'balancer'
      }
    ],
    maxSlippage: 1.5,
    minProfit: 0.3
  },
  checkIntervalSeconds: 30,
  stopLoss: 2,
  takeProfit: 5,
  maxDailyLoss: 1000
});

await manager.activateBot(arbitrageBot.id);
```

### Ejemplo 2: Múltiples Bots

```typescript
const bots = [
  { name: 'Arbitrage Bot 1', ... },
  { name: 'Arbitrage Bot 2', ... },
  { name: 'Yield Farming Bot', ... },
  { name: 'Liquidity Bot', ... }
];

for (const botConfig of bots) {
  const bot = manager.createBot(botConfig);
  await manager.activateBot(bot.id);
}

// Monitorear todos
setInterval(() => {
  const stats = manager.getOverallStats();
  console.log(`📊 Ganancias: $${stats.totalProfit}`);
}, 60000);
```

### Ejemplo 3: Exportar/Importar Configuración

```typescript
// Exportar
const configJson = manager.exportConfig();
fs.writeFileSync('bots-config.json', configJson);

// Importar en otra instancia
const newManager = new BotManager();
newManager.importConfig(fs.readFileSync('bots-config.json', 'utf8'));
```

---

## 🎨 UI React

El componente `DeFiProtocolsModule.tsx` proporciona:

- **Dashboard**: Estadísticas generales en tiempo real
- **Bot Manager**: Crear, activar, pausar, detener bots
- **Bot Form**: Formulario intuitivo para crear bots
- **Bot Cards**: Visualización de bots con estadísticas
- **Bot Details**: Detalles completos de cada bot

### Integración en la App

```typescript
import DeFiProtocolsModule from './components/DeFiProtocolsModule';

export const App = () => {
  return (
    <div>
      <DeFiProtocolsModule />
    </div>
  );
};
```

---

## 🔄 Próximos Pasos

1. ✅ **Arbitrage Executor** - Implementado
2. ⏭️ **Liquidity Executor** - Próximo bot tipo
3. ⏭️ **Yield Farming Executor** - Bot de farming
4. ⏭️ **Flash Loan Executor** - Bot con flash loans
5. ⏭️ **DEX Aggregator** - Agregación de DEXs
6. ⏭️ **Persistencia de Base de Datos** - MongoDB/PostgreSQL
7. ⏭️ **WebSocket en Tiempo Real** - Actualizaciones live
8. ⏭️ **Alertas y Notificaciones** - Discord/Telegram

---

## 📞 Soporte

Para agregar un nuevo tipo de bot o ejecutor personalizado, sigue la interfaz `BotExecutor` y registra el ejecutor con el `BotManager`.




## 📋 Índice
1. [Introducción](#introducción)
2. [Arquitectura](#arquitectura)
3. [Instalación](#instalación)
4. [Uso Rápido](#uso-rápido)
5. [Crear Bots](#crear-bots)
6. [API](#api)
7. [Ejemplos](#ejemplos)

---

## 🎯 Introducción

El **DeFi Protocols Bot Manager** es un módulo completo para crear, configurar y gestionar múltiples bots autónomos de trading en redes Layer 2 como Arbitrum One.

### Características Principales

✅ **Arquitectura Modular**: Agregar nuevos tipos de bots sin modificar el core  
✅ **Multi-Red**: Soporta Ethereum, Arbitrum, Optimism, Polygon, Base  
✅ **Gestión Centralizada**: Control de múltiples bots desde un panel  
✅ **Estadísticas en Tiempo Real**: Monitoreo de ganancias y operaciones  
✅ **Seguridad**: Stop loss, take profit, límites diarios  
✅ **Almacenamiento**: Exportar/importar configuraciones  

---

## 🏗️ Arquitectura

```
DeFiProtocolsModule
├── Types/
│   └── index.ts (BotConfig, BotType, NetworkType, etc)
├── Services/
│   └── BotManager.ts (Gestor central de bots)
├── Executors/
│   ├── ArbitrageExecutor.ts (Bot de arbitrage)
│   ├── LiquidityExecutor.ts (Bot de liquidez - próximo)
│   ├── YieldExecutor.ts (Bot de yield farming - próximo)
│   └── ... (más ejecutores)
├── Components/
│   └── DeFiProtocolsModule.tsx (UI React)
└── API/
    └── defi-routes.ts (Rutas del backend)
```

---

## 💿 Instalación

### Requisitos
- Node.js 18+
- ethers.js v6
- React 18+
- TypeScript

### Archivos Necesarios

1. **`src/modules/DeFiProtocols/types/index.ts`** - Definiciones de tipos
2. **`src/modules/DeFiProtocols/services/BotManager.ts`** - Gestor de bots
3. **`src/modules/DeFiProtocols/executors/ArbitrageExecutor.ts`** - Ejecutor de arbitrage
4. **`src/components/DeFiProtocolsModule.tsx`** - Componente React

---

## 🚀 Uso Rápido

### 1. Inicializar el Manager

```typescript
import { BotManager } from './services/BotManager';
import { ArbitrageExecutor } from './executors/ArbitrageExecutor';

const manager = new BotManager();
const executor = new ArbitrageExecutor(
  'https://arb1.arbitrum.io/rpc',
  'YOUR_PRIVATE_KEY'
);

manager.registerBotExecutor('arbitrage', executor);
```

### 2. Crear un Bot

```typescript
const botConfig = manager.createBot({
  id: 'bot-arbitrage-01',
  name: 'Arbitrage Bot #1',
  type: 'arbitrage',
  network: 'arbitrum',
  enabled: false,
  status: 'idle',
  capital: 10000,
  maxCapitalPerTrade: 1000,
  minProfitThreshold: 0.5,
  parameters: {
    pairs: [
      {
        tokenIn: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831', // USDC
        tokenOut: '0xfd086bc7cd5c481dcc9c85efe8c1cad8596992c9', // USDT
        dex1: 'uniswap',
        dex2: 'curve'
      }
    ],
    maxSlippage: 1.5,
    minProfit: 0.5
  },
  checkIntervalSeconds: 60,
  stopLoss: 5,
  takeProfit: 10,
  maxDailyLoss: 500
});
```

### 3. Activar el Bot

```typescript
await manager.activateBot('bot-arbitrage-01');
```

### 4. Obtener Estadísticas

```typescript
const stats = manager.getOverallStats();
console.log(`Ganancia total: $${stats.totalProfit.toFixed(2)}`);
console.log(`ROI promedio: ${stats.averageROI.toFixed(2)}%`);
```

---

## 🤖 Crear Nuevos Tipos de Bots

### Estructura de un Ejecutor

```typescript
import { BotConfig, BotExecutionResult } from '../types';
import { BotExecutor } from '../services/BotManager';

export class MyCustomExecutor implements BotExecutor {
  validate(config: BotConfig): boolean {
    // Validar configuración
    return true;
  }

  async execute(config: BotConfig): Promise<BotExecutionResult> {
    try {
      // Implementar lógica del bot
      return {
        success: true,
        trade: { /* trade details */ }
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message
      };
    }
  }
}
```

### Registrar el Nuevo Ejecutor

```typescript
const customExecutor = new MyCustomExecutor();
manager.registerBotExecutor('my-bot-type', customExecutor);
```

---

## 📡 API Backend

### Endpoints

#### GET `/api/defi/bots`
Obtener todos los bots y estadísticas generales
```json
{
  "bots": [...],
  "stats": {
    "totalBots": 5,
    "activeBots": 2,
    "totalProfit": 5000,
    "averageROI": 12.5
  }
}
```

#### POST `/api/defi/bots`
Crear un nuevo bot
```json
{
  "name": "Arbitrage Bot",
  "type": "arbitrage",
  "network": "arbitrum",
  "capital": 10000,
  ...
}
```

#### POST `/api/defi/bots/{botId}/activate`
Activar un bot

#### POST `/api/defi/bots/{botId}/pause`
Pausar un bot

#### GET `/api/defi/bots/{botId}/trades`
Obtener todas las operaciones de un bot

#### GET `/api/defi/bots/{botId}/stats`
Obtener estadísticas de un bot específico

---

## 📚 Ejemplos

### Ejemplo 1: Bot de Arbitrage en Arbitrum

```typescript
const arbitrageBot = manager.createBot({
  name: 'Arbitrage USDC-USDT',
  type: 'arbitrage',
  network: 'arbitrum',
  capital: 10000,
  maxCapitalPerTrade: 500,
  minProfitThreshold: 0.3,
  parameters: {
    pairs: [
      {
        tokenIn: USDC,
        tokenOut: USDT,
        dex1: 'uniswap',
        dex2: 'curve'
      },
      {
        tokenIn: USDC,
        tokenOut: DAI,
        dex1: 'uniswap',
        dex2: 'balancer'
      }
    ],
    maxSlippage: 1.5,
    minProfit: 0.3
  },
  checkIntervalSeconds: 30,
  stopLoss: 2,
  takeProfit: 5,
  maxDailyLoss: 1000
});

await manager.activateBot(arbitrageBot.id);
```

### Ejemplo 2: Múltiples Bots

```typescript
const bots = [
  { name: 'Arbitrage Bot 1', ... },
  { name: 'Arbitrage Bot 2', ... },
  { name: 'Yield Farming Bot', ... },
  { name: 'Liquidity Bot', ... }
];

for (const botConfig of bots) {
  const bot = manager.createBot(botConfig);
  await manager.activateBot(bot.id);
}

// Monitorear todos
setInterval(() => {
  const stats = manager.getOverallStats();
  console.log(`📊 Ganancias: $${stats.totalProfit}`);
}, 60000);
```

### Ejemplo 3: Exportar/Importar Configuración

```typescript
// Exportar
const configJson = manager.exportConfig();
fs.writeFileSync('bots-config.json', configJson);

// Importar en otra instancia
const newManager = new BotManager();
newManager.importConfig(fs.readFileSync('bots-config.json', 'utf8'));
```

---

## 🎨 UI React

El componente `DeFiProtocolsModule.tsx` proporciona:

- **Dashboard**: Estadísticas generales en tiempo real
- **Bot Manager**: Crear, activar, pausar, detener bots
- **Bot Form**: Formulario intuitivo para crear bots
- **Bot Cards**: Visualización de bots con estadísticas
- **Bot Details**: Detalles completos de cada bot

### Integración en la App

```typescript
import DeFiProtocolsModule from './components/DeFiProtocolsModule';

export const App = () => {
  return (
    <div>
      <DeFiProtocolsModule />
    </div>
  );
};
```

---

## 🔄 Próximos Pasos

1. ✅ **Arbitrage Executor** - Implementado
2. ⏭️ **Liquidity Executor** - Próximo bot tipo
3. ⏭️ **Yield Farming Executor** - Bot de farming
4. ⏭️ **Flash Loan Executor** - Bot con flash loans
5. ⏭️ **DEX Aggregator** - Agregación de DEXs
6. ⏭️ **Persistencia de Base de Datos** - MongoDB/PostgreSQL
7. ⏭️ **WebSocket en Tiempo Real** - Actualizaciones live
8. ⏭️ **Alertas y Notificaciones** - Discord/Telegram

---

## 📞 Soporte

Para agregar un nuevo tipo de bot o ejecutor personalizado, sigue la interfaz `BotExecutor` y registra el ejecutor con el `BotManager`.





## 📋 Índice
1. [Introducción](#introducción)
2. [Arquitectura](#arquitectura)
3. [Instalación](#instalación)
4. [Uso Rápido](#uso-rápido)
5. [Crear Bots](#crear-bots)
6. [API](#api)
7. [Ejemplos](#ejemplos)

---

## 🎯 Introducción

El **DeFi Protocols Bot Manager** es un módulo completo para crear, configurar y gestionar múltiples bots autónomos de trading en redes Layer 2 como Arbitrum One.

### Características Principales

✅ **Arquitectura Modular**: Agregar nuevos tipos de bots sin modificar el core  
✅ **Multi-Red**: Soporta Ethereum, Arbitrum, Optimism, Polygon, Base  
✅ **Gestión Centralizada**: Control de múltiples bots desde un panel  
✅ **Estadísticas en Tiempo Real**: Monitoreo de ganancias y operaciones  
✅ **Seguridad**: Stop loss, take profit, límites diarios  
✅ **Almacenamiento**: Exportar/importar configuraciones  

---

## 🏗️ Arquitectura

```
DeFiProtocolsModule
├── Types/
│   └── index.ts (BotConfig, BotType, NetworkType, etc)
├── Services/
│   └── BotManager.ts (Gestor central de bots)
├── Executors/
│   ├── ArbitrageExecutor.ts (Bot de arbitrage)
│   ├── LiquidityExecutor.ts (Bot de liquidez - próximo)
│   ├── YieldExecutor.ts (Bot de yield farming - próximo)
│   └── ... (más ejecutores)
├── Components/
│   └── DeFiProtocolsModule.tsx (UI React)
└── API/
    └── defi-routes.ts (Rutas del backend)
```

---

## 💿 Instalación

### Requisitos
- Node.js 18+
- ethers.js v6
- React 18+
- TypeScript

### Archivos Necesarios

1. **`src/modules/DeFiProtocols/types/index.ts`** - Definiciones de tipos
2. **`src/modules/DeFiProtocols/services/BotManager.ts`** - Gestor de bots
3. **`src/modules/DeFiProtocols/executors/ArbitrageExecutor.ts`** - Ejecutor de arbitrage
4. **`src/components/DeFiProtocolsModule.tsx`** - Componente React

---

## 🚀 Uso Rápido

### 1. Inicializar el Manager

```typescript
import { BotManager } from './services/BotManager';
import { ArbitrageExecutor } from './executors/ArbitrageExecutor';

const manager = new BotManager();
const executor = new ArbitrageExecutor(
  'https://arb1.arbitrum.io/rpc',
  'YOUR_PRIVATE_KEY'
);

manager.registerBotExecutor('arbitrage', executor);
```

### 2. Crear un Bot

```typescript
const botConfig = manager.createBot({
  id: 'bot-arbitrage-01',
  name: 'Arbitrage Bot #1',
  type: 'arbitrage',
  network: 'arbitrum',
  enabled: false,
  status: 'idle',
  capital: 10000,
  maxCapitalPerTrade: 1000,
  minProfitThreshold: 0.5,
  parameters: {
    pairs: [
      {
        tokenIn: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831', // USDC
        tokenOut: '0xfd086bc7cd5c481dcc9c85efe8c1cad8596992c9', // USDT
        dex1: 'uniswap',
        dex2: 'curve'
      }
    ],
    maxSlippage: 1.5,
    minProfit: 0.5
  },
  checkIntervalSeconds: 60,
  stopLoss: 5,
  takeProfit: 10,
  maxDailyLoss: 500
});
```

### 3. Activar el Bot

```typescript
await manager.activateBot('bot-arbitrage-01');
```

### 4. Obtener Estadísticas

```typescript
const stats = manager.getOverallStats();
console.log(`Ganancia total: $${stats.totalProfit.toFixed(2)}`);
console.log(`ROI promedio: ${stats.averageROI.toFixed(2)}%`);
```

---

## 🤖 Crear Nuevos Tipos de Bots

### Estructura de un Ejecutor

```typescript
import { BotConfig, BotExecutionResult } from '../types';
import { BotExecutor } from '../services/BotManager';

export class MyCustomExecutor implements BotExecutor {
  validate(config: BotConfig): boolean {
    // Validar configuración
    return true;
  }

  async execute(config: BotConfig): Promise<BotExecutionResult> {
    try {
      // Implementar lógica del bot
      return {
        success: true,
        trade: { /* trade details */ }
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message
      };
    }
  }
}
```

### Registrar el Nuevo Ejecutor

```typescript
const customExecutor = new MyCustomExecutor();
manager.registerBotExecutor('my-bot-type', customExecutor);
```

---

## 📡 API Backend

### Endpoints

#### GET `/api/defi/bots`
Obtener todos los bots y estadísticas generales
```json
{
  "bots": [...],
  "stats": {
    "totalBots": 5,
    "activeBots": 2,
    "totalProfit": 5000,
    "averageROI": 12.5
  }
}
```

#### POST `/api/defi/bots`
Crear un nuevo bot
```json
{
  "name": "Arbitrage Bot",
  "type": "arbitrage",
  "network": "arbitrum",
  "capital": 10000,
  ...
}
```

#### POST `/api/defi/bots/{botId}/activate`
Activar un bot

#### POST `/api/defi/bots/{botId}/pause`
Pausar un bot

#### GET `/api/defi/bots/{botId}/trades`
Obtener todas las operaciones de un bot

#### GET `/api/defi/bots/{botId}/stats`
Obtener estadísticas de un bot específico

---

## 📚 Ejemplos

### Ejemplo 1: Bot de Arbitrage en Arbitrum

```typescript
const arbitrageBot = manager.createBot({
  name: 'Arbitrage USDC-USDT',
  type: 'arbitrage',
  network: 'arbitrum',
  capital: 10000,
  maxCapitalPerTrade: 500,
  minProfitThreshold: 0.3,
  parameters: {
    pairs: [
      {
        tokenIn: USDC,
        tokenOut: USDT,
        dex1: 'uniswap',
        dex2: 'curve'
      },
      {
        tokenIn: USDC,
        tokenOut: DAI,
        dex1: 'uniswap',
        dex2: 'balancer'
      }
    ],
    maxSlippage: 1.5,
    minProfit: 0.3
  },
  checkIntervalSeconds: 30,
  stopLoss: 2,
  takeProfit: 5,
  maxDailyLoss: 1000
});

await manager.activateBot(arbitrageBot.id);
```

### Ejemplo 2: Múltiples Bots

```typescript
const bots = [
  { name: 'Arbitrage Bot 1', ... },
  { name: 'Arbitrage Bot 2', ... },
  { name: 'Yield Farming Bot', ... },
  { name: 'Liquidity Bot', ... }
];

for (const botConfig of bots) {
  const bot = manager.createBot(botConfig);
  await manager.activateBot(bot.id);
}

// Monitorear todos
setInterval(() => {
  const stats = manager.getOverallStats();
  console.log(`📊 Ganancias: $${stats.totalProfit}`);
}, 60000);
```

### Ejemplo 3: Exportar/Importar Configuración

```typescript
// Exportar
const configJson = manager.exportConfig();
fs.writeFileSync('bots-config.json', configJson);

// Importar en otra instancia
const newManager = new BotManager();
newManager.importConfig(fs.readFileSync('bots-config.json', 'utf8'));
```

---

## 🎨 UI React

El componente `DeFiProtocolsModule.tsx` proporciona:

- **Dashboard**: Estadísticas generales en tiempo real
- **Bot Manager**: Crear, activar, pausar, detener bots
- **Bot Form**: Formulario intuitivo para crear bots
- **Bot Cards**: Visualización de bots con estadísticas
- **Bot Details**: Detalles completos de cada bot

### Integración en la App

```typescript
import DeFiProtocolsModule from './components/DeFiProtocolsModule';

export const App = () => {
  return (
    <div>
      <DeFiProtocolsModule />
    </div>
  );
};
```

---

## 🔄 Próximos Pasos

1. ✅ **Arbitrage Executor** - Implementado
2. ⏭️ **Liquidity Executor** - Próximo bot tipo
3. ⏭️ **Yield Farming Executor** - Bot de farming
4. ⏭️ **Flash Loan Executor** - Bot con flash loans
5. ⏭️ **DEX Aggregator** - Agregación de DEXs
6. ⏭️ **Persistencia de Base de Datos** - MongoDB/PostgreSQL
7. ⏭️ **WebSocket en Tiempo Real** - Actualizaciones live
8. ⏭️ **Alertas y Notificaciones** - Discord/Telegram

---

## 📞 Soporte

Para agregar un nuevo tipo de bot o ejecutor personalizado, sigue la interfaz `BotExecutor` y registra el ejecutor con el `BotManager`.




## 📋 Índice
1. [Introducción](#introducción)
2. [Arquitectura](#arquitectura)
3. [Instalación](#instalación)
4. [Uso Rápido](#uso-rápido)
5. [Crear Bots](#crear-bots)
6. [API](#api)
7. [Ejemplos](#ejemplos)

---

## 🎯 Introducción

El **DeFi Protocols Bot Manager** es un módulo completo para crear, configurar y gestionar múltiples bots autónomos de trading en redes Layer 2 como Arbitrum One.

### Características Principales

✅ **Arquitectura Modular**: Agregar nuevos tipos de bots sin modificar el core  
✅ **Multi-Red**: Soporta Ethereum, Arbitrum, Optimism, Polygon, Base  
✅ **Gestión Centralizada**: Control de múltiples bots desde un panel  
✅ **Estadísticas en Tiempo Real**: Monitoreo de ganancias y operaciones  
✅ **Seguridad**: Stop loss, take profit, límites diarios  
✅ **Almacenamiento**: Exportar/importar configuraciones  

---

## 🏗️ Arquitectura

```
DeFiProtocolsModule
├── Types/
│   └── index.ts (BotConfig, BotType, NetworkType, etc)
├── Services/
│   └── BotManager.ts (Gestor central de bots)
├── Executors/
│   ├── ArbitrageExecutor.ts (Bot de arbitrage)
│   ├── LiquidityExecutor.ts (Bot de liquidez - próximo)
│   ├── YieldExecutor.ts (Bot de yield farming - próximo)
│   └── ... (más ejecutores)
├── Components/
│   └── DeFiProtocolsModule.tsx (UI React)
└── API/
    └── defi-routes.ts (Rutas del backend)
```

---

## 💿 Instalación

### Requisitos
- Node.js 18+
- ethers.js v6
- React 18+
- TypeScript

### Archivos Necesarios

1. **`src/modules/DeFiProtocols/types/index.ts`** - Definiciones de tipos
2. **`src/modules/DeFiProtocols/services/BotManager.ts`** - Gestor de bots
3. **`src/modules/DeFiProtocols/executors/ArbitrageExecutor.ts`** - Ejecutor de arbitrage
4. **`src/components/DeFiProtocolsModule.tsx`** - Componente React

---

## 🚀 Uso Rápido

### 1. Inicializar el Manager

```typescript
import { BotManager } from './services/BotManager';
import { ArbitrageExecutor } from './executors/ArbitrageExecutor';

const manager = new BotManager();
const executor = new ArbitrageExecutor(
  'https://arb1.arbitrum.io/rpc',
  'YOUR_PRIVATE_KEY'
);

manager.registerBotExecutor('arbitrage', executor);
```

### 2. Crear un Bot

```typescript
const botConfig = manager.createBot({
  id: 'bot-arbitrage-01',
  name: 'Arbitrage Bot #1',
  type: 'arbitrage',
  network: 'arbitrum',
  enabled: false,
  status: 'idle',
  capital: 10000,
  maxCapitalPerTrade: 1000,
  minProfitThreshold: 0.5,
  parameters: {
    pairs: [
      {
        tokenIn: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831', // USDC
        tokenOut: '0xfd086bc7cd5c481dcc9c85efe8c1cad8596992c9', // USDT
        dex1: 'uniswap',
        dex2: 'curve'
      }
    ],
    maxSlippage: 1.5,
    minProfit: 0.5
  },
  checkIntervalSeconds: 60,
  stopLoss: 5,
  takeProfit: 10,
  maxDailyLoss: 500
});
```

### 3. Activar el Bot

```typescript
await manager.activateBot('bot-arbitrage-01');
```

### 4. Obtener Estadísticas

```typescript
const stats = manager.getOverallStats();
console.log(`Ganancia total: $${stats.totalProfit.toFixed(2)}`);
console.log(`ROI promedio: ${stats.averageROI.toFixed(2)}%`);
```

---

## 🤖 Crear Nuevos Tipos de Bots

### Estructura de un Ejecutor

```typescript
import { BotConfig, BotExecutionResult } from '../types';
import { BotExecutor } from '../services/BotManager';

export class MyCustomExecutor implements BotExecutor {
  validate(config: BotConfig): boolean {
    // Validar configuración
    return true;
  }

  async execute(config: BotConfig): Promise<BotExecutionResult> {
    try {
      // Implementar lógica del bot
      return {
        success: true,
        trade: { /* trade details */ }
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message
      };
    }
  }
}
```

### Registrar el Nuevo Ejecutor

```typescript
const customExecutor = new MyCustomExecutor();
manager.registerBotExecutor('my-bot-type', customExecutor);
```

---

## 📡 API Backend

### Endpoints

#### GET `/api/defi/bots`
Obtener todos los bots y estadísticas generales
```json
{
  "bots": [...],
  "stats": {
    "totalBots": 5,
    "activeBots": 2,
    "totalProfit": 5000,
    "averageROI": 12.5
  }
}
```

#### POST `/api/defi/bots`
Crear un nuevo bot
```json
{
  "name": "Arbitrage Bot",
  "type": "arbitrage",
  "network": "arbitrum",
  "capital": 10000,
  ...
}
```

#### POST `/api/defi/bots/{botId}/activate`
Activar un bot

#### POST `/api/defi/bots/{botId}/pause`
Pausar un bot

#### GET `/api/defi/bots/{botId}/trades`
Obtener todas las operaciones de un bot

#### GET `/api/defi/bots/{botId}/stats`
Obtener estadísticas de un bot específico

---

## 📚 Ejemplos

### Ejemplo 1: Bot de Arbitrage en Arbitrum

```typescript
const arbitrageBot = manager.createBot({
  name: 'Arbitrage USDC-USDT',
  type: 'arbitrage',
  network: 'arbitrum',
  capital: 10000,
  maxCapitalPerTrade: 500,
  minProfitThreshold: 0.3,
  parameters: {
    pairs: [
      {
        tokenIn: USDC,
        tokenOut: USDT,
        dex1: 'uniswap',
        dex2: 'curve'
      },
      {
        tokenIn: USDC,
        tokenOut: DAI,
        dex1: 'uniswap',
        dex2: 'balancer'
      }
    ],
    maxSlippage: 1.5,
    minProfit: 0.3
  },
  checkIntervalSeconds: 30,
  stopLoss: 2,
  takeProfit: 5,
  maxDailyLoss: 1000
});

await manager.activateBot(arbitrageBot.id);
```

### Ejemplo 2: Múltiples Bots

```typescript
const bots = [
  { name: 'Arbitrage Bot 1', ... },
  { name: 'Arbitrage Bot 2', ... },
  { name: 'Yield Farming Bot', ... },
  { name: 'Liquidity Bot', ... }
];

for (const botConfig of bots) {
  const bot = manager.createBot(botConfig);
  await manager.activateBot(bot.id);
}

// Monitorear todos
setInterval(() => {
  const stats = manager.getOverallStats();
  console.log(`📊 Ganancias: $${stats.totalProfit}`);
}, 60000);
```

### Ejemplo 3: Exportar/Importar Configuración

```typescript
// Exportar
const configJson = manager.exportConfig();
fs.writeFileSync('bots-config.json', configJson);

// Importar en otra instancia
const newManager = new BotManager();
newManager.importConfig(fs.readFileSync('bots-config.json', 'utf8'));
```

---

## 🎨 UI React

El componente `DeFiProtocolsModule.tsx` proporciona:

- **Dashboard**: Estadísticas generales en tiempo real
- **Bot Manager**: Crear, activar, pausar, detener bots
- **Bot Form**: Formulario intuitivo para crear bots
- **Bot Cards**: Visualización de bots con estadísticas
- **Bot Details**: Detalles completos de cada bot

### Integración en la App

```typescript
import DeFiProtocolsModule from './components/DeFiProtocolsModule';

export const App = () => {
  return (
    <div>
      <DeFiProtocolsModule />
    </div>
  );
};
```

---

## 🔄 Próximos Pasos

1. ✅ **Arbitrage Executor** - Implementado
2. ⏭️ **Liquidity Executor** - Próximo bot tipo
3. ⏭️ **Yield Farming Executor** - Bot de farming
4. ⏭️ **Flash Loan Executor** - Bot con flash loans
5. ⏭️ **DEX Aggregator** - Agregación de DEXs
6. ⏭️ **Persistencia de Base de Datos** - MongoDB/PostgreSQL
7. ⏭️ **WebSocket en Tiempo Real** - Actualizaciones live
8. ⏭️ **Alertas y Notificaciones** - Discord/Telegram

---

## 📞 Soporte

Para agregar un nuevo tipo de bot o ejecutor personalizado, sigue la interfaz `BotExecutor` y registra el ejecutor con el `BotManager`.





## 📋 Índice
1. [Introducción](#introducción)
2. [Arquitectura](#arquitectura)
3. [Instalación](#instalación)
4. [Uso Rápido](#uso-rápido)
5. [Crear Bots](#crear-bots)
6. [API](#api)
7. [Ejemplos](#ejemplos)

---

## 🎯 Introducción

El **DeFi Protocols Bot Manager** es un módulo completo para crear, configurar y gestionar múltiples bots autónomos de trading en redes Layer 2 como Arbitrum One.

### Características Principales

✅ **Arquitectura Modular**: Agregar nuevos tipos de bots sin modificar el core  
✅ **Multi-Red**: Soporta Ethereum, Arbitrum, Optimism, Polygon, Base  
✅ **Gestión Centralizada**: Control de múltiples bots desde un panel  
✅ **Estadísticas en Tiempo Real**: Monitoreo de ganancias y operaciones  
✅ **Seguridad**: Stop loss, take profit, límites diarios  
✅ **Almacenamiento**: Exportar/importar configuraciones  

---

## 🏗️ Arquitectura

```
DeFiProtocolsModule
├── Types/
│   └── index.ts (BotConfig, BotType, NetworkType, etc)
├── Services/
│   └── BotManager.ts (Gestor central de bots)
├── Executors/
│   ├── ArbitrageExecutor.ts (Bot de arbitrage)
│   ├── LiquidityExecutor.ts (Bot de liquidez - próximo)
│   ├── YieldExecutor.ts (Bot de yield farming - próximo)
│   └── ... (más ejecutores)
├── Components/
│   └── DeFiProtocolsModule.tsx (UI React)
└── API/
    └── defi-routes.ts (Rutas del backend)
```

---

## 💿 Instalación

### Requisitos
- Node.js 18+
- ethers.js v6
- React 18+
- TypeScript

### Archivos Necesarios

1. **`src/modules/DeFiProtocols/types/index.ts`** - Definiciones de tipos
2. **`src/modules/DeFiProtocols/services/BotManager.ts`** - Gestor de bots
3. **`src/modules/DeFiProtocols/executors/ArbitrageExecutor.ts`** - Ejecutor de arbitrage
4. **`src/components/DeFiProtocolsModule.tsx`** - Componente React

---

## 🚀 Uso Rápido

### 1. Inicializar el Manager

```typescript
import { BotManager } from './services/BotManager';
import { ArbitrageExecutor } from './executors/ArbitrageExecutor';

const manager = new BotManager();
const executor = new ArbitrageExecutor(
  'https://arb1.arbitrum.io/rpc',
  'YOUR_PRIVATE_KEY'
);

manager.registerBotExecutor('arbitrage', executor);
```

### 2. Crear un Bot

```typescript
const botConfig = manager.createBot({
  id: 'bot-arbitrage-01',
  name: 'Arbitrage Bot #1',
  type: 'arbitrage',
  network: 'arbitrum',
  enabled: false,
  status: 'idle',
  capital: 10000,
  maxCapitalPerTrade: 1000,
  minProfitThreshold: 0.5,
  parameters: {
    pairs: [
      {
        tokenIn: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831', // USDC
        tokenOut: '0xfd086bc7cd5c481dcc9c85efe8c1cad8596992c9', // USDT
        dex1: 'uniswap',
        dex2: 'curve'
      }
    ],
    maxSlippage: 1.5,
    minProfit: 0.5
  },
  checkIntervalSeconds: 60,
  stopLoss: 5,
  takeProfit: 10,
  maxDailyLoss: 500
});
```

### 3. Activar el Bot

```typescript
await manager.activateBot('bot-arbitrage-01');
```

### 4. Obtener Estadísticas

```typescript
const stats = manager.getOverallStats();
console.log(`Ganancia total: $${stats.totalProfit.toFixed(2)}`);
console.log(`ROI promedio: ${stats.averageROI.toFixed(2)}%`);
```

---

## 🤖 Crear Nuevos Tipos de Bots

### Estructura de un Ejecutor

```typescript
import { BotConfig, BotExecutionResult } from '../types';
import { BotExecutor } from '../services/BotManager';

export class MyCustomExecutor implements BotExecutor {
  validate(config: BotConfig): boolean {
    // Validar configuración
    return true;
  }

  async execute(config: BotConfig): Promise<BotExecutionResult> {
    try {
      // Implementar lógica del bot
      return {
        success: true,
        trade: { /* trade details */ }
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message
      };
    }
  }
}
```

### Registrar el Nuevo Ejecutor

```typescript
const customExecutor = new MyCustomExecutor();
manager.registerBotExecutor('my-bot-type', customExecutor);
```

---

## 📡 API Backend

### Endpoints

#### GET `/api/defi/bots`
Obtener todos los bots y estadísticas generales
```json
{
  "bots": [...],
  "stats": {
    "totalBots": 5,
    "activeBots": 2,
    "totalProfit": 5000,
    "averageROI": 12.5
  }
}
```

#### POST `/api/defi/bots`
Crear un nuevo bot
```json
{
  "name": "Arbitrage Bot",
  "type": "arbitrage",
  "network": "arbitrum",
  "capital": 10000,
  ...
}
```

#### POST `/api/defi/bots/{botId}/activate`
Activar un bot

#### POST `/api/defi/bots/{botId}/pause`
Pausar un bot

#### GET `/api/defi/bots/{botId}/trades`
Obtener todas las operaciones de un bot

#### GET `/api/defi/bots/{botId}/stats`
Obtener estadísticas de un bot específico

---

## 📚 Ejemplos

### Ejemplo 1: Bot de Arbitrage en Arbitrum

```typescript
const arbitrageBot = manager.createBot({
  name: 'Arbitrage USDC-USDT',
  type: 'arbitrage',
  network: 'arbitrum',
  capital: 10000,
  maxCapitalPerTrade: 500,
  minProfitThreshold: 0.3,
  parameters: {
    pairs: [
      {
        tokenIn: USDC,
        tokenOut: USDT,
        dex1: 'uniswap',
        dex2: 'curve'
      },
      {
        tokenIn: USDC,
        tokenOut: DAI,
        dex1: 'uniswap',
        dex2: 'balancer'
      }
    ],
    maxSlippage: 1.5,
    minProfit: 0.3
  },
  checkIntervalSeconds: 30,
  stopLoss: 2,
  takeProfit: 5,
  maxDailyLoss: 1000
});

await manager.activateBot(arbitrageBot.id);
```

### Ejemplo 2: Múltiples Bots

```typescript
const bots = [
  { name: 'Arbitrage Bot 1', ... },
  { name: 'Arbitrage Bot 2', ... },
  { name: 'Yield Farming Bot', ... },
  { name: 'Liquidity Bot', ... }
];

for (const botConfig of bots) {
  const bot = manager.createBot(botConfig);
  await manager.activateBot(bot.id);
}

// Monitorear todos
setInterval(() => {
  const stats = manager.getOverallStats();
  console.log(`📊 Ganancias: $${stats.totalProfit}`);
}, 60000);
```

### Ejemplo 3: Exportar/Importar Configuración

```typescript
// Exportar
const configJson = manager.exportConfig();
fs.writeFileSync('bots-config.json', configJson);

// Importar en otra instancia
const newManager = new BotManager();
newManager.importConfig(fs.readFileSync('bots-config.json', 'utf8'));
```

---

## 🎨 UI React

El componente `DeFiProtocolsModule.tsx` proporciona:

- **Dashboard**: Estadísticas generales en tiempo real
- **Bot Manager**: Crear, activar, pausar, detener bots
- **Bot Form**: Formulario intuitivo para crear bots
- **Bot Cards**: Visualización de bots con estadísticas
- **Bot Details**: Detalles completos de cada bot

### Integración en la App

```typescript
import DeFiProtocolsModule from './components/DeFiProtocolsModule';

export const App = () => {
  return (
    <div>
      <DeFiProtocolsModule />
    </div>
  );
};
```

---

## 🔄 Próximos Pasos

1. ✅ **Arbitrage Executor** - Implementado
2. ⏭️ **Liquidity Executor** - Próximo bot tipo
3. ⏭️ **Yield Farming Executor** - Bot de farming
4. ⏭️ **Flash Loan Executor** - Bot con flash loans
5. ⏭️ **DEX Aggregator** - Agregación de DEXs
6. ⏭️ **Persistencia de Base de Datos** - MongoDB/PostgreSQL
7. ⏭️ **WebSocket en Tiempo Real** - Actualizaciones live
8. ⏭️ **Alertas y Notificaciones** - Discord/Telegram

---

## 📞 Soporte

Para agregar un nuevo tipo de bot o ejecutor personalizado, sigue la interfaz `BotExecutor` y registra el ejecutor con el `BotManager`.




## 📋 Índice
1. [Introducción](#introducción)
2. [Arquitectura](#arquitectura)
3. [Instalación](#instalación)
4. [Uso Rápido](#uso-rápido)
5. [Crear Bots](#crear-bots)
6. [API](#api)
7. [Ejemplos](#ejemplos)

---

## 🎯 Introducción

El **DeFi Protocols Bot Manager** es un módulo completo para crear, configurar y gestionar múltiples bots autónomos de trading en redes Layer 2 como Arbitrum One.

### Características Principales

✅ **Arquitectura Modular**: Agregar nuevos tipos de bots sin modificar el core  
✅ **Multi-Red**: Soporta Ethereum, Arbitrum, Optimism, Polygon, Base  
✅ **Gestión Centralizada**: Control de múltiples bots desde un panel  
✅ **Estadísticas en Tiempo Real**: Monitoreo de ganancias y operaciones  
✅ **Seguridad**: Stop loss, take profit, límites diarios  
✅ **Almacenamiento**: Exportar/importar configuraciones  

---

## 🏗️ Arquitectura

```
DeFiProtocolsModule
├── Types/
│   └── index.ts (BotConfig, BotType, NetworkType, etc)
├── Services/
│   └── BotManager.ts (Gestor central de bots)
├── Executors/
│   ├── ArbitrageExecutor.ts (Bot de arbitrage)
│   ├── LiquidityExecutor.ts (Bot de liquidez - próximo)
│   ├── YieldExecutor.ts (Bot de yield farming - próximo)
│   └── ... (más ejecutores)
├── Components/
│   └── DeFiProtocolsModule.tsx (UI React)
└── API/
    └── defi-routes.ts (Rutas del backend)
```

---

## 💿 Instalación

### Requisitos
- Node.js 18+
- ethers.js v6
- React 18+
- TypeScript

### Archivos Necesarios

1. **`src/modules/DeFiProtocols/types/index.ts`** - Definiciones de tipos
2. **`src/modules/DeFiProtocols/services/BotManager.ts`** - Gestor de bots
3. **`src/modules/DeFiProtocols/executors/ArbitrageExecutor.ts`** - Ejecutor de arbitrage
4. **`src/components/DeFiProtocolsModule.tsx`** - Componente React

---

## 🚀 Uso Rápido

### 1. Inicializar el Manager

```typescript
import { BotManager } from './services/BotManager';
import { ArbitrageExecutor } from './executors/ArbitrageExecutor';

const manager = new BotManager();
const executor = new ArbitrageExecutor(
  'https://arb1.arbitrum.io/rpc',
  'YOUR_PRIVATE_KEY'
);

manager.registerBotExecutor('arbitrage', executor);
```

### 2. Crear un Bot

```typescript
const botConfig = manager.createBot({
  id: 'bot-arbitrage-01',
  name: 'Arbitrage Bot #1',
  type: 'arbitrage',
  network: 'arbitrum',
  enabled: false,
  status: 'idle',
  capital: 10000,
  maxCapitalPerTrade: 1000,
  minProfitThreshold: 0.5,
  parameters: {
    pairs: [
      {
        tokenIn: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831', // USDC
        tokenOut: '0xfd086bc7cd5c481dcc9c85efe8c1cad8596992c9', // USDT
        dex1: 'uniswap',
        dex2: 'curve'
      }
    ],
    maxSlippage: 1.5,
    minProfit: 0.5
  },
  checkIntervalSeconds: 60,
  stopLoss: 5,
  takeProfit: 10,
  maxDailyLoss: 500
});
```

### 3. Activar el Bot

```typescript
await manager.activateBot('bot-arbitrage-01');
```

### 4. Obtener Estadísticas

```typescript
const stats = manager.getOverallStats();
console.log(`Ganancia total: $${stats.totalProfit.toFixed(2)}`);
console.log(`ROI promedio: ${stats.averageROI.toFixed(2)}%`);
```

---

## 🤖 Crear Nuevos Tipos de Bots

### Estructura de un Ejecutor

```typescript
import { BotConfig, BotExecutionResult } from '../types';
import { BotExecutor } from '../services/BotManager';

export class MyCustomExecutor implements BotExecutor {
  validate(config: BotConfig): boolean {
    // Validar configuración
    return true;
  }

  async execute(config: BotConfig): Promise<BotExecutionResult> {
    try {
      // Implementar lógica del bot
      return {
        success: true,
        trade: { /* trade details */ }
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message
      };
    }
  }
}
```

### Registrar el Nuevo Ejecutor

```typescript
const customExecutor = new MyCustomExecutor();
manager.registerBotExecutor('my-bot-type', customExecutor);
```

---

## 📡 API Backend

### Endpoints

#### GET `/api/defi/bots`
Obtener todos los bots y estadísticas generales
```json
{
  "bots": [...],
  "stats": {
    "totalBots": 5,
    "activeBots": 2,
    "totalProfit": 5000,
    "averageROI": 12.5
  }
}
```

#### POST `/api/defi/bots`
Crear un nuevo bot
```json
{
  "name": "Arbitrage Bot",
  "type": "arbitrage",
  "network": "arbitrum",
  "capital": 10000,
  ...
}
```

#### POST `/api/defi/bots/{botId}/activate`
Activar un bot

#### POST `/api/defi/bots/{botId}/pause`
Pausar un bot

#### GET `/api/defi/bots/{botId}/trades`
Obtener todas las operaciones de un bot

#### GET `/api/defi/bots/{botId}/stats`
Obtener estadísticas de un bot específico

---

## 📚 Ejemplos

### Ejemplo 1: Bot de Arbitrage en Arbitrum

```typescript
const arbitrageBot = manager.createBot({
  name: 'Arbitrage USDC-USDT',
  type: 'arbitrage',
  network: 'arbitrum',
  capital: 10000,
  maxCapitalPerTrade: 500,
  minProfitThreshold: 0.3,
  parameters: {
    pairs: [
      {
        tokenIn: USDC,
        tokenOut: USDT,
        dex1: 'uniswap',
        dex2: 'curve'
      },
      {
        tokenIn: USDC,
        tokenOut: DAI,
        dex1: 'uniswap',
        dex2: 'balancer'
      }
    ],
    maxSlippage: 1.5,
    minProfit: 0.3
  },
  checkIntervalSeconds: 30,
  stopLoss: 2,
  takeProfit: 5,
  maxDailyLoss: 1000
});

await manager.activateBot(arbitrageBot.id);
```

### Ejemplo 2: Múltiples Bots

```typescript
const bots = [
  { name: 'Arbitrage Bot 1', ... },
  { name: 'Arbitrage Bot 2', ... },
  { name: 'Yield Farming Bot', ... },
  { name: 'Liquidity Bot', ... }
];

for (const botConfig of bots) {
  const bot = manager.createBot(botConfig);
  await manager.activateBot(bot.id);
}

// Monitorear todos
setInterval(() => {
  const stats = manager.getOverallStats();
  console.log(`📊 Ganancias: $${stats.totalProfit}`);
}, 60000);
```

### Ejemplo 3: Exportar/Importar Configuración

```typescript
// Exportar
const configJson = manager.exportConfig();
fs.writeFileSync('bots-config.json', configJson);

// Importar en otra instancia
const newManager = new BotManager();
newManager.importConfig(fs.readFileSync('bots-config.json', 'utf8'));
```

---

## 🎨 UI React

El componente `DeFiProtocolsModule.tsx` proporciona:

- **Dashboard**: Estadísticas generales en tiempo real
- **Bot Manager**: Crear, activar, pausar, detener bots
- **Bot Form**: Formulario intuitivo para crear bots
- **Bot Cards**: Visualización de bots con estadísticas
- **Bot Details**: Detalles completos de cada bot

### Integración en la App

```typescript
import DeFiProtocolsModule from './components/DeFiProtocolsModule';

export const App = () => {
  return (
    <div>
      <DeFiProtocolsModule />
    </div>
  );
};
```

---

## 🔄 Próximos Pasos

1. ✅ **Arbitrage Executor** - Implementado
2. ⏭️ **Liquidity Executor** - Próximo bot tipo
3. ⏭️ **Yield Farming Executor** - Bot de farming
4. ⏭️ **Flash Loan Executor** - Bot con flash loans
5. ⏭️ **DEX Aggregator** - Agregación de DEXs
6. ⏭️ **Persistencia de Base de Datos** - MongoDB/PostgreSQL
7. ⏭️ **WebSocket en Tiempo Real** - Actualizaciones live
8. ⏭️ **Alertas y Notificaciones** - Discord/Telegram

---

## 📞 Soporte

Para agregar un nuevo tipo de bot o ejecutor personalizado, sigue la interfaz `BotExecutor` y registra el ejecutor con el `BotManager`.





## 📋 Índice
1. [Introducción](#introducción)
2. [Arquitectura](#arquitectura)
3. [Instalación](#instalación)
4. [Uso Rápido](#uso-rápido)
5. [Crear Bots](#crear-bots)
6. [API](#api)
7. [Ejemplos](#ejemplos)

---

## 🎯 Introducción

El **DeFi Protocols Bot Manager** es un módulo completo para crear, configurar y gestionar múltiples bots autónomos de trading en redes Layer 2 como Arbitrum One.

### Características Principales

✅ **Arquitectura Modular**: Agregar nuevos tipos de bots sin modificar el core  
✅ **Multi-Red**: Soporta Ethereum, Arbitrum, Optimism, Polygon, Base  
✅ **Gestión Centralizada**: Control de múltiples bots desde un panel  
✅ **Estadísticas en Tiempo Real**: Monitoreo de ganancias y operaciones  
✅ **Seguridad**: Stop loss, take profit, límites diarios  
✅ **Almacenamiento**: Exportar/importar configuraciones  

---

## 🏗️ Arquitectura

```
DeFiProtocolsModule
├── Types/
│   └── index.ts (BotConfig, BotType, NetworkType, etc)
├── Services/
│   └── BotManager.ts (Gestor central de bots)
├── Executors/
│   ├── ArbitrageExecutor.ts (Bot de arbitrage)
│   ├── LiquidityExecutor.ts (Bot de liquidez - próximo)
│   ├── YieldExecutor.ts (Bot de yield farming - próximo)
│   └── ... (más ejecutores)
├── Components/
│   └── DeFiProtocolsModule.tsx (UI React)
└── API/
    └── defi-routes.ts (Rutas del backend)
```

---

## 💿 Instalación

### Requisitos
- Node.js 18+
- ethers.js v6
- React 18+
- TypeScript

### Archivos Necesarios

1. **`src/modules/DeFiProtocols/types/index.ts`** - Definiciones de tipos
2. **`src/modules/DeFiProtocols/services/BotManager.ts`** - Gestor de bots
3. **`src/modules/DeFiProtocols/executors/ArbitrageExecutor.ts`** - Ejecutor de arbitrage
4. **`src/components/DeFiProtocolsModule.tsx`** - Componente React

---

## 🚀 Uso Rápido

### 1. Inicializar el Manager

```typescript
import { BotManager } from './services/BotManager';
import { ArbitrageExecutor } from './executors/ArbitrageExecutor';

const manager = new BotManager();
const executor = new ArbitrageExecutor(
  'https://arb1.arbitrum.io/rpc',
  'YOUR_PRIVATE_KEY'
);

manager.registerBotExecutor('arbitrage', executor);
```

### 2. Crear un Bot

```typescript
const botConfig = manager.createBot({
  id: 'bot-arbitrage-01',
  name: 'Arbitrage Bot #1',
  type: 'arbitrage',
  network: 'arbitrum',
  enabled: false,
  status: 'idle',
  capital: 10000,
  maxCapitalPerTrade: 1000,
  minProfitThreshold: 0.5,
  parameters: {
    pairs: [
      {
        tokenIn: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831', // USDC
        tokenOut: '0xfd086bc7cd5c481dcc9c85efe8c1cad8596992c9', // USDT
        dex1: 'uniswap',
        dex2: 'curve'
      }
    ],
    maxSlippage: 1.5,
    minProfit: 0.5
  },
  checkIntervalSeconds: 60,
  stopLoss: 5,
  takeProfit: 10,
  maxDailyLoss: 500
});
```

### 3. Activar el Bot

```typescript
await manager.activateBot('bot-arbitrage-01');
```

### 4. Obtener Estadísticas

```typescript
const stats = manager.getOverallStats();
console.log(`Ganancia total: $${stats.totalProfit.toFixed(2)}`);
console.log(`ROI promedio: ${stats.averageROI.toFixed(2)}%`);
```

---

## 🤖 Crear Nuevos Tipos de Bots

### Estructura de un Ejecutor

```typescript
import { BotConfig, BotExecutionResult } from '../types';
import { BotExecutor } from '../services/BotManager';

export class MyCustomExecutor implements BotExecutor {
  validate(config: BotConfig): boolean {
    // Validar configuración
    return true;
  }

  async execute(config: BotConfig): Promise<BotExecutionResult> {
    try {
      // Implementar lógica del bot
      return {
        success: true,
        trade: { /* trade details */ }
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message
      };
    }
  }
}
```

### Registrar el Nuevo Ejecutor

```typescript
const customExecutor = new MyCustomExecutor();
manager.registerBotExecutor('my-bot-type', customExecutor);
```

---

## 📡 API Backend

### Endpoints

#### GET `/api/defi/bots`
Obtener todos los bots y estadísticas generales
```json
{
  "bots": [...],
  "stats": {
    "totalBots": 5,
    "activeBots": 2,
    "totalProfit": 5000,
    "averageROI": 12.5
  }
}
```

#### POST `/api/defi/bots`
Crear un nuevo bot
```json
{
  "name": "Arbitrage Bot",
  "type": "arbitrage",
  "network": "arbitrum",
  "capital": 10000,
  ...
}
```

#### POST `/api/defi/bots/{botId}/activate`
Activar un bot

#### POST `/api/defi/bots/{botId}/pause`
Pausar un bot

#### GET `/api/defi/bots/{botId}/trades`
Obtener todas las operaciones de un bot

#### GET `/api/defi/bots/{botId}/stats`
Obtener estadísticas de un bot específico

---

## 📚 Ejemplos

### Ejemplo 1: Bot de Arbitrage en Arbitrum

```typescript
const arbitrageBot = manager.createBot({
  name: 'Arbitrage USDC-USDT',
  type: 'arbitrage',
  network: 'arbitrum',
  capital: 10000,
  maxCapitalPerTrade: 500,
  minProfitThreshold: 0.3,
  parameters: {
    pairs: [
      {
        tokenIn: USDC,
        tokenOut: USDT,
        dex1: 'uniswap',
        dex2: 'curve'
      },
      {
        tokenIn: USDC,
        tokenOut: DAI,
        dex1: 'uniswap',
        dex2: 'balancer'
      }
    ],
    maxSlippage: 1.5,
    minProfit: 0.3
  },
  checkIntervalSeconds: 30,
  stopLoss: 2,
  takeProfit: 5,
  maxDailyLoss: 1000
});

await manager.activateBot(arbitrageBot.id);
```

### Ejemplo 2: Múltiples Bots

```typescript
const bots = [
  { name: 'Arbitrage Bot 1', ... },
  { name: 'Arbitrage Bot 2', ... },
  { name: 'Yield Farming Bot', ... },
  { name: 'Liquidity Bot', ... }
];

for (const botConfig of bots) {
  const bot = manager.createBot(botConfig);
  await manager.activateBot(bot.id);
}

// Monitorear todos
setInterval(() => {
  const stats = manager.getOverallStats();
  console.log(`📊 Ganancias: $${stats.totalProfit}`);
}, 60000);
```

### Ejemplo 3: Exportar/Importar Configuración

```typescript
// Exportar
const configJson = manager.exportConfig();
fs.writeFileSync('bots-config.json', configJson);

// Importar en otra instancia
const newManager = new BotManager();
newManager.importConfig(fs.readFileSync('bots-config.json', 'utf8'));
```

---

## 🎨 UI React

El componente `DeFiProtocolsModule.tsx` proporciona:

- **Dashboard**: Estadísticas generales en tiempo real
- **Bot Manager**: Crear, activar, pausar, detener bots
- **Bot Form**: Formulario intuitivo para crear bots
- **Bot Cards**: Visualización de bots con estadísticas
- **Bot Details**: Detalles completos de cada bot

### Integración en la App

```typescript
import DeFiProtocolsModule from './components/DeFiProtocolsModule';

export const App = () => {
  return (
    <div>
      <DeFiProtocolsModule />
    </div>
  );
};
```

---

## 🔄 Próximos Pasos

1. ✅ **Arbitrage Executor** - Implementado
2. ⏭️ **Liquidity Executor** - Próximo bot tipo
3. ⏭️ **Yield Farming Executor** - Bot de farming
4. ⏭️ **Flash Loan Executor** - Bot con flash loans
5. ⏭️ **DEX Aggregator** - Agregación de DEXs
6. ⏭️ **Persistencia de Base de Datos** - MongoDB/PostgreSQL
7. ⏭️ **WebSocket en Tiempo Real** - Actualizaciones live
8. ⏭️ **Alertas y Notificaciones** - Discord/Telegram

---

## 📞 Soporte

Para agregar un nuevo tipo de bot o ejecutor personalizado, sigue la interfaz `BotExecutor` y registra el ejecutor con el `BotManager`.




## 📋 Índice
1. [Introducción](#introducción)
2. [Arquitectura](#arquitectura)
3. [Instalación](#instalación)
4. [Uso Rápido](#uso-rápido)
5. [Crear Bots](#crear-bots)
6. [API](#api)
7. [Ejemplos](#ejemplos)

---

## 🎯 Introducción

El **DeFi Protocols Bot Manager** es un módulo completo para crear, configurar y gestionar múltiples bots autónomos de trading en redes Layer 2 como Arbitrum One.

### Características Principales

✅ **Arquitectura Modular**: Agregar nuevos tipos de bots sin modificar el core  
✅ **Multi-Red**: Soporta Ethereum, Arbitrum, Optimism, Polygon, Base  
✅ **Gestión Centralizada**: Control de múltiples bots desde un panel  
✅ **Estadísticas en Tiempo Real**: Monitoreo de ganancias y operaciones  
✅ **Seguridad**: Stop loss, take profit, límites diarios  
✅ **Almacenamiento**: Exportar/importar configuraciones  

---

## 🏗️ Arquitectura

```
DeFiProtocolsModule
├── Types/
│   └── index.ts (BotConfig, BotType, NetworkType, etc)
├── Services/
│   └── BotManager.ts (Gestor central de bots)
├── Executors/
│   ├── ArbitrageExecutor.ts (Bot de arbitrage)
│   ├── LiquidityExecutor.ts (Bot de liquidez - próximo)
│   ├── YieldExecutor.ts (Bot de yield farming - próximo)
│   └── ... (más ejecutores)
├── Components/
│   └── DeFiProtocolsModule.tsx (UI React)
└── API/
    └── defi-routes.ts (Rutas del backend)
```

---

## 💿 Instalación

### Requisitos
- Node.js 18+
- ethers.js v6
- React 18+
- TypeScript

### Archivos Necesarios

1. **`src/modules/DeFiProtocols/types/index.ts`** - Definiciones de tipos
2. **`src/modules/DeFiProtocols/services/BotManager.ts`** - Gestor de bots
3. **`src/modules/DeFiProtocols/executors/ArbitrageExecutor.ts`** - Ejecutor de arbitrage
4. **`src/components/DeFiProtocolsModule.tsx`** - Componente React

---

## 🚀 Uso Rápido

### 1. Inicializar el Manager

```typescript
import { BotManager } from './services/BotManager';
import { ArbitrageExecutor } from './executors/ArbitrageExecutor';

const manager = new BotManager();
const executor = new ArbitrageExecutor(
  'https://arb1.arbitrum.io/rpc',
  'YOUR_PRIVATE_KEY'
);

manager.registerBotExecutor('arbitrage', executor);
```

### 2. Crear un Bot

```typescript
const botConfig = manager.createBot({
  id: 'bot-arbitrage-01',
  name: 'Arbitrage Bot #1',
  type: 'arbitrage',
  network: 'arbitrum',
  enabled: false,
  status: 'idle',
  capital: 10000,
  maxCapitalPerTrade: 1000,
  minProfitThreshold: 0.5,
  parameters: {
    pairs: [
      {
        tokenIn: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831', // USDC
        tokenOut: '0xfd086bc7cd5c481dcc9c85efe8c1cad8596992c9', // USDT
        dex1: 'uniswap',
        dex2: 'curve'
      }
    ],
    maxSlippage: 1.5,
    minProfit: 0.5
  },
  checkIntervalSeconds: 60,
  stopLoss: 5,
  takeProfit: 10,
  maxDailyLoss: 500
});
```

### 3. Activar el Bot

```typescript
await manager.activateBot('bot-arbitrage-01');
```

### 4. Obtener Estadísticas

```typescript
const stats = manager.getOverallStats();
console.log(`Ganancia total: $${stats.totalProfit.toFixed(2)}`);
console.log(`ROI promedio: ${stats.averageROI.toFixed(2)}%`);
```

---

## 🤖 Crear Nuevos Tipos de Bots

### Estructura de un Ejecutor

```typescript
import { BotConfig, BotExecutionResult } from '../types';
import { BotExecutor } from '../services/BotManager';

export class MyCustomExecutor implements BotExecutor {
  validate(config: BotConfig): boolean {
    // Validar configuración
    return true;
  }

  async execute(config: BotConfig): Promise<BotExecutionResult> {
    try {
      // Implementar lógica del bot
      return {
        success: true,
        trade: { /* trade details */ }
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message
      };
    }
  }
}
```

### Registrar el Nuevo Ejecutor

```typescript
const customExecutor = new MyCustomExecutor();
manager.registerBotExecutor('my-bot-type', customExecutor);
```

---

## 📡 API Backend

### Endpoints

#### GET `/api/defi/bots`
Obtener todos los bots y estadísticas generales
```json
{
  "bots": [...],
  "stats": {
    "totalBots": 5,
    "activeBots": 2,
    "totalProfit": 5000,
    "averageROI": 12.5
  }
}
```

#### POST `/api/defi/bots`
Crear un nuevo bot
```json
{
  "name": "Arbitrage Bot",
  "type": "arbitrage",
  "network": "arbitrum",
  "capital": 10000,
  ...
}
```

#### POST `/api/defi/bots/{botId}/activate`
Activar un bot

#### POST `/api/defi/bots/{botId}/pause`
Pausar un bot

#### GET `/api/defi/bots/{botId}/trades`
Obtener todas las operaciones de un bot

#### GET `/api/defi/bots/{botId}/stats`
Obtener estadísticas de un bot específico

---

## 📚 Ejemplos

### Ejemplo 1: Bot de Arbitrage en Arbitrum

```typescript
const arbitrageBot = manager.createBot({
  name: 'Arbitrage USDC-USDT',
  type: 'arbitrage',
  network: 'arbitrum',
  capital: 10000,
  maxCapitalPerTrade: 500,
  minProfitThreshold: 0.3,
  parameters: {
    pairs: [
      {
        tokenIn: USDC,
        tokenOut: USDT,
        dex1: 'uniswap',
        dex2: 'curve'
      },
      {
        tokenIn: USDC,
        tokenOut: DAI,
        dex1: 'uniswap',
        dex2: 'balancer'
      }
    ],
    maxSlippage: 1.5,
    minProfit: 0.3
  },
  checkIntervalSeconds: 30,
  stopLoss: 2,
  takeProfit: 5,
  maxDailyLoss: 1000
});

await manager.activateBot(arbitrageBot.id);
```

### Ejemplo 2: Múltiples Bots

```typescript
const bots = [
  { name: 'Arbitrage Bot 1', ... },
  { name: 'Arbitrage Bot 2', ... },
  { name: 'Yield Farming Bot', ... },
  { name: 'Liquidity Bot', ... }
];

for (const botConfig of bots) {
  const bot = manager.createBot(botConfig);
  await manager.activateBot(bot.id);
}

// Monitorear todos
setInterval(() => {
  const stats = manager.getOverallStats();
  console.log(`📊 Ganancias: $${stats.totalProfit}`);
}, 60000);
```

### Ejemplo 3: Exportar/Importar Configuración

```typescript
// Exportar
const configJson = manager.exportConfig();
fs.writeFileSync('bots-config.json', configJson);

// Importar en otra instancia
const newManager = new BotManager();
newManager.importConfig(fs.readFileSync('bots-config.json', 'utf8'));
```

---

## 🎨 UI React

El componente `DeFiProtocolsModule.tsx` proporciona:

- **Dashboard**: Estadísticas generales en tiempo real
- **Bot Manager**: Crear, activar, pausar, detener bots
- **Bot Form**: Formulario intuitivo para crear bots
- **Bot Cards**: Visualización de bots con estadísticas
- **Bot Details**: Detalles completos de cada bot

### Integración en la App

```typescript
import DeFiProtocolsModule from './components/DeFiProtocolsModule';

export const App = () => {
  return (
    <div>
      <DeFiProtocolsModule />
    </div>
  );
};
```

---

## 🔄 Próximos Pasos

1. ✅ **Arbitrage Executor** - Implementado
2. ⏭️ **Liquidity Executor** - Próximo bot tipo
3. ⏭️ **Yield Farming Executor** - Bot de farming
4. ⏭️ **Flash Loan Executor** - Bot con flash loans
5. ⏭️ **DEX Aggregator** - Agregación de DEXs
6. ⏭️ **Persistencia de Base de Datos** - MongoDB/PostgreSQL
7. ⏭️ **WebSocket en Tiempo Real** - Actualizaciones live
8. ⏭️ **Alertas y Notificaciones** - Discord/Telegram

---

## 📞 Soporte

Para agregar un nuevo tipo de bot o ejecutor personalizado, sigue la interfaz `BotExecutor` y registra el ejecutor con el `BotManager`.




## 📋 Índice
1. [Introducción](#introducción)
2. [Arquitectura](#arquitectura)
3. [Instalación](#instalación)
4. [Uso Rápido](#uso-rápido)
5. [Crear Bots](#crear-bots)
6. [API](#api)
7. [Ejemplos](#ejemplos)

---

## 🎯 Introducción

El **DeFi Protocols Bot Manager** es un módulo completo para crear, configurar y gestionar múltiples bots autónomos de trading en redes Layer 2 como Arbitrum One.

### Características Principales

✅ **Arquitectura Modular**: Agregar nuevos tipos de bots sin modificar el core  
✅ **Multi-Red**: Soporta Ethereum, Arbitrum, Optimism, Polygon, Base  
✅ **Gestión Centralizada**: Control de múltiples bots desde un panel  
✅ **Estadísticas en Tiempo Real**: Monitoreo de ganancias y operaciones  
✅ **Seguridad**: Stop loss, take profit, límites diarios  
✅ **Almacenamiento**: Exportar/importar configuraciones  

---

## 🏗️ Arquitectura

```
DeFiProtocolsModule
├── Types/
│   └── index.ts (BotConfig, BotType, NetworkType, etc)
├── Services/
│   └── BotManager.ts (Gestor central de bots)
├── Executors/
│   ├── ArbitrageExecutor.ts (Bot de arbitrage)
│   ├── LiquidityExecutor.ts (Bot de liquidez - próximo)
│   ├── YieldExecutor.ts (Bot de yield farming - próximo)
│   └── ... (más ejecutores)
├── Components/
│   └── DeFiProtocolsModule.tsx (UI React)
└── API/
    └── defi-routes.ts (Rutas del backend)
```

---

## 💿 Instalación

### Requisitos
- Node.js 18+
- ethers.js v6
- React 18+
- TypeScript

### Archivos Necesarios

1. **`src/modules/DeFiProtocols/types/index.ts`** - Definiciones de tipos
2. **`src/modules/DeFiProtocols/services/BotManager.ts`** - Gestor de bots
3. **`src/modules/DeFiProtocols/executors/ArbitrageExecutor.ts`** - Ejecutor de arbitrage
4. **`src/components/DeFiProtocolsModule.tsx`** - Componente React

---

## 🚀 Uso Rápido

### 1. Inicializar el Manager

```typescript
import { BotManager } from './services/BotManager';
import { ArbitrageExecutor } from './executors/ArbitrageExecutor';

const manager = new BotManager();
const executor = new ArbitrageExecutor(
  'https://arb1.arbitrum.io/rpc',
  'YOUR_PRIVATE_KEY'
);

manager.registerBotExecutor('arbitrage', executor);
```

### 2. Crear un Bot

```typescript
const botConfig = manager.createBot({
  id: 'bot-arbitrage-01',
  name: 'Arbitrage Bot #1',
  type: 'arbitrage',
  network: 'arbitrum',
  enabled: false,
  status: 'idle',
  capital: 10000,
  maxCapitalPerTrade: 1000,
  minProfitThreshold: 0.5,
  parameters: {
    pairs: [
      {
        tokenIn: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831', // USDC
        tokenOut: '0xfd086bc7cd5c481dcc9c85efe8c1cad8596992c9', // USDT
        dex1: 'uniswap',
        dex2: 'curve'
      }
    ],
    maxSlippage: 1.5,
    minProfit: 0.5
  },
  checkIntervalSeconds: 60,
  stopLoss: 5,
  takeProfit: 10,
  maxDailyLoss: 500
});
```

### 3. Activar el Bot

```typescript
await manager.activateBot('bot-arbitrage-01');
```

### 4. Obtener Estadísticas

```typescript
const stats = manager.getOverallStats();
console.log(`Ganancia total: $${stats.totalProfit.toFixed(2)}`);
console.log(`ROI promedio: ${stats.averageROI.toFixed(2)}%`);
```

---

## 🤖 Crear Nuevos Tipos de Bots

### Estructura de un Ejecutor

```typescript
import { BotConfig, BotExecutionResult } from '../types';
import { BotExecutor } from '../services/BotManager';

export class MyCustomExecutor implements BotExecutor {
  validate(config: BotConfig): boolean {
    // Validar configuración
    return true;
  }

  async execute(config: BotConfig): Promise<BotExecutionResult> {
    try {
      // Implementar lógica del bot
      return {
        success: true,
        trade: { /* trade details */ }
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message
      };
    }
  }
}
```

### Registrar el Nuevo Ejecutor

```typescript
const customExecutor = new MyCustomExecutor();
manager.registerBotExecutor('my-bot-type', customExecutor);
```

---

## 📡 API Backend

### Endpoints

#### GET `/api/defi/bots`
Obtener todos los bots y estadísticas generales
```json
{
  "bots": [...],
  "stats": {
    "totalBots": 5,
    "activeBots": 2,
    "totalProfit": 5000,
    "averageROI": 12.5
  }
}
```

#### POST `/api/defi/bots`
Crear un nuevo bot
```json
{
  "name": "Arbitrage Bot",
  "type": "arbitrage",
  "network": "arbitrum",
  "capital": 10000,
  ...
}
```

#### POST `/api/defi/bots/{botId}/activate`
Activar un bot

#### POST `/api/defi/bots/{botId}/pause`
Pausar un bot

#### GET `/api/defi/bots/{botId}/trades`
Obtener todas las operaciones de un bot

#### GET `/api/defi/bots/{botId}/stats`
Obtener estadísticas de un bot específico

---

## 📚 Ejemplos

### Ejemplo 1: Bot de Arbitrage en Arbitrum

```typescript
const arbitrageBot = manager.createBot({
  name: 'Arbitrage USDC-USDT',
  type: 'arbitrage',
  network: 'arbitrum',
  capital: 10000,
  maxCapitalPerTrade: 500,
  minProfitThreshold: 0.3,
  parameters: {
    pairs: [
      {
        tokenIn: USDC,
        tokenOut: USDT,
        dex1: 'uniswap',
        dex2: 'curve'
      },
      {
        tokenIn: USDC,
        tokenOut: DAI,
        dex1: 'uniswap',
        dex2: 'balancer'
      }
    ],
    maxSlippage: 1.5,
    minProfit: 0.3
  },
  checkIntervalSeconds: 30,
  stopLoss: 2,
  takeProfit: 5,
  maxDailyLoss: 1000
});

await manager.activateBot(arbitrageBot.id);
```

### Ejemplo 2: Múltiples Bots

```typescript
const bots = [
  { name: 'Arbitrage Bot 1', ... },
  { name: 'Arbitrage Bot 2', ... },
  { name: 'Yield Farming Bot', ... },
  { name: 'Liquidity Bot', ... }
];

for (const botConfig of bots) {
  const bot = manager.createBot(botConfig);
  await manager.activateBot(bot.id);
}

// Monitorear todos
setInterval(() => {
  const stats = manager.getOverallStats();
  console.log(`📊 Ganancias: $${stats.totalProfit}`);
}, 60000);
```

### Ejemplo 3: Exportar/Importar Configuración

```typescript
// Exportar
const configJson = manager.exportConfig();
fs.writeFileSync('bots-config.json', configJson);

// Importar en otra instancia
const newManager = new BotManager();
newManager.importConfig(fs.readFileSync('bots-config.json', 'utf8'));
```

---

## 🎨 UI React

El componente `DeFiProtocolsModule.tsx` proporciona:

- **Dashboard**: Estadísticas generales en tiempo real
- **Bot Manager**: Crear, activar, pausar, detener bots
- **Bot Form**: Formulario intuitivo para crear bots
- **Bot Cards**: Visualización de bots con estadísticas
- **Bot Details**: Detalles completos de cada bot

### Integración en la App

```typescript
import DeFiProtocolsModule from './components/DeFiProtocolsModule';

export const App = () => {
  return (
    <div>
      <DeFiProtocolsModule />
    </div>
  );
};
```

---

## 🔄 Próximos Pasos

1. ✅ **Arbitrage Executor** - Implementado
2. ⏭️ **Liquidity Executor** - Próximo bot tipo
3. ⏭️ **Yield Farming Executor** - Bot de farming
4. ⏭️ **Flash Loan Executor** - Bot con flash loans
5. ⏭️ **DEX Aggregator** - Agregación de DEXs
6. ⏭️ **Persistencia de Base de Datos** - MongoDB/PostgreSQL
7. ⏭️ **WebSocket en Tiempo Real** - Actualizaciones live
8. ⏭️ **Alertas y Notificaciones** - Discord/Telegram

---

## 📞 Soporte

Para agregar un nuevo tipo de bot o ejecutor personalizado, sigue la interfaz `BotExecutor` y registra el ejecutor con el `BotManager`.




## 📋 Índice
1. [Introducción](#introducción)
2. [Arquitectura](#arquitectura)
3. [Instalación](#instalación)
4. [Uso Rápido](#uso-rápido)
5. [Crear Bots](#crear-bots)
6. [API](#api)
7. [Ejemplos](#ejemplos)

---

## 🎯 Introducción

El **DeFi Protocols Bot Manager** es un módulo completo para crear, configurar y gestionar múltiples bots autónomos de trading en redes Layer 2 como Arbitrum One.

### Características Principales

✅ **Arquitectura Modular**: Agregar nuevos tipos de bots sin modificar el core  
✅ **Multi-Red**: Soporta Ethereum, Arbitrum, Optimism, Polygon, Base  
✅ **Gestión Centralizada**: Control de múltiples bots desde un panel  
✅ **Estadísticas en Tiempo Real**: Monitoreo de ganancias y operaciones  
✅ **Seguridad**: Stop loss, take profit, límites diarios  
✅ **Almacenamiento**: Exportar/importar configuraciones  

---

## 🏗️ Arquitectura

```
DeFiProtocolsModule
├── Types/
│   └── index.ts (BotConfig, BotType, NetworkType, etc)
├── Services/
│   └── BotManager.ts (Gestor central de bots)
├── Executors/
│   ├── ArbitrageExecutor.ts (Bot de arbitrage)
│   ├── LiquidityExecutor.ts (Bot de liquidez - próximo)
│   ├── YieldExecutor.ts (Bot de yield farming - próximo)
│   └── ... (más ejecutores)
├── Components/
│   └── DeFiProtocolsModule.tsx (UI React)
└── API/
    └── defi-routes.ts (Rutas del backend)
```

---

## 💿 Instalación

### Requisitos
- Node.js 18+
- ethers.js v6
- React 18+
- TypeScript

### Archivos Necesarios

1. **`src/modules/DeFiProtocols/types/index.ts`** - Definiciones de tipos
2. **`src/modules/DeFiProtocols/services/BotManager.ts`** - Gestor de bots
3. **`src/modules/DeFiProtocols/executors/ArbitrageExecutor.ts`** - Ejecutor de arbitrage
4. **`src/components/DeFiProtocolsModule.tsx`** - Componente React

---

## 🚀 Uso Rápido

### 1. Inicializar el Manager

```typescript
import { BotManager } from './services/BotManager';
import { ArbitrageExecutor } from './executors/ArbitrageExecutor';

const manager = new BotManager();
const executor = new ArbitrageExecutor(
  'https://arb1.arbitrum.io/rpc',
  'YOUR_PRIVATE_KEY'
);

manager.registerBotExecutor('arbitrage', executor);
```

### 2. Crear un Bot

```typescript
const botConfig = manager.createBot({
  id: 'bot-arbitrage-01',
  name: 'Arbitrage Bot #1',
  type: 'arbitrage',
  network: 'arbitrum',
  enabled: false,
  status: 'idle',
  capital: 10000,
  maxCapitalPerTrade: 1000,
  minProfitThreshold: 0.5,
  parameters: {
    pairs: [
      {
        tokenIn: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831', // USDC
        tokenOut: '0xfd086bc7cd5c481dcc9c85efe8c1cad8596992c9', // USDT
        dex1: 'uniswap',
        dex2: 'curve'
      }
    ],
    maxSlippage: 1.5,
    minProfit: 0.5
  },
  checkIntervalSeconds: 60,
  stopLoss: 5,
  takeProfit: 10,
  maxDailyLoss: 500
});
```

### 3. Activar el Bot

```typescript
await manager.activateBot('bot-arbitrage-01');
```

### 4. Obtener Estadísticas

```typescript
const stats = manager.getOverallStats();
console.log(`Ganancia total: $${stats.totalProfit.toFixed(2)}`);
console.log(`ROI promedio: ${stats.averageROI.toFixed(2)}%`);
```

---

## 🤖 Crear Nuevos Tipos de Bots

### Estructura de un Ejecutor

```typescript
import { BotConfig, BotExecutionResult } from '../types';
import { BotExecutor } from '../services/BotManager';

export class MyCustomExecutor implements BotExecutor {
  validate(config: BotConfig): boolean {
    // Validar configuración
    return true;
  }

  async execute(config: BotConfig): Promise<BotExecutionResult> {
    try {
      // Implementar lógica del bot
      return {
        success: true,
        trade: { /* trade details */ }
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message
      };
    }
  }
}
```

### Registrar el Nuevo Ejecutor

```typescript
const customExecutor = new MyCustomExecutor();
manager.registerBotExecutor('my-bot-type', customExecutor);
```

---

## 📡 API Backend

### Endpoints

#### GET `/api/defi/bots`
Obtener todos los bots y estadísticas generales
```json
{
  "bots": [...],
  "stats": {
    "totalBots": 5,
    "activeBots": 2,
    "totalProfit": 5000,
    "averageROI": 12.5
  }
}
```

#### POST `/api/defi/bots`
Crear un nuevo bot
```json
{
  "name": "Arbitrage Bot",
  "type": "arbitrage",
  "network": "arbitrum",
  "capital": 10000,
  ...
}
```

#### POST `/api/defi/bots/{botId}/activate`
Activar un bot

#### POST `/api/defi/bots/{botId}/pause`
Pausar un bot

#### GET `/api/defi/bots/{botId}/trades`
Obtener todas las operaciones de un bot

#### GET `/api/defi/bots/{botId}/stats`
Obtener estadísticas de un bot específico

---

## 📚 Ejemplos

### Ejemplo 1: Bot de Arbitrage en Arbitrum

```typescript
const arbitrageBot = manager.createBot({
  name: 'Arbitrage USDC-USDT',
  type: 'arbitrage',
  network: 'arbitrum',
  capital: 10000,
  maxCapitalPerTrade: 500,
  minProfitThreshold: 0.3,
  parameters: {
    pairs: [
      {
        tokenIn: USDC,
        tokenOut: USDT,
        dex1: 'uniswap',
        dex2: 'curve'
      },
      {
        tokenIn: USDC,
        tokenOut: DAI,
        dex1: 'uniswap',
        dex2: 'balancer'
      }
    ],
    maxSlippage: 1.5,
    minProfit: 0.3
  },
  checkIntervalSeconds: 30,
  stopLoss: 2,
  takeProfit: 5,
  maxDailyLoss: 1000
});

await manager.activateBot(arbitrageBot.id);
```

### Ejemplo 2: Múltiples Bots

```typescript
const bots = [
  { name: 'Arbitrage Bot 1', ... },
  { name: 'Arbitrage Bot 2', ... },
  { name: 'Yield Farming Bot', ... },
  { name: 'Liquidity Bot', ... }
];

for (const botConfig of bots) {
  const bot = manager.createBot(botConfig);
  await manager.activateBot(bot.id);
}

// Monitorear todos
setInterval(() => {
  const stats = manager.getOverallStats();
  console.log(`📊 Ganancias: $${stats.totalProfit}`);
}, 60000);
```

### Ejemplo 3: Exportar/Importar Configuración

```typescript
// Exportar
const configJson = manager.exportConfig();
fs.writeFileSync('bots-config.json', configJson);

// Importar en otra instancia
const newManager = new BotManager();
newManager.importConfig(fs.readFileSync('bots-config.json', 'utf8'));
```

---

## 🎨 UI React

El componente `DeFiProtocolsModule.tsx` proporciona:

- **Dashboard**: Estadísticas generales en tiempo real
- **Bot Manager**: Crear, activar, pausar, detener bots
- **Bot Form**: Formulario intuitivo para crear bots
- **Bot Cards**: Visualización de bots con estadísticas
- **Bot Details**: Detalles completos de cada bot

### Integración en la App

```typescript
import DeFiProtocolsModule from './components/DeFiProtocolsModule';

export const App = () => {
  return (
    <div>
      <DeFiProtocolsModule />
    </div>
  );
};
```

---

## 🔄 Próximos Pasos

1. ✅ **Arbitrage Executor** - Implementado
2. ⏭️ **Liquidity Executor** - Próximo bot tipo
3. ⏭️ **Yield Farming Executor** - Bot de farming
4. ⏭️ **Flash Loan Executor** - Bot con flash loans
5. ⏭️ **DEX Aggregator** - Agregación de DEXs
6. ⏭️ **Persistencia de Base de Datos** - MongoDB/PostgreSQL
7. ⏭️ **WebSocket en Tiempo Real** - Actualizaciones live
8. ⏭️ **Alertas y Notificaciones** - Discord/Telegram

---

## 📞 Soporte

Para agregar un nuevo tipo de bot o ejecutor personalizado, sigue la interfaz `BotExecutor` y registra el ejecutor con el `BotManager`.





## 📋 Índice
1. [Introducción](#introducción)
2. [Arquitectura](#arquitectura)
3. [Instalación](#instalación)
4. [Uso Rápido](#uso-rápido)
5. [Crear Bots](#crear-bots)
6. [API](#api)
7. [Ejemplos](#ejemplos)

---

## 🎯 Introducción

El **DeFi Protocols Bot Manager** es un módulo completo para crear, configurar y gestionar múltiples bots autónomos de trading en redes Layer 2 como Arbitrum One.

### Características Principales

✅ **Arquitectura Modular**: Agregar nuevos tipos de bots sin modificar el core  
✅ **Multi-Red**: Soporta Ethereum, Arbitrum, Optimism, Polygon, Base  
✅ **Gestión Centralizada**: Control de múltiples bots desde un panel  
✅ **Estadísticas en Tiempo Real**: Monitoreo de ganancias y operaciones  
✅ **Seguridad**: Stop loss, take profit, límites diarios  
✅ **Almacenamiento**: Exportar/importar configuraciones  

---

## 🏗️ Arquitectura

```
DeFiProtocolsModule
├── Types/
│   └── index.ts (BotConfig, BotType, NetworkType, etc)
├── Services/
│   └── BotManager.ts (Gestor central de bots)
├── Executors/
│   ├── ArbitrageExecutor.ts (Bot de arbitrage)
│   ├── LiquidityExecutor.ts (Bot de liquidez - próximo)
│   ├── YieldExecutor.ts (Bot de yield farming - próximo)
│   └── ... (más ejecutores)
├── Components/
│   └── DeFiProtocolsModule.tsx (UI React)
└── API/
    └── defi-routes.ts (Rutas del backend)
```

---

## 💿 Instalación

### Requisitos
- Node.js 18+
- ethers.js v6
- React 18+
- TypeScript

### Archivos Necesarios

1. **`src/modules/DeFiProtocols/types/index.ts`** - Definiciones de tipos
2. **`src/modules/DeFiProtocols/services/BotManager.ts`** - Gestor de bots
3. **`src/modules/DeFiProtocols/executors/ArbitrageExecutor.ts`** - Ejecutor de arbitrage
4. **`src/components/DeFiProtocolsModule.tsx`** - Componente React

---

## 🚀 Uso Rápido

### 1. Inicializar el Manager

```typescript
import { BotManager } from './services/BotManager';
import { ArbitrageExecutor } from './executors/ArbitrageExecutor';

const manager = new BotManager();
const executor = new ArbitrageExecutor(
  'https://arb1.arbitrum.io/rpc',
  'YOUR_PRIVATE_KEY'
);

manager.registerBotExecutor('arbitrage', executor);
```

### 2. Crear un Bot

```typescript
const botConfig = manager.createBot({
  id: 'bot-arbitrage-01',
  name: 'Arbitrage Bot #1',
  type: 'arbitrage',
  network: 'arbitrum',
  enabled: false,
  status: 'idle',
  capital: 10000,
  maxCapitalPerTrade: 1000,
  minProfitThreshold: 0.5,
  parameters: {
    pairs: [
      {
        tokenIn: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831', // USDC
        tokenOut: '0xfd086bc7cd5c481dcc9c85efe8c1cad8596992c9', // USDT
        dex1: 'uniswap',
        dex2: 'curve'
      }
    ],
    maxSlippage: 1.5,
    minProfit: 0.5
  },
  checkIntervalSeconds: 60,
  stopLoss: 5,
  takeProfit: 10,
  maxDailyLoss: 500
});
```

### 3. Activar el Bot

```typescript
await manager.activateBot('bot-arbitrage-01');
```

### 4. Obtener Estadísticas

```typescript
const stats = manager.getOverallStats();
console.log(`Ganancia total: $${stats.totalProfit.toFixed(2)}`);
console.log(`ROI promedio: ${stats.averageROI.toFixed(2)}%`);
```

---

## 🤖 Crear Nuevos Tipos de Bots

### Estructura de un Ejecutor

```typescript
import { BotConfig, BotExecutionResult } from '../types';
import { BotExecutor } from '../services/BotManager';

export class MyCustomExecutor implements BotExecutor {
  validate(config: BotConfig): boolean {
    // Validar configuración
    return true;
  }

  async execute(config: BotConfig): Promise<BotExecutionResult> {
    try {
      // Implementar lógica del bot
      return {
        success: true,
        trade: { /* trade details */ }
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message
      };
    }
  }
}
```

### Registrar el Nuevo Ejecutor

```typescript
const customExecutor = new MyCustomExecutor();
manager.registerBotExecutor('my-bot-type', customExecutor);
```

---

## 📡 API Backend

### Endpoints

#### GET `/api/defi/bots`
Obtener todos los bots y estadísticas generales
```json
{
  "bots": [...],
  "stats": {
    "totalBots": 5,
    "activeBots": 2,
    "totalProfit": 5000,
    "averageROI": 12.5
  }
}
```

#### POST `/api/defi/bots`
Crear un nuevo bot
```json
{
  "name": "Arbitrage Bot",
  "type": "arbitrage",
  "network": "arbitrum",
  "capital": 10000,
  ...
}
```

#### POST `/api/defi/bots/{botId}/activate`
Activar un bot

#### POST `/api/defi/bots/{botId}/pause`
Pausar un bot

#### GET `/api/defi/bots/{botId}/trades`
Obtener todas las operaciones de un bot

#### GET `/api/defi/bots/{botId}/stats`
Obtener estadísticas de un bot específico

---

## 📚 Ejemplos

### Ejemplo 1: Bot de Arbitrage en Arbitrum

```typescript
const arbitrageBot = manager.createBot({
  name: 'Arbitrage USDC-USDT',
  type: 'arbitrage',
  network: 'arbitrum',
  capital: 10000,
  maxCapitalPerTrade: 500,
  minProfitThreshold: 0.3,
  parameters: {
    pairs: [
      {
        tokenIn: USDC,
        tokenOut: USDT,
        dex1: 'uniswap',
        dex2: 'curve'
      },
      {
        tokenIn: USDC,
        tokenOut: DAI,
        dex1: 'uniswap',
        dex2: 'balancer'
      }
    ],
    maxSlippage: 1.5,
    minProfit: 0.3
  },
  checkIntervalSeconds: 30,
  stopLoss: 2,
  takeProfit: 5,
  maxDailyLoss: 1000
});

await manager.activateBot(arbitrageBot.id);
```

### Ejemplo 2: Múltiples Bots

```typescript
const bots = [
  { name: 'Arbitrage Bot 1', ... },
  { name: 'Arbitrage Bot 2', ... },
  { name: 'Yield Farming Bot', ... },
  { name: 'Liquidity Bot', ... }
];

for (const botConfig of bots) {
  const bot = manager.createBot(botConfig);
  await manager.activateBot(bot.id);
}

// Monitorear todos
setInterval(() => {
  const stats = manager.getOverallStats();
  console.log(`📊 Ganancias: $${stats.totalProfit}`);
}, 60000);
```

### Ejemplo 3: Exportar/Importar Configuración

```typescript
// Exportar
const configJson = manager.exportConfig();
fs.writeFileSync('bots-config.json', configJson);

// Importar en otra instancia
const newManager = new BotManager();
newManager.importConfig(fs.readFileSync('bots-config.json', 'utf8'));
```

---

## 🎨 UI React

El componente `DeFiProtocolsModule.tsx` proporciona:

- **Dashboard**: Estadísticas generales en tiempo real
- **Bot Manager**: Crear, activar, pausar, detener bots
- **Bot Form**: Formulario intuitivo para crear bots
- **Bot Cards**: Visualización de bots con estadísticas
- **Bot Details**: Detalles completos de cada bot

### Integración en la App

```typescript
import DeFiProtocolsModule from './components/DeFiProtocolsModule';

export const App = () => {
  return (
    <div>
      <DeFiProtocolsModule />
    </div>
  );
};
```

---

## 🔄 Próximos Pasos

1. ✅ **Arbitrage Executor** - Implementado
2. ⏭️ **Liquidity Executor** - Próximo bot tipo
3. ⏭️ **Yield Farming Executor** - Bot de farming
4. ⏭️ **Flash Loan Executor** - Bot con flash loans
5. ⏭️ **DEX Aggregator** - Agregación de DEXs
6. ⏭️ **Persistencia de Base de Datos** - MongoDB/PostgreSQL
7. ⏭️ **WebSocket en Tiempo Real** - Actualizaciones live
8. ⏭️ **Alertas y Notificaciones** - Discord/Telegram

---

## 📞 Soporte

Para agregar un nuevo tipo de bot o ejecutor personalizado, sigue la interfaz `BotExecutor` y registra el ejecutor con el `BotManager`.




## 📋 Índice
1. [Introducción](#introducción)
2. [Arquitectura](#arquitectura)
3. [Instalación](#instalación)
4. [Uso Rápido](#uso-rápido)
5. [Crear Bots](#crear-bots)
6. [API](#api)
7. [Ejemplos](#ejemplos)

---

## 🎯 Introducción

El **DeFi Protocols Bot Manager** es un módulo completo para crear, configurar y gestionar múltiples bots autónomos de trading en redes Layer 2 como Arbitrum One.

### Características Principales

✅ **Arquitectura Modular**: Agregar nuevos tipos de bots sin modificar el core  
✅ **Multi-Red**: Soporta Ethereum, Arbitrum, Optimism, Polygon, Base  
✅ **Gestión Centralizada**: Control de múltiples bots desde un panel  
✅ **Estadísticas en Tiempo Real**: Monitoreo de ganancias y operaciones  
✅ **Seguridad**: Stop loss, take profit, límites diarios  
✅ **Almacenamiento**: Exportar/importar configuraciones  

---

## 🏗️ Arquitectura

```
DeFiProtocolsModule
├── Types/
│   └── index.ts (BotConfig, BotType, NetworkType, etc)
├── Services/
│   └── BotManager.ts (Gestor central de bots)
├── Executors/
│   ├── ArbitrageExecutor.ts (Bot de arbitrage)
│   ├── LiquidityExecutor.ts (Bot de liquidez - próximo)
│   ├── YieldExecutor.ts (Bot de yield farming - próximo)
│   └── ... (más ejecutores)
├── Components/
│   └── DeFiProtocolsModule.tsx (UI React)
└── API/
    └── defi-routes.ts (Rutas del backend)
```

---

## 💿 Instalación

### Requisitos
- Node.js 18+
- ethers.js v6
- React 18+
- TypeScript

### Archivos Necesarios

1. **`src/modules/DeFiProtocols/types/index.ts`** - Definiciones de tipos
2. **`src/modules/DeFiProtocols/services/BotManager.ts`** - Gestor de bots
3. **`src/modules/DeFiProtocols/executors/ArbitrageExecutor.ts`** - Ejecutor de arbitrage
4. **`src/components/DeFiProtocolsModule.tsx`** - Componente React

---

## 🚀 Uso Rápido

### 1. Inicializar el Manager

```typescript
import { BotManager } from './services/BotManager';
import { ArbitrageExecutor } from './executors/ArbitrageExecutor';

const manager = new BotManager();
const executor = new ArbitrageExecutor(
  'https://arb1.arbitrum.io/rpc',
  'YOUR_PRIVATE_KEY'
);

manager.registerBotExecutor('arbitrage', executor);
```

### 2. Crear un Bot

```typescript
const botConfig = manager.createBot({
  id: 'bot-arbitrage-01',
  name: 'Arbitrage Bot #1',
  type: 'arbitrage',
  network: 'arbitrum',
  enabled: false,
  status: 'idle',
  capital: 10000,
  maxCapitalPerTrade: 1000,
  minProfitThreshold: 0.5,
  parameters: {
    pairs: [
      {
        tokenIn: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831', // USDC
        tokenOut: '0xfd086bc7cd5c481dcc9c85efe8c1cad8596992c9', // USDT
        dex1: 'uniswap',
        dex2: 'curve'
      }
    ],
    maxSlippage: 1.5,
    minProfit: 0.5
  },
  checkIntervalSeconds: 60,
  stopLoss: 5,
  takeProfit: 10,
  maxDailyLoss: 500
});
```

### 3. Activar el Bot

```typescript
await manager.activateBot('bot-arbitrage-01');
```

### 4. Obtener Estadísticas

```typescript
const stats = manager.getOverallStats();
console.log(`Ganancia total: $${stats.totalProfit.toFixed(2)}`);
console.log(`ROI promedio: ${stats.averageROI.toFixed(2)}%`);
```

---

## 🤖 Crear Nuevos Tipos de Bots

### Estructura de un Ejecutor

```typescript
import { BotConfig, BotExecutionResult } from '../types';
import { BotExecutor } from '../services/BotManager';

export class MyCustomExecutor implements BotExecutor {
  validate(config: BotConfig): boolean {
    // Validar configuración
    return true;
  }

  async execute(config: BotConfig): Promise<BotExecutionResult> {
    try {
      // Implementar lógica del bot
      return {
        success: true,
        trade: { /* trade details */ }
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message
      };
    }
  }
}
```

### Registrar el Nuevo Ejecutor

```typescript
const customExecutor = new MyCustomExecutor();
manager.registerBotExecutor('my-bot-type', customExecutor);
```

---

## 📡 API Backend

### Endpoints

#### GET `/api/defi/bots`
Obtener todos los bots y estadísticas generales
```json
{
  "bots": [...],
  "stats": {
    "totalBots": 5,
    "activeBots": 2,
    "totalProfit": 5000,
    "averageROI": 12.5
  }
}
```

#### POST `/api/defi/bots`
Crear un nuevo bot
```json
{
  "name": "Arbitrage Bot",
  "type": "arbitrage",
  "network": "arbitrum",
  "capital": 10000,
  ...
}
```

#### POST `/api/defi/bots/{botId}/activate`
Activar un bot

#### POST `/api/defi/bots/{botId}/pause`
Pausar un bot

#### GET `/api/defi/bots/{botId}/trades`
Obtener todas las operaciones de un bot

#### GET `/api/defi/bots/{botId}/stats`
Obtener estadísticas de un bot específico

---

## 📚 Ejemplos

### Ejemplo 1: Bot de Arbitrage en Arbitrum

```typescript
const arbitrageBot = manager.createBot({
  name: 'Arbitrage USDC-USDT',
  type: 'arbitrage',
  network: 'arbitrum',
  capital: 10000,
  maxCapitalPerTrade: 500,
  minProfitThreshold: 0.3,
  parameters: {
    pairs: [
      {
        tokenIn: USDC,
        tokenOut: USDT,
        dex1: 'uniswap',
        dex2: 'curve'
      },
      {
        tokenIn: USDC,
        tokenOut: DAI,
        dex1: 'uniswap',
        dex2: 'balancer'
      }
    ],
    maxSlippage: 1.5,
    minProfit: 0.3
  },
  checkIntervalSeconds: 30,
  stopLoss: 2,
  takeProfit: 5,
  maxDailyLoss: 1000
});

await manager.activateBot(arbitrageBot.id);
```

### Ejemplo 2: Múltiples Bots

```typescript
const bots = [
  { name: 'Arbitrage Bot 1', ... },
  { name: 'Arbitrage Bot 2', ... },
  { name: 'Yield Farming Bot', ... },
  { name: 'Liquidity Bot', ... }
];

for (const botConfig of bots) {
  const bot = manager.createBot(botConfig);
  await manager.activateBot(bot.id);
}

// Monitorear todos
setInterval(() => {
  const stats = manager.getOverallStats();
  console.log(`📊 Ganancias: $${stats.totalProfit}`);
}, 60000);
```

### Ejemplo 3: Exportar/Importar Configuración

```typescript
// Exportar
const configJson = manager.exportConfig();
fs.writeFileSync('bots-config.json', configJson);

// Importar en otra instancia
const newManager = new BotManager();
newManager.importConfig(fs.readFileSync('bots-config.json', 'utf8'));
```

---

## 🎨 UI React

El componente `DeFiProtocolsModule.tsx` proporciona:

- **Dashboard**: Estadísticas generales en tiempo real
- **Bot Manager**: Crear, activar, pausar, detener bots
- **Bot Form**: Formulario intuitivo para crear bots
- **Bot Cards**: Visualización de bots con estadísticas
- **Bot Details**: Detalles completos de cada bot

### Integración en la App

```typescript
import DeFiProtocolsModule from './components/DeFiProtocolsModule';

export const App = () => {
  return (
    <div>
      <DeFiProtocolsModule />
    </div>
  );
};
```

---

## 🔄 Próximos Pasos

1. ✅ **Arbitrage Executor** - Implementado
2. ⏭️ **Liquidity Executor** - Próximo bot tipo
3. ⏭️ **Yield Farming Executor** - Bot de farming
4. ⏭️ **Flash Loan Executor** - Bot con flash loans
5. ⏭️ **DEX Aggregator** - Agregación de DEXs
6. ⏭️ **Persistencia de Base de Datos** - MongoDB/PostgreSQL
7. ⏭️ **WebSocket en Tiempo Real** - Actualizaciones live
8. ⏭️ **Alertas y Notificaciones** - Discord/Telegram

---

## 📞 Soporte

Para agregar un nuevo tipo de bot o ejecutor personalizado, sigue la interfaz `BotExecutor` y registra el ejecutor con el `BotManager`.




## 📋 Índice
1. [Introducción](#introducción)
2. [Arquitectura](#arquitectura)
3. [Instalación](#instalación)
4. [Uso Rápido](#uso-rápido)
5. [Crear Bots](#crear-bots)
6. [API](#api)
7. [Ejemplos](#ejemplos)

---

## 🎯 Introducción

El **DeFi Protocols Bot Manager** es un módulo completo para crear, configurar y gestionar múltiples bots autónomos de trading en redes Layer 2 como Arbitrum One.

### Características Principales

✅ **Arquitectura Modular**: Agregar nuevos tipos de bots sin modificar el core  
✅ **Multi-Red**: Soporta Ethereum, Arbitrum, Optimism, Polygon, Base  
✅ **Gestión Centralizada**: Control de múltiples bots desde un panel  
✅ **Estadísticas en Tiempo Real**: Monitoreo de ganancias y operaciones  
✅ **Seguridad**: Stop loss, take profit, límites diarios  
✅ **Almacenamiento**: Exportar/importar configuraciones  

---

## 🏗️ Arquitectura

```
DeFiProtocolsModule
├── Types/
│   └── index.ts (BotConfig, BotType, NetworkType, etc)
├── Services/
│   └── BotManager.ts (Gestor central de bots)
├── Executors/
│   ├── ArbitrageExecutor.ts (Bot de arbitrage)
│   ├── LiquidityExecutor.ts (Bot de liquidez - próximo)
│   ├── YieldExecutor.ts (Bot de yield farming - próximo)
│   └── ... (más ejecutores)
├── Components/
│   └── DeFiProtocolsModule.tsx (UI React)
└── API/
    └── defi-routes.ts (Rutas del backend)
```

---

## 💿 Instalación

### Requisitos
- Node.js 18+
- ethers.js v6
- React 18+
- TypeScript

### Archivos Necesarios

1. **`src/modules/DeFiProtocols/types/index.ts`** - Definiciones de tipos
2. **`src/modules/DeFiProtocols/services/BotManager.ts`** - Gestor de bots
3. **`src/modules/DeFiProtocols/executors/ArbitrageExecutor.ts`** - Ejecutor de arbitrage
4. **`src/components/DeFiProtocolsModule.tsx`** - Componente React

---

## 🚀 Uso Rápido

### 1. Inicializar el Manager

```typescript
import { BotManager } from './services/BotManager';
import { ArbitrageExecutor } from './executors/ArbitrageExecutor';

const manager = new BotManager();
const executor = new ArbitrageExecutor(
  'https://arb1.arbitrum.io/rpc',
  'YOUR_PRIVATE_KEY'
);

manager.registerBotExecutor('arbitrage', executor);
```

### 2. Crear un Bot

```typescript
const botConfig = manager.createBot({
  id: 'bot-arbitrage-01',
  name: 'Arbitrage Bot #1',
  type: 'arbitrage',
  network: 'arbitrum',
  enabled: false,
  status: 'idle',
  capital: 10000,
  maxCapitalPerTrade: 1000,
  minProfitThreshold: 0.5,
  parameters: {
    pairs: [
      {
        tokenIn: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831', // USDC
        tokenOut: '0xfd086bc7cd5c481dcc9c85efe8c1cad8596992c9', // USDT
        dex1: 'uniswap',
        dex2: 'curve'
      }
    ],
    maxSlippage: 1.5,
    minProfit: 0.5
  },
  checkIntervalSeconds: 60,
  stopLoss: 5,
  takeProfit: 10,
  maxDailyLoss: 500
});
```

### 3. Activar el Bot

```typescript
await manager.activateBot('bot-arbitrage-01');
```

### 4. Obtener Estadísticas

```typescript
const stats = manager.getOverallStats();
console.log(`Ganancia total: $${stats.totalProfit.toFixed(2)}`);
console.log(`ROI promedio: ${stats.averageROI.toFixed(2)}%`);
```

---

## 🤖 Crear Nuevos Tipos de Bots

### Estructura de un Ejecutor

```typescript
import { BotConfig, BotExecutionResult } from '../types';
import { BotExecutor } from '../services/BotManager';

export class MyCustomExecutor implements BotExecutor {
  validate(config: BotConfig): boolean {
    // Validar configuración
    return true;
  }

  async execute(config: BotConfig): Promise<BotExecutionResult> {
    try {
      // Implementar lógica del bot
      return {
        success: true,
        trade: { /* trade details */ }
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message
      };
    }
  }
}
```

### Registrar el Nuevo Ejecutor

```typescript
const customExecutor = new MyCustomExecutor();
manager.registerBotExecutor('my-bot-type', customExecutor);
```

---

## 📡 API Backend

### Endpoints

#### GET `/api/defi/bots`
Obtener todos los bots y estadísticas generales
```json
{
  "bots": [...],
  "stats": {
    "totalBots": 5,
    "activeBots": 2,
    "totalProfit": 5000,
    "averageROI": 12.5
  }
}
```

#### POST `/api/defi/bots`
Crear un nuevo bot
```json
{
  "name": "Arbitrage Bot",
  "type": "arbitrage",
  "network": "arbitrum",
  "capital": 10000,
  ...
}
```

#### POST `/api/defi/bots/{botId}/activate`
Activar un bot

#### POST `/api/defi/bots/{botId}/pause`
Pausar un bot

#### GET `/api/defi/bots/{botId}/trades`
Obtener todas las operaciones de un bot

#### GET `/api/defi/bots/{botId}/stats`
Obtener estadísticas de un bot específico

---

## 📚 Ejemplos

### Ejemplo 1: Bot de Arbitrage en Arbitrum

```typescript
const arbitrageBot = manager.createBot({
  name: 'Arbitrage USDC-USDT',
  type: 'arbitrage',
  network: 'arbitrum',
  capital: 10000,
  maxCapitalPerTrade: 500,
  minProfitThreshold: 0.3,
  parameters: {
    pairs: [
      {
        tokenIn: USDC,
        tokenOut: USDT,
        dex1: 'uniswap',
        dex2: 'curve'
      },
      {
        tokenIn: USDC,
        tokenOut: DAI,
        dex1: 'uniswap',
        dex2: 'balancer'
      }
    ],
    maxSlippage: 1.5,
    minProfit: 0.3
  },
  checkIntervalSeconds: 30,
  stopLoss: 2,
  takeProfit: 5,
  maxDailyLoss: 1000
});

await manager.activateBot(arbitrageBot.id);
```

### Ejemplo 2: Múltiples Bots

```typescript
const bots = [
  { name: 'Arbitrage Bot 1', ... },
  { name: 'Arbitrage Bot 2', ... },
  { name: 'Yield Farming Bot', ... },
  { name: 'Liquidity Bot', ... }
];

for (const botConfig of bots) {
  const bot = manager.createBot(botConfig);
  await manager.activateBot(bot.id);
}

// Monitorear todos
setInterval(() => {
  const stats = manager.getOverallStats();
  console.log(`📊 Ganancias: $${stats.totalProfit}`);
}, 60000);
```

### Ejemplo 3: Exportar/Importar Configuración

```typescript
// Exportar
const configJson = manager.exportConfig();
fs.writeFileSync('bots-config.json', configJson);

// Importar en otra instancia
const newManager = new BotManager();
newManager.importConfig(fs.readFileSync('bots-config.json', 'utf8'));
```

---

## 🎨 UI React

El componente `DeFiProtocolsModule.tsx` proporciona:

- **Dashboard**: Estadísticas generales en tiempo real
- **Bot Manager**: Crear, activar, pausar, detener bots
- **Bot Form**: Formulario intuitivo para crear bots
- **Bot Cards**: Visualización de bots con estadísticas
- **Bot Details**: Detalles completos de cada bot

### Integración en la App

```typescript
import DeFiProtocolsModule from './components/DeFiProtocolsModule';

export const App = () => {
  return (
    <div>
      <DeFiProtocolsModule />
    </div>
  );
};
```

---

## 🔄 Próximos Pasos

1. ✅ **Arbitrage Executor** - Implementado
2. ⏭️ **Liquidity Executor** - Próximo bot tipo
3. ⏭️ **Yield Farming Executor** - Bot de farming
4. ⏭️ **Flash Loan Executor** - Bot con flash loans
5. ⏭️ **DEX Aggregator** - Agregación de DEXs
6. ⏭️ **Persistencia de Base de Datos** - MongoDB/PostgreSQL
7. ⏭️ **WebSocket en Tiempo Real** - Actualizaciones live
8. ⏭️ **Alertas y Notificaciones** - Discord/Telegram

---

## 📞 Soporte

Para agregar un nuevo tipo de bot o ejecutor personalizado, sigue la interfaz `BotExecutor` y registra el ejecutor con el `BotManager`.




## 📋 Índice
1. [Introducción](#introducción)
2. [Arquitectura](#arquitectura)
3. [Instalación](#instalación)
4. [Uso Rápido](#uso-rápido)
5. [Crear Bots](#crear-bots)
6. [API](#api)
7. [Ejemplos](#ejemplos)

---

## 🎯 Introducción

El **DeFi Protocols Bot Manager** es un módulo completo para crear, configurar y gestionar múltiples bots autónomos de trading en redes Layer 2 como Arbitrum One.

### Características Principales

✅ **Arquitectura Modular**: Agregar nuevos tipos de bots sin modificar el core  
✅ **Multi-Red**: Soporta Ethereum, Arbitrum, Optimism, Polygon, Base  
✅ **Gestión Centralizada**: Control de múltiples bots desde un panel  
✅ **Estadísticas en Tiempo Real**: Monitoreo de ganancias y operaciones  
✅ **Seguridad**: Stop loss, take profit, límites diarios  
✅ **Almacenamiento**: Exportar/importar configuraciones  

---

## 🏗️ Arquitectura

```
DeFiProtocolsModule
├── Types/
│   └── index.ts (BotConfig, BotType, NetworkType, etc)
├── Services/
│   └── BotManager.ts (Gestor central de bots)
├── Executors/
│   ├── ArbitrageExecutor.ts (Bot de arbitrage)
│   ├── LiquidityExecutor.ts (Bot de liquidez - próximo)
│   ├── YieldExecutor.ts (Bot de yield farming - próximo)
│   └── ... (más ejecutores)
├── Components/
│   └── DeFiProtocolsModule.tsx (UI React)
└── API/
    └── defi-routes.ts (Rutas del backend)
```

---

## 💿 Instalación

### Requisitos
- Node.js 18+
- ethers.js v6
- React 18+
- TypeScript

### Archivos Necesarios

1. **`src/modules/DeFiProtocols/types/index.ts`** - Definiciones de tipos
2. **`src/modules/DeFiProtocols/services/BotManager.ts`** - Gestor de bots
3. **`src/modules/DeFiProtocols/executors/ArbitrageExecutor.ts`** - Ejecutor de arbitrage
4. **`src/components/DeFiProtocolsModule.tsx`** - Componente React

---

## 🚀 Uso Rápido

### 1. Inicializar el Manager

```typescript
import { BotManager } from './services/BotManager';
import { ArbitrageExecutor } from './executors/ArbitrageExecutor';

const manager = new BotManager();
const executor = new ArbitrageExecutor(
  'https://arb1.arbitrum.io/rpc',
  'YOUR_PRIVATE_KEY'
);

manager.registerBotExecutor('arbitrage', executor);
```

### 2. Crear un Bot

```typescript
const botConfig = manager.createBot({
  id: 'bot-arbitrage-01',
  name: 'Arbitrage Bot #1',
  type: 'arbitrage',
  network: 'arbitrum',
  enabled: false,
  status: 'idle',
  capital: 10000,
  maxCapitalPerTrade: 1000,
  minProfitThreshold: 0.5,
  parameters: {
    pairs: [
      {
        tokenIn: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831', // USDC
        tokenOut: '0xfd086bc7cd5c481dcc9c85efe8c1cad8596992c9', // USDT
        dex1: 'uniswap',
        dex2: 'curve'
      }
    ],
    maxSlippage: 1.5,
    minProfit: 0.5
  },
  checkIntervalSeconds: 60,
  stopLoss: 5,
  takeProfit: 10,
  maxDailyLoss: 500
});
```

### 3. Activar el Bot

```typescript
await manager.activateBot('bot-arbitrage-01');
```

### 4. Obtener Estadísticas

```typescript
const stats = manager.getOverallStats();
console.log(`Ganancia total: $${stats.totalProfit.toFixed(2)}`);
console.log(`ROI promedio: ${stats.averageROI.toFixed(2)}%`);
```

---

## 🤖 Crear Nuevos Tipos de Bots

### Estructura de un Ejecutor

```typescript
import { BotConfig, BotExecutionResult } from '../types';
import { BotExecutor } from '../services/BotManager';

export class MyCustomExecutor implements BotExecutor {
  validate(config: BotConfig): boolean {
    // Validar configuración
    return true;
  }

  async execute(config: BotConfig): Promise<BotExecutionResult> {
    try {
      // Implementar lógica del bot
      return {
        success: true,
        trade: { /* trade details */ }
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message
      };
    }
  }
}
```

### Registrar el Nuevo Ejecutor

```typescript
const customExecutor = new MyCustomExecutor();
manager.registerBotExecutor('my-bot-type', customExecutor);
```

---

## 📡 API Backend

### Endpoints

#### GET `/api/defi/bots`
Obtener todos los bots y estadísticas generales
```json
{
  "bots": [...],
  "stats": {
    "totalBots": 5,
    "activeBots": 2,
    "totalProfit": 5000,
    "averageROI": 12.5
  }
}
```

#### POST `/api/defi/bots`
Crear un nuevo bot
```json
{
  "name": "Arbitrage Bot",
  "type": "arbitrage",
  "network": "arbitrum",
  "capital": 10000,
  ...
}
```

#### POST `/api/defi/bots/{botId}/activate`
Activar un bot

#### POST `/api/defi/bots/{botId}/pause`
Pausar un bot

#### GET `/api/defi/bots/{botId}/trades`
Obtener todas las operaciones de un bot

#### GET `/api/defi/bots/{botId}/stats`
Obtener estadísticas de un bot específico

---

## 📚 Ejemplos

### Ejemplo 1: Bot de Arbitrage en Arbitrum

```typescript
const arbitrageBot = manager.createBot({
  name: 'Arbitrage USDC-USDT',
  type: 'arbitrage',
  network: 'arbitrum',
  capital: 10000,
  maxCapitalPerTrade: 500,
  minProfitThreshold: 0.3,
  parameters: {
    pairs: [
      {
        tokenIn: USDC,
        tokenOut: USDT,
        dex1: 'uniswap',
        dex2: 'curve'
      },
      {
        tokenIn: USDC,
        tokenOut: DAI,
        dex1: 'uniswap',
        dex2: 'balancer'
      }
    ],
    maxSlippage: 1.5,
    minProfit: 0.3
  },
  checkIntervalSeconds: 30,
  stopLoss: 2,
  takeProfit: 5,
  maxDailyLoss: 1000
});

await manager.activateBot(arbitrageBot.id);
```

### Ejemplo 2: Múltiples Bots

```typescript
const bots = [
  { name: 'Arbitrage Bot 1', ... },
  { name: 'Arbitrage Bot 2', ... },
  { name: 'Yield Farming Bot', ... },
  { name: 'Liquidity Bot', ... }
];

for (const botConfig of bots) {
  const bot = manager.createBot(botConfig);
  await manager.activateBot(bot.id);
}

// Monitorear todos
setInterval(() => {
  const stats = manager.getOverallStats();
  console.log(`📊 Ganancias: $${stats.totalProfit}`);
}, 60000);
```

### Ejemplo 3: Exportar/Importar Configuración

```typescript
// Exportar
const configJson = manager.exportConfig();
fs.writeFileSync('bots-config.json', configJson);

// Importar en otra instancia
const newManager = new BotManager();
newManager.importConfig(fs.readFileSync('bots-config.json', 'utf8'));
```

---

## 🎨 UI React

El componente `DeFiProtocolsModule.tsx` proporciona:

- **Dashboard**: Estadísticas generales en tiempo real
- **Bot Manager**: Crear, activar, pausar, detener bots
- **Bot Form**: Formulario intuitivo para crear bots
- **Bot Cards**: Visualización de bots con estadísticas
- **Bot Details**: Detalles completos de cada bot

### Integración en la App

```typescript
import DeFiProtocolsModule from './components/DeFiProtocolsModule';

export const App = () => {
  return (
    <div>
      <DeFiProtocolsModule />
    </div>
  );
};
```

---

## 🔄 Próximos Pasos

1. ✅ **Arbitrage Executor** - Implementado
2. ⏭️ **Liquidity Executor** - Próximo bot tipo
3. ⏭️ **Yield Farming Executor** - Bot de farming
4. ⏭️ **Flash Loan Executor** - Bot con flash loans
5. ⏭️ **DEX Aggregator** - Agregación de DEXs
6. ⏭️ **Persistencia de Base de Datos** - MongoDB/PostgreSQL
7. ⏭️ **WebSocket en Tiempo Real** - Actualizaciones live
8. ⏭️ **Alertas y Notificaciones** - Discord/Telegram

---

## 📞 Soporte

Para agregar un nuevo tipo de bot o ejecutor personalizado, sigue la interfaz `BotExecutor` y registra el ejecutor con el `BotManager`.





## 📋 Índice
1. [Introducción](#introducción)
2. [Arquitectura](#arquitectura)
3. [Instalación](#instalación)
4. [Uso Rápido](#uso-rápido)
5. [Crear Bots](#crear-bots)
6. [API](#api)
7. [Ejemplos](#ejemplos)

---

## 🎯 Introducción

El **DeFi Protocols Bot Manager** es un módulo completo para crear, configurar y gestionar múltiples bots autónomos de trading en redes Layer 2 como Arbitrum One.

### Características Principales

✅ **Arquitectura Modular**: Agregar nuevos tipos de bots sin modificar el core  
✅ **Multi-Red**: Soporta Ethereum, Arbitrum, Optimism, Polygon, Base  
✅ **Gestión Centralizada**: Control de múltiples bots desde un panel  
✅ **Estadísticas en Tiempo Real**: Monitoreo de ganancias y operaciones  
✅ **Seguridad**: Stop loss, take profit, límites diarios  
✅ **Almacenamiento**: Exportar/importar configuraciones  

---

## 🏗️ Arquitectura

```
DeFiProtocolsModule
├── Types/
│   └── index.ts (BotConfig, BotType, NetworkType, etc)
├── Services/
│   └── BotManager.ts (Gestor central de bots)
├── Executors/
│   ├── ArbitrageExecutor.ts (Bot de arbitrage)
│   ├── LiquidityExecutor.ts (Bot de liquidez - próximo)
│   ├── YieldExecutor.ts (Bot de yield farming - próximo)
│   └── ... (más ejecutores)
├── Components/
│   └── DeFiProtocolsModule.tsx (UI React)
└── API/
    └── defi-routes.ts (Rutas del backend)
```

---

## 💿 Instalación

### Requisitos
- Node.js 18+
- ethers.js v6
- React 18+
- TypeScript

### Archivos Necesarios

1. **`src/modules/DeFiProtocols/types/index.ts`** - Definiciones de tipos
2. **`src/modules/DeFiProtocols/services/BotManager.ts`** - Gestor de bots
3. **`src/modules/DeFiProtocols/executors/ArbitrageExecutor.ts`** - Ejecutor de arbitrage
4. **`src/components/DeFiProtocolsModule.tsx`** - Componente React

---

## 🚀 Uso Rápido

### 1. Inicializar el Manager

```typescript
import { BotManager } from './services/BotManager';
import { ArbitrageExecutor } from './executors/ArbitrageExecutor';

const manager = new BotManager();
const executor = new ArbitrageExecutor(
  'https://arb1.arbitrum.io/rpc',
  'YOUR_PRIVATE_KEY'
);

manager.registerBotExecutor('arbitrage', executor);
```

### 2. Crear un Bot

```typescript
const botConfig = manager.createBot({
  id: 'bot-arbitrage-01',
  name: 'Arbitrage Bot #1',
  type: 'arbitrage',
  network: 'arbitrum',
  enabled: false,
  status: 'idle',
  capital: 10000,
  maxCapitalPerTrade: 1000,
  minProfitThreshold: 0.5,
  parameters: {
    pairs: [
      {
        tokenIn: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831', // USDC
        tokenOut: '0xfd086bc7cd5c481dcc9c85efe8c1cad8596992c9', // USDT
        dex1: 'uniswap',
        dex2: 'curve'
      }
    ],
    maxSlippage: 1.5,
    minProfit: 0.5
  },
  checkIntervalSeconds: 60,
  stopLoss: 5,
  takeProfit: 10,
  maxDailyLoss: 500
});
```

### 3. Activar el Bot

```typescript
await manager.activateBot('bot-arbitrage-01');
```

### 4. Obtener Estadísticas

```typescript
const stats = manager.getOverallStats();
console.log(`Ganancia total: $${stats.totalProfit.toFixed(2)}`);
console.log(`ROI promedio: ${stats.averageROI.toFixed(2)}%`);
```

---

## 🤖 Crear Nuevos Tipos de Bots

### Estructura de un Ejecutor

```typescript
import { BotConfig, BotExecutionResult } from '../types';
import { BotExecutor } from '../services/BotManager';

export class MyCustomExecutor implements BotExecutor {
  validate(config: BotConfig): boolean {
    // Validar configuración
    return true;
  }

  async execute(config: BotConfig): Promise<BotExecutionResult> {
    try {
      // Implementar lógica del bot
      return {
        success: true,
        trade: { /* trade details */ }
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message
      };
    }
  }
}
```

### Registrar el Nuevo Ejecutor

```typescript
const customExecutor = new MyCustomExecutor();
manager.registerBotExecutor('my-bot-type', customExecutor);
```

---

## 📡 API Backend

### Endpoints

#### GET `/api/defi/bots`
Obtener todos los bots y estadísticas generales
```json
{
  "bots": [...],
  "stats": {
    "totalBots": 5,
    "activeBots": 2,
    "totalProfit": 5000,
    "averageROI": 12.5
  }
}
```

#### POST `/api/defi/bots`
Crear un nuevo bot
```json
{
  "name": "Arbitrage Bot",
  "type": "arbitrage",
  "network": "arbitrum",
  "capital": 10000,
  ...
}
```

#### POST `/api/defi/bots/{botId}/activate`
Activar un bot

#### POST `/api/defi/bots/{botId}/pause`
Pausar un bot

#### GET `/api/defi/bots/{botId}/trades`
Obtener todas las operaciones de un bot

#### GET `/api/defi/bots/{botId}/stats`
Obtener estadísticas de un bot específico

---

## 📚 Ejemplos

### Ejemplo 1: Bot de Arbitrage en Arbitrum

```typescript
const arbitrageBot = manager.createBot({
  name: 'Arbitrage USDC-USDT',
  type: 'arbitrage',
  network: 'arbitrum',
  capital: 10000,
  maxCapitalPerTrade: 500,
  minProfitThreshold: 0.3,
  parameters: {
    pairs: [
      {
        tokenIn: USDC,
        tokenOut: USDT,
        dex1: 'uniswap',
        dex2: 'curve'
      },
      {
        tokenIn: USDC,
        tokenOut: DAI,
        dex1: 'uniswap',
        dex2: 'balancer'
      }
    ],
    maxSlippage: 1.5,
    minProfit: 0.3
  },
  checkIntervalSeconds: 30,
  stopLoss: 2,
  takeProfit: 5,
  maxDailyLoss: 1000
});

await manager.activateBot(arbitrageBot.id);
```

### Ejemplo 2: Múltiples Bots

```typescript
const bots = [
  { name: 'Arbitrage Bot 1', ... },
  { name: 'Arbitrage Bot 2', ... },
  { name: 'Yield Farming Bot', ... },
  { name: 'Liquidity Bot', ... }
];

for (const botConfig of bots) {
  const bot = manager.createBot(botConfig);
  await manager.activateBot(bot.id);
}

// Monitorear todos
setInterval(() => {
  const stats = manager.getOverallStats();
  console.log(`📊 Ganancias: $${stats.totalProfit}`);
}, 60000);
```

### Ejemplo 3: Exportar/Importar Configuración

```typescript
// Exportar
const configJson = manager.exportConfig();
fs.writeFileSync('bots-config.json', configJson);

// Importar en otra instancia
const newManager = new BotManager();
newManager.importConfig(fs.readFileSync('bots-config.json', 'utf8'));
```

---

## 🎨 UI React

El componente `DeFiProtocolsModule.tsx` proporciona:

- **Dashboard**: Estadísticas generales en tiempo real
- **Bot Manager**: Crear, activar, pausar, detener bots
- **Bot Form**: Formulario intuitivo para crear bots
- **Bot Cards**: Visualización de bots con estadísticas
- **Bot Details**: Detalles completos de cada bot

### Integración en la App

```typescript
import DeFiProtocolsModule from './components/DeFiProtocolsModule';

export const App = () => {
  return (
    <div>
      <DeFiProtocolsModule />
    </div>
  );
};
```

---

## 🔄 Próximos Pasos

1. ✅ **Arbitrage Executor** - Implementado
2. ⏭️ **Liquidity Executor** - Próximo bot tipo
3. ⏭️ **Yield Farming Executor** - Bot de farming
4. ⏭️ **Flash Loan Executor** - Bot con flash loans
5. ⏭️ **DEX Aggregator** - Agregación de DEXs
6. ⏭️ **Persistencia de Base de Datos** - MongoDB/PostgreSQL
7. ⏭️ **WebSocket en Tiempo Real** - Actualizaciones live
8. ⏭️ **Alertas y Notificaciones** - Discord/Telegram

---

## 📞 Soporte

Para agregar un nuevo tipo de bot o ejecutor personalizado, sigue la interfaz `BotExecutor` y registra el ejecutor con el `BotManager`.




## 📋 Índice
1. [Introducción](#introducción)
2. [Arquitectura](#arquitectura)
3. [Instalación](#instalación)
4. [Uso Rápido](#uso-rápido)
5. [Crear Bots](#crear-bots)
6. [API](#api)
7. [Ejemplos](#ejemplos)

---

## 🎯 Introducción

El **DeFi Protocols Bot Manager** es un módulo completo para crear, configurar y gestionar múltiples bots autónomos de trading en redes Layer 2 como Arbitrum One.

### Características Principales

✅ **Arquitectura Modular**: Agregar nuevos tipos de bots sin modificar el core  
✅ **Multi-Red**: Soporta Ethereum, Arbitrum, Optimism, Polygon, Base  
✅ **Gestión Centralizada**: Control de múltiples bots desde un panel  
✅ **Estadísticas en Tiempo Real**: Monitoreo de ganancias y operaciones  
✅ **Seguridad**: Stop loss, take profit, límites diarios  
✅ **Almacenamiento**: Exportar/importar configuraciones  

---

## 🏗️ Arquitectura

```
DeFiProtocolsModule
├── Types/
│   └── index.ts (BotConfig, BotType, NetworkType, etc)
├── Services/
│   └── BotManager.ts (Gestor central de bots)
├── Executors/
│   ├── ArbitrageExecutor.ts (Bot de arbitrage)
│   ├── LiquidityExecutor.ts (Bot de liquidez - próximo)
│   ├── YieldExecutor.ts (Bot de yield farming - próximo)
│   └── ... (más ejecutores)
├── Components/
│   └── DeFiProtocolsModule.tsx (UI React)
└── API/
    └── defi-routes.ts (Rutas del backend)
```

---

## 💿 Instalación

### Requisitos
- Node.js 18+
- ethers.js v6
- React 18+
- TypeScript

### Archivos Necesarios

1. **`src/modules/DeFiProtocols/types/index.ts`** - Definiciones de tipos
2. **`src/modules/DeFiProtocols/services/BotManager.ts`** - Gestor de bots
3. **`src/modules/DeFiProtocols/executors/ArbitrageExecutor.ts`** - Ejecutor de arbitrage
4. **`src/components/DeFiProtocolsModule.tsx`** - Componente React

---

## 🚀 Uso Rápido

### 1. Inicializar el Manager

```typescript
import { BotManager } from './services/BotManager';
import { ArbitrageExecutor } from './executors/ArbitrageExecutor';

const manager = new BotManager();
const executor = new ArbitrageExecutor(
  'https://arb1.arbitrum.io/rpc',
  'YOUR_PRIVATE_KEY'
);

manager.registerBotExecutor('arbitrage', executor);
```

### 2. Crear un Bot

```typescript
const botConfig = manager.createBot({
  id: 'bot-arbitrage-01',
  name: 'Arbitrage Bot #1',
  type: 'arbitrage',
  network: 'arbitrum',
  enabled: false,
  status: 'idle',
  capital: 10000,
  maxCapitalPerTrade: 1000,
  minProfitThreshold: 0.5,
  parameters: {
    pairs: [
      {
        tokenIn: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831', // USDC
        tokenOut: '0xfd086bc7cd5c481dcc9c85efe8c1cad8596992c9', // USDT
        dex1: 'uniswap',
        dex2: 'curve'
      }
    ],
    maxSlippage: 1.5,
    minProfit: 0.5
  },
  checkIntervalSeconds: 60,
  stopLoss: 5,
  takeProfit: 10,
  maxDailyLoss: 500
});
```

### 3. Activar el Bot

```typescript
await manager.activateBot('bot-arbitrage-01');
```

### 4. Obtener Estadísticas

```typescript
const stats = manager.getOverallStats();
console.log(`Ganancia total: $${stats.totalProfit.toFixed(2)}`);
console.log(`ROI promedio: ${stats.averageROI.toFixed(2)}%`);
```

---

## 🤖 Crear Nuevos Tipos de Bots

### Estructura de un Ejecutor

```typescript
import { BotConfig, BotExecutionResult } from '../types';
import { BotExecutor } from '../services/BotManager';

export class MyCustomExecutor implements BotExecutor {
  validate(config: BotConfig): boolean {
    // Validar configuración
    return true;
  }

  async execute(config: BotConfig): Promise<BotExecutionResult> {
    try {
      // Implementar lógica del bot
      return {
        success: true,
        trade: { /* trade details */ }
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message
      };
    }
  }
}
```

### Registrar el Nuevo Ejecutor

```typescript
const customExecutor = new MyCustomExecutor();
manager.registerBotExecutor('my-bot-type', customExecutor);
```

---

## 📡 API Backend

### Endpoints

#### GET `/api/defi/bots`
Obtener todos los bots y estadísticas generales
```json
{
  "bots": [...],
  "stats": {
    "totalBots": 5,
    "activeBots": 2,
    "totalProfit": 5000,
    "averageROI": 12.5
  }
}
```

#### POST `/api/defi/bots`
Crear un nuevo bot
```json
{
  "name": "Arbitrage Bot",
  "type": "arbitrage",
  "network": "arbitrum",
  "capital": 10000,
  ...
}
```

#### POST `/api/defi/bots/{botId}/activate`
Activar un bot

#### POST `/api/defi/bots/{botId}/pause`
Pausar un bot

#### GET `/api/defi/bots/{botId}/trades`
Obtener todas las operaciones de un bot

#### GET `/api/defi/bots/{botId}/stats`
Obtener estadísticas de un bot específico

---

## 📚 Ejemplos

### Ejemplo 1: Bot de Arbitrage en Arbitrum

```typescript
const arbitrageBot = manager.createBot({
  name: 'Arbitrage USDC-USDT',
  type: 'arbitrage',
  network: 'arbitrum',
  capital: 10000,
  maxCapitalPerTrade: 500,
  minProfitThreshold: 0.3,
  parameters: {
    pairs: [
      {
        tokenIn: USDC,
        tokenOut: USDT,
        dex1: 'uniswap',
        dex2: 'curve'
      },
      {
        tokenIn: USDC,
        tokenOut: DAI,
        dex1: 'uniswap',
        dex2: 'balancer'
      }
    ],
    maxSlippage: 1.5,
    minProfit: 0.3
  },
  checkIntervalSeconds: 30,
  stopLoss: 2,
  takeProfit: 5,
  maxDailyLoss: 1000
});

await manager.activateBot(arbitrageBot.id);
```

### Ejemplo 2: Múltiples Bots

```typescript
const bots = [
  { name: 'Arbitrage Bot 1', ... },
  { name: 'Arbitrage Bot 2', ... },
  { name: 'Yield Farming Bot', ... },
  { name: 'Liquidity Bot', ... }
];

for (const botConfig of bots) {
  const bot = manager.createBot(botConfig);
  await manager.activateBot(bot.id);
}

// Monitorear todos
setInterval(() => {
  const stats = manager.getOverallStats();
  console.log(`📊 Ganancias: $${stats.totalProfit}`);
}, 60000);
```

### Ejemplo 3: Exportar/Importar Configuración

```typescript
// Exportar
const configJson = manager.exportConfig();
fs.writeFileSync('bots-config.json', configJson);

// Importar en otra instancia
const newManager = new BotManager();
newManager.importConfig(fs.readFileSync('bots-config.json', 'utf8'));
```

---

## 🎨 UI React

El componente `DeFiProtocolsModule.tsx` proporciona:

- **Dashboard**: Estadísticas generales en tiempo real
- **Bot Manager**: Crear, activar, pausar, detener bots
- **Bot Form**: Formulario intuitivo para crear bots
- **Bot Cards**: Visualización de bots con estadísticas
- **Bot Details**: Detalles completos de cada bot

### Integración en la App

```typescript
import DeFiProtocolsModule from './components/DeFiProtocolsModule';

export const App = () => {
  return (
    <div>
      <DeFiProtocolsModule />
    </div>
  );
};
```

---

## 🔄 Próximos Pasos

1. ✅ **Arbitrage Executor** - Implementado
2. ⏭️ **Liquidity Executor** - Próximo bot tipo
3. ⏭️ **Yield Farming Executor** - Bot de farming
4. ⏭️ **Flash Loan Executor** - Bot con flash loans
5. ⏭️ **DEX Aggregator** - Agregación de DEXs
6. ⏭️ **Persistencia de Base de Datos** - MongoDB/PostgreSQL
7. ⏭️ **WebSocket en Tiempo Real** - Actualizaciones live
8. ⏭️ **Alertas y Notificaciones** - Discord/Telegram

---

## 📞 Soporte

Para agregar un nuevo tipo de bot o ejecutor personalizado, sigue la interfaz `BotExecutor` y registra el ejecutor con el `BotManager`.




## 📋 Índice
1. [Introducción](#introducción)
2. [Arquitectura](#arquitectura)
3. [Instalación](#instalación)
4. [Uso Rápido](#uso-rápido)
5. [Crear Bots](#crear-bots)
6. [API](#api)
7. [Ejemplos](#ejemplos)

---

## 🎯 Introducción

El **DeFi Protocols Bot Manager** es un módulo completo para crear, configurar y gestionar múltiples bots autónomos de trading en redes Layer 2 como Arbitrum One.

### Características Principales

✅ **Arquitectura Modular**: Agregar nuevos tipos de bots sin modificar el core  
✅ **Multi-Red**: Soporta Ethereum, Arbitrum, Optimism, Polygon, Base  
✅ **Gestión Centralizada**: Control de múltiples bots desde un panel  
✅ **Estadísticas en Tiempo Real**: Monitoreo de ganancias y operaciones  
✅ **Seguridad**: Stop loss, take profit, límites diarios  
✅ **Almacenamiento**: Exportar/importar configuraciones  

---

## 🏗️ Arquitectura

```
DeFiProtocolsModule
├── Types/
│   └── index.ts (BotConfig, BotType, NetworkType, etc)
├── Services/
│   └── BotManager.ts (Gestor central de bots)
├── Executors/
│   ├── ArbitrageExecutor.ts (Bot de arbitrage)
│   ├── LiquidityExecutor.ts (Bot de liquidez - próximo)
│   ├── YieldExecutor.ts (Bot de yield farming - próximo)
│   └── ... (más ejecutores)
├── Components/
│   └── DeFiProtocolsModule.tsx (UI React)
└── API/
    └── defi-routes.ts (Rutas del backend)
```

---

## 💿 Instalación

### Requisitos
- Node.js 18+
- ethers.js v6
- React 18+
- TypeScript

### Archivos Necesarios

1. **`src/modules/DeFiProtocols/types/index.ts`** - Definiciones de tipos
2. **`src/modules/DeFiProtocols/services/BotManager.ts`** - Gestor de bots
3. **`src/modules/DeFiProtocols/executors/ArbitrageExecutor.ts`** - Ejecutor de arbitrage
4. **`src/components/DeFiProtocolsModule.tsx`** - Componente React

---

## 🚀 Uso Rápido

### 1. Inicializar el Manager

```typescript
import { BotManager } from './services/BotManager';
import { ArbitrageExecutor } from './executors/ArbitrageExecutor';

const manager = new BotManager();
const executor = new ArbitrageExecutor(
  'https://arb1.arbitrum.io/rpc',
  'YOUR_PRIVATE_KEY'
);

manager.registerBotExecutor('arbitrage', executor);
```

### 2. Crear un Bot

```typescript
const botConfig = manager.createBot({
  id: 'bot-arbitrage-01',
  name: 'Arbitrage Bot #1',
  type: 'arbitrage',
  network: 'arbitrum',
  enabled: false,
  status: 'idle',
  capital: 10000,
  maxCapitalPerTrade: 1000,
  minProfitThreshold: 0.5,
  parameters: {
    pairs: [
      {
        tokenIn: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831', // USDC
        tokenOut: '0xfd086bc7cd5c481dcc9c85efe8c1cad8596992c9', // USDT
        dex1: 'uniswap',
        dex2: 'curve'
      }
    ],
    maxSlippage: 1.5,
    minProfit: 0.5
  },
  checkIntervalSeconds: 60,
  stopLoss: 5,
  takeProfit: 10,
  maxDailyLoss: 500
});
```

### 3. Activar el Bot

```typescript
await manager.activateBot('bot-arbitrage-01');
```

### 4. Obtener Estadísticas

```typescript
const stats = manager.getOverallStats();
console.log(`Ganancia total: $${stats.totalProfit.toFixed(2)}`);
console.log(`ROI promedio: ${stats.averageROI.toFixed(2)}%`);
```

---

## 🤖 Crear Nuevos Tipos de Bots

### Estructura de un Ejecutor

```typescript
import { BotConfig, BotExecutionResult } from '../types';
import { BotExecutor } from '../services/BotManager';

export class MyCustomExecutor implements BotExecutor {
  validate(config: BotConfig): boolean {
    // Validar configuración
    return true;
  }

  async execute(config: BotConfig): Promise<BotExecutionResult> {
    try {
      // Implementar lógica del bot
      return {
        success: true,
        trade: { /* trade details */ }
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message
      };
    }
  }
}
```

### Registrar el Nuevo Ejecutor

```typescript
const customExecutor = new MyCustomExecutor();
manager.registerBotExecutor('my-bot-type', customExecutor);
```

---

## 📡 API Backend

### Endpoints

#### GET `/api/defi/bots`
Obtener todos los bots y estadísticas generales
```json
{
  "bots": [...],
  "stats": {
    "totalBots": 5,
    "activeBots": 2,
    "totalProfit": 5000,
    "averageROI": 12.5
  }
}
```

#### POST `/api/defi/bots`
Crear un nuevo bot
```json
{
  "name": "Arbitrage Bot",
  "type": "arbitrage",
  "network": "arbitrum",
  "capital": 10000,
  ...
}
```

#### POST `/api/defi/bots/{botId}/activate`
Activar un bot

#### POST `/api/defi/bots/{botId}/pause`
Pausar un bot

#### GET `/api/defi/bots/{botId}/trades`
Obtener todas las operaciones de un bot

#### GET `/api/defi/bots/{botId}/stats`
Obtener estadísticas de un bot específico

---

## 📚 Ejemplos

### Ejemplo 1: Bot de Arbitrage en Arbitrum

```typescript
const arbitrageBot = manager.createBot({
  name: 'Arbitrage USDC-USDT',
  type: 'arbitrage',
  network: 'arbitrum',
  capital: 10000,
  maxCapitalPerTrade: 500,
  minProfitThreshold: 0.3,
  parameters: {
    pairs: [
      {
        tokenIn: USDC,
        tokenOut: USDT,
        dex1: 'uniswap',
        dex2: 'curve'
      },
      {
        tokenIn: USDC,
        tokenOut: DAI,
        dex1: 'uniswap',
        dex2: 'balancer'
      }
    ],
    maxSlippage: 1.5,
    minProfit: 0.3
  },
  checkIntervalSeconds: 30,
  stopLoss: 2,
  takeProfit: 5,
  maxDailyLoss: 1000
});

await manager.activateBot(arbitrageBot.id);
```

### Ejemplo 2: Múltiples Bots

```typescript
const bots = [
  { name: 'Arbitrage Bot 1', ... },
  { name: 'Arbitrage Bot 2', ... },
  { name: 'Yield Farming Bot', ... },
  { name: 'Liquidity Bot', ... }
];

for (const botConfig of bots) {
  const bot = manager.createBot(botConfig);
  await manager.activateBot(bot.id);
}

// Monitorear todos
setInterval(() => {
  const stats = manager.getOverallStats();
  console.log(`📊 Ganancias: $${stats.totalProfit}`);
}, 60000);
```

### Ejemplo 3: Exportar/Importar Configuración

```typescript
// Exportar
const configJson = manager.exportConfig();
fs.writeFileSync('bots-config.json', configJson);

// Importar en otra instancia
const newManager = new BotManager();
newManager.importConfig(fs.readFileSync('bots-config.json', 'utf8'));
```

---

## 🎨 UI React

El componente `DeFiProtocolsModule.tsx` proporciona:

- **Dashboard**: Estadísticas generales en tiempo real
- **Bot Manager**: Crear, activar, pausar, detener bots
- **Bot Form**: Formulario intuitivo para crear bots
- **Bot Cards**: Visualización de bots con estadísticas
- **Bot Details**: Detalles completos de cada bot

### Integración en la App

```typescript
import DeFiProtocolsModule from './components/DeFiProtocolsModule';

export const App = () => {
  return (
    <div>
      <DeFiProtocolsModule />
    </div>
  );
};
```

---

## 🔄 Próximos Pasos

1. ✅ **Arbitrage Executor** - Implementado
2. ⏭️ **Liquidity Executor** - Próximo bot tipo
3. ⏭️ **Yield Farming Executor** - Bot de farming
4. ⏭️ **Flash Loan Executor** - Bot con flash loans
5. ⏭️ **DEX Aggregator** - Agregación de DEXs
6. ⏭️ **Persistencia de Base de Datos** - MongoDB/PostgreSQL
7. ⏭️ **WebSocket en Tiempo Real** - Actualizaciones live
8. ⏭️ **Alertas y Notificaciones** - Discord/Telegram

---

## 📞 Soporte

Para agregar un nuevo tipo de bot o ejecutor personalizado, sigue la interfaz `BotExecutor` y registra el ejecutor con el `BotManager`.




## 📋 Índice
1. [Introducción](#introducción)
2. [Arquitectura](#arquitectura)
3. [Instalación](#instalación)
4. [Uso Rápido](#uso-rápido)
5. [Crear Bots](#crear-bots)
6. [API](#api)
7. [Ejemplos](#ejemplos)

---

## 🎯 Introducción

El **DeFi Protocols Bot Manager** es un módulo completo para crear, configurar y gestionar múltiples bots autónomos de trading en redes Layer 2 como Arbitrum One.

### Características Principales

✅ **Arquitectura Modular**: Agregar nuevos tipos de bots sin modificar el core  
✅ **Multi-Red**: Soporta Ethereum, Arbitrum, Optimism, Polygon, Base  
✅ **Gestión Centralizada**: Control de múltiples bots desde un panel  
✅ **Estadísticas en Tiempo Real**: Monitoreo de ganancias y operaciones  
✅ **Seguridad**: Stop loss, take profit, límites diarios  
✅ **Almacenamiento**: Exportar/importar configuraciones  

---

## 🏗️ Arquitectura

```
DeFiProtocolsModule
├── Types/
│   └── index.ts (BotConfig, BotType, NetworkType, etc)
├── Services/
│   └── BotManager.ts (Gestor central de bots)
├── Executors/
│   ├── ArbitrageExecutor.ts (Bot de arbitrage)
│   ├── LiquidityExecutor.ts (Bot de liquidez - próximo)
│   ├── YieldExecutor.ts (Bot de yield farming - próximo)
│   └── ... (más ejecutores)
├── Components/
│   └── DeFiProtocolsModule.tsx (UI React)
└── API/
    └── defi-routes.ts (Rutas del backend)
```

---

## 💿 Instalación

### Requisitos
- Node.js 18+
- ethers.js v6
- React 18+
- TypeScript

### Archivos Necesarios

1. **`src/modules/DeFiProtocols/types/index.ts`** - Definiciones de tipos
2. **`src/modules/DeFiProtocols/services/BotManager.ts`** - Gestor de bots
3. **`src/modules/DeFiProtocols/executors/ArbitrageExecutor.ts`** - Ejecutor de arbitrage
4. **`src/components/DeFiProtocolsModule.tsx`** - Componente React

---

## 🚀 Uso Rápido

### 1. Inicializar el Manager

```typescript
import { BotManager } from './services/BotManager';
import { ArbitrageExecutor } from './executors/ArbitrageExecutor';

const manager = new BotManager();
const executor = new ArbitrageExecutor(
  'https://arb1.arbitrum.io/rpc',
  'YOUR_PRIVATE_KEY'
);

manager.registerBotExecutor('arbitrage', executor);
```

### 2. Crear un Bot

```typescript
const botConfig = manager.createBot({
  id: 'bot-arbitrage-01',
  name: 'Arbitrage Bot #1',
  type: 'arbitrage',
  network: 'arbitrum',
  enabled: false,
  status: 'idle',
  capital: 10000,
  maxCapitalPerTrade: 1000,
  minProfitThreshold: 0.5,
  parameters: {
    pairs: [
      {
        tokenIn: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831', // USDC
        tokenOut: '0xfd086bc7cd5c481dcc9c85efe8c1cad8596992c9', // USDT
        dex1: 'uniswap',
        dex2: 'curve'
      }
    ],
    maxSlippage: 1.5,
    minProfit: 0.5
  },
  checkIntervalSeconds: 60,
  stopLoss: 5,
  takeProfit: 10,
  maxDailyLoss: 500
});
```

### 3. Activar el Bot

```typescript
await manager.activateBot('bot-arbitrage-01');
```

### 4. Obtener Estadísticas

```typescript
const stats = manager.getOverallStats();
console.log(`Ganancia total: $${stats.totalProfit.toFixed(2)}`);
console.log(`ROI promedio: ${stats.averageROI.toFixed(2)}%`);
```

---

## 🤖 Crear Nuevos Tipos de Bots

### Estructura de un Ejecutor

```typescript
import { BotConfig, BotExecutionResult } from '../types';
import { BotExecutor } from '../services/BotManager';

export class MyCustomExecutor implements BotExecutor {
  validate(config: BotConfig): boolean {
    // Validar configuración
    return true;
  }

  async execute(config: BotConfig): Promise<BotExecutionResult> {
    try {
      // Implementar lógica del bot
      return {
        success: true,
        trade: { /* trade details */ }
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message
      };
    }
  }
}
```

### Registrar el Nuevo Ejecutor

```typescript
const customExecutor = new MyCustomExecutor();
manager.registerBotExecutor('my-bot-type', customExecutor);
```

---

## 📡 API Backend

### Endpoints

#### GET `/api/defi/bots`
Obtener todos los bots y estadísticas generales
```json
{
  "bots": [...],
  "stats": {
    "totalBots": 5,
    "activeBots": 2,
    "totalProfit": 5000,
    "averageROI": 12.5
  }
}
```

#### POST `/api/defi/bots`
Crear un nuevo bot
```json
{
  "name": "Arbitrage Bot",
  "type": "arbitrage",
  "network": "arbitrum",
  "capital": 10000,
  ...
}
```

#### POST `/api/defi/bots/{botId}/activate`
Activar un bot

#### POST `/api/defi/bots/{botId}/pause`
Pausar un bot

#### GET `/api/defi/bots/{botId}/trades`
Obtener todas las operaciones de un bot

#### GET `/api/defi/bots/{botId}/stats`
Obtener estadísticas de un bot específico

---

## 📚 Ejemplos

### Ejemplo 1: Bot de Arbitrage en Arbitrum

```typescript
const arbitrageBot = manager.createBot({
  name: 'Arbitrage USDC-USDT',
  type: 'arbitrage',
  network: 'arbitrum',
  capital: 10000,
  maxCapitalPerTrade: 500,
  minProfitThreshold: 0.3,
  parameters: {
    pairs: [
      {
        tokenIn: USDC,
        tokenOut: USDT,
        dex1: 'uniswap',
        dex2: 'curve'
      },
      {
        tokenIn: USDC,
        tokenOut: DAI,
        dex1: 'uniswap',
        dex2: 'balancer'
      }
    ],
    maxSlippage: 1.5,
    minProfit: 0.3
  },
  checkIntervalSeconds: 30,
  stopLoss: 2,
  takeProfit: 5,
  maxDailyLoss: 1000
});

await manager.activateBot(arbitrageBot.id);
```

### Ejemplo 2: Múltiples Bots

```typescript
const bots = [
  { name: 'Arbitrage Bot 1', ... },
  { name: 'Arbitrage Bot 2', ... },
  { name: 'Yield Farming Bot', ... },
  { name: 'Liquidity Bot', ... }
];

for (const botConfig of bots) {
  const bot = manager.createBot(botConfig);
  await manager.activateBot(bot.id);
}

// Monitorear todos
setInterval(() => {
  const stats = manager.getOverallStats();
  console.log(`📊 Ganancias: $${stats.totalProfit}`);
}, 60000);
```

### Ejemplo 3: Exportar/Importar Configuración

```typescript
// Exportar
const configJson = manager.exportConfig();
fs.writeFileSync('bots-config.json', configJson);

// Importar en otra instancia
const newManager = new BotManager();
newManager.importConfig(fs.readFileSync('bots-config.json', 'utf8'));
```

---

## 🎨 UI React

El componente `DeFiProtocolsModule.tsx` proporciona:

- **Dashboard**: Estadísticas generales en tiempo real
- **Bot Manager**: Crear, activar, pausar, detener bots
- **Bot Form**: Formulario intuitivo para crear bots
- **Bot Cards**: Visualización de bots con estadísticas
- **Bot Details**: Detalles completos de cada bot

### Integración en la App

```typescript
import DeFiProtocolsModule from './components/DeFiProtocolsModule';

export const App = () => {
  return (
    <div>
      <DeFiProtocolsModule />
    </div>
  );
};
```

---

## 🔄 Próximos Pasos

1. ✅ **Arbitrage Executor** - Implementado
2. ⏭️ **Liquidity Executor** - Próximo bot tipo
3. ⏭️ **Yield Farming Executor** - Bot de farming
4. ⏭️ **Flash Loan Executor** - Bot con flash loans
5. ⏭️ **DEX Aggregator** - Agregación de DEXs
6. ⏭️ **Persistencia de Base de Datos** - MongoDB/PostgreSQL
7. ⏭️ **WebSocket en Tiempo Real** - Actualizaciones live
8. ⏭️ **Alertas y Notificaciones** - Discord/Telegram

---

## 📞 Soporte

Para agregar un nuevo tipo de bot o ejecutor personalizado, sigue la interfaz `BotExecutor` y registra el ejecutor con el `BotManager`.





## 📋 Índice
1. [Introducción](#introducción)
2. [Arquitectura](#arquitectura)
3. [Instalación](#instalación)
4. [Uso Rápido](#uso-rápido)
5. [Crear Bots](#crear-bots)
6. [API](#api)
7. [Ejemplos](#ejemplos)

---

## 🎯 Introducción

El **DeFi Protocols Bot Manager** es un módulo completo para crear, configurar y gestionar múltiples bots autónomos de trading en redes Layer 2 como Arbitrum One.

### Características Principales

✅ **Arquitectura Modular**: Agregar nuevos tipos de bots sin modificar el core  
✅ **Multi-Red**: Soporta Ethereum, Arbitrum, Optimism, Polygon, Base  
✅ **Gestión Centralizada**: Control de múltiples bots desde un panel  
✅ **Estadísticas en Tiempo Real**: Monitoreo de ganancias y operaciones  
✅ **Seguridad**: Stop loss, take profit, límites diarios  
✅ **Almacenamiento**: Exportar/importar configuraciones  

---

## 🏗️ Arquitectura

```
DeFiProtocolsModule
├── Types/
│   └── index.ts (BotConfig, BotType, NetworkType, etc)
├── Services/
│   └── BotManager.ts (Gestor central de bots)
├── Executors/
│   ├── ArbitrageExecutor.ts (Bot de arbitrage)
│   ├── LiquidityExecutor.ts (Bot de liquidez - próximo)
│   ├── YieldExecutor.ts (Bot de yield farming - próximo)
│   └── ... (más ejecutores)
├── Components/
│   └── DeFiProtocolsModule.tsx (UI React)
└── API/
    └── defi-routes.ts (Rutas del backend)
```

---

## 💿 Instalación

### Requisitos
- Node.js 18+
- ethers.js v6
- React 18+
- TypeScript

### Archivos Necesarios

1. **`src/modules/DeFiProtocols/types/index.ts`** - Definiciones de tipos
2. **`src/modules/DeFiProtocols/services/BotManager.ts`** - Gestor de bots
3. **`src/modules/DeFiProtocols/executors/ArbitrageExecutor.ts`** - Ejecutor de arbitrage
4. **`src/components/DeFiProtocolsModule.tsx`** - Componente React

---

## 🚀 Uso Rápido

### 1. Inicializar el Manager

```typescript
import { BotManager } from './services/BotManager';
import { ArbitrageExecutor } from './executors/ArbitrageExecutor';

const manager = new BotManager();
const executor = new ArbitrageExecutor(
  'https://arb1.arbitrum.io/rpc',
  'YOUR_PRIVATE_KEY'
);

manager.registerBotExecutor('arbitrage', executor);
```

### 2. Crear un Bot

```typescript
const botConfig = manager.createBot({
  id: 'bot-arbitrage-01',
  name: 'Arbitrage Bot #1',
  type: 'arbitrage',
  network: 'arbitrum',
  enabled: false,
  status: 'idle',
  capital: 10000,
  maxCapitalPerTrade: 1000,
  minProfitThreshold: 0.5,
  parameters: {
    pairs: [
      {
        tokenIn: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831', // USDC
        tokenOut: '0xfd086bc7cd5c481dcc9c85efe8c1cad8596992c9', // USDT
        dex1: 'uniswap',
        dex2: 'curve'
      }
    ],
    maxSlippage: 1.5,
    minProfit: 0.5
  },
  checkIntervalSeconds: 60,
  stopLoss: 5,
  takeProfit: 10,
  maxDailyLoss: 500
});
```

### 3. Activar el Bot

```typescript
await manager.activateBot('bot-arbitrage-01');
```

### 4. Obtener Estadísticas

```typescript
const stats = manager.getOverallStats();
console.log(`Ganancia total: $${stats.totalProfit.toFixed(2)}`);
console.log(`ROI promedio: ${stats.averageROI.toFixed(2)}%`);
```

---

## 🤖 Crear Nuevos Tipos de Bots

### Estructura de un Ejecutor

```typescript
import { BotConfig, BotExecutionResult } from '../types';
import { BotExecutor } from '../services/BotManager';

export class MyCustomExecutor implements BotExecutor {
  validate(config: BotConfig): boolean {
    // Validar configuración
    return true;
  }

  async execute(config: BotConfig): Promise<BotExecutionResult> {
    try {
      // Implementar lógica del bot
      return {
        success: true,
        trade: { /* trade details */ }
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message
      };
    }
  }
}
```

### Registrar el Nuevo Ejecutor

```typescript
const customExecutor = new MyCustomExecutor();
manager.registerBotExecutor('my-bot-type', customExecutor);
```

---

## 📡 API Backend

### Endpoints

#### GET `/api/defi/bots`
Obtener todos los bots y estadísticas generales
```json
{
  "bots": [...],
  "stats": {
    "totalBots": 5,
    "activeBots": 2,
    "totalProfit": 5000,
    "averageROI": 12.5
  }
}
```

#### POST `/api/defi/bots`
Crear un nuevo bot
```json
{
  "name": "Arbitrage Bot",
  "type": "arbitrage",
  "network": "arbitrum",
  "capital": 10000,
  ...
}
```

#### POST `/api/defi/bots/{botId}/activate`
Activar un bot

#### POST `/api/defi/bots/{botId}/pause`
Pausar un bot

#### GET `/api/defi/bots/{botId}/trades`
Obtener todas las operaciones de un bot

#### GET `/api/defi/bots/{botId}/stats`
Obtener estadísticas de un bot específico

---

## 📚 Ejemplos

### Ejemplo 1: Bot de Arbitrage en Arbitrum

```typescript
const arbitrageBot = manager.createBot({
  name: 'Arbitrage USDC-USDT',
  type: 'arbitrage',
  network: 'arbitrum',
  capital: 10000,
  maxCapitalPerTrade: 500,
  minProfitThreshold: 0.3,
  parameters: {
    pairs: [
      {
        tokenIn: USDC,
        tokenOut: USDT,
        dex1: 'uniswap',
        dex2: 'curve'
      },
      {
        tokenIn: USDC,
        tokenOut: DAI,
        dex1: 'uniswap',
        dex2: 'balancer'
      }
    ],
    maxSlippage: 1.5,
    minProfit: 0.3
  },
  checkIntervalSeconds: 30,
  stopLoss: 2,
  takeProfit: 5,
  maxDailyLoss: 1000
});

await manager.activateBot(arbitrageBot.id);
```

### Ejemplo 2: Múltiples Bots

```typescript
const bots = [
  { name: 'Arbitrage Bot 1', ... },
  { name: 'Arbitrage Bot 2', ... },
  { name: 'Yield Farming Bot', ... },
  { name: 'Liquidity Bot', ... }
];

for (const botConfig of bots) {
  const bot = manager.createBot(botConfig);
  await manager.activateBot(bot.id);
}

// Monitorear todos
setInterval(() => {
  const stats = manager.getOverallStats();
  console.log(`📊 Ganancias: $${stats.totalProfit}`);
}, 60000);
```

### Ejemplo 3: Exportar/Importar Configuración

```typescript
// Exportar
const configJson = manager.exportConfig();
fs.writeFileSync('bots-config.json', configJson);

// Importar en otra instancia
const newManager = new BotManager();
newManager.importConfig(fs.readFileSync('bots-config.json', 'utf8'));
```

---

## 🎨 UI React

El componente `DeFiProtocolsModule.tsx` proporciona:

- **Dashboard**: Estadísticas generales en tiempo real
- **Bot Manager**: Crear, activar, pausar, detener bots
- **Bot Form**: Formulario intuitivo para crear bots
- **Bot Cards**: Visualización de bots con estadísticas
- **Bot Details**: Detalles completos de cada bot

### Integración en la App

```typescript
import DeFiProtocolsModule from './components/DeFiProtocolsModule';

export const App = () => {
  return (
    <div>
      <DeFiProtocolsModule />
    </div>
  );
};
```

---

## 🔄 Próximos Pasos

1. ✅ **Arbitrage Executor** - Implementado
2. ⏭️ **Liquidity Executor** - Próximo bot tipo
3. ⏭️ **Yield Farming Executor** - Bot de farming
4. ⏭️ **Flash Loan Executor** - Bot con flash loans
5. ⏭️ **DEX Aggregator** - Agregación de DEXs
6. ⏭️ **Persistencia de Base de Datos** - MongoDB/PostgreSQL
7. ⏭️ **WebSocket en Tiempo Real** - Actualizaciones live
8. ⏭️ **Alertas y Notificaciones** - Discord/Telegram

---

## 📞 Soporte

Para agregar un nuevo tipo de bot o ejecutor personalizado, sigue la interfaz `BotExecutor` y registra el ejecutor con el `BotManager`.




## 📋 Índice
1. [Introducción](#introducción)
2. [Arquitectura](#arquitectura)
3. [Instalación](#instalación)
4. [Uso Rápido](#uso-rápido)
5. [Crear Bots](#crear-bots)
6. [API](#api)
7. [Ejemplos](#ejemplos)

---

## 🎯 Introducción

El **DeFi Protocols Bot Manager** es un módulo completo para crear, configurar y gestionar múltiples bots autónomos de trading en redes Layer 2 como Arbitrum One.

### Características Principales

✅ **Arquitectura Modular**: Agregar nuevos tipos de bots sin modificar el core  
✅ **Multi-Red**: Soporta Ethereum, Arbitrum, Optimism, Polygon, Base  
✅ **Gestión Centralizada**: Control de múltiples bots desde un panel  
✅ **Estadísticas en Tiempo Real**: Monitoreo de ganancias y operaciones  
✅ **Seguridad**: Stop loss, take profit, límites diarios  
✅ **Almacenamiento**: Exportar/importar configuraciones  

---

## 🏗️ Arquitectura

```
DeFiProtocolsModule
├── Types/
│   └── index.ts (BotConfig, BotType, NetworkType, etc)
├── Services/
│   └── BotManager.ts (Gestor central de bots)
├── Executors/
│   ├── ArbitrageExecutor.ts (Bot de arbitrage)
│   ├── LiquidityExecutor.ts (Bot de liquidez - próximo)
│   ├── YieldExecutor.ts (Bot de yield farming - próximo)
│   └── ... (más ejecutores)
├── Components/
│   └── DeFiProtocolsModule.tsx (UI React)
└── API/
    └── defi-routes.ts (Rutas del backend)
```

---

## 💿 Instalación

### Requisitos
- Node.js 18+
- ethers.js v6
- React 18+
- TypeScript

### Archivos Necesarios

1. **`src/modules/DeFiProtocols/types/index.ts`** - Definiciones de tipos
2. **`src/modules/DeFiProtocols/services/BotManager.ts`** - Gestor de bots
3. **`src/modules/DeFiProtocols/executors/ArbitrageExecutor.ts`** - Ejecutor de arbitrage
4. **`src/components/DeFiProtocolsModule.tsx`** - Componente React

---

## 🚀 Uso Rápido

### 1. Inicializar el Manager

```typescript
import { BotManager } from './services/BotManager';
import { ArbitrageExecutor } from './executors/ArbitrageExecutor';

const manager = new BotManager();
const executor = new ArbitrageExecutor(
  'https://arb1.arbitrum.io/rpc',
  'YOUR_PRIVATE_KEY'
);

manager.registerBotExecutor('arbitrage', executor);
```

### 2. Crear un Bot

```typescript
const botConfig = manager.createBot({
  id: 'bot-arbitrage-01',
  name: 'Arbitrage Bot #1',
  type: 'arbitrage',
  network: 'arbitrum',
  enabled: false,
  status: 'idle',
  capital: 10000,
  maxCapitalPerTrade: 1000,
  minProfitThreshold: 0.5,
  parameters: {
    pairs: [
      {
        tokenIn: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831', // USDC
        tokenOut: '0xfd086bc7cd5c481dcc9c85efe8c1cad8596992c9', // USDT
        dex1: 'uniswap',
        dex2: 'curve'
      }
    ],
    maxSlippage: 1.5,
    minProfit: 0.5
  },
  checkIntervalSeconds: 60,
  stopLoss: 5,
  takeProfit: 10,
  maxDailyLoss: 500
});
```

### 3. Activar el Bot

```typescript
await manager.activateBot('bot-arbitrage-01');
```

### 4. Obtener Estadísticas

```typescript
const stats = manager.getOverallStats();
console.log(`Ganancia total: $${stats.totalProfit.toFixed(2)}`);
console.log(`ROI promedio: ${stats.averageROI.toFixed(2)}%`);
```

---

## 🤖 Crear Nuevos Tipos de Bots

### Estructura de un Ejecutor

```typescript
import { BotConfig, BotExecutionResult } from '../types';
import { BotExecutor } from '../services/BotManager';

export class MyCustomExecutor implements BotExecutor {
  validate(config: BotConfig): boolean {
    // Validar configuración
    return true;
  }

  async execute(config: BotConfig): Promise<BotExecutionResult> {
    try {
      // Implementar lógica del bot
      return {
        success: true,
        trade: { /* trade details */ }
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message
      };
    }
  }
}
```

### Registrar el Nuevo Ejecutor

```typescript
const customExecutor = new MyCustomExecutor();
manager.registerBotExecutor('my-bot-type', customExecutor);
```

---

## 📡 API Backend

### Endpoints

#### GET `/api/defi/bots`
Obtener todos los bots y estadísticas generales
```json
{
  "bots": [...],
  "stats": {
    "totalBots": 5,
    "activeBots": 2,
    "totalProfit": 5000,
    "averageROI": 12.5
  }
}
```

#### POST `/api/defi/bots`
Crear un nuevo bot
```json
{
  "name": "Arbitrage Bot",
  "type": "arbitrage",
  "network": "arbitrum",
  "capital": 10000,
  ...
}
```

#### POST `/api/defi/bots/{botId}/activate`
Activar un bot

#### POST `/api/defi/bots/{botId}/pause`
Pausar un bot

#### GET `/api/defi/bots/{botId}/trades`
Obtener todas las operaciones de un bot

#### GET `/api/defi/bots/{botId}/stats`
Obtener estadísticas de un bot específico

---

## 📚 Ejemplos

### Ejemplo 1: Bot de Arbitrage en Arbitrum

```typescript
const arbitrageBot = manager.createBot({
  name: 'Arbitrage USDC-USDT',
  type: 'arbitrage',
  network: 'arbitrum',
  capital: 10000,
  maxCapitalPerTrade: 500,
  minProfitThreshold: 0.3,
  parameters: {
    pairs: [
      {
        tokenIn: USDC,
        tokenOut: USDT,
        dex1: 'uniswap',
        dex2: 'curve'
      },
      {
        tokenIn: USDC,
        tokenOut: DAI,
        dex1: 'uniswap',
        dex2: 'balancer'
      }
    ],
    maxSlippage: 1.5,
    minProfit: 0.3
  },
  checkIntervalSeconds: 30,
  stopLoss: 2,
  takeProfit: 5,
  maxDailyLoss: 1000
});

await manager.activateBot(arbitrageBot.id);
```

### Ejemplo 2: Múltiples Bots

```typescript
const bots = [
  { name: 'Arbitrage Bot 1', ... },
  { name: 'Arbitrage Bot 2', ... },
  { name: 'Yield Farming Bot', ... },
  { name: 'Liquidity Bot', ... }
];

for (const botConfig of bots) {
  const bot = manager.createBot(botConfig);
  await manager.activateBot(bot.id);
}

// Monitorear todos
setInterval(() => {
  const stats = manager.getOverallStats();
  console.log(`📊 Ganancias: $${stats.totalProfit}`);
}, 60000);
```

### Ejemplo 3: Exportar/Importar Configuración

```typescript
// Exportar
const configJson = manager.exportConfig();
fs.writeFileSync('bots-config.json', configJson);

// Importar en otra instancia
const newManager = new BotManager();
newManager.importConfig(fs.readFileSync('bots-config.json', 'utf8'));
```

---

## 🎨 UI React

El componente `DeFiProtocolsModule.tsx` proporciona:

- **Dashboard**: Estadísticas generales en tiempo real
- **Bot Manager**: Crear, activar, pausar, detener bots
- **Bot Form**: Formulario intuitivo para crear bots
- **Bot Cards**: Visualización de bots con estadísticas
- **Bot Details**: Detalles completos de cada bot

### Integración en la App

```typescript
import DeFiProtocolsModule from './components/DeFiProtocolsModule';

export const App = () => {
  return (
    <div>
      <DeFiProtocolsModule />
    </div>
  );
};
```

---

## 🔄 Próximos Pasos

1. ✅ **Arbitrage Executor** - Implementado
2. ⏭️ **Liquidity Executor** - Próximo bot tipo
3. ⏭️ **Yield Farming Executor** - Bot de farming
4. ⏭️ **Flash Loan Executor** - Bot con flash loans
5. ⏭️ **DEX Aggregator** - Agregación de DEXs
6. ⏭️ **Persistencia de Base de Datos** - MongoDB/PostgreSQL
7. ⏭️ **WebSocket en Tiempo Real** - Actualizaciones live
8. ⏭️ **Alertas y Notificaciones** - Discord/Telegram

---

## 📞 Soporte

Para agregar un nuevo tipo de bot o ejecutor personalizado, sigue la interfaz `BotExecutor` y registra el ejecutor con el `BotManager`.




## 📋 Índice
1. [Introducción](#introducción)
2. [Arquitectura](#arquitectura)
3. [Instalación](#instalación)
4. [Uso Rápido](#uso-rápido)
5. [Crear Bots](#crear-bots)
6. [API](#api)
7. [Ejemplos](#ejemplos)

---

## 🎯 Introducción

El **DeFi Protocols Bot Manager** es un módulo completo para crear, configurar y gestionar múltiples bots autónomos de trading en redes Layer 2 como Arbitrum One.

### Características Principales

✅ **Arquitectura Modular**: Agregar nuevos tipos de bots sin modificar el core  
✅ **Multi-Red**: Soporta Ethereum, Arbitrum, Optimism, Polygon, Base  
✅ **Gestión Centralizada**: Control de múltiples bots desde un panel  
✅ **Estadísticas en Tiempo Real**: Monitoreo de ganancias y operaciones  
✅ **Seguridad**: Stop loss, take profit, límites diarios  
✅ **Almacenamiento**: Exportar/importar configuraciones  

---

## 🏗️ Arquitectura

```
DeFiProtocolsModule
├── Types/
│   └── index.ts (BotConfig, BotType, NetworkType, etc)
├── Services/
│   └── BotManager.ts (Gestor central de bots)
├── Executors/
│   ├── ArbitrageExecutor.ts (Bot de arbitrage)
│   ├── LiquidityExecutor.ts (Bot de liquidez - próximo)
│   ├── YieldExecutor.ts (Bot de yield farming - próximo)
│   └── ... (más ejecutores)
├── Components/
│   └── DeFiProtocolsModule.tsx (UI React)
└── API/
    └── defi-routes.ts (Rutas del backend)
```

---

## 💿 Instalación

### Requisitos
- Node.js 18+
- ethers.js v6
- React 18+
- TypeScript

### Archivos Necesarios

1. **`src/modules/DeFiProtocols/types/index.ts`** - Definiciones de tipos
2. **`src/modules/DeFiProtocols/services/BotManager.ts`** - Gestor de bots
3. **`src/modules/DeFiProtocols/executors/ArbitrageExecutor.ts`** - Ejecutor de arbitrage
4. **`src/components/DeFiProtocolsModule.tsx`** - Componente React

---

## 🚀 Uso Rápido

### 1. Inicializar el Manager

```typescript
import { BotManager } from './services/BotManager';
import { ArbitrageExecutor } from './executors/ArbitrageExecutor';

const manager = new BotManager();
const executor = new ArbitrageExecutor(
  'https://arb1.arbitrum.io/rpc',
  'YOUR_PRIVATE_KEY'
);

manager.registerBotExecutor('arbitrage', executor);
```

### 2. Crear un Bot

```typescript
const botConfig = manager.createBot({
  id: 'bot-arbitrage-01',
  name: 'Arbitrage Bot #1',
  type: 'arbitrage',
  network: 'arbitrum',
  enabled: false,
  status: 'idle',
  capital: 10000,
  maxCapitalPerTrade: 1000,
  minProfitThreshold: 0.5,
  parameters: {
    pairs: [
      {
        tokenIn: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831', // USDC
        tokenOut: '0xfd086bc7cd5c481dcc9c85efe8c1cad8596992c9', // USDT
        dex1: 'uniswap',
        dex2: 'curve'
      }
    ],
    maxSlippage: 1.5,
    minProfit: 0.5
  },
  checkIntervalSeconds: 60,
  stopLoss: 5,
  takeProfit: 10,
  maxDailyLoss: 500
});
```

### 3. Activar el Bot

```typescript
await manager.activateBot('bot-arbitrage-01');
```

### 4. Obtener Estadísticas

```typescript
const stats = manager.getOverallStats();
console.log(`Ganancia total: $${stats.totalProfit.toFixed(2)}`);
console.log(`ROI promedio: ${stats.averageROI.toFixed(2)}%`);
```

---

## 🤖 Crear Nuevos Tipos de Bots

### Estructura de un Ejecutor

```typescript
import { BotConfig, BotExecutionResult } from '../types';
import { BotExecutor } from '../services/BotManager';

export class MyCustomExecutor implements BotExecutor {
  validate(config: BotConfig): boolean {
    // Validar configuración
    return true;
  }

  async execute(config: BotConfig): Promise<BotExecutionResult> {
    try {
      // Implementar lógica del bot
      return {
        success: true,
        trade: { /* trade details */ }
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message
      };
    }
  }
}
```

### Registrar el Nuevo Ejecutor

```typescript
const customExecutor = new MyCustomExecutor();
manager.registerBotExecutor('my-bot-type', customExecutor);
```

---

## 📡 API Backend

### Endpoints

#### GET `/api/defi/bots`
Obtener todos los bots y estadísticas generales
```json
{
  "bots": [...],
  "stats": {
    "totalBots": 5,
    "activeBots": 2,
    "totalProfit": 5000,
    "averageROI": 12.5
  }
}
```

#### POST `/api/defi/bots`
Crear un nuevo bot
```json
{
  "name": "Arbitrage Bot",
  "type": "arbitrage",
  "network": "arbitrum",
  "capital": 10000,
  ...
}
```

#### POST `/api/defi/bots/{botId}/activate`
Activar un bot

#### POST `/api/defi/bots/{botId}/pause`
Pausar un bot

#### GET `/api/defi/bots/{botId}/trades`
Obtener todas las operaciones de un bot

#### GET `/api/defi/bots/{botId}/stats`
Obtener estadísticas de un bot específico

---

## 📚 Ejemplos

### Ejemplo 1: Bot de Arbitrage en Arbitrum

```typescript
const arbitrageBot = manager.createBot({
  name: 'Arbitrage USDC-USDT',
  type: 'arbitrage',
  network: 'arbitrum',
  capital: 10000,
  maxCapitalPerTrade: 500,
  minProfitThreshold: 0.3,
  parameters: {
    pairs: [
      {
        tokenIn: USDC,
        tokenOut: USDT,
        dex1: 'uniswap',
        dex2: 'curve'
      },
      {
        tokenIn: USDC,
        tokenOut: DAI,
        dex1: 'uniswap',
        dex2: 'balancer'
      }
    ],
    maxSlippage: 1.5,
    minProfit: 0.3
  },
  checkIntervalSeconds: 30,
  stopLoss: 2,
  takeProfit: 5,
  maxDailyLoss: 1000
});

await manager.activateBot(arbitrageBot.id);
```

### Ejemplo 2: Múltiples Bots

```typescript
const bots = [
  { name: 'Arbitrage Bot 1', ... },
  { name: 'Arbitrage Bot 2', ... },
  { name: 'Yield Farming Bot', ... },
  { name: 'Liquidity Bot', ... }
];

for (const botConfig of bots) {
  const bot = manager.createBot(botConfig);
  await manager.activateBot(bot.id);
}

// Monitorear todos
setInterval(() => {
  const stats = manager.getOverallStats();
  console.log(`📊 Ganancias: $${stats.totalProfit}`);
}, 60000);
```

### Ejemplo 3: Exportar/Importar Configuración

```typescript
// Exportar
const configJson = manager.exportConfig();
fs.writeFileSync('bots-config.json', configJson);

// Importar en otra instancia
const newManager = new BotManager();
newManager.importConfig(fs.readFileSync('bots-config.json', 'utf8'));
```

---

## 🎨 UI React

El componente `DeFiProtocolsModule.tsx` proporciona:

- **Dashboard**: Estadísticas generales en tiempo real
- **Bot Manager**: Crear, activar, pausar, detener bots
- **Bot Form**: Formulario intuitivo para crear bots
- **Bot Cards**: Visualización de bots con estadísticas
- **Bot Details**: Detalles completos de cada bot

### Integración en la App

```typescript
import DeFiProtocolsModule from './components/DeFiProtocolsModule';

export const App = () => {
  return (
    <div>
      <DeFiProtocolsModule />
    </div>
  );
};
```

---

## 🔄 Próximos Pasos

1. ✅ **Arbitrage Executor** - Implementado
2. ⏭️ **Liquidity Executor** - Próximo bot tipo
3. ⏭️ **Yield Farming Executor** - Bot de farming
4. ⏭️ **Flash Loan Executor** - Bot con flash loans
5. ⏭️ **DEX Aggregator** - Agregación de DEXs
6. ⏭️ **Persistencia de Base de Datos** - MongoDB/PostgreSQL
7. ⏭️ **WebSocket en Tiempo Real** - Actualizaciones live
8. ⏭️ **Alertas y Notificaciones** - Discord/Telegram

---

## 📞 Soporte

Para agregar un nuevo tipo de bot o ejecutor personalizado, sigue la interfaz `BotExecutor` y registra el ejecutor con el `BotManager`.




## 📋 Índice
1. [Introducción](#introducción)
2. [Arquitectura](#arquitectura)
3. [Instalación](#instalación)
4. [Uso Rápido](#uso-rápido)
5. [Crear Bots](#crear-bots)
6. [API](#api)
7. [Ejemplos](#ejemplos)

---

## 🎯 Introducción

El **DeFi Protocols Bot Manager** es un módulo completo para crear, configurar y gestionar múltiples bots autónomos de trading en redes Layer 2 como Arbitrum One.

### Características Principales

✅ **Arquitectura Modular**: Agregar nuevos tipos de bots sin modificar el core  
✅ **Multi-Red**: Soporta Ethereum, Arbitrum, Optimism, Polygon, Base  
✅ **Gestión Centralizada**: Control de múltiples bots desde un panel  
✅ **Estadísticas en Tiempo Real**: Monitoreo de ganancias y operaciones  
✅ **Seguridad**: Stop loss, take profit, límites diarios  
✅ **Almacenamiento**: Exportar/importar configuraciones  

---

## 🏗️ Arquitectura

```
DeFiProtocolsModule
├── Types/
│   └── index.ts (BotConfig, BotType, NetworkType, etc)
├── Services/
│   └── BotManager.ts (Gestor central de bots)
├── Executors/
│   ├── ArbitrageExecutor.ts (Bot de arbitrage)
│   ├── LiquidityExecutor.ts (Bot de liquidez - próximo)
│   ├── YieldExecutor.ts (Bot de yield farming - próximo)
│   └── ... (más ejecutores)
├── Components/
│   └── DeFiProtocolsModule.tsx (UI React)
└── API/
    └── defi-routes.ts (Rutas del backend)
```

---

## 💿 Instalación

### Requisitos
- Node.js 18+
- ethers.js v6
- React 18+
- TypeScript

### Archivos Necesarios

1. **`src/modules/DeFiProtocols/types/index.ts`** - Definiciones de tipos
2. **`src/modules/DeFiProtocols/services/BotManager.ts`** - Gestor de bots
3. **`src/modules/DeFiProtocols/executors/ArbitrageExecutor.ts`** - Ejecutor de arbitrage
4. **`src/components/DeFiProtocolsModule.tsx`** - Componente React

---

## 🚀 Uso Rápido

### 1. Inicializar el Manager

```typescript
import { BotManager } from './services/BotManager';
import { ArbitrageExecutor } from './executors/ArbitrageExecutor';

const manager = new BotManager();
const executor = new ArbitrageExecutor(
  'https://arb1.arbitrum.io/rpc',
  'YOUR_PRIVATE_KEY'
);

manager.registerBotExecutor('arbitrage', executor);
```

### 2. Crear un Bot

```typescript
const botConfig = manager.createBot({
  id: 'bot-arbitrage-01',
  name: 'Arbitrage Bot #1',
  type: 'arbitrage',
  network: 'arbitrum',
  enabled: false,
  status: 'idle',
  capital: 10000,
  maxCapitalPerTrade: 1000,
  minProfitThreshold: 0.5,
  parameters: {
    pairs: [
      {
        tokenIn: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831', // USDC
        tokenOut: '0xfd086bc7cd5c481dcc9c85efe8c1cad8596992c9', // USDT
        dex1: 'uniswap',
        dex2: 'curve'
      }
    ],
    maxSlippage: 1.5,
    minProfit: 0.5
  },
  checkIntervalSeconds: 60,
  stopLoss: 5,
  takeProfit: 10,
  maxDailyLoss: 500
});
```

### 3. Activar el Bot

```typescript
await manager.activateBot('bot-arbitrage-01');
```

### 4. Obtener Estadísticas

```typescript
const stats = manager.getOverallStats();
console.log(`Ganancia total: $${stats.totalProfit.toFixed(2)}`);
console.log(`ROI promedio: ${stats.averageROI.toFixed(2)}%`);
```

---

## 🤖 Crear Nuevos Tipos de Bots

### Estructura de un Ejecutor

```typescript
import { BotConfig, BotExecutionResult } from '../types';
import { BotExecutor } from '../services/BotManager';

export class MyCustomExecutor implements BotExecutor {
  validate(config: BotConfig): boolean {
    // Validar configuración
    return true;
  }

  async execute(config: BotConfig): Promise<BotExecutionResult> {
    try {
      // Implementar lógica del bot
      return {
        success: true,
        trade: { /* trade details */ }
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message
      };
    }
  }
}
```

### Registrar el Nuevo Ejecutor

```typescript
const customExecutor = new MyCustomExecutor();
manager.registerBotExecutor('my-bot-type', customExecutor);
```

---

## 📡 API Backend

### Endpoints

#### GET `/api/defi/bots`
Obtener todos los bots y estadísticas generales
```json
{
  "bots": [...],
  "stats": {
    "totalBots": 5,
    "activeBots": 2,
    "totalProfit": 5000,
    "averageROI": 12.5
  }
}
```

#### POST `/api/defi/bots`
Crear un nuevo bot
```json
{
  "name": "Arbitrage Bot",
  "type": "arbitrage",
  "network": "arbitrum",
  "capital": 10000,
  ...
}
```

#### POST `/api/defi/bots/{botId}/activate`
Activar un bot

#### POST `/api/defi/bots/{botId}/pause`
Pausar un bot

#### GET `/api/defi/bots/{botId}/trades`
Obtener todas las operaciones de un bot

#### GET `/api/defi/bots/{botId}/stats`
Obtener estadísticas de un bot específico

---

## 📚 Ejemplos

### Ejemplo 1: Bot de Arbitrage en Arbitrum

```typescript
const arbitrageBot = manager.createBot({
  name: 'Arbitrage USDC-USDT',
  type: 'arbitrage',
  network: 'arbitrum',
  capital: 10000,
  maxCapitalPerTrade: 500,
  minProfitThreshold: 0.3,
  parameters: {
    pairs: [
      {
        tokenIn: USDC,
        tokenOut: USDT,
        dex1: 'uniswap',
        dex2: 'curve'
      },
      {
        tokenIn: USDC,
        tokenOut: DAI,
        dex1: 'uniswap',
        dex2: 'balancer'
      }
    ],
    maxSlippage: 1.5,
    minProfit: 0.3
  },
  checkIntervalSeconds: 30,
  stopLoss: 2,
  takeProfit: 5,
  maxDailyLoss: 1000
});

await manager.activateBot(arbitrageBot.id);
```

### Ejemplo 2: Múltiples Bots

```typescript
const bots = [
  { name: 'Arbitrage Bot 1', ... },
  { name: 'Arbitrage Bot 2', ... },
  { name: 'Yield Farming Bot', ... },
  { name: 'Liquidity Bot', ... }
];

for (const botConfig of bots) {
  const bot = manager.createBot(botConfig);
  await manager.activateBot(bot.id);
}

// Monitorear todos
setInterval(() => {
  const stats = manager.getOverallStats();
  console.log(`📊 Ganancias: $${stats.totalProfit}`);
}, 60000);
```

### Ejemplo 3: Exportar/Importar Configuración

```typescript
// Exportar
const configJson = manager.exportConfig();
fs.writeFileSync('bots-config.json', configJson);

// Importar en otra instancia
const newManager = new BotManager();
newManager.importConfig(fs.readFileSync('bots-config.json', 'utf8'));
```

---

## 🎨 UI React

El componente `DeFiProtocolsModule.tsx` proporciona:

- **Dashboard**: Estadísticas generales en tiempo real
- **Bot Manager**: Crear, activar, pausar, detener bots
- **Bot Form**: Formulario intuitivo para crear bots
- **Bot Cards**: Visualización de bots con estadísticas
- **Bot Details**: Detalles completos de cada bot

### Integración en la App

```typescript
import DeFiProtocolsModule from './components/DeFiProtocolsModule';

export const App = () => {
  return (
    <div>
      <DeFiProtocolsModule />
    </div>
  );
};
```

---

## 🔄 Próximos Pasos

1. ✅ **Arbitrage Executor** - Implementado
2. ⏭️ **Liquidity Executor** - Próximo bot tipo
3. ⏭️ **Yield Farming Executor** - Bot de farming
4. ⏭️ **Flash Loan Executor** - Bot con flash loans
5. ⏭️ **DEX Aggregator** - Agregación de DEXs
6. ⏭️ **Persistencia de Base de Datos** - MongoDB/PostgreSQL
7. ⏭️ **WebSocket en Tiempo Real** - Actualizaciones live
8. ⏭️ **Alertas y Notificaciones** - Discord/Telegram

---

## 📞 Soporte

Para agregar un nuevo tipo de bot o ejecutor personalizado, sigue la interfaz `BotExecutor` y registra el ejecutor con el `BotManager`.




## 📋 Índice
1. [Introducción](#introducción)
2. [Arquitectura](#arquitectura)
3. [Instalación](#instalación)
4. [Uso Rápido](#uso-rápido)
5. [Crear Bots](#crear-bots)
6. [API](#api)
7. [Ejemplos](#ejemplos)

---

## 🎯 Introducción

El **DeFi Protocols Bot Manager** es un módulo completo para crear, configurar y gestionar múltiples bots autónomos de trading en redes Layer 2 como Arbitrum One.

### Características Principales

✅ **Arquitectura Modular**: Agregar nuevos tipos de bots sin modificar el core  
✅ **Multi-Red**: Soporta Ethereum, Arbitrum, Optimism, Polygon, Base  
✅ **Gestión Centralizada**: Control de múltiples bots desde un panel  
✅ **Estadísticas en Tiempo Real**: Monitoreo de ganancias y operaciones  
✅ **Seguridad**: Stop loss, take profit, límites diarios  
✅ **Almacenamiento**: Exportar/importar configuraciones  

---

## 🏗️ Arquitectura

```
DeFiProtocolsModule
├── Types/
│   └── index.ts (BotConfig, BotType, NetworkType, etc)
├── Services/
│   └── BotManager.ts (Gestor central de bots)
├── Executors/
│   ├── ArbitrageExecutor.ts (Bot de arbitrage)
│   ├── LiquidityExecutor.ts (Bot de liquidez - próximo)
│   ├── YieldExecutor.ts (Bot de yield farming - próximo)
│   └── ... (más ejecutores)
├── Components/
│   └── DeFiProtocolsModule.tsx (UI React)
└── API/
    └── defi-routes.ts (Rutas del backend)
```

---

## 💿 Instalación

### Requisitos
- Node.js 18+
- ethers.js v6
- React 18+
- TypeScript

### Archivos Necesarios

1. **`src/modules/DeFiProtocols/types/index.ts`** - Definiciones de tipos
2. **`src/modules/DeFiProtocols/services/BotManager.ts`** - Gestor de bots
3. **`src/modules/DeFiProtocols/executors/ArbitrageExecutor.ts`** - Ejecutor de arbitrage
4. **`src/components/DeFiProtocolsModule.tsx`** - Componente React

---

## 🚀 Uso Rápido

### 1. Inicializar el Manager

```typescript
import { BotManager } from './services/BotManager';
import { ArbitrageExecutor } from './executors/ArbitrageExecutor';

const manager = new BotManager();
const executor = new ArbitrageExecutor(
  'https://arb1.arbitrum.io/rpc',
  'YOUR_PRIVATE_KEY'
);

manager.registerBotExecutor('arbitrage', executor);
```

### 2. Crear un Bot

```typescript
const botConfig = manager.createBot({
  id: 'bot-arbitrage-01',
  name: 'Arbitrage Bot #1',
  type: 'arbitrage',
  network: 'arbitrum',
  enabled: false,
  status: 'idle',
  capital: 10000,
  maxCapitalPerTrade: 1000,
  minProfitThreshold: 0.5,
  parameters: {
    pairs: [
      {
        tokenIn: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831', // USDC
        tokenOut: '0xfd086bc7cd5c481dcc9c85efe8c1cad8596992c9', // USDT
        dex1: 'uniswap',
        dex2: 'curve'
      }
    ],
    maxSlippage: 1.5,
    minProfit: 0.5
  },
  checkIntervalSeconds: 60,
  stopLoss: 5,
  takeProfit: 10,
  maxDailyLoss: 500
});
```

### 3. Activar el Bot

```typescript
await manager.activateBot('bot-arbitrage-01');
```

### 4. Obtener Estadísticas

```typescript
const stats = manager.getOverallStats();
console.log(`Ganancia total: $${stats.totalProfit.toFixed(2)}`);
console.log(`ROI promedio: ${stats.averageROI.toFixed(2)}%`);
```

---

## 🤖 Crear Nuevos Tipos de Bots

### Estructura de un Ejecutor

```typescript
import { BotConfig, BotExecutionResult } from '../types';
import { BotExecutor } from '../services/BotManager';

export class MyCustomExecutor implements BotExecutor {
  validate(config: BotConfig): boolean {
    // Validar configuración
    return true;
  }

  async execute(config: BotConfig): Promise<BotExecutionResult> {
    try {
      // Implementar lógica del bot
      return {
        success: true,
        trade: { /* trade details */ }
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message
      };
    }
  }
}
```

### Registrar el Nuevo Ejecutor

```typescript
const customExecutor = new MyCustomExecutor();
manager.registerBotExecutor('my-bot-type', customExecutor);
```

---

## 📡 API Backend

### Endpoints

#### GET `/api/defi/bots`
Obtener todos los bots y estadísticas generales
```json
{
  "bots": [...],
  "stats": {
    "totalBots": 5,
    "activeBots": 2,
    "totalProfit": 5000,
    "averageROI": 12.5
  }
}
```

#### POST `/api/defi/bots`
Crear un nuevo bot
```json
{
  "name": "Arbitrage Bot",
  "type": "arbitrage",
  "network": "arbitrum",
  "capital": 10000,
  ...
}
```

#### POST `/api/defi/bots/{botId}/activate`
Activar un bot

#### POST `/api/defi/bots/{botId}/pause`
Pausar un bot

#### GET `/api/defi/bots/{botId}/trades`
Obtener todas las operaciones de un bot

#### GET `/api/defi/bots/{botId}/stats`
Obtener estadísticas de un bot específico

---

## 📚 Ejemplos

### Ejemplo 1: Bot de Arbitrage en Arbitrum

```typescript
const arbitrageBot = manager.createBot({
  name: 'Arbitrage USDC-USDT',
  type: 'arbitrage',
  network: 'arbitrum',
  capital: 10000,
  maxCapitalPerTrade: 500,
  minProfitThreshold: 0.3,
  parameters: {
    pairs: [
      {
        tokenIn: USDC,
        tokenOut: USDT,
        dex1: 'uniswap',
        dex2: 'curve'
      },
      {
        tokenIn: USDC,
        tokenOut: DAI,
        dex1: 'uniswap',
        dex2: 'balancer'
      }
    ],
    maxSlippage: 1.5,
    minProfit: 0.3
  },
  checkIntervalSeconds: 30,
  stopLoss: 2,
  takeProfit: 5,
  maxDailyLoss: 1000
});

await manager.activateBot(arbitrageBot.id);
```

### Ejemplo 2: Múltiples Bots

```typescript
const bots = [
  { name: 'Arbitrage Bot 1', ... },
  { name: 'Arbitrage Bot 2', ... },
  { name: 'Yield Farming Bot', ... },
  { name: 'Liquidity Bot', ... }
];

for (const botConfig of bots) {
  const bot = manager.createBot(botConfig);
  await manager.activateBot(bot.id);
}

// Monitorear todos
setInterval(() => {
  const stats = manager.getOverallStats();
  console.log(`📊 Ganancias: $${stats.totalProfit}`);
}, 60000);
```

### Ejemplo 3: Exportar/Importar Configuración

```typescript
// Exportar
const configJson = manager.exportConfig();
fs.writeFileSync('bots-config.json', configJson);

// Importar en otra instancia
const newManager = new BotManager();
newManager.importConfig(fs.readFileSync('bots-config.json', 'utf8'));
```

---

## 🎨 UI React

El componente `DeFiProtocolsModule.tsx` proporciona:

- **Dashboard**: Estadísticas generales en tiempo real
- **Bot Manager**: Crear, activar, pausar, detener bots
- **Bot Form**: Formulario intuitivo para crear bots
- **Bot Cards**: Visualización de bots con estadísticas
- **Bot Details**: Detalles completos de cada bot

### Integración en la App

```typescript
import DeFiProtocolsModule from './components/DeFiProtocolsModule';

export const App = () => {
  return (
    <div>
      <DeFiProtocolsModule />
    </div>
  );
};
```

---

## 🔄 Próximos Pasos

1. ✅ **Arbitrage Executor** - Implementado
2. ⏭️ **Liquidity Executor** - Próximo bot tipo
3. ⏭️ **Yield Farming Executor** - Bot de farming
4. ⏭️ **Flash Loan Executor** - Bot con flash loans
5. ⏭️ **DEX Aggregator** - Agregación de DEXs
6. ⏭️ **Persistencia de Base de Datos** - MongoDB/PostgreSQL
7. ⏭️ **WebSocket en Tiempo Real** - Actualizaciones live
8. ⏭️ **Alertas y Notificaciones** - Discord/Telegram

---

## 📞 Soporte

Para agregar un nuevo tipo de bot o ejecutor personalizado, sigue la interfaz `BotExecutor` y registra el ejecutor con el `BotManager`.




## 📋 Índice
1. [Introducción](#introducción)
2. [Arquitectura](#arquitectura)
3. [Instalación](#instalación)
4. [Uso Rápido](#uso-rápido)
5. [Crear Bots](#crear-bots)
6. [API](#api)
7. [Ejemplos](#ejemplos)

---

## 🎯 Introducción

El **DeFi Protocols Bot Manager** es un módulo completo para crear, configurar y gestionar múltiples bots autónomos de trading en redes Layer 2 como Arbitrum One.

### Características Principales

✅ **Arquitectura Modular**: Agregar nuevos tipos de bots sin modificar el core  
✅ **Multi-Red**: Soporta Ethereum, Arbitrum, Optimism, Polygon, Base  
✅ **Gestión Centralizada**: Control de múltiples bots desde un panel  
✅ **Estadísticas en Tiempo Real**: Monitoreo de ganancias y operaciones  
✅ **Seguridad**: Stop loss, take profit, límites diarios  
✅ **Almacenamiento**: Exportar/importar configuraciones  

---

## 🏗️ Arquitectura

```
DeFiProtocolsModule
├── Types/
│   └── index.ts (BotConfig, BotType, NetworkType, etc)
├── Services/
│   └── BotManager.ts (Gestor central de bots)
├── Executors/
│   ├── ArbitrageExecutor.ts (Bot de arbitrage)
│   ├── LiquidityExecutor.ts (Bot de liquidez - próximo)
│   ├── YieldExecutor.ts (Bot de yield farming - próximo)
│   └── ... (más ejecutores)
├── Components/
│   └── DeFiProtocolsModule.tsx (UI React)
└── API/
    └── defi-routes.ts (Rutas del backend)
```

---

## 💿 Instalación

### Requisitos
- Node.js 18+
- ethers.js v6
- React 18+
- TypeScript

### Archivos Necesarios

1. **`src/modules/DeFiProtocols/types/index.ts`** - Definiciones de tipos
2. **`src/modules/DeFiProtocols/services/BotManager.ts`** - Gestor de bots
3. **`src/modules/DeFiProtocols/executors/ArbitrageExecutor.ts`** - Ejecutor de arbitrage
4. **`src/components/DeFiProtocolsModule.tsx`** - Componente React

---

## 🚀 Uso Rápido

### 1. Inicializar el Manager

```typescript
import { BotManager } from './services/BotManager';
import { ArbitrageExecutor } from './executors/ArbitrageExecutor';

const manager = new BotManager();
const executor = new ArbitrageExecutor(
  'https://arb1.arbitrum.io/rpc',
  'YOUR_PRIVATE_KEY'
);

manager.registerBotExecutor('arbitrage', executor);
```

### 2. Crear un Bot

```typescript
const botConfig = manager.createBot({
  id: 'bot-arbitrage-01',
  name: 'Arbitrage Bot #1',
  type: 'arbitrage',
  network: 'arbitrum',
  enabled: false,
  status: 'idle',
  capital: 10000,
  maxCapitalPerTrade: 1000,
  minProfitThreshold: 0.5,
  parameters: {
    pairs: [
      {
        tokenIn: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831', // USDC
        tokenOut: '0xfd086bc7cd5c481dcc9c85efe8c1cad8596992c9', // USDT
        dex1: 'uniswap',
        dex2: 'curve'
      }
    ],
    maxSlippage: 1.5,
    minProfit: 0.5
  },
  checkIntervalSeconds: 60,
  stopLoss: 5,
  takeProfit: 10,
  maxDailyLoss: 500
});
```

### 3. Activar el Bot

```typescript
await manager.activateBot('bot-arbitrage-01');
```

### 4. Obtener Estadísticas

```typescript
const stats = manager.getOverallStats();
console.log(`Ganancia total: $${stats.totalProfit.toFixed(2)}`);
console.log(`ROI promedio: ${stats.averageROI.toFixed(2)}%`);
```

---

## 🤖 Crear Nuevos Tipos de Bots

### Estructura de un Ejecutor

```typescript
import { BotConfig, BotExecutionResult } from '../types';
import { BotExecutor } from '../services/BotManager';

export class MyCustomExecutor implements BotExecutor {
  validate(config: BotConfig): boolean {
    // Validar configuración
    return true;
  }

  async execute(config: BotConfig): Promise<BotExecutionResult> {
    try {
      // Implementar lógica del bot
      return {
        success: true,
        trade: { /* trade details */ }
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message
      };
    }
  }
}
```

### Registrar el Nuevo Ejecutor

```typescript
const customExecutor = new MyCustomExecutor();
manager.registerBotExecutor('my-bot-type', customExecutor);
```

---

## 📡 API Backend

### Endpoints

#### GET `/api/defi/bots`
Obtener todos los bots y estadísticas generales
```json
{
  "bots": [...],
  "stats": {
    "totalBots": 5,
    "activeBots": 2,
    "totalProfit": 5000,
    "averageROI": 12.5
  }
}
```

#### POST `/api/defi/bots`
Crear un nuevo bot
```json
{
  "name": "Arbitrage Bot",
  "type": "arbitrage",
  "network": "arbitrum",
  "capital": 10000,
  ...
}
```

#### POST `/api/defi/bots/{botId}/activate`
Activar un bot

#### POST `/api/defi/bots/{botId}/pause`
Pausar un bot

#### GET `/api/defi/bots/{botId}/trades`
Obtener todas las operaciones de un bot

#### GET `/api/defi/bots/{botId}/stats`
Obtener estadísticas de un bot específico

---

## 📚 Ejemplos

### Ejemplo 1: Bot de Arbitrage en Arbitrum

```typescript
const arbitrageBot = manager.createBot({
  name: 'Arbitrage USDC-USDT',
  type: 'arbitrage',
  network: 'arbitrum',
  capital: 10000,
  maxCapitalPerTrade: 500,
  minProfitThreshold: 0.3,
  parameters: {
    pairs: [
      {
        tokenIn: USDC,
        tokenOut: USDT,
        dex1: 'uniswap',
        dex2: 'curve'
      },
      {
        tokenIn: USDC,
        tokenOut: DAI,
        dex1: 'uniswap',
        dex2: 'balancer'
      }
    ],
    maxSlippage: 1.5,
    minProfit: 0.3
  },
  checkIntervalSeconds: 30,
  stopLoss: 2,
  takeProfit: 5,
  maxDailyLoss: 1000
});

await manager.activateBot(arbitrageBot.id);
```

### Ejemplo 2: Múltiples Bots

```typescript
const bots = [
  { name: 'Arbitrage Bot 1', ... },
  { name: 'Arbitrage Bot 2', ... },
  { name: 'Yield Farming Bot', ... },
  { name: 'Liquidity Bot', ... }
];

for (const botConfig of bots) {
  const bot = manager.createBot(botConfig);
  await manager.activateBot(bot.id);
}

// Monitorear todos
setInterval(() => {
  const stats = manager.getOverallStats();
  console.log(`📊 Ganancias: $${stats.totalProfit}`);
}, 60000);
```

### Ejemplo 3: Exportar/Importar Configuración

```typescript
// Exportar
const configJson = manager.exportConfig();
fs.writeFileSync('bots-config.json', configJson);

// Importar en otra instancia
const newManager = new BotManager();
newManager.importConfig(fs.readFileSync('bots-config.json', 'utf8'));
```

---

## 🎨 UI React

El componente `DeFiProtocolsModule.tsx` proporciona:

- **Dashboard**: Estadísticas generales en tiempo real
- **Bot Manager**: Crear, activar, pausar, detener bots
- **Bot Form**: Formulario intuitivo para crear bots
- **Bot Cards**: Visualización de bots con estadísticas
- **Bot Details**: Detalles completos de cada bot

### Integración en la App

```typescript
import DeFiProtocolsModule from './components/DeFiProtocolsModule';

export const App = () => {
  return (
    <div>
      <DeFiProtocolsModule />
    </div>
  );
};
```

---

## 🔄 Próximos Pasos

1. ✅ **Arbitrage Executor** - Implementado
2. ⏭️ **Liquidity Executor** - Próximo bot tipo
3. ⏭️ **Yield Farming Executor** - Bot de farming
4. ⏭️ **Flash Loan Executor** - Bot con flash loans
5. ⏭️ **DEX Aggregator** - Agregación de DEXs
6. ⏭️ **Persistencia de Base de Datos** - MongoDB/PostgreSQL
7. ⏭️ **WebSocket en Tiempo Real** - Actualizaciones live
8. ⏭️ **Alertas y Notificaciones** - Discord/Telegram

---

## 📞 Soporte

Para agregar un nuevo tipo de bot o ejecutor personalizado, sigue la interfaz `BotExecutor` y registra el ejecutor con el `BotManager`.




## 📋 Índice
1. [Introducción](#introducción)
2. [Arquitectura](#arquitectura)
3. [Instalación](#instalación)
4. [Uso Rápido](#uso-rápido)
5. [Crear Bots](#crear-bots)
6. [API](#api)
7. [Ejemplos](#ejemplos)

---

## 🎯 Introducción

El **DeFi Protocols Bot Manager** es un módulo completo para crear, configurar y gestionar múltiples bots autónomos de trading en redes Layer 2 como Arbitrum One.

### Características Principales

✅ **Arquitectura Modular**: Agregar nuevos tipos de bots sin modificar el core  
✅ **Multi-Red**: Soporta Ethereum, Arbitrum, Optimism, Polygon, Base  
✅ **Gestión Centralizada**: Control de múltiples bots desde un panel  
✅ **Estadísticas en Tiempo Real**: Monitoreo de ganancias y operaciones  
✅ **Seguridad**: Stop loss, take profit, límites diarios  
✅ **Almacenamiento**: Exportar/importar configuraciones  

---

## 🏗️ Arquitectura

```
DeFiProtocolsModule
├── Types/
│   └── index.ts (BotConfig, BotType, NetworkType, etc)
├── Services/
│   └── BotManager.ts (Gestor central de bots)
├── Executors/
│   ├── ArbitrageExecutor.ts (Bot de arbitrage)
│   ├── LiquidityExecutor.ts (Bot de liquidez - próximo)
│   ├── YieldExecutor.ts (Bot de yield farming - próximo)
│   └── ... (más ejecutores)
├── Components/
│   └── DeFiProtocolsModule.tsx (UI React)
└── API/
    └── defi-routes.ts (Rutas del backend)
```

---

## 💿 Instalación

### Requisitos
- Node.js 18+
- ethers.js v6
- React 18+
- TypeScript

### Archivos Necesarios

1. **`src/modules/DeFiProtocols/types/index.ts`** - Definiciones de tipos
2. **`src/modules/DeFiProtocols/services/BotManager.ts`** - Gestor de bots
3. **`src/modules/DeFiProtocols/executors/ArbitrageExecutor.ts`** - Ejecutor de arbitrage
4. **`src/components/DeFiProtocolsModule.tsx`** - Componente React

---

## 🚀 Uso Rápido

### 1. Inicializar el Manager

```typescript
import { BotManager } from './services/BotManager';
import { ArbitrageExecutor } from './executors/ArbitrageExecutor';

const manager = new BotManager();
const executor = new ArbitrageExecutor(
  'https://arb1.arbitrum.io/rpc',
  'YOUR_PRIVATE_KEY'
);

manager.registerBotExecutor('arbitrage', executor);
```

### 2. Crear un Bot

```typescript
const botConfig = manager.createBot({
  id: 'bot-arbitrage-01',
  name: 'Arbitrage Bot #1',
  type: 'arbitrage',
  network: 'arbitrum',
  enabled: false,
  status: 'idle',
  capital: 10000,
  maxCapitalPerTrade: 1000,
  minProfitThreshold: 0.5,
  parameters: {
    pairs: [
      {
        tokenIn: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831', // USDC
        tokenOut: '0xfd086bc7cd5c481dcc9c85efe8c1cad8596992c9', // USDT
        dex1: 'uniswap',
        dex2: 'curve'
      }
    ],
    maxSlippage: 1.5,
    minProfit: 0.5
  },
  checkIntervalSeconds: 60,
  stopLoss: 5,
  takeProfit: 10,
  maxDailyLoss: 500
});
```

### 3. Activar el Bot

```typescript
await manager.activateBot('bot-arbitrage-01');
```

### 4. Obtener Estadísticas

```typescript
const stats = manager.getOverallStats();
console.log(`Ganancia total: $${stats.totalProfit.toFixed(2)}`);
console.log(`ROI promedio: ${stats.averageROI.toFixed(2)}%`);
```

---

## 🤖 Crear Nuevos Tipos de Bots

### Estructura de un Ejecutor

```typescript
import { BotConfig, BotExecutionResult } from '../types';
import { BotExecutor } from '../services/BotManager';

export class MyCustomExecutor implements BotExecutor {
  validate(config: BotConfig): boolean {
    // Validar configuración
    return true;
  }

  async execute(config: BotConfig): Promise<BotExecutionResult> {
    try {
      // Implementar lógica del bot
      return {
        success: true,
        trade: { /* trade details */ }
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message
      };
    }
  }
}
```

### Registrar el Nuevo Ejecutor

```typescript
const customExecutor = new MyCustomExecutor();
manager.registerBotExecutor('my-bot-type', customExecutor);
```

---

## 📡 API Backend

### Endpoints

#### GET `/api/defi/bots`
Obtener todos los bots y estadísticas generales
```json
{
  "bots": [...],
  "stats": {
    "totalBots": 5,
    "activeBots": 2,
    "totalProfit": 5000,
    "averageROI": 12.5
  }
}
```

#### POST `/api/defi/bots`
Crear un nuevo bot
```json
{
  "name": "Arbitrage Bot",
  "type": "arbitrage",
  "network": "arbitrum",
  "capital": 10000,
  ...
}
```

#### POST `/api/defi/bots/{botId}/activate`
Activar un bot

#### POST `/api/defi/bots/{botId}/pause`
Pausar un bot

#### GET `/api/defi/bots/{botId}/trades`
Obtener todas las operaciones de un bot

#### GET `/api/defi/bots/{botId}/stats`
Obtener estadísticas de un bot específico

---

## 📚 Ejemplos

### Ejemplo 1: Bot de Arbitrage en Arbitrum

```typescript
const arbitrageBot = manager.createBot({
  name: 'Arbitrage USDC-USDT',
  type: 'arbitrage',
  network: 'arbitrum',
  capital: 10000,
  maxCapitalPerTrade: 500,
  minProfitThreshold: 0.3,
  parameters: {
    pairs: [
      {
        tokenIn: USDC,
        tokenOut: USDT,
        dex1: 'uniswap',
        dex2: 'curve'
      },
      {
        tokenIn: USDC,
        tokenOut: DAI,
        dex1: 'uniswap',
        dex2: 'balancer'
      }
    ],
    maxSlippage: 1.5,
    minProfit: 0.3
  },
  checkIntervalSeconds: 30,
  stopLoss: 2,
  takeProfit: 5,
  maxDailyLoss: 1000
});

await manager.activateBot(arbitrageBot.id);
```

### Ejemplo 2: Múltiples Bots

```typescript
const bots = [
  { name: 'Arbitrage Bot 1', ... },
  { name: 'Arbitrage Bot 2', ... },
  { name: 'Yield Farming Bot', ... },
  { name: 'Liquidity Bot', ... }
];

for (const botConfig of bots) {
  const bot = manager.createBot(botConfig);
  await manager.activateBot(bot.id);
}

// Monitorear todos
setInterval(() => {
  const stats = manager.getOverallStats();
  console.log(`📊 Ganancias: $${stats.totalProfit}`);
}, 60000);
```

### Ejemplo 3: Exportar/Importar Configuración

```typescript
// Exportar
const configJson = manager.exportConfig();
fs.writeFileSync('bots-config.json', configJson);

// Importar en otra instancia
const newManager = new BotManager();
newManager.importConfig(fs.readFileSync('bots-config.json', 'utf8'));
```

---

## 🎨 UI React

El componente `DeFiProtocolsModule.tsx` proporciona:

- **Dashboard**: Estadísticas generales en tiempo real
- **Bot Manager**: Crear, activar, pausar, detener bots
- **Bot Form**: Formulario intuitivo para crear bots
- **Bot Cards**: Visualización de bots con estadísticas
- **Bot Details**: Detalles completos de cada bot

### Integración en la App

```typescript
import DeFiProtocolsModule from './components/DeFiProtocolsModule';

export const App = () => {
  return (
    <div>
      <DeFiProtocolsModule />
    </div>
  );
};
```

---

## 🔄 Próximos Pasos

1. ✅ **Arbitrage Executor** - Implementado
2. ⏭️ **Liquidity Executor** - Próximo bot tipo
3. ⏭️ **Yield Farming Executor** - Bot de farming
4. ⏭️ **Flash Loan Executor** - Bot con flash loans
5. ⏭️ **DEX Aggregator** - Agregación de DEXs
6. ⏭️ **Persistencia de Base de Datos** - MongoDB/PostgreSQL
7. ⏭️ **WebSocket en Tiempo Real** - Actualizaciones live
8. ⏭️ **Alertas y Notificaciones** - Discord/Telegram

---

## 📞 Soporte

Para agregar un nuevo tipo de bot o ejecutor personalizado, sigue la interfaz `BotExecutor` y registra el ejecutor con el `BotManager`.




## 📋 Índice
1. [Introducción](#introducción)
2. [Arquitectura](#arquitectura)
3. [Instalación](#instalación)
4. [Uso Rápido](#uso-rápido)
5. [Crear Bots](#crear-bots)
6. [API](#api)
7. [Ejemplos](#ejemplos)

---

## 🎯 Introducción

El **DeFi Protocols Bot Manager** es un módulo completo para crear, configurar y gestionar múltiples bots autónomos de trading en redes Layer 2 como Arbitrum One.

### Características Principales

✅ **Arquitectura Modular**: Agregar nuevos tipos de bots sin modificar el core  
✅ **Multi-Red**: Soporta Ethereum, Arbitrum, Optimism, Polygon, Base  
✅ **Gestión Centralizada**: Control de múltiples bots desde un panel  
✅ **Estadísticas en Tiempo Real**: Monitoreo de ganancias y operaciones  
✅ **Seguridad**: Stop loss, take profit, límites diarios  
✅ **Almacenamiento**: Exportar/importar configuraciones  

---

## 🏗️ Arquitectura

```
DeFiProtocolsModule
├── Types/
│   └── index.ts (BotConfig, BotType, NetworkType, etc)
├── Services/
│   └── BotManager.ts (Gestor central de bots)
├── Executors/
│   ├── ArbitrageExecutor.ts (Bot de arbitrage)
│   ├── LiquidityExecutor.ts (Bot de liquidez - próximo)
│   ├── YieldExecutor.ts (Bot de yield farming - próximo)
│   └── ... (más ejecutores)
├── Components/
│   └── DeFiProtocolsModule.tsx (UI React)
└── API/
    └── defi-routes.ts (Rutas del backend)
```

---

## 💿 Instalación

### Requisitos
- Node.js 18+
- ethers.js v6
- React 18+
- TypeScript

### Archivos Necesarios

1. **`src/modules/DeFiProtocols/types/index.ts`** - Definiciones de tipos
2. **`src/modules/DeFiProtocols/services/BotManager.ts`** - Gestor de bots
3. **`src/modules/DeFiProtocols/executors/ArbitrageExecutor.ts`** - Ejecutor de arbitrage
4. **`src/components/DeFiProtocolsModule.tsx`** - Componente React

---

## 🚀 Uso Rápido

### 1. Inicializar el Manager

```typescript
import { BotManager } from './services/BotManager';
import { ArbitrageExecutor } from './executors/ArbitrageExecutor';

const manager = new BotManager();
const executor = new ArbitrageExecutor(
  'https://arb1.arbitrum.io/rpc',
  'YOUR_PRIVATE_KEY'
);

manager.registerBotExecutor('arbitrage', executor);
```

### 2. Crear un Bot

```typescript
const botConfig = manager.createBot({
  id: 'bot-arbitrage-01',
  name: 'Arbitrage Bot #1',
  type: 'arbitrage',
  network: 'arbitrum',
  enabled: false,
  status: 'idle',
  capital: 10000,
  maxCapitalPerTrade: 1000,
  minProfitThreshold: 0.5,
  parameters: {
    pairs: [
      {
        tokenIn: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831', // USDC
        tokenOut: '0xfd086bc7cd5c481dcc9c85efe8c1cad8596992c9', // USDT
        dex1: 'uniswap',
        dex2: 'curve'
      }
    ],
    maxSlippage: 1.5,
    minProfit: 0.5
  },
  checkIntervalSeconds: 60,
  stopLoss: 5,
  takeProfit: 10,
  maxDailyLoss: 500
});
```

### 3. Activar el Bot

```typescript
await manager.activateBot('bot-arbitrage-01');
```

### 4. Obtener Estadísticas

```typescript
const stats = manager.getOverallStats();
console.log(`Ganancia total: $${stats.totalProfit.toFixed(2)}`);
console.log(`ROI promedio: ${stats.averageROI.toFixed(2)}%`);
```

---

## 🤖 Crear Nuevos Tipos de Bots

### Estructura de un Ejecutor

```typescript
import { BotConfig, BotExecutionResult } from '../types';
import { BotExecutor } from '../services/BotManager';

export class MyCustomExecutor implements BotExecutor {
  validate(config: BotConfig): boolean {
    // Validar configuración
    return true;
  }

  async execute(config: BotConfig): Promise<BotExecutionResult> {
    try {
      // Implementar lógica del bot
      return {
        success: true,
        trade: { /* trade details */ }
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message
      };
    }
  }
}
```

### Registrar el Nuevo Ejecutor

```typescript
const customExecutor = new MyCustomExecutor();
manager.registerBotExecutor('my-bot-type', customExecutor);
```

---

## 📡 API Backend

### Endpoints

#### GET `/api/defi/bots`
Obtener todos los bots y estadísticas generales
```json
{
  "bots": [...],
  "stats": {
    "totalBots": 5,
    "activeBots": 2,
    "totalProfit": 5000,
    "averageROI": 12.5
  }
}
```

#### POST `/api/defi/bots`
Crear un nuevo bot
```json
{
  "name": "Arbitrage Bot",
  "type": "arbitrage",
  "network": "arbitrum",
  "capital": 10000,
  ...
}
```

#### POST `/api/defi/bots/{botId}/activate`
Activar un bot

#### POST `/api/defi/bots/{botId}/pause`
Pausar un bot

#### GET `/api/defi/bots/{botId}/trades`
Obtener todas las operaciones de un bot

#### GET `/api/defi/bots/{botId}/stats`
Obtener estadísticas de un bot específico

---

## 📚 Ejemplos

### Ejemplo 1: Bot de Arbitrage en Arbitrum

```typescript
const arbitrageBot = manager.createBot({
  name: 'Arbitrage USDC-USDT',
  type: 'arbitrage',
  network: 'arbitrum',
  capital: 10000,
  maxCapitalPerTrade: 500,
  minProfitThreshold: 0.3,
  parameters: {
    pairs: [
      {
        tokenIn: USDC,
        tokenOut: USDT,
        dex1: 'uniswap',
        dex2: 'curve'
      },
      {
        tokenIn: USDC,
        tokenOut: DAI,
        dex1: 'uniswap',
        dex2: 'balancer'
      }
    ],
    maxSlippage: 1.5,
    minProfit: 0.3
  },
  checkIntervalSeconds: 30,
  stopLoss: 2,
  takeProfit: 5,
  maxDailyLoss: 1000
});

await manager.activateBot(arbitrageBot.id);
```

### Ejemplo 2: Múltiples Bots

```typescript
const bots = [
  { name: 'Arbitrage Bot 1', ... },
  { name: 'Arbitrage Bot 2', ... },
  { name: 'Yield Farming Bot', ... },
  { name: 'Liquidity Bot', ... }
];

for (const botConfig of bots) {
  const bot = manager.createBot(botConfig);
  await manager.activateBot(bot.id);
}

// Monitorear todos
setInterval(() => {
  const stats = manager.getOverallStats();
  console.log(`📊 Ganancias: $${stats.totalProfit}`);
}, 60000);
```

### Ejemplo 3: Exportar/Importar Configuración

```typescript
// Exportar
const configJson = manager.exportConfig();
fs.writeFileSync('bots-config.json', configJson);

// Importar en otra instancia
const newManager = new BotManager();
newManager.importConfig(fs.readFileSync('bots-config.json', 'utf8'));
```

---

## 🎨 UI React

El componente `DeFiProtocolsModule.tsx` proporciona:

- **Dashboard**: Estadísticas generales en tiempo real
- **Bot Manager**: Crear, activar, pausar, detener bots
- **Bot Form**: Formulario intuitivo para crear bots
- **Bot Cards**: Visualización de bots con estadísticas
- **Bot Details**: Detalles completos de cada bot

### Integración en la App

```typescript
import DeFiProtocolsModule from './components/DeFiProtocolsModule';

export const App = () => {
  return (
    <div>
      <DeFiProtocolsModule />
    </div>
  );
};
```

---

## 🔄 Próximos Pasos

1. ✅ **Arbitrage Executor** - Implementado
2. ⏭️ **Liquidity Executor** - Próximo bot tipo
3. ⏭️ **Yield Farming Executor** - Bot de farming
4. ⏭️ **Flash Loan Executor** - Bot con flash loans
5. ⏭️ **DEX Aggregator** - Agregación de DEXs
6. ⏭️ **Persistencia de Base de Datos** - MongoDB/PostgreSQL
7. ⏭️ **WebSocket en Tiempo Real** - Actualizaciones live
8. ⏭️ **Alertas y Notificaciones** - Discord/Telegram

---

## 📞 Soporte

Para agregar un nuevo tipo de bot o ejecutor personalizado, sigue la interfaz `BotExecutor` y registra el ejecutor con el `BotManager`.






