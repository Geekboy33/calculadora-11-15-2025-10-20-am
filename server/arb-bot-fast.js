/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * BOT ARBITRAJE ULTRA-RÁPIDO - ALTA FRECUENCIA
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * Configuración AGRESIVA:
 * - Escaneo cada 500ms (2x por segundo)
 * - Umbral de profit muy bajo ($0.01)
 * - Múltiples rutas simultáneas
 * - Ejecución inmediata
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
// CONFIGURACIÓN AGRESIVA
// ═══════════════════════════════════════════════════════════════════════════════

const CONFIG = {
  TICK_INTERVAL_MS: 500,        // Escanear cada 500ms (ULTRA RÁPIDO)
  MIN_PROFIT_USD: 0.01,         // Profit mínimo $0.01 (MUY BAJO)
  MAX_SLIPPAGE_BPS: 100,        // 1% slippage permitido
  GAS_MULTIPLIER: 1.5,          // Multiplicador de gas
  TRADE_AMOUNTS_ETH: [0.003, 0.005, 0.008, 0.01, 0.015, 0.02], // Cantidades a probar
  FEE_TIERS: [100, 500, 3000, 10000], // Todos los fee tiers
  PARALLEL_SCANS: true,         // Escanear todas las chains en paralelo
  AUTO_EXECUTE: true,           // Ejecutar automáticamente
  ETH_PRICE_USD: 3500           // Precio ETH aproximado
};

const PRIVATE_KEY = process.env.VITE_ETH_PRIVATE_KEY;
const WALLET_ADDRESS = process.env.VITE_ETH_WALLET_ADDRESS;

if (!PRIVATE_KEY || !WALLET_ADDRESS) {
  console.error('❌ ERROR: Credenciales no configuradas en .env');
  process.exit(1);
}

// ═══════════════════════════════════════════════════════════════════════════════
// CHAINS Y CONTRATOS
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
  },
  optimism: {
    name: 'Optimism',
    chainId: 10,
    rpc: 'https://mainnet.optimism.io',
    explorer: 'https://optimistic.etherscan.io',
    tokens: {
      WETH: '0x4200000000000000000000000000000000000006',
      USDC: '0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85'
    },
    quoter: '0x61fFE014bA17989E743c5F6cB21bF9697530B21e',
    router: '0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45'
  }
};

// ABIs
const QUOTER_ABI = [
  'function quoteExactInputSingle((address tokenIn, address tokenOut, uint256 amountIn, uint24 fee, uint160 sqrtPriceLimitX96)) external returns (uint256 amountOut, uint160 sqrtPriceX96After, uint32 initializedTicksCrossed, uint256 gasEstimate)'
];

const ROUTER_ABI = [
  'function exactInputSingle((address tokenIn, address tokenOut, uint24 fee, address recipient, uint256 amountIn, uint256 amountOutMinimum, uint160 sqrtPriceLimitX96)) external payable returns (uint256 amountOut)',
  'function multicall(uint256 deadline, bytes[] calldata data) external payable returns (bytes[] memory results)'
];

const WETH_ABI = [
  'function deposit() payable',
  'function withdraw(uint256)',
  'function balanceOf(address) view returns (uint256)',
  'function approve(address spender, uint256 amount) returns (bool)',
  'function allowance(address owner, address spender) view returns (uint256)'
];

const ERC20_ABI = [
  'function balanceOf(address) view returns (uint256)',
  'function approve(address spender, uint256 amount) returns (bool)',
  'function allowance(address owner, address spender) view returns (uint256)'
];

// ═══════════════════════════════════════════════════════════════════════════════
// ESTADO DEL BOT
// ═══════════════════════════════════════════════════════════════════════════════

let state = {
  isRunning: false,
  isDryRun: false,
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
    currentChain: 'base',
    scanSpeed: 0,
    lastTradeTime: null
  },
  chains: [],
  tradeLogs: [],
  opportunities: [],
  banditStates: [
    { chain: 'base', alpha: 2, beta: 2, winRate: 50, selected: true },
    { chain: 'arbitrum', alpha: 2, beta: 2, winRate: 50, selected: false },
    { chain: 'optimism', alpha: 2, beta: 2, winRate: 50, selected: false }
  ]
};

let timer = null;
let providers = {};
let signers = {};
let isExecuting = false;

// ═══════════════════════════════════════════════════════════════════════════════
// INICIALIZAR CONEXIONES
// ═══════════════════════════════════════════════════════════════════════════════

