/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * BOT ARBITRAJE API - SERVIDOR SIMPLE Y FUNCIONAL
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import express from 'express';
import cors from 'cors';

const app = express();
const PORT = 3100;

app.use(cors());
app.use(express.json());

// ═══════════════════════════════════════════════════════════════════════════════
// ESTADO DEL BOT
// ═══════════════════════════════════════════════════════════════════════════════

const state = {
  isRunning: false,
  isDryRun: true,
  startTime: null,
  stats: {
    totalTicks: 0,
    totalTrades: 0,
    successfulTrades: 0,
    totalProfitUsd: 0,
    totalGasUsd: 0,
    netProfitUsd: 0,
    winRate: 0,
    uptime: 0,
    currentChain: 'base'
  },
  chains: [
    { chain: 'base', name: 'Base', chainId: 8453, balance: '0.033309', balanceUsd: 116.58, routes: 5, isActive: true, lastTick: Date.now(), explorer: 'https://basescan.org' },
    { chain: 'arbitrum', name: 'Arbitrum', chainId: 42161, balance: '0.027770', balanceUsd: 97.20, routes: 6, isActive: true, lastTick: Date.now(), explorer: 'https://arbiscan.io' },
    { chain: 'optimism', name: 'Optimism', chainId: 10, balance: '0.023800', balanceUsd: 83.30, routes: 5, isActive: true, lastTick: Date.now(), explorer: 'https://optimistic.etherscan.io' }
  ],
  tradeLogs: [],
  opportunities: [],
  banditStates: [
    { chain: 'base', alpha: 2, beta: 2, winRate: 50, selected: true },
    { chain: 'arbitrum', alpha: 2, beta: 2, winRate: 50, selected: false },
    { chain: 'optimism', alpha: 2, beta: 2, winRate: 50, selected: false }
  ]
};

let timer = null;

// ═══════════════════════════════════════════════════════════════════════════════
// SIMULADOR DE ACTIVIDAD
// ═══════════════════════════════════════════════════════════════════════════════

function tick() {
  if (!state.isRunning) return;

  // Uptime
  state.stats.uptime = Math.floor((Date.now() - state.startTime) / 1000);
  state.stats.totalTicks++;

  // Simular oportunidad
  if (Math.random() > 0.7) {
    state.opportunities.unshift({
      chain: ['base', 'arbitrum', 'optimism'][Math.floor(Math.random() * 3)],
      route: 'WETH-USDC-WETH',
      spreadBps: (Math.random() * 50).toFixed(2),
      potentialProfit: (Math.random() * 5).toFixed(4),
      gasCost: (Math.random() * 0.5).toFixed(4),
      netProfit: (Math.random() * 4).toFixed(4),
      timestamp: Date.now()
    });
    if (state.opportunities.length > 10) state.opportunities.pop();
  }

  // Simular trade
  if (Math.random() > 0.85) {
    const profit = Math.random() * 2;
    const success = Math.random() > 0.2;
    
    state.tradeLogs.unshift({
      id: `tx-${Date.now()}`,
      timestamp: Date.now(),
      chain: ['base', 'arbitrum', 'optimism'][Math.floor(Math.random() * 3)],
      route: 'WETH-USDC-WETH',
      amountIn: (Math.random() * 0.05).toFixed(4),
      amountOut: (Math.random() * 0.055).toFixed(4),
      profit: profit.toFixed(4),
      gasCost: (Math.random() * 0.001).toFixed(5),
      netProfit: profit.toFixed(4),
      txHash: `0x${Math.random().toString(16).slice(2)}`,
      status: success ? 'success' : 'failed'
    });

    state.stats.totalTrades++;
    if (success) state.stats.successfulTrades++;
    state.stats.totalProfitUsd += profit;
    state.stats.netProfitUsd = state.stats.totalProfitUsd * 0.9;
    state.stats.winRate = state.stats.totalTrades > 0 
      ? ((state.stats.successfulTrades / state.stats.totalTrades) * 100)
      : 0;

    if (state.tradeLogs.length > 50) state.tradeLogs.pop();
  }

  // Cambiar chain
  if (Math.random() > 0.9) {
    const chains = ['base', 'arbitrum', 'optimism'];
    state.stats.currentChain = chains[Math.floor(Math.random() * 3)];
    state.banditStates = state.banditStates.map(b => ({
      ...b,
      selected: b.chain === state.stats.currentChain,
      alpha: b.alpha + (Math.random() > 0.5 ? 0.1 : 0),
      winRate: ((b.alpha / (b.alpha + b.beta)) * 100)
    }));
  }

  // Actualizar chains
  state.chains = state.chains.map(c => ({
    ...c,
    lastTick: Date.now(),
    routes: Math.floor(Math.random() * 10) + 3
  }));
}

// ═══════════════════════════════════════════════════════════════════════════════
// RUTAS API
// ═══════════════════════════════════════════════════════════════════════════════

// GET status
app.get('/api/defi/multichain-arb/status', (req, res) => {
  console.log(`[API] GET /status - running: ${state.isRunning}, ticks: ${state.stats.totalTicks}`);
  res.json(state);
});

// POST start
app.post('/api/defi/multichain-arb/start', (req, res) => {
  console.log('[API] POST /start');
  
  if (state.isRunning) {
    return res.json({ success: false, error: 'Ya está corriendo', isRunning: true });
  }

  state.isRunning = true;
  state.isDryRun = req.body?.dryRun !== false;
  state.startTime = Date.now();
  state.stats.totalTicks = 0;
  state.stats.totalTrades = 0;
  state.stats.successfulTrades = 0;
  state.stats.totalProfitUsd = 0;
  state.stats.netProfitUsd = 0;
  state.stats.winRate = 0;
  state.stats.uptime = 0;

  if (timer) clearInterval(timer);
  timer = setInterval(tick, 500);

  console.log('[API] ✅ Bot iniciado');
  res.json({ success: true, isRunning: true, isDryRun: state.isDryRun });
});

// POST stop
app.post('/api/defi/multichain-arb/stop', (req, res) => {
  console.log('[API] POST /stop');
  
  state.isRunning = false;
  if (timer) {
    clearInterval(timer);
    timer = null;
  }

  console.log('[API] ✅ Bot detenido');
  res.json({ success: true, isRunning: false });
});

// POST reset
app.post('/api/defi/multichain-arb/reset', (req, res) => {
  console.log('[API] POST /reset');
  
  state.stats = {
    totalTicks: 0,
    totalTrades: 0,
    successfulTrades: 0,
    totalProfitUsd: 0,
    totalGasUsd: 0,
    netProfitUsd: 0,
    winRate: 0,
    uptime: 0,
    currentChain: 'base'
  };
  state.tradeLogs = [];
  state.opportunities = [];

  res.json({ success: true });
});

// GET health
app.get('/api/defi/multichain-arb/health', (req, res) => {
  res.json({ status: 'ok', port: PORT, running: state.isRunning });
});

// ═══════════════════════════════════════════════════════════════════════════════
// INICIAR SERVIDOR
// ═══════════════════════════════════════════════════════════════════════════════

app.listen(PORT, () => {
  console.log(`
╔═══════════════════════════════════════════════════════════════╗
║                                                               ║
║   🤖 BOT ARBITRAJE API - ACTIVO                               ║
║                                                               ║
║   ✅ Puerto: ${PORT}                                           ║
║   ✅ URL: http://localhost:${PORT}                             ║
║                                                               ║
║   Endpoints:                                                  ║
║   • GET  /api/defi/multichain-arb/status                     ║
║   • POST /api/defi/multichain-arb/start                      ║
║   • POST /api/defi/multichain-arb/stop                       ║
║   • GET  /api/defi/multichain-arb/health                     ║
║                                                               ║
╚═══════════════════════════════════════════════════════════════╝
  `);
});

process.on('SIGINT', () => {
  console.log('\n[API] Cerrando...');
  if (timer) clearInterval(timer);
  process.exit(0);
});



 * ═══════════════════════════════════════════════════════════════════════════════
 * BOT ARBITRAJE API - SERVIDOR SIMPLE Y FUNCIONAL
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import express from 'express';
import cors from 'cors';

const app = express();
const PORT = 3100;

app.use(cors());
app.use(express.json());

// ═══════════════════════════════════════════════════════════════════════════════
// ESTADO DEL BOT
// ═══════════════════════════════════════════════════════════════════════════════

const state = {
  isRunning: false,
  isDryRun: true,
  startTime: null,
  stats: {
    totalTicks: 0,
    totalTrades: 0,
    successfulTrades: 0,
    totalProfitUsd: 0,
    totalGasUsd: 0,
    netProfitUsd: 0,
    winRate: 0,
    uptime: 0,
    currentChain: 'base'
  },
  chains: [
    { chain: 'base', name: 'Base', chainId: 8453, balance: '0.033309', balanceUsd: 116.58, routes: 5, isActive: true, lastTick: Date.now(), explorer: 'https://basescan.org' },
    { chain: 'arbitrum', name: 'Arbitrum', chainId: 42161, balance: '0.027770', balanceUsd: 97.20, routes: 6, isActive: true, lastTick: Date.now(), explorer: 'https://arbiscan.io' },
    { chain: 'optimism', name: 'Optimism', chainId: 10, balance: '0.023800', balanceUsd: 83.30, routes: 5, isActive: true, lastTick: Date.now(), explorer: 'https://optimistic.etherscan.io' }
  ],
  tradeLogs: [],
  opportunities: [],
  banditStates: [
    { chain: 'base', alpha: 2, beta: 2, winRate: 50, selected: true },
    { chain: 'arbitrum', alpha: 2, beta: 2, winRate: 50, selected: false },
    { chain: 'optimism', alpha: 2, beta: 2, winRate: 50, selected: false }
  ]
};

let timer = null;

// ═══════════════════════════════════════════════════════════════════════════════
// SIMULADOR DE ACTIVIDAD
// ═══════════════════════════════════════════════════════════════════════════════

function tick() {
  if (!state.isRunning) return;

  // Uptime
  state.stats.uptime = Math.floor((Date.now() - state.startTime) / 1000);
  state.stats.totalTicks++;

  // Simular oportunidad
  if (Math.random() > 0.7) {
    state.opportunities.unshift({
      chain: ['base', 'arbitrum', 'optimism'][Math.floor(Math.random() * 3)],
      route: 'WETH-USDC-WETH',
      spreadBps: (Math.random() * 50).toFixed(2),
      potentialProfit: (Math.random() * 5).toFixed(4),
      gasCost: (Math.random() * 0.5).toFixed(4),
      netProfit: (Math.random() * 4).toFixed(4),
      timestamp: Date.now()
    });
    if (state.opportunities.length > 10) state.opportunities.pop();
  }

  // Simular trade
  if (Math.random() > 0.85) {
    const profit = Math.random() * 2;
    const success = Math.random() > 0.2;
    
    state.tradeLogs.unshift({
      id: `tx-${Date.now()}`,
      timestamp: Date.now(),
      chain: ['base', 'arbitrum', 'optimism'][Math.floor(Math.random() * 3)],
      route: 'WETH-USDC-WETH',
      amountIn: (Math.random() * 0.05).toFixed(4),
      amountOut: (Math.random() * 0.055).toFixed(4),
      profit: profit.toFixed(4),
      gasCost: (Math.random() * 0.001).toFixed(5),
      netProfit: profit.toFixed(4),
      txHash: `0x${Math.random().toString(16).slice(2)}`,
      status: success ? 'success' : 'failed'
    });

    state.stats.totalTrades++;
    if (success) state.stats.successfulTrades++;
    state.stats.totalProfitUsd += profit;
    state.stats.netProfitUsd = state.stats.totalProfitUsd * 0.9;
    state.stats.winRate = state.stats.totalTrades > 0 
      ? ((state.stats.successfulTrades / state.stats.totalTrades) * 100)
      : 0;

    if (state.tradeLogs.length > 50) state.tradeLogs.pop();
  }

  // Cambiar chain
  if (Math.random() > 0.9) {
    const chains = ['base', 'arbitrum', 'optimism'];
    state.stats.currentChain = chains[Math.floor(Math.random() * 3)];
    state.banditStates = state.banditStates.map(b => ({
      ...b,
      selected: b.chain === state.stats.currentChain,
      alpha: b.alpha + (Math.random() > 0.5 ? 0.1 : 0),
      winRate: ((b.alpha / (b.alpha + b.beta)) * 100)
    }));
  }

  // Actualizar chains
  state.chains = state.chains.map(c => ({
    ...c,
    lastTick: Date.now(),
    routes: Math.floor(Math.random() * 10) + 3
  }));
}

// ═══════════════════════════════════════════════════════════════════════════════
// RUTAS API
// ═══════════════════════════════════════════════════════════════════════════════

// GET status
app.get('/api/defi/multichain-arb/status', (req, res) => {
  console.log(`[API] GET /status - running: ${state.isRunning}, ticks: ${state.stats.totalTicks}`);
  res.json(state);
});

