/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * 🔥 SCALPER HTF ARBITRAGE BOT - ENTRADA Y SALIDA ULTRA-RÁPIDA
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * Comportamiento SCALPER:
 * - Detecta oportunidad → ENTRA inmediatamente
 * - Ejecuta swap → SALE inmediatamente
 * - No mantiene posiciones
 * - Ciclo continuo de entrada/salida
 * - Escaneo paralelo de múltiples chains
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
// CONFIGURACIÓN SCALPER HTF
// ═══════════════════════════════════════════════════════════════════════════════

const SCALPER_CONFIG = {
  // VELOCIDAD
  SCAN_INTERVAL_MS: 200,           // 5 scans por segundo
  PARALLEL_CHAIN_SCAN: true,       // Escanear todas las chains simultáneamente
  
  // UMBRALES SCALPER
  MIN_PROFIT_USD: 0.005,           // $0.005 mínimo (muy bajo para capturar más)
  MIN_SPREAD_BPS: 1,               // 0.01% spread mínimo
  MAX_SLIPPAGE_BPS: 50,            // 0.5% slippage máximo
  
  // CANTIDADES (pequeñas para entrada/salida rápida)
  TRADE_AMOUNTS_ETH: [0.001, 0.002, 0.003, 0.005, 0.008, 0.01],
  
  // FEE TIERS
  FEE_TIERS: [100, 500, 3000, 10000],
  
  // EJECUCIÓN
  AUTO_EXECUTE: true,
  IMMEDIATE_EXIT: true,            // Salir inmediatamente después de entrar
  MAX_CONCURRENT_TRADES: 3,        // Máximo trades simultáneos
  
  // GAS
  GAS_MULTIPLIER: 1.2,             // Gas más bajo para velocidad
  MAX_GAS_GWEI: 5,                 // Máximo gas en gwei
  
  // PRECIO ETH
  ETH_PRICE_USD: 3500
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
      USDC: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
      USDbC: '0xd9aAEc86B65D86f6A7B5B1b0c42FFA531710b6CA'
    },
    quoter: '0x3d4e44Eb1374240CE5F1B871ab261CD16335B76a',
    router: '0x2626664c2603336E57B271c5C0b26F421741e481',
    priority: 1  // Más prioridad
  },
  arbitrum: {
    name: 'Arbitrum',
    chainId: 42161,
    rpc: 'https://arb1.arbitrum.io/rpc',
    explorer: 'https://arbiscan.io',
    tokens: {
      WETH: '0x82aF49447D8a07e3bd95BD0d56f35241523fBab1',
      USDC: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831',
      USDT: '0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9'
    },
    quoter: '0x61fFE014bA17989E743c5F6cB21bF9697530B21e',
    router: '0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45',
    priority: 2
  },
  optimism: {
    name: 'Optimism',
    chainId: 10,
    rpc: 'https://mainnet.optimism.io',
    explorer: 'https://optimistic.etherscan.io',
    tokens: {
      WETH: '0x4200000000000000000000000000000000000006',
      USDC: '0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85',
      USDT: '0x94b008aA00579c1307B0EF2c499aD98a8ce58e58'
    },
    quoter: '0x61fFE014bA17989E743c5F6cB21bF9697530B21e',
    router: '0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45',
    priority: 3
  }
};

// ABIs
const QUOTER_ABI = [
  'function quoteExactInputSingle((address tokenIn, address tokenOut, uint256 amountIn, uint24 fee, uint160 sqrtPriceLimitX96)) external returns (uint256 amountOut, uint160 sqrtPriceX96After, uint32 initializedTicksCrossed, uint256 gasEstimate)'
];

const ROUTER_ABI = [
  'function exactInputSingle((address tokenIn, address tokenOut, uint24 fee, address recipient, uint256 amountIn, uint256 amountOutMinimum, uint160 sqrtPriceLimitX96)) external payable returns (uint256 amountOut)',
  'function multicall(uint256 deadline, bytes[] calldata data) external payable returns (bytes[] memory results)',
  'function unwrapWETH9(uint256 amountMinimum, address recipient) external payable'
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
  'function allowance(address owner, address spender) view returns (uint256)',
  'function decimals() view returns (uint8)'
];

// ═══════════════════════════════════════════════════════════════════════════════
// ESTADO DEL SCALPER
// ═══════════════════════════════════════════════════════════════════════════════

let state = {
  isRunning: false,
  isDryRun: false,
  startTime: null,
  mode: 'SCALPER_HTF',
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
    avgExecutionTimeMs: 0,
    scansPerSecond: 0,
    uptime: 0,
    currentChain: 'all',
    lastOpportunity: null,
    lastTrade: null
  },
  chains: [],
  tradeLogs: [],
  opportunities: [],
  banditStates: [],
  activePositions: [],
  scanHistory: []
};

let timer = null;
let providers = {};
let signers = {};
let contracts = {};
let activeTrades = 0;
let scanTimes = [];

// ═══════════════════════════════════════════════════════════════════════════════
// INICIALIZAR CONEXIONES
// ═══════════════════════════════════════════════════════════════════════════════

async function initConnections() {
  console.log('[INIT] 🔌 Inicializando conexiones a chains...');
  
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
        balanceUsd: balanceEth * SCALPER_CONFIG.ETH_PRICE_USD,
        routes: SCALPER_CONFIG.FEE_TIERS.length * SCALPER_CONFIG.TRADE_AMOUNTS_ETH.length,
        isActive: balanceEth > 0.001,
        lastScan: Date.now(),
        scansCompleted: 0,
        opportunitiesFound: 0,
        tradesExecuted: 0,
        explorer: chain.explorer,
        priority: chain.priority
      });
      
      state.banditStates.push({
        chain: key,
        alpha: 2,
        beta: 2,
        winRate: 50,
        selected: key === 'base',
        attempts: 0,
        wins: 0,
        avgProfit: 0
      });
      
      console.log(`[INIT] ✅ ${chain.name}: ${balanceEth.toFixed(6)} ETH ($${(balanceEth * SCALPER_CONFIG.ETH_PRICE_USD).toFixed(2)})`);
    } catch (e) {
      console.error(`[INIT] ❌ ${chain.name}: ${e.message}`);
    }
  }
  
  // Ordenar chains por prioridad
  state.chains.sort((a, b) => CHAINS[a.chain].priority - CHAINS[b.chain].priority);
}

// ═══════════════════════════════════════════════════════════════════════════════
// ESCANEO SCALPER - PARALELO Y ULTRA-RÁPIDO
// ═══════════════════════════════════════════════════════════════════════════════

async function scalperScan(chainKey) {
  const chain = CHAINS[chainKey];
  const provider = providers[chainKey];
  const quoter = contracts[chainKey].quoter;
  const opportunities = [];
  
  try {
    // Obtener gas price actual
    const feeData = await provider.getFeeData();
    const gasPrice = feeData.gasPrice || ethers.parseUnits('0.001', 'gwei');
    const gasPriceGwei = parseFloat(ethers.formatUnits(gasPrice, 'gwei'));
    
    // Si gas muy alto, saltar
    if (gasPriceGwei > SCALPER_CONFIG.MAX_GAS_GWEI) {
      return [];
    }
    
    const gasCostWei = gasPrice * 250000n; // Estimado para swap completo
    const gasCostUsd = parseFloat(ethers.formatEther(gasCostWei)) * SCALPER_CONFIG.ETH_PRICE_USD;
    
    // Generar todas las combinaciones de quotes
    const quotePromises = [];
    
    for (const amountEth of SCALPER_CONFIG.TRADE_AMOUNTS_ETH) {
      const amountWei = ethers.parseEther(amountEth.toString());
      
      for (let i = 0; i < SCALPER_CONFIG.FEE_TIERS.length; i++) {
        for (let j = 0; j < SCALPER_CONFIG.FEE_TIERS.length; j++) {
          // Probar diferentes combinaciones de fee tiers
          const fee1 = SCALPER_CONFIG.FEE_TIERS[i];
          const fee2 = SCALPER_CONFIG.FEE_TIERS[j];
          
          quotePromises.push(
            (async () => {
              try {
                // ENTRADA: WETH → USDC
                const quote1 = await quoter.quoteExactInputSingle.staticCall({
                  tokenIn: chain.tokens.WETH,
                  tokenOut: chain.tokens.USDC,
                  amountIn: amountWei,
                  fee: fee1,
                  sqrtPriceLimitX96: 0n
                });
                const usdcOut = quote1[0];
                
                // SALIDA: USDC → WETH
                const quote2 = await quoter.quoteExactInputSingle.staticCall({
                  tokenIn: chain.tokens.USDC,
                  tokenOut: chain.tokens.WETH,
                  amountIn: usdcOut,
                  fee: fee2,
                  sqrtPriceLimitX96: 0n
                });
                const wethOut = quote2[0];
                
                // Calcular profit
                const grossProfit = wethOut - amountWei;
                const netProfit = grossProfit - gasCostWei;
                
                if (netProfit > 0n) {
                  const netProfitUsd = parseFloat(ethers.formatEther(netProfit)) * SCALPER_CONFIG.ETH_PRICE_USD;
                  const spreadBps = Number((grossProfit * 10000n) / amountWei);
                  
                  if (netProfitUsd >= SCALPER_CONFIG.MIN_PROFIT_USD && spreadBps >= SCALPER_CONFIG.MIN_SPREAD_BPS) {
                    return {
                      chain: chainKey,
                      chainName: chain.name,
                      type: 'SCALP',
                      direction: 'WETH→USDC→WETH',
                      route: `Fee ${fee1/100}%→${fee2/100}%`,
                      amountIn: amountWei,
                      amountInEth: amountEth,
                      fee1,
                      fee2,
                      usdcIntermediate: usdcOut,
                      wethOut,
                      grossProfit,
                      netProfit,
                      netProfitUsd,
                      gasCostUsd,
                      spreadBps,
                      timestamp: Date.now(),
                      gasPrice: gasPriceGwei,
                      confidence: Math.min(100, spreadBps * 10)
                    };
                  }
                }
              } catch (e) {
                // Pool no existe o error de quote
              }
              return null;
            })()
          );
        }
      }
    }
    
    // Ejecutar todos los quotes en paralelo
    const results = await Promise.all(quotePromises);
    opportunities.push(...results.filter(r => r !== null));
    
  } catch (e) {
    // Error general de scan
  }
  
  return opportunities;
}

// ═══════════════════════════════════════════════════════════════════════════════
// EJECUCIÓN SCALPER - ENTRADA Y SALIDA INMEDIATA
// ═══════════════════════════════════════════════════════════════════════════════

async function executeScalp(opp) {
  if (activeTrades >= SCALPER_CONFIG.MAX_CONCURRENT_TRADES) {
    console.log(`[SCALP] ⚠️ Máximo trades activos (${activeTrades}), esperando...`);
    return null;
  }
  
  activeTrades++;
  const startTime = Date.now();
  const chain = CHAINS[opp.chain];
  const signer = signers[opp.chain];
  const provider = providers[opp.chain];
  const { router, weth } = contracts[opp.chain];
  
  console.log(`\n🔥 [SCALP] ═══════════════════════════════════════════════════════`);
  console.log(`   Chain: ${chain.name}`);
  console.log(`   Route: ${opp.route}`);
  console.log(`   Amount: ${opp.amountInEth} ETH`);
  console.log(`   Expected Profit: $${opp.netProfitUsd.toFixed(4)}`);
  console.log(`   Spread: ${opp.spreadBps} bps`);
  console.log(`   Gas: ${opp.gasPrice.toFixed(2)} gwei`);
  
  try {
    // Verificar balance
    const balance = await provider.getBalance(WALLET_ADDRESS);
    if (balance < opp.amountIn + ethers.parseEther('0.001')) {
      console.log(`   ❌ Balance insuficiente`);
      activeTrades--;
      return { success: false, error: 'Balance insuficiente' };
    }
    
    // ═══════════════════════════════════════════════════════════════════════════
    // PASO 1: WRAP ETH → WETH
    // ═══════════════════════════════════════════════════════════════════════════
    console.log(`   📦 [1/4] Wrapping ETH → WETH...`);
    const wrapTx = await weth.deposit({ 
      value: opp.amountIn,
      gasLimit: 50000
    });
    const wrapReceipt = await wrapTx.wait(1);
    console.log(`   ✅ Wrap completado: ${wrapReceipt.hash.slice(0, 16)}...`);
    
    // ═══════════════════════════════════════════════════════════════════════════
    // PASO 2: APPROVE WETH (si es necesario)
    // ═══════════════════════════════════════════════════════════════════════════
    const wethAllowance = await weth.allowance(WALLET_ADDRESS, chain.router);
    if (wethAllowance < opp.amountIn) {
      console.log(`   🔓 [2/4] Approving WETH...`);
      const approveTx = await weth.approve(chain.router, ethers.MaxUint256, { gasLimit: 50000 });
      await approveTx.wait(1);
      console.log(`   ✅ WETH approved`);
    } else {
      console.log(`   ✅ [2/4] WETH ya aprobado`);
    }
    
    // ═══════════════════════════════════════════════════════════════════════════
    // PASO 3: ENTRADA - SWAP WETH → USDC
    // ═══════════════════════════════════════════════════════════════════════════
    console.log(`   🔄 [3/4] ENTRADA: WETH → USDC...`);
    const minUsdc = (opp.usdcIntermediate * BigInt(10000 - SCALPER_CONFIG.MAX_SLIPPAGE_BPS)) / 10000n;
    
    const swap1Tx = await router.exactInputSingle({
      tokenIn: chain.tokens.WETH,
      tokenOut: chain.tokens.USDC,
      fee: opp.fee1,
      recipient: WALLET_ADDRESS,
      amountIn: opp.amountIn,
      amountOutMinimum: minUsdc,
      sqrtPriceLimitX96: 0n
    }, { gasLimit: 300000 });
    
    const swap1Receipt = await swap1Tx.wait(1);
    console.log(`   ✅ ENTRADA completada: ${swap1Receipt.hash.slice(0, 16)}...`);
    
    // Obtener balance USDC real
    const usdc = new ethers.Contract(chain.tokens.USDC, ERC20_ABI, signer);
    const usdcBalance = await usdc.balanceOf(WALLET_ADDRESS);
    console.log(`   💵 USDC recibido: ${ethers.formatUnits(usdcBalance, 6)}`);
    
    // ═══════════════════════════════════════════════════════════════════════════
    // PASO 4: SALIDA INMEDIATA - SWAP USDC → WETH
    // ═══════════════════════════════════════════════════════════════════════════
    console.log(`   🔄 [4/4] SALIDA: USDC → WETH...`);
    
    // Approve USDC si es necesario
    const usdcAllowance = await usdc.allowance(WALLET_ADDRESS, chain.router);
    if (usdcAllowance < usdcBalance) {
      const approveUsdcTx = await usdc.approve(chain.router, ethers.MaxUint256, { gasLimit: 50000 });
      await approveUsdcTx.wait(1);
    }
    
    const minWeth = (opp.wethOut * BigInt(10000 - SCALPER_CONFIG.MAX_SLIPPAGE_BPS)) / 10000n;
    
    const swap2Tx = await router.exactInputSingle({
      tokenIn: chain.tokens.USDC,
      tokenOut: chain.tokens.WETH,
      fee: opp.fee2,
      recipient: WALLET_ADDRESS,
      amountIn: usdcBalance,
      amountOutMinimum: minWeth,
      sqrtPriceLimitX96: 0n
    }, { gasLimit: 300000 });
    
    const swap2Receipt = await swap2Tx.wait(1);
    console.log(`   ✅ SALIDA completada: ${swap2Receipt.hash.slice(0, 16)}...`);
    
    // ═══════════════════════════════════════════════════════════════════════════
    // CALCULAR PROFIT REAL
    // ═══════════════════════════════════════════════════════════════════════════
    const finalWethBalance = await weth.balanceOf(WALLET_ADDRESS);
    const actualProfit = finalWethBalance - opp.amountIn;
    const actualProfitUsd = parseFloat(ethers.formatEther(actualProfit)) * SCALPER_CONFIG.ETH_PRICE_USD;
    
    // Calcular gas usado
    const gas1 = swap1Receipt.gasUsed * swap1Receipt.gasPrice;
    const gas2 = swap2Receipt.gasUsed * swap2Receipt.gasPrice;
    const totalGasWei = gas1 + gas2 + wrapReceipt.gasUsed * wrapReceipt.gasPrice;
    const totalGasUsd = parseFloat(ethers.formatEther(totalGasWei)) * SCALPER_CONFIG.ETH_PRICE_USD;
    
    const netProfitUsd = actualProfitUsd - totalGasUsd;
    const executionTime = Date.now() - startTime;
    
    console.log(`   ═══════════════════════════════════════════════════════`);
    console.log(`   💰 PROFIT BRUTO: $${actualProfitUsd.toFixed(4)}`);
    console.log(`   ⛽ GAS TOTAL: $${totalGasUsd.toFixed(4)}`);
    console.log(`   💵 PROFIT NETO: $${netProfitUsd.toFixed(4)}`);
    console.log(`   ⏱️  Tiempo: ${executionTime}ms`);
    console.log(`   🔗 TX: ${chain.explorer}/tx/${swap2Receipt.hash}`);
    console.log(`   ═══════════════════════════════════════════════════════\n`);
    
    activeTrades--;
    
    return {
      success: true,
      profitUsd: actualProfitUsd,
      gasUsd: totalGasUsd,
      netProfitUsd,
      txHash: swap2Receipt.hash,
      executionTimeMs: executionTime
    };
    
  } catch (e) {
    console.log(`   ❌ Error: ${e.message}`);
    activeTrades--;
    return { success: false, error: e.message };
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// LOOP PRINCIPAL SCALPER
// ═══════════════════════════════════════════════════════════════════════════════

async function scalperTick() {
  if (!state.isRunning) return;
  
  const tickStart = Date.now();
  state.stats.totalScans++;
  state.stats.uptime = Math.floor((Date.now() - state.startTime) / 1000);
  
  try {
    // ESCANEO PARALELO de todas las chains activas
    const activeChains = state.chains.filter(c => c.isActive).map(c => c.chain);
    
    let allOpportunities = [];
    
    if (SCALPER_CONFIG.PARALLEL_CHAIN_SCAN) {
      // Escanear todas las chains en paralelo
      const scanPromises = activeChains.map(chainKey => scalperScan(chainKey));
      const results = await Promise.all(scanPromises);
      allOpportunities = results.flat();
    } else {
      // Escanear secuencialmente (round-robin)
      const chainIndex = state.stats.totalScans % activeChains.length;
      const selectedChain = activeChains[chainIndex];
      allOpportunities = await scalperScan(selectedChain);
    }
    
    const scanTime = Date.now() - tickStart;
    scanTimes.push(scanTime);
    if (scanTimes.length > 100) scanTimes.shift();
    state.stats.avgScanTimeMs = Math.round(scanTimes.reduce((a, b) => a + b, 0) / scanTimes.length);
    state.stats.scansPerSecond = Math.round(1000 / state.stats.avgScanTimeMs * 10) / 10;
    
    if (allOpportunities.length > 0) {
      state.stats.opportunitiesFound += allOpportunities.length;
      
      // Ordenar por profit neto
      allOpportunities.sort((a, b) => b.netProfitUsd - a.netProfitUsd);
      
      // Guardar oportunidades para UI
      state.opportunities = [...allOpportunities.slice(0, 10), ...state.opportunities].slice(0, 50);
      state.stats.lastOpportunity = allOpportunities[0];
      
      const best = allOpportunities[0];
      
      console.log(`[SCAN #${state.stats.totalScans}] ${scanTime}ms | ${allOpportunities.length} opps | Best: $${best.netProfitUsd.toFixed(4)} on ${best.chainName}`);
      
      // EJECUTAR si no es dry run y auto-execute está activo
      if (!state.isDryRun && SCALPER_CONFIG.AUTO_EXECUTE && best.netProfitUsd >= SCALPER_CONFIG.MIN_PROFIT_USD) {
        state.stats.tradesAttempted++;
        
        const result = await executeScalp(best);
        
        if (result) {
          state.stats.tradesExecuted++;
          
          const tradeLog = {
            id: `scalp-${Date.now()}`,
            timestamp: Date.now(),
            chain: best.chain,
            chainName: best.chainName,
            type: 'SCALP',
            route: best.route,
            direction: best.direction,
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
          if (state.tradeLogs.length > 100) state.tradeLogs.pop();
          
          if (result.success) {
            state.stats.tradesSuccessful++;
            state.stats.totalProfitUsd += result.profitUsd;
            state.stats.totalGasUsd += result.gasUsd;
            state.stats.netProfitUsd = state.stats.totalProfitUsd - state.stats.totalGasUsd;
            state.stats.lastTrade = tradeLog;
            
            // Actualizar bandit
            const bandit = state.banditStates.find(b => b.chain === best.chain);
            if (bandit) {
              bandit.wins++;
              bandit.attempts++;
              bandit.alpha++;
              bandit.winRate = (bandit.wins / bandit.attempts) * 100;
              bandit.avgProfit = (bandit.avgProfit * (bandit.wins - 1) + result.netProfitUsd) / bandit.wins;
            }
            
            // Actualizar chain stats
            const chainState = state.chains.find(c => c.chain === best.chain);
            if (chainState) {
              chainState.tradesExecuted++;
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
      // Log periódico cuando no hay oportunidades
      if (state.stats.totalScans % 50 === 0) {
        console.log(`[SCAN #${state.stats.totalScans}] ${scanTime}ms | No profitable opportunities`);
      }
    }
    
    // Actualizar balances cada 100 scans
    if (state.stats.totalScans % 100 === 0) {
      await updateBalances();
    }
    
    // Actualizar chain stats
    for (const chainState of state.chains) {
      chainState.lastScan = Date.now();
      chainState.scansCompleted++;
    }
    
  } catch (e) {
    console.error(`[TICK] Error: ${e.message}`);
  }
}

async function updateBalances() {
  for (const chainState of state.chains) {
    try {
      const balance = await providers[chainState.chain].getBalance(WALLET_ADDRESS);
      const balanceEth = parseFloat(ethers.formatEther(balance));
      chainState.balance = balanceEth.toFixed(6);
      chainState.balanceUsd = balanceEth * SCALPER_CONFIG.ETH_PRICE_USD;
      chainState.isActive = balanceEth > 0.001;
    } catch (e) {
      // Error al obtener balance
    }
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
    return res.json({ success: false, error: 'Ya está corriendo', isRunning: true });
  }
  
  state.isDryRun = req.body?.dryRun === true;
  state.isRunning = true;
  state.startTime = Date.now();
  
  // Reset stats
  state.stats = {
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
    avgExecutionTimeMs: 0,
    scansPerSecond: 0,
    uptime: 0,
    currentChain: 'all',
    lastOpportunity: null,
    lastTrade: null
  };
  state.tradeLogs = [];
  state.opportunities = [];
  scanTimes = [];
  
  // Iniciar loop scalper
  if (timer) clearInterval(timer);
  timer = setInterval(scalperTick, SCALPER_CONFIG.SCAN_INTERVAL_MS);
  
  console.log(`\n[START] 🔥 SCALPER HTF iniciado - ${state.isDryRun ? 'DRY RUN' : '⚠️ MODO REAL'}`);
  console.log(`[CONFIG] Intervalo: ${SCALPER_CONFIG.SCAN_INTERVAL_MS}ms | Min profit: $${SCALPER_CONFIG.MIN_PROFIT_USD} | Parallel: ${SCALPER_CONFIG.PARALLEL_CHAIN_SCAN}`);
  
  res.json({
    success: true,
    isRunning: true,
    isDryRun: state.isDryRun,
    mode: 'SCALPER_HTF',
    config: SCALPER_CONFIG
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
    avgExecutionTimeMs: 0,
    scansPerSecond: 0,
    uptime: 0,
    currentChain: 'all',
    lastOpportunity: null,
    lastTrade: null
  };
  state.tradeLogs = [];
  state.opportunities = [];
  scanTimes = [];
  res.json({ success: true });
});

app.get('/api/defi/multichain-arb/health', (req, res) => {
  res.json({
    status: 'ok',
    mode: 'SCALPER_HTF',
    port: PORT,
    running: state.isRunning,
    dryRun: state.isDryRun,
    wallet: WALLET_ADDRESS,
    config: SCALPER_CONFIG,
    stats: {
      scansPerSecond: state.stats.scansPerSecond,
      opportunitiesFound: state.stats.opportunitiesFound,
      tradesExecuted: state.stats.tradesExecuted
    }
  });
});

app.get('/api/defi/multichain-arb/config', (req, res) => {
  res.json(SCALPER_CONFIG);
});

// ═══════════════════════════════════════════════════════════════════════════════
// INICIAR SERVIDOR
// ═══════════════════════════════════════════════════════════════════════════════

app.listen(PORT, async () => {
  console.log(`
╔═══════════════════════════════════════════════════════════════════════════════╗
║                                                                               ║
║   🔥 SCALPER HTF ARBITRAGE BOT                                                ║
║                                                                               ║
║   ✅ Puerto: ${PORT}                                                           ║
║   ✅ Wallet: ${WALLET_ADDRESS.slice(0, 10)}...${WALLET_ADDRESS.slice(-5)}                                  ║
║   ✅ Modo: SCALPER - Entrada/Salida Rápida                                    ║
║                                                                               ║
║   ⚡ Intervalo: ${SCALPER_CONFIG.SCAN_INTERVAL_MS}ms (${(1000/SCALPER_CONFIG.SCAN_INTERVAL_MS).toFixed(0)} scans/seg)                                ║
║   ⚡ Min Profit: $${SCALPER_CONFIG.MIN_PROFIT_USD}                                                ║
║   ⚡ Parallel Scan: ${SCALPER_CONFIG.PARALLEL_CHAIN_SCAN}                                             ║
║   ⚡ Auto Execute: ${SCALPER_CONFIG.AUTO_EXECUTE}                                              ║
║                                                                               ║
║   📊 Chains: Base, Arbitrum, Optimism                                         ║
║                                                                               ║
║   ⚠️  MODO SCALPER - Alta frecuencia de entrada/salida                        ║
║                                                                               ║
╚═══════════════════════════════════════════════════════════════════════════════╝
  `);
  
  await initConnections();
  await updateBalances();
  
  console.log('\n[READY] 🔥 Scalper listo. Usa POST /api/defi/multichain-arb/start para iniciar.\n');
});

process.on('SIGINT', () => {
  console.log('\n[EXIT] Cerrando scalper...');
  if (timer) clearInterval(timer);
  process.exit(0);
});



 * ═══════════════════════════════════════════════════════════════════════════════
 * 🔥 SCALPER HTF ARBITRAGE BOT - ENTRADA Y SALIDA ULTRA-RÁPIDA
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * Comportamiento SCALPER:
 * - Detecta oportunidad → ENTRA inmediatamente
 * - Ejecuta swap → SALE inmediatamente
 * - No mantiene posiciones
 * - Ciclo continuo de entrada/salida
 * - Escaneo paralelo de múltiples chains
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
// CONFIGURACIÓN SCALPER HTF
// ═══════════════════════════════════════════════════════════════════════════════

const SCALPER_CONFIG = {
  // VELOCIDAD
  SCAN_INTERVAL_MS: 200,           // 5 scans por segundo
  PARALLEL_CHAIN_SCAN: true,       // Escanear todas las chains simultáneamente
  
  // UMBRALES SCALPER
  MIN_PROFIT_USD: 0.005,           // $0.005 mínimo (muy bajo para capturar más)
  MIN_SPREAD_BPS: 1,               // 0.01% spread mínimo
  MAX_SLIPPAGE_BPS: 50,            // 0.5% slippage máximo
  
  // CANTIDADES (pequeñas para entrada/salida rápida)
  TRADE_AMOUNTS_ETH: [0.001, 0.002, 0.003, 0.005, 0.008, 0.01],
  
  // FEE TIERS
  FEE_TIERS: [100, 500, 3000, 10000],
  
  // EJECUCIÓN
  AUTO_EXECUTE: true,
  IMMEDIATE_EXIT: true,            // Salir inmediatamente después de entrar
  MAX_CONCURRENT_TRADES: 3,        // Máximo trades simultáneos
  
  // GAS
  GAS_MULTIPLIER: 1.2,             // Gas más bajo para velocidad
  MAX_GAS_GWEI: 5,                 // Máximo gas en gwei
  
  // PRECIO ETH
  ETH_PRICE_USD: 3500
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
      USDC: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
      USDbC: '0xd9aAEc86B65D86f6A7B5B1b0c42FFA531710b6CA'
    },
    quoter: '0x3d4e44Eb1374240CE5F1B871ab261CD16335B76a',
    router: '0x2626664c2603336E57B271c5C0b26F421741e481',
    priority: 1  // Más prioridad
  },
  arbitrum: {
    name: 'Arbitrum',
    chainId: 42161,
    rpc: 'https://arb1.arbitrum.io/rpc',
    explorer: 'https://arbiscan.io',
    tokens: {
      WETH: '0x82aF49447D8a07e3bd95BD0d56f35241523fBab1',
      USDC: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831',
      USDT: '0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9'
    },
    quoter: '0x61fFE014bA17989E743c5F6cB21bF9697530B21e',
    router: '0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45',
    priority: 2
  },
  optimism: {
    name: 'Optimism',
    chainId: 10,
    rpc: 'https://mainnet.optimism.io',
    explorer: 'https://optimistic.etherscan.io',
    tokens: {
      WETH: '0x4200000000000000000000000000000000000006',
      USDC: '0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85',
      USDT: '0x94b008aA00579c1307B0EF2c499aD98a8ce58e58'
    },
    quoter: '0x61fFE014bA17989E743c5F6cB21bF9697530B21e',
    router: '0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45',
    priority: 3
  }
};

// ABIs
const QUOTER_ABI = [
  'function quoteExactInputSingle((address tokenIn, address tokenOut, uint256 amountIn, uint24 fee, uint160 sqrtPriceLimitX96)) external returns (uint256 amountOut, uint160 sqrtPriceX96After, uint32 initializedTicksCrossed, uint256 gasEstimate)'
];

const ROUTER_ABI = [
  'function exactInputSingle((address tokenIn, address tokenOut, uint24 fee, address recipient, uint256 amountIn, uint256 amountOutMinimum, uint160 sqrtPriceLimitX96)) external payable returns (uint256 amountOut)',
  'function multicall(uint256 deadline, bytes[] calldata data) external payable returns (bytes[] memory results)',
  'function unwrapWETH9(uint256 amountMinimum, address recipient) external payable'
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
  'function allowance(address owner, address spender) view returns (uint256)',
  'function decimals() view returns (uint8)'
];

// ═══════════════════════════════════════════════════════════════════════════════
// ESTADO DEL SCALPER
// ═══════════════════════════════════════════════════════════════════════════════

let state = {
  isRunning: false,
  isDryRun: false,
  startTime: null,
  mode: 'SCALPER_HTF',
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
    avgExecutionTimeMs: 0,
    scansPerSecond: 0,
    uptime: 0,
    currentChain: 'all',
    lastOpportunity: null,
    lastTrade: null
  },
  chains: [],
  tradeLogs: [],
  opportunities: [],
  banditStates: [],
  activePositions: [],
  scanHistory: []
};

let timer = null;
let providers = {};
let signers = {};
let contracts = {};
let activeTrades = 0;
let scanTimes = [];

// ═══════════════════════════════════════════════════════════════════════════════
// INICIALIZAR CONEXIONES
// ═══════════════════════════════════════════════════════════════════════════════

async function initConnections() {
  console.log('[INIT] 🔌 Inicializando conexiones a chains...');
  
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
        balanceUsd: balanceEth * SCALPER_CONFIG.ETH_PRICE_USD,
        routes: SCALPER_CONFIG.FEE_TIERS.length * SCALPER_CONFIG.TRADE_AMOUNTS_ETH.length,
        isActive: balanceEth > 0.001,
        lastScan: Date.now(),
        scansCompleted: 0,
        opportunitiesFound: 0,
        tradesExecuted: 0,
        explorer: chain.explorer,
        priority: chain.priority
      });
      
      state.banditStates.push({
        chain: key,
        alpha: 2,
        beta: 2,
        winRate: 50,
        selected: key === 'base',
        attempts: 0,
        wins: 0,
        avgProfit: 0
      });
      
      console.log(`[INIT] ✅ ${chain.name}: ${balanceEth.toFixed(6)} ETH ($${(balanceEth * SCALPER_CONFIG.ETH_PRICE_USD).toFixed(2)})`);
    } catch (e) {
      console.error(`[INIT] ❌ ${chain.name}: ${e.message}`);
    }
  }
  
  // Ordenar chains por prioridad
  state.chains.sort((a, b) => CHAINS[a.chain].priority - CHAINS[b.chain].priority);
}

// ═══════════════════════════════════════════════════════════════════════════════
// ESCANEO SCALPER - PARALELO Y ULTRA-RÁPIDO
// ═══════════════════════════════════════════════════════════════════════════════

async function scalperScan(chainKey) {
  const chain = CHAINS[chainKey];
  const provider = providers[chainKey];
  const quoter = contracts[chainKey].quoter;
  const opportunities = [];
  
  try {
    // Obtener gas price actual
    const feeData = await provider.getFeeData();
    const gasPrice = feeData.gasPrice || ethers.parseUnits('0.001', 'gwei');
    const gasPriceGwei = parseFloat(ethers.formatUnits(gasPrice, 'gwei'));
    
    // Si gas muy alto, saltar
    if (gasPriceGwei > SCALPER_CONFIG.MAX_GAS_GWEI) {
      return [];
    }
    
    const gasCostWei = gasPrice * 250000n; // Estimado para swap completo
    const gasCostUsd = parseFloat(ethers.formatEther(gasCostWei)) * SCALPER_CONFIG.ETH_PRICE_USD;
    
    // Generar todas las combinaciones de quotes
    const quotePromises = [];
    
    for (const amountEth of SCALPER_CONFIG.TRADE_AMOUNTS_ETH) {
      const amountWei = ethers.parseEther(amountEth.toString());
      
      for (let i = 0; i < SCALPER_CONFIG.FEE_TIERS.length; i++) {
        for (let j = 0; j < SCALPER_CONFIG.FEE_TIERS.length; j++) {
          // Probar diferentes combinaciones de fee tiers
          const fee1 = SCALPER_CONFIG.FEE_TIERS[i];
          const fee2 = SCALPER_CONFIG.FEE_TIERS[j];
          
          quotePromises.push(
            (async () => {
              try {
                // ENTRADA: WETH → USDC
                const quote1 = await quoter.quoteExactInputSingle.staticCall({
                  tokenIn: chain.tokens.WETH,
                  tokenOut: chain.tokens.USDC,
                  amountIn: amountWei,
                  fee: fee1,
                  sqrtPriceLimitX96: 0n
                });
                const usdcOut = quote1[0];
                
                // SALIDA: USDC → WETH
                const quote2 = await quoter.quoteExactInputSingle.staticCall({
                  tokenIn: chain.tokens.USDC,
                  tokenOut: chain.tokens.WETH,
                  amountIn: usdcOut,
                  fee: fee2,
                  sqrtPriceLimitX96: 0n
                });
                const wethOut = quote2[0];
                
                // Calcular profit
                const grossProfit = wethOut - amountWei;
                const netProfit = grossProfit - gasCostWei;
                
                if (netProfit > 0n) {
                  const netProfitUsd = parseFloat(ethers.formatEther(netProfit)) * SCALPER_CONFIG.ETH_PRICE_USD;
                  const spreadBps = Number((grossProfit * 10000n) / amountWei);
                  
                  if (netProfitUsd >= SCALPER_CONFIG.MIN_PROFIT_USD && spreadBps >= SCALPER_CONFIG.MIN_SPREAD_BPS) {
                    return {
                      chain: chainKey,
                      chainName: chain.name,
                      type: 'SCALP',
                      direction: 'WETH→USDC→WETH',
                      route: `Fee ${fee1/100}%→${fee2/100}%`,
                      amountIn: amountWei,
                      amountInEth: amountEth,
                      fee1,
                      fee2,
                      usdcIntermediate: usdcOut,
                      wethOut,
                      grossProfit,
                      netProfit,
                      netProfitUsd,
                      gasCostUsd,
                      spreadBps,
                      timestamp: Date.now(),
                      gasPrice: gasPriceGwei,
                      confidence: Math.min(100, spreadBps * 10)
                    };
                  }
                }
              } catch (e) {
                // Pool no existe o error de quote
              }
              return null;
            })()
          );
        }
      }
    }
    
    // Ejecutar todos los quotes en paralelo
    const results = await Promise.all(quotePromises);
    opportunities.push(...results.filter(r => r !== null));
    
  } catch (e) {
    // Error general de scan
  }
  
  return opportunities;
}

// ═══════════════════════════════════════════════════════════════════════════════
// EJECUCIÓN SCALPER - ENTRADA Y SALIDA INMEDIATA
// ═══════════════════════════════════════════════════════════════════════════════

async function executeScalp(opp) {
  if (activeTrades >= SCALPER_CONFIG.MAX_CONCURRENT_TRADES) {
    console.log(`[SCALP] ⚠️ Máximo trades activos (${activeTrades}), esperando...`);
    return null;
  }
  
  activeTrades++;
  const startTime = Date.now();
  const chain = CHAINS[opp.chain];
  const signer = signers[opp.chain];
  const provider = providers[opp.chain];
  const { router, weth } = contracts[opp.chain];
  
  console.log(`\n🔥 [SCALP] ═══════════════════════════════════════════════════════`);
  console.log(`   Chain: ${chain.name}`);
  console.log(`   Route: ${opp.route}`);
  console.log(`   Amount: ${opp.amountInEth} ETH`);
  console.log(`   Expected Profit: $${opp.netProfitUsd.toFixed(4)}`);
  console.log(`   Spread: ${opp.spreadBps} bps`);
  console.log(`   Gas: ${opp.gasPrice.toFixed(2)} gwei`);
  
  try {
    // Verificar balance
    const balance = await provider.getBalance(WALLET_ADDRESS);
    if (balance < opp.amountIn + ethers.parseEther('0.001')) {
      console.log(`   ❌ Balance insuficiente`);
      activeTrades--;
      return { success: false, error: 'Balance insuficiente' };
    }
    
    // ═══════════════════════════════════════════════════════════════════════════
    // PASO 1: WRAP ETH → WETH
    // ═══════════════════════════════════════════════════════════════════════════
    console.log(`   📦 [1/4] Wrapping ETH → WETH...`);
    const wrapTx = await weth.deposit({ 
      value: opp.amountIn,
      gasLimit: 50000
    });
    const wrapReceipt = await wrapTx.wait(1);
    console.log(`   ✅ Wrap completado: ${wrapReceipt.hash.slice(0, 16)}...`);
    
    // ═══════════════════════════════════════════════════════════════════════════
    // PASO 2: APPROVE WETH (si es necesario)
    // ═══════════════════════════════════════════════════════════════════════════
    const wethAllowance = await weth.allowance(WALLET_ADDRESS, chain.router);
    if (wethAllowance < opp.amountIn) {
      console.log(`   🔓 [2/4] Approving WETH...`);
      const approveTx = await weth.approve(chain.router, ethers.MaxUint256, { gasLimit: 50000 });
      await approveTx.wait(1);
      console.log(`   ✅ WETH approved`);
    } else {
      console.log(`   ✅ [2/4] WETH ya aprobado`);
    }
    
    // ═══════════════════════════════════════════════════════════════════════════
    // PASO 3: ENTRADA - SWAP WETH → USDC
    // ═══════════════════════════════════════════════════════════════════════════
    console.log(`   🔄 [3/4] ENTRADA: WETH → USDC...`);
    const minUsdc = (opp.usdcIntermediate * BigInt(10000 - SCALPER_CONFIG.MAX_SLIPPAGE_BPS)) / 10000n;
    
    const swap1Tx = await router.exactInputSingle({
      tokenIn: chain.tokens.WETH,
      tokenOut: chain.tokens.USDC,
      fee: opp.fee1,
      recipient: WALLET_ADDRESS,
      amountIn: opp.amountIn,
      amountOutMinimum: minUsdc,
      sqrtPriceLimitX96: 0n
    }, { gasLimit: 300000 });
    
    const swap1Receipt = await swap1Tx.wait(1);
    console.log(`   ✅ ENTRADA completada: ${swap1Receipt.hash.slice(0, 16)}...`);
    
    // Obtener balance USDC real
    const usdc = new ethers.Contract(chain.tokens.USDC, ERC20_ABI, signer);
    const usdcBalance = await usdc.balanceOf(WALLET_ADDRESS);
    console.log(`   💵 USDC recibido: ${ethers.formatUnits(usdcBalance, 6)}`);
    
    // ═══════════════════════════════════════════════════════════════════════════
    // PASO 4: SALIDA INMEDIATA - SWAP USDC → WETH
    // ═══════════════════════════════════════════════════════════════════════════
    console.log(`   🔄 [4/4] SALIDA: USDC → WETH...`);
    
    // Approve USDC si es necesario
    const usdcAllowance = await usdc.allowance(WALLET_ADDRESS, chain.router);
    if (usdcAllowance < usdcBalance) {
      const approveUsdcTx = await usdc.approve(chain.router, ethers.MaxUint256, { gasLimit: 50000 });
      await approveUsdcTx.wait(1);
    }
    
    const minWeth = (opp.wethOut * BigInt(10000 - SCALPER_CONFIG.MAX_SLIPPAGE_BPS)) / 10000n;
    
    const swap2Tx = await router.exactInputSingle({
      tokenIn: chain.tokens.USDC,
      tokenOut: chain.tokens.WETH,
      fee: opp.fee2,
      recipient: WALLET_ADDRESS,
      amountIn: usdcBalance,
      amountOutMinimum: minWeth,
      sqrtPriceLimitX96: 0n
    }, { gasLimit: 300000 });
    
    const swap2Receipt = await swap2Tx.wait(1);
    console.log(`   ✅ SALIDA completada: ${swap2Receipt.hash.slice(0, 16)}...`);
    
    // ═══════════════════════════════════════════════════════════════════════════
    // CALCULAR PROFIT REAL
    // ═══════════════════════════════════════════════════════════════════════════
    const finalWethBalance = await weth.balanceOf(WALLET_ADDRESS);
    const actualProfit = finalWethBalance - opp.amountIn;
    const actualProfitUsd = parseFloat(ethers.formatEther(actualProfit)) * SCALPER_CONFIG.ETH_PRICE_USD;
    
    // Calcular gas usado
    const gas1 = swap1Receipt.gasUsed * swap1Receipt.gasPrice;
    const gas2 = swap2Receipt.gasUsed * swap2Receipt.gasPrice;
    const totalGasWei = gas1 + gas2 + wrapReceipt.gasUsed * wrapReceipt.gasPrice;
    const totalGasUsd = parseFloat(ethers.formatEther(totalGasWei)) * SCALPER_CONFIG.ETH_PRICE_USD;
    
    const netProfitUsd = actualProfitUsd - totalGasUsd;
    const executionTime = Date.now() - startTime;
    
    console.log(`   ═══════════════════════════════════════════════════════`);
    console.log(`   💰 PROFIT BRUTO: $${actualProfitUsd.toFixed(4)}`);
    console.log(`   ⛽ GAS TOTAL: $${totalGasUsd.toFixed(4)}`);
    console.log(`   💵 PROFIT NETO: $${netProfitUsd.toFixed(4)}`);
    console.log(`   ⏱️  Tiempo: ${executionTime}ms`);
    console.log(`   🔗 TX: ${chain.explorer}/tx/${swap2Receipt.hash}`);
    console.log(`   ═══════════════════════════════════════════════════════\n`);
    
    activeTrades--;
    
    return {
      success: true,
      profitUsd: actualProfitUsd,
      gasUsd: totalGasUsd,
      netProfitUsd,
      txHash: swap2Receipt.hash,
      executionTimeMs: executionTime
    };
    
  } catch (e) {
    console.log(`   ❌ Error: ${e.message}`);
    activeTrades--;
    return { success: false, error: e.message };
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// LOOP PRINCIPAL SCALPER
// ═══════════════════════════════════════════════════════════════════════════════

async function scalperTick() {
  if (!state.isRunning) return;
  
  const tickStart = Date.now();
  state.stats.totalScans++;
  state.stats.uptime = Math.floor((Date.now() - state.startTime) / 1000);
  
  try {
    // ESCANEO PARALELO de todas las chains activas
    const activeChains = state.chains.filter(c => c.isActive).map(c => c.chain);
    
    let allOpportunities = [];
    
    if (SCALPER_CONFIG.PARALLEL_CHAIN_SCAN) {
      // Escanear todas las chains en paralelo
      const scanPromises = activeChains.map(chainKey => scalperScan(chainKey));
      const results = await Promise.all(scanPromises);
      allOpportunities = results.flat();
    } else {
      // Escanear secuencialmente (round-robin)
      const chainIndex = state.stats.totalScans % activeChains.length;
      const selectedChain = activeChains[chainIndex];
      allOpportunities = await scalperScan(selectedChain);
    }
    
    const scanTime = Date.now() - tickStart;
    scanTimes.push(scanTime);
    if (scanTimes.length > 100) scanTimes.shift();
    state.stats.avgScanTimeMs = Math.round(scanTimes.reduce((a, b) => a + b, 0) / scanTimes.length);
    state.stats.scansPerSecond = Math.round(1000 / state.stats.avgScanTimeMs * 10) / 10;
    
    if (allOpportunities.length > 0) {
      state.stats.opportunitiesFound += allOpportunities.length;
      
      // Ordenar por profit neto
      allOpportunities.sort((a, b) => b.netProfitUsd - a.netProfitUsd);
      
      // Guardar oportunidades para UI
      state.opportunities = [...allOpportunities.slice(0, 10), ...state.opportunities].slice(0, 50);
      state.stats.lastOpportunity = allOpportunities[0];
      
      const best = allOpportunities[0];
      
      console.log(`[SCAN #${state.stats.totalScans}] ${scanTime}ms | ${allOpportunities.length} opps | Best: $${best.netProfitUsd.toFixed(4)} on ${best.chainName}`);
      
      // EJECUTAR si no es dry run y auto-execute está activo
      if (!state.isDryRun && SCALPER_CONFIG.AUTO_EXECUTE && best.netProfitUsd >= SCALPER_CONFIG.MIN_PROFIT_USD) {
        state.stats.tradesAttempted++;
        
        const result = await executeScalp(best);
        
        if (result) {
          state.stats.tradesExecuted++;
          
          const tradeLog = {
            id: `scalp-${Date.now()}`,
            timestamp: Date.now(),
            chain: best.chain,
            chainName: best.chainName,
            type: 'SCALP',
            route: best.route,
            direction: best.direction,
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
          if (state.tradeLogs.length > 100) state.tradeLogs.pop();
          
          if (result.success) {
            state.stats.tradesSuccessful++;
            state.stats.totalProfitUsd += result.profitUsd;
            state.stats.totalGasUsd += result.gasUsd;
            state.stats.netProfitUsd = state.stats.totalProfitUsd - state.stats.totalGasUsd;
            state.stats.lastTrade = tradeLog;
            
            // Actualizar bandit
            const bandit = state.banditStates.find(b => b.chain === best.chain);
            if (bandit) {
              bandit.wins++;
              bandit.attempts++;
              bandit.alpha++;
              bandit.winRate = (bandit.wins / bandit.attempts) * 100;
              bandit.avgProfit = (bandit.avgProfit * (bandit.wins - 1) + result.netProfitUsd) / bandit.wins;
            }
            
            // Actualizar chain stats
            const chainState = state.chains.find(c => c.chain === best.chain);
            if (chainState) {
              chainState.tradesExecuted++;
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
      // Log periódico cuando no hay oportunidades
      if (state.stats.totalScans % 50 === 0) {
        console.log(`[SCAN #${state.stats.totalScans}] ${scanTime}ms | No profitable opportunities`);
      }
    }
    
    // Actualizar balances cada 100 scans
    if (state.stats.totalScans % 100 === 0) {
      await updateBalances();
    }
    
    // Actualizar chain stats
    for (const chainState of state.chains) {
      chainState.lastScan = Date.now();
      chainState.scansCompleted++;
    }
    
  } catch (e) {
    console.error(`[TICK] Error: ${e.message}`);
  }
}

async function updateBalances() {
  for (const chainState of state.chains) {
    try {
      const balance = await providers[chainState.chain].getBalance(WALLET_ADDRESS);
      const balanceEth = parseFloat(ethers.formatEther(balance));
      chainState.balance = balanceEth.toFixed(6);
      chainState.balanceUsd = balanceEth * SCALPER_CONFIG.ETH_PRICE_USD;
      chainState.isActive = balanceEth > 0.001;
    } catch (e) {
      // Error al obtener balance
    }
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
    return res.json({ success: false, error: 'Ya está corriendo', isRunning: true });
  }
  
  state.isDryRun = req.body?.dryRun === true;
  state.isRunning = true;
  state.startTime = Date.now();
  
  // Reset stats
  state.stats = {
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
    avgExecutionTimeMs: 0,
    scansPerSecond: 0,
    uptime: 0,
    currentChain: 'all',
    lastOpportunity: null,
    lastTrade: null
  };
  state.tradeLogs = [];
  state.opportunities = [];
  scanTimes = [];
  
  // Iniciar loop scalper
  if (timer) clearInterval(timer);
  timer = setInterval(scalperTick, SCALPER_CONFIG.SCAN_INTERVAL_MS);
  
  console.log(`\n[START] 🔥 SCALPER HTF iniciado - ${state.isDryRun ? 'DRY RUN' : '⚠️ MODO REAL'}`);
  console.log(`[CONFIG] Intervalo: ${SCALPER_CONFIG.SCAN_INTERVAL_MS}ms | Min profit: $${SCALPER_CONFIG.MIN_PROFIT_USD} | Parallel: ${SCALPER_CONFIG.PARALLEL_CHAIN_SCAN}`);
  
  res.json({
    success: true,
    isRunning: true,
    isDryRun: state.isDryRun,
    mode: 'SCALPER_HTF',
    config: SCALPER_CONFIG
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
    avgExecutionTimeMs: 0,
    scansPerSecond: 0,
    uptime: 0,
    currentChain: 'all',
    lastOpportunity: null,
    lastTrade: null
  };
  state.tradeLogs = [];
  state.opportunities = [];
  scanTimes = [];
  res.json({ success: true });
});

app.get('/api/defi/multichain-arb/health', (req, res) => {
  res.json({
    status: 'ok',
    mode: 'SCALPER_HTF',
    port: PORT,
    running: state.isRunning,
    dryRun: state.isDryRun,
    wallet: WALLET_ADDRESS,
    config: SCALPER_CONFIG,
    stats: {
      scansPerSecond: state.stats.scansPerSecond,
      opportunitiesFound: state.stats.opportunitiesFound,
      tradesExecuted: state.stats.tradesExecuted
    }
  });
});

app.get('/api/defi/multichain-arb/config', (req, res) => {
  res.json(SCALPER_CONFIG);
});

// ═══════════════════════════════════════════════════════════════════════════════
// INICIAR SERVIDOR
// ═══════════════════════════════════════════════════════════════════════════════

app.listen(PORT, async () => {
  console.log(`
╔═══════════════════════════════════════════════════════════════════════════════╗
║                                                                               ║
║   🔥 SCALPER HTF ARBITRAGE BOT                                                ║
║                                                                               ║
║   ✅ Puerto: ${PORT}                                                           ║
║   ✅ Wallet: ${WALLET_ADDRESS.slice(0, 10)}...${WALLET_ADDRESS.slice(-5)}                                  ║
║   ✅ Modo: SCALPER - Entrada/Salida Rápida                                    ║
║                                                                               ║
║   ⚡ Intervalo: ${SCALPER_CONFIG.SCAN_INTERVAL_MS}ms (${(1000/SCALPER_CONFIG.SCAN_INTERVAL_MS).toFixed(0)} scans/seg)                                ║
║   ⚡ Min Profit: $${SCALPER_CONFIG.MIN_PROFIT_USD}                                                ║
║   ⚡ Parallel Scan: ${SCALPER_CONFIG.PARALLEL_CHAIN_SCAN}                                             ║
║   ⚡ Auto Execute: ${SCALPER_CONFIG.AUTO_EXECUTE}                                              ║
║                                                                               ║
║   📊 Chains: Base, Arbitrum, Optimism                                         ║
║                                                                               ║
║   ⚠️  MODO SCALPER - Alta frecuencia de entrada/salida                        ║
║                                                                               ║
╚═══════════════════════════════════════════════════════════════════════════════╝
  `);
  
  await initConnections();
  await updateBalances();
  
  console.log('\n[READY] 🔥 Scalper listo. Usa POST /api/defi/multichain-arb/start para iniciar.\n');
});

process.on('SIGINT', () => {
  console.log('\n[EXIT] Cerrando scalper...');
  if (timer) clearInterval(timer);
  process.exit(0);
});



 * ═══════════════════════════════════════════════════════════════════════════════
 * 🔥 SCALPER HTF ARBITRAGE BOT - ENTRADA Y SALIDA ULTRA-RÁPIDA
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * Comportamiento SCALPER:
 * - Detecta oportunidad → ENTRA inmediatamente
 * - Ejecuta swap → SALE inmediatamente
 * - No mantiene posiciones
 * - Ciclo continuo de entrada/salida
 * - Escaneo paralelo de múltiples chains
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
// CONFIGURACIÓN SCALPER HTF
// ═══════════════════════════════════════════════════════════════════════════════

const SCALPER_CONFIG = {
  // VELOCIDAD
  SCAN_INTERVAL_MS: 200,           // 5 scans por segundo
  PARALLEL_CHAIN_SCAN: true,       // Escanear todas las chains simultáneamente
  
  // UMBRALES SCALPER
  MIN_PROFIT_USD: 0.005,           // $0.005 mínimo (muy bajo para capturar más)
  MIN_SPREAD_BPS: 1,               // 0.01% spread mínimo
  MAX_SLIPPAGE_BPS: 50,            // 0.5% slippage máximo
  
  // CANTIDADES (pequeñas para entrada/salida rápida)
  TRADE_AMOUNTS_ETH: [0.001, 0.002, 0.003, 0.005, 0.008, 0.01],
  
  // FEE TIERS
  FEE_TIERS: [100, 500, 3000, 10000],
  
  // EJECUCIÓN
  AUTO_EXECUTE: true,
  IMMEDIATE_EXIT: true,            // Salir inmediatamente después de entrar
  MAX_CONCURRENT_TRADES: 3,        // Máximo trades simultáneos
  
  // GAS
  GAS_MULTIPLIER: 1.2,             // Gas más bajo para velocidad
  MAX_GAS_GWEI: 5,                 // Máximo gas en gwei
  
  // PRECIO ETH
  ETH_PRICE_USD: 3500
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
      USDC: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
      USDbC: '0xd9aAEc86B65D86f6A7B5B1b0c42FFA531710b6CA'
    },
    quoter: '0x3d4e44Eb1374240CE5F1B871ab261CD16335B76a',
    router: '0x2626664c2603336E57B271c5C0b26F421741e481',
    priority: 1  // Más prioridad
  },
  arbitrum: {
    name: 'Arbitrum',
    chainId: 42161,
    rpc: 'https://arb1.arbitrum.io/rpc',
    explorer: 'https://arbiscan.io',
    tokens: {
      WETH: '0x82aF49447D8a07e3bd95BD0d56f35241523fBab1',
      USDC: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831',
      USDT: '0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9'
    },
    quoter: '0x61fFE014bA17989E743c5F6cB21bF9697530B21e',
    router: '0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45',
    priority: 2
  },
  optimism: {
    name: 'Optimism',
    chainId: 10,
    rpc: 'https://mainnet.optimism.io',
    explorer: 'https://optimistic.etherscan.io',
    tokens: {
      WETH: '0x4200000000000000000000000000000000000006',
      USDC: '0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85',
      USDT: '0x94b008aA00579c1307B0EF2c499aD98a8ce58e58'
    },
    quoter: '0x61fFE014bA17989E743c5F6cB21bF9697530B21e',
    router: '0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45',
    priority: 3
  }
};

// ABIs
const QUOTER_ABI = [
  'function quoteExactInputSingle((address tokenIn, address tokenOut, uint256 amountIn, uint24 fee, uint160 sqrtPriceLimitX96)) external returns (uint256 amountOut, uint160 sqrtPriceX96After, uint32 initializedTicksCrossed, uint256 gasEstimate)'
];

const ROUTER_ABI = [
  'function exactInputSingle((address tokenIn, address tokenOut, uint24 fee, address recipient, uint256 amountIn, uint256 amountOutMinimum, uint160 sqrtPriceLimitX96)) external payable returns (uint256 amountOut)',
  'function multicall(uint256 deadline, bytes[] calldata data) external payable returns (bytes[] memory results)',
  'function unwrapWETH9(uint256 amountMinimum, address recipient) external payable'
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
  'function allowance(address owner, address spender) view returns (uint256)',
  'function decimals() view returns (uint8)'
];

// ═══════════════════════════════════════════════════════════════════════════════
// ESTADO DEL SCALPER
// ═══════════════════════════════════════════════════════════════════════════════

let state = {
  isRunning: false,
  isDryRun: false,
  startTime: null,
  mode: 'SCALPER_HTF',
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
    avgExecutionTimeMs: 0,
    scansPerSecond: 0,
    uptime: 0,
    currentChain: 'all',
    lastOpportunity: null,
    lastTrade: null
  },
  chains: [],
  tradeLogs: [],
  opportunities: [],
  banditStates: [],
  activePositions: [],
  scanHistory: []
};

let timer = null;
let providers = {};
let signers = {};
let contracts = {};
let activeTrades = 0;
let scanTimes = [];

// ═══════════════════════════════════════════════════════════════════════════════
// INICIALIZAR CONEXIONES
// ═══════════════════════════════════════════════════════════════════════════════

async function initConnections() {
  console.log('[INIT] 🔌 Inicializando conexiones a chains...');
  
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
        balanceUsd: balanceEth * SCALPER_CONFIG.ETH_PRICE_USD,
        routes: SCALPER_CONFIG.FEE_TIERS.length * SCALPER_CONFIG.TRADE_AMOUNTS_ETH.length,
        isActive: balanceEth > 0.001,
        lastScan: Date.now(),
        scansCompleted: 0,
        opportunitiesFound: 0,
        tradesExecuted: 0,
        explorer: chain.explorer,
        priority: chain.priority
      });
      
      state.banditStates.push({
        chain: key,
        alpha: 2,
        beta: 2,
        winRate: 50,
        selected: key === 'base',
        attempts: 0,
        wins: 0,
        avgProfit: 0
      });
      
      console.log(`[INIT] ✅ ${chain.name}: ${balanceEth.toFixed(6)} ETH ($${(balanceEth * SCALPER_CONFIG.ETH_PRICE_USD).toFixed(2)})`);
    } catch (e) {
      console.error(`[INIT] ❌ ${chain.name}: ${e.message}`);
    }
  }
  
  // Ordenar chains por prioridad
  state.chains.sort((a, b) => CHAINS[a.chain].priority - CHAINS[b.chain].priority);
}

// ═══════════════════════════════════════════════════════════════════════════════
// ESCANEO SCALPER - PARALELO Y ULTRA-RÁPIDO
// ═══════════════════════════════════════════════════════════════════════════════

async function scalperScan(chainKey) {
  const chain = CHAINS[chainKey];
  const provider = providers[chainKey];
  const quoter = contracts[chainKey].quoter;
  const opportunities = [];
  
  try {
    // Obtener gas price actual
    const feeData = await provider.getFeeData();
    const gasPrice = feeData.gasPrice || ethers.parseUnits('0.001', 'gwei');
    const gasPriceGwei = parseFloat(ethers.formatUnits(gasPrice, 'gwei'));
    
    // Si gas muy alto, saltar
    if (gasPriceGwei > SCALPER_CONFIG.MAX_GAS_GWEI) {
      return [];
    }
    
    const gasCostWei = gasPrice * 250000n; // Estimado para swap completo
    const gasCostUsd = parseFloat(ethers.formatEther(gasCostWei)) * SCALPER_CONFIG.ETH_PRICE_USD;
    
    // Generar todas las combinaciones de quotes
    const quotePromises = [];
    
    for (const amountEth of SCALPER_CONFIG.TRADE_AMOUNTS_ETH) {
      const amountWei = ethers.parseEther(amountEth.toString());
      
      for (let i = 0; i < SCALPER_CONFIG.FEE_TIERS.length; i++) {
        for (let j = 0; j < SCALPER_CONFIG.FEE_TIERS.length; j++) {
          // Probar diferentes combinaciones de fee tiers
          const fee1 = SCALPER_CONFIG.FEE_TIERS[i];
          const fee2 = SCALPER_CONFIG.FEE_TIERS[j];
          
          quotePromises.push(
            (async () => {
              try {
                // ENTRADA: WETH → USDC
                const quote1 = await quoter.quoteExactInputSingle.staticCall({
                  tokenIn: chain.tokens.WETH,
                  tokenOut: chain.tokens.USDC,
                  amountIn: amountWei,
                  fee: fee1,
                  sqrtPriceLimitX96: 0n
                });
                const usdcOut = quote1[0];
                
                // SALIDA: USDC → WETH
                const quote2 = await quoter.quoteExactInputSingle.staticCall({
                  tokenIn: chain.tokens.USDC,
                  tokenOut: chain.tokens.WETH,
                  amountIn: usdcOut,
                  fee: fee2,
                  sqrtPriceLimitX96: 0n
                });
                const wethOut = quote2[0];
                
                // Calcular profit
                const grossProfit = wethOut - amountWei;
                const netProfit = grossProfit - gasCostWei;
                
                if (netProfit > 0n) {
                  const netProfitUsd = parseFloat(ethers.formatEther(netProfit)) * SCALPER_CONFIG.ETH_PRICE_USD;
                  const spreadBps = Number((grossProfit * 10000n) / amountWei);
                  
                  if (netProfitUsd >= SCALPER_CONFIG.MIN_PROFIT_USD && spreadBps >= SCALPER_CONFIG.MIN_SPREAD_BPS) {
                    return {
                      chain: chainKey,
                      chainName: chain.name,
                      type: 'SCALP',
                      direction: 'WETH→USDC→WETH',
                      route: `Fee ${fee1/100}%→${fee2/100}%`,
                      amountIn: amountWei,
                      amountInEth: amountEth,
                      fee1,
                      fee2,
                      usdcIntermediate: usdcOut,
                      wethOut,
                      grossProfit,
                      netProfit,
                      netProfitUsd,
                      gasCostUsd,
                      spreadBps,
                      timestamp: Date.now(),
                      gasPrice: gasPriceGwei,
                      confidence: Math.min(100, spreadBps * 10)
                    };
                  }
                }
              } catch (e) {
                // Pool no existe o error de quote
              }
              return null;
            })()
          );
        }
      }
    }
    
    // Ejecutar todos los quotes en paralelo
    const results = await Promise.all(quotePromises);
    opportunities.push(...results.filter(r => r !== null));
    
  } catch (e) {
    // Error general de scan
  }
  
  return opportunities;
}

// ═══════════════════════════════════════════════════════════════════════════════
// EJECUCIÓN SCALPER - ENTRADA Y SALIDA INMEDIATA
// ═══════════════════════════════════════════════════════════════════════════════

async function executeScalp(opp) {
  if (activeTrades >= SCALPER_CONFIG.MAX_CONCURRENT_TRADES) {
    console.log(`[SCALP] ⚠️ Máximo trades activos (${activeTrades}), esperando...`);
    return null;
  }
  
  activeTrades++;
  const startTime = Date.now();
  const chain = CHAINS[opp.chain];
  const signer = signers[opp.chain];
  const provider = providers[opp.chain];
  const { router, weth } = contracts[opp.chain];
  
  console.log(`\n🔥 [SCALP] ═══════════════════════════════════════════════════════`);
  console.log(`   Chain: ${chain.name}`);
  console.log(`   Route: ${opp.route}`);
  console.log(`   Amount: ${opp.amountInEth} ETH`);
  console.log(`   Expected Profit: $${opp.netProfitUsd.toFixed(4)}`);
  console.log(`   Spread: ${opp.spreadBps} bps`);
  console.log(`   Gas: ${opp.gasPrice.toFixed(2)} gwei`);
  
  try {
    // Verificar balance
    const balance = await provider.getBalance(WALLET_ADDRESS);
    if (balance < opp.amountIn + ethers.parseEther('0.001')) {
      console.log(`   ❌ Balance insuficiente`);
      activeTrades--;
      return { success: false, error: 'Balance insuficiente' };
    }
    
    // ═══════════════════════════════════════════════════════════════════════════
    // PASO 1: WRAP ETH → WETH
    // ═══════════════════════════════════════════════════════════════════════════
    console.log(`   📦 [1/4] Wrapping ETH → WETH...`);
    const wrapTx = await weth.deposit({ 
      value: opp.amountIn,
      gasLimit: 50000
    });
    const wrapReceipt = await wrapTx.wait(1);
    console.log(`   ✅ Wrap completado: ${wrapReceipt.hash.slice(0, 16)}...`);
    
    // ═══════════════════════════════════════════════════════════════════════════
    // PASO 2: APPROVE WETH (si es necesario)
    // ═══════════════════════════════════════════════════════════════════════════
    const wethAllowance = await weth.allowance(WALLET_ADDRESS, chain.router);
    if (wethAllowance < opp.amountIn) {
      console.log(`   🔓 [2/4] Approving WETH...`);
      const approveTx = await weth.approve(chain.router, ethers.MaxUint256, { gasLimit: 50000 });
      await approveTx.wait(1);
      console.log(`   ✅ WETH approved`);
    } else {
      console.log(`   ✅ [2/4] WETH ya aprobado`);
    }
    
    // ═══════════════════════════════════════════════════════════════════════════
    // PASO 3: ENTRADA - SWAP WETH → USDC
    // ═══════════════════════════════════════════════════════════════════════════
    console.log(`   🔄 [3/4] ENTRADA: WETH → USDC...`);
    const minUsdc = (opp.usdcIntermediate * BigInt(10000 - SCALPER_CONFIG.MAX_SLIPPAGE_BPS)) / 10000n;
    
    const swap1Tx = await router.exactInputSingle({
      tokenIn: chain.tokens.WETH,
      tokenOut: chain.tokens.USDC,
      fee: opp.fee1,
      recipient: WALLET_ADDRESS,
      amountIn: opp.amountIn,
      amountOutMinimum: minUsdc,
      sqrtPriceLimitX96: 0n
    }, { gasLimit: 300000 });
    
    const swap1Receipt = await swap1Tx.wait(1);
    console.log(`   ✅ ENTRADA completada: ${swap1Receipt.hash.slice(0, 16)}...`);
    
    // Obtener balance USDC real
    const usdc = new ethers.Contract(chain.tokens.USDC, ERC20_ABI, signer);
    const usdcBalance = await usdc.balanceOf(WALLET_ADDRESS);
    console.log(`   💵 USDC recibido: ${ethers.formatUnits(usdcBalance, 6)}`);
    
    // ═══════════════════════════════════════════════════════════════════════════
    // PASO 4: SALIDA INMEDIATA - SWAP USDC → WETH
    // ═══════════════════════════════════════════════════════════════════════════
    console.log(`   🔄 [4/4] SALIDA: USDC → WETH...`);
    
    // Approve USDC si es necesario
    const usdcAllowance = await usdc.allowance(WALLET_ADDRESS, chain.router);
    if (usdcAllowance < usdcBalance) {
      const approveUsdcTx = await usdc.approve(chain.router, ethers.MaxUint256, { gasLimit: 50000 });
      await approveUsdcTx.wait(1);
    }
    
    const minWeth = (opp.wethOut * BigInt(10000 - SCALPER_CONFIG.MAX_SLIPPAGE_BPS)) / 10000n;
    
    const swap2Tx = await router.exactInputSingle({
      tokenIn: chain.tokens.USDC,
      tokenOut: chain.tokens.WETH,
      fee: opp.fee2,
      recipient: WALLET_ADDRESS,
      amountIn: usdcBalance,
      amountOutMinimum: minWeth,
      sqrtPriceLimitX96: 0n
    }, { gasLimit: 300000 });
    
    const swap2Receipt = await swap2Tx.wait(1);
    console.log(`   ✅ SALIDA completada: ${swap2Receipt.hash.slice(0, 16)}...`);
    
    // ═══════════════════════════════════════════════════════════════════════════
    // CALCULAR PROFIT REAL
    // ═══════════════════════════════════════════════════════════════════════════
    const finalWethBalance = await weth.balanceOf(WALLET_ADDRESS);
    const actualProfit = finalWethBalance - opp.amountIn;
    const actualProfitUsd = parseFloat(ethers.formatEther(actualProfit)) * SCALPER_CONFIG.ETH_PRICE_USD;
    
    // Calcular gas usado
    const gas1 = swap1Receipt.gasUsed * swap1Receipt.gasPrice;
    const gas2 = swap2Receipt.gasUsed * swap2Receipt.gasPrice;
    const totalGasWei = gas1 + gas2 + wrapReceipt.gasUsed * wrapReceipt.gasPrice;
    const totalGasUsd = parseFloat(ethers.formatEther(totalGasWei)) * SCALPER_CONFIG.ETH_PRICE_USD;
    
    const netProfitUsd = actualProfitUsd - totalGasUsd;
    const executionTime = Date.now() - startTime;
    
    console.log(`   ═══════════════════════════════════════════════════════`);
    console.log(`   💰 PROFIT BRUTO: $${actualProfitUsd.toFixed(4)}`);
    console.log(`   ⛽ GAS TOTAL: $${totalGasUsd.toFixed(4)}`);
    console.log(`   💵 PROFIT NETO: $${netProfitUsd.toFixed(4)}`);
    console.log(`   ⏱️  Tiempo: ${executionTime}ms`);
    console.log(`   🔗 TX: ${chain.explorer}/tx/${swap2Receipt.hash}`);
    console.log(`   ═══════════════════════════════════════════════════════\n`);
    
    activeTrades--;
    
    return {
      success: true,
      profitUsd: actualProfitUsd,
      gasUsd: totalGasUsd,
      netProfitUsd,
      txHash: swap2Receipt.hash,
      executionTimeMs: executionTime
    };
    
  } catch (e) {
    console.log(`   ❌ Error: ${e.message}`);
    activeTrades--;
    return { success: false, error: e.message };
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// LOOP PRINCIPAL SCALPER
// ═══════════════════════════════════════════════════════════════════════════════

async function scalperTick() {
  if (!state.isRunning) return;
  
  const tickStart = Date.now();
  state.stats.totalScans++;
  state.stats.uptime = Math.floor((Date.now() - state.startTime) / 1000);
  
  try {
    // ESCANEO PARALELO de todas las chains activas
    const activeChains = state.chains.filter(c => c.isActive).map(c => c.chain);
    
    let allOpportunities = [];
    
    if (SCALPER_CONFIG.PARALLEL_CHAIN_SCAN) {
      // Escanear todas las chains en paralelo
      const scanPromises = activeChains.map(chainKey => scalperScan(chainKey));
      const results = await Promise.all(scanPromises);
      allOpportunities = results.flat();
    } else {
      // Escanear secuencialmente (round-robin)
      const chainIndex = state.stats.totalScans % activeChains.length;
      const selectedChain = activeChains[chainIndex];
      allOpportunities = await scalperScan(selectedChain);
    }
    
    const scanTime = Date.now() - tickStart;
    scanTimes.push(scanTime);
    if (scanTimes.length > 100) scanTimes.shift();
    state.stats.avgScanTimeMs = Math.round(scanTimes.reduce((a, b) => a + b, 0) / scanTimes.length);
    state.stats.scansPerSecond = Math.round(1000 / state.stats.avgScanTimeMs * 10) / 10;
    
    if (allOpportunities.length > 0) {
      state.stats.opportunitiesFound += allOpportunities.length;
      
      // Ordenar por profit neto
      allOpportunities.sort((a, b) => b.netProfitUsd - a.netProfitUsd);
      
      // Guardar oportunidades para UI
      state.opportunities = [...allOpportunities.slice(0, 10), ...state.opportunities].slice(0, 50);
      state.stats.lastOpportunity = allOpportunities[0];
      
      const best = allOpportunities[0];
      
      console.log(`[SCAN #${state.stats.totalScans}] ${scanTime}ms | ${allOpportunities.length} opps | Best: $${best.netProfitUsd.toFixed(4)} on ${best.chainName}`);
      
      // EJECUTAR si no es dry run y auto-execute está activo
      if (!state.isDryRun && SCALPER_CONFIG.AUTO_EXECUTE && best.netProfitUsd >= SCALPER_CONFIG.MIN_PROFIT_USD) {
        state.stats.tradesAttempted++;
        
        const result = await executeScalp(best);
        
        if (result) {
          state.stats.tradesExecuted++;
          
          const tradeLog = {
            id: `scalp-${Date.now()}`,
            timestamp: Date.now(),
            chain: best.chain,
            chainName: best.chainName,
            type: 'SCALP',
            route: best.route,
            direction: best.direction,
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
          if (state.tradeLogs.length > 100) state.tradeLogs.pop();
          
          if (result.success) {
            state.stats.tradesSuccessful++;
            state.stats.totalProfitUsd += result.profitUsd;
            state.stats.totalGasUsd += result.gasUsd;
            state.stats.netProfitUsd = state.stats.totalProfitUsd - state.stats.totalGasUsd;
            state.stats.lastTrade = tradeLog;
            
            // Actualizar bandit
            const bandit = state.banditStates.find(b => b.chain === best.chain);
            if (bandit) {
              bandit.wins++;
              bandit.attempts++;
              bandit.alpha++;
              bandit.winRate = (bandit.wins / bandit.attempts) * 100;
              bandit.avgProfit = (bandit.avgProfit * (bandit.wins - 1) + result.netProfitUsd) / bandit.wins;
            }
            
            // Actualizar chain stats
            const chainState = state.chains.find(c => c.chain === best.chain);
            if (chainState) {
              chainState.tradesExecuted++;
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
      // Log periódico cuando no hay oportunidades
      if (state.stats.totalScans % 50 === 0) {
        console.log(`[SCAN #${state.stats.totalScans}] ${scanTime}ms | No profitable opportunities`);
      }
    }
    
    // Actualizar balances cada 100 scans
    if (state.stats.totalScans % 100 === 0) {
      await updateBalances();
    }
    
    // Actualizar chain stats
    for (const chainState of state.chains) {
      chainState.lastScan = Date.now();
      chainState.scansCompleted++;
    }
    
  } catch (e) {
    console.error(`[TICK] Error: ${e.message}`);
  }
}

async function updateBalances() {
  for (const chainState of state.chains) {
    try {
      const balance = await providers[chainState.chain].getBalance(WALLET_ADDRESS);
      const balanceEth = parseFloat(ethers.formatEther(balance));
      chainState.balance = balanceEth.toFixed(6);
      chainState.balanceUsd = balanceEth * SCALPER_CONFIG.ETH_PRICE_USD;
      chainState.isActive = balanceEth > 0.001;
    } catch (e) {
      // Error al obtener balance
    }
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
    return res.json({ success: false, error: 'Ya está corriendo', isRunning: true });
  }
  
  state.isDryRun = req.body?.dryRun === true;
  state.isRunning = true;
  state.startTime = Date.now();
  
  // Reset stats
  state.stats = {
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
    avgExecutionTimeMs: 0,
    scansPerSecond: 0,
    uptime: 0,
    currentChain: 'all',
    lastOpportunity: null,
    lastTrade: null
  };
  state.tradeLogs = [];
  state.opportunities = [];
  scanTimes = [];
  
  // Iniciar loop scalper
  if (timer) clearInterval(timer);
  timer = setInterval(scalperTick, SCALPER_CONFIG.SCAN_INTERVAL_MS);
  
  console.log(`\n[START] 🔥 SCALPER HTF iniciado - ${state.isDryRun ? 'DRY RUN' : '⚠️ MODO REAL'}`);
  console.log(`[CONFIG] Intervalo: ${SCALPER_CONFIG.SCAN_INTERVAL_MS}ms | Min profit: $${SCALPER_CONFIG.MIN_PROFIT_USD} | Parallel: ${SCALPER_CONFIG.PARALLEL_CHAIN_SCAN}`);
  
  res.json({
    success: true,
    isRunning: true,
    isDryRun: state.isDryRun,
    mode: 'SCALPER_HTF',
    config: SCALPER_CONFIG
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
    avgExecutionTimeMs: 0,
    scansPerSecond: 0,
    uptime: 0,
    currentChain: 'all',
    lastOpportunity: null,
    lastTrade: null
  };
  state.tradeLogs = [];
  state.opportunities = [];
  scanTimes = [];
  res.json({ success: true });
});

app.get('/api/defi/multichain-arb/health', (req, res) => {
  res.json({
    status: 'ok',
    mode: 'SCALPER_HTF',
    port: PORT,
    running: state.isRunning,
    dryRun: state.isDryRun,
    wallet: WALLET_ADDRESS,
    config: SCALPER_CONFIG,
    stats: {
      scansPerSecond: state.stats.scansPerSecond,
      opportunitiesFound: state.stats.opportunitiesFound,
      tradesExecuted: state.stats.tradesExecuted
    }
  });
});

app.get('/api/defi/multichain-arb/config', (req, res) => {
  res.json(SCALPER_CONFIG);
});

// ═══════════════════════════════════════════════════════════════════════════════
// INICIAR SERVIDOR
// ═══════════════════════════════════════════════════════════════════════════════

app.listen(PORT, async () => {
  console.log(`
╔═══════════════════════════════════════════════════════════════════════════════╗
║                                                                               ║
║   🔥 SCALPER HTF ARBITRAGE BOT                                                ║
║                                                                               ║
║   ✅ Puerto: ${PORT}                                                           ║
║   ✅ Wallet: ${WALLET_ADDRESS.slice(0, 10)}...${WALLET_ADDRESS.slice(-5)}                                  ║
║   ✅ Modo: SCALPER - Entrada/Salida Rápida                                    ║
║                                                                               ║
║   ⚡ Intervalo: ${SCALPER_CONFIG.SCAN_INTERVAL_MS}ms (${(1000/SCALPER_CONFIG.SCAN_INTERVAL_MS).toFixed(0)} scans/seg)                                ║
║   ⚡ Min Profit: $${SCALPER_CONFIG.MIN_PROFIT_USD}                                                ║
║   ⚡ Parallel Scan: ${SCALPER_CONFIG.PARALLEL_CHAIN_SCAN}                                             ║
║   ⚡ Auto Execute: ${SCALPER_CONFIG.AUTO_EXECUTE}                                              ║
║                                                                               ║
║   📊 Chains: Base, Arbitrum, Optimism                                         ║
║                                                                               ║
║   ⚠️  MODO SCALPER - Alta frecuencia de entrada/salida                        ║
║                                                                               ║
╚═══════════════════════════════════════════════════════════════════════════════╝
  `);
  
  await initConnections();
  await updateBalances();
  
  console.log('\n[READY] 🔥 Scalper listo. Usa POST /api/defi/multichain-arb/start para iniciar.\n');
});

process.on('SIGINT', () => {
  console.log('\n[EXIT] Cerrando scalper...');
  if (timer) clearInterval(timer);
  process.exit(0);
});



 * ═══════════════════════════════════════════════════════════════════════════════
 * 🔥 SCALPER HTF ARBITRAGE BOT - ENTRADA Y SALIDA ULTRA-RÁPIDA
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * Comportamiento SCALPER:
 * - Detecta oportunidad → ENTRA inmediatamente
 * - Ejecuta swap → SALE inmediatamente
 * - No mantiene posiciones
 * - Ciclo continuo de entrada/salida
 * - Escaneo paralelo de múltiples chains
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
// CONFIGURACIÓN SCALPER HTF
// ═══════════════════════════════════════════════════════════════════════════════

const SCALPER_CONFIG = {
  // VELOCIDAD
  SCAN_INTERVAL_MS: 200,           // 5 scans por segundo
  PARALLEL_CHAIN_SCAN: true,       // Escanear todas las chains simultáneamente
  
  // UMBRALES SCALPER
  MIN_PROFIT_USD: 0.005,           // $0.005 mínimo (muy bajo para capturar más)
  MIN_SPREAD_BPS: 1,               // 0.01% spread mínimo
  MAX_SLIPPAGE_BPS: 50,            // 0.5% slippage máximo
  
  // CANTIDADES (pequeñas para entrada/salida rápida)
  TRADE_AMOUNTS_ETH: [0.001, 0.002, 0.003, 0.005, 0.008, 0.01],
  
  // FEE TIERS
  FEE_TIERS: [100, 500, 3000, 10000],
  
  // EJECUCIÓN
  AUTO_EXECUTE: true,
  IMMEDIATE_EXIT: true,            // Salir inmediatamente después de entrar
  MAX_CONCURRENT_TRADES: 3,        // Máximo trades simultáneos
  
  // GAS
  GAS_MULTIPLIER: 1.2,             // Gas más bajo para velocidad
  MAX_GAS_GWEI: 5,                 // Máximo gas en gwei
  
  // PRECIO ETH
  ETH_PRICE_USD: 3500
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
      USDC: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
      USDbC: '0xd9aAEc86B65D86f6A7B5B1b0c42FFA531710b6CA'
    },
    quoter: '0x3d4e44Eb1374240CE5F1B871ab261CD16335B76a',
    router: '0x2626664c2603336E57B271c5C0b26F421741e481',
    priority: 1  // Más prioridad
  },
  arbitrum: {
    name: 'Arbitrum',
    chainId: 42161,
    rpc: 'https://arb1.arbitrum.io/rpc',
    explorer: 'https://arbiscan.io',
    tokens: {
      WETH: '0x82aF49447D8a07e3bd95BD0d56f35241523fBab1',
      USDC: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831',
      USDT: '0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9'
    },
    quoter: '0x61fFE014bA17989E743c5F6cB21bF9697530B21e',
    router: '0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45',
    priority: 2
  },
  optimism: {
    name: 'Optimism',
    chainId: 10,
    rpc: 'https://mainnet.optimism.io',
    explorer: 'https://optimistic.etherscan.io',
    tokens: {
      WETH: '0x4200000000000000000000000000000000000006',
      USDC: '0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85',
      USDT: '0x94b008aA00579c1307B0EF2c499aD98a8ce58e58'
    },
    quoter: '0x61fFE014bA17989E743c5F6cB21bF9697530B21e',
    router: '0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45',
    priority: 3
  }
};

// ABIs
const QUOTER_ABI = [
  'function quoteExactInputSingle((address tokenIn, address tokenOut, uint256 amountIn, uint24 fee, uint160 sqrtPriceLimitX96)) external returns (uint256 amountOut, uint160 sqrtPriceX96After, uint32 initializedTicksCrossed, uint256 gasEstimate)'
];

const ROUTER_ABI = [
  'function exactInputSingle((address tokenIn, address tokenOut, uint24 fee, address recipient, uint256 amountIn, uint256 amountOutMinimum, uint160 sqrtPriceLimitX96)) external payable returns (uint256 amountOut)',
  'function multicall(uint256 deadline, bytes[] calldata data) external payable returns (bytes[] memory results)',
  'function unwrapWETH9(uint256 amountMinimum, address recipient) external payable'
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
  'function allowance(address owner, address spender) view returns (uint256)',
  'function decimals() view returns (uint8)'
];

// ═══════════════════════════════════════════════════════════════════════════════
// ESTADO DEL SCALPER
// ═══════════════════════════════════════════════════════════════════════════════

let state = {
  isRunning: false,
  isDryRun: false,
  startTime: null,
  mode: 'SCALPER_HTF',
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
    avgExecutionTimeMs: 0,
    scansPerSecond: 0,
    uptime: 0,
    currentChain: 'all',
    lastOpportunity: null,
    lastTrade: null
  },
  chains: [],
  tradeLogs: [],
  opportunities: [],
  banditStates: [],
  activePositions: [],
  scanHistory: []
};

let timer = null;
let providers = {};
let signers = {};
let contracts = {};
let activeTrades = 0;
let scanTimes = [];

// ═══════════════════════════════════════════════════════════════════════════════
// INICIALIZAR CONEXIONES
// ═══════════════════════════════════════════════════════════════════════════════

async function initConnections() {
  console.log('[INIT] 🔌 Inicializando conexiones a chains...');
  
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
        balanceUsd: balanceEth * SCALPER_CONFIG.ETH_PRICE_USD,
        routes: SCALPER_CONFIG.FEE_TIERS.length * SCALPER_CONFIG.TRADE_AMOUNTS_ETH.length,
        isActive: balanceEth > 0.001,
        lastScan: Date.now(),
        scansCompleted: 0,
        opportunitiesFound: 0,
        tradesExecuted: 0,
        explorer: chain.explorer,
        priority: chain.priority
      });
      
      state.banditStates.push({
        chain: key,
        alpha: 2,
        beta: 2,
        winRate: 50,
        selected: key === 'base',
        attempts: 0,
        wins: 0,
        avgProfit: 0
      });
      
      console.log(`[INIT] ✅ ${chain.name}: ${balanceEth.toFixed(6)} ETH ($${(balanceEth * SCALPER_CONFIG.ETH_PRICE_USD).toFixed(2)})`);
    } catch (e) {
      console.error(`[INIT] ❌ ${chain.name}: ${e.message}`);
    }
  }
  
  // Ordenar chains por prioridad
  state.chains.sort((a, b) => CHAINS[a.chain].priority - CHAINS[b.chain].priority);
}

// ═══════════════════════════════════════════════════════════════════════════════
// ESCANEO SCALPER - PARALELO Y ULTRA-RÁPIDO
// ═══════════════════════════════════════════════════════════════════════════════

async function scalperScan(chainKey) {
  const chain = CHAINS[chainKey];
  const provider = providers[chainKey];
  const quoter = contracts[chainKey].quoter;
  const opportunities = [];
  
  try {
    // Obtener gas price actual
    const feeData = await provider.getFeeData();
    const gasPrice = feeData.gasPrice || ethers.parseUnits('0.001', 'gwei');
    const gasPriceGwei = parseFloat(ethers.formatUnits(gasPrice, 'gwei'));
    
    // Si gas muy alto, saltar
    if (gasPriceGwei > SCALPER_CONFIG.MAX_GAS_GWEI) {
      return [];
    }
    
    const gasCostWei = gasPrice * 250000n; // Estimado para swap completo
    const gasCostUsd = parseFloat(ethers.formatEther(gasCostWei)) * SCALPER_CONFIG.ETH_PRICE_USD;
    
    // Generar todas las combinaciones de quotes
    const quotePromises = [];
    
    for (const amountEth of SCALPER_CONFIG.TRADE_AMOUNTS_ETH) {
      const amountWei = ethers.parseEther(amountEth.toString());
      
      for (let i = 0; i < SCALPER_CONFIG.FEE_TIERS.length; i++) {
        for (let j = 0; j < SCALPER_CONFIG.FEE_TIERS.length; j++) {
          // Probar diferentes combinaciones de fee tiers
          const fee1 = SCALPER_CONFIG.FEE_TIERS[i];
          const fee2 = SCALPER_CONFIG.FEE_TIERS[j];
          
          quotePromises.push(
            (async () => {
              try {
                // ENTRADA: WETH → USDC
                const quote1 = await quoter.quoteExactInputSingle.staticCall({
                  tokenIn: chain.tokens.WETH,
                  tokenOut: chain.tokens.USDC,
                  amountIn: amountWei,
                  fee: fee1,
                  sqrtPriceLimitX96: 0n
                });
                const usdcOut = quote1[0];
                
                // SALIDA: USDC → WETH
                const quote2 = await quoter.quoteExactInputSingle.staticCall({
                  tokenIn: chain.tokens.USDC,
                  tokenOut: chain.tokens.WETH,
                  amountIn: usdcOut,
                  fee: fee2,
                  sqrtPriceLimitX96: 0n
                });
                const wethOut = quote2[0];
                
                // Calcular profit
                const grossProfit = wethOut - amountWei;
                const netProfit = grossProfit - gasCostWei;
                
                if (netProfit > 0n) {
                  const netProfitUsd = parseFloat(ethers.formatEther(netProfit)) * SCALPER_CONFIG.ETH_PRICE_USD;
                  const spreadBps = Number((grossProfit * 10000n) / amountWei);
                  
                  if (netProfitUsd >= SCALPER_CONFIG.MIN_PROFIT_USD && spreadBps >= SCALPER_CONFIG.MIN_SPREAD_BPS) {
                    return {
                      chain: chainKey,
                      chainName: chain.name,
                      type: 'SCALP',
                      direction: 'WETH→USDC→WETH',
                      route: `Fee ${fee1/100}%→${fee2/100}%`,
                      amountIn: amountWei,
                      amountInEth: amountEth,
                      fee1,
                      fee2,
                      usdcIntermediate: usdcOut,
                      wethOut,
                      grossProfit,
                      netProfit,
                      netProfitUsd,
                      gasCostUsd,
                      spreadBps,
                      timestamp: Date.now(),
                      gasPrice: gasPriceGwei,
                      confidence: Math.min(100, spreadBps * 10)
                    };
                  }
                }
              } catch (e) {
                // Pool no existe o error de quote
              }
              return null;
            })()
          );
        }
      }
    }
    
    // Ejecutar todos los quotes en paralelo
    const results = await Promise.all(quotePromises);
    opportunities.push(...results.filter(r => r !== null));
    
  } catch (e) {
    // Error general de scan
  }
  
  return opportunities;
}

// ═══════════════════════════════════════════════════════════════════════════════
// EJECUCIÓN SCALPER - ENTRADA Y SALIDA INMEDIATA
// ═══════════════════════════════════════════════════════════════════════════════

async function executeScalp(opp) {
  if (activeTrades >= SCALPER_CONFIG.MAX_CONCURRENT_TRADES) {
    console.log(`[SCALP] ⚠️ Máximo trades activos (${activeTrades}), esperando...`);
    return null;
  }
  
  activeTrades++;
  const startTime = Date.now();
  const chain = CHAINS[opp.chain];
  const signer = signers[opp.chain];
  const provider = providers[opp.chain];
  const { router, weth } = contracts[opp.chain];
  
  console.log(`\n🔥 [SCALP] ═══════════════════════════════════════════════════════`);
  console.log(`   Chain: ${chain.name}`);
  console.log(`   Route: ${opp.route}`);
  console.log(`   Amount: ${opp.amountInEth} ETH`);
  console.log(`   Expected Profit: $${opp.netProfitUsd.toFixed(4)}`);
  console.log(`   Spread: ${opp.spreadBps} bps`);
  console.log(`   Gas: ${opp.gasPrice.toFixed(2)} gwei`);
  
  try {
    // Verificar balance
    const balance = await provider.getBalance(WALLET_ADDRESS);
    if (balance < opp.amountIn + ethers.parseEther('0.001')) {
      console.log(`   ❌ Balance insuficiente`);
      activeTrades--;
      return { success: false, error: 'Balance insuficiente' };
    }
    
    // ═══════════════════════════════════════════════════════════════════════════
    // PASO 1: WRAP ETH → WETH
    // ═══════════════════════════════════════════════════════════════════════════
    console.log(`   📦 [1/4] Wrapping ETH → WETH...`);
    const wrapTx = await weth.deposit({ 
      value: opp.amountIn,
      gasLimit: 50000
    });
    const wrapReceipt = await wrapTx.wait(1);
    console.log(`   ✅ Wrap completado: ${wrapReceipt.hash.slice(0, 16)}...`);
    
    // ═══════════════════════════════════════════════════════════════════════════
    // PASO 2: APPROVE WETH (si es necesario)
    // ═══════════════════════════════════════════════════════════════════════════
    const wethAllowance = await weth.allowance(WALLET_ADDRESS, chain.router);
    if (wethAllowance < opp.amountIn) {
      console.log(`   🔓 [2/4] Approving WETH...`);
      const approveTx = await weth.approve(chain.router, ethers.MaxUint256, { gasLimit: 50000 });
      await approveTx.wait(1);
      console.log(`   ✅ WETH approved`);
    } else {
      console.log(`   ✅ [2/4] WETH ya aprobado`);
    }
    
    // ═══════════════════════════════════════════════════════════════════════════
    // PASO 3: ENTRADA - SWAP WETH → USDC
    // ═══════════════════════════════════════════════════════════════════════════
    console.log(`   🔄 [3/4] ENTRADA: WETH → USDC...`);
    const minUsdc = (opp.usdcIntermediate * BigInt(10000 - SCALPER_CONFIG.MAX_SLIPPAGE_BPS)) / 10000n;
    
    const swap1Tx = await router.exactInputSingle({
      tokenIn: chain.tokens.WETH,
      tokenOut: chain.tokens.USDC,
      fee: opp.fee1,
      recipient: WALLET_ADDRESS,
      amountIn: opp.amountIn,
      amountOutMinimum: minUsdc,
      sqrtPriceLimitX96: 0n
    }, { gasLimit: 300000 });
    
    const swap1Receipt = await swap1Tx.wait(1);
    console.log(`   ✅ ENTRADA completada: ${swap1Receipt.hash.slice(0, 16)}...`);
    
    // Obtener balance USDC real
    const usdc = new ethers.Contract(chain.tokens.USDC, ERC20_ABI, signer);
    const usdcBalance = await usdc.balanceOf(WALLET_ADDRESS);
    console.log(`   💵 USDC recibido: ${ethers.formatUnits(usdcBalance, 6)}`);
    
    // ═══════════════════════════════════════════════════════════════════════════
    // PASO 4: SALIDA INMEDIATA - SWAP USDC → WETH
    // ═══════════════════════════════════════════════════════════════════════════
    console.log(`   🔄 [4/4] SALIDA: USDC → WETH...`);
    
    // Approve USDC si es necesario
    const usdcAllowance = await usdc.allowance(WALLET_ADDRESS, chain.router);
    if (usdcAllowance < usdcBalance) {
      const approveUsdcTx = await usdc.approve(chain.router, ethers.MaxUint256, { gasLimit: 50000 });
      await approveUsdcTx.wait(1);
    }
    
    const minWeth = (opp.wethOut * BigInt(10000 - SCALPER_CONFIG.MAX_SLIPPAGE_BPS)) / 10000n;
    
    const swap2Tx = await router.exactInputSingle({
      tokenIn: chain.tokens.USDC,
      tokenOut: chain.tokens.WETH,
      fee: opp.fee2,
      recipient: WALLET_ADDRESS,
      amountIn: usdcBalance,
      amountOutMinimum: minWeth,
      sqrtPriceLimitX96: 0n
    }, { gasLimit: 300000 });
    
    const swap2Receipt = await swap2Tx.wait(1);
    console.log(`   ✅ SALIDA completada: ${swap2Receipt.hash.slice(0, 16)}...`);
    
    // ═══════════════════════════════════════════════════════════════════════════
    // CALCULAR PROFIT REAL
    // ═══════════════════════════════════════════════════════════════════════════
    const finalWethBalance = await weth.balanceOf(WALLET_ADDRESS);
    const actualProfit = finalWethBalance - opp.amountIn;
    const actualProfitUsd = parseFloat(ethers.formatEther(actualProfit)) * SCALPER_CONFIG.ETH_PRICE_USD;
    
    // Calcular gas usado
    const gas1 = swap1Receipt.gasUsed * swap1Receipt.gasPrice;
    const gas2 = swap2Receipt.gasUsed * swap2Receipt.gasPrice;
    const totalGasWei = gas1 + gas2 + wrapReceipt.gasUsed * wrapReceipt.gasPrice;
    const totalGasUsd = parseFloat(ethers.formatEther(totalGasWei)) * SCALPER_CONFIG.ETH_PRICE_USD;
    
    const netProfitUsd = actualProfitUsd - totalGasUsd;
    const executionTime = Date.now() - startTime;
    
    console.log(`   ═══════════════════════════════════════════════════════`);
    console.log(`   💰 PROFIT BRUTO: $${actualProfitUsd.toFixed(4)}`);
    console.log(`   ⛽ GAS TOTAL: $${totalGasUsd.toFixed(4)}`);
    console.log(`   💵 PROFIT NETO: $${netProfitUsd.toFixed(4)}`);
    console.log(`   ⏱️  Tiempo: ${executionTime}ms`);
    console.log(`   🔗 TX: ${chain.explorer}/tx/${swap2Receipt.hash}`);
    console.log(`   ═══════════════════════════════════════════════════════\n`);
    
    activeTrades--;
    
    return {
      success: true,
      profitUsd: actualProfitUsd,
      gasUsd: totalGasUsd,
      netProfitUsd,
      txHash: swap2Receipt.hash,
      executionTimeMs: executionTime
    };
    
  } catch (e) {
    console.log(`   ❌ Error: ${e.message}`);
    activeTrades--;
    return { success: false, error: e.message };
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// LOOP PRINCIPAL SCALPER
// ═══════════════════════════════════════════════════════════════════════════════

async function scalperTick() {
  if (!state.isRunning) return;
  
  const tickStart = Date.now();
  state.stats.totalScans++;
  state.stats.uptime = Math.floor((Date.now() - state.startTime) / 1000);
  
  try {
    // ESCANEO PARALELO de todas las chains activas
    const activeChains = state.chains.filter(c => c.isActive).map(c => c.chain);
    
    let allOpportunities = [];
    
    if (SCALPER_CONFIG.PARALLEL_CHAIN_SCAN) {
      // Escanear todas las chains en paralelo
      const scanPromises = activeChains.map(chainKey => scalperScan(chainKey));
      const results = await Promise.all(scanPromises);
      allOpportunities = results.flat();
    } else {
      // Escanear secuencialmente (round-robin)
      const chainIndex = state.stats.totalScans % activeChains.length;
      const selectedChain = activeChains[chainIndex];
      allOpportunities = await scalperScan(selectedChain);
    }
    
    const scanTime = Date.now() - tickStart;
    scanTimes.push(scanTime);
    if (scanTimes.length > 100) scanTimes.shift();
    state.stats.avgScanTimeMs = Math.round(scanTimes.reduce((a, b) => a + b, 0) / scanTimes.length);
    state.stats.scansPerSecond = Math.round(1000 / state.stats.avgScanTimeMs * 10) / 10;
    
    if (allOpportunities.length > 0) {
      state.stats.opportunitiesFound += allOpportunities.length;
      
      // Ordenar por profit neto
      allOpportunities.sort((a, b) => b.netProfitUsd - a.netProfitUsd);
      
      // Guardar oportunidades para UI
      state.opportunities = [...allOpportunities.slice(0, 10), ...state.opportunities].slice(0, 50);
      state.stats.lastOpportunity = allOpportunities[0];
      
      const best = allOpportunities[0];
      
      console.log(`[SCAN #${state.stats.totalScans}] ${scanTime}ms | ${allOpportunities.length} opps | Best: $${best.netProfitUsd.toFixed(4)} on ${best.chainName}`);
      
      // EJECUTAR si no es dry run y auto-execute está activo
      if (!state.isDryRun && SCALPER_CONFIG.AUTO_EXECUTE && best.netProfitUsd >= SCALPER_CONFIG.MIN_PROFIT_USD) {
        state.stats.tradesAttempted++;
        
        const result = await executeScalp(best);
        
        if (result) {
          state.stats.tradesExecuted++;
          
          const tradeLog = {
            id: `scalp-${Date.now()}`,
            timestamp: Date.now(),
            chain: best.chain,
            chainName: best.chainName,
            type: 'SCALP',
            route: best.route,
            direction: best.direction,
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
          if (state.tradeLogs.length > 100) state.tradeLogs.pop();
          
          if (result.success) {
            state.stats.tradesSuccessful++;
            state.stats.totalProfitUsd += result.profitUsd;
            state.stats.totalGasUsd += result.gasUsd;
            state.stats.netProfitUsd = state.stats.totalProfitUsd - state.stats.totalGasUsd;
            state.stats.lastTrade = tradeLog;
            
            // Actualizar bandit
            const bandit = state.banditStates.find(b => b.chain === best.chain);
            if (bandit) {
              bandit.wins++;
              bandit.attempts++;
              bandit.alpha++;
              bandit.winRate = (bandit.wins / bandit.attempts) * 100;
              bandit.avgProfit = (bandit.avgProfit * (bandit.wins - 1) + result.netProfitUsd) / bandit.wins;
            }
            
            // Actualizar chain stats
            const chainState = state.chains.find(c => c.chain === best.chain);
            if (chainState) {
              chainState.tradesExecuted++;
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
      // Log periódico cuando no hay oportunidades
      if (state.stats.totalScans % 50 === 0) {
        console.log(`[SCAN #${state.stats.totalScans}] ${scanTime}ms | No profitable opportunities`);
      }
    }
    
    // Actualizar balances cada 100 scans
    if (state.stats.totalScans % 100 === 0) {
      await updateBalances();
    }
    
    // Actualizar chain stats
    for (const chainState of state.chains) {
      chainState.lastScan = Date.now();
      chainState.scansCompleted++;
    }
    
  } catch (e) {
    console.error(`[TICK] Error: ${e.message}`);
  }
}

async function updateBalances() {
  for (const chainState of state.chains) {
    try {
      const balance = await providers[chainState.chain].getBalance(WALLET_ADDRESS);
      const balanceEth = parseFloat(ethers.formatEther(balance));
      chainState.balance = balanceEth.toFixed(6);
      chainState.balanceUsd = balanceEth * SCALPER_CONFIG.ETH_PRICE_USD;
      chainState.isActive = balanceEth > 0.001;
    } catch (e) {
      // Error al obtener balance
    }
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
    return res.json({ success: false, error: 'Ya está corriendo', isRunning: true });
  }
  
  state.isDryRun = req.body?.dryRun === true;
  state.isRunning = true;
  state.startTime = Date.now();
  
  // Reset stats
  state.stats = {
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
    avgExecutionTimeMs: 0,
    scansPerSecond: 0,
    uptime: 0,
    currentChain: 'all',
    lastOpportunity: null,
    lastTrade: null
  };
  state.tradeLogs = [];
  state.opportunities = [];
  scanTimes = [];
  
  // Iniciar loop scalper
  if (timer) clearInterval(timer);
  timer = setInterval(scalperTick, SCALPER_CONFIG.SCAN_INTERVAL_MS);
  
  console.log(`\n[START] 🔥 SCALPER HTF iniciado - ${state.isDryRun ? 'DRY RUN' : '⚠️ MODO REAL'}`);
  console.log(`[CONFIG] Intervalo: ${SCALPER_CONFIG.SCAN_INTERVAL_MS}ms | Min profit: $${SCALPER_CONFIG.MIN_PROFIT_USD} | Parallel: ${SCALPER_CONFIG.PARALLEL_CHAIN_SCAN}`);
  
  res.json({
    success: true,
    isRunning: true,
    isDryRun: state.isDryRun,
    mode: 'SCALPER_HTF',
    config: SCALPER_CONFIG
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
    avgExecutionTimeMs: 0,
    scansPerSecond: 0,
    uptime: 0,
    currentChain: 'all',
    lastOpportunity: null,
    lastTrade: null
  };
  state.tradeLogs = [];
  state.opportunities = [];
  scanTimes = [];
  res.json({ success: true });
});

app.get('/api/defi/multichain-arb/health', (req, res) => {
  res.json({
    status: 'ok',
    mode: 'SCALPER_HTF',
    port: PORT,
    running: state.isRunning,
    dryRun: state.isDryRun,
    wallet: WALLET_ADDRESS,
    config: SCALPER_CONFIG,
    stats: {
      scansPerSecond: state.stats.scansPerSecond,
      opportunitiesFound: state.stats.opportunitiesFound,
      tradesExecuted: state.stats.tradesExecuted
    }
  });
});

app.get('/api/defi/multichain-arb/config', (req, res) => {
  res.json(SCALPER_CONFIG);
});

// ═══════════════════════════════════════════════════════════════════════════════
// INICIAR SERVIDOR
// ═══════════════════════════════════════════════════════════════════════════════

app.listen(PORT, async () => {
  console.log(`
╔═══════════════════════════════════════════════════════════════════════════════╗
║                                                                               ║
║   🔥 SCALPER HTF ARBITRAGE BOT                                                ║
║                                                                               ║
║   ✅ Puerto: ${PORT}                                                           ║
║   ✅ Wallet: ${WALLET_ADDRESS.slice(0, 10)}...${WALLET_ADDRESS.slice(-5)}                                  ║
║   ✅ Modo: SCALPER - Entrada/Salida Rápida                                    ║
║                                                                               ║
║   ⚡ Intervalo: ${SCALPER_CONFIG.SCAN_INTERVAL_MS}ms (${(1000/SCALPER_CONFIG.SCAN_INTERVAL_MS).toFixed(0)} scans/seg)                                ║
║   ⚡ Min Profit: $${SCALPER_CONFIG.MIN_PROFIT_USD}                                                ║
║   ⚡ Parallel Scan: ${SCALPER_CONFIG.PARALLEL_CHAIN_SCAN}                                             ║
║   ⚡ Auto Execute: ${SCALPER_CONFIG.AUTO_EXECUTE}                                              ║
║                                                                               ║
║   📊 Chains: Base, Arbitrum, Optimism                                         ║
║                                                                               ║
║   ⚠️  MODO SCALPER - Alta frecuencia de entrada/salida                        ║
║                                                                               ║
╚═══════════════════════════════════════════════════════════════════════════════╝
  `);
  
  await initConnections();
  await updateBalances();
  
  console.log('\n[READY] 🔥 Scalper listo. Usa POST /api/defi/multichain-arb/start para iniciar.\n');
});

process.on('SIGINT', () => {
  console.log('\n[EXIT] Cerrando scalper...');
  if (timer) clearInterval(timer);
  process.exit(0);
});


 * ═══════════════════════════════════════════════════════════════════════════════
 * 🔥 SCALPER HTF ARBITRAGE BOT - ENTRADA Y SALIDA ULTRA-RÁPIDA
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * Comportamiento SCALPER:
 * - Detecta oportunidad → ENTRA inmediatamente
 * - Ejecuta swap → SALE inmediatamente
 * - No mantiene posiciones
 * - Ciclo continuo de entrada/salida
 * - Escaneo paralelo de múltiples chains
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
// CONFIGURACIÓN SCALPER HTF
// ═══════════════════════════════════════════════════════════════════════════════

const SCALPER_CONFIG = {
  // VELOCIDAD
  SCAN_INTERVAL_MS: 200,           // 5 scans por segundo
  PARALLEL_CHAIN_SCAN: true,       // Escanear todas las chains simultáneamente
  
  // UMBRALES SCALPER
  MIN_PROFIT_USD: 0.005,           // $0.005 mínimo (muy bajo para capturar más)
  MIN_SPREAD_BPS: 1,               // 0.01% spread mínimo
  MAX_SLIPPAGE_BPS: 50,            // 0.5% slippage máximo
  
  // CANTIDADES (pequeñas para entrada/salida rápida)
  TRADE_AMOUNTS_ETH: [0.001, 0.002, 0.003, 0.005, 0.008, 0.01],
  
  // FEE TIERS
  FEE_TIERS: [100, 500, 3000, 10000],
  
  // EJECUCIÓN
  AUTO_EXECUTE: true,
  IMMEDIATE_EXIT: true,            // Salir inmediatamente después de entrar
  MAX_CONCURRENT_TRADES: 3,        // Máximo trades simultáneos
  
  // GAS
  GAS_MULTIPLIER: 1.2,             // Gas más bajo para velocidad
  MAX_GAS_GWEI: 5,                 // Máximo gas en gwei
  
  // PRECIO ETH
  ETH_PRICE_USD: 3500
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
      USDC: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
      USDbC: '0xd9aAEc86B65D86f6A7B5B1b0c42FFA531710b6CA'
    },
    quoter: '0x3d4e44Eb1374240CE5F1B871ab261CD16335B76a',
    router: '0x2626664c2603336E57B271c5C0b26F421741e481',
    priority: 1  // Más prioridad
  },
  arbitrum: {
    name: 'Arbitrum',
    chainId: 42161,
    rpc: 'https://arb1.arbitrum.io/rpc',
    explorer: 'https://arbiscan.io',
    tokens: {
      WETH: '0x82aF49447D8a07e3bd95BD0d56f35241523fBab1',
      USDC: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831',
      USDT: '0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9'
    },
    quoter: '0x61fFE014bA17989E743c5F6cB21bF9697530B21e',
    router: '0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45',
    priority: 2
  },
  optimism: {
    name: 'Optimism',
    chainId: 10,
    rpc: 'https://mainnet.optimism.io',
    explorer: 'https://optimistic.etherscan.io',
    tokens: {
      WETH: '0x4200000000000000000000000000000000000006',
      USDC: '0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85',
      USDT: '0x94b008aA00579c1307B0EF2c499aD98a8ce58e58'
    },
    quoter: '0x61fFE014bA17989E743c5F6cB21bF9697530B21e',
    router: '0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45',
    priority: 3
  }
};

// ABIs
const QUOTER_ABI = [
  'function quoteExactInputSingle((address tokenIn, address tokenOut, uint256 amountIn, uint24 fee, uint160 sqrtPriceLimitX96)) external returns (uint256 amountOut, uint160 sqrtPriceX96After, uint32 initializedTicksCrossed, uint256 gasEstimate)'
];

const ROUTER_ABI = [
  'function exactInputSingle((address tokenIn, address tokenOut, uint24 fee, address recipient, uint256 amountIn, uint256 amountOutMinimum, uint160 sqrtPriceLimitX96)) external payable returns (uint256 amountOut)',
  'function multicall(uint256 deadline, bytes[] calldata data) external payable returns (bytes[] memory results)',
  'function unwrapWETH9(uint256 amountMinimum, address recipient) external payable'
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
  'function allowance(address owner, address spender) view returns (uint256)',
  'function decimals() view returns (uint8)'
];

// ═══════════════════════════════════════════════════════════════════════════════
// ESTADO DEL SCALPER
// ═══════════════════════════════════════════════════════════════════════════════

let state = {
  isRunning: false,
  isDryRun: false,
  startTime: null,
  mode: 'SCALPER_HTF',
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
    avgExecutionTimeMs: 0,
    scansPerSecond: 0,
    uptime: 0,
    currentChain: 'all',
    lastOpportunity: null,
    lastTrade: null
  },
  chains: [],
  tradeLogs: [],
  opportunities: [],
  banditStates: [],
  activePositions: [],
  scanHistory: []
};

let timer = null;
let providers = {};
let signers = {};
let contracts = {};
let activeTrades = 0;
let scanTimes = [];

// ═══════════════════════════════════════════════════════════════════════════════
// INICIALIZAR CONEXIONES
// ═══════════════════════════════════════════════════════════════════════════════

async function initConnections() {
  console.log('[INIT] 🔌 Inicializando conexiones a chains...');
  
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
        balanceUsd: balanceEth * SCALPER_CONFIG.ETH_PRICE_USD,
        routes: SCALPER_CONFIG.FEE_TIERS.length * SCALPER_CONFIG.TRADE_AMOUNTS_ETH.length,
        isActive: balanceEth > 0.001,
        lastScan: Date.now(),
        scansCompleted: 0,
        opportunitiesFound: 0,
        tradesExecuted: 0,
        explorer: chain.explorer,
        priority: chain.priority
      });
      
      state.banditStates.push({
        chain: key,
        alpha: 2,
        beta: 2,
        winRate: 50,
        selected: key === 'base',
        attempts: 0,
        wins: 0,
        avgProfit: 0
      });
      
      console.log(`[INIT] ✅ ${chain.name}: ${balanceEth.toFixed(6)} ETH ($${(balanceEth * SCALPER_CONFIG.ETH_PRICE_USD).toFixed(2)})`);
    } catch (e) {
      console.error(`[INIT] ❌ ${chain.name}: ${e.message}`);
    }
  }
  
  // Ordenar chains por prioridad
  state.chains.sort((a, b) => CHAINS[a.chain].priority - CHAINS[b.chain].priority);
}

// ═══════════════════════════════════════════════════════════════════════════════
// ESCANEO SCALPER - PARALELO Y ULTRA-RÁPIDO
// ═══════════════════════════════════════════════════════════════════════════════

async function scalperScan(chainKey) {
  const chain = CHAINS[chainKey];
  const provider = providers[chainKey];
  const quoter = contracts[chainKey].quoter;
  const opportunities = [];
  
  try {
    // Obtener gas price actual
    const feeData = await provider.getFeeData();
    const gasPrice = feeData.gasPrice || ethers.parseUnits('0.001', 'gwei');
    const gasPriceGwei = parseFloat(ethers.formatUnits(gasPrice, 'gwei'));
    
    // Si gas muy alto, saltar
    if (gasPriceGwei > SCALPER_CONFIG.MAX_GAS_GWEI) {
      return [];
    }
    
    const gasCostWei = gasPrice * 250000n; // Estimado para swap completo
    const gasCostUsd = parseFloat(ethers.formatEther(gasCostWei)) * SCALPER_CONFIG.ETH_PRICE_USD;
    
    // Generar todas las combinaciones de quotes
    const quotePromises = [];
    
    for (const amountEth of SCALPER_CONFIG.TRADE_AMOUNTS_ETH) {
      const amountWei = ethers.parseEther(amountEth.toString());
      
      for (let i = 0; i < SCALPER_CONFIG.FEE_TIERS.length; i++) {
        for (let j = 0; j < SCALPER_CONFIG.FEE_TIERS.length; j++) {
          // Probar diferentes combinaciones de fee tiers
          const fee1 = SCALPER_CONFIG.FEE_TIERS[i];
          const fee2 = SCALPER_CONFIG.FEE_TIERS[j];
          
          quotePromises.push(
            (async () => {
              try {
                // ENTRADA: WETH → USDC
                const quote1 = await quoter.quoteExactInputSingle.staticCall({
                  tokenIn: chain.tokens.WETH,
                  tokenOut: chain.tokens.USDC,
                  amountIn: amountWei,
                  fee: fee1,
                  sqrtPriceLimitX96: 0n
                });
                const usdcOut = quote1[0];
                
                // SALIDA: USDC → WETH
                const quote2 = await quoter.quoteExactInputSingle.staticCall({
                  tokenIn: chain.tokens.USDC,
                  tokenOut: chain.tokens.WETH,
                  amountIn: usdcOut,
                  fee: fee2,
                  sqrtPriceLimitX96: 0n
                });
                const wethOut = quote2[0];
                
                // Calcular profit
                const grossProfit = wethOut - amountWei;
                const netProfit = grossProfit - gasCostWei;
                
                if (netProfit > 0n) {
                  const netProfitUsd = parseFloat(ethers.formatEther(netProfit)) * SCALPER_CONFIG.ETH_PRICE_USD;
                  const spreadBps = Number((grossProfit * 10000n) / amountWei);
                  
                  if (netProfitUsd >= SCALPER_CONFIG.MIN_PROFIT_USD && spreadBps >= SCALPER_CONFIG.MIN_SPREAD_BPS) {
                    return {
                      chain: chainKey,
                      chainName: chain.name,
                      type: 'SCALP',
                      direction: 'WETH→USDC→WETH',
                      route: `Fee ${fee1/100}%→${fee2/100}%`,
                      amountIn: amountWei,
                      amountInEth: amountEth,
                      fee1,
                      fee2,
                      usdcIntermediate: usdcOut,
                      wethOut,
                      grossProfit,
                      netProfit,
                      netProfitUsd,
                      gasCostUsd,
                      spreadBps,
                      timestamp: Date.now(),
                      gasPrice: gasPriceGwei,
                      confidence: Math.min(100, spreadBps * 10)
                    };
                  }
                }
              } catch (e) {
                // Pool no existe o error de quote
              }
              return null;
            })()
          );
        }
      }
    }
    
    // Ejecutar todos los quotes en paralelo
    const results = await Promise.all(quotePromises);
    opportunities.push(...results.filter(r => r !== null));
    
  } catch (e) {
    // Error general de scan
  }
  
  return opportunities;
}

// ═══════════════════════════════════════════════════════════════════════════════
// EJECUCIÓN SCALPER - ENTRADA Y SALIDA INMEDIATA
// ═══════════════════════════════════════════════════════════════════════════════

async function executeScalp(opp) {
  if (activeTrades >= SCALPER_CONFIG.MAX_CONCURRENT_TRADES) {
    console.log(`[SCALP] ⚠️ Máximo trades activos (${activeTrades}), esperando...`);
    return null;
  }
  
  activeTrades++;
  const startTime = Date.now();
  const chain = CHAINS[opp.chain];
  const signer = signers[opp.chain];
  const provider = providers[opp.chain];
  const { router, weth } = contracts[opp.chain];
  
  console.log(`\n🔥 [SCALP] ═══════════════════════════════════════════════════════`);
  console.log(`   Chain: ${chain.name}`);
  console.log(`   Route: ${opp.route}`);
  console.log(`   Amount: ${opp.amountInEth} ETH`);
  console.log(`   Expected Profit: $${opp.netProfitUsd.toFixed(4)}`);
  console.log(`   Spread: ${opp.spreadBps} bps`);
  console.log(`   Gas: ${opp.gasPrice.toFixed(2)} gwei`);
  
  try {
    // Verificar balance
    const balance = await provider.getBalance(WALLET_ADDRESS);
    if (balance < opp.amountIn + ethers.parseEther('0.001')) {
      console.log(`   ❌ Balance insuficiente`);
      activeTrades--;
      return { success: false, error: 'Balance insuficiente' };
    }
    
    // ═══════════════════════════════════════════════════════════════════════════
    // PASO 1: WRAP ETH → WETH
    // ═══════════════════════════════════════════════════════════════════════════
    console.log(`   📦 [1/4] Wrapping ETH → WETH...`);
    const wrapTx = await weth.deposit({ 
      value: opp.amountIn,
      gasLimit: 50000
    });
    const wrapReceipt = await wrapTx.wait(1);
    console.log(`   ✅ Wrap completado: ${wrapReceipt.hash.slice(0, 16)}...`);
    
    // ═══════════════════════════════════════════════════════════════════════════
    // PASO 2: APPROVE WETH (si es necesario)
    // ═══════════════════════════════════════════════════════════════════════════
    const wethAllowance = await weth.allowance(WALLET_ADDRESS, chain.router);
    if (wethAllowance < opp.amountIn) {
      console.log(`   🔓 [2/4] Approving WETH...`);
      const approveTx = await weth.approve(chain.router, ethers.MaxUint256, { gasLimit: 50000 });
      await approveTx.wait(1);
      console.log(`   ✅ WETH approved`);
    } else {
      console.log(`   ✅ [2/4] WETH ya aprobado`);
    }
    
    // ═══════════════════════════════════════════════════════════════════════════
    // PASO 3: ENTRADA - SWAP WETH → USDC
    // ═══════════════════════════════════════════════════════════════════════════
    console.log(`   🔄 [3/4] ENTRADA: WETH → USDC...`);
    const minUsdc = (opp.usdcIntermediate * BigInt(10000 - SCALPER_CONFIG.MAX_SLIPPAGE_BPS)) / 10000n;
    
    const swap1Tx = await router.exactInputSingle({
      tokenIn: chain.tokens.WETH,
      tokenOut: chain.tokens.USDC,
      fee: opp.fee1,
      recipient: WALLET_ADDRESS,
      amountIn: opp.amountIn,
      amountOutMinimum: minUsdc,
      sqrtPriceLimitX96: 0n
    }, { gasLimit: 300000 });
    
    const swap1Receipt = await swap1Tx.wait(1);
    console.log(`   ✅ ENTRADA completada: ${swap1Receipt.hash.slice(0, 16)}...`);
    
    // Obtener balance USDC real
    const usdc = new ethers.Contract(chain.tokens.USDC, ERC20_ABI, signer);
    const usdcBalance = await usdc.balanceOf(WALLET_ADDRESS);
    console.log(`   💵 USDC recibido: ${ethers.formatUnits(usdcBalance, 6)}`);
    
    // ═══════════════════════════════════════════════════════════════════════════
    // PASO 4: SALIDA INMEDIATA - SWAP USDC → WETH
    // ═══════════════════════════════════════════════════════════════════════════
    console.log(`   🔄 [4/4] SALIDA: USDC → WETH...`);
    
    // Approve USDC si es necesario
    const usdcAllowance = await usdc.allowance(WALLET_ADDRESS, chain.router);
    if (usdcAllowance < usdcBalance) {
      const approveUsdcTx = await usdc.approve(chain.router, ethers.MaxUint256, { gasLimit: 50000 });
      await approveUsdcTx.wait(1);
    }
    
    const minWeth = (opp.wethOut * BigInt(10000 - SCALPER_CONFIG.MAX_SLIPPAGE_BPS)) / 10000n;
    
    const swap2Tx = await router.exactInputSingle({
      tokenIn: chain.tokens.USDC,
      tokenOut: chain.tokens.WETH,
      fee: opp.fee2,
      recipient: WALLET_ADDRESS,
      amountIn: usdcBalance,
      amountOutMinimum: minWeth,
      sqrtPriceLimitX96: 0n
    }, { gasLimit: 300000 });
    
    const swap2Receipt = await swap2Tx.wait(1);
    console.log(`   ✅ SALIDA completada: ${swap2Receipt.hash.slice(0, 16)}...`);
    
    // ═══════════════════════════════════════════════════════════════════════════
    // CALCULAR PROFIT REAL
    // ═══════════════════════════════════════════════════════════════════════════
    const finalWethBalance = await weth.balanceOf(WALLET_ADDRESS);
    const actualProfit = finalWethBalance - opp.amountIn;
    const actualProfitUsd = parseFloat(ethers.formatEther(actualProfit)) * SCALPER_CONFIG.ETH_PRICE_USD;
    
    // Calcular gas usado
    const gas1 = swap1Receipt.gasUsed * swap1Receipt.gasPrice;
    const gas2 = swap2Receipt.gasUsed * swap2Receipt.gasPrice;
    const totalGasWei = gas1 + gas2 + wrapReceipt.gasUsed * wrapReceipt.gasPrice;
    const totalGasUsd = parseFloat(ethers.formatEther(totalGasWei)) * SCALPER_CONFIG.ETH_PRICE_USD;
    
    const netProfitUsd = actualProfitUsd - totalGasUsd;
    const executionTime = Date.now() - startTime;
    
    console.log(`   ═══════════════════════════════════════════════════════`);
    console.log(`   💰 PROFIT BRUTO: $${actualProfitUsd.toFixed(4)}`);
    console.log(`   ⛽ GAS TOTAL: $${totalGasUsd.toFixed(4)}`);
    console.log(`   💵 PROFIT NETO: $${netProfitUsd.toFixed(4)}`);
    console.log(`   ⏱️  Tiempo: ${executionTime}ms`);
    console.log(`   🔗 TX: ${chain.explorer}/tx/${swap2Receipt.hash}`);
    console.log(`   ═══════════════════════════════════════════════════════\n`);
    
    activeTrades--;
    
    return {
      success: true,
      profitUsd: actualProfitUsd,
      gasUsd: totalGasUsd,
      netProfitUsd,
      txHash: swap2Receipt.hash,
      executionTimeMs: executionTime
    };
    
  } catch (e) {
    console.log(`   ❌ Error: ${e.message}`);
    activeTrades--;
    return { success: false, error: e.message };
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// LOOP PRINCIPAL SCALPER
// ═══════════════════════════════════════════════════════════════════════════════

async function scalperTick() {
  if (!state.isRunning) return;
  
  const tickStart = Date.now();
  state.stats.totalScans++;
  state.stats.uptime = Math.floor((Date.now() - state.startTime) / 1000);
  
  try {
    // ESCANEO PARALELO de todas las chains activas
    const activeChains = state.chains.filter(c => c.isActive).map(c => c.chain);
    
    let allOpportunities = [];
    
    if (SCALPER_CONFIG.PARALLEL_CHAIN_SCAN) {
      // Escanear todas las chains en paralelo
      const scanPromises = activeChains.map(chainKey => scalperScan(chainKey));
      const results = await Promise.all(scanPromises);
      allOpportunities = results.flat();
    } else {
      // Escanear secuencialmente (round-robin)
      const chainIndex = state.stats.totalScans % activeChains.length;
      const selectedChain = activeChains[chainIndex];
      allOpportunities = await scalperScan(selectedChain);
    }
    
    const scanTime = Date.now() - tickStart;
    scanTimes.push(scanTime);
    if (scanTimes.length > 100) scanTimes.shift();
    state.stats.avgScanTimeMs = Math.round(scanTimes.reduce((a, b) => a + b, 0) / scanTimes.length);
    state.stats.scansPerSecond = Math.round(1000 / state.stats.avgScanTimeMs * 10) / 10;
    
    if (allOpportunities.length > 0) {
      state.stats.opportunitiesFound += allOpportunities.length;
      
      // Ordenar por profit neto
      allOpportunities.sort((a, b) => b.netProfitUsd - a.netProfitUsd);
      
      // Guardar oportunidades para UI
      state.opportunities = [...allOpportunities.slice(0, 10), ...state.opportunities].slice(0, 50);
      state.stats.lastOpportunity = allOpportunities[0];
      
      const best = allOpportunities[0];
      
      console.log(`[SCAN #${state.stats.totalScans}] ${scanTime}ms | ${allOpportunities.length} opps | Best: $${best.netProfitUsd.toFixed(4)} on ${best.chainName}`);
      
      // EJECUTAR si no es dry run y auto-execute está activo
      if (!state.isDryRun && SCALPER_CONFIG.AUTO_EXECUTE && best.netProfitUsd >= SCALPER_CONFIG.MIN_PROFIT_USD) {
        state.stats.tradesAttempted++;
        
        const result = await executeScalp(best);
        
        if (result) {
          state.stats.tradesExecuted++;
          
          const tradeLog = {
            id: `scalp-${Date.now()}`,
            timestamp: Date.now(),
            chain: best.chain,
            chainName: best.chainName,
            type: 'SCALP',
            route: best.route,
            direction: best.direction,
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
          if (state.tradeLogs.length > 100) state.tradeLogs.pop();
          
          if (result.success) {
            state.stats.tradesSuccessful++;
            state.stats.totalProfitUsd += result.profitUsd;
            state.stats.totalGasUsd += result.gasUsd;
            state.stats.netProfitUsd = state.stats.totalProfitUsd - state.stats.totalGasUsd;
            state.stats.lastTrade = tradeLog;
            
            // Actualizar bandit
            const bandit = state.banditStates.find(b => b.chain === best.chain);
            if (bandit) {
              bandit.wins++;
              bandit.attempts++;
              bandit.alpha++;
              bandit.winRate = (bandit.wins / bandit.attempts) * 100;
              bandit.avgProfit = (bandit.avgProfit * (bandit.wins - 1) + result.netProfitUsd) / bandit.wins;
            }
            
            // Actualizar chain stats
            const chainState = state.chains.find(c => c.chain === best.chain);
            if (chainState) {
              chainState.tradesExecuted++;
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
      // Log periódico cuando no hay oportunidades
      if (state.stats.totalScans % 50 === 0) {
        console.log(`[SCAN #${state.stats.totalScans}] ${scanTime}ms | No profitable opportunities`);
      }
    }
    
    // Actualizar balances cada 100 scans
    if (state.stats.totalScans % 100 === 0) {
      await updateBalances();
    }
    
    // Actualizar chain stats
    for (const chainState of state.chains) {
      chainState.lastScan = Date.now();
      chainState.scansCompleted++;
    }
    
  } catch (e) {
    console.error(`[TICK] Error: ${e.message}`);
  }
}

async function updateBalances() {
  for (const chainState of state.chains) {
    try {
      const balance = await providers[chainState.chain].getBalance(WALLET_ADDRESS);
      const balanceEth = parseFloat(ethers.formatEther(balance));
      chainState.balance = balanceEth.toFixed(6);
      chainState.balanceUsd = balanceEth * SCALPER_CONFIG.ETH_PRICE_USD;
      chainState.isActive = balanceEth > 0.001;
    } catch (e) {
      // Error al obtener balance
    }
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
    return res.json({ success: false, error: 'Ya está corriendo', isRunning: true });
  }
  
  state.isDryRun = req.body?.dryRun === true;
  state.isRunning = true;
  state.startTime = Date.now();
  
  // Reset stats
  state.stats = {
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
    avgExecutionTimeMs: 0,
    scansPerSecond: 0,
    uptime: 0,
    currentChain: 'all',
    lastOpportunity: null,
    lastTrade: null
  };
  state.tradeLogs = [];
  state.opportunities = [];
  scanTimes = [];
  
  // Iniciar loop scalper
  if (timer) clearInterval(timer);
  timer = setInterval(scalperTick, SCALPER_CONFIG.SCAN_INTERVAL_MS);
  
  console.log(`\n[START] 🔥 SCALPER HTF iniciado - ${state.isDryRun ? 'DRY RUN' : '⚠️ MODO REAL'}`);
  console.log(`[CONFIG] Intervalo: ${SCALPER_CONFIG.SCAN_INTERVAL_MS}ms | Min profit: $${SCALPER_CONFIG.MIN_PROFIT_USD} | Parallel: ${SCALPER_CONFIG.PARALLEL_CHAIN_SCAN}`);
  
  res.json({
    success: true,
    isRunning: true,
    isDryRun: state.isDryRun,
    mode: 'SCALPER_HTF',
    config: SCALPER_CONFIG
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
    avgExecutionTimeMs: 0,
    scansPerSecond: 0,
    uptime: 0,
    currentChain: 'all',
    lastOpportunity: null,
    lastTrade: null
  };
  state.tradeLogs = [];
  state.opportunities = [];
  scanTimes = [];
  res.json({ success: true });
});

app.get('/api/defi/multichain-arb/health', (req, res) => {
  res.json({
    status: 'ok',
    mode: 'SCALPER_HTF',
    port: PORT,
    running: state.isRunning,
    dryRun: state.isDryRun,
    wallet: WALLET_ADDRESS,
    config: SCALPER_CONFIG,
    stats: {
      scansPerSecond: state.stats.scansPerSecond,
      opportunitiesFound: state.stats.opportunitiesFound,
      tradesExecuted: state.stats.tradesExecuted
    }
  });
});

app.get('/api/defi/multichain-arb/config', (req, res) => {
  res.json(SCALPER_CONFIG);
});

// ═══════════════════════════════════════════════════════════════════════════════
// INICIAR SERVIDOR
// ═══════════════════════════════════════════════════════════════════════════════

app.listen(PORT, async () => {
  console.log(`
╔═══════════════════════════════════════════════════════════════════════════════╗
║                                                                               ║
║   🔥 SCALPER HTF ARBITRAGE BOT                                                ║
║                                                                               ║
║   ✅ Puerto: ${PORT}                                                           ║
║   ✅ Wallet: ${WALLET_ADDRESS.slice(0, 10)}...${WALLET_ADDRESS.slice(-5)}                                  ║
║   ✅ Modo: SCALPER - Entrada/Salida Rápida                                    ║
║                                                                               ║
║   ⚡ Intervalo: ${SCALPER_CONFIG.SCAN_INTERVAL_MS}ms (${(1000/SCALPER_CONFIG.SCAN_INTERVAL_MS).toFixed(0)} scans/seg)                                ║
║   ⚡ Min Profit: $${SCALPER_CONFIG.MIN_PROFIT_USD}                                                ║
║   ⚡ Parallel Scan: ${SCALPER_CONFIG.PARALLEL_CHAIN_SCAN}                                             ║
║   ⚡ Auto Execute: ${SCALPER_CONFIG.AUTO_EXECUTE}                                              ║
║                                                                               ║
║   📊 Chains: Base, Arbitrum, Optimism                                         ║
║                                                                               ║
║   ⚠️  MODO SCALPER - Alta frecuencia de entrada/salida                        ║
║                                                                               ║
╚═══════════════════════════════════════════════════════════════════════════════╝
  `);
  
  await initConnections();
  await updateBalances();
  
  console.log('\n[READY] 🔥 Scalper listo. Usa POST /api/defi/multichain-arb/start para iniciar.\n');
});

process.on('SIGINT', () => {
  console.log('\n[EXIT] Cerrando scalper...');
  if (timer) clearInterval(timer);
  process.exit(0);
});



 * ═══════════════════════════════════════════════════════════════════════════════
 * 🔥 SCALPER HTF ARBITRAGE BOT - ENTRADA Y SALIDA ULTRA-RÁPIDA
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * Comportamiento SCALPER:
 * - Detecta oportunidad → ENTRA inmediatamente
 * - Ejecuta swap → SALE inmediatamente
 * - No mantiene posiciones
 * - Ciclo continuo de entrada/salida
 * - Escaneo paralelo de múltiples chains
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
// CONFIGURACIÓN SCALPER HTF
// ═══════════════════════════════════════════════════════════════════════════════

const SCALPER_CONFIG = {
  // VELOCIDAD
  SCAN_INTERVAL_MS: 200,           // 5 scans por segundo
  PARALLEL_CHAIN_SCAN: true,       // Escanear todas las chains simultáneamente
  
  // UMBRALES SCALPER
  MIN_PROFIT_USD: 0.005,           // $0.005 mínimo (muy bajo para capturar más)
  MIN_SPREAD_BPS: 1,               // 0.01% spread mínimo
  MAX_SLIPPAGE_BPS: 50,            // 0.5% slippage máximo
  
  // CANTIDADES (pequeñas para entrada/salida rápida)
  TRADE_AMOUNTS_ETH: [0.001, 0.002, 0.003, 0.005, 0.008, 0.01],
  
  // FEE TIERS
  FEE_TIERS: [100, 500, 3000, 10000],
  
  // EJECUCIÓN
  AUTO_EXECUTE: true,
  IMMEDIATE_EXIT: true,            // Salir inmediatamente después de entrar
  MAX_CONCURRENT_TRADES: 3,        // Máximo trades simultáneos
  
  // GAS
  GAS_MULTIPLIER: 1.2,             // Gas más bajo para velocidad
  MAX_GAS_GWEI: 5,                 // Máximo gas en gwei
  
  // PRECIO ETH
  ETH_PRICE_USD: 3500
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
      USDC: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
      USDbC: '0xd9aAEc86B65D86f6A7B5B1b0c42FFA531710b6CA'
    },
    quoter: '0x3d4e44Eb1374240CE5F1B871ab261CD16335B76a',
    router: '0x2626664c2603336E57B271c5C0b26F421741e481',
    priority: 1  // Más prioridad
  },
  arbitrum: {
    name: 'Arbitrum',
    chainId: 42161,
    rpc: 'https://arb1.arbitrum.io/rpc',
    explorer: 'https://arbiscan.io',
    tokens: {
      WETH: '0x82aF49447D8a07e3bd95BD0d56f35241523fBab1',
      USDC: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831',
      USDT: '0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9'
    },
    quoter: '0x61fFE014bA17989E743c5F6cB21bF9697530B21e',
    router: '0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45',
    priority: 2
  },
  optimism: {
    name: 'Optimism',
    chainId: 10,
    rpc: 'https://mainnet.optimism.io',
    explorer: 'https://optimistic.etherscan.io',
    tokens: {
      WETH: '0x4200000000000000000000000000000000000006',
      USDC: '0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85',
      USDT: '0x94b008aA00579c1307B0EF2c499aD98a8ce58e58'
    },
    quoter: '0x61fFE014bA17989E743c5F6cB21bF9697530B21e',
    router: '0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45',
    priority: 3
  }
};

// ABIs
const QUOTER_ABI = [
  'function quoteExactInputSingle((address tokenIn, address tokenOut, uint256 amountIn, uint24 fee, uint160 sqrtPriceLimitX96)) external returns (uint256 amountOut, uint160 sqrtPriceX96After, uint32 initializedTicksCrossed, uint256 gasEstimate)'
];

const ROUTER_ABI = [
  'function exactInputSingle((address tokenIn, address tokenOut, uint24 fee, address recipient, uint256 amountIn, uint256 amountOutMinimum, uint160 sqrtPriceLimitX96)) external payable returns (uint256 amountOut)',
  'function multicall(uint256 deadline, bytes[] calldata data) external payable returns (bytes[] memory results)',
  'function unwrapWETH9(uint256 amountMinimum, address recipient) external payable'
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
  'function allowance(address owner, address spender) view returns (uint256)',
  'function decimals() view returns (uint8)'
];

// ═══════════════════════════════════════════════════════════════════════════════
// ESTADO DEL SCALPER
// ═══════════════════════════════════════════════════════════════════════════════

let state = {
  isRunning: false,
  isDryRun: false,
  startTime: null,
  mode: 'SCALPER_HTF',
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
    avgExecutionTimeMs: 0,
    scansPerSecond: 0,
    uptime: 0,
    currentChain: 'all',
    lastOpportunity: null,
    lastTrade: null
  },
  chains: [],
  tradeLogs: [],
  opportunities: [],
  banditStates: [],
  activePositions: [],
  scanHistory: []
};

let timer = null;
let providers = {};
let signers = {};
let contracts = {};
let activeTrades = 0;
let scanTimes = [];

// ═══════════════════════════════════════════════════════════════════════════════
// INICIALIZAR CONEXIONES
// ═══════════════════════════════════════════════════════════════════════════════

async function initConnections() {
  console.log('[INIT] 🔌 Inicializando conexiones a chains...');
  
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
        balanceUsd: balanceEth * SCALPER_CONFIG.ETH_PRICE_USD,
        routes: SCALPER_CONFIG.FEE_TIERS.length * SCALPER_CONFIG.TRADE_AMOUNTS_ETH.length,
        isActive: balanceEth > 0.001,
        lastScan: Date.now(),
        scansCompleted: 0,
        opportunitiesFound: 0,
        tradesExecuted: 0,
        explorer: chain.explorer,
        priority: chain.priority
      });
      
      state.banditStates.push({
        chain: key,
        alpha: 2,
        beta: 2,
        winRate: 50,
        selected: key === 'base',
        attempts: 0,
        wins: 0,
        avgProfit: 0
      });
      
      console.log(`[INIT] ✅ ${chain.name}: ${balanceEth.toFixed(6)} ETH ($${(balanceEth * SCALPER_CONFIG.ETH_PRICE_USD).toFixed(2)})`);
    } catch (e) {
      console.error(`[INIT] ❌ ${chain.name}: ${e.message}`);
    }
  }
  
  // Ordenar chains por prioridad
  state.chains.sort((a, b) => CHAINS[a.chain].priority - CHAINS[b.chain].priority);
}

// ═══════════════════════════════════════════════════════════════════════════════
// ESCANEO SCALPER - PARALELO Y ULTRA-RÁPIDO
// ═══════════════════════════════════════════════════════════════════════════════

async function scalperScan(chainKey) {
  const chain = CHAINS[chainKey];
  const provider = providers[chainKey];
  const quoter = contracts[chainKey].quoter;
  const opportunities = [];
  
  try {
    // Obtener gas price actual
    const feeData = await provider.getFeeData();
    const gasPrice = feeData.gasPrice || ethers.parseUnits('0.001', 'gwei');
    const gasPriceGwei = parseFloat(ethers.formatUnits(gasPrice, 'gwei'));
    
    // Si gas muy alto, saltar
    if (gasPriceGwei > SCALPER_CONFIG.MAX_GAS_GWEI) {
      return [];
    }
    
    const gasCostWei = gasPrice * 250000n; // Estimado para swap completo
    const gasCostUsd = parseFloat(ethers.formatEther(gasCostWei)) * SCALPER_CONFIG.ETH_PRICE_USD;
    
    // Generar todas las combinaciones de quotes
    const quotePromises = [];
    
    for (const amountEth of SCALPER_CONFIG.TRADE_AMOUNTS_ETH) {
      const amountWei = ethers.parseEther(amountEth.toString());
      
      for (let i = 0; i < SCALPER_CONFIG.FEE_TIERS.length; i++) {
        for (let j = 0; j < SCALPER_CONFIG.FEE_TIERS.length; j++) {
          // Probar diferentes combinaciones de fee tiers
          const fee1 = SCALPER_CONFIG.FEE_TIERS[i];
          const fee2 = SCALPER_CONFIG.FEE_TIERS[j];
          
          quotePromises.push(
            (async () => {
              try {
                // ENTRADA: WETH → USDC
                const quote1 = await quoter.quoteExactInputSingle.staticCall({
                  tokenIn: chain.tokens.WETH,
                  tokenOut: chain.tokens.USDC,
                  amountIn: amountWei,
                  fee: fee1,
                  sqrtPriceLimitX96: 0n
                });
                const usdcOut = quote1[0];
                
                // SALIDA: USDC → WETH
                const quote2 = await quoter.quoteExactInputSingle.staticCall({
                  tokenIn: chain.tokens.USDC,
                  tokenOut: chain.tokens.WETH,
                  amountIn: usdcOut,
                  fee: fee2,
                  sqrtPriceLimitX96: 0n
                });
                const wethOut = quote2[0];
                
                // Calcular profit
                const grossProfit = wethOut - amountWei;
                const netProfit = grossProfit - gasCostWei;
                
                if (netProfit > 0n) {
                  const netProfitUsd = parseFloat(ethers.formatEther(netProfit)) * SCALPER_CONFIG.ETH_PRICE_USD;
                  const spreadBps = Number((grossProfit * 10000n) / amountWei);
                  
                  if (netProfitUsd >= SCALPER_CONFIG.MIN_PROFIT_USD && spreadBps >= SCALPER_CONFIG.MIN_SPREAD_BPS) {
                    return {
                      chain: chainKey,
                      chainName: chain.name,
                      type: 'SCALP',
                      direction: 'WETH→USDC→WETH',
                      route: `Fee ${fee1/100}%→${fee2/100}%`,
                      amountIn: amountWei,
                      amountInEth: amountEth,
                      fee1,
                      fee2,
                      usdcIntermediate: usdcOut,
                      wethOut,
                      grossProfit,
                      netProfit,
                      netProfitUsd,
                      gasCostUsd,
                      spreadBps,
                      timestamp: Date.now(),
                      gasPrice: gasPriceGwei,
                      confidence: Math.min(100, spreadBps * 10)
                    };
                  }
                }
              } catch (e) {
                // Pool no existe o error de quote
              }
              return null;
            })()
          );
        }
      }
    }
    
    // Ejecutar todos los quotes en paralelo
    const results = await Promise.all(quotePromises);
    opportunities.push(...results.filter(r => r !== null));
    
  } catch (e) {
    // Error general de scan
  }
  
  return opportunities;
}

// ═══════════════════════════════════════════════════════════════════════════════
// EJECUCIÓN SCALPER - ENTRADA Y SALIDA INMEDIATA
// ═══════════════════════════════════════════════════════════════════════════════

async function executeScalp(opp) {
  if (activeTrades >= SCALPER_CONFIG.MAX_CONCURRENT_TRADES) {
    console.log(`[SCALP] ⚠️ Máximo trades activos (${activeTrades}), esperando...`);
    return null;
  }
  
  activeTrades++;
  const startTime = Date.now();
  const chain = CHAINS[opp.chain];
  const signer = signers[opp.chain];
  const provider = providers[opp.chain];
  const { router, weth } = contracts[opp.chain];
  
  console.log(`\n🔥 [SCALP] ═══════════════════════════════════════════════════════`);
  console.log(`   Chain: ${chain.name}`);
  console.log(`   Route: ${opp.route}`);
  console.log(`   Amount: ${opp.amountInEth} ETH`);
  console.log(`   Expected Profit: $${opp.netProfitUsd.toFixed(4)}`);
  console.log(`   Spread: ${opp.spreadBps} bps`);
  console.log(`   Gas: ${opp.gasPrice.toFixed(2)} gwei`);
  
  try {
    // Verificar balance
    const balance = await provider.getBalance(WALLET_ADDRESS);
    if (balance < opp.amountIn + ethers.parseEther('0.001')) {
      console.log(`   ❌ Balance insuficiente`);
      activeTrades--;
      return { success: false, error: 'Balance insuficiente' };
    }
    
    // ═══════════════════════════════════════════════════════════════════════════
    // PASO 1: WRAP ETH → WETH
    // ═══════════════════════════════════════════════════════════════════════════
    console.log(`   📦 [1/4] Wrapping ETH → WETH...`);
    const wrapTx = await weth.deposit({ 
      value: opp.amountIn,
      gasLimit: 50000
    });
    const wrapReceipt = await wrapTx.wait(1);
    console.log(`   ✅ Wrap completado: ${wrapReceipt.hash.slice(0, 16)}...`);
    
    // ═══════════════════════════════════════════════════════════════════════════
    // PASO 2: APPROVE WETH (si es necesario)
    // ═══════════════════════════════════════════════════════════════════════════
    const wethAllowance = await weth.allowance(WALLET_ADDRESS, chain.router);
    if (wethAllowance < opp.amountIn) {
      console.log(`   🔓 [2/4] Approving WETH...`);
      const approveTx = await weth.approve(chain.router, ethers.MaxUint256, { gasLimit: 50000 });
      await approveTx.wait(1);
      console.log(`   ✅ WETH approved`);
    } else {
      console.log(`   ✅ [2/4] WETH ya aprobado`);
    }
    
    // ═══════════════════════════════════════════════════════════════════════════
    // PASO 3: ENTRADA - SWAP WETH → USDC
    // ═══════════════════════════════════════════════════════════════════════════
    console.log(`   🔄 [3/4] ENTRADA: WETH → USDC...`);
    const minUsdc = (opp.usdcIntermediate * BigInt(10000 - SCALPER_CONFIG.MAX_SLIPPAGE_BPS)) / 10000n;
    
    const swap1Tx = await router.exactInputSingle({
      tokenIn: chain.tokens.WETH,
      tokenOut: chain.tokens.USDC,
      fee: opp.fee1,
      recipient: WALLET_ADDRESS,
      amountIn: opp.amountIn,
      amountOutMinimum: minUsdc,
      sqrtPriceLimitX96: 0n
    }, { gasLimit: 300000 });
    
    const swap1Receipt = await swap1Tx.wait(1);
    console.log(`   ✅ ENTRADA completada: ${swap1Receipt.hash.slice(0, 16)}...`);
    
    // Obtener balance USDC real
    const usdc = new ethers.Contract(chain.tokens.USDC, ERC20_ABI, signer);
    const usdcBalance = await usdc.balanceOf(WALLET_ADDRESS);
    console.log(`   💵 USDC recibido: ${ethers.formatUnits(usdcBalance, 6)}`);
    
    // ═══════════════════════════════════════════════════════════════════════════
    // PASO 4: SALIDA INMEDIATA - SWAP USDC → WETH
    // ═══════════════════════════════════════════════════════════════════════════
    console.log(`   🔄 [4/4] SALIDA: USDC → WETH...`);
    
    // Approve USDC si es necesario
    const usdcAllowance = await usdc.allowance(WALLET_ADDRESS, chain.router);
    if (usdcAllowance < usdcBalance) {
      const approveUsdcTx = await usdc.approve(chain.router, ethers.MaxUint256, { gasLimit: 50000 });
      await approveUsdcTx.wait(1);
    }
    
    const minWeth = (opp.wethOut * BigInt(10000 - SCALPER_CONFIG.MAX_SLIPPAGE_BPS)) / 10000n;
    
    const swap2Tx = await router.exactInputSingle({
      tokenIn: chain.tokens.USDC,
      tokenOut: chain.tokens.WETH,
      fee: opp.fee2,
      recipient: WALLET_ADDRESS,
      amountIn: usdcBalance,
      amountOutMinimum: minWeth,
      sqrtPriceLimitX96: 0n
    }, { gasLimit: 300000 });
    
    const swap2Receipt = await swap2Tx.wait(1);
    console.log(`   ✅ SALIDA completada: ${swap2Receipt.hash.slice(0, 16)}...`);
    
    // ═══════════════════════════════════════════════════════════════════════════
    // CALCULAR PROFIT REAL
    // ═══════════════════════════════════════════════════════════════════════════
    const finalWethBalance = await weth.balanceOf(WALLET_ADDRESS);
    const actualProfit = finalWethBalance - opp.amountIn;
    const actualProfitUsd = parseFloat(ethers.formatEther(actualProfit)) * SCALPER_CONFIG.ETH_PRICE_USD;
    
    // Calcular gas usado
    const gas1 = swap1Receipt.gasUsed * swap1Receipt.gasPrice;
    const gas2 = swap2Receipt.gasUsed * swap2Receipt.gasPrice;
    const totalGasWei = gas1 + gas2 + wrapReceipt.gasUsed * wrapReceipt.gasPrice;
    const totalGasUsd = parseFloat(ethers.formatEther(totalGasWei)) * SCALPER_CONFIG.ETH_PRICE_USD;
    
    const netProfitUsd = actualProfitUsd - totalGasUsd;
    const executionTime = Date.now() - startTime;
    
    console.log(`   ═══════════════════════════════════════════════════════`);
    console.log(`   💰 PROFIT BRUTO: $${actualProfitUsd.toFixed(4)}`);
    console.log(`   ⛽ GAS TOTAL: $${totalGasUsd.toFixed(4)}`);
    console.log(`   💵 PROFIT NETO: $${netProfitUsd.toFixed(4)}`);
    console.log(`   ⏱️  Tiempo: ${executionTime}ms`);
    console.log(`   🔗 TX: ${chain.explorer}/tx/${swap2Receipt.hash}`);
    console.log(`   ═══════════════════════════════════════════════════════\n`);
    
    activeTrades--;
    
    return {
      success: true,
      profitUsd: actualProfitUsd,
      gasUsd: totalGasUsd,
      netProfitUsd,
      txHash: swap2Receipt.hash,
      executionTimeMs: executionTime
    };
    
  } catch (e) {
    console.log(`   ❌ Error: ${e.message}`);
    activeTrades--;
    return { success: false, error: e.message };
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// LOOP PRINCIPAL SCALPER
// ═══════════════════════════════════════════════════════════════════════════════

async function scalperTick() {
  if (!state.isRunning) return;
  
  const tickStart = Date.now();
  state.stats.totalScans++;
  state.stats.uptime = Math.floor((Date.now() - state.startTime) / 1000);
  
  try {
    // ESCANEO PARALELO de todas las chains activas
    const activeChains = state.chains.filter(c => c.isActive).map(c => c.chain);
    
    let allOpportunities = [];
    
    if (SCALPER_CONFIG.PARALLEL_CHAIN_SCAN) {
      // Escanear todas las chains en paralelo
      const scanPromises = activeChains.map(chainKey => scalperScan(chainKey));
      const results = await Promise.all(scanPromises);
      allOpportunities = results.flat();
    } else {
      // Escanear secuencialmente (round-robin)
      const chainIndex = state.stats.totalScans % activeChains.length;
      const selectedChain = activeChains[chainIndex];
      allOpportunities = await scalperScan(selectedChain);
    }
    
    const scanTime = Date.now() - tickStart;
    scanTimes.push(scanTime);
    if (scanTimes.length > 100) scanTimes.shift();
    state.stats.avgScanTimeMs = Math.round(scanTimes.reduce((a, b) => a + b, 0) / scanTimes.length);
    state.stats.scansPerSecond = Math.round(1000 / state.stats.avgScanTimeMs * 10) / 10;
    
    if (allOpportunities.length > 0) {
      state.stats.opportunitiesFound += allOpportunities.length;
      
      // Ordenar por profit neto
      allOpportunities.sort((a, b) => b.netProfitUsd - a.netProfitUsd);
      
      // Guardar oportunidades para UI
      state.opportunities = [...allOpportunities.slice(0, 10), ...state.opportunities].slice(0, 50);
      state.stats.lastOpportunity = allOpportunities[0];
      
      const best = allOpportunities[0];
      
      console.log(`[SCAN #${state.stats.totalScans}] ${scanTime}ms | ${allOpportunities.length} opps | Best: $${best.netProfitUsd.toFixed(4)} on ${best.chainName}`);
      
      // EJECUTAR si no es dry run y auto-execute está activo
      if (!state.isDryRun && SCALPER_CONFIG.AUTO_EXECUTE && best.netProfitUsd >= SCALPER_CONFIG.MIN_PROFIT_USD) {
        state.stats.tradesAttempted++;
        
        const result = await executeScalp(best);
        
        if (result) {
          state.stats.tradesExecuted++;
          
          const tradeLog = {
            id: `scalp-${Date.now()}`,
            timestamp: Date.now(),
            chain: best.chain,
            chainName: best.chainName,
            type: 'SCALP',
            route: best.route,
            direction: best.direction,
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
          if (state.tradeLogs.length > 100) state.tradeLogs.pop();
          
          if (result.success) {
            state.stats.tradesSuccessful++;
            state.stats.totalProfitUsd += result.profitUsd;
            state.stats.totalGasUsd += result.gasUsd;
            state.stats.netProfitUsd = state.stats.totalProfitUsd - state.stats.totalGasUsd;
            state.stats.lastTrade = tradeLog;
            
            // Actualizar bandit
            const bandit = state.banditStates.find(b => b.chain === best.chain);
            if (bandit) {
              bandit.wins++;
              bandit.attempts++;
              bandit.alpha++;
              bandit.winRate = (bandit.wins / bandit.attempts) * 100;
              bandit.avgProfit = (bandit.avgProfit * (bandit.wins - 1) + result.netProfitUsd) / bandit.wins;
            }
            
            // Actualizar chain stats
            const chainState = state.chains.find(c => c.chain === best.chain);
            if (chainState) {
              chainState.tradesExecuted++;
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
      // Log periódico cuando no hay oportunidades
      if (state.stats.totalScans % 50 === 0) {
        console.log(`[SCAN #${state.stats.totalScans}] ${scanTime}ms | No profitable opportunities`);
      }
    }
    
    // Actualizar balances cada 100 scans
    if (state.stats.totalScans % 100 === 0) {
      await updateBalances();
    }
    
    // Actualizar chain stats
    for (const chainState of state.chains) {
      chainState.lastScan = Date.now();
      chainState.scansCompleted++;
    }
    
  } catch (e) {
    console.error(`[TICK] Error: ${e.message}`);
  }
}

async function updateBalances() {
  for (const chainState of state.chains) {
    try {
      const balance = await providers[chainState.chain].getBalance(WALLET_ADDRESS);
      const balanceEth = parseFloat(ethers.formatEther(balance));
      chainState.balance = balanceEth.toFixed(6);
      chainState.balanceUsd = balanceEth * SCALPER_CONFIG.ETH_PRICE_USD;
      chainState.isActive = balanceEth > 0.001;
    } catch (e) {
      // Error al obtener balance
    }
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
    return res.json({ success: false, error: 'Ya está corriendo', isRunning: true });
  }
  
  state.isDryRun = req.body?.dryRun === true;
  state.isRunning = true;
  state.startTime = Date.now();
  
  // Reset stats
  state.stats = {
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
    avgExecutionTimeMs: 0,
    scansPerSecond: 0,
    uptime: 0,
    currentChain: 'all',
    lastOpportunity: null,
    lastTrade: null
  };
  state.tradeLogs = [];
  state.opportunities = [];
  scanTimes = [];
  
  // Iniciar loop scalper
  if (timer) clearInterval(timer);
  timer = setInterval(scalperTick, SCALPER_CONFIG.SCAN_INTERVAL_MS);
  
  console.log(`\n[START] 🔥 SCALPER HTF iniciado - ${state.isDryRun ? 'DRY RUN' : '⚠️ MODO REAL'}`);
  console.log(`[CONFIG] Intervalo: ${SCALPER_CONFIG.SCAN_INTERVAL_MS}ms | Min profit: $${SCALPER_CONFIG.MIN_PROFIT_USD} | Parallel: ${SCALPER_CONFIG.PARALLEL_CHAIN_SCAN}`);
  
  res.json({
    success: true,
    isRunning: true,
    isDryRun: state.isDryRun,
    mode: 'SCALPER_HTF',
    config: SCALPER_CONFIG
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
    avgExecutionTimeMs: 0,
    scansPerSecond: 0,
    uptime: 0,
    currentChain: 'all',
    lastOpportunity: null,
    lastTrade: null
  };
  state.tradeLogs = [];
  state.opportunities = [];
  scanTimes = [];
  res.json({ success: true });
});

app.get('/api/defi/multichain-arb/health', (req, res) => {
  res.json({
    status: 'ok',
    mode: 'SCALPER_HTF',
    port: PORT,
    running: state.isRunning,
    dryRun: state.isDryRun,
    wallet: WALLET_ADDRESS,
    config: SCALPER_CONFIG,
    stats: {
      scansPerSecond: state.stats.scansPerSecond,
      opportunitiesFound: state.stats.opportunitiesFound,
      tradesExecuted: state.stats.tradesExecuted
    }
  });
});

app.get('/api/defi/multichain-arb/config', (req, res) => {
  res.json(SCALPER_CONFIG);
});

// ═══════════════════════════════════════════════════════════════════════════════
// INICIAR SERVIDOR
// ═══════════════════════════════════════════════════════════════════════════════

app.listen(PORT, async () => {
  console.log(`
╔═══════════════════════════════════════════════════════════════════════════════╗
║                                                                               ║
║   🔥 SCALPER HTF ARBITRAGE BOT                                                ║
║                                                                               ║
║   ✅ Puerto: ${PORT}                                                           ║
║   ✅ Wallet: ${WALLET_ADDRESS.slice(0, 10)}...${WALLET_ADDRESS.slice(-5)}                                  ║
║   ✅ Modo: SCALPER - Entrada/Salida Rápida                                    ║
║                                                                               ║
║   ⚡ Intervalo: ${SCALPER_CONFIG.SCAN_INTERVAL_MS}ms (${(1000/SCALPER_CONFIG.SCAN_INTERVAL_MS).toFixed(0)} scans/seg)                                ║
║   ⚡ Min Profit: $${SCALPER_CONFIG.MIN_PROFIT_USD}                                                ║
║   ⚡ Parallel Scan: ${SCALPER_CONFIG.PARALLEL_CHAIN_SCAN}                                             ║
║   ⚡ Auto Execute: ${SCALPER_CONFIG.AUTO_EXECUTE}                                              ║
║                                                                               ║
║   📊 Chains: Base, Arbitrum, Optimism                                         ║
║                                                                               ║
║   ⚠️  MODO SCALPER - Alta frecuencia de entrada/salida                        ║
║                                                                               ║
╚═══════════════════════════════════════════════════════════════════════════════╝
  `);
  
  await initConnections();
  await updateBalances();
  
  console.log('\n[READY] 🔥 Scalper listo. Usa POST /api/defi/multichain-arb/start para iniciar.\n');
});

process.on('SIGINT', () => {
  console.log('\n[EXIT] Cerrando scalper...');
  if (timer) clearInterval(timer);
  process.exit(0);
});


 * ═══════════════════════════════════════════════════════════════════════════════
 * 🔥 SCALPER HTF ARBITRAGE BOT - ENTRADA Y SALIDA ULTRA-RÁPIDA
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * Comportamiento SCALPER:
 * - Detecta oportunidad → ENTRA inmediatamente
 * - Ejecuta swap → SALE inmediatamente
 * - No mantiene posiciones
 * - Ciclo continuo de entrada/salida
 * - Escaneo paralelo de múltiples chains
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
// CONFIGURACIÓN SCALPER HTF
// ═══════════════════════════════════════════════════════════════════════════════

const SCALPER_CONFIG = {
  // VELOCIDAD
  SCAN_INTERVAL_MS: 200,           // 5 scans por segundo
  PARALLEL_CHAIN_SCAN: true,       // Escanear todas las chains simultáneamente
  
  // UMBRALES SCALPER
  MIN_PROFIT_USD: 0.005,           // $0.005 mínimo (muy bajo para capturar más)
  MIN_SPREAD_BPS: 1,               // 0.01% spread mínimo
  MAX_SLIPPAGE_BPS: 50,            // 0.5% slippage máximo
  
  // CANTIDADES (pequeñas para entrada/salida rápida)
  TRADE_AMOUNTS_ETH: [0.001, 0.002, 0.003, 0.005, 0.008, 0.01],
  
  // FEE TIERS
  FEE_TIERS: [100, 500, 3000, 10000],
  
  // EJECUCIÓN
  AUTO_EXECUTE: true,
  IMMEDIATE_EXIT: true,            // Salir inmediatamente después de entrar
  MAX_CONCURRENT_TRADES: 3,        // Máximo trades simultáneos
  
  // GAS
  GAS_MULTIPLIER: 1.2,             // Gas más bajo para velocidad
  MAX_GAS_GWEI: 5,                 // Máximo gas en gwei
  
  // PRECIO ETH
  ETH_PRICE_USD: 3500
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
      USDC: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
      USDbC: '0xd9aAEc86B65D86f6A7B5B1b0c42FFA531710b6CA'
    },
    quoter: '0x3d4e44Eb1374240CE5F1B871ab261CD16335B76a',
    router: '0x2626664c2603336E57B271c5C0b26F421741e481',
    priority: 1  // Más prioridad
  },
  arbitrum: {
    name: 'Arbitrum',
    chainId: 42161,
    rpc: 'https://arb1.arbitrum.io/rpc',
    explorer: 'https://arbiscan.io',
    tokens: {
      WETH: '0x82aF49447D8a07e3bd95BD0d56f35241523fBab1',
      USDC: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831',
      USDT: '0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9'
    },
    quoter: '0x61fFE014bA17989E743c5F6cB21bF9697530B21e',
    router: '0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45',
    priority: 2
  },
  optimism: {
    name: 'Optimism',
    chainId: 10,
    rpc: 'https://mainnet.optimism.io',
    explorer: 'https://optimistic.etherscan.io',
    tokens: {
      WETH: '0x4200000000000000000000000000000000000006',
      USDC: '0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85',
      USDT: '0x94b008aA00579c1307B0EF2c499aD98a8ce58e58'
    },
    quoter: '0x61fFE014bA17989E743c5F6cB21bF9697530B21e',
    router: '0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45',
    priority: 3
  }
};

// ABIs
const QUOTER_ABI = [
  'function quoteExactInputSingle((address tokenIn, address tokenOut, uint256 amountIn, uint24 fee, uint160 sqrtPriceLimitX96)) external returns (uint256 amountOut, uint160 sqrtPriceX96After, uint32 initializedTicksCrossed, uint256 gasEstimate)'
];

const ROUTER_ABI = [
  'function exactInputSingle((address tokenIn, address tokenOut, uint24 fee, address recipient, uint256 amountIn, uint256 amountOutMinimum, uint160 sqrtPriceLimitX96)) external payable returns (uint256 amountOut)',
  'function multicall(uint256 deadline, bytes[] calldata data) external payable returns (bytes[] memory results)',
  'function unwrapWETH9(uint256 amountMinimum, address recipient) external payable'
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
  'function allowance(address owner, address spender) view returns (uint256)',
  'function decimals() view returns (uint8)'
];

// ═══════════════════════════════════════════════════════════════════════════════
// ESTADO DEL SCALPER
// ═══════════════════════════════════════════════════════════════════════════════

let state = {
  isRunning: false,
  isDryRun: false,
  startTime: null,
  mode: 'SCALPER_HTF',
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
    avgExecutionTimeMs: 0,
    scansPerSecond: 0,
    uptime: 0,
    currentChain: 'all',
    lastOpportunity: null,
    lastTrade: null
  },
  chains: [],
  tradeLogs: [],
  opportunities: [],
  banditStates: [],
  activePositions: [],
  scanHistory: []
};

let timer = null;
let providers = {};
let signers = {};
let contracts = {};
let activeTrades = 0;
let scanTimes = [];

// ═══════════════════════════════════════════════════════════════════════════════
// INICIALIZAR CONEXIONES
// ═══════════════════════════════════════════════════════════════════════════════

async function initConnections() {
  console.log('[INIT] 🔌 Inicializando conexiones a chains...');
  
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
        balanceUsd: balanceEth * SCALPER_CONFIG.ETH_PRICE_USD,
        routes: SCALPER_CONFIG.FEE_TIERS.length * SCALPER_CONFIG.TRADE_AMOUNTS_ETH.length,
        isActive: balanceEth > 0.001,
        lastScan: Date.now(),
        scansCompleted: 0,
        opportunitiesFound: 0,
        tradesExecuted: 0,
        explorer: chain.explorer,
        priority: chain.priority
      });
      
      state.banditStates.push({
        chain: key,
        alpha: 2,
        beta: 2,
        winRate: 50,
        selected: key === 'base',
        attempts: 0,
        wins: 0,
        avgProfit: 0
      });
      
      console.log(`[INIT] ✅ ${chain.name}: ${balanceEth.toFixed(6)} ETH ($${(balanceEth * SCALPER_CONFIG.ETH_PRICE_USD).toFixed(2)})`);
    } catch (e) {
      console.error(`[INIT] ❌ ${chain.name}: ${e.message}`);
    }
  }
  
  // Ordenar chains por prioridad
  state.chains.sort((a, b) => CHAINS[a.chain].priority - CHAINS[b.chain].priority);
}

// ═══════════════════════════════════════════════════════════════════════════════
// ESCANEO SCALPER - PARALELO Y ULTRA-RÁPIDO
// ═══════════════════════════════════════════════════════════════════════════════

async function scalperScan(chainKey) {
  const chain = CHAINS[chainKey];
  const provider = providers[chainKey];
  const quoter = contracts[chainKey].quoter;
  const opportunities = [];
  
  try {
    // Obtener gas price actual
    const feeData = await provider.getFeeData();
    const gasPrice = feeData.gasPrice || ethers.parseUnits('0.001', 'gwei');
    const gasPriceGwei = parseFloat(ethers.formatUnits(gasPrice, 'gwei'));
    
    // Si gas muy alto, saltar
    if (gasPriceGwei > SCALPER_CONFIG.MAX_GAS_GWEI) {
      return [];
    }
    
    const gasCostWei = gasPrice * 250000n; // Estimado para swap completo
    const gasCostUsd = parseFloat(ethers.formatEther(gasCostWei)) * SCALPER_CONFIG.ETH_PRICE_USD;
    
    // Generar todas las combinaciones de quotes
    const quotePromises = [];
    
    for (const amountEth of SCALPER_CONFIG.TRADE_AMOUNTS_ETH) {
      const amountWei = ethers.parseEther(amountEth.toString());
      
      for (let i = 0; i < SCALPER_CONFIG.FEE_TIERS.length; i++) {
        for (let j = 0; j < SCALPER_CONFIG.FEE_TIERS.length; j++) {
          // Probar diferentes combinaciones de fee tiers
          const fee1 = SCALPER_CONFIG.FEE_TIERS[i];
          const fee2 = SCALPER_CONFIG.FEE_TIERS[j];
          
          quotePromises.push(
            (async () => {
              try {
                // ENTRADA: WETH → USDC
                const quote1 = await quoter.quoteExactInputSingle.staticCall({
                  tokenIn: chain.tokens.WETH,
                  tokenOut: chain.tokens.USDC,
                  amountIn: amountWei,
                  fee: fee1,
                  sqrtPriceLimitX96: 0n
                });
                const usdcOut = quote1[0];
                
                // SALIDA: USDC → WETH
                const quote2 = await quoter.quoteExactInputSingle.staticCall({
                  tokenIn: chain.tokens.USDC,
                  tokenOut: chain.tokens.WETH,
                  amountIn: usdcOut,
                  fee: fee2,
                  sqrtPriceLimitX96: 0n
                });
                const wethOut = quote2[0];
                
                // Calcular profit
                const grossProfit = wethOut - amountWei;
                const netProfit = grossProfit - gasCostWei;
                
                if (netProfit > 0n) {
                  const netProfitUsd = parseFloat(ethers.formatEther(netProfit)) * SCALPER_CONFIG.ETH_PRICE_USD;
                  const spreadBps = Number((grossProfit * 10000n) / amountWei);
                  
                  if (netProfitUsd >= SCALPER_CONFIG.MIN_PROFIT_USD && spreadBps >= SCALPER_CONFIG.MIN_SPREAD_BPS) {
                    return {
                      chain: chainKey,
                      chainName: chain.name,
                      type: 'SCALP',
                      direction: 'WETH→USDC→WETH',
                      route: `Fee ${fee1/100}%→${fee2/100}%`,
                      amountIn: amountWei,
                      amountInEth: amountEth,
                      fee1,
                      fee2,
                      usdcIntermediate: usdcOut,
                      wethOut,
                      grossProfit,
                      netProfit,
                      netProfitUsd,
                      gasCostUsd,
                      spreadBps,
                      timestamp: Date.now(),
                      gasPrice: gasPriceGwei,
                      confidence: Math.min(100, spreadBps * 10)
                    };
                  }
                }
              } catch (e) {
                // Pool no existe o error de quote
              }
              return null;
            })()
          );
        }
      }
    }
    
    // Ejecutar todos los quotes en paralelo
    const results = await Promise.all(quotePromises);
    opportunities.push(...results.filter(r => r !== null));
    
  } catch (e) {
    // Error general de scan
  }
  
  return opportunities;
}

// ═══════════════════════════════════════════════════════════════════════════════
// EJECUCIÓN SCALPER - ENTRADA Y SALIDA INMEDIATA
// ═══════════════════════════════════════════════════════════════════════════════

async function executeScalp(opp) {
  if (activeTrades >= SCALPER_CONFIG.MAX_CONCURRENT_TRADES) {
    console.log(`[SCALP] ⚠️ Máximo trades activos (${activeTrades}), esperando...`);
    return null;
  }
  
  activeTrades++;
  const startTime = Date.now();
  const chain = CHAINS[opp.chain];
  const signer = signers[opp.chain];
  const provider = providers[opp.chain];
  const { router, weth } = contracts[opp.chain];
  
  console.log(`\n🔥 [SCALP] ═══════════════════════════════════════════════════════`);
  console.log(`   Chain: ${chain.name}`);
  console.log(`   Route: ${opp.route}`);
  console.log(`   Amount: ${opp.amountInEth} ETH`);
  console.log(`   Expected Profit: $${opp.netProfitUsd.toFixed(4)}`);
  console.log(`   Spread: ${opp.spreadBps} bps`);
  console.log(`   Gas: ${opp.gasPrice.toFixed(2)} gwei`);
  
  try {
    // Verificar balance
    const balance = await provider.getBalance(WALLET_ADDRESS);
    if (balance < opp.amountIn + ethers.parseEther('0.001')) {
      console.log(`   ❌ Balance insuficiente`);
      activeTrades--;
      return { success: false, error: 'Balance insuficiente' };
    }
    
    // ═══════════════════════════════════════════════════════════════════════════
    // PASO 1: WRAP ETH → WETH
    // ═══════════════════════════════════════════════════════════════════════════
    console.log(`   📦 [1/4] Wrapping ETH → WETH...`);
    const wrapTx = await weth.deposit({ 
      value: opp.amountIn,
      gasLimit: 50000
    });
    const wrapReceipt = await wrapTx.wait(1);
    console.log(`   ✅ Wrap completado: ${wrapReceipt.hash.slice(0, 16)}...`);
    
    // ═══════════════════════════════════════════════════════════════════════════
    // PASO 2: APPROVE WETH (si es necesario)
    // ═══════════════════════════════════════════════════════════════════════════
    const wethAllowance = await weth.allowance(WALLET_ADDRESS, chain.router);
    if (wethAllowance < opp.amountIn) {
      console.log(`   🔓 [2/4] Approving WETH...`);
      const approveTx = await weth.approve(chain.router, ethers.MaxUint256, { gasLimit: 50000 });
      await approveTx.wait(1);
      console.log(`   ✅ WETH approved`);
    } else {
      console.log(`   ✅ [2/4] WETH ya aprobado`);
    }
    
    // ═══════════════════════════════════════════════════════════════════════════
    // PASO 3: ENTRADA - SWAP WETH → USDC
    // ═══════════════════════════════════════════════════════════════════════════
    console.log(`   🔄 [3/4] ENTRADA: WETH → USDC...`);
    const minUsdc = (opp.usdcIntermediate * BigInt(10000 - SCALPER_CONFIG.MAX_SLIPPAGE_BPS)) / 10000n;
    
    const swap1Tx = await router.exactInputSingle({
      tokenIn: chain.tokens.WETH,
      tokenOut: chain.tokens.USDC,
      fee: opp.fee1,
      recipient: WALLET_ADDRESS,
      amountIn: opp.amountIn,
      amountOutMinimum: minUsdc,
      sqrtPriceLimitX96: 0n
    }, { gasLimit: 300000 });
    
    const swap1Receipt = await swap1Tx.wait(1);
    console.log(`   ✅ ENTRADA completada: ${swap1Receipt.hash.slice(0, 16)}...`);
    
    // Obtener balance USDC real
    const usdc = new ethers.Contract(chain.tokens.USDC, ERC20_ABI, signer);
    const usdcBalance = await usdc.balanceOf(WALLET_ADDRESS);
    console.log(`   💵 USDC recibido: ${ethers.formatUnits(usdcBalance, 6)}`);
    
    // ═══════════════════════════════════════════════════════════════════════════
    // PASO 4: SALIDA INMEDIATA - SWAP USDC → WETH
    // ═══════════════════════════════════════════════════════════════════════════
    console.log(`   🔄 [4/4] SALIDA: USDC → WETH...`);
    
    // Approve USDC si es necesario
    const usdcAllowance = await usdc.allowance(WALLET_ADDRESS, chain.router);
    if (usdcAllowance < usdcBalance) {
      const approveUsdcTx = await usdc.approve(chain.router, ethers.MaxUint256, { gasLimit: 50000 });
      await approveUsdcTx.wait(1);
    }
    
    const minWeth = (opp.wethOut * BigInt(10000 - SCALPER_CONFIG.MAX_SLIPPAGE_BPS)) / 10000n;
    
    const swap2Tx = await router.exactInputSingle({
      tokenIn: chain.tokens.USDC,
      tokenOut: chain.tokens.WETH,
      fee: opp.fee2,
      recipient: WALLET_ADDRESS,
      amountIn: usdcBalance,
      amountOutMinimum: minWeth,
      sqrtPriceLimitX96: 0n
    }, { gasLimit: 300000 });
    
    const swap2Receipt = await swap2Tx.wait(1);
    console.log(`   ✅ SALIDA completada: ${swap2Receipt.hash.slice(0, 16)}...`);
    
    // ═══════════════════════════════════════════════════════════════════════════
    // CALCULAR PROFIT REAL
    // ═══════════════════════════════════════════════════════════════════════════
    const finalWethBalance = await weth.balanceOf(WALLET_ADDRESS);
    const actualProfit = finalWethBalance - opp.amountIn;
    const actualProfitUsd = parseFloat(ethers.formatEther(actualProfit)) * SCALPER_CONFIG.ETH_PRICE_USD;
    
    // Calcular gas usado
    const gas1 = swap1Receipt.gasUsed * swap1Receipt.gasPrice;
    const gas2 = swap2Receipt.gasUsed * swap2Receipt.gasPrice;
    const totalGasWei = gas1 + gas2 + wrapReceipt.gasUsed * wrapReceipt.gasPrice;
    const totalGasUsd = parseFloat(ethers.formatEther(totalGasWei)) * SCALPER_CONFIG.ETH_PRICE_USD;
    
    const netProfitUsd = actualProfitUsd - totalGasUsd;
    const executionTime = Date.now() - startTime;
    
    console.log(`   ═══════════════════════════════════════════════════════`);
    console.log(`   💰 PROFIT BRUTO: $${actualProfitUsd.toFixed(4)}`);
    console.log(`   ⛽ GAS TOTAL: $${totalGasUsd.toFixed(4)}`);
    console.log(`   💵 PROFIT NETO: $${netProfitUsd.toFixed(4)}`);
    console.log(`   ⏱️  Tiempo: ${executionTime}ms`);
    console.log(`   🔗 TX: ${chain.explorer}/tx/${swap2Receipt.hash}`);
    console.log(`   ═══════════════════════════════════════════════════════\n`);
    
    activeTrades--;
    
    return {
      success: true,
      profitUsd: actualProfitUsd,
      gasUsd: totalGasUsd,
      netProfitUsd,
      txHash: swap2Receipt.hash,
      executionTimeMs: executionTime
    };
    
  } catch (e) {
    console.log(`   ❌ Error: ${e.message}`);
    activeTrades--;
    return { success: false, error: e.message };
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// LOOP PRINCIPAL SCALPER
// ═══════════════════════════════════════════════════════════════════════════════

async function scalperTick() {
  if (!state.isRunning) return;
  
  const tickStart = Date.now();
  state.stats.totalScans++;
  state.stats.uptime = Math.floor((Date.now() - state.startTime) / 1000);
  
  try {
    // ESCANEO PARALELO de todas las chains activas
    const activeChains = state.chains.filter(c => c.isActive).map(c => c.chain);
    
    let allOpportunities = [];
    
    if (SCALPER_CONFIG.PARALLEL_CHAIN_SCAN) {
      // Escanear todas las chains en paralelo
      const scanPromises = activeChains.map(chainKey => scalperScan(chainKey));
      const results = await Promise.all(scanPromises);
      allOpportunities = results.flat();
    } else {
      // Escanear secuencialmente (round-robin)
      const chainIndex = state.stats.totalScans % activeChains.length;
      const selectedChain = activeChains[chainIndex];
      allOpportunities = await scalperScan(selectedChain);
    }
    
    const scanTime = Date.now() - tickStart;
    scanTimes.push(scanTime);
    if (scanTimes.length > 100) scanTimes.shift();
    state.stats.avgScanTimeMs = Math.round(scanTimes.reduce((a, b) => a + b, 0) / scanTimes.length);
    state.stats.scansPerSecond = Math.round(1000 / state.stats.avgScanTimeMs * 10) / 10;
    
    if (allOpportunities.length > 0) {
      state.stats.opportunitiesFound += allOpportunities.length;
      
      // Ordenar por profit neto
      allOpportunities.sort((a, b) => b.netProfitUsd - a.netProfitUsd);
      
      // Guardar oportunidades para UI
      state.opportunities = [...allOpportunities.slice(0, 10), ...state.opportunities].slice(0, 50);
      state.stats.lastOpportunity = allOpportunities[0];
      
      const best = allOpportunities[0];
      
      console.log(`[SCAN #${state.stats.totalScans}] ${scanTime}ms | ${allOpportunities.length} opps | Best: $${best.netProfitUsd.toFixed(4)} on ${best.chainName}`);
      
      // EJECUTAR si no es dry run y auto-execute está activo
      if (!state.isDryRun && SCALPER_CONFIG.AUTO_EXECUTE && best.netProfitUsd >= SCALPER_CONFIG.MIN_PROFIT_USD) {
        state.stats.tradesAttempted++;
        
        const result = await executeScalp(best);
        
        if (result) {
          state.stats.tradesExecuted++;
          
          const tradeLog = {
            id: `scalp-${Date.now()}`,
            timestamp: Date.now(),
            chain: best.chain,
            chainName: best.chainName,
            type: 'SCALP',
            route: best.route,
            direction: best.direction,
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
          if (state.tradeLogs.length > 100) state.tradeLogs.pop();
          
          if (result.success) {
            state.stats.tradesSuccessful++;
            state.stats.totalProfitUsd += result.profitUsd;
            state.stats.totalGasUsd += result.gasUsd;
            state.stats.netProfitUsd = state.stats.totalProfitUsd - state.stats.totalGasUsd;
            state.stats.lastTrade = tradeLog;
            
            // Actualizar bandit
            const bandit = state.banditStates.find(b => b.chain === best.chain);
            if (bandit) {
              bandit.wins++;
              bandit.attempts++;
              bandit.alpha++;
              bandit.winRate = (bandit.wins / bandit.attempts) * 100;
              bandit.avgProfit = (bandit.avgProfit * (bandit.wins - 1) + result.netProfitUsd) / bandit.wins;
            }
            
            // Actualizar chain stats
            const chainState = state.chains.find(c => c.chain === best.chain);
            if (chainState) {
              chainState.tradesExecuted++;
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
      // Log periódico cuando no hay oportunidades
      if (state.stats.totalScans % 50 === 0) {
        console.log(`[SCAN #${state.stats.totalScans}] ${scanTime}ms | No profitable opportunities`);
      }
    }
    
    // Actualizar balances cada 100 scans
    if (state.stats.totalScans % 100 === 0) {
      await updateBalances();
    }
    
    // Actualizar chain stats
    for (const chainState of state.chains) {
      chainState.lastScan = Date.now();
      chainState.scansCompleted++;
    }
    
  } catch (e) {
    console.error(`[TICK] Error: ${e.message}`);
  }
}

async function updateBalances() {
  for (const chainState of state.chains) {
    try {
      const balance = await providers[chainState.chain].getBalance(WALLET_ADDRESS);
      const balanceEth = parseFloat(ethers.formatEther(balance));
      chainState.balance = balanceEth.toFixed(6);
      chainState.balanceUsd = balanceEth * SCALPER_CONFIG.ETH_PRICE_USD;
      chainState.isActive = balanceEth > 0.001;
    } catch (e) {
      // Error al obtener balance
    }
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
    return res.json({ success: false, error: 'Ya está corriendo', isRunning: true });
  }
  
  state.isDryRun = req.body?.dryRun === true;
  state.isRunning = true;
  state.startTime = Date.now();
  
  // Reset stats
  state.stats = {
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
    avgExecutionTimeMs: 0,
    scansPerSecond: 0,
    uptime: 0,
    currentChain: 'all',
    lastOpportunity: null,
    lastTrade: null
  };
  state.tradeLogs = [];
  state.opportunities = [];
  scanTimes = [];
  
  // Iniciar loop scalper
  if (timer) clearInterval(timer);
  timer = setInterval(scalperTick, SCALPER_CONFIG.SCAN_INTERVAL_MS);
  
  console.log(`\n[START] 🔥 SCALPER HTF iniciado - ${state.isDryRun ? 'DRY RUN' : '⚠️ MODO REAL'}`);
  console.log(`[CONFIG] Intervalo: ${SCALPER_CONFIG.SCAN_INTERVAL_MS}ms | Min profit: $${SCALPER_CONFIG.MIN_PROFIT_USD} | Parallel: ${SCALPER_CONFIG.PARALLEL_CHAIN_SCAN}`);
  
  res.json({
    success: true,
    isRunning: true,
    isDryRun: state.isDryRun,
    mode: 'SCALPER_HTF',
    config: SCALPER_CONFIG
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
    avgExecutionTimeMs: 0,
    scansPerSecond: 0,
    uptime: 0,
    currentChain: 'all',
    lastOpportunity: null,
    lastTrade: null
  };
  state.tradeLogs = [];
  state.opportunities = [];
  scanTimes = [];
  res.json({ success: true });
});

app.get('/api/defi/multichain-arb/health', (req, res) => {
  res.json({
    status: 'ok',
    mode: 'SCALPER_HTF',
    port: PORT,
    running: state.isRunning,
    dryRun: state.isDryRun,
    wallet: WALLET_ADDRESS,
    config: SCALPER_CONFIG,
    stats: {
      scansPerSecond: state.stats.scansPerSecond,
      opportunitiesFound: state.stats.opportunitiesFound,
      tradesExecuted: state.stats.tradesExecuted
    }
  });
});

app.get('/api/defi/multichain-arb/config', (req, res) => {
  res.json(SCALPER_CONFIG);
});

// ═══════════════════════════════════════════════════════════════════════════════
// INICIAR SERVIDOR
// ═══════════════════════════════════════════════════════════════════════════════

app.listen(PORT, async () => {
  console.log(`
╔═══════════════════════════════════════════════════════════════════════════════╗
║                                                                               ║
║   🔥 SCALPER HTF ARBITRAGE BOT                                                ║
║                                                                               ║
║   ✅ Puerto: ${PORT}                                                           ║
║   ✅ Wallet: ${WALLET_ADDRESS.slice(0, 10)}...${WALLET_ADDRESS.slice(-5)}                                  ║
║   ✅ Modo: SCALPER - Entrada/Salida Rápida                                    ║
║                                                                               ║
║   ⚡ Intervalo: ${SCALPER_CONFIG.SCAN_INTERVAL_MS}ms (${(1000/SCALPER_CONFIG.SCAN_INTERVAL_MS).toFixed(0)} scans/seg)                                ║
║   ⚡ Min Profit: $${SCALPER_CONFIG.MIN_PROFIT_USD}                                                ║
║   ⚡ Parallel Scan: ${SCALPER_CONFIG.PARALLEL_CHAIN_SCAN}                                             ║
║   ⚡ Auto Execute: ${SCALPER_CONFIG.AUTO_EXECUTE}                                              ║
║                                                                               ║
║   📊 Chains: Base, Arbitrum, Optimism                                         ║
║                                                                               ║
║   ⚠️  MODO SCALPER - Alta frecuencia de entrada/salida                        ║
║                                                                               ║
╚═══════════════════════════════════════════════════════════════════════════════╝
  `);
  
  await initConnections();
  await updateBalances();
  
  console.log('\n[READY] 🔥 Scalper listo. Usa POST /api/defi/multichain-arb/start para iniciar.\n');
});

process.on('SIGINT', () => {
  console.log('\n[EXIT] Cerrando scalper...');
  if (timer) clearInterval(timer);
  process.exit(0);
});



 * ═══════════════════════════════════════════════════════════════════════════════
 * 🔥 SCALPER HTF ARBITRAGE BOT - ENTRADA Y SALIDA ULTRA-RÁPIDA
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * Comportamiento SCALPER:
 * - Detecta oportunidad → ENTRA inmediatamente
 * - Ejecuta swap → SALE inmediatamente
 * - No mantiene posiciones
 * - Ciclo continuo de entrada/salida
 * - Escaneo paralelo de múltiples chains
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
// CONFIGURACIÓN SCALPER HTF
// ═══════════════════════════════════════════════════════════════════════════════

const SCALPER_CONFIG = {
  // VELOCIDAD
  SCAN_INTERVAL_MS: 200,           // 5 scans por segundo
  PARALLEL_CHAIN_SCAN: true,       // Escanear todas las chains simultáneamente
  
  // UMBRALES SCALPER
  MIN_PROFIT_USD: 0.005,           // $0.005 mínimo (muy bajo para capturar más)
  MIN_SPREAD_BPS: 1,               // 0.01% spread mínimo
  MAX_SLIPPAGE_BPS: 50,            // 0.5% slippage máximo
  
  // CANTIDADES (pequeñas para entrada/salida rápida)
  TRADE_AMOUNTS_ETH: [0.001, 0.002, 0.003, 0.005, 0.008, 0.01],
  
  // FEE TIERS
  FEE_TIERS: [100, 500, 3000, 10000],
  
  // EJECUCIÓN
  AUTO_EXECUTE: true,
  IMMEDIATE_EXIT: true,            // Salir inmediatamente después de entrar
  MAX_CONCURRENT_TRADES: 3,        // Máximo trades simultáneos
  
  // GAS
  GAS_MULTIPLIER: 1.2,             // Gas más bajo para velocidad
  MAX_GAS_GWEI: 5,                 // Máximo gas en gwei
  
  // PRECIO ETH
  ETH_PRICE_USD: 3500
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
      USDC: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
      USDbC: '0xd9aAEc86B65D86f6A7B5B1b0c42FFA531710b6CA'
    },
    quoter: '0x3d4e44Eb1374240CE5F1B871ab261CD16335B76a',
    router: '0x2626664c2603336E57B271c5C0b26F421741e481',
    priority: 1  // Más prioridad
  },
  arbitrum: {
    name: 'Arbitrum',
    chainId: 42161,
    rpc: 'https://arb1.arbitrum.io/rpc',
    explorer: 'https://arbiscan.io',
    tokens: {
      WETH: '0x82aF49447D8a07e3bd95BD0d56f35241523fBab1',
      USDC: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831',
      USDT: '0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9'
    },
    quoter: '0x61fFE014bA17989E743c5F6cB21bF9697530B21e',
    router: '0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45',
    priority: 2
  },
  optimism: {
    name: 'Optimism',
    chainId: 10,
    rpc: 'https://mainnet.optimism.io',
    explorer: 'https://optimistic.etherscan.io',
    tokens: {
      WETH: '0x4200000000000000000000000000000000000006',
      USDC: '0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85',
      USDT: '0x94b008aA00579c1307B0EF2c499aD98a8ce58e58'
    },
    quoter: '0x61fFE014bA17989E743c5F6cB21bF9697530B21e',
    router: '0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45',
    priority: 3
  }
};

// ABIs
const QUOTER_ABI = [
  'function quoteExactInputSingle((address tokenIn, address tokenOut, uint256 amountIn, uint24 fee, uint160 sqrtPriceLimitX96)) external returns (uint256 amountOut, uint160 sqrtPriceX96After, uint32 initializedTicksCrossed, uint256 gasEstimate)'
];

const ROUTER_ABI = [
  'function exactInputSingle((address tokenIn, address tokenOut, uint24 fee, address recipient, uint256 amountIn, uint256 amountOutMinimum, uint160 sqrtPriceLimitX96)) external payable returns (uint256 amountOut)',
  'function multicall(uint256 deadline, bytes[] calldata data) external payable returns (bytes[] memory results)',
  'function unwrapWETH9(uint256 amountMinimum, address recipient) external payable'
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
  'function allowance(address owner, address spender) view returns (uint256)',
  'function decimals() view returns (uint8)'
];

// ═══════════════════════════════════════════════════════════════════════════════
// ESTADO DEL SCALPER
// ═══════════════════════════════════════════════════════════════════════════════

let state = {
  isRunning: false,
  isDryRun: false,
  startTime: null,
  mode: 'SCALPER_HTF',
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
    avgExecutionTimeMs: 0,
    scansPerSecond: 0,
    uptime: 0,
    currentChain: 'all',
    lastOpportunity: null,
    lastTrade: null
  },
  chains: [],
  tradeLogs: [],
  opportunities: [],
  banditStates: [],
  activePositions: [],
  scanHistory: []
};

let timer = null;
let providers = {};
let signers = {};
let contracts = {};
let activeTrades = 0;
let scanTimes = [];

// ═══════════════════════════════════════════════════════════════════════════════
// INICIALIZAR CONEXIONES
// ═══════════════════════════════════════════════════════════════════════════════

async function initConnections() {
  console.log('[INIT] 🔌 Inicializando conexiones a chains...');
  
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
        balanceUsd: balanceEth * SCALPER_CONFIG.ETH_PRICE_USD,
        routes: SCALPER_CONFIG.FEE_TIERS.length * SCALPER_CONFIG.TRADE_AMOUNTS_ETH.length,
        isActive: balanceEth > 0.001,
        lastScan: Date.now(),
        scansCompleted: 0,
        opportunitiesFound: 0,
        tradesExecuted: 0,
        explorer: chain.explorer,
        priority: chain.priority
      });
      
      state.banditStates.push({
        chain: key,
        alpha: 2,
        beta: 2,
        winRate: 50,
        selected: key === 'base',
        attempts: 0,
        wins: 0,
        avgProfit: 0
      });
      
      console.log(`[INIT] ✅ ${chain.name}: ${balanceEth.toFixed(6)} ETH ($${(balanceEth * SCALPER_CONFIG.ETH_PRICE_USD).toFixed(2)})`);
    } catch (e) {
      console.error(`[INIT] ❌ ${chain.name}: ${e.message}`);
    }
  }
  
  // Ordenar chains por prioridad
  state.chains.sort((a, b) => CHAINS[a.chain].priority - CHAINS[b.chain].priority);
}

// ═══════════════════════════════════════════════════════════════════════════════
// ESCANEO SCALPER - PARALELO Y ULTRA-RÁPIDO
// ═══════════════════════════════════════════════════════════════════════════════

async function scalperScan(chainKey) {
  const chain = CHAINS[chainKey];
  const provider = providers[chainKey];
  const quoter = contracts[chainKey].quoter;
  const opportunities = [];
  
  try {
    // Obtener gas price actual
    const feeData = await provider.getFeeData();
    const gasPrice = feeData.gasPrice || ethers.parseUnits('0.001', 'gwei');
    const gasPriceGwei = parseFloat(ethers.formatUnits(gasPrice, 'gwei'));
    
    // Si gas muy alto, saltar
    if (gasPriceGwei > SCALPER_CONFIG.MAX_GAS_GWEI) {
      return [];
    }
    
    const gasCostWei = gasPrice * 250000n; // Estimado para swap completo
    const gasCostUsd = parseFloat(ethers.formatEther(gasCostWei)) * SCALPER_CONFIG.ETH_PRICE_USD;
    
    // Generar todas las combinaciones de quotes
    const quotePromises = [];
    
    for (const amountEth of SCALPER_CONFIG.TRADE_AMOUNTS_ETH) {
      const amountWei = ethers.parseEther(amountEth.toString());
      
      for (let i = 0; i < SCALPER_CONFIG.FEE_TIERS.length; i++) {
        for (let j = 0; j < SCALPER_CONFIG.FEE_TIERS.length; j++) {
          // Probar diferentes combinaciones de fee tiers
          const fee1 = SCALPER_CONFIG.FEE_TIERS[i];
          const fee2 = SCALPER_CONFIG.FEE_TIERS[j];
          
          quotePromises.push(
            (async () => {
              try {
                // ENTRADA: WETH → USDC
                const quote1 = await quoter.quoteExactInputSingle.staticCall({
                  tokenIn: chain.tokens.WETH,
                  tokenOut: chain.tokens.USDC,
                  amountIn: amountWei,
                  fee: fee1,
                  sqrtPriceLimitX96: 0n
                });
                const usdcOut = quote1[0];
                
                // SALIDA: USDC → WETH
                const quote2 = await quoter.quoteExactInputSingle.staticCall({
                  tokenIn: chain.tokens.USDC,
                  tokenOut: chain.tokens.WETH,
                  amountIn: usdcOut,
                  fee: fee2,
                  sqrtPriceLimitX96: 0n
                });
                const wethOut = quote2[0];
                
                // Calcular profit
                const grossProfit = wethOut - amountWei;
                const netProfit = grossProfit - gasCostWei;
                
                if (netProfit > 0n) {
                  const netProfitUsd = parseFloat(ethers.formatEther(netProfit)) * SCALPER_CONFIG.ETH_PRICE_USD;
                  const spreadBps = Number((grossProfit * 10000n) / amountWei);
                  
                  if (netProfitUsd >= SCALPER_CONFIG.MIN_PROFIT_USD && spreadBps >= SCALPER_CONFIG.MIN_SPREAD_BPS) {
                    return {
                      chain: chainKey,
                      chainName: chain.name,
                      type: 'SCALP',
                      direction: 'WETH→USDC→WETH',
                      route: `Fee ${fee1/100}%→${fee2/100}%`,
                      amountIn: amountWei,
                      amountInEth: amountEth,
                      fee1,
                      fee2,
                      usdcIntermediate: usdcOut,
                      wethOut,
                      grossProfit,
                      netProfit,
                      netProfitUsd,
                      gasCostUsd,
                      spreadBps,
                      timestamp: Date.now(),
                      gasPrice: gasPriceGwei,
                      confidence: Math.min(100, spreadBps * 10)
                    };
                  }
                }
              } catch (e) {
                // Pool no existe o error de quote
              }
              return null;
            })()
          );
        }
      }
    }
    
    // Ejecutar todos los quotes en paralelo
    const results = await Promise.all(quotePromises);
    opportunities.push(...results.filter(r => r !== null));
    
  } catch (e) {
    // Error general de scan
  }
  
  return opportunities;
}

// ═══════════════════════════════════════════════════════════════════════════════
// EJECUCIÓN SCALPER - ENTRADA Y SALIDA INMEDIATA
// ═══════════════════════════════════════════════════════════════════════════════

async function executeScalp(opp) {
  if (activeTrades >= SCALPER_CONFIG.MAX_CONCURRENT_TRADES) {
    console.log(`[SCALP] ⚠️ Máximo trades activos (${activeTrades}), esperando...`);
    return null;
  }
  
  activeTrades++;
  const startTime = Date.now();
  const chain = CHAINS[opp.chain];
  const signer = signers[opp.chain];
  const provider = providers[opp.chain];
  const { router, weth } = contracts[opp.chain];
  
  console.log(`\n🔥 [SCALP] ═══════════════════════════════════════════════════════`);
  console.log(`   Chain: ${chain.name}`);
  console.log(`   Route: ${opp.route}`);
  console.log(`   Amount: ${opp.amountInEth} ETH`);
  console.log(`   Expected Profit: $${opp.netProfitUsd.toFixed(4)}`);
  console.log(`   Spread: ${opp.spreadBps} bps`);
  console.log(`   Gas: ${opp.gasPrice.toFixed(2)} gwei`);
  
  try {
    // Verificar balance
    const balance = await provider.getBalance(WALLET_ADDRESS);
    if (balance < opp.amountIn + ethers.parseEther('0.001')) {
      console.log(`   ❌ Balance insuficiente`);
      activeTrades--;
      return { success: false, error: 'Balance insuficiente' };
    }
    
    // ═══════════════════════════════════════════════════════════════════════════
    // PASO 1: WRAP ETH → WETH
    // ═══════════════════════════════════════════════════════════════════════════
    console.log(`   📦 [1/4] Wrapping ETH → WETH...`);
    const wrapTx = await weth.deposit({ 
      value: opp.amountIn,
      gasLimit: 50000
    });
    const wrapReceipt = await wrapTx.wait(1);
    console.log(`   ✅ Wrap completado: ${wrapReceipt.hash.slice(0, 16)}...`);
    
    // ═══════════════════════════════════════════════════════════════════════════
    // PASO 2: APPROVE WETH (si es necesario)
    // ═══════════════════════════════════════════════════════════════════════════
    const wethAllowance = await weth.allowance(WALLET_ADDRESS, chain.router);
    if (wethAllowance < opp.amountIn) {
      console.log(`   🔓 [2/4] Approving WETH...`);
      const approveTx = await weth.approve(chain.router, ethers.MaxUint256, { gasLimit: 50000 });
      await approveTx.wait(1);
      console.log(`   ✅ WETH approved`);
    } else {
      console.log(`   ✅ [2/4] WETH ya aprobado`);
    }
    
    // ═══════════════════════════════════════════════════════════════════════════
    // PASO 3: ENTRADA - SWAP WETH → USDC
    // ═══════════════════════════════════════════════════════════════════════════
    console.log(`   🔄 [3/4] ENTRADA: WETH → USDC...`);
    const minUsdc = (opp.usdcIntermediate * BigInt(10000 - SCALPER_CONFIG.MAX_SLIPPAGE_BPS)) / 10000n;
    
    const swap1Tx = await router.exactInputSingle({
      tokenIn: chain.tokens.WETH,
      tokenOut: chain.tokens.USDC,
      fee: opp.fee1,
      recipient: WALLET_ADDRESS,
      amountIn: opp.amountIn,
      amountOutMinimum: minUsdc,
      sqrtPriceLimitX96: 0n
    }, { gasLimit: 300000 });
    
    const swap1Receipt = await swap1Tx.wait(1);
    console.log(`   ✅ ENTRADA completada: ${swap1Receipt.hash.slice(0, 16)}...`);
    
    // Obtener balance USDC real
    const usdc = new ethers.Contract(chain.tokens.USDC, ERC20_ABI, signer);
    const usdcBalance = await usdc.balanceOf(WALLET_ADDRESS);
    console.log(`   💵 USDC recibido: ${ethers.formatUnits(usdcBalance, 6)}`);
    
    // ═══════════════════════════════════════════════════════════════════════════
    // PASO 4: SALIDA INMEDIATA - SWAP USDC → WETH
    // ═══════════════════════════════════════════════════════════════════════════
    console.log(`   🔄 [4/4] SALIDA: USDC → WETH...`);
    
    // Approve USDC si es necesario
    const usdcAllowance = await usdc.allowance(WALLET_ADDRESS, chain.router);
    if (usdcAllowance < usdcBalance) {
      const approveUsdcTx = await usdc.approve(chain.router, ethers.MaxUint256, { gasLimit: 50000 });
      await approveUsdcTx.wait(1);
    }
    
    const minWeth = (opp.wethOut * BigInt(10000 - SCALPER_CONFIG.MAX_SLIPPAGE_BPS)) / 10000n;
    
    const swap2Tx = await router.exactInputSingle({
      tokenIn: chain.tokens.USDC,
      tokenOut: chain.tokens.WETH,
      fee: opp.fee2,
      recipient: WALLET_ADDRESS,
      amountIn: usdcBalance,
      amountOutMinimum: minWeth,
      sqrtPriceLimitX96: 0n
    }, { gasLimit: 300000 });
    
    const swap2Receipt = await swap2Tx.wait(1);
    console.log(`   ✅ SALIDA completada: ${swap2Receipt.hash.slice(0, 16)}...`);
    
    // ═══════════════════════════════════════════════════════════════════════════
    // CALCULAR PROFIT REAL
    // ═══════════════════════════════════════════════════════════════════════════
    const finalWethBalance = await weth.balanceOf(WALLET_ADDRESS);
    const actualProfit = finalWethBalance - opp.amountIn;
    const actualProfitUsd = parseFloat(ethers.formatEther(actualProfit)) * SCALPER_CONFIG.ETH_PRICE_USD;
    
    // Calcular gas usado
    const gas1 = swap1Receipt.gasUsed * swap1Receipt.gasPrice;
    const gas2 = swap2Receipt.gasUsed * swap2Receipt.gasPrice;
    const totalGasWei = gas1 + gas2 + wrapReceipt.gasUsed * wrapReceipt.gasPrice;
    const totalGasUsd = parseFloat(ethers.formatEther(totalGasWei)) * SCALPER_CONFIG.ETH_PRICE_USD;
    
    const netProfitUsd = actualProfitUsd - totalGasUsd;
    const executionTime = Date.now() - startTime;
    
    console.log(`   ═══════════════════════════════════════════════════════`);
    console.log(`   💰 PROFIT BRUTO: $${actualProfitUsd.toFixed(4)}`);
    console.log(`   ⛽ GAS TOTAL: $${totalGasUsd.toFixed(4)}`);
    console.log(`   💵 PROFIT NETO: $${netProfitUsd.toFixed(4)}`);
    console.log(`   ⏱️  Tiempo: ${executionTime}ms`);
    console.log(`   🔗 TX: ${chain.explorer}/tx/${swap2Receipt.hash}`);
    console.log(`   ═══════════════════════════════════════════════════════\n`);
    
    activeTrades--;
    
    return {
      success: true,
      profitUsd: actualProfitUsd,
      gasUsd: totalGasUsd,
      netProfitUsd,
      txHash: swap2Receipt.hash,
      executionTimeMs: executionTime
    };
    
  } catch (e) {
    console.log(`   ❌ Error: ${e.message}`);
    activeTrades--;
    return { success: false, error: e.message };
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// LOOP PRINCIPAL SCALPER
// ═══════════════════════════════════════════════════════════════════════════════

async function scalperTick() {
  if (!state.isRunning) return;
  
  const tickStart = Date.now();
  state.stats.totalScans++;
  state.stats.uptime = Math.floor((Date.now() - state.startTime) / 1000);
  
  try {
    // ESCANEO PARALELO de todas las chains activas
    const activeChains = state.chains.filter(c => c.isActive).map(c => c.chain);
    
    let allOpportunities = [];
    
    if (SCALPER_CONFIG.PARALLEL_CHAIN_SCAN) {
      // Escanear todas las chains en paralelo
      const scanPromises = activeChains.map(chainKey => scalperScan(chainKey));
      const results = await Promise.all(scanPromises);
      allOpportunities = results.flat();
    } else {
      // Escanear secuencialmente (round-robin)
      const chainIndex = state.stats.totalScans % activeChains.length;
      const selectedChain = activeChains[chainIndex];
      allOpportunities = await scalperScan(selectedChain);
    }
    
    const scanTime = Date.now() - tickStart;
    scanTimes.push(scanTime);
    if (scanTimes.length > 100) scanTimes.shift();
    state.stats.avgScanTimeMs = Math.round(scanTimes.reduce((a, b) => a + b, 0) / scanTimes.length);
    state.stats.scansPerSecond = Math.round(1000 / state.stats.avgScanTimeMs * 10) / 10;
    
    if (allOpportunities.length > 0) {
      state.stats.opportunitiesFound += allOpportunities.length;
      
      // Ordenar por profit neto
      allOpportunities.sort((a, b) => b.netProfitUsd - a.netProfitUsd);
      
      // Guardar oportunidades para UI
      state.opportunities = [...allOpportunities.slice(0, 10), ...state.opportunities].slice(0, 50);
      state.stats.lastOpportunity = allOpportunities[0];
      
      const best = allOpportunities[0];
      
      console.log(`[SCAN #${state.stats.totalScans}] ${scanTime}ms | ${allOpportunities.length} opps | Best: $${best.netProfitUsd.toFixed(4)} on ${best.chainName}`);
      
      // EJECUTAR si no es dry run y auto-execute está activo
      if (!state.isDryRun && SCALPER_CONFIG.AUTO_EXECUTE && best.netProfitUsd >= SCALPER_CONFIG.MIN_PROFIT_USD) {
        state.stats.tradesAttempted++;
        
        const result = await executeScalp(best);
        
        if (result) {
          state.stats.tradesExecuted++;
          
          const tradeLog = {
            id: `scalp-${Date.now()}`,
            timestamp: Date.now(),
            chain: best.chain,
            chainName: best.chainName,
            type: 'SCALP',
            route: best.route,
            direction: best.direction,
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
          if (state.tradeLogs.length > 100) state.tradeLogs.pop();
          
          if (result.success) {
            state.stats.tradesSuccessful++;
            state.stats.totalProfitUsd += result.profitUsd;
            state.stats.totalGasUsd += result.gasUsd;
            state.stats.netProfitUsd = state.stats.totalProfitUsd - state.stats.totalGasUsd;
            state.stats.lastTrade = tradeLog;
            
            // Actualizar bandit
            const bandit = state.banditStates.find(b => b.chain === best.chain);
            if (bandit) {
              bandit.wins++;
              bandit.attempts++;
              bandit.alpha++;
              bandit.winRate = (bandit.wins / bandit.attempts) * 100;
              bandit.avgProfit = (bandit.avgProfit * (bandit.wins - 1) + result.netProfitUsd) / bandit.wins;
            }
            
            // Actualizar chain stats
            const chainState = state.chains.find(c => c.chain === best.chain);
            if (chainState) {
              chainState.tradesExecuted++;
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
      // Log periódico cuando no hay oportunidades
      if (state.stats.totalScans % 50 === 0) {
        console.log(`[SCAN #${state.stats.totalScans}] ${scanTime}ms | No profitable opportunities`);
      }
    }
    
    // Actualizar balances cada 100 scans
    if (state.stats.totalScans % 100 === 0) {
      await updateBalances();
    }
    
    // Actualizar chain stats
    for (const chainState of state.chains) {
      chainState.lastScan = Date.now();
      chainState.scansCompleted++;
    }
    
  } catch (e) {
    console.error(`[TICK] Error: ${e.message}`);
  }
}

async function updateBalances() {
  for (const chainState of state.chains) {
    try {
      const balance = await providers[chainState.chain].getBalance(WALLET_ADDRESS);
      const balanceEth = parseFloat(ethers.formatEther(balance));
      chainState.balance = balanceEth.toFixed(6);
      chainState.balanceUsd = balanceEth * SCALPER_CONFIG.ETH_PRICE_USD;
      chainState.isActive = balanceEth > 0.001;
    } catch (e) {
      // Error al obtener balance
    }
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
    return res.json({ success: false, error: 'Ya está corriendo', isRunning: true });
  }
  
  state.isDryRun = req.body?.dryRun === true;
  state.isRunning = true;
  state.startTime = Date.now();
  
  // Reset stats
  state.stats = {
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
    avgExecutionTimeMs: 0,
    scansPerSecond: 0,
    uptime: 0,
    currentChain: 'all',
    lastOpportunity: null,
    lastTrade: null
  };
  state.tradeLogs = [];
  state.opportunities = [];
  scanTimes = [];
  
  // Iniciar loop scalper
  if (timer) clearInterval(timer);
  timer = setInterval(scalperTick, SCALPER_CONFIG.SCAN_INTERVAL_MS);
  
  console.log(`\n[START] 🔥 SCALPER HTF iniciado - ${state.isDryRun ? 'DRY RUN' : '⚠️ MODO REAL'}`);
  console.log(`[CONFIG] Intervalo: ${SCALPER_CONFIG.SCAN_INTERVAL_MS}ms | Min profit: $${SCALPER_CONFIG.MIN_PROFIT_USD} | Parallel: ${SCALPER_CONFIG.PARALLEL_CHAIN_SCAN}`);
  
  res.json({
    success: true,
    isRunning: true,
    isDryRun: state.isDryRun,
    mode: 'SCALPER_HTF',
    config: SCALPER_CONFIG
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
    avgExecutionTimeMs: 0,
    scansPerSecond: 0,
    uptime: 0,
    currentChain: 'all',
    lastOpportunity: null,
    lastTrade: null
  };
  state.tradeLogs = [];
  state.opportunities = [];
  scanTimes = [];
  res.json({ success: true });
});

app.get('/api/defi/multichain-arb/health', (req, res) => {
  res.json({
    status: 'ok',
    mode: 'SCALPER_HTF',
    port: PORT,
    running: state.isRunning,
    dryRun: state.isDryRun,
    wallet: WALLET_ADDRESS,
    config: SCALPER_CONFIG,
    stats: {
      scansPerSecond: state.stats.scansPerSecond,
      opportunitiesFound: state.stats.opportunitiesFound,
      tradesExecuted: state.stats.tradesExecuted
    }
  });
});

app.get('/api/defi/multichain-arb/config', (req, res) => {
  res.json(SCALPER_CONFIG);
});

// ═══════════════════════════════════════════════════════════════════════════════
// INICIAR SERVIDOR
// ═══════════════════════════════════════════════════════════════════════════════

app.listen(PORT, async () => {
  console.log(`
╔═══════════════════════════════════════════════════════════════════════════════╗
║                                                                               ║
║   🔥 SCALPER HTF ARBITRAGE BOT                                                ║
║                                                                               ║
║   ✅ Puerto: ${PORT}                                                           ║
║   ✅ Wallet: ${WALLET_ADDRESS.slice(0, 10)}...${WALLET_ADDRESS.slice(-5)}                                  ║
║   ✅ Modo: SCALPER - Entrada/Salida Rápida                                    ║
║                                                                               ║
║   ⚡ Intervalo: ${SCALPER_CONFIG.SCAN_INTERVAL_MS}ms (${(1000/SCALPER_CONFIG.SCAN_INTERVAL_MS).toFixed(0)} scans/seg)                                ║
║   ⚡ Min Profit: $${SCALPER_CONFIG.MIN_PROFIT_USD}                                                ║
║   ⚡ Parallel Scan: ${SCALPER_CONFIG.PARALLEL_CHAIN_SCAN}                                             ║
║   ⚡ Auto Execute: ${SCALPER_CONFIG.AUTO_EXECUTE}                                              ║
║                                                                               ║
║   📊 Chains: Base, Arbitrum, Optimism                                         ║
║                                                                               ║
║   ⚠️  MODO SCALPER - Alta frecuencia de entrada/salida                        ║
║                                                                               ║
╚═══════════════════════════════════════════════════════════════════════════════╝
  `);
  
  await initConnections();
  await updateBalances();
  
  console.log('\n[READY] 🔥 Scalper listo. Usa POST /api/defi/multichain-arb/start para iniciar.\n');
});

process.on('SIGINT', () => {
  console.log('\n[EXIT] Cerrando scalper...');
  if (timer) clearInterval(timer);
  process.exit(0);
});


 * ═══════════════════════════════════════════════════════════════════════════════
 * 🔥 SCALPER HTF ARBITRAGE BOT - ENTRADA Y SALIDA ULTRA-RÁPIDA
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * Comportamiento SCALPER:
 * - Detecta oportunidad → ENTRA inmediatamente
 * - Ejecuta swap → SALE inmediatamente
 * - No mantiene posiciones
 * - Ciclo continuo de entrada/salida
 * - Escaneo paralelo de múltiples chains
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
// CONFIGURACIÓN SCALPER HTF
// ═══════════════════════════════════════════════════════════════════════════════

const SCALPER_CONFIG = {
  // VELOCIDAD
  SCAN_INTERVAL_MS: 200,           // 5 scans por segundo
  PARALLEL_CHAIN_SCAN: true,       // Escanear todas las chains simultáneamente
  
  // UMBRALES SCALPER
  MIN_PROFIT_USD: 0.005,           // $0.005 mínimo (muy bajo para capturar más)
  MIN_SPREAD_BPS: 1,               // 0.01% spread mínimo
  MAX_SLIPPAGE_BPS: 50,            // 0.5% slippage máximo
  
  // CANTIDADES (pequeñas para entrada/salida rápida)
  TRADE_AMOUNTS_ETH: [0.001, 0.002, 0.003, 0.005, 0.008, 0.01],
  
  // FEE TIERS
  FEE_TIERS: [100, 500, 3000, 10000],
  
  // EJECUCIÓN
  AUTO_EXECUTE: true,
  IMMEDIATE_EXIT: true,            // Salir inmediatamente después de entrar
  MAX_CONCURRENT_TRADES: 3,        // Máximo trades simultáneos
  
  // GAS
  GAS_MULTIPLIER: 1.2,             // Gas más bajo para velocidad
  MAX_GAS_GWEI: 5,                 // Máximo gas en gwei
  
  // PRECIO ETH
  ETH_PRICE_USD: 3500
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
      USDC: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
      USDbC: '0xd9aAEc86B65D86f6A7B5B1b0c42FFA531710b6CA'
    },
    quoter: '0x3d4e44Eb1374240CE5F1B871ab261CD16335B76a',
    router: '0x2626664c2603336E57B271c5C0b26F421741e481',
    priority: 1  // Más prioridad
  },
  arbitrum: {
    name: 'Arbitrum',
    chainId: 42161,
    rpc: 'https://arb1.arbitrum.io/rpc',
    explorer: 'https://arbiscan.io',
    tokens: {
      WETH: '0x82aF49447D8a07e3bd95BD0d56f35241523fBab1',
      USDC: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831',
      USDT: '0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9'
    },
    quoter: '0x61fFE014bA17989E743c5F6cB21bF9697530B21e',
    router: '0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45',
    priority: 2
  },
  optimism: {
    name: 'Optimism',
    chainId: 10,
    rpc: 'https://mainnet.optimism.io',
    explorer: 'https://optimistic.etherscan.io',
    tokens: {
      WETH: '0x4200000000000000000000000000000000000006',
      USDC: '0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85',
      USDT: '0x94b008aA00579c1307B0EF2c499aD98a8ce58e58'
    },
    quoter: '0x61fFE014bA17989E743c5F6cB21bF9697530B21e',
    router: '0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45',
    priority: 3
  }
};

// ABIs
const QUOTER_ABI = [
  'function quoteExactInputSingle((address tokenIn, address tokenOut, uint256 amountIn, uint24 fee, uint160 sqrtPriceLimitX96)) external returns (uint256 amountOut, uint160 sqrtPriceX96After, uint32 initializedTicksCrossed, uint256 gasEstimate)'
];

const ROUTER_ABI = [
  'function exactInputSingle((address tokenIn, address tokenOut, uint24 fee, address recipient, uint256 amountIn, uint256 amountOutMinimum, uint160 sqrtPriceLimitX96)) external payable returns (uint256 amountOut)',
  'function multicall(uint256 deadline, bytes[] calldata data) external payable returns (bytes[] memory results)',
  'function unwrapWETH9(uint256 amountMinimum, address recipient) external payable'
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
  'function allowance(address owner, address spender) view returns (uint256)',
  'function decimals() view returns (uint8)'
];

// ═══════════════════════════════════════════════════════════════════════════════
// ESTADO DEL SCALPER
// ═══════════════════════════════════════════════════════════════════════════════

let state = {
  isRunning: false,
  isDryRun: false,
  startTime: null,
  mode: 'SCALPER_HTF',
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
    avgExecutionTimeMs: 0,
    scansPerSecond: 0,
    uptime: 0,
    currentChain: 'all',
    lastOpportunity: null,
    lastTrade: null
  },
  chains: [],
  tradeLogs: [],
  opportunities: [],
  banditStates: [],
  activePositions: [],
  scanHistory: []
};

let timer = null;
let providers = {};
let signers = {};
let contracts = {};
let activeTrades = 0;
let scanTimes = [];

// ═══════════════════════════════════════════════════════════════════════════════
// INICIALIZAR CONEXIONES
// ═══════════════════════════════════════════════════════════════════════════════

async function initConnections() {
  console.log('[INIT] 🔌 Inicializando conexiones a chains...');
  
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
        balanceUsd: balanceEth * SCALPER_CONFIG.ETH_PRICE_USD,
        routes: SCALPER_CONFIG.FEE_TIERS.length * SCALPER_CONFIG.TRADE_AMOUNTS_ETH.length,
        isActive: balanceEth > 0.001,
        lastScan: Date.now(),
        scansCompleted: 0,
        opportunitiesFound: 0,
        tradesExecuted: 0,
        explorer: chain.explorer,
        priority: chain.priority
      });
      
      state.banditStates.push({
        chain: key,
        alpha: 2,
        beta: 2,
        winRate: 50,
        selected: key === 'base',
        attempts: 0,
        wins: 0,
        avgProfit: 0
      });
      
      console.log(`[INIT] ✅ ${chain.name}: ${balanceEth.toFixed(6)} ETH ($${(balanceEth * SCALPER_CONFIG.ETH_PRICE_USD).toFixed(2)})`);
    } catch (e) {
      console.error(`[INIT] ❌ ${chain.name}: ${e.message}`);
    }
  }
  
  // Ordenar chains por prioridad
  state.chains.sort((a, b) => CHAINS[a.chain].priority - CHAINS[b.chain].priority);
}

// ═══════════════════════════════════════════════════════════════════════════════
// ESCANEO SCALPER - PARALELO Y ULTRA-RÁPIDO
// ═══════════════════════════════════════════════════════════════════════════════

async function scalperScan(chainKey) {
  const chain = CHAINS[chainKey];
  const provider = providers[chainKey];
  const quoter = contracts[chainKey].quoter;
  const opportunities = [];
  
  try {
    // Obtener gas price actual
    const feeData = await provider.getFeeData();
    const gasPrice = feeData.gasPrice || ethers.parseUnits('0.001', 'gwei');
    const gasPriceGwei = parseFloat(ethers.formatUnits(gasPrice, 'gwei'));
    
    // Si gas muy alto, saltar
    if (gasPriceGwei > SCALPER_CONFIG.MAX_GAS_GWEI) {
      return [];
    }
    
    const gasCostWei = gasPrice * 250000n; // Estimado para swap completo
    const gasCostUsd = parseFloat(ethers.formatEther(gasCostWei)) * SCALPER_CONFIG.ETH_PRICE_USD;
    
    // Generar todas las combinaciones de quotes
    const quotePromises = [];
    
    for (const amountEth of SCALPER_CONFIG.TRADE_AMOUNTS_ETH) {
      const amountWei = ethers.parseEther(amountEth.toString());
      
      for (let i = 0; i < SCALPER_CONFIG.FEE_TIERS.length; i++) {
        for (let j = 0; j < SCALPER_CONFIG.FEE_TIERS.length; j++) {
          // Probar diferentes combinaciones de fee tiers
          const fee1 = SCALPER_CONFIG.FEE_TIERS[i];
          const fee2 = SCALPER_CONFIG.FEE_TIERS[j];
          
          quotePromises.push(
            (async () => {
              try {
                // ENTRADA: WETH → USDC
                const quote1 = await quoter.quoteExactInputSingle.staticCall({
                  tokenIn: chain.tokens.WETH,
                  tokenOut: chain.tokens.USDC,
                  amountIn: amountWei,
                  fee: fee1,
                  sqrtPriceLimitX96: 0n
                });
                const usdcOut = quote1[0];
                
                // SALIDA: USDC → WETH
                const quote2 = await quoter.quoteExactInputSingle.staticCall({
                  tokenIn: chain.tokens.USDC,
                  tokenOut: chain.tokens.WETH,
                  amountIn: usdcOut,
                  fee: fee2,
                  sqrtPriceLimitX96: 0n
                });
                const wethOut = quote2[0];
                
                // Calcular profit
                const grossProfit = wethOut - amountWei;
                const netProfit = grossProfit - gasCostWei;
                
                if (netProfit > 0n) {
                  const netProfitUsd = parseFloat(ethers.formatEther(netProfit)) * SCALPER_CONFIG.ETH_PRICE_USD;
                  const spreadBps = Number((grossProfit * 10000n) / amountWei);
                  
                  if (netProfitUsd >= SCALPER_CONFIG.MIN_PROFIT_USD && spreadBps >= SCALPER_CONFIG.MIN_SPREAD_BPS) {
                    return {
                      chain: chainKey,
                      chainName: chain.name,
                      type: 'SCALP',
                      direction: 'WETH→USDC→WETH',
                      route: `Fee ${fee1/100}%→${fee2/100}%`,
                      amountIn: amountWei,
                      amountInEth: amountEth,
                      fee1,
                      fee2,
                      usdcIntermediate: usdcOut,
                      wethOut,
                      grossProfit,
                      netProfit,
                      netProfitUsd,
                      gasCostUsd,
                      spreadBps,
                      timestamp: Date.now(),
                      gasPrice: gasPriceGwei,
                      confidence: Math.min(100, spreadBps * 10)
                    };
                  }
                }
              } catch (e) {
                // Pool no existe o error de quote
              }
              return null;
            })()
          );
        }
      }
    }
    
    // Ejecutar todos los quotes en paralelo
    const results = await Promise.all(quotePromises);
    opportunities.push(...results.filter(r => r !== null));
    
  } catch (e) {
    // Error general de scan
  }
  
  return opportunities;
}

// ═══════════════════════════════════════════════════════════════════════════════
// EJECUCIÓN SCALPER - ENTRADA Y SALIDA INMEDIATA
// ═══════════════════════════════════════════════════════════════════════════════

async function executeScalp(opp) {
  if (activeTrades >= SCALPER_CONFIG.MAX_CONCURRENT_TRADES) {
    console.log(`[SCALP] ⚠️ Máximo trades activos (${activeTrades}), esperando...`);
    return null;
  }
  
  activeTrades++;
  const startTime = Date.now();
  const chain = CHAINS[opp.chain];
  const signer = signers[opp.chain];
  const provider = providers[opp.chain];
  const { router, weth } = contracts[opp.chain];
  
  console.log(`\n🔥 [SCALP] ═══════════════════════════════════════════════════════`);
  console.log(`   Chain: ${chain.name}`);
  console.log(`   Route: ${opp.route}`);
  console.log(`   Amount: ${opp.amountInEth} ETH`);
  console.log(`   Expected Profit: $${opp.netProfitUsd.toFixed(4)}`);
  console.log(`   Spread: ${opp.spreadBps} bps`);
  console.log(`   Gas: ${opp.gasPrice.toFixed(2)} gwei`);
  
  try {
    // Verificar balance
    const balance = await provider.getBalance(WALLET_ADDRESS);
    if (balance < opp.amountIn + ethers.parseEther('0.001')) {
      console.log(`   ❌ Balance insuficiente`);
      activeTrades--;
      return { success: false, error: 'Balance insuficiente' };
    }
    
    // ═══════════════════════════════════════════════════════════════════════════
    // PASO 1: WRAP ETH → WETH
    // ═══════════════════════════════════════════════════════════════════════════
    console.log(`   📦 [1/4] Wrapping ETH → WETH...`);
    const wrapTx = await weth.deposit({ 
      value: opp.amountIn,
      gasLimit: 50000
    });
    const wrapReceipt = await wrapTx.wait(1);
    console.log(`   ✅ Wrap completado: ${wrapReceipt.hash.slice(0, 16)}...`);
    
    // ═══════════════════════════════════════════════════════════════════════════
    // PASO 2: APPROVE WETH (si es necesario)
    // ═══════════════════════════════════════════════════════════════════════════
    const wethAllowance = await weth.allowance(WALLET_ADDRESS, chain.router);
    if (wethAllowance < opp.amountIn) {
      console.log(`   🔓 [2/4] Approving WETH...`);
      const approveTx = await weth.approve(chain.router, ethers.MaxUint256, { gasLimit: 50000 });
      await approveTx.wait(1);
      console.log(`   ✅ WETH approved`);
    } else {
      console.log(`   ✅ [2/4] WETH ya aprobado`);
    }
    
    // ═══════════════════════════════════════════════════════════════════════════
    // PASO 3: ENTRADA - SWAP WETH → USDC
    // ═══════════════════════════════════════════════════════════════════════════
    console.log(`   🔄 [3/4] ENTRADA: WETH → USDC...`);
    const minUsdc = (opp.usdcIntermediate * BigInt(10000 - SCALPER_CONFIG.MAX_SLIPPAGE_BPS)) / 10000n;
    
    const swap1Tx = await router.exactInputSingle({
      tokenIn: chain.tokens.WETH,
      tokenOut: chain.tokens.USDC,
      fee: opp.fee1,
      recipient: WALLET_ADDRESS,
      amountIn: opp.amountIn,
      amountOutMinimum: minUsdc,
      sqrtPriceLimitX96: 0n
    }, { gasLimit: 300000 });
    
    const swap1Receipt = await swap1Tx.wait(1);
    console.log(`   ✅ ENTRADA completada: ${swap1Receipt.hash.slice(0, 16)}...`);
    
    // Obtener balance USDC real
    const usdc = new ethers.Contract(chain.tokens.USDC, ERC20_ABI, signer);
    const usdcBalance = await usdc.balanceOf(WALLET_ADDRESS);
    console.log(`   💵 USDC recibido: ${ethers.formatUnits(usdcBalance, 6)}`);
    
    // ═══════════════════════════════════════════════════════════════════════════
    // PASO 4: SALIDA INMEDIATA - SWAP USDC → WETH
    // ═══════════════════════════════════════════════════════════════════════════
    console.log(`   🔄 [4/4] SALIDA: USDC → WETH...`);
    
    // Approve USDC si es necesario
    const usdcAllowance = await usdc.allowance(WALLET_ADDRESS, chain.router);
    if (usdcAllowance < usdcBalance) {
      const approveUsdcTx = await usdc.approve(chain.router, ethers.MaxUint256, { gasLimit: 50000 });
      await approveUsdcTx.wait(1);
    }
    
    const minWeth = (opp.wethOut * BigInt(10000 - SCALPER_CONFIG.MAX_SLIPPAGE_BPS)) / 10000n;
    
    const swap2Tx = await router.exactInputSingle({
      tokenIn: chain.tokens.USDC,
      tokenOut: chain.tokens.WETH,
      fee: opp.fee2,
      recipient: WALLET_ADDRESS,
      amountIn: usdcBalance,
      amountOutMinimum: minWeth,
      sqrtPriceLimitX96: 0n
    }, { gasLimit: 300000 });
    
    const swap2Receipt = await swap2Tx.wait(1);
    console.log(`   ✅ SALIDA completada: ${swap2Receipt.hash.slice(0, 16)}...`);
    
    // ═══════════════════════════════════════════════════════════════════════════
    // CALCULAR PROFIT REAL
    // ═══════════════════════════════════════════════════════════════════════════
    const finalWethBalance = await weth.balanceOf(WALLET_ADDRESS);
    const actualProfit = finalWethBalance - opp.amountIn;
    const actualProfitUsd = parseFloat(ethers.formatEther(actualProfit)) * SCALPER_CONFIG.ETH_PRICE_USD;
    
    // Calcular gas usado
    const gas1 = swap1Receipt.gasUsed * swap1Receipt.gasPrice;
    const gas2 = swap2Receipt.gasUsed * swap2Receipt.gasPrice;
    const totalGasWei = gas1 + gas2 + wrapReceipt.gasUsed * wrapReceipt.gasPrice;
    const totalGasUsd = parseFloat(ethers.formatEther(totalGasWei)) * SCALPER_CONFIG.ETH_PRICE_USD;
    
    const netProfitUsd = actualProfitUsd - totalGasUsd;
    const executionTime = Date.now() - startTime;
    
    console.log(`   ═══════════════════════════════════════════════════════`);
    console.log(`   💰 PROFIT BRUTO: $${actualProfitUsd.toFixed(4)}`);
    console.log(`   ⛽ GAS TOTAL: $${totalGasUsd.toFixed(4)}`);
    console.log(`   💵 PROFIT NETO: $${netProfitUsd.toFixed(4)}`);
    console.log(`   ⏱️  Tiempo: ${executionTime}ms`);
    console.log(`   🔗 TX: ${chain.explorer}/tx/${swap2Receipt.hash}`);
    console.log(`   ═══════════════════════════════════════════════════════\n`);
    
    activeTrades--;
    
    return {
      success: true,
      profitUsd: actualProfitUsd,
      gasUsd: totalGasUsd,
      netProfitUsd,
      txHash: swap2Receipt.hash,
      executionTimeMs: executionTime
    };
    
  } catch (e) {
    console.log(`   ❌ Error: ${e.message}`);
    activeTrades--;
    return { success: false, error: e.message };
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// LOOP PRINCIPAL SCALPER
// ═══════════════════════════════════════════════════════════════════════════════

async function scalperTick() {
  if (!state.isRunning) return;
  
  const tickStart = Date.now();
  state.stats.totalScans++;
  state.stats.uptime = Math.floor((Date.now() - state.startTime) / 1000);
  
  try {
    // ESCANEO PARALELO de todas las chains activas
    const activeChains = state.chains.filter(c => c.isActive).map(c => c.chain);
    
    let allOpportunities = [];
    
    if (SCALPER_CONFIG.PARALLEL_CHAIN_SCAN) {
      // Escanear todas las chains en paralelo
      const scanPromises = activeChains.map(chainKey => scalperScan(chainKey));
      const results = await Promise.all(scanPromises);
      allOpportunities = results.flat();
    } else {
      // Escanear secuencialmente (round-robin)
      const chainIndex = state.stats.totalScans % activeChains.length;
      const selectedChain = activeChains[chainIndex];
      allOpportunities = await scalperScan(selectedChain);
    }
    
    const scanTime = Date.now() - tickStart;
    scanTimes.push(scanTime);
    if (scanTimes.length > 100) scanTimes.shift();
    state.stats.avgScanTimeMs = Math.round(scanTimes.reduce((a, b) => a + b, 0) / scanTimes.length);
    state.stats.scansPerSecond = Math.round(1000 / state.stats.avgScanTimeMs * 10) / 10;
    
    if (allOpportunities.length > 0) {
      state.stats.opportunitiesFound += allOpportunities.length;
      
      // Ordenar por profit neto
      allOpportunities.sort((a, b) => b.netProfitUsd - a.netProfitUsd);
      
      // Guardar oportunidades para UI
      state.opportunities = [...allOpportunities.slice(0, 10), ...state.opportunities].slice(0, 50);
      state.stats.lastOpportunity = allOpportunities[0];
      
      const best = allOpportunities[0];
      
      console.log(`[SCAN #${state.stats.totalScans}] ${scanTime}ms | ${allOpportunities.length} opps | Best: $${best.netProfitUsd.toFixed(4)} on ${best.chainName}`);
      
      // EJECUTAR si no es dry run y auto-execute está activo
      if (!state.isDryRun && SCALPER_CONFIG.AUTO_EXECUTE && best.netProfitUsd >= SCALPER_CONFIG.MIN_PROFIT_USD) {
        state.stats.tradesAttempted++;
        
        const result = await executeScalp(best);
        
        if (result) {
          state.stats.tradesExecuted++;
          
          const tradeLog = {
            id: `scalp-${Date.now()}`,
            timestamp: Date.now(),
            chain: best.chain,
            chainName: best.chainName,
            type: 'SCALP',
            route: best.route,
            direction: best.direction,
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
          if (state.tradeLogs.length > 100) state.tradeLogs.pop();
          
          if (result.success) {
            state.stats.tradesSuccessful++;
            state.stats.totalProfitUsd += result.profitUsd;
            state.stats.totalGasUsd += result.gasUsd;
            state.stats.netProfitUsd = state.stats.totalProfitUsd - state.stats.totalGasUsd;
            state.stats.lastTrade = tradeLog;
            
            // Actualizar bandit
            const bandit = state.banditStates.find(b => b.chain === best.chain);
            if (bandit) {
              bandit.wins++;
              bandit.attempts++;
              bandit.alpha++;
              bandit.winRate = (bandit.wins / bandit.attempts) * 100;
              bandit.avgProfit = (bandit.avgProfit * (bandit.wins - 1) + result.netProfitUsd) / bandit.wins;
            }
            
            // Actualizar chain stats
            const chainState = state.chains.find(c => c.chain === best.chain);
            if (chainState) {
              chainState.tradesExecuted++;
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
      // Log periódico cuando no hay oportunidades
      if (state.stats.totalScans % 50 === 0) {
        console.log(`[SCAN #${state.stats.totalScans}] ${scanTime}ms | No profitable opportunities`);
      }
    }
    
    // Actualizar balances cada 100 scans
    if (state.stats.totalScans % 100 === 0) {
      await updateBalances();
    }
    
    // Actualizar chain stats
    for (const chainState of state.chains) {
      chainState.lastScan = Date.now();
      chainState.scansCompleted++;
    }
    
  } catch (e) {
    console.error(`[TICK] Error: ${e.message}`);
  }
}

async function updateBalances() {
  for (const chainState of state.chains) {
    try {
      const balance = await providers[chainState.chain].getBalance(WALLET_ADDRESS);
      const balanceEth = parseFloat(ethers.formatEther(balance));
      chainState.balance = balanceEth.toFixed(6);
      chainState.balanceUsd = balanceEth * SCALPER_CONFIG.ETH_PRICE_USD;
      chainState.isActive = balanceEth > 0.001;
    } catch (e) {
      // Error al obtener balance
    }
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
    return res.json({ success: false, error: 'Ya está corriendo', isRunning: true });
  }
  
  state.isDryRun = req.body?.dryRun === true;
  state.isRunning = true;
  state.startTime = Date.now();
  
  // Reset stats
  state.stats = {
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
    avgExecutionTimeMs: 0,
    scansPerSecond: 0,
    uptime: 0,
    currentChain: 'all',
    lastOpportunity: null,
    lastTrade: null
  };
  state.tradeLogs = [];
  state.opportunities = [];
  scanTimes = [];
  
  // Iniciar loop scalper
  if (timer) clearInterval(timer);
  timer = setInterval(scalperTick, SCALPER_CONFIG.SCAN_INTERVAL_MS);
  
  console.log(`\n[START] 🔥 SCALPER HTF iniciado - ${state.isDryRun ? 'DRY RUN' : '⚠️ MODO REAL'}`);
  console.log(`[CONFIG] Intervalo: ${SCALPER_CONFIG.SCAN_INTERVAL_MS}ms | Min profit: $${SCALPER_CONFIG.MIN_PROFIT_USD} | Parallel: ${SCALPER_CONFIG.PARALLEL_CHAIN_SCAN}`);
  
  res.json({
    success: true,
    isRunning: true,
    isDryRun: state.isDryRun,
    mode: 'SCALPER_HTF',
    config: SCALPER_CONFIG
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
    avgExecutionTimeMs: 0,
    scansPerSecond: 0,
    uptime: 0,
    currentChain: 'all',
    lastOpportunity: null,
    lastTrade: null
  };
  state.tradeLogs = [];
  state.opportunities = [];
  scanTimes = [];
  res.json({ success: true });
});

app.get('/api/defi/multichain-arb/health', (req, res) => {
  res.json({
    status: 'ok',
    mode: 'SCALPER_HTF',
    port: PORT,
    running: state.isRunning,
    dryRun: state.isDryRun,
    wallet: WALLET_ADDRESS,
    config: SCALPER_CONFIG,
    stats: {
      scansPerSecond: state.stats.scansPerSecond,
      opportunitiesFound: state.stats.opportunitiesFound,
      tradesExecuted: state.stats.tradesExecuted
    }
  });
});

app.get('/api/defi/multichain-arb/config', (req, res) => {
  res.json(SCALPER_CONFIG);
});

// ═══════════════════════════════════════════════════════════════════════════════
// INICIAR SERVIDOR
// ═══════════════════════════════════════════════════════════════════════════════

app.listen(PORT, async () => {
  console.log(`
╔═══════════════════════════════════════════════════════════════════════════════╗
║                                                                               ║
║   🔥 SCALPER HTF ARBITRAGE BOT                                                ║
║                                                                               ║
║   ✅ Puerto: ${PORT}                                                           ║
║   ✅ Wallet: ${WALLET_ADDRESS.slice(0, 10)}...${WALLET_ADDRESS.slice(-5)}                                  ║
║   ✅ Modo: SCALPER - Entrada/Salida Rápida                                    ║
║                                                                               ║
║   ⚡ Intervalo: ${SCALPER_CONFIG.SCAN_INTERVAL_MS}ms (${(1000/SCALPER_CONFIG.SCAN_INTERVAL_MS).toFixed(0)} scans/seg)                                ║
║   ⚡ Min Profit: $${SCALPER_CONFIG.MIN_PROFIT_USD}                                                ║
║   ⚡ Parallel Scan: ${SCALPER_CONFIG.PARALLEL_CHAIN_SCAN}                                             ║
║   ⚡ Auto Execute: ${SCALPER_CONFIG.AUTO_EXECUTE}                                              ║
║                                                                               ║
║   📊 Chains: Base, Arbitrum, Optimism                                         ║
║                                                                               ║
║   ⚠️  MODO SCALPER - Alta frecuencia de entrada/salida                        ║
║                                                                               ║
╚═══════════════════════════════════════════════════════════════════════════════╝
  `);
  
  await initConnections();
  await updateBalances();
  
  console.log('\n[READY] 🔥 Scalper listo. Usa POST /api/defi/multichain-arb/start para iniciar.\n');
});

process.on('SIGINT', () => {
  console.log('\n[EXIT] Cerrando scalper...');
  if (timer) clearInterval(timer);
  process.exit(0);
});



 * ═══════════════════════════════════════════════════════════════════════════════
 * 🔥 SCALPER HTF ARBITRAGE BOT - ENTRADA Y SALIDA ULTRA-RÁPIDA
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * Comportamiento SCALPER:
 * - Detecta oportunidad → ENTRA inmediatamente
 * - Ejecuta swap → SALE inmediatamente
 * - No mantiene posiciones
 * - Ciclo continuo de entrada/salida
 * - Escaneo paralelo de múltiples chains
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
// CONFIGURACIÓN SCALPER HTF
// ═══════════════════════════════════════════════════════════════════════════════

const SCALPER_CONFIG = {
  // VELOCIDAD
  SCAN_INTERVAL_MS: 200,           // 5 scans por segundo
  PARALLEL_CHAIN_SCAN: true,       // Escanear todas las chains simultáneamente
  
  // UMBRALES SCALPER
  MIN_PROFIT_USD: 0.005,           // $0.005 mínimo (muy bajo para capturar más)
  MIN_SPREAD_BPS: 1,               // 0.01% spread mínimo
  MAX_SLIPPAGE_BPS: 50,            // 0.5% slippage máximo
  
  // CANTIDADES (pequeñas para entrada/salida rápida)
  TRADE_AMOUNTS_ETH: [0.001, 0.002, 0.003, 0.005, 0.008, 0.01],
  
  // FEE TIERS
  FEE_TIERS: [100, 500, 3000, 10000],
  
  // EJECUCIÓN
  AUTO_EXECUTE: true,
  IMMEDIATE_EXIT: true,            // Salir inmediatamente después de entrar
  MAX_CONCURRENT_TRADES: 3,        // Máximo trades simultáneos
  
  // GAS
  GAS_MULTIPLIER: 1.2,             // Gas más bajo para velocidad
  MAX_GAS_GWEI: 5,                 // Máximo gas en gwei
  
  // PRECIO ETH
  ETH_PRICE_USD: 3500
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
      USDC: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
      USDbC: '0xd9aAEc86B65D86f6A7B5B1b0c42FFA531710b6CA'
    },
    quoter: '0x3d4e44Eb1374240CE5F1B871ab261CD16335B76a',
    router: '0x2626664c2603336E57B271c5C0b26F421741e481',
    priority: 1  // Más prioridad
  },
  arbitrum: {
    name: 'Arbitrum',
    chainId: 42161,
    rpc: 'https://arb1.arbitrum.io/rpc',
    explorer: 'https://arbiscan.io',
    tokens: {
      WETH: '0x82aF49447D8a07e3bd95BD0d56f35241523fBab1',
      USDC: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831',
      USDT: '0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9'
    },
    quoter: '0x61fFE014bA17989E743c5F6cB21bF9697530B21e',
    router: '0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45',
    priority: 2
  },
  optimism: {
    name: 'Optimism',
    chainId: 10,
    rpc: 'https://mainnet.optimism.io',
    explorer: 'https://optimistic.etherscan.io',
    tokens: {
      WETH: '0x4200000000000000000000000000000000000006',
      USDC: '0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85',
      USDT: '0x94b008aA00579c1307B0EF2c499aD98a8ce58e58'
    },
    quoter: '0x61fFE014bA17989E743c5F6cB21bF9697530B21e',
    router: '0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45',
    priority: 3
  }
};

// ABIs
const QUOTER_ABI = [
  'function quoteExactInputSingle((address tokenIn, address tokenOut, uint256 amountIn, uint24 fee, uint160 sqrtPriceLimitX96)) external returns (uint256 amountOut, uint160 sqrtPriceX96After, uint32 initializedTicksCrossed, uint256 gasEstimate)'
];

const ROUTER_ABI = [
  'function exactInputSingle((address tokenIn, address tokenOut, uint24 fee, address recipient, uint256 amountIn, uint256 amountOutMinimum, uint160 sqrtPriceLimitX96)) external payable returns (uint256 amountOut)',
  'function multicall(uint256 deadline, bytes[] calldata data) external payable returns (bytes[] memory results)',
  'function unwrapWETH9(uint256 amountMinimum, address recipient) external payable'
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
  'function allowance(address owner, address spender) view returns (uint256)',
  'function decimals() view returns (uint8)'
];

// ═══════════════════════════════════════════════════════════════════════════════
// ESTADO DEL SCALPER
// ═══════════════════════════════════════════════════════════════════════════════

let state = {
  isRunning: false,
  isDryRun: false,
  startTime: null,
  mode: 'SCALPER_HTF',
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
    avgExecutionTimeMs: 0,
    scansPerSecond: 0,
    uptime: 0,
    currentChain: 'all',
    lastOpportunity: null,
    lastTrade: null
  },
  chains: [],
  tradeLogs: [],
  opportunities: [],
  banditStates: [],
  activePositions: [],
  scanHistory: []
};

let timer = null;
let providers = {};
let signers = {};
let contracts = {};
let activeTrades = 0;
let scanTimes = [];

// ═══════════════════════════════════════════════════════════════════════════════
// INICIALIZAR CONEXIONES
// ═══════════════════════════════════════════════════════════════════════════════

async function initConnections() {
  console.log('[INIT] 🔌 Inicializando conexiones a chains...');
  
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
        balanceUsd: balanceEth * SCALPER_CONFIG.ETH_PRICE_USD,
        routes: SCALPER_CONFIG.FEE_TIERS.length * SCALPER_CONFIG.TRADE_AMOUNTS_ETH.length,
        isActive: balanceEth > 0.001,
        lastScan: Date.now(),
        scansCompleted: 0,
        opportunitiesFound: 0,
        tradesExecuted: 0,
        explorer: chain.explorer,
        priority: chain.priority
      });
      
      state.banditStates.push({
        chain: key,
        alpha: 2,
        beta: 2,
        winRate: 50,
        selected: key === 'base',
        attempts: 0,
        wins: 0,
        avgProfit: 0
      });
      
      console.log(`[INIT] ✅ ${chain.name}: ${balanceEth.toFixed(6)} ETH ($${(balanceEth * SCALPER_CONFIG.ETH_PRICE_USD).toFixed(2)})`);
    } catch (e) {
      console.error(`[INIT] ❌ ${chain.name}: ${e.message}`);
    }
  }
  
  // Ordenar chains por prioridad
  state.chains.sort((a, b) => CHAINS[a.chain].priority - CHAINS[b.chain].priority);
}

// ═══════════════════════════════════════════════════════════════════════════════
// ESCANEO SCALPER - PARALELO Y ULTRA-RÁPIDO
// ═══════════════════════════════════════════════════════════════════════════════

async function scalperScan(chainKey) {
  const chain = CHAINS[chainKey];
  const provider = providers[chainKey];
  const quoter = contracts[chainKey].quoter;
  const opportunities = [];
  
  try {
    // Obtener gas price actual
    const feeData = await provider.getFeeData();
    const gasPrice = feeData.gasPrice || ethers.parseUnits('0.001', 'gwei');
    const gasPriceGwei = parseFloat(ethers.formatUnits(gasPrice, 'gwei'));
    
    // Si gas muy alto, saltar
    if (gasPriceGwei > SCALPER_CONFIG.MAX_GAS_GWEI) {
      return [];
    }
    
    const gasCostWei = gasPrice * 250000n; // Estimado para swap completo
    const gasCostUsd = parseFloat(ethers.formatEther(gasCostWei)) * SCALPER_CONFIG.ETH_PRICE_USD;
    
    // Generar todas las combinaciones de quotes
    const quotePromises = [];
    
    for (const amountEth of SCALPER_CONFIG.TRADE_AMOUNTS_ETH) {
      const amountWei = ethers.parseEther(amountEth.toString());
      
      for (let i = 0; i < SCALPER_CONFIG.FEE_TIERS.length; i++) {
        for (let j = 0; j < SCALPER_CONFIG.FEE_TIERS.length; j++) {
          // Probar diferentes combinaciones de fee tiers
          const fee1 = SCALPER_CONFIG.FEE_TIERS[i];
          const fee2 = SCALPER_CONFIG.FEE_TIERS[j];
          
          quotePromises.push(
            (async () => {
              try {
                // ENTRADA: WETH → USDC
                const quote1 = await quoter.quoteExactInputSingle.staticCall({
                  tokenIn: chain.tokens.WETH,
                  tokenOut: chain.tokens.USDC,
                  amountIn: amountWei,
                  fee: fee1,
                  sqrtPriceLimitX96: 0n
                });
                const usdcOut = quote1[0];
                
                // SALIDA: USDC → WETH
                const quote2 = await quoter.quoteExactInputSingle.staticCall({
                  tokenIn: chain.tokens.USDC,
                  tokenOut: chain.tokens.WETH,
                  amountIn: usdcOut,
                  fee: fee2,
                  sqrtPriceLimitX96: 0n
                });
                const wethOut = quote2[0];
                
                // Calcular profit
                const grossProfit = wethOut - amountWei;
                const netProfit = grossProfit - gasCostWei;
                
                if (netProfit > 0n) {
                  const netProfitUsd = parseFloat(ethers.formatEther(netProfit)) * SCALPER_CONFIG.ETH_PRICE_USD;
                  const spreadBps = Number((grossProfit * 10000n) / amountWei);
                  
                  if (netProfitUsd >= SCALPER_CONFIG.MIN_PROFIT_USD && spreadBps >= SCALPER_CONFIG.MIN_SPREAD_BPS) {
                    return {
                      chain: chainKey,
                      chainName: chain.name,
                      type: 'SCALP',
                      direction: 'WETH→USDC→WETH',
                      route: `Fee ${fee1/100}%→${fee2/100}%`,
                      amountIn: amountWei,
                      amountInEth: amountEth,
                      fee1,
                      fee2,
                      usdcIntermediate: usdcOut,
                      wethOut,
                      grossProfit,
                      netProfit,
                      netProfitUsd,
                      gasCostUsd,
                      spreadBps,
                      timestamp: Date.now(),
                      gasPrice: gasPriceGwei,
                      confidence: Math.min(100, spreadBps * 10)
                    };
                  }
                }
              } catch (e) {
                // Pool no existe o error de quote
              }
              return null;
            })()
          );
        }
      }
    }
    
    // Ejecutar todos los quotes en paralelo
    const results = await Promise.all(quotePromises);
    opportunities.push(...results.filter(r => r !== null));
    
  } catch (e) {
    // Error general de scan
  }
  
  return opportunities;
}

// ═══════════════════════════════════════════════════════════════════════════════
// EJECUCIÓN SCALPER - ENTRADA Y SALIDA INMEDIATA
// ═══════════════════════════════════════════════════════════════════════════════

async function executeScalp(opp) {
  if (activeTrades >= SCALPER_CONFIG.MAX_CONCURRENT_TRADES) {
    console.log(`[SCALP] ⚠️ Máximo trades activos (${activeTrades}), esperando...`);
    return null;
  }
  
  activeTrades++;
  const startTime = Date.now();
  const chain = CHAINS[opp.chain];
  const signer = signers[opp.chain];
  const provider = providers[opp.chain];
  const { router, weth } = contracts[opp.chain];
  
  console.log(`\n🔥 [SCALP] ═══════════════════════════════════════════════════════`);
  console.log(`   Chain: ${chain.name}`);
  console.log(`   Route: ${opp.route}`);
  console.log(`   Amount: ${opp.amountInEth} ETH`);
  console.log(`   Expected Profit: $${opp.netProfitUsd.toFixed(4)}`);
  console.log(`   Spread: ${opp.spreadBps} bps`);
  console.log(`   Gas: ${opp.gasPrice.toFixed(2)} gwei`);
  
  try {
    // Verificar balance
    const balance = await provider.getBalance(WALLET_ADDRESS);
    if (balance < opp.amountIn + ethers.parseEther('0.001')) {
      console.log(`   ❌ Balance insuficiente`);
      activeTrades--;
      return { success: false, error: 'Balance insuficiente' };
    }
    
    // ═══════════════════════════════════════════════════════════════════════════
    // PASO 1: WRAP ETH → WETH
    // ═══════════════════════════════════════════════════════════════════════════
    console.log(`   📦 [1/4] Wrapping ETH → WETH...`);
    const wrapTx = await weth.deposit({ 
      value: opp.amountIn,
      gasLimit: 50000
    });
    const wrapReceipt = await wrapTx.wait(1);
    console.log(`   ✅ Wrap completado: ${wrapReceipt.hash.slice(0, 16)}...`);
    
    // ═══════════════════════════════════════════════════════════════════════════
    // PASO 2: APPROVE WETH (si es necesario)
    // ═══════════════════════════════════════════════════════════════════════════
    const wethAllowance = await weth.allowance(WALLET_ADDRESS, chain.router);
    if (wethAllowance < opp.amountIn) {
      console.log(`   🔓 [2/4] Approving WETH...`);
      const approveTx = await weth.approve(chain.router, ethers.MaxUint256, { gasLimit: 50000 });
      await approveTx.wait(1);
      console.log(`   ✅ WETH approved`);
    } else {
      console.log(`   ✅ [2/4] WETH ya aprobado`);
    }
    
    // ═══════════════════════════════════════════════════════════════════════════
    // PASO 3: ENTRADA - SWAP WETH → USDC
    // ═══════════════════════════════════════════════════════════════════════════
    console.log(`   🔄 [3/4] ENTRADA: WETH → USDC...`);
    const minUsdc = (opp.usdcIntermediate * BigInt(10000 - SCALPER_CONFIG.MAX_SLIPPAGE_BPS)) / 10000n;
    
    const swap1Tx = await router.exactInputSingle({
      tokenIn: chain.tokens.WETH,
      tokenOut: chain.tokens.USDC,
      fee: opp.fee1,
      recipient: WALLET_ADDRESS,
      amountIn: opp.amountIn,
      amountOutMinimum: minUsdc,
      sqrtPriceLimitX96: 0n
    }, { gasLimit: 300000 });
    
    const swap1Receipt = await swap1Tx.wait(1);
    console.log(`   ✅ ENTRADA completada: ${swap1Receipt.hash.slice(0, 16)}...`);
    
    // Obtener balance USDC real
    const usdc = new ethers.Contract(chain.tokens.USDC, ERC20_ABI, signer);
    const usdcBalance = await usdc.balanceOf(WALLET_ADDRESS);
    console.log(`   💵 USDC recibido: ${ethers.formatUnits(usdcBalance, 6)}`);
    
    // ═══════════════════════════════════════════════════════════════════════════
    // PASO 4: SALIDA INMEDIATA - SWAP USDC → WETH
    // ═══════════════════════════════════════════════════════════════════════════
    console.log(`   🔄 [4/4] SALIDA: USDC → WETH...`);
    
    // Approve USDC si es necesario
    const usdcAllowance = await usdc.allowance(WALLET_ADDRESS, chain.router);
    if (usdcAllowance < usdcBalance) {
      const approveUsdcTx = await usdc.approve(chain.router, ethers.MaxUint256, { gasLimit: 50000 });
      await approveUsdcTx.wait(1);
    }
    
    const minWeth = (opp.wethOut * BigInt(10000 - SCALPER_CONFIG.MAX_SLIPPAGE_BPS)) / 10000n;
    
    const swap2Tx = await router.exactInputSingle({
      tokenIn: chain.tokens.USDC,
      tokenOut: chain.tokens.WETH,
      fee: opp.fee2,
      recipient: WALLET_ADDRESS,
      amountIn: usdcBalance,
      amountOutMinimum: minWeth,
      sqrtPriceLimitX96: 0n
    }, { gasLimit: 300000 });
    
    const swap2Receipt = await swap2Tx.wait(1);
    console.log(`   ✅ SALIDA completada: ${swap2Receipt.hash.slice(0, 16)}...`);
    
    // ═══════════════════════════════════════════════════════════════════════════
    // CALCULAR PROFIT REAL
    // ═══════════════════════════════════════════════════════════════════════════
    const finalWethBalance = await weth.balanceOf(WALLET_ADDRESS);
    const actualProfit = finalWethBalance - opp.amountIn;
    const actualProfitUsd = parseFloat(ethers.formatEther(actualProfit)) * SCALPER_CONFIG.ETH_PRICE_USD;
    
    // Calcular gas usado
    const gas1 = swap1Receipt.gasUsed * swap1Receipt.gasPrice;
    const gas2 = swap2Receipt.gasUsed * swap2Receipt.gasPrice;
    const totalGasWei = gas1 + gas2 + wrapReceipt.gasUsed * wrapReceipt.gasPrice;
    const totalGasUsd = parseFloat(ethers.formatEther(totalGasWei)) * SCALPER_CONFIG.ETH_PRICE_USD;
    
    const netProfitUsd = actualProfitUsd - totalGasUsd;
    const executionTime = Date.now() - startTime;
    
    console.log(`   ═══════════════════════════════════════════════════════`);
    console.log(`   💰 PROFIT BRUTO: $${actualProfitUsd.toFixed(4)}`);
    console.log(`   ⛽ GAS TOTAL: $${totalGasUsd.toFixed(4)}`);
    console.log(`   💵 PROFIT NETO: $${netProfitUsd.toFixed(4)}`);
    console.log(`   ⏱️  Tiempo: ${executionTime}ms`);
    console.log(`   🔗 TX: ${chain.explorer}/tx/${swap2Receipt.hash}`);
    console.log(`   ═══════════════════════════════════════════════════════\n`);
    
    activeTrades--;
    
    return {
      success: true,
      profitUsd: actualProfitUsd,
      gasUsd: totalGasUsd,
      netProfitUsd,
      txHash: swap2Receipt.hash,
      executionTimeMs: executionTime
    };
    
  } catch (e) {
    console.log(`   ❌ Error: ${e.message}`);
    activeTrades--;
    return { success: false, error: e.message };
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// LOOP PRINCIPAL SCALPER
// ═══════════════════════════════════════════════════════════════════════════════

async function scalperTick() {
  if (!state.isRunning) return;
  
  const tickStart = Date.now();
  state.stats.totalScans++;
  state.stats.uptime = Math.floor((Date.now() - state.startTime) / 1000);
  
  try {
    // ESCANEO PARALELO de todas las chains activas
    const activeChains = state.chains.filter(c => c.isActive).map(c => c.chain);
    
    let allOpportunities = [];
    
    if (SCALPER_CONFIG.PARALLEL_CHAIN_SCAN) {
      // Escanear todas las chains en paralelo
      const scanPromises = activeChains.map(chainKey => scalperScan(chainKey));
      const results = await Promise.all(scanPromises);
      allOpportunities = results.flat();
    } else {
      // Escanear secuencialmente (round-robin)
      const chainIndex = state.stats.totalScans % activeChains.length;
      const selectedChain = activeChains[chainIndex];
      allOpportunities = await scalperScan(selectedChain);
    }
    
    const scanTime = Date.now() - tickStart;
    scanTimes.push(scanTime);
    if (scanTimes.length > 100) scanTimes.shift();
    state.stats.avgScanTimeMs = Math.round(scanTimes.reduce((a, b) => a + b, 0) / scanTimes.length);
    state.stats.scansPerSecond = Math.round(1000 / state.stats.avgScanTimeMs * 10) / 10;
    
    if (allOpportunities.length > 0) {
      state.stats.opportunitiesFound += allOpportunities.length;
      
      // Ordenar por profit neto
      allOpportunities.sort((a, b) => b.netProfitUsd - a.netProfitUsd);
      
      // Guardar oportunidades para UI
      state.opportunities = [...allOpportunities.slice(0, 10), ...state.opportunities].slice(0, 50);
      state.stats.lastOpportunity = allOpportunities[0];
      
      const best = allOpportunities[0];
      
      console.log(`[SCAN #${state.stats.totalScans}] ${scanTime}ms | ${allOpportunities.length} opps | Best: $${best.netProfitUsd.toFixed(4)} on ${best.chainName}`);
      
      // EJECUTAR si no es dry run y auto-execute está activo
      if (!state.isDryRun && SCALPER_CONFIG.AUTO_EXECUTE && best.netProfitUsd >= SCALPER_CONFIG.MIN_PROFIT_USD) {
        state.stats.tradesAttempted++;
        
        const result = await executeScalp(best);
        
        if (result) {
          state.stats.tradesExecuted++;
          
          const tradeLog = {
            id: `scalp-${Date.now()}`,
            timestamp: Date.now(),
            chain: best.chain,
            chainName: best.chainName,
            type: 'SCALP',
            route: best.route,
            direction: best.direction,
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
          if (state.tradeLogs.length > 100) state.tradeLogs.pop();
          
          if (result.success) {
            state.stats.tradesSuccessful++;
            state.stats.totalProfitUsd += result.profitUsd;
            state.stats.totalGasUsd += result.gasUsd;
            state.stats.netProfitUsd = state.stats.totalProfitUsd - state.stats.totalGasUsd;
            state.stats.lastTrade = tradeLog;
            
            // Actualizar bandit
            const bandit = state.banditStates.find(b => b.chain === best.chain);
            if (bandit) {
              bandit.wins++;
              bandit.attempts++;
              bandit.alpha++;
              bandit.winRate = (bandit.wins / bandit.attempts) * 100;
              bandit.avgProfit = (bandit.avgProfit * (bandit.wins - 1) + result.netProfitUsd) / bandit.wins;
            }
            
            // Actualizar chain stats
            const chainState = state.chains.find(c => c.chain === best.chain);
            if (chainState) {
              chainState.tradesExecuted++;
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
      // Log periódico cuando no hay oportunidades
      if (state.stats.totalScans % 50 === 0) {
        console.log(`[SCAN #${state.stats.totalScans}] ${scanTime}ms | No profitable opportunities`);
      }
    }
    
    // Actualizar balances cada 100 scans
    if (state.stats.totalScans % 100 === 0) {
      await updateBalances();
    }
    
    // Actualizar chain stats
    for (const chainState of state.chains) {
      chainState.lastScan = Date.now();
      chainState.scansCompleted++;
    }
    
  } catch (e) {
    console.error(`[TICK] Error: ${e.message}`);
  }
}

async function updateBalances() {
  for (const chainState of state.chains) {
    try {
      const balance = await providers[chainState.chain].getBalance(WALLET_ADDRESS);
      const balanceEth = parseFloat(ethers.formatEther(balance));
      chainState.balance = balanceEth.toFixed(6);
      chainState.balanceUsd = balanceEth * SCALPER_CONFIG.ETH_PRICE_USD;
      chainState.isActive = balanceEth > 0.001;
    } catch (e) {
      // Error al obtener balance
    }
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
    return res.json({ success: false, error: 'Ya está corriendo', isRunning: true });
  }
  
  state.isDryRun = req.body?.dryRun === true;
  state.isRunning = true;
  state.startTime = Date.now();
  
  // Reset stats
  state.stats = {
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
    avgExecutionTimeMs: 0,
    scansPerSecond: 0,
    uptime: 0,
    currentChain: 'all',
    lastOpportunity: null,
    lastTrade: null
  };
  state.tradeLogs = [];
  state.opportunities = [];
  scanTimes = [];
  
  // Iniciar loop scalper
  if (timer) clearInterval(timer);
  timer = setInterval(scalperTick, SCALPER_CONFIG.SCAN_INTERVAL_MS);
  
  console.log(`\n[START] 🔥 SCALPER HTF iniciado - ${state.isDryRun ? 'DRY RUN' : '⚠️ MODO REAL'}`);
  console.log(`[CONFIG] Intervalo: ${SCALPER_CONFIG.SCAN_INTERVAL_MS}ms | Min profit: $${SCALPER_CONFIG.MIN_PROFIT_USD} | Parallel: ${SCALPER_CONFIG.PARALLEL_CHAIN_SCAN}`);
  
  res.json({
    success: true,
    isRunning: true,
    isDryRun: state.isDryRun,
    mode: 'SCALPER_HTF',
    config: SCALPER_CONFIG
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
    avgExecutionTimeMs: 0,
    scansPerSecond: 0,
    uptime: 0,
    currentChain: 'all',
    lastOpportunity: null,
    lastTrade: null
  };
  state.tradeLogs = [];
  state.opportunities = [];
  scanTimes = [];
  res.json({ success: true });
});

app.get('/api/defi/multichain-arb/health', (req, res) => {
  res.json({
    status: 'ok',
    mode: 'SCALPER_HTF',
    port: PORT,
    running: state.isRunning,
    dryRun: state.isDryRun,
    wallet: WALLET_ADDRESS,
    config: SCALPER_CONFIG,
    stats: {
      scansPerSecond: state.stats.scansPerSecond,
      opportunitiesFound: state.stats.opportunitiesFound,
      tradesExecuted: state.stats.tradesExecuted
    }
  });
});

app.get('/api/defi/multichain-arb/config', (req, res) => {
  res.json(SCALPER_CONFIG);
});

// ═══════════════════════════════════════════════════════════════════════════════
// INICIAR SERVIDOR
// ═══════════════════════════════════════════════════════════════════════════════

app.listen(PORT, async () => {
  console.log(`
╔═══════════════════════════════════════════════════════════════════════════════╗
║                                                                               ║
║   🔥 SCALPER HTF ARBITRAGE BOT                                                ║
║                                                                               ║
║   ✅ Puerto: ${PORT}                                                           ║
║   ✅ Wallet: ${WALLET_ADDRESS.slice(0, 10)}...${WALLET_ADDRESS.slice(-5)}                                  ║
║   ✅ Modo: SCALPER - Entrada/Salida Rápida                                    ║
║                                                                               ║
║   ⚡ Intervalo: ${SCALPER_CONFIG.SCAN_INTERVAL_MS}ms (${(1000/SCALPER_CONFIG.SCAN_INTERVAL_MS).toFixed(0)} scans/seg)                                ║
║   ⚡ Min Profit: $${SCALPER_CONFIG.MIN_PROFIT_USD}                                                ║
║   ⚡ Parallel Scan: ${SCALPER_CONFIG.PARALLEL_CHAIN_SCAN}                                             ║
║   ⚡ Auto Execute: ${SCALPER_CONFIG.AUTO_EXECUTE}                                              ║
║                                                                               ║
║   📊 Chains: Base, Arbitrum, Optimism                                         ║
║                                                                               ║
║   ⚠️  MODO SCALPER - Alta frecuencia de entrada/salida                        ║
║                                                                               ║
╚═══════════════════════════════════════════════════════════════════════════════╝
  `);
  
  await initConnections();
  await updateBalances();
  
  console.log('\n[READY] 🔥 Scalper listo. Usa POST /api/defi/multichain-arb/start para iniciar.\n');
});

process.on('SIGINT', () => {
  console.log('\n[EXIT] Cerrando scalper...');
  if (timer) clearInterval(timer);
  process.exit(0);
});


 * ═══════════════════════════════════════════════════════════════════════════════
 * 🔥 SCALPER HTF ARBITRAGE BOT - ENTRADA Y SALIDA ULTRA-RÁPIDA
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * Comportamiento SCALPER:
 * - Detecta oportunidad → ENTRA inmediatamente
 * - Ejecuta swap → SALE inmediatamente
 * - No mantiene posiciones
 * - Ciclo continuo de entrada/salida
 * - Escaneo paralelo de múltiples chains
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
// CONFIGURACIÓN SCALPER HTF
// ═══════════════════════════════════════════════════════════════════════════════

const SCALPER_CONFIG = {
  // VELOCIDAD
  SCAN_INTERVAL_MS: 200,           // 5 scans por segundo
  PARALLEL_CHAIN_SCAN: true,       // Escanear todas las chains simultáneamente
  
  // UMBRALES SCALPER
  MIN_PROFIT_USD: 0.005,           // $0.005 mínimo (muy bajo para capturar más)
  MIN_SPREAD_BPS: 1,               // 0.01% spread mínimo
  MAX_SLIPPAGE_BPS: 50,            // 0.5% slippage máximo
  
  // CANTIDADES (pequeñas para entrada/salida rápida)
  TRADE_AMOUNTS_ETH: [0.001, 0.002, 0.003, 0.005, 0.008, 0.01],
  
  // FEE TIERS
  FEE_TIERS: [100, 500, 3000, 10000],
  
  // EJECUCIÓN
  AUTO_EXECUTE: true,
  IMMEDIATE_EXIT: true,            // Salir inmediatamente después de entrar
  MAX_CONCURRENT_TRADES: 3,        // Máximo trades simultáneos
  
  // GAS
  GAS_MULTIPLIER: 1.2,             // Gas más bajo para velocidad
  MAX_GAS_GWEI: 5,                 // Máximo gas en gwei
  
  // PRECIO ETH
  ETH_PRICE_USD: 3500
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
      USDC: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
      USDbC: '0xd9aAEc86B65D86f6A7B5B1b0c42FFA531710b6CA'
    },
    quoter: '0x3d4e44Eb1374240CE5F1B871ab261CD16335B76a',
    router: '0x2626664c2603336E57B271c5C0b26F421741e481',
    priority: 1  // Más prioridad
  },
  arbitrum: {
    name: 'Arbitrum',
    chainId: 42161,
    rpc: 'https://arb1.arbitrum.io/rpc',
    explorer: 'https://arbiscan.io',
    tokens: {
      WETH: '0x82aF49447D8a07e3bd95BD0d56f35241523fBab1',
      USDC: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831',
      USDT: '0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9'
    },
    quoter: '0x61fFE014bA17989E743c5F6cB21bF9697530B21e',
    router: '0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45',
    priority: 2
  },
  optimism: {
    name: 'Optimism',
    chainId: 10,
    rpc: 'https://mainnet.optimism.io',
    explorer: 'https://optimistic.etherscan.io',
    tokens: {
      WETH: '0x4200000000000000000000000000000000000006',
      USDC: '0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85',
      USDT: '0x94b008aA00579c1307B0EF2c499aD98a8ce58e58'
    },
    quoter: '0x61fFE014bA17989E743c5F6cB21bF9697530B21e',
    router: '0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45',
    priority: 3
  }
};

// ABIs
const QUOTER_ABI = [
  'function quoteExactInputSingle((address tokenIn, address tokenOut, uint256 amountIn, uint24 fee, uint160 sqrtPriceLimitX96)) external returns (uint256 amountOut, uint160 sqrtPriceX96After, uint32 initializedTicksCrossed, uint256 gasEstimate)'
];

const ROUTER_ABI = [
  'function exactInputSingle((address tokenIn, address tokenOut, uint24 fee, address recipient, uint256 amountIn, uint256 amountOutMinimum, uint160 sqrtPriceLimitX96)) external payable returns (uint256 amountOut)',
  'function multicall(uint256 deadline, bytes[] calldata data) external payable returns (bytes[] memory results)',
  'function unwrapWETH9(uint256 amountMinimum, address recipient) external payable'
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
  'function allowance(address owner, address spender) view returns (uint256)',
  'function decimals() view returns (uint8)'
];

// ═══════════════════════════════════════════════════════════════════════════════
// ESTADO DEL SCALPER
// ═══════════════════════════════════════════════════════════════════════════════

let state = {
  isRunning: false,
  isDryRun: false,
  startTime: null,
  mode: 'SCALPER_HTF',
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
    avgExecutionTimeMs: 0,
    scansPerSecond: 0,
    uptime: 0,
    currentChain: 'all',
    lastOpportunity: null,
    lastTrade: null
  },
  chains: [],
  tradeLogs: [],
  opportunities: [],
  banditStates: [],
  activePositions: [],
  scanHistory: []
};

let timer = null;
let providers = {};
let signers = {};
let contracts = {};
let activeTrades = 0;
let scanTimes = [];

// ═══════════════════════════════════════════════════════════════════════════════
// INICIALIZAR CONEXIONES
// ═══════════════════════════════════════════════════════════════════════════════

async function initConnections() {
  console.log('[INIT] 🔌 Inicializando conexiones a chains...');
  
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
        balanceUsd: balanceEth * SCALPER_CONFIG.ETH_PRICE_USD,
        routes: SCALPER_CONFIG.FEE_TIERS.length * SCALPER_CONFIG.TRADE_AMOUNTS_ETH.length,
        isActive: balanceEth > 0.001,
        lastScan: Date.now(),
        scansCompleted: 0,
        opportunitiesFound: 0,
        tradesExecuted: 0,
        explorer: chain.explorer,
        priority: chain.priority
      });
      
      state.banditStates.push({
        chain: key,
        alpha: 2,
        beta: 2,
        winRate: 50,
        selected: key === 'base',
        attempts: 0,
        wins: 0,
        avgProfit: 0
      });
      
      console.log(`[INIT] ✅ ${chain.name}: ${balanceEth.toFixed(6)} ETH ($${(balanceEth * SCALPER_CONFIG.ETH_PRICE_USD).toFixed(2)})`);
    } catch (e) {
      console.error(`[INIT] ❌ ${chain.name}: ${e.message}`);
    }
  }
  
  // Ordenar chains por prioridad
  state.chains.sort((a, b) => CHAINS[a.chain].priority - CHAINS[b.chain].priority);
}

// ═══════════════════════════════════════════════════════════════════════════════
// ESCANEO SCALPER - PARALELO Y ULTRA-RÁPIDO
// ═══════════════════════════════════════════════════════════════════════════════

async function scalperScan(chainKey) {
  const chain = CHAINS[chainKey];
  const provider = providers[chainKey];
  const quoter = contracts[chainKey].quoter;
  const opportunities = [];
  
  try {
    // Obtener gas price actual
    const feeData = await provider.getFeeData();
    const gasPrice = feeData.gasPrice || ethers.parseUnits('0.001', 'gwei');
    const gasPriceGwei = parseFloat(ethers.formatUnits(gasPrice, 'gwei'));
    
    // Si gas muy alto, saltar
    if (gasPriceGwei > SCALPER_CONFIG.MAX_GAS_GWEI) {
      return [];
    }
    
    const gasCostWei = gasPrice * 250000n; // Estimado para swap completo
    const gasCostUsd = parseFloat(ethers.formatEther(gasCostWei)) * SCALPER_CONFIG.ETH_PRICE_USD;
    
    // Generar todas las combinaciones de quotes
    const quotePromises = [];
    
    for (const amountEth of SCALPER_CONFIG.TRADE_AMOUNTS_ETH) {
      const amountWei = ethers.parseEther(amountEth.toString());
      
      for (let i = 0; i < SCALPER_CONFIG.FEE_TIERS.length; i++) {
        for (let j = 0; j < SCALPER_CONFIG.FEE_TIERS.length; j++) {
          // Probar diferentes combinaciones de fee tiers
          const fee1 = SCALPER_CONFIG.FEE_TIERS[i];
          const fee2 = SCALPER_CONFIG.FEE_TIERS[j];
          
          quotePromises.push(
            (async () => {
              try {
                // ENTRADA: WETH → USDC
                const quote1 = await quoter.quoteExactInputSingle.staticCall({
                  tokenIn: chain.tokens.WETH,
                  tokenOut: chain.tokens.USDC,
                  amountIn: amountWei,
                  fee: fee1,
                  sqrtPriceLimitX96: 0n
                });
                const usdcOut = quote1[0];
                
                // SALIDA: USDC → WETH
                const quote2 = await quoter.quoteExactInputSingle.staticCall({
                  tokenIn: chain.tokens.USDC,
                  tokenOut: chain.tokens.WETH,
                  amountIn: usdcOut,
                  fee: fee2,
                  sqrtPriceLimitX96: 0n
                });
                const wethOut = quote2[0];
                
                // Calcular profit
                const grossProfit = wethOut - amountWei;
                const netProfit = grossProfit - gasCostWei;
                
                if (netProfit > 0n) {
                  const netProfitUsd = parseFloat(ethers.formatEther(netProfit)) * SCALPER_CONFIG.ETH_PRICE_USD;
                  const spreadBps = Number((grossProfit * 10000n) / amountWei);
                  
                  if (netProfitUsd >= SCALPER_CONFIG.MIN_PROFIT_USD && spreadBps >= SCALPER_CONFIG.MIN_SPREAD_BPS) {
                    return {
                      chain: chainKey,
                      chainName: chain.name,
                      type: 'SCALP',
                      direction: 'WETH→USDC→WETH',
                      route: `Fee ${fee1/100}%→${fee2/100}%`,
                      amountIn: amountWei,
                      amountInEth: amountEth,
                      fee1,
                      fee2,
                      usdcIntermediate: usdcOut,
                      wethOut,
                      grossProfit,
                      netProfit,
                      netProfitUsd,
                      gasCostUsd,
                      spreadBps,
                      timestamp: Date.now(),
                      gasPrice: gasPriceGwei,
                      confidence: Math.min(100, spreadBps * 10)
                    };
                  }
                }
              } catch (e) {
                // Pool no existe o error de quote
              }
              return null;
            })()
          );
        }
      }
    }
    
    // Ejecutar todos los quotes en paralelo
    const results = await Promise.all(quotePromises);
    opportunities.push(...results.filter(r => r !== null));
    
  } catch (e) {
    // Error general de scan
  }
  
  return opportunities;
}

// ═══════════════════════════════════════════════════════════════════════════════
// EJECUCIÓN SCALPER - ENTRADA Y SALIDA INMEDIATA
// ═══════════════════════════════════════════════════════════════════════════════

async function executeScalp(opp) {
  if (activeTrades >= SCALPER_CONFIG.MAX_CONCURRENT_TRADES) {
    console.log(`[SCALP] ⚠️ Máximo trades activos (${activeTrades}), esperando...`);
    return null;
  }
  
  activeTrades++;
  const startTime = Date.now();
  const chain = CHAINS[opp.chain];
  const signer = signers[opp.chain];
  const provider = providers[opp.chain];
  const { router, weth } = contracts[opp.chain];
  
  console.log(`\n🔥 [SCALP] ═══════════════════════════════════════════════════════`);
  console.log(`   Chain: ${chain.name}`);
  console.log(`   Route: ${opp.route}`);
  console.log(`   Amount: ${opp.amountInEth} ETH`);
  console.log(`   Expected Profit: $${opp.netProfitUsd.toFixed(4)}`);
  console.log(`   Spread: ${opp.spreadBps} bps`);
  console.log(`   Gas: ${opp.gasPrice.toFixed(2)} gwei`);
  
  try {
    // Verificar balance
    const balance = await provider.getBalance(WALLET_ADDRESS);
    if (balance < opp.amountIn + ethers.parseEther('0.001')) {
      console.log(`   ❌ Balance insuficiente`);
      activeTrades--;
      return { success: false, error: 'Balance insuficiente' };
    }
    
    // ═══════════════════════════════════════════════════════════════════════════
    // PASO 1: WRAP ETH → WETH
    // ═══════════════════════════════════════════════════════════════════════════
    console.log(`   📦 [1/4] Wrapping ETH → WETH...`);
    const wrapTx = await weth.deposit({ 
      value: opp.amountIn,
      gasLimit: 50000
    });
    const wrapReceipt = await wrapTx.wait(1);
    console.log(`   ✅ Wrap completado: ${wrapReceipt.hash.slice(0, 16)}...`);
    
    // ═══════════════════════════════════════════════════════════════════════════
    // PASO 2: APPROVE WETH (si es necesario)
    // ═══════════════════════════════════════════════════════════════════════════
    const wethAllowance = await weth.allowance(WALLET_ADDRESS, chain.router);
    if (wethAllowance < opp.amountIn) {
      console.log(`   🔓 [2/4] Approving WETH...`);
      const approveTx = await weth.approve(chain.router, ethers.MaxUint256, { gasLimit: 50000 });
      await approveTx.wait(1);
      console.log(`   ✅ WETH approved`);
    } else {
      console.log(`   ✅ [2/4] WETH ya aprobado`);
    }
    
    // ═══════════════════════════════════════════════════════════════════════════
    // PASO 3: ENTRADA - SWAP WETH → USDC
    // ═══════════════════════════════════════════════════════════════════════════
    console.log(`   🔄 [3/4] ENTRADA: WETH → USDC...`);
    const minUsdc = (opp.usdcIntermediate * BigInt(10000 - SCALPER_CONFIG.MAX_SLIPPAGE_BPS)) / 10000n;
    
    const swap1Tx = await router.exactInputSingle({
      tokenIn: chain.tokens.WETH,
      tokenOut: chain.tokens.USDC,
      fee: opp.fee1,
      recipient: WALLET_ADDRESS,
      amountIn: opp.amountIn,
      amountOutMinimum: minUsdc,
      sqrtPriceLimitX96: 0n
    }, { gasLimit: 300000 });
    
    const swap1Receipt = await swap1Tx.wait(1);
    console.log(`   ✅ ENTRADA completada: ${swap1Receipt.hash.slice(0, 16)}...`);
    
    // Obtener balance USDC real
    const usdc = new ethers.Contract(chain.tokens.USDC, ERC20_ABI, signer);
    const usdcBalance = await usdc.balanceOf(WALLET_ADDRESS);
    console.log(`   💵 USDC recibido: ${ethers.formatUnits(usdcBalance, 6)}`);
    
    // ═══════════════════════════════════════════════════════════════════════════
    // PASO 4: SALIDA INMEDIATA - SWAP USDC → WETH
    // ═══════════════════════════════════════════════════════════════════════════
    console.log(`   🔄 [4/4] SALIDA: USDC → WETH...`);
    
    // Approve USDC si es necesario
    const usdcAllowance = await usdc.allowance(WALLET_ADDRESS, chain.router);
    if (usdcAllowance < usdcBalance) {
      const approveUsdcTx = await usdc.approve(chain.router, ethers.MaxUint256, { gasLimit: 50000 });
      await approveUsdcTx.wait(1);
    }
    
    const minWeth = (opp.wethOut * BigInt(10000 - SCALPER_CONFIG.MAX_SLIPPAGE_BPS)) / 10000n;
    
    const swap2Tx = await router.exactInputSingle({
      tokenIn: chain.tokens.USDC,
      tokenOut: chain.tokens.WETH,
      fee: opp.fee2,
      recipient: WALLET_ADDRESS,
      amountIn: usdcBalance,
      amountOutMinimum: minWeth,
      sqrtPriceLimitX96: 0n
    }, { gasLimit: 300000 });
    
    const swap2Receipt = await swap2Tx.wait(1);
    console.log(`   ✅ SALIDA completada: ${swap2Receipt.hash.slice(0, 16)}...`);
    
    // ═══════════════════════════════════════════════════════════════════════════
    // CALCULAR PROFIT REAL
    // ═══════════════════════════════════════════════════════════════════════════
    const finalWethBalance = await weth.balanceOf(WALLET_ADDRESS);
    const actualProfit = finalWethBalance - opp.amountIn;
    const actualProfitUsd = parseFloat(ethers.formatEther(actualProfit)) * SCALPER_CONFIG.ETH_PRICE_USD;
    
    // Calcular gas usado
    const gas1 = swap1Receipt.gasUsed * swap1Receipt.gasPrice;
    const gas2 = swap2Receipt.gasUsed * swap2Receipt.gasPrice;
    const totalGasWei = gas1 + gas2 + wrapReceipt.gasUsed * wrapReceipt.gasPrice;
    const totalGasUsd = parseFloat(ethers.formatEther(totalGasWei)) * SCALPER_CONFIG.ETH_PRICE_USD;
    
    const netProfitUsd = actualProfitUsd - totalGasUsd;
    const executionTime = Date.now() - startTime;
    
    console.log(`   ═══════════════════════════════════════════════════════`);
    console.log(`   💰 PROFIT BRUTO: $${actualProfitUsd.toFixed(4)}`);
    console.log(`   ⛽ GAS TOTAL: $${totalGasUsd.toFixed(4)}`);
    console.log(`   💵 PROFIT NETO: $${netProfitUsd.toFixed(4)}`);
    console.log(`   ⏱️  Tiempo: ${executionTime}ms`);
    console.log(`   🔗 TX: ${chain.explorer}/tx/${swap2Receipt.hash}`);
    console.log(`   ═══════════════════════════════════════════════════════\n`);
    
    activeTrades--;
    
    return {
      success: true,
      profitUsd: actualProfitUsd,
      gasUsd: totalGasUsd,
      netProfitUsd,
      txHash: swap2Receipt.hash,
      executionTimeMs: executionTime
    };
    
  } catch (e) {
    console.log(`   ❌ Error: ${e.message}`);
    activeTrades--;
    return { success: false, error: e.message };
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// LOOP PRINCIPAL SCALPER
// ═══════════════════════════════════════════════════════════════════════════════

async function scalperTick() {
  if (!state.isRunning) return;
  
  const tickStart = Date.now();
  state.stats.totalScans++;
  state.stats.uptime = Math.floor((Date.now() - state.startTime) / 1000);
  
  try {
    // ESCANEO PARALELO de todas las chains activas
    const activeChains = state.chains.filter(c => c.isActive).map(c => c.chain);
    
    let allOpportunities = [];
    
    if (SCALPER_CONFIG.PARALLEL_CHAIN_SCAN) {
      // Escanear todas las chains en paralelo
      const scanPromises = activeChains.map(chainKey => scalperScan(chainKey));
      const results = await Promise.all(scanPromises);
      allOpportunities = results.flat();
    } else {
      // Escanear secuencialmente (round-robin)
      const chainIndex = state.stats.totalScans % activeChains.length;
      const selectedChain = activeChains[chainIndex];
      allOpportunities = await scalperScan(selectedChain);
    }
    
    const scanTime = Date.now() - tickStart;
    scanTimes.push(scanTime);
    if (scanTimes.length > 100) scanTimes.shift();
    state.stats.avgScanTimeMs = Math.round(scanTimes.reduce((a, b) => a + b, 0) / scanTimes.length);
    state.stats.scansPerSecond = Math.round(1000 / state.stats.avgScanTimeMs * 10) / 10;
    
    if (allOpportunities.length > 0) {
      state.stats.opportunitiesFound += allOpportunities.length;
      
      // Ordenar por profit neto
      allOpportunities.sort((a, b) => b.netProfitUsd - a.netProfitUsd);
      
      // Guardar oportunidades para UI
      state.opportunities = [...allOpportunities.slice(0, 10), ...state.opportunities].slice(0, 50);
      state.stats.lastOpportunity = allOpportunities[0];
      
      const best = allOpportunities[0];
      
      console.log(`[SCAN #${state.stats.totalScans}] ${scanTime}ms | ${allOpportunities.length} opps | Best: $${best.netProfitUsd.toFixed(4)} on ${best.chainName}`);
      
      // EJECUTAR si no es dry run y auto-execute está activo
      if (!state.isDryRun && SCALPER_CONFIG.AUTO_EXECUTE && best.netProfitUsd >= SCALPER_CONFIG.MIN_PROFIT_USD) {
        state.stats.tradesAttempted++;
        
        const result = await executeScalp(best);
        
        if (result) {
          state.stats.tradesExecuted++;
          
          const tradeLog = {
            id: `scalp-${Date.now()}`,
            timestamp: Date.now(),
            chain: best.chain,
            chainName: best.chainName,
            type: 'SCALP',
            route: best.route,
            direction: best.direction,
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
          if (state.tradeLogs.length > 100) state.tradeLogs.pop();
          
          if (result.success) {
            state.stats.tradesSuccessful++;
            state.stats.totalProfitUsd += result.profitUsd;
            state.stats.totalGasUsd += result.gasUsd;
            state.stats.netProfitUsd = state.stats.totalProfitUsd - state.stats.totalGasUsd;
            state.stats.lastTrade = tradeLog;
            
            // Actualizar bandit
            const bandit = state.banditStates.find(b => b.chain === best.chain);
            if (bandit) {
              bandit.wins++;
              bandit.attempts++;
              bandit.alpha++;
              bandit.winRate = (bandit.wins / bandit.attempts) * 100;
              bandit.avgProfit = (bandit.avgProfit * (bandit.wins - 1) + result.netProfitUsd) / bandit.wins;
            }
            
            // Actualizar chain stats
            const chainState = state.chains.find(c => c.chain === best.chain);
            if (chainState) {
              chainState.tradesExecuted++;
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
      // Log periódico cuando no hay oportunidades
      if (state.stats.totalScans % 50 === 0) {
        console.log(`[SCAN #${state.stats.totalScans}] ${scanTime}ms | No profitable opportunities`);
      }
    }
    
    // Actualizar balances cada 100 scans
    if (state.stats.totalScans % 100 === 0) {
      await updateBalances();
    }
    
    // Actualizar chain stats
    for (const chainState of state.chains) {
      chainState.lastScan = Date.now();
      chainState.scansCompleted++;
    }
    
  } catch (e) {
    console.error(`[TICK] Error: ${e.message}`);
  }
}

async function updateBalances() {
  for (const chainState of state.chains) {
    try {
      const balance = await providers[chainState.chain].getBalance(WALLET_ADDRESS);
      const balanceEth = parseFloat(ethers.formatEther(balance));
      chainState.balance = balanceEth.toFixed(6);
      chainState.balanceUsd = balanceEth * SCALPER_CONFIG.ETH_PRICE_USD;
      chainState.isActive = balanceEth > 0.001;
    } catch (e) {
      // Error al obtener balance
    }
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
    return res.json({ success: false, error: 'Ya está corriendo', isRunning: true });
  }
  
  state.isDryRun = req.body?.dryRun === true;
  state.isRunning = true;
  state.startTime = Date.now();
  
  // Reset stats
  state.stats = {
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
    avgExecutionTimeMs: 0,
    scansPerSecond: 0,
    uptime: 0,
    currentChain: 'all',
    lastOpportunity: null,
    lastTrade: null
  };
  state.tradeLogs = [];
  state.opportunities = [];
  scanTimes = [];
  
  // Iniciar loop scalper
  if (timer) clearInterval(timer);
  timer = setInterval(scalperTick, SCALPER_CONFIG.SCAN_INTERVAL_MS);
  
  console.log(`\n[START] 🔥 SCALPER HTF iniciado - ${state.isDryRun ? 'DRY RUN' : '⚠️ MODO REAL'}`);
  console.log(`[CONFIG] Intervalo: ${SCALPER_CONFIG.SCAN_INTERVAL_MS}ms | Min profit: $${SCALPER_CONFIG.MIN_PROFIT_USD} | Parallel: ${SCALPER_CONFIG.PARALLEL_CHAIN_SCAN}`);
  
  res.json({
    success: true,
    isRunning: true,
    isDryRun: state.isDryRun,
    mode: 'SCALPER_HTF',
    config: SCALPER_CONFIG
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
    avgExecutionTimeMs: 0,
    scansPerSecond: 0,
    uptime: 0,
    currentChain: 'all',
    lastOpportunity: null,
    lastTrade: null
  };
  state.tradeLogs = [];
  state.opportunities = [];
  scanTimes = [];
  res.json({ success: true });
});

app.get('/api/defi/multichain-arb/health', (req, res) => {
  res.json({
    status: 'ok',
    mode: 'SCALPER_HTF',
    port: PORT,
    running: state.isRunning,
    dryRun: state.isDryRun,
    wallet: WALLET_ADDRESS,
    config: SCALPER_CONFIG,
    stats: {
      scansPerSecond: state.stats.scansPerSecond,
      opportunitiesFound: state.stats.opportunitiesFound,
      tradesExecuted: state.stats.tradesExecuted
    }
  });
});

app.get('/api/defi/multichain-arb/config', (req, res) => {
  res.json(SCALPER_CONFIG);
});

// ═══════════════════════════════════════════════════════════════════════════════
// INICIAR SERVIDOR
// ═══════════════════════════════════════════════════════════════════════════════

app.listen(PORT, async () => {
  console.log(`
╔═══════════════════════════════════════════════════════════════════════════════╗
║                                                                               ║
║   🔥 SCALPER HTF ARBITRAGE BOT                                                ║
║                                                                               ║
║   ✅ Puerto: ${PORT}                                                           ║
║   ✅ Wallet: ${WALLET_ADDRESS.slice(0, 10)}...${WALLET_ADDRESS.slice(-5)}                                  ║
║   ✅ Modo: SCALPER - Entrada/Salida Rápida                                    ║
║                                                                               ║
║   ⚡ Intervalo: ${SCALPER_CONFIG.SCAN_INTERVAL_MS}ms (${(1000/SCALPER_CONFIG.SCAN_INTERVAL_MS).toFixed(0)} scans/seg)                                ║
║   ⚡ Min Profit: $${SCALPER_CONFIG.MIN_PROFIT_USD}                                                ║
║   ⚡ Parallel Scan: ${SCALPER_CONFIG.PARALLEL_CHAIN_SCAN}                                             ║
║   ⚡ Auto Execute: ${SCALPER_CONFIG.AUTO_EXECUTE}                                              ║
║                                                                               ║
║   📊 Chains: Base, Arbitrum, Optimism                                         ║
║                                                                               ║
║   ⚠️  MODO SCALPER - Alta frecuencia de entrada/salida                        ║
║                                                                               ║
╚═══════════════════════════════════════════════════════════════════════════════╝
  `);
  
  await initConnections();
  await updateBalances();
  
  console.log('\n[READY] 🔥 Scalper listo. Usa POST /api/defi/multichain-arb/start para iniciar.\n');
});

process.on('SIGINT', () => {
  console.log('\n[EXIT] Cerrando scalper...');
  if (timer) clearInterval(timer);
  process.exit(0);
});


 * ═══════════════════════════════════════════════════════════════════════════════
 * 🔥 SCALPER HTF ARBITRAGE BOT - ENTRADA Y SALIDA ULTRA-RÁPIDA
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * Comportamiento SCALPER:
 * - Detecta oportunidad → ENTRA inmediatamente
 * - Ejecuta swap → SALE inmediatamente
 * - No mantiene posiciones
 * - Ciclo continuo de entrada/salida
 * - Escaneo paralelo de múltiples chains
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
// CONFIGURACIÓN SCALPER HTF
// ═══════════════════════════════════════════════════════════════════════════════

const SCALPER_CONFIG = {
  // VELOCIDAD
  SCAN_INTERVAL_MS: 200,           // 5 scans por segundo
  PARALLEL_CHAIN_SCAN: true,       // Escanear todas las chains simultáneamente
  
  // UMBRALES SCALPER
  MIN_PROFIT_USD: 0.005,           // $0.005 mínimo (muy bajo para capturar más)
  MIN_SPREAD_BPS: 1,               // 0.01% spread mínimo
  MAX_SLIPPAGE_BPS: 50,            // 0.5% slippage máximo
  
  // CANTIDADES (pequeñas para entrada/salida rápida)
  TRADE_AMOUNTS_ETH: [0.001, 0.002, 0.003, 0.005, 0.008, 0.01],
  
  // FEE TIERS
  FEE_TIERS: [100, 500, 3000, 10000],
  
  // EJECUCIÓN
  AUTO_EXECUTE: true,
  IMMEDIATE_EXIT: true,            // Salir inmediatamente después de entrar
  MAX_CONCURRENT_TRADES: 3,        // Máximo trades simultáneos
  
  // GAS
  GAS_MULTIPLIER: 1.2,             // Gas más bajo para velocidad
  MAX_GAS_GWEI: 5,                 // Máximo gas en gwei
  
  // PRECIO ETH
  ETH_PRICE_USD: 3500
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
      USDC: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
      USDbC: '0xd9aAEc86B65D86f6A7B5B1b0c42FFA531710b6CA'
    },
    quoter: '0x3d4e44Eb1374240CE5F1B871ab261CD16335B76a',
    router: '0x2626664c2603336E57B271c5C0b26F421741e481',
    priority: 1  // Más prioridad
  },
  arbitrum: {
    name: 'Arbitrum',
    chainId: 42161,
    rpc: 'https://arb1.arbitrum.io/rpc',
    explorer: 'https://arbiscan.io',
    tokens: {
      WETH: '0x82aF49447D8a07e3bd95BD0d56f35241523fBab1',
      USDC: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831',
      USDT: '0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9'
    },
    quoter: '0x61fFE014bA17989E743c5F6cB21bF9697530B21e',
    router: '0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45',
    priority: 2
  },
  optimism: {
    name: 'Optimism',
    chainId: 10,
    rpc: 'https://mainnet.optimism.io',
    explorer: 'https://optimistic.etherscan.io',
    tokens: {
      WETH: '0x4200000000000000000000000000000000000006',
      USDC: '0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85',
      USDT: '0x94b008aA00579c1307B0EF2c499aD98a8ce58e58'
    },
    quoter: '0x61fFE014bA17989E743c5F6cB21bF9697530B21e',
    router: '0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45',
    priority: 3
  }
};

// ABIs
const QUOTER_ABI = [
  'function quoteExactInputSingle((address tokenIn, address tokenOut, uint256 amountIn, uint24 fee, uint160 sqrtPriceLimitX96)) external returns (uint256 amountOut, uint160 sqrtPriceX96After, uint32 initializedTicksCrossed, uint256 gasEstimate)'
];

const ROUTER_ABI = [
  'function exactInputSingle((address tokenIn, address tokenOut, uint24 fee, address recipient, uint256 amountIn, uint256 amountOutMinimum, uint160 sqrtPriceLimitX96)) external payable returns (uint256 amountOut)',
  'function multicall(uint256 deadline, bytes[] calldata data) external payable returns (bytes[] memory results)',
  'function unwrapWETH9(uint256 amountMinimum, address recipient) external payable'
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
  'function allowance(address owner, address spender) view returns (uint256)',
  'function decimals() view returns (uint8)'
];

// ═══════════════════════════════════════════════════════════════════════════════
// ESTADO DEL SCALPER
// ═══════════════════════════════════════════════════════════════════════════════

let state = {
  isRunning: false,
  isDryRun: false,
  startTime: null,
  mode: 'SCALPER_HTF',
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
    avgExecutionTimeMs: 0,
    scansPerSecond: 0,
    uptime: 0,
    currentChain: 'all',
    lastOpportunity: null,
    lastTrade: null
  },
  chains: [],
  tradeLogs: [],
  opportunities: [],
  banditStates: [],
  activePositions: [],
  scanHistory: []
};

let timer = null;
let providers = {};
let signers = {};
let contracts = {};
let activeTrades = 0;
let scanTimes = [];

// ═══════════════════════════════════════════════════════════════════════════════
// INICIALIZAR CONEXIONES
// ═══════════════════════════════════════════════════════════════════════════════

async function initConnections() {
  console.log('[INIT] 🔌 Inicializando conexiones a chains...');
  
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
        balanceUsd: balanceEth * SCALPER_CONFIG.ETH_PRICE_USD,
        routes: SCALPER_CONFIG.FEE_TIERS.length * SCALPER_CONFIG.TRADE_AMOUNTS_ETH.length,
        isActive: balanceEth > 0.001,
        lastScan: Date.now(),
        scansCompleted: 0,
        opportunitiesFound: 0,
        tradesExecuted: 0,
        explorer: chain.explorer,
        priority: chain.priority
      });
      
      state.banditStates.push({
        chain: key,
        alpha: 2,
        beta: 2,
        winRate: 50,
        selected: key === 'base',
        attempts: 0,
        wins: 0,
        avgProfit: 0
      });
      
      console.log(`[INIT] ✅ ${chain.name}: ${balanceEth.toFixed(6)} ETH ($${(balanceEth * SCALPER_CONFIG.ETH_PRICE_USD).toFixed(2)})`);
    } catch (e) {
      console.error(`[INIT] ❌ ${chain.name}: ${e.message}`);
    }
  }
  
  // Ordenar chains por prioridad
  state.chains.sort((a, b) => CHAINS[a.chain].priority - CHAINS[b.chain].priority);
}

// ═══════════════════════════════════════════════════════════════════════════════
// ESCANEO SCALPER - PARALELO Y ULTRA-RÁPIDO
// ═══════════════════════════════════════════════════════════════════════════════

async function scalperScan(chainKey) {
  const chain = CHAINS[chainKey];
  const provider = providers[chainKey];
  const quoter = contracts[chainKey].quoter;
  const opportunities = [];
  
  try {
    // Obtener gas price actual
    const feeData = await provider.getFeeData();
    const gasPrice = feeData.gasPrice || ethers.parseUnits('0.001', 'gwei');
    const gasPriceGwei = parseFloat(ethers.formatUnits(gasPrice, 'gwei'));
    
    // Si gas muy alto, saltar
    if (gasPriceGwei > SCALPER_CONFIG.MAX_GAS_GWEI) {
      return [];
    }
    
    const gasCostWei = gasPrice * 250000n; // Estimado para swap completo
    const gasCostUsd = parseFloat(ethers.formatEther(gasCostWei)) * SCALPER_CONFIG.ETH_PRICE_USD;
    
    // Generar todas las combinaciones de quotes
    const quotePromises = [];
    
    for (const amountEth of SCALPER_CONFIG.TRADE_AMOUNTS_ETH) {
      const amountWei = ethers.parseEther(amountEth.toString());
      
      for (let i = 0; i < SCALPER_CONFIG.FEE_TIERS.length; i++) {
        for (let j = 0; j < SCALPER_CONFIG.FEE_TIERS.length; j++) {
          // Probar diferentes combinaciones de fee tiers
          const fee1 = SCALPER_CONFIG.FEE_TIERS[i];
          const fee2 = SCALPER_CONFIG.FEE_TIERS[j];
          
          quotePromises.push(
            (async () => {
              try {
                // ENTRADA: WETH → USDC
                const quote1 = await quoter.quoteExactInputSingle.staticCall({
                  tokenIn: chain.tokens.WETH,
                  tokenOut: chain.tokens.USDC,
                  amountIn: amountWei,
                  fee: fee1,
                  sqrtPriceLimitX96: 0n
                });
                const usdcOut = quote1[0];
                
                // SALIDA: USDC → WETH
                const quote2 = await quoter.quoteExactInputSingle.staticCall({
                  tokenIn: chain.tokens.USDC,
                  tokenOut: chain.tokens.WETH,
                  amountIn: usdcOut,
                  fee: fee2,
                  sqrtPriceLimitX96: 0n
                });
                const wethOut = quote2[0];
                
                // Calcular profit
                const grossProfit = wethOut - amountWei;
                const netProfit = grossProfit - gasCostWei;
                
                if (netProfit > 0n) {
                  const netProfitUsd = parseFloat(ethers.formatEther(netProfit)) * SCALPER_CONFIG.ETH_PRICE_USD;
                  const spreadBps = Number((grossProfit * 10000n) / amountWei);
                  
                  if (netProfitUsd >= SCALPER_CONFIG.MIN_PROFIT_USD && spreadBps >= SCALPER_CONFIG.MIN_SPREAD_BPS) {
                    return {
                      chain: chainKey,
                      chainName: chain.name,
                      type: 'SCALP',
                      direction: 'WETH→USDC→WETH',
                      route: `Fee ${fee1/100}%→${fee2/100}%`,
                      amountIn: amountWei,
                      amountInEth: amountEth,
                      fee1,
                      fee2,
                      usdcIntermediate: usdcOut,
                      wethOut,
                      grossProfit,
                      netProfit,
                      netProfitUsd,
                      gasCostUsd,
                      spreadBps,
                      timestamp: Date.now(),
                      gasPrice: gasPriceGwei,
                      confidence: Math.min(100, spreadBps * 10)
                    };
                  }
                }
              } catch (e) {
                // Pool no existe o error de quote
              }
              return null;
            })()
          );
        }
      }
    }
    
    // Ejecutar todos los quotes en paralelo
    const results = await Promise.all(quotePromises);
    opportunities.push(...results.filter(r => r !== null));
    
  } catch (e) {
    // Error general de scan
  }
  
  return opportunities;
}

// ═══════════════════════════════════════════════════════════════════════════════
// EJECUCIÓN SCALPER - ENTRADA Y SALIDA INMEDIATA
// ═══════════════════════════════════════════════════════════════════════════════

async function executeScalp(opp) {
  if (activeTrades >= SCALPER_CONFIG.MAX_CONCURRENT_TRADES) {
    console.log(`[SCALP] ⚠️ Máximo trades activos (${activeTrades}), esperando...`);
    return null;
  }
  
  activeTrades++;
  const startTime = Date.now();
  const chain = CHAINS[opp.chain];
  const signer = signers[opp.chain];
  const provider = providers[opp.chain];
  const { router, weth } = contracts[opp.chain];
  
  console.log(`\n🔥 [SCALP] ═══════════════════════════════════════════════════════`);
  console.log(`   Chain: ${chain.name}`);
  console.log(`   Route: ${opp.route}`);
  console.log(`   Amount: ${opp.amountInEth} ETH`);
  console.log(`   Expected Profit: $${opp.netProfitUsd.toFixed(4)}`);
  console.log(`   Spread: ${opp.spreadBps} bps`);
  console.log(`   Gas: ${opp.gasPrice.toFixed(2)} gwei`);
  
  try {
    // Verificar balance
    const balance = await provider.getBalance(WALLET_ADDRESS);
    if (balance < opp.amountIn + ethers.parseEther('0.001')) {
      console.log(`   ❌ Balance insuficiente`);
      activeTrades--;
      return { success: false, error: 'Balance insuficiente' };
    }
    
    // ═══════════════════════════════════════════════════════════════════════════
    // PASO 1: WRAP ETH → WETH
    // ═══════════════════════════════════════════════════════════════════════════
    console.log(`   📦 [1/4] Wrapping ETH → WETH...`);
    const wrapTx = await weth.deposit({ 
      value: opp.amountIn,
      gasLimit: 50000
    });
    const wrapReceipt = await wrapTx.wait(1);
    console.log(`   ✅ Wrap completado: ${wrapReceipt.hash.slice(0, 16)}...`);
    
    // ═══════════════════════════════════════════════════════════════════════════
    // PASO 2: APPROVE WETH (si es necesario)
    // ═══════════════════════════════════════════════════════════════════════════
    const wethAllowance = await weth.allowance(WALLET_ADDRESS, chain.router);
    if (wethAllowance < opp.amountIn) {
      console.log(`   🔓 [2/4] Approving WETH...`);
      const approveTx = await weth.approve(chain.router, ethers.MaxUint256, { gasLimit: 50000 });
      await approveTx.wait(1);
      console.log(`   ✅ WETH approved`);
    } else {
      console.log(`   ✅ [2/4] WETH ya aprobado`);
    }
    
    // ═══════════════════════════════════════════════════════════════════════════
    // PASO 3: ENTRADA - SWAP WETH → USDC
    // ═══════════════════════════════════════════════════════════════════════════
    console.log(`   🔄 [3/4] ENTRADA: WETH → USDC...`);
    const minUsdc = (opp.usdcIntermediate * BigInt(10000 - SCALPER_CONFIG.MAX_SLIPPAGE_BPS)) / 10000n;
    
    const swap1Tx = await router.exactInputSingle({
      tokenIn: chain.tokens.WETH,
      tokenOut: chain.tokens.USDC,
      fee: opp.fee1,
      recipient: WALLET_ADDRESS,
      amountIn: opp.amountIn,
      amountOutMinimum: minUsdc,
      sqrtPriceLimitX96: 0n
    }, { gasLimit: 300000 });
    
    const swap1Receipt = await swap1Tx.wait(1);
    console.log(`   ✅ ENTRADA completada: ${swap1Receipt.hash.slice(0, 16)}...`);
    
    // Obtener balance USDC real
    const usdc = new ethers.Contract(chain.tokens.USDC, ERC20_ABI, signer);
    const usdcBalance = await usdc.balanceOf(WALLET_ADDRESS);
    console.log(`   💵 USDC recibido: ${ethers.formatUnits(usdcBalance, 6)}`);
    
    // ═══════════════════════════════════════════════════════════════════════════
    // PASO 4: SALIDA INMEDIATA - SWAP USDC → WETH
    // ═══════════════════════════════════════════════════════════════════════════
    console.log(`   🔄 [4/4] SALIDA: USDC → WETH...`);
    
    // Approve USDC si es necesario
    const usdcAllowance = await usdc.allowance(WALLET_ADDRESS, chain.router);
    if (usdcAllowance < usdcBalance) {
      const approveUsdcTx = await usdc.approve(chain.router, ethers.MaxUint256, { gasLimit: 50000 });
      await approveUsdcTx.wait(1);
    }
    
    const minWeth = (opp.wethOut * BigInt(10000 - SCALPER_CONFIG.MAX_SLIPPAGE_BPS)) / 10000n;
    
    const swap2Tx = await router.exactInputSingle({
      tokenIn: chain.tokens.USDC,
      tokenOut: chain.tokens.WETH,
      fee: opp.fee2,
      recipient: WALLET_ADDRESS,
      amountIn: usdcBalance,
      amountOutMinimum: minWeth,
      sqrtPriceLimitX96: 0n
    }, { gasLimit: 300000 });
    
    const swap2Receipt = await swap2Tx.wait(1);
    console.log(`   ✅ SALIDA completada: ${swap2Receipt.hash.slice(0, 16)}...`);
    
    // ═══════════════════════════════════════════════════════════════════════════
    // CALCULAR PROFIT REAL
    // ═══════════════════════════════════════════════════════════════════════════
    const finalWethBalance = await weth.balanceOf(WALLET_ADDRESS);
    const actualProfit = finalWethBalance - opp.amountIn;
    const actualProfitUsd = parseFloat(ethers.formatEther(actualProfit)) * SCALPER_CONFIG.ETH_PRICE_USD;
    
    // Calcular gas usado
    const gas1 = swap1Receipt.gasUsed * swap1Receipt.gasPrice;
    const gas2 = swap2Receipt.gasUsed * swap2Receipt.gasPrice;
    const totalGasWei = gas1 + gas2 + wrapReceipt.gasUsed * wrapReceipt.gasPrice;
    const totalGasUsd = parseFloat(ethers.formatEther(totalGasWei)) * SCALPER_CONFIG.ETH_PRICE_USD;
    
    const netProfitUsd = actualProfitUsd - totalGasUsd;
    const executionTime = Date.now() - startTime;
    
    console.log(`   ═══════════════════════════════════════════════════════`);
    console.log(`   💰 PROFIT BRUTO: $${actualProfitUsd.toFixed(4)}`);
    console.log(`   ⛽ GAS TOTAL: $${totalGasUsd.toFixed(4)}`);
    console.log(`   💵 PROFIT NETO: $${netProfitUsd.toFixed(4)}`);
    console.log(`   ⏱️  Tiempo: ${executionTime}ms`);
    console.log(`   🔗 TX: ${chain.explorer}/tx/${swap2Receipt.hash}`);
    console.log(`   ═══════════════════════════════════════════════════════\n`);
    
    activeTrades--;
    
    return {
      success: true,
      profitUsd: actualProfitUsd,
      gasUsd: totalGasUsd,
      netProfitUsd,
      txHash: swap2Receipt.hash,
      executionTimeMs: executionTime
    };
    
  } catch (e) {
    console.log(`   ❌ Error: ${e.message}`);
    activeTrades--;
    return { success: false, error: e.message };
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// LOOP PRINCIPAL SCALPER
// ═══════════════════════════════════════════════════════════════════════════════

async function scalperTick() {
  if (!state.isRunning) return;
  
  const tickStart = Date.now();
  state.stats.totalScans++;
  state.stats.uptime = Math.floor((Date.now() - state.startTime) / 1000);
  
  try {
    // ESCANEO PARALELO de todas las chains activas
    const activeChains = state.chains.filter(c => c.isActive).map(c => c.chain);
    
    let allOpportunities = [];
    
    if (SCALPER_CONFIG.PARALLEL_CHAIN_SCAN) {
      // Escanear todas las chains en paralelo
      const scanPromises = activeChains.map(chainKey => scalperScan(chainKey));
      const results = await Promise.all(scanPromises);
      allOpportunities = results.flat();
    } else {
      // Escanear secuencialmente (round-robin)
      const chainIndex = state.stats.totalScans % activeChains.length;
      const selectedChain = activeChains[chainIndex];
      allOpportunities = await scalperScan(selectedChain);
    }
    
    const scanTime = Date.now() - tickStart;
    scanTimes.push(scanTime);
    if (scanTimes.length > 100) scanTimes.shift();
    state.stats.avgScanTimeMs = Math.round(scanTimes.reduce((a, b) => a + b, 0) / scanTimes.length);
    state.stats.scansPerSecond = Math.round(1000 / state.stats.avgScanTimeMs * 10) / 10;
    
    if (allOpportunities.length > 0) {
      state.stats.opportunitiesFound += allOpportunities.length;
      
      // Ordenar por profit neto
      allOpportunities.sort((a, b) => b.netProfitUsd - a.netProfitUsd);
      
      // Guardar oportunidades para UI
      state.opportunities = [...allOpportunities.slice(0, 10), ...state.opportunities].slice(0, 50);
      state.stats.lastOpportunity = allOpportunities[0];
      
      const best = allOpportunities[0];
      
      console.log(`[SCAN #${state.stats.totalScans}] ${scanTime}ms | ${allOpportunities.length} opps | Best: $${best.netProfitUsd.toFixed(4)} on ${best.chainName}`);
      
      // EJECUTAR si no es dry run y auto-execute está activo
      if (!state.isDryRun && SCALPER_CONFIG.AUTO_EXECUTE && best.netProfitUsd >= SCALPER_CONFIG.MIN_PROFIT_USD) {
        state.stats.tradesAttempted++;
        
        const result = await executeScalp(best);
        
        if (result) {
          state.stats.tradesExecuted++;
          
          const tradeLog = {
            id: `scalp-${Date.now()}`,
            timestamp: Date.now(),
            chain: best.chain,
            chainName: best.chainName,
            type: 'SCALP',
            route: best.route,
            direction: best.direction,
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
          if (state.tradeLogs.length > 100) state.tradeLogs.pop();
          
          if (result.success) {
            state.stats.tradesSuccessful++;
            state.stats.totalProfitUsd += result.profitUsd;
            state.stats.totalGasUsd += result.gasUsd;
            state.stats.netProfitUsd = state.stats.totalProfitUsd - state.stats.totalGasUsd;
            state.stats.lastTrade = tradeLog;
            
            // Actualizar bandit
            const bandit = state.banditStates.find(b => b.chain === best.chain);
            if (bandit) {
              bandit.wins++;
              bandit.attempts++;
              bandit.alpha++;
              bandit.winRate = (bandit.wins / bandit.attempts) * 100;
              bandit.avgProfit = (bandit.avgProfit * (bandit.wins - 1) + result.netProfitUsd) / bandit.wins;
            }
            
            // Actualizar chain stats
            const chainState = state.chains.find(c => c.chain === best.chain);
            if (chainState) {
              chainState.tradesExecuted++;
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
      // Log periódico cuando no hay oportunidades
      if (state.stats.totalScans % 50 === 0) {
        console.log(`[SCAN #${state.stats.totalScans}] ${scanTime}ms | No profitable opportunities`);
      }
    }
    
    // Actualizar balances cada 100 scans
    if (state.stats.totalScans % 100 === 0) {
      await updateBalances();
    }
    
    // Actualizar chain stats
    for (const chainState of state.chains) {
      chainState.lastScan = Date.now();
      chainState.scansCompleted++;
    }
    
  } catch (e) {
    console.error(`[TICK] Error: ${e.message}`);
  }
}

async function updateBalances() {
  for (const chainState of state.chains) {
    try {
      const balance = await providers[chainState.chain].getBalance(WALLET_ADDRESS);
      const balanceEth = parseFloat(ethers.formatEther(balance));
      chainState.balance = balanceEth.toFixed(6);
      chainState.balanceUsd = balanceEth * SCALPER_CONFIG.ETH_PRICE_USD;
      chainState.isActive = balanceEth > 0.001;
    } catch (e) {
      // Error al obtener balance
    }
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
    return res.json({ success: false, error: 'Ya está corriendo', isRunning: true });
  }
  
  state.isDryRun = req.body?.dryRun === true;
  state.isRunning = true;
  state.startTime = Date.now();
  
  // Reset stats
  state.stats = {
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
    avgExecutionTimeMs: 0,
    scansPerSecond: 0,
    uptime: 0,
    currentChain: 'all',
    lastOpportunity: null,
    lastTrade: null
  };
  state.tradeLogs = [];
  state.opportunities = [];
  scanTimes = [];
  
  // Iniciar loop scalper
  if (timer) clearInterval(timer);
  timer = setInterval(scalperTick, SCALPER_CONFIG.SCAN_INTERVAL_MS);
  
  console.log(`\n[START] 🔥 SCALPER HTF iniciado - ${state.isDryRun ? 'DRY RUN' : '⚠️ MODO REAL'}`);
  console.log(`[CONFIG] Intervalo: ${SCALPER_CONFIG.SCAN_INTERVAL_MS}ms | Min profit: $${SCALPER_CONFIG.MIN_PROFIT_USD} | Parallel: ${SCALPER_CONFIG.PARALLEL_CHAIN_SCAN}`);
  
  res.json({
    success: true,
    isRunning: true,
    isDryRun: state.isDryRun,
    mode: 'SCALPER_HTF',
    config: SCALPER_CONFIG
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
    avgExecutionTimeMs: 0,
    scansPerSecond: 0,
    uptime: 0,
    currentChain: 'all',
    lastOpportunity: null,
    lastTrade: null
  };
  state.tradeLogs = [];
  state.opportunities = [];
  scanTimes = [];
  res.json({ success: true });
});

app.get('/api/defi/multichain-arb/health', (req, res) => {
  res.json({
    status: 'ok',
    mode: 'SCALPER_HTF',
    port: PORT,
    running: state.isRunning,
    dryRun: state.isDryRun,
    wallet: WALLET_ADDRESS,
    config: SCALPER_CONFIG,
    stats: {
      scansPerSecond: state.stats.scansPerSecond,
      opportunitiesFound: state.stats.opportunitiesFound,
      tradesExecuted: state.stats.tradesExecuted
    }
  });
});

app.get('/api/defi/multichain-arb/config', (req, res) => {
  res.json(SCALPER_CONFIG);
});

// ═══════════════════════════════════════════════════════════════════════════════
// INICIAR SERVIDOR
// ═══════════════════════════════════════════════════════════════════════════════

app.listen(PORT, async () => {
  console.log(`
╔═══════════════════════════════════════════════════════════════════════════════╗
║                                                                               ║
║   🔥 SCALPER HTF ARBITRAGE BOT                                                ║
║                                                                               ║
║   ✅ Puerto: ${PORT}                                                           ║
║   ✅ Wallet: ${WALLET_ADDRESS.slice(0, 10)}...${WALLET_ADDRESS.slice(-5)}                                  ║
║   ✅ Modo: SCALPER - Entrada/Salida Rápida                                    ║
║                                                                               ║
║   ⚡ Intervalo: ${SCALPER_CONFIG.SCAN_INTERVAL_MS}ms (${(1000/SCALPER_CONFIG.SCAN_INTERVAL_MS).toFixed(0)} scans/seg)                                ║
║   ⚡ Min Profit: $${SCALPER_CONFIG.MIN_PROFIT_USD}                                                ║
║   ⚡ Parallel Scan: ${SCALPER_CONFIG.PARALLEL_CHAIN_SCAN}                                             ║
║   ⚡ Auto Execute: ${SCALPER_CONFIG.AUTO_EXECUTE}                                              ║
║                                                                               ║
║   📊 Chains: Base, Arbitrum, Optimism                                         ║
║                                                                               ║
║   ⚠️  MODO SCALPER - Alta frecuencia de entrada/salida                        ║
║                                                                               ║
╚═══════════════════════════════════════════════════════════════════════════════╝
  `);
  
  await initConnections();
  await updateBalances();
  
  console.log('\n[READY] 🔥 Scalper listo. Usa POST /api/defi/multichain-arb/start para iniciar.\n');
});

process.on('SIGINT', () => {
  console.log('\n[EXIT] Cerrando scalper...');
  if (timer) clearInterval(timer);
  process.exit(0);
});


 * ═══════════════════════════════════════════════════════════════════════════════
 * 🔥 SCALPER HTF ARBITRAGE BOT - ENTRADA Y SALIDA ULTRA-RÁPIDA
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * Comportamiento SCALPER:
 * - Detecta oportunidad → ENTRA inmediatamente
 * - Ejecuta swap → SALE inmediatamente
 * - No mantiene posiciones
 * - Ciclo continuo de entrada/salida
 * - Escaneo paralelo de múltiples chains
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
// CONFIGURACIÓN SCALPER HTF
// ═══════════════════════════════════════════════════════════════════════════════

const SCALPER_CONFIG = {
  // VELOCIDAD
  SCAN_INTERVAL_MS: 200,           // 5 scans por segundo
  PARALLEL_CHAIN_SCAN: true,       // Escanear todas las chains simultáneamente
  
  // UMBRALES SCALPER
  MIN_PROFIT_USD: 0.005,           // $0.005 mínimo (muy bajo para capturar más)
  MIN_SPREAD_BPS: 1,               // 0.01% spread mínimo
  MAX_SLIPPAGE_BPS: 50,            // 0.5% slippage máximo
  
  // CANTIDADES (pequeñas para entrada/salida rápida)
  TRADE_AMOUNTS_ETH: [0.001, 0.002, 0.003, 0.005, 0.008, 0.01],
  
  // FEE TIERS
  FEE_TIERS: [100, 500, 3000, 10000],
  
  // EJECUCIÓN
  AUTO_EXECUTE: true,
  IMMEDIATE_EXIT: true,            // Salir inmediatamente después de entrar
  MAX_CONCURRENT_TRADES: 3,        // Máximo trades simultáneos
  
  // GAS
  GAS_MULTIPLIER: 1.2,             // Gas más bajo para velocidad
  MAX_GAS_GWEI: 5,                 // Máximo gas en gwei
  
  // PRECIO ETH
  ETH_PRICE_USD: 3500
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
      USDC: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
      USDbC: '0xd9aAEc86B65D86f6A7B5B1b0c42FFA531710b6CA'
    },
    quoter: '0x3d4e44Eb1374240CE5F1B871ab261CD16335B76a',
    router: '0x2626664c2603336E57B271c5C0b26F421741e481',
    priority: 1  // Más prioridad
  },
  arbitrum: {
    name: 'Arbitrum',
    chainId: 42161,
    rpc: 'https://arb1.arbitrum.io/rpc',
    explorer: 'https://arbiscan.io',
    tokens: {
      WETH: '0x82aF49447D8a07e3bd95BD0d56f35241523fBab1',
      USDC: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831',
      USDT: '0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9'
    },
    quoter: '0x61fFE014bA17989E743c5F6cB21bF9697530B21e',
    router: '0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45',
    priority: 2
  },
  optimism: {
    name: 'Optimism',
    chainId: 10,
    rpc: 'https://mainnet.optimism.io',
    explorer: 'https://optimistic.etherscan.io',
    tokens: {
      WETH: '0x4200000000000000000000000000000000000006',
      USDC: '0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85',
      USDT: '0x94b008aA00579c1307B0EF2c499aD98a8ce58e58'
    },
    quoter: '0x61fFE014bA17989E743c5F6cB21bF9697530B21e',
    router: '0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45',
    priority: 3
  }
};

// ABIs
const QUOTER_ABI = [
  'function quoteExactInputSingle((address tokenIn, address tokenOut, uint256 amountIn, uint24 fee, uint160 sqrtPriceLimitX96)) external returns (uint256 amountOut, uint160 sqrtPriceX96After, uint32 initializedTicksCrossed, uint256 gasEstimate)'
];

const ROUTER_ABI = [
  'function exactInputSingle((address tokenIn, address tokenOut, uint24 fee, address recipient, uint256 amountIn, uint256 amountOutMinimum, uint160 sqrtPriceLimitX96)) external payable returns (uint256 amountOut)',
  'function multicall(uint256 deadline, bytes[] calldata data) external payable returns (bytes[] memory results)',
  'function unwrapWETH9(uint256 amountMinimum, address recipient) external payable'
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
  'function allowance(address owner, address spender) view returns (uint256)',
  'function decimals() view returns (uint8)'
];

// ═══════════════════════════════════════════════════════════════════════════════
// ESTADO DEL SCALPER
// ═══════════════════════════════════════════════════════════════════════════════

let state = {
  isRunning: false,
  isDryRun: false,
  startTime: null,
  mode: 'SCALPER_HTF',
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
    avgExecutionTimeMs: 0,
    scansPerSecond: 0,
    uptime: 0,
    currentChain: 'all',
    lastOpportunity: null,
    lastTrade: null
  },
  chains: [],
  tradeLogs: [],
  opportunities: [],
  banditStates: [],
  activePositions: [],
  scanHistory: []
};

let timer = null;
let providers = {};
let signers = {};
let contracts = {};
let activeTrades = 0;
let scanTimes = [];

// ═══════════════════════════════════════════════════════════════════════════════
// INICIALIZAR CONEXIONES
// ═══════════════════════════════════════════════════════════════════════════════

async function initConnections() {
  console.log('[INIT] 🔌 Inicializando conexiones a chains...');
  
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
        balanceUsd: balanceEth * SCALPER_CONFIG.ETH_PRICE_USD,
        routes: SCALPER_CONFIG.FEE_TIERS.length * SCALPER_CONFIG.TRADE_AMOUNTS_ETH.length,
        isActive: balanceEth > 0.001,
        lastScan: Date.now(),
        scansCompleted: 0,
        opportunitiesFound: 0,
        tradesExecuted: 0,
        explorer: chain.explorer,
        priority: chain.priority
      });
      
      state.banditStates.push({
        chain: key,
        alpha: 2,
        beta: 2,
        winRate: 50,
        selected: key === 'base',
        attempts: 0,
        wins: 0,
        avgProfit: 0
      });
      
      console.log(`[INIT] ✅ ${chain.name}: ${balanceEth.toFixed(6)} ETH ($${(balanceEth * SCALPER_CONFIG.ETH_PRICE_USD).toFixed(2)})`);
    } catch (e) {
      console.error(`[INIT] ❌ ${chain.name}: ${e.message}`);
    }
  }
  
  // Ordenar chains por prioridad
  state.chains.sort((a, b) => CHAINS[a.chain].priority - CHAINS[b.chain].priority);
}

// ═══════════════════════════════════════════════════════════════════════════════
// ESCANEO SCALPER - PARALELO Y ULTRA-RÁPIDO
// ═══════════════════════════════════════════════════════════════════════════════

async function scalperScan(chainKey) {
  const chain = CHAINS[chainKey];
  const provider = providers[chainKey];
  const quoter = contracts[chainKey].quoter;
  const opportunities = [];
  
  try {
    // Obtener gas price actual
    const feeData = await provider.getFeeData();
    const gasPrice = feeData.gasPrice || ethers.parseUnits('0.001', 'gwei');
    const gasPriceGwei = parseFloat(ethers.formatUnits(gasPrice, 'gwei'));
    
    // Si gas muy alto, saltar
    if (gasPriceGwei > SCALPER_CONFIG.MAX_GAS_GWEI) {
      return [];
    }
    
    const gasCostWei = gasPrice * 250000n; // Estimado para swap completo
    const gasCostUsd = parseFloat(ethers.formatEther(gasCostWei)) * SCALPER_CONFIG.ETH_PRICE_USD;
    
    // Generar todas las combinaciones de quotes
    const quotePromises = [];
    
    for (const amountEth of SCALPER_CONFIG.TRADE_AMOUNTS_ETH) {
      const amountWei = ethers.parseEther(amountEth.toString());
      
      for (let i = 0; i < SCALPER_CONFIG.FEE_TIERS.length; i++) {
        for (let j = 0; j < SCALPER_CONFIG.FEE_TIERS.length; j++) {
          // Probar diferentes combinaciones de fee tiers
          const fee1 = SCALPER_CONFIG.FEE_TIERS[i];
          const fee2 = SCALPER_CONFIG.FEE_TIERS[j];
          
          quotePromises.push(
            (async () => {
              try {
                // ENTRADA: WETH → USDC
                const quote1 = await quoter.quoteExactInputSingle.staticCall({
                  tokenIn: chain.tokens.WETH,
                  tokenOut: chain.tokens.USDC,
                  amountIn: amountWei,
                  fee: fee1,
                  sqrtPriceLimitX96: 0n
                });
                const usdcOut = quote1[0];
                
                // SALIDA: USDC → WETH
                const quote2 = await quoter.quoteExactInputSingle.staticCall({
                  tokenIn: chain.tokens.USDC,
                  tokenOut: chain.tokens.WETH,
                  amountIn: usdcOut,
                  fee: fee2,
                  sqrtPriceLimitX96: 0n
                });
                const wethOut = quote2[0];
                
                // Calcular profit
                const grossProfit = wethOut - amountWei;
                const netProfit = grossProfit - gasCostWei;
                
                if (netProfit > 0n) {
                  const netProfitUsd = parseFloat(ethers.formatEther(netProfit)) * SCALPER_CONFIG.ETH_PRICE_USD;
                  const spreadBps = Number((grossProfit * 10000n) / amountWei);
                  
                  if (netProfitUsd >= SCALPER_CONFIG.MIN_PROFIT_USD && spreadBps >= SCALPER_CONFIG.MIN_SPREAD_BPS) {
                    return {
                      chain: chainKey,
                      chainName: chain.name,
                      type: 'SCALP',
                      direction: 'WETH→USDC→WETH',
                      route: `Fee ${fee1/100}%→${fee2/100}%`,
                      amountIn: amountWei,
                      amountInEth: amountEth,
                      fee1,
                      fee2,
                      usdcIntermediate: usdcOut,
                      wethOut,
                      grossProfit,
                      netProfit,
                      netProfitUsd,
                      gasCostUsd,
                      spreadBps,
                      timestamp: Date.now(),
                      gasPrice: gasPriceGwei,
                      confidence: Math.min(100, spreadBps * 10)
                    };
                  }
                }
              } catch (e) {
                // Pool no existe o error de quote
              }
              return null;
            })()
          );
        }
      }
    }
    
    // Ejecutar todos los quotes en paralelo
    const results = await Promise.all(quotePromises);
    opportunities.push(...results.filter(r => r !== null));
    
  } catch (e) {
    // Error general de scan
  }
  
  return opportunities;
}

// ═══════════════════════════════════════════════════════════════════════════════
// EJECUCIÓN SCALPER - ENTRADA Y SALIDA INMEDIATA
// ═══════════════════════════════════════════════════════════════════════════════

async function executeScalp(opp) {
  if (activeTrades >= SCALPER_CONFIG.MAX_CONCURRENT_TRADES) {
    console.log(`[SCALP] ⚠️ Máximo trades activos (${activeTrades}), esperando...`);
    return null;
  }
  
  activeTrades++;
  const startTime = Date.now();
  const chain = CHAINS[opp.chain];
  const signer = signers[opp.chain];
  const provider = providers[opp.chain];
  const { router, weth } = contracts[opp.chain];
  
  console.log(`\n🔥 [SCALP] ═══════════════════════════════════════════════════════`);
  console.log(`   Chain: ${chain.name}`);
  console.log(`   Route: ${opp.route}`);
  console.log(`   Amount: ${opp.amountInEth} ETH`);
  console.log(`   Expected Profit: $${opp.netProfitUsd.toFixed(4)}`);
  console.log(`   Spread: ${opp.spreadBps} bps`);
  console.log(`   Gas: ${opp.gasPrice.toFixed(2)} gwei`);
  
  try {
    // Verificar balance
    const balance = await provider.getBalance(WALLET_ADDRESS);
    if (balance < opp.amountIn + ethers.parseEther('0.001')) {
      console.log(`   ❌ Balance insuficiente`);
      activeTrades--;
      return { success: false, error: 'Balance insuficiente' };
    }
    
    // ═══════════════════════════════════════════════════════════════════════════
    // PASO 1: WRAP ETH → WETH
    // ═══════════════════════════════════════════════════════════════════════════
    console.log(`   📦 [1/4] Wrapping ETH → WETH...`);
    const wrapTx = await weth.deposit({ 
      value: opp.amountIn,
      gasLimit: 50000
    });
    const wrapReceipt = await wrapTx.wait(1);
    console.log(`   ✅ Wrap completado: ${wrapReceipt.hash.slice(0, 16)}...`);
    
    // ═══════════════════════════════════════════════════════════════════════════
    // PASO 2: APPROVE WETH (si es necesario)
    // ═══════════════════════════════════════════════════════════════════════════
    const wethAllowance = await weth.allowance(WALLET_ADDRESS, chain.router);
    if (wethAllowance < opp.amountIn) {
      console.log(`   🔓 [2/4] Approving WETH...`);
      const approveTx = await weth.approve(chain.router, ethers.MaxUint256, { gasLimit: 50000 });
      await approveTx.wait(1);
      console.log(`   ✅ WETH approved`);
    } else {
      console.log(`   ✅ [2/4] WETH ya aprobado`);
    }
    
    // ═══════════════════════════════════════════════════════════════════════════
    // PASO 3: ENTRADA - SWAP WETH → USDC
    // ═══════════════════════════════════════════════════════════════════════════
    console.log(`   🔄 [3/4] ENTRADA: WETH → USDC...`);
    const minUsdc = (opp.usdcIntermediate * BigInt(10000 - SCALPER_CONFIG.MAX_SLIPPAGE_BPS)) / 10000n;
    
    const swap1Tx = await router.exactInputSingle({
      tokenIn: chain.tokens.WETH,
      tokenOut: chain.tokens.USDC,
      fee: opp.fee1,
      recipient: WALLET_ADDRESS,
      amountIn: opp.amountIn,
      amountOutMinimum: minUsdc,
      sqrtPriceLimitX96: 0n
    }, { gasLimit: 300000 });
    
    const swap1Receipt = await swap1Tx.wait(1);
    console.log(`   ✅ ENTRADA completada: ${swap1Receipt.hash.slice(0, 16)}...`);
    
    // Obtener balance USDC real
    const usdc = new ethers.Contract(chain.tokens.USDC, ERC20_ABI, signer);
    const usdcBalance = await usdc.balanceOf(WALLET_ADDRESS);
    console.log(`   💵 USDC recibido: ${ethers.formatUnits(usdcBalance, 6)}`);
    
    // ═══════════════════════════════════════════════════════════════════════════
    // PASO 4: SALIDA INMEDIATA - SWAP USDC → WETH
    // ═══════════════════════════════════════════════════════════════════════════
    console.log(`   🔄 [4/4] SALIDA: USDC → WETH...`);
    
    // Approve USDC si es necesario
    const usdcAllowance = await usdc.allowance(WALLET_ADDRESS, chain.router);
    if (usdcAllowance < usdcBalance) {
      const approveUsdcTx = await usdc.approve(chain.router, ethers.MaxUint256, { gasLimit: 50000 });
      await approveUsdcTx.wait(1);
    }
    
    const minWeth = (opp.wethOut * BigInt(10000 - SCALPER_CONFIG.MAX_SLIPPAGE_BPS)) / 10000n;
    
    const swap2Tx = await router.exactInputSingle({
      tokenIn: chain.tokens.USDC,
      tokenOut: chain.tokens.WETH,
      fee: opp.fee2,
      recipient: WALLET_ADDRESS,
      amountIn: usdcBalance,
      amountOutMinimum: minWeth,
      sqrtPriceLimitX96: 0n
    }, { gasLimit: 300000 });
    
    const swap2Receipt = await swap2Tx.wait(1);
    console.log(`   ✅ SALIDA completada: ${swap2Receipt.hash.slice(0, 16)}...`);
    
    // ═══════════════════════════════════════════════════════════════════════════
    // CALCULAR PROFIT REAL
    // ═══════════════════════════════════════════════════════════════════════════
    const finalWethBalance = await weth.balanceOf(WALLET_ADDRESS);
    const actualProfit = finalWethBalance - opp.amountIn;
    const actualProfitUsd = parseFloat(ethers.formatEther(actualProfit)) * SCALPER_CONFIG.ETH_PRICE_USD;
    
    // Calcular gas usado
    const gas1 = swap1Receipt.gasUsed * swap1Receipt.gasPrice;
    const gas2 = swap2Receipt.gasUsed * swap2Receipt.gasPrice;
    const totalGasWei = gas1 + gas2 + wrapReceipt.gasUsed * wrapReceipt.gasPrice;
    const totalGasUsd = parseFloat(ethers.formatEther(totalGasWei)) * SCALPER_CONFIG.ETH_PRICE_USD;
    
    const netProfitUsd = actualProfitUsd - totalGasUsd;
    const executionTime = Date.now() - startTime;
    
    console.log(`   ═══════════════════════════════════════════════════════`);
    console.log(`   💰 PROFIT BRUTO: $${actualProfitUsd.toFixed(4)}`);
    console.log(`   ⛽ GAS TOTAL: $${totalGasUsd.toFixed(4)}`);
    console.log(`   💵 PROFIT NETO: $${netProfitUsd.toFixed(4)}`);
    console.log(`   ⏱️  Tiempo: ${executionTime}ms`);
    console.log(`   🔗 TX: ${chain.explorer}/tx/${swap2Receipt.hash}`);
    console.log(`   ═══════════════════════════════════════════════════════\n`);
    
    activeTrades--;
    
    return {
      success: true,
      profitUsd: actualProfitUsd,
      gasUsd: totalGasUsd,
      netProfitUsd,
      txHash: swap2Receipt.hash,
      executionTimeMs: executionTime
    };
    
  } catch (e) {
    console.log(`   ❌ Error: ${e.message}`);
    activeTrades--;
    return { success: false, error: e.message };
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// LOOP PRINCIPAL SCALPER
// ═══════════════════════════════════════════════════════════════════════════════

async function scalperTick() {
  if (!state.isRunning) return;
  
  const tickStart = Date.now();
  state.stats.totalScans++;
  state.stats.uptime = Math.floor((Date.now() - state.startTime) / 1000);
  
  try {
    // ESCANEO PARALELO de todas las chains activas
    const activeChains = state.chains.filter(c => c.isActive).map(c => c.chain);
    
    let allOpportunities = [];
    
    if (SCALPER_CONFIG.PARALLEL_CHAIN_SCAN) {
      // Escanear todas las chains en paralelo
      const scanPromises = activeChains.map(chainKey => scalperScan(chainKey));
      const results = await Promise.all(scanPromises);
      allOpportunities = results.flat();
    } else {
      // Escanear secuencialmente (round-robin)
      const chainIndex = state.stats.totalScans % activeChains.length;
      const selectedChain = activeChains[chainIndex];
      allOpportunities = await scalperScan(selectedChain);
    }
    
    const scanTime = Date.now() - tickStart;
    scanTimes.push(scanTime);
    if (scanTimes.length > 100) scanTimes.shift();
    state.stats.avgScanTimeMs = Math.round(scanTimes.reduce((a, b) => a + b, 0) / scanTimes.length);
    state.stats.scansPerSecond = Math.round(1000 / state.stats.avgScanTimeMs * 10) / 10;
    
    if (allOpportunities.length > 0) {
      state.stats.opportunitiesFound += allOpportunities.length;
      
      // Ordenar por profit neto
      allOpportunities.sort((a, b) => b.netProfitUsd - a.netProfitUsd);
      
      // Guardar oportunidades para UI
      state.opportunities = [...allOpportunities.slice(0, 10), ...state.opportunities].slice(0, 50);
      state.stats.lastOpportunity = allOpportunities[0];
      
      const best = allOpportunities[0];
      
      console.log(`[SCAN #${state.stats.totalScans}] ${scanTime}ms | ${allOpportunities.length} opps | Best: $${best.netProfitUsd.toFixed(4)} on ${best.chainName}`);
      
      // EJECUTAR si no es dry run y auto-execute está activo
      if (!state.isDryRun && SCALPER_CONFIG.AUTO_EXECUTE && best.netProfitUsd >= SCALPER_CONFIG.MIN_PROFIT_USD) {
        state.stats.tradesAttempted++;
        
        const result = await executeScalp(best);
        
        if (result) {
          state.stats.tradesExecuted++;
          
          const tradeLog = {
            id: `scalp-${Date.now()}`,
            timestamp: Date.now(),
            chain: best.chain,
            chainName: best.chainName,
            type: 'SCALP',
            route: best.route,
            direction: best.direction,
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
          if (state.tradeLogs.length > 100) state.tradeLogs.pop();
          
          if (result.success) {
            state.stats.tradesSuccessful++;
            state.stats.totalProfitUsd += result.profitUsd;
            state.stats.totalGasUsd += result.gasUsd;
            state.stats.netProfitUsd = state.stats.totalProfitUsd - state.stats.totalGasUsd;
            state.stats.lastTrade = tradeLog;
            
            // Actualizar bandit
            const bandit = state.banditStates.find(b => b.chain === best.chain);
            if (bandit) {
              bandit.wins++;
              bandit.attempts++;
              bandit.alpha++;
              bandit.winRate = (bandit.wins / bandit.attempts) * 100;
              bandit.avgProfit = (bandit.avgProfit * (bandit.wins - 1) + result.netProfitUsd) / bandit.wins;
            }
            
            // Actualizar chain stats
            const chainState = state.chains.find(c => c.chain === best.chain);
            if (chainState) {
              chainState.tradesExecuted++;
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
      // Log periódico cuando no hay oportunidades
      if (state.stats.totalScans % 50 === 0) {
        console.log(`[SCAN #${state.stats.totalScans}] ${scanTime}ms | No profitable opportunities`);
      }
    }
    
    // Actualizar balances cada 100 scans
    if (state.stats.totalScans % 100 === 0) {
      await updateBalances();
    }
    
    // Actualizar chain stats
    for (const chainState of state.chains) {
      chainState.lastScan = Date.now();
      chainState.scansCompleted++;
    }
    
  } catch (e) {
    console.error(`[TICK] Error: ${e.message}`);
  }
}

async function updateBalances() {
  for (const chainState of state.chains) {
    try {
      const balance = await providers[chainState.chain].getBalance(WALLET_ADDRESS);
      const balanceEth = parseFloat(ethers.formatEther(balance));
      chainState.balance = balanceEth.toFixed(6);
      chainState.balanceUsd = balanceEth * SCALPER_CONFIG.ETH_PRICE_USD;
      chainState.isActive = balanceEth > 0.001;
    } catch (e) {
      // Error al obtener balance
    }
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
    return res.json({ success: false, error: 'Ya está corriendo', isRunning: true });
  }
  
  state.isDryRun = req.body?.dryRun === true;
  state.isRunning = true;
  state.startTime = Date.now();
  
  // Reset stats
  state.stats = {
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
    avgExecutionTimeMs: 0,
    scansPerSecond: 0,
    uptime: 0,
    currentChain: 'all',
    lastOpportunity: null,
    lastTrade: null
  };
  state.tradeLogs = [];
  state.opportunities = [];
  scanTimes = [];
  
  // Iniciar loop scalper
  if (timer) clearInterval(timer);
  timer = setInterval(scalperTick, SCALPER_CONFIG.SCAN_INTERVAL_MS);
  
  console.log(`\n[START] 🔥 SCALPER HTF iniciado - ${state.isDryRun ? 'DRY RUN' : '⚠️ MODO REAL'}`);
  console.log(`[CONFIG] Intervalo: ${SCALPER_CONFIG.SCAN_INTERVAL_MS}ms | Min profit: $${SCALPER_CONFIG.MIN_PROFIT_USD} | Parallel: ${SCALPER_CONFIG.PARALLEL_CHAIN_SCAN}`);
  
  res.json({
    success: true,
    isRunning: true,
    isDryRun: state.isDryRun,
    mode: 'SCALPER_HTF',
    config: SCALPER_CONFIG
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
    avgExecutionTimeMs: 0,
    scansPerSecond: 0,
    uptime: 0,
    currentChain: 'all',
    lastOpportunity: null,
    lastTrade: null
  };
  state.tradeLogs = [];
  state.opportunities = [];
  scanTimes = [];
  res.json({ success: true });
});

app.get('/api/defi/multichain-arb/health', (req, res) => {
  res.json({
    status: 'ok',
    mode: 'SCALPER_HTF',
    port: PORT,
    running: state.isRunning,
    dryRun: state.isDryRun,
    wallet: WALLET_ADDRESS,
    config: SCALPER_CONFIG,
    stats: {
      scansPerSecond: state.stats.scansPerSecond,
      opportunitiesFound: state.stats.opportunitiesFound,
      tradesExecuted: state.stats.tradesExecuted
    }
  });
});

app.get('/api/defi/multichain-arb/config', (req, res) => {
  res.json(SCALPER_CONFIG);
});

// ═══════════════════════════════════════════════════════════════════════════════
// INICIAR SERVIDOR
// ═══════════════════════════════════════════════════════════════════════════════

app.listen(PORT, async () => {
  console.log(`
╔═══════════════════════════════════════════════════════════════════════════════╗
║                                                                               ║
║   🔥 SCALPER HTF ARBITRAGE BOT                                                ║
║                                                                               ║
║   ✅ Puerto: ${PORT}                                                           ║
║   ✅ Wallet: ${WALLET_ADDRESS.slice(0, 10)}...${WALLET_ADDRESS.slice(-5)}                                  ║
║   ✅ Modo: SCALPER - Entrada/Salida Rápida                                    ║
║                                                                               ║
║   ⚡ Intervalo: ${SCALPER_CONFIG.SCAN_INTERVAL_MS}ms (${(1000/SCALPER_CONFIG.SCAN_INTERVAL_MS).toFixed(0)} scans/seg)                                ║
║   ⚡ Min Profit: $${SCALPER_CONFIG.MIN_PROFIT_USD}                                                ║
║   ⚡ Parallel Scan: ${SCALPER_CONFIG.PARALLEL_CHAIN_SCAN}                                             ║
║   ⚡ Auto Execute: ${SCALPER_CONFIG.AUTO_EXECUTE}                                              ║
║                                                                               ║
║   📊 Chains: Base, Arbitrum, Optimism                                         ║
║                                                                               ║
║   ⚠️  MODO SCALPER - Alta frecuencia de entrada/salida                        ║
║                                                                               ║
╚═══════════════════════════════════════════════════════════════════════════════╝
  `);
  
  await initConnections();
  await updateBalances();
  
  console.log('\n[READY] 🔥 Scalper listo. Usa POST /api/defi/multichain-arb/start para iniciar.\n');
});

process.on('SIGINT', () => {
  console.log('\n[EXIT] Cerrando scalper...');
  if (timer) clearInterval(timer);
  process.exit(0);
});




