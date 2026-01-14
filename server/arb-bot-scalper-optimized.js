/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * 🔥 SCALPER OPTIMIZADO - BASE + ARBITRUM ONLY
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * Versión optimizada que:
 * - Solo usa Base y Arbitrum (RPCs premium)
 * - Reduce llamadas paralelas para evitar rate limits
 * - Escaneo secuencial por chain
 * - Ejecución inmediata cuando detecta oportunidad
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
// CONFIGURACIÓN OPTIMIZADA
// ═══════════════════════════════════════════════════════════════════════════════

const CONFIG = {
  SCAN_INTERVAL_MS: 500,
  MIN_PROFIT_USD: 0.01,
  MAX_SLIPPAGE_BPS: 50,
  TRADE_AMOUNTS_ETH: [0.005, 0.01, 0.02],
  FEE_TIERS: [500, 3000],  // Solo los más líquidos
  AUTO_EXECUTE: true,
  MAX_GAS_GWEI: 10,
  ETH_PRICE_USD: 3500
};

const PRIVATE_KEY = process.env.VITE_ETH_PRIVATE_KEY;
const WALLET_ADDRESS = process.env.VITE_ETH_WALLET_ADDRESS;

if (!PRIVATE_KEY || !WALLET_ADDRESS) {
  console.error('❌ ERROR: Credenciales no configuradas');
  process.exit(1);
}

// ═══════════════════════════════════════════════════════════════════════════════
// CHAINS (Solo Base y Arbitrum con RPCs premium)
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

const ROUTER_ABI = [
  'function exactInputSingle((address tokenIn, address tokenOut, uint24 fee, address recipient, uint256 amountIn, uint256 amountOutMinimum, uint160 sqrtPriceLimitX96)) external payable returns (uint256 amountOut)'
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
// ESTADO
// ═══════════════════════════════════════════════════════════════════════════════

let state = {
  isRunning: false,
  isDryRun: false,
  startTime: null,
  mode: 'SCALPER_OPTIMIZED',
  stats: {
    totalScans: 0,
    opportunitiesFound: 0,
    tradesAttempted: 0,
    tradesExecuted: 0,
    tradesSuccessful: 0,
    totalProfitUsd: 0,
    totalGasUsd: 0,
    netProfitUsd: 0,
    winRate: 0,
    avgScanTimeMs: 0,
    scansPerSecond: 0,
    uptime: 0,
    currentChain: 'base',
    lastOpportunity: null,
    lastTrade: null
  },
  chains: [],
  tradeLogs: [],
  opportunities: [],
  banditStates: []
};

let timer = null;
let providers = {};
let signers = {};
let contracts = {};
let isExecuting = false;
let currentChainIndex = 0;
let scanTimes = [];

// ═══════════════════════════════════════════════════════════════════════════════
// INICIALIZAR
// ═══════════════════════════════════════════════════════════════════════════════

async function init() {
  console.log('[INIT] 🔌 Conectando a chains...\n');
  
  for (const [key, chain] of Object.entries(CHAINS)) {
    try {
      providers[key] = new ethers.JsonRpcProvider(chain.rpc);
      signers[key] = new ethers.Wallet(PRIVATE_KEY, providers[key]);
      
      contracts[key] = {
        quoter: new ethers.Contract(chain.quoter, QUOTER_ABI, providers[key]),
        router: new ethers.Contract(chain.router, ROUTER_ABI, signers[key]),
        weth: new ethers.Contract(chain.tokens.WETH, WETH_ABI, signers[key])
      };
      
      const balance = await providers[key].getBalance(WALLET_ADDRESS);
      const balanceEth = parseFloat(ethers.formatEther(balance));
      
      state.chains.push({
        chain: key,
        name: chain.name,
        chainId: chain.chainId,
        balance: balanceEth.toFixed(6),
        balanceUsd: balanceEth * CONFIG.ETH_PRICE_USD,
        routes: CONFIG.FEE_TIERS.length * CONFIG.TRADE_AMOUNTS_ETH.length,
        isActive: balanceEth > 0.001,
        lastScan: Date.now(),
        scansCompleted: 0,
        opportunitiesFound: 0,
        tradesExecuted: 0,
        explorer: chain.explorer,
        ethPrice: 0
      });
      
      state.banditStates.push({
        chain: key,
        alpha: 2,
        beta: 2,
        winRate: 50,
        selected: key === 'base',
        attempts: 0,
        wins: 0
      });
      
      console.log(`   ✅ ${chain.name}: ${balanceEth.toFixed(6)} ETH ($${(balanceEth * CONFIG.ETH_PRICE_USD).toFixed(2)})`);
    } catch (e) {
      console.error(`   ❌ ${chain.name}: ${e.message}`);
    }
  }
  console.log('');
}

// ═══════════════════════════════════════════════════════════════════════════════
// ESCANEO SECUENCIAL (evita rate limits)
// ═══════════════════════════════════════════════════════════════════════════════

async function scanChain(chainKey) {
  const chain = CHAINS[chainKey];
  const provider = providers[chainKey];
  const quoter = contracts[chainKey].quoter;
  const opportunities = [];
  
  try {
    // 1. Obtener gas price
    const feeData = await provider.getFeeData();
    const gasPrice = feeData.gasPrice || ethers.parseUnits('0.001', 'gwei');
    const gasPriceGwei = parseFloat(ethers.formatUnits(gasPrice, 'gwei'));
    
    if (gasPriceGwei > CONFIG.MAX_GAS_GWEI) {
      console.log(`   ⛽ Gas muy alto en ${chain.name}: ${gasPriceGwei.toFixed(2)} gwei`);
      return [];
    }
    
    const gasCostWei = gasPrice * 250000n;
    const gasCostUsd = parseFloat(ethers.formatEther(gasCostWei)) * CONFIG.ETH_PRICE_USD;
    
    // 2. Obtener precio ETH
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
    } catch (e) {}
    
    // Actualizar estado
    const chainState = state.chains.find(c => c.chain === chainKey);
    if (chainState) chainState.ethPrice = ethPrice;
    
    // 3. Escanear rutas SECUENCIALMENTE (no paralelo)
    for (const amountEth of CONFIG.TRADE_AMOUNTS_ETH) {
      const amountWei = ethers.parseEther(amountEth.toString());
      
      for (let i = 0; i < CONFIG.FEE_TIERS.length; i++) {
        for (let j = 0; j < CONFIG.FEE_TIERS.length; j++) {
          if (i === j) continue;
          
          try {
            // WETH → USDC
            const quote1 = await quoter.quoteExactInputSingle.staticCall({
              tokenIn: chain.tokens.WETH,
              tokenOut: chain.tokens.USDC,
              amountIn: amountWei,
              fee: CONFIG.FEE_TIERS[i],
              sqrtPriceLimitX96: 0n
            });
            const usdcOut = quote1[0];
            
            // USDC → WETH
            const quote2 = await quoter.quoteExactInputSingle.staticCall({
              tokenIn: chain.tokens.USDC,
              tokenOut: chain.tokens.WETH,
              amountIn: usdcOut,
              fee: CONFIG.FEE_TIERS[j],
              sqrtPriceLimitX96: 0n
            });
            const wethOut = quote2[0];
            
            const grossProfit = wethOut - amountWei;
            const netProfit = grossProfit - gasCostWei;
            
            if (netProfit > 0n) {
              const netProfitUsd = parseFloat(ethers.formatEther(netProfit)) * ethPrice;
              const spreadBps = Number((grossProfit * 10000n) / amountWei);
              
              if (netProfitUsd >= CONFIG.MIN_PROFIT_USD) {
                opportunities.push({
                  chain: chainKey,
                  chainName: chain.name,
                  type: 'SCALP',
                  route: `${CONFIG.FEE_TIERS[i]/100}%→${CONFIG.FEE_TIERS[j]/100}%`,
                  amountIn: amountWei,
                  amountInEth: amountEth,
                  fee1: CONFIG.FEE_TIERS[i],
                  fee2: CONFIG.FEE_TIERS[j],
                  usdcIntermediate: usdcOut,
                  wethOut,
                  grossProfit,
                  netProfit,
                  netProfitUsd,
                  gasCostUsd,
                  spreadBps,
                  ethPrice,
                  timestamp: Date.now(),
                  gasPrice: gasPriceGwei
                });
                
                console.log(`   💰 OPP: ${chain.name} ${amountEth}ETH ${CONFIG.FEE_TIERS[i]/100}%→${CONFIG.FEE_TIERS[j]/100}% = $${netProfitUsd.toFixed(4)}`);
              }
            }
          } catch (e) {
            // Pool no existe
          }
        }
      }
    }
    
  } catch (e) {
    console.error(`   ❌ Error ${chain.name}: ${e.message.slice(0, 50)}`);
  }
  
  return opportunities;
}

// ═══════════════════════════════════════════════════════════════════════════════
// EJECUCIÓN
// ═══════════════════════════════════════════════════════════════════════════════