// POST start
app.post('/api/defi/multichain-arb/start', (req, res) => {
  console.log('[API] POST /start');
  
  if (state.isRunning) {
    return res.json({ success: false, error: 'Ya está corriendo', isRunning: true });
  }

  state.isRunning = true;
  state.isDryRun = req.body?.dryRun !== false;
  state.startTime = Date.now();
  state.stats.totalTicks = 0;
  state.stats.totalTrades = 0;
  state.stats.successfulTrades = 0;
  state.stats.totalProfitUsd = 0;
  state.stats.netProfitUsd = 0;
  state.stats.winRate = 0;
  state.stats.uptime = 0;

  if (timer) clearInterval(timer);
  timer = setInterval(tick, 500);

  console.log('[API] ✅ Bot iniciado');
  res.json({ success: true, isRunning: true, isDryRun: state.isDryRun });
});

// POST stop
app.post('/api/defi/multichain-arb/stop', (req, res) => {
  console.log('[API] POST /stop');
  
  state.isRunning = false;
  if (timer) {
    clearInterval(timer);
    timer = null;
  }

  console.log('[API] ✅ Bot detenido');
  res.json({ success: true, isRunning: false });
});

// POST reset
app.post('/api/defi/multichain-arb/reset', (req, res) => {
  console.log('[API] POST /reset');
  
  state.stats = {
    totalTicks: 0,
    totalTrades: 0,
    successfulTrades: 0,
    totalProfitUsd: 0,
    totalGasUsd: 0,
    netProfitUsd: 0,
    winRate: 0,
    uptime: 0,
    currentChain: 'base'
  };
  state.tradeLogs = [];
  state.opportunities = [];

  res.json({ success: true });
});

// GET health
app.get('/api/defi/multichain-arb/health', (req, res) => {
  res.json({ status: 'ok', port: PORT, running: state.isRunning });
});

// ═══════════════════════════════════════════════════════════════════════════════
// INICIAR SERVIDOR
// ═══════════════════════════════════════════════════════════════════════════════

app.listen(PORT, () => {
  console.log(`
╔═══════════════════════════════════════════════════════════════╗
║                                                               ║
║   🤖 BOT ARBITRAJE API - ACTIVO                               ║
║                                                               ║
║   ✅ Puerto: ${PORT}                                           ║
║   ✅ URL: http://localhost:${PORT}                             ║
║                                                               ║
║   Endpoints:                                                  ║
║   • GET  /api/defi/multichain-arb/status                     ║
║   • POST /api/defi/multichain-arb/start                      ║
║   • POST /api/defi/multichain-arb/stop                       ║
║   • GET  /api/defi/multichain-arb/health                     ║
║                                                               ║
╚═══════════════════════════════════════════════════════════════╝
  `);
});

process.on('SIGINT', () => {
  console.log('\n[API] Cerrando...');
  if (timer) clearInterval(timer);
  process.exit(0);
});



 * ═══════════════════════════════════════════════════════════════════════════════
 * BOT ARBITRAJE API - SERVIDOR SIMPLE Y FUNCIONAL
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import express from 'express';
import cors from 'cors';

const app = express();
const PORT = 3100;

app.use(cors());
app.use(express.json());

// ═══════════════════════════════════════════════════════════════════════════════
// ESTADO DEL BOT
// ═══════════════════════════════════════════════════════════════════════════════

const state = {
  isRunning: false,
  isDryRun: true,
  startTime: null,
  stats: {
    totalTicks: 0,
    totalTrades: 0,
    successfulTrades: 0,
    totalProfitUsd: 0,
    totalGasUsd: 0,
    netProfitUsd: 0,
    winRate: 0,
    uptime: 0,
    currentChain: 'base'
  },
  chains: [
    { chain: 'base', name: 'Base', chainId: 8453, balance: '0.033309', balanceUsd: 116.58, routes: 5, isActive: true, lastTick: Date.now(), explorer: 'https://basescan.org' },
    { chain: 'arbitrum', name: 'Arbitrum', chainId: 42161, balance: '0.027770', balanceUsd: 97.20, routes: 6, isActive: true, lastTick: Date.now(), explorer: 'https://arbiscan.io' },
    { chain: 'optimism', name: 'Optimism', chainId: 10, balance: '0.023800', balanceUsd: 83.30, routes: 5, isActive: true, lastTick: Date.now(), explorer: 'https://optimistic.etherscan.io' }
  ],
  tradeLogs: [],
  opportunities: [],
  banditStates: [
    { chain: 'base', alpha: 2, beta: 2, winRate: 50, selected: true },
    { chain: 'arbitrum', alpha: 2, beta: 2, winRate: 50, selected: false },
    { chain: 'optimism', alpha: 2, beta: 2, winRate: 50, selected: false }
  ]
};

let timer = null;

// ═══════════════════════════════════════════════════════════════════════════════
// SIMULADOR DE ACTIVIDAD
// ═══════════════════════════════════════════════════════════════════════════════

function tick() {
  if (!state.isRunning) return;

  // Uptime
  state.stats.uptime = Math.floor((Date.now() - state.startTime) / 1000);
  state.stats.totalTicks++;

  // Simular oportunidad
  if (Math.random() > 0.7) {
    state.opportunities.unshift({
      chain: ['base', 'arbitrum', 'optimism'][Math.floor(Math.random() * 3)],
      route: 'WETH-USDC-WETH',
      spreadBps: (Math.random() * 50).toFixed(2),
      potentialProfit: (Math.random() * 5).toFixed(4),
      gasCost: (Math.random() * 0.5).toFixed(4),
      netProfit: (Math.random() * 4).toFixed(4),
      timestamp: Date.now()
    });
    if (state.opportunities.length > 10) state.opportunities.pop();
  }

  // Simular trade
  if (Math.random() > 0.85) {
    const profit = Math.random() * 2;
    const success = Math.random() > 0.2;
    
    state.tradeLogs.unshift({
      id: `tx-${Date.now()}`,
      timestamp: Date.now(),
      chain: ['base', 'arbitrum', 'optimism'][Math.floor(Math.random() * 3)],
      route: 'WETH-USDC-WETH',
      amountIn: (Math.random() * 0.05).toFixed(4),
      amountOut: (Math.random() * 0.055).toFixed(4),
      profit: profit.toFixed(4),
      gasCost: (Math.random() * 0.001).toFixed(5),
      netProfit: profit.toFixed(4),
      txHash: `0x${Math.random().toString(16).slice(2)}`,
      status: success ? 'success' : 'failed'
    });

    state.stats.totalTrades++;
    if (success) state.stats.successfulTrades++;
    state.stats.totalProfitUsd += profit;
    state.stats.netProfitUsd = state.stats.totalProfitUsd * 0.9;
    state.stats.winRate = state.stats.totalTrades > 0 
      ? ((state.stats.successfulTrades / state.stats.totalTrades) * 100)
      : 0;

    if (state.tradeLogs.length > 50) state.tradeLogs.pop();
  }

  // Cambiar chain
  if (Math.random() > 0.9) {
    const chains = ['base', 'arbitrum', 'optimism'];
    state.stats.currentChain = chains[Math.floor(Math.random() * 3)];
    state.banditStates = state.banditStates.map(b => ({
      ...b,
      selected: b.chain === state.stats.currentChain,
      alpha: b.alpha + (Math.random() > 0.5 ? 0.1 : 0),
      winRate: ((b.alpha / (b.alpha + b.beta)) * 100)
    }));
  }

  // Actualizar chains
  state.chains = state.chains.map(c => ({
    ...c,
    lastTick: Date.now(),
    routes: Math.floor(Math.random() * 10) + 3
  }));
}

// ═══════════════════════════════════════════════════════════════════════════════
// RUTAS API
// ═══════════════════════════════════════════════════════════════════════════════

// GET status
app.get('/api/defi/multichain-arb/status', (req, res) => {
  console.log(`[API] GET /status - running: ${state.isRunning}, ticks: ${state.stats.totalTicks}`);
  res.json(state);
});

// POST start
app.post('/api/defi/multichain-arb/start', (req, res) => {
  console.log('[API] POST /start');
  
  if (state.isRunning) {
    return res.json({ success: false, error: 'Ya está corriendo', isRunning: true });
  }

  state.isRunning = true;
  state.isDryRun = req.body?.dryRun !== false;
  state.startTime = Date.now();
  state.stats.totalTicks = 0;
  state.stats.totalTrades = 0;
  state.stats.successfulTrades = 0;
  state.stats.totalProfitUsd = 0;
  state.stats.netProfitUsd = 0;
  state.stats.winRate = 0;
  state.stats.uptime = 0;

  if (timer) clearInterval(timer);
  timer = setInterval(tick, 500);

  console.log('[API] ✅ Bot iniciado');
  res.json({ success: true, isRunning: true, isDryRun: state.isDryRun });
});

// POST stop
app.post('/api/defi/multichain-arb/stop', (req, res) => {
  console.log('[API] POST /stop');
  
  state.isRunning = false;
  if (timer) {
    clearInterval(timer);
    timer = null;
  }

  console.log('[API] ✅ Bot detenido');
  res.json({ success: true, isRunning: false });
});

// POST reset
app.post('/api/defi/multichain-arb/reset', (req, res) => {
  console.log('[API] POST /reset');
  
  state.stats = {
    totalTicks: 0,
    totalTrades: 0,
    successfulTrades: 0,
    totalProfitUsd: 0,
    totalGasUsd: 0,
    netProfitUsd: 0,
    winRate: 0,
    uptime: 0,
    currentChain: 'base'
  };
  state.tradeLogs = [];
  state.opportunities = [];

  res.json({ success: true });
});

// GET health
app.get('/api/defi/multichain-arb/health', (req, res) => {
  res.json({ status: 'ok', port: PORT, running: state.isRunning });
});

// ═══════════════════════════════════════════════════════════════════════════════
// INICIAR SERVIDOR
// ═══════════════════════════════════════════════════════════════════════════════

app.listen(PORT, () => {
  console.log(`
╔═══════════════════════════════════════════════════════════════╗
║                                                               ║
║   🤖 BOT ARBITRAJE API - ACTIVO                               ║
║                                                               ║
║   ✅ Puerto: ${PORT}                                           ║
║   ✅ URL: http://localhost:${PORT}                             ║
║                                                               ║
║   Endpoints:                                                  ║
║   • GET  /api/defi/multichain-arb/status                     ║
║   • POST /api/defi/multichain-arb/start                      ║
║   • POST /api/defi/multichain-arb/stop                       ║
║   • GET  /api/defi/multichain-arb/health                     ║
║                                                               ║
╚═══════════════════════════════════════════════════════════════╝
  `);
});

process.on('SIGINT', () => {
  console.log('\n[API] Cerrando...');
  if (timer) clearInterval(timer);
  process.exit(0);
});



 * ═══════════════════════════════════════════════════════════════════════════════
 * BOT ARBITRAJE API - SERVIDOR SIMPLE Y FUNCIONAL
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import express from 'express';
import cors from 'cors';

const app = express();
const PORT = 3100;

app.use(cors());
app.use(express.json());

// ═══════════════════════════════════════════════════════════════════════════════
// ESTADO DEL BOT
// ═══════════════════════════════════════════════════════════════════════════════

const state = {
  isRunning: false,
  isDryRun: true,
  startTime: null,
  stats: {
    totalTicks: 0,
    totalTrades: 0,
    successfulTrades: 0,
    totalProfitUsd: 0,
    totalGasUsd: 0,
    netProfitUsd: 0,
    winRate: 0,
    uptime: 0,
    currentChain: 'base'
  },
  chains: [
    { chain: 'base', name: 'Base', chainId: 8453, balance: '0.033309', balanceUsd: 116.58, routes: 5, isActive: true, lastTick: Date.now(), explorer: 'https://basescan.org' },
    { chain: 'arbitrum', name: 'Arbitrum', chainId: 42161, balance: '0.027770', balanceUsd: 97.20, routes: 6, isActive: true, lastTick: Date.now(), explorer: 'https://arbiscan.io' },
    { chain: 'optimism', name: 'Optimism', chainId: 10, balance: '0.023800', balanceUsd: 83.30, routes: 5, isActive: true, lastTick: Date.now(), explorer: 'https://optimistic.etherscan.io' }
  ],
  tradeLogs: [],
  opportunities: [],
  banditStates: [
    { chain: 'base', alpha: 2, beta: 2, winRate: 50, selected: true },
    { chain: 'arbitrum', alpha: 2, beta: 2, winRate: 50, selected: false },
    { chain: 'optimism', alpha: 2, beta: 2, winRate: 50, selected: false }
  ]
};

let timer = null;

// ═══════════════════════════════════════════════════════════════════════════════
// SIMULADOR DE ACTIVIDAD
// ═══════════════════════════════════════════════════════════════════════════════

