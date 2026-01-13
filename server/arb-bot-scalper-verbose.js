/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * 🔍 SCALPER VERBOSE - MUESTRA TODAS LAS OPORTUNIDADES
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * Esta versión muestra TODAS las oportunidades analizadas, incluyendo:
 * - Spreads negativos (pérdida)
 * - Spreads positivos pero no rentables después de gas
 * - Oportunidades rentables
 * 
 * Útil para entender el mercado y calibrar parámetros.
 */

import express from 'express';
import cors from 'cors';
import { ethers } from 'ethers';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '../.env') });

const app = express();
const PORT = 3101;

app.use(cors());
app.use(express.json());

// ═══════════════════════════════════════════════════════════════════════════════
// CONFIGURACIÓN
// ═══════════════════════════════════════════════════════════════════════════════

const CONFIG = {
  SCAN_INTERVAL_MS: 2000,          // Más lento para ver mejor los logs
  MIN_PROFIT_USD: -10,             // Mostrar incluso pérdidas
  SHOW_ALL_QUOTES: true,           // Mostrar todos los quotes
  TRADE_AMOUNTS_ETH: [0.01],       // Solo un amount para simplificar
  FEE_TIERS: [500, 3000],          // 0.05% y 0.3%
  AUTO_EXECUTE: false,             // NO ejecutar automáticamente
  ETH_PRICE_USD: 3500
};

const PRIVATE_KEY = process.env.VITE_ETH_PRIVATE_KEY;
const WALLET_ADDRESS = process.env.VITE_ETH_WALLET_ADDRESS;

if (!PRIVATE_KEY || !WALLET_ADDRESS) {
  console.error('❌ ERROR: Credenciales no configuradas');
  process.exit(1);
}

// ═══════════════════════════════════════════════════════════════════════════════
// CHAINS
// ═══════════════════════════════════════════════════════════════════════════════

const CHAINS = {
  base: {
    name: 'Base',
    chainId: 8453,
    rpc: 'https://base-mainnet.g.alchemy.com/v2/mm-9UjI5oG51l94mRH3fh',
    explorer: 'https://basescan.org',
    tokens: {
      WETH: '0x4200000000000000000000000000000000000006',
      USDC: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913'
    },
    quoter: '0x3d4e44Eb1374240CE5F1B871ab261CD16335B76a',
    router: '0x2626664c2603336E57B271c5C0b26F421741e481'
  },
  arbitrum: {
    name: 'Arbitrum',
    chainId: 42161,
    rpc: 'https://arb1.arbitrum.io/rpc',
    explorer: 'https://arbiscan.io',
    tokens: {
      WETH: '0x82aF49447D8a07e3bd95BD0d56f35241523fBab1',
      USDC: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831'
    },
    quoter: '0x61fFE014bA17989E743c5F6cB21bF9697530B21e',
    router: '0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45'
  }
};

// ABIs
const QUOTER_ABI = [
  'function quoteExactInputSingle((address tokenIn, address tokenOut, uint256 amountIn, uint24 fee, uint160 sqrtPriceLimitX96)) external returns (uint256 amountOut, uint160 sqrtPriceX96After, uint32 initializedTicksCrossed, uint256 gasEstimate)'
];

// ═══════════════════════════════════════════════════════════════════════════════
// ESTADO
// ═══════════════════════════════════════════════════════════════════════════════

let state = {
  isRunning: false,
  isDryRun: true,
  startTime: null,
  mode: 'SCALPER_VERBOSE',
  stats: {
    totalScans: 0,
    opportunitiesFound: 0,
    positiveSpreadCount: 0,
    negativeSpreadCount: 0,
    profitableCount: 0,
    avgSpreadBps: 0,
    bestSpreadBps: 0,
    worstSpreadBps: 0,
    uptime: 0,
    currentChain: 'base'
  },
  chains: [],
  tradeLogs: [],
  opportunities: [],
  banditStates: [],
  allQuotes: []  // Guardar todos los quotes para análisis
};

let timer = null;
let providers = {};
let contracts = {};
let currentChainIndex = 0;
let allSpreads = [];

// ═══════════════════════════════════════════════════════════════════════════════
// INICIALIZAR
// ═══════════════════════════════════════════════════════════════════════════════

async function init() {
  console.log('[INIT] 🔌 Conectando...\n');
  
  for (const [key, chain] of Object.entries(CHAINS)) {
    try {
      providers[key] = new ethers.JsonRpcProvider(chain.rpc);
      contracts[key] = {
        quoter: new ethers.Contract(chain.quoter, QUOTER_ABI, providers[key])
      };
      
      const balance = await providers[key].getBalance(WALLET_ADDRESS);
      const balanceEth = parseFloat(ethers.formatEther(balance));
      
      state.chains.push({
        chain: key,
        name: chain.name,
        chainId: chain.chainId,
        balance: balanceEth.toFixed(6),
        balanceUsd: balanceEth * CONFIG.ETH_PRICE_USD,
        isActive: true,
        explorer: chain.explorer,
        ethPrice: 0
      });
      
      state.banditStates.push({
        chain: key,
        alpha: 2,
        beta: 2,
        winRate: 50,
        selected: key === 'base'
      });
      
      console.log(`   ✅ ${chain.name}: ${balanceEth.toFixed(6)} ETH`);
    } catch (e) {
      console.error(`   ❌ ${chain.name}: ${e.message}`);
    }
  }
  console.log('');
}

// ═══════════════════════════════════════════════════════════════════════════════
// ANÁLISIS DETALLADO
// ═══════════════════════════════════════════════════════════════════════════════

