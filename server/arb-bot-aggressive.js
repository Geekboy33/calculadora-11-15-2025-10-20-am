/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * 🔥 BOT AGRESIVO - EJECUTA TRANSACCIONES REALES
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * Este bot:
 * 1. Ordena oportunidades por mejor profit
 * 2. Ejecuta la MEJOR oportunidad inmediatamente
 * 3. Umbral de profit muy bajo para ejecutar más trades
 * 4. Ejecuta aunque el profit sea pequeño o ligeramente negativo
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
// CONFIGURACIÓN MUY AGRESIVA
// ═══════════════════════════════════════════════════════════════════════════════

const CONFIG = {
  SCAN_INTERVAL_MS: 1000,
  // UMBRAL MUY BAJO - Ejecutar incluso con pequeña pérdida para probar
  MIN_PROFIT_USD: -0.50,          // Acepta hasta $0.50 de pérdida
  MAX_SLIPPAGE_BPS: 100,          // 1% slippage
  AUTO_EXECUTE: true,
  EXECUTE_ON_START: true,         // Ejecutar inmediatamente al iniciar
  ETH_PRICE_USD: 3500,
  TRADE_AMOUNTS: [0.005, 0.01],   // Cantidades pequeñas para pruebas
  FEE_TIERS: [500, 3000]          // Solo 0.05% y 0.3%
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
  mode: 'AGGRESSIVE_EXECUTOR',
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
    currentStrategy: 'IDLE',
    lastOpportunity: null,
    lastTrade: null
  },
  chains: [],
  tradeLogs: [],
  opportunities: [],
  banditStates: [],
  strategies: {
    flashLoan: { enabled: false, scans: 0, opportunities: 0, executions: 0 },
    mev: { enabled: false, scans: 0, opportunities: 0, executions: 0 },
    triangular: { enabled: false, scans: 0, opportunities: 0, executions: 0 },
    simpleArb: { enabled: true, scans: 0, opportunities: 0, executions: 0 },
    crossDex: { enabled: false, scans: 0, opportunities: 0, executions: 0 },
    liquidation: { enabled: false, scans: 0, opportunities: 0, executions: 0 }
  }
};

let timer = null;
let providers = {};
let signers = {};
let contracts = {};
let isExecuting = false;
let currentChainIndex = 0;

// ═══════════════════════════════════════════════════════════════════════════════
// INICIALIZACIÓN
// ═══════════════════════════════════════════════════════════════════════════════

async function init() {
  console.log('\n[INIT] 🔌 Conectando a chains...\n');
  
  for (const [chainKey, chain] of Object.entries(CHAINS)) {
    try {
      const provider = new ethers.JsonRpcProvider(chain.rpc);
      await provider.getBlockNumber();
      
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
        isActive: balanceEth > 0.003,
        explorer: chain.explorer,
        ethPrice: 0,
        connected: true
      });
      
      state.banditStates.push({
        chain: chainKey,
        alpha: 2,
        beta: 2,
        winRate: 50,
        selected: chainKey === 'base'
      });
      
      console.log(`   ✅ ${chain.name}: ${balanceEth.toFixed(6)} ETH ($${(balanceEth * CONFIG.ETH_PRICE_USD).toFixed(2)})`);
    } catch (e) {
      console.error(`   ❌ ${chain.name}: ${e.message}`);
      state.chains.push({
        chain: chainKey,
        name: chain.name,
        connected: false,
        balance: '0',
        balanceUsd: 0,
        isActive: false
      });
    }
  }
  console.log('');
}

// ═══════════════════════════════════════════════════════════════════════════════
// ESCANEO DE OPORTUNIDADES
// ═══════════════════════════════════════════════════════════════════════════════

async function scanAllChains() {
  const allOpportunities = [];
  
  for (const [chainKey, chain] of Object.entries(CHAINS)) {
    if (!providers[chainKey]) continue;
    
    const quoter = contracts[chainKey].quoter;
    const provider = providers[chainKey];
    
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
              const netProfitUsd = parseFloat(ethers.formatEther(netProfit)) * ethPrice;
              const spreadBps = Number((grossProfit * 10000n) / amountWei);
              
              allOpportunities.push({
                chain: chainKey,
                chainName: chain.name,
                strategy: 'SIMPLE_ARB',
                route: `${CONFIG.FEE_TIERS[i]/100}%→${CONFIG.FEE_TIERS[j]/100}%`,
                amountInEth: amountEth,
                amountIn: amountWei,
                fee1: CONFIG.FEE_TIERS[i],
                fee2: CONFIG.FEE_TIERS[j],
                usdcIntermediate: usdcOut,
                wethOut: wethOut,
                spreadBps,
                netProfitUsd,
                gasCostUsd,
                ethPrice,
                profitable: netProfitUsd >= CONFIG.MIN_PROFIT_USD,
                timestamp: Date.now()
              });
              
            } catch (e) {}
          }
        }
      }
    } catch (e) {
      console.error(`[SCAN] Error ${chain.name}: ${e.message.slice(0, 50)}`);
    }
  }
  
  // Ordenar por MEJOR profit (de mayor a menor)
  allOpportunities.sort((a, b) => b.netProfitUsd - a.netProfitUsd);
  
  return allOpportunities;
}

// ═══════════════════════════════════════════════════════════════════════════════
// EJECUCIÓN DE TRADE
// ═══════════════════════════════════════════════════════════════════════════════

async function executeTrade(opp) {
  if (isExecuting) {
    console.log('[EXEC] Ya hay una ejecución en progreso');
    return null;
  }
  
  isExecuting = true;
  
  const chain = CHAINS[opp.chain];
  const signer = signers[opp.chain];
  const provider = providers[opp.chain];
  const { router, weth } = contracts[opp.chain];
  
  console.log(`\n${'═'.repeat(70)}`);
  console.log(`🔥 EJECUTANDO TRADE REAL en ${chain.name.toUpperCase()}`);
  console.log(`${'═'.repeat(70)}`);
  console.log(`   📊 Estrategia: ${opp.strategy}`);
  console.log(`   🔄 Ruta: ${opp.route}`);
  console.log(`   💰 Amount: ${opp.amountInEth} ETH`);
  console.log(`   📈 Expected Profit: $${opp.netProfitUsd.toFixed(4)}`);
  console.log(`   ⛽ Gas estimado: $${opp.gasCostUsd.toFixed(4)}`);
  console.log(`${'─'.repeat(70)}`);
  
  const startTime = Date.now();
  
  try {
    // 1. Verificar balance
    const balance = await provider.getBalance(WALLET_ADDRESS);
    const balanceEth = parseFloat(ethers.formatEther(balance));
    console.log(`   💳 Balance actual: ${balanceEth.toFixed(6)} ETH`);
    
    if (balance < opp.amountIn + ethers.parseEther('0.002')) {
      console.log(`   ❌ Balance insuficiente en ${chain.name}`);
      isExecuting = false;
      return { success: false, error: 'Balance insuficiente' };
    }
    
    // 2. Wrap ETH → WETH
    console.log(`   📦 [1/5] Wrapping ${opp.amountInEth} ETH → WETH...`);
    const wrapTx = await weth.deposit({ 
      value: opp.amountIn, 
      gasLimit: 60000 
    });
    const wrapReceipt = await wrapTx.wait(1);
    console.log(`   ✅ Wrapped! TX: ${wrapReceipt.hash.slice(0, 20)}...`);
    
    // 3. Approve WETH
    const wethAllowance = await weth.allowance(WALLET_ADDRESS, chain.router);
    if (wethAllowance < opp.amountIn) {
      console.log(`   🔓 [2/5] Approving WETH...`);
      const approveTx = await weth.approve(chain.router, ethers.MaxUint256, { gasLimit: 60000 });
      await approveTx.wait(1);
      console.log(`   ✅ WETH Approved!`);
    } else {
      console.log(`   ✅ [2/5] WETH ya aprobado`);
    }
    
    // 4. SWAP 1: WETH → USDC
    console.log(`   🔄 [3/5] Swap WETH → USDC (fee: ${opp.fee1/100}%)...`);
    const minUsdc = (opp.usdcIntermediate * BigInt(10000 - CONFIG.MAX_SLIPPAGE_BPS)) / 10000n;
    
    const swap1Tx = await router.exactInputSingle({
      tokenIn: chain.tokens.WETH,
      tokenOut: chain.tokens.USDC,
      fee: opp.fee1,
      recipient: WALLET_ADDRESS,
      amountIn: opp.amountIn,
      amountOutMinimum: minUsdc,
      sqrtPriceLimitX96: 0n
    }, { gasLimit: 350000 });
    
    const receipt1 = await swap1Tx.wait(1);
    console.log(`   ✅ Swap 1 completado! TX: ${receipt1.hash.slice(0, 20)}...`);
    
    // 5. Obtener balance USDC
    const usdc = new ethers.Contract(chain.tokens.USDC, ERC20_ABI, signer);
    const usdcBalance = await usdc.balanceOf(WALLET_ADDRESS);
    console.log(`   💵 USDC recibido: ${ethers.formatUnits(usdcBalance, 6)}`);
    
    // 6. Approve USDC
    const usdcAllowance = await usdc.allowance(WALLET_ADDRESS, chain.router);
    if (usdcAllowance < usdcBalance) {
      console.log(`   🔓 [4/5] Approving USDC...`);
      const approveUsdcTx = await usdc.approve(chain.router, ethers.MaxUint256, { gasLimit: 60000 });
      await approveUsdcTx.wait(1);
      console.log(`   ✅ USDC Approved!`);
    } else {
      console.log(`   ✅ [4/5] USDC ya aprobado`);
    }
    
    // 7. SWAP 2: USDC → WETH
    console.log(`   🔄 [5/5] Swap USDC → WETH (fee: ${opp.fee2/100}%)...`);
    const minWeth = (opp.wethOut * BigInt(10000 - CONFIG.MAX_SLIPPAGE_BPS)) / 10000n;
    
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
    console.log(`   ✅ Swap 2 completado! TX: ${receipt2.hash.slice(0, 20)}...`);
    
    // 8. Calcular resultado
    const finalWeth = await weth.balanceOf(WALLET_ADDRESS);
    const actualProfit = finalWeth - opp.amountIn;
    const actualProfitUsd = parseFloat(ethers.formatEther(actualProfit)) * opp.ethPrice;
    
    const gas1 = receipt1.gasUsed * receipt1.gasPrice;
    const gas2 = receipt2.gasUsed * receipt2.gasPrice;
    const totalGasWei = gas1 + gas2;
    const totalGasUsd = parseFloat(ethers.formatEther(totalGasWei)) * opp.ethPrice;
    
    const netProfitUsd = actualProfitUsd - totalGasUsd;
    const executionTime = Date.now() - startTime;
    
    console.log(`${'═'.repeat(70)}`);
    console.log(`   🎉 TRADE COMPLETADO!`);
    console.log(`${'─'.repeat(70)}`);
    console.log(`   💰 Profit Bruto: $${actualProfitUsd.toFixed(4)}`);
    console.log(`   ⛽ Gas Total: $${totalGasUsd.toFixed(4)}`);
    console.log(`   💵 Profit Neto: $${netProfitUsd.toFixed(4)} ${netProfitUsd >= 0 ? '✅' : '❌'}`);
    console.log(`   ⏱️  Tiempo: ${executionTime}ms`);
    console.log(`   🔗 TX: ${chain.explorer}/tx/${receipt2.hash}`);
    console.log(`${'═'.repeat(70)}\n`);
    
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
    console.log(`${'═'.repeat(70)}`);
    console.log(`   ❌ ERROR EN TRADE: ${e.message}`);
    console.log(`${'═'.repeat(70)}\n`);
    
    isExecuting = false;
    return { success: false, error: e.message };
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// EJECUTAR MEJOR OPORTUNIDAD
// ═══════════════════════════════════════════════════════════════════════════════

async function executeBestOpportunity() {
  console.log('\n[SCAN] 🔍 Escaneando TODAS las chains para la MEJOR oportunidad...\n');
  
  const opportunities = await scanAllChains();
  
  if (opportunities.length === 0) {
    console.log('[SCAN] No se encontraron oportunidades');
    return null;
  }
  
  // Mostrar top 5 oportunidades
  console.log('\n📊 TOP 5 OPORTUNIDADES (ordenadas por profit):');
  console.log('─'.repeat(70));
  opportunities.slice(0, 5).forEach((opp, i) => {
    const profitColor = opp.netProfitUsd >= 0 ? '\x1b[32m' : '\x1b[31m';
    console.log(`${i + 1}. ${opp.chainName} | ${opp.route} | ${opp.amountInEth} ETH | ${profitColor}$${opp.netProfitUsd.toFixed(4)}\x1b[0m`);
  });
  console.log('─'.repeat(70));
  
  // Guardar oportunidades en estado
  state.opportunities = opportunities.slice(0, 20).map(o => ({
    ...o,
    amountIn: o.amountIn.toString(),
    usdcIntermediate: o.usdcIntermediate.toString(),
    wethOut: o.wethOut.toString()
  }));
  
  // Filtrar las que cumplen el umbral
  const executableOpps = opportunities.filter(o => o.netProfitUsd >= CONFIG.MIN_PROFIT_USD);
  
  if (executableOpps.length === 0) {
    console.log(`\n[EXEC] ⚠️ Ninguna oportunidad supera el umbral de $${CONFIG.MIN_PROFIT_USD}`);
    console.log(`[EXEC] La mejor tiene $${opportunities[0].netProfitUsd.toFixed(4)}`);
    return null;
  }
  
  // Ejecutar la MEJOR
  const best = executableOpps[0];
  console.log(`\n[EXEC] 🎯 Ejecutando MEJOR oportunidad: ${best.chainName} | ${best.route} | $${best.netProfitUsd.toFixed(4)}`);
  
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
      state.stats.totalProfitUsd += result.profitUsd || 0;
      state.stats.totalGasUsd += result.gasUsd || 0;
      state.stats.netProfitUsd = state.stats.totalProfitUsd - state.stats.totalGasUsd;
      state.stats.lastTrade = tradeLog;
    }
    
    state.stats.winRate = state.stats.tradesExecuted > 0
      ? (state.stats.tradesSuccessful / state.stats.tradesExecuted) * 100
      : 0;
  }
  
  return result;
}

// ═══════════════════════════════════════════════════════════════════════════════
// LOOP PRINCIPAL
// ═══════════════════════════════════════════════════════════════════════════════

async function tick() {
  if (!state.isRunning || isExecuting) return;
  
  state.stats.totalScans++;
  state.stats.uptime = Math.floor((Date.now() - state.startTime) / 1000);
  state.stats.currentStrategy = 'SCANNING';
  
  await executeBestOpportunity();
}

// ═══════════════════════════════════════════════════════════════════════════════
// API
// ═══════════════════════════════════════════════════════════════════════════════

app.get('/api/defi/multichain-arb/status', (req, res) => {
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
  
  // Reset stats
  state.stats = {
    totalScans: 0, opportunitiesFound: 0, tradesAttempted: 0, tradesExecuted: 0,
    tradesSuccessful: 0, totalProfitUsd: 0, totalGasUsd: 0, netProfitUsd: 0,
    winRate: 0, avgScanTimeMs: 0, scansPerSecond: 0, uptime: 0,
    currentChain: 'base', currentStrategy: 'STARTING', lastOpportunity: null, lastTrade: null
  };
  state.tradeLogs = [];
  state.opportunities = [];
  
  console.log(`\n${'═'.repeat(70)}`);
  console.log(`🔥 BOT AGRESIVO INICIADO - ${state.isDryRun ? 'DRY RUN' : '⚠️ MODO REAL - EJECUTANDO TRADES'}`);
  console.log(`${'═'.repeat(70)}`);
  console.log(`   Min Profit: $${CONFIG.MIN_PROFIT_USD}`);
  console.log(`   Auto Execute: ${CONFIG.AUTO_EXECUTE}`);
  console.log(`   Execute on Start: ${CONFIG.EXECUTE_ON_START}`);
  console.log(`${'═'.repeat(70)}\n`);
  
  // EJECUTAR INMEDIATAMENTE al iniciar
  if (CONFIG.EXECUTE_ON_START && !state.isDryRun) {
    console.log('[START] 🚀 Ejecutando primera oportunidad inmediatamente...\n');
    await executeBestOpportunity();
  }
  
  // Iniciar loop
  if (timer) clearInterval(timer);
  timer = setInterval(tick, CONFIG.SCAN_INTERVAL_MS);
  
  res.json({
    success: true,
    isRunning: true,
    isDryRun: state.isDryRun,
    mode: 'AGGRESSIVE_EXECUTOR',
    config: CONFIG
  });
});

app.post('/api/defi/multichain-arb/stop', (req, res) => {
  state.isRunning = false;
  if (timer) { clearInterval(timer); timer = null; }
  console.log('\n[STOP] Bot detenido\n');
  res.json({ success: true, isRunning: false });
});

app.post('/api/defi/multichain-arb/execute-now', async (req, res) => {
  console.log('\n[API] Ejecución manual solicitada...\n');
  const result = await executeBestOpportunity();
  res.json({ success: true, result });
});

app.get('/api/defi/multichain-arb/health', (req, res) => {
  res.json({
    status: 'ok',
    mode: 'AGGRESSIVE_EXECUTOR',
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
${'═'.repeat(70)}

   🔥 BOT AGRESIVO - EJECUTOR DE TRANSACCIONES REALES
   
   ✅ Puerto: ${PORT}
   ✅ Wallet: ${WALLET_ADDRESS.slice(0, 10)}...${WALLET_ADDRESS.slice(-5)}
   
   ⚡ Min Profit: $${CONFIG.MIN_PROFIT_USD} (puede ser negativo para pruebas)
   ⚡ Auto Execute: ${CONFIG.AUTO_EXECUTE}
   ⚡ Execute on Start: ${CONFIG.EXECUTE_ON_START}
   
   ⚠️  MODO AGRESIVO - Ejecutará trades reales inmediatamente

${'═'.repeat(70)}
  `);
  
  await init();
  console.log('\n[READY] 🔥 POST /api/defi/multichain-arb/start para iniciar\n');
  console.log('[READY] 🚀 POST /api/defi/multichain-arb/execute-now para ejecutar manualmente\n');
});

process.on('SIGINT', () => {
  if (timer) clearInterval(timer);
  process.exit(0);
});



 * ═══════════════════════════════════════════════════════════════════════════════
 * 🔥 BOT AGRESIVO - EJECUTA TRANSACCIONES REALES
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * Este bot:
 * 1. Ordena oportunidades por mejor profit
 * 2. Ejecuta la MEJOR oportunidad inmediatamente
 * 3. Umbral de profit muy bajo para ejecutar más trades
 * 4. Ejecuta aunque el profit sea pequeño o ligeramente negativo
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
// CONFIGURACIÓN MUY AGRESIVA
// ═══════════════════════════════════════════════════════════════════════════════

const CONFIG = {
  SCAN_INTERVAL_MS: 1000,
  // UMBRAL MUY BAJO - Ejecutar incluso con pequeña pérdida para probar
  MIN_PROFIT_USD: -0.50,          // Acepta hasta $0.50 de pérdida
  MAX_SLIPPAGE_BPS: 100,          // 1% slippage
  AUTO_EXECUTE: true,
  EXECUTE_ON_START: true,         // Ejecutar inmediatamente al iniciar
  ETH_PRICE_USD: 3500,
  TRADE_AMOUNTS: [0.005, 0.01],   // Cantidades pequeñas para pruebas
  FEE_TIERS: [500, 3000]          // Solo 0.05% y 0.3%
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
  mode: 'AGGRESSIVE_EXECUTOR',
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
    currentStrategy: 'IDLE',
    lastOpportunity: null,
    lastTrade: null
  },
  chains: [],
  tradeLogs: [],
  opportunities: [],
  banditStates: [],
  strategies: {
    flashLoan: { enabled: false, scans: 0, opportunities: 0, executions: 0 },
    mev: { enabled: false, scans: 0, opportunities: 0, executions: 0 },
    triangular: { enabled: false, scans: 0, opportunities: 0, executions: 0 },
    simpleArb: { enabled: true, scans: 0, opportunities: 0, executions: 0 },
    crossDex: { enabled: false, scans: 0, opportunities: 0, executions: 0 },
    liquidation: { enabled: false, scans: 0, opportunities: 0, executions: 0 }
  }
};

let timer = null;
let providers = {};
let signers = {};
let contracts = {};
let isExecuting = false;
let currentChainIndex = 0;

// ═══════════════════════════════════════════════════════════════════════════════
// INICIALIZACIÓN
// ═══════════════════════════════════════════════════════════════════════════════

async function init() {
  console.log('\n[INIT] 🔌 Conectando a chains...\n');
  
  for (const [chainKey, chain] of Object.entries(CHAINS)) {
    try {
      const provider = new ethers.JsonRpcProvider(chain.rpc);
      await provider.getBlockNumber();
      
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
        isActive: balanceEth > 0.003,
        explorer: chain.explorer,
        ethPrice: 0,
        connected: true
      });
      
      state.banditStates.push({
        chain: chainKey,
        alpha: 2,
        beta: 2,
        winRate: 50,
        selected: chainKey === 'base'
      });
      
      console.log(`   ✅ ${chain.name}: ${balanceEth.toFixed(6)} ETH ($${(balanceEth * CONFIG.ETH_PRICE_USD).toFixed(2)})`);
    } catch (e) {
      console.error(`   ❌ ${chain.name}: ${e.message}`);
      state.chains.push({
        chain: chainKey,
        name: chain.name,
        connected: false,
        balance: '0',
        balanceUsd: 0,
        isActive: false
      });
    }
  }
  console.log('');
}

// ═══════════════════════════════════════════════════════════════════════════════
// ESCANEO DE OPORTUNIDADES
// ═══════════════════════════════════════════════════════════════════════════════

async function scanAllChains() {
  const allOpportunities = [];
  
  for (const [chainKey, chain] of Object.entries(CHAINS)) {
    if (!providers[chainKey]) continue;
    
    const quoter = contracts[chainKey].quoter;
    const provider = providers[chainKey];
    
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
              const netProfitUsd = parseFloat(ethers.formatEther(netProfit)) * ethPrice;
              const spreadBps = Number((grossProfit * 10000n) / amountWei);
              
              allOpportunities.push({
                chain: chainKey,
                chainName: chain.name,
                strategy: 'SIMPLE_ARB',
                route: `${CONFIG.FEE_TIERS[i]/100}%→${CONFIG.FEE_TIERS[j]/100}%`,
                amountInEth: amountEth,
                amountIn: amountWei,
                fee1: CONFIG.FEE_TIERS[i],
                fee2: CONFIG.FEE_TIERS[j],
                usdcIntermediate: usdcOut,
                wethOut: wethOut,
                spreadBps,
                netProfitUsd,
                gasCostUsd,
                ethPrice,
                profitable: netProfitUsd >= CONFIG.MIN_PROFIT_USD,
                timestamp: Date.now()
              });
              
            } catch (e) {}
          }
        }
      }
    } catch (e) {
      console.error(`[SCAN] Error ${chain.name}: ${e.message.slice(0, 50)}`);
    }
  }
  
  // Ordenar por MEJOR profit (de mayor a menor)
  allOpportunities.sort((a, b) => b.netProfitUsd - a.netProfitUsd);
  
  return allOpportunities;
}

// ═══════════════════════════════════════════════════════════════════════════════
// EJECUCIÓN DE TRADE
// ═══════════════════════════════════════════════════════════════════════════════

async function executeTrade(opp) {
  if (isExecuting) {
    console.log('[EXEC] Ya hay una ejecución en progreso');
    return null;
  }
  
  isExecuting = true;
  
  const chain = CHAINS[opp.chain];
  const signer = signers[opp.chain];
  const provider = providers[opp.chain];
  const { router, weth } = contracts[opp.chain];
  
  console.log(`\n${'═'.repeat(70)}`);
  console.log(`🔥 EJECUTANDO TRADE REAL en ${chain.name.toUpperCase()}`);
  console.log(`${'═'.repeat(70)}`);
  console.log(`   📊 Estrategia: ${opp.strategy}`);
  console.log(`   🔄 Ruta: ${opp.route}`);
  console.log(`   💰 Amount: ${opp.amountInEth} ETH`);
  console.log(`   📈 Expected Profit: $${opp.netProfitUsd.toFixed(4)}`);
  console.log(`   ⛽ Gas estimado: $${opp.gasCostUsd.toFixed(4)}`);
  console.log(`${'─'.repeat(70)}`);
  
  const startTime = Date.now();
  
  try {
    // 1. Verificar balance
    const balance = await provider.getBalance(WALLET_ADDRESS);
    const balanceEth = parseFloat(ethers.formatEther(balance));
    console.log(`   💳 Balance actual: ${balanceEth.toFixed(6)} ETH`);
    
    if (balance < opp.amountIn + ethers.parseEther('0.002')) {
      console.log(`   ❌ Balance insuficiente en ${chain.name}`);
      isExecuting = false;
      return { success: false, error: 'Balance insuficiente' };
    }
    
    // 2. Wrap ETH → WETH
    console.log(`   📦 [1/5] Wrapping ${opp.amountInEth} ETH → WETH...`);
    const wrapTx = await weth.deposit({ 
      value: opp.amountIn, 
      gasLimit: 60000 
    });
    const wrapReceipt = await wrapTx.wait(1);
    console.log(`   ✅ Wrapped! TX: ${wrapReceipt.hash.slice(0, 20)}...`);
    
    // 3. Approve WETH
    const wethAllowance = await weth.allowance(WALLET_ADDRESS, chain.router);
    if (wethAllowance < opp.amountIn) {
      console.log(`   🔓 [2/5] Approving WETH...`);
      const approveTx = await weth.approve(chain.router, ethers.MaxUint256, { gasLimit: 60000 });
      await approveTx.wait(1);
      console.log(`   ✅ WETH Approved!`);
    } else {
      console.log(`   ✅ [2/5] WETH ya aprobado`);
    }
    
    // 4. SWAP 1: WETH → USDC
    console.log(`   🔄 [3/5] Swap WETH → USDC (fee: ${opp.fee1/100}%)...`);
    const minUsdc = (opp.usdcIntermediate * BigInt(10000 - CONFIG.MAX_SLIPPAGE_BPS)) / 10000n;
    
    const swap1Tx = await router.exactInputSingle({
      tokenIn: chain.tokens.WETH,
      tokenOut: chain.tokens.USDC,
      fee: opp.fee1,
      recipient: WALLET_ADDRESS,
      amountIn: opp.amountIn,
      amountOutMinimum: minUsdc,
      sqrtPriceLimitX96: 0n
    }, { gasLimit: 350000 });
    
    const receipt1 = await swap1Tx.wait(1);
    console.log(`   ✅ Swap 1 completado! TX: ${receipt1.hash.slice(0, 20)}...`);
    
    // 5. Obtener balance USDC
    const usdc = new ethers.Contract(chain.tokens.USDC, ERC20_ABI, signer);
    const usdcBalance = await usdc.balanceOf(WALLET_ADDRESS);
    console.log(`   💵 USDC recibido: ${ethers.formatUnits(usdcBalance, 6)}`);
    
    // 6. Approve USDC
    const usdcAllowance = await usdc.allowance(WALLET_ADDRESS, chain.router);
    if (usdcAllowance < usdcBalance) {
      console.log(`   🔓 [4/5] Approving USDC...`);
      const approveUsdcTx = await usdc.approve(chain.router, ethers.MaxUint256, { gasLimit: 60000 });
      await approveUsdcTx.wait(1);
      console.log(`   ✅ USDC Approved!`);
    } else {
      console.log(`   ✅ [4/5] USDC ya aprobado`);
    }
    
    // 7. SWAP 2: USDC → WETH
    console.log(`   🔄 [5/5] Swap USDC → WETH (fee: ${opp.fee2/100}%)...`);
    const minWeth = (opp.wethOut * BigInt(10000 - CONFIG.MAX_SLIPPAGE_BPS)) / 10000n;
    
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
    console.log(`   ✅ Swap 2 completado! TX: ${receipt2.hash.slice(0, 20)}...`);
    
    // 8. Calcular resultado
    const finalWeth = await weth.balanceOf(WALLET_ADDRESS);
    const actualProfit = finalWeth - opp.amountIn;
    const actualProfitUsd = parseFloat(ethers.formatEther(actualProfit)) * opp.ethPrice;
    
    const gas1 = receipt1.gasUsed * receipt1.gasPrice;
    const gas2 = receipt2.gasUsed * receipt2.gasPrice;
    const totalGasWei = gas1 + gas2;
    const totalGasUsd = parseFloat(ethers.formatEther(totalGasWei)) * opp.ethPrice;
    
    const netProfitUsd = actualProfitUsd - totalGasUsd;
    const executionTime = Date.now() - startTime;
    
    console.log(`${'═'.repeat(70)}`);
    console.log(`   🎉 TRADE COMPLETADO!`);
    console.log(`${'─'.repeat(70)}`);
    console.log(`   💰 Profit Bruto: $${actualProfitUsd.toFixed(4)}`);
    console.log(`   ⛽ Gas Total: $${totalGasUsd.toFixed(4)}`);
    console.log(`   💵 Profit Neto: $${netProfitUsd.toFixed(4)} ${netProfitUsd >= 0 ? '✅' : '❌'}`);
    console.log(`   ⏱️  Tiempo: ${executionTime}ms`);
    console.log(`   🔗 TX: ${chain.explorer}/tx/${receipt2.hash}`);
    console.log(`${'═'.repeat(70)}\n`);
    
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
    console.log(`${'═'.repeat(70)}`);
    console.log(`   ❌ ERROR EN TRADE: ${e.message}`);
    console.log(`${'═'.repeat(70)}\n`);
    
    isExecuting = false;
    return { success: false, error: e.message };
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// EJECUTAR MEJOR OPORTUNIDAD
// ═══════════════════════════════════════════════════════════════════════════════

async function executeBestOpportunity() {
  console.log('\n[SCAN] 🔍 Escaneando TODAS las chains para la MEJOR oportunidad...\n');
  
  const opportunities = await scanAllChains();
  
  if (opportunities.length === 0) {
    console.log('[SCAN] No se encontraron oportunidades');
    return null;
  }
  
  // Mostrar top 5 oportunidades
  console.log('\n📊 TOP 5 OPORTUNIDADES (ordenadas por profit):');
  console.log('─'.repeat(70));
  opportunities.slice(0, 5).forEach((opp, i) => {
    const profitColor = opp.netProfitUsd >= 0 ? '\x1b[32m' : '\x1b[31m';
    console.log(`${i + 1}. ${opp.chainName} | ${opp.route} | ${opp.amountInEth} ETH | ${profitColor}$${opp.netProfitUsd.toFixed(4)}\x1b[0m`);
  });
  console.log('─'.repeat(70));
  
  // Guardar oportunidades en estado
  state.opportunities = opportunities.slice(0, 20).map(o => ({
    ...o,
    amountIn: o.amountIn.toString(),
    usdcIntermediate: o.usdcIntermediate.toString(),
    wethOut: o.wethOut.toString()
  }));
  
  // Filtrar las que cumplen el umbral
  const executableOpps = opportunities.filter(o => o.netProfitUsd >= CONFIG.MIN_PROFIT_USD);
  
  if (executableOpps.length === 0) {
    console.log(`\n[EXEC] ⚠️ Ninguna oportunidad supera el umbral de $${CONFIG.MIN_PROFIT_USD}`);
    console.log(`[EXEC] La mejor tiene $${opportunities[0].netProfitUsd.toFixed(4)}`);
    return null;
  }
  
  // Ejecutar la MEJOR
  const best = executableOpps[0];
  console.log(`\n[EXEC] 🎯 Ejecutando MEJOR oportunidad: ${best.chainName} | ${best.route} | $${best.netProfitUsd.toFixed(4)}`);
  
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
      state.stats.totalProfitUsd += result.profitUsd || 0;
      state.stats.totalGasUsd += result.gasUsd || 0;
      state.stats.netProfitUsd = state.stats.totalProfitUsd - state.stats.totalGasUsd;
      state.stats.lastTrade = tradeLog;
    }
    
    state.stats.winRate = state.stats.tradesExecuted > 0
      ? (state.stats.tradesSuccessful / state.stats.tradesExecuted) * 100
      : 0;
  }
  
  return result;
}

// ═══════════════════════════════════════════════════════════════════════════════
// LOOP PRINCIPAL
// ═══════════════════════════════════════════════════════════════════════════════

async function tick() {
  if (!state.isRunning || isExecuting) return;
  
  state.stats.totalScans++;
  state.stats.uptime = Math.floor((Date.now() - state.startTime) / 1000);
  state.stats.currentStrategy = 'SCANNING';
  
  await executeBestOpportunity();
}

// ═══════════════════════════════════════════════════════════════════════════════
// API
// ═══════════════════════════════════════════════════════════════════════════════

app.get('/api/defi/multichain-arb/status', (req, res) => {
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
  
  // Reset stats
  state.stats = {
    totalScans: 0, opportunitiesFound: 0, tradesAttempted: 0, tradesExecuted: 0,
    tradesSuccessful: 0, totalProfitUsd: 0, totalGasUsd: 0, netProfitUsd: 0,
    winRate: 0, avgScanTimeMs: 0, scansPerSecond: 0, uptime: 0,
    currentChain: 'base', currentStrategy: 'STARTING', lastOpportunity: null, lastTrade: null
  };
  state.tradeLogs = [];
  state.opportunities = [];
  
  console.log(`\n${'═'.repeat(70)}`);
  console.log(`🔥 BOT AGRESIVO INICIADO - ${state.isDryRun ? 'DRY RUN' : '⚠️ MODO REAL - EJECUTANDO TRADES'}`);
  console.log(`${'═'.repeat(70)}`);
  console.log(`   Min Profit: $${CONFIG.MIN_PROFIT_USD}`);
  console.log(`   Auto Execute: ${CONFIG.AUTO_EXECUTE}`);
  console.log(`   Execute on Start: ${CONFIG.EXECUTE_ON_START}`);
  console.log(`${'═'.repeat(70)}\n`);
  
  // EJECUTAR INMEDIATAMENTE al iniciar
  if (CONFIG.EXECUTE_ON_START && !state.isDryRun) {
    console.log('[START] 🚀 Ejecutando primera oportunidad inmediatamente...\n');
    await executeBestOpportunity();
  }
  
  // Iniciar loop
  if (timer) clearInterval(timer);
  timer = setInterval(tick, CONFIG.SCAN_INTERVAL_MS);
  
  res.json({
    success: true,
    isRunning: true,
    isDryRun: state.isDryRun,
    mode: 'AGGRESSIVE_EXECUTOR',
    config: CONFIG
  });
});

app.post('/api/defi/multichain-arb/stop', (req, res) => {
  state.isRunning = false;
  if (timer) { clearInterval(timer); timer = null; }
  console.log('\n[STOP] Bot detenido\n');
  res.json({ success: true, isRunning: false });
});

app.post('/api/defi/multichain-arb/execute-now', async (req, res) => {
  console.log('\n[API] Ejecución manual solicitada...\n');
  const result = await executeBestOpportunity();
  res.json({ success: true, result });
});

app.get('/api/defi/multichain-arb/health', (req, res) => {
  res.json({
    status: 'ok',
    mode: 'AGGRESSIVE_EXECUTOR',
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
${'═'.repeat(70)}

   🔥 BOT AGRESIVO - EJECUTOR DE TRANSACCIONES REALES
   
   ✅ Puerto: ${PORT}
   ✅ Wallet: ${WALLET_ADDRESS.slice(0, 10)}...${WALLET_ADDRESS.slice(-5)}
   
   ⚡ Min Profit: $${CONFIG.MIN_PROFIT_USD} (puede ser negativo para pruebas)
   ⚡ Auto Execute: ${CONFIG.AUTO_EXECUTE}
   ⚡ Execute on Start: ${CONFIG.EXECUTE_ON_START}
   
   ⚠️  MODO AGRESIVO - Ejecutará trades reales inmediatamente

${'═'.repeat(70)}
  `);
  
  await init();
  console.log('\n[READY] 🔥 POST /api/defi/multichain-arb/start para iniciar\n');
  console.log('[READY] 🚀 POST /api/defi/multichain-arb/execute-now para ejecutar manualmente\n');
});

process.on('SIGINT', () => {
  if (timer) clearInterval(timer);
  process.exit(0);
});



 * ═══════════════════════════════════════════════════════════════════════════════
 * 🔥 BOT AGRESIVO - EJECUTA TRANSACCIONES REALES
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * Este bot:
 * 1. Ordena oportunidades por mejor profit
 * 2. Ejecuta la MEJOR oportunidad inmediatamente
 * 3. Umbral de profit muy bajo para ejecutar más trades
 * 4. Ejecuta aunque el profit sea pequeño o ligeramente negativo
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
// CONFIGURACIÓN MUY AGRESIVA
// ═══════════════════════════════════════════════════════════════════════════════

const CONFIG = {
  SCAN_INTERVAL_MS: 1000,
  // UMBRAL MUY BAJO - Ejecutar incluso con pequeña pérdida para probar
  MIN_PROFIT_USD: -0.50,          // Acepta hasta $0.50 de pérdida
  MAX_SLIPPAGE_BPS: 100,          // 1% slippage
  AUTO_EXECUTE: true,
  EXECUTE_ON_START: true,         // Ejecutar inmediatamente al iniciar
  ETH_PRICE_USD: 3500,
  TRADE_AMOUNTS: [0.005, 0.01],   // Cantidades pequeñas para pruebas
  FEE_TIERS: [500, 3000]          // Solo 0.05% y 0.3%
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
  mode: 'AGGRESSIVE_EXECUTOR',
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
    currentStrategy: 'IDLE',
    lastOpportunity: null,
    lastTrade: null
  },
  chains: [],
  tradeLogs: [],
  opportunities: [],
  banditStates: [],
  strategies: {
    flashLoan: { enabled: false, scans: 0, opportunities: 0, executions: 0 },
    mev: { enabled: false, scans: 0, opportunities: 0, executions: 0 },
    triangular: { enabled: false, scans: 0, opportunities: 0, executions: 0 },
    simpleArb: { enabled: true, scans: 0, opportunities: 0, executions: 0 },
    crossDex: { enabled: false, scans: 0, opportunities: 0, executions: 0 },
    liquidation: { enabled: false, scans: 0, opportunities: 0, executions: 0 }
  }
};

let timer = null;
let providers = {};
let signers = {};
let contracts = {};
let isExecuting = false;
let currentChainIndex = 0;

// ═══════════════════════════════════════════════════════════════════════════════
// INICIALIZACIÓN
// ═══════════════════════════════════════════════════════════════════════════════

async function init() {
  console.log('\n[INIT] 🔌 Conectando a chains...\n');
  
  for (const [chainKey, chain] of Object.entries(CHAINS)) {
    try {
      const provider = new ethers.JsonRpcProvider(chain.rpc);
      await provider.getBlockNumber();
      
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
        isActive: balanceEth > 0.003,
        explorer: chain.explorer,
        ethPrice: 0,
        connected: true
      });
      
      state.banditStates.push({
        chain: chainKey,
        alpha: 2,
        beta: 2,
        winRate: 50,
        selected: chainKey === 'base'
      });
      
      console.log(`   ✅ ${chain.name}: ${balanceEth.toFixed(6)} ETH ($${(balanceEth * CONFIG.ETH_PRICE_USD).toFixed(2)})`);
    } catch (e) {
      console.error(`   ❌ ${chain.name}: ${e.message}`);
      state.chains.push({
        chain: chainKey,
        name: chain.name,
        connected: false,
        balance: '0',
        balanceUsd: 0,
        isActive: false
      });
    }
  }
  console.log('');
}

