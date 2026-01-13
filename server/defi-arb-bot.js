#!/usr/bin/env node

/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * MULTI-CHAIN ARBITRAGE BOT - REAL-TIME SERVER
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * Este servidor ejecuta el bot de arbitraje en tiempo real y expone:
 * - Estado en vivo
 * - Control (start/stop)
 * - Datos de chains, trades, oportunidades
 * - Stats del AI (Thompson Sampling)
 */

import express from 'express';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { spawn } from 'child_process';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = 3100;

// ─────────────────────────────────────────────────────────────────────────────
// STATE & STORAGE
// ─────────────────────────────────────────────────────────────────────────────

let botProcess = null;
let botState = {
  isRunning: false,
  isDryRun: false,
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
    { chain: 'base', name: 'Base', chainId: 8453, balance: '0.0', balanceUsd: 0, routes: 0, isActive: true, lastTick: Date.now(), explorer: 'https://basescan.org' },
    { chain: 'arbitrum', name: 'Arbitrum', chainId: 42161, balance: '0.0', balanceUsd: 0, routes: 0, isActive: true, lastTick: Date.now(), explorer: 'https://arbiscan.io' },
    { chain: 'optimism', name: 'Optimism', chainId: 10, balance: '0.0', balanceUsd: 0, routes: 0, isActive: true, lastTick: Date.now(), explorer: 'https://optimistic.etherscan.io' }
  ],
  tradeLogs: [],
  opportunities: [],
  banditStates: [
    { chain: 'base', alpha: 2, beta: 2, winRate: 50, selected: true },
    { chain: 'arbitrum', alpha: 2, beta: 2, winRate: 50, selected: false },
    { chain: 'optimism', alpha: 2, beta: 2, winRate: 50, selected: false }
  ]
};

const stateFile = path.join(__dirname, '../bot-state.json');

// ─────────────────────────────────────────────────────────────────────────────
// MIDDLEWARE
// ─────────────────────────────────────────────────────────────────────────────

app.use(cors());
app.use(express.json());

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────

function saveState() {
  try {
    fs.writeFileSync(stateFile, JSON.stringify(botState, null, 2));
  } catch (e) {
    console.error('Error saving state:', e);
  }
}

function loadState() {
  try {
    if (fs.existsSync(stateFile)) {
      const data = fs.readFileSync(stateFile, 'utf8');
      return JSON.parse(data);
    }
  } catch (e) {
    console.error('Error loading state:', e);
  }
  return botState;
}

// ─────────────────────────────────────────────────────────────────────────────
// ROUTES
// ─────────────────────────────────────────────────────────────────────────────

/**
 * GET /api/defi/multichain-arb/status
 * Retorna el estado actual del bot
 */
app.get('/api/defi/multichain-arb/status', (req, res) => {
  const loaded = loadState();
  res.json(loaded);
});

/**
 * POST /api/defi/multichain-arb/start
 * Inicia el bot en modo LIVE o DRY_RUN
 */
