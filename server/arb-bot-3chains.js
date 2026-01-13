/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * 🔥 SCALPER 3 CHAINS - BASE + ARBITRUM + OPTIMISM
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * Bot optimizado para 3 chains con:
 * - RPCs alternativos para Optimism
 * - Ejecución automática agresiva
 * - Umbral de profit muy bajo
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
  SCAN_INTERVAL_MS: 500,
  MIN_PROFIT_USD: 0.001,          // Muy bajo para capturar más
  MAX_SLIPPAGE_BPS: 100,          // 1%
  AUTO_EXECUTE: true,
  ETH_PRICE_USD: 3500,
  TRADE_AMOUNTS: [0.005, 0.01, 0.02],
  FEE_TIERS: [500, 3000]          // 0.05% y 0.3%
};

const PRIVATE_KEY = process.env.VITE_ETH_PRIVATE_KEY;
const WALLET_ADDRESS = process.env.VITE_ETH_WALLET_ADDRESS;

if (!PRIVATE_KEY || !WALLET_ADDRESS) {
  console.error('❌ ERROR: Credenciales no configuradas');
  process.exit(1);
}

// ═══════════════════════════════════════════════════════════════════════════════
// 3 CHAINS CON RPCs MÚLTIPLES
// ═══════════════════════════════════════════════════════════════════════════════

const CHAINS = {
  base: {
    name: 'Base',
    chainId: 8453,
    rpcs: [
      'https://base-mainnet.g.alchemy.com/v2/mm-9UjI5oG51l94mRH3fh',
      'https://mainnet.base.org',
      'https://base.llamarpc.com'
    ],
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
    rpcs: [
      'https://arb1.arbitrum.io/rpc',
      'https://arbitrum.llamarpc.com',
      'https://rpc.ankr.com/arbitrum'
    ],
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
    rpcs: [
      'https://optimism.llamarpc.com',
      'https://rpc.ankr.com/optimism',
      'https://optimism-mainnet.public.blastapi.io',
      'https://1rpc.io/op'
    ],
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
  mode: 'SCALPER_3CHAINS',
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
// CONECTAR CON FALLBACK DE RPCs
// ═══════════════════════════════════════════════════════════════════════════════

async function connectWithFallback(chainKey) {
  const chain = CHAINS[chainKey];
  
  for (const rpc of chain.rpcs) {
    try {
      const provider = new ethers.JsonRpcProvider(rpc);
      // Test connection
      await provider.getBlockNumber();
      console.log(`   ✅ ${chain.name}: Conectado a ${rpc.split('/')[2]}`);
      return provider;
    } catch (e) {
      console.log(`   ⚠️ ${chain.name}: RPC ${rpc.split('/')[2]} falló, probando siguiente...`);
    }
  }
  
  throw new Error(`No se pudo conectar a ${chain.name}`);
}

async function init() {
  console.log('[INIT] 🔌 Conectando a 3 chains...\n');
  
  for (const [chainKey, chain] of Object.entries(CHAINS)) {
    try {
      const provider = await connectWithFallback(chainKey);
      providers[chainKey] = provider;
      signers[chainKey] = new ethers.Wallet(PRIVATE_KEY, provider);
      
      contracts[chainKey] = {
        quoter: new ethers.Contract(chain.quoter, QUOTER_ABI, provider),
        router: new ethers.Contract(chain.router, ROUTER_ABI, signers[chainKey]),
        weth: new ethers.Contract(chain.tokens.WETH, WETH_ABI, signers[chainKey])
      };
      
      const balance = await provider.getBalance(WALLET_ADDRESS);
      const balanceEth = parseFloat(ethers.formatEther(balance));
      
      state.chains.push({
        chain: chainKey,
        name: chain.name,
        chainId: chain.chainId,
        balance: balanceEth.toFixed(6),
        balanceUsd: balanceEth * CONFIG.ETH_PRICE_USD,
        routes: CONFIG.FEE_TIERS.length * CONFIG.TRADE_AMOUNTS.length,
        isActive: balanceEth > 0.001,
        lastScan: Date.now(),
        explorer: chain.explorer,
        ethPrice: 0,
        connected: true
      });
      
      state.banditStates.push({
        chain: chainKey,
        alpha: 2,
        beta: 2,
        winRate: 50,
        selected: chainKey === 'base',
        attempts: 0,
        wins: 0
      });
      
      console.log(`   💰 ${chain.name}: ${balanceEth.toFixed(6)} ETH ($${(balanceEth * CONFIG.ETH_PRICE_USD).toFixed(2)})`);
    } catch (e) {
      console.error(`   ❌ ${chain.name}: ${e.message}`);
      state.chains.push({
        chain: chainKey,
        name: chain.name,
        chainId: chain.chainId,
        balance: '0',
        balanceUsd: 0,
        routes: 0,
        isActive: false,
        lastScan: Date.now(),
        explorer: chain.explorer,
        ethPrice: 0,
        connected: false,
        error: e.message
      });
    }
  }
  console.log('');
}

// ═══════════════════════════════════════════════════════════════════════════════
// ESCANEO SIMPLE Y RÁPIDO
// ═══════════════════════════════════════════════════════════════════════════════

async function scanChain(chainKey) {
  const chain = CHAINS[chainKey];
  const provider = providers[chainKey];
  const quoter = contracts[chainKey]?.quoter;
  
  if (!quoter) return [];
  
  const opportunities = [];
  
  try {
    // Gas price
    const feeData = await provider.getFeeData();
    const gasPrice = feeData.gasPrice || ethers.parseUnits('0.01', 'gwei');
    const gasCostWei = gasPrice * 300000n;
    const gasCostUsd = parseFloat(ethers.formatEther(gasCostWei)) * CONFIG.ETH_PRICE_USD;
    
    // Precio ETH
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
    
    // Escanear rutas
    for (const amountEth of CONFIG.TRADE_AMOUNTS) {
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
            const spreadBps = Number((grossProfit * 10000n) / amountWei);
            
            // Registrar TODAS las oportunidades (incluso negativas) para mostrar en UI
            const netProfitUsd = parseFloat(ethers.formatEther(netProfit)) * ethPrice;
            
            opportunities.push({
              chain: chainKey,
              chainName: chain.name,
              strategy: 'FEE_TIER_ARB',
              route: `${CONFIG.FEE_TIERS[i]/100}%→${CONFIG.FEE_TIERS[j]/100}%`,
              amountIn: amountWei.toString(),
              amountInEth: amountEth,
              fee1: CONFIG.FEE_TIERS[i],
              fee2: CONFIG.FEE_TIERS[j],
              usdcIntermediate: usdcOut.toString(),
              wethOut: wethOut.toString(),
              spreadBps,
              netProfitUsd,
              gasCostUsd,
              ethPrice,
              profitable: netProfitUsd >= CONFIG.MIN_PROFIT_USD,
              timestamp: Date.now(),
              // Guardar BigInt originales para ejecución
              _amountInWei: amountWei,
              _usdcOut: usdcOut,
              _wethOut: wethOut
            });
            
          } catch (e) {
            // Pool no existe
          }
        }
      }
    }
    
  } catch (e) {
    console.error(`[SCAN] Error ${chain.name}: ${e.message.slice(0, 50)}`);
  }
  
  return opportunities;
}

// ═══════════════════════════════════════════════════════════════════════════════
// EJECUCIÓN DE TRADE
// ═══════════════════════════════════════════════════════════════════════════════