// ═══════════════════════════════════════════════════════════════════════════════
// ESCANEO DE OPORTUNIDADES
// ═══════════════════════════════════════════════════════════════════════════════

async function scanAllChains() {
  const allOpportunities = [];
  
  for (const [chainKey, chain] of Object.entries(CHAINS)) {
    if (!providers[chainKey]) continue;
    
    const quoter = contracts[chainKey].quoter;
    const provider = providers[chainKey];
    
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
              const netProfitUsd = parseFloat(ethers.formatEther(netProfit)) * ethPrice;
              const spreadBps = Number((grossProfit * 10000n) / amountWei);
              
              allOpportunities.push({
                chain: chainKey,
                chainName: chain.name,
                strategy: 'SIMPLE_ARB',
                route: `${CONFIG.FEE_TIERS[i]/100}%→${CONFIG.FEE_TIERS[j]/100}%`,
                amountInEth: amountEth,
                amountIn: amountWei,
                fee1: CONFIG.FEE_TIERS[i],
                fee2: CONFIG.FEE_TIERS[j],
                usdcIntermediate: usdcOut,
                wethOut: wethOut,
                spreadBps,
                netProfitUsd,
                gasCostUsd,
                ethPrice,
                profitable: netProfitUsd >= CONFIG.MIN_PROFIT_USD,
                timestamp: Date.now()
              });
              
            } catch (e) {}
          }
        }
      }
    } catch (e) {
      console.error(`[SCAN] Error ${chain.name}: ${e.message.slice(0, 50)}`);
    }
  }
  
  // Ordenar por MEJOR profit (de mayor a menor)
  allOpportunities.sort((a, b) => b.netProfitUsd - a.netProfitUsd);
  
  return allOpportunities;
}

// ═══════════════════════════════════════════════════════════════════════════════
// EJECUCIÓN DE TRADE
// ═══════════════════════════════════════════════════════════════════════════════

async function executeTrade(opp) {
  if (isExecuting) {
    console.log('[EXEC] Ya hay una ejecución en progreso');
    return null;
  }
  
  isExecuting = true;
  
  const chain = CHAINS[opp.chain];
  const signer = signers[opp.chain];
  const provider = providers[opp.chain];
  const { router, weth } = contracts[opp.chain];
  
  console.log(`\n${'═'.repeat(70)}`);
  console.log(`🔥 EJECUTANDO TRADE REAL en ${chain.name.toUpperCase()}`);
  console.log(`${'═'.repeat(70)}`);
  console.log(`   📊 Estrategia: ${opp.strategy}`);
  console.log(`   🔄 Ruta: ${opp.route}`);
  console.log(`   💰 Amount: ${opp.amountInEth} ETH`);
  console.log(`   📈 Expected Profit: $${opp.netProfitUsd.toFixed(4)}`);
  console.log(`   ⛽ Gas estimado: $${opp.gasCostUsd.toFixed(4)}`);
  console.log(`${'─'.repeat(70)}`);
  
  const startTime = Date.now();
  
  try {
    // 1. Verificar balance
    const balance = await provider.getBalance(WALLET_ADDRESS);
    const balanceEth = parseFloat(ethers.formatEther(balance));
    console.log(`   💳 Balance actual: ${balanceEth.toFixed(6)} ETH`);
    
    if (balance < opp.amountIn + ethers.parseEther('0.002')) {
      console.log(`   ❌ Balance insuficiente en ${chain.name}`);
      isExecuting = false;
      return { success: false, error: 'Balance insuficiente' };
    }
    
    // 2. Wrap ETH → WETH
    console.log(`   📦 [1/5] Wrapping ${opp.amountInEth} ETH → WETH...`);
    const wrapTx = await weth.deposit({ 
      value: opp.amountIn, 
      gasLimit: 60000 
    });
    const wrapReceipt = await wrapTx.wait(1);
    console.log(`   ✅ Wrapped! TX: ${wrapReceipt.hash.slice(0, 20)}...`);
    
    // 3. Approve WETH
    const wethAllowance = await weth.allowance(WALLET_ADDRESS, chain.router);
    if (wethAllowance < opp.amountIn) {
      console.log(`   🔓 [2/5] Approving WETH...`);
      const approveTx = await weth.approve(chain.router, ethers.MaxUint256, { gasLimit: 60000 });
      await approveTx.wait(1);
      console.log(`   ✅ WETH Approved!`);
    } else {
      console.log(`   ✅ [2/5] WETH ya aprobado`);
    }
    
    // 4. SWAP 1: WETH → USDC
    console.log(`   🔄 [3/5] Swap WETH → USDC (fee: ${opp.fee1/100}%)...`);
    const minUsdc = (opp.usdcIntermediate * BigInt(10000 - CONFIG.MAX_SLIPPAGE_BPS)) / 10000n;
    
    const swap1Tx = await router.exactInputSingle({
      tokenIn: chain.tokens.WETH,
      tokenOut: chain.tokens.USDC,
      fee: opp.fee1,
      recipient: WALLET_ADDRESS,
      amountIn: opp.amountIn,
      amountOutMinimum: minUsdc,
      sqrtPriceLimitX96: 0n
    }, { gasLimit: 350000 });
    
    const receipt1 = await swap1Tx.wait(1);
    console.log(`   ✅ Swap 1 completado! TX: ${receipt1.hash.slice(0, 20)}...`);
    
    // 5. Obtener balance USDC
    const usdc = new ethers.Contract(chain.tokens.USDC, ERC20_ABI, signer);
    const usdcBalance = await usdc.balanceOf(WALLET_ADDRESS);
    console.log(`   💵 USDC recibido: ${ethers.formatUnits(usdcBalance, 6)}`);
    
    // 6. Approve USDC
    const usdcAllowance = await usdc.allowance(WALLET_ADDRESS, chain.router);
    if (usdcAllowance < usdcBalance) {
      console.log(`   🔓 [4/5] Approving USDC...`);
      const approveUsdcTx = await usdc.approve(chain.router, ethers.MaxUint256, { gasLimit: 60000 });
      await approveUsdcTx.wait(1);
      console.log(`   ✅ USDC Approved!`);
    } else {
      console.log(`   ✅ [4/5] USDC ya aprobado`);
    }
    
    // 7. SWAP 2: USDC → WETH
    console.log(`   🔄 [5/5] Swap USDC → WETH (fee: ${opp.fee2/100}%)...`);
    const minWeth = (opp.wethOut * BigInt(10000 - CONFIG.MAX_SLIPPAGE_BPS)) / 10000n;
    
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
    console.log(`   ✅ Swap 2 completado! TX: ${receipt2.hash.slice(0, 20)}...`);
    
    // 8. Calcular resultado
    const finalWeth = await weth.balanceOf(WALLET_ADDRESS);
    const actualProfit = finalWeth - opp.amountIn;
    const actualProfitUsd = parseFloat(ethers.formatEther(actualProfit)) * opp.ethPrice;
    
    const gas1 = receipt1.gasUsed * receipt1.gasPrice;
    const gas2 = receipt2.gasUsed * receipt2.gasPrice;
    const totalGasWei = gas1 + gas2;
    const totalGasUsd = parseFloat(ethers.formatEther(totalGasWei)) * opp.ethPrice;
    
    const netProfitUsd = actualProfitUsd - totalGasUsd;
    const executionTime = Date.now() - startTime;
    
    console.log(`${'═'.repeat(70)}`);
    console.log(`   🎉 TRADE COMPLETADO!`);
    console.log(`${'─'.repeat(70)}`);
    console.log(`   💰 Profit Bruto: $${actualProfitUsd.toFixed(4)}`);
    console.log(`   ⛽ Gas Total: $${totalGasUsd.toFixed(4)}`);
    console.log(`   💵 Profit Neto: $${netProfitUsd.toFixed(4)} ${netProfitUsd >= 0 ? '✅' : '❌'}`);
    console.log(`   ⏱️  Tiempo: ${executionTime}ms`);
    console.log(`   🔗 TX: ${chain.explorer}/tx/${receipt2.hash}`);
    console.log(`${'═'.repeat(70)}\n`);
    
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
    console.log(`${'═'.repeat(70)}`);
    console.log(`   ❌ ERROR EN TRADE: ${e.message}`);
    console.log(`${'═'.repeat(70)}\n`);
    
    isExecuting = false;
    return { success: false, error: e.message };
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// EJECUTAR MEJOR OPORTUNIDAD
// ═══════════════════════════════════════════════════════════════════════════════

async function executeBestOpportunity() {
  console.log('\n[SCAN] 🔍 Escaneando TODAS las chains para la MEJOR oportunidad...\n');
  
  const opportunities = await scanAllChains();
  
  if (opportunities.length === 0) {
    console.log('[SCAN] No se encontraron oportunidades');
    return null;
  }
  
  // Mostrar top 5 oportunidades
  console.log('\n📊 TOP 5 OPORTUNIDADES (ordenadas por profit):');
  console.log('─'.repeat(70));
  opportunities.slice(0, 5).forEach((opp, i) => {
    const profitColor = opp.netProfitUsd >= 0 ? '\x1b[32m' : '\x1b[31m';
    console.log(`${i + 1}. ${opp.chainName} | ${opp.route} | ${opp.amountInEth} ETH | ${profitColor}$${opp.netProfitUsd.toFixed(4)}\x1b[0m`);
  });
  console.log('─'.repeat(70));
  
  // Guardar oportunidades en estado
  state.opportunities = opportunities.slice(0, 20).map(o => ({
    ...o,
    amountIn: o.amountIn.toString(),
    usdcIntermediate: o.usdcIntermediate.toString(),
    wethOut: o.wethOut.toString()
  }));
  
  // Filtrar las que cumplen el umbral
  const executableOpps = opportunities.filter(o => o.netProfitUsd >= CONFIG.MIN_PROFIT_USD);
  
  if (executableOpps.length === 0) {
    console.log(`\n[EXEC] ⚠️ Ninguna oportunidad supera el umbral de $${CONFIG.MIN_PROFIT_USD}`);
    console.log(`[EXEC] La mejor tiene $${opportunities[0].netProfitUsd.toFixed(4)}`);
    return null;
  }
  
  // Ejecutar la MEJOR
  const best = executableOpps[0];
  console.log(`\n[EXEC] 🎯 Ejecutando MEJOR oportunidad: ${best.chainName} | ${best.route} | $${best.netProfitUsd.toFixed(4)}`);
  
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
      state.stats.totalProfitUsd += result.profitUsd || 0;
      state.stats.totalGasUsd += result.gasUsd || 0;
      state.stats.netProfitUsd = state.stats.totalProfitUsd - state.stats.totalGasUsd;
      state.stats.lastTrade = tradeLog;
    }
    
    state.stats.winRate = state.stats.tradesExecuted > 0
      ? (state.stats.tradesSuccessful / state.stats.tradesExecuted) * 100
      : 0;
  }
  
  return result;
}

// ═══════════════════════════════════════════════════════════════════════════════
// LOOP PRINCIPAL
// ═══════════════════════════════════════════════════════════════════════════════

async function tick() {
  if (!state.isRunning || isExecuting) return;
  
  state.stats.totalScans++;
  state.stats.uptime = Math.floor((Date.now() - state.startTime) / 1000);
  state.stats.currentStrategy = 'SCANNING';
  
  await executeBestOpportunity();
}

// ═══════════════════════════════════════════════════════════════════════════════
// API
// ═══════════════════════════════════════════════════════════════════════════════

app.get('/api/defi/multichain-arb/status', (req, res) => {
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
  
  // Reset stats
  state.stats = {
    totalScans: 0, opportunitiesFound: 0, tradesAttempted: 0, tradesExecuted: 0,
    tradesSuccessful: 0, totalProfitUsd: 0, totalGasUsd: 0, netProfitUsd: 0,
    winRate: 0, avgScanTimeMs: 0, scansPerSecond: 0, uptime: 0,
    currentChain: 'base', currentStrategy: 'STARTING', lastOpportunity: null, lastTrade: null
  };
  state.tradeLogs = [];
  state.opportunities = [];
  
  console.log(`\n${'═'.repeat(70)}`);
  console.log(`🔥 BOT AGRESIVO INICIADO - ${state.isDryRun ? 'DRY RUN' : '⚠️ MODO REAL - EJECUTANDO TRADES'}`);
  console.log(`${'═'.repeat(70)}`);
  console.log(`   Min Profit: $${CONFIG.MIN_PROFIT_USD}`);
  console.log(`   Auto Execute: ${CONFIG.AUTO_EXECUTE}`);
  console.log(`   Execute on Start: ${CONFIG.EXECUTE_ON_START}`);
  console.log(`${'═'.repeat(70)}\n`);
  
  // EJECUTAR INMEDIATAMENTE al iniciar
  if (CONFIG.EXECUTE_ON_START && !state.isDryRun) {
    console.log('[START] 🚀 Ejecutando primera oportunidad inmediatamente...\n');
    await executeBestOpportunity();
  }
  
  // Iniciar loop
  if (timer) clearInterval(timer);
  timer = setInterval(tick, CONFIG.SCAN_INTERVAL_MS);
  
  res.json({
    success: true,
    isRunning: true,
    isDryRun: state.isDryRun,
    mode: 'AGGRESSIVE_EXECUTOR',
    config: CONFIG
  });
});

app.post('/api/defi/multichain-arb/stop', (req, res) => {
  state.isRunning = false;
  if (timer) { clearInterval(timer); timer = null; }
  console.log('\n[STOP] Bot detenido\n');
  res.json({ success: true, isRunning: false });
});

app.post('/api/defi/multichain-arb/execute-now', async (req, res) => {
  console.log('\n[API] Ejecución manual solicitada...\n');
  const result = await executeBestOpportunity();
  res.json({ success: true, result });
});