app.post('/api/defi/multichain-arb/start', async (req, res) => {
  const { dryRun } = req.body;

  if (botProcess) {
    return res.status(400).json({ success: false, error: 'Bot ya está corriendo' });
  }

  try {
    // Determinar el modo
    const env = process.env;
    if (dryRun) {
      env.DRY_RUN = 'true';
    } else {
      env.DRY_RUN = 'false';
    }

    // Ruta al script del bot
    const botScript = path.join(__dirname, '../src/modules/DeFiProtocols/multichain-arb/scripts/liveArbBot.js');

    // Iniciar proceso
    botProcess = spawn('node', [botScript], {
      env,
      stdio: ['inherit', 'pipe', 'pipe'],
      detached: false
    });

    // Capturar output
    botProcess.stdout.on('data', (data) => {
      console.log(`[BOT STDOUT] ${data}`);
      updateStateFromBotOutput(data.toString());
    });

    botProcess.stderr.on('data', (data) => {
      console.log(`[BOT STDERR] ${data}`);
    });

    botProcess.on('exit', (code) => {
      console.log(`Bot process exited with code ${code}`);
      botProcess = null;
      botState.isRunning = false;
      saveState();
    });

    botState.isRunning = true;
    botState.isDryRun = dryRun || false;
    saveState();

    res.json({
      success: true,
      message: `Bot iniciado en modo ${dryRun ? 'DRY RUN' : 'LIVE'}`,
      isRunning: true
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/defi/multichain-arb/stop
 * Detiene el bot
 */
app.post('/api/defi/multichain-arb/stop', (req, res) => {
  if (!botProcess) {
    botState.isRunning = false;
    saveState();
    return res.json({ success: true, message: 'Bot ya no está corriendo', isRunning: false });
  }

  try {
    botProcess.kill('SIGTERM');
    botProcess = null;
    botState.isRunning = false;
    saveState();

    res.json({ success: true, message: 'Bot detenido', isRunning: false });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/defi/multichain-arb/reset
 * Reinicia las estadísticas
 */
app.post('/api/defi/multichain-arb/reset', (req, res) => {
  botState.stats = {
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
  botState.tradeLogs = [];
  botState.opportunities = [];
  saveState();

  res.json({ success: true, message: 'Estadísticas reiniciadas' });
});

/**
 * GET /api/defi/multichain-arb/logs
 * Retorna los últimos logs de trades
 */
app.get('/api/defi/multichain-arb/logs', (req, res) => {
  const loaded = loadState();
  res.json({ logs: loaded.tradeLogs.slice(-100) });
});

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────

function updateStateFromBotOutput(output) {
  // Parsear output del bot para actualizar estado
  // Esto es un ejemplo básico - adaptarlo según el formato del bot
  
  try {
    // Buscar patrones como "Ticks: 100" en el output
    const tickMatch = output.match(/Ticks:\s*(\d+)/);
    if (tickMatch) {
      botState.stats.totalTicks = parseInt(tickMatch[1]);
    }

    // Buscar patrones de profit
    const profitMatch = output.match(/Net profit:\s*\$?([\d.]+)/);
    if (profitMatch) {
      botState.stats.netProfitUsd = parseFloat(profitMatch[1]);
    }

    // Buscar chain actual
    const chainMatch = output.match(/Chain:\s*(\w+)/);
    if (chainMatch) {
      botState.stats.currentChain = chainMatch[1];
    }

    saveState();
  } catch (e) {
    // Ignorar errores de parsing
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// STARTUP
// ─────────────────────────────────────────────────────────────────────────────

app.listen(PORT, () => {
  console.log(`
╔════════════════════════════════════════════════════════════════════════════════╗
║                                                                                ║
║   🤖 ARBITRAGE BOT API SERVER (REAL-TIME)                                      ║
║                                                                                ║
║   Server: http://localhost:${PORT}                                              ║
║   Endpoints:                                                                   ║
║   - GET  /api/defi/multichain-arb/status      → Estado actual                 ║
║   - POST /api/defi/multichain-arb/start       → Iniciar bot                   ║
║   - POST /api/defi/multichain-arb/stop        → Detener bot                   ║
║   - POST /api/defi/multichain-arb/reset       → Reiniciar stats               ║
║   - GET  /api/defi/multichain-arb/logs        → Últimos 100 trades            ║
║                                                                                ║
║   El bot se ejecutará con las credenciales en .env                            ║
║   Modo: ${process.env.DRY_RUN === 'true' ? 'DRY RUN (Simulación)' : 'LIVE (Real)'}                                           ║
║                                                                                ║
╚════════════════════════════════════════════════════════════════════════════════╝
  `);

  // Cargar estado previo
  const prevState = loadState();
  if (prevState && prevState.stats) {
    Object.assign(botState, prevState);
  }
});




/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * MULTI-CHAIN ARBITRAGE BOT - REAL-TIME SERVER
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * Este servidor ejecuta el bot de arbitraje en tiempo real y expone:
 * - Estado en vivo
 * - Control (start/stop)
 * - Datos de chains, trades, oportunidades
 * - Stats del AI (Thompson Sampling)
 */

import express from 'express';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { spawn } from 'child_process';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = 3100;

// ─────────────────────────────────────────────────────────────────────────────
// STATE & STORAGE
// ─────────────────────────────────────────────────────────────────────────────

let botProcess = null;
let botState = {
  isRunning: false,
  isDryRun: false,
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
    { chain: 'base', name: 'Base', chainId: 8453, balance: '0.0', balanceUsd: 0, routes: 0, isActive: true, lastTick: Date.now(), explorer: 'https://basescan.org' },
    { chain: 'arbitrum', name: 'Arbitrum', chainId: 42161, balance: '0.0', balanceUsd: 0, routes: 0, isActive: true, lastTick: Date.now(), explorer: 'https://arbiscan.io' },
    { chain: 'optimism', name: 'Optimism', chainId: 10, balance: '0.0', balanceUsd: 0, routes: 0, isActive: true, lastTick: Date.now(), explorer: 'https://optimistic.etherscan.io' }
  ],
  tradeLogs: [],
  opportunities: [],
  banditStates: [
    { chain: 'base', alpha: 2, beta: 2, winRate: 50, selected: true },
    { chain: 'arbitrum', alpha: 2, beta: 2, winRate: 50, selected: false },
    { chain: 'optimism', alpha: 2, beta: 2, winRate: 50, selected: false }
  ]
};

const stateFile = path.join(__dirname, '../bot-state.json');

// ─────────────────────────────────────────────────────────────────────────────
// MIDDLEWARE
// ─────────────────────────────────────────────────────────────────────────────

app.use(cors());
app.use(express.json());

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────

function saveState() {
  try {
    fs.writeFileSync(stateFile, JSON.stringify(botState, null, 2));
  } catch (e) {
    console.error('Error saving state:', e);
  }
}

function loadState() {
  try {
    if (fs.existsSync(stateFile)) {
      const data = fs.readFileSync(stateFile, 'utf8');
      return JSON.parse(data);
    }
  } catch (e) {
    console.error('Error loading state:', e);
  }
  return botState;
}

// ─────────────────────────────────────────────────────────────────────────────
// ROUTES
// ─────────────────────────────────────────────────────────────────────────────

/**
 * GET /api/defi/multichain-arb/status
 * Retorna el estado actual del bot
 */
app.get('/api/defi/multichain-arb/status', (req, res) => {
  const loaded = loadState();
  res.json(loaded);
});

/**
 * POST /api/defi/multichain-arb/start
 * Inicia el bot en modo LIVE o DRY_RUN
 */
app.post('/api/defi/multichain-arb/start', async (req, res) => {
  const { dryRun } = req.body;

  if (botProcess) {
    return res.status(400).json({ success: false, error: 'Bot ya está corriendo' });
  }

  try {
    // Determinar el modo
    const env = process.env;
    if (dryRun) {
      env.DRY_RUN = 'true';
    } else {
      env.DRY_RUN = 'false';
    }

    // Ruta al script del bot
    const botScript = path.join(__dirname, '../src/modules/DeFiProtocols/multichain-arb/scripts/liveArbBot.js');

    // Iniciar proceso
    botProcess = spawn('node', [botScript], {
      env,
      stdio: ['inherit', 'pipe', 'pipe'],
      detached: false
    });

    // Capturar output
    botProcess.stdout.on('data', (data) => {
      console.log(`[BOT STDOUT] ${data}`);
      updateStateFromBotOutput(data.toString());
    });

    botProcess.stderr.on('data', (data) => {
      console.log(`[BOT STDERR] ${data}`);
    });

    botProcess.on('exit', (code) => {
      console.log(`Bot process exited with code ${code}`);
      botProcess = null;
      botState.isRunning = false;
      saveState();
    });

    botState.isRunning = true;
    botState.isDryRun = dryRun || false;
    saveState();

    res.json({
      success: true,
      message: `Bot iniciado en modo ${dryRun ? 'DRY RUN' : 'LIVE'}`,
      isRunning: true
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/defi/multichain-arb/stop
 * Detiene el bot
 */
app.post('/api/defi/multichain-arb/stop', (req, res) => {
  if (!botProcess) {
    botState.isRunning = false;
    saveState();
    return res.json({ success: true, message: 'Bot ya no está corriendo', isRunning: false });
  }

  try {
    botProcess.kill('SIGTERM');
    botProcess = null;
    botState.isRunning = false;
    saveState();

    res.json({ success: true, message: 'Bot detenido', isRunning: false });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/defi/multichain-arb/reset
 * Reinicia las estadísticas
 */
app.post('/api/defi/multichain-arb/reset', (req, res) => {
  botState.stats = {
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
  botState.tradeLogs = [];
  botState.opportunities = [];
  saveState();

  res.json({ success: true, message: 'Estadísticas reiniciadas' });
});

/**
 * GET /api/defi/multichain-arb/logs
 * Retorna los últimos logs de trades
 */
app.get('/api/defi/multichain-arb/logs', (req, res) => {
  const loaded = loadState();
  res.json({ logs: loaded.tradeLogs.slice(-100) });
});

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────

function updateStateFromBotOutput(output) {
  // Parsear output del bot para actualizar estado
  // Esto es un ejemplo básico - adaptarlo según el formato del bot
  
  try {
    // Buscar patrones como "Ticks: 100" en el output
    const tickMatch = output.match(/Ticks:\s*(\d+)/);
    if (tickMatch) {
      botState.stats.totalTicks = parseInt(tickMatch[1]);
    }

    // Buscar patrones de profit
    const profitMatch = output.match(/Net profit:\s*\$?([\d.]+)/);
    if (profitMatch) {
      botState.stats.netProfitUsd = parseFloat(profitMatch[1]);
    }

    // Buscar chain actual
    const chainMatch = output.match(/Chain:\s*(\w+)/);
    if (chainMatch) {
      botState.stats.currentChain = chainMatch[1];
    }

    saveState();
  } catch (e) {
    // Ignorar errores de parsing
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// STARTUP
// ─────────────────────────────────────────────────────────────────────────────

app.listen(PORT, () => {
  console.log(`
╔════════════════════════════════════════════════════════════════════════════════╗
║                                                                                ║
║   🤖 ARBITRAGE BOT API SERVER (REAL-TIME)                                      ║
║                                                                                ║
║   Server: http://localhost:${PORT}                                              ║
║   Endpoints:                                                                   ║
║   - GET  /api/defi/multichain-arb/status      → Estado actual                 ║
║   - POST /api/defi/multichain-arb/start       → Iniciar bot                   ║
║   - POST /api/defi/multichain-arb/stop        → Detener bot                   ║
║   - POST /api/defi/multichain-arb/reset       → Reiniciar stats               ║
║   - GET  /api/defi/multichain-arb/logs        → Últimos 100 trades            ║
║                                                                                ║
║   El bot se ejecutará con las credenciales en .env                            ║
║   Modo: ${process.env.DRY_RUN === 'true' ? 'DRY RUN (Simulación)' : 'LIVE (Real)'}                                           ║
║                                                                                ║
╚════════════════════════════════════════════════════════════════════════════════╝
  `);

  // Cargar estado previo
  const prevState = loadState();
  if (prevState && prevState.stats) {
    Object.assign(botState, prevState);
  }
});




/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * MULTI-CHAIN ARBITRAGE BOT - REAL-TIME SERVER
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * Este servidor ejecuta el bot de arbitraje en tiempo real y expone:
 * - Estado en vivo
 * - Control (start/stop)
 * - Datos de chains, trades, oportunidades
 * - Stats del AI (Thompson Sampling)
 */

import express from 'express';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { spawn } from 'child_process';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = 3100;

// ─────────────────────────────────────────────────────────────────────────────
// STATE & STORAGE
// ─────────────────────────────────────────────────────────────────────────────

let botProcess = null;
let botState = {
  isRunning: false,
  isDryRun: false,
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
    { chain: 'base', name: 'Base', chainId: 8453, balance: '0.0', balanceUsd: 0, routes: 0, isActive: true, lastTick: Date.now(), explorer: 'https://basescan.org' },
    { chain: 'arbitrum', name: 'Arbitrum', chainId: 42161, balance: '0.0', balanceUsd: 0, routes: 0, isActive: true, lastTick: Date.now(), explorer: 'https://arbiscan.io' },
    { chain: 'optimism', name: 'Optimism', chainId: 10, balance: '0.0', balanceUsd: 0, routes: 0, isActive: true, lastTick: Date.now(), explorer: 'https://optimistic.etherscan.io' }
  ],
  tradeLogs: [],
  opportunities: [],
  banditStates: [
    { chain: 'base', alpha: 2, beta: 2, winRate: 50, selected: true },
    { chain: 'arbitrum', alpha: 2, beta: 2, winRate: 50, selected: false },
    { chain: 'optimism', alpha: 2, beta: 2, winRate: 50, selected: false }
  ]
};

const stateFile = path.join(__dirname, '../bot-state.json');

// ─────────────────────────────────────────────────────────────────────────────
// MIDDLEWARE
// ─────────────────────────────────────────────────────────────────────────────

app.use(cors());
app.use(express.json());

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────

function saveState() {
  try {
    fs.writeFileSync(stateFile, JSON.stringify(botState, null, 2));
  } catch (e) {
    console.error('Error saving state:', e);
  }
}

function loadState() {
  try {
    if (fs.existsSync(stateFile)) {
      const data = fs.readFileSync(stateFile, 'utf8');
      return JSON.parse(data);
    }
  } catch (e) {
    console.error('Error loading state:', e);
  }
  return botState;
}

// ─────────────────────────────────────────────────────────────────────────────
// ROUTES
// ─────────────────────────────────────────────────────────────────────────────

/**
 * GET /api/defi/multichain-arb/status
 * Retorna el estado actual del bot
 */
app.get('/api/defi/multichain-arb/status', (req, res) => {
  const loaded = loadState();
  res.json(loaded);
});

/**
 * POST /api/defi/multichain-arb/start
 * Inicia el bot en modo LIVE o DRY_RUN
 */
app.post('/api/defi/multichain-arb/start', async (req, res) => {
  const { dryRun } = req.body;

  if (botProcess) {
    return res.status(400).json({ success: false, error: 'Bot ya está corriendo' });
  }

  try {
    // Determinar el modo
    const env = process.env;
    if (dryRun) {
      env.DRY_RUN = 'true';
    } else {
      env.DRY_RUN = 'false';
    }

    // Ruta al script del bot
    const botScript = path.join(__dirname, '../src/modules/DeFiProtocols/multichain-arb/scripts/liveArbBot.js');

    // Iniciar proceso
    botProcess = spawn('node', [botScript], {
      env,
      stdio: ['inherit', 'pipe', 'pipe'],
      detached: false
    });

    // Capturar output
    botProcess.stdout.on('data', (data) => {
      console.log(`[BOT STDOUT] ${data}`);
      updateStateFromBotOutput(data.toString());
    });

    botProcess.stderr.on('data', (data) => {
      console.log(`[BOT STDERR] ${data}`);
    });

    botProcess.on('exit', (code) => {
      console.log(`Bot process exited with code ${code}`);
      botProcess = null;
      botState.isRunning = false;
      saveState();
    });

    botState.isRunning = true;
    botState.isDryRun = dryRun || false;
    saveState();

    res.json({
      success: true,
      message: `Bot iniciado en modo ${dryRun ? 'DRY RUN' : 'LIVE'}`,
      isRunning: true
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/defi/multichain-arb/stop
 * Detiene el bot
 */
app.post('/api/defi/multichain-arb/stop', (req, res) => {
  if (!botProcess) {
    botState.isRunning = false;
    saveState();
    return res.json({ success: true, message: 'Bot ya no está corriendo', isRunning: false });
  }

  try {
    botProcess.kill('SIGTERM');
    botProcess = null;
    botState.isRunning = false;
    saveState();

    res.json({ success: true, message: 'Bot detenido', isRunning: false });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/defi/multichain-arb/reset
 * Reinicia las estadísticas
 */
app.post('/api/defi/multichain-arb/reset', (req, res) => {
  botState.stats = {
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
  botState.tradeLogs = [];
  botState.opportunities = [];
  saveState();

  res.json({ success: true, message: 'Estadísticas reiniciadas' });
});

/**
 * GET /api/defi/multichain-arb/logs
 * Retorna los últimos logs de trades
 */
app.get('/api/defi/multichain-arb/logs', (req, res) => {
  const loaded = loadState();
  res.json({ logs: loaded.tradeLogs.slice(-100) });
});

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────

function updateStateFromBotOutput(output) {
  // Parsear output del bot para actualizar estado
  // Esto es un ejemplo básico - adaptarlo según el formato del bot
  
  try {
    // Buscar patrones como "Ticks: 100" en el output
    const tickMatch = output.match(/Ticks:\s*(\d+)/);
    if (tickMatch) {
      botState.stats.totalTicks = parseInt(tickMatch[1]);
    }

    // Buscar patrones de profit
    const profitMatch = output.match(/Net profit:\s*\$?([\d.]+)/);
    if (profitMatch) {
      botState.stats.netProfitUsd = parseFloat(profitMatch[1]);
    }

    // Buscar chain actual
    const chainMatch = output.match(/Chain:\s*(\w+)/);
    if (chainMatch) {
      botState.stats.currentChain = chainMatch[1];
    }

    saveState();
  } catch (e) {
    // Ignorar errores de parsing
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// STARTUP
// ─────────────────────────────────────────────────────────────────────────────

app.listen(PORT, () => {
  console.log(`
╔════════════════════════════════════════════════════════════════════════════════╗
║                                                                                ║
║   🤖 ARBITRAGE BOT API SERVER (REAL-TIME)                                      ║
║                                                                                ║
║   Server: http://localhost:${PORT}                                              ║
║   Endpoints:                                                                   ║
║   - GET  /api/defi/multichain-arb/status      → Estado actual                 ║
║   - POST /api/defi/multichain-arb/start       → Iniciar bot                   ║
║   - POST /api/defi/multichain-arb/stop        → Detener bot                   ║
║   - POST /api/defi/multichain-arb/reset       → Reiniciar stats               ║
║   - GET  /api/defi/multichain-arb/logs        → Últimos 100 trades            ║
║                                                                                ║
║   El bot se ejecutará con las credenciales en .env                            ║
║   Modo: ${process.env.DRY_RUN === 'true' ? 'DRY RUN (Simulación)' : 'LIVE (Real)'}                                           ║
║                                                                                ║
╚════════════════════════════════════════════════════════════════════════════════╝
  `);

  // Cargar estado previo
  const prevState = loadState();
  if (prevState && prevState.stats) {
    Object.assign(botState, prevState);
  }
});




/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * MULTI-CHAIN ARBITRAGE BOT - REAL-TIME SERVER
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * Este servidor ejecuta el bot de arbitraje en tiempo real y expone:
 * - Estado en vivo
 * - Control (start/stop)
 * - Datos de chains, trades, oportunidades
 * - Stats del AI (Thompson Sampling)
 */

import express from 'express';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { spawn } from 'child_process';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = 3100;

// ─────────────────────────────────────────────────────────────────────────────
// STATE & STORAGE
// ─────────────────────────────────────────────────────────────────────────────

let botProcess = null;
let botState = {
  isRunning: false,
  isDryRun: false,
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
    { chain: 'base', name: 'Base', chainId: 8453, balance: '0.0', balanceUsd: 0, routes: 0, isActive: true, lastTick: Date.now(), explorer: 'https://basescan.org' },
    { chain: 'arbitrum', name: 'Arbitrum', chainId: 42161, balance: '0.0', balanceUsd: 0, routes: 0, isActive: true, lastTick: Date.now(), explorer: 'https://arbiscan.io' },
    { chain: 'optimism', name: 'Optimism', chainId: 10, balance: '0.0', balanceUsd: 0, routes: 0, isActive: true, lastTick: Date.now(), explorer: 'https://optimistic.etherscan.io' }
  ],
  tradeLogs: [],
  opportunities: [],
  banditStates: [
    { chain: 'base', alpha: 2, beta: 2, winRate: 50, selected: true },
    { chain: 'arbitrum', alpha: 2, beta: 2, winRate: 50, selected: false },
    { chain: 'optimism', alpha: 2, beta: 2, winRate: 50, selected: false }
  ]
};

const stateFile = path.join(__dirname, '../bot-state.json');

// ─────────────────────────────────────────────────────────────────────────────
// MIDDLEWARE
// ─────────────────────────────────────────────────────────────────────────────

app.use(cors());
app.use(express.json());

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────

function saveState() {
  try {
    fs.writeFileSync(stateFile, JSON.stringify(botState, null, 2));
  } catch (e) {
    console.error('Error saving state:', e);
  }
}

function loadState() {
  try {
    if (fs.existsSync(stateFile)) {
      const data = fs.readFileSync(stateFile, 'utf8');
      return JSON.parse(data);
    }
  } catch (e) {
    console.error('Error loading state:', e);
  }
  return botState;
}

// ─────────────────────────────────────────────────────────────────────────────
// ROUTES
// ─────────────────────────────────────────────────────────────────────────────

/**
 * GET /api/defi/multichain-arb/status
 * Retorna el estado actual del bot
 */
app.get('/api/defi/multichain-arb/status', (req, res) => {
  const loaded = loadState();
  res.json(loaded);
});

/**
 * POST /api/defi/multichain-arb/start
 * Inicia el bot en modo LIVE o DRY_RUN
 */
app.post('/api/defi/multichain-arb/start', async (req, res) => {
  const { dryRun } = req.body;

  if (botProcess) {
    return res.status(400).json({ success: false, error: 'Bot ya está corriendo' });
  }

  try {
    // Determinar el modo
    const env = process.env;
    if (dryRun) {
      env.DRY_RUN = 'true';
    } else {
      env.DRY_RUN = 'false';
    }

    // Ruta al script del bot
    const botScript = path.join(__dirname, '../src/modules/DeFiProtocols/multichain-arb/scripts/liveArbBot.js');

    // Iniciar proceso
    botProcess = spawn('node', [botScript], {
      env,
      stdio: ['inherit', 'pipe', 'pipe'],
      detached: false
    });

    // Capturar output
    botProcess.stdout.on('data', (data) => {
      console.log(`[BOT STDOUT] ${data}`);
      updateStateFromBotOutput(data.toString());
    });

    botProcess.stderr.on('data', (data) => {
      console.log(`[BOT STDERR] ${data}`);
    });

    botProcess.on('exit', (code) => {
      console.log(`Bot process exited with code ${code}`);
      botProcess = null;
      botState.isRunning = false;
      saveState();
    });

    botState.isRunning = true;
    botState.isDryRun = dryRun || false;
    saveState();

    res.json({
      success: true,
      message: `Bot iniciado en modo ${dryRun ? 'DRY RUN' : 'LIVE'}`,
      isRunning: true
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/defi/multichain-arb/stop
 * Detiene el bot
 */
app.post('/api/defi/multichain-arb/stop', (req, res) => {
  if (!botProcess) {
    botState.isRunning = false;
    saveState();
    return res.json({ success: true, message: 'Bot ya no está corriendo', isRunning: false });
  }

  try {
    botProcess.kill('SIGTERM');
    botProcess = null;
    botState.isRunning = false;
    saveState();

    res.json({ success: true, message: 'Bot detenido', isRunning: false });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/defi/multichain-arb/reset
 * Reinicia las estadísticas
 */
app.post('/api/defi/multichain-arb/reset', (req, res) => {
  botState.stats = {
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
  botState.tradeLogs = [];
  botState.opportunities = [];
  saveState();

  res.json({ success: true, message: 'Estadísticas reiniciadas' });
});

/**
 * GET /api/defi/multichain-arb/logs
 * Retorna los últimos logs de trades
 */
app.get('/api/defi/multichain-arb/logs', (req, res) => {
  const loaded = loadState();
  res.json({ logs: loaded.tradeLogs.slice(-100) });
});

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────

function updateStateFromBotOutput(output) {
  // Parsear output del bot para actualizar estado
  // Esto es un ejemplo básico - adaptarlo según el formato del bot
  
  try {
    // Buscar patrones como "Ticks: 100" en el output
    const tickMatch = output.match(/Ticks:\s*(\d+)/);
    if (tickMatch) {
      botState.stats.totalTicks = parseInt(tickMatch[1]);
    }

    // Buscar patrones de profit
    const profitMatch = output.match(/Net profit:\s*\$?([\d.]+)/);
    if (profitMatch) {
      botState.stats.netProfitUsd = parseFloat(profitMatch[1]);
    }

    // Buscar chain actual
    const chainMatch = output.match(/Chain:\s*(\w+)/);
    if (chainMatch) {
      botState.stats.currentChain = chainMatch[1];
    }

    saveState();
  } catch (e) {
    // Ignorar errores de parsing
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// STARTUP
// ─────────────────────────────────────────────────────────────────────────────

app.listen(PORT, () => {
  console.log(`
╔════════════════════════════════════════════════════════════════════════════════╗
║                                                                                ║
║   🤖 ARBITRAGE BOT API SERVER (REAL-TIME)                                      ║
║                                                                                ║
║   Server: http://localhost:${PORT}                                              ║
║   Endpoints:                                                                   ║
║   - GET  /api/defi/multichain-arb/status      → Estado actual                 ║
║   - POST /api/defi/multichain-arb/start       → Iniciar bot                   ║
║   - POST /api/defi/multichain-arb/stop        → Detener bot                   ║
║   - POST /api/defi/multichain-arb/reset       → Reiniciar stats               ║
║   - GET  /api/defi/multichain-arb/logs        → Últimos 100 trades            ║
║                                                                                ║
║   El bot se ejecutará con las credenciales en .env                            ║
║   Modo: ${process.env.DRY_RUN === 'true' ? 'DRY RUN (Simulación)' : 'LIVE (Real)'}                                           ║
║                                                                                ║
╚════════════════════════════════════════════════════════════════════════════════╝
  `);

  // Cargar estado previo
  const prevState = loadState();
  if (prevState && prevState.stats) {
    Object.assign(botState, prevState);
  }
});



/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * MULTI-CHAIN ARBITRAGE BOT - REAL-TIME SERVER
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * Este servidor ejecuta el bot de arbitraje en tiempo real y expone:
 * - Estado en vivo
 * - Control (start/stop)
 * - Datos de chains, trades, oportunidades
 * - Stats del AI (Thompson Sampling)
 */

import express from 'express';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { spawn } from 'child_process';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = 3100;

// ─────────────────────────────────────────────────────────────────────────────
// STATE & STORAGE
// ─────────────────────────────────────────────────────────────────────────────

let botProcess = null;
let botState = {
  isRunning: false,
  isDryRun: false,
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
    { chain: 'base', name: 'Base', chainId: 8453, balance: '0.0', balanceUsd: 0, routes: 0, isActive: true, lastTick: Date.now(), explorer: 'https://basescan.org' },
    { chain: 'arbitrum', name: 'Arbitrum', chainId: 42161, balance: '0.0', balanceUsd: 0, routes: 0, isActive: true, lastTick: Date.now(), explorer: 'https://arbiscan.io' },
    { chain: 'optimism', name: 'Optimism', chainId: 10, balance: '0.0', balanceUsd: 0, routes: 0, isActive: true, lastTick: Date.now(), explorer: 'https://optimistic.etherscan.io' }
  ],
  tradeLogs: [],
  opportunities: [],
  banditStates: [
    { chain: 'base', alpha: 2, beta: 2, winRate: 50, selected: true },
    { chain: 'arbitrum', alpha: 2, beta: 2, winRate: 50, selected: false },
    { chain: 'optimism', alpha: 2, beta: 2, winRate: 50, selected: false }
  ]
};

const stateFile = path.join(__dirname, '../bot-state.json');

// ─────────────────────────────────────────────────────────────────────────────
// MIDDLEWARE
// ─────────────────────────────────────────────────────────────────────────────

app.use(cors());
app.use(express.json());

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────

function saveState() {
  try {
    fs.writeFileSync(stateFile, JSON.stringify(botState, null, 2));
  } catch (e) {
    console.error('Error saving state:', e);
  }
}

function loadState() {
  try {
    if (fs.existsSync(stateFile)) {
      const data = fs.readFileSync(stateFile, 'utf8');
      return JSON.parse(data);
    }
  } catch (e) {
    console.error('Error loading state:', e);
  }
  return botState;
}

// ─────────────────────────────────────────────────────────────────────────────
// ROUTES
// ─────────────────────────────────────────────────────────────────────────────

/**
 * GET /api/defi/multichain-arb/status
 * Retorna el estado actual del bot
 */
app.get('/api/defi/multichain-arb/status', (req, res) => {
  const loaded = loadState();
  res.json(loaded);
});

/**
 * POST /api/defi/multichain-arb/start
 * Inicia el bot en modo LIVE o DRY_RUN
 */
app.post('/api/defi/multichain-arb/start', async (req, res) => {
  const { dryRun } = req.body;

  if (botProcess) {
    return res.status(400).json({ success: false, error: 'Bot ya está corriendo' });
  }

  try {
    // Determinar el modo
    const env = process.env;
    if (dryRun) {
      env.DRY_RUN = 'true';
    } else {
      env.DRY_RUN = 'false';
    }

    // Ruta al script del bot
    const botScript = path.join(__dirname, '../src/modules/DeFiProtocols/multichain-arb/scripts/liveArbBot.js');

    // Iniciar proceso
    botProcess = spawn('node', [botScript], {
      env,
      stdio: ['inherit', 'pipe', 'pipe'],
      detached: false
    });

    // Capturar output
    botProcess.stdout.on('data', (data) => {
      console.log(`[BOT STDOUT] ${data}`);
      updateStateFromBotOutput(data.toString());
    });

    botProcess.stderr.on('data', (data) => {
      console.log(`[BOT STDERR] ${data}`);
    });

    botProcess.on('exit', (code) => {
      console.log(`Bot process exited with code ${code}`);
      botProcess = null;
      botState.isRunning = false;
      saveState();
    });

    botState.isRunning = true;
    botState.isDryRun = dryRun || false;
    saveState();

    res.json({
      success: true,
      message: `Bot iniciado en modo ${dryRun ? 'DRY RUN' : 'LIVE'}`,
      isRunning: true
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/defi/multichain-arb/stop
 * Detiene el bot
 */
app.post('/api/defi/multichain-arb/stop', (req, res) => {
  if (!botProcess) {
    botState.isRunning = false;
    saveState();
    return res.json({ success: true, message: 'Bot ya no está corriendo', isRunning: false });
  }

  try {
    botProcess.kill('SIGTERM');
    botProcess = null;
    botState.isRunning = false;
    saveState();

    res.json({ success: true, message: 'Bot detenido', isRunning: false });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/defi/multichain-arb/reset
 * Reinicia las estadísticas
 */
app.post('/api/defi/multichain-arb/reset', (req, res) => {
  botState.stats = {
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
  botState.tradeLogs = [];
  botState.opportunities = [];
  saveState();

  res.json({ success: true, message: 'Estadísticas reiniciadas' });
});

/**
 * GET /api/defi/multichain-arb/logs
 * Retorna los últimos logs de trades
 */
app.get('/api/defi/multichain-arb/logs', (req, res) => {
  const loaded = loadState();
  res.json({ logs: loaded.tradeLogs.slice(-100) });
});

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────

function updateStateFromBotOutput(output) {
  // Parsear output del bot para actualizar estado
  // Esto es un ejemplo básico - adaptarlo según el formato del bot
  
  try {
    // Buscar patrones como "Ticks: 100" en el output
    const tickMatch = output.match(/Ticks:\s*(\d+)/);
    if (tickMatch) {
      botState.stats.totalTicks = parseInt(tickMatch[1]);
    }

    // Buscar patrones de profit
    const profitMatch = output.match(/Net profit:\s*\$?([\d.]+)/);
    if (profitMatch) {
      botState.stats.netProfitUsd = parseFloat(profitMatch[1]);
    }

    // Buscar chain actual
    const chainMatch = output.match(/Chain:\s*(\w+)/);
    if (chainMatch) {
      botState.stats.currentChain = chainMatch[1];
    }

    saveState();
  } catch (e) {
    // Ignorar errores de parsing
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// STARTUP
// ─────────────────────────────────────────────────────────────────────────────

app.listen(PORT, () => {
  console.log(`
╔════════════════════════════════════════════════════════════════════════════════╗
║                                                                                ║
║   🤖 ARBITRAGE BOT API SERVER (REAL-TIME)                                      ║
║                                                                                ║
║   Server: http://localhost:${PORT}                                              ║
║   Endpoints:                                                                   ║
║   - GET  /api/defi/multichain-arb/status      → Estado actual                 ║
║   - POST /api/defi/multichain-arb/start       → Iniciar bot                   ║
║   - POST /api/defi/multichain-arb/stop        → Detener bot                   ║
║   - POST /api/defi/multichain-arb/reset       → Reiniciar stats               ║
║   - GET  /api/defi/multichain-arb/logs        → Últimos 100 trades            ║
║                                                                                ║
║   El bot se ejecutará con las credenciales en .env                            ║
║   Modo: ${process.env.DRY_RUN === 'true' ? 'DRY RUN (Simulación)' : 'LIVE (Real)'}                                           ║
║                                                                                ║
╚════════════════════════════════════════════════════════════════════════════════╝
  `);

  // Cargar estado previo
  const prevState = loadState();
  if (prevState && prevState.stats) {
    Object.assign(botState, prevState);
  }
});




/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * MULTI-CHAIN ARBITRAGE BOT - REAL-TIME SERVER
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * Este servidor ejecuta el bot de arbitraje en tiempo real y expone:
 * - Estado en vivo
 * - Control (start/stop)
 * - Datos de chains, trades, oportunidades
 * - Stats del AI (Thompson Sampling)
 */

import express from 'express';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { spawn } from 'child_process';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = 3100;

// ─────────────────────────────────────────────────────────────────────────────
// STATE & STORAGE
// ─────────────────────────────────────────────────────────────────────────────

let botProcess = null;
let botState = {
  isRunning: false,
  isDryRun: false,
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
    { chain: 'base', name: 'Base', chainId: 8453, balance: '0.0', balanceUsd: 0, routes: 0, isActive: true, lastTick: Date.now(), explorer: 'https://basescan.org' },
    { chain: 'arbitrum', name: 'Arbitrum', chainId: 42161, balance: '0.0', balanceUsd: 0, routes: 0, isActive: true, lastTick: Date.now(), explorer: 'https://arbiscan.io' },
    { chain: 'optimism', name: 'Optimism', chainId: 10, balance: '0.0', balanceUsd: 0, routes: 0, isActive: true, lastTick: Date.now(), explorer: 'https://optimistic.etherscan.io' }
  ],
  tradeLogs: [],
  opportunities: [],
  banditStates: [
    { chain: 'base', alpha: 2, beta: 2, winRate: 50, selected: true },
    { chain: 'arbitrum', alpha: 2, beta: 2, winRate: 50, selected: false },
    { chain: 'optimism', alpha: 2, beta: 2, winRate: 50, selected: false }
  ]
};

const stateFile = path.join(__dirname, '../bot-state.json');

// ─────────────────────────────────────────────────────────────────────────────
// MIDDLEWARE
// ─────────────────────────────────────────────────────────────────────────────

app.use(cors());
app.use(express.json());

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────

function saveState() {
  try {
    fs.writeFileSync(stateFile, JSON.stringify(botState, null, 2));
  } catch (e) {
    console.error('Error saving state:', e);
  }
}

function loadState() {
  try {
    if (fs.existsSync(stateFile)) {
      const data = fs.readFileSync(stateFile, 'utf8');
      return JSON.parse(data);
    }
  } catch (e) {
    console.error('Error loading state:', e);
  }
  return botState;
}

// ─────────────────────────────────────────────────────────────────────────────
// ROUTES
// ─────────────────────────────────────────────────────────────────────────────

/**
 * GET /api/defi/multichain-arb/status
 * Retorna el estado actual del bot
 */
app.get('/api/defi/multichain-arb/status', (req, res) => {
  const loaded = loadState();
  res.json(loaded);
});

/**
 * POST /api/defi/multichain-arb/start
 * Inicia el bot en modo LIVE o DRY_RUN
 */
app.post('/api/defi/multichain-arb/start', async (req, res) => {
  const { dryRun } = req.body;

  if (botProcess) {
    return res.status(400).json({ success: false, error: 'Bot ya está corriendo' });
  }

  try {
    // Determinar el modo
    const env = process.env;
    if (dryRun) {
      env.DRY_RUN = 'true';
    } else {
      env.DRY_RUN = 'false';
    }

    // Ruta al script del bot
    const botScript = path.join(__dirname, '../src/modules/DeFiProtocols/multichain-arb/scripts/liveArbBot.js');

    // Iniciar proceso
    botProcess = spawn('node', [botScript], {
      env,
      stdio: ['inherit', 'pipe', 'pipe'],
      detached: false
    });

    // Capturar output
    botProcess.stdout.on('data', (data) => {
      console.log(`[BOT STDOUT] ${data}`);
      updateStateFromBotOutput(data.toString());
    });

    botProcess.stderr.on('data', (data) => {
      console.log(`[BOT STDERR] ${data}`);
    });

    botProcess.on('exit', (code) => {
      console.log(`Bot process exited with code ${code}`);
      botProcess = null;
      botState.isRunning = false;
      saveState();
    });

    botState.isRunning = true;
    botState.isDryRun = dryRun || false;
    saveState();

    res.json({
      success: true,
      message: `Bot iniciado en modo ${dryRun ? 'DRY RUN' : 'LIVE'}`,
      isRunning: true
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/defi/multichain-arb/stop
 * Detiene el bot
 */
app.post('/api/defi/multichain-arb/stop', (req, res) => {
  if (!botProcess) {
    botState.isRunning = false;
    saveState();
    return res.json({ success: true, message: 'Bot ya no está corriendo', isRunning: false });
  }

  try {
    botProcess.kill('SIGTERM');
    botProcess = null;
    botState.isRunning = false;
    saveState();

    res.json({ success: true, message: 'Bot detenido', isRunning: false });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/defi/multichain-arb/reset
 * Reinicia las estadísticas
 */
app.post('/api/defi/multichain-arb/reset', (req, res) => {
  botState.stats = {
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
  botState.tradeLogs = [];
  botState.opportunities = [];
  saveState();

  res.json({ success: true, message: 'Estadísticas reiniciadas' });
});

/**
 * GET /api/defi/multichain-arb/logs
 * Retorna los últimos logs de trades
 */
app.get('/api/defi/multichain-arb/logs', (req, res) => {
  const loaded = loadState();
  res.json({ logs: loaded.tradeLogs.slice(-100) });
});

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────

function updateStateFromBotOutput(output) {
  // Parsear output del bot para actualizar estado
  // Esto es un ejemplo básico - adaptarlo según el formato del bot
  
  try {
    // Buscar patrones como "Ticks: 100" en el output
    const tickMatch = output.match(/Ticks:\s*(\d+)/);
    if (tickMatch) {
      botState.stats.totalTicks = parseInt(tickMatch[1]);
    }

    // Buscar patrones de profit
    const profitMatch = output.match(/Net profit:\s*\$?([\d.]+)/);
    if (profitMatch) {
      botState.stats.netProfitUsd = parseFloat(profitMatch[1]);
    }

    // Buscar chain actual
    const chainMatch = output.match(/Chain:\s*(\w+)/);
    if (chainMatch) {
      botState.stats.currentChain = chainMatch[1];
    }

    saveState();
  } catch (e) {
    // Ignorar errores de parsing
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// STARTUP
// ─────────────────────────────────────────────────────────────────────────────

app.listen(PORT, () => {
  console.log(`
╔════════════════════════════════════════════════════════════════════════════════╗
║                                                                                ║
║   🤖 ARBITRAGE BOT API SERVER (REAL-TIME)                                      ║
║                                                                                ║
║   Server: http://localhost:${PORT}                                              ║
║   Endpoints:                                                                   ║
║   - GET  /api/defi/multichain-arb/status      → Estado actual                 ║
║   - POST /api/defi/multichain-arb/start       → Iniciar bot                   ║
║   - POST /api/defi/multichain-arb/stop        → Detener bot                   ║
║   - POST /api/defi/multichain-arb/reset       → Reiniciar stats               ║
║   - GET  /api/defi/multichain-arb/logs        → Últimos 100 trades            ║
║                                                                                ║
║   El bot se ejecutará con las credenciales en .env                            ║
║   Modo: ${process.env.DRY_RUN === 'true' ? 'DRY RUN (Simulación)' : 'LIVE (Real)'}                                           ║
║                                                                                ║
╚════════════════════════════════════════════════════════════════════════════════╝
  `);

  // Cargar estado previo
  const prevState = loadState();
  if (prevState && prevState.stats) {
    Object.assign(botState, prevState);
  }
});



/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * MULTI-CHAIN ARBITRAGE BOT - REAL-TIME SERVER
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * Este servidor ejecuta el bot de arbitraje en tiempo real y expone:
 * - Estado en vivo
 * - Control (start/stop)
 * - Datos de chains, trades, oportunidades
 * - Stats del AI (Thompson Sampling)
 */

import express from 'express';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { spawn } from 'child_process';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = 3100;

// ─────────────────────────────────────────────────────────────────────────────
// STATE & STORAGE
// ─────────────────────────────────────────────────────────────────────────────

let botProcess = null;
let botState = {
  isRunning: false,
  isDryRun: false,
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
    { chain: 'base', name: 'Base', chainId: 8453, balance: '0.0', balanceUsd: 0, routes: 0, isActive: true, lastTick: Date.now(), explorer: 'https://basescan.org' },
    { chain: 'arbitrum', name: 'Arbitrum', chainId: 42161, balance: '0.0', balanceUsd: 0, routes: 0, isActive: true, lastTick: Date.now(), explorer: 'https://arbiscan.io' },
    { chain: 'optimism', name: 'Optimism', chainId: 10, balance: '0.0', balanceUsd: 0, routes: 0, isActive: true, lastTick: Date.now(), explorer: 'https://optimistic.etherscan.io' }
  ],
  tradeLogs: [],
  opportunities: [],
  banditStates: [
    { chain: 'base', alpha: 2, beta: 2, winRate: 50, selected: true },
    { chain: 'arbitrum', alpha: 2, beta: 2, winRate: 50, selected: false },
    { chain: 'optimism', alpha: 2, beta: 2, winRate: 50, selected: false }
  ]
};

const stateFile = path.join(__dirname, '../bot-state.json');

// ─────────────────────────────────────────────────────────────────────────────
// MIDDLEWARE
// ─────────────────────────────────────────────────────────────────────────────

app.use(cors());
app.use(express.json());

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────

function saveState() {
  try {
    fs.writeFileSync(stateFile, JSON.stringify(botState, null, 2));
  } catch (e) {
    console.error('Error saving state:', e);
  }
}

function loadState() {
  try {
    if (fs.existsSync(stateFile)) {
      const data = fs.readFileSync(stateFile, 'utf8');
      return JSON.parse(data);
    }
  } catch (e) {
    console.error('Error loading state:', e);
  }
  return botState;
}

// ─────────────────────────────────────────────────────────────────────────────
// ROUTES
// ─────────────────────────────────────────────────────────────────────────────

/**
 * GET /api/defi/multichain-arb/status
 * Retorna el estado actual del bot
 */
app.get('/api/defi/multichain-arb/status', (req, res) => {
  const loaded = loadState();
  res.json(loaded);
});

/**
 * POST /api/defi/multichain-arb/start
 * Inicia el bot en modo LIVE o DRY_RUN
 */
app.post('/api/defi/multichain-arb/start', async (req, res) => {
  const { dryRun } = req.body;

  if (botProcess) {
    return res.status(400).json({ success: false, error: 'Bot ya está corriendo' });
  }

  try {
    // Determinar el modo
    const env = process.env;
    if (dryRun) {
      env.DRY_RUN = 'true';
    } else {
      env.DRY_RUN = 'false';
    }

    // Ruta al script del bot
    const botScript = path.join(__dirname, '../src/modules/DeFiProtocols/multichain-arb/scripts/liveArbBot.js');

    // Iniciar proceso
    botProcess = spawn('node', [botScript], {
      env,
      stdio: ['inherit', 'pipe', 'pipe'],
      detached: false
    });

    // Capturar output
    botProcess.stdout.on('data', (data) => {
      console.log(`[BOT STDOUT] ${data}`);
      updateStateFromBotOutput(data.toString());
    });

    botProcess.stderr.on('data', (data) => {
      console.log(`[BOT STDERR] ${data}`);
    });

    botProcess.on('exit', (code) => {
      console.log(`Bot process exited with code ${code}`);
      botProcess = null;
      botState.isRunning = false;
      saveState();
    });

    botState.isRunning = true;
    botState.isDryRun = dryRun || false;
    saveState();

    res.json({
      success: true,
      message: `Bot iniciado en modo ${dryRun ? 'DRY RUN' : 'LIVE'}`,
      isRunning: true
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/defi/multichain-arb/stop
 * Detiene el bot
 */
app.post('/api/defi/multichain-arb/stop', (req, res) => {
  if (!botProcess) {
    botState.isRunning = false;
    saveState();
    return res.json({ success: true, message: 'Bot ya no está corriendo', isRunning: false });
  }

  try {
    botProcess.kill('SIGTERM');
    botProcess = null;
    botState.isRunning = false;
    saveState();

    res.json({ success: true, message: 'Bot detenido', isRunning: false });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/defi/multichain-arb/reset
 * Reinicia las estadísticas
 */
app.post('/api/defi/multichain-arb/reset', (req, res) => {
  botState.stats = {
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
  botState.tradeLogs = [];
  botState.opportunities = [];
  saveState();

  res.json({ success: true, message: 'Estadísticas reiniciadas' });
});

/**
 * GET /api/defi/multichain-arb/logs
 * Retorna los últimos logs de trades
 */
app.get('/api/defi/multichain-arb/logs', (req, res) => {
  const loaded = loadState();
  res.json({ logs: loaded.tradeLogs.slice(-100) });
});

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────

function updateStateFromBotOutput(output) {
  // Parsear output del bot para actualizar estado
  // Esto es un ejemplo básico - adaptarlo según el formato del bot
  
  try {
    // Buscar patrones como "Ticks: 100" en el output
    const tickMatch = output.match(/Ticks:\s*(\d+)/);
    if (tickMatch) {
      botState.stats.totalTicks = parseInt(tickMatch[1]);
    }

    // Buscar patrones de profit
    const profitMatch = output.match(/Net profit:\s*\$?([\d.]+)/);
    if (profitMatch) {
      botState.stats.netProfitUsd = parseFloat(profitMatch[1]);
    }

    // Buscar chain actual
    const chainMatch = output.match(/Chain:\s*(\w+)/);
    if (chainMatch) {
      botState.stats.currentChain = chainMatch[1];
    }

    saveState();
  } catch (e) {
    // Ignorar errores de parsing
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// STARTUP
// ─────────────────────────────────────────────────────────────────────────────

app.listen(PORT, () => {
  console.log(`
╔════════════════════════════════════════════════════════════════════════════════╗
║                                                                                ║
║   🤖 ARBITRAGE BOT API SERVER (REAL-TIME)                                      ║
║                                                                                ║
║   Server: http://localhost:${PORT}                                              ║
║   Endpoints:                                                                   ║
║   - GET  /api/defi/multichain-arb/status      → Estado actual                 ║
║   - POST /api/defi/multichain-arb/start       → Iniciar bot                   ║
║   - POST /api/defi/multichain-arb/stop        → Detener bot                   ║
║   - POST /api/defi/multichain-arb/reset       → Reiniciar stats               ║
║   - GET  /api/defi/multichain-arb/logs        → Últimos 100 trades            ║
║                                                                                ║
║   El bot se ejecutará con las credenciales en .env                            ║
║   Modo: ${process.env.DRY_RUN === 'true' ? 'DRY RUN (Simulación)' : 'LIVE (Real)'}                                           ║
║                                                                                ║
╚════════════════════════════════════════════════════════════════════════════════╝
  `);

  // Cargar estado previo
  const prevState = loadState();
  if (prevState && prevState.stats) {
    Object.assign(botState, prevState);
  }
});




/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * MULTI-CHAIN ARBITRAGE BOT - REAL-TIME SERVER
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * Este servidor ejecuta el bot de arbitraje en tiempo real y expone:
 * - Estado en vivo
 * - Control (start/stop)
 * - Datos de chains, trades, oportunidades
 * - Stats del AI (Thompson Sampling)
 */

import express from 'express';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { spawn } from 'child_process';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = 3100;

// ─────────────────────────────────────────────────────────────────────────────
// STATE & STORAGE
// ─────────────────────────────────────────────────────────────────────────────

let botProcess = null;
let botState = {
  isRunning: false,
  isDryRun: false,
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
    { chain: 'base', name: 'Base', chainId: 8453, balance: '0.0', balanceUsd: 0, routes: 0, isActive: true, lastTick: Date.now(), explorer: 'https://basescan.org' },
    { chain: 'arbitrum', name: 'Arbitrum', chainId: 42161, balance: '0.0', balanceUsd: 0, routes: 0, isActive: true, lastTick: Date.now(), explorer: 'https://arbiscan.io' },
    { chain: 'optimism', name: 'Optimism', chainId: 10, balance: '0.0', balanceUsd: 0, routes: 0, isActive: true, lastTick: Date.now(), explorer: 'https://optimistic.etherscan.io' }
  ],
  tradeLogs: [],
  opportunities: [],
  banditStates: [
    { chain: 'base', alpha: 2, beta: 2, winRate: 50, selected: true },
    { chain: 'arbitrum', alpha: 2, beta: 2, winRate: 50, selected: false },
    { chain: 'optimism', alpha: 2, beta: 2, winRate: 50, selected: false }
  ]
};

const stateFile = path.join(__dirname, '../bot-state.json');

// ─────────────────────────────────────────────────────────────────────────────
// MIDDLEWARE
// ─────────────────────────────────────────────────────────────────────────────

app.use(cors());
app.use(express.json());

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────

function saveState() {
  try {
    fs.writeFileSync(stateFile, JSON.stringify(botState, null, 2));
  } catch (e) {
    console.error('Error saving state:', e);
  }
}

function loadState() {
  try {
    if (fs.existsSync(stateFile)) {
      const data = fs.readFileSync(stateFile, 'utf8');
      return JSON.parse(data);
    }
  } catch (e) {
    console.error('Error loading state:', e);
  }
  return botState;
}

// ─────────────────────────────────────────────────────────────────────────────
// ROUTES
// ─────────────────────────────────────────────────────────────────────────────

/**
 * GET /api/defi/multichain-arb/status
 * Retorna el estado actual del bot
 */
app.get('/api/defi/multichain-arb/status', (req, res) => {
  const loaded = loadState();
  res.json(loaded);
});

/**
 * POST /api/defi/multichain-arb/start
 * Inicia el bot en modo LIVE o DRY_RUN
 */
app.post('/api/defi/multichain-arb/start', async (req, res) => {
  const { dryRun } = req.body;

  if (botProcess) {
    return res.status(400).json({ success: false, error: 'Bot ya está corriendo' });
  }

  try {
    // Determinar el modo
    const env = process.env;
    if (dryRun) {
      env.DRY_RUN = 'true';
    } else {
      env.DRY_RUN = 'false';
    }

    // Ruta al script del bot
    const botScript = path.join(__dirname, '../src/modules/DeFiProtocols/multichain-arb/scripts/liveArbBot.js');

    // Iniciar proceso
    botProcess = spawn('node', [botScript], {
      env,
      stdio: ['inherit', 'pipe', 'pipe'],
      detached: false
    });

    // Capturar output
    botProcess.stdout.on('data', (data) => {
      console.log(`[BOT STDOUT] ${data}`);
      updateStateFromBotOutput(data.toString());
    });

    botProcess.stderr.on('data', (data) => {
      console.log(`[BOT STDERR] ${data}`);
    });

    botProcess.on('exit', (code) => {
      console.log(`Bot process exited with code ${code}`);
      botProcess = null;
      botState.isRunning = false;
      saveState();
    });

    botState.isRunning = true;
    botState.isDryRun = dryRun || false;
    saveState();

    res.json({
      success: true,
      message: `Bot iniciado en modo ${dryRun ? 'DRY RUN' : 'LIVE'}`,
      isRunning: true
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/defi/multichain-arb/stop
 * Detiene el bot
 */
app.post('/api/defi/multichain-arb/stop', (req, res) => {
  if (!botProcess) {
    botState.isRunning = false;
    saveState();
    return res.json({ success: true, message: 'Bot ya no está corriendo', isRunning: false });
  }

  try {
    botProcess.kill('SIGTERM');
    botProcess = null;
    botState.isRunning = false;
    saveState();

    res.json({ success: true, message: 'Bot detenido', isRunning: false });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/defi/multichain-arb/reset
 * Reinicia las estadísticas
 */
app.post('/api/defi/multichain-arb/reset', (req, res) => {
  botState.stats = {
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
  botState.tradeLogs = [];
  botState.opportunities = [];
  saveState();

  res.json({ success: true, message: 'Estadísticas reiniciadas' });
});

/**
 * GET /api/defi/multichain-arb/logs
 * Retorna los últimos logs de trades
 */
app.get('/api/defi/multichain-arb/logs', (req, res) => {
  const loaded = loadState();
  res.json({ logs: loaded.tradeLogs.slice(-100) });
});

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────

function updateStateFromBotOutput(output) {
  // Parsear output del bot para actualizar estado
  // Esto es un ejemplo básico - adaptarlo según el formato del bot
  
  try {
    // Buscar patrones como "Ticks: 100" en el output
    const tickMatch = output.match(/Ticks:\s*(\d+)/);
    if (tickMatch) {
      botState.stats.totalTicks = parseInt(tickMatch[1]);
    }

    // Buscar patrones de profit
    const profitMatch = output.match(/Net profit:\s*\$?([\d.]+)/);
    if (profitMatch) {
      botState.stats.netProfitUsd = parseFloat(profitMatch[1]);
    }

    // Buscar chain actual
    const chainMatch = output.match(/Chain:\s*(\w+)/);
    if (chainMatch) {
      botState.stats.currentChain = chainMatch[1];
    }

    saveState();
  } catch (e) {
    // Ignorar errores de parsing
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// STARTUP
// ─────────────────────────────────────────────────────────────────────────────

app.listen(PORT, () => {
  console.log(`
╔════════════════════════════════════════════════════════════════════════════════╗
║                                                                                ║
║   🤖 ARBITRAGE BOT API SERVER (REAL-TIME)                                      ║
║                                                                                ║
║   Server: http://localhost:${PORT}                                              ║
║   Endpoints:                                                                   ║
║   - GET  /api/defi/multichain-arb/status      → Estado actual                 ║
║   - POST /api/defi/multichain-arb/start       → Iniciar bot                   ║
║   - POST /api/defi/multichain-arb/stop        → Detener bot                   ║
║   - POST /api/defi/multichain-arb/reset       → Reiniciar stats               ║
║   - GET  /api/defi/multichain-arb/logs        → Últimos 100 trades            ║
║                                                                                ║
║   El bot se ejecutará con las credenciales en .env                            ║
║   Modo: ${process.env.DRY_RUN === 'true' ? 'DRY RUN (Simulación)' : 'LIVE (Real)'}                                           ║
║                                                                                ║
╚════════════════════════════════════════════════════════════════════════════════╝
  `);

  // Cargar estado previo
  const prevState = loadState();
  if (prevState && prevState.stats) {
    Object.assign(botState, prevState);
  }
});



/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * MULTI-CHAIN ARBITRAGE BOT - REAL-TIME SERVER
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * Este servidor ejecuta el bot de arbitraje en tiempo real y expone:
 * - Estado en vivo
 * - Control (start/stop)
 * - Datos de chains, trades, oportunidades
 * - Stats del AI (Thompson Sampling)
 */

import express from 'express';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { spawn } from 'child_process';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = 3100;

// ─────────────────────────────────────────────────────────────────────────────
// STATE & STORAGE
// ─────────────────────────────────────────────────────────────────────────────

let botProcess = null;
let botState = {
  isRunning: false,
  isDryRun: false,
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
    { chain: 'base', name: 'Base', chainId: 8453, balance: '0.0', balanceUsd: 0, routes: 0, isActive: true, lastTick: Date.now(), explorer: 'https://basescan.org' },
    { chain: 'arbitrum', name: 'Arbitrum', chainId: 42161, balance: '0.0', balanceUsd: 0, routes: 0, isActive: true, lastTick: Date.now(), explorer: 'https://arbiscan.io' },
    { chain: 'optimism', name: 'Optimism', chainId: 10, balance: '0.0', balanceUsd: 0, routes: 0, isActive: true, lastTick: Date.now(), explorer: 'https://optimistic.etherscan.io' }
  ],
  tradeLogs: [],
  opportunities: [],
  banditStates: [
    { chain: 'base', alpha: 2, beta: 2, winRate: 50, selected: true },
    { chain: 'arbitrum', alpha: 2, beta: 2, winRate: 50, selected: false },
    { chain: 'optimism', alpha: 2, beta: 2, winRate: 50, selected: false }
  ]
};

const stateFile = path.join(__dirname, '../bot-state.json');

// ─────────────────────────────────────────────────────────────────────────────
// MIDDLEWARE
// ─────────────────────────────────────────────────────────────────────────────

app.use(cors());
app.use(express.json());

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────

function saveState() {
  try {
    fs.writeFileSync(stateFile, JSON.stringify(botState, null, 2));
  } catch (e) {
    console.error('Error saving state:', e);
  }
}

function loadState() {
  try {
    if (fs.existsSync(stateFile)) {
      const data = fs.readFileSync(stateFile, 'utf8');
      return JSON.parse(data);
    }
  } catch (e) {
    console.error('Error loading state:', e);
  }
  return botState;
}

// ─────────────────────────────────────────────────────────────────────────────
// ROUTES
// ─────────────────────────────────────────────────────────────────────────────

/**
 * GET /api/defi/multichain-arb/status
 * Retorna el estado actual del bot
 */
app.get('/api/defi/multichain-arb/status', (req, res) => {
  const loaded = loadState();
  res.json(loaded);
});

/**
 * POST /api/defi/multichain-arb/start
 * Inicia el bot en modo LIVE o DRY_RUN
 */
app.post('/api/defi/multichain-arb/start', async (req, res) => {
  const { dryRun } = req.body;

  if (botProcess) {
    return res.status(400).json({ success: false, error: 'Bot ya está corriendo' });
  }

  try {
    // Determinar el modo
    const env = process.env;
    if (dryRun) {
      env.DRY_RUN = 'true';
    } else {
      env.DRY_RUN = 'false';
    }

    // Ruta al script del bot
    const botScript = path.join(__dirname, '../src/modules/DeFiProtocols/multichain-arb/scripts/liveArbBot.js');

    // Iniciar proceso
    botProcess = spawn('node', [botScript], {
      env,
      stdio: ['inherit', 'pipe', 'pipe'],
      detached: false
    });

    // Capturar output
    botProcess.stdout.on('data', (data) => {
      console.log(`[BOT STDOUT] ${data}`);
      updateStateFromBotOutput(data.toString());
    });

    botProcess.stderr.on('data', (data) => {
      console.log(`[BOT STDERR] ${data}`);
    });

    botProcess.on('exit', (code) => {
      console.log(`Bot process exited with code ${code}`);
      botProcess = null;
      botState.isRunning = false;
      saveState();
    });

    botState.isRunning = true;
    botState.isDryRun = dryRun || false;
    saveState();

    res.json({
      success: true,
      message: `Bot iniciado en modo ${dryRun ? 'DRY RUN' : 'LIVE'}`,
      isRunning: true
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/defi/multichain-arb/stop
 * Detiene el bot
 */
app.post('/api/defi/multichain-arb/stop', (req, res) => {
  if (!botProcess) {
    botState.isRunning = false;
    saveState();
    return res.json({ success: true, message: 'Bot ya no está corriendo', isRunning: false });
  }

  try {
    botProcess.kill('SIGTERM');
    botProcess = null;
    botState.isRunning = false;
    saveState();

    res.json({ success: true, message: 'Bot detenido', isRunning: false });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/defi/multichain-arb/reset
 * Reinicia las estadísticas
 */
app.post('/api/defi/multichain-arb/reset', (req, res) => {
  botState.stats = {
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
  botState.tradeLogs = [];
  botState.opportunities = [];
  saveState();

  res.json({ success: true, message: 'Estadísticas reiniciadas' });
});

/**
 * GET /api/defi/multichain-arb/logs
 * Retorna los últimos logs de trades
 */
app.get('/api/defi/multichain-arb/logs', (req, res) => {
  const loaded = loadState();
  res.json({ logs: loaded.tradeLogs.slice(-100) });
});

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────

function updateStateFromBotOutput(output) {
  // Parsear output del bot para actualizar estado
  // Esto es un ejemplo básico - adaptarlo según el formato del bot
  
  try {
    // Buscar patrones como "Ticks: 100" en el output
    const tickMatch = output.match(/Ticks:\s*(\d+)/);
    if (tickMatch) {
      botState.stats.totalTicks = parseInt(tickMatch[1]);
    }

    // Buscar patrones de profit
    const profitMatch = output.match(/Net profit:\s*\$?([\d.]+)/);
    if (profitMatch) {
      botState.stats.netProfitUsd = parseFloat(profitMatch[1]);
    }

    // Buscar chain actual
    const chainMatch = output.match(/Chain:\s*(\w+)/);
    if (chainMatch) {
      botState.stats.currentChain = chainMatch[1];
    }

    saveState();
  } catch (e) {
    // Ignorar errores de parsing
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// STARTUP
// ─────────────────────────────────────────────────────────────────────────────

app.listen(PORT, () => {
  console.log(`
╔════════════════════════════════════════════════════════════════════════════════╗
║                                                                                ║
║   🤖 ARBITRAGE BOT API SERVER (REAL-TIME)                                      ║
║                                                                                ║
║   Server: http://localhost:${PORT}                                              ║
║   Endpoints:                                                                   ║
║   - GET  /api/defi/multichain-arb/status      → Estado actual                 ║
║   - POST /api/defi/multichain-arb/start       → Iniciar bot                   ║
║   - POST /api/defi/multichain-arb/stop        → Detener bot                   ║
║   - POST /api/defi/multichain-arb/reset       → Reiniciar stats               ║
║   - GET  /api/defi/multichain-arb/logs        → Últimos 100 trades            ║
║                                                                                ║
║   El bot se ejecutará con las credenciales en .env                            ║
║   Modo: ${process.env.DRY_RUN === 'true' ? 'DRY RUN (Simulación)' : 'LIVE (Real)'}                                           ║
║                                                                                ║
╚════════════════════════════════════════════════════════════════════════════════╝
  `);

  // Cargar estado previo
  const prevState = loadState();
  if (prevState && prevState.stats) {
    Object.assign(botState, prevState);
  }
});




/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * MULTI-CHAIN ARBITRAGE BOT - REAL-TIME SERVER
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * Este servidor ejecuta el bot de arbitraje en tiempo real y expone:
 * - Estado en vivo
 * - Control (start/stop)
 * - Datos de chains, trades, oportunidades
 * - Stats del AI (Thompson Sampling)
 */

import express from 'express';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { spawn } from 'child_process';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = 3100;

// ─────────────────────────────────────────────────────────────────────────────
// STATE & STORAGE
// ─────────────────────────────────────────────────────────────────────────────

let botProcess = null;
let botState = {
  isRunning: false,
  isDryRun: false,
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
    { chain: 'base', name: 'Base', chainId: 8453, balance: '0.0', balanceUsd: 0, routes: 0, isActive: true, lastTick: Date.now(), explorer: 'https://basescan.org' },
    { chain: 'arbitrum', name: 'Arbitrum', chainId: 42161, balance: '0.0', balanceUsd: 0, routes: 0, isActive: true, lastTick: Date.now(), explorer: 'https://arbiscan.io' },
    { chain: 'optimism', name: 'Optimism', chainId: 10, balance: '0.0', balanceUsd: 0, routes: 0, isActive: true, lastTick: Date.now(), explorer: 'https://optimistic.etherscan.io' }
  ],
  tradeLogs: [],
  opportunities: [],
  banditStates: [
    { chain: 'base', alpha: 2, beta: 2, winRate: 50, selected: true },
    { chain: 'arbitrum', alpha: 2, beta: 2, winRate: 50, selected: false },
    { chain: 'optimism', alpha: 2, beta: 2, winRate: 50, selected: false }
  ]
};

const stateFile = path.join(__dirname, '../bot-state.json');

// ─────────────────────────────────────────────────────────────────────────────
// MIDDLEWARE
// ─────────────────────────────────────────────────────────────────────────────

app.use(cors());
app.use(express.json());

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────

function saveState() {
  try {
    fs.writeFileSync(stateFile, JSON.stringify(botState, null, 2));
  } catch (e) {
    console.error('Error saving state:', e);
  }
}

function loadState() {
  try {
    if (fs.existsSync(stateFile)) {
      const data = fs.readFileSync(stateFile, 'utf8');
      return JSON.parse(data);
    }
  } catch (e) {
    console.error('Error loading state:', e);
  }
  return botState;
}

// ─────────────────────────────────────────────────────────────────────────────
// ROUTES
// ─────────────────────────────────────────────────────────────────────────────

/**
 * GET /api/defi/multichain-arb/status
 * Retorna el estado actual del bot
 */
app.get('/api/defi/multichain-arb/status', (req, res) => {
  const loaded = loadState();
  res.json(loaded);
});

/**
 * POST /api/defi/multichain-arb/start
 * Inicia el bot en modo LIVE o DRY_RUN
 */
app.post('/api/defi/multichain-arb/start', async (req, res) => {
  const { dryRun } = req.body;

  if (botProcess) {
    return res.status(400).json({ success: false, error: 'Bot ya está corriendo' });
  }

  try {
    // Determinar el modo
    const env = process.env;
    if (dryRun) {
      env.DRY_RUN = 'true';
    } else {
      env.DRY_RUN = 'false';
    }

    // Ruta al script del bot
    const botScript = path.join(__dirname, '../src/modules/DeFiProtocols/multichain-arb/scripts/liveArbBot.js');

    // Iniciar proceso
    botProcess = spawn('node', [botScript], {
      env,
      stdio: ['inherit', 'pipe', 'pipe'],
      detached: false
    });

    // Capturar output
    botProcess.stdout.on('data', (data) => {
      console.log(`[BOT STDOUT] ${data}`);
      updateStateFromBotOutput(data.toString());
    });

    botProcess.stderr.on('data', (data) => {
      console.log(`[BOT STDERR] ${data}`);
    });

    botProcess.on('exit', (code) => {
      console.log(`Bot process exited with code ${code}`);
      botProcess = null;
      botState.isRunning = false;
      saveState();
    });

    botState.isRunning = true;
    botState.isDryRun = dryRun || false;
    saveState();

    res.json({
      success: true,
      message: `Bot iniciado en modo ${dryRun ? 'DRY RUN' : 'LIVE'}`,
      isRunning: true
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/defi/multichain-arb/stop
 * Detiene el bot
 */
app.post('/api/defi/multichain-arb/stop', (req, res) => {
  if (!botProcess) {
    botState.isRunning = false;
    saveState();
    return res.json({ success: true, message: 'Bot ya no está corriendo', isRunning: false });
  }

  try {
    botProcess.kill('SIGTERM');
    botProcess = null;
    botState.isRunning = false;
    saveState();

    res.json({ success: true, message: 'Bot detenido', isRunning: false });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/defi/multichain-arb/reset
 * Reinicia las estadísticas
 */
app.post('/api/defi/multichain-arb/reset', (req, res) => {
  botState.stats = {
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
  botState.tradeLogs = [];
  botState.opportunities = [];
  saveState();

  res.json({ success: true, message: 'Estadísticas reiniciadas' });
});

/**
 * GET /api/defi/multichain-arb/logs
 * Retorna los últimos logs de trades
 */
app.get('/api/defi/multichain-arb/logs', (req, res) => {
  const loaded = loadState();
  res.json({ logs: loaded.tradeLogs.slice(-100) });
});

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────

function updateStateFromBotOutput(output) {
  // Parsear output del bot para actualizar estado
  // Esto es un ejemplo básico - adaptarlo según el formato del bot
  
  try {
    // Buscar patrones como "Ticks: 100" en el output
    const tickMatch = output.match(/Ticks:\s*(\d+)/);
    if (tickMatch) {
      botState.stats.totalTicks = parseInt(tickMatch[1]);
    }

    // Buscar patrones de profit
    const profitMatch = output.match(/Net profit:\s*\$?([\d.]+)/);
    if (profitMatch) {
      botState.stats.netProfitUsd = parseFloat(profitMatch[1]);
    }

    // Buscar chain actual
    const chainMatch = output.match(/Chain:\s*(\w+)/);
    if (chainMatch) {
      botState.stats.currentChain = chainMatch[1];
    }

    saveState();
  } catch (e) {
    // Ignorar errores de parsing
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// STARTUP
// ─────────────────────────────────────────────────────────────────────────────

app.listen(PORT, () => {
  console.log(`
╔════════════════════════════════════════════════════════════════════════════════╗
║                                                                                ║
║   🤖 ARBITRAGE BOT API SERVER (REAL-TIME)                                      ║
║                                                                                ║
║   Server: http://localhost:${PORT}                                              ║
║   Endpoints:                                                                   ║
║   - GET  /api/defi/multichain-arb/status      → Estado actual                 ║
║   - POST /api/defi/multichain-arb/start       → Iniciar bot                   ║
║   - POST /api/defi/multichain-arb/stop        → Detener bot                   ║
║   - POST /api/defi/multichain-arb/reset       → Reiniciar stats               ║
║   - GET  /api/defi/multichain-arb/logs        → Últimos 100 trades            ║
║                                                                                ║
║   El bot se ejecutará con las credenciales en .env                            ║
║   Modo: ${process.env.DRY_RUN === 'true' ? 'DRY RUN (Simulación)' : 'LIVE (Real)'}                                           ║
║                                                                                ║
╚════════════════════════════════════════════════════════════════════════════════╝
  `);

  // Cargar estado previo
  const prevState = loadState();
  if (prevState && prevState.stats) {
    Object.assign(botState, prevState);
  }
});



/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * MULTI-CHAIN ARBITRAGE BOT - REAL-TIME SERVER
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * Este servidor ejecuta el bot de arbitraje en tiempo real y expone:
 * - Estado en vivo
 * - Control (start/stop)
 * - Datos de chains, trades, oportunidades
 * - Stats del AI (Thompson Sampling)
 */

import express from 'express';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { spawn } from 'child_process';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = 3100;

// ─────────────────────────────────────────────────────────────────────────────
// STATE & STORAGE
// ─────────────────────────────────────────────────────────────────────────────

let botProcess = null;
let botState = {
  isRunning: false,
  isDryRun: false,
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
    { chain: 'base', name: 'Base', chainId: 8453, balance: '0.0', balanceUsd: 0, routes: 0, isActive: true, lastTick: Date.now(), explorer: 'https://basescan.org' },
    { chain: 'arbitrum', name: 'Arbitrum', chainId: 42161, balance: '0.0', balanceUsd: 0, routes: 0, isActive: true, lastTick: Date.now(), explorer: 'https://arbiscan.io' },
    { chain: 'optimism', name: 'Optimism', chainId: 10, balance: '0.0', balanceUsd: 0, routes: 0, isActive: true, lastTick: Date.now(), explorer: 'https://optimistic.etherscan.io' }
  ],
  tradeLogs: [],
  opportunities: [],
  banditStates: [
    { chain: 'base', alpha: 2, beta: 2, winRate: 50, selected: true },
    { chain: 'arbitrum', alpha: 2, beta: 2, winRate: 50, selected: false },
    { chain: 'optimism', alpha: 2, beta: 2, winRate: 50, selected: false }
  ]
};

const stateFile = path.join(__dirname, '../bot-state.json');

// ─────────────────────────────────────────────────────────────────────────────
// MIDDLEWARE
// ─────────────────────────────────────────────────────────────────────────────

app.use(cors());
app.use(express.json());

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────

function saveState() {
  try {
    fs.writeFileSync(stateFile, JSON.stringify(botState, null, 2));
  } catch (e) {
    console.error('Error saving state:', e);
  }
}

function loadState() {
  try {
    if (fs.existsSync(stateFile)) {
      const data = fs.readFileSync(stateFile, 'utf8');
      return JSON.parse(data);
    }
  } catch (e) {
    console.error('Error loading state:', e);
  }
  return botState;
}

// ─────────────────────────────────────────────────────────────────────────────
// ROUTES
// ─────────────────────────────────────────────────────────────────────────────

/**
 * GET /api/defi/multichain-arb/status
 * Retorna el estado actual del bot
 */
app.get('/api/defi/multichain-arb/status', (req, res) => {
  const loaded = loadState();
  res.json(loaded);
});

/**
 * POST /api/defi/multichain-arb/start
 * Inicia el bot en modo LIVE o DRY_RUN
 */
app.post('/api/defi/multichain-arb/start', async (req, res) => {
  const { dryRun } = req.body;

  if (botProcess) {
    return res.status(400).json({ success: false, error: 'Bot ya está corriendo' });
  }

  try {
    // Determinar el modo
    const env = process.env;
    if (dryRun) {
      env.DRY_RUN = 'true';
    } else {
      env.DRY_RUN = 'false';
    }

    // Ruta al script del bot
    const botScript = path.join(__dirname, '../src/modules/DeFiProtocols/multichain-arb/scripts/liveArbBot.js');

    // Iniciar proceso
    botProcess = spawn('node', [botScript], {
      env,
      stdio: ['inherit', 'pipe', 'pipe'],
      detached: false
    });

    // Capturar output
    botProcess.stdout.on('data', (data) => {
      console.log(`[BOT STDOUT] ${data}`);
      updateStateFromBotOutput(data.toString());
    });

    botProcess.stderr.on('data', (data) => {
      console.log(`[BOT STDERR] ${data}`);
    });

    botProcess.on('exit', (code) => {
      console.log(`Bot process exited with code ${code}`);
      botProcess = null;
      botState.isRunning = false;
      saveState();
    });

    botState.isRunning = true;
    botState.isDryRun = dryRun || false;
    saveState();

    res.json({
      success: true,
      message: `Bot iniciado en modo ${dryRun ? 'DRY RUN' : 'LIVE'}`,
      isRunning: true
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/defi/multichain-arb/stop
 * Detiene el bot
 */
app.post('/api/defi/multichain-arb/stop', (req, res) => {
  if (!botProcess) {
    botState.isRunning = false;
    saveState();
    return res.json({ success: true, message: 'Bot ya no está corriendo', isRunning: false });
  }

  try {
    botProcess.kill('SIGTERM');
    botProcess = null;
    botState.isRunning = false;
    saveState();

    res.json({ success: true, message: 'Bot detenido', isRunning: false });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/defi/multichain-arb/reset
 * Reinicia las estadísticas
 */
app.post('/api/defi/multichain-arb/reset', (req, res) => {
  botState.stats = {
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
  botState.tradeLogs = [];
  botState.opportunities = [];
  saveState();

  res.json({ success: true, message: 'Estadísticas reiniciadas' });
});

/**
 * GET /api/defi/multichain-arb/logs
 * Retorna los últimos logs de trades
 */
app.get('/api/defi/multichain-arb/logs', (req, res) => {
  const loaded = loadState();
  res.json({ logs: loaded.tradeLogs.slice(-100) });
});

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────

function updateStateFromBotOutput(output) {
  // Parsear output del bot para actualizar estado
  // Esto es un ejemplo básico - adaptarlo según el formato del bot
  
  try {
    // Buscar patrones como "Ticks: 100" en el output
    const tickMatch = output.match(/Ticks:\s*(\d+)/);
    if (tickMatch) {
      botState.stats.totalTicks = parseInt(tickMatch[1]);
    }

    // Buscar patrones de profit
    const profitMatch = output.match(/Net profit:\s*\$?([\d.]+)/);
    if (profitMatch) {
      botState.stats.netProfitUsd = parseFloat(profitMatch[1]);
    }

    // Buscar chain actual
    const chainMatch = output.match(/Chain:\s*(\w+)/);
    if (chainMatch) {
      botState.stats.currentChain = chainMatch[1];
    }

    saveState();
  } catch (e) {
    // Ignorar errores de parsing
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// STARTUP
// ─────────────────────────────────────────────────────────────────────────────

app.listen(PORT, () => {
  console.log(`
╔════════════════════════════════════════════════════════════════════════════════╗
║                                                                                ║
║   🤖 ARBITRAGE BOT API SERVER (REAL-TIME)                                      ║
║                                                                                ║
║   Server: http://localhost:${PORT}                                              ║
║   Endpoints:                                                                   ║
║   - GET  /api/defi/multichain-arb/status      → Estado actual                 ║
║   - POST /api/defi/multichain-arb/start       → Iniciar bot                   ║
║   - POST /api/defi/multichain-arb/stop        → Detener bot                   ║
║   - POST /api/defi/multichain-arb/reset       → Reiniciar stats               ║
║   - GET  /api/defi/multichain-arb/logs        → Últimos 100 trades            ║
║                                                                                ║
║   El bot se ejecutará con las credenciales en .env                            ║
║   Modo: ${process.env.DRY_RUN === 'true' ? 'DRY RUN (Simulación)' : 'LIVE (Real)'}                                           ║
║                                                                                ║
╚════════════════════════════════════════════════════════════════════════════════╝
  `);

  // Cargar estado previo
  const prevState = loadState();
  if (prevState && prevState.stats) {
    Object.assign(botState, prevState);
  }
});



/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * MULTI-CHAIN ARBITRAGE BOT - REAL-TIME SERVER
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * Este servidor ejecuta el bot de arbitraje en tiempo real y expone:
 * - Estado en vivo
 * - Control (start/stop)
 * - Datos de chains, trades, oportunidades
 * - Stats del AI (Thompson Sampling)
 */

import express from 'express';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { spawn } from 'child_process';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = 3100;

// ─────────────────────────────────────────────────────────────────────────────
// STATE & STORAGE
// ─────────────────────────────────────────────────────────────────────────────

let botProcess = null;
let botState = {
  isRunning: false,
  isDryRun: false,
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
    { chain: 'base', name: 'Base', chainId: 8453, balance: '0.0', balanceUsd: 0, routes: 0, isActive: true, lastTick: Date.now(), explorer: 'https://basescan.org' },
    { chain: 'arbitrum', name: 'Arbitrum', chainId: 42161, balance: '0.0', balanceUsd: 0, routes: 0, isActive: true, lastTick: Date.now(), explorer: 'https://arbiscan.io' },
    { chain: 'optimism', name: 'Optimism', chainId: 10, balance: '0.0', balanceUsd: 0, routes: 0, isActive: true, lastTick: Date.now(), explorer: 'https://optimistic.etherscan.io' }
  ],
  tradeLogs: [],
  opportunities: [],
  banditStates: [
    { chain: 'base', alpha: 2, beta: 2, winRate: 50, selected: true },
    { chain: 'arbitrum', alpha: 2, beta: 2, winRate: 50, selected: false },
    { chain: 'optimism', alpha: 2, beta: 2, winRate: 50, selected: false }
  ]
};

const stateFile = path.join(__dirname, '../bot-state.json');

// ─────────────────────────────────────────────────────────────────────────────
// MIDDLEWARE
// ─────────────────────────────────────────────────────────────────────────────

app.use(cors());
app.use(express.json());

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────

function saveState() {
  try {
    fs.writeFileSync(stateFile, JSON.stringify(botState, null, 2));
  } catch (e) {
    console.error('Error saving state:', e);
  }
}

function loadState() {
  try {
    if (fs.existsSync(stateFile)) {
      const data = fs.readFileSync(stateFile, 'utf8');
      return JSON.parse(data);
    }
  } catch (e) {
    console.error('Error loading state:', e);
  }
  return botState;
}

// ─────────────────────────────────────────────────────────────────────────────
// ROUTES
// ─────────────────────────────────────────────────────────────────────────────

/**
 * GET /api/defi/multichain-arb/status
 * Retorna el estado actual del bot
 */
app.get('/api/defi/multichain-arb/status', (req, res) => {
  const loaded = loadState();
  res.json(loaded);
});

/**
 * POST /api/defi/multichain-arb/start
 * Inicia el bot en modo LIVE o DRY_RUN
 */
app.post('/api/defi/multichain-arb/start', async (req, res) => {
  const { dryRun } = req.body;

  if (botProcess) {
    return res.status(400).json({ success: false, error: 'Bot ya está corriendo' });
  }

  try {
    // Determinar el modo
    const env = process.env;
    if (dryRun) {
      env.DRY_RUN = 'true';
    } else {
      env.DRY_RUN = 'false';
    }

    // Ruta al script del bot
    const botScript = path.join(__dirname, '../src/modules/DeFiProtocols/multichain-arb/scripts/liveArbBot.js');

    // Iniciar proceso
    botProcess = spawn('node', [botScript], {
      env,
      stdio: ['inherit', 'pipe', 'pipe'],
      detached: false
    });

    // Capturar output
    botProcess.stdout.on('data', (data) => {
      console.log(`[BOT STDOUT] ${data}`);
      updateStateFromBotOutput(data.toString());
    });

    botProcess.stderr.on('data', (data) => {
      console.log(`[BOT STDERR] ${data}`);
    });

    botProcess.on('exit', (code) => {
      console.log(`Bot process exited with code ${code}`);
      botProcess = null;
      botState.isRunning = false;
      saveState();
    });

    botState.isRunning = true;
    botState.isDryRun = dryRun || false;
    saveState();

    res.json({
      success: true,
      message: `Bot iniciado en modo ${dryRun ? 'DRY RUN' : 'LIVE'}`,
      isRunning: true
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/defi/multichain-arb/stop
 * Detiene el bot
 */
app.post('/api/defi/multichain-arb/stop', (req, res) => {
  if (!botProcess) {
    botState.isRunning = false;
    saveState();
    return res.json({ success: true, message: 'Bot ya no está corriendo', isRunning: false });
  }

  try {
    botProcess.kill('SIGTERM');
    botProcess = null;
    botState.isRunning = false;
    saveState();

    res.json({ success: true, message: 'Bot detenido', isRunning: false });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/defi/multichain-arb/reset
 * Reinicia las estadísticas
 */
app.post('/api/defi/multichain-arb/reset', (req, res) => {
  botState.stats = {
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
  botState.tradeLogs = [];
  botState.opportunities = [];
  saveState();

  res.json({ success: true, message: 'Estadísticas reiniciadas' });
});

/**
 * GET /api/defi/multichain-arb/logs
 * Retorna los últimos logs de trades
 */
app.get('/api/defi/multichain-arb/logs', (req, res) => {
  const loaded = loadState();
  res.json({ logs: loaded.tradeLogs.slice(-100) });
});

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────

function updateStateFromBotOutput(output) {
  // Parsear output del bot para actualizar estado
  // Esto es un ejemplo básico - adaptarlo según el formato del bot
  
  try {
    // Buscar patrones como "Ticks: 100" en el output
    const tickMatch = output.match(/Ticks:\s*(\d+)/);
    if (tickMatch) {
      botState.stats.totalTicks = parseInt(tickMatch[1]);
    }

    // Buscar patrones de profit
    const profitMatch = output.match(/Net profit:\s*\$?([\d.]+)/);
    if (profitMatch) {
      botState.stats.netProfitUsd = parseFloat(profitMatch[1]);
    }

    // Buscar chain actual
    const chainMatch = output.match(/Chain:\s*(\w+)/);
    if (chainMatch) {
      botState.stats.currentChain = chainMatch[1];
    }

    saveState();
  } catch (e) {
    // Ignorar errores de parsing
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// STARTUP
// ─────────────────────────────────────────────────────────────────────────────

app.listen(PORT, () => {
  console.log(`
╔════════════════════════════════════════════════════════════════════════════════╗
║                                                                                ║
║   🤖 ARBITRAGE BOT API SERVER (REAL-TIME)                                      ║
║                                                                                ║
║   Server: http://localhost:${PORT}                                              ║
║   Endpoints:                                                                   ║
║   - GET  /api/defi/multichain-arb/status      → Estado actual                 ║
║   - POST /api/defi/multichain-arb/start       → Iniciar bot                   ║
║   - POST /api/defi/multichain-arb/stop        → Detener bot                   ║
║   - POST /api/defi/multichain-arb/reset       → Reiniciar stats               ║
║   - GET  /api/defi/multichain-arb/logs        → Últimos 100 trades            ║
║                                                                                ║
║   El bot se ejecutará con las credenciales en .env                            ║
║   Modo: ${process.env.DRY_RUN === 'true' ? 'DRY RUN (Simulación)' : 'LIVE (Real)'}                                           ║
║                                                                                ║
╚════════════════════════════════════════════════════════════════════════════════╝
  `);

  // Cargar estado previo
  const prevState = loadState();
  if (prevState && prevState.stats) {
    Object.assign(botState, prevState);
  }
});



/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * MULTI-CHAIN ARBITRAGE BOT - REAL-TIME SERVER
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * Este servidor ejecuta el bot de arbitraje en tiempo real y expone:
 * - Estado en vivo
 * - Control (start/stop)
 * - Datos de chains, trades, oportunidades
 * - Stats del AI (Thompson Sampling)
 */

import express from 'express';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { spawn } from 'child_process';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = 3100;

// ─────────────────────────────────────────────────────────────────────────────
// STATE & STORAGE
// ─────────────────────────────────────────────────────────────────────────────

let botProcess = null;
let botState = {
  isRunning: false,
  isDryRun: false,
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
    { chain: 'base', name: 'Base', chainId: 8453, balance: '0.0', balanceUsd: 0, routes: 0, isActive: true, lastTick: Date.now(), explorer: 'https://basescan.org' },
    { chain: 'arbitrum', name: 'Arbitrum', chainId: 42161, balance: '0.0', balanceUsd: 0, routes: 0, isActive: true, lastTick: Date.now(), explorer: 'https://arbiscan.io' },
    { chain: 'optimism', name: 'Optimism', chainId: 10, balance: '0.0', balanceUsd: 0, routes: 0, isActive: true, lastTick: Date.now(), explorer: 'https://optimistic.etherscan.io' }
  ],
  tradeLogs: [],
  opportunities: [],
  banditStates: [
    { chain: 'base', alpha: 2, beta: 2, winRate: 50, selected: true },
    { chain: 'arbitrum', alpha: 2, beta: 2, winRate: 50, selected: false },
    { chain: 'optimism', alpha: 2, beta: 2, winRate: 50, selected: false }
  ]
};

const stateFile = path.join(__dirname, '../bot-state.json');

// ─────────────────────────────────────────────────────────────────────────────
// MIDDLEWARE
// ─────────────────────────────────────────────────────────────────────────────

app.use(cors());
app.use(express.json());

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────

function saveState() {
  try {
    fs.writeFileSync(stateFile, JSON.stringify(botState, null, 2));
  } catch (e) {
    console.error('Error saving state:', e);
  }
}

function loadState() {
  try {
    if (fs.existsSync(stateFile)) {
      const data = fs.readFileSync(stateFile, 'utf8');
      return JSON.parse(data);
    }
  } catch (e) {
    console.error('Error loading state:', e);
  }
  return botState;
}

// ─────────────────────────────────────────────────────────────────────────────
// ROUTES
// ─────────────────────────────────────────────────────────────────────────────

/**
 * GET /api/defi/multichain-arb/status
 * Retorna el estado actual del bot
 */
app.get('/api/defi/multichain-arb/status', (req, res) => {
  const loaded = loadState();
  res.json(loaded);
});

/**
 * POST /api/defi/multichain-arb/start
 * Inicia el bot en modo LIVE o DRY_RUN
 */
app.post('/api/defi/multichain-arb/start', async (req, res) => {
  const { dryRun } = req.body;

  if (botProcess) {
    return res.status(400).json({ success: false, error: 'Bot ya está corriendo' });
  }

  try {
    // Determinar el modo
    const env = process.env;
    if (dryRun) {
      env.DRY_RUN = 'true';
    } else {
      env.DRY_RUN = 'false';
    }

    // Ruta al script del bot
    const botScript = path.join(__dirname, '../src/modules/DeFiProtocols/multichain-arb/scripts/liveArbBot.js');

    // Iniciar proceso
    botProcess = spawn('node', [botScript], {
      env,
      stdio: ['inherit', 'pipe', 'pipe'],
      detached: false
    });

    // Capturar output
    botProcess.stdout.on('data', (data) => {
      console.log(`[BOT STDOUT] ${data}`);
      updateStateFromBotOutput(data.toString());
    });

    botProcess.stderr.on('data', (data) => {
      console.log(`[BOT STDERR] ${data}`);
    });

    botProcess.on('exit', (code) => {
      console.log(`Bot process exited with code ${code}`);
      botProcess = null;
      botState.isRunning = false;
      saveState();
    });

    botState.isRunning = true;
    botState.isDryRun = dryRun || false;
    saveState();

    res.json({
      success: true,
      message: `Bot iniciado en modo ${dryRun ? 'DRY RUN' : 'LIVE'}`,
      isRunning: true
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/defi/multichain-arb/stop
 * Detiene el bot
 */
app.post('/api/defi/multichain-arb/stop', (req, res) => {
  if (!botProcess) {
    botState.isRunning = false;
    saveState();
    return res.json({ success: true, message: 'Bot ya no está corriendo', isRunning: false });
  }

  try {
    botProcess.kill('SIGTERM');
    botProcess = null;
    botState.isRunning = false;
    saveState();

    res.json({ success: true, message: 'Bot detenido', isRunning: false });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/defi/multichain-arb/reset
 * Reinicia las estadísticas
 */
app.post('/api/defi/multichain-arb/reset', (req, res) => {
  botState.stats = {
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
  botState.tradeLogs = [];
  botState.opportunities = [];
  saveState();

  res.json({ success: true, message: 'Estadísticas reiniciadas' });
});

/**
 * GET /api/defi/multichain-arb/logs
 * Retorna los últimos logs de trades
 */
app.get('/api/defi/multichain-arb/logs', (req, res) => {
  const loaded = loadState();
  res.json({ logs: loaded.tradeLogs.slice(-100) });
});

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────

function updateStateFromBotOutput(output) {
  // Parsear output del bot para actualizar estado
  // Esto es un ejemplo básico - adaptarlo según el formato del bot
  
  try {
    // Buscar patrones como "Ticks: 100" en el output
    const tickMatch = output.match(/Ticks:\s*(\d+)/);
    if (tickMatch) {
      botState.stats.totalTicks = parseInt(tickMatch[1]);
    }

    // Buscar patrones de profit
    const profitMatch = output.match(/Net profit:\s*\$?([\d.]+)/);
    if (profitMatch) {
      botState.stats.netProfitUsd = parseFloat(profitMatch[1]);
    }

    // Buscar chain actual
    const chainMatch = output.match(/Chain:\s*(\w+)/);
    if (chainMatch) {
      botState.stats.currentChain = chainMatch[1];
    }

    saveState();
  } catch (e) {
    // Ignorar errores de parsing
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// STARTUP
// ─────────────────────────────────────────────────────────────────────────────

app.listen(PORT, () => {
  console.log(`
╔════════════════════════════════════════════════════════════════════════════════╗
║                                                                                ║
║   🤖 ARBITRAGE BOT API SERVER (REAL-TIME)                                      ║
║                                                                                ║
║   Server: http://localhost:${PORT}                                              ║
║   Endpoints:                                                                   ║
║   - GET  /api/defi/multichain-arb/status      → Estado actual                 ║
║   - POST /api/defi/multichain-arb/start       → Iniciar bot                   ║
║   - POST /api/defi/multichain-arb/stop        → Detener bot                   ║
║   - POST /api/defi/multichain-arb/reset       → Reiniciar stats               ║
║   - GET  /api/defi/multichain-arb/logs        → Últimos 100 trades            ║
║                                                                                ║
║   El bot se ejecutará con las credenciales en .env                            ║
║   Modo: ${process.env.DRY_RUN === 'true' ? 'DRY RUN (Simulación)' : 'LIVE (Real)'}                                           ║
║                                                                                ║
╚════════════════════════════════════════════════════════════════════════════════╝
  `);

  // Cargar estado previo
  const prevState = loadState();
  if (prevState && prevState.stats) {
    Object.assign(botState, prevState);
  }
});