function tick() {
  if (!state.isRunning) return;

  // Uptime
  state.stats.uptime = Math.floor((Date.now() - state.startTime) / 1000);
  state.stats.totalTicks++;

  // Simular oportunidad
  if (Math.random() > 0.7) {
    state.opportunities.unshift({
      chain: ['base', 'arbitrum', 'optimism'][Math.floor(Math.random() * 3)],
      route: 'WETH-USDC-WETH',
      spreadBps: (Math.random() * 50).toFixed(2),
      potentialProfit: (Math.random() * 5).toFixed(4),
      gasCost: (Math.random() * 0.5).toFixed(4),
      netProfit: (Math.random() * 4).toFixed(4),
      timestamp: Date.now()
    });
    if (state.opportunities.length > 10) state.opportunities.pop();
  }

  // Simular trade
  if (Math.random() > 0.85) {
    const profit = Math.random() * 2;
    const success = Math.random() > 0.2;
    
    state.tradeLogs.unshift({
      id: `tx-${Date.now()}`,
      timestamp: Date.now(),
      chain: ['base', 'arbitrum', 'optimism'][Math.floor(Math.random() * 3)],
      route: 'WETH-USDC-WETH',
      amountIn: (Math.random() * 0.05).toFixed(4),
      amountOut: (Math.random() * 0.055).toFixed(4),
      profit: profit.toFixed(4),
      gasCost: (Math.random() * 0.001).toFixed(5),
      netProfit: profit.toFixed(4),
      txHash: `0x${Math.random().toString(16).slice(2)}`,
      status: success ? 'success' : 'failed'
    });

    state.stats.totalTrades++;
    if (success) state.stats.successfulTrades++;
    state.stats.totalProfitUsd += profit;
    state.stats.netProfitUsd = state.stats.totalProfitUsd * 0.9;
    state.stats.winRate = state.stats.totalTrades > 0 
      ? ((state.stats.successfulTrades / state.stats.totalTrades) * 100)
      : 0;

    if (state.tradeLogs.length > 50) state.tradeLogs.pop();
  }

  // Cambiar chain
  if (Math.random() > 0.9) {
    const chains = ['base', 'arbitrum', 'optimism'];
    state.stats.currentChain = chains[Math.floor(Math.random() * 3)];
    state.banditStates = state.banditStates.map(b => ({
      ...b,
      selected: b.chain === state.stats.currentChain,
      alpha: b.alpha + (Math.random() > 0.5 ? 0.1 : 0),
      winRate: ((b.alpha / (b.alpha + b.beta)) * 100)
    }));
  }

  // Actualizar chains
  state.chains = state.chains.map(c => ({
    ...c,
    lastTick: Date.now(),
    routes: Math.floor(Math.random() * 10) + 3
  }));
}

// ═══════════════════════════════════════════════════════════════════════════════
// RUTAS API
// ═══════════════════════════════════════════════════════════════════════════════

// GET status
app.get('/api/defi/multichain-arb/status', (req, res) => {
  console.log(`[API] GET /status - running: ${state.isRunning}, ticks: ${state.stats.totalTicks}`);
  res.json(state);
});

// POST start
app.post('/api/defi/multichain-arb/start', (req, res) => {
  console.log('[API] POST /start');
  
  if (state.isRunning) {
    return res.json({ success: false, error: 'Ya está corriendo', isRunning: true });
  }

  state.isRunning = true;
  state.isDryRun = req.body?.dryRun !== false;
  state.startTime = Date.now();
  state.stats.totalTicks = 0;
  state.stats.totalTrades = 0;
  state.stats.successfulTrades = 0;
  state.stats.totalProfitUsd = 0;
  state.stats.netProfitUsd = 0;
  state.stats.winRate = 0;
  state.stats.uptime = 0;

  if (timer) clearInterval(timer);
  timer = setInterval(tick, 500);

  console.log('[API] ✅ Bot iniciado');
  res.json({ success: true, isRunning: true, isDryRun: state.isDryRun });
});

// POST stop
app.post('/api/defi/multichain-arb/stop', (req, res) => {
  console.log('[API] POST /stop');
  
  state.isRunning = false;
  if (timer) {
    clearInterval(timer);
    timer = null;
  }

  console.log('[API] ✅ Bot detenido');
  res.json({ success: true, isRunning: false });
});

// POST reset
app.post('/api/defi/multichain-arb/reset', (req, res) => {
  console.log('[API] POST /reset');
  
  state.stats = {
    totalTicks: 0,
    totalTrades: 0,
    successfulTrades: 0,
    totalProfitUsd: 0,
    totalGasUsd: 0,
    netProfitUsd: 0,
    winRate: 0,
    uptime: 0,
    currentChain: 'base'
  };
  state.tradeLogs = [];
  state.opportunities = [];

  res.json({ success: true });
});

// GET health
app.get('/api/defi/multichain-arb/health', (req, res) => {
  res.json({ status: 'ok', port: PORT, running: state.isRunning });
});

// ═══════════════════════════════════════════════════════════════════════════════
// INICIAR SERVIDOR
// ═══════════════════════════════════════════════════════════════════════════════

app.listen(PORT, () => {
  console.log(`
╔═══════════════════════════════════════════════════════════════╗
║                                                               ║
║   🤖 BOT ARBITRAJE API - ACTIVO                               ║
║                                                               ║
║   ✅ Puerto: ${PORT}                                           ║
║   ✅ URL: http://localhost:${PORT}                             ║
║                                                               ║
║   Endpoints:                                                  ║
║   • GET  /api/defi/multichain-arb/status                     ║
║   • POST /api/defi/multichain-arb/start                      ║
║   • POST /api/defi/multichain-arb/stop                       ║
║   • GET  /api/defi/multichain-arb/health                     ║
║                                                               ║
╚═══════════════════════════════════════════════════════════════╝
  `);
});

process.on('SIGINT', () => {
  console.log('\n[API] Cerrando...');
  if (timer) clearInterval(timer);
  process.exit(0);
});


 * ═══════════════════════════════════════════════════════════════════════════════
 * BOT ARBITRAJE API - SERVIDOR SIMPLE Y FUNCIONAL
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import express from 'express';
import cors from 'cors';

const app = express();
const PORT = 3100;

app.use(cors());
app.use(express.json());

// ═══════════════════════════════════════════════════════════════════════════════
// ESTADO DEL BOT
// ═══════════════════════════════════════════════════════════════════════════════

const state = {
  isRunning: false,
  isDryRun: true,
  startTime: null,
  stats: {
    totalTicks: 0,
    totalTrades: 0,
    successfulTrades: 0,
    totalProfitUsd: 0,
    totalGasUsd: 0,
    netProfitUsd: 0,
    winRate: 0,
    uptime: 0,
    currentChain: 'base'
  },
  chains: [
    { chain: 'base', name: 'Base', chainId: 8453, balance: '0.033309', balanceUsd: 116.58, routes: 5, isActive: true, lastTick: Date.now(), explorer: 'https://basescan.org' },
    { chain: 'arbitrum', name: 'Arbitrum', chainId: 42161, balance: '0.027770', balanceUsd: 97.20, routes: 6, isActive: true, lastTick: Date.now(), explorer: 'https://arbiscan.io' },
    { chain: 'optimism', name: 'Optimism', chainId: 10, balance: '0.023800', balanceUsd: 83.30, routes: 5, isActive: true, lastTick: Date.now(), explorer: 'https://optimistic.etherscan.io' }
  ],
  tradeLogs: [],
  opportunities: [],
  banditStates: [
    { chain: 'base', alpha: 2, beta: 2, winRate: 50, selected: true },
    { chain: 'arbitrum', alpha: 2, beta: 2, winRate: 50, selected: false },
    { chain: 'optimism', alpha: 2, beta: 2, winRate: 50, selected: false }
  ]
};

let timer = null;

// ═══════════════════════════════════════════════════════════════════════════════
// SIMULADOR DE ACTIVIDAD
// ═══════════════════════════════════════════════════════════════════════════════

function tick() {
  if (!state.isRunning) return;

  // Uptime
  state.stats.uptime = Math.floor((Date.now() - state.startTime) / 1000);
  state.stats.totalTicks++;

  // Simular oportunidad
  if (Math.random() > 0.7) {
    state.opportunities.unshift({
      chain: ['base', 'arbitrum', 'optimism'][Math.floor(Math.random() * 3)],
      route: 'WETH-USDC-WETH',
      spreadBps: (Math.random() * 50).toFixed(2),
      potentialProfit: (Math.random() * 5).toFixed(4),
      gasCost: (Math.random() * 0.5).toFixed(4),
      netProfit: (Math.random() * 4).toFixed(4),
      timestamp: Date.now()
    });
    if (state.opportunities.length > 10) state.opportunities.pop();
  }

  // Simular trade
  if (Math.random() > 0.85) {
    const profit = Math.random() * 2;
    const success = Math.random() > 0.2;
    
    state.tradeLogs.unshift({
      id: `tx-${Date.now()}`,
      timestamp: Date.now(),
      chain: ['base', 'arbitrum', 'optimism'][Math.floor(Math.random() * 3)],
      route: 'WETH-USDC-WETH',
      amountIn: (Math.random() * 0.05).toFixed(4),
      amountOut: (Math.random() * 0.055).toFixed(4),
      profit: profit.toFixed(4),
      gasCost: (Math.random() * 0.001).toFixed(5),
      netProfit: profit.toFixed(4),
      txHash: `0x${Math.random().toString(16).slice(2)}`,
      status: success ? 'success' : 'failed'
    });

    state.stats.totalTrades++;
    if (success) state.stats.successfulTrades++;
    state.stats.totalProfitUsd += profit;
    state.stats.netProfitUsd = state.stats.totalProfitUsd * 0.9;
    state.stats.winRate = state.stats.totalTrades > 0 
      ? ((state.stats.successfulTrades / state.stats.totalTrades) * 100)
      : 0;

    if (state.tradeLogs.length > 50) state.tradeLogs.pop();
  }

  // Cambiar chain
  if (Math.random() > 0.9) {
    const chains = ['base', 'arbitrum', 'optimism'];
    state.stats.currentChain = chains[Math.floor(Math.random() * 3)];
    state.banditStates = state.banditStates.map(b => ({
      ...b,
      selected: b.chain === state.stats.currentChain,
      alpha: b.alpha + (Math.random() > 0.5 ? 0.1 : 0),
      winRate: ((b.alpha / (b.alpha + b.beta)) * 100)
    }));
  }

  // Actualizar chains
  state.chains = state.chains.map(c => ({
    ...c,
    lastTick: Date.now(),
    routes: Math.floor(Math.random() * 10) + 3
  }));
}

// ═══════════════════════════════════════════════════════════════════════════════
// RUTAS API
// ═══════════════════════════════════════════════════════════════════════════════

// GET status
app.get('/api/defi/multichain-arb/status', (req, res) => {
  console.log(`[API] GET /status - running: ${state.isRunning}, ticks: ${state.stats.totalTicks}`);
  res.json(state);
});

// POST start
app.post('/api/defi/multichain-arb/start', (req, res) => {
  console.log('[API] POST /start');
  
  if (state.isRunning) {
    return res.json({ success: false, error: 'Ya está corriendo', isRunning: true });
  }

  state.isRunning = true;
  state.isDryRun = req.body?.dryRun !== false;
  state.startTime = Date.now();
  state.stats.totalTicks = 0;
  state.stats.totalTrades = 0;
  state.stats.successfulTrades = 0;
  state.stats.totalProfitUsd = 0;
  state.stats.netProfitUsd = 0;
  state.stats.winRate = 0;
  state.stats.uptime = 0;

  if (timer) clearInterval(timer);
  timer = setInterval(tick, 500);

  console.log('[API] ✅ Bot iniciado');
  res.json({ success: true, isRunning: true, isDryRun: state.isDryRun });
});

// POST stop
app.post('/api/defi/multichain-arb/stop', (req, res) => {
  console.log('[API] POST /stop');
  
  state.isRunning = false;
  if (timer) {
    clearInterval(timer);
    timer = null;
  }

  console.log('[API] ✅ Bot detenido');
  res.json({ success: true, isRunning: false });
});

// POST reset
app.post('/api/defi/multichain-arb/reset', (req, res) => {
  console.log('[API] POST /reset');
  
  state.stats = {
    totalTicks: 0,
    totalTrades: 0,
    successfulTrades: 0,
    totalProfitUsd: 0,
    totalGasUsd: 0,
    netProfitUsd: 0,
    winRate: 0,
    uptime: 0,
    currentChain: 'base'
  };
  state.tradeLogs = [];
  state.opportunities = [];

  res.json({ success: true });
});

// GET health
app.get('/api/defi/multichain-arb/health', (req, res) => {
  res.json({ status: 'ok', port: PORT, running: state.isRunning });
});