app.get('/api/defi/multichain-arb/health', (req, res) => {
  res.json({
    status: 'ok',
    mode: 'AGGRESSIVE_EXECUTOR',
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
${'═'.repeat(70)}

   🔥 BOT AGRESIVO - EJECUTOR DE TRANSACCIONES REALES
   
   ✅ Puerto: ${PORT}
   ✅ Wallet: ${WALLET_ADDRESS.slice(0, 10)}...${WALLET_ADDRESS.slice(-5)}
   
   ⚡ Min Profit: $${CONFIG.MIN_PROFIT_USD} (puede ser negativo para pruebas)
   ⚡ Auto Execute: ${CONFIG.AUTO_EXECUTE}
   ⚡ Execute on Start: ${CONFIG.EXECUTE_ON_START}
   
   ⚠️  MODO AGRESIVO - Ejecutará trades reales inmediatamente

${'═'.repeat(70)}
  `);
  
  await init();
  console.log('\n[READY] 🔥 POST /api/defi/multichain-arb/start para iniciar\n');
  console.log('[READY] 🚀 POST /api/defi/multichain-arb/execute-now para ejecutar manualmente\n');
});

process.on('SIGINT', () => {
  if (timer) clearInterval(timer);
  process.exit(0);
});



 * ═══════════════════════════════════════════════════════════════════════════════
 * 🔥 BOT AGRESIVO - EJECUTA TRANSACCIONES REALES
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * Este bot:
 * 1. Ordena oportunidades por mejor profit
 * 2. Ejecuta la MEJOR oportunidad inmediatamente
 * 3. Umbral de profit muy bajo para ejecutar más trades
 * 4. Ejecuta aunque el profit sea pequeño o ligeramente negativo
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
// CONFIGURACIÓN MUY AGRESIVA
// ═══════════════════════════════════════════════════════════════════════════════

const CONFIG = {
  SCAN_INTERVAL_MS: 1000,
  // UMBRAL MUY BAJO - Ejecutar incluso con pequeña pérdida para probar
  MIN_PROFIT_USD: -0.50,          // Acepta hasta $0.50 de pérdida
  MAX_SLIPPAGE_BPS: 100,          // 1% slippage
  AUTO_EXECUTE: true,
  EXECUTE_ON_START: true,         // Ejecutar inmediatamente al iniciar
  ETH_PRICE_USD: 3500,
  TRADE_AMOUNTS: [0.005, 0.01],   // Cantidades pequeñas para pruebas
  FEE_TIERS: [500, 3000]          // Solo 0.05% y 0.3%
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
  mode: 'AGGRESSIVE_EXECUTOR',
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
    currentStrategy: 'IDLE',
    lastOpportunity: null,
    lastTrade: null
  },
  chains: [],
  tradeLogs: [],
  opportunities: [],
  banditStates: [],
  strategies: {
    flashLoan: { enabled: false, scans: 0, opportunities: 0, executions: 0 },
    mev: { enabled: false, scans: 0, opportunities: 0, executions: 0 },
    triangular: { enabled: false, scans: 0, opportunities: 0, executions: 0 },
    simpleArb: { enabled: true, scans: 0, opportunities: 0, executions: 0 },
    crossDex: { enabled: false, scans: 0, opportunities: 0, executions: 0 },
    liquidation: { enabled: false, scans: 0, opportunities: 0, executions: 0 }
  }
};

let timer = null;
let providers = {};
let signers = {};
let contracts = {};
let isExecuting = false;
let currentChainIndex = 0;

// ═══════════════════════════════════════════════════════════════════════════════
// INICIALIZACIÓN
// ═══════════════════════════════════════════════════════════════════════════════

async function init() {
  console.log('\n[INIT] 🔌 Conectando a chains...\n');
  
  for (const [chainKey, chain] of Object.entries(CHAINS)) {
    try {
      const provider = new ethers.JsonRpcProvider(chain.rpc);
      await provider.getBlockNumber();
      
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
        isActive: balanceEth > 0.003,
        explorer: chain.explorer,
        ethPrice: 0,
        connected: true
      });
      
      state.banditStates.push({
        chain: chainKey,
        alpha: 2,
        beta: 2,
        winRate: 50,
        selected: chainKey === 'base'
      });
      
      console.log(`   ✅ ${chain.name}: ${balanceEth.toFixed(6)} ETH ($${(balanceEth * CONFIG.ETH_PRICE_USD).toFixed(2)})`);
    } catch (e) {
      console.error(`   ❌ ${chain.name}: ${e.message}`);
      state.chains.push({
        chain: chainKey,
        name: chain.name,
        connected: false,
        balance: '0',
        balanceUsd: 0,
        isActive: false
      });
    }
  }
  console.log('');
}

// ═══════════════════════════════════════════════════════════════════════════════
// ESCANEO DE OPORTUNIDADES
// ═══════════════════════════════════════════════════════════════════════════════

async function scanAllChains() {
  const allOpportunities = [];
  
  for (const [chainKey, chain] of Object.entries(CHAINS)) {
    if (!providers[chainKey]) continue;
    
    const quoter = contracts[chainKey].quoter;
    const provider = providers[chainKey];
    
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
              const netProfitUsd = parseFloat(ethers.formatEther(netProfit)) * ethPrice;
              const spreadBps = Number((grossProfit * 10000n) / amountWei);
              
              allOpportunities.push({
                chain: chainKey,
                chainName: chain.name,
                strategy: 'SIMPLE_ARB',
                route: `${CONFIG.FEE_TIERS[i]/100}%→${CONFIG.FEE_TIERS[j]/100}%`,
                amountInEth: amountEth,
                amountIn: amountWei,
                fee1: CONFIG.FEE_TIERS[i],
                fee2: CONFIG.FEE_TIERS[j],
                usdcIntermediate: usdcOut,
                wethOut: wethOut,
                spreadBps,
                netProfitUsd,
                gasCostUsd,
                ethPrice,
                profitable: netProfitUsd >= CONFIG.MIN_PROFIT_USD,
                timestamp: Date.now()
              });
              
            } catch (e) {}
          }
        }
      }
    } catch (e) {
      console.error(`[SCAN] Error ${chain.name}: ${e.message.slice(0, 50)}`);
    }
  }
  
  // Ordenar por MEJOR profit (de mayor a menor)
  allOpportunities.sort((a, b) => b.netProfitUsd - a.netProfitUsd);
  
  return allOpportunities;
}

// ═══════════════════════════════════════════════════════════════════════════════
// EJECUCIÓN DE TRADE
// ═══════════════════════════════════════════════════════════════════════════════

async function executeTrade(opp) {
  if (isExecuting) {
    console.log('[EXEC] Ya hay una ejecución en progreso');
    return null;
  }
  
  isExecuting = true;
  
  const chain = CHAINS[opp.chain];
  const signer = signers[opp.chain];
  const provider = providers[opp.chain];
  const { router, weth } = contracts[opp.chain];
  
  console.log(`\n${'═'.repeat(70)}`);
  console.log(`🔥 EJECUTANDO TRADE REAL en ${chain.name.toUpperCase()}`);
  console.log(`${'═'.repeat(70)}`);
  console.log(`   📊 Estrategia: ${opp.strategy}`);
  console.log(`   🔄 Ruta: ${opp.route}`);
  console.log(`   💰 Amount: ${opp.amountInEth} ETH`);
  console.log(`   📈 Expected Profit: $${opp.netProfitUsd.toFixed(4)}`);
  console.log(`   ⛽ Gas estimado: $${opp.gasCostUsd.toFixed(4)}`);
  console.log(`${'─'.repeat(70)}`);
  
  const startTime = Date.now();
  
  try {
    // 1. Verificar balance
    const balance = await provider.getBalance(WALLET_ADDRESS);
    const balanceEth = parseFloat(ethers.formatEther(balance));
    console.log(`   💳 Balance actual: ${balanceEth.toFixed(6)} ETH`);
    
    if (balance < opp.amountIn + ethers.parseEther('0.002')) {
      console.log(`   ❌ Balance insuficiente en ${chain.name}`);
      isExecuting = false;
      return { success: false, error: 'Balance insuficiente' };
    }
    
    // 2. Wrap ETH → WETH
    console.log(`   📦 [1/5] Wrapping ${opp.amountInEth} ETH → WETH...`);
    const wrapTx = await weth.deposit({ 
      value: opp.amountIn, 
      gasLimit: 60000 
    });
    const wrapReceipt = await wrapTx.wait(1);
    console.log(`   ✅ Wrapped! TX: ${wrapReceipt.hash.slice(0, 20)}...`);
    
    // 3. Approve WETH
    const wethAllowance = await weth.allowance(WALLET_ADDRESS, chain.router);
    if (wethAllowance < opp.amountIn) {
      console.log(`   🔓 [2/5] Approving WETH...`);
      const approveTx = await weth.approve(chain.router, ethers.MaxUint256, { gasLimit: 60000 });
      await approveTx.wait(1);
      console.log(`   ✅ WETH Approved!`);
    } else {
      console.log(`   ✅ [2/5] WETH ya aprobado`);
    }
    
    // 4. SWAP 1: WETH → USDC
    console.log(`   🔄 [3/5] Swap WETH → USDC (fee: ${opp.fee1/100}%)...`);
    const minUsdc = (opp.usdcIntermediate * BigInt(10000 - CONFIG.MAX_SLIPPAGE_BPS)) / 10000n;
    
    const swap1Tx = await router.exactInputSingle({
      tokenIn: chain.tokens.WETH,
      tokenOut: chain.tokens.USDC,
      fee: opp.fee1,
      recipient: WALLET_ADDRESS,
      amountIn: opp.amountIn,
      amountOutMinimum: minUsdc,
      sqrtPriceLimitX96: 0n
    }, { gasLimit: 350000 });
    
    const receipt1 = await swap1Tx.wait(1);
    console.log(`   ✅ Swap 1 completado! TX: ${receipt1.hash.slice(0, 20)}...`);
    
    // 5. Obtener balance USDC
    const usdc = new ethers.Contract(chain.tokens.USDC, ERC20_ABI, signer);
    const usdcBalance = await usdc.balanceOf(WALLET_ADDRESS);
    console.log(`   💵 USDC recibido: ${ethers.formatUnits(usdcBalance, 6)}`);
    
    // 6. Approve USDC
    const usdcAllowance = await usdc.allowance(WALLET_ADDRESS, chain.router);
    if (usdcAllowance < usdcBalance) {
      console.log(`   🔓 [4/5] Approving USDC...`);
      const approveUsdcTx = await usdc.approve(chain.router, ethers.MaxUint256, { gasLimit: 60000 });
      await approveUsdcTx.wait(1);
      console.log(`   ✅ USDC Approved!`);
    } else {
      console.log(`   ✅ [4/5] USDC ya aprobado`);
    }
    
    // 7. SWAP 2: USDC → WETH
    console.log(`   🔄 [5/5] Swap USDC → WETH (fee: ${opp.fee2/100}%)...`);
    const minWeth = (opp.wethOut * BigInt(10000 - CONFIG.MAX_SLIPPAGE_BPS)) / 10000n;
    
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
    console.log(`   ✅ Swap 2 completado! TX: ${receipt2.hash.slice(0, 20)}...`);
    
    // 8. Calcular resultado
    const finalWeth = await weth.balanceOf(WALLET_ADDRESS);
    const actualProfit = finalWeth - opp.amountIn;
    const actualProfitUsd = parseFloat(ethers.formatEther(actualProfit)) * opp.ethPrice;
    
    const gas1 = receipt1.gasUsed * receipt1.gasPrice;
    const gas2 = receipt2.gasUsed * receipt2.gasPrice;
    const totalGasWei = gas1 + gas2;
    const totalGasUsd = parseFloat(ethers.formatEther(totalGasWei)) * opp.ethPrice;
    
    const netProfitUsd = actualProfitUsd - totalGasUsd;
    const executionTime = Date.now() - startTime;
    
    console.log(`${'═'.repeat(70)}`);
    console.log(`   🎉 TRADE COMPLETADO!`);
    console.log(`${'─'.repeat(70)}`);
    console.log(`   💰 Profit Bruto: $${actualProfitUsd.toFixed(4)}`);
    console.log(`   ⛽ Gas Total: $${totalGasUsd.toFixed(4)}`);
    console.log(`   💵 Profit Neto: $${netProfitUsd.toFixed(4)} ${netProfitUsd >= 0 ? '✅' : '❌'}`);
    console.log(`   ⏱️  Tiempo: ${executionTime}ms`);
    console.log(`   🔗 TX: ${chain.explorer}/tx/${receipt2.hash}`);
    console.log(`${'═'.repeat(70)}\n`);
    
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
    console.log(`${'═'.repeat(70)}`);
    console.log(`   ❌ ERROR EN TRADE: ${e.message}`);
    console.log(`${'═'.repeat(70)}\n`);
    
    isExecuting = false;
    return { success: false, error: e.message };
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// EJECUTAR MEJOR OPORTUNIDAD
// ═══════════════════════════════════════════════════════════════════════════════

async function executeBestOpportunity() {
  console.log('\n[SCAN] 🔍 Escaneando TODAS las chains para la MEJOR oportunidad...\n');
  
  const opportunities = await scanAllChains();
  
  if (opportunities.length === 0) {
    console.log('[SCAN] No se encontraron oportunidades');
    return null;
  }
  
  // Mostrar top 5 oportunidades
  console.log('\n📊 TOP 5 OPORTUNIDADES (ordenadas por profit):');
  console.log('─'.repeat(70));
  opportunities.slice(0, 5).forEach((opp, i) => {
    const profitColor = opp.netProfitUsd >= 0 ? '\x1b[32m' : '\x1b[31m';
    console.log(`${i + 1}. ${opp.chainName} | ${opp.route} | ${opp.amountInEth} ETH | ${profitColor}$${opp.netProfitUsd.toFixed(4)}\x1b[0m`);
  });
  console.log('─'.repeat(70));
  
  // Guardar oportunidades en estado
  state.opportunities = opportunities.slice(0, 20).map(o => ({
    ...o,
    amountIn: o.amountIn.toString(),
    usdcIntermediate: o.usdcIntermediate.toString(),
    wethOut: o.wethOut.toString()
  }));
  
  // Filtrar las que cumplen el umbral
  const executableOpps = opportunities.filter(o => o.netProfitUsd >= CONFIG.MIN_PROFIT_USD);
  
  if (executableOpps.length === 0) {
    console.log(`\n[EXEC] ⚠️ Ninguna oportunidad supera el umbral de $${CONFIG.MIN_PROFIT_USD}`);
    console.log(`[EXEC] La mejor tiene $${opportunities[0].netProfitUsd.toFixed(4)}`);
    return null;
  }
  
  // Ejecutar la MEJOR
  const best = executableOpps[0];
  console.log(`\n[EXEC] 🎯 Ejecutando MEJOR oportunidad: ${best.chainName} | ${best.route} | $${best.netProfitUsd.toFixed(4)}`);
  
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
      state.stats.totalProfitUsd += result.profitUsd || 0;
      state.stats.totalGasUsd += result.gasUsd || 0;
      state.stats.netProfitUsd = state.stats.totalProfitUsd - state.stats.totalGasUsd;
      state.stats.lastTrade = tradeLog;
    }
    
    state.stats.winRate = state.stats.tradesExecuted > 0
      ? (state.stats.tradesSuccessful / state.stats.tradesExecuted) * 100
      : 0;
  }
  
  return result;
}

// ═══════════════════════════════════════════════════════════════════════════════
// LOOP PRINCIPAL
// ═══════════════════════════════════════════════════════════════════════════════

async function tick() {
  if (!state.isRunning || isExecuting) return;
  
  state.stats.totalScans++;
  state.stats.uptime = Math.floor((Date.now() - state.startTime) / 1000);
  state.stats.currentStrategy = 'SCANNING';
  
  await executeBestOpportunity();
}

// ═══════════════════════════════════════════════════════════════════════════════
// API
// ═══════════════════════════════════════════════════════════════════════════════

app.get('/api/defi/multichain-arb/status', (req, res) => {
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
  
  // Reset stats
  state.stats = {
    totalScans: 0, opportunitiesFound: 0, tradesAttempted: 0, tradesExecuted: 0,
    tradesSuccessful: 0, totalProfitUsd: 0, totalGasUsd: 0, netProfitUsd: 0,
    winRate: 0, avgScanTimeMs: 0, scansPerSecond: 0, uptime: 0,
    currentChain: 'base', currentStrategy: 'STARTING', lastOpportunity: null, lastTrade: null
  };
  state.tradeLogs = [];
  state.opportunities = [];
  
  console.log(`\n${'═'.repeat(70)}`);
  console.log(`🔥 BOT AGRESIVO INICIADO - ${state.isDryRun ? 'DRY RUN' : '⚠️ MODO REAL - EJECUTANDO TRADES'}`);
  console.log(`${'═'.repeat(70)}`);
  console.log(`   Min Profit: $${CONFIG.MIN_PROFIT_USD}`);
  console.log(`   Auto Execute: ${CONFIG.AUTO_EXECUTE}`);
  console.log(`   Execute on Start: ${CONFIG.EXECUTE_ON_START}`);
  console.log(`${'═'.repeat(70)}\n`);
  
  // EJECUTAR INMEDIATAMENTE al iniciar
  if (CONFIG.EXECUTE_ON_START && !state.isDryRun) {
    console.log('[START] 🚀 Ejecutando primera oportunidad inmediatamente...\n');
    await executeBestOpportunity();
  }
  
  // Iniciar loop
  if (timer) clearInterval(timer);
  timer = setInterval(tick, CONFIG.SCAN_INTERVAL_MS);
  
  res.json({
    success: true,
    isRunning: true,
    isDryRun: state.isDryRun,
    mode: 'AGGRESSIVE_EXECUTOR',
    config: CONFIG
  });
});

app.post('/api/defi/multichain-arb/stop', (req, res) => {
  state.isRunning = false;
  if (timer) { clearInterval(timer); timer = null; }
  console.log('\n[STOP] Bot detenido\n');
  res.json({ success: true, isRunning: false });
});

app.post('/api/defi/multichain-arb/execute-now', async (req, res) => {
  console.log('\n[API] Ejecución manual solicitada...\n');
  const result = await executeBestOpportunity();
  res.json({ success: true, result });
});

app.get('/api/defi/multichain-arb/health', (req, res) => {
  res.json({
    status: 'ok',
    mode: 'AGGRESSIVE_EXECUTOR',
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
${'═'.repeat(70)}

   🔥 BOT AGRESIVO - EJECUTOR DE TRANSACCIONES REALES
   
   ✅ Puerto: ${PORT}
   ✅ Wallet: ${WALLET_ADDRESS.slice(0, 10)}...${WALLET_ADDRESS.slice(-5)}
   
   ⚡ Min Profit: $${CONFIG.MIN_PROFIT_USD} (puede ser negativo para pruebas)
   ⚡ Auto Execute: ${CONFIG.AUTO_EXECUTE}
   ⚡ Execute on Start: ${CONFIG.EXECUTE_ON_START}
   
   ⚠️  MODO AGRESIVO - Ejecutará trades reales inmediatamente

${'═'.repeat(70)}
  `);
  
  await init();
  console.log('\n[READY] 🔥 POST /api/defi/multichain-arb/start para iniciar\n');
  console.log('[READY] 🚀 POST /api/defi/multichain-arb/execute-now para ejecutar manualmente\n');
});

process.on('SIGINT', () => {
  if (timer) clearInterval(timer);
  process.exit(0);
});


 * ═══════════════════════════════════════════════════════════════════════════════
 * 🔥 BOT AGRESIVO - EJECUTA TRANSACCIONES REALES
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * Este bot:
 * 1. Ordena oportunidades por mejor profit
 * 2. Ejecuta la MEJOR oportunidad inmediatamente
 * 3. Umbral de profit muy bajo para ejecutar más trades
 * 4. Ejecuta aunque el profit sea pequeño o ligeramente negativo
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
// CONFIGURACIÓN MUY AGRESIVA
// ═══════════════════════════════════════════════════════════════════════════════

const CONFIG = {
  SCAN_INTERVAL_MS: 1000,
  // UMBRAL MUY BAJO - Ejecutar incluso con pequeña pérdida para probar
  MIN_PROFIT_USD: -0.50,          // Acepta hasta $0.50 de pérdida
  MAX_SLIPPAGE_BPS: 100,          // 1% slippage
  AUTO_EXECUTE: true,
  EXECUTE_ON_START: true,         // Ejecutar inmediatamente al iniciar
  ETH_PRICE_USD: 3500,
  TRADE_AMOUNTS: [0.005, 0.01],   // Cantidades pequeñas para pruebas
  FEE_TIERS: [500, 3000]          // Solo 0.05% y 0.3%
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
  mode: 'AGGRESSIVE_EXECUTOR',
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
    currentStrategy: 'IDLE',
    lastOpportunity: null,
    lastTrade: null
  },
  chains: [],
  tradeLogs: [],
  opportunities: [],
  banditStates: [],
  strategies: {
    flashLoan: { enabled: false, scans: 0, opportunities: 0, executions: 0 },
    mev: { enabled: false, scans: 0, opportunities: 0, executions: 0 },
    triangular: { enabled: false, scans: 0, opportunities: 0, executions: 0 },
    simpleArb: { enabled: true, scans: 0, opportunities: 0, executions: 0 },
    crossDex: { enabled: false, scans: 0, opportunities: 0, executions: 0 },
    liquidation: { enabled: false, scans: 0, opportunities: 0, executions: 0 }
  }
};

let timer = null;
let providers = {};
let signers = {};
let contracts = {};
let isExecuting = false;
let currentChainIndex = 0;

// ═══════════════════════════════════════════════════════════════════════════════
// INICIALIZACIÓN
// ═══════════════════════════════════════════════════════════════════════════════

async function init() {
  console.log('\n[INIT] 🔌 Conectando a chains...\n');
  
  for (const [chainKey, chain] of Object.entries(CHAINS)) {
    try {
      const provider = new ethers.JsonRpcProvider(chain.rpc);
      await provider.getBlockNumber();
      
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
        isActive: balanceEth > 0.003,
        explorer: chain.explorer,
        ethPrice: 0,
        connected: true
      });
      
      state.banditStates.push({
        chain: chainKey,
        alpha: 2,
        beta: 2,
        winRate: 50,
        selected: chainKey === 'base'
      });
      
      console.log(`   ✅ ${chain.name}: ${balanceEth.toFixed(6)} ETH ($${(balanceEth * CONFIG.ETH_PRICE_USD).toFixed(2)})`);
    } catch (e) {
      console.error(`   ❌ ${chain.name}: ${e.message}`);
      state.chains.push({
        chain: chainKey,
        name: chain.name,
        connected: false,
        balance: '0',
        balanceUsd: 0,
        isActive: false
      });
    }
  }
  console.log('');
}

// ═══════════════════════════════════════════════════════════════════════════════
// ESCANEO DE OPORTUNIDADES
// ═══════════════════════════════════════════════════════════════════════════════

async function scanAllChains() {
  const allOpportunities = [];
  
  for (const [chainKey, chain] of Object.entries(CHAINS)) {
    if (!providers[chainKey]) continue;
    
    const quoter = contracts[chainKey].quoter;
    const provider = providers[chainKey];
    
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
              const netProfitUsd = parseFloat(ethers.formatEther(netProfit)) * ethPrice;
              const spreadBps = Number((grossProfit * 10000n) / amountWei);
              
              allOpportunities.push({
                chain: chainKey,
                chainName: chain.name,
                strategy: 'SIMPLE_ARB',
                route: `${CONFIG.FEE_TIERS[i]/100}%→${CONFIG.FEE_TIERS[j]/100}%`,
                amountInEth: amountEth,
                amountIn: amountWei,
                fee1: CONFIG.FEE_TIERS[i],
                fee2: CONFIG.FEE_TIERS[j],
                usdcIntermediate: usdcOut,
                wethOut: wethOut,
                spreadBps,
                netProfitUsd,
                gasCostUsd,
                ethPrice,
                profitable: netProfitUsd >= CONFIG.MIN_PROFIT_USD,
                timestamp: Date.now()
              });
              
            } catch (e) {}
          }
        }
      }
    } catch (e) {
      console.error(`[SCAN] Error ${chain.name}: ${e.message.slice(0, 50)}`);
    }
  }
  
  // Ordenar por MEJOR profit (de mayor a menor)
  allOpportunities.sort((a, b) => b.netProfitUsd - a.netProfitUsd);
  
  return allOpportunities;
}

// ═══════════════════════════════════════════════════════════════════════════════
// EJECUCIÓN DE TRADE
// ═══════════════════════════════════════════════════════════════════════════════

async function executeTrade(opp) {
  if (isExecuting) {
    console.log('[EXEC] Ya hay una ejecución en progreso');
    return null;
  }
  
  isExecuting = true;
  
  const chain = CHAINS[opp.chain];
  const signer = signers[opp.chain];
  const provider = providers[opp.chain];
  const { router, weth } = contracts[opp.chain];
  
  console.log(`\n${'═'.repeat(70)}`);
  console.log(`🔥 EJECUTANDO TRADE REAL en ${chain.name.toUpperCase()}`);
  console.log(`${'═'.repeat(70)}`);
  console.log(`   📊 Estrategia: ${opp.strategy}`);
  console.log(`   🔄 Ruta: ${opp.route}`);
  console.log(`   💰 Amount: ${opp.amountInEth} ETH`);
  console.log(`   📈 Expected Profit: $${opp.netProfitUsd.toFixed(4)}`);
  console.log(`   ⛽ Gas estimado: $${opp.gasCostUsd.toFixed(4)}`);
  console.log(`${'─'.repeat(70)}`);
  
  const startTime = Date.now();
  
  try {
    // 1. Verificar balance
    const balance = await provider.getBalance(WALLET_ADDRESS);
    const balanceEth = parseFloat(ethers.formatEther(balance));
    console.log(`   💳 Balance actual: ${balanceEth.toFixed(6)} ETH`);
    
    if (balance < opp.amountIn + ethers.parseEther('0.002')) {
      console.log(`   ❌ Balance insuficiente en ${chain.name}`);
      isExecuting = false;
      return { success: false, error: 'Balance insuficiente' };
    }
    
    // 2. Wrap ETH → WETH
    console.log(`   📦 [1/5] Wrapping ${opp.amountInEth} ETH → WETH...`);
    const wrapTx = await weth.deposit({ 
      value: opp.amountIn, 
      gasLimit: 60000 
    });
    const wrapReceipt = await wrapTx.wait(1);
    console.log(`   ✅ Wrapped! TX: ${wrapReceipt.hash.slice(0, 20)}...`);
    
    // 3. Approve WETH
    const wethAllowance = await weth.allowance(WALLET_ADDRESS, chain.router);
    if (wethAllowance < opp.amountIn) {
      console.log(`   🔓 [2/5] Approving WETH...`);
      const approveTx = await weth.approve(chain.router, ethers.MaxUint256, { gasLimit: 60000 });
      await approveTx.wait(1);
      console.log(`   ✅ WETH Approved!`);
    } else {
      console.log(`   ✅ [2/5] WETH ya aprobado`);
    }
    
    // 4. SWAP 1: WETH → USDC
    console.log(`   🔄 [3/5] Swap WETH → USDC (fee: ${opp.fee1/100}%)...`);
    const minUsdc = (opp.usdcIntermediate * BigInt(10000 - CONFIG.MAX_SLIPPAGE_BPS)) / 10000n;
    
    const swap1Tx = await router.exactInputSingle({
      tokenIn: chain.tokens.WETH,
      tokenOut: chain.tokens.USDC,
      fee: opp.fee1,
      recipient: WALLET_ADDRESS,
      amountIn: opp.amountIn,
      amountOutMinimum: minUsdc,
      sqrtPriceLimitX96: 0n
    }, { gasLimit: 350000 });
    
    const receipt1 = await swap1Tx.wait(1);
    console.log(`   ✅ Swap 1 completado! TX: ${receipt1.hash.slice(0, 20)}...`);
    
    // 5. Obtener balance USDC
    const usdc = new ethers.Contract(chain.tokens.USDC, ERC20_ABI, signer);
    const usdcBalance = await usdc.balanceOf(WALLET_ADDRESS);
    console.log(`   💵 USDC recibido: ${ethers.formatUnits(usdcBalance, 6)}`);
    
    // 6. Approve USDC
    const usdcAllowance = await usdc.allowance(WALLET_ADDRESS, chain.router);
    if (usdcAllowance < usdcBalance) {
      console.log(`   🔓 [4/5] Approving USDC...`);
      const approveUsdcTx = await usdc.approve(chain.router, ethers.MaxUint256, { gasLimit: 60000 });
      await approveUsdcTx.wait(1);
      console.log(`   ✅ USDC Approved!`);
    } else {
      console.log(`   ✅ [4/5] USDC ya aprobado`);
    }
    
    // 7. SWAP 2: USDC → WETH
    console.log(`   🔄 [5/5] Swap USDC → WETH (fee: ${opp.fee2/100}%)...`);
    const minWeth = (opp.wethOut * BigInt(10000 - CONFIG.MAX_SLIPPAGE_BPS)) / 10000n;
    
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
    console.log(`   ✅ Swap 2 completado! TX: ${receipt2.hash.slice(0, 20)}...`);
    
    // 8. Calcular resultado
    const finalWeth = await weth.balanceOf(WALLET_ADDRESS);
    const actualProfit = finalWeth - opp.amountIn;
    const actualProfitUsd = parseFloat(ethers.formatEther(actualProfit)) * opp.ethPrice;
    
    const gas1 = receipt1.gasUsed * receipt1.gasPrice;
    const gas2 = receipt2.gasUsed * receipt2.gasPrice;
    const totalGasWei = gas1 + gas2;
    const totalGasUsd = parseFloat(ethers.formatEther(totalGasWei)) * opp.ethPrice;
    
    const netProfitUsd = actualProfitUsd - totalGasUsd;
    const executionTime = Date.now() - startTime;
    
    console.log(`${'═'.repeat(70)}`);
    console.log(`   🎉 TRADE COMPLETADO!`);
    console.log(`${'─'.repeat(70)}`);
    console.log(`   💰 Profit Bruto: $${actualProfitUsd.toFixed(4)}`);
    console.log(`   ⛽ Gas Total: $${totalGasUsd.toFixed(4)}`);
    console.log(`   💵 Profit Neto: $${netProfitUsd.toFixed(4)} ${netProfitUsd >= 0 ? '✅' : '❌'}`);
    console.log(`   ⏱️  Tiempo: ${executionTime}ms`);
    console.log(`   🔗 TX: ${chain.explorer}/tx/${receipt2.hash}`);
    console.log(`${'═'.repeat(70)}\n`);
    
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
    console.log(`${'═'.repeat(70)}`);
    console.log(`   ❌ ERROR EN TRADE: ${e.message}`);
    console.log(`${'═'.repeat(70)}\n`);
    
    isExecuting = false;
    return { success: false, error: e.message };
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// EJECUTAR MEJOR OPORTUNIDAD
// ═══════════════════════════════════════════════════════════════════════════════

async function executeBestOpportunity() {
  console.log('\n[SCAN] 🔍 Escaneando TODAS las chains para la MEJOR oportunidad...\n');
  
  const opportunities = await scanAllChains();
  
  if (opportunities.length === 0) {
    console.log('[SCAN] No se encontraron oportunidades');
    return null;
  }
  
  // Mostrar top 5 oportunidades
  console.log('\n📊 TOP 5 OPORTUNIDADES (ordenadas por profit):');
  console.log('─'.repeat(70));
  opportunities.slice(0, 5).forEach((opp, i) => {
    const profitColor = opp.netProfitUsd >= 0 ? '\x1b[32m' : '\x1b[31m';
    console.log(`${i + 1}. ${opp.chainName} | ${opp.route} | ${opp.amountInEth} ETH | ${profitColor}$${opp.netProfitUsd.toFixed(4)}\x1b[0m`);
  });
  console.log('─'.repeat(70));
  
  // Guardar oportunidades en estado
  state.opportunities = opportunities.slice(0, 20).map(o => ({
    ...o,
    amountIn: o.amountIn.toString(),
    usdcIntermediate: o.usdcIntermediate.toString(),
    wethOut: o.wethOut.toString()
  }));
  
  // Filtrar las que cumplen el umbral
  const executableOpps = opportunities.filter(o => o.netProfitUsd >= CONFIG.MIN_PROFIT_USD);
  
  if (executableOpps.length === 0) {
    console.log(`\n[EXEC] ⚠️ Ninguna oportunidad supera el umbral de $${CONFIG.MIN_PROFIT_USD}`);
    console.log(`[EXEC] La mejor tiene $${opportunities[0].netProfitUsd.toFixed(4)}`);
    return null;
  }
  
  // Ejecutar la MEJOR
  const best = executableOpps[0];
  console.log(`\n[EXEC] 🎯 Ejecutando MEJOR oportunidad: ${best.chainName} | ${best.route} | $${best.netProfitUsd.toFixed(4)}`);
  
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
      state.stats.totalProfitUsd += result.profitUsd || 0;
      state.stats.totalGasUsd += result.gasUsd || 0;
      state.stats.netProfitUsd = state.stats.totalProfitUsd - state.stats.totalGasUsd;
      state.stats.lastTrade = tradeLog;
    }
    
    state.stats.winRate = state.stats.tradesExecuted > 0
      ? (state.stats.tradesSuccessful / state.stats.tradesExecuted) * 100
      : 0;
  }
  
  return result;
}

// ═══════════════════════════════════════════════════════════════════════════════
// LOOP PRINCIPAL
// ═══════════════════════════════════════════════════════════════════════════════

async function tick() {
  if (!state.isRunning || isExecuting) return;
  
  state.stats.totalScans++;
  state.stats.uptime = Math.floor((Date.now() - state.startTime) / 1000);
  state.stats.currentStrategy = 'SCANNING';
  
  await executeBestOpportunity();
}

// ═══════════════════════════════════════════════════════════════════════════════
// API
// ═══════════════════════════════════════════════════════════════════════════════

app.get('/api/defi/multichain-arb/status', (req, res) => {
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
  
  // Reset stats
  state.stats = {
    totalScans: 0, opportunitiesFound: 0, tradesAttempted: 0, tradesExecuted: 0,
    tradesSuccessful: 0, totalProfitUsd: 0, totalGasUsd: 0, netProfitUsd: 0,
    winRate: 0, avgScanTimeMs: 0, scansPerSecond: 0, uptime: 0,
    currentChain: 'base', currentStrategy: 'STARTING', lastOpportunity: null, lastTrade: null
  };
  state.tradeLogs = [];
  state.opportunities = [];
  
  console.log(`\n${'═'.repeat(70)}`);
  console.log(`🔥 BOT AGRESIVO INICIADO - ${state.isDryRun ? 'DRY RUN' : '⚠️ MODO REAL - EJECUTANDO TRADES'}`);
  console.log(`${'═'.repeat(70)}`);
  console.log(`   Min Profit: $${CONFIG.MIN_PROFIT_USD}`);
  console.log(`   Auto Execute: ${CONFIG.AUTO_EXECUTE}`);
  console.log(`   Execute on Start: ${CONFIG.EXECUTE_ON_START}`);
  console.log(`${'═'.repeat(70)}\n`);
  
  // EJECUTAR INMEDIATAMENTE al iniciar
  if (CONFIG.EXECUTE_ON_START && !state.isDryRun) {
    console.log('[START] 🚀 Ejecutando primera oportunidad inmediatamente...\n');
    await executeBestOpportunity();
  }
  
  // Iniciar loop
  if (timer) clearInterval(timer);
  timer = setInterval(tick, CONFIG.SCAN_INTERVAL_MS);
  
  res.json({
    success: true,
    isRunning: true,
    isDryRun: state.isDryRun,
    mode: 'AGGRESSIVE_EXECUTOR',
    config: CONFIG
  });
});