async function initConnections() {
  console.log('[INIT] Inicializando conexiones...');
  
  for (const [key, chain] of Object.entries(CHAINS)) {
    try {
      providers[key] = new ethers.JsonRpcProvider(chain.rpc);
      signers[key] = new ethers.Wallet(PRIVATE_KEY, providers[key]);
      
      const balance = await providers[key].getBalance(WALLET_ADDRESS);
      const balanceEth = parseFloat(ethers.formatEther(balance));
      
      state.chains.push({
        chain: key,
        name: chain.name,
        chainId: chain.chainId,
        balance: balanceEth.toFixed(6),
        balanceUsd: balanceEth * CONFIG.ETH_PRICE_USD,
        routes: CONFIG.FEE_TIERS.length * CONFIG.TRADE_AMOUNTS_ETH.length,
        isActive: true,
        lastTick: Date.now(),
        explorer: chain.explorer
      });
      
      console.log(`[INIT] ✅ ${chain.name}: ${balanceEth.toFixed(6)} ETH`);
    } catch (e) {
      console.error(`[INIT] ❌ ${chain.name}: ${e.message}`);
    }
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// ESCANEO ULTRA-RÁPIDO
// ═══════════════════════════════════════════════════════════════════════════════

async function fastScan(chainKey) {
  const chain = CHAINS[chainKey];
  const provider = providers[chainKey];
  const opportunities = [];

  try {
    const quoter = new ethers.Contract(chain.quoter, QUOTER_ABI, provider);
    
    // Obtener gas price
    const feeData = await provider.getFeeData();
    const gasPrice = feeData.gasPrice || ethers.parseUnits('0.001', 'gwei');
    const gasCostWei = gasPrice * 200000n;
    const gasCostUsd = parseFloat(ethers.formatEther(gasCostWei)) * CONFIG.ETH_PRICE_USD;

    // Probar TODAS las combinaciones en paralelo
    const promises = [];
    
    for (const amountEth of CONFIG.TRADE_AMOUNTS_ETH) {
      const amount = ethers.parseEther(amountEth.toString());
      
      for (let i = 0; i < CONFIG.FEE_TIERS.length; i++) {
        for (let j = 0; j < CONFIG.FEE_TIERS.length; j++) {
          if (i === j) continue;
          
          promises.push(
            (async () => {
              try {
                // ETH -> USDC
                const quote1 = await quoter.quoteExactInputSingle.staticCall({
                  tokenIn: chain.tokens.WETH,
                  tokenOut: chain.tokens.USDC,
                  amountIn: amount,
                  fee: CONFIG.FEE_TIERS[i],
                  sqrtPriceLimitX96: 0n
                });
                const usdcOut = quote1[0];

                // USDC -> ETH
                const quote2 = await quoter.quoteExactInputSingle.staticCall({
                  tokenIn: chain.tokens.USDC,
                  tokenOut: chain.tokens.WETH,
                  amountIn: usdcOut,
                  fee: CONFIG.FEE_TIERS[j],
                  sqrtPriceLimitX96: 0n
                });
                const ethOut = quote2[0];

                const grossProfit = ethOut - amount;
                const netProfit = grossProfit - gasCostWei;

                if (netProfit > 0n) {
                  const netProfitUsd = parseFloat(ethers.formatEther(netProfit)) * CONFIG.ETH_PRICE_USD;
                  
                  return {
                    chain: chainKey,
                    route: `${CONFIG.FEE_TIERS[i]/100}%->${CONFIG.FEE_TIERS[j]/100}%`,
                    amountIn: amount,
                    amountInEth: amountEth,
                    fee1: CONFIG.FEE_TIERS[i],
                    fee2: CONFIG.FEE_TIERS[j],
                    usdcIntermediate: usdcOut,
                    ethOut: ethOut,
                    netProfit: netProfit,
                    netProfitUsd: netProfitUsd,
                    gasCost: gasCostUsd,
                    spreadBps: (Number(netProfit * 10000n / amount) / 100).toFixed(2),
                    timestamp: Date.now()
                  };
                }
              } catch (e) {
                // Pool no existe
              }
              return null;
            })()
          );
        }
      }
    }

    const results = await Promise.all(promises);
    opportunities.push(...results.filter(r => r !== null));

  } catch (e) {
    console.error(`[SCAN] Error ${chainKey}:`, e.message);
  }

  return opportunities;
}

// ═══════════════════════════════════════════════════════════════════════════════
// EJECUCIÓN RÁPIDA DE TRADE
// ═══════════════════════════════════════════════════════════════════════════════

async function executeTrade(opp) {
  if (isExecuting) {
    console.log('[EXEC] Ya hay una ejecución en progreso, saltando...');
    return null;
  }
  
  isExecuting = true;
  const chain = CHAINS[opp.chain];
  const signer = signers[opp.chain];
  const provider = providers[opp.chain];

  console.log(`\n🚀 [EXEC] EJECUTANDO TRADE en ${chain.name}`);
  console.log(`   Route: ${opp.route}`);
  console.log(`   Amount: ${opp.amountInEth} ETH`);
  console.log(`   Expected: $${opp.netProfitUsd.toFixed(4)}`);

  try {
    // Verificar balance
    const balance = await provider.getBalance(WALLET_ADDRESS);
    if (balance < opp.amountIn) {
      console.log(`   ❌ Balance insuficiente`);
      isExecuting = false;
      return { success: false, error: 'Balance insuficiente' };
    }

    const weth = new ethers.Contract(chain.tokens.WETH, WETH_ABI, signer);
    const router = new ethers.Contract(chain.router, ROUTER_ABI, signer);
    const usdc = new ethers.Contract(chain.tokens.USDC, ERC20_ABI, signer);

    // 1. Wrap ETH -> WETH
    console.log(`   📦 Wrapping ETH...`);
    const wrapTx = await weth.deposit({ 
      value: opp.amountIn,
      gasLimit: 50000
    });
    await wrapTx.wait(1);
    console.log(`   ✅ Wrap: ${wrapTx.hash.slice(0, 20)}...`);

    // 2. Approve si es necesario
    const allowance = await weth.allowance(WALLET_ADDRESS, chain.router);
    if (allowance < opp.amountIn) {
      console.log(`   🔓 Approving...`);
      const approveTx = await weth.approve(chain.router, ethers.MaxUint256, { gasLimit: 50000 });
      await approveTx.wait(1);
    }

    // 3. Swap WETH -> USDC
    console.log(`   🔄 Swap 1: WETH -> USDC...`);
    const minUsdc = (opp.usdcIntermediate * BigInt(10000 - CONFIG.MAX_SLIPPAGE_BPS)) / 10000n;
    
    const swap1Tx = await router.exactInputSingle({
      tokenIn: chain.tokens.WETH,
      tokenOut: chain.tokens.USDC,
      fee: opp.fee1,
      recipient: WALLET_ADDRESS,
      amountIn: opp.amountIn,
      amountOutMinimum: minUsdc,
      sqrtPriceLimitX96: 0n
    }, { gasLimit: 300000 });
    
    const receipt1 = await swap1Tx.wait(1);
    console.log(`   ✅ Swap 1: ${receipt1.hash.slice(0, 20)}...`);

    // 4. Approve USDC
    const usdcBalance = await usdc.balanceOf(WALLET_ADDRESS);
    const usdcAllowance = await usdc.allowance(WALLET_ADDRESS, chain.router);
    if (usdcAllowance < usdcBalance) {
      const approveUsdcTx = await usdc.approve(chain.router, ethers.MaxUint256, { gasLimit: 50000 });
      await approveUsdcTx.wait(1);
    }

    // 5. Swap USDC -> WETH
    console.log(`   🔄 Swap 2: USDC -> WETH...`);
    const minWeth = (opp.ethOut * BigInt(10000 - CONFIG.MAX_SLIPPAGE_BPS)) / 10000n;
    
    const swap2Tx = await router.exactInputSingle({
      tokenIn: chain.tokens.USDC,
      tokenOut: chain.tokens.WETH,
      fee: opp.fee2,
      recipient: WALLET_ADDRESS,
      amountIn: usdcBalance,
      amountOutMinimum: minWeth,
      sqrtPriceLimitX96: 0n
    }, { gasLimit: 300000 });
    
    const receipt2 = await swap2Tx.wait(1);
    console.log(`   ✅ Swap 2: ${receipt2.hash.slice(0, 20)}...`);

    // 6. Calcular profit real
    const finalWeth = await weth.balanceOf(WALLET_ADDRESS);
    const actualProfit = finalWeth - opp.amountIn;
    const actualProfitUsd = parseFloat(ethers.formatEther(actualProfit)) * CONFIG.ETH_PRICE_USD;

    console.log(`   💰 PROFIT: $${actualProfitUsd.toFixed(4)}`);
    console.log(`   🔗 TX: ${chain.explorer}/tx/${receipt2.hash}`);

    isExecuting = false;
    return {
      success: true,
      profitUsd: actualProfitUsd,
      txHash: receipt2.hash
    };

  } catch (e) {
    console.log(`   ❌ Error: ${e.message}`);
    isExecuting = false;
    return { success: false, error: e.message };
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// LOOP PRINCIPAL ULTRA-RÁPIDO
// ═══════════════════════════════════════════════════════════════════════════════

async function fastTick() {
  if (!state.isRunning || isExecuting) return;

  const tickStart = Date.now();
  state.stats.totalTicks++;
  state.stats.uptime = Math.floor((Date.now() - state.startTime) / 1000);

  // Seleccionar chain (round-robin para velocidad)
  const chainKeys = Object.keys(CHAINS);
  const chainIndex = state.stats.totalTicks % chainKeys.length;
  const selectedChain = chainKeys[chainIndex];
  state.stats.currentChain = selectedChain;

  // Actualizar bandit
  state.banditStates = state.banditStates.map(b => ({
    ...b,
    selected: b.chain === selectedChain
  }));

  try {
    // Escaneo rápido
    const opportunities = await fastScan(selectedChain);
    const scanTime = Date.now() - tickStart;
    state.stats.scanSpeed = scanTime;

    if (opportunities.length > 0) {
      // Ordenar por profit
      opportunities.sort((a, b) => b.netProfitUsd - a.netProfitUsd);
      const best = opportunities[0];

      // Guardar oportunidades
      state.opportunities = [...opportunities.slice(0, 5), ...state.opportunities].slice(0, 20);

      console.log(`[TICK ${state.stats.totalTicks}] ${CHAINS[selectedChain].name}: ${opportunities.length} opps, best: $${best.netProfitUsd.toFixed(4)} (${scanTime}ms)`);

      // Ejecutar si profit > umbral y NO es dry run
      if (best.netProfitUsd >= CONFIG.MIN_PROFIT_USD && !state.isDryRun && CONFIG.AUTO_EXECUTE) {
        console.log(`[EXEC] Profit $${best.netProfitUsd.toFixed(4)} >= $${CONFIG.MIN_PROFIT_USD}, ejecutando...`);
        
        const result = await executeTrade(best);
        state.stats.totalTrades++;
        state.stats.lastTradeTime = Date.now();

        if (result && result.success) {
          state.stats.successfulTrades++;
          state.stats.totalProfitUsd += result.profitUsd;
          state.stats.netProfitUsd = state.stats.totalProfitUsd;

          state.tradeLogs.unshift({
            id: `tx-${Date.now()}`,
            timestamp: Date.now(),
            chain: best.chain,
            route: best.route,
            amountIn: best.amountInEth,
            amountOut: ethers.formatEther(best.ethOut),
            profit: result.profitUsd.toFixed(4),
            gasCost: best.gasCost.toFixed(4),
            netProfit: result.profitUsd.toFixed(4),
            txHash: result.txHash,
            status: 'success'
          });

          // Actualizar bandit
          const bandit = state.banditStates.find(b => b.chain === selectedChain);
          if (bandit) {
            bandit.alpha += 1;
            bandit.winRate = (bandit.alpha / (bandit.alpha + bandit.beta) * 100);
          }
        } else {
          state.tradeLogs.unshift({
            id: `tx-${Date.now()}`,
            timestamp: Date.now(),
            chain: best.chain,
            route: best.route,
            amountIn: best.amountInEth,
            amountOut: '0',
            profit: '0',
            gasCost: best.gasCost.toFixed(4),
            netProfit: '0',
            txHash: '',
            status: 'failed'
          });

          const bandit = state.banditStates.find(b => b.chain === selectedChain);
          if (bandit) {
            bandit.beta += 1;
            bandit.winRate = (bandit.alpha / (bandit.alpha + bandit.beta) * 100);
          }
        }

        state.stats.winRate = state.stats.totalTrades > 0
          ? (state.stats.successfulTrades / state.stats.totalTrades * 100)
          : 0;

        if (state.tradeLogs.length > 100) state.tradeLogs.pop();
      }
    } else {
      // Log cada 10 ticks si no hay oportunidades
      if (state.stats.totalTicks % 10 === 0) {
        console.log(`[TICK ${state.stats.totalTicks}] ${CHAINS[selectedChain].name}: No profitable opps (${scanTime}ms)`);
      }
    }

    // Actualizar balances cada 20 ticks
    if (state.stats.totalTicks % 20 === 0) {
      for (const [key, chain] of Object.entries(CHAINS)) {
        try {
          const balance = await providers[key].getBalance(WALLET_ADDRESS);
          const balanceEth = parseFloat(ethers.formatEther(balance));
          const chainState = state.chains.find(c => c.chain === key);
          if (chainState) {
            chainState.balance = balanceEth.toFixed(6);
            chainState.balanceUsd = balanceEth * CONFIG.ETH_PRICE_USD;
            chainState.lastTick = Date.now();
          }
        } catch (e) {}
      }
    }

  } catch (e) {
    console.error(`[TICK] Error:`, e.message);
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// RUTAS API
// ═══════════════════════════════════════════════════════════════════════════════

app.get('/api/defi/multichain-arb/status', (req, res) => {
  res.json(state);
});

app.post('/api/defi/multichain-arb/start', async (req, res) => {
  console.log('[API] POST /start');

  if (state.isRunning) {
    return res.json({ success: false, error: 'Ya corriendo', isRunning: true });
  }

  state.isDryRun = req.body?.dryRun === true;
  state.isRunning = true;
  state.startTime = Date.now();
  state.stats.totalTicks = 0;
  state.stats.totalTrades = 0;
  state.stats.successfulTrades = 0;
  state.stats.totalProfitUsd = 0;
  state.stats.netProfitUsd = 0;
  state.stats.winRate = 0;
  state.stats.uptime = 0;
  state.tradeLogs = [];
  state.opportunities = [];

  // Iniciar loop ULTRA-RÁPIDO
  if (timer) clearInterval(timer);
  timer = setInterval(fastTick, CONFIG.TICK_INTERVAL_MS);

  console.log(`\n[START] Bot iniciado - ${state.isDryRun ? 'DRY RUN' : '⚠️ MODO REAL'}`);
  console.log(`[CONFIG] Intervalo: ${CONFIG.TICK_INTERVAL_MS}ms, Min profit: $${CONFIG.MIN_PROFIT_USD}`);

  res.json({ 
    success: true, 
    isRunning: true, 
    isDryRun: state.isDryRun,
    config: {
      tickInterval: CONFIG.TICK_INTERVAL_MS,
      minProfit: CONFIG.MIN_PROFIT_USD,
      autoExecute: CONFIG.AUTO_EXECUTE
    }
  });
});

app.post('/api/defi/multichain-arb/stop', (req, res) => {
  console.log('[API] POST /stop');
  state.isRunning = false;
  if (timer) { clearInterval(timer); timer = null; }
  res.json({ success: true, isRunning: false });
});

app.post('/api/defi/multichain-arb/reset', (req, res) => {
  state.stats = {
    totalTicks: 0, totalTrades: 0, successfulTrades: 0,
    totalProfitUsd: 0, totalGasUsd: 0, netProfitUsd: 0,
    winRate: 0, uptime: 0, currentChain: 'base', scanSpeed: 0, lastTradeTime: null
  };
  state.tradeLogs = [];
  state.opportunities = [];
  res.json({ success: true });
});

app.get('/api/defi/multichain-arb/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    port: PORT, 
    running: state.isRunning,
    mode: state.isDryRun ? 'DRY_RUN' : 'LIVE',
    wallet: WALLET_ADDRESS,
    config: CONFIG
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// INICIAR SERVIDOR
// ═══════════════════════════════════════════════════════════════════════════════

app.listen(PORT, async () => {
  console.log(`
╔═══════════════════════════════════════════════════════════════════════════════╗
║                                                                               ║
║   🚀 BOT ARBITRAJE ULTRA-RÁPIDO                                               ║
║                                                                               ║
║   ✅ Puerto: ${PORT}                                                           ║
║   ✅ Wallet: ${WALLET_ADDRESS.slice(0, 10)}...${WALLET_ADDRESS.slice(-5)}                                  ║
║   ✅ Intervalo: ${CONFIG.TICK_INTERVAL_MS}ms (${(1000/CONFIG.TICK_INTERVAL_MS).toFixed(1)} scans/seg)                              ║
║   ✅ Min Profit: $${CONFIG.MIN_PROFIT_USD}                                                 ║
║   ✅ Auto Execute: ${CONFIG.AUTO_EXECUTE}                                               ║
║                                                                               ║
║   ⚠️  MODO AGRESIVO - Alta frecuencia de trading                              ║
║                                                                               ║
╚═══════════════════════════════════════════════════════════════════════════════╝
  `);

  await initConnections();
  console.log('\n[READY] Bot listo. Usa POST /start para iniciar.\n');
});

process.on('SIGINT', () => {
  console.log('\n[EXIT] Cerrando...');
  if (timer) clearInterval(timer);
  process.exit(0);
});



 * ═══════════════════════════════════════════════════════════════════════════════
 * BOT ARBITRAJE ULTRA-RÁPIDO - ALTA FRECUENCIA
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * Configuración AGRESIVA:
 * - Escaneo cada 500ms (2x por segundo)
 * - Umbral de profit muy bajo ($0.01)
 * - Múltiples rutas simultáneas
 * - Ejecución inmediata
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
// CONFIGURACIÓN AGRESIVA
// ═══════════════════════════════════════════════════════════════════════════════

const CONFIG = {
  TICK_INTERVAL_MS: 500,        // Escanear cada 500ms (ULTRA RÁPIDO)
  MIN_PROFIT_USD: 0.01,         // Profit mínimo $0.01 (MUY BAJO)
  MAX_SLIPPAGE_BPS: 100,        // 1% slippage permitido
  GAS_MULTIPLIER: 1.5,          // Multiplicador de gas
  TRADE_AMOUNTS_ETH: [0.003, 0.005, 0.008, 0.01, 0.015, 0.02], // Cantidades a probar
  FEE_TIERS: [100, 500, 3000, 10000], // Todos los fee tiers
  PARALLEL_SCANS: true,         // Escanear todas las chains en paralelo
  AUTO_EXECUTE: true,           // Ejecutar automáticamente
  ETH_PRICE_USD: 3500           // Precio ETH aproximado
};

const PRIVATE_KEY = process.env.VITE_ETH_PRIVATE_KEY;
const WALLET_ADDRESS = process.env.VITE_ETH_WALLET_ADDRESS;

if (!PRIVATE_KEY || !WALLET_ADDRESS) {
  console.error('❌ ERROR: Credenciales no configuradas en .env');
  process.exit(1);
}

// ═══════════════════════════════════════════════════════════════════════════════
// CHAINS Y CONTRATOS
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
  },
  optimism: {
    name: 'Optimism',
    chainId: 10,
    rpc: 'https://mainnet.optimism.io',
    explorer: 'https://optimistic.etherscan.io',
    tokens: {
      WETH: '0x4200000000000000000000000000000000000006',
      USDC: '0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85'
    },
    quoter: '0x61fFE014bA17989E743c5F6cB21bF9697530B21e',
    router: '0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45'
  }
};

// ABIs
const QUOTER_ABI = [
  'function quoteExactInputSingle((address tokenIn, address tokenOut, uint256 amountIn, uint24 fee, uint160 sqrtPriceLimitX96)) external returns (uint256 amountOut, uint160 sqrtPriceX96After, uint32 initializedTicksCrossed, uint256 gasEstimate)'
];

const ROUTER_ABI = [
  'function exactInputSingle((address tokenIn, address tokenOut, uint24 fee, address recipient, uint256 amountIn, uint256 amountOutMinimum, uint160 sqrtPriceLimitX96)) external payable returns (uint256 amountOut)',
  'function multicall(uint256 deadline, bytes[] calldata data) external payable returns (bytes[] memory results)'
];

const WETH_ABI = [
  'function deposit() payable',
  'function withdraw(uint256)',
  'function balanceOf(address) view returns (uint256)',
  'function approve(address spender, uint256 amount) returns (bool)',
  'function allowance(address owner, address spender) view returns (uint256)'
];

const ERC20_ABI = [
  'function balanceOf(address) view returns (uint256)',
  'function approve(address spender, uint256 amount) returns (bool)',
  'function allowance(address owner, address spender) view returns (uint256)'
];

// ═══════════════════════════════════════════════════════════════════════════════
// ESTADO DEL BOT
// ═══════════════════════════════════════════════════════════════════════════════

let state = {
  isRunning: false,
  isDryRun: false,
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
    currentChain: 'base',
    scanSpeed: 0,
    lastTradeTime: null
  },
  chains: [],
  tradeLogs: [],
  opportunities: [],
  banditStates: [
    { chain: 'base', alpha: 2, beta: 2, winRate: 50, selected: true },
    { chain: 'arbitrum', alpha: 2, beta: 2, winRate: 50, selected: false },
    { chain: 'optimism', alpha: 2, beta: 2, winRate: 50, selected: false }
  ]
};

let timer = null;
let providers = {};
let signers = {};
let isExecuting = false;

// ═══════════════════════════════════════════════════════════════════════════════
// INICIALIZAR CONEXIONES
// ═══════════════════════════════════════════════════════════════════════════════

async function initConnections() {
  console.log('[INIT] Inicializando conexiones...');
  
  for (const [key, chain] of Object.entries(CHAINS)) {
    try {
      providers[key] = new ethers.JsonRpcProvider(chain.rpc);
      signers[key] = new ethers.Wallet(PRIVATE_KEY, providers[key]);
      
      const balance = await providers[key].getBalance(WALLET_ADDRESS);
      const balanceEth = parseFloat(ethers.formatEther(balance));
      
      state.chains.push({
        chain: key,
        name: chain.name,
        chainId: chain.chainId,
        balance: balanceEth.toFixed(6),
        balanceUsd: balanceEth * CONFIG.ETH_PRICE_USD,
        routes: CONFIG.FEE_TIERS.length * CONFIG.TRADE_AMOUNTS_ETH.length,
        isActive: true,
        lastTick: Date.now(),
        explorer: chain.explorer
      });
      
      console.log(`[INIT] ✅ ${chain.name}: ${balanceEth.toFixed(6)} ETH`);
    } catch (e) {
      console.error(`[INIT] ❌ ${chain.name}: ${e.message}`);
    }
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// ESCANEO ULTRA-RÁPIDO
// ═══════════════════════════════════════════════════════════════════════════════

async function fastScan(chainKey) {
  const chain = CHAINS[chainKey];
  const provider = providers[chainKey];
  const opportunities = [];

  try {
    const quoter = new ethers.Contract(chain.quoter, QUOTER_ABI, provider);
    
    // Obtener gas price
    const feeData = await provider.getFeeData();
    const gasPrice = feeData.gasPrice || ethers.parseUnits('0.001', 'gwei');
    const gasCostWei = gasPrice * 200000n;
    const gasCostUsd = parseFloat(ethers.formatEther(gasCostWei)) * CONFIG.ETH_PRICE_USD;

    // Probar TODAS las combinaciones en paralelo
    const promises = [];
    
    for (const amountEth of CONFIG.TRADE_AMOUNTS_ETH) {
      const amount = ethers.parseEther(amountEth.toString());
      
      for (let i = 0; i < CONFIG.FEE_TIERS.length; i++) {
        for (let j = 0; j < CONFIG.FEE_TIERS.length; j++) {
          if (i === j) continue;
          
          promises.push(
            (async () => {
              try {
                // ETH -> USDC
                const quote1 = await quoter.quoteExactInputSingle.staticCall({
                  tokenIn: chain.tokens.WETH,
                  tokenOut: chain.tokens.USDC,
                  amountIn: amount,
                  fee: CONFIG.FEE_TIERS[i],
                  sqrtPriceLimitX96: 0n
                });
                const usdcOut = quote1[0];

                // USDC -> ETH
                const quote2 = await quoter.quoteExactInputSingle.staticCall({
                  tokenIn: chain.tokens.USDC,
                  tokenOut: chain.tokens.WETH,
                  amountIn: usdcOut,
                  fee: CONFIG.FEE_TIERS[j],
                  sqrtPriceLimitX96: 0n
                });
                const ethOut = quote2[0];

                const grossProfit = ethOut - amount;
                const netProfit = grossProfit - gasCostWei;

                if (netProfit > 0n) {
                  const netProfitUsd = parseFloat(ethers.formatEther(netProfit)) * CONFIG.ETH_PRICE_USD;
                  
                  return {
                    chain: chainKey,
                    route: `${CONFIG.FEE_TIERS[i]/100}%->${CONFIG.FEE_TIERS[j]/100}%`,
                    amountIn: amount,
                    amountInEth: amountEth,
                    fee1: CONFIG.FEE_TIERS[i],
                    fee2: CONFIG.FEE_TIERS[j],
                    usdcIntermediate: usdcOut,
                    ethOut: ethOut,
                    netProfit: netProfit,
                    netProfitUsd: netProfitUsd,
                    gasCost: gasCostUsd,
                    spreadBps: (Number(netProfit * 10000n / amount) / 100).toFixed(2),
                    timestamp: Date.now()
                  };
                }
              } catch (e) {
                // Pool no existe
              }
              return null;
            })()
          );
        }
      }
    }

    const results = await Promise.all(promises);
    opportunities.push(...results.filter(r => r !== null));

  } catch (e) {
    console.error(`[SCAN] Error ${chainKey}:`, e.message);
  }

  return opportunities;
}

// ═══════════════════════════════════════════════════════════════════════════════
// EJECUCIÓN RÁPIDA DE TRADE
// ═══════════════════════════════════════════════════════════════════════════════

async function executeTrade(opp) {
  if (isExecuting) {
    console.log('[EXEC] Ya hay una ejecución en progreso, saltando...');
    return null;
  }
  
  isExecuting = true;
  const chain = CHAINS[opp.chain];
  const signer = signers[opp.chain];
  const provider = providers[opp.chain];

  console.log(`\n🚀 [EXEC] EJECUTANDO TRADE en ${chain.name}`);
  console.log(`   Route: ${opp.route}`);
  console.log(`   Amount: ${opp.amountInEth} ETH`);
  console.log(`   Expected: $${opp.netProfitUsd.toFixed(4)}`);

  try {
    // Verificar balance
    const balance = await provider.getBalance(WALLET_ADDRESS);
    if (balance < opp.amountIn) {
      console.log(`   ❌ Balance insuficiente`);
      isExecuting = false;
      return { success: false, error: 'Balance insuficiente' };
    }

    const weth = new ethers.Contract(chain.tokens.WETH, WETH_ABI, signer);
    const router = new ethers.Contract(chain.router, ROUTER_ABI, signer);
    const usdc = new ethers.Contract(chain.tokens.USDC, ERC20_ABI, signer);

    // 1. Wrap ETH -> WETH
    console.log(`   📦 Wrapping ETH...`);
    const wrapTx = await weth.deposit({ 
      value: opp.amountIn,
      gasLimit: 50000
    });
    await wrapTx.wait(1);
    console.log(`   ✅ Wrap: ${wrapTx.hash.slice(0, 20)}...`);

    // 2. Approve si es necesario
    const allowance = await weth.allowance(WALLET_ADDRESS, chain.router);
    if (allowance < opp.amountIn) {
      console.log(`   🔓 Approving...`);
      const approveTx = await weth.approve(chain.router, ethers.MaxUint256, { gasLimit: 50000 });
      await approveTx.wait(1);
    }

    // 3. Swap WETH -> USDC
    console.log(`   🔄 Swap 1: WETH -> USDC...`);
    const minUsdc = (opp.usdcIntermediate * BigInt(10000 - CONFIG.MAX_SLIPPAGE_BPS)) / 10000n;
    
    const swap1Tx = await router.exactInputSingle({
      tokenIn: chain.tokens.WETH,
      tokenOut: chain.tokens.USDC,
      fee: opp.fee1,
      recipient: WALLET_ADDRESS,
      amountIn: opp.amountIn,
      amountOutMinimum: minUsdc,
      sqrtPriceLimitX96: 0n
    }, { gasLimit: 300000 });
    
    const receipt1 = await swap1Tx.wait(1);
    console.log(`   ✅ Swap 1: ${receipt1.hash.slice(0, 20)}...`);

    // 4. Approve USDC
    const usdcBalance = await usdc.balanceOf(WALLET_ADDRESS);
    const usdcAllowance = await usdc.allowance(WALLET_ADDRESS, chain.router);
    if (usdcAllowance < usdcBalance) {
      const approveUsdcTx = await usdc.approve(chain.router, ethers.MaxUint256, { gasLimit: 50000 });
      await approveUsdcTx.wait(1);
    }

    // 5. Swap USDC -> WETH
    console.log(`   🔄 Swap 2: USDC -> WETH...`);
    const minWeth = (opp.ethOut * BigInt(10000 - CONFIG.MAX_SLIPPAGE_BPS)) / 10000n;
    
    const swap2Tx = await router.exactInputSingle({
      tokenIn: chain.tokens.USDC,
      tokenOut: chain.tokens.WETH,
      fee: opp.fee2,
      recipient: WALLET_ADDRESS,
      amountIn: usdcBalance,
      amountOutMinimum: minWeth,
      sqrtPriceLimitX96: 0n
    }, { gasLimit: 300000 });
    
    const receipt2 = await swap2Tx.wait(1);
    console.log(`   ✅ Swap 2: ${receipt2.hash.slice(0, 20)}...`);

    // 6. Calcular profit real
    const finalWeth = await weth.balanceOf(WALLET_ADDRESS);
    const actualProfit = finalWeth - opp.amountIn;
    const actualProfitUsd = parseFloat(ethers.formatEther(actualProfit)) * CONFIG.ETH_PRICE_USD;

    console.log(`   💰 PROFIT: $${actualProfitUsd.toFixed(4)}`);
    console.log(`   🔗 TX: ${chain.explorer}/tx/${receipt2.hash}`);

    isExecuting = false;
    return {
      success: true,
      profitUsd: actualProfitUsd,
      txHash: receipt2.hash
    };

  } catch (e) {
    console.log(`   ❌ Error: ${e.message}`);
    isExecuting = false;
    return { success: false, error: e.message };
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// LOOP PRINCIPAL ULTRA-RÁPIDO
// ═══════════════════════════════════════════════════════════════════════════════

async function fastTick() {
  if (!state.isRunning || isExecuting) return;

  const tickStart = Date.now();
  state.stats.totalTicks++;
  state.stats.uptime = Math.floor((Date.now() - state.startTime) / 1000);

  // Seleccionar chain (round-robin para velocidad)
  const chainKeys = Object.keys(CHAINS);
  const chainIndex = state.stats.totalTicks % chainKeys.length;
  const selectedChain = chainKeys[chainIndex];
  state.stats.currentChain = selectedChain;

  // Actualizar bandit
  state.banditStates = state.banditStates.map(b => ({
    ...b,
    selected: b.chain === selectedChain
  }));

  try {
    // Escaneo rápido
    const opportunities = await fastScan(selectedChain);
    const scanTime = Date.now() - tickStart;
    state.stats.scanSpeed = scanTime;

    if (opportunities.length > 0) {
      // Ordenar por profit
      opportunities.sort((a, b) => b.netProfitUsd - a.netProfitUsd);
      const best = opportunities[0];

      // Guardar oportunidades
      state.opportunities = [...opportunities.slice(0, 5), ...state.opportunities].slice(0, 20);

      console.log(`[TICK ${state.stats.totalTicks}] ${CHAINS[selectedChain].name}: ${opportunities.length} opps, best: $${best.netProfitUsd.toFixed(4)} (${scanTime}ms)`);

      // Ejecutar si profit > umbral y NO es dry run
      if (best.netProfitUsd >= CONFIG.MIN_PROFIT_USD && !state.isDryRun && CONFIG.AUTO_EXECUTE) {
        console.log(`[EXEC] Profit $${best.netProfitUsd.toFixed(4)} >= $${CONFIG.MIN_PROFIT_USD}, ejecutando...`);
        
        const result = await executeTrade(best);
        state.stats.totalTrades++;
        state.stats.lastTradeTime = Date.now();

        if (result && result.success) {
          state.stats.successfulTrades++;
          state.stats.totalProfitUsd += result.profitUsd;
          state.stats.netProfitUsd = state.stats.totalProfitUsd;

          state.tradeLogs.unshift({
            id: `tx-${Date.now()}`,
            timestamp: Date.now(),
            chain: best.chain,
            route: best.route,
            amountIn: best.amountInEth,
            amountOut: ethers.formatEther(best.ethOut),
            profit: result.profitUsd.toFixed(4),
            gasCost: best.gasCost.toFixed(4),
            netProfit: result.profitUsd.toFixed(4),
            txHash: result.txHash,
            status: 'success'
          });

          // Actualizar bandit
          const bandit = state.banditStates.find(b => b.chain === selectedChain);
          if (bandit) {
            bandit.alpha += 1;
            bandit.winRate = (bandit.alpha / (bandit.alpha + bandit.beta) * 100);
          }
        } else {
          state.tradeLogs.unshift({
            id: `tx-${Date.now()}`,
            timestamp: Date.now(),
            chain: best.chain,
            route: best.route,
            amountIn: best.amountInEth,
            amountOut: '0',
            profit: '0',
            gasCost: best.gasCost.toFixed(4),
            netProfit: '0',
            txHash: '',
            status: 'failed'
          });

          const bandit = state.banditStates.find(b => b.chain === selectedChain);
          if (bandit) {
            bandit.beta += 1;
            bandit.winRate = (bandit.alpha / (bandit.alpha + bandit.beta) * 100);
          }
        }

        state.stats.winRate = state.stats.totalTrades > 0
          ? (state.stats.successfulTrades / state.stats.totalTrades * 100)
          : 0;

        if (state.tradeLogs.length > 100) state.tradeLogs.pop();
      }
    } else {
      // Log cada 10 ticks si no hay oportunidades
      if (state.stats.totalTicks % 10 === 0) {
        console.log(`[TICK ${state.stats.totalTicks}] ${CHAINS[selectedChain].name}: No profitable opps (${scanTime}ms)`);
      }
    }

    // Actualizar balances cada 20 ticks
    if (state.stats.totalTicks % 20 === 0) {
      for (const [key, chain] of Object.entries(CHAINS)) {
        try {
          const balance = await providers[key].getBalance(WALLET_ADDRESS);
          const balanceEth = parseFloat(ethers.formatEther(balance));
          const chainState = state.chains.find(c => c.chain === key);
          if (chainState) {
            chainState.balance = balanceEth.toFixed(6);
            chainState.balanceUsd = balanceEth * CONFIG.ETH_PRICE_USD;
            chainState.lastTick = Date.now();
          }
        } catch (e) {}
      }
    }

  } catch (e) {
    console.error(`[TICK] Error:`, e.message);
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// RUTAS API
// ═══════════════════════════════════════════════════════════════════════════════

app.get('/api/defi/multichain-arb/status', (req, res) => {
  res.json(state);
});

app.post('/api/defi/multichain-arb/start', async (req, res) => {
  console.log('[API] POST /start');

  if (state.isRunning) {
    return res.json({ success: false, error: 'Ya corriendo', isRunning: true });
  }

  state.isDryRun = req.body?.dryRun === true;
  state.isRunning = true;
  state.startTime = Date.now();
  state.stats.totalTicks = 0;
  state.stats.totalTrades = 0;
  state.stats.successfulTrades = 0;
  state.stats.totalProfitUsd = 0;
  state.stats.netProfitUsd = 0;
  state.stats.winRate = 0;
  state.stats.uptime = 0;
  state.tradeLogs = [];
  state.opportunities = [];

  // Iniciar loop ULTRA-RÁPIDO
  if (timer) clearInterval(timer);
  timer = setInterval(fastTick, CONFIG.TICK_INTERVAL_MS);

  console.log(`\n[START] Bot iniciado - ${state.isDryRun ? 'DRY RUN' : '⚠️ MODO REAL'}`);
  console.log(`[CONFIG] Intervalo: ${CONFIG.TICK_INTERVAL_MS}ms, Min profit: $${CONFIG.MIN_PROFIT_USD}`);

  res.json({ 
    success: true, 
    isRunning: true, 
    isDryRun: state.isDryRun,
    config: {
      tickInterval: CONFIG.TICK_INTERVAL_MS,
      minProfit: CONFIG.MIN_PROFIT_USD,
      autoExecute: CONFIG.AUTO_EXECUTE
    }
  });
});

app.post('/api/defi/multichain-arb/stop', (req, res) => {
  console.log('[API] POST /stop');
  state.isRunning = false;
  if (timer) { clearInterval(timer); timer = null; }
  res.json({ success: true, isRunning: false });
});

app.post('/api/defi/multichain-arb/reset', (req, res) => {
  state.stats = {
    totalTicks: 0, totalTrades: 0, successfulTrades: 0,
    totalProfitUsd: 0, totalGasUsd: 0, netProfitUsd: 0,
    winRate: 0, uptime: 0, currentChain: 'base', scanSpeed: 0, lastTradeTime: null
  };
  state.tradeLogs = [];
  state.opportunities = [];
  res.json({ success: true });
});

app.get('/api/defi/multichain-arb/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    port: PORT, 
    running: state.isRunning,
    mode: state.isDryRun ? 'DRY_RUN' : 'LIVE',
    wallet: WALLET_ADDRESS,
    config: CONFIG
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// INICIAR SERVIDOR
// ═══════════════════════════════════════════════════════════════════════════════

app.listen(PORT, async () => {
  console.log(`
╔═══════════════════════════════════════════════════════════════════════════════╗
║                                                                               ║
║   🚀 BOT ARBITRAJE ULTRA-RÁPIDO                                               ║
║                                                                               ║
║   ✅ Puerto: ${PORT}                                                           ║
║   ✅ Wallet: ${WALLET_ADDRESS.slice(0, 10)}...${WALLET_ADDRESS.slice(-5)}                                  ║
║   ✅ Intervalo: ${CONFIG.TICK_INTERVAL_MS}ms (${(1000/CONFIG.TICK_INTERVAL_MS).toFixed(1)} scans/seg)                              ║
║   ✅ Min Profit: $${CONFIG.MIN_PROFIT_USD}                                                 ║
║   ✅ Auto Execute: ${CONFIG.AUTO_EXECUTE}                                               ║
║                                                                               ║
║   ⚠️  MODO AGRESIVO - Alta frecuencia de trading                              ║
║                                                                               ║
╚═══════════════════════════════════════════════════════════════════════════════╝
  `);

  await initConnections();
  console.log('\n[READY] Bot listo. Usa POST /start para iniciar.\n');
});

process.on('SIGINT', () => {
  console.log('\n[EXIT] Cerrando...');
  if (timer) clearInterval(timer);
  process.exit(0);
});



 * ═══════════════════════════════════════════════════════════════════════════════
 * BOT ARBITRAJE ULTRA-RÁPIDO - ALTA FRECUENCIA
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * Configuración AGRESIVA:
 * - Escaneo cada 500ms (2x por segundo)
 * - Umbral de profit muy bajo ($0.01)
 * - Múltiples rutas simultáneas
 * - Ejecución inmediata
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
// CONFIGURACIÓN AGRESIVA
// ═══════════════════════════════════════════════════════════════════════════════

const CONFIG = {
  TICK_INTERVAL_MS: 500,        // Escanear cada 500ms (ULTRA RÁPIDO)
  MIN_PROFIT_USD: 0.01,         // Profit mínimo $0.01 (MUY BAJO)
  MAX_SLIPPAGE_BPS: 100,        // 1% slippage permitido
  GAS_MULTIPLIER: 1.5,          // Multiplicador de gas
  TRADE_AMOUNTS_ETH: [0.003, 0.005, 0.008, 0.01, 0.015, 0.02], // Cantidades a probar
  FEE_TIERS: [100, 500, 3000, 10000], // Todos los fee tiers
  PARALLEL_SCANS: true,         // Escanear todas las chains en paralelo
  AUTO_EXECUTE: true,           // Ejecutar automáticamente
  ETH_PRICE_USD: 3500           // Precio ETH aproximado
};

const PRIVATE_KEY = process.env.VITE_ETH_PRIVATE_KEY;
const WALLET_ADDRESS = process.env.VITE_ETH_WALLET_ADDRESS;

if (!PRIVATE_KEY || !WALLET_ADDRESS) {
  console.error('❌ ERROR: Credenciales no configuradas en .env');
  process.exit(1);
}

// ═══════════════════════════════════════════════════════════════════════════════
// CHAINS Y CONTRATOS
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
  },
  optimism: {
    name: 'Optimism',
    chainId: 10,
    rpc: 'https://mainnet.optimism.io',
    explorer: 'https://optimistic.etherscan.io',
    tokens: {
      WETH: '0x4200000000000000000000000000000000000006',
      USDC: '0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85'
    },
    quoter: '0x61fFE014bA17989E743c5F6cB21bF9697530B21e',
    router: '0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45'
  }
};

// ABIs
const QUOTER_ABI = [
  'function quoteExactInputSingle((address tokenIn, address tokenOut, uint256 amountIn, uint24 fee, uint160 sqrtPriceLimitX96)) external returns (uint256 amountOut, uint160 sqrtPriceX96After, uint32 initializedTicksCrossed, uint256 gasEstimate)'
];

const ROUTER_ABI = [
  'function exactInputSingle((address tokenIn, address tokenOut, uint24 fee, address recipient, uint256 amountIn, uint256 amountOutMinimum, uint160 sqrtPriceLimitX96)) external payable returns (uint256 amountOut)',
  'function multicall(uint256 deadline, bytes[] calldata data) external payable returns (bytes[] memory results)'
];

const WETH_ABI = [
  'function deposit() payable',
  'function withdraw(uint256)',
  'function balanceOf(address) view returns (uint256)',
  'function approve(address spender, uint256 amount) returns (bool)',
  'function allowance(address owner, address spender) view returns (uint256)'
];

const ERC20_ABI = [
  'function balanceOf(address) view returns (uint256)',
  'function approve(address spender, uint256 amount) returns (bool)',
  'function allowance(address owner, address spender) view returns (uint256)'
];

// ═══════════════════════════════════════════════════════════════════════════════
// ESTADO DEL BOT
// ═══════════════════════════════════════════════════════════════════════════════

let state = {
  isRunning: false,
  isDryRun: false,
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
    currentChain: 'base',
    scanSpeed: 0,
    lastTradeTime: null
  },
  chains: [],
  tradeLogs: [],
  opportunities: [],
  banditStates: [
    { chain: 'base', alpha: 2, beta: 2, winRate: 50, selected: true },
    { chain: 'arbitrum', alpha: 2, beta: 2, winRate: 50, selected: false },
    { chain: 'optimism', alpha: 2, beta: 2, winRate: 50, selected: false }
  ]
};

let timer = null;
let providers = {};
let signers = {};
let isExecuting = false;

// ═══════════════════════════════════════════════════════════════════════════════
// INICIALIZAR CONEXIONES
// ═══════════════════════════════════════════════════════════════════════════════

async function initConnections() {
  console.log('[INIT] Inicializando conexiones...');
  
  for (const [key, chain] of Object.entries(CHAINS)) {
    try {
      providers[key] = new ethers.JsonRpcProvider(chain.rpc);
      signers[key] = new ethers.Wallet(PRIVATE_KEY, providers[key]);
      
      const balance = await providers[key].getBalance(WALLET_ADDRESS);
      const balanceEth = parseFloat(ethers.formatEther(balance));
      
      state.chains.push({
        chain: key,
        name: chain.name,
        chainId: chain.chainId,
        balance: balanceEth.toFixed(6),
        balanceUsd: balanceEth * CONFIG.ETH_PRICE_USD,
        routes: CONFIG.FEE_TIERS.length * CONFIG.TRADE_AMOUNTS_ETH.length,
        isActive: true,
        lastTick: Date.now(),
        explorer: chain.explorer
      });
      
      console.log(`[INIT] ✅ ${chain.name}: ${balanceEth.toFixed(6)} ETH`);
    } catch (e) {
      console.error(`[INIT] ❌ ${chain.name}: ${e.message}`);
    }
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// ESCANEO ULTRA-RÁPIDO
// ═══════════════════════════════════════════════════════════════════════════════

async function fastScan(chainKey) {
  const chain = CHAINS[chainKey];
  const provider = providers[chainKey];
  const opportunities = [];

  try {
    const quoter = new ethers.Contract(chain.quoter, QUOTER_ABI, provider);
    
    // Obtener gas price
    const feeData = await provider.getFeeData();
    const gasPrice = feeData.gasPrice || ethers.parseUnits('0.001', 'gwei');
    const gasCostWei = gasPrice * 200000n;
    const gasCostUsd = parseFloat(ethers.formatEther(gasCostWei)) * CONFIG.ETH_PRICE_USD;

    // Probar TODAS las combinaciones en paralelo
    const promises = [];
    
    for (const amountEth of CONFIG.TRADE_AMOUNTS_ETH) {
      const amount = ethers.parseEther(amountEth.toString());
      
      for (let i = 0; i < CONFIG.FEE_TIERS.length; i++) {
        for (let j = 0; j < CONFIG.FEE_TIERS.length; j++) {
          if (i === j) continue;
          
          promises.push(
            (async () => {
              try {
                // ETH -> USDC
                const quote1 = await quoter.quoteExactInputSingle.staticCall({
                  tokenIn: chain.tokens.WETH,
                  tokenOut: chain.tokens.USDC,
                  amountIn: amount,
                  fee: CONFIG.FEE_TIERS[i],
                  sqrtPriceLimitX96: 0n
                });
                const usdcOut = quote1[0];

                // USDC -> ETH
                const quote2 = await quoter.quoteExactInputSingle.staticCall({
                  tokenIn: chain.tokens.USDC,
                  tokenOut: chain.tokens.WETH,
                  amountIn: usdcOut,
                  fee: CONFIG.FEE_TIERS[j],
                  sqrtPriceLimitX96: 0n
                });
                const ethOut = quote2[0];

                const grossProfit = ethOut - amount;
                const netProfit = grossProfit - gasCostWei;

                if (netProfit > 0n) {
                  const netProfitUsd = parseFloat(ethers.formatEther(netProfit)) * CONFIG.ETH_PRICE_USD;
                  
                  return {
                    chain: chainKey,
                    route: `${CONFIG.FEE_TIERS[i]/100}%->${CONFIG.FEE_TIERS[j]/100}%`,
                    amountIn: amount,
                    amountInEth: amountEth,
                    fee1: CONFIG.FEE_TIERS[i],
                    fee2: CONFIG.FEE_TIERS[j],
                    usdcIntermediate: usdcOut,
                    ethOut: ethOut,
                    netProfit: netProfit,
                    netProfitUsd: netProfitUsd,
                    gasCost: gasCostUsd,
                    spreadBps: (Number(netProfit * 10000n / amount) / 100).toFixed(2),
                    timestamp: Date.now()
                  };
                }
              } catch (e) {
                // Pool no existe
              }
              return null;
            })()
          );
        }
      }
    }

    const results = await Promise.all(promises);
    opportunities.push(...results.filter(r => r !== null));

  } catch (e) {
    console.error(`[SCAN] Error ${chainKey}:`, e.message);
  }

  return opportunities;
}

// ═══════════════════════════════════════════════════════════════════════════════
// EJECUCIÓN RÁPIDA DE TRADE
// ═══════════════════════════════════════════════════════════════════════════════

async function executeTrade(opp) {
  if (isExecuting) {
    console.log('[EXEC] Ya hay una ejecución en progreso, saltando...');
    return null;
  }
  
  isExecuting = true;
  const chain = CHAINS[opp.chain];
  const signer = signers[opp.chain];
  const provider = providers[opp.chain];

  console.log(`\n🚀 [EXEC] EJECUTANDO TRADE en ${chain.name}`);
  console.log(`   Route: ${opp.route}`);
  console.log(`   Amount: ${opp.amountInEth} ETH`);
  console.log(`   Expected: $${opp.netProfitUsd.toFixed(4)}`);

  try {
    // Verificar balance
    const balance = await provider.getBalance(WALLET_ADDRESS);
    if (balance < opp.amountIn) {
      console.log(`   ❌ Balance insuficiente`);
      isExecuting = false;
      return { success: false, error: 'Balance insuficiente' };
    }

    const weth = new ethers.Contract(chain.tokens.WETH, WETH_ABI, signer);
    const router = new ethers.Contract(chain.router, ROUTER_ABI, signer);
    const usdc = new ethers.Contract(chain.tokens.USDC, ERC20_ABI, signer);

    // 1. Wrap ETH -> WETH
    console.log(`   📦 Wrapping ETH...`);
    const wrapTx = await weth.deposit({ 
      value: opp.amountIn,
      gasLimit: 50000
    });
    await wrapTx.wait(1);
    console.log(`   ✅ Wrap: ${wrapTx.hash.slice(0, 20)}...`);

    // 2. Approve si es necesario
    const allowance = await weth.allowance(WALLET_ADDRESS, chain.router);
    if (allowance < opp.amountIn) {
      console.log(`   🔓 Approving...`);
      const approveTx = await weth.approve(chain.router, ethers.MaxUint256, { gasLimit: 50000 });
      await approveTx.wait(1);
    }

    // 3. Swap WETH -> USDC
    console.log(`   🔄 Swap 1: WETH -> USDC...`);
    const minUsdc = (opp.usdcIntermediate * BigInt(10000 - CONFIG.MAX_SLIPPAGE_BPS)) / 10000n;
    
    const swap1Tx = await router.exactInputSingle({
      tokenIn: chain.tokens.WETH,
      tokenOut: chain.tokens.USDC,
      fee: opp.fee1,
      recipient: WALLET_ADDRESS,
      amountIn: opp.amountIn,
      amountOutMinimum: minUsdc,
      sqrtPriceLimitX96: 0n
    }, { gasLimit: 300000 });
    
    const receipt1 = await swap1Tx.wait(1);
    console.log(`   ✅ Swap 1: ${receipt1.hash.slice(0, 20)}...`);

    // 4. Approve USDC
    const usdcBalance = await usdc.balanceOf(WALLET_ADDRESS);
    const usdcAllowance = await usdc.allowance(WALLET_ADDRESS, chain.router);
    if (usdcAllowance < usdcBalance) {
      const approveUsdcTx = await usdc.approve(chain.router, ethers.MaxUint256, { gasLimit: 50000 });
      await approveUsdcTx.wait(1);
    }

    // 5. Swap USDC -> WETH
    console.log(`   🔄 Swap 2: USDC -> WETH...`);
    const minWeth = (opp.ethOut * BigInt(10000 - CONFIG.MAX_SLIPPAGE_BPS)) / 10000n;
    
    const swap2Tx = await router.exactInputSingle({
      tokenIn: chain.tokens.USDC,
      tokenOut: chain.tokens.WETH,
      fee: opp.fee2,
      recipient: WALLET_ADDRESS,
      amountIn: usdcBalance,
      amountOutMinimum: minWeth,
      sqrtPriceLimitX96: 0n
    }, { gasLimit: 300000 });
    
    const receipt2 = await swap2Tx.wait(1);
    console.log(`   ✅ Swap 2: ${receipt2.hash.slice(0, 20)}...`);

    // 6. Calcular profit real
    const finalWeth = await weth.balanceOf(WALLET_ADDRESS);
    const actualProfit = finalWeth - opp.amountIn;
    const actualProfitUsd = parseFloat(ethers.formatEther(actualProfit)) * CONFIG.ETH_PRICE_USD;

    console.log(`   💰 PROFIT: $${actualProfitUsd.toFixed(4)}`);
    console.log(`   🔗 TX: ${chain.explorer}/tx/${receipt2.hash}`);

    isExecuting = false;
    return {
      success: true,
      profitUsd: actualProfitUsd,
      txHash: receipt2.hash
    };

  } catch (e) {
    console.log(`   ❌ Error: ${e.message}`);
    isExecuting = false;
    return { success: false, error: e.message };
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// LOOP PRINCIPAL ULTRA-RÁPIDO
// ═══════════════════════════════════════════════════════════════════════════════

async function fastTick() {
  if (!state.isRunning || isExecuting) return;

  const tickStart = Date.now();
  state.stats.totalTicks++;
  state.stats.uptime = Math.floor((Date.now() - state.startTime) / 1000);

  // Seleccionar chain (round-robin para velocidad)
  const chainKeys = Object.keys(CHAINS);
  const chainIndex = state.stats.totalTicks % chainKeys.length;
  const selectedChain = chainKeys[chainIndex];
  state.stats.currentChain = selectedChain;

  // Actualizar bandit
  state.banditStates = state.banditStates.map(b => ({
    ...b,
    selected: b.chain === selectedChain
  }));

  try {
    // Escaneo rápido
    const opportunities = await fastScan(selectedChain);
    const scanTime = Date.now() - tickStart;
    state.stats.scanSpeed = scanTime;

    if (opportunities.length > 0) {
      // Ordenar por profit
      opportunities.sort((a, b) => b.netProfitUsd - a.netProfitUsd);
      const best = opportunities[0];

      // Guardar oportunidades
      state.opportunities = [...opportunities.slice(0, 5), ...state.opportunities].slice(0, 20);

      console.log(`[TICK ${state.stats.totalTicks}] ${CHAINS[selectedChain].name}: ${opportunities.length} opps, best: $${best.netProfitUsd.toFixed(4)} (${scanTime}ms)`);

      // Ejecutar si profit > umbral y NO es dry run
      if (best.netProfitUsd >= CONFIG.MIN_PROFIT_USD && !state.isDryRun && CONFIG.AUTO_EXECUTE) {
        console.log(`[EXEC] Profit $${best.netProfitUsd.toFixed(4)} >= $${CONFIG.MIN_PROFIT_USD}, ejecutando...`);
        
        const result = await executeTrade(best);
        state.stats.totalTrades++;
        state.stats.lastTradeTime = Date.now();

        if (result && result.success) {
          state.stats.successfulTrades++;
          state.stats.totalProfitUsd += result.profitUsd;
          state.stats.netProfitUsd = state.stats.totalProfitUsd;

          state.tradeLogs.unshift({
            id: `tx-${Date.now()}`,
            timestamp: Date.now(),
            chain: best.chain,
            route: best.route,
            amountIn: best.amountInEth,
            amountOut: ethers.formatEther(best.ethOut),
            profit: result.profitUsd.toFixed(4),
            gasCost: best.gasCost.toFixed(4),
            netProfit: result.profitUsd.toFixed(4),
            txHash: result.txHash,
            status: 'success'
          });

          // Actualizar bandit
          const bandit = state.banditStates.find(b => b.chain === selectedChain);
          if (bandit) {
            bandit.alpha += 1;
            bandit.winRate = (bandit.alpha / (bandit.alpha + bandit.beta) * 100);
          }
        } else {
          state.tradeLogs.unshift({
            id: `tx-${Date.now()}`,
            timestamp: Date.now(),
            chain: best.chain,
            route: best.route,
            amountIn: best.amountInEth,
            amountOut: '0',
            profit: '0',
            gasCost: best.gasCost.toFixed(4),
            netProfit: '0',
            txHash: '',
            status: 'failed'
          });

          const bandit = state.banditStates.find(b => b.chain === selectedChain);
          if (bandit) {
            bandit.beta += 1;
            bandit.winRate = (bandit.alpha / (bandit.alpha + bandit.beta) * 100);
          }
        }

        state.stats.winRate = state.stats.totalTrades > 0
          ? (state.stats.successfulTrades / state.stats.totalTrades * 100)
          : 0;

        if (state.tradeLogs.length > 100) state.tradeLogs.pop();
      }
    } else {
      // Log cada 10 ticks si no hay oportunidades
      if (state.stats.totalTicks % 10 === 0) {
        console.log(`[TICK ${state.stats.totalTicks}] ${CHAINS[selectedChain].name}: No profitable opps (${scanTime}ms)`);
      }
    }

    // Actualizar balances cada 20 ticks
    if (state.stats.totalTicks % 20 === 0) {
      for (const [key, chain] of Object.entries(CHAINS)) {
        try {
          const balance = await providers[key].getBalance(WALLET_ADDRESS);
          const balanceEth = parseFloat(ethers.formatEther(balance));
          const chainState = state.chains.find(c => c.chain === key);
          if (chainState) {
            chainState.balance = balanceEth.toFixed(6);
            chainState.balanceUsd = balanceEth * CONFIG.ETH_PRICE_USD;
            chainState.lastTick = Date.now();
          }
        } catch (e) {}
      }
    }

  } catch (e) {
    console.error(`[TICK] Error:`, e.message);
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// RUTAS API
// ═══════════════════════════════════════════════════════════════════════════════

app.get('/api/defi/multichain-arb/status', (req, res) => {
  res.json(state);
});

app.post('/api/defi/multichain-arb/start', async (req, res) => {
  console.log('[API] POST /start');

  if (state.isRunning) {
    return res.json({ success: false, error: 'Ya corriendo', isRunning: true });
  }

  state.isDryRun = req.body?.dryRun === true;
  state.isRunning = true;
  state.startTime = Date.now();
  state.stats.totalTicks = 0;
  state.stats.totalTrades = 0;
  state.stats.successfulTrades = 0;
  state.stats.totalProfitUsd = 0;
  state.stats.netProfitUsd = 0;
  state.stats.winRate = 0;
  state.stats.uptime = 0;
  state.tradeLogs = [];
  state.opportunities = [];

  // Iniciar loop ULTRA-RÁPIDO
  if (timer) clearInterval(timer);
  timer = setInterval(fastTick, CONFIG.TICK_INTERVAL_MS);

  console.log(`\n[START] Bot iniciado - ${state.isDryRun ? 'DRY RUN' : '⚠️ MODO REAL'}`);
  console.log(`[CONFIG] Intervalo: ${CONFIG.TICK_INTERVAL_MS}ms, Min profit: $${CONFIG.MIN_PROFIT_USD}`);

  res.json({ 
    success: true, 
    isRunning: true, 
    isDryRun: state.isDryRun,
    config: {
      tickInterval: CONFIG.TICK_INTERVAL_MS,
      minProfit: CONFIG.MIN_PROFIT_USD,
      autoExecute: CONFIG.AUTO_EXECUTE
    }
  });
});

app.post('/api/defi/multichain-arb/stop', (req, res) => {
  console.log('[API] POST /stop');
  state.isRunning = false;
  if (timer) { clearInterval(timer); timer = null; }
  res.json({ success: true, isRunning: false });
});

app.post('/api/defi/multichain-arb/reset', (req, res) => {
  state.stats = {
    totalTicks: 0, totalTrades: 0, successfulTrades: 0,
    totalProfitUsd: 0, totalGasUsd: 0, netProfitUsd: 0,
    winRate: 0, uptime: 0, currentChain: 'base', scanSpeed: 0, lastTradeTime: null
  };
  state.tradeLogs = [];
  state.opportunities = [];
  res.json({ success: true });
});

app.get('/api/defi/multichain-arb/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    port: PORT, 
    running: state.isRunning,
    mode: state.isDryRun ? 'DRY_RUN' : 'LIVE',
    wallet: WALLET_ADDRESS,
    config: CONFIG
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// INICIAR SERVIDOR
// ═══════════════════════════════════════════════════════════════════════════════

app.listen(PORT, async () => {
  console.log(`
╔═══════════════════════════════════════════════════════════════════════════════╗
║                                                                               ║
║   🚀 BOT ARBITRAJE ULTRA-RÁPIDO                                               ║
║                                                                               ║
║   ✅ Puerto: ${PORT}                                                           ║
║   ✅ Wallet: ${WALLET_ADDRESS.slice(0, 10)}...${WALLET_ADDRESS.slice(-5)}                                  ║
║   ✅ Intervalo: ${CONFIG.TICK_INTERVAL_MS}ms (${(1000/CONFIG.TICK_INTERVAL_MS).toFixed(1)} scans/seg)                              ║
║   ✅ Min Profit: $${CONFIG.MIN_PROFIT_USD}                                                 ║
║   ✅ Auto Execute: ${CONFIG.AUTO_EXECUTE}                                               ║
║                                                                               ║
║   ⚠️  MODO AGRESIVO - Alta frecuencia de trading                              ║
║                                                                               ║
╚═══════════════════════════════════════════════════════════════════════════════╝
  `);

  await initConnections();
  console.log('\n[READY] Bot listo. Usa POST /start para iniciar.\n');
});

process.on('SIGINT', () => {
  console.log('\n[EXIT] Cerrando...');
  if (timer) clearInterval(timer);
  process.exit(0);
});



 * ═══════════════════════════════════════════════════════════════════════════════
 * BOT ARBITRAJE ULTRA-RÁPIDO - ALTA FRECUENCIA
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * Configuración AGRESIVA:
 * - Escaneo cada 500ms (2x por segundo)
 * - Umbral de profit muy bajo ($0.01)
 * - Múltiples rutas simultáneas
 * - Ejecución inmediata
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
// CONFIGURACIÓN AGRESIVA
// ═══════════════════════════════════════════════════════════════════════════════

const CONFIG = {
  TICK_INTERVAL_MS: 500,        // Escanear cada 500ms (ULTRA RÁPIDO)
  MIN_PROFIT_USD: 0.01,         // Profit mínimo $0.01 (MUY BAJO)
  MAX_SLIPPAGE_BPS: 100,        // 1% slippage permitido
  GAS_MULTIPLIER: 1.5,          // Multiplicador de gas
  TRADE_AMOUNTS_ETH: [0.003, 0.005, 0.008, 0.01, 0.015, 0.02], // Cantidades a probar
  FEE_TIERS: [100, 500, 3000, 10000], // Todos los fee tiers
  PARALLEL_SCANS: true,         // Escanear todas las chains en paralelo
  AUTO_EXECUTE: true,           // Ejecutar automáticamente
  ETH_PRICE_USD: 3500           // Precio ETH aproximado
};

const PRIVATE_KEY = process.env.VITE_ETH_PRIVATE_KEY;
const WALLET_ADDRESS = process.env.VITE_ETH_WALLET_ADDRESS;

if (!PRIVATE_KEY || !WALLET_ADDRESS) {
  console.error('❌ ERROR: Credenciales no configuradas en .env');
  process.exit(1);
}

// ═══════════════════════════════════════════════════════════════════════════════
// CHAINS Y CONTRATOS
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
  },
  optimism: {
    name: 'Optimism',
    chainId: 10,
    rpc: 'https://mainnet.optimism.io',
    explorer: 'https://optimistic.etherscan.io',
    tokens: {
      WETH: '0x4200000000000000000000000000000000000006',
      USDC: '0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85'
    },
    quoter: '0x61fFE014bA17989E743c5F6cB21bF9697530B21e',
    router: '0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45'
  }
};

// ABIs
const QUOTER_ABI = [
  'function quoteExactInputSingle((address tokenIn, address tokenOut, uint256 amountIn, uint24 fee, uint160 sqrtPriceLimitX96)) external returns (uint256 amountOut, uint160 sqrtPriceX96After, uint32 initializedTicksCrossed, uint256 gasEstimate)'
];

const ROUTER_ABI = [
  'function exactInputSingle((address tokenIn, address tokenOut, uint24 fee, address recipient, uint256 amountIn, uint256 amountOutMinimum, uint160 sqrtPriceLimitX96)) external payable returns (uint256 amountOut)',
  'function multicall(uint256 deadline, bytes[] calldata data) external payable returns (bytes[] memory results)'
];

const WETH_ABI = [
  'function deposit() payable',
  'function withdraw(uint256)',
  'function balanceOf(address) view returns (uint256)',
  'function approve(address spender, uint256 amount) returns (bool)',
  'function allowance(address owner, address spender) view returns (uint256)'
];

const ERC20_ABI = [
  'function balanceOf(address) view returns (uint256)',
  'function approve(address spender, uint256 amount) returns (bool)',
  'function allowance(address owner, address spender) view returns (uint256)'
];

// ═══════════════════════════════════════════════════════════════════════════════
// ESTADO DEL BOT
// ═══════════════════════════════════════════════════════════════════════════════

let state = {
  isRunning: false,
  isDryRun: false,
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
    currentChain: 'base',
    scanSpeed: 0,
    lastTradeTime: null
  },
  chains: [],
  tradeLogs: [],
  opportunities: [],
  banditStates: [
    { chain: 'base', alpha: 2, beta: 2, winRate: 50, selected: true },
    { chain: 'arbitrum', alpha: 2, beta: 2, winRate: 50, selected: false },
    { chain: 'optimism', alpha: 2, beta: 2, winRate: 50, selected: false }
  ]
};

let timer = null;
let providers = {};
let signers = {};
let isExecuting = false;

// ═══════════════════════════════════════════════════════════════════════════════
// INICIALIZAR CONEXIONES
// ═══════════════════════════════════════════════════════════════════════════════

async function initConnections() {
  console.log('[INIT] Inicializando conexiones...');
  
  for (const [key, chain] of Object.entries(CHAINS)) {
    try {
      providers[key] = new ethers.JsonRpcProvider(chain.rpc);
      signers[key] = new ethers.Wallet(PRIVATE_KEY, providers[key]);
      
      const balance = await providers[key].getBalance(WALLET_ADDRESS);
      const balanceEth = parseFloat(ethers.formatEther(balance));
      
      state.chains.push({
        chain: key,
        name: chain.name,
        chainId: chain.chainId,
        balance: balanceEth.toFixed(6),
        balanceUsd: balanceEth * CONFIG.ETH_PRICE_USD,
        routes: CONFIG.FEE_TIERS.length * CONFIG.TRADE_AMOUNTS_ETH.length,
        isActive: true,
        lastTick: Date.now(),
        explorer: chain.explorer
      });
      
      console.log(`[INIT] ✅ ${chain.name}: ${balanceEth.toFixed(6)} ETH`);
    } catch (e) {
      console.error(`[INIT] ❌ ${chain.name}: ${e.message}`);
    }
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// ESCANEO ULTRA-RÁPIDO
// ═══════════════════════════════════════════════════════════════════════════════

async function fastScan(chainKey) {
  const chain = CHAINS[chainKey];
  const provider = providers[chainKey];
  const opportunities = [];

  try {
    const quoter = new ethers.Contract(chain.quoter, QUOTER_ABI, provider);
    
    // Obtener gas price
    const feeData = await provider.getFeeData();
    const gasPrice = feeData.gasPrice || ethers.parseUnits('0.001', 'gwei');
    const gasCostWei = gasPrice * 200000n;
    const gasCostUsd = parseFloat(ethers.formatEther(gasCostWei)) * CONFIG.ETH_PRICE_USD;

    // Probar TODAS las combinaciones en paralelo
    const promises = [];
    
    for (const amountEth of CONFIG.TRADE_AMOUNTS_ETH) {
      const amount = ethers.parseEther(amountEth.toString());
      
      for (let i = 0; i < CONFIG.FEE_TIERS.length; i++) {
        for (let j = 0; j < CONFIG.FEE_TIERS.length; j++) {
          if (i === j) continue;
          
          promises.push(
            (async () => {
              try {
                // ETH -> USDC
                const quote1 = await quoter.quoteExactInputSingle.staticCall({
                  tokenIn: chain.tokens.WETH,
                  tokenOut: chain.tokens.USDC,
                  amountIn: amount,
                  fee: CONFIG.FEE_TIERS[i],
                  sqrtPriceLimitX96: 0n
                });
                const usdcOut = quote1[0];

                // USDC -> ETH
                const quote2 = await quoter.quoteExactInputSingle.staticCall({
                  tokenIn: chain.tokens.USDC,
                  tokenOut: chain.tokens.WETH,
                  amountIn: usdcOut,
                  fee: CONFIG.FEE_TIERS[j],
                  sqrtPriceLimitX96: 0n
                });
                const ethOut = quote2[0];

                const grossProfit = ethOut - amount;
                const netProfit = grossProfit - gasCostWei;

                if (netProfit > 0n) {
                  const netProfitUsd = parseFloat(ethers.formatEther(netProfit)) * CONFIG.ETH_PRICE_USD;
                  
                  return {
                    chain: chainKey,
                    route: `${CONFIG.FEE_TIERS[i]/100}%->${CONFIG.FEE_TIERS[j]/100}%`,
                    amountIn: amount,
                    amountInEth: amountEth,
                    fee1: CONFIG.FEE_TIERS[i],
                    fee2: CONFIG.FEE_TIERS[j],
                    usdcIntermediate: usdcOut,
                    ethOut: ethOut,
                    netProfit: netProfit,
                    netProfitUsd: netProfitUsd,
                    gasCost: gasCostUsd,
                    spreadBps: (Number(netProfit * 10000n / amount) / 100).toFixed(2),
                    timestamp: Date.now()
                  };
                }
              } catch (e) {
                // Pool no existe
              }
              return null;
            })()
          );
        }
      }
    }

    const results = await Promise.all(promises);
    opportunities.push(...results.filter(r => r !== null));

  } catch (e) {
    console.error(`[SCAN] Error ${chainKey}:`, e.message);
  }

  return opportunities;
}

// ═══════════════════════════════════════════════════════════════════════════════
// EJECUCIÓN RÁPIDA DE TRADE
// ═══════════════════════════════════════════════════════════════════════════════

async function executeTrade(opp) {
  if (isExecuting) {
    console.log('[EXEC] Ya hay una ejecución en progreso, saltando...');
    return null;
  }
  
  isExecuting = true;
  const chain = CHAINS[opp.chain];
  const signer = signers[opp.chain];
  const provider = providers[opp.chain];

  console.log(`\n🚀 [EXEC] EJECUTANDO TRADE en ${chain.name}`);
  console.log(`   Route: ${opp.route}`);
  console.log(`   Amount: ${opp.amountInEth} ETH`);
  console.log(`   Expected: $${opp.netProfitUsd.toFixed(4)}`);

  try {
    // Verificar balance
    const balance = await provider.getBalance(WALLET_ADDRESS);
    if (balance < opp.amountIn) {
      console.log(`   ❌ Balance insuficiente`);
      isExecuting = false;
      return { success: false, error: 'Balance insuficiente' };
    }

    const weth = new ethers.Contract(chain.tokens.WETH, WETH_ABI, signer);
    const router = new ethers.Contract(chain.router, ROUTER_ABI, signer);
    const usdc = new ethers.Contract(chain.tokens.USDC, ERC20_ABI, signer);

    // 1. Wrap ETH -> WETH
    console.log(`   📦 Wrapping ETH...`);
    const wrapTx = await weth.deposit({ 
      value: opp.amountIn,
      gasLimit: 50000
    });
    await wrapTx.wait(1);
    console.log(`   ✅ Wrap: ${wrapTx.hash.slice(0, 20)}...`);

    // 2. Approve si es necesario
    const allowance = await weth.allowance(WALLET_ADDRESS, chain.router);
    if (allowance < opp.amountIn) {
      console.log(`   🔓 Approving...`);
      const approveTx = await weth.approve(chain.router, ethers.MaxUint256, { gasLimit: 50000 });
      await approveTx.wait(1);
    }

    // 3. Swap WETH -> USDC
    console.log(`   🔄 Swap 1: WETH -> USDC...`);
    const minUsdc = (opp.usdcIntermediate * BigInt(10000 - CONFIG.MAX_SLIPPAGE_BPS)) / 10000n;
    
    const swap1Tx = await router.exactInputSingle({
      tokenIn: chain.tokens.WETH,
      tokenOut: chain.tokens.USDC,
      fee: opp.fee1,
      recipient: WALLET_ADDRESS,
      amountIn: opp.amountIn,
      amountOutMinimum: minUsdc,
      sqrtPriceLimitX96: 0n
    }, { gasLimit: 300000 });
    
    const receipt1 = await swap1Tx.wait(1);
    console.log(`   ✅ Swap 1: ${receipt1.hash.slice(0, 20)}...`);

    // 4. Approve USDC
    const usdcBalance = await usdc.balanceOf(WALLET_ADDRESS);
    const usdcAllowance = await usdc.allowance(WALLET_ADDRESS, chain.router);
    if (usdcAllowance < usdcBalance) {
      const approveUsdcTx = await usdc.approve(chain.router, ethers.MaxUint256, { gasLimit: 50000 });
      await approveUsdcTx.wait(1);
    }

    // 5. Swap USDC -> WETH
    console.log(`   🔄 Swap 2: USDC -> WETH...`);
    const minWeth = (opp.ethOut * BigInt(10000 - CONFIG.MAX_SLIPPAGE_BPS)) / 10000n;
    
    const swap2Tx = await router.exactInputSingle({
      tokenIn: chain.tokens.USDC,
      tokenOut: chain.tokens.WETH,
      fee: opp.fee2,
      recipient: WALLET_ADDRESS,
      amountIn: usdcBalance,
      amountOutMinimum: minWeth,
      sqrtPriceLimitX96: 0n
    }, { gasLimit: 300000 });
    
    const receipt2 = await swap2Tx.wait(1);
    console.log(`   ✅ Swap 2: ${receipt2.hash.slice(0, 20)}...`);

    // 6. Calcular profit real
    const finalWeth = await weth.balanceOf(WALLET_ADDRESS);
    const actualProfit = finalWeth - opp.amountIn;
    const actualProfitUsd = parseFloat(ethers.formatEther(actualProfit)) * CONFIG.ETH_PRICE_USD;

    console.log(`   💰 PROFIT: $${actualProfitUsd.toFixed(4)}`);
    console.log(`   🔗 TX: ${chain.explorer}/tx/${receipt2.hash}`);

    isExecuting = false;
    return {
      success: true,
      profitUsd: actualProfitUsd,
      txHash: receipt2.hash
    };

  } catch (e) {
    console.log(`   ❌ Error: ${e.message}`);
    isExecuting = false;
    return { success: false, error: e.message };
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// LOOP PRINCIPAL ULTRA-RÁPIDO
// ═══════════════════════════════════════════════════════════════════════════════

async function fastTick() {
  if (!state.isRunning || isExecuting) return;

  const tickStart = Date.now();
  state.stats.totalTicks++;
  state.stats.uptime = Math.floor((Date.now() - state.startTime) / 1000);

  // Seleccionar chain (round-robin para velocidad)
  const chainKeys = Object.keys(CHAINS);
  const chainIndex = state.stats.totalTicks % chainKeys.length;
  const selectedChain = chainKeys[chainIndex];
  state.stats.currentChain = selectedChain;

  // Actualizar bandit
  state.banditStates = state.banditStates.map(b => ({
    ...b,
    selected: b.chain === selectedChain
  }));

  try {
    // Escaneo rápido
    const opportunities = await fastScan(selectedChain);
    const scanTime = Date.now() - tickStart;
    state.stats.scanSpeed = scanTime;

    if (opportunities.length > 0) {
      // Ordenar por profit
      opportunities.sort((a, b) => b.netProfitUsd - a.netProfitUsd);
      const best = opportunities[0];

      // Guardar oportunidades
      state.opportunities = [...opportunities.slice(0, 5), ...state.opportunities].slice(0, 20);

      console.log(`[TICK ${state.stats.totalTicks}] ${CHAINS[selectedChain].name}: ${opportunities.length} opps, best: $${best.netProfitUsd.toFixed(4)} (${scanTime}ms)`);

      // Ejecutar si profit > umbral y NO es dry run
      if (best.netProfitUsd >= CONFIG.MIN_PROFIT_USD && !state.isDryRun && CONFIG.AUTO_EXECUTE) {
        console.log(`[EXEC] Profit $${best.netProfitUsd.toFixed(4)} >= $${CONFIG.MIN_PROFIT_USD}, ejecutando...`);
        
        const result = await executeTrade(best);
        state.stats.totalTrades++;
        state.stats.lastTradeTime = Date.now();

        if (result && result.success) {
          state.stats.successfulTrades++;
          state.stats.totalProfitUsd += result.profitUsd;
          state.stats.netProfitUsd = state.stats.totalProfitUsd;

          state.tradeLogs.unshift({
            id: `tx-${Date.now()}`,
            timestamp: Date.now(),
            chain: best.chain,
            route: best.route,
            amountIn: best.amountInEth,
            amountOut: ethers.formatEther(best.ethOut),
            profit: result.profitUsd.toFixed(4),
            gasCost: best.gasCost.toFixed(4),
            netProfit: result.profitUsd.toFixed(4),
            txHash: result.txHash,
            status: 'success'
          });

          // Actualizar bandit
          const bandit = state.banditStates.find(b => b.chain === selectedChain);
          if (bandit) {
            bandit.alpha += 1;
            bandit.winRate = (bandit.alpha / (bandit.alpha + bandit.beta) * 100);
          }
        } else {
          state.tradeLogs.unshift({
            id: `tx-${Date.now()}`,
            timestamp: Date.now(),
            chain: best.chain,
            route: best.route,
            amountIn: best.amountInEth,
            amountOut: '0',
            profit: '0',
            gasCost: best.gasCost.toFixed(4),
            netProfit: '0',
            txHash: '',
            status: 'failed'
          });

          const bandit = state.banditStates.find(b => b.chain === selectedChain);
          if (bandit) {
            bandit.beta += 1;
            bandit.winRate = (bandit.alpha / (bandit.alpha + bandit.beta) * 100);
          }
        }

        state.stats.winRate = state.stats.totalTrades > 0
          ? (state.stats.successfulTrades / state.stats.totalTrades * 100)
          : 0;

        if (state.tradeLogs.length > 100) state.tradeLogs.pop();
      }
    } else {
      // Log cada 10 ticks si no hay oportunidades
      if (state.stats.totalTicks % 10 === 0) {
        console.log(`[TICK ${state.stats.totalTicks}] ${CHAINS[selectedChain].name}: No profitable opps (${scanTime}ms)`);
      }
    }

    // Actualizar balances cada 20 ticks
    if (state.stats.totalTicks % 20 === 0) {
      for (const [key, chain] of Object.entries(CHAINS)) {
        try {
          const balance = await providers[key].getBalance(WALLET_ADDRESS);
          const balanceEth = parseFloat(ethers.formatEther(balance));
          const chainState = state.chains.find(c => c.chain === key);
          if (chainState) {
            chainState.balance = balanceEth.toFixed(6);
            chainState.balanceUsd = balanceEth * CONFIG.ETH_PRICE_USD;
            chainState.lastTick = Date.now();
          }
        } catch (e) {}
      }
    }

  } catch (e) {
    console.error(`[TICK] Error:`, e.message);
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// RUTAS API
// ═══════════════════════════════════════════════════════════════════════════════

app.get('/api/defi/multichain-arb/status', (req, res) => {
  res.json(state);
});

app.post('/api/defi/multichain-arb/start', async (req, res) => {
  console.log('[API] POST /start');

  if (state.isRunning) {
    return res.json({ success: false, error: 'Ya corriendo', isRunning: true });
  }

  state.isDryRun = req.body?.dryRun === true;
  state.isRunning = true;
  state.startTime = Date.now();
  state.stats.totalTicks = 0;
  state.stats.totalTrades = 0;
  state.stats.successfulTrades = 0;
  state.stats.totalProfitUsd = 0;
  state.stats.netProfitUsd = 0;
  state.stats.winRate = 0;
  state.stats.uptime = 0;
  state.tradeLogs = [];
  state.opportunities = [];

  // Iniciar loop ULTRA-RÁPIDO
  if (timer) clearInterval(timer);
  timer = setInterval(fastTick, CONFIG.TICK_INTERVAL_MS);

  console.log(`\n[START] Bot iniciado - ${state.isDryRun ? 'DRY RUN' : '⚠️ MODO REAL'}`);
  console.log(`[CONFIG] Intervalo: ${CONFIG.TICK_INTERVAL_MS}ms, Min profit: $${CONFIG.MIN_PROFIT_USD}`);

  res.json({ 
    success: true, 
    isRunning: true, 
    isDryRun: state.isDryRun,
    config: {
      tickInterval: CONFIG.TICK_INTERVAL_MS,
      minProfit: CONFIG.MIN_PROFIT_USD,
      autoExecute: CONFIG.AUTO_EXECUTE
    }
  });
});

app.post('/api/defi/multichain-arb/stop', (req, res) => {
  console.log('[API] POST /stop');
  state.isRunning = false;
  if (timer) { clearInterval(timer); timer = null; }
  res.json({ success: true, isRunning: false });
});

app.post('/api/defi/multichain-arb/reset', (req, res) => {
  state.stats = {
    totalTicks: 0, totalTrades: 0, successfulTrades: 0,
    totalProfitUsd: 0, totalGasUsd: 0, netProfitUsd: 0,
    winRate: 0, uptime: 0, currentChain: 'base', scanSpeed: 0, lastTradeTime: null
  };
  state.tradeLogs = [];
  state.opportunities = [];
  res.json({ success: true });
});

app.get('/api/defi/multichain-arb/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    port: PORT, 
    running: state.isRunning,
    mode: state.isDryRun ? 'DRY_RUN' : 'LIVE',
    wallet: WALLET_ADDRESS,
    config: CONFIG
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// INICIAR SERVIDOR
// ═══════════════════════════════════════════════════════════════════════════════

app.listen(PORT, async () => {
  console.log(`
╔═══════════════════════════════════════════════════════════════════════════════╗
║                                                                               ║
║   🚀 BOT ARBITRAJE ULTRA-RÁPIDO                                               ║
║                                                                               ║
║   ✅ Puerto: ${PORT}                                                           ║
║   ✅ Wallet: ${WALLET_ADDRESS.slice(0, 10)}...${WALLET_ADDRESS.slice(-5)}                                  ║
║   ✅ Intervalo: ${CONFIG.TICK_INTERVAL_MS}ms (${(1000/CONFIG.TICK_INTERVAL_MS).toFixed(1)} scans/seg)                              ║
║   ✅ Min Profit: $${CONFIG.MIN_PROFIT_USD}                                                 ║
║   ✅ Auto Execute: ${CONFIG.AUTO_EXECUTE}                                               ║
║                                                                               ║
║   ⚠️  MODO AGRESIVO - Alta frecuencia de trading                              ║
║                                                                               ║
╚═══════════════════════════════════════════════════════════════════════════════╝
  `);

  await initConnections();
  console.log('\n[READY] Bot listo. Usa POST /start para iniciar.\n');
});

process.on('SIGINT', () => {
  console.log('\n[EXIT] Cerrando...');
  if (timer) clearInterval(timer);
  process.exit(0);
});


 * ═══════════════════════════════════════════════════════════════════════════════
 * BOT ARBITRAJE ULTRA-RÁPIDO - ALTA FRECUENCIA
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * Configuración AGRESIVA:
 * - Escaneo cada 500ms (2x por segundo)
 * - Umbral de profit muy bajo ($0.01)
 * - Múltiples rutas simultáneas
 * - Ejecución inmediata
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
// CONFIGURACIÓN AGRESIVA
// ═══════════════════════════════════════════════════════════════════════════════

const CONFIG = {
  TICK_INTERVAL_MS: 500,        // Escanear cada 500ms (ULTRA RÁPIDO)
  MIN_PROFIT_USD: 0.01,         // Profit mínimo $0.01 (MUY BAJO)
  MAX_SLIPPAGE_BPS: 100,        // 1% slippage permitido
  GAS_MULTIPLIER: 1.5,          // Multiplicador de gas
  TRADE_AMOUNTS_ETH: [0.003, 0.005, 0.008, 0.01, 0.015, 0.02], // Cantidades a probar
  FEE_TIERS: [100, 500, 3000, 10000], // Todos los fee tiers
  PARALLEL_SCANS: true,         // Escanear todas las chains en paralelo
  AUTO_EXECUTE: true,           // Ejecutar automáticamente
  ETH_PRICE_USD: 3500           // Precio ETH aproximado
};

const PRIVATE_KEY = process.env.VITE_ETH_PRIVATE_KEY;
const WALLET_ADDRESS = process.env.VITE_ETH_WALLET_ADDRESS;

if (!PRIVATE_KEY || !WALLET_ADDRESS) {
  console.error('❌ ERROR: Credenciales no configuradas en .env');
  process.exit(1);
}

// ═══════════════════════════════════════════════════════════════════════════════
// CHAINS Y CONTRATOS
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
  },
  optimism: {
    name: 'Optimism',
    chainId: 10,
    rpc: 'https://mainnet.optimism.io',
    explorer: 'https://optimistic.etherscan.io',
    tokens: {
      WETH: '0x4200000000000000000000000000000000000006',
      USDC: '0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85'
    },
    quoter: '0x61fFE014bA17989E743c5F6cB21bF9697530B21e',
    router: '0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45'
  }
};

// ABIs
const QUOTER_ABI = [
  'function quoteExactInputSingle((address tokenIn, address tokenOut, uint256 amountIn, uint24 fee, uint160 sqrtPriceLimitX96)) external returns (uint256 amountOut, uint160 sqrtPriceX96After, uint32 initializedTicksCrossed, uint256 gasEstimate)'
];

const ROUTER_ABI = [
  'function exactInputSingle((address tokenIn, address tokenOut, uint24 fee, address recipient, uint256 amountIn, uint256 amountOutMinimum, uint160 sqrtPriceLimitX96)) external payable returns (uint256 amountOut)',
  'function multicall(uint256 deadline, bytes[] calldata data) external payable returns (bytes[] memory results)'
];

const WETH_ABI = [
  'function deposit() payable',
  'function withdraw(uint256)',
  'function balanceOf(address) view returns (uint256)',
  'function approve(address spender, uint256 amount) returns (bool)',
  'function allowance(address owner, address spender) view returns (uint256)'
];

const ERC20_ABI = [
  'function balanceOf(address) view returns (uint256)',
  'function approve(address spender, uint256 amount) returns (bool)',
  'function allowance(address owner, address spender) view returns (uint256)'
];

// ═══════════════════════════════════════════════════════════════════════════════
// ESTADO DEL BOT
// ═══════════════════════════════════════════════════════════════════════════════

let state = {
  isRunning: false,
  isDryRun: false,
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
    currentChain: 'base',
    scanSpeed: 0,
    lastTradeTime: null
  },
  chains: [],
  tradeLogs: [],
  opportunities: [],
  banditStates: [
    { chain: 'base', alpha: 2, beta: 2, winRate: 50, selected: true },
    { chain: 'arbitrum', alpha: 2, beta: 2, winRate: 50, selected: false },
    { chain: 'optimism', alpha: 2, beta: 2, winRate: 50, selected: false }
  ]
};

let timer = null;
let providers = {};
let signers = {};
let isExecuting = false;

// ═══════════════════════════════════════════════════════════════════════════════
// INICIALIZAR CONEXIONES
// ═══════════════════════════════════════════════════════════════════════════════

async function initConnections() {
  console.log('[INIT] Inicializando conexiones...');
  
  for (const [key, chain] of Object.entries(CHAINS)) {
    try {
      providers[key] = new ethers.JsonRpcProvider(chain.rpc);
      signers[key] = new ethers.Wallet(PRIVATE_KEY, providers[key]);
      
      const balance = await providers[key].getBalance(WALLET_ADDRESS);
      const balanceEth = parseFloat(ethers.formatEther(balance));
      
      state.chains.push({
        chain: key,
        name: chain.name,
        chainId: chain.chainId,
        balance: balanceEth.toFixed(6),
        balanceUsd: balanceEth * CONFIG.ETH_PRICE_USD,
        routes: CONFIG.FEE_TIERS.length * CONFIG.TRADE_AMOUNTS_ETH.length,
        isActive: true,
        lastTick: Date.now(),
        explorer: chain.explorer
      });
      
      console.log(`[INIT] ✅ ${chain.name}: ${balanceEth.toFixed(6)} ETH`);
    } catch (e) {
      console.error(`[INIT] ❌ ${chain.name}: ${e.message}`);
    }
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// ESCANEO ULTRA-RÁPIDO
// ═══════════════════════════════════════════════════════════════════════════════

async function fastScan(chainKey) {
  const chain = CHAINS[chainKey];
  const provider = providers[chainKey];
  const opportunities = [];

  try {
    const quoter = new ethers.Contract(chain.quoter, QUOTER_ABI, provider);
    
    // Obtener gas price
    const feeData = await provider.getFeeData();
    const gasPrice = feeData.gasPrice || ethers.parseUnits('0.001', 'gwei');
    const gasCostWei = gasPrice * 200000n;
    const gasCostUsd = parseFloat(ethers.formatEther(gasCostWei)) * CONFIG.ETH_PRICE_USD;

    // Probar TODAS las combinaciones en paralelo
    const promises = [];
    
    for (const amountEth of CONFIG.TRADE_AMOUNTS_ETH) {
      const amount = ethers.parseEther(amountEth.toString());
      
      for (let i = 0; i < CONFIG.FEE_TIERS.length; i++) {
        for (let j = 0; j < CONFIG.FEE_TIERS.length; j++) {
          if (i === j) continue;
          
          promises.push(
            (async () => {
              try {
                // ETH -> USDC
                const quote1 = await quoter.quoteExactInputSingle.staticCall({
                  tokenIn: chain.tokens.WETH,
                  tokenOut: chain.tokens.USDC,
                  amountIn: amount,
                  fee: CONFIG.FEE_TIERS[i],
                  sqrtPriceLimitX96: 0n
                });
                const usdcOut = quote1[0];

                // USDC -> ETH
                const quote2 = await quoter.quoteExactInputSingle.staticCall({
                  tokenIn: chain.tokens.USDC,
                  tokenOut: chain.tokens.WETH,
                  amountIn: usdcOut,
                  fee: CONFIG.FEE_TIERS[j],
                  sqrtPriceLimitX96: 0n
                });
                const ethOut = quote2[0];

                const grossProfit = ethOut - amount;
                const netProfit = grossProfit - gasCostWei;

                if (netProfit > 0n) {
                  const netProfitUsd = parseFloat(ethers.formatEther(netProfit)) * CONFIG.ETH_PRICE_USD;
                  
                  return {
                    chain: chainKey,
                    route: `${CONFIG.FEE_TIERS[i]/100}%->${CONFIG.FEE_TIERS[j]/100}%`,
                    amountIn: amount,
                    amountInEth: amountEth,
                    fee1: CONFIG.FEE_TIERS[i],
                    fee2: CONFIG.FEE_TIERS[j],
                    usdcIntermediate: usdcOut,
                    ethOut: ethOut,
                    netProfit: netProfit,
                    netProfitUsd: netProfitUsd,
                    gasCost: gasCostUsd,
                    spreadBps: (Number(netProfit * 10000n / amount) / 100).toFixed(2),
                    timestamp: Date.now()
                  };
                }
              } catch (e) {
                // Pool no existe
              }
              return null;
            })()
          );
        }
      }
    }

    const results = await Promise.all(promises);
    opportunities.push(...results.filter(r => r !== null));

  } catch (e) {
    console.error(`[SCAN] Error ${chainKey}:`, e.message);
  }

  return opportunities;
}

// ═══════════════════════════════════════════════════════════════════════════════
// EJECUCIÓN RÁPIDA DE TRADE
// ═══════════════════════════════════════════════════════════════════════════════

async function executeTrade(opp) {
  if (isExecuting) {
    console.log('[EXEC] Ya hay una ejecución en progreso, saltando...');
    return null;
  }
  
  isExecuting = true;
  const chain = CHAINS[opp.chain];
  const signer = signers[opp.chain];
  const provider = providers[opp.chain];

  console.log(`\n🚀 [EXEC] EJECUTANDO TRADE en ${chain.name}`);
  console.log(`   Route: ${opp.route}`);
  console.log(`   Amount: ${opp.amountInEth} ETH`);
  console.log(`   Expected: $${opp.netProfitUsd.toFixed(4)}`);

  try {
    // Verificar balance
    const balance = await provider.getBalance(WALLET_ADDRESS);
    if (balance < opp.amountIn) {
      console.log(`   ❌ Balance insuficiente`);
      isExecuting = false;
      return { success: false, error: 'Balance insuficiente' };
    }

    const weth = new ethers.Contract(chain.tokens.WETH, WETH_ABI, signer);
    const router = new ethers.Contract(chain.router, ROUTER_ABI, signer);
    const usdc = new ethers.Contract(chain.tokens.USDC, ERC20_ABI, signer);

    // 1. Wrap ETH -> WETH
    console.log(`   📦 Wrapping ETH...`);
    const wrapTx = await weth.deposit({ 
      value: opp.amountIn,
      gasLimit: 50000
    });
    await wrapTx.wait(1);
    console.log(`   ✅ Wrap: ${wrapTx.hash.slice(0, 20)}...`);

    // 2. Approve si es necesario
    const allowance = await weth.allowance(WALLET_ADDRESS, chain.router);
    if (allowance < opp.amountIn) {
      console.log(`   🔓 Approving...`);
      const approveTx = await weth.approve(chain.router, ethers.MaxUint256, { gasLimit: 50000 });
      await approveTx.wait(1);
    }

    // 3. Swap WETH -> USDC
    console.log(`   🔄 Swap 1: WETH -> USDC...`);
    const minUsdc = (opp.usdcIntermediate * BigInt(10000 - CONFIG.MAX_SLIPPAGE_BPS)) / 10000n;
    
    const swap1Tx = await router.exactInputSingle({
      tokenIn: chain.tokens.WETH,
      tokenOut: chain.tokens.USDC,
      fee: opp.fee1,
      recipient: WALLET_ADDRESS,
      amountIn: opp.amountIn,
      amountOutMinimum: minUsdc,
      sqrtPriceLimitX96: 0n
    }, { gasLimit: 300000 });
    
    const receipt1 = await swap1Tx.wait(1);
    console.log(`   ✅ Swap 1: ${receipt1.hash.slice(0, 20)}...`);

    // 4. Approve USDC
    const usdcBalance = await usdc.balanceOf(WALLET_ADDRESS);
    const usdcAllowance = await usdc.allowance(WALLET_ADDRESS, chain.router);
    if (usdcAllowance < usdcBalance) {
      const approveUsdcTx = await usdc.approve(chain.router, ethers.MaxUint256, { gasLimit: 50000 });
      await approveUsdcTx.wait(1);
    }

    // 5. Swap USDC -> WETH
    console.log(`   🔄 Swap 2: USDC -> WETH...`);
    const minWeth = (opp.ethOut * BigInt(10000 - CONFIG.MAX_SLIPPAGE_BPS)) / 10000n;
    
    const swap2Tx = await router.exactInputSingle({
      tokenIn: chain.tokens.USDC,
      tokenOut: chain.tokens.WETH,
      fee: opp.fee2,
      recipient: WALLET_ADDRESS,
      amountIn: usdcBalance,
      amountOutMinimum: minWeth,
      sqrtPriceLimitX96: 0n
    }, { gasLimit: 300000 });
    
    const receipt2 = await swap2Tx.wait(1);
    console.log(`   ✅ Swap 2: ${receipt2.hash.slice(0, 20)}...`);

    // 6. Calcular profit real
    const finalWeth = await weth.balanceOf(WALLET_ADDRESS);
    const actualProfit = finalWeth - opp.amountIn;
    const actualProfitUsd = parseFloat(ethers.formatEther(actualProfit)) * CONFIG.ETH_PRICE_USD;

    console.log(`   💰 PROFIT: $${actualProfitUsd.toFixed(4)}`);
    console.log(`   🔗 TX: ${chain.explorer}/tx/${receipt2.hash}`);

    isExecuting = false;
    return {
      success: true,
      profitUsd: actualProfitUsd,
      txHash: receipt2.hash
    };

  } catch (e) {
    console.log(`   ❌ Error: ${e.message}`);
    isExecuting = false;
    return { success: false, error: e.message };
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// LOOP PRINCIPAL ULTRA-RÁPIDO
// ═══════════════════════════════════════════════════════════════════════════════

async function fastTick() {
  if (!state.isRunning || isExecuting) return;

  const tickStart = Date.now();
  state.stats.totalTicks++;
  state.stats.uptime = Math.floor((Date.now() - state.startTime) / 1000);

  // Seleccionar chain (round-robin para velocidad)
  const chainKeys = Object.keys(CHAINS);
  const chainIndex = state.stats.totalTicks % chainKeys.length;
  const selectedChain = chainKeys[chainIndex];
  state.stats.currentChain = selectedChain;

  // Actualizar bandit
  state.banditStates = state.banditStates.map(b => ({
    ...b,
    selected: b.chain === selectedChain
  }));

  try {
    // Escaneo rápido
    const opportunities = await fastScan(selectedChain);
    const scanTime = Date.now() - tickStart;
    state.stats.scanSpeed = scanTime;

    if (opportunities.length > 0) {
      // Ordenar por profit
      opportunities.sort((a, b) => b.netProfitUsd - a.netProfitUsd);
      const best = opportunities[0];

      // Guardar oportunidades
      state.opportunities = [...opportunities.slice(0, 5), ...state.opportunities].slice(0, 20);

      console.log(`[TICK ${state.stats.totalTicks}] ${CHAINS[selectedChain].name}: ${opportunities.length} opps, best: $${best.netProfitUsd.toFixed(4)} (${scanTime}ms)`);

      // Ejecutar si profit > umbral y NO es dry run
      if (best.netProfitUsd >= CONFIG.MIN_PROFIT_USD && !state.isDryRun && CONFIG.AUTO_EXECUTE) {
        console.log(`[EXEC] Profit $${best.netProfitUsd.toFixed(4)} >= $${CONFIG.MIN_PROFIT_USD}, ejecutando...`);
        
        const result = await executeTrade(best);
        state.stats.totalTrades++;
        state.stats.lastTradeTime = Date.now();

        if (result && result.success) {
          state.stats.successfulTrades++;
          state.stats.totalProfitUsd += result.profitUsd;
          state.stats.netProfitUsd = state.stats.totalProfitUsd;

          state.tradeLogs.unshift({
            id: `tx-${Date.now()}`,
            timestamp: Date.now(),
            chain: best.chain,
            route: best.route,
            amountIn: best.amountInEth,
            amountOut: ethers.formatEther(best.ethOut),
            profit: result.profitUsd.toFixed(4),
            gasCost: best.gasCost.toFixed(4),
            netProfit: result.profitUsd.toFixed(4),
            txHash: result.txHash,
            status: 'success'
          });

          // Actualizar bandit
          const bandit = state.banditStates.find(b => b.chain === selectedChain);
          if (bandit) {
            bandit.alpha += 1;
            bandit.winRate = (bandit.alpha / (bandit.alpha + bandit.beta) * 100);
          }
        } else {
          state.tradeLogs.unshift({
            id: `tx-${Date.now()}`,
            timestamp: Date.now(),
            chain: best.chain,
            route: best.route,
            amountIn: best.amountInEth,
            amountOut: '0',
            profit: '0',
            gasCost: best.gasCost.toFixed(4),
            netProfit: '0',
            txHash: '',
            status: 'failed'
          });

          const bandit = state.banditStates.find(b => b.chain === selectedChain);
          if (bandit) {
            bandit.beta += 1;
            bandit.winRate = (bandit.alpha / (bandit.alpha + bandit.beta) * 100);
          }
        }

        state.stats.winRate = state.stats.totalTrades > 0
          ? (state.stats.successfulTrades / state.stats.totalTrades * 100)
          : 0;

        if (state.tradeLogs.length > 100) state.tradeLogs.pop();
      }
    } else {
      // Log cada 10 ticks si no hay oportunidades
      if (state.stats.totalTicks % 10 === 0) {
        console.log(`[TICK ${state.stats.totalTicks}] ${CHAINS[selectedChain].name}: No profitable opps (${scanTime}ms)`);
      }
    }

    // Actualizar balances cada 20 ticks
    if (state.stats.totalTicks % 20 === 0) {
      for (const [key, chain] of Object.entries(CHAINS)) {
        try {
          const balance = await providers[key].getBalance(WALLET_ADDRESS);
          const balanceEth = parseFloat(ethers.formatEther(balance));
          const chainState = state.chains.find(c => c.chain === key);
          if (chainState) {
            chainState.balance = balanceEth.toFixed(6);
            chainState.balanceUsd = balanceEth * CONFIG.ETH_PRICE_USD;
            chainState.lastTick = Date.now();
          }
        } catch (e) {}
      }
    }

  } catch (e) {
    console.error(`[TICK] Error:`, e.message);
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// RUTAS API
// ═══════════════════════════════════════════════════════════════════════════════

app.get('/api/defi/multichain-arb/status', (req, res) => {
  res.json(state);
});

app.post('/api/defi/multichain-arb/start', async (req, res) => {
  console.log('[API] POST /start');

  if (state.isRunning) {
    return res.json({ success: false, error: 'Ya corriendo', isRunning: true });
  }

  state.isDryRun = req.body?.dryRun === true;
  state.isRunning = true;
  state.startTime = Date.now();
  state.stats.totalTicks = 0;
  state.stats.totalTrades = 0;
  state.stats.successfulTrades = 0;
  state.stats.totalProfitUsd = 0;
  state.stats.netProfitUsd = 0;
  state.stats.winRate = 0;
  state.stats.uptime = 0;
  state.tradeLogs = [];
  state.opportunities = [];

  // Iniciar loop ULTRA-RÁPIDO
  if (timer) clearInterval(timer);
  timer = setInterval(fastTick, CONFIG.TICK_INTERVAL_MS);

  console.log(`\n[START] Bot iniciado - ${state.isDryRun ? 'DRY RUN' : '⚠️ MODO REAL'}`);
  console.log(`[CONFIG] Intervalo: ${CONFIG.TICK_INTERVAL_MS}ms, Min profit: $${CONFIG.MIN_PROFIT_USD}`);

  res.json({ 
    success: true, 
    isRunning: true, 
    isDryRun: state.isDryRun,
    config: {
      tickInterval: CONFIG.TICK_INTERVAL_MS,
      minProfit: CONFIG.MIN_PROFIT_USD,
      autoExecute: CONFIG.AUTO_EXECUTE
    }
  });
});

app.post('/api/defi/multichain-arb/stop', (req, res) => {
  console.log('[API] POST /stop');
  state.isRunning = false;
  if (timer) { clearInterval(timer); timer = null; }
  res.json({ success: true, isRunning: false });
});

app.post('/api/defi/multichain-arb/reset', (req, res) => {
  state.stats = {
    totalTicks: 0, totalTrades: 0, successfulTrades: 0,
    totalProfitUsd: 0, totalGasUsd: 0, netProfitUsd: 0,
    winRate: 0, uptime: 0, currentChain: 'base', scanSpeed: 0, lastTradeTime: null
  };
  state.tradeLogs = [];
  state.opportunities = [];
  res.json({ success: true });
});

app.get('/api/defi/multichain-arb/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    port: PORT, 
    running: state.isRunning,
    mode: state.isDryRun ? 'DRY_RUN' : 'LIVE',
    wallet: WALLET_ADDRESS,
    config: CONFIG
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// INICIAR SERVIDOR
// ═══════════════════════════════════════════════════════════════════════════════

app.listen(PORT, async () => {
  console.log(`
╔═══════════════════════════════════════════════════════════════════════════════╗
║                                                                               ║
║   🚀 BOT ARBITRAJE ULTRA-RÁPIDO                                               ║
║                                                                               ║
║   ✅ Puerto: ${PORT}                                                           ║
║   ✅ Wallet: ${WALLET_ADDRESS.slice(0, 10)}...${WALLET_ADDRESS.slice(-5)}                                  ║
║   ✅ Intervalo: ${CONFIG.TICK_INTERVAL_MS}ms (${(1000/CONFIG.TICK_INTERVAL_MS).toFixed(1)} scans/seg)                              ║
║   ✅ Min Profit: $${CONFIG.MIN_PROFIT_USD}                                                 ║
║   ✅ Auto Execute: ${CONFIG.AUTO_EXECUTE}                                               ║
║                                                                               ║
║   ⚠️  MODO AGRESIVO - Alta frecuencia de trading                              ║
║                                                                               ║
╚═══════════════════════════════════════════════════════════════════════════════╝
  `);

  await initConnections();
  console.log('\n[READY] Bot listo. Usa POST /start para iniciar.\n');
});

process.on('SIGINT', () => {
  console.log('\n[EXIT] Cerrando...');
  if (timer) clearInterval(timer);
  process.exit(0);
});



 * ═══════════════════════════════════════════════════════════════════════════════
 * BOT ARBITRAJE ULTRA-RÁPIDO - ALTA FRECUENCIA
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * Configuración AGRESIVA:
 * - Escaneo cada 500ms (2x por segundo)
 * - Umbral de profit muy bajo ($0.01)
 * - Múltiples rutas simultáneas
 * - Ejecución inmediata
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
// CONFIGURACIÓN AGRESIVA
// ═══════════════════════════════════════════════════════════════════════════════

const CONFIG = {
  TICK_INTERVAL_MS: 500,        // Escanear cada 500ms (ULTRA RÁPIDO)
  MIN_PROFIT_USD: 0.01,         // Profit mínimo $0.01 (MUY BAJO)
  MAX_SLIPPAGE_BPS: 100,        // 1% slippage permitido
  GAS_MULTIPLIER: 1.5,          // Multiplicador de gas
  TRADE_AMOUNTS_ETH: [0.003, 0.005, 0.008, 0.01, 0.015, 0.02], // Cantidades a probar
  FEE_TIERS: [100, 500, 3000, 10000], // Todos los fee tiers
  PARALLEL_SCANS: true,         // Escanear todas las chains en paralelo
  AUTO_EXECUTE: true,           // Ejecutar automáticamente
  ETH_PRICE_USD: 3500           // Precio ETH aproximado
};

const PRIVATE_KEY = process.env.VITE_ETH_PRIVATE_KEY;
const WALLET_ADDRESS = process.env.VITE_ETH_WALLET_ADDRESS;

if (!PRIVATE_KEY || !WALLET_ADDRESS) {
  console.error('❌ ERROR: Credenciales no configuradas en .env');
  process.exit(1);
}

// ═══════════════════════════════════════════════════════════════════════════════
// CHAINS Y CONTRATOS
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
  },
  optimism: {
    name: 'Optimism',
    chainId: 10,
    rpc: 'https://mainnet.optimism.io',
    explorer: 'https://optimistic.etherscan.io',
    tokens: {
      WETH: '0x4200000000000000000000000000000000000006',
      USDC: '0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85'
    },
    quoter: '0x61fFE014bA17989E743c5F6cB21bF9697530B21e',
    router: '0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45'
  }
};

// ABIs
const QUOTER_ABI = [
  'function quoteExactInputSingle((address tokenIn, address tokenOut, uint256 amountIn, uint24 fee, uint160 sqrtPriceLimitX96)) external returns (uint256 amountOut, uint160 sqrtPriceX96After, uint32 initializedTicksCrossed, uint256 gasEstimate)'
];

const ROUTER_ABI = [
  'function exactInputSingle((address tokenIn, address tokenOut, uint24 fee, address recipient, uint256 amountIn, uint256 amountOutMinimum, uint160 sqrtPriceLimitX96)) external payable returns (uint256 amountOut)',
  'function multicall(uint256 deadline, bytes[] calldata data) external payable returns (bytes[] memory results)'
];

const WETH_ABI = [
  'function deposit() payable',
  'function withdraw(uint256)',
  'function balanceOf(address) view returns (uint256)',
  'function approve(address spender, uint256 amount) returns (bool)',
  'function allowance(address owner, address spender) view returns (uint256)'
];

const ERC20_ABI = [
  'function balanceOf(address) view returns (uint256)',
  'function approve(address spender, uint256 amount) returns (bool)',
  'function allowance(address owner, address spender) view returns (uint256)'
];

// ═══════════════════════════════════════════════════════════════════════════════
// ESTADO DEL BOT
// ═══════════════════════════════════════════════════════════════════════════════

let state = {
  isRunning: false,
  isDryRun: false,
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
    currentChain: 'base',
    scanSpeed: 0,
    lastTradeTime: null
  },
  chains: [],
  tradeLogs: [],
  opportunities: [],
  banditStates: [
    { chain: 'base', alpha: 2, beta: 2, winRate: 50, selected: true },
    { chain: 'arbitrum', alpha: 2, beta: 2, winRate: 50, selected: false },
    { chain: 'optimism', alpha: 2, beta: 2, winRate: 50, selected: false }
  ]
};

let timer = null;
let providers = {};
let signers = {};
let isExecuting = false;

// ═══════════════════════════════════════════════════════════════════════════════
// INICIALIZAR CONEXIONES
// ═══════════════════════════════════════════════════════════════════════════════

async function initConnections() {
  console.log('[INIT] Inicializando conexiones...');
  
  for (const [key, chain] of Object.entries(CHAINS)) {
    try {
      providers[key] = new ethers.JsonRpcProvider(chain.rpc);
      signers[key] = new ethers.Wallet(PRIVATE_KEY, providers[key]);
      
      const balance = await providers[key].getBalance(WALLET_ADDRESS);
      const balanceEth = parseFloat(ethers.formatEther(balance));
      
      state.chains.push({
        chain: key,
        name: chain.name,
        chainId: chain.chainId,
        balance: balanceEth.toFixed(6),
        balanceUsd: balanceEth * CONFIG.ETH_PRICE_USD,
        routes: CONFIG.FEE_TIERS.length * CONFIG.TRADE_AMOUNTS_ETH.length,
        isActive: true,
        lastTick: Date.now(),
        explorer: chain.explorer
      });
      
      console.log(`[INIT] ✅ ${chain.name}: ${balanceEth.toFixed(6)} ETH`);
    } catch (e) {
      console.error(`[INIT] ❌ ${chain.name}: ${e.message}`);
    }
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// ESCANEO ULTRA-RÁPIDO
// ═══════════════════════════════════════════════════════════════════════════════

async function fastScan(chainKey) {
  const chain = CHAINS[chainKey];
  const provider = providers[chainKey];
  const opportunities = [];

  try {
    const quoter = new ethers.Contract(chain.quoter, QUOTER_ABI, provider);
    
    // Obtener gas price
    const feeData = await provider.getFeeData();
    const gasPrice = feeData.gasPrice || ethers.parseUnits('0.001', 'gwei');
    const gasCostWei = gasPrice * 200000n;
    const gasCostUsd = parseFloat(ethers.formatEther(gasCostWei)) * CONFIG.ETH_PRICE_USD;

    // Probar TODAS las combinaciones en paralelo
    const promises = [];
    
    for (const amountEth of CONFIG.TRADE_AMOUNTS_ETH) {
      const amount = ethers.parseEther(amountEth.toString());
      
      for (let i = 0; i < CONFIG.FEE_TIERS.length; i++) {
        for (let j = 0; j < CONFIG.FEE_TIERS.length; j++) {
          if (i === j) continue;
          
          promises.push(
            (async () => {
              try {
                // ETH -> USDC
                const quote1 = await quoter.quoteExactInputSingle.staticCall({
                  tokenIn: chain.tokens.WETH,
                  tokenOut: chain.tokens.USDC,
                  amountIn: amount,
                  fee: CONFIG.FEE_TIERS[i],
                  sqrtPriceLimitX96: 0n
                });
                const usdcOut = quote1[0];

                // USDC -> ETH
                const quote2 = await quoter.quoteExactInputSingle.staticCall({
                  tokenIn: chain.tokens.USDC,
                  tokenOut: chain.tokens.WETH,
                  amountIn: usdcOut,
                  fee: CONFIG.FEE_TIERS[j],
                  sqrtPriceLimitX96: 0n
                });
                const ethOut = quote2[0];

                const grossProfit = ethOut - amount;
                const netProfit = grossProfit - gasCostWei;

                if (netProfit > 0n) {
                  const netProfitUsd = parseFloat(ethers.formatEther(netProfit)) * CONFIG.ETH_PRICE_USD;
                  
                  return {
                    chain: chainKey,
                    route: `${CONFIG.FEE_TIERS[i]/100}%->${CONFIG.FEE_TIERS[j]/100}%`,
                    amountIn: amount,
                    amountInEth: amountEth,
                    fee1: CONFIG.FEE_TIERS[i],
                    fee2: CONFIG.FEE_TIERS[j],
                    usdcIntermediate: usdcOut,
                    ethOut: ethOut,
                    netProfit: netProfit,
                    netProfitUsd: netProfitUsd,
                    gasCost: gasCostUsd,
                    spreadBps: (Number(netProfit * 10000n / amount) / 100).toFixed(2),
                    timestamp: Date.now()
                  };
                }
              } catch (e) {
                // Pool no existe
              }
              return null;
            })()
          );
        }
      }
    }

    const results = await Promise.all(promises);
    opportunities.push(...results.filter(r => r !== null));

  } catch (e) {
    console.error(`[SCAN] Error ${chainKey}:`, e.message);
  }

  return opportunities;
}

// ═══════════════════════════════════════════════════════════════════════════════
// EJECUCIÓN RÁPIDA DE TRADE
// ═══════════════════════════════════════════════════════════════════════════════

async function executeTrade(opp) {
  if (isExecuting) {
    console.log('[EXEC] Ya hay una ejecución en progreso, saltando...');
    return null;
  }
  
  isExecuting = true;
  const chain = CHAINS[opp.chain];
  const signer = signers[opp.chain];
  const provider = providers[opp.chain];

  console.log(`\n🚀 [EXEC] EJECUTANDO TRADE en ${chain.name}`);
  console.log(`   Route: ${opp.route}`);
  console.log(`   Amount: ${opp.amountInEth} ETH`);
  console.log(`   Expected: $${opp.netProfitUsd.toFixed(4)}`);

  try {
    // Verificar balance
    const balance = await provider.getBalance(WALLET_ADDRESS);
    if (balance < opp.amountIn) {
      console.log(`   ❌ Balance insuficiente`);
      isExecuting = false;
      return { success: false, error: 'Balance insuficiente' };
    }

    const weth = new ethers.Contract(chain.tokens.WETH, WETH_ABI, signer);
    const router = new ethers.Contract(chain.router, ROUTER_ABI, signer);
    const usdc = new ethers.Contract(chain.tokens.USDC, ERC20_ABI, signer);

    // 1. Wrap ETH -> WETH
    console.log(`   📦 Wrapping ETH...`);
    const wrapTx = await weth.deposit({ 
      value: opp.amountIn,
      gasLimit: 50000
    });
    await wrapTx.wait(1);
    console.log(`   ✅ Wrap: ${wrapTx.hash.slice(0, 20)}...`);

    // 2. Approve si es necesario
    const allowance = await weth.allowance(WALLET_ADDRESS, chain.router);
    if (allowance < opp.amountIn) {
      console.log(`   🔓 Approving...`);
      const approveTx = await weth.approve(chain.router, ethers.MaxUint256, { gasLimit: 50000 });
      await approveTx.wait(1);
    }

    // 3. Swap WETH -> USDC
    console.log(`   🔄 Swap 1: WETH -> USDC...`);
    const minUsdc = (opp.usdcIntermediate * BigInt(10000 - CONFIG.MAX_SLIPPAGE_BPS)) / 10000n;
    
    const swap1Tx = await router.exactInputSingle({
      tokenIn: chain.tokens.WETH,
      tokenOut: chain.tokens.USDC,
      fee: opp.fee1,
      recipient: WALLET_ADDRESS,
      amountIn: opp.amountIn,
      amountOutMinimum: minUsdc,
      sqrtPriceLimitX96: 0n
    }, { gasLimit: 300000 });
    
    const receipt1 = await swap1Tx.wait(1);
    console.log(`   ✅ Swap 1: ${receipt1.hash.slice(0, 20)}...`);

    // 4. Approve USDC
    const usdcBalance = await usdc.balanceOf(WALLET_ADDRESS);
    const usdcAllowance = await usdc.allowance(WALLET_ADDRESS, chain.router);
    if (usdcAllowance < usdcBalance) {
      const approveUsdcTx = await usdc.approve(chain.router, ethers.MaxUint256, { gasLimit: 50000 });
      await approveUsdcTx.wait(1);
    }

    // 5. Swap USDC -> WETH
    console.log(`   🔄 Swap 2: USDC -> WETH...`);
    const minWeth = (opp.ethOut * BigInt(10000 - CONFIG.MAX_SLIPPAGE_BPS)) / 10000n;
    
    const swap2Tx = await router.exactInputSingle({
      tokenIn: chain.tokens.USDC,
      tokenOut: chain.tokens.WETH,
      fee: opp.fee2,
      recipient: WALLET_ADDRESS,
      amountIn: usdcBalance,
      amountOutMinimum: minWeth,
      sqrtPriceLimitX96: 0n
    }, { gasLimit: 300000 });
    
    const receipt2 = await swap2Tx.wait(1);
    console.log(`   ✅ Swap 2: ${receipt2.hash.slice(0, 20)}...`);

    // 6. Calcular profit real
    const finalWeth = await weth.balanceOf(WALLET_ADDRESS);
    const actualProfit = finalWeth - opp.amountIn;
    const actualProfitUsd = parseFloat(ethers.formatEther(actualProfit)) * CONFIG.ETH_PRICE_USD;

    console.log(`   💰 PROFIT: $${actualProfitUsd.toFixed(4)}`);
    console.log(`   🔗 TX: ${chain.explorer}/tx/${receipt2.hash}`);

    isExecuting = false;
    return {
      success: true,
      profitUsd: actualProfitUsd,
      txHash: receipt2.hash
    };

  } catch (e) {
    console.log(`   ❌ Error: ${e.message}`);
    isExecuting = false;
    return { success: false, error: e.message };
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// LOOP PRINCIPAL ULTRA-RÁPIDO
// ═══════════════════════════════════════════════════════════════════════════════

async function fastTick() {
  if (!state.isRunning || isExecuting) return;

  const tickStart = Date.now();
  state.stats.totalTicks++;
  state.stats.uptime = Math.floor((Date.now() - state.startTime) / 1000);

  // Seleccionar chain (round-robin para velocidad)
  const chainKeys = Object.keys(CHAINS);
  const chainIndex = state.stats.totalTicks % chainKeys.length;
  const selectedChain = chainKeys[chainIndex];
  state.stats.currentChain = selectedChain;

  // Actualizar bandit
  state.banditStates = state.banditStates.map(b => ({
    ...b,
    selected: b.chain === selectedChain
  }));

  try {
    // Escaneo rápido
    const opportunities = await fastScan(selectedChain);
    const scanTime = Date.now() - tickStart;
    state.stats.scanSpeed = scanTime;

    if (opportunities.length > 0) {
      // Ordenar por profit
      opportunities.sort((a, b) => b.netProfitUsd - a.netProfitUsd);
      const best = opportunities[0];

      // Guardar oportunidades
      state.opportunities = [...opportunities.slice(0, 5), ...state.opportunities].slice(0, 20);

      console.log(`[TICK ${state.stats.totalTicks}] ${CHAINS[selectedChain].name}: ${opportunities.length} opps, best: $${best.netProfitUsd.toFixed(4)} (${scanTime}ms)`);

      // Ejecutar si profit > umbral y NO es dry run
      if (best.netProfitUsd >= CONFIG.MIN_PROFIT_USD && !state.isDryRun && CONFIG.AUTO_EXECUTE) {
        console.log(`[EXEC] Profit $${best.netProfitUsd.toFixed(4)} >= $${CONFIG.MIN_PROFIT_USD}, ejecutando...`);
        
        const result = await executeTrade(best);
        state.stats.totalTrades++;
        state.stats.lastTradeTime = Date.now();

        if (result && result.success) {
          state.stats.successfulTrades++;
          state.stats.totalProfitUsd += result.profitUsd;
          state.stats.netProfitUsd = state.stats.totalProfitUsd;

          state.tradeLogs.unshift({
            id: `tx-${Date.now()}`,
            timestamp: Date.now(),
            chain: best.chain,
            route: best.route,
            amountIn: best.amountInEth,
            amountOut: ethers.formatEther(best.ethOut),
            profit: result.profitUsd.toFixed(4),
            gasCost: best.gasCost.toFixed(4),
            netProfit: result.profitUsd.toFixed(4),
            txHash: result.txHash,
            status: 'success'
          });

          // Actualizar bandit
          const bandit = state.banditStates.find(b => b.chain === selectedChain);
          if (bandit) {
            bandit.alpha += 1;
            bandit.winRate = (bandit.alpha / (bandit.alpha + bandit.beta) * 100);
          }
        } else {
          state.tradeLogs.unshift({
            id: `tx-${Date.now()}`,
            timestamp: Date.now(),
            chain: best.chain,
            route: best.route,
            amountIn: best.amountInEth,
            amountOut: '0',
            profit: '0',
            gasCost: best.gasCost.toFixed(4),
            netProfit: '0',
            txHash: '',
            status: 'failed'
          });

          const bandit = state.banditStates.find(b => b.chain === selectedChain);
          if (bandit) {
            bandit.beta += 1;
            bandit.winRate = (bandit.alpha / (bandit.alpha + bandit.beta) * 100);
          }
        }

        state.stats.winRate = state.stats.totalTrades > 0
          ? (state.stats.successfulTrades / state.stats.totalTrades * 100)
          : 0;

        if (state.tradeLogs.length > 100) state.tradeLogs.pop();
      }
    } else {
      // Log cada 10 ticks si no hay oportunidades
      if (state.stats.totalTicks % 10 === 0) {
        console.log(`[TICK ${state.stats.totalTicks}] ${CHAINS[selectedChain].name}: No profitable opps (${scanTime}ms)`);
      }
    }

    // Actualizar balances cada 20 ticks
    if (state.stats.totalTicks % 20 === 0) {
      for (const [key, chain] of Object.entries(CHAINS)) {
        try {
          const balance = await providers[key].getBalance(WALLET_ADDRESS);
          const balanceEth = parseFloat(ethers.formatEther(balance));
          const chainState = state.chains.find(c => c.chain === key);
          if (chainState) {
            chainState.balance = balanceEth.toFixed(6);
            chainState.balanceUsd = balanceEth * CONFIG.ETH_PRICE_USD;
            chainState.lastTick = Date.now();
          }
        } catch (e) {}
      }
    }

  } catch (e) {
    console.error(`[TICK] Error:`, e.message);
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// RUTAS API
// ═══════════════════════════════════════════════════════════════════════════════

app.get('/api/defi/multichain-arb/status', (req, res) => {
  res.json(state);
});

app.post('/api/defi/multichain-arb/start', async (req, res) => {
  console.log('[API] POST /start');

  if (state.isRunning) {
    return res.json({ success: false, error: 'Ya corriendo', isRunning: true });
  }

  state.isDryRun = req.body?.dryRun === true;
  state.isRunning = true;
  state.startTime = Date.now();
  state.stats.totalTicks = 0;
  state.stats.totalTrades = 0;
  state.stats.successfulTrades = 0;
  state.stats.totalProfitUsd = 0;
  state.stats.netProfitUsd = 0;
  state.stats.winRate = 0;
  state.stats.uptime = 0;
  state.tradeLogs = [];
  state.opportunities = [];

  // Iniciar loop ULTRA-RÁPIDO
  if (timer) clearInterval(timer);
  timer = setInterval(fastTick, CONFIG.TICK_INTERVAL_MS);

  console.log(`\n[START] Bot iniciado - ${state.isDryRun ? 'DRY RUN' : '⚠️ MODO REAL'}`);
  console.log(`[CONFIG] Intervalo: ${CONFIG.TICK_INTERVAL_MS}ms, Min profit: $${CONFIG.MIN_PROFIT_USD}`);

  res.json({ 
    success: true, 
    isRunning: true, 
    isDryRun: state.isDryRun,
    config: {
      tickInterval: CONFIG.TICK_INTERVAL_MS,
      minProfit: CONFIG.MIN_PROFIT_USD,
      autoExecute: CONFIG.AUTO_EXECUTE
    }
  });
});

app.post('/api/defi/multichain-arb/stop', (req, res) => {
  console.log('[API] POST /stop');
  state.isRunning = false;
  if (timer) { clearInterval(timer); timer = null; }
  res.json({ success: true, isRunning: false });
});

app.post('/api/defi/multichain-arb/reset', (req, res) => {
  state.stats = {
    totalTicks: 0, totalTrades: 0, successfulTrades: 0,
    totalProfitUsd: 0, totalGasUsd: 0, netProfitUsd: 0,
    winRate: 0, uptime: 0, currentChain: 'base', scanSpeed: 0, lastTradeTime: null
  };
  state.tradeLogs = [];
  state.opportunities = [];
  res.json({ success: true });
});

app.get('/api/defi/multichain-arb/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    port: PORT, 
    running: state.isRunning,
    mode: state.isDryRun ? 'DRY_RUN' : 'LIVE',
    wallet: WALLET_ADDRESS,
    config: CONFIG
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// INICIAR SERVIDOR
// ═══════════════════════════════════════════════════════════════════════════════

app.listen(PORT, async () => {
  console.log(`
╔═══════════════════════════════════════════════════════════════════════════════╗
║                                                                               ║
║   🚀 BOT ARBITRAJE ULTRA-RÁPIDO                                               ║
║                                                                               ║
║   ✅ Puerto: ${PORT}                                                           ║
║   ✅ Wallet: ${WALLET_ADDRESS.slice(0, 10)}...${WALLET_ADDRESS.slice(-5)}                                  ║
║   ✅ Intervalo: ${CONFIG.TICK_INTERVAL_MS}ms (${(1000/CONFIG.TICK_INTERVAL_MS).toFixed(1)} scans/seg)                              ║
║   ✅ Min Profit: $${CONFIG.MIN_PROFIT_USD}                                                 ║
║   ✅ Auto Execute: ${CONFIG.AUTO_EXECUTE}                                               ║
║                                                                               ║
║   ⚠️  MODO AGRESIVO - Alta frecuencia de trading                              ║
║                                                                               ║
╚═══════════════════════════════════════════════════════════════════════════════╝
  `);

  await initConnections();
  console.log('\n[READY] Bot listo. Usa POST /start para iniciar.\n');
});

process.on('SIGINT', () => {
  console.log('\n[EXIT] Cerrando...');
  if (timer) clearInterval(timer);
  process.exit(0);
});


 * ═══════════════════════════════════════════════════════════════════════════════
 * BOT ARBITRAJE ULTRA-RÁPIDO - ALTA FRECUENCIA
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * Configuración AGRESIVA:
 * - Escaneo cada 500ms (2x por segundo)
 * - Umbral de profit muy bajo ($0.01)
 * - Múltiples rutas simultáneas
 * - Ejecución inmediata
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
// CONFIGURACIÓN AGRESIVA
// ═══════════════════════════════════════════════════════════════════════════════

const CONFIG = {
  TICK_INTERVAL_MS: 500,        // Escanear cada 500ms (ULTRA RÁPIDO)
  MIN_PROFIT_USD: 0.01,         // Profit mínimo $0.01 (MUY BAJO)
  MAX_SLIPPAGE_BPS: 100,        // 1% slippage permitido
  GAS_MULTIPLIER: 1.5,          // Multiplicador de gas
  TRADE_AMOUNTS_ETH: [0.003, 0.005, 0.008, 0.01, 0.015, 0.02], // Cantidades a probar
  FEE_TIERS: [100, 500, 3000, 10000], // Todos los fee tiers
  PARALLEL_SCANS: true,         // Escanear todas las chains en paralelo
  AUTO_EXECUTE: true,           // Ejecutar automáticamente
  ETH_PRICE_USD: 3500           // Precio ETH aproximado
};

const PRIVATE_KEY = process.env.VITE_ETH_PRIVATE_KEY;
const WALLET_ADDRESS = process.env.VITE_ETH_WALLET_ADDRESS;

if (!PRIVATE_KEY || !WALLET_ADDRESS) {
  console.error('❌ ERROR: Credenciales no configuradas en .env');
  process.exit(1);
}

// ═══════════════════════════════════════════════════════════════════════════════
// CHAINS Y CONTRATOS
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
  },
  optimism: {
    name: 'Optimism',
    chainId: 10,
    rpc: 'https://mainnet.optimism.io',
    explorer: 'https://optimistic.etherscan.io',
    tokens: {
      WETH: '0x4200000000000000000000000000000000000006',
      USDC: '0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85'
    },
    quoter: '0x61fFE014bA17989E743c5F6cB21bF9697530B21e',
    router: '0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45'
  }
};

// ABIs
const QUOTER_ABI = [
  'function quoteExactInputSingle((address tokenIn, address tokenOut, uint256 amountIn, uint24 fee, uint160 sqrtPriceLimitX96)) external returns (uint256 amountOut, uint160 sqrtPriceX96After, uint32 initializedTicksCrossed, uint256 gasEstimate)'
];

const ROUTER_ABI = [
  'function exactInputSingle((address tokenIn, address tokenOut, uint24 fee, address recipient, uint256 amountIn, uint256 amountOutMinimum, uint160 sqrtPriceLimitX96)) external payable returns (uint256 amountOut)',
  'function multicall(uint256 deadline, bytes[] calldata data) external payable returns (bytes[] memory results)'
];

const WETH_ABI = [
  'function deposit() payable',
  'function withdraw(uint256)',
  'function balanceOf(address) view returns (uint256)',
  'function approve(address spender, uint256 amount) returns (bool)',
  'function allowance(address owner, address spender) view returns (uint256)'
];

const ERC20_ABI = [
  'function balanceOf(address) view returns (uint256)',
  'function approve(address spender, uint256 amount) returns (bool)',
  'function allowance(address owner, address spender) view returns (uint256)'
];

// ═══════════════════════════════════════════════════════════════════════════════
// ESTADO DEL BOT
// ═══════════════════════════════════════════════════════════════════════════════

let state = {
  isRunning: false,
  isDryRun: false,
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
    currentChain: 'base',
    scanSpeed: 0,
    lastTradeTime: null
  },
  chains: [],
  tradeLogs: [],
  opportunities: [],
  banditStates: [
    { chain: 'base', alpha: 2, beta: 2, winRate: 50, selected: true },
    { chain: 'arbitrum', alpha: 2, beta: 2, winRate: 50, selected: false },
    { chain: 'optimism', alpha: 2, beta: 2, winRate: 50, selected: false }
  ]
};

let timer = null;
let providers = {};
let signers = {};
let isExecuting = false;

// ═══════════════════════════════════════════════════════════════════════════════
// INICIALIZAR CONEXIONES
// ═══════════════════════════════════════════════════════════════════════════════

async function initConnections() {
  console.log('[INIT] Inicializando conexiones...');
  
  for (const [key, chain] of Object.entries(CHAINS)) {
    try {
      providers[key] = new ethers.JsonRpcProvider(chain.rpc);
      signers[key] = new ethers.Wallet(PRIVATE_KEY, providers[key]);
      
      const balance = await providers[key].getBalance(WALLET_ADDRESS);
      const balanceEth = parseFloat(ethers.formatEther(balance));
      
      state.chains.push({
        chain: key,
        name: chain.name,
        chainId: chain.chainId,
        balance: balanceEth.toFixed(6),
        balanceUsd: balanceEth * CONFIG.ETH_PRICE_USD,
        routes: CONFIG.FEE_TIERS.length * CONFIG.TRADE_AMOUNTS_ETH.length,
        isActive: true,
        lastTick: Date.now(),
        explorer: chain.explorer
      });
      
      console.log(`[INIT] ✅ ${chain.name}: ${balanceEth.toFixed(6)} ETH`);
    } catch (e) {
      console.error(`[INIT] ❌ ${chain.name}: ${e.message}`);
    }
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// ESCANEO ULTRA-RÁPIDO
// ═══════════════════════════════════════════════════════════════════════════════

async function fastScan(chainKey) {
  const chain = CHAINS[chainKey];
  const provider = providers[chainKey];
  const opportunities = [];

  try {
    const quoter = new ethers.Contract(chain.quoter, QUOTER_ABI, provider);
    
    // Obtener gas price
    const feeData = await provider.getFeeData();
    const gasPrice = feeData.gasPrice || ethers.parseUnits('0.001', 'gwei');
    const gasCostWei = gasPrice * 200000n;
    const gasCostUsd = parseFloat(ethers.formatEther(gasCostWei)) * CONFIG.ETH_PRICE_USD;

    // Probar TODAS las combinaciones en paralelo
    const promises = [];
    
    for (const amountEth of CONFIG.TRADE_AMOUNTS_ETH) {
      const amount = ethers.parseEther(amountEth.toString());
      
      for (let i = 0; i < CONFIG.FEE_TIERS.length; i++) {
        for (let j = 0; j < CONFIG.FEE_TIERS.length; j++) {
          if (i === j) continue;
          
          promises.push(
            (async () => {
              try {
                // ETH -> USDC
                const quote1 = await quoter.quoteExactInputSingle.staticCall({
                  tokenIn: chain.tokens.WETH,
                  tokenOut: chain.tokens.USDC,
                  amountIn: amount,
                  fee: CONFIG.FEE_TIERS[i],
                  sqrtPriceLimitX96: 0n
                });
                const usdcOut = quote1[0];

                // USDC -> ETH
                const quote2 = await quoter.quoteExactInputSingle.staticCall({
                  tokenIn: chain.tokens.USDC,
                  tokenOut: chain.tokens.WETH,
                  amountIn: usdcOut,
                  fee: CONFIG.FEE_TIERS[j],
                  sqrtPriceLimitX96: 0n
                });
                const ethOut = quote2[0];

                const grossProfit = ethOut - amount;
                const netProfit = grossProfit - gasCostWei;

                if (netProfit > 0n) {
                  const netProfitUsd = parseFloat(ethers.formatEther(netProfit)) * CONFIG.ETH_PRICE_USD;
                  
                  return {
                    chain: chainKey,
                    route: `${CONFIG.FEE_TIERS[i]/100}%->${CONFIG.FEE_TIERS[j]/100}%`,
                    amountIn: amount,
                    amountInEth: amountEth,
                    fee1: CONFIG.FEE_TIERS[i],
                    fee2: CONFIG.FEE_TIERS[j],
                    usdcIntermediate: usdcOut,
                    ethOut: ethOut,
                    netProfit: netProfit,
                    netProfitUsd: netProfitUsd,
                    gasCost: gasCostUsd,
                    spreadBps: (Number(netProfit * 10000n / amount) / 100).toFixed(2),
                    timestamp: Date.now()
                  };
                }
              } catch (e) {
                // Pool no existe
              }
              return null;
            })()
          );
        }
      }
    }

    const results = await Promise.all(promises);
    opportunities.push(...results.filter(r => r !== null));

  } catch (e) {
    console.error(`[SCAN] Error ${chainKey}:`, e.message);
  }

  return opportunities;
}

// ═══════════════════════════════════════════════════════════════════════════════
// EJECUCIÓN RÁPIDA DE TRADE
// ═══════════════════════════════════════════════════════════════════════════════

async function executeTrade(opp) {
  if (isExecuting) {
    console.log('[EXEC] Ya hay una ejecución en progreso, saltando...');
    return null;
  }
  
  isExecuting = true;
  const chain = CHAINS[opp.chain];
  const signer = signers[opp.chain];
  const provider = providers[opp.chain];

  console.log(`\n🚀 [EXEC] EJECUTANDO TRADE en ${chain.name}`);
  console.log(`   Route: ${opp.route}`);
  console.log(`   Amount: ${opp.amountInEth} ETH`);
  console.log(`   Expected: $${opp.netProfitUsd.toFixed(4)}`);

  try {
    // Verificar balance
    const balance = await provider.getBalance(WALLET_ADDRESS);
    if (balance < opp.amountIn) {
      console.log(`   ❌ Balance insuficiente`);
      isExecuting = false;
      return { success: false, error: 'Balance insuficiente' };
    }

    const weth = new ethers.Contract(chain.tokens.WETH, WETH_ABI, signer);
    const router = new ethers.Contract(chain.router, ROUTER_ABI, signer);
    const usdc = new ethers.Contract(chain.tokens.USDC, ERC20_ABI, signer);

    // 1. Wrap ETH -> WETH
    console.log(`   📦 Wrapping ETH...`);
    const wrapTx = await weth.deposit({ 
      value: opp.amountIn,
      gasLimit: 50000
    });
    await wrapTx.wait(1);
    console.log(`   ✅ Wrap: ${wrapTx.hash.slice(0, 20)}...`);

    // 2. Approve si es necesario
    const allowance = await weth.allowance(WALLET_ADDRESS, chain.router);
    if (allowance < opp.amountIn) {
      console.log(`   🔓 Approving...`);
      const approveTx = await weth.approve(chain.router, ethers.MaxUint256, { gasLimit: 50000 });
      await approveTx.wait(1);
    }

    // 3. Swap WETH -> USDC
    console.log(`   🔄 Swap 1: WETH -> USDC...`);
    const minUsdc = (opp.usdcIntermediate * BigInt(10000 - CONFIG.MAX_SLIPPAGE_BPS)) / 10000n;
    
    const swap1Tx = await router.exactInputSingle({
      tokenIn: chain.tokens.WETH,
      tokenOut: chain.tokens.USDC,
      fee: opp.fee1,
      recipient: WALLET_ADDRESS,
      amountIn: opp.amountIn,
      amountOutMinimum: minUsdc,
      sqrtPriceLimitX96: 0n
    }, { gasLimit: 300000 });
    
    const receipt1 = await swap1Tx.wait(1);
    console.log(`   ✅ Swap 1: ${receipt1.hash.slice(0, 20)}...`);

    // 4. Approve USDC
    const usdcBalance = await usdc.balanceOf(WALLET_ADDRESS);
    const usdcAllowance = await usdc.allowance(WALLET_ADDRESS, chain.router);
    if (usdcAllowance < usdcBalance) {
      const approveUsdcTx = await usdc.approve(chain.router, ethers.MaxUint256, { gasLimit: 50000 });
      await approveUsdcTx.wait(1);
    }

    // 5. Swap USDC -> WETH
    console.log(`   🔄 Swap 2: USDC -> WETH...`);
    const minWeth = (opp.ethOut * BigInt(10000 - CONFIG.MAX_SLIPPAGE_BPS)) / 10000n;
    
    const swap2Tx = await router.exactInputSingle({
      tokenIn: chain.tokens.USDC,
      tokenOut: chain.tokens.WETH,
      fee: opp.fee2,
      recipient: WALLET_ADDRESS,
      amountIn: usdcBalance,
      amountOutMinimum: minWeth,
      sqrtPriceLimitX96: 0n
    }, { gasLimit: 300000 });
    
    const receipt2 = await swap2Tx.wait(1);
    console.log(`   ✅ Swap 2: ${receipt2.hash.slice(0, 20)}...`);

    // 6. Calcular profit real
    const finalWeth = await weth.balanceOf(WALLET_ADDRESS);
    const actualProfit = finalWeth - opp.amountIn;
    const actualProfitUsd = parseFloat(ethers.formatEther(actualProfit)) * CONFIG.ETH_PRICE_USD;

    console.log(`   💰 PROFIT: $${actualProfitUsd.toFixed(4)}`);
    console.log(`   🔗 TX: ${chain.explorer}/tx/${receipt2.hash}`);

    isExecuting = false;
    return {
      success: true,
      profitUsd: actualProfitUsd,
      txHash: receipt2.hash
    };

  } catch (e) {
    console.log(`   ❌ Error: ${e.message}`);
    isExecuting = false;
    return { success: false, error: e.message };
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// LOOP PRINCIPAL ULTRA-RÁPIDO
// ═══════════════════════════════════════════════════════════════════════════════

async function fastTick() {
  if (!state.isRunning || isExecuting) return;

  const tickStart = Date.now();
  state.stats.totalTicks++;
  state.stats.uptime = Math.floor((Date.now() - state.startTime) / 1000);

  // Seleccionar chain (round-robin para velocidad)
  const chainKeys = Object.keys(CHAINS);
  const chainIndex = state.stats.totalTicks % chainKeys.length;
  const selectedChain = chainKeys[chainIndex];
  state.stats.currentChain = selectedChain;

  // Actualizar bandit
  state.banditStates = state.banditStates.map(b => ({
    ...b,
    selected: b.chain === selectedChain
  }));

  try {
    // Escaneo rápido
    const opportunities = await fastScan(selectedChain);
    const scanTime = Date.now() - tickStart;
    state.stats.scanSpeed = scanTime;

    if (opportunities.length > 0) {
      // Ordenar por profit
      opportunities.sort((a, b) => b.netProfitUsd - a.netProfitUsd);
      const best = opportunities[0];

      // Guardar oportunidades
      state.opportunities = [...opportunities.slice(0, 5), ...state.opportunities].slice(0, 20);

      console.log(`[TICK ${state.stats.totalTicks}] ${CHAINS[selectedChain].name}: ${opportunities.length} opps, best: $${best.netProfitUsd.toFixed(4)} (${scanTime}ms)`);

      // Ejecutar si profit > umbral y NO es dry run
      if (best.netProfitUsd >= CONFIG.MIN_PROFIT_USD && !state.isDryRun && CONFIG.AUTO_EXECUTE) {
        console.log(`[EXEC] Profit $${best.netProfitUsd.toFixed(4)} >= $${CONFIG.MIN_PROFIT_USD}, ejecutando...`);
        
        const result = await executeTrade(best);
        state.stats.totalTrades++;
        state.stats.lastTradeTime = Date.now();

        if (result && result.success) {
          state.stats.successfulTrades++;
          state.stats.totalProfitUsd += result.profitUsd;
          state.stats.netProfitUsd = state.stats.totalProfitUsd;

          state.tradeLogs.unshift({
            id: `tx-${Date.now()}`,
            timestamp: Date.now(),
            chain: best.chain,
            route: best.route,
            amountIn: best.amountInEth,
            amountOut: ethers.formatEther(best.ethOut),
            profit: result.profitUsd.toFixed(4),
            gasCost: best.gasCost.toFixed(4),
            netProfit: result.profitUsd.toFixed(4),
            txHash: result.txHash,
            status: 'success'
          });

          // Actualizar bandit
          const bandit = state.banditStates.find(b => b.chain === selectedChain);
          if (bandit) {
            bandit.alpha += 1;
            bandit.winRate = (bandit.alpha / (bandit.alpha + bandit.beta) * 100);
          }
        } else {
          state.tradeLogs.unshift({
            id: `tx-${Date.now()}`,
            timestamp: Date.now(),
            chain: best.chain,
            route: best.route,
            amountIn: best.amountInEth,
            amountOut: '0',
            profit: '0',
            gasCost: best.gasCost.toFixed(4),
            netProfit: '0',
            txHash: '',
            status: 'failed'
          });

          const bandit = state.banditStates.find(b => b.chain === selectedChain);
          if (bandit) {
            bandit.beta += 1;
            bandit.winRate = (bandit.alpha / (bandit.alpha + bandit.beta) * 100);
          }
        }

        state.stats.winRate = state.stats.totalTrades > 0
          ? (state.stats.successfulTrades / state.stats.totalTrades * 100)
          : 0;

        if (state.tradeLogs.length > 100) state.tradeLogs.pop();
      }
    } else {
      // Log cada 10 ticks si no hay oportunidades
      if (state.stats.totalTicks % 10 === 0) {
        console.log(`[TICK ${state.stats.totalTicks}] ${CHAINS[selectedChain].name}: No profitable opps (${scanTime}ms)`);
      }
    }

    // Actualizar balances cada 20 ticks
    if (state.stats.totalTicks % 20 === 0) {
      for (const [key, chain] of Object.entries(CHAINS)) {
        try {
          const balance = await providers[key].getBalance(WALLET_ADDRESS);
          const balanceEth = parseFloat(ethers.formatEther(balance));
          const chainState = state.chains.find(c => c.chain === key);
          if (chainState) {
            chainState.balance = balanceEth.toFixed(6);
            chainState.balanceUsd = balanceEth * CONFIG.ETH_PRICE_USD;
            chainState.lastTick = Date.now();
          }
        } catch (e) {}
      }
    }

  } catch (e) {
    console.error(`[TICK] Error:`, e.message);
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// RUTAS API
// ═══════════════════════════════════════════════════════════════════════════════

app.get('/api/defi/multichain-arb/status', (req, res) => {
  res.json(state);
});

app.post('/api/defi/multichain-arb/start', async (req, res) => {
  console.log('[API] POST /start');

  if (state.isRunning) {
    return res.json({ success: false, error: 'Ya corriendo', isRunning: true });
  }

  state.isDryRun = req.body?.dryRun === true;
  state.isRunning = true;
  state.startTime = Date.now();
  state.stats.totalTicks = 0;
  state.stats.totalTrades = 0;
  state.stats.successfulTrades = 0;
  state.stats.totalProfitUsd = 0;
  state.stats.netProfitUsd = 0;
  state.stats.winRate = 0;
  state.stats.uptime = 0;
  state.tradeLogs = [];
  state.opportunities = [];

  // Iniciar loop ULTRA-RÁPIDO
  if (timer) clearInterval(timer);
  timer = setInterval(fastTick, CONFIG.TICK_INTERVAL_MS);

  console.log(`\n[START] Bot iniciado - ${state.isDryRun ? 'DRY RUN' : '⚠️ MODO REAL'}`);
  console.log(`[CONFIG] Intervalo: ${CONFIG.TICK_INTERVAL_MS}ms, Min profit: $${CONFIG.MIN_PROFIT_USD}`);

  res.json({ 
    success: true, 
    isRunning: true, 
    isDryRun: state.isDryRun,
    config: {
      tickInterval: CONFIG.TICK_INTERVAL_MS,
      minProfit: CONFIG.MIN_PROFIT_USD,
      autoExecute: CONFIG.AUTO_EXECUTE
    }
  });
});

app.post('/api/defi/multichain-arb/stop', (req, res) => {
  console.log('[API] POST /stop');
  state.isRunning = false;
  if (timer) { clearInterval(timer); timer = null; }
  res.json({ success: true, isRunning: false });
});

app.post('/api/defi/multichain-arb/reset', (req, res) => {
  state.stats = {
    totalTicks: 0, totalTrades: 0, successfulTrades: 0,
    totalProfitUsd: 0, totalGasUsd: 0, netProfitUsd: 0,
    winRate: 0, uptime: 0, currentChain: 'base', scanSpeed: 0, lastTradeTime: null
  };
  state.tradeLogs = [];
  state.opportunities = [];
  res.json({ success: true });
});

app.get('/api/defi/multichain-arb/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    port: PORT, 
    running: state.isRunning,
    mode: state.isDryRun ? 'DRY_RUN' : 'LIVE',
    wallet: WALLET_ADDRESS,
    config: CONFIG
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// INICIAR SERVIDOR
// ═══════════════════════════════════════════════════════════════════════════════

app.listen(PORT, async () => {
  console.log(`
╔═══════════════════════════════════════════════════════════════════════════════╗
║                                                                               ║
║   🚀 BOT ARBITRAJE ULTRA-RÁPIDO                                               ║
║                                                                               ║
║   ✅ Puerto: ${PORT}                                                           ║
║   ✅ Wallet: ${WALLET_ADDRESS.slice(0, 10)}...${WALLET_ADDRESS.slice(-5)}                                  ║
║   ✅ Intervalo: ${CONFIG.TICK_INTERVAL_MS}ms (${(1000/CONFIG.TICK_INTERVAL_MS).toFixed(1)} scans/seg)                              ║
║   ✅ Min Profit: $${CONFIG.MIN_PROFIT_USD}                                                 ║
║   ✅ Auto Execute: ${CONFIG.AUTO_EXECUTE}                                               ║
║                                                                               ║
║   ⚠️  MODO AGRESIVO - Alta frecuencia de trading                              ║
║                                                                               ║
╚═══════════════════════════════════════════════════════════════════════════════╝
  `);

  await initConnections();
  console.log('\n[READY] Bot listo. Usa POST /start para iniciar.\n');
});

process.on('SIGINT', () => {
  console.log('\n[EXIT] Cerrando...');
  if (timer) clearInterval(timer);
  process.exit(0);
});



 * ═══════════════════════════════════════════════════════════════════════════════
 * BOT ARBITRAJE ULTRA-RÁPIDO - ALTA FRECUENCIA
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * Configuración AGRESIVA:
 * - Escaneo cada 500ms (2x por segundo)
 * - Umbral de profit muy bajo ($0.01)
 * - Múltiples rutas simultáneas
 * - Ejecución inmediata
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
// CONFIGURACIÓN AGRESIVA
// ═══════════════════════════════════════════════════════════════════════════════

const CONFIG = {
  TICK_INTERVAL_MS: 500,        // Escanear cada 500ms (ULTRA RÁPIDO)
  MIN_PROFIT_USD: 0.01,         // Profit mínimo $0.01 (MUY BAJO)
  MAX_SLIPPAGE_BPS: 100,        // 1% slippage permitido
  GAS_MULTIPLIER: 1.5,          // Multiplicador de gas
  TRADE_AMOUNTS_ETH: [0.003, 0.005, 0.008, 0.01, 0.015, 0.02], // Cantidades a probar
  FEE_TIERS: [100, 500, 3000, 10000], // Todos los fee tiers
  PARALLEL_SCANS: true,         // Escanear todas las chains en paralelo
  AUTO_EXECUTE: true,           // Ejecutar automáticamente
  ETH_PRICE_USD: 3500           // Precio ETH aproximado
};

const PRIVATE_KEY = process.env.VITE_ETH_PRIVATE_KEY;
const WALLET_ADDRESS = process.env.VITE_ETH_WALLET_ADDRESS;

if (!PRIVATE_KEY || !WALLET_ADDRESS) {
  console.error('❌ ERROR: Credenciales no configuradas en .env');
  process.exit(1);
}

// ═══════════════════════════════════════════════════════════════════════════════
// CHAINS Y CONTRATOS
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
  },
  optimism: {
    name: 'Optimism',
    chainId: 10,
    rpc: 'https://mainnet.optimism.io',
    explorer: 'https://optimistic.etherscan.io',
    tokens: {
      WETH: '0x4200000000000000000000000000000000000006',
      USDC: '0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85'
    },
    quoter: '0x61fFE014bA17989E743c5F6cB21bF9697530B21e',
    router: '0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45'
  }
};

// ABIs
const QUOTER_ABI = [
  'function quoteExactInputSingle((address tokenIn, address tokenOut, uint256 amountIn, uint24 fee, uint160 sqrtPriceLimitX96)) external returns (uint256 amountOut, uint160 sqrtPriceX96After, uint32 initializedTicksCrossed, uint256 gasEstimate)'
];

const ROUTER_ABI = [
  'function exactInputSingle((address tokenIn, address tokenOut, uint24 fee, address recipient, uint256 amountIn, uint256 amountOutMinimum, uint160 sqrtPriceLimitX96)) external payable returns (uint256 amountOut)',
  'function multicall(uint256 deadline, bytes[] calldata data) external payable returns (bytes[] memory results)'
];

const WETH_ABI = [
  'function deposit() payable',
  'function withdraw(uint256)',
  'function balanceOf(address) view returns (uint256)',
  'function approve(address spender, uint256 amount) returns (bool)',
  'function allowance(address owner, address spender) view returns (uint256)'
];

const ERC20_ABI = [
  'function balanceOf(address) view returns (uint256)',
  'function approve(address spender, uint256 amount) returns (bool)',
  'function allowance(address owner, address spender) view returns (uint256)'
];

// ═══════════════════════════════════════════════════════════════════════════════
// ESTADO DEL BOT
// ═══════════════════════════════════════════════════════════════════════════════

let state = {
  isRunning: false,
  isDryRun: false,
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
    currentChain: 'base',
    scanSpeed: 0,
    lastTradeTime: null
  },
  chains: [],
  tradeLogs: [],
  opportunities: [],
  banditStates: [
    { chain: 'base', alpha: 2, beta: 2, winRate: 50, selected: true },
    { chain: 'arbitrum', alpha: 2, beta: 2, winRate: 50, selected: false },
    { chain: 'optimism', alpha: 2, beta: 2, winRate: 50, selected: false }
  ]
};

let timer = null;
let providers = {};
let signers = {};
let isExecuting = false;

// ═══════════════════════════════════════════════════════════════════════════════
// INICIALIZAR CONEXIONES
// ═══════════════════════════════════════════════════════════════════════════════

async function initConnections() {
  console.log('[INIT] Inicializando conexiones...');
  
  for (const [key, chain] of Object.entries(CHAINS)) {
    try {
      providers[key] = new ethers.JsonRpcProvider(chain.rpc);
      signers[key] = new ethers.Wallet(PRIVATE_KEY, providers[key]);
      
      const balance = await providers[key].getBalance(WALLET_ADDRESS);
      const balanceEth = parseFloat(ethers.formatEther(balance));
      
      state.chains.push({
        chain: key,
        name: chain.name,
        chainId: chain.chainId,
        balance: balanceEth.toFixed(6),
        balanceUsd: balanceEth * CONFIG.ETH_PRICE_USD,
        routes: CONFIG.FEE_TIERS.length * CONFIG.TRADE_AMOUNTS_ETH.length,
        isActive: true,
        lastTick: Date.now(),
        explorer: chain.explorer
      });
      
      console.log(`[INIT] ✅ ${chain.name}: ${balanceEth.toFixed(6)} ETH`);
    } catch (e) {
      console.error(`[INIT] ❌ ${chain.name}: ${e.message}`);
    }
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// ESCANEO ULTRA-RÁPIDO
// ═══════════════════════════════════════════════════════════════════════════════

async function fastScan(chainKey) {
  const chain = CHAINS[chainKey];
  const provider = providers[chainKey];
  const opportunities = [];

  try {
    const quoter = new ethers.Contract(chain.quoter, QUOTER_ABI, provider);
    
    // Obtener gas price
    const feeData = await provider.getFeeData();
    const gasPrice = feeData.gasPrice || ethers.parseUnits('0.001', 'gwei');
    const gasCostWei = gasPrice * 200000n;
    const gasCostUsd = parseFloat(ethers.formatEther(gasCostWei)) * CONFIG.ETH_PRICE_USD;

    // Probar TODAS las combinaciones en paralelo
    const promises = [];
    
    for (const amountEth of CONFIG.TRADE_AMOUNTS_ETH) {
      const amount = ethers.parseEther(amountEth.toString());
      
      for (let i = 0; i < CONFIG.FEE_TIERS.length; i++) {
        for (let j = 0; j < CONFIG.FEE_TIERS.length; j++) {
          if (i === j) continue;
          
          promises.push(
            (async () => {
              try {
                // ETH -> USDC
                const quote1 = await quoter.quoteExactInputSingle.staticCall({
                  tokenIn: chain.tokens.WETH,
                  tokenOut: chain.tokens.USDC,
                  amountIn: amount,
                  fee: CONFIG.FEE_TIERS[i],
                  sqrtPriceLimitX96: 0n
                });
                const usdcOut = quote1[0];

                // USDC -> ETH
                const quote2 = await quoter.quoteExactInputSingle.staticCall({
                  tokenIn: chain.tokens.USDC,
                  tokenOut: chain.tokens.WETH,
                  amountIn: usdcOut,
                  fee: CONFIG.FEE_TIERS[j],
                  sqrtPriceLimitX96: 0n
                });
                const ethOut = quote2[0];

                const grossProfit = ethOut - amount;
                const netProfit = grossProfit - gasCostWei;

                if (netProfit > 0n) {
                  const netProfitUsd = parseFloat(ethers.formatEther(netProfit)) * CONFIG.ETH_PRICE_USD;
                  
                  return {
                    chain: chainKey,
                    route: `${CONFIG.FEE_TIERS[i]/100}%->${CONFIG.FEE_TIERS[j]/100}%`,
                    amountIn: amount,
                    amountInEth: amountEth,
                    fee1: CONFIG.FEE_TIERS[i],
                    fee2: CONFIG.FEE_TIERS[j],
                    usdcIntermediate: usdcOut,
                    ethOut: ethOut,
                    netProfit: netProfit,
                    netProfitUsd: netProfitUsd,
                    gasCost: gasCostUsd,
                    spreadBps: (Number(netProfit * 10000n / amount) / 100).toFixed(2),
                    timestamp: Date.now()
                  };
                }
              } catch (e) {
                // Pool no existe
              }
              return null;
            })()
          );
        }
      }
    }

    const results = await Promise.all(promises);
    opportunities.push(...results.filter(r => r !== null));

  } catch (e) {
    console.error(`[SCAN] Error ${chainKey}:`, e.message);
  }

  return opportunities;
}

// ═══════════════════════════════════════════════════════════════════════════════
// EJECUCIÓN RÁPIDA DE TRADE
// ═══════════════════════════════════════════════════════════════════════════════

async function executeTrade(opp) {
  if (isExecuting) {
    console.log('[EXEC] Ya hay una ejecución en progreso, saltando...');
    return null;
  }
  
  isExecuting = true;
  const chain = CHAINS[opp.chain];
  const signer = signers[opp.chain];
  const provider = providers[opp.chain];

  console.log(`\n🚀 [EXEC] EJECUTANDO TRADE en ${chain.name}`);
  console.log(`   Route: ${opp.route}`);
  console.log(`   Amount: ${opp.amountInEth} ETH`);
  console.log(`   Expected: $${opp.netProfitUsd.toFixed(4)}`);

  try {
    // Verificar balance
    const balance = await provider.getBalance(WALLET_ADDRESS);
    if (balance < opp.amountIn) {
      console.log(`   ❌ Balance insuficiente`);
      isExecuting = false;
      return { success: false, error: 'Balance insuficiente' };
    }

    const weth = new ethers.Contract(chain.tokens.WETH, WETH_ABI, signer);
    const router = new ethers.Contract(chain.router, ROUTER_ABI, signer);
    const usdc = new ethers.Contract(chain.tokens.USDC, ERC20_ABI, signer);

    // 1. Wrap ETH -> WETH
    console.log(`   📦 Wrapping ETH...`);
    const wrapTx = await weth.deposit({ 
      value: opp.amountIn,
      gasLimit: 50000
    });
    await wrapTx.wait(1);
    console.log(`   ✅ Wrap: ${wrapTx.hash.slice(0, 20)}...`);

    // 2. Approve si es necesario
    const allowance = await weth.allowance(WALLET_ADDRESS, chain.router);
    if (allowance < opp.amountIn) {
      console.log(`   🔓 Approving...`);
      const approveTx = await weth.approve(chain.router, ethers.MaxUint256, { gasLimit: 50000 });
      await approveTx.wait(1);
    }

    // 3. Swap WETH -> USDC
    console.log(`   🔄 Swap 1: WETH -> USDC...`);
    const minUsdc = (opp.usdcIntermediate * BigInt(10000 - CONFIG.MAX_SLIPPAGE_BPS)) / 10000n;
    
    const swap1Tx = await router.exactInputSingle({
      tokenIn: chain.tokens.WETH,
      tokenOut: chain.tokens.USDC,
      fee: opp.fee1,
      recipient: WALLET_ADDRESS,
      amountIn: opp.amountIn,
      amountOutMinimum: minUsdc,
      sqrtPriceLimitX96: 0n
    }, { gasLimit: 300000 });
    
    const receipt1 = await swap1Tx.wait(1);
    console.log(`   ✅ Swap 1: ${receipt1.hash.slice(0, 20)}...`);

    // 4. Approve USDC
    const usdcBalance = await usdc.balanceOf(WALLET_ADDRESS);
    const usdcAllowance = await usdc.allowance(WALLET_ADDRESS, chain.router);
    if (usdcAllowance < usdcBalance) {
      const approveUsdcTx = await usdc.approve(chain.router, ethers.MaxUint256, { gasLimit: 50000 });
      await approveUsdcTx.wait(1);
    }

    // 5. Swap USDC -> WETH
    console.log(`   🔄 Swap 2: USDC -> WETH...`);
    const minWeth = (opp.ethOut * BigInt(10000 - CONFIG.MAX_SLIPPAGE_BPS)) / 10000n;
    
    const swap2Tx = await router.exactInputSingle({
      tokenIn: chain.tokens.USDC,
      tokenOut: chain.tokens.WETH,
      fee: opp.fee2,
      recipient: WALLET_ADDRESS,
      amountIn: usdcBalance,
      amountOutMinimum: minWeth,
      sqrtPriceLimitX96: 0n
    }, { gasLimit: 300000 });
    
    const receipt2 = await swap2Tx.wait(1);
    console.log(`   ✅ Swap 2: ${receipt2.hash.slice(0, 20)}...`);

    // 6. Calcular profit real
    const finalWeth = await weth.balanceOf(WALLET_ADDRESS);
    const actualProfit = finalWeth - opp.amountIn;
    const actualProfitUsd = parseFloat(ethers.formatEther(actualProfit)) * CONFIG.ETH_PRICE_USD;

    console.log(`   💰 PROFIT: $${actualProfitUsd.toFixed(4)}`);
    console.log(`   🔗 TX: ${chain.explorer}/tx/${receipt2.hash}`);

    isExecuting = false;
    return {
      success: true,
      profitUsd: actualProfitUsd,
      txHash: receipt2.hash
    };

  } catch (e) {
    console.log(`   ❌ Error: ${e.message}`);
    isExecuting = false;
    return { success: false, error: e.message };
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// LOOP PRINCIPAL ULTRA-RÁPIDO
// ═══════════════════════════════════════════════════════════════════════════════

async function fastTick() {
  if (!state.isRunning || isExecuting) return;

  const tickStart = Date.now();
  state.stats.totalTicks++;
  state.stats.uptime = Math.floor((Date.now() - state.startTime) / 1000);

  // Seleccionar chain (round-robin para velocidad)
  const chainKeys = Object.keys(CHAINS);
  const chainIndex = state.stats.totalTicks % chainKeys.length;
  const selectedChain = chainKeys[chainIndex];
  state.stats.currentChain = selectedChain;

  // Actualizar bandit
  state.banditStates = state.banditStates.map(b => ({
    ...b,
    selected: b.chain === selectedChain
  }));

  try {
    // Escaneo rápido
    const opportunities = await fastScan(selectedChain);
    const scanTime = Date.now() - tickStart;
    state.stats.scanSpeed = scanTime;

    if (opportunities.length > 0) {
      // Ordenar por profit
      opportunities.sort((a, b) => b.netProfitUsd - a.netProfitUsd);
      const best = opportunities[0];

      // Guardar oportunidades
      state.opportunities = [...opportunities.slice(0, 5), ...state.opportunities].slice(0, 20);

      console.log(`[TICK ${state.stats.totalTicks}] ${CHAINS[selectedChain].name}: ${opportunities.length} opps, best: $${best.netProfitUsd.toFixed(4)} (${scanTime}ms)`);

      // Ejecutar si profit > umbral y NO es dry run
      if (best.netProfitUsd >= CONFIG.MIN_PROFIT_USD && !state.isDryRun && CONFIG.AUTO_EXECUTE) {
        console.log(`[EXEC] Profit $${best.netProfitUsd.toFixed(4)} >= $${CONFIG.MIN_PROFIT_USD}, ejecutando...`);
        
        const result = await executeTrade(best);
        state.stats.totalTrades++;
        state.stats.lastTradeTime = Date.now();

        if (result && result.success) {
          state.stats.successfulTrades++;
          state.stats.totalProfitUsd += result.profitUsd;
          state.stats.netProfitUsd = state.stats.totalProfitUsd;

          state.tradeLogs.unshift({
            id: `tx-${Date.now()}`,
            timestamp: Date.now(),
            chain: best.chain,
            route: best.route,
            amountIn: best.amountInEth,
            amountOut: ethers.formatEther(best.ethOut),
            profit: result.profitUsd.toFixed(4),
            gasCost: best.gasCost.toFixed(4),
            netProfit: result.profitUsd.toFixed(4),
            txHash: result.txHash,
            status: 'success'
          });

          // Actualizar bandit
          const bandit = state.banditStates.find(b => b.chain === selectedChain);
          if (bandit) {
            bandit.alpha += 1;
            bandit.winRate = (bandit.alpha / (bandit.alpha + bandit.beta) * 100);
          }
        } else {
          state.tradeLogs.unshift({
            id: `tx-${Date.now()}`,
            timestamp: Date.now(),
            chain: best.chain,
            route: best.route,
            amountIn: best.amountInEth,
            amountOut: '0',
            profit: '0',
            gasCost: best.gasCost.toFixed(4),
            netProfit: '0',
            txHash: '',
            status: 'failed'
          });

          const bandit = state.banditStates.find(b => b.chain === selectedChain);
          if (bandit) {
            bandit.beta += 1;
            bandit.winRate = (bandit.alpha / (bandit.alpha + bandit.beta) * 100);
          }
        }

        state.stats.winRate = state.stats.totalTrades > 0
          ? (state.stats.successfulTrades / state.stats.totalTrades * 100)
          : 0;

        if (state.tradeLogs.length > 100) state.tradeLogs.pop();
      }
    } else {
      // Log cada 10 ticks si no hay oportunidades
      if (state.stats.totalTicks % 10 === 0) {
        console.log(`[TICK ${state.stats.totalTicks}] ${CHAINS[selectedChain].name}: No profitable opps (${scanTime}ms)`);
      }
    }

    // Actualizar balances cada 20 ticks
    if (state.stats.totalTicks % 20 === 0) {
      for (const [key, chain] of Object.entries(CHAINS)) {
        try {
          const balance = await providers[key].getBalance(WALLET_ADDRESS);
          const balanceEth = parseFloat(ethers.formatEther(balance));
          const chainState = state.chains.find(c => c.chain === key);
          if (chainState) {
            chainState.balance = balanceEth.toFixed(6);
            chainState.balanceUsd = balanceEth * CONFIG.ETH_PRICE_USD;
            chainState.lastTick = Date.now();
          }
        } catch (e) {}
      }
    }

  } catch (e) {
    console.error(`[TICK] Error:`, e.message);
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// RUTAS API
// ═══════════════════════════════════════════════════════════════════════════════

app.get('/api/defi/multichain-arb/status', (req, res) => {
  res.json(state);
});

app.post('/api/defi/multichain-arb/start', async (req, res) => {
  console.log('[API] POST /start');

  if (state.isRunning) {
    return res.json({ success: false, error: 'Ya corriendo', isRunning: true });
  }

  state.isDryRun = req.body?.dryRun === true;
  state.isRunning = true;
  state.startTime = Date.now();
  state.stats.totalTicks = 0;
  state.stats.totalTrades = 0;
  state.stats.successfulTrades = 0;
  state.stats.totalProfitUsd = 0;
  state.stats.netProfitUsd = 0;
  state.stats.winRate = 0;
  state.stats.uptime = 0;
  state.tradeLogs = [];
  state.opportunities = [];

  // Iniciar loop ULTRA-RÁPIDO
  if (timer) clearInterval(timer);
  timer = setInterval(fastTick, CONFIG.TICK_INTERVAL_MS);

  console.log(`\n[START] Bot iniciado - ${state.isDryRun ? 'DRY RUN' : '⚠️ MODO REAL'}`);
  console.log(`[CONFIG] Intervalo: ${CONFIG.TICK_INTERVAL_MS}ms, Min profit: $${CONFIG.MIN_PROFIT_USD}`);

  res.json({ 
    success: true, 
    isRunning: true, 
    isDryRun: state.isDryRun,
    config: {
      tickInterval: CONFIG.TICK_INTERVAL_MS,
      minProfit: CONFIG.MIN_PROFIT_USD,
      autoExecute: CONFIG.AUTO_EXECUTE
    }
  });
});

app.post('/api/defi/multichain-arb/stop', (req, res) => {
  console.log('[API] POST /stop');
  state.isRunning = false;
  if (timer) { clearInterval(timer); timer = null; }
  res.json({ success: true, isRunning: false });
});

app.post('/api/defi/multichain-arb/reset', (req, res) => {
  state.stats = {
    totalTicks: 0, totalTrades: 0, successfulTrades: 0,
    totalProfitUsd: 0, totalGasUsd: 0, netProfitUsd: 0,
    winRate: 0, uptime: 0, currentChain: 'base', scanSpeed: 0, lastTradeTime: null
  };
  state.tradeLogs = [];
  state.opportunities = [];
  res.json({ success: true });
});

app.get('/api/defi/multichain-arb/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    port: PORT, 
    running: state.isRunning,
    mode: state.isDryRun ? 'DRY_RUN' : 'LIVE',
    wallet: WALLET_ADDRESS,
    config: CONFIG
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// INICIAR SERVIDOR
// ═══════════════════════════════════════════════════════════════════════════════

app.listen(PORT, async () => {
  console.log(`
╔═══════════════════════════════════════════════════════════════════════════════╗
║                                                                               ║
║   🚀 BOT ARBITRAJE ULTRA-RÁPIDO                                               ║
║                                                                               ║
║   ✅ Puerto: ${PORT}                                                           ║
║   ✅ Wallet: ${WALLET_ADDRESS.slice(0, 10)}...${WALLET_ADDRESS.slice(-5)}                                  ║
║   ✅ Intervalo: ${CONFIG.TICK_INTERVAL_MS}ms (${(1000/CONFIG.TICK_INTERVAL_MS).toFixed(1)} scans/seg)                              ║
║   ✅ Min Profit: $${CONFIG.MIN_PROFIT_USD}                                                 ║
║   ✅ Auto Execute: ${CONFIG.AUTO_EXECUTE}                                               ║
║                                                                               ║
║   ⚠️  MODO AGRESIVO - Alta frecuencia de trading                              ║
║                                                                               ║
╚═══════════════════════════════════════════════════════════════════════════════╝
  `);

  await initConnections();
  console.log('\n[READY] Bot listo. Usa POST /start para iniciar.\n');
});

process.on('SIGINT', () => {
  console.log('\n[EXIT] Cerrando...');
  if (timer) clearInterval(timer);
  process.exit(0);
});


 * ═══════════════════════════════════════════════════════════════════════════════
 * BOT ARBITRAJE ULTRA-RÁPIDO - ALTA FRECUENCIA
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * Configuración AGRESIVA:
 * - Escaneo cada 500ms (2x por segundo)
 * - Umbral de profit muy bajo ($0.01)
 * - Múltiples rutas simultáneas
 * - Ejecución inmediata
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
// CONFIGURACIÓN AGRESIVA
// ═══════════════════════════════════════════════════════════════════════════════

const CONFIG = {
  TICK_INTERVAL_MS: 500,        // Escanear cada 500ms (ULTRA RÁPIDO)
  MIN_PROFIT_USD: 0.01,         // Profit mínimo $0.01 (MUY BAJO)
  MAX_SLIPPAGE_BPS: 100,        // 1% slippage permitido
  GAS_MULTIPLIER: 1.5,          // Multiplicador de gas
  TRADE_AMOUNTS_ETH: [0.003, 0.005, 0.008, 0.01, 0.015, 0.02], // Cantidades a probar
  FEE_TIERS: [100, 500, 3000, 10000], // Todos los fee tiers
  PARALLEL_SCANS: true,         // Escanear todas las chains en paralelo
  AUTO_EXECUTE: true,           // Ejecutar automáticamente
  ETH_PRICE_USD: 3500           // Precio ETH aproximado
};

const PRIVATE_KEY = process.env.VITE_ETH_PRIVATE_KEY;
const WALLET_ADDRESS = process.env.VITE_ETH_WALLET_ADDRESS;

if (!PRIVATE_KEY || !WALLET_ADDRESS) {
  console.error('❌ ERROR: Credenciales no configuradas en .env');
  process.exit(1);
}

// ═══════════════════════════════════════════════════════════════════════════════
// CHAINS Y CONTRATOS
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
  },
  optimism: {
    name: 'Optimism',
    chainId: 10,
    rpc: 'https://mainnet.optimism.io',
    explorer: 'https://optimistic.etherscan.io',
    tokens: {
      WETH: '0x4200000000000000000000000000000000000006',
      USDC: '0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85'
    },
    quoter: '0x61fFE014bA17989E743c5F6cB21bF9697530B21e',
    router: '0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45'
  }
};

// ABIs
const QUOTER_ABI = [
  'function quoteExactInputSingle((address tokenIn, address tokenOut, uint256 amountIn, uint24 fee, uint160 sqrtPriceLimitX96)) external returns (uint256 amountOut, uint160 sqrtPriceX96After, uint32 initializedTicksCrossed, uint256 gasEstimate)'
];

const ROUTER_ABI = [
  'function exactInputSingle((address tokenIn, address tokenOut, uint24 fee, address recipient, uint256 amountIn, uint256 amountOutMinimum, uint160 sqrtPriceLimitX96)) external payable returns (uint256 amountOut)',
  'function multicall(uint256 deadline, bytes[] calldata data) external payable returns (bytes[] memory results)'
];

const WETH_ABI = [
  'function deposit() payable',
  'function withdraw(uint256)',
  'function balanceOf(address) view returns (uint256)',
  'function approve(address spender, uint256 amount) returns (bool)',
  'function allowance(address owner, address spender) view returns (uint256)'
];

const ERC20_ABI = [
  'function balanceOf(address) view returns (uint256)',
  'function approve(address spender, uint256 amount) returns (bool)',
  'function allowance(address owner, address spender) view returns (uint256)'
];

// ═══════════════════════════════════════════════════════════════════════════════
// ESTADO DEL BOT
// ═══════════════════════════════════════════════════════════════════════════════

let state = {
  isRunning: false,
  isDryRun: false,
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
    currentChain: 'base',
    scanSpeed: 0,
    lastTradeTime: null
  },
  chains: [],
  tradeLogs: [],
  opportunities: [],
  banditStates: [
    { chain: 'base', alpha: 2, beta: 2, winRate: 50, selected: true },
    { chain: 'arbitrum', alpha: 2, beta: 2, winRate: 50, selected: false },
    { chain: 'optimism', alpha: 2, beta: 2, winRate: 50, selected: false }
  ]
};

let timer = null;
let providers = {};
let signers = {};
let isExecuting = false;

// ═══════════════════════════════════════════════════════════════════════════════
// INICIALIZAR CONEXIONES
// ═══════════════════════════════════════════════════════════════════════════════

async function initConnections() {
  console.log('[INIT] Inicializando conexiones...');
  
  for (const [key, chain] of Object.entries(CHAINS)) {
    try {
      providers[key] = new ethers.JsonRpcProvider(chain.rpc);
      signers[key] = new ethers.Wallet(PRIVATE_KEY, providers[key]);
      
      const balance = await providers[key].getBalance(WALLET_ADDRESS);
      const balanceEth = parseFloat(ethers.formatEther(balance));
      
      state.chains.push({
        chain: key,
        name: chain.name,
        chainId: chain.chainId,
        balance: balanceEth.toFixed(6),
        balanceUsd: balanceEth * CONFIG.ETH_PRICE_USD,
        routes: CONFIG.FEE_TIERS.length * CONFIG.TRADE_AMOUNTS_ETH.length,
        isActive: true,
        lastTick: Date.now(),
        explorer: chain.explorer
      });
      
      console.log(`[INIT] ✅ ${chain.name}: ${balanceEth.toFixed(6)} ETH`);
    } catch (e) {
      console.error(`[INIT] ❌ ${chain.name}: ${e.message}`);
    }
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// ESCANEO ULTRA-RÁPIDO
// ═══════════════════════════════════════════════════════════════════════════════

async function fastScan(chainKey) {
  const chain = CHAINS[chainKey];
  const provider = providers[chainKey];
  const opportunities = [];

  try {
    const quoter = new ethers.Contract(chain.quoter, QUOTER_ABI, provider);
    
    // Obtener gas price
    const feeData = await provider.getFeeData();
    const gasPrice = feeData.gasPrice || ethers.parseUnits('0.001', 'gwei');
    const gasCostWei = gasPrice * 200000n;
    const gasCostUsd = parseFloat(ethers.formatEther(gasCostWei)) * CONFIG.ETH_PRICE_USD;

    // Probar TODAS las combinaciones en paralelo
    const promises = [];
    
    for (const amountEth of CONFIG.TRADE_AMOUNTS_ETH) {
      const amount = ethers.parseEther(amountEth.toString());
      
      for (let i = 0; i < CONFIG.FEE_TIERS.length; i++) {
        for (let j = 0; j < CONFIG.FEE_TIERS.length; j++) {
          if (i === j) continue;
          
          promises.push(
            (async () => {
              try {
                // ETH -> USDC
                const quote1 = await quoter.quoteExactInputSingle.staticCall({
                  tokenIn: chain.tokens.WETH,
                  tokenOut: chain.tokens.USDC,
                  amountIn: amount,
                  fee: CONFIG.FEE_TIERS[i],
                  sqrtPriceLimitX96: 0n
                });
                const usdcOut = quote1[0];

                // USDC -> ETH
                const quote2 = await quoter.quoteExactInputSingle.staticCall({
                  tokenIn: chain.tokens.USDC,
                  tokenOut: chain.tokens.WETH,
                  amountIn: usdcOut,
                  fee: CONFIG.FEE_TIERS[j],
                  sqrtPriceLimitX96: 0n
                });
                const ethOut = quote2[0];

                const grossProfit = ethOut - amount;
                const netProfit = grossProfit - gasCostWei;

                if (netProfit > 0n) {
                  const netProfitUsd = parseFloat(ethers.formatEther(netProfit)) * CONFIG.ETH_PRICE_USD;
                  
                  return {
                    chain: chainKey,
                    route: `${CONFIG.FEE_TIERS[i]/100}%->${CONFIG.FEE_TIERS[j]/100}%`,
                    amountIn: amount,
                    amountInEth: amountEth,
                    fee1: CONFIG.FEE_TIERS[i],
                    fee2: CONFIG.FEE_TIERS[j],
                    usdcIntermediate: usdcOut,
                    ethOut: ethOut,
                    netProfit: netProfit,
                    netProfitUsd: netProfitUsd,
                    gasCost: gasCostUsd,
                    spreadBps: (Number(netProfit * 10000n / amount) / 100).toFixed(2),
                    timestamp: Date.now()
                  };
                }
              } catch (e) {
                // Pool no existe
              }
              return null;
            })()
          );
        }
      }
    }

    const results = await Promise.all(promises);
    opportunities.push(...results.filter(r => r !== null));

  } catch (e) {
    console.error(`[SCAN] Error ${chainKey}:`, e.message);
  }

  return opportunities;
}

// ═══════════════════════════════════════════════════════════════════════════════
// EJECUCIÓN RÁPIDA DE TRADE
// ═══════════════════════════════════════════════════════════════════════════════

async function executeTrade(opp) {
  if (isExecuting) {
    console.log('[EXEC] Ya hay una ejecución en progreso, saltando...');
    return null;
  }
  
  isExecuting = true;
  const chain = CHAINS[opp.chain];
  const signer = signers[opp.chain];
  const provider = providers[opp.chain];

  console.log(`\n🚀 [EXEC] EJECUTANDO TRADE en ${chain.name}`);
  console.log(`   Route: ${opp.route}`);
  console.log(`   Amount: ${opp.amountInEth} ETH`);
  console.log(`   Expected: $${opp.netProfitUsd.toFixed(4)}`);

  try {
    // Verificar balance
    const balance = await provider.getBalance(WALLET_ADDRESS);
    if (balance < opp.amountIn) {
      console.log(`   ❌ Balance insuficiente`);
      isExecuting = false;
      return { success: false, error: 'Balance insuficiente' };
    }

    const weth = new ethers.Contract(chain.tokens.WETH, WETH_ABI, signer);
    const router = new ethers.Contract(chain.router, ROUTER_ABI, signer);
    const usdc = new ethers.Contract(chain.tokens.USDC, ERC20_ABI, signer);

    // 1. Wrap ETH -> WETH
    console.log(`   📦 Wrapping ETH...`);
    const wrapTx = await weth.deposit({ 
      value: opp.amountIn,
      gasLimit: 50000
    });
    await wrapTx.wait(1);
    console.log(`   ✅ Wrap: ${wrapTx.hash.slice(0, 20)}...`);

    // 2. Approve si es necesario
    const allowance = await weth.allowance(WALLET_ADDRESS, chain.router);
    if (allowance < opp.amountIn) {
      console.log(`   🔓 Approving...`);
      const approveTx = await weth.approve(chain.router, ethers.MaxUint256, { gasLimit: 50000 });
      await approveTx.wait(1);
    }

    // 3. Swap WETH -> USDC
    console.log(`   🔄 Swap 1: WETH -> USDC...`);
    const minUsdc = (opp.usdcIntermediate * BigInt(10000 - CONFIG.MAX_SLIPPAGE_BPS)) / 10000n;
    
    const swap1Tx = await router.exactInputSingle({
      tokenIn: chain.tokens.WETH,
      tokenOut: chain.tokens.USDC,
      fee: opp.fee1,
      recipient: WALLET_ADDRESS,
      amountIn: opp.amountIn,
      amountOutMinimum: minUsdc,
      sqrtPriceLimitX96: 0n
    }, { gasLimit: 300000 });
    
    const receipt1 = await swap1Tx.wait(1);
    console.log(`   ✅ Swap 1: ${receipt1.hash.slice(0, 20)}...`);

    // 4. Approve USDC
    const usdcBalance = await usdc.balanceOf(WALLET_ADDRESS);
    const usdcAllowance = await usdc.allowance(WALLET_ADDRESS, chain.router);
    if (usdcAllowance < usdcBalance) {
      const approveUsdcTx = await usdc.approve(chain.router, ethers.MaxUint256, { gasLimit: 50000 });
      await approveUsdcTx.wait(1);
    }

    // 5. Swap USDC -> WETH
    console.log(`   🔄 Swap 2: USDC -> WETH...`);
    const minWeth = (opp.ethOut * BigInt(10000 - CONFIG.MAX_SLIPPAGE_BPS)) / 10000n;
    
    const swap2Tx = await router.exactInputSingle({
      tokenIn: chain.tokens.USDC,
      tokenOut: chain.tokens.WETH,
      fee: opp.fee2,
      recipient: WALLET_ADDRESS,
      amountIn: usdcBalance,
      amountOutMinimum: minWeth,
      sqrtPriceLimitX96: 0n
    }, { gasLimit: 300000 });
    
    const receipt2 = await swap2Tx.wait(1);
    console.log(`   ✅ Swap 2: ${receipt2.hash.slice(0, 20)}...`);

    // 6. Calcular profit real
    const finalWeth = await weth.balanceOf(WALLET_ADDRESS);
    const actualProfit = finalWeth - opp.amountIn;
    const actualProfitUsd = parseFloat(ethers.formatEther(actualProfit)) * CONFIG.ETH_PRICE_USD;

    console.log(`   💰 PROFIT: $${actualProfitUsd.toFixed(4)}`);
    console.log(`   🔗 TX: ${chain.explorer}/tx/${receipt2.hash}`);

    isExecuting = false;
    return {
      success: true,
      profitUsd: actualProfitUsd,
      txHash: receipt2.hash
    };

  } catch (e) {
    console.log(`   ❌ Error: ${e.message}`);
    isExecuting = false;
    return { success: false, error: e.message };
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// LOOP PRINCIPAL ULTRA-RÁPIDO
// ═══════════════════════════════════════════════════════════════════════════════

async function fastTick() {
  if (!state.isRunning || isExecuting) return;

  const tickStart = Date.now();
  state.stats.totalTicks++;
  state.stats.uptime = Math.floor((Date.now() - state.startTime) / 1000);

  // Seleccionar chain (round-robin para velocidad)
  const chainKeys = Object.keys(CHAINS);
  const chainIndex = state.stats.totalTicks % chainKeys.length;
  const selectedChain = chainKeys[chainIndex];
  state.stats.currentChain = selectedChain;

  // Actualizar bandit
  state.banditStates = state.banditStates.map(b => ({
    ...b,
    selected: b.chain === selectedChain
  }));

  try {
    // Escaneo rápido
    const opportunities = await fastScan(selectedChain);
    const scanTime = Date.now() - tickStart;
    state.stats.scanSpeed = scanTime;

    if (opportunities.length > 0) {
      // Ordenar por profit
      opportunities.sort((a, b) => b.netProfitUsd - a.netProfitUsd);
      const best = opportunities[0];

      // Guardar oportunidades
      state.opportunities = [...opportunities.slice(0, 5), ...state.opportunities].slice(0, 20);

      console.log(`[TICK ${state.stats.totalTicks}] ${CHAINS[selectedChain].name}: ${opportunities.length} opps, best: $${best.netProfitUsd.toFixed(4)} (${scanTime}ms)`);

      // Ejecutar si profit > umbral y NO es dry run
      if (best.netProfitUsd >= CONFIG.MIN_PROFIT_USD && !state.isDryRun && CONFIG.AUTO_EXECUTE) {
        console.log(`[EXEC] Profit $${best.netProfitUsd.toFixed(4)} >= $${CONFIG.MIN_PROFIT_USD}, ejecutando...`);
        
        const result = await executeTrade(best);
        state.stats.totalTrades++;
        state.stats.lastTradeTime = Date.now();

        if (result && result.success) {
          state.stats.successfulTrades++;
          state.stats.totalProfitUsd += result.profitUsd;
          state.stats.netProfitUsd = state.stats.totalProfitUsd;

          state.tradeLogs.unshift({
            id: `tx-${Date.now()}`,
            timestamp: Date.now(),
            chain: best.chain,
            route: best.route,
            amountIn: best.amountInEth,
            amountOut: ethers.formatEther(best.ethOut),
            profit: result.profitUsd.toFixed(4),
            gasCost: best.gasCost.toFixed(4),
            netProfit: result.profitUsd.toFixed(4),
            txHash: result.txHash,
            status: 'success'
          });

          // Actualizar bandit
          const bandit = state.banditStates.find(b => b.chain === selectedChain);
          if (bandit) {
            bandit.alpha += 1;
            bandit.winRate = (bandit.alpha / (bandit.alpha + bandit.beta) * 100);
          }
        } else {
          state.tradeLogs.unshift({
            id: `tx-${Date.now()}`,
            timestamp: Date.now(),
            chain: best.chain,
            route: best.route,
            amountIn: best.amountInEth,
            amountOut: '0',
            profit: '0',
            gasCost: best.gasCost.toFixed(4),
            netProfit: '0',
            txHash: '',
            status: 'failed'
          });

          const bandit = state.banditStates.find(b => b.chain === selectedChain);
          if (bandit) {
            bandit.beta += 1;
            bandit.winRate = (bandit.alpha / (bandit.alpha + bandit.beta) * 100);
          }
        }

        state.stats.winRate = state.stats.totalTrades > 0
          ? (state.stats.successfulTrades / state.stats.totalTrades * 100)
          : 0;

        if (state.tradeLogs.length > 100) state.tradeLogs.pop();
      }
    } else {
      // Log cada 10 ticks si no hay oportunidades
      if (state.stats.totalTicks % 10 === 0) {
        console.log(`[TICK ${state.stats.totalTicks}] ${CHAINS[selectedChain].name}: No profitable opps (${scanTime}ms)`);
      }
    }

    // Actualizar balances cada 20 ticks
    if (state.stats.totalTicks % 20 === 0) {
      for (const [key, chain] of Object.entries(CHAINS)) {
        try {
          const balance = await providers[key].getBalance(WALLET_ADDRESS);
          const balanceEth = parseFloat(ethers.formatEther(balance));
          const chainState = state.chains.find(c => c.chain === key);
          if (chainState) {
            chainState.balance = balanceEth.toFixed(6);
            chainState.balanceUsd = balanceEth * CONFIG.ETH_PRICE_USD;
            chainState.lastTick = Date.now();
          }
        } catch (e) {}
      }
    }

  } catch (e) {
    console.error(`[TICK] Error:`, e.message);
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// RUTAS API
// ═══════════════════════════════════════════════════════════════════════════════

app.get('/api/defi/multichain-arb/status', (req, res) => {
  res.json(state);
});

app.post('/api/defi/multichain-arb/start', async (req, res) => {
  console.log('[API] POST /start');

  if (state.isRunning) {
    return res.json({ success: false, error: 'Ya corriendo', isRunning: true });
  }

  state.isDryRun = req.body?.dryRun === true;
  state.isRunning = true;
  state.startTime = Date.now();
  state.stats.totalTicks = 0;
  state.stats.totalTrades = 0;
  state.stats.successfulTrades = 0;
  state.stats.totalProfitUsd = 0;
  state.stats.netProfitUsd = 0;
  state.stats.winRate = 0;
  state.stats.uptime = 0;
  state.tradeLogs = [];
  state.opportunities = [];

  // Iniciar loop ULTRA-RÁPIDO
  if (timer) clearInterval(timer);
  timer = setInterval(fastTick, CONFIG.TICK_INTERVAL_MS);

  console.log(`\n[START] Bot iniciado - ${state.isDryRun ? 'DRY RUN' : '⚠️ MODO REAL'}`);
  console.log(`[CONFIG] Intervalo: ${CONFIG.TICK_INTERVAL_MS}ms, Min profit: $${CONFIG.MIN_PROFIT_USD}`);

  res.json({ 
    success: true, 
    isRunning: true, 
    isDryRun: state.isDryRun,
    config: {
      tickInterval: CONFIG.TICK_INTERVAL_MS,
      minProfit: CONFIG.MIN_PROFIT_USD,
      autoExecute: CONFIG.AUTO_EXECUTE
    }
  });
});

app.post('/api/defi/multichain-arb/stop', (req, res) => {
  console.log('[API] POST /stop');
  state.isRunning = false;
  if (timer) { clearInterval(timer); timer = null; }
  res.json({ success: true, isRunning: false });
});

app.post('/api/defi/multichain-arb/reset', (req, res) => {
  state.stats = {
    totalTicks: 0, totalTrades: 0, successfulTrades: 0,
    totalProfitUsd: 0, totalGasUsd: 0, netProfitUsd: 0,
    winRate: 0, uptime: 0, currentChain: 'base', scanSpeed: 0, lastTradeTime: null
  };
  state.tradeLogs = [];
  state.opportunities = [];
  res.json({ success: true });
});

app.get('/api/defi/multichain-arb/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    port: PORT, 
    running: state.isRunning,
    mode: state.isDryRun ? 'DRY_RUN' : 'LIVE',
    wallet: WALLET_ADDRESS,
    config: CONFIG
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// INICIAR SERVIDOR
// ═══════════════════════════════════════════════════════════════════════════════

app.listen(PORT, async () => {
  console.log(`
╔═══════════════════════════════════════════════════════════════════════════════╗
║                                                                               ║
║   🚀 BOT ARBITRAJE ULTRA-RÁPIDO                                               ║
║                                                                               ║
║   ✅ Puerto: ${PORT}                                                           ║
║   ✅ Wallet: ${WALLET_ADDRESS.slice(0, 10)}...${WALLET_ADDRESS.slice(-5)}                                  ║
║   ✅ Intervalo: ${CONFIG.TICK_INTERVAL_MS}ms (${(1000/CONFIG.TICK_INTERVAL_MS).toFixed(1)} scans/seg)                              ║
║   ✅ Min Profit: $${CONFIG.MIN_PROFIT_USD}                                                 ║
║   ✅ Auto Execute: ${CONFIG.AUTO_EXECUTE}                                               ║
║                                                                               ║
║   ⚠️  MODO AGRESIVO - Alta frecuencia de trading                              ║
║                                                                               ║
╚═══════════════════════════════════════════════════════════════════════════════╝
  `);

  await initConnections();
  console.log('\n[READY] Bot listo. Usa POST /start para iniciar.\n');
});

process.on('SIGINT', () => {
  console.log('\n[EXIT] Cerrando...');
  if (timer) clearInterval(timer);
  process.exit(0);
});



 * ═══════════════════════════════════════════════════════════════════════════════
 * BOT ARBITRAJE ULTRA-RÁPIDO - ALTA FRECUENCIA
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * Configuración AGRESIVA:
 * - Escaneo cada 500ms (2x por segundo)
 * - Umbral de profit muy bajo ($0.01)
 * - Múltiples rutas simultáneas
 * - Ejecución inmediata
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
// CONFIGURACIÓN AGRESIVA
// ═══════════════════════════════════════════════════════════════════════════════

const CONFIG = {
  TICK_INTERVAL_MS: 500,        // Escanear cada 500ms (ULTRA RÁPIDO)
  MIN_PROFIT_USD: 0.01,         // Profit mínimo $0.01 (MUY BAJO)
  MAX_SLIPPAGE_BPS: 100,        // 1% slippage permitido
  GAS_MULTIPLIER: 1.5,          // Multiplicador de gas
  TRADE_AMOUNTS_ETH: [0.003, 0.005, 0.008, 0.01, 0.015, 0.02], // Cantidades a probar
  FEE_TIERS: [100, 500, 3000, 10000], // Todos los fee tiers
  PARALLEL_SCANS: true,         // Escanear todas las chains en paralelo
  AUTO_EXECUTE: true,           // Ejecutar automáticamente
  ETH_PRICE_USD: 3500           // Precio ETH aproximado
};

const PRIVATE_KEY = process.env.VITE_ETH_PRIVATE_KEY;
const WALLET_ADDRESS = process.env.VITE_ETH_WALLET_ADDRESS;

if (!PRIVATE_KEY || !WALLET_ADDRESS) {
  console.error('❌ ERROR: Credenciales no configuradas en .env');
  process.exit(1);
}

// ═══════════════════════════════════════════════════════════════════════════════
// CHAINS Y CONTRATOS
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
  },
  optimism: {
    name: 'Optimism',
    chainId: 10,
    rpc: 'https://mainnet.optimism.io',
    explorer: 'https://optimistic.etherscan.io',
    tokens: {
      WETH: '0x4200000000000000000000000000000000000006',
      USDC: '0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85'
    },
    quoter: '0x61fFE014bA17989E743c5F6cB21bF9697530B21e',
    router: '0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45'
  }
};

// ABIs
const QUOTER_ABI = [
  'function quoteExactInputSingle((address tokenIn, address tokenOut, uint256 amountIn, uint24 fee, uint160 sqrtPriceLimitX96)) external returns (uint256 amountOut, uint160 sqrtPriceX96After, uint32 initializedTicksCrossed, uint256 gasEstimate)'
];

const ROUTER_ABI = [
  'function exactInputSingle((address tokenIn, address tokenOut, uint24 fee, address recipient, uint256 amountIn, uint256 amountOutMinimum, uint160 sqrtPriceLimitX96)) external payable returns (uint256 amountOut)',
  'function multicall(uint256 deadline, bytes[] calldata data) external payable returns (bytes[] memory results)'
];

const WETH_ABI = [
  'function deposit() payable',
  'function withdraw(uint256)',
  'function balanceOf(address) view returns (uint256)',
  'function approve(address spender, uint256 amount) returns (bool)',
  'function allowance(address owner, address spender) view returns (uint256)'
];

const ERC20_ABI = [
  'function balanceOf(address) view returns (uint256)',
  'function approve(address spender, uint256 amount) returns (bool)',
  'function allowance(address owner, address spender) view returns (uint256)'
];

// ═══════════════════════════════════════════════════════════════════════════════
// ESTADO DEL BOT
// ═══════════════════════════════════════════════════════════════════════════════

let state = {
  isRunning: false,
  isDryRun: false,
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
    currentChain: 'base',
    scanSpeed: 0,
    lastTradeTime: null
  },
  chains: [],
  tradeLogs: [],
  opportunities: [],
  banditStates: [
    { chain: 'base', alpha: 2, beta: 2, winRate: 50, selected: true },
    { chain: 'arbitrum', alpha: 2, beta: 2, winRate: 50, selected: false },
    { chain: 'optimism', alpha: 2, beta: 2, winRate: 50, selected: false }
  ]
};

let timer = null;
let providers = {};
let signers = {};
let isExecuting = false;

// ═══════════════════════════════════════════════════════════════════════════════
// INICIALIZAR CONEXIONES
// ═══════════════════════════════════════════════════════════════════════════════

async function initConnections() {
  console.log('[INIT] Inicializando conexiones...');
  
  for (const [key, chain] of Object.entries(CHAINS)) {
    try {
      providers[key] = new ethers.JsonRpcProvider(chain.rpc);
      signers[key] = new ethers.Wallet(PRIVATE_KEY, providers[key]);
      
      const balance = await providers[key].getBalance(WALLET_ADDRESS);
      const balanceEth = parseFloat(ethers.formatEther(balance));
      
      state.chains.push({
        chain: key,
        name: chain.name,
        chainId: chain.chainId,
        balance: balanceEth.toFixed(6),
        balanceUsd: balanceEth * CONFIG.ETH_PRICE_USD,
        routes: CONFIG.FEE_TIERS.length * CONFIG.TRADE_AMOUNTS_ETH.length,
        isActive: true,
        lastTick: Date.now(),
        explorer: chain.explorer
      });
      
      console.log(`[INIT] ✅ ${chain.name}: ${balanceEth.toFixed(6)} ETH`);
    } catch (e) {
      console.error(`[INIT] ❌ ${chain.name}: ${e.message}`);
    }
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// ESCANEO ULTRA-RÁPIDO
// ═══════════════════════════════════════════════════════════════════════════════

async function fastScan(chainKey) {
  const chain = CHAINS[chainKey];
  const provider = providers[chainKey];
  const opportunities = [];

  try {
    const quoter = new ethers.Contract(chain.quoter, QUOTER_ABI, provider);
    
    // Obtener gas price
    const feeData = await provider.getFeeData();
    const gasPrice = feeData.gasPrice || ethers.parseUnits('0.001', 'gwei');
    const gasCostWei = gasPrice * 200000n;
    const gasCostUsd = parseFloat(ethers.formatEther(gasCostWei)) * CONFIG.ETH_PRICE_USD;

    // Probar TODAS las combinaciones en paralelo
    const promises = [];
    
    for (const amountEth of CONFIG.TRADE_AMOUNTS_ETH) {
      const amount = ethers.parseEther(amountEth.toString());
      
      for (let i = 0; i < CONFIG.FEE_TIERS.length; i++) {
        for (let j = 0; j < CONFIG.FEE_TIERS.length; j++) {
          if (i === j) continue;
          
          promises.push(
            (async () => {
              try {
                // ETH -> USDC
                const quote1 = await quoter.quoteExactInputSingle.staticCall({
                  tokenIn: chain.tokens.WETH,
                  tokenOut: chain.tokens.USDC,
                  amountIn: amount,
                  fee: CONFIG.FEE_TIERS[i],
                  sqrtPriceLimitX96: 0n
                });
                const usdcOut = quote1[0];

                // USDC -> ETH
                const quote2 = await quoter.quoteExactInputSingle.staticCall({
                  tokenIn: chain.tokens.USDC,
                  tokenOut: chain.tokens.WETH,
                  amountIn: usdcOut,
                  fee: CONFIG.FEE_TIERS[j],
                  sqrtPriceLimitX96: 0n
                });
                const ethOut = quote2[0];

                const grossProfit = ethOut - amount;
                const netProfit = grossProfit - gasCostWei;

                if (netProfit > 0n) {
                  const netProfitUsd = parseFloat(ethers.formatEther(netProfit)) * CONFIG.ETH_PRICE_USD;
                  
                  return {
                    chain: chainKey,
                    route: `${CONFIG.FEE_TIERS[i]/100}%->${CONFIG.FEE_TIERS[j]/100}%`,
                    amountIn: amount,
                    amountInEth: amountEth,
                    fee1: CONFIG.FEE_TIERS[i],
                    fee2: CONFIG.FEE_TIERS[j],
                    usdcIntermediate: usdcOut,
                    ethOut: ethOut,
                    netProfit: netProfit,
                    netProfitUsd: netProfitUsd,
                    gasCost: gasCostUsd,
                    spreadBps: (Number(netProfit * 10000n / amount) / 100).toFixed(2),
                    timestamp: Date.now()
                  };
                }
              } catch (e) {
                // Pool no existe
              }
              return null;
            })()
          );
        }
      }
    }

    const results = await Promise.all(promises);
    opportunities.push(...results.filter(r => r !== null));

  } catch (e) {
    console.error(`[SCAN] Error ${chainKey}:`, e.message);
  }

  return opportunities;
}

// ═══════════════════════════════════════════════════════════════════════════════
// EJECUCIÓN RÁPIDA DE TRADE
// ═══════════════════════════════════════════════════════════════════════════════

async function executeTrade(opp) {
  if (isExecuting) {
    console.log('[EXEC] Ya hay una ejecución en progreso, saltando...');
    return null;
  }
  
  isExecuting = true;
  const chain = CHAINS[opp.chain];
  const signer = signers[opp.chain];
  const provider = providers[opp.chain];

  console.log(`\n🚀 [EXEC] EJECUTANDO TRADE en ${chain.name}`);
  console.log(`   Route: ${opp.route}`);
  console.log(`   Amount: ${opp.amountInEth} ETH`);
  console.log(`   Expected: $${opp.netProfitUsd.toFixed(4)}`);

  try {
    // Verificar balance
    const balance = await provider.getBalance(WALLET_ADDRESS);
    if (balance < opp.amountIn) {
      console.log(`   ❌ Balance insuficiente`);
      isExecuting = false;
      return { success: false, error: 'Balance insuficiente' };
    }

    const weth = new ethers.Contract(chain.tokens.WETH, WETH_ABI, signer);
    const router = new ethers.Contract(chain.router, ROUTER_ABI, signer);
    const usdc = new ethers.Contract(chain.tokens.USDC, ERC20_ABI, signer);

    // 1. Wrap ETH -> WETH
    console.log(`   📦 Wrapping ETH...`);
    const wrapTx = await weth.deposit({ 
      value: opp.amountIn,
      gasLimit: 50000
    });
    await wrapTx.wait(1);
    console.log(`   ✅ Wrap: ${wrapTx.hash.slice(0, 20)}...`);

    // 2. Approve si es necesario
    const allowance = await weth.allowance(WALLET_ADDRESS, chain.router);
    if (allowance < opp.amountIn) {
      console.log(`   🔓 Approving...`);
      const approveTx = await weth.approve(chain.router, ethers.MaxUint256, { gasLimit: 50000 });
      await approveTx.wait(1);
    }

    // 3. Swap WETH -> USDC
    console.log(`   🔄 Swap 1: WETH -> USDC...`);
    const minUsdc = (opp.usdcIntermediate * BigInt(10000 - CONFIG.MAX_SLIPPAGE_BPS)) / 10000n;
    
    const swap1Tx = await router.exactInputSingle({
      tokenIn: chain.tokens.WETH,
      tokenOut: chain.tokens.USDC,
      fee: opp.fee1,
      recipient: WALLET_ADDRESS,
      amountIn: opp.amountIn,
      amountOutMinimum: minUsdc,
      sqrtPriceLimitX96: 0n
    }, { gasLimit: 300000 });
    
    const receipt1 = await swap1Tx.wait(1);
    console.log(`   ✅ Swap 1: ${receipt1.hash.slice(0, 20)}...`);

    // 4. Approve USDC
    const usdcBalance = await usdc.balanceOf(WALLET_ADDRESS);
    const usdcAllowance = await usdc.allowance(WALLET_ADDRESS, chain.router);
    if (usdcAllowance < usdcBalance) {
      const approveUsdcTx = await usdc.approve(chain.router, ethers.MaxUint256, { gasLimit: 50000 });
      await approveUsdcTx.wait(1);
    }

    // 5. Swap USDC -> WETH
    console.log(`   🔄 Swap 2: USDC -> WETH...`);
    const minWeth = (opp.ethOut * BigInt(10000 - CONFIG.MAX_SLIPPAGE_BPS)) / 10000n;
    
    const swap2Tx = await router.exactInputSingle({
      tokenIn: chain.tokens.USDC,
      tokenOut: chain.tokens.WETH,
      fee: opp.fee2,
      recipient: WALLET_ADDRESS,
      amountIn: usdcBalance,
      amountOutMinimum: minWeth,
      sqrtPriceLimitX96: 0n
    }, { gasLimit: 300000 });
    
    const receipt2 = await swap2Tx.wait(1);
    console.log(`   ✅ Swap 2: ${receipt2.hash.slice(0, 20)}...`);

    // 6. Calcular profit real
    const finalWeth = await weth.balanceOf(WALLET_ADDRESS);
    const actualProfit = finalWeth - opp.amountIn;
    const actualProfitUsd = parseFloat(ethers.formatEther(actualProfit)) * CONFIG.ETH_PRICE_USD;

    console.log(`   💰 PROFIT: $${actualProfitUsd.toFixed(4)}`);
    console.log(`   🔗 TX: ${chain.explorer}/tx/${receipt2.hash}`);

    isExecuting = false;
    return {
      success: true,
      profitUsd: actualProfitUsd,
      txHash: receipt2.hash
    };

  } catch (e) {
    console.log(`   ❌ Error: ${e.message}`);
    isExecuting = false;
    return { success: false, error: e.message };
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// LOOP PRINCIPAL ULTRA-RÁPIDO
// ═══════════════════════════════════════════════════════════════════════════════

async function fastTick() {
  if (!state.isRunning || isExecuting) return;

  const tickStart = Date.now();
  state.stats.totalTicks++;
  state.stats.uptime = Math.floor((Date.now() - state.startTime) / 1000);

  // Seleccionar chain (round-robin para velocidad)
  const chainKeys = Object.keys(CHAINS);
  const chainIndex = state.stats.totalTicks % chainKeys.length;
  const selectedChain = chainKeys[chainIndex];
  state.stats.currentChain = selectedChain;

  // Actualizar bandit
  state.banditStates = state.banditStates.map(b => ({
    ...b,
    selected: b.chain === selectedChain
  }));

  try {
    // Escaneo rápido
    const opportunities = await fastScan(selectedChain);
    const scanTime = Date.now() - tickStart;
    state.stats.scanSpeed = scanTime;

    if (opportunities.length > 0) {
      // Ordenar por profit
      opportunities.sort((a, b) => b.netProfitUsd - a.netProfitUsd);
      const best = opportunities[0];

      // Guardar oportunidades
      state.opportunities = [...opportunities.slice(0, 5), ...state.opportunities].slice(0, 20);

      console.log(`[TICK ${state.stats.totalTicks}] ${CHAINS[selectedChain].name}: ${opportunities.length} opps, best: $${best.netProfitUsd.toFixed(4)} (${scanTime}ms)`);

      // Ejecutar si profit > umbral y NO es dry run
      if (best.netProfitUsd >= CONFIG.MIN_PROFIT_USD && !state.isDryRun && CONFIG.AUTO_EXECUTE) {
        console.log(`[EXEC] Profit $${best.netProfitUsd.toFixed(4)} >= $${CONFIG.MIN_PROFIT_USD}, ejecutando...`);
        
        const result = await executeTrade(best);
        state.stats.totalTrades++;
        state.stats.lastTradeTime = Date.now();

        if (result && result.success) {
          state.stats.successfulTrades++;
          state.stats.totalProfitUsd += result.profitUsd;
          state.stats.netProfitUsd = state.stats.totalProfitUsd;

          state.tradeLogs.unshift({
            id: `tx-${Date.now()}`,
            timestamp: Date.now(),
            chain: best.chain,
            route: best.route,
            amountIn: best.amountInEth,
            amountOut: ethers.formatEther(best.ethOut),
            profit: result.profitUsd.toFixed(4),
            gasCost: best.gasCost.toFixed(4),
            netProfit: result.profitUsd.toFixed(4),
            txHash: result.txHash,
            status: 'success'
          });

          // Actualizar bandit
          const bandit = state.banditStates.find(b => b.chain === selectedChain);
          if (bandit) {
            bandit.alpha += 1;
            bandit.winRate = (bandit.alpha / (bandit.alpha + bandit.beta) * 100);
          }
        } else {
          state.tradeLogs.unshift({
            id: `tx-${Date.now()}`,
            timestamp: Date.now(),
            chain: best.chain,
            route: best.route,
            amountIn: best.amountInEth,
            amountOut: '0',
            profit: '0',
            gasCost: best.gasCost.toFixed(4),
            netProfit: '0',
            txHash: '',
            status: 'failed'
          });

          const bandit = state.banditStates.find(b => b.chain === selectedChain);
          if (bandit) {
            bandit.beta += 1;
            bandit.winRate = (bandit.alpha / (bandit.alpha + bandit.beta) * 100);
          }
        }

        state.stats.winRate = state.stats.totalTrades > 0
          ? (state.stats.successfulTrades / state.stats.totalTrades * 100)
          : 0;

        if (state.tradeLogs.length > 100) state.tradeLogs.pop();
      }
    } else {
      // Log cada 10 ticks si no hay oportunidades
      if (state.stats.totalTicks % 10 === 0) {
        console.log(`[TICK ${state.stats.totalTicks}] ${CHAINS[selectedChain].name}: No profitable opps (${scanTime}ms)`);
      }
    }

    // Actualizar balances cada 20 ticks
    if (state.stats.totalTicks % 20 === 0) {
      for (const [key, chain] of Object.entries(CHAINS)) {
        try {
          const balance = await providers[key].getBalance(WALLET_ADDRESS);
          const balanceEth = parseFloat(ethers.formatEther(balance));
          const chainState = state.chains.find(c => c.chain === key);
          if (chainState) {
            chainState.balance = balanceEth.toFixed(6);
            chainState.balanceUsd = balanceEth * CONFIG.ETH_PRICE_USD;
            chainState.lastTick = Date.now();
          }
        } catch (e) {}
      }
    }

  } catch (e) {
    console.error(`[TICK] Error:`, e.message);
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// RUTAS API
// ═══════════════════════════════════════════════════════════════════════════════

app.get('/api/defi/multichain-arb/status', (req, res) => {
  res.json(state);
});

app.post('/api/defi/multichain-arb/start', async (req, res) => {
  console.log('[API] POST /start');

  if (state.isRunning) {
    return res.json({ success: false, error: 'Ya corriendo', isRunning: true });
  }

  state.isDryRun = req.body?.dryRun === true;
  state.isRunning = true;
  state.startTime = Date.now();
  state.stats.totalTicks = 0;
  state.stats.totalTrades = 0;
  state.stats.successfulTrades = 0;
  state.stats.totalProfitUsd = 0;
  state.stats.netProfitUsd = 0;
  state.stats.winRate = 0;
  state.stats.uptime = 0;
  state.tradeLogs = [];
  state.opportunities = [];

  // Iniciar loop ULTRA-RÁPIDO
  if (timer) clearInterval(timer);
  timer = setInterval(fastTick, CONFIG.TICK_INTERVAL_MS);

  console.log(`\n[START] Bot iniciado - ${state.isDryRun ? 'DRY RUN' : '⚠️ MODO REAL'}`);
  console.log(`[CONFIG] Intervalo: ${CONFIG.TICK_INTERVAL_MS}ms, Min profit: $${CONFIG.MIN_PROFIT_USD}`);

  res.json({ 
    success: true, 
    isRunning: true, 
    isDryRun: state.isDryRun,
    config: {
      tickInterval: CONFIG.TICK_INTERVAL_MS,
      minProfit: CONFIG.MIN_PROFIT_USD,
      autoExecute: CONFIG.AUTO_EXECUTE
    }
  });
});

app.post('/api/defi/multichain-arb/stop', (req, res) => {
  console.log('[API] POST /stop');
  state.isRunning = false;
  if (timer) { clearInterval(timer); timer = null; }
  res.json({ success: true, isRunning: false });
});

app.post('/api/defi/multichain-arb/reset', (req, res) => {
  state.stats = {
    totalTicks: 0, totalTrades: 0, successfulTrades: 0,
    totalProfitUsd: 0, totalGasUsd: 0, netProfitUsd: 0,
    winRate: 0, uptime: 0, currentChain: 'base', scanSpeed: 0, lastTradeTime: null
  };
  state.tradeLogs = [];
  state.opportunities = [];
  res.json({ success: true });
});

app.get('/api/defi/multichain-arb/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    port: PORT, 
    running: state.isRunning,
    mode: state.isDryRun ? 'DRY_RUN' : 'LIVE',
    wallet: WALLET_ADDRESS,
    config: CONFIG
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// INICIAR SERVIDOR
// ═══════════════════════════════════════════════════════════════════════════════

app.listen(PORT, async () => {
  console.log(`
╔═══════════════════════════════════════════════════════════════════════════════╗
║                                                                               ║
║   🚀 BOT ARBITRAJE ULTRA-RÁPIDO                                               ║
║                                                                               ║
║   ✅ Puerto: ${PORT}                                                           ║
║   ✅ Wallet: ${WALLET_ADDRESS.slice(0, 10)}...${WALLET_ADDRESS.slice(-5)}                                  ║
║   ✅ Intervalo: ${CONFIG.TICK_INTERVAL_MS}ms (${(1000/CONFIG.TICK_INTERVAL_MS).toFixed(1)} scans/seg)                              ║
║   ✅ Min Profit: $${CONFIG.MIN_PROFIT_USD}                                                 ║
║   ✅ Auto Execute: ${CONFIG.AUTO_EXECUTE}                                               ║
║                                                                               ║
║   ⚠️  MODO AGRESIVO - Alta frecuencia de trading                              ║
║                                                                               ║
╚═══════════════════════════════════════════════════════════════════════════════╝
  `);

  await initConnections();
  console.log('\n[READY] Bot listo. Usa POST /start para iniciar.\n');
});

process.on('SIGINT', () => {
  console.log('\n[EXIT] Cerrando...');
  if (timer) clearInterval(timer);
  process.exit(0);
});


 * ═══════════════════════════════════════════════════════════════════════════════
 * BOT ARBITRAJE ULTRA-RÁPIDO - ALTA FRECUENCIA
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * Configuración AGRESIVA:
 * - Escaneo cada 500ms (2x por segundo)
 * - Umbral de profit muy bajo ($0.01)
 * - Múltiples rutas simultáneas
 * - Ejecución inmediata
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
// CONFIGURACIÓN AGRESIVA
// ═══════════════════════════════════════════════════════════════════════════════

const CONFIG = {
  TICK_INTERVAL_MS: 500,        // Escanear cada 500ms (ULTRA RÁPIDO)
  MIN_PROFIT_USD: 0.01,         // Profit mínimo $0.01 (MUY BAJO)
  MAX_SLIPPAGE_BPS: 100,        // 1% slippage permitido
  GAS_MULTIPLIER: 1.5,          // Multiplicador de gas
  TRADE_AMOUNTS_ETH: [0.003, 0.005, 0.008, 0.01, 0.015, 0.02], // Cantidades a probar
  FEE_TIERS: [100, 500, 3000, 10000], // Todos los fee tiers
  PARALLEL_SCANS: true,         // Escanear todas las chains en paralelo
  AUTO_EXECUTE: true,           // Ejecutar automáticamente
  ETH_PRICE_USD: 3500           // Precio ETH aproximado
};

const PRIVATE_KEY = process.env.VITE_ETH_PRIVATE_KEY;
const WALLET_ADDRESS = process.env.VITE_ETH_WALLET_ADDRESS;

if (!PRIVATE_KEY || !WALLET_ADDRESS) {
  console.error('❌ ERROR: Credenciales no configuradas en .env');
  process.exit(1);
}

// ═══════════════════════════════════════════════════════════════════════════════
// CHAINS Y CONTRATOS
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
  },
  optimism: {
    name: 'Optimism',
    chainId: 10,
    rpc: 'https://mainnet.optimism.io',
    explorer: 'https://optimistic.etherscan.io',
    tokens: {
      WETH: '0x4200000000000000000000000000000000000006',
      USDC: '0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85'
    },
    quoter: '0x61fFE014bA17989E743c5F6cB21bF9697530B21e',
    router: '0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45'
  }
};

// ABIs
const QUOTER_ABI = [
  'function quoteExactInputSingle((address tokenIn, address tokenOut, uint256 amountIn, uint24 fee, uint160 sqrtPriceLimitX96)) external returns (uint256 amountOut, uint160 sqrtPriceX96After, uint32 initializedTicksCrossed, uint256 gasEstimate)'
];

const ROUTER_ABI = [
  'function exactInputSingle((address tokenIn, address tokenOut, uint24 fee, address recipient, uint256 amountIn, uint256 amountOutMinimum, uint160 sqrtPriceLimitX96)) external payable returns (uint256 amountOut)',
  'function multicall(uint256 deadline, bytes[] calldata data) external payable returns (bytes[] memory results)'
];

const WETH_ABI = [
  'function deposit() payable',
  'function withdraw(uint256)',
  'function balanceOf(address) view returns (uint256)',
  'function approve(address spender, uint256 amount) returns (bool)',
  'function allowance(address owner, address spender) view returns (uint256)'
];

const ERC20_ABI = [
  'function balanceOf(address) view returns (uint256)',
  'function approve(address spender, uint256 amount) returns (bool)',
  'function allowance(address owner, address spender) view returns (uint256)'
];

// ═══════════════════════════════════════════════════════════════════════════════
// ESTADO DEL BOT
// ═══════════════════════════════════════════════════════════════════════════════

let state = {
  isRunning: false,
  isDryRun: false,
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
    currentChain: 'base',
    scanSpeed: 0,
    lastTradeTime: null
  },
  chains: [],
  tradeLogs: [],
  opportunities: [],
  banditStates: [
    { chain: 'base', alpha: 2, beta: 2, winRate: 50, selected: true },
    { chain: 'arbitrum', alpha: 2, beta: 2, winRate: 50, selected: false },
    { chain: 'optimism', alpha: 2, beta: 2, winRate: 50, selected: false }
  ]
};

let timer = null;
let providers = {};
let signers = {};
let isExecuting = false;

// ═══════════════════════════════════════════════════════════════════════════════
// INICIALIZAR CONEXIONES
// ═══════════════════════════════════════════════════════════════════════════════

async function initConnections() {
  console.log('[INIT] Inicializando conexiones...');
  
  for (const [key, chain] of Object.entries(CHAINS)) {
    try {
      providers[key] = new ethers.JsonRpcProvider(chain.rpc);
      signers[key] = new ethers.Wallet(PRIVATE_KEY, providers[key]);
      
      const balance = await providers[key].getBalance(WALLET_ADDRESS);
      const balanceEth = parseFloat(ethers.formatEther(balance));
      
      state.chains.push({
        chain: key,
        name: chain.name,
        chainId: chain.chainId,
        balance: balanceEth.toFixed(6),
        balanceUsd: balanceEth * CONFIG.ETH_PRICE_USD,
        routes: CONFIG.FEE_TIERS.length * CONFIG.TRADE_AMOUNTS_ETH.length,
        isActive: true,
        lastTick: Date.now(),
        explorer: chain.explorer
      });
      
      console.log(`[INIT] ✅ ${chain.name}: ${balanceEth.toFixed(6)} ETH`);
    } catch (e) {
      console.error(`[INIT] ❌ ${chain.name}: ${e.message}`);
    }
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// ESCANEO ULTRA-RÁPIDO
// ═══════════════════════════════════════════════════════════════════════════════

async function fastScan(chainKey) {
  const chain = CHAINS[chainKey];
  const provider = providers[chainKey];
  const opportunities = [];

  try {
    const quoter = new ethers.Contract(chain.quoter, QUOTER_ABI, provider);
    
    // Obtener gas price
    const feeData = await provider.getFeeData();
    const gasPrice = feeData.gasPrice || ethers.parseUnits('0.001', 'gwei');
    const gasCostWei = gasPrice * 200000n;
    const gasCostUsd = parseFloat(ethers.formatEther(gasCostWei)) * CONFIG.ETH_PRICE_USD;

    // Probar TODAS las combinaciones en paralelo
    const promises = [];
    
    for (const amountEth of CONFIG.TRADE_AMOUNTS_ETH) {
      const amount = ethers.parseEther(amountEth.toString());
      
      for (let i = 0; i < CONFIG.FEE_TIERS.length; i++) {
        for (let j = 0; j < CONFIG.FEE_TIERS.length; j++) {
          if (i === j) continue;
          
          promises.push(
            (async () => {
              try {
                // ETH -> USDC
                const quote1 = await quoter.quoteExactInputSingle.staticCall({
                  tokenIn: chain.tokens.WETH,
                  tokenOut: chain.tokens.USDC,
                  amountIn: amount,
                  fee: CONFIG.FEE_TIERS[i],
                  sqrtPriceLimitX96: 0n
                });
                const usdcOut = quote1[0];

                // USDC -> ETH
                const quote2 = await quoter.quoteExactInputSingle.staticCall({
                  tokenIn: chain.tokens.USDC,
                  tokenOut: chain.tokens.WETH,
                  amountIn: usdcOut,
                  fee: CONFIG.FEE_TIERS[j],
                  sqrtPriceLimitX96: 0n
                });
                const ethOut = quote2[0];

                const grossProfit = ethOut - amount;
                const netProfit = grossProfit - gasCostWei;

                if (netProfit > 0n) {
                  const netProfitUsd = parseFloat(ethers.formatEther(netProfit)) * CONFIG.ETH_PRICE_USD;
                  
                  return {
                    chain: chainKey,
                    route: `${CONFIG.FEE_TIERS[i]/100}%->${CONFIG.FEE_TIERS[j]/100}%`,
                    amountIn: amount,
                    amountInEth: amountEth,
                    fee1: CONFIG.FEE_TIERS[i],
                    fee2: CONFIG.FEE_TIERS[j],
                    usdcIntermediate: usdcOut,
                    ethOut: ethOut,
                    netProfit: netProfit,
                    netProfitUsd: netProfitUsd,
                    gasCost: gasCostUsd,
                    spreadBps: (Number(netProfit * 10000n / amount) / 100).toFixed(2),
                    timestamp: Date.now()
                  };
                }
              } catch (e) {
                // Pool no existe
              }
              return null;
            })()
          );
        }
      }
    }

    const results = await Promise.all(promises);
    opportunities.push(...results.filter(r => r !== null));

  } catch (e) {
    console.error(`[SCAN] Error ${chainKey}:`, e.message);
  }

  return opportunities;
}

// ═══════════════════════════════════════════════════════════════════════════════
// EJECUCIÓN RÁPIDA DE TRADE
// ═══════════════════════════════════════════════════════════════════════════════

async function executeTrade(opp) {
  if (isExecuting) {
    console.log('[EXEC] Ya hay una ejecución en progreso, saltando...');
    return null;
  }
  
  isExecuting = true;
  const chain = CHAINS[opp.chain];
  const signer = signers[opp.chain];
  const provider = providers[opp.chain];

  console.log(`\n🚀 [EXEC] EJECUTANDO TRADE en ${chain.name}`);
  console.log(`   Route: ${opp.route}`);
  console.log(`   Amount: ${opp.amountInEth} ETH`);
  console.log(`   Expected: $${opp.netProfitUsd.toFixed(4)}`);

  try {
    // Verificar balance
    const balance = await provider.getBalance(WALLET_ADDRESS);
    if (balance < opp.amountIn) {
      console.log(`   ❌ Balance insuficiente`);
      isExecuting = false;
      return { success: false, error: 'Balance insuficiente' };
    }

    const weth = new ethers.Contract(chain.tokens.WETH, WETH_ABI, signer);
    const router = new ethers.Contract(chain.router, ROUTER_ABI, signer);
    const usdc = new ethers.Contract(chain.tokens.USDC, ERC20_ABI, signer);

    // 1. Wrap ETH -> WETH
    console.log(`   📦 Wrapping ETH...`);
    const wrapTx = await weth.deposit({ 
      value: opp.amountIn,
      gasLimit: 50000
    });
    await wrapTx.wait(1);
    console.log(`   ✅ Wrap: ${wrapTx.hash.slice(0, 20)}...`);

    // 2. Approve si es necesario
    const allowance = await weth.allowance(WALLET_ADDRESS, chain.router);
    if (allowance < opp.amountIn) {
      console.log(`   🔓 Approving...`);
      const approveTx = await weth.approve(chain.router, ethers.MaxUint256, { gasLimit: 50000 });
      await approveTx.wait(1);
    }

    // 3. Swap WETH -> USDC
    console.log(`   🔄 Swap 1: WETH -> USDC...`);
    const minUsdc = (opp.usdcIntermediate * BigInt(10000 - CONFIG.MAX_SLIPPAGE_BPS)) / 10000n;
    
    const swap1Tx = await router.exactInputSingle({
      tokenIn: chain.tokens.WETH,
      tokenOut: chain.tokens.USDC,
      fee: opp.fee1,
      recipient: WALLET_ADDRESS,
      amountIn: opp.amountIn,
      amountOutMinimum: minUsdc,
      sqrtPriceLimitX96: 0n
    }, { gasLimit: 300000 });
    
    const receipt1 = await swap1Tx.wait(1);
    console.log(`   ✅ Swap 1: ${receipt1.hash.slice(0, 20)}...`);

    // 4. Approve USDC
    const usdcBalance = await usdc.balanceOf(WALLET_ADDRESS);
    const usdcAllowance = await usdc.allowance(WALLET_ADDRESS, chain.router);
    if (usdcAllowance < usdcBalance) {
      const approveUsdcTx = await usdc.approve(chain.router, ethers.MaxUint256, { gasLimit: 50000 });
      await approveUsdcTx.wait(1);
    }

    // 5. Swap USDC -> WETH
    console.log(`   🔄 Swap 2: USDC -> WETH...`);
    const minWeth = (opp.ethOut * BigInt(10000 - CONFIG.MAX_SLIPPAGE_BPS)) / 10000n;
    
    const swap2Tx = await router.exactInputSingle({
      tokenIn: chain.tokens.USDC,
      tokenOut: chain.tokens.WETH,
      fee: opp.fee2,
      recipient: WALLET_ADDRESS,
      amountIn: usdcBalance,
      amountOutMinimum: minWeth,
      sqrtPriceLimitX96: 0n
    }, { gasLimit: 300000 });
    
    const receipt2 = await swap2Tx.wait(1);
    console.log(`   ✅ Swap 2: ${receipt2.hash.slice(0, 20)}...`);

    // 6. Calcular profit real
    const finalWeth = await weth.balanceOf(WALLET_ADDRESS);
    const actualProfit = finalWeth - opp.amountIn;
    const actualProfitUsd = parseFloat(ethers.formatEther(actualProfit)) * CONFIG.ETH_PRICE_USD;

    console.log(`   💰 PROFIT: $${actualProfitUsd.toFixed(4)}`);
    console.log(`   🔗 TX: ${chain.explorer}/tx/${receipt2.hash}`);

    isExecuting = false;
    return {
      success: true,
      profitUsd: actualProfitUsd,
      txHash: receipt2.hash
    };

  } catch (e) {
    console.log(`   ❌ Error: ${e.message}`);
    isExecuting = false;
    return { success: false, error: e.message };
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// LOOP PRINCIPAL ULTRA-RÁPIDO
// ═══════════════════════════════════════════════════════════════════════════════

async function fastTick() {
  if (!state.isRunning || isExecuting) return;

  const tickStart = Date.now();
  state.stats.totalTicks++;
  state.stats.uptime = Math.floor((Date.now() - state.startTime) / 1000);

  // Seleccionar chain (round-robin para velocidad)
  const chainKeys = Object.keys(CHAINS);
  const chainIndex = state.stats.totalTicks % chainKeys.length;
  const selectedChain = chainKeys[chainIndex];
  state.stats.currentChain = selectedChain;

  // Actualizar bandit
  state.banditStates = state.banditStates.map(b => ({
    ...b,
    selected: b.chain === selectedChain
  }));

  try {
    // Escaneo rápido
    const opportunities = await fastScan(selectedChain);
    const scanTime = Date.now() - tickStart;
    state.stats.scanSpeed = scanTime;

    if (opportunities.length > 0) {
      // Ordenar por profit
      opportunities.sort((a, b) => b.netProfitUsd - a.netProfitUsd);
      const best = opportunities[0];

      // Guardar oportunidades
      state.opportunities = [...opportunities.slice(0, 5), ...state.opportunities].slice(0, 20);

      console.log(`[TICK ${state.stats.totalTicks}] ${CHAINS[selectedChain].name}: ${opportunities.length} opps, best: $${best.netProfitUsd.toFixed(4)} (${scanTime}ms)`);

      // Ejecutar si profit > umbral y NO es dry run
      if (best.netProfitUsd >= CONFIG.MIN_PROFIT_USD && !state.isDryRun && CONFIG.AUTO_EXECUTE) {
        console.log(`[EXEC] Profit $${best.netProfitUsd.toFixed(4)} >= $${CONFIG.MIN_PROFIT_USD}, ejecutando...`);
        
        const result = await executeTrade(best);
        state.stats.totalTrades++;
        state.stats.lastTradeTime = Date.now();

        if (result && result.success) {
          state.stats.successfulTrades++;
          state.stats.totalProfitUsd += result.profitUsd;
          state.stats.netProfitUsd = state.stats.totalProfitUsd;

          state.tradeLogs.unshift({
            id: `tx-${Date.now()}`,
            timestamp: Date.now(),
            chain: best.chain,
            route: best.route,
            amountIn: best.amountInEth,
            amountOut: ethers.formatEther(best.ethOut),
            profit: result.profitUsd.toFixed(4),
            gasCost: best.gasCost.toFixed(4),
            netProfit: result.profitUsd.toFixed(4),
            txHash: result.txHash,
            status: 'success'
          });

          // Actualizar bandit
          const bandit = state.banditStates.find(b => b.chain === selectedChain);
          if (bandit) {
            bandit.alpha += 1;
            bandit.winRate = (bandit.alpha / (bandit.alpha + bandit.beta) * 100);
          }
        } else {
          state.tradeLogs.unshift({
            id: `tx-${Date.now()}`,
            timestamp: Date.now(),
            chain: best.chain,
            route: best.route,
            amountIn: best.amountInEth,
            amountOut: '0',
            profit: '0',
            gasCost: best.gasCost.toFixed(4),
            netProfit: '0',
            txHash: '',
            status: 'failed'
          });

          const bandit = state.banditStates.find(b => b.chain === selectedChain);
          if (bandit) {
            bandit.beta += 1;
            bandit.winRate = (bandit.alpha / (bandit.alpha + bandit.beta) * 100);
          }
        }

        state.stats.winRate = state.stats.totalTrades > 0
          ? (state.stats.successfulTrades / state.stats.totalTrades * 100)
          : 0;

        if (state.tradeLogs.length > 100) state.tradeLogs.pop();
      }
    } else {
      // Log cada 10 ticks si no hay oportunidades
      if (state.stats.totalTicks % 10 === 0) {
        console.log(`[TICK ${state.stats.totalTicks}] ${CHAINS[selectedChain].name}: No profitable opps (${scanTime}ms)`);
      }
    }

    // Actualizar balances cada 20 ticks
    if (state.stats.totalTicks % 20 === 0) {
      for (const [key, chain] of Object.entries(CHAINS)) {
        try {
          const balance = await providers[key].getBalance(WALLET_ADDRESS);
          const balanceEth = parseFloat(ethers.formatEther(balance));
          const chainState = state.chains.find(c => c.chain === key);
          if (chainState) {
            chainState.balance = balanceEth.toFixed(6);
            chainState.balanceUsd = balanceEth * CONFIG.ETH_PRICE_USD;
            chainState.lastTick = Date.now();
          }
        } catch (e) {}
      }
    }

  } catch (e) {
    console.error(`[TICK] Error:`, e.message);
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// RUTAS API
// ═══════════════════════════════════════════════════════════════════════════════

app.get('/api/defi/multichain-arb/status', (req, res) => {
  res.json(state);
});

app.post('/api/defi/multichain-arb/start', async (req, res) => {
  console.log('[API] POST /start');

  if (state.isRunning) {
    return res.json({ success: false, error: 'Ya corriendo', isRunning: true });
  }

  state.isDryRun = req.body?.dryRun === true;
  state.isRunning = true;
  state.startTime = Date.now();
  state.stats.totalTicks = 0;
  state.stats.totalTrades = 0;
  state.stats.successfulTrades = 0;
  state.stats.totalProfitUsd = 0;
  state.stats.netProfitUsd = 0;
  state.stats.winRate = 0;
  state.stats.uptime = 0;
  state.tradeLogs = [];
  state.opportunities = [];

  // Iniciar loop ULTRA-RÁPIDO
  if (timer) clearInterval(timer);
  timer = setInterval(fastTick, CONFIG.TICK_INTERVAL_MS);

  console.log(`\n[START] Bot iniciado - ${state.isDryRun ? 'DRY RUN' : '⚠️ MODO REAL'}`);
  console.log(`[CONFIG] Intervalo: ${CONFIG.TICK_INTERVAL_MS}ms, Min profit: $${CONFIG.MIN_PROFIT_USD}`);

  res.json({ 
    success: true, 
    isRunning: true, 
    isDryRun: state.isDryRun,
    config: {
      tickInterval: CONFIG.TICK_INTERVAL_MS,
      minProfit: CONFIG.MIN_PROFIT_USD,
      autoExecute: CONFIG.AUTO_EXECUTE
    }
  });
});

app.post('/api/defi/multichain-arb/stop', (req, res) => {
  console.log('[API] POST /stop');
  state.isRunning = false;
  if (timer) { clearInterval(timer); timer = null; }
  res.json({ success: true, isRunning: false });
});

app.post('/api/defi/multichain-arb/reset', (req, res) => {
  state.stats = {
    totalTicks: 0, totalTrades: 0, successfulTrades: 0,
    totalProfitUsd: 0, totalGasUsd: 0, netProfitUsd: 0,
    winRate: 0, uptime: 0, currentChain: 'base', scanSpeed: 0, lastTradeTime: null
  };
  state.tradeLogs = [];
  state.opportunities = [];
  res.json({ success: true });
});

app.get('/api/defi/multichain-arb/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    port: PORT, 
    running: state.isRunning,
    mode: state.isDryRun ? 'DRY_RUN' : 'LIVE',
    wallet: WALLET_ADDRESS,
    config: CONFIG
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// INICIAR SERVIDOR
// ═══════════════════════════════════════════════════════════════════════════════

app.listen(PORT, async () => {
  console.log(`
╔═══════════════════════════════════════════════════════════════════════════════╗
║                                                                               ║
║   🚀 BOT ARBITRAJE ULTRA-RÁPIDO                                               ║
║                                                                               ║
║   ✅ Puerto: ${PORT}                                                           ║
║   ✅ Wallet: ${WALLET_ADDRESS.slice(0, 10)}...${WALLET_ADDRESS.slice(-5)}                                  ║
║   ✅ Intervalo: ${CONFIG.TICK_INTERVAL_MS}ms (${(1000/CONFIG.TICK_INTERVAL_MS).toFixed(1)} scans/seg)                              ║
║   ✅ Min Profit: $${CONFIG.MIN_PROFIT_USD}                                                 ║
║   ✅ Auto Execute: ${CONFIG.AUTO_EXECUTE}                                               ║
║                                                                               ║
║   ⚠️  MODO AGRESIVO - Alta frecuencia de trading                              ║
║                                                                               ║
╚═══════════════════════════════════════════════════════════════════════════════╝
  `);

  await initConnections();
  console.log('\n[READY] Bot listo. Usa POST /start para iniciar.\n');
});

process.on('SIGINT', () => {
  console.log('\n[EXIT] Cerrando...');
  if (timer) clearInterval(timer);
  process.exit(0);
});


 * ═══════════════════════════════════════════════════════════════════════════════
 * BOT ARBITRAJE ULTRA-RÁPIDO - ALTA FRECUENCIA
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * Configuración AGRESIVA:
 * - Escaneo cada 500ms (2x por segundo)
 * - Umbral de profit muy bajo ($0.01)
 * - Múltiples rutas simultáneas
 * - Ejecución inmediata
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
// CONFIGURACIÓN AGRESIVA
// ═══════════════════════════════════════════════════════════════════════════════

const CONFIG = {
  TICK_INTERVAL_MS: 500,        // Escanear cada 500ms (ULTRA RÁPIDO)
  MIN_PROFIT_USD: 0.01,         // Profit mínimo $0.01 (MUY BAJO)
  MAX_SLIPPAGE_BPS: 100,        // 1% slippage permitido
  GAS_MULTIPLIER: 1.5,          // Multiplicador de gas
  TRADE_AMOUNTS_ETH: [0.003, 0.005, 0.008, 0.01, 0.015, 0.02], // Cantidades a probar
  FEE_TIERS: [100, 500, 3000, 10000], // Todos los fee tiers
  PARALLEL_SCANS: true,         // Escanear todas las chains en paralelo
  AUTO_EXECUTE: true,           // Ejecutar automáticamente
  ETH_PRICE_USD: 3500           // Precio ETH aproximado
};

const PRIVATE_KEY = process.env.VITE_ETH_PRIVATE_KEY;
const WALLET_ADDRESS = process.env.VITE_ETH_WALLET_ADDRESS;

if (!PRIVATE_KEY || !WALLET_ADDRESS) {
  console.error('❌ ERROR: Credenciales no configuradas en .env');
  process.exit(1);
}

// ═══════════════════════════════════════════════════════════════════════════════
// CHAINS Y CONTRATOS
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
  },
  optimism: {
    name: 'Optimism',
    chainId: 10,
    rpc: 'https://mainnet.optimism.io',
    explorer: 'https://optimistic.etherscan.io',
    tokens: {
      WETH: '0x4200000000000000000000000000000000000006',
      USDC: '0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85'
    },
    quoter: '0x61fFE014bA17989E743c5F6cB21bF9697530B21e',
    router: '0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45'
  }
};

// ABIs
const QUOTER_ABI = [
  'function quoteExactInputSingle((address tokenIn, address tokenOut, uint256 amountIn, uint24 fee, uint160 sqrtPriceLimitX96)) external returns (uint256 amountOut, uint160 sqrtPriceX96After, uint32 initializedTicksCrossed, uint256 gasEstimate)'
];

const ROUTER_ABI = [
  'function exactInputSingle((address tokenIn, address tokenOut, uint24 fee, address recipient, uint256 amountIn, uint256 amountOutMinimum, uint160 sqrtPriceLimitX96)) external payable returns (uint256 amountOut)',
  'function multicall(uint256 deadline, bytes[] calldata data) external payable returns (bytes[] memory results)'
];

const WETH_ABI = [
  'function deposit() payable',
  'function withdraw(uint256)',
  'function balanceOf(address) view returns (uint256)',
  'function approve(address spender, uint256 amount) returns (bool)',
  'function allowance(address owner, address spender) view returns (uint256)'
];

const ERC20_ABI = [
  'function balanceOf(address) view returns (uint256)',
  'function approve(address spender, uint256 amount) returns (bool)',
  'function allowance(address owner, address spender) view returns (uint256)'
];

// ═══════════════════════════════════════════════════════════════════════════════
// ESTADO DEL BOT
// ═══════════════════════════════════════════════════════════════════════════════

let state = {
  isRunning: false,
  isDryRun: false,
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
    currentChain: 'base',
    scanSpeed: 0,
    lastTradeTime: null
  },
  chains: [],
  tradeLogs: [],
  opportunities: [],
  banditStates: [
    { chain: 'base', alpha: 2, beta: 2, winRate: 50, selected: true },
    { chain: 'arbitrum', alpha: 2, beta: 2, winRate: 50, selected: false },
    { chain: 'optimism', alpha: 2, beta: 2, winRate: 50, selected: false }
  ]
};

let timer = null;
let providers = {};
let signers = {};
let isExecuting = false;

// ═══════════════════════════════════════════════════════════════════════════════
// INICIALIZAR CONEXIONES
// ═══════════════════════════════════════════════════════════════════════════════

async function initConnections() {
  console.log('[INIT] Inicializando conexiones...');
  
  for (const [key, chain] of Object.entries(CHAINS)) {
    try {
      providers[key] = new ethers.JsonRpcProvider(chain.rpc);
      signers[key] = new ethers.Wallet(PRIVATE_KEY, providers[key]);
      
      const balance = await providers[key].getBalance(WALLET_ADDRESS);
      const balanceEth = parseFloat(ethers.formatEther(balance));
      
      state.chains.push({
        chain: key,
        name: chain.name,
        chainId: chain.chainId,
        balance: balanceEth.toFixed(6),
        balanceUsd: balanceEth * CONFIG.ETH_PRICE_USD,
        routes: CONFIG.FEE_TIERS.length * CONFIG.TRADE_AMOUNTS_ETH.length,
        isActive: true,
        lastTick: Date.now(),
        explorer: chain.explorer
      });
      
      console.log(`[INIT] ✅ ${chain.name}: ${balanceEth.toFixed(6)} ETH`);
    } catch (e) {
      console.error(`[INIT] ❌ ${chain.name}: ${e.message}`);
    }
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// ESCANEO ULTRA-RÁPIDO
// ═══════════════════════════════════════════════════════════════════════════════

async function fastScan(chainKey) {
  const chain = CHAINS[chainKey];
  const provider = providers[chainKey];
  const opportunities = [];

  try {
    const quoter = new ethers.Contract(chain.quoter, QUOTER_ABI, provider);
    
    // Obtener gas price
    const feeData = await provider.getFeeData();
    const gasPrice = feeData.gasPrice || ethers.parseUnits('0.001', 'gwei');
    const gasCostWei = gasPrice * 200000n;
    const gasCostUsd = parseFloat(ethers.formatEther(gasCostWei)) * CONFIG.ETH_PRICE_USD;

    // Probar TODAS las combinaciones en paralelo
    const promises = [];
    
    for (const amountEth of CONFIG.TRADE_AMOUNTS_ETH) {
      const amount = ethers.parseEther(amountEth.toString());
      
      for (let i = 0; i < CONFIG.FEE_TIERS.length; i++) {
        for (let j = 0; j < CONFIG.FEE_TIERS.length; j++) {
          if (i === j) continue;
          
          promises.push(
            (async () => {
              try {
                // ETH -> USDC
                const quote1 = await quoter.quoteExactInputSingle.staticCall({
                  tokenIn: chain.tokens.WETH,
                  tokenOut: chain.tokens.USDC,
                  amountIn: amount,
                  fee: CONFIG.FEE_TIERS[i],
                  sqrtPriceLimitX96: 0n
                });
                const usdcOut = quote1[0];

                // USDC -> ETH
                const quote2 = await quoter.quoteExactInputSingle.staticCall({
                  tokenIn: chain.tokens.USDC,
                  tokenOut: chain.tokens.WETH,
                  amountIn: usdcOut,
                  fee: CONFIG.FEE_TIERS[j],
                  sqrtPriceLimitX96: 0n
                });
                const ethOut = quote2[0];

                const grossProfit = ethOut - amount;
                const netProfit = grossProfit - gasCostWei;

                if (netProfit > 0n) {
                  const netProfitUsd = parseFloat(ethers.formatEther(netProfit)) * CONFIG.ETH_PRICE_USD;
                  
                  return {
                    chain: chainKey,
                    route: `${CONFIG.FEE_TIERS[i]/100}%->${CONFIG.FEE_TIERS[j]/100}%`,
                    amountIn: amount,
                    amountInEth: amountEth,
                    fee1: CONFIG.FEE_TIERS[i],
                    fee2: CONFIG.FEE_TIERS[j],
                    usdcIntermediate: usdcOut,
                    ethOut: ethOut,
                    netProfit: netProfit,
                    netProfitUsd: netProfitUsd,
                    gasCost: gasCostUsd,
                    spreadBps: (Number(netProfit * 10000n / amount) / 100).toFixed(2),
                    timestamp: Date.now()
                  };
                }
              } catch (e) {
                // Pool no existe
              }
              return null;
            })()
          );
        }
      }
    }

    const results = await Promise.all(promises);
    opportunities.push(...results.filter(r => r !== null));

  } catch (e) {
    console.error(`[SCAN] Error ${chainKey}:`, e.message);
  }

  return opportunities;
}

// ═══════════════════════════════════════════════════════════════════════════════
// EJECUCIÓN RÁPIDA DE TRADE
// ═══════════════════════════════════════════════════════════════════════════════

async function executeTrade(opp) {
  if (isExecuting) {
    console.log('[EXEC] Ya hay una ejecución en progreso, saltando...');
    return null;
  }
  
  isExecuting = true;
  const chain = CHAINS[opp.chain];
  const signer = signers[opp.chain];
  const provider = providers[opp.chain];

  console.log(`\n🚀 [EXEC] EJECUTANDO TRADE en ${chain.name}`);
  console.log(`   Route: ${opp.route}`);
  console.log(`   Amount: ${opp.amountInEth} ETH`);
  console.log(`   Expected: $${opp.netProfitUsd.toFixed(4)}`);

  try {
    // Verificar balance
    const balance = await provider.getBalance(WALLET_ADDRESS);
    if (balance < opp.amountIn) {
      console.log(`   ❌ Balance insuficiente`);
      isExecuting = false;
      return { success: false, error: 'Balance insuficiente' };
    }

    const weth = new ethers.Contract(chain.tokens.WETH, WETH_ABI, signer);
    const router = new ethers.Contract(chain.router, ROUTER_ABI, signer);
    const usdc = new ethers.Contract(chain.tokens.USDC, ERC20_ABI, signer);

    // 1. Wrap ETH -> WETH
    console.log(`   📦 Wrapping ETH...`);
    const wrapTx = await weth.deposit({ 
      value: opp.amountIn,
      gasLimit: 50000
    });
    await wrapTx.wait(1);
    console.log(`   ✅ Wrap: ${wrapTx.hash.slice(0, 20)}...`);

    // 2. Approve si es necesario
    const allowance = await weth.allowance(WALLET_ADDRESS, chain.router);
    if (allowance < opp.amountIn) {
      console.log(`   🔓 Approving...`);
      const approveTx = await weth.approve(chain.router, ethers.MaxUint256, { gasLimit: 50000 });
      await approveTx.wait(1);
    }

    // 3. Swap WETH -> USDC
    console.log(`   🔄 Swap 1: WETH -> USDC...`);
    const minUsdc = (opp.usdcIntermediate * BigInt(10000 - CONFIG.MAX_SLIPPAGE_BPS)) / 10000n;
    
    const swap1Tx = await router.exactInputSingle({
      tokenIn: chain.tokens.WETH,
      tokenOut: chain.tokens.USDC,
      fee: opp.fee1,
      recipient: WALLET_ADDRESS,
      amountIn: opp.amountIn,
      amountOutMinimum: minUsdc,
      sqrtPriceLimitX96: 0n
    }, { gasLimit: 300000 });
    
    const receipt1 = await swap1Tx.wait(1);
    console.log(`   ✅ Swap 1: ${receipt1.hash.slice(0, 20)}...`);

    // 4. Approve USDC
    const usdcBalance = await usdc.balanceOf(WALLET_ADDRESS);
    const usdcAllowance = await usdc.allowance(WALLET_ADDRESS, chain.router);
    if (usdcAllowance < usdcBalance) {
      const approveUsdcTx = await usdc.approve(chain.router, ethers.MaxUint256, { gasLimit: 50000 });
      await approveUsdcTx.wait(1);
    }

    // 5. Swap USDC -> WETH
    console.log(`   🔄 Swap 2: USDC -> WETH...`);
    const minWeth = (opp.ethOut * BigInt(10000 - CONFIG.MAX_SLIPPAGE_BPS)) / 10000n;
    
    const swap2Tx = await router.exactInputSingle({
      tokenIn: chain.tokens.USDC,
      tokenOut: chain.tokens.WETH,
      fee: opp.fee2,
      recipient: WALLET_ADDRESS,
      amountIn: usdcBalance,
      amountOutMinimum: minWeth,
      sqrtPriceLimitX96: 0n
    }, { gasLimit: 300000 });
    
    const receipt2 = await swap2Tx.wait(1);
    console.log(`   ✅ Swap 2: ${receipt2.hash.slice(0, 20)}...`);

    // 6. Calcular profit real
    const finalWeth = await weth.balanceOf(WALLET_ADDRESS);
    const actualProfit = finalWeth - opp.amountIn;
    const actualProfitUsd = parseFloat(ethers.formatEther(actualProfit)) * CONFIG.ETH_PRICE_USD;

    console.log(`   💰 PROFIT: $${actualProfitUsd.toFixed(4)}`);
    console.log(`   🔗 TX: ${chain.explorer}/tx/${receipt2.hash}`);

    isExecuting = false;
    return {
      success: true,
      profitUsd: actualProfitUsd,
      txHash: receipt2.hash
    };

  } catch (e) {
    console.log(`   ❌ Error: ${e.message}`);
    isExecuting = false;
    return { success: false, error: e.message };
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// LOOP PRINCIPAL ULTRA-RÁPIDO
// ═══════════════════════════════════════════════════════════════════════════════

async function fastTick() {
  if (!state.isRunning || isExecuting) return;

  const tickStart = Date.now();
  state.stats.totalTicks++;
  state.stats.uptime = Math.floor((Date.now() - state.startTime) / 1000);

  // Seleccionar chain (round-robin para velocidad)
  const chainKeys = Object.keys(CHAINS);
  const chainIndex = state.stats.totalTicks % chainKeys.length;
  const selectedChain = chainKeys[chainIndex];
  state.stats.currentChain = selectedChain;

  // Actualizar bandit
  state.banditStates = state.banditStates.map(b => ({
    ...b,
    selected: b.chain === selectedChain
  }));

  try {
    // Escaneo rápido
    const opportunities = await fastScan(selectedChain);
    const scanTime = Date.now() - tickStart;
    state.stats.scanSpeed = scanTime;

    if (opportunities.length > 0) {
      // Ordenar por profit
      opportunities.sort((a, b) => b.netProfitUsd - a.netProfitUsd);
      const best = opportunities[0];

      // Guardar oportunidades
      state.opportunities = [...opportunities.slice(0, 5), ...state.opportunities].slice(0, 20);

      console.log(`[TICK ${state.stats.totalTicks}] ${CHAINS[selectedChain].name}: ${opportunities.length} opps, best: $${best.netProfitUsd.toFixed(4)} (${scanTime}ms)`);

      // Ejecutar si profit > umbral y NO es dry run
      if (best.netProfitUsd >= CONFIG.MIN_PROFIT_USD && !state.isDryRun && CONFIG.AUTO_EXECUTE) {
        console.log(`[EXEC] Profit $${best.netProfitUsd.toFixed(4)} >= $${CONFIG.MIN_PROFIT_USD}, ejecutando...`);
        
        const result = await executeTrade(best);
        state.stats.totalTrades++;
        state.stats.lastTradeTime = Date.now();

        if (result && result.success) {
          state.stats.successfulTrades++;
          state.stats.totalProfitUsd += result.profitUsd;
          state.stats.netProfitUsd = state.stats.totalProfitUsd;

          state.tradeLogs.unshift({
            id: `tx-${Date.now()}`,
            timestamp: Date.now(),
            chain: best.chain,
            route: best.route,
            amountIn: best.amountInEth,
            amountOut: ethers.formatEther(best.ethOut),
            profit: result.profitUsd.toFixed(4),
            gasCost: best.gasCost.toFixed(4),
            netProfit: result.profitUsd.toFixed(4),
            txHash: result.txHash,
            status: 'success'
          });

          // Actualizar bandit
          const bandit = state.banditStates.find(b => b.chain === selectedChain);
          if (bandit) {
            bandit.alpha += 1;
            bandit.winRate = (bandit.alpha / (bandit.alpha + bandit.beta) * 100);
          }
        } else {
          state.tradeLogs.unshift({
            id: `tx-${Date.now()}`,
            timestamp: Date.now(),
            chain: best.chain,
            route: best.route,
            amountIn: best.amountInEth,
            amountOut: '0',
            profit: '0',
            gasCost: best.gasCost.toFixed(4),
            netProfit: '0',
            txHash: '',
            status: 'failed'
          });

          const bandit = state.banditStates.find(b => b.chain === selectedChain);
          if (bandit) {
            bandit.beta += 1;
            bandit.winRate = (bandit.alpha / (bandit.alpha + bandit.beta) * 100);
          }
        }

        state.stats.winRate = state.stats.totalTrades > 0
          ? (state.stats.successfulTrades / state.stats.totalTrades * 100)
          : 0;

        if (state.tradeLogs.length > 100) state.tradeLogs.pop();
      }
    } else {
      // Log cada 10 ticks si no hay oportunidades
      if (state.stats.totalTicks % 10 === 0) {
        console.log(`[TICK ${state.stats.totalTicks}] ${CHAINS[selectedChain].name}: No profitable opps (${scanTime}ms)`);
      }
    }

    // Actualizar balances cada 20 ticks
    if (state.stats.totalTicks % 20 === 0) {
      for (const [key, chain] of Object.entries(CHAINS)) {
        try {
          const balance = await providers[key].getBalance(WALLET_ADDRESS);
          const balanceEth = parseFloat(ethers.formatEther(balance));
          const chainState = state.chains.find(c => c.chain === key);
          if (chainState) {
            chainState.balance = balanceEth.toFixed(6);
            chainState.balanceUsd = balanceEth * CONFIG.ETH_PRICE_USD;
            chainState.lastTick = Date.now();
          }
        } catch (e) {}
      }
    }

  } catch (e) {
    console.error(`[TICK] Error:`, e.message);
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// RUTAS API
// ═══════════════════════════════════════════════════════════════════════════════

app.get('/api/defi/multichain-arb/status', (req, res) => {
  res.json(state);
});

app.post('/api/defi/multichain-arb/start', async (req, res) => {
  console.log('[API] POST /start');

  if (state.isRunning) {
    return res.json({ success: false, error: 'Ya corriendo', isRunning: true });
  }

  state.isDryRun = req.body?.dryRun === true;
  state.isRunning = true;
  state.startTime = Date.now();
  state.stats.totalTicks = 0;
  state.stats.totalTrades = 0;
  state.stats.successfulTrades = 0;
  state.stats.totalProfitUsd = 0;
  state.stats.netProfitUsd = 0;
  state.stats.winRate = 0;
  state.stats.uptime = 0;
  state.tradeLogs = [];
  state.opportunities = [];

  // Iniciar loop ULTRA-RÁPIDO
  if (timer) clearInterval(timer);
  timer = setInterval(fastTick, CONFIG.TICK_INTERVAL_MS);

  console.log(`\n[START] Bot iniciado - ${state.isDryRun ? 'DRY RUN' : '⚠️ MODO REAL'}`);
  console.log(`[CONFIG] Intervalo: ${CONFIG.TICK_INTERVAL_MS}ms, Min profit: $${CONFIG.MIN_PROFIT_USD}`);

  res.json({ 
    success: true, 
    isRunning: true, 
    isDryRun: state.isDryRun,
    config: {
      tickInterval: CONFIG.TICK_INTERVAL_MS,
      minProfit: CONFIG.MIN_PROFIT_USD,
      autoExecute: CONFIG.AUTO_EXECUTE
    }
  });
});

app.post('/api/defi/multichain-arb/stop', (req, res) => {
  console.log('[API] POST /stop');
  state.isRunning = false;
  if (timer) { clearInterval(timer); timer = null; }
  res.json({ success: true, isRunning: false });
});

app.post('/api/defi/multichain-arb/reset', (req, res) => {
  state.stats = {
    totalTicks: 0, totalTrades: 0, successfulTrades: 0,
    totalProfitUsd: 0, totalGasUsd: 0, netProfitUsd: 0,
    winRate: 0, uptime: 0, currentChain: 'base', scanSpeed: 0, lastTradeTime: null
  };
  state.tradeLogs = [];
  state.opportunities = [];
  res.json({ success: true });
});

app.get('/api/defi/multichain-arb/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    port: PORT, 
    running: state.isRunning,
    mode: state.isDryRun ? 'DRY_RUN' : 'LIVE',
    wallet: WALLET_ADDRESS,
    config: CONFIG
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// INICIAR SERVIDOR
// ═══════════════════════════════════════════════════════════════════════════════

app.listen(PORT, async () => {
  console.log(`
╔═══════════════════════════════════════════════════════════════════════════════╗
║                                                                               ║
║   🚀 BOT ARBITRAJE ULTRA-RÁPIDO                                               ║
║                                                                               ║
║   ✅ Puerto: ${PORT}                                                           ║
║   ✅ Wallet: ${WALLET_ADDRESS.slice(0, 10)}...${WALLET_ADDRESS.slice(-5)}                                  ║
║   ✅ Intervalo: ${CONFIG.TICK_INTERVAL_MS}ms (${(1000/CONFIG.TICK_INTERVAL_MS).toFixed(1)} scans/seg)                              ║
║   ✅ Min Profit: $${CONFIG.MIN_PROFIT_USD}                                                 ║
║   ✅ Auto Execute: ${CONFIG.AUTO_EXECUTE}                                               ║
║                                                                               ║
║   ⚠️  MODO AGRESIVO - Alta frecuencia de trading                              ║
║                                                                               ║
╚═══════════════════════════════════════════════════════════════════════════════╝
  `);

  await initConnections();
  console.log('\n[READY] Bot listo. Usa POST /start para iniciar.\n');
});

process.on('SIGINT', () => {
  console.log('\n[EXIT] Cerrando...');
  if (timer) clearInterval(timer);
  process.exit(0);
});


 * ═══════════════════════════════════════════════════════════════════════════════
 * BOT ARBITRAJE ULTRA-RÁPIDO - ALTA FRECUENCIA
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * Configuración AGRESIVA:
 * - Escaneo cada 500ms (2x por segundo)
 * - Umbral de profit muy bajo ($0.01)
 * - Múltiples rutas simultáneas
 * - Ejecución inmediata
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
// CONFIGURACIÓN AGRESIVA
// ═══════════════════════════════════════════════════════════════════════════════

const CONFIG = {
  TICK_INTERVAL_MS: 500,        // Escanear cada 500ms (ULTRA RÁPIDO)
  MIN_PROFIT_USD: 0.01,         // Profit mínimo $0.01 (MUY BAJO)
  MAX_SLIPPAGE_BPS: 100,        // 1% slippage permitido
  GAS_MULTIPLIER: 1.5,          // Multiplicador de gas
  TRADE_AMOUNTS_ETH: [0.003, 0.005, 0.008, 0.01, 0.015, 0.02], // Cantidades a probar
  FEE_TIERS: [100, 500, 3000, 10000], // Todos los fee tiers
  PARALLEL_SCANS: true,         // Escanear todas las chains en paralelo
  AUTO_EXECUTE: true,           // Ejecutar automáticamente
  ETH_PRICE_USD: 3500           // Precio ETH aproximado
};

const PRIVATE_KEY = process.env.VITE_ETH_PRIVATE_KEY;
const WALLET_ADDRESS = process.env.VITE_ETH_WALLET_ADDRESS;

if (!PRIVATE_KEY || !WALLET_ADDRESS) {
  console.error('❌ ERROR: Credenciales no configuradas en .env');
  process.exit(1);
}

// ═══════════════════════════════════════════════════════════════════════════════
// CHAINS Y CONTRATOS
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
  },
  optimism: {
    name: 'Optimism',
    chainId: 10,
    rpc: 'https://mainnet.optimism.io',
    explorer: 'https://optimistic.etherscan.io',
    tokens: {
      WETH: '0x4200000000000000000000000000000000000006',
      USDC: '0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85'
    },
    quoter: '0x61fFE014bA17989E743c5F6cB21bF9697530B21e',
    router: '0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45'
  }
};

// ABIs
const QUOTER_ABI = [
  'function quoteExactInputSingle((address tokenIn, address tokenOut, uint256 amountIn, uint24 fee, uint160 sqrtPriceLimitX96)) external returns (uint256 amountOut, uint160 sqrtPriceX96After, uint32 initializedTicksCrossed, uint256 gasEstimate)'
];

const ROUTER_ABI = [
  'function exactInputSingle((address tokenIn, address tokenOut, uint24 fee, address recipient, uint256 amountIn, uint256 amountOutMinimum, uint160 sqrtPriceLimitX96)) external payable returns (uint256 amountOut)',
  'function multicall(uint256 deadline, bytes[] calldata data) external payable returns (bytes[] memory results)'
];

const WETH_ABI = [
  'function deposit() payable',
  'function withdraw(uint256)',
  'function balanceOf(address) view returns (uint256)',
  'function approve(address spender, uint256 amount) returns (bool)',
  'function allowance(address owner, address spender) view returns (uint256)'
];

const ERC20_ABI = [
  'function balanceOf(address) view returns (uint256)',
  'function approve(address spender, uint256 amount) returns (bool)',
  'function allowance(address owner, address spender) view returns (uint256)'
];

// ═══════════════════════════════════════════════════════════════════════════════
// ESTADO DEL BOT
// ═══════════════════════════════════════════════════════════════════════════════

let state = {
  isRunning: false,
  isDryRun: false,
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
    currentChain: 'base',
    scanSpeed: 0,
    lastTradeTime: null
  },
  chains: [],
  tradeLogs: [],
  opportunities: [],
  banditStates: [
    { chain: 'base', alpha: 2, beta: 2, winRate: 50, selected: true },
    { chain: 'arbitrum', alpha: 2, beta: 2, winRate: 50, selected: false },
    { chain: 'optimism', alpha: 2, beta: 2, winRate: 50, selected: false }
  ]
};

let timer = null;
let providers = {};
let signers = {};
let isExecuting = false;

// ═══════════════════════════════════════════════════════════════════════════════
// INICIALIZAR CONEXIONES
// ═══════════════════════════════════════════════════════════════════════════════

async function initConnections() {
  console.log('[INIT] Inicializando conexiones...');
  
  for (const [key, chain] of Object.entries(CHAINS)) {
    try {
      providers[key] = new ethers.JsonRpcProvider(chain.rpc);
      signers[key] = new ethers.Wallet(PRIVATE_KEY, providers[key]);
      
      const balance = await providers[key].getBalance(WALLET_ADDRESS);
      const balanceEth = parseFloat(ethers.formatEther(balance));
      
      state.chains.push({
        chain: key,
        name: chain.name,
        chainId: chain.chainId,
        balance: balanceEth.toFixed(6),
        balanceUsd: balanceEth * CONFIG.ETH_PRICE_USD,
        routes: CONFIG.FEE_TIERS.length * CONFIG.TRADE_AMOUNTS_ETH.length,
        isActive: true,
        lastTick: Date.now(),
        explorer: chain.explorer
      });
      
      console.log(`[INIT] ✅ ${chain.name}: ${balanceEth.toFixed(6)} ETH`);
    } catch (e) {
      console.error(`[INIT] ❌ ${chain.name}: ${e.message}`);
    }
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// ESCANEO ULTRA-RÁPIDO
// ═══════════════════════════════════════════════════════════════════════════════

async function fastScan(chainKey) {
  const chain = CHAINS[chainKey];
  const provider = providers[chainKey];
  const opportunities = [];

  try {
    const quoter = new ethers.Contract(chain.quoter, QUOTER_ABI, provider);
    
    // Obtener gas price
    const feeData = await provider.getFeeData();
    const gasPrice = feeData.gasPrice || ethers.parseUnits('0.001', 'gwei');
    const gasCostWei = gasPrice * 200000n;
    const gasCostUsd = parseFloat(ethers.formatEther(gasCostWei)) * CONFIG.ETH_PRICE_USD;

    // Probar TODAS las combinaciones en paralelo
    const promises = [];
    
    for (const amountEth of CONFIG.TRADE_AMOUNTS_ETH) {
      const amount = ethers.parseEther(amountEth.toString());
      
      for (let i = 0; i < CONFIG.FEE_TIERS.length; i++) {
        for (let j = 0; j < CONFIG.FEE_TIERS.length; j++) {
          if (i === j) continue;
          
          promises.push(
            (async () => {
              try {
                // ETH -> USDC
                const quote1 = await quoter.quoteExactInputSingle.staticCall({
                  tokenIn: chain.tokens.WETH,
                  tokenOut: chain.tokens.USDC,
                  amountIn: amount,
                  fee: CONFIG.FEE_TIERS[i],
                  sqrtPriceLimitX96: 0n
                });
                const usdcOut = quote1[0];

                // USDC -> ETH
                const quote2 = await quoter.quoteExactInputSingle.staticCall({
                  tokenIn: chain.tokens.USDC,
                  tokenOut: chain.tokens.WETH,
                  amountIn: usdcOut,
                  fee: CONFIG.FEE_TIERS[j],
                  sqrtPriceLimitX96: 0n
                });
                const ethOut = quote2[0];

                const grossProfit = ethOut - amount;
                const netProfit = grossProfit - gasCostWei;

                if (netProfit > 0n) {
                  const netProfitUsd = parseFloat(ethers.formatEther(netProfit)) * CONFIG.ETH_PRICE_USD;
                  
                  return {
                    chain: chainKey,
                    route: `${CONFIG.FEE_TIERS[i]/100}%->${CONFIG.FEE_TIERS[j]/100}%`,
                    amountIn: amount,
                    amountInEth: amountEth,
                    fee1: CONFIG.FEE_TIERS[i],
                    fee2: CONFIG.FEE_TIERS[j],
                    usdcIntermediate: usdcOut,
                    ethOut: ethOut,
                    netProfit: netProfit,
                    netProfitUsd: netProfitUsd,
                    gasCost: gasCostUsd,
                    spreadBps: (Number(netProfit * 10000n / amount) / 100).toFixed(2),
                    timestamp: Date.now()
                  };
                }
              } catch (e) {
                // Pool no existe
              }
              return null;
            })()
          );
        }
      }
    }

    const results = await Promise.all(promises);
    opportunities.push(...results.filter(r => r !== null));

  } catch (e) {
    console.error(`[SCAN] Error ${chainKey}:`, e.message);
  }

  return opportunities;
}

// ═══════════════════════════════════════════════════════════════════════════════
// EJECUCIÓN RÁPIDA DE TRADE
// ═══════════════════════════════════════════════════════════════════════════════

async function executeTrade(opp) {
  if (isExecuting) {
    console.log('[EXEC] Ya hay una ejecución en progreso, saltando...');
    return null;
  }
  
  isExecuting = true;
  const chain = CHAINS[opp.chain];
  const signer = signers[opp.chain];
  const provider = providers[opp.chain];

  console.log(`\n🚀 [EXEC] EJECUTANDO TRADE en ${chain.name}`);
  console.log(`   Route: ${opp.route}`);
  console.log(`   Amount: ${opp.amountInEth} ETH`);
  console.log(`   Expected: $${opp.netProfitUsd.toFixed(4)}`);

  try {
    // Verificar balance
    const balance = await provider.getBalance(WALLET_ADDRESS);
    if (balance < opp.amountIn) {
      console.log(`   ❌ Balance insuficiente`);
      isExecuting = false;
      return { success: false, error: 'Balance insuficiente' };
    }

    const weth = new ethers.Contract(chain.tokens.WETH, WETH_ABI, signer);
    const router = new ethers.Contract(chain.router, ROUTER_ABI, signer);
    const usdc = new ethers.Contract(chain.tokens.USDC, ERC20_ABI, signer);

    // 1. Wrap ETH -> WETH
    console.log(`   📦 Wrapping ETH...`);
    const wrapTx = await weth.deposit({ 
      value: opp.amountIn,
      gasLimit: 50000
    });
    await wrapTx.wait(1);
    console.log(`   ✅ Wrap: ${wrapTx.hash.slice(0, 20)}...`);

    // 2. Approve si es necesario
    const allowance = await weth.allowance(WALLET_ADDRESS, chain.router);
    if (allowance < opp.amountIn) {
      console.log(`   🔓 Approving...`);
      const approveTx = await weth.approve(chain.router, ethers.MaxUint256, { gasLimit: 50000 });
      await approveTx.wait(1);
    }

    // 3. Swap WETH -> USDC
    console.log(`   🔄 Swap 1: WETH -> USDC...`);
    const minUsdc = (opp.usdcIntermediate * BigInt(10000 - CONFIG.MAX_SLIPPAGE_BPS)) / 10000n;
    
    const swap1Tx = await router.exactInputSingle({
      tokenIn: chain.tokens.WETH,
      tokenOut: chain.tokens.USDC,
      fee: opp.fee1,
      recipient: WALLET_ADDRESS,
      amountIn: opp.amountIn,
      amountOutMinimum: minUsdc,
      sqrtPriceLimitX96: 0n
    }, { gasLimit: 300000 });
    
    const receipt1 = await swap1Tx.wait(1);
    console.log(`   ✅ Swap 1: ${receipt1.hash.slice(0, 20)}...`);

    // 4. Approve USDC
    const usdcBalance = await usdc.balanceOf(WALLET_ADDRESS);
    const usdcAllowance = await usdc.allowance(WALLET_ADDRESS, chain.router);
    if (usdcAllowance < usdcBalance) {
      const approveUsdcTx = await usdc.approve(chain.router, ethers.MaxUint256, { gasLimit: 50000 });
      await approveUsdcTx.wait(1);
    }

    // 5. Swap USDC -> WETH
    console.log(`   🔄 Swap 2: USDC -> WETH...`);
    const minWeth = (opp.ethOut * BigInt(10000 - CONFIG.MAX_SLIPPAGE_BPS)) / 10000n;
    
    const swap2Tx = await router.exactInputSingle({
      tokenIn: chain.tokens.USDC,
      tokenOut: chain.tokens.WETH,
      fee: opp.fee2,
      recipient: WALLET_ADDRESS,
      amountIn: usdcBalance,
      amountOutMinimum: minWeth,
      sqrtPriceLimitX96: 0n
    }, { gasLimit: 300000 });
    
    const receipt2 = await swap2Tx.wait(1);
    console.log(`   ✅ Swap 2: ${receipt2.hash.slice(0, 20)}...`);

    // 6. Calcular profit real
    const finalWeth = await weth.balanceOf(WALLET_ADDRESS);
    const actualProfit = finalWeth - opp.amountIn;
    const actualProfitUsd = parseFloat(ethers.formatEther(actualProfit)) * CONFIG.ETH_PRICE_USD;

    console.log(`   💰 PROFIT: $${actualProfitUsd.toFixed(4)}`);
    console.log(`   🔗 TX: ${chain.explorer}/tx/${receipt2.hash}`);

    isExecuting = false;
    return {
      success: true,
      profitUsd: actualProfitUsd,
      txHash: receipt2.hash
    };

  } catch (e) {
    console.log(`   ❌ Error: ${e.message}`);
    isExecuting = false;
    return { success: false, error: e.message };
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// LOOP PRINCIPAL ULTRA-RÁPIDO
// ═══════════════════════════════════════════════════════════════════════════════

async function fastTick() {
  if (!state.isRunning || isExecuting) return;

  const tickStart = Date.now();
  state.stats.totalTicks++;
  state.stats.uptime = Math.floor((Date.now() - state.startTime) / 1000);

  // Seleccionar chain (round-robin para velocidad)
  const chainKeys = Object.keys(CHAINS);
  const chainIndex = state.stats.totalTicks % chainKeys.length;
  const selectedChain = chainKeys[chainIndex];
  state.stats.currentChain = selectedChain;

  // Actualizar bandit
  state.banditStates = state.banditStates.map(b => ({
    ...b,
    selected: b.chain === selectedChain
  }));

  try {
    // Escaneo rápido
    const opportunities = await fastScan(selectedChain);
    const scanTime = Date.now() - tickStart;
    state.stats.scanSpeed = scanTime;

    if (opportunities.length > 0) {
      // Ordenar por profit
      opportunities.sort((a, b) => b.netProfitUsd - a.netProfitUsd);
      const best = opportunities[0];

      // Guardar oportunidades
      state.opportunities = [...opportunities.slice(0, 5), ...state.opportunities].slice(0, 20);

      console.log(`[TICK ${state.stats.totalTicks}] ${CHAINS[selectedChain].name}: ${opportunities.length} opps, best: $${best.netProfitUsd.toFixed(4)} (${scanTime}ms)`);

      // Ejecutar si profit > umbral y NO es dry run
      if (best.netProfitUsd >= CONFIG.MIN_PROFIT_USD && !state.isDryRun && CONFIG.AUTO_EXECUTE) {
        console.log(`[EXEC] Profit $${best.netProfitUsd.toFixed(4)} >= $${CONFIG.MIN_PROFIT_USD}, ejecutando...`);
        
        const result = await executeTrade(best);
        state.stats.totalTrades++;
        state.stats.lastTradeTime = Date.now();

        if (result && result.success) {
          state.stats.successfulTrades++;
          state.stats.totalProfitUsd += result.profitUsd;
          state.stats.netProfitUsd = state.stats.totalProfitUsd;

          state.tradeLogs.unshift({
            id: `tx-${Date.now()}`,
            timestamp: Date.now(),
            chain: best.chain,
            route: best.route,
            amountIn: best.amountInEth,
            amountOut: ethers.formatEther(best.ethOut),
            profit: result.profitUsd.toFixed(4),
            gasCost: best.gasCost.toFixed(4),
            netProfit: result.profitUsd.toFixed(4),
            txHash: result.txHash,
            status: 'success'
          });

          // Actualizar bandit
          const bandit = state.banditStates.find(b => b.chain === selectedChain);
          if (bandit) {
            bandit.alpha += 1;
            bandit.winRate = (bandit.alpha / (bandit.alpha + bandit.beta) * 100);
          }
        } else {
          state.tradeLogs.unshift({
            id: `tx-${Date.now()}`,
            timestamp: Date.now(),
            chain: best.chain,
            route: best.route,
            amountIn: best.amountInEth,
            amountOut: '0',
            profit: '0',
            gasCost: best.gasCost.toFixed(4),
            netProfit: '0',
            txHash: '',
            status: 'failed'
          });

          const bandit = state.banditStates.find(b => b.chain === selectedChain);
          if (bandit) {
            bandit.beta += 1;
            bandit.winRate = (bandit.alpha / (bandit.alpha + bandit.beta) * 100);
          }
        }

        state.stats.winRate = state.stats.totalTrades > 0
          ? (state.stats.successfulTrades / state.stats.totalTrades * 100)
          : 0;

        if (state.tradeLogs.length > 100) state.tradeLogs.pop();
      }
    } else {
      // Log cada 10 ticks si no hay oportunidades
      if (state.stats.totalTicks % 10 === 0) {
        console.log(`[TICK ${state.stats.totalTicks}] ${CHAINS[selectedChain].name}: No profitable opps (${scanTime}ms)`);
      }
    }

    // Actualizar balances cada 20 ticks
    if (state.stats.totalTicks % 20 === 0) {
      for (const [key, chain] of Object.entries(CHAINS)) {
        try {
          const balance = await providers[key].getBalance(WALLET_ADDRESS);
          const balanceEth = parseFloat(ethers.formatEther(balance));
          const chainState = state.chains.find(c => c.chain === key);
          if (chainState) {
            chainState.balance = balanceEth.toFixed(6);
            chainState.balanceUsd = balanceEth * CONFIG.ETH_PRICE_USD;
            chainState.lastTick = Date.now();
          }
        } catch (e) {}
      }
    }

  } catch (e) {
    console.error(`[TICK] Error:`, e.message);
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// RUTAS API
// ═══════════════════════════════════════════════════════════════════════════════

app.get('/api/defi/multichain-arb/status', (req, res) => {
  res.json(state);
});

app.post('/api/defi/multichain-arb/start', async (req, res) => {
  console.log('[API] POST /start');

  if (state.isRunning) {
    return res.json({ success: false, error: 'Ya corriendo', isRunning: true });
  }

  state.isDryRun = req.body?.dryRun === true;
  state.isRunning = true;
  state.startTime = Date.now();
  state.stats.totalTicks = 0;
  state.stats.totalTrades = 0;
  state.stats.successfulTrades = 0;
  state.stats.totalProfitUsd = 0;
  state.stats.netProfitUsd = 0;
  state.stats.winRate = 0;
  state.stats.uptime = 0;
  state.tradeLogs = [];
  state.opportunities = [];

  // Iniciar loop ULTRA-RÁPIDO
  if (timer) clearInterval(timer);
  timer = setInterval(fastTick, CONFIG.TICK_INTERVAL_MS);

  console.log(`\n[START] Bot iniciado - ${state.isDryRun ? 'DRY RUN' : '⚠️ MODO REAL'}`);
  console.log(`[CONFIG] Intervalo: ${CONFIG.TICK_INTERVAL_MS}ms, Min profit: $${CONFIG.MIN_PROFIT_USD}`);

  res.json({ 
    success: true, 
    isRunning: true, 
    isDryRun: state.isDryRun,
    config: {
      tickInterval: CONFIG.TICK_INTERVAL_MS,
      minProfit: CONFIG.MIN_PROFIT_USD,
      autoExecute: CONFIG.AUTO_EXECUTE
    }
  });
});

app.post('/api/defi/multichain-arb/stop', (req, res) => {
  console.log('[API] POST /stop');
  state.isRunning = false;
  if (timer) { clearInterval(timer); timer = null; }
  res.json({ success: true, isRunning: false });
});

app.post('/api/defi/multichain-arb/reset', (req, res) => {
  state.stats = {
    totalTicks: 0, totalTrades: 0, successfulTrades: 0,
    totalProfitUsd: 0, totalGasUsd: 0, netProfitUsd: 0,
    winRate: 0, uptime: 0, currentChain: 'base', scanSpeed: 0, lastTradeTime: null
  };
  state.tradeLogs = [];
  state.opportunities = [];
  res.json({ success: true });
});

app.get('/api/defi/multichain-arb/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    port: PORT, 
    running: state.isRunning,
    mode: state.isDryRun ? 'DRY_RUN' : 'LIVE',
    wallet: WALLET_ADDRESS,
    config: CONFIG
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// INICIAR SERVIDOR
// ═══════════════════════════════════════════════════════════════════════════════

app.listen(PORT, async () => {
  console.log(`
╔═══════════════════════════════════════════════════════════════════════════════╗
║                                                                               ║
║   🚀 BOT ARBITRAJE ULTRA-RÁPIDO                                               ║
║                                                                               ║
║   ✅ Puerto: ${PORT}                                                           ║
║   ✅ Wallet: ${WALLET_ADDRESS.slice(0, 10)}...${WALLET_ADDRESS.slice(-5)}                                  ║
║   ✅ Intervalo: ${CONFIG.TICK_INTERVAL_MS}ms (${(1000/CONFIG.TICK_INTERVAL_MS).toFixed(1)} scans/seg)                              ║
║   ✅ Min Profit: $${CONFIG.MIN_PROFIT_USD}                                                 ║
║   ✅ Auto Execute: ${CONFIG.AUTO_EXECUTE}                                               ║
║                                                                               ║
║   ⚠️  MODO AGRESIVO - Alta frecuencia de trading                              ║
║                                                                               ║
╚═══════════════════════════════════════════════════════════════════════════════╝
  `);

  await initConnections();
  console.log('\n[READY] Bot listo. Usa POST /start para iniciar.\n');
});

process.on('SIGINT', () => {
  console.log('\n[EXIT] Cerrando...');
  if (timer) clearInterval(timer);
  process.exit(0);
});