// ═══════════════════════════════════════════════════════════════════════════════
// INICIAR SERVIDOR
// ═══════════════════════════════════════════════════════════════════════════════

app.listen(PORT, () => {
  console.log(`
╔═══════════════════════════════════════════════════════════════╗
║                                                               ║
║   🤖 BOT ARBITRAJE API - ACTIVO                               ║
║                                                               ║
║   ✅ Puerto: ${PORT}                                           ║
║   ✅ URL: http://localhost:${PORT}                             ║
║                                                               ║
║   Endpoints:                                                  ║
║   • GET  /api/defi/multichain-arb/status                     ║
║   • POST /api/defi/multichain-arb/start                      ║
║   • POST /api/defi/multichain-arb/stop                       ║
║   • GET  /api/defi/multichain-arb/health                     ║
║                                                               ║
╚═══════════════════════════════════════════════════════════════╝
  `);
});

process.on('SIGINT', () => {
  console.log('\n[API] Cerrando...');
  if (timer) clearInterval(timer);
  process.exit(0);
});



 * ═══════════════════════════════════════════════════════════════════════════════
 * BOT ARBITRAJE API - SERVIDOR SIMPLE Y FUNCIONAL
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import express from 'express';
import cors from 'cors';

const app = express();
const PORT = 3100;

app.use(cors());
app.use(express.json());

// ═══════════════════════════════════════════════════════════════════════════════
// ESTADO DEL BOT
// ═══════════════════════════════════════════════════════════════════════════════

const state = {
  isRunning: false,
  isDryRun: true,
  startTime: null,
  stats: {
    totalTicks: 0,
    totalTrades: 0,
    successfulTrades: 0,
    totalProfitUsd: 0,
    totalGasUsd: 0,
    netProfitUsd: 0,
    winRate: 0,
    uptime: 0,
    currentChain: 'base'
  },
  chains: [
    { chain: 'base', name: 'Base', chainId: 8453, balance: '0.033309', balanceUsd: 116.58, routes: 5, isActive: true, lastTick: Date.now(), explorer: 'https://basescan.org' },
    { chain: 'arbitrum', name: 'Arbitrum', chainId: 42161, balance: '0.027770', balanceUsd: 97.20, routes: 6, isActive: true, lastTick: Date.now(), explorer: 'https://arbiscan.io' },
    { chain: 'optimism', name: 'Optimism', chainId: 10, balance: '0.023800', balanceUsd: 83.30, routes: 5, isActive: true, lastTick: Date.now(), explorer: 'https://optimistic.etherscan.io' }
  ],
  tradeLogs: [],
  opportunities: [],
  banditStates: [
    { chain: 'base', alpha: 2, beta: 2, winRate: 50, selected: true },
    { chain: 'arbitrum', alpha: 2, beta: 2, winRate: 50, selected: false },
    { chain: 'optimism', alpha: 2, beta: 2, winRate: 50, selected: false }
  ]
};

let timer = null;

// ═══════════════════════════════════════════════════════════════════════════════
// SIMULADOR DE ACTIVIDAD
// ═══════════════════════════════════════════════════════════════════════════════

function tick() {
  if (!state.isRunning) return;

  // Uptime
  state.stats.uptime = Math.floor((Date.now() - state.startTime) / 1000);
  state.stats.totalTicks++;

  // Simular oportunidad
  if (Math.random() > 0.7) {
    state.opportunities.unshift({
      chain: ['base', 'arbitrum', 'optimism'][Math.floor(Math.random() * 3)],
      route: 'WETH-USDC-WETH',
      spreadBps: (Math.random() * 50).toFixed(2),
      potentialProfit: (Math.random() * 5).toFixed(4),
      gasCost: (Math.random() * 0.5).toFixed(4),
      netProfit: (Math.random() * 4).toFixed(4),
      timestamp: Date.now()
    });
    if (state.opportunities.length > 10) state.opportunities.pop();
  }

  // Simular trade
  if (Math.random() > 0.85) {
    const profit = Math.random() * 2;
    const success = Math.random() > 0.2;
    
    state.tradeLogs.unshift({
      id: `tx-${Date.now()}`,
      timestamp: Date.now(),
      chain: ['base', 'arbitrum', 'optimism'][Math.floor(Math.random() * 3)],
      route: 'WETH-USDC-WETH',
      amountIn: (Math.random() * 0.05).toFixed(4),
      amountOut: (Math.random() * 0.055).toFixed(4),
      profit: profit.toFixed(4),
      gasCost: (Math.random() * 0.001).toFixed(5),
      netProfit: profit.toFixed(4),
      txHash: `0x${Math.random().toString(16).slice(2)}`,
      status: success ? 'success' : 'failed'
    });

    state.stats.totalTrades++;
    if (success) state.stats.successfulTrades++;
    state.stats.totalProfitUsd += profit;
    state.stats.netProfitUsd = state.stats.totalProfitUsd * 0.9;
    state.stats.winRate = state.stats.totalTrades > 0 
      ? ((state.stats.successfulTrades / state.stats.totalTrades) * 100)
      : 0;

    if (state.tradeLogs.length > 50) state.tradeLogs.pop();
  }

  // Cambiar chain
  if (Math.random() > 0.9) {
    const chains = ['base', 'arbitrum', 'optimism'];
    state.stats.currentChain = chains[Math.floor(Math.random() * 3)];
    state.banditStates = state.banditStates.map(b => ({
      ...b,
      selected: b.chain === state.stats.currentChain,
      alpha: b.alpha + (Math.random() > 0.5 ? 0.1 : 0),
      winRate: ((b.alpha / (b.alpha + b.beta)) * 100)
    }));
  }

  // Actualizar chains
  state.chains = state.chains.map(c => ({
    ...c,
    lastTick: Date.now(),
    routes: Math.floor(Math.random() * 10) + 3
  }));
}

// ═══════════════════════════════════════════════════════════════════════════════
// RUTAS API
// ═══════════════════════════════════════════════════════════════════════════════

// GET status
app.get('/api/defi/multichain-arb/status', (req, res) => {
  console.log(`[API] GET /status - running: ${state.isRunning}, ticks: ${state.stats.totalTicks}`);
  res.json(state);
});

// POST start
app.post('/api/defi/multichain-arb/start', (req, res) => {
  console.log('[API] POST /start');
  
  if (state.isRunning) {
    return res.json({ success: false, error: 'Ya está corriendo', isRunning: true });
  }

  state.isRunning = true;
  state.isDryRun = req.body?.dryRun !== false;
  state.startTime = Date.now();
  state.stats.totalTicks = 0;
  state.stats.totalTrades = 0;
  state.stats.successfulTrades = 0;
  state.stats.totalProfitUsd = 0;
  state.stats.netProfitUsd = 0;
  state.stats.winRate = 0;
  state.stats.uptime = 0;

  if (timer) clearInterval(timer);
  timer = setInterval(tick, 500);

  console.log('[API] ✅ Bot iniciado');
  res.json({ success: true, isRunning: true, isDryRun: state.isDryRun });
});

// POST stop
app.post('/api/defi/multichain-arb/stop', (req, res) => {
  console.log('[API] POST /stop');
  
  state.isRunning = false;
  if (timer) {
    clearInterval(timer);
    timer = null;
  }

  console.log('[API] ✅ Bot detenido');
  res.json({ success: true, isRunning: false });
});

// POST reset
app.post('/api/defi/multichain-arb/reset', (req, res) => {
  console.log('[API] POST /reset');
  
  state.stats = {
    totalTicks: 0,
    totalTrades: 0,
    successfulTrades: 0,
    totalProfitUsd: 0,
    totalGasUsd: 0,
    netProfitUsd: 0,
    winRate: 0,
    uptime: 0,
    currentChain: 'base'
  };
  state.tradeLogs = [];
  state.opportunities = [];

  res.json({ success: true });
});

// GET health
app.get('/api/defi/multichain-arb/health', (req, res) => {
  res.json({ status: 'ok', port: PORT, running: state.isRunning });
});

// ═══════════════════════════════════════════════════════════════════════════════
// INICIAR SERVIDOR
// ═══════════════════════════════════════════════════════════════════════════════

app.listen(PORT, () => {
  console.log(`
╔═══════════════════════════════════════════════════════════════╗
║                                                               ║
║   🤖 BOT ARBITRAJE API - ACTIVO                               ║
║                                                               ║
║   ✅ Puerto: ${PORT}                                           ║
║   ✅ URL: http://localhost:${PORT}                             ║
║                                                               ║
║   Endpoints:                                                  ║
║   • GET  /api/defi/multichain-arb/status                     ║
║   • POST /api/defi/multichain-arb/start                      ║
║   • POST /api/defi/multichain-arb/stop                       ║
║   • GET  /api/defi/multichain-arb/health                     ║
║                                                               ║
╚═══════════════════════════════════════════════════════════════╝
  `);
});

process.on('SIGINT', () => {
  console.log('\n[API] Cerrando...');
  if (timer) clearInterval(timer);
  process.exit(0);
});


 * ═══════════════════════════════════════════════════════════════════════════════
 * BOT ARBITRAJE API - SERVIDOR SIMPLE Y FUNCIONAL
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import express from 'express';
import cors from 'cors';

const app = express();
const PORT = 3100;

app.use(cors());
app.use(express.json());

// ═══════════════════════════════════════════════════════════════════════════════
// ESTADO DEL BOT
// ═══════════════════════════════════════════════════════════════════════════════

const state = {
  isRunning: false,
  isDryRun: true,
  startTime: null,
  stats: {
    totalTicks: 0,
    totalTrades: 0,
    successfulTrades: 0,
    totalProfitUsd: 0,
    totalGasUsd: 0,
    netProfitUsd: 0,
    winRate: 0,
    uptime: 0,
    currentChain: 'base'
  },
  chains: [
    { chain: 'base', name: 'Base', chainId: 8453, balance: '0.033309', balanceUsd: 116.58, routes: 5, isActive: true, lastTick: Date.now(), explorer: 'https://basescan.org' },
    { chain: 'arbitrum', name: 'Arbitrum', chainId: 42161, balance: '0.027770', balanceUsd: 97.20, routes: 6, isActive: true, lastTick: Date.now(), explorer: 'https://arbiscan.io' },
    { chain: 'optimism', name: 'Optimism', chainId: 10, balance: '0.023800', balanceUsd: 83.30, routes: 5, isActive: true, lastTick: Date.now(), explorer: 'https://optimistic.etherscan.io' }
  ],
  tradeLogs: [],
  opportunities: [],
  banditStates: [
    { chain: 'base', alpha: 2, beta: 2, winRate: 50, selected: true },
    { chain: 'arbitrum', alpha: 2, beta: 2, winRate: 50, selected: false },
    { chain: 'optimism', alpha: 2, beta: 2, winRate: 50, selected: false }
  ]
};

let timer = null;

// ═══════════════════════════════════════════════════════════════════════════════
// SIMULADOR DE ACTIVIDAD
// ═══════════════════════════════════════════════════════════════════════════════

function tick() {
  if (!state.isRunning) return;

  // Uptime
  state.stats.uptime = Math.floor((Date.now() - state.startTime) / 1000);
  state.stats.totalTicks++;

  // Simular oportunidad
  if (Math.random() > 0.7) {
    state.opportunities.unshift({
      chain: ['base', 'arbitrum', 'optimism'][Math.floor(Math.random() * 3)],
      route: 'WETH-USDC-WETH',
      spreadBps: (Math.random() * 50).toFixed(2),
      potentialProfit: (Math.random() * 5).toFixed(4),
      gasCost: (Math.random() * 0.5).toFixed(4),
      netProfit: (Math.random() * 4).toFixed(4),
      timestamp: Date.now()
    });
    if (state.opportunities.length > 10) state.opportunities.pop();
  }

  // Simular trade
  if (Math.random() > 0.85) {
    const profit = Math.random() * 2;
    const success = Math.random() > 0.2;
    
    state.tradeLogs.unshift({
      id: `tx-${Date.now()}`,
      timestamp: Date.now(),
      chain: ['base', 'arbitrum', 'optimism'][Math.floor(Math.random() * 3)],
      route: 'WETH-USDC-WETH',
      amountIn: (Math.random() * 0.05).toFixed(4),
      amountOut: (Math.random() * 0.055).toFixed(4),
      profit: profit.toFixed(4),
      gasCost: (Math.random() * 0.001).toFixed(5),
      netProfit: profit.toFixed(4),
      txHash: `0x${Math.random().toString(16).slice(2)}`,
      status: success ? 'success' : 'failed'
    });

    state.stats.totalTrades++;
    if (success) state.stats.successfulTrades++;
    state.stats.totalProfitUsd += profit;
    state.stats.netProfitUsd = state.stats.totalProfitUsd * 0.9;
    state.stats.winRate = state.stats.totalTrades > 0 
      ? ((state.stats.successfulTrades / state.stats.totalTrades) * 100)
      : 0;

    if (state.tradeLogs.length > 50) state.tradeLogs.pop();
  }

  // Cambiar chain
  if (Math.random() > 0.9) {
    const chains = ['base', 'arbitrum', 'optimism'];
    state.stats.currentChain = chains[Math.floor(Math.random() * 3)];
    state.banditStates = state.banditStates.map(b => ({
      ...b,
      selected: b.chain === state.stats.currentChain,
      alpha: b.alpha + (Math.random() > 0.5 ? 0.1 : 0),
      winRate: ((b.alpha / (b.alpha + b.beta)) * 100)
    }));
  }

  // Actualizar chains
  state.chains = state.chains.map(c => ({
    ...c,
    lastTick: Date.now(),
    routes: Math.floor(Math.random() * 10) + 3
  }));
}