app.post('/api/defi/multichain-arb/stop', (req, res) => {
  state.isRunning = false;
  if (timer) { clearInterval(timer); timer = null; }
  console.log('\n[STOP] Bot detenido\n');
  res.json({ success: true, isRunning: false });
});

app.post('/api/defi/multichain-arb/execute-now', async (req, res) => {
  console.log('\n[API] Ejecución manual solicitada...\n');
  const result = await executeBestOpportunity();
  res.json({ success: true, result });
});

app.get('/api/defi/multichain-arb/health', (req, res) => {
  res.json({
    status: 'ok',
    mode: 'AGGRESSIVE_EXECUTOR',
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
${'═'.repeat(70)}

   🔥 BOT AGRESIVO - EJECUTOR DE TRANSACCIONES REALES
   
   ✅ Puerto: ${PORT}
   ✅ Wallet: ${WALLET_ADDRESS.slice(0, 10)}...${WALLET_ADDRESS.slice(-5)}
   
   ⚡ Min Profit: $${CONFIG.MIN_PROFIT_USD} (puede ser negativo para pruebas)
   ⚡ Auto Execute: ${CONFIG.AUTO_EXECUTE}
   ⚡ Execute on Start: ${CONFIG.EXECUTE_ON_START}
   
   ⚠️  MODO AGRESIVO - Ejecutará trades reales inmediatamente

${'═'.repeat(70)}
  `);
  
  await init();
  console.log('\n[READY] 🔥 POST /api/defi/multichain-arb/start para iniciar\n');
  console.log('[READY] 🚀 POST /api/defi/multichain-arb/execute-now para ejecutar manualmente\n');
});

process.on('SIGINT', () => {
  if (timer) clearInterval(timer);
  process.exit(0);
});



 * ═══════════════════════════════════════════════════════════════════════════════
 * 🔥 BOT AGRESIVO - EJECUTA TRANSACCIONES REALES
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * Este bot:
 * 1. Ordena oportunidades por mejor profit
 * 2. Ejecuta la MEJOR oportunidad inmediatamente
 * 3. Umbral de profit muy bajo para ejecutar más trades
 * 4. Ejecuta aunque el profit sea pequeño o ligeramente negativo
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
// CONFIGURACIÓN MUY AGRESIVA
// ═══════════════════════════════════════════════════════════════════════════════

const CONFIG = {
  SCAN_INTERVAL_MS: 1000,
  // UMBRAL MUY BAJO - Ejecutar incluso con pequeña pérdida para probar
  MIN_PROFIT_USD: -0.50,          // Acepta hasta $0.50 de pérdida
  MAX_SLIPPAGE_BPS: 100,          // 1% slippage
  AUTO_EXECUTE: true,
  EXECUTE_ON_START: true,         // Ejecutar inmediatamente al iniciar
  ETH_PRICE_USD: 3500,
  TRADE_AMOUNTS: [0.005, 0.01],   // Cantidades pequeñas para pruebas
  FEE_TIERS: [500, 3000]          // Solo 0.05% y 0.3%
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
  mode: 'AGGRESSIVE_EXECUTOR',
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
    currentStrategy: 'IDLE',
    lastOpportunity: null,
    lastTrade: null
  },
  chains: [],
  tradeLogs: [],
  opportunities: [],
  banditStates: [],
  strategies: {
    flashLoan: { enabled: false, scans: 0, opportunities: 0, executions: 0 },
    mev: { enabled: false, scans: 0, opportunities: 0, executions: 0 },
    triangular: { enabled: false, scans: 0, opportunities: 0, executions: 0 },
    simpleArb: { enabled: true, scans: 0, opportunities: 0, executions: 0 },
    crossDex: { enabled: false, scans: 0, opportunities: 0, executions: 0 },
    liquidation: { enabled: false, scans: 0, opportunities: 0, executions: 0 }
  }
};

let timer = null;
let providers = {};
let signers = {};
let contracts = {};
let isExecuting = false;
let currentChainIndex = 0;

// ═══════════════════════════════════════════════════════════════════════════════
// INICIALIZACIÓN
// ═══════════════════════════════════════════════════════════════════════════════

async function init() {
  console.log('\n[INIT] 🔌 Conectando a chains...\n');
  
  for (const [chainKey, chain] of Object.entries(CHAINS)) {
    try {
      const provider = new ethers.JsonRpcProvider(chain.rpc);
      await provider.getBlockNumber();
      
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
        isActive: balanceEth > 0.003,
        explorer: chain.explorer,
        ethPrice: 0,
        connected: true
      });
      
      state.banditStates.push({
        chain: chainKey,
        alpha: 2,
        beta: 2,
        winRate: 50,
        selected: chainKey === 'base'
      });
      
      console.log(`   ✅ ${chain.name}: ${balanceEth.toFixed(6)} ETH ($${(balanceEth * CONFIG.ETH_PRICE_USD).toFixed(2)})`);
    } catch (e) {
      console.error(`   ❌ ${chain.name}: ${e.message}`);
      state.chains.push({
        chain: chainKey,
        name: chain.name,
        connected: false,
        balance: '0',
        balanceUsd: 0,
        isActive: false
      });
    }
  }
  console.log('');
}

// ═══════════════════════════════════════════════════════════════════════════════
// ESCANEO DE OPORTUNIDADES
// ═══════════════════════════════════════════════════════════════════════════════

async function scanAllChains() {
  const allOpportunities = [];
  
  for (const [chainKey, chain] of Object.entries(CHAINS)) {
    if (!providers[chainKey]) continue;
    
    const quoter = contracts[chainKey].quoter;
    const provider = providers[chainKey];
    
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
              const netProfitUsd = parseFloat(ethers.formatEther(netProfit)) * ethPrice;
              const spreadBps = Number((grossProfit * 10000n) / amountWei);
              
              allOpportunities.push({
                chain: chainKey,
                chainName: chain.name,
                strategy: 'SIMPLE_ARB',
                route: `${CONFIG.FEE_TIERS[i]/100}%→${CONFIG.FEE_TIERS[j]/100}%`,
                amountInEth: amountEth,
                amountIn: amountWei,
                fee1: CONFIG.FEE_TIERS[i],
                fee2: CONFIG.FEE_TIERS[j],
                usdcIntermediate: usdcOut,
                wethOut: wethOut,
                spreadBps,
                netProfitUsd,
                gasCostUsd,
                ethPrice,
                profitable: netProfitUsd >= CONFIG.MIN_PROFIT_USD,
                timestamp: Date.now()
              });
              
            } catch (e) {}
          }
        }
      }
    } catch (e) {
      console.error(`[SCAN] Error ${chain.name}: ${e.message.slice(0, 50)}`);
    }
  }
  
  // Ordenar por MEJOR profit (de mayor a menor)
  allOpportunities.sort((a, b) => b.netProfitUsd - a.netProfitUsd);
  
  return allOpportunities;
}

// ═══════════════════════════════════════════════════════════════════════════════
// EJECUCIÓN DE TRADE
// ═══════════════════════════════════════════════════════════════════════════════

async function executeTrade(opp) {
  if (isExecuting) {
    console.log('[EXEC] Ya hay una ejecución en progreso');
    return null;
  }
  
  isExecuting = true;
  
  const chain = CHAINS[opp.chain];
  const signer = signers[opp.chain];
  const provider = providers[opp.chain];
  const { router, weth } = contracts[opp.chain];
  
  console.log(`\n${'═'.repeat(70)}`);
  console.log(`🔥 EJECUTANDO TRADE REAL en ${chain.name.toUpperCase()}`);
  console.log(`${'═'.repeat(70)}`);
  console.log(`   📊 Estrategia: ${opp.strategy}`);
  console.log(`   🔄 Ruta: ${opp.route}`);
  console.log(`   💰 Amount: ${opp.amountInEth} ETH`);
  console.log(`   📈 Expected Profit: $${opp.netProfitUsd.toFixed(4)}`);
  console.log(`   ⛽ Gas estimado: $${opp.gasCostUsd.toFixed(4)}`);
  console.log(`${'─'.repeat(70)}`);
  
  const startTime = Date.now();
  
  try {
    // 1. Verificar balance
    const balance = await provider.getBalance(WALLET_ADDRESS);
    const balanceEth = parseFloat(ethers.formatEther(balance));
    console.log(`   💳 Balance actual: ${balanceEth.toFixed(6)} ETH`);
    
    if (balance < opp.amountIn + ethers.parseEther('0.002')) {
      console.log(`   ❌ Balance insuficiente en ${chain.name}`);
      isExecuting = false;
      return { success: false, error: 'Balance insuficiente' };
    }
    
    // 2. Wrap ETH → WETH
    console.log(`   📦 [1/5] Wrapping ${opp.amountInEth} ETH → WETH...`);
    const wrapTx = await weth.deposit({ 
      value: opp.amountIn, 
      gasLimit: 60000 
    });
    const wrapReceipt = await wrapTx.wait(1);
    console.log(`   ✅ Wrapped! TX: ${wrapReceipt.hash.slice(0, 20)}...`);
    
    // 3. Approve WETH
    const wethAllowance = await weth.allowance(WALLET_ADDRESS, chain.router);
    if (wethAllowance < opp.amountIn) {
      console.log(`   🔓 [2/5] Approving WETH...`);
      const approveTx = await weth.approve(chain.router, ethers.MaxUint256, { gasLimit: 60000 });
      await approveTx.wait(1);
      console.log(`   ✅ WETH Approved!`);
    } else {
      console.log(`   ✅ [2/5] WETH ya aprobado`);
    }
    
    // 4. SWAP 1: WETH → USDC
    console.log(`   🔄 [3/5] Swap WETH → USDC (fee: ${opp.fee1/100}%)...`);
    const minUsdc = (opp.usdcIntermediate * BigInt(10000 - CONFIG.MAX_SLIPPAGE_BPS)) / 10000n;
    
    const swap1Tx = await router.exactInputSingle({
      tokenIn: chain.tokens.WETH,
      tokenOut: chain.tokens.USDC,
      fee: opp.fee1,
      recipient: WALLET_ADDRESS,
      amountIn: opp.amountIn,
      amountOutMinimum: minUsdc,
      sqrtPriceLimitX96: 0n
    }, { gasLimit: 350000 });
    
    const receipt1 = await swap1Tx.wait(1);
    console.log(`   ✅ Swap 1 completado! TX: ${receipt1.hash.slice(0, 20)}...`);
    
    // 5. Obtener balance USDC
    const usdc = new ethers.Contract(chain.tokens.USDC, ERC20_ABI, signer);
    const usdcBalance = await usdc.balanceOf(WALLET_ADDRESS);
    console.log(`   💵 USDC recibido: ${ethers.formatUnits(usdcBalance, 6)}`);
    
    // 6. Approve USDC
    const usdcAllowance = await usdc.allowance(WALLET_ADDRESS, chain.router);
    if (usdcAllowance < usdcBalance) {
      console.log(`   🔓 [4/5] Approving USDC...`);
      const approveUsdcTx = await usdc.approve(chain.router, ethers.MaxUint256, { gasLimit: 60000 });
      await approveUsdcTx.wait(1);
      console.log(`   ✅ USDC Approved!`);
    } else {
      console.log(`   ✅ [4/5] USDC ya aprobado`);
    }
    
    // 7. SWAP 2: USDC → WETH
    console.log(`   🔄 [5/5] Swap USDC → WETH (fee: ${opp.fee2/100}%)...`);
    const minWeth = (opp.wethOut * BigInt(10000 - CONFIG.MAX_SLIPPAGE_BPS)) / 10000n;
    
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
    console.log(`   ✅ Swap 2 completado! TX: ${receipt2.hash.slice(0, 20)}...`);
    
    // 8. Calcular resultado
    const finalWeth = await weth.balanceOf(WALLET_ADDRESS);
    const actualProfit = finalWeth - opp.amountIn;
    const actualProfitUsd = parseFloat(ethers.formatEther(actualProfit)) * opp.ethPrice;
    
    const gas1 = receipt1.gasUsed * receipt1.gasPrice;
    const gas2 = receipt2.gasUsed * receipt2.gasPrice;
    const totalGasWei = gas1 + gas2;
    const totalGasUsd = parseFloat(ethers.formatEther(totalGasWei)) * opp.ethPrice;
    
    const netProfitUsd = actualProfitUsd - totalGasUsd;
    const executionTime = Date.now() - startTime;
    
    console.log(`${'═'.repeat(70)}`);
    console.log(`   🎉 TRADE COMPLETADO!`);
    console.log(`${'─'.repeat(70)}`);
    console.log(`   💰 Profit Bruto: $${actualProfitUsd.toFixed(4)}`);
    console.log(`   ⛽ Gas Total: $${totalGasUsd.toFixed(4)}`);
    console.log(`   💵 Profit Neto: $${netProfitUsd.toFixed(4)} ${netProfitUsd >= 0 ? '✅' : '❌'}`);
    console.log(`   ⏱️  Tiempo: ${executionTime}ms`);
    console.log(`   🔗 TX: ${chain.explorer}/tx/${receipt2.hash}`);
    console.log(`${'═'.repeat(70)}\n`);
    
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
    console.log(`${'═'.repeat(70)}`);
    console.log(`   ❌ ERROR EN TRADE: ${e.message}`);
    console.log(`${'═'.repeat(70)}\n`);
    
    isExecuting = false;
    return { success: false, error: e.message };
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// EJECUTAR MEJOR OPORTUNIDAD
// ═══════════════════════════════════════════════════════════════════════════════

async function executeBestOpportunity() {
  console.log('\n[SCAN] 🔍 Escaneando TODAS las chains para la MEJOR oportunidad...\n');
  
  const opportunities = await scanAllChains();
  
  if (opportunities.length === 0) {
    console.log('[SCAN] No se encontraron oportunidades');
    return null;
  }
  
  // Mostrar top 5 oportunidades
  console.log('\n📊 TOP 5 OPORTUNIDADES (ordenadas por profit):');
  console.log('─'.repeat(70));
  opportunities.slice(0, 5).forEach((opp, i) => {
    const profitColor = opp.netProfitUsd >= 0 ? '\x1b[32m' : '\x1b[31m';
    console.log(`${i + 1}. ${opp.chainName} | ${opp.route} | ${opp.amountInEth} ETH | ${profitColor}$${opp.netProfitUsd.toFixed(4)}\x1b[0m`);
  });
  console.log('─'.repeat(70));
  
  // Guardar oportunidades en estado
  state.opportunities = opportunities.slice(0, 20).map(o => ({
    ...o,
    amountIn: o.amountIn.toString(),
    usdcIntermediate: o.usdcIntermediate.toString(),
    wethOut: o.wethOut.toString()
  }));
  
  // Filtrar las que cumplen el umbral
  const executableOpps = opportunities.filter(o => o.netProfitUsd >= CONFIG.MIN_PROFIT_USD);
  
  if (executableOpps.length === 0) {
    console.log(`\n[EXEC] ⚠️ Ninguna oportunidad supera el umbral de $${CONFIG.MIN_PROFIT_USD}`);
    console.log(`[EXEC] La mejor tiene $${opportunities[0].netProfitUsd.toFixed(4)}`);
    return null;
  }
  
  // Ejecutar la MEJOR
  const best = executableOpps[0];
  console.log(`\n[EXEC] 🎯 Ejecutando MEJOR oportunidad: ${best.chainName} | ${best.route} | $${best.netProfitUsd.toFixed(4)}`);
  
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
      state.stats.totalProfitUsd += result.profitUsd || 0;
      state.stats.totalGasUsd += result.gasUsd || 0;
      state.stats.netProfitUsd = state.stats.totalProfitUsd - state.stats.totalGasUsd;
      state.stats.lastTrade = tradeLog;
    }
    
    state.stats.winRate = state.stats.tradesExecuted > 0
      ? (state.stats.tradesSuccessful / state.stats.tradesExecuted) * 100
      : 0;
  }
  
  return result;
}

// ═══════════════════════════════════════════════════════════════════════════════
// LOOP PRINCIPAL
// ═══════════════════════════════════════════════════════════════════════════════

async function tick() {
  if (!state.isRunning || isExecuting) return;
  
  state.stats.totalScans++;
  state.stats.uptime = Math.floor((Date.now() - state.startTime) / 1000);
  state.stats.currentStrategy = 'SCANNING';
  
  await executeBestOpportunity();
}

// ═══════════════════════════════════════════════════════════════════════════════
// API
// ═══════════════════════════════════════════════════════════════════════════════

app.get('/api/defi/multichain-arb/status', (req, res) => {
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
  
  // Reset stats
  state.stats = {
    totalScans: 0, opportunitiesFound: 0, tradesAttempted: 0, tradesExecuted: 0,
    tradesSuccessful: 0, totalProfitUsd: 0, totalGasUsd: 0, netProfitUsd: 0,
    winRate: 0, avgScanTimeMs: 0, scansPerSecond: 0, uptime: 0,
    currentChain: 'base', currentStrategy: 'STARTING', lastOpportunity: null, lastTrade: null
  };
  state.tradeLogs = [];
  state.opportunities = [];
  
  console.log(`\n${'═'.repeat(70)}`);
  console.log(`🔥 BOT AGRESIVO INICIADO - ${state.isDryRun ? 'DRY RUN' : '⚠️ MODO REAL - EJECUTANDO TRADES'}`);
  console.log(`${'═'.repeat(70)}`);
  console.log(`   Min Profit: $${CONFIG.MIN_PROFIT_USD}`);
  console.log(`   Auto Execute: ${CONFIG.AUTO_EXECUTE}`);
  console.log(`   Execute on Start: ${CONFIG.EXECUTE_ON_START}`);
  console.log(`${'═'.repeat(70)}\n`);
  
  // EJECUTAR INMEDIATAMENTE al iniciar
  if (CONFIG.EXECUTE_ON_START && !state.isDryRun) {
    console.log('[START] 🚀 Ejecutando primera oportunidad inmediatamente...\n');
    await executeBestOpportunity();
  }
  
  // Iniciar loop
  if (timer) clearInterval(timer);
  timer = setInterval(tick, CONFIG.SCAN_INTERVAL_MS);
  
  res.json({
    success: true,
    isRunning: true,
    isDryRun: state.isDryRun,
    mode: 'AGGRESSIVE_EXECUTOR',
    config: CONFIG
  });
});

app.post('/api/defi/multichain-arb/stop', (req, res) => {
  state.isRunning = false;
  if (timer) { clearInterval(timer); timer = null; }
  console.log('\n[STOP] Bot detenido\n');
  res.json({ success: true, isRunning: false });
});

app.post('/api/defi/multichain-arb/execute-now', async (req, res) => {
  console.log('\n[API] Ejecución manual solicitada...\n');
  const result = await executeBestOpportunity();
  res.json({ success: true, result });
});

app.get('/api/defi/multichain-arb/health', (req, res) => {
  res.json({
    status: 'ok',
    mode: 'AGGRESSIVE_EXECUTOR',
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
${'═'.repeat(70)}

   🔥 BOT AGRESIVO - EJECUTOR DE TRANSACCIONES REALES
   
   ✅ Puerto: ${PORT}
   ✅ Wallet: ${WALLET_ADDRESS.slice(0, 10)}...${WALLET_ADDRESS.slice(-5)}
   
   ⚡ Min Profit: $${CONFIG.MIN_PROFIT_USD} (puede ser negativo para pruebas)
   ⚡ Auto Execute: ${CONFIG.AUTO_EXECUTE}
   ⚡ Execute on Start: ${CONFIG.EXECUTE_ON_START}
   
   ⚠️  MODO AGRESIVO - Ejecutará trades reales inmediatamente

${'═'.repeat(70)}
  `);
  
  await init();
  console.log('\n[READY] 🔥 POST /api/defi/multichain-arb/start para iniciar\n');
  console.log('[READY] 🚀 POST /api/defi/multichain-arb/execute-now para ejecutar manualmente\n');
});

process.on('SIGINT', () => {
  if (timer) clearInterval(timer);
  process.exit(0);
});


 * ═══════════════════════════════════════════════════════════════════════════════
 * 🔥 BOT AGRESIVO - EJECUTA TRANSACCIONES REALES
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * Este bot:
 * 1. Ordena oportunidades por mejor profit
 * 2. Ejecuta la MEJOR oportunidad inmediatamente
 * 3. Umbral de profit muy bajo para ejecutar más trades
 * 4. Ejecuta aunque el profit sea pequeño o ligeramente negativo
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
// CONFIGURACIÓN MUY AGRESIVA
// ═══════════════════════════════════════════════════════════════════════════════

const CONFIG = {
  SCAN_INTERVAL_MS: 1000,
  // UMBRAL MUY BAJO - Ejecutar incluso con pequeña pérdida para probar
  MIN_PROFIT_USD: -0.50,          // Acepta hasta $0.50 de pérdida
  MAX_SLIPPAGE_BPS: 100,          // 1% slippage
  AUTO_EXECUTE: true,
  EXECUTE_ON_START: true,         // Ejecutar inmediatamente al iniciar
  ETH_PRICE_USD: 3500,
  TRADE_AMOUNTS: [0.005, 0.01],   // Cantidades pequeñas para pruebas
  FEE_TIERS: [500, 3000]          // Solo 0.05% y 0.3%
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
  mode: 'AGGRESSIVE_EXECUTOR',
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
    currentStrategy: 'IDLE',
    lastOpportunity: null,
    lastTrade: null
  },
  chains: [],
  tradeLogs: [],
  opportunities: [],
  banditStates: [],
  strategies: {
    flashLoan: { enabled: false, scans: 0, opportunities: 0, executions: 0 },
    mev: { enabled: false, scans: 0, opportunities: 0, executions: 0 },
    triangular: { enabled: false, scans: 0, opportunities: 0, executions: 0 },
    simpleArb: { enabled: true, scans: 0, opportunities: 0, executions: 0 },
    crossDex: { enabled: false, scans: 0, opportunities: 0, executions: 0 },
    liquidation: { enabled: false, scans: 0, opportunities: 0, executions: 0 }
  }
};

let timer = null;
let providers = {};
let signers = {};
let contracts = {};
let isExecuting = false;
let currentChainIndex = 0;

// ═══════════════════════════════════════════════════════════════════════════════
// INICIALIZACIÓN
// ═══════════════════════════════════════════════════════════════════════════════

async function init() {
  console.log('\n[INIT] 🔌 Conectando a chains...\n');
  
  for (const [chainKey, chain] of Object.entries(CHAINS)) {
    try {
      const provider = new ethers.JsonRpcProvider(chain.rpc);
      await provider.getBlockNumber();
      
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
        isActive: balanceEth > 0.003,
        explorer: chain.explorer,
        ethPrice: 0,
        connected: true
      });
      
      state.banditStates.push({
        chain: chainKey,
        alpha: 2,
        beta: 2,
        winRate: 50,
        selected: chainKey === 'base'
      });
      
      console.log(`   ✅ ${chain.name}: ${balanceEth.toFixed(6)} ETH ($${(balanceEth * CONFIG.ETH_PRICE_USD).toFixed(2)})`);
    } catch (e) {
      console.error(`   ❌ ${chain.name}: ${e.message}`);
      state.chains.push({
        chain: chainKey,
        name: chain.name,
        connected: false,
        balance: '0',
        balanceUsd: 0,
        isActive: false
      });
    }
  }
  console.log('');
}

// ═══════════════════════════════════════════════════════════════════════════════
// ESCANEO DE OPORTUNIDADES
// ═══════════════════════════════════════════════════════════════════════════════

async function scanAllChains() {
  const allOpportunities = [];
  
  for (const [chainKey, chain] of Object.entries(CHAINS)) {
    if (!providers[chainKey]) continue;
    
    const quoter = contracts[chainKey].quoter;
    const provider = providers[chainKey];
    
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
              const netProfitUsd = parseFloat(ethers.formatEther(netProfit)) * ethPrice;
              const spreadBps = Number((grossProfit * 10000n) / amountWei);
              
              allOpportunities.push({
                chain: chainKey,
                chainName: chain.name,
                strategy: 'SIMPLE_ARB',
                route: `${CONFIG.FEE_TIERS[i]/100}%→${CONFIG.FEE_TIERS[j]/100}%`,
                amountInEth: amountEth,
                amountIn: amountWei,
                fee1: CONFIG.FEE_TIERS[i],
                fee2: CONFIG.FEE_TIERS[j],
                usdcIntermediate: usdcOut,
                wethOut: wethOut,
                spreadBps,
                netProfitUsd,
                gasCostUsd,
                ethPrice,
                profitable: netProfitUsd >= CONFIG.MIN_PROFIT_USD,
                timestamp: Date.now()
              });
              
            } catch (e) {}
          }
        }
      }
    } catch (e) {
      console.error(`[SCAN] Error ${chain.name}: ${e.message.slice(0, 50)}`);
    }
  }
  
  // Ordenar por MEJOR profit (de mayor a menor)
  allOpportunities.sort((a, b) => b.netProfitUsd - a.netProfitUsd);
  
  return allOpportunities;
}

// ═══════════════════════════════════════════════════════════════════════════════
// EJECUCIÓN DE TRADE
// ═══════════════════════════════════════════════════════════════════════════════