async function analyzeChain(chainKey) {
  const chain = CHAINS[chainKey];
  const provider = providers[chainKey];
  const quoter = contracts[chainKey].quoter;
  
  console.log(`\n═══════════════════════════════════════════════════════════════════`);
  console.log(`📊 ANÁLISIS: ${chain.name}`);
  console.log(`═══════════════════════════════════════════════════════════════════`);
  
  try {
    // Obtener gas price
    const feeData = await provider.getFeeData();
    const gasPrice = feeData.gasPrice || ethers.parseUnits('0.001', 'gwei');
    const gasPriceGwei = parseFloat(ethers.formatUnits(gasPrice, 'gwei'));
    const gasCostWei = gasPrice * 250000n;
    
    console.log(`⛽ Gas Price: ${gasPriceGwei.toFixed(4)} gwei`);
    console.log(`⛽ Estimated Gas Cost: ${ethers.formatEther(gasCostWei)} ETH`);
    
    // Obtener precio ETH
    let ethPrice = CONFIG.ETH_PRICE_USD;
    try {
      const priceQuote = await quoter.quoteExactInputSingle.staticCall({
        tokenIn: chain.tokens.WETH,
        tokenOut: chain.tokens.USDC,
        amountIn: ethers.parseEther('1'),
        fee: 500,
        sqrtPriceLimitX96: 0n
      });
      ethPrice = parseFloat(ethers.formatUnits(priceQuote[0], 6));
      console.log(`💰 ETH Price on ${chain.name}: $${ethPrice.toFixed(2)}`);
    } catch (e) {
      console.log(`💰 ETH Price: Using default $${ethPrice}`);
    }
    
    const gasCostUsd = parseFloat(ethers.formatEther(gasCostWei)) * ethPrice;
    console.log(`⛽ Gas Cost in USD: $${gasCostUsd.toFixed(4)}`);
    
    // Actualizar estado
    const chainState = state.chains.find(c => c.chain === chainKey);
    if (chainState) chainState.ethPrice = ethPrice;
    
    console.log(`\n📈 QUOTES WETH → USDC → WETH:`);
    console.log(`─────────────────────────────────────────────────────────────────`);
    
    const results = [];
    
    for (const amountEth of CONFIG.TRADE_AMOUNTS_ETH) {
      const amountWei = ethers.parseEther(amountEth.toString());
      
      for (let i = 0; i < CONFIG.FEE_TIERS.length; i++) {
        for (let j = 0; j < CONFIG.FEE_TIERS.length; j++) {
          const fee1 = CONFIG.FEE_TIERS[i];
          const fee2 = CONFIG.FEE_TIERS[j];
          
          try {
            // WETH → USDC
            const quote1 = await quoter.quoteExactInputSingle.staticCall({
              tokenIn: chain.tokens.WETH,
              tokenOut: chain.tokens.USDC,
              amountIn: amountWei,
              fee: fee1,
              sqrtPriceLimitX96: 0n
            });
            const usdcOut = quote1[0];
            const usdcOutFormatted = parseFloat(ethers.formatUnits(usdcOut, 6));
            
            // USDC → WETH
            const quote2 = await quoter.quoteExactInputSingle.staticCall({
              tokenIn: chain.tokens.USDC,
              tokenOut: chain.tokens.WETH,
              amountIn: usdcOut,
              fee: fee2,
              sqrtPriceLimitX96: 0n
            });
            const wethOut = quote2[0];
            const wethOutFormatted = parseFloat(ethers.formatEther(wethOut));
            
            // Calcular profit/loss
            const grossProfit = wethOut - amountWei;
            const grossProfitEth = parseFloat(ethers.formatEther(grossProfit));
            const grossProfitUsd = grossProfitEth * ethPrice;
            
            const netProfit = grossProfit - gasCostWei;
            const netProfitEth = parseFloat(ethers.formatEther(netProfit));
            const netProfitUsd = netProfitEth * ethPrice;
            
            const spreadBps = (grossProfitEth / amountEth) * 10000;
            
            // Determinar estado
            let status = '❌ LOSS';
            let statusColor = '';
            if (grossProfitEth > 0) {
              state.stats.positiveSpreadCount++;
              if (netProfitUsd > 0) {
                status = '✅ PROFIT';
                state.stats.profitableCount++;
              } else {
                status = '⚠️ +spread -gas';
              }
            } else {
              state.stats.negativeSpreadCount++;
            }
            
            allSpreads.push(spreadBps);
            
            console.log(`\n   Route: ${amountEth} ETH → ${fee1/100}% → USDC → ${fee2/100}% → WETH`);
            console.log(`   ├─ USDC received: ${usdcOutFormatted.toFixed(2)} USDC`);
            console.log(`   ├─ WETH received: ${wethOutFormatted.toFixed(8)} ETH`);
            console.log(`   ├─ Gross P/L: ${grossProfitEth >= 0 ? '+' : ''}${grossProfitEth.toFixed(8)} ETH ($${grossProfitUsd.toFixed(4)})`);
            console.log(`   ├─ Net P/L: ${netProfitEth >= 0 ? '+' : ''}${netProfitEth.toFixed(8)} ETH ($${netProfitUsd.toFixed(4)})`);
            console.log(`   ├─ Spread: ${spreadBps.toFixed(2)} bps (${(spreadBps/100).toFixed(4)}%)`);
            console.log(`   └─ Status: ${status}`);
            
            results.push({
              chain: chainKey,
              chainName: chain.name,
              route: `${fee1/100}%→${fee2/100}%`,
              amountIn: amountEth,
              usdcOut: usdcOutFormatted,
              wethOut: wethOutFormatted,
              grossProfitEth,
              grossProfitUsd,
              netProfitEth,
              netProfitUsd,
              spreadBps,
              gasCostUsd,
              status,
              timestamp: Date.now()
            });
            
            if (netProfitUsd > 0) {
              state.stats.opportunitiesFound++;
              state.opportunities.unshift({
                ...results[results.length - 1],
                type: 'PROFITABLE'
              });
            }
            
          } catch (e) {
            console.log(`\n   Route: ${amountEth} ETH → ${fee1/100}% → USDC → ${fee2/100}% → WETH`);
            console.log(`   └─ ❌ Pool no existe o error: ${e.message.slice(0, 50)}`);
          }
        }
      }
    }
    
    // Estadísticas
    if (allSpreads.length > 0) {
      state.stats.avgSpreadBps = allSpreads.reduce((a, b) => a + b, 0) / allSpreads.length;
      state.stats.bestSpreadBps = Math.max(...allSpreads);
      state.stats.worstSpreadBps = Math.min(...allSpreads);
    }
    
    // Guardar para UI
    state.allQuotes = results;
    if (state.opportunities.length > 20) {
      state.opportunities = state.opportunities.slice(0, 20);
    }
    
    return results;
    
  } catch (e) {
    console.error(`❌ Error: ${e.message}`);
    return [];
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// LOOP
// ═══════════════════════════════════════════════════════════════════════════════

async function tick() {
  if (!state.isRunning) return;
  
  state.stats.totalScans++;
  state.stats.uptime = Math.floor((Date.now() - state.startTime) / 1000);
  
  const chainKeys = Object.keys(CHAINS);
  const selectedChain = chainKeys[currentChainIndex % chainKeys.length];
  currentChainIndex++;
  
  state.stats.currentChain = selectedChain;
  state.banditStates.forEach(b => b.selected = b.chain === selectedChain);
  
  await analyzeChain(selectedChain);
  
  // Resumen
  console.log(`\n═══════════════════════════════════════════════════════════════════`);
  console.log(`📊 RESUMEN SCAN #${state.stats.totalScans}`);
  console.log(`═══════════════════════════════════════════════════════════════════`);
  console.log(`   Spreads Positivos: ${state.stats.positiveSpreadCount}`);
  console.log(`   Spreads Negativos: ${state.stats.negativeSpreadCount}`);
  console.log(`   Oportunidades Rentables: ${state.stats.profitableCount}`);
  console.log(`   Spread Promedio: ${state.stats.avgSpreadBps.toFixed(2)} bps`);
  console.log(`   Mejor Spread: ${state.stats.bestSpreadBps.toFixed(2)} bps`);
  console.log(`   Peor Spread: ${state.stats.worstSpreadBps.toFixed(2)} bps`);
  console.log(`═══════════════════════════════════════════════════════════════════\n`);
}

// ═══════════════════════════════════════════════════════════════════════════════
// API
// ═══════════════════════════════════════════════════════════════════════════════

app.get('/api/defi/multichain-arb/status', (req, res) => {
  res.json(state);
});

app.post('/api/defi/multichain-arb/start', async (req, res) => {
  if (state.isRunning) {
    return res.json({ success: false, error: 'Ya corriendo', isRunning: true });
  }
  
  state.isDryRun = true; // Siempre dry run en modo verbose
  state.isRunning = true;
  state.startTime = Date.now();
  
  state.stats = {
    totalScans: 0, opportunitiesFound: 0, positiveSpreadCount: 0,
    negativeSpreadCount: 0, profitableCount: 0, avgSpreadBps: 0,
    bestSpreadBps: 0, worstSpreadBps: 0, uptime: 0, currentChain: 'base'
  };
  state.opportunities = [];
  state.allQuotes = [];
  allSpreads = [];
  currentChainIndex = 0;
  
  if (timer) clearInterval(timer);
  timer = setInterval(tick, CONFIG.SCAN_INTERVAL_MS);
  
  // Ejecutar primer tick inmediatamente
  tick();
  
  console.log(`\n[START] 🔍 MODO VERBOSE - Analizando mercado...\n`);
  
  res.json({
    success: true,
    isRunning: true,
    isDryRun: true,
    mode: 'SCALPER_VERBOSE',
    config: CONFIG
  });
});

app.post('/api/defi/multichain-arb/stop', (req, res) => {
  state.isRunning = false;
  if (timer) { clearInterval(timer); timer = null; }
  console.log('[STOP] Análisis detenido');
  res.json({ success: true, isRunning: false });
});

app.get('/api/defi/multichain-arb/health', (req, res) => {
  res.json({
    status: 'ok',
    mode: 'SCALPER_VERBOSE',
    port: PORT,
    running: state.isRunning,
    wallet: WALLET_ADDRESS
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// INICIAR
// ═══════════════════════════════════════════════════════════════════════════════

app.listen(PORT, async () => {
  console.log(`
╔═══════════════════════════════════════════════════════════════════════════════╗
║                                                                               ║
║   🔍 SCALPER VERBOSE - ANÁLISIS DE MERCADO                                    ║
║                                                                               ║
║   Este modo muestra TODAS las oportunidades analizadas,                       ║
║   incluyendo las no rentables, para entender el mercado.                      ║
║                                                                               ║
║   ✅ Puerto: ${PORT}                                                           ║
║   ✅ Wallet: ${WALLET_ADDRESS.slice(0, 10)}...${WALLET_ADDRESS.slice(-5)}                                  ║
║                                                                               ║
╚═══════════════════════════════════════════════════════════════════════════════╝
  `);
  
  await init();
  console.log('[READY] 🔍 POST /api/defi/multichain-arb/start para iniciar análisis.\n');
});

process.on('SIGINT', () => {
  if (timer) clearInterval(timer);
  process.exit(0);
});



 * ═══════════════════════════════════════════════════════════════════════════════
 * 🔍 SCALPER VERBOSE - MUESTRA TODAS LAS OPORTUNIDADES
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * Esta versión muestra TODAS las oportunidades analizadas, incluyendo:
 * - Spreads negativos (pérdida)
 * - Spreads positivos pero no rentables después de gas
 * - Oportunidades rentables
 * 
 * Útil para entender el mercado y calibrar parámetros.
 */

import express from 'express';
import cors from 'cors';
import { ethers } from 'ethers';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '../.env') });

const app = express();
const PORT = 3101;

app.use(cors());
app.use(express.json());

// ═══════════════════════════════════════════════════════════════════════════════
// CONFIGURACIÓN
// ═══════════════════════════════════════════════════════════════════════════════

const CONFIG = {
  SCAN_INTERVAL_MS: 2000,          // Más lento para ver mejor los logs
  MIN_PROFIT_USD: -10,             // Mostrar incluso pérdidas
  SHOW_ALL_QUOTES: true,           // Mostrar todos los quotes
  TRADE_AMOUNTS_ETH: [0.01],       // Solo un amount para simplificar
  FEE_TIERS: [500, 3000],          // 0.05% y 0.3%
  AUTO_EXECUTE: false,             // NO ejecutar automáticamente
  ETH_PRICE_USD: 3500
};

const PRIVATE_KEY = process.env.VITE_ETH_PRIVATE_KEY;
const WALLET_ADDRESS = process.env.VITE_ETH_WALLET_ADDRESS;

if (!PRIVATE_KEY || !WALLET_ADDRESS) {
  console.error('❌ ERROR: Credenciales no configuradas');
  process.exit(1);
}

// ═══════════════════════════════════════════════════════════════════════════════
// CHAINS
// ═══════════════════════════════════════════════════════════════════════════════

const CHAINS = {
  base: {
    name: 'Base',
    chainId: 8453,
    rpc: 'https://base-mainnet.g.alchemy.com/v2/mm-9UjI5oG51l94mRH3fh',
    explorer: 'https://basescan.org',
    tokens: {
      WETH: '0x4200000000000000000000000000000000000006',
      USDC: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913'
    },
    quoter: '0x3d4e44Eb1374240CE5F1B871ab261CD16335B76a',
    router: '0x2626664c2603336E57B271c5C0b26F421741e481'
  },
  arbitrum: {
    name: 'Arbitrum',
    chainId: 42161,
    rpc: 'https://arb1.arbitrum.io/rpc',
    explorer: 'https://arbiscan.io',
    tokens: {
      WETH: '0x82aF49447D8a07e3bd95BD0d56f35241523fBab1',
      USDC: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831'
    },
    quoter: '0x61fFE014bA17989E743c5F6cB21bF9697530B21e',
    router: '0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45'
  }
};

// ABIs
const QUOTER_ABI = [
  'function quoteExactInputSingle((address tokenIn, address tokenOut, uint256 amountIn, uint24 fee, uint160 sqrtPriceLimitX96)) external returns (uint256 amountOut, uint160 sqrtPriceX96After, uint32 initializedTicksCrossed, uint256 gasEstimate)'
];

// ═══════════════════════════════════════════════════════════════════════════════
// ESTADO
// ═══════════════════════════════════════════════════════════════════════════════

let state = {
  isRunning: false,
  isDryRun: true,
  startTime: null,
  mode: 'SCALPER_VERBOSE',
  stats: {
    totalScans: 0,
    opportunitiesFound: 0,
    positiveSpreadCount: 0,
    negativeSpreadCount: 0,
    profitableCount: 0,
    avgSpreadBps: 0,
    bestSpreadBps: 0,
    worstSpreadBps: 0,
    uptime: 0,
    currentChain: 'base'
  },
  chains: [],
  tradeLogs: [],
  opportunities: [],
  banditStates: [],
  allQuotes: []  // Guardar todos los quotes para análisis
};

let timer = null;
let providers = {};
let contracts = {};
let currentChainIndex = 0;
let allSpreads = [];

// ═══════════════════════════════════════════════════════════════════════════════
// INICIALIZAR
// ═══════════════════════════════════════════════════════════════════════════════

async function init() {
  console.log('[INIT] 🔌 Conectando...\n');
  
  for (const [key, chain] of Object.entries(CHAINS)) {
    try {
      providers[key] = new ethers.JsonRpcProvider(chain.rpc);
      contracts[key] = {
        quoter: new ethers.Contract(chain.quoter, QUOTER_ABI, providers[key])
      };
      
      const balance = await providers[key].getBalance(WALLET_ADDRESS);
      const balanceEth = parseFloat(ethers.formatEther(balance));
      
      state.chains.push({
        chain: key,
        name: chain.name,
        chainId: chain.chainId,
        balance: balanceEth.toFixed(6),
        balanceUsd: balanceEth * CONFIG.ETH_PRICE_USD,
        isActive: true,
        explorer: chain.explorer,
        ethPrice: 0
      });
      
      state.banditStates.push({
        chain: key,
        alpha: 2,
        beta: 2,
        winRate: 50,
        selected: key === 'base'
      });
      
      console.log(`   ✅ ${chain.name}: ${balanceEth.toFixed(6)} ETH`);
    } catch (e) {
      console.error(`   ❌ ${chain.name}: ${e.message}`);
    }
  }
  console.log('');
}

// ═══════════════════════════════════════════════════════════════════════════════
// ANÁLISIS DETALLADO
// ═══════════════════════════════════════════════════════════════════════════════

async function analyzeChain(chainKey) {
  const chain = CHAINS[chainKey];
  const provider = providers[chainKey];
  const quoter = contracts[chainKey].quoter;
  
  console.log(`\n═══════════════════════════════════════════════════════════════════`);
  console.log(`📊 ANÁLISIS: ${chain.name}`);
  console.log(`═══════════════════════════════════════════════════════════════════`);
  
  try {
    // Obtener gas price
    const feeData = await provider.getFeeData();
    const gasPrice = feeData.gasPrice || ethers.parseUnits('0.001', 'gwei');
    const gasPriceGwei = parseFloat(ethers.formatUnits(gasPrice, 'gwei'));
    const gasCostWei = gasPrice * 250000n;
    
    console.log(`⛽ Gas Price: ${gasPriceGwei.toFixed(4)} gwei`);
    console.log(`⛽ Estimated Gas Cost: ${ethers.formatEther(gasCostWei)} ETH`);
    
    // Obtener precio ETH
    let ethPrice = CONFIG.ETH_PRICE_USD;
    try {
      const priceQuote = await quoter.quoteExactInputSingle.staticCall({
        tokenIn: chain.tokens.WETH,
        tokenOut: chain.tokens.USDC,
        amountIn: ethers.parseEther('1'),
        fee: 500,
        sqrtPriceLimitX96: 0n
      });
      ethPrice = parseFloat(ethers.formatUnits(priceQuote[0], 6));
      console.log(`💰 ETH Price on ${chain.name}: $${ethPrice.toFixed(2)}`);
    } catch (e) {
      console.log(`💰 ETH Price: Using default $${ethPrice}`);
    }
    
    const gasCostUsd = parseFloat(ethers.formatEther(gasCostWei)) * ethPrice;
    console.log(`⛽ Gas Cost in USD: $${gasCostUsd.toFixed(4)}`);
    
    // Actualizar estado
    const chainState = state.chains.find(c => c.chain === chainKey);
    if (chainState) chainState.ethPrice = ethPrice;
    
    console.log(`\n📈 QUOTES WETH → USDC → WETH:`);
    console.log(`─────────────────────────────────────────────────────────────────`);
    
    const results = [];
    
    for (const amountEth of CONFIG.TRADE_AMOUNTS_ETH) {
      const amountWei = ethers.parseEther(amountEth.toString());
      
      for (let i = 0; i < CONFIG.FEE_TIERS.length; i++) {
        for (let j = 0; j < CONFIG.FEE_TIERS.length; j++) {
          const fee1 = CONFIG.FEE_TIERS[i];
          const fee2 = CONFIG.FEE_TIERS[j];
          
          try {
            // WETH → USDC
            const quote1 = await quoter.quoteExactInputSingle.staticCall({
              tokenIn: chain.tokens.WETH,
              tokenOut: chain.tokens.USDC,
              amountIn: amountWei,
              fee: fee1,
              sqrtPriceLimitX96: 0n
            });
            const usdcOut = quote1[0];
            const usdcOutFormatted = parseFloat(ethers.formatUnits(usdcOut, 6));
            
            // USDC → WETH
            const quote2 = await quoter.quoteExactInputSingle.staticCall({
              tokenIn: chain.tokens.USDC,
              tokenOut: chain.tokens.WETH,
              amountIn: usdcOut,
              fee: fee2,
              sqrtPriceLimitX96: 0n
            });
            const wethOut = quote2[0];
            const wethOutFormatted = parseFloat(ethers.formatEther(wethOut));
            
            // Calcular profit/loss
            const grossProfit = wethOut - amountWei;
            const grossProfitEth = parseFloat(ethers.formatEther(grossProfit));
            const grossProfitUsd = grossProfitEth * ethPrice;
            
            const netProfit = grossProfit - gasCostWei;
            const netProfitEth = parseFloat(ethers.formatEther(netProfit));
            const netProfitUsd = netProfitEth * ethPrice;
            
            const spreadBps = (grossProfitEth / amountEth) * 10000;
            
            // Determinar estado
            let status = '❌ LOSS';
            let statusColor = '';
            if (grossProfitEth > 0) {
              state.stats.positiveSpreadCount++;
              if (netProfitUsd > 0) {
                status = '✅ PROFIT';
                state.stats.profitableCount++;
              } else {
                status = '⚠️ +spread -gas';
              }
            } else {
              state.stats.negativeSpreadCount++;
            }
            
            allSpreads.push(spreadBps);
            
            console.log(`\n   Route: ${amountEth} ETH → ${fee1/100}% → USDC → ${fee2/100}% → WETH`);
            console.log(`   ├─ USDC received: ${usdcOutFormatted.toFixed(2)} USDC`);
            console.log(`   ├─ WETH received: ${wethOutFormatted.toFixed(8)} ETH`);
            console.log(`   ├─ Gross P/L: ${grossProfitEth >= 0 ? '+' : ''}${grossProfitEth.toFixed(8)} ETH ($${grossProfitUsd.toFixed(4)})`);
            console.log(`   ├─ Net P/L: ${netProfitEth >= 0 ? '+' : ''}${netProfitEth.toFixed(8)} ETH ($${netProfitUsd.toFixed(4)})`);
            console.log(`   ├─ Spread: ${spreadBps.toFixed(2)} bps (${(spreadBps/100).toFixed(4)}%)`);
            console.log(`   └─ Status: ${status}`);
            
            results.push({
              chain: chainKey,
              chainName: chain.name,
              route: `${fee1/100}%→${fee2/100}%`,
              amountIn: amountEth,
              usdcOut: usdcOutFormatted,
              wethOut: wethOutFormatted,
              grossProfitEth,
              grossProfitUsd,
              netProfitEth,
              netProfitUsd,
              spreadBps,
              gasCostUsd,
              status,
              timestamp: Date.now()
            });
            
            if (netProfitUsd > 0) {
              state.stats.opportunitiesFound++;
              state.opportunities.unshift({
                ...results[results.length - 1],
                type: 'PROFITABLE'
              });
            }
            
          } catch (e) {
            console.log(`\n   Route: ${amountEth} ETH → ${fee1/100}% → USDC → ${fee2/100}% → WETH`);
            console.log(`   └─ ❌ Pool no existe o error: ${e.message.slice(0, 50)}`);
          }
        }
      }
    }
    
    // Estadísticas
    if (allSpreads.length > 0) {
      state.stats.avgSpreadBps = allSpreads.reduce((a, b) => a + b, 0) / allSpreads.length;
      state.stats.bestSpreadBps = Math.max(...allSpreads);
      state.stats.worstSpreadBps = Math.min(...allSpreads);
    }
    
    // Guardar para UI
    state.allQuotes = results;
    if (state.opportunities.length > 20) {
      state.opportunities = state.opportunities.slice(0, 20);
    }
    
    return results;
    
  } catch (e) {
    console.error(`❌ Error: ${e.message}`);
    return [];
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// LOOP
// ═══════════════════════════════════════════════════════════════════════════════

async function tick() {
  if (!state.isRunning) return;
  
  state.stats.totalScans++;
  state.stats.uptime = Math.floor((Date.now() - state.startTime) / 1000);
  
  const chainKeys = Object.keys(CHAINS);
  const selectedChain = chainKeys[currentChainIndex % chainKeys.length];
  currentChainIndex++;
  
  state.stats.currentChain = selectedChain;
  state.banditStates.forEach(b => b.selected = b.chain === selectedChain);
  
  await analyzeChain(selectedChain);
  
  // Resumen
  console.log(`\n═══════════════════════════════════════════════════════════════════`);
  console.log(`📊 RESUMEN SCAN #${state.stats.totalScans}`);
  console.log(`═══════════════════════════════════════════════════════════════════`);
  console.log(`   Spreads Positivos: ${state.stats.positiveSpreadCount}`);
  console.log(`   Spreads Negativos: ${state.stats.negativeSpreadCount}`);
  console.log(`   Oportunidades Rentables: ${state.stats.profitableCount}`);
  console.log(`   Spread Promedio: ${state.stats.avgSpreadBps.toFixed(2)} bps`);
  console.log(`   Mejor Spread: ${state.stats.bestSpreadBps.toFixed(2)} bps`);
  console.log(`   Peor Spread: ${state.stats.worstSpreadBps.toFixed(2)} bps`);
  console.log(`═══════════════════════════════════════════════════════════════════\n`);
}

// ═══════════════════════════════════════════════════════════════════════════════
// API
// ═══════════════════════════════════════════════════════════════════════════════

app.get('/api/defi/multichain-arb/status', (req, res) => {
  res.json(state);
});

app.post('/api/defi/multichain-arb/start', async (req, res) => {
  if (state.isRunning) {
    return res.json({ success: false, error: 'Ya corriendo', isRunning: true });
  }
  
  state.isDryRun = true; // Siempre dry run en modo verbose
  state.isRunning = true;
  state.startTime = Date.now();
  
  state.stats = {
    totalScans: 0, opportunitiesFound: 0, positiveSpreadCount: 0,
    negativeSpreadCount: 0, profitableCount: 0, avgSpreadBps: 0,
    bestSpreadBps: 0, worstSpreadBps: 0, uptime: 0, currentChain: 'base'
  };
  state.opportunities = [];
  state.allQuotes = [];
  allSpreads = [];
  currentChainIndex = 0;
  
  if (timer) clearInterval(timer);
  timer = setInterval(tick, CONFIG.SCAN_INTERVAL_MS);
  
  // Ejecutar primer tick inmediatamente
  tick();
  
  console.log(`\n[START] 🔍 MODO VERBOSE - Analizando mercado...\n`);
  
  res.json({
    success: true,
    isRunning: true,
    isDryRun: true,
    mode: 'SCALPER_VERBOSE',
    config: CONFIG
  });
});

app.post('/api/defi/multichain-arb/stop', (req, res) => {
  state.isRunning = false;
  if (timer) { clearInterval(timer); timer = null; }
  console.log('[STOP] Análisis detenido');
  res.json({ success: true, isRunning: false });
});

app.get('/api/defi/multichain-arb/health', (req, res) => {
  res.json({
    status: 'ok',
    mode: 'SCALPER_VERBOSE',
    port: PORT,
    running: state.isRunning,
    wallet: WALLET_ADDRESS
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// INICIAR
// ═══════════════════════════════════════════════════════════════════════════════

app.listen(PORT, async () => {
  console.log(`
╔═══════════════════════════════════════════════════════════════════════════════╗
║                                                                               ║
║   🔍 SCALPER VERBOSE - ANÁLISIS DE MERCADO                                    ║
║                                                                               ║
║   Este modo muestra TODAS las oportunidades analizadas,                       ║
║   incluyendo las no rentables, para entender el mercado.                      ║
║                                                                               ║
║   ✅ Puerto: ${PORT}                                                           ║
║   ✅ Wallet: ${WALLET_ADDRESS.slice(0, 10)}...${WALLET_ADDRESS.slice(-5)}                                  ║
║                                                                               ║
╚═══════════════════════════════════════════════════════════════════════════════╝
  `);
  
  await init();
  console.log('[READY] 🔍 POST /api/defi/multichain-arb/start para iniciar análisis.\n');
});

process.on('SIGINT', () => {
  if (timer) clearInterval(timer);
  process.exit(0);
});



 * ═══════════════════════════════════════════════════════════════════════════════
 * 🔍 SCALPER VERBOSE - MUESTRA TODAS LAS OPORTUNIDADES
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * Esta versión muestra TODAS las oportunidades analizadas, incluyendo:
 * - Spreads negativos (pérdida)
 * - Spreads positivos pero no rentables después de gas
 * - Oportunidades rentables
 * 
 * Útil para entender el mercado y calibrar parámetros.
 */

import express from 'express';
import cors from 'cors';
import { ethers } from 'ethers';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '../.env') });

const app = express();
const PORT = 3101;

app.use(cors());
app.use(express.json());

// ═══════════════════════════════════════════════════════════════════════════════
// CONFIGURACIÓN
// ═══════════════════════════════════════════════════════════════════════════════

const CONFIG = {
  SCAN_INTERVAL_MS: 2000,          // Más lento para ver mejor los logs
  MIN_PROFIT_USD: -10,             // Mostrar incluso pérdidas
  SHOW_ALL_QUOTES: true,           // Mostrar todos los quotes
  TRADE_AMOUNTS_ETH: [0.01],       // Solo un amount para simplificar
  FEE_TIERS: [500, 3000],          // 0.05% y 0.3%
  AUTO_EXECUTE: false,             // NO ejecutar automáticamente
  ETH_PRICE_USD: 3500
};

const PRIVATE_KEY = process.env.VITE_ETH_PRIVATE_KEY;
const WALLET_ADDRESS = process.env.VITE_ETH_WALLET_ADDRESS;

if (!PRIVATE_KEY || !WALLET_ADDRESS) {
  console.error('❌ ERROR: Credenciales no configuradas');
  process.exit(1);
}

// ═══════════════════════════════════════════════════════════════════════════════
// CHAINS
// ═══════════════════════════════════════════════════════════════════════════════

const CHAINS = {
  base: {
    name: 'Base',
    chainId: 8453,
    rpc: 'https://base-mainnet.g.alchemy.com/v2/mm-9UjI5oG51l94mRH3fh',
    explorer: 'https://basescan.org',
    tokens: {
      WETH: '0x4200000000000000000000000000000000000006',
      USDC: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913'
    },
    quoter: '0x3d4e44Eb1374240CE5F1B871ab261CD16335B76a',
    router: '0x2626664c2603336E57B271c5C0b26F421741e481'
  },
  arbitrum: {
    name: 'Arbitrum',
    chainId: 42161,
    rpc: 'https://arb1.arbitrum.io/rpc',
    explorer: 'https://arbiscan.io',
    tokens: {
      WETH: '0x82aF49447D8a07e3bd95BD0d56f35241523fBab1',
      USDC: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831'
    },
    quoter: '0x61fFE014bA17989E743c5F6cB21bF9697530B21e',
    router: '0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45'
  }
};

// ABIs
const QUOTER_ABI = [
  'function quoteExactInputSingle((address tokenIn, address tokenOut, uint256 amountIn, uint24 fee, uint160 sqrtPriceLimitX96)) external returns (uint256 amountOut, uint160 sqrtPriceX96After, uint32 initializedTicksCrossed, uint256 gasEstimate)'
];

// ═══════════════════════════════════════════════════════════════════════════════
// ESTADO
// ═══════════════════════════════════════════════════════════════════════════════

let state = {
  isRunning: false,
  isDryRun: true,
  startTime: null,
  mode: 'SCALPER_VERBOSE',
  stats: {
    totalScans: 0,
    opportunitiesFound: 0,
    positiveSpreadCount: 0,
    negativeSpreadCount: 0,
    profitableCount: 0,
    avgSpreadBps: 0,
    bestSpreadBps: 0,
    worstSpreadBps: 0,
    uptime: 0,
    currentChain: 'base'
  },
  chains: [],
  tradeLogs: [],
  opportunities: [],
  banditStates: [],
  allQuotes: []  // Guardar todos los quotes para análisis
};

let timer = null;
let providers = {};
let contracts = {};
let currentChainIndex = 0;
let allSpreads = [];

// ═══════════════════════════════════════════════════════════════════════════════
// INICIALIZAR
// ═══════════════════════════════════════════════════════════════════════════════

async function init() {
  console.log('[INIT] 🔌 Conectando...\n');
  
  for (const [key, chain] of Object.entries(CHAINS)) {
    try {
      providers[key] = new ethers.JsonRpcProvider(chain.rpc);
      contracts[key] = {
        quoter: new ethers.Contract(chain.quoter, QUOTER_ABI, providers[key])
      };
      
      const balance = await providers[key].getBalance(WALLET_ADDRESS);
      const balanceEth = parseFloat(ethers.formatEther(balance));
      
      state.chains.push({
        chain: key,
        name: chain.name,
        chainId: chain.chainId,
        balance: balanceEth.toFixed(6),
        balanceUsd: balanceEth * CONFIG.ETH_PRICE_USD,
        isActive: true,
        explorer: chain.explorer,
        ethPrice: 0
      });
      
      state.banditStates.push({
        chain: key,
        alpha: 2,
        beta: 2,
        winRate: 50,
        selected: key === 'base'
      });
      
      console.log(`   ✅ ${chain.name}: ${balanceEth.toFixed(6)} ETH`);
    } catch (e) {
      console.error(`   ❌ ${chain.name}: ${e.message}`);
    }
  }
  console.log('');
}

// ═══════════════════════════════════════════════════════════════════════════════
// ANÁLISIS DETALLADO
// ═══════════════════════════════════════════════════════════════════════════════

async function analyzeChain(chainKey) {
  const chain = CHAINS[chainKey];
  const provider = providers[chainKey];
  const quoter = contracts[chainKey].quoter;
  
  console.log(`\n═══════════════════════════════════════════════════════════════════`);
  console.log(`📊 ANÁLISIS: ${chain.name}`);
  console.log(`═══════════════════════════════════════════════════════════════════`);
  
  try {
    // Obtener gas price
    const feeData = await provider.getFeeData();
    const gasPrice = feeData.gasPrice || ethers.parseUnits('0.001', 'gwei');
    const gasPriceGwei = parseFloat(ethers.formatUnits(gasPrice, 'gwei'));
    const gasCostWei = gasPrice * 250000n;
    
    console.log(`⛽ Gas Price: ${gasPriceGwei.toFixed(4)} gwei`);
    console.log(`⛽ Estimated Gas Cost: ${ethers.formatEther(gasCostWei)} ETH`);
    
    // Obtener precio ETH
    let ethPrice = CONFIG.ETH_PRICE_USD;
    try {
      const priceQuote = await quoter.quoteExactInputSingle.staticCall({
        tokenIn: chain.tokens.WETH,
        tokenOut: chain.tokens.USDC,
        amountIn: ethers.parseEther('1'),
        fee: 500,
        sqrtPriceLimitX96: 0n
      });
      ethPrice = parseFloat(ethers.formatUnits(priceQuote[0], 6));
      console.log(`💰 ETH Price on ${chain.name}: $${ethPrice.toFixed(2)}`);
    } catch (e) {
      console.log(`💰 ETH Price: Using default $${ethPrice}`);
    }
    
    const gasCostUsd = parseFloat(ethers.formatEther(gasCostWei)) * ethPrice;
    console.log(`⛽ Gas Cost in USD: $${gasCostUsd.toFixed(4)}`);
    
    // Actualizar estado
    const chainState = state.chains.find(c => c.chain === chainKey);
    if (chainState) chainState.ethPrice = ethPrice;
    
    console.log(`\n📈 QUOTES WETH → USDC → WETH:`);
    console.log(`─────────────────────────────────────────────────────────────────`);
    
    const results = [];
    
    for (const amountEth of CONFIG.TRADE_AMOUNTS_ETH) {
      const amountWei = ethers.parseEther(amountEth.toString());
      
      for (let i = 0; i < CONFIG.FEE_TIERS.length; i++) {
        for (let j = 0; j < CONFIG.FEE_TIERS.length; j++) {
          const fee1 = CONFIG.FEE_TIERS[i];
          const fee2 = CONFIG.FEE_TIERS[j];
          
          try {
            // WETH → USDC
            const quote1 = await quoter.quoteExactInputSingle.staticCall({
              tokenIn: chain.tokens.WETH,
              tokenOut: chain.tokens.USDC,
              amountIn: amountWei,
              fee: fee1,
              sqrtPriceLimitX96: 0n
            });
            const usdcOut = quote1[0];
            const usdcOutFormatted = parseFloat(ethers.formatUnits(usdcOut, 6));
            
            // USDC → WETH
            const quote2 = await quoter.quoteExactInputSingle.staticCall({
              tokenIn: chain.tokens.USDC,
              tokenOut: chain.tokens.WETH,
              amountIn: usdcOut,
              fee: fee2,
              sqrtPriceLimitX96: 0n
            });
            const wethOut = quote2[0];
            const wethOutFormatted = parseFloat(ethers.formatEther(wethOut));
            
            // Calcular profit/loss
            const grossProfit = wethOut - amountWei;
            const grossProfitEth = parseFloat(ethers.formatEther(grossProfit));
            const grossProfitUsd = grossProfitEth * ethPrice;
            
            const netProfit = grossProfit - gasCostWei;
            const netProfitEth = parseFloat(ethers.formatEther(netProfit));
            const netProfitUsd = netProfitEth * ethPrice;
            
            const spreadBps = (grossProfitEth / amountEth) * 10000;
            
            // Determinar estado
            let status = '❌ LOSS';
            let statusColor = '';
            if (grossProfitEth > 0) {
              state.stats.positiveSpreadCount++;
              if (netProfitUsd > 0) {
                status = '✅ PROFIT';
                state.stats.profitableCount++;
              } else {
                status = '⚠️ +spread -gas';
              }
            } else {
              state.stats.negativeSpreadCount++;
            }
            
            allSpreads.push(spreadBps);
            
            console.log(`\n   Route: ${amountEth} ETH → ${fee1/100}% → USDC → ${fee2/100}% → WETH`);
            console.log(`   ├─ USDC received: ${usdcOutFormatted.toFixed(2)} USDC`);
            console.log(`   ├─ WETH received: ${wethOutFormatted.toFixed(8)} ETH`);
            console.log(`   ├─ Gross P/L: ${grossProfitEth >= 0 ? '+' : ''}${grossProfitEth.toFixed(8)} ETH ($${grossProfitUsd.toFixed(4)})`);
            console.log(`   ├─ Net P/L: ${netProfitEth >= 0 ? '+' : ''}${netProfitEth.toFixed(8)} ETH ($${netProfitUsd.toFixed(4)})`);
            console.log(`   ├─ Spread: ${spreadBps.toFixed(2)} bps (${(spreadBps/100).toFixed(4)}%)`);
            console.log(`   └─ Status: ${status}`);
            
            results.push({
              chain: chainKey,
              chainName: chain.name,
              route: `${fee1/100}%→${fee2/100}%`,
              amountIn: amountEth,
              usdcOut: usdcOutFormatted,
              wethOut: wethOutFormatted,
              grossProfitEth,
              grossProfitUsd,
              netProfitEth,
              netProfitUsd,
              spreadBps,
              gasCostUsd,
              status,
              timestamp: Date.now()
            });
            
            if (netProfitUsd > 0) {
              state.stats.opportunitiesFound++;
              state.opportunities.unshift({
                ...results[results.length - 1],
                type: 'PROFITABLE'
              });
            }
            
          } catch (e) {
            console.log(`\n   Route: ${amountEth} ETH → ${fee1/100}% → USDC → ${fee2/100}% → WETH`);
            console.log(`   └─ ❌ Pool no existe o error: ${e.message.slice(0, 50)}`);
          }
        }
      }
    }
    
    // Estadísticas
    if (allSpreads.length > 0) {
      state.stats.avgSpreadBps = allSpreads.reduce((a, b) => a + b, 0) / allSpreads.length;
      state.stats.bestSpreadBps = Math.max(...allSpreads);
      state.stats.worstSpreadBps = Math.min(...allSpreads);
    }
    
    // Guardar para UI
    state.allQuotes = results;
    if (state.opportunities.length > 20) {
      state.opportunities = state.opportunities.slice(0, 20);
    }
    
    return results;
    
  } catch (e) {
    console.error(`❌ Error: ${e.message}`);
    return [];
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// LOOP
// ═══════════════════════════════════════════════════════════════════════════════

async function tick() {
  if (!state.isRunning) return;
  
  state.stats.totalScans++;
  state.stats.uptime = Math.floor((Date.now() - state.startTime) / 1000);
  
  const chainKeys = Object.keys(CHAINS);
  const selectedChain = chainKeys[currentChainIndex % chainKeys.length];
  currentChainIndex++;
  
  state.stats.currentChain = selectedChain;
  state.banditStates.forEach(b => b.selected = b.chain === selectedChain);
  
  await analyzeChain(selectedChain);
  
  // Resumen
  console.log(`\n═══════════════════════════════════════════════════════════════════`);
  console.log(`📊 RESUMEN SCAN #${state.stats.totalScans}`);
  console.log(`═══════════════════════════════════════════════════════════════════`);
  console.log(`   Spreads Positivos: ${state.stats.positiveSpreadCount}`);
  console.log(`   Spreads Negativos: ${state.stats.negativeSpreadCount}`);
  console.log(`   Oportunidades Rentables: ${state.stats.profitableCount}`);
  console.log(`   Spread Promedio: ${state.stats.avgSpreadBps.toFixed(2)} bps`);
  console.log(`   Mejor Spread: ${state.stats.bestSpreadBps.toFixed(2)} bps`);
  console.log(`   Peor Spread: ${state.stats.worstSpreadBps.toFixed(2)} bps`);
  console.log(`═══════════════════════════════════════════════════════════════════\n`);
}

// ═══════════════════════════════════════════════════════════════════════════════
// API
// ═══════════════════════════════════════════════════════════════════════════════

app.get('/api/defi/multichain-arb/status', (req, res) => {
  res.json(state);
});

app.post('/api/defi/multichain-arb/start', async (req, res) => {
  if (state.isRunning) {
    return res.json({ success: false, error: 'Ya corriendo', isRunning: true });
  }
  
  state.isDryRun = true; // Siempre dry run en modo verbose
  state.isRunning = true;
  state.startTime = Date.now();
  
  state.stats = {
    totalScans: 0, opportunitiesFound: 0, positiveSpreadCount: 0,
    negativeSpreadCount: 0, profitableCount: 0, avgSpreadBps: 0,
    bestSpreadBps: 0, worstSpreadBps: 0, uptime: 0, currentChain: 'base'
  };
  state.opportunities = [];
  state.allQuotes = [];
  allSpreads = [];
  currentChainIndex = 0;
  
  if (timer) clearInterval(timer);
  timer = setInterval(tick, CONFIG.SCAN_INTERVAL_MS);
  
  // Ejecutar primer tick inmediatamente
  tick();
  
  console.log(`\n[START] 🔍 MODO VERBOSE - Analizando mercado...\n`);
  
  res.json({
    success: true,
    isRunning: true,
    isDryRun: true,
    mode: 'SCALPER_VERBOSE',
    config: CONFIG
  });
});

app.post('/api/defi/multichain-arb/stop', (req, res) => {
  state.isRunning = false;
  if (timer) { clearInterval(timer); timer = null; }
  console.log('[STOP] Análisis detenido');
  res.json({ success: true, isRunning: false });
});

app.get('/api/defi/multichain-arb/health', (req, res) => {
  res.json({
    status: 'ok',
    mode: 'SCALPER_VERBOSE',
    port: PORT,
    running: state.isRunning,
    wallet: WALLET_ADDRESS
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// INICIAR
// ═══════════════════════════════════════════════════════════════════════════════

app.listen(PORT, async () => {
  console.log(`
╔═══════════════════════════════════════════════════════════════════════════════╗
║                                                                               ║
║   🔍 SCALPER VERBOSE - ANÁLISIS DE MERCADO                                    ║
║                                                                               ║
║   Este modo muestra TODAS las oportunidades analizadas,                       ║
║   incluyendo las no rentables, para entender el mercado.                      ║
║                                                                               ║
║   ✅ Puerto: ${PORT}                                                           ║
║   ✅ Wallet: ${WALLET_ADDRESS.slice(0, 10)}...${WALLET_ADDRESS.slice(-5)}                                  ║
║                                                                               ║
╚═══════════════════════════════════════════════════════════════════════════════╝
  `);
  
  await init();
  console.log('[READY] 🔍 POST /api/defi/multichain-arb/start para iniciar análisis.\n');
});

process.on('SIGINT', () => {
  if (timer) clearInterval(timer);
  process.exit(0);
});



 * ═══════════════════════════════════════════════════════════════════════════════
 * 🔍 SCALPER VERBOSE - MUESTRA TODAS LAS OPORTUNIDADES
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * Esta versión muestra TODAS las oportunidades analizadas, incluyendo:
 * - Spreads negativos (pérdida)
 * - Spreads positivos pero no rentables después de gas
 * - Oportunidades rentables
 * 
 * Útil para entender el mercado y calibrar parámetros.
 */

import express from 'express';
import cors from 'cors';
import { ethers } from 'ethers';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '../.env') });

const app = express();
const PORT = 3101;

app.use(cors());
app.use(express.json());

// ═══════════════════════════════════════════════════════════════════════════════
// CONFIGURACIÓN
// ═══════════════════════════════════════════════════════════════════════════════

const CONFIG = {
  SCAN_INTERVAL_MS: 2000,          // Más lento para ver mejor los logs
  MIN_PROFIT_USD: -10,             // Mostrar incluso pérdidas
  SHOW_ALL_QUOTES: true,           // Mostrar todos los quotes
  TRADE_AMOUNTS_ETH: [0.01],       // Solo un amount para simplificar
  FEE_TIERS: [500, 3000],          // 0.05% y 0.3%
  AUTO_EXECUTE: false,             // NO ejecutar automáticamente
  ETH_PRICE_USD: 3500
};

const PRIVATE_KEY = process.env.VITE_ETH_PRIVATE_KEY;
const WALLET_ADDRESS = process.env.VITE_ETH_WALLET_ADDRESS;

if (!PRIVATE_KEY || !WALLET_ADDRESS) {
  console.error('❌ ERROR: Credenciales no configuradas');
  process.exit(1);
}

// ═══════════════════════════════════════════════════════════════════════════════
// CHAINS
// ═══════════════════════════════════════════════════════════════════════════════

const CHAINS = {
  base: {
    name: 'Base',
    chainId: 8453,
    rpc: 'https://base-mainnet.g.alchemy.com/v2/mm-9UjI5oG51l94mRH3fh',
    explorer: 'https://basescan.org',
    tokens: {
      WETH: '0x4200000000000000000000000000000000000006',
      USDC: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913'
    },
    quoter: '0x3d4e44Eb1374240CE5F1B871ab261CD16335B76a',
    router: '0x2626664c2603336E57B271c5C0b26F421741e481'
  },
  arbitrum: {
    name: 'Arbitrum',
    chainId: 42161,
    rpc: 'https://arb1.arbitrum.io/rpc',
    explorer: 'https://arbiscan.io',
    tokens: {
      WETH: '0x82aF49447D8a07e3bd95BD0d56f35241523fBab1',
      USDC: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831'
    },
    quoter: '0x61fFE014bA17989E743c5F6cB21bF9697530B21e',
    router: '0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45'
  }
};

// ABIs
const QUOTER_ABI = [
  'function quoteExactInputSingle((address tokenIn, address tokenOut, uint256 amountIn, uint24 fee, uint160 sqrtPriceLimitX96)) external returns (uint256 amountOut, uint160 sqrtPriceX96After, uint32 initializedTicksCrossed, uint256 gasEstimate)'
];

// ═══════════════════════════════════════════════════════════════════════════════
// ESTADO
// ═══════════════════════════════════════════════════════════════════════════════

let state = {
  isRunning: false,
  isDryRun: true,
  startTime: null,
  mode: 'SCALPER_VERBOSE',
  stats: {
    totalScans: 0,
    opportunitiesFound: 0,
    positiveSpreadCount: 0,
    negativeSpreadCount: 0,
    profitableCount: 0,
    avgSpreadBps: 0,
    bestSpreadBps: 0,
    worstSpreadBps: 0,
    uptime: 0,
    currentChain: 'base'
  },
  chains: [],
  tradeLogs: [],
  opportunities: [],
  banditStates: [],
  allQuotes: []  // Guardar todos los quotes para análisis
};

let timer = null;
let providers = {};
let contracts = {};
let currentChainIndex = 0;
let allSpreads = [];

// ═══════════════════════════════════════════════════════════════════════════════
// INICIALIZAR
// ═══════════════════════════════════════════════════════════════════════════════

async function init() {
  console.log('[INIT] 🔌 Conectando...\n');
  
  for (const [key, chain] of Object.entries(CHAINS)) {
    try {
      providers[key] = new ethers.JsonRpcProvider(chain.rpc);
      contracts[key] = {
        quoter: new ethers.Contract(chain.quoter, QUOTER_ABI, providers[key])
      };
      
      const balance = await providers[key].getBalance(WALLET_ADDRESS);
      const balanceEth = parseFloat(ethers.formatEther(balance));
      
      state.chains.push({
        chain: key,
        name: chain.name,
        chainId: chain.chainId,
        balance: balanceEth.toFixed(6),
        balanceUsd: balanceEth * CONFIG.ETH_PRICE_USD,
        isActive: true,
        explorer: chain.explorer,
        ethPrice: 0
      });
      
      state.banditStates.push({
        chain: key,
        alpha: 2,
        beta: 2,
        winRate: 50,
        selected: key === 'base'
      });
      
      console.log(`   ✅ ${chain.name}: ${balanceEth.toFixed(6)} ETH`);
    } catch (e) {
      console.error(`   ❌ ${chain.name}: ${e.message}`);
    }
  }
  console.log('');
}

// ═══════════════════════════════════════════════════════════════════════════════
// ANÁLISIS DETALLADO
// ═══════════════════════════════════════════════════════════════════════════════

async function analyzeChain(chainKey) {
  const chain = CHAINS[chainKey];
  const provider = providers[chainKey];
  const quoter = contracts[chainKey].quoter;
  
  console.log(`\n═══════════════════════════════════════════════════════════════════`);
  console.log(`📊 ANÁLISIS: ${chain.name}`);
  console.log(`═══════════════════════════════════════════════════════════════════`);
  
  try {
    // Obtener gas price
    const feeData = await provider.getFeeData();
    const gasPrice = feeData.gasPrice || ethers.parseUnits('0.001', 'gwei');
    const gasPriceGwei = parseFloat(ethers.formatUnits(gasPrice, 'gwei'));
    const gasCostWei = gasPrice * 250000n;
    
    console.log(`⛽ Gas Price: ${gasPriceGwei.toFixed(4)} gwei`);
    console.log(`⛽ Estimated Gas Cost: ${ethers.formatEther(gasCostWei)} ETH`);
    
    // Obtener precio ETH
    let ethPrice = CONFIG.ETH_PRICE_USD;
    try {
      const priceQuote = await quoter.quoteExactInputSingle.staticCall({
        tokenIn: chain.tokens.WETH,
        tokenOut: chain.tokens.USDC,
        amountIn: ethers.parseEther('1'),
        fee: 500,
        sqrtPriceLimitX96: 0n
      });
      ethPrice = parseFloat(ethers.formatUnits(priceQuote[0], 6));
      console.log(`💰 ETH Price on ${chain.name}: $${ethPrice.toFixed(2)}`);
    } catch (e) {
      console.log(`💰 ETH Price: Using default $${ethPrice}`);
    }
    
    const gasCostUsd = parseFloat(ethers.formatEther(gasCostWei)) * ethPrice;
    console.log(`⛽ Gas Cost in USD: $${gasCostUsd.toFixed(4)}`);
    
    // Actualizar estado
    const chainState = state.chains.find(c => c.chain === chainKey);
    if (chainState) chainState.ethPrice = ethPrice;
    
    console.log(`\n📈 QUOTES WETH → USDC → WETH:`);
    console.log(`─────────────────────────────────────────────────────────────────`);
    
    const results = [];
    
    for (const amountEth of CONFIG.TRADE_AMOUNTS_ETH) {
      const amountWei = ethers.parseEther(amountEth.toString());
      
      for (let i = 0; i < CONFIG.FEE_TIERS.length; i++) {
        for (let j = 0; j < CONFIG.FEE_TIERS.length; j++) {
          const fee1 = CONFIG.FEE_TIERS[i];
          const fee2 = CONFIG.FEE_TIERS[j];
          
          try {
            // WETH → USDC
            const quote1 = await quoter.quoteExactInputSingle.staticCall({
              tokenIn: chain.tokens.WETH,
              tokenOut: chain.tokens.USDC,
              amountIn: amountWei,
              fee: fee1,
              sqrtPriceLimitX96: 0n
            });
            const usdcOut = quote1[0];
            const usdcOutFormatted = parseFloat(ethers.formatUnits(usdcOut, 6));
            
            // USDC → WETH
            const quote2 = await quoter.quoteExactInputSingle.staticCall({
              tokenIn: chain.tokens.USDC,
              tokenOut: chain.tokens.WETH,
              amountIn: usdcOut,
              fee: fee2,
              sqrtPriceLimitX96: 0n
            });
            const wethOut = quote2[0];
            const wethOutFormatted = parseFloat(ethers.formatEther(wethOut));
            
            // Calcular profit/loss
            const grossProfit = wethOut - amountWei;
            const grossProfitEth = parseFloat(ethers.formatEther(grossProfit));
            const grossProfitUsd = grossProfitEth * ethPrice;
            
            const netProfit = grossProfit - gasCostWei;
            const netProfitEth = parseFloat(ethers.formatEther(netProfit));
            const netProfitUsd = netProfitEth * ethPrice;
            
            const spreadBps = (grossProfitEth / amountEth) * 10000;
            
            // Determinar estado
            let status = '❌ LOSS';
            let statusColor = '';
            if (grossProfitEth > 0) {
              state.stats.positiveSpreadCount++;
              if (netProfitUsd > 0) {
                status = '✅ PROFIT';
                state.stats.profitableCount++;
              } else {
                status = '⚠️ +spread -gas';
              }
            } else {
              state.stats.negativeSpreadCount++;
            }
            
            allSpreads.push(spreadBps);
            
            console.log(`\n   Route: ${amountEth} ETH → ${fee1/100}% → USDC → ${fee2/100}% → WETH`);
            console.log(`   ├─ USDC received: ${usdcOutFormatted.toFixed(2)} USDC`);
            console.log(`   ├─ WETH received: ${wethOutFormatted.toFixed(8)} ETH`);
            console.log(`   ├─ Gross P/L: ${grossProfitEth >= 0 ? '+' : ''}${grossProfitEth.toFixed(8)} ETH ($${grossProfitUsd.toFixed(4)})`);
            console.log(`   ├─ Net P/L: ${netProfitEth >= 0 ? '+' : ''}${netProfitEth.toFixed(8)} ETH ($${netProfitUsd.toFixed(4)})`);
            console.log(`   ├─ Spread: ${spreadBps.toFixed(2)} bps (${(spreadBps/100).toFixed(4)}%)`);
            console.log(`   └─ Status: ${status}`);
            
            results.push({
              chain: chainKey,
              chainName: chain.name,
              route: `${fee1/100}%→${fee2/100}%`,
              amountIn: amountEth,
              usdcOut: usdcOutFormatted,
              wethOut: wethOutFormatted,
              grossProfitEth,
              grossProfitUsd,
              netProfitEth,
              netProfitUsd,
              spreadBps,
              gasCostUsd,
              status,
              timestamp: Date.now()
            });
            
            if (netProfitUsd > 0) {
              state.stats.opportunitiesFound++;
              state.opportunities.unshift({
                ...results[results.length - 1],
                type: 'PROFITABLE'
              });
            }
            
          } catch (e) {
            console.log(`\n   Route: ${amountEth} ETH → ${fee1/100}% → USDC → ${fee2/100}% → WETH`);
            console.log(`   └─ ❌ Pool no existe o error: ${e.message.slice(0, 50)}`);
          }
        }
      }
    }
    
    // Estadísticas
    if (allSpreads.length > 0) {
      state.stats.avgSpreadBps = allSpreads.reduce((a, b) => a + b, 0) / allSpreads.length;
      state.stats.bestSpreadBps = Math.max(...allSpreads);
      state.stats.worstSpreadBps = Math.min(...allSpreads);
    }
    
    // Guardar para UI
    state.allQuotes = results;
    if (state.opportunities.length > 20) {
      state.opportunities = state.opportunities.slice(0, 20);
    }
    
    return results;
    
  } catch (e) {
    console.error(`❌ Error: ${e.message}`);
    return [];
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// LOOP
// ═══════════════════════════════════════════════════════════════════════════════

async function tick() {
  if (!state.isRunning) return;
  
  state.stats.totalScans++;
  state.stats.uptime = Math.floor((Date.now() - state.startTime) / 1000);
  
  const chainKeys = Object.keys(CHAINS);
  const selectedChain = chainKeys[currentChainIndex % chainKeys.length];
  currentChainIndex++;
  
  state.stats.currentChain = selectedChain;
  state.banditStates.forEach(b => b.selected = b.chain === selectedChain);
  
  await analyzeChain(selectedChain);
  
  // Resumen
  console.log(`\n═══════════════════════════════════════════════════════════════════`);
  console.log(`📊 RESUMEN SCAN #${state.stats.totalScans}`);
  console.log(`═══════════════════════════════════════════════════════════════════`);
  console.log(`   Spreads Positivos: ${state.stats.positiveSpreadCount}`);
  console.log(`   Spreads Negativos: ${state.stats.negativeSpreadCount}`);
  console.log(`   Oportunidades Rentables: ${state.stats.profitableCount}`);
  console.log(`   Spread Promedio: ${state.stats.avgSpreadBps.toFixed(2)} bps`);
  console.log(`   Mejor Spread: ${state.stats.bestSpreadBps.toFixed(2)} bps`);
  console.log(`   Peor Spread: ${state.stats.worstSpreadBps.toFixed(2)} bps`);
  console.log(`═══════════════════════════════════════════════════════════════════\n`);
}

// ═══════════════════════════════════════════════════════════════════════════════
// API
// ═══════════════════════════════════════════════════════════════════════════════

app.get('/api/defi/multichain-arb/status', (req, res) => {
  res.json(state);
});

app.post('/api/defi/multichain-arb/start', async (req, res) => {
  if (state.isRunning) {
    return res.json({ success: false, error: 'Ya corriendo', isRunning: true });
  }
  
  state.isDryRun = true; // Siempre dry run en modo verbose
  state.isRunning = true;
  state.startTime = Date.now();
  
  state.stats = {
    totalScans: 0, opportunitiesFound: 0, positiveSpreadCount: 0,
    negativeSpreadCount: 0, profitableCount: 0, avgSpreadBps: 0,
    bestSpreadBps: 0, worstSpreadBps: 0, uptime: 0, currentChain: 'base'
  };
  state.opportunities = [];
  state.allQuotes = [];
  allSpreads = [];
  currentChainIndex = 0;
  
  if (timer) clearInterval(timer);
  timer = setInterval(tick, CONFIG.SCAN_INTERVAL_MS);
  
  // Ejecutar primer tick inmediatamente
  tick();
  
  console.log(`\n[START] 🔍 MODO VERBOSE - Analizando mercado...\n`);
  
  res.json({
    success: true,
    isRunning: true,
    isDryRun: true,
    mode: 'SCALPER_VERBOSE',
    config: CONFIG
  });
});

app.post('/api/defi/multichain-arb/stop', (req, res) => {
  state.isRunning = false;
  if (timer) { clearInterval(timer); timer = null; }
  console.log('[STOP] Análisis detenido');
  res.json({ success: true, isRunning: false });
});

app.get('/api/defi/multichain-arb/health', (req, res) => {
  res.json({
    status: 'ok',
    mode: 'SCALPER_VERBOSE',
    port: PORT,
    running: state.isRunning,
    wallet: WALLET_ADDRESS
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// INICIAR
// ═══════════════════════════════════════════════════════════════════════════════

app.listen(PORT, async () => {
  console.log(`
╔═══════════════════════════════════════════════════════════════════════════════╗
║                                                                               ║
║   🔍 SCALPER VERBOSE - ANÁLISIS DE MERCADO                                    ║
║                                                                               ║
║   Este modo muestra TODAS las oportunidades analizadas,                       ║
║   incluyendo las no rentables, para entender el mercado.                      ║
║                                                                               ║
║   ✅ Puerto: ${PORT}                                                           ║
║   ✅ Wallet: ${WALLET_ADDRESS.slice(0, 10)}...${WALLET_ADDRESS.slice(-5)}                                  ║
║                                                                               ║
╚═══════════════════════════════════════════════════════════════════════════════╝
  `);
  
  await init();
  console.log('[READY] 🔍 POST /api/defi/multichain-arb/start para iniciar análisis.\n');
});

process.on('SIGINT', () => {
  if (timer) clearInterval(timer);
  process.exit(0);
});


 * ═══════════════════════════════════════════════════════════════════════════════
 * 🔍 SCALPER VERBOSE - MUESTRA TODAS LAS OPORTUNIDADES
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * Esta versión muestra TODAS las oportunidades analizadas, incluyendo:
 * - Spreads negativos (pérdida)
 * - Spreads positivos pero no rentables después de gas
 * - Oportunidades rentables
 * 
 * Útil para entender el mercado y calibrar parámetros.
 */

import express from 'express';
import cors from 'cors';
import { ethers } from 'ethers';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '../.env') });

const app = express();
const PORT = 3101;

app.use(cors());
app.use(express.json());

// ═══════════════════════════════════════════════════════════════════════════════
// CONFIGURACIÓN
// ═══════════════════════════════════════════════════════════════════════════════

const CONFIG = {
  SCAN_INTERVAL_MS: 2000,          // Más lento para ver mejor los logs
  MIN_PROFIT_USD: -10,             // Mostrar incluso pérdidas
  SHOW_ALL_QUOTES: true,           // Mostrar todos los quotes
  TRADE_AMOUNTS_ETH: [0.01],       // Solo un amount para simplificar
  FEE_TIERS: [500, 3000],          // 0.05% y 0.3%
  AUTO_EXECUTE: false,             // NO ejecutar automáticamente
  ETH_PRICE_USD: 3500
};

const PRIVATE_KEY = process.env.VITE_ETH_PRIVATE_KEY;
const WALLET_ADDRESS = process.env.VITE_ETH_WALLET_ADDRESS;

if (!PRIVATE_KEY || !WALLET_ADDRESS) {
  console.error('❌ ERROR: Credenciales no configuradas');
  process.exit(1);
}

// ═══════════════════════════════════════════════════════════════════════════════
// CHAINS
// ═══════════════════════════════════════════════════════════════════════════════

const CHAINS = {
  base: {
    name: 'Base',
    chainId: 8453,
    rpc: 'https://base-mainnet.g.alchemy.com/v2/mm-9UjI5oG51l94mRH3fh',
    explorer: 'https://basescan.org',
    tokens: {
      WETH: '0x4200000000000000000000000000000000000006',
      USDC: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913'
    },
    quoter: '0x3d4e44Eb1374240CE5F1B871ab261CD16335B76a',
    router: '0x2626664c2603336E57B271c5C0b26F421741e481'
  },
  arbitrum: {
    name: 'Arbitrum',
    chainId: 42161,
    rpc: 'https://arb1.arbitrum.io/rpc',
    explorer: 'https://arbiscan.io',
    tokens: {
      WETH: '0x82aF49447D8a07e3bd95BD0d56f35241523fBab1',
      USDC: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831'
    },
    quoter: '0x61fFE014bA17989E743c5F6cB21bF9697530B21e',
    router: '0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45'
  }
};

// ABIs
const QUOTER_ABI = [
  'function quoteExactInputSingle((address tokenIn, address tokenOut, uint256 amountIn, uint24 fee, uint160 sqrtPriceLimitX96)) external returns (uint256 amountOut, uint160 sqrtPriceX96After, uint32 initializedTicksCrossed, uint256 gasEstimate)'
];

// ═══════════════════════════════════════════════════════════════════════════════
// ESTADO
// ═══════════════════════════════════════════════════════════════════════════════

let state = {
  isRunning: false,
  isDryRun: true,
  startTime: null,
  mode: 'SCALPER_VERBOSE',
  stats: {
    totalScans: 0,
    opportunitiesFound: 0,
    positiveSpreadCount: 0,
    negativeSpreadCount: 0,
    profitableCount: 0,
    avgSpreadBps: 0,
    bestSpreadBps: 0,
    worstSpreadBps: 0,
    uptime: 0,
    currentChain: 'base'
  },
  chains: [],
  tradeLogs: [],
  opportunities: [],
  banditStates: [],
  allQuotes: []  // Guardar todos los quotes para análisis
};

let timer = null;
let providers = {};
let contracts = {};
let currentChainIndex = 0;
let allSpreads = [];

// ═══════════════════════════════════════════════════════════════════════════════
// INICIALIZAR
// ═══════════════════════════════════════════════════════════════════════════════

async function init() {
  console.log('[INIT] 🔌 Conectando...\n');
  
  for (const [key, chain] of Object.entries(CHAINS)) {
    try {
      providers[key] = new ethers.JsonRpcProvider(chain.rpc);
      contracts[key] = {
        quoter: new ethers.Contract(chain.quoter, QUOTER_ABI, providers[key])
      };
      
      const balance = await providers[key].getBalance(WALLET_ADDRESS);
      const balanceEth = parseFloat(ethers.formatEther(balance));
      
      state.chains.push({
        chain: key,
        name: chain.name,
        chainId: chain.chainId,
        balance: balanceEth.toFixed(6),
        balanceUsd: balanceEth * CONFIG.ETH_PRICE_USD,
        isActive: true,
        explorer: chain.explorer,
        ethPrice: 0
      });
      
      state.banditStates.push({
        chain: key,
        alpha: 2,
        beta: 2,
        winRate: 50,
        selected: key === 'base'
      });
      
      console.log(`   ✅ ${chain.name}: ${balanceEth.toFixed(6)} ETH`);
    } catch (e) {
      console.error(`   ❌ ${chain.name}: ${e.message}`);
    }
  }
  console.log('');
}

// ═══════════════════════════════════════════════════════════════════════════════
// ANÁLISIS DETALLADO
// ═══════════════════════════════════════════════════════════════════════════════

async function analyzeChain(chainKey) {
  const chain = CHAINS[chainKey];
  const provider = providers[chainKey];
  const quoter = contracts[chainKey].quoter;
  
  console.log(`\n═══════════════════════════════════════════════════════════════════`);
  console.log(`📊 ANÁLISIS: ${chain.name}`);
  console.log(`═══════════════════════════════════════════════════════════════════`);
  
  try {
    // Obtener gas price
    const feeData = await provider.getFeeData();
    const gasPrice = feeData.gasPrice || ethers.parseUnits('0.001', 'gwei');
    const gasPriceGwei = parseFloat(ethers.formatUnits(gasPrice, 'gwei'));
    const gasCostWei = gasPrice * 250000n;
    
    console.log(`⛽ Gas Price: ${gasPriceGwei.toFixed(4)} gwei`);
    console.log(`⛽ Estimated Gas Cost: ${ethers.formatEther(gasCostWei)} ETH`);
    
    // Obtener precio ETH
    let ethPrice = CONFIG.ETH_PRICE_USD;
    try {
      const priceQuote = await quoter.quoteExactInputSingle.staticCall({
        tokenIn: chain.tokens.WETH,
        tokenOut: chain.tokens.USDC,
        amountIn: ethers.parseEther('1'),
        fee: 500,
        sqrtPriceLimitX96: 0n
      });
      ethPrice = parseFloat(ethers.formatUnits(priceQuote[0], 6));
      console.log(`💰 ETH Price on ${chain.name}: $${ethPrice.toFixed(2)}`);
    } catch (e) {
      console.log(`💰 ETH Price: Using default $${ethPrice}`);
    }
    
    const gasCostUsd = parseFloat(ethers.formatEther(gasCostWei)) * ethPrice;
    console.log(`⛽ Gas Cost in USD: $${gasCostUsd.toFixed(4)}`);
    
    // Actualizar estado
    const chainState = state.chains.find(c => c.chain === chainKey);
    if (chainState) chainState.ethPrice = ethPrice;
    
    console.log(`\n📈 QUOTES WETH → USDC → WETH:`);
    console.log(`─────────────────────────────────────────────────────────────────`);
    
    const results = [];
    
    for (const amountEth of CONFIG.TRADE_AMOUNTS_ETH) {
      const amountWei = ethers.parseEther(amountEth.toString());
      
      for (let i = 0; i < CONFIG.FEE_TIERS.length; i++) {
        for (let j = 0; j < CONFIG.FEE_TIERS.length; j++) {
          const fee1 = CONFIG.FEE_TIERS[i];
          const fee2 = CONFIG.FEE_TIERS[j];
          
          try {
            // WETH → USDC
            const quote1 = await quoter.quoteExactInputSingle.staticCall({
              tokenIn: chain.tokens.WETH,
              tokenOut: chain.tokens.USDC,
              amountIn: amountWei,
              fee: fee1,
              sqrtPriceLimitX96: 0n
            });
            const usdcOut = quote1[0];
            const usdcOutFormatted = parseFloat(ethers.formatUnits(usdcOut, 6));
            
            // USDC → WETH
            const quote2 = await quoter.quoteExactInputSingle.staticCall({
              tokenIn: chain.tokens.USDC,
              tokenOut: chain.tokens.WETH,
              amountIn: usdcOut,
              fee: fee2,
              sqrtPriceLimitX96: 0n
            });
            const wethOut = quote2[0];
            const wethOutFormatted = parseFloat(ethers.formatEther(wethOut));
            
            // Calcular profit/loss
            const grossProfit = wethOut - amountWei;
            const grossProfitEth = parseFloat(ethers.formatEther(grossProfit));
            const grossProfitUsd = grossProfitEth * ethPrice;
            
            const netProfit = grossProfit - gasCostWei;
            const netProfitEth = parseFloat(ethers.formatEther(netProfit));
            const netProfitUsd = netProfitEth * ethPrice;
            
            const spreadBps = (grossProfitEth / amountEth) * 10000;
            
            // Determinar estado
            let status = '❌ LOSS';
            let statusColor = '';
            if (grossProfitEth > 0) {
              state.stats.positiveSpreadCount++;
              if (netProfitUsd > 0) {
                status = '✅ PROFIT';
                state.stats.profitableCount++;
              } else {
                status = '⚠️ +spread -gas';
              }
            } else {
              state.stats.negativeSpreadCount++;
            }
            
            allSpreads.push(spreadBps);
            
            console.log(`\n   Route: ${amountEth} ETH → ${fee1/100}% → USDC → ${fee2/100}% → WETH`);
            console.log(`   ├─ USDC received: ${usdcOutFormatted.toFixed(2)} USDC`);
            console.log(`   ├─ WETH received: ${wethOutFormatted.toFixed(8)} ETH`);
            console.log(`   ├─ Gross P/L: ${grossProfitEth >= 0 ? '+' : ''}${grossProfitEth.toFixed(8)} ETH ($${grossProfitUsd.toFixed(4)})`);
            console.log(`   ├─ Net P/L: ${netProfitEth >= 0 ? '+' : ''}${netProfitEth.toFixed(8)} ETH ($${netProfitUsd.toFixed(4)})`);
            console.log(`   ├─ Spread: ${spreadBps.toFixed(2)} bps (${(spreadBps/100).toFixed(4)}%)`);
            console.log(`   └─ Status: ${status}`);
            
            results.push({
              chain: chainKey,
              chainName: chain.name,
              route: `${fee1/100}%→${fee2/100}%`,
              amountIn: amountEth,
              usdcOut: usdcOutFormatted,
              wethOut: wethOutFormatted,
              grossProfitEth,
              grossProfitUsd,
              netProfitEth,
              netProfitUsd,
              spreadBps,
              gasCostUsd,
              status,
              timestamp: Date.now()
            });
            
            if (netProfitUsd > 0) {
              state.stats.opportunitiesFound++;
              state.opportunities.unshift({
                ...results[results.length - 1],
                type: 'PROFITABLE'
              });
            }
            
          } catch (e) {
            console.log(`\n   Route: ${amountEth} ETH → ${fee1/100}% → USDC → ${fee2/100}% → WETH`);
            console.log(`   └─ ❌ Pool no existe o error: ${e.message.slice(0, 50)}`);
          }
        }
      }
    }
    
    // Estadísticas
    if (allSpreads.length > 0) {
      state.stats.avgSpreadBps = allSpreads.reduce((a, b) => a + b, 0) / allSpreads.length;
      state.stats.bestSpreadBps = Math.max(...allSpreads);
      state.stats.worstSpreadBps = Math.min(...allSpreads);
    }
    
    // Guardar para UI
    state.allQuotes = results;
    if (state.opportunities.length > 20) {
      state.opportunities = state.opportunities.slice(0, 20);
    }
    
    return results;
    
  } catch (e) {
    console.error(`❌ Error: ${e.message}`);
    return [];
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// LOOP
// ═══════════════════════════════════════════════════════════════════════════════

async function tick() {
  if (!state.isRunning) return;
  
  state.stats.totalScans++;
  state.stats.uptime = Math.floor((Date.now() - state.startTime) / 1000);
  
  const chainKeys = Object.keys(CHAINS);
  const selectedChain = chainKeys[currentChainIndex % chainKeys.length];
  currentChainIndex++;
  
  state.stats.currentChain = selectedChain;
  state.banditStates.forEach(b => b.selected = b.chain === selectedChain);
  
  await analyzeChain(selectedChain);
  
  // Resumen
  console.log(`\n═══════════════════════════════════════════════════════════════════`);
  console.log(`📊 RESUMEN SCAN #${state.stats.totalScans}`);
  console.log(`═══════════════════════════════════════════════════════════════════`);
  console.log(`   Spreads Positivos: ${state.stats.positiveSpreadCount}`);
  console.log(`   Spreads Negativos: ${state.stats.negativeSpreadCount}`);
  console.log(`   Oportunidades Rentables: ${state.stats.profitableCount}`);
  console.log(`   Spread Promedio: ${state.stats.avgSpreadBps.toFixed(2)} bps`);
  console.log(`   Mejor Spread: ${state.stats.bestSpreadBps.toFixed(2)} bps`);
  console.log(`   Peor Spread: ${state.stats.worstSpreadBps.toFixed(2)} bps`);
  console.log(`═══════════════════════════════════════════════════════════════════\n`);
}

// ═══════════════════════════════════════════════════════════════════════════════
// API
// ═══════════════════════════════════════════════════════════════════════════════

app.get('/api/defi/multichain-arb/status', (req, res) => {
  res.json(state);
});

app.post('/api/defi/multichain-arb/start', async (req, res) => {
  if (state.isRunning) {
    return res.json({ success: false, error: 'Ya corriendo', isRunning: true });
  }
  
  state.isDryRun = true; // Siempre dry run en modo verbose
  state.isRunning = true;
  state.startTime = Date.now();
  
  state.stats = {
    totalScans: 0, opportunitiesFound: 0, positiveSpreadCount: 0,
    negativeSpreadCount: 0, profitableCount: 0, avgSpreadBps: 0,
    bestSpreadBps: 0, worstSpreadBps: 0, uptime: 0, currentChain: 'base'
  };
  state.opportunities = [];
  state.allQuotes = [];
  allSpreads = [];
  currentChainIndex = 0;
  
  if (timer) clearInterval(timer);
  timer = setInterval(tick, CONFIG.SCAN_INTERVAL_MS);
  
  // Ejecutar primer tick inmediatamente
  tick();
  
  console.log(`\n[START] 🔍 MODO VERBOSE - Analizando mercado...\n`);
  
  res.json({
    success: true,
    isRunning: true,
    isDryRun: true,
    mode: 'SCALPER_VERBOSE',
    config: CONFIG
  });
});

app.post('/api/defi/multichain-arb/stop', (req, res) => {
  state.isRunning = false;
  if (timer) { clearInterval(timer); timer = null; }
  console.log('[STOP] Análisis detenido');
  res.json({ success: true, isRunning: false });
});

app.get('/api/defi/multichain-arb/health', (req, res) => {
  res.json({
    status: 'ok',
    mode: 'SCALPER_VERBOSE',
    port: PORT,
    running: state.isRunning,
    wallet: WALLET_ADDRESS
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// INICIAR
// ═══════════════════════════════════════════════════════════════════════════════

app.listen(PORT, async () => {
  console.log(`
╔═══════════════════════════════════════════════════════════════════════════════╗
║                                                                               ║
║   🔍 SCALPER VERBOSE - ANÁLISIS DE MERCADO                                    ║
║                                                                               ║
║   Este modo muestra TODAS las oportunidades analizadas,                       ║
║   incluyendo las no rentables, para entender el mercado.                      ║
║                                                                               ║
║   ✅ Puerto: ${PORT}                                                           ║
║   ✅ Wallet: ${WALLET_ADDRESS.slice(0, 10)}...${WALLET_ADDRESS.slice(-5)}                                  ║
║                                                                               ║
╚═══════════════════════════════════════════════════════════════════════════════╝
  `);
  
  await init();
  console.log('[READY] 🔍 POST /api/defi/multichain-arb/start para iniciar análisis.\n');
});

process.on('SIGINT', () => {
  if (timer) clearInterval(timer);
  process.exit(0);
});



 * ═══════════════════════════════════════════════════════════════════════════════
 * 🔍 SCALPER VERBOSE - MUESTRA TODAS LAS OPORTUNIDADES
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * Esta versión muestra TODAS las oportunidades analizadas, incluyendo:
 * - Spreads negativos (pérdida)
 * - Spreads positivos pero no rentables después de gas
 * - Oportunidades rentables
 * 
 * Útil para entender el mercado y calibrar parámetros.
 */

import express from 'express';
import cors from 'cors';
import { ethers } from 'ethers';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '../.env') });

const app = express();
const PORT = 3101;

app.use(cors());
app.use(express.json());

// ═══════════════════════════════════════════════════════════════════════════════
// CONFIGURACIÓN
// ═══════════════════════════════════════════════════════════════════════════════

const CONFIG = {
  SCAN_INTERVAL_MS: 2000,          // Más lento para ver mejor los logs
  MIN_PROFIT_USD: -10,             // Mostrar incluso pérdidas
  SHOW_ALL_QUOTES: true,           // Mostrar todos los quotes
  TRADE_AMOUNTS_ETH: [0.01],       // Solo un amount para simplificar
  FEE_TIERS: [500, 3000],          // 0.05% y 0.3%
  AUTO_EXECUTE: false,             // NO ejecutar automáticamente
  ETH_PRICE_USD: 3500
};

const PRIVATE_KEY = process.env.VITE_ETH_PRIVATE_KEY;
const WALLET_ADDRESS = process.env.VITE_ETH_WALLET_ADDRESS;

if (!PRIVATE_KEY || !WALLET_ADDRESS) {
  console.error('❌ ERROR: Credenciales no configuradas');
  process.exit(1);
}

// ═══════════════════════════════════════════════════════════════════════════════
// CHAINS
// ═══════════════════════════════════════════════════════════════════════════════

const CHAINS = {
  base: {
    name: 'Base',
    chainId: 8453,
    rpc: 'https://base-mainnet.g.alchemy.com/v2/mm-9UjI5oG51l94mRH3fh',
    explorer: 'https://basescan.org',
    tokens: {
      WETH: '0x4200000000000000000000000000000000000006',
      USDC: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913'
    },
    quoter: '0x3d4e44Eb1374240CE5F1B871ab261CD16335B76a',
    router: '0x2626664c2603336E57B271c5C0b26F421741e481'
  },
  arbitrum: {
    name: 'Arbitrum',
    chainId: 42161,
    rpc: 'https://arb1.arbitrum.io/rpc',
    explorer: 'https://arbiscan.io',
    tokens: {
      WETH: '0x82aF49447D8a07e3bd95BD0d56f35241523fBab1',
      USDC: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831'
    },
    quoter: '0x61fFE014bA17989E743c5F6cB21bF9697530B21e',
    router: '0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45'
  }
};

// ABIs
const QUOTER_ABI = [
  'function quoteExactInputSingle((address tokenIn, address tokenOut, uint256 amountIn, uint24 fee, uint160 sqrtPriceLimitX96)) external returns (uint256 amountOut, uint160 sqrtPriceX96After, uint32 initializedTicksCrossed, uint256 gasEstimate)'
];

// ═══════════════════════════════════════════════════════════════════════════════
// ESTADO
// ═══════════════════════════════════════════════════════════════════════════════

let state = {
  isRunning: false,
  isDryRun: true,
  startTime: null,
  mode: 'SCALPER_VERBOSE',
  stats: {
    totalScans: 0,
    opportunitiesFound: 0,
    positiveSpreadCount: 0,
    negativeSpreadCount: 0,
    profitableCount: 0,
    avgSpreadBps: 0,
    bestSpreadBps: 0,
    worstSpreadBps: 0,
    uptime: 0,
    currentChain: 'base'
  },
  chains: [],
  tradeLogs: [],
  opportunities: [],
  banditStates: [],
  allQuotes: []  // Guardar todos los quotes para análisis
};

let timer = null;
let providers = {};
let contracts = {};
let currentChainIndex = 0;
let allSpreads = [];

// ═══════════════════════════════════════════════════════════════════════════════
// INICIALIZAR
// ═══════════════════════════════════════════════════════════════════════════════

async function init() {
  console.log('[INIT] 🔌 Conectando...\n');
  
  for (const [key, chain] of Object.entries(CHAINS)) {
    try {
      providers[key] = new ethers.JsonRpcProvider(chain.rpc);
      contracts[key] = {
        quoter: new ethers.Contract(chain.quoter, QUOTER_ABI, providers[key])
      };
      
      const balance = await providers[key].getBalance(WALLET_ADDRESS);
      const balanceEth = parseFloat(ethers.formatEther(balance));
      
      state.chains.push({
        chain: key,
        name: chain.name,
        chainId: chain.chainId,
        balance: balanceEth.toFixed(6),
        balanceUsd: balanceEth * CONFIG.ETH_PRICE_USD,
        isActive: true,
        explorer: chain.explorer,
        ethPrice: 0
      });
      
      state.banditStates.push({
        chain: key,
        alpha: 2,
        beta: 2,
        winRate: 50,
        selected: key === 'base'
      });
      
      console.log(`   ✅ ${chain.name}: ${balanceEth.toFixed(6)} ETH`);
    } catch (e) {
      console.error(`   ❌ ${chain.name}: ${e.message}`);
    }
  }
  console.log('');
}

// ═══════════════════════════════════════════════════════════════════════════════
// ANÁLISIS DETALLADO
// ═══════════════════════════════════════════════════════════════════════════════

async function analyzeChain(chainKey) {
  const chain = CHAINS[chainKey];
  const provider = providers[chainKey];
  const quoter = contracts[chainKey].quoter;
  
  console.log(`\n═══════════════════════════════════════════════════════════════════`);
  console.log(`📊 ANÁLISIS: ${chain.name}`);
  console.log(`═══════════════════════════════════════════════════════════════════`);
  
  try {
    // Obtener gas price
    const feeData = await provider.getFeeData();
    const gasPrice = feeData.gasPrice || ethers.parseUnits('0.001', 'gwei');
    const gasPriceGwei = parseFloat(ethers.formatUnits(gasPrice, 'gwei'));
    const gasCostWei = gasPrice * 250000n;
    
    console.log(`⛽ Gas Price: ${gasPriceGwei.toFixed(4)} gwei`);
    console.log(`⛽ Estimated Gas Cost: ${ethers.formatEther(gasCostWei)} ETH`);
    
    // Obtener precio ETH
    let ethPrice = CONFIG.ETH_PRICE_USD;
    try {
      const priceQuote = await quoter.quoteExactInputSingle.staticCall({
        tokenIn: chain.tokens.WETH,
        tokenOut: chain.tokens.USDC,
        amountIn: ethers.parseEther('1'),
        fee: 500,
        sqrtPriceLimitX96: 0n
      });
      ethPrice = parseFloat(ethers.formatUnits(priceQuote[0], 6));
      console.log(`💰 ETH Price on ${chain.name}: $${ethPrice.toFixed(2)}`);
    } catch (e) {
      console.log(`💰 ETH Price: Using default $${ethPrice}`);
    }
    
    const gasCostUsd = parseFloat(ethers.formatEther(gasCostWei)) * ethPrice;
    console.log(`⛽ Gas Cost in USD: $${gasCostUsd.toFixed(4)}`);
    
    // Actualizar estado
    const chainState = state.chains.find(c => c.chain === chainKey);
    if (chainState) chainState.ethPrice = ethPrice;
    
    console.log(`\n📈 QUOTES WETH → USDC → WETH:`);
    console.log(`─────────────────────────────────────────────────────────────────`);
    
    const results = [];
    
    for (const amountEth of CONFIG.TRADE_AMOUNTS_ETH) {
      const amountWei = ethers.parseEther(amountEth.toString());
      
      for (let i = 0; i < CONFIG.FEE_TIERS.length; i++) {
        for (let j = 0; j < CONFIG.FEE_TIERS.length; j++) {
          const fee1 = CONFIG.FEE_TIERS[i];
          const fee2 = CONFIG.FEE_TIERS[j];
          
          try {
            // WETH → USDC
            const quote1 = await quoter.quoteExactInputSingle.staticCall({
              tokenIn: chain.tokens.WETH,
              tokenOut: chain.tokens.USDC,
              amountIn: amountWei,
              fee: fee1,
              sqrtPriceLimitX96: 0n
            });
            const usdcOut = quote1[0];
            const usdcOutFormatted = parseFloat(ethers.formatUnits(usdcOut, 6));
            
            // USDC → WETH
            const quote2 = await quoter.quoteExactInputSingle.staticCall({
              tokenIn: chain.tokens.USDC,
              tokenOut: chain.tokens.WETH,
              amountIn: usdcOut,
              fee: fee2,
              sqrtPriceLimitX96: 0n
            });
            const wethOut = quote2[0];
            const wethOutFormatted = parseFloat(ethers.formatEther(wethOut));
            
            // Calcular profit/loss
            const grossProfit = wethOut - amountWei;
            const grossProfitEth = parseFloat(ethers.formatEther(grossProfit));
            const grossProfitUsd = grossProfitEth * ethPrice;
            
            const netProfit = grossProfit - gasCostWei;
            const netProfitEth = parseFloat(ethers.formatEther(netProfit));
            const netProfitUsd = netProfitEth * ethPrice;
            
            const spreadBps = (grossProfitEth / amountEth) * 10000;
            
            // Determinar estado
            let status = '❌ LOSS';
            let statusColor = '';
            if (grossProfitEth > 0) {
              state.stats.positiveSpreadCount++;
              if (netProfitUsd > 0) {
                status = '✅ PROFIT';
                state.stats.profitableCount++;
              } else {
                status = '⚠️ +spread -gas';
              }
            } else {
              state.stats.negativeSpreadCount++;
            }
            
            allSpreads.push(spreadBps);
            
            console.log(`\n   Route: ${amountEth} ETH → ${fee1/100}% → USDC → ${fee2/100}% → WETH`);
            console.log(`   ├─ USDC received: ${usdcOutFormatted.toFixed(2)} USDC`);
            console.log(`   ├─ WETH received: ${wethOutFormatted.toFixed(8)} ETH`);
            console.log(`   ├─ Gross P/L: ${grossProfitEth >= 0 ? '+' : ''}${grossProfitEth.toFixed(8)} ETH ($${grossProfitUsd.toFixed(4)})`);
            console.log(`   ├─ Net P/L: ${netProfitEth >= 0 ? '+' : ''}${netProfitEth.toFixed(8)} ETH ($${netProfitUsd.toFixed(4)})`);
            console.log(`   ├─ Spread: ${spreadBps.toFixed(2)} bps (${(spreadBps/100).toFixed(4)}%)`);
            console.log(`   └─ Status: ${status}`);
            
            results.push({
              chain: chainKey,
              chainName: chain.name,
              route: `${fee1/100}%→${fee2/100}%`,
              amountIn: amountEth,
              usdcOut: usdcOutFormatted,
              wethOut: wethOutFormatted,
              grossProfitEth,
              grossProfitUsd,
              netProfitEth,
              netProfitUsd,
              spreadBps,
              gasCostUsd,
              status,
              timestamp: Date.now()
            });
            
            if (netProfitUsd > 0) {
              state.stats.opportunitiesFound++;
              state.opportunities.unshift({
                ...results[results.length - 1],
                type: 'PROFITABLE'
              });
            }
            
          } catch (e) {
            console.log(`\n   Route: ${amountEth} ETH → ${fee1/100}% → USDC → ${fee2/100}% → WETH`);
            console.log(`   └─ ❌ Pool no existe o error: ${e.message.slice(0, 50)}`);
          }
        }
      }
    }
    
    // Estadísticas
    if (allSpreads.length > 0) {
      state.stats.avgSpreadBps = allSpreads.reduce((a, b) => a + b, 0) / allSpreads.length;
      state.stats.bestSpreadBps = Math.max(...allSpreads);
      state.stats.worstSpreadBps = Math.min(...allSpreads);
    }
    
    // Guardar para UI
    state.allQuotes = results;
    if (state.opportunities.length > 20) {
      state.opportunities = state.opportunities.slice(0, 20);
    }
    
    return results;
    
  } catch (e) {
    console.error(`❌ Error: ${e.message}`);
    return [];
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// LOOP
// ═══════════════════════════════════════════════════════════════════════════════

async function tick() {
  if (!state.isRunning) return;
  
  state.stats.totalScans++;
  state.stats.uptime = Math.floor((Date.now() - state.startTime) / 1000);
  
  const chainKeys = Object.keys(CHAINS);
  const selectedChain = chainKeys[currentChainIndex % chainKeys.length];
  currentChainIndex++;
  
  state.stats.currentChain = selectedChain;
  state.banditStates.forEach(b => b.selected = b.chain === selectedChain);
  
  await analyzeChain(selectedChain);
  
  // Resumen
  console.log(`\n═══════════════════════════════════════════════════════════════════`);
  console.log(`📊 RESUMEN SCAN #${state.stats.totalScans}`);
  console.log(`═══════════════════════════════════════════════════════════════════`);
  console.log(`   Spreads Positivos: ${state.stats.positiveSpreadCount}`);
  console.log(`   Spreads Negativos: ${state.stats.negativeSpreadCount}`);
  console.log(`   Oportunidades Rentables: ${state.stats.profitableCount}`);
  console.log(`   Spread Promedio: ${state.stats.avgSpreadBps.toFixed(2)} bps`);
  console.log(`   Mejor Spread: ${state.stats.bestSpreadBps.toFixed(2)} bps`);
  console.log(`   Peor Spread: ${state.stats.worstSpreadBps.toFixed(2)} bps`);
  console.log(`═══════════════════════════════════════════════════════════════════\n`);
}

// ═══════════════════════════════════════════════════════════════════════════════
// API
// ═══════════════════════════════════════════════════════════════════════════════

app.get('/api/defi/multichain-arb/status', (req, res) => {
  res.json(state);
});

app.post('/api/defi/multichain-arb/start', async (req, res) => {
  if (state.isRunning) {
    return res.json({ success: false, error: 'Ya corriendo', isRunning: true });
  }
  
  state.isDryRun = true; // Siempre dry run en modo verbose
  state.isRunning = true;
  state.startTime = Date.now();
  
  state.stats = {
    totalScans: 0, opportunitiesFound: 0, positiveSpreadCount: 0,
    negativeSpreadCount: 0, profitableCount: 0, avgSpreadBps: 0,
    bestSpreadBps: 0, worstSpreadBps: 0, uptime: 0, currentChain: 'base'
  };
  state.opportunities = [];
  state.allQuotes = [];
  allSpreads = [];
  currentChainIndex = 0;
  
  if (timer) clearInterval(timer);
  timer = setInterval(tick, CONFIG.SCAN_INTERVAL_MS);
  
  // Ejecutar primer tick inmediatamente
  tick();
  
  console.log(`\n[START] 🔍 MODO VERBOSE - Analizando mercado...\n`);
  
  res.json({
    success: true,
    isRunning: true,
    isDryRun: true,
    mode: 'SCALPER_VERBOSE',
    config: CONFIG
  });
});

app.post('/api/defi/multichain-arb/stop', (req, res) => {
  state.isRunning = false;
  if (timer) { clearInterval(timer); timer = null; }
  console.log('[STOP] Análisis detenido');
  res.json({ success: true, isRunning: false });
});

app.get('/api/defi/multichain-arb/health', (req, res) => {
  res.json({
    status: 'ok',
    mode: 'SCALPER_VERBOSE',
    port: PORT,
    running: state.isRunning,
    wallet: WALLET_ADDRESS
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// INICIAR
// ═══════════════════════════════════════════════════════════════════════════════

app.listen(PORT, async () => {
  console.log(`
╔═══════════════════════════════════════════════════════════════════════════════╗
║                                                                               ║
║   🔍 SCALPER VERBOSE - ANÁLISIS DE MERCADO                                    ║
║                                                                               ║
║   Este modo muestra TODAS las oportunidades analizadas,                       ║
║   incluyendo las no rentables, para entender el mercado.                      ║
║                                                                               ║
║   ✅ Puerto: ${PORT}                                                           ║
║   ✅ Wallet: ${WALLET_ADDRESS.slice(0, 10)}...${WALLET_ADDRESS.slice(-5)}                                  ║
║                                                                               ║
╚═══════════════════════════════════════════════════════════════════════════════╝
  `);
  
  await init();
  console.log('[READY] 🔍 POST /api/defi/multichain-arb/start para iniciar análisis.\n');
});

process.on('SIGINT', () => {
  if (timer) clearInterval(timer);
  process.exit(0);
});


 * ═══════════════════════════════════════════════════════════════════════════════
 * 🔍 SCALPER VERBOSE - MUESTRA TODAS LAS OPORTUNIDADES
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * Esta versión muestra TODAS las oportunidades analizadas, incluyendo:
 * - Spreads negativos (pérdida)
 * - Spreads positivos pero no rentables después de gas
 * - Oportunidades rentables
 * 
 * Útil para entender el mercado y calibrar parámetros.
 */

import express from 'express';
import cors from 'cors';
import { ethers } from 'ethers';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '../.env') });

const app = express();
const PORT = 3101;

app.use(cors());
app.use(express.json());

// ═══════════════════════════════════════════════════════════════════════════════
// CONFIGURACIÓN
// ═══════════════════════════════════════════════════════════════════════════════

const CONFIG = {
  SCAN_INTERVAL_MS: 2000,          // Más lento para ver mejor los logs
  MIN_PROFIT_USD: -10,             // Mostrar incluso pérdidas
  SHOW_ALL_QUOTES: true,           // Mostrar todos los quotes
  TRADE_AMOUNTS_ETH: [0.01],       // Solo un amount para simplificar
  FEE_TIERS: [500, 3000],          // 0.05% y 0.3%
  AUTO_EXECUTE: false,             // NO ejecutar automáticamente
  ETH_PRICE_USD: 3500
};

const PRIVATE_KEY = process.env.VITE_ETH_PRIVATE_KEY;
const WALLET_ADDRESS = process.env.VITE_ETH_WALLET_ADDRESS;

if (!PRIVATE_KEY || !WALLET_ADDRESS) {
  console.error('❌ ERROR: Credenciales no configuradas');
  process.exit(1);
}

// ═══════════════════════════════════════════════════════════════════════════════
// CHAINS
// ═══════════════════════════════════════════════════════════════════════════════

const CHAINS = {
  base: {
    name: 'Base',
    chainId: 8453,
    rpc: 'https://base-mainnet.g.alchemy.com/v2/mm-9UjI5oG51l94mRH3fh',
    explorer: 'https://basescan.org',
    tokens: {
      WETH: '0x4200000000000000000000000000000000000006',
      USDC: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913'
    },
    quoter: '0x3d4e44Eb1374240CE5F1B871ab261CD16335B76a',
    router: '0x2626664c2603336E57B271c5C0b26F421741e481'
  },
  arbitrum: {
    name: 'Arbitrum',
    chainId: 42161,
    rpc: 'https://arb1.arbitrum.io/rpc',
    explorer: 'https://arbiscan.io',
    tokens: {
      WETH: '0x82aF49447D8a07e3bd95BD0d56f35241523fBab1',
      USDC: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831'
    },
    quoter: '0x61fFE014bA17989E743c5F6cB21bF9697530B21e',
    router: '0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45'
  }
};

// ABIs
const QUOTER_ABI = [
  'function quoteExactInputSingle((address tokenIn, address tokenOut, uint256 amountIn, uint24 fee, uint160 sqrtPriceLimitX96)) external returns (uint256 amountOut, uint160 sqrtPriceX96After, uint32 initializedTicksCrossed, uint256 gasEstimate)'
];

// ═══════════════════════════════════════════════════════════════════════════════
// ESTADO
// ═══════════════════════════════════════════════════════════════════════════════

let state = {
  isRunning: false,
  isDryRun: true,
  startTime: null,
  mode: 'SCALPER_VERBOSE',
  stats: {
    totalScans: 0,
    opportunitiesFound: 0,
    positiveSpreadCount: 0,
    negativeSpreadCount: 0,
    profitableCount: 0,
    avgSpreadBps: 0,
    bestSpreadBps: 0,
    worstSpreadBps: 0,
    uptime: 0,
    currentChain: 'base'
  },
  chains: [],
  tradeLogs: [],
  opportunities: [],
  banditStates: [],
  allQuotes: []  // Guardar todos los quotes para análisis
};

let timer = null;
let providers = {};
let contracts = {};
let currentChainIndex = 0;
let allSpreads = [];

// ═══════════════════════════════════════════════════════════════════════════════
// INICIALIZAR
// ═══════════════════════════════════════════════════════════════════════════════

async function init() {
  console.log('[INIT] 🔌 Conectando...\n');
  
  for (const [key, chain] of Object.entries(CHAINS)) {
    try {
      providers[key] = new ethers.JsonRpcProvider(chain.rpc);
      contracts[key] = {
        quoter: new ethers.Contract(chain.quoter, QUOTER_ABI, providers[key])
      };
      
      const balance = await providers[key].getBalance(WALLET_ADDRESS);
      const balanceEth = parseFloat(ethers.formatEther(balance));
      
      state.chains.push({
        chain: key,
        name: chain.name,
        chainId: chain.chainId,
        balance: balanceEth.toFixed(6),
        balanceUsd: balanceEth * CONFIG.ETH_PRICE_USD,
        isActive: true,
        explorer: chain.explorer,
        ethPrice: 0
      });
      
      state.banditStates.push({
        chain: key,
        alpha: 2,
        beta: 2,
        winRate: 50,
        selected: key === 'base'
      });
      
      console.log(`   ✅ ${chain.name}: ${balanceEth.toFixed(6)} ETH`);
    } catch (e) {
      console.error(`   ❌ ${chain.name}: ${e.message}`);
    }
  }
  console.log('');
}

// ═══════════════════════════════════════════════════════════════════════════════
// ANÁLISIS DETALLADO
// ═══════════════════════════════════════════════════════════════════════════════

async function analyzeChain(chainKey) {
  const chain = CHAINS[chainKey];
  const provider = providers[chainKey];
  const quoter = contracts[chainKey].quoter;
  
  console.log(`\n═══════════════════════════════════════════════════════════════════`);
  console.log(`📊 ANÁLISIS: ${chain.name}`);
  console.log(`═══════════════════════════════════════════════════════════════════`);
  
  try {
    // Obtener gas price
    const feeData = await provider.getFeeData();
    const gasPrice = feeData.gasPrice || ethers.parseUnits('0.001', 'gwei');
    const gasPriceGwei = parseFloat(ethers.formatUnits(gasPrice, 'gwei'));
    const gasCostWei = gasPrice * 250000n;
    
    console.log(`⛽ Gas Price: ${gasPriceGwei.toFixed(4)} gwei`);
    console.log(`⛽ Estimated Gas Cost: ${ethers.formatEther(gasCostWei)} ETH`);
    
    // Obtener precio ETH
    let ethPrice = CONFIG.ETH_PRICE_USD;
    try {
      const priceQuote = await quoter.quoteExactInputSingle.staticCall({
        tokenIn: chain.tokens.WETH,
        tokenOut: chain.tokens.USDC,
        amountIn: ethers.parseEther('1'),
        fee: 500,
        sqrtPriceLimitX96: 0n
      });
      ethPrice = parseFloat(ethers.formatUnits(priceQuote[0], 6));
      console.log(`💰 ETH Price on ${chain.name}: $${ethPrice.toFixed(2)}`);
    } catch (e) {
      console.log(`💰 ETH Price: Using default $${ethPrice}`);
    }
    
    const gasCostUsd = parseFloat(ethers.formatEther(gasCostWei)) * ethPrice;
    console.log(`⛽ Gas Cost in USD: $${gasCostUsd.toFixed(4)}`);
    
    // Actualizar estado
    const chainState = state.chains.find(c => c.chain === chainKey);
    if (chainState) chainState.ethPrice = ethPrice;
    
    console.log(`\n📈 QUOTES WETH → USDC → WETH:`);
    console.log(`─────────────────────────────────────────────────────────────────`);
    
    const results = [];
    
    for (const amountEth of CONFIG.TRADE_AMOUNTS_ETH) {
      const amountWei = ethers.parseEther(amountEth.toString());
      
      for (let i = 0; i < CONFIG.FEE_TIERS.length; i++) {
        for (let j = 0; j < CONFIG.FEE_TIERS.length; j++) {
          const fee1 = CONFIG.FEE_TIERS[i];
          const fee2 = CONFIG.FEE_TIERS[j];
          
          try {
            // WETH → USDC
            const quote1 = await quoter.quoteExactInputSingle.staticCall({
              tokenIn: chain.tokens.WETH,
              tokenOut: chain.tokens.USDC,
              amountIn: amountWei,
              fee: fee1,
              sqrtPriceLimitX96: 0n
            });
            const usdcOut = quote1[0];
            const usdcOutFormatted = parseFloat(ethers.formatUnits(usdcOut, 6));
            
            // USDC → WETH
            const quote2 = await quoter.quoteExactInputSingle.staticCall({
              tokenIn: chain.tokens.USDC,
              tokenOut: chain.tokens.WETH,
              amountIn: usdcOut,
              fee: fee2,
              sqrtPriceLimitX96: 0n
            });
            const wethOut = quote2[0];
            const wethOutFormatted = parseFloat(ethers.formatEther(wethOut));
            
            // Calcular profit/loss
            const grossProfit = wethOut - amountWei;
            const grossProfitEth = parseFloat(ethers.formatEther(grossProfit));
            const grossProfitUsd = grossProfitEth * ethPrice;
            
            const netProfit = grossProfit - gasCostWei;
            const netProfitEth = parseFloat(ethers.formatEther(netProfit));
            const netProfitUsd = netProfitEth * ethPrice;
            
            const spreadBps = (grossProfitEth / amountEth) * 10000;
            
            // Determinar estado
            let status = '❌ LOSS';
            let statusColor = '';
            if (grossProfitEth > 0) {
              state.stats.positiveSpreadCount++;
              if (netProfitUsd > 0) {
                status = '✅ PROFIT';
                state.stats.profitableCount++;
              } else {
                status = '⚠️ +spread -gas';
              }
            } else {
              state.stats.negativeSpreadCount++;
            }
            
            allSpreads.push(spreadBps);
            
            console.log(`\n   Route: ${amountEth} ETH → ${fee1/100}% → USDC → ${fee2/100}% → WETH`);
            console.log(`   ├─ USDC received: ${usdcOutFormatted.toFixed(2)} USDC`);
            console.log(`   ├─ WETH received: ${wethOutFormatted.toFixed(8)} ETH`);
            console.log(`   ├─ Gross P/L: ${grossProfitEth >= 0 ? '+' : ''}${grossProfitEth.toFixed(8)} ETH ($${grossProfitUsd.toFixed(4)})`);
            console.log(`   ├─ Net P/L: ${netProfitEth >= 0 ? '+' : ''}${netProfitEth.toFixed(8)} ETH ($${netProfitUsd.toFixed(4)})`);
            console.log(`   ├─ Spread: ${spreadBps.toFixed(2)} bps (${(spreadBps/100).toFixed(4)}%)`);
            console.log(`   └─ Status: ${status}`);
            
            results.push({
              chain: chainKey,
              chainName: chain.name,
              route: `${fee1/100}%→${fee2/100}%`,
              amountIn: amountEth,
              usdcOut: usdcOutFormatted,
              wethOut: wethOutFormatted,
              grossProfitEth,
              grossProfitUsd,
              netProfitEth,
              netProfitUsd,
              spreadBps,
              gasCostUsd,
              status,
              timestamp: Date.now()
            });
            
            if (netProfitUsd > 0) {
              state.stats.opportunitiesFound++;
              state.opportunities.unshift({
                ...results[results.length - 1],
                type: 'PROFITABLE'
              });
            }
            
          } catch (e) {
            console.log(`\n   Route: ${amountEth} ETH → ${fee1/100}% → USDC → ${fee2/100}% → WETH`);
            console.log(`   └─ ❌ Pool no existe o error: ${e.message.slice(0, 50)}`);
          }
        }
      }
    }
    
    // Estadísticas
    if (allSpreads.length > 0) {
      state.stats.avgSpreadBps = allSpreads.reduce((a, b) => a + b, 0) / allSpreads.length;
      state.stats.bestSpreadBps = Math.max(...allSpreads);
      state.stats.worstSpreadBps = Math.min(...allSpreads);
    }
    
    // Guardar para UI
    state.allQuotes = results;
    if (state.opportunities.length > 20) {
      state.opportunities = state.opportunities.slice(0, 20);
    }
    
    return results;
    
  } catch (e) {
    console.error(`❌ Error: ${e.message}`);
    return [];
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// LOOP
// ═══════════════════════════════════════════════════════════════════════════════

async function tick() {
  if (!state.isRunning) return;
  
  state.stats.totalScans++;
  state.stats.uptime = Math.floor((Date.now() - state.startTime) / 1000);
  
  const chainKeys = Object.keys(CHAINS);
  const selectedChain = chainKeys[currentChainIndex % chainKeys.length];
  currentChainIndex++;
  
  state.stats.currentChain = selectedChain;
  state.banditStates.forEach(b => b.selected = b.chain === selectedChain);
  
  await analyzeChain(selectedChain);
  
  // Resumen
  console.log(`\n═══════════════════════════════════════════════════════════════════`);
  console.log(`📊 RESUMEN SCAN #${state.stats.totalScans}`);
  console.log(`═══════════════════════════════════════════════════════════════════`);
  console.log(`   Spreads Positivos: ${state.stats.positiveSpreadCount}`);
  console.log(`   Spreads Negativos: ${state.stats.negativeSpreadCount}`);
  console.log(`   Oportunidades Rentables: ${state.stats.profitableCount}`);
  console.log(`   Spread Promedio: ${state.stats.avgSpreadBps.toFixed(2)} bps`);
  console.log(`   Mejor Spread: ${state.stats.bestSpreadBps.toFixed(2)} bps`);
  console.log(`   Peor Spread: ${state.stats.worstSpreadBps.toFixed(2)} bps`);
  console.log(`═══════════════════════════════════════════════════════════════════\n`);
}

// ═══════════════════════════════════════════════════════════════════════════════
// API
// ═══════════════════════════════════════════════════════════════════════════════

app.get('/api/defi/multichain-arb/status', (req, res) => {
  res.json(state);
});

app.post('/api/defi/multichain-arb/start', async (req, res) => {
  if (state.isRunning) {
    return res.json({ success: false, error: 'Ya corriendo', isRunning: true });
  }
  
  state.isDryRun = true; // Siempre dry run en modo verbose
  state.isRunning = true;
  state.startTime = Date.now();
  
  state.stats = {
    totalScans: 0, opportunitiesFound: 0, positiveSpreadCount: 0,
    negativeSpreadCount: 0, profitableCount: 0, avgSpreadBps: 0,
    bestSpreadBps: 0, worstSpreadBps: 0, uptime: 0, currentChain: 'base'
  };
  state.opportunities = [];
  state.allQuotes = [];
  allSpreads = [];
  currentChainIndex = 0;
  
  if (timer) clearInterval(timer);
  timer = setInterval(tick, CONFIG.SCAN_INTERVAL_MS);
  
  // Ejecutar primer tick inmediatamente
  tick();
  
  console.log(`\n[START] 🔍 MODO VERBOSE - Analizando mercado...\n`);
  
  res.json({
    success: true,
    isRunning: true,
    isDryRun: true,
    mode: 'SCALPER_VERBOSE',
    config: CONFIG
  });
});

app.post('/api/defi/multichain-arb/stop', (req, res) => {
  state.isRunning = false;
  if (timer) { clearInterval(timer); timer = null; }
  console.log('[STOP] Análisis detenido');
  res.json({ success: true, isRunning: false });
});

app.get('/api/defi/multichain-arb/health', (req, res) => {
  res.json({
    status: 'ok',
    mode: 'SCALPER_VERBOSE',
    port: PORT,
    running: state.isRunning,
    wallet: WALLET_ADDRESS
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// INICIAR
// ═══════════════════════════════════════════════════════════════════════════════

app.listen(PORT, async () => {
  console.log(`
╔═══════════════════════════════════════════════════════════════════════════════╗
║                                                                               ║
║   🔍 SCALPER VERBOSE - ANÁLISIS DE MERCADO                                    ║
║                                                                               ║
║   Este modo muestra TODAS las oportunidades analizadas,                       ║
║   incluyendo las no rentables, para entender el mercado.                      ║
║                                                                               ║
║   ✅ Puerto: ${PORT}                                                           ║
║   ✅ Wallet: ${WALLET_ADDRESS.slice(0, 10)}...${WALLET_ADDRESS.slice(-5)}                                  ║
║                                                                               ║
╚═══════════════════════════════════════════════════════════════════════════════╝
  `);
  
  await init();
  console.log('[READY] 🔍 POST /api/defi/multichain-arb/start para iniciar análisis.\n');
});

process.on('SIGINT', () => {
  if (timer) clearInterval(timer);
  process.exit(0);
});



 * ═══════════════════════════════════════════════════════════════════════════════
 * 🔍 SCALPER VERBOSE - MUESTRA TODAS LAS OPORTUNIDADES
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * Esta versión muestra TODAS las oportunidades analizadas, incluyendo:
 * - Spreads negativos (pérdida)
 * - Spreads positivos pero no rentables después de gas
 * - Oportunidades rentables
 * 
 * Útil para entender el mercado y calibrar parámetros.
 */

import express from 'express';
import cors from 'cors';
import { ethers } from 'ethers';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '../.env') });

const app = express();
const PORT = 3101;

app.use(cors());
app.use(express.json());

// ═══════════════════════════════════════════════════════════════════════════════
// CONFIGURACIÓN
// ═══════════════════════════════════════════════════════════════════════════════

const CONFIG = {
  SCAN_INTERVAL_MS: 2000,          // Más lento para ver mejor los logs
  MIN_PROFIT_USD: -10,             // Mostrar incluso pérdidas
  SHOW_ALL_QUOTES: true,           // Mostrar todos los quotes
  TRADE_AMOUNTS_ETH: [0.01],       // Solo un amount para simplificar
  FEE_TIERS: [500, 3000],          // 0.05% y 0.3%
  AUTO_EXECUTE: false,             // NO ejecutar automáticamente
  ETH_PRICE_USD: 3500
};

const PRIVATE_KEY = process.env.VITE_ETH_PRIVATE_KEY;
const WALLET_ADDRESS = process.env.VITE_ETH_WALLET_ADDRESS;

if (!PRIVATE_KEY || !WALLET_ADDRESS) {
  console.error('❌ ERROR: Credenciales no configuradas');
  process.exit(1);
}

// ═══════════════════════════════════════════════════════════════════════════════
// CHAINS
// ═══════════════════════════════════════════════════════════════════════════════

const CHAINS = {
  base: {
    name: 'Base',
    chainId: 8453,
    rpc: 'https://base-mainnet.g.alchemy.com/v2/mm-9UjI5oG51l94mRH3fh',
    explorer: 'https://basescan.org',
    tokens: {
      WETH: '0x4200000000000000000000000000000000000006',
      USDC: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913'
    },
    quoter: '0x3d4e44Eb1374240CE5F1B871ab261CD16335B76a',
    router: '0x2626664c2603336E57B271c5C0b26F421741e481'
  },
  arbitrum: {
    name: 'Arbitrum',
    chainId: 42161,
    rpc: 'https://arb1.arbitrum.io/rpc',
    explorer: 'https://arbiscan.io',
    tokens: {
      WETH: '0x82aF49447D8a07e3bd95BD0d56f35241523fBab1',
      USDC: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831'
    },
    quoter: '0x61fFE014bA17989E743c5F6cB21bF9697530B21e',
    router: '0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45'
  }
};

// ABIs
const QUOTER_ABI = [
  'function quoteExactInputSingle((address tokenIn, address tokenOut, uint256 amountIn, uint24 fee, uint160 sqrtPriceLimitX96)) external returns (uint256 amountOut, uint160 sqrtPriceX96After, uint32 initializedTicksCrossed, uint256 gasEstimate)'
];

// ═══════════════════════════════════════════════════════════════════════════════
// ESTADO
// ═══════════════════════════════════════════════════════════════════════════════

let state = {
  isRunning: false,
  isDryRun: true,
  startTime: null,
  mode: 'SCALPER_VERBOSE',
  stats: {
    totalScans: 0,
    opportunitiesFound: 0,
    positiveSpreadCount: 0,
    negativeSpreadCount: 0,
    profitableCount: 0,
    avgSpreadBps: 0,
    bestSpreadBps: 0,
    worstSpreadBps: 0,
    uptime: 0,
    currentChain: 'base'
  },
  chains: [],
  tradeLogs: [],
  opportunities: [],
  banditStates: [],
  allQuotes: []  // Guardar todos los quotes para análisis
};

let timer = null;
let providers = {};
let contracts = {};
let currentChainIndex = 0;
let allSpreads = [];

// ═══════════════════════════════════════════════════════════════════════════════
// INICIALIZAR
// ═══════════════════════════════════════════════════════════════════════════════

async function init() {
  console.log('[INIT] 🔌 Conectando...\n');
  
  for (const [key, chain] of Object.entries(CHAINS)) {
    try {
      providers[key] = new ethers.JsonRpcProvider(chain.rpc);
      contracts[key] = {
        quoter: new ethers.Contract(chain.quoter, QUOTER_ABI, providers[key])
      };
      
      const balance = await providers[key].getBalance(WALLET_ADDRESS);
      const balanceEth = parseFloat(ethers.formatEther(balance));
      
      state.chains.push({
        chain: key,
        name: chain.name,
        chainId: chain.chainId,
        balance: balanceEth.toFixed(6),
        balanceUsd: balanceEth * CONFIG.ETH_PRICE_USD,
        isActive: true,
        explorer: chain.explorer,
        ethPrice: 0
      });
      
      state.banditStates.push({
        chain: key,
        alpha: 2,
        beta: 2,
        winRate: 50,
        selected: key === 'base'
      });
      
      console.log(`   ✅ ${chain.name}: ${balanceEth.toFixed(6)} ETH`);
    } catch (e) {
      console.error(`   ❌ ${chain.name}: ${e.message}`);
    }
  }
  console.log('');
}

// ═══════════════════════════════════════════════════════════════════════════════
// ANÁLISIS DETALLADO
// ═══════════════════════════════════════════════════════════════════════════════

async function analyzeChain(chainKey) {
  const chain = CHAINS[chainKey];
  const provider = providers[chainKey];
  const quoter = contracts[chainKey].quoter;
  
  console.log(`\n═══════════════════════════════════════════════════════════════════`);
  console.log(`📊 ANÁLISIS: ${chain.name}`);
  console.log(`═══════════════════════════════════════════════════════════════════`);
  
  try {
    // Obtener gas price
    const feeData = await provider.getFeeData();
    const gasPrice = feeData.gasPrice || ethers.parseUnits('0.001', 'gwei');
    const gasPriceGwei = parseFloat(ethers.formatUnits(gasPrice, 'gwei'));
    const gasCostWei = gasPrice * 250000n;
    
    console.log(`⛽ Gas Price: ${gasPriceGwei.toFixed(4)} gwei`);
    console.log(`⛽ Estimated Gas Cost: ${ethers.formatEther(gasCostWei)} ETH`);
    
    // Obtener precio ETH
    let ethPrice = CONFIG.ETH_PRICE_USD;
    try {
      const priceQuote = await quoter.quoteExactInputSingle.staticCall({
        tokenIn: chain.tokens.WETH,
        tokenOut: chain.tokens.USDC,
        amountIn: ethers.parseEther('1'),
        fee: 500,
        sqrtPriceLimitX96: 0n
      });
      ethPrice = parseFloat(ethers.formatUnits(priceQuote[0], 6));
      console.log(`💰 ETH Price on ${chain.name}: $${ethPrice.toFixed(2)}`);
    } catch (e) {
      console.log(`💰 ETH Price: Using default $${ethPrice}`);
    }
    
    const gasCostUsd = parseFloat(ethers.formatEther(gasCostWei)) * ethPrice;
    console.log(`⛽ Gas Cost in USD: $${gasCostUsd.toFixed(4)}`);
    
    // Actualizar estado
    const chainState = state.chains.find(c => c.chain === chainKey);
    if (chainState) chainState.ethPrice = ethPrice;
    
    console.log(`\n📈 QUOTES WETH → USDC → WETH:`);
    console.log(`─────────────────────────────────────────────────────────────────`);
    
    const results = [];
    
    for (const amountEth of CONFIG.TRADE_AMOUNTS_ETH) {
      const amountWei = ethers.parseEther(amountEth.toString());
      
      for (let i = 0; i < CONFIG.FEE_TIERS.length; i++) {
        for (let j = 0; j < CONFIG.FEE_TIERS.length; j++) {
          const fee1 = CONFIG.FEE_TIERS[i];
          const fee2 = CONFIG.FEE_TIERS[j];
          
          try {
            // WETH → USDC
            const quote1 = await quoter.quoteExactInputSingle.staticCall({
              tokenIn: chain.tokens.WETH,
              tokenOut: chain.tokens.USDC,
              amountIn: amountWei,
              fee: fee1,
              sqrtPriceLimitX96: 0n
            });
            const usdcOut = quote1[0];
            const usdcOutFormatted = parseFloat(ethers.formatUnits(usdcOut, 6));
            
            // USDC → WETH
            const quote2 = await quoter.quoteExactInputSingle.staticCall({
              tokenIn: chain.tokens.USDC,
              tokenOut: chain.tokens.WETH,
              amountIn: usdcOut,
              fee: fee2,
              sqrtPriceLimitX96: 0n
            });
            const wethOut = quote2[0];
            const wethOutFormatted = parseFloat(ethers.formatEther(wethOut));
            
            // Calcular profit/loss
            const grossProfit = wethOut - amountWei;
            const grossProfitEth = parseFloat(ethers.formatEther(grossProfit));
            const grossProfitUsd = grossProfitEth * ethPrice;
            
            const netProfit = grossProfit - gasCostWei;
            const netProfitEth = parseFloat(ethers.formatEther(netProfit));
            const netProfitUsd = netProfitEth * ethPrice;
            
            const spreadBps = (grossProfitEth / amountEth) * 10000;
            
            // Determinar estado
            let status = '❌ LOSS';
            let statusColor = '';
            if (grossProfitEth > 0) {
              state.stats.positiveSpreadCount++;
              if (netProfitUsd > 0) {
                status = '✅ PROFIT';
                state.stats.profitableCount++;
              } else {
                status = '⚠️ +spread -gas';
              }
            } else {
              state.stats.negativeSpreadCount++;
            }
            
            allSpreads.push(spreadBps);
            
            console.log(`\n   Route: ${amountEth} ETH → ${fee1/100}% → USDC → ${fee2/100}% → WETH`);
            console.log(`   ├─ USDC received: ${usdcOutFormatted.toFixed(2)} USDC`);
            console.log(`   ├─ WETH received: ${wethOutFormatted.toFixed(8)} ETH`);
            console.log(`   ├─ Gross P/L: ${grossProfitEth >= 0 ? '+' : ''}${grossProfitEth.toFixed(8)} ETH ($${grossProfitUsd.toFixed(4)})`);
            console.log(`   ├─ Net P/L: ${netProfitEth >= 0 ? '+' : ''}${netProfitEth.toFixed(8)} ETH ($${netProfitUsd.toFixed(4)})`);
            console.log(`   ├─ Spread: ${spreadBps.toFixed(2)} bps (${(spreadBps/100).toFixed(4)}%)`);
            console.log(`   └─ Status: ${status}`);
            
            results.push({
              chain: chainKey,
              chainName: chain.name,
              route: `${fee1/100}%→${fee2/100}%`,
              amountIn: amountEth,
              usdcOut: usdcOutFormatted,
              wethOut: wethOutFormatted,
              grossProfitEth,
              grossProfitUsd,
              netProfitEth,
              netProfitUsd,
              spreadBps,
              gasCostUsd,
              status,
              timestamp: Date.now()
            });
            
            if (netProfitUsd > 0) {
              state.stats.opportunitiesFound++;
              state.opportunities.unshift({
                ...results[results.length - 1],
                type: 'PROFITABLE'
              });
            }
            
          } catch (e) {
            console.log(`\n   Route: ${amountEth} ETH → ${fee1/100}% → USDC → ${fee2/100}% → WETH`);
            console.log(`   └─ ❌ Pool no existe o error: ${e.message.slice(0, 50)}`);
          }
        }
      }
    }
    
    // Estadísticas
    if (allSpreads.length > 0) {
      state.stats.avgSpreadBps = allSpreads.reduce((a, b) => a + b, 0) / allSpreads.length;
      state.stats.bestSpreadBps = Math.max(...allSpreads);
      state.stats.worstSpreadBps = Math.min(...allSpreads);
    }
    
    // Guardar para UI
    state.allQuotes = results;
    if (state.opportunities.length > 20) {
      state.opportunities = state.opportunities.slice(0, 20);
    }
    
    return results;
    
  } catch (e) {
    console.error(`❌ Error: ${e.message}`);
    return [];
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// LOOP
// ═══════════════════════════════════════════════════════════════════════════════

async function tick() {
  if (!state.isRunning) return;
  
  state.stats.totalScans++;
  state.stats.uptime = Math.floor((Date.now() - state.startTime) / 1000);
  
  const chainKeys = Object.keys(CHAINS);
  const selectedChain = chainKeys[currentChainIndex % chainKeys.length];
  currentChainIndex++;
  
  state.stats.currentChain = selectedChain;
  state.banditStates.forEach(b => b.selected = b.chain === selectedChain);
  
  await analyzeChain(selectedChain);
  
  // Resumen
  console.log(`\n═══════════════════════════════════════════════════════════════════`);
  console.log(`📊 RESUMEN SCAN #${state.stats.totalScans}`);
  console.log(`═══════════════════════════════════════════════════════════════════`);
  console.log(`   Spreads Positivos: ${state.stats.positiveSpreadCount}`);
  console.log(`   Spreads Negativos: ${state.stats.negativeSpreadCount}`);
  console.log(`   Oportunidades Rentables: ${state.stats.profitableCount}`);
  console.log(`   Spread Promedio: ${state.stats.avgSpreadBps.toFixed(2)} bps`);
  console.log(`   Mejor Spread: ${state.stats.bestSpreadBps.toFixed(2)} bps`);
  console.log(`   Peor Spread: ${state.stats.worstSpreadBps.toFixed(2)} bps`);
  console.log(`═══════════════════════════════════════════════════════════════════\n`);
}

// ═══════════════════════════════════════════════════════════════════════════════
// API
// ═══════════════════════════════════════════════════════════════════════════════

app.get('/api/defi/multichain-arb/status', (req, res) => {
  res.json(state);
});

app.post('/api/defi/multichain-arb/start', async (req, res) => {
  if (state.isRunning) {
    return res.json({ success: false, error: 'Ya corriendo', isRunning: true });
  }
  
  state.isDryRun = true; // Siempre dry run en modo verbose
  state.isRunning = true;
  state.startTime = Date.now();
  
  state.stats = {
    totalScans: 0, opportunitiesFound: 0, positiveSpreadCount: 0,
    negativeSpreadCount: 0, profitableCount: 0, avgSpreadBps: 0,
    bestSpreadBps: 0, worstSpreadBps: 0, uptime: 0, currentChain: 'base'
  };
  state.opportunities = [];
  state.allQuotes = [];
  allSpreads = [];
  currentChainIndex = 0;
  
  if (timer) clearInterval(timer);
  timer = setInterval(tick, CONFIG.SCAN_INTERVAL_MS);
  
  // Ejecutar primer tick inmediatamente
  tick();
  
  console.log(`\n[START] 🔍 MODO VERBOSE - Analizando mercado...\n`);
  
  res.json({
    success: true,
    isRunning: true,
    isDryRun: true,
    mode: 'SCALPER_VERBOSE',
    config: CONFIG
  });
});

app.post('/api/defi/multichain-arb/stop', (req, res) => {
  state.isRunning = false;
  if (timer) { clearInterval(timer); timer = null; }
  console.log('[STOP] Análisis detenido');
  res.json({ success: true, isRunning: false });
});

app.get('/api/defi/multichain-arb/health', (req, res) => {
  res.json({
    status: 'ok',
    mode: 'SCALPER_VERBOSE',
    port: PORT,
    running: state.isRunning,
    wallet: WALLET_ADDRESS
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// INICIAR
// ═══════════════════════════════════════════════════════════════════════════════

app.listen(PORT, async () => {
  console.log(`
╔═══════════════════════════════════════════════════════════════════════════════╗
║                                                                               ║
║   🔍 SCALPER VERBOSE - ANÁLISIS DE MERCADO                                    ║
║                                                                               ║
║   Este modo muestra TODAS las oportunidades analizadas,                       ║
║   incluyendo las no rentables, para entender el mercado.                      ║
║                                                                               ║
║   ✅ Puerto: ${PORT}                                                           ║
║   ✅ Wallet: ${WALLET_ADDRESS.slice(0, 10)}...${WALLET_ADDRESS.slice(-5)}                                  ║
║                                                                               ║
╚═══════════════════════════════════════════════════════════════════════════════╝
  `);
  
  await init();
  console.log('[READY] 🔍 POST /api/defi/multichain-arb/start para iniciar análisis.\n');
});

process.on('SIGINT', () => {
  if (timer) clearInterval(timer);
  process.exit(0);
});


 * ═══════════════════════════════════════════════════════════════════════════════
 * 🔍 SCALPER VERBOSE - MUESTRA TODAS LAS OPORTUNIDADES
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * Esta versión muestra TODAS las oportunidades analizadas, incluyendo:
 * - Spreads negativos (pérdida)
 * - Spreads positivos pero no rentables después de gas
 * - Oportunidades rentables
 * 
 * Útil para entender el mercado y calibrar parámetros.
 */

import express from 'express';
import cors from 'cors';
import { ethers } from 'ethers';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '../.env') });

const app = express();
const PORT = 3101;

app.use(cors());
app.use(express.json());

// ═══════════════════════════════════════════════════════════════════════════════
// CONFIGURACIÓN
// ═══════════════════════════════════════════════════════════════════════════════

const CONFIG = {
  SCAN_INTERVAL_MS: 2000,          // Más lento para ver mejor los logs
  MIN_PROFIT_USD: -10,             // Mostrar incluso pérdidas
  SHOW_ALL_QUOTES: true,           // Mostrar todos los quotes
  TRADE_AMOUNTS_ETH: [0.01],       // Solo un amount para simplificar
  FEE_TIERS: [500, 3000],          // 0.05% y 0.3%
  AUTO_EXECUTE: false,             // NO ejecutar automáticamente
  ETH_PRICE_USD: 3500
};

const PRIVATE_KEY = process.env.VITE_ETH_PRIVATE_KEY;
const WALLET_ADDRESS = process.env.VITE_ETH_WALLET_ADDRESS;

if (!PRIVATE_KEY || !WALLET_ADDRESS) {
  console.error('❌ ERROR: Credenciales no configuradas');
  process.exit(1);
}

// ═══════════════════════════════════════════════════════════════════════════════
// CHAINS
// ═══════════════════════════════════════════════════════════════════════════════

const CHAINS = {
  base: {
    name: 'Base',
    chainId: 8453,
    rpc: 'https://base-mainnet.g.alchemy.com/v2/mm-9UjI5oG51l94mRH3fh',
    explorer: 'https://basescan.org',
    tokens: {
      WETH: '0x4200000000000000000000000000000000000006',
      USDC: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913'
    },
    quoter: '0x3d4e44Eb1374240CE5F1B871ab261CD16335B76a',
    router: '0x2626664c2603336E57B271c5C0b26F421741e481'
  },
  arbitrum: {
    name: 'Arbitrum',
    chainId: 42161,
    rpc: 'https://arb1.arbitrum.io/rpc',
    explorer: 'https://arbiscan.io',
    tokens: {
      WETH: '0x82aF49447D8a07e3bd95BD0d56f35241523fBab1',
      USDC: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831'
    },
    quoter: '0x61fFE014bA17989E743c5F6cB21bF9697530B21e',
    router: '0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45'
  }
};

// ABIs
const QUOTER_ABI = [
  'function quoteExactInputSingle((address tokenIn, address tokenOut, uint256 amountIn, uint24 fee, uint160 sqrtPriceLimitX96)) external returns (uint256 amountOut, uint160 sqrtPriceX96After, uint32 initializedTicksCrossed, uint256 gasEstimate)'
];

// ═══════════════════════════════════════════════════════════════════════════════
// ESTADO
// ═══════════════════════════════════════════════════════════════════════════════

let state = {
  isRunning: false,
  isDryRun: true,
  startTime: null,
  mode: 'SCALPER_VERBOSE',
  stats: {
    totalScans: 0,
    opportunitiesFound: 0,
    positiveSpreadCount: 0,
    negativeSpreadCount: 0,
    profitableCount: 0,
    avgSpreadBps: 0,
    bestSpreadBps: 0,
    worstSpreadBps: 0,
    uptime: 0,
    currentChain: 'base'
  },
  chains: [],
  tradeLogs: [],
  opportunities: [],
  banditStates: [],
  allQuotes: []  // Guardar todos los quotes para análisis
};

let timer = null;
let providers = {};
let contracts = {};
let currentChainIndex = 0;
let allSpreads = [];

// ═══════════════════════════════════════════════════════════════════════════════
// INICIALIZAR
// ═══════════════════════════════════════════════════════════════════════════════

async function init() {
  console.log('[INIT] 🔌 Conectando...\n');
  
  for (const [key, chain] of Object.entries(CHAINS)) {
    try {
      providers[key] = new ethers.JsonRpcProvider(chain.rpc);
      contracts[key] = {
        quoter: new ethers.Contract(chain.quoter, QUOTER_ABI, providers[key])
      };
      
      const balance = await providers[key].getBalance(WALLET_ADDRESS);
      const balanceEth = parseFloat(ethers.formatEther(balance));
      
      state.chains.push({
        chain: key,
        name: chain.name,
        chainId: chain.chainId,
        balance: balanceEth.toFixed(6),
        balanceUsd: balanceEth * CONFIG.ETH_PRICE_USD,
        isActive: true,
        explorer: chain.explorer,
        ethPrice: 0
      });
      
      state.banditStates.push({
        chain: key,
        alpha: 2,
        beta: 2,
        winRate: 50,
        selected: key === 'base'
      });
      
      console.log(`   ✅ ${chain.name}: ${balanceEth.toFixed(6)} ETH`);
    } catch (e) {
      console.error(`   ❌ ${chain.name}: ${e.message}`);
    }
  }
  console.log('');
}

// ═══════════════════════════════════════════════════════════════════════════════
// ANÁLISIS DETALLADO
// ═══════════════════════════════════════════════════════════════════════════════

async function analyzeChain(chainKey) {
  const chain = CHAINS[chainKey];
  const provider = providers[chainKey];
  const quoter = contracts[chainKey].quoter;
  
  console.log(`\n═══════════════════════════════════════════════════════════════════`);
  console.log(`📊 ANÁLISIS: ${chain.name}`);
  console.log(`═══════════════════════════════════════════════════════════════════`);
  
  try {
    // Obtener gas price
    const feeData = await provider.getFeeData();
    const gasPrice = feeData.gasPrice || ethers.parseUnits('0.001', 'gwei');
    const gasPriceGwei = parseFloat(ethers.formatUnits(gasPrice, 'gwei'));
    const gasCostWei = gasPrice * 250000n;
    
    console.log(`⛽ Gas Price: ${gasPriceGwei.toFixed(4)} gwei`);
    console.log(`⛽ Estimated Gas Cost: ${ethers.formatEther(gasCostWei)} ETH`);
    
    // Obtener precio ETH
    let ethPrice = CONFIG.ETH_PRICE_USD;
    try {
      const priceQuote = await quoter.quoteExactInputSingle.staticCall({
        tokenIn: chain.tokens.WETH,
        tokenOut: chain.tokens.USDC,
        amountIn: ethers.parseEther('1'),
        fee: 500,
        sqrtPriceLimitX96: 0n
      });
      ethPrice = parseFloat(ethers.formatUnits(priceQuote[0], 6));
      console.log(`💰 ETH Price on ${chain.name}: $${ethPrice.toFixed(2)}`);
    } catch (e) {
      console.log(`💰 ETH Price: Using default $${ethPrice}`);
    }
    
    const gasCostUsd = parseFloat(ethers.formatEther(gasCostWei)) * ethPrice;
    console.log(`⛽ Gas Cost in USD: $${gasCostUsd.toFixed(4)}`);
    
    // Actualizar estado
    const chainState = state.chains.find(c => c.chain === chainKey);
    if (chainState) chainState.ethPrice = ethPrice;
    
    console.log(`\n📈 QUOTES WETH → USDC → WETH:`);
    console.log(`─────────────────────────────────────────────────────────────────`);
    
    const results = [];
    
    for (const amountEth of CONFIG.TRADE_AMOUNTS_ETH) {
      const amountWei = ethers.parseEther(amountEth.toString());
      
      for (let i = 0; i < CONFIG.FEE_TIERS.length; i++) {
        for (let j = 0; j < CONFIG.FEE_TIERS.length; j++) {
          const fee1 = CONFIG.FEE_TIERS[i];
          const fee2 = CONFIG.FEE_TIERS[j];
          
          try {
            // WETH → USDC
            const quote1 = await quoter.quoteExactInputSingle.staticCall({
              tokenIn: chain.tokens.WETH,
              tokenOut: chain.tokens.USDC,
              amountIn: amountWei,
              fee: fee1,
              sqrtPriceLimitX96: 0n
            });
            const usdcOut = quote1[0];
            const usdcOutFormatted = parseFloat(ethers.formatUnits(usdcOut, 6));
            
            // USDC → WETH
            const quote2 = await quoter.quoteExactInputSingle.staticCall({
              tokenIn: chain.tokens.USDC,
              tokenOut: chain.tokens.WETH,
              amountIn: usdcOut,
              fee: fee2,
              sqrtPriceLimitX96: 0n
            });
            const wethOut = quote2[0];
            const wethOutFormatted = parseFloat(ethers.formatEther(wethOut));
            
            // Calcular profit/loss
            const grossProfit = wethOut - amountWei;
            const grossProfitEth = parseFloat(ethers.formatEther(grossProfit));
            const grossProfitUsd = grossProfitEth * ethPrice;
            
            const netProfit = grossProfit - gasCostWei;
            const netProfitEth = parseFloat(ethers.formatEther(netProfit));
            const netProfitUsd = netProfitEth * ethPrice;
            
            const spreadBps = (grossProfitEth / amountEth) * 10000;
            
            // Determinar estado
            let status = '❌ LOSS';
            let statusColor = '';
            if (grossProfitEth > 0) {
              state.stats.positiveSpreadCount++;
              if (netProfitUsd > 0) {
                status = '✅ PROFIT';
                state.stats.profitableCount++;
              } else {
                status = '⚠️ +spread -gas';
              }
            } else {
              state.stats.negativeSpreadCount++;
            }
            
            allSpreads.push(spreadBps);
            
            console.log(`\n   Route: ${amountEth} ETH → ${fee1/100}% → USDC → ${fee2/100}% → WETH`);
            console.log(`   ├─ USDC received: ${usdcOutFormatted.toFixed(2)} USDC`);
            console.log(`   ├─ WETH received: ${wethOutFormatted.toFixed(8)} ETH`);
            console.log(`   ├─ Gross P/L: ${grossProfitEth >= 0 ? '+' : ''}${grossProfitEth.toFixed(8)} ETH ($${grossProfitUsd.toFixed(4)})`);
            console.log(`   ├─ Net P/L: ${netProfitEth >= 0 ? '+' : ''}${netProfitEth.toFixed(8)} ETH ($${netProfitUsd.toFixed(4)})`);
            console.log(`   ├─ Spread: ${spreadBps.toFixed(2)} bps (${(spreadBps/100).toFixed(4)}%)`);
            console.log(`   └─ Status: ${status}`);
            
            results.push({
              chain: chainKey,
              chainName: chain.name,
              route: `${fee1/100}%→${fee2/100}%`,
              amountIn: amountEth,
              usdcOut: usdcOutFormatted,
              wethOut: wethOutFormatted,
              grossProfitEth,
              grossProfitUsd,
              netProfitEth,
              netProfitUsd,
              spreadBps,
              gasCostUsd,
              status,
              timestamp: Date.now()
            });
            
            if (netProfitUsd > 0) {
              state.stats.opportunitiesFound++;
              state.opportunities.unshift({
                ...results[results.length - 1],
                type: 'PROFITABLE'
              });
            }
            
          } catch (e) {
            console.log(`\n   Route: ${amountEth} ETH → ${fee1/100}% → USDC → ${fee2/100}% → WETH`);
            console.log(`   └─ ❌ Pool no existe o error: ${e.message.slice(0, 50)}`);
          }
        }
      }
    }
    
    // Estadísticas
    if (allSpreads.length > 0) {
      state.stats.avgSpreadBps = allSpreads.reduce((a, b) => a + b, 0) / allSpreads.length;
      state.stats.bestSpreadBps = Math.max(...allSpreads);
      state.stats.worstSpreadBps = Math.min(...allSpreads);
    }
    
    // Guardar para UI
    state.allQuotes = results;
    if (state.opportunities.length > 20) {
      state.opportunities = state.opportunities.slice(0, 20);
    }
    
    return results;
    
  } catch (e) {
    console.error(`❌ Error: ${e.message}`);
    return [];
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// LOOP
// ═══════════════════════════════════════════════════════════════════════════════

async function tick() {
  if (!state.isRunning) return;
  
  state.stats.totalScans++;
  state.stats.uptime = Math.floor((Date.now() - state.startTime) / 1000);
  
  const chainKeys = Object.keys(CHAINS);
  const selectedChain = chainKeys[currentChainIndex % chainKeys.length];
  currentChainIndex++;
  
  state.stats.currentChain = selectedChain;
  state.banditStates.forEach(b => b.selected = b.chain === selectedChain);
  
  await analyzeChain(selectedChain);
  
  // Resumen
  console.log(`\n═══════════════════════════════════════════════════════════════════`);
  console.log(`📊 RESUMEN SCAN #${state.stats.totalScans}`);
  console.log(`═══════════════════════════════════════════════════════════════════`);
  console.log(`   Spreads Positivos: ${state.stats.positiveSpreadCount}`);
  console.log(`   Spreads Negativos: ${state.stats.negativeSpreadCount}`);
  console.log(`   Oportunidades Rentables: ${state.stats.profitableCount}`);
  console.log(`   Spread Promedio: ${state.stats.avgSpreadBps.toFixed(2)} bps`);
  console.log(`   Mejor Spread: ${state.stats.bestSpreadBps.toFixed(2)} bps`);
  console.log(`   Peor Spread: ${state.stats.worstSpreadBps.toFixed(2)} bps`);
  console.log(`═══════════════════════════════════════════════════════════════════\n`);
}

// ═══════════════════════════════════════════════════════════════════════════════
// API
// ═══════════════════════════════════════════════════════════════════════════════

app.get('/api/defi/multichain-arb/status', (req, res) => {
  res.json(state);
});

app.post('/api/defi/multichain-arb/start', async (req, res) => {
  if (state.isRunning) {
    return res.json({ success: false, error: 'Ya corriendo', isRunning: true });
  }
  
  state.isDryRun = true; // Siempre dry run en modo verbose
  state.isRunning = true;
  state.startTime = Date.now();
  
  state.stats = {
    totalScans: 0, opportunitiesFound: 0, positiveSpreadCount: 0,
    negativeSpreadCount: 0, profitableCount: 0, avgSpreadBps: 0,
    bestSpreadBps: 0, worstSpreadBps: 0, uptime: 0, currentChain: 'base'
  };
  state.opportunities = [];
  state.allQuotes = [];
  allSpreads = [];
  currentChainIndex = 0;
  
  if (timer) clearInterval(timer);
  timer = setInterval(tick, CONFIG.SCAN_INTERVAL_MS);
  
  // Ejecutar primer tick inmediatamente
  tick();
  
  console.log(`\n[START] 🔍 MODO VERBOSE - Analizando mercado...\n`);
  
  res.json({
    success: true,
    isRunning: true,
    isDryRun: true,
    mode: 'SCALPER_VERBOSE',
    config: CONFIG
  });
});

app.post('/api/defi/multichain-arb/stop', (req, res) => {
  state.isRunning = false;
  if (timer) { clearInterval(timer); timer = null; }
  console.log('[STOP] Análisis detenido');
  res.json({ success: true, isRunning: false });
});

app.get('/api/defi/multichain-arb/health', (req, res) => {
  res.json({
    status: 'ok',
    mode: 'SCALPER_VERBOSE',
    port: PORT,
    running: state.isRunning,
    wallet: WALLET_ADDRESS
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// INICIAR
// ═══════════════════════════════════════════════════════════════════════════════

app.listen(PORT, async () => {
  console.log(`
╔═══════════════════════════════════════════════════════════════════════════════╗
║                                                                               ║
║   🔍 SCALPER VERBOSE - ANÁLISIS DE MERCADO                                    ║
║                                                                               ║
║   Este modo muestra TODAS las oportunidades analizadas,                       ║
║   incluyendo las no rentables, para entender el mercado.                      ║
║                                                                               ║
║   ✅ Puerto: ${PORT}                                                           ║
║   ✅ Wallet: ${WALLET_ADDRESS.slice(0, 10)}...${WALLET_ADDRESS.slice(-5)}                                  ║
║                                                                               ║
╚═══════════════════════════════════════════════════════════════════════════════╝
  `);
  
  await init();
  console.log('[READY] 🔍 POST /api/defi/multichain-arb/start para iniciar análisis.\n');
});

process.on('SIGINT', () => {
  if (timer) clearInterval(timer);
  process.exit(0);
});



 * ═══════════════════════════════════════════════════════════════════════════════
 * 🔍 SCALPER VERBOSE - MUESTRA TODAS LAS OPORTUNIDADES
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * Esta versión muestra TODAS las oportunidades analizadas, incluyendo:
 * - Spreads negativos (pérdida)
 * - Spreads positivos pero no rentables después de gas
 * - Oportunidades rentables
 * 
 * Útil para entender el mercado y calibrar parámetros.
 */

import express from 'express';
import cors from 'cors';
import { ethers } from 'ethers';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '../.env') });

const app = express();
const PORT = 3101;

app.use(cors());
app.use(express.json());

// ═══════════════════════════════════════════════════════════════════════════════
// CONFIGURACIÓN
// ═══════════════════════════════════════════════════════════════════════════════

const CONFIG = {
  SCAN_INTERVAL_MS: 2000,          // Más lento para ver mejor los logs
  MIN_PROFIT_USD: -10,             // Mostrar incluso pérdidas
  SHOW_ALL_QUOTES: true,           // Mostrar todos los quotes
  TRADE_AMOUNTS_ETH: [0.01],       // Solo un amount para simplificar
  FEE_TIERS: [500, 3000],          // 0.05% y 0.3%
  AUTO_EXECUTE: false,             // NO ejecutar automáticamente
  ETH_PRICE_USD: 3500
};

const PRIVATE_KEY = process.env.VITE_ETH_PRIVATE_KEY;
const WALLET_ADDRESS = process.env.VITE_ETH_WALLET_ADDRESS;

if (!PRIVATE_KEY || !WALLET_ADDRESS) {
  console.error('❌ ERROR: Credenciales no configuradas');
  process.exit(1);
}

// ═══════════════════════════════════════════════════════════════════════════════
// CHAINS
// ═══════════════════════════════════════════════════════════════════════════════

const CHAINS = {
  base: {
    name: 'Base',
    chainId: 8453,
    rpc: 'https://base-mainnet.g.alchemy.com/v2/mm-9UjI5oG51l94mRH3fh',
    explorer: 'https://basescan.org',
    tokens: {
      WETH: '0x4200000000000000000000000000000000000006',
      USDC: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913'
    },
    quoter: '0x3d4e44Eb1374240CE5F1B871ab261CD16335B76a',
    router: '0x2626664c2603336E57B271c5C0b26F421741e481'
  },
  arbitrum: {
    name: 'Arbitrum',
    chainId: 42161,
    rpc: 'https://arb1.arbitrum.io/rpc',
    explorer: 'https://arbiscan.io',
    tokens: {
      WETH: '0x82aF49447D8a07e3bd95BD0d56f35241523fBab1',
      USDC: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831'
    },
    quoter: '0x61fFE014bA17989E743c5F6cB21bF9697530B21e',
    router: '0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45'
  }
};

// ABIs
const QUOTER_ABI = [
  'function quoteExactInputSingle((address tokenIn, address tokenOut, uint256 amountIn, uint24 fee, uint160 sqrtPriceLimitX96)) external returns (uint256 amountOut, uint160 sqrtPriceX96After, uint32 initializedTicksCrossed, uint256 gasEstimate)'
];

// ═══════════════════════════════════════════════════════════════════════════════
// ESTADO
// ═══════════════════════════════════════════════════════════════════════════════

let state = {
  isRunning: false,
  isDryRun: true,
  startTime: null,
  mode: 'SCALPER_VERBOSE',
  stats: {
    totalScans: 0,
    opportunitiesFound: 0,
    positiveSpreadCount: 0,
    negativeSpreadCount: 0,
    profitableCount: 0,
    avgSpreadBps: 0,
    bestSpreadBps: 0,
    worstSpreadBps: 0,
    uptime: 0,
    currentChain: 'base'
  },
  chains: [],
  tradeLogs: [],
  opportunities: [],
  banditStates: [],
  allQuotes: []  // Guardar todos los quotes para análisis
};

let timer = null;
let providers = {};
let contracts = {};
let currentChainIndex = 0;
let allSpreads = [];

// ═══════════════════════════════════════════════════════════════════════════════
// INICIALIZAR
// ═══════════════════════════════════════════════════════════════════════════════

async function init() {
  console.log('[INIT] 🔌 Conectando...\n');
  
  for (const [key, chain] of Object.entries(CHAINS)) {
    try {
      providers[key] = new ethers.JsonRpcProvider(chain.rpc);
      contracts[key] = {
        quoter: new ethers.Contract(chain.quoter, QUOTER_ABI, providers[key])
      };
      
      const balance = await providers[key].getBalance(WALLET_ADDRESS);
      const balanceEth = parseFloat(ethers.formatEther(balance));
      
      state.chains.push({
        chain: key,
        name: chain.name,
        chainId: chain.chainId,
        balance: balanceEth.toFixed(6),
        balanceUsd: balanceEth * CONFIG.ETH_PRICE_USD,
        isActive: true,
        explorer: chain.explorer,
        ethPrice: 0
      });
      
      state.banditStates.push({
        chain: key,
        alpha: 2,
        beta: 2,
        winRate: 50,
        selected: key === 'base'
      });
      
      console.log(`   ✅ ${chain.name}: ${balanceEth.toFixed(6)} ETH`);
    } catch (e) {
      console.error(`   ❌ ${chain.name}: ${e.message}`);
    }
  }
  console.log('');
}

// ═══════════════════════════════════════════════════════════════════════════════
// ANÁLISIS DETALLADO
// ═══════════════════════════════════════════════════════════════════════════════

async function analyzeChain(chainKey) {
  const chain = CHAINS[chainKey];
  const provider = providers[chainKey];
  const quoter = contracts[chainKey].quoter;
  
  console.log(`\n═══════════════════════════════════════════════════════════════════`);
  console.log(`📊 ANÁLISIS: ${chain.name}`);
  console.log(`═══════════════════════════════════════════════════════════════════`);
  
  try {
    // Obtener gas price
    const feeData = await provider.getFeeData();
    const gasPrice = feeData.gasPrice || ethers.parseUnits('0.001', 'gwei');
    const gasPriceGwei = parseFloat(ethers.formatUnits(gasPrice, 'gwei'));
    const gasCostWei = gasPrice * 250000n;
    
    console.log(`⛽ Gas Price: ${gasPriceGwei.toFixed(4)} gwei`);
    console.log(`⛽ Estimated Gas Cost: ${ethers.formatEther(gasCostWei)} ETH`);
    
    // Obtener precio ETH
    let ethPrice = CONFIG.ETH_PRICE_USD;
    try {
      const priceQuote = await quoter.quoteExactInputSingle.staticCall({
        tokenIn: chain.tokens.WETH,
        tokenOut: chain.tokens.USDC,
        amountIn: ethers.parseEther('1'),
        fee: 500,
        sqrtPriceLimitX96: 0n
      });
      ethPrice = parseFloat(ethers.formatUnits(priceQuote[0], 6));
      console.log(`💰 ETH Price on ${chain.name}: $${ethPrice.toFixed(2)}`);
    } catch (e) {
      console.log(`💰 ETH Price: Using default $${ethPrice}`);
    }
    
    const gasCostUsd = parseFloat(ethers.formatEther(gasCostWei)) * ethPrice;
    console.log(`⛽ Gas Cost in USD: $${gasCostUsd.toFixed(4)}`);
    
    // Actualizar estado
    const chainState = state.chains.find(c => c.chain === chainKey);
    if (chainState) chainState.ethPrice = ethPrice;
    
    console.log(`\n📈 QUOTES WETH → USDC → WETH:`);
    console.log(`─────────────────────────────────────────────────────────────────`);
    
    const results = [];
    
    for (const amountEth of CONFIG.TRADE_AMOUNTS_ETH) {
      const amountWei = ethers.parseEther(amountEth.toString());
      
      for (let i = 0; i < CONFIG.FEE_TIERS.length; i++) {
        for (let j = 0; j < CONFIG.FEE_TIERS.length; j++) {
          const fee1 = CONFIG.FEE_TIERS[i];
          const fee2 = CONFIG.FEE_TIERS[j];
          
          try {
            // WETH → USDC
            const quote1 = await quoter.quoteExactInputSingle.staticCall({
              tokenIn: chain.tokens.WETH,
              tokenOut: chain.tokens.USDC,
              amountIn: amountWei,
              fee: fee1,
              sqrtPriceLimitX96: 0n
            });
            const usdcOut = quote1[0];
            const usdcOutFormatted = parseFloat(ethers.formatUnits(usdcOut, 6));
            
            // USDC → WETH
            const quote2 = await quoter.quoteExactInputSingle.staticCall({
              tokenIn: chain.tokens.USDC,
              tokenOut: chain.tokens.WETH,
              amountIn: usdcOut,
              fee: fee2,
              sqrtPriceLimitX96: 0n
            });
            const wethOut = quote2[0];
            const wethOutFormatted = parseFloat(ethers.formatEther(wethOut));
            
            // Calcular profit/loss
            const grossProfit = wethOut - amountWei;
            const grossProfitEth = parseFloat(ethers.formatEther(grossProfit));
            const grossProfitUsd = grossProfitEth * ethPrice;
            
            const netProfit = grossProfit - gasCostWei;
            const netProfitEth = parseFloat(ethers.formatEther(netProfit));
            const netProfitUsd = netProfitEth * ethPrice;
            
            const spreadBps = (grossProfitEth / amountEth) * 10000;
            
            // Determinar estado
            let status = '❌ LOSS';
            let statusColor = '';
            if (grossProfitEth > 0) {
              state.stats.positiveSpreadCount++;
              if (netProfitUsd > 0) {
                status = '✅ PROFIT';
                state.stats.profitableCount++;
              } else {
                status = '⚠️ +spread -gas';
              }
            } else {
              state.stats.negativeSpreadCount++;
            }
            
            allSpreads.push(spreadBps);
            
            console.log(`\n   Route: ${amountEth} ETH → ${fee1/100}% → USDC → ${fee2/100}% → WETH`);
            console.log(`   ├─ USDC received: ${usdcOutFormatted.toFixed(2)} USDC`);
            console.log(`   ├─ WETH received: ${wethOutFormatted.toFixed(8)} ETH`);
            console.log(`   ├─ Gross P/L: ${grossProfitEth >= 0 ? '+' : ''}${grossProfitEth.toFixed(8)} ETH ($${grossProfitUsd.toFixed(4)})`);
            console.log(`   ├─ Net P/L: ${netProfitEth >= 0 ? '+' : ''}${netProfitEth.toFixed(8)} ETH ($${netProfitUsd.toFixed(4)})`);
            console.log(`   ├─ Spread: ${spreadBps.toFixed(2)} bps (${(spreadBps/100).toFixed(4)}%)`);
            console.log(`   └─ Status: ${status}`);
            
            results.push({
              chain: chainKey,
              chainName: chain.name,
              route: `${fee1/100}%→${fee2/100}%`,
              amountIn: amountEth,
              usdcOut: usdcOutFormatted,
              wethOut: wethOutFormatted,
              grossProfitEth,
              grossProfitUsd,
              netProfitEth,
              netProfitUsd,
              spreadBps,
              gasCostUsd,
              status,
              timestamp: Date.now()
            });
            
            if (netProfitUsd > 0) {
              state.stats.opportunitiesFound++;
              state.opportunities.unshift({
                ...results[results.length - 1],
                type: 'PROFITABLE'
              });
            }
            
          } catch (e) {
            console.log(`\n   Route: ${amountEth} ETH → ${fee1/100}% → USDC → ${fee2/100}% → WETH`);
            console.log(`   └─ ❌ Pool no existe o error: ${e.message.slice(0, 50)}`);
          }
        }
      }
    }
    
    // Estadísticas
    if (allSpreads.length > 0) {
      state.stats.avgSpreadBps = allSpreads.reduce((a, b) => a + b, 0) / allSpreads.length;
      state.stats.bestSpreadBps = Math.max(...allSpreads);
      state.stats.worstSpreadBps = Math.min(...allSpreads);
    }
    
    // Guardar para UI
    state.allQuotes = results;
    if (state.opportunities.length > 20) {
      state.opportunities = state.opportunities.slice(0, 20);
    }
    
    return results;
    
  } catch (e) {
    console.error(`❌ Error: ${e.message}`);
    return [];
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// LOOP
// ═══════════════════════════════════════════════════════════════════════════════

async function tick() {
  if (!state.isRunning) return;
  
  state.stats.totalScans++;
  state.stats.uptime = Math.floor((Date.now() - state.startTime) / 1000);
  
  const chainKeys = Object.keys(CHAINS);
  const selectedChain = chainKeys[currentChainIndex % chainKeys.length];
  currentChainIndex++;
  
  state.stats.currentChain = selectedChain;
  state.banditStates.forEach(b => b.selected = b.chain === selectedChain);
  
  await analyzeChain(selectedChain);
  
  // Resumen
  console.log(`\n═══════════════════════════════════════════════════════════════════`);
  console.log(`📊 RESUMEN SCAN #${state.stats.totalScans}`);
  console.log(`═══════════════════════════════════════════════════════════════════`);
  console.log(`   Spreads Positivos: ${state.stats.positiveSpreadCount}`);
  console.log(`   Spreads Negativos: ${state.stats.negativeSpreadCount}`);
  console.log(`   Oportunidades Rentables: ${state.stats.profitableCount}`);
  console.log(`   Spread Promedio: ${state.stats.avgSpreadBps.toFixed(2)} bps`);
  console.log(`   Mejor Spread: ${state.stats.bestSpreadBps.toFixed(2)} bps`);
  console.log(`   Peor Spread: ${state.stats.worstSpreadBps.toFixed(2)} bps`);
  console.log(`═══════════════════════════════════════════════════════════════════\n`);
}

// ═══════════════════════════════════════════════════════════════════════════════
// API
// ═══════════════════════════════════════════════════════════════════════════════

app.get('/api/defi/multichain-arb/status', (req, res) => {
  res.json(state);
});

app.post('/api/defi/multichain-arb/start', async (req, res) => {
  if (state.isRunning) {
    return res.json({ success: false, error: 'Ya corriendo', isRunning: true });
  }
  
  state.isDryRun = true; // Siempre dry run en modo verbose
  state.isRunning = true;
  state.startTime = Date.now();
  
  state.stats = {
    totalScans: 0, opportunitiesFound: 0, positiveSpreadCount: 0,
    negativeSpreadCount: 0, profitableCount: 0, avgSpreadBps: 0,
    bestSpreadBps: 0, worstSpreadBps: 0, uptime: 0, currentChain: 'base'
  };
  state.opportunities = [];
  state.allQuotes = [];
  allSpreads = [];
  currentChainIndex = 0;
  
  if (timer) clearInterval(timer);
  timer = setInterval(tick, CONFIG.SCAN_INTERVAL_MS);
  
  // Ejecutar primer tick inmediatamente
  tick();
  
  console.log(`\n[START] 🔍 MODO VERBOSE - Analizando mercado...\n`);
  
  res.json({
    success: true,
    isRunning: true,
    isDryRun: true,
    mode: 'SCALPER_VERBOSE',
    config: CONFIG
  });
});

app.post('/api/defi/multichain-arb/stop', (req, res) => {
  state.isRunning = false;
  if (timer) { clearInterval(timer); timer = null; }
  console.log('[STOP] Análisis detenido');
  res.json({ success: true, isRunning: false });
});

app.get('/api/defi/multichain-arb/health', (req, res) => {
  res.json({
    status: 'ok',
    mode: 'SCALPER_VERBOSE',
    port: PORT,
    running: state.isRunning,
    wallet: WALLET_ADDRESS
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// INICIAR
// ═══════════════════════════════════════════════════════════════════════════════

app.listen(PORT, async () => {
  console.log(`
╔═══════════════════════════════════════════════════════════════════════════════╗
║                                                                               ║
║   🔍 SCALPER VERBOSE - ANÁLISIS DE MERCADO                                    ║
║                                                                               ║
║   Este modo muestra TODAS las oportunidades analizadas,                       ║
║   incluyendo las no rentables, para entender el mercado.                      ║
║                                                                               ║
║   ✅ Puerto: ${PORT}                                                           ║
║   ✅ Wallet: ${WALLET_ADDRESS.slice(0, 10)}...${WALLET_ADDRESS.slice(-5)}                                  ║
║                                                                               ║
╚═══════════════════════════════════════════════════════════════════════════════╝
  `);
  
  await init();
  console.log('[READY] 🔍 POST /api/defi/multichain-arb/start para iniciar análisis.\n');
});

process.on('SIGINT', () => {
  if (timer) clearInterval(timer);
  process.exit(0);
});


 * ═══════════════════════════════════════════════════════════════════════════════
 * 🔍 SCALPER VERBOSE - MUESTRA TODAS LAS OPORTUNIDADES
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * Esta versión muestra TODAS las oportunidades analizadas, incluyendo:
 * - Spreads negativos (pérdida)
 * - Spreads positivos pero no rentables después de gas
 * - Oportunidades rentables
 * 
 * Útil para entender el mercado y calibrar parámetros.
 */

import express from 'express';
import cors from 'cors';
import { ethers } from 'ethers';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '../.env') });

const app = express();
const PORT = 3101;

app.use(cors());
app.use(express.json());

// ═══════════════════════════════════════════════════════════════════════════════
// CONFIGURACIÓN
// ═══════════════════════════════════════════════════════════════════════════════

const CONFIG = {
  SCAN_INTERVAL_MS: 2000,          // Más lento para ver mejor los logs
  MIN_PROFIT_USD: -10,             // Mostrar incluso pérdidas
  SHOW_ALL_QUOTES: true,           // Mostrar todos los quotes
  TRADE_AMOUNTS_ETH: [0.01],       // Solo un amount para simplificar
  FEE_TIERS: [500, 3000],          // 0.05% y 0.3%
  AUTO_EXECUTE: false,             // NO ejecutar automáticamente
  ETH_PRICE_USD: 3500
};

const PRIVATE_KEY = process.env.VITE_ETH_PRIVATE_KEY;
const WALLET_ADDRESS = process.env.VITE_ETH_WALLET_ADDRESS;

if (!PRIVATE_KEY || !WALLET_ADDRESS) {
  console.error('❌ ERROR: Credenciales no configuradas');
  process.exit(1);
}

// ═══════════════════════════════════════════════════════════════════════════════
// CHAINS
// ═══════════════════════════════════════════════════════════════════════════════

const CHAINS = {
  base: {
    name: 'Base',
    chainId: 8453,
    rpc: 'https://base-mainnet.g.alchemy.com/v2/mm-9UjI5oG51l94mRH3fh',
    explorer: 'https://basescan.org',
    tokens: {
      WETH: '0x4200000000000000000000000000000000000006',
      USDC: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913'
    },
    quoter: '0x3d4e44Eb1374240CE5F1B871ab261CD16335B76a',
    router: '0x2626664c2603336E57B271c5C0b26F421741e481'
  },
  arbitrum: {
    name: 'Arbitrum',
    chainId: 42161,
    rpc: 'https://arb1.arbitrum.io/rpc',
    explorer: 'https://arbiscan.io',
    tokens: {
      WETH: '0x82aF49447D8a07e3bd95BD0d56f35241523fBab1',
      USDC: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831'
    },
    quoter: '0x61fFE014bA17989E743c5F6cB21bF9697530B21e',
    router: '0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45'
  }
};

// ABIs
const QUOTER_ABI = [
  'function quoteExactInputSingle((address tokenIn, address tokenOut, uint256 amountIn, uint24 fee, uint160 sqrtPriceLimitX96)) external returns (uint256 amountOut, uint160 sqrtPriceX96After, uint32 initializedTicksCrossed, uint256 gasEstimate)'
];

// ═══════════════════════════════════════════════════════════════════════════════
// ESTADO
// ═══════════════════════════════════════════════════════════════════════════════

let state = {
  isRunning: false,
  isDryRun: true,
  startTime: null,
  mode: 'SCALPER_VERBOSE',
  stats: {
    totalScans: 0,
    opportunitiesFound: 0,
    positiveSpreadCount: 0,
    negativeSpreadCount: 0,
    profitableCount: 0,
    avgSpreadBps: 0,
    bestSpreadBps: 0,
    worstSpreadBps: 0,
    uptime: 0,
    currentChain: 'base'
  },
  chains: [],
  tradeLogs: [],
  opportunities: [],
  banditStates: [],
  allQuotes: []  // Guardar todos los quotes para análisis
};

let timer = null;
let providers = {};
let contracts = {};
let currentChainIndex = 0;
let allSpreads = [];

// ═══════════════════════════════════════════════════════════════════════════════
// INICIALIZAR
// ═══════════════════════════════════════════════════════════════════════════════

async function init() {
  console.log('[INIT] 🔌 Conectando...\n');
  
  for (const [key, chain] of Object.entries(CHAINS)) {
    try {
      providers[key] = new ethers.JsonRpcProvider(chain.rpc);
      contracts[key] = {
        quoter: new ethers.Contract(chain.quoter, QUOTER_ABI, providers[key])
      };
      
      const balance = await providers[key].getBalance(WALLET_ADDRESS);
      const balanceEth = parseFloat(ethers.formatEther(balance));
      
      state.chains.push({
        chain: key,
        name: chain.name,
        chainId: chain.chainId,
        balance: balanceEth.toFixed(6),
        balanceUsd: balanceEth * CONFIG.ETH_PRICE_USD,
        isActive: true,
        explorer: chain.explorer,
        ethPrice: 0
      });
      
      state.banditStates.push({
        chain: key,
        alpha: 2,
        beta: 2,
        winRate: 50,
        selected: key === 'base'
      });
      
      console.log(`   ✅ ${chain.name}: ${balanceEth.toFixed(6)} ETH`);
    } catch (e) {
      console.error(`   ❌ ${chain.name}: ${e.message}`);
    }
  }
  console.log('');
}

// ═══════════════════════════════════════════════════════════════════════════════
// ANÁLISIS DETALLADO
// ═══════════════════════════════════════════════════════════════════════════════

async function analyzeChain(chainKey) {
  const chain = CHAINS[chainKey];
  const provider = providers[chainKey];
  const quoter = contracts[chainKey].quoter;
  
  console.log(`\n═══════════════════════════════════════════════════════════════════`);
  console.log(`📊 ANÁLISIS: ${chain.name}`);
  console.log(`═══════════════════════════════════════════════════════════════════`);
  
  try {
    // Obtener gas price
    const feeData = await provider.getFeeData();
    const gasPrice = feeData.gasPrice || ethers.parseUnits('0.001', 'gwei');
    const gasPriceGwei = parseFloat(ethers.formatUnits(gasPrice, 'gwei'));
    const gasCostWei = gasPrice * 250000n;
    
    console.log(`⛽ Gas Price: ${gasPriceGwei.toFixed(4)} gwei`);
    console.log(`⛽ Estimated Gas Cost: ${ethers.formatEther(gasCostWei)} ETH`);
    
    // Obtener precio ETH
    let ethPrice = CONFIG.ETH_PRICE_USD;
    try {
      const priceQuote = await quoter.quoteExactInputSingle.staticCall({
        tokenIn: chain.tokens.WETH,
        tokenOut: chain.tokens.USDC,
        amountIn: ethers.parseEther('1'),
        fee: 500,
        sqrtPriceLimitX96: 0n
      });
      ethPrice = parseFloat(ethers.formatUnits(priceQuote[0], 6));
      console.log(`💰 ETH Price on ${chain.name}: $${ethPrice.toFixed(2)}`);
    } catch (e) {
      console.log(`💰 ETH Price: Using default $${ethPrice}`);
    }
    
    const gasCostUsd = parseFloat(ethers.formatEther(gasCostWei)) * ethPrice;
    console.log(`⛽ Gas Cost in USD: $${gasCostUsd.toFixed(4)}`);
    
    // Actualizar estado
    const chainState = state.chains.find(c => c.chain === chainKey);
    if (chainState) chainState.ethPrice = ethPrice;
    
    console.log(`\n📈 QUOTES WETH → USDC → WETH:`);
    console.log(`─────────────────────────────────────────────────────────────────`);
    
    const results = [];
    
    for (const amountEth of CONFIG.TRADE_AMOUNTS_ETH) {
      const amountWei = ethers.parseEther(amountEth.toString());
      
      for (let i = 0; i < CONFIG.FEE_TIERS.length; i++) {
        for (let j = 0; j < CONFIG.FEE_TIERS.length; j++) {
          const fee1 = CONFIG.FEE_TIERS[i];
          const fee2 = CONFIG.FEE_TIERS[j];
          
          try {
            // WETH → USDC
            const quote1 = await quoter.quoteExactInputSingle.staticCall({
              tokenIn: chain.tokens.WETH,
              tokenOut: chain.tokens.USDC,
              amountIn: amountWei,
              fee: fee1,
              sqrtPriceLimitX96: 0n
            });
            const usdcOut = quote1[0];
            const usdcOutFormatted = parseFloat(ethers.formatUnits(usdcOut, 6));
            
            // USDC → WETH
            const quote2 = await quoter.quoteExactInputSingle.staticCall({
              tokenIn: chain.tokens.USDC,
              tokenOut: chain.tokens.WETH,
              amountIn: usdcOut,
              fee: fee2,
              sqrtPriceLimitX96: 0n
            });
            const wethOut = quote2[0];
            const wethOutFormatted = parseFloat(ethers.formatEther(wethOut));
            
            // Calcular profit/loss
            const grossProfit = wethOut - amountWei;
            const grossProfitEth = parseFloat(ethers.formatEther(grossProfit));
            const grossProfitUsd = grossProfitEth * ethPrice;
            
            const netProfit = grossProfit - gasCostWei;
            const netProfitEth = parseFloat(ethers.formatEther(netProfit));
            const netProfitUsd = netProfitEth * ethPrice;
            
            const spreadBps = (grossProfitEth / amountEth) * 10000;
            
            // Determinar estado
            let status = '❌ LOSS';
            let statusColor = '';
            if (grossProfitEth > 0) {
              state.stats.positiveSpreadCount++;
              if (netProfitUsd > 0) {
                status = '✅ PROFIT';
                state.stats.profitableCount++;
              } else {
                status = '⚠️ +spread -gas';
              }
            } else {
              state.stats.negativeSpreadCount++;
            }
            
            allSpreads.push(spreadBps);
            
            console.log(`\n   Route: ${amountEth} ETH → ${fee1/100}% → USDC → ${fee2/100}% → WETH`);
            console.log(`   ├─ USDC received: ${usdcOutFormatted.toFixed(2)} USDC`);
            console.log(`   ├─ WETH received: ${wethOutFormatted.toFixed(8)} ETH`);
            console.log(`   ├─ Gross P/L: ${grossProfitEth >= 0 ? '+' : ''}${grossProfitEth.toFixed(8)} ETH ($${grossProfitUsd.toFixed(4)})`);
            console.log(`   ├─ Net P/L: ${netProfitEth >= 0 ? '+' : ''}${netProfitEth.toFixed(8)} ETH ($${netProfitUsd.toFixed(4)})`);
            console.log(`   ├─ Spread: ${spreadBps.toFixed(2)} bps (${(spreadBps/100).toFixed(4)}%)`);
            console.log(`   └─ Status: ${status}`);
            
            results.push({
              chain: chainKey,
              chainName: chain.name,
              route: `${fee1/100}%→${fee2/100}%`,
              amountIn: amountEth,
              usdcOut: usdcOutFormatted,
              wethOut: wethOutFormatted,
              grossProfitEth,
              grossProfitUsd,
              netProfitEth,
              netProfitUsd,
              spreadBps,
              gasCostUsd,
              status,
              timestamp: Date.now()
            });
            
            if (netProfitUsd > 0) {
              state.stats.opportunitiesFound++;
              state.opportunities.unshift({
                ...results[results.length - 1],
                type: 'PROFITABLE'
              });
            }
            
          } catch (e) {
            console.log(`\n   Route: ${amountEth} ETH → ${fee1/100}% → USDC → ${fee2/100}% → WETH`);
            console.log(`   └─ ❌ Pool no existe o error: ${e.message.slice(0, 50)}`);
          }
        }
      }
    }
    
    // Estadísticas
    if (allSpreads.length > 0) {
      state.stats.avgSpreadBps = allSpreads.reduce((a, b) => a + b, 0) / allSpreads.length;
      state.stats.bestSpreadBps = Math.max(...allSpreads);
      state.stats.worstSpreadBps = Math.min(...allSpreads);
    }
    
    // Guardar para UI
    state.allQuotes = results;
    if (state.opportunities.length > 20) {
      state.opportunities = state.opportunities.slice(0, 20);
    }
    
    return results;
    
  } catch (e) {
    console.error(`❌ Error: ${e.message}`);
    return [];
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// LOOP
// ═══════════════════════════════════════════════════════════════════════════════

async function tick() {
  if (!state.isRunning) return;
  
  state.stats.totalScans++;
  state.stats.uptime = Math.floor((Date.now() - state.startTime) / 1000);
  
  const chainKeys = Object.keys(CHAINS);
  const selectedChain = chainKeys[currentChainIndex % chainKeys.length];
  currentChainIndex++;
  
  state.stats.currentChain = selectedChain;
  state.banditStates.forEach(b => b.selected = b.chain === selectedChain);
  
  await analyzeChain(selectedChain);
  
  // Resumen
  console.log(`\n═══════════════════════════════════════════════════════════════════`);
  console.log(`📊 RESUMEN SCAN #${state.stats.totalScans}`);
  console.log(`═══════════════════════════════════════════════════════════════════`);
  console.log(`   Spreads Positivos: ${state.stats.positiveSpreadCount}`);
  console.log(`   Spreads Negativos: ${state.stats.negativeSpreadCount}`);
  console.log(`   Oportunidades Rentables: ${state.stats.profitableCount}`);
  console.log(`   Spread Promedio: ${state.stats.avgSpreadBps.toFixed(2)} bps`);
  console.log(`   Mejor Spread: ${state.stats.bestSpreadBps.toFixed(2)} bps`);
  console.log(`   Peor Spread: ${state.stats.worstSpreadBps.toFixed(2)} bps`);
  console.log(`═══════════════════════════════════════════════════════════════════\n`);
}

// ═══════════════════════════════════════════════════════════════════════════════
// API
// ═══════════════════════════════════════════════════════════════════════════════

app.get('/api/defi/multichain-arb/status', (req, res) => {
  res.json(state);
});

app.post('/api/defi/multichain-arb/start', async (req, res) => {
  if (state.isRunning) {
    return res.json({ success: false, error: 'Ya corriendo', isRunning: true });
  }
  
  state.isDryRun = true; // Siempre dry run en modo verbose
  state.isRunning = true;
  state.startTime = Date.now();
  
  state.stats = {
    totalScans: 0, opportunitiesFound: 0, positiveSpreadCount: 0,
    negativeSpreadCount: 0, profitableCount: 0, avgSpreadBps: 0,
    bestSpreadBps: 0, worstSpreadBps: 0, uptime: 0, currentChain: 'base'
  };
  state.opportunities = [];
  state.allQuotes = [];
  allSpreads = [];
  currentChainIndex = 0;
  
  if (timer) clearInterval(timer);
  timer = setInterval(tick, CONFIG.SCAN_INTERVAL_MS);
  
  // Ejecutar primer tick inmediatamente
  tick();
  
  console.log(`\n[START] 🔍 MODO VERBOSE - Analizando mercado...\n`);
  
  res.json({
    success: true,
    isRunning: true,
    isDryRun: true,
    mode: 'SCALPER_VERBOSE',
    config: CONFIG
  });
});

app.post('/api/defi/multichain-arb/stop', (req, res) => {
  state.isRunning = false;
  if (timer) { clearInterval(timer); timer = null; }
  console.log('[STOP] Análisis detenido');
  res.json({ success: true, isRunning: false });
});

app.get('/api/defi/multichain-arb/health', (req, res) => {
  res.json({
    status: 'ok',
    mode: 'SCALPER_VERBOSE',
    port: PORT,
    running: state.isRunning,
    wallet: WALLET_ADDRESS
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// INICIAR
// ═══════════════════════════════════════════════════════════════════════════════

app.listen(PORT, async () => {
  console.log(`
╔═══════════════════════════════════════════════════════════════════════════════╗
║                                                                               ║
║   🔍 SCALPER VERBOSE - ANÁLISIS DE MERCADO                                    ║
║                                                                               ║
║   Este modo muestra TODAS las oportunidades analizadas,                       ║
║   incluyendo las no rentables, para entender el mercado.                      ║
║                                                                               ║
║   ✅ Puerto: ${PORT}                                                           ║
║   ✅ Wallet: ${WALLET_ADDRESS.slice(0, 10)}...${WALLET_ADDRESS.slice(-5)}                                  ║
║                                                                               ║
╚═══════════════════════════════════════════════════════════════════════════════╝
  `);
  
  await init();
  console.log('[READY] 🔍 POST /api/defi/multichain-arb/start para iniciar análisis.\n');
});

process.on('SIGINT', () => {
  if (timer) clearInterval(timer);
  process.exit(0);
});


 * ═══════════════════════════════════════════════════════════════════════════════
 * 🔍 SCALPER VERBOSE - MUESTRA TODAS LAS OPORTUNIDADES
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * Esta versión muestra TODAS las oportunidades analizadas, incluyendo:
 * - Spreads negativos (pérdida)
 * - Spreads positivos pero no rentables después de gas
 * - Oportunidades rentables
 * 
 * Útil para entender el mercado y calibrar parámetros.
 */

import express from 'express';
import cors from 'cors';
import { ethers } from 'ethers';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '../.env') });

const app = express();
const PORT = 3101;

app.use(cors());
app.use(express.json());

// ═══════════════════════════════════════════════════════════════════════════════
// CONFIGURACIÓN
// ═══════════════════════════════════════════════════════════════════════════════

const CONFIG = {
  SCAN_INTERVAL_MS: 2000,          // Más lento para ver mejor los logs
  MIN_PROFIT_USD: -10,             // Mostrar incluso pérdidas
  SHOW_ALL_QUOTES: true,           // Mostrar todos los quotes
  TRADE_AMOUNTS_ETH: [0.01],       // Solo un amount para simplificar
  FEE_TIERS: [500, 3000],          // 0.05% y 0.3%
  AUTO_EXECUTE: false,             // NO ejecutar automáticamente
  ETH_PRICE_USD: 3500
};

const PRIVATE_KEY = process.env.VITE_ETH_PRIVATE_KEY;
const WALLET_ADDRESS = process.env.VITE_ETH_WALLET_ADDRESS;

if (!PRIVATE_KEY || !WALLET_ADDRESS) {
  console.error('❌ ERROR: Credenciales no configuradas');
  process.exit(1);
}

// ═══════════════════════════════════════════════════════════════════════════════
// CHAINS
// ═══════════════════════════════════════════════════════════════════════════════

const CHAINS = {
  base: {
    name: 'Base',
    chainId: 8453,
    rpc: 'https://base-mainnet.g.alchemy.com/v2/mm-9UjI5oG51l94mRH3fh',
    explorer: 'https://basescan.org',
    tokens: {
      WETH: '0x4200000000000000000000000000000000000006',
      USDC: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913'
    },
    quoter: '0x3d4e44Eb1374240CE5F1B871ab261CD16335B76a',
    router: '0x2626664c2603336E57B271c5C0b26F421741e481'
  },
  arbitrum: {
    name: 'Arbitrum',
    chainId: 42161,
    rpc: 'https://arb1.arbitrum.io/rpc',
    explorer: 'https://arbiscan.io',
    tokens: {
      WETH: '0x82aF49447D8a07e3bd95BD0d56f35241523fBab1',
      USDC: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831'
    },
    quoter: '0x61fFE014bA17989E743c5F6cB21bF9697530B21e',
    router: '0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45'
  }
};

// ABIs
const QUOTER_ABI = [
  'function quoteExactInputSingle((address tokenIn, address tokenOut, uint256 amountIn, uint24 fee, uint160 sqrtPriceLimitX96)) external returns (uint256 amountOut, uint160 sqrtPriceX96After, uint32 initializedTicksCrossed, uint256 gasEstimate)'
];

// ═══════════════════════════════════════════════════════════════════════════════
// ESTADO
// ═══════════════════════════════════════════════════════════════════════════════

let state = {
  isRunning: false,
  isDryRun: true,
  startTime: null,
  mode: 'SCALPER_VERBOSE',
  stats: {
    totalScans: 0,
    opportunitiesFound: 0,
    positiveSpreadCount: 0,
    negativeSpreadCount: 0,
    profitableCount: 0,
    avgSpreadBps: 0,
    bestSpreadBps: 0,
    worstSpreadBps: 0,
    uptime: 0,
    currentChain: 'base'
  },
  chains: [],
  tradeLogs: [],
  opportunities: [],
  banditStates: [],
  allQuotes: []  // Guardar todos los quotes para análisis
};

let timer = null;
let providers = {};
let contracts = {};
let currentChainIndex = 0;
let allSpreads = [];

// ═══════════════════════════════════════════════════════════════════════════════
// INICIALIZAR
// ═══════════════════════════════════════════════════════════════════════════════

async function init() {
  console.log('[INIT] 🔌 Conectando...\n');
  
  for (const [key, chain] of Object.entries(CHAINS)) {
    try {
      providers[key] = new ethers.JsonRpcProvider(chain.rpc);
      contracts[key] = {
        quoter: new ethers.Contract(chain.quoter, QUOTER_ABI, providers[key])
      };
      
      const balance = await providers[key].getBalance(WALLET_ADDRESS);
      const balanceEth = parseFloat(ethers.formatEther(balance));
      
      state.chains.push({
        chain: key,
        name: chain.name,
        chainId: chain.chainId,
        balance: balanceEth.toFixed(6),
        balanceUsd: balanceEth * CONFIG.ETH_PRICE_USD,
        isActive: true,
        explorer: chain.explorer,
        ethPrice: 0
      });
      
      state.banditStates.push({
        chain: key,
        alpha: 2,
        beta: 2,
        winRate: 50,
        selected: key === 'base'
      });
      
      console.log(`   ✅ ${chain.name}: ${balanceEth.toFixed(6)} ETH`);
    } catch (e) {
      console.error(`   ❌ ${chain.name}: ${e.message}`);
    }
  }
  console.log('');
}

// ═══════════════════════════════════════════════════════════════════════════════
// ANÁLISIS DETALLADO
// ═══════════════════════════════════════════════════════════════════════════════

async function analyzeChain(chainKey) {
  const chain = CHAINS[chainKey];
  const provider = providers[chainKey];
  const quoter = contracts[chainKey].quoter;
  
  console.log(`\n═══════════════════════════════════════════════════════════════════`);
  console.log(`📊 ANÁLISIS: ${chain.name}`);
  console.log(`═══════════════════════════════════════════════════════════════════`);
  
  try {
    // Obtener gas price
    const feeData = await provider.getFeeData();
    const gasPrice = feeData.gasPrice || ethers.parseUnits('0.001', 'gwei');
    const gasPriceGwei = parseFloat(ethers.formatUnits(gasPrice, 'gwei'));
    const gasCostWei = gasPrice * 250000n;
    
    console.log(`⛽ Gas Price: ${gasPriceGwei.toFixed(4)} gwei`);
    console.log(`⛽ Estimated Gas Cost: ${ethers.formatEther(gasCostWei)} ETH`);
    
    // Obtener precio ETH
    let ethPrice = CONFIG.ETH_PRICE_USD;
    try {
      const priceQuote = await quoter.quoteExactInputSingle.staticCall({
        tokenIn: chain.tokens.WETH,
        tokenOut: chain.tokens.USDC,
        amountIn: ethers.parseEther('1'),
        fee: 500,
        sqrtPriceLimitX96: 0n
      });
      ethPrice = parseFloat(ethers.formatUnits(priceQuote[0], 6));
      console.log(`💰 ETH Price on ${chain.name}: $${ethPrice.toFixed(2)}`);
    } catch (e) {
      console.log(`💰 ETH Price: Using default $${ethPrice}`);
    }
    
    const gasCostUsd = parseFloat(ethers.formatEther(gasCostWei)) * ethPrice;
    console.log(`⛽ Gas Cost in USD: $${gasCostUsd.toFixed(4)}`);
    
    // Actualizar estado
    const chainState = state.chains.find(c => c.chain === chainKey);
    if (chainState) chainState.ethPrice = ethPrice;
    
    console.log(`\n📈 QUOTES WETH → USDC → WETH:`);
    console.log(`─────────────────────────────────────────────────────────────────`);
    
    const results = [];
    
    for (const amountEth of CONFIG.TRADE_AMOUNTS_ETH) {
      const amountWei = ethers.parseEther(amountEth.toString());
      
      for (let i = 0; i < CONFIG.FEE_TIERS.length; i++) {
        for (let j = 0; j < CONFIG.FEE_TIERS.length; j++) {
          const fee1 = CONFIG.FEE_TIERS[i];
          const fee2 = CONFIG.FEE_TIERS[j];
          
          try {
            // WETH → USDC
            const quote1 = await quoter.quoteExactInputSingle.staticCall({
              tokenIn: chain.tokens.WETH,
              tokenOut: chain.tokens.USDC,
              amountIn: amountWei,
              fee: fee1,
              sqrtPriceLimitX96: 0n
            });
            const usdcOut = quote1[0];
            const usdcOutFormatted = parseFloat(ethers.formatUnits(usdcOut, 6));
            
            // USDC → WETH
            const quote2 = await quoter.quoteExactInputSingle.staticCall({
              tokenIn: chain.tokens.USDC,
              tokenOut: chain.tokens.WETH,
              amountIn: usdcOut,
              fee: fee2,
              sqrtPriceLimitX96: 0n
            });
            const wethOut = quote2[0];
            const wethOutFormatted = parseFloat(ethers.formatEther(wethOut));
            
            // Calcular profit/loss
            const grossProfit = wethOut - amountWei;
            const grossProfitEth = parseFloat(ethers.formatEther(grossProfit));
            const grossProfitUsd = grossProfitEth * ethPrice;
            
            const netProfit = grossProfit - gasCostWei;
            const netProfitEth = parseFloat(ethers.formatEther(netProfit));
            const netProfitUsd = netProfitEth * ethPrice;
            
            const spreadBps = (grossProfitEth / amountEth) * 10000;
            
            // Determinar estado
            let status = '❌ LOSS';
            let statusColor = '';
            if (grossProfitEth > 0) {
              state.stats.positiveSpreadCount++;
              if (netProfitUsd > 0) {
                status = '✅ PROFIT';
                state.stats.profitableCount++;
              } else {
                status = '⚠️ +spread -gas';
              }
            } else {
              state.stats.negativeSpreadCount++;
            }
            
            allSpreads.push(spreadBps);
            
            console.log(`\n   Route: ${amountEth} ETH → ${fee1/100}% → USDC → ${fee2/100}% → WETH`);
            console.log(`   ├─ USDC received: ${usdcOutFormatted.toFixed(2)} USDC`);
            console.log(`   ├─ WETH received: ${wethOutFormatted.toFixed(8)} ETH`);
            console.log(`   ├─ Gross P/L: ${grossProfitEth >= 0 ? '+' : ''}${grossProfitEth.toFixed(8)} ETH ($${grossProfitUsd.toFixed(4)})`);
            console.log(`   ├─ Net P/L: ${netProfitEth >= 0 ? '+' : ''}${netProfitEth.toFixed(8)} ETH ($${netProfitUsd.toFixed(4)})`);
            console.log(`   ├─ Spread: ${spreadBps.toFixed(2)} bps (${(spreadBps/100).toFixed(4)}%)`);
            console.log(`   └─ Status: ${status}`);
            
            results.push({
              chain: chainKey,
              chainName: chain.name,
              route: `${fee1/100}%→${fee2/100}%`,
              amountIn: amountEth,
              usdcOut: usdcOutFormatted,
              wethOut: wethOutFormatted,
              grossProfitEth,
              grossProfitUsd,
              netProfitEth,
              netProfitUsd,
              spreadBps,
              gasCostUsd,
              status,
              timestamp: Date.now()
            });
            
            if (netProfitUsd > 0) {
              state.stats.opportunitiesFound++;
              state.opportunities.unshift({
                ...results[results.length - 1],
                type: 'PROFITABLE'
              });
            }
            
          } catch (e) {
            console.log(`\n   Route: ${amountEth} ETH → ${fee1/100}% → USDC → ${fee2/100}% → WETH`);
            console.log(`   └─ ❌ Pool no existe o error: ${e.message.slice(0, 50)}`);
          }
        }
      }
    }
    
    // Estadísticas
    if (allSpreads.length > 0) {
      state.stats.avgSpreadBps = allSpreads.reduce((a, b) => a + b, 0) / allSpreads.length;
      state.stats.bestSpreadBps = Math.max(...allSpreads);
      state.stats.worstSpreadBps = Math.min(...allSpreads);
    }
    
    // Guardar para UI
    state.allQuotes = results;
    if (state.opportunities.length > 20) {
      state.opportunities = state.opportunities.slice(0, 20);
    }
    
    return results;
    
  } catch (e) {
    console.error(`❌ Error: ${e.message}`);
    return [];
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// LOOP
// ═══════════════════════════════════════════════════════════════════════════════

async function tick() {
  if (!state.isRunning) return;
  
  state.stats.totalScans++;
  state.stats.uptime = Math.floor((Date.now() - state.startTime) / 1000);
  
  const chainKeys = Object.keys(CHAINS);
  const selectedChain = chainKeys[currentChainIndex % chainKeys.length];
  currentChainIndex++;
  
  state.stats.currentChain = selectedChain;
  state.banditStates.forEach(b => b.selected = b.chain === selectedChain);
  
  await analyzeChain(selectedChain);
  
  // Resumen
  console.log(`\n═══════════════════════════════════════════════════════════════════`);
  console.log(`📊 RESUMEN SCAN #${state.stats.totalScans}`);
  console.log(`═══════════════════════════════════════════════════════════════════`);
  console.log(`   Spreads Positivos: ${state.stats.positiveSpreadCount}`);
  console.log(`   Spreads Negativos: ${state.stats.negativeSpreadCount}`);
  console.log(`   Oportunidades Rentables: ${state.stats.profitableCount}`);
  console.log(`   Spread Promedio: ${state.stats.avgSpreadBps.toFixed(2)} bps`);
  console.log(`   Mejor Spread: ${state.stats.bestSpreadBps.toFixed(2)} bps`);
  console.log(`   Peor Spread: ${state.stats.worstSpreadBps.toFixed(2)} bps`);
  console.log(`═══════════════════════════════════════════════════════════════════\n`);
}

// ═══════════════════════════════════════════════════════════════════════════════
// API
// ═══════════════════════════════════════════════════════════════════════════════

app.get('/api/defi/multichain-arb/status', (req, res) => {
  res.json(state);
});

app.post('/api/defi/multichain-arb/start', async (req, res) => {
  if (state.isRunning) {
    return res.json({ success: false, error: 'Ya corriendo', isRunning: true });
  }
  
  state.isDryRun = true; // Siempre dry run en modo verbose
  state.isRunning = true;
  state.startTime = Date.now();
  
  state.stats = {
    totalScans: 0, opportunitiesFound: 0, positiveSpreadCount: 0,
    negativeSpreadCount: 0, profitableCount: 0, avgSpreadBps: 0,
    bestSpreadBps: 0, worstSpreadBps: 0, uptime: 0, currentChain: 'base'
  };
  state.opportunities = [];
  state.allQuotes = [];
  allSpreads = [];
  currentChainIndex = 0;
  
  if (timer) clearInterval(timer);
  timer = setInterval(tick, CONFIG.SCAN_INTERVAL_MS);
  
  // Ejecutar primer tick inmediatamente
  tick();
  
  console.log(`\n[START] 🔍 MODO VERBOSE - Analizando mercado...\n`);
  
  res.json({
    success: true,
    isRunning: true,
    isDryRun: true,
    mode: 'SCALPER_VERBOSE',
    config: CONFIG
  });
});

app.post('/api/defi/multichain-arb/stop', (req, res) => {
  state.isRunning = false;
  if (timer) { clearInterval(timer); timer = null; }
  console.log('[STOP] Análisis detenido');
  res.json({ success: true, isRunning: false });
});

app.get('/api/defi/multichain-arb/health', (req, res) => {
  res.json({
    status: 'ok',
    mode: 'SCALPER_VERBOSE',
    port: PORT,
    running: state.isRunning,
    wallet: WALLET_ADDRESS
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// INICIAR
// ═══════════════════════════════════════════════════════════════════════════════

app.listen(PORT, async () => {
  console.log(`
╔═══════════════════════════════════════════════════════════════════════════════╗
║                                                                               ║
║   🔍 SCALPER VERBOSE - ANÁLISIS DE MERCADO                                    ║
║                                                                               ║
║   Este modo muestra TODAS las oportunidades analizadas,                       ║
║   incluyendo las no rentables, para entender el mercado.                      ║
║                                                                               ║
║   ✅ Puerto: ${PORT}                                                           ║
║   ✅ Wallet: ${WALLET_ADDRESS.slice(0, 10)}...${WALLET_ADDRESS.slice(-5)}                                  ║
║                                                                               ║
╚═══════════════════════════════════════════════════════════════════════════════╝
  `);
  
  await init();
  console.log('[READY] 🔍 POST /api/defi/multichain-arb/start para iniciar análisis.\n');
});

process.on('SIGINT', () => {
  if (timer) clearInterval(timer);
  process.exit(0);
});


 * ═══════════════════════════════════════════════════════════════════════════════
 * 🔍 SCALPER VERBOSE - MUESTRA TODAS LAS OPORTUNIDADES
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * Esta versión muestra TODAS las oportunidades analizadas, incluyendo:
 * - Spreads negativos (pérdida)
 * - Spreads positivos pero no rentables después de gas
 * - Oportunidades rentables
 * 
 * Útil para entender el mercado y calibrar parámetros.
 */

import express from 'express';
import cors from 'cors';
import { ethers } from 'ethers';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '../.env') });

const app = express();
const PORT = 3101;

app.use(cors());
app.use(express.json());

// ═══════════════════════════════════════════════════════════════════════════════
// CONFIGURACIÓN
// ═══════════════════════════════════════════════════════════════════════════════

const CONFIG = {
  SCAN_INTERVAL_MS: 2000,          // Más lento para ver mejor los logs
  MIN_PROFIT_USD: -10,             // Mostrar incluso pérdidas
  SHOW_ALL_QUOTES: true,           // Mostrar todos los quotes
  TRADE_AMOUNTS_ETH: [0.01],       // Solo un amount para simplificar
  FEE_TIERS: [500, 3000],          // 0.05% y 0.3%
  AUTO_EXECUTE: false,             // NO ejecutar automáticamente
  ETH_PRICE_USD: 3500
};

const PRIVATE_KEY = process.env.VITE_ETH_PRIVATE_KEY;
const WALLET_ADDRESS = process.env.VITE_ETH_WALLET_ADDRESS;

if (!PRIVATE_KEY || !WALLET_ADDRESS) {
  console.error('❌ ERROR: Credenciales no configuradas');
  process.exit(1);
}

// ═══════════════════════════════════════════════════════════════════════════════
// CHAINS
// ═══════════════════════════════════════════════════════════════════════════════

const CHAINS = {
  base: {
    name: 'Base',
    chainId: 8453,
    rpc: 'https://base-mainnet.g.alchemy.com/v2/mm-9UjI5oG51l94mRH3fh',
    explorer: 'https://basescan.org',
    tokens: {
      WETH: '0x4200000000000000000000000000000000000006',
      USDC: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913'
    },
    quoter: '0x3d4e44Eb1374240CE5F1B871ab261CD16335B76a',
    router: '0x2626664c2603336E57B271c5C0b26F421741e481'
  },
  arbitrum: {
    name: 'Arbitrum',
    chainId: 42161,
    rpc: 'https://arb1.arbitrum.io/rpc',
    explorer: 'https://arbiscan.io',
    tokens: {
      WETH: '0x82aF49447D8a07e3bd95BD0d56f35241523fBab1',
      USDC: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831'
    },
    quoter: '0x61fFE014bA17989E743c5F6cB21bF9697530B21e',
    router: '0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45'
  }
};

// ABIs
const QUOTER_ABI = [
  'function quoteExactInputSingle((address tokenIn, address tokenOut, uint256 amountIn, uint24 fee, uint160 sqrtPriceLimitX96)) external returns (uint256 amountOut, uint160 sqrtPriceX96After, uint32 initializedTicksCrossed, uint256 gasEstimate)'
];

// ═══════════════════════════════════════════════════════════════════════════════
// ESTADO
// ═══════════════════════════════════════════════════════════════════════════════

let state = {
  isRunning: false,
  isDryRun: true,
  startTime: null,
  mode: 'SCALPER_VERBOSE',
  stats: {
    totalScans: 0,
    opportunitiesFound: 0,
    positiveSpreadCount: 0,
    negativeSpreadCount: 0,
    profitableCount: 0,
    avgSpreadBps: 0,
    bestSpreadBps: 0,
    worstSpreadBps: 0,
    uptime: 0,
    currentChain: 'base'
  },
  chains: [],
  tradeLogs: [],
  opportunities: [],
  banditStates: [],
  allQuotes: []  // Guardar todos los quotes para análisis
};

let timer = null;
let providers = {};
let contracts = {};
let currentChainIndex = 0;
let allSpreads = [];

// ═══════════════════════════════════════════════════════════════════════════════
// INICIALIZAR
// ═══════════════════════════════════════════════════════════════════════════════

async function init() {
  console.log('[INIT] 🔌 Conectando...\n');
  
  for (const [key, chain] of Object.entries(CHAINS)) {
    try {
      providers[key] = new ethers.JsonRpcProvider(chain.rpc);
      contracts[key] = {
        quoter: new ethers.Contract(chain.quoter, QUOTER_ABI, providers[key])
      };
      
      const balance = await providers[key].getBalance(WALLET_ADDRESS);
      const balanceEth = parseFloat(ethers.formatEther(balance));
      
      state.chains.push({
        chain: key,
        name: chain.name,
        chainId: chain.chainId,
        balance: balanceEth.toFixed(6),
        balanceUsd: balanceEth * CONFIG.ETH_PRICE_USD,
        isActive: true,
        explorer: chain.explorer,
        ethPrice: 0
      });
      
      state.banditStates.push({
        chain: key,
        alpha: 2,
        beta: 2,
        winRate: 50,
        selected: key === 'base'
      });
      
      console.log(`   ✅ ${chain.name}: ${balanceEth.toFixed(6)} ETH`);
    } catch (e) {
      console.error(`   ❌ ${chain.name}: ${e.message}`);
    }
  }
  console.log('');
}

// ═══════════════════════════════════════════════════════════════════════════════
// ANÁLISIS DETALLADO
// ═══════════════════════════════════════════════════════════════════════════════

async function analyzeChain(chainKey) {
  const chain = CHAINS[chainKey];
  const provider = providers[chainKey];
  const quoter = contracts[chainKey].quoter;
  
  console.log(`\n═══════════════════════════════════════════════════════════════════`);
  console.log(`📊 ANÁLISIS: ${chain.name}`);
  console.log(`═══════════════════════════════════════════════════════════════════`);
  
  try {
    // Obtener gas price
    const feeData = await provider.getFeeData();
    const gasPrice = feeData.gasPrice || ethers.parseUnits('0.001', 'gwei');
    const gasPriceGwei = parseFloat(ethers.formatUnits(gasPrice, 'gwei'));
    const gasCostWei = gasPrice * 250000n;
    
    console.log(`⛽ Gas Price: ${gasPriceGwei.toFixed(4)} gwei`);
    console.log(`⛽ Estimated Gas Cost: ${ethers.formatEther(gasCostWei)} ETH`);
    
    // Obtener precio ETH
    let ethPrice = CONFIG.ETH_PRICE_USD;
    try {
      const priceQuote = await quoter.quoteExactInputSingle.staticCall({
        tokenIn: chain.tokens.WETH,
        tokenOut: chain.tokens.USDC,
        amountIn: ethers.parseEther('1'),
        fee: 500,
        sqrtPriceLimitX96: 0n
      });
      ethPrice = parseFloat(ethers.formatUnits(priceQuote[0], 6));
      console.log(`💰 ETH Price on ${chain.name}: $${ethPrice.toFixed(2)}`);
    } catch (e) {
      console.log(`💰 ETH Price: Using default $${ethPrice}`);
    }
    
    const gasCostUsd = parseFloat(ethers.formatEther(gasCostWei)) * ethPrice;
    console.log(`⛽ Gas Cost in USD: $${gasCostUsd.toFixed(4)}`);
    
    // Actualizar estado
    const chainState = state.chains.find(c => c.chain === chainKey);
    if (chainState) chainState.ethPrice = ethPrice;
    
    console.log(`\n📈 QUOTES WETH → USDC → WETH:`);
    console.log(`─────────────────────────────────────────────────────────────────`);
    
    const results = [];
    
    for (const amountEth of CONFIG.TRADE_AMOUNTS_ETH) {
      const amountWei = ethers.parseEther(amountEth.toString());
      
      for (let i = 0; i < CONFIG.FEE_TIERS.length; i++) {
        for (let j = 0; j < CONFIG.FEE_TIERS.length; j++) {
          const fee1 = CONFIG.FEE_TIERS[i];
          const fee2 = CONFIG.FEE_TIERS[j];
          
          try {
            // WETH → USDC
            const quote1 = await quoter.quoteExactInputSingle.staticCall({
              tokenIn: chain.tokens.WETH,
              tokenOut: chain.tokens.USDC,
              amountIn: amountWei,
              fee: fee1,
              sqrtPriceLimitX96: 0n
            });
            const usdcOut = quote1[0];
            const usdcOutFormatted = parseFloat(ethers.formatUnits(usdcOut, 6));
            
            // USDC → WETH
            const quote2 = await quoter.quoteExactInputSingle.staticCall({
              tokenIn: chain.tokens.USDC,
              tokenOut: chain.tokens.WETH,
              amountIn: usdcOut,
              fee: fee2,
              sqrtPriceLimitX96: 0n
            });
            const wethOut = quote2[0];
            const wethOutFormatted = parseFloat(ethers.formatEther(wethOut));
            
            // Calcular profit/loss
            const grossProfit = wethOut - amountWei;
            const grossProfitEth = parseFloat(ethers.formatEther(grossProfit));
            const grossProfitUsd = grossProfitEth * ethPrice;
            
            const netProfit = grossProfit - gasCostWei;
            const netProfitEth = parseFloat(ethers.formatEther(netProfit));
            const netProfitUsd = netProfitEth * ethPrice;
            
            const spreadBps = (grossProfitEth / amountEth) * 10000;
            
            // Determinar estado
            let status = '❌ LOSS';
            let statusColor = '';
            if (grossProfitEth > 0) {
              state.stats.positiveSpreadCount++;
              if (netProfitUsd > 0) {
                status = '✅ PROFIT';
                state.stats.profitableCount++;
              } else {
                status = '⚠️ +spread -gas';
              }
            } else {
              state.stats.negativeSpreadCount++;
            }
            
            allSpreads.push(spreadBps);
            
            console.log(`\n   Route: ${amountEth} ETH → ${fee1/100}% → USDC → ${fee2/100}% → WETH`);
            console.log(`   ├─ USDC received: ${usdcOutFormatted.toFixed(2)} USDC`);
            console.log(`   ├─ WETH received: ${wethOutFormatted.toFixed(8)} ETH`);
            console.log(`   ├─ Gross P/L: ${grossProfitEth >= 0 ? '+' : ''}${grossProfitEth.toFixed(8)} ETH ($${grossProfitUsd.toFixed(4)})`);
            console.log(`   ├─ Net P/L: ${netProfitEth >= 0 ? '+' : ''}${netProfitEth.toFixed(8)} ETH ($${netProfitUsd.toFixed(4)})`);
            console.log(`   ├─ Spread: ${spreadBps.toFixed(2)} bps (${(spreadBps/100).toFixed(4)}%)`);
            console.log(`   └─ Status: ${status}`);
            
            results.push({
              chain: chainKey,
              chainName: chain.name,
              route: `${fee1/100}%→${fee2/100}%`,
              amountIn: amountEth,
              usdcOut: usdcOutFormatted,
              wethOut: wethOutFormatted,
              grossProfitEth,
              grossProfitUsd,
              netProfitEth,
              netProfitUsd,
              spreadBps,
              gasCostUsd,
              status,
              timestamp: Date.now()
            });
            
            if (netProfitUsd > 0) {
              state.stats.opportunitiesFound++;
              state.opportunities.unshift({
                ...results[results.length - 1],
                type: 'PROFITABLE'
              });
            }
            
          } catch (e) {
            console.log(`\n   Route: ${amountEth} ETH → ${fee1/100}% → USDC → ${fee2/100}% → WETH`);
            console.log(`   └─ ❌ Pool no existe o error: ${e.message.slice(0, 50)}`);
          }
        }
      }
    }
    
    // Estadísticas
    if (allSpreads.length > 0) {
      state.stats.avgSpreadBps = allSpreads.reduce((a, b) => a + b, 0) / allSpreads.length;
      state.stats.bestSpreadBps = Math.max(...allSpreads);
      state.stats.worstSpreadBps = Math.min(...allSpreads);
    }
    
    // Guardar para UI
    state.allQuotes = results;
    if (state.opportunities.length > 20) {
      state.opportunities = state.opportunities.slice(0, 20);
    }
    
    return results;
    
  } catch (e) {
    console.error(`❌ Error: ${e.message}`);
    return [];
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// LOOP
// ═══════════════════════════════════════════════════════════════════════════════

async function tick() {
  if (!state.isRunning) return;
  
  state.stats.totalScans++;
  state.stats.uptime = Math.floor((Date.now() - state.startTime) / 1000);
  
  const chainKeys = Object.keys(CHAINS);
  const selectedChain = chainKeys[currentChainIndex % chainKeys.length];
  currentChainIndex++;
  
  state.stats.currentChain = selectedChain;
  state.banditStates.forEach(b => b.selected = b.chain === selectedChain);
  
  await analyzeChain(selectedChain);
  
  // Resumen
  console.log(`\n═══════════════════════════════════════════════════════════════════`);
  console.log(`📊 RESUMEN SCAN #${state.stats.totalScans}`);
  console.log(`═══════════════════════════════════════════════════════════════════`);
  console.log(`   Spreads Positivos: ${state.stats.positiveSpreadCount}`);
  console.log(`   Spreads Negativos: ${state.stats.negativeSpreadCount}`);
  console.log(`   Oportunidades Rentables: ${state.stats.profitableCount}`);
  console.log(`   Spread Promedio: ${state.stats.avgSpreadBps.toFixed(2)} bps`);
  console.log(`   Mejor Spread: ${state.stats.bestSpreadBps.toFixed(2)} bps`);
  console.log(`   Peor Spread: ${state.stats.worstSpreadBps.toFixed(2)} bps`);
  console.log(`═══════════════════════════════════════════════════════════════════\n`);
}

// ═══════════════════════════════════════════════════════════════════════════════
// API
// ═══════════════════════════════════════════════════════════════════════════════

app.get('/api/defi/multichain-arb/status', (req, res) => {
  res.json(state);
});

app.post('/api/defi/multichain-arb/start', async (req, res) => {
  if (state.isRunning) {
    return res.json({ success: false, error: 'Ya corriendo', isRunning: true });
  }
  
  state.isDryRun = true; // Siempre dry run en modo verbose
  state.isRunning = true;
  state.startTime = Date.now();
  
  state.stats = {
    totalScans: 0, opportunitiesFound: 0, positiveSpreadCount: 0,
    negativeSpreadCount: 0, profitableCount: 0, avgSpreadBps: 0,
    bestSpreadBps: 0, worstSpreadBps: 0, uptime: 0, currentChain: 'base'
  };
  state.opportunities = [];
  state.allQuotes = [];
  allSpreads = [];
  currentChainIndex = 0;
  
  if (timer) clearInterval(timer);
  timer = setInterval(tick, CONFIG.SCAN_INTERVAL_MS);
  
  // Ejecutar primer tick inmediatamente
  tick();
  
  console.log(`\n[START] 🔍 MODO VERBOSE - Analizando mercado...\n`);
  
  res.json({
    success: true,
    isRunning: true,
    isDryRun: true,
    mode: 'SCALPER_VERBOSE',
    config: CONFIG
  });
});

app.post('/api/defi/multichain-arb/stop', (req, res) => {
  state.isRunning = false;
  if (timer) { clearInterval(timer); timer = null; }
  console.log('[STOP] Análisis detenido');
  res.json({ success: true, isRunning: false });
});

app.get('/api/defi/multichain-arb/health', (req, res) => {
  res.json({
    status: 'ok',
    mode: 'SCALPER_VERBOSE',
    port: PORT,
    running: state.isRunning,
    wallet: WALLET_ADDRESS
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// INICIAR
// ═══════════════════════════════════════════════════════════════════════════════

app.listen(PORT, async () => {
  console.log(`
╔═══════════════════════════════════════════════════════════════════════════════╗
║                                                                               ║
║   🔍 SCALPER VERBOSE - ANÁLISIS DE MERCADO                                    ║
║                                                                               ║
║   Este modo muestra TODAS las oportunidades analizadas,                       ║
║   incluyendo las no rentables, para entender el mercado.                      ║
║                                                                               ║
║   ✅ Puerto: ${PORT}                                                           ║
║   ✅ Wallet: ${WALLET_ADDRESS.slice(0, 10)}...${WALLET_ADDRESS.slice(-5)}                                  ║
║                                                                               ║
╚═══════════════════════════════════════════════════════════════════════════════╝
  `);
  
  await init();
  console.log('[READY] 🔍 POST /api/defi/multichain-arb/start para iniciar análisis.\n');
});

process.on('SIGINT', () => {
  if (timer) clearInterval(timer);
  process.exit(0);
});