// ═══════════════════════════════════════════════════════════════════════════════
// RUTAS API
// ═══════════════════════════════════════════════════════════════════════════════

// GET status
app.get('/api/defi/multichain-arb/status', (req, res) => {
  console.log(`[API] GET /status - running: ${state.isRunning}, ticks: ${state.stats.totalTicks}`);
  res.json(state);
});

// POST start
app.post('/api/defi/multichain-arb/start', (req, res) => {
  console.log('[API] POST /start');
  
  if (state.isRunning) {
    return res.json({ success: false, error: 'Ya está corriendo', isRunning: true });
  }

  state.isRunning = true;
  state.isDryRun = req.body?.dryRun !== false;
  state.startTime = Date.now();
  state.stats.totalTicks = 0;
  state.stats.totalTrades = 0;
  state.stats.successfulTrades = 0;
  state.stats.totalProfitUsd = 0;
  state.stats.netProfitUsd = 0;
  state.stats.winRate = 0;
  state.stats.uptime = 0;

  if (timer) clearInterval(timer);
  timer = setInterval(tick, 500);

  console.log('[API] ✅ Bot iniciado');
  res.json({ success: true, isRunning: true, isDryRun: state.isDryRun });
});

// POST stop
app.post('/api/defi/multichain-arb/stop', (req, res) => {
  console.log('[API] POST /stop');
  
  state.isRunning = false;
  if (timer) {
    clearInterval(timer);
    timer = null;
  }

  console.log('[API] ✅ Bot detenido');
  res.json({ success: true, isRunning: false });
});

// POST reset
app.post('/api/defi/multichain-arb/reset', (req, res) => {
  console.log('[API] POST /reset');
  
  state.stats = {
    totalTicks: 0,
    totalTrades: 0,
    successfulTrades: 0,
    totalProfitUsd: 0,
    totalGasUsd: 0,
    netProfitUsd: 0,
    winRate: 0,
    uptime: 0,
    currentChain: 'base'
  };
  state.tradeLogs = [];
  state.opportunities = [];

  res.json({ success: true });
});

// GET health
app.get('/api/defi/multichain-arb/health', (req, res) => {
  res.json({ status: 'ok', port: PORT, running: state.isRunning });
});

// ═══════════════════════════════════════════════════════════════════════════════
// INICIAR SERVIDOR
// ═══════════════════════════════════════════════════════════════════════════════

app.listen(PORT, () => {
  console.log(`
╔═══════════════════════════════════════════════════════════════╗
║                                                               ║
║   🤖 BOT ARBITRAJE API - ACTIVO                               ║
║                                                               ║
║   ✅ Puerto: ${PORT}                                           ║
║   ✅ URL: http://localhost:${PORT}                             ║
║                                                               ║
║   Endpoints:                                                  ║
║   • GET  /api/defi/multichain-arb/status                     ║
║   • POST /api/defi/multichain-arb/start                      ║
║   • POST /api/defi/multichain-arb/stop                       ║
║   • GET  /api/defi/multichain-arb/health                     ║
║                                                               ║
╚═══════════════════════════════════════════════════════════════╝
  `);
});

process.on('SIGINT', () => {
  console.log('\n[API] Cerrando...');
  if (timer) clearInterval(timer);
  process.exit(0);
});



 * ═══════════════════════════════════════════════════════════════════════════════
 * BOT ARBITRAJE API - SERVIDOR SIMPLE Y FUNCIONAL
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import express from 'express';
import cors from 'cors';

const app = express();
const PORT = 3100;

app.use(cors());
app.use(express.json());

// ═══════════════════════════════════════════════════════════════════════════════
// ESTADO DEL BOT
// ═══════════════════════════════════════════════════════════════════════════════

const state = {
  isRunning: false,
  isDryRun: true,
  startTime: null,
  stats: {
    totalTicks: 0,
    totalTrades: 0,
    successfulTrades: 0,
    totalProfitUsd: 0,
    totalGasUsd: 0,
    netProfitUsd: 0,
    winRate: 0,
    uptime: 0,
    currentChain: 'base'
  },
  chains: [
    { chain: 'base', name: 'Base', chainId: 8453, balance: '0.033309', balanceUsd: 116.58, routes: 5, isActive: true, lastTick: Date.now(), explorer: 'https://basescan.org' },
    { chain: 'arbitrum', name: 'Arbitrum', chainId: 42161, balance: '0.027770', balanceUsd: 97.20, routes: 6, isActive: true, lastTick: Date.now(), explorer: 'https://arbiscan.io' },
    { chain: 'optimism', name: 'Optimism', chainId: 10, balance: '0.023800', balanceUsd: 83.30, routes: 5, isActive: true, lastTick: Date.now(), explorer: 'https://optimistic.etherscan.io' }
  ],
  tradeLogs: [],
  opportunities: [],
  banditStates: [
    { chain: 'base', alpha: 2, beta: 2, winRate: 50, selected: true },
    { chain: 'arbitrum', alpha: 2, beta: 2, winRate: 50, selected: false },
    { chain: 'optimism', alpha: 2, beta: 2, winRate: 50, selected: false }
  ]
};

let timer = null;

// ═══════════════════════════════════════════════════════════════════════════════
// SIMULADOR DE ACTIVIDAD
// ═══════════════════════════════════════════════════════════════════════════════

function tick() {
  if (!state.isRunning) return;

  // Uptime
  state.stats.uptime = Math.floor((Date.now() - state.startTime) / 1000);
  state.stats.totalTicks++;

  // Simular oportunidad
  if (Math.random() > 0.7) {
    state.opportunities.unshift({
      chain: ['base', 'arbitrum', 'optimism'][Math.floor(Math.random() * 3)],
      route: 'WETH-USDC-WETH',
      spreadBps: (Math.random() * 50).toFixed(2),
      potentialProfit: (Math.random() * 5).toFixed(4),
      gasCost: (Math.random() * 0.5).toFixed(4),
      netProfit: (Math.random() * 4).toFixed(4),
      timestamp: Date.now()
    });
    if (state.opportunities.length > 10) state.opportunities.pop();
  }

  // Simular trade
  if (Math.random() > 0.85) {
    const profit = Math.random() * 2;
    const success = Math.random() > 0.2;
    
    state.tradeLogs.unshift({
      id: `tx-${Date.now()}`,
      timestamp: Date.now(),
      chain: ['base', 'arbitrum', 'optimism'][Math.floor(Math.random() * 3)],
      route: 'WETH-USDC-WETH',
      amountIn: (Math.random() * 0.05).toFixed(4),
      amountOut: (Math.random() * 0.055).toFixed(4),
      profit: profit.toFixed(4),
      gasCost: (Math.random() * 0.001).toFixed(5),
      netProfit: profit.toFixed(4),
      txHash: `0x${Math.random().toString(16).slice(2)}`,
      status: success ? 'success' : 'failed'
    });

    state.stats.totalTrades++;
    if (success) state.stats.successfulTrades++;
    state.stats.totalProfitUsd += profit;
    state.stats.netProfitUsd = state.stats.totalProfitUsd * 0.9;
    state.stats.winRate = state.stats.totalTrades > 0 
      ? ((state.stats.successfulTrades / state.stats.totalTrades) * 100)
      : 0;

    if (state.tradeLogs.length > 50) state.tradeLogs.pop();
  }

  // Cambiar chain
  if (Math.random() > 0.9) {
    const chains = ['base', 'arbitrum', 'optimism'];
    state.stats.currentChain = chains[Math.floor(Math.random() * 3)];
    state.banditStates = state.banditStates.map(b => ({
      ...b,
      selected: b.chain === state.stats.currentChain,
      alpha: b.alpha + (Math.random() > 0.5 ? 0.1 : 0),
      winRate: ((b.alpha / (b.alpha + b.beta)) * 100)
    }));
  }

  // Actualizar chains
  state.chains = state.chains.map(c => ({
    ...c,
    lastTick: Date.now(),
    routes: Math.floor(Math.random() * 10) + 3
  }));
}

// ═══════════════════════════════════════════════════════════════════════════════
// RUTAS API
// ═══════════════════════════════════════════════════════════════════════════════

// GET status
app.get('/api/defi/multichain-arb/status', (req, res) => {
  console.log(`[API] GET /status - running: ${state.isRunning}, ticks: ${state.stats.totalTicks}`);
  res.json(state);
});

// POST start
app.post('/api/defi/multichain-arb/start', (req, res) => {
  console.log('[API] POST /start');
  
  if (state.isRunning) {
    return res.json({ success: false, error: 'Ya está corriendo', isRunning: true });
  }

  state.isRunning = true;
  state.isDryRun = req.body?.dryRun !== false;
  state.startTime = Date.now();
  state.stats.totalTicks = 0;
  state.stats.totalTrades = 0;
  state.stats.successfulTrades = 0;
  state.stats.totalProfitUsd = 0;
  state.stats.netProfitUsd = 0;
  state.stats.winRate = 0;
  state.stats.uptime = 0;

  if (timer) clearInterval(timer);
  timer = setInterval(tick, 500);

  console.log('[API] ✅ Bot iniciado');
  res.json({ success: true, isRunning: true, isDryRun: state.isDryRun });
});

// POST stop
app.post('/api/defi/multichain-arb/stop', (req, res) => {
  console.log('[API] POST /stop');
  
  state.isRunning = false;
  if (timer) {
    clearInterval(timer);
    timer = null;
  }

  console.log('[API] ✅ Bot detenido');
  res.json({ success: true, isRunning: false });
});

// POST reset
app.post('/api/defi/multichain-arb/reset', (req, res) => {
  console.log('[API] POST /reset');
  
  state.stats = {
    totalTicks: 0,
    totalTrades: 0,
    successfulTrades: 0,
    totalProfitUsd: 0,
    totalGasUsd: 0,
    netProfitUsd: 0,
    winRate: 0,
    uptime: 0,
    currentChain: 'base'
  };
  state.tradeLogs = [];
  state.opportunities = [];

  res.json({ success: true });
});

// GET health
app.get('/api/defi/multichain-arb/health', (req, res) => {
  res.json({ status: 'ok', port: PORT, running: state.isRunning });
});

// ═══════════════════════════════════════════════════════════════════════════════
// INICIAR SERVIDOR
// ═══════════════════════════════════════════════════════════════════════════════

app.listen(PORT, () => {
  console.log(`
╔═══════════════════════════════════════════════════════════════╗
║                                                               ║
║   🤖 BOT ARBITRAJE API - ACTIVO                               ║
║                                                               ║
║   ✅ Puerto: ${PORT}                                           ║
║   ✅ URL: http://localhost:${PORT}                             ║
║                                                               ║
║   Endpoints:                                                  ║
║   • GET  /api/defi/multichain-arb/status                     ║
║   • POST /api/defi/multichain-arb/start                      ║
║   • POST /api/defi/multichain-arb/stop                       ║
║   • GET  /api/defi/multichain-arb/health                     ║
║                                                               ║
╚═══════════════════════════════════════════════════════════════╝
  `);
});

process.on('SIGINT', () => {
  console.log('\n[API] Cerrando...');
  if (timer) clearInterval(timer);
  process.exit(0);
});


 * ═══════════════════════════════════════════════════════════════════════════════
 * BOT ARBITRAJE API - SERVIDOR SIMPLE Y FUNCIONAL
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import express from 'express';
import cors from 'cors';

const app = express();
const PORT = 3100;

app.use(cors());
app.use(express.json());

// ═══════════════════════════════════════════════════════════════════════════════
// ESTADO DEL BOT
// ═══════════════════════════════════════════════════════════════════════════════