async function executeTrade(opp) {
  if (isExecuting) {
    console.log('[EXEC] Ya hay una ejecución en progreso');
    return null;
  }
  
  isExecuting = true;
  
  const chain = CHAINS[opp.chain];
  const signer = signers[opp.chain];
  const provider = providers[opp.chain];
  const { router, weth } = contracts[opp.chain];
  
  console.log(`\n${'═'.repeat(70)}`);
  console.log(`🔥 EJECUTANDO TRADE REAL en ${chain.name.toUpperCase()}`);
  console.log(`${'═'.repeat(70)}`);
  console.log(`   📊 Estrategia: ${opp.strategy}`);
  console.log(`   🔄 Ruta: ${opp.route}`);
  console.log(`   💰 Amount: ${opp.amountInEth} ETH`);
  console.log(`   📈 Expected Profit: $${opp.netProfitUsd.toFixed(4)}`);
  console.log(`   ⛽ Gas estimado: $${opp.gasCostUsd.toFixed(4)}`);
  console.log(`${'─'.repeat(70)}`);
  
  const startTime = Date.now();
  
  try {
    // 1. Verificar balance
    const balance = await provider.getBalance(WALLET_ADDRESS);
    const balanceEth = parseFloat(ethers.formatEther(balance));
    console.log(`   💳 Balance actual: ${balanceEth.toFixed(6)} ETH`);
    
    if (balance < opp.amountIn + ethers.parseEther('0.002')) {
      console.log(`   ❌ Balance insuficiente en ${chain.name}`);
      isExecuting = false;
      return { success: false, error: 'Balance insuficiente' };
    }
    
    // 2. Wrap ETH → WETH
    console.log(`   📦 [1/5] Wrapping ${opp.amountInEth} ETH → WETH...`);
    const wrapTx = await weth.deposit({ 
      value: opp.amountIn, 
      gasLimit: 60000 
    });
    const wrapReceipt = await wrapTx.wait(1);
    console.log(`   ✅ Wrapped! TX: ${wrapReceipt.hash.slice(0, 20)}...`);
    
    // 3. Approve WETH
    const wethAllowance = await weth.allowance(WALLET_ADDRESS, chain.router);
    if (wethAllowance < opp.amountIn) {
      console.log(`   🔓 [2/5] Approving WETH...`);
      const approveTx = await weth.approve(chain.router, ethers.MaxUint256, { gasLimit: 60000 });
      await approveTx.wait(1);
      console.log(`   ✅ WETH Approved!`);
    } else {
      console.log(`   ✅ [2/5] WETH ya aprobado`);
    }
    
    // 4. SWAP 1: WETH → USDC
    console.log(`   🔄 [3/5] Swap WETH → USDC (fee: ${opp.fee1/100}%)...`);
    const minUsdc = (opp.usdcIntermediate * BigInt(10000 - CONFIG.MAX_SLIPPAGE_BPS)) / 10000n;
    
    const swap1Tx = await router.exactInputSingle({
      tokenIn: chain.tokens.WETH,
      tokenOut: chain.tokens.USDC,
      fee: opp.fee1,
      recipient: WALLET_ADDRESS,
      amountIn: opp.amountIn,
      amountOutMinimum: minUsdc,
      sqrtPriceLimitX96: 0n
    }, { gasLimit: 350000 });
    
    const receipt1 = await swap1Tx.wait(1);
    console.log(`   ✅ Swap 1 completado! TX: ${receipt1.hash.slice(0, 20)}...`);
    
    // 5. Obtener balance USDC
    const usdc = new ethers.Contract(chain.tokens.USDC, ERC20_ABI, signer);
    const usdcBalance = await usdc.balanceOf(WALLET_ADDRESS);
    console.log(`   💵 USDC recibido: ${ethers.formatUnits(usdcBalance, 6)}`);
    
    // 6. Approve USDC
    const usdcAllowance = await usdc.allowance(WALLET_ADDRESS, chain.router);
    if (usdcAllowance < usdcBalance) {
      console.log(`   🔓 [4/5] Approving USDC...`);
      const approveUsdcTx = await usdc.approve(chain.router, ethers.MaxUint256, { gasLimit: 60000 });
      await approveUsdcTx.wait(1);
      console.log(`   ✅ USDC Approved!`);
    } else {
      console.log(`   ✅ [4/5] USDC ya aprobado`);
    }
    
    // 7. SWAP 2: USDC → WETH
    console.log(`   🔄 [5/5] Swap USDC → WETH (fee: ${opp.fee2/100}%)...`);
    const minWeth = (opp.wethOut * BigInt(10000 - CONFIG.MAX_SLIPPAGE_BPS)) / 10000n;
    
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
    console.log(`   ✅ Swap 2 completado! TX: ${receipt2.hash.slice(0, 20)}...`);
    
    // 8. Calcular resultado
    const finalWeth = await weth.balanceOf(WALLET_ADDRESS);
    const actualProfit = finalWeth - opp.amountIn;
    const actualProfitUsd = parseFloat(ethers.formatEther(actualProfit)) * opp.ethPrice;
    
    const gas1 = receipt1.gasUsed * receipt1.gasPrice;
    const gas2 = receipt2.gasUsed * receipt2.gasPrice;
    const totalGasWei = gas1 + gas2;
    const totalGasUsd = parseFloat(ethers.formatEther(totalGasWei)) * opp.ethPrice;
    
    const netProfitUsd = actualProfitUsd - totalGasUsd;
    const executionTime = Date.now() - startTime;
    
    console.log(`${'═'.repeat(70)}`);
    console.log(`   🎉 TRADE COMPLETADO!`);
    console.log(`${'─'.repeat(70)}`);
    console.log(`   💰 Profit Bruto: $${actualProfitUsd.toFixed(4)}`);
    console.log(`   ⛽ Gas Total: $${totalGasUsd.toFixed(4)}`);
    console.log(`   💵 Profit Neto: $${netProfitUsd.toFixed(4)} ${netProfitUsd >= 0 ? '✅' : '❌'}`);
    console.log(`   ⏱️  Tiempo: ${executionTime}ms`);
    console.log(`   🔗 TX: ${chain.explorer}/tx/${receipt2.hash}`);
    console.log(`${'═'.repeat(70)}\n`);
    
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
    console.log(`${'═'.repeat(70)}`);
    console.log(`   ❌ ERROR EN TRADE: ${e.message}`);
    console.log(`${'═'.repeat(70)}\n`);
    
    isExecuting = false;
    return { success: false, error: e.message };
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// EJECUTAR MEJOR OPORTUNIDAD
// ═══════════════════════════════════════════════════════════════════════════════

async function executeBestOpportunity() {
  console.log('\n[SCAN] 🔍 Escaneando TODAS las chains para la MEJOR oportunidad...\n');
  
  const opportunities = await scanAllChains();
  
  if (opportunities.length === 0) {
    console.log('[SCAN] No se encontraron oportunidades');
    return null;
  }
  
  // Mostrar top 5 oportunidades
  console.log('\n📊 TOP 5 OPORTUNIDADES (ordenadas por profit):');
  console.log('─'.repeat(70));
  opportunities.slice(0, 5).forEach((opp, i) => {
    const profitColor = opp.netProfitUsd >= 0 ? '\x1b[32m' : '\x1b[31m';
    console.log(`${i + 1}. ${opp.chainName} | ${opp.route} | ${opp.amountInEth} ETH | ${profitColor}$${opp.netProfitUsd.toFixed(4)}\x1b[0m`);
  });
  console.log('─'.repeat(70));
  
  // Guardar oportunidades en estado
  state.opportunities = opportunities.slice(0, 20).map(o => ({
    ...o,
    amountIn: o.amountIn.toString(),
    usdcIntermediate: o.usdcIntermediate.toString(),
    wethOut: o.wethOut.toString()
  }));
  
  // Filtrar las que cumplen el umbral
  const executableOpps = opportunities.filter(o => o.netProfitUsd >= CONFIG.MIN_PROFIT_USD);
  
  if (executableOpps.length === 0) {
    console.log(`\n[EXEC] ⚠️ Ninguna oportunidad supera el umbral de $${CONFIG.MIN_PROFIT_USD}`);
    console.log(`[EXEC] La mejor tiene $${opportunities[0].netProfitUsd.toFixed(4)}`);
    return null;
  }
  
  // Ejecutar la MEJOR
  const best = executableOpps[0];
  console.log(`\n[EXEC] 🎯 Ejecutando MEJOR oportunidad: ${best.chainName} | ${best.route} | $${best.netProfitUsd.toFixed(4)}`);
  
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
      state.stats.totalProfitUsd += result.profitUsd || 0;
      state.stats.totalGasUsd += result.gasUsd || 0;
      state.stats.netProfitUsd = state.stats.totalProfitUsd - state.stats.totalGasUsd;
      state.stats.lastTrade = tradeLog;
    }
    
    state.stats.winRate = state.stats.tradesExecuted > 0
      ? (state.stats.tradesSuccessful / state.stats.tradesExecuted) * 100
      : 0;
  }
  
  return result;
}

// ═══════════════════════════════════════════════════════════════════════════════
// LOOP PRINCIPAL
// ═══════════════════════════════════════════════════════════════════════════════

async function tick() {
  if (!state.isRunning || isExecuting) return;
  
  state.stats.totalScans++;
  state.stats.uptime = Math.floor((Date.now() - state.startTime) / 1000);
  state.stats.currentStrategy = 'SCANNING';
  
  await executeBestOpportunity();
}

// ═══════════════════════════════════════════════════════════════════════════════
// API
// ═══════════════════════════════════════════════════════════════════════════════

app.get('/api/defi/multichain-arb/status', (req, res) => {
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
  
  // Reset stats
  state.stats = {
    totalScans: 0, opportunitiesFound: 0, tradesAttempted: 0, tradesExecuted: 0,
    tradesSuccessful: 0, totalProfitUsd: 0, totalGasUsd: 0, netProfitUsd: 0,
    winRate: 0, avgScanTimeMs: 0, scansPerSecond: 0, uptime: 0,
    currentChain: 'base', currentStrategy: 'STARTING', lastOpportunity: null, lastTrade: null
  };
  state.tradeLogs = [];
  state.opportunities = [];
  
  console.log(`\n${'═'.repeat(70)}`);
  console.log(`🔥 BOT AGRESIVO INICIADO - ${state.isDryRun ? 'DRY RUN' : '⚠️ MODO REAL - EJECUTANDO TRADES'}`);
  console.log(`${'═'.repeat(70)}`);
  console.log(`   Min Profit: $${CONFIG.MIN_PROFIT_USD}`);
  console.log(`   Auto Execute: ${CONFIG.AUTO_EXECUTE}`);
  console.log(`   Execute on Start: ${CONFIG.EXECUTE_ON_START}`);
  console.log(`${'═'.repeat(70)}\n`);
  
  // EJECUTAR INMEDIATAMENTE al iniciar
  if (CONFIG.EXECUTE_ON_START && !state.isDryRun) {
    console.log('[START] 🚀 Ejecutando primera oportunidad inmediatamente...\n');
    await executeBestOpportunity();
  }
  
  // Iniciar loop
  if (timer) clearInterval(timer);
  timer = setInterval(tick, CONFIG.SCAN_INTERVAL_MS);
  
  res.json({
    success: true,
    isRunning: true,
    isDryRun: state.isDryRun,
    mode: 'AGGRESSIVE_EXECUTOR',
    config: CONFIG
  });
});

app.post('/api/defi/multichain-arb/stop', (req, res) => {
  state.isRunning = false;
  if (timer) { clearInterval(timer); timer = null; }
  console.log('\n[STOP] Bot detenido\n');
  res.json({ success: true, isRunning: false });
});

app.post('/api/defi/multichain-arb/execute-now', async (req, res) => {
  console.log('\n[API] Ejecución manual solicitada...\n');
  const result = await executeBestOpportunity();
  res.json({ success: true, result });
});

app.get('/api/defi/multichain-arb/health', (req, res) => {
  res.json({
    status: 'ok',
    mode: 'AGGRESSIVE_EXECUTOR',
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
${'═'.repeat(70)}

   🔥 BOT AGRESIVO - EJECUTOR DE TRANSACCIONES REALES
   
   ✅ Puerto: ${PORT}
   ✅ Wallet: ${WALLET_ADDRESS.slice(0, 10)}...${WALLET_ADDRESS.slice(-5)}
   
   ⚡ Min Profit: $${CONFIG.MIN_PROFIT_USD} (puede ser negativo para pruebas)
   ⚡ Auto Execute: ${CONFIG.AUTO_EXECUTE}
   ⚡ Execute on Start: ${CONFIG.EXECUTE_ON_START}
   
   ⚠️  MODO AGRESIVO - Ejecutará trades reales inmediatamente

${'═'.repeat(70)}
  `);
  
  await init();
  console.log('\n[READY] 🔥 POST /api/defi/multichain-arb/start para iniciar\n');
  console.log('[READY] 🚀 POST /api/defi/multichain-arb/execute-now para ejecutar manualmente\n');
});

process.on('SIGINT', () => {
  if (timer) clearInterval(timer);
  process.exit(0);
});



 * ═══════════════════════════════════════════════════════════════════════════════
 * 🔥 BOT AGRESIVO - EJECUTA TRANSACCIONES REALES
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * Este bot:
 * 1. Ordena oportunidades por mejor profit
 * 2. Ejecuta la MEJOR oportunidad inmediatamente
 * 3. Umbral de profit muy bajo para ejecutar más trades
 * 4. Ejecuta aunque el profit sea pequeño o ligeramente negativo
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
// CONFIGURACIÓN MUY AGRESIVA
// ═══════════════════════════════════════════════════════════════════════════════

const CONFIG = {
  SCAN_INTERVAL_MS: 1000,
  // UMBRAL MUY BAJO - Ejecutar incluso con pequeña pérdida para probar
  MIN_PROFIT_USD: -0.50,          // Acepta hasta $0.50 de pérdida
  MAX_SLIPPAGE_BPS: 100,          // 1% slippage
  AUTO_EXECUTE: true,
  EXECUTE_ON_START: true,         // Ejecutar inmediatamente al iniciar
  ETH_PRICE_USD: 3500,
  TRADE_AMOUNTS: [0.005, 0.01],   // Cantidades pequeñas para pruebas
  FEE_TIERS: [500, 3000]          // Solo 0.05% y 0.3%
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
  mode: 'AGGRESSIVE_EXECUTOR',
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
    currentStrategy: 'IDLE',
    lastOpportunity: null,
    lastTrade: null
  },
  chains: [],
  tradeLogs: [],
  opportunities: [],
  banditStates: [],
  strategies: {
    flashLoan: { enabled: false, scans: 0, opportunities: 0, executions: 0 },
    mev: { enabled: false, scans: 0, opportunities: 0, executions: 0 },
    triangular: { enabled: false, scans: 0, opportunities: 0, executions: 0 },
    simpleArb: { enabled: true, scans: 0, opportunities: 0, executions: 0 },
    crossDex: { enabled: false, scans: 0, opportunities: 0, executions: 0 },
    liquidation: { enabled: false, scans: 0, opportunities: 0, executions: 0 }
  }
};

let timer = null;
let providers = {};
let signers = {};
let contracts = {};
let isExecuting = false;
let currentChainIndex = 0;

// ═══════════════════════════════════════════════════════════════════════════════
// INICIALIZACIÓN
// ═══════════════════════════════════════════════════════════════════════════════

async function init() {
  console.log('\n[INIT] 🔌 Conectando a chains...\n');
  
  for (const [chainKey, chain] of Object.entries(CHAINS)) {
    try {
      const provider = new ethers.JsonRpcProvider(chain.rpc);
      await provider.getBlockNumber();
      
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
        isActive: balanceEth > 0.003,
        explorer: chain.explorer,
        ethPrice: 0,
        connected: true
      });
      
      state.banditStates.push({
        chain: chainKey,
        alpha: 2,
        beta: 2,
        winRate: 50,
        selected: chainKey === 'base'
      });
      
      console.log(`   ✅ ${chain.name}: ${balanceEth.toFixed(6)} ETH ($${(balanceEth * CONFIG.ETH_PRICE_USD).toFixed(2)})`);
    } catch (e) {
      console.error(`   ❌ ${chain.name}: ${e.message}`);
      state.chains.push({
        chain: chainKey,
        name: chain.name,
        connected: false,
        balance: '0',
        balanceUsd: 0,
        isActive: false
      });
    }
  }
  console.log('');
}

// ═══════════════════════════════════════════════════════════════════════════════
// ESCANEO DE OPORTUNIDADES
// ═══════════════════════════════════════════════════════════════════════════════

async function scanAllChains() {
  const allOpportunities = [];
  
  for (const [chainKey, chain] of Object.entries(CHAINS)) {
    if (!providers[chainKey]) continue;
    
    const quoter = contracts[chainKey].quoter;
    const provider = providers[chainKey];
    
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
              const netProfitUsd = parseFloat(ethers.formatEther(netProfit)) * ethPrice;
              const spreadBps = Number((grossProfit * 10000n) / amountWei);
              
              allOpportunities.push({
                chain: chainKey,
                chainName: chain.name,
                strategy: 'SIMPLE_ARB',
                route: `${CONFIG.FEE_TIERS[i]/100}%→${CONFIG.FEE_TIERS[j]/100}%`,
                amountInEth: amountEth,
                amountIn: amountWei,
                fee1: CONFIG.FEE_TIERS[i],
                fee2: CONFIG.FEE_TIERS[j],
                usdcIntermediate: usdcOut,
                wethOut: wethOut,
                spreadBps,
                netProfitUsd,
                gasCostUsd,
                ethPrice,
                profitable: netProfitUsd >= CONFIG.MIN_PROFIT_USD,
                timestamp: Date.now()
              });
              
            } catch (e) {}
          }
        }
      }
    } catch (e) {
      console.error(`[SCAN] Error ${chain.name}: ${e.message.slice(0, 50)}`);
    }
  }
  
  // Ordenar por MEJOR profit (de mayor a menor)
  allOpportunities.sort((a, b) => b.netProfitUsd - a.netProfitUsd);
  
  return allOpportunities;
}

// ═══════════════════════════════════════════════════════════════════════════════
// EJECUCIÓN DE TRADE
// ═══════════════════════════════════════════════════════════════════════════════

async function executeTrade(opp) {
  if (isExecuting) {
    console.log('[EXEC] Ya hay una ejecución en progreso');
    return null;
  }
  
  isExecuting = true;
  
  const chain = CHAINS[opp.chain];
  const signer = signers[opp.chain];
  const provider = providers[opp.chain];
  const { router, weth } = contracts[opp.chain];
  
  console.log(`\n${'═'.repeat(70)}`);
  console.log(`🔥 EJECUTANDO TRADE REAL en ${chain.name.toUpperCase()}`);
  console.log(`${'═'.repeat(70)}`);
  console.log(`   📊 Estrategia: ${opp.strategy}`);
  console.log(`   🔄 Ruta: ${opp.route}`);
  console.log(`   💰 Amount: ${opp.amountInEth} ETH`);
  console.log(`   📈 Expected Profit: $${opp.netProfitUsd.toFixed(4)}`);
  console.log(`   ⛽ Gas estimado: $${opp.gasCostUsd.toFixed(4)}`);
  console.log(`${'─'.repeat(70)}`);
  
  const startTime = Date.now();
  
  try {
    // 1. Verificar balance
    const balance = await provider.getBalance(WALLET_ADDRESS);
    const balanceEth = parseFloat(ethers.formatEther(balance));
    console.log(`   💳 Balance actual: ${balanceEth.toFixed(6)} ETH`);
    
    if (balance < opp.amountIn + ethers.parseEther('0.002')) {
      console.log(`   ❌ Balance insuficiente en ${chain.name}`);
      isExecuting = false;
      return { success: false, error: 'Balance insuficiente' };
    }
    
    // 2. Wrap ETH → WETH
    console.log(`   📦 [1/5] Wrapping ${opp.amountInEth} ETH → WETH...`);
    const wrapTx = await weth.deposit({ 
      value: opp.amountIn, 
      gasLimit: 60000 
    });
    const wrapReceipt = await wrapTx.wait(1);
    console.log(`   ✅ Wrapped! TX: ${wrapReceipt.hash.slice(0, 20)}...`);
    
    // 3. Approve WETH
    const wethAllowance = await weth.allowance(WALLET_ADDRESS, chain.router);
    if (wethAllowance < opp.amountIn) {
      console.log(`   🔓 [2/5] Approving WETH...`);
      const approveTx = await weth.approve(chain.router, ethers.MaxUint256, { gasLimit: 60000 });
      await approveTx.wait(1);
      console.log(`   ✅ WETH Approved!`);
    } else {
      console.log(`   ✅ [2/5] WETH ya aprobado`);
    }
    
    // 4. SWAP 1: WETH → USDC
    console.log(`   🔄 [3/5] Swap WETH → USDC (fee: ${opp.fee1/100}%)...`);
    const minUsdc = (opp.usdcIntermediate * BigInt(10000 - CONFIG.MAX_SLIPPAGE_BPS)) / 10000n;
    
    const swap1Tx = await router.exactInputSingle({
      tokenIn: chain.tokens.WETH,
      tokenOut: chain.tokens.USDC,
      fee: opp.fee1,
      recipient: WALLET_ADDRESS,
      amountIn: opp.amountIn,
      amountOutMinimum: minUsdc,
      sqrtPriceLimitX96: 0n
    }, { gasLimit: 350000 });
    
    const receipt1 = await swap1Tx.wait(1);
    console.log(`   ✅ Swap 1 completado! TX: ${receipt1.hash.slice(0, 20)}...`);
    
    // 5. Obtener balance USDC
    const usdc = new ethers.Contract(chain.tokens.USDC, ERC20_ABI, signer);
    const usdcBalance = await usdc.balanceOf(WALLET_ADDRESS);
    console.log(`   💵 USDC recibido: ${ethers.formatUnits(usdcBalance, 6)}`);
    
    // 6. Approve USDC
    const usdcAllowance = await usdc.allowance(WALLET_ADDRESS, chain.router);
    if (usdcAllowance < usdcBalance) {
      console.log(`   🔓 [4/5] Approving USDC...`);
      const approveUsdcTx = await usdc.approve(chain.router, ethers.MaxUint256, { gasLimit: 60000 });
      await approveUsdcTx.wait(1);
      console.log(`   ✅ USDC Approved!`);
    } else {
      console.log(`   ✅ [4/5] USDC ya aprobado`);
    }
    
    // 7. SWAP 2: USDC → WETH
    console.log(`   🔄 [5/5] Swap USDC → WETH (fee: ${opp.fee2/100}%)...`);
    const minWeth = (opp.wethOut * BigInt(10000 - CONFIG.MAX_SLIPPAGE_BPS)) / 10000n;
    
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
    console.log(`   ✅ Swap 2 completado! TX: ${receipt2.hash.slice(0, 20)}...`);
    
    // 8. Calcular resultado
    const finalWeth = await weth.balanceOf(WALLET_ADDRESS);
    const actualProfit = finalWeth - opp.amountIn;
    const actualProfitUsd = parseFloat(ethers.formatEther(actualProfit)) * opp.ethPrice;
    
    const gas1 = receipt1.gasUsed * receipt1.gasPrice;
    const gas2 = receipt2.gasUsed * receipt2.gasPrice;
    const totalGasWei = gas1 + gas2;
    const totalGasUsd = parseFloat(ethers.formatEther(totalGasWei)) * opp.ethPrice;
    
    const netProfitUsd = actualProfitUsd - totalGasUsd;
    const executionTime = Date.now() - startTime;
    
    console.log(`${'═'.repeat(70)}`);
    console.log(`   🎉 TRADE COMPLETADO!`);
    console.log(`${'─'.repeat(70)}`);
    console.log(`   💰 Profit Bruto: $${actualProfitUsd.toFixed(4)}`);
    console.log(`   ⛽ Gas Total: $${totalGasUsd.toFixed(4)}`);
    console.log(`   💵 Profit Neto: $${netProfitUsd.toFixed(4)} ${netProfitUsd >= 0 ? '✅' : '❌'}`);
    console.log(`   ⏱️  Tiempo: ${executionTime}ms`);
    console.log(`   🔗 TX: ${chain.explorer}/tx/${receipt2.hash}`);
    console.log(`${'═'.repeat(70)}\n`);
    
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
    console.log(`${'═'.repeat(70)}`);
    console.log(`   ❌ ERROR EN TRADE: ${e.message}`);
    console.log(`${'═'.repeat(70)}\n`);
    
    isExecuting = false;
    return { success: false, error: e.message };
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// EJECUTAR MEJOR OPORTUNIDAD
// ═══════════════════════════════════════════════════════════════════════════════

async function executeBestOpportunity() {
  console.log('\n[SCAN] 🔍 Escaneando TODAS las chains para la MEJOR oportunidad...\n');
  
  const opportunities = await scanAllChains();
  
  if (opportunities.length === 0) {
    console.log('[SCAN] No se encontraron oportunidades');
    return null;
  }
  
  // Mostrar top 5 oportunidades
  console.log('\n📊 TOP 5 OPORTUNIDADES (ordenadas por profit):');
  console.log('─'.repeat(70));
  opportunities.slice(0, 5).forEach((opp, i) => {
    const profitColor = opp.netProfitUsd >= 0 ? '\x1b[32m' : '\x1b[31m';
    console.log(`${i + 1}. ${opp.chainName} | ${opp.route} | ${opp.amountInEth} ETH | ${profitColor}$${opp.netProfitUsd.toFixed(4)}\x1b[0m`);
  });
  console.log('─'.repeat(70));
  
  // Guardar oportunidades en estado
  state.opportunities = opportunities.slice(0, 20).map(o => ({
    ...o,
    amountIn: o.amountIn.toString(),
    usdcIntermediate: o.usdcIntermediate.toString(),
    wethOut: o.wethOut.toString()
  }));
  
  // Filtrar las que cumplen el umbral
  const executableOpps = opportunities.filter(o => o.netProfitUsd >= CONFIG.MIN_PROFIT_USD);
  
  if (executableOpps.length === 0) {
    console.log(`\n[EXEC] ⚠️ Ninguna oportunidad supera el umbral de $${CONFIG.MIN_PROFIT_USD}`);
    console.log(`[EXEC] La mejor tiene $${opportunities[0].netProfitUsd.toFixed(4)}`);
    return null;
  }
  
  // Ejecutar la MEJOR
  const best = executableOpps[0];
  console.log(`\n[EXEC] 🎯 Ejecutando MEJOR oportunidad: ${best.chainName} | ${best.route} | $${best.netProfitUsd.toFixed(4)}`);
  
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
      state.stats.totalProfitUsd += result.profitUsd || 0;
      state.stats.totalGasUsd += result.gasUsd || 0;
      state.stats.netProfitUsd = state.stats.totalProfitUsd - state.stats.totalGasUsd;
      state.stats.lastTrade = tradeLog;
    }
    
    state.stats.winRate = state.stats.tradesExecuted > 0
      ? (state.stats.tradesSuccessful / state.stats.tradesExecuted) * 100
      : 0;
  }
  
  return result;
}

// ═══════════════════════════════════════════════════════════════════════════════
// LOOP PRINCIPAL
// ═══════════════════════════════════════════════════════════════════════════════

async function tick() {
  if (!state.isRunning || isExecuting) return;
  
  state.stats.totalScans++;
  state.stats.uptime = Math.floor((Date.now() - state.startTime) / 1000);
  state.stats.currentStrategy = 'SCANNING';
  
  await executeBestOpportunity();
}

// ═══════════════════════════════════════════════════════════════════════════════
// API
// ═══════════════════════════════════════════════════════════════════════════════

app.get('/api/defi/multichain-arb/status', (req, res) => {
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
  
  // Reset stats
  state.stats = {
    totalScans: 0, opportunitiesFound: 0, tradesAttempted: 0, tradesExecuted: 0,
    tradesSuccessful: 0, totalProfitUsd: 0, totalGasUsd: 0, netProfitUsd: 0,
    winRate: 0, avgScanTimeMs: 0, scansPerSecond: 0, uptime: 0,
    currentChain: 'base', currentStrategy: 'STARTING', lastOpportunity: null, lastTrade: null
  };
  state.tradeLogs = [];
  state.opportunities = [];
  
  console.log(`\n${'═'.repeat(70)}`);
  console.log(`🔥 BOT AGRESIVO INICIADO - ${state.isDryRun ? 'DRY RUN' : '⚠️ MODO REAL - EJECUTANDO TRADES'}`);
  console.log(`${'═'.repeat(70)}`);
  console.log(`   Min Profit: $${CONFIG.MIN_PROFIT_USD}`);
  console.log(`   Auto Execute: ${CONFIG.AUTO_EXECUTE}`);
  console.log(`   Execute on Start: ${CONFIG.EXECUTE_ON_START}`);
  console.log(`${'═'.repeat(70)}\n`);
  
  // EJECUTAR INMEDIATAMENTE al iniciar
  if (CONFIG.EXECUTE_ON_START && !state.isDryRun) {
    console.log('[START] 🚀 Ejecutando primera oportunidad inmediatamente...\n');
    await executeBestOpportunity();
  }
  
  // Iniciar loop
  if (timer) clearInterval(timer);
  timer = setInterval(tick, CONFIG.SCAN_INTERVAL_MS);
  
  res.json({
    success: true,
    isRunning: true,
    isDryRun: state.isDryRun,
    mode: 'AGGRESSIVE_EXECUTOR',
    config: CONFIG
  });
});

app.post('/api/defi/multichain-arb/stop', (req, res) => {
  state.isRunning = false;
  if (timer) { clearInterval(timer); timer = null; }
  console.log('\n[STOP] Bot detenido\n');
  res.json({ success: true, isRunning: false });
});

app.post('/api/defi/multichain-arb/execute-now', async (req, res) => {
  console.log('\n[API] Ejecución manual solicitada...\n');
  const result = await executeBestOpportunity();
  res.json({ success: true, result });
});

app.get('/api/defi/multichain-arb/health', (req, res) => {
  res.json({
    status: 'ok',
    mode: 'AGGRESSIVE_EXECUTOR',
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
${'═'.repeat(70)}

   🔥 BOT AGRESIVO - EJECUTOR DE TRANSACCIONES REALES
   
   ✅ Puerto: ${PORT}
   ✅ Wallet: ${WALLET_ADDRESS.slice(0, 10)}...${WALLET_ADDRESS.slice(-5)}
   
   ⚡ Min Profit: $${CONFIG.MIN_PROFIT_USD} (puede ser negativo para pruebas)
   ⚡ Auto Execute: ${CONFIG.AUTO_EXECUTE}
   ⚡ Execute on Start: ${CONFIG.EXECUTE_ON_START}
   
   ⚠️  MODO AGRESIVO - Ejecutará trades reales inmediatamente

${'═'.repeat(70)}
  `);
  
  await init();
  console.log('\n[READY] 🔥 POST /api/defi/multichain-arb/start para iniciar\n');
  console.log('[READY] 🚀 POST /api/defi/multichain-arb/execute-now para ejecutar manualmente\n');
});

process.on('SIGINT', () => {
  if (timer) clearInterval(timer);
  process.exit(0);
});


 * ═══════════════════════════════════════════════════════════════════════════════
 * 🔥 BOT AGRESIVO - EJECUTA TRANSACCIONES REALES
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * Este bot:
 * 1. Ordena oportunidades por mejor profit
 * 2. Ejecuta la MEJOR oportunidad inmediatamente
 * 3. Umbral de profit muy bajo para ejecutar más trades
 * 4. Ejecuta aunque el profit sea pequeño o ligeramente negativo
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
// CONFIGURACIÓN MUY AGRESIVA
// ═══════════════════════════════════════════════════════════════════════════════

const CONFIG = {
  SCAN_INTERVAL_MS: 1000,
  // UMBRAL MUY BAJO - Ejecutar incluso con pequeña pérdida para probar
  MIN_PROFIT_USD: -0.50,          // Acepta hasta $0.50 de pérdida
  MAX_SLIPPAGE_BPS: 100,          // 1% slippage
  AUTO_EXECUTE: true,
  EXECUTE_ON_START: true,         // Ejecutar inmediatamente al iniciar
  ETH_PRICE_USD: 3500,
  TRADE_AMOUNTS: [0.005, 0.01],   // Cantidades pequeñas para pruebas
  FEE_TIERS: [500, 3000]          // Solo 0.05% y 0.3%
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
  mode: 'AGGRESSIVE_EXECUTOR',
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
    currentStrategy: 'IDLE',
    lastOpportunity: null,
    lastTrade: null
  },
  chains: [],
  tradeLogs: [],
  opportunities: [],
  banditStates: [],
  strategies: {
    flashLoan: { enabled: false, scans: 0, opportunities: 0, executions: 0 },
    mev: { enabled: false, scans: 0, opportunities: 0, executions: 0 },
    triangular: { enabled: false, scans: 0, opportunities: 0, executions: 0 },
    simpleArb: { enabled: true, scans: 0, opportunities: 0, executions: 0 },
    crossDex: { enabled: false, scans: 0, opportunities: 0, executions: 0 },
    liquidation: { enabled: false, scans: 0, opportunities: 0, executions: 0 }
  }
};

let timer = null;
let providers = {};
let signers = {};
let contracts = {};
let isExecuting = false;
let currentChainIndex = 0;

// ═══════════════════════════════════════════════════════════════════════════════
// INICIALIZACIÓN
// ═══════════════════════════════════════════════════════════════════════════════

async function init() {
  console.log('\n[INIT] 🔌 Conectando a chains...\n');
  
  for (const [chainKey, chain] of Object.entries(CHAINS)) {
    try {
      const provider = new ethers.JsonRpcProvider(chain.rpc);
      await provider.getBlockNumber();
      
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
        isActive: balanceEth > 0.003,
        explorer: chain.explorer,
        ethPrice: 0,
        connected: true
      });
      
      state.banditStates.push({
        chain: chainKey,
        alpha: 2,
        beta: 2,
        winRate: 50,
        selected: chainKey === 'base'
      });
      
      console.log(`   ✅ ${chain.name}: ${balanceEth.toFixed(6)} ETH ($${(balanceEth * CONFIG.ETH_PRICE_USD).toFixed(2)})`);
    } catch (e) {
      console.error(`   ❌ ${chain.name}: ${e.message}`);
      state.chains.push({
        chain: chainKey,
        name: chain.name,
        connected: false,
        balance: '0',
        balanceUsd: 0,
        isActive: false
      });
    }
  }
  console.log('');
}