async function execute(opp) {
  if (isExecuting) return null;
  isExecuting = true;
  
  const chain = CHAINS[opp.chain];
  const signer = signers[opp.chain];
  const provider = providers[opp.chain];
  const { router, weth } = contracts[opp.chain];
  
  console.log(`\n🔥 ═══════════════════════════════════════════════════════════════`);
  console.log(`   EJECUTANDO en ${chain.name}`);
  console.log(`   Route: ${opp.route}`);
  console.log(`   Amount: ${opp.amountInEth} ETH`);
  console.log(`   Expected: $${opp.netProfitUsd.toFixed(4)}`);
  
  try {
    // Verificar balance
    const balance = await provider.getBalance(WALLET_ADDRESS);
    if (balance < opp.amountIn + ethers.parseEther('0.002')) {
      console.log(`   ❌ Balance insuficiente`);
      isExecuting = false;
      return { success: false, error: 'Balance insuficiente' };
    }
    
    // 1. Wrap ETH
    console.log(`   📦 Wrapping...`);
    const wrapTx = await weth.deposit({ value: opp.amountIn, gasLimit: 50000 });
    await wrapTx.wait(1);
    
    // 2. Approve WETH
    const allowance = await weth.allowance(WALLET_ADDRESS, chain.router);
    if (allowance < opp.amountIn) {
      const approveTx = await weth.approve(chain.router, ethers.MaxUint256, { gasLimit: 50000 });
      await approveTx.wait(1);
    }
    
    // 3. SWAP 1: WETH → USDC
    console.log(`   🔄 ENTRADA: WETH → USDC...`);
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
    console.log(`   ✅ ENTRADA: ${receipt1.hash.slice(0, 20)}...`);
    
    // 4. Obtener balance USDC
    const usdc = new ethers.Contract(chain.tokens.USDC, ERC20_ABI, signer);
    const usdcBalance = await usdc.balanceOf(WALLET_ADDRESS);
    
    // 5. Approve USDC
    const usdcAllowance = await usdc.allowance(WALLET_ADDRESS, chain.router);
    if (usdcAllowance < usdcBalance) {
      const approveUsdcTx = await usdc.approve(chain.router, ethers.MaxUint256, { gasLimit: 50000 });
      await approveUsdcTx.wait(1);
    }
    
    // 6. SWAP 2: USDC → WETH
    console.log(`   🔄 SALIDA: USDC → WETH...`);
    const minWeth = (opp.wethOut * BigInt(10000 - CONFIG.MAX_SLIPPAGE_BPS)) / 10000n;
    
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
    console.log(`   ✅ SALIDA: ${receipt2.hash.slice(0, 20)}...`);
    
    // 7. Calcular profit
    const finalWeth = await weth.balanceOf(WALLET_ADDRESS);
    const actualProfit = finalWeth - opp.amountIn;
    const actualProfitUsd = parseFloat(ethers.formatEther(actualProfit)) * opp.ethPrice;
    
    const gas1 = receipt1.gasUsed * receipt1.gasPrice;
    const gas2 = receipt2.gasUsed * receipt2.gasPrice;
    const totalGasUsd = parseFloat(ethers.formatEther(gas1 + gas2)) * opp.ethPrice;
    
    const netProfitUsd = actualProfitUsd - totalGasUsd;
    
    console.log(`   ═══════════════════════════════════════════════════════════════`);
    console.log(`   💰 PROFIT: $${actualProfitUsd.toFixed(4)}`);
    console.log(`   ⛽ GAS: $${totalGasUsd.toFixed(4)}`);
    console.log(`   💵 NETO: $${netProfitUsd.toFixed(4)}`);
    console.log(`   🔗 ${chain.explorer}/tx/${receipt2.hash}`);
    
    isExecuting = false;
    return {
      success: true,
      profitUsd: actualProfitUsd,
      gasUsd: totalGasUsd,
      netProfitUsd,
      txHash: receipt2.hash
    };
    
  } catch (e) {
    console.log(`   ❌ Error: ${e.message}`);
    isExecuting = false;
    return { success: false, error: e.message };
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// LOOP PRINCIPAL
// ═══════════════════════════════════════════════════════════════════════════════

async function tick() {
  if (!state.isRunning || isExecuting) return;
  
  const tickStart = Date.now();
  state.stats.totalScans++;
  state.stats.uptime = Math.floor((Date.now() - state.startTime) / 1000);
  
  // Alternar entre chains
  const chainKeys = Object.keys(CHAINS);
  const selectedChain = chainKeys[currentChainIndex % chainKeys.length];
  currentChainIndex++;
  
  state.stats.currentChain = selectedChain;
  state.banditStates.forEach(b => b.selected = b.chain === selectedChain);
  
  console.log(`\n[SCAN #${state.stats.totalScans}] ${CHAINS[selectedChain].name}`);
  
  try {
    const opportunities = await scanChain(selectedChain);
    const scanTime = Date.now() - tickStart;
    
    scanTimes.push(scanTime);
    if (scanTimes.length > 20) scanTimes.shift();
    state.stats.avgScanTimeMs = Math.round(scanTimes.reduce((a, b) => a + b, 0) / scanTimes.length);
    state.stats.scansPerSecond = Math.round(1000 / state.stats.avgScanTimeMs * 10) / 10;
    
    if (opportunities.length > 0) {
      state.stats.opportunitiesFound += opportunities.length;
      opportunities.sort((a, b) => b.netProfitUsd - a.netProfitUsd);
      
      state.opportunities = [...opportunities.slice(0, 5), ...state.opportunities].slice(0, 30);
      state.stats.lastOpportunity = opportunities[0];
      
      const best = opportunities[0];
      console.log(`   📊 ${scanTime}ms | ${opportunities.length} opps | Best: $${best.netProfitUsd.toFixed(4)}`);
      
      // EJECUTAR
      if (!state.isDryRun && CONFIG.AUTO_EXECUTE) {
        state.stats.tradesAttempted++;
        
        const result = await execute(best);
        
        if (result) {
          state.stats.tradesExecuted++;
          
          const tradeLog = {
            id: `tx-${Date.now()}`,
            timestamp: Date.now(),
            chain: best.chain,
            chainName: best.chainName,
            route: best.route,
            amountIn: best.amountInEth,
            spreadBps: best.spreadBps,
            expectedProfit: best.netProfitUsd.toFixed(4),
            actualProfit: result.success ? result.profitUsd.toFixed(4) : '0',
            gasCost: result.success ? result.gasUsd.toFixed(4) : '0',
            netProfit: result.success ? result.netProfitUsd.toFixed(4) : '0',
            txHash: result.txHash || '',
            status: result.success ? 'success' : 'failed',
            error: result.error || ''
          };
          
          state.tradeLogs.unshift(tradeLog);
          if (state.tradeLogs.length > 50) state.tradeLogs.pop();
          
          if (result.success) {
            state.stats.tradesSuccessful++;
            state.stats.totalProfitUsd += result.profitUsd;
            state.stats.totalGasUsd += result.gasUsd;
            state.stats.netProfitUsd = state.stats.totalProfitUsd - state.stats.totalGasUsd;
            state.stats.lastTrade = tradeLog;
            
            const bandit = state.banditStates.find(b => b.chain === best.chain);
            if (bandit) {
              bandit.wins++;
              bandit.attempts++;
              bandit.alpha++;
              bandit.winRate = (bandit.wins / bandit.attempts) * 100;
            }
          } else {
            const bandit = state.banditStates.find(b => b.chain === best.chain);
            if (bandit) {
              bandit.attempts++;
              bandit.beta++;
              bandit.winRate = bandit.attempts > 0 ? (bandit.wins / bandit.attempts) * 100 : 50;
            }
          }
          
          state.stats.winRate = state.stats.tradesExecuted > 0
            ? (state.stats.tradesSuccessful / state.stats.tradesExecuted) * 100
            : 0;
        }
      }
    } else {
      console.log(`   📊 ${scanTime}ms | No profitable opportunities`);
    }
    
    // Actualizar balances cada 20 scans
    if (state.stats.totalScans % 20 === 0) {
      for (const chainState of state.chains) {
        try {
          const balance = await providers[chainState.chain].getBalance(WALLET_ADDRESS);
          const balanceEth = parseFloat(ethers.formatEther(balance));
          chainState.balance = balanceEth.toFixed(6);
          chainState.balanceUsd = balanceEth * CONFIG.ETH_PRICE_USD;
          chainState.isActive = balanceEth > 0.001;
        } catch (e) {}
      }
    }
    
  } catch (e) {
    console.error(`   ❌ Error: ${e.message}`);
  }
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
  
  state.isDryRun = req.body?.dryRun === true;
  state.isRunning = true;
  state.startTime = Date.now();
  
  state.stats = {
    totalScans: 0, opportunitiesFound: 0, tradesAttempted: 0,
    tradesExecuted: 0, tradesSuccessful: 0, totalProfitUsd: 0,
    totalGasUsd: 0, netProfitUsd: 0, winRate: 0, avgScanTimeMs: 0,
    scansPerSecond: 0, uptime: 0, currentChain: 'base',
    lastOpportunity: null, lastTrade: null
  };
  state.tradeLogs = [];
  state.opportunities = [];
  scanTimes = [];
  currentChainIndex = 0;
  
  if (timer) clearInterval(timer);
  timer = setInterval(tick, CONFIG.SCAN_INTERVAL_MS);
  
  console.log(`\n[START] 🔥 SCALPER iniciado - ${state.isDryRun ? 'DRY RUN' : '⚠️ MODO REAL'}`);
  
  res.json({
    success: true,
    isRunning: true,
    isDryRun: state.isDryRun,
    mode: 'SCALPER_OPTIMIZED',
    config: CONFIG
  });
});

app.post('/api/defi/multichain-arb/stop', (req, res) => {
  state.isRunning = false;
  if (timer) { clearInterval(timer); timer = null; }
  console.log('[STOP] Bot detenido');
  res.json({ success: true, isRunning: false });
});

app.get('/api/defi/multichain-arb/health', (req, res) => {
  res.json({
    status: 'ok',
    mode: 'SCALPER_OPTIMIZED',
    port: PORT,
    running: state.isRunning,
    dryRun: state.isDryRun,
    wallet: WALLET_ADDRESS,
    config: CONFIG
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// INICIAR
// ═══════════════════════════════════════════════════════════════════════════════

app.listen(PORT, async () => {
  console.log(`
╔═══════════════════════════════════════════════════════════════════════════════╗
║                                                                               ║
║   🔥 SCALPER OPTIMIZADO - BASE + ARBITRUM                                     ║
║                                                                               ║
║   ✅ Puerto: ${PORT}                                                           ║
║   ✅ Wallet: ${WALLET_ADDRESS.slice(0, 10)}...${WALLET_ADDRESS.slice(-5)}                                  ║
║                                                                               ║
║   ⚡ Intervalo: ${CONFIG.SCAN_INTERVAL_MS}ms | Min Profit: $${CONFIG.MIN_PROFIT_USD}                            ║
║   ⚡ Fee Tiers: ${CONFIG.FEE_TIERS.map(f => f/100 + '%').join(', ')}                                     ║
║   ⚡ Amounts: ${CONFIG.TRADE_AMOUNTS_ETH.join(', ')} ETH                                  ║
║                                                                               ║
╚═══════════════════════════════════════════════════════════════════════════════╝
  `);
  
  await init();
  console.log('[READY] 🔥 Scalper listo. POST /api/defi/multichain-arb/start para iniciar.\n');
});

process.on('SIGINT', () => {
  if (timer) clearInterval(timer);
  process.exit(0);
});



 * ═══════════════════════════════════════════════════════════════════════════════
 * 🔥 SCALPER OPTIMIZADO - BASE + ARBITRUM ONLY
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * Versión optimizada que:
 * - Solo usa Base y Arbitrum (RPCs premium)
 * - Reduce llamadas paralelas para evitar rate limits
 * - Escaneo secuencial por chain
 * - Ejecución inmediata cuando detecta oportunidad
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
// CONFIGURACIÓN OPTIMIZADA
// ═══════════════════════════════════════════════════════════════════════════════

const CONFIG = {
  SCAN_INTERVAL_MS: 500,
  MIN_PROFIT_USD: 0.01,
  MAX_SLIPPAGE_BPS: 50,
  TRADE_AMOUNTS_ETH: [0.005, 0.01, 0.02],
  FEE_TIERS: [500, 3000],  // Solo los más líquidos
  AUTO_EXECUTE: true,
  MAX_GAS_GWEI: 10,
  ETH_PRICE_USD: 3500
};

const PRIVATE_KEY = process.env.VITE_ETH_PRIVATE_KEY;
const WALLET_ADDRESS = process.env.VITE_ETH_WALLET_ADDRESS;

if (!PRIVATE_KEY || !WALLET_ADDRESS) {
  console.error('❌ ERROR: Credenciales no configuradas');
  process.exit(1);
}

// ═══════════════════════════════════════════════════════════════════════════════
// CHAINS (Solo Base y Arbitrum con RPCs premium)
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

const ROUTER_ABI = [
  'function exactInputSingle((address tokenIn, address tokenOut, uint24 fee, address recipient, uint256 amountIn, uint256 amountOutMinimum, uint160 sqrtPriceLimitX96)) external payable returns (uint256 amountOut)'
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
// ESTADO
// ═══════════════════════════════════════════════════════════════════════════════

let state = {
  isRunning: false,
  isDryRun: false,
  startTime: null,
  mode: 'SCALPER_OPTIMIZED',
  stats: {
    totalScans: 0,
    opportunitiesFound: 0,
    tradesAttempted: 0,
    tradesExecuted: 0,
    tradesSuccessful: 0,
    totalProfitUsd: 0,
    totalGasUsd: 0,
    netProfitUsd: 0,
    winRate: 0,
    avgScanTimeMs: 0,
    scansPerSecond: 0,
    uptime: 0,
    currentChain: 'base',
    lastOpportunity: null,
    lastTrade: null
  },
  chains: [],
  tradeLogs: [],
  opportunities: [],
  banditStates: []
};

let timer = null;
let providers = {};
let signers = {};
let contracts = {};
let isExecuting = false;
let currentChainIndex = 0;
let scanTimes = [];

// ═══════════════════════════════════════════════════════════════════════════════
// INICIALIZAR
// ═══════════════════════════════════════════════════════════════════════════════

async function init() {
  console.log('[INIT] 🔌 Conectando a chains...\n');
  
  for (const [key, chain] of Object.entries(CHAINS)) {
    try {
      providers[key] = new ethers.JsonRpcProvider(chain.rpc);
      signers[key] = new ethers.Wallet(PRIVATE_KEY, providers[key]);
      
      contracts[key] = {
        quoter: new ethers.Contract(chain.quoter, QUOTER_ABI, providers[key]),
        router: new ethers.Contract(chain.router, ROUTER_ABI, signers[key]),
        weth: new ethers.Contract(chain.tokens.WETH, WETH_ABI, signers[key])
      };
      
      const balance = await providers[key].getBalance(WALLET_ADDRESS);
      const balanceEth = parseFloat(ethers.formatEther(balance));
      
      state.chains.push({
        chain: key,
        name: chain.name,
        chainId: chain.chainId,
        balance: balanceEth.toFixed(6),
        balanceUsd: balanceEth * CONFIG.ETH_PRICE_USD,
        routes: CONFIG.FEE_TIERS.length * CONFIG.TRADE_AMOUNTS_ETH.length,
        isActive: balanceEth > 0.001,
        lastScan: Date.now(),
        scansCompleted: 0,
        opportunitiesFound: 0,
        tradesExecuted: 0,
        explorer: chain.explorer,
        ethPrice: 0
      });
      
      state.banditStates.push({
        chain: key,
        alpha: 2,
        beta: 2,
        winRate: 50,
        selected: key === 'base',
        attempts: 0,
        wins: 0
      });
      
      console.log(`   ✅ ${chain.name}: ${balanceEth.toFixed(6)} ETH ($${(balanceEth * CONFIG.ETH_PRICE_USD).toFixed(2)})`);
    } catch (e) {
      console.error(`   ❌ ${chain.name}: ${e.message}`);
    }
  }
  console.log('');
}

// ═══════════════════════════════════════════════════════════════════════════════
// ESCANEO SECUENCIAL (evita rate limits)
// ═══════════════════════════════════════════════════════════════════════════════

async function scanChain(chainKey) {
  const chain = CHAINS[chainKey];
  const provider = providers[chainKey];
  const quoter = contracts[chainKey].quoter;
  const opportunities = [];
  
  try {
    // 1. Obtener gas price
    const feeData = await provider.getFeeData();
    const gasPrice = feeData.gasPrice || ethers.parseUnits('0.001', 'gwei');
    const gasPriceGwei = parseFloat(ethers.formatUnits(gasPrice, 'gwei'));
    
    if (gasPriceGwei > CONFIG.MAX_GAS_GWEI) {
      console.log(`   ⛽ Gas muy alto en ${chain.name}: ${gasPriceGwei.toFixed(2)} gwei`);
      return [];
    }
    
    const gasCostWei = gasPrice * 250000n;
    const gasCostUsd = parseFloat(ethers.formatEther(gasCostWei)) * CONFIG.ETH_PRICE_USD;
    
    // 2. Obtener precio ETH
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
    } catch (e) {}
    
    // Actualizar estado
    const chainState = state.chains.find(c => c.chain === chainKey);
    if (chainState) chainState.ethPrice = ethPrice;
    
    // 3. Escanear rutas SECUENCIALMENTE (no paralelo)
    for (const amountEth of CONFIG.TRADE_AMOUNTS_ETH) {
      const amountWei = ethers.parseEther(amountEth.toString());
      
      for (let i = 0; i < CONFIG.FEE_TIERS.length; i++) {
        for (let j = 0; j < CONFIG.FEE_TIERS.length; j++) {
          if (i === j) continue;
          
          try {
            // WETH → USDC
            const quote1 = await quoter.quoteExactInputSingle.staticCall({
              tokenIn: chain.tokens.WETH,
              tokenOut: chain.tokens.USDC,
              amountIn: amountWei,
              fee: CONFIG.FEE_TIERS[i],
              sqrtPriceLimitX96: 0n
            });
            const usdcOut = quote1[0];
            
            // USDC → WETH
            const quote2 = await quoter.quoteExactInputSingle.staticCall({
              tokenIn: chain.tokens.USDC,
              tokenOut: chain.tokens.WETH,
              amountIn: usdcOut,
              fee: CONFIG.FEE_TIERS[j],
              sqrtPriceLimitX96: 0n
            });
            const wethOut = quote2[0];
            
            const grossProfit = wethOut - amountWei;
            const netProfit = grossProfit - gasCostWei;
            
            if (netProfit > 0n) {
              const netProfitUsd = parseFloat(ethers.formatEther(netProfit)) * ethPrice;
              const spreadBps = Number((grossProfit * 10000n) / amountWei);
              
              if (netProfitUsd >= CONFIG.MIN_PROFIT_USD) {
                opportunities.push({
                  chain: chainKey,
                  chainName: chain.name,
                  type: 'SCALP',
                  route: `${CONFIG.FEE_TIERS[i]/100}%→${CONFIG.FEE_TIERS[j]/100}%`,
                  amountIn: amountWei,
                  amountInEth: amountEth,
                  fee1: CONFIG.FEE_TIERS[i],
                  fee2: CONFIG.FEE_TIERS[j],
                  usdcIntermediate: usdcOut,
                  wethOut,
                  grossProfit,
                  netProfit,
                  netProfitUsd,
                  gasCostUsd,
                  spreadBps,
                  ethPrice,
                  timestamp: Date.now(),
                  gasPrice: gasPriceGwei
                });
                
                console.log(`   💰 OPP: ${chain.name} ${amountEth}ETH ${CONFIG.FEE_TIERS[i]/100}%→${CONFIG.FEE_TIERS[j]/100}% = $${netProfitUsd.toFixed(4)}`);
              }
            }
          } catch (e) {
            // Pool no existe
          }
        }
      }
    }
    
  } catch (e) {
    console.error(`   ❌ Error ${chain.name}: ${e.message.slice(0, 50)}`);
  }
  
  return opportunities;
}

// ═══════════════════════════════════════════════════════════════════════════════
// EJECUCIÓN
// ═══════════════════════════════════════════════════════════════════════════════

async function execute(opp) {
  if (isExecuting) return null;
  isExecuting = true;
  
  const chain = CHAINS[opp.chain];
  const signer = signers[opp.chain];
  const provider = providers[opp.chain];
  const { router, weth } = contracts[opp.chain];
  
  console.log(`\n🔥 ═══════════════════════════════════════════════════════════════`);
  console.log(`   EJECUTANDO en ${chain.name}`);
  console.log(`   Route: ${opp.route}`);
  console.log(`   Amount: ${opp.amountInEth} ETH`);
  console.log(`   Expected: $${opp.netProfitUsd.toFixed(4)}`);
  
  try {
    // Verificar balance
    const balance = await provider.getBalance(WALLET_ADDRESS);
    if (balance < opp.amountIn + ethers.parseEther('0.002')) {
      console.log(`   ❌ Balance insuficiente`);
      isExecuting = false;
      return { success: false, error: 'Balance insuficiente' };
    }
    
    // 1. Wrap ETH
    console.log(`   📦 Wrapping...`);
    const wrapTx = await weth.deposit({ value: opp.amountIn, gasLimit: 50000 });
    await wrapTx.wait(1);
    
    // 2. Approve WETH
    const allowance = await weth.allowance(WALLET_ADDRESS, chain.router);
    if (allowance < opp.amountIn) {
      const approveTx = await weth.approve(chain.router, ethers.MaxUint256, { gasLimit: 50000 });
      await approveTx.wait(1);
    }
    
    // 3. SWAP 1: WETH → USDC
    console.log(`   🔄 ENTRADA: WETH → USDC...`);
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
    console.log(`   ✅ ENTRADA: ${receipt1.hash.slice(0, 20)}...`);
    
    // 4. Obtener balance USDC
    const usdc = new ethers.Contract(chain.tokens.USDC, ERC20_ABI, signer);
    const usdcBalance = await usdc.balanceOf(WALLET_ADDRESS);
    
    // 5. Approve USDC
    const usdcAllowance = await usdc.allowance(WALLET_ADDRESS, chain.router);
    if (usdcAllowance < usdcBalance) {
      const approveUsdcTx = await usdc.approve(chain.router, ethers.MaxUint256, { gasLimit: 50000 });
      await approveUsdcTx.wait(1);
    }
    
    // 6. SWAP 2: USDC → WETH
    console.log(`   🔄 SALIDA: USDC → WETH...`);
    const minWeth = (opp.wethOut * BigInt(10000 - CONFIG.MAX_SLIPPAGE_BPS)) / 10000n;
    
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
    console.log(`   ✅ SALIDA: ${receipt2.hash.slice(0, 20)}...`);
    
    // 7. Calcular profit
    const finalWeth = await weth.balanceOf(WALLET_ADDRESS);
    const actualProfit = finalWeth - opp.amountIn;
    const actualProfitUsd = parseFloat(ethers.formatEther(actualProfit)) * opp.ethPrice;
    
    const gas1 = receipt1.gasUsed * receipt1.gasPrice;
    const gas2 = receipt2.gasUsed * receipt2.gasPrice;
    const totalGasUsd = parseFloat(ethers.formatEther(gas1 + gas2)) * opp.ethPrice;
    
    const netProfitUsd = actualProfitUsd - totalGasUsd;
    
    console.log(`   ═══════════════════════════════════════════════════════════════`);
    console.log(`   💰 PROFIT: $${actualProfitUsd.toFixed(4)}`);
    console.log(`   ⛽ GAS: $${totalGasUsd.toFixed(4)}`);
    console.log(`   💵 NETO: $${netProfitUsd.toFixed(4)}`);
    console.log(`   🔗 ${chain.explorer}/tx/${receipt2.hash}`);
    
    isExecuting = false;
    return {
      success: true,
      profitUsd: actualProfitUsd,
      gasUsd: totalGasUsd,
      netProfitUsd,
      txHash: receipt2.hash
    };
    
  } catch (e) {
    console.log(`   ❌ Error: ${e.message}`);
    isExecuting = false;
    return { success: false, error: e.message };
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// LOOP PRINCIPAL
// ═══════════════════════════════════════════════════════════════════════════════

async function tick() {
  if (!state.isRunning || isExecuting) return;
  
  const tickStart = Date.now();
  state.stats.totalScans++;
  state.stats.uptime = Math.floor((Date.now() - state.startTime) / 1000);
  
  // Alternar entre chains
  const chainKeys = Object.keys(CHAINS);
  const selectedChain = chainKeys[currentChainIndex % chainKeys.length];
  currentChainIndex++;
  
  state.stats.currentChain = selectedChain;
  state.banditStates.forEach(b => b.selected = b.chain === selectedChain);
  
  console.log(`\n[SCAN #${state.stats.totalScans}] ${CHAINS[selectedChain].name}`);
  
  try {
    const opportunities = await scanChain(selectedChain);
    const scanTime = Date.now() - tickStart;
    
    scanTimes.push(scanTime);
    if (scanTimes.length > 20) scanTimes.shift();
    state.stats.avgScanTimeMs = Math.round(scanTimes.reduce((a, b) => a + b, 0) / scanTimes.length);
    state.stats.scansPerSecond = Math.round(1000 / state.stats.avgScanTimeMs * 10) / 10;
    
    if (opportunities.length > 0) {
      state.stats.opportunitiesFound += opportunities.length;
      opportunities.sort((a, b) => b.netProfitUsd - a.netProfitUsd);
      
      state.opportunities = [...opportunities.slice(0, 5), ...state.opportunities].slice(0, 30);
      state.stats.lastOpportunity = opportunities[0];
      
      const best = opportunities[0];
      console.log(`   📊 ${scanTime}ms | ${opportunities.length} opps | Best: $${best.netProfitUsd.toFixed(4)}`);
      
      // EJECUTAR
      if (!state.isDryRun && CONFIG.AUTO_EXECUTE) {
        state.stats.tradesAttempted++;
        
        const result = await execute(best);
        
        if (result) {
          state.stats.tradesExecuted++;
          
          const tradeLog = {
            id: `tx-${Date.now()}`,
            timestamp: Date.now(),
            chain: best.chain,
            chainName: best.chainName,
            route: best.route,
            amountIn: best.amountInEth,
            spreadBps: best.spreadBps,
            expectedProfit: best.netProfitUsd.toFixed(4),
            actualProfit: result.success ? result.profitUsd.toFixed(4) : '0',
            gasCost: result.success ? result.gasUsd.toFixed(4) : '0',
            netProfit: result.success ? result.netProfitUsd.toFixed(4) : '0',
            txHash: result.txHash || '',
            status: result.success ? 'success' : 'failed',
            error: result.error || ''
          };
          
          state.tradeLogs.unshift(tradeLog);
          if (state.tradeLogs.length > 50) state.tradeLogs.pop();
          
          if (result.success) {
            state.stats.tradesSuccessful++;
            state.stats.totalProfitUsd += result.profitUsd;
            state.stats.totalGasUsd += result.gasUsd;
            state.stats.netProfitUsd = state.stats.totalProfitUsd - state.stats.totalGasUsd;
            state.stats.lastTrade = tradeLog;
            
            const bandit = state.banditStates.find(b => b.chain === best.chain);
            if (bandit) {
              bandit.wins++;
              bandit.attempts++;
              bandit.alpha++;
              bandit.winRate = (bandit.wins / bandit.attempts) * 100;
            }
          } else {
            const bandit = state.banditStates.find(b => b.chain === best.chain);
            if (bandit) {
              bandit.attempts++;
              bandit.beta++;
              bandit.winRate = bandit.attempts > 0 ? (bandit.wins / bandit.attempts) * 100 : 50;
            }
          }
          
          state.stats.winRate = state.stats.tradesExecuted > 0
            ? (state.stats.tradesSuccessful / state.stats.tradesExecuted) * 100
            : 0;
        }
      }
    } else {
      console.log(`   📊 ${scanTime}ms | No profitable opportunities`);
    }
    
    // Actualizar balances cada 20 scans
    if (state.stats.totalScans % 20 === 0) {
      for (const chainState of state.chains) {
        try {
          const balance = await providers[chainState.chain].getBalance(WALLET_ADDRESS);
          const balanceEth = parseFloat(ethers.formatEther(balance));
          chainState.balance = balanceEth.toFixed(6);
          chainState.balanceUsd = balanceEth * CONFIG.ETH_PRICE_USD;
          chainState.isActive = balanceEth > 0.001;
        } catch (e) {}
      }
    }
    
  } catch (e) {
    console.error(`   ❌ Error: ${e.message}`);
  }
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
  
  state.isDryRun = req.body?.dryRun === true;
  state.isRunning = true;
  state.startTime = Date.now();
  
  state.stats = {
    totalScans: 0, opportunitiesFound: 0, tradesAttempted: 0,
    tradesExecuted: 0, tradesSuccessful: 0, totalProfitUsd: 0,
    totalGasUsd: 0, netProfitUsd: 0, winRate: 0, avgScanTimeMs: 0,
    scansPerSecond: 0, uptime: 0, currentChain: 'base',
    lastOpportunity: null, lastTrade: null
  };
  state.tradeLogs = [];
  state.opportunities = [];
  scanTimes = [];
  currentChainIndex = 0;
  
  if (timer) clearInterval(timer);
  timer = setInterval(tick, CONFIG.SCAN_INTERVAL_MS);
  
  console.log(`\n[START] 🔥 SCALPER iniciado - ${state.isDryRun ? 'DRY RUN' : '⚠️ MODO REAL'}`);
  
  res.json({
    success: true,
    isRunning: true,
    isDryRun: state.isDryRun,
    mode: 'SCALPER_OPTIMIZED',
    config: CONFIG
  });
});

app.post('/api/defi/multichain-arb/stop', (req, res) => {
  state.isRunning = false;
  if (timer) { clearInterval(timer); timer = null; }
  console.log('[STOP] Bot detenido');
  res.json({ success: true, isRunning: false });
});

app.get('/api/defi/multichain-arb/health', (req, res) => {
  res.json({
    status: 'ok',
    mode: 'SCALPER_OPTIMIZED',
    port: PORT,
    running: state.isRunning,
    dryRun: state.isDryRun,
    wallet: WALLET_ADDRESS,
    config: CONFIG
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// INICIAR
// ═══════════════════════════════════════════════════════════════════════════════

app.listen(PORT, async () => {
  console.log(`
╔═══════════════════════════════════════════════════════════════════════════════╗
║                                                                               ║
║   🔥 SCALPER OPTIMIZADO - BASE + ARBITRUM                                     ║
║                                                                               ║
║   ✅ Puerto: ${PORT}                                                           ║
║   ✅ Wallet: ${WALLET_ADDRESS.slice(0, 10)}...${WALLET_ADDRESS.slice(-5)}                                  ║
║                                                                               ║
║   ⚡ Intervalo: ${CONFIG.SCAN_INTERVAL_MS}ms | Min Profit: $${CONFIG.MIN_PROFIT_USD}                            ║
║   ⚡ Fee Tiers: ${CONFIG.FEE_TIERS.map(f => f/100 + '%').join(', ')}                                     ║
║   ⚡ Amounts: ${CONFIG.TRADE_AMOUNTS_ETH.join(', ')} ETH                                  ║
║                                                                               ║
╚═══════════════════════════════════════════════════════════════════════════════╝
  `);
  
  await init();
  console.log('[READY] 🔥 Scalper listo. POST /api/defi/multichain-arb/start para iniciar.\n');
});

process.on('SIGINT', () => {
  if (timer) clearInterval(timer);
  process.exit(0);
});



 * ═══════════════════════════════════════════════════════════════════════════════
 * 🔥 SCALPER OPTIMIZADO - BASE + ARBITRUM ONLY
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * Versión optimizada que:
 * - Solo usa Base y Arbitrum (RPCs premium)
 * - Reduce llamadas paralelas para evitar rate limits
 * - Escaneo secuencial por chain
 * - Ejecución inmediata cuando detecta oportunidad
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
// CONFIGURACIÓN OPTIMIZADA
// ═══════════════════════════════════════════════════════════════════════════════

const CONFIG = {
  SCAN_INTERVAL_MS: 500,
  MIN_PROFIT_USD: 0.01,
  MAX_SLIPPAGE_BPS: 50,
  TRADE_AMOUNTS_ETH: [0.005, 0.01, 0.02],
  FEE_TIERS: [500, 3000],  // Solo los más líquidos
  AUTO_EXECUTE: true,
  MAX_GAS_GWEI: 10,
  ETH_PRICE_USD: 3500
};

const PRIVATE_KEY = process.env.VITE_ETH_PRIVATE_KEY;
const WALLET_ADDRESS = process.env.VITE_ETH_WALLET_ADDRESS;

if (!PRIVATE_KEY || !WALLET_ADDRESS) {
  console.error('❌ ERROR: Credenciales no configuradas');
  process.exit(1);
}

// ═══════════════════════════════════════════════════════════════════════════════
// CHAINS (Solo Base y Arbitrum con RPCs premium)
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

const ROUTER_ABI = [
  'function exactInputSingle((address tokenIn, address tokenOut, uint24 fee, address recipient, uint256 amountIn, uint256 amountOutMinimum, uint160 sqrtPriceLimitX96)) external payable returns (uint256 amountOut)'
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
// ESTADO
// ═══════════════════════════════════════════════════════════════════════════════

let state = {
  isRunning: false,
  isDryRun: false,
  startTime: null,
  mode: 'SCALPER_OPTIMIZED',
  stats: {
    totalScans: 0,
    opportunitiesFound: 0,
    tradesAttempted: 0,
    tradesExecuted: 0,
    tradesSuccessful: 0,
    totalProfitUsd: 0,
    totalGasUsd: 0,
    netProfitUsd: 0,
    winRate: 0,
    avgScanTimeMs: 0,
    scansPerSecond: 0,
    uptime: 0,
    currentChain: 'base',
    lastOpportunity: null,
    lastTrade: null
  },
  chains: [],
  tradeLogs: [],
  opportunities: [],
  banditStates: []
};

let timer = null;
let providers = {};
let signers = {};
let contracts = {};
let isExecuting = false;
let currentChainIndex = 0;
let scanTimes = [];

// ═══════════════════════════════════════════════════════════════════════════════
// INICIALIZAR
// ═══════════════════════════════════════════════════════════════════════════════

async function init() {
  console.log('[INIT] 🔌 Conectando a chains...\n');
  
  for (const [key, chain] of Object.entries(CHAINS)) {
    try {
      providers[key] = new ethers.JsonRpcProvider(chain.rpc);
      signers[key] = new ethers.Wallet(PRIVATE_KEY, providers[key]);
      
      contracts[key] = {
        quoter: new ethers.Contract(chain.quoter, QUOTER_ABI, providers[key]),
        router: new ethers.Contract(chain.router, ROUTER_ABI, signers[key]),
        weth: new ethers.Contract(chain.tokens.WETH, WETH_ABI, signers[key])
      };
      
      const balance = await providers[key].getBalance(WALLET_ADDRESS);
      const balanceEth = parseFloat(ethers.formatEther(balance));
      
      state.chains.push({
        chain: key,
        name: chain.name,
        chainId: chain.chainId,
        balance: balanceEth.toFixed(6),
        balanceUsd: balanceEth * CONFIG.ETH_PRICE_USD,
        routes: CONFIG.FEE_TIERS.length * CONFIG.TRADE_AMOUNTS_ETH.length,
        isActive: balanceEth > 0.001,
        lastScan: Date.now(),
        scansCompleted: 0,
        opportunitiesFound: 0,
        tradesExecuted: 0,
        explorer: chain.explorer,
        ethPrice: 0
      });
      
      state.banditStates.push({
        chain: key,
        alpha: 2,
        beta: 2,
        winRate: 50,
        selected: key === 'base',
        attempts: 0,
        wins: 0
      });
      
      console.log(`   ✅ ${chain.name}: ${balanceEth.toFixed(6)} ETH ($${(balanceEth * CONFIG.ETH_PRICE_USD).toFixed(2)})`);
    } catch (e) {
      console.error(`   ❌ ${chain.name}: ${e.message}`);
    }
  }
  console.log('');
}

// ═══════════════════════════════════════════════════════════════════════════════
// ESCANEO SECUENCIAL (evita rate limits)
// ═══════════════════════════════════════════════════════════════════════════════

async function scanChain(chainKey) {
  const chain = CHAINS[chainKey];
  const provider = providers[chainKey];
  const quoter = contracts[chainKey].quoter;
  const opportunities = [];
  
  try {
    // 1. Obtener gas price
    const feeData = await provider.getFeeData();
    const gasPrice = feeData.gasPrice || ethers.parseUnits('0.001', 'gwei');
    const gasPriceGwei = parseFloat(ethers.formatUnits(gasPrice, 'gwei'));
    
    if (gasPriceGwei > CONFIG.MAX_GAS_GWEI) {
      console.log(`   ⛽ Gas muy alto en ${chain.name}: ${gasPriceGwei.toFixed(2)} gwei`);
      return [];
    }
    
    const gasCostWei = gasPrice * 250000n;
    const gasCostUsd = parseFloat(ethers.formatEther(gasCostWei)) * CONFIG.ETH_PRICE_USD;
    
    // 2. Obtener precio ETH
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
    } catch (e) {}
    
    // Actualizar estado
    const chainState = state.chains.find(c => c.chain === chainKey);
    if (chainState) chainState.ethPrice = ethPrice;
    
    // 3. Escanear rutas SECUENCIALMENTE (no paralelo)
    for (const amountEth of CONFIG.TRADE_AMOUNTS_ETH) {
      const amountWei = ethers.parseEther(amountEth.toString());
      
      for (let i = 0; i < CONFIG.FEE_TIERS.length; i++) {
        for (let j = 0; j < CONFIG.FEE_TIERS.length; j++) {
          if (i === j) continue;
          
          try {
            // WETH → USDC
            const quote1 = await quoter.quoteExactInputSingle.staticCall({
              tokenIn: chain.tokens.WETH,
              tokenOut: chain.tokens.USDC,
              amountIn: amountWei,
              fee: CONFIG.FEE_TIERS[i],
              sqrtPriceLimitX96: 0n
            });
            const usdcOut = quote1[0];
            
            // USDC → WETH
            const quote2 = await quoter.quoteExactInputSingle.staticCall({
              tokenIn: chain.tokens.USDC,
              tokenOut: chain.tokens.WETH,
              amountIn: usdcOut,
              fee: CONFIG.FEE_TIERS[j],
              sqrtPriceLimitX96: 0n
            });
            const wethOut = quote2[0];
            
            const grossProfit = wethOut - amountWei;
            const netProfit = grossProfit - gasCostWei;
            
            if (netProfit > 0n) {
              const netProfitUsd = parseFloat(ethers.formatEther(netProfit)) * ethPrice;
              const spreadBps = Number((grossProfit * 10000n) / amountWei);
              
              if (netProfitUsd >= CONFIG.MIN_PROFIT_USD) {
                opportunities.push({
                  chain: chainKey,
                  chainName: chain.name,
                  type: 'SCALP',
                  route: `${CONFIG.FEE_TIERS[i]/100}%→${CONFIG.FEE_TIERS[j]/100}%`,
                  amountIn: amountWei,
                  amountInEth: amountEth,
                  fee1: CONFIG.FEE_TIERS[i],
                  fee2: CONFIG.FEE_TIERS[j],
                  usdcIntermediate: usdcOut,
                  wethOut,
                  grossProfit,
                  netProfit,
                  netProfitUsd,
                  gasCostUsd,
                  spreadBps,
                  ethPrice,
                  timestamp: Date.now(),
                  gasPrice: gasPriceGwei
                });
                
                console.log(`   💰 OPP: ${chain.name} ${amountEth}ETH ${CONFIG.FEE_TIERS[i]/100}%→${CONFIG.FEE_TIERS[j]/100}% = $${netProfitUsd.toFixed(4)}`);
              }
            }
          } catch (e) {
            // Pool no existe
          }
        }
      }
    }
    
  } catch (e) {
    console.error(`   ❌ Error ${chain.name}: ${e.message.slice(0, 50)}`);
  }
  
  return opportunities;
}

// ═══════════════════════════════════════════════════════════════════════════════
// EJECUCIÓN
// ═══════════════════════════════════════════════════════════════════════════════

async function execute(opp) {
  if (isExecuting) return null;
  isExecuting = true;
  
  const chain = CHAINS[opp.chain];
  const signer = signers[opp.chain];
  const provider = providers[opp.chain];
  const { router, weth } = contracts[opp.chain];
  
  console.log(`\n🔥 ═══════════════════════════════════════════════════════════════`);
  console.log(`   EJECUTANDO en ${chain.name}`);
  console.log(`   Route: ${opp.route}`);
  console.log(`   Amount: ${opp.amountInEth} ETH`);
  console.log(`   Expected: $${opp.netProfitUsd.toFixed(4)}`);
  
  try {
    // Verificar balance
    const balance = await provider.getBalance(WALLET_ADDRESS);
    if (balance < opp.amountIn + ethers.parseEther('0.002')) {
      console.log(`   ❌ Balance insuficiente`);
      isExecuting = false;
      return { success: false, error: 'Balance insuficiente' };
    }
    
    // 1. Wrap ETH
    console.log(`   📦 Wrapping...`);
    const wrapTx = await weth.deposit({ value: opp.amountIn, gasLimit: 50000 });
    await wrapTx.wait(1);
    
    // 2. Approve WETH
    const allowance = await weth.allowance(WALLET_ADDRESS, chain.router);
    if (allowance < opp.amountIn) {
      const approveTx = await weth.approve(chain.router, ethers.MaxUint256, { gasLimit: 50000 });
      await approveTx.wait(1);
    }
    
    // 3. SWAP 1: WETH → USDC
    console.log(`   🔄 ENTRADA: WETH → USDC...`);
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
    console.log(`   ✅ ENTRADA: ${receipt1.hash.slice(0, 20)}...`);
    
    // 4. Obtener balance USDC
    const usdc = new ethers.Contract(chain.tokens.USDC, ERC20_ABI, signer);
    const usdcBalance = await usdc.balanceOf(WALLET_ADDRESS);
    
    // 5. Approve USDC
    const usdcAllowance = await usdc.allowance(WALLET_ADDRESS, chain.router);
    if (usdcAllowance < usdcBalance) {
      const approveUsdcTx = await usdc.approve(chain.router, ethers.MaxUint256, { gasLimit: 50000 });
      await approveUsdcTx.wait(1);
    }
    
    // 6. SWAP 2: USDC → WETH
    console.log(`   🔄 SALIDA: USDC → WETH...`);
    const minWeth = (opp.wethOut * BigInt(10000 - CONFIG.MAX_SLIPPAGE_BPS)) / 10000n;
    
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
    console.log(`   ✅ SALIDA: ${receipt2.hash.slice(0, 20)}...`);
    
    // 7. Calcular profit
    const finalWeth = await weth.balanceOf(WALLET_ADDRESS);
    const actualProfit = finalWeth - opp.amountIn;
    const actualProfitUsd = parseFloat(ethers.formatEther(actualProfit)) * opp.ethPrice;
    
    const gas1 = receipt1.gasUsed * receipt1.gasPrice;
    const gas2 = receipt2.gasUsed * receipt2.gasPrice;
    const totalGasUsd = parseFloat(ethers.formatEther(gas1 + gas2)) * opp.ethPrice;
    
    const netProfitUsd = actualProfitUsd - totalGasUsd;
    
    console.log(`   ═══════════════════════════════════════════════════════════════`);
    console.log(`   💰 PROFIT: $${actualProfitUsd.toFixed(4)}`);
    console.log(`   ⛽ GAS: $${totalGasUsd.toFixed(4)}`);
    console.log(`   💵 NETO: $${netProfitUsd.toFixed(4)}`);
    console.log(`   🔗 ${chain.explorer}/tx/${receipt2.hash}`);
    
    isExecuting = false;
    return {
      success: true,
      profitUsd: actualProfitUsd,
      gasUsd: totalGasUsd,
      netProfitUsd,
      txHash: receipt2.hash
    };
    
  } catch (e) {
    console.log(`   ❌ Error: ${e.message}`);
    isExecuting = false;
    return { success: false, error: e.message };
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// LOOP PRINCIPAL
// ═══════════════════════════════════════════════════════════════════════════════

async function tick() {
  if (!state.isRunning || isExecuting) return;
  
  const tickStart = Date.now();
  state.stats.totalScans++;
  state.stats.uptime = Math.floor((Date.now() - state.startTime) / 1000);
  
  // Alternar entre chains
  const chainKeys = Object.keys(CHAINS);
  const selectedChain = chainKeys[currentChainIndex % chainKeys.length];
  currentChainIndex++;
  
  state.stats.currentChain = selectedChain;
  state.banditStates.forEach(b => b.selected = b.chain === selectedChain);
  
  console.log(`\n[SCAN #${state.stats.totalScans}] ${CHAINS[selectedChain].name}`);
  
  try {
    const opportunities = await scanChain(selectedChain);
    const scanTime = Date.now() - tickStart;
    
    scanTimes.push(scanTime);
    if (scanTimes.length > 20) scanTimes.shift();
    state.stats.avgScanTimeMs = Math.round(scanTimes.reduce((a, b) => a + b, 0) / scanTimes.length);
    state.stats.scansPerSecond = Math.round(1000 / state.stats.avgScanTimeMs * 10) / 10;
    
    if (opportunities.length > 0) {
      state.stats.opportunitiesFound += opportunities.length;
      opportunities.sort((a, b) => b.netProfitUsd - a.netProfitUsd);
      
      state.opportunities = [...opportunities.slice(0, 5), ...state.opportunities].slice(0, 30);
      state.stats.lastOpportunity = opportunities[0];
      
      const best = opportunities[0];
      console.log(`   📊 ${scanTime}ms | ${opportunities.length} opps | Best: $${best.netProfitUsd.toFixed(4)}`);
      
      // EJECUTAR
      if (!state.isDryRun && CONFIG.AUTO_EXECUTE) {
        state.stats.tradesAttempted++;
        
        const result = await execute(best);
        
        if (result) {
          state.stats.tradesExecuted++;
          
          const tradeLog = {
            id: `tx-${Date.now()}`,
            timestamp: Date.now(),
            chain: best.chain,
            chainName: best.chainName,
            route: best.route,
            amountIn: best.amountInEth,
            spreadBps: best.spreadBps,
            expectedProfit: best.netProfitUsd.toFixed(4),
            actualProfit: result.success ? result.profitUsd.toFixed(4) : '0',
            gasCost: result.success ? result.gasUsd.toFixed(4) : '0',
            netProfit: result.success ? result.netProfitUsd.toFixed(4) : '0',
            txHash: result.txHash || '',
            status: result.success ? 'success' : 'failed',
            error: result.error || ''
          };
          
          state.tradeLogs.unshift(tradeLog);
          if (state.tradeLogs.length > 50) state.tradeLogs.pop();
          
          if (result.success) {
            state.stats.tradesSuccessful++;
            state.stats.totalProfitUsd += result.profitUsd;
            state.stats.totalGasUsd += result.gasUsd;
            state.stats.netProfitUsd = state.stats.totalProfitUsd - state.stats.totalGasUsd;
            state.stats.lastTrade = tradeLog;
            
            const bandit = state.banditStates.find(b => b.chain === best.chain);
            if (bandit) {
              bandit.wins++;
              bandit.attempts++;
              bandit.alpha++;
              bandit.winRate = (bandit.wins / bandit.attempts) * 100;
            }
          } else {
            const bandit = state.banditStates.find(b => b.chain === best.chain);
            if (bandit) {
              bandit.attempts++;
              bandit.beta++;
              bandit.winRate = bandit.attempts > 0 ? (bandit.wins / bandit.attempts) * 100 : 50;
            }
          }
          
          state.stats.winRate = state.stats.tradesExecuted > 0
            ? (state.stats.tradesSuccessful / state.stats.tradesExecuted) * 100
            : 0;
        }
      }
    } else {
      console.log(`   📊 ${scanTime}ms | No profitable opportunities`);
    }
    
    // Actualizar balances cada 20 scans
    if (state.stats.totalScans % 20 === 0) {
      for (const chainState of state.chains) {
        try {
          const balance = await providers[chainState.chain].getBalance(WALLET_ADDRESS);
          const balanceEth = parseFloat(ethers.formatEther(balance));
          chainState.balance = balanceEth.toFixed(6);
          chainState.balanceUsd = balanceEth * CONFIG.ETH_PRICE_USD;
          chainState.isActive = balanceEth > 0.001;
        } catch (e) {}
      }
    }
    
  } catch (e) {
    console.error(`   ❌ Error: ${e.message}`);
  }
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
  
  state.isDryRun = req.body?.dryRun === true;
  state.isRunning = true;
  state.startTime = Date.now();
  
  state.stats = {
    totalScans: 0, opportunitiesFound: 0, tradesAttempted: 0,
    tradesExecuted: 0, tradesSuccessful: 0, totalProfitUsd: 0,
    totalGasUsd: 0, netProfitUsd: 0, winRate: 0, avgScanTimeMs: 0,
    scansPerSecond: 0, uptime: 0, currentChain: 'base',
    lastOpportunity: null, lastTrade: null
  };
  state.tradeLogs = [];
  state.opportunities = [];
  scanTimes = [];
  currentChainIndex = 0;
  
  if (timer) clearInterval(timer);
  timer = setInterval(tick, CONFIG.SCAN_INTERVAL_MS);
  
  console.log(`\n[START] 🔥 SCALPER iniciado - ${state.isDryRun ? 'DRY RUN' : '⚠️ MODO REAL'}`);
  
  res.json({
    success: true,
    isRunning: true,
    isDryRun: state.isDryRun,
    mode: 'SCALPER_OPTIMIZED',
    config: CONFIG
  });
});

app.post('/api/defi/multichain-arb/stop', (req, res) => {
  state.isRunning = false;
  if (timer) { clearInterval(timer); timer = null; }
  console.log('[STOP] Bot detenido');
  res.json({ success: true, isRunning: false });
});

app.get('/api/defi/multichain-arb/health', (req, res) => {
  res.json({
    status: 'ok',
    mode: 'SCALPER_OPTIMIZED',
    port: PORT,
    running: state.isRunning,
    dryRun: state.isDryRun,
    wallet: WALLET_ADDRESS,
    config: CONFIG
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// INICIAR
// ═══════════════════════════════════════════════════════════════════════════════

app.listen(PORT, async () => {
  console.log(`
╔═══════════════════════════════════════════════════════════════════════════════╗
║                                                                               ║
║   🔥 SCALPER OPTIMIZADO - BASE + ARBITRUM                                     ║
║                                                                               ║
║   ✅ Puerto: ${PORT}                                                           ║
║   ✅ Wallet: ${WALLET_ADDRESS.slice(0, 10)}...${WALLET_ADDRESS.slice(-5)}                                  ║
║                                                                               ║
║   ⚡ Intervalo: ${CONFIG.SCAN_INTERVAL_MS}ms | Min Profit: $${CONFIG.MIN_PROFIT_USD}                            ║
║   ⚡ Fee Tiers: ${CONFIG.FEE_TIERS.map(f => f/100 + '%').join(', ')}                                     ║
║   ⚡ Amounts: ${CONFIG.TRADE_AMOUNTS_ETH.join(', ')} ETH                                  ║
║                                                                               ║
╚═══════════════════════════════════════════════════════════════════════════════╝
  `);
  
  await init();
  console.log('[READY] 🔥 Scalper listo. POST /api/defi/multichain-arb/start para iniciar.\n');
});

process.on('SIGINT', () => {
  if (timer) clearInterval(timer);
  process.exit(0);
});



 * ═══════════════════════════════════════════════════════════════════════════════
 * 🔥 SCALPER OPTIMIZADO - BASE + ARBITRUM ONLY
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * Versión optimizada que:
 * - Solo usa Base y Arbitrum (RPCs premium)
 * - Reduce llamadas paralelas para evitar rate limits
 * - Escaneo secuencial por chain
 * - Ejecución inmediata cuando detecta oportunidad
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
// CONFIGURACIÓN OPTIMIZADA
// ═══════════════════════════════════════════════════════════════════════════════

const CONFIG = {
  SCAN_INTERVAL_MS: 500,
  MIN_PROFIT_USD: 0.01,
  MAX_SLIPPAGE_BPS: 50,
  TRADE_AMOUNTS_ETH: [0.005, 0.01, 0.02],
  FEE_TIERS: [500, 3000],  // Solo los más líquidos
  AUTO_EXECUTE: true,
  MAX_GAS_GWEI: 10,
  ETH_PRICE_USD: 3500
};

const PRIVATE_KEY = process.env.VITE_ETH_PRIVATE_KEY;
const WALLET_ADDRESS = process.env.VITE_ETH_WALLET_ADDRESS;

if (!PRIVATE_KEY || !WALLET_ADDRESS) {
  console.error('❌ ERROR: Credenciales no configuradas');
  process.exit(1);
}

// ═══════════════════════════════════════════════════════════════════════════════
// CHAINS (Solo Base y Arbitrum con RPCs premium)
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

const ROUTER_ABI = [
  'function exactInputSingle((address tokenIn, address tokenOut, uint24 fee, address recipient, uint256 amountIn, uint256 amountOutMinimum, uint160 sqrtPriceLimitX96)) external payable returns (uint256 amountOut)'
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
// ESTADO
// ═══════════════════════════════════════════════════════════════════════════════

let state = {
  isRunning: false,
  isDryRun: false,
  startTime: null,
  mode: 'SCALPER_OPTIMIZED',
  stats: {
    totalScans: 0,
    opportunitiesFound: 0,
    tradesAttempted: 0,
    tradesExecuted: 0,
    tradesSuccessful: 0,
    totalProfitUsd: 0,
    totalGasUsd: 0,
    netProfitUsd: 0,
    winRate: 0,
    avgScanTimeMs: 0,
    scansPerSecond: 0,
    uptime: 0,
    currentChain: 'base',
    lastOpportunity: null,
    lastTrade: null
  },
  chains: [],
  tradeLogs: [],
  opportunities: [],
  banditStates: []
};

let timer = null;
let providers = {};
let signers = {};
let contracts = {};
let isExecuting = false;
let currentChainIndex = 0;
let scanTimes = [];

// ═══════════════════════════════════════════════════════════════════════════════
// INICIALIZAR
// ═══════════════════════════════════════════════════════════════════════════════

async function init() {
  console.log('[INIT] 🔌 Conectando a chains...\n');
  
  for (const [key, chain] of Object.entries(CHAINS)) {
    try {
      providers[key] = new ethers.JsonRpcProvider(chain.rpc);
      signers[key] = new ethers.Wallet(PRIVATE_KEY, providers[key]);
      
      contracts[key] = {
        quoter: new ethers.Contract(chain.quoter, QUOTER_ABI, providers[key]),
        router: new ethers.Contract(chain.router, ROUTER_ABI, signers[key]),
        weth: new ethers.Contract(chain.tokens.WETH, WETH_ABI, signers[key])
      };
      
      const balance = await providers[key].getBalance(WALLET_ADDRESS);
      const balanceEth = parseFloat(ethers.formatEther(balance));
      
      state.chains.push({
        chain: key,
        name: chain.name,
        chainId: chain.chainId,
        balance: balanceEth.toFixed(6),
        balanceUsd: balanceEth * CONFIG.ETH_PRICE_USD,
        routes: CONFIG.FEE_TIERS.length * CONFIG.TRADE_AMOUNTS_ETH.length,
        isActive: balanceEth > 0.001,
        lastScan: Date.now(),
        scansCompleted: 0,
        opportunitiesFound: 0,
        tradesExecuted: 0,
        explorer: chain.explorer,
        ethPrice: 0
      });
      
      state.banditStates.push({
        chain: key,
        alpha: 2,
        beta: 2,
        winRate: 50,
        selected: key === 'base',
        attempts: 0,
        wins: 0
      });
      
      console.log(`   ✅ ${chain.name}: ${balanceEth.toFixed(6)} ETH ($${(balanceEth * CONFIG.ETH_PRICE_USD).toFixed(2)})`);
    } catch (e) {
      console.error(`   ❌ ${chain.name}: ${e.message}`);
    }
  }
  console.log('');
}

// ═══════════════════════════════════════════════════════════════════════════════
// ESCANEO SECUENCIAL (evita rate limits)
// ═══════════════════════════════════════════════════════════════════════════════

async function scanChain(chainKey) {
  const chain = CHAINS[chainKey];
  const provider = providers[chainKey];
  const quoter = contracts[chainKey].quoter;
  const opportunities = [];
  
  try {
    // 1. Obtener gas price
    const feeData = await provider.getFeeData();
    const gasPrice = feeData.gasPrice || ethers.parseUnits('0.001', 'gwei');
    const gasPriceGwei = parseFloat(ethers.formatUnits(gasPrice, 'gwei'));
    
    if (gasPriceGwei > CONFIG.MAX_GAS_GWEI) {
      console.log(`   ⛽ Gas muy alto en ${chain.name}: ${gasPriceGwei.toFixed(2)} gwei`);
      return [];
    }
    
    const gasCostWei = gasPrice * 250000n;
    const gasCostUsd = parseFloat(ethers.formatEther(gasCostWei)) * CONFIG.ETH_PRICE_USD;
    
    // 2. Obtener precio ETH
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
    } catch (e) {}
    
    // Actualizar estado
    const chainState = state.chains.find(c => c.chain === chainKey);
    if (chainState) chainState.ethPrice = ethPrice;
    
    // 3. Escanear rutas SECUENCIALMENTE (no paralelo)
    for (const amountEth of CONFIG.TRADE_AMOUNTS_ETH) {
      const amountWei = ethers.parseEther(amountEth.toString());
      
      for (let i = 0; i < CONFIG.FEE_TIERS.length; i++) {
        for (let j = 0; j < CONFIG.FEE_TIERS.length; j++) {
          if (i === j) continue;
          
          try {
            // WETH → USDC
            const quote1 = await quoter.quoteExactInputSingle.staticCall({
              tokenIn: chain.tokens.WETH,
              tokenOut: chain.tokens.USDC,
              amountIn: amountWei,
              fee: CONFIG.FEE_TIERS[i],
              sqrtPriceLimitX96: 0n
            });
            const usdcOut = quote1[0];
            
            // USDC → WETH
            const quote2 = await quoter.quoteExactInputSingle.staticCall({
              tokenIn: chain.tokens.USDC,
              tokenOut: chain.tokens.WETH,
              amountIn: usdcOut,
              fee: CONFIG.FEE_TIERS[j],
              sqrtPriceLimitX96: 0n
            });
            const wethOut = quote2[0];
            
            const grossProfit = wethOut - amountWei;
            const netProfit = grossProfit - gasCostWei;
            
            if (netProfit > 0n) {
              const netProfitUsd = parseFloat(ethers.formatEther(netProfit)) * ethPrice;
              const spreadBps = Number((grossProfit * 10000n) / amountWei);
              
              if (netProfitUsd >= CONFIG.MIN_PROFIT_USD) {
                opportunities.push({
                  chain: chainKey,
                  chainName: chain.name,
                  type: 'SCALP',
                  route: `${CONFIG.FEE_TIERS[i]/100}%→${CONFIG.FEE_TIERS[j]/100}%`,
                  amountIn: amountWei,
                  amountInEth: amountEth,
                  fee1: CONFIG.FEE_TIERS[i],
                  fee2: CONFIG.FEE_TIERS[j],
                  usdcIntermediate: usdcOut,
                  wethOut,
                  grossProfit,
                  netProfit,
                  netProfitUsd,
                  gasCostUsd,
                  spreadBps,
                  ethPrice,
                  timestamp: Date.now(),
                  gasPrice: gasPriceGwei
                });
                
                console.log(`   💰 OPP: ${chain.name} ${amountEth}ETH ${CONFIG.FEE_TIERS[i]/100}%→${CONFIG.FEE_TIERS[j]/100}% = $${netProfitUsd.toFixed(4)}`);
              }
            }
          } catch (e) {
            // Pool no existe
          }
        }
      }
    }
    
  } catch (e) {
    console.error(`   ❌ Error ${chain.name}: ${e.message.slice(0, 50)}`);
  }
  
  return opportunities;
}

// ═══════════════════════════════════════════════════════════════════════════════
// EJECUCIÓN
// ═══════════════════════════════════════════════════════════════════════════════

async function execute(opp) {
  if (isExecuting) return null;
  isExecuting = true;
  
  const chain = CHAINS[opp.chain];
  const signer = signers[opp.chain];
  const provider = providers[opp.chain];
  const { router, weth } = contracts[opp.chain];
  
  console.log(`\n🔥 ═══════════════════════════════════════════════════════════════`);
  console.log(`   EJECUTANDO en ${chain.name}`);
  console.log(`   Route: ${opp.route}`);
  console.log(`   Amount: ${opp.amountInEth} ETH`);
  console.log(`   Expected: $${opp.netProfitUsd.toFixed(4)}`);
  
  try {
    // Verificar balance
    const balance = await provider.getBalance(WALLET_ADDRESS);
    if (balance < opp.amountIn + ethers.parseEther('0.002')) {
      console.log(`   ❌ Balance insuficiente`);
      isExecuting = false;
      return { success: false, error: 'Balance insuficiente' };
    }
    
    // 1. Wrap ETH
    console.log(`   📦 Wrapping...`);
    const wrapTx = await weth.deposit({ value: opp.amountIn, gasLimit: 50000 });
    await wrapTx.wait(1);
    
    // 2. Approve WETH
    const allowance = await weth.allowance(WALLET_ADDRESS, chain.router);
    if (allowance < opp.amountIn) {
      const approveTx = await weth.approve(chain.router, ethers.MaxUint256, { gasLimit: 50000 });
      await approveTx.wait(1);
    }
    
    // 3. SWAP 1: WETH → USDC
    console.log(`   🔄 ENTRADA: WETH → USDC...`);
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
    console.log(`   ✅ ENTRADA: ${receipt1.hash.slice(0, 20)}...`);
    
    // 4. Obtener balance USDC
    const usdc = new ethers.Contract(chain.tokens.USDC, ERC20_ABI, signer);
    const usdcBalance = await usdc.balanceOf(WALLET_ADDRESS);
    
    // 5. Approve USDC
    const usdcAllowance = await usdc.allowance(WALLET_ADDRESS, chain.router);
    if (usdcAllowance < usdcBalance) {
      const approveUsdcTx = await usdc.approve(chain.router, ethers.MaxUint256, { gasLimit: 50000 });
      await approveUsdcTx.wait(1);
    }
    
    // 6. SWAP 2: USDC → WETH
    console.log(`   🔄 SALIDA: USDC → WETH...`);
    const minWeth = (opp.wethOut * BigInt(10000 - CONFIG.MAX_SLIPPAGE_BPS)) / 10000n;
    
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
    console.log(`   ✅ SALIDA: ${receipt2.hash.slice(0, 20)}...`);
    
    // 7. Calcular profit
    const finalWeth = await weth.balanceOf(WALLET_ADDRESS);
    const actualProfit = finalWeth - opp.amountIn;
    const actualProfitUsd = parseFloat(ethers.formatEther(actualProfit)) * opp.ethPrice;
    
    const gas1 = receipt1.gasUsed * receipt1.gasPrice;
    const gas2 = receipt2.gasUsed * receipt2.gasPrice;
    const totalGasUsd = parseFloat(ethers.formatEther(gas1 + gas2)) * opp.ethPrice;
    
    const netProfitUsd = actualProfitUsd - totalGasUsd;
    
    console.log(`   ═══════════════════════════════════════════════════════════════`);
    console.log(`   💰 PROFIT: $${actualProfitUsd.toFixed(4)}`);
    console.log(`   ⛽ GAS: $${totalGasUsd.toFixed(4)}`);
    console.log(`   💵 NETO: $${netProfitUsd.toFixed(4)}`);
    console.log(`   🔗 ${chain.explorer}/tx/${receipt2.hash}`);
    
    isExecuting = false;
    return {
      success: true,
      profitUsd: actualProfitUsd,
      gasUsd: totalGasUsd,
      netProfitUsd,
      txHash: receipt2.hash
    };
    
  } catch (e) {
    console.log(`   ❌ Error: ${e.message}`);
    isExecuting = false;
    return { success: false, error: e.message };
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// LOOP PRINCIPAL
// ═══════════════════════════════════════════════════════════════════════════════

async function tick() {
  if (!state.isRunning || isExecuting) return;
  
  const tickStart = Date.now();
  state.stats.totalScans++;
  state.stats.uptime = Math.floor((Date.now() - state.startTime) / 1000);
  
  // Alternar entre chains
  const chainKeys = Object.keys(CHAINS);
  const selectedChain = chainKeys[currentChainIndex % chainKeys.length];
  currentChainIndex++;
  
  state.stats.currentChain = selectedChain;
  state.banditStates.forEach(b => b.selected = b.chain === selectedChain);
  
  console.log(`\n[SCAN #${state.stats.totalScans}] ${CHAINS[selectedChain].name}`);
  
  try {
    const opportunities = await scanChain(selectedChain);
    const scanTime = Date.now() - tickStart;
    
    scanTimes.push(scanTime);
    if (scanTimes.length > 20) scanTimes.shift();
    state.stats.avgScanTimeMs = Math.round(scanTimes.reduce((a, b) => a + b, 0) / scanTimes.length);
    state.stats.scansPerSecond = Math.round(1000 / state.stats.avgScanTimeMs * 10) / 10;
    
    if (opportunities.length > 0) {
      state.stats.opportunitiesFound += opportunities.length;
      opportunities.sort((a, b) => b.netProfitUsd - a.netProfitUsd);
      
      state.opportunities = [...opportunities.slice(0, 5), ...state.opportunities].slice(0, 30);
      state.stats.lastOpportunity = opportunities[0];
      
      const best = opportunities[0];
      console.log(`   📊 ${scanTime}ms | ${opportunities.length} opps | Best: $${best.netProfitUsd.toFixed(4)}`);
      
      // EJECUTAR
      if (!state.isDryRun && CONFIG.AUTO_EXECUTE) {
        state.stats.tradesAttempted++;
        
        const result = await execute(best);
        
        if (result) {
          state.stats.tradesExecuted++;
          
          const tradeLog = {
            id: `tx-${Date.now()}`,
            timestamp: Date.now(),
            chain: best.chain,
            chainName: best.chainName,
            route: best.route,
            amountIn: best.amountInEth,
            spreadBps: best.spreadBps,
            expectedProfit: best.netProfitUsd.toFixed(4),
            actualProfit: result.success ? result.profitUsd.toFixed(4) : '0',
            gasCost: result.success ? result.gasUsd.toFixed(4) : '0',
            netProfit: result.success ? result.netProfitUsd.toFixed(4) : '0',
            txHash: result.txHash || '',
            status: result.success ? 'success' : 'failed',
            error: result.error || ''
          };
          
          state.tradeLogs.unshift(tradeLog);
          if (state.tradeLogs.length > 50) state.tradeLogs.pop();
          
          if (result.success) {
            state.stats.tradesSuccessful++;
            state.stats.totalProfitUsd += result.profitUsd;
            state.stats.totalGasUsd += result.gasUsd;
            state.stats.netProfitUsd = state.stats.totalProfitUsd - state.stats.totalGasUsd;
            state.stats.lastTrade = tradeLog;
            
            const bandit = state.banditStates.find(b => b.chain === best.chain);
            if (bandit) {
              bandit.wins++;
              bandit.attempts++;
              bandit.alpha++;
              bandit.winRate = (bandit.wins / bandit.attempts) * 100;
            }
          } else {
            const bandit = state.banditStates.find(b => b.chain === best.chain);
            if (bandit) {
              bandit.attempts++;
              bandit.beta++;
              bandit.winRate = bandit.attempts > 0 ? (bandit.wins / bandit.attempts) * 100 : 50;
            }
          }
          
          state.stats.winRate = state.stats.tradesExecuted > 0
            ? (state.stats.tradesSuccessful / state.stats.tradesExecuted) * 100
            : 0;
        }
      }
    } else {
      console.log(`   📊 ${scanTime}ms | No profitable opportunities`);
    }
    
    // Actualizar balances cada 20 scans
    if (state.stats.totalScans % 20 === 0) {
      for (const chainState of state.chains) {
        try {
          const balance = await providers[chainState.chain].getBalance(WALLET_ADDRESS);
          const balanceEth = parseFloat(ethers.formatEther(balance));
          chainState.balance = balanceEth.toFixed(6);
          chainState.balanceUsd = balanceEth * CONFIG.ETH_PRICE_USD;
          chainState.isActive = balanceEth > 0.001;
        } catch (e) {}
      }
    }
    
  } catch (e) {
    console.error(`   ❌ Error: ${e.message}`);
  }
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
  
  state.isDryRun = req.body?.dryRun === true;
  state.isRunning = true;
  state.startTime = Date.now();
  
  state.stats = {
    totalScans: 0, opportunitiesFound: 0, tradesAttempted: 0,
    tradesExecuted: 0, tradesSuccessful: 0, totalProfitUsd: 0,
    totalGasUsd: 0, netProfitUsd: 0, winRate: 0, avgScanTimeMs: 0,
    scansPerSecond: 0, uptime: 0, currentChain: 'base',
    lastOpportunity: null, lastTrade: null
  };
  state.tradeLogs = [];
  state.opportunities = [];
  scanTimes = [];
  currentChainIndex = 0;
  
  if (timer) clearInterval(timer);
  timer = setInterval(tick, CONFIG.SCAN_INTERVAL_MS);
  
  console.log(`\n[START] 🔥 SCALPER iniciado - ${state.isDryRun ? 'DRY RUN' : '⚠️ MODO REAL'}`);
  
  res.json({
    success: true,
    isRunning: true,
    isDryRun: state.isDryRun,
    mode: 'SCALPER_OPTIMIZED',
    config: CONFIG
  });
});

app.post('/api/defi/multichain-arb/stop', (req, res) => {
  state.isRunning = false;
  if (timer) { clearInterval(timer); timer = null; }
  console.log('[STOP] Bot detenido');
  res.json({ success: true, isRunning: false });
});

app.get('/api/defi/multichain-arb/health', (req, res) => {
  res.json({
    status: 'ok',
    mode: 'SCALPER_OPTIMIZED',
    port: PORT,
    running: state.isRunning,
    dryRun: state.isDryRun,
    wallet: WALLET_ADDRESS,
    config: CONFIG
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// INICIAR
// ═══════════════════════════════════════════════════════════════════════════════

app.listen(PORT, async () => {
  console.log(`
╔═══════════════════════════════════════════════════════════════════════════════╗
║                                                                               ║
║   🔥 SCALPER OPTIMIZADO - BASE + ARBITRUM                                     ║
║                                                                               ║
║   ✅ Puerto: ${PORT}                                                           ║
║   ✅ Wallet: ${WALLET_ADDRESS.slice(0, 10)}...${WALLET_ADDRESS.slice(-5)}                                  ║
║                                                                               ║
║   ⚡ Intervalo: ${CONFIG.SCAN_INTERVAL_MS}ms | Min Profit: $${CONFIG.MIN_PROFIT_USD}                            ║
║   ⚡ Fee Tiers: ${CONFIG.FEE_TIERS.map(f => f/100 + '%').join(', ')}                                     ║
║   ⚡ Amounts: ${CONFIG.TRADE_AMOUNTS_ETH.join(', ')} ETH                                  ║
║                                                                               ║
╚═══════════════════════════════════════════════════════════════════════════════╝
  `);
  
  await init();
  console.log('[READY] 🔥 Scalper listo. POST /api/defi/multichain-arb/start para iniciar.\n');
});

process.on('SIGINT', () => {
  if (timer) clearInterval(timer);
  process.exit(0);
});


 * ═══════════════════════════════════════════════════════════════════════════════
 * 🔥 SCALPER OPTIMIZADO - BASE + ARBITRUM ONLY
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * Versión optimizada que:
 * - Solo usa Base y Arbitrum (RPCs premium)
 * - Reduce llamadas paralelas para evitar rate limits
 * - Escaneo secuencial por chain
 * - Ejecución inmediata cuando detecta oportunidad
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
// CONFIGURACIÓN OPTIMIZADA
// ═══════════════════════════════════════════════════════════════════════════════

const CONFIG = {
  SCAN_INTERVAL_MS: 500,
  MIN_PROFIT_USD: 0.01,
  MAX_SLIPPAGE_BPS: 50,
  TRADE_AMOUNTS_ETH: [0.005, 0.01, 0.02],
  FEE_TIERS: [500, 3000],  // Solo los más líquidos
  AUTO_EXECUTE: true,
  MAX_GAS_GWEI: 10,
  ETH_PRICE_USD: 3500
};

const PRIVATE_KEY = process.env.VITE_ETH_PRIVATE_KEY;
const WALLET_ADDRESS = process.env.VITE_ETH_WALLET_ADDRESS;

if (!PRIVATE_KEY || !WALLET_ADDRESS) {
  console.error('❌ ERROR: Credenciales no configuradas');
  process.exit(1);
}

// ═══════════════════════════════════════════════════════════════════════════════
// CHAINS (Solo Base y Arbitrum con RPCs premium)
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

const ROUTER_ABI = [
  'function exactInputSingle((address tokenIn, address tokenOut, uint24 fee, address recipient, uint256 amountIn, uint256 amountOutMinimum, uint160 sqrtPriceLimitX96)) external payable returns (uint256 amountOut)'
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
// ESTADO
// ═══════════════════════════════════════════════════════════════════════════════

let state = {
  isRunning: false,
  isDryRun: false,
  startTime: null,
  mode: 'SCALPER_OPTIMIZED',
  stats: {
    totalScans: 0,
    opportunitiesFound: 0,
    tradesAttempted: 0,
    tradesExecuted: 0,
    tradesSuccessful: 0,
    totalProfitUsd: 0,
    totalGasUsd: 0,
    netProfitUsd: 0,
    winRate: 0,
    avgScanTimeMs: 0,
    scansPerSecond: 0,
    uptime: 0,
    currentChain: 'base',
    lastOpportunity: null,
    lastTrade: null
  },
  chains: [],
  tradeLogs: [],
  opportunities: [],
  banditStates: []
};

let timer = null;
let providers = {};
let signers = {};
let contracts = {};
let isExecuting = false;
let currentChainIndex = 0;
let scanTimes = [];

// ═══════════════════════════════════════════════════════════════════════════════
// INICIALIZAR
// ═══════════════════════════════════════════════════════════════════════════════

async function init() {
  console.log('[INIT] 🔌 Conectando a chains...\n');
  
  for (const [key, chain] of Object.entries(CHAINS)) {
    try {
      providers[key] = new ethers.JsonRpcProvider(chain.rpc);
      signers[key] = new ethers.Wallet(PRIVATE_KEY, providers[key]);
      
      contracts[key] = {
        quoter: new ethers.Contract(chain.quoter, QUOTER_ABI, providers[key]),
        router: new ethers.Contract(chain.router, ROUTER_ABI, signers[key]),
        weth: new ethers.Contract(chain.tokens.WETH, WETH_ABI, signers[key])
      };
      
      const balance = await providers[key].getBalance(WALLET_ADDRESS);
      const balanceEth = parseFloat(ethers.formatEther(balance));
      
      state.chains.push({
        chain: key,
        name: chain.name,
        chainId: chain.chainId,
        balance: balanceEth.toFixed(6),
        balanceUsd: balanceEth * CONFIG.ETH_PRICE_USD,
        routes: CONFIG.FEE_TIERS.length * CONFIG.TRADE_AMOUNTS_ETH.length,
        isActive: balanceEth > 0.001,
        lastScan: Date.now(),
        scansCompleted: 0,
        opportunitiesFound: 0,
        tradesExecuted: 0,
        explorer: chain.explorer,
        ethPrice: 0
      });
      
      state.banditStates.push({
        chain: key,
        alpha: 2,
        beta: 2,
        winRate: 50,
        selected: key === 'base',
        attempts: 0,
        wins: 0
      });
      
      console.log(`   ✅ ${chain.name}: ${balanceEth.toFixed(6)} ETH ($${(balanceEth * CONFIG.ETH_PRICE_USD).toFixed(2)})`);
    } catch (e) {
      console.error(`   ❌ ${chain.name}: ${e.message}`);
    }
  }
  console.log('');
}

// ═══════════════════════════════════════════════════════════════════════════════
// ESCANEO SECUENCIAL (evita rate limits)
// ═══════════════════════════════════════════════════════════════════════════════

async function scanChain(chainKey) {
  const chain = CHAINS[chainKey];
  const provider = providers[chainKey];
  const quoter = contracts[chainKey].quoter;
  const opportunities = [];
  
  try {
    // 1. Obtener gas price
    const feeData = await provider.getFeeData();
    const gasPrice = feeData.gasPrice || ethers.parseUnits('0.001', 'gwei');
    const gasPriceGwei = parseFloat(ethers.formatUnits(gasPrice, 'gwei'));
    
    if (gasPriceGwei > CONFIG.MAX_GAS_GWEI) {
      console.log(`   ⛽ Gas muy alto en ${chain.name}: ${gasPriceGwei.toFixed(2)} gwei`);
      return [];
    }
    
    const gasCostWei = gasPrice * 250000n;
    const gasCostUsd = parseFloat(ethers.formatEther(gasCostWei)) * CONFIG.ETH_PRICE_USD;
    
    // 2. Obtener precio ETH
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
    } catch (e) {}
    
    // Actualizar estado
    const chainState = state.chains.find(c => c.chain === chainKey);
    if (chainState) chainState.ethPrice = ethPrice;
    
    // 3. Escanear rutas SECUENCIALMENTE (no paralelo)
    for (const amountEth of CONFIG.TRADE_AMOUNTS_ETH) {
      const amountWei = ethers.parseEther(amountEth.toString());
      
      for (let i = 0; i < CONFIG.FEE_TIERS.length; i++) {
        for (let j = 0; j < CONFIG.FEE_TIERS.length; j++) {
          if (i === j) continue;
          
          try {
            // WETH → USDC
            const quote1 = await quoter.quoteExactInputSingle.staticCall({
              tokenIn: chain.tokens.WETH,
              tokenOut: chain.tokens.USDC,
              amountIn: amountWei,
              fee: CONFIG.FEE_TIERS[i],
              sqrtPriceLimitX96: 0n
            });
            const usdcOut = quote1[0];
            
            // USDC → WETH
            const quote2 = await quoter.quoteExactInputSingle.staticCall({
              tokenIn: chain.tokens.USDC,
              tokenOut: chain.tokens.WETH,
              amountIn: usdcOut,
              fee: CONFIG.FEE_TIERS[j],
              sqrtPriceLimitX96: 0n
            });
            const wethOut = quote2[0];
            
            const grossProfit = wethOut - amountWei;
            const netProfit = grossProfit - gasCostWei;
            
            if (netProfit > 0n) {
              const netProfitUsd = parseFloat(ethers.formatEther(netProfit)) * ethPrice;
              const spreadBps = Number((grossProfit * 10000n) / amountWei);
              
              if (netProfitUsd >= CONFIG.MIN_PROFIT_USD) {
                opportunities.push({
                  chain: chainKey,
                  chainName: chain.name,
                  type: 'SCALP',
                  route: `${CONFIG.FEE_TIERS[i]/100}%→${CONFIG.FEE_TIERS[j]/100}%`,
                  amountIn: amountWei,
                  amountInEth: amountEth,
                  fee1: CONFIG.FEE_TIERS[i],
                  fee2: CONFIG.FEE_TIERS[j],
                  usdcIntermediate: usdcOut,
                  wethOut,
                  grossProfit,
                  netProfit,
                  netProfitUsd,
                  gasCostUsd,
                  spreadBps,
                  ethPrice,
                  timestamp: Date.now(),
                  gasPrice: gasPriceGwei
                });
                
                console.log(`   💰 OPP: ${chain.name} ${amountEth}ETH ${CONFIG.FEE_TIERS[i]/100}%→${CONFIG.FEE_TIERS[j]/100}% = $${netProfitUsd.toFixed(4)}`);
              }
            }
          } catch (e) {
            // Pool no existe
          }
        }
      }
    }
    
  } catch (e) {
    console.error(`   ❌ Error ${chain.name}: ${e.message.slice(0, 50)}`);
  }
  
  return opportunities;
}

// ═══════════════════════════════════════════════════════════════════════════════
// EJECUCIÓN
// ═══════════════════════════════════════════════════════════════════════════════

async function execute(opp) {
  if (isExecuting) return null;
  isExecuting = true;
  
  const chain = CHAINS[opp.chain];
  const signer = signers[opp.chain];
  const provider = providers[opp.chain];
  const { router, weth } = contracts[opp.chain];
  
  console.log(`\n🔥 ═══════════════════════════════════════════════════════════════`);
  console.log(`   EJECUTANDO en ${chain.name}`);
  console.log(`   Route: ${opp.route}`);
  console.log(`   Amount: ${opp.amountInEth} ETH`);
  console.log(`   Expected: $${opp.netProfitUsd.toFixed(4)}`);
  
  try {
    // Verificar balance
    const balance = await provider.getBalance(WALLET_ADDRESS);
    if (balance < opp.amountIn + ethers.parseEther('0.002')) {
      console.log(`   ❌ Balance insuficiente`);
      isExecuting = false;
      return { success: false, error: 'Balance insuficiente' };
    }
    
    // 1. Wrap ETH
    console.log(`   📦 Wrapping...`);
    const wrapTx = await weth.deposit({ value: opp.amountIn, gasLimit: 50000 });
    await wrapTx.wait(1);
    
    // 2. Approve WETH
    const allowance = await weth.allowance(WALLET_ADDRESS, chain.router);
    if (allowance < opp.amountIn) {
      const approveTx = await weth.approve(chain.router, ethers.MaxUint256, { gasLimit: 50000 });
      await approveTx.wait(1);
    }
    
    // 3. SWAP 1: WETH → USDC
    console.log(`   🔄 ENTRADA: WETH → USDC...`);
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
    console.log(`   ✅ ENTRADA: ${receipt1.hash.slice(0, 20)}...`);
    
    // 4. Obtener balance USDC
    const usdc = new ethers.Contract(chain.tokens.USDC, ERC20_ABI, signer);
    const usdcBalance = await usdc.balanceOf(WALLET_ADDRESS);
    
    // 5. Approve USDC
    const usdcAllowance = await usdc.allowance(WALLET_ADDRESS, chain.router);
    if (usdcAllowance < usdcBalance) {
      const approveUsdcTx = await usdc.approve(chain.router, ethers.MaxUint256, { gasLimit: 50000 });
      await approveUsdcTx.wait(1);
    }
    
    // 6. SWAP 2: USDC → WETH
    console.log(`   🔄 SALIDA: USDC → WETH...`);
    const minWeth = (opp.wethOut * BigInt(10000 - CONFIG.MAX_SLIPPAGE_BPS)) / 10000n;
    
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
    console.log(`   ✅ SALIDA: ${receipt2.hash.slice(0, 20)}...`);
    
    // 7. Calcular profit
    const finalWeth = await weth.balanceOf(WALLET_ADDRESS);
    const actualProfit = finalWeth - opp.amountIn;
    const actualProfitUsd = parseFloat(ethers.formatEther(actualProfit)) * opp.ethPrice;
    
    const gas1 = receipt1.gasUsed * receipt1.gasPrice;
    const gas2 = receipt2.gasUsed * receipt2.gasPrice;
    const totalGasUsd = parseFloat(ethers.formatEther(gas1 + gas2)) * opp.ethPrice;
    
    const netProfitUsd = actualProfitUsd - totalGasUsd;
    
    console.log(`   ═══════════════════════════════════════════════════════════════`);
    console.log(`   💰 PROFIT: $${actualProfitUsd.toFixed(4)}`);
    console.log(`   ⛽ GAS: $${totalGasUsd.toFixed(4)}`);
    console.log(`   💵 NETO: $${netProfitUsd.toFixed(4)}`);
    console.log(`   🔗 ${chain.explorer}/tx/${receipt2.hash}`);
    
    isExecuting = false;
    return {
      success: true,
      profitUsd: actualProfitUsd,
      gasUsd: totalGasUsd,
      netProfitUsd,
      txHash: receipt2.hash
    };
    
  } catch (e) {
    console.log(`   ❌ Error: ${e.message}`);
    isExecuting = false;
    return { success: false, error: e.message };
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// LOOP PRINCIPAL
// ═══════════════════════════════════════════════════════════════════════════════

async function tick() {
  if (!state.isRunning || isExecuting) return;
  
  const tickStart = Date.now();
  state.stats.totalScans++;
  state.stats.uptime = Math.floor((Date.now() - state.startTime) / 1000);
  
  // Alternar entre chains
  const chainKeys = Object.keys(CHAINS);
  const selectedChain = chainKeys[currentChainIndex % chainKeys.length];
  currentChainIndex++;
  
  state.stats.currentChain = selectedChain;
  state.banditStates.forEach(b => b.selected = b.chain === selectedChain);
  
  console.log(`\n[SCAN #${state.stats.totalScans}] ${CHAINS[selectedChain].name}`);
  
  try {
    const opportunities = await scanChain(selectedChain);
    const scanTime = Date.now() - tickStart;
    
    scanTimes.push(scanTime);
    if (scanTimes.length > 20) scanTimes.shift();
    state.stats.avgScanTimeMs = Math.round(scanTimes.reduce((a, b) => a + b, 0) / scanTimes.length);
    state.stats.scansPerSecond = Math.round(1000 / state.stats.avgScanTimeMs * 10) / 10;
    
    if (opportunities.length > 0) {
      state.stats.opportunitiesFound += opportunities.length;
      opportunities.sort((a, b) => b.netProfitUsd - a.netProfitUsd);
      
      state.opportunities = [...opportunities.slice(0, 5), ...state.opportunities].slice(0, 30);
      state.stats.lastOpportunity = opportunities[0];
      
      const best = opportunities[0];
      console.log(`   📊 ${scanTime}ms | ${opportunities.length} opps | Best: $${best.netProfitUsd.toFixed(4)}`);
      
      // EJECUTAR
      if (!state.isDryRun && CONFIG.AUTO_EXECUTE) {
        state.stats.tradesAttempted++;
        
        const result = await execute(best);
        
        if (result) {
          state.stats.tradesExecuted++;
          
          const tradeLog = {
            id: `tx-${Date.now()}`,
            timestamp: Date.now(),
            chain: best.chain,
            chainName: best.chainName,
            route: best.route,
            amountIn: best.amountInEth,
            spreadBps: best.spreadBps,
            expectedProfit: best.netProfitUsd.toFixed(4),
            actualProfit: result.success ? result.profitUsd.toFixed(4) : '0',
            gasCost: result.success ? result.gasUsd.toFixed(4) : '0',
            netProfit: result.success ? result.netProfitUsd.toFixed(4) : '0',
            txHash: result.txHash || '',
            status: result.success ? 'success' : 'failed',
            error: result.error || ''
          };
          
          state.tradeLogs.unshift(tradeLog);
          if (state.tradeLogs.length > 50) state.tradeLogs.pop();
          
          if (result.success) {
            state.stats.tradesSuccessful++;
            state.stats.totalProfitUsd += result.profitUsd;
            state.stats.totalGasUsd += result.gasUsd;
            state.stats.netProfitUsd = state.stats.totalProfitUsd - state.stats.totalGasUsd;
            state.stats.lastTrade = tradeLog;
            
            const bandit = state.banditStates.find(b => b.chain === best.chain);
            if (bandit) {
              bandit.wins++;
              bandit.attempts++;
              bandit.alpha++;
              bandit.winRate = (bandit.wins / bandit.attempts) * 100;
            }
          } else {
            const bandit = state.banditStates.find(b => b.chain === best.chain);
            if (bandit) {
              bandit.attempts++;
              bandit.beta++;
              bandit.winRate = bandit.attempts > 0 ? (bandit.wins / bandit.attempts) * 100 : 50;
            }
          }
          
          state.stats.winRate = state.stats.tradesExecuted > 0
            ? (state.stats.tradesSuccessful / state.stats.tradesExecuted) * 100
            : 0;
        }
      }
    } else {
      console.log(`   📊 ${scanTime}ms | No profitable opportunities`);
    }
    
    // Actualizar balances cada 20 scans
    if (state.stats.totalScans % 20 === 0) {
      for (const chainState of state.chains) {
        try {
          const balance = await providers[chainState.chain].getBalance(WALLET_ADDRESS);
          const balanceEth = parseFloat(ethers.formatEther(balance));
          chainState.balance = balanceEth.toFixed(6);
          chainState.balanceUsd = balanceEth * CONFIG.ETH_PRICE_USD;
          chainState.isActive = balanceEth > 0.001;
        } catch (e) {}
      }
    }
    
  } catch (e) {
    console.error(`   ❌ Error: ${e.message}`);
  }
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
  
  state.isDryRun = req.body?.dryRun === true;
  state.isRunning = true;
  state.startTime = Date.now();
  
  state.stats = {
    totalScans: 0, opportunitiesFound: 0, tradesAttempted: 0,
    tradesExecuted: 0, tradesSuccessful: 0, totalProfitUsd: 0,
    totalGasUsd: 0, netProfitUsd: 0, winRate: 0, avgScanTimeMs: 0,
    scansPerSecond: 0, uptime: 0, currentChain: 'base',
    lastOpportunity: null, lastTrade: null
  };
  state.tradeLogs = [];
  state.opportunities = [];
  scanTimes = [];
  currentChainIndex = 0;
  
  if (timer) clearInterval(timer);
  timer = setInterval(tick, CONFIG.SCAN_INTERVAL_MS);
  
  console.log(`\n[START] 🔥 SCALPER iniciado - ${state.isDryRun ? 'DRY RUN' : '⚠️ MODO REAL'}`);
  
  res.json({
    success: true,
    isRunning: true,
    isDryRun: state.isDryRun,
    mode: 'SCALPER_OPTIMIZED',
    config: CONFIG
  });
});

app.post('/api/defi/multichain-arb/stop', (req, res) => {
  state.isRunning = false;
  if (timer) { clearInterval(timer); timer = null; }
  console.log('[STOP] Bot detenido');
  res.json({ success: true, isRunning: false });
});

app.get('/api/defi/multichain-arb/health', (req, res) => {
  res.json({
    status: 'ok',
    mode: 'SCALPER_OPTIMIZED',
    port: PORT,
    running: state.isRunning,
    dryRun: state.isDryRun,
    wallet: WALLET_ADDRESS,
    config: CONFIG
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// INICIAR
// ═══════════════════════════════════════════════════════════════════════════════

app.listen(PORT, async () => {
  console.log(`
╔═══════════════════════════════════════════════════════════════════════════════╗
║                                                                               ║
║   🔥 SCALPER OPTIMIZADO - BASE + ARBITRUM                                     ║
║                                                                               ║
║   ✅ Puerto: ${PORT}                                                           ║
║   ✅ Wallet: ${WALLET_ADDRESS.slice(0, 10)}...${WALLET_ADDRESS.slice(-5)}                                  ║
║                                                                               ║
║   ⚡ Intervalo: ${CONFIG.SCAN_INTERVAL_MS}ms | Min Profit: $${CONFIG.MIN_PROFIT_USD}                            ║
║   ⚡ Fee Tiers: ${CONFIG.FEE_TIERS.map(f => f/100 + '%').join(', ')}                                     ║
║   ⚡ Amounts: ${CONFIG.TRADE_AMOUNTS_ETH.join(', ')} ETH                                  ║
║                                                                               ║
╚═══════════════════════════════════════════════════════════════════════════════╝
  `);
  
  await init();
  console.log('[READY] 🔥 Scalper listo. POST /api/defi/multichain-arb/start para iniciar.\n');
});

process.on('SIGINT', () => {
  if (timer) clearInterval(timer);
  process.exit(0);
});



 * ═══════════════════════════════════════════════════════════════════════════════
 * 🔥 SCALPER OPTIMIZADO - BASE + ARBITRUM ONLY
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * Versión optimizada que:
 * - Solo usa Base y Arbitrum (RPCs premium)
 * - Reduce llamadas paralelas para evitar rate limits
 * - Escaneo secuencial por chain
 * - Ejecución inmediata cuando detecta oportunidad
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
// CONFIGURACIÓN OPTIMIZADA
// ═══════════════════════════════════════════════════════════════════════════════

const CONFIG = {
  SCAN_INTERVAL_MS: 500,
  MIN_PROFIT_USD: 0.01,
  MAX_SLIPPAGE_BPS: 50,
  TRADE_AMOUNTS_ETH: [0.005, 0.01, 0.02],
  FEE_TIERS: [500, 3000],  // Solo los más líquidos
  AUTO_EXECUTE: true,
  MAX_GAS_GWEI: 10,
  ETH_PRICE_USD: 3500
};

const PRIVATE_KEY = process.env.VITE_ETH_PRIVATE_KEY;
const WALLET_ADDRESS = process.env.VITE_ETH_WALLET_ADDRESS;

if (!PRIVATE_KEY || !WALLET_ADDRESS) {
  console.error('❌ ERROR: Credenciales no configuradas');
  process.exit(1);
}

// ═══════════════════════════════════════════════════════════════════════════════
// CHAINS (Solo Base y Arbitrum con RPCs premium)
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

const ROUTER_ABI = [
  'function exactInputSingle((address tokenIn, address tokenOut, uint24 fee, address recipient, uint256 amountIn, uint256 amountOutMinimum, uint160 sqrtPriceLimitX96)) external payable returns (uint256 amountOut)'
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
// ESTADO
// ═══════════════════════════════════════════════════════════════════════════════

let state = {
  isRunning: false,
  isDryRun: false,
  startTime: null,
  mode: 'SCALPER_OPTIMIZED',
  stats: {
    totalScans: 0,
    opportunitiesFound: 0,
    tradesAttempted: 0,
    tradesExecuted: 0,
    tradesSuccessful: 0,
    totalProfitUsd: 0,
    totalGasUsd: 0,
    netProfitUsd: 0,
    winRate: 0,
    avgScanTimeMs: 0,
    scansPerSecond: 0,
    uptime: 0,
    currentChain: 'base',
    lastOpportunity: null,
    lastTrade: null
  },
  chains: [],
  tradeLogs: [],
  opportunities: [],
  banditStates: []
};

let timer = null;
let providers = {};
let signers = {};
let contracts = {};
let isExecuting = false;
let currentChainIndex = 0;
let scanTimes = [];

// ═══════════════════════════════════════════════════════════════════════════════
// INICIALIZAR
// ═══════════════════════════════════════════════════════════════════════════════

async function init() {
  console.log('[INIT] 🔌 Conectando a chains...\n');
  
  for (const [key, chain] of Object.entries(CHAINS)) {
    try {
      providers[key] = new ethers.JsonRpcProvider(chain.rpc);
      signers[key] = new ethers.Wallet(PRIVATE_KEY, providers[key]);
      
      contracts[key] = {
        quoter: new ethers.Contract(chain.quoter, QUOTER_ABI, providers[key]),
        router: new ethers.Contract(chain.router, ROUTER_ABI, signers[key]),
        weth: new ethers.Contract(chain.tokens.WETH, WETH_ABI, signers[key])
      };
      
      const balance = await providers[key].getBalance(WALLET_ADDRESS);
      const balanceEth = parseFloat(ethers.formatEther(balance));
      
      state.chains.push({
        chain: key,
        name: chain.name,
        chainId: chain.chainId,
        balance: balanceEth.toFixed(6),
        balanceUsd: balanceEth * CONFIG.ETH_PRICE_USD,
        routes: CONFIG.FEE_TIERS.length * CONFIG.TRADE_AMOUNTS_ETH.length,
        isActive: balanceEth > 0.001,
        lastScan: Date.now(),
        scansCompleted: 0,
        opportunitiesFound: 0,
        tradesExecuted: 0,
        explorer: chain.explorer,
        ethPrice: 0
      });
      
      state.banditStates.push({
        chain: key,
        alpha: 2,
        beta: 2,
        winRate: 50,
        selected: key === 'base',
        attempts: 0,
        wins: 0
      });
      
      console.log(`   ✅ ${chain.name}: ${balanceEth.toFixed(6)} ETH ($${(balanceEth * CONFIG.ETH_PRICE_USD).toFixed(2)})`);
    } catch (e) {
      console.error(`   ❌ ${chain.name}: ${e.message}`);
    }
  }
  console.log('');
}

// ═══════════════════════════════════════════════════════════════════════════════
// ESCANEO SECUENCIAL (evita rate limits)
// ═══════════════════════════════════════════════════════════════════════════════

async function scanChain(chainKey) {
  const chain = CHAINS[chainKey];
  const provider = providers[chainKey];
  const quoter = contracts[chainKey].quoter;
  const opportunities = [];
  
  try {
    // 1. Obtener gas price
    const feeData = await provider.getFeeData();
    const gasPrice = feeData.gasPrice || ethers.parseUnits('0.001', 'gwei');
    const gasPriceGwei = parseFloat(ethers.formatUnits(gasPrice, 'gwei'));
    
    if (gasPriceGwei > CONFIG.MAX_GAS_GWEI) {
      console.log(`   ⛽ Gas muy alto en ${chain.name}: ${gasPriceGwei.toFixed(2)} gwei`);
      return [];
    }
    
    const gasCostWei = gasPrice * 250000n;
    const gasCostUsd = parseFloat(ethers.formatEther(gasCostWei)) * CONFIG.ETH_PRICE_USD;
    
    // 2. Obtener precio ETH
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
    } catch (e) {}
    
    // Actualizar estado
    const chainState = state.chains.find(c => c.chain === chainKey);
    if (chainState) chainState.ethPrice = ethPrice;
    
    // 3. Escanear rutas SECUENCIALMENTE (no paralelo)
    for (const amountEth of CONFIG.TRADE_AMOUNTS_ETH) {
      const amountWei = ethers.parseEther(amountEth.toString());
      
      for (let i = 0; i < CONFIG.FEE_TIERS.length; i++) {
        for (let j = 0; j < CONFIG.FEE_TIERS.length; j++) {
          if (i === j) continue;
          
          try {
            // WETH → USDC
            const quote1 = await quoter.quoteExactInputSingle.staticCall({
              tokenIn: chain.tokens.WETH,
              tokenOut: chain.tokens.USDC,
              amountIn: amountWei,
              fee: CONFIG.FEE_TIERS[i],
              sqrtPriceLimitX96: 0n
            });
            const usdcOut = quote1[0];
            
            // USDC → WETH
            const quote2 = await quoter.quoteExactInputSingle.staticCall({
              tokenIn: chain.tokens.USDC,
              tokenOut: chain.tokens.WETH,
              amountIn: usdcOut,
              fee: CONFIG.FEE_TIERS[j],
              sqrtPriceLimitX96: 0n
            });
            const wethOut = quote2[0];
            
            const grossProfit = wethOut - amountWei;
            const netProfit = grossProfit - gasCostWei;
            
            if (netProfit > 0n) {
              const netProfitUsd = parseFloat(ethers.formatEther(netProfit)) * ethPrice;
              const spreadBps = Number((grossProfit * 10000n) / amountWei);
              
              if (netProfitUsd >= CONFIG.MIN_PROFIT_USD) {
                opportunities.push({
                  chain: chainKey,
                  chainName: chain.name,
                  type: 'SCALP',
                  route: `${CONFIG.FEE_TIERS[i]/100}%→${CONFIG.FEE_TIERS[j]/100}%`,
                  amountIn: amountWei,
                  amountInEth: amountEth,
                  fee1: CONFIG.FEE_TIERS[i],
                  fee2: CONFIG.FEE_TIERS[j],
                  usdcIntermediate: usdcOut,
                  wethOut,
                  grossProfit,
                  netProfit,
                  netProfitUsd,
                  gasCostUsd,
                  spreadBps,
                  ethPrice,
                  timestamp: Date.now(),
                  gasPrice: gasPriceGwei
                });
                
                console.log(`   💰 OPP: ${chain.name} ${amountEth}ETH ${CONFIG.FEE_TIERS[i]/100}%→${CONFIG.FEE_TIERS[j]/100}% = $${netProfitUsd.toFixed(4)}`);
              }
            }
          } catch (e) {
            // Pool no existe
          }
        }
      }
    }
    
  } catch (e) {
    console.error(`   ❌ Error ${chain.name}: ${e.message.slice(0, 50)}`);
  }
  
  return opportunities;
}

// ═══════════════════════════════════════════════════════════════════════════════
// EJECUCIÓN
// ═══════════════════════════════════════════════════════════════════════════════

async function execute(opp) {
  if (isExecuting) return null;
  isExecuting = true;
  
  const chain = CHAINS[opp.chain];
  const signer = signers[opp.chain];
  const provider = providers[opp.chain];
  const { router, weth } = contracts[opp.chain];
  
  console.log(`\n🔥 ═══════════════════════════════════════════════════════════════`);
  console.log(`   EJECUTANDO en ${chain.name}`);
  console.log(`   Route: ${opp.route}`);
  console.log(`   Amount: ${opp.amountInEth} ETH`);
  console.log(`   Expected: $${opp.netProfitUsd.toFixed(4)}`);
  
  try {
    // Verificar balance
    const balance = await provider.getBalance(WALLET_ADDRESS);
    if (balance < opp.amountIn + ethers.parseEther('0.002')) {
      console.log(`   ❌ Balance insuficiente`);
      isExecuting = false;
      return { success: false, error: 'Balance insuficiente' };
    }
    
    // 1. Wrap ETH
    console.log(`   📦 Wrapping...`);
    const wrapTx = await weth.deposit({ value: opp.amountIn, gasLimit: 50000 });
    await wrapTx.wait(1);
    
    // 2. Approve WETH
    const allowance = await weth.allowance(WALLET_ADDRESS, chain.router);
    if (allowance < opp.amountIn) {
      const approveTx = await weth.approve(chain.router, ethers.MaxUint256, { gasLimit: 50000 });
      await approveTx.wait(1);
    }
    
    // 3. SWAP 1: WETH → USDC
    console.log(`   🔄 ENTRADA: WETH → USDC...`);
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
    console.log(`   ✅ ENTRADA: ${receipt1.hash.slice(0, 20)}...`);
    
    // 4. Obtener balance USDC
    const usdc = new ethers.Contract(chain.tokens.USDC, ERC20_ABI, signer);
    const usdcBalance = await usdc.balanceOf(WALLET_ADDRESS);
    
    // 5. Approve USDC
    const usdcAllowance = await usdc.allowance(WALLET_ADDRESS, chain.router);
    if (usdcAllowance < usdcBalance) {
      const approveUsdcTx = await usdc.approve(chain.router, ethers.MaxUint256, { gasLimit: 50000 });
      await approveUsdcTx.wait(1);
    }
    
    // 6. SWAP 2: USDC → WETH
    console.log(`   🔄 SALIDA: USDC → WETH...`);
    const minWeth = (opp.wethOut * BigInt(10000 - CONFIG.MAX_SLIPPAGE_BPS)) / 10000n;
    
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
    console.log(`   ✅ SALIDA: ${receipt2.hash.slice(0, 20)}...`);
    
    // 7. Calcular profit
    const finalWeth = await weth.balanceOf(WALLET_ADDRESS);
    const actualProfit = finalWeth - opp.amountIn;
    const actualProfitUsd = parseFloat(ethers.formatEther(actualProfit)) * opp.ethPrice;
    
    const gas1 = receipt1.gasUsed * receipt1.gasPrice;
    const gas2 = receipt2.gasUsed * receipt2.gasPrice;
    const totalGasUsd = parseFloat(ethers.formatEther(gas1 + gas2)) * opp.ethPrice;
    
    const netProfitUsd = actualProfitUsd - totalGasUsd;
    
    console.log(`   ═══════════════════════════════════════════════════════════════`);
    console.log(`   💰 PROFIT: $${actualProfitUsd.toFixed(4)}`);
    console.log(`   ⛽ GAS: $${totalGasUsd.toFixed(4)}`);
    console.log(`   💵 NETO: $${netProfitUsd.toFixed(4)}`);
    console.log(`   🔗 ${chain.explorer}/tx/${receipt2.hash}`);
    
    isExecuting = false;
    return {
      success: true,
      profitUsd: actualProfitUsd,
      gasUsd: totalGasUsd,
      netProfitUsd,
      txHash: receipt2.hash
    };
    
  } catch (e) {
    console.log(`   ❌ Error: ${e.message}`);
    isExecuting = false;
    return { success: false, error: e.message };
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// LOOP PRINCIPAL
// ═══════════════════════════════════════════════════════════════════════════════

async function tick() {
  if (!state.isRunning || isExecuting) return;
  
  const tickStart = Date.now();
  state.stats.totalScans++;
  state.stats.uptime = Math.floor((Date.now() - state.startTime) / 1000);
  
  // Alternar entre chains
  const chainKeys = Object.keys(CHAINS);
  const selectedChain = chainKeys[currentChainIndex % chainKeys.length];
  currentChainIndex++;
  
  state.stats.currentChain = selectedChain;
  state.banditStates.forEach(b => b.selected = b.chain === selectedChain);
  
  console.log(`\n[SCAN #${state.stats.totalScans}] ${CHAINS[selectedChain].name}`);
  
  try {
    const opportunities = await scanChain(selectedChain);
    const scanTime = Date.now() - tickStart;
    
    scanTimes.push(scanTime);
    if (scanTimes.length > 20) scanTimes.shift();
    state.stats.avgScanTimeMs = Math.round(scanTimes.reduce((a, b) => a + b, 0) / scanTimes.length);
    state.stats.scansPerSecond = Math.round(1000 / state.stats.avgScanTimeMs * 10) / 10;
    
    if (opportunities.length > 0) {
      state.stats.opportunitiesFound += opportunities.length;
      opportunities.sort((a, b) => b.netProfitUsd - a.netProfitUsd);
      
      state.opportunities = [...opportunities.slice(0, 5), ...state.opportunities].slice(0, 30);
      state.stats.lastOpportunity = opportunities[0];
      
      const best = opportunities[0];
      console.log(`   📊 ${scanTime}ms | ${opportunities.length} opps | Best: $${best.netProfitUsd.toFixed(4)}`);
      
      // EJECUTAR
      if (!state.isDryRun && CONFIG.AUTO_EXECUTE) {
        state.stats.tradesAttempted++;
        
        const result = await execute(best);
        
        if (result) {
          state.stats.tradesExecuted++;
          
          const tradeLog = {
            id: `tx-${Date.now()}`,
            timestamp: Date.now(),
            chain: best.chain,
            chainName: best.chainName,
            route: best.route,
            amountIn: best.amountInEth,
            spreadBps: best.spreadBps,
            expectedProfit: best.netProfitUsd.toFixed(4),
            actualProfit: result.success ? result.profitUsd.toFixed(4) : '0',
            gasCost: result.success ? result.gasUsd.toFixed(4) : '0',
            netProfit: result.success ? result.netProfitUsd.toFixed(4) : '0',
            txHash: result.txHash || '',
            status: result.success ? 'success' : 'failed',
            error: result.error || ''
          };
          
          state.tradeLogs.unshift(tradeLog);
          if (state.tradeLogs.length > 50) state.tradeLogs.pop();
          
          if (result.success) {
            state.stats.tradesSuccessful++;
            state.stats.totalProfitUsd += result.profitUsd;
            state.stats.totalGasUsd += result.gasUsd;
            state.stats.netProfitUsd = state.stats.totalProfitUsd - state.stats.totalGasUsd;
            state.stats.lastTrade = tradeLog;
            
            const bandit = state.banditStates.find(b => b.chain === best.chain);
            if (bandit) {
              bandit.wins++;
              bandit.attempts++;
              bandit.alpha++;
              bandit.winRate = (bandit.wins / bandit.attempts) * 100;
            }
          } else {
            const bandit = state.banditStates.find(b => b.chain === best.chain);
            if (bandit) {
              bandit.attempts++;
              bandit.beta++;
              bandit.winRate = bandit.attempts > 0 ? (bandit.wins / bandit.attempts) * 100 : 50;
            }
          }
          
          state.stats.winRate = state.stats.tradesExecuted > 0
            ? (state.stats.tradesSuccessful / state.stats.tradesExecuted) * 100
            : 0;
        }
      }
    } else {
      console.log(`   📊 ${scanTime}ms | No profitable opportunities`);
    }
    
    // Actualizar balances cada 20 scans
    if (state.stats.totalScans % 20 === 0) {
      for (const chainState of state.chains) {
        try {
          const balance = await providers[chainState.chain].getBalance(WALLET_ADDRESS);
          const balanceEth = parseFloat(ethers.formatEther(balance));
          chainState.balance = balanceEth.toFixed(6);
          chainState.balanceUsd = balanceEth * CONFIG.ETH_PRICE_USD;
          chainState.isActive = balanceEth > 0.001;
        } catch (e) {}
      }
    }
    
  } catch (e) {
    console.error(`   ❌ Error: ${e.message}`);
  }
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
  
  state.isDryRun = req.body?.dryRun === true;
  state.isRunning = true;
  state.startTime = Date.now();
  
  state.stats = {
    totalScans: 0, opportunitiesFound: 0, tradesAttempted: 0,
    tradesExecuted: 0, tradesSuccessful: 0, totalProfitUsd: 0,
    totalGasUsd: 0, netProfitUsd: 0, winRate: 0, avgScanTimeMs: 0,
    scansPerSecond: 0, uptime: 0, currentChain: 'base',
    lastOpportunity: null, lastTrade: null
  };
  state.tradeLogs = [];
  state.opportunities = [];
  scanTimes = [];
  currentChainIndex = 0;
  
  if (timer) clearInterval(timer);
  timer = setInterval(tick, CONFIG.SCAN_INTERVAL_MS);
  
  console.log(`\n[START] 🔥 SCALPER iniciado - ${state.isDryRun ? 'DRY RUN' : '⚠️ MODO REAL'}`);
  
  res.json({
    success: true,
    isRunning: true,
    isDryRun: state.isDryRun,
    mode: 'SCALPER_OPTIMIZED',
    config: CONFIG
  });
});

app.post('/api/defi/multichain-arb/stop', (req, res) => {
  state.isRunning = false;
  if (timer) { clearInterval(timer); timer = null; }
  console.log('[STOP] Bot detenido');
  res.json({ success: true, isRunning: false });
});

app.get('/api/defi/multichain-arb/health', (req, res) => {
  res.json({
    status: 'ok',
    mode: 'SCALPER_OPTIMIZED',
    port: PORT,
    running: state.isRunning,
    dryRun: state.isDryRun,
    wallet: WALLET_ADDRESS,
    config: CONFIG
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// INICIAR
// ═══════════════════════════════════════════════════════════════════════════════

app.listen(PORT, async () => {
  console.log(`
╔═══════════════════════════════════════════════════════════════════════════════╗
║                                                                               ║
║   🔥 SCALPER OPTIMIZADO - BASE + ARBITRUM                                     ║
║                                                                               ║
║   ✅ Puerto: ${PORT}                                                           ║
║   ✅ Wallet: ${WALLET_ADDRESS.slice(0, 10)}...${WALLET_ADDRESS.slice(-5)}                                  ║
║                                                                               ║
║   ⚡ Intervalo: ${CONFIG.SCAN_INTERVAL_MS}ms | Min Profit: $${CONFIG.MIN_PROFIT_USD}                            ║
║   ⚡ Fee Tiers: ${CONFIG.FEE_TIERS.map(f => f/100 + '%').join(', ')}                                     ║
║   ⚡ Amounts: ${CONFIG.TRADE_AMOUNTS_ETH.join(', ')} ETH                                  ║
║                                                                               ║
╚═══════════════════════════════════════════════════════════════════════════════╝
  `);
  
  await init();
  console.log('[READY] 🔥 Scalper listo. POST /api/defi/multichain-arb/start para iniciar.\n');
});

process.on('SIGINT', () => {
  if (timer) clearInterval(timer);
  process.exit(0);
});


 * ═══════════════════════════════════════════════════════════════════════════════
 * 🔥 SCALPER OPTIMIZADO - BASE + ARBITRUM ONLY
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * Versión optimizada que:
 * - Solo usa Base y Arbitrum (RPCs premium)
 * - Reduce llamadas paralelas para evitar rate limits
 * - Escaneo secuencial por chain
 * - Ejecución inmediata cuando detecta oportunidad
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
// CONFIGURACIÓN OPTIMIZADA
// ═══════════════════════════════════════════════════════════════════════════════

const CONFIG = {
  SCAN_INTERVAL_MS: 500,
  MIN_PROFIT_USD: 0.01,
  MAX_SLIPPAGE_BPS: 50,
  TRADE_AMOUNTS_ETH: [0.005, 0.01, 0.02],
  FEE_TIERS: [500, 3000],  // Solo los más líquidos
  AUTO_EXECUTE: true,
  MAX_GAS_GWEI: 10,
  ETH_PRICE_USD: 3500
};

const PRIVATE_KEY = process.env.VITE_ETH_PRIVATE_KEY;
const WALLET_ADDRESS = process.env.VITE_ETH_WALLET_ADDRESS;

if (!PRIVATE_KEY || !WALLET_ADDRESS) {
  console.error('❌ ERROR: Credenciales no configuradas');
  process.exit(1);
}

// ═══════════════════════════════════════════════════════════════════════════════
// CHAINS (Solo Base y Arbitrum con RPCs premium)
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

const ROUTER_ABI = [
  'function exactInputSingle((address tokenIn, address tokenOut, uint24 fee, address recipient, uint256 amountIn, uint256 amountOutMinimum, uint160 sqrtPriceLimitX96)) external payable returns (uint256 amountOut)'
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
// ESTADO
// ═══════════════════════════════════════════════════════════════════════════════

let state = {
  isRunning: false,
  isDryRun: false,
  startTime: null,
  mode: 'SCALPER_OPTIMIZED',
  stats: {
    totalScans: 0,
    opportunitiesFound: 0,
    tradesAttempted: 0,
    tradesExecuted: 0,
    tradesSuccessful: 0,
    totalProfitUsd: 0,
    totalGasUsd: 0,
    netProfitUsd: 0,
    winRate: 0,
    avgScanTimeMs: 0,
    scansPerSecond: 0,
    uptime: 0,
    currentChain: 'base',
    lastOpportunity: null,
    lastTrade: null
  },
  chains: [],
  tradeLogs: [],
  opportunities: [],
  banditStates: []
};

let timer = null;
let providers = {};
let signers = {};
let contracts = {};
let isExecuting = false;
let currentChainIndex = 0;
let scanTimes = [];

// ═══════════════════════════════════════════════════════════════════════════════
// INICIALIZAR
// ═══════════════════════════════════════════════════════════════════════════════

async function init() {
  console.log('[INIT] 🔌 Conectando a chains...\n');
  
  for (const [key, chain] of Object.entries(CHAINS)) {
    try {
      providers[key] = new ethers.JsonRpcProvider(chain.rpc);
      signers[key] = new ethers.Wallet(PRIVATE_KEY, providers[key]);
      
      contracts[key] = {
        quoter: new ethers.Contract(chain.quoter, QUOTER_ABI, providers[key]),
        router: new ethers.Contract(chain.router, ROUTER_ABI, signers[key]),
        weth: new ethers.Contract(chain.tokens.WETH, WETH_ABI, signers[key])
      };
      
      const balance = await providers[key].getBalance(WALLET_ADDRESS);
      const balanceEth = parseFloat(ethers.formatEther(balance));
      
      state.chains.push({
        chain: key,
        name: chain.name,
        chainId: chain.chainId,
        balance: balanceEth.toFixed(6),
        balanceUsd: balanceEth * CONFIG.ETH_PRICE_USD,
        routes: CONFIG.FEE_TIERS.length * CONFIG.TRADE_AMOUNTS_ETH.length,
        isActive: balanceEth > 0.001,
        lastScan: Date.now(),
        scansCompleted: 0,
        opportunitiesFound: 0,
        tradesExecuted: 0,
        explorer: chain.explorer,
        ethPrice: 0
      });
      
      state.banditStates.push({
        chain: key,
        alpha: 2,
        beta: 2,
        winRate: 50,
        selected: key === 'base',
        attempts: 0,
        wins: 0
      });
      
      console.log(`   ✅ ${chain.name}: ${balanceEth.toFixed(6)} ETH ($${(balanceEth * CONFIG.ETH_PRICE_USD).toFixed(2)})`);
    } catch (e) {
      console.error(`   ❌ ${chain.name}: ${e.message}`);
    }
  }
  console.log('');
}

// ═══════════════════════════════════════════════════════════════════════════════
// ESCANEO SECUENCIAL (evita rate limits)
// ═══════════════════════════════════════════════════════════════════════════════

async function scanChain(chainKey) {
  const chain = CHAINS[chainKey];
  const provider = providers[chainKey];
  const quoter = contracts[chainKey].quoter;
  const opportunities = [];
  
  try {
    // 1. Obtener gas price
    const feeData = await provider.getFeeData();
    const gasPrice = feeData.gasPrice || ethers.parseUnits('0.001', 'gwei');
    const gasPriceGwei = parseFloat(ethers.formatUnits(gasPrice, 'gwei'));
    
    if (gasPriceGwei > CONFIG.MAX_GAS_GWEI) {
      console.log(`   ⛽ Gas muy alto en ${chain.name}: ${gasPriceGwei.toFixed(2)} gwei`);
      return [];
    }
    
    const gasCostWei = gasPrice * 250000n;
    const gasCostUsd = parseFloat(ethers.formatEther(gasCostWei)) * CONFIG.ETH_PRICE_USD;
    
    // 2. Obtener precio ETH
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
    } catch (e) {}
    
    // Actualizar estado
    const chainState = state.chains.find(c => c.chain === chainKey);
    if (chainState) chainState.ethPrice = ethPrice;
    
    // 3. Escanear rutas SECUENCIALMENTE (no paralelo)
    for (const amountEth of CONFIG.TRADE_AMOUNTS_ETH) {
      const amountWei = ethers.parseEther(amountEth.toString());
      
      for (let i = 0; i < CONFIG.FEE_TIERS.length; i++) {
        for (let j = 0; j < CONFIG.FEE_TIERS.length; j++) {
          if (i === j) continue;
          
          try {
            // WETH → USDC
            const quote1 = await quoter.quoteExactInputSingle.staticCall({
              tokenIn: chain.tokens.WETH,
              tokenOut: chain.tokens.USDC,
              amountIn: amountWei,
              fee: CONFIG.FEE_TIERS[i],
              sqrtPriceLimitX96: 0n
            });
            const usdcOut = quote1[0];
            
            // USDC → WETH
            const quote2 = await quoter.quoteExactInputSingle.staticCall({
              tokenIn: chain.tokens.USDC,
              tokenOut: chain.tokens.WETH,
              amountIn: usdcOut,
              fee: CONFIG.FEE_TIERS[j],
              sqrtPriceLimitX96: 0n
            });
            const wethOut = quote2[0];
            
            const grossProfit = wethOut - amountWei;
            const netProfit = grossProfit - gasCostWei;
            
            if (netProfit > 0n) {
              const netProfitUsd = parseFloat(ethers.formatEther(netProfit)) * ethPrice;
              const spreadBps = Number((grossProfit * 10000n) / amountWei);
              
              if (netProfitUsd >= CONFIG.MIN_PROFIT_USD) {
                opportunities.push({
                  chain: chainKey,
                  chainName: chain.name,
                  type: 'SCALP',
                  route: `${CONFIG.FEE_TIERS[i]/100}%→${CONFIG.FEE_TIERS[j]/100}%`,
                  amountIn: amountWei,
                  amountInEth: amountEth,
                  fee1: CONFIG.FEE_TIERS[i],
                  fee2: CONFIG.FEE_TIERS[j],
                  usdcIntermediate: usdcOut,
                  wethOut,
                  grossProfit,
                  netProfit,
                  netProfitUsd,
                  gasCostUsd,
                  spreadBps,
                  ethPrice,
                  timestamp: Date.now(),
                  gasPrice: gasPriceGwei
                });
                
                console.log(`   💰 OPP: ${chain.name} ${amountEth}ETH ${CONFIG.FEE_TIERS[i]/100}%→${CONFIG.FEE_TIERS[j]/100}% = $${netProfitUsd.toFixed(4)}`);
              }
            }
          } catch (e) {
            // Pool no existe
          }
        }
      }
    }
    
  } catch (e) {
    console.error(`   ❌ Error ${chain.name}: ${e.message.slice(0, 50)}`);
  }
  
  return opportunities;
}

// ═══════════════════════════════════════════════════════════════════════════════
// EJECUCIÓN
// ═══════════════════════════════════════════════════════════════════════════════

async function execute(opp) {
  if (isExecuting) return null;
  isExecuting = true;
  
  const chain = CHAINS[opp.chain];
  const signer = signers[opp.chain];
  const provider = providers[opp.chain];
  const { router, weth } = contracts[opp.chain];
  
  console.log(`\n🔥 ═══════════════════════════════════════════════════════════════`);
  console.log(`   EJECUTANDO en ${chain.name}`);
  console.log(`   Route: ${opp.route}`);
  console.log(`   Amount: ${opp.amountInEth} ETH`);
  console.log(`   Expected: $${opp.netProfitUsd.toFixed(4)}`);
  
  try {
    // Verificar balance
    const balance = await provider.getBalance(WALLET_ADDRESS);
    if (balance < opp.amountIn + ethers.parseEther('0.002')) {
      console.log(`   ❌ Balance insuficiente`);
      isExecuting = false;
      return { success: false, error: 'Balance insuficiente' };
    }
    
    // 1. Wrap ETH
    console.log(`   📦 Wrapping...`);
    const wrapTx = await weth.deposit({ value: opp.amountIn, gasLimit: 50000 });
    await wrapTx.wait(1);
    
    // 2. Approve WETH
    const allowance = await weth.allowance(WALLET_ADDRESS, chain.router);
    if (allowance < opp.amountIn) {
      const approveTx = await weth.approve(chain.router, ethers.MaxUint256, { gasLimit: 50000 });
      await approveTx.wait(1);
    }
    
    // 3. SWAP 1: WETH → USDC
    console.log(`   🔄 ENTRADA: WETH → USDC...`);
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
    console.log(`   ✅ ENTRADA: ${receipt1.hash.slice(0, 20)}...`);
    
    // 4. Obtener balance USDC
    const usdc = new ethers.Contract(chain.tokens.USDC, ERC20_ABI, signer);
    const usdcBalance = await usdc.balanceOf(WALLET_ADDRESS);
    
    // 5. Approve USDC
    const usdcAllowance = await usdc.allowance(WALLET_ADDRESS, chain.router);
    if (usdcAllowance < usdcBalance) {
      const approveUsdcTx = await usdc.approve(chain.router, ethers.MaxUint256, { gasLimit: 50000 });
      await approveUsdcTx.wait(1);
    }
    
    // 6. SWAP 2: USDC → WETH
    console.log(`   🔄 SALIDA: USDC → WETH...`);
    const minWeth = (opp.wethOut * BigInt(10000 - CONFIG.MAX_SLIPPAGE_BPS)) / 10000n;
    
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
    console.log(`   ✅ SALIDA: ${receipt2.hash.slice(0, 20)}...`);
    
    // 7. Calcular profit
    const finalWeth = await weth.balanceOf(WALLET_ADDRESS);
    const actualProfit = finalWeth - opp.amountIn;
    const actualProfitUsd = parseFloat(ethers.formatEther(actualProfit)) * opp.ethPrice;
    
    const gas1 = receipt1.gasUsed * receipt1.gasPrice;
    const gas2 = receipt2.gasUsed * receipt2.gasPrice;
    const totalGasUsd = parseFloat(ethers.formatEther(gas1 + gas2)) * opp.ethPrice;
    
    const netProfitUsd = actualProfitUsd - totalGasUsd;
    
    console.log(`   ═══════════════════════════════════════════════════════════════`);
    console.log(`   💰 PROFIT: $${actualProfitUsd.toFixed(4)}`);
    console.log(`   ⛽ GAS: $${totalGasUsd.toFixed(4)}`);
    console.log(`   💵 NETO: $${netProfitUsd.toFixed(4)}`);
    console.log(`   🔗 ${chain.explorer}/tx/${receipt2.hash}`);
    
    isExecuting = false;
    return {
      success: true,
      profitUsd: actualProfitUsd,
      gasUsd: totalGasUsd,
      netProfitUsd,
      txHash: receipt2.hash
    };
    
  } catch (e) {
    console.log(`   ❌ Error: ${e.message}`);
    isExecuting = false;
    return { success: false, error: e.message };
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// LOOP PRINCIPAL
// ═══════════════════════════════════════════════════════════════════════════════

async function tick() {
  if (!state.isRunning || isExecuting) return;
  
  const tickStart = Date.now();
  state.stats.totalScans++;
  state.stats.uptime = Math.floor((Date.now() - state.startTime) / 1000);
  
  // Alternar entre chains
  const chainKeys = Object.keys(CHAINS);
  const selectedChain = chainKeys[currentChainIndex % chainKeys.length];
  currentChainIndex++;
  
  state.stats.currentChain = selectedChain;
  state.banditStates.forEach(b => b.selected = b.chain === selectedChain);
  
  console.log(`\n[SCAN #${state.stats.totalScans}] ${CHAINS[selectedChain].name}`);
  
  try {
    const opportunities = await scanChain(selectedChain);
    const scanTime = Date.now() - tickStart;
    
    scanTimes.push(scanTime);
    if (scanTimes.length > 20) scanTimes.shift();
    state.stats.avgScanTimeMs = Math.round(scanTimes.reduce((a, b) => a + b, 0) / scanTimes.length);
    state.stats.scansPerSecond = Math.round(1000 / state.stats.avgScanTimeMs * 10) / 10;
    
    if (opportunities.length > 0) {
      state.stats.opportunitiesFound += opportunities.length;
      opportunities.sort((a, b) => b.netProfitUsd - a.netProfitUsd);
      
      state.opportunities = [...opportunities.slice(0, 5), ...state.opportunities].slice(0, 30);
      state.stats.lastOpportunity = opportunities[0];
      
      const best = opportunities[0];
      console.log(`   📊 ${scanTime}ms | ${opportunities.length} opps | Best: $${best.netProfitUsd.toFixed(4)}`);
      
      // EJECUTAR
      if (!state.isDryRun && CONFIG.AUTO_EXECUTE) {
        state.stats.tradesAttempted++;
        
        const result = await execute(best);
        
        if (result) {
          state.stats.tradesExecuted++;
          
          const tradeLog = {
            id: `tx-${Date.now()}`,
            timestamp: Date.now(),
            chain: best.chain,
            chainName: best.chainName,
            route: best.route,
            amountIn: best.amountInEth,
            spreadBps: best.spreadBps,
            expectedProfit: best.netProfitUsd.toFixed(4),
            actualProfit: result.success ? result.profitUsd.toFixed(4) : '0',
            gasCost: result.success ? result.gasUsd.toFixed(4) : '0',
            netProfit: result.success ? result.netProfitUsd.toFixed(4) : '0',
            txHash: result.txHash || '',
            status: result.success ? 'success' : 'failed',
            error: result.error || ''
          };
          
          state.tradeLogs.unshift(tradeLog);
          if (state.tradeLogs.length > 50) state.tradeLogs.pop();
          
          if (result.success) {
            state.stats.tradesSuccessful++;
            state.stats.totalProfitUsd += result.profitUsd;
            state.stats.totalGasUsd += result.gasUsd;
            state.stats.netProfitUsd = state.stats.totalProfitUsd - state.stats.totalGasUsd;
            state.stats.lastTrade = tradeLog;
            
            const bandit = state.banditStates.find(b => b.chain === best.chain);
            if (bandit) {
              bandit.wins++;
              bandit.attempts++;
              bandit.alpha++;
              bandit.winRate = (bandit.wins / bandit.attempts) * 100;
            }
          } else {
            const bandit = state.banditStates.find(b => b.chain === best.chain);
            if (bandit) {
              bandit.attempts++;
              bandit.beta++;
              bandit.winRate = bandit.attempts > 0 ? (bandit.wins / bandit.attempts) * 100 : 50;
            }
          }
          
          state.stats.winRate = state.stats.tradesExecuted > 0
            ? (state.stats.tradesSuccessful / state.stats.tradesExecuted) * 100
            : 0;
        }
      }
    } else {
      console.log(`   📊 ${scanTime}ms | No profitable opportunities`);
    }
    
    // Actualizar balances cada 20 scans
    if (state.stats.totalScans % 20 === 0) {
      for (const chainState of state.chains) {
        try {
          const balance = await providers[chainState.chain].getBalance(WALLET_ADDRESS);
          const balanceEth = parseFloat(ethers.formatEther(balance));
          chainState.balance = balanceEth.toFixed(6);
          chainState.balanceUsd = balanceEth * CONFIG.ETH_PRICE_USD;
          chainState.isActive = balanceEth > 0.001;
        } catch (e) {}
      }
    }
    
  } catch (e) {
    console.error(`   ❌ Error: ${e.message}`);
  }
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
  
  state.isDryRun = req.body?.dryRun === true;
  state.isRunning = true;
  state.startTime = Date.now();
  
  state.stats = {
    totalScans: 0, opportunitiesFound: 0, tradesAttempted: 0,
    tradesExecuted: 0, tradesSuccessful: 0, totalProfitUsd: 0,
    totalGasUsd: 0, netProfitUsd: 0, winRate: 0, avgScanTimeMs: 0,
    scansPerSecond: 0, uptime: 0, currentChain: 'base',
    lastOpportunity: null, lastTrade: null
  };
  state.tradeLogs = [];
  state.opportunities = [];
  scanTimes = [];
  currentChainIndex = 0;
  
  if (timer) clearInterval(timer);
  timer = setInterval(tick, CONFIG.SCAN_INTERVAL_MS);
  
  console.log(`\n[START] 🔥 SCALPER iniciado - ${state.isDryRun ? 'DRY RUN' : '⚠️ MODO REAL'}`);
  
  res.json({
    success: true,
    isRunning: true,
    isDryRun: state.isDryRun,
    mode: 'SCALPER_OPTIMIZED',
    config: CONFIG
  });
});

app.post('/api/defi/multichain-arb/stop', (req, res) => {
  state.isRunning = false;
  if (timer) { clearInterval(timer); timer = null; }
  console.log('[STOP] Bot detenido');
  res.json({ success: true, isRunning: false });
});

app.get('/api/defi/multichain-arb/health', (req, res) => {
  res.json({
    status: 'ok',
    mode: 'SCALPER_OPTIMIZED',
    port: PORT,
    running: state.isRunning,
    dryRun: state.isDryRun,
    wallet: WALLET_ADDRESS,
    config: CONFIG
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// INICIAR
// ═══════════════════════════════════════════════════════════════════════════════

app.listen(PORT, async () => {
  console.log(`
╔═══════════════════════════════════════════════════════════════════════════════╗
║                                                                               ║
║   🔥 SCALPER OPTIMIZADO - BASE + ARBITRUM                                     ║
║                                                                               ║
║   ✅ Puerto: ${PORT}                                                           ║
║   ✅ Wallet: ${WALLET_ADDRESS.slice(0, 10)}...${WALLET_ADDRESS.slice(-5)}                                  ║
║                                                                               ║
║   ⚡ Intervalo: ${CONFIG.SCAN_INTERVAL_MS}ms | Min Profit: $${CONFIG.MIN_PROFIT_USD}                            ║
║   ⚡ Fee Tiers: ${CONFIG.FEE_TIERS.map(f => f/100 + '%').join(', ')}                                     ║
║   ⚡ Amounts: ${CONFIG.TRADE_AMOUNTS_ETH.join(', ')} ETH                                  ║
║                                                                               ║
╚═══════════════════════════════════════════════════════════════════════════════╝
  `);
  
  await init();
  console.log('[READY] 🔥 Scalper listo. POST /api/defi/multichain-arb/start para iniciar.\n');
});

process.on('SIGINT', () => {
  if (timer) clearInterval(timer);
  process.exit(0);
});



 * ═══════════════════════════════════════════════════════════════════════════════
 * 🔥 SCALPER OPTIMIZADO - BASE + ARBITRUM ONLY
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * Versión optimizada que:
 * - Solo usa Base y Arbitrum (RPCs premium)
 * - Reduce llamadas paralelas para evitar rate limits
 * - Escaneo secuencial por chain
 * - Ejecución inmediata cuando detecta oportunidad
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
// CONFIGURACIÓN OPTIMIZADA
// ═══════════════════════════════════════════════════════════════════════════════

const CONFIG = {
  SCAN_INTERVAL_MS: 500,
  MIN_PROFIT_USD: 0.01,
  MAX_SLIPPAGE_BPS: 50,
  TRADE_AMOUNTS_ETH: [0.005, 0.01, 0.02],
  FEE_TIERS: [500, 3000],  // Solo los más líquidos
  AUTO_EXECUTE: true,
  MAX_GAS_GWEI: 10,
  ETH_PRICE_USD: 3500
};

const PRIVATE_KEY = process.env.VITE_ETH_PRIVATE_KEY;
const WALLET_ADDRESS = process.env.VITE_ETH_WALLET_ADDRESS;

if (!PRIVATE_KEY || !WALLET_ADDRESS) {
  console.error('❌ ERROR: Credenciales no configuradas');
  process.exit(1);
}

// ═══════════════════════════════════════════════════════════════════════════════
// CHAINS (Solo Base y Arbitrum con RPCs premium)
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

const ROUTER_ABI = [
  'function exactInputSingle((address tokenIn, address tokenOut, uint24 fee, address recipient, uint256 amountIn, uint256 amountOutMinimum, uint160 sqrtPriceLimitX96)) external payable returns (uint256 amountOut)'
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
// ESTADO
// ═══════════════════════════════════════════════════════════════════════════════

let state = {
  isRunning: false,
  isDryRun: false,
  startTime: null,
  mode: 'SCALPER_OPTIMIZED',
  stats: {
    totalScans: 0,
    opportunitiesFound: 0,
    tradesAttempted: 0,
    tradesExecuted: 0,
    tradesSuccessful: 0,
    totalProfitUsd: 0,
    totalGasUsd: 0,
    netProfitUsd: 0,
    winRate: 0,
    avgScanTimeMs: 0,
    scansPerSecond: 0,
    uptime: 0,
    currentChain: 'base',
    lastOpportunity: null,
    lastTrade: null
  },
  chains: [],
  tradeLogs: [],
  opportunities: [],
  banditStates: []
};

let timer = null;
let providers = {};
let signers = {};
let contracts = {};
let isExecuting = false;
let currentChainIndex = 0;
let scanTimes = [];

// ═══════════════════════════════════════════════════════════════════════════════
// INICIALIZAR
// ═══════════════════════════════════════════════════════════════════════════════

async function init() {
  console.log('[INIT] 🔌 Conectando a chains...\n');
  
  for (const [key, chain] of Object.entries(CHAINS)) {
    try {
      providers[key] = new ethers.JsonRpcProvider(chain.rpc);
      signers[key] = new ethers.Wallet(PRIVATE_KEY, providers[key]);
      
      contracts[key] = {
        quoter: new ethers.Contract(chain.quoter, QUOTER_ABI, providers[key]),
        router: new ethers.Contract(chain.router, ROUTER_ABI, signers[key]),
        weth: new ethers.Contract(chain.tokens.WETH, WETH_ABI, signers[key])
      };
      
      const balance = await providers[key].getBalance(WALLET_ADDRESS);
      const balanceEth = parseFloat(ethers.formatEther(balance));
      
      state.chains.push({
        chain: key,
        name: chain.name,
        chainId: chain.chainId,
        balance: balanceEth.toFixed(6),
        balanceUsd: balanceEth * CONFIG.ETH_PRICE_USD,
        routes: CONFIG.FEE_TIERS.length * CONFIG.TRADE_AMOUNTS_ETH.length,
        isActive: balanceEth > 0.001,
        lastScan: Date.now(),
        scansCompleted: 0,
        opportunitiesFound: 0,
        tradesExecuted: 0,
        explorer: chain.explorer,
        ethPrice: 0
      });
      
      state.banditStates.push({
        chain: key,
        alpha: 2,
        beta: 2,
        winRate: 50,
        selected: key === 'base',
        attempts: 0,
        wins: 0
      });
      
      console.log(`   ✅ ${chain.name}: ${balanceEth.toFixed(6)} ETH ($${(balanceEth * CONFIG.ETH_PRICE_USD).toFixed(2)})`);
    } catch (e) {
      console.error(`   ❌ ${chain.name}: ${e.message}`);
    }
  }
  console.log('');
}

// ═══════════════════════════════════════════════════════════════════════════════
// ESCANEO SECUENCIAL (evita rate limits)
// ═══════════════════════════════════════════════════════════════════════════════

async function scanChain(chainKey) {
  const chain = CHAINS[chainKey];
  const provider = providers[chainKey];
  const quoter = contracts[chainKey].quoter;
  const opportunities = [];
  
  try {
    // 1. Obtener gas price
    const feeData = await provider.getFeeData();
    const gasPrice = feeData.gasPrice || ethers.parseUnits('0.001', 'gwei');
    const gasPriceGwei = parseFloat(ethers.formatUnits(gasPrice, 'gwei'));
    
    if (gasPriceGwei > CONFIG.MAX_GAS_GWEI) {
      console.log(`   ⛽ Gas muy alto en ${chain.name}: ${gasPriceGwei.toFixed(2)} gwei`);
      return [];
    }
    
    const gasCostWei = gasPrice * 250000n;
    const gasCostUsd = parseFloat(ethers.formatEther(gasCostWei)) * CONFIG.ETH_PRICE_USD;
    
    // 2. Obtener precio ETH
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
    } catch (e) {}
    
    // Actualizar estado
    const chainState = state.chains.find(c => c.chain === chainKey);
    if (chainState) chainState.ethPrice = ethPrice;
    
    // 3. Escanear rutas SECUENCIALMENTE (no paralelo)
    for (const amountEth of CONFIG.TRADE_AMOUNTS_ETH) {
      const amountWei = ethers.parseEther(amountEth.toString());
      
      for (let i = 0; i < CONFIG.FEE_TIERS.length; i++) {
        for (let j = 0; j < CONFIG.FEE_TIERS.length; j++) {
          if (i === j) continue;
          
          try {
            // WETH → USDC
            const quote1 = await quoter.quoteExactInputSingle.staticCall({
              tokenIn: chain.tokens.WETH,
              tokenOut: chain.tokens.USDC,
              amountIn: amountWei,
              fee: CONFIG.FEE_TIERS[i],
              sqrtPriceLimitX96: 0n
            });
            const usdcOut = quote1[0];
            
            // USDC → WETH
            const quote2 = await quoter.quoteExactInputSingle.staticCall({
              tokenIn: chain.tokens.USDC,
              tokenOut: chain.tokens.WETH,
              amountIn: usdcOut,
              fee: CONFIG.FEE_TIERS[j],
              sqrtPriceLimitX96: 0n
            });
            const wethOut = quote2[0];
            
            const grossProfit = wethOut - amountWei;
            const netProfit = grossProfit - gasCostWei;
            
            if (netProfit > 0n) {
              const netProfitUsd = parseFloat(ethers.formatEther(netProfit)) * ethPrice;
              const spreadBps = Number((grossProfit * 10000n) / amountWei);
              
              if (netProfitUsd >= CONFIG.MIN_PROFIT_USD) {
                opportunities.push({
                  chain: chainKey,
                  chainName: chain.name,
                  type: 'SCALP',
                  route: `${CONFIG.FEE_TIERS[i]/100}%→${CONFIG.FEE_TIERS[j]/100}%`,
                  amountIn: amountWei,
                  amountInEth: amountEth,
                  fee1: CONFIG.FEE_TIERS[i],
                  fee2: CONFIG.FEE_TIERS[j],
                  usdcIntermediate: usdcOut,
                  wethOut,
                  grossProfit,
                  netProfit,
                  netProfitUsd,
                  gasCostUsd,
                  spreadBps,
                  ethPrice,
                  timestamp: Date.now(),
                  gasPrice: gasPriceGwei
                });
                
                console.log(`   💰 OPP: ${chain.name} ${amountEth}ETH ${CONFIG.FEE_TIERS[i]/100}%→${CONFIG.FEE_TIERS[j]/100}% = $${netProfitUsd.toFixed(4)}`);
              }
            }
          } catch (e) {
            // Pool no existe
          }
        }
      }
    }
    
  } catch (e) {
    console.error(`   ❌ Error ${chain.name}: ${e.message.slice(0, 50)}`);
  }
  
  return opportunities;
}

// ═══════════════════════════════════════════════════════════════════════════════
// EJECUCIÓN
// ═══════════════════════════════════════════════════════════════════════════════

async function execute(opp) {
  if (isExecuting) return null;
  isExecuting = true;
  
  const chain = CHAINS[opp.chain];
  const signer = signers[opp.chain];
  const provider = providers[opp.chain];
  const { router, weth } = contracts[opp.chain];
  
  console.log(`\n🔥 ═══════════════════════════════════════════════════════════════`);
  console.log(`   EJECUTANDO en ${chain.name}`);
  console.log(`   Route: ${opp.route}`);
  console.log(`   Amount: ${opp.amountInEth} ETH`);
  console.log(`   Expected: $${opp.netProfitUsd.toFixed(4)}`);
  
  try {
    // Verificar balance
    const balance = await provider.getBalance(WALLET_ADDRESS);
    if (balance < opp.amountIn + ethers.parseEther('0.002')) {
      console.log(`   ❌ Balance insuficiente`);
      isExecuting = false;
      return { success: false, error: 'Balance insuficiente' };
    }
    
    // 1. Wrap ETH
    console.log(`   📦 Wrapping...`);
    const wrapTx = await weth.deposit({ value: opp.amountIn, gasLimit: 50000 });
    await wrapTx.wait(1);
    
    // 2. Approve WETH
    const allowance = await weth.allowance(WALLET_ADDRESS, chain.router);
    if (allowance < opp.amountIn) {
      const approveTx = await weth.approve(chain.router, ethers.MaxUint256, { gasLimit: 50000 });
      await approveTx.wait(1);
    }
    
    // 3. SWAP 1: WETH → USDC
    console.log(`   🔄 ENTRADA: WETH → USDC...`);
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
    console.log(`   ✅ ENTRADA: ${receipt1.hash.slice(0, 20)}...`);
    
    // 4. Obtener balance USDC
    const usdc = new ethers.Contract(chain.tokens.USDC, ERC20_ABI, signer);
    const usdcBalance = await usdc.balanceOf(WALLET_ADDRESS);
    
    // 5. Approve USDC
    const usdcAllowance = await usdc.allowance(WALLET_ADDRESS, chain.router);
    if (usdcAllowance < usdcBalance) {
      const approveUsdcTx = await usdc.approve(chain.router, ethers.MaxUint256, { gasLimit: 50000 });
      await approveUsdcTx.wait(1);
    }
    
    // 6. SWAP 2: USDC → WETH
    console.log(`   🔄 SALIDA: USDC → WETH...`);
    const minWeth = (opp.wethOut * BigInt(10000 - CONFIG.MAX_SLIPPAGE_BPS)) / 10000n;
    
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
    console.log(`   ✅ SALIDA: ${receipt2.hash.slice(0, 20)}...`);
    
    // 7. Calcular profit
    const finalWeth = await weth.balanceOf(WALLET_ADDRESS);
    const actualProfit = finalWeth - opp.amountIn;
    const actualProfitUsd = parseFloat(ethers.formatEther(actualProfit)) * opp.ethPrice;
    
    const gas1 = receipt1.gasUsed * receipt1.gasPrice;
    const gas2 = receipt2.gasUsed * receipt2.gasPrice;
    const totalGasUsd = parseFloat(ethers.formatEther(gas1 + gas2)) * opp.ethPrice;
    
    const netProfitUsd = actualProfitUsd - totalGasUsd;
    
    console.log(`   ═══════════════════════════════════════════════════════════════`);
    console.log(`   💰 PROFIT: $${actualProfitUsd.toFixed(4)}`);
    console.log(`   ⛽ GAS: $${totalGasUsd.toFixed(4)}`);
    console.log(`   💵 NETO: $${netProfitUsd.toFixed(4)}`);
    console.log(`   🔗 ${chain.explorer}/tx/${receipt2.hash}`);
    
    isExecuting = false;
    return {
      success: true,
      profitUsd: actualProfitUsd,
      gasUsd: totalGasUsd,
      netProfitUsd,
      txHash: receipt2.hash
    };
    
  } catch (e) {
    console.log(`   ❌ Error: ${e.message}`);
    isExecuting = false;
    return { success: false, error: e.message };
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// LOOP PRINCIPAL
// ═══════════════════════════════════════════════════════════════════════════════

async function tick() {
  if (!state.isRunning || isExecuting) return;
  
  const tickStart = Date.now();
  state.stats.totalScans++;
  state.stats.uptime = Math.floor((Date.now() - state.startTime) / 1000);
  
  // Alternar entre chains
  const chainKeys = Object.keys(CHAINS);
  const selectedChain = chainKeys[currentChainIndex % chainKeys.length];
  currentChainIndex++;
  
  state.stats.currentChain = selectedChain;
  state.banditStates.forEach(b => b.selected = b.chain === selectedChain);
  
  console.log(`\n[SCAN #${state.stats.totalScans}] ${CHAINS[selectedChain].name}`);
  
  try {
    const opportunities = await scanChain(selectedChain);
    const scanTime = Date.now() - tickStart;
    
    scanTimes.push(scanTime);
    if (scanTimes.length > 20) scanTimes.shift();
    state.stats.avgScanTimeMs = Math.round(scanTimes.reduce((a, b) => a + b, 0) / scanTimes.length);
    state.stats.scansPerSecond = Math.round(1000 / state.stats.avgScanTimeMs * 10) / 10;
    
    if (opportunities.length > 0) {
      state.stats.opportunitiesFound += opportunities.length;
      opportunities.sort((a, b) => b.netProfitUsd - a.netProfitUsd);
      
      state.opportunities = [...opportunities.slice(0, 5), ...state.opportunities].slice(0, 30);
      state.stats.lastOpportunity = opportunities[0];
      
      const best = opportunities[0];
      console.log(`   📊 ${scanTime}ms | ${opportunities.length} opps | Best: $${best.netProfitUsd.toFixed(4)}`);
      
      // EJECUTAR
      if (!state.isDryRun && CONFIG.AUTO_EXECUTE) {
        state.stats.tradesAttempted++;
        
        const result = await execute(best);
        
        if (result) {
          state.stats.tradesExecuted++;
          
          const tradeLog = {
            id: `tx-${Date.now()}`,
            timestamp: Date.now(),
            chain: best.chain,
            chainName: best.chainName,
            route: best.route,
            amountIn: best.amountInEth,
            spreadBps: best.spreadBps,
            expectedProfit: best.netProfitUsd.toFixed(4),
            actualProfit: result.success ? result.profitUsd.toFixed(4) : '0',
            gasCost: result.success ? result.gasUsd.toFixed(4) : '0',
            netProfit: result.success ? result.netProfitUsd.toFixed(4) : '0',
            txHash: result.txHash || '',
            status: result.success ? 'success' : 'failed',
            error: result.error || ''
          };
          
          state.tradeLogs.unshift(tradeLog);
          if (state.tradeLogs.length > 50) state.tradeLogs.pop();
          
          if (result.success) {
            state.stats.tradesSuccessful++;
            state.stats.totalProfitUsd += result.profitUsd;
            state.stats.totalGasUsd += result.gasUsd;
            state.stats.netProfitUsd = state.stats.totalProfitUsd - state.stats.totalGasUsd;
            state.stats.lastTrade = tradeLog;
            
            const bandit = state.banditStates.find(b => b.chain === best.chain);
            if (bandit) {
              bandit.wins++;
              bandit.attempts++;
              bandit.alpha++;
              bandit.winRate = (bandit.wins / bandit.attempts) * 100;
            }
          } else {
            const bandit = state.banditStates.find(b => b.chain === best.chain);
            if (bandit) {
              bandit.attempts++;
              bandit.beta++;
              bandit.winRate = bandit.attempts > 0 ? (bandit.wins / bandit.attempts) * 100 : 50;
            }
          }
          
          state.stats.winRate = state.stats.tradesExecuted > 0
            ? (state.stats.tradesSuccessful / state.stats.tradesExecuted) * 100
            : 0;
        }
      }
    } else {
      console.log(`   📊 ${scanTime}ms | No profitable opportunities`);
    }
    
    // Actualizar balances cada 20 scans
    if (state.stats.totalScans % 20 === 0) {
      for (const chainState of state.chains) {
        try {
          const balance = await providers[chainState.chain].getBalance(WALLET_ADDRESS);
          const balanceEth = parseFloat(ethers.formatEther(balance));
          chainState.balance = balanceEth.toFixed(6);
          chainState.balanceUsd = balanceEth * CONFIG.ETH_PRICE_USD;
          chainState.isActive = balanceEth > 0.001;
        } catch (e) {}
      }
    }
    
  } catch (e) {
    console.error(`   ❌ Error: ${e.message}`);
  }
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
  
  state.isDryRun = req.body?.dryRun === true;
  state.isRunning = true;
  state.startTime = Date.now();
  
  state.stats = {
    totalScans: 0, opportunitiesFound: 0, tradesAttempted: 0,
    tradesExecuted: 0, tradesSuccessful: 0, totalProfitUsd: 0,
    totalGasUsd: 0, netProfitUsd: 0, winRate: 0, avgScanTimeMs: 0,
    scansPerSecond: 0, uptime: 0, currentChain: 'base',
    lastOpportunity: null, lastTrade: null
  };
  state.tradeLogs = [];
  state.opportunities = [];
  scanTimes = [];
  currentChainIndex = 0;
  
  if (timer) clearInterval(timer);
  timer = setInterval(tick, CONFIG.SCAN_INTERVAL_MS);
  
  console.log(`\n[START] 🔥 SCALPER iniciado - ${state.isDryRun ? 'DRY RUN' : '⚠️ MODO REAL'}`);
  
  res.json({
    success: true,
    isRunning: true,
    isDryRun: state.isDryRun,
    mode: 'SCALPER_OPTIMIZED',
    config: CONFIG
  });
});

app.post('/api/defi/multichain-arb/stop', (req, res) => {
  state.isRunning = false;
  if (timer) { clearInterval(timer); timer = null; }
  console.log('[STOP] Bot detenido');
  res.json({ success: true, isRunning: false });
});

app.get('/api/defi/multichain-arb/health', (req, res) => {
  res.json({
    status: 'ok',
    mode: 'SCALPER_OPTIMIZED',
    port: PORT,
    running: state.isRunning,
    dryRun: state.isDryRun,
    wallet: WALLET_ADDRESS,
    config: CONFIG
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// INICIAR
// ═══════════════════════════════════════════════════════════════════════════════

app.listen(PORT, async () => {
  console.log(`
╔═══════════════════════════════════════════════════════════════════════════════╗
║                                                                               ║
║   🔥 SCALPER OPTIMIZADO - BASE + ARBITRUM                                     ║
║                                                                               ║
║   ✅ Puerto: ${PORT}                                                           ║
║   ✅ Wallet: ${WALLET_ADDRESS.slice(0, 10)}...${WALLET_ADDRESS.slice(-5)}                                  ║
║                                                                               ║
║   ⚡ Intervalo: ${CONFIG.SCAN_INTERVAL_MS}ms | Min Profit: $${CONFIG.MIN_PROFIT_USD}                            ║
║   ⚡ Fee Tiers: ${CONFIG.FEE_TIERS.map(f => f/100 + '%').join(', ')}                                     ║
║   ⚡ Amounts: ${CONFIG.TRADE_AMOUNTS_ETH.join(', ')} ETH                                  ║
║                                                                               ║
╚═══════════════════════════════════════════════════════════════════════════════╝
  `);
  
  await init();
  console.log('[READY] 🔥 Scalper listo. POST /api/defi/multichain-arb/start para iniciar.\n');
});

process.on('SIGINT', () => {
  if (timer) clearInterval(timer);
  process.exit(0);
});


 * ═══════════════════════════════════════════════════════════════════════════════
 * 🔥 SCALPER OPTIMIZADO - BASE + ARBITRUM ONLY
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * Versión optimizada que:
 * - Solo usa Base y Arbitrum (RPCs premium)
 * - Reduce llamadas paralelas para evitar rate limits
 * - Escaneo secuencial por chain
 * - Ejecución inmediata cuando detecta oportunidad
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
// CONFIGURACIÓN OPTIMIZADA
// ═══════════════════════════════════════════════════════════════════════════════

const CONFIG = {
  SCAN_INTERVAL_MS: 500,
  MIN_PROFIT_USD: 0.01,
  MAX_SLIPPAGE_BPS: 50,
  TRADE_AMOUNTS_ETH: [0.005, 0.01, 0.02],
  FEE_TIERS: [500, 3000],  // Solo los más líquidos
  AUTO_EXECUTE: true,
  MAX_GAS_GWEI: 10,
  ETH_PRICE_USD: 3500
};

const PRIVATE_KEY = process.env.VITE_ETH_PRIVATE_KEY;
const WALLET_ADDRESS = process.env.VITE_ETH_WALLET_ADDRESS;

if (!PRIVATE_KEY || !WALLET_ADDRESS) {
  console.error('❌ ERROR: Credenciales no configuradas');
  process.exit(1);
}

// ═══════════════════════════════════════════════════════════════════════════════
// CHAINS (Solo Base y Arbitrum con RPCs premium)
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

const ROUTER_ABI = [
  'function exactInputSingle((address tokenIn, address tokenOut, uint24 fee, address recipient, uint256 amountIn, uint256 amountOutMinimum, uint160 sqrtPriceLimitX96)) external payable returns (uint256 amountOut)'
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
// ESTADO
// ═══════════════════════════════════════════════════════════════════════════════

let state = {
  isRunning: false,
  isDryRun: false,
  startTime: null,
  mode: 'SCALPER_OPTIMIZED',
  stats: {
    totalScans: 0,
    opportunitiesFound: 0,
    tradesAttempted: 0,
    tradesExecuted: 0,
    tradesSuccessful: 0,
    totalProfitUsd: 0,
    totalGasUsd: 0,
    netProfitUsd: 0,
    winRate: 0,
    avgScanTimeMs: 0,
    scansPerSecond: 0,
    uptime: 0,
    currentChain: 'base',
    lastOpportunity: null,
    lastTrade: null
  },
  chains: [],
  tradeLogs: [],
  opportunities: [],
  banditStates: []
};

let timer = null;
let providers = {};
let signers = {};
let contracts = {};
let isExecuting = false;
let currentChainIndex = 0;
let scanTimes = [];

// ═══════════════════════════════════════════════════════════════════════════════
// INICIALIZAR
// ═══════════════════════════════════════════════════════════════════════════════

async function init() {
  console.log('[INIT] 🔌 Conectando a chains...\n');
  
  for (const [key, chain] of Object.entries(CHAINS)) {
    try {
      providers[key] = new ethers.JsonRpcProvider(chain.rpc);
      signers[key] = new ethers.Wallet(PRIVATE_KEY, providers[key]);
      
      contracts[key] = {
        quoter: new ethers.Contract(chain.quoter, QUOTER_ABI, providers[key]),
        router: new ethers.Contract(chain.router, ROUTER_ABI, signers[key]),
        weth: new ethers.Contract(chain.tokens.WETH, WETH_ABI, signers[key])
      };
      
      const balance = await providers[key].getBalance(WALLET_ADDRESS);
      const balanceEth = parseFloat(ethers.formatEther(balance));
      
      state.chains.push({
        chain: key,
        name: chain.name,
        chainId: chain.chainId,
        balance: balanceEth.toFixed(6),
        balanceUsd: balanceEth * CONFIG.ETH_PRICE_USD,
        routes: CONFIG.FEE_TIERS.length * CONFIG.TRADE_AMOUNTS_ETH.length,
        isActive: balanceEth > 0.001,
        lastScan: Date.now(),
        scansCompleted: 0,
        opportunitiesFound: 0,
        tradesExecuted: 0,
        explorer: chain.explorer,
        ethPrice: 0
      });
      
      state.banditStates.push({
        chain: key,
        alpha: 2,
        beta: 2,
        winRate: 50,
        selected: key === 'base',
        attempts: 0,
        wins: 0
      });
      
      console.log(`   ✅ ${chain.name}: ${balanceEth.toFixed(6)} ETH ($${(balanceEth * CONFIG.ETH_PRICE_USD).toFixed(2)})`);
    } catch (e) {
      console.error(`   ❌ ${chain.name}: ${e.message}`);
    }
  }
  console.log('');
}

// ═══════════════════════════════════════════════════════════════════════════════
// ESCANEO SECUENCIAL (evita rate limits)
// ═══════════════════════════════════════════════════════════════════════════════

async function scanChain(chainKey) {
  const chain = CHAINS[chainKey];
  const provider = providers[chainKey];
  const quoter = contracts[chainKey].quoter;
  const opportunities = [];
  
  try {
    // 1. Obtener gas price
    const feeData = await provider.getFeeData();
    const gasPrice = feeData.gasPrice || ethers.parseUnits('0.001', 'gwei');
    const gasPriceGwei = parseFloat(ethers.formatUnits(gasPrice, 'gwei'));
    
    if (gasPriceGwei > CONFIG.MAX_GAS_GWEI) {
      console.log(`   ⛽ Gas muy alto en ${chain.name}: ${gasPriceGwei.toFixed(2)} gwei`);
      return [];
    }
    
    const gasCostWei = gasPrice * 250000n;
    const gasCostUsd = parseFloat(ethers.formatEther(gasCostWei)) * CONFIG.ETH_PRICE_USD;
    
    // 2. Obtener precio ETH
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
    } catch (e) {}
    
    // Actualizar estado
    const chainState = state.chains.find(c => c.chain === chainKey);
    if (chainState) chainState.ethPrice = ethPrice;
    
    // 3. Escanear rutas SECUENCIALMENTE (no paralelo)
    for (const amountEth of CONFIG.TRADE_AMOUNTS_ETH) {
      const amountWei = ethers.parseEther(amountEth.toString());
      
      for (let i = 0; i < CONFIG.FEE_TIERS.length; i++) {
        for (let j = 0; j < CONFIG.FEE_TIERS.length; j++) {
          if (i === j) continue;
          
          try {
            // WETH → USDC
            const quote1 = await quoter.quoteExactInputSingle.staticCall({
              tokenIn: chain.tokens.WETH,
              tokenOut: chain.tokens.USDC,
              amountIn: amountWei,
              fee: CONFIG.FEE_TIERS[i],
              sqrtPriceLimitX96: 0n
            });
            const usdcOut = quote1[0];
            
            // USDC → WETH
            const quote2 = await quoter.quoteExactInputSingle.staticCall({
              tokenIn: chain.tokens.USDC,
              tokenOut: chain.tokens.WETH,
              amountIn: usdcOut,
              fee: CONFIG.FEE_TIERS[j],
              sqrtPriceLimitX96: 0n
            });
            const wethOut = quote2[0];
            
            const grossProfit = wethOut - amountWei;
            const netProfit = grossProfit - gasCostWei;
            
            if (netProfit > 0n) {
              const netProfitUsd = parseFloat(ethers.formatEther(netProfit)) * ethPrice;
              const spreadBps = Number((grossProfit * 10000n) / amountWei);
              
              if (netProfitUsd >= CONFIG.MIN_PROFIT_USD) {
                opportunities.push({
                  chain: chainKey,
                  chainName: chain.name,
                  type: 'SCALP',
                  route: `${CONFIG.FEE_TIERS[i]/100}%→${CONFIG.FEE_TIERS[j]/100}%`,
                  amountIn: amountWei,
                  amountInEth: amountEth,
                  fee1: CONFIG.FEE_TIERS[i],
                  fee2: CONFIG.FEE_TIERS[j],
                  usdcIntermediate: usdcOut,
                  wethOut,
                  grossProfit,
                  netProfit,
                  netProfitUsd,
                  gasCostUsd,
                  spreadBps,
                  ethPrice,
                  timestamp: Date.now(),
                  gasPrice: gasPriceGwei
                });
                
                console.log(`   💰 OPP: ${chain.name} ${amountEth}ETH ${CONFIG.FEE_TIERS[i]/100}%→${CONFIG.FEE_TIERS[j]/100}% = $${netProfitUsd.toFixed(4)}`);
              }
            }
          } catch (e) {
            // Pool no existe
          }
        }
      }
    }
    
  } catch (e) {
    console.error(`   ❌ Error ${chain.name}: ${e.message.slice(0, 50)}`);
  }
  
  return opportunities;
}

// ═══════════════════════════════════════════════════════════════════════════════
// EJECUCIÓN
// ═══════════════════════════════════════════════════════════════════════════════

async function execute(opp) {
  if (isExecuting) return null;
  isExecuting = true;
  
  const chain = CHAINS[opp.chain];
  const signer = signers[opp.chain];
  const provider = providers[opp.chain];
  const { router, weth } = contracts[opp.chain];
  
  console.log(`\n🔥 ═══════════════════════════════════════════════════════════════`);
  console.log(`   EJECUTANDO en ${chain.name}`);
  console.log(`   Route: ${opp.route}`);
  console.log(`   Amount: ${opp.amountInEth} ETH`);
  console.log(`   Expected: $${opp.netProfitUsd.toFixed(4)}`);
  
  try {
    // Verificar balance
    const balance = await provider.getBalance(WALLET_ADDRESS);
    if (balance < opp.amountIn + ethers.parseEther('0.002')) {
      console.log(`   ❌ Balance insuficiente`);
      isExecuting = false;
      return { success: false, error: 'Balance insuficiente' };
    }
    
    // 1. Wrap ETH
    console.log(`   📦 Wrapping...`);
    const wrapTx = await weth.deposit({ value: opp.amountIn, gasLimit: 50000 });
    await wrapTx.wait(1);
    
    // 2. Approve WETH
    const allowance = await weth.allowance(WALLET_ADDRESS, chain.router);
    if (allowance < opp.amountIn) {
      const approveTx = await weth.approve(chain.router, ethers.MaxUint256, { gasLimit: 50000 });
      await approveTx.wait(1);
    }
    
    // 3. SWAP 1: WETH → USDC
    console.log(`   🔄 ENTRADA: WETH → USDC...`);
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
    console.log(`   ✅ ENTRADA: ${receipt1.hash.slice(0, 20)}...`);
    
    // 4. Obtener balance USDC
    const usdc = new ethers.Contract(chain.tokens.USDC, ERC20_ABI, signer);
    const usdcBalance = await usdc.balanceOf(WALLET_ADDRESS);
    
    // 5. Approve USDC
    const usdcAllowance = await usdc.allowance(WALLET_ADDRESS, chain.router);
    if (usdcAllowance < usdcBalance) {
      const approveUsdcTx = await usdc.approve(chain.router, ethers.MaxUint256, { gasLimit: 50000 });
      await approveUsdcTx.wait(1);
    }
    
    // 6. SWAP 2: USDC → WETH
    console.log(`   🔄 SALIDA: USDC → WETH...`);
    const minWeth = (opp.wethOut * BigInt(10000 - CONFIG.MAX_SLIPPAGE_BPS)) / 10000n;
    
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
    console.log(`   ✅ SALIDA: ${receipt2.hash.slice(0, 20)}...`);
    
    // 7. Calcular profit
    const finalWeth = await weth.balanceOf(WALLET_ADDRESS);
    const actualProfit = finalWeth - opp.amountIn;
    const actualProfitUsd = parseFloat(ethers.formatEther(actualProfit)) * opp.ethPrice;
    
    const gas1 = receipt1.gasUsed * receipt1.gasPrice;
    const gas2 = receipt2.gasUsed * receipt2.gasPrice;
    const totalGasUsd = parseFloat(ethers.formatEther(gas1 + gas2)) * opp.ethPrice;
    
    const netProfitUsd = actualProfitUsd - totalGasUsd;
    
    console.log(`   ═══════════════════════════════════════════════════════════════`);
    console.log(`   💰 PROFIT: $${actualProfitUsd.toFixed(4)}`);
    console.log(`   ⛽ GAS: $${totalGasUsd.toFixed(4)}`);
    console.log(`   💵 NETO: $${netProfitUsd.toFixed(4)}`);
    console.log(`   🔗 ${chain.explorer}/tx/${receipt2.hash}`);
    
    isExecuting = false;
    return {
      success: true,
      profitUsd: actualProfitUsd,
      gasUsd: totalGasUsd,
      netProfitUsd,
      txHash: receipt2.hash
    };
    
  } catch (e) {
    console.log(`   ❌ Error: ${e.message}`);
    isExecuting = false;
    return { success: false, error: e.message };
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// LOOP PRINCIPAL
// ═══════════════════════════════════════════════════════════════════════════════

async function tick() {
  if (!state.isRunning || isExecuting) return;
  
  const tickStart = Date.now();
  state.stats.totalScans++;
  state.stats.uptime = Math.floor((Date.now() - state.startTime) / 1000);
  
  // Alternar entre chains
  const chainKeys = Object.keys(CHAINS);
  const selectedChain = chainKeys[currentChainIndex % chainKeys.length];
  currentChainIndex++;
  
  state.stats.currentChain = selectedChain;
  state.banditStates.forEach(b => b.selected = b.chain === selectedChain);
  
  console.log(`\n[SCAN #${state.stats.totalScans}] ${CHAINS[selectedChain].name}`);
  
  try {
    const opportunities = await scanChain(selectedChain);
    const scanTime = Date.now() - tickStart;
    
    scanTimes.push(scanTime);
    if (scanTimes.length > 20) scanTimes.shift();
    state.stats.avgScanTimeMs = Math.round(scanTimes.reduce((a, b) => a + b, 0) / scanTimes.length);
    state.stats.scansPerSecond = Math.round(1000 / state.stats.avgScanTimeMs * 10) / 10;
    
    if (opportunities.length > 0) {
      state.stats.opportunitiesFound += opportunities.length;
      opportunities.sort((a, b) => b.netProfitUsd - a.netProfitUsd);
      
      state.opportunities = [...opportunities.slice(0, 5), ...state.opportunities].slice(0, 30);
      state.stats.lastOpportunity = opportunities[0];
      
      const best = opportunities[0];
      console.log(`   📊 ${scanTime}ms | ${opportunities.length} opps | Best: $${best.netProfitUsd.toFixed(4)}`);
      
      // EJECUTAR
      if (!state.isDryRun && CONFIG.AUTO_EXECUTE) {
        state.stats.tradesAttempted++;
        
        const result = await execute(best);
        
        if (result) {
          state.stats.tradesExecuted++;
          
          const tradeLog = {
            id: `tx-${Date.now()}`,
            timestamp: Date.now(),
            chain: best.chain,
            chainName: best.chainName,
            route: best.route,
            amountIn: best.amountInEth,
            spreadBps: best.spreadBps,
            expectedProfit: best.netProfitUsd.toFixed(4),
            actualProfit: result.success ? result.profitUsd.toFixed(4) : '0',
            gasCost: result.success ? result.gasUsd.toFixed(4) : '0',
            netProfit: result.success ? result.netProfitUsd.toFixed(4) : '0',
            txHash: result.txHash || '',
            status: result.success ? 'success' : 'failed',
            error: result.error || ''
          };
          
          state.tradeLogs.unshift(tradeLog);
          if (state.tradeLogs.length > 50) state.tradeLogs.pop();
          
          if (result.success) {
            state.stats.tradesSuccessful++;
            state.stats.totalProfitUsd += result.profitUsd;
            state.stats.totalGasUsd += result.gasUsd;
            state.stats.netProfitUsd = state.stats.totalProfitUsd - state.stats.totalGasUsd;
            state.stats.lastTrade = tradeLog;
            
            const bandit = state.banditStates.find(b => b.chain === best.chain);
            if (bandit) {
              bandit.wins++;
              bandit.attempts++;
              bandit.alpha++;
              bandit.winRate = (bandit.wins / bandit.attempts) * 100;
            }
          } else {
            const bandit = state.banditStates.find(b => b.chain === best.chain);
            if (bandit) {
              bandit.attempts++;
              bandit.beta++;
              bandit.winRate = bandit.attempts > 0 ? (bandit.wins / bandit.attempts) * 100 : 50;
            }
          }
          
          state.stats.winRate = state.stats.tradesExecuted > 0
            ? (state.stats.tradesSuccessful / state.stats.tradesExecuted) * 100
            : 0;
        }
      }
    } else {
      console.log(`   📊 ${scanTime}ms | No profitable opportunities`);
    }
    
    // Actualizar balances cada 20 scans
    if (state.stats.totalScans % 20 === 0) {
      for (const chainState of state.chains) {
        try {
          const balance = await providers[chainState.chain].getBalance(WALLET_ADDRESS);
          const balanceEth = parseFloat(ethers.formatEther(balance));
          chainState.balance = balanceEth.toFixed(6);
          chainState.balanceUsd = balanceEth * CONFIG.ETH_PRICE_USD;
          chainState.isActive = balanceEth > 0.001;
        } catch (e) {}
      }
    }
    
  } catch (e) {
    console.error(`   ❌ Error: ${e.message}`);
  }
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
  
  state.isDryRun = req.body?.dryRun === true;
  state.isRunning = true;
  state.startTime = Date.now();
  
  state.stats = {
    totalScans: 0, opportunitiesFound: 0, tradesAttempted: 0,
    tradesExecuted: 0, tradesSuccessful: 0, totalProfitUsd: 0,
    totalGasUsd: 0, netProfitUsd: 0, winRate: 0, avgScanTimeMs: 0,
    scansPerSecond: 0, uptime: 0, currentChain: 'base',
    lastOpportunity: null, lastTrade: null
  };
  state.tradeLogs = [];
  state.opportunities = [];
  scanTimes = [];
  currentChainIndex = 0;
  
  if (timer) clearInterval(timer);
  timer = setInterval(tick, CONFIG.SCAN_INTERVAL_MS);
  
  console.log(`\n[START] 🔥 SCALPER iniciado - ${state.isDryRun ? 'DRY RUN' : '⚠️ MODO REAL'}`);
  
  res.json({
    success: true,
    isRunning: true,
    isDryRun: state.isDryRun,
    mode: 'SCALPER_OPTIMIZED',
    config: CONFIG
  });
});

app.post('/api/defi/multichain-arb/stop', (req, res) => {
  state.isRunning = false;
  if (timer) { clearInterval(timer); timer = null; }
  console.log('[STOP] Bot detenido');
  res.json({ success: true, isRunning: false });
});

app.get('/api/defi/multichain-arb/health', (req, res) => {
  res.json({
    status: 'ok',
    mode: 'SCALPER_OPTIMIZED',
    port: PORT,
    running: state.isRunning,
    dryRun: state.isDryRun,
    wallet: WALLET_ADDRESS,
    config: CONFIG
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// INICIAR
// ═══════════════════════════════════════════════════════════════════════════════

app.listen(PORT, async () => {
  console.log(`
╔═══════════════════════════════════════════════════════════════════════════════╗
║                                                                               ║
║   🔥 SCALPER OPTIMIZADO - BASE + ARBITRUM                                     ║
║                                                                               ║
║   ✅ Puerto: ${PORT}                                                           ║
║   ✅ Wallet: ${WALLET_ADDRESS.slice(0, 10)}...${WALLET_ADDRESS.slice(-5)}                                  ║
║                                                                               ║
║   ⚡ Intervalo: ${CONFIG.SCAN_INTERVAL_MS}ms | Min Profit: $${CONFIG.MIN_PROFIT_USD}                            ║
║   ⚡ Fee Tiers: ${CONFIG.FEE_TIERS.map(f => f/100 + '%').join(', ')}                                     ║
║   ⚡ Amounts: ${CONFIG.TRADE_AMOUNTS_ETH.join(', ')} ETH                                  ║
║                                                                               ║
╚═══════════════════════════════════════════════════════════════════════════════╝
  `);
  
  await init();
  console.log('[READY] 🔥 Scalper listo. POST /api/defi/multichain-arb/start para iniciar.\n');
});

process.on('SIGINT', () => {
  if (timer) clearInterval(timer);
  process.exit(0);
});



 * ═══════════════════════════════════════════════════════════════════════════════
 * 🔥 SCALPER OPTIMIZADO - BASE + ARBITRUM ONLY
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * Versión optimizada que:
 * - Solo usa Base y Arbitrum (RPCs premium)
 * - Reduce llamadas paralelas para evitar rate limits
 * - Escaneo secuencial por chain
 * - Ejecución inmediata cuando detecta oportunidad
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
// CONFIGURACIÓN OPTIMIZADA
// ═══════════════════════════════════════════════════════════════════════════════

const CONFIG = {
  SCAN_INTERVAL_MS: 500,
  MIN_PROFIT_USD: 0.01,
  MAX_SLIPPAGE_BPS: 50,
  TRADE_AMOUNTS_ETH: [0.005, 0.01, 0.02],
  FEE_TIERS: [500, 3000],  // Solo los más líquidos
  AUTO_EXECUTE: true,
  MAX_GAS_GWEI: 10,
  ETH_PRICE_USD: 3500
};

const PRIVATE_KEY = process.env.VITE_ETH_PRIVATE_KEY;
const WALLET_ADDRESS = process.env.VITE_ETH_WALLET_ADDRESS;

if (!PRIVATE_KEY || !WALLET_ADDRESS) {
  console.error('❌ ERROR: Credenciales no configuradas');
  process.exit(1);
}

// ═══════════════════════════════════════════════════════════════════════════════
// CHAINS (Solo Base y Arbitrum con RPCs premium)
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

const ROUTER_ABI = [
  'function exactInputSingle((address tokenIn, address tokenOut, uint24 fee, address recipient, uint256 amountIn, uint256 amountOutMinimum, uint160 sqrtPriceLimitX96)) external payable returns (uint256 amountOut)'
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
// ESTADO
// ═══════════════════════════════════════════════════════════════════════════════

let state = {
  isRunning: false,
  isDryRun: false,
  startTime: null,
  mode: 'SCALPER_OPTIMIZED',
  stats: {
    totalScans: 0,
    opportunitiesFound: 0,
    tradesAttempted: 0,
    tradesExecuted: 0,
    tradesSuccessful: 0,
    totalProfitUsd: 0,
    totalGasUsd: 0,
    netProfitUsd: 0,
    winRate: 0,
    avgScanTimeMs: 0,
    scansPerSecond: 0,
    uptime: 0,
    currentChain: 'base',
    lastOpportunity: null,
    lastTrade: null
  },
  chains: [],
  tradeLogs: [],
  opportunities: [],
  banditStates: []
};

let timer = null;
let providers = {};
let signers = {};
let contracts = {};
let isExecuting = false;
let currentChainIndex = 0;
let scanTimes = [];

// ═══════════════════════════════════════════════════════════════════════════════
// INICIALIZAR
// ═══════════════════════════════════════════════════════════════════════════════

async function init() {
  console.log('[INIT] 🔌 Conectando a chains...\n');
  
  for (const [key, chain] of Object.entries(CHAINS)) {
    try {
      providers[key] = new ethers.JsonRpcProvider(chain.rpc);
      signers[key] = new ethers.Wallet(PRIVATE_KEY, providers[key]);
      
      contracts[key] = {
        quoter: new ethers.Contract(chain.quoter, QUOTER_ABI, providers[key]),
        router: new ethers.Contract(chain.router, ROUTER_ABI, signers[key]),
        weth: new ethers.Contract(chain.tokens.WETH, WETH_ABI, signers[key])
      };
      
      const balance = await providers[key].getBalance(WALLET_ADDRESS);
      const balanceEth = parseFloat(ethers.formatEther(balance));
      
      state.chains.push({
        chain: key,
        name: chain.name,
        chainId: chain.chainId,
        balance: balanceEth.toFixed(6),
        balanceUsd: balanceEth * CONFIG.ETH_PRICE_USD,
        routes: CONFIG.FEE_TIERS.length * CONFIG.TRADE_AMOUNTS_ETH.length,
        isActive: balanceEth > 0.001,
        lastScan: Date.now(),
        scansCompleted: 0,
        opportunitiesFound: 0,
        tradesExecuted: 0,
        explorer: chain.explorer,
        ethPrice: 0
      });
      
      state.banditStates.push({
        chain: key,
        alpha: 2,
        beta: 2,
        winRate: 50,
        selected: key === 'base',
        attempts: 0,
        wins: 0
      });
      
      console.log(`   ✅ ${chain.name}: ${balanceEth.toFixed(6)} ETH ($${(balanceEth * CONFIG.ETH_PRICE_USD).toFixed(2)})`);
    } catch (e) {
      console.error(`   ❌ ${chain.name}: ${e.message}`);
    }
  }
  console.log('');
}

// ═══════════════════════════════════════════════════════════════════════════════
// ESCANEO SECUENCIAL (evita rate limits)
// ═══════════════════════════════════════════════════════════════════════════════

async function scanChain(chainKey) {
  const chain = CHAINS[chainKey];
  const provider = providers[chainKey];
  const quoter = contracts[chainKey].quoter;
  const opportunities = [];
  
  try {
    // 1. Obtener gas price
    const feeData = await provider.getFeeData();
    const gasPrice = feeData.gasPrice || ethers.parseUnits('0.001', 'gwei');
    const gasPriceGwei = parseFloat(ethers.formatUnits(gasPrice, 'gwei'));
    
    if (gasPriceGwei > CONFIG.MAX_GAS_GWEI) {
      console.log(`   ⛽ Gas muy alto en ${chain.name}: ${gasPriceGwei.toFixed(2)} gwei`);
      return [];
    }
    
    const gasCostWei = gasPrice * 250000n;
    const gasCostUsd = parseFloat(ethers.formatEther(gasCostWei)) * CONFIG.ETH_PRICE_USD;
    
    // 2. Obtener precio ETH
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
    } catch (e) {}
    
    // Actualizar estado
    const chainState = state.chains.find(c => c.chain === chainKey);
    if (chainState) chainState.ethPrice = ethPrice;
    
    // 3. Escanear rutas SECUENCIALMENTE (no paralelo)
    for (const amountEth of CONFIG.TRADE_AMOUNTS_ETH) {
      const amountWei = ethers.parseEther(amountEth.toString());
      
      for (let i = 0; i < CONFIG.FEE_TIERS.length; i++) {
        for (let j = 0; j < CONFIG.FEE_TIERS.length; j++) {
          if (i === j) continue;
          
          try {
            // WETH → USDC
            const quote1 = await quoter.quoteExactInputSingle.staticCall({
              tokenIn: chain.tokens.WETH,
              tokenOut: chain.tokens.USDC,
              amountIn: amountWei,
              fee: CONFIG.FEE_TIERS[i],
              sqrtPriceLimitX96: 0n
            });
            const usdcOut = quote1[0];
            
            // USDC → WETH
            const quote2 = await quoter.quoteExactInputSingle.staticCall({
              tokenIn: chain.tokens.USDC,
              tokenOut: chain.tokens.WETH,
              amountIn: usdcOut,
              fee: CONFIG.FEE_TIERS[j],
              sqrtPriceLimitX96: 0n
            });
            const wethOut = quote2[0];
            
            const grossProfit = wethOut - amountWei;
            const netProfit = grossProfit - gasCostWei;
            
            if (netProfit > 0n) {
              const netProfitUsd = parseFloat(ethers.formatEther(netProfit)) * ethPrice;
              const spreadBps = Number((grossProfit * 10000n) / amountWei);
              
              if (netProfitUsd >= CONFIG.MIN_PROFIT_USD) {
                opportunities.push({
                  chain: chainKey,
                  chainName: chain.name,
                  type: 'SCALP',
                  route: `${CONFIG.FEE_TIERS[i]/100}%→${CONFIG.FEE_TIERS[j]/100}%`,
                  amountIn: amountWei,
                  amountInEth: amountEth,
                  fee1: CONFIG.FEE_TIERS[i],
                  fee2: CONFIG.FEE_TIERS[j],
                  usdcIntermediate: usdcOut,
                  wethOut,
                  grossProfit,
                  netProfit,
                  netProfitUsd,
                  gasCostUsd,
                  spreadBps,
                  ethPrice,
                  timestamp: Date.now(),
                  gasPrice: gasPriceGwei
                });
                
                console.log(`   💰 OPP: ${chain.name} ${amountEth}ETH ${CONFIG.FEE_TIERS[i]/100}%→${CONFIG.FEE_TIERS[j]/100}% = $${netProfitUsd.toFixed(4)}`);
              }
            }
          } catch (e) {
            // Pool no existe
          }
        }
      }
    }
    
  } catch (e) {
    console.error(`   ❌ Error ${chain.name}: ${e.message.slice(0, 50)}`);
  }
  
  return opportunities;
}

// ═══════════════════════════════════════════════════════════════════════════════
// EJECUCIÓN
// ═══════════════════════════════════════════════════════════════════════════════

async function execute(opp) {
  if (isExecuting) return null;
  isExecuting = true;
  
  const chain = CHAINS[opp.chain];
  const signer = signers[opp.chain];
  const provider = providers[opp.chain];
  const { router, weth } = contracts[opp.chain];
  
  console.log(`\n🔥 ═══════════════════════════════════════════════════════════════`);
  console.log(`   EJECUTANDO en ${chain.name}`);
  console.log(`   Route: ${opp.route}`);
  console.log(`   Amount: ${opp.amountInEth} ETH`);
  console.log(`   Expected: $${opp.netProfitUsd.toFixed(4)}`);
  
  try {
    // Verificar balance
    const balance = await provider.getBalance(WALLET_ADDRESS);
    if (balance < opp.amountIn + ethers.parseEther('0.002')) {
      console.log(`   ❌ Balance insuficiente`);
      isExecuting = false;
      return { success: false, error: 'Balance insuficiente' };
    }
    
    // 1. Wrap ETH
    console.log(`   📦 Wrapping...`);
    const wrapTx = await weth.deposit({ value: opp.amountIn, gasLimit: 50000 });
    await wrapTx.wait(1);
    
    // 2. Approve WETH
    const allowance = await weth.allowance(WALLET_ADDRESS, chain.router);
    if (allowance < opp.amountIn) {
      const approveTx = await weth.approve(chain.router, ethers.MaxUint256, { gasLimit: 50000 });
      await approveTx.wait(1);
    }
    
    // 3. SWAP 1: WETH → USDC
    console.log(`   🔄 ENTRADA: WETH → USDC...`);
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
    console.log(`   ✅ ENTRADA: ${receipt1.hash.slice(0, 20)}...`);
    
    // 4. Obtener balance USDC
    const usdc = new ethers.Contract(chain.tokens.USDC, ERC20_ABI, signer);
    const usdcBalance = await usdc.balanceOf(WALLET_ADDRESS);
    
    // 5. Approve USDC
    const usdcAllowance = await usdc.allowance(WALLET_ADDRESS, chain.router);
    if (usdcAllowance < usdcBalance) {
      const approveUsdcTx = await usdc.approve(chain.router, ethers.MaxUint256, { gasLimit: 50000 });
      await approveUsdcTx.wait(1);
    }
    
    // 6. SWAP 2: USDC → WETH
    console.log(`   🔄 SALIDA: USDC → WETH...`);
    const minWeth = (opp.wethOut * BigInt(10000 - CONFIG.MAX_SLIPPAGE_BPS)) / 10000n;
    
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
    console.log(`   ✅ SALIDA: ${receipt2.hash.slice(0, 20)}...`);
    
    // 7. Calcular profit
    const finalWeth = await weth.balanceOf(WALLET_ADDRESS);
    const actualProfit = finalWeth - opp.amountIn;
    const actualProfitUsd = parseFloat(ethers.formatEther(actualProfit)) * opp.ethPrice;
    
    const gas1 = receipt1.gasUsed * receipt1.gasPrice;
    const gas2 = receipt2.gasUsed * receipt2.gasPrice;
    const totalGasUsd = parseFloat(ethers.formatEther(gas1 + gas2)) * opp.ethPrice;
    
    const netProfitUsd = actualProfitUsd - totalGasUsd;
    
    console.log(`   ═══════════════════════════════════════════════════════════════`);
    console.log(`   💰 PROFIT: $${actualProfitUsd.toFixed(4)}`);
    console.log(`   ⛽ GAS: $${totalGasUsd.toFixed(4)}`);
    console.log(`   💵 NETO: $${netProfitUsd.toFixed(4)}`);
    console.log(`   🔗 ${chain.explorer}/tx/${receipt2.hash}`);
    
    isExecuting = false;
    return {
      success: true,
      profitUsd: actualProfitUsd,
      gasUsd: totalGasUsd,
      netProfitUsd,
      txHash: receipt2.hash
    };
    
  } catch (e) {
    console.log(`   ❌ Error: ${e.message}`);
    isExecuting = false;
    return { success: false, error: e.message };
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// LOOP PRINCIPAL
// ═══════════════════════════════════════════════════════════════════════════════

async function tick() {
  if (!state.isRunning || isExecuting) return;
  
  const tickStart = Date.now();
  state.stats.totalScans++;
  state.stats.uptime = Math.floor((Date.now() - state.startTime) / 1000);
  
  // Alternar entre chains
  const chainKeys = Object.keys(CHAINS);
  const selectedChain = chainKeys[currentChainIndex % chainKeys.length];
  currentChainIndex++;
  
  state.stats.currentChain = selectedChain;
  state.banditStates.forEach(b => b.selected = b.chain === selectedChain);
  
  console.log(`\n[SCAN #${state.stats.totalScans}] ${CHAINS[selectedChain].name}`);
  
  try {
    const opportunities = await scanChain(selectedChain);
    const scanTime = Date.now() - tickStart;
    
    scanTimes.push(scanTime);
    if (scanTimes.length > 20) scanTimes.shift();
    state.stats.avgScanTimeMs = Math.round(scanTimes.reduce((a, b) => a + b, 0) / scanTimes.length);
    state.stats.scansPerSecond = Math.round(1000 / state.stats.avgScanTimeMs * 10) / 10;
    
    if (opportunities.length > 0) {
      state.stats.opportunitiesFound += opportunities.length;
      opportunities.sort((a, b) => b.netProfitUsd - a.netProfitUsd);
      
      state.opportunities = [...opportunities.slice(0, 5), ...state.opportunities].slice(0, 30);
      state.stats.lastOpportunity = opportunities[0];
      
      const best = opportunities[0];
      console.log(`   📊 ${scanTime}ms | ${opportunities.length} opps | Best: $${best.netProfitUsd.toFixed(4)}`);
      
      // EJECUTAR
      if (!state.isDryRun && CONFIG.AUTO_EXECUTE) {
        state.stats.tradesAttempted++;
        
        const result = await execute(best);
        
        if (result) {
          state.stats.tradesExecuted++;
          
          const tradeLog = {
            id: `tx-${Date.now()}`,
            timestamp: Date.now(),
            chain: best.chain,
            chainName: best.chainName,
            route: best.route,
            amountIn: best.amountInEth,
            spreadBps: best.spreadBps,
            expectedProfit: best.netProfitUsd.toFixed(4),
            actualProfit: result.success ? result.profitUsd.toFixed(4) : '0',
            gasCost: result.success ? result.gasUsd.toFixed(4) : '0',
            netProfit: result.success ? result.netProfitUsd.toFixed(4) : '0',
            txHash: result.txHash || '',
            status: result.success ? 'success' : 'failed',
            error: result.error || ''
          };
          
          state.tradeLogs.unshift(tradeLog);
          if (state.tradeLogs.length > 50) state.tradeLogs.pop();
          
          if (result.success) {
            state.stats.tradesSuccessful++;
            state.stats.totalProfitUsd += result.profitUsd;
            state.stats.totalGasUsd += result.gasUsd;
            state.stats.netProfitUsd = state.stats.totalProfitUsd - state.stats.totalGasUsd;
            state.stats.lastTrade = tradeLog;
            
            const bandit = state.banditStates.find(b => b.chain === best.chain);
            if (bandit) {
              bandit.wins++;
              bandit.attempts++;
              bandit.alpha++;
              bandit.winRate = (bandit.wins / bandit.attempts) * 100;
            }
          } else {
            const bandit = state.banditStates.find(b => b.chain === best.chain);
            if (bandit) {
              bandit.attempts++;
              bandit.beta++;
              bandit.winRate = bandit.attempts > 0 ? (bandit.wins / bandit.attempts) * 100 : 50;
            }
          }
          
          state.stats.winRate = state.stats.tradesExecuted > 0
            ? (state.stats.tradesSuccessful / state.stats.tradesExecuted) * 100
            : 0;
        }
      }
    } else {
      console.log(`   📊 ${scanTime}ms | No profitable opportunities`);
    }
    
    // Actualizar balances cada 20 scans
    if (state.stats.totalScans % 20 === 0) {
      for (const chainState of state.chains) {
        try {
          const balance = await providers[chainState.chain].getBalance(WALLET_ADDRESS);
          const balanceEth = parseFloat(ethers.formatEther(balance));
          chainState.balance = balanceEth.toFixed(6);
          chainState.balanceUsd = balanceEth * CONFIG.ETH_PRICE_USD;
          chainState.isActive = balanceEth > 0.001;
        } catch (e) {}
      }
    }
    
  } catch (e) {
    console.error(`   ❌ Error: ${e.message}`);
  }
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
  
  state.isDryRun = req.body?.dryRun === true;
  state.isRunning = true;
  state.startTime = Date.now();
  
  state.stats = {
    totalScans: 0, opportunitiesFound: 0, tradesAttempted: 0,
    tradesExecuted: 0, tradesSuccessful: 0, totalProfitUsd: 0,
    totalGasUsd: 0, netProfitUsd: 0, winRate: 0, avgScanTimeMs: 0,
    scansPerSecond: 0, uptime: 0, currentChain: 'base',
    lastOpportunity: null, lastTrade: null
  };
  state.tradeLogs = [];
  state.opportunities = [];
  scanTimes = [];
  currentChainIndex = 0;
  
  if (timer) clearInterval(timer);
  timer = setInterval(tick, CONFIG.SCAN_INTERVAL_MS);
  
  console.log(`\n[START] 🔥 SCALPER iniciado - ${state.isDryRun ? 'DRY RUN' : '⚠️ MODO REAL'}`);
  
  res.json({
    success: true,
    isRunning: true,
    isDryRun: state.isDryRun,
    mode: 'SCALPER_OPTIMIZED',
    config: CONFIG
  });
});

app.post('/api/defi/multichain-arb/stop', (req, res) => {
  state.isRunning = false;
  if (timer) { clearInterval(timer); timer = null; }
  console.log('[STOP] Bot detenido');
  res.json({ success: true, isRunning: false });
});

app.get('/api/defi/multichain-arb/health', (req, res) => {
  res.json({
    status: 'ok',
    mode: 'SCALPER_OPTIMIZED',
    port: PORT,
    running: state.isRunning,
    dryRun: state.isDryRun,
    wallet: WALLET_ADDRESS,
    config: CONFIG
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// INICIAR
// ═══════════════════════════════════════════════════════════════════════════════

app.listen(PORT, async () => {
  console.log(`
╔═══════════════════════════════════════════════════════════════════════════════╗
║                                                                               ║
║   🔥 SCALPER OPTIMIZADO - BASE + ARBITRUM                                     ║
║                                                                               ║
║   ✅ Puerto: ${PORT}                                                           ║
║   ✅ Wallet: ${WALLET_ADDRESS.slice(0, 10)}...${WALLET_ADDRESS.slice(-5)}                                  ║
║                                                                               ║
║   ⚡ Intervalo: ${CONFIG.SCAN_INTERVAL_MS}ms | Min Profit: $${CONFIG.MIN_PROFIT_USD}                            ║
║   ⚡ Fee Tiers: ${CONFIG.FEE_TIERS.map(f => f/100 + '%').join(', ')}                                     ║
║   ⚡ Amounts: ${CONFIG.TRADE_AMOUNTS_ETH.join(', ')} ETH                                  ║
║                                                                               ║
╚═══════════════════════════════════════════════════════════════════════════════╝
  `);
  
  await init();
  console.log('[READY] 🔥 Scalper listo. POST /api/defi/multichain-arb/start para iniciar.\n');
});

process.on('SIGINT', () => {
  if (timer) clearInterval(timer);
  process.exit(0);
});


 * ═══════════════════════════════════════════════════════════════════════════════
 * 🔥 SCALPER OPTIMIZADO - BASE + ARBITRUM ONLY
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * Versión optimizada que:
 * - Solo usa Base y Arbitrum (RPCs premium)
 * - Reduce llamadas paralelas para evitar rate limits
 * - Escaneo secuencial por chain
 * - Ejecución inmediata cuando detecta oportunidad
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
// CONFIGURACIÓN OPTIMIZADA
// ═══════════════════════════════════════════════════════════════════════════════

const CONFIG = {
  SCAN_INTERVAL_MS: 500,
  MIN_PROFIT_USD: 0.01,
  MAX_SLIPPAGE_BPS: 50,
  TRADE_AMOUNTS_ETH: [0.005, 0.01, 0.02],
  FEE_TIERS: [500, 3000],  // Solo los más líquidos
  AUTO_EXECUTE: true,
  MAX_GAS_GWEI: 10,
  ETH_PRICE_USD: 3500
};

const PRIVATE_KEY = process.env.VITE_ETH_PRIVATE_KEY;
const WALLET_ADDRESS = process.env.VITE_ETH_WALLET_ADDRESS;

if (!PRIVATE_KEY || !WALLET_ADDRESS) {
  console.error('❌ ERROR: Credenciales no configuradas');
  process.exit(1);
}

// ═══════════════════════════════════════════════════════════════════════════════
// CHAINS (Solo Base y Arbitrum con RPCs premium)
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

const ROUTER_ABI = [
  'function exactInputSingle((address tokenIn, address tokenOut, uint24 fee, address recipient, uint256 amountIn, uint256 amountOutMinimum, uint160 sqrtPriceLimitX96)) external payable returns (uint256 amountOut)'
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
// ESTADO
// ═══════════════════════════════════════════════════════════════════════════════

let state = {
  isRunning: false,
  isDryRun: false,
  startTime: null,
  mode: 'SCALPER_OPTIMIZED',
  stats: {
    totalScans: 0,
    opportunitiesFound: 0,
    tradesAttempted: 0,
    tradesExecuted: 0,
    tradesSuccessful: 0,
    totalProfitUsd: 0,
    totalGasUsd: 0,
    netProfitUsd: 0,
    winRate: 0,
    avgScanTimeMs: 0,
    scansPerSecond: 0,
    uptime: 0,
    currentChain: 'base',
    lastOpportunity: null,
    lastTrade: null
  },
  chains: [],
  tradeLogs: [],
  opportunities: [],
  banditStates: []
};

let timer = null;
let providers = {};
let signers = {};
let contracts = {};
let isExecuting = false;
let currentChainIndex = 0;
let scanTimes = [];

// ═══════════════════════════════════════════════════════════════════════════════
// INICIALIZAR
// ═══════════════════════════════════════════════════════════════════════════════

async function init() {
  console.log('[INIT] 🔌 Conectando a chains...\n');
  
  for (const [key, chain] of Object.entries(CHAINS)) {
    try {
      providers[key] = new ethers.JsonRpcProvider(chain.rpc);
      signers[key] = new ethers.Wallet(PRIVATE_KEY, providers[key]);
      
      contracts[key] = {
        quoter: new ethers.Contract(chain.quoter, QUOTER_ABI, providers[key]),
        router: new ethers.Contract(chain.router, ROUTER_ABI, signers[key]),
        weth: new ethers.Contract(chain.tokens.WETH, WETH_ABI, signers[key])
      };
      
      const balance = await providers[key].getBalance(WALLET_ADDRESS);
      const balanceEth = parseFloat(ethers.formatEther(balance));
      
      state.chains.push({
        chain: key,
        name: chain.name,
        chainId: chain.chainId,
        balance: balanceEth.toFixed(6),
        balanceUsd: balanceEth * CONFIG.ETH_PRICE_USD,
        routes: CONFIG.FEE_TIERS.length * CONFIG.TRADE_AMOUNTS_ETH.length,
        isActive: balanceEth > 0.001,
        lastScan: Date.now(),
        scansCompleted: 0,
        opportunitiesFound: 0,
        tradesExecuted: 0,
        explorer: chain.explorer,
        ethPrice: 0
      });
      
      state.banditStates.push({
        chain: key,
        alpha: 2,
        beta: 2,
        winRate: 50,
        selected: key === 'base',
        attempts: 0,
        wins: 0
      });
      
      console.log(`   ✅ ${chain.name}: ${balanceEth.toFixed(6)} ETH ($${(balanceEth * CONFIG.ETH_PRICE_USD).toFixed(2)})`);
    } catch (e) {
      console.error(`   ❌ ${chain.name}: ${e.message}`);
    }
  }
  console.log('');
}

// ═══════════════════════════════════════════════════════════════════════════════
// ESCANEO SECUENCIAL (evita rate limits)
// ═══════════════════════════════════════════════════════════════════════════════

async function scanChain(chainKey) {
  const chain = CHAINS[chainKey];
  const provider = providers[chainKey];
  const quoter = contracts[chainKey].quoter;
  const opportunities = [];
  
  try {
    // 1. Obtener gas price
    const feeData = await provider.getFeeData();
    const gasPrice = feeData.gasPrice || ethers.parseUnits('0.001', 'gwei');
    const gasPriceGwei = parseFloat(ethers.formatUnits(gasPrice, 'gwei'));
    
    if (gasPriceGwei > CONFIG.MAX_GAS_GWEI) {
      console.log(`   ⛽ Gas muy alto en ${chain.name}: ${gasPriceGwei.toFixed(2)} gwei`);
      return [];
    }
    
    const gasCostWei = gasPrice * 250000n;
    const gasCostUsd = parseFloat(ethers.formatEther(gasCostWei)) * CONFIG.ETH_PRICE_USD;
    
    // 2. Obtener precio ETH
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
    } catch (e) {}
    
    // Actualizar estado
    const chainState = state.chains.find(c => c.chain === chainKey);
    if (chainState) chainState.ethPrice = ethPrice;
    
    // 3. Escanear rutas SECUENCIALMENTE (no paralelo)
    for (const amountEth of CONFIG.TRADE_AMOUNTS_ETH) {
      const amountWei = ethers.parseEther(amountEth.toString());
      
      for (let i = 0; i < CONFIG.FEE_TIERS.length; i++) {
        for (let j = 0; j < CONFIG.FEE_TIERS.length; j++) {
          if (i === j) continue;
          
          try {
            // WETH → USDC
            const quote1 = await quoter.quoteExactInputSingle.staticCall({
              tokenIn: chain.tokens.WETH,
              tokenOut: chain.tokens.USDC,
              amountIn: amountWei,
              fee: CONFIG.FEE_TIERS[i],
              sqrtPriceLimitX96: 0n
            });
            const usdcOut = quote1[0];
            
            // USDC → WETH
            const quote2 = await quoter.quoteExactInputSingle.staticCall({
              tokenIn: chain.tokens.USDC,
              tokenOut: chain.tokens.WETH,
              amountIn: usdcOut,
              fee: CONFIG.FEE_TIERS[j],
              sqrtPriceLimitX96: 0n
            });
            const wethOut = quote2[0];
            
            const grossProfit = wethOut - amountWei;
            const netProfit = grossProfit - gasCostWei;
            
            if (netProfit > 0n) {
              const netProfitUsd = parseFloat(ethers.formatEther(netProfit)) * ethPrice;
              const spreadBps = Number((grossProfit * 10000n) / amountWei);
              
              if (netProfitUsd >= CONFIG.MIN_PROFIT_USD) {
                opportunities.push({
                  chain: chainKey,
                  chainName: chain.name,
                  type: 'SCALP',
                  route: `${CONFIG.FEE_TIERS[i]/100}%→${CONFIG.FEE_TIERS[j]/100}%`,
                  amountIn: amountWei,
                  amountInEth: amountEth,
                  fee1: CONFIG.FEE_TIERS[i],
                  fee2: CONFIG.FEE_TIERS[j],
                  usdcIntermediate: usdcOut,
                  wethOut,
                  grossProfit,
                  netProfit,
                  netProfitUsd,
                  gasCostUsd,
                  spreadBps,
                  ethPrice,
                  timestamp: Date.now(),
                  gasPrice: gasPriceGwei
                });
                
                console.log(`   💰 OPP: ${chain.name} ${amountEth}ETH ${CONFIG.FEE_TIERS[i]/100}%→${CONFIG.FEE_TIERS[j]/100}% = $${netProfitUsd.toFixed(4)}`);
              }
            }
          } catch (e) {
            // Pool no existe
          }
        }
      }
    }
    
  } catch (e) {
    console.error(`   ❌ Error ${chain.name}: ${e.message.slice(0, 50)}`);
  }
  
  return opportunities;
}

// ═══════════════════════════════════════════════════════════════════════════════
// EJECUCIÓN
// ═══════════════════════════════════════════════════════════════════════════════

async function execute(opp) {
  if (isExecuting) return null;
  isExecuting = true;
  
  const chain = CHAINS[opp.chain];
  const signer = signers[opp.chain];
  const provider = providers[opp.chain];
  const { router, weth } = contracts[opp.chain];
  
  console.log(`\n🔥 ═══════════════════════════════════════════════════════════════`);
  console.log(`   EJECUTANDO en ${chain.name}`);
  console.log(`   Route: ${opp.route}`);
  console.log(`   Amount: ${opp.amountInEth} ETH`);
  console.log(`   Expected: $${opp.netProfitUsd.toFixed(4)}`);
  
  try {
    // Verificar balance
    const balance = await provider.getBalance(WALLET_ADDRESS);
    if (balance < opp.amountIn + ethers.parseEther('0.002')) {
      console.log(`   ❌ Balance insuficiente`);
      isExecuting = false;
      return { success: false, error: 'Balance insuficiente' };
    }
    
    // 1. Wrap ETH
    console.log(`   📦 Wrapping...`);
    const wrapTx = await weth.deposit({ value: opp.amountIn, gasLimit: 50000 });
    await wrapTx.wait(1);
    
    // 2. Approve WETH
    const allowance = await weth.allowance(WALLET_ADDRESS, chain.router);
    if (allowance < opp.amountIn) {
      const approveTx = await weth.approve(chain.router, ethers.MaxUint256, { gasLimit: 50000 });
      await approveTx.wait(1);
    }
    
    // 3. SWAP 1: WETH → USDC
    console.log(`   🔄 ENTRADA: WETH → USDC...`);
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
    console.log(`   ✅ ENTRADA: ${receipt1.hash.slice(0, 20)}...`);
    
    // 4. Obtener balance USDC
    const usdc = new ethers.Contract(chain.tokens.USDC, ERC20_ABI, signer);
    const usdcBalance = await usdc.balanceOf(WALLET_ADDRESS);
    
    // 5. Approve USDC
    const usdcAllowance = await usdc.allowance(WALLET_ADDRESS, chain.router);
    if (usdcAllowance < usdcBalance) {
      const approveUsdcTx = await usdc.approve(chain.router, ethers.MaxUint256, { gasLimit: 50000 });
      await approveUsdcTx.wait(1);
    }
    
    // 6. SWAP 2: USDC → WETH
    console.log(`   🔄 SALIDA: USDC → WETH...`);
    const minWeth = (opp.wethOut * BigInt(10000 - CONFIG.MAX_SLIPPAGE_BPS)) / 10000n;
    
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
    console.log(`   ✅ SALIDA: ${receipt2.hash.slice(0, 20)}...`);
    
    // 7. Calcular profit
    const finalWeth = await weth.balanceOf(WALLET_ADDRESS);
    const actualProfit = finalWeth - opp.amountIn;
    const actualProfitUsd = parseFloat(ethers.formatEther(actualProfit)) * opp.ethPrice;
    
    const gas1 = receipt1.gasUsed * receipt1.gasPrice;
    const gas2 = receipt2.gasUsed * receipt2.gasPrice;
    const totalGasUsd = parseFloat(ethers.formatEther(gas1 + gas2)) * opp.ethPrice;
    
    const netProfitUsd = actualProfitUsd - totalGasUsd;
    
    console.log(`   ═══════════════════════════════════════════════════════════════`);
    console.log(`   💰 PROFIT: $${actualProfitUsd.toFixed(4)}`);
    console.log(`   ⛽ GAS: $${totalGasUsd.toFixed(4)}`);
    console.log(`   💵 NETO: $${netProfitUsd.toFixed(4)}`);
    console.log(`   🔗 ${chain.explorer}/tx/${receipt2.hash}`);
    
    isExecuting = false;
    return {
      success: true,
      profitUsd: actualProfitUsd,
      gasUsd: totalGasUsd,
      netProfitUsd,
      txHash: receipt2.hash
    };
    
  } catch (e) {
    console.log(`   ❌ Error: ${e.message}`);
    isExecuting = false;
    return { success: false, error: e.message };
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// LOOP PRINCIPAL
// ═══════════════════════════════════════════════════════════════════════════════

async function tick() {
  if (!state.isRunning || isExecuting) return;
  
  const tickStart = Date.now();
  state.stats.totalScans++;
  state.stats.uptime = Math.floor((Date.now() - state.startTime) / 1000);
  
  // Alternar entre chains
  const chainKeys = Object.keys(CHAINS);
  const selectedChain = chainKeys[currentChainIndex % chainKeys.length];
  currentChainIndex++;
  
  state.stats.currentChain = selectedChain;
  state.banditStates.forEach(b => b.selected = b.chain === selectedChain);
  
  console.log(`\n[SCAN #${state.stats.totalScans}] ${CHAINS[selectedChain].name}`);
  
  try {
    const opportunities = await scanChain(selectedChain);
    const scanTime = Date.now() - tickStart;
    
    scanTimes.push(scanTime);
    if (scanTimes.length > 20) scanTimes.shift();
    state.stats.avgScanTimeMs = Math.round(scanTimes.reduce((a, b) => a + b, 0) / scanTimes.length);
    state.stats.scansPerSecond = Math.round(1000 / state.stats.avgScanTimeMs * 10) / 10;
    
    if (opportunities.length > 0) {
      state.stats.opportunitiesFound += opportunities.length;
      opportunities.sort((a, b) => b.netProfitUsd - a.netProfitUsd);
      
      state.opportunities = [...opportunities.slice(0, 5), ...state.opportunities].slice(0, 30);
      state.stats.lastOpportunity = opportunities[0];
      
      const best = opportunities[0];
      console.log(`   📊 ${scanTime}ms | ${opportunities.length} opps | Best: $${best.netProfitUsd.toFixed(4)}`);
      
      // EJECUTAR
      if (!state.isDryRun && CONFIG.AUTO_EXECUTE) {
        state.stats.tradesAttempted++;
        
        const result = await execute(best);
        
        if (result) {
          state.stats.tradesExecuted++;
          
          const tradeLog = {
            id: `tx-${Date.now()}`,
            timestamp: Date.now(),
            chain: best.chain,
            chainName: best.chainName,
            route: best.route,
            amountIn: best.amountInEth,
            spreadBps: best.spreadBps,
            expectedProfit: best.netProfitUsd.toFixed(4),
            actualProfit: result.success ? result.profitUsd.toFixed(4) : '0',
            gasCost: result.success ? result.gasUsd.toFixed(4) : '0',
            netProfit: result.success ? result.netProfitUsd.toFixed(4) : '0',
            txHash: result.txHash || '',
            status: result.success ? 'success' : 'failed',
            error: result.error || ''
          };
          
          state.tradeLogs.unshift(tradeLog);
          if (state.tradeLogs.length > 50) state.tradeLogs.pop();
          
          if (result.success) {
            state.stats.tradesSuccessful++;
            state.stats.totalProfitUsd += result.profitUsd;
            state.stats.totalGasUsd += result.gasUsd;
            state.stats.netProfitUsd = state.stats.totalProfitUsd - state.stats.totalGasUsd;
            state.stats.lastTrade = tradeLog;
            
            const bandit = state.banditStates.find(b => b.chain === best.chain);
            if (bandit) {
              bandit.wins++;
              bandit.attempts++;
              bandit.alpha++;
              bandit.winRate = (bandit.wins / bandit.attempts) * 100;
            }
          } else {
            const bandit = state.banditStates.find(b => b.chain === best.chain);
            if (bandit) {
              bandit.attempts++;
              bandit.beta++;
              bandit.winRate = bandit.attempts > 0 ? (bandit.wins / bandit.attempts) * 100 : 50;
            }
          }
          
          state.stats.winRate = state.stats.tradesExecuted > 0
            ? (state.stats.tradesSuccessful / state.stats.tradesExecuted) * 100
            : 0;
        }
      }
    } else {
      console.log(`   📊 ${scanTime}ms | No profitable opportunities`);
    }
    
    // Actualizar balances cada 20 scans
    if (state.stats.totalScans % 20 === 0) {
      for (const chainState of state.chains) {
        try {
          const balance = await providers[chainState.chain].getBalance(WALLET_ADDRESS);
          const balanceEth = parseFloat(ethers.formatEther(balance));
          chainState.balance = balanceEth.toFixed(6);
          chainState.balanceUsd = balanceEth * CONFIG.ETH_PRICE_USD;
          chainState.isActive = balanceEth > 0.001;
        } catch (e) {}
      }
    }
    
  } catch (e) {
    console.error(`   ❌ Error: ${e.message}`);
  }
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
  
  state.isDryRun = req.body?.dryRun === true;
  state.isRunning = true;
  state.startTime = Date.now();
  
  state.stats = {
    totalScans: 0, opportunitiesFound: 0, tradesAttempted: 0,
    tradesExecuted: 0, tradesSuccessful: 0, totalProfitUsd: 0,
    totalGasUsd: 0, netProfitUsd: 0, winRate: 0, avgScanTimeMs: 0,
    scansPerSecond: 0, uptime: 0, currentChain: 'base',
    lastOpportunity: null, lastTrade: null
  };
  state.tradeLogs = [];
  state.opportunities = [];
  scanTimes = [];
  currentChainIndex = 0;
  
  if (timer) clearInterval(timer);
  timer = setInterval(tick, CONFIG.SCAN_INTERVAL_MS);
  
  console.log(`\n[START] 🔥 SCALPER iniciado - ${state.isDryRun ? 'DRY RUN' : '⚠️ MODO REAL'}`);
  
  res.json({
    success: true,
    isRunning: true,
    isDryRun: state.isDryRun,
    mode: 'SCALPER_OPTIMIZED',
    config: CONFIG
  });
});

app.post('/api/defi/multichain-arb/stop', (req, res) => {
  state.isRunning = false;
  if (timer) { clearInterval(timer); timer = null; }
  console.log('[STOP] Bot detenido');
  res.json({ success: true, isRunning: false });
});

app.get('/api/defi/multichain-arb/health', (req, res) => {
  res.json({
    status: 'ok',
    mode: 'SCALPER_OPTIMIZED',
    port: PORT,
    running: state.isRunning,
    dryRun: state.isDryRun,
    wallet: WALLET_ADDRESS,
    config: CONFIG
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// INICIAR
// ═══════════════════════════════════════════════════════════════════════════════

app.listen(PORT, async () => {
  console.log(`
╔═══════════════════════════════════════════════════════════════════════════════╗
║                                                                               ║
║   🔥 SCALPER OPTIMIZADO - BASE + ARBITRUM                                     ║
║                                                                               ║
║   ✅ Puerto: ${PORT}                                                           ║
║   ✅ Wallet: ${WALLET_ADDRESS.slice(0, 10)}...${WALLET_ADDRESS.slice(-5)}                                  ║
║                                                                               ║
║   ⚡ Intervalo: ${CONFIG.SCAN_INTERVAL_MS}ms | Min Profit: $${CONFIG.MIN_PROFIT_USD}                            ║
║   ⚡ Fee Tiers: ${CONFIG.FEE_TIERS.map(f => f/100 + '%').join(', ')}                                     ║
║   ⚡ Amounts: ${CONFIG.TRADE_AMOUNTS_ETH.join(', ')} ETH                                  ║
║                                                                               ║
╚═══════════════════════════════════════════════════════════════════════════════╝
  `);
  
  await init();
  console.log('[READY] 🔥 Scalper listo. POST /api/defi/multichain-arb/start para iniciar.\n');
});

process.on('SIGINT', () => {
  if (timer) clearInterval(timer);
  process.exit(0);
});


 * ═══════════════════════════════════════════════════════════════════════════════
 * 🔥 SCALPER OPTIMIZADO - BASE + ARBITRUM ONLY
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * Versión optimizada que:
 * - Solo usa Base y Arbitrum (RPCs premium)
 * - Reduce llamadas paralelas para evitar rate limits
 * - Escaneo secuencial por chain
 * - Ejecución inmediata cuando detecta oportunidad
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
// CONFIGURACIÓN OPTIMIZADA
// ═══════════════════════════════════════════════════════════════════════════════

const CONFIG = {
  SCAN_INTERVAL_MS: 500,
  MIN_PROFIT_USD: 0.01,
  MAX_SLIPPAGE_BPS: 50,
  TRADE_AMOUNTS_ETH: [0.005, 0.01, 0.02],
  FEE_TIERS: [500, 3000],  // Solo los más líquidos
  AUTO_EXECUTE: true,
  MAX_GAS_GWEI: 10,
  ETH_PRICE_USD: 3500
};

const PRIVATE_KEY = process.env.VITE_ETH_PRIVATE_KEY;
const WALLET_ADDRESS = process.env.VITE_ETH_WALLET_ADDRESS;

if (!PRIVATE_KEY || !WALLET_ADDRESS) {
  console.error('❌ ERROR: Credenciales no configuradas');
  process.exit(1);
}

// ═══════════════════════════════════════════════════════════════════════════════
// CHAINS (Solo Base y Arbitrum con RPCs premium)
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

const ROUTER_ABI = [
  'function exactInputSingle((address tokenIn, address tokenOut, uint24 fee, address recipient, uint256 amountIn, uint256 amountOutMinimum, uint160 sqrtPriceLimitX96)) external payable returns (uint256 amountOut)'
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
// ESTADO
// ═══════════════════════════════════════════════════════════════════════════════

let state = {
  isRunning: false,
  isDryRun: false,
  startTime: null,
  mode: 'SCALPER_OPTIMIZED',
  stats: {
    totalScans: 0,
    opportunitiesFound: 0,
    tradesAttempted: 0,
    tradesExecuted: 0,
    tradesSuccessful: 0,
    totalProfitUsd: 0,
    totalGasUsd: 0,
    netProfitUsd: 0,
    winRate: 0,
    avgScanTimeMs: 0,
    scansPerSecond: 0,
    uptime: 0,
    currentChain: 'base',
    lastOpportunity: null,
    lastTrade: null
  },
  chains: [],
  tradeLogs: [],
  opportunities: [],
  banditStates: []
};

let timer = null;
let providers = {};
let signers = {};
let contracts = {};
let isExecuting = false;
let currentChainIndex = 0;
let scanTimes = [];

// ═══════════════════════════════════════════════════════════════════════════════
// INICIALIZAR
// ═══════════════════════════════════════════════════════════════════════════════

async function init() {
  console.log('[INIT] 🔌 Conectando a chains...\n');
  
  for (const [key, chain] of Object.entries(CHAINS)) {
    try {
      providers[key] = new ethers.JsonRpcProvider(chain.rpc);
      signers[key] = new ethers.Wallet(PRIVATE_KEY, providers[key]);
      
      contracts[key] = {
        quoter: new ethers.Contract(chain.quoter, QUOTER_ABI, providers[key]),
        router: new ethers.Contract(chain.router, ROUTER_ABI, signers[key]),
        weth: new ethers.Contract(chain.tokens.WETH, WETH_ABI, signers[key])
      };
      
      const balance = await providers[key].getBalance(WALLET_ADDRESS);
      const balanceEth = parseFloat(ethers.formatEther(balance));
      
      state.chains.push({
        chain: key,
        name: chain.name,
        chainId: chain.chainId,
        balance: balanceEth.toFixed(6),
        balanceUsd: balanceEth * CONFIG.ETH_PRICE_USD,
        routes: CONFIG.FEE_TIERS.length * CONFIG.TRADE_AMOUNTS_ETH.length,
        isActive: balanceEth > 0.001,
        lastScan: Date.now(),
        scansCompleted: 0,
        opportunitiesFound: 0,
        tradesExecuted: 0,
        explorer: chain.explorer,
        ethPrice: 0
      });
      
      state.banditStates.push({
        chain: key,
        alpha: 2,
        beta: 2,
        winRate: 50,
        selected: key === 'base',
        attempts: 0,
        wins: 0
      });
      
      console.log(`   ✅ ${chain.name}: ${balanceEth.toFixed(6)} ETH ($${(balanceEth * CONFIG.ETH_PRICE_USD).toFixed(2)})`);
    } catch (e) {
      console.error(`   ❌ ${chain.name}: ${e.message}`);
    }
  }
  console.log('');
}

// ═══════════════════════════════════════════════════════════════════════════════
// ESCANEO SECUENCIAL (evita rate limits)
// ═══════════════════════════════════════════════════════════════════════════════

async function scanChain(chainKey) {
  const chain = CHAINS[chainKey];
  const provider = providers[chainKey];
  const quoter = contracts[chainKey].quoter;
  const opportunities = [];
  
  try {
    // 1. Obtener gas price
    const feeData = await provider.getFeeData();
    const gasPrice = feeData.gasPrice || ethers.parseUnits('0.001', 'gwei');
    const gasPriceGwei = parseFloat(ethers.formatUnits(gasPrice, 'gwei'));
    
    if (gasPriceGwei > CONFIG.MAX_GAS_GWEI) {
      console.log(`   ⛽ Gas muy alto en ${chain.name}: ${gasPriceGwei.toFixed(2)} gwei`);
      return [];
    }
    
    const gasCostWei = gasPrice * 250000n;
    const gasCostUsd = parseFloat(ethers.formatEther(gasCostWei)) * CONFIG.ETH_PRICE_USD;
    
    // 2. Obtener precio ETH
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
    } catch (e) {}
    
    // Actualizar estado
    const chainState = state.chains.find(c => c.chain === chainKey);
    if (chainState) chainState.ethPrice = ethPrice;
    
    // 3. Escanear rutas SECUENCIALMENTE (no paralelo)
    for (const amountEth of CONFIG.TRADE_AMOUNTS_ETH) {
      const amountWei = ethers.parseEther(amountEth.toString());
      
      for (let i = 0; i < CONFIG.FEE_TIERS.length; i++) {
        for (let j = 0; j < CONFIG.FEE_TIERS.length; j++) {
          if (i === j) continue;
          
          try {
            // WETH → USDC
            const quote1 = await quoter.quoteExactInputSingle.staticCall({
              tokenIn: chain.tokens.WETH,
              tokenOut: chain.tokens.USDC,
              amountIn: amountWei,
              fee: CONFIG.FEE_TIERS[i],
              sqrtPriceLimitX96: 0n
            });
            const usdcOut = quote1[0];
            
            // USDC → WETH
            const quote2 = await quoter.quoteExactInputSingle.staticCall({
              tokenIn: chain.tokens.USDC,
              tokenOut: chain.tokens.WETH,
              amountIn: usdcOut,
              fee: CONFIG.FEE_TIERS[j],
              sqrtPriceLimitX96: 0n
            });
            const wethOut = quote2[0];
            
            const grossProfit = wethOut - amountWei;
            const netProfit = grossProfit - gasCostWei;
            
            if (netProfit > 0n) {
              const netProfitUsd = parseFloat(ethers.formatEther(netProfit)) * ethPrice;
              const spreadBps = Number((grossProfit * 10000n) / amountWei);
              
              if (netProfitUsd >= CONFIG.MIN_PROFIT_USD) {
                opportunities.push({
                  chain: chainKey,
                  chainName: chain.name,
                  type: 'SCALP',
                  route: `${CONFIG.FEE_TIERS[i]/100}%→${CONFIG.FEE_TIERS[j]/100}%`,
                  amountIn: amountWei,
                  amountInEth: amountEth,
                  fee1: CONFIG.FEE_TIERS[i],
                  fee2: CONFIG.FEE_TIERS[j],
                  usdcIntermediate: usdcOut,
                  wethOut,
                  grossProfit,
                  netProfit,
                  netProfitUsd,
                  gasCostUsd,
                  spreadBps,
                  ethPrice,
                  timestamp: Date.now(),
                  gasPrice: gasPriceGwei
                });
                
                console.log(`   💰 OPP: ${chain.name} ${amountEth}ETH ${CONFIG.FEE_TIERS[i]/100}%→${CONFIG.FEE_TIERS[j]/100}% = $${netProfitUsd.toFixed(4)}`);
              }
            }
          } catch (e) {
            // Pool no existe
          }
        }
      }
    }
    
  } catch (e) {
    console.error(`   ❌ Error ${chain.name}: ${e.message.slice(0, 50)}`);
  }
  
  return opportunities;
}

// ═══════════════════════════════════════════════════════════════════════════════
// EJECUCIÓN
// ═══════════════════════════════════════════════════════════════════════════════

async function execute(opp) {
  if (isExecuting) return null;
  isExecuting = true;
  
  const chain = CHAINS[opp.chain];
  const signer = signers[opp.chain];
  const provider = providers[opp.chain];
  const { router, weth } = contracts[opp.chain];
  
  console.log(`\n🔥 ═══════════════════════════════════════════════════════════════`);
  console.log(`   EJECUTANDO en ${chain.name}`);
  console.log(`   Route: ${opp.route}`);
  console.log(`   Amount: ${opp.amountInEth} ETH`);
  console.log(`   Expected: $${opp.netProfitUsd.toFixed(4)}`);
  
  try {
    // Verificar balance
    const balance = await provider.getBalance(WALLET_ADDRESS);
    if (balance < opp.amountIn + ethers.parseEther('0.002')) {
      console.log(`   ❌ Balance insuficiente`);
      isExecuting = false;
      return { success: false, error: 'Balance insuficiente' };
    }
    
    // 1. Wrap ETH
    console.log(`   📦 Wrapping...`);
    const wrapTx = await weth.deposit({ value: opp.amountIn, gasLimit: 50000 });
    await wrapTx.wait(1);
    
    // 2. Approve WETH
    const allowance = await weth.allowance(WALLET_ADDRESS, chain.router);
    if (allowance < opp.amountIn) {
      const approveTx = await weth.approve(chain.router, ethers.MaxUint256, { gasLimit: 50000 });
      await approveTx.wait(1);
    }
    
    // 3. SWAP 1: WETH → USDC
    console.log(`   🔄 ENTRADA: WETH → USDC...`);
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
    console.log(`   ✅ ENTRADA: ${receipt1.hash.slice(0, 20)}...`);
    
    // 4. Obtener balance USDC
    const usdc = new ethers.Contract(chain.tokens.USDC, ERC20_ABI, signer);
    const usdcBalance = await usdc.balanceOf(WALLET_ADDRESS);
    
    // 5. Approve USDC
    const usdcAllowance = await usdc.allowance(WALLET_ADDRESS, chain.router);
    if (usdcAllowance < usdcBalance) {
      const approveUsdcTx = await usdc.approve(chain.router, ethers.MaxUint256, { gasLimit: 50000 });
      await approveUsdcTx.wait(1);
    }
    
    // 6. SWAP 2: USDC → WETH
    console.log(`   🔄 SALIDA: USDC → WETH...`);
    const minWeth = (opp.wethOut * BigInt(10000 - CONFIG.MAX_SLIPPAGE_BPS)) / 10000n;
    
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
    console.log(`   ✅ SALIDA: ${receipt2.hash.slice(0, 20)}...`);
    
    // 7. Calcular profit
    const finalWeth = await weth.balanceOf(WALLET_ADDRESS);
    const actualProfit = finalWeth - opp.amountIn;
    const actualProfitUsd = parseFloat(ethers.formatEther(actualProfit)) * opp.ethPrice;
    
    const gas1 = receipt1.gasUsed * receipt1.gasPrice;
    const gas2 = receipt2.gasUsed * receipt2.gasPrice;
    const totalGasUsd = parseFloat(ethers.formatEther(gas1 + gas2)) * opp.ethPrice;
    
    const netProfitUsd = actualProfitUsd - totalGasUsd;
    
    console.log(`   ═══════════════════════════════════════════════════════════════`);
    console.log(`   💰 PROFIT: $${actualProfitUsd.toFixed(4)}`);
    console.log(`   ⛽ GAS: $${totalGasUsd.toFixed(4)}`);
    console.log(`   💵 NETO: $${netProfitUsd.toFixed(4)}`);
    console.log(`   🔗 ${chain.explorer}/tx/${receipt2.hash}`);
    
    isExecuting = false;
    return {
      success: true,
      profitUsd: actualProfitUsd,
      gasUsd: totalGasUsd,
      netProfitUsd,
      txHash: receipt2.hash
    };
    
  } catch (e) {
    console.log(`   ❌ Error: ${e.message}`);
    isExecuting = false;
    return { success: false, error: e.message };
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// LOOP PRINCIPAL
// ═══════════════════════════════════════════════════════════════════════════════

async function tick() {
  if (!state.isRunning || isExecuting) return;
  
  const tickStart = Date.now();
  state.stats.totalScans++;
  state.stats.uptime = Math.floor((Date.now() - state.startTime) / 1000);
  
  // Alternar entre chains
  const chainKeys = Object.keys(CHAINS);
  const selectedChain = chainKeys[currentChainIndex % chainKeys.length];
  currentChainIndex++;
  
  state.stats.currentChain = selectedChain;
  state.banditStates.forEach(b => b.selected = b.chain === selectedChain);
  
  console.log(`\n[SCAN #${state.stats.totalScans}] ${CHAINS[selectedChain].name}`);
  
  try {
    const opportunities = await scanChain(selectedChain);
    const scanTime = Date.now() - tickStart;
    
    scanTimes.push(scanTime);
    if (scanTimes.length > 20) scanTimes.shift();
    state.stats.avgScanTimeMs = Math.round(scanTimes.reduce((a, b) => a + b, 0) / scanTimes.length);
    state.stats.scansPerSecond = Math.round(1000 / state.stats.avgScanTimeMs * 10) / 10;
    
    if (opportunities.length > 0) {
      state.stats.opportunitiesFound += opportunities.length;
      opportunities.sort((a, b) => b.netProfitUsd - a.netProfitUsd);
      
      state.opportunities = [...opportunities.slice(0, 5), ...state.opportunities].slice(0, 30);
      state.stats.lastOpportunity = opportunities[0];
      
      const best = opportunities[0];
      console.log(`   📊 ${scanTime}ms | ${opportunities.length} opps | Best: $${best.netProfitUsd.toFixed(4)}`);
      
      // EJECUTAR
      if (!state.isDryRun && CONFIG.AUTO_EXECUTE) {
        state.stats.tradesAttempted++;
        
        const result = await execute(best);
        
        if (result) {
          state.stats.tradesExecuted++;
          
          const tradeLog = {
            id: `tx-${Date.now()}`,
            timestamp: Date.now(),
            chain: best.chain,
            chainName: best.chainName,
            route: best.route,
            amountIn: best.amountInEth,
            spreadBps: best.spreadBps,
            expectedProfit: best.netProfitUsd.toFixed(4),
            actualProfit: result.success ? result.profitUsd.toFixed(4) : '0',
            gasCost: result.success ? result.gasUsd.toFixed(4) : '0',
            netProfit: result.success ? result.netProfitUsd.toFixed(4) : '0',
            txHash: result.txHash || '',
            status: result.success ? 'success' : 'failed',
            error: result.error || ''
          };
          
          state.tradeLogs.unshift(tradeLog);
          if (state.tradeLogs.length > 50) state.tradeLogs.pop();
          
          if (result.success) {
            state.stats.tradesSuccessful++;
            state.stats.totalProfitUsd += result.profitUsd;
            state.stats.totalGasUsd += result.gasUsd;
            state.stats.netProfitUsd = state.stats.totalProfitUsd - state.stats.totalGasUsd;
            state.stats.lastTrade = tradeLog;
            
            const bandit = state.banditStates.find(b => b.chain === best.chain);
            if (bandit) {
              bandit.wins++;
              bandit.attempts++;
              bandit.alpha++;
              bandit.winRate = (bandit.wins / bandit.attempts) * 100;
            }
          } else {
            const bandit = state.banditStates.find(b => b.chain === best.chain);
            if (bandit) {
              bandit.attempts++;
              bandit.beta++;
              bandit.winRate = bandit.attempts > 0 ? (bandit.wins / bandit.attempts) * 100 : 50;
            }
          }
          
          state.stats.winRate = state.stats.tradesExecuted > 0
            ? (state.stats.tradesSuccessful / state.stats.tradesExecuted) * 100
            : 0;
        }
      }
    } else {
      console.log(`   📊 ${scanTime}ms | No profitable opportunities`);
    }
    
    // Actualizar balances cada 20 scans
    if (state.stats.totalScans % 20 === 0) {
      for (const chainState of state.chains) {
        try {
          const balance = await providers[chainState.chain].getBalance(WALLET_ADDRESS);
          const balanceEth = parseFloat(ethers.formatEther(balance));
          chainState.balance = balanceEth.toFixed(6);
          chainState.balanceUsd = balanceEth * CONFIG.ETH_PRICE_USD;
          chainState.isActive = balanceEth > 0.001;
        } catch (e) {}
      }
    }
    
  } catch (e) {
    console.error(`   ❌ Error: ${e.message}`);
  }
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
  
  state.isDryRun = req.body?.dryRun === true;
  state.isRunning = true;
  state.startTime = Date.now();
  
  state.stats = {
    totalScans: 0, opportunitiesFound: 0, tradesAttempted: 0,
    tradesExecuted: 0, tradesSuccessful: 0, totalProfitUsd: 0,
    totalGasUsd: 0, netProfitUsd: 0, winRate: 0, avgScanTimeMs: 0,
    scansPerSecond: 0, uptime: 0, currentChain: 'base',
    lastOpportunity: null, lastTrade: null
  };
  state.tradeLogs = [];
  state.opportunities = [];
  scanTimes = [];
  currentChainIndex = 0;
  
  if (timer) clearInterval(timer);
  timer = setInterval(tick, CONFIG.SCAN_INTERVAL_MS);
  
  console.log(`\n[START] 🔥 SCALPER iniciado - ${state.isDryRun ? 'DRY RUN' : '⚠️ MODO REAL'}`);
  
  res.json({
    success: true,
    isRunning: true,
    isDryRun: state.isDryRun,
    mode: 'SCALPER_OPTIMIZED',
    config: CONFIG
  });
});

app.post('/api/defi/multichain-arb/stop', (req, res) => {
  state.isRunning = false;
  if (timer) { clearInterval(timer); timer = null; }
  console.log('[STOP] Bot detenido');
  res.json({ success: true, isRunning: false });
});

app.get('/api/defi/multichain-arb/health', (req, res) => {
  res.json({
    status: 'ok',
    mode: 'SCALPER_OPTIMIZED',
    port: PORT,
    running: state.isRunning,
    dryRun: state.isDryRun,
    wallet: WALLET_ADDRESS,
    config: CONFIG
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// INICIAR
// ═══════════════════════════════════════════════════════════════════════════════

app.listen(PORT, async () => {
  console.log(`
╔═══════════════════════════════════════════════════════════════════════════════╗
║                                                                               ║
║   🔥 SCALPER OPTIMIZADO - BASE + ARBITRUM                                     ║
║                                                                               ║
║   ✅ Puerto: ${PORT}                                                           ║
║   ✅ Wallet: ${WALLET_ADDRESS.slice(0, 10)}...${WALLET_ADDRESS.slice(-5)}                                  ║
║                                                                               ║
║   ⚡ Intervalo: ${CONFIG.SCAN_INTERVAL_MS}ms | Min Profit: $${CONFIG.MIN_PROFIT_USD}                            ║
║   ⚡ Fee Tiers: ${CONFIG.FEE_TIERS.map(f => f/100 + '%').join(', ')}                                     ║
║   ⚡ Amounts: ${CONFIG.TRADE_AMOUNTS_ETH.join(', ')} ETH                                  ║
║                                                                               ║
╚═══════════════════════════════════════════════════════════════════════════════╝
  `);
  
  await init();
  console.log('[READY] 🔥 Scalper listo. POST /api/defi/multichain-arb/start para iniciar.\n');
});

process.on('SIGINT', () => {
  if (timer) clearInterval(timer);
  process.exit(0);
});


 * ═══════════════════════════════════════════════════════════════════════════════
 * 🔥 SCALPER OPTIMIZADO - BASE + ARBITRUM ONLY
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * Versión optimizada que:
 * - Solo usa Base y Arbitrum (RPCs premium)
 * - Reduce llamadas paralelas para evitar rate limits
 * - Escaneo secuencial por chain
 * - Ejecución inmediata cuando detecta oportunidad
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
// CONFIGURACIÓN OPTIMIZADA
// ═══════════════════════════════════════════════════════════════════════════════

const CONFIG = {
  SCAN_INTERVAL_MS: 500,
  MIN_PROFIT_USD: 0.01,
  MAX_SLIPPAGE_BPS: 50,
  TRADE_AMOUNTS_ETH: [0.005, 0.01, 0.02],
  FEE_TIERS: [500, 3000],  // Solo los más líquidos
  AUTO_EXECUTE: true,
  MAX_GAS_GWEI: 10,
  ETH_PRICE_USD: 3500
};

const PRIVATE_KEY = process.env.VITE_ETH_PRIVATE_KEY;
const WALLET_ADDRESS = process.env.VITE_ETH_WALLET_ADDRESS;

if (!PRIVATE_KEY || !WALLET_ADDRESS) {
  console.error('❌ ERROR: Credenciales no configuradas');
  process.exit(1);
}

// ═══════════════════════════════════════════════════════════════════════════════
// CHAINS (Solo Base y Arbitrum con RPCs premium)
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

const ROUTER_ABI = [
  'function exactInputSingle((address tokenIn, address tokenOut, uint24 fee, address recipient, uint256 amountIn, uint256 amountOutMinimum, uint160 sqrtPriceLimitX96)) external payable returns (uint256 amountOut)'
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
// ESTADO
// ═══════════════════════════════════════════════════════════════════════════════

let state = {
  isRunning: false,
  isDryRun: false,
  startTime: null,
  mode: 'SCALPER_OPTIMIZED',
  stats: {
    totalScans: 0,
    opportunitiesFound: 0,
    tradesAttempted: 0,
    tradesExecuted: 0,
    tradesSuccessful: 0,
    totalProfitUsd: 0,
    totalGasUsd: 0,
    netProfitUsd: 0,
    winRate: 0,
    avgScanTimeMs: 0,
    scansPerSecond: 0,
    uptime: 0,
    currentChain: 'base',
    lastOpportunity: null,
    lastTrade: null
  },
  chains: [],
  tradeLogs: [],
  opportunities: [],
  banditStates: []
};

let timer = null;
let providers = {};
let signers = {};
let contracts = {};
let isExecuting = false;
let currentChainIndex = 0;
let scanTimes = [];

// ═══════════════════════════════════════════════════════════════════════════════
// INICIALIZAR
// ═══════════════════════════════════════════════════════════════════════════════

async function init() {
  console.log('[INIT] 🔌 Conectando a chains...\n');
  
  for (const [key, chain] of Object.entries(CHAINS)) {
    try {
      providers[key] = new ethers.JsonRpcProvider(chain.rpc);
      signers[key] = new ethers.Wallet(PRIVATE_KEY, providers[key]);
      
      contracts[key] = {
        quoter: new ethers.Contract(chain.quoter, QUOTER_ABI, providers[key]),
        router: new ethers.Contract(chain.router, ROUTER_ABI, signers[key]),
        weth: new ethers.Contract(chain.tokens.WETH, WETH_ABI, signers[key])
      };
      
      const balance = await providers[key].getBalance(WALLET_ADDRESS);
      const balanceEth = parseFloat(ethers.formatEther(balance));
      
      state.chains.push({
        chain: key,
        name: chain.name,
        chainId: chain.chainId,
        balance: balanceEth.toFixed(6),
        balanceUsd: balanceEth * CONFIG.ETH_PRICE_USD,
        routes: CONFIG.FEE_TIERS.length * CONFIG.TRADE_AMOUNTS_ETH.length,
        isActive: balanceEth > 0.001,
        lastScan: Date.now(),
        scansCompleted: 0,
        opportunitiesFound: 0,
        tradesExecuted: 0,
        explorer: chain.explorer,
        ethPrice: 0
      });
      
      state.banditStates.push({
        chain: key,
        alpha: 2,
        beta: 2,
        winRate: 50,
        selected: key === 'base',
        attempts: 0,
        wins: 0
      });
      
      console.log(`   ✅ ${chain.name}: ${balanceEth.toFixed(6)} ETH ($${(balanceEth * CONFIG.ETH_PRICE_USD).toFixed(2)})`);
    } catch (e) {
      console.error(`   ❌ ${chain.name}: ${e.message}`);
    }
  }
  console.log('');
}

// ═══════════════════════════════════════════════════════════════════════════════
// ESCANEO SECUENCIAL (evita rate limits)
// ═══════════════════════════════════════════════════════════════════════════════

async function scanChain(chainKey) {
  const chain = CHAINS[chainKey];
  const provider = providers[chainKey];
  const quoter = contracts[chainKey].quoter;
  const opportunities = [];
  
  try {
    // 1. Obtener gas price
    const feeData = await provider.getFeeData();
    const gasPrice = feeData.gasPrice || ethers.parseUnits('0.001', 'gwei');
    const gasPriceGwei = parseFloat(ethers.formatUnits(gasPrice, 'gwei'));
    
    if (gasPriceGwei > CONFIG.MAX_GAS_GWEI) {
      console.log(`   ⛽ Gas muy alto en ${chain.name}: ${gasPriceGwei.toFixed(2)} gwei`);
      return [];
    }
    
    const gasCostWei = gasPrice * 250000n;
    const gasCostUsd = parseFloat(ethers.formatEther(gasCostWei)) * CONFIG.ETH_PRICE_USD;
    
    // 2. Obtener precio ETH
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
    } catch (e) {}
    
    // Actualizar estado
    const chainState = state.chains.find(c => c.chain === chainKey);
    if (chainState) chainState.ethPrice = ethPrice;
    
    // 3. Escanear rutas SECUENCIALMENTE (no paralelo)
    for (const amountEth of CONFIG.TRADE_AMOUNTS_ETH) {
      const amountWei = ethers.parseEther(amountEth.toString());
      
      for (let i = 0; i < CONFIG.FEE_TIERS.length; i++) {
        for (let j = 0; j < CONFIG.FEE_TIERS.length; j++) {
          if (i === j) continue;
          
          try {
            // WETH → USDC
            const quote1 = await quoter.quoteExactInputSingle.staticCall({
              tokenIn: chain.tokens.WETH,
              tokenOut: chain.tokens.USDC,
              amountIn: amountWei,
              fee: CONFIG.FEE_TIERS[i],
              sqrtPriceLimitX96: 0n
            });
            const usdcOut = quote1[0];
            
            // USDC → WETH
            const quote2 = await quoter.quoteExactInputSingle.staticCall({
              tokenIn: chain.tokens.USDC,
              tokenOut: chain.tokens.WETH,
              amountIn: usdcOut,
              fee: CONFIG.FEE_TIERS[j],
              sqrtPriceLimitX96: 0n
            });
            const wethOut = quote2[0];
            
            const grossProfit = wethOut - amountWei;
            const netProfit = grossProfit - gasCostWei;
            
            if (netProfit > 0n) {
              const netProfitUsd = parseFloat(ethers.formatEther(netProfit)) * ethPrice;
              const spreadBps = Number((grossProfit * 10000n) / amountWei);
              
              if (netProfitUsd >= CONFIG.MIN_PROFIT_USD) {
                opportunities.push({
                  chain: chainKey,
                  chainName: chain.name,
                  type: 'SCALP',
                  route: `${CONFIG.FEE_TIERS[i]/100}%→${CONFIG.FEE_TIERS[j]/100}%`,
                  amountIn: amountWei,
                  amountInEth: amountEth,
                  fee1: CONFIG.FEE_TIERS[i],
                  fee2: CONFIG.FEE_TIERS[j],
                  usdcIntermediate: usdcOut,
                  wethOut,
                  grossProfit,
                  netProfit,
                  netProfitUsd,
                  gasCostUsd,
                  spreadBps,
                  ethPrice,
                  timestamp: Date.now(),
                  gasPrice: gasPriceGwei
                });
                
                console.log(`   💰 OPP: ${chain.name} ${amountEth}ETH ${CONFIG.FEE_TIERS[i]/100}%→${CONFIG.FEE_TIERS[j]/100}% = $${netProfitUsd.toFixed(4)}`);
              }
            }
          } catch (e) {
            // Pool no existe
          }
        }
      }
    }
    
  } catch (e) {
    console.error(`   ❌ Error ${chain.name}: ${e.message.slice(0, 50)}`);
  }
  
  return opportunities;
}

// ═══════════════════════════════════════════════════════════════════════════════
// EJECUCIÓN
// ═══════════════════════════════════════════════════════════════════════════════

async function execute(opp) {
  if (isExecuting) return null;
  isExecuting = true;
  
  const chain = CHAINS[opp.chain];
  const signer = signers[opp.chain];
  const provider = providers[opp.chain];
  const { router, weth } = contracts[opp.chain];
  
  console.log(`\n🔥 ═══════════════════════════════════════════════════════════════`);
  console.log(`   EJECUTANDO en ${chain.name}`);
  console.log(`   Route: ${opp.route}`);
  console.log(`   Amount: ${opp.amountInEth} ETH`);
  console.log(`   Expected: $${opp.netProfitUsd.toFixed(4)}`);
  
  try {
    // Verificar balance
    const balance = await provider.getBalance(WALLET_ADDRESS);
    if (balance < opp.amountIn + ethers.parseEther('0.002')) {
      console.log(`   ❌ Balance insuficiente`);
      isExecuting = false;
      return { success: false, error: 'Balance insuficiente' };
    }
    
    // 1. Wrap ETH
    console.log(`   📦 Wrapping...`);
    const wrapTx = await weth.deposit({ value: opp.amountIn, gasLimit: 50000 });
    await wrapTx.wait(1);
    
    // 2. Approve WETH
    const allowance = await weth.allowance(WALLET_ADDRESS, chain.router);
    if (allowance < opp.amountIn) {
      const approveTx = await weth.approve(chain.router, ethers.MaxUint256, { gasLimit: 50000 });
      await approveTx.wait(1);
    }
    
    // 3. SWAP 1: WETH → USDC
    console.log(`   🔄 ENTRADA: WETH → USDC...`);
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
    console.log(`   ✅ ENTRADA: ${receipt1.hash.slice(0, 20)}...`);
    
    // 4. Obtener balance USDC
    const usdc = new ethers.Contract(chain.tokens.USDC, ERC20_ABI, signer);
    const usdcBalance = await usdc.balanceOf(WALLET_ADDRESS);
    
    // 5. Approve USDC
    const usdcAllowance = await usdc.allowance(WALLET_ADDRESS, chain.router);
    if (usdcAllowance < usdcBalance) {
      const approveUsdcTx = await usdc.approve(chain.router, ethers.MaxUint256, { gasLimit: 50000 });
      await approveUsdcTx.wait(1);
    }
    
    // 6. SWAP 2: USDC → WETH
    console.log(`   🔄 SALIDA: USDC → WETH...`);
    const minWeth = (opp.wethOut * BigInt(10000 - CONFIG.MAX_SLIPPAGE_BPS)) / 10000n;
    
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
    console.log(`   ✅ SALIDA: ${receipt2.hash.slice(0, 20)}...`);
    
    // 7. Calcular profit
    const finalWeth = await weth.balanceOf(WALLET_ADDRESS);
    const actualProfit = finalWeth - opp.amountIn;
    const actualProfitUsd = parseFloat(ethers.formatEther(actualProfit)) * opp.ethPrice;
    
    const gas1 = receipt1.gasUsed * receipt1.gasPrice;
    const gas2 = receipt2.gasUsed * receipt2.gasPrice;
    const totalGasUsd = parseFloat(ethers.formatEther(gas1 + gas2)) * opp.ethPrice;
    
    const netProfitUsd = actualProfitUsd - totalGasUsd;
    
    console.log(`   ═══════════════════════════════════════════════════════════════`);
    console.log(`   💰 PROFIT: $${actualProfitUsd.toFixed(4)}`);
    console.log(`   ⛽ GAS: $${totalGasUsd.toFixed(4)}`);
    console.log(`   💵 NETO: $${netProfitUsd.toFixed(4)}`);
    console.log(`   🔗 ${chain.explorer}/tx/${receipt2.hash}`);
    
    isExecuting = false;
    return {
      success: true,
      profitUsd: actualProfitUsd,
      gasUsd: totalGasUsd,
      netProfitUsd,
      txHash: receipt2.hash
    };
    
  } catch (e) {
    console.log(`   ❌ Error: ${e.message}`);
    isExecuting = false;
    return { success: false, error: e.message };
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// LOOP PRINCIPAL
// ═══════════════════════════════════════════════════════════════════════════════

async function tick() {
  if (!state.isRunning || isExecuting) return;
  
  const tickStart = Date.now();
  state.stats.totalScans++;
  state.stats.uptime = Math.floor((Date.now() - state.startTime) / 1000);
  
  // Alternar entre chains
  const chainKeys = Object.keys(CHAINS);
  const selectedChain = chainKeys[currentChainIndex % chainKeys.length];
  currentChainIndex++;
  
  state.stats.currentChain = selectedChain;
  state.banditStates.forEach(b => b.selected = b.chain === selectedChain);
  
  console.log(`\n[SCAN #${state.stats.totalScans}] ${CHAINS[selectedChain].name}`);
  
  try {
    const opportunities = await scanChain(selectedChain);
    const scanTime = Date.now() - tickStart;
    
    scanTimes.push(scanTime);
    if (scanTimes.length > 20) scanTimes.shift();
    state.stats.avgScanTimeMs = Math.round(scanTimes.reduce((a, b) => a + b, 0) / scanTimes.length);
    state.stats.scansPerSecond = Math.round(1000 / state.stats.avgScanTimeMs * 10) / 10;
    
    if (opportunities.length > 0) {
      state.stats.opportunitiesFound += opportunities.length;
      opportunities.sort((a, b) => b.netProfitUsd - a.netProfitUsd);
      
      state.opportunities = [...opportunities.slice(0, 5), ...state.opportunities].slice(0, 30);
      state.stats.lastOpportunity = opportunities[0];
      
      const best = opportunities[0];
      console.log(`   📊 ${scanTime}ms | ${opportunities.length} opps | Best: $${best.netProfitUsd.toFixed(4)}`);
      
      // EJECUTAR
      if (!state.isDryRun && CONFIG.AUTO_EXECUTE) {
        state.stats.tradesAttempted++;
        
        const result = await execute(best);
        
        if (result) {
          state.stats.tradesExecuted++;
          
          const tradeLog = {
            id: `tx-${Date.now()}`,
            timestamp: Date.now(),
            chain: best.chain,
            chainName: best.chainName,
            route: best.route,
            amountIn: best.amountInEth,
            spreadBps: best.spreadBps,
            expectedProfit: best.netProfitUsd.toFixed(4),
            actualProfit: result.success ? result.profitUsd.toFixed(4) : '0',
            gasCost: result.success ? result.gasUsd.toFixed(4) : '0',
            netProfit: result.success ? result.netProfitUsd.toFixed(4) : '0',
            txHash: result.txHash || '',
            status: result.success ? 'success' : 'failed',
            error: result.error || ''
          };
          
          state.tradeLogs.unshift(tradeLog);
          if (state.tradeLogs.length > 50) state.tradeLogs.pop();
          
          if (result.success) {
            state.stats.tradesSuccessful++;
            state.stats.totalProfitUsd += result.profitUsd;
            state.stats.totalGasUsd += result.gasUsd;
            state.stats.netProfitUsd = state.stats.totalProfitUsd - state.stats.totalGasUsd;
            state.stats.lastTrade = tradeLog;
            
            const bandit = state.banditStates.find(b => b.chain === best.chain);
            if (bandit) {
              bandit.wins++;
              bandit.attempts++;
              bandit.alpha++;
              bandit.winRate = (bandit.wins / bandit.attempts) * 100;
            }
          } else {
            const bandit = state.banditStates.find(b => b.chain === best.chain);
            if (bandit) {
              bandit.attempts++;
              bandit.beta++;
              bandit.winRate = bandit.attempts > 0 ? (bandit.wins / bandit.attempts) * 100 : 50;
            }
          }
          
          state.stats.winRate = state.stats.tradesExecuted > 0
            ? (state.stats.tradesSuccessful / state.stats.tradesExecuted) * 100
            : 0;
        }
      }
    } else {
      console.log(`   📊 ${scanTime}ms | No profitable opportunities`);
    }
    
    // Actualizar balances cada 20 scans
    if (state.stats.totalScans % 20 === 0) {
      for (const chainState of state.chains) {
        try {
          const balance = await providers[chainState.chain].getBalance(WALLET_ADDRESS);
          const balanceEth = parseFloat(ethers.formatEther(balance));
          chainState.balance = balanceEth.toFixed(6);
          chainState.balanceUsd = balanceEth * CONFIG.ETH_PRICE_USD;
          chainState.isActive = balanceEth > 0.001;
        } catch (e) {}
      }
    }
    
  } catch (e) {
    console.error(`   ❌ Error: ${e.message}`);
  }
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
  
  state.isDryRun = req.body?.dryRun === true;
  state.isRunning = true;
  state.startTime = Date.now();
  
  state.stats = {
    totalScans: 0, opportunitiesFound: 0, tradesAttempted: 0,
    tradesExecuted: 0, tradesSuccessful: 0, totalProfitUsd: 0,
    totalGasUsd: 0, netProfitUsd: 0, winRate: 0, avgScanTimeMs: 0,
    scansPerSecond: 0, uptime: 0, currentChain: 'base',
    lastOpportunity: null, lastTrade: null
  };
  state.tradeLogs = [];
  state.opportunities = [];
  scanTimes = [];
  currentChainIndex = 0;
  
  if (timer) clearInterval(timer);
  timer = setInterval(tick, CONFIG.SCAN_INTERVAL_MS);
  
  console.log(`\n[START] 🔥 SCALPER iniciado - ${state.isDryRun ? 'DRY RUN' : '⚠️ MODO REAL'}`);
  
  res.json({
    success: true,
    isRunning: true,
    isDryRun: state.isDryRun,
    mode: 'SCALPER_OPTIMIZED',
    config: CONFIG
  });
});

app.post('/api/defi/multichain-arb/stop', (req, res) => {
  state.isRunning = false;
  if (timer) { clearInterval(timer); timer = null; }
  console.log('[STOP] Bot detenido');
  res.json({ success: true, isRunning: false });
});

app.get('/api/defi/multichain-arb/health', (req, res) => {
  res.json({
    status: 'ok',
    mode: 'SCALPER_OPTIMIZED',
    port: PORT,
    running: state.isRunning,
    dryRun: state.isDryRun,
    wallet: WALLET_ADDRESS,
    config: CONFIG
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// INICIAR
// ═══════════════════════════════════════════════════════════════════════════════

app.listen(PORT, async () => {
  console.log(`
╔═══════════════════════════════════════════════════════════════════════════════╗
║                                                                               ║
║   🔥 SCALPER OPTIMIZADO - BASE + ARBITRUM                                     ║
║                                                                               ║
║   ✅ Puerto: ${PORT}                                                           ║
║   ✅ Wallet: ${WALLET_ADDRESS.slice(0, 10)}...${WALLET_ADDRESS.slice(-5)}                                  ║
║                                                                               ║
║   ⚡ Intervalo: ${CONFIG.SCAN_INTERVAL_MS}ms | Min Profit: $${CONFIG.MIN_PROFIT_USD}                            ║
║   ⚡ Fee Tiers: ${CONFIG.FEE_TIERS.map(f => f/100 + '%').join(', ')}                                     ║
║   ⚡ Amounts: ${CONFIG.TRADE_AMOUNTS_ETH.join(', ')} ETH                                  ║
║                                                                               ║
╚═══════════════════════════════════════════════════════════════════════════════╝
  `);
  
  await init();
  console.log('[READY] 🔥 Scalper listo. POST /api/defi/multichain-arb/start para iniciar.\n');
});

process.on('SIGINT', () => {
  if (timer) clearInterval(timer);
  process.exit(0);
});