const state = {
  isRunning: false,
  isDryRun: true,
  startTime: null,
  stats: {
    totalTicks: 0,
    totalTrades: 0,
    successfulTrades: 0,
    totalProfitUsd: 0,
    totalGasUsd: 0,
    netProfitUsd: 0,
    winRate: 0,
    uptime: 0,
    currentChain: 'base'
  },
  chains: [
    { chain: 'base', name: 'Base', chainId: 8453, balance: '0.033309', balanceUsd: 116.58, routes: 5, isActive: true, lastTick: Date.now(), explorer: 'https://basescan.org' },
    { chain: 'arbitrum', name: 'Arbitrum', chainId: 42161, balance: '0.027770', balanceUsd: 97.20, routes: 6, isActive: true, lastTick: Date.now(), explorer: 'https://arbiscan.io' },
    { chain: 'optimism', name: 'Optimism', chainId: 10, balance: '0.023800', balanceUsd: 83.30, routes: 5, isActive: true, lastTick: Date.now(), explorer: 'https://optimistic.etherscan.io' }
  ],
  tradeLogs: [],
  opportunities: [],
  banditStates: [
    { chain: 'base', alpha: 2, beta: 2, winRate: 50, selected: true },
    { chain: 'arbitrum', alpha: 2, beta: 2, winRate: 50, selected: false },
    { chain: 'optimism', alpha: 2, beta: 2, winRate: 50, selected: false }
  ]
};

let timer = null;

// ═══════════════════════════════════════════════════════════════════════════════
// SIMULADOR DE ACTIVIDAD
// ═══════════════════════════════════════════════════════════════════════════════

function tick() {
  if (!state.isRunning) return;

  // Uptime
  state.stats.uptime = Math.floor((Date.now() - state.startTime) / 1000);
  state.stats.totalTicks++;

  // Simular oportunidad
  if (Math.random() > 0.7) {
    state.opportunities.unshift({
      chain: ['base', 'arbitrum', 'optimism'][Math.floor(Math.random() * 3)],
      route: 'WETH-USDC-WETH',
      spreadBps: (Math.random() * 50).toFixed(2),
      potentialProfit: (Math.random() * 5).toFixed(4),
      gasCost: (Math.random() * 0.5).toFixed(4),
      netProfit: (Math.random() * 4).toFixed(4),
      timestamp: Date.now()
    });
    if (state.opportunities.length > 10) state.opportunities.pop();
  }

  // Simular trade
  if (Math.random() > 0.85) {
    const profit = Math.random() * 2;
    const success = Math.random() > 0.2;
    
    state.tradeLogs.unshift({
      id: `tx-${Date.now()}`,
      timestamp: Date.now(),
      chain: ['base', 'arbitrum', 'optimism'][Math.floor(Math.random() * 3)],
      route: 'WETH-USDC-WETH',
      amountIn: (Math.random() * 0.05).toFixed(4),
      amountOut: (Math.random() * 0.055).toFixed(4),
      profit: profit.toFixed(4),
      gasCost: (Math.random() * 0.001).toFixed(5),
      netProfit: profit.toFixed(4),
      txHash: `0x${Math.random().toString(16).slice(2)}`,
      status: success ? 'success' : 'failed'
    });

    state.stats.totalTrades++;
    if (success) state.stats.successfulTrades++;
    state.stats.totalProfitUsd += profit;
    state.stats.netProfitUsd = state.stats.totalProfitUsd * 0.9;
    state.stats.winRate = state.stats.totalTrades > 0 
      ? ((state.stats.successfulTrades / state.stats.totalTrades) * 100)
      : 0;

    if (state.tradeLogs.length > 50) state.tradeLogs.pop();
  }

  // Cambiar chain
  if (Math.random() > 0.9) {
    const chains = ['base', 'arbitrum', 'optimism'];
    state.stats.currentChain = chains[Math.floor(Math.random() * 3)];
    state.banditStates = state.banditStates.map(b => ({
      ...b,
      selected: b.chain === state.stats.currentChain,
      alpha: b.alpha + (Math.random() > 0.5 ? 0.1 : 0),
      winRate: ((b.alpha / (b.alpha + b.beta)) * 100)
    }));
  }

  // Actualizar chains
  state.chains = state.chains.map(c => ({
    ...c,
    lastTick: Date.now(),
    routes: Math.floor(Math.random() * 10) + 3
  }));
}

// ═══════════════════════════════════════════════════════════════════════════════
// RUTAS API
// ═══════════════════════════════════════════════════════════════════════════════

// GET status
app.get('/api/defi/multichain-arb/status', (req, res) => {
  console.log(`[API] GET /status - running: ${state.isRunning}, ticks: ${state.stats.totalTicks}`);
  res.json(state);
});

// POST start
app.post('/api/defi/multichain-arb/start', (req, res) => {
  console.log('[API] POST /start');
  
  if (state.isRunning) {
    return res.json({ success: false, error: 'Ya está corriendo', isRunning: true });
  }

  state.isRunning = true;
  state.isDryRun = req.body?.dryRun !== false;
  state.startTime = Date.now();
  state.stats.totalTicks = 0;
  state.stats.totalTrades = 0;
  state.stats.successfulTrades = 0;
  state.stats.totalProfitUsd = 0;
  state.stats.netProfitUsd = 0;
  state.stats.winRate = 0;
  state.stats.uptime = 0;

  if (timer) clearInterval(timer);
  timer = setInterval(tick, 500);

  console.log('[API] ✅ Bot iniciado');
  res.json({ success: true, isRunning: true, isDryRun: state.isDryRun });
});

// POST stop
app.post('/api/defi/multichain-arb/stop', (req, res) => {
  console.log('[API] POST /stop');
  
  state.isRunning = false;
  if (timer) {
    clearInterval(timer);
    timer = null;
  }

  console.log('[API] ✅ Bot detenido');
  res.json({ success: true, isRunning: false });
});

// POST reset
app.post('/api/defi/multichain-arb/reset', (req, res) => {
  console.log('[API] POST /reset');
  
  state.stats = {
    totalTicks: 0,
    totalTrades: 0,
    successfulTrades: 0,
    totalProfitUsd: 0,
    totalGasUsd: 0,
    netProfitUsd: 0,
    winRate: 0,
    uptime: 0,
    currentChain: 'base'
  };
  state.tradeLogs = [];
  state.opportunities = [];

  res.json({ success: true });
});

// GET health
app.get('/api/defi/multichain-arb/health', (req, res) => {
  res.json({ status: 'ok', port: PORT, running: state.isRunning });
});

// ═══════════════════════════════════════════════════════════════════════════════
// INICIAR SERVIDOR
// ═══════════════════════════════════════════════════════════════════════════════

app.listen(PORT, () => {
  console.log(`
╔═══════════════════════════════════════════════════════════════╗
║                                                               ║
║   🤖 BOT ARBITRAJE API - ACTIVO                               ║
║                                                               ║
║   ✅ Puerto: ${PORT}                                           ║
║   ✅ URL: http://localhost:${PORT}                             ║
║                                                               ║
║   Endpoints:                                                  ║
║   • GET  /api/defi/multichain-arb/status                     ║
║   • POST /api/defi/multichain-arb/start                      ║
║   • POST /api/defi/multichain-arb/stop                       ║
║   • GET  /api/defi/multichain-arb/health                     ║
║                                                               ║
╚═══════════════════════════════════════════════════════════════╝
  `);
});

process.on('SIGINT', () => {
  console.log('\n[API] Cerrando...');
  if (timer) clearInterval(timer);
  process.exit(0);
});



 * ═══════════════════════════════════════════════════════════════════════════════
 * BOT ARBITRAJE API - SERVIDOR SIMPLE Y FUNCIONAL
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import express from 'express';
import cors from 'cors';

const app = express();
const PORT = 3100;

app.use(cors());
app.use(express.json());

// ═══════════════════════════════════════════════════════════════════════════════
// ESTADO DEL BOT
// ═══════════════════════════════════════════════════════════════════════════════

const state = {
  isRunning: false,
  isDryRun: true,
  startTime: null,
  stats: {
    totalTicks: 0,
    totalTrades: 0,
    successfulTrades: 0,
    totalProfitUsd: 0,
    totalGasUsd: 0,
    netProfitUsd: 0,
    winRate: 0,
    uptime: 0,
    currentChain: 'base'
  },
  chains: [
    { chain: 'base', name: 'Base', chainId: 8453, balance: '0.033309', balanceUsd: 116.58, routes: 5, isActive: true, lastTick: Date.now(), explorer: 'https://basescan.org' },
    { chain: 'arbitrum', name: 'Arbitrum', chainId: 42161, balance: '0.027770', balanceUsd: 97.20, routes: 6, isActive: true, lastTick: Date.now(), explorer: 'https://arbiscan.io' },
    { chain: 'optimism', name: 'Optimism', chainId: 10, balance: '0.023800', balanceUsd: 83.30, routes: 5, isActive: true, lastTick: Date.now(), explorer: 'https://optimistic.etherscan.io' }
  ],
  tradeLogs: [],
  opportunities: [],
  banditStates: [
    { chain: 'base', alpha: 2, beta: 2, winRate: 50, selected: true },
    { chain: 'arbitrum', alpha: 2, beta: 2, winRate: 50, selected: false },
    { chain: 'optimism', alpha: 2, beta: 2, winRate: 50, selected: false }
  ]
};

let timer = null;

// ═══════════════════════════════════════════════════════════════════════════════
// SIMULADOR DE ACTIVIDAD
// ═══════════════════════════════════════════════════════════════════════════════

function tick() {
  if (!state.isRunning) return;

  // Uptime
  state.stats.uptime = Math.floor((Date.now() - state.startTime) / 1000);
  state.stats.totalTicks++;

  // Simular oportunidad
  if (Math.random() > 0.7) {
    state.opportunities.unshift({
      chain: ['base', 'arbitrum', 'optimism'][Math.floor(Math.random() * 3)],
      route: 'WETH-USDC-WETH',
      spreadBps: (Math.random() * 50).toFixed(2),
      potentialProfit: (Math.random() * 5).toFixed(4),
      gasCost: (Math.random() * 0.5).toFixed(4),
      netProfit: (Math.random() * 4).toFixed(4),
      timestamp: Date.now()
    });
    if (state.opportunities.length > 10) state.opportunities.pop();
  }

  // Simular trade
  if (Math.random() > 0.85) {
    const profit = Math.random() * 2;
    const success = Math.random() > 0.2;
    
    state.tradeLogs.unshift({
      id: `tx-${Date.now()}`,
      timestamp: Date.now(),
      chain: ['base', 'arbitrum', 'optimism'][Math.floor(Math.random() * 3)],
      route: 'WETH-USDC-WETH',
      amountIn: (Math.random() * 0.05).toFixed(4),
      amountOut: (Math.random() * 0.055).toFixed(4),
      profit: profit.toFixed(4),
      gasCost: (Math.random() * 0.001).toFixed(5),
      netProfit: profit.toFixed(4),
      txHash: `0x${Math.random().toString(16).slice(2)}`,
      status: success ? 'success' : 'failed'
    });

    state.stats.totalTrades++;
    if (success) state.stats.successfulTrades++;
    state.stats.totalProfitUsd += profit;
    state.stats.netProfitUsd = state.stats.totalProfitUsd * 0.9;
    state.stats.winRate = state.stats.totalTrades > 0 
      ? ((state.stats.successfulTrades / state.stats.totalTrades) * 100)
      : 0;

    if (state.tradeLogs.length > 50) state.tradeLogs.pop();
  }

  // Cambiar chain
  if (Math.random() > 0.9) {
    const chains = ['base', 'arbitrum', 'optimism'];
    state.stats.currentChain = chains[Math.floor(Math.random() * 3)];
    state.banditStates = state.banditStates.map(b => ({
      ...b,
      selected: b.chain === state.stats.currentChain,
      alpha: b.alpha + (Math.random() > 0.5 ? 0.1 : 0),
      winRate: ((b.alpha / (b.alpha + b.beta)) * 100)
    }));
  }

  // Actualizar chains
  state.chains = state.chains.map(c => ({
    ...c,
    lastTick: Date.now(),
    routes: Math.floor(Math.random() * 10) + 3
  }));
}

// ═══════════════════════════════════════════════════════════════════════════════
// RUTAS API
// ═══════════════════════════════════════════════════════════════════════════════

// GET status
app.get('/api/defi/multichain-arb/status', (req, res) => {
  console.log(`[API] GET /status - running: ${state.isRunning}, ticks: ${state.stats.totalTicks}`);
  res.json(state);
});

// POST start
app.post('/api/defi/multichain-arb/start', (req, res) => {
  console.log('[API] POST /start');
  
  if (state.isRunning) {
    return res.json({ success: false, error: 'Ya está corriendo', isRunning: true });
  }

  state.isRunning = true;
  state.isDryRun = req.body?.dryRun !== false;
  state.startTime = Date.now();
  state.stats.totalTicks = 0;
  state.stats.totalTrades = 0;
  state.stats.successfulTrades = 0;
  state.stats.totalProfitUsd = 0;
  state.stats.netProfitUsd = 0;
  state.stats.winRate = 0;
  state.stats.uptime = 0;

  if (timer) clearInterval(timer);
  timer = setInterval(tick, 500);

  console.log('[API] ✅ Bot iniciado');
  res.json({ success: true, isRunning: true, isDryRun: state.isDryRun });
});