// ═══════════════════════════════════════════════════════════════════════════════
// ESCANEO DE OPORTUNIDADES
// ═══════════════════════════════════════════════════════════════════════════════

async function scanAllChains() {
  const allOpportunities = [];
  
  for (const [chainKey, chain] of Object.entries(CHAINS)) {
    if (!providers[chainKey]) continue;
    
    const quoter = contracts[chainKey].quoter;
    const provider = providers[chainKey];
    
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
              const netProfitUsd = parseFloat(ethers.formatEther(netProfit)) * ethPrice;
              const spreadBps = Number((grossProfit * 10000n) / amountWei);
              
              allOpportunities.push({
                chain: chainKey,
                chainName: chain.name,
                strategy: 'SIMPLE_ARB',
                route: `${CONFIG.FEE_TIERS[i]/100}%→${CONFIG.FEE_TIERS[j]/100}%`,
                amountInEth: amountEth,
                amountIn: amountWei,
                fee1: CONFIG.FEE_TIERS[i],
                fee2: CONFIG.FEE_TIERS[j],
                usdcIntermediate: usdcOut,
                wethOut: wethOut,
                spreadBps,
                netProfitUsd,
                gasCostUsd,
                ethPrice,
                profitable: netProfitUsd >= CONFIG.MIN_PROFIT_USD,
                timestamp: Date.now()
              });
              
            } catch (e) {}
          }
        }
      }
    } catch (e) {
      console.error(`[SCAN] Error ${chain.name}: ${e.message.slice(0, 50)}`);
    }
  }
  
  // Ordenar por MEJOR profit (de mayor a menor)
  allOpportunities.sort((a, b) => b.netProfitUsd - a.netProfitUsd);
  
  return allOpportunities;
}

// ═══════════════════════════════════════════════════════════════════════════════
// EJECUCIÓN DE TRADE
// ═══════════════════════════════════════════════════════════════════════════════

async function executeTrade(opp) {
  if (isExecuting) {
    console.log('[EXEC] Ya hay una ejecución en progreso');
    return null;
  }
  
  isExecuting = true;
  
  const chain = CHAINS[opp.chain];
  const signer = signers[opp.chain];
  const provider = providers[opp.chain];
  const { router, weth } = contracts[opp.chain];
  
  console.log(`\n${'═'.repeat(70)}`);
  console.log(`🔥 EJECUTANDO TRADE REAL en ${chain.name.toUpperCase()}`);
  console.log(`${'═'.repeat(70)}`);
  console.log(`   📊 Estrategia: ${opp.strategy}`);
  console.log(`   🔄 Ruta: ${opp.route}`);
  console.log(`   💰 Amount: ${opp.amountInEth} ETH`);
  console.log(`   📈 Expected Profit: $${opp.netProfitUsd.toFixed(4)}`);
  console.log(`   ⛽ Gas estimado: $${opp.gasCostUsd.toFixed(4)}`);
  console.log(`${'─'.repeat(70)}`);
  
  const startTime = Date.now();
  
  try {
    // 1. Verificar balance
    const balance = await provider.getBalance(WALLET_ADDRESS);
    const balanceEth = parseFloat(ethers.formatEther(balance));
    console.log(`   💳 Balance actual: ${balanceEth.toFixed(6)} ETH`);
    
    if (balance < opp.amountIn + ethers.parseEther('0.002')) {
      console.log(`   ❌ Balance insuficiente en ${chain.name}`);
      isExecuting = false;
      return { success: false, error: 'Balance insuficiente' };
    }
    
    // 2. Wrap ETH → WETH
    console.log(`   📦 [1/5] Wrapping ${opp.amountInEth} ETH → WETH...`);
    const wrapTx = await weth.deposit({ 
      value: opp.amountIn, 
      gasLimit: 60000 
    });
    const wrapReceipt = await wrapTx.wait(1);
    console.log(`   ✅ Wrapped! TX: ${wrapReceipt.hash.slice(0, 20)}...`);
    
    // 3. Approve WETH
    const wethAllowance = await weth.allowance(WALLET_ADDRESS, chain.router);
    if (wethAllowance < opp.amountIn) {
      console.log(`   🔓 [2/5] Approving WETH...`);
      const approveTx = await weth.approve(chain.router, ethers.MaxUint256, { gasLimit: 60000 });
      await approveTx.wait(1);
      console.log(`   ✅ WETH Approved!`);
    } else {
      console.log(`   ✅ [2/5] WETH ya aprobado`);
    }
    
    // 4. SWAP 1: WETH → USDC
    console.log(`   🔄 [3/5] Swap WETH → USDC (fee: ${opp.fee1/100}%)...`);
    const minUsdc = (opp.usdcIntermediate * BigInt(10000 - CONFIG.MAX_SLIPPAGE_BPS)) / 10000n;
    
    const swap1Tx = await router.exactInputSingle({
      tokenIn: chain.tokens.WETH,
      tokenOut: chain.tokens.USDC,
      fee: opp.fee1,
      recipient: WALLET_ADDRESS,
      amountIn: opp.amountIn,
      amountOutMinimum: minUsdc,
      sqrtPriceLimitX96: 0n
    }, { gasLimit: 350000 });
    
    const receipt1 = await swap1Tx.wait(1);
    console.log(`   ✅ Swap 1 completado! TX: ${receipt1.hash.slice(0, 20)}...`);
    
    // 5. Obtener balance USDC
    const usdc = new ethers.Contract(chain.tokens.USDC, ERC20_ABI, signer);
    const usdcBalance = await usdc.balanceOf(WALLET_ADDRESS);
    console.log(`   💵 USDC recibido: ${ethers.formatUnits(usdcBalance, 6)}`);
    
    // 6. Approve USDC
    const usdcAllowance = await usdc.allowance(WALLET_ADDRESS, chain.router);
    if (usdcAllowance < usdcBalance) {
      console.log(`   🔓 [4/5] Approving USDC...`);
      const approveUsdcTx = await usdc.approve(chain.router, ethers.MaxUint256, { gasLimit: 60000 });
      await approveUsdcTx.wait(1);
      console.log(`   ✅ USDC Approved!`);
    } else {
      console.log(`   ✅ [4/5] USDC ya aprobado`);
    }
    
    // 7. SWAP 2: USDC → WETH
    console.log(`   🔄 [5/5] Swap USDC → WETH (fee: ${opp.fee2/100}%)...`);
    const minWeth = (opp.wethOut * BigInt(10000 - CONFIG.MAX_SLIPPAGE_BPS)) / 10000n;
    
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
    console.log(`   ✅ Swap 2 completado! TX: ${receipt2.hash.slice(0, 20)}...`);
    
    // 8. Calcular resultado
    const finalWeth = await weth.balanceOf(WALLET_ADDRESS);
    const actualProfit = finalWeth - opp.amountIn;
    const actualProfitUsd = parseFloat(ethers.formatEther(actualProfit)) * opp.ethPrice;
    
    const gas1 = receipt1.gasUsed * receipt1.gasPrice;
    const gas2 = receipt2.gasUsed * receipt2.gasPrice;
    const totalGasWei = gas1 + gas2;
    const totalGasUsd = parseFloat(ethers.formatEther(totalGasWei)) * opp.ethPrice;
    
    const netProfitUsd = actualProfitUsd - totalGasUsd;
    const executionTime = Date.now() - startTime;
    
    console.log(`${'═'.repeat(70)}`);
    console.log(`   🎉 TRADE COMPLETADO!`);
    console.log(`${'─'.repeat(70)}`);
    console.log(`   💰 Profit Bruto: $${actualProfitUsd.toFixed(4)}`);
    console.log(`   ⛽ Gas Total: $${totalGasUsd.toFixed(4)}`);
    console.log(`   💵 Profit Neto: $${netProfitUsd.toFixed(4)} ${netProfitUsd >= 0 ? '✅' : '❌'}`);
    console.log(`   ⏱️  Tiempo: ${executionTime}ms`);
    console.log(`   🔗 TX: ${chain.explorer}/tx/${receipt2.hash}`);
    console.log(`${'═'.repeat(70)}\n`);
    
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
    console.log(`${'═'.repeat(70)}`);
    console.log(`   ❌ ERROR EN TRADE: ${e.message}`);
    console.log(`${'═'.repeat(70)}\n`);
    
    isExecuting = false;
    return { success: false, error: e.message };
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// EJECUTAR MEJOR OPORTUNIDAD
// ═══════════════════════════════════════════════════════════════════════════════

async function executeBestOpportunity() {
  console.log('\n[SCAN] 🔍 Escaneando TODAS las chains para la MEJOR oportunidad...\n');
  
  const opportunities = await scanAllChains();
  
  if (opportunities.length === 0) {
    console.log('[SCAN] No se encontraron oportunidades');
    return null;
  }
  
  // Mostrar top 5 oportunidades
  console.log('\n📊 TOP 5 OPORTUNIDADES (ordenadas por profit):');
  console.log('─'.repeat(70));
  opportunities.slice(0, 5).forEach((opp, i) => {
    const profitColor = opp.netProfitUsd >= 0 ? '\x1b[32m' : '\x1b[31m';
    console.log(`${i + 1}. ${opp.chainName} | ${opp.route} | ${opp.amountInEth} ETH | ${profitColor}$${opp.netProfitUsd.toFixed(4)}\x1b[0m`);
  });
  console.log('─'.repeat(70));
  
  // Guardar oportunidades en estado
  state.opportunities = opportunities.slice(0, 20).map(o => ({
    ...o,
    amountIn: o.amountIn.toString(),
    usdcIntermediate: o.usdcIntermediate.toString(),
    wethOut: o.wethOut.toString()
  }));
  
  // Filtrar las que cumplen el umbral
  const executableOpps = opportunities.filter(o => o.netProfitUsd >= CONFIG.MIN_PROFIT_USD);
  
  if (executableOpps.length === 0) {
    console.log(`\n[EXEC] ⚠️ Ninguna oportunidad supera el umbral de $${CONFIG.MIN_PROFIT_USD}`);
    console.log(`[EXEC] La mejor tiene $${opportunities[0].netProfitUsd.toFixed(4)}`);
    return null;
  }
  
  // Ejecutar la MEJOR
  const best = executableOpps[0];
  console.log(`\n[EXEC] 🎯 Ejecutando MEJOR oportunidad: ${best.chainName} | ${best.route} | $${best.netProfitUsd.toFixed(4)}`);
  
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
      state.stats.totalProfitUsd += result.profitUsd || 0;
      state.stats.totalGasUsd += result.gasUsd || 0;
      state.stats.netProfitUsd = state.stats.totalProfitUsd - state.stats.totalGasUsd;
      state.stats.lastTrade = tradeLog;
    }
    
    state.stats.winRate = state.stats.tradesExecuted > 0
      ? (state.stats.tradesSuccessful / state.stats.tradesExecuted) * 100
      : 0;
  }
  
  return result;
}

// ═══════════════════════════════════════════════════════════════════════════════
// LOOP PRINCIPAL
// ═══════════════════════════════════════════════════════════════════════════════

async function tick() {
  if (!state.isRunning || isExecuting) return;
  
  state.stats.totalScans++;
  state.stats.uptime = Math.floor((Date.now() - state.startTime) / 1000);
  state.stats.currentStrategy = 'SCANNING';
  
  await executeBestOpportunity();
}

// ═══════════════════════════════════════════════════════════════════════════════
// API
// ═══════════════════════════════════════════════════════════════════════════════

app.get('/api/defi/multichain-arb/status', (req, res) => {
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
  
  // Reset stats
  state.stats = {
    totalScans: 0, opportunitiesFound: 0, tradesAttempted: 0, tradesExecuted: 0,
    tradesSuccessful: 0, totalProfitUsd: 0, totalGasUsd: 0, netProfitUsd: 0,
    winRate: 0, avgScanTimeMs: 0, scansPerSecond: 0, uptime: 0,
    currentChain: 'base', currentStrategy: 'STARTING', lastOpportunity: null, lastTrade: null
  };
  state.tradeLogs = [];
  state.opportunities = [];
  
  console.log(`\n${'═'.repeat(70)}`);
  console.log(`🔥 BOT AGRESIVO INICIADO - ${state.isDryRun ? 'DRY RUN' : '⚠️ MODO REAL - EJECUTANDO TRADES'}`);
  console.log(`${'═'.repeat(70)}`);
  console.log(`   Min Profit: $${CONFIG.MIN_PROFIT_USD}`);
  console.log(`   Auto Execute: ${CONFIG.AUTO_EXECUTE}`);
  console.log(`   Execute on Start: ${CONFIG.EXECUTE_ON_START}`);
  console.log(`${'═'.repeat(70)}\n`);
  
  // EJECUTAR INMEDIATAMENTE al iniciar
  if (CONFIG.EXECUTE_ON_START && !state.isDryRun) {
    console.log('[START] 🚀 Ejecutando primera oportunidad inmediatamente...\n');
    await executeBestOpportunity();
  }
  
  // Iniciar loop
  if (timer) clearInterval(timer);
  timer = setInterval(tick, CONFIG.SCAN_INTERVAL_MS);
  
  res.json({
    success: true,
    isRunning: true,
    isDryRun: state.isDryRun,
    mode: 'AGGRESSIVE_EXECUTOR',
    config: CONFIG
  });
});

app.post('/api/defi/multichain-arb/stop', (req, res) => {
  state.isRunning = false;
  if (timer) { clearInterval(timer); timer = null; }
  console.log('\n[STOP] Bot detenido\n');
  res.json({ success: true, isRunning: false });
});

app.post('/api/defi/multichain-arb/execute-now', async (req, res) => {
  console.log('\n[API] Ejecución manual solicitada...\n');
  const result = await executeBestOpportunity();
  res.json({ success: true, result });
});

app.get('/api/defi/multichain-arb/health', (req, res) => {
  res.json({
    status: 'ok',
    mode: 'AGGRESSIVE_EXECUTOR',
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
${'═'.repeat(70)}

   🔥 BOT AGRESIVO - EJECUTOR DE TRANSACCIONES REALES
   
   ✅ Puerto: ${PORT}
   ✅ Wallet: ${WALLET_ADDRESS.slice(0, 10)}...${WALLET_ADDRESS.slice(-5)}
   
   ⚡ Min Profit: $${CONFIG.MIN_PROFIT_USD} (puede ser negativo para pruebas)
   ⚡ Auto Execute: ${CONFIG.AUTO_EXECUTE}
   ⚡ Execute on Start: ${CONFIG.EXECUTE_ON_START}
   
   ⚠️  MODO AGRESIVO - Ejecutará trades reales inmediatamente

${'═'.repeat(70)}
  `);
  
  await init();
  console.log('\n[READY] 🔥 POST /api/defi/multichain-arb/start para iniciar\n');
  console.log('[READY] 🚀 POST /api/defi/multichain-arb/execute-now para ejecutar manualmente\n');
});

process.on('SIGINT', () => {
  if (timer) clearInterval(timer);
  process.exit(0);
});



 * ═══════════════════════════════════════════════════════════════════════════════
 * 🔥 BOT AGRESIVO - EJECUTA TRANSACCIONES REALES
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * Este bot:
 * 1. Ordena oportunidades por mejor profit
 * 2. Ejecuta la MEJOR oportunidad inmediatamente
 * 3. Umbral de profit muy bajo para ejecutar más trades
 * 4. Ejecuta aunque el profit sea pequeño o ligeramente negativo
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
// CONFIGURACIÓN MUY AGRESIVA
// ═══════════════════════════════════════════════════════════════════════════════

const CONFIG = {
  SCAN_INTERVAL_MS: 1000,
  // UMBRAL MUY BAJO - Ejecutar incluso con pequeña pérdida para probar
  MIN_PROFIT_USD: -0.50,          // Acepta hasta $0.50 de pérdida
  MAX_SLIPPAGE_BPS: 100,          // 1% slippage
  AUTO_EXECUTE: true,
  EXECUTE_ON_START: true,         // Ejecutar inmediatamente al iniciar
  ETH_PRICE_USD: 3500,
  TRADE_AMOUNTS: [0.005, 0.01],   // Cantidades pequeñas para pruebas
  FEE_TIERS: [500, 3000]          // Solo 0.05% y 0.3%
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
  mode: 'AGGRESSIVE_EXECUTOR',
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
    currentStrategy: 'IDLE',
    lastOpportunity: null,
    lastTrade: null
  },
  chains: [],
  tradeLogs: [],
  opportunities: [],
  banditStates: [],
  strategies: {
    flashLoan: { enabled: false, scans: 0, opportunities: 0, executions: 0 },
    mev: { enabled: false, scans: 0, opportunities: 0, executions: 0 },
    triangular: { enabled: false, scans: 0, opportunities: 0, executions: 0 },
    simpleArb: { enabled: true, scans: 0, opportunities: 0, executions: 0 },
    crossDex: { enabled: false, scans: 0, opportunities: 0, executions: 0 },
    liquidation: { enabled: false, scans: 0, opportunities: 0, executions: 0 }
  }
};

let timer = null;
let providers = {};
let signers = {};
let contracts = {};
let isExecuting = false;
let currentChainIndex = 0;

// ═══════════════════════════════════════════════════════════════════════════════
// INICIALIZACIÓN
// ═══════════════════════════════════════════════════════════════════════════════

async function init() {
  console.log('\n[INIT] 🔌 Conectando a chains...\n');
  
  for (const [chainKey, chain] of Object.entries(CHAINS)) {
    try {
      const provider = new ethers.JsonRpcProvider(chain.rpc);
      await provider.getBlockNumber();
      
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
        isActive: balanceEth > 0.003,
        explorer: chain.explorer,
        ethPrice: 0,
        connected: true
      });
      
      state.banditStates.push({
        chain: chainKey,
        alpha: 2,
        beta: 2,
        winRate: 50,
        selected: chainKey === 'base'
      });
      
      console.log(`   ✅ ${chain.name}: ${balanceEth.toFixed(6)} ETH ($${(balanceEth * CONFIG.ETH_PRICE_USD).toFixed(2)})`);
    } catch (e) {
      console.error(`   ❌ ${chain.name}: ${e.message}`);
      state.chains.push({
        chain: chainKey,
        name: chain.name,
        connected: false,
        balance: '0',
        balanceUsd: 0,
        isActive: false
      });
    }
  }
  console.log('');
}

// ═══════════════════════════════════════════════════════════════════════════════
// ESCANEO DE OPORTUNIDADES
// ═══════════════════════════════════════════════════════════════════════════════

async function scanAllChains() {
  const allOpportunities = [];
  
  for (const [chainKey, chain] of Object.entries(CHAINS)) {
    if (!providers[chainKey]) continue;
    
    const quoter = contracts[chainKey].quoter;
    const provider = providers[chainKey];
    
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
              const netProfitUsd = parseFloat(ethers.formatEther(netProfit)) * ethPrice;
              const spreadBps = Number((grossProfit * 10000n) / amountWei);
              
              allOpportunities.push({
                chain: chainKey,
                chainName: chain.name,
                strategy: 'SIMPLE_ARB',
                route: `${CONFIG.FEE_TIERS[i]/100}%→${CONFIG.FEE_TIERS[j]/100}%`,
                amountInEth: amountEth,
                amountIn: amountWei,
                fee1: CONFIG.FEE_TIERS[i],
                fee2: CONFIG.FEE_TIERS[j],
                usdcIntermediate: usdcOut,
                wethOut: wethOut,
                spreadBps,
                netProfitUsd,
                gasCostUsd,
                ethPrice,
                profitable: netProfitUsd >= CONFIG.MIN_PROFIT_USD,
                timestamp: Date.now()
              });
              
            } catch (e) {}
          }
        }
      }
    } catch (e) {
      console.error(`[SCAN] Error ${chain.name}: ${e.message.slice(0, 50)}`);
    }
  }
  
  // Ordenar por MEJOR profit (de mayor a menor)
  allOpportunities.sort((a, b) => b.netProfitUsd - a.netProfitUsd);
  
  return allOpportunities;
}

// ═══════════════════════════════════════════════════════════════════════════════
// EJECUCIÓN DE TRADE
// ═══════════════════════════════════════════════════════════════════════════════

async function executeTrade(opp) {
  if (isExecuting) {
    console.log('[EXEC] Ya hay una ejecución en progreso');
    return null;
  }
  
  isExecuting = true;
  
  const chain = CHAINS[opp.chain];
  const signer = signers[opp.chain];
  const provider = providers[opp.chain];
  const { router, weth } = contracts[opp.chain];
  
  console.log(`\n${'═'.repeat(70)}`);
  console.log(`🔥 EJECUTANDO TRADE REAL en ${chain.name.toUpperCase()}`);
  console.log(`${'═'.repeat(70)}`);
  console.log(`   📊 Estrategia: ${opp.strategy}`);
  console.log(`   🔄 Ruta: ${opp.route}`);
  console.log(`   💰 Amount: ${opp.amountInEth} ETH`);
  console.log(`   📈 Expected Profit: $${opp.netProfitUsd.toFixed(4)}`);
  console.log(`   ⛽ Gas estimado: $${opp.gasCostUsd.toFixed(4)}`);
  console.log(`${'─'.repeat(70)}`);
  
  const startTime = Date.now();
  
  try {
    // 1. Verificar balance
    const balance = await provider.getBalance(WALLET_ADDRESS);
    const balanceEth = parseFloat(ethers.formatEther(balance));
    console.log(`   💳 Balance actual: ${balanceEth.toFixed(6)} ETH`);
    
    if (balance < opp.amountIn + ethers.parseEther('0.002')) {
      console.log(`   ❌ Balance insuficiente en ${chain.name}`);
      isExecuting = false;
      return { success: false, error: 'Balance insuficiente' };
    }
    
    // 2. Wrap ETH → WETH
    console.log(`   📦 [1/5] Wrapping ${opp.amountInEth} ETH → WETH...`);
    const wrapTx = await weth.deposit({ 
      value: opp.amountIn, 
      gasLimit: 60000 
    });
    const wrapReceipt = await wrapTx.wait(1);
    console.log(`   ✅ Wrapped! TX: ${wrapReceipt.hash.slice(0, 20)}...`);
    
    // 3. Approve WETH
    const wethAllowance = await weth.allowance(WALLET_ADDRESS, chain.router);
    if (wethAllowance < opp.amountIn) {
      console.log(`   🔓 [2/5] Approving WETH...`);
      const approveTx = await weth.approve(chain.router, ethers.MaxUint256, { gasLimit: 60000 });
      await approveTx.wait(1);
      console.log(`   ✅ WETH Approved!`);
    } else {
      console.log(`   ✅ [2/5] WETH ya aprobado`);
    }
    
    // 4. SWAP 1: WETH → USDC
    console.log(`   🔄 [3/5] Swap WETH → USDC (fee: ${opp.fee1/100}%)...`);
    const minUsdc = (opp.usdcIntermediate * BigInt(10000 - CONFIG.MAX_SLIPPAGE_BPS)) / 10000n;
    
    const swap1Tx = await router.exactInputSingle({
      tokenIn: chain.tokens.WETH,
      tokenOut: chain.tokens.USDC,
      fee: opp.fee1,
      recipient: WALLET_ADDRESS,
      amountIn: opp.amountIn,
      amountOutMinimum: minUsdc,
      sqrtPriceLimitX96: 0n
    }, { gasLimit: 350000 });
    
    const receipt1 = await swap1Tx.wait(1);
    console.log(`   ✅ Swap 1 completado! TX: ${receipt1.hash.slice(0, 20)}...`);
    
    // 5. Obtener balance USDC
    const usdc = new ethers.Contract(chain.tokens.USDC, ERC20_ABI, signer);
    const usdcBalance = await usdc.balanceOf(WALLET_ADDRESS);
    console.log(`   💵 USDC recibido: ${ethers.formatUnits(usdcBalance, 6)}`);
    
    // 6. Approve USDC
    const usdcAllowance = await usdc.allowance(WALLET_ADDRESS, chain.router);
    if (usdcAllowance < usdcBalance) {
      console.log(`   🔓 [4/5] Approving USDC...`);
      const approveUsdcTx = await usdc.approve(chain.router, ethers.MaxUint256, { gasLimit: 60000 });
      await approveUsdcTx.wait(1);
      console.log(`   ✅ USDC Approved!`);
    } else {
      console.log(`   ✅ [4/5] USDC ya aprobado`);
    }
    
    // 7. SWAP 2: USDC → WETH
    console.log(`   🔄 [5/5] Swap USDC → WETH (fee: ${opp.fee2/100}%)...`);
    const minWeth = (opp.wethOut * BigInt(10000 - CONFIG.MAX_SLIPPAGE_BPS)) / 10000n;
    
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
    console.log(`   ✅ Swap 2 completado! TX: ${receipt2.hash.slice(0, 20)}...`);
    
    // 8. Calcular resultado
    const finalWeth = await weth.balanceOf(WALLET_ADDRESS);
    const actualProfit = finalWeth - opp.amountIn;
    const actualProfitUsd = parseFloat(ethers.formatEther(actualProfit)) * opp.ethPrice;
    
    const gas1 = receipt1.gasUsed * receipt1.gasPrice;
    const gas2 = receipt2.gasUsed * receipt2.gasPrice;
    const totalGasWei = gas1 + gas2;
    const totalGasUsd = parseFloat(ethers.formatEther(totalGasWei)) * opp.ethPrice;
    
    const netProfitUsd = actualProfitUsd - totalGasUsd;
    const executionTime = Date.now() - startTime;
    
    console.log(`${'═'.repeat(70)}`);
    console.log(`   🎉 TRADE COMPLETADO!`);
    console.log(`${'─'.repeat(70)}`);
    console.log(`   💰 Profit Bruto: $${actualProfitUsd.toFixed(4)}`);
    console.log(`   ⛽ Gas Total: $${totalGasUsd.toFixed(4)}`);
    console.log(`   💵 Profit Neto: $${netProfitUsd.toFixed(4)} ${netProfitUsd >= 0 ? '✅' : '❌'}`);
    console.log(`   ⏱️  Tiempo: ${executionTime}ms`);
    console.log(`   🔗 TX: ${chain.explorer}/tx/${receipt2.hash}`);
    console.log(`${'═'.repeat(70)}\n`);
    
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
    console.log(`${'═'.repeat(70)}`);
    console.log(`   ❌ ERROR EN TRADE: ${e.message}`);
    console.log(`${'═'.repeat(70)}\n`);
    
    isExecuting = false;
    return { success: false, error: e.message };
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// EJECUTAR MEJOR OPORTUNIDAD
// ═══════════════════════════════════════════════════════════════════════════════

async function executeBestOpportunity() {
  console.log('\n[SCAN] 🔍 Escaneando TODAS las chains para la MEJOR oportunidad...\n');
  
  const opportunities = await scanAllChains();
  
  if (opportunities.length === 0) {
    console.log('[SCAN] No se encontraron oportunidades');
    return null;
  }
  
  // Mostrar top 5 oportunidades
  console.log('\n📊 TOP 5 OPORTUNIDADES (ordenadas por profit):');
  console.log('─'.repeat(70));
  opportunities.slice(0, 5).forEach((opp, i) => {
    const profitColor = opp.netProfitUsd >= 0 ? '\x1b[32m' : '\x1b[31m';
    console.log(`${i + 1}. ${opp.chainName} | ${opp.route} | ${opp.amountInEth} ETH | ${profitColor}$${opp.netProfitUsd.toFixed(4)}\x1b[0m`);
  });
  console.log('─'.repeat(70));
  
  // Guardar oportunidades en estado
  state.opportunities = opportunities.slice(0, 20).map(o => ({
    ...o,
    amountIn: o.amountIn.toString(),
    usdcIntermediate: o.usdcIntermediate.toString(),
    wethOut: o.wethOut.toString()
  }));
  
  // Filtrar las que cumplen el umbral
  const executableOpps = opportunities.filter(o => o.netProfitUsd >= CONFIG.MIN_PROFIT_USD);
  
  if (executableOpps.length === 0) {
    console.log(`\n[EXEC] ⚠️ Ninguna oportunidad supera el umbral de $${CONFIG.MIN_PROFIT_USD}`);
    console.log(`[EXEC] La mejor tiene $${opportunities[0].netProfitUsd.toFixed(4)}`);
    return null;
  }
  
  // Ejecutar la MEJOR
  const best = executableOpps[0];
  console.log(`\n[EXEC] 🎯 Ejecutando MEJOR oportunidad: ${best.chainName} | ${best.route} | $${best.netProfitUsd.toFixed(4)}`);
  
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
      state.stats.totalProfitUsd += result.profitUsd || 0;
      state.stats.totalGasUsd += result.gasUsd || 0;
      state.stats.netProfitUsd = state.stats.totalProfitUsd - state.stats.totalGasUsd;
      state.stats.lastTrade = tradeLog;
    }
    
    state.stats.winRate = state.stats.tradesExecuted > 0
      ? (state.stats.tradesSuccessful / state.stats.tradesExecuted) * 100
      : 0;
  }
  
  return result;
}

// ═══════════════════════════════════════════════════════════════════════════════
// LOOP PRINCIPAL
// ═══════════════════════════════════════════════════════════════════════════════

async function tick() {
  if (!state.isRunning || isExecuting) return;
  
  state.stats.totalScans++;
  state.stats.uptime = Math.floor((Date.now() - state.startTime) / 1000);
  state.stats.currentStrategy = 'SCANNING';
  
  await executeBestOpportunity();
}

// ═══════════════════════════════════════════════════════════════════════════════
// API
// ═══════════════════════════════════════════════════════════════════════════════

app.get('/api/defi/multichain-arb/status', (req, res) => {
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
  
  // Reset stats
  state.stats = {
    totalScans: 0, opportunitiesFound: 0, tradesAttempted: 0, tradesExecuted: 0,
    tradesSuccessful: 0, totalProfitUsd: 0, totalGasUsd: 0, netProfitUsd: 0,
    winRate: 0, avgScanTimeMs: 0, scansPerSecond: 0, uptime: 0,
    currentChain: 'base', currentStrategy: 'STARTING', lastOpportunity: null, lastTrade: null
  };
  state.tradeLogs = [];
  state.opportunities = [];
  
  console.log(`\n${'═'.repeat(70)}`);
  console.log(`🔥 BOT AGRESIVO INICIADO - ${state.isDryRun ? 'DRY RUN' : '⚠️ MODO REAL - EJECUTANDO TRADES'}`);
  console.log(`${'═'.repeat(70)}`);
  console.log(`   Min Profit: $${CONFIG.MIN_PROFIT_USD}`);
  console.log(`   Auto Execute: ${CONFIG.AUTO_EXECUTE}`);
  console.log(`   Execute on Start: ${CONFIG.EXECUTE_ON_START}`);
  console.log(`${'═'.repeat(70)}\n`);
  
  // EJECUTAR INMEDIATAMENTE al iniciar
  if (CONFIG.EXECUTE_ON_START && !state.isDryRun) {
    console.log('[START] 🚀 Ejecutando primera oportunidad inmediatamente...\n');
    await executeBestOpportunity();
  }
  
  // Iniciar loop
  if (timer) clearInterval(timer);
  timer = setInterval(tick, CONFIG.SCAN_INTERVAL_MS);
  
  res.json({
    success: true,
    isRunning: true,
    isDryRun: state.isDryRun,
    mode: 'AGGRESSIVE_EXECUTOR',
    config: CONFIG
  });
});

app.post('/api/defi/multichain-arb/stop', (req, res) => {
  state.isRunning = false;
  if (timer) { clearInterval(timer); timer = null; }
  console.log('\n[STOP] Bot detenido\n');
  res.json({ success: true, isRunning: false });
});

app.post('/api/defi/multichain-arb/execute-now', async (req, res) => {
  console.log('\n[API] Ejecución manual solicitada...\n');
  const result = await executeBestOpportunity();
  res.json({ success: true, result });
});

app.get('/api/defi/multichain-arb/health', (req, res) => {
  res.json({
    status: 'ok',
    mode: 'AGGRESSIVE_EXECUTOR',
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
${'═'.repeat(70)}

   🔥 BOT AGRESIVO - EJECUTOR DE TRANSACCIONES REALES
   
   ✅ Puerto: ${PORT}
   ✅ Wallet: ${WALLET_ADDRESS.slice(0, 10)}...${WALLET_ADDRESS.slice(-5)}
   
   ⚡ Min Profit: $${CONFIG.MIN_PROFIT_USD} (puede ser negativo para pruebas)
   ⚡ Auto Execute: ${CONFIG.AUTO_EXECUTE}
   ⚡ Execute on Start: ${CONFIG.EXECUTE_ON_START}
   
   ⚠️  MODO AGRESIVO - Ejecutará trades reales inmediatamente

${'═'.repeat(70)}
  `);
  
  await init();
  console.log('\n[READY] 🔥 POST /api/defi/multichain-arb/start para iniciar\n');
  console.log('[READY] 🚀 POST /api/defi/multichain-arb/execute-now para ejecutar manualmente\n');
});

process.on('SIGINT', () => {
  if (timer) clearInterval(timer);
  process.exit(0);
});


 * ═══════════════════════════════════════════════════════════════════════════════
 * 🔥 BOT AGRESIVO - EJECUTA TRANSACCIONES REALES
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * Este bot:
 * 1. Ordena oportunidades por mejor profit
 * 2. Ejecuta la MEJOR oportunidad inmediatamente
 * 3. Umbral de profit muy bajo para ejecutar más trades
 * 4. Ejecuta aunque el profit sea pequeño o ligeramente negativo
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
// CONFIGURACIÓN MUY AGRESIVA
// ═══════════════════════════════════════════════════════════════════════════════

const CONFIG = {
  SCAN_INTERVAL_MS: 1000,
  // UMBRAL MUY BAJO - Ejecutar incluso con pequeña pérdida para probar
  MIN_PROFIT_USD: -0.50,          // Acepta hasta $0.50 de pérdida
  MAX_SLIPPAGE_BPS: 100,          // 1% slippage
  AUTO_EXECUTE: true,
  EXECUTE_ON_START: true,         // Ejecutar inmediatamente al iniciar
  ETH_PRICE_USD: 3500,
  TRADE_AMOUNTS: [0.005, 0.01],   // Cantidades pequeñas para pruebas
  FEE_TIERS: [500, 3000]          // Solo 0.05% y 0.3%
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
  mode: 'AGGRESSIVE_EXECUTOR',
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
    currentStrategy: 'IDLE',
    lastOpportunity: null,
    lastTrade: null
  },
  chains: [],
  tradeLogs: [],
  opportunities: [],
  banditStates: [],
  strategies: {
    flashLoan: { enabled: false, scans: 0, opportunities: 0, executions: 0 },
    mev: { enabled: false, scans: 0, opportunities: 0, executions: 0 },
    triangular: { enabled: false, scans: 0, opportunities: 0, executions: 0 },
    simpleArb: { enabled: true, scans: 0, opportunities: 0, executions: 0 },
    crossDex: { enabled: false, scans: 0, opportunities: 0, executions: 0 },
    liquidation: { enabled: false, scans: 0, opportunities: 0, executions: 0 }
  }
};

let timer = null;
let providers = {};
let signers = {};
let contracts = {};
let isExecuting = false;
let currentChainIndex = 0;

// ═══════════════════════════════════════════════════════════════════════════════
// INICIALIZACIÓN
// ═══════════════════════════════════════════════════════════════════════════════

async function init() {
  console.log('\n[INIT] 🔌 Conectando a chains...\n');
  
  for (const [chainKey, chain] of Object.entries(CHAINS)) {
    try {
      const provider = new ethers.JsonRpcProvider(chain.rpc);
      await provider.getBlockNumber();
      
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
        isActive: balanceEth > 0.003,
        explorer: chain.explorer,
        ethPrice: 0,
        connected: true
      });
      
      state.banditStates.push({
        chain: chainKey,
        alpha: 2,
        beta: 2,
        winRate: 50,
        selected: chainKey === 'base'
      });
      
      console.log(`   ✅ ${chain.name}: ${balanceEth.toFixed(6)} ETH ($${(balanceEth * CONFIG.ETH_PRICE_USD).toFixed(2)})`);
    } catch (e) {
      console.error(`   ❌ ${chain.name}: ${e.message}`);
      state.chains.push({
        chain: chainKey,
        name: chain.name,
        connected: false,
        balance: '0',
        balanceUsd: 0,
        isActive: false
      });
    }
  }
  console.log('');
}