async function executeTrade(opp) {
  if (isExecuting) return null;
  isExecuting = true;
  
  const chain = CHAINS[opp.chain];
  const signer = signers[opp.chain];
  const provider = providers[opp.chain];
  const { router, weth } = contracts[opp.chain];
  
  // Usar BigInt originales o convertir de string
  const amountIn = opp._amountInWei || BigInt(opp.amountIn);
  const usdcIntermediate = opp._usdcOut || BigInt(opp.usdcIntermediate);
  const wethOut = opp._wethOut || BigInt(opp.wethOut);
  
  console.log(`\n🔥 ═══════════════════════════════════════════════════════════════`);
  console.log(`   EJECUTANDO TRADE EN ${chain.name.toUpperCase()}`);
  console.log(`   Route: ${opp.route}`);
  console.log(`   Amount: ${opp.amountInEth} ETH`);
  console.log(`   Expected: $${opp.netProfitUsd.toFixed(4)}`);
  
  const startTime = Date.now();
  
  try {
    // Verificar balance
    const balance = await provider.getBalance(WALLET_ADDRESS);
    if (balance < amountIn + ethers.parseEther('0.002')) {
      console.log(`   ❌ Balance insuficiente en ${chain.name}`);
      isExecuting = false;
      return { success: false, error: 'Balance insuficiente' };
    }
    
    // 1. Wrap ETH
    console.log(`   📦 Wrapping ETH...`);
    const wrapTx = await weth.deposit({ value: amountIn, gasLimit: 60000 });
    await wrapTx.wait(1);
    console.log(`   ✅ Wrapped`);
    
    // 2. Approve WETH
    const allowance = await weth.allowance(WALLET_ADDRESS, chain.router);
    if (allowance < amountIn) {
      console.log(`   🔓 Approving WETH...`);
      const approveTx = await weth.approve(chain.router, ethers.MaxUint256, { gasLimit: 60000 });
      await approveTx.wait(1);
    }
    
    // 3. SWAP 1: WETH → USDC
    console.log(`   🔄 SWAP 1: WETH → USDC (${opp.fee1/100}%)...`);
    const minUsdc = (usdcIntermediate * BigInt(10000 - CONFIG.MAX_SLIPPAGE_BPS)) / 10000n;
    
    const swap1Tx = await router.exactInputSingle({
      tokenIn: chain.tokens.WETH,
      tokenOut: chain.tokens.USDC,
      fee: opp.fee1,
      recipient: WALLET_ADDRESS,
      amountIn: amountIn,
      amountOutMinimum: minUsdc,
      sqrtPriceLimitX96: 0n
    }, { gasLimit: 350000 });
    
    const receipt1 = await swap1Tx.wait(1);
    console.log(`   ✅ SWAP 1 completado: ${receipt1.hash.slice(0, 16)}...`);
    
    // 4. Obtener balance USDC
    const usdc = new ethers.Contract(chain.tokens.USDC, ERC20_ABI, signer);
    const usdcBalance = await usdc.balanceOf(WALLET_ADDRESS);
    console.log(`   💵 USDC recibido: ${ethers.formatUnits(usdcBalance, 6)}`);
    
    // 5. Approve USDC
    const usdcAllowance = await usdc.allowance(WALLET_ADDRESS, chain.router);
    if (usdcAllowance < usdcBalance) {
      console.log(`   🔓 Approving USDC...`);
      const approveUsdcTx = await usdc.approve(chain.router, ethers.MaxUint256, { gasLimit: 60000 });
      await approveUsdcTx.wait(1);
    }
    
    // 6. SWAP 2: USDC → WETH
    console.log(`   🔄 SWAP 2: USDC → WETH (${opp.fee2/100}%)...`);
    const minWeth = (wethOut * BigInt(10000 - CONFIG.MAX_SLIPPAGE_BPS)) / 10000n;
    
    const swap2Tx = await router.exactInputSingle({
      tokenIn: chain.tokens.USDC,
      tokenOut: chain.tokens.WETH,
      fee: opp.fee2,
      recipient: WALLET_ADDRESS,
      amountIn: usdcBalance,
      amountOutMinimum: minWeth,
      sqrtPriceLimitX96: 0n
    }, { gasLimit: 350000 });
    
    const receipt2 = await swap2Tx.wait(1);
    console.log(`   ✅ SWAP 2 completado: ${receipt2.hash.slice(0, 16)}...`);
    
    // 7. Calcular profit
    const finalWeth = await weth.balanceOf(WALLET_ADDRESS);
    const actualProfit = finalWeth - amountIn;
    const actualProfitUsd = parseFloat(ethers.formatEther(actualProfit)) * opp.ethPrice;
    
    const gas1 = receipt1.gasUsed * receipt1.gasPrice;
    const gas2 = receipt2.gasUsed * receipt2.gasPrice;
    const totalGasUsd = parseFloat(ethers.formatEther(gas1 + gas2)) * opp.ethPrice;
    
    const netProfitUsd = actualProfitUsd - totalGasUsd;
    const executionTime = Date.now() - startTime;
    
    console.log(`   ═══════════════════════════════════════════════════════════════`);
    console.log(`   💰 PROFIT BRUTO: $${actualProfitUsd.toFixed(4)}`);
    console.log(`   ⛽ GAS TOTAL: $${totalGasUsd.toFixed(4)}`);
    console.log(`   💵 PROFIT NETO: $${netProfitUsd.toFixed(4)}`);
    console.log(`   ⏱️  Tiempo: ${executionTime}ms`);
    console.log(`   🔗 ${chain.explorer}/tx/${receipt2.hash}`);
    console.log(`   ═══════════════════════════════════════════════════════════════\n`);
    
    isExecuting = false;
    return {
      success: true,
      profitUsd: actualProfitUsd,
      gasUsd: totalGasUsd,
      netProfitUsd,
      txHash: receipt2.hash,
      executionTimeMs: executionTime
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
  
  // Rotar entre chains activas
  const activeChains = state.chains.filter(c => c.connected && c.isActive);
  if (activeChains.length === 0) {
    console.log('[TICK] No hay chains activas');
    return;
  }
  
  const selectedChain = activeChains[currentChainIndex % activeChains.length].chain;
  currentChainIndex++;
  
  state.stats.currentChain = selectedChain;
  state.banditStates.forEach(b => b.selected = b.chain === selectedChain);
  
  try {
    const opportunities = await scanChain(selectedChain);
    const scanTime = Date.now() - tickStart;
    
    scanTimes.push(scanTime);
    if (scanTimes.length > 20) scanTimes.shift();
    state.stats.avgScanTimeMs = Math.round(scanTimes.reduce((a, b) => a + b, 0) / scanTimes.length);
    state.stats.scansPerSecond = state.stats.avgScanTimeMs > 0 ? Math.round(1000 / state.stats.avgScanTimeMs * 10) / 10 : 0;
    
    // Guardar TODAS las oportunidades para mostrar en UI
    state.opportunities = [...opportunities.slice(0, 10), ...state.opportunities].slice(0, 30);
    
    // Filtrar solo las rentables
    const profitableOpps = opportunities.filter(o => o.profitable);
    
    if (profitableOpps.length > 0) {
      state.stats.opportunitiesFound += profitableOpps.length;
      profitableOpps.sort((a, b) => b.netProfitUsd - a.netProfitUsd);
      
      const best = profitableOpps[0];
      state.stats.lastOpportunity = best;
      
      console.log(`\n[SCAN #${state.stats.totalScans}] ${CHAINS[selectedChain].name} | ${scanTime}ms`);
      console.log(`   🎯 ${profitableOpps.length} OPORTUNIDADES RENTABLES!`);
      console.log(`   💰 MEJOR: ${best.route} | $${best.netProfitUsd.toFixed(4)}`);
      
      // EJECUTAR si no es dry run
      if (!state.isDryRun && CONFIG.AUTO_EXECUTE) {
        state.stats.tradesAttempted++;
        
        const result = await executeTrade(best);
        
        if (result) {
          state.stats.tradesExecuted++;
          
          const tradeLog = {
            id: `tx-${Date.now()}`,
            timestamp: Date.now(),
            chain: best.chain,
            chainName: best.chainName,
            strategy: best.strategy,
            route: best.route,
            amountIn: best.amountInEth,
            spreadBps: best.spreadBps,
            expectedProfit: best.netProfitUsd.toFixed(4),
            actualProfit: result.success ? result.profitUsd.toFixed(4) : '0',
            gasCost: result.success ? result.gasUsd.toFixed(4) : '0',
            netProfit: result.success ? result.netProfitUsd.toFixed(4) : '0',
            txHash: result.txHash || '',
            status: result.success ? 'success' : 'failed',
            error: result.error || '',
            executionTimeMs: result.executionTimeMs || 0
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
            }
          }
          
          state.stats.winRate = state.stats.tradesExecuted > 0
            ? (state.stats.tradesSuccessful / state.stats.tradesExecuted) * 100
            : 0;
        }
      }
    } else {
      // Log cada 10 scans
      if (state.stats.totalScans % 10 === 0) {
        const bestOpp = opportunities.length > 0 ? opportunities.sort((a, b) => b.netProfitUsd - a.netProfitUsd)[0] : null;
        console.log(`[SCAN #${state.stats.totalScans}] ${CHAINS[selectedChain].name} | ${scanTime}ms | Best spread: ${bestOpp ? bestOpp.spreadBps + ' bps ($' + bestOpp.netProfitUsd.toFixed(4) + ')' : 'N/A'}`);
      }
    }
    
    // Actualizar balances cada 30 scans
    if (state.stats.totalScans % 30 === 0) {
      for (const chainState of state.chains) {
        if (!chainState.connected) continue;
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
    console.error(`[TICK] Error: ${e.message}`);
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// API
// ═══════════════════════════════════════════════════════════════════════════════

app.get('/api/defi/multichain-arb/status', (req, res) => {
  // Convertir BigInt a string para JSON
  const safeState = JSON.parse(JSON.stringify(state, (key, value) =>
    typeof value === 'bigint' ? value.toString() : value
  ));
  res.json(safeState);
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
  
  console.log(`\n[START] 🔥 SCALPER 3 CHAINS - ${state.isDryRun ? 'DRY RUN' : '⚠️ MODO REAL - EJECUTANDO TRADES'}`);
  console.log(`[CONFIG] Min Profit: $${CONFIG.MIN_PROFIT_USD} | Auto Execute: ${CONFIG.AUTO_EXECUTE}`);
  console.log(`[CHAINS] ${state.chains.filter(c => c.connected).map(c => c.name).join(', ')}\n`);
  
  res.json({
    success: true,
    isRunning: true,
    isDryRun: state.isDryRun,
    mode: 'SCALPER_3CHAINS',
    config: CONFIG,
    connectedChains: state.chains.filter(c => c.connected).map(c => c.name)
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
    mode: 'SCALPER_3CHAINS',
    port: PORT,
    running: state.isRunning,
    dryRun: state.isDryRun,
    wallet: WALLET_ADDRESS,
    chains: state.chains.map(c => ({ name: c.name, connected: c.connected, balance: c.balance })),
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
║   🔥 SCALPER 3 CHAINS - BASE + ARBITRUM + OPTIMISM                            ║
║                                                                               ║
║   ✅ Puerto: ${PORT}                                                           ║
║   ✅ Wallet: ${WALLET_ADDRESS.slice(0, 10)}...${WALLET_ADDRESS.slice(-5)}                                  ║
║                                                                               ║
║   ⚡ Intervalo: ${CONFIG.SCAN_INTERVAL_MS}ms | Min Profit: $${CONFIG.MIN_PROFIT_USD}                           ║
║   ⚡ Auto Execute: ${CONFIG.AUTO_EXECUTE}                                                   ║
║                                                                               ║
║   ⚠️  MODO REAL - Ejecutará trades automáticamente                            ║
║                                                                               ║
╚═══════════════════════════════════════════════════════════════════════════════╝
  `);
  
  await init();
  console.log('[READY] 🔥 POST /api/defi/multichain-arb/start para iniciar.\n');
});

process.on('SIGINT', () => {
  if (timer) clearInterval(timer);
  process.exit(0);
});




 * 🔥 SCALPER 3 CHAINS - BASE + ARBITRUM + OPTIMISM
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * Bot optimizado para 3 chains con:
 * - RPCs alternativos para Optimism
 * - Ejecución automática agresiva
 * - Umbral de profit muy bajo
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
  SCAN_INTERVAL_MS: 500,
  MIN_PROFIT_USD: 0.001,          // Muy bajo para capturar más
  MAX_SLIPPAGE_BPS: 100,          // 1%
  AUTO_EXECUTE: true,
  ETH_PRICE_USD: 3500,
  TRADE_AMOUNTS: [0.005, 0.01, 0.02],
  FEE_TIERS: [500, 3000]          // 0.05% y 0.3%
};

const PRIVATE_KEY = process.env.VITE_ETH_PRIVATE_KEY;
const WALLET_ADDRESS = process.env.VITE_ETH_WALLET_ADDRESS;

if (!PRIVATE_KEY || !WALLET_ADDRESS) {
  console.error('❌ ERROR: Credenciales no configuradas');
  process.exit(1);
}

// ═══════════════════════════════════════════════════════════════════════════════
// 3 CHAINS CON RPCs MÚLTIPLES
// ═══════════════════════════════════════════════════════════════════════════════

const CHAINS = {
  base: {
    name: 'Base',
    chainId: 8453,
    rpcs: [
      'https://base-mainnet.g.alchemy.com/v2/mm-9UjI5oG51l94mRH3fh',
      'https://mainnet.base.org',
      'https://base.llamarpc.com'
    ],
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
    rpcs: [
      'https://arb1.arbitrum.io/rpc',
      'https://arbitrum.llamarpc.com',
      'https://rpc.ankr.com/arbitrum'
    ],
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
    rpcs: [
      'https://optimism.llamarpc.com',
      'https://rpc.ankr.com/optimism',
      'https://optimism-mainnet.public.blastapi.io',
      'https://1rpc.io/op'
    ],
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
  mode: 'SCALPER_3CHAINS',
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
// CONECTAR CON FALLBACK DE RPCs
// ═══════════════════════════════════════════════════════════════════════════════

async function connectWithFallback(chainKey) {
  const chain = CHAINS[chainKey];
  
  for (const rpc of chain.rpcs) {
    try {
      const provider = new ethers.JsonRpcProvider(rpc);
      // Test connection
      await provider.getBlockNumber();
      console.log(`   ✅ ${chain.name}: Conectado a ${rpc.split('/')[2]}`);
      return provider;
    } catch (e) {
      console.log(`   ⚠️ ${chain.name}: RPC ${rpc.split('/')[2]} falló, probando siguiente...`);
    }
  }
  
  throw new Error(`No se pudo conectar a ${chain.name}`);
}

async function init() {
  console.log('[INIT] 🔌 Conectando a 3 chains...\n');
  
  for (const [chainKey, chain] of Object.entries(CHAINS)) {
    try {
      const provider = await connectWithFallback(chainKey);
      providers[chainKey] = provider;
      signers[chainKey] = new ethers.Wallet(PRIVATE_KEY, provider);
      
      contracts[chainKey] = {
        quoter: new ethers.Contract(chain.quoter, QUOTER_ABI, provider),
        router: new ethers.Contract(chain.router, ROUTER_ABI, signers[chainKey]),
        weth: new ethers.Contract(chain.tokens.WETH, WETH_ABI, signers[chainKey])
      };
      
      const balance = await provider.getBalance(WALLET_ADDRESS);
      const balanceEth = parseFloat(ethers.formatEther(balance));
      
      state.chains.push({
        chain: chainKey,
        name: chain.name,
        chainId: chain.chainId,
        balance: balanceEth.toFixed(6),
        balanceUsd: balanceEth * CONFIG.ETH_PRICE_USD,
        routes: CONFIG.FEE_TIERS.length * CONFIG.TRADE_AMOUNTS.length,
        isActive: balanceEth > 0.001,
        lastScan: Date.now(),
        explorer: chain.explorer,
        ethPrice: 0,
        connected: true
      });
      
      state.banditStates.push({
        chain: chainKey,
        alpha: 2,
        beta: 2,
        winRate: 50,
        selected: chainKey === 'base',
        attempts: 0,
        wins: 0
      });
      
      console.log(`   💰 ${chain.name}: ${balanceEth.toFixed(6)} ETH ($${(balanceEth * CONFIG.ETH_PRICE_USD).toFixed(2)})`);
    } catch (e) {
      console.error(`   ❌ ${chain.name}: ${e.message}`);
      state.chains.push({
        chain: chainKey,
        name: chain.name,
        chainId: chain.chainId,
        balance: '0',
        balanceUsd: 0,
        routes: 0,
        isActive: false,
        lastScan: Date.now(),
        explorer: chain.explorer,
        ethPrice: 0,
        connected: false,
        error: e.message
      });
    }
  }
  console.log('');
}

// ═══════════════════════════════════════════════════════════════════════════════
// ESCANEO SIMPLE Y RÁPIDO
// ═══════════════════════════════════════════════════════════════════════════════

async function scanChain(chainKey) {
  const chain = CHAINS[chainKey];
  const provider = providers[chainKey];
  const quoter = contracts[chainKey]?.quoter;
  
  if (!quoter) return [];
  
  const opportunities = [];
  
  try {
    // Gas price
    const feeData = await provider.getFeeData();
    const gasPrice = feeData.gasPrice || ethers.parseUnits('0.01', 'gwei');
    const gasCostWei = gasPrice * 300000n;
    const gasCostUsd = parseFloat(ethers.formatEther(gasCostWei)) * CONFIG.ETH_PRICE_USD;
    
    // Precio ETH
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
    
    // Escanear rutas
    for (const amountEth of CONFIG.TRADE_AMOUNTS) {
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
            const spreadBps = Number((grossProfit * 10000n) / amountWei);
            
            // Registrar TODAS las oportunidades (incluso negativas) para mostrar en UI
            const netProfitUsd = parseFloat(ethers.formatEther(netProfit)) * ethPrice;
            
            opportunities.push({
              chain: chainKey,
              chainName: chain.name,
              strategy: 'FEE_TIER_ARB',
              route: `${CONFIG.FEE_TIERS[i]/100}%→${CONFIG.FEE_TIERS[j]/100}%`,
              amountIn: amountWei.toString(),
              amountInEth: amountEth,
              fee1: CONFIG.FEE_TIERS[i],
              fee2: CONFIG.FEE_TIERS[j],
              usdcIntermediate: usdcOut.toString(),
              wethOut: wethOut.toString(),
              spreadBps,
              netProfitUsd,
              gasCostUsd,
              ethPrice,
              profitable: netProfitUsd >= CONFIG.MIN_PROFIT_USD,
              timestamp: Date.now(),
              // Guardar BigInt originales para ejecución
              _amountInWei: amountWei,
              _usdcOut: usdcOut,
              _wethOut: wethOut
            });
            
          } catch (e) {
            // Pool no existe
          }
        }
      }
    }
    
  } catch (e) {
    console.error(`[SCAN] Error ${chain.name}: ${e.message.slice(0, 50)}`);
  }
  
  return opportunities;
}

// ═══════════════════════════════════════════════════════════════════════════════
// EJECUCIÓN DE TRADE
// ═══════════════════════════════════════════════════════════════════════════════

async function executeTrade(opp) {
  if (isExecuting) return null;
  isExecuting = true;
  
  const chain = CHAINS[opp.chain];
  const signer = signers[opp.chain];
  const provider = providers[opp.chain];
  const { router, weth } = contracts[opp.chain];
  
  // Usar BigInt originales o convertir de string
  const amountIn = opp._amountInWei || BigInt(opp.amountIn);
  const usdcIntermediate = opp._usdcOut || BigInt(opp.usdcIntermediate);
  const wethOut = opp._wethOut || BigInt(opp.wethOut);
  
  console.log(`\n🔥 ═══════════════════════════════════════════════════════════════`);
  console.log(`   EJECUTANDO TRADE EN ${chain.name.toUpperCase()}`);
  console.log(`   Route: ${opp.route}`);
  console.log(`   Amount: ${opp.amountInEth} ETH`);
  console.log(`   Expected: $${opp.netProfitUsd.toFixed(4)}`);
  
  const startTime = Date.now();
  
  try {
    // Verificar balance
    const balance = await provider.getBalance(WALLET_ADDRESS);
    if (balance < amountIn + ethers.parseEther('0.002')) {
      console.log(`   ❌ Balance insuficiente en ${chain.name}`);
      isExecuting = false;
      return { success: false, error: 'Balance insuficiente' };
    }
    
    // 1. Wrap ETH
    console.log(`   📦 Wrapping ETH...`);
    const wrapTx = await weth.deposit({ value: amountIn, gasLimit: 60000 });
    await wrapTx.wait(1);
    console.log(`   ✅ Wrapped`);
    
    // 2. Approve WETH
    const allowance = await weth.allowance(WALLET_ADDRESS, chain.router);
    if (allowance < amountIn) {
      console.log(`   🔓 Approving WETH...`);
      const approveTx = await weth.approve(chain.router, ethers.MaxUint256, { gasLimit: 60000 });
      await approveTx.wait(1);
    }
    
    // 3. SWAP 1: WETH → USDC
    console.log(`   🔄 SWAP 1: WETH → USDC (${opp.fee1/100}%)...`);
    const minUsdc = (usdcIntermediate * BigInt(10000 - CONFIG.MAX_SLIPPAGE_BPS)) / 10000n;
    
    const swap1Tx = await router.exactInputSingle({
      tokenIn: chain.tokens.WETH,
      tokenOut: chain.tokens.USDC,
      fee: opp.fee1,
      recipient: WALLET_ADDRESS,
      amountIn: amountIn,
      amountOutMinimum: minUsdc,
      sqrtPriceLimitX96: 0n
    }, { gasLimit: 350000 });
    
    const receipt1 = await swap1Tx.wait(1);
    console.log(`   ✅ SWAP 1 completado: ${receipt1.hash.slice(0, 16)}...`);
    
    // 4. Obtener balance USDC
    const usdc = new ethers.Contract(chain.tokens.USDC, ERC20_ABI, signer);
    const usdcBalance = await usdc.balanceOf(WALLET_ADDRESS);
    console.log(`   💵 USDC recibido: ${ethers.formatUnits(usdcBalance, 6)}`);
    
    // 5. Approve USDC
    const usdcAllowance = await usdc.allowance(WALLET_ADDRESS, chain.router);
    if (usdcAllowance < usdcBalance) {
      console.log(`   🔓 Approving USDC...`);
      const approveUsdcTx = await usdc.approve(chain.router, ethers.MaxUint256, { gasLimit: 60000 });
      await approveUsdcTx.wait(1);
    }
    
    // 6. SWAP 2: USDC → WETH
    console.log(`   🔄 SWAP 2: USDC → WETH (${opp.fee2/100}%)...`);
    const minWeth = (wethOut * BigInt(10000 - CONFIG.MAX_SLIPPAGE_BPS)) / 10000n;
    
    const swap2Tx = await router.exactInputSingle({
      tokenIn: chain.tokens.USDC,
      tokenOut: chain.tokens.WETH,
      fee: opp.fee2,
      recipient: WALLET_ADDRESS,
      amountIn: usdcBalance,
      amountOutMinimum: minWeth,
      sqrtPriceLimitX96: 0n
    }, { gasLimit: 350000 });
    
    const receipt2 = await swap2Tx.wait(1);
    console.log(`   ✅ SWAP 2 completado: ${receipt2.hash.slice(0, 16)}...`);
    
    // 7. Calcular profit
    const finalWeth = await weth.balanceOf(WALLET_ADDRESS);
    const actualProfit = finalWeth - amountIn;
    const actualProfitUsd = parseFloat(ethers.formatEther(actualProfit)) * opp.ethPrice;
    
    const gas1 = receipt1.gasUsed * receipt1.gasPrice;
    const gas2 = receipt2.gasUsed * receipt2.gasPrice;
    const totalGasUsd = parseFloat(ethers.formatEther(gas1 + gas2)) * opp.ethPrice;
    
    const netProfitUsd = actualProfitUsd - totalGasUsd;
    const executionTime = Date.now() - startTime;
    
    console.log(`   ═══════════════════════════════════════════════════════════════`);
    console.log(`   💰 PROFIT BRUTO: $${actualProfitUsd.toFixed(4)}`);
    console.log(`   ⛽ GAS TOTAL: $${totalGasUsd.toFixed(4)}`);
    console.log(`   💵 PROFIT NETO: $${netProfitUsd.toFixed(4)}`);
    console.log(`   ⏱️  Tiempo: ${executionTime}ms`);
    console.log(`   🔗 ${chain.explorer}/tx/${receipt2.hash}`);
    console.log(`   ═══════════════════════════════════════════════════════════════\n`);
    
    isExecuting = false;
    return {
      success: true,
      profitUsd: actualProfitUsd,
      gasUsd: totalGasUsd,
      netProfitUsd,
      txHash: receipt2.hash,
      executionTimeMs: executionTime
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
  
  // Rotar entre chains activas
  const activeChains = state.chains.filter(c => c.connected && c.isActive);
  if (activeChains.length === 0) {
    console.log('[TICK] No hay chains activas');
    return;
  }
  
  const selectedChain = activeChains[currentChainIndex % activeChains.length].chain;
  currentChainIndex++;
  
  state.stats.currentChain = selectedChain;
  state.banditStates.forEach(b => b.selected = b.chain === selectedChain);
  
  try {
    const opportunities = await scanChain(selectedChain);
    const scanTime = Date.now() - tickStart;
    
    scanTimes.push(scanTime);
    if (scanTimes.length > 20) scanTimes.shift();
    state.stats.avgScanTimeMs = Math.round(scanTimes.reduce((a, b) => a + b, 0) / scanTimes.length);
    state.stats.scansPerSecond = state.stats.avgScanTimeMs > 0 ? Math.round(1000 / state.stats.avgScanTimeMs * 10) / 10 : 0;
    
    // Guardar TODAS las oportunidades para mostrar en UI
    state.opportunities = [...opportunities.slice(0, 10), ...state.opportunities].slice(0, 30);
    
    // Filtrar solo las rentables
    const profitableOpps = opportunities.filter(o => o.profitable);
    
    if (profitableOpps.length > 0) {
      state.stats.opportunitiesFound += profitableOpps.length;
      profitableOpps.sort((a, b) => b.netProfitUsd - a.netProfitUsd);
      
      const best = profitableOpps[0];
      state.stats.lastOpportunity = best;
      
      console.log(`\n[SCAN #${state.stats.totalScans}] ${CHAINS[selectedChain].name} | ${scanTime}ms`);
      console.log(`   🎯 ${profitableOpps.length} OPORTUNIDADES RENTABLES!`);
      console.log(`   💰 MEJOR: ${best.route} | $${best.netProfitUsd.toFixed(4)}`);
      
      // EJECUTAR si no es dry run
      if (!state.isDryRun && CONFIG.AUTO_EXECUTE) {
        state.stats.tradesAttempted++;
        
        const result = await executeTrade(best);
        
        if (result) {
          state.stats.tradesExecuted++;
          
          const tradeLog = {
            id: `tx-${Date.now()}`,
            timestamp: Date.now(),
            chain: best.chain,
            chainName: best.chainName,
            strategy: best.strategy,
            route: best.route,
            amountIn: best.amountInEth,
            spreadBps: best.spreadBps,
            expectedProfit: best.netProfitUsd.toFixed(4),
            actualProfit: result.success ? result.profitUsd.toFixed(4) : '0',
            gasCost: result.success ? result.gasUsd.toFixed(4) : '0',
            netProfit: result.success ? result.netProfitUsd.toFixed(4) : '0',
            txHash: result.txHash || '',
            status: result.success ? 'success' : 'failed',
            error: result.error || '',
            executionTimeMs: result.executionTimeMs || 0
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
            }
          }
          
          state.stats.winRate = state.stats.tradesExecuted > 0
            ? (state.stats.tradesSuccessful / state.stats.tradesExecuted) * 100
            : 0;
        }
      }
    } else {
      // Log cada 10 scans
      if (state.stats.totalScans % 10 === 0) {
        const bestOpp = opportunities.length > 0 ? opportunities.sort((a, b) => b.netProfitUsd - a.netProfitUsd)[0] : null;
        console.log(`[SCAN #${state.stats.totalScans}] ${CHAINS[selectedChain].name} | ${scanTime}ms | Best spread: ${bestOpp ? bestOpp.spreadBps + ' bps ($' + bestOpp.netProfitUsd.toFixed(4) + ')' : 'N/A'}`);
      }
    }
    
    // Actualizar balances cada 30 scans
    if (state.stats.totalScans % 30 === 0) {
      for (const chainState of state.chains) {
        if (!chainState.connected) continue;
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
    console.error(`[TICK] Error: ${e.message}`);
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// API
// ═══════════════════════════════════════════════════════════════════════════════

app.get('/api/defi/multichain-arb/status', (req, res) => {
  // Convertir BigInt a string para JSON
  const safeState = JSON.parse(JSON.stringify(state, (key, value) =>
    typeof value === 'bigint' ? value.toString() : value
  ));
  res.json(safeState);
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
  
  console.log(`\n[START] 🔥 SCALPER 3 CHAINS - ${state.isDryRun ? 'DRY RUN' : '⚠️ MODO REAL - EJECUTANDO TRADES'}`);
  console.log(`[CONFIG] Min Profit: $${CONFIG.MIN_PROFIT_USD} | Auto Execute: ${CONFIG.AUTO_EXECUTE}`);
  console.log(`[CHAINS] ${state.chains.filter(c => c.connected).map(c => c.name).join(', ')}\n`);
  
  res.json({
    success: true,
    isRunning: true,
    isDryRun: state.isDryRun,
    mode: 'SCALPER_3CHAINS',
    config: CONFIG,
    connectedChains: state.chains.filter(c => c.connected).map(c => c.name)
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
    mode: 'SCALPER_3CHAINS',
    port: PORT,
    running: state.isRunning,
    dryRun: state.isDryRun,
    wallet: WALLET_ADDRESS,
    chains: state.chains.map(c => ({ name: c.name, connected: c.connected, balance: c.balance })),
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
║   🔥 SCALPER 3 CHAINS - BASE + ARBITRUM + OPTIMISM                            ║
║                                                                               ║
║   ✅ Puerto: ${PORT}                                                           ║
║   ✅ Wallet: ${WALLET_ADDRESS.slice(0, 10)}...${WALLET_ADDRESS.slice(-5)}                                  ║
║                                                                               ║
║   ⚡ Intervalo: ${CONFIG.SCAN_INTERVAL_MS}ms | Min Profit: $${CONFIG.MIN_PROFIT_USD}                           ║
║   ⚡ Auto Execute: ${CONFIG.AUTO_EXECUTE}                                                   ║
║                                                                               ║
║   ⚠️  MODO REAL - Ejecutará trades automáticamente                            ║
║                                                                               ║
╚═══════════════════════════════════════════════════════════════════════════════╝
  `);
  
  await init();
  console.log('[READY] 🔥 POST /api/defi/multichain-arb/start para iniciar.\n');
});

process.on('SIGINT', () => {
  if (timer) clearInterval(timer);
  process.exit(0);
});




 * 🔥 SCALPER 3 CHAINS - BASE + ARBITRUM + OPTIMISM
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * Bot optimizado para 3 chains con:
 * - RPCs alternativos para Optimism
 * - Ejecución automática agresiva
 * - Umbral de profit muy bajo
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
  SCAN_INTERVAL_MS: 500,
  MIN_PROFIT_USD: 0.001,          // Muy bajo para capturar más
  MAX_SLIPPAGE_BPS: 100,          // 1%
  AUTO_EXECUTE: true,
  ETH_PRICE_USD: 3500,
  TRADE_AMOUNTS: [0.005, 0.01, 0.02],
  FEE_TIERS: [500, 3000]          // 0.05% y 0.3%
};

const PRIVATE_KEY = process.env.VITE_ETH_PRIVATE_KEY;
const WALLET_ADDRESS = process.env.VITE_ETH_WALLET_ADDRESS;

if (!PRIVATE_KEY || !WALLET_ADDRESS) {
  console.error('❌ ERROR: Credenciales no configuradas');
  process.exit(1);
}

// ═══════════════════════════════════════════════════════════════════════════════
// 3 CHAINS CON RPCs MÚLTIPLES
// ═══════════════════════════════════════════════════════════════════════════════

const CHAINS = {
  base: {
    name: 'Base',
    chainId: 8453,
    rpcs: [
      'https://base-mainnet.g.alchemy.com/v2/mm-9UjI5oG51l94mRH3fh',
      'https://mainnet.base.org',
      'https://base.llamarpc.com'
    ],
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
    rpcs: [
      'https://arb1.arbitrum.io/rpc',
      'https://arbitrum.llamarpc.com',
      'https://rpc.ankr.com/arbitrum'
    ],
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
    rpcs: [
      'https://optimism.llamarpc.com',
      'https://rpc.ankr.com/optimism',
      'https://optimism-mainnet.public.blastapi.io',
      'https://1rpc.io/op'
    ],
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
  mode: 'SCALPER_3CHAINS',
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
// CONECTAR CON FALLBACK DE RPCs
// ═══════════════════════════════════════════════════════════════════════════════

async function connectWithFallback(chainKey) {
  const chain = CHAINS[chainKey];
  
  for (const rpc of chain.rpcs) {
    try {
      const provider = new ethers.JsonRpcProvider(rpc);
      // Test connection
      await provider.getBlockNumber();
      console.log(`   ✅ ${chain.name}: Conectado a ${rpc.split('/')[2]}`);
      return provider;
    } catch (e) {
      console.log(`   ⚠️ ${chain.name}: RPC ${rpc.split('/')[2]} falló, probando siguiente...`);
    }
  }
  
  throw new Error(`No se pudo conectar a ${chain.name}`);
}

async function init() {
  console.log('[INIT] 🔌 Conectando a 3 chains...\n');
  
  for (const [chainKey, chain] of Object.entries(CHAINS)) {
    try {
      const provider = await connectWithFallback(chainKey);
      providers[chainKey] = provider;
      signers[chainKey] = new ethers.Wallet(PRIVATE_KEY, provider);
      
      contracts[chainKey] = {
        quoter: new ethers.Contract(chain.quoter, QUOTER_ABI, provider),
        router: new ethers.Contract(chain.router, ROUTER_ABI, signers[chainKey]),
        weth: new ethers.Contract(chain.tokens.WETH, WETH_ABI, signers[chainKey])
      };
      
      const balance = await provider.getBalance(WALLET_ADDRESS);
      const balanceEth = parseFloat(ethers.formatEther(balance));
      
      state.chains.push({
        chain: chainKey,
        name: chain.name,
        chainId: chain.chainId,
        balance: balanceEth.toFixed(6),
        balanceUsd: balanceEth * CONFIG.ETH_PRICE_USD,
        routes: CONFIG.FEE_TIERS.length * CONFIG.TRADE_AMOUNTS.length,
        isActive: balanceEth > 0.001,
        lastScan: Date.now(),
        explorer: chain.explorer,
        ethPrice: 0,
        connected: true
      });
      
      state.banditStates.push({
        chain: chainKey,
        alpha: 2,
        beta: 2,
        winRate: 50,
        selected: chainKey === 'base',
        attempts: 0,
        wins: 0
      });
      
      console.log(`   💰 ${chain.name}: ${balanceEth.toFixed(6)} ETH ($${(balanceEth * CONFIG.ETH_PRICE_USD).toFixed(2)})`);
    } catch (e) {
      console.error(`   ❌ ${chain.name}: ${e.message}`);
      state.chains.push({
        chain: chainKey,
        name: chain.name,
        chainId: chain.chainId,
        balance: '0',
        balanceUsd: 0,
        routes: 0,
        isActive: false,
        lastScan: Date.now(),
        explorer: chain.explorer,
        ethPrice: 0,
        connected: false,
        error: e.message
      });
    }
  }
  console.log('');
}

// ═══════════════════════════════════════════════════════════════════════════════
// ESCANEO SIMPLE Y RÁPIDO
// ═══════════════════════════════════════════════════════════════════════════════

async function scanChain(chainKey) {
  const chain = CHAINS[chainKey];
  const provider = providers[chainKey];
  const quoter = contracts[chainKey]?.quoter;
  
  if (!quoter) return [];
  
  const opportunities = [];
  
  try {
    // Gas price
    const feeData = await provider.getFeeData();
    const gasPrice = feeData.gasPrice || ethers.parseUnits('0.01', 'gwei');
    const gasCostWei = gasPrice * 300000n;
    const gasCostUsd = parseFloat(ethers.formatEther(gasCostWei)) * CONFIG.ETH_PRICE_USD;
    
    // Precio ETH
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
    
    // Escanear rutas
    for (const amountEth of CONFIG.TRADE_AMOUNTS) {
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
            const spreadBps = Number((grossProfit * 10000n) / amountWei);
            
            // Registrar TODAS las oportunidades (incluso negativas) para mostrar en UI
            const netProfitUsd = parseFloat(ethers.formatEther(netProfit)) * ethPrice;
            
            opportunities.push({
              chain: chainKey,
              chainName: chain.name,
              strategy: 'FEE_TIER_ARB',
              route: `${CONFIG.FEE_TIERS[i]/100}%→${CONFIG.FEE_TIERS[j]/100}%`,
              amountIn: amountWei.toString(),
              amountInEth: amountEth,
              fee1: CONFIG.FEE_TIERS[i],
              fee2: CONFIG.FEE_TIERS[j],
              usdcIntermediate: usdcOut.toString(),
              wethOut: wethOut.toString(),
              spreadBps,
              netProfitUsd,
              gasCostUsd,
              ethPrice,
              profitable: netProfitUsd >= CONFIG.MIN_PROFIT_USD,
              timestamp: Date.now(),
              // Guardar BigInt originales para ejecución
              _amountInWei: amountWei,
              _usdcOut: usdcOut,
              _wethOut: wethOut
            });
            
          } catch (e) {
            // Pool no existe
          }
        }
      }
    }
    
  } catch (e) {
    console.error(`[SCAN] Error ${chain.name}: ${e.message.slice(0, 50)}`);
  }
  
  return opportunities;
}

// ═══════════════════════════════════════════════════════════════════════════════
// EJECUCIÓN DE TRADE
// ═══════════════════════════════════════════════════════════════════════════════

async function executeTrade(opp) {
  if (isExecuting) return null;
  isExecuting = true;
  
  const chain = CHAINS[opp.chain];
  const signer = signers[opp.chain];
  const provider = providers[opp.chain];
  const { router, weth } = contracts[opp.chain];
  
  // Usar BigInt originales o convertir de string
  const amountIn = opp._amountInWei || BigInt(opp.amountIn);
  const usdcIntermediate = opp._usdcOut || BigInt(opp.usdcIntermediate);
  const wethOut = opp._wethOut || BigInt(opp.wethOut);
  
  console.log(`\n🔥 ═══════════════════════════════════════════════════════════════`);
  console.log(`   EJECUTANDO TRADE EN ${chain.name.toUpperCase()}`);
  console.log(`   Route: ${opp.route}`);
  console.log(`   Amount: ${opp.amountInEth} ETH`);
  console.log(`   Expected: $${opp.netProfitUsd.toFixed(4)}`);
  
  const startTime = Date.now();
  
  try {
    // Verificar balance
    const balance = await provider.getBalance(WALLET_ADDRESS);
    if (balance < amountIn + ethers.parseEther('0.002')) {
      console.log(`   ❌ Balance insuficiente en ${chain.name}`);
      isExecuting = false;
      return { success: false, error: 'Balance insuficiente' };
    }
    
    // 1. Wrap ETH
    console.log(`   📦 Wrapping ETH...`);
    const wrapTx = await weth.deposit({ value: amountIn, gasLimit: 60000 });
    await wrapTx.wait(1);
    console.log(`   ✅ Wrapped`);
    
    // 2. Approve WETH
    const allowance = await weth.allowance(WALLET_ADDRESS, chain.router);
    if (allowance < amountIn) {
      console.log(`   🔓 Approving WETH...`);
      const approveTx = await weth.approve(chain.router, ethers.MaxUint256, { gasLimit: 60000 });
      await approveTx.wait(1);
    }
    
    // 3. SWAP 1: WETH → USDC
    console.log(`   🔄 SWAP 1: WETH → USDC (${opp.fee1/100}%)...`);
    const minUsdc = (usdcIntermediate * BigInt(10000 - CONFIG.MAX_SLIPPAGE_BPS)) / 10000n;
    
    const swap1Tx = await router.exactInputSingle({
      tokenIn: chain.tokens.WETH,
      tokenOut: chain.tokens.USDC,
      fee: opp.fee1,
      recipient: WALLET_ADDRESS,
      amountIn: amountIn,
      amountOutMinimum: minUsdc,
      sqrtPriceLimitX96: 0n
    }, { gasLimit: 350000 });
    
    const receipt1 = await swap1Tx.wait(1);
    console.log(`   ✅ SWAP 1 completado: ${receipt1.hash.slice(0, 16)}...`);
    
    // 4. Obtener balance USDC
    const usdc = new ethers.Contract(chain.tokens.USDC, ERC20_ABI, signer);
    const usdcBalance = await usdc.balanceOf(WALLET_ADDRESS);
    console.log(`   💵 USDC recibido: ${ethers.formatUnits(usdcBalance, 6)}`);
    
    // 5. Approve USDC
    const usdcAllowance = await usdc.allowance(WALLET_ADDRESS, chain.router);
    if (usdcAllowance < usdcBalance) {
      console.log(`   🔓 Approving USDC...`);
      const approveUsdcTx = await usdc.approve(chain.router, ethers.MaxUint256, { gasLimit: 60000 });
      await approveUsdcTx.wait(1);
    }
    
    // 6. SWAP 2: USDC → WETH
    console.log(`   🔄 SWAP 2: USDC → WETH (${opp.fee2/100}%)...`);
    const minWeth = (wethOut * BigInt(10000 - CONFIG.MAX_SLIPPAGE_BPS)) / 10000n;
    
    const swap2Tx = await router.exactInputSingle({
      tokenIn: chain.tokens.USDC,
      tokenOut: chain.tokens.WETH,
      fee: opp.fee2,
      recipient: WALLET_ADDRESS,
      amountIn: usdcBalance,
      amountOutMinimum: minWeth,
      sqrtPriceLimitX96: 0n
    }, { gasLimit: 350000 });
    
    const receipt2 = await swap2Tx.wait(1);
    console.log(`   ✅ SWAP 2 completado: ${receipt2.hash.slice(0, 16)}...`);
    
    // 7. Calcular profit
    const finalWeth = await weth.balanceOf(WALLET_ADDRESS);
    const actualProfit = finalWeth - amountIn;
    const actualProfitUsd = parseFloat(ethers.formatEther(actualProfit)) * opp.ethPrice;
    
    const gas1 = receipt1.gasUsed * receipt1.gasPrice;
    const gas2 = receipt2.gasUsed * receipt2.gasPrice;
    const totalGasUsd = parseFloat(ethers.formatEther(gas1 + gas2)) * opp.ethPrice;
    
    const netProfitUsd = actualProfitUsd - totalGasUsd;
    const executionTime = Date.now() - startTime;
    
    console.log(`   ═══════════════════════════════════════════════════════════════`);
    console.log(`   💰 PROFIT BRUTO: $${actualProfitUsd.toFixed(4)}`);
    console.log(`   ⛽ GAS TOTAL: $${totalGasUsd.toFixed(4)}`);
    console.log(`   💵 PROFIT NETO: $${netProfitUsd.toFixed(4)}`);
    console.log(`   ⏱️  Tiempo: ${executionTime}ms`);
    console.log(`   🔗 ${chain.explorer}/tx/${receipt2.hash}`);
    console.log(`   ═══════════════════════════════════════════════════════════════\n`);
    
    isExecuting = false;
    return {
      success: true,
      profitUsd: actualProfitUsd,
      gasUsd: totalGasUsd,
      netProfitUsd,
      txHash: receipt2.hash,
      executionTimeMs: executionTime
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
  
  // Rotar entre chains activas
  const activeChains = state.chains.filter(c => c.connected && c.isActive);
  if (activeChains.length === 0) {
    console.log('[TICK] No hay chains activas');
    return;
  }
  
  const selectedChain = activeChains[currentChainIndex % activeChains.length].chain;
  currentChainIndex++;
  
  state.stats.currentChain = selectedChain;
  state.banditStates.forEach(b => b.selected = b.chain === selectedChain);
  
  try {
    const opportunities = await scanChain(selectedChain);
    const scanTime = Date.now() - tickStart;
    
    scanTimes.push(scanTime);
    if (scanTimes.length > 20) scanTimes.shift();
    state.stats.avgScanTimeMs = Math.round(scanTimes.reduce((a, b) => a + b, 0) / scanTimes.length);
    state.stats.scansPerSecond = state.stats.avgScanTimeMs > 0 ? Math.round(1000 / state.stats.avgScanTimeMs * 10) / 10 : 0;
    
    // Guardar TODAS las oportunidades para mostrar en UI
    state.opportunities = [...opportunities.slice(0, 10), ...state.opportunities].slice(0, 30);
    
    // Filtrar solo las rentables
    const profitableOpps = opportunities.filter(o => o.profitable);
    
    if (profitableOpps.length > 0) {
      state.stats.opportunitiesFound += profitableOpps.length;
      profitableOpps.sort((a, b) => b.netProfitUsd - a.netProfitUsd);
      
      const best = profitableOpps[0];
      state.stats.lastOpportunity = best;
      
      console.log(`\n[SCAN #${state.stats.totalScans}] ${CHAINS[selectedChain].name} | ${scanTime}ms`);
      console.log(`   🎯 ${profitableOpps.length} OPORTUNIDADES RENTABLES!`);
      console.log(`   💰 MEJOR: ${best.route} | $${best.netProfitUsd.toFixed(4)}`);
      
      // EJECUTAR si no es dry run
      if (!state.isDryRun && CONFIG.AUTO_EXECUTE) {
        state.stats.tradesAttempted++;
        
        const result = await executeTrade(best);
        
        if (result) {
          state.stats.tradesExecuted++;
          
          const tradeLog = {
            id: `tx-${Date.now()}`,
            timestamp: Date.now(),
            chain: best.chain,
            chainName: best.chainName,
            strategy: best.strategy,
            route: best.route,
            amountIn: best.amountInEth,
            spreadBps: best.spreadBps,
            expectedProfit: best.netProfitUsd.toFixed(4),
            actualProfit: result.success ? result.profitUsd.toFixed(4) : '0',
            gasCost: result.success ? result.gasUsd.toFixed(4) : '0',
            netProfit: result.success ? result.netProfitUsd.toFixed(4) : '0',
            txHash: result.txHash || '',
            status: result.success ? 'success' : 'failed',
            error: result.error || '',
            executionTimeMs: result.executionTimeMs || 0
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
            }
          }
          
          state.stats.winRate = state.stats.tradesExecuted > 0
            ? (state.stats.tradesSuccessful / state.stats.tradesExecuted) * 100
            : 0;
        }
      }
    } else {
      // Log cada 10 scans
      if (state.stats.totalScans % 10 === 0) {
        const bestOpp = opportunities.length > 0 ? opportunities.sort((a, b) => b.netProfitUsd - a.netProfitUsd)[0] : null;
        console.log(`[SCAN #${state.stats.totalScans}] ${CHAINS[selectedChain].name} | ${scanTime}ms | Best spread: ${bestOpp ? bestOpp.spreadBps + ' bps ($' + bestOpp.netProfitUsd.toFixed(4) + ')' : 'N/A'}`);
      }
    }
    
    // Actualizar balances cada 30 scans
    if (state.stats.totalScans % 30 === 0) {
      for (const chainState of state.chains) {
        if (!chainState.connected) continue;
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
    console.error(`[TICK] Error: ${e.message}`);
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// API
// ═══════════════════════════════════════════════════════════════════════════════

app.get('/api/defi/multichain-arb/status', (req, res) => {
  // Convertir BigInt a string para JSON
  const safeState = JSON.parse(JSON.stringify(state, (key, value) =>
    typeof value === 'bigint' ? value.toString() : value
  ));
  res.json(safeState);
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
  
  console.log(`\n[START] 🔥 SCALPER 3 CHAINS - ${state.isDryRun ? 'DRY RUN' : '⚠️ MODO REAL - EJECUTANDO TRADES'}`);
  console.log(`[CONFIG] Min Profit: $${CONFIG.MIN_PROFIT_USD} | Auto Execute: ${CONFIG.AUTO_EXECUTE}`);
  console.log(`[CHAINS] ${state.chains.filter(c => c.connected).map(c => c.name).join(', ')}\n`);
  
  res.json({
    success: true,
    isRunning: true,
    isDryRun: state.isDryRun,
    mode: 'SCALPER_3CHAINS',
    config: CONFIG,
    connectedChains: state.chains.filter(c => c.connected).map(c => c.name)
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
    mode: 'SCALPER_3CHAINS',
    port: PORT,
    running: state.isRunning,
    dryRun: state.isDryRun,
    wallet: WALLET_ADDRESS,
    chains: state.chains.map(c => ({ name: c.name, connected: c.connected, balance: c.balance })),
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
║   🔥 SCALPER 3 CHAINS - BASE + ARBITRUM + OPTIMISM                            ║
║                                                                               ║
║   ✅ Puerto: ${PORT}                                                           ║
║   ✅ Wallet: ${WALLET_ADDRESS.slice(0, 10)}...${WALLET_ADDRESS.slice(-5)}                                  ║
║                                                                               ║
║   ⚡ Intervalo: ${CONFIG.SCAN_INTERVAL_MS}ms | Min Profit: $${CONFIG.MIN_PROFIT_USD}                           ║
║   ⚡ Auto Execute: ${CONFIG.AUTO_EXECUTE}                                                   ║
║                                                                               ║
║   ⚠️  MODO REAL - Ejecutará trades automáticamente                            ║
║                                                                               ║
╚═══════════════════════════════════════════════════════════════════════════════╝
  `);
  
  await init();
  console.log('[READY] 🔥 POST /api/defi/multichain-arb/start para iniciar.\n');
});

process.on('SIGINT', () => {
  if (timer) clearInterval(timer);
  process.exit(0);
});




 * 🔥 SCALPER 3 CHAINS - BASE + ARBITRUM + OPTIMISM
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * Bot optimizado para 3 chains con:
 * - RPCs alternativos para Optimism
 * - Ejecución automática agresiva
 * - Umbral de profit muy bajo
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
  SCAN_INTERVAL_MS: 500,
  MIN_PROFIT_USD: 0.001,          // Muy bajo para capturar más
  MAX_SLIPPAGE_BPS: 100,          // 1%
  AUTO_EXECUTE: true,
  ETH_PRICE_USD: 3500,
  TRADE_AMOUNTS: [0.005, 0.01, 0.02],
  FEE_TIERS: [500, 3000]          // 0.05% y 0.3%
};

const PRIVATE_KEY = process.env.VITE_ETH_PRIVATE_KEY;
const WALLET_ADDRESS = process.env.VITE_ETH_WALLET_ADDRESS;

if (!PRIVATE_KEY || !WALLET_ADDRESS) {
  console.error('❌ ERROR: Credenciales no configuradas');
  process.exit(1);
}

// ═══════════════════════════════════════════════════════════════════════════════
// 3 CHAINS CON RPCs MÚLTIPLES
// ═══════════════════════════════════════════════════════════════════════════════

const CHAINS = {
  base: {
    name: 'Base',
    chainId: 8453,
    rpcs: [
      'https://base-mainnet.g.alchemy.com/v2/mm-9UjI5oG51l94mRH3fh',
      'https://mainnet.base.org',
      'https://base.llamarpc.com'
    ],
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
    rpcs: [
      'https://arb1.arbitrum.io/rpc',
      'https://arbitrum.llamarpc.com',
      'https://rpc.ankr.com/arbitrum'
    ],
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
    rpcs: [
      'https://optimism.llamarpc.com',
      'https://rpc.ankr.com/optimism',
      'https://optimism-mainnet.public.blastapi.io',
      'https://1rpc.io/op'
    ],
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
  mode: 'SCALPER_3CHAINS',
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
// CONECTAR CON FALLBACK DE RPCs
// ═══════════════════════════════════════════════════════════════════════════════

async function connectWithFallback(chainKey) {
  const chain = CHAINS[chainKey];
  
  for (const rpc of chain.rpcs) {
    try {
      const provider = new ethers.JsonRpcProvider(rpc);
      // Test connection
      await provider.getBlockNumber();
      console.log(`   ✅ ${chain.name}: Conectado a ${rpc.split('/')[2]}`);
      return provider;
    } catch (e) {
      console.log(`   ⚠️ ${chain.name}: RPC ${rpc.split('/')[2]} falló, probando siguiente...`);
    }
  }
  
  throw new Error(`No se pudo conectar a ${chain.name}`);
}

async function init() {
  console.log('[INIT] 🔌 Conectando a 3 chains...\n');
  
  for (const [chainKey, chain] of Object.entries(CHAINS)) {
    try {
      const provider = await connectWithFallback(chainKey);
      providers[chainKey] = provider;
      signers[chainKey] = new ethers.Wallet(PRIVATE_KEY, provider);
      
      contracts[chainKey] = {
        quoter: new ethers.Contract(chain.quoter, QUOTER_ABI, provider),
        router: new ethers.Contract(chain.router, ROUTER_ABI, signers[chainKey]),
        weth: new ethers.Contract(chain.tokens.WETH, WETH_ABI, signers[chainKey])
      };
      
      const balance = await provider.getBalance(WALLET_ADDRESS);
      const balanceEth = parseFloat(ethers.formatEther(balance));
      
      state.chains.push({
        chain: chainKey,
        name: chain.name,
        chainId: chain.chainId,
        balance: balanceEth.toFixed(6),
        balanceUsd: balanceEth * CONFIG.ETH_PRICE_USD,
        routes: CONFIG.FEE_TIERS.length * CONFIG.TRADE_AMOUNTS.length,
        isActive: balanceEth > 0.001,
        lastScan: Date.now(),
        explorer: chain.explorer,
        ethPrice: 0,
        connected: true
      });
      
      state.banditStates.push({
        chain: chainKey,
        alpha: 2,
        beta: 2,
        winRate: 50,
        selected: chainKey === 'base',
        attempts: 0,
        wins: 0
      });
      
      console.log(`   💰 ${chain.name}: ${balanceEth.toFixed(6)} ETH ($${(balanceEth * CONFIG.ETH_PRICE_USD).toFixed(2)})`);
    } catch (e) {
      console.error(`   ❌ ${chain.name}: ${e.message}`);
      state.chains.push({
        chain: chainKey,
        name: chain.name,
        chainId: chain.chainId,
        balance: '0',
        balanceUsd: 0,
        routes: 0,
        isActive: false,
        lastScan: Date.now(),
        explorer: chain.explorer,
        ethPrice: 0,
        connected: false,
        error: e.message
      });
    }
  }
  console.log('');
}

// ═══════════════════════════════════════════════════════════════════════════════
// ESCANEO SIMPLE Y RÁPIDO
// ═══════════════════════════════════════════════════════════════════════════════

async function scanChain(chainKey) {
  const chain = CHAINS[chainKey];
  const provider = providers[chainKey];
  const quoter = contracts[chainKey]?.quoter;
  
  if (!quoter) return [];
  
  const opportunities = [];
  
  try {
    // Gas price
    const feeData = await provider.getFeeData();
    const gasPrice = feeData.gasPrice || ethers.parseUnits('0.01', 'gwei');
    const gasCostWei = gasPrice * 300000n;
    const gasCostUsd = parseFloat(ethers.formatEther(gasCostWei)) * CONFIG.ETH_PRICE_USD;
    
    // Precio ETH
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
    
    // Escanear rutas
    for (const amountEth of CONFIG.TRADE_AMOUNTS) {
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
            const spreadBps = Number((grossProfit * 10000n) / amountWei);
            
            // Registrar TODAS las oportunidades (incluso negativas) para mostrar en UI
            const netProfitUsd = parseFloat(ethers.formatEther(netProfit)) * ethPrice;
            
            opportunities.push({
              chain: chainKey,
              chainName: chain.name,
              strategy: 'FEE_TIER_ARB',
              route: `${CONFIG.FEE_TIERS[i]/100}%→${CONFIG.FEE_TIERS[j]/100}%`,
              amountIn: amountWei.toString(),
              amountInEth: amountEth,
              fee1: CONFIG.FEE_TIERS[i],
              fee2: CONFIG.FEE_TIERS[j],
              usdcIntermediate: usdcOut.toString(),
              wethOut: wethOut.toString(),
              spreadBps,
              netProfitUsd,
              gasCostUsd,
              ethPrice,
              profitable: netProfitUsd >= CONFIG.MIN_PROFIT_USD,
              timestamp: Date.now(),
              // Guardar BigInt originales para ejecución
              _amountInWei: amountWei,
              _usdcOut: usdcOut,
              _wethOut: wethOut
            });
            
          } catch (e) {
            // Pool no existe
          }
        }
      }
    }
    
  } catch (e) {
    console.error(`[SCAN] Error ${chain.name}: ${e.message.slice(0, 50)}`);
  }
  
  return opportunities;
}

// ═══════════════════════════════════════════════════════════════════════════════
// EJECUCIÓN DE TRADE
// ═══════════════════════════════════════════════════════════════════════════════

async function executeTrade(opp) {
  if (isExecuting) return null;
  isExecuting = true;
  
  const chain = CHAINS[opp.chain];
  const signer = signers[opp.chain];
  const provider = providers[opp.chain];
  const { router, weth } = contracts[opp.chain];
  
  // Usar BigInt originales o convertir de string
  const amountIn = opp._amountInWei || BigInt(opp.amountIn);
  const usdcIntermediate = opp._usdcOut || BigInt(opp.usdcIntermediate);
  const wethOut = opp._wethOut || BigInt(opp.wethOut);
  
  console.log(`\n🔥 ═══════════════════════════════════════════════════════════════`);
  console.log(`   EJECUTANDO TRADE EN ${chain.name.toUpperCase()}`);
  console.log(`   Route: ${opp.route}`);
  console.log(`   Amount: ${opp.amountInEth} ETH`);
  console.log(`   Expected: $${opp.netProfitUsd.toFixed(4)}`);
  
  const startTime = Date.now();
  
  try {
    // Verificar balance
    const balance = await provider.getBalance(WALLET_ADDRESS);
    if (balance < amountIn + ethers.parseEther('0.002')) {
      console.log(`   ❌ Balance insuficiente en ${chain.name}`);
      isExecuting = false;
      return { success: false, error: 'Balance insuficiente' };
    }
    
    // 1. Wrap ETH
    console.log(`   📦 Wrapping ETH...`);
    const wrapTx = await weth.deposit({ value: amountIn, gasLimit: 60000 });
    await wrapTx.wait(1);
    console.log(`   ✅ Wrapped`);
    
    // 2. Approve WETH
    const allowance = await weth.allowance(WALLET_ADDRESS, chain.router);
    if (allowance < amountIn) {
      console.log(`   🔓 Approving WETH...`);
      const approveTx = await weth.approve(chain.router, ethers.MaxUint256, { gasLimit: 60000 });
      await approveTx.wait(1);
    }
    
    // 3. SWAP 1: WETH → USDC
    console.log(`   🔄 SWAP 1: WETH → USDC (${opp.fee1/100}%)...`);
    const minUsdc = (usdcIntermediate * BigInt(10000 - CONFIG.MAX_SLIPPAGE_BPS)) / 10000n;
    
    const swap1Tx = await router.exactInputSingle({
      tokenIn: chain.tokens.WETH,
      tokenOut: chain.tokens.USDC,
      fee: opp.fee1,
      recipient: WALLET_ADDRESS,
      amountIn: amountIn,
      amountOutMinimum: minUsdc,
      sqrtPriceLimitX96: 0n
    }, { gasLimit: 350000 });
    
    const receipt1 = await swap1Tx.wait(1);
    console.log(`   ✅ SWAP 1 completado: ${receipt1.hash.slice(0, 16)}...`);
    
    // 4. Obtener balance USDC
    const usdc = new ethers.Contract(chain.tokens.USDC, ERC20_ABI, signer);
    const usdcBalance = await usdc.balanceOf(WALLET_ADDRESS);
    console.log(`   💵 USDC recibido: ${ethers.formatUnits(usdcBalance, 6)}`);
    
    // 5. Approve USDC
    const usdcAllowance = await usdc.allowance(WALLET_ADDRESS, chain.router);
    if (usdcAllowance < usdcBalance) {
      console.log(`   🔓 Approving USDC...`);
      const approveUsdcTx = await usdc.approve(chain.router, ethers.MaxUint256, { gasLimit: 60000 });
      await approveUsdcTx.wait(1);
    }
    
    // 6. SWAP 2: USDC → WETH
    console.log(`   🔄 SWAP 2: USDC → WETH (${opp.fee2/100}%)...`);
    const minWeth = (wethOut * BigInt(10000 - CONFIG.MAX_SLIPPAGE_BPS)) / 10000n;
    
    const swap2Tx = await router.exactInputSingle({
      tokenIn: chain.tokens.USDC,
      tokenOut: chain.tokens.WETH,
      fee: opp.fee2,
      recipient: WALLET_ADDRESS,
      amountIn: usdcBalance,
      amountOutMinimum: minWeth,
      sqrtPriceLimitX96: 0n
    }, { gasLimit: 350000 });
    
    const receipt2 = await swap2Tx.wait(1);
    console.log(`   ✅ SWAP 2 completado: ${receipt2.hash.slice(0, 16)}...`);
    
    // 7. Calcular profit
    const finalWeth = await weth.balanceOf(WALLET_ADDRESS);
    const actualProfit = finalWeth - amountIn;
    const actualProfitUsd = parseFloat(ethers.formatEther(actualProfit)) * opp.ethPrice;
    
    const gas1 = receipt1.gasUsed * receipt1.gasPrice;
    const gas2 = receipt2.gasUsed * receipt2.gasPrice;
    const totalGasUsd = parseFloat(ethers.formatEther(gas1 + gas2)) * opp.ethPrice;
    
    const netProfitUsd = actualProfitUsd - totalGasUsd;
    const executionTime = Date.now() - startTime;
    
    console.log(`   ═══════════════════════════════════════════════════════════════`);
    console.log(`   💰 PROFIT BRUTO: $${actualProfitUsd.toFixed(4)}`);
    console.log(`   ⛽ GAS TOTAL: $${totalGasUsd.toFixed(4)}`);
    console.log(`   💵 PROFIT NETO: $${netProfitUsd.toFixed(4)}`);
    console.log(`   ⏱️  Tiempo: ${executionTime}ms`);
    console.log(`   🔗 ${chain.explorer}/tx/${receipt2.hash}`);
    console.log(`   ═══════════════════════════════════════════════════════════════\n`);
    
    isExecuting = false;
    return {
      success: true,
      profitUsd: actualProfitUsd,
      gasUsd: totalGasUsd,
      netProfitUsd,
      txHash: receipt2.hash,
      executionTimeMs: executionTime
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
  
  // Rotar entre chains activas
  const activeChains = state.chains.filter(c => c.connected && c.isActive);
  if (activeChains.length === 0) {
    console.log('[TICK] No hay chains activas');
    return;
  }
  
  const selectedChain = activeChains[currentChainIndex % activeChains.length].chain;
  currentChainIndex++;
  
  state.stats.currentChain = selectedChain;
  state.banditStates.forEach(b => b.selected = b.chain === selectedChain);
  
  try {
    const opportunities = await scanChain(selectedChain);
    const scanTime = Date.now() - tickStart;
    
    scanTimes.push(scanTime);
    if (scanTimes.length > 20) scanTimes.shift();
    state.stats.avgScanTimeMs = Math.round(scanTimes.reduce((a, b) => a + b, 0) / scanTimes.length);
    state.stats.scansPerSecond = state.stats.avgScanTimeMs > 0 ? Math.round(1000 / state.stats.avgScanTimeMs * 10) / 10 : 0;
    
    // Guardar TODAS las oportunidades para mostrar en UI
    state.opportunities = [...opportunities.slice(0, 10), ...state.opportunities].slice(0, 30);
    
    // Filtrar solo las rentables
    const profitableOpps = opportunities.filter(o => o.profitable);
    
    if (profitableOpps.length > 0) {
      state.stats.opportunitiesFound += profitableOpps.length;
      profitableOpps.sort((a, b) => b.netProfitUsd - a.netProfitUsd);
      
      const best = profitableOpps[0];
      state.stats.lastOpportunity = best;
      
      console.log(`\n[SCAN #${state.stats.totalScans}] ${CHAINS[selectedChain].name} | ${scanTime}ms`);
      console.log(`   🎯 ${profitableOpps.length} OPORTUNIDADES RENTABLES!`);
      console.log(`   💰 MEJOR: ${best.route} | $${best.netProfitUsd.toFixed(4)}`);
      
      // EJECUTAR si no es dry run
      if (!state.isDryRun && CONFIG.AUTO_EXECUTE) {
        state.stats.tradesAttempted++;
        
        const result = await executeTrade(best);
        
        if (result) {
          state.stats.tradesExecuted++;
          
          const tradeLog = {
            id: `tx-${Date.now()}`,
            timestamp: Date.now(),
            chain: best.chain,
            chainName: best.chainName,
            strategy: best.strategy,
            route: best.route,
            amountIn: best.amountInEth,
            spreadBps: best.spreadBps,
            expectedProfit: best.netProfitUsd.toFixed(4),
            actualProfit: result.success ? result.profitUsd.toFixed(4) : '0',
            gasCost: result.success ? result.gasUsd.toFixed(4) : '0',
            netProfit: result.success ? result.netProfitUsd.toFixed(4) : '0',
            txHash: result.txHash || '',
            status: result.success ? 'success' : 'failed',
            error: result.error || '',
            executionTimeMs: result.executionTimeMs || 0
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
            }
          }
          
          state.stats.winRate = state.stats.tradesExecuted > 0
            ? (state.stats.tradesSuccessful / state.stats.tradesExecuted) * 100
            : 0;
        }
      }
    } else {
      // Log cada 10 scans
      if (state.stats.totalScans % 10 === 0) {
        const bestOpp = opportunities.length > 0 ? opportunities.sort((a, b) => b.netProfitUsd - a.netProfitUsd)[0] : null;
        console.log(`[SCAN #${state.stats.totalScans}] ${CHAINS[selectedChain].name} | ${scanTime}ms | Best spread: ${bestOpp ? bestOpp.spreadBps + ' bps ($' + bestOpp.netProfitUsd.toFixed(4) + ')' : 'N/A'}`);
      }
    }
    
    // Actualizar balances cada 30 scans
    if (state.stats.totalScans % 30 === 0) {
      for (const chainState of state.chains) {
        if (!chainState.connected) continue;
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
    console.error(`[TICK] Error: ${e.message}`);
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// API
// ═══════════════════════════════════════════════════════════════════════════════

app.get('/api/defi/multichain-arb/status', (req, res) => {
  // Convertir BigInt a string para JSON
  const safeState = JSON.parse(JSON.stringify(state, (key, value) =>
    typeof value === 'bigint' ? value.toString() : value
  ));
  res.json(safeState);
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
  
  console.log(`\n[START] 🔥 SCALPER 3 CHAINS - ${state.isDryRun ? 'DRY RUN' : '⚠️ MODO REAL - EJECUTANDO TRADES'}`);
  console.log(`[CONFIG] Min Profit: $${CONFIG.MIN_PROFIT_USD} | Auto Execute: ${CONFIG.AUTO_EXECUTE}`);
  console.log(`[CHAINS] ${state.chains.filter(c => c.connected).map(c => c.name).join(', ')}\n`);
  
  res.json({
    success: true,
    isRunning: true,
    isDryRun: state.isDryRun,
    mode: 'SCALPER_3CHAINS',
    config: CONFIG,
    connectedChains: state.chains.filter(c => c.connected).map(c => c.name)
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
    mode: 'SCALPER_3CHAINS',
    port: PORT,
    running: state.isRunning,
    dryRun: state.isDryRun,
    wallet: WALLET_ADDRESS,
    chains: state.chains.map(c => ({ name: c.name, connected: c.connected, balance: c.balance })),
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
║   🔥 SCALPER 3 CHAINS - BASE + ARBITRUM + OPTIMISM                            ║
║                                                                               ║
║   ✅ Puerto: ${PORT}                                                           ║
║   ✅ Wallet: ${WALLET_ADDRESS.slice(0, 10)}...${WALLET_ADDRESS.slice(-5)}                                  ║
║                                                                               ║
║   ⚡ Intervalo: ${CONFIG.SCAN_INTERVAL_MS}ms | Min Profit: $${CONFIG.MIN_PROFIT_USD}                           ║
║   ⚡ Auto Execute: ${CONFIG.AUTO_EXECUTE}                                                   ║
║                                                                               ║
║   ⚠️  MODO REAL - Ejecutará trades automáticamente                            ║
║                                                                               ║
╚═══════════════════════════════════════════════════════════════════════════════╝
  `);
  
  await init();
  console.log('[READY] 🔥 POST /api/defi/multichain-arb/start para iniciar.\n');
});

process.on('SIGINT', () => {
  if (timer) clearInterval(timer);
  process.exit(0);
});


 * 🔥 SCALPER 3 CHAINS - BASE + ARBITRUM + OPTIMISM
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * Bot optimizado para 3 chains con:
 * - RPCs alternativos para Optimism
 * - Ejecución automática agresiva
 * - Umbral de profit muy bajo
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
  SCAN_INTERVAL_MS: 500,
  MIN_PROFIT_USD: 0.001,          // Muy bajo para capturar más
  MAX_SLIPPAGE_BPS: 100,          // 1%
  AUTO_EXECUTE: true,
  ETH_PRICE_USD: 3500,
  TRADE_AMOUNTS: [0.005, 0.01, 0.02],
  FEE_TIERS: [500, 3000]          // 0.05% y 0.3%
};

const PRIVATE_KEY = process.env.VITE_ETH_PRIVATE_KEY;
const WALLET_ADDRESS = process.env.VITE_ETH_WALLET_ADDRESS;

if (!PRIVATE_KEY || !WALLET_ADDRESS) {
  console.error('❌ ERROR: Credenciales no configuradas');
  process.exit(1);
}

// ═══════════════════════════════════════════════════════════════════════════════
// 3 CHAINS CON RPCs MÚLTIPLES
// ═══════════════════════════════════════════════════════════════════════════════

const CHAINS = {
  base: {
    name: 'Base',
    chainId: 8453,
    rpcs: [
      'https://base-mainnet.g.alchemy.com/v2/mm-9UjI5oG51l94mRH3fh',
      'https://mainnet.base.org',
      'https://base.llamarpc.com'
    ],
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
    rpcs: [
      'https://arb1.arbitrum.io/rpc',
      'https://arbitrum.llamarpc.com',
      'https://rpc.ankr.com/arbitrum'
    ],
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
    rpcs: [
      'https://optimism.llamarpc.com',
      'https://rpc.ankr.com/optimism',
      'https://optimism-mainnet.public.blastapi.io',
      'https://1rpc.io/op'
    ],
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
  mode: 'SCALPER_3CHAINS',
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
// CONECTAR CON FALLBACK DE RPCs
// ═══════════════════════════════════════════════════════════════════════════════

async function connectWithFallback(chainKey) {
  const chain = CHAINS[chainKey];
  
  for (const rpc of chain.rpcs) {
    try {
      const provider = new ethers.JsonRpcProvider(rpc);
      // Test connection
      await provider.getBlockNumber();
      console.log(`   ✅ ${chain.name}: Conectado a ${rpc.split('/')[2]}`);
      return provider;
    } catch (e) {
      console.log(`   ⚠️ ${chain.name}: RPC ${rpc.split('/')[2]} falló, probando siguiente...`);
    }
  }
  
  throw new Error(`No se pudo conectar a ${chain.name}`);
}

async function init() {
  console.log('[INIT] 🔌 Conectando a 3 chains...\n');
  
  for (const [chainKey, chain] of Object.entries(CHAINS)) {
    try {
      const provider = await connectWithFallback(chainKey);
      providers[chainKey] = provider;
      signers[chainKey] = new ethers.Wallet(PRIVATE_KEY, provider);
      
      contracts[chainKey] = {
        quoter: new ethers.Contract(chain.quoter, QUOTER_ABI, provider),
        router: new ethers.Contract(chain.router, ROUTER_ABI, signers[chainKey]),
        weth: new ethers.Contract(chain.tokens.WETH, WETH_ABI, signers[chainKey])
      };
      
      const balance = await provider.getBalance(WALLET_ADDRESS);
      const balanceEth = parseFloat(ethers.formatEther(balance));
      
      state.chains.push({
        chain: chainKey,
        name: chain.name,
        chainId: chain.chainId,
        balance: balanceEth.toFixed(6),
        balanceUsd: balanceEth * CONFIG.ETH_PRICE_USD,
        routes: CONFIG.FEE_TIERS.length * CONFIG.TRADE_AMOUNTS.length,
        isActive: balanceEth > 0.001,
        lastScan: Date.now(),
        explorer: chain.explorer,
        ethPrice: 0,
        connected: true
      });
      
      state.banditStates.push({
        chain: chainKey,
        alpha: 2,
        beta: 2,
        winRate: 50,
        selected: chainKey === 'base',
        attempts: 0,
        wins: 0
      });
      
      console.log(`   💰 ${chain.name}: ${balanceEth.toFixed(6)} ETH ($${(balanceEth * CONFIG.ETH_PRICE_USD).toFixed(2)})`);
    } catch (e) {
      console.error(`   ❌ ${chain.name}: ${e.message}`);
      state.chains.push({
        chain: chainKey,
        name: chain.name,
        chainId: chain.chainId,
        balance: '0',
        balanceUsd: 0,
        routes: 0,
        isActive: false,
        lastScan: Date.now(),
        explorer: chain.explorer,
        ethPrice: 0,
        connected: false,
        error: e.message
      });
    }
  }
  console.log('');
}

// ═══════════════════════════════════════════════════════════════════════════════
// ESCANEO SIMPLE Y RÁPIDO
// ═══════════════════════════════════════════════════════════════════════════════

async function scanChain(chainKey) {
  const chain = CHAINS[chainKey];
  const provider = providers[chainKey];
  const quoter = contracts[chainKey]?.quoter;
  
  if (!quoter) return [];
  
  const opportunities = [];
  
  try {
    // Gas price
    const feeData = await provider.getFeeData();
    const gasPrice = feeData.gasPrice || ethers.parseUnits('0.01', 'gwei');
    const gasCostWei = gasPrice * 300000n;
    const gasCostUsd = parseFloat(ethers.formatEther(gasCostWei)) * CONFIG.ETH_PRICE_USD;
    
    // Precio ETH
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
    
    // Escanear rutas
    for (const amountEth of CONFIG.TRADE_AMOUNTS) {
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
            const spreadBps = Number((grossProfit * 10000n) / amountWei);
            
            // Registrar TODAS las oportunidades (incluso negativas) para mostrar en UI
            const netProfitUsd = parseFloat(ethers.formatEther(netProfit)) * ethPrice;
            
            opportunities.push({
              chain: chainKey,
              chainName: chain.name,
              strategy: 'FEE_TIER_ARB',
              route: `${CONFIG.FEE_TIERS[i]/100}%→${CONFIG.FEE_TIERS[j]/100}%`,
              amountIn: amountWei.toString(),
              amountInEth: amountEth,
              fee1: CONFIG.FEE_TIERS[i],
              fee2: CONFIG.FEE_TIERS[j],
              usdcIntermediate: usdcOut.toString(),
              wethOut: wethOut.toString(),
              spreadBps,
              netProfitUsd,
              gasCostUsd,
              ethPrice,
              profitable: netProfitUsd >= CONFIG.MIN_PROFIT_USD,
              timestamp: Date.now(),
              // Guardar BigInt originales para ejecución
              _amountInWei: amountWei,
              _usdcOut: usdcOut,
              _wethOut: wethOut
            });
            
          } catch (e) {
            // Pool no existe
          }
        }
      }
    }
    
  } catch (e) {
    console.error(`[SCAN] Error ${chain.name}: ${e.message.slice(0, 50)}`);
  }
  
  return opportunities;
}

// ═══════════════════════════════════════════════════════════════════════════════
// EJECUCIÓN DE TRADE
// ═══════════════════════════════════════════════════════════════════════════════

async function executeTrade(opp) {
  if (isExecuting) return null;
  isExecuting = true;
  
  const chain = CHAINS[opp.chain];
  const signer = signers[opp.chain];
  const provider = providers[opp.chain];
  const { router, weth } = contracts[opp.chain];
  
  // Usar BigInt originales o convertir de string
  const amountIn = opp._amountInWei || BigInt(opp.amountIn);
  const usdcIntermediate = opp._usdcOut || BigInt(opp.usdcIntermediate);
  const wethOut = opp._wethOut || BigInt(opp.wethOut);
  
  console.log(`\n🔥 ═══════════════════════════════════════════════════════════════`);
  console.log(`   EJECUTANDO TRADE EN ${chain.name.toUpperCase()}`);
  console.log(`   Route: ${opp.route}`);
  console.log(`   Amount: ${opp.amountInEth} ETH`);
  console.log(`   Expected: $${opp.netProfitUsd.toFixed(4)}`);
  
  const startTime = Date.now();
  
  try {
    // Verificar balance
    const balance = await provider.getBalance(WALLET_ADDRESS);
    if (balance < amountIn + ethers.parseEther('0.002')) {
      console.log(`   ❌ Balance insuficiente en ${chain.name}`);
      isExecuting = false;
      return { success: false, error: 'Balance insuficiente' };
    }
    
    // 1. Wrap ETH
    console.log(`   📦 Wrapping ETH...`);
    const wrapTx = await weth.deposit({ value: amountIn, gasLimit: 60000 });
    await wrapTx.wait(1);
    console.log(`   ✅ Wrapped`);
    
    // 2. Approve WETH
    const allowance = await weth.allowance(WALLET_ADDRESS, chain.router);
    if (allowance < amountIn) {
      console.log(`   🔓 Approving WETH...`);
      const approveTx = await weth.approve(chain.router, ethers.MaxUint256, { gasLimit: 60000 });
      await approveTx.wait(1);
    }
    
    // 3. SWAP 1: WETH → USDC
    console.log(`   🔄 SWAP 1: WETH → USDC (${opp.fee1/100}%)...`);
    const minUsdc = (usdcIntermediate * BigInt(10000 - CONFIG.MAX_SLIPPAGE_BPS)) / 10000n;
    
    const swap1Tx = await router.exactInputSingle({
      tokenIn: chain.tokens.WETH,
      tokenOut: chain.tokens.USDC,
      fee: opp.fee1,
      recipient: WALLET_ADDRESS,
      amountIn: amountIn,
      amountOutMinimum: minUsdc,
      sqrtPriceLimitX96: 0n
    }, { gasLimit: 350000 });
    
    const receipt1 = await swap1Tx.wait(1);
    console.log(`   ✅ SWAP 1 completado: ${receipt1.hash.slice(0, 16)}...`);
    
    // 4. Obtener balance USDC
    const usdc = new ethers.Contract(chain.tokens.USDC, ERC20_ABI, signer);
    const usdcBalance = await usdc.balanceOf(WALLET_ADDRESS);
    console.log(`   💵 USDC recibido: ${ethers.formatUnits(usdcBalance, 6)}`);
    
    // 5. Approve USDC
    const usdcAllowance = await usdc.allowance(WALLET_ADDRESS, chain.router);
    if (usdcAllowance < usdcBalance) {
      console.log(`   🔓 Approving USDC...`);
      const approveUsdcTx = await usdc.approve(chain.router, ethers.MaxUint256, { gasLimit: 60000 });
      await approveUsdcTx.wait(1);
    }
    
    // 6. SWAP 2: USDC → WETH
    console.log(`   🔄 SWAP 2: USDC → WETH (${opp.fee2/100}%)...`);
    const minWeth = (wethOut * BigInt(10000 - CONFIG.MAX_SLIPPAGE_BPS)) / 10000n;
    
    const swap2Tx = await router.exactInputSingle({
      tokenIn: chain.tokens.USDC,
      tokenOut: chain.tokens.WETH,
      fee: opp.fee2,
      recipient: WALLET_ADDRESS,
      amountIn: usdcBalance,
      amountOutMinimum: minWeth,
      sqrtPriceLimitX96: 0n
    }, { gasLimit: 350000 });
    
    const receipt2 = await swap2Tx.wait(1);
    console.log(`   ✅ SWAP 2 completado: ${receipt2.hash.slice(0, 16)}...`);
    
    // 7. Calcular profit
    const finalWeth = await weth.balanceOf(WALLET_ADDRESS);
    const actualProfit = finalWeth - amountIn;
    const actualProfitUsd = parseFloat(ethers.formatEther(actualProfit)) * opp.ethPrice;
    
    const gas1 = receipt1.gasUsed * receipt1.gasPrice;
    const gas2 = receipt2.gasUsed * receipt2.gasPrice;
    const totalGasUsd = parseFloat(ethers.formatEther(gas1 + gas2)) * opp.ethPrice;
    
    const netProfitUsd = actualProfitUsd - totalGasUsd;
    const executionTime = Date.now() - startTime;
    
    console.log(`   ═══════════════════════════════════════════════════════════════`);
    console.log(`   💰 PROFIT BRUTO: $${actualProfitUsd.toFixed(4)}`);
    console.log(`   ⛽ GAS TOTAL: $${totalGasUsd.toFixed(4)}`);
    console.log(`   💵 PROFIT NETO: $${netProfitUsd.toFixed(4)}`);
    console.log(`   ⏱️  Tiempo: ${executionTime}ms`);
    console.log(`   🔗 ${chain.explorer}/tx/${receipt2.hash}`);
    console.log(`   ═══════════════════════════════════════════════════════════════\n`);
    
    isExecuting = false;
    return {
      success: true,
      profitUsd: actualProfitUsd,
      gasUsd: totalGasUsd,
      netProfitUsd,
      txHash: receipt2.hash,
      executionTimeMs: executionTime
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
  
  // Rotar entre chains activas
  const activeChains = state.chains.filter(c => c.connected && c.isActive);
  if (activeChains.length === 0) {
    console.log('[TICK] No hay chains activas');
    return;
  }
  
  const selectedChain = activeChains[currentChainIndex % activeChains.length].chain;
  currentChainIndex++;
  
  state.stats.currentChain = selectedChain;
  state.banditStates.forEach(b => b.selected = b.chain === selectedChain);
  
  try {
    const opportunities = await scanChain(selectedChain);
    const scanTime = Date.now() - tickStart;
    
    scanTimes.push(scanTime);
    if (scanTimes.length > 20) scanTimes.shift();
    state.stats.avgScanTimeMs = Math.round(scanTimes.reduce((a, b) => a + b, 0) / scanTimes.length);
    state.stats.scansPerSecond = state.stats.avgScanTimeMs > 0 ? Math.round(1000 / state.stats.avgScanTimeMs * 10) / 10 : 0;
    
    // Guardar TODAS las oportunidades para mostrar en UI
    state.opportunities = [...opportunities.slice(0, 10), ...state.opportunities].slice(0, 30);
    
    // Filtrar solo las rentables
    const profitableOpps = opportunities.filter(o => o.profitable);
    
    if (profitableOpps.length > 0) {
      state.stats.opportunitiesFound += profitableOpps.length;
      profitableOpps.sort((a, b) => b.netProfitUsd - a.netProfitUsd);
      
      const best = profitableOpps[0];
      state.stats.lastOpportunity = best;
      
      console.log(`\n[SCAN #${state.stats.totalScans}] ${CHAINS[selectedChain].name} | ${scanTime}ms`);
      console.log(`   🎯 ${profitableOpps.length} OPORTUNIDADES RENTABLES!`);
      console.log(`   💰 MEJOR: ${best.route} | $${best.netProfitUsd.toFixed(4)}`);
      
      // EJECUTAR si no es dry run
      if (!state.isDryRun && CONFIG.AUTO_EXECUTE) {
        state.stats.tradesAttempted++;
        
        const result = await executeTrade(best);
        
        if (result) {
          state.stats.tradesExecuted++;
          
          const tradeLog = {
            id: `tx-${Date.now()}`,
            timestamp: Date.now(),
            chain: best.chain,
            chainName: best.chainName,
            strategy: best.strategy,
            route: best.route,
            amountIn: best.amountInEth,
            spreadBps: best.spreadBps,
            expectedProfit: best.netProfitUsd.toFixed(4),
            actualProfit: result.success ? result.profitUsd.toFixed(4) : '0',
            gasCost: result.success ? result.gasUsd.toFixed(4) : '0',
            netProfit: result.success ? result.netProfitUsd.toFixed(4) : '0',
            txHash: result.txHash || '',
            status: result.success ? 'success' : 'failed',
            error: result.error || '',
            executionTimeMs: result.executionTimeMs || 0
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
            }
          }
          
          state.stats.winRate = state.stats.tradesExecuted > 0
            ? (state.stats.tradesSuccessful / state.stats.tradesExecuted) * 100
            : 0;
        }
      }
    } else {
      // Log cada 10 scans
      if (state.stats.totalScans % 10 === 0) {
        const bestOpp = opportunities.length > 0 ? opportunities.sort((a, b) => b.netProfitUsd - a.netProfitUsd)[0] : null;
        console.log(`[SCAN #${state.stats.totalScans}] ${CHAINS[selectedChain].name} | ${scanTime}ms | Best spread: ${bestOpp ? bestOpp.spreadBps + ' bps ($' + bestOpp.netProfitUsd.toFixed(4) + ')' : 'N/A'}`);
      }
    }
    
    // Actualizar balances cada 30 scans
    if (state.stats.totalScans % 30 === 0) {
      for (const chainState of state.chains) {
        if (!chainState.connected) continue;
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
    console.error(`[TICK] Error: ${e.message}`);
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// API
// ═══════════════════════════════════════════════════════════════════════════════

app.get('/api/defi/multichain-arb/status', (req, res) => {
  // Convertir BigInt a string para JSON
  const safeState = JSON.parse(JSON.stringify(state, (key, value) =>
    typeof value === 'bigint' ? value.toString() : value
  ));
  res.json(safeState);
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
  
  console.log(`\n[START] 🔥 SCALPER 3 CHAINS - ${state.isDryRun ? 'DRY RUN' : '⚠️ MODO REAL - EJECUTANDO TRADES'}`);
  console.log(`[CONFIG] Min Profit: $${CONFIG.MIN_PROFIT_USD} | Auto Execute: ${CONFIG.AUTO_EXECUTE}`);
  console.log(`[CHAINS] ${state.chains.filter(c => c.connected).map(c => c.name).join(', ')}\n`);
  
  res.json({
    success: true,
    isRunning: true,
    isDryRun: state.isDryRun,
    mode: 'SCALPER_3CHAINS',
    config: CONFIG,
    connectedChains: state.chains.filter(c => c.connected).map(c => c.name)
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
    mode: 'SCALPER_3CHAINS',
    port: PORT,
    running: state.isRunning,
    dryRun: state.isDryRun,
    wallet: WALLET_ADDRESS,
    chains: state.chains.map(c => ({ name: c.name, connected: c.connected, balance: c.balance })),
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
║   🔥 SCALPER 3 CHAINS - BASE + ARBITRUM + OPTIMISM                            ║
║                                                                               ║
║   ✅ Puerto: ${PORT}                                                           ║
║   ✅ Wallet: ${WALLET_ADDRESS.slice(0, 10)}...${WALLET_ADDRESS.slice(-5)}                                  ║
║                                                                               ║
║   ⚡ Intervalo: ${CONFIG.SCAN_INTERVAL_MS}ms | Min Profit: $${CONFIG.MIN_PROFIT_USD}                           ║
║   ⚡ Auto Execute: ${CONFIG.AUTO_EXECUTE}                                                   ║
║                                                                               ║
║   ⚠️  MODO REAL - Ejecutará trades automáticamente                            ║
║                                                                               ║
╚═══════════════════════════════════════════════════════════════════════════════╝
  `);
  
  await init();
  console.log('[READY] 🔥 POST /api/defi/multichain-arb/start para iniciar.\n');
});

process.on('SIGINT', () => {
  if (timer) clearInterval(timer);
  process.exit(0);
});




 * 🔥 SCALPER 3 CHAINS - BASE + ARBITRUM + OPTIMISM
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * Bot optimizado para 3 chains con:
 * - RPCs alternativos para Optimism
 * - Ejecución automática agresiva
 * - Umbral de profit muy bajo
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
  SCAN_INTERVAL_MS: 500,
  MIN_PROFIT_USD: 0.001,          // Muy bajo para capturar más
  MAX_SLIPPAGE_BPS: 100,          // 1%
  AUTO_EXECUTE: true,
  ETH_PRICE_USD: 3500,
  TRADE_AMOUNTS: [0.005, 0.01, 0.02],
  FEE_TIERS: [500, 3000]          // 0.05% y 0.3%
};

const PRIVATE_KEY = process.env.VITE_ETH_PRIVATE_KEY;
const WALLET_ADDRESS = process.env.VITE_ETH_WALLET_ADDRESS;

if (!PRIVATE_KEY || !WALLET_ADDRESS) {
  console.error('❌ ERROR: Credenciales no configuradas');
  process.exit(1);
}

// ═══════════════════════════════════════════════════════════════════════════════
// 3 CHAINS CON RPCs MÚLTIPLES
// ═══════════════════════════════════════════════════════════════════════════════

const CHAINS = {
  base: {
    name: 'Base',
    chainId: 8453,
    rpcs: [
      'https://base-mainnet.g.alchemy.com/v2/mm-9UjI5oG51l94mRH3fh',
      'https://mainnet.base.org',
      'https://base.llamarpc.com'
    ],
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
    rpcs: [
      'https://arb1.arbitrum.io/rpc',
      'https://arbitrum.llamarpc.com',
      'https://rpc.ankr.com/arbitrum'
    ],
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
    rpcs: [
      'https://optimism.llamarpc.com',
      'https://rpc.ankr.com/optimism',
      'https://optimism-mainnet.public.blastapi.io',
      'https://1rpc.io/op'
    ],
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
  mode: 'SCALPER_3CHAINS',
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
// CONECTAR CON FALLBACK DE RPCs
// ═══════════════════════════════════════════════════════════════════════════════

async function connectWithFallback(chainKey) {
  const chain = CHAINS[chainKey];
  
  for (const rpc of chain.rpcs) {
    try {
      const provider = new ethers.JsonRpcProvider(rpc);
      // Test connection
      await provider.getBlockNumber();
      console.log(`   ✅ ${chain.name}: Conectado a ${rpc.split('/')[2]}`);
      return provider;
    } catch (e) {
      console.log(`   ⚠️ ${chain.name}: RPC ${rpc.split('/')[2]} falló, probando siguiente...`);
    }
  }
  
  throw new Error(`No se pudo conectar a ${chain.name}`);
}

async function init() {
  console.log('[INIT] 🔌 Conectando a 3 chains...\n');
  
  for (const [chainKey, chain] of Object.entries(CHAINS)) {
    try {
      const provider = await connectWithFallback(chainKey);
      providers[chainKey] = provider;
      signers[chainKey] = new ethers.Wallet(PRIVATE_KEY, provider);
      
      contracts[chainKey] = {
        quoter: new ethers.Contract(chain.quoter, QUOTER_ABI, provider),
        router: new ethers.Contract(chain.router, ROUTER_ABI, signers[chainKey]),
        weth: new ethers.Contract(chain.tokens.WETH, WETH_ABI, signers[chainKey])
      };
      
      const balance = await provider.getBalance(WALLET_ADDRESS);
      const balanceEth = parseFloat(ethers.formatEther(balance));
      
      state.chains.push({
        chain: chainKey,
        name: chain.name,
        chainId: chain.chainId,
        balance: balanceEth.toFixed(6),
        balanceUsd: balanceEth * CONFIG.ETH_PRICE_USD,
        routes: CONFIG.FEE_TIERS.length * CONFIG.TRADE_AMOUNTS.length,
        isActive: balanceEth > 0.001,
        lastScan: Date.now(),
        explorer: chain.explorer,
        ethPrice: 0,
        connected: true
      });
      
      state.banditStates.push({
        chain: chainKey,
        alpha: 2,
        beta: 2,
        winRate: 50,
        selected: chainKey === 'base',
        attempts: 0,
        wins: 0
      });
      
      console.log(`   💰 ${chain.name}: ${balanceEth.toFixed(6)} ETH ($${(balanceEth * CONFIG.ETH_PRICE_USD).toFixed(2)})`);
    } catch (e) {
      console.error(`   ❌ ${chain.name}: ${e.message}`);
      state.chains.push({
        chain: chainKey,
        name: chain.name,
        chainId: chain.chainId,
        balance: '0',
        balanceUsd: 0,
        routes: 0,
        isActive: false,
        lastScan: Date.now(),
        explorer: chain.explorer,
        ethPrice: 0,
        connected: false,
        error: e.message
      });
    }
  }
  console.log('');
}

// ═══════════════════════════════════════════════════════════════════════════════
// ESCANEO SIMPLE Y RÁPIDO
// ═══════════════════════════════════════════════════════════════════════════════

async function scanChain(chainKey) {
  const chain = CHAINS[chainKey];
  const provider = providers[chainKey];
  const quoter = contracts[chainKey]?.quoter;
  
  if (!quoter) return [];
  
  const opportunities = [];
  
  try {
    // Gas price
    const feeData = await provider.getFeeData();
    const gasPrice = feeData.gasPrice || ethers.parseUnits('0.01', 'gwei');
    const gasCostWei = gasPrice * 300000n;
    const gasCostUsd = parseFloat(ethers.formatEther(gasCostWei)) * CONFIG.ETH_PRICE_USD;
    
    // Precio ETH
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
    
    // Escanear rutas
    for (const amountEth of CONFIG.TRADE_AMOUNTS) {
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
            const spreadBps = Number((grossProfit * 10000n) / amountWei);
            
            // Registrar TODAS las oportunidades (incluso negativas) para mostrar en UI
            const netProfitUsd = parseFloat(ethers.formatEther(netProfit)) * ethPrice;
            
            opportunities.push({
              chain: chainKey,
              chainName: chain.name,
              strategy: 'FEE_TIER_ARB',
              route: `${CONFIG.FEE_TIERS[i]/100}%→${CONFIG.FEE_TIERS[j]/100}%`,
              amountIn: amountWei.toString(),
              amountInEth: amountEth,
              fee1: CONFIG.FEE_TIERS[i],
              fee2: CONFIG.FEE_TIERS[j],
              usdcIntermediate: usdcOut.toString(),
              wethOut: wethOut.toString(),
              spreadBps,
              netProfitUsd,
              gasCostUsd,
              ethPrice,
              profitable: netProfitUsd >= CONFIG.MIN_PROFIT_USD,
              timestamp: Date.now(),
              // Guardar BigInt originales para ejecución
              _amountInWei: amountWei,
              _usdcOut: usdcOut,
              _wethOut: wethOut
            });
            
          } catch (e) {
            // Pool no existe
          }
        }
      }
    }
    
  } catch (e) {
    console.error(`[SCAN] Error ${chain.name}: ${e.message.slice(0, 50)}`);
  }
  
  return opportunities;
}

// ═══════════════════════════════════════════════════════════════════════════════
// EJECUCIÓN DE TRADE
// ═══════════════════════════════════════════════════════════════════════════════

async function executeTrade(opp) {
  if (isExecuting) return null;
  isExecuting = true;
  
  const chain = CHAINS[opp.chain];
  const signer = signers[opp.chain];
  const provider = providers[opp.chain];
  const { router, weth } = contracts[opp.chain];
  
  // Usar BigInt originales o convertir de string
  const amountIn = opp._amountInWei || BigInt(opp.amountIn);
  const usdcIntermediate = opp._usdcOut || BigInt(opp.usdcIntermediate);
  const wethOut = opp._wethOut || BigInt(opp.wethOut);
  
  console.log(`\n🔥 ═══════════════════════════════════════════════════════════════`);
  console.log(`   EJECUTANDO TRADE EN ${chain.name.toUpperCase()}`);
  console.log(`   Route: ${opp.route}`);
  console.log(`   Amount: ${opp.amountInEth} ETH`);
  console.log(`   Expected: $${opp.netProfitUsd.toFixed(4)}`);
  
  const startTime = Date.now();
  
  try {
    // Verificar balance
    const balance = await provider.getBalance(WALLET_ADDRESS);
    if (balance < amountIn + ethers.parseEther('0.002')) {
      console.log(`   ❌ Balance insuficiente en ${chain.name}`);
      isExecuting = false;
      return { success: false, error: 'Balance insuficiente' };
    }
    
    // 1. Wrap ETH
    console.log(`   📦 Wrapping ETH...`);
    const wrapTx = await weth.deposit({ value: amountIn, gasLimit: 60000 });
    await wrapTx.wait(1);
    console.log(`   ✅ Wrapped`);
    
    // 2. Approve WETH
    const allowance = await weth.allowance(WALLET_ADDRESS, chain.router);
    if (allowance < amountIn) {
      console.log(`   🔓 Approving WETH...`);
      const approveTx = await weth.approve(chain.router, ethers.MaxUint256, { gasLimit: 60000 });
      await approveTx.wait(1);
    }
    
    // 3. SWAP 1: WETH → USDC
    console.log(`   🔄 SWAP 1: WETH → USDC (${opp.fee1/100}%)...`);
    const minUsdc = (usdcIntermediate * BigInt(10000 - CONFIG.MAX_SLIPPAGE_BPS)) / 10000n;
    
    const swap1Tx = await router.exactInputSingle({
      tokenIn: chain.tokens.WETH,
      tokenOut: chain.tokens.USDC,
      fee: opp.fee1,
      recipient: WALLET_ADDRESS,
      amountIn: amountIn,
      amountOutMinimum: minUsdc,
      sqrtPriceLimitX96: 0n
    }, { gasLimit: 350000 });
    
    const receipt1 = await swap1Tx.wait(1);
    console.log(`   ✅ SWAP 1 completado: ${receipt1.hash.slice(0, 16)}...`);
    
    // 4. Obtener balance USDC
    const usdc = new ethers.Contract(chain.tokens.USDC, ERC20_ABI, signer);
    const usdcBalance = await usdc.balanceOf(WALLET_ADDRESS);
    console.log(`   💵 USDC recibido: ${ethers.formatUnits(usdcBalance, 6)}`);
    
    // 5. Approve USDC
    const usdcAllowance = await usdc.allowance(WALLET_ADDRESS, chain.router);
    if (usdcAllowance < usdcBalance) {
      console.log(`   🔓 Approving USDC...`);
      const approveUsdcTx = await usdc.approve(chain.router, ethers.MaxUint256, { gasLimit: 60000 });
      await approveUsdcTx.wait(1);
    }
    
    // 6. SWAP 2: USDC → WETH
    console.log(`   🔄 SWAP 2: USDC → WETH (${opp.fee2/100}%)...`);
    const minWeth = (wethOut * BigInt(10000 - CONFIG.MAX_SLIPPAGE_BPS)) / 10000n;
    
    const swap2Tx = await router.exactInputSingle({
      tokenIn: chain.tokens.USDC,
      tokenOut: chain.tokens.WETH,
      fee: opp.fee2,
      recipient: WALLET_ADDRESS,
      amountIn: usdcBalance,
      amountOutMinimum: minWeth,
      sqrtPriceLimitX96: 0n
    }, { gasLimit: 350000 });
    
    const receipt2 = await swap2Tx.wait(1);
    console.log(`   ✅ SWAP 2 completado: ${receipt2.hash.slice(0, 16)}...`);
    
    // 7. Calcular profit
    const finalWeth = await weth.balanceOf(WALLET_ADDRESS);
    const actualProfit = finalWeth - amountIn;
    const actualProfitUsd = parseFloat(ethers.formatEther(actualProfit)) * opp.ethPrice;
    
    const gas1 = receipt1.gasUsed * receipt1.gasPrice;
    const gas2 = receipt2.gasUsed * receipt2.gasPrice;
    const totalGasUsd = parseFloat(ethers.formatEther(gas1 + gas2)) * opp.ethPrice;
    
    const netProfitUsd = actualProfitUsd - totalGasUsd;
    const executionTime = Date.now() - startTime;
    
    console.log(`   ═══════════════════════════════════════════════════════════════`);
    console.log(`   💰 PROFIT BRUTO: $${actualProfitUsd.toFixed(4)}`);
    console.log(`   ⛽ GAS TOTAL: $${totalGasUsd.toFixed(4)}`);
    console.log(`   💵 PROFIT NETO: $${netProfitUsd.toFixed(4)}`);
    console.log(`   ⏱️  Tiempo: ${executionTime}ms`);
    console.log(`   🔗 ${chain.explorer}/tx/${receipt2.hash}`);
    console.log(`   ═══════════════════════════════════════════════════════════════\n`);
    
    isExecuting = false;
    return {
      success: true,
      profitUsd: actualProfitUsd,
      gasUsd: totalGasUsd,
      netProfitUsd,
      txHash: receipt2.hash,
      executionTimeMs: executionTime
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
  
  // Rotar entre chains activas
  const activeChains = state.chains.filter(c => c.connected && c.isActive);
  if (activeChains.length === 0) {
    console.log('[TICK] No hay chains activas');
    return;
  }
  
  const selectedChain = activeChains[currentChainIndex % activeChains.length].chain;
  currentChainIndex++;
  
  state.stats.currentChain = selectedChain;
  state.banditStates.forEach(b => b.selected = b.chain === selectedChain);
  
  try {
    const opportunities = await scanChain(selectedChain);
    const scanTime = Date.now() - tickStart;
    
    scanTimes.push(scanTime);
    if (scanTimes.length > 20) scanTimes.shift();
    state.stats.avgScanTimeMs = Math.round(scanTimes.reduce((a, b) => a + b, 0) / scanTimes.length);
    state.stats.scansPerSecond = state.stats.avgScanTimeMs > 0 ? Math.round(1000 / state.stats.avgScanTimeMs * 10) / 10 : 0;
    
    // Guardar TODAS las oportunidades para mostrar en UI
    state.opportunities = [...opportunities.slice(0, 10), ...state.opportunities].slice(0, 30);
    
    // Filtrar solo las rentables
    const profitableOpps = opportunities.filter(o => o.profitable);
    
    if (profitableOpps.length > 0) {
      state.stats.opportunitiesFound += profitableOpps.length;
      profitableOpps.sort((a, b) => b.netProfitUsd - a.netProfitUsd);
      
      const best = profitableOpps[0];
      state.stats.lastOpportunity = best;
      
      console.log(`\n[SCAN #${state.stats.totalScans}] ${CHAINS[selectedChain].name} | ${scanTime}ms`);
      console.log(`   🎯 ${profitableOpps.length} OPORTUNIDADES RENTABLES!`);
      console.log(`   💰 MEJOR: ${best.route} | $${best.netProfitUsd.toFixed(4)}`);
      
      // EJECUTAR si no es dry run
      if (!state.isDryRun && CONFIG.AUTO_EXECUTE) {
        state.stats.tradesAttempted++;
        
        const result = await executeTrade(best);
        
        if (result) {
          state.stats.tradesExecuted++;
          
          const tradeLog = {
            id: `tx-${Date.now()}`,
            timestamp: Date.now(),
            chain: best.chain,
            chainName: best.chainName,
            strategy: best.strategy,
            route: best.route,
            amountIn: best.amountInEth,
            spreadBps: best.spreadBps,
            expectedProfit: best.netProfitUsd.toFixed(4),
            actualProfit: result.success ? result.profitUsd.toFixed(4) : '0',
            gasCost: result.success ? result.gasUsd.toFixed(4) : '0',
            netProfit: result.success ? result.netProfitUsd.toFixed(4) : '0',
            txHash: result.txHash || '',
            status: result.success ? 'success' : 'failed',
            error: result.error || '',
            executionTimeMs: result.executionTimeMs || 0
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
            }
          }
          
          state.stats.winRate = state.stats.tradesExecuted > 0
            ? (state.stats.tradesSuccessful / state.stats.tradesExecuted) * 100
            : 0;
        }
      }
    } else {
      // Log cada 10 scans
      if (state.stats.totalScans % 10 === 0) {
        const bestOpp = opportunities.length > 0 ? opportunities.sort((a, b) => b.netProfitUsd - a.netProfitUsd)[0] : null;
        console.log(`[SCAN #${state.stats.totalScans}] ${CHAINS[selectedChain].name} | ${scanTime}ms | Best spread: ${bestOpp ? bestOpp.spreadBps + ' bps ($' + bestOpp.netProfitUsd.toFixed(4) + ')' : 'N/A'}`);
      }
    }
    
    // Actualizar balances cada 30 scans
    if (state.stats.totalScans % 30 === 0) {
      for (const chainState of state.chains) {
        if (!chainState.connected) continue;
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
    console.error(`[TICK] Error: ${e.message}`);
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// API
// ═══════════════════════════════════════════════════════════════════════════════

app.get('/api/defi/multichain-arb/status', (req, res) => {
  // Convertir BigInt a string para JSON
  const safeState = JSON.parse(JSON.stringify(state, (key, value) =>
    typeof value === 'bigint' ? value.toString() : value
  ));
  res.json(safeState);
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
  
  console.log(`\n[START] 🔥 SCALPER 3 CHAINS - ${state.isDryRun ? 'DRY RUN' : '⚠️ MODO REAL - EJECUTANDO TRADES'}`);
  console.log(`[CONFIG] Min Profit: $${CONFIG.MIN_PROFIT_USD} | Auto Execute: ${CONFIG.AUTO_EXECUTE}`);
  console.log(`[CHAINS] ${state.chains.filter(c => c.connected).map(c => c.name).join(', ')}\n`);
  
  res.json({
    success: true,
    isRunning: true,
    isDryRun: state.isDryRun,
    mode: 'SCALPER_3CHAINS',
    config: CONFIG,
    connectedChains: state.chains.filter(c => c.connected).map(c => c.name)
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
    mode: 'SCALPER_3CHAINS',
    port: PORT,
    running: state.isRunning,
    dryRun: state.isDryRun,
    wallet: WALLET_ADDRESS,
    chains: state.chains.map(c => ({ name: c.name, connected: c.connected, balance: c.balance })),
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
║   🔥 SCALPER 3 CHAINS - BASE + ARBITRUM + OPTIMISM                            ║
║                                                                               ║
║   ✅ Puerto: ${PORT}                                                           ║
║   ✅ Wallet: ${WALLET_ADDRESS.slice(0, 10)}...${WALLET_ADDRESS.slice(-5)}                                  ║
║                                                                               ║
║   ⚡ Intervalo: ${CONFIG.SCAN_INTERVAL_MS}ms | Min Profit: $${CONFIG.MIN_PROFIT_USD}                           ║
║   ⚡ Auto Execute: ${CONFIG.AUTO_EXECUTE}                                                   ║
║                                                                               ║
║   ⚠️  MODO REAL - Ejecutará trades automáticamente                            ║
║                                                                               ║
╚═══════════════════════════════════════════════════════════════════════════════╝
  `);
  
  await init();
  console.log('[READY] 🔥 POST /api/defi/multichain-arb/start para iniciar.\n');
});

process.on('SIGINT', () => {
  if (timer) clearInterval(timer);
  process.exit(0);
});


 * 🔥 SCALPER 3 CHAINS - BASE + ARBITRUM + OPTIMISM
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * Bot optimizado para 3 chains con:
 * - RPCs alternativos para Optimism
 * - Ejecución automática agresiva
 * - Umbral de profit muy bajo
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
  SCAN_INTERVAL_MS: 500,
  MIN_PROFIT_USD: 0.001,          // Muy bajo para capturar más
  MAX_SLIPPAGE_BPS: 100,          // 1%
  AUTO_EXECUTE: true,
  ETH_PRICE_USD: 3500,
  TRADE_AMOUNTS: [0.005, 0.01, 0.02],
  FEE_TIERS: [500, 3000]          // 0.05% y 0.3%
};

const PRIVATE_KEY = process.env.VITE_ETH_PRIVATE_KEY;
const WALLET_ADDRESS = process.env.VITE_ETH_WALLET_ADDRESS;

if (!PRIVATE_KEY || !WALLET_ADDRESS) {
  console.error('❌ ERROR: Credenciales no configuradas');
  process.exit(1);
}

// ═══════════════════════════════════════════════════════════════════════════════
// 3 CHAINS CON RPCs MÚLTIPLES
// ═══════════════════════════════════════════════════════════════════════════════

const CHAINS = {
  base: {
    name: 'Base',
    chainId: 8453,
    rpcs: [
      'https://base-mainnet.g.alchemy.com/v2/mm-9UjI5oG51l94mRH3fh',
      'https://mainnet.base.org',
      'https://base.llamarpc.com'
    ],
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
    rpcs: [
      'https://arb1.arbitrum.io/rpc',
      'https://arbitrum.llamarpc.com',
      'https://rpc.ankr.com/arbitrum'
    ],
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
    rpcs: [
      'https://optimism.llamarpc.com',
      'https://rpc.ankr.com/optimism',
      'https://optimism-mainnet.public.blastapi.io',
      'https://1rpc.io/op'
    ],
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
  mode: 'SCALPER_3CHAINS',
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
// CONECTAR CON FALLBACK DE RPCs
// ═══════════════════════════════════════════════════════════════════════════════

async function connectWithFallback(chainKey) {
  const chain = CHAINS[chainKey];
  
  for (const rpc of chain.rpcs) {
    try {
      const provider = new ethers.JsonRpcProvider(rpc);
      // Test connection
      await provider.getBlockNumber();
      console.log(`   ✅ ${chain.name}: Conectado a ${rpc.split('/')[2]}`);
      return provider;
    } catch (e) {
      console.log(`   ⚠️ ${chain.name}: RPC ${rpc.split('/')[2]} falló, probando siguiente...`);
    }
  }
  
  throw new Error(`No se pudo conectar a ${chain.name}`);
}

async function init() {
  console.log('[INIT] 🔌 Conectando a 3 chains...\n');
  
  for (const [chainKey, chain] of Object.entries(CHAINS)) {
    try {
      const provider = await connectWithFallback(chainKey);
      providers[chainKey] = provider;
      signers[chainKey] = new ethers.Wallet(PRIVATE_KEY, provider);
      
      contracts[chainKey] = {
        quoter: new ethers.Contract(chain.quoter, QUOTER_ABI, provider),
        router: new ethers.Contract(chain.router, ROUTER_ABI, signers[chainKey]),
        weth: new ethers.Contract(chain.tokens.WETH, WETH_ABI, signers[chainKey])
      };
      
      const balance = await provider.getBalance(WALLET_ADDRESS);
      const balanceEth = parseFloat(ethers.formatEther(balance));
      
      state.chains.push({
        chain: chainKey,
        name: chain.name,
        chainId: chain.chainId,
        balance: balanceEth.toFixed(6),
        balanceUsd: balanceEth * CONFIG.ETH_PRICE_USD,
        routes: CONFIG.FEE_TIERS.length * CONFIG.TRADE_AMOUNTS.length,
        isActive: balanceEth > 0.001,
        lastScan: Date.now(),
        explorer: chain.explorer,
        ethPrice: 0,
        connected: true
      });
      
      state.banditStates.push({
        chain: chainKey,
        alpha: 2,
        beta: 2,
        winRate: 50,
        selected: chainKey === 'base',
        attempts: 0,
        wins: 0
      });
      
      console.log(`   💰 ${chain.name}: ${balanceEth.toFixed(6)} ETH ($${(balanceEth * CONFIG.ETH_PRICE_USD).toFixed(2)})`);
    } catch (e) {
      console.error(`   ❌ ${chain.name}: ${e.message}`);
      state.chains.push({
        chain: chainKey,
        name: chain.name,
        chainId: chain.chainId,
        balance: '0',
        balanceUsd: 0,
        routes: 0,
        isActive: false,
        lastScan: Date.now(),
        explorer: chain.explorer,
        ethPrice: 0,
        connected: false,
        error: e.message
      });
    }
  }
  console.log('');
}

// ═══════════════════════════════════════════════════════════════════════════════
// ESCANEO SIMPLE Y RÁPIDO
// ═══════════════════════════════════════════════════════════════════════════════

async function scanChain(chainKey) {
  const chain = CHAINS[chainKey];
  const provider = providers[chainKey];
  const quoter = contracts[chainKey]?.quoter;
  
  if (!quoter) return [];
  
  const opportunities = [];
  
  try {
    // Gas price
    const feeData = await provider.getFeeData();
    const gasPrice = feeData.gasPrice || ethers.parseUnits('0.01', 'gwei');
    const gasCostWei = gasPrice * 300000n;
    const gasCostUsd = parseFloat(ethers.formatEther(gasCostWei)) * CONFIG.ETH_PRICE_USD;
    
    // Precio ETH
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
    
    // Escanear rutas
    for (const amountEth of CONFIG.TRADE_AMOUNTS) {
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
            const spreadBps = Number((grossProfit * 10000n) / amountWei);
            
            // Registrar TODAS las oportunidades (incluso negativas) para mostrar en UI
            const netProfitUsd = parseFloat(ethers.formatEther(netProfit)) * ethPrice;
            
            opportunities.push({
              chain: chainKey,
              chainName: chain.name,
              strategy: 'FEE_TIER_ARB',
              route: `${CONFIG.FEE_TIERS[i]/100}%→${CONFIG.FEE_TIERS[j]/100}%`,
              amountIn: amountWei.toString(),
              amountInEth: amountEth,
              fee1: CONFIG.FEE_TIERS[i],
              fee2: CONFIG.FEE_TIERS[j],
              usdcIntermediate: usdcOut.toString(),
              wethOut: wethOut.toString(),
              spreadBps,
              netProfitUsd,
              gasCostUsd,
              ethPrice,
              profitable: netProfitUsd >= CONFIG.MIN_PROFIT_USD,
              timestamp: Date.now(),
              // Guardar BigInt originales para ejecución
              _amountInWei: amountWei,
              _usdcOut: usdcOut,
              _wethOut: wethOut
            });
            
          } catch (e) {
            // Pool no existe
          }
        }
      }
    }
    
  } catch (e) {
    console.error(`[SCAN] Error ${chain.name}: ${e.message.slice(0, 50)}`);
  }
  
  return opportunities;
}

// ═══════════════════════════════════════════════════════════════════════════════
// EJECUCIÓN DE TRADE
// ═══════════════════════════════════════════════════════════════════════════════

async function executeTrade(opp) {
  if (isExecuting) return null;
  isExecuting = true;
  
  const chain = CHAINS[opp.chain];
  const signer = signers[opp.chain];
  const provider = providers[opp.chain];
  const { router, weth } = contracts[opp.chain];
  
  // Usar BigInt originales o convertir de string
  const amountIn = opp._amountInWei || BigInt(opp.amountIn);
  const usdcIntermediate = opp._usdcOut || BigInt(opp.usdcIntermediate);
  const wethOut = opp._wethOut || BigInt(opp.wethOut);
  
  console.log(`\n🔥 ═══════════════════════════════════════════════════════════════`);
  console.log(`   EJECUTANDO TRADE EN ${chain.name.toUpperCase()}`);
  console.log(`   Route: ${opp.route}`);
  console.log(`   Amount: ${opp.amountInEth} ETH`);
  console.log(`   Expected: $${opp.netProfitUsd.toFixed(4)}`);
  
  const startTime = Date.now();
  
  try {
    // Verificar balance
    const balance = await provider.getBalance(WALLET_ADDRESS);
    if (balance < amountIn + ethers.parseEther('0.002')) {
      console.log(`   ❌ Balance insuficiente en ${chain.name}`);
      isExecuting = false;
      return { success: false, error: 'Balance insuficiente' };
    }
    
    // 1. Wrap ETH
    console.log(`   📦 Wrapping ETH...`);
    const wrapTx = await weth.deposit({ value: amountIn, gasLimit: 60000 });
    await wrapTx.wait(1);
    console.log(`   ✅ Wrapped`);
    
    // 2. Approve WETH
    const allowance = await weth.allowance(WALLET_ADDRESS, chain.router);
    if (allowance < amountIn) {
      console.log(`   🔓 Approving WETH...`);
      const approveTx = await weth.approve(chain.router, ethers.MaxUint256, { gasLimit: 60000 });
      await approveTx.wait(1);
    }
    
    // 3. SWAP 1: WETH → USDC
    console.log(`   🔄 SWAP 1: WETH → USDC (${opp.fee1/100}%)...`);
    const minUsdc = (usdcIntermediate * BigInt(10000 - CONFIG.MAX_SLIPPAGE_BPS)) / 10000n;
    
    const swap1Tx = await router.exactInputSingle({
      tokenIn: chain.tokens.WETH,
      tokenOut: chain.tokens.USDC,
      fee: opp.fee1,
      recipient: WALLET_ADDRESS,
      amountIn: amountIn,
      amountOutMinimum: minUsdc,
      sqrtPriceLimitX96: 0n
    }, { gasLimit: 350000 });
    
    const receipt1 = await swap1Tx.wait(1);
    console.log(`   ✅ SWAP 1 completado: ${receipt1.hash.slice(0, 16)}...`);
    
    // 4. Obtener balance USDC
    const usdc = new ethers.Contract(chain.tokens.USDC, ERC20_ABI, signer);
    const usdcBalance = await usdc.balanceOf(WALLET_ADDRESS);
    console.log(`   💵 USDC recibido: ${ethers.formatUnits(usdcBalance, 6)}`);
    
    // 5. Approve USDC
    const usdcAllowance = await usdc.allowance(WALLET_ADDRESS, chain.router);
    if (usdcAllowance < usdcBalance) {
      console.log(`   🔓 Approving USDC...`);
      const approveUsdcTx = await usdc.approve(chain.router, ethers.MaxUint256, { gasLimit: 60000 });
      await approveUsdcTx.wait(1);
    }
    
    // 6. SWAP 2: USDC → WETH
    console.log(`   🔄 SWAP 2: USDC → WETH (${opp.fee2/100}%)...`);
    const minWeth = (wethOut * BigInt(10000 - CONFIG.MAX_SLIPPAGE_BPS)) / 10000n;
    
    const swap2Tx = await router.exactInputSingle({
      tokenIn: chain.tokens.USDC,
      tokenOut: chain.tokens.WETH,
      fee: opp.fee2,
      recipient: WALLET_ADDRESS,
      amountIn: usdcBalance,
      amountOutMinimum: minWeth,
      sqrtPriceLimitX96: 0n
    }, { gasLimit: 350000 });
    
    const receipt2 = await swap2Tx.wait(1);
    console.log(`   ✅ SWAP 2 completado: ${receipt2.hash.slice(0, 16)}...`);
    
    // 7. Calcular profit
    const finalWeth = await weth.balanceOf(WALLET_ADDRESS);
    const actualProfit = finalWeth - amountIn;
    const actualProfitUsd = parseFloat(ethers.formatEther(actualProfit)) * opp.ethPrice;
    
    const gas1 = receipt1.gasUsed * receipt1.gasPrice;
    const gas2 = receipt2.gasUsed * receipt2.gasPrice;
    const totalGasUsd = parseFloat(ethers.formatEther(gas1 + gas2)) * opp.ethPrice;
    
    const netProfitUsd = actualProfitUsd - totalGasUsd;
    const executionTime = Date.now() - startTime;
    
    console.log(`   ═══════════════════════════════════════════════════════════════`);
    console.log(`   💰 PROFIT BRUTO: $${actualProfitUsd.toFixed(4)}`);
    console.log(`   ⛽ GAS TOTAL: $${totalGasUsd.toFixed(4)}`);
    console.log(`   💵 PROFIT NETO: $${netProfitUsd.toFixed(4)}`);
    console.log(`   ⏱️  Tiempo: ${executionTime}ms`);
    console.log(`   🔗 ${chain.explorer}/tx/${receipt2.hash}`);
    console.log(`   ═══════════════════════════════════════════════════════════════\n`);
    
    isExecuting = false;
    return {
      success: true,
      profitUsd: actualProfitUsd,
      gasUsd: totalGasUsd,
      netProfitUsd,
      txHash: receipt2.hash,
      executionTimeMs: executionTime
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
  
  // Rotar entre chains activas
  const activeChains = state.chains.filter(c => c.connected && c.isActive);
  if (activeChains.length === 0) {
    console.log('[TICK] No hay chains activas');
    return;
  }
  
  const selectedChain = activeChains[currentChainIndex % activeChains.length].chain;
  currentChainIndex++;
  
  state.stats.currentChain = selectedChain;
  state.banditStates.forEach(b => b.selected = b.chain === selectedChain);
  
  try {
    const opportunities = await scanChain(selectedChain);
    const scanTime = Date.now() - tickStart;
    
    scanTimes.push(scanTime);
    if (scanTimes.length > 20) scanTimes.shift();
    state.stats.avgScanTimeMs = Math.round(scanTimes.reduce((a, b) => a + b, 0) / scanTimes.length);
    state.stats.scansPerSecond = state.stats.avgScanTimeMs > 0 ? Math.round(1000 / state.stats.avgScanTimeMs * 10) / 10 : 0;
    
    // Guardar TODAS las oportunidades para mostrar en UI
    state.opportunities = [...opportunities.slice(0, 10), ...state.opportunities].slice(0, 30);
    
    // Filtrar solo las rentables
    const profitableOpps = opportunities.filter(o => o.profitable);
    
    if (profitableOpps.length > 0) {
      state.stats.opportunitiesFound += profitableOpps.length;
      profitableOpps.sort((a, b) => b.netProfitUsd - a.netProfitUsd);
      
      const best = profitableOpps[0];
      state.stats.lastOpportunity = best;
      
      console.log(`\n[SCAN #${state.stats.totalScans}] ${CHAINS[selectedChain].name} | ${scanTime}ms`);
      console.log(`   🎯 ${profitableOpps.length} OPORTUNIDADES RENTABLES!`);
      console.log(`   💰 MEJOR: ${best.route} | $${best.netProfitUsd.toFixed(4)}`);
      
      // EJECUTAR si no es dry run
      if (!state.isDryRun && CONFIG.AUTO_EXECUTE) {
        state.stats.tradesAttempted++;
        
        const result = await executeTrade(best);
        
        if (result) {
          state.stats.tradesExecuted++;
          
          const tradeLog = {
            id: `tx-${Date.now()}`,
            timestamp: Date.now(),
            chain: best.chain,
            chainName: best.chainName,
            strategy: best.strategy,
            route: best.route,
            amountIn: best.amountInEth,
            spreadBps: best.spreadBps,
            expectedProfit: best.netProfitUsd.toFixed(4),
            actualProfit: result.success ? result.profitUsd.toFixed(4) : '0',
            gasCost: result.success ? result.gasUsd.toFixed(4) : '0',
            netProfit: result.success ? result.netProfitUsd.toFixed(4) : '0',
            txHash: result.txHash || '',
            status: result.success ? 'success' : 'failed',
            error: result.error || '',
            executionTimeMs: result.executionTimeMs || 0
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
            }
          }
          
          state.stats.winRate = state.stats.tradesExecuted > 0
            ? (state.stats.tradesSuccessful / state.stats.tradesExecuted) * 100
            : 0;
        }
      }
    } else {
      // Log cada 10 scans
      if (state.stats.totalScans % 10 === 0) {
        const bestOpp = opportunities.length > 0 ? opportunities.sort((a, b) => b.netProfitUsd - a.netProfitUsd)[0] : null;
        console.log(`[SCAN #${state.stats.totalScans}] ${CHAINS[selectedChain].name} | ${scanTime}ms | Best spread: ${bestOpp ? bestOpp.spreadBps + ' bps ($' + bestOpp.netProfitUsd.toFixed(4) + ')' : 'N/A'}`);
      }
    }
    
    // Actualizar balances cada 30 scans
    if (state.stats.totalScans % 30 === 0) {
      for (const chainState of state.chains) {
        if (!chainState.connected) continue;
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
    console.error(`[TICK] Error: ${e.message}`);
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// API
// ═══════════════════════════════════════════════════════════════════════════════

app.get('/api/defi/multichain-arb/status', (req, res) => {
  // Convertir BigInt a string para JSON
  const safeState = JSON.parse(JSON.stringify(state, (key, value) =>
    typeof value === 'bigint' ? value.toString() : value
  ));
  res.json(safeState);
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
  
  console.log(`\n[START] 🔥 SCALPER 3 CHAINS - ${state.isDryRun ? 'DRY RUN' : '⚠️ MODO REAL - EJECUTANDO TRADES'}`);
  console.log(`[CONFIG] Min Profit: $${CONFIG.MIN_PROFIT_USD} | Auto Execute: ${CONFIG.AUTO_EXECUTE}`);
  console.log(`[CHAINS] ${state.chains.filter(c => c.connected).map(c => c.name).join(', ')}\n`);
  
  res.json({
    success: true,
    isRunning: true,
    isDryRun: state.isDryRun,
    mode: 'SCALPER_3CHAINS',
    config: CONFIG,
    connectedChains: state.chains.filter(c => c.connected).map(c => c.name)
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
    mode: 'SCALPER_3CHAINS',
    port: PORT,
    running: state.isRunning,
    dryRun: state.isDryRun,
    wallet: WALLET_ADDRESS,
    chains: state.chains.map(c => ({ name: c.name, connected: c.connected, balance: c.balance })),
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
║   🔥 SCALPER 3 CHAINS - BASE + ARBITRUM + OPTIMISM                            ║
║                                                                               ║
║   ✅ Puerto: ${PORT}                                                           ║
║   ✅ Wallet: ${WALLET_ADDRESS.slice(0, 10)}...${WALLET_ADDRESS.slice(-5)}                                  ║
║                                                                               ║
║   ⚡ Intervalo: ${CONFIG.SCAN_INTERVAL_MS}ms | Min Profit: $${CONFIG.MIN_PROFIT_USD}                           ║
║   ⚡ Auto Execute: ${CONFIG.AUTO_EXECUTE}                                                   ║
║                                                                               ║
║   ⚠️  MODO REAL - Ejecutará trades automáticamente                            ║
║                                                                               ║
╚═══════════════════════════════════════════════════════════════════════════════╝
  `);
  
  await init();
  console.log('[READY] 🔥 POST /api/defi/multichain-arb/start para iniciar.\n');
});

process.on('SIGINT', () => {
  if (timer) clearInterval(timer);
  process.exit(0);
});




 * 🔥 SCALPER 3 CHAINS - BASE + ARBITRUM + OPTIMISM
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * Bot optimizado para 3 chains con:
 * - RPCs alternativos para Optimism
 * - Ejecución automática agresiva
 * - Umbral de profit muy bajo
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
  SCAN_INTERVAL_MS: 500,
  MIN_PROFIT_USD: 0.001,          // Muy bajo para capturar más
  MAX_SLIPPAGE_BPS: 100,          // 1%
  AUTO_EXECUTE: true,
  ETH_PRICE_USD: 3500,
  TRADE_AMOUNTS: [0.005, 0.01, 0.02],
  FEE_TIERS: [500, 3000]          // 0.05% y 0.3%
};

const PRIVATE_KEY = process.env.VITE_ETH_PRIVATE_KEY;
const WALLET_ADDRESS = process.env.VITE_ETH_WALLET_ADDRESS;

if (!PRIVATE_KEY || !WALLET_ADDRESS) {
  console.error('❌ ERROR: Credenciales no configuradas');
  process.exit(1);
}

// ═══════════════════════════════════════════════════════════════════════════════
// 3 CHAINS CON RPCs MÚLTIPLES
// ═══════════════════════════════════════════════════════════════════════════════

const CHAINS = {
  base: {
    name: 'Base',
    chainId: 8453,
    rpcs: [
      'https://base-mainnet.g.alchemy.com/v2/mm-9UjI5oG51l94mRH3fh',
      'https://mainnet.base.org',
      'https://base.llamarpc.com'
    ],
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
    rpcs: [
      'https://arb1.arbitrum.io/rpc',
      'https://arbitrum.llamarpc.com',
      'https://rpc.ankr.com/arbitrum'
    ],
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
    rpcs: [
      'https://optimism.llamarpc.com',
      'https://rpc.ankr.com/optimism',
      'https://optimism-mainnet.public.blastapi.io',
      'https://1rpc.io/op'
    ],
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
  mode: 'SCALPER_3CHAINS',
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
// CONECTAR CON FALLBACK DE RPCs
// ═══════════════════════════════════════════════════════════════════════════════

async function connectWithFallback(chainKey) {
  const chain = CHAINS[chainKey];
  
  for (const rpc of chain.rpcs) {
    try {
      const provider = new ethers.JsonRpcProvider(rpc);
      // Test connection
      await provider.getBlockNumber();
      console.log(`   ✅ ${chain.name}: Conectado a ${rpc.split('/')[2]}`);
      return provider;
    } catch (e) {
      console.log(`   ⚠️ ${chain.name}: RPC ${rpc.split('/')[2]} falló, probando siguiente...`);
    }
  }
  
  throw new Error(`No se pudo conectar a ${chain.name}`);
}

async function init() {
  console.log('[INIT] 🔌 Conectando a 3 chains...\n');
  
  for (const [chainKey, chain] of Object.entries(CHAINS)) {
    try {
      const provider = await connectWithFallback(chainKey);
      providers[chainKey] = provider;
      signers[chainKey] = new ethers.Wallet(PRIVATE_KEY, provider);
      
      contracts[chainKey] = {
        quoter: new ethers.Contract(chain.quoter, QUOTER_ABI, provider),
        router: new ethers.Contract(chain.router, ROUTER_ABI, signers[chainKey]),
        weth: new ethers.Contract(chain.tokens.WETH, WETH_ABI, signers[chainKey])
      };
      
      const balance = await provider.getBalance(WALLET_ADDRESS);
      const balanceEth = parseFloat(ethers.formatEther(balance));
      
      state.chains.push({
        chain: chainKey,
        name: chain.name,
        chainId: chain.chainId,
        balance: balanceEth.toFixed(6),
        balanceUsd: balanceEth * CONFIG.ETH_PRICE_USD,
        routes: CONFIG.FEE_TIERS.length * CONFIG.TRADE_AMOUNTS.length,
        isActive: balanceEth > 0.001,
        lastScan: Date.now(),
        explorer: chain.explorer,
        ethPrice: 0,
        connected: true
      });
      
      state.banditStates.push({
        chain: chainKey,
        alpha: 2,
        beta: 2,
        winRate: 50,
        selected: chainKey === 'base',
        attempts: 0,
        wins: 0
      });
      
      console.log(`   💰 ${chain.name}: ${balanceEth.toFixed(6)} ETH ($${(balanceEth * CONFIG.ETH_PRICE_USD).toFixed(2)})`);
    } catch (e) {
      console.error(`   ❌ ${chain.name}: ${e.message}`);
      state.chains.push({
        chain: chainKey,
        name: chain.name,
        chainId: chain.chainId,
        balance: '0',
        balanceUsd: 0,
        routes: 0,
        isActive: false,
        lastScan: Date.now(),
        explorer: chain.explorer,
        ethPrice: 0,
        connected: false,
        error: e.message
      });
    }
  }
  console.log('');
}

// ═══════════════════════════════════════════════════════════════════════════════
// ESCANEO SIMPLE Y RÁPIDO
// ═══════════════════════════════════════════════════════════════════════════════

async function scanChain(chainKey) {
  const chain = CHAINS[chainKey];
  const provider = providers[chainKey];
  const quoter = contracts[chainKey]?.quoter;
  
  if (!quoter) return [];
  
  const opportunities = [];
  
  try {
    // Gas price
    const feeData = await provider.getFeeData();
    const gasPrice = feeData.gasPrice || ethers.parseUnits('0.01', 'gwei');
    const gasCostWei = gasPrice * 300000n;
    const gasCostUsd = parseFloat(ethers.formatEther(gasCostWei)) * CONFIG.ETH_PRICE_USD;
    
    // Precio ETH
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
    
    // Escanear rutas
    for (const amountEth of CONFIG.TRADE_AMOUNTS) {
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
            const spreadBps = Number((grossProfit * 10000n) / amountWei);
            
            // Registrar TODAS las oportunidades (incluso negativas) para mostrar en UI
            const netProfitUsd = parseFloat(ethers.formatEther(netProfit)) * ethPrice;
            
            opportunities.push({
              chain: chainKey,
              chainName: chain.name,
              strategy: 'FEE_TIER_ARB',
              route: `${CONFIG.FEE_TIERS[i]/100}%→${CONFIG.FEE_TIERS[j]/100}%`,
              amountIn: amountWei.toString(),
              amountInEth: amountEth,
              fee1: CONFIG.FEE_TIERS[i],
              fee2: CONFIG.FEE_TIERS[j],
              usdcIntermediate: usdcOut.toString(),
              wethOut: wethOut.toString(),
              spreadBps,
              netProfitUsd,
              gasCostUsd,
              ethPrice,
              profitable: netProfitUsd >= CONFIG.MIN_PROFIT_USD,
              timestamp: Date.now(),
              // Guardar BigInt originales para ejecución
              _amountInWei: amountWei,
              _usdcOut: usdcOut,
              _wethOut: wethOut
            });
            
          } catch (e) {
            // Pool no existe
          }
        }
      }
    }
    
  } catch (e) {
    console.error(`[SCAN] Error ${chain.name}: ${e.message.slice(0, 50)}`);
  }
  
  return opportunities;
}

// ═══════════════════════════════════════════════════════════════════════════════
// EJECUCIÓN DE TRADE
// ═══════════════════════════════════════════════════════════════════════════════

async function executeTrade(opp) {
  if (isExecuting) return null;
  isExecuting = true;
  
  const chain = CHAINS[opp.chain];
  const signer = signers[opp.chain];
  const provider = providers[opp.chain];
  const { router, weth } = contracts[opp.chain];
  
  // Usar BigInt originales o convertir de string
  const amountIn = opp._amountInWei || BigInt(opp.amountIn);
  const usdcIntermediate = opp._usdcOut || BigInt(opp.usdcIntermediate);
  const wethOut = opp._wethOut || BigInt(opp.wethOut);
  
  console.log(`\n🔥 ═══════════════════════════════════════════════════════════════`);
  console.log(`   EJECUTANDO TRADE EN ${chain.name.toUpperCase()}`);
  console.log(`   Route: ${opp.route}`);
  console.log(`   Amount: ${opp.amountInEth} ETH`);
  console.log(`   Expected: $${opp.netProfitUsd.toFixed(4)}`);
  
  const startTime = Date.now();
  
  try {
    // Verificar balance
    const balance = await provider.getBalance(WALLET_ADDRESS);
    if (balance < amountIn + ethers.parseEther('0.002')) {
      console.log(`   ❌ Balance insuficiente en ${chain.name}`);
      isExecuting = false;
      return { success: false, error: 'Balance insuficiente' };
    }
    
    // 1. Wrap ETH
    console.log(`   📦 Wrapping ETH...`);
    const wrapTx = await weth.deposit({ value: amountIn, gasLimit: 60000 });
    await wrapTx.wait(1);
    console.log(`   ✅ Wrapped`);
    
    // 2. Approve WETH
    const allowance = await weth.allowance(WALLET_ADDRESS, chain.router);
    if (allowance < amountIn) {
      console.log(`   🔓 Approving WETH...`);
      const approveTx = await weth.approve(chain.router, ethers.MaxUint256, { gasLimit: 60000 });
      await approveTx.wait(1);
    }
    
    // 3. SWAP 1: WETH → USDC
    console.log(`   🔄 SWAP 1: WETH → USDC (${opp.fee1/100}%)...`);
    const minUsdc = (usdcIntermediate * BigInt(10000 - CONFIG.MAX_SLIPPAGE_BPS)) / 10000n;
    
    const swap1Tx = await router.exactInputSingle({
      tokenIn: chain.tokens.WETH,
      tokenOut: chain.tokens.USDC,
      fee: opp.fee1,
      recipient: WALLET_ADDRESS,
      amountIn: amountIn,
      amountOutMinimum: minUsdc,
      sqrtPriceLimitX96: 0n
    }, { gasLimit: 350000 });
    
    const receipt1 = await swap1Tx.wait(1);
    console.log(`   ✅ SWAP 1 completado: ${receipt1.hash.slice(0, 16)}...`);
    
    // 4. Obtener balance USDC
    const usdc = new ethers.Contract(chain.tokens.USDC, ERC20_ABI, signer);
    const usdcBalance = await usdc.balanceOf(WALLET_ADDRESS);
    console.log(`   💵 USDC recibido: ${ethers.formatUnits(usdcBalance, 6)}`);
    
    // 5. Approve USDC
    const usdcAllowance = await usdc.allowance(WALLET_ADDRESS, chain.router);
    if (usdcAllowance < usdcBalance) {
      console.log(`   🔓 Approving USDC...`);
      const approveUsdcTx = await usdc.approve(chain.router, ethers.MaxUint256, { gasLimit: 60000 });
      await approveUsdcTx.wait(1);
    }
    
    // 6. SWAP 2: USDC → WETH
    console.log(`   🔄 SWAP 2: USDC → WETH (${opp.fee2/100}%)...`);
    const minWeth = (wethOut * BigInt(10000 - CONFIG.MAX_SLIPPAGE_BPS)) / 10000n;
    
    const swap2Tx = await router.exactInputSingle({
      tokenIn: chain.tokens.USDC,
      tokenOut: chain.tokens.WETH,
      fee: opp.fee2,
      recipient: WALLET_ADDRESS,
      amountIn: usdcBalance,
      amountOutMinimum: minWeth,
      sqrtPriceLimitX96: 0n
    }, { gasLimit: 350000 });
    
    const receipt2 = await swap2Tx.wait(1);
    console.log(`   ✅ SWAP 2 completado: ${receipt2.hash.slice(0, 16)}...`);
    
    // 7. Calcular profit
    const finalWeth = await weth.balanceOf(WALLET_ADDRESS);
    const actualProfit = finalWeth - amountIn;
    const actualProfitUsd = parseFloat(ethers.formatEther(actualProfit)) * opp.ethPrice;
    
    const gas1 = receipt1.gasUsed * receipt1.gasPrice;
    const gas2 = receipt2.gasUsed * receipt2.gasPrice;
    const totalGasUsd = parseFloat(ethers.formatEther(gas1 + gas2)) * opp.ethPrice;
    
    const netProfitUsd = actualProfitUsd - totalGasUsd;
    const executionTime = Date.now() - startTime;
    
    console.log(`   ═══════════════════════════════════════════════════════════════`);
    console.log(`   💰 PROFIT BRUTO: $${actualProfitUsd.toFixed(4)}`);
    console.log(`   ⛽ GAS TOTAL: $${totalGasUsd.toFixed(4)}`);
    console.log(`   💵 PROFIT NETO: $${netProfitUsd.toFixed(4)}`);
    console.log(`   ⏱️  Tiempo: ${executionTime}ms`);
    console.log(`   🔗 ${chain.explorer}/tx/${receipt2.hash}`);
    console.log(`   ═══════════════════════════════════════════════════════════════\n`);
    
    isExecuting = false;
    return {
      success: true,
      profitUsd: actualProfitUsd,
      gasUsd: totalGasUsd,
      netProfitUsd,
      txHash: receipt2.hash,
      executionTimeMs: executionTime
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
  
  // Rotar entre chains activas
  const activeChains = state.chains.filter(c => c.connected && c.isActive);
  if (activeChains.length === 0) {
    console.log('[TICK] No hay chains activas');
    return;
  }
  
  const selectedChain = activeChains[currentChainIndex % activeChains.length].chain;
  currentChainIndex++;
  
  state.stats.currentChain = selectedChain;
  state.banditStates.forEach(b => b.selected = b.chain === selectedChain);
  
  try {
    const opportunities = await scanChain(selectedChain);
    const scanTime = Date.now() - tickStart;
    
    scanTimes.push(scanTime);
    if (scanTimes.length > 20) scanTimes.shift();
    state.stats.avgScanTimeMs = Math.round(scanTimes.reduce((a, b) => a + b, 0) / scanTimes.length);
    state.stats.scansPerSecond = state.stats.avgScanTimeMs > 0 ? Math.round(1000 / state.stats.avgScanTimeMs * 10) / 10 : 0;
    
    // Guardar TODAS las oportunidades para mostrar en UI
    state.opportunities = [...opportunities.slice(0, 10), ...state.opportunities].slice(0, 30);
    
    // Filtrar solo las rentables
    const profitableOpps = opportunities.filter(o => o.profitable);
    
    if (profitableOpps.length > 0) {
      state.stats.opportunitiesFound += profitableOpps.length;
      profitableOpps.sort((a, b) => b.netProfitUsd - a.netProfitUsd);
      
      const best = profitableOpps[0];
      state.stats.lastOpportunity = best;
      
      console.log(`\n[SCAN #${state.stats.totalScans}] ${CHAINS[selectedChain].name} | ${scanTime}ms`);
      console.log(`   🎯 ${profitableOpps.length} OPORTUNIDADES RENTABLES!`);
      console.log(`   💰 MEJOR: ${best.route} | $${best.netProfitUsd.toFixed(4)}`);
      
      // EJECUTAR si no es dry run
      if (!state.isDryRun && CONFIG.AUTO_EXECUTE) {
        state.stats.tradesAttempted++;
        
        const result = await executeTrade(best);
        
        if (result) {
          state.stats.tradesExecuted++;
          
          const tradeLog = {
            id: `tx-${Date.now()}`,
            timestamp: Date.now(),
            chain: best.chain,
            chainName: best.chainName,
            strategy: best.strategy,
            route: best.route,
            amountIn: best.amountInEth,
            spreadBps: best.spreadBps,
            expectedProfit: best.netProfitUsd.toFixed(4),
            actualProfit: result.success ? result.profitUsd.toFixed(4) : '0',
            gasCost: result.success ? result.gasUsd.toFixed(4) : '0',
            netProfit: result.success ? result.netProfitUsd.toFixed(4) : '0',
            txHash: result.txHash || '',
            status: result.success ? 'success' : 'failed',
            error: result.error || '',
            executionTimeMs: result.executionTimeMs || 0
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
            }
          }
          
          state.stats.winRate = state.stats.tradesExecuted > 0
            ? (state.stats.tradesSuccessful / state.stats.tradesExecuted) * 100
            : 0;
        }
      }
    } else {
      // Log cada 10 scans
      if (state.stats.totalScans % 10 === 0) {
        const bestOpp = opportunities.length > 0 ? opportunities.sort((a, b) => b.netProfitUsd - a.netProfitUsd)[0] : null;
        console.log(`[SCAN #${state.stats.totalScans}] ${CHAINS[selectedChain].name} | ${scanTime}ms | Best spread: ${bestOpp ? bestOpp.spreadBps + ' bps ($' + bestOpp.netProfitUsd.toFixed(4) + ')' : 'N/A'}`);
      }
    }
    
    // Actualizar balances cada 30 scans
    if (state.stats.totalScans % 30 === 0) {
      for (const chainState of state.chains) {
        if (!chainState.connected) continue;
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
    console.error(`[TICK] Error: ${e.message}`);
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// API
// ═══════════════════════════════════════════════════════════════════════════════

app.get('/api/defi/multichain-arb/status', (req, res) => {
  // Convertir BigInt a string para JSON
  const safeState = JSON.parse(JSON.stringify(state, (key, value) =>
    typeof value === 'bigint' ? value.toString() : value
  ));
  res.json(safeState);
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
  
  console.log(`\n[START] 🔥 SCALPER 3 CHAINS - ${state.isDryRun ? 'DRY RUN' : '⚠️ MODO REAL - EJECUTANDO TRADES'}`);
  console.log(`[CONFIG] Min Profit: $${CONFIG.MIN_PROFIT_USD} | Auto Execute: ${CONFIG.AUTO_EXECUTE}`);
  console.log(`[CHAINS] ${state.chains.filter(c => c.connected).map(c => c.name).join(', ')}\n`);
  
  res.json({
    success: true,
    isRunning: true,
    isDryRun: state.isDryRun,
    mode: 'SCALPER_3CHAINS',
    config: CONFIG,
    connectedChains: state.chains.filter(c => c.connected).map(c => c.name)
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
    mode: 'SCALPER_3CHAINS',
    port: PORT,
    running: state.isRunning,
    dryRun: state.isDryRun,
    wallet: WALLET_ADDRESS,
    chains: state.chains.map(c => ({ name: c.name, connected: c.connected, balance: c.balance })),
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
║   🔥 SCALPER 3 CHAINS - BASE + ARBITRUM + OPTIMISM                            ║
║                                                                               ║
║   ✅ Puerto: ${PORT}                                                           ║
║   ✅ Wallet: ${WALLET_ADDRESS.slice(0, 10)}...${WALLET_ADDRESS.slice(-5)}                                  ║
║                                                                               ║
║   ⚡ Intervalo: ${CONFIG.SCAN_INTERVAL_MS}ms | Min Profit: $${CONFIG.MIN_PROFIT_USD}                           ║
║   ⚡ Auto Execute: ${CONFIG.AUTO_EXECUTE}                                                   ║
║                                                                               ║
║   ⚠️  MODO REAL - Ejecutará trades automáticamente                            ║
║                                                                               ║
╚═══════════════════════════════════════════════════════════════════════════════╝
  `);
  
  await init();
  console.log('[READY] 🔥 POST /api/defi/multichain-arb/start para iniciar.\n');
});

process.on('SIGINT', () => {
  if (timer) clearInterval(timer);
  process.exit(0);
});


 * 🔥 SCALPER 3 CHAINS - BASE + ARBITRUM + OPTIMISM
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * Bot optimizado para 3 chains con:
 * - RPCs alternativos para Optimism
 * - Ejecución automática agresiva
 * - Umbral de profit muy bajo
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
  SCAN_INTERVAL_MS: 500,
  MIN_PROFIT_USD: 0.001,          // Muy bajo para capturar más
  MAX_SLIPPAGE_BPS: 100,          // 1%
  AUTO_EXECUTE: true,
  ETH_PRICE_USD: 3500,
  TRADE_AMOUNTS: [0.005, 0.01, 0.02],
  FEE_TIERS: [500, 3000]          // 0.05% y 0.3%
};

const PRIVATE_KEY = process.env.VITE_ETH_PRIVATE_KEY;
const WALLET_ADDRESS = process.env.VITE_ETH_WALLET_ADDRESS;

if (!PRIVATE_KEY || !WALLET_ADDRESS) {
  console.error('❌ ERROR: Credenciales no configuradas');
  process.exit(1);
}

// ═══════════════════════════════════════════════════════════════════════════════
// 3 CHAINS CON RPCs MÚLTIPLES
// ═══════════════════════════════════════════════════════════════════════════════

const CHAINS = {
  base: {
    name: 'Base',
    chainId: 8453,
    rpcs: [
      'https://base-mainnet.g.alchemy.com/v2/mm-9UjI5oG51l94mRH3fh',
      'https://mainnet.base.org',
      'https://base.llamarpc.com'
    ],
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
    rpcs: [
      'https://arb1.arbitrum.io/rpc',
      'https://arbitrum.llamarpc.com',
      'https://rpc.ankr.com/arbitrum'
    ],
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
    rpcs: [
      'https://optimism.llamarpc.com',
      'https://rpc.ankr.com/optimism',
      'https://optimism-mainnet.public.blastapi.io',
      'https://1rpc.io/op'
    ],
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
  mode: 'SCALPER_3CHAINS',
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
// CONECTAR CON FALLBACK DE RPCs
// ═══════════════════════════════════════════════════════════════════════════════

async function connectWithFallback(chainKey) {
  const chain = CHAINS[chainKey];
  
  for (const rpc of chain.rpcs) {
    try {
      const provider = new ethers.JsonRpcProvider(rpc);
      // Test connection
      await provider.getBlockNumber();
      console.log(`   ✅ ${chain.name}: Conectado a ${rpc.split('/')[2]}`);
      return provider;
    } catch (e) {
      console.log(`   ⚠️ ${chain.name}: RPC ${rpc.split('/')[2]} falló, probando siguiente...`);
    }
  }
  
  throw new Error(`No se pudo conectar a ${chain.name}`);
}

async function init() {
  console.log('[INIT] 🔌 Conectando a 3 chains...\n');
  
  for (const [chainKey, chain] of Object.entries(CHAINS)) {
    try {
      const provider = await connectWithFallback(chainKey);
      providers[chainKey] = provider;
      signers[chainKey] = new ethers.Wallet(PRIVATE_KEY, provider);
      
      contracts[chainKey] = {
        quoter: new ethers.Contract(chain.quoter, QUOTER_ABI, provider),
        router: new ethers.Contract(chain.router, ROUTER_ABI, signers[chainKey]),
        weth: new ethers.Contract(chain.tokens.WETH, WETH_ABI, signers[chainKey])
      };
      
      const balance = await provider.getBalance(WALLET_ADDRESS);
      const balanceEth = parseFloat(ethers.formatEther(balance));
      
      state.chains.push({
        chain: chainKey,
        name: chain.name,
        chainId: chain.chainId,
        balance: balanceEth.toFixed(6),
        balanceUsd: balanceEth * CONFIG.ETH_PRICE_USD,
        routes: CONFIG.FEE_TIERS.length * CONFIG.TRADE_AMOUNTS.length,
        isActive: balanceEth > 0.001,
        lastScan: Date.now(),
        explorer: chain.explorer,
        ethPrice: 0,
        connected: true
      });
      
      state.banditStates.push({
        chain: chainKey,
        alpha: 2,
        beta: 2,
        winRate: 50,
        selected: chainKey === 'base',
        attempts: 0,
        wins: 0
      });
      
      console.log(`   💰 ${chain.name}: ${balanceEth.toFixed(6)} ETH ($${(balanceEth * CONFIG.ETH_PRICE_USD).toFixed(2)})`);
    } catch (e) {
      console.error(`   ❌ ${chain.name}: ${e.message}`);
      state.chains.push({
        chain: chainKey,
        name: chain.name,
        chainId: chain.chainId,
        balance: '0',
        balanceUsd: 0,
        routes: 0,
        isActive: false,
        lastScan: Date.now(),
        explorer: chain.explorer,
        ethPrice: 0,
        connected: false,
        error: e.message
      });
    }
  }
  console.log('');
}

// ═══════════════════════════════════════════════════════════════════════════════
// ESCANEO SIMPLE Y RÁPIDO
// ═══════════════════════════════════════════════════════════════════════════════

async function scanChain(chainKey) {
  const chain = CHAINS[chainKey];
  const provider = providers[chainKey];
  const quoter = contracts[chainKey]?.quoter;
  
  if (!quoter) return [];
  
  const opportunities = [];
  
  try {
    // Gas price
    const feeData = await provider.getFeeData();
    const gasPrice = feeData.gasPrice || ethers.parseUnits('0.01', 'gwei');
    const gasCostWei = gasPrice * 300000n;
    const gasCostUsd = parseFloat(ethers.formatEther(gasCostWei)) * CONFIG.ETH_PRICE_USD;
    
    // Precio ETH
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
    
    // Escanear rutas
    for (const amountEth of CONFIG.TRADE_AMOUNTS) {
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
            const spreadBps = Number((grossProfit * 10000n) / amountWei);
            
            // Registrar TODAS las oportunidades (incluso negativas) para mostrar en UI
            const netProfitUsd = parseFloat(ethers.formatEther(netProfit)) * ethPrice;
            
            opportunities.push({
              chain: chainKey,
              chainName: chain.name,
              strategy: 'FEE_TIER_ARB',
              route: `${CONFIG.FEE_TIERS[i]/100}%→${CONFIG.FEE_TIERS[j]/100}%`,
              amountIn: amountWei.toString(),
              amountInEth: amountEth,
              fee1: CONFIG.FEE_TIERS[i],
              fee2: CONFIG.FEE_TIERS[j],
              usdcIntermediate: usdcOut.toString(),
              wethOut: wethOut.toString(),
              spreadBps,
              netProfitUsd,
              gasCostUsd,
              ethPrice,
              profitable: netProfitUsd >= CONFIG.MIN_PROFIT_USD,
              timestamp: Date.now(),
              // Guardar BigInt originales para ejecución
              _amountInWei: amountWei,
              _usdcOut: usdcOut,
              _wethOut: wethOut
            });
            
          } catch (e) {
            // Pool no existe
          }
        }
      }
    }
    
  } catch (e) {
    console.error(`[SCAN] Error ${chain.name}: ${e.message.slice(0, 50)}`);
  }
  
  return opportunities;
}

// ═══════════════════════════════════════════════════════════════════════════════
// EJECUCIÓN DE TRADE
// ═══════════════════════════════════════════════════════════════════════════════

async function executeTrade(opp) {
  if (isExecuting) return null;
  isExecuting = true;
  
  const chain = CHAINS[opp.chain];
  const signer = signers[opp.chain];
  const provider = providers[opp.chain];
  const { router, weth } = contracts[opp.chain];
  
  // Usar BigInt originales o convertir de string
  const amountIn = opp._amountInWei || BigInt(opp.amountIn);
  const usdcIntermediate = opp._usdcOut || BigInt(opp.usdcIntermediate);
  const wethOut = opp._wethOut || BigInt(opp.wethOut);
  
  console.log(`\n🔥 ═══════════════════════════════════════════════════════════════`);
  console.log(`   EJECUTANDO TRADE EN ${chain.name.toUpperCase()}`);
  console.log(`   Route: ${opp.route}`);
  console.log(`   Amount: ${opp.amountInEth} ETH`);
  console.log(`   Expected: $${opp.netProfitUsd.toFixed(4)}`);
  
  const startTime = Date.now();
  
  try {
    // Verificar balance
    const balance = await provider.getBalance(WALLET_ADDRESS);
    if (balance < amountIn + ethers.parseEther('0.002')) {
      console.log(`   ❌ Balance insuficiente en ${chain.name}`);
      isExecuting = false;
      return { success: false, error: 'Balance insuficiente' };
    }
    
    // 1. Wrap ETH
    console.log(`   📦 Wrapping ETH...`);
    const wrapTx = await weth.deposit({ value: amountIn, gasLimit: 60000 });
    await wrapTx.wait(1);
    console.log(`   ✅ Wrapped`);
    
    // 2. Approve WETH
    const allowance = await weth.allowance(WALLET_ADDRESS, chain.router);
    if (allowance < amountIn) {
      console.log(`   🔓 Approving WETH...`);
      const approveTx = await weth.approve(chain.router, ethers.MaxUint256, { gasLimit: 60000 });
      await approveTx.wait(1);
    }
    
    // 3. SWAP 1: WETH → USDC
    console.log(`   🔄 SWAP 1: WETH → USDC (${opp.fee1/100}%)...`);
    const minUsdc = (usdcIntermediate * BigInt(10000 - CONFIG.MAX_SLIPPAGE_BPS)) / 10000n;
    
    const swap1Tx = await router.exactInputSingle({
      tokenIn: chain.tokens.WETH,
      tokenOut: chain.tokens.USDC,
      fee: opp.fee1,
      recipient: WALLET_ADDRESS,
      amountIn: amountIn,
      amountOutMinimum: minUsdc,
      sqrtPriceLimitX96: 0n
    }, { gasLimit: 350000 });
    
    const receipt1 = await swap1Tx.wait(1);
    console.log(`   ✅ SWAP 1 completado: ${receipt1.hash.slice(0, 16)}...`);
    
    // 4. Obtener balance USDC
    const usdc = new ethers.Contract(chain.tokens.USDC, ERC20_ABI, signer);
    const usdcBalance = await usdc.balanceOf(WALLET_ADDRESS);
    console.log(`   💵 USDC recibido: ${ethers.formatUnits(usdcBalance, 6)}`);
    
    // 5. Approve USDC
    const usdcAllowance = await usdc.allowance(WALLET_ADDRESS, chain.router);
    if (usdcAllowance < usdcBalance) {
      console.log(`   🔓 Approving USDC...`);
      const approveUsdcTx = await usdc.approve(chain.router, ethers.MaxUint256, { gasLimit: 60000 });
      await approveUsdcTx.wait(1);
    }
    
    // 6. SWAP 2: USDC → WETH
    console.log(`   🔄 SWAP 2: USDC → WETH (${opp.fee2/100}%)...`);
    const minWeth = (wethOut * BigInt(10000 - CONFIG.MAX_SLIPPAGE_BPS)) / 10000n;
    
    const swap2Tx = await router.exactInputSingle({
      tokenIn: chain.tokens.USDC,
      tokenOut: chain.tokens.WETH,
      fee: opp.fee2,
      recipient: WALLET_ADDRESS,
      amountIn: usdcBalance,
      amountOutMinimum: minWeth,
      sqrtPriceLimitX96: 0n
    }, { gasLimit: 350000 });
    
    const receipt2 = await swap2Tx.wait(1);
    console.log(`   ✅ SWAP 2 completado: ${receipt2.hash.slice(0, 16)}...`);
    
    // 7. Calcular profit
    const finalWeth = await weth.balanceOf(WALLET_ADDRESS);
    const actualProfit = finalWeth - amountIn;
    const actualProfitUsd = parseFloat(ethers.formatEther(actualProfit)) * opp.ethPrice;
    
    const gas1 = receipt1.gasUsed * receipt1.gasPrice;
    const gas2 = receipt2.gasUsed * receipt2.gasPrice;
    const totalGasUsd = parseFloat(ethers.formatEther(gas1 + gas2)) * opp.ethPrice;
    
    const netProfitUsd = actualProfitUsd - totalGasUsd;
    const executionTime = Date.now() - startTime;
    
    console.log(`   ═══════════════════════════════════════════════════════════════`);
    console.log(`   💰 PROFIT BRUTO: $${actualProfitUsd.toFixed(4)}`);
    console.log(`   ⛽ GAS TOTAL: $${totalGasUsd.toFixed(4)}`);
    console.log(`   💵 PROFIT NETO: $${netProfitUsd.toFixed(4)}`);
    console.log(`   ⏱️  Tiempo: ${executionTime}ms`);
    console.log(`   🔗 ${chain.explorer}/tx/${receipt2.hash}`);
    console.log(`   ═══════════════════════════════════════════════════════════════\n`);
    
    isExecuting = false;
    return {
      success: true,
      profitUsd: actualProfitUsd,
      gasUsd: totalGasUsd,
      netProfitUsd,
      txHash: receipt2.hash,
      executionTimeMs: executionTime
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
  
  // Rotar entre chains activas
  const activeChains = state.chains.filter(c => c.connected && c.isActive);
  if (activeChains.length === 0) {
    console.log('[TICK] No hay chains activas');
    return;
  }
  
  const selectedChain = activeChains[currentChainIndex % activeChains.length].chain;
  currentChainIndex++;
  
  state.stats.currentChain = selectedChain;
  state.banditStates.forEach(b => b.selected = b.chain === selectedChain);
  
  try {
    const opportunities = await scanChain(selectedChain);
    const scanTime = Date.now() - tickStart;
    
    scanTimes.push(scanTime);
    if (scanTimes.length > 20) scanTimes.shift();
    state.stats.avgScanTimeMs = Math.round(scanTimes.reduce((a, b) => a + b, 0) / scanTimes.length);
    state.stats.scansPerSecond = state.stats.avgScanTimeMs > 0 ? Math.round(1000 / state.stats.avgScanTimeMs * 10) / 10 : 0;
    
    // Guardar TODAS las oportunidades para mostrar en UI
    state.opportunities = [...opportunities.slice(0, 10), ...state.opportunities].slice(0, 30);
    
    // Filtrar solo las rentables
    const profitableOpps = opportunities.filter(o => o.profitable);
    
    if (profitableOpps.length > 0) {
      state.stats.opportunitiesFound += profitableOpps.length;
      profitableOpps.sort((a, b) => b.netProfitUsd - a.netProfitUsd);
      
      const best = profitableOpps[0];
      state.stats.lastOpportunity = best;
      
      console.log(`\n[SCAN #${state.stats.totalScans}] ${CHAINS[selectedChain].name} | ${scanTime}ms`);
      console.log(`   🎯 ${profitableOpps.length} OPORTUNIDADES RENTABLES!`);
      console.log(`   💰 MEJOR: ${best.route} | $${best.netProfitUsd.toFixed(4)}`);
      
      // EJECUTAR si no es dry run
      if (!state.isDryRun && CONFIG.AUTO_EXECUTE) {
        state.stats.tradesAttempted++;
        
        const result = await executeTrade(best);
        
        if (result) {
          state.stats.tradesExecuted++;
          
          const tradeLog = {
            id: `tx-${Date.now()}`,
            timestamp: Date.now(),
            chain: best.chain,
            chainName: best.chainName,
            strategy: best.strategy,
            route: best.route,
            amountIn: best.amountInEth,
            spreadBps: best.spreadBps,
            expectedProfit: best.netProfitUsd.toFixed(4),
            actualProfit: result.success ? result.profitUsd.toFixed(4) : '0',
            gasCost: result.success ? result.gasUsd.toFixed(4) : '0',
            netProfit: result.success ? result.netProfitUsd.toFixed(4) : '0',
            txHash: result.txHash || '',
            status: result.success ? 'success' : 'failed',
            error: result.error || '',
            executionTimeMs: result.executionTimeMs || 0
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
            }
          }
          
          state.stats.winRate = state.stats.tradesExecuted > 0
            ? (state.stats.tradesSuccessful / state.stats.tradesExecuted) * 100
            : 0;
        }
      }
    } else {
      // Log cada 10 scans
      if (state.stats.totalScans % 10 === 0) {
        const bestOpp = opportunities.length > 0 ? opportunities.sort((a, b) => b.netProfitUsd - a.netProfitUsd)[0] : null;
        console.log(`[SCAN #${state.stats.totalScans}] ${CHAINS[selectedChain].name} | ${scanTime}ms | Best spread: ${bestOpp ? bestOpp.spreadBps + ' bps ($' + bestOpp.netProfitUsd.toFixed(4) + ')' : 'N/A'}`);
      }
    }
    
    // Actualizar balances cada 30 scans
    if (state.stats.totalScans % 30 === 0) {
      for (const chainState of state.chains) {
        if (!chainState.connected) continue;
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
    console.error(`[TICK] Error: ${e.message}`);
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// API
// ═══════════════════════════════════════════════════════════════════════════════

app.get('/api/defi/multichain-arb/status', (req, res) => {
  // Convertir BigInt a string para JSON
  const safeState = JSON.parse(JSON.stringify(state, (key, value) =>
    typeof value === 'bigint' ? value.toString() : value
  ));
  res.json(safeState);
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
  
  console.log(`\n[START] 🔥 SCALPER 3 CHAINS - ${state.isDryRun ? 'DRY RUN' : '⚠️ MODO REAL - EJECUTANDO TRADES'}`);
  console.log(`[CONFIG] Min Profit: $${CONFIG.MIN_PROFIT_USD} | Auto Execute: ${CONFIG.AUTO_EXECUTE}`);
  console.log(`[CHAINS] ${state.chains.filter(c => c.connected).map(c => c.name).join(', ')}\n`);
  
  res.json({
    success: true,
    isRunning: true,
    isDryRun: state.isDryRun,
    mode: 'SCALPER_3CHAINS',
    config: CONFIG,
    connectedChains: state.chains.filter(c => c.connected).map(c => c.name)
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
    mode: 'SCALPER_3CHAINS',
    port: PORT,
    running: state.isRunning,
    dryRun: state.isDryRun,
    wallet: WALLET_ADDRESS,
    chains: state.chains.map(c => ({ name: c.name, connected: c.connected, balance: c.balance })),
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
║   🔥 SCALPER 3 CHAINS - BASE + ARBITRUM + OPTIMISM                            ║
║                                                                               ║
║   ✅ Puerto: ${PORT}                                                           ║
║   ✅ Wallet: ${WALLET_ADDRESS.slice(0, 10)}...${WALLET_ADDRESS.slice(-5)}                                  ║
║                                                                               ║
║   ⚡ Intervalo: ${CONFIG.SCAN_INTERVAL_MS}ms | Min Profit: $${CONFIG.MIN_PROFIT_USD}                           ║
║   ⚡ Auto Execute: ${CONFIG.AUTO_EXECUTE}                                                   ║
║                                                                               ║
║   ⚠️  MODO REAL - Ejecutará trades automáticamente                            ║
║                                                                               ║
╚═══════════════════════════════════════════════════════════════════════════════╝
  `);
  
  await init();
  console.log('[READY] 🔥 POST /api/defi/multichain-arb/start para iniciar.\n');
});

process.on('SIGINT', () => {
  if (timer) clearInterval(timer);
  process.exit(0);
});




 * 🔥 SCALPER 3 CHAINS - BASE + ARBITRUM + OPTIMISM
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * Bot optimizado para 3 chains con:
 * - RPCs alternativos para Optimism
 * - Ejecución automática agresiva
 * - Umbral de profit muy bajo
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
  SCAN_INTERVAL_MS: 500,
  MIN_PROFIT_USD: 0.001,          // Muy bajo para capturar más
  MAX_SLIPPAGE_BPS: 100,          // 1%
  AUTO_EXECUTE: true,
  ETH_PRICE_USD: 3500,
  TRADE_AMOUNTS: [0.005, 0.01, 0.02],
  FEE_TIERS: [500, 3000]          // 0.05% y 0.3%
};

const PRIVATE_KEY = process.env.VITE_ETH_PRIVATE_KEY;
const WALLET_ADDRESS = process.env.VITE_ETH_WALLET_ADDRESS;

if (!PRIVATE_KEY || !WALLET_ADDRESS) {
  console.error('❌ ERROR: Credenciales no configuradas');
  process.exit(1);
}

// ═══════════════════════════════════════════════════════════════════════════════
// 3 CHAINS CON RPCs MÚLTIPLES
// ═══════════════════════════════════════════════════════════════════════════════

const CHAINS = {
  base: {
    name: 'Base',
    chainId: 8453,
    rpcs: [
      'https://base-mainnet.g.alchemy.com/v2/mm-9UjI5oG51l94mRH3fh',
      'https://mainnet.base.org',
      'https://base.llamarpc.com'
    ],
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
    rpcs: [
      'https://arb1.arbitrum.io/rpc',
      'https://arbitrum.llamarpc.com',
      'https://rpc.ankr.com/arbitrum'
    ],
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
    rpcs: [
      'https://optimism.llamarpc.com',
      'https://rpc.ankr.com/optimism',
      'https://optimism-mainnet.public.blastapi.io',
      'https://1rpc.io/op'
    ],
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
  mode: 'SCALPER_3CHAINS',
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
// CONECTAR CON FALLBACK DE RPCs
// ═══════════════════════════════════════════════════════════════════════════════

async function connectWithFallback(chainKey) {
  const chain = CHAINS[chainKey];
  
  for (const rpc of chain.rpcs) {
    try {
      const provider = new ethers.JsonRpcProvider(rpc);
      // Test connection
      await provider.getBlockNumber();
      console.log(`   ✅ ${chain.name}: Conectado a ${rpc.split('/')[2]}`);
      return provider;
    } catch (e) {
      console.log(`   ⚠️ ${chain.name}: RPC ${rpc.split('/')[2]} falló, probando siguiente...`);
    }
  }
  
  throw new Error(`No se pudo conectar a ${chain.name}`);
}

async function init() {
  console.log('[INIT] 🔌 Conectando a 3 chains...\n');
  
  for (const [chainKey, chain] of Object.entries(CHAINS)) {
    try {
      const provider = await connectWithFallback(chainKey);
      providers[chainKey] = provider;
      signers[chainKey] = new ethers.Wallet(PRIVATE_KEY, provider);
      
      contracts[chainKey] = {
        quoter: new ethers.Contract(chain.quoter, QUOTER_ABI, provider),
        router: new ethers.Contract(chain.router, ROUTER_ABI, signers[chainKey]),
        weth: new ethers.Contract(chain.tokens.WETH, WETH_ABI, signers[chainKey])
      };
      
      const balance = await provider.getBalance(WALLET_ADDRESS);
      const balanceEth = parseFloat(ethers.formatEther(balance));
      
      state.chains.push({
        chain: chainKey,
        name: chain.name,
        chainId: chain.chainId,
        balance: balanceEth.toFixed(6),
        balanceUsd: balanceEth * CONFIG.ETH_PRICE_USD,
        routes: CONFIG.FEE_TIERS.length * CONFIG.TRADE_AMOUNTS.length,
        isActive: balanceEth > 0.001,
        lastScan: Date.now(),
        explorer: chain.explorer,
        ethPrice: 0,
        connected: true
      });
      
      state.banditStates.push({
        chain: chainKey,
        alpha: 2,
        beta: 2,
        winRate: 50,
        selected: chainKey === 'base',
        attempts: 0,
        wins: 0
      });
      
      console.log(`   💰 ${chain.name}: ${balanceEth.toFixed(6)} ETH ($${(balanceEth * CONFIG.ETH_PRICE_USD).toFixed(2)})`);
    } catch (e) {
      console.error(`   ❌ ${chain.name}: ${e.message}`);
      state.chains.push({
        chain: chainKey,
        name: chain.name,
        chainId: chain.chainId,
        balance: '0',
        balanceUsd: 0,
        routes: 0,
        isActive: false,
        lastScan: Date.now(),
        explorer: chain.explorer,
        ethPrice: 0,
        connected: false,
        error: e.message
      });
    }
  }
  console.log('');
}

// ═══════════════════════════════════════════════════════════════════════════════
// ESCANEO SIMPLE Y RÁPIDO
// ═══════════════════════════════════════════════════════════════════════════════

async function scanChain(chainKey) {
  const chain = CHAINS[chainKey];
  const provider = providers[chainKey];
  const quoter = contracts[chainKey]?.quoter;
  
  if (!quoter) return [];
  
  const opportunities = [];
  
  try {
    // Gas price
    const feeData = await provider.getFeeData();
    const gasPrice = feeData.gasPrice || ethers.parseUnits('0.01', 'gwei');
    const gasCostWei = gasPrice * 300000n;
    const gasCostUsd = parseFloat(ethers.formatEther(gasCostWei)) * CONFIG.ETH_PRICE_USD;
    
    // Precio ETH
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
    
    // Escanear rutas
    for (const amountEth of CONFIG.TRADE_AMOUNTS) {
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
            const spreadBps = Number((grossProfit * 10000n) / amountWei);
            
            // Registrar TODAS las oportunidades (incluso negativas) para mostrar en UI
            const netProfitUsd = parseFloat(ethers.formatEther(netProfit)) * ethPrice;
            
            opportunities.push({
              chain: chainKey,
              chainName: chain.name,
              strategy: 'FEE_TIER_ARB',
              route: `${CONFIG.FEE_TIERS[i]/100}%→${CONFIG.FEE_TIERS[j]/100}%`,
              amountIn: amountWei.toString(),
              amountInEth: amountEth,
              fee1: CONFIG.FEE_TIERS[i],
              fee2: CONFIG.FEE_TIERS[j],
              usdcIntermediate: usdcOut.toString(),
              wethOut: wethOut.toString(),
              spreadBps,
              netProfitUsd,
              gasCostUsd,
              ethPrice,
              profitable: netProfitUsd >= CONFIG.MIN_PROFIT_USD,
              timestamp: Date.now(),
              // Guardar BigInt originales para ejecución
              _amountInWei: amountWei,
              _usdcOut: usdcOut,
              _wethOut: wethOut
            });
            
          } catch (e) {
            // Pool no existe
          }
        }
      }
    }
    
  } catch (e) {
    console.error(`[SCAN] Error ${chain.name}: ${e.message.slice(0, 50)}`);
  }
  
  return opportunities;
}

// ═══════════════════════════════════════════════════════════════════════════════
// EJECUCIÓN DE TRADE
// ═══════════════════════════════════════════════════════════════════════════════

async function executeTrade(opp) {
  if (isExecuting) return null;
  isExecuting = true;
  
  const chain = CHAINS[opp.chain];
  const signer = signers[opp.chain];
  const provider = providers[opp.chain];
  const { router, weth } = contracts[opp.chain];
  
  // Usar BigInt originales o convertir de string
  const amountIn = opp._amountInWei || BigInt(opp.amountIn);
  const usdcIntermediate = opp._usdcOut || BigInt(opp.usdcIntermediate);
  const wethOut = opp._wethOut || BigInt(opp.wethOut);
  
  console.log(`\n🔥 ═══════════════════════════════════════════════════════════════`);
  console.log(`   EJECUTANDO TRADE EN ${chain.name.toUpperCase()}`);
  console.log(`   Route: ${opp.route}`);
  console.log(`   Amount: ${opp.amountInEth} ETH`);
  console.log(`   Expected: $${opp.netProfitUsd.toFixed(4)}`);
  
  const startTime = Date.now();
  
  try {
    // Verificar balance
    const balance = await provider.getBalance(WALLET_ADDRESS);
    if (balance < amountIn + ethers.parseEther('0.002')) {
      console.log(`   ❌ Balance insuficiente en ${chain.name}`);
      isExecuting = false;
      return { success: false, error: 'Balance insuficiente' };
    }
    
    // 1. Wrap ETH
    console.log(`   📦 Wrapping ETH...`);
    const wrapTx = await weth.deposit({ value: amountIn, gasLimit: 60000 });
    await wrapTx.wait(1);
    console.log(`   ✅ Wrapped`);
    
    // 2. Approve WETH
    const allowance = await weth.allowance(WALLET_ADDRESS, chain.router);
    if (allowance < amountIn) {
      console.log(`   🔓 Approving WETH...`);
      const approveTx = await weth.approve(chain.router, ethers.MaxUint256, { gasLimit: 60000 });
      await approveTx.wait(1);
    }
    
    // 3. SWAP 1: WETH → USDC
    console.log(`   🔄 SWAP 1: WETH → USDC (${opp.fee1/100}%)...`);
    const minUsdc = (usdcIntermediate * BigInt(10000 - CONFIG.MAX_SLIPPAGE_BPS)) / 10000n;
    
    const swap1Tx = await router.exactInputSingle({
      tokenIn: chain.tokens.WETH,
      tokenOut: chain.tokens.USDC,
      fee: opp.fee1,
      recipient: WALLET_ADDRESS,
      amountIn: amountIn,
      amountOutMinimum: minUsdc,
      sqrtPriceLimitX96: 0n
    }, { gasLimit: 350000 });
    
    const receipt1 = await swap1Tx.wait(1);
    console.log(`   ✅ SWAP 1 completado: ${receipt1.hash.slice(0, 16)}...`);
    
    // 4. Obtener balance USDC
    const usdc = new ethers.Contract(chain.tokens.USDC, ERC20_ABI, signer);
    const usdcBalance = await usdc.balanceOf(WALLET_ADDRESS);
    console.log(`   💵 USDC recibido: ${ethers.formatUnits(usdcBalance, 6)}`);
    
    // 5. Approve USDC
    const usdcAllowance = await usdc.allowance(WALLET_ADDRESS, chain.router);
    if (usdcAllowance < usdcBalance) {
      console.log(`   🔓 Approving USDC...`);
      const approveUsdcTx = await usdc.approve(chain.router, ethers.MaxUint256, { gasLimit: 60000 });
      await approveUsdcTx.wait(1);
    }
    
    // 6. SWAP 2: USDC → WETH
    console.log(`   🔄 SWAP 2: USDC → WETH (${opp.fee2/100}%)...`);
    const minWeth = (wethOut * BigInt(10000 - CONFIG.MAX_SLIPPAGE_BPS)) / 10000n;
    
    const swap2Tx = await router.exactInputSingle({
      tokenIn: chain.tokens.USDC,
      tokenOut: chain.tokens.WETH,
      fee: opp.fee2,
      recipient: WALLET_ADDRESS,
      amountIn: usdcBalance,
      amountOutMinimum: minWeth,
      sqrtPriceLimitX96: 0n
    }, { gasLimit: 350000 });
    
    const receipt2 = await swap2Tx.wait(1);
    console.log(`   ✅ SWAP 2 completado: ${receipt2.hash.slice(0, 16)}...`);
    
    // 7. Calcular profit
    const finalWeth = await weth.balanceOf(WALLET_ADDRESS);
    const actualProfit = finalWeth - amountIn;
    const actualProfitUsd = parseFloat(ethers.formatEther(actualProfit)) * opp.ethPrice;
    
    const gas1 = receipt1.gasUsed * receipt1.gasPrice;
    const gas2 = receipt2.gasUsed * receipt2.gasPrice;
    const totalGasUsd = parseFloat(ethers.formatEther(gas1 + gas2)) * opp.ethPrice;
    
    const netProfitUsd = actualProfitUsd - totalGasUsd;
    const executionTime = Date.now() - startTime;
    
    console.log(`   ═══════════════════════════════════════════════════════════════`);
    console.log(`   💰 PROFIT BRUTO: $${actualProfitUsd.toFixed(4)}`);
    console.log(`   ⛽ GAS TOTAL: $${totalGasUsd.toFixed(4)}`);
    console.log(`   💵 PROFIT NETO: $${netProfitUsd.toFixed(4)}`);
    console.log(`   ⏱️  Tiempo: ${executionTime}ms`);
    console.log(`   🔗 ${chain.explorer}/tx/${receipt2.hash}`);
    console.log(`   ═══════════════════════════════════════════════════════════════\n`);
    
    isExecuting = false;
    return {
      success: true,
      profitUsd: actualProfitUsd,
      gasUsd: totalGasUsd,
      netProfitUsd,
      txHash: receipt2.hash,
      executionTimeMs: executionTime
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
  
  // Rotar entre chains activas
  const activeChains = state.chains.filter(c => c.connected && c.isActive);
  if (activeChains.length === 0) {
    console.log('[TICK] No hay chains activas');
    return;
  }
  
  const selectedChain = activeChains[currentChainIndex % activeChains.length].chain;
  currentChainIndex++;
  
  state.stats.currentChain = selectedChain;
  state.banditStates.forEach(b => b.selected = b.chain === selectedChain);
  
  try {
    const opportunities = await scanChain(selectedChain);
    const scanTime = Date.now() - tickStart;
    
    scanTimes.push(scanTime);
    if (scanTimes.length > 20) scanTimes.shift();
    state.stats.avgScanTimeMs = Math.round(scanTimes.reduce((a, b) => a + b, 0) / scanTimes.length);
    state.stats.scansPerSecond = state.stats.avgScanTimeMs > 0 ? Math.round(1000 / state.stats.avgScanTimeMs * 10) / 10 : 0;
    
    // Guardar TODAS las oportunidades para mostrar en UI
    state.opportunities = [...opportunities.slice(0, 10), ...state.opportunities].slice(0, 30);
    
    // Filtrar solo las rentables
    const profitableOpps = opportunities.filter(o => o.profitable);
    
    if (profitableOpps.length > 0) {
      state.stats.opportunitiesFound += profitableOpps.length;
      profitableOpps.sort((a, b) => b.netProfitUsd - a.netProfitUsd);
      
      const best = profitableOpps[0];
      state.stats.lastOpportunity = best;
      
      console.log(`\n[SCAN #${state.stats.totalScans}] ${CHAINS[selectedChain].name} | ${scanTime}ms`);
      console.log(`   🎯 ${profitableOpps.length} OPORTUNIDADES RENTABLES!`);
      console.log(`   💰 MEJOR: ${best.route} | $${best.netProfitUsd.toFixed(4)}`);
      
      // EJECUTAR si no es dry run
      if (!state.isDryRun && CONFIG.AUTO_EXECUTE) {
        state.stats.tradesAttempted++;
        
        const result = await executeTrade(best);
        
        if (result) {
          state.stats.tradesExecuted++;
          
          const tradeLog = {
            id: `tx-${Date.now()}`,
            timestamp: Date.now(),
            chain: best.chain,
            chainName: best.chainName,
            strategy: best.strategy,
            route: best.route,
            amountIn: best.amountInEth,
            spreadBps: best.spreadBps,
            expectedProfit: best.netProfitUsd.toFixed(4),
            actualProfit: result.success ? result.profitUsd.toFixed(4) : '0',
            gasCost: result.success ? result.gasUsd.toFixed(4) : '0',
            netProfit: result.success ? result.netProfitUsd.toFixed(4) : '0',
            txHash: result.txHash || '',
            status: result.success ? 'success' : 'failed',
            error: result.error || '',
            executionTimeMs: result.executionTimeMs || 0
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
            }
          }
          
          state.stats.winRate = state.stats.tradesExecuted > 0
            ? (state.stats.tradesSuccessful / state.stats.tradesExecuted) * 100
            : 0;
        }
      }
    } else {
      // Log cada 10 scans
      if (state.stats.totalScans % 10 === 0) {
        const bestOpp = opportunities.length > 0 ? opportunities.sort((a, b) => b.netProfitUsd - a.netProfitUsd)[0] : null;
        console.log(`[SCAN #${state.stats.totalScans}] ${CHAINS[selectedChain].name} | ${scanTime}ms | Best spread: ${bestOpp ? bestOpp.spreadBps + ' bps ($' + bestOpp.netProfitUsd.toFixed(4) + ')' : 'N/A'}`);
      }
    }
    
    // Actualizar balances cada 30 scans
    if (state.stats.totalScans % 30 === 0) {
      for (const chainState of state.chains) {
        if (!chainState.connected) continue;
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
    console.error(`[TICK] Error: ${e.message}`);
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// API
// ═══════════════════════════════════════════════════════════════════════════════

app.get('/api/defi/multichain-arb/status', (req, res) => {
  // Convertir BigInt a string para JSON
  const safeState = JSON.parse(JSON.stringify(state, (key, value) =>
    typeof value === 'bigint' ? value.toString() : value
  ));
  res.json(safeState);
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
  
  console.log(`\n[START] 🔥 SCALPER 3 CHAINS - ${state.isDryRun ? 'DRY RUN' : '⚠️ MODO REAL - EJECUTANDO TRADES'}`);
  console.log(`[CONFIG] Min Profit: $${CONFIG.MIN_PROFIT_USD} | Auto Execute: ${CONFIG.AUTO_EXECUTE}`);
  console.log(`[CHAINS] ${state.chains.filter(c => c.connected).map(c => c.name).join(', ')}\n`);
  
  res.json({
    success: true,
    isRunning: true,
    isDryRun: state.isDryRun,
    mode: 'SCALPER_3CHAINS',
    config: CONFIG,
    connectedChains: state.chains.filter(c => c.connected).map(c => c.name)
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
    mode: 'SCALPER_3CHAINS',
    port: PORT,
    running: state.isRunning,
    dryRun: state.isDryRun,
    wallet: WALLET_ADDRESS,
    chains: state.chains.map(c => ({ name: c.name, connected: c.connected, balance: c.balance })),
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
║   🔥 SCALPER 3 CHAINS - BASE + ARBITRUM + OPTIMISM                            ║
║                                                                               ║
║   ✅ Puerto: ${PORT}                                                           ║
║   ✅ Wallet: ${WALLET_ADDRESS.slice(0, 10)}...${WALLET_ADDRESS.slice(-5)}                                  ║
║                                                                               ║
║   ⚡ Intervalo: ${CONFIG.SCAN_INTERVAL_MS}ms | Min Profit: $${CONFIG.MIN_PROFIT_USD}                           ║
║   ⚡ Auto Execute: ${CONFIG.AUTO_EXECUTE}                                                   ║
║                                                                               ║
║   ⚠️  MODO REAL - Ejecutará trades automáticamente                            ║
║                                                                               ║
╚═══════════════════════════════════════════════════════════════════════════════╝
  `);
  
  await init();
  console.log('[READY] 🔥 POST /api/defi/multichain-arb/start para iniciar.\n');
});

process.on('SIGINT', () => {
  if (timer) clearInterval(timer);
  process.exit(0);
});


 * 🔥 SCALPER 3 CHAINS - BASE + ARBITRUM + OPTIMISM
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * Bot optimizado para 3 chains con:
 * - RPCs alternativos para Optimism
 * - Ejecución automática agresiva
 * - Umbral de profit muy bajo
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
  SCAN_INTERVAL_MS: 500,
  MIN_PROFIT_USD: 0.001,          // Muy bajo para capturar más
  MAX_SLIPPAGE_BPS: 100,          // 1%
  AUTO_EXECUTE: true,
  ETH_PRICE_USD: 3500,
  TRADE_AMOUNTS: [0.005, 0.01, 0.02],
  FEE_TIERS: [500, 3000]          // 0.05% y 0.3%
};

const PRIVATE_KEY = process.env.VITE_ETH_PRIVATE_KEY;
const WALLET_ADDRESS = process.env.VITE_ETH_WALLET_ADDRESS;

if (!PRIVATE_KEY || !WALLET_ADDRESS) {
  console.error('❌ ERROR: Credenciales no configuradas');
  process.exit(1);
}

// ═══════════════════════════════════════════════════════════════════════════════
// 3 CHAINS CON RPCs MÚLTIPLES
// ═══════════════════════════════════════════════════════════════════════════════

const CHAINS = {
  base: {
    name: 'Base',
    chainId: 8453,
    rpcs: [
      'https://base-mainnet.g.alchemy.com/v2/mm-9UjI5oG51l94mRH3fh',
      'https://mainnet.base.org',
      'https://base.llamarpc.com'
    ],
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
    rpcs: [
      'https://arb1.arbitrum.io/rpc',
      'https://arbitrum.llamarpc.com',
      'https://rpc.ankr.com/arbitrum'
    ],
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
    rpcs: [
      'https://optimism.llamarpc.com',
      'https://rpc.ankr.com/optimism',
      'https://optimism-mainnet.public.blastapi.io',
      'https://1rpc.io/op'
    ],
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
  mode: 'SCALPER_3CHAINS',
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
// CONECTAR CON FALLBACK DE RPCs
// ═══════════════════════════════════════════════════════════════════════════════

async function connectWithFallback(chainKey) {
  const chain = CHAINS[chainKey];
  
  for (const rpc of chain.rpcs) {
    try {
      const provider = new ethers.JsonRpcProvider(rpc);
      // Test connection
      await provider.getBlockNumber();
      console.log(`   ✅ ${chain.name}: Conectado a ${rpc.split('/')[2]}`);
      return provider;
    } catch (e) {
      console.log(`   ⚠️ ${chain.name}: RPC ${rpc.split('/')[2]} falló, probando siguiente...`);
    }
  }
  
  throw new Error(`No se pudo conectar a ${chain.name}`);
}

async function init() {
  console.log('[INIT] 🔌 Conectando a 3 chains...\n');
  
  for (const [chainKey, chain] of Object.entries(CHAINS)) {
    try {
      const provider = await connectWithFallback(chainKey);
      providers[chainKey] = provider;
      signers[chainKey] = new ethers.Wallet(PRIVATE_KEY, provider);
      
      contracts[chainKey] = {
        quoter: new ethers.Contract(chain.quoter, QUOTER_ABI, provider),
        router: new ethers.Contract(chain.router, ROUTER_ABI, signers[chainKey]),
        weth: new ethers.Contract(chain.tokens.WETH, WETH_ABI, signers[chainKey])
      };
      
      const balance = await provider.getBalance(WALLET_ADDRESS);
      const balanceEth = parseFloat(ethers.formatEther(balance));
      
      state.chains.push({
        chain: chainKey,
        name: chain.name,
        chainId: chain.chainId,
        balance: balanceEth.toFixed(6),
        balanceUsd: balanceEth * CONFIG.ETH_PRICE_USD,
        routes: CONFIG.FEE_TIERS.length * CONFIG.TRADE_AMOUNTS.length,
        isActive: balanceEth > 0.001,
        lastScan: Date.now(),
        explorer: chain.explorer,
        ethPrice: 0,
        connected: true
      });
      
      state.banditStates.push({
        chain: chainKey,
        alpha: 2,
        beta: 2,
        winRate: 50,
        selected: chainKey === 'base',
        attempts: 0,
        wins: 0
      });
      
      console.log(`   💰 ${chain.name}: ${balanceEth.toFixed(6)} ETH ($${(balanceEth * CONFIG.ETH_PRICE_USD).toFixed(2)})`);
    } catch (e) {
      console.error(`   ❌ ${chain.name}: ${e.message}`);
      state.chains.push({
        chain: chainKey,
        name: chain.name,
        chainId: chain.chainId,
        balance: '0',
        balanceUsd: 0,
        routes: 0,
        isActive: false,
        lastScan: Date.now(),
        explorer: chain.explorer,
        ethPrice: 0,
        connected: false,
        error: e.message
      });
    }
  }
  console.log('');
}

// ═══════════════════════════════════════════════════════════════════════════════
// ESCANEO SIMPLE Y RÁPIDO
// ═══════════════════════════════════════════════════════════════════════════════

async function scanChain(chainKey) {
  const chain = CHAINS[chainKey];
  const provider = providers[chainKey];
  const quoter = contracts[chainKey]?.quoter;
  
  if (!quoter) return [];
  
  const opportunities = [];
  
  try {
    // Gas price
    const feeData = await provider.getFeeData();
    const gasPrice = feeData.gasPrice || ethers.parseUnits('0.01', 'gwei');
    const gasCostWei = gasPrice * 300000n;
    const gasCostUsd = parseFloat(ethers.formatEther(gasCostWei)) * CONFIG.ETH_PRICE_USD;
    
    // Precio ETH
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
    
    // Escanear rutas
    for (const amountEth of CONFIG.TRADE_AMOUNTS) {
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
            const spreadBps = Number((grossProfit * 10000n) / amountWei);
            
            // Registrar TODAS las oportunidades (incluso negativas) para mostrar en UI
            const netProfitUsd = parseFloat(ethers.formatEther(netProfit)) * ethPrice;
            
            opportunities.push({
              chain: chainKey,
              chainName: chain.name,
              strategy: 'FEE_TIER_ARB',
              route: `${CONFIG.FEE_TIERS[i]/100}%→${CONFIG.FEE_TIERS[j]/100}%`,
              amountIn: amountWei.toString(),
              amountInEth: amountEth,
              fee1: CONFIG.FEE_TIERS[i],
              fee2: CONFIG.FEE_TIERS[j],
              usdcIntermediate: usdcOut.toString(),
              wethOut: wethOut.toString(),
              spreadBps,
              netProfitUsd,
              gasCostUsd,
              ethPrice,
              profitable: netProfitUsd >= CONFIG.MIN_PROFIT_USD,
              timestamp: Date.now(),
              // Guardar BigInt originales para ejecución
              _amountInWei: amountWei,
              _usdcOut: usdcOut,
              _wethOut: wethOut
            });
            
          } catch (e) {
            // Pool no existe
          }
        }
      }
    }
    
  } catch (e) {
    console.error(`[SCAN] Error ${chain.name}: ${e.message.slice(0, 50)}`);
  }
  
  return opportunities;
}

// ═══════════════════════════════════════════════════════════════════════════════
// EJECUCIÓN DE TRADE
// ═══════════════════════════════════════════════════════════════════════════════

async function executeTrade(opp) {
  if (isExecuting) return null;
  isExecuting = true;
  
  const chain = CHAINS[opp.chain];
  const signer = signers[opp.chain];
  const provider = providers[opp.chain];
  const { router, weth } = contracts[opp.chain];
  
  // Usar BigInt originales o convertir de string
  const amountIn = opp._amountInWei || BigInt(opp.amountIn);
  const usdcIntermediate = opp._usdcOut || BigInt(opp.usdcIntermediate);
  const wethOut = opp._wethOut || BigInt(opp.wethOut);
  
  console.log(`\n🔥 ═══════════════════════════════════════════════════════════════`);
  console.log(`   EJECUTANDO TRADE EN ${chain.name.toUpperCase()}`);
  console.log(`   Route: ${opp.route}`);
  console.log(`   Amount: ${opp.amountInEth} ETH`);
  console.log(`   Expected: $${opp.netProfitUsd.toFixed(4)}`);
  
  const startTime = Date.now();
  
  try {
    // Verificar balance
    const balance = await provider.getBalance(WALLET_ADDRESS);
    if (balance < amountIn + ethers.parseEther('0.002')) {
      console.log(`   ❌ Balance insuficiente en ${chain.name}`);
      isExecuting = false;
      return { success: false, error: 'Balance insuficiente' };
    }
    
    // 1. Wrap ETH
    console.log(`   📦 Wrapping ETH...`);
    const wrapTx = await weth.deposit({ value: amountIn, gasLimit: 60000 });
    await wrapTx.wait(1);
    console.log(`   ✅ Wrapped`);
    
    // 2. Approve WETH
    const allowance = await weth.allowance(WALLET_ADDRESS, chain.router);
    if (allowance < amountIn) {
      console.log(`   🔓 Approving WETH...`);
      const approveTx = await weth.approve(chain.router, ethers.MaxUint256, { gasLimit: 60000 });
      await approveTx.wait(1);
    }
    
    // 3. SWAP 1: WETH → USDC
    console.log(`   🔄 SWAP 1: WETH → USDC (${opp.fee1/100}%)...`);
    const minUsdc = (usdcIntermediate * BigInt(10000 - CONFIG.MAX_SLIPPAGE_BPS)) / 10000n;
    
    const swap1Tx = await router.exactInputSingle({
      tokenIn: chain.tokens.WETH,
      tokenOut: chain.tokens.USDC,
      fee: opp.fee1,
      recipient: WALLET_ADDRESS,
      amountIn: amountIn,
      amountOutMinimum: minUsdc,
      sqrtPriceLimitX96: 0n
    }, { gasLimit: 350000 });
    
    const receipt1 = await swap1Tx.wait(1);
    console.log(`   ✅ SWAP 1 completado: ${receipt1.hash.slice(0, 16)}...`);
    
    // 4. Obtener balance USDC
    const usdc = new ethers.Contract(chain.tokens.USDC, ERC20_ABI, signer);
    const usdcBalance = await usdc.balanceOf(WALLET_ADDRESS);
    console.log(`   💵 USDC recibido: ${ethers.formatUnits(usdcBalance, 6)}`);
    
    // 5. Approve USDC
    const usdcAllowance = await usdc.allowance(WALLET_ADDRESS, chain.router);
    if (usdcAllowance < usdcBalance) {
      console.log(`   🔓 Approving USDC...`);
      const approveUsdcTx = await usdc.approve(chain.router, ethers.MaxUint256, { gasLimit: 60000 });
      await approveUsdcTx.wait(1);
    }
    
    // 6. SWAP 2: USDC → WETH
    console.log(`   🔄 SWAP 2: USDC → WETH (${opp.fee2/100}%)...`);
    const minWeth = (wethOut * BigInt(10000 - CONFIG.MAX_SLIPPAGE_BPS)) / 10000n;
    
    const swap2Tx = await router.exactInputSingle({
      tokenIn: chain.tokens.USDC,
      tokenOut: chain.tokens.WETH,
      fee: opp.fee2,
      recipient: WALLET_ADDRESS,
      amountIn: usdcBalance,
      amountOutMinimum: minWeth,
      sqrtPriceLimitX96: 0n
    }, { gasLimit: 350000 });
    
    const receipt2 = await swap2Tx.wait(1);
    console.log(`   ✅ SWAP 2 completado: ${receipt2.hash.slice(0, 16)}...`);
    
    // 7. Calcular profit
    const finalWeth = await weth.balanceOf(WALLET_ADDRESS);
    const actualProfit = finalWeth - amountIn;
    const actualProfitUsd = parseFloat(ethers.formatEther(actualProfit)) * opp.ethPrice;
    
    const gas1 = receipt1.gasUsed * receipt1.gasPrice;
    const gas2 = receipt2.gasUsed * receipt2.gasPrice;
    const totalGasUsd = parseFloat(ethers.formatEther(gas1 + gas2)) * opp.ethPrice;
    
    const netProfitUsd = actualProfitUsd - totalGasUsd;
    const executionTime = Date.now() - startTime;
    
    console.log(`   ═══════════════════════════════════════════════════════════════`);
    console.log(`   💰 PROFIT BRUTO: $${actualProfitUsd.toFixed(4)}`);
    console.log(`   ⛽ GAS TOTAL: $${totalGasUsd.toFixed(4)}`);
    console.log(`   💵 PROFIT NETO: $${netProfitUsd.toFixed(4)}`);
    console.log(`   ⏱️  Tiempo: ${executionTime}ms`);
    console.log(`   🔗 ${chain.explorer}/tx/${receipt2.hash}`);
    console.log(`   ═══════════════════════════════════════════════════════════════\n`);
    
    isExecuting = false;
    return {
      success: true,
      profitUsd: actualProfitUsd,
      gasUsd: totalGasUsd,
      netProfitUsd,
      txHash: receipt2.hash,
      executionTimeMs: executionTime
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
  
  // Rotar entre chains activas
  const activeChains = state.chains.filter(c => c.connected && c.isActive);
  if (activeChains.length === 0) {
    console.log('[TICK] No hay chains activas');
    return;
  }
  
  const selectedChain = activeChains[currentChainIndex % activeChains.length].chain;
  currentChainIndex++;
  
  state.stats.currentChain = selectedChain;
  state.banditStates.forEach(b => b.selected = b.chain === selectedChain);
  
  try {
    const opportunities = await scanChain(selectedChain);
    const scanTime = Date.now() - tickStart;
    
    scanTimes.push(scanTime);
    if (scanTimes.length > 20) scanTimes.shift();
    state.stats.avgScanTimeMs = Math.round(scanTimes.reduce((a, b) => a + b, 0) / scanTimes.length);
    state.stats.scansPerSecond = state.stats.avgScanTimeMs > 0 ? Math.round(1000 / state.stats.avgScanTimeMs * 10) / 10 : 0;
    
    // Guardar TODAS las oportunidades para mostrar en UI
    state.opportunities = [...opportunities.slice(0, 10), ...state.opportunities].slice(0, 30);
    
    // Filtrar solo las rentables
    const profitableOpps = opportunities.filter(o => o.profitable);
    
    if (profitableOpps.length > 0) {
      state.stats.opportunitiesFound += profitableOpps.length;
      profitableOpps.sort((a, b) => b.netProfitUsd - a.netProfitUsd);
      
      const best = profitableOpps[0];
      state.stats.lastOpportunity = best;
      
      console.log(`\n[SCAN #${state.stats.totalScans}] ${CHAINS[selectedChain].name} | ${scanTime}ms`);
      console.log(`   🎯 ${profitableOpps.length} OPORTUNIDADES RENTABLES!`);
      console.log(`   💰 MEJOR: ${best.route} | $${best.netProfitUsd.toFixed(4)}`);
      
      // EJECUTAR si no es dry run
      if (!state.isDryRun && CONFIG.AUTO_EXECUTE) {
        state.stats.tradesAttempted++;
        
        const result = await executeTrade(best);
        
        if (result) {
          state.stats.tradesExecuted++;
          
          const tradeLog = {
            id: `tx-${Date.now()}`,
            timestamp: Date.now(),
            chain: best.chain,
            chainName: best.chainName,
            strategy: best.strategy,
            route: best.route,
            amountIn: best.amountInEth,
            spreadBps: best.spreadBps,
            expectedProfit: best.netProfitUsd.toFixed(4),
            actualProfit: result.success ? result.profitUsd.toFixed(4) : '0',
            gasCost: result.success ? result.gasUsd.toFixed(4) : '0',
            netProfit: result.success ? result.netProfitUsd.toFixed(4) : '0',
            txHash: result.txHash || '',
            status: result.success ? 'success' : 'failed',
            error: result.error || '',
            executionTimeMs: result.executionTimeMs || 0
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
            }
          }
          
          state.stats.winRate = state.stats.tradesExecuted > 0
            ? (state.stats.tradesSuccessful / state.stats.tradesExecuted) * 100
            : 0;
        }
      }
    } else {
      // Log cada 10 scans
      if (state.stats.totalScans % 10 === 0) {
        const bestOpp = opportunities.length > 0 ? opportunities.sort((a, b) => b.netProfitUsd - a.netProfitUsd)[0] : null;
        console.log(`[SCAN #${state.stats.totalScans}] ${CHAINS[selectedChain].name} | ${scanTime}ms | Best spread: ${bestOpp ? bestOpp.spreadBps + ' bps ($' + bestOpp.netProfitUsd.toFixed(4) + ')' : 'N/A'}`);
      }
    }
    
    // Actualizar balances cada 30 scans
    if (state.stats.totalScans % 30 === 0) {
      for (const chainState of state.chains) {
        if (!chainState.connected) continue;
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
    console.error(`[TICK] Error: ${e.message}`);
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// API
// ═══════════════════════════════════════════════════════════════════════════════

app.get('/api/defi/multichain-arb/status', (req, res) => {
  // Convertir BigInt a string para JSON
  const safeState = JSON.parse(JSON.stringify(state, (key, value) =>
    typeof value === 'bigint' ? value.toString() : value
  ));
  res.json(safeState);
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
  
  console.log(`\n[START] 🔥 SCALPER 3 CHAINS - ${state.isDryRun ? 'DRY RUN' : '⚠️ MODO REAL - EJECUTANDO TRADES'}`);
  console.log(`[CONFIG] Min Profit: $${CONFIG.MIN_PROFIT_USD} | Auto Execute: ${CONFIG.AUTO_EXECUTE}`);
  console.log(`[CHAINS] ${state.chains.filter(c => c.connected).map(c => c.name).join(', ')}\n`);
  
  res.json({
    success: true,
    isRunning: true,
    isDryRun: state.isDryRun,
    mode: 'SCALPER_3CHAINS',
    config: CONFIG,
    connectedChains: state.chains.filter(c => c.connected).map(c => c.name)
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
    mode: 'SCALPER_3CHAINS',
    port: PORT,
    running: state.isRunning,
    dryRun: state.isDryRun,
    wallet: WALLET_ADDRESS,
    chains: state.chains.map(c => ({ name: c.name, connected: c.connected, balance: c.balance })),
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
║   🔥 SCALPER 3 CHAINS - BASE + ARBITRUM + OPTIMISM                            ║
║                                                                               ║
║   ✅ Puerto: ${PORT}                                                           ║
║   ✅ Wallet: ${WALLET_ADDRESS.slice(0, 10)}...${WALLET_ADDRESS.slice(-5)}                                  ║
║                                                                               ║
║   ⚡ Intervalo: ${CONFIG.SCAN_INTERVAL_MS}ms | Min Profit: $${CONFIG.MIN_PROFIT_USD}                           ║
║   ⚡ Auto Execute: ${CONFIG.AUTO_EXECUTE}                                                   ║
║                                                                               ║
║   ⚠️  MODO REAL - Ejecutará trades automáticamente                            ║
║                                                                               ║
╚═══════════════════════════════════════════════════════════════════════════════╝
  `);
  
  await init();
  console.log('[READY] 🔥 POST /api/defi/multichain-arb/start para iniciar.\n');
});

process.on('SIGINT', () => {
  if (timer) clearInterval(timer);
  process.exit(0);
});


 * 🔥 SCALPER 3 CHAINS - BASE + ARBITRUM + OPTIMISM
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * Bot optimizado para 3 chains con:
 * - RPCs alternativos para Optimism
 * - Ejecución automática agresiva
 * - Umbral de profit muy bajo
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
  SCAN_INTERVAL_MS: 500,
  MIN_PROFIT_USD: 0.001,          // Muy bajo para capturar más
  MAX_SLIPPAGE_BPS: 100,          // 1%
  AUTO_EXECUTE: true,
  ETH_PRICE_USD: 3500,
  TRADE_AMOUNTS: [0.005, 0.01, 0.02],
  FEE_TIERS: [500, 3000]          // 0.05% y 0.3%
};

const PRIVATE_KEY = process.env.VITE_ETH_PRIVATE_KEY;
const WALLET_ADDRESS = process.env.VITE_ETH_WALLET_ADDRESS;

if (!PRIVATE_KEY || !WALLET_ADDRESS) {
  console.error('❌ ERROR: Credenciales no configuradas');
  process.exit(1);
}

// ═══════════════════════════════════════════════════════════════════════════════
// 3 CHAINS CON RPCs MÚLTIPLES
// ═══════════════════════════════════════════════════════════════════════════════

const CHAINS = {
  base: {
    name: 'Base',
    chainId: 8453,
    rpcs: [
      'https://base-mainnet.g.alchemy.com/v2/mm-9UjI5oG51l94mRH3fh',
      'https://mainnet.base.org',
      'https://base.llamarpc.com'
    ],
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
    rpcs: [
      'https://arb1.arbitrum.io/rpc',
      'https://arbitrum.llamarpc.com',
      'https://rpc.ankr.com/arbitrum'
    ],
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
    rpcs: [
      'https://optimism.llamarpc.com',
      'https://rpc.ankr.com/optimism',
      'https://optimism-mainnet.public.blastapi.io',
      'https://1rpc.io/op'
    ],
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
  mode: 'SCALPER_3CHAINS',
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
// CONECTAR CON FALLBACK DE RPCs
// ═══════════════════════════════════════════════════════════════════════════════

async function connectWithFallback(chainKey) {
  const chain = CHAINS[chainKey];
  
  for (const rpc of chain.rpcs) {
    try {
      const provider = new ethers.JsonRpcProvider(rpc);
      // Test connection
      await provider.getBlockNumber();
      console.log(`   ✅ ${chain.name}: Conectado a ${rpc.split('/')[2]}`);
      return provider;
    } catch (e) {
      console.log(`   ⚠️ ${chain.name}: RPC ${rpc.split('/')[2]} falló, probando siguiente...`);
    }
  }
  
  throw new Error(`No se pudo conectar a ${chain.name}`);
}

async function init() {
  console.log('[INIT] 🔌 Conectando a 3 chains...\n');
  
  for (const [chainKey, chain] of Object.entries(CHAINS)) {
    try {
      const provider = await connectWithFallback(chainKey);
      providers[chainKey] = provider;
      signers[chainKey] = new ethers.Wallet(PRIVATE_KEY, provider);
      
      contracts[chainKey] = {
        quoter: new ethers.Contract(chain.quoter, QUOTER_ABI, provider),
        router: new ethers.Contract(chain.router, ROUTER_ABI, signers[chainKey]),
        weth: new ethers.Contract(chain.tokens.WETH, WETH_ABI, signers[chainKey])
      };
      
      const balance = await provider.getBalance(WALLET_ADDRESS);
      const balanceEth = parseFloat(ethers.formatEther(balance));
      
      state.chains.push({
        chain: chainKey,
        name: chain.name,
        chainId: chain.chainId,
        balance: balanceEth.toFixed(6),
        balanceUsd: balanceEth * CONFIG.ETH_PRICE_USD,
        routes: CONFIG.FEE_TIERS.length * CONFIG.TRADE_AMOUNTS.length,
        isActive: balanceEth > 0.001,
        lastScan: Date.now(),
        explorer: chain.explorer,
        ethPrice: 0,
        connected: true
      });
      
      state.banditStates.push({
        chain: chainKey,
        alpha: 2,
        beta: 2,
        winRate: 50,
        selected: chainKey === 'base',
        attempts: 0,
        wins: 0
      });
      
      console.log(`   💰 ${chain.name}: ${balanceEth.toFixed(6)} ETH ($${(balanceEth * CONFIG.ETH_PRICE_USD).toFixed(2)})`);
    } catch (e) {
      console.error(`   ❌ ${chain.name}: ${e.message}`);
      state.chains.push({
        chain: chainKey,
        name: chain.name,
        chainId: chain.chainId,
        balance: '0',
        balanceUsd: 0,
        routes: 0,
        isActive: false,
        lastScan: Date.now(),
        explorer: chain.explorer,
        ethPrice: 0,
        connected: false,
        error: e.message
      });
    }
  }
  console.log('');
}

// ═══════════════════════════════════════════════════════════════════════════════
// ESCANEO SIMPLE Y RÁPIDO
// ═══════════════════════════════════════════════════════════════════════════════

async function scanChain(chainKey) {
  const chain = CHAINS[chainKey];
  const provider = providers[chainKey];
  const quoter = contracts[chainKey]?.quoter;
  
  if (!quoter) return [];
  
  const opportunities = [];
  
  try {
    // Gas price
    const feeData = await provider.getFeeData();
    const gasPrice = feeData.gasPrice || ethers.parseUnits('0.01', 'gwei');
    const gasCostWei = gasPrice * 300000n;
    const gasCostUsd = parseFloat(ethers.formatEther(gasCostWei)) * CONFIG.ETH_PRICE_USD;
    
    // Precio ETH
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
    
    // Escanear rutas
    for (const amountEth of CONFIG.TRADE_AMOUNTS) {
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
            const spreadBps = Number((grossProfit * 10000n) / amountWei);
            
            // Registrar TODAS las oportunidades (incluso negativas) para mostrar en UI
            const netProfitUsd = parseFloat(ethers.formatEther(netProfit)) * ethPrice;
            
            opportunities.push({
              chain: chainKey,
              chainName: chain.name,
              strategy: 'FEE_TIER_ARB',
              route: `${CONFIG.FEE_TIERS[i]/100}%→${CONFIG.FEE_TIERS[j]/100}%`,
              amountIn: amountWei.toString(),
              amountInEth: amountEth,
              fee1: CONFIG.FEE_TIERS[i],
              fee2: CONFIG.FEE_TIERS[j],
              usdcIntermediate: usdcOut.toString(),
              wethOut: wethOut.toString(),
              spreadBps,
              netProfitUsd,
              gasCostUsd,
              ethPrice,
              profitable: netProfitUsd >= CONFIG.MIN_PROFIT_USD,
              timestamp: Date.now(),
              // Guardar BigInt originales para ejecución
              _amountInWei: amountWei,
              _usdcOut: usdcOut,
              _wethOut: wethOut
            });
            
          } catch (e) {
            // Pool no existe
          }
        }
      }
    }
    
  } catch (e) {
    console.error(`[SCAN] Error ${chain.name}: ${e.message.slice(0, 50)}`);
  }
  
  return opportunities;
}

// ═══════════════════════════════════════════════════════════════════════════════
// EJECUCIÓN DE TRADE
// ═══════════════════════════════════════════════════════════════════════════════

async function executeTrade(opp) {
  if (isExecuting) return null;
  isExecuting = true;
  
  const chain = CHAINS[opp.chain];
  const signer = signers[opp.chain];
  const provider = providers[opp.chain];
  const { router, weth } = contracts[opp.chain];
  
  // Usar BigInt originales o convertir de string
  const amountIn = opp._amountInWei || BigInt(opp.amountIn);
  const usdcIntermediate = opp._usdcOut || BigInt(opp.usdcIntermediate);
  const wethOut = opp._wethOut || BigInt(opp.wethOut);
  
  console.log(`\n🔥 ═══════════════════════════════════════════════════════════════`);
  console.log(`   EJECUTANDO TRADE EN ${chain.name.toUpperCase()}`);
  console.log(`   Route: ${opp.route}`);
  console.log(`   Amount: ${opp.amountInEth} ETH`);
  console.log(`   Expected: $${opp.netProfitUsd.toFixed(4)}`);
  
  const startTime = Date.now();
  
  try {
    // Verificar balance
    const balance = await provider.getBalance(WALLET_ADDRESS);
    if (balance < amountIn + ethers.parseEther('0.002')) {
      console.log(`   ❌ Balance insuficiente en ${chain.name}`);
      isExecuting = false;
      return { success: false, error: 'Balance insuficiente' };
    }
    
    // 1. Wrap ETH
    console.log(`   📦 Wrapping ETH...`);
    const wrapTx = await weth.deposit({ value: amountIn, gasLimit: 60000 });
    await wrapTx.wait(1);
    console.log(`   ✅ Wrapped`);
    
    // 2. Approve WETH
    const allowance = await weth.allowance(WALLET_ADDRESS, chain.router);
    if (allowance < amountIn) {
      console.log(`   🔓 Approving WETH...`);
      const approveTx = await weth.approve(chain.router, ethers.MaxUint256, { gasLimit: 60000 });
      await approveTx.wait(1);
    }
    
    // 3. SWAP 1: WETH → USDC
    console.log(`   🔄 SWAP 1: WETH → USDC (${opp.fee1/100}%)...`);
    const minUsdc = (usdcIntermediate * BigInt(10000 - CONFIG.MAX_SLIPPAGE_BPS)) / 10000n;
    
    const swap1Tx = await router.exactInputSingle({
      tokenIn: chain.tokens.WETH,
      tokenOut: chain.tokens.USDC,
      fee: opp.fee1,
      recipient: WALLET_ADDRESS,
      amountIn: amountIn,
      amountOutMinimum: minUsdc,
      sqrtPriceLimitX96: 0n
    }, { gasLimit: 350000 });
    
    const receipt1 = await swap1Tx.wait(1);
    console.log(`   ✅ SWAP 1 completado: ${receipt1.hash.slice(0, 16)}...`);
    
    // 4. Obtener balance USDC
    const usdc = new ethers.Contract(chain.tokens.USDC, ERC20_ABI, signer);
    const usdcBalance = await usdc.balanceOf(WALLET_ADDRESS);
    console.log(`   💵 USDC recibido: ${ethers.formatUnits(usdcBalance, 6)}`);
    
    // 5. Approve USDC
    const usdcAllowance = await usdc.allowance(WALLET_ADDRESS, chain.router);
    if (usdcAllowance < usdcBalance) {
      console.log(`   🔓 Approving USDC...`);
      const approveUsdcTx = await usdc.approve(chain.router, ethers.MaxUint256, { gasLimit: 60000 });
      await approveUsdcTx.wait(1);
    }
    
    // 6. SWAP 2: USDC → WETH
    console.log(`   🔄 SWAP 2: USDC → WETH (${opp.fee2/100}%)...`);
    const minWeth = (wethOut * BigInt(10000 - CONFIG.MAX_SLIPPAGE_BPS)) / 10000n;
    
    const swap2Tx = await router.exactInputSingle({
      tokenIn: chain.tokens.USDC,
      tokenOut: chain.tokens.WETH,
      fee: opp.fee2,
      recipient: WALLET_ADDRESS,
      amountIn: usdcBalance,
      amountOutMinimum: minWeth,
      sqrtPriceLimitX96: 0n
    }, { gasLimit: 350000 });
    
    const receipt2 = await swap2Tx.wait(1);
    console.log(`   ✅ SWAP 2 completado: ${receipt2.hash.slice(0, 16)}...`);
    
    // 7. Calcular profit
    const finalWeth = await weth.balanceOf(WALLET_ADDRESS);
    const actualProfit = finalWeth - amountIn;
    const actualProfitUsd = parseFloat(ethers.formatEther(actualProfit)) * opp.ethPrice;
    
    const gas1 = receipt1.gasUsed * receipt1.gasPrice;
    const gas2 = receipt2.gasUsed * receipt2.gasPrice;
    const totalGasUsd = parseFloat(ethers.formatEther(gas1 + gas2)) * opp.ethPrice;
    
    const netProfitUsd = actualProfitUsd - totalGasUsd;
    const executionTime = Date.now() - startTime;
    
    console.log(`   ═══════════════════════════════════════════════════════════════`);
    console.log(`   💰 PROFIT BRUTO: $${actualProfitUsd.toFixed(4)}`);
    console.log(`   ⛽ GAS TOTAL: $${totalGasUsd.toFixed(4)}`);
    console.log(`   💵 PROFIT NETO: $${netProfitUsd.toFixed(4)}`);
    console.log(`   ⏱️  Tiempo: ${executionTime}ms`);
    console.log(`   🔗 ${chain.explorer}/tx/${receipt2.hash}`);
    console.log(`   ═══════════════════════════════════════════════════════════════\n`);
    
    isExecuting = false;
    return {
      success: true,
      profitUsd: actualProfitUsd,
      gasUsd: totalGasUsd,
      netProfitUsd,
      txHash: receipt2.hash,
      executionTimeMs: executionTime
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
  
  // Rotar entre chains activas
  const activeChains = state.chains.filter(c => c.connected && c.isActive);
  if (activeChains.length === 0) {
    console.log('[TICK] No hay chains activas');
    return;
  }
  
  const selectedChain = activeChains[currentChainIndex % activeChains.length].chain;
  currentChainIndex++;
  
  state.stats.currentChain = selectedChain;
  state.banditStates.forEach(b => b.selected = b.chain === selectedChain);
  
  try {
    const opportunities = await scanChain(selectedChain);
    const scanTime = Date.now() - tickStart;
    
    scanTimes.push(scanTime);
    if (scanTimes.length > 20) scanTimes.shift();
    state.stats.avgScanTimeMs = Math.round(scanTimes.reduce((a, b) => a + b, 0) / scanTimes.length);
    state.stats.scansPerSecond = state.stats.avgScanTimeMs > 0 ? Math.round(1000 / state.stats.avgScanTimeMs * 10) / 10 : 0;
    
    // Guardar TODAS las oportunidades para mostrar en UI
    state.opportunities = [...opportunities.slice(0, 10), ...state.opportunities].slice(0, 30);
    
    // Filtrar solo las rentables
    const profitableOpps = opportunities.filter(o => o.profitable);
    
    if (profitableOpps.length > 0) {
      state.stats.opportunitiesFound += profitableOpps.length;
      profitableOpps.sort((a, b) => b.netProfitUsd - a.netProfitUsd);
      
      const best = profitableOpps[0];
      state.stats.lastOpportunity = best;
      
      console.log(`\n[SCAN #${state.stats.totalScans}] ${CHAINS[selectedChain].name} | ${scanTime}ms`);
      console.log(`   🎯 ${profitableOpps.length} OPORTUNIDADES RENTABLES!`);
      console.log(`   💰 MEJOR: ${best.route} | $${best.netProfitUsd.toFixed(4)}`);
      
      // EJECUTAR si no es dry run
      if (!state.isDryRun && CONFIG.AUTO_EXECUTE) {
        state.stats.tradesAttempted++;
        
        const result = await executeTrade(best);
        
        if (result) {
          state.stats.tradesExecuted++;
          
          const tradeLog = {
            id: `tx-${Date.now()}`,
            timestamp: Date.now(),
            chain: best.chain,
            chainName: best.chainName,
            strategy: best.strategy,
            route: best.route,
            amountIn: best.amountInEth,
            spreadBps: best.spreadBps,
            expectedProfit: best.netProfitUsd.toFixed(4),
            actualProfit: result.success ? result.profitUsd.toFixed(4) : '0',
            gasCost: result.success ? result.gasUsd.toFixed(4) : '0',
            netProfit: result.success ? result.netProfitUsd.toFixed(4) : '0',
            txHash: result.txHash || '',
            status: result.success ? 'success' : 'failed',
            error: result.error || '',
            executionTimeMs: result.executionTimeMs || 0
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
            }
          }
          
          state.stats.winRate = state.stats.tradesExecuted > 0
            ? (state.stats.tradesSuccessful / state.stats.tradesExecuted) * 100
            : 0;
        }
      }
    } else {
      // Log cada 10 scans
      if (state.stats.totalScans % 10 === 0) {
        const bestOpp = opportunities.length > 0 ? opportunities.sort((a, b) => b.netProfitUsd - a.netProfitUsd)[0] : null;
        console.log(`[SCAN #${state.stats.totalScans}] ${CHAINS[selectedChain].name} | ${scanTime}ms | Best spread: ${bestOpp ? bestOpp.spreadBps + ' bps ($' + bestOpp.netProfitUsd.toFixed(4) + ')' : 'N/A'}`);
      }
    }
    
    // Actualizar balances cada 30 scans
    if (state.stats.totalScans % 30 === 0) {
      for (const chainState of state.chains) {
        if (!chainState.connected) continue;
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
    console.error(`[TICK] Error: ${e.message}`);
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// API
// ═══════════════════════════════════════════════════════════════════════════════

app.get('/api/defi/multichain-arb/status', (req, res) => {
  // Convertir BigInt a string para JSON
  const safeState = JSON.parse(JSON.stringify(state, (key, value) =>
    typeof value === 'bigint' ? value.toString() : value
  ));
  res.json(safeState);
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
  
  console.log(`\n[START] 🔥 SCALPER 3 CHAINS - ${state.isDryRun ? 'DRY RUN' : '⚠️ MODO REAL - EJECUTANDO TRADES'}`);
  console.log(`[CONFIG] Min Profit: $${CONFIG.MIN_PROFIT_USD} | Auto Execute: ${CONFIG.AUTO_EXECUTE}`);
  console.log(`[CHAINS] ${state.chains.filter(c => c.connected).map(c => c.name).join(', ')}\n`);
  
  res.json({
    success: true,
    isRunning: true,
    isDryRun: state.isDryRun,
    mode: 'SCALPER_3CHAINS',
    config: CONFIG,
    connectedChains: state.chains.filter(c => c.connected).map(c => c.name)
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
    mode: 'SCALPER_3CHAINS',
    port: PORT,
    running: state.isRunning,
    dryRun: state.isDryRun,
    wallet: WALLET_ADDRESS,
    chains: state.chains.map(c => ({ name: c.name, connected: c.connected, balance: c.balance })),
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
║   🔥 SCALPER 3 CHAINS - BASE + ARBITRUM + OPTIMISM                            ║
║                                                                               ║
║   ✅ Puerto: ${PORT}                                                           ║
║   ✅ Wallet: ${WALLET_ADDRESS.slice(0, 10)}...${WALLET_ADDRESS.slice(-5)}                                  ║
║                                                                               ║
║   ⚡ Intervalo: ${CONFIG.SCAN_INTERVAL_MS}ms | Min Profit: $${CONFIG.MIN_PROFIT_USD}                           ║
║   ⚡ Auto Execute: ${CONFIG.AUTO_EXECUTE}                                                   ║
║                                                                               ║
║   ⚠️  MODO REAL - Ejecutará trades automáticamente                            ║
║                                                                               ║
╚═══════════════════════════════════════════════════════════════════════════════╝
  `);
  
  await init();
  console.log('[READY] 🔥 POST /api/defi/multichain-arb/start para iniciar.\n');
});

process.on('SIGINT', () => {
  if (timer) clearInterval(timer);
  process.exit(0);
});


 * 🔥 SCALPER 3 CHAINS - BASE + ARBITRUM + OPTIMISM
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * Bot optimizado para 3 chains con:
 * - RPCs alternativos para Optimism
 * - Ejecución automática agresiva
 * - Umbral de profit muy bajo
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
  SCAN_INTERVAL_MS: 500,
  MIN_PROFIT_USD: 0.001,          // Muy bajo para capturar más
  MAX_SLIPPAGE_BPS: 100,          // 1%
  AUTO_EXECUTE: true,
  ETH_PRICE_USD: 3500,
  TRADE_AMOUNTS: [0.005, 0.01, 0.02],
  FEE_TIERS: [500, 3000]          // 0.05% y 0.3%
};

const PRIVATE_KEY = process.env.VITE_ETH_PRIVATE_KEY;
const WALLET_ADDRESS = process.env.VITE_ETH_WALLET_ADDRESS;

if (!PRIVATE_KEY || !WALLET_ADDRESS) {
  console.error('❌ ERROR: Credenciales no configuradas');
  process.exit(1);
}

// ═══════════════════════════════════════════════════════════════════════════════
// 3 CHAINS CON RPCs MÚLTIPLES
// ═══════════════════════════════════════════════════════════════════════════════

const CHAINS = {
  base: {
    name: 'Base',
    chainId: 8453,
    rpcs: [
      'https://base-mainnet.g.alchemy.com/v2/mm-9UjI5oG51l94mRH3fh',
      'https://mainnet.base.org',
      'https://base.llamarpc.com'
    ],
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
    rpcs: [
      'https://arb1.arbitrum.io/rpc',
      'https://arbitrum.llamarpc.com',
      'https://rpc.ankr.com/arbitrum'
    ],
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
    rpcs: [
      'https://optimism.llamarpc.com',
      'https://rpc.ankr.com/optimism',
      'https://optimism-mainnet.public.blastapi.io',
      'https://1rpc.io/op'
    ],
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
  mode: 'SCALPER_3CHAINS',
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
// CONECTAR CON FALLBACK DE RPCs
// ═══════════════════════════════════════════════════════════════════════════════

async function connectWithFallback(chainKey) {
  const chain = CHAINS[chainKey];
  
  for (const rpc of chain.rpcs) {
    try {
      const provider = new ethers.JsonRpcProvider(rpc);
      // Test connection
      await provider.getBlockNumber();
      console.log(`   ✅ ${chain.name}: Conectado a ${rpc.split('/')[2]}`);
      return provider;
    } catch (e) {
      console.log(`   ⚠️ ${chain.name}: RPC ${rpc.split('/')[2]} falló, probando siguiente...`);
    }
  }
  
  throw new Error(`No se pudo conectar a ${chain.name}`);
}

async function init() {
  console.log('[INIT] 🔌 Conectando a 3 chains...\n');
  
  for (const [chainKey, chain] of Object.entries(CHAINS)) {
    try {
      const provider = await connectWithFallback(chainKey);
      providers[chainKey] = provider;
      signers[chainKey] = new ethers.Wallet(PRIVATE_KEY, provider);
      
      contracts[chainKey] = {
        quoter: new ethers.Contract(chain.quoter, QUOTER_ABI, provider),
        router: new ethers.Contract(chain.router, ROUTER_ABI, signers[chainKey]),
        weth: new ethers.Contract(chain.tokens.WETH, WETH_ABI, signers[chainKey])
      };
      
      const balance = await provider.getBalance(WALLET_ADDRESS);
      const balanceEth = parseFloat(ethers.formatEther(balance));
      
      state.chains.push({
        chain: chainKey,
        name: chain.name,
        chainId: chain.chainId,
        balance: balanceEth.toFixed(6),
        balanceUsd: balanceEth * CONFIG.ETH_PRICE_USD,
        routes: CONFIG.FEE_TIERS.length * CONFIG.TRADE_AMOUNTS.length,
        isActive: balanceEth > 0.001,
        lastScan: Date.now(),
        explorer: chain.explorer,
        ethPrice: 0,
        connected: true
      });
      
      state.banditStates.push({
        chain: chainKey,
        alpha: 2,
        beta: 2,
        winRate: 50,
        selected: chainKey === 'base',
        attempts: 0,
        wins: 0
      });
      
      console.log(`   💰 ${chain.name}: ${balanceEth.toFixed(6)} ETH ($${(balanceEth * CONFIG.ETH_PRICE_USD).toFixed(2)})`);
    } catch (e) {
      console.error(`   ❌ ${chain.name}: ${e.message}`);
      state.chains.push({
        chain: chainKey,
        name: chain.name,
        chainId: chain.chainId,
        balance: '0',
        balanceUsd: 0,
        routes: 0,
        isActive: false,
        lastScan: Date.now(),
        explorer: chain.explorer,
        ethPrice: 0,
        connected: false,
        error: e.message
      });
    }
  }
  console.log('');
}

// ═══════════════════════════════════════════════════════════════════════════════
// ESCANEO SIMPLE Y RÁPIDO
// ═══════════════════════════════════════════════════════════════════════════════

async function scanChain(chainKey) {
  const chain = CHAINS[chainKey];
  const provider = providers[chainKey];
  const quoter = contracts[chainKey]?.quoter;
  
  if (!quoter) return [];
  
  const opportunities = [];
  
  try {
    // Gas price
    const feeData = await provider.getFeeData();
    const gasPrice = feeData.gasPrice || ethers.parseUnits('0.01', 'gwei');
    const gasCostWei = gasPrice * 300000n;
    const gasCostUsd = parseFloat(ethers.formatEther(gasCostWei)) * CONFIG.ETH_PRICE_USD;
    
    // Precio ETH
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
    
    // Escanear rutas
    for (const amountEth of CONFIG.TRADE_AMOUNTS) {
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
            const spreadBps = Number((grossProfit * 10000n) / amountWei);
            
            // Registrar TODAS las oportunidades (incluso negativas) para mostrar en UI
            const netProfitUsd = parseFloat(ethers.formatEther(netProfit)) * ethPrice;
            
            opportunities.push({
              chain: chainKey,
              chainName: chain.name,
              strategy: 'FEE_TIER_ARB',
              route: `${CONFIG.FEE_TIERS[i]/100}%→${CONFIG.FEE_TIERS[j]/100}%`,
              amountIn: amountWei.toString(),
              amountInEth: amountEth,
              fee1: CONFIG.FEE_TIERS[i],
              fee2: CONFIG.FEE_TIERS[j],
              usdcIntermediate: usdcOut.toString(),
              wethOut: wethOut.toString(),
              spreadBps,
              netProfitUsd,
              gasCostUsd,
              ethPrice,
              profitable: netProfitUsd >= CONFIG.MIN_PROFIT_USD,
              timestamp: Date.now(),
              // Guardar BigInt originales para ejecución
              _amountInWei: amountWei,
              _usdcOut: usdcOut,
              _wethOut: wethOut
            });
            
          } catch (e) {
            // Pool no existe
          }
        }
      }
    }
    
  } catch (e) {
    console.error(`[SCAN] Error ${chain.name}: ${e.message.slice(0, 50)}`);
  }
  
  return opportunities;
}

// ═══════════════════════════════════════════════════════════════════════════════
// EJECUCIÓN DE TRADE
// ═══════════════════════════════════════════════════════════════════════════════

async function executeTrade(opp) {
  if (isExecuting) return null;
  isExecuting = true;
  
  const chain = CHAINS[opp.chain];
  const signer = signers[opp.chain];
  const provider = providers[opp.chain];
  const { router, weth } = contracts[opp.chain];
  
  // Usar BigInt originales o convertir de string
  const amountIn = opp._amountInWei || BigInt(opp.amountIn);
  const usdcIntermediate = opp._usdcOut || BigInt(opp.usdcIntermediate);
  const wethOut = opp._wethOut || BigInt(opp.wethOut);
  
  console.log(`\n🔥 ═══════════════════════════════════════════════════════════════`);
  console.log(`   EJECUTANDO TRADE EN ${chain.name.toUpperCase()}`);
  console.log(`   Route: ${opp.route}`);
  console.log(`   Amount: ${opp.amountInEth} ETH`);
  console.log(`   Expected: $${opp.netProfitUsd.toFixed(4)}`);
  
  const startTime = Date.now();
  
  try {
    // Verificar balance
    const balance = await provider.getBalance(WALLET_ADDRESS);
    if (balance < amountIn + ethers.parseEther('0.002')) {
      console.log(`   ❌ Balance insuficiente en ${chain.name}`);
      isExecuting = false;
      return { success: false, error: 'Balance insuficiente' };
    }
    
    // 1. Wrap ETH
    console.log(`   📦 Wrapping ETH...`);
    const wrapTx = await weth.deposit({ value: amountIn, gasLimit: 60000 });
    await wrapTx.wait(1);
    console.log(`   ✅ Wrapped`);
    
    // 2. Approve WETH
    const allowance = await weth.allowance(WALLET_ADDRESS, chain.router);
    if (allowance < amountIn) {
      console.log(`   🔓 Approving WETH...`);
      const approveTx = await weth.approve(chain.router, ethers.MaxUint256, { gasLimit: 60000 });
      await approveTx.wait(1);
    }
    
    // 3. SWAP 1: WETH → USDC
    console.log(`   🔄 SWAP 1: WETH → USDC (${opp.fee1/100}%)...`);
    const minUsdc = (usdcIntermediate * BigInt(10000 - CONFIG.MAX_SLIPPAGE_BPS)) / 10000n;
    
    const swap1Tx = await router.exactInputSingle({
      tokenIn: chain.tokens.WETH,
      tokenOut: chain.tokens.USDC,
      fee: opp.fee1,
      recipient: WALLET_ADDRESS,
      amountIn: amountIn,
      amountOutMinimum: minUsdc,
      sqrtPriceLimitX96: 0n
    }, { gasLimit: 350000 });
    
    const receipt1 = await swap1Tx.wait(1);
    console.log(`   ✅ SWAP 1 completado: ${receipt1.hash.slice(0, 16)}...`);
    
    // 4. Obtener balance USDC
    const usdc = new ethers.Contract(chain.tokens.USDC, ERC20_ABI, signer);
    const usdcBalance = await usdc.balanceOf(WALLET_ADDRESS);
    console.log(`   💵 USDC recibido: ${ethers.formatUnits(usdcBalance, 6)}`);
    
    // 5. Approve USDC
    const usdcAllowance = await usdc.allowance(WALLET_ADDRESS, chain.router);
    if (usdcAllowance < usdcBalance) {
      console.log(`   🔓 Approving USDC...`);
      const approveUsdcTx = await usdc.approve(chain.router, ethers.MaxUint256, { gasLimit: 60000 });
      await approveUsdcTx.wait(1);
    }
    
    // 6. SWAP 2: USDC → WETH
    console.log(`   🔄 SWAP 2: USDC → WETH (${opp.fee2/100}%)...`);
    const minWeth = (wethOut * BigInt(10000 - CONFIG.MAX_SLIPPAGE_BPS)) / 10000n;
    
    const swap2Tx = await router.exactInputSingle({
      tokenIn: chain.tokens.USDC,
      tokenOut: chain.tokens.WETH,
      fee: opp.fee2,
      recipient: WALLET_ADDRESS,
      amountIn: usdcBalance,
      amountOutMinimum: minWeth,
      sqrtPriceLimitX96: 0n
    }, { gasLimit: 350000 });
    
    const receipt2 = await swap2Tx.wait(1);
    console.log(`   ✅ SWAP 2 completado: ${receipt2.hash.slice(0, 16)}...`);
    
    // 7. Calcular profit
    const finalWeth = await weth.balanceOf(WALLET_ADDRESS);
    const actualProfit = finalWeth - amountIn;
    const actualProfitUsd = parseFloat(ethers.formatEther(actualProfit)) * opp.ethPrice;
    
    const gas1 = receipt1.gasUsed * receipt1.gasPrice;
    const gas2 = receipt2.gasUsed * receipt2.gasPrice;
    const totalGasUsd = parseFloat(ethers.formatEther(gas1 + gas2)) * opp.ethPrice;
    
    const netProfitUsd = actualProfitUsd - totalGasUsd;
    const executionTime = Date.now() - startTime;
    
    console.log(`   ═══════════════════════════════════════════════════════════════`);
    console.log(`   💰 PROFIT BRUTO: $${actualProfitUsd.toFixed(4)}`);
    console.log(`   ⛽ GAS TOTAL: $${totalGasUsd.toFixed(4)}`);
    console.log(`   💵 PROFIT NETO: $${netProfitUsd.toFixed(4)}`);
    console.log(`   ⏱️  Tiempo: ${executionTime}ms`);
    console.log(`   🔗 ${chain.explorer}/tx/${receipt2.hash}`);
    console.log(`   ═══════════════════════════════════════════════════════════════\n`);
    
    isExecuting = false;
    return {
      success: true,
      profitUsd: actualProfitUsd,
      gasUsd: totalGasUsd,
      netProfitUsd,
      txHash: receipt2.hash,
      executionTimeMs: executionTime
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
  
  // Rotar entre chains activas
  const activeChains = state.chains.filter(c => c.connected && c.isActive);
  if (activeChains.length === 0) {
    console.log('[TICK] No hay chains activas');
    return;
  }
  
  const selectedChain = activeChains[currentChainIndex % activeChains.length].chain;
  currentChainIndex++;
  
  state.stats.currentChain = selectedChain;
  state.banditStates.forEach(b => b.selected = b.chain === selectedChain);
  
  try {
    const opportunities = await scanChain(selectedChain);
    const scanTime = Date.now() - tickStart;
    
    scanTimes.push(scanTime);
    if (scanTimes.length > 20) scanTimes.shift();
    state.stats.avgScanTimeMs = Math.round(scanTimes.reduce((a, b) => a + b, 0) / scanTimes.length);
    state.stats.scansPerSecond = state.stats.avgScanTimeMs > 0 ? Math.round(1000 / state.stats.avgScanTimeMs * 10) / 10 : 0;
    
    // Guardar TODAS las oportunidades para mostrar en UI
    state.opportunities = [...opportunities.slice(0, 10), ...state.opportunities].slice(0, 30);
    
    // Filtrar solo las rentables
    const profitableOpps = opportunities.filter(o => o.profitable);
    
    if (profitableOpps.length > 0) {
      state.stats.opportunitiesFound += profitableOpps.length;
      profitableOpps.sort((a, b) => b.netProfitUsd - a.netProfitUsd);
      
      const best = profitableOpps[0];
      state.stats.lastOpportunity = best;
      
      console.log(`\n[SCAN #${state.stats.totalScans}] ${CHAINS[selectedChain].name} | ${scanTime}ms`);
      console.log(`   🎯 ${profitableOpps.length} OPORTUNIDADES RENTABLES!`);
      console.log(`   💰 MEJOR: ${best.route} | $${best.netProfitUsd.toFixed(4)}`);
      
      // EJECUTAR si no es dry run
      if (!state.isDryRun && CONFIG.AUTO_EXECUTE) {
        state.stats.tradesAttempted++;
        
        const result = await executeTrade(best);
        
        if (result) {
          state.stats.tradesExecuted++;
          
          const tradeLog = {
            id: `tx-${Date.now()}`,
            timestamp: Date.now(),
            chain: best.chain,
            chainName: best.chainName,
            strategy: best.strategy,
            route: best.route,
            amountIn: best.amountInEth,
            spreadBps: best.spreadBps,
            expectedProfit: best.netProfitUsd.toFixed(4),
            actualProfit: result.success ? result.profitUsd.toFixed(4) : '0',
            gasCost: result.success ? result.gasUsd.toFixed(4) : '0',
            netProfit: result.success ? result.netProfitUsd.toFixed(4) : '0',
            txHash: result.txHash || '',
            status: result.success ? 'success' : 'failed',
            error: result.error || '',
            executionTimeMs: result.executionTimeMs || 0
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
            }
          }
          
          state.stats.winRate = state.stats.tradesExecuted > 0
            ? (state.stats.tradesSuccessful / state.stats.tradesExecuted) * 100
            : 0;
        }
      }
    } else {
      // Log cada 10 scans
      if (state.stats.totalScans % 10 === 0) {
        const bestOpp = opportunities.length > 0 ? opportunities.sort((a, b) => b.netProfitUsd - a.netProfitUsd)[0] : null;
        console.log(`[SCAN #${state.stats.totalScans}] ${CHAINS[selectedChain].name} | ${scanTime}ms | Best spread: ${bestOpp ? bestOpp.spreadBps + ' bps ($' + bestOpp.netProfitUsd.toFixed(4) + ')' : 'N/A'}`);
      }
    }
    
    // Actualizar balances cada 30 scans
    if (state.stats.totalScans % 30 === 0) {
      for (const chainState of state.chains) {
        if (!chainState.connected) continue;
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
    console.error(`[TICK] Error: ${e.message}`);
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// API
// ═══════════════════════════════════════════════════════════════════════════════

app.get('/api/defi/multichain-arb/status', (req, res) => {
  // Convertir BigInt a string para JSON
  const safeState = JSON.parse(JSON.stringify(state, (key, value) =>
    typeof value === 'bigint' ? value.toString() : value
  ));
  res.json(safeState);
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
  
  console.log(`\n[START] 🔥 SCALPER 3 CHAINS - ${state.isDryRun ? 'DRY RUN' : '⚠️ MODO REAL - EJECUTANDO TRADES'}`);
  console.log(`[CONFIG] Min Profit: $${CONFIG.MIN_PROFIT_USD} | Auto Execute: ${CONFIG.AUTO_EXECUTE}`);
  console.log(`[CHAINS] ${state.chains.filter(c => c.connected).map(c => c.name).join(', ')}\n`);
  
  res.json({
    success: true,
    isRunning: true,
    isDryRun: state.isDryRun,
    mode: 'SCALPER_3CHAINS',
    config: CONFIG,
    connectedChains: state.chains.filter(c => c.connected).map(c => c.name)
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
    mode: 'SCALPER_3CHAINS',
    port: PORT,
    running: state.isRunning,
    dryRun: state.isDryRun,
    wallet: WALLET_ADDRESS,
    chains: state.chains.map(c => ({ name: c.name, connected: c.connected, balance: c.balance })),
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
║   🔥 SCALPER 3 CHAINS - BASE + ARBITRUM + OPTIMISM                            ║
║                                                                               ║
║   ✅ Puerto: ${PORT}                                                           ║
║   ✅ Wallet: ${WALLET_ADDRESS.slice(0, 10)}...${WALLET_ADDRESS.slice(-5)}                                  ║
║                                                                               ║
║   ⚡ Intervalo: ${CONFIG.SCAN_INTERVAL_MS}ms | Min Profit: $${CONFIG.MIN_PROFIT_USD}                           ║
║   ⚡ Auto Execute: ${CONFIG.AUTO_EXECUTE}                                                   ║
║                                                                               ║
║   ⚠️  MODO REAL - Ejecutará trades automáticamente                            ║
║                                                                               ║
╚═══════════════════════════════════════════════════════════════════════════════╝
  `);
  
  await init();
  console.log('[READY] 🔥 POST /api/defi/multichain-arb/start para iniciar.\n');
});

process.on('SIGINT', () => {
  if (timer) clearInterval(timer);
  process.exit(0);
});