// POST stop
app.post('/api/defi/multichain-arb/stop', (req, res) => {
  console.log('[API] POST /stop');
  
  state.isRunning = false;
  if (timer) {
    clearInterval(timer);
    timer = null;
  }

  console.log('[API] ✅ Bot detenido');
  res.json({ success: true, isRunning: false });
});

// POST reset
app.post('/api/defi/multichain-arb/reset', (req, res) => {
  console.log('[API] POST /reset');
  
  state.stats = {
    totalTicks: 0,
    totalTrades: 0,
    successfulTrades: 0,
    totalProfitUsd: 0,
    totalGasUsd: 0,
    netProfitUsd: 0,
    winRate: 0,
    uptime: 0,
    currentChain: 'base'
  };
  state.tradeLogs = [];
  state.opportunities = [];

  res.json({ success: true });
});

// GET health
app.get('/api/defi/multichain-arb/health', (req, res) => {
  res.json({ status: 'ok', port: PORT, running: state.isRunning });
});

// ═══════════════════════════════════════════════════════════════════════════════
// INICIAR SERVIDOR
// ═══════════════════════════════════════════════════════════════════════════════

app.listen(PORT, () => {
  console.log(`
╔═══════════════════════════════════════════════════════════════╗
║                                                               ║
║   🤖 BOT ARBITRAJE API - ACTIVO                               ║
║                                                               ║
║   ✅ Puerto: ${PORT}                                           ║
║   ✅ URL: http://localhost:${PORT}                             ║
║                                                               ║
║   Endpoints:                                                  ║
║   • GET  /api/defi/multichain-arb/status                     ║
║   • POST /api/defi/multichain-arb/start                      ║
║   • POST /api/defi/multichain-arb/stop                       ║
║   • GET  /api/defi/multichain-arb/health                     ║
║                                                               ║
╚═══════════════════════════════════════════════════════════════╝
  `);
});

process.on('SIGINT', () => {
  console.log('\n[API] Cerrando...');
  if (timer) clearInterval(timer);
  process.exit(0);
});


 * ═══════════════════════════════════════════════════════════════════════════════
 * BOT ARBITRAJE API - SERVIDOR SIMPLE Y FUNCIONAL
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import express from 'express';
import cors from 'cors';

const app = express();
const PORT = 3100;

app.use(cors());
app.use(express.json());

// ═══════════════════════════════════════════════════════════════════════════════
// ESTADO DEL BOT
// ═══════════════════════════════════════════════════════════════════════════════

const state = {
  isRunning: false,
  isDryRun: true,
  startTime: null,
  stats: {
    totalTicks: 0,
    totalTrades: 0,
    successfulTrades: 0,
    totalProfitUsd: 0,
    totalGasUsd: 0,
    netProfitUsd: 0,
    winRate: 0,
    uptime: 0,
    currentChain: 'base'
  },
  chains: [
    { chain: 'base', name: 'Base', chainId: 8453, balance: '0.033309', balanceUsd: 116.58, routes: 5, isActive: true, lastTick: Date.now(), explorer: 'https://basescan.org' },
    { chain: 'arbitrum', name: 'Arbitrum', chainId: 42161, balance: '0.027770', balanceUsd: 97.20, routes: 6, isActive: true, lastTick: Date.now(), explorer: 'https://arbiscan.io' },
    { chain: 'optimism', name: 'Optimism', chainId: 10, balance: '0.023800', balanceUsd: 83.30, routes: 5, isActive: true, lastTick: Date.now(), explorer: 'https://optimistic.etherscan.io' }
  ],
  tradeLogs: [],
  opportunities: [],
  banditStates: [
    { chain: 'base', alpha: 2, beta: 2, winRate: 50, selected: true },
    { chain: 'arbitrum', alpha: 2, beta: 2, winRate: 50, selected: false },
    { chain: 'optimism', alpha: 2, beta: 2, winRate: 50, selected: false }
  ]
};

let timer = null;

// ═══════════════════════════════════════════════════════════════════════════════
// SIMULADOR DE ACTIVIDAD
// ═══════════════════════════════════════════════════════════════════════════════

function tick() {
  if (!state.isRunning) return;

  // Uptime
  state.stats.uptime = Math.floor((Date.now() - state.startTime) / 1000);
  state.stats.totalTicks++;

  // Simular oportunidad
  if (Math.random() > 0.7) {
    state.opportunities.unshift({
      chain: ['base', 'arbitrum', 'optimism'][Math.floor(Math.random() * 3)],
      route: 'WETH-USDC-WETH',
      spreadBps: (Math.random() * 50).toFixed(2),
      potentialProfit: (Math.random() * 5).toFixed(4),
      gasCost: (Math.random() * 0.5).toFixed(4),
      netProfit: (Math.random() * 4).toFixed(4),
      timestamp: Date.now()
    });
    if (state.opportunities.length > 10) state.opportunities.pop();
  }

  // Simular trade
  if (Math.random() > 0.85) {
    const profit = Math.random() * 2;
    const success = Math.random() > 0.2;
    
    state.tradeLogs.unshift({
      id: `tx-${Date.now()}`,
      timestamp: Date.now(),
      chain: ['base', 'arbitrum', 'optimism'][Math.floor(Math.random() * 3)],
      route: 'WETH-USDC-WETH',
      amountIn: (Math.random() * 0.05).toFixed(4),
      amountOut: (Math.random() * 0.055).toFixed(4),
      profit: profit.toFixed(4),
      gasCost: (Math.random() * 0.001).toFixed(5),
      netProfit: profit.toFixed(4),
      txHash: `0x${Math.random().toString(16).slice(2)}`,
      status: success ? 'success' : 'failed'
    });

    state.stats.totalTrades++;
    if (success) state.stats.successfulTrades++;
    state.stats.totalProfitUsd += profit;
    state.stats.netProfitUsd = state.stats.totalProfitUsd * 0.9;
    state.stats.winRate = state.stats.totalTrades > 0 
      ? ((state.stats.successfulTrades / state.stats.totalTrades) * 100)
      : 0;

    if (state.tradeLogs.length > 50) state.tradeLogs.pop();
  }

  // Cambiar chain
  if (Math.random() > 0.9) {
    const chains = ['base', 'arbitrum', 'optimism'];
    state.stats.currentChain = chains[Math.floor(Math.random() * 3)];
    state.banditStates = state.banditStates.map(b => ({
      ...b,
      selected: b.chain === state.stats.currentChain,
      alpha: b.alpha + (Math.random() > 0.5 ? 0.1 : 0),
      winRate: ((b.alpha / (b.alpha + b.beta)) * 100)
    }));
  }

  // Actualizar chains
  state.chains = state.chains.map(c => ({
    ...c,
    lastTick: Date.now(),
    routes: Math.floor(Math.random() * 10) + 3
  }));
}

// ═══════════════════════════════════════════════════════════════════════════════
// RUTAS API
// ═══════════════════════════════════════════════════════════════════════════════

// GET status
app.get('/api/defi/multichain-arb/status', (req, res) => {
  console.log(`[API] GET /status - running: ${state.isRunning}, ticks: ${state.stats.totalTicks}`);
  res.json(state);
});

// POST start
app.post('/api/defi/multichain-arb/start', (req, res) => {
  console.log('[API] POST /start');
  
  if (state.isRunning) {
    return res.json({ success: false, error: 'Ya está corriendo', isRunning: true });
  }

  state.isRunning = true;
  state.isDryRun = req.body?.dryRun !== false;
  state.startTime = Date.now();
  state.stats.totalTicks = 0;
  state.stats.totalTrades = 0;
  state.stats.successfulTrades = 0;
  state.stats.totalProfitUsd = 0;
  state.stats.netProfitUsd = 0;
  state.stats.winRate = 0;
  state.stats.uptime = 0;

  if (timer) clearInterval(timer);
  timer = setInterval(tick, 500);

  console.log('[API] ✅ Bot iniciado');
  res.json({ success: true, isRunning: true, isDryRun: state.isDryRun });
});

// POST stop
app.post('/api/defi/multichain-arb/stop', (req, res) => {
  console.log('[API] POST /stop');
  
  state.isRunning = false;
  if (timer) {
    clearInterval(timer);
    timer = null;
  }

  console.log('[API] ✅ Bot detenido');
  res.json({ success: true, isRunning: false });
});

// POST reset
app.post('/api/defi/multichain-arb/reset', (req, res) => {
  console.log('[API] POST /reset');
  
  state.stats = {
    totalTicks: 0,
    totalTrades: 0,
    successfulTrades: 0,
    totalProfitUsd: 0,
    totalGasUsd: 0,
    netProfitUsd: 0,
    winRate: 0,
    uptime: 0,
    currentChain: 'base'
  };
  state.tradeLogs = [];
  state.opportunities = [];

  res.json({ success: true });
});

// GET health
app.get('/api/defi/multichain-arb/health', (req, res) => {
  res.json({ status: 'ok', port: PORT, running: state.isRunning });
});

// ═══════════════════════════════════════════════════════════════════════════════
// INICIAR SERVIDOR
// ═══════════════════════════════════════════════════════════════════════════════

app.listen(PORT, () => {
  console.log(`
╔═══════════════════════════════════════════════════════════════╗
║                                                               ║
║   🤖 BOT ARBITRAJE API - ACTIVO                               ║
║                                                               ║
║   ✅ Puerto: ${PORT}                                           ║
║   ✅ URL: http://localhost:${PORT}                             ║
║                                                               ║
║   Endpoints:                                                  ║
║   • GET  /api/defi/multichain-arb/status                     ║
║   • POST /api/defi/multichain-arb/start                      ║
║   • POST /api/defi/multichain-arb/stop                       ║
║   • GET  /api/defi/multichain-arb/health                     ║
║                                                               ║
╚═══════════════════════════════════════════════════════════════╝
  `);
});

process.on('SIGINT', () => {
  console.log('\n[API] Cerrando...');
  if (timer) clearInterval(timer);
  process.exit(0);
});


 * ═══════════════════════════════════════════════════════════════════════════════
 * BOT ARBITRAJE API - SERVIDOR SIMPLE Y FUNCIONAL
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import express from 'express';
import cors from 'cors';

const app = express();
const PORT = 3100;

app.use(cors());
app.use(express.json());

// ═══════════════════════════════════════════════════════════════════════════════
// ESTADO DEL BOT
// ═══════════════════════════════════════════════════════════════════════════════

const state = {
  isRunning: false,
  isDryRun: true,
  startTime: null,
  stats: {
    totalTicks: 0,
    totalTrades: 0,
    successfulTrades: 0,
    totalProfitUsd: 0,
    totalGasUsd: 0,
    netProfitUsd: 0,
    winRate: 0,
    uptime: 0,
    currentChain: 'base'
  },
  chains: [
    { chain: 'base', name: 'Base', chainId: 8453, balance: '0.033309', balanceUsd: 116.58, routes: 5, isActive: true, lastTick: Date.now(), explorer: 'https://basescan.org' },
    { chain: 'arbitrum', name: 'Arbitrum', chainId: 42161, balance: '0.027770', balanceUsd: 97.20, routes: 6, isActive: true, lastTick: Date.now(), explorer: 'https://arbiscan.io' },
    { chain: 'optimism', name: 'Optimism', chainId: 10, balance: '0.023800', balanceUsd: 83.30, routes: 5, isActive: true, lastTick: Date.now(), explorer: 'https://optimistic.etherscan.io' }
  ],
  tradeLogs: [],
  opportunities: [],
  banditStates: [
    { chain: 'base', alpha: 2, beta: 2, winRate: 50, selected: true },
    { chain: 'arbitrum', alpha: 2, beta: 2, winRate: 50, selected: false },
    { chain: 'optimism', alpha: 2, beta: 2, winRate: 50, selected: false }
  ]
};

let timer = null;

// ═══════════════════════════════════════════════════════════════════════════════
// SIMULADOR DE ACTIVIDAD
// ═══════════════════════════════════════════════════════════════════════════════