// ═══════════════════════════════════════════════════════════════════════════════
// ESCANEO DE OPORTUNIDADES
// ═══════════════════════════════════════════════════════════════════════════════

async function scanAllChains() {
  const allOpportunities = [];
  
  for (const [chainKey, chain] of Object.entries(CHAINS)) {
    if (!providers[chainKey]) continue;
    
    const quoter = contracts[chainKey].quoter;
    const provider = providers[chainKey];
    
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
              const netProfitUsd = parseFloat(ethers.formatEther(netProfit)) * ethPrice;
              const spreadBps = Number((grossProfit * 10000n) / amountWei);
              
              allOpportunities.push({
                chain: chainKey,
                chainName: chain.name,
                strategy: 'SIMPLE_ARB',
                route: `${CONFIG.FEE_TIERS[i]/100}%→${CONFIG.FEE_TIERS[j]/100}%`,
                amountInEth: amountEth,
                amountIn: amountWei,
                fee1: CONFIG.FEE_TIERS[i],
                fee2: CONFIG.FEE_TIERS[j],
                usdcIntermediate: usdcOut,
                wethOut: wethOut,
                spreadBps,
                netProfitUsd,
                gasCostUsd,
                ethPrice,
                profitable: netProfitUsd >= CONFIG.MIN_PROFIT_USD,
                timestamp: Date.now()
              });
              
            } catch (e) {}
          }
        }
      }
    } catch (e) {
      console.error(`[SCAN] Error ${chain.name}: ${e.message.slice(0, 50)}`);
    }
  }
  
  // Ordenar por MEJOR profit (de mayor a menor)
  allOpportunities.sort((a, b) => b.netProfitUsd - a.netProfitUsd);
  
  return allOpportunities;
}

// ═══════════════════════════════════════════════════════════════════════════════
// EJECUCIÓN DE TRADE
// ═══════════════════════════════════════════════════════════════════════════════

async function executeTrade(opp) {
  if (isExecuting) {
    console.log('[EXEC] Ya hay una ejecución en progreso');
    return null;
  }
  
  isExecuting = true;
  
  const chain = CHAINS[opp.chain];
  const signer = signers[opp.chain];
  const provider = providers[opp.chain];
  const { router, weth } = contracts[opp.chain];
  
  console.log(`\n${'═'.repeat(70)}`);
  console.log(`🔥 EJECUTANDO TRADE REAL en ${chain.name.toUpperCase()}`);
  console.log(`${'═'.repeat(70)}`);
  console.log(`   📊 Estrategia: ${opp.strategy}`);
  console.log(`   🔄 Ruta: ${opp.route}`);
  console.log(`   💰 Amount: ${opp.amountInEth} ETH`);
  console.log(`   📈 Expected Profit: $${opp.netProfitUsd.toFixed(4)}`);
  console.log(`   ⛽ Gas estimado: $${opp.gasCostUsd.toFixed(4)}`);
  console.log(`${'─'.repeat(70)}`);
  
  const startTime = Date.now();
  
  try {
    // 1. Verificar balance
    const balance = await provider.getBalance(WALLET_ADDRESS);
    const balanceEth = parseFloat(ethers.formatEther(balance));
    console.log(`   💳 Balance actual: ${balanceEth.toFixed(6)} ETH`);
    
    if (balance < opp.amountIn + ethers.parseEther('0.002')) {
      console.log(`   ❌ Balance insuficiente en ${chain.name}`);
      isExecuting = false;
      return { success: false, error: 'Balance insuficiente' };
    }
    
    // 2. Wrap ETH → WETH
    console.log(`   📦 [1/5] Wrapping ${opp.amountInEth} ETH → WETH...`);
    const wrapTx = await weth.deposit({ 
      value: opp.amountIn, 
      gasLimit: 60000 
    });
    const wrapReceipt = await wrapTx.wait(1);
    console.log(`   ✅ Wrapped! TX: ${wrapReceipt.hash.slice(0, 20)}...`);
    
    // 3. Approve WETH
    const wethAllowance = await weth.allowance(WALLET_ADDRESS, chain.router);
    if (wethAllowance < opp.amountIn) {
      console.log(`   🔓 [2/5] Approving WETH...`);
      const approveTx = await weth.approve(chain.router, ethers.MaxUint256, { gasLimit: 60000 });
      await approveTx.wait(1);
      console.log(`   ✅ WETH Approved!`);
    } else {
      console.log(`   ✅ [2/5] WETH ya aprobado`);
    }
    
    // 4. SWAP 1: WETH → USDC
    console.log(`   🔄 [3/5] Swap WETH → USDC (fee: ${opp.fee1/100}%)...`);
    const minUsdc = (opp.usdcIntermediate * BigInt(10000 - CONFIG.MAX_SLIPPAGE_BPS)) / 10000n;
    
    const swap1Tx = await router.exactInputSingle({
      tokenIn: chain.tokens.WETH,
      tokenOut: chain.tokens.USDC,
      fee: opp.fee1,
      recipient: WALLET_ADDRESS,
      amountIn: opp.amountIn,
      amountOutMinimum: minUsdc,
      sqrtPriceLimitX96: 0n
    }, { gasLimit: 350000 });
    
    const receipt1 = await swap1Tx.wait(1);
    console.log(`   ✅ Swap 1 completado! TX: ${receipt1.hash.slice(0, 20)}...`);
    
    // 5. Obtener balance USDC
    const usdc = new ethers.Contract(chain.tokens.USDC, ERC20_ABI, signer);
    const usdcBalance = await usdc.balanceOf(WALLET_ADDRESS);
    console.log(`   💵 USDC recibido: ${ethers.formatUnits(usdcBalance, 6)}`);
    
    // 6. Approve USDC
    const usdcAllowance = await usdc.allowance(WALLET_ADDRESS, chain.router);
    if (usdcAllowance < usdcBalance) {
      console.log(`   🔓 [4/5] Approving USDC...`);
      const approveUsdcTx = await usdc.approve(chain.router, ethers.MaxUint256, { gasLimit: 60000 });
      await approveUsdcTx.wait(1);
      console.log(`   ✅ USDC Approved!`);
    } else {
      console.log(`   ✅ [4/5] USDC ya aprobado`);
    }
    
    // 7. SWAP 2: USDC → WETH
    console.log(`   🔄 [5/5] Swap USDC → WETH (fee: ${opp.fee2/100}%)...`);
    const minWeth = (opp.wethOut * BigInt(10000 - CONFIG.MAX_SLIPPAGE_BPS)) / 10000n;
    
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
    console.log(`   ✅ Swap 2 completado! TX: ${receipt2.hash.slice(0, 20)}...`);
    
    // 8. Calcular resultado
    const finalWeth = await weth.balanceOf(WALLET_ADDRESS);
    const actualProfit = finalWeth - opp.amountIn;
    const actualProfitUsd = parseFloat(ethers.formatEther(actualProfit)) * opp.ethPrice;
    
    const gas1 = receipt1.gasUsed * receipt1.gasPrice;
    const gas2 = receipt2.gasUsed * receipt2.gasPrice;
    const totalGasWei = gas1 + gas2;
    const totalGasUsd = parseFloat(ethers.formatEther(totalGasWei)) * opp.ethPrice;
    
    const netProfitUsd = actualProfitUsd - totalGasUsd;
    const executionTime = Date.now() - startTime;
    
    console.log(`${'═'.repeat(70)}`);
    console.log(`   🎉 TRADE COMPLETADO!`);
    console.log(`${'─'.repeat(70)}`);
    console.log(`   💰 Profit Bruto: $${actualProfitUsd.toFixed(4)}`);
    console.log(`   ⛽ Gas Total: $${totalGasUsd.toFixed(4)}`);
    console.log(`   💵 Profit Neto: $${netProfitUsd.toFixed(4)} ${netProfitUsd >= 0 ? '✅' : '❌'}`);
    console.log(`   ⏱️  Tiempo: ${executionTime}ms`);
    console.log(`   🔗 TX: ${chain.explorer}/tx/${receipt2.hash}`);
    console.log(`${'═'.repeat(70)}\n`);
    
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
    console.log(`${'═'.repeat(70)}`);
    console.log(`   ❌ ERROR EN TRADE: ${e.message}`);
    console.log(`${'═'.repeat(70)}\n`);
    
    isExecuting = false;
    return { success: false, error: e.message };
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// EJECUTAR MEJOR OPORTUNIDAD
// ═══════════════════════════════════════════════════════════════════════════════

async function executeBestOpportunity() {
  console.log('\n[SCAN] 🔍 Escaneando TODAS las chains para la MEJOR oportunidad...\n');
  
  const opportunities = await scanAllChains();
  
  if (opportunities.length === 0) {
    console.log('[SCAN] No se encontraron oportunidades');
    return null;
  }
  
  // Mostrar top 5 oportunidades
  console.log('\n📊 TOP 5 OPORTUNIDADES (ordenadas por profit):');
  console.log('─'.repeat(70));
  opportunities.slice(0, 5).forEach((opp, i) => {
    const profitColor = opp.netProfitUsd >= 0 ? '\x1b[32m' : '\x1b[31m';
    console.log(`${i + 1}. ${opp.chainName} | ${opp.route} | ${opp.amountInEth} ETH | ${profitColor}$${opp.netProfitUsd.toFixed(4)}\x1b[0m`);
  });
  console.log('─'.repeat(70));
  
  // Guardar oportunidades en estado
  state.opportunities = opportunities.slice(0, 20).map(o => ({
    ...o,
    amountIn: o.amountIn.toString(),
    usdcIntermediate: o.usdcIntermediate.toString(),
    wethOut: o.wethOut.toString()
  }));
  
  // Filtrar las que cumplen el umbral
  const executableOpps = opportunities.filter(o => o.netProfitUsd >= CONFIG.MIN_PROFIT_USD);
  
  if (executableOpps.length === 0) {
    console.log(`\n[EXEC] ⚠️ Ninguna oportunidad supera el umbral de $${CONFIG.MIN_PROFIT_USD}`);
    console.log(`[EXEC] La mejor tiene $${opportunities[0].netProfitUsd.toFixed(4)}`);
    return null;
  }
  
  // Ejecutar la MEJOR
  const best = executableOpps[0];
  console.log(`\n[EXEC] 🎯 Ejecutando MEJOR oportunidad: ${best.chainName} | ${best.route} | $${best.netProfitUsd.toFixed(4)}`);
  
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
      state.stats.totalProfitUsd += result.profitUsd || 0;
      state.stats.totalGasUsd += result.gasUsd || 0;
      state.stats.netProfitUsd = state.stats.totalProfitUsd - state.stats.totalGasUsd;
      state.stats.lastTrade = tradeLog;
    }
    
    state.stats.winRate = state.stats.tradesExecuted > 0
      ? (state.stats.tradesSuccessful / state.stats.tradesExecuted) * 100
      : 0;
  }
  
  return result;
}

// ═══════════════════════════════════════════════════════════════════════════════
// LOOP PRINCIPAL
// ═══════════════════════════════════════════════════════════════════════════════

async function tick() {
  if (!state.isRunning || isExecuting) return;
  
  state.stats.totalScans++;
  state.stats.uptime = Math.floor((Date.now() - state.startTime) / 1000);
  state.stats.currentStrategy = 'SCANNING';
  
  await executeBestOpportunity();
}

// ═══════════════════════════════════════════════════════════════════════════════
// API
// ═══════════════════════════════════════════════════════════════════════════════

app.get('/api/defi/multichain-arb/status', (req, res) => {
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
  
  // Reset stats
  state.stats = {
    totalScans: 0, opportunitiesFound: 0, tradesAttempted: 0, tradesExecuted: 0,
    tradesSuccessful: 0, totalProfitUsd: 0, totalGasUsd: 0, netProfitUsd: 0,
    winRate: 0, avgScanTimeMs: 0, scansPerSecond: 0, uptime: 0,
    currentChain: 'base', currentStrategy: 'STARTING', lastOpportunity: null, lastTrade: null
  };
  state.tradeLogs = [];
  state.opportunities = [];
  
  console.log(`\n${'═'.repeat(70)}`);
  console.log(`🔥 BOT AGRESIVO INICIADO - ${state.isDryRun ? 'DRY RUN' : '⚠️ MODO REAL - EJECUTANDO TRADES'}`);
  console.log(`${'═'.repeat(70)}`);
  console.log(`   Min Profit: $${CONFIG.MIN_PROFIT_USD}`);
  console.log(`   Auto Execute: ${CONFIG.AUTO_EXECUTE}`);
  console.log(`   Execute on Start: ${CONFIG.EXECUTE_ON_START}`);
  console.log(`${'═'.repeat(70)}\n`);
  
  // EJECUTAR INMEDIATAMENTE al iniciar
  if (CONFIG.EXECUTE_ON_START && !state.isDryRun) {
    console.log('[START] 🚀 Ejecutando primera oportunidad inmediatamente...\n');
    await executeBestOpportunity();
  }
  
  // Iniciar loop
  if (timer) clearInterval(timer);
  timer = setInterval(tick, CONFIG.SCAN_INTERVAL_MS);
  
  res.json({
    success: true,
    isRunning: true,
    isDryRun: state.isDryRun,
    mode: 'AGGRESSIVE_EXECUTOR',
    config: CONFIG
  });
});

app.post('/api/defi/multichain-arb/stop', (req, res) => {
  state.isRunning = false;
  if (timer) { clearInterval(timer); timer = null; }
  console.log('\n[STOP] Bot detenido\n');
  res.json({ success: true, isRunning: false });
});

app.post('/api/defi/multichain-arb/execute-now', async (req, res) => {
  console.log('\n[API] Ejecución manual solicitada...\n');
  const result = await executeBestOpportunity();
  res.json({ success: true, result });
});

app.get('/api/defi/multichain-arb/health', (req, res) => {
  res.json({
    status: 'ok',
    mode: 'AGGRESSIVE_EXECUTOR',
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
${'═'.repeat(70)}

   🔥 BOT AGRESIVO - EJECUTOR DE TRANSACCIONES REALES
   
   ✅ Puerto: ${PORT}
   ✅ Wallet: ${WALLET_ADDRESS.slice(0, 10)}...${WALLET_ADDRESS.slice(-5)}
   
   ⚡ Min Profit: $${CONFIG.MIN_PROFIT_USD} (puede ser negativo para pruebas)
   ⚡ Auto Execute: ${CONFIG.AUTO_EXECUTE}
   ⚡ Execute on Start: ${CONFIG.EXECUTE_ON_START}
   
   ⚠️  MODO AGRESIVO - Ejecutará trades reales inmediatamente

${'═'.repeat(70)}
  `);
  
  await init();
  console.log('\n[READY] 🔥 POST /api/defi/multichain-arb/start para iniciar\n');
  console.log('[READY] 🚀 POST /api/defi/multichain-arb/execute-now para ejecutar manualmente\n');
});

process.on('SIGINT', () => {
  if (timer) clearInterval(timer);
  process.exit(0);
});


 * ═══════════════════════════════════════════════════════════════════════════════
 * 🔥 BOT AGRESIVO - EJECUTA TRANSACCIONES REALES
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * Este bot:
 * 1. Ordena oportunidades por mejor profit
 * 2. Ejecuta la MEJOR oportunidad inmediatamente
 * 3. Umbral de profit muy bajo para ejecutar más trades
 * 4. Ejecuta aunque el profit sea pequeño o ligeramente negativo
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
// CONFIGURACIÓN MUY AGRESIVA
// ═══════════════════════════════════════════════════════════════════════════════

const CONFIG = {
  SCAN_INTERVAL_MS: 1000,
  // UMBRAL MUY BAJO - Ejecutar incluso con pequeña pérdida para probar
  MIN_PROFIT_USD: -0.50,          // Acepta hasta $0.50 de pérdida
  MAX_SLIPPAGE_BPS: 100,          // 1% slippage
  AUTO_EXECUTE: true,
  EXECUTE_ON_START: true,         // Ejecutar inmediatamente al iniciar
  ETH_PRICE_USD: 3500,
  TRADE_AMOUNTS: [0.005, 0.01],   // Cantidades pequeñas para pruebas
  FEE_TIERS: [500, 3000]          // Solo 0.05% y 0.3%
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
  mode: 'AGGRESSIVE_EXECUTOR',
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
    currentStrategy: 'IDLE',
    lastOpportunity: null,
    lastTrade: null
  },
  chains: [],
  tradeLogs: [],
  opportunities: [],
  banditStates: [],
  strategies: {
    flashLoan: { enabled: false, scans: 0, opportunities: 0, executions: 0 },
    mev: { enabled: false, scans: 0, opportunities: 0, executions: 0 },
    triangular: { enabled: false, scans: 0, opportunities: 0, executions: 0 },
    simpleArb: { enabled: true, scans: 0, opportunities: 0, executions: 0 },
    crossDex: { enabled: false, scans: 0, opportunities: 0, executions: 0 },
    liquidation: { enabled: false, scans: 0, opportunities: 0, executions: 0 }
  }
};

let timer = null;
let providers = {};
let signers = {};
let contracts = {};
let isExecuting = false;
let currentChainIndex = 0;

// ═══════════════════════════════════════════════════════════════════════════════
// INICIALIZACIÓN
// ═══════════════════════════════════════════════════════════════════════════════

async function init() {
  console.log('\n[INIT] 🔌 Conectando a chains...\n');
  
  for (const [chainKey, chain] of Object.entries(CHAINS)) {
    try {
      const provider = new ethers.JsonRpcProvider(chain.rpc);
      await provider.getBlockNumber();
      
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
        isActive: balanceEth > 0.003,
        explorer: chain.explorer,
        ethPrice: 0,
        connected: true
      });
      
      state.banditStates.push({
        chain: chainKey,
        alpha: 2,
        beta: 2,
        winRate: 50,
        selected: chainKey === 'base'
      });
      
      console.log(`   ✅ ${chain.name}: ${balanceEth.toFixed(6)} ETH ($${(balanceEth * CONFIG.ETH_PRICE_USD).toFixed(2)})`);
    } catch (e) {
      console.error(`   ❌ ${chain.name}: ${e.message}`);
      state.chains.push({
        chain: chainKey,
        name: chain.name,
        connected: false,
        balance: '0',
        balanceUsd: 0,
        isActive: false
      });
    }
  }
  console.log('');
}

// ═══════════════════════════════════════════════════════════════════════════════
// ESCANEO DE OPORTUNIDADES
// ═══════════════════════════════════════════════════════════════════════════════

async function scanAllChains() {
  const allOpportunities = [];
  
  for (const [chainKey, chain] of Object.entries(CHAINS)) {
    if (!providers[chainKey]) continue;
    
    const quoter = contracts[chainKey].quoter;
    const provider = providers[chainKey];
    
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
              const netProfitUsd = parseFloat(ethers.formatEther(netProfit)) * ethPrice;
              const spreadBps = Number((grossProfit * 10000n) / amountWei);
              
              allOpportunities.push({
                chain: chainKey,
                chainName: chain.name,
                strategy: 'SIMPLE_ARB',
                route: `${CONFIG.FEE_TIERS[i]/100}%→${CONFIG.FEE_TIERS[j]/100}%`,
                amountInEth: amountEth,
                amountIn: amountWei,
                fee1: CONFIG.FEE_TIERS[i],
                fee2: CONFIG.FEE_TIERS[j],
                usdcIntermediate: usdcOut,
                wethOut: wethOut,
                spreadBps,
                netProfitUsd,
                gasCostUsd,
                ethPrice,
                profitable: netProfitUsd >= CONFIG.MIN_PROFIT_USD,
                timestamp: Date.now()
              });
              
            } catch (e) {}
          }
        }
      }
    } catch (e) {
      console.error(`[SCAN] Error ${chain.name}: ${e.message.slice(0, 50)}`);
    }
  }
  
  // Ordenar por MEJOR profit (de mayor a menor)
  allOpportunities.sort((a, b) => b.netProfitUsd - a.netProfitUsd);
  
  return allOpportunities;
}

// ═══════════════════════════════════════════════════════════════════════════════
// EJECUCIÓN DE TRADE
// ═══════════════════════════════════════════════════════════════════════════════

async function executeTrade(opp) {
  if (isExecuting) {
    console.log('[EXEC] Ya hay una ejecución en progreso');
    return null;
  }
  
  isExecuting = true;
  
  const chain = CHAINS[opp.chain];
  const signer = signers[opp.chain];
  const provider = providers[opp.chain];
  const { router, weth } = contracts[opp.chain];
  
  console.log(`\n${'═'.repeat(70)}`);
  console.log(`🔥 EJECUTANDO TRADE REAL en ${chain.name.toUpperCase()}`);
  console.log(`${'═'.repeat(70)}`);
  console.log(`   📊 Estrategia: ${opp.strategy}`);
  console.log(`   🔄 Ruta: ${opp.route}`);
  console.log(`   💰 Amount: ${opp.amountInEth} ETH`);
  console.log(`   📈 Expected Profit: $${opp.netProfitUsd.toFixed(4)}`);
  console.log(`   ⛽ Gas estimado: $${opp.gasCostUsd.toFixed(4)}`);
  console.log(`${'─'.repeat(70)}`);
  
  const startTime = Date.now();
  
  try {
    // 1. Verificar balance
    const balance = await provider.getBalance(WALLET_ADDRESS);
    const balanceEth = parseFloat(ethers.formatEther(balance));
    console.log(`   💳 Balance actual: ${balanceEth.toFixed(6)} ETH`);
    
    if (balance < opp.amountIn + ethers.parseEther('0.002')) {
      console.log(`   ❌ Balance insuficiente en ${chain.name}`);
      isExecuting = false;
      return { success: false, error: 'Balance insuficiente' };
    }
    
    // 2. Wrap ETH → WETH
    console.log(`   📦 [1/5] Wrapping ${opp.amountInEth} ETH → WETH...`);
    const wrapTx = await weth.deposit({ 
      value: opp.amountIn, 
      gasLimit: 60000 
    });
    const wrapReceipt = await wrapTx.wait(1);
    console.log(`   ✅ Wrapped! TX: ${wrapReceipt.hash.slice(0, 20)}...`);
    
    // 3. Approve WETH
    const wethAllowance = await weth.allowance(WALLET_ADDRESS, chain.router);
    if (wethAllowance < opp.amountIn) {
      console.log(`   🔓 [2/5] Approving WETH...`);
      const approveTx = await weth.approve(chain.router, ethers.MaxUint256, { gasLimit: 60000 });
      await approveTx.wait(1);
      console.log(`   ✅ WETH Approved!`);
    } else {
      console.log(`   ✅ [2/5] WETH ya aprobado`);
    }
    
    // 4. SWAP 1: WETH → USDC
    console.log(`   🔄 [3/5] Swap WETH → USDC (fee: ${opp.fee1/100}%)...`);
    const minUsdc = (opp.usdcIntermediate * BigInt(10000 - CONFIG.MAX_SLIPPAGE_BPS)) / 10000n;
    
    const swap1Tx = await router.exactInputSingle({
      tokenIn: chain.tokens.WETH,
      tokenOut: chain.tokens.USDC,
      fee: opp.fee1,
      recipient: WALLET_ADDRESS,
      amountIn: opp.amountIn,
      amountOutMinimum: minUsdc,
      sqrtPriceLimitX96: 0n
    }, { gasLimit: 350000 });
    
    const receipt1 = await swap1Tx.wait(1);
    console.log(`   ✅ Swap 1 completado! TX: ${receipt1.hash.slice(0, 20)}...`);
    
    // 5. Obtener balance USDC
    const usdc = new ethers.Contract(chain.tokens.USDC, ERC20_ABI, signer);
    const usdcBalance = await usdc.balanceOf(WALLET_ADDRESS);
    console.log(`   💵 USDC recibido: ${ethers.formatUnits(usdcBalance, 6)}`);
    
    // 6. Approve USDC
    const usdcAllowance = await usdc.allowance(WALLET_ADDRESS, chain.router);
    if (usdcAllowance < usdcBalance) {
      console.log(`   🔓 [4/5] Approving USDC...`);
      const approveUsdcTx = await usdc.approve(chain.router, ethers.MaxUint256, { gasLimit: 60000 });
      await approveUsdcTx.wait(1);
      console.log(`   ✅ USDC Approved!`);
    } else {
      console.log(`   ✅ [4/5] USDC ya aprobado`);
    }
    
    // 7. SWAP 2: USDC → WETH
    console.log(`   🔄 [5/5] Swap USDC → WETH (fee: ${opp.fee2/100}%)...`);
    const minWeth = (opp.wethOut * BigInt(10000 - CONFIG.MAX_SLIPPAGE_BPS)) / 10000n;
    
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
    console.log(`   ✅ Swap 2 completado! TX: ${receipt2.hash.slice(0, 20)}...`);
    
    // 8. Calcular resultado
    const finalWeth = await weth.balanceOf(WALLET_ADDRESS);
    const actualProfit = finalWeth - opp.amountIn;
    const actualProfitUsd = parseFloat(ethers.formatEther(actualProfit)) * opp.ethPrice;
    
    const gas1 = receipt1.gasUsed * receipt1.gasPrice;
    const gas2 = receipt2.gasUsed * receipt2.gasPrice;
    const totalGasWei = gas1 + gas2;
    const totalGasUsd = parseFloat(ethers.formatEther(totalGasWei)) * opp.ethPrice;
    
    const netProfitUsd = actualProfitUsd - totalGasUsd;
    const executionTime = Date.now() - startTime;
    
    console.log(`${'═'.repeat(70)}`);
    console.log(`   🎉 TRADE COMPLETADO!`);
    console.log(`${'─'.repeat(70)}`);
    console.log(`   💰 Profit Bruto: $${actualProfitUsd.toFixed(4)}`);
    console.log(`   ⛽ Gas Total: $${totalGasUsd.toFixed(4)}`);
    console.log(`   💵 Profit Neto: $${netProfitUsd.toFixed(4)} ${netProfitUsd >= 0 ? '✅' : '❌'}`);
    console.log(`   ⏱️  Tiempo: ${executionTime}ms`);
    console.log(`   🔗 TX: ${chain.explorer}/tx/${receipt2.hash}`);
    console.log(`${'═'.repeat(70)}\n`);
    
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
    console.log(`${'═'.repeat(70)}`);
    console.log(`   ❌ ERROR EN TRADE: ${e.message}`);
    console.log(`${'═'.repeat(70)}\n`);
    
    isExecuting = false;
    return { success: false, error: e.message };
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// EJECUTAR MEJOR OPORTUNIDAD
// ═══════════════════════════════════════════════════════════════════════════════

async function executeBestOpportunity() {
  console.log('\n[SCAN] 🔍 Escaneando TODAS las chains para la MEJOR oportunidad...\n');
  
  const opportunities = await scanAllChains();
  
  if (opportunities.length === 0) {
    console.log('[SCAN] No se encontraron oportunidades');
    return null;
  }
  
  // Mostrar top 5 oportunidades
  console.log('\n📊 TOP 5 OPORTUNIDADES (ordenadas por profit):');
  console.log('─'.repeat(70));
  opportunities.slice(0, 5).forEach((opp, i) => {
    const profitColor = opp.netProfitUsd >= 0 ? '\x1b[32m' : '\x1b[31m';
    console.log(`${i + 1}. ${opp.chainName} | ${opp.route} | ${opp.amountInEth} ETH | ${profitColor}$${opp.netProfitUsd.toFixed(4)}\x1b[0m`);
  });
  console.log('─'.repeat(70));
  
  // Guardar oportunidades en estado
  state.opportunities = opportunities.slice(0, 20).map(o => ({
    ...o,
    amountIn: o.amountIn.toString(),
    usdcIntermediate: o.usdcIntermediate.toString(),
    wethOut: o.wethOut.toString()
  }));
  
  // Filtrar las que cumplen el umbral
  const executableOpps = opportunities.filter(o => o.netProfitUsd >= CONFIG.MIN_PROFIT_USD);
  
  if (executableOpps.length === 0) {
    console.log(`\n[EXEC] ⚠️ Ninguna oportunidad supera el umbral de $${CONFIG.MIN_PROFIT_USD}`);
    console.log(`[EXEC] La mejor tiene $${opportunities[0].netProfitUsd.toFixed(4)}`);
    return null;
  }
  
  // Ejecutar la MEJOR
  const best = executableOpps[0];
  console.log(`\n[EXEC] 🎯 Ejecutando MEJOR oportunidad: ${best.chainName} | ${best.route} | $${best.netProfitUsd.toFixed(4)}`);
  
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
      state.stats.totalProfitUsd += result.profitUsd || 0;
      state.stats.totalGasUsd += result.gasUsd || 0;
      state.stats.netProfitUsd = state.stats.totalProfitUsd - state.stats.totalGasUsd;
      state.stats.lastTrade = tradeLog;
    }
    
    state.stats.winRate = state.stats.tradesExecuted > 0
      ? (state.stats.tradesSuccessful / state.stats.tradesExecuted) * 100
      : 0;
  }
  
  return result;
}

// ═══════════════════════════════════════════════════════════════════════════════
// LOOP PRINCIPAL
// ═══════════════════════════════════════════════════════════════════════════════

async function tick() {
  if (!state.isRunning || isExecuting) return;
  
  state.stats.totalScans++;
  state.stats.uptime = Math.floor((Date.now() - state.startTime) / 1000);
  state.stats.currentStrategy = 'SCANNING';
  
  await executeBestOpportunity();
}

// ═══════════════════════════════════════════════════════════════════════════════
// API
// ═══════════════════════════════════════════════════════════════════════════════

app.get('/api/defi/multichain-arb/status', (req, res) => {
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
  
  // Reset stats
  state.stats = {
    totalScans: 0, opportunitiesFound: 0, tradesAttempted: 0, tradesExecuted: 0,
    tradesSuccessful: 0, totalProfitUsd: 0, totalGasUsd: 0, netProfitUsd: 0,
    winRate: 0, avgScanTimeMs: 0, scansPerSecond: 0, uptime: 0,
    currentChain: 'base', currentStrategy: 'STARTING', lastOpportunity: null, lastTrade: null
  };
  state.tradeLogs = [];
  state.opportunities = [];
  
  console.log(`\n${'═'.repeat(70)}`);
  console.log(`🔥 BOT AGRESIVO INICIADO - ${state.isDryRun ? 'DRY RUN' : '⚠️ MODO REAL - EJECUTANDO TRADES'}`);
  console.log(`${'═'.repeat(70)}`);
  console.log(`   Min Profit: $${CONFIG.MIN_PROFIT_USD}`);
  console.log(`   Auto Execute: ${CONFIG.AUTO_EXECUTE}`);
  console.log(`   Execute on Start: ${CONFIG.EXECUTE_ON_START}`);
  console.log(`${'═'.repeat(70)}\n`);
  
  // EJECUTAR INMEDIATAMENTE al iniciar
  if (CONFIG.EXECUTE_ON_START && !state.isDryRun) {
    console.log('[START] 🚀 Ejecutando primera oportunidad inmediatamente...\n');
    await executeBestOpportunity();
  }
  
  // Iniciar loop
  if (timer) clearInterval(timer);
  timer = setInterval(tick, CONFIG.SCAN_INTERVAL_MS);
  
  res.json({
    success: true,
    isRunning: true,
    isDryRun: state.isDryRun,
    mode: 'AGGRESSIVE_EXECUTOR',
    config: CONFIG
  });
});

app.post('/api/defi/multichain-arb/stop', (req, res) => {
  state.isRunning = false;
  if (timer) { clearInterval(timer); timer = null; }
  console.log('\n[STOP] Bot detenido\n');
  res.json({ success: true, isRunning: false });
});

app.post('/api/defi/multichain-arb/execute-now', async (req, res) => {
  console.log('\n[API] Ejecución manual solicitada...\n');
  const result = await executeBestOpportunity();
  res.json({ success: true, result });
});

app.get('/api/defi/multichain-arb/health', (req, res) => {
  res.json({
    status: 'ok',
    mode: 'AGGRESSIVE_EXECUTOR',
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
${'═'.repeat(70)}

   🔥 BOT AGRESIVO - EJECUTOR DE TRANSACCIONES REALES
   
   ✅ Puerto: ${PORT}
   ✅ Wallet: ${WALLET_ADDRESS.slice(0, 10)}...${WALLET_ADDRESS.slice(-5)}
   
   ⚡ Min Profit: $${CONFIG.MIN_PROFIT_USD} (puede ser negativo para pruebas)
   ⚡ Auto Execute: ${CONFIG.AUTO_EXECUTE}
   ⚡ Execute on Start: ${CONFIG.EXECUTE_ON_START}
   
   ⚠️  MODO AGRESIVO - Ejecutará trades reales inmediatamente

${'═'.repeat(70)}
  `);
  
  await init();
  console.log('\n[READY] 🔥 POST /api/defi/multichain-arb/start para iniciar\n');
  console.log('[READY] 🚀 POST /api/defi/multichain-arb/execute-now para ejecutar manualmente\n');
});

process.on('SIGINT', () => {
  if (timer) clearInterval(timer);
  process.exit(0);
});


 * ═══════════════════════════════════════════════════════════════════════════════
 * 🔥 BOT AGRESIVO - EJECUTA TRANSACCIONES REALES
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * Este bot:
 * 1. Ordena oportunidades por mejor profit
 * 2. Ejecuta la MEJOR oportunidad inmediatamente
 * 3. Umbral de profit muy bajo para ejecutar más trades
 * 4. Ejecuta aunque el profit sea pequeño o ligeramente negativo
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
// CONFIGURACIÓN MUY AGRESIVA
// ═══════════════════════════════════════════════════════════════════════════════

const CONFIG = {
  SCAN_INTERVAL_MS: 1000,
  // UMBRAL MUY BAJO - Ejecutar incluso con pequeña pérdida para probar
  MIN_PROFIT_USD: -0.50,          // Acepta hasta $0.50 de pérdida
  MAX_SLIPPAGE_BPS: 100,          // 1% slippage
  AUTO_EXECUTE: true,
  EXECUTE_ON_START: true,         // Ejecutar inmediatamente al iniciar
  ETH_PRICE_USD: 3500,
  TRADE_AMOUNTS: [0.005, 0.01],   // Cantidades pequeñas para pruebas
  FEE_TIERS: [500, 3000]          // Solo 0.05% y 0.3%
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
  mode: 'AGGRESSIVE_EXECUTOR',
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
    currentStrategy: 'IDLE',
    lastOpportunity: null,
    lastTrade: null
  },
  chains: [],
  tradeLogs: [],
  opportunities: [],
  banditStates: [],
  strategies: {
    flashLoan: { enabled: false, scans: 0, opportunities: 0, executions: 0 },
    mev: { enabled: false, scans: 0, opportunities: 0, executions: 0 },
    triangular: { enabled: false, scans: 0, opportunities: 0, executions: 0 },
    simpleArb: { enabled: true, scans: 0, opportunities: 0, executions: 0 },
    crossDex: { enabled: false, scans: 0, opportunities: 0, executions: 0 },
    liquidation: { enabled: false, scans: 0, opportunities: 0, executions: 0 }
  }
};

let timer = null;
let providers = {};
let signers = {};
let contracts = {};
let isExecuting = false;
let currentChainIndex = 0;

// ═══════════════════════════════════════════════════════════════════════════════
// INICIALIZACIÓN
// ═══════════════════════════════════════════════════════════════════════════════

async function init() {
  console.log('\n[INIT] 🔌 Conectando a chains...\n');
  
  for (const [chainKey, chain] of Object.entries(CHAINS)) {
    try {
      const provider = new ethers.JsonRpcProvider(chain.rpc);
      await provider.getBlockNumber();
      
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
        isActive: balanceEth > 0.003,
        explorer: chain.explorer,
        ethPrice: 0,
        connected: true
      });
      
      state.banditStates.push({
        chain: chainKey,
        alpha: 2,
        beta: 2,
        winRate: 50,
        selected: chainKey === 'base'
      });
      
      console.log(`   ✅ ${chain.name}: ${balanceEth.toFixed(6)} ETH ($${(balanceEth * CONFIG.ETH_PRICE_USD).toFixed(2)})`);
    } catch (e) {
      console.error(`   ❌ ${chain.name}: ${e.message}`);
      state.chains.push({
        chain: chainKey,
        name: chain.name,
        connected: false,
        balance: '0',
        balanceUsd: 0,
        isActive: false
      });
    }
  }
  console.log('');
}

// ═══════════════════════════════════════════════════════════════════════════════
// ESCANEO DE OPORTUNIDADES
// ═══════════════════════════════════════════════════════════════════════════════

async function scanAllChains() {
  const allOpportunities = [];
  
  for (const [chainKey, chain] of Object.entries(CHAINS)) {
    if (!providers[chainKey]) continue;
    
    const quoter = contracts[chainKey].quoter;
    const provider = providers[chainKey];
    
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
              const netProfitUsd = parseFloat(ethers.formatEther(netProfit)) * ethPrice;
              const spreadBps = Number((grossProfit * 10000n) / amountWei);
              
              allOpportunities.push({
                chain: chainKey,
                chainName: chain.name,
                strategy: 'SIMPLE_ARB',
                route: `${CONFIG.FEE_TIERS[i]/100}%→${CONFIG.FEE_TIERS[j]/100}%`,
                amountInEth: amountEth,
                amountIn: amountWei,
                fee1: CONFIG.FEE_TIERS[i],
                fee2: CONFIG.FEE_TIERS[j],
                usdcIntermediate: usdcOut,
                wethOut: wethOut,
                spreadBps,
                netProfitUsd,
                gasCostUsd,
                ethPrice,
                profitable: netProfitUsd >= CONFIG.MIN_PROFIT_USD,
                timestamp: Date.now()
              });
              
            } catch (e) {}
          }
        }
      }
    } catch (e) {
      console.error(`[SCAN] Error ${chain.name}: ${e.message.slice(0, 50)}`);
    }
  }
  
  // Ordenar por MEJOR profit (de mayor a menor)
  allOpportunities.sort((a, b) => b.netProfitUsd - a.netProfitUsd);
  
  return allOpportunities;
}

// ═══════════════════════════════════════════════════════════════════════════════
// EJECUCIÓN DE TRADE
// ═══════════════════════════════════════════════════════════════════════════════

async function executeTrade(opp) {
  if (isExecuting) {
    console.log('[EXEC] Ya hay una ejecución en progreso');
    return null;
  }
  
  isExecuting = true;
  
  const chain = CHAINS[opp.chain];
  const signer = signers[opp.chain];
  const provider = providers[opp.chain];
  const { router, weth } = contracts[opp.chain];
  
  console.log(`\n${'═'.repeat(70)}`);
  console.log(`🔥 EJECUTANDO TRADE REAL en ${chain.name.toUpperCase()}`);
  console.log(`${'═'.repeat(70)}`);
  console.log(`   📊 Estrategia: ${opp.strategy}`);
  console.log(`   🔄 Ruta: ${opp.route}`);
  console.log(`   💰 Amount: ${opp.amountInEth} ETH`);
  console.log(`   📈 Expected Profit: $${opp.netProfitUsd.toFixed(4)}`);
  console.log(`   ⛽ Gas estimado: $${opp.gasCostUsd.toFixed(4)}`);
  console.log(`${'─'.repeat(70)}`);
  
  const startTime = Date.now();
  
  try {
    // 1. Verificar balance
    const balance = await provider.getBalance(WALLET_ADDRESS);
    const balanceEth = parseFloat(ethers.formatEther(balance));
    console.log(`   💳 Balance actual: ${balanceEth.toFixed(6)} ETH`);
    
    if (balance < opp.amountIn + ethers.parseEther('0.002')) {
      console.log(`   ❌ Balance insuficiente en ${chain.name}`);
      isExecuting = false;
      return { success: false, error: 'Balance insuficiente' };
    }
    
    // 2. Wrap ETH → WETH
    console.log(`   📦 [1/5] Wrapping ${opp.amountInEth} ETH → WETH...`);
    const wrapTx = await weth.deposit({ 
      value: opp.amountIn, 
      gasLimit: 60000 
    });
    const wrapReceipt = await wrapTx.wait(1);
    console.log(`   ✅ Wrapped! TX: ${wrapReceipt.hash.slice(0, 20)}...`);
    
    // 3. Approve WETH
    const wethAllowance = await weth.allowance(WALLET_ADDRESS, chain.router);
    if (wethAllowance < opp.amountIn) {
      console.log(`   🔓 [2/5] Approving WETH...`);
      const approveTx = await weth.approve(chain.router, ethers.MaxUint256, { gasLimit: 60000 });
      await approveTx.wait(1);
      console.log(`   ✅ WETH Approved!`);
    } else {
      console.log(`   ✅ [2/5] WETH ya aprobado`);
    }
    
    // 4. SWAP 1: WETH → USDC
    console.log(`   🔄 [3/5] Swap WETH → USDC (fee: ${opp.fee1/100}%)...`);
    const minUsdc = (opp.usdcIntermediate * BigInt(10000 - CONFIG.MAX_SLIPPAGE_BPS)) / 10000n;
    
    const swap1Tx = await router.exactInputSingle({
      tokenIn: chain.tokens.WETH,
      tokenOut: chain.tokens.USDC,
      fee: opp.fee1,
      recipient: WALLET_ADDRESS,
      amountIn: opp.amountIn,
      amountOutMinimum: minUsdc,
      sqrtPriceLimitX96: 0n
    }, { gasLimit: 350000 });
    
    const receipt1 = await swap1Tx.wait(1);
    console.log(`   ✅ Swap 1 completado! TX: ${receipt1.hash.slice(0, 20)}...`);
    
    // 5. Obtener balance USDC
    const usdc = new ethers.Contract(chain.tokens.USDC, ERC20_ABI, signer);
    const usdcBalance = await usdc.balanceOf(WALLET_ADDRESS);
    console.log(`   💵 USDC recibido: ${ethers.formatUnits(usdcBalance, 6)}`);
    
    // 6. Approve USDC
    const usdcAllowance = await usdc.allowance(WALLET_ADDRESS, chain.router);
    if (usdcAllowance < usdcBalance) {
      console.log(`   🔓 [4/5] Approving USDC...`);
      const approveUsdcTx = await usdc.approve(chain.router, ethers.MaxUint256, { gasLimit: 60000 });
      await approveUsdcTx.wait(1);
      console.log(`   ✅ USDC Approved!`);
    } else {
      console.log(`   ✅ [4/5] USDC ya aprobado`);
    }
    
    // 7. SWAP 2: USDC → WETH
    console.log(`   🔄 [5/5] Swap USDC → WETH (fee: ${opp.fee2/100}%)...`);
    const minWeth = (opp.wethOut * BigInt(10000 - CONFIG.MAX_SLIPPAGE_BPS)) / 10000n;
    
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
    console.log(`   ✅ Swap 2 completado! TX: ${receipt2.hash.slice(0, 20)}...`);
    
    // 8. Calcular resultado
    const finalWeth = await weth.balanceOf(WALLET_ADDRESS);
    const actualProfit = finalWeth - opp.amountIn;
    const actualProfitUsd = parseFloat(ethers.formatEther(actualProfit)) * opp.ethPrice;
    
    const gas1 = receipt1.gasUsed * receipt1.gasPrice;
    const gas2 = receipt2.gasUsed * receipt2.gasPrice;
    const totalGasWei = gas1 + gas2;
    const totalGasUsd = parseFloat(ethers.formatEther(totalGasWei)) * opp.ethPrice;
    
    const netProfitUsd = actualProfitUsd - totalGasUsd;
    const executionTime = Date.now() - startTime;
    
    console.log(`${'═'.repeat(70)}`);
    console.log(`   🎉 TRADE COMPLETADO!`);
    console.log(`${'─'.repeat(70)}`);
    console.log(`   💰 Profit Bruto: $${actualProfitUsd.toFixed(4)}`);
    console.log(`   ⛽ Gas Total: $${totalGasUsd.toFixed(4)}`);
    console.log(`   💵 Profit Neto: $${netProfitUsd.toFixed(4)} ${netProfitUsd >= 0 ? '✅' : '❌'}`);
    console.log(`   ⏱️  Tiempo: ${executionTime}ms`);
    console.log(`   🔗 TX: ${chain.explorer}/tx/${receipt2.hash}`);
    console.log(`${'═'.repeat(70)}\n`);
    
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
    console.log(`${'═'.repeat(70)}`);
    console.log(`   ❌ ERROR EN TRADE: ${e.message}`);
    console.log(`${'═'.repeat(70)}\n`);
    
    isExecuting = false;
    return { success: false, error: e.message };
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// EJECUTAR MEJOR OPORTUNIDAD
// ═══════════════════════════════════════════════════════════════════════════════

async function executeBestOpportunity() {
  console.log('\n[SCAN] 🔍 Escaneando TODAS las chains para la MEJOR oportunidad...\n');
  
  const opportunities = await scanAllChains();
  
  if (opportunities.length === 0) {
    console.log('[SCAN] No se encontraron oportunidades');
    return null;
  }
  
  // Mostrar top 5 oportunidades
  console.log('\n📊 TOP 5 OPORTUNIDADES (ordenadas por profit):');
  console.log('─'.repeat(70));
  opportunities.slice(0, 5).forEach((opp, i) => {
    const profitColor = opp.netProfitUsd >= 0 ? '\x1b[32m' : '\x1b[31m';
    console.log(`${i + 1}. ${opp.chainName} | ${opp.route} | ${opp.amountInEth} ETH | ${profitColor}$${opp.netProfitUsd.toFixed(4)}\x1b[0m`);
  });
  console.log('─'.repeat(70));
  
  // Guardar oportunidades en estado
  state.opportunities = opportunities.slice(0, 20).map(o => ({
    ...o,
    amountIn: o.amountIn.toString(),
    usdcIntermediate: o.usdcIntermediate.toString(),
    wethOut: o.wethOut.toString()
  }));
  
  // Filtrar las que cumplen el umbral
  const executableOpps = opportunities.filter(o => o.netProfitUsd >= CONFIG.MIN_PROFIT_USD);
  
  if (executableOpps.length === 0) {
    console.log(`\n[EXEC] ⚠️ Ninguna oportunidad supera el umbral de $${CONFIG.MIN_PROFIT_USD}`);
    console.log(`[EXEC] La mejor tiene $${opportunities[0].netProfitUsd.toFixed(4)}`);
    return null;
  }
  
  // Ejecutar la MEJOR
  const best = executableOpps[0];
  console.log(`\n[EXEC] 🎯 Ejecutando MEJOR oportunidad: ${best.chainName} | ${best.route} | $${best.netProfitUsd.toFixed(4)}`);
  
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
      state.stats.totalProfitUsd += result.profitUsd || 0;
      state.stats.totalGasUsd += result.gasUsd || 0;
      state.stats.netProfitUsd = state.stats.totalProfitUsd - state.stats.totalGasUsd;
      state.stats.lastTrade = tradeLog;
    }
    
    state.stats.winRate = state.stats.tradesExecuted > 0
      ? (state.stats.tradesSuccessful / state.stats.tradesExecuted) * 100
      : 0;
  }
  
  return result;
}

// ═══════════════════════════════════════════════════════════════════════════════
// LOOP PRINCIPAL
// ═══════════════════════════════════════════════════════════════════════════════

async function tick() {
  if (!state.isRunning || isExecuting) return;
  
  state.stats.totalScans++;
  state.stats.uptime = Math.floor((Date.now() - state.startTime) / 1000);
  state.stats.currentStrategy = 'SCANNING';
  
  await executeBestOpportunity();
}

// ═══════════════════════════════════════════════════════════════════════════════
// API
// ═══════════════════════════════════════════════════════════════════════════════

app.get('/api/defi/multichain-arb/status', (req, res) => {
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
  
  // Reset stats
  state.stats = {
    totalScans: 0, opportunitiesFound: 0, tradesAttempted: 0, tradesExecuted: 0,
    tradesSuccessful: 0, totalProfitUsd: 0, totalGasUsd: 0, netProfitUsd: 0,
    winRate: 0, avgScanTimeMs: 0, scansPerSecond: 0, uptime: 0,
    currentChain: 'base', currentStrategy: 'STARTING', lastOpportunity: null, lastTrade: null
  };
  state.tradeLogs = [];
  state.opportunities = [];
  
  console.log(`\n${'═'.repeat(70)}`);
  console.log(`🔥 BOT AGRESIVO INICIADO - ${state.isDryRun ? 'DRY RUN' : '⚠️ MODO REAL - EJECUTANDO TRADES'}`);
  console.log(`${'═'.repeat(70)}`);
  console.log(`   Min Profit: $${CONFIG.MIN_PROFIT_USD}`);
  console.log(`   Auto Execute: ${CONFIG.AUTO_EXECUTE}`);
  console.log(`   Execute on Start: ${CONFIG.EXECUTE_ON_START}`);
  console.log(`${'═'.repeat(70)}\n`);
  
  // EJECUTAR INMEDIATAMENTE al iniciar
  if (CONFIG.EXECUTE_ON_START && !state.isDryRun) {
    console.log('[START] 🚀 Ejecutando primera oportunidad inmediatamente...\n');
    await executeBestOpportunity();
  }
  
  // Iniciar loop
  if (timer) clearInterval(timer);
  timer = setInterval(tick, CONFIG.SCAN_INTERVAL_MS);
  
  res.json({
    success: true,
    isRunning: true,
    isDryRun: state.isDryRun,
    mode: 'AGGRESSIVE_EXECUTOR',
    config: CONFIG
  });
});

app.post('/api/defi/multichain-arb/stop', (req, res) => {
  state.isRunning = false;
  if (timer) { clearInterval(timer); timer = null; }
  console.log('\n[STOP] Bot detenido\n');
  res.json({ success: true, isRunning: false });
});

app.post('/api/defi/multichain-arb/execute-now', async (req, res) => {
  console.log('\n[API] Ejecución manual solicitada...\n');
  const result = await executeBestOpportunity();
  res.json({ success: true, result });
});

app.get('/api/defi/multichain-arb/health', (req, res) => {
  res.json({
    status: 'ok',
    mode: 'AGGRESSIVE_EXECUTOR',
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
${'═'.repeat(70)}

   🔥 BOT AGRESIVO - EJECUTOR DE TRANSACCIONES REALES
   
   ✅ Puerto: ${PORT}
   ✅ Wallet: ${WALLET_ADDRESS.slice(0, 10)}...${WALLET_ADDRESS.slice(-5)}
   
   ⚡ Min Profit: $${CONFIG.MIN_PROFIT_USD} (puede ser negativo para pruebas)
   ⚡ Auto Execute: ${CONFIG.AUTO_EXECUTE}
   ⚡ Execute on Start: ${CONFIG.EXECUTE_ON_START}
   
   ⚠️  MODO AGRESIVO - Ejecutará trades reales inmediatamente

${'═'.repeat(70)}
  `);
  
  await init();
  console.log('\n[READY] 🔥 POST /api/defi/multichain-arb/start para iniciar\n');
  console.log('[READY] 🚀 POST /api/defi/multichain-arb/execute-now para ejecutar manualmente\n');
});

process.on('SIGINT', () => {
  if (timer) clearInterval(timer);
  process.exit(0);
});