function tick() {
  if (!state.isRunning) return;

  // Uptime
  state.stats.uptime = Math.floor((Date.now() - state.startTime) / 1000);
  state.stats.totalTicks++;

  // Simular oportunidad
  if (Math.random() > 0.7) {
    state.opportunities.unshift({
      chain: ['base', 'arbitrum', 'optimism'][Math.floor(Math.random() * 3)],
      route: 'WETH-USDC-WETH',
      spreadBps: (Math.random() * 50).toFixed(2),
      potentialProfit: (Math.random() * 5).toFixed(4),
      gasCost: (Math.random() * 0.5).toFixed(4),
      netProfit: (Math.random() * 4).toFixed(4),
      timestamp: Date.now()
    });
    if (state.opportunities.length > 10) state.opportunities.pop();
  }

  // Simular trade
  if (Math.random() > 0.85) {
    const profit = Math.random() * 2;
    const success = Math.random() > 0.2;
    
    state.tradeLogs.unshift({
      id: `tx-${Date.now()}`,
      timestamp: Date.now(),
      chain: ['base', 'arbitrum', 'optimism'][Math.floor(Math.random() * 3)],
      route: 'WETH-USDC-WETH',
      amountIn: (Math.random() * 0.05).toFixed(4),
      amountOut: (Math.random() * 0.055).toFixed(4),
      profit: profit.toFixed(4),
      gasCost: (Math.random() * 0.001).toFixed(5),
      netProfit: profit.toFixed(4),
      txHash: `0x${Math.random().toString(16).slice(2)}`,
      status: success ? 'success' : 'failed'
    });

    state.stats.totalTrades++;
    if (success) state.stats.successfulTrades++;
    state.stats.totalProfitUsd += profit;
    state.stats.netProfitUsd = state.stats.totalProfitUsd * 0.9;
    state.stats.winRate = state.stats.totalTrades > 0 
      ? ((state.stats.successfulTrades / state.stats.totalTrades) * 100)
      : 0;

    if (state.tradeLogs.length > 50) state.tradeLogs.pop();
  }

  // Cambiar chain
  if (Math.random() > 0.9) {
    const chains = ['base', 'arbitrum', 'optimism'];
    state.stats.currentChain = chains[Math.floor(Math.random() * 3)];
    state.banditStates = state.banditStates.map(b => ({
      ...b,
      selected: b.chain === state.stats.currentChain,
      alpha: b.alpha + (Math.random() > 0.5 ? 0.1 : 0),
      winRate: ((b.alpha / (b.alpha + b.beta)) * 100)
    }));
  }

  // Actualizar chains
  state.chains = state.chains.map(c => ({
    ...c,
    lastTick: Date.now(),
    routes: Math.floor(Math.random() * 10) + 3
  }));
}

// ═══════════════════════════════════════════════════════════════════════════════
// RUTAS API
// ═══════════════════════════════════════════════════════════════════════════════

// GET status
app.get('/api/defi/multichain-arb/status', (req, res) => {
  console.log(`[API] GET /status - running: ${state.isRunning}, ticks: ${state.stats.totalTicks}`);
  res.json(state);
});

// POST start
app.post('/api/defi/multichain-arb/start', (req, res) => {
  console.log('[API] POST /start');
  
  if (state.isRunning) {
    return res.json({ success: false, error: 'Ya está corriendo', isRunning: true });
  }

  state.isRunning = true;
  state.isDryRun = req.body?.dryRun !== false;
  state.startTime = Date.now();
  state.stats.totalTicks = 0;
  state.stats.totalTrades = 0;
  state.stats.successfulTrades = 0;
  state.stats.totalProfitUsd = 0;
  state.stats.netProfitUsd = 0;
  state.stats.winRate = 0;
  state.stats.uptime = 0;

  if (timer) clearInterval(timer);
  timer = setInterval(tick, 500);

  console.log('[API] ✅ Bot iniciado');
  res.json({ success: true, isRunning: true, isDryRun: state.isDryRun });
});

// POST stop
app.post('/api/defi/multichain-arb/stop', (req, res) => {
  console.log('[API] POST /stop');
  
  state.isRunning = false;
  if (timer) {
    clearInterval(timer);
    timer = null;
  }

  console.log('[API] ✅ Bot detenido');
  res.json({ success: true, isRunning: false });
});

// POST reset
app.post('/api/defi/multichain-arb/reset', (req, res) => {
  console.log('[API] POST /reset');
  
  state.stats = {
    totalTicks: 0,
    totalTrades: 0,
    successfulTrades: 0,
    totalProfitUsd: 0,
    totalGasUsd: 0,
    netProfitUsd: 0,
    winRate: 0,
    uptime: 0,
    currentChain: 'base'
  };
  state.tradeLogs = [];
  state.opportunities = [];

  res.json({ success: true });
});

// GET health
app.get('/api/defi/multichain-arb/health', (req, res) => {
  res.json({ status: 'ok', port: PORT, running: state.isRunning });
});

// ═══════════════════════════════════════════════════════════════════════════════
// INICIAR SERVIDOR
// ═══════════════════════════════════════════════════════════════════════════════

app.listen(PORT, () => {
  console.log(`
╔═══════════════════════════════════════════════════════════════╗
║                                                               ║
║   🤖 BOT ARBITRAJE API - ACTIVO                               ║
║                                                               ║
║   ✅ Puerto: ${PORT}                                           ║
║   ✅ URL: http://localhost:${PORT}                             ║
║                                                               ║
║   Endpoints:                                                  ║
║   • GET  /api/defi/multichain-arb/status                     ║
║   • POST /api/defi/multichain-arb/start                      ║
║   • POST /api/defi/multichain-arb/stop                       ║
║   • GET  /api/defi/multichain-arb/health                     ║
║                                                               ║
╚═══════════════════════════════════════════════════════════════╝
  `);
});

process.on('SIGINT', () => {
  console.log('\n[API] Cerrando...');
  if (timer) clearInterval(timer);
  process.exit(0);
});


 * ═══════════════════════════════════════════════════════════════════════════════
 * BOT ARBITRAJE API - SERVIDOR SIMPLE Y FUNCIONAL
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import express from 'express';
import cors from 'cors';

const app = express();
const PORT = 3100;

app.use(cors());
app.use(express.json());

// ═══════════════════════════════════════════════════════════════════════════════
// ESTADO DEL BOT
// ═══════════════════════════════════════════════════════════════════════════════

const state = {
  isRunning: false,
  isDryRun: true,
  startTime: null,
  stats: {
    totalTicks: 0,
    totalTrades: 0,
    successfulTrades: 0,
    totalProfitUsd: 0,
    totalGasUsd: 0,
    netProfitUsd: 0,
    winRate: 0,
    uptime: 0,
    currentChain: 'base'
  },
  chains: [
    { chain: 'base', name: 'Base', chainId: 8453, balance: '0.033309', balanceUsd: 116.58, routes: 5, isActive: true, lastTick: Date.now(), explorer: 'https://basescan.org' },
    { chain: 'arbitrum', name: 'Arbitrum', chainId: 42161, balance: '0.027770', balanceUsd: 97.20, routes: 6, isActive: true, lastTick: Date.now(), explorer: 'https://arbiscan.io' },
    { chain: 'optimism', name: 'Optimism', chainId: 10, balance: '0.023800', balanceUsd: 83.30, routes: 5, isActive: true, lastTick: Date.now(), explorer: 'https://optimistic.etherscan.io' }
  ],
  tradeLogs: [],
  opportunities: [],
  banditStates: [
    { chain: 'base', alpha: 2, beta: 2, winRate: 50, selected: true },
    { chain: 'arbitrum', alpha: 2, beta: 2, winRate: 50, selected: false },
    { chain: 'optimism', alpha: 2, beta: 2, winRate: 50, selected: false }
  ]
};

let timer = null;

// ═══════════════════════════════════════════════════════════════════════════════
// SIMULADOR DE ACTIVIDAD
// ═══════════════════════════════════════════════════════════════════════════════

function tick() {
  if (!state.isRunning) return;

  // Uptime
  state.stats.uptime = Math.floor((Date.now() - state.startTime) / 1000);
  state.stats.totalTicks++;

  // Simular oportunidad
  if (Math.random() > 0.7) {
    state.opportunities.unshift({
      chain: ['base', 'arbitrum', 'optimism'][Math.floor(Math.random() * 3)],
      route: 'WETH-USDC-WETH',
      spreadBps: (Math.random() * 50).toFixed(2),
      potentialProfit: (Math.random() * 5).toFixed(4),
      gasCost: (Math.random() * 0.5).toFixed(4),
      netProfit: (Math.random() * 4).toFixed(4),
      timestamp: Date.now()
    });
    if (state.opportunities.length > 10) state.opportunities.pop();
  }

  // Simular trade
  if (Math.random() > 0.85) {
    const profit = Math.random() * 2;
    const success = Math.random() > 0.2;
    
    state.tradeLogs.unshift({
      id: `tx-${Date.now()}`,
      timestamp: Date.now(),
      chain: ['base', 'arbitrum', 'optimism'][Math.floor(Math.random() * 3)],
      route: 'WETH-USDC-WETH',
      amountIn: (Math.random() * 0.05).toFixed(4),
      amountOut: (Math.random() * 0.055).toFixed(4),
      profit: profit.toFixed(4),
      gasCost: (Math.random() * 0.001).toFixed(5),
      netProfit: profit.toFixed(4),
      txHash: `0x${Math.random().toString(16).slice(2)}`,
      status: success ? 'success' : 'failed'
    });

    state.stats.totalTrades++;
    if (success) state.stats.successfulTrades++;
    state.stats.totalProfitUsd += profit;
    state.stats.netProfitUsd = state.stats.totalProfitUsd * 0.9;
    state.stats.winRate = state.stats.totalTrades > 0 
      ? ((state.stats.successfulTrades / state.stats.totalTrades) * 100)
      : 0;

    if (state.tradeLogs.length > 50) state.tradeLogs.pop();
  }

  // Cambiar chain
  if (Math.random() > 0.9) {
    const chains = ['base', 'arbitrum', 'optimism'];
    state.stats.currentChain = chains[Math.floor(Math.random() * 3)];
    state.banditStates = state.banditStates.map(b => ({
      ...b,
      selected: b.chain === state.stats.currentChain,
      alpha: b.alpha + (Math.random() > 0.5 ? 0.1 : 0),
      winRate: ((b.alpha / (b.alpha + b.beta)) * 100)
    }));
  }

  // Actualizar chains
  state.chains = state.chains.map(c => ({
    ...c,
    lastTick: Date.now(),
    routes: Math.floor(Math.random() * 10) + 3
  }));
}

// ═══════════════════════════════════════════════════════════════════════════════
// RUTAS API
// ═══════════════════════════════════════════════════════════════════════════════

// GET status
app.get('/api/defi/multichain-arb/status', (req, res) => {
  console.log(`[API] GET /status - running: ${state.isRunning}, ticks: ${state.stats.totalTicks}`);
  res.json(state);
});

// POST start
app.post('/api/defi/multichain-arb/start', (req, res) => {
  console.log('[API] POST /start');
  
  if (state.isRunning) {
    return res.json({ success: false, error: 'Ya está corriendo', isRunning: true });
  }

  state.isRunning = true;
  state.isDryRun = req.body?.dryRun !== false;
  state.startTime = Date.now();
  state.stats.totalTicks = 0;
  state.stats.totalTrades = 0;
  state.stats.successfulTrades = 0;
  state.stats.totalProfitUsd = 0;
  state.stats.netProfitUsd = 0;
  state.stats.winRate = 0;
  state.stats.uptime = 0;

  if (timer) clearInterval(timer);
  timer = setInterval(tick, 500);

  console.log('[API] ✅ Bot iniciado');
  res.json({ success: true, isRunning: true, isDryRun: state.isDryRun });
});

// POST stop
app.post('/api/defi/multichain-arb/stop', (req, res) => {
  console.log('[API] POST /stop');
  
  state.isRunning = false;
  if (timer) {
    clearInterval(timer);
    timer = null;
  }

  console.log('[API] ✅ Bot detenido');
  res.json({ success: true, isRunning: false });
});

// POST reset
app.post('/api/defi/multichain-arb/reset', (req, res) => {
  console.log('[API] POST /reset');
  
  state.stats = {
    totalTicks: 0,
    totalTrades: 0,
    successfulTrades: 0,
    totalProfitUsd: 0,
    totalGasUsd: 0,
    netProfitUsd: 0,
    winRate: 0,
    uptime: 0,
    currentChain: 'base'
  };
  state.tradeLogs = [];
  state.opportunities = [];

  res.json({ success: true });
});

// GET health
app.get('/api/defi/multichain-arb/health', (req, res) => {
  res.json({ status: 'ok', port: PORT, running: state.isRunning });
});

// ═══════════════════════════════════════════════════════════════════════════════
// INICIAR SERVIDOR
// ═══════════════════════════════════════════════════════════════════════════════

app.listen(PORT, () => {
  console.log(`
╔═══════════════════════════════════════════════════════════════╗
║                                                               ║
║   🤖 BOT ARBITRAJE API - ACTIVO                               ║
║                                                               ║
║   ✅ Puerto: ${PORT}                                           ║
║   ✅ URL: http://localhost:${PORT}                             ║
║                                                               ║
║   Endpoints:                                                  ║
║   • GET  /api/defi/multichain-arb/status                     ║
║   • POST /api/defi/multichain-arb/start                      ║
║   • POST /api/defi/multichain-arb/stop                       ║
║   • GET  /api/defi/multichain-arb/health                     ║
║                                                               ║
╚═══════════════════════════════════════════════════════════════╝
  `);
});

process.on('SIGINT', () => {
  console.log('\n[API] Cerrando...');
  if (timer) clearInterval(timer);
  process.exit(0);
});




